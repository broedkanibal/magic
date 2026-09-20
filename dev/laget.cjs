#!/usr/bin/env node
'use strict';
/* Läget: vad som körs, vad som väntar på Jesper, vad som inte är ihopslaget
   och vad som är näst på tur. Läser Linear och git. Skriver ingenting.

   Körs av skillen /läget (.claude/skills/laget/SKILL.md), som lägger till
   vilka Claude-sessioner som lever — det ser bara Claude Code självt.

     node dev/laget.cjs */
const { execSync } = require('child_process');
const path = require('path');
const { graphql } = require(path.join(__dirname, 'linear-agent', 'klient.cjs'));

const ROT = path.join(__dirname, '..');
const sh = (cmd) => { try { return execSync(cmd, { cwd: ROT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (e) { return ''; } };

const FRAGA = `query {
  issues(first: 250, filter: { team: { key: { eq: "MES" } }, state: { type: { nin: ["completed","canceled","duplicate"] } } }) {
    nodes {
      identifier title priority updatedAt
      state { name type }
      labels { nodes { name } }
      project { name }
      projectMilestone { name }
    }
  }
  projects(first: 20) { nodes { name progress state
    projectMilestones(first: 10) { nodes { name } } } }
}`;

const rad = (i) => '  ' + i.identifier.padEnd(9) + i.title.slice(0, 64);
const dagarSen = (iso) => Math.floor((Date.now() - new Date(iso)) / 86400000);

function avsnitt(titel, rader) {
  console.log('\n' + titel);
  if (!rader.length) { console.log('  —'); return; }
  rader.forEach(r => console.log(r));
}

(async () => {
  const d = await graphql(FRAGA);
  const issues = d.issues.nodes;
  const i_ar = (namn) => issues.filter(i => i.state.name === namn);

  console.log('LÄGET  ' + new Date().toLocaleString('sv-SE').slice(0, 16));

  const korsNu = i_ar('In Progress').sort((a, b) => a.identifier.localeCompare(b.identifier));
  avsnitt('KÖRS NU — In Progress (' + korsNu.length + ')', korsNu.map(i => {
    const d = dagarSen(i.updatedAt);
    // Ligger koden redan på main är issuen troligen klar och bara oöppnad.
    const pa_main = sh('git log origin/main -1 --format=%ad --date=short --grep="' + i.identifier + '\\b"');
    const flagg = pa_main ? '  ✓ kod på main sedan ' + pa_main + ' — troligen klar'
                : d >= 2 ? '  ⚠ ' + d + ' dagar utan spår' : '';
    return rad(i) + flagg;
  }));
  console.log('  (en session per rad — saknas en session är issuen övergiven och ska till Todo)');
  console.log('  (✓ betyder att en commit på main nämner issuen: stäng den, eller säg varför den är kvar)');

  const provas = i_ar('Provas');
  const behover = issues.filter(i => i.labels.nodes.some(l => l.name === 'Needs Jesper') && i.state.name !== 'Provas');
  avsnitt('VÄNTAR PÅ DIG — Provas + Needs Jesper (' + (provas.length + behover.length) + ')',
    provas.map(rad).concat(behover.map(i => rad(i) + '  [' + i.state.name + ']')));

  avsnitt('BLOCKED (' + i_ar('Blocked').length + ')', i_ar('Blocked').map(rad));

  const grenar = sh('git for-each-ref --format="%(refname:short)" refs/heads')
    .split('\n').filter(g => g && g !== 'main')
    .map(g => ({ g, n: parseInt(sh('git rev-list --count origin/main..' + g) || '0', 10) }))
    .filter(x => x.n > 0);
  avsnitt('INTE IHOPSLAGET I MAIN (' + grenar.length + ')',
    grenar.map(x => '  ' + x.g.padEnd(40) + x.n + ' commit' + (x.n === 1 ? '' : 's') + ' före main'));

  const nast = issues.filter(i => i.priority === 2 && i.state.type !== 'started')
    .sort((a, b) => a.identifier.localeCompare(b.identifier));
  avsnitt('NÄST PÅ TUR — High, inte påbörjad (' + nast.length + ')', nast.map(i => rad(i) + '  [' + i.state.name + ']'));

  console.log('\nPROJEKT');
  for (const p of d.projects.nodes.filter(p => p.state !== 'completed')) {
    const mina = issues.filter(i => i.project && i.project.name === p.name);
    console.log('  ' + p.name.padEnd(34) + String(Math.round((p.progress || 0) * 100)).padStart(3) + ' %   ' + mina.length + ' öppna');
    const ms = {};
    mina.forEach(i => { if (i.projectMilestone) ms[i.projectMilestone.name] = (ms[i.projectMilestone.name] || 0) + 1; });
    Object.keys(ms).sort().forEach(n => console.log('      ' + n.padEnd(30) + ms[n] + ' öppna'));
  }

  const ostadat = sh('git status --short');
  const opushat = (sh('git rev-list --count origin/main..HEAD') || '0');
  console.log('\nARBETSTRÄDET HÄR: ' + (ostadat ? ostadat.split('\n').length + ' ändrade filer' : 'rent') +
    ', ' + opushat + ' opushade commits, gren ' + sh('git branch --show-current'));
})().catch(e => { console.error('FEL: ' + e.message); process.exit(1); });

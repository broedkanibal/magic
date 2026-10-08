#!/usr/bin/env node
/* Underlaget för /next: kön i Todo i den ordning en agent ska ta den, det
   som pågår just nu (Linear och den här datorn), och en flagga per kandidat
   för det som ser ut att krocka. Skriver ingenting — valet och bedömningen
   gör sessionen enligt .claude/skills/next/SKILL.md och CLAUDE.md.

   Krockflaggorna är en grov första sållning, inte en dom: samma område som en
   issue i In Progress (etiketterna spelvyn, kortigenkänning, telefonen,
   uppstarten, lekar, golden) betyder "läs båda och bedöm", inte "hoppa över".

   Kör: node dev/nasta.cjs            (tio första i kön)
        node dev/nasta.cjs --alla     (hela kön) */

const { execSync } = require('child_process');
const agent = require('./linear-agent/klient.cjs');

const TEAM = '5f69d862-7908-4d0c-9b18-c81c9f44fcea';
const OMRADEN = ['spelvyn', 'kortigenkänning', 'telefonen', 'uppstarten', 'lekar', 'golden', 'Plattform'];
const AVSLUTAD = ['completed', 'canceled', 'duplicate'];
const PRIO = { 1: 'Urgent', 2: 'High', 3: 'Medium', 4: 'Low', 0: '—' };

function sh(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
}

async function hamta(statusNamn) {
  const d = await agent.graphql(
    `query($team: ID!, $namn: String!) { issues(first: 100, filter: { team: { id: { eq: $team } }, state: { name: { eq: $namn } } }) {
       nodes { identifier title priority prioritySortOrder
         labels { nodes { name } } project { name } projectMilestone { name }
         inverseRelations(first: 30) { nodes { type issue { identifier state { name type } } } } } } }`,
    { team: TEAM, namn: statusNamn }
  );
  return d.issues.nodes;
}

const omradenAv = i => i.labels.nodes.map(l => l.name).filter(n => OMRADEN.includes(n));
/* Linears priority: 1 Urgent … 4 Low, 0 = ingen. Ingen sorteras sist. */
const prioRang = p => (p === 0 ? 9 : p);
/* Inom samma prio: ordningen på brädan när den sorteras på Priority — det är
   prioritySortOrder Linear ändrar när Jesper drar ett kort där. sortOrder hör
   till ordningen Manual och skulle glida isär från brädan. */

(async () => {
  const [todo, pagar] = await Promise.all([hamta('Todo'), hamta('In Progress')]);

  todo.sort((a, b) => prioRang(a.priority) - prioRang(b.priority) || a.prioritySortOrder - b.prioritySortOrder);
  const pagOmr = pagar.map(i => ({ id: i.identifier, omr: omradenAv(i) }));

  console.log('PÅGÅR I LINEAR — In Progress (' + pagar.length + ')');
  if (!pagar.length) console.log('  —');
  for (const i of pagar) console.log('  ' + i.identifier.padEnd(8) + ' [' + omradenAv(i).join(', ') + ']  ' + i.title.slice(0, 70));

  console.log('\nPÅGÅR PÅ DATORN');
  const wt = sh('git worktree list').split('\n').filter(r => r && !/\[main\]/.test(r));
  console.log('  worktrees utom main: ' + (wt.length ? '\n    ' + wt.join('\n    ') : '—'));
  const golden = sh('pgrep -fl "kor.cjs|mesa-golden-profil"');
  console.log('  golden kör: ' + (golden ? 'JA — starta ingen egen körning förrän den är klar\n    ' + golden.split('\n').join('\n    ') : 'nej'));
  const smutsigt = sh('git status --short').split('\n').filter(Boolean);
  console.log('  ocommittat i arbetsträdet: ' + (smutsigt.length ? smutsigt.length + ' filer (en annan session kan jobba här — bygg i en egen worktree)' : '—'));
  console.log('  (subagenter och andra sessioner syns inte här — kör ListAgents också)');

  const visa = process.argv.includes('--alla') ? todo : todo.slice(0, 10);
  console.log('\nKÖN — Todo i ordning (' + todo.length + (visa.length < todo.length ? ', visar ' + visa.length : '') + ')');
  for (const i of visa) {
    const blockerare = i.inverseRelations.nodes
      .filter(r => r.type === 'blocks' && !AVSLUTAD.includes(r.issue.state.type))
      .map(r => r.issue.identifier);
    const omr = omradenAv(i);
    const krock = pagOmr.filter(p => p.omr.some(o => omr.includes(o))).map(p => p.id);
    const flaggor = [];
    if (blockerare.length) flaggor.push('BLOCKERAD av ' + blockerare.join(', '));
    if (krock.length) flaggor.push('samma område som ' + krock.join(', ') + ' — bedöm');
    const var_ = [i.project && i.project.name, i.projectMilestone && i.projectMilestone.name].filter(Boolean).join(' / ');
    console.log('  ' + i.identifier.padEnd(8) + PRIO[i.priority].padEnd(7) + ' [' + omr.join(', ') + ']  ' + i.title.slice(0, 64));
    if (var_) console.log('           ' + var_);
    if (flaggor.length) console.log('           ⚠ ' + flaggor.join('; '));
  }
})().catch(e => { console.error('nasta.cjs: ' + e.message); process.exit(1); });

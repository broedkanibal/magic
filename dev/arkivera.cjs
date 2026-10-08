#!/usr/bin/env node
'use strict';
/* Arkivkollen: är sessionen redo att arkiveras? Läser git, lsof och Linear.
   Skriver ingenting.

   Körs av skillen /archive (.claude/skills/archive/SKILL.md), som själv avgör
   vad som är sessionens eget och vad som ska åtgärdas.

     node dev/arkivera.cjs MES-12 MES-34          issues som sessionen rört
     node dev/arkivera.cjs --fran <commit> MES-12 samt MES-nummer i commit-
                                                  rubriker från <commit> och framåt */
const { execSync } = require('child_process');
const path = require('path');
const { graphql } = require(path.join(__dirname, 'linear-agent', 'klient.cjs'));

const HAR = process.cwd();
const sh = (cmd, cwd) => { try { return execSync(cmd, { cwd: cwd || HAR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (e) { return ''; } };
const rader = (t) => t.split('\n').filter(Boolean);

const TYP_ETIKETTER = ['Bug', 'Feature', 'Improvement', 'Research', 'Administrative'];
const OMRADES_ETIKETTER = ['uppstarten', 'spelvyn', 'lekar', 'kortigenkänning', 'telefonen', 'golden', 'Plattform'];

let fel = 0, varn = 0;
const ok = (t) => console.log('  ✓ ' + t);
const bad = (t) => { fel++; console.log('  ✗ ' + t); };
const warn = (t) => { varn++; console.log('  ⚠ ' + t); };
const info = (t) => console.log('    ' + t);

(async () => {
  const args = process.argv.slice(2);
  const franIx = args.indexOf('--fran');
  const fran = franIx >= 0 ? args.splice(franIx, 2)[1] : '';
  const ids = new Set(args.filter(a => /^MES-\d+$/i.test(a)).map(a => a.toUpperCase()));

  /* ---------- GIT ---------- */
  console.log('GIT  (' + new Date().toLocaleString('sv-SE').slice(0, 16) + ')');
  sh('git fetch -q origin');
  const gemensam = sh('git rev-parse --path-format=absolute --git-common-dir');
  const huvudMapp = gemensam.replace(/\/\.git\/?$/, '');
  const topp = sh('git rev-parse --show-toplevel');
  const iWorktree = topp && topp !== huvudMapp;
  const gren = sh('git branch --show-current');
  console.log('  här:        ' + topp + (iWorktree ? '  (worktree)' : '  (main-mappen)') + '  gren ' + (gren || '(lös HEAD)'));
  console.log('  main-mappen: ' + huvudMapp);

  const ostadat = rader(sh('git status --short'));
  ostadat.length ? bad('ocommittat här: ' + ostadat.length + ' filer') : ok('inget ocommittat här');
  ostadat.slice(0, 15).forEach(r => info(r));
  if (iWorktree) {
    const iHuvud = rader(sh('git status --short', huvudMapp));
    iHuvud.length ? warn('main-mappen har ' + iHuvud.length + ' ändrade filer — kan vara en annan sessions; commita inte det du inte skrivit') : ok('main-mappen är ren');
    iHuvud.slice(0, 15).forEach(r => info(r));
  }

  const opushade = rader(sh('git log origin/main..HEAD --format="%h %s"'));
  opushade.length ? bad(opushade.length + ' commits här är inte på origin/main') : ok('HEAD ligger på origin/main (inget opushat)');
  opushade.slice(0, 10).forEach(r => info(r));

  const mainLokal = sh('git rev-parse main', huvudMapp), mainOrigin = sh('git rev-parse origin/main', huvudMapp);
  if (mainLokal === mainOrigin) ok('lokal main = origin/main');
  else {
    const fore = sh('git rev-list --count origin/main..main', huvudMapp), efter = sh('git rev-list --count main..origin/main', huvudMapp);
    bad('lokal main är ' + fore + ' före / ' + efter + ' efter origin/main');
  }

  const stash = rader(sh('git stash list'));
  stash.length ? bad(stash.length + ' stash-poster') : ok('ingen stash');
  stash.forEach(r => info(r));

  console.log('\nWORKTREES OCH GRENAR');
  const wt = sh('git worktree list --porcelain').split('\n\n').filter(Boolean).map(b => {
    const f = {}; b.split('\n').forEach(l => { const [k, ...v] = l.split(' '); f[k] = v.join(' '); });
    return { sokvag: f.worktree, gren: (f.branch || '').replace('refs/heads/', ''), last: 'locked' in f };
  }).filter(w => w.sokvag !== huvudMapp);
  if (!wt.length) ok('inga worktrees utöver main-mappen');
  wt.forEach(w => {
    const ej = w.gren ? sh('git rev-list --count origin/main..' + w.gren, huvudMapp) : '?';
    const smutsig = rader(sh('git status --short', w.sokvag)).length;
    const min = w.sokvag === topp ? '  ← DEN HÄR SESSIONENS?' : '';
    (w.last ? warn : bad)((w.last ? 'LÅST ' : '') + w.sokvag + '  [' + (w.gren || 'lös HEAD') + ']  ' + ej + ' commits ej på main, ' + smutsig + ' ändrade filer' + min);
  });
  info('Avgör själv vilka som är sessionens egna. Rör aldrig andras eller låsta.');

  const ejIhop = rader(sh('git for-each-ref --format="%(refname:short)" refs/heads', huvudMapp)).filter(g => g !== 'main')
    .map(g => ({ g, n: sh('git rev-list --count origin/main..' + g, huvudMapp) })).filter(x => x.n !== '0');
  const ihopMenKvar = rader(sh('git branch --merged origin/main --format="%(refname:short)"', huvudMapp)).filter(g => g !== 'main');
  ihopMenKvar.forEach(g => bad('gren ' + g + ' är ihopslagen men finns kvar lokalt'));
  ejIhop.forEach(x => warn('gren ' + x.g + ' har ' + x.n + ' commits som inte är på main'));
  if (!ejIhop.length && !ihopMenKvar.length) ok('inga lokala grenar utöver main');

  const fjarr = rader(sh('git for-each-ref --format="%(refname:short)" refs/remotes/origin', huvudMapp)).filter(g => g !== 'origin' && g !== 'origin/HEAD' && g !== 'origin/main');
  fjarr.length ? fjarr.forEach(g => bad('gren på origin: ' + g)) : ok('inga grenar på origin utöver main');

  console.log('\nPROCESSER OCH TEMP');
  const temp = rader(sh('ls dev/_* dev/*/_* 2>/dev/null', topp));
  temp.length ? temp.forEach(f => bad('temp-fil i repot: ' + f)) : ok('inga dev/_*-filer');
  const portar = rader(sh('lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null | grep -v "^COMMAND" | grep -Ei "^(node|python)" | awk \'{print $1, $2, $9}\''));
  portar.length ? portar.forEach(p => warn('lyssnar: ' + p)) : ok('inga node/python/chrome-servrar lyssnar');
  if (portar.length) info('Är de sessionens egna (dev-server, kor.cjs --port, stub-server)? Stoppa dem. Andras: lämna.');

  /* ---------- LINEAR ---------- */
  if (fran) {
    const rub = sh('git log ' + fran + '..origin/main --format=%s', huvudMapp) + '\n' + sh('git log origin/main..HEAD --format=%s');
    (rub.match(/MES-\d+/gi) || []).forEach(m => ids.add(m.toUpperCase()));
  }
  if (gren) (gren.match(/MES-\d+/gi) || []).forEach(m => ids.add(m.toUpperCase()));

  console.log('\nLINEAR  (' + ids.size + ' issues)');
  if (!ids.size) { warn('inga MES-nummer angivna — fyll i dem från samtalet, grenen och commit-rubrikerna'); }
  for (const id of [...ids].sort((a, b) => parseInt(a.slice(4)) - parseInt(b.slice(4)))) {
    let i;
    try {
      i = (await graphql(`query($id:String!){ issue(id:$id){ identifier title priority updatedAt
        state{name type} labels{nodes{name}} project{name} projectMilestone{name}
        delegate{name} assignee{name}
        comments(first:100){nodes{createdAt body user{name}}} } }`, { id })).issue;
    } catch (e) { bad(id + ': kunde inte läsas (' + e.message.slice(0, 80) + ')'); continue; }
    if (!i) { bad(id + ': finns inte'); continue; }
    const etik = i.labels.nodes.map(l => l.name);
    const kom = i.comments.nodes.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)).pop();
    const commit = rader(sh('git log origin/main --format="%h %s" --grep="' + id + '(?![0-9])" -P', huvudMapp)).filter(r => new RegExp('^\\S+ .*' + id + '(?![0-9])').test(r));
    console.log('\n  ' + i.identifier + '  ' + i.title.slice(0, 70));
    info('status: ' + i.state.name + '   prio: ' + (['ingen', 'Urgent', 'High', 'Medium', 'Low'][i.priority] || i.priority) +
      '   projekt: ' + (i.project ? i.project.name : '—') + (i.projectMilestone ? ' / ' + i.projectMilestone.name : ''));
    info('etiketter: ' + (etik.join(', ') || '—') + '   delegate: ' + (i.delegate ? i.delegate.name : '—') + '   assignee: ' + (i.assignee ? i.assignee.name : '—'));
    info('senaste kommentar: ' + (kom ? kom.createdAt.slice(0, 16).replace('T', ' ') + ' ' + (kom.user ? kom.user.name : '?') + ': ' + kom.body.replace(/\s+/g, ' ').slice(0, 90) : '—'));
    info('commit-rubriker på main: ' + (commit.length ? commit.length + ' (senast ' + commit[0].slice(0, 70) + ')' : 'ingen'));
    if (i.state.name === 'In Progress') bad(i.identifier + ' står i In Progress — ingen session kör den när den här slutar');
    if (!etik.some(e => TYP_ETIKETTER.includes(e))) bad(i.identifier + ' saknar typ-etikett (' + TYP_ETIKETTER.join('/') + ')');
    if (!etik.some(e => OMRADES_ETIKETTER.includes(e))) warn(i.identifier + ' saknar områdesetikett — ämnesetikett kan duga, bedöm själv');
    if (i.state.name === 'Redo att testas' && !(kom && /prov|test/i.test(kom.body))) warn(i.identifier + ' står i Redo att testas men senaste kommentaren säger inte vad som ska provas');
    if (i.state.type === 'completed' && !commit.length) warn(i.identifier + ' är Done men ingen commit-rubrik på main nämner den');
    if (i.state.name === 'Todo' && !i.priority) warn(i.identifier + ' står i Todo utan prioritet');
  }

  console.log('\n' + (fel ? '✗ ' + fel + ' saker stoppar arkiveringen' : '✓ inget stoppar arkiveringen') + (varn ? ', ' + varn + ' varningar att bedöma' : '') + '.');
  process.exit(fel ? 1 : 0);
})().catch(e => { console.error('FEL: ' + e.message); process.exit(2); });

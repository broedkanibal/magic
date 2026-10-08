#!/usr/bin/env node
'use strict';
/* Measurements: de senaste talen från varje mätverktyg, på en skärm.
   Läser verktygens egna resultatfiler och git. Kör inga mätningar.

   Kartan över vad verktygen är: dev/measurements/MAP.md.
   Körs av skillen /measurements (.claude/skills/measurements/SKILL.md).

     node dev/measurements/show.cjs                översikten, utan Claude (förval)
     node dev/measurements/show.cjs --claude       översikten med båda: utan och med Claude
     node dev/measurements/show.cjs golden         ett verktyg i detalj (golden, deckgolden,
                                                   eventtest, mattest, latency, components)

   Component tests har inga egna resultatfiler med ett fast format. Den som kör
   ett component test skriver in talet i registret dev/measurements/register.jsonl:

     node dev/measurements/show.cjs --register camera-rules "251/251 OK" --source "node dev/kamerabank.cjs"

   ⚠ = koden (index.html) har ändrats sedan mätningen. */
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const ROT = path.join(__dirname, '..', '..');
const p = (...d) => path.join(ROT, ...d);

/* Mapparna byter namn (prompt H): det första som finns används. */
const MAPPAR = {
  golden: ['dev/golden'],
  eventtest: ['dev/eventtest', 'dev/spegelfacit'],
  mattest: ['dev/mattest', 'dev/uppspelaren'],
  deckgolden: ['dev/lekgolden'],
  latency: ['dev/latens'],
};
const mapp = (v) => MAPPAR[v].find(m => fs.existsSync(p(m))) || MAPPAR[v][0];
const REGISTER = 'dev/measurements/register.jsonl';

/* Materialet per golden-fall, ur MAP.md avsnitt 4. */
const SKARM = ['01', '02', '07', '09', '10', '11', '12'];
const KONSTGJORT = ['08'];
const material = (id) => SKARM.includes(id) ? 'skärminspelning' : KONSTGJORT.includes(id) ? 'konstgjort' : 'ren kamera';

const DELPROV = [
  { id: 'camera-rules', namn: 'Camera rules', fil: null, kor: 'node dev/kamerabank.cjs' },
  { id: 'wholecard', namn: 'Image model, whole cards', fil: /^helkort-jamfor-.*\.txt$/, dir: 'dev/remsa/resultat', kor: 'dev/remsa/helkort_jamfor.py' },
  { id: 'strips', namn: 'Image model, strips', fil: /^remsregel-.*\.txt$/, dir: 'dev/remsa/resultat', kor: 'dev/remsa/remsexp.py + remsregel.py' },
  { id: 'detector', namn: 'Detector', fil: /-par-summa\.json$/, dir: 'dev/detektor/resultat', kor: 'dev/detektor/tran/parprov.py' },
  { id: 'piles', namn: 'Piles', fil: /^hogbank-remsor\.json$/, dir: 'dev/remsa/resultat', kor: 'dev/remsa/hogbank_remsor.py' },
];

// ---------- git och tid ----------
const sh = (cmd) => { try { return execSync(cmd, { cwd: ROT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 }).trim(); } catch (e) { return ''; } };
const HEAD = sh('git rev-parse --short HEAD');
const GREN = sh('git rev-parse --abbrev-ref HEAD');
/* Git är långsamt när datorn är belastad, så varje fråga ställs en gång. */
const minne = new Map();
const enGang = (nyckel, f) => { if (!minne.has(nyckel)) minne.set(nyckel, f()); return minne.get(nyckel); };
const mainCommits = () => enGang('main', () => sh('git rev-list HEAD').split('\n').filter(Boolean));
const paMain = (c) => !!c && enGang('pa:' + c, () => mainCommits().some(h => h.startsWith(c)));
const finns = (c) => !!c && enGang('finns:' + c, () => spawnSync('git', ['cat-file', '-e', c + '^{commit}'], { cwd: ROT }).status === 0);
/* Har kamerakoden ändrats sedan commiten? null = vet inte. */
const kodAndrad = (c) => {
  if (!finns(c)) return null;
  return enGang('andrad:' + c, () => spawnSync('git', ['diff', '--quiet', c, 'HEAD', '--', 'index.html'], { cwd: ROT }).status !== 0);
};
const indexLogg = () => enGang('index', () => sh('git log --format=%cI -- index.html').split('\n').filter(Boolean).map(t => new Date(t)));
const kodAndradSedan = (iso) => indexLogg().some(t => t > new Date(iso));
/* Senaste commit per fil i en mapp, med ett enda git log. */
const mappLogg = (dir) => enGang('logg:' + dir, () => {
  const ut = new Map();
  let akt = null;
  for (const l of sh(`git log --format=%x00%h%x09%cI --name-only -- "${dir}"`).split('\n')) {
    if (l.startsWith('\0')) { const [h, t] = l.slice(1).split('\t'); akt = { h, t }; }
    else if (l && akt && !ut.has(l)) ut.set(l, akt);
  }
  return ut;
});
const filCommit = (rel) => enGang('fil:' + rel, () => { const r = sh(`git log -1 --format=%h%x09%cI -- "${rel}"`); if (!r) return null; const [h, t] = r.split('\t'); return { h, t }; });
const filCommitFore = (rel, h) => enGang(`fore:${rel}:${h}`, () => { const r = sh(`git log -1 --format=%h%x09%cI ${h}~1 -- "${rel}"`); if (!r) return null; const [hh, t] = r.split('\t'); return { h: hh, t }; });

const SV = { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
const svTid = (d) => new Date(d).toLocaleString('sv-SE', SV);
const sedan = (d) => {
  const ms = Date.now() - new Date(d);
  if (!isFinite(ms)) return '';
  const h = ms / 3600000;
  if (h < 1) return `för ${Math.max(1, Math.round(ms / 60000))} min sedan`;
  if (h < 48) return `för ${Math.round(h)} h sedan`;
  return `för ${Math.round(h / 24)} d sedan`;
};
/* "2026-10-07" + "16:58" (svensk tid) → Date. */
const svDatum = (dag, kl) => {
  const prov = new Date(`${dag}T${(kl || '12:00').replace('.', ':').padStart(5, '0')}:00Z`);
  const off = new Date(prov.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' })) - new Date(prov.toLocaleString('en-US', { timeZone: 'UTC' }));
  return new Date(prov - off);
};
const varning = (andrad) => andrad === true ? ' ⚠' : andrad === null ? ' ?' : '';
const las = (rel) => fs.readFileSync(p(rel), 'utf8');
const lasJson = (rel) => JSON.parse(las(rel));
const ren = (s) => (s || '').replace(/\*\*/g, '').trim();

// ---------- golden ----------
function goldenHistorik() {
  const rel = mapp('golden') + '/historik.md';
  const rader = [];
  let forraCommit = null;
  for (const l of las(rel).split('\n')) {
    if (!/^\| 20\d\d-/.test(l)) continue;
    const c = l.trim().replace(/^\||\|$/g, '').split('|').map(s => s.trim());
    if (c.length < 10) continue;
    const egen = (c[1].match(/\b[0-9a-f]{7,40}\b/) || [])[0] || null;
    const commit = egen || (/^som /.test(c[1]) ? forraCommit : null);
    forraCommit = commit;
    const namn = ren(c[6]).match(/^(\d+)\/119\b/);       // bara hela körningar med ett enda värde
    if (!namn) continue;
    const fel = ren(c[7]).match(/^(\d+)/);
    const hitt = ren(c[4]).match(/(\d+)\/119/);
    const kl = c[3].match(/(\d{1,2}[:.]\d{2})\s*[–-]\s*(\d{1,2}[:.]\d{2})/);
    rader.push({
      dag: c[0], commit, ai: /\+ai|claude/i.test(c[2]),
      namn: +namn[1], fel: fel ? +fel[1] : null, hittade: hitt ? +hitt[1] : null,
      fran: kl ? kl[1].replace('.', ':') : null, till: kl ? kl[2].replace('.', ':') : null,
      vad: ren(c[1]).replace(/\s+/g, ' '),
    });
  }
  return rader.map(r => ({ ...r, main: paMain(r.commit), tid: svDatum(r.dag, r.fran) }));
}
function goldenBaslinje(fil) {
  const rel = mapp('golden') + '/' + fil;
  if (!fs.existsSync(p(rel))) return null;
  const d = lasJson(rel);
  const S = (k, f = () => true) => d.filter(e => f(e)).reduce((s, e) => s + (e[k] || 0), 0);
  const ren_ = (e) => material(e.id.slice(0, 2)) === 'ren kamera';
  const video = (e) => e.videoLagdaAv != null;
  return {
    rel, fil: filCommit(rel), fall: d,
    kort: S('kort'), namn: S('namn'), fel: S('felNamn'), hittade: S('hittade'), falska: S('falska'),
    renKort: S('kort', ren_), renNamn: S('namn', ren_),
    lagda: S('videoLagda', video), lagdaAv: S('videoLagdaAv', video), felUnder: S('videoFelUnder', video),
    videoFall: d.filter(video).length, fotoFall: d.filter(e => !video(e)).length,
    metod: d[0] && d[0].metod, ai: d[0] && d[0].ai, promptv: d[0] && d[0].promptv,
  };
}
function golden() {
  const rader = goldenHistorik();
  const main = rader.filter(r => !r.ai && r.main);
  const sen = main[main.length - 1] || null;
  const iSen = sen ? rader.lastIndexOf(sen) : -1;
  const gren = rader.filter((r, i) => !r.ai && !r.main && r.commit && i > iSen).pop() || null;
  const bas = goldenBaslinje('senaste.json');
  /* Förra = baslinjen, alltså det som senast godkändes. Är den samma som
     senaste körningen: baslinjen före den. */
  let forra = null;
  if (bas && sen && bas.namn !== sen.namn) forra = { namn: bas.namn, commit: bas.fil.h, vad: 'baslinjen' };
  else if (bas && bas.fil) {
    const fo = filCommitFore(bas.rel, bas.fil.h);
    if (fo) { try { const d = JSON.parse(sh(`git show ${fo.h}:"${bas.rel}"`)); forra = { namn: d.reduce((s, e) => s + (e.namn || 0), 0), commit: fo.h, vad: 'förra baslinjen' }; } catch (e) { } }
  }
  return { sen, forra, gren, bas, basAi: goldenBaslinje('senaste-ai.json') };
}

// ---------- Mat test ----------
function mattprovet() {
  const rel = mapp('mattest') + '/baslinje/baslinje.json';
  if (!fs.existsSync(p(rel))) return null;
  const d = lasJson(rel);
  const fc = filCommit(rel);
  let forra = null;
  if (fc) {
    const fo = filCommitFore(rel, fc.h);
    if (fo) { try { forra = { ...JSON.parse(sh(`git show ${fo.h}:"${rel}"`)), fil: fo }; } catch (e) { } }
  }
  return { d, fil: fc, forra, rel };
}

// ---------- Event test ----------
function handelseprovet() {
  const dir = mapp('eventtest') + '/resultat';
  if (!fs.existsSync(p(dir))) return {};
  const ut = {};
  for (const f of fs.readdirSync(p(dir)).filter(f => f.endsWith('.md'))) {
    const slag = /-ai(-|\.md)/.test(f) ? 'ai' : /-lokal(-|\.md)/.test(f) ? 'lokal' : null;
    if (!slag) continue;
    const rel = dir + '/' + f;
    const fc = mappLogg(dir).get(rel) || { h: null, t: fs.statSync(p(rel)).mtime.toISOString() };
    if (ut[slag] && new Date(ut[slag].fil.t) >= new Date(fc.t)) continue;
    const text = las(rel);
    const tot = text.match(/\|\s*\*\*på mattan\*\*\s*\|\s*(\d+)\s*\|\s*(\d+)\/(\d+)\s*\|\s*(\d+)\/(\d+)/);
    const kord = text.match(/körd (\d{4}-\d\d-\d\d) (\d\d:\d\d)/);
    const typer = (text.split('## Per händelsetyp')[1] || '').split('\n\n')[1] || '';
    ut[slag] = {
      rel, fil: fc, syntes: tot && +tot[2], rattKort: tot && +tot[4], av: tot && +tot[3],
      kord: kord ? svDatum(kord[1], kord[2]) : new Date(fc.t), typer: typer.trim(),
    };
  }
  return ut;
}

// ---------- Deck golden ----------
function lekgolden() {
  const dir = mapp('deckgolden');
  const ut = {};
  if (!fs.existsSync(p(dir + '/historik.md'))) return ut;
  for (const l of las(dir + '/historik.md').split('\n')) {
    if (!/^\| 20\d\d-/.test(l)) continue;
    const c = l.trim().replace(/^\||\|$/g, '').split('|').map(s => s.trim());
    if (c.length < 11) continue;
    const ratt = c[4].match(/(\d+)\/(\d+)/);
    if (!ratt) continue;
    ut[c[3]] = { dag: c[0], commit: (c[1].match(/[0-9a-f]{7,40}/) || [])[0], modell: c[2], ratt: +ratt[1], av: +ratt[2], fel: c[7], exakt: c[10], vad: c[11] };
  }
  try { const s = lasJson(dir + '/senaste.json'); ut.datum = s.datum; } catch (e) { }
  return ut;
}

// ---------- Latency ----------
function latens(analys = true) {
  const dir = mapp('latency');
  if (!fs.existsSync(p(dir))) return null;
  const filer = fs.readdirSync(p(dir)).filter(f => /^latens-.*\.json$/.test(f)).map(f => {
    try { const d = lasJson(dir + '/' + f); return { f, start: d.start, rader: (d.rader || []).length }; } catch (e) { return null; }
  }).filter(x => x && x.start);
  if (!filer.length) return null;
  const dag = (x) => svTid(x.start).slice(0, 10);
  const senDag = filer.map(dag).sort().pop();
  const pass = filer.filter(x => dag(x) === senDag).sort((a, b) => b.rader - a.rader)[0];
  if (!analys) return { pass, andrad: kodAndradSedan(pass.start) };
  const r = spawnSync('node', [p(dir, 'analys.cjs'), p(dir, pass.f)], { cwd: ROT, encoding: 'utf8', maxBuffer: 1 << 26 });
  const text = r.stdout || '';
  const del = (text.split('### Från att handen släpper')[1] || '').split('###')[0].replace(/^[^\n]*\n/, '');
  const rad = (namn) => {
    const m = del.split('\n').find(l => l.startsWith('| ' + namn + ' |'));
    if (!m) return null;
    const c = m.split('|').map(s => s.trim()).filter(Boolean);
    return { n: +c[1], median: c[2], p90: c[3], p95: c[4], inom: c[5] };
  };
  return { pass, namn: rad('namn'), borta: rad('borta'), syns: rad('något syns (skugga eller namn)'), del: del.trim(), andrad: kodAndradSedan(pass.start) };
}

// ---------- Component tests ----------
function register() {
  if (!fs.existsSync(p(REGISTER))) return [];
  return las(REGISTER).split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
}
function delprov() {
  const reg = register();
  return DELPROV.map(dp => {
    const sen = reg.filter(r => r.test === dp.id).pop() || null;
    let fil = null;
    if (dp.fil && fs.existsSync(p(dp.dir))) {
      fil = fs.readdirSync(p(dp.dir)).filter(f => dp.fil.test(f))
        .map(f => ({ f: dp.dir + '/' + f, t: fs.statSync(p(dp.dir, f)).mtime }))
        .sort((a, b) => b.t - a.t)[0] || null;
    }
    return { ...dp, sen, senFil: fil, andrad: sen ? kodAndrad(sen.commit) : null };
  });
}

// ---------- utskrift ----------
const W = (s, n) => { s = String(s); return s.length >= n ? s + ' ' : s + ' '.repeat(n - s.length); };
const tidRad = (t) => `${svTid(t)} (${sedan(t)})`;

function oversikt(medClaude) {
  const g = golden(), m = mattprovet(), h = handelseprovet(), l = lekgolden(), lat = latens(medClaude), dp = delprov();
  const ut = [];
  ut.push(`MEASUREMENTS — ${medClaude ? 'utan och med Claude' : 'utan Claude'} · ${GREN} ${HEAD} · ${svTid(new Date())}`);
  ut.push('');

  ut.push('KAMERAN LÄSER KORTEN');
  if (g.sen) {
    const s = g.sen;
    ut.push(`  ${W('Golden, alla 18 fall', 26)}${W('11 foton + 7 videor', 22)}rätt namn ${s.namn}/119 · fel namn ${s.fel}` +
      `${g.forra ? `   förra ${g.forra.namn} (${g.forra.vad})` : ''}   mål 0 fel`);
    ut.push(`  ${' '.repeat(48)}mätt ${s.dag} ${s.fran || ''}${s.till ? '–' + s.till : ''} · ${s.commit}${varning(kodAndrad(s.commit))}`);
    if (g.bas) ut.push(`  ${' '.repeat(48)}varav ren kamera ${g.bas.renNamn}/${g.bas.renKort} (ur baslinjen, se nedan)`);
    if (g.bas && g.bas.namn !== s.namn) ut.push(`  ${' '.repeat(48)}senaste körningen är inte sparad som baslinje (senaste.json = ${g.bas.namn}/119, ${g.bas.fil.h})`);
    if (g.gren) ut.push(`  ${' '.repeat(48)}senaste på en gren: ${g.gren.namn}/119 · fel namn ${g.gren.fel} · ${g.gren.commit} · ${g.gren.dag} ${g.gren.fran || ''}`);
  } else ut.push('  Golden                    ingen hel körning hittad i historiken');
  if (medClaude && g.basAi) {
    const b = g.basAi;
    ut.push(`  ${W('  med Claude', 48)}rätt namn ${b.namn}/${b.kort} · fel namn ${b.fel}   ${b.ai || ''} v${b.promptv || '?'}`);
    ut.push(`  ${' '.repeat(48)}baslinjen senaste-ai.json · ${b.fil.h} ${tidRad(b.fil.t)}${varning(kodAndrad(b.fil.h))}`);
  }
  if (l.hela) {
    if (medClaude) {
      ut.push(`  ${W('Deck golden', 26)}${W('15 foton, 10 set', 22)}rätt ${l.hela.ratt}/${l.hela.av} · fel namn ${l.hela.fel} · exakt ${l.hela.exakt}` +
        `${l.ram ? `   ram ${l.ram.ratt}/${l.ram.av}` : ''}`);
      ut.push(`  ${' '.repeat(48)}mätt ${l.datum || l.hela.dag} · ${l.hela.commit || '–'}${varning(kodAndrad(l.hela.commit))}`);
    } else ut.push(`  ${W('Deck golden', 26)}${W('15 foton, 10 set', 22)}finns bara med Claude — /measurements med claude`);
  }
  ut.push('');

  ut.push('KAMERAN FÖLJER SPELET (kräver video)');
  if (g.bas) {
    ut.push(`  ${W('Golden, videofallen', 26)}${W(g.bas.videoFall + ' videor', 22)}utlagda med namn ${g.bas.lagda}/${g.bas.lagdaAv} (alls) · inom 1 s: kommer`);
    ut.push(`  ${' '.repeat(48)}baslinjen senaste.json · ${g.bas.fil.h} ${tidRad(g.bas.fil.t)}${varning(kodAndrad(g.bas.fil.h))}`);
    if (medClaude && g.basAi) ut.push(`  ${W('  med Claude', 48)}utlagda med namn ${g.basAi.lagda}/${g.basAi.lagdaAv} · ${g.basAi.fil.h} ${svTid(g.basAi.fil.t)}`);
  }
  for (const [slag, rubrik] of [['lokal', ''], ['ai', '  med Claude']]) {
    if (slag === 'ai' && !medClaude) continue;
    const x = h[slag];
    const namn = slag === 'lokal' ? 'Event test' : rubrik;
    if (!x) { ut.push(`  ${W(namn, 48)}ingen körning`); continue; }
    ut.push(`  ${W(namn, 26)}${W(slag === 'lokal' ? 'Game 22/9, video' : '', 22)}syntes på mattan ${x.syntes}/${x.av} · rätt kort ${x.rattKort}/${x.av}`);
    ut.push(`  ${' '.repeat(48)}mätt ${tidRad(x.kord)}${varning(kodAndradSedan(x.kord))}`);
  }
  ut.push('');

  ut.push('MATTAN VISAR BORDET (inspelade loggar, Claude ingår inte)');
  if (m) {
    const t = m.d.totalt, f = m.forra && m.forra.totalt;
    ut.push(`  ${W('Mat test', 26)}${W(m.d.fall.length + ' fall', 22)}utspel med namn ${t.utspelKort.n}/${t.utspelKort.av} · hopp ${t.hopp + t.hoppSnabba}` +
      `${f ? `   förra ${f.utspelKort.n}/${f.utspelKort.av} · hopp ${f.hopp + f.hoppSnabba}` : ''}   mål 0 hopp`);
    ut.push(`  ${' '.repeat(48)}baslinjen ${m.d.meta.datum} · kod ${m.d.meta.commit}${varning(kodAndrad(m.d.meta.commit))} · sparad ${m.fil ? tidRad(m.fil.t) : '–'}`);
  }
  ut.push('');

  ut.push('FART PÅ RIKTIG TELEFON');
  if (!lat) ut.push('  Latency                   ingen fil');
  else if (!medClaude) ut.push(`  ${W('Latency', 26)}${W('riktiga pass', 22)}finns bara med Claude — /measurements med claude   (senast ${svTid(lat.pass.start).slice(0, 10)}${lat.andrad ? ' ⚠' : ''})`);
  else {
    ut.push(`  ${W('Latency', 26)}${W('riktigt pass', 22)}släpp → namn median ${lat.namn ? lat.namn.median + ' ms · inom 0,3 s ' + lat.namn.inom + ' (' + lat.namn.n + ' kort)' : '–'}   mål 300 ms`);
    ut.push(`  ${' '.repeat(48)}${lat.pass.f} · ${tidRad(lat.pass.start)}${lat.andrad ? ' ⚠' : ''}`);
  }
  ut.push('');

  ut.push('COMPONENT TESTS (diagnos, inte grind — förklarar varför en grind rörde sig)');
  for (const d of dp) {
    if (d.sen) ut.push(`  ${W(d.namn, 26)}${W(d.sen.tal, 40)}${svTid(d.sen.tid)} · ${d.sen.commit || '–'}${varning(d.andrad)}`);
    else ut.push(`  ${W(d.namn, 26)}${W('inget i registret', 40)}${d.senFil ? 'senaste fil ' + path.basename(d.senFil.f) + ' ' + svTid(d.senFil.t).slice(0, 10) : ''}`);
  }
  ut.push('');
  ut.push('⚠ = index.html har ändrats sedan mätningen.  Detaljer: node dev/measurements/show.cjs <golden|deckgolden|eventtest|mattest|latency|components>');
  return ut.join('\n');
}

function detaljGolden() {
  const g = golden();
  const ut = ['GOLDEN', ''];
  ut.push('Senaste hela körningarna (dev/golden/historik.md, utan Claude):');
  ut.push('  datum       tid          commit    main  hittade  rätt namn  fel namn  vad');
  const rader = goldenHistorik().filter(r => !r.ai).slice(-8);
  for (const r of rader) {
    ut.push(`  ${W(r.dag, 12)}${W((r.fran || '') + (r.till ? '–' + r.till : ''), 13)}${W(r.commit || '–', 10)}${W(r.main ? 'ja' : 'gren', 6)}${W(r.hittade != null ? r.hittade + '/119' : '–', 9)}${W(r.namn + '/119', 11)}${W(r.fel, 10)}${r.vad.slice(0, 70)}`);
  }
  for (const b of [g.bas, g.basAi].filter(Boolean)) {
    ut.push('');
    ut.push(`Fall för fall — ${b.rel.split('/').pop()} (${b.fil.h}, ${svTid(b.fil.t)}${b.ai ? ', med Claude ' + b.ai + ' v' + b.promptv : ', utan Claude'})${varning(kodAndrad(b.fil.h))}`);
    ut.push(`  Krav   fel namn ${b.fel}   (mål 0)`);
    ut.push(`  Nivå 1 hittade ${b.hittade} av ${b.kort} synliga`);
    ut.push(`  Nivå 2 rätt namn ${b.namn}/${b.kort} · varav ren kamera ${b.renNamn}/${b.renKort}`);
    ut.push(`  Nivå 3 utlagda med namn ${b.lagda}/${b.lagdaAv} (bara de ${b.videoFall} videorna) · fel namn under förloppet ${b.felUnder} · inom 1 s: kommer`);
    ut.push('');
    ut.push('  fall                                         slag   material          kort  hittade  rätt namn  fel  utlagda m. namn');
    for (const e of b.fall) {
      const id = e.id.slice(0, 2), video = e.videoLagdaAv != null;
      ut.push(`  ${W(e.id.slice(0, 44), 45)}${W(video ? 'video' : 'foto', 7)}${W(material(id), 18)}${W(e.kort, 6)}${W(e.hittade, 9)}${W(e.namn + '/' + e.kort, 11)}${W(e.felNamn, 5)}${video ? e.videoLagda + '/' + e.videoLagdaAv : ''}`);
    }
  }
  return ut.join('\n');
}

function detaljMatt() {
  const m = mattprovet();
  if (!m) return 'MAT TEST — ingen baslinje';
  const ut = [`MAT TEST — baslinjen ${m.d.meta.datum}, kod ${m.d.meta.commit}${varning(kodAndrad(m.d.meta.commit))} · ${m.rel}`, ''];
  const md = las(m.rel.replace(/\.json$/, '.md'));
  const tab = md.split('\n').filter(l => /^\| (Mått|---|[A-ZÅÄÖ])/.test(l) && !/^\| (Fall|Kod) /.test(l));
  ut.push(...tab.filter(l => l.split('|').length > 6));
  if (m.forra) ut.push('', `förra baslinjen: ${m.forra.meta.datum}, kod ${m.forra.meta.commit} — utspel med namn ${m.forra.totalt.utspelKort.n}/${m.forra.totalt.utspelKort.av}`);
  return ut.join('\n');
}

function detaljHandelse() {
  const h = handelseprovet();
  const ut = ['EVENT TEST — Game 22/9, det digitala bordet mot händelselistan', ''];
  for (const [slag, rub] of [['lokal', 'Utan Claude'], ['ai', 'Med Claude']]) {
    const x = h[slag];
    if (!x) { ut.push(`${rub}: ingen körning`, ''); continue; }
    ut.push(`${rub} — ${x.rel} · körd ${tidRad(x.kord)}${kodAndradSedan(x.kord.toISOString()) ? ' ⚠' : ''}`);
    ut.push(x.typer, '');
  }
  return ut.join('\n');
}

function detaljLek() {
  const l = lekgolden();
  const ut = [`DECK GOLDEN — bara med Claude · senaste baslinjen ${l.datum || '–'}`, ''];
  for (const k of ['hela', 'ram']) {
    const x = l[k];
    if (!x) continue;
    ut.push(`  ${W(k, 6)}rätt ${x.ratt}/${x.av} · fel namn ${x.fel} · exakt rätt lek ${x.exakt} · ${x.modell} · ${x.commit || '–'}${varning(kodAndrad(x.commit))}`);
    ut.push(`        ${(x.vad || '').slice(0, 140)}`);
  }
  ut.push('', 'hela = filväljaren (hela fotot), ram = kamerans ram. Per set: dev/lekgolden/senaste.json.');
  return ut.join('\n');
}

function detaljLatens() {
  const lat = latens();
  if (!lat) return 'LATENCY — ingen fil';
  return [`LATENCY — ${lat.pass.f} · ${tidRad(lat.pass.start)}${lat.andrad ? ' ⚠ koden har ändrats sedan passet' : ''}`,
    'Bara med Claude (riktigt pass, telefonen frågar Claude). Mål: namn 0,3 s efter släppet.', '',
    'Från att handen släpper (ms):', lat.del, '',
    `Hela rapporten: node dev/latens/analys.cjs dev/latens/${lat.pass.f}`].join('\n');
}

function detaljComponents() {
  const reg = register();
  const ut = ['COMPONENT TESTS — diagnos, inte grind', ''];
  for (const d of delprov()) {
    ut.push(`${d.namn}  (${d.kor})`);
    const egna = reg.filter(r => r.test === d.id).slice(-3);
    if (!egna.length) ut.push('  inget i registret');
    for (const r of egna) ut.push(`  ${svTid(r.tid)} · ${r.commit || '–'}${varning(kodAndrad(r.commit))} · ${r.tal}${r.kalla ? ' · ' + r.kalla : ''}${r.not ? ' — ' + r.not : ''}`);
    if (d.senFil) ut.push(`  senaste resultatfil: ${d.senFil.f} (${svTid(d.senFil.t)})`);
    ut.push('');
  }
  ut.push(`Registrera ett nytt tal: node dev/measurements/show.cjs --register <${DELPROV.map(d => d.id).join('|')}> "<tal>" [--source "<fil eller kommando>"] [--note "<text>"] [--time <iso> --commit <h> (bara i efterhand)]`);
  return ut.join('\n');
}

function registrera(args) {
  const [id, tal] = args;
  if (!DELPROV.some(d => d.id === id) || !tal) {
    console.error(`Användning: node dev/measurements/show.cjs --register <${DELPROV.map(d => d.id).join('|')}> "<tal>" [--source …] [--note …]`);
    process.exit(2);
  }
  const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  /* --time och --commit bara när ett äldre resultat förs in i efterhand. */
  const rad = { test: id, tal, tid: opt('--time') ? new Date(opt('--time')).toISOString() : new Date().toISOString(), commit: opt('--commit') || HEAD, gren: opt('--commit') ? null : GREN, kalla: opt('--source'), not: opt('--note') };
  fs.mkdirSync(p(path.dirname(REGISTER)), { recursive: true });
  fs.appendFileSync(p(REGISTER), JSON.stringify(rad) + '\n');
  console.log('registrerat: ' + JSON.stringify(rad));
}

// ---------- main ----------
const args = process.argv.slice(2);
if (args[0] === '--register') registrera(args.slice(1));
else {
  const vad = (args.find(a => !a.startsWith('--')) || '').toLowerCase().replace(/[\s_-]/g, '');
  const medClaude = args.includes('--claude');
  const DETALJ = {
    golden: detaljGolden, deckgolden: detaljLek, eventtest: detaljHandelse, mattest: detaljMatt, latency: detaljLatens, components: detaljComponents,
  };
  if (!vad) console.log(oversikt(medClaude));
  else if (DETALJ[vad]) console.log(DETALJ[vad]());
  else { console.error('Okänt verktyg: ' + vad + '. Välj ' + Object.keys(DETALJ).join(', ')); process.exit(2); }
}

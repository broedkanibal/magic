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

   Utskriften är markdowntabeller: de går att läsa i terminalen och blir
   riktiga tabeller i chatten.

   ⚠ = koden mätningen beror på har ändrats sedan mätningen (index.html, och
   för component tests de filer som står i DELPROV.kod). */
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

/* kod = filerna testet beror på: har de ändrats sedan mätningen visas ⚠.
   Pythontesten kör bildmodellen eller detektorn själva, inte index.html. */
const DELPROV = [
  { id: 'camera-rules', namn: 'Camera rules', fil: null, kor: 'node dev/kamerabank.cjs', kod: ['index.html', 'dev/kamerabank.cjs'] },
  { id: 'wholecard', namn: 'Image model, whole cards', fil: /^helkort-jamfor-.*\.txt$/, dir: 'dev/remsa/resultat', kor: 'dev/remsa/helkort_jamfor.py', kod: ['dev/embed', 'dev/remsa/lib.py', 'dev/remsa/kalibrering.py', 'dev/remsa/helkort_jamfor.py'] },
  { id: 'strips', namn: 'Image model, strips', fil: /^remsregel-.*\.txt$/, dir: 'dev/remsa/resultat', kor: 'dev/remsa/remsexp.py + remsregel.py', kod: ['dev/embed', 'dev/remsa'] },
  { id: 'detector', namn: 'Detector', fil: /-par-summa\.json$/, dir: 'dev/detektor/resultat', kor: 'dev/detektor/tran/parprov.py', kod: ['dev/detektor/modell', 'dev/detektor/tran/parprov.py'] },
  { id: 'piles', namn: 'Piles', fil: /^hogbank-remsor\.json$/, dir: 'dev/remsa/resultat', kor: 'dev/remsa/hogbank_remsor.py', kod: ['dev/detektor/modell', 'dev/embed', 'dev/remsa'] },
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
/* Har koden mätningen beror på (förval kamerakoden) ändrats sedan commiten? null = vet inte. */
const kodAndrad = (c, filer = ['index.html']) => {
  if (!finns(c)) return null;
  return enGang(`andrad:${c}:${filer}`, () => spawnSync('git', ['diff', '--quiet', c, 'HEAD', '--', ...filer], { cwd: ROT }).status !== 0);
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
      /* "bara 13, 17, 18": totalen är de fallen + resten ur baslinjen */
      del: ((c[3].match(/\bbara [\d, och]*\d/) || [])[0]) || null,
    });
  }
  return rader.map(r => ({ ...r, main: paMain(r.commit), tid: svDatum(r.dag, r.fran) }));
}
function goldenBaslinje(fil) {
  const rel = mapp('golden') + '/' + fil;
  if (!fs.existsSync(p(rel))) return null;
  return { rel, fil: filCommit(rel), ...summera(lasJson(rel)) };
}
/* Summorna ur en baslinje (senaste.json eller en äldre version ur git). */
function summera(d) {
  const S = (k, f = () => true) => d.filter(e => f(e)).reduce((s, e) => s + (e[k] || 0), 0);
  const ren_ = (e) => material(e.id.slice(0, 2)) === 'ren kamera';
  const video = (e) => e.videoLagdaAv != null;
  return {
    fall: d,
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
  /* forraBas = baslinjen före den som gäller nu, ur git. */
  let forraBas = null;
  if (bas && bas.fil) {
    const fo = filCommitFore(bas.rel, bas.fil.h);
    if (fo) { try { forraBas = { ...summera(JSON.parse(sh(`git show ${fo.h}:"${bas.rel}"`))), commit: fo.h }; } catch (e) { } }
  }
  let forra = null;
  if (bas && sen && bas.namn !== sen.namn) forra = { namn: bas.namn, fel: bas.fel, commit: bas.fil.h, vad: 'baslinjen' };
  else if (forraBas) forra = { namn: forraBas.namn, fel: forraBas.fel, commit: forraBas.commit, vad: 'förra baslinjen' };
  return { sen, forra, forraBas, gren, bas, basAi: goldenBaslinje('senaste-ai.json') };
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
    const egna = reg.filter(r => r.test === dp.id);
    return { ...dp, sen, forra: egna[egna.length - 2] || null, senFil: fil, andrad: sen ? kodAndrad(sen.commit, dp.kod) : null };
  });
}

// ---------- utskrift ----------
/* Allt skrivs som markdowntabeller med utfyllda kolumner: de går att läsa i
   terminalen och blir riktiga tabeller i chatten, där skillen visar dem som de är. */
const MAN = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
/* "10 okt 23:01 (18 d)": åldern bara när mätningen är minst ett dygn gammal. */
const kortTid = (t, medKl = true, medAlder = true) => {
  const d = new Date(t);
  if (!isFinite(d)) return '–';
  const [dag, kl] = svTid(d).split(' ');
  const [, mm, dd] = dag.split('-');
  const dygn = Math.floor((Date.now() - d) / 86400000);
  return `${+dd} ${MAN[+mm - 1]}${medKl && kl ? ' ' + kl : ''}${medAlder && dygn >= 1 ? ` (${dygn} d)` : ''}`;
};
const kortDag = (dag, kl) => kortTid(svDatum(dag, kl), !!kl);
const varnText = (andrad) => andrad === true ? '⚠ äldre kod' : andrad === null ? '? commit saknas' : '';
const obs = (...d) => d.filter(Boolean).join(' · ');
const cell = (x) => (x == null ? '' : String(x)).replace(/\|/g, '\\|');
function tabell(huvud, rader) {
  const R = [huvud, ...rader].map(r => huvud.map((_, i) => cell(r[i])));
  const w = huvud.map((_, i) => Math.max(3, ...R.map(r => r[i].length)));
  const rad = (r) => '| ' + r.map((c, i) => c.padEnd(w[i])).join(' | ') + ' |';
  return [rad(R[0]), '|' + w.map(n => '-'.repeat(n + 2)).join('|') + '|', ...R.slice(1).map(rad)].join('\n');
}
const rubrik = (s) => `**${s}**`;
const H = ['Mått', 'Nu', 'Förra', 'Mätt', 'Obs'];

/* Var detaljerna finns och hur varje verktyg mäts om (ur MAP.md). */
const VERKTYG = [
  ['Golden', 'golden', '`node dev/golden/kor.cjs` (~25 min)'],
  ['Deck golden', 'deckgolden', '`node dev/lekgolden/kor.cjs` (kostar Claude)'],
  ['Event test', 'eventtest', '`node dev/eventtest/kor.cjs` + `jamfor.cjs` (~25 min, kräver videon)'],
  ['Mat test', 'mattest', '`node dev/mattest/kor.cjs --jamfor` (~25 s)'],
  ['Latency', 'latency', 'telefonpass med `?debug`, sedan `node dev/latens/analys.cjs <fil>`'],
  ['Component tests', 'components', 'ett kommando per test, se `/measurements components`'],
];

function oversikt(medClaude) {
  const g = golden(), m = mattprovet(), h = handelseprovet(), l = lekgolden(), lat = latens(medClaude), dp = delprov();
  const ut = [`${rubrik('Measurements')} · ${medClaude ? 'utan och med Claude' : 'utan Claude'} · ${GREN} ${HEAD} · ${kortTid(new Date())}`, ''];
  const sektion = (namn, huvud, rader) => ut.push(rubrik(namn), '', tabell(huvud, rader), '');

  const k = [];
  if (g.sen) {
    const s = g.sen;
    k.push(['Golden, 18 fall: rätt namn', `${s.namn}/119`, g.forra ? g.forra.namn : '', `${kortDag(s.dag, s.fran)} · ${s.commit}`,
      obs(varnText(kodAndrad(s.commit)), s.del && `delkörning: ${s.del}, övriga ur baslinjen`)]);
    k.push(['Golden: fel namn', s.fel, g.forra ? g.forra.fel : '', '', 'mål 0']);
    if (g.bas) k.push(['varav ren kamera', `${g.bas.renNamn}/${g.bas.renKort}`, g.forraBas ? `${g.forraBas.renNamn}/${g.forraBas.renKort}` : '', `baslinjen · ${g.bas.fil.h}`, '']);
    if (g.bas && g.bas.namn !== s.namn) k.push(['Golden: sparad baslinje', `${g.bas.namn}/119`, '', `${kortTid(g.bas.fil.t)} · ${g.bas.fil.h}`, 'senaste körningen är inte sparad som baslinje']);
    if (g.gren) k.push(['Golden på en gren', `${g.gren.namn}/119 · fel namn ${g.gren.fel}`, '', `${kortDag(g.gren.dag, g.gren.fran)} · ${g.gren.commit}`, 'gren']);
  } else k.push(['Golden', 'ingen hel körning i historiken', '', '', '']);
  if (medClaude && g.basAi) {
    const b = g.basAi;
    k.push(['Golden med Claude: rätt namn', `${b.namn}/${b.kort}`, '', `${kortTid(b.fil.t)} · ${b.fil.h}`, obs(varnText(kodAndrad(b.fil.h)), `${b.ai || ''} v${b.promptv || '?'}`)]);
    k.push(['Golden med Claude: fel namn', b.fel, '', '', 'mål 0']);
  }
  if (l.hela) {
    if (medClaude) {
      k.push(['Deck golden: rätt', `${l.hela.ratt}/${l.hela.av}`, '', `${l.datum ? kortTid(l.datum, false) : kortDag(l.hela.dag)} · ${l.hela.commit || '–'}`,
        obs(varnText(kodAndrad(l.hela.commit)), `fel namn ${l.hela.fel}`, `exakt ${l.hela.exakt}`, l.ram && `ram ${l.ram.ratt}/${l.ram.av}`)]);
    } else k.push(['Deck golden', 'bara med Claude', '', '', '`/measurements med claude`']);
  }
  sektion('Kameran läser korten', H, k);

  const f = [];
  if (g.bas) {
    f.push(['Golden, videofallen: utlagda med namn', `${g.bas.lagda}/${g.bas.lagdaAv}`, g.forraBas ? `${g.forraBas.lagda}/${g.forraBas.lagdaAv}` : '',
      `${kortTid(g.bas.fil.t)} · ${g.bas.fil.h}`, obs(varnText(kodAndrad(g.bas.fil.h)), 'inom 1 s: kommer')]);
    if (medClaude && g.basAi) f.push(['Videofallen med Claude', `${g.basAi.lagda}/${g.basAi.lagdaAv}`, '', `${kortTid(g.basAi.fil.t)} · ${g.basAi.fil.h}`, '']);
  }
  for (const slag of medClaude ? ['lokal', 'ai'] : ['lokal']) {
    const x = h[slag], namn = slag === 'lokal' ? 'Event test' : 'Event test med Claude';
    if (!x) { f.push([namn, 'ingen körning', '', '', '']); continue; }
    const v = varnText(kodAndradSedan(x.kord));
    f.push([`${namn}: syntes på mattan`, `${x.syntes}/${x.av}`, '', kortTid(x.kord), v]);
    f.push([`${namn}: rätt kort`, `${x.rattKort}/${x.av}`, '', '', '']);
  }
  sektion('Kameran följer spelet (video)', H, f);

  const mt = [];
  if (m) {
    const t = m.d.totalt, fo = m.forra && m.forra.totalt;
    mt.push(['Mat test: utspel med namn', `${t.utspelKort.n}/${t.utspelKort.av}`, fo ? `${fo.utspelKort.n}/${fo.utspelKort.av}` : '',
      `${kortDag(m.d.meta.datum)} · ${m.d.meta.commit}`, varnText(kodAndrad(m.d.meta.commit))]);
    mt.push(['Mat test: hopp', t.hopp + t.hoppSnabba, fo ? fo.hopp + fo.hoppSnabba : '', '', 'mål 0']);
  } else mt.push(['Mat test', 'ingen baslinje', '', '', '']);
  sektion('Mattan visar bordet (inspelade loggar)', H, mt);

  const fa = [];
  if (!lat) fa.push(['Latency', 'ingen fil', '', '', '']);
  else if (!medClaude) fa.push(['Latency', 'bara med Claude', '', kortTid(lat.pass.start), obs(lat.andrad && '⚠ äldre kod', '`/measurements med claude`')]);
  else {
    fa.push(['Latency: släpp → namn, median', lat.namn ? `${lat.namn.median} ms` : '–', '', kortTid(lat.pass.start), obs(lat.andrad && '⚠ äldre kod', 'mål 300 ms')]);
    if (lat.namn) fa.push(['Latency: namn inom 0,3 s', `${lat.namn.inom} av ${lat.namn.n}`, '', '', '']);
  }
  sektion('Fart på riktig telefon', H, fa);

  sektion('Component tests (diagnos, inte grind)', H, dp.map(d => d.sen
    ? [d.namn, d.sen.tal, d.forra ? (d.forra.tal === d.sen.tal ? 'samma' : d.forra.tal) : '', `${kortTid(d.sen.tid)} · ${d.sen.commit || '–'}`, varnText(d.andrad)]
    : [d.namn, 'inte avläst', '', '', d.senFil ? `senaste fil ${path.basename(d.senFil.f)} (${kortTid(d.senFil.t, false, false)})` : '']));

  ut.push(rubrik('Mer om ett verktyg'), '', tabell(['Verktyg', 'Visa detaljer', 'Mät om'], VERKTYG.map(([n, id, kor]) => [n, `\`/measurements ${id}\``, kor])), '');
  ut.push('⚠ äldre kod = koden mätningen beror på har ändrats sedan mätningen. I terminalen: `node dev/measurements/show.cjs [--claude] [verktyg]`.');
  return ut.join('\n');
}

function detaljGolden() {
  const g = golden();
  const ut = [rubrik('Golden'), '', 'Senaste hela körningarna utan Claude (`dev/golden/historik.md`, * = delkörning):', ''];
  ut.push(tabell(['Datum', 'Commit', 'Main', 'Hittade', 'Rätt namn', 'Fel namn', 'Vad'], goldenHistorik().filter(r => !r.ai).slice(-8).map(r =>
    [kortDag(r.dag, r.fran), r.commit || '–', r.main ? 'ja' : 'gren', r.hittade != null ? r.hittade + '/119' : '–', r.namn + '/119' + (r.del ? '*' : ''), r.fel, r.vad.replace(/^[0-9a-f]{7,40}\s*\(?/, '').slice(0, 70)])), '');
  for (const b of [g.bas, g.basAi].filter(Boolean)) {
    ut.push(rubrik(`Fall för fall: ${b.rel.split('/').pop()}`) + ` · ${b.fil.h} · ${kortTid(b.fil.t)} · ${b.ai ? 'med Claude ' + b.ai + ' v' + b.promptv : 'utan Claude'} ${varnText(kodAndrad(b.fil.h))}`.trimEnd(), '');
    ut.push(tabell(['Nivå', 'Mått', 'Värde'], [
      ['Krav', 'fel namn (mål 0)', b.fel],
      ['1', 'hittade av synliga', `${b.hittade}/${b.kort}`],
      ['2', 'rätt namn', `${b.namn}/${b.kort}`],
      ['2', 'varav ren kamera', `${b.renNamn}/${b.renKort}`],
      ['3', `utlagda med namn (de ${b.videoFall} videorna)`, `${b.lagda}/${b.lagdaAv}`],
      ['3', 'fel namn under förloppet', b.felUnder],
    ]), '');
    ut.push(tabell(['Fall', 'Slag', 'Material', 'Kort', 'Hittade', 'Rätt namn', 'Fel', 'Utlagda m. namn'], b.fall.map(e => {
      const video = e.videoLagdaAv != null;
      return [e.id.slice(0, 44), video ? 'video' : 'foto', material(e.id.slice(0, 2)), e.kort, e.hittade, `${e.namn}/${e.kort}`, e.felNamn, video ? `${e.videoLagda}/${e.videoLagdaAv}` : ''];
    })), '');
  }
  ut.push('Mät om: `node dev/golden/kor.cjs` (~25 min) · guide `dev/golden/SNABBGUIDE.md`');
  return ut.join('\n');
}

function detaljMatt() {
  const m = mattprovet();
  if (!m) return 'Mat test: ingen baslinje';
  const ut = [`${rubrik('Mat test')} · baslinjen ${kortDag(m.d.meta.datum)} · kod ${m.d.meta.commit} ${varnText(kodAndrad(m.d.meta.commit))}`.trimEnd(), ''];
  const md = las(m.rel.replace(/\.json$/, '.md'));
  const tab = md.split('\n').filter(l => /^\| (Mått|[A-ZÅÄÖ])/.test(l) && !/^\| (Fall|Kod) /.test(l) && l.split('|').length > 6);
  const huvud = tab.findIndex(l => l.startsWith('| Mått'));
  if (huvud >= 0) tab.splice(huvud + 1, 0, '|' + '---|'.repeat(tab[huvud].split('|').length - 2));
  ut.push(...tab, '');
  if (m.forra) ut.push(`Förra baslinjen: ${kortDag(m.forra.meta.datum)}, kod ${m.forra.meta.commit}, utspel med namn ${m.forra.totalt.utspelKort.n}/${m.forra.totalt.utspelKort.av}.`, '');
  ut.push('Mät om: `node dev/mattest/kor.cjs --jamfor` (~25 s) · ny baslinje `--spara` · guide `dev/mattest/LÄS-MIG.md`');
  return ut.join('\n');
}

function detaljHandelse() {
  const h = handelseprovet();
  const ut = [rubrik('Event test') + ' · Game 22/9, det digitala bordet mot händelselistan', ''];
  for (const [slag, rub] of [['lokal', 'Utan Claude'], ['ai', 'Med Claude']]) {
    const x = h[slag];
    if (!x) { ut.push(`${rub}: ingen körning`, ''); continue; }
    ut.push(`${rubrik(rub)} · körd ${kortTid(x.kord)} ${varnText(kodAndradSedan(x.kord))} · \`${x.rel}\``.replace('  ', ' '), '', x.typer, '');
  }
  ut.push('Mät om: `node dev/eventtest/kor.cjs` och sedan `node dev/eventtest/jamfor.cjs` (~25 min). Kräver passets video i `dev/material/inspelningar/`.');
  return ut.join('\n');
}

function detaljLek() {
  const l = lekgolden();
  const ut = [`${rubrik('Deck golden')} · bara med Claude · senaste baslinjen ${l.datum ? kortTid(l.datum, false) : '–'}`, ''];
  const rader = ['hela', 'ram'].filter(k => l[k]).map(k => { const x = l[k]; return [k, `${x.ratt}/${x.av}`, x.fel, x.exakt, x.modell, x.commit || '–', varnText(kodAndrad(x.commit))]; });
  ut.push(tabell(['Väg', 'Rätt', 'Fel namn', 'Exakt rätt lek', 'Modell', 'Commit', 'Obs'], rader), '');
  for (const k of ['hela', 'ram']) if (l[k] && l[k].vad) ut.push(`- ${k}: ${l[k].vad.slice(0, 160)}`);
  ut.push('', 'hela = filväljaren (hela fotot), ram = kamerans ram. Per set: `dev/lekgolden/senaste.json`.');
  ut.push('Mät om: `node dev/lekgolden/kor.cjs` (kostar Claude; sparade svar gör en omkörning gratis)');
  return ut.join('\n');
}

function detaljLatens() {
  const lat = latens();
  if (!lat) return 'Latency: ingen fil';
  return [`${rubrik('Latency')} · ${lat.pass.f} · ${kortTid(lat.pass.start)}${lat.andrad ? ' · ⚠ äldre kod' : ''}`, '',
    'Bara med Claude (riktigt pass, telefonen frågar Claude). Mål: namn 0,3 s efter släppet.', '',
    'Från att handen släpper (ms):', '', lat.del.replace(/(\|)\n(?!\|)/, '$1\n\n'), '',
    `Hela rapporten: \`node dev/latens/analys.cjs dev/latens/${lat.pass.f}\``,
    'Mät om: öppna appen med `?debug`, kameradialogen → *Latency*, spela och spara filen.'].join('\n');
}

function detaljComponents() {
  const ut = [rubrik('Component tests') + ' · diagnos, inte grind', ''];
  ut.push(tabell(['Component test', 'Senaste tal', 'Mätt', 'Obs', 'Kör'], delprov().map(d => [
    d.namn, d.sen ? d.sen.tal : 'inte avläst', d.sen ? `${kortTid(d.sen.tid)} · ${d.sen.commit || '–'}` : '',
    d.sen ? varnText(d.andrad) : d.senFil ? `senaste fil ${path.basename(d.senFil.f)} (${kortTid(d.senFil.t, false, false)})` : '', '`' + d.kor + '`',
  ])), '');
  ut.push(`⚠ räknas per test mot de filer det beror på: ${DELPROV.map(d => `${d.namn} → ${d.kod.join(', ')}`).join('; ')}.`, '');
  ut.push(`Registrera ett nytt tal: \`node dev/measurements/show.cjs --register <${DELPROV.map(d => d.id).join('|')}> "<tal>" [--source "<kommando>"] [--note "<text>"]\``);
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

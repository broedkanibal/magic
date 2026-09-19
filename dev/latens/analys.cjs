// Latensrapporten som tabeller (MES-242). Kör:
//   node dev/latens/analys.cjs dev/latens/latens-*.json
// Läser en eller flera rapporter ur Latency-panelens "Save report" och
// skriver per pass: telefonen, tiderna från att handen släpper, det gamla
// måttet (från telefonens beslut), namnets vägar och läsningens delar, och
// målen i MES-237 med ja / nej / omätt. Summan räknas om ur raderna med
// samma kod som appen (LATENSSUMMAN i index.html), så gamla rapporter
// (v1, före MES-242) går också: där är de nya måtten omätta.
// .cjs eftersom package.json säger "type": "module".
'use strict';
const fs = require('fs'), path = require('path');
const filer = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!filer.length) { console.error('Användning: node dev/latens/analys.cjs <latens-….json> [fler …]'); process.exit(2); }

/* Summan ur index.html, från blockets början till slutraden. */
const src = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const a = src.indexOf('const LATENS_HANDELSER'), b = src.indexOf('/* ── slut: LATENSSUMMAN ── */');
if (a < 0 || b < 0) throw new Error('hittar inte LATENSSUMMAN i index.html');
const { latensSumma, latensMal } = new Function(src.slice(a, b) + '\nreturn { latensSumma, latensMal };')();

const NAMN = { syns: 'något syns (skugga eller namn)', skugga: 'skugga', namn: 'namn', tap: 'tap', lage: 'flytt', borta: 'borta' };
const ms = v => v == null ? '–' : String(Math.round(v));
const pr = v => v == null ? '–' : Math.round(v * 100) + ' %';
const tabell = (rub, rader) => [`| ${rub.join(' | ')} |`, `|${rub.map(() => '---').join('|')}|`, ...rader.map(r => `| ${r.join(' | ')} |`)].join('\n');
const statRad = (namn, st, medAndel) => [namn, st ? st.n : 0, ms(st && st.median), ms(st && st.p90), ms(st && st.p95)].concat(medAndel ? [pr(st && st.inom300)] : []);
function bildlage(d) {
  const b = d.bildlage || [];
  if (!b.length) return 'bildläget okänt';
  const t = b.map(x => `${x.lage === '1080p30' ? '1080p · 30 fps' : '4K · 15 fps'}${x.fps ? ` (${x.fps} fps)` : ''}`).join(' → ');
  return b.length > 1 ? t + ' — BYTTES UNDER PASSET, jämför inte' : t;
}
function telefon(d) {
  const t = d.telefon;
  if (!t) return 'okänd (rapporten är äldre än MES-242; ua i filen är datorns)';
  const ua = t.ua || 'okänd', m = ua.match(/iPhone OS ([\d_]+)|Android ([\d.]+)[^)]*?; ([^;)]+)\)/);
  const kort = /iPhone/.test(ua) ? `iPhone, iOS ${(m && m[1] || '?').replace(/_/g, '.')}` : /Android/.test(ua) ? `Android ${m && m[2] || '?'}${m && m[3] ? ', ' + m[3].trim() : ''}` : ua.slice(0, 60);
  const st = t.steg ? `${t.steg.median} ms (p95 ${t.steg.p95}, ${t.steg.n} steg)` : '–';
  const bat = t.batteri ? `${t.batteri.start.niva} → ${t.batteri.stopp.niva} %${t.batteri.stopp.laddar ? ' (laddar)' : ''}` : '– (Safari ger inte batteriet)';
  return `${kort} · modellen ${t.modell && t.modell.length ? t.modell.join(' → ') : '–'} · stegtid ${st} · batteri ${bat}`;
}

const pass = [];
for (const f of filer) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const rader = d.rader || [];
  const S = latensSumma(rader), M = latensMal(S);
  const min = d.stoppad && d.start ? ((d.stoppad - Date.parse(d.start)) / 60000).toFixed(1).replace('.', ',') + ' min' : '?';
  const nya = rader.some(x => 'fran_slapp' in x);
  pass.push({ f: path.basename(f), S, bild: bildlage(d) });
  const ut = [];
  ut.push(`\n## ${path.basename(f)}`);
  ut.push(`${bildlage(d)} · ${min} · rapport v${d.v || 1} · ${rader.length} rader · klocka ${d.klocka ? `±${Math.round(d.klocka.rtt / 2)} ms (${d.klocka.pingar} pingar)` : 'osynkad'}`);
  ut.push(`Telefonen: ${telefon(d)}`);
  if ((d.halsa || []).some(h => h.problem)) ut.push(`Hälsokollen under passet: ${[...new Set(d.halsa.filter(h => h.problem).map(h => h.problem))].join(' | ')}`);

  ut.push(`\n### Från att handen släpper (ms)${nya ? '' : ' — OMÄTT: rapporten saknar rörelsens slut (äldre än MES-242)'}`);
  ut.push(tabell(['händelse', 'n', 'median', 'p90', 'p95', 'inom 0,3 s'],
    ['syns', 'skugga', 'namn', 'tap', 'lage', 'borta'].map(k => statRad(NAMN[k], S[k] && S[k].fran_slapp, true))));
  if (S.namn && S.namn.fore_slapp != null) ut.push(`Namn klart före släpp: ${pr(S.namn.fore_slapp)} · över 2 s: ${pr(S.namn.over2s)}`);

  ut.push('\n### Från telefonens beslut till ritat (ms) — det gamla måttet, väntereglerna ingår inte');
  ut.push(tabell(['händelse', 'n', 'median', 'p90', 'p95'], ['skugga', 'namn', 'tap', 'lage', 'borta'].map(k => statRad(NAMN[k], S[k] && S[k].hela))));

  const N = S.namn || {};
  ut.push('\n### Namnet');
  ut.push(tabell(['mått (ms)', 'n', 'median', 'p90', 'p95'], [
    statRad('från att spåret hittades', N.fran_hittat), statRad('från stilla', N.fran_stilla),
    statRad('väntan: släpp → första läsningen', N.lasning && N.lasning.vantan), statRad('kö: stilla → första läsningen', N.lasning && N.lasning.ko),
    statRad('läsningarna, summa', N.lasning && N.lasning.las), statRad('– bildmodellen', N.lasning && N.lasning.modell),
    statRad('– ORB (och Matcher)', N.lasning && N.lasning.orb), statRad('– väntan på titelraden', N.lasning && N.lasning.titelVant),
    statRad('– titelraden vänd', N.lasning && N.lasning.vand), statRad('(titelradens egen tid, parallellt)', N.lasning && N.lasning.titel),
    statRad('läsningar per kort (antal)', N.lasning && N.lasning.antal), statRad('Claude: frågan → namnet', N.lasning && N.lasning.fraga_till_namn),
    statRad('Claude: svarstid', N.lasning && N.lasning.ai)]));
  const vagar = Object.entries(N.vag || {});
  if (vagar.length) ut.push('\n' + tabell(['väg', 'kort', 'andel', 'median från släpp', 'p95'], vagar.map(([v, x]) => [v, x.n, pr(x.andel), ms(x.fran_slapp.median), ms(x.fran_slapp.p95)])));

  ut.push('\n### Målen (MES-237), räknat från att handen släpper');
  const MAL = { syns: 'Något syns ≤ 0,3 s (median)', tap: 'Tap ≤ 0,3 s (median)', lage: 'Flytt ≤ 0,3 s (median)', borta: 'Borta ≤ 0,3 s (median)',
                namn_median: 'Namn ≤ 0,3 s (median)', namn_p95: 'Namn, 95 % ≤ 0,6 s', namn_tak: 'Namn, inget över 2 s' };
  ut.push(tabell(['mål', 'n', 'värde (ms)', 'svar'], M.map(r => [MAL[r.id] || r.mal, r.n, ms(r.varde), r.svar])));
  console.log(ut.join('\n'));
}
if (pass.length > 1) {
  console.log('\n## Passen bredvid varandra — median från släpp (ms), inom 0,3 s i parentes; – = omätt');
  console.log(tabell(['händelse'].concat(pass.map(p => `${p.f.replace(/^latens-|\.json$/g, '')} (${p.bild})`)),
    ['syns', 'skugga', 'namn', 'tap', 'lage', 'borta'].map(k => [NAMN[k]].concat(pass.map(p => { const st = p.S[k] && p.S[k].fran_slapp; return st && st.n ? `${ms(st.median)} (${pr(st.inom300)})` : '–'; })))));
  console.log('\n## …och från telefonens beslut (ms), det gamla måttet');
  console.log(tabell(['händelse'].concat(pass.map(p => p.f.replace(/^latens-|\.json$/g, ''))),
    ['namn', 'tap', 'lage', 'borta'].map(k => [NAMN[k]].concat(pass.map(p => { const st = p.S[k] && p.S[k].hela; return st && st.n ? `${ms(st.median)} · p90 ${ms(st.p90)}` : '–'; })))));
}

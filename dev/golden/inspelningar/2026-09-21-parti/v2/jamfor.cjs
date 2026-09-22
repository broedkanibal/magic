#!/usr/bin/env node
// Jämför facit (tabell.tsv) ruta för ruta: mattan mot det digitala bordet.
// Mätverktyg för partiet 2026-09-21, inte appkod. Läser v2/tabell.tsv och
// skriver v2/jamforelse.tsv + v2/jamforelse.md. Kör: node jamfor.cjs [tabell.tsv]
'use strict';
const fs = require('fs');
const path = require('path');

const har = __dirname;
const inFil = process.argv[2] || path.join(har, 'tabell.tsv');
const rader = fs.readFileSync(inFil, 'utf8').split(/\r?\n/).filter(r => r.trim() !== '');
const huvud = rader[0].split('\t');
const kol = n => huvud.indexOf(n);
const iRuta = kol('ruta'), iKlocka = kol('klocka'), iX = kol('x'), iLage = kol('lage'),
      iHog = kol('hog'), iKom = kol('kommentar');
if ([iRuta, iKlocka, iX, iLage, iHog, iKom].some(i => i < 0)) {
  console.error('tabell.tsv saknar en kolumn; huvud: ' + huvud.join(' | '));
  process.exit(1);
}

// Samla per ruta
const perRuta = new Map();
for (const rad of rader.slice(1)) {
  const c = rad.split('\t');
  const ruta = Number(c[iRuta]);
  if (!Number.isFinite(ruta)) continue;
  if (!perRuta.has(ruta)) perRuta.set(ruta, { ruta, klocka: c[iKlocka] || '', kort: [], graveyard: null, digitalt: null, hand: null });
  const p = perRuta.get(ruta);
  const kom = (c[iKom] || '').trim();
  const x = (c[iX] || '').trim();
  if (/^digitalt:/i.test(kom)) { p.digitalt = kom; continue; }
  if (/^hand:/i.test(kom)) { p.hand = kom.replace(/^hand:\s*/i, '').trim(); continue; }
  if (/^graveyard/i.test(kom) && x === '-') { p.graveyard = kom; continue; }
  if (x === '-' && kom === '') continue;
  p.kort.push({ lage: (c[iLage] || '').trim(), hog: (c[iHog] || '').trim(), synligt: (c[kol('synligt')] || '').trim() });
}

// Plocka siffror ur digitalt-raden
function dig(s, nyckel) {
  if (!s) return null;
  const m = s.match(new RegExp('\\b' + nyckel + '=(\\d+|\\?)'));
  if (!m) return null;
  return m[1] === '?' ? null : Number(m[1]);
}
function fysGraveyard(s) {
  if (!s) return null;
  const m = s.match(/graveyard\s+(\d+)/i);
  return m ? Number(m[1]) : null;
}

const ut = [];
for (const p of [...perRuta.values()].sort((a, b) => a.ruta - b.ruta)) {
  const fys_kort = p.kort.length;
  const fys_tappade = p.kort.filter(k => /^tappad/i.test(k.lage)).length;
  const fys_osakra = p.kort.filter(k => /^os[aä]ker/i.test(k.lage)).length;
  const fys_hogar = new Set(p.kort.map(k => k.hog).filter(h => h && h !== '-')).size;
  const d = p.digitalt;
  const dig_kort = dig(d, 'kort'), dig_tappade = dig(d, 'tappade');
  const granskning = dig(d, 'granskning'), cantsee = dig(d, 'cantsee');
  const graveyard = dig(d, 'graveyard'), library = dig(d, 'library');
  ut.push({
    ruta: p.ruta, klocka: p.klocka,
    fys_kort, fys_tappade, fys_osakra, fys_hogar, fys_graveyard: fysGraveyard(p.graveyard),
    dig_kort, dig_tappade, granskning, cantsee, graveyard, library,
    diff_kort: dig_kort == null ? null : dig_kort - fys_kort,
    diff_tappade: dig_tappade == null ? null : dig_tappade - fys_tappade,
    hand: p.hand || '?',
    saknar_digitalt: d ? '' : 'SAKNAS',
  });
}

// jamforelse.tsv
const kolumner = ['ruta', 'klocka', 'fys_kort', 'fys_tappade', 'fys_osakra', 'fys_hogar', 'fys_graveyard',
  'dig_kort', 'dig_tappade', 'granskning', 'cantsee', 'graveyard', 'library',
  'diff_kort', 'diff_tappade', 'hand', 'saknar_digitalt'];
const v = x => (x == null ? '' : String(x));
fs.writeFileSync(path.join(har, 'jamforelse.tsv'),
  kolumner.join('\t') + '\n' + ut.map(r => kolumner.map(k => v(r[k])).join('\t')).join('\n') + '\n');

// Sammanfattning
const tal = a => a.filter(x => typeof x === 'number' && Number.isFinite(x));
const median = a => { const s = tal(a).sort((x, y) => x - y); if (!s.length) return null; const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const varst = a => { const s = tal(a); if (!s.length) return null; return s.reduce((b, x) => Math.abs(x) > Math.abs(b) ? x : b, 0); };
const andel = (a, f) => { const s = a.filter(r => r != null); return s.length ? `${s.filter(f).length}/${s.length}` : '–'; };
const n = ut.length;
const forsta = ut[0], sista = ut[n - 1];
const rutorMedTapp = ut.filter(r => r.fys_tappade > 0);
const speglade = rutorMedTapp.filter(r => (r.dig_tappade || 0) > 0);

const md = [];
md.push('# Jämförelsen: mattan mot det digitala bordet, partiet 2026-09-21');
md.push('');
md.push(`Ur \`tabell.tsv\` (${n} rutor, ${forsta ? forsta.ruta : '?'}–${sista ? sista.ruta : '?'}, var 10:e sekund). Skript: \`jamfor.cjs\`. Skrivet ${new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' }).slice(0, 16)}.`);
md.push('');
md.push('## Siffrorna');
md.push('');
md.push('| Mått | Värde |');
md.push('|---|---|');
md.push(`| rutor | ${n} |`);
md.push(`| rutor utan digitalt-rad | ${ut.filter(r => r.saknar_digitalt).length} |`);
md.push(`| \`diff_kort\` (digitalt − fysiskt), median | ${v(median(ut.map(r => r.diff_kort)))} |`);
md.push(`| \`diff_kort\`, värsta | ${v(varst(ut.map(r => r.diff_kort)))} (ruta ${(ut.find(r => r.diff_kort === varst(ut.map(q => q.diff_kort))) || {}).ruta || '–'}) |`);
md.push(`| \`diff_tappade\` (digitalt − fysiskt), median | ${v(median(ut.map(r => r.diff_tappade)))} |`);
md.push(`| \`diff_tappade\`, värsta | ${v(varst(ut.map(r => r.diff_tappade)))} (ruta ${(ut.find(r => r.diff_tappade === varst(ut.map(q => q.diff_tappade))) || {}).ruta || '–'}) |`);
md.push(`| rutor med tappade kort på mattan | ${rutorMedTapp.length} av ${n} |`);
md.push(`| … av dem med minst ett tappat kort på det digitala bordet | ${speglade.length} av ${rutorMedTapp.length} |`);
md.push(`| fysiskt tappade kort totalt (alla rutor) | ${tal(ut.map(r => r.fys_tappade)).reduce((a, b) => a + b, 0)} |`);
md.push(`| digitalt tappade kort totalt (alla rutor) | ${tal(ut.map(r => r.dig_tappade)).reduce((a, b) => a + b, 0)} |`);
md.push(`| rutor med \`lage\` = osäker på minst ett kort | ${ut.filter(r => r.fys_osakra > 0).length} av ${n} |`);
md.push(`| andel rutor med \`granskning\` > 0 | ${andel(ut.map(r => r.granskning), x => x > 0)} |`);
md.push(`| andel rutor med \`cantsee\` > 0 | ${andel(ut.map(r => r.cantsee), x => x > 0)} |`);
md.push(`| rutor med hand i bild | ${ut.filter(r => /^ja/i.test(r.hand)).length} av ${n} |`);
md.push('');
md.push('## Library mot kort som syns');
md.push('');
md.push('`library` (siffran under högen) ska sjunka lika mycket som `fys_kort + graveyard` stiger, om varje kort som lämnade leken ligger på mattan eller i graveyard. Skillnaden mellan raderna är kort som är någon annanstans: i handen, eller räknade fel.');
md.push('');
md.push('| ruta | klocka | library | fys_kort | graveyard (dig) | fys_kort + graveyard | library + fys_kort + graveyard |');
md.push('|---|---|---|---|---|---|---|');
for (const r of ut) {
  const g = r.graveyard == null ? r.fys_graveyard : r.graveyard;
  const summa = (r.library == null || g == null) ? null : r.library + r.fys_kort + g;
  md.push(`| ${r.ruta} | ${r.klocka} | ${v(r.library)} | ${r.fys_kort} | ${v(g)} | ${g == null ? '' : r.fys_kort + g} | ${v(summa)} |`);
}
md.push('');
md.push('## Per ruta');
md.push('');
md.push('| ruta | klocka | fys kort | fys tappade | fys högar | dig kort | dig tappade | diff kort | diff tappade | granskning | cantsee | hand |');
md.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of ut) {
  md.push(`| ${r.ruta} | ${r.klocka} | ${r.fys_kort} | ${r.fys_tappade}${r.fys_osakra ? ` (+${r.fys_osakra} osäkra)` : ''} | ${r.fys_hogar} | ${v(r.dig_kort)} | ${v(r.dig_tappade)} | ${v(r.diff_kort)} | ${v(r.diff_tappade)} | ${v(r.granskning)} | ${v(r.cantsee)} | ${r.hand} |`);
}
md.push('');
md.push('## Rutor med tappade kort på mattan');
md.push('');
if (!rutorMedTapp.length) md.push('Inga rutor har ett kort med `lage` = tappad i facit.');
else {
  md.push('| ruta | fys tappade | dig tappade | speglat? |');
  md.push('|---|---|---|---|');
  for (const r of rutorMedTapp) md.push(`| ${r.ruta} | ${r.fys_tappade} | ${v(r.dig_tappade)} | ${(r.dig_tappade || 0) > 0 ? 'ja' : 'nej'} |`);
}
md.push('');
fs.writeFileSync(path.join(har, 'jamforelse.md'), md.join('\n'));
console.log(`skrev jamforelse.tsv (${n} rutor) och jamforelse.md`);

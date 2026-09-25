#!/usr/bin/env node
/* Spegelläget: granskningen över tid (MES-294, beslut 4) — "N cards to fill
   in", som v2-facit för partiet 2026-09-21 läste av skärmen, men på ett pass
   som GÅR att spela upp. Syskon till antal.cjs och tappade.cjs.

   Kör:  node dev/spegelfacit/jamfor.cjs --korning <logg.json> --json <bord.json> [--html <index.html>]
         node dev/spegelfacit/granskning.cjs <bord.json> [--steg 10] [--poster] [--json ut.json]

   Posterna: varje granskningspost som skapades under passet (en post som tas
   bort och läggs igen för samma spår räknas två gånger — det är två gånger
   spelaren ser den komma). För varje post: namnet den gissar (cands[0]) och
   om ett kort med det namnet redan låg på bordet när den kom — v2:s fråga
   "Ligger det kortet redan på bordet?" — och i så fall VAR:
     samma plats  postens spår täcker kortets spår (en tredjedel av det
                  mindre, som SAMMA_KORT_TACKNING i index.html) i bordet
                  telefonen skickade just då — spärren i avstamBord är
                  byggd för just det fallet;
     nedtonat     kortet är nedtonat (kameran tappade det);
     annan plats  kortet ligger bundet någon annanstans (flyttat, eller ett
                  exemplar till).
   Kön: antalet poster samplat var --steg sekund från första utspelet till
   facits "slut" (v2: var tionde sekund), hur många rutor den är tom, och
   postsekunder (antal poster × tid, hela passet).

   Ett MÅTT, inget prov: slutkod 0. .cjs eftersom package.json säger "type": "module". */
'use strict';
const fs = require('fs'), path = require('path');
const { PASS_FORVAL, lasFacit } = require('./facit.cjs');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const JSONFIL = process.argv[2];
if (!JSONFIL || JSONFIL.startsWith('--')) { console.error('Användning: node dev/spegelfacit/granskning.cjs <jamfor --json-fil> [--steg 10] [--poster] [--json ut.json]'); process.exit(2); }
const STEG = +arg('--steg', 10);
const TACKNING = 0.3;   // SAMMA_KORT_TACKNING i index.html
const J = JSON.parse(fs.readFileSync(JSONFIL, 'utf8'));
if (!J.logg) { console.error(`${JSONFIL} saknar loggens sökväg (fältet logg) — kör om jamfor.cjs med --json`); process.exit(2); }
const R = JSON.parse(fs.readFileSync(J.logg, 'utf8'));
const logg = Array.isArray(R) ? R : (R.resultat ? R.resultat.bordLogg : R.bordLogg);
const h = lasFacit(arg('--pass', J.pass || PASS_FORVAL)).slice().sort((a, b) => a.t - b.t);
const t0 = h.find(r => r.handelse === 'spelar').t, slut = (h.find(r => r.handelse === 'slut') || h[h.length - 1]).t;

/* Telefonens senaste bord vid tiden s (hjärtslaget och nådtimern spelar upp det senaste). */
const radVid = s => { let r = null; for (const x of logg) { if (x.s <= s + 1e-9) r = x; else break; } return r; };
const tack = (a, b) => {
  const iw = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), ih = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return iw <= 0 || ih <= 0 ? 0 : iw * ih / Math.max(1e-9, Math.min(a.w * a.h, b.w * b.h));
};
const paMattan = c => c.zon !== 'grav' && c.zon !== 'exil';

const poster = [], sedda = new Set();
for (const b of J.bilder) for (const q of b.fragor) {
  if (sedda.has(q.id)) continue;
  sedda.add(q.id);
  const r = radVid(b.s), sp = id => r ? (r.spar || []).find(u => u.id === id) : null;
  const t = sp(q.spar);
  const med = b.kort.filter(c => paMattan(c) && c.namn === q.namn);
  const dar = med.map(c => {
    if (c.lyft) return 'nedtonat';
    const u = c.spar != null ? sp(c.spar) : null;
    return u && t && u.w != null && t.w != null && tack(u, t) >= TACKNING ? 'samma plats' : 'annan plats';
  });
  const var_ = dar.includes('samma plats') ? 'samma plats' : dar.includes('annan plats') ? 'annan plats' : dar.includes('nedtonat') ? 'nedtonat' : null;
  poster.push({ s: b.s, id: q.id, spar: q.spar, namn: q.namn, overTak: !!q.overTak, redan: var_, sparNamn: t ? t.namn : null, sparTillstand: t ? t.tillstand : null });
}
/* Kön över tid. */
const bildVid = s => { let x = null; for (const b of J.bilder) { if (b.s <= s) x = b; else break; } return x; };
const rader = [];
for (let t = Math.ceil(t0 / STEG) * STEG; t <= slut; t += STEG) { const b = bildVid(t); rader.push({ t, poster: b ? b.fragor.length : 0 }); }
let postSek = 0;
for (let i = 0; i < J.bilder.length; i++) {
  const b = J.bilder[i], nasta = J.bilder[i + 1];
  const fran = Math.max(b.s, t0), till = Math.min(nasta ? nasta.s : slut, slut);
  if (till > fran) postSek += b.fragor.length * (till - fran);
}
const med = l => { const s = l.slice().sort((a, b) => a - b); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const iPasset = poster.filter(p => p.s >= t0 && p.s <= slut);
const rakna = l => ({ poster: l.length, redan: l.filter(p => p.redan).length, sammaPlats: l.filter(p => p.redan === 'samma plats').length, annanPlats: l.filter(p => p.redan === 'annan plats').length, nedtonat: l.filter(p => p.redan === 'nedtonat').length, overTak: l.filter(p => p.overTak).length });
const ut = {
  kalla: J.kalla, html: J.html || 'index.html', rutor: rader.length, steg: STEG, fran: t0, till: slut,
  hela: rakna(poster), passet: rakna(iPasset),
  ko: { median: med(rader.map(r => r.poster)), max: Math.max(...rader.map(r => r.poster)), tomma: rader.filter(r => !r.poster).length, postSekunder: +postSek.toFixed(1) },
  poster, rader
};
const text = x => `${x.poster} poster, varav ${x.redan} gissar ett kort som redan ligger på bordet (samma plats ${x.sammaPlats}, annan plats ${x.annanPlats}, nedtonat ${x.nedtonat})${x.overTak ? `; ${x.overTak} över lekens antal` : ''}`;
console.log(`${J.kalla} (${ut.html}): granskningen, ${rader.length} rutor var ${STEG}:e s (${t0}–${slut} s)`);
console.log(`  hela loggen: ${text(ut.hela)}`);
console.log(`  i passet (${t0}–${slut} s): ${text(ut.passet)}`);
console.log(`  kön: median ${ut.ko.median}, som mest ${ut.ko.max}, tom i ${ut.ko.tomma}/${rader.length} rutor; ${ut.ko.postSekunder} postsekunder`);
if (process.argv.includes('--poster')) for (const p of poster) console.log(`  ${p.s.toFixed(2).padStart(7)} s  post ${p.id} spår ${p.spar} "${p.namn || '–'}"${p.overTak ? ' (över lekens antal)' : ''}${p.redan ? ` — ligger redan på bordet: ${p.redan}` : ''}`);
if (arg('--json', '')) fs.writeFileSync(path.resolve(arg('--json')), JSON.stringify(ut, null, 1) + '\n');

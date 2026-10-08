#!/usr/bin/env node
/* Spegelläget: tappade kort på mattan mot tappade kort på det digitala bordet,
   över tid (MES-293, beslut 1) — samma mått som v2-facit för partiet
   2026-09-21 (diff_tappade), men på ett pass som GÅR att spela upp.

   Kör:  node dev/spegelfacit/jamfor.cjs --korning <logg.json> --json <bord.json>
         node dev/spegelfacit/tappade.cjs <bord.json> [--pass …] [--steg 10] [--rader] [--json ut.json]

   Mattan: antalet tappade kort räknas ur händelsefacit (tappar +1, otappar −1,
   tar_bort av ett tappat kort −1, per namn). Bordet: kort på mattan (inte
   graveyard eller exile) som ligger tappade, nedtonade medräknade — det v2
   läste av skärmen. Samplas var --steg sekund från första utspelet till
   facits "slut", som v2 samplade var tionde sekund.

   Läs med v2:s varning i minnet: samma ANTAL betyder inte samma kort — ett
   falskt tappat kort kan råka jämna ut ett missat. Kortet för kortet står i
   jamfor.cjs (raderna tappar/otappar, och "utöver facit").

   Ett MÅTT, inget prov: slutkod 0. .cjs eftersom package.json säger "type": "module". */
'use strict';
const fs = require('fs'), path = require('path');
const { PASS_FORVAL, lasFacit } = require('./facit.cjs');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const JSONFIL = process.argv[2];
if (!JSONFIL || JSONFIL.startsWith('--')) { console.error('Användning: node dev/spegelfacit/tappade.cjs <jamfor --json-fil> [--pass …] [--steg 10] [--rader]'); process.exit(2); }
const STEG = +arg('--steg', 10);
const J = JSON.parse(fs.readFileSync(JSONFIL, 'utf8'));
const h = lasFacit(arg('--pass', J.pass || PASS_FORVAL)).slice().sort((a, b) => a.t - b.t);
const t0 = h.find(r => r.handelse === 'spelar').t, slut = (h.find(r => r.handelse === 'slut') || h[h.length - 1]).t;
function mattan(t) {
  const antal = new Map(), tapp = new Map();
  for (const r of h) {
    if (r.t > t) break;
    const n = r.kort;
    if (r.handelse === 'spelar' || r.handelse === 'grav_till_bord') antal.set(n, (antal.get(n) || 0) + 1);
    if (r.handelse === 'tar_bort') { antal.set(n, Math.max(0, (antal.get(n) || 0) - 1)); tapp.set(n, Math.min(tapp.get(n) || 0, antal.get(n))); }
    if (r.handelse === 'tappar') tapp.set(n, Math.min(antal.get(n) || 0, (tapp.get(n) || 0) + 1));
    if (r.handelse === 'otappar') tapp.set(n, Math.max(0, (tapp.get(n) || 0) - 1));
  }
  let s = 0; for (const v of tapp.values()) s += v; return s;
}
function bordet(t) {
  let b = null; for (const x of J.bilder) { if (x.s <= t) b = x; else break; }
  return b ? b.kort.filter(c => c.zon !== 'grav' && c.zon !== 'exil' && c.tappad).length : 0;
}
const rader = [];
for (let t = Math.ceil(t0 / STEG) * STEG; t <= slut; t += STEG) { const f = mattan(t), d = bordet(t); rader.push({ t, fys: f, dig: d, diff: d - f }); }
const med = l => { const s = l.slice().sort((a, b) => a - b); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const abs = rader.map(r => Math.abs(r.diff));
const varst = rader.reduce((a, r) => Math.abs(r.diff) > Math.abs(a.diff) ? r : a, rader[0]);
const medF = rader.filter(r => r.fys > 0), utanF = rader.filter(r => r.fys === 0);
const ut = {
  kalla: J.kalla, rutor: rader.length, steg: STEG, fran: t0, till: slut,
  diff_median: med(rader.map(r => r.diff)), abs_median: med(abs), abs_medel: +(abs.reduce((a, b) => a + b, 0) / abs.length).toFixed(2),
  varst: { t: varst.t, diff: varst.diff, fys: varst.fys, dig: varst.dig }, exakt: rader.filter(r => r.diff === 0).length,
  fys_summa: rader.reduce((a, r) => a + r.fys, 0), dig_summa: rader.reduce((a, r) => a + r.dig, 0),
  rutor_med_tappat: medF.length, av_dem_tappat_digitalt: medF.filter(r => r.dig > 0).length,
  rutor_utan_tappat: utanF.length, av_dem_anda_tappat_digitalt: utanF.filter(r => r.dig > 0).length, rader
};
console.log(`${J.kalla}: ${rader.length} rutor, var ${STEG}:e s (${t0}–${slut} s)`);
console.log(`  diff_tappade (bordet − mattan): median ${ut.diff_median}, |diff| median ${ut.abs_median}, medel ${ut.abs_medel}, värst ${ut.varst.diff} (${ut.varst.t} s: mattan ${ut.varst.fys}, bordet ${ut.varst.dig}); exakt rätt i ${ut.exakt}/${rader.length}`);
console.log(`  tappade kortrader: mattan ${ut.fys_summa}, bordet ${ut.dig_summa}; rutor med tappat på mattan ${medF.length}, av dem tappat på bordet ${ut.av_dem_tappat_digitalt}; rutor utan tappat på mattan ${utanF.length}, av dem ändå tappat på bordet ${ut.av_dem_anda_tappat_digitalt}`);
if (process.argv.includes('--rader')) for (const r of rader) console.log(`  ${r.t} s\tmattan ${r.fys}\tbordet ${r.dig}\t${r.diff > 0 ? '+' : ''}${r.diff}`);
if (arg('--json', '')) fs.writeFileSync(path.resolve(arg('--json')), JSON.stringify(ut, null, 1) + '\n');

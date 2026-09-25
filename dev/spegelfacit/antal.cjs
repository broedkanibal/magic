#!/usr/bin/env node
/* Spegelläget: antalet kort på mattan mot antalet kort på det digitala
   bordet, över tid (MES-291, beslut 3) — samma mått som v2-facit för partiet
   2026-09-21 (diff_kort), men på ett pass som GÅR att spela upp. Syskon till
   tappade.cjs (MES-293), som räknar tappade kort på samma sätt.

   Kör:  node dev/spegelfacit/jamfor.cjs --korning <logg.json> --json <bord.json>
         node dev/spegelfacit/antal.cjs <bord.json> [--pass …] [--steg 10] [--rader] [--json ut.json]

   Mattan: korten som ligger där enligt händelsefacit (spelar och
   grav_till_bord +1, tar_bort −1; flyttar, tappar och drag ändrar inget).
   Bordet: kort på mattan (inte graveyard eller exile), nedtonade och kort
   som kameran just tappat (väntan, `borta`) medräknade — det v2 läste av
   skärmen, utom platshållarna, som uppspelningen inte ritar. Samplas var
   --steg sekund från första utspelet till facits "slut", som v2 samplade var
   tionde sekund.

   diff_kort = bordet − mattan. Skrivs också utan de nedtonade (v2:s
   "dig − cantsee − fys"): är det nära noll medan diff_kort är stort, är
   överskottet kort som kameran tappat och ingen svarat på.

   Samma ANTAL betyder inte samma kort: ett nytt kort som dubblerar ett annat
   kan jämna ut ett som saknas. Kortet för kortet står i jamfor.cjs.

   Ett MÅTT, inget prov: slutkod 0. .cjs eftersom package.json säger "type": "module". */
'use strict';
const fs = require('fs'), path = require('path');
const { PASS_FORVAL, lasFacit } = require('./facit.cjs');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const JSONFIL = process.argv[2];
if (!JSONFIL || JSONFIL.startsWith('--')) { console.error('Användning: node dev/spegelfacit/antal.cjs <jamfor --json-fil> [--pass …] [--steg 10] [--rader] [--json ut.json]'); process.exit(2); }
const STEG = +arg('--steg', 10);
const J = JSON.parse(fs.readFileSync(JSONFIL, 'utf8'));
const h = lasFacit(arg('--pass', J.pass || PASS_FORVAL)).slice().sort((a, b) => a.t - b.t);
const t0 = h.find(r => r.handelse === 'spelar').t, slut = (h.find(r => r.handelse === 'slut') || h[h.length - 1]).t;
function mattan(t) {
  let n = 0;
  for (const r of h) {
    if (r.t > t) break;
    if (r.handelse === 'spelar' || r.handelse === 'grav_till_bord') n++;
    if (r.handelse === 'tar_bort') n = Math.max(0, n - 1);
  }
  return n;
}
function bordet(t) {
  let b = null; for (const x of J.bilder) { if (x.s <= t) b = x; else break; }
  const pa = b ? b.kort.filter(c => c.zon !== 'grav' && c.zon !== 'exil') : [];
  return { dig: pa.length, ned: pa.filter(c => c.lyft).length, vantar: pa.filter(c => c.borta && !c.lyft).length, fragor: b ? b.fragor.length : 0 };
}
const rader = [];
for (let t = Math.ceil(t0 / STEG) * STEG; t <= slut; t += STEG) {
  const f = mattan(t), d = bordet(t);
  rader.push({ t, fys: f, dig: d.dig, ned: d.ned, vantar: d.vantar, fragor: d.fragor, diff: d.dig - f, diffSynliga: d.dig - d.ned - f });
}
const med = l => { const s = l.slice().sort((a, b) => a - b); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const medel = l => +(l.reduce((a, b) => a + b, 0) / l.length).toFixed(2);
const varst = key => rader.reduce((a, r) => Math.abs(r[key]) > Math.abs(a[key]) ? r : a, rader[0]);
const sammanfatta = key => {
  const abs = rader.map(r => Math.abs(r[key])), v = varst(key);
  return { median: med(rader.map(r => r[key])), abs_median: med(abs), abs_medel: medel(abs), varst: { t: v.t, diff: v[key], fys: v.fys, dig: v.dig, ned: v.ned },
    exakt: rader.filter(r => r[key] === 0).length, inom1: rader.filter(r => Math.abs(r[key]) <= 1).length };
};
const ut = {
  kalla: J.kalla, rutor: rader.length, steg: STEG, fran: t0, till: slut,
  diff_kort: sammanfatta('diff'), diff_synliga: sammanfatta('diffSynliga'),
  nedtonade: { median: med(rader.map(r => r.ned)), medel: medel(rader.map(r => r.ned)), max: Math.max(...rader.map(r => r.ned)), rutor_med: rader.filter(r => r.ned > 0).length },
  vantar: { max: Math.max(...rader.map(r => r.vantar)), rutor_med: rader.filter(r => r.vantar > 0).length },
  rader
};
const rad = (namn, s) => `  ${namn} (bordet − mattan): median ${s.median}, |diff| median ${s.abs_median}, medel ${s.abs_medel}, värst ${s.varst.diff > 0 ? '+' : ''}${s.varst.diff} (${s.varst.t} s: mattan ${s.varst.fys}, bordet ${s.varst.dig}, varav nedtonade ${s.varst.ned}); exakt rätt i ${s.exakt}/${rader.length}, inom ±1 i ${s.inom1}/${rader.length}`;
console.log(`${J.kalla}: ${rader.length} rutor, var ${STEG}:e s (${t0}–${slut} s)`);
console.log(rad('diff_kort', ut.diff_kort));
console.log(rad('utan nedtonade', ut.diff_synliga));
console.log(`  nedtonade på bordet: median ${ut.nedtonade.median}, medel ${ut.nedtonade.medel}, som mest ${ut.nedtonade.max}, i ${ut.nedtonade.rutor_med}/${rader.length} rutor; kort i väntan (kameran tappade dem nyss) i ${ut.vantar.rutor_med}/${rader.length} rutor, som mest ${ut.vantar.max}`);
if (process.argv.includes('--rader')) for (const r of rader) console.log(`  ${r.t} s\tmattan ${r.fys}\tbordet ${r.dig}\tnedtonade ${r.ned}\tväntar ${r.vantar}\t${r.diff > 0 ? '+' : ''}${r.diff}`);
if (arg('--json', '')) fs.writeFileSync(path.resolve(arg('--json')), JSON.stringify(ut, null, 1) + '\n');

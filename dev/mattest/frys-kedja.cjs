#!/usr/bin/env node
/* Fryser partiets bordslogg genom kedjan (parti-kedjan, MES-333) till
   underlag/2026-09-21-kedja-bordlogg.json.gz, och skriver hur telefonens
   bord står sig mot v2-facit — en engångsanalys av strömmen, inget mått i
   uppspelaren.

   Kör:  node dev/mattest/frys-kedja.cjs [spegel-lokal.json] [--start 180] [--ut fil.json.gz] [--bara-analys]

   Förval: dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/spegel-lokal.json,
   körd med dev/eventtest/kor.cjs --video kamera-180-540.mp4 --fran 180
   (dev/eventtest/LÄS-MIG.md). --start är videons start i partiets tid:
   bordsloggen bär videons tid, fall.cjs lägger till start. En logg körd med
   Claude fryses inte (parti-kedjan är utan). .cjs eftersom package.json säger
   "type": "module". */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROT = path.join(__dirname, '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const MED_VARDE = ['--start', '--ut'];
const fri = process.argv.slice(2).filter((a, i, l) => !a.startsWith('--') && !(i > 0 && MED_VARDE.includes(l[i - 1])));
const INN = path.resolve(fri[0] || path.join(ROT, 'dev', 'material', 'inspelningar', '2026-09-21-mes-238-parti-4k15-20min', 'spegel-lokal.json'));
const START = +arg('--start', 180);
const UT = path.resolve(arg('--ut', path.join(__dirname, 'underlag', '2026-09-21-kedja-bordlogg.json.gz')));
const PAR_PX = 60;   // som fall.cjs (KEDJA_PAR_PX) och matt.cjs (NARA_PX)

const J = JSON.parse(fs.readFileSync(INN, 'utf8'));
if (J.ai) { console.error('frys-kedja: loggen är körd med Claude — parti-kedjan är utan'); process.exit(2); }
const m = /(\d+)\s*[×x]\s*(\d+)/.exec(J.resultat.kallStorlek || '');
const B = m ? { w: +m[1], h: +m[2] } : { w: 704, h: 438 };
const L = J.resultat.bordLogg;

/* Telefonens bord mot v2 i var tionde sekund: facits kort paras med spåret
   närmast på samma plats (högst PAR_PX), som i fall.cjs. */
const v2 = new Map();
for (const r of fs.readFileSync(path.join(__dirname, 'underlag', '2026-09-21-v2-tabell.tsv'), 'utf8').split('\n').filter(x => x.trim()).slice(1)) {
  const c = r.split('\t'); if (c[2] === '-') continue;
  (v2.get(+c[0]) || v2.set(+c[0], []).get(+c[0])).push({ x: +c[2] / 100, y: +c[3] / 100, lage: c[4] });
}
const s = { fac: 0, par: 0, spar: 0, tapAv: 0, tapRatt: 0, namn: 0, rutor: 0 };
for (const [ruta, kort] of v2) {
  let bord = null; for (const b of L) { if (b.s + START <= ruta + 1e-6) bord = b; else break; }
  if (!bord) continue;
  s.rutor++;
  const spar = (bord.spar || []).map(t => ({ x: t.vx != null ? t.vx : t.x + t.w / 2, y: t.vy != null ? t.vy : t.y + t.h / 2, t }));
  const par = [];
  kort.forEach((k, i) => spar.forEach((p, j) => { const d = Math.hypot((k.x - p.x) * B.w, (k.y - p.y) * B.h); if (d <= PAR_PX) par.push([d, i, j]); }));
  par.sort((a, b) => a[0] - b[0]);
  const ti = new Set(), tj = new Set();
  for (const [, i, j] of par) {
    if (ti.has(i) || tj.has(j)) continue; ti.add(i); tj.add(j);
    const k = kort[i], t = spar[j].t;
    if (k.lage === 'tappad' || k.lage === 'upprätt') { s.tapAv++; if (!!t.tappad === (k.lage === 'tappad')) s.tapRatt++; }
    if (t.tillstand === 'klar' && t.saker && t.namn) s.namn++;
  }
  s.fac += kort.length; s.par += ti.size; s.spar += spar.length;
}
const ids = new Set(), liv = new Map();
for (const b of L) for (const t of b.spar || []) { ids.add(t.id); const l = liv.get(t.id) || [b.s, b.s]; l[1] = b.s; liv.set(t.id, l); }
const langd = [...liv.values()].map(([a, b]) => b - a).sort((a, b) => a - b);
console.log(`Telefonens bord mot v2 (${s.rutor} rutor, spår högst ${PAR_PX} px från facits kort):`);
console.log(`  facits kort med ett spår på samma plats   ${s.par} av ${s.fac}`);
console.log(`  spår utan kort i facit                     ${s.spar - s.par} av ${s.spar}`);
console.log(`  tappad/upprätt rätt bland de parade        ${s.tapRatt} av ${s.tapAv}`);
console.log(`  säkert namn bland de parade                ${s.namn} av ${s.par}`);
console.log(`  spår i hela körningen                      ${ids.size}, mediantid ${langd[langd.length >> 1].toFixed(1)} s; ${L.length} bord`);
if (process.argv.includes('--bara-analys')) process.exit(0);

const U = {
  kalla: 'dev/eventtest/kor.cjs på dev/material/inspelningar/' + J.pass + '/' + J.facit.video.fil.split('/').pop(),
  pass: J.pass, skapad: J.skapad, ai: J.ai, pool: J.pool, metod: J.metod,
  start: START, upplosning: B,
  video: { sekunder: J.resultat.videoSekunder, langd: J.resultat.videoLangd, takt_ms: J.facit.video.takt_ms },
  grav: J.facit.grav, bib: J.facit.bib, bordLogg: L
};
const buf = zlib.gzipSync(Buffer.from(JSON.stringify(U)), { level: 9 });
fs.writeFileSync(UT, buf);
console.log(`fryst: ${L.length} bord, ${(buf.length / 1024).toFixed(0)} kB → ${path.relative(process.cwd(), UT)} (start ${START}, poolen ${J.pool}, ${B.w} × ${B.h})`);

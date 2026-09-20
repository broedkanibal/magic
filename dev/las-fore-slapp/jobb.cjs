#!/usr/bin/env node
/* Skriver jobbet till klipp.swift: en post per bildruta i varje fönster,
   med ett utsnitt som följer REGIONEN (hand + kort) den rutan.

   Kör: node dev/las-fore-slapp/jobb.cjs <arbetsmapp> <ut.json> [--fore 0.9] [--efter 0.3] [--marg 0.18]

   Utsnittet är regionens låda plus marginal, i den visade bildens andelar.
   Så blir varje klippt ruta liten (några hundra kB i 4K) i stället för hela
   bilden, och hela vägen ner ryms på under en gigabyte. */
'use strict';
const fs = require('fs'), path = require('path');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? +process.argv[i + 1] : d; };
const ARB = process.argv[2], UT = process.argv[3];
if (!ARB || !UT) { console.error('node jobb.cjs <arbetsmapp> <ut.json> [--fore s] [--efter s] [--marg a]'); process.exit(1); }
const FORE = arg('--fore', 0.9), EFTER = arg('--efter', 0.3), MARG = arg('--marg', 0.18);
const R = JSON.parse(fs.readFileSync(path.join(ARB, 'regioner.json'), 'utf8'));
const W = R.bredd, H = R.hojd;
const poster = [];
for (const f of R.fonster) {
  for (const x of f.rutor) {
    const rel = x.t - f.t_slapp;
    if (rel < -FORE || rel > EFTER) continue;
    /* Utan region (inget rör sig ännu): ta kortets slutplats, så att rutan
       ändå finns med i serien. */
    const b = x.r ? x.r.box : f.box;
    const mx = Math.max(6, b.w * MARG), my = Math.max(6, b.h * MARG);
    let x0 = Math.max(0, b.x - mx), y0 = Math.max(0, b.y - my);
    let x1 = Math.min(W, b.x + b.w + mx), y1 = Math.min(H, b.y + b.h + my);
    poster.push({ id: `s${String(f.nr).padStart(2, '0')}-${String(x.i).padStart(6, '0')}`,
                  t: x.t, x: +(x0 / W).toFixed(6), y: +(y0 / H).toFixed(6),
                  w: +((x1 - x0) / W).toFixed(6), h: +((y1 - y0) / H).toFixed(6) });
  }
}
fs.writeFileSync(UT, JSON.stringify({ poster }, null, 1) + '\n');
let mpx = 0; for (const p of poster) mpx += p.w * 3840 * p.h * 2160 / 1e6;
console.log(`${poster.length} rutor, ${mpx.toFixed(0)} Mpx i 4K (~${(mpx * 0.25).toFixed(0)} MB jpeg) → ${UT}`);

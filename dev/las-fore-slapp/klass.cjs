#!/usr/bin/env node
/* Provar bildpunktssorteringen (matta / hud / kort) och skriver en falsk-
   färgad bild att titta på: svart = matta, rött = hud, grönt = kort.

   Kör: node dev/las-fore-slapp/klass.cjs <in.raw> <ut.raw> [mattaMax] [sat] [rb]

   Används för att skruva reglerna i skar.js utan att starta en webbläsare.
   raa.swift gör om jpeg → raw och raw → png. */
'use strict';
const fs = require('fs');
const [IN, UT] = process.argv.slice(2);
const MATTA_MAX = +(process.argv[4] || 60), SAT_MIN = +(process.argv[5] || 0.45), RB_MIN = +(process.argv[6] || 45);
if (!IN || !UT) { console.error('node klass.cjs <in.raw> <ut.raw> [mattaMax] [sat] [rb]'); process.exit(1); }
const d = fs.readFileSync(IN), nl = d.indexOf(10);
const [W, H] = d.slice(0, nl).toString().split(' ').map(Number);
const px = d.slice(nl + 1);
const ut = Buffer.alloc(W * H * 3);
let matta = 0, hud = 0, kort = 0;
for (let i = 0; i < W * H; i++) {
  const r = px[i * 3], g = px[i * 3 + 1], b = px[i * 3 + 2];
  const v = Math.max(r, g, b), mn = Math.min(r, g, b);
  const sat = v ? (v - mn) / v : 0;
  let k;
  if (v < MATTA_MAX) k = 0;
  else if (sat >= SAT_MIN && r - b >= RB_MIN && r >= g && g >= b) k = 1;
  else k = 2;
  if (k === 0) { matta++; }
  else if (k === 1) { hud++; ut[i * 3] = 220; }
  else { kort++; ut[i * 3 + 1] = 220; }
}
fs.writeFileSync(UT, Buffer.concat([Buffer.from(`${W} ${H}\n`), ut]));
const n = W * H;
console.log(`${W}x${H}  matta ${(100 * matta / n).toFixed(1)} %  hud ${(100 * hud / n).toFixed(1)} %  kort ${(100 * kort / n).toFixed(1)} %`);

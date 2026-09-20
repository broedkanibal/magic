#!/usr/bin/env node
/* Vad vidvinkeln (0,5×) gör med kortet: storlek, skärpa och förvrängning
   över bilden. MES-246 fråga 7, underlag till MES-241 och MES-244.

   Kör: node dev/las-fore-slapp/vidvinkel.cjs <arbetsmapp>

     · Kortsidan i bildpunkter per plats i bilden — mätt på varje låda i
       steg-sort.json som har ett korts mått, med lådans mitt som plats.
       Skalas till 4K och 1080p.
     · Skärpan: hur många bildpunkter en kortkant tar på sig att gå från
       mattans nivå till kortets (10–90 %), mätt vågrätt genom kortets mitt
       i den sista stilla rutan. En skarp kant är 1–2 bildpunkter i
       analysbredden; en mjuk kant vid bildens rand är fler.
     · Förvrängningen: kvoten kortsida/långsida per plats. Vidvinkeln gör
       kort vid kanten både mindre och mer snedställda.

   Allt i 360 px analysbredd, och omräknat. Rör inte kamerakedjan. */
'use strict';
const fs = require('fs'), path = require('path');
const ARB = process.argv[2];
if (!ARB) { console.error('node vidvinkel.cjs <arbetsmapp>'); process.exit(1); }
const S = JSON.parse(fs.readFileSync(path.join(ARB, 'steg-sort.json'), 'utf8'));
const F = JSON.parse(fs.readFileSync(path.join(ARB, 'facit.json'), 'utf8'));
const W = F.bredd, H = F.hojd, PX = W * H, N = F.rutor;
const fd = fs.openSync(path.join(ARB, 'gra.bin'), 'r');
const buf = Buffer.allocUnsafe(PX);
const ruta = i => { fs.readSync(fd, buf, 0, PX, Math.max(0, Math.min(N - 1, i)) * PX); return buf; };

const kortlik = s => s.kvot >= 0.66 && s.kvot <= 0.84 && s.stor >= 0.7 && s.stor <= 1.25;
const kort = S.steg.filter(s => s.box && kortlik(s) && s.efter >= 45);
console.log(`${kort.length} lådor med ett korts mått\n`);

/* ── storlek mot plats ───────────────────────────────────────────── */
const cxB = W / 2, cyB = H / 2;
const rader = kort.map(s => {
  const mx = s.box.x + s.box.w / 2, my = s.box.y + s.box.h / 2;
  const r = Math.hypot((mx - cxB) / cxB, (my - cyB) / cyB);   // 0 i mitten, 1 vid kanten
  return { nr: s.nr, mx: Math.round(mx), my: Math.round(my), r: +r.toFixed(2),
           kort: Math.min(s.box.w, s.box.h), lang: Math.max(s.box.w, s.box.h), kvot: s.kvot };
}).sort((a, b) => a.r - b.r);
console.log('Kortsidan mot platsen i bilden (0 = mitten, 1 = hörnet)');
console.log('  avstånd   n   kortsida 360 px   → 4K     → 1080p   kvot (kort/lång)');
for (const [lo, hi] of [[0, 0.35], [0.35, 0.55], [0.55, 0.75], [0.75, 1.5]]) {
  const v = rader.filter(x => x.r >= lo && x.r < hi);
  if (!v.length) continue;
  const m = a => { const b = a.slice().sort((p, q) => p - q); return b[b.length >> 1]; };
  const k = m(v.map(x => x.kort));
  console.log(`  ${lo.toFixed(2)}–${hi === 1.5 ? '1,00+' : hi.toFixed(2)} ${String(v.length).padStart(4)} ${String(k).padStart(15)} ${String(Math.round(k * 3840 / W)).padStart(9)} ${String(Math.round(k * 1920 / W)).padStart(9)}   ${m(v.map(x => x.kvot)).toFixed(2)}`);
}

/* ── skärpan: kortkantens bredd ──────────────────────────────────── */
/* Vågrätt snitt genom kortets mitt i sista stilla rutan: hur många
   bildpunkter tar övergången matta → kort? */
function kantbredd(i, box) {
  const g = ruta(i);
  const y = Math.round(box.y + box.h / 2);
  const x0 = Math.max(2, box.x - 6), x1 = Math.min(W - 3, box.x + box.w + 6);
  const prof = []; for (let x = x0; x <= x1; x++) prof.push(g[y * W + x]);
  if (prof.length < 10) return null;
  const lag = Math.min(...prof.slice(0, 4)), hog = Math.max(...prof);
  if (hog - lag < 25) return null;
  const t10 = lag + 0.1 * (hog - lag), t90 = lag + 0.9 * (hog - lag);
  let a = null, b = null;
  for (let k = 0; k < prof.length; k++) { if (a == null && prof[k] >= t10) a = k; if (a != null && prof[k] >= t90) { b = k; break; } }
  return a != null && b != null ? b - a : null;
}
console.log('\nKortkantens skärpa (bildpunkter från 10 % till 90 % i 360 px bredd)');
console.log('  avstånd   n   kantbredd (median)');
const skarpa = [];
for (const s of kort) {
  const i = Math.round((s.t_stilla + 0.2) * F.fps);
  const b = kantbredd(i, s.box);
  if (b != null) { const rr = rader.find(x => x.nr === s.nr); skarpa.push({ r: rr ? rr.r : 0, b }); }
}
for (const [lo, hi] of [[0, 0.35], [0.35, 0.55], [0.55, 0.75], [0.75, 1.5]]) {
  const v = skarpa.filter(x => x.r >= lo && x.r < hi).map(x => x.b).sort((p, q) => p - q);
  if (!v.length) continue;
  console.log(`  ${lo.toFixed(2)}–${hi === 1.5 ? '1,00+' : hi.toFixed(2)} ${String(v.length).padStart(4)} ${String(v[v.length >> 1]).padStart(18)}`);
}
fs.closeSync(fd);
fs.writeFileSync(path.join(ARB, 'vidvinkel.json'), JSON.stringify({ rader, skarpa }, null, 1) + '\n');
console.log('\nskrivet: ' + path.join(ARB, 'vidvinkel.json'));

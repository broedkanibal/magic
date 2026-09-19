#!/usr/bin/env node
/* Ruta för ruta under kortets väg ner: hur ser REGIONEN ut som detektorn
   skulle få — hand + kort — och när har den ett korts mått?

   Kör: node dev/las-fore-slapp/regioner.cjs <arbetsmapp>

   Arbetar på `gra.bin` i 360 px bredd, samma analysbredd som kameran använder
   (AW_MAX i index.html: videon skalas alltid till 240–360 px innan den
   analyseras, oavsett om den är 4K eller 1080p). Därför gäller allt här lika
   för båda upplösningarna — det är BESKÄRNINGEN som skiljer, inte regionen.

   Per ruta skrivs regionens mått räknade på samma sätt som i kameran
   (andramomenten: lang = 2√3λ₁, kort = 2√3λ₂, vinkel = ½·atan2(2vxy, vxx−vyy)),
   dess fyllnad, spridning och kvot, och domen `kortlik` (inom ±25 % av
   kortreferensen i båda måtten — samma regel som `skuggklar` i kameran).

   Skriver `regioner.json`. Rör inte index.html. */
'use strict';
const fs = require('fs'), path = require('path');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? +process.argv[i + 1] : d; };
const ARB = process.argv[2];
if (!ARB) { console.error('node regioner.cjs <arbetsmapp>'); process.exit(1); }
const TROSKEL = arg('--troskel', 18);        // gråsteg mot bordet-som-det-låg
const MINAREA = arg('--minarea', 60);        // T.minArea i kameran
const F = JSON.parse(fs.readFileSync(path.join(ARB, 'fonster.json'), 'utf8'));
const W = F.bredd, H = F.hojd, PX = W * H, fps = F.fps, kortRef = F.kortRef;
const facit = JSON.parse(fs.readFileSync(path.join(ARB, 'facit.json'), 'utf8'));
const N = facit.rutor;
const fd = fs.openSync(path.join(ARB, 'gra.bin'), 'r');
const buf = Buffer.allocUnsafe(PX);
const ruta = i => { fs.readSync(fd, buf, 0, PX, Math.max(0, Math.min(N - 1, i)) * PX); return buf; };

const tmpF = new Float32Array(PX);
function sudda(src, dst) {
  const K = 2, d = 2 * K + 1;
  for (let y = 0; y < H; y++) { const rad = y * W; let s = 0;
    for (let x = -K; x <= K; x++) s += src[rad + Math.min(W - 1, Math.max(0, x))];
    for (let x = 0; x < W; x++) { tmpF[rad + x] = s / d; s += src[rad + Math.min(W - 1, x + K + 1)] - src[rad + Math.min(W - 1, Math.max(0, x - K))]; } }
  for (let x = 0; x < W; x++) { let s = 0;
    for (let y = -K; y <= K; y++) s += tmpF[Math.min(H - 1, Math.max(0, y)) * W + x];
    for (let y = 0; y < H; y++) { dst[y * W + x] = s / d; s += tmpF[Math.min(H - 1, y + K + 1) * W + x] - tmpF[Math.min(H - 1, Math.max(0, y - K)) * W + x]; } }
}
/* Morfologi som i kameran: stäng hål (dilatera, erodera) så att en ram eller
   ett mörkt konstverk inte delar kortet i flera regioner. */
function dilatera(m, ut, r) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = 0;
    for (let dy = -r; dy <= r && !v; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue;
      for (let dx = -r; dx <= r; dx++) { const xx = x + dx; if (xx < 0 || xx >= W) continue; if (m[yy * W + xx]) { v = 1; break; } } }
    ut[y * W + x] = v;
  }
}
function erodera(m, ut, r) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = 1;
    for (let dy = -r; dy <= r && v; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) { v = 0; break; }
      for (let dx = -r; dx <= r; dx++) { const xx = x + dx; if (xx < 0 || xx >= W || !m[yy * W + xx]) { v = 0; break; } } }
    ut[y * W + x] = v;
  }
}

const gra = new Float32Array(PX), refB = new Float32Array(PX);
const mask = new Uint8Array(PX), m2 = new Uint8Array(PX), m3 = new Uint8Array(PX);
const sedd = new Int32Array(PX), ko = new Int32Array(PX);
let markor = 0;

/* Regionerna i en ruta, med kamerans egna mått. */
function regioner(i, raGra) {
  sudda(ruta(i, buf), gra);
  const ra = Buffer.from(buf);
  for (let p = 0; p < PX; p++) mask[p] = Math.abs(gra[p] - refB[p]) > TROSKEL ? 1 : 0;
  dilatera(mask, m2, 1); erodera(m2, m3, 1);
  const ut = [];
  markor++;
  for (let s = 0; s < PX; s++) {
    if (!m3[s] || sedd[s] === markor) continue;
    let h = 0, t = 0; ko[t++] = s; sedd[s] = markor;
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, n = 0, x0 = W, y0 = H, x1 = -1, y1 = -1, gs = 0, gs2 = 0;
    while (h < t) {
      const q = ko[h++], x = q % W, y = (q / W) | 0;
      n++; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      const v = ra[q]; gs += v; gs2 += v * v;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q2 = ny * W + nx; if (m3[q2] && sedd[q2] !== markor) { sedd[q2] = markor; ko[t++] = q2; }
      }
    }
    if (n < MINAREA) continue;
    const cx = sx / n, cy = sy / n;
    const vxx = sxx / n - cx * cx, vyy = syy / n - cy * cy, vxy = sxy / n - cx * cy;
    const tr = vxx + vyy, det = vxx * vyy - vxy * vxy;
    const disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
    const l1 = tr / 2 + disc, l2 = Math.max(1e-6, tr / 2 - disc);
    const vinkel = 0.5 * Math.atan2(2 * vxy, vxx - vyy);
    const lang = 2 * Math.sqrt(3 * l1), kort = 2 * Math.sqrt(3 * l2);
    const std = Math.sqrt(Math.max(0, gs2 / n - (gs / n) ** 2));
    ut.push({ cx: +cx.toFixed(1), cy: +cy.toFixed(1), lang: +lang.toFixed(1), kort: +kort.toFixed(1),
              vinkel: +vinkel.toFixed(3), area: n, box: { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 },
              fyllnad: +(n / (lang * kort)).toFixed(3), kvot: +(kort / lang).toFixed(3), std: +std.toFixed(1) });
  }
  return ut.sort((a, b) => b.area - a.area);
}

const KORTLIK = r => Math.abs(r.lang - kortRef.lang) <= 0.25 * kortRef.lang && Math.abs(r.kort - kortRef.kort) <= 0.25 * kortRef.kort;
const tacker = (a, b) => {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
  return x2 <= x || y2 <= y ? 0 : (x2 - x) * (y2 - y) / (b.w * b.h);
};

const ut = [];
for (const f of F.fonster) {
  /* Referensen: bordet som det låg före steget — medel av åtta suddade rutor. */
  const iB = Math.round(f.t_borjar * fps);
  refB.fill(0);
  const tmpG = new Float32Array(PX);
  for (let k = 0; k < 8; k++) { sudda(ruta(iB - 5 - k, buf), tmpG); for (let p = 0; p < PX; p++) refB[p] += tmpG[p] / 8; }
  const iF = Math.max(0, Math.round(f.fran * fps)), iT = Math.min(N - 1, Math.round(f.till * fps));
  const rutor = [];
  for (let i = iF; i <= iT; i++) {
    const rs = regioner(i);
    /* Den region som rör kortets slutplats mest; annars den största. */
    let vald = null, bast = 0;
    for (const r of rs) { const o = tacker(r.box, f.box); if (o > bast) { bast = o; vald = r; } }
    if (!vald) vald = rs[0] || null;
    rutor.push({ i, t: +(i / fps).toFixed(3), antal: rs.length,
                 r: vald ? { lang: vald.lang, kort: vald.kort, kvot: vald.kvot, area: vald.area, fyllnad: vald.fyllnad,
                             std: vald.std, vinkel: vald.vinkel, box: vald.box, cx: vald.cx, cy: vald.cy,
                             kortlik: KORTLIK(vald), tackerMal: +bast.toFixed(2),
                             /* kamerans formgrindar */
                             grind: (vald.kvot >= 0.55 && vald.kvot <= 0.95 && vald.fyllnad >= 0.72 && vald.std >= 15) } : null });
  }
  ut.push({ nr: f.nr, t_borjar: f.t_borjar, t_land: f.t_land, t_slapp: f.t_slapp, t_stilla: f.t_stilla,
            box: f.box, liggande: f.liggande, rutor });
  const kl = rutor.filter(x => x.r && x.r.kortlik && x.t < f.t_slapp).length;
  const gr = rutor.filter(x => x.r && x.r.grind && x.t < f.t_slapp).length;
  console.log(`s${String(f.nr).padStart(2, '0')}  ${rutor.length} rutor  ·  kortlika FÖRE släppet: ${kl}  ·  genom formgrindarna: ${gr}`);
}
fs.closeSync(fd);
fs.writeFileSync(path.join(ARB, 'regioner.json'), JSON.stringify({ kortRef, fps, bredd: W, hojd: H, troskel: TROSKEL, fonster: ut }) + '\n');
console.log('skrivet: ' + path.join(ARB, 'regioner.json'));

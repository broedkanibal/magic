#!/usr/bin/env node
/* Väljer ut stegen där ett kort läggs ner, och räknar ut vilket utsnitt ur
   videon som behöver klippas för att följa kortets väg ner.

   Kör: node dev/las-fore-slapp/fonster.cjs <arbetsmapp> [--fore 1.5] [--efter 0.4]

   Skriver `fonster.txt` (rader till klipp.swift: id;från;till;x;y;w;h i
   andelar av bilden) och `fonster.json` (samma, med facit per steg).

   Ett steg räknas som "kort läggs ner" när lådan som ändrades har ett korts
   mått (inom ±30 % av kortreferensen) — vare sig den landar på tom matta
   eller på en hög. Rör inte kamerakedjan. */
'use strict';
const fs = require('fs'), path = require('path');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? +process.argv[i + 1] : d; };
const ARB = process.argv[2];
if (!ARB) { console.error('node fonster.cjs <arbetsmapp>'); process.exit(1); }
const FORE = arg('--fore', 1.5), EFTER = arg('--efter', 0.4);
const F = JSON.parse(fs.readFileSync(path.join(ARB, 'facit.json'), 'utf8'));
const S = JSON.parse(fs.readFileSync(path.join(ARB, 'steg-sort.json'), 'utf8'));
const W = F.bredd, H = F.hojd, PX = W * H, N = F.rutor, fps = F.fps;
const kortRef = S.kortRef;
const fd = fs.openSync(path.join(ARB, 'gra.bin'), 'r');
const buf = Buffer.allocUnsafe(PX), buf2 = Buffer.allocUnsafe(PX);
const ruta = (i, b) => { fs.readSync(fd, b, 0, PX, Math.max(0, Math.min(N - 1, i)) * PX); return b; };

/* Suddning 5x5, separabel — samma skäl som i matt.cjs: sensorbruset i
   lampljus är så stort att en rå skillnad ger spridda utslag över hela
   bilden, och lådan blir hela rutan. */
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
const gA = new Float32Array(PX), gB = new Float32Array(PX);
/* Rörelselådan i en ruta: skillnad mot rutan tre steg tidigare (en hand som
   förs ner rör sig märkbart på 50 ms), tröskel 10 gråsteg efter suddning. */
function rorLada(i) {
  sudda(ruta(i, buf), gA); sudda(ruta(i - 3, buf2), gB);
  let x0 = W, y0 = H, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (Math.abs(gA[p] - gB[p]) > 10) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return n > 60 ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, n } : null;
}

const KORTLIK = (b) => {
  const l = Math.max(b.w, b.h), k = Math.min(b.w, b.h);
  return Math.abs(l - kortRef.lang) <= 0.30 * kortRef.lang && Math.abs(k - kortRef.kort) <= 0.30 * kortRef.kort;
};

const valda = [], rader = [];
for (const s of S.steg) {
  if (!s.box || !s.t_slapp) continue;
  if (!KORTLIK(s.box)) continue;                 // bara steg där lådan ÄR ett kort
  if (s.efter < 45) continue;                    // efteråt ligger inget ljust där: borttag
  const fran = Math.max(0, s.t_slapp - FORE), till = Math.min(F.steg[F.steg.length - 1].t_stilla, s.t_stilla + EFTER);
  const iF = Math.max(3, Math.round(fran * fps)), iT = Math.min(N - 1, Math.round(till * fps));
  /* Utsnittet: allt som rör sig i fönstret, plus kortets slutläge. */
  let x0 = s.box.x, y0 = s.box.y, x1 = s.box.x + s.box.w, y1 = s.box.y + s.box.h;
  for (let i = iF; i <= iT; i += 2) {
    const r = rorLada(i); if (!r) continue;
    if (r.n > PX * 0.35) continue;       // hela bilden ändrad = exponeringssväng, inte en hand
    if (r.x < x0) x0 = r.x; if (r.y < y0) y0 = r.y;
    if (r.x + r.w > x1) x1 = r.x + r.w; if (r.y + r.h > y1) y1 = r.y + r.h;
  }
  const m = 4;
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(W, x1 + m); y1 = Math.min(H, y1 + m);
  const post = { nr: s.nr, t_slapp: s.t_slapp, t_land: s.t_land, t_stilla: s.t_stilla, t_borjar: s.t_borjar,
                 box: s.box, fran: +fran.toFixed(3), till: +till.toFixed(3),
                 utsnitt: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
                 fore: s.fore, efter: s.efter, liggande: s.liggande };
  valda.push(post);
  rader.push([`s${String(s.nr).padStart(2, '0')}`, post.fran.toFixed(3), post.till.toFixed(3),
              (x0 / W).toFixed(5), (y0 / H).toFixed(5), ((x1 - x0) / W).toFixed(5), ((y1 - y0) / H).toFixed(5)].join(';'));
}
fs.closeSync(fd);
fs.writeFileSync(path.join(ARB, 'fonster.txt'), rader.join('\n') + '\n');
fs.writeFileSync(path.join(ARB, 'fonster.json'), JSON.stringify({ kortRef, fps, bredd: W, hojd: H, fonster: valda }, null, 1) + '\n');
let rutor = 0, mpx = 0;
for (const v of valda) {
  const n = Math.round((v.till - v.fran) * fps);
  rutor += n; mpx += n * (v.utsnitt.w / W * 3840) * (v.utsnitt.h / H * 2160) / 1e6;
}
console.log(`${valda.length} fönster, ${rutor} rutor, ${(mpx).toFixed(0)} Mpx i 4K (~${(mpx * 0.25).toFixed(0)} MB jpeg)`);
for (const v of valda) console.log(`s${String(v.nr).padStart(2, '0')}  ${v.fran.toFixed(2)}–${v.till.toFixed(2)} s  släpp ${v.t_slapp.toFixed(2)}  utsnitt ${v.utsnitt.w}x${v.utsnitt.h} (${Math.round(v.utsnitt.w / W * 3840)}x${Math.round(v.utsnitt.h / H * 2160)} i 4K)  kort ${v.box.w}x${v.box.h}${v.liggande ? ' liggande' : ''}`);

#!/usr/bin/env node
/* Räknar om rörelsemåttet ur gra.bin med bildrutorna SUDDADE först.
   Kör: node dev/las-fore-slapp/matt.cjs <arbetsmapp>

   Inspelningen är tagen i lampljus, och sensorbruset är stort: medelskillnaden
   mellan två stilla rutor ligger på ~3,2 gråsteg, och rörelsen drunknar i den.
   En suddning (5×5 medel, separabel) drar ner bruset ungefär fem gånger utan
   att röra det som verkligen rör sig — en hand är hundratals bildpunkter bred.

   Skriver `matt.csv`: nr, tid, diff (medelskillnad, suddad), andrade
   (bildpunkter över 8 gråsteg, suddat). Samma kedja rör inte index.html. */
'use strict';
const fs = require('fs'), path = require('path');
const ARB = process.argv[2];
if (!ARB) { console.error('node matt.cjs <arbetsmapp>'); process.exit(1); }

const rader = fs.readFileSync(path.join(ARB, 'metrik.csv'), 'utf8').trim().split('\n').slice(1);
const N = rader.length, tid = rader.map(r => +r.split(',')[1]);
const storlek = fs.statSync(path.join(ARB, 'gra.bin')).size;
const PX = Math.round(storlek / N);
const W = Math.round(Math.sqrt(PX * 16 / 9)), H = Math.round(PX / W);
console.log(`gra.bin: ${W}x${H} per ruta, ${N} rutor`);
const fd = fs.openSync(path.join(ARB, 'gra.bin'), 'r');

const K = 2;                                   // 5×5
function sudda(src, dst, tmp) {
  const d = 2 * K + 1;
  for (let y = 0; y < H; y++) {                // vågrätt
    const rad = y * W; let s = 0;
    for (let x = -K; x <= K; x++) s += src[rad + Math.min(W - 1, Math.max(0, x))];
    for (let x = 0; x < W; x++) {
      tmp[rad + x] = s / d;
      s += src[rad + Math.min(W - 1, x + K + 1)] - src[rad + Math.min(W - 1, Math.max(0, x - K))];
    }
  }
  for (let x = 0; x < W; x++) {                // lodrätt
    let s = 0;
    for (let y = -K; y <= K; y++) s += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
    for (let y = 0; y < H; y++) {
      dst[y * W + x] = s / d;
      s += tmp[Math.min(H - 1, y + K + 1) * W + x] - tmp[Math.min(H - 1, Math.max(0, y - K)) * W + x];
    }
  }
}

const buf = Buffer.allocUnsafe(PX), tmp = new Float32Array(PX);
let a = new Float32Array(PX), b = new Float32Array(PX);
let ut = 'nr,tid,diff,andrade\n';
for (let i = 0; i < N; i++) {
  fs.readSync(fd, buf, 0, PX, i * PX);
  sudda(buf, b, tmp);
  let summa = 0, andrade = 0;
  if (i) for (let p = 0; p < PX; p++) { const d = Math.abs(a[p] - b[p]); summa += d; if (d > 8) andrade++; }
  ut += `${i},${tid[i].toFixed(5)},${(summa / PX).toFixed(4)},${andrade}\n`;
  const t = a; a = b; b = t;
  if (i % 5000 === 0) process.stderr.write(`\r  ${i}/${N}`);
}
fs.closeSync(fd);
fs.writeFileSync(path.join(ARB, 'matt.csv'), ut);
process.stderr.write('\r');
const d = ut.trim().split('\n').slice(2).map(r => +r.split(',')[2]).sort((p, q) => p - q);
const P = p => d[Math.floor(d.length * p)];
console.log('skrivet: matt.csv');
console.log('diff percentiler: ' + [0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95, 0.99].map(p => p + ':' + P(p).toFixed(3)).join('  '));

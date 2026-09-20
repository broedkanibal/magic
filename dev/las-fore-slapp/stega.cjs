#!/usr/bin/env node
/* Delar inspelningen i steg och tar fram facit per steg.
   Kör: node dev/las-fore-slapp/stega.cjs <arbetsmapp> [--glapp 1.2] [--golv 60]

   Läser `matt.csv` (suddat rörelsemått ur matt.cjs) och `gra.bin`
   (rorelse.swift) och skriver `facit.json` med en post per steg:

     stilla_fore  sista rutan i vilan före steget
     borjar       första rutan med rörelse
     land         kortet är nere: från den rutan står det som ligger kvar
                  efteråt på sin plats och lämnar den aldrig igen
     slapp        sista rutan där handen rör kortet, mätt som sista rutan där
                  kortets egen ruta INTE ser ut som den gör när bordet vilar
     stilla       bordet står stilla igen

   Ingenting här rör kamerakedjan: det är mätning på bildrutor. */
'use strict';
const fs = require('fs'), path = require('path');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? +process.argv[i + 1] : d; };
const ARB = process.argv[2];
if (!ARB) { console.error('node stega.cjs <arbetsmapp> [--glapp s] [--golv n]'); process.exit(1); }
const GLAPP_S = arg('--glapp', 1.2);       // så lång stillhet krävs för att ett steg ska vara slut
const GOLV = arg('--golv', 60);            // ändrade bildpunkter som räknas som rörelse

const rader = fs.readFileSync(path.join(ARB, 'matt.csv'), 'utf8').trim().split('\n').slice(1);
const N = rader.length;
const tid = new Float64Array(N), andrade = new Int32Array(N);
rader.forEach((r, i) => { const c = r.split(','); tid[i] = +c[1]; andrade[i] = +c[3]; });
const storlek = fs.statSync(path.join(ARB, 'gra.bin')).size;
const PX = Math.round(storlek / N);
const W = Math.round(Math.sqrt(PX * 16 / 9)), H = Math.round(PX / W);
const fps = (N - 1) / (tid[N - 1] - tid[0]);
const GLAPP = Math.round(fps * GLAPP_S);
console.log(`${N} rutor, ${tid[N - 1].toFixed(1)} s, ${fps.toFixed(2)} rutor/s — rörelse = över ${GOLV} ändrade, glapp ${GLAPP} rutor`);

/* ── stegen: sammanhängande rörelse, med korta pauser inräknade ───── */
const ror = new Uint8Array(N);
for (let i = 1; i < N; i++) ror[i] = andrade[i] > GOLV ? 1 : 0;
const steg = [];
for (let i = 1; i < N;) {
  if (!ror[i]) { i++; continue; }
  let fran = i, till = i, j = i;
  while (j < N) {
    if (ror[j]) { till = j; j++; continue; }
    let k = j; while (k < N && !ror[k]) k++;
    if (k - j >= GLAPP || k >= N) break;
    j = k;
  }
  steg.push({ fran, till });
  i = till + 1;
}
console.log(`${steg.length} steg funna`);

/* ── bildrutorna ──────────────────────────────────────────────────── */
const fd = fs.openSync(path.join(ARB, 'gra.bin'), 'r');
const buf = Buffer.allocUnsafe(PX);
const ruta = i => { fs.readSync(fd, buf, 0, PX, i * PX); return buf; };
function medel(fran, antal) {
  const acc = new Float64Array(PX); let n = 0;
  for (let i = fran; i < fran + antal && i < N; i++) { if (i < 0) continue; const g = ruta(i); for (let p = 0; p < PX; p++) acc[p] += g[p]; n++; }
  if (n) for (let p = 0; p < PX; p++) acc[p] /= n;
  return acc;
}

const ANDRAD = 16;        // gråsteg: en kortkant mot svart matta ger mycket mer
function lador(fore, efter) {
  const mask = new Uint8Array(PX);
  for (let p = 0; p < PX; p++) mask[p] = Math.abs(fore[p] - efter[p]) > ANDRAD ? 1 : 0;
  const sedd = new Uint8Array(PX), ko = new Int32Array(PX), ut = [];
  for (let s = 0; s < PX; s++) {
    if (!mask[s] || sedd[s]) continue;
    let h = 0, t = 0; ko[t++] = s; sedd[s] = 1;
    let x0 = s % W, x1 = x0, y0 = (s / W) | 0, y1 = y0, n = 0;
    while (h < t) {
      const q = ko[h++], x = q % W, y = (q / W) | 0; n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q2 = ny * W + nx; if (mask[q2] && !sedd[q2]) { sedd[q2] = 1; ko[t++] = q2; }
      }
    }
    if (n >= 30) ut.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, n });
  }
  return ut.sort((a, b) => b.n - a.n);
}

function likhet(i, box, efter) {
  const g = ruta(i); let lika = 0, n = 0;
  for (let y = box.y; y < box.y + box.h; y++) { const rad = y * W;
    for (let x = box.x; x < box.x + box.w; x++) { const p = rad + x; n++; if (Math.abs(g[p] - efter[p]) <= ANDRAD) lika++; } }
  return n ? lika / n : 1;
}

const MED = 6, ut = [];
for (let k = 0; k < steg.length; k++) {
  const s = steg[k];
  const foreSlut = s.fran - 2, efterStart = s.till + 2;
  const fore = medel(foreSlut - MED + 1, MED), efter = medel(efterStart, MED);
  const bl = lador(fore, efter);
  const post = { nr: k + 1, borjar: s.fran, stilla: s.till,
                 t_borjar: +tid[s.fran].toFixed(3), t_stilla: +tid[s.till].toFixed(3),
                 langd_s: +(tid[s.till] - tid[s.fran]).toFixed(3),
                 lador: bl.slice(0, 4).map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h, n: b.n })) };
  if (bl.length) {
    const b = bl[0];
    const bx = Math.max(0, b.x - 2), by = Math.max(0, b.y - 2);
    const box = { x: bx, y: by, w: Math.min(W - bx, b.w + 4), h: Math.min(H - by, b.h + 4) };
    const serie = [];
    for (let i = s.fran; i <= Math.min(N - 1, s.till + 4); i++) serie.push(likhet(i, box, efter));
    let slapp = s.till;
    for (let kk = serie.length - 1; kk >= 0; kk--) if (serie[kk] < 0.97) { slapp = s.fran + kk; break; }
    let land = s.fran;
    for (let kk = serie.length - 1; kk >= 0; kk--) if (serie[kk] < 0.55) { land = s.fran + kk + 1; break; }
    post.box = box; post.land = land; post.slapp = slapp;
    post.t_land = +tid[Math.min(land, N - 1)].toFixed(3);
    post.t_slapp = +tid[Math.min(slapp, N - 1)].toFixed(3);
    post.likhet = serie.map(v => +v.toFixed(3));
  }
  ut.push(post);
}
fs.closeSync(fd);
fs.writeFileSync(path.join(ARB, 'facit.json'), JSON.stringify({ bredd: W, hojd: H, fps, rutor: N, golv: GOLV, glapp_s: GLAPP_S, steg: ut }, null, 1) + '\n');
console.log(`skrivet: ${path.join(ARB, 'facit.json')}`);
for (const s of ut) console.log(`${String(s.nr).padStart(3)}  ${s.t_borjar.toFixed(2).padStart(7)} → ${s.t_stilla.toFixed(2).padStart(7)}  (${s.langd_s.toFixed(2)} s)  land ${(s.t_land || 0).toFixed(2).padStart(7)}  släpp ${(s.t_slapp || 0).toFixed(2).padStart(7)}  låda ${s.box ? `${s.box.w}x${s.box.h} @${s.box.x},${s.box.y}` : '–'}`);

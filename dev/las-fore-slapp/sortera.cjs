#!/usr/bin/env node
/* Vad hände i varje steg? Läser facit.json (stega.cjs) och gra.bin och
   beskriver varje steg med siffror i stället för med ögat:

     lådans mått mot kortreferensen, och om den är stående eller liggande
     hur ljus ytan var FÖRE och EFTER (mattan är nästan svart, ett kort ljust)
     en dom: nytt kort · borta · vridet · flyttat · oklart

   Kör: node dev/las-fore-slapp/sortera.cjs <arbetsmapp>
   Skriver `steg-sort.json` bredvid facit.json. Rör inte kamerakedjan. */
'use strict';
const fs = require('fs'), path = require('path');
const ARB = process.argv[2];
if (!ARB) { console.error('node sortera.cjs <arbetsmapp>'); process.exit(1); }
const F = JSON.parse(fs.readFileSync(path.join(ARB, 'facit.json'), 'utf8'));
const W = F.bredd, H = F.hojd, PX = W * H, N = F.rutor;
const fd = fs.openSync(path.join(ARB, 'gra.bin'), 'r');
const buf = Buffer.allocUnsafe(PX);
const ruta = i => { fs.readSync(fd, buf, 0, PX, Math.max(0, Math.min(N - 1, i)) * PX); return buf; };
function medel(fran, antal) {
  const acc = new Float64Array(PX); let n = 0;
  for (let i = fran; i < fran + antal; i++) { const g = ruta(i); for (let p = 0; p < PX; p++) acc[p] += g[p]; n++; }
  for (let p = 0; p < PX; p++) acc[p] /= n || 1;
  return acc;
}
const stat = (bild, b) => {
  let s = 0, s2 = 0, n = 0;
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { const v = bild[y * W + x]; s += v; s2 += v * v; n++; }
  const m = s / n; return { medel: m, sigma: Math.sqrt(Math.max(0, s2 / n - m * m)) };
};

/* Kortreferensen ur materialet: medianen av lådor som är ETT RAKT KORT —
   kvoten inom 7 % av 0,716. Tas hela spannet 0,66–0,80 med följer tappade
   kort, högar och kort som ligger snett med, och referensen blir för stor
   (mätt: 35×46 i stället för 33×44), vilket får varje utskärning att
   misslyckas. */
const kvoter = [];
for (const s of F.steg) if (s.box) { const l = Math.max(s.box.w, s.box.h), k = Math.min(s.box.w, s.box.h); if (Math.abs(l * 0.716 - k) < 0.07 * k) kvoter.push({ l, k }); }
const med = a => { const b = a.slice().sort((p, q) => p - q); return b[b.length >> 1]; };
const kortRef = { lang: med(kvoter.map(x => x.l)), kort: med(kvoter.map(x => x.k)) };
console.log(`kortreferens ur lådorna: ${kortRef.kort}×${kortRef.lang} i ${W} px bredd  →  ${Math.round(kortRef.kort * 3840 / W)}×${Math.round(kortRef.lang * 3840 / W)} px i 4K, ${Math.round(kortRef.kort * 1920 / W)}×${Math.round(kortRef.lang * 1920 / W)} px i 1080p  (${kvoter.length} lådor)`);

const MED = 6, ut = [];
for (const s of F.steg) {
  const fore = medel(s.borjar - 2 - MED, MED), efter = medel(s.stilla + 2, MED);
  const b = s.box || { x: 0, y: 0, w: W, h: H };
  const f = stat(fore, b), e = stat(efter, b);
  const lang = Math.max(b.w, b.h), kort = Math.min(b.w, b.h), kvot = kort / lang;
  const kortlik = Math.abs(lang - kortRef.lang) <= 0.28 * kortRef.lang && Math.abs(kort - kortRef.kort) <= 0.28 * kortRef.kort;
  const stor = (lang * kort) / (kortRef.lang * kortRef.kort);
  /* Mattan ligger på ~20 gråsteg; ett kort i ficka på 90–150. */
  const MATTA = 45;
  let dom;
  if (f.medel < MATTA && e.medel >= MATTA) dom = kortlik ? 'nytt kort' : 'nytt (stor låda)';
  else if (f.medel >= MATTA && e.medel < MATTA) dom = 'borta';
  else if (f.medel >= MATTA && e.medel >= MATTA) dom = stor > 1.35 ? 'vridet/flyttat' : 'ändrat på plats';
  else dom = 'oklart (mörkt före och efter)';
  ut.push({ nr: s.nr, t_borjar: s.t_borjar, t_land: s.t_land, t_slapp: s.t_slapp, t_stilla: s.t_stilla,
            box: b, lang, kort, kvot: +kvot.toFixed(2), kortlik, stor: +stor.toFixed(2),
            liggande: b.w > b.h, fore: +f.medel.toFixed(1), efter: +e.medel.toFixed(1),
            sigmaFore: +f.sigma.toFixed(1), sigmaEfter: +e.sigma.toFixed(1), dom });
}
fs.closeSync(fd);
fs.writeFileSync(path.join(ARB, 'steg-sort.json'), JSON.stringify({ kortRef, steg: ut }, null, 1) + '\n');
console.log('nr    börjar   släpp  stilla   låda      kvot  yta   ljus före→efter   dom');
for (const s of ut)
  console.log(`${String(s.nr).padStart(3)} ${s.t_borjar.toFixed(2).padStart(8)} ${(s.t_slapp || 0).toFixed(2).padStart(7)} ${s.t_stilla.toFixed(2).padStart(7)}  ${String(s.box.w + 'x' + s.box.h).padEnd(8)} ${s.kvot.toFixed(2)}  ${String(s.stor).padStart(5)}  ${String(s.fore).padStart(5)}→${String(s.efter).padStart(5)}   ${s.dom}`);

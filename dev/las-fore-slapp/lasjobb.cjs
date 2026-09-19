#!/usr/bin/env node
/* Bygger jobbet till las.html: en post per klippt bildruta, med regionen och
   kortmåtten räknade till det klippta utsnittets EGNA bildpunkter.

   Kör: node dev/las-fore-slapp/lasjobb.cjs <arbetsmapp> <bildmapp> <ut.json> \
          [--steg 1] [--kallor skuren,region] [--varianter 4k,1080p] [--fonster 4,7]

   <bildmapp> är mappen klipp.swift skrev (med ut.json). <ut.json> hamnar i
   samma mapp, eftersom las.html hämtar allt under `bilder/`. */
'use strict';
const fs = require('fs'), path = require('path');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const ARB = process.argv[2], BILD = process.argv[3], UT = process.argv[4];
if (!ARB || !BILD || !UT) { console.error('node lasjobb.cjs <arbetsmapp> <bildmapp> <ut.json> [flaggor]'); process.exit(1); }
const STEG = +arg('--steg', 1);
const KALLOR = arg('--kallor', 'skuren,region').split(',').filter(Boolean);
const VARIANTER = arg('--varianter', '4k,1080p').split(',').filter(Boolean);
const BARA = arg('--fonster', '');
const bara = BARA ? new Set(BARA.split(',').map(Number)) : null;

const R = JSON.parse(fs.readFileSync(path.join(ARB, 'regioner.json'), 'utf8'));
const KLIPP = JSON.parse(fs.readFileSync(path.join(BILD, 'ut.json'), 'utf8'));
let namn = {};                                       // steg → kortnamn (facit), när det finns
try { namn = JSON.parse(fs.readFileSync(path.join(ARB, 'namn.json'), 'utf8')); } catch (e) {}
const W = R.bredd, H = R.hojd, VW = KLIPP.bildW, VH = KLIPP.bildH;
const sk = VW / W;                                   // analysbildpunkt → videobildpunkt
const rutor = new Map(KLIPP.rutor.map(r => [r.id, r]));

const poster = [];
for (const f of R.fonster) {
  if (bara && !bara.has(f.nr)) continue;
  let i = 0;
  for (const x of f.rutor) {
    const id = `s${String(f.nr).padStart(2, '0')}-${String(x.i).padStart(6, '0')}`;
    const k = rutor.get(id); if (!k) continue;
    if ((i++ % STEG) !== 0) continue;
    const r = x.r ? x.r.box : f.box;
    /* Regionen i utsnittets egna bildpunkter. */
    const region = { x: r.x * sk - k.x, y: r.y * (VH / H) - k.y, w: r.w * sk, h: r.h * (VH / H) };
    const mal = { x: f.box.x * sk - k.x, y: f.box.y * (VH / H) - k.y, w: f.box.w * sk, h: f.box.h * (VH / H) };
    poster.push({
      id, fil: path.basename(k.fil || (id + '.jpg')), fonster: f.nr,
      t: +k.t.toFixed(3), rel: +(k.t - f.t_slapp).toFixed(3),
      facit: namn[String(f.nr)] || null,
      region: { x: +region.x.toFixed(1), y: +region.y.toFixed(1), w: +region.w.toFixed(1), h: +region.h.toFixed(1) },
      regionVinkel: x.r ? x.r.vinkel : 0,
      mal: { x: +mal.x.toFixed(1), y: +mal.y.toFixed(1), w: +mal.w.toFixed(1), h: +mal.h.toFixed(1) },
      kortLang: Math.round(R.kortRef.lang * sk), kortKort: Math.round(R.kortRef.kort * sk),
      kallor: KALLOR, varianter: VARIANTER,
      /* Rörelseoskärpa vid 1/30 s: hur långt regionen flyttade sig sedan
         förra rutan, i bildpunkter — det är sträckan en exponering skulle
         smeta ut. Sätts av las.html:s suddaRorelse. */
      suddPx: x.fart != null ? Math.round(x.fart * sk) : 10
    });
  }
}
fs.writeFileSync(path.join(BILD, path.basename(UT)), JSON.stringify({ kortRef: R.kortRef, poster }, null, 0) + '\n');
console.log(`${poster.length} poster → ${path.join(BILD, path.basename(UT))}  (källor ${KALLOR.join('+')}, varianter ${VARIANTER.join('+')})`);

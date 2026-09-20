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
const RELMIN = +arg('--relmin', -99), RELMAX = +arg('--relmax', 99);
const bara = BARA ? new Set(BARA.split(',').map(Number)) : null;

const R = JSON.parse(fs.readFileSync(path.join(ARB, 'regioner.json'), 'utf8'));
const KLIPP = JSON.parse(fs.readFileSync(path.join(BILD, 'ut.json'), 'utf8'));
let namn = {};                                       // steg → kortnamn (facit), när det finns
try { namn = JSON.parse(fs.readFileSync(path.join(ARB, 'namn.json'), 'utf8')); } catch (e) {}
const W = R.bredd, H = R.hojd, VW = KLIPP.bildW, VH = KLIPP.bildH;
const sk = VW / W;                                   // analysbildpunkt → videobildpunkt
const rutor = new Map(KLIPP.rutor.map(r => [r.id, r]));
let masker = new Map();
try { masker = new Map(JSON.parse(fs.readFileSync(path.join(ARB, 'masker.json'), 'utf8')).masker.map(m => [m.id, m])); } catch (e) {}

/* Kortets mått för DET HÄR fönstret: medianen av regionens mått i rutorna
   efter släppet, där regionen ÄR kortet. Vidvinkeln gör kort nära bildens
   mitt större än kort vid kanten (31×43 till 37×52 i 360 px), så en enda
   kortreferens för hela bordet är för trubbig för en utskärning. */
function kortMatt(f) {
  const l = [], k = [];
  for (const x of f.rutor) { if (!x.r) continue; const rel = x.t - f.t_slapp; if (rel < 0.1 || rel > 0.35) continue; if (!x.r.kortlik) continue; l.push(x.r.lang); k.push(x.r.kort); }
  const m = a => { if (!a.length) return null; const b = a.slice().sort((p, q) => p - q); return b[b.length >> 1]; };
  const ml = m(l), mk = m(k);
  return (ml && mk) ? { lang: ml, kort: mk, egen: true } : { lang: R.kortRef.lang, kort: R.kortRef.kort, egen: false };
}

/* Regionens fart och riktning mellan två rutor, i analysbildpunkter. */
function granne(f, x, steg) { const i = f.rutor.indexOf(x); const g = f.rutor[i + steg]; return g && g.r ? g.r : null; }
function fart(f, x) {
  if (!x.r) return 1;
  const a = granne(f, x, -1) || granne(f, x, 1); if (!a) return 1;
  return Math.hypot(x.r.cx - a.cx, x.r.cy - a.cy);
}
function riktning(f, x) {
  if (!x.r) return 0;
  const a = granne(f, x, -1); if (!a) return 0;
  return +Math.atan2(x.r.cy - a.cy, x.r.cx - a.cx).toFixed(3);
}

const poster = [];
for (const f of R.fonster) {
  if (bara && !bara.has(f.nr)) continue;
  const km = kortMatt(f);
  let i = 0;
  for (const x of f.rutor) {
    const id = `s${String(f.nr).padStart(2, '0')}-${String(x.i).padStart(6, '0')}`;
    const k = rutor.get(id); if (!k) continue;
    const rel = k.t - f.t_slapp;
    if (rel < RELMIN || rel > RELMAX) continue;
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
      kortLang: Math.round(km.lang * sk), kortKort: Math.round(km.kort * sk), kortEgen: km.egen,
      /* Detektorns mask över regionens låda — det utskärningen har att gå på. */
      mask: masker.has(id) ? { w: masker.get(id).w, h: masker.get(id).h, m: masker.get(id).m } : null,
      kallor: KALLOR, varianter: VARIANTER,
      /* Rörelseoskärpa vid 1/30 s: hur långt regionen flyttar sig på två
         rutor i 60 per sekund — det är sträckan en exponering på 1/30 s
         skulle smeta ut. Mätt på regionens mitt, i videobildpunkter.
         Riktningen är rörelsens. Sätts av las.html:s suddaRorelse. */
      suddPx: Math.max(2, Math.round(fart(f, x) * 2 * sk)),
      suddRiktning: riktning(f, x)
    });
  }
}
fs.writeFileSync(path.join(BILD, path.basename(UT)), JSON.stringify({ kortRef: R.kortRef, poster }, null, 0) + '\n');
console.log(`${poster.length} poster → ${path.join(BILD, path.basename(UT))}  (källor ${KALLOR.join('+')}, varianter ${VARIANTER.join('+')})`);

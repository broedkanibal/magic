#!/usr/bin/env node
/* Lekvakten (MES-334 steg 3) mot detektorns riktiga lådor — vilken hög blir library, och när?

   Kör:  node dev/lekrepris.cjs [--kalla person1-video,p22,…] [--logg]

   Del A (dev/plan/hogarna-matning.md, mått 7) körde den tränade detektorn på
   partierna, golden-filmerna, MES-246, MES-139 och kompisens film och sparade
   lådorna ruta för ruta (dev/material/arbete/2026-10-04-hogarna-matning/a3/
   jobb*.jsonl: [x0, y0, x1, y1, poäng, klass] i bildandelar). Här matas samma
   lådor in i Kamera-modulen ur index.html, i node som dev/kamerabank.cjs, med
   en tom matta som bild: lekvaktens val — sammanslagningen, stillheten,
   kanten, storleken mot korten, "dyker upp under passet", väntan när flera
   högar ligger — är appens egen kod. Kortlådor får namnet Plains av
   identifieringsstubben (så att kortstorleken finns), baksidelådor 'baksida
   ficka'.
   Det som INTE provas här: upplockad (masken är tom — den tomma mattan ser
   alltid tom ut, så en låda som försvinner blir upplockad efter 1,5 + 2 s) och
   sleevesens färg (ingen färgbild). Det provas i bänken (LK3–LK5, LK12) och
   i golden (--utan-bib).
   Facit: var leken ligger enligt del A (LEKEN nedan, bildandelar, ur del A:s
   rapporter och golden-facit) — valet ska ligga där, och ingen annan hög. */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROT = path.join(__dirname, '..');
const A3 = path.join(ROT, 'dev', 'material', 'arbete', '2026-10-04-hogarna-matning', 'a3');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const LOGG = process.argv.includes('--logg');
const KAND = +arg('--kand', 0);   // --kand <s>: kandidaterna (dia.lekKand) var <s>:e sekund — varför en hög inte väljs
const src = fs.readFileSync(path.join(ROT, 'index.html'), 'utf8').split('\n');
const start = src.findIndex(l => l.startsWith('const Kamera = (() => {'));
let slut = -1; for (let i = start; i < src.length; i++) if (src[i].startsWith('})();')) { slut = i; break; }
const kod = src.slice(start, slut + 1).join('\n');

/* Var leken ligger (mitten, bildandelar) och hur långt bort ett val får ligga — ur del A:s rapporter
   (A3, tabell 1) och golden-facit (bib). null = ingen lek i bild (då ska ingen hög väljas). */
const LEKEN = {
  g07: null, g09: null, g10: { x: 0.25, y: 0.73 }, g11: { x: 0.345, y: 0.705 }, g12: null,
  g13: { x: 0.18, y: 0.75 }, g18: { x: 0.18, y: 0.66 }
};

function korKalla(namn, rader) {
  const ctx = {
    document: { createElement: () => ({ getContext: () => ({ drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(0) }), translate() {}, rotate() {}, setTransform() {}, scale() {}, fillRect() {}, clearRect() {}, fillStyle: '' }), width: 0, height: 0 }) },
    navigator: {}, performance: { now: () => 0 }, requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    KamDet: { redo: () => false, status: () => 'av', fel: null, felVariant: null, felRutor: 0, laddat: null, variant: null, pa: () => false },
    window: {}, Math, Float32Array, Uint8Array, Int32Array, Uint8ClampedArray, Object, Array, Set, Promise, console, Infinity, Number, JSON
  };
  vm.createContext(ctx);
  vm.runInContext(kod + '\n;this.Kamera = Kamera;', ctx);
  const K = ctx.Kamera;
  ctx.window.Detektor = { para: kort => kort.map(b => Object.assign({}, b, { remsa: null, ur: 'lada' })) };
  K.installera({
    status: () => {}, bord: () => {},
    identifiera: (c, id) => { const t = K.spar.find(q => q.id === id); return Promise.resolve(t && t.klass === 'baksida' ? { baksida: true, varfor: 'baksida ficka', poang: 0.9 } : { namn: 'Plains', sid: 's1', saker: true, cands: [{ name: 'Plains', sid: 's1', score: 0.9 }] }); }
  });
  const W0 = rader[0].W, H0 = rader[0].H, AW = 360, AH = Math.round(AW * H0 / W0), V = W0 / AW;
  K.satKalibrering({ ruta: { x: 0, y: 0, w: 1, h: 1, upp: 'v' } });
  K.satTrosklar({ auto: 1 });
  const det = r => ({ lador: { kort: r.kort.map(b => ({ x0: b[0] * AW * V, y0: b[1] * AH * V, x1: b[2] * AW * V, y1: b[3] * AH * V, poang: b[4], klass: b[5] })), remsor: [] }, ruta: { x: 0, y: 0, w: AW * V, h: AH * V } });
  let s = 1;
  const bild = () => { const g = new Float32Array(AW * AH); for (let i = 0; i < g.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; g[i] = 100 + (s / 4294967296 - 0.5) * 4; } return g; };
  return { K, AW, AH, V, det, bild };
}

(async () => {
  const urval = new Set((arg('--kalla', '') || '').split(',').filter(Boolean));
  const kallor = new Map();
  for (const f of ['jobb1.jsonl', 'jobb2.jsonl']) {
    const fil = path.join(A3, f); if (!fs.existsSync(fil)) continue;
    for (const l of fs.readFileSync(fil, 'utf8').split('\n')) {
      if (!l.trim()) continue; const r = JSON.parse(l); if (r.t == null) continue;   // stillbilderna (…-rutor) har ingen tid
      if (urval.size && !urval.has(r.kalla)) continue;
      (kallor.get(r.kalla) || kallor.set(r.kalla, []).get(r.kalla)).push(r);
    }
  }
  if (!kallor.size) { console.error('lekrepris: hittar inga lådor i ' + A3); process.exit(2); }
  let fel = 0;
  for (const [namn, rader] of kallor) {
    rader.sort((a, b) => a.t - b.t);
    const { K, AW, AH, V, det, bild } = korKalla(namn, rader);
    let nu = 0, forra = null;
    const logg = [];
    const steg = async (r, ms) => { nu = ms; K.steg(bild(), nu, AH, AW, V, det(r)); await new Promise(q => setImmediate(q)); };
    for (let i = 0; i < 8; i++) await steg(rader[0], i * 150);   // referensen: första rutan några gånger
    const t0 = rader[0].t;
    for (const r of rader) {
      await steg(r, 1200 + (r.t - t0) * 1000);
      const l = K.lek, k = l ? l.lage + (l.id || '') + (l.ruta ? `@${(l.ruta.x + l.ruta.w / 2).toFixed(2)},${(l.ruta.y + l.ruta.h / 2).toFixed(2)}` : '') + (l.grund ? ' ' + l.grund : '') : 'null';
      if (k !== forra) { forra = k; logg.push({ t: +r.t.toFixed(1), k, l }); }
      if (KAND && (logg._kand == null || r.t - logg._kand >= KAND)) { logg._kand = r.t; console.log(`  [${namn} ${r.t.toFixed(1)} s] kortRef ${JSON.stringify(K.diagnos.kortRef)} kandidater ${JSON.stringify(K.diagnos.lekKand || [])}`); }
    }
    const valda = logg.filter(x => x.l && x.l.lage === 'nere');
    const forsta = valda[0];
    const fac = LEKEN[namn];
    const ids = [...new Set(valda.map(x => x.l.id))];
    const lagen = valda.map(x => ({ x: x.l.ruta.x + x.l.ruta.w / 2, y: x.l.ruta.y + x.l.ruta.h / 2 }));
    const nara = p => fac && Math.hypot(p.x - fac.x, p.y - fac.y) < 0.12;
    const dom = fac === undefined ? '(facit saknas)' : fac === null ? (valda.length ? `FEL: en hög valdes fast ingen lek finns (${lagen.map(p => p.x.toFixed(2) + ',' + p.y.toFixed(2)).join(' ')})` : 'rätt: ingen hög vald')
      : !forsta ? 'ingen hög vald' : lagen.every(nara) ? 'rätt: leken' : `FEL: en annan hög (${lagen.filter(p => !nara(p)).map(p => p.x.toFixed(2) + ',' + p.y.toFixed(2)).join(' ')})`;
    if (/^FEL/.test(dom)) fel++;
    console.log(`${namn.padEnd(18)} ${rader.length} rutor ${rader[0].t.toFixed(1)}–${rader[rader.length - 1].t.toFixed(1)} s: ${forsta ? `library vid ${forsta.t} s ${forsta.k}` : 'ingen library'}; ${ids.length} hög(ar) som leken; ${dom}`);
    if (LOGG) for (const x of logg) console.log(`    ${String(x.t).padStart(7)} s  ${x.k}`);
  }
  console.log(`lekrepris: ${fel} fel`);
  process.exit(fel ? 1 : 0);
})();

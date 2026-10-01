#!/usr/bin/env node
/* Kör appens egen avkodning och parning (detektor.js) i node, för mätningen
   i dev/detektor/tran/parprov.py: samma kod som appen kör, inte en kopia.

   detektor.js är en vanlig webbläsarfil (<script src>), och repots
   package.json säger "type": "module" — require() hade läst den som en
   ES-modul utan exports. Därför läses den som text och körs med ett eget
   module-objekt.

     node dev/detektor/modell/para_cli.cjs <manifest.json> <ut.json>

   Manifestet: { tro?, para?, bilder: [{ id, W, H, r, ut, matt? }] } där ut är
   en fil med modellens råa utdata (float32, n × 8) och r skalan källa →
   indata. Svaret per bild: kortlådorna efter NMS (kort), remsorna (remsor)
   och de parade kortlådorna (par), allt i källans bildpunkter. */
'use strict';
const fs = require('fs'), path = require('path');

function laddaDetektor() {
  const src = fs.readFileSync(path.join(__dirname, 'detektor.js'), 'utf8');
  const m = { exports: {} };
  new Function('module', 'window', src)(m, undefined);
  return m.exports;
}

function main() {
  const [manifestFil, utFil] = process.argv.slice(2);
  if (!manifestFil || !utFil) { console.error('användning: para_cli.cjs <manifest.json> <ut.json>'); process.exit(2); }
  const D = laddaDetektor();
  const man = JSON.parse(fs.readFileSync(manifestFil, 'utf8'));
  const tro = Object.assign({}, D.T, man.tro || {});
  const ut = [];
  for (const b of man.bilder) {
    const buf = fs.readFileSync(b.ut);
    const ra = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    const a = D.avkoda(ra, b.r, b.W, b.H, tro);
    const par = D.para(a.kort, a.remsor, b.matt || null, man.para || {});
    ut.push({ id: b.id, W: b.W, H: b.H, raKort: a.raKort, raRemsor: a.raRemsor, kort: a.kort, remsor: a.remsor,
              par: par.map(k => ({ x0: k.x0, y0: k.y0, x1: k.x1, y1: k.y1, poang: k.poang, klass: k.klass, ur: k.ur, remsa: k.remsa ? [k.remsa.x0, k.remsa.y0, k.remsa.x1, k.remsa.y1] : null })),
              dubbletter: par.dubbletter, skapade: par.skapade, matt: par.matt });
  }
  fs.writeFileSync(utFil, JSON.stringify({ tro, para: man.para || {}, bilder: ut }));
}

main();

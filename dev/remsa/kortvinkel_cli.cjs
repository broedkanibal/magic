#!/usr/bin/env node
/* Kör appens egen vinkelmätning (KortVinkel i index.html, MES-334 steg 1) i
   node, för bänken dev/remsa/appremsa.py: samma kod som appen kör, inte en
   kopia. IIFE:n klipps ur index.html vid körning (som dev/embed/utdrag.cjs
   gör med Matcher/ORB), så att bänken alltid mäter dagens kod.

     node dev/remsa/kortvinkel_cli.cjs <manifest.json> <ut.json>

   Manifestet: { bilder: [{ id, w, h, gra, lada, remsa? }] } där gra är en fil
   med den grå beskärningen (float32, w × h, radvis — det kortVinkel räknar på
   efter sin nedskalning), lada och remsa {x0,y0,x1,y1} i beskärningens
   bildpunkter. Svaret per bild: vinkelUrGra:s svar — axel, vinkel (full
   riktning eller null), phi, styrka, kalla — eller null. */
'use strict';
const fs = require('fs'), path = require('path');

function laddaKortVinkel() {
  const rot = path.join(__dirname, '..', '..');
  const src = fs.readFileSync(path.join(rot, 'index.html'), 'utf8');
  const start = src.indexOf('const KortVinkel = (() => {');
  if (start < 0) throw new Error('hittar inte KortVinkel i index.html');
  const slut = src.indexOf('\n})();', start);
  if (slut < 0) throw new Error('hittar inte slutet på KortVinkel');
  const kod = src.slice(start, slut + '\n})();'.length);
  return new Function(kod + '\nreturn KortVinkel;')();
}

function main() {
  const [manifestFil, utFil] = process.argv.slice(2);
  if (!manifestFil || !utFil) { console.error('användning: kortvinkel_cli.cjs <manifest.json> <ut.json>'); process.exit(2); }
  const KV = laddaKortVinkel();
  const man = JSON.parse(fs.readFileSync(manifestFil, 'utf8'));
  const ut = [];
  for (const b of man.bilder) {
    const buf = fs.readFileSync(b.gra);
    const g = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    let r = null;
    try { r = KV.vinkelUrGra(g, b.w, b.h, b.lada, b.remsa || null, b.o || {}); } catch (e) { r = { fel: String(e && e.message || e) }; }
    ut.push({ id: b.id, svar: r });
  }
  fs.writeFileSync(utFil, JSON.stringify({ KVOT: KV.KVOT, bilder: ut }));
}

main();

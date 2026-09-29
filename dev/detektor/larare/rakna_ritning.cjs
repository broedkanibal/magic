#!/usr/bin/env node
/* Räknar om Jespers ritning i en lärarmätning (MES-288) med ritverktygets
   egen geometri, dev/golden/rita-geometri.cjs — samma kod som rita.html och
   rita-kontroll.cjs, så att "synlig", "hög", "dold" och lådan runt den
   synliga delen betyder exakt samma sak här. Läses av matt_larare.py.

   node dev/detektor/larare/rakna_ritning.cjs <lagen.json>

   Skriver JSON: { bredd, hojd, grund, lagen: [{ nr, t, klar, kort: [...] }] }
   där varje kort har id, namn, zon, baksida, horn, z och det framräknade:
   synlig, namnrad, dold, tappad, avskuret, hog, synlig_lada och hel_lada
   ([x0, y0, x1, y1] i andelar av bilden). Varje ruta räknas för sig
   (inget arv av högarnas bokstäver), som ritverktyget gör för lärarmätningen. */
'use strict';
const fs = require('fs'), path = require('path');
const G = require(path.join(__dirname, '..', '..', 'golden', 'rita-geometri.cjs'));

const fil = process.argv[2];
if (!fil) { console.error('användning: node rakna_ritning.cjs <lagen.json>'); process.exit(2); }
const doc = JSON.parse(fs.readFileSync(fil, 'utf8'));
const W = doc.bredd, H = doc.hojd, grund = doc.grund || 'v';
if (!(W > 0 && H > 0)) { console.error(`${fil}: bredd/hojd saknas`); process.exit(2); }

const helLada = h => { const xs = h.map(p => p[0]), ys = h.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
const ut = { bredd: W, hojd: H, grund, lagen: [] };
for (const l of doc.lagen || []) {
  const kort = (l.kort || []).map(k => ({ id: k.id, namn: k.namn || '', horn: k.horn, z: k.z, fast: k.fast, zon: k.zon }));
  const r = G.raknaKort(kort, { W, H, grund });
  ut.lagen.push({ nr: l.nr, t: l.t, klar: !!l.klar, kort: kort.map(k => {
    const d = r[k.id];
    return { id: k.id, namn: k.namn, zon: k.zon || null,
      baksida: k.zon === 'bib' || G.arBaksida(k.namn) || G.arLibrary(k.namn),
      horn: k.horn, z: k.z, synlig: d.synlig, namnrad: d.namnrad, dold: d.dold, tappad: d.tappad, avskuret: d.avskuret, hog: d.hog,
      synlig_lada: d.x == null ? null : [d.x, d.y, d.x + d.w, d.y + d.h], hel_lada: helLada(k.horn) };
  }) });
}
process.stdout.write(JSON.stringify(ut));

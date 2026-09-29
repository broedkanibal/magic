'use strict';
/* Grind 1b (MES-288): räknar om de syntetiska bordens facit med ritverktygets
   egen geometri (dev/golden/rita-geometri.cjs) och jämför. Så syns det om
   generatorns synlighet, tappläge och högar betyder samma sak som i facit
   Jesper ritar.

     node dev/detektor/synt/kontroll.cjs [mapp]      standard: …/2026-09-29-mes-288-synt/bilder

   Väntade skillnader (därför toleranser, inte likhet):
   * rita-geometri ser kortet som ett parallellogram ur tre hörn; generatorn
     projicerar med perspektiv, så ett kort som står snett i bilden skiljer
     någon procent;
   * leken (slag `lek`, klassen baksida) skymmer i generatorn med hela sin kontur (sidorna också), i rita
     bara med ovansidan;
   * namnraden: generatorns kort i ficka har namnraden 1,5 mm in från fickans
     kant, rita räknar från konturen — namnraden jämförs därför inte.
   Slutkod 1 om något ligger utanför toleransen. */
const fs = require('fs');
const path = require('path');
const G = require('../../golden/rita-geometri.cjs');

const mapp = process.argv[2] || path.join(__dirname, '..', '..', 'material', 'arbete', '2026-09-29-mes-288-synt', 'bilder');
const TOL_SYNLIG = 0.04;
let fel = 0, kort = 0, bilder = 0, maxd = 0;
const partition = (lista, nyckel) => {
  const g = {};
  for (const k of lista) if (k[nyckel]) (g[k[nyckel]] = g[k[nyckel]] || []).push(k.id);
  return Object.values(g).map(a => a.sort((x, y) => x - y).join(',')).sort().join(' | ');
};
for (const fil of fs.readdirSync(mapp).filter(f => /^synt-\d+\.json$/.test(f)).sort()) {
  const f = JSON.parse(fs.readFileSync(path.join(mapp, fil), 'utf8'));
  bilder++;
  const in_ = f.kort.map(k => ({ id: k.id, namn: k.namn, horn: k.horn, z: k.z, fast: k.fast, zon: k.zon }));
  const r = G.raknaKort(in_, { W: f.bredd, H: f.hojd, grund: 'v' });
  const hogR = f.kort.map(k => ({ id: k.id, hog: r[k.id].hog }));
  const pa = partition(f.kort, 'hog'), pb = partition(hogR, 'hog');
  if (pa !== pb) { fel++; console.log(`${fil}: högarna skiljer\n  generatorn: ${pa}\n  rita:       ${pb}`); }
  for (const k of f.kort) {
    kort++;
    const d = Math.abs(k.synlig - r[k.id].synlig);
    const leken = f.kort.some(o => o.slag === 'lek' && o.z > k.z);   // bara den tjocka leken skymmer med sidorna; ett ensamt kort med baksidan upp är platt
    if (d > maxd && !leken) maxd = d;
    if (d > TOL_SYNLIG && !leken) { fel++; console.log(`${fil} kort ${k.id} (${k.namn}): synlig ${k.synlig} mot rita ${r[k.id].synlig}`); }
    if (k.klass === 'kort' && k.tappad !== r[k.id].tappad) { fel++; console.log(`${fil} kort ${k.id}: tappad ${k.tappad} mot rita ${r[k.id].tappad}`); }
  }
}
console.log(`${bilder} bilder, ${kort} kort: ${fel ? fel + ' avvikelser' : 'synlighet, tappläge och högar stämmer med rita-geometri'} (största skillnad i synlig ${maxd.toFixed(3)}, tolerans ${TOL_SYNLIG})`);
process.exit(fel ? 1 : 0);

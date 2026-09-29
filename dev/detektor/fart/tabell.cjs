'use strict';
/* Gör en markdown-tabell av mätsidans svar (JSON från webb.cjs).

     node dev/detektor/fart/tabell.cjs dev/detektor/fart/resultat/mac-*.json */
const fs = require('fs');
const rader = process.argv.slice(2).flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')).map(r => Object.assign({ kalla: f.split('/').pop() }, r)));
const ordning = ['dfine_n', 'dfine_s', 'yolox_nano', 'yolox_tiny', 'yolox_s'];
rader.sort((a, b) => ordning.indexOf(a.modell) - ordning.indexOf(b.modell) || parseInt(a.storlek) - parseInt(b.storlek) || String(a.backend + a.prec).localeCompare(b.backend + b.prec));
console.log('| Modell | Indata | Backend | Precision | Median ms | p90 ms | varav modellen ms | förb. ms | efter ms | Första anropet ms | Fil MB | Lådor ≥ 0,3 |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of rader) {
  if (r.fel) { console.log(`| ${r.namn} | ${r.storlek} | ${r.backend} | ${r.prec} | fel: ${r.fel.replace(/\|/g, '/')} |||||||| `); continue; }
  console.log(`| ${r.namn} | ${r.storlek} | ${r.backend}${r.tradar ? ' ×' + r.tradar : ''} | ${r.prec} | **${r.median}** | ${r.p90} | ${r.modellsteg} | ${r.forbehandling} | ${r.efterbehandling} | ${r.forstaMs} | ${r.mb} | ${r.lador} |`);
}

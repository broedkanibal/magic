'use strict';
/* Jämför två körningar av bank.html EMBED på samma set, kort för kort:
   samma namn överst? samma säkerhet? hur mycket skiljer marginalen?

     node dev/embed/jamfor.cjs webb-embed-riktiga-webgpu-lokalt webb-embed-riktiga-webgpu-forrakat

   Filerna ligger i dev/embed/cache/resultat/ (bank.html sparar dem dit). */
const fs = require('fs');
const path = require('path');
const las = namn => JSON.parse(fs.readFileSync(path.join(__dirname, 'cache', 'resultat', namn.replace(/\.json$/, '') + '.json'), 'utf8'));
const [an, bn] = process.argv.slice(2);
if (!an || !bn) { console.error('node dev/embed/jamfor.cjs <a> <b>'); process.exit(2); }
const A = las(an), B = las(bn), perFil = new Map(B.rader.map(r => [r.fil, r]));
let sammaNamn = 0, sammaSaker = 0, n = 0; const dm = [], olika = [];
for (const a of A.rader) {
  const b = perFil.get(a.fil); if (!b) continue; n++;
  if (a.gissning === b.gissning) sammaNamn++; else olika.push(`${a.fil}: ${a.gissning} (${a.ratt ? 'rätt' : 'fel'}, marg ${a.marginal}) → ${b.gissning} (${b.ratt ? 'rätt' : 'fel'}, marg ${b.marginal})`);
  if (a.saker === b.saker) sammaSaker++; else if (a.gissning === b.gissning) olika.push(`${a.fil}: ${a.gissning} säker ${a.saker} → ${b.saker} (marg ${a.marginal} → ${b.marginal})`);
  dm.push(Math.abs(a.marginal - b.marginal));
}
dm.sort((x, y) => x - y);
const s = x => x.s[0];
console.log(`${an}: ${s(A).ratt}/${s(A).n} rätt, ${s(A).sakraRatt} säkra rätt, ${s(A).sakraFel} säkra fel`);
console.log(`${bn}: ${s(B).ratt}/${s(B).n} rätt, ${s(B).sakraRatt} säkra rätt, ${s(B).sakraFel} säkra fel`);
console.log(`samma namn överst: ${sammaNamn}/${n}, samma säkerhet: ${sammaSaker}/${n}`);
console.log(`skillnad i marginal: median ${dm[dm.length >> 1].toFixed(4)}, p90 ${dm[Math.floor(dm.length * 0.9)].toFixed(4)}, störst ${dm[dm.length - 1].toFixed(4)}`);
if (A.bygge || B.bygge) console.log(`bygget: ${JSON.stringify(A.bygge)} → ${JSON.stringify(B.bygge)}`);
for (const o of olika) console.log('  ' + o);

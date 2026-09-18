'use strict';
/* Hur nära kommer Node-receptet (lib.cjs receptVektorer, det forrakna.cjs
   laddar upp) webbläsarens egna vektorer (embed.js)? MES-230.

   Facit: cache/resultat/webb-vektorer.json ur
     node dev/embed/webb.cjs bank.html "VEKTORER()" --gpu
   Svar: cosinus mellan samma bild, variant och vridning — per variant, och
   för det bästa och sämsta paret. 1,000 = samma vektor; för jämförelse ger
   fp16 i stället för fp32 ≈ 0,99999, och två olika kort ≈ 0,5–0,8.

     node dev/embed/forrakna-prov.cjs                  alla 105 bilder, förvalen
     node dev/embed/forrakna-prov.cjs --n 20 --prova   de första 20, alla kärnor */
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');

const arg = (namn, forval) => { const i = process.argv.indexOf('--' + namn); return i < 0 ? forval : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const DIM = 512, PER = 8, NAMN = ['skarp 0', 'skarp 90', 'skarp 180', 'skarp 270', 'sudd 0', 'sudd 90', 'sudd 180', 'sudd 270'];

(async () => {
  const facit = JSON.parse(fs.readFileSync(path.join(L.CACHE, 'resultat', 'webb-vektorer.json'), 'utf8'));
  const kort = L.lasLek('lek-golden').slice(0, +arg('n', 1e9));
  const modell = await L.laddaModell('mobileclip-s0', { tradar: 4 });
  const avkoda = b64 => { const b = Buffer.from(b64, 'base64'); return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
  const prov = arg('prova') ? [['lanczos3', 'cubic'], ['mitchell', 'cubic'], ['cubic', 'cubic'], ['linear', 'linear'], ['lanczos3', 'linear'], ['lanczos3', 'mitchell']] : [[arg('karna', L.RECEPT.karna), arg('upp', undefined)]];
  for (const [karna, upp] of prov) {
    const per = NAMN.map(() => []), f16 = [];
    for (const c of kort) {
      const w = facit.vek[c.id]; if (!w) continue;
      const webb = avkoda(w), node = await L.receptVektorer(modell, c.bild, { karna, upp }), rund = L.franF16(L.tillF16(node));
      for (let j = 0; j < PER; j++) {
        const a = webb.subarray(j * DIM, (j + 1) * DIM), b = node.subarray(j * DIM, (j + 1) * DIM);
        per[j].push(L.punkt(a, b));
        f16.push(L.punkt(b, rund.subarray(j * DIM, (j + 1) * DIM)) / Math.sqrt(L.punkt(rund.subarray(j * DIM, (j + 1) * DIM), rund.subarray(j * DIM, (j + 1) * DIM))));
      }
    }
    const alla = per.flat().sort((a, b) => a - b), med = xs => xs.slice().sort((a, b) => a - b)[xs.length >> 1];
    console.log(`\nned: ${karna}, sudd upp: ${upp || 'som ned'} — ${per[0].length} bilder`);
    NAMN.forEach((n, j) => console.log(`  ${n.padEnd(10)} median ${med(per[j]).toFixed(4)}  sämst ${Math.min(...per[j]).toFixed(4)}`));
    console.log(`  ALLA       median ${med(alla).toFixed(4)}  sämst ${alla[0].toFixed(4)}  (fp16 mot fp32: sämst ${Math.min(...f16).toFixed(6)})`);
  }
})().catch(e => { console.error('FEL', e); process.exit(1); });

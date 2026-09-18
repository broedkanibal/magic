'use strict';
/* Åt vilket håll snedvrider golden-videornas kvalitet siffrorna? (Jespers
   tillägg till MES-213.) Golden-fallen ur Mesas kameravy är 1080 px och
   komprimerade två gånger (skärminspelning → H.264 1 Mbit/s), medan appen
   beskär ur 4K. Originalen i 4K finns inte i repot, så provet går åt andra
   hållet: de riktiga beskärningarna FÖRSÄMRAS lika mycket en gång till —
   halva upplösningen och två varv hård jpeg — och mäts om. Tappar modellen
   lite på det är den okänslig för just den skillnaden, och siffrorna ur
   1080-videorna säger ungefär samma sak som 4K skulle ha sagt.

     node dev/embed/forsamra.cjs       → cache/riktiga-forsamrad/ (+ manifest)
     node dev/embed/bank.cjs --set riktiga-forsamrad --modell mobileclip-s0 --centrera --rotar 0,90,180,270 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

(async () => {
  const fran = path.join(__dirname, 'riktiga'), till = path.join(__dirname, 'cache', 'riktiga-forsamrad');
  fs.mkdirSync(till, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(fran, 'manifest.json'), 'utf8'));
  for (const m of manifest) {
    const meta = await sharp(path.join(fran, m.fil)).metadata();
    let b = await sharp(path.join(fran, m.fil)).resize(Math.round(meta.width / 2)).jpeg({ quality: 35 }).toBuffer();
    b = await sharp(b).resize(meta.width, meta.height, { fit: 'fill' }).jpeg({ quality: 35 }).toBuffer();
    fs.writeFileSync(path.join(till, m.fil), b);
  }
  fs.writeFileSync(path.join(till, 'manifest.json'), JSON.stringify(manifest));
  console.log(manifest.length, 'försämrade beskärningar →', path.relative(process.cwd(), till));
})().catch(e => { console.error('FEL', e); process.exit(1); });

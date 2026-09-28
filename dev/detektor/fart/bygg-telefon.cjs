'use strict';
/* Bygger en fristående mapp av mätsidan som kan förhandsdriftsättas och öppnas
   på telefonen (MES-288 grind 0). Driftsätter INGENTING — skriver bara mappen
   och kommandot.

     node dev/detektor/fart/bygg-telefon.cjs                 (förvalda modeller)
     node dev/detektor/fart/bygg-telefon.cjs --alla          (alla filer i modeller/)
     node dev/detektor/fart/bygg-telefon.cjs --ut /tmp/mesa-detektor-fart

   Mappen får samma relativa layout som repot (sidan hittar golden-bilden via
   ../../golden/…), en vercel.json med COOP/COEP (behövs för WASM-trådar, inte
   för WebGPU) och en rotsida som skickar vidare till /dev/detektor/fart/.
   Bara onnxruntime-web 1.30 följer med, och bara de filer den laddar
   (ort.webgpu.min.js + asyncify-bygget) — uppmätt i huvudlös Chrome. */
const fs = require('fs');
const path = require('path');

const FART = __dirname, ROT = path.join(FART, '..', '..', '..');
const argv = process.argv.slice(2);
const varde = (n, f) => { const i = argv.indexOf('--' + n); return i < 0 ? f : argv[i + 1]; };
const UT = path.resolve(varde('ut', path.join(FART, 'ut', 'mesa-detektor-fart')));

/* Telefonens uppsättning = TELEFON i index.html: fp16 för WebGPU med
   shader-f16 (Apple-kretsar, de flesta nyare Android) och YOLOX-nano 960 i fp32
   som reserv. Hålls under ~100 MB, som är vad en Vercel-uppladdning på
   gratisnivån tar (enligt Vercels gränser; inte provat här). */
const FORVALDA = [
  'yolox_nano_640x384_fp16.onnx', 'yolox_nano_960x544_fp16.onnx', 'yolox_nano_1280x736_fp16.onnx', 'yolox_nano_960x544.onnx',
  'yolox_tiny_640x384_fp16.onnx', 'yolox_tiny_960x544_fp16.onnx', 'yolox_tiny_1280x736_fp16.onnx',
  'yolox_s_960x544_fp16.onnx', 'dfine_nano_coco_fp16.onnx', 'kontroll-dog.jpg',
];
const modeller = argv.includes('--alla') ? fs.readdirSync(path.join(FART, 'modeller')).filter(f => /\.(onnx|jpg)$/.test(f)) : FORVALDA;

const kopiera = (fran, till) => { fs.mkdirSync(path.dirname(till), { recursive: true }); fs.copyFileSync(fran, till); return fs.statSync(till).size; };
fs.rmSync(UT, { recursive: true, force: true });
const sida = path.join(UT, 'dev', 'detektor', 'fart');
let summa = 0; const rader = [];
const lagg = (fran, till) => { const b = kopiera(fran, till); summa += b; rader.push([path.relative(UT, till), (b / 1e6).toFixed(1) + ' MB']); };

lagg(path.join(FART, 'index.html'), path.join(sida, 'index.html'));
for (const f of ['ort.webgpu.min.js', 'ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm'])
  lagg(path.join(FART, 'node_modules', 'onnxruntime-web', 'dist', f), path.join(sida, 'node_modules', 'onnxruntime-web', 'dist', f));
for (const f of modeller) {
  const fran = path.join(FART, 'modeller', f);
  if (!fs.existsSync(fran)) { console.error('saknas (kör hamta.sh och exportera först): ' + f); process.exit(1); }
  lagg(fran, path.join(sida, 'modeller', f));
}
const fall = fs.readdirSync(path.join(ROT, 'dev', 'golden', 'fall')).find(d => d.startsWith('13-'));
lagg(path.join(ROT, 'dev', 'golden', 'fall', fall, 'bild.jpg'), path.join(UT, 'dev', 'golden', 'fall', fall, 'bild.jpg'));

fs.writeFileSync(path.join(UT, 'index.html'), '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/dev/detektor/fart/"><a href="/dev/detektor/fart/">Detektorns fart</a>\n');
fs.writeFileSync(path.join(UT, 'vercel.json'), JSON.stringify({
  headers: [{ source: '/(.*)', headers: [
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
    { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  ] }],
}, null, 2) + '\n');

for (const [f, s] of rader) console.log(s.padStart(9), f);
console.log(`\n${(summa / 1e6).toFixed(1)} MB i ${UT}`);
console.log(`\nFörhandsdriftsättning (körs inte av skriptet; ett eget Vercel-projekt, inte Mesas):\n  cd ${UT} && vercel deploy --yes\n`);

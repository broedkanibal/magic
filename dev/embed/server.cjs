'use strict';
/* Statisk server för dev/embed/bank.html. Skillnaden mot python -m http.server:
   sidorna blir "cross-origin isolated" (COOP + COEP), vilket onnxruntime-web
   kräver för att få köra WASM på flera trådar (SharedArrayBuffer). Utan de två
   huvudena går modellen på EN tråd och tiderna blir 2–4 gånger sämre.

     node dev/embed/server.cjs            http://localhost:8377/dev/embed/bank.html
     PORT=9000 node dev/embed/server.cjs

   Roten är repot, så sidan når dev/golden, dev/embed/riktiga, modellerna och
   dev/embed/node_modules/onnxruntime-web. Bara läsning, bara localhost. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..', '..');
const PORT = +(process.env.PORT || 8377);
const TYP = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.cjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.wasm': 'application/wasm', '.onnx': 'application/octet-stream',
  '.css': 'text/css; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml' };

http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
  /* Bänksidans resultat till disk: POST /spara/<namn>.json → dev/embed/cache/resultat/. */
  const sp = req.method === 'POST' && p.match(/^\/spara\/([\w.-]+\.json)$/);
  if (sp) {
    const bitar = []; req.on('data', b => bitar.push(b)).on('end', () => {
      const mapp = path.join(__dirname, 'cache', 'resultat'); fs.mkdirSync(mapp, { recursive: true });
      fs.writeFileSync(path.join(mapp, sp[1]), Buffer.concat(bitar));
      res.writeHead(204, { 'Cross-Origin-Resource-Policy': 'cross-origin' }); res.end();
    });
    return;
  }
  const fil = path.normalize(path.join(ROT, p));
  if (!fil.startsWith(ROT)) { res.writeHead(403); return res.end(); }
  fs.stat(fil, (fel, st) => {
    if (fel || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('finns inte: ' + p); }
    res.writeHead(200, {
      'Content-Type': TYP[path.extname(fil).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cache-Control': /\.(onnx|wasm)$/.test(fil) ? 'max-age=3600' : 'no-cache',
    });
    fs.createReadStream(fil).pipe(res);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`embed-bänken på http://localhost:${PORT}/dev/embed/bank.html`));

'use strict';
/* Statisk server för mätsidan (MES-288 grind 0), som dev/embed/server.cjs:
   sidan blir "cross-origin isolated" (COOP + COEP), så att onnxruntime-web får
   köra WASM på flera trådar. Roten är repot, så sidan når golden-bilden.

     node dev/detektor/fart/server.cjs         http://localhost:8391/dev/detektor/fart/
     PORT=9000 node dev/detektor/fart/server.cjs

   Bara läsning, bara localhost. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROT = process.env.ROT ? path.resolve(process.env.ROT) : path.join(__dirname, '..', '..', '..');   // ROT=<mapp> provar bygg-telefon.cjs utdata
const PORT = +(process.env.PORT || 8391);
const TYP = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.wasm': 'application/wasm', '.onnx': 'application/octet-stream' };

http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (p.endsWith('/')) p += 'index.html';
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
}).listen(PORT, '127.0.0.1', () => console.log(`detektorns fart på http://localhost:${PORT}/dev/detektor/fart/`));

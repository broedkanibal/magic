#!/usr/bin/env node
/* Liten filserver för granska.html — mätverktyg, inte appkod.
   Skillnaden mot `python3 -m http.server`: den här svarar på Range, alltså
   "ge mig bitarna från sekund 60", som en video behöver för att gå att spola.
   Kör från repots rot:  node dev/golden/granska-server.cjs [port]        */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), url = require('url');
const rot = process.cwd();
const port = Number(process.env.PORT || process.argv[2] || 8765);
const typer = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.tsv': 'text/tab-separated-values; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.mp4': 'video/mp4', '.mov': 'video/quicktime',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };

http.createServer((req, res) => {
  let p = decodeURIComponent(url.parse(req.url).pathname);
  if (p.endsWith('/')) p += 'index.html';
  const fil = path.join(rot, p);
  if (!fil.startsWith(rot)) { res.writeHead(403).end('utanför roten'); return; }
  fs.stat(fil, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404).end('hittar inte ' + p); return; }
    const typ = typer[path.extname(fil).toLowerCase()] || 'application/octet-stream';
    const huvud = { 'Content-Type': typ, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
    const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (range) {
      let start = range[1] === '' ? st.size - Number(range[2]) : Number(range[1]);
      let slut = range[2] === '' || range[1] === '' ? st.size - 1 : Number(range[2]);
      start = Math.max(0, start); slut = Math.min(st.size - 1, slut);
      if (start > slut) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }).end(); return; }
      res.writeHead(206, { ...huvud, 'Content-Range': `bytes ${start}-${slut}/${st.size}`, 'Content-Length': slut - start + 1 });
      if (req.method !== 'HEAD') fs.createReadStream(fil, { start, end: slut }).pipe(res); else res.end();
      return;
    }
    res.writeHead(200, { ...huvud, 'Content-Length': st.size });
    if (req.method !== 'HEAD') fs.createReadStream(fil).pipe(res); else res.end();
  });
}).listen(port, () => console.log(`granska-server: http://localhost:${port}/dev/golden/granska.html`));

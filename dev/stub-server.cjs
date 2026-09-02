/* Liten teststubb: serverar mappen och svarar på /api/identify utan att
   anropa Anthropic. Används bara för att verifiera klientkopplingen. */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = __dirname + '/..';
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.md':'text/markdown' };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/api/identify') {
    if (req.method === 'OPTIONS') { res.writeHead(204, cors()); return res.end(); }
    if (req.method === 'GET') {
      res.writeHead(200, Object.assign({ 'Content-Type':'application/json' }, cors()));
      return res.end(JSON.stringify({ ok:true, ready:true, model:'stub-model' }));
    }
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      let n = 0, names = [];
      try { const j = JSON.parse(body); names = j.names || []; n = names.length ? 1 : 0;
            console.log(`stub: ${names.length} kandidater, bild ${Math.round((j.image||'').length/1024)} kB`); }
      catch (e) { console.log('stub: trasig body'); }
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors()));
      res.end(JSON.stringify({ n, sakerhet: 'hog' }));
    });
    return;
  }
  const f = path.join(ROOT, u.pathname === '/' ? 'index.html' : u.pathname);
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(d);
  });
}).listen(8232, () => console.log('stub på http://localhost:8232'));
function cors(){ return { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'Content-Type,X-Group-Password' }; }

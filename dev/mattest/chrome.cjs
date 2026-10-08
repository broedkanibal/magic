/* Filservern och Chrome för uppspelaren (MES-333), som dev/mattan.cjs:
   egen server på 127.0.0.1 med en port systemet väljer, egen tillfällig
   Chrome-profil, nätet utanför datorn spärrat. .cjs eftersom package.json
   säger "type": "module". */
'use strict';
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os'), http = require('http');
const ROT = path.join(__dirname, '..', '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const vanta = ms => new Promise(r => setTimeout(r, ms));

const TYPER = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.cjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.mp4': 'video/mp4' };
/* index.html (eller fil) på / och /app.html, resten ur repot (bara läsning,
   inga punktkataloger). dev/material är en symlänk i en worktree: den får
   läsas, men bara under dev/material. extra: { '/sökväg': () => Buffer|string }
   för fallens data. Video med Range, så att visaren kan spola. */
function server(fil, extra) {
  const MATERIAL = path.join(ROT, 'dev', 'material');
  return new Promise(res => {
    const s = http.createServer((req, ut) => {
      const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (extra && extra[u]) { const d = extra[u](); ut.writeHead(200, { 'Content-Type': TYPER[path.extname(u)] || 'application/json', 'Cache-Control': 'no-store' }); return ut.end(d); }
      /* /app.html: appen med uppspelarens motor FÖRST i sidan, så att den
         hinner fånga timrarna och ResizeObserver som appen ställer när den
         startar (motor.js). Motorn gör ingenting förrän uppspelningen börjar. */
      if (u === '/app.html') {
        return fs.readFile(fil, 'utf8', (fel, html) => {
          if (fel) { ut.writeHead(404); return ut.end(); }
          const tag = '<script src="/dev/uppspelaren/motor.js"></script>';
          const m = /<head[^>]*>/i.exec(html);
          ut.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
          ut.end(m ? html.slice(0, m.index + m[0].length) + tag + html.slice(m.index + m[0].length) : tag + html);
        });
      }
      const malet = u === '/' || u === '/index.html' ? fil : path.join(ROT, path.normalize(u));
      if (u.split('/').some(d => d.startsWith('.')) || (malet !== fil && !malet.startsWith(ROT + path.sep))) { ut.writeHead(404); return ut.end(); }
      let verklig = malet;
      try { verklig = fs.realpathSync(malet); } catch (e) { ut.writeHead(404); return ut.end(); }
      const realMat = fs.existsSync(MATERIAL) ? fs.realpathSync(MATERIAL) : null;
      if (verklig !== fs.realpathSync(fil) && !verklig.startsWith(fs.realpathSync(ROT) + path.sep) && !(realMat && verklig.startsWith(realMat + path.sep))) { ut.writeHead(404); return ut.end(); }
      fs.stat(verklig, (fel, st) => {
        if (fel || !st.isFile()) { ut.writeHead(404); return ut.end(); }
        const typ = TYPER[path.extname(verklig)] || 'application/octet-stream';
        const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
        if (range) {
          const a = range[1] ? +range[1] : 0, b = range[2] ? +range[2] : st.size - 1;
          ut.writeHead(206, { 'Content-Type': typ, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': b - a + 1, 'Cache-Control': 'no-store' });
          return fs.createReadStream(verklig, { start: a, end: b }).pipe(ut);
        }
        ut.writeHead(200, { 'Content-Type': typ, 'Content-Length': st.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
        fs.createReadStream(verklig).pipe(ut);
      });
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}

/* Chrome via DevTools-protokollet. */
async function chrome(opt) {
  opt = opt || {};
  if (!fs.existsSync(CHROME)) { const e = new Error('hittar inte Chrome på ' + CHROME + ' (sätt CHROME=…)'); e.kod = 2; throw e; }
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-uppspelaren-'));
  const [bw, bh] = opt.storlek || [1400, 1000];
  const p = spawn(CHROME, [opt.visa ? '' : '--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profil, '--no-first-run',
    '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required', `--window-size=${bw},${bh}`, 'about:blank'].filter(Boolean), { stdio: ['ignore', 'ignore', 'pipe'] });
  let ws = null, err = '';
  p.stderr.on('data', d => { err += d; const m = err.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) ws = m[1]; });
  const t0 = Date.now();
  while (!ws) { if (Date.now() - t0 > 15000) throw new Error('Chrome svarade inte (DevTools-porten)'); await vanta(50); }
  const port = new URL(ws).port;
  let sida = null;
  while (!sida) { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); sida = l.find(t => t.type === 'page'); if (!sida) await vanta(50); }
  const sock = new WebSocket(sida.webSocketDebuggerUrl);
  await new Promise((res, rej) => { sock.onopen = res; sock.onerror = rej; });
  let nr = 0; const svar = new Map(), konsol = [];
  sock.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && svar.has(m.id)) { svar.get(m.id)(m); svar.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') konsol.push('undantag: ' + ((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text));
  };
  const cdp = (method, params) => new Promise((res, rej) => {
    const id = ++nr; svar.set(id, m => m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result));
    sock.send(JSON.stringify({ id, method, params: params || {} }));
  });
  const stang = async () => {
    try { await cdp('Browser.close'); } catch (e) {}
    for (let i = 0; i < 40 && p.exitCode == null; i++) await vanta(50);
    if (p.exitCode == null) p.kill();
    try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {}
  };
  await cdp('Runtime.enable'); await cdp('Page.enable'); await cdp('Network.enable');
  await cdp('Network.setBlockedURLs', { urls: ['*scryfall*', '*supabase*', '*jsdelivr*', '*unpkg*', '*googleapis*', '*gstatic*', '*cdnjs*', '*anthropic*', '*huggingface*'] });
  await cdp('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  /* Sidans yta exakt (fönstrets egen ram skiljer mellan Chrome-versioner):
     mattans storlek och zoom beror på den. */
  if (!opt.visa) await cdp('Emulation.setDeviceMetricsOverride', { width: bw, height: bh, deviceScaleFactor: 1, mobile: false });
  /* Värdet ur ett uttryck; ett undantag i sidan blir ett fel här. */
  const ev = async (expr, opt2) => {
    const r = await cdp('Runtime.evaluate', Object.assign({ expression: expr, returnByValue: true, awaitPromise: true }, opt2 || {}));
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text);
    return r.result.value;
  };
  return { cdp, ev, stang, konsol };
}
/* Väntar tills appen laddat (renderGrid och avstamBord finns). */
async function vantaApp(c, tak) {
  const t0 = Date.now();
  for (;;) {
    const ok = await c.ev("document.readyState === 'complete' && typeof renderGrid === 'function' && typeof avstamBord === 'function' && typeof matSynk === 'function'").catch(() => false);
    if (ok) return;
    if (Date.now() - t0 > (tak || 30000)) throw new Error('appen laddade inte (renderGrid/avstamBord/matSynk saknas)');
    await vanta(100);
  }
}
module.exports = { server, chrome, vantaApp, vanta, ROT };

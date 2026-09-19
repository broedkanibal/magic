#!/usr/bin/env node
/* Kör bildmodellen och ORB — kedjans egna — på beskärningar ur inspelningen.
   Kör: node dev/las-fore-slapp/las.cjs --jobb <jobb.json> --ut <svar.json> [--port 8290]

   Samma skarv som dev/golden/vriden.cjs: attrappen startas på en egen port,
   en huvudlös Chrome öppnar dev/las-fore-slapp/las.html, sidan laddar
   index.html i en iframe, bygger golden-poolen ur dev/golden/lek.txt och
   frågar kedjans EGNA funktioner (Embed.identifiera, identifyMedModell,
   serUtSomKort). Ingenting i index.html ändras.

   Bilderna hämtas ur mappen `dev/las-fore-slapp/bilder` (en länk till
   scratchpaden; gitignorerad). jobb.json ligger i samma mapp.

   --profil <mapp> återanvänder en Chrome-profil, så att modellvikterna och
   lekens vektorer inte hämtas om vid varje körning. */
'use strict';
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os'), net = require('net');
const ROT = path.join(__dirname, '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const JOBB = arg('--jobb', ''), UT = arg('--ut', ''), PROFIL_ARG = arg('--profil', '');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CDP_TAK_MS = 180000, TAK_MS = 180 * 60 * 1000;
const vanta = ms => new Promise(r => setTimeout(r, ms));
const ledigPort = () => new Promise((res, rej) => { const s = net.createServer(); s.on('error', rej); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
let doende = null;
async function tills(f, ms, vad) { const t0 = Date.now(); for (;;) { if (doende) throw doende; const v = await f().catch(e => { if (e && e.fatal) throw e; return null; }); if (v) return v; if (Date.now() - t0 > ms) throw new Error('väntade förgäves på ' + vad); await vanta(250); } }

(async () => {
  if (!JOBB) { console.error('--jobb <fil.json> krävs (namnet i mappen bilder/)'); process.exit(2); }
  if (!fs.existsSync(CHROME)) { console.error('Hittar inte Chrome på ' + CHROME); process.exit(2); }
  const PORT = +arg('--port', 0) || await ledigPort();
  let chrome = null, ws = null, server = null, profil = null, egenProfil = false, slutat = false, nr = 0;
  const svar = new Map();
  const dog = vad => { if (slutat) return; doende = doende || Object.assign(new Error(vad), { fatal: true }); for (const s of svar.values()) s.rej(doende); svar.clear(); };
  const stang = async () => {
    if (slutat) return; slutat = true;
    try { ws && ws.close(); } catch (e) {}
    try { server && server.kill(); } catch (e) {}
    if (chrome && chrome.exitCode === null && chrome.signalCode === null)
      await new Promise(res => { const t = setTimeout(res, 5000); chrome.once('exit', () => { clearTimeout(t); res(); }); try { chrome.kill(); } catch (e) { res(); } });
    if (egenProfil) { try { profil && fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {} }
  };
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, async () => { await stang(); process.exit(130); });
  try {
    server = spawn(process.execPath, [path.join(ROT, 'dev', 'stub-server.cjs')], { env: Object.assign({}, process.env, { PORT: String(PORT) }), stdio: ['ignore', 'pipe', 'pipe'] });
    server.stderr.on('data', () => {});
    await new Promise((res, rej) => {
      let ut = '';
      const tid = setTimeout(() => rej(new Error('attrappen startade inte på 10 s')), 10000);
      server.stdout.on('data', d => { if (ut === null) return; ut += d; if (/stub på/.test(ut)) { ut = null; clearTimeout(tid); res(); } });
      server.once('exit', k => { clearTimeout(tid); rej(new Error(`attrappen slutade (kod ${k}) innan den lyssnade — är port ${PORT} upptagen?`)); });
    });
    server.on('exit', k => dog(`attrappen slutade mitt i körningen (kod ${k})`));
    if (PROFIL_ARG) { profil = PROFIL_ARG; fs.mkdirSync(profil, { recursive: true }); }
    else { profil = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-las-')); egenProfil = true; }
    chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profil,
      '--no-first-run', '--no-default-browser-check', '--window-size=1400,1000',
      '--enable-unsafe-webgpu', '--enable-features=Vulkan', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
    chrome.on('exit', k => dog(`Chrome slutade (kod ${k})`));
    let wsUrl = null, stderr = '';
    chrome.stderr.on('data', d => { if (wsUrl) return; stderr += d; const m = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) wsUrl = m[1]; });
    await tills(async () => wsUrl, 20000, 'Chrome (DevTools-porten)');
    const sida = await tills(async () => (await (await fetch(`http://127.0.0.1:${new URL(wsUrl).port}/json/list`)).json()).find(t => t.type === 'page'), 10000, 'en sida i Chrome');
    ws = new WebSocket(sida.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('kunde inte ansluta till Chrome')); });
    ws.onclose = () => dog('förbindelsen till Chrome stängdes');
    ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && svar.has(m.id)) { const s = svar.get(m.id); svar.delete(m.id); s.res(m); }
      else if (m.method === 'Runtime.exceptionThrown') console.error('  [sidan] ' + ((m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description) || m.params.exceptionDetails.text).split('\n')[0]); };
    const cdp = (method, params) => new Promise((res, rej) => {
      if (doende) return rej(doende);
      const id = ++nr, tid = setTimeout(() => { svar.delete(id); rej(Object.assign(new Error(`${method} svarade inte på ${CDP_TAK_MS / 1000} s`), { fatal: true })); }, CDP_TAK_MS);
      svar.set(id, { res: m => { clearTimeout(tid); res(m); }, rej: e => { clearTimeout(tid); rej(e); } });
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
    const kor = async uttryck => { const r = await cdp('Runtime.evaluate', { expression: uttryck, awaitPromise: true, returnByValue: true }); return r.result && r.result.result ? r.result.result.value : undefined; };
    await cdp('Runtime.enable');
    await cdp('Page.navigate', { url: `http://localhost:${PORT}/dev/las-fore-slapp/las.html?jobb=${encodeURIComponent(JOBB)}` });
    let sist = '';
    const slut = await tills(async () => {
      const s = await kor(`(document.querySelector('#status') || {}).textContent || ''`) || '';
      if (s !== sist) { sist = s; process.stdout.write('\r  ' + s.padEnd(90).slice(0, 90)); }
      if (/^Fel/.test(s)) throw Object.assign(new Error(s), { fatal: true });
      return /^Klar/.test(s) ? s : null;
    }, TAK_MS, 'körningen');
    console.log('\r' + ''.padEnd(92) + '\r' + slut);
    const res = await kor('JSON.stringify(window.RES)');
    if (UT) { fs.writeFileSync(UT, res + '\n'); console.log('skrivet: ' + UT); }
    else console.log(res);
    await stang();
    process.exit(0);
  } catch (e) { console.error('\nlas.cjs: ' + ((e && e.message) || e)); await stang(); process.exit(2); }
})();

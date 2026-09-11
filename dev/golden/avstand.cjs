#!/usr/bin/env node
/* Avståndsprovet från terminalen. Kör: node dev/golden/avstand.cjs [--fall 01,02] [--faktorer 1,0.5] [--json <fil>] [--port <n>]

   Startar attrappen, öppnar dev/golden/avstand.html i en huvudlös Chrome
   och skriver det sidan mätt: varje stillbildsfall skalat ner steg för steg
   (samma bord på längre håll) genom hela kamerakedjan, och vilket golv i
   kedjan som ger vika först — se avstand.html för vad som mäts och varför.
   Ingen baslinje, ingen dom: slutkod 0 efter en genomförd mätning oavsett
   siffrorna (det är ett mått, inte en spärr), 2 bara om körningen inte gick
   att genomföra (ingen Chrome, sidan föll).

   --fall 01,03      bara fallen vars mapp börjar så (videofall körs aldrig)
   --faktorer 1,0.5  andra skalfaktorer än 1, 0,8, 0,65, 0,5, 0,4, 0,3
   --json <fil>      hela resultatet som JSON (varje fall × faktor med spåren)

   Samma skarv som kor.cjs — se den för varför en huvudlös Chrome. Poolen
   och namnläsaren behövs (fallen ska namnges), så profilen ligger kvar
   mellan körningarna (os.tmpdir()/mesa-avstand-profil): första körningen
   bygger poolen (en minut), de följande inte — förutsatt samma port, för
   poolen ligger i appens IndexedDB, vars nyckel är host+port (därför en
   fast standardport, 8240, och inte en ledig som vriden.cjs tar). En egen
   profil och inte kor.cjs:s: två Chrome med samma profil samtidigt går
   inte, och kor.cjs ska kunna köra i ett annat fönster under tiden.

   Utan --port tas en ledig port, och körningen väntar på att just vår
   attrapp säger att den lyssnar, som vriden.cjs. Dör attrappen, Chrome
   eller förbindelsen mitt i körningen slutar den med ett fel i stället för
   att vänta för evigt. */
'use strict';
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os'), net = require('net');
const ROT = path.join(__dirname, '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const FALL = arg('--fall', ''), FAKTORER = arg('--faktorer', ''), JSONFIL = arg('--json', '');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CDP_TAK_MS = 120000;   // ett enskilt anrop till sidan; hela körningen har sitt eget tak nedan
/* Sex fall × sex faktorer, var och en med kor.html:s tak på 30 s, plus
   poolbygget första gången: 45 minuter räcker med marginal. */
const KOR_TAK_MS = 45 * 60 * 1000;
const vanta = ms => new Promise(r => setTimeout(r, ms));
const ledigPort = () => new Promise((res, rej) => { const s = net.createServer(); s.on('error', rej); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
let doende = null;             // första felet från attrappen, Chrome eller förbindelsen — avbryter all väntan
async function tills(f, ms, vad) { const t0 = Date.now(); for (;;) { if (doende) throw doende; const v = await f().catch(e => { if (e && e.fatal) throw e; return null; }); if (v) return v; if (Date.now() - t0 > ms) throw new Error('väntade förgäves på ' + vad); await vanta(250); } }

(async () => {
  if (!fs.existsSync(CHROME)) { console.error('Hittar inte Chrome på ' + CHROME + ' — sätt CHROME=/sökväg/till/Chrome'); process.exit(2); }
  const PORT = +arg('--port', 8240);   // fast port: poolen cachas i IndexedDB per ursprung (host+port) — en ny port per körning byggde om poolen varje gång
  let chrome = null, ws = null, server = null, slutat = false, nr = 0;
  const svar = new Map();      // id → { res, rej } för anrop som väntar på sidan
  const dog = vad => { if (slutat) return; doende = doende || Object.assign(new Error(vad), { fatal: true }); for (const s of svar.values()) s.rej(doende); svar.clear(); };
  const stang = async () => {
    if (slutat) return; slutat = true;
    try { ws && ws.close(); } catch (e) {}
    try { server && server.kill(); } catch (e) {}
    /* Chrome får skriva klart i profilen innan vi går: den ska ligga kvar hel till nästa körning. */
    if (chrome && chrome.exitCode === null && chrome.signalCode === null)
      await new Promise(res => { const t = setTimeout(res, 5000); chrome.once('exit', () => { clearTimeout(t); res(); }); try { chrome.kill(); } catch (e) { res(); } });
  };
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, async () => { await stang(); process.exit(130); });
  try {
    server = spawn(process.execPath, [path.join(ROT, 'dev', 'stub-server.cjs')], { env: Object.assign({}, process.env, { PORT: String(PORT) }), stdio: ['ignore', 'pipe', 'pipe'] });
    server.stderr.on('data', () => {});
    /* "stub på …" skrivs när listen() lyckats: först då vet vi att porten är vår. */
    await new Promise((res, rej) => {
      let ut = '';
      const tid = setTimeout(() => rej(new Error('attrappen startade inte på 10 s')), 10000);
      server.stdout.on('data', d => { if (ut === null) return; ut += d; if (/stub på/.test(ut)) { ut = null; clearTimeout(tid); res(); } });
      server.once('exit', k => { clearTimeout(tid); rej(new Error(`attrappen slutade (kod ${k}) innan den lyssnade — är port ${PORT} upptagen?`)); });
    });
    server.on('exit', k => dog(`attrappen slutade mitt i körningen (kod ${k})`));
    const profil = path.join(os.tmpdir(), 'mesa-avstand-profil');
    chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profil, '--no-first-run', '--no-default-browser-check', '--window-size=1400,1000', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
    chrome.on('exit', k => dog(`Chrome slutade (kod ${k})`));
    let wsUrl = null, stderr = '';
    chrome.stderr.on('data', d => { if (wsUrl) return; stderr += d; const m = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) wsUrl = m[1]; });
    await tills(async () => wsUrl, 15000, 'Chrome (DevTools-porten)');
    const sida = await tills(async () => (await (await fetch(`http://127.0.0.1:${new URL(wsUrl).port}/json/list`)).json()).find(t => t.type === 'page'), 10000, 'en sida i Chrome');
    ws = new WebSocket(sida.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('kunde inte ansluta till Chrome')); });
    ws.onclose = () => dog('förbindelsen till Chrome stängdes');
    ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && svar.has(m.id)) { const s = svar.get(m.id); svar.delete(m.id); s.res(m); }
      else if (m.method === 'Runtime.exceptionThrown') console.error('  [sidan] ' + (m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text).split('\n')[0]); };
    const cdp = (method, params) => new Promise((res, rej) => {
      if (doende) return rej(doende);
      const id = ++nr, tid = setTimeout(() => { svar.delete(id); rej(Object.assign(new Error(`${method} svarade inte på ${CDP_TAK_MS / 1000} s`), { fatal: true })); }, CDP_TAK_MS);
      svar.set(id, { res: m => { clearTimeout(tid); res(m); }, rej: e => { clearTimeout(tid); rej(e); } });
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
    const kor = async uttryck => { const r = await cdp('Runtime.evaluate', { expression: uttryck, awaitPromise: true, returnByValue: true }); return r.result && r.result.result ? r.result.result.value : undefined; };
    await cdp('Runtime.enable');
    const q = new URLSearchParams(); if (FALL) q.set('fall', FALL); if (FAKTORER) q.set('faktorer', FAKTORER);
    await cdp('Page.navigate', { url: `http://localhost:${PORT}/dev/golden/avstand.html${q.size ? '?' + q : ''}` });
    let sist = '';
    const slut = await tills(async () => {
      const s = await kor(`(document.querySelector('#status') || {}).textContent || ''`) || '';
      if (s !== sist) { sist = s; process.stdout.write('\r  ' + s.padEnd(78).slice(0, 78)); }
      if (/^Fel/.test(s)) throw Object.assign(new Error(s), { fatal: true });
      return /^Klar/.test(s) ? s : null;
    }, KOR_TAK_MS, 'körningen');
    console.log('\r' + ''.padEnd(80) + '\n' + await kor(`document.querySelector('#ut').textContent`) + '\n\n' + slut);
    if (JSONFIL) { fs.writeFileSync(JSONFIL, JSON.stringify(await kor('window.RES'), null, 1) + '\n'); console.log('skrivet: ' + JSONFIL); }
    await stang();
    process.exit(0);
  } catch (e) { console.error('\navstand.cjs: ' + (e && e.message || e)); await stang(); process.exit(2); }
})();

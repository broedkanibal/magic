#!/usr/bin/env node
/* Vridna kort från terminalen. Kör: node dev/golden/vriden.cjs [--del a|b] [--json <fil>] [--port <n>]

   Startar attrappen, öppnar dev/golden/vriden.html i en huvudlös Chrome och
   skriver det sidan mätt: skräpfiltret (serUtSomKort) mot golden-kort
   inklistrade i vinkel på bordet, och mot bitar av bordet utan kort.
   Slutkod 1 om ett vridet kort blir skräp, en vriden bit av bordet (minst
   10° från en axel) godkänns, eller en vinkel inte fick ett enda mätt kort;
   raka bitar som godkänns skrivs ut men fäller inte körningen. Slutkod 2 om
   körningen inte gick att genomföra. Samma skarv som kor.cjs — se den för
   varför en huvudlös Chrome. Ingen pool och ingen namnläsare behövs, så
   profilen är en egen, tom och tas bort efteråt.

   Utan --port tas en ledig port, och körningen väntar på att just vår
   attrapp säger att den lyssnar: svarade en annan attrapp på porten (en
   annan session, ett annat arbetsträd) hade provet annars mätt dess kod.
   Dör attrappen, Chrome eller förbindelsen mitt i körningen slutar den med
   ett fel i stället för att vänta för evigt. */
'use strict';
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os'), net = require('net');
const ROT = path.join(__dirname, '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const DEL = arg('--del', 'ab'), JSONFIL = arg('--json', '');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CDP_TAK_MS = 120000;   // ett enskilt anrop till sidan; hela körningen har sitt eget tak nedan
const vanta = ms => new Promise(r => setTimeout(r, ms));
const ledigPort = () => new Promise((res, rej) => { const s = net.createServer(); s.on('error', rej); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
let doende = null;             // första felet från attrappen, Chrome eller förbindelsen — avbryter all väntan
async function tills(f, ms, vad) { const t0 = Date.now(); for (;;) { if (doende) throw doende; const v = await f().catch(e => { if (e && e.fatal) throw e; return null; }); if (v) return v; if (Date.now() - t0 > ms) throw new Error('väntade förgäves på ' + vad); await vanta(250); } }

(async () => {
  if (!fs.existsSync(CHROME)) { console.error('Hittar inte Chrome på ' + CHROME + ' — sätt CHROME=/sökväg/till/Chrome'); process.exit(2); }
  const PORT = +arg('--port', 0) || await ledigPort();
  let chrome = null, ws = null, server = null, profil = null, slutat = false, nr = 0;
  const svar = new Map();      // id → { res, rej } för anrop som väntar på sidan
  const dog = vad => { if (slutat) return; doende = doende || Object.assign(new Error(vad), { fatal: true }); for (const s of svar.values()) s.rej(doende); svar.clear(); };
  const stang = async () => {
    if (slutat) return; slutat = true;
    try { ws && ws.close(); } catch (e) {}
    try { server && server.kill(); } catch (e) {}
    /* Profilen tas bort först när Chrome slutat: den skriver i mappen till
       sista stund, och en rmSync medan den stängde lämnade mappen kvar
       (sex körningar, sex mappar i TMPDIR). */
    if (chrome && chrome.exitCode === null && chrome.signalCode === null)
      await new Promise(res => { const t = setTimeout(res, 5000); chrome.once('exit', () => { clearTimeout(t); res(); }); try { chrome.kill(); } catch (e) { res(); } });
    try { profil && fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {}
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
    profil = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-vriden-'));
    chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profil, '--no-first-run', '--no-default-browser-check', '--window-size=1200,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
    await cdp('Page.navigate', { url: `http://localhost:${PORT}/dev/golden/vriden.html?del=${encodeURIComponent(DEL)}` });
    let sist = '';
    const slut = await tills(async () => {
      const s = await kor(`(document.querySelector('#status') || {}).textContent || ''`) || '';
      if (s !== sist) { sist = s; process.stdout.write('\r  ' + s.padEnd(70).slice(0, 70)); }
      if (/^Fel/.test(s)) throw Object.assign(new Error(s), { fatal: true });
      return /^Klar/.test(s) ? s : null;
    }, 20 * 60 * 1000, 'körningen');
    console.log('\r' + ''.padEnd(72) + '\n' + await kor(`document.querySelector('#ut').textContent`) + '\n\n' + slut);
    if (JSONFIL) { fs.writeFileSync(JSONFIL, JSON.stringify(await kor('window.RES'), null, 1) + '\n'); console.log('skrivet: ' + JSONFIL); }
    const samre = await kor('window.SAMRE');
    await stang();
    process.exit(samre ? 1 : 0);
  } catch (e) { console.error('\nvriden.cjs: ' + (e && e.message || e)); await stang(); process.exit(2); }
})();

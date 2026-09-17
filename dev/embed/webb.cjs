'use strict';
/* Kör ett uttryck på en av bänkens sidor i en huvudlös Chrome och skriver
   svaret — samma knep som dev/golden/kor.cjs: en huvudlös Chrome räknas som
   synlig och stryps inte, medan browserpanelens flik är dold (trådarna fick
   p90 2,9 s där mot 0,2 s här). Startar dev/embed/server.cjs på en egen port.

     node dev/embed/webb.cjs tid.html "MAT('mobileclip-s0-vision.onnx','wasm',256)"
     node dev/embed/webb.cjs bank.html "ORBBAS('riktiga')" --tak 900
     node dev/embed/webb.cjs tid.html "…" --gpu          (WebGPU: Chrome med --enable-unsafe-webgpu)

   Svaret (JSON) skrivs på stdout. */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const arg = (namn, forval) => { const i = process.argv.indexOf('--' + namn); return i < 0 ? forval : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const PORT = +arg('port', 8378), TAK = +arg('tak', 600) * 1000;
const [sida, uttryck] = process.argv.slice(2).filter(a => !a.startsWith('--') && a !== String(arg('port')) && a !== String(arg('tak')));
const vanta = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  if (!sida || !uttryck) { console.error('node dev/embed/webb.cjs <sida.html> "<uttryck>"'); process.exit(2); }
  const server = spawn(process.execPath, [path.join(__dirname, 'server.cjs')], { env: Object.assign({}, process.env, { PORT: String(PORT) }), stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise(r => server.stdout.once('data', r));
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-embed-'));
  const flaggor = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profil, '--no-first-run', '--no-default-browser-check', '--window-size=1200,900'];
  if (arg('gpu')) flaggor.push('--enable-unsafe-webgpu', '--enable-features=WebGPU', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist');
  const chrome = spawn(CHROME, flaggor.concat(['about:blank']), { stdio: ['ignore', 'ignore', 'pipe'] });
  let wsPort = null; chrome.stderr.on('data', d => { const m = String(d).match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//); if (m) wsPort = +m[1]; });
  const stang = async kod => { try { chrome.kill(); } catch (e) {} try { server.kill(); } catch (e) {} await vanta(800); try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {} process.exit(kod); };
  for (let i = 0; i < 150 && !wsPort; i++) await vanta(100);
  if (!wsPort) { console.error('Chrome startade inte'); return stang(1); }
  let mal = null; for (let i = 0; i < 100 && !mal; i++) { try { mal = (await (await fetch(`http://127.0.0.1:${wsPort}/json/list`)).json()).find(t => t.type === 'page'); } catch (e) {} if (!mal) await vanta(100); }
  const ws = new WebSocket(mal.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let nr = 0; const vantar = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && vantar.has(m.id)) { vantar.get(m.id)(m); vantar.delete(m.id); } else if (m.method === 'Runtime.consoleAPICalled' && arg('logg')) console.error('  [sidan]', m.params.args.map(a => a.value).join(' ')); };
  const skicka = (method, params) => new Promise(r => { const id = ++nr; vantar.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  await skicka('Runtime.enable'); await skicka('Page.enable');
  await skicka('Page.navigate', { url: `http://127.0.0.1:${PORT}/dev/embed/${sida}` });
  await vanta(1500);
  const svar = await Promise.race([skicka('Runtime.evaluate', { expression: `(async () => JSON.stringify(await (${uttryck})))()`, awaitPromise: true, returnByValue: true }), vanta(TAK).then(() => null)]);
  if (!svar) { console.error('tidstaket nåddes'); return stang(1); }
  if (svar.result.exceptionDetails) { console.error('FEL på sidan:', JSON.stringify(svar.result.exceptionDetails.exception || svar.result.exceptionDetails).slice(0, 600)); return stang(1); }
  console.log(svar.result.result.value);
  await stang(0);
})().catch(e => { console.error('FEL', e); process.exit(1); });

'use strict';
/* Kör ett uttryck på mätsidan i en huvudlös Chrome och skriver svaret (JSON)
   på stdout — samma knep som dev/embed/webb.cjs: en huvudlös Chrome räknas som
   synlig och stryps inte, medan browserpanelens flik är dold och får sina
   timers strypta. Startar dev/detektor/fart/server.cjs på en egen port.

     node dev/detektor/fart/webb.cjs "KOR({modeller:['dfine_n'],storlekar:[640],backends:['wasm']})"
     node dev/detektor/fart/webb.cjs "KOR({backends:['webgpu'],prec:['fp32','fp16']})" --gpu --tak 3600
     node dev/detektor/fart/webb.cjs "KONTROLL({modeller:['yolox_s']})" --gpu --bild ut/kontroll.jpg

   --gpu    WebGPU (Chrome med --enable-unsafe-webgpu, Metal)
   --port   serverns port (förval 8391; kolla med lsof att den är ledig)
   --bild   spara lådorna som ritades sist (JPEG) till den här filen
   --fraga  sidans URL-val, t.ex. ort=1.22
   --logg   skriv sidans konsol på stderr */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const argv = process.argv.slice(2);
const flagga = namn => argv.includes('--' + namn);
const varde = (namn, forval) => { const i = argv.indexOf('--' + namn); return i < 0 ? forval : argv[i + 1]; };
const PORT = +varde('port', 8391), TAK = +varde('tak', 1800) * 1000, BILDUT = varde('bild', null), FRAGA = varde('fraga', '');
const uttryck = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && ['--port', '--tak', '--bild', '--fraga'].includes(argv[i - 1])));
const vanta = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  if (!uttryck) { console.error('node dev/detektor/fart/webb.cjs "<uttryck>" [--gpu] [--port N] [--bild fil.jpg]'); process.exit(2); }
  const server = spawn(process.execPath, [path.join(__dirname, 'server.cjs')], { env: Object.assign({}, process.env, { PORT: String(PORT) }), stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise(r => server.stdout.once('data', r));
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-fart-'));
  const flaggor = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profil, '--no-first-run', '--no-default-browser-check', '--window-size=1000,900'];
  if (flagga('gpu')) flaggor.push('--enable-unsafe-webgpu', '--enable-features=WebGPU', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist');
  const chrome = spawn(CHROME, flaggor.concat(['about:blank']), { stdio: ['ignore', 'ignore', 'pipe'] });
  let wsPort = null; chrome.stderr.on('data', d => { const m = String(d).match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//); if (m) wsPort = +m[1]; });
  const stang = async kod => { try { chrome.kill(); } catch (e) {} try { server.kill(); } catch (e) {} await vanta(800); try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {} process.exit(kod); };
  for (let i = 0; i < 150 && !wsPort; i++) await vanta(100);
  if (!wsPort) { console.error('Chrome startade inte'); return stang(1); }
  let mal = null; for (let i = 0; i < 100 && !mal; i++) { try { mal = (await (await fetch(`http://127.0.0.1:${wsPort}/json/list`)).json()).find(t => t.type === 'page'); } catch (e) {} if (!mal) await vanta(100); }
  const ws = new WebSocket(mal.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let nr = 0; const vantar = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && vantar.has(m.id)) { vantar.get(m.id)(m); vantar.delete(m.id); } else if (m.method === 'Runtime.consoleAPICalled' && flagga('logg')) console.error('  [sidan]', m.params.args.map(a => a.value).join(' ')); };
  const skicka = (method, params) => new Promise(r => { const id = ++nr; vantar.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  await skicka('Runtime.enable'); await skicka('Page.enable');
  await skicka('Page.navigate', { url: `http://127.0.0.1:${PORT}/dev/detektor/fart/${FRAGA ? '?' + FRAGA : ''}` });
  for (let i = 0; i < 100; i++) { const r = await skicka('Runtime.evaluate', { expression: "document.getElementById('status').textContent", returnByValue: true }); if (/Redo|Fel/.test(r.result.result.value || '')) break; await vanta(100); }
  const svar = await Promise.race([skicka('Runtime.evaluate', { expression: `(async () => JSON.stringify(await (${uttryck})))()`, awaitPromise: true, returnByValue: true }), vanta(TAK).then(() => null)]);
  if (!svar) { console.error('tidstaket nåddes'); return stang(1); }
  if (svar.result.exceptionDetails) { console.error('FEL på sidan:', JSON.stringify(svar.result.exceptionDetails.exception || svar.result.exceptionDetails).slice(0, 600)); return stang(1); }
  console.log(svar.result.result.value);
  const text = await skicka('Runtime.evaluate', { expression: 'TEXT()', returnByValue: true });
  console.error(text.result.result.value);
  if (BILDUT) {
    const b = await skicka('Runtime.evaluate', { expression: 'LADBILD()', returnByValue: true });
    fs.writeFileSync(BILDUT, Buffer.from(String(b.result.result.value).split(',')[1], 'base64'));
  }
  await stang(0);
})().catch(e => { console.error('FEL', e); process.exit(1); });

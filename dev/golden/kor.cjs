#!/usr/bin/env node
/* Golden setet från terminalen. Kör: node dev/golden/kor.cjs [--spara] [--detalj] [--port 8239]

   Startar attrappen (dev/stub-server.cjs), öppnar dev/golden/kor.html i en
   huvudlös Chrome, trycker "Kör alla", skriver tabellen, och med --spara
   sparar resultatet som dev/golden/senaste.json. Slutkod 1 om något fall
   blev sämre än senaste.json (rätt namn, falska eller fel namn), så att den
   går att köra före en commit.

   Varför huvudlös Chrome och inte bänken: hela kedjan — beskärningen,
   matcharen, ORB och namnläsaren — finns bara i webbläsaren. Och varför
   inte bara fliken: en flik i bakgrunden stryps (rAF pausas, tidtagare en
   gång i sekunden), och namnläsaren tog tio sekunder per kort där. En
   huvudlös Chrome räknas som synlig och stryps inte.

   Profilen ligger kvar mellan körningarna (os.tmpdir()/mesa-golden-profil),
   så poolen och tesseract-datan cachas: första körningen tar en minut
   extra, de följande inte. .cjs eftersom package.json säger "type": "module". */
'use strict';
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const ROT = path.join(__dirname, '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const SPARA = process.argv.includes('--spara');
const PORT = +arg('--port', 8239);
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TAK_MS = +arg('--tak', 20 * 60 * 1000);

const vanta = ms => new Promise(r => setTimeout(r, ms));
async function tills(f, ms, vad) { const t0 = Date.now(); for (;;) { const v = await f().catch(() => null); if (v) return v; if (Date.now() - t0 > ms) throw new Error('väntade förgäves på ' + vad); await vanta(250); } }

(async () => {
  if (!fs.existsSync(CHROME)) { console.error('Hittar inte Chrome på ' + CHROME + ' — sätt CHROME=/sökväg/till/Chrome'); process.exit(2); }
  /* 1. attrappen, på en egen port så att en flik som redan kör inte störs */
  const server = spawn(process.execPath, [path.join(ROT, 'dev', 'stub-server.cjs')], { env: Object.assign({}, process.env, { PORT: String(PORT) }), stdio: 'ignore' });
  await tills(() => fetch(`http://localhost:${PORT}/dev/golden/kor.html`).then(r => r.ok), 10000, 'attrappen');
  /* 2. Chrome, huvudlös, med egen profil som får ligga kvar */
  const profil = path.join(os.tmpdir(), 'mesa-golden-profil');
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profil, '--no-first-run', '--no-default-browser-check', '--window-size=1400,1000', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let wsUrl = null, stderr = '';
  chrome.stderr.on('data', d => { stderr += d; const m = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) wsUrl = m[1]; });
  await tills(async () => wsUrl, 15000, 'Chrome (DevTools-porten)');
  const port = new URL(wsUrl).port;
  const sidor = await tills(async () => { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); return l.find(t => t.type === 'page'); }, 10000, 'en sida i Chrome');
  const ws = new WebSocket(sidor.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let nr = 0; const svar = new Map();
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && svar.has(m.id)) { svar.get(m.id)(m); svar.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') console.error('  [sidan] ' + (m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text).split('\n')[0]);
  };
  const cdp = (method, params) => new Promise(res => { const id = ++nr; svar.set(id, res); ws.send(JSON.stringify({ id, method, params: params || {} })); });
  const kor = async uttryck => { const r = await cdp('Runtime.evaluate', { expression: uttryck, awaitPromise: true, returnByValue: true }); if (r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.text); return r.result && r.result.result ? r.result.result.value : undefined; };
  await cdp('Runtime.enable');
  await cdp('Page.navigate', { url: `http://localhost:${PORT}/dev/golden/kor.html` });
  const status = () => kor(`(document.querySelector('#status') || {}).textContent || ''`);
  /* 3. vänta in poolen och namnläsaren, tryck Kör alla, vänta in Klar */
  process.stdout.write('förbereder (poolen, namnläsaren)…');
  const redo = await tills(async () => { const s = await status(); if (/^Fel/.test(s)) throw new Error(s); return /Redo|Kör ändå|ofullständig/.test(s) ? s : null; }, 5 * 60 * 1000, 'poolen');
  console.log('\r' + redo);
  console.log(await kor(`(document.querySelector('#pool') || {}).textContent || ''`));
  console.log(await kor(`(document.querySelector('#metod') || {}).textContent || ''`));
  await kor(`document.querySelector('#korAlla').click(); 'ok'`);
  let sist = '';
  await tills(async () => { const s = await status(); if (s !== sist) { sist = s; process.stdout.write('\r  ' + s.padEnd(70).slice(0, 70)); } return /^(Klar|Stoppad)/.test(s) ? s : null; }, TAK_MS, 'körningen');
  console.log('');
  /* 4. resultatet: samma JSON som Kopiera resultat, plus raderna som text */
  const rader = await kor(`[...document.querySelectorAll('#rader tr')].map(tr => tr.innerText.replace(/\\s+/g, ' '))`);
  const tot = await kor(`(document.querySelector('#totRad') || {}).innerText || ''`);
  const json = await kor(`(() => { const rs = fall.map(f => resultat.get(f.id)).filter(r => r && !r.fel); return '[\\n' + rs.map(r => JSON.stringify(r)).join(',\\n') + '\\n]\\n'; })()`);
  for (const r of rader) console.log('  ' + r);
  console.log('  ' + tot.replace(/\s+/g, ' ').trim());
  /* --detalj: varje spår med vad namnläsaren såg, för att skruva trösklarna */
  if (process.argv.includes('--detalj')) for (const r of JSON.parse(json)) {
    console.log('\n' + r.id + (r.missade.length ? ' — missade: ' + r.missade.join(', ') : ''));
    for (const t of r.spar) console.log(`  #${t.id} ${t.tillstand}${t.namn ? ' ' + t.namn + (t.saker ? '' : ' (osäker: ' + t.cands.join(', ') + ')') : ''}${t.ocr ? (t.ocr.hoppad ? ' [ocr hoppad: ' + t.ocr.hoppad + ']' : ' [ocr "' + (t.ocr.text || '') + '" → ' + (t.ocr.namn || '–') + ' ' + t.ocr.poang + '/' + t.ocr.marginal + ', ' + t.ocr.ms + ' ms]') : ''}`);
  }
  /* 5. sämre än senaste.json? rätt namn ner, falska eller fel namn upp */
  let samre = [];
  try {
    const gamla = new Map(JSON.parse(fs.readFileSync(path.join(__dirname, 'senaste.json'), 'utf8')).map(r => [r.id, r]));
    for (const r of JSON.parse(json)) { const g = gamla.get(r.id); if (!g) continue;
      if (r.namn < g.namn) samre.push(`${r.id}: rätt namn ${g.namn} → ${r.namn}`);
      if (r.falska > g.falska) samre.push(`${r.id}: falska ${g.falska} → ${r.falska}`);
      if (r.felNamn > g.felNamn) samre.push(`${r.id}: fel namn ${g.felNamn} → ${r.felNamn}`); }
  } catch (e) { /* ingen senaste.json — inget att jämföra med */ }
  if (samre.length) console.log('\nSÄMRE än senaste.json:\n  ' + samre.join('\n  '));
  if (SPARA) { fs.writeFileSync(path.join(__dirname, 'senaste.json'), json); console.log('\nsparat som dev/golden/senaste.json — lägg en rad i historik.md'); }
  else console.log('\n(--spara skriver senaste.json)');
  ws.close(); chrome.kill(); server.kill();
  process.exit(samre.length ? 1 : 0);
})().catch(e => { console.error('\nkor.cjs: ' + (e && e.message || e)); process.exit(2); });

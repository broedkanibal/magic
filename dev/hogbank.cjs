#!/usr/bin/env node
/* Högbänken (MES-250): högläsningen — hur många kort ligger på varandra,
   hur många är tappade, vad heter kortet under — mätt på beskärningar ur
   riktiga bilder, skurna som appen skär dem.

   Kör:  node dev/hogbank.cjs [--fall pass-75,g14] [--port 8281] [--beskarningar <mapp>] [--gra <mapp>] [--json fil] [--bredd 720] [--konsol]

   Facit: dev/hogbank/facit.json — per fall bilden (en ruta ur passets
   video, eller ett golden-foto), telefonens låda ur bordsloggen (eller en
   handsatt låda där loggen inte hade ett spår på högen — det står per
   fall), kortets kortsida i bildens pixlar, spårets namn, och vad som
   väntas: n, tappade, namnet under, namnet ovanpå. Negativa fall (ensamma
   kort, en hand över högen, ett halvskymt kort) är med av samma skäl som
   allt annat här: ett ensamt Swamp har ljusa band nog att se ut som en
   solfjäder, och det var det som fällde räkningen på analysbilden.

   Rutorna ur videon tas fram med dev/golden/video/ruta.swift första gången
   och ligger kvar i dev/material/hogbank/ (gitignorerad).

   Ett PROV: slutkod 1 om något faller. Bänken kör appen i en huvudlös
   Chrome (dev/hogbank.html laddar index.html i en iframe) eftersom
   namnläsaren och canvas bara finns där — samma mönster som golden.
   Egen profil (os.tmpdir()/mesa-hogbank-profil) så att den inte krockar
   med golden-profilen; ingen pool byggs, bara tesseract hämtas (en gång).
   .cjs eftersom package.json säger "type": "module". */
'use strict';
const { spawn, spawnSync } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const ROT = path.join(__dirname, '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = +arg('--port', 8281);
const FALL = arg('--fall', '');
const BESK = arg('--beskarningar', '');
const GRA = arg('--gra', '');
const REMSOR = arg('--remsor', '');   // mapp för remsorna namnläsaren fick, en png per läsning, med det lästa i filnamnet   // mapp för gråbilderna (PGM) som hogLas räknar på — för att skruva på bandsökningen i node
const JSONFIL = arg('--json', '');
const BREDD = +arg('--bredd', 720);
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CDP_TAK_MS = +arg('--cdp-tak', 120000);

const vanta = ms => new Promise(r => setTimeout(r, ms));
async function tills(f, ms, vad) { const t0 = Date.now(); for (;;) { const v = await f().catch(e => { if (e && e.hart) throw e; return null; }); if (v) return v; if (Date.now() - t0 > ms) throw new Error('väntade förgäves på ' + vad); await vanta(250); } }

const facit = JSON.parse(fs.readFileSync(path.join(__dirname, 'hogbank', 'facit.json'), 'utf8'));
let fall = facit.fall.filter(f => !f.av);
if (FALL) { const p = FALL.split(','); fall = fall.filter(f => p.some(x => f.id.startsWith(x))); }
if (!fall.length) { console.error('inga fall matchar --fall ' + FALL); process.exit(2); }

/* Bilden per fall: ett golden-foto som det är, eller en ruta ur en video
   (tas fram en gång med ruta.swift). URL:en är relativ repots rot, som
   attrappen serverar. */
function bildFor(f) {
  const k = facit.kallor[f.kalla];
  if (!k) throw new Error(f.id + ': okänd källa ' + f.kalla);
  if (k.bild) return { url: '/' + k.bild, kortPx: k.kortPx, grundLodrat: k.grundLodrat };
  const mapp = path.join(ROT, 'dev', 'material', 'hogbank');
  fs.mkdirSync(mapp, { recursive: true });
  const ut = path.join(mapp, `${f.kalla}-${String(f.s).replace('.', '_')}.jpg`);
  if (!fs.existsSync(ut)) {
    const video = path.join(ROT, k.video);
    if (!fs.existsSync(video)) throw new Error(f.id + ': videon saknas: ' + k.video + ' (dev/material är gitignorerad — symlänka den in i en worktree)');
    const r = spawnSync('swift', [path.join(ROT, 'dev', 'golden', 'video', 'ruta.swift'), video, String(f.s), ut], { encoding: 'utf8' });
    if (r.status !== 0 || !fs.existsSync(ut)) throw new Error(f.id + ': ruta.swift misslyckades: ' + (r.stderr || r.stdout));
  }
  return { url: '/dev/material/hogbank/' + path.basename(ut), kortPx: k.kortPx, grundLodrat: k.grundLodrat };
}

/* Domen per fall. vantat: { n, tappade, under, over, topp }; nullOk: inget
   svar godtas; annat: namn under som tolereras utan att väntas. */
function dom(f, post) {
  const v = f.vantat || {}, s = post.svar, fel = [];
  if (post.fel) return ['fel: ' + post.fel];
  if (!s || s.n == null) { if (!f.nullOk) fel.push('inget svar'); return fel; }
  if (v.n != null && s.n !== v.n) fel.push(`n ${s.n} (väntat ${v.n})`);
  if (v.n >= 2 && v.tappade != null && s.tappade !== v.tappade) fel.push(`tappade ${s.tappade} (väntat ${v.tappade})`);
  const vantadeUnder = [].concat(v.under || []);
  const tolererade = new Set(vantadeUnder.concat(f.annat || []));
  if (v.under !== undefined) for (const u of vantadeUnder) if (!(s.under || []).includes(u)) fel.push(`under saknar ${u}`);
  for (const u of s.under || []) if (!tolererade.has(u)) fel.push(`påhittat under: ${u}`);
  if (v.over !== undefined && (s.over || null) !== (v.over || null)) fel.push(`over ${s.over || '–'} (väntat ${v.over || '–'})`);
  if (v.topp && s.topp !== v.topp) fel.push(`topp ${s.topp} (väntat ${v.topp})`);
  return fel;
}
const vantatText = f => { const v = f.vantat || {}; return [v.n != null ? 'n' + v.n : '', v.n >= 2 && v.tappade != null ? 't' + v.tappade : '', v.under ? 'under ' + [].concat(v.under).join('+') : '', v.over ? 'over ' + v.over : '', f.nullOk ? '(null ok)' : ''].filter(Boolean).join(' '); };
const svarText = s => !s ? 'fel' : s.n == null ? 'null' : ['n' + s.n, s.n >= 2 ? 't' + s.tappade : '', s.under && s.under.length ? 'under ' + s.under.join('+') : '', s.over ? 'over ' + s.over : ''].filter(Boolean).join(' ');

const barn = [];
process.on('exit', () => { for (const c of barn) { try { c.kill('SIGKILL'); } catch (e) {} } });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(130));

(async () => {
  if (!fs.existsSync(CHROME)) { console.error('Hittar inte Chrome på ' + CHROME + ' — sätt CHROME=/sökväg/till/Chrome'); process.exit(2); }
  const sidfall = fall.map(f => { const b = bildFor(f); return { id: f.id, bild: b.url, lada: f.lada, kortPx: f.kortPx || b.kortPx, namn: f.namn || null, grundLodrat: f.grundLodrat != null ? f.grundLodrat : b.grundLodrat }; });
  /* 1. attrappen på egen port */
  const upptagen = spawnSync('lsof', ['-nP', `-iTCP:${PORT}`, '-sTCP:LISTEN'], { encoding: 'utf8' });
  if (upptagen.stdout && upptagen.stdout.trim()) { console.error(`port ${PORT} är upptagen — välj en annan med --port`); process.exit(2); }
  const server = spawn(process.execPath, [path.join(ROT, 'dev', 'stub-server.cjs')], { env: Object.assign({}, process.env, { PORT: String(PORT) }), stdio: ['ignore', 'ignore', 'pipe'] });
  barn.push(server);
  await tills(() => fetch(`http://localhost:${PORT}/dev/hogbank.html`).then(r => r.ok), 10000, 'attrappen');
  /* 2. Chrome, huvudlös, egen profil */
  const profil = path.join(os.tmpdir(), 'mesa-hogbank-profil');
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profil, '--no-first-run', '--no-default-browser-check', '--window-size=1200,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  barn.push(chrome);
  let wsUrl = null, stderr = '';
  chrome.stderr.on('data', d => { stderr += d; const m = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) wsUrl = m[1]; });
  await tills(async () => wsUrl, 15000, 'Chrome (DevTools-porten)');
  const port = new URL(wsUrl).port;
  const sidor = await tills(async () => { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); return l.find(t => t.type === 'page'); }, 10000, 'en sida i Chrome');
  const ws = new WebSocket(sidor.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let nr = 0; const svar = new Map(); let dod = null;
  const avbryt = orsak => { if (dod) return; dod = orsak; for (const [, f] of svar) f({ dod: orsak }); svar.clear(); };
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Inspector.targetCrashed') { avbryt('fliken kraschade'); return; }
    if (m.id && svar.has(m.id)) { svar.get(m.id)(m); svar.delete(m.id); }
    else if (m.method === 'Runtime.consoleAPICalled' && process.argv.includes('--konsol')) console.log('  [konsol] ' + (m.params.args || []).map(a => a.value !== undefined ? a.value : a.description || '').join(' '));
    else if (m.method === 'Runtime.exceptionThrown') console.error('  [sidan] ' + (m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text).split('\n')[0]);
  };
  ws.onclose = () => avbryt('förbindelsen till Chrome stängdes');
  chrome.on('exit', kod => avbryt('Chrome avslutades (kod ' + kod + ')'));
  const cdp = (method, params, ms = CDP_TAK_MS) => new Promise((res, rej) => {
    const hart = t => Object.assign(new Error(t), { hart: true });
    if (dod) return rej(hart(`${method}: ${dod}`));
    const id = ++nr;
    const t = setTimeout(() => { svar.delete(id); rej(hart(`${method} svarade inte på ${Math.round(ms / 1000)} s`)); }, ms);
    svar.set(id, m => { clearTimeout(t); if (m.dod) rej(hart(`${method}: ${m.dod}`)); else res(m); });
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
  const kor = async uttryck => { const r = await cdp('Runtime.evaluate', { expression: uttryck, awaitPromise: true, returnByValue: true }); if (r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.text + ' ' + JSON.stringify(r.result.exceptionDetails.exception || '').slice(0, 300)); return r.result && r.result.result ? r.result.result.value : undefined; };
  await cdp('Runtime.enable'); await cdp('Inspector.enable');
  await cdp('Page.navigate', { url: `http://localhost:${PORT}/dev/hogbank.html` });
  const status = () => kor(`(document.querySelector('#status') || {}).textContent || ''`);
  process.stdout.write('förbereder (appen, namnläsaren)…');
  await tills(async () => { const s = await status(); if (/^Fel/.test(s)) throw Object.assign(new Error(s), { hart: true }); return s === 'Redo' ? s : null; }, 5 * 60 * 1000, 'namnläsaren');
  console.log('\rRedo: ' + sidfall.length + ' fall.            ');
  /* 3. fallen, ett anrop per fall: ett svar med alla beskärningar i blev
     för stort för förbindelsen (69 fall × en jpg — Chrome stängde den). */
  const t0 = Date.now();
  const poster = [];
  if (BESK) fs.mkdirSync(BESK, { recursive: true });
  if (GRA) fs.mkdirSync(GRA, { recursive: true });
  for (const f of sidfall) {
    process.stdout.write('\r  ' + f.id.padEnd(60));
    const [p] = await kor(`hogbank.korFall(${JSON.stringify([f])}, ${JSON.stringify({ beskarningar: !!BESK, gra: !!GRA, remsor: !!REMSOR, bredd: BREDD })})`, 5 * 60 * 1000);
    if (p.b64) { if (BESK) fs.writeFileSync(path.join(BESK, p.id + '.jpg'), Buffer.from(p.b64.split(',')[1], 'base64')); delete p.b64; }
    /* Gråbilden som PGM (P5): W H 255 + råa byte — läsbar utan bibliotek i node. */
    if (p.gra) { if (GRA) fs.writeFileSync(path.join(GRA, p.id + '.pgm'), Buffer.concat([Buffer.from(`P5\n${p.w} ${p.h}\n255\n`), Buffer.from(p.gra, 'base64')])); delete p.gra; }
    if (p.remsor) { if (REMSOR) { fs.mkdirSync(REMSOR, { recursive: true }); p.remsor.forEach((r, i) => fs.writeFileSync(path.join(REMSOR, p.id + '-' + i + '-' + r.dir + r.vinkel + 'r' + r.rot + '-' + String(r.text || '').replace(/[^a-zA-Z0-9.> -]/g, '_').slice(0, 40) + '.png'), Buffer.from(r.b64.split(',')[1], 'base64'))); } delete p.remsor; }
    poster.push(p);
  }
  process.stdout.write('\r' + ''.padEnd(64) + '\r');
  const tid = Date.now() - t0;
  /* 4. tabellen */
  const ok = [], fel = [], typer = {};
  const kol = (s, n) => String(s).padEnd(n).slice(0, n);
  console.log('\n  ' + kol('Fall', 34) + kol('Väntat', 30) + kol('Fått', 30) + kol('Band (läst → namn)', 78) + 'ms');
  for (const f of fall) {
    const p = poster.find(q => q.id === f.id) || { fel: 'inget svar från sidan' };
    const d = dom(f, p);
    const band = p.svar && p.svar.band ? p.svar.band.map(b => `${b.stark ? '*' : ''}${b.dir}${b.vinkel != null ? '@' + b.vinkel : ''}${b.rot ? 'r' + b.rot : ''}:${(b.text || '').slice(0, 12)}→${b.namn || '–'}${b.namn ? '' : '(' + (b.poang || 0).toFixed(2) + ')'}`).join(' | ') : (p.fel || '');
    console.log('  ' + kol(f.id, 34) + kol(vantatText(f), 30) + kol(svarText(p.svar), 30) + kol(band, 78) + (p.ms != null ? p.ms : '–') + (d.length ? '   FEL: ' + d.join('; ') : ''));
    const t = f.typ || 'annat'; typer[t] = typer[t] || { ok: 0, av: 0 }; typer[t].av++;
    if (d.length) fel.push(f.id + ': ' + d.join('; ')); else { ok.push(f.id); typer[t].ok++; }
  }
  const tider = poster.filter(p => p.ms != null).map(p => p.ms).sort((a, b) => a - b);
  const median = tider.length ? tider[tider.length >> 1] : null;
  const lasn = poster.filter(p => p.svar).map(p => p.svar.lasningar || 0);
  console.log(`\n  per typ: ${Object.entries(typer).map(([t, v]) => `${t} ${v.ok}/${v.av}`).join(' · ')}`);
  console.log(`  tid per fall: median ${median} ms, längst ${tider[tider.length - 1] || 0} ms; läsningar per fall: ${lasn.length ? (lasn.reduce((a, b) => a + b, 0) / lasn.length).toFixed(1) : '–'} i snitt, flest ${Math.max(0, ...lasn)}; hela körningen ${(tid / 1000).toFixed(1)} s`);
  console.log(`\n${ok.length} OK, ${fel.length} FEL`);
  if (JSONFIL) fs.writeFileSync(JSONFIL, JSON.stringify({ skapad: new Date().toISOString(), bredd: BREDD, poster, fel }, null, 1));
  try { ws.close(); } catch (e) {}
  process.exit(fel.length ? 1 : 0);
})().catch(e => { console.error('\nhogbank.cjs: ' + (e && e.message || e)); process.exit(2); });

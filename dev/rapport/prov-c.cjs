/* Problemrapporten C (MES-367): provet i huvudlös Chrome, utan nät och utan Claude.

   Kör:  node dev/rapport/prov-c.cjs [--fil index.html] [--bilder <mapp>]

   Appens egna Moln-funktioner provas mot en attrapp av supabase-js (dev/rapport/fake-supabase.mjs,
   serverad i stället för CDN-modulen): tabellen rapporter och raderingar med spelarens regler (RLS),
   hinken scans per uid, auth.updateUser/getUser. Allt annat nät är avstängt (Fetch.failRequest), så
   inget kan nå Claude.

   README:ns Prov (design_handoff_rapport/README.md):
   F  Flaggan av, utan ?debug: ingen bildruta, inget What's new, dagens finstilta rad, ingen Settings,
      ingen knapp i spelet eller på telefonen, inga felrapporter, Ctrl+Alt+R gör ingenting.
   5  Create your account och Before you continue: rutan aldrig förbockad, låser aldrig knappen,
      valet i samma updateUser som villkoret (Google-rundturen via sthv.bilder; Agree and continue).
   3  Settings: växeln skriver improve_pictures(_at) direkt, B:s växel visar samma; rättelserna
      (applyPick) sparas bara när den är på — av/på/av.
   4  Delete: raderingar får koderna som blivit test/träning (före raderingen), sedan inga rader och
      inga filer kvar för spelaren (alla kalla), växeln orörd, ingen grön notis, Nothing sent yet.
   1  Rapporten från datorn (knappen i toppraden) och från telefonens ark (datorn skickar), med
      inställningen av; koden tillbaka.
   2  Ett provocerat kodfel ger en rad kalla 'fel' utan bilder.
   6  Rutans lägen: Sending, Sent, Couldn't send (nätet), Today's limit (20 i dag), Phone not connected
      (+ bilder 'saknas'); telefonens ark: Sent, Can't reach your computer (10 s), tak.
   --bilder <mapp>: skärmbilder med tavlornas namn (L9-*.png).

   Slutkod 0 = allt OK, 1 = något FEL, 2 = gick inte att köra. */
'use strict';
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os'), http = require('http');
const ROT = path.join(__dirname, '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const FIL = path.resolve(arg('--fil', path.join(ROT, 'index.html')));
const BILDER = arg('--bilder') ? path.resolve(arg('--bilder')) : null;
const FAKE = fs.readFileSync(path.join(__dirname, 'fake-supabase.mjs'));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const vanta = ms => new Promise(r => setTimeout(r, ms));

function server() {
  return new Promise(res => {
    const s = http.createServer((req, ut) => {
      const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (u === '/index.html' || u === '/') { ut.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); return ut.end(fs.readFileSync(FIL)); }
      if (u === '/api/config') { ut.writeHead(200, { 'Content-Type': 'application/json' }); return ut.end(JSON.stringify({ konfigurerad: true, supabaseUrl: 'http://127.0.0.1/sb', supabaseAnonKey: 'prov', build: 'prov-c' })); }
      ut.writeHead(404); ut.end();
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}
async function chrome() {
  if (!fs.existsSync(CHROME)) { console.error('prov-c: hittar inte Chrome (sätt CHROME=…)'); process.exit(2); }
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-rapport-c-'));
  const p = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profil, '--no-first-run', '--no-default-browser-check', '--window-size=1400,1000', 'about:blank']);
  let ws = null, err = '';
  p.stderr.on('data', d => { err += d; const m = err.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) ws = m[1]; });
  const t0 = Date.now();
  while (!ws) { if (Date.now() - t0 > 15000) { p.kill(); throw new Error('Chrome svarade inte'); } await vanta(50); }
  const port = new URL(ws).port;
  let sida = null;
  while (!sida) { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); sida = l.find(t => t.type === 'page'); if (!sida) await vanta(50); }
  const sock = new WebSocket(sida.webSocketDebuggerUrl);
  await new Promise((res, rej) => { sock.onopen = res; sock.onerror = rej; });
  let nr = 0; const svar = new Map(), lyss = [];
  sock.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && svar.has(m.id)) { svar.get(m.id)(m); svar.delete(m.id); } else if (m.method) for (const f of lyss) f(m); };
  const cdp = (method, params) => new Promise((res, rej) => { const id = ++nr; svar.set(id, m => m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)); sock.send(JSON.stringify({ id, method, params: params || {} })); });
  const stang = async () => { try { await cdp('Browser.close'); } catch (e) {} for (let i = 0; i < 40 && p.exitCode == null; i++) await vanta(50); if (p.exitCode == null) p.kill(); try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {} };
  return { cdp, stang, lyss };
}

(async () => {
  const srv = await server(), bas = `http://127.0.0.1:${srv.address().port}`;
  let c;
  try { c = await chrome(); } catch (e) { console.error('prov-c: ' + e.message); srv.close(); process.exit(2); }
  const rad = [], ok = (namn, villkor, detalj) => rad.push([namn, !!villkor, detalj || '']);
  const blockerat = new Set();
  /* Nätet: sidan själv och attrappens modul; allt annat stängs (inget når Claude, Scryfall eller CDN). */
  c.lyss.push(m => {
    if (m.method !== 'Fetch.requestPaused') return;
    const { requestId, request } = m.params;
    if (request.url.startsWith(bas)) c.cdp('Fetch.continueRequest', { requestId }).catch(() => {});
    else if (/@supabase\/supabase-js/.test(request.url)) c.cdp('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: FAKE.toString('base64') }).catch(() => {});
    else { blockerat.add(new URL(request.url).host); c.cdp('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }).catch(() => {}); }
  });
  const ev = async (uttryck, ms) => {
    const r = await c.cdp('Runtime.evaluate', { expression: `(async () => { ${uttryck} })()`, awaitPromise: true, returnByValue: true, timeout: ms || 60000 });
    if (r.exceptionDetails) throw new Error(((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text).slice(0, 400));
    return r.result.value;
  };
  const ladda = async (fraga, forst) => {
    if (forst) await c.cdp('Page.addScriptToEvaluateOnNewDocument', { source: forst }).then(r => { ladda.skript = r.identifier; });
    await c.cdp('Page.navigate', { url: bas + '/' + fraga });
    const t0 = Date.now();
    for (;;) {
      const r = await c.cdp('Runtime.evaluate', { expression: "document.readyState === 'complete' && typeof Installningar === 'object' && typeof Rapport === 'object' && !!window.__sb", returnByValue: true }).catch(() => null);
      if (r && r.result && r.result.value) break;
      if (Date.now() - t0 > 30000) throw new Error('appen laddade inte: ' + fraga);
      await vanta(100);
    }
    await vanta(600);
    if (ladda.skript) { await c.cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: ladda.skript }).catch(() => {}); ladda.skript = null; }
  };
  /* Tillståndet i attrappen före nästa laddning (sessionStorage överlever en navigering i samma flik). */
  const satt = obj => `sessionStorage.setItem('__sbfake', ${JSON.stringify(JSON.stringify(obj))});`;
  const anvandare = (meta, id) => ({ access_token: 'prov', user: { id: id || 'u-prov', email: 'prov@example.com', user_metadata: Object.assign({ full_name: 'Prov Spelare' }, meta || {}) } });
  const NU = "'2026-10-09'";
  const bild = async (namn, sel, pad) => {
    if (!BILDER) return;
    const r = await ev(`const l = ${JSON.stringify(sel)}.map(s => document.querySelector(s)).filter(e => e && e.getClientRects().length).map(e => e.getBoundingClientRect());
      if (!l.length) return null; const x0 = Math.min(...l.map(r => r.left)), y0 = Math.min(...l.map(r => r.top)), x1 = Math.max(...l.map(r => r.right)), y1 = Math.max(...l.map(r => r.bottom));
      return { x0, y0, x1, y1, w: innerWidth, h: innerHeight };`);
    if (!r) { ok(`skärmbild ${namn}: elementet syns`, false, sel.join(', ')); return; }
    const p = pad == null ? 16 : pad, x = Math.max(0, r.x0 - p), y = Math.max(0, r.y0 - p);
    const s = await c.cdp('Page.captureScreenshot', { format: 'png', clip: { x, y, width: Math.min(r.w, r.x1 + p) - x, height: Math.min(r.h, r.y1 + p) - y, scale: 1 } });
    fs.mkdirSync(BILDER, { recursive: true }); fs.writeFileSync(path.join(BILDER, namn + '.png'), Buffer.from(s.data, 'base64'));
  };
  const klicka = sel => ev(`const e = document.querySelector(${JSON.stringify(sel)}); if (!e) throw new Error('saknas: ${sel.replace(/'/g, '')}'); e.click(); await new Promise(r => setTimeout(r, 120)); return true;`);
  const syns = sel => ev(`const e = document.querySelector(${JSON.stringify(sel)}); return !!e && !e.hidden && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';`);
  const text = sel => ev(`const e = document.querySelector(${JSON.stringify(sel)}); return e ? e.innerText.replace(/\\s+/g, ' ').trim() : null;`);
  const logg = () => ev(`return __sb.logg;`);
  const uppd = async () => (await logg()).filter(l => l.op === 'updateUser');

  try {
    await c.cdp('Runtime.enable'); await c.cdp('Page.enable');
    await c.cdp('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    await c.cdp('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});

    /* ══ F · Flaggan av, utan ?debug ══ */
    await ladda('?debug=0', satt({ seq: 0, session: null, db: { rapporter: [], raderingar: [] }, filer: {}, logg: [], oauth: [] }));
    const f1 = await ev(`return { flagga: RAPPORT_FOR_ALLA, ytor: rapportYtor(), bild: !$('#bildRad').hidden, nytt: !$('#startNytt').hidden, fin: $('#villkorFin').innerText.replace(/\\s+/g, ' ').trim() };`);
    ok('F: RAPPORT_FOR_ALLA = false och inga ytor utan ?debug', f1.flagga === false && f1.ytor === false, JSON.stringify(f1));
    ok('F: Create your account utan bildruta och What\'s new, med dagens finstilta rad', !f1.bild && !f1.nytt && /^Mesa records how you use the app/.test(f1.fin), f1.fin);
    await ev(`$('#villkorBox').click(); return true;`);
    await klicka('#loggaInBtn');
    ok('F: Sign up utan bildruta sparar inget sthv.bilder', await ev(`return sessionStorage.getItem('sthv.bilder') === null && __sb.oauth.length === 1;`));
    await ladda('?debug=0', satt({ seq: 0, session: anvandare({ terms_version: '2026-10-09' }), db: { rapporter: [], raderingar: [] }, filer: {}, logg: [], oauth: [] }));
    await klicka('#hemMenyBtn');
    const f2 = await ev(`return { inst: !$('#hemInstallningar').hidden, hr: !$('#hemInstallningarHr').hidden, ut: $('#hemMenyBtn').parentElement.querySelector('[data-hem="loggaut"]').getClientRects().length > 0 };`);
    ok('F: Home-menyn utan Settings (bara Sign out)', !f2.inst && !f2.hr && f2.ut, JSON.stringify(f2));
    await bild('flagga-av-hemmenyn', ['#vyHem .topbar', '#vyHem .lsmeny']);
    await ev(`lsMenyerStang(); Installningar.oppna(); return true;`);
    ok('F: Installningar.oppna() öppnar ingenting', !(await ev(`return Installningar.oppen;`)));
    const f3 = await ev(`visaVy('app'); const mig = player(); spelLage = { id: 'provC-spel', kod: 'PROVC1', namn: 'Prov C', vard: mig.id, mig: mig.id }; mig.lage = 'bord';
      renderAll(true); await new Promise(r => setTimeout(r, 200));
      const knapp = $('#rapportKnapp').hidden === false;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', code: 'KeyR', ctrlKey: true, altKey: true, bubbles: true }));
      await new Promise(r => setTimeout(r, 200));
      const ruta = !!document.querySelector('.rapruta:not([hidden])');
      setTimeout(() => { throw new Error('prov-c: provocerat kodfel utan flaggan'); }, 0);
      await new Promise(r => setTimeout(r, 800));
      return { knapp, ruta, fel: __sb.db.rapporter.filter(r => r.kalla === 'fel').length, kam: !$('#kamRapport').hidden };`);
    ok('F: i ett spel ingen Report a problem-knapp, Ctrl+Alt+R öppnar ingen ruta, ingen knapp på telefonen', !f3.knapp && !f3.ruta && !f3.kam, JSON.stringify(f3));
    ok('F: ett kodfel skickar ingen felrapport (loggas bara)', f3.fel === 0, JSON.stringify(f3));
    await bild('flagga-av-toppraden', ['#app .topbar']);

    /* ══ 5 · Create your account (?debug, utloggad) ══ */
    await ladda('?debug', satt({ seq: 0, session: null, db: { rapporter: [], raderingar: [] }, filer: {}, logg: [], oauth: [] }));
    const a1 = await ev(`return { bild: !$('#bildRad').hidden, bock: $('#bildBox').checked, nytt: !$('#startNytt').hidden, knapp: $('#loggaInBtn').disabled, fin: $('#villkorFin').innerText.replace(/\\s+/g, ' ').trim(), rubrik: $('#startRubrik').textContent,
      ordning: [...$('#startKort').querySelectorAll('#villkorRad, #bildRad, #villkorFin, #loggaInBtn')].map(e => e.id).join(' '), bildText: $('#bildRad').innerText.replace(/\\s+/g, ' ').trim() };`);
    ok('5: Create your account: bildrutan syns, inte förbockad, Sign up låst av villkoret', a1.bild && !a1.bock && a1.knapp && !a1.nytt && a1.rubrik === 'Create your account', JSON.stringify(a1).slice(0, 200));
    ok('5: ordningen villkor → bildruta → finstilt → Google', a1.ordning === 'villkorRad bildRad villkorFin loggaInBtn', a1.ordning);
    ok('5: texterna exakt som README §1', a1.bildText === "Share pictures of cards I correct. When you fix a card's name, Mesa keeps a picture of that card and the cards right around it, to fix problems and improve its card recognition, including training our models. Optional. You can change it any time in Settings."
      && a1.fin === 'To find and fix problems, Mesa notes how the app is used and any errors. No ads, and no pictures unless you choose. What and why', a1.bildText + ' | ' + a1.fin);
    await bild('L9-Main', ['#startKort'], 0);
    await ev(`$('#bildBox').click(); return true;`);
    const a2 = await ev(`return $('#loggaInBtn').disabled;`);
    await ev(`$('#villkorBox').click(); return true;`);
    const a3 = await ev(`return $('#loggaInBtn').disabled;`);
    await ev(`$('#bildBox').click(); return true;`);
    const a4 = await ev(`return $('#loggaInBtn').disabled;`);
    ok('5: bildrutan låser aldrig knappen (bara bild → låst, villkor → öppen, villkor utan bild → öppen)', a2 && !a3 && !a4, `${a2} ${a3} ${a4}`);
    await ev(`$('#bildBox').click(); return true;`);
    await klicka('#loggaInBtn');
    ok('5: valet följer med Google-rundturen (sthv.bilder = 1)', await ev(`return sessionStorage.getItem('sthv.bilder') === '1' && sessionStorage.getItem('sthv.villkor') === Moln.VILLKOR_VERSION;`));
    /* Tillbaka från Google: ett nytt konto utan något i user_metadata. */
    await ev(`__sb.session = ${JSON.stringify(anvandare({}))}; __sb.logg = []; __sb.spara(); return true;`);
    await ladda('?debug');
    let u = await uppd();
    ok('5: efter rundturen: terms_version och improve_pictures true (+ _at) i EN updateUser', u.length === 1 && u[0].data.terms_version === '2026-10-09' && u[0].data.improve_pictures === true && /^\d{4}-\d\d-\d\dT/.test(u[0].data.improve_pictures_at || '') && await ev(`return sessionStorage.getItem('sthv.bilder') === null;`), JSON.stringify(u));
    /* Samma med rutan tom: improve_pictures false. */
    await ladda('?debug', satt({ seq: 0, session: null, db: { rapporter: [], raderingar: [] }, filer: {}, logg: [], oauth: [] }));
    await ev(`$('#villkorBox').click(); return true;`); await klicka('#loggaInBtn');
    ok('5: tom bildruta → sthv.bilder = 0', await ev(`return sessionStorage.getItem('sthv.bilder') === '0';`));
    await ev(`__sb.session = ${JSON.stringify(anvandare({}))}; __sb.logg = []; __sb.spara(); return true;`);
    await ladda('?debug');
    u = await uppd();
    ok('5: efter rundturen med tom ruta: improve_pictures false i samma updateUser', u.length === 1 && u[0].data.terms_version === '2026-10-09' && u[0].data.improve_pictures === false, JSON.stringify(u));
    /* Granskningens fynd 5: updateUser fallerar efter rundturen → spärren förväljer spelarens val, sthv.bilder ligger kvar. */
    await ladda('?debug', satt({ seq: 0, session: null, db: { rapporter: [], raderingar: [] }, filer: {}, logg: [], oauth: [] }));
    await ev(`$('#villkorBox').click(); $('#bildBox').click(); return true;`); await klicka('#loggaInBtn');
    await ev(`__sb.session = ${JSON.stringify(anvandare({}))}; __sb.updateFel = 1; __sb.logg = []; __sb.spara(); return true;`);
    await ladda('?debug');
    const a5 = await ev(`return { rubrik: $('#startRubrik').textContent, bock: $('#bildBox').checked, kvar: sessionStorage.getItem('sthv.bilder'), fel: $('#startFel').textContent };`);
    ok('5 (fynd 5): updateUser fallerar efter rundturen → spärren med spelarens val ibockat, sthv.bilder kvar', a5.rubrik === 'Before you continue' && a5.bock === true && a5.kvar === '1' && /Could not save/.test(a5.fel), JSON.stringify(a5));
    await ev(`$('#villkorBox').click(); __sb.logg = []; __sb.spara(); $('#villkorOkBtn').click(); return true;`).catch(() => {});
    await vanta(800); await ladda('?debug');
    u = await uppd();
    ok('5 (fynd 5): Agree and continue efter felet skickar valet (improve_pictures true), sthv.bilder borta efteråt', u.length === 1 && u[0].data.improve_pictures === true && await ev(`return sessionStorage.getItem('sthv.bilder') === null;`), JSON.stringify(u));
    await ladda('?debug', satt({ seq: 0, session: null, db: { rapporter: [], raderingar: [] }, filer: {}, logg: [], oauth: [] }));
    await ev(`visaStartLage('logga'); return true;`);
    ok('5: Sign in (befintligt konto): ingen bildruta', !(await syns('#bildRad')));

    /* ══ 5 · Before you continue (spärren) ══ */
    await ladda('?debug', satt({ seq: 0, session: anvandare({ terms_version: '2026-01-01' }), db: { rapporter: [], raderingar: [] }, filer: {}, logg: [], oauth: [] }));
    const g1 = await ev(`return { rubrik: $('#startRubrik').textContent, nytt: !$('#startNytt').hidden, nyttText: $('#startNytt').innerText.replace(/\\s+/g, ' ').trim(), bild: !$('#bildRad').hidden, bock: $('#bildBox').checked, ok: $('#villkorOkBtn').disabled,
      ordning: [...$('#startKort').querySelectorAll('#startNytt, #villkorRad, #bildRad, #villkorFin, #villkorOkBtn')].map(e => e.id).join(' ') };`);
    ok('5: Before you continue: What\'s new, bildrutan tom (fältet saknas), Agree låst', g1.rubrik === 'Before you continue' && g1.nytt && g1.bild && !g1.bock && g1.ok && g1.ordning === 'startNytt villkorRad bildRad villkorFin villkorOkBtn', JSON.stringify(g1));
    ok('5: What\'s new-texten exakt', g1.nyttText === "What's new You can send us a problem report with pictures, and choose whether to share pictures of cards you correct.", g1.nyttText);
    await bild('L9-Gate', ['#startKort'], 0);
    await ev(`$('#bildBox').click(); return true;`);
    const g2 = await ev(`return $('#villkorOkBtn').disabled;`);
    await ev(`$('#villkorBox').click(); __sb.logg = []; __sb.spara(); return $('#villkorOkBtn').disabled;`).then(v => ok('5: spärren: bara villkorsrutan låser upp Agree', g2 && v === false));
    await ev(`$('#villkorOkBtn').click(); return true;`).catch(() => {});
    await vanta(800);
    await ladda('?debug');
    u = await uppd();
    ok('5: Agree and continue: terms_version och improve_pictures true i EN updateUser', u.length === 1 && u[0].data.terms_version === '2026-10-09' && u[0].data.improve_pictures === true && !!u[0].data.improve_pictures_at, JSON.stringify(u));
    await ladda('?debug', satt({ seq: 0, session: anvandare({ terms_version: '2026-01-01', improve_pictures: true, improve_pictures_at: '2026-10-01T10:00:00Z' }), db: { rapporter: [], raderingar: [] }, filer: {}, logg: [], oauth: [] }));
    ok('5: spärren visar kontots värde (improve_pictures true → ibockad)', await ev(`return $('#bildBox').checked && !$('#bildRad').hidden;`));
    await ev(`$('#villkorBox').click(); __sb.logg = []; __sb.spara(); $('#villkorOkBtn').click(); return true;`).catch(() => {});
    await vanta(800); await ladda('?debug');
    u = await uppd();
    ok('5: oförändrat val skrivs inte om (improve_pictures_at behåller sitt datum)', u.length === 1 && u[0].data.terms_version === '2026-10-09' && !('improve_pictures' in u[0].data) && await ev(`return __sb.session.user.user_metadata.improve_pictures_at === '2026-10-01T10:00:00Z';`), JSON.stringify(u));

    /* ══ 3 · Settings, 4 · Delete ══ */
    const R = [], F = {}; let n = 0;
    const kod = () => 'R-' + String(++n).padStart(4, '0');
    const nyRad = (kalla, anv, uid) => { const k = kod(), u0 = uid || 'u-prov'; R.push({ kod: k, user_id: u0, kalla, anvandning: anv || null, sokvag: `${u0}/rapporter/${k}`, created_at: '2026-10-12T20:00:00Z', text: kalla === 'rapport' ? 'prov' : null }); return k; };
    for (let i = 0; i < 3; i++) { const k = nyRad('rapport', i === 0 ? 'test' : null); F[`u-prov/rapporter/${k}/paket.json.gz`] = 900; F[`u-prov/rapporter/${k}/bilder/s-1-0.jpg`] = 20000; F[`u-prov/rapporter/${k}/bilder/index.json`] = 300; }
    for (let i = 0; i < 41; i++) { const k = nyRad('rattelse', i === 5 ? 'traning' : null); F[`u-prov/rapporter/${k}/beskarning.jpg`] = 9000; F[`u-prov/rapporter/${k}/rattelse.json`] = 200; }
    const felKod = nyRad('fel'); const annan = nyRad('rapport', null, 'u-annan'); F[`u-annan/rapporter/${annan}/paket.json.gz`] = 900;
    const testKoder = R.filter(r => r.anvandning).map(r => r.kod);
    await ladda('?debug', satt({ seq: n, session: anvandare({ terms_version: '2026-10-09', improve_pictures: false, improve_pictures_at: '2026-10-11T09:00:00Z' }), db: { rapporter: R, raderingar: [] }, filer: F, logg: [], oauth: [] }));
    await ev(`window.__toasts = []; const t0 = window.toast; window.toast = function (m, k) { __toasts.push([m, k || '']); return t0.apply(this, arguments); }; return true;`);
    await klicka('#hemMenyBtn');
    const h1 = await ev(`const m = $('#hemMenyBtn').parentElement.querySelector('.lsmeny'); return { syns: !m.hidden, ordning: [...m.children].filter(e => !e.hidden).map(e => e.tagName === 'HR' ? 'hr' : e.textContent.trim()).join(' | '), hem: $('#hemInstallningar').dataset.hem };`);
    ok('3: Home-menyn: Settings ovanför Sign out (data-hem="installningar")', h1.syns && h1.ordning === 'Settings | hr | Sign out' && h1.hem === 'installningar', JSON.stringify(h1));
    await bild('L9-HomeMenu', ['#vyHem .topbar', '#vyHem .lsmeny:not([hidden])']);
    await klicka('#hemInstallningar');
    await ev(`for (let i = 0; i < 50 && !/card pictures|Nothing sent/.test($('#instRuta').textContent); i++) await new Promise(r => setTimeout(r, 20)); return true;`);
    const s1 = await ev(`const r = $('#instRuta'); return { oppen: Installningar.oppen, text: r.innerText.replace(/\\s+/g, ' ').trim(), pa: $('#instBilder').getAttribute('aria-checked'), del: r.querySelector('.btn.danger').disabled, kryss: r.querySelectorAll('input[type=checkbox]').length };`);
    ok('3: Settings: PICTURES av, "Off. Nothing is kept…", 3 reports and 41 card pictures, Delete aktiv', s1.oppen && s1.pa === 'false' && s1.text.includes('Off. Nothing is kept when you correct a card.') && s1.text.includes('3 reports and 41 card pictures') && !s1.del, s1.text.slice(0, 400));
    ok('3: Settings-texterna exakt (README §3)', ["Settings", "Pictures", "Share pictures of cards I correct", "When you fix a card's name, Mesa keeps a picture of that card and the cards right around it, to fix problems and improve its card recognition, including training our models.", "What you have sent", "Reports you send are always your own choice, one at a time, whatever the switch says.", "Delete my reports and pictures", "Privacy Policy"].every(t => s1.text.toLowerCase().includes(t.toLowerCase())) && /PICTURES/.test(s1.text), s1.text);
    await bild('L9-Settings', ['#instRuta'], 30);
    await klicka('#instBilder');
    await ev(`for (let i = 0; i < 50 && $('#instBilder').disabled; i++) await new Promise(r => setTimeout(r, 20)); await new Promise(r => setTimeout(r, 150)); return true;`);
    u = await uppd();
    const s2 = await ev(`return { pa: $('#instBilder').getAttribute('aria-checked'), m: $('#instRuta .set .m').textContent, meta: __sb.session.user.user_metadata, dev: $('#pbBilder').checked };`);
    ok('3: växeln på: improve_pictures true + _at direkt (ingen Save), "On since <datum>", B:s växel visar samma', u.length === 1 && u[0].data.improve_pictures === true && !!u[0].data.improve_pictures_at && s2.pa === 'true' && /^On since \d{1,2} [A-Z][a-z]{2} \d{4}\.$/.test(s2.m) && s2.dev === true, JSON.stringify(s2) + ' ' + JSON.stringify(u));
    await klicka('#instRuta .btn.danger');
    const d1 = await ev(`return $('#instRuta .alert').innerText.replace(/\\s+/g, ' ').trim();`);
    ok('4: frågan: "Delete 3 reports and 41 card pictures? …" med Delete / Cancel', d1 === "Delete 3 reports and 41 card pictures? They are deleted from Mesa right away. Pictures already used to train a model can't be taken out of that model. Delete Cancel", d1);
    await bild('L9-DeleteAsk', ['#instRuta'], 30);
    await klicka('#instRuta [data-inst="avbryt"]');
    ok('4: Cancel tar bort frågan och raderar inget', await ev(`return !$('#instRuta .alert') && __sb.db.rapporter.length === ${R.length};`));
    await klicka('#instRuta .btn.danger'); await ev(`__sb.logg = []; __sb.spara(); return true;`);
    await klicka('#instRuta [data-inst="radera"]');
    await ev(`for (let i = 0; i < 200 && Installningar.lage !== 'raderat'; i++) await new Promise(r => setTimeout(r, 20)); return true;`);
    const d2 = await ev(`const mina = __sb.db.rapporter.filter(r => r.user_id === 'u-prov'), filer = Object.keys(__sb.filer);
      const lg = __sb.logg, iRad = lg.findIndex(l => l.tab === 'raderingar' && l.op === 'insert'), iDel = lg.findIndex(l => l.tab === 'rapporter' && l.op === 'delete');
      return { lage: Installningar.lage, text: $('#instRuta').innerText.replace(/\\s+/g, ' ').trim(), mina: mina.length, annan: __sb.db.rapporter.filter(r => r.user_id === 'u-annan').length,
        minaFiler: filer.filter(f => f.startsWith('u-prov/')).length, annanFiler: filer.filter(f => f.startsWith('u-annan/')).length, raderingar: __sb.db.raderingar.map(r => r.kod), forst: iRad >= 0 && iDel > iRad,
        upd: lg.filter(l => l.op === 'updateUser').length, pa: __sb.session.user.user_metadata.improve_pictures, del: $('#instRuta .btn.danger').disabled, toasts: __toasts };`);
    ok('4: Delete: inga rader (alla kalla, också fel) och inga filer kvar för spelaren; den andres rad och fil orörda', d2.lage === 'raderat' && d2.mina === 0 && d2.minaFiler === 0 && d2.annan === 1 && d2.annanFiler === 1, JSON.stringify(d2).slice(0, 300));
    ok('4: raderingar får exakt koderna som blivit test/träning, skrivna FÖRE raderingen', JSON.stringify(d2.raderingar.sort()) === JSON.stringify(testKoder.sort()) && d2.forst, `${d2.raderingar.join(',')} (väntat ${testKoder.join(',')})`);
    ok('4: växeln rörs inte, inget sparas av knappen', d2.upd === 0 && d2.pa === true, JSON.stringify({ upd: d2.upd, pa: d2.pa }));
    ok('4: efteråt: "Nothing you sent is stored in Mesa" + "3 reports and 41 card pictures were deleted. The switch is still on: …", knappen grå, ingen grön notis',
      d2.text.includes('Nothing you sent is stored in Mesa 3 reports and 41 card pictures were deleted. The switch is still on: new corrections are kept from now on.') && d2.del && !d2.toasts.length, d2.text);
    await bild('L9-Deleted', ['#instRuta'], 30);
    await klicka('#instBilder');
    await ev(`for (let i = 0; i < 50 && $('#instBilder').disabled; i++) await new Promise(r => setTimeout(r, 20)); await new Promise(r => setTimeout(r, 150)); return true;`);
    ok('4: växeln av efter Delete: meningen om växeln försvinner', await ev(`return /were deleted\\.$/.test([...$('#instRuta').querySelectorAll('.s')].pop().textContent.trim()) && $('#instBilder').getAttribute('aria-checked') === 'false';`));
    await ev(`Installningar.stang(); Installningar.oppna(); for (let i = 0; i < 50 && !/Nothing sent|card pictures/.test($('#instRuta').textContent); i++) await new Promise(r => setTimeout(r, 20)); return true;`);
    const d3 = await ev(`return { text: $('#instRuta').innerText.replace(/\\s+/g, ' ').trim(), del: $('#instRuta .btn.danger').disabled };`);
    ok('4: öppnad igen: "Nothing sent yet", knappen grå', d3.text.includes('Nothing sent yet') && d3.del, d3.text.slice(0, 200));
    await bild('C-Settings-NothingSent', ['#instRuta'], 30);
    /* Fynd 3: en mapp utan rad (telefonens bilder som landade efter Delete) räknas, och Delete går att trycka. */
    await ev(`__sb.filer['u-prov/rapporter/R-0999/bilder/s-1-0.jpg'] = 20000; __sb.spara(); Installningar.stang(); Installningar.oppna(); for (let i = 0; i < 50 && !/card pictures|Nothing sent/.test($('#instRuta').textContent); i++) await new Promise(r => setTimeout(r, 20)); return true;`);
    const o1 = await ev(`return { text: $('#instRuta').innerText.replace(/\\s+/g, ' ').trim(), del: $('#instRuta .btn.danger').disabled };`);
    ok('4 (fynd 3): en mapp utan rad räknas som rapport och Delete är aktiv', o1.text.includes('1 report and 0 card pictures') && !o1.del, o1.text.slice(0, 200));
    await klicka('#instRuta .btn.danger'); await klicka('#instRuta [data-inst="radera"]');
    await ev(`for (let i = 0; i < 200 && Installningar.lage !== 'raderat'; i++) await new Promise(r => setTimeout(r, 20)); return true;`);
    ok('4 (fynd 3): Delete tar bort mappen utan rad', await ev(`return Installningar.lage === 'raderat' && !Object.keys(__sb.filer).some(f => f.startsWith('u-prov/'));`));
    /* Fynd 3: telefonens bilder som kommer efter Delete till en raderad kod städas bort när rapport_bilder_klar kommer. */
    const sen = testKoder[0];
    await ev(`__sb.filer['u-prov/rapporter/${sen}/bilder/s-1-0.jpg'] = 20000; __sb.spara(); Rapport.datorTagEmot({ typ: 'rapport_bilder_klar', kod: '${sen}' }); for (let i = 0; i < 100 && __sb.filer['u-prov/rapporter/${sen}/bilder/s-1-0.jpg']; i++) await new Promise(r => setTimeout(r, 20)); return true;`);
    ok('4 (fynd 3): sena bilder till en raderad kod städas bort', await ev(`return !Object.keys(__sb.filer).some(f => f.startsWith('u-prov/'));`));
    ok('4 (fynd 3): Delete väntar in pågående rättelser och bilder (Rattelse.vanta/paus, Rapport.vantaBilder finns och löser ut)', await ev(`await Promise.all([Rattelse.vanta(500), Rapport.vantaBilder(500)]); return typeof Rattelse.paus === 'function' && Rattelse.aktiva === 0;`));
    /* Fynd 1: hinken fallerar en gång mitt i Delete → koden står redan i raderingar; nästa tryck går igenom (23505 = skriven). */
    await ev(`const u = 'u-prov', R = [{ kod: 'R-0901', user_id: u, kalla: 'rapport', anvandning: 'test', sokvag: u + '/rapporter/R-0901', created_at: '2026-10-12T20:00:00Z' }, { kod: 'R-0902', user_id: u, kalla: 'rattelse', anvandning: null, sokvag: u + '/rapporter/R-0902', created_at: '2026-10-12T20:00:00Z' }];
      __sb.db.rapporter.push(...R); __sb.db.raderingar = []; __sb.filer[u + '/rapporter/R-0901/paket.json.gz'] = 900; __sb.filer[u + '/rapporter/R-0902/beskarning.jpg'] = 9000; __sb.removeFel = 1; __sb.spara();
      Installningar.stang(); Installningar.oppna(); for (let i = 0; i < 50 && !/card picture/.test($('#instRuta').textContent); i++) await new Promise(r => setTimeout(r, 20)); return true;`);
    await klicka('#instRuta .btn.danger'); await klicka('#instRuta [data-inst="radera"]');
    await ev(`for (let i = 0; i < 200 && Installningar.lage === 'raderar'; i++) await new Promise(r => setTimeout(r, 20)); return true;`);
    const x1 = await ev(`return { lage: Installningar.lage, fel: /Couldn't delete everything/.test($('#instRuta').textContent), rad: __sb.db.raderingar.map(r => r.kod), kvar: __sb.db.rapporter.filter(r => r.user_id === 'u-prov').length };`);
    ok('4 (fynd 1): hinken fallerar → "Couldn\'t delete everything", koden står i raderingar, raderna kvar', x1.lage === 'fraga' && x1.fel && x1.rad.join() === 'R-0901' && x1.kvar === 2, JSON.stringify(x1));
    await klicka('#instRuta [data-inst="radera"]');
    await ev(`for (let i = 0; i < 200 && Installningar.lage === 'raderar'; i++) await new Promise(r => setTimeout(r, 20)); return true;`);
    const x2 = await ev(`return { lage: Installningar.lage, text: $('#instRuta').innerText.replace(/\\s+/g, ' ').trim(), rad: __sb.db.raderingar.map(r => r.kod), kvar: __sb.db.rapporter.filter(r => r.user_id === 'u-prov').length, filer: Object.keys(__sb.filer).filter(f => f.startsWith('u-prov/')).length };`);
    ok('4 (fynd 1): andra trycket går igenom: inga rader, inga filer, R-0901 en gång i raderingar', x2.lage === 'raderat' && x2.kvar === 0 && x2.filer === 0 && x2.rad.join() === 'R-0901' && x2.text.includes('1 report and 1 card picture were deleted'), JSON.stringify(x2).slice(0, 300));
    await ev(`Installningar.stang(); Installningar.oppna(); for (let i = 0; i < 50 && !/Nothing sent|card picture/.test($('#instRuta').textContent); i++) await new Promise(r => setTimeout(r, 20)); return true;`);
    await ev(`__sb.natNere = true; return true;`); await klicka('#instBilder');
    await ev(`for (let i = 0; i < 50 && $('#instBilder').disabled; i++) await new Promise(r => setTimeout(r, 20)); return true;`);
    ok('3: nätet nere: växeln går tillbaka och säger att den inte sparades', await ev(`__sb.natNere = false; return $('#instBilder').getAttribute('aria-checked') === 'false' && /Couldn't save/.test($('#instRuta').textContent);`));
    await ev(`const e = $('#instRuta'); e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return true;`);
    ok('3: Esc stänger Settings', !(await ev(`return Installningar.oppen;`)));

    /* ══ 4-knappen, 1, 2, 6 · i ett spel på datorn ══ */
    await ev(`__sb.db.rapporter = []; __sb.filer = {}; __sb.db.raderingar = []; __sb.session.user.user_metadata.improve_pictures = false; __sb.spara();
      visaVy('app'); const mig = player(); spelLage = { id: 'provC-spel', kod: 'PROVC1', namn: 'Prov C', vard: mig.id, mig: mig.id };
      mig.lage = 'bord'; mig.cards = []; mig.pending = []; mig.plats = 1; state.players = [mig]; state.active = mig.id;
      oppSatt({ klar: true }); kamAnsluten = true; kamFas = ''; kamGrund = 0; prefs.autoLage = true; renderAll(true); await new Promise(r => setTimeout(r, 300)); return true;`);
    const k1 = await ev(`const b = $('#rapportKnapp'), p = $('#modeSlot .campill'); const rb = b.getBoundingClientRect(), rp = p && p.getBoundingClientRect();
      return { syns: !b.hidden && rb.width > 0, vanster: !!rp && rb.right <= rp.left, text: b.textContent.trim(), flagga: !!b.querySelector('svg path[d^="M5 5a5"]') };`);
    ok('4: knappen i toppraden: Report a problem med flagga, till vänster om kamerapillret (Mirror)', k1.syns && k1.vanster && k1.text === 'Report a problem' && k1.flagga, JSON.stringify(k1));
    await bild('L9-BtnBar-dator', ['#app .topbar']);
    /* Fynd 4: texten "Report a problem" syns också vid 1024 px, och toppraden bryts inte. */
    const topp = async w => {
      await c.cdp('Emulation.setDeviceMetricsOverride', { width: w, height: 800, deviceScaleFactor: 1, mobile: false }); await vanta(300);
      await ev(`renderAll(true); await new Promise(r => setTimeout(r, 200)); return true;`);
      const r = await ev(`const b = $('#rapportKnapp'), s = b.querySelector('span'), t = $('#app .topbar'), p = $('#modeSlot .campill'); const rb = b.getBoundingClientRect(), rp = p && p.getBoundingClientRect();
        return { text: !!s && getComputedStyle(s).display !== 'none' && s.getBoundingClientRect().width > 0, enRad: !!rp && Math.abs((rb.top + rb.bottom) / 2 - (rp.top + rp.bottom) / 2) < 6, bryts: t.scrollWidth > t.clientWidth + 1, h: Math.round(t.getBoundingClientRect().height) };`);
      ok(`4 (fynd 4): ${w} px: knappens text syns, samma rad som kamerapillret, toppraden bryts inte`, r.text && r.enRad && !r.bryts, JSON.stringify(r));
      await bild('C-toppraden-' + w, ['#app .topbar'], 0);
    };
    await topp(1024); await topp(1400);
    await c.cdp('Emulation.clearDeviceMetricsOverride'); await vanta(200);
    await klicka('#rapportKnapp');
    const k2 = await ev(`const r = document.querySelector('.rapruta'); return { oppen: Rapport.oppen, kryss: r.querySelectorAll('input[type=checkbox]').length, fokus: document.activeElement && document.activeElement.id, text: r.innerText.replace(/\\s+/g, ' ').trim() };`);
    ok('4/8: knappen öppnar A:s ruta; inga kryssrutor i rutan; textfältet har fokus', k2.oppen && k2.kryss === 0 && k2.fokus === 'rapText', JSON.stringify(k2).slice(0, 200));
    await bild('L9-Report-oppen', ['.rapruta', '#rapportKnapp'], 20);
    await ev(`const t = $('#rapText'); t.value = 'A second Island showed up next to mine'; t.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('.rapruta [data-tagg="dok_upp"]').click(); __sb.uppVanta = 700; document.querySelector('.rapruta [data-rap="skicka"]').click(); await new Promise(r => setTimeout(r, 250)); return true;`);
    ok('6: Sending: fälten låsta, "Sending. This takes a few seconds."', await ev(`return Rapport.lage === 'skickar' && $('#rapText').disabled && /Sending\\. This takes a few seconds\\./.test(document.querySelector('.rapruta').textContent);`));
    await bild('L9-ReportSending', ['.rapruta'], 20);
    await ev(`for (let i = 0; i < 300 && Rapport.lage !== 'skickad'; i++) await new Promise(r => setTimeout(r, 20)); __sb.uppVanta = 0; return true;`);
    const r1 = await ev(`const r = __sb.db.rapporter.filter(x => x.kalla === 'rapport'); return { lage: Rapport.lage, kod: $('#rapKod') && $('#rapKod').textContent, rader: r, filer: Object.keys(__sb.filer), pa: __sb.session.user.user_metadata.improve_pictures };`);
    const rr = r1.rader[0] || {};
    ok('1: rapport från datorn med inställningen AV: Sent med koden, raden har text, tagg, vy och kalla rapport', r1.lage === 'skickad' && r1.rader.length === 1 && r1.kod === rr.kod && rr.text === 'A second Island showed up next to mine' && rr.tagg === 'dok_upp' && rr.vy && 'zoom' in rr.vy && r1.pa === false, JSON.stringify(rr).slice(0, 300));
    ok('1: paketet uppladdat under scans/<uid>/rapporter/<kod>/', r1.filer.some(f => f.startsWith(`u-prov/rapporter/${rr.kod}/`)), r1.filer.join(', '));
    await bild('L9-ReportSent', ['.rapruta'], 20);
    await ev(`Rapport.stang(); return true;`);
    /* Couldn't send (nätet), Phone not connected (+ bilder saknas), Today's limit. */
    await ev(`__sb.natNere = true; Rapport.oppna(); await new Promise(r => setTimeout(r, 200)); document.querySelector('.rapruta [data-rap="skicka"]').click(); for (let i = 0; i < 200 && Rapport.lage === 'skickar'; i++) await new Promise(r => setTimeout(r, 20)); return true;`);
    ok("6: Couldn't send the report (nätet nere), Try again", await ev(`return Rapport.lage === 'fel' && /Couldn't send the report\\./.test(document.querySelector('.rapruta').textContent) && /Try again/.test(document.querySelector('.rapruta').textContent);`));
    await bild('L9-ReportFailed', ['.rapruta'], 20);
    await ev(`__sb.natNere = false; Rapport.stang(); kamAnsluten = false; renderAll(true); Rapport.oppna(); await new Promise(r => setTimeout(r, 200)); return true;`);
    ok("6: Your phone isn't connected (gul rad) och den lilla texten utan 'what your camera saw'", await ev(`const t = document.querySelector('.rapruta').textContent; return /Your phone isn't connected\\./.test(t) && !/what your camera saw/.test(t);`));
    await bild('L9-ReportNoPhone', ['.rapruta'], 20);
    await ev(`document.querySelector('.rapruta [data-rap="skicka"]').click(); for (let i = 0; i < 200 && Rapport.lage !== 'skickad'; i++) await new Promise(r => setTimeout(r, 20)); await new Promise(r => setTimeout(r, 300)); return true;`);
    ok("6: utan telefon: raden får bilder 'saknas'", await ev(`const r = __sb.db.rapporter.filter(x => x.kalla === 'rapport').pop(); return r && r.bilder === 'saknas';`), await ev(`return JSON.stringify(__sb.db.rapporter.filter(x => x.kalla === 'rapport').map(r => r.bilder));`));
    await ev(`Rapport.stang(); for (let i = 0; i < 20; i++) __sb.db.rapporter.push({ kod: 'R-T' + i, user_id: 'u-prov', kalla: 'rapport', created_at: new Date().toISOString() }); Rapport.oppna(); for (let i = 0; i < 50 && Rapport.lage !== 'tak'; i++) await new Promise(r => setTimeout(r, 20)); return true;`);
    ok("6: Today's limit när rutan öppnas (20 i dag), bara Close", await ev(`const r = document.querySelector('.rapruta'); return Rapport.lage === 'tak' && /You have sent 20 reports today\\./.test(r.textContent) && !r.querySelector('#rapText');`));
    await bild('L9-ReportLimit', ['.rapruta'], 20);
    await ev(`Rapport.stang(); __sb.db.rapporter = __sb.db.rapporter.filter(r => !/^R-T/.test(r.kod)); return true;`);
    /* 2: ett provocerat kodfel → kalla 'fel' utan bilder. */
    await ev(`setTimeout(() => { throw new Error('prov-c: provocerat kodfel'); }, 0); for (let i = 0; i < 100 && !__sb.db.rapporter.some(r => r.kalla === 'fel'); i++) await new Promise(r => setTimeout(r, 20)); await new Promise(r => setTimeout(r, 300)); return true;`);
    const e1 = await ev(`const r = __sb.db.rapporter.find(x => x.kalla === 'fel'); return r ? { text: r.text, bilder: r.bilder || null, filer: Object.keys(__sb.filer).filter(f => f.startsWith(r.sokvag + '/')).length, tagg: r.tagg || null } : null;`);
    ok("2: provocerat kodfel → en rad kalla 'fel' utan bilder och utan filer", e1 && /provocerat kodfel/.test(e1.text) && !e1.bilder && e1.filer === 0 && !e1.tagg, JSON.stringify(e1));
    /* 3: rättelserna följer Settings-växeln (av/på/av), genom appens applyPick som i prov-b. */
    await ev(`kamAnsluten = true; const mig = player();
      const spar = (id, namn, x, y, varfor) => ({ id, tillstand: 'klar', namn, saker: true, x, y, w: 0.08, h: 0.11, tappad: false, vilar: true, varfor });
      kamTogsEmot({ typ: 'bord', av: 'u-prov', fran: 'kamera', fas: '', spar: [spar(1, 'Llanowar Elves', 0.2, 0.2, 'remsa'), spar(2, 'Forest', 0.42, 0.2, 'modell land'), spar(3, 'Serra Angel', 0.64, 0.2, 'modell+orb')] });
      await new Promise(r => setTimeout(r, 1200)); return mig.cards.map(k => k.name).join(',');`).then(v => ok('3: partiet: tre kamerakort på mattan', /Llanowar Elves/.test(v) && /Serra Angel/.test(v), v));
    const byt = (fran, till) => ev(`const mig = player(), c0 = mig.cards.find(k => k.name === ${JSON.stringify(fran)}); SW.target = { kind: 'card', id: c0.cid }; applyPick(${JSON.stringify(till)}, null, null); await new Promise(r => setTimeout(r, 400)); return __sb.db.rapporter.filter(r => r.kalla === 'rattelse').length;`);
    const vaxla = async () => { await ev(`Installningar.oppna(); for (let i = 0; i < 50 && $('#instBilder').disabled; i++) await new Promise(r => setTimeout(r, 20)); await new Promise(r => setTimeout(r, 200)); return true;`); await klicka('#instBilder'); await ev(`for (let i = 0; i < 50 && $('#instBilder').disabled; i++) await new Promise(r => setTimeout(r, 20)); const p = $('#instBilder').getAttribute('aria-checked'); Installningar.stang(); return p;`); };
    const av1 = await byt('Llanowar Elves', 'Elvish Mystic');
    ok('3: inställningen AV: namnbytet sparar ingen rättelse, inte heller lokalt (ingen fil)', av1 === 0 && !Object.keys(await ev(`return __sb.filer;`)).some(f => /beskarning|rattelse/.test(f)), String(av1));
    await vaxla();
    ok('3: Settings på → servern säger på', await ev(`return __sb.session.user.user_metadata.improve_pictures === true;`));
    const pa1 = await byt('Serra Angel', 'Shivan Dragon');
    await ev(`for (let i = 0; i < 600 && !Object.keys(__sb.filer).some(f => /rattelse\\.json$/.test(f)); i++) await new Promise(r => setTimeout(r, 25)); return true;`);
    ok('3: PÅ: namnbytet ger en rad kalla rattelse och rattelse.json', pa1 === 1 && await ev(`return Object.keys(__sb.filer).some(f => /rattelse\\.json$/.test(f));`), String(pa1));
    await vaxla();
    const av2 = await byt('Forest', 'Plains');
    ok('3: AV igen (Settings): nästa namnbyte sparar ingenting', av2 === 1 && await ev(`return __sb.session.user.user_metadata.improve_pictures === false;`), String(av2));
    /* Digital table och utanför ett spel. */
    const k3 = await ev(`const mig = player(); mig.lage = 'utan'; renderAll(true); await new Promise(r => setTimeout(r, 200)); const ute = !$('#rapportKnapp').hidden;
      spelLage = null; renderMode(); await new Promise(r => setTimeout(r, 100)); const utanSpel = !$('#rapportKnapp').hidden; return { ute, utanSpel };`);
    ok('4: knappen syns i Digital table också, och inte utanför ett spel', k3.ute && !k3.utanSpel, JSON.stringify(k3));
    await ev(`visaHem(); await new Promise(r => setTimeout(r, 400)); return true;`);
    ok('4: ingen knapp på Home', !(await syns('#rapportKnapp')) && !(await ev(`return [...document.querySelectorAll('#vyHem button, #vyLeksida button')].some(b => /Report a problem/.test(b.textContent));`)));

    /* ══ 4/5 · Telefonen ══ */
    await c.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await ev(`kameraEnhet = true; kamLage = { id: 'provC-spel', kod: 'K7QX' }; visaVy('kamera'); $('#kamSpel').textContent = 'K7QX'; $('#kamPrick').classList.add('pa'); $('#vyKamera').classList.add('visa');
      window.__kanal = []; window.__svara = 'kod'; const t0 = Moln.sandKam;
      Moln.sandKam = (typ, data) => { const m = Object.assign({ typ }, data || {}); __kanal.push(m);
        if (typ === 'rapport' && __svara === 'sakta') { setTimeout(() => Rapport.telefonKommando({ typ: 'rapport_svar', id: m.id, mottagen: 1 }), 300); setTimeout(() => Rapport.telefonKommando({ typ: 'rapport_svar', id: m.id, kod: 'R-0413' }), 12500); }
        else if (typ === 'rapport' && __svara === 'mottagen') setTimeout(() => Rapport.telefonKommando({ typ: 'rapport_svar', id: m.id, mottagen: 1 }), 300);
        else if (typ === 'rapport' && __svara) setTimeout(() => Rapport.telefonKommando(__svara === 'kod' ? { typ: 'rapport_svar', id: m.id, kod: 'R-0412' } : { typ: 'rapport_svar', id: m.id, fel: __svara }), 400);
        return true; };
      await new Promise(r => setTimeout(r, 200)); return true;`);
    const t1 = await ev(`const b = $('#kamRapport'), d = $('#kamStang'); const rb = b.getBoundingClientRect(), rd = d.getBoundingClientRect(); return { syns: !b.hidden && rb.width > 0, bredvid: rb.right <= rd.left && Math.abs(rb.top - rd.top) < 4, text: b.textContent.trim() };`);
    ok('4: telefonen: Report a problem i toppraden bredvid Disconnect', t1.syns && t1.bredvid && t1.text === 'Report a problem', JSON.stringify(t1));
    await bild('L9-BtnBar-telefon', ['#vyKamera .kamtopp'], 0);
    await klicka('#kamRapport');
    const t2 = await ev(`const a = $('#telArk'); return { oppen: TelefonArk.oppen, text: a.innerText.replace(/\\s+/g, ' ').trim(), chips: a.querySelectorAll('.chip').length, h: a.querySelector('.chip').getBoundingClientRect().height, bred: Math.round(a.querySelector('[data-ark="skicka"]').getBoundingClientRect().width), arkBred: Math.round(a.getBoundingClientRect().width), kryss: a.querySelectorAll('input[type=checkbox]').length, botten: Math.round(innerHeight - a.getBoundingClientRect().bottom) };`);
    ok('5: arket nerifrån: Report a problem, textfältet, sju större snabbval, Send report hel bredd, inga kryssrutor', t2.oppen && t2.chips === 7 && t2.h >= 44 && t2.bred >= t2.arkBred - 40 && t2.kryss === 0 && t2.botten === 0 && /^Report a problem/.test(t2.text) && /Send report$/.test(t2.text), JSON.stringify(t2));
    await ev(`$('#telArk [data-tagg="dok_upp"]').click(); return true;`);
    await bild('L9-SimplePhone', ['#vyKamera'], 0);
    const rader0 = await ev(`return __sb.logg.filter(l => l.tab === 'rapporter' && l.op === 'insert').length + __sb.logg.filter(l => l.op === 'upload').length;`);
    await ev(`const t = $('#telArkText'); t.value = 'The camera stopped after I moved the phone'; t.dispatchEvent(new Event('input', { bubbles: true })); $('#telArk [data-ark="skicka"]').click(); await new Promise(r => setTimeout(r, 100)); return true;`);
    ok('5: medan datorn svarar: Sending, fälten låsta', await ev(`return TelefonArk.lage === 'skickar' && $('#telArkText').disabled;`));
    await ev(`for (let i = 0; i < 100 && TelefonArk.lage === 'skickar'; i++) await new Promise(r => setTimeout(r, 20)); return true;`);
    const t3 = await ev(`const m = __kanal.find(k => k.typ === 'rapport'); return { lage: TelefonArk.lage, text: $('#telArk').innerText.replace(/\\s+/g, ' ').trim(), m, egna: __sb.logg.filter(l => l.tab === 'rapporter' && l.op === 'insert').length + __sb.logg.filter(l => l.op === 'upload').length };`);
    ok('5: kvittensen: Report sent · R-0412 · "Your computer sent it. …" · Done', t3.lage === 'skickad' && t3.text === 'Report sent R-0412 Your computer sent it. If you write to us about it, mention this code. Done', t3.text);
    ok('5: telefonen skickar aldrig själv: orden och taggen gick i kanalen, ingen rad och ingen uppladdning från telefonen', t3.m && t3.m.text === 'The camera stopped after I moved the phone' && t3.m.tagg === 'dok_upp' && t3.egna === rader0, JSON.stringify(t3.m));
    await bild('L9-PhoneReportSent', ['#vyKamera'], 0);
    await klicka('#telArk [data-ark="stang"]');
    await ev(`window.__svara = null; $('#kamPrick').classList.remove('pa'); TelefonArk.oppna(); const t = $('#telArkText'); t.value = 'The camera stopped after I moved the phone'; t.dispatchEvent(new Event('input', { bubbles: true })); $('#telArk [data-ark="skicka"]').click(); return true;`);
    await vanta(9000);
    const t4a = await ev(`return TelefonArk.lage;`);
    await vanta(1800);
    const t4 = await ev(`const a = $('#telArk'); return { lage: TelefonArk.lage, text: a.innerText.replace(/\\s+/g, ' ').trim(), ord: $('#telArkText').value, knappar: [...a.querySelectorAll('button')].map(b => b.textContent.trim()).join('|') };`);
    ok("5: inget svar på 10 s → Can't reach your computer, orden kvar, Close / Try again", t4a === 'skickar' && t4.lage === 'narInte' && t4.ord === 'The camera stopped after I moved the phone' && t4.knappar === 'Close|Try again'
      && t4.text.includes("Can't reach your computer. Reports are sent from the computer. Your words are kept here: try again when the dot at the top is green, or use Report a problem on the computer."), JSON.stringify(t4));
    await bild('L9-PhoneReportAlone', ['#vyKamera'], 0);
    await ev(`window.__svara = 'kod'; $('#kamPrick').classList.add('pa'); $('#telArk [data-ark="skicka"]').click(); for (let i = 0; i < 100 && TelefonArk.lage !== 'skickad'; i++) await new Promise(r => setTimeout(r, 20)); return true;`);
    ok('5: Try again när datorn svarar → Report sent', await ev(`return TelefonArk.lage === 'skickad';`));
    ok('5 (fynd 2): Try again efter Can\'t reach skickar samma id (datorn svarar med samma rapport, ingen ny rad)', await ev(`const r = __kanal.filter(k => k.typ === 'rapport'); return r.length >= 3 && r[r.length - 1].id === r[r.length - 2].id && r[r.length - 2].id !== r[r.length - 3].id;`));
    /* Fynd 2: datorn svarar mottagen direkt → arket står kvar i Sending efter 10 s, och koden kommer. */
    await ev(`TelefonArk.stang(); window.__svara = 'sakta'; TelefonArk.oppna(); $('#telArk [data-ark="skicka"]').click(); return true;`);
    await vanta(11000);
    const m1 = await ev(`return TelefonArk.lage;`);
    await ev(`for (let i = 0; i < 150 && TelefonArk.lage === 'skickar'; i++) await new Promise(r => setTimeout(r, 20)); return true;`);
    const m2 = await ev(`return { lage: TelefonArk.lage, kod: $('#telArkKod') && $('#telArkKod').textContent };`);
    ok('5 (fynd 2): datorn har tagit emot → Sending står kvar efter 10 s, sedan Report sent med koden', m1 === 'skickar' && m2.lage === 'skickad' && m2.kod === 'R-0413', m1 + ' ' + JSON.stringify(m2));
    /* Fynd 2: en kod som kommer efter Can't reach byter arket till Report sent. */
    await ev(`TelefonArk.stang(); window.__svara = null; TelefonArk.oppna(); $('#telArk [data-ark="skicka"]').click(); return true;`);
    await vanta(10500);
    const n1 = await ev(`return TelefonArk.lage;`);
    await ev(`const r = __kanal.filter(k => k.typ === 'rapport').pop(); Rapport.telefonKommando({ typ: 'rapport_svar', id: r.id, kod: 'R-0414' }); await new Promise(r => setTimeout(r, 100)); return true;`);
    const n2 = await ev(`return { lage: TelefonArk.lage, kod: $('#telArkKod') && $('#telArkKod').textContent };`);
    ok('5 (fynd 2): sen kod medan arket står i Can\'t reach → Report sent', n1 === 'narInte' && n2.lage === 'skickad' && n2.kod === 'R-0414', n1 + ' ' + JSON.stringify(n2));
    /* Fynd 7: rapporterna är av på datorn → bara Close. */
    await ev(`TelefonArk.stang(); window.__svara = 'av'; TelefonArk.oppna(); $('#telArk [data-ark="skicka"]').click(); for (let i = 0; i < 100 && TelefonArk.lage === 'skickar'; i++) await new Promise(r => setTimeout(r, 20)); return true;`);
    const v1 = await ev(`const a = $('#telArk'); return { lage: TelefonArk.lage, knappar: [...a.querySelectorAll('button')].map(b => b.textContent.trim()).join('|'), text: a.innerText.replace(/\\s+/g, ' ').trim() };`);
    ok('5 (fynd 7): "Reports are turned off on your computer." bara med Close', v1.lage === 'av' && v1.knappar === 'Close' && v1.text.includes('Reports are turned off on your computer.'), JSON.stringify(v1));
    await ev(`TelefonArk.stang(); window.__svara = 'tak'; TelefonArk.oppna(); $('#telArk [data-ark="skicka"]').click(); for (let i = 0; i < 100 && TelefonArk.lage === 'skickar'; i++) await new Promise(r => setTimeout(r, 20)); return true;`);
    ok('5: datorn svarar tak → "You have sent 20 reports today." + Close', await ev(`return TelefonArk.lage === 'tak' && /You have sent 20 reports today\\./.test($('#telArk').textContent);`));
    /* Granskningen av c7f6991, fynd 5: datorn har svarat mottagen men koden kommer inte på 60 s → Couldn't send (inte
       Can't reach, pricken är grön), orden kvar, Try again med samma id. 60 s krymps till 0,6 s i sidan under provet. */
    await ev(`TelefonArk.stang(); window.__st = window.setTimeout; window.setTimeout = (f, ms, ...a) => __st(f, ms === 60000 ? 600 : ms, ...a);
      window.__svara = 'mottagen'; TelefonArk.oppna(); const t = $('#telArkText'); t.value = 'Stuck after mottagen'; t.dispatchEvent(new Event('input', { bubbles: true }));
      $('#telArk [data-ark="skicka"]').click(); for (let i = 0; i < 150 && TelefonArk.lage === 'skickar'; i++) await new Promise(r => __st(r, 20)); window.setTimeout = __st; return true;`);
    const f5 = await ev(`const a = $('#telArk'); return { lage: TelefonArk.lage, text: a.innerText.replace(/\\s+/g, ' ').trim(), ord: $('#telArkText').value, knappar: [...a.querySelectorAll('button')].filter(b => !b.dataset.tagg).map(b => b.textContent.trim()).join('|') };`);
    ok("C2 (fynd 5): mottagen men ingen kod på 60 s → Couldn't send + Check your internet connection…, orden kvar, Try again (inte Can't reach)",
      f5.lage === 'fel' && f5.text.includes("Couldn't send the report. Check your internet connection and try again. Your words are kept until you close this box.") && !/Can't reach/.test(f5.text) && f5.ord === 'Stuck after mottagen' && f5.knappar === 'Try again', JSON.stringify(f5));
    await ev(`window.__svara = 'kod'; $('#telArk [data-ark="skicka"]').click(); for (let i = 0; i < 100 && TelefonArk.lage !== 'skickad'; i++) await new Promise(r => setTimeout(r, 20)); return true;`);
    ok('C2 (fynd 5): Try again efter Couldn\'t send skickar samma id → Report sent', await ev(`const r = __kanal.filter(k => k.typ === 'rapport'); return TelefonArk.lage === 'skickad' && r[r.length - 1].id === r[r.length - 2].id;`));
    await ev(`TelefonArk.stang(); return true;`);
    /* Datorns halva av telefonens rapport: orden och taggen in, raden ut, koden tillbaka. */
    const t5 = await ev(`kameraEnhet = false; kamLage = null; __kanal.length = 0; window.__svara = null;
      Rapport.datorTagEmot({ typ: 'rapport', id: 'tel-1', text: 'from the phone', tagg: 'tap' });
      for (let i = 0; i < 200 && !__kanal.some(k => k.typ === 'rapport_svar' && k.kod); i++) await new Promise(r => setTimeout(r, 20));
      const s = __kanal.find(k => k.typ === 'rapport_svar' && k.kod), r = __sb.db.rapporter.find(x => x.text === 'from the phone'); return { forst: __kanal[0], s, r: r && { kod: r.kod, tagg: r.tagg, kalla: r.kalla } };`);
    ok('1: telefonens rapport på datorn: raden (text, tagg, kalla rapport) och rapport_svar med koden', t5.s && t5.r && t5.s.kod === t5.r.kod && t5.r.tagg === 'tap' && t5.r.kalla === 'rapport', JSON.stringify(t5));
    ok('1 (fynd 2): datorn svarar { mottagen: 1 } först, innan lådan och uppladdningen', t5.forst && t5.forst.typ === 'rapport_svar' && t5.forst.mottagen === 1 && !t5.forst.kod, JSON.stringify(t5.forst));
    const t6 = await ev(`__kanal.length = 0; Rapport.datorTagEmot({ typ: 'rapport', id: 'tel-1', text: 'from the phone', tagg: 'tap' });
      for (let i = 0; i < 100 && !__kanal.some(k => k.kod); i++) await new Promise(r => setTimeout(r, 20));
      return { s: __kanal.find(k => k.kod), rader: __sb.db.rapporter.filter(x => x.text === 'from the phone').length };`);
    ok('1 (fynd 2): samma id igen → samma kod, ingen ny rad', t6.s && t6.s.kod === t5.s.kod && t6.rader === 1, JSON.stringify(t6));
    /* Granskningen av c7f6991, fynd 1–3: Delete tar tid (varje list 700 ms). Under tiden: telefonens rapport kommer
       (pausad, skickas efter Delete), en annan enhet skapar en rad med fil (inte läst → orörd), och telefonens sena
       bilder till en läst kod kommer (städas bort, raden uppdateras inte). */
    await ev(`kameraEnhet = false; kamLage = null; __kanal.length = 0; window.__svara = null;
      const u = 'u-prov'; __sb.db.rapporter.push({ kod: 'R-0950', user_id: u, kalla: 'rapport', anvandning: null, sokvag: u + '/rapporter/R-0950', created_at: '2026-10-13T08:00:00Z' });
      __sb.filer[u + '/rapporter/R-0950/rapport.json.gz'] = 800; __sb.spara();
      Installningar.stang(); Installningar.oppna(); for (let i = 0; i < 100 && !/report/.test($('#instRuta').textContent); i++) await new Promise(r => setTimeout(r, 20)); return true;`);
    const fore = await ev(`return __sb.db.rapporter.filter(r => r.user_id === 'u-prov').map(r => r.kod);`);
    await klicka('#instRuta .btn.danger');
    await ev(`__sb.listVanta = 700; __sb.logg = []; __sb.spara(); return true;`);
    await klicka('#instRuta [data-inst="radera"]');
    const w1 = await ev(`await new Promise(r => setTimeout(r, 150));
      const a = $('#instRuta .alert'); const r = { lage: Installningar.lage, text: a ? a.innerText.replace(/\\s+/g, ' ').trim() : '', bar: !!$('#instRuta .bar2'), knappar: [...$('#instRuta .alert').querySelectorAll('button')].every(b => b.disabled) };
      Rapport.datorTagEmot({ typ: 'rapport', id: 'tel-del', text: 'sent during delete', tagg: null });
      return r;`);
    ok('C2 (fynd 2): under Delete: "Deleting. This takes a few seconds." med stapeln, Delete/Cancel gråa', w1.lage === 'raderar' && w1.text.includes('Deleting. This takes a few seconds.') && w1.bar && w1.knappar && !/—|–/.test(w1.text), JSON.stringify(w1));
    await ev(`await new Promise(r => setTimeout(r, 1100)); const u = 'u-prov';
      __sb.db.rapporter.push({ kod: 'R-0960', user_id: u, kalla: 'rapport', anvandning: null, sokvag: u + '/rapporter/R-0960', created_at: new Date().toISOString() });
      __sb.filer[u + '/rapporter/R-0960/rapport.json.gz'] = 700; __sb.spara();
      Rapport.datorTagEmot({ typ: 'rapport_bilder_klar', kod: 'R-0950' }); return true;`);
    await ev(`for (let i = 0; i < 1000 && Installningar.lage === 'raderar'; i++) await new Promise(r => setTimeout(r, 20));
      for (let i = 0; i < 300 && !__kanal.some(k => k.typ === 'rapport_svar' && k.id === 'tel-del' && k.kod); i++) await new Promise(r => setTimeout(r, 20)); __sb.listVanta = 0; return true;`);
    const w2 = await ev(`const mina = __sb.db.rapporter.filter(r => r.user_id === 'u-prov'), filer = Object.keys(__sb.filer).filter(f => f.startsWith('u-prov/'));
      const ny = mina.find(r => r.text === 'sent during delete'), s = __kanal.find(k => k.typ === 'rapport_svar' && k.id === 'tel-del' && k.kod);
      const lg = __sb.logg, iDel = lg.findIndex(l => l.tab === 'rapporter' && l.op === 'delete'), iNy = lg.findIndex(l => l.tab === 'rapporter' && l.op === 'insert' && l.kalla === 'rapport');
      return { lage: Installningar.lage, kvar: mina.map(r => r.kod), filer, ny: ny && ny.kod, svar: s && s.kod, nyFil: !!ny && filer.some(f => f.startsWith('u-prov/rapporter/' + ny.kod + '/')),
        efter: iDel >= 0 && iNy > iDel, uppdat: lg.slice(0, iNy < 0 ? lg.length : iNy).filter(l => l.tab === 'rapporter' && l.op === 'update').length };`);
    ok('C2 (fynd 1): Delete tar bara de lästa koderna: inget av det som fanns kvar', w2.lage === 'raderat' && !fore.some(k => w2.kvar.includes(k)) && !w2.filer.some(f => /R-0950/.test(f)), JSON.stringify({ fore, w2 }).slice(0, 400));
    ok('C2 (fynd 1): en rad från en annan enhet under Delete överlever med sin fil', w2.kvar.includes('R-0960') && w2.filer.includes('u-prov/rapporter/R-0960/rapport.json.gz'), JSON.stringify(w2).slice(0, 400));
    ok('C2 (fynd 1): telefonens rapport under Delete väntar och skickas efteråt: rad + fil kvar, koden till telefonen', !!w2.ny && w2.svar === w2.ny && w2.kvar.includes(w2.ny) && w2.nyFil && w2.efter, JSON.stringify(w2).slice(0, 400));
    ok('C2 (fynd 3): sena bilder till en läst kod under Delete städas (koderna glömda före raderingen, raden uppdateras inte)', w2.uppdat === 0, JSON.stringify(w2).slice(0, 400));
    ok('Claude: ingen fråga till /api/identify i hela provet, inget annat nät', !(await ev(`return Lada.utdrag().some(e => e.slag === 'claude');`)), 'blockerade värdar: ' + [...blockerat].join(', '));
  } catch (e) { console.error('prov-c: ' + e.message); await c.stang(); srv.close(); process.exit(2); }
  await c.stang(); srv.close();
  let fel = 0;
  for (const [namn, okk, detalj] of rad) { if (!okk) fel++; console.log(`${okk ? 'OK ' : 'FEL'}  ${namn}${detalj && !okk ? '  (' + String(detalj).slice(0, 300) + ')' : ''}`); }
  console.log(`\nprov-c: ${rad.length - fel} OK, ${fel} FEL${BILDER ? ' · skärmbilder i ' + BILDER : ''}`);
  process.exit(fel ? 1 : 0);
})();

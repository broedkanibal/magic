/* Problemrapporten (MES-365): provet i huvudlös Chrome, utan nät och utan Claude.

   Kör:  node dev/rapport/prov.cjs [--fil index.html] [--paket ut.json]

   Spelar ett litet parti i appen (Mirror my table, avstamBord som i
   dev/mattan.cjs), trycker och drar på mattan, provocerar ett kodfel och
   två misslyckade anrop, låter en "telefon" svara med sin låda på en klocka
   som går 5 s före, och skickar en rapport genom rutan. Supabase är en
   attrapp i sidan (Moln.rapportRad/rapportFil/…): paketet som skulle laddats
   upp hämtas ut och körs genom hamta.cjs --fil, så att LÄS-MIG.md och
   tidslinjen provas på riktigt. Rutans fem lägen nås: Sending, Sent med
   kod och Copy, Couldn't send med Try again, Today's limit (provräknare)
   och Phone not connected. Taket: den 21:a rapporten avvisas.

   Slutkod 0 = allt OK, 1 = något FEL, 2 = gick inte att köra. */
'use strict';
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os'), http = require('http');
const ROT = path.join(__dirname, '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const FIL = path.resolve(arg('--fil', path.join(ROT, 'index.html')));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const vanta = ms => new Promise(r => setTimeout(r, ms));

function server() {
  return new Promise(res => {
    const s = http.createServer((req, ut) => {
      const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (u === '/index.html' || u === '/') { ut.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); return ut.end(fs.readFileSync(FIL)); }
      ut.writeHead(404); ut.end();   // allt annat, också /api/*: 404 (ett misslyckat anrop i provet)
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}
async function chrome() {
  if (!fs.existsSync(CHROME)) { console.error('rapport-prov: hittar inte Chrome (sätt CHROME=…)'); process.exit(2); }
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-rapport-'));
  const p = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profil, '--no-first-run', '--no-default-browser-check', '--window-size=1400,1000', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let ws = null, err = '';
  p.stderr.on('data', d => { err += d; const m = err.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) ws = m[1]; });
  const t0 = Date.now();
  while (!ws) { if (Date.now() - t0 > 15000) throw new Error('Chrome svarade inte'); await vanta(50); }
  const port = new URL(ws).port;
  let sida = null;
  while (!sida) { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); sida = l.find(t => t.type === 'page'); if (!sida) await vanta(50); }
  const sock = new WebSocket(sida.webSocketDebuggerUrl);
  await new Promise((res, rej) => { sock.onopen = res; sock.onerror = rej; });
  let nr = 0; const svar = new Map();
  sock.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && svar.has(m.id)) { svar.get(m.id)(m); svar.delete(m.id); } };
  const cdp = (method, params) => new Promise((res, rej) => { const id = ++nr; svar.set(id, m => m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)); sock.send(JSON.stringify({ id, method, params: params || {} })); });
  const stang = async () => { try { await cdp('Browser.close'); } catch (e) {} for (let i = 0; i < 40 && p.exitCode == null; i++) await vanta(50); if (p.exitCode == null) p.kill(); try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {} };
  return { cdp, stang };
}

/* Provet i sidan. */
const PROV = async () => {
  const rad = [], ok = (namn, villkor, detalj) => rad.push([namn, !!villkor, detalj || '']);
  const vanta = ms => new Promise(r => setTimeout(r, ms));
  /* ── Attrappen för Supabase och kanalen ── */
  const A = { rader: [], filer: {}, kanal: [], idag: 0, felRad: false, felFil: 0, seg: 0, uppd: [] };
  window.__A = A;
  let nr = 0;
  Moln.inloggad = () => true;
  Moln.minId = () => 'u-prov';
  Moln.rapportRad = async r => {
    if (A.seg) await vanta(A.seg);
    if (A.felRad) throw new Error('Failed to fetch');
    if (r.kalla === 'rapport' && A.idag >= 20) throw Object.assign(new Error('rapport_tak'), { tak: true });
    if (r.kalla === 'rapport') A.idag++;
    const kod = 'R-' + String(++nr).padStart(4, '0');
    A.rader.push(Object.assign({ kod }, JSON.parse(JSON.stringify(r))));
    return { kod, sokvag: 'u-prov/rapporter/' + kod };
  };
  Moln.rapportFil = async (mapp, namn, blob) => { if (A.felFil > 0) { A.felFil--; throw new Error('Failed to fetch'); } A.filer[mapp + '/' + namn] = blob; };
  Moln.rapportUppdatera = async (kod, f) => { A.uppd.push([kod, f]); return true; };
  Moln.rapporterIdag = async () => A.idag;
  Moln.sandKam = (typ, data) => { A.kanal.push(Object.assign({ typ }, data || {})); return true; };

  /* ── Ett parti: Mirror my table, telefonen ansluten ── */
  visaVy('app');
  const mig = player();
  spelLage = { id: 'rapportprov', kod: 'RAPP01', namn: 'Prov', vard: mig.id, mig: mig.id };
  mig.lage = 'bord'; mig.cards = []; mig.pending = []; mig.plats = 1;
  state.players = [mig]; state.active = mig.id;
  oppSatt({ klar: true });
  kamAnsluten = true; kamFas = ''; kamGrund = 0; prefs.autoLage = true;
  renderAll(true);
  const spar = (id, namn, x, y, tappad) => ({ id, tillstand: 'klar', namn, saker: true, x, y, w: 0.08, h: 0.11, tappad: !!tappad, vilar: true });
  const bord = [spar(1, 'Llanowar Elves', 0.2, 0.2), spar(2, 'Forest', 0.42, 0.2), spar(3, 'Serra Angel', 0.64, 0.2)];
  kamTogsEmot({ typ: 'bord', av: 'u-prov', fran: 'kamera', spar: bord, fas: '' });   // genom mottagaren: bordsloggen och avstämningen
  await vanta(1200);
  bord[0] = spar(1, 'Llanowar Elves', 0.2, 0.2, true);   // tappas
  kamTogsEmot({ typ: 'bord', av: 'u-prov', fran: 'kamera', spar: bord, fas: '' });
  await vanta(1200);
  /* Spelaren lägger Forest i graveyard och tar bort Serra Angel. */
  flyttaTill(mig.cards.findIndex(c => c.name === 'Forest'), ZON_GRAV);
  await vanta(1200);
  mig.cards.splice(mig.cards.findIndex(c => c.name === 'Serra Angel'), 1); renderAll(true);
  await vanta(300);
  const elv = mig.cards.find(c => c.name === 'Llanowar Elves');
  const el = elv && gridEl.querySelector(`.card[data-cid="${elv.cid}"]`);
  if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true }));
  /* Provocerat fel och misslyckade anrop. */
  setTimeout(() => { throw new Error('provfel: kastat med flit'); }, 0);
  Promise.reject(new Error('provlöfte: avvisat med flit'));
  await fetch('/api/finns-inte').catch(() => {});
  await fetch('https://prov.supabase.co/rest/v1/finns_inte').catch(() => {});
  await vanta(1300);   // mattans diff går varje sekund
  const lada = Lada.utdrag();
  ok('lådan: handlingar (klick på kortet, tangent)', lada.some(e => e.slag === 'handling' && e.typ === 'klick' && e.kort === (elv && elv.cid)) && lada.some(e => e.slag === 'handling' && e.typ === 'tangent' && e.tangent === 't'), lada.filter(e => e.slag === 'handling').length + ' handlingar');
  const matta = lada.filter(e => e.slag === 'matta');
  ok('lådan: mattans ändringar (spelar ×3, tappar, Forest till graveyard, Serra Angel borta)', matta.filter(e => e.typ === 'spelar').length === 3 && matta.some(e => e.typ === 'tappar' && e.kort === 'Llanowar Elves') && matta.some(e => e.typ === 'flyttar' && e.kort === 'Forest' && e.till === 'graveyard') && matta.some(e => e.typ === 'tar_bort' && e.kort === 'Serra Angel'), matta.map(e => e.typ + ':' + e.kort + (e.till ? '→' + e.till : '')).join(', '));
  ok('lådan: kastat fel och avvisat löfte med tid', lada.some(e => e.slag === 'fel' && e.kalla === 'onerror' && /provfel/.test(e.med) && e.t > 0) && lada.some(e => e.slag === 'fel' && e.kalla === 'unhandledrejection' && /provlöfte/.test(e.med)), lada.filter(e => e.slag === 'fel').map(e => e.kalla).join(', '));
  ok('lådan: misslyckade anrop mot /api (404) och Supabase (inget svar) med tid', lada.some(e => e.slag === 'anrop' && /finns-inte/.test(e.vag) && e.status === 404 && e.ms >= 0) && lada.some(e => e.slag === 'anrop' && /finns_inte/.test(e.vag) && e.status === 0), lada.filter(e => e.slag === 'anrop').map(e => e.vag + '→' + e.status).join(', '));
  ok('lådan: frågesträngen skrivs aldrig', !lada.some(e => e.vag && e.vag.includes('?')));
  /* Felrapporterna (?debug): kodfelet och anropen blev rader med kalla 'fel', en gång var. */
  await vanta(100);
  const felRader = A.rader.filter(r => r.kalla === 'fel');
  ok('felrapporter: kodfel och misslyckat anrop blir rader (kalla fel), utan ord och bilder', felRader.some(r => /provfel/.test(r.text)) && felRader.some(r => /finns_inte/.test(r.text)) && felRader.every(r => !r.tagg), felRader.map(r => r.text.slice(0, 40)).join(' | '));
  const forraFel = felRader.length;
  setTimeout(() => { throw new Error('provfel: kastat med flit'); }, 0);
  await vanta(100);
  ok('felrapporter: samma meddelande högst en gång per 10 min', A.rader.filter(r => r.kalla === 'fel').length === forraFel, A.rader.filter(r => r.kalla === 'fel').length + ' rader');

  /* ── Rutan öppnas med tangenten: paketet fryses, telefonen ombeds frysa sin låda ── */
  A.kanal.length = 0;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', code: 'KeyR', ctrlKey: true, altKey: true, bubbles: true }));
  await vanta(50);
  const ruta = document.querySelector('.rapruta');
  ok('Ctrl+Alt+R öppnar rutan (?debug), textfältet har fokus', ruta && !ruta.hidden && document.activeElement && document.activeElement.id === 'rapText');
  const begaran = A.kanal.find(m => m.typ === 'rapport_lada');
  ok('telefonen ombeds frysa sin låda (rapport_lada)', !!begaran);
  ok('rutan: rubrik, fält, sju snabbval, texten om vad som skickas, Cancel + Send report — ingen kryssruta', /Report a problem/.test(ruta.textContent) && ruta.querySelectorAll('.chip').length === 7 && /what your camera saw/.test(ruta.textContent) && !ruta.querySelector('input[type=checkbox]') && /Send report/.test(ruta.textContent));
  /* Telefonen svarar: dess klocka går 5 s före. Lådan byggs på telefonens sida (kameraEnhet) och svaret matas till datorn. */
  const telT = Date.now() + 5000;
  const telLada = JSON.stringify({ frys: telT, miljo: { sida: 'telefon', ua: 'prov-telefon' }, lada: [{ t: telT - 2000, slag: 'spar', id: 2, borta: true }, { t: telT - 1500, slag: 'lage', lage: 'spel', bildlage: '4k15' }] });
  Rapport.datorTagEmot({ typ: 'rapport_lada', id: begaran.id, t0: begaran.t0, tTel: telT, del: 0, delar: 2, json: telLada.slice(0, 40), av: 'u-prov', fran: 'kamera' });
  Rapport.datorTagEmot({ typ: 'rapport_lada', id: begaran.id, t0: begaran.t0, tTel: telT, del: 1, delar: 2, json: telLada.slice(40), av: 'u-prov', fran: 'kamera' });
  await vanta(20);
  const p = Rapport.paket;
  ok('telefonens låda kom i två delar, omräknad till datorns klocka (offset ≈ 5000 ms)', p.telefon && p.telefon.svarade && Math.abs(p.telefon.offset - 5000) < 600 && Math.abs(p.telefon.lada[0].t - (Date.now() - 2000)) < 600, p.telefon ? `offset ${p.telefon.offset}, rtt ${p.telefon.rtt}` : 'inget svar');
  ok('paketet fryst vid öppningen: vyn (zoom, synlig del, senast rörda kortet, läge, kamAnsluten, skärm)', p.vy && p.vy.zoom > 0 && p.vy.synlig && p.vy.senastRordKort === (elv && elv.cid) && p.vy.lage === 'bord' && p.vy.kamAnsluten === true && p.vy.skarm.w > 0, JSON.stringify(p.vy));
  ok('paketet: bordsloggen i fallets form och mattan vid trycket', p.bordLogg && p.bordLogg.rader.length === 2 && p.bordLogg.rader[0].spar.length === 3 && p.matta && p.matta.mig.length === 2 && p.matta.mig.some(k => k.n === 'Forest' && k.z === 'grav'), p.bordLogg ? p.bordLogg.rader.length + ' rader' : 'ingen bordslogg');
  ok('paketet: miljön (sida, webbläsare, skärm, spelkod)', p.miljo.sida === 'dator' && p.miljo.ua && p.miljo.spel === 'RAPP01' && p.miljo.skarm.w > 0);

  /* Det som händer efter trycket hör inte till paketet. */
  Lada.skriv('handling', { typ: 'efter trycket' });
  ok('paketet ändras inte av det som händer efter trycket', !p.lada.some(e => e.typ === 'efter trycket'));

  /* Skriv, välj, skicka — först Couldn't send (nätet), sedan Try again. */
  const ta = ruta.querySelector('#rapText');
  ta.value = 'A minute ago a Forest disappeared from my mat'; ta.dispatchEvent(new Event('input', { bubbles: true }));
  ruta.querySelector('[data-tagg="forsvann"]').click();
  ok('snabbvalet: ett åt gången, tryck igen tar bort', ruta.querySelectorAll('.chip.on').length === 1 && (ruta.querySelector('[data-tagg="tap"]').click(), ruta.querySelectorAll('.chip.on').length === 1 && ruta.querySelector('[data-tagg="tap"]').classList.contains('on')) && (ruta.querySelector('[data-tagg="tap"]').click(), ruta.querySelectorAll('.chip.on').length === 0));
  ruta.querySelector('[data-tagg="forsvann"]').click();
  ok('räknaren syns först från 400 tecken, högst 500', ruta.querySelector('.rakna').hidden && +ta.getAttribute('maxlength') === 500);
  A.felFil = 1; A.seg = 300;
  ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true }));
  await vanta(30);
  ok('Sending: fälten låsta, stapeln, Cancel, knappen Sending med snurra', Rapport.lage === 'skickar' && ruta.querySelector('#rapText').disabled && ruta.querySelector('.bar2') && /Sending\. This takes a few seconds\./.test(ruta.textContent) && ruta.querySelector('.spin'));
  ruta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok('Esc stänger inte medan den skickar', !ruta.hidden);
  for (let i = 0; i < 50 && Rapport.lage === 'skickar'; i++) await vanta(50);
  ok("Couldn't send: röd rad, orden kvar, Try again", Rapport.lage === 'fel' && /Couldn't send the report\./.test(ruta.textContent) && ruta.querySelector('#rapText').value === 'A minute ago a Forest disappeared from my mat' && /Try again/.test(ruta.textContent) && ruta.querySelector('.chip.on'));
  const raderFore = A.rader.filter(r => r.kalla === 'rapport').length;
  A.seg = 0;
  ruta.querySelector('[data-rap="skicka"]').click();
  for (let i = 0; i < 50 && Rapport.lage !== 'skickad'; i++) await vanta(50);
  const kod = Rapport.paket && Rapport.paket.kod;
  ok('Try again skickar samma paket: samma kod, ingen ny rad', Rapport.lage === 'skickad' && A.rader.filter(r => r.kalla === 'rapport').length === raderFore, kod);
  ok('Sent: Report sent, koden, Copy, Report something else, Done — ingen grön notis', /Report sent/.test(ruta.textContent) && ruta.querySelector('#rapKod').textContent === kod && /Copy/.test(ruta.textContent) && /Report something else/.test(ruta.textContent) && /Done/.test(ruta.textContent) && !/ok/.test(document.querySelector('#toast').className));
  const raden = A.rader.find(r => r.kalla === 'rapport');
  ok('raden: text, tagg, vy, kalla rapport — inga bilder i raden', raden && raden.text === 'A minute ago a Forest disappeared from my mat' && raden.tagg === 'forsvann' && raden.vy && raden.vy.synlig && raden.game_id === 'rapportprov' && !JSON.stringify(raden).includes('data:image'));
  const begarBilder = A.kanal.find(m => m.typ === 'rapport_bilder');
  ok('steg 3: telefonen ombeds ladda upp sina bilder (rapport_bilder med kod och mapp)', begarBilder && begarBilder.kod === kod && begarBilder.sokvag === 'u-prov/rapporter/' + kod);
  Rapport.datorTagEmot({ typ: 'rapport_bilder_klar', kod, antal: 3, fel: 0 });
  await vanta(20);
  ok("raden får bilder = 'klar' när telefonen svarat", A.uppd.some(([k, f]) => k === kod && f.bilder === 'klar'), JSON.stringify(A.uppd));
  ruta.querySelector('[data-rap="kopiera"]').click();
  await vanta(20);
  ok('Copy visar Copied', /Copied/.test(ruta.textContent));
  /* Paketet som laddades upp: packas upp här och skickas till node. */
  const nyckel = Object.keys(A.filer).find(k => /rapport\.json/.test(k));
  const blob = A.filer[nyckel];
  const text = /\.gz$/.test(nyckel) ? await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text() : await blob.text();

  /* Report something else: ny tom ruta, nytt paket. */
  ruta.querySelector('[data-rap="ny"]').click();
  await vanta(30);
  ok('Report something else: tom ruta, nytt paket', Rapport.lage === 'skriv' && ruta.querySelector('#rapText').value === '' && Rapport.paket && !Rapport.paket.kod);
  ruta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok('Esc stänger rutan', ruta.hidden);

  /* Phone not connected. */
  kamAnsluten = false;
  oppnaRapportRuta();
  await vanta(30);
  ok("Phone not connected: gul rad, texten utan 'what your camera saw', Send fungerar", /Your phone isn't connected\./.test(ruta.textContent) && !/what your camera saw/.test(ruta.textContent) && /Send report/.test(ruta.textContent));
  ruta.querySelector('[data-rap="skicka"]').click();
  for (let i = 0; i < 50 && Rapport.lage !== 'skickad'; i++) await vanta(50);
  const utan = A.rader.filter(r => r.kalla === 'rapport').pop();
  ok("utan telefon: skickad, raden får bilder = 'saknas', ingen begäran till telefonen", Rapport.lage === 'skickad' && utan.bilder === 'saknas', utan && utan.bilder);
  ruta.querySelector('[data-rap="stang"].btn').click();

  /* Taket: med 20 skickade visas Today's limit när rutan öppnas; den 21:a avvisas. */
  A.idag = 19;
  oppnaRapportRuta();
  await vanta(30);
  ruta.querySelector('[data-rap="skicka"]').click();
  for (let i = 0; i < 50 && Rapport.lage !== 'skickad'; i++) await vanta(50);
  ok('den 20:e går', Rapport.lage === 'skickad' && A.idag === 20);
  ruta.querySelector('[data-rap="stang"].btn').click();
  oppnaRapportRuta();
  await vanta(50);
  ok("Today's limit när rutan öppnas: bara Close", Rapport.lage === 'tak' && /You have sent 20 reports today\./.test(ruta.textContent) && !ruta.querySelector('#rapText') && /Close/.test(ruta.textContent));
  ruta.querySelector('[data-rap="stang"]').click();
  /* Den 21:a som ändå skickas (taket nåtts från en annan flik under tiden): servern vägrar, rutan visar taket. */
  Moln.rapporterIdag = async () => 0;
  oppnaRapportRuta();
  await vanta(30);
  ruta.querySelector('[data-rap="skicka"]').click();
  for (let i = 0; i < 50 && Rapport.lage === 'skickar'; i++) await vanta(50);
  ok("den 21:a avvisas av taket med Today's limit", Rapport.lage === 'tak' && A.idag === 20 && /You have sent 20 reports today\./.test(ruta.textContent), Rapport.lage + ', ' + A.idag);
  ruta.querySelector('[data-rap="stang"]').click();

  /* Telefonens sida: frys och svara, ladda upp på begäran (kameraEnhet). */
  A.kanal.length = 0;
  kameraEnhet = true; kamLage = { id: 'rapportprov', kod: 'RAPP01' };
  Rapport.stillbilder = () => [{ namn: 'a.jpg', t: 1, blob: new Blob(['x'.repeat(100)], { type: 'image/jpeg' }) }, { namn: 'b.jpg', t: 2, blob: new Blob(['y'.repeat(100)], { type: 'image/jpeg' }) }];
  Rapport.telefonKommando({ typ: 'rapport_lada', id: 'tel1', t0: Date.now() });
  await vanta(60);
  const svaret = A.kanal.filter(m => m.typ === 'rapport_lada');
  ok('telefonen svarar med sin låda (tTel, delar)', svaret.length >= 1 && svaret[0].tTel > 0 && svaret[0].delar === svaret.length && JSON.parse(svaret.map(m => m.json).join('')).lada.length > 0);
  Rapport.telefonKommando({ typ: 'rapport_bilder', kod: 'R-0099', sokvag: 'u-prov/rapporter/R-0099', id: 'tel1' });
  for (let i = 0; i < 40 && !A.kanal.some(m => m.typ === 'rapport_bilder_klar'); i++) await vanta(25);
  const klar = A.kanal.find(m => m.typ === 'rapport_bilder_klar');
  ok('telefonen laddar upp sina bilder själv och svarar rapport_bilder_klar', klar && klar.antal === 2 && A.filer['u-prov/rapporter/R-0099/bilder/a.jpg'], JSON.stringify(klar));
  Rapport.telefonKommando({ typ: 'rapport_bilder', kod: 'R-0100', sokvag: 'annan-uid/rapporter/R-0100', id: 'x' });
  await vanta(20);
  ok('telefonen vägrar en mapp som inte är kontots', A.kanal.some(m => m.typ === 'rapport_bilder_klar' && m.kod === 'R-0100' && m.fel === 1) && !Object.keys(A.filer).some(k => k.startsWith('annan-uid')));
  kameraEnhet = false; kamLage = null;

  return { rad, paket: text };
};

(async () => {
  const srv = await server();
  let c;
  try { c = await chrome(); } catch (e) { console.error('rapport-prov: ' + e.message); srv.close(); process.exit(2); }
  let rader = null, paket = null;
  try {
    await c.cdp('Runtime.enable'); await c.cdp('Page.enable'); await c.cdp('Network.enable');
    await c.cdp('Network.setBlockedURLs', { urls: ['*scryfall*', '*supabase*', '*jsdelivr*', '*unpkg*', '*googleapis*', '*gstatic*', '*cdnjs*'] });
    await c.cdp('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
    await c.cdp('Page.navigate', { url: `http://127.0.0.1:${srv.address().port}/?debug` });
    const t0 = Date.now();
    for (;;) {
      const r = await c.cdp('Runtime.evaluate', { expression: "document.readyState === 'complete' && typeof Rapport === 'object' && typeof avstamBord === 'function'", returnByValue: true }).catch(() => null);
      if (r && r.result && r.result.value) break;
      if (Date.now() - t0 > 30000) throw new Error('appen laddade inte');
      await vanta(100);
    }
    await vanta(300);
    const r = await c.cdp('Runtime.evaluate', { expression: '(' + PROV.toString() + ')()', awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text);
    rader = r.result.value.rad; paket = r.result.value.paket;
  } catch (e) { console.error('rapport-prov: ' + e.message); await c.stang(); srv.close(); process.exit(2); }
  await c.stang(); srv.close();

  /* hamta.cjs --fil på paketet: tidslinjen och LÄS-MIG.md. */
  const ut = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-rapport-ut-'));
  const pf = path.join(ut, 'paket.json'); fs.writeFileSync(pf, paket);
  if (arg('--paket')) fs.writeFileSync(arg('--paket'), paket);
  const { bygg } = require('./hamta.cjs');
  const p = JSON.parse(paket);
  const linje = bygg(p, null, [], path.join(ut, p.kod), null);
  const las = fs.readFileSync(path.join(ut, p.kod, 'LÄS-MIG.md'), 'utf8');
  const kallor = new Set(linje.map(e => e.sida)), sorterad = linje.every((e, i) => !i || linje[i - 1].t <= e.t);
  rader.push(['hamta: en tidslinje med dator, telefon och bord, sorterad på datorns klocka', kallor.has('dator') && kallor.has('telefon') && kallor.has('bord') && sorterad, [...kallor].join(', ') + ` · ${linje.length} händelser`]);
  rader.push(['hamta: tidslinjen bär handlingar, mattan, fel och anrop', ['handling', 'matta', 'fel', 'anrop'].every(s => linje.some(e => e.slag === s))]);
  rader.push(['hamta: LÄS-MIG.md med orden, snabbvalet, loggen inom vyn och det som passar (Forest borta)', /## 1\. Det spelaren sa/.test(las) && /A card disappeared/.test(las) && /## 2\./.test(las) && /flyttat: Forest .*→ graveyard/.test(las) && /borta: Serra Angel/.test(las) && /Kort som nämns i orden:\*\* Forest/.test(las) && /provfel/.test(las)]);
  rader.push(['dold information: paketet bär ingen lek eller hand (inga fält lek/bibliotek/hand med kort)', !/"(lek|bibliotek|library)":\[\{/.test(paket)]);
  fs.rmSync(ut, { recursive: true, force: true });

  let fel = 0;
  for (const [namn, okk, detalj] of rader) { if (!okk) fel++; console.log(`${okk ? 'OK ' : 'FEL'}  ${namn}${detalj ? '  (' + String(detalj).slice(0, 160) + ')' : ''}`); }
  console.log(`\nrapport-prov: ${rader.length - fel} OK, ${fel} FEL`);
  process.exit(fel ? 1 : 0);
})();

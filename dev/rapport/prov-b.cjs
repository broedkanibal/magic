/* Problemrapporten B (MES-366): provet i huvudlös Chrome, utan nät och utan Claude.

   Kör:  node dev/rapport/prov-b.cjs [--fil index.html] [--rattelse ut.json] [--kontext ut.jpg]

   1. Ringbufferten: 30 minuter stillbilder i accelererad takt (ett steg var
      150 ms, en händelse var femte sekund) på en slät bild — taket på 300
      bilder håller — och 10 minuter på brus — taket i bytes håller.
      Händelsebilderna tas mellan tidsbilderna. Beskärningarna: 50 spår ger
      högst 40.
   2. Rapporten tar bilderna med (A:s väg, Rapport.stillbilder): index.json
      och bilderna under <kod>/bilder/, raden "Sending pictures, N of M" på
      telefonen medan de går upp — med inställningen AV.
   3. De tysta rättelserna på datorn, genom appens egna vägar (applyPick,
      Change card… i kortets meny (MES-387), removeAt, namngePend): av → ingen rad och ingen fil; på → en rad med
      kalla 'rattelse', beskarning.jpg (telefonens, eller datorns egen kopia
      när telefonen inte har den) och rattelse.json i kontraktets form; av
      igen → slutar direkt.
   3b. Var kortet låg (uppföljning av MES-366/368): två kort omlott, det undre
      rättas. Appens maskaTackt (utklippt ur filen) målar det övres låda grå;
      rattelse.json får ruta, maskade (spåret som ligger över) och kontext,
      kontext.jpg landar i mappen, och det grå i beskarning.jpg ligger där
      ruta + maskade säger. Utan telefonen: bordets ruta, maskade null.
      --kontext ut.jpg sparar provets kontext.jpg för att titta på.
   4. Växeln i Developer-lådan läser och skriver inställningen.
   5. Granskning 1 (fynd 1–9): kodningen utanför steget och läsningen
      (toBlob anropas aldrig synkront; stegMs och kodtiden mäts), taket för
      rättelser tyst för resten av sessionen, sena rapport_bilder_klar
      rättar raden och fyra uppladdningar samtidigt, ringen töms vid nytt
      konto eller parti, en rättelse som var av kan sparas när den slagits
      på, telefonen läser inställningen själv och datorn läser om den efter
      väntan, telefonens domskäl när spåret är borta, en händelsebild som
      inte fick plats tas i nästa steg och beskärningarna tappas inte.
   6. En sida utan ?debug (rapporten finns inte för spelaren): ingen ring,
      inga rättelser, ingen getUser; med RAPPORT_FOR_ALLA eller golden-
      flaggan STILLBILDER_PA på igen.

   Supabase och kanalen är en attrapp i sidan (som dev/rapport/prov.cjs).
   --rattelse ut.json skriver den sparade rättelsen (raden + filerna, base64)
   för provet mot riktiga Supabase (prov-b-supabase.cjs).

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
      /* Samma app med C:s flagga på (go-live): RAPPORT_FOR_ALLA är en const och går inte att slå på i sidan. */
      if (u === '/flagga.html') { ut.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); return ut.end(fs.readFileSync(FIL, 'utf8').replace('const RAPPORT_FOR_ALLA = false;', 'const RAPPORT_FOR_ALLA = true;')); }
      ut.writeHead(404); ut.end();
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}
async function chrome() {
  if (!fs.existsSync(CHROME)) { console.error('prov-b: hittar inte Chrome (sätt CHROME=…)'); process.exit(2); }
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-rapport-b-'));
  const p = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profil, '--no-first-run', '--no-default-browser-check', '--enable-precise-memory-info', '--window-size=1400,1000', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let ws = null, err = '';
  p.stderr.on('data', d => { err += d; const m = err.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) ws = m[1]; });
  const t0 = Date.now();
  while (!ws) { if (Date.now() - t0 > 15000) { p.kill(); throw new Error('Chrome svarade inte'); } await vanta(50); }
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

/* En funktion ur källan, från dess första rad till den klammer som stänger den (strängar och kommentarer i
   maskaTackt innehåller inga klamrar). */
function utklipp(src, borjan) {
  const i = src.indexOf(borjan); if (i < 0) throw new Error('hittar inte ' + borjan);
  let d = 0;
  for (let j = src.indexOf('{', i); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) return src.slice(i, j + 1); }
  throw new Error('ingen slutklammer för ' + borjan);
}

/* Fynd 4: sidan utan ?debug — rapporten finns inte för spelaren. */
const PROV_AV = async () => {
  const rad = [], ok = (namn, villkor, detalj) => rad.push([namn, !!villkor, detalj || '']);
  const vanta = ms => new Promise(r => setTimeout(r, ms));
  let getUser = 0;
  Moln.inloggad = () => true; Moln.minId = () => 'u-prov';
  Moln.bildInstallning = async () => { getUser++; return true; };
  Moln.rapportRad = async () => ({ kod: 'R-0999', sokvag: 'u-prov/rapporter/R-0999' });
  Moln.rapportFil = async () => {}; Moln.rapportUppdatera = async () => true; Moln.sandKam = () => true;
  const c = document.createElement('canvas'); c.width = 360; c.height = 203; c.getContext('2d').fillRect(0, 0, 50, 50);
  const spar = [{ id: 1, namn: 'A', tillstand: 'klar', vilaX: 10, vilaY: 10, box: { x: 10, y: 10, w: 20, h: 30 } }];
  Stillbilder.glom();
  Stillbilder.steg(c, 1e9, spar, 360, 203); Stillbilder.beskarning({ id: 1 }, c, { namn: 'A', saker: true });
  await vanta(50);
  visaVy('app');
  const mig = player(); mig.lage = 'bord';
  spelLage = { id: 'av-spel', kod: 'AVSPEL', vard: mig.id, mig: mig.id };
  const r = Rattelse.fran('namnbyte', { cid: 'x', spar: 1, name: 'A' }, 'B');
  await vanta(30);
  ok('fynd 4: utan ?debug och utan RAPPORT_FOR_ALLA: ingen ring, ingen beskärning, ingen rättelse, ingen getUser', DEBUG === false && !Stillbilder.pa && Stillbilder.ring.length === 0 && Stillbilder.besk.size === 0 && Stillbilder.stat().stegN === 0 && r === null && getUser === 0,
     `DEBUG ${DEBUG}, ring ${Stillbilder.ring.length}, getUser ${getUser}`);
  window.STILLBILDER_PA = true;   // golden (kor.html) som förval
  Stillbilder.steg(c, 2e9, spar, 360, 203); await vanta(50);
  ok('fynd 4: golden-flaggan STILLBILDER_PA slår på ringen (inte rättelserna)', Stillbilder.ring.length === 1 && Rattelse.fran('namnbyte', { cid: 'y', spar: 1, name: 'A' }, 'C') === null && getUser === 0);
  window.STILLBILDER_AV = true; Stillbilder.steg(c, 3e9, spar, 360, 203); await vanta(50);
  ok('fynd 4: --utan-stillbilder (STILLBILDER_AV) vinner över STILLBILDER_PA', Stillbilder.ring.length === 1);
  delete window.STILLBILDER_AV; delete window.STILLBILDER_PA; Stillbilder.glom();
  return { rad };
};

/* Fynd 4: samma app utan ?debug men med RAPPORT_FOR_ALLA på (go-live-grenen): ringen och rättelserna går. */
const PROV_FLAGGA = async () => {
  const rad = [], ok = (namn, villkor, detalj) => rad.push([namn, !!villkor, detalj || '']);
  const vanta = ms => new Promise(r => setTimeout(r, ms));
  let getUser = 0;
  Moln.inloggad = () => true; Moln.minId = () => 'u-prov';
  Moln.bildInstallning = async () => { getUser++; return true; };
  Moln.rapportRad = async () => ({ kod: 'R-0999', sokvag: 'u-prov/rapporter/R-0999' });
  Moln.rapportFil = async () => {}; Moln.rapportUppdatera = async () => true; Moln.sandKam = () => true;
  const c = document.createElement('canvas'); c.width = 360; c.height = 203; c.getContext('2d').fillRect(0, 0, 50, 50);
  const spar = [{ id: 1, namn: 'A', tillstand: 'klar', vilaX: 10, vilaY: 10, box: { x: 10, y: 10, w: 20, h: 30 } }];
  visaVy('app');
  const mig = player(); mig.lage = 'bord';
  spelLage = { id: 'flagga-spel', kod: 'FLAGGA', vard: mig.id, mig: mig.id };
  Stillbilder.glom();
  Stillbilder.steg(c, 4e9, spar, 360, 203); await vanta(50);
  const r2 = Rattelse.fran('namnbyte', { cid: 'z', spar: 1, name: 'A' }, 'D');
  await vanta(30);
  ok('fynd 4: med RAPPORT_FOR_ALLA på (utan ?debug): ringen och rättelserna', RAPPORT_FOR_ALLA === true && DEBUG === false && Stillbilder.ring.length === 1 && r2 !== null && getUser >= 1, `flagga ${RAPPORT_FOR_ALLA}, DEBUG ${DEBUG}, ring ${Stillbilder.ring.length}, getUser ${getUser}`);
  return { rad };
};

const PROV = async () => {
  const rad = [], ok = (namn, villkor, detalj) => rad.push([namn, !!villkor, detalj || '']);
  const vanta = ms => new Promise(r => setTimeout(r, ms));
  const MB = b => (b / 1048576).toFixed(2) + ' MB';
  /* ── Attrappen ── */
  const A = { rader: [], filer: {}, kanal: [], uppd: [], bildPa: false, satt: [], seg: 0, telefonSvarar: true };
  let nr = 0;
  Moln.inloggad = () => true;
  Moln.minId = () => 'u-prov';
  Moln.rapportRad = async r => { const kod = 'R-' + String(++nr).padStart(4, '0'); A.rader.push(Object.assign({ kod }, JSON.parse(JSON.stringify(r)))); return { kod, sokvag: 'u-prov/rapporter/' + kod }; };
  A.samtidigt = 0; A.maxSamtidigt = 0; A.getUser = 0; A.raderade = [];
  Moln.rapportFil = async (mapp, namn, blob) => { A.samtidigt++; A.maxSamtidigt = Math.max(A.maxSamtidigt, A.samtidigt); try { if (A.seg) await vanta(A.seg); A.filer[mapp + '/' + namn] = blob; } finally { A.samtidigt--; } };
  Moln.rapportRadera = async kod => { A.raderade.push(kod); return true; };
  Moln.rapportUppdatera = async (kod, f) => { A.uppd.push([kod, f]); return true; };
  Moln.rapporterIdag = async () => 0;
  Moln.bildInstallning = async () => { A.getUser++; return typeof A.bildPa === 'function' ? A.bildPa() : A.bildPa; };
  Moln.sattBildInstallning = async v => { A.satt.push(v); A.bildPa = !!v; return !!v; };
  Moln.bildInstallningSedan = () => '2026-10-13T01:00:00Z';
  /* Kanalen: datorn och telefonen är samma sida; kameraEnhet växlas runt telefonens del. */
  Moln.sandKam = (typ, data) => {
    const m = Object.assign({ typ }, data || {});
    A.kanal.push(m);
    if (typ === 'rapport_rattelse_bild' && A.telefonSvarar) setTimeout(() => Rapport.telefonKommando(m), 5);
    if (typ === 'rapport_rattelse_klar') setTimeout(() => Rapport.datorTagEmot(m), 5);
    return true;
  };

  /* ── 1. Ringbufferten ── (telefonen i partiet PROVB1 hela vägen till rapporten: ringens ägare) */
  kamLage = { id: 'provB', kod: 'PROVB1' };
  Stillbilder.glom();
  const c = document.createElement('canvas'); c.width = 360; c.height = 203;
  const x = c.getContext('2d', { willReadFrequently: true });
  const slat = k => { const g = x.createLinearGradient(0, 0, 360, 203); g.addColorStop(0, '#2a4d3a'); g.addColorStop(1, '#1b2f45'); x.fillStyle = g; x.fillRect(0, 0, 360, 203); x.fillStyle = '#e8dcc0'; for (let i = 0; i < 6; i++) x.fillRect(20 + i * 55 + (k % 7), 40, 44, 62); };
  const brus = () => { const d = x.createImageData(360, 203); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = v; d.data[i + 1] = Math.random() * 255; d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); };
  const sparNu = k => { const n = Math.floor(k / 33); const l = []; for (let i = 0; i < Math.min(12, n % 15); i++) l.push({ id: n - i, namn: 'Kort ' + (n - i), saker: true, tillstand: 'klar', vilaX: 20 + i * 25, vilaY: 50, box: { x: 20 + i * 25, y: 40, w: 22, h: 31 } }); return l; };
  const kor = async (fran, steg, bild) => {
    let maxHeap = 0, maxBytes = 0, maxAntal = 0;
    for (let k = fran; k < fran + steg; k++) {
      if (k % 13 === 0) bild(k);
      Stillbilder.steg(c, k * 150, sparNu(k), 360, 203);
      for (let i = 0; i < 200 && Stillbilder.ko; i++) await vanta(1);
      const s = Stillbilder.stat(); maxBytes = Math.max(maxBytes, s.bytes + s.beskBytes); maxAntal = Math.max(maxAntal, s.antal);
      if (k % 400 === 0 && performance.memory) maxHeap = Math.max(maxHeap, performance.memory.usedJSHeapSize);
    }
    return { maxHeap, maxBytes, maxAntal };
  };
  const t30 = performance.now();
  const r30 = await kor(0, 12000, slat);   // 30 min à 150 ms
  const s30 = Stillbilder.stat();
  const tidsbilder = Stillbilder.ring.filter(b => b.orsak === 'tid').length, hand = Stillbilder.ring.filter(b => b.orsak === 'handelse').length;
  ok('30 min slät bild: högst 300 bilder hela vägen, äldst släpps först', r30.maxAntal <= 300 && s30.antal === 300 && s30.slappta === s30.tagna - 300 && Stillbilder.ring.every((b, i, l) => !i || l[i - 1].t <= b.t),
     `tagna ${s30.tagna}, kvar ${s30.antal}, släppta ${s30.slappta}, hoppade ${s30.hoppade}, max ${MB(r30.maxBytes)}, ${(performance.now() - t30) / 1000 | 0} s`);
  ok('30 min: tidsbilder och händelsebilder (nytt kort, namn) i ringen', tidsbilder > 0 && hand > 0, `tid ${tidsbilder}, händelse ${hand}`);
  ok('30 min: varje bild bär spårens rutor i andelar av bilden', Stillbilder.ring.every(b => Array.isArray(b.spar)) && Stillbilder.ring.some(b => b.spar.length && b.spar.every(t => t.x >= 0 && t.x <= 1 && t.w > 0 && t.w <= 1)));
  const bytesSlat = s30.bytes, styckSlat = s30.bytes / s30.antal;
  const r10 = await kor(12000, 4000, brus);   // 10 min brus: värsta fallet för JPEG
  const s10 = Stillbilder.stat();
  ok('10 min brus: bytes under taket (7,5 MB) hela vägen', r10.maxBytes <= s10.tak.bytes + s10.tak.beskBytes && s10.bytes <= s10.tak.bytes, `max ${MB(r10.maxBytes)}, kvar ${s10.antal} bilder ${MB(s10.bytes)}, ${Math.round(s10.bytes / Math.max(1, s10.antal) / 1024)} kB/bild`);
  /* Beskärningarna: 50 spår, var sin namnsättning. */
  const bc = document.createElement('canvas'); bc.width = 520; bc.height = 720; const bx = bc.getContext('2d'); bx.fillStyle = '#c9b38a'; bx.fillRect(0, 0, 520, 720); bx.fillStyle = '#222'; bx.font = '40px serif'; bx.fillText('Llanowar Elves', 30, 70);
  for (let i = 1; i <= 50; i++) { Stillbilder.beskarning({ id: 1000 + i }, bc, { namn: 'Kort ' + i, saker: true, varfor: 'remsa' }); for (let j = 0; j < 200 && Stillbilder.ko; j++) await vanta(1); }
  const sb = Stillbilder.stat();
  ok('beskärningarna: 50 spår ger högst 40 och taket (4 MB), den senaste kvar', sb.beskAntal <= 40 && sb.beskBytes <= sb.tak.beskBytes && Stillbilder.besk.has(1050) && !Stillbilder.besk.has(1001), `${sb.beskAntal} st, ${MB(sb.beskBytes)}`);
  ok('minnet totalt under ~10 MB (bilder + beskärningar)', sb.bytes + sb.beskBytes <= 10 * 1048576, MB(sb.bytes + sb.beskBytes) + (performance.memory ? ', JS-heap max ' + MB(Math.max(r30.maxHeap, r10.maxHeap)) : ''));
  ok('avstängd (STILLBILDER_AV): ingen bild tas', (() => { window.STILLBILDER_AV = true; const f = Stillbilder.stat().tagna; Stillbilder.steg(c, 1e9, [], 360, 203); window.STILLBILDER_AV = false; return Stillbilder.stat().tagna === f && !Stillbilder.ko; })());
  const minne = { slat: { antal: s30.antal, bytes: bytesSlat, kBperBild: +(styckSlat / 1024).toFixed(1), tagna: s30.tagna }, brus: { antal: s10.antal, bytes: s10.bytes }, besk: { antal: sb.beskAntal, bytes: sb.beskBytes },
                  stegMs: sb.stegMs, stegMax: sb.stegMax, stegN: sb.stegN, kodMs: sb.kodMs, kodSyncMs: sb.kodSyncMs, kodSyncMax: sb.kodSyncMax };

  /* ── 2. Rapporten tar bilderna med, inställningen AV ── */
  A.bildPa = false;
  ok('Rapport.stillbilder är B:s', Rapport.stillbilder === Stillbilder.stillbilder);
  kameraEnhet = true; kamLage = { id: 'provB', kod: 'PROVB1' };
  Rapport.telefonKommando({ typ: 'rapport_lada', id: 'telB', t0: Date.now() });
  await vanta(800);
  A.seg = 4; const rader0 = A.rader.length;
  Rapport.telefonKommando({ typ: 'rapport_bilder', kod: 'R-0900', sokvag: 'u-prov/rapporter/R-0900', id: 'telB' });
  let sagRad = null;
  for (let i = 0; i < 400 && !A.kanal.some(m => m.typ === 'rapport_bilder_klar' && m.kod === 'R-0900'); i++) { const e = document.getElementById('telBilderRad'); if (e && !e.hidden && /Sending pictures, \d+ of \d+/.test(e.textContent) && !/Sending pictures, 0 of/.test(e.textContent)) sagRad = sagRad || e.textContent; await vanta(25); }
  A.seg = 0;
  const klar = A.kanal.find(m => m.typ === 'rapport_bilder_klar' && m.kod === 'R-0900');
  const upp = Object.keys(A.filer).filter(k => k.startsWith('u-prov/rapporter/R-0900/bilder/'));
  let index = null; try { index = JSON.parse(await A.filer['u-prov/rapporter/R-0900/bilder/index.json'].text()); } catch (e) {}
  ok('rapporten: telefonen laddar upp stillbilder, beskärningar och index.json till <kod>/bilder/ (inställningen av)', klar && klar.antal === s10.antal + sb.beskAntal + 1 && upp.length === klar.antal && upp.some(k => /\/s-\d+-\d+\.jpg$/.test(k)) && upp.some(k => /beskarning-spar\d+/.test(k)) && index && index.bilder.length === s10.antal && A.rader.length === rader0,
     `${upp.length} filer, svar ${JSON.stringify(klar)}`);
  ok('rapporten: index.json bär tid, orsak och spårens rutor per bild', index && index.bilder.every(b => b.fil && b.t && b.orsak && Array.isArray(b.spar)) && index.beskarningar.length > 0);
  ok('telefonen visar "Sending pictures, N of M" medan de går upp, och tar bort raden efter', !!sagRad && document.getElementById('telBilderRad').hidden, sagRad || '(ingen rad)');
  ok('fynd 3: telefonen laddar upp fyra bilder samtidigt (inte en i taget)', A.maxSamtidigt >= 3 && A.maxSamtidigt <= 4, `högst ${A.maxSamtidigt} samtidigt`);
  kameraEnhet = false; kamLage = null;
  /* Fynd 3: ett sent rapport_bilder_klar (efter datorns 120 s) rättar raden. */
  const uppd0 = A.uppd.length;
  Rapport.datorTagEmot({ typ: 'rapport_bilder_klar', kod: 'R-0777', antal: 340, fel: 0 });
  Rapport.datorTagEmot({ typ: 'rapport_bilder_klar', kod: 'R-0778', antal: 300, fel: 2 });
  await vanta(20);
  ok('fynd 3: ett sent rapport_bilder_klar sätter raden till klar (delvis med fel)', A.uppd.slice(uppd0).some(u => u[0] === 'R-0777' && u[1].bilder === 'klar') && A.uppd.slice(uppd0).some(u => u[0] === 'R-0778' && u[1].bilder === 'delvis'), JSON.stringify(A.uppd.slice(uppd0)));

  /* ── 3. De tysta rättelserna på datorn ── */
  Stillbilder.glom(); Rattelse.glom();
  visaVy('app');
  const mig = player();
  spelLage = { id: 'provB-spel', kod: 'PROVB1', namn: 'Prov B', vard: mig.id, mig: mig.id };
  mig.lage = 'bord'; mig.cards = []; mig.pending = []; mig.plats = 1;
  state.players = [mig]; state.active = mig.id;
  oppSatt({ klar: true });
  kamAnsluten = true; kamFas = ''; kamGrund = 0; prefs.autoLage = true;
  renderAll(true);
  const spar = (id, namn, x, y, varfor) => ({ id, tillstand: 'klar', namn, saker: true, x, y, w: 0.08, h: 0.11, tappad: false, vilar: true, varfor });
  /* Spår 3 bär telefonens kandidater (granskningens vittne C); spår 2 är Claudes namn (varfor 'ai', Claudes namn först
     med poäng 0) — det namnet får aldrig följa med som kandidat. */
  const bord = [spar(1, 'Llanowar Elves', 0.2, 0.2, 'remsa'), Object.assign(spar(2, 'Forest', 0.42, 0.2, 'ai'), { cands: [{ name: 'Forest', score: 0 }, { name: 'Island', score: 0.41 }] }),
    Object.assign(spar(3, 'Serra Angel', 0.64, 0.2, 'modell+orb'), { cands: [{ name: 'Serra Angel', score: 0.812 }, { name: 'Shivan Dragon', score: 0.62 }, { name: 'Baneslayer Angel', score: 0.4 }] }), spar(4, 'Giant Growth', 0.2, 0.5, 'remsa')];
  kamTogsEmot({ typ: 'bord', av: 'u-prov', fran: 'kamera', spar: bord, fas: '' });
  await vanta(1200);
  /* Telefonens beskärning för spår 1 och 3 (läsningen gav namnet); spår 2 har ingen på telefonen men datorn har granskningens. */
  Stillbilder.beskarning({ id: 1 }, bc, { namn: 'Llanowar Elves', saker: true, varfor: 'remsa' });
  Stillbilder.beskarning({ id: 3 }, bc, { namn: 'Serra Angel', saker: true, varfor: 'modell+orb' });
  for (let j = 0; j < 200 && Stillbilder.ko; j++) await vanta(1);
  cropCache.set('spar-2@260', bc.toDataURL('image/jpeg', 0.8));
  const kort = n => mig.cards.find(k => k.name === n);
  const byt = async (c0, namn) => { SW.target = { kind: 'card', id: c0.cid }; applyPick(namn, null, null); await vanta(50); };
  const rattelser = () => A.rader.filter(r => r.kalla === 'rattelse');
  const vantaRader = async n => { for (let i = 0; i < 300 && (rattelser().length < n || A.uppd.filter(u => u[1].bilder).length < n); i++) await vanta(20); };
  ok('partiet: fyra kamerakort på mattan', ['Llanowar Elves', 'Forest', 'Serra Angel', 'Giant Growth'].every(n => kort(n) && kort(n).spar != null), mig.cards.map(k => k.name + ':' + k.spar).join(', '));

  /* AV: namnbyte → ingenting. */
  A.bildPa = false;
  await byt(kort('Llanowar Elves'), 'Elvish Mystic');
  await vanta(300);
  ok('inställningen AV: namnbytet sparar ingen rad och ingen fil, frågar inte telefonen', rattelser().length === 0 && !Object.keys(A.filer).some(k => /rattelse|beskarning\.jpg/.test(k)) && !A.kanal.some(m => m.typ === 'rapport_rattelse_bild') && Rattelse.stat().av === 1, JSON.stringify(Rattelse.stat()));

  /* PÅ: namnbyte (telefonens beskärning), borttaget (datorns kopia), Name this card. Namnbytet går mattans väg (MES-387):
     Change card… i kortets meny, rutan med kamerans andra gissningar (spårets egna) först, och valet. */
  A.bildPa = true;
  const serra = kort('Serra Angel');
  /* Nätet finns inte här: utan det slår namnbytet upp kortet, och notisen "Cannot reach Scryfall" ersätter toasten. */
  for (const c of mig.cards.concat([{ name: 'Shivan Dragon' }])) failed.set(keyOf(c), { msg: 'prov', tillfallig: false });
  openKortMeny(serra.cid, 400, 300);
  const bytRad = document.querySelector('.matmeny.open [data-ma="byt"]');
  if (bytRad) bytRad.click();
  await vanta(50);
  const bytRuta = document.querySelector('.ofrsok[aria-label="Change card"]');
  const gissade = bytRuta ? [...bytRuta.querySelectorAll('.sok-lista')][0] : null;
  const gissNamn = gissade ? [...gissade.querySelectorAll('.sok-t')].map(b => b.textContent) : [];
  ok('MES-387: Change card… i kortets meny öppnar rutan Change card med kamerans andra gissningar ur spåret först (utan kortets namn)',
     !!bytRad && !!bytRuta && gissNamn.join('|') === 'Shivan Dragon|Baneslayer Angel', gissNamn.join('|') || 'ingen ruta');
  const kanal0 = A.kanal.length;
  const valet = bytRuta && [...bytRuta.querySelectorAll('.sok-t')].find(b => b.textContent === 'Shivan Dragon');
  if (valet) valet.click();
  /* Pekaren över toasten håller den öppen (klockan pausar) medan rättelsen sparas — Undo provas nedan. */
  const bytToast = document.querySelector('#handToast .htkort');
  if (bytToast) bytToast.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
  await vantaRader(1);
  ok('MES-387: valet byter namnet och telefonen får det (namn, spår 3) — kameran behåller spelarens namn',
     serra.name === 'Shivan Dragon' && A.kanal.slice(kanal0).some(m => m.typ === 'namn' && m.spar === 3 && m.namn === 'Shivan Dragon'), JSON.stringify(A.kanal.slice(kanal0).filter(m => m.typ === 'namn')));
  const r1 = rattelser()[0];
  let j1 = null; try { j1 = JSON.parse(await A.filer[`u-prov/rapporter/${r1.kod}/rattelse.json`].text()); } catch (e) {}
  const b1 = r1 && A.filer[`u-prov/rapporter/${r1.kod}/beskarning.jpg`];
  ok('PÅ, namnbyte: en rad (kalla rattelse, anvandning null) + beskarning.jpg från telefonen + rattelse.json',
     r1 && r1.kalla === 'rattelse' && r1.anvandning === undefined && b1 && b1.type === 'image/jpeg' && b1.size > 1000 && j1 && j1.handelse === 'namnbyte' && j1.gissning === 'Serra Angel' && j1.ratt === 'Shivan Dragon' && j1.varfor === 'modell+orb' && j1.spelkod === 'PROVB1' && j1.spar === 3 && j1.bild === 'telefon' && j1.t > 0,
     JSON.stringify(j1));
  ok('kontraktet med D: rattelse.json har gissning, varfor, ratt, spelkod, t, spar, handelse', j1 && ['gissning', 'varfor', 'ratt', 'spelkod', 't', 'spar', 'handelse'].every(k => k in j1));
  ok('raden får bilder = klar', A.uppd.some(u => u[0] === r1.kod && u[1].bilder === 'klar'));
  ok('steg 1 (granskningen i skala): rattelse.json och radens vy bär telefonens topp-5 ur spåret (namn, poäng, marginal till ettan) och appversionen',
     j1 && Array.isArray(j1.kandidater) && j1.kandidater.length === 3 && j1.kandidater[1].namn === 'Shivan Dragon' && j1.kandidater[1].poang === 0.62 && j1.kandidater[1].marginal === -0.192 && j1.kandidater[0].marginal === 0
     && 'build' in j1 && r1.vy && Array.isArray(r1.vy.kandidater) && r1.vy.kandidater.length === 3 && 'build' in r1.vy, JSON.stringify(j1 && { kandidater: j1.kandidater, build: j1.build }));
  {
    /* MES-387: Undo i toasten tar tillbaka namnet (också till telefonen), loggar angrad (av 'namn') och raderar rättelsen. */
    const undo = document.querySelector('#handToast .htkort.on .htangra');
    const kanal1 = A.kanal.length;
    if (undo) undo.click();
    for (let i = 0; i < 100 && !A.raderade.includes(r1 && r1.kod); i++) await vanta(10);
    const ang = khJournal(0, Date.now() + 1).filter(j => j.typ === 'angrad' && j.rapport && j.rapport.av === 'namn');
    ok('MES-387: Undo — Serra Angel igen, telefonen får Serra Angel, angrad (av namn) i journalen, rättelsens rad raderad',
       !!undo && serra.name === 'Serra Angel' && A.kanal.slice(kanal1).some(m => m.typ === 'namn' && m.spar === 3 && m.namn === 'Serra Angel') && ang.length === 1 && A.raderade.includes(r1.kod),
       JSON.stringify({ namn: serra.name, ang: ang.length, raderade: A.raderade, notis: toastEl.classList.contains('on') ? toastEl.textContent : '' }));
  }
  const forest = kort('Forest'); removeAt(mig.cards.indexOf(forest));
  await vantaRader(2);
  const r2 = rattelser()[1];
  let j2 = null; try { j2 = JSON.parse(await A.filer[`u-prov/rapporter/${r2.kod}/rattelse.json`].text()); } catch (e) {}
  ok('PÅ, borttaget: telefonen har ingen beskärning → datorns kopia (granskningens), ratt null', j2 && j2.handelse === 'borttaget' && j2.gissning === 'Forest' && j2.ratt === null && j2.bild === 'dator' && A.filer[`u-prov/rapporter/${r2.kod}/beskarning.jpg`], JSON.stringify(j2));
  ok('steg 1: Claudes namn följer aldrig med som kandidat (spår 2, varfor ai: bara telefonens Island)', j2 && Array.isArray(j2.kandidater) && j2.kandidater.length === 1 && j2.kandidater[0].namn === 'Island', JSON.stringify(j2 && j2.kandidater));
  const q = { id: 'pend-b1', spar: 5, cands: [{ name: 'Grizzly Bears', sid: null }, { name: 'Runeclaw Bear' }], box: null };
  mig.pending.push(q);
  namngePend(mig, q, 'Runeclaw Bear', null, [{ name: 'Runeclaw Bear' }]);
  await vantaRader(3);
  const r3 = rattelser()[2];
  let j3 = null; try { j3 = JSON.parse(await A.filer[`u-prov/rapporter/${r3.kod}/rattelse.json`].text()); } catch (e) {}
  ok('PÅ, Name this card: gissningen ur förslagen, rätt namn, ingen bild någonstans → bilder saknas', j3 && j3.handelse === 'name_this_card' && j3.gissning === 'Grizzly Bears' && j3.ratt === 'Runeclaw Bear' && j3.bild === null && A.uppd.some(u => u[0] === r3.kod && u[1].bilder === 'saknas'), JSON.stringify(j3));
  ok('steg 1: spåret finns inte på bordet → kandidaterna null (inte granskningspostens lista)', j3 && j3.kandidater === null, JSON.stringify(j3 && j3.kandidater));
  {
    /* Helbilden (Claude) lägger sitt namn först med poäng 0 och varfor 'helbild osäker'; minnets svar kan vara spelarens eget namn. */
    const fore = senasteSpar;
    senasteSpar = fore.concat([
      { id: 901, varfor: 'helbild osäker', ai: { helbild: false }, cands: [{ name: 'Lightning Bolt', score: 0 }, { name: 'Shock', score: 0.44 }] },
      { id: 902, varfor: 'remsa minne', cands: [{ name: 'Opt', score: 0.5 }] },
      { id: 903, varfor: 'remsa', cands: [{ name: 'Opt', score: 0.71 }, { name: 'Ponder', score: 0.6 }] }]);
    const k1 = Rattelse.kandidater(901), k2 = Rattelse.kandidater(902), k3 = Rattelse.kandidater(903);
    senasteSpar = fore;
    ok('steg 1: helbildens Claude-namn (poäng 0) följer inte med; minnets svar ger inga kandidater; ett vanligt spår ger sina',
       k1 && k1.length === 1 && k1[0].namn === 'Shock' && k2 === null && k3 && k3.length === 2 && k3[1].marginal === -0.11, JSON.stringify({ k1, k2, k3 }));
  }

  {
    /* MES-387, granskningarnas fynd: ett andra byte rättar kamerans läsning (namn OCH domskäl, fast telefonen satt 'hand'
       på spåret efter det första), den förra rättelsen raderas, och Undo av det andra lägger tillbaka den första.
       Ett kort spelaren själv namngav (spårets domskäl hand före första bytet) ger ingen rättelse. */
    const t3 = senasteSpar.find(u => u.id === 3), v0 = t3.varfor;
    const json = async r => { try { return JSON.parse(await A.filer[`u-prov/rapporter/${r.kod}/rattelse.json`].text()); } catch (e) { return null; } };
    const n0 = rattelser().length, rad0 = A.raderade.length;
    kortBytNamn(serra.cid, 'Shivan Dragon', null, false);
    await vantaRader(n0 + 1);
    const forsta = rattelser()[n0];
    t3.varfor = 'hand';   // telefonen fick namnet (Kamera.namnge)
    kortBytNamn(serra.cid, 'Baneslayer Angel', null, false);
    const undo2 = document.querySelector('#handToast .htkort');
    if (undo2) undo2.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    await vantaRader(n0 + 2);
    for (let i = 0; i < 100 && A.raderade.length === rad0; i++) await vanta(10);
    const andra = rattelser()[n0 + 1], ja = andra && await json(andra);
    const kan = document.querySelector('#handToast .htkort.on .htangra'); if (kan) kan.click();
    await vantaRader(n0 + 3);
    const tredje = rattelser()[n0 + 2];
    const giant = kort('Giant Growth'), v4 = senasteSpar.find(u => u.id === 4), v4f = v4.varfor; v4.varfor = 'hand';
    const n1 = rattelser().length;
    kortBytNamn(giant.cid, 'Giant Spider', null, false);
    await vanta(300);
    ok('MES-387: andra bytet rättar kamerans läsning (Serra Angel, modell+orb) fast spåret säger hand, den förra raderas; Undo ger den första igen; ett kort spelaren namngav ger ingen rättelse',
       forsta && forsta.vy.gissning === 'Serra Angel' && forsta.vy.ratt === 'Shivan Dragon' && andra && andra.vy.gissning === 'Serra Angel' && andra.vy.ratt === 'Baneslayer Angel'
       && ja && ja.varfor === 'modell+orb' && ja.saker === true && A.raderade.includes(forsta.kod)
       && !!kan && serra.name === 'Shivan Dragon' && tredje && tredje.vy.ratt === 'Shivan Dragon' && tredje.vy.gissning === 'Serra Angel'
       && rattelser().length === n1 && giant.name === 'Giant Spider',
       JSON.stringify({ forsta: forsta && [forsta.vy.gissning, forsta.vy.ratt], andra: andra && [andra.vy.gissning, andra.vy.ratt, ja && ja.varfor], tredje: tredje && [tredje.vy.gissning, tredje.vy.ratt], undo: !!kan, serra: serra.name, raderade: A.raderade, efter: rattelser().length - n1 }));
    /* Granskning 3, fynd 3: efter en omladdning finns inget löfte — kortets rättelsekod tar tillbaka raden ändå. */
    const kodNu = serra.rattelse && serra.rattelse.kod;
    bytLofte.clear();   // som efter en omladdning
    const rad1 = A.raderade.length;
    kortBytNamn(serra.cid, 'Serra Angel', null, false);
    for (let i = 0; i < 100 && A.raderade.length === rad1; i++) await vanta(10);
    ok('MES-387: efter en omladdning tar tillbaka till kamerans namn bort rättelsen via kortets kod (c.rattelse, i spelets rad)',
       !!kodNu && A.raderade.includes(kodNu) && !serra.rattelse && !!slimDelat([Object.assign({}, serra, { rattelse: { kod: 'R-x' } })])[0].rattelse, JSON.stringify({ kodNu, raderade: A.raderade }));
    t3.varfor = v0; v4.varfor = v4f;
    giant.name = 'Giant Growth'; delete giant.namnHand; delete giant.kamLas; serra.name = 'Serra Angel'; delete serra.namnHand;
    handToastStang();
  }

  /* AV igen: slutar direkt. */
  A.bildPa = false;
  const forr = A.rader.length, filer0 = Object.keys(A.filer).length;
  await byt(kort('Giant Growth'), 'Titanic Growth');
  await vanta(300);
  ok('AV igen: nästa rättelse sparar ingenting', A.rader.length === forr && Object.keys(A.filer).length === filer0);
  ok('ingen rättelse frågar Claude (inga anrop mot /api)', !Lada.utdrag().some(e => e.slag === 'claude'));

  /* ── 3b. Var kortet låg (uppföljning av MES-366/368): två kort omlott, rättelsen av det undre ──
     Spår 63 (Shock) ligger ÖVER spår 77 (Opt, fel namn). Läsningens beskärning av 77 görs som i appen: appens egen
     maskaTackt (utklippt ur index.html, window.__maskaSrc) målar 63:s låda grå och lägger siffrorna på duken. */
  {
    const AW = 360, AH = 203;
    const box63 = { x: 125, y: 90, w: 50, h: 70 }, box77 = { x: 100, y: 60, w: 50, h: 70 };
    const t63 = { id: 63, namn: 'Shock', saker: true, tillstand: 'klar', vilaX: 150, vilaY: 125, box: box63 };
    const t77 = { id: 77, namn: 'Opt', saker: true, tillstand: 'klar', vilaX: 125, vilaY: 95, box: box77, tackt: [Object.assign({}, box63)] };
    /* Telefonens ring: en bild av bordet med båda spåren. */
    const rc = document.createElement('canvas'); rc.width = AW; rc.height = AH; const rx = rc.getContext('2d');
    rx.fillStyle = '#5a3a22'; rx.fillRect(0, 0, AW, AH); rx.fillStyle = '#3050c0'; rx.fillRect(box77.x, box77.y, box77.w, box77.h); rx.fillStyle = '#c03030'; rx.fillRect(box63.x, box63.y, box63.w, box63.h);
    Stillbilder.steg(rc, 5e9, [t63, t77], AW, AH);
    for (let j = 0; j < 200 && Stillbilder.ko; j++) await vanta(1);
    /* Läsningens beskärning av 77 (beskar(): lådan + 8 % marginal, rak), målad blå, sedan appens maskaTackt. */
    const m = 0.08, bx0 = box77.x - box77.w * m, by0 = box77.y - box77.h * m, bw0 = box77.w * (1 + 2 * m), bh0 = box77.h * (1 + 2 * m);
    const ow = Math.round(bw0 * 5), oh = Math.round(bh0 * 5);
    const kc = document.createElement('canvas'); kc.width = ow; kc.height = oh; const kx = kc.getContext('2d'); kx.fillStyle = '#3050c0'; kx.fillRect(0, 0, ow, oh);
    const maskaTackt = new Function('AW', 'AH', 'modell', 'senasteGain', 'return ' + window.__maskaSrc)(AW, AH, null, 1);
    const b = { bild: kc, kort: null, geo: { r: { x: 0, y: 0, w: AW, h: AH }, bx: bx0, by: by0, bw: bw0, bh: bh0, ow, oh, liggande: false } };
    const maskad = maskaTackt(b, t77);
    ok('3b: appens maskaTackt målade och lade siffrorna på duken (lasFacit)', maskad === true && kc.lasFacit && kc.lasFacit.maskade.length === 1 && kc.lasFacit.aw === AW, JSON.stringify(kc.lasFacit));
    const t77nu = Object.assign({}, t77);   // spåret som läsningen ser det; ingen maskTackt-kopia i Stillbilder
    Stillbilder.beskarning(t77nu, kc, { namn: 'Opt', saker: true, varfor: 'modell+orb' });
    for (let j = 0; j < 200 && Stillbilder.ko; j++) await vanta(1);
    const post = Stillbilder.besk.get(77);
    ok('3b: beskärningen bär ruta (andelar + bildens mått) och maskade med spåret som ligger över (63)',
       post && post.ruta && Math.abs(post.ruta.x - box77.x / AW) < 1e-3 && post.ruta.bild.w === AW && post.maskade && post.maskade.length === 1 && post.maskade[0].spar === 63 && Math.abs(post.maskade[0].x - box63.x / AW) < 1e-3,
       JSON.stringify(post && { ruta: post.ruta, maskade: post.maskade }));
    /* Datorn: samma två kort på bordet, 77 maskad under 63. */
    const n = q => ({ x: q.x / AW, y: q.y / AH, w: q.w / AW, h: q.h / AH });
    const sp = (id, namn, q, x) => Object.assign({ id, tillstand: 'klar', namn, saker: true, tappad: false, vilar: true, varfor: 'modell+orb' }, n(q), x || {});
    kamTogsEmot({ typ: 'bord', av: 'u-prov', fran: 'kamera', spar: bord.concat([sp(63, 'Shock', box63), sp(77, 'Opt', box77, { maskad: true, under: [63] })]), fas: '' });
    await vanta(1200);
    ok('3b: två kort omlott på mattan', kort('Shock') && kort('Opt') && kort('Opt').spar === 77, mig.cards.map(k => k.name + ':' + k.spar).join(', '));
    A.bildPa = true;
    const n0 = rattelser().length;
    await byt(kort('Opt'), 'Brainstorm');
    await vantaRader(n0 + 1);
    for (let i = 0; i < 100 && !(rattelser()[n0] && A.filer[`u-prov/rapporter/${rattelser()[n0].kod}/rattelse.json`]); i++) await vanta(20);
    const rr = rattelser()[n0];
    let jr = null; try { jr = JSON.parse(await A.filer[`u-prov/rapporter/${rr.kod}/rattelse.json`].text()); } catch (e) {}
    const kb = rr && A.filer[`u-prov/rapporter/${rr.kod}/kontext.jpg`], bb = rr && A.filer[`u-prov/rapporter/${rr.kod}/beskarning.jpg`];
    ok('3b: rattelse.json har ruta (kalla beskarning), maskade [spår 63] och kontext — och kontext.jpg ligger i mappen',
       jr && jr.spar === 77 && jr.bild === 'telefon' && jr.ruta && jr.ruta.kalla === 'beskarning' && jr.ruta.bild && jr.ruta.bild.w === AW && Math.abs(jr.ruta.x - box77.x / AW) < 1e-3 && Math.abs(jr.ruta.h - box77.h / AH) < 1e-3
       && jr.maskade && jr.maskade.length === 1 && jr.maskade[0].spar === 63 && jr.kontext && jr.kontext.fil === 'kontext.jpg' && kb && kb.type === 'image/jpeg' && kb.size > 2000,
       JSON.stringify(jr && { ruta: jr.ruta, maskade: jr.maskade, kontext: jr.kontext && { w: jr.kontext.w, h: jr.kontext.h, ruta: jr.kontext.ruta, maskade: jr.kontext.maskade } }));
    ok('3b: radens vy bär bordets ruta och maskade (datorns syn, kalla bordet)', rr && rr.vy && rr.vy.ruta && rr.vy.ruta.kalla === 'bordet' && rr.vy.maskade && rr.vy.maskade[0] && rr.vy.maskade[0].spar === 63, JSON.stringify(rr && rr.vy));
    /* Masken stämmer med rutorna: räkna det grå området i beskarning.jpg UR rattelse.json (ruta + 8 % marginal,
       maskade + 1 analyspixel som maskaTackt) och prova bildpunkter innanför och utanför. */
    const pix = async (blob, pts) => { const bm = await createImageBitmap(blob); const c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; const x = c.getContext('2d'); x.drawImage(bm, 0, 0); return { w: bm.width, h: bm.height, p: pts(bm.width, bm.height).map(([u, v]) => Array.from(x.getImageData(Math.round(u), Math.round(v), 1, 1).data).slice(0, 3)) }; };
    let maskOk = false, maskDet = '';
    if (jr && jr.ruta && jr.maskade && bb) {
      const R = jr.ruta, Q = jr.maskade[0], W = R.bild.w, H = R.bild.h;
      const cx0 = (R.x - R.w * m) * W, cy0 = (R.y - R.h * m) * H, cw = R.w * (1 + 2 * m) * W, ch = R.h * (1 + 2 * m) * H;
      const u0 = (Q.x * W - 1 - cx0) / cw, v0 = (Q.y * H - 1 - cy0) / ch;   // maskens övre vänstra hörn i beskärningen (0–1)
      const P = await pix(bb, (w, h) => [[(u0 + 0.05) * w, (v0 + 0.05) * h], [(u0 + (1 - u0) / 2) * w, (v0 + (1 - v0) / 2) * h], [(u0 - 0.06) * w, (v0 - 0.06) * h], [0.1 * w, 0.1 * h], [(u0 - 0.04) * w, 0.95 * h]]);
      const gra = c => Math.abs(c[0] - 128) < 18 && Math.abs(c[1] - 128) < 18 && Math.abs(c[2] - 128) < 18, bla = c => c[2] > 150 && c[0] < 90;
      maskOk = gra(P.p[0]) && gra(P.p[1]) && bla(P.p[2]) && bla(P.p[3]) && bla(P.p[4]);
      maskDet = `maskens hörn (${u0.toFixed(3)}, ${v0.toFixed(3)}) ur rattelse.json; bildpunkter ${JSON.stringify(P.p)}`;
    }
    ok('3b: masken i beskarning.jpg ligger där ruta + maskade säger (grått innanför, kortet utanför)', maskOk, maskDet);
    /* kontext.jpg (Jespers beslut 2026-10-14): ett utsnitt runt kortet, inte hela bordet. Ringbilden är AW × AH;
       utsnittet = rutan + en rutas bredd/höjd åt varje håll inom bilden, högst 480 px och högst ×2. */
    if (kb && jr && jr.kontext) {
      const K = jr.kontext, r = K.ruta, q = K.maskade[0], U = K.utsnitt;
      const forv = { x: Math.max(0, box77.x - box77.w) / AW, y: Math.max(0, box77.y - box77.h) / AH, w: (Math.min(AW, box77.x + 2 * box77.w) - Math.max(0, box77.x - box77.w)) / AW, h: (Math.min(AH, box77.y + 2 * box77.h) - Math.max(0, box77.y - box77.h)) / AH };
      const kd = await createImageBitmap(kb), ksz = { w: kd.width, h: kd.height }; try { kd.close(); } catch (e) {}
      ok('3b: kontext.jpg är ett utsnitt: mindre del av ringbilden än hela, rutan + ett kortavstånd åt varje håll (utsnitt i rattelse.json)',
         U && U.w < 1 && U.w * U.h < 0.5 && ['x', 'y', 'w', 'h'].every(k => Math.abs(U[k] - forv[k]) < 0.01) && K.bild && K.bild.w === AW
         && r.x >= U.x && r.y >= U.y && r.x + r.w <= U.x + U.w + 1e-9 && r.y + r.h <= U.y + U.h + 1e-9,
         JSON.stringify({ utsnitt: U, forvantat: forv, bild: K.bild }));
      const srcW = U.w * AW, srcH = U.h * AH;
      ok('3b: kontext.jpg högst 480 px åt längsta hållet, aldrig uppskalad mer än ×2, w/h i rattelse.json = bilden',
         Math.max(ksz.w, ksz.h) <= 480 && ksz.w <= srcW * 2 + 1 && ksz.h <= srcH * 2 + 1 && ksz.w === K.w && ksz.h === K.h && Math.abs(ksz.w / ksz.h - srcW / srcH) < 0.02,
         JSON.stringify({ jpg: ksz, kalla: [srcW, srcH], json: [K.w, K.h] }));
      /* I utsnittets koordinater: rutans mitt hamnar där utsnittet säger, rutans kant röd, bordet utanför brunt. */
      const iU = (X, Y) => [(X - U.x) / U.w, (Y - U.y) / U.h];
      const [mx, my] = iU(r.x + r.w / 2, r.y + r.h / 2), [vx] = iU(r.x, 0), [, oy] = iU(0, r.y), [qx, qy] = iU(q.x + q.w * 0.7, q.y + q.h * 0.5), [ux] = iU(r.x - r.w * 0.5, 0);
      const P = await pix(kb, (w, h) => [[vx * w + 1, my * h], [mx * w, oy * h + 1], [qx * w, qy * h], [ux * w, my * h], [mx * w - 6, my * h - 8]]);
      const rod = c => c[0] > 180 && c[1] < 110, brun = c => Math.abs(c[0] - 0x5a) < 30 && Math.abs(c[1] - 0x3a) < 30 && Math.abs(c[2] - 0x22) < 30;
      ok('3b: rutans mitt ligger där utsnittet säger: vänster och övre kant röd, den maskade lådan grå, bordet till vänster brunt, kortet blått innanför',
         rod(P.p[0]) && rod(P.p[1]) && Math.abs(P.p[2][0] - P.p[2][2]) < 100 && P.p[2][0] < 170 && brun(P.p[3]) && P.p[4][2] > 150 && P.p[4][0] < 90,
         JSON.stringify(P.p) + ' mitt ' + mx.toFixed(3) + ',' + my.toFixed(3));
      window.__kontextB64 = await new Promise(res => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(kb); });
    } else ok('3b: kontext.jpg har spårets ruta inritad', false, 'ingen kontext');
    ok('3b: kontexten bär dt (ringbildens t − beskärningens t, telefonens klocka) inom ±2 s, och inget skäl',
       jr && jr.kontext && Number.isFinite(jr.kontext.dt) && Math.abs(jr.kontext.dt) <= 2000 && jr.kontextSkal === null, JSON.stringify(jr && { dt: jr.kontext && jr.kontext.dt, skal: jr.kontextSkal }));
    /* Granskningen av 6c3fea8, fynd 2: ringens närmaste bild ligger 5 s från beskärningen → ingen kontext, skälet i svaret. */
    {
      const f77 = Stillbilder.besk.get(77), t0 = f77.t; f77.t = t0 - 5000;
      const k0 = A.kanal.length;
      await Stillbilder.rattelseBild({ kod: 'R-0881', sokvag: 'u-prov/rapporter/R-0881', spar: 77 });
      f77.t = t0;
      const sv = A.kanal.slice(k0).find(m => m.typ === 'rapport_rattelse_klar');
      ok('3b: ringens bild 5 s från beskärningen → beskarning.jpg laddas upp men ingen kontext.jpg, skälet i svaret',
         sv && sv.ok === 1 && sv.kontext === null && /5\.\d s/.test(sv.kontextSkal || '') && A.filer['u-prov/rapporter/R-0881/beskarning.jpg'] && !A.filer['u-prov/rapporter/R-0881/kontext.jpg'], JSON.stringify(sv && { ok: sv.ok, kontext: sv.kontext, skal: sv.kontextSkal }));
    }
    /* Fynd 4: en vriden beskärning (beskarVridning) — lasFacit och rutan bär vinkeln; rak = null. */
    {
      const vc = document.createElement('canvas'); vc.width = 300; vc.height = 420; vc.getContext('2d').fillStyle = '#3050c0'; vc.getContext('2d').fillRect(0, 0, 300, 420);
      const t79 = { id: 79, namn: 'Opt', saker: true, tillstand: 'klar', box: { x: 200, y: 40, w: 50, h: 70 }, beskarRot: 12 };
      maskaTackt({ bild: vc, kort: null, geo: null }, t79);
      Stillbilder.beskarning(t79, vc, { namn: 'Opt', saker: true, varfor: 'remsa' });
      for (let j = 0; j < 200 && Stillbilder.ko; j++) await vanta(1);
      const p79 = Stillbilder.besk.get(79);
      ok('3b: vriden beskärning → lasFacit.rot och ruta.rot = beskarRot; rak → rot null', vc.lasFacit && vc.lasFacit.rot === 12 && p79 && p79.ruta && p79.ruta.rot === 12 && kc.lasFacit.rot === null && post.ruta.rot === null,
         JSON.stringify({ lasFacit: vc.lasFacit, ruta: p79 && p79.ruta, rak: kc.lasFacit.rot }));
    }
    /* Telefonen svarar inte: datorns kopia, rutan ur bordet, maskade okänt, ingen kontext. */
    A.telefonSvarar = false;
    cropCache.set('spar-63@260', bc.toDataURL('image/jpeg', 0.8));
    const n1 = rattelser().length;
    const sh = kort('Shock');
    kamAnsluten = false;   // fragaTelefon svarar null direkt i stället för efter 10 s
    const pr = Rattelse.fran('namnbyte', sh, 'Lightning Bolt');
    const rd = pr ? await pr : null;
    kamAnsluten = true;
    let jd = null; try { jd = JSON.parse(await A.filer[`${rd.sokvag}/rattelse.json`].text()); } catch (e) {}
    ok('3b: telefonen svarar inte → ruta ur bordet (kalla bordet), maskade null (okänt), kontext null, ingen kontext.jpg',
       jd && jd.bild === 'dator' && jd.ruta && jd.ruta.kalla === 'bordet' && jd.maskade === null && jd.kontext === null && !A.filer[`${rd.sokvag}/kontext.jpg`] && rattelser().length === n1 + 1, JSON.stringify(jd));
    A.telefonSvarar = true;
  }

  /* ── 5. Granskning 1 ── */
  /* Fynd 1: toBlob anropas aldrig inne i steget eller i läsningens beskarning, bara i en egen uppgift efter. */
  {
    Stillbilder.glom();
    const orig = HTMLCanvasElement.prototype.toBlob; let anrop = 0;
    HTMLCanvasElement.prototype.toBlob = function (...a) { anrop++; return orig.apply(this, a); };
    try {
      Stillbilder.steg(c, 5e9, sparNu(400), 360, 203);
      const iSteget = anrop;
      Stillbilder.beskarning({ id: 4242 }, bc, { namn: 'Llanowar Elves', saker: true, varfor: 'remsa' });
      const iLasningen = anrop;
      for (let i = 0; i < 200 && Stillbilder.ko; i++) await vanta(1);
      ok('fynd 1: kodningen (toBlob) körs inte i steget eller i läsningen, bara efteråt', iSteget === 0 && iLasningen === 0 && anrop === 2 && Stillbilder.ring.length === 1 && Stillbilder.besk.has(4242), `i steget ${iSteget}, i läsningen ${iLasningen}, efteråt ${anrop}`);
    } finally { HTMLCanvasElement.prototype.toBlob = orig; }
    /* DoD 3: stegets tid och kodningens synkrona tid utanför steget, 600 steg à 150 ms med en händelse var 5:e s. */
    Stillbilder.glom();
    const per = [];
    for (let k = 0; k < 600; k++) { if (k % 13 === 0) slat(k); const t0 = performance.now(); Stillbilder.steg(c, 6e9 + k * 150, sparNu(k), 360, 203); per.push(performance.now() - t0); await vanta(0); }
    for (let i = 0; i < 200 && Stillbilder.ko; i++) await vanta(1);
    const sm = Stillbilder.stat(); per.sort((a, b) => a - b);
    minne.dod3 = { steg: per.length, stegMedian: +per[per.length >> 1].toFixed(3), stegP99: +per[Math.floor(per.length * 0.99)].toFixed(3), stegMax: +per[per.length - 1].toFixed(3), bilder: sm.tagna, kodSyncMs: sm.kodSyncMs, kodSyncMax: sm.kodSyncMax, kodMs: sm.kodMs };
    ok('DoD 3: steget kostar under 1 ms i median med ringen på (kodningen utanför)', minne.dod3.stegMedian < 1, JSON.stringify(minne.dod3));
  }
  /* Granskning 2, punkt 1: beskärningen sparas i full storlek (upp till spärren 1024), ringen skalas till 480. */
  {
    Stillbilder.glom();
    const duk = (w, h) => { const d = document.createElement('canvas'); d.width = w; d.height = h; const x = d.getContext('2d'); x.fillStyle = '#c9b38a'; x.fillRect(0, 0, w, h); x.fillStyle = '#222'; x.font = '30px serif'; x.fillText('Llanowar Elves', 20, 50); return d; };
    const fall = [[720, 1005], [300, 419], [1400, 1960]];
    fall.forEach(([w, h], i) => Stillbilder.beskarning({ id: 5100 + i }, duk(w, h), { namn: 'Bredd ' + w, saker: true, varfor: 'remsa' }));
    Stillbilder.steg(duk(960, 540), 8e9, [], 960, 540);
    for (let i = 0; i < 200 && Stillbilder.ko; i++) await vanta(1);
    const bw = fall.map((f, i) => { const b = Stillbilder.besk.get(5100 + i); return b ? b.w + 'x' + b.h : null; });
    const rw = Stillbilder.ring[0] ? Stillbilder.ring[0].w + 'x' + Stillbilder.ring[0].h : null;
    ok('granskning 2, punkt 1: beskärningen i full storlek (720 → 720, 300 → 300), spärren 1024; ringens bild 480', bw[0] === '720x1005' && bw[1] === '300x419' && bw[2] === '1024x1434' && rw === '480x270', `beskärningar ${bw.join(', ')}, ringen ${rw}`);
    /* Punkt 3: en kodning som blir klar efter glom/tom hamnar inte i den tömda ringen (annat konto eller parti). */
    Stillbilder.glom();
    Stillbilder.beskarning({ id: 5200 }, duk(400, 560), { namn: 'Sen', saker: true, varfor: 'remsa' });
    Stillbilder.steg(duk(360, 203), 9e9, [], 360, 203);
    const iKo = Stillbilder.ko;
    Stillbilder.glom();
    for (let i = 0; i < 200 && Stillbilder.ko; i++) await vanta(1);
    const s3 = Stillbilder.stat();
    ok('granskning 2, punkt 3: kodning klar efter glom → bilden kastas (ring och beskärningar tomma)', iKo === 2 && Stillbilder.ring.length === 0 && Stillbilder.besk.size === 0 && s3.tagna === 0 && s3.beskTagna === 0 && s3.bytes === 0 && s3.beskBytes === 0, `i kön ${iKo}, ring ${Stillbilder.ring.length}, besk ${Stillbilder.besk.size}`);
    /* Punkt 4: drawImage kastar → ingen kö hänger kvar, och nästa kodning går. */
    Stillbilder.glom();
    Stillbilder.beskarning({ id: 5300 }, { width: 100, height: 140 }, { namn: 'Kastar', saker: true });
    Stillbilder.beskarning({ id: 5301 }, duk(300, 419), { namn: 'Efter', saker: true });
    for (let i = 0; i < 200 && Stillbilder.ko; i++) await vanta(1);
    ok('granskning 2, punkt 4: en kodning där drawImage kastar lämnar ingen kö, nästa går', !Stillbilder.besk.has(5300) && Stillbilder.besk.has(5301) && Stillbilder.ko === 0);
    Stillbilder.glom();
  }
  /* Fynd 9: en händelse som inte fick plats (kön full) tas i nästa steg; beskärningarna har egen kö. */
  {
    Stillbilder.glom();
    const s1 = [{ id: 1, namn: 'A', tillstand: 'klar', vilaX: 10, vilaY: 10, box: { x: 10, y: 10, w: 20, h: 30 } }];
    const s2 = s1.concat([{ id: 2, namn: 'B', tillstand: 'klar', vilaX: 60, vilaY: 10, box: { x: 60, y: 10, w: 20, h: 30 } }]);
    const s3 = s2.concat([{ id: 3, namn: 'C', tillstand: 'klar', vilaX: 110, vilaY: 10, box: { x: 110, y: 10, w: 20, h: 30 } }]);
    Stillbilder.steg(c, 7e9, s1, 360, 203);          // tid
    Stillbilder.steg(c, 7e9 + 400, s2, 360, 203);    // händelse (kön 2)
    Stillbilder.steg(c, 7e9 + 800, s3, 360, 203);    // händelse, kön full → hoppas över
    const hopp = Stillbilder.stat().hoppade;
    Stillbilder.beskarning({ id: 9191 }, bc, { namn: 'C', saker: true });   // ringens kö är full: beskärningen tas ändå
    for (let i = 0; i < 200 && Stillbilder.ko; i++) await vanta(1);
    Stillbilder.steg(c, 7e9 + 900, s3, 360, 203);    // samma bord: händelsen som inte fick plats tas nu
    for (let i = 0; i < 200 && Stillbilder.ko; i++) await vanta(1);
    const r9 = Stillbilder.ring;
    ok('fynd 9: händelsebilden som inte fick plats tas i nästa steg, med det bordet', hopp === 1 && r9.length === 3 && r9[2].orsak === 'handelse' && r9[2].spar.length === 3, `hoppade ${hopp}, ring ${r9.map(b => b.orsak + ':' + b.spar.length).join(' ')}`);
    ok('fynd 9: beskärningen tappas inte när ringens kö är full', Stillbilder.besk.has(9191) && !Stillbilder.stat().beskHoppade);
  }
  /* Fynd 5: ringen tillhör kontot och partiet. */
  {
    Stillbilder.glom();
    kamLage = { id: 'p1', kod: 'PARTI1' };
    Stillbilder.steg(c, 8e9, sparNu(400), 360, 203);
    for (let i = 0; i < 200 && Stillbilder.ko; i++) await vanta(1);
    const fore = Stillbilder.ring.length;
    kamLage = { id: 'p2', kod: 'PARTI2' };
    const ut2 = Stillbilder.stillbilder();
    const tomtNyttParti = ut2.length === 1 && ut2[0].namn === 'index.json' && Stillbilder.ring.length === 0;
    Stillbilder.steg(c, 8e9 + 10, sparNu(400), 360, 203);
    for (let i = 0; i < 200 && Stillbilder.ko; i++) await vanta(1);
    const minId0 = Moln.minId; Moln.minId = () => 'u-annan';
    const ut3 = Stillbilder.stillbilder(); Moln.minId = minId0;
    ok('fynd 5: nytt parti eller annat konto → ringen töms innan bilderna lämnar telefonen', fore === 1 && tomtNyttParti && ut3.length === 1 && Stillbilder.stat().tommda === 2, `före ${fore}, nytt parti ${ut2.length} filer, annat konto ${ut3.length}`);
    const kalla = [...document.scripts].map(x => x.textContent).join('\n');
    ok('fynd 5: utloggningen tömmer ringen och rättelserna (loggaUt)', /signOut\(\);\s*session = null;\s*try \{ if \(typeof Stillbilder !== 'undefined'\) Stillbilder\.glom\(\); if \(typeof Rattelse !== 'undefined'\) Rattelse\.glom\(\)/.test(kalla));
    kamLage = null; Stillbilder.glom();
  }
  /* Fynd 7: telefonen läser inställningen själv. */
  {
    Stillbilder.beskarning({ id: 77 }, bc, { namn: 'Serra Angel', saker: true, varfor: 'remsa' });
    for (let i = 0; i < 200 && Stillbilder.ko; i++) await vanta(1);
    A.bildPa = false; const k0 = A.kanal.length, f0 = Object.keys(A.filer).length;
    await Stillbilder.rattelseBild({ kod: 'R-0880', sokvag: 'u-prov/rapporter/R-0880', spar: 77 });
    const sv = A.kanal.slice(k0).find(m => m.typ === 'rapport_rattelse_klar');
    ok('fynd 7: telefonen laddar inte upp när inställningen är av på servern', sv && sv.ok === 0 && sv.nej === 1 && Object.keys(A.filer).length === f0, JSON.stringify(sv));
  }
  /* Fynd 6 + 7 (datorn) + 8 + 2 på mattan. */
  {
    Rattelse.glom(); A.bildPa = false;
    const gg = mig.cards.find(k => k.spar != null);
    const r0 = rattelser().length;
    await byt(gg, 'Fynd Sex'); await vanta(200);
    const gg6 = kort('Fynd Sex') || gg;
    A.bildPa = true;
    /* Samma rättelse igen (avstämningen anropar en gång till) med inställningen på nu: sparas — tidigare låste gjorda ute den. */
    const p6 = Rattelse.fran('namnbyte', Object.assign({}, gg6, { name: gg.name }), 'Fynd Sex');
    const r6 = p6 && await p6;
    ok('fynd 6: en rättelse som hoppades över (av) blockerar inte samma rättelse när inställningen slagits på', !!r6 && rattelser().length === r0 + 1, JSON.stringify(Rattelse.stat()));
    const p6b = Rattelse.fran('namnbyte', Object.assign({}, gg6, { name: gg.name }), 'Fynd Sex');
    ok('fynd 6: sparad en gång, inte två', p6b === null);
    /* Fynd 7, datorn: inställningen slås av under väntan på telefonen → raden bort, inga filer. */
    const ansl0 = kamAnsluten; kamAnsluten = false;   // ingen telefon: väntan blir kort
    let n7 = 0; A.bildPa = () => (++n7 === 1);
    const f7 = Object.keys(A.filer).length;
    const r7 = await Rattelse.fran('namnbyte', Object.assign({}, gg6, { cid: 'fynd7' }), 'Fynd Sju');
    const rad7 = rattelser()[rattelser().length - 1];
    ok('fynd 7: datorn läser om inställningen efter väntan — av nu → raden raderas, inga filer', r7 === null && n7 === 2 && A.raderade.includes(rad7.kod) && Object.keys(A.filer).length === f7, `getUser ${n7}, raderade ${A.raderade.join(',')}`);
    kamAnsluten = ansl0; A.bildPa = true;
    /* Fynd 8: spåret är borta på datorn — telefonens domskäl används. */
    Stillbilder.beskarning({ id: 4711 }, bc, { namn: 'Spöket', saker: true, varfor: 'remsa' });
    for (let i = 0; i < 200 && Stillbilder.ko; i++) await vanta(1);
    const r8 = await Rattelse.fran('borttaget', { cid: 'fynd8', spar: 4711, name: 'Spöket' }, null);
    let j8 = null; try { j8 = JSON.parse(await A.filer[`${r8.sokvag}/rattelse.json`].text()); } catch (e) {}
    ok('fynd 8: spåret borta på datorn → varfor och saker ur telefonens svar', j8 && j8.varfor === 'remsa' && j8.saker === true && j8.bild === 'telefon', JSON.stringify(j8));
    /* Fynd 2: taket — tyst, och inga fler försök (ingen getUser) resten av sessionen. */
    const rad0 = Moln.rapportRad; Moln.rapportRad = async () => { throw Object.assign(new Error('rapport_tak'), { tak: true }); };
    const lad0 = Lada.utdrag().filter(e => e.slag === 'fel' && e.kalla === 'rattelse').length;
    const t1 = await Rattelse.fran('namnbyte', { cid: 'tak1', spar: 1, name: 'X' }, 'Y');
    const g0 = A.getUser;
    const t2 = Rattelse.fran('namnbyte', { cid: 'tak2', spar: 1, name: 'X' }, 'Z');
    await vanta(30);
    ok('fynd 2: taket nått → tyst (inget fel i lådan) och inga fler försök denna session (ingen getUser)', t1 === null && t2 === null && A.getUser === g0 && Rattelse.stat().takNatt === true && Lada.utdrag().filter(e => e.slag === 'fel' && e.kalla === 'rattelse').length === lad0, JSON.stringify(Rattelse.stat()));
    Moln.rapportRad = async () => { throw new Error('new row violates: rattelse_tak: 500 av 500'); };
    Rattelse.glom();
    const t3 = await Rattelse.fran('namnbyte', { cid: 'tak3', spar: 1, name: 'X' }, 'Y');
    ok('fynd 2: också A:s nya felkod (rattelse_tak i texten) räknas som taket', t3 === null && Rattelse.stat().takNatt === true);
    Moln.rapportRad = rad0; Rattelse.glom();
  }

  /* ── 4. Växeln ── */
  const box = document.getElementById('pbBilder');
  A.bildPa = false; await window.lasBildVaxel();
  const av1 = box.checked === false && /Nothing is kept/.test(document.getElementById('pbBilderTxt').textContent);
  box.checked = true; box.dispatchEvent(new Event('change'));
  for (let i = 0; i < 50 && !A.satt.length; i++) await vanta(10);
  await vanta(50);
  ok('växeln: läser av, skriver på (improve_pictures), och visar "On since …"', av1 && A.satt[0] === true && A.bildPa === true && box.checked && /On since 13 Oct 2026/.test(document.getElementById('pbBilderTxt').textContent), document.getElementById('pbBilderTxt').textContent);

  const sparad = { rad: r1, rattelse: j1, beskarning: b1 ? await new Promise(res => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b1); }) : null };
  return { rad, minne, sparad, kontext: window.__kontextB64 || null };
};

(async () => {
  const srv = await server();
  let c;
  try { c = await chrome(); } catch (e) { console.error('prov-b: ' + e.message); srv.close(); process.exit(2); }
  let ut = null;
  try {
    await c.cdp('Runtime.enable'); await c.cdp('Page.enable'); await c.cdp('Network.enable');
    await c.cdp('Network.setBlockedURLs', { urls: ['*scryfall*', '*supabase*', '*jsdelivr*', '*unpkg*', '*googleapis*', '*gstatic*', '*cdnjs*'] });
    await c.cdp('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
    await c.cdp('Page.navigate', { url: `http://127.0.0.1:${srv.address().port}/?debug` });
    const t0 = Date.now();
    for (;;) {
      const r = await c.cdp('Runtime.evaluate', { expression: "document.readyState === 'complete' && typeof Stillbilder === 'object' && typeof avstamBord === 'function'", returnByValue: true }).catch(() => null);
      if (r && r.result && r.result.value) break;
      if (Date.now() - t0 > 30000) throw new Error('appen laddade inte');
      await vanta(100);
    }
    await vanta(300);
    /* 3b: appens egen maskaTackt (Kamera, privat) klipps ur filen och körs i sidan med provets AW/AH. */
    await c.cdp('Runtime.evaluate', { expression: 'window.__maskaSrc = ' + JSON.stringify(utklipp(fs.readFileSync(FIL, 'utf8'), 'function maskaTackt(b, t) {')) });
    const r = await c.cdp('Runtime.evaluate', { expression: '(' + PROV.toString() + ')()', awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text);
    ut = r.result.value;
    /* Fynd 4: samma app utan ?debug (debug=0 tar bort lådans flagga). */
    await c.cdp('Page.navigate', { url: `http://127.0.0.1:${srv.address().port}/?debug=0` });
    const t1 = Date.now();
    for (;;) {
      const q = await c.cdp('Runtime.evaluate', { expression: "document.readyState === 'complete' && typeof Stillbilder === 'object' && typeof avstamBord === 'function'", returnByValue: true }).catch(() => null);
      if (q && q.result && q.result.value) break;
      if (Date.now() - t1 > 30000) throw new Error('appen laddade inte (utan debug)');
      await vanta(100);
    }
    await vanta(300);
    const r2 = await c.cdp('Runtime.evaluate', { expression: '(' + PROV_AV.toString() + ')()', awaitPromise: true, returnByValue: true });
    if (r2.exceptionDetails) throw new Error((r2.exceptionDetails.exception || {}).description || r2.exceptionDetails.text);
    ut.rad = ut.rad.concat(r2.result.value.rad);
    /* Fynd 4: samma app med flaggan på (go-live), utan ?debug. */
    await c.cdp('Page.navigate', { url: `http://127.0.0.1:${srv.address().port}/flagga.html?debug=0` });
    const t2 = Date.now();
    for (;;) {
      const q = await c.cdp('Runtime.evaluate', { expression: "document.readyState === 'complete' && typeof Stillbilder === 'object' && typeof avstamBord === 'function'", returnByValue: true }).catch(() => null);
      if (q && q.result && q.result.value) break;
      if (Date.now() - t2 > 30000) throw new Error('appen laddade inte (flaggan på)');
      await vanta(100);
    }
    await vanta(300);
    const r3 = await c.cdp('Runtime.evaluate', { expression: '(' + PROV_FLAGGA.toString() + ')()', awaitPromise: true, returnByValue: true });
    if (r3.exceptionDetails) throw new Error((r3.exceptionDetails.exception || {}).description || r3.exceptionDetails.text);
    ut.rad = ut.rad.concat(r3.result.value.rad);
  } catch (e) { console.error('prov-b: ' + e.message); await c.stang(); srv.close(); process.exit(2); }
  await c.stang(); srv.close();
  if (arg('--rattelse')) fs.writeFileSync(arg('--rattelse'), JSON.stringify(ut.sparad));
  if (arg('--kontext') && ut.kontext) fs.writeFileSync(arg('--kontext'), Buffer.from(ut.kontext.split(',')[1], 'base64'));
  let fel = 0;
  for (const [namn, okk, detalj] of ut.rad) { if (!okk) fel++; console.log(`${okk ? 'OK ' : 'FEL'}  ${namn}${detalj ? '  (' + String(detalj).slice(0, 200) + ')' : ''}`); }
  console.log('minnet: ' + JSON.stringify(ut.minne));
  console.log(`\nprov-b: ${ut.rad.length - fel} OK, ${fel} FEL`);
  process.exit(fel ? 1 : 0);
})();

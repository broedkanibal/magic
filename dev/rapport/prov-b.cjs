/* Problemrapporten B (MES-366): provet i huvudlös Chrome, utan nät och utan Claude.

   Kör:  node dev/rapport/prov-b.cjs [--fil index.html] [--rattelse ut.json]

   1. Ringbufferten: 30 minuter stillbilder i accelererad takt (ett steg var
      150 ms, en händelse var femte sekund) på en slät bild — taket på 300
      bilder håller — och 10 minuter på brus — taket i bytes håller.
      Händelsebilderna tas mellan tidsbilderna. Beskärningarna: 50 spår ger
      högst 40.
   2. Rapporten tar bilderna med (A:s väg, Rapport.stillbilder): index.json
      och bilderna under <kod>/bilder/, raden "Sending pictures, N of M" på
      telefonen medan de går upp — med inställningen AV.
   3. De tysta rättelserna på datorn, genom appens egna vägar (applyPick,
      removeAt, namngePend): av → ingen rad och ingen fil; på → en rad med
      kalla 'rattelse', beskarning.jpg (telefonens, eller datorns egen kopia
      när telefonen inte har den) och rattelse.json i kontraktets form; av
      igen → slutar direkt.
   4. Växeln i Developer-lådan läser och skriver inställningen.

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
  Moln.rapportFil = async (mapp, namn, blob) => { if (A.seg) await vanta(A.seg); A.filer[mapp + '/' + namn] = blob; };
  Moln.rapportUppdatera = async (kod, f) => { A.uppd.push([kod, f]); return true; };
  Moln.rapporterIdag = async () => 0;
  Moln.bildInstallning = async () => A.bildPa;
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

  /* ── 1. Ringbufferten ── */
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
  ok('beskärningarna: 50 spår ger högst 40 och 2,5 MB, den senaste kvar', sb.beskAntal <= 40 && sb.beskBytes <= sb.tak.beskBytes && Stillbilder.besk.has(1050) && !Stillbilder.besk.has(1001), `${sb.beskAntal} st, ${MB(sb.beskBytes)}`);
  ok('minnet totalt under ~10 MB (bilder + beskärningar)', sb.bytes + sb.beskBytes <= 10 * 1048576, MB(sb.bytes + sb.beskBytes) + (performance.memory ? ', JS-heap max ' + MB(Math.max(r30.maxHeap, r10.maxHeap)) : ''));
  ok('avstängd (STILLBILDER_AV): ingen bild tas', (() => { window.STILLBILDER_AV = true; const f = Stillbilder.stat().tagna; Stillbilder.steg(c, 1e9, [], 360, 203); window.STILLBILDER_AV = false; return Stillbilder.stat().tagna === f && !Stillbilder.ko; })());
  const minne = { slat: { antal: s30.antal, bytes: bytesSlat, kBperBild: +(styckSlat / 1024).toFixed(1), tagna: s30.tagna }, brus: { antal: s10.antal, bytes: s10.bytes }, besk: { antal: sb.beskAntal, bytes: sb.beskBytes }, kodMs: sb.kodMs, stegMs: sb.stegMs };

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
  kameraEnhet = false; kamLage = null;

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
  const bord = [spar(1, 'Llanowar Elves', 0.2, 0.2, 'remsa'), spar(2, 'Forest', 0.42, 0.2, 'modell land'), spar(3, 'Serra Angel', 0.64, 0.2, 'modell+orb'), spar(4, 'Giant Growth', 0.2, 0.5, 'remsa')];
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

  /* PÅ: namnbyte (telefonens beskärning), borttaget (datorns kopia), Name this card. */
  A.bildPa = true;
  await byt(kort('Serra Angel'), 'Shivan Dragon');
  await vantaRader(1);
  const r1 = rattelser()[0];
  let j1 = null; try { j1 = JSON.parse(await A.filer[`u-prov/rapporter/${r1.kod}/rattelse.json`].text()); } catch (e) {}
  const b1 = r1 && A.filer[`u-prov/rapporter/${r1.kod}/beskarning.jpg`];
  ok('PÅ, namnbyte: en rad (kalla rattelse, anvandning null) + beskarning.jpg från telefonen + rattelse.json',
     r1 && r1.kalla === 'rattelse' && r1.anvandning === undefined && b1 && b1.type === 'image/jpeg' && b1.size > 1000 && j1 && j1.handelse === 'namnbyte' && j1.gissning === 'Serra Angel' && j1.ratt === 'Shivan Dragon' && j1.varfor === 'modell+orb' && j1.spelkod === 'PROVB1' && j1.spar === 3 && j1.bild === 'telefon' && j1.t > 0,
     JSON.stringify(j1));
  ok('kontraktet med D: rattelse.json har gissning, varfor, ratt, spelkod, t, spar, handelse', j1 && ['gissning', 'varfor', 'ratt', 'spelkod', 't', 'spar', 'handelse'].every(k => k in j1));
  ok('raden får bilder = klar', A.uppd.some(u => u[0] === r1.kod && u[1].bilder === 'klar'));
  const forest = kort('Forest'); removeAt(mig.cards.indexOf(forest));
  await vantaRader(2);
  const r2 = rattelser()[1];
  let j2 = null; try { j2 = JSON.parse(await A.filer[`u-prov/rapporter/${r2.kod}/rattelse.json`].text()); } catch (e) {}
  ok('PÅ, borttaget: telefonen har ingen beskärning → datorns kopia (granskningens), ratt null', j2 && j2.handelse === 'borttaget' && j2.gissning === 'Forest' && j2.ratt === null && j2.bild === 'dator' && A.filer[`u-prov/rapporter/${r2.kod}/beskarning.jpg`], JSON.stringify(j2));
  const q = { id: 'pend-b1', spar: 5, cands: [{ name: 'Grizzly Bears', sid: null }, { name: 'Runeclaw Bear' }], box: null };
  mig.pending.push(q);
  namngePend(mig, q, 'Runeclaw Bear', null, [{ name: 'Runeclaw Bear' }]);
  await vantaRader(3);
  const r3 = rattelser()[2];
  let j3 = null; try { j3 = JSON.parse(await A.filer[`u-prov/rapporter/${r3.kod}/rattelse.json`].text()); } catch (e) {}
  ok('PÅ, Name this card: gissningen ur förslagen, rätt namn, ingen bild någonstans → bilder saknas', j3 && j3.handelse === 'name_this_card' && j3.gissning === 'Grizzly Bears' && j3.ratt === 'Runeclaw Bear' && j3.bild === null && A.uppd.some(u => u[0] === r3.kod && u[1].bilder === 'saknas'), JSON.stringify(j3));

  /* AV igen: slutar direkt. */
  A.bildPa = false;
  const forr = A.rader.length, filer0 = Object.keys(A.filer).length;
  await byt(kort('Giant Growth'), 'Titanic Growth');
  await vanta(300);
  ok('AV igen: nästa rättelse sparar ingenting', A.rader.length === forr && Object.keys(A.filer).length === filer0);
  ok('ingen rättelse frågar Claude (inga anrop mot /api)', !Lada.utdrag().some(e => e.slag === 'claude'));

  /* ── 4. Växeln ── */
  const box = document.getElementById('pbBilder');
  A.bildPa = false; await window.lasBildVaxel();
  const av1 = box.checked === false && /Nothing is kept/.test(document.getElementById('pbBilderTxt').textContent);
  box.checked = true; box.dispatchEvent(new Event('change'));
  for (let i = 0; i < 50 && !A.satt.length; i++) await vanta(10);
  await vanta(50);
  ok('växeln: läser av, skriver på (improve_pictures), och visar "On since …"', av1 && A.satt[0] === true && A.bildPa === true && box.checked && /On since 13 Oct 2026/.test(document.getElementById('pbBilderTxt').textContent), document.getElementById('pbBilderTxt').textContent);

  const sparad = { rad: r1, rattelse: j1, beskarning: b1 ? await new Promise(res => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b1); }) : null };
  return { rad, minne, sparad };
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
    const r = await c.cdp('Runtime.evaluate', { expression: '(' + PROV.toString() + ')()', awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text);
    ut = r.result.value;
  } catch (e) { console.error('prov-b: ' + e.message); await c.stang(); srv.close(); process.exit(2); }
  await c.stang(); srv.close();
  if (arg('--rattelse')) fs.writeFileSync(arg('--rattelse'), JSON.stringify(ut.sparad));
  let fel = 0;
  for (const [namn, okk, detalj] of ut.rad) { if (!okk) fel++; console.log(`${okk ? 'OK ' : 'FEL'}  ${namn}${detalj ? '  (' + String(detalj).slice(0, 200) + ')' : ''}`); }
  console.log('minnet: ' + JSON.stringify(ut.minne));
  console.log(`\nprov-b: ${ut.rad.length - fel} OK, ${fel} FEL`);
  process.exit(fel ? 1 : 0);
})();

/* Rättelserna av handlingar (MES-385): provet i huvudlös Chrome, utan nät och utan Claude.

   Kör:  node dev/rapport/prov-handlingar.cjs [--fil index.html]

   1. kort_handelser: ett parti i Mirror my table med fyra kamerakort, och
      spelarens rättelser genom appens egna vägar — tappa (Tapped by hand),
      Undo i toasten, Follow camera, flytten för hand (visaHandToast) och
      To the graveyard (flyttaTill). Varje rättelse blir en rad (tap_hand,
      angrad, folj_kameran, flytt_hand, grav_hand) med kortet, namnet och
      rapport { spar, tappad, kamTap, … }, i en egen skrivning skild från
      namnens rader. Ett tap som mattan och kameran är överens om är ingen
      rättelse. Två tap av samma kort blir två rader.
   2. Den tysta rättelsen: inställningen AV → ingen rad i rapporter; PÅ →
      EN rad (kalla 'rattelse', vy.handelse 'handling', bilder 'saknas') för
      rättelserna tätt efter varandra, och rapport.json.gz i rapportens form:
      telefonens bord och mattans ändringar, inga klick och ingen bild.
   3. Hela vägen till ett fall: paketet → hamta.cjs --fil → till-fall.cjs
      --mattest --lokal (i en tillfällig mapp, MESA_FALL_UT): facit har
      spelarens tap av Forest och Serra Angel till graveyard, och Undo:t av
      Llanowar Elves är struket (kameran hade rätt).

   Supabase och kanalen är en attrapp i sidan. Inget här frågar Claude.
   Slutkod 0 = allt OK, 1 = något FEL, 2 = gick inte att köra. */
'use strict';
const { spawn, spawnSync } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os'), http = require('http'), zlib = require('zlib');
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
  if (!fs.existsSync(CHROME)) { console.error('prov-handlingar: hittar inte Chrome (sätt CHROME=…)'); process.exit(2); }
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-handlingar-'));
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

const PROV = async () => {
  const rad = [], ok = (namn, villkor, detalj) => rad.push([namn, !!villkor, detalj || '']);
  const vanta = ms => new Promise(r => setTimeout(r, ms));
  /* ── Attrappen ── */
  const A = { rader: [], filer: {}, uppd: [], kh: [], bildPa: false };
  let nr = 0;
  Moln.inloggad = () => true;
  Moln.minId = () => 'u-prov';
  Moln.rapportRad = async r => { const kod = 'R-' + String(++nr).padStart(4, '0'); A.rader.push(Object.assign({ kod }, JSON.parse(JSON.stringify(r)))); return { kod, sokvag: 'u-prov/rapporter/' + kod }; };
  Moln.rapportFil = async (mapp, namn, blob) => { A.filer[mapp + '/' + namn] = blob; };
  Moln.rapportUppdatera = async (kod, f) => { A.uppd.push([kod, f]); return true; };
  Moln.bildInstallning = async () => A.bildPa;
  Moln.loggaKortHandelser = async r => { A.kh.push(JSON.parse(JSON.stringify(r))); return true; };
  Moln.sandKam = () => true;
  Mix.track = () => {};

  /* ── Partiet: Mirror my table, fyra kamerakort ── */
  Stillbilder.glom(); Rattelse.glom();
  visaVy('app');
  const mig = player();
  spelLage = { id: '6b1f0a52-0000-4000-8000-000000000385', kod: 'PROVH1', namn: 'Prov H', vard: mig.id, mig: mig.id };
  mig.lage = 'bord'; mig.cards = []; mig.pending = []; mig.plats = 1;
  state.players = [mig]; state.active = mig.id;
  oppSatt({ klar: true });
  kamAnsluten = true; kamFas = ''; kamGrund = 0; prefs.autoLage = true;
  renderAll(true);
  const spar = (id, namn, x, y) => ({ id, tillstand: 'klar', namn, saker: true, x, y, w: 0.08, h: 0.11, tappad: false, vilar: true, varfor: 'remsa' });
  const bord = [spar(1, 'Llanowar Elves', 0.2, 0.2), spar(2, 'Forest', 0.42, 0.2), spar(3, 'Serra Angel', 0.64, 0.2), spar(4, 'Giant Growth', 0.2, 0.5)];
  const skicka = () => kamTogsEmot({ typ: 'bord', av: 'u-prov', fran: 'kamera', spar: bord, fas: '' });
  skicka(); await vanta(1200);
  for (let i = 0; i < 4; i++) { skicka(); await vanta(250); }   // bordsloggen får några rader, kamerans tap-dom sätts
  const kort = n => mig.cards.find(k => k.name === n);
  const idx = n => hand().indexOf(kort(n));
  ok('partiet: fyra kamerakort på mattan, kameran säger upprätt (kamTap 0)', ['Llanowar Elves', 'Forest', 'Serra Angel', 'Giant Growth'].every(n => kort(n) && kort(n).spar != null && kort(n).kamTap === 0),
     mig.cards.map(k => `${k.name}:${k.spar}:${k.kamTap}`).join(', '));
  /* Ett klick före varje rättelse, som i spelet: lådan gissar då att mattans ändring var spelarens (av 'spelare'). */
  const klick = () => document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const khNu = () => { khSkicka(); return A.kh.flat(); };
  const handl = () => khNu().filter(r => KH_HANDLING.has(r.typ));

  /* ── 1. kort_handelser ── inställningen AV: bara raderna, ingen tyst rättelse */
  A.bildPa = false;
  klick(); tappa(idx('Forest')); await vanta(100);
  const h1 = handl();
  ok('tap för hand mot kameran: en rad tap_hand med kortet, namnet och rapport { spar, tappad 1, kamTap 0 }',
     h1.length === 1 && h1[0].typ === 'tap_hand' && h1[0].namn === 'Forest' && h1[0].kort && h1[0].rapport && h1[0].rapport.spar === 2 && h1[0].rapport.tappad === 1 && h1[0].rapport.kamTap === 0 && h1[0].lage === 'bord',
     JSON.stringify(h1));
  const skrivningar = A.kh.map(b => [...new Set(b.map(r => KH_HANDLING.has(r.typ) ? 'h' : 'n'))].join(''));
  ok('handlingarnas rader skrivs för sig, aldrig i samma skrivning som namnens', skrivningar.every(s => s === 'h' || s === 'n') && skrivningar.includes('h'), JSON.stringify(skrivningar));
  /* Undo i toasten: kameran hade rätt. */
  klick(); tappa(idx('Llanowar Elves')); await vanta(100);
  const angra = document.querySelector('#handToast .htangra');
  klick(); if (angra) angra.click(); await vanta(100);
  const h2 = handl();
  ok('Undo i toasten: angrad { av: tap } för kortet, och kortet står upp igen', !!angra && h2.some(r => r.typ === 'angrad' && r.namn === 'Llanowar Elves' && r.rapport.av === 'tap') && !kort('Llanowar Elves').tapped,
     JSON.stringify(h2.map(r => [r.typ, r.namn, r.rapport && r.rapport.av])));
  /* Follow camera efter ett andra tap av samma kort: två tap_hand för Llanowar Elves (varje gång loggas). */
  klick(); tappa(idx('Llanowar Elves')); await vanta(100);
  klick(); foljKameran(idx('Llanowar Elves')); await vanta(100);
  const h3 = handl();
  ok('samma kort tappat två gånger ger två tap_hand (inte en gång per kort som namnen)', h3.filter(r => r.typ === 'tap_hand' && r.namn === 'Llanowar Elves').length === 2);
  ok('Follow camera: folj_kameran { av: tap }, och kortet tar kamerans läge', h3.some(r => r.typ === 'folj_kameran' && r.namn === 'Llanowar Elves' && r.rapport.av === 'tap') && !kort('Llanowar Elves').tapped);
  /* Ett tap som gör mattan och kameran överens är ingen rättelse: Forest tillbaka upp. */
  const n0 = handl().length;
  klick(); tappa(idx('Forest')); await vanta(100);
  ok('ett tap som gör mattan och kameran överens igen loggas inte', handl().length === n0, JSON.stringify(handl().slice(n0)));
  klick(); tappa(idx('Forest')); await vanta(100);   // Forest vriden igen: spelarens tap gäller
  /* Flytten för hand (samma väg som efter ett släpp: c.hand + visaHandToast). */
  const gg = kort('Giant Growth'), fore = JSON.stringify(mig.cards);
  gg.x = (gg.x || 0) + 300; gg.hand = handSnap(gg.kam);
  klick(); visaHandToast(fore, [gg.cid]); await vanta(100);
  ok('flytten för hand: flytt_hand med mattans nya läge', handl().some(r => r.typ === 'flytt_hand' && r.namn === 'Giant Growth' && r.rapport.x != null), JSON.stringify(handl().filter(r => r.typ === 'flytt_hand')));
  /* To the graveyard själv. */
  klick(); flyttaTill(idx('Serra Angel'), ZON_GRAV); await vanta(100);
  ok('To the graveyard för hand: grav_hand { zon: grav }', handl().some(r => r.typ === 'grav_hand' && r.namn === 'Serra Angel' && r.rapport.zon === 'grav'));
  /* Ur graveyard till exile (draget började i högen, som släppet i dndSlapp skickar fraZon): ingen rättelse. */
  const g0 = handl().length;
  const serra = kort('Serra Angel'); delete serra.zon;   // som spawnFromGrave under draget
  klick(); flyttaTill(idx('Serra Angel'), ZON_EXIL, true); await vanta(100);
  ok('en flytt mellan högarna (graveyard → exile) säger inte emot kameran: ingen grav_hand', handl().length === g0 && zonAv(serra) === ZON_EXIL, JSON.stringify(handl().slice(g0)));
  Rattelse.skickaHandlingar(); await vanta(300);
  ok('inställningen AV: ingen tyst rättelse, ingen fil', A.rader.length === 0 && !Object.keys(A.filer).length, JSON.stringify(Rattelse.stat()));

  /* ── 2. Den tysta rättelsen, inställningen PÅ ── */
  A.bildPa = true;
  klick(); tappa(idx('Giant Growth')); await vanta(100);
  klick(); tappa(idx('Giant Growth')); await vanta(100);   // tillbaka: överens med kameran, ingen ny rad
  ok('PÅ: inget skickas förrän rättelserna stannat (samlas)', A.rader.length === 0 && Rattelse.stat().samlar >= 1, JSON.stringify(Rattelse.stat()));
  for (let i = 0; i < 2; i++) { skicka(); await vanta(250); }
  await Rattelse.skickaHandlingar();
  for (let i = 0; i < 100 && !A.uppd.length; i++) await vanta(20);
  const r = A.rader[0], fil = r && A.filer[`u-prov/rapporter/${r.kod}/rapport.json.gz`];
  ok('PÅ: EN rad (kalla rattelse, vy.handelse handling, bilder saknas) och rapport.json.gz', A.rader.length === 1 && r.kalla === 'rattelse' && r.vy && r.vy.handelse === 'handling' && r.bilder === 'saknas' && !!fil,
     JSON.stringify(r && { kalla: r.kalla, vy: r.vy && { handelse: r.vy.handelse, n: (r.vy.handlingar || []).length }, bilder: r.bilder, filer: Object.keys(A.filer) }));
  let paket = null;
  try { paket = JSON.parse(await new Response(fil.stream().pipeThrough(new DecompressionStream('gzip'))).text()); } catch (e) {}
  ok('paketet: rapportens form, bara mattans ändringar (inga klick), bordsloggen och mattan', paket && paket.kod === r.kod && paket.kalla === 'rattelse' && paket.bordLogg && paket.bordLogg.rader.length > 0
     && Array.isArray(paket.lada) && paket.lada.length > 0 && paket.lada.every(e => e.slag === 'matta') && paket.matta && Array.isArray(paket.matta.mig) && paket.telefon === null && paket.miljo && paket.miljo.spel === 'PROVH1',
     paket ? `bord ${paket.bordLogg.rader.length}, lådan ${paket.lada.length} (${[...new Set(paket.lada.map(e => e.slag))]}), storlek ${fil.size} B` : 'inget paket');
  ok('paketet: ingen bild, inga anrop, inget som frågar Claude', paket && !JSON.stringify(paket).includes('data:image') && !Lada.utdrag().some(e => e.slag === 'claude'));
  ok('raden bär bara rättelserna sedan förra sändningen (vy.handlingar), paketet hela fönstret före', r && r.vy.handlingar.map(h => h.typ + ':' + h.kort).join(',') === 'tap_hand:Giant Growth',
     r && r.vy.handlingar.map(h => h.typ + ':' + h.kort).join(','));
  return { rad, paket };
};

(async () => {
  const srv = await server();
  let c;
  try { c = await chrome(); } catch (e) { console.error('prov-handlingar: ' + e.message); srv.close(); process.exit(2); }
  let ut = null;
  try {
    await c.cdp('Runtime.enable'); await c.cdp('Page.enable'); await c.cdp('Network.enable');
    await c.cdp('Network.setBlockedURLs', { urls: ['*scryfall*', '*supabase*', '*jsdelivr*', '*unpkg*', '*googleapis*', '*gstatic*', '*cdnjs*', '*mixpanel*'] });
    await c.cdp('Page.navigate', { url: `http://127.0.0.1:${srv.address().port}/?debug` });
    const t0 = Date.now();
    for (;;) {
      const q = await c.cdp('Runtime.evaluate', { expression: "document.readyState === 'complete' && typeof Rattelse === 'object' && typeof avstamBord === 'function'", returnByValue: true }).catch(() => null);
      if (q && q.result && q.result.value) break;
      if (Date.now() - t0 > 30000) throw new Error('appen laddade inte');
      await vanta(100);
    }
    await vanta(300);
    const q = await c.cdp('Runtime.evaluate', { expression: '(' + PROV.toString() + ')()', awaitPromise: true, returnByValue: true });
    if (q.exceptionDetails) throw new Error((q.exceptionDetails.exception || {}).description || q.exceptionDetails.text);
    ut = q.result.value;
  } catch (e) { console.error('prov-handlingar: ' + e.message); await c.stang(); srv.close(); process.exit(2); }
  await c.stang(); srv.close();

  /* ── 3. Hela vägen: paketet → hamta.cjs --fil → till-fall.cjs --mattest (tillfällig mapp, rör inte tabellen) ── */
  const rad = ut.rad, ok = (namn, villkor, detalj) => rad.push([namn, !!villkor, detalj || '']);
  if (ut.paket) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-handlingar-fall-'));
    try {
      const pf = path.join(tmp, 'paket.json.gz'), mapp = path.join(tmp, 'rapport');
      fs.mkdirSync(path.join(tmp, 'dev', 'material', 'arbete', 'markning'), { recursive: true });   // som prov-d: utan den vägrar spärren
      fs.writeFileSync(pf, zlib.gzipSync(JSON.stringify(ut.paket)));
      const h = spawnSync(process.execPath, [path.join(__dirname, 'hamta.cjs'), '--fil', pf, '--ut', mapp], { encoding: 'utf8' });
      ok('hamta.cjs --fil: rapport.json, bordlogg.json och LÄS-MIG med rättelserna', h.status === 0 && fs.existsSync(path.join(mapp, 'bordlogg.json')) && /rättelser av handlingar/.test(fs.readFileSync(path.join(mapp, 'LÄS-MIG.md'), 'utf8')), (h.stderr || h.stdout).trim().slice(0, 200));
      const f = spawnSync(process.execPath, [path.join(__dirname, 'till-fall.cjs'), ut.paket.kod, '--mattest', '--mapp', mapp, '--lokal', '--id', 'prov-h1'], { encoding: 'utf8', env: Object.assign({}, process.env, { MESA_FALL_UT: tmp }) });
      let fall = null; try { fall = JSON.parse(fs.readFileSync(path.join(tmp, 'dev', 'mattest', 'underlag', 'rapporter', 'prov-h1', 'fall.json'), 'utf8')); } catch (e) {}
      const har = (typ, kort) => fall && fall.facit.some(x => x.typ === typ && x.kort === kort);
      ok('till-fall --mattest: ett fall med bordsloggen', f.status === 0 && !!fall, (f.stderr || f.stdout).trim().slice(-300));
      ok('facit: spelarens tap av Forest (kameran missade det) och Serra Angel till graveyard', har('tappar', 'Forest') && fall.facit.some(x => x.typ === 'tar_bort' && x.kort === 'Serra Angel'), fall && JSON.stringify(fall.facit));
      ok('facit: Llanowar Elves tap ångrades (Undo, Follow camera) — inget tap kvar för kortet, och det strukna står med skälet', fall && !har('tappar', 'Llanowar Elves') && !har('otappar', 'Llanowar Elves') && fall.struket.some(x => x.kort === 'Llanowar Elves' && /eget tap/.test(x.varfor)),
         fall && JSON.stringify(fall.struket));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  } else ok('hela vägen till ett fall', false, 'inget paket ur steg 2');

  /* byggFacit direkt (granskningen av eefd7bc): ett riktigt untap långt efter spelarens tap är inget Undo. */
  const { byggFacit } = require('./till-fall.cjs');
  const ev = (s, typ) => ({ s, typ, kort: 'Forest', id: 'f1', av: 'spelare' });
  const fa = byggFacit([ev(5, 'tappar'), ev(40, 'otappar')], {});
  ok('facit: spelarens tap vid 5 s och untap vid 40 s (det riktiga kortet vreds tillbaka) står båda kvar', fa.rader.filter(r => !r.stryk).map(r => r.typ).join(',') === 'tappar,otappar', JSON.stringify(fa.rader));
  const fb = byggFacit([ev(5, 'tappar'), ev(40, 'otappar')], { angrade: [{ id: 'f1', s: 40.3 }] });
  ok('facit: samma untap med Follow camera (angrade) ångrar tapet', fb.rader.every(r => r.stryk), JSON.stringify(fb.rader));
  const fc = byggFacit([ev(5, 'tappar'), ev(7, 'otappar')], {});
  ok('facit: untap inom 10 s utan rättelserna (en vanlig rapport) räknas som Undo', fc.rader.every(r => r.stryk), JSON.stringify(fc.rader));

  let fel = 0;
  for (const [namn, okk, detalj] of rad) { if (!okk) fel++; console.log(`${okk ? 'OK ' : 'FEL'}  ${namn}${detalj ? '  (' + String(detalj).slice(0, 300) + ')' : ''}`); }
  console.log(`\nprov-handlingar: ${rad.length - fel} OK, ${fel} FEL`);
  process.exit(fel ? 1 : 0);
})();

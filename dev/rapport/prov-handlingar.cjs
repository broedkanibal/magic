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

   4. Granskningssidan (granska.cjs) mot en attrapp av Supabase: fliken
      Handlingar visar paketet och påståendena ur till-fall.cjs, Mat test
      skriver fallet med samma siffror, Släng sätter slangd.

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

/* Supabase som attrapp för granska.cjs och verktygen den kör (hamta, till-fall, satt): tabellen rapporter med
   PostgRESTs eq/neq/gt/is-filter, kontot och hinken scans — i minnet, på 127.0.0.1. */
function attrappSupabase(tabell, hink) {
  const filtrera = (rader, q) => {
    for (const [k, v] of q) {
      const m = /^(eq|neq|gt|is)\.(.*)$/.exec(v);
      if (!m || ['select', 'order', 'limit'].includes(k)) continue;
      rader = rader.filter(r => { const x = r[k] == null ? null : String(r[k]); return m[1] === 'is' ? (m[2] === 'null') === (x == null) : m[1] === 'eq' ? x === m[2] : m[1] === 'neq' ? x !== m[2] : x != null && x > m[2]; });
    }
    return rader;
  };
  return new Promise(res => {
    const s = http.createServer(async (req, ut) => {
      const u = new URL(req.url, 'http://x'); let kropp = '';
      for await (const c of req) kropp += c;
      const svar = (kod, b, typ) => { ut.writeHead(kod, { 'Content-Type': typ || 'application/json' }); ut.end(typ ? b : JSON.stringify(b)); };
      if (u.pathname === '/rest/v1/rapporter') {
        const rader = filtrera(tabell, u.searchParams);
        if (req.method === 'GET') return svar(200, rader.slice().sort((a, b) => u.searchParams.get('order') === 'created_at.asc' ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at)));
        if (req.method === 'PATCH') { const b = JSON.parse(kropp); for (const r of rader) Object.assign(r, b); return svar(200, rader); }
      }
      if (u.pathname.startsWith('/auth/v1/admin/users/')) return svar(200, { email: 'prov@mesa.test', user_metadata: { full_name: 'Provspelaren' } });
      if (u.pathname === '/storage/v1/object/list/scans') {
        const { prefix } = JSON.parse(kropp);
        return svar(200, Object.keys(hink).filter(f => f.startsWith(prefix) && !f.slice(prefix.length).includes('/')).map(f => ({ name: f.slice(prefix.length), id: f, metadata: { size: hink[f].length } })));
      }
      const m = u.pathname.match(/^\/storage\/v1\/object\/scans\/(.+)$/);
      if (m) { const f = decodeURIComponent(m[1]); return hink[f] ? svar(200, hink[f], 'application/octet-stream') : svar(404, { fel: f }); }
      svar(404, { fel: u.pathname });
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}
const ledigPort = () => new Promise(res => { const s = http.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

/* 4. Granskningssidan (granska.cjs) mot attrappen: fliken Handlingar visar paketet med påståendena ur till-fall.cjs,
   Mat test kör hamta.cjs + till-fall.cjs --mattest och Släng satt.cjs slangd — i en tillfällig mapp
   (MESA_RAPPORTER, MESA_FALL_UT), utan riktiga Supabase. Tre rader: paketet (R1), samma paket i ett annat parti
   (Släng), ett senare paket i R1:s parti utan fil, vars Undo av Forest tar tillbaka R1:s tap, och en slängd rad med
   trasiga rättelser. */
async function provGranska(paket, rattRad, ok) {
  if (!rattRad) return ok('granska: raden ur steg 2', false, 'ingen rad');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-handlingar-granska-'));
  let supa = null, gr = null;
  try {
    fs.mkdirSync(path.join(tmp, 'dev', 'material', 'arbete', 'markning'), { recursive: true });   // spärren vägrar utan den
    const K1 = rattRad.kod, K2 = 'R-9002', K3 = 'R-9003', GID = rattRad.game_id || '6b1f0a52-0000-4000-8000-000000009001';   // game_id: hex, annars inget parti (till-fall parti())
    const t1 = new Date(rattRad.vy.till + 2000).toISOString();
    const forest = paket.spelare.filter(j => j.typ === 'tap_hand' && j.namn === 'Forest').pop();
    const rad = (kod, game_id, created_at, vy) => ({ kod, created_at, user_id: 'u-prov', game_id, kalla: 'rattelse', anvandning: null, bilder: 'saknas', vy, sokvag: 'u-prov/rapporter/' + kod });
    const tabell = [
      rad(K1, GID, t1, rattRad.vy),
      rad(K2, '6b1f0a52-0000-4000-8000-000000009002', new Date(rattRad.vy.till - 600000).toISOString(), rattRad.vy),
      Object.assign(rad('R-9004', GID, new Date(rattRad.vy.till + 90000).toISOString(), { handelse: 'handling', handlingar: [null, 7, { typ: 'tap_hand', t: rattRad.vy.till + 80000, kort: '<img src=x onerror=alert(1)>' }] }), { anvandning: 'slangd' }),   // trasig rad: fäller inte fliken
      rad(K3, GID, new Date(rattRad.vy.till + 60000).toISOString(), { handelse: 'handling', forsta: rattRad.vy.till + 30000, till: rattRad.vy.till + 40000,
        handlingar: [{ typ: 'angrad', t: rattRad.vy.till + 30000, cid: forest.cid, kort: 'Forest', spar: forest.spar, av: 'tap' }] })
    ];
    const gz = zlib.gzipSync(JSON.stringify(paket));
    const hink = { [`u-prov/rapporter/${K1}/rapport.json.gz`]: gz, [`u-prov/rapporter/${K2}/rapport.json.gz`]: gz };
    supa = await attrappSupabase(tabell, hink);
    const port = await ledigPort(), bas = `http://127.0.0.1:${port}`;
    gr = spawn(process.execPath, [path.join(__dirname, 'granska.cjs'), '--port', String(port)], { stdio: ['ignore', 'pipe', 'pipe'],
      env: Object.assign({}, process.env, { SUPABASE_URL: `http://127.0.0.1:${supa.address().port}`, SUPABASE_SERVICE_ROLE_KEY: 'prov', MESA_FALL_UT: tmp, MESA_RAPPORTER: path.join(tmp, 'rapporter') }) });
    let logg = ''; gr.stdout.on('data', d => { logg += d; }); gr.stderr.on('data', d => { logg += d; });
    for (let i = 0; i < 100 && !/Granskningen/.test(logg); i++) await vanta(50);
    const H = async () => (await fetch(bas + '/api/handlingar')).json();
    const sortera = async (kod, val) => (await fetch(bas + '/api/sortera', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: bas }, body: JSON.stringify({ kod, val }) })).json();

    const L = await H(), r1 = L.find(x => x.kod === K1), r2 = L.find(x => x.kod === K2), r3 = L.find(x => x.kod === K3);
    const namn = await (await fetch(bas + '/api/lista')).json();
    ok('granska: fliken Handlingar har de fyra paketen (också en trasig rad), namnlistan inget av dem', L.length === 4 && (L.find(x => x.kod === 'R-9004') || {}).handlingar.length === 1 && !!r1 && !!r2 && !!r3 && Array.isArray(namn) && namn.length === 0, logg.slice(-300) || JSON.stringify(L).slice(0, 300));
    const a = r1 && r1.forhand && r1.forhand.antal;
    ok('granska: R1:s rättelser som spelaren gjorde dem (14, tap_hand … angrad, Serra Angel till graveyard)', r1 && r1.handlingar.length === 14 && r1.handlingar.some(h => h.typ === 'grav_hand' && h.kort === 'Serra Angel' && h.zon === 'grav'), r1 && r1.handlingar.map(h => h.typ + ':' + h.kort).join(','));
    ok('granska: påståendena ur till-fall (forhandMattest) — 8, varav 2 räknas: det senare paketets Undo tar tillbaka Forest', a && a.alla === 8 && a.raknas === 2 && a.tillbaka === 3 && a.osakra === 3 && a.utanSpar === 0 && !r1.forhand.varning
       && r1.forhand.pastaenden.some(p => p.kort === 'Forest' && /^Undo/.test(p.tillbaka || '')), JSON.stringify(a) + ' ' + (r1 && r1.forhand && r1.forhand.varning));
    ok('granska: ett paket i ett annat parti räknas utan den Undo:n (3 räknas), senare paket kontrollerade', r2 && r2.forhand && r2.forhand.antal.raknas === 3 && !r2.forhand.varning, r2 && JSON.stringify(r2.forhand && r2.forhand.antal));
    ok('granska: ett paket utan fil i hinken säger det, och blir inget fall', r3 && !r3.forhand && /gick inte att hämta/.test(r3.fel || ''), r3 && r3.fel);

    const m = await sortera(K1, 'mattest');
    let fall = null; try { fall = JSON.parse(fs.readFileSync(path.join(tmp, 'dev', 'mattest', 'underlag', 'rapporter', K1, 'fall.json'), 'utf8')); } catch (e) {}
    ok('granska: Mat test kör till-fall --mattest — samma siffror som sidan visade, fallet skrivet, raden test', m.ok && m.text.includes(r1.forhand.text) && !!fall && fall.pastaenden.length === 8 && tabell.find(r => r.kod === K1).anvandning === 'test',
       String(m.text).slice(-400));
    const s2 = await sortera(K2, 'slangd');
    ok('granska: Släng kör satt.cjs slangd', s2.ok && tabell.find(r => r.kod === K2).anvandning === 'slangd' && /slangd/.test(s2.text), s2.text);
    const L2 = await H(), e1 = L2.find(x => x.kod === K1);
    ok('granska: efteråt är R1 ett Mat test-fall (slaget ur repot), och sidan visar fallets påståenden utan att räkna om', e1 && e1.anvandning === 'test' && e1.testSlag === 'mattest' && e1.fallFinns
       && e1.forhand && e1.forhand.urFallet && e1.forhand.antal.raknas === 2, JSON.stringify(e1 && { a: e1.anvandning, s: e1.testSlag, f: e1.fallFinns, n: e1.forhand && e1.forhand.antal }));
    const igen = await sortera(K1, 'mattest');
    ok('granska: Mat test en gång till skriver inte över fallet', !igen.ok && /finns redan/.test(igen.text), igen.text);
    const utan = await fetch(bas + '/api/sortera', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kod: K3, val: 'slangd' }) });
    ok('granska: en POST utan sidans Origin vägras', utan.status === 403 && tabell.find(r => r.kod === K3).anvandning === null);
  } catch (e) { ok('granska', false, e.message); }
  finally {
    if (gr) gr.kill(); if (supa) supa.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
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
  const bord = [spar(1, 'Llanowar Elves', 0.2, 0.2), spar(2, 'Forest', 0.42, 0.2), spar(3, 'Serra Angel', 0.64, 0.2), spar(4, 'Giant Growth', 0.2, 0.5), spar(5, 'Shock', 0.42, 0.5), spar(6, 'Plains', 0.64, 0.5), spar(7, 'Mountain', 0.2, 0.8)];
  const skicka = () => kamTogsEmot({ typ: 'bord', av: 'u-prov', fran: 'kamera', spar: bord, fas: '' });
  skicka(); await vanta(1200);
  for (let i = 0; i < 4; i++) { skicka(); await vanta(250); }   // bordsloggen får några rader, kamerans tap-dom sätts
  const kort = n => mig.cards.find(k => k.name === n);
  const idx = n => hand().indexOf(kort(n));
  ok('partiet: sju kamerakort på mattan, kameran säger upprätt (kamTap 0)', ['Llanowar Elves', 'Forest', 'Serra Angel', 'Giant Growth', 'Shock', 'Plains', 'Mountain'].every(n => kort(n) && kort(n).spar != null && kort(n).kamTap === 0),
     mig.cards.map(k => `${k.name}:${k.spar}:${k.kamTap}`).join(', '));
  /* Ett klick före varje rättelse, som i spelet: lådan gissar då att mattans ändring var spelarens (av 'spelare'). */
  const klick = () => document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const khNu = () => { khSkicka(); return A.kh.flat(); };
  const handl = () => khNu().filter(r => KH_HANDLING.has(r.typ));

  /* ── 1. kort_handelser ── inställningen AV: bara raden, ingen tyst rättelse (Mountain, ett eget kort) */
  A.bildPa = false;
  klick(); tappa(idx('Mountain')); await vanta(100);
  Rattelse.skickaHandlingar(); await vanta(300);
  ok('inställningen AV: raden i kort_handelser men ingen tyst rättelse, ingen fil', handl().some(r => r.typ === 'tap_hand' && r.namn === 'Mountain') && A.rader.length === 0 && !Object.keys(A.filer).length, JSON.stringify(Rattelse.stat()));
  A.kh.length = 0;
  klick(); tappa(idx('Forest')); await vanta(100);
  const h1 = handl();
  ok('tap för hand mot kameran: en rad tap_hand med kortet, namnet och rapport { spar, tappad 1, kamTap 0 }',
     h1.length === 1 && h1[0].typ === 'tap_hand' && h1[0].namn === 'Forest' && h1[0].kort && h1[0].rapport && h1[0].rapport.spar === 2 && h1[0].rapport.tappad === 1 && h1[0].rapport.kamTap === 0 && h1[0].lage === 'bord',
     JSON.stringify(h1));
  const skrivningar = A.kh.map(b => [...new Set(b.map(r => KH_HANDLING.has(r.typ) ? 'h' : 'n'))].join(''));
  ok('handlingarnas rader skrivs för sig, aldrig i samma skrivning som namnens', skrivningar.every(s => s === 'h' || s === 'n') && skrivningar.includes('h'), JSON.stringify(skrivningar));
  /* Undo i toasten: kameran hade rätt. */
  klick(); tappa(idx('Llanowar Elves')); await vanta(100);
  const undoKnapp = document.querySelector('#handToast .htangra');
  klick(); if (undoKnapp) undoKnapp.click(); await vanta(100);
  const h2 = handl();
  ok('Undo i toasten: angrad { av: tap } för kortet, och kortet står upp igen', !!undoKnapp && h2.some(r => r.typ === 'angrad' && r.namn === 'Llanowar Elves' && r.rapport.av === 'tap') && !kort('Llanowar Elves').tapped,
     JSON.stringify(h2.map(r => [r.typ, r.namn, r.rapport && r.rapport.av])));
  /* Follow camera efter ett andra tap av samma kort: två tap_hand för Llanowar Elves (varje gång loggas). */
  klick(); tappa(idx('Llanowar Elves')); await vanta(100);
  klick(); foljKameran(idx('Llanowar Elves')); await vanta(100);
  const h3 = handl();
  ok('samma kort tappat två gånger ger två tap_hand (inte en gång per kort som namnen)', h3.filter(r => r.typ === 'tap_hand' && r.namn === 'Llanowar Elves').length === 2);
  ok('Follow camera: folj_kameran { av: tap }, och kortet tar kamerans läge', h3.some(r => r.typ === 'folj_kameran' && r.namn === 'Llanowar Elves' && r.rapport.av === 'tap') && !kort('Llanowar Elves').tapped);
  /* Ett tap som gör mattan och kameran överens igen tar tillbaka spelarens eget tap: angrad { av tap, hur tap }. */
  const n0 = handl().length;
  klick(); tappa(idx('Forest')); await vanta(100);
  const nya0 = handl().slice(n0);
  ok('Forest vriden tillbaka för hand (överens med kameran igen): angrad { av tap, hur tap }, ingen tap_hand', nya0.length === 1 && nya0[0].typ === 'angrad' && nya0[0].namn === 'Forest' && nya0[0].rapport.hur === 'tap', JSON.stringify(nya0));
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
  /* Return to hand (H, menyn): kortet lämnade bordet — grav_hand { zon: hand }. */
  klick(); tillLeken(idx('Shock')); await vanta(100);
  ok('Return to hand för ett kamerakort: grav_hand { zon: hand }', handl().some(r => r.typ === 'grav_hand' && r.namn === 'Shock' && r.rapport.zon === 'hand') && !kort('Shock'), JSON.stringify(handl().filter(r => r.namn === 'Shock')));
  /* ⌘Z efter ett tap för hand: angrad { av: cmdz, efter } med kortets läge efter ⌘Z. */
  klick(); tappa(idx('Plains')); await vanta(100);
  klick(); angra(); await vanta(100);
  const z = handl().filter(r => r.namn === 'Plains');
  ok('⌘Z efter tap för hand: angrad { av: cmdz, efter: { tappad 0, paBord 1 } }, kortet upprätt igen', z.map(r => r.typ).join(',') === 'tap_hand,angrad' && z[1].rapport.av === 'cmdz' && z[1].rapport.efter && z[1].rapport.efter.tappad === 0 && z[1].rapport.efter.paBord === 1 && !kort('Plains').tapped,
     JSON.stringify(z.map(r => [r.typ, r.rapport])));

  /* ── 2. Den tysta rättelsen, inställningen PÅ (läses när paketet skickas: allt sedan Forest blir ett paket) ── */
  A.bildPa = true;
  klick(); tappa(idx('Giant Growth')); await vanta(100);
  klick(); tappa(idx('Giant Growth')); await vanta(100);   // tillbaka: överens med kameran igen (angrad)
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
  const jt = paket && Array.isArray(paket.spelare) ? paket.spelare.map(j => j.typ + ':' + j.namn) : null;
  ok('paketet: spelarens journal (exakt) — varje handling i ordning, med kortets spår', jt && jt.join(',') === 'tap_hand:Mountain,tap_hand:Forest,tap_hand:Llanowar Elves,angrad:Llanowar Elves,tap_hand:Llanowar Elves,folj_kameran:Llanowar Elves,angrad:Forest,tap_hand:Forest,flytt_hand:Giant Growth,grav_hand:Serra Angel,grav_hand:Shock,tap_hand:Plains,angrad:Plains,tap_hand:Giant Growth,angrad:Giant Growth'
     && paket.spelare.every(j => j.spar != null && j.cid && j.t), jt && jt.join(','));
  ok('paketet: ingen bild, inga anrop, inget som frågar Claude', paket && !JSON.stringify(paket).includes('data:image') && !Lada.utdrag().some(e => e.slag === 'claude'));
  const vh = r ? r.vy.handlingar.map(h => h.typ + ':' + h.kort) : [];
  ok('raden bär rättelserna sedan förra sändningen (vy.handlingar: Forest … Giant Growth, inte Mountain) och forsta', vh.length === 14 && vh[0] === 'tap_hand:Forest' && vh[13] === 'angrad:Giant Growth' && !vh.some(x => /Mountain/.test(x)) && r.vy.forsta > 0 && r.vy.agerFran >= r.vy.forsta - 60000 && r.vy.agerFran < r.vy.forsta && r.vy.till >= r.vy.forsta, vh.join(','));
  return { rad, paket, rattRad: r ? { kod: r.kod, game_id: r.game_id || null, vy: r.vy } : null };
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
      ok('till-fall --mattest: ett fall med bordsloggen, facit ur journalen (exakt)', f.status === 0 && !!fall && /journalen \(exakt/.test(fall.facitKalla), (f.stderr || f.stdout).trim().slice(-300));
      const P = (fall && fall.pastaenden) || [], kort = x => `${x.typ}:${x.kort}${x.till ? ':' + x.till : ''}`;
      const raknas = P.filter(x => !x.tillbaka && !x.osaker && !x.ejAvgorbart);
      ok('facit = spelarens påståenden, inga kamerahändelser antas rätta; Mountain (förra paketet) inte med', fall && fall.facit.length === 0 && P.length === 8 && !P.some(x => x.kort === 'Mountain'), fall && JSON.stringify(P.map(x => [x.t, kort(x), x.spar, x.tillbaka || x.osaker || ''])));
      ok('påståendena som räknas: Forest tappad, Serra Angel borta till graveyard, Shock borta till handen — med spåret', raknas.map(kort).join(',') === 'tappad:Forest,borta:Serra Angel:graveyard,borta:Shock:hand' && raknas.every(x => x.spar != null), JSON.stringify(raknas));
      ok('Undo i toasten tar tillbaka Llanowar Elves första tap', P.filter(x => x.kort === 'Llanowar Elves' && /Undo/.test(x.tillbaka || '')).length === 1);
      ok('⌘Z tar tillbaka Plains tap', P.some(x => x.kort === 'Plains' && /⌘Z/.test(x.tillbaka || '')), JSON.stringify(P.filter(x => x.kort === 'Plains')));
      ok('Follow camera (Llanowar) och tap tillbaka för hand (Forest, Giant Growth): osäkra, inget gissat', ['Llanowar Elves', 'Forest', 'Giant Growth'].every(n => P.some(x => x.kort === n && /går inte att skilja/.test(x.osaker || ''))), JSON.stringify(P.filter(x => x.osaker).map(kort)));
      /* Mat test på fallet: uppspelningen hittar korten på spåret (inte "ej avgörbar"), och telefonens bord sa aldrig
         det spelaren rättade — rättelserna hade alltså behövts (visade inte). Fallet läggs i underlag/rapporter en
         stund och tas bort efteråt. */
      const UND = path.join(ROT, 'dev', 'mattest', 'underlag', 'rapporter', 'prov-h1');
      if (fall && !fs.existsSync(UND)) {
        try {
          fs.cpSync(path.join(tmp, 'dev', 'mattest', 'underlag', 'rapporter', 'prov-h1'), UND, { recursive: true });
          const jf = path.join(tmp, 'mt.json');
          const m = spawnSync(process.execPath, [path.join(ROT, 'dev', 'mattest', 'kor.cjs'), '--fall', 'prov-h1', '--json', jf], { encoding: 'utf8' });
          let d = null; try { const J = JSON.parse(fs.readFileSync(jf, 'utf8')); const f0 = (Array.isArray(J) ? J : J.fall || []).find(x => x.id === 'prov-h1'); d = f0 && (f0.detalj || (f0.matt && f0.matt.detalj)); } catch (e) {}
          const som = d && d.pastaenden ? d.pastaenden.filter(x => !x.tillbaka && !x.osaker).map(x => x.som) : null;
          ok('Mat test: de tre påståendena hittar sitt kort på spåret och uppspelningen visade inte läget (0 av 3)', som && som.length === 3 && som.every(x => x === 'visade inte'), som ? JSON.stringify(d.pastaenden.map(x => [kort(x), x.som])) : (m.stderr || m.stdout).slice(-300));
          /* Åt andra hållet: en telefon som såg Forest vridas (spår 2 tappat i bordsloggen från 0,5 s) — uppspelningen
             visar tapet, och rättelsen hade inte behövts. */
          const bf = path.join(UND, 'bordlogg.json.gz'), B = JSON.parse(zlib.gunzipSync(fs.readFileSync(bf)).toString('utf8'));
          for (const r of B.bordLogg) if (r.s >= 0.5) for (const t of r.spar || []) if (t.id === 2) t.tappad = true;
          fs.writeFileSync(bf, zlib.gzipSync(JSON.stringify(B)));
          spawnSync(process.execPath, [path.join(ROT, 'dev', 'mattest', 'kor.cjs'), '--fall', 'prov-h1', '--json', jf], { encoding: 'utf8' });
          let d2 = null; try { const J = JSON.parse(fs.readFileSync(jf, 'utf8')); const f0 = J.fall.find(x => x.id === 'prov-h1'); d2 = f0 && { detalj: f0.detalj, matt: f0.matt }; } catch (e) {}
          const fo = d2 && d2.detalj.pastaenden.find(x => x.kort === 'Forest' && !x.osaker);
          ok('Mat test: en telefon som såg tapet — Forest "visade", 1 av 3 rättelser hade inte behövts', fo && fo.som === 'visade' && d2.matt.pastaendenRatt && d2.matt.pastaendenRatt.n === 1 && d2.matt.pastaendenRatt.av === 3, d2 ? JSON.stringify(d2.matt.pastaendenRatt) + ' ' + JSON.stringify(fo) : 'ingen körning');
        } finally { fs.rmSync(UND, { recursive: true, force: true }); }
      } else ok('Mat test på fallet', !fall ? false : false, fall ? `${UND} finns redan — rör den inte` : 'inget fall');
      await provGranska(ut.paket, ut.rattRad, ok);
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

  /* Påståendena direkt (granskningen av 13363d6). */
  const { pastaendenUrJournalen: pj } = require('./till-fall.cjs');
  const j = (t, typ, rapport, namn) => ({ t: t * 1000, typ, cid: 'a', spar: 9, namn: namn || 'Forest', rapport });
  const status = P => P.map(x => `${x.typ}:${x.tillbaka ? 'tillbaka' : x.osaker ? 'osäker' : 'räknas'}`).join(',');
  const z2 = pj([j(1, 'tap_hand', { tappad: 1 }), j(2, 'grav_hand', { zon: 'grav' }), j(3, 'angrad', { av: 'cmdz', efter: { finns: 1, paBord: 1, tappad: 1 } }), j(4, 'angrad', { av: 'cmdz', efter: { finns: 1, paBord: 1, tappad: 0 } })], 0);
  ok('⌘Z, ⌘Z: tar tillbaka först graveyard, sedan tapet (läget efter varje ⌘Z säger vilket)', status(z2) === 'tappad:tillbaka,borta:tillbaka', status(z2));
  const z3 = pj([j(1, 'bytt', {}, 'Island'), j(2, 'angrad', { av: 'cmdz', efter: { finns: 1, paBord: 1, tappad: 0, namn: 'Island' } })], 0);
  ok('⌘Z som inte motsäger påståendet (Undo på Match lade tillbaka kortet): namnet står kvar', status(z3) === 'namn:räknas', status(z3));
  const z4 = pj([j(1, 'tap_hand', { tappad: 1 }), j(2, 'bytt', {}, 'Island'), j(3, 'angrad', { av: 'tap' })], 0);
  ok('Undo i tap-toasten efter ett namnbyte: tapet tas tillbaka, namnet står kvar', status(z4) === 'tappad:tillbaka,namn:räknas', status(z4));
  const z5 = pj([j(1, 'tap_hand', { tappad: 1 }), j(30, 'tap_hand', { tappad: 1 }, 'Swamp')], 0, 20000);
  ok('ett påstående före paketets första rättelse hör till förra fallet och räknas inte här', z5.length === 1 && z5[0].kort === 'Swamp', JSON.stringify(z5));
  const z6 = pj([j(1, 'tap_hand', { tappad: 1 }), j(30, 'tap_hand', { tappad: 1 }, 'Swamp'), j(40, 'angrad', { av: 'tap' })], 0, null);
  const z7 = pj([j(5, 'tap_hand', { tappad: 1 }), j(50, 'tap_hand', { tappad: 1 }), j(52, 'angrad', { av: 'tap' })], 0, null, 30000);
  ok('en Undo i nästa paket av ett tap i nästa paket rör inte det här paketets tap', status(z7) === 'tappad:räknas', status(z7));
  ok('en senare Undo (ur nästa paket) tar tillbaka påståendet i det här fallet', status(z6) === 'tappad:tillbaka,tappad:räknas' || status(z6) === 'tappad:räknas,tappad:tillbaka', status(z6));

  let fel = 0;
  for (const [namn, okk, detalj] of rad) { if (!okk) fel++; console.log(`${okk ? 'OK ' : 'FEL'}  ${namn}${detalj ? '  (' + String(detalj).slice(0, 300) + ')' : ''}`); }
  console.log(`\nprov-handlingar: ${rad.length - fel} OK, ${fel} FEL`);
  process.exit(fel ? 1 : 0);
})();

/* Rättelserna av handlingar (MES-385): provet i huvudlös Chrome, utan nät och utan Claude.

   Kör:  node dev/rapport/prov-handlingar.cjs [--fil index.html] [--bild ut.jpg]   (--bild: spara en bild per rättelse att titta på)

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
    /* Telefonens bild för Serra Angels påstående (handling-<id>.jpg, id som till-fall.cjs: <cid>-<t>), som hamta.cjs hämtar. */
    const serra = paket.spelare.find(j => j.typ === 'grav_hand' && j.namn === 'Serra Angel');
    const SERRA_ID = serra.id || String(serra.cid).replace(/[^\w]/g, '') + '-' + serra.t, JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 0xff, 0xd9]);
    hink[`u-prov/rapporter/${K1}/handling-${SERRA_ID}.jpg`] = JPEG;
    /* Telefonens handling-bilder.json: Serra Angels bild togs 120 ms efter rättelsen; Shocks saknas, med skälet. */
    const shock = paket.spelare.find(j => j.typ === 'grav_hand' && j.namn === 'Shock');
    const SHOCK_ID = shock && (shock.id || String(shock.cid).replace(/[^\w]/g, '') + '-' + shock.t);
    hink[`u-prov/rapporter/${K1}/handling-bilder.json`] = Buffer.from(JSON.stringify({ v: 1, gransMs: 500, poster: { [SERRA_ID]: { dt: 120, orsak: 'markering' }, [SHOCK_ID]: { dt: -900, skal: 'ingen bild från −100 till +500 ms kring rättelsen (närmaste -900 ms)' } } }));
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
    ok('granska: påståendena ur till-fall (forhandMattest) — 8, varav 2 att bedöma (räknas först när de godkänts): det senare paketets Undo tar tillbaka Forest', a && a.alla === 8 && a.attBedoma === 2 && a.raknas === 0 && a.tillbaka === 3 && a.osakra === 3 && a.utanSpar === 0 && !r1.forhand.varning
       && r1.forhand.pastaenden.some(p => p.kort === 'Forest' && /^Undo/.test(p.tillbaka || '')), JSON.stringify(a) + ' ' + (r1 && r1.forhand && r1.forhand.varning));
    ok('granska: ett paket i ett annat parti räknas utan den Undo:n (3 att bedöma), senare paket kontrollerade', r2 && r2.forhand && r2.forhand.antal.attBedoma === 3 && !r2.forhand.varning, r2 && JSON.stringify(r2.forhand && r2.forhand.antal));
    ok('granska: ett paket utan fil i hinken säger det, och blir inget fall', r3 && !r3.forhand && /gick inte att hämta/.test(r3.fel || ''), r3 && r3.fel);

    /* Godkännandet (Jespers beslut 2026-10-15): bara godkända påståenden räknas, och Mat test körs först när varje
       påstående som kan räknas är bedömt. Tillbakatagna, osäkra och utan spår räknas aldrig och har inget val. */
    const FALL = path.join(tmp, 'dev', 'mattest', 'underlag', 'rapporter', K1, 'fall.json'), GODK = path.join(tmp, 'rapporter', K1, 'godkant.json');
    const godk = async (kod, id, val) => (await fetch(bas + '/api/godkann', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: bas }, body: JSON.stringify({ kod, id, val }) })).json();
    const P1 = (r1 && r1.forhand && r1.forhand.pastaenden) || [], valb = P1.filter(p => !p.tillbaka && !p.osaker && !p.ejAvgorbart);
    ok('granska: varje påstående har ett id (<cid>-<t>) ur till-fall, och de två som kan räknas är Serra Angel och Shock', P1.length === 8 && P1.every(p => /^[\w.-]+-\d+$/.test(p.id || '')) && valb.map(p => p.kort).join(',') === 'Serra Angel,Shock',
       JSON.stringify(P1.map(p => [p.kort, p.id])));
    const m0 = await sortera(K1, 'mattest');
    ok('granska: Mat test vägras medan ett påstående väntar på Godkänn eller Kasta — inget skrivet, raden orörd', !m0.ok && /väntar på Godkänn/.test(m0.text) && !fs.existsSync(FALL) && tabell.find(r => r.kod === K1).anvandning === null, m0.text);
    const tb = P1.find(p => p.tillbaka), g0 = tb ? await godk(K1, tb.id, 'godkand') : { ok: true };
    const gx = await godk(K1, 'finns-inte-1', 'godkand'), gy = valb[0] ? await godk(K1, valb[0].id, 'kanske') : { ok: true };
    ok('granska: ett tillbakataget påstående, ett okänt id och ett okänt val vägras', !g0.ok && !gx.ok && !gy.ok && !fs.existsSync(GODK), [g0.text, gx.text, gy.text].join(' | '));
    /* Båda kastade: inget godkänt, så Mat test vägras (fallet skulle mäta 0 av 0). Sedan godkänns Serra Angel. */
    const g2 = valb[1] ? await godk(K1, valb[1].id, 'kastad') : {}, gk = valb[0] ? await godk(K1, valb[0].id, 'kastad') : {};
    const mk = await sortera(K1, 'mattest');
    ok('granska: allt kastat — Mat test vägras (inget godkänt), inget skrivet', gk.ok && gk.forhand && gk.forhand.antal.kastade === 2 && gk.forhand.antal.raknas === 0 && !mk.ok && /inget godkänt/.test(mk.text) && !fs.existsSync(FALL), mk.text);
    const g1 = valb[0] ? await godk(K1, valb[0].id, 'godkand') : {};
    ok('granska: efter Godkänn räknar till-fall om (forhandMattest läser godkant.json): 1 godkänd, 1 kastad, 0 väntar', g1.ok && g1.forhand && g1.forhand.antal.raknas === 1 && g1.forhand.antal.kastade === 1 && g1.forhand.antal.ejGodkanda === 0,
       JSON.stringify(g1.forhand && g1.forhand.antal));
    let G = null; try { G = JSON.parse(fs.readFileSync(GODK, 'utf8')); } catch (e) {}
    ok('granska: Godkänn och Kasta skrivs i godkant.json i rättelsens mapp', g1.ok && g2.ok && G && G[valb[0].id] === 'godkand' && G[valb[1].id] === 'kastad' && Object.keys(G).length === 2, JSON.stringify(G));
    const bildUt = await fetch(bas + `/api/handlingsbild/${K1}/godkant.json`), bildUpp = await fetch(bas + `/api/handlingsbild/${K1}/rapport.json`);   // båda finns i mappen
    const ps = (g1.forhand && g1.forhand.pastaenden || []).find(p => p.kort === 'Serra Angel'), bildRes = ps && ps.bild ? await fetch(bas + `/api/handlingsbild/${K1}/${encodeURIComponent(ps.bild)}`) : null;
    ok('granska: Serra Angels bild hämtad (hamta) och utlämnad som jpeg; Shock utan bild', ps && ps.bild === `handling-${SERRA_ID}.jpg` && bildRes && bildRes.status === 200 && /jpeg/.test(bildRes.headers.get('content-type'))
       && g1.forhand.antal.medBild === 1, JSON.stringify(ps && ps.bild) + ' ' + (bildRes && bildRes.status));
    const psh = (g1.forhand && g1.forhand.pastaenden || []).find(p => p.kort === 'Shock');
    ok('granska: bildens avstånd i tid (Serra Angel +120 ms) och skälet där bilden saknas (Shock)', ps && ps.bildDt === 120 && psh && !psh.bild && /−100 till \+500 ms/.test(psh.bildSkal || ''), JSON.stringify([ps && ps.bildDt, psh && psh.bildSkal]));
    ok('granska: bildvägen lämnar bara ut handling-<id>.jpg, inte mappens andra filer', fs.existsSync(GODK) && bildUt.status === 404 && bildUpp.status === 404);
    const gUtan = await fetch(bas + '/api/godkann', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kod: K1, id: valb[1].id, val: 'godkand' }) });
    ok('granska: Godkänn utan sidans Origin vägras', gUtan.status === 403 && JSON.parse(fs.readFileSync(GODK, 'utf8'))[valb[1].id] === 'kastad');
    const r1b = (await H()).find(x => x.kod === K1);
    const m = await sortera(K1, 'mattest');
    let fall = null; try { fall = JSON.parse(fs.readFileSync(FALL, 'utf8')); } catch (e) {}
    const ejG = fall ? fall.pastaenden.filter(p => p.ejGodkand || p.kastad).map(p => p.kort + (p.kastad ? ':kastad' : ':ejGodkand')) : null;
    ok('granska: Mat test kör till-fall --mattest — samma siffror som sidan visade, bara det godkända räknas, raden test', m.ok && r1b && m.text.includes(r1b.forhand.text) && /1 godkända räknas/.test(m.text)
       && !!fall && fall.pastaenden.length === 8 && ejG.join(',') === 'Shock:kastad' && tabell.find(r => r.kod === K1).anvandning === 'test', String(m.text).slice(-400) + ' ' + JSON.stringify(ejG));
    const g3 = await godk(K1, valb[1].id, 'godkand');
    ok('granska: godkännandet går inte att ändra när fallet är skrivet', !g3.ok && /redan skrivet/.test(g3.text), g3.text);
    const s2 = await sortera(K2, 'slangd');
    ok('granska: Släng kör satt.cjs slangd', s2.ok && tabell.find(r => r.kod === K2).anvandning === 'slangd' && /slangd/.test(s2.text), s2.text);
    const r2p = r2 && r2.forhand && r2.forhand.pastaenden.find(p => !p.tillbaka && !p.osaker && !p.ejAvgorbart), g4 = r2p ? await godk(K2, r2p.id, 'godkand') : { ok: true };
    ok('granska: en slängd rad (utan fall) går inte att godkänna', !g4.ok && /redan slangd/.test(g4.text) && !fs.existsSync(path.join(tmp, 'rapporter', K2, 'godkant.json')), g4.text);
    const L2 = await H(), e1 = L2.find(x => x.kod === K1);
    ok('granska: efteråt är R1 ett Mat test-fall (slaget ur repot), och sidan visar fallets påståenden utan att räkna om', e1 && e1.anvandning === 'test' && e1.testSlag === 'mattest' && e1.fallFinns
       && e1.forhand && e1.forhand.urFallet && e1.forhand.antal.raknas === 1 && e1.forhand.antal.kastade === 1, JSON.stringify(e1 && { a: e1.anvandning, s: e1.testSlag, f: e1.fallFinns, n: e1.forhand && e1.forhand.antal }));
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
  /* Kanalen: datorn och telefonen är samma sida (som prov-b). */
  A.kanal = [];
  Moln.sandKam = (typ, data) => {
    const m = Object.assign({ typ }, data || {});
    A.kanal.push(m);
    if (typ === 'rapport_handling_markera' || typ === 'rapport_handling_bilder') setTimeout(() => Rapport.telefonKommando(m), 5);
    if (typ === 'rapport_handling_bilder_klar') setTimeout(() => Rapport.datorTagEmot(m), 5);
    return true;
  };
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
  /* Telefonens ring: en bild av bordet var 250 ms (ringen tar en varannan sekund plus vid händelser), spåren i
     analysbildens pixlar som Kamera ger dem. */
  const duk = document.createElement('canvas'); duk.width = 360; duk.height = 203;
  const dx = duk.getContext('2d'); dx.fillStyle = '#244'; dx.fillRect(0, 0, 360, 203); dx.fillStyle = '#e8dcc0';
  for (const t of bord) dx.fillRect(t.x * 360, t.y * 203, t.w * 360, t.h * 203);
  const ringSpar = () => bord.map(t => ({ id: t.id, namn: t.namn, saker: true, tillstand: 'klar', tappad: false, vilaX: t.x * 360, vilaY: t.y * 203, box: { x: t.x * 360, y: t.y * 203, w: t.w * 360, h: t.h * 203 } }));
  const ringTimer = setInterval(() => { try { Stillbilder.steg(duk, Date.now(), ringSpar(), 360, 203); } catch (e) {} }, 250);
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
  for (let i = 0; i < 300 && !A.uppd.some(u => u[1].bilder); i++) await vanta(20);
  clearInterval(ringTimer);
  const r = A.rader[0], fil = r && A.filer[`u-prov/rapporter/${r.kod}/rapport.json.gz`];
  ok('PÅ: EN rad (kalla rattelse, vy.handelse handling, bilder på väg) och rapport.json.gz', A.rader.length === 1 && r.kalla === 'rattelse' && r.vy && r.vy.handelse === 'handling' && r.bilder === null && !!fil,
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
  /* Bilden per rättelse (MES-385): telefonen markerade varje påstående i ögonblicket och laddade upp handling-<id>.jpg
     för de som paketet äger. */
  const bildFiler = Object.keys(A.filer).filter(k => r && k.startsWith(`u-prov/rapporter/${r.kod}/handling-`) && k.endsWith('.jpg'));
  const agda = paket ? paket.spelare.filter(j => ['tap_hand', 'grav_hand', 'borttagen', 'bytt', 'namngiven'].includes(j.typ) && j.t > r.vy.agerFran && j.t <= r.vy.till) : [];
  ok('bild per rättelse: en handling-<id>.jpg för varje påstående paketet äger, raden bilder klar', agda.length === 8 && bildFiler.length === 8 && agda.every(j => bildFiler.some(k => k.endsWith(`handling-${j.id}.jpg`))) && A.uppd.some(u => u[0] === r.kod && u[1].bilder === 'klar'),
     `${bildFiler.length} bilder för ${agda.length} påståenden; ${JSON.stringify(A.uppd.filter(u => u[1].bilder))}`);
  ok('markeringen går till telefonen i ögonblicket (en per påstående med spår)', A.kanal.filter(m => m.typ === 'rapport_handling_markera').length >= 9, String(A.kanal.filter(m => m.typ === 'rapport_handling_markera').length));
  const b0 = bildFiler.length ? A.filer[bildFiler[0]] : null;
  ok('bilden är ett JPEG-utsnitt runt kortet (inte hela bordet)', b0 && b0.type === 'image/jpeg' && b0.size > 500, b0 ? `${b0.size} B` : 'ingen');
  /* Bilden är ögonblicket (Jespers beslut 2026-10-15): telefonen tar en egen bild vid markeringen, och avståndet i tid
     står i handling-bilder.json — 0 till +500 ms, och för varje bild den som togs för just den rättelsen. */
  let bi = null;
  try { bi = JSON.parse(await A.filer[`u-prov/rapporter/${r.kod}/handling-bilder.json`].text()); } catch (e) {}
  const biP = bi && bi.poster ? agda.map(j => bi.poster[j.id]) : [];
  ok('handling-bilder.json: varje bild togs vid markeringen (orsak markering), 0 till +500 ms', bi && bi.gransMs && bi.gransMs.fore === 100 && bi.gransMs.efter === 500 && biP.length === 8 && biP.every(x => x && x.orsak === 'markering' && typeof x.dt === 'number' && x.dt >= 0 && x.dt <= 500),
     JSON.stringify(bi));
  /* Kameran står still (inga analyssteg): ringens senaste bild är äldre än 0,5 s → ingen bild, och skälet. Ingen låda ur
     en annan tid (den gamla 10 s-reserven). */
  await vanta(800);
  Stillbilder.handlingMarkera({ id: 'Stilla-1', spar: 1 });
  await vanta(700);
  const k0 = A.kanal.length;
  await Stillbilder.handlingBilder({ kod: 'R-9385', sokvag: 'u-prov/rapporter/R-9385', poster: [{ id: 'Stilla-1', spar: 1 }] });
  const klar = A.kanal.slice(k0).find(m => m.typ === 'rapport_handling_bilder_klar');
  let bi2 = null;
  try { bi2 = JSON.parse(await A.filer['u-prov/rapporter/R-9385/handling-bilder.json'].text()); } catch (e) {}
  ok('kameran stilla: ingen bild äldre än 0,1 s, skälet i svaret och i handling-bilder.json', klar && klar.antal === 0 && !A.filer['u-prov/rapporter/R-9385/handling-Stilla-1.jpg']
     && klar.saknas.length === 1 && /−100 till \+500 ms/.test(klar.saknas[0].skal) && bi2 && bi2.poster['Stilla-1'] && bi2.poster['Stilla-1'].dt < -500 && /−100 till \+500 ms/.test(bi2.poster['Stilla-1'].skal),
     JSON.stringify({ klar, bi2 }));
  /* En bild 0,3 s FÖRE markeringen (inom de gamla ±0,5 s) godtas inte: den kan visa kortet innan spelaren vred det.
     Ett steg med ett nu långt fram ger en tidsbild; sedan inga steg, så markeringen får ingen egen bild. */
  Stillbilder.steg(duk, Date.now() + 1e9, ringSpar(), 360, 203);
  await vanta(300);
  Stillbilder.handlingMarkera({ id: 'Fore-1', spar: 1 });
  await vanta(700);
  const k1 = A.kanal.length;
  await Stillbilder.handlingBilder({ kod: 'R-9386', sokvag: 'u-prov/rapporter/R-9386', poster: [{ id: 'Fore-1', spar: 1 }] });
  const klar1 = A.kanal.slice(k1).find(m => m.typ === 'rapport_handling_bilder_klar');
  let bi3 = null;
  try { bi3 = JSON.parse(await A.filer['u-prov/rapporter/R-9386/handling-bilder.json'].text()); } catch (e) {}
  const d3 = bi3 && bi3.poster['Fore-1'] && bi3.poster['Fore-1'].dt;
  ok('en bild 0,3 s före rättelsen godtas inte (gränsen −100 ms före, +500 ms efter)', klar1 && klar1.antal === 0 && !A.filer['u-prov/rapporter/R-9386/handling-Fore-1.jpg']
     && typeof d3 === 'number' && d3 < -100 && d3 > -500 && /−100 till \+500 ms/.test(bi3.poster['Fore-1'].skal), JSON.stringify({ klar1, bi3 }));
  const bilder = [];
  for (const k of bildFiler) bilder.push({ namn: k.split('/').pop(), b64: await new Promise(res => { const f = new FileReader(); f.onload = () => res(String(f.result).split(',')[1]); f.readAsDataURL(A.filer[k]); }) });
  return { rad, paket, bilder, bildInfo: bi, rattRad: r ? { kod: r.kod, game_id: r.game_id || null, vy: r.vy } : null };
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
      for (const b of ut.bilder || []) fs.writeFileSync(path.join(mapp, b.namn), Buffer.from(b.b64, 'base64'));   // som hamta.cjs <kod> lägger dem
      if (ut.bildInfo) fs.writeFileSync(path.join(mapp, 'handling-bilder.json'), JSON.stringify(ut.bildInfo));
      ok('hamta.cjs --fil: rapport.json, bordlogg.json och LÄS-MIG med rättelserna', h.status === 0 && fs.existsSync(path.join(mapp, 'bordlogg.json')) && /rättelser av handlingar/.test(fs.readFileSync(path.join(mapp, 'LÄS-MIG.md'), 'utf8')), (h.stderr || h.stdout).trim().slice(0, 200));
      const tillFall = extra => spawnSync(process.execPath, [path.join(__dirname, 'till-fall.cjs'), ut.paket.kod, '--mattest', '--mapp', mapp, '--lokal', '--id', 'prov-h1', '--skriv-over', ...extra], { encoding: 'utf8', env: Object.assign({}, process.env, { MESA_FALL_UT: tmp }) });
      const lasFall = () => { try { return JSON.parse(fs.readFileSync(path.join(tmp, 'dev', 'mattest', 'underlag', 'rapporter', 'prov-h1', 'fall.json'), 'utf8')); } catch (e) { return null; } };
      /* Utan godkännande räknas ingenting. */
      const f0 = tillFall([]), fall0 = lasFall();
      ok('inget godkänt: fallet räknar inga påståenden och säger det (VARNING)', fall0 && /inga godkända påståenden/.test(f0.stdout + f0.stderr) && fall0.pastaenden.every(x => x.tillbaka || x.osaker || x.ejAvgorbart || x.ejGodkand), (f0.stdout + f0.stderr).trim().slice(-300));
      /* Jesper godkänner Forest och Serra Angel (--godkand) och kastar Shock (godkant.json, som granskningssidan skriver). */
      const id = (typ, n) => (fall0 && fall0.pastaenden.find(x => x.kort === n && !x.tillbaka && !x.osaker) || {}).id;
      fs.writeFileSync(path.join(mapp, 'godkant.json'), JSON.stringify({ [id('borta', 'Shock')]: 'kastad' }));
      /* --godkand alla: Shock är kastad i godkant.json och förblir kastad. */
      const fa = tillFall(['--godkand', 'alla']), fallA = lasFall();
      ok('--godkand alla godkänner resten, men ett kastat påstående förblir kastat', fa.status === 0 && fallA && fallA.pastaenden.some(x => x.kort === 'Shock' && x.kastad) && fallA.pastaenden.filter(x => !x.tillbaka && !x.osaker && !x.ejAvgorbart && !x.kastad).every(x => !x.ejGodkand), (fa.stdout + fa.stderr).trim().slice(-200));
      /* En trasig godkant.json: VARNING, inga val därifrån. */
      const gfil = path.join(mapp, 'godkant.json'), gbak = fs.readFileSync(gfil, 'utf8');
      fs.writeFileSync(gfil, '{ trasig');
      const ft = tillFall([]);
      ok('en trasig godkant.json: VARNING, och inget räknas', /godkant\.json gick inte att läsa/.test(ft.stdout + ft.stderr) && /inga godkända påståenden/.test(ft.stdout + ft.stderr), (ft.stdout + ft.stderr).trim().slice(-200));
      fs.writeFileSync(gfil, gbak);
      const f = tillFall(['--godkand', [id('tappad', 'Forest'), id('borta', 'Serra Angel')].join(',')]);
      const fall = lasFall();
      const har = (typ, kort) => fall && fall.facit.some(x => x.typ === typ && x.kort === kort);
      ok('till-fall --mattest: ett fall med bordsloggen, facit ur journalen (exakt)', f.status === 0 && !!fall && /journalen \(exakt/.test(fall.facitKalla), (f.stderr || f.stdout).trim().slice(-300));
      const P = (fall && fall.pastaenden) || [], kort = x => `${x.typ}:${x.kort}${x.till ? ':' + x.till : ''}`;
      const raknas = P.filter(x => !x.tillbaka && !x.osaker && !x.ejAvgorbart && !x.kastad && !x.ejGodkand);
      ok('varje påstående med spår har sin bild (handling-<id>.jpg)', P.length && P.every(x => x.spar == null || x.bild === `handling-${x.id}.jpg`), JSON.stringify(P.map(x => [x.kort, x.bild])));
      ok('fallet bär bildens avstånd i tid (bildDt ur handling-bilder.json), 0 till +500 ms', P.length && P.filter(x => x.bild).every(x => typeof x.bildDt === 'number' && x.bildDt >= 0 && x.bildDt <= 500), JSON.stringify(P.map(x => [x.kort, x.bildDt])));
      ok('godkända räknas, Shock kastad', raknas.map(kort).join(',') === 'tappad:Forest,borta:Serra Angel:graveyard' && P.some(x => x.kort === 'Shock' && x.kastad), JSON.stringify(raknas.map(kort)));
      ok('facit = spelarens påståenden, inga kamerahändelser antas rätta; Mountain (förra paketet) inte med', fall && fall.facit.length === 0 && P.length === 8 && !P.some(x => x.kort === 'Mountain'), fall && JSON.stringify(P.map(x => [x.t, kort(x), x.spar, x.tillbaka || x.osaker || ''])));
      const bedombara = P.filter(x => !x.tillbaka && !x.osaker && !x.ejAvgorbart);
      ok('påståendena att bedöma: Forest tappad, Serra Angel borta till graveyard, Shock borta till handen — med spåret', bedombara.map(kort).join(',') === 'tappad:Forest,borta:Serra Angel:graveyard,borta:Shock:hand' && bedombara.every(x => x.spar != null), JSON.stringify(bedombara));
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
          ok('Mat test: de två godkända hittar sitt kort på spåret och uppspelningen visade inte läget (0 av 2), Shock kastad', som && som.join(',') === 'visade inte,visade inte,kastad', som ? JSON.stringify(d.pastaenden.map(x => [kort(x), x.som])) : (m.stderr || m.stdout).slice(-300));
          /* Åt andra hållet: en telefon som såg Forest vridas (spår 2 tappat i bordsloggen från 0,5 s) — uppspelningen
             visar tapet, och rättelsen hade inte behövts. */
          const bf = path.join(UND, 'bordlogg.json.gz'), B = JSON.parse(zlib.gunzipSync(fs.readFileSync(bf)).toString('utf8'));
          for (const r of B.bordLogg) if (r.s >= 0.5) for (const t of r.spar || []) if (t.id === 2) t.tappad = true;
          fs.writeFileSync(bf, zlib.gzipSync(JSON.stringify(B)));
          spawnSync(process.execPath, [path.join(ROT, 'dev', 'mattest', 'kor.cjs'), '--fall', 'prov-h1', '--json', jf], { encoding: 'utf8' });
          let d2 = null; try { const J = JSON.parse(fs.readFileSync(jf, 'utf8')); const f0 = J.fall.find(x => x.id === 'prov-h1'); d2 = f0 && { detalj: f0.detalj, matt: f0.matt }; } catch (e) {}
          const fo = d2 && d2.detalj.pastaenden.find(x => x.kort === 'Forest' && !x.osaker);
          ok('Mat test: en telefon som såg tapet — Forest "visade", 1 av 2 godkända rättelser hade inte behövts', fo && fo.som === 'visade' && d2.matt.pastaendenRatt && d2.matt.pastaendenRatt.n === 1 && d2.matt.pastaendenRatt.av === 2, d2 ? JSON.stringify(d2.matt.pastaendenRatt) + ' ' + JSON.stringify(fo) : 'ingen körning');
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

  if (arg('--bild') && ut.bilder && ut.bilder[0]) fs.writeFileSync(arg('--bild'), Buffer.from(ut.bilder[0].b64, 'base64'));   // titta på en bild per rättelse
  let fel = 0;
  for (const [namn, okk, detalj] of rad) { if (!okk) fel++; console.log(`${okk ? 'OK ' : 'FEL'}  ${namn}${detalj ? '  (' + String(detalj).slice(0, 300) + ')' : ''}`); }
  console.log(`\nprov-handlingar: ${rad.length - fel} OK, ${fel} FEL`);
  process.exit(fel ? 1 : 0);
})();

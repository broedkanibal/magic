/* Minnet i datan (MES-373): ett parti i Mirror my table på localhost fyller minnet — appens egna vägar, mot en
   riktig Postgres med RLS (PGlite), i huvudlös Chrome, utan nät och utan Claude.

   Kör:  node dev/minnet/prov-parti.mjs [--fil index.html]     (första gången: npm install --prefix dev/minnet)

   Supabase-modulen byts mot dev/minnet/fake-supabase-pg.mjs, som skickar varje fråga till provets server (POST /pg).
   Servern kör den som den inloggade spelaren (rollen authenticated, auth.uid()), så som PostgREST gör: tabellerna,
   policyerna och triggern är migrationens egna.

   1. Spelare A spelar: telefonen lägger fem kort (två Llanowar Elves, Forest, Serra Angel, Shock), spelaren namnger
      ett kort i Name this card, byter Shock till Lightning Bolt och en av två Llanowar Elves till Elvish Mystic
      (Change card). Minnet: telefonens namn säkra men obekräftade, med det högsta antalet; spelarens bekräftade;
      Shock borta, Llanowar Elves kvar (en till ligger kvar); Forest utan antal; inget namnlöst kort.
   2. Create deck: leken väljs för spelet och skrivs in som inläst och bekräftad (kalla inlast); en gammal rad för
      leken som inte längre finns i den försvinner.
   3. Spelare B, i samma parti, läser minnet genom appen (Moln.minnet): bara sina egna rader, inget av A:s.
   4. Utan migrationen (tabellen saknas): partiet går som förut, en rad i konsolen, inga fel.

   Slutkod 0 = allt OK, 1 = något FEL, 2 = gick inte att köra. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { byggDb, som } from './db.mjs';

const HAR = path.dirname(fileURLToPath(import.meta.url)), ROT = path.join(HAR, '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const FIL = path.resolve(arg('--fil', path.join(ROT, 'index.html')));
const FAKE = fs.readFileSync(path.join(HAR, 'fake-supabase-pg.mjs'));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const vanta = ms => new Promise(r => setTimeout(r, ms));

const A = '00000000-0000-4000-8000-00000000000a', B = '00000000-0000-4000-8000-00000000000b';
const G = '00000000-0000-4000-8000-0000000000a1', D = '00000000-0000-4000-8000-0000000000da';

/* ── Databasen ── */
let db = null;
async function nyDb(utanMigration) {
  const d = await byggDb({ utanMigration });
  await d.query(`insert into auth.users (id) values ($1), ($2)`, [A, B]);
  await d.query(`insert into public.games (id, kod, vard, startad) values ($1, 'PROVM1', $2, now())`, [G, A]);
  await d.query(`insert into public.game_players (game_id, user_id, namn, farg, plats, lage) values ($1, $2, 'A', '#f00', 1, 'bord'), ($1, $3, 'B', '#00f', 2, 'bord')`, [G, A, B]);
  await d.query(`insert into public.decks (id, user_id, namn, kort, antal) values ($1, $2, 'Green', $3, 25)`,
    [D, A, JSON.stringify([{ name: 'Llanowar Elves', sid: 'sid-elves', n: 4 }, { name: 'Forest', n: 20 }, { name: 'Naturalize', n: 1, sb: 1 }, { okand: 1, n: 1 }])]);
  if (!utanMigration) {
    await d.query(`insert into public.spelarens_kort (user_id, namn, deck_id, kalla, bekraftad, antal) values ($1, 'Gammalt kort', $2, 'inlast', true, 1)`, [A, D]);
    await d.query(`insert into public.spelarens_kort (user_id, namn, game_id, kalla, bekraftad, antal) values ($1, 'Counterspell', $2, 'telefon', false, 1)`, [B, G]);
  }
  return d;
}

/* PostgRESTs fråga som SQL, körd som spelaren. Bara det Moln använder: select (utan inbäddning), insert, upsert
   (merge-duplicates: on conflict … do update set alla skickade kolumner), update, delete, och filtren eq, neq, in,
   is, lte, gte. Raderna går genom jsonb_populate_recordset, så att typerna blir tabellens. */
const id = s => { if (!/^[a-z_][a-z0-9_]*$/i.test(String(s))) throw new Error('otillåtet namn: ' + s); return '"' + s + '"'; };
async function pg(q) {
  if (!db) return { error: { message: 'ingen databas' } };
  const T = 'public.' + id(q.t), p = [], par = v => { p.push(v); return '$' + p.length; };
  const villkor = (q.f || []).map(([k, o, v]) => o === 'eq' ? `${id(k)} = ${par(v)}` : o === 'neq' ? `${id(k)} <> ${par(v)}` : o === 'in' ? `${id(k)} = any(${par(v)})`
    : o === 'is' ? `${id(k)} is ${v === null ? 'null' : v ? 'true' : 'false'}` : o === 'lte' ? `${id(k)} <= ${par(v)}` : `${id(k)} >= ${par(v)}`);
  const where = villkor.length ? ' where ' + villkor.join(' and ') : '';
  let sql;
  if (q.op === 'select') {
    if (q.cols !== '*' && !/^[\w\s,]+$/.test(q.cols)) return { error: { message: 'inbäddning stöds inte i provet: ' + q.cols } };
    const cols = q.cols === '*' ? '*' : q.cols.split(',').map(c => id(c.trim())).join(', ');
    sql = `select ${cols} from ${T}${where}` + (q.ord ? ` order by ${id(q.ord[0])} ${q.ord[1]}` : '') + (q.lim ? ` limit ${+q.lim}` : '');
  } else if (q.op === 'insert' || q.op === 'upsert') {
    const k = [...new Set(q.rows.flatMap(r => Object.keys(r)))].map(id).join(', ');
    sql = `insert into ${T} (${k}) select ${k} from jsonb_populate_recordset(null::${T}, ${par(JSON.stringify(q.rows))})`;
    if (q.op === 'upsert') sql += ` on conflict (${q.onConflict.split(',').map(c => id(c.trim())).join(', ')}) do update set ` + k.split(', ').map(c => `${c} = excluded.${c}`).join(', ');
    if (q.ret) sql += ' returning *';   // PostgREST: return=minimal utan .select() — då krävs ingen läsrätt (kort_handelser)
  } else if (q.op === 'update') {
    const k = Object.keys(q.val).map(id).join(', ');
    sql = `update ${T} set (${k}) = (select ${k} from jsonb_populate_record(null::${T}, ${par(JSON.stringify(q.val))}))${where} ` + (q.ret ? ' returning *' : '');
  } else if (q.op === 'delete') sql = `delete from ${T}${where}` + (q.ret ? ' returning *' : '');
  else return { error: { message: 'okänt verb ' + q.op } };
  try { const r = await som(db, q.uid, tx => tx.query(sql, p)); return { data: r.rows }; }
  catch (e) { return { error: { code: e.code, message: e.message } }; }
}

function server() {
  return new Promise(res => {
    const s = http.createServer(async (req, ut) => {
      const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (u === '/index.html' || u === '/') { ut.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); return ut.end(fs.readFileSync(FIL)); }
      if (u === '/api/config') { ut.writeHead(200, { 'Content-Type': 'application/json' }); return ut.end(JSON.stringify({ konfigurerad: true, supabaseUrl: 'http://127.0.0.1/sb', supabaseAnonKey: 'prov', build: 'prov-minnet' })); }
      if (u === '/pg' && req.method === 'POST') {
        let kropp = ''; for await (const c of req) kropp += c;
        let svar; try { svar = await pg(JSON.parse(kropp)); } catch (e) { svar = { error: { message: e.message } }; }
        ut.writeHead(200, { 'Content-Type': 'application/json' }); return ut.end(JSON.stringify(svar));
      }
      ut.writeHead(404); ut.end();
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}

async function chrome() {
  if (!fs.existsSync(CHROME)) { console.error('prov-parti: hittar inte Chrome (sätt CHROME=…)'); process.exit(2); }
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-minnet-'));
  const p = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profil, '--no-first-run', '--no-default-browser-check', '--window-size=1400,1000', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
  const cdp = (method, params) => new Promise((res, rej) => { const i = ++nr; svar.set(i, m => m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)); sock.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const stang = async () => { try { await cdp('Browser.close'); } catch (e) {} for (let i = 0; i < 40 && p.exitCode == null; i++) await vanta(50); if (p.exitCode == null) p.kill(); try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {} };
  return { cdp, stang, lyss };
}

/* Partiet i sidan, som prov-handlingar (MES-385): Mirror my table, telefonens bord direkt till kamTogsEmot. */
const PARTI = (gid, mig) => `
  Mix.track = () => {};
  Moln.sandKam = () => true;
  visaVy('app');
  const mig = player();
  spelLage = { id: ${JSON.stringify(gid)}, kod: 'PROVM1', namn: 'Prov minnet', vard: ${JSON.stringify(mig)}, mig: mig.id };
  mig.lage = 'bord'; mig.cards = []; mig.pending = []; mig.plats = 1;
  state.players = [mig]; state.active = mig.id;
  oppSatt({ klar: true });
  kamAnsluten = true; kamFas = ''; kamGrund = 0; prefs.autoLage = true;
  renderAll(true);
  const spar = (id, namn, x, y) => ({ id, tillstand: 'klar', namn, saker: true, x, y, w: 0.08, h: 0.11, tappad: false, vilar: true, varfor: 'remsa' });
  const bord = [spar(1, 'Llanowar Elves', 0.2, 0.2), spar(2, 'Llanowar Elves', 0.42, 0.2), spar(3, 'Forest', 0.64, 0.2), spar(4, 'Serra Angel', 0.2, 0.5), spar(5, 'Shock', 0.42, 0.5)];
  for (let i = 0; i < 4; i++) { kamTogsEmot({ typ: 'bord', av: Moln.minId(), fran: 'kamera', spar: bord, fas: '' }); await new Promise(r => setTimeout(r, 300)); }
  return mig.cards.map(k => k.name + ':' + k.spar).join(', ');`;

(async () => {
  const srv = await server(), bas = `http://127.0.0.1:${srv.address().port}`;
  let c;
  try { db = await nyDb(false); c = await chrome(); } catch (e) { console.error('prov-parti: ' + e.message); srv.close(); process.exit(2); }
  const rad = [], ok = (namn, villkor, detalj) => rad.push([namn, !!villkor, villkor ? '' : (detalj || '')]);
  const konsol = [];
  c.lyss.push(m => {
    if (m.method === 'Runtime.consoleAPICalled') konsol.push(m.params.type + ': ' + m.params.args.map(a => a.value !== undefined ? String(a.value) : a.description || '').join(' '));
    if (m.method === 'Runtime.exceptionThrown') konsol.push('undantag: ' + ((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text));
    if (m.method !== 'Fetch.requestPaused') return;
    const { requestId, request } = m.params;
    if (request.url.startsWith(bas)) c.cdp('Fetch.continueRequest', { requestId }).catch(() => {});
    else if (/@supabase\/supabase-js/.test(request.url)) c.cdp('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: FAKE.toString('base64') }).catch(() => {});
    else c.cdp('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }).catch(() => {});   // inget når Claude, Scryfall eller CDN
  });
  const ev = async (uttryck, ms) => {
    const r = await c.cdp('Runtime.evaluate', { expression: `(async () => { ${uttryck} })()`, awaitPromise: true, returnByValue: true, timeout: ms || 60000 });
    if (r.exceptionDetails) throw new Error(((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text).slice(0, 600));
    return r.result.value;
  };
  let skript = null;
  const ladda = async uid => {
    if (skript) await c.cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: skript }).catch(() => {});
    skript = (await c.cdp('Page.addScriptToEvaluateOnNewDocument', { source: `globalThis.__sbpg = { session: { access_token: 'prov', user: { id: ${JSON.stringify(uid)}, email: 'prov@example.com', user_metadata: { full_name: 'Prov ${uid === A ? 'A' : 'B'}' } } } };` })).identifier;
    await c.cdp('Page.navigate', { url: bas + '/?debug=0' });
    const t0 = Date.now();
    for (;;) {
      const r = await c.cdp('Runtime.evaluate', { expression: "document.readyState === 'complete' && typeof Moln === 'object' && Moln.inloggad() && Moln.minId() === " + JSON.stringify(uid), returnByValue: true }).catch(() => null);
      if (r && r.result && r.result.value) break;
      if (Date.now() - t0 > 30000) throw new Error('appen laddade inte som ' + uid);
      await vanta(100);
    }
    await vanta(500);
  };
  const minne = async (uid, villkor) => (await som(db, uid, tx => tx.query(`select namn, sid, game_id, deck_id, kalla, bekraftad, antal from public.spelarens_kort ${villkor || ''} order by namn`))).rows;

  try {
    await c.cdp('Runtime.enable'); await c.cdp('Page.enable');
    await c.cdp('Fetch.enable', { patterns: [{ urlPattern: '*' }] });

    /* ══ 1. Spelare A spelar ══ */
    await ladda(A);
    const lagt = await ev(PARTI(G, A));
    ok('parti: telefonens fem kort ligger på mattan', /Llanowar Elves:1/.test(lagt) && /Llanowar Elves:2/.test(lagt) && /Shock:5/.test(lagt), lagt);
    /* Name this card: ett kort telefonen inte kunde namnge, som spelaren namnger (namngePend, appens väg). */
    const nt = await ev(`const mig = minSpelare();
      const q = { id: 'pend-prov-1', spar: 9, box: null, rot: 0, cands: [] };
      mig.pending.push(q); khNamnlos(q, { id: 9, alder: 800 });
      khSkicka(); await new Promise(r => setTimeout(r, 400));
      namngePend(mig, q, 'Giant Growth', 'sid-gg', null);
      return mig.cards.filter(k => k.name === 'Giant Growth').length;`);
    ok('parti: Name this card lägger Giant Growth på mattan', nt === 1, String(nt));
    /* Change card: Shock → Lightning Bolt, och en av två Llanowar Elves → Elvish Mystic (applyPick, appens väg). */
    const byt = await ev(`const k = n => minSpelare().cards.find(c => c.name === n);
      SW.target = { kind: 'card', id: k('Shock').cid }; applyPick('Lightning Bolt', 'sid-bolt');
      SW.target = { kind: 'card', id: k('Llanowar Elves').cid }; applyPick('Elvish Mystic', null);
      SW.target = null;
      return minSpelare().cards.map(c => c.name).sort().join(',');`);
    ok('parti: Change card byter Shock och en Llanowar Elves', byt === 'Elvish Mystic,Forest,Giant Growth,Lightning Bolt,Llanowar Elves,Serra Angel', byt);
    /* Ett kort lagt för hand ("Fogg", tillagd) som spelaren byter till Fog: utan spår loggas ingen bytt i kort_handelser,
       men minnet ska bytas ändå. */
    const hand = await ev(`const mig = minSpelare();
      mig.cards.push({ cid: 'hand-prov-1', name: 'Fogg', flipped: 0, tapped: 0 });
      khLogga('tillagd', 'hand-prov-1', { namn: 'Fogg' });
      khSkicka(); await new Promise(r => setTimeout(r, 600));
      SW.target = { kind: 'card', id: 'hand-prov-1' }; applyPick('Fog', 'sid-fog'); SW.target = null;
      return mig.cards.filter(c => c.name === 'Fog').length;`);
    ok('parti: ett kort lagt för hand byter namn (Fogg → Fog)', hand === 1, String(hand));
    await ev(`khSkicka(); await new Promise(r => setTimeout(r, 1500)); return true;`);
    const m = await minne(A, `where game_id = '${G}'`), r = n => m.find(x => x.namn === n);
    ok('minnet: Llanowar Elves från telefonen, säkert men obekräftat, antal 2 (två låg samtidigt), finns kvar efter bytet av den ena', r('Llanowar Elves') && r('Llanowar Elves').kalla === 'telefon' && !r('Llanowar Elves').bekraftad && r('Llanowar Elves').antal === 2, JSON.stringify(r('Llanowar Elves')));
    ok('minnet: Forest (basland) utan antal', r('Forest') && r('Forest').antal === null && r('Forest').kalla === 'telefon', JSON.stringify(r('Forest')));
    ok('minnet: Serra Angel från telefonen', r('Serra Angel') && r('Serra Angel').kalla === 'telefon' && r('Serra Angel').antal === 1, JSON.stringify(r('Serra Angel')));
    ok('minnet: Name this card → Giant Growth, spelarens, bekräftat, med tryckningen', r('Giant Growth') && r('Giant Growth').kalla === 'spelaren' && r('Giant Growth').bekraftad && r('Giant Growth').sid === 'sid-gg', JSON.stringify(r('Giant Growth')));
    ok('minnet: Change card → Lightning Bolt och Elvish Mystic, spelarens, bekräftade', r('Lightning Bolt') && r('Lightning Bolt').bekraftad && r('Lightning Bolt').sid === 'sid-bolt' && r('Elvish Mystic') && r('Elvish Mystic').kalla === 'spelaren', JSON.stringify([r('Lightning Bolt'), r('Elvish Mystic')]));
    ok('minnet: rättelsen ersatte Shock (borta) — inget osäkert eller namnlöst', !r('Shock') && m.length === 7, m.map(x => x.namn).join(','));
    ok('minnet: ett handlagt kort som byter namn ersätter sin rad (Fog bekräftad, Fogg borta)', r('Fog') && r('Fog').bekraftad && r('Fog').sid === 'sid-fog' && !r('Fogg'), m.map(x => x.namn).join(','));
    const kh = (await db.query(`select typ, namn from public.kort_handelser where game_id = $1 and user_id = $2 order by id`, [G, A])).rows;
    ok('korthändelserna skrevs som förut, i samma ögonblick (namn, namnlos, namngiven, bytt)', ['namn', 'namnlos', 'namngiven', 'bytt'].every(t => kh.some(h => h.typ === t)), kh.map(h => h.typ + ':' + h.namn).join(', '));

    /* ══ 2. Create deck ══ */
    const cd = await ev(`$('#vyLeksida').hidden = false;
      leksida.fran = 'app'; leksida.valj = true;
      leksida.yta = Object.assign(leksida.yta || {}, { id: ${JSON.stringify(D)}, stang: async () => {} });
      await stangLeksida({ anvand: true });
      await new Promise(r => setTimeout(r, 1500));
      return minSpelare().lekId;`);
    const dm = await minne(A, `where deck_id = '${D}'`), dr = n => dm.find(x => x.namn === n);
    ok('Create deck: leken valdes för spelet', cd === D, String(cd));
    ok('Create deck: hela leken i minnet som inläst och bekräftad, antalet ur leken, sideboarden med, platshållaren inte',
       dm.length === 3 && dm.every(x => x.kalla === 'inlast' && x.bekraftad && !x.game_id) && dr('Llanowar Elves').antal === 4 && dr('Llanowar Elves').sid === 'sid-elves' && dr('Naturalize').antal === 1 && dr('Forest').antal === null,
       JSON.stringify(dm));
    ok('Create deck: en gammal rad för leken som inte finns i den längre är borta', !dr('Gammalt kort'));

    /* ══ 3. Spelare B läser minnet genom appen ══ */
    await ladda(B);
    const lb = await ev(`return await Moln.minnet();`);
    ok('appen: B (samma parti) läser sitt minne genom Moln.minnet', Array.isArray(lb) && lb.length === 1 && lb[0].namn === 'Counterspell', JSON.stringify(lb));
    /* Moln.minnet filtrerar själv på user_id. Utan filter, som B:s klient kan fråga från konsolen: bara RLS står emellan. */
    const ofilt = await ev(`const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      const { data, error } = await createClient().from('spelarens_kort').select('user_id, namn'); return error ? { fel: error.message } : data;`);
    ok('RLS: B frågar utan filter och får bara sin egen rad — inget av A:s', Array.isArray(ofilt) && ofilt.length === 1 && ofilt[0].user_id === B, JSON.stringify(ofilt));
    await ladda(A);
    const la = await ev(`return await Moln.minnet();`);
    ok('appen: A läser hela sitt minne (sju namn i partiet, tre ur leken)', Array.isArray(la) && la.length === 10 && !la.some(x => x.namn === 'Counterspell'), JSON.stringify(la && la.map(x => x.namn)));

    /* ══ 4. Utan migrationen ══ */
    await db.close(); db = await nyDb(true);
    konsol.length = 0;
    await ladda(A);
    const lagt2 = await ev(PARTI(G, A) + `;`);
    const utan = await ev(`khSkicka(); await new Promise(r => setTimeout(r, 1200));
      await minnetLasIn(${JSON.stringify(D)});
      khLogga('tillagd', 'hand-1', { namn: 'Fog' }); khSkicka(); await new Promise(r => setTimeout(r, 800));
      return { kort: minSpelare().cards.length, minne: await Moln.minnet() };`);
    const varn = konsol.filter(k => /spelarens_kort saknas/.test(k)), undantag = konsol.filter(k => /^undantag|^error/.test(k));
    ok('utan migrationen: partiet går som förut, minnet läses som null, en enda rad i konsolen, inga undantag', /Shock:5/.test(lagt2) && utan.kort === 5 && utan.minne === null && varn.length === 1 && !undantag.length,
       JSON.stringify({ utan, varn, undantag: undantag.slice(0, 3) }));
  } catch (e) { ok('provet', false, e.message + '\n' + konsol.slice(-8).join('\n')); }
  finally { await c.stang(); srv.close(); if (db) await db.close().catch(() => {}); }

  const fel = rad.filter(r => !r[1]);
  for (const [n, v, d] of rad) console.log(`${v ? 'OK ' : 'FEL'}  ${n}${d ? '  — ' + d : ''}`);
  console.log(fel.length ? `\nprov-parti: ${fel.length} av ${rad.length} FEL` : `\nprov-parti: alla ${rad.length} OK`);
  process.exit(fel.length ? 1 : 0);
})();

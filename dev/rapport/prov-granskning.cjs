/* Provet för granskningens beslutslogg och facits förtroende (dev/plan/granskning-skala.md, steg 1–3, i skugga).

   Kör:  node dev/rapport/prov-granskning.cjs

   1. fortroende.cjs bedom(): grön, gul, röd och okänd på syntetiska rättelser — vittnena A–D, motsägelserna (namnet
      bytt igen, en senare läsning med ett annat namn, en hel lek utan namnet), och att ett svar från Claude aldrig är
      ett vittne.
   2. skapaUnderlag(): en tabell som inte svarar ger null (okänt) och felet, aldrig ett nej.
   3. granska-matt.cjs rakna(): förslaget följt, tiden, sorten mot valet och grindarna på en syntetisk logg.
   4. Granskningssidan på riktigt (granska.cjs som server), mot en attrapp av tabellerna och Scryfall i samma process
      och en tillfällig mapp (MESA_RAPPORTER, MESA_FALL_UT): /api/fortroende ger nivåerna; Släng, Träning med ett
      ändrat namn och ett nej före valet — loggen får en rad per verkligt beslut, med förslaget, sorten, tiden,
      namnändringen och nivån; går loggen inte att skriva är valet ändå gjort och svaret säger det.
   Inget nät, ingenting i produktionens tabell, ingenting i repot, inget frågar Claude. Slutkod 0 = allt OK. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), http = require('http'), net = require('net');
const { spawn } = require('child_process');
const ROT = path.join(__dirname, '..', '..');
const { bedom, skapaUnderlag } = require('./fortroende.cjs');
const { rakna, blindaProv } = require('./granska-matt.cjs');

let fel = 0;
const ok = (v, text, det) => { console.log(`${v ? 'OK ' : 'FEL'} ${text}${!v && det ? '  (' + det + ')' : ''}`); if (!v) fel++; };
const t0 = Date.parse('2026-10-15T10:00:00Z'), iso = s => new Date(t0 + s * 1000).toISOString();

/* ── 1. bedom ── */
{
  const kh = [
    { tid: iso(2), kort: 'c1', typ: 'bytt', namn: 'Lightning Bolt', fran: 'Shock' },
    { tid: iso(120), kort: 'c9', typ: 'namn', namn: 'Lightning Bolt', kalla: 'telefon' }
  ];
  const r = { ratt: 'Lightning Bolt', gissning: 'Shock', spar: 7, t: t0, handelse: 'namnbyte', kandidater: [{ namn: 'Shock' }, { namn: 'Lightning Bolt' }] };
  const lek = { namn: ['Lightning Bolt', 'Shock'], hel: false };
  let b = bedom(r, { scry: true, lek, minne: [], kh, senare: [] });
  ok(b.niva === 'gron' && b.vittnen.B.ja && b.vittnen.C.ja && b.vittnen.D.ja && b.kort === 'c1', 'grön: A + leken + kandidaterna + senare läsning', JSON.stringify(b));
  b = bedom(Object.assign({}, r, { kandidater: null }), { scry: true, lek: false, minne: [], kh: kh.slice(0, 1), senare: [] });
  ok(b.niva === 'rod' && b.skal === 'A ensamt' && b.vittnen.C.ja === null, 'röd: bara A (kandidaterna saknas = okänt, inte nej)', JSON.stringify(b));
  b = bedom(r, { scry: true, lek: false, minne: [], kh: kh.slice(0, 1), senare: [] });
  ok(b.niva === 'gul' && b.vittnen.B.ja === false, 'gul: A + ett vittne (kandidaterna); ingen lek och inte i tidigare partier = nej', b.skal);
  b = bedom(r, { scry: true, lek: null, minne: [], kh: kh.slice(0, 1), senare: [] });
  ok(b.niva === 'gul' && b.vittnen.B.ja === null && /gick inte att läsa/.test(b.vittnen.B.skal), 'en lek som inte gick att läsa: B okänt, inte nej (och räknas aldrig som ja)', JSON.stringify(b.vittnen.B));
  b = bedom(r, { scry: true, lek, minne: [], kh: kh.concat([{ tid: iso(60), kort: 'c1', typ: 'bytt', namn: 'Chain Lightning', fran: 'Lightning Bolt' }]), senare: [] });
  ok(b.niva === 'rod' && /bytte namn igen, till Chain Lightning/.test(b.skal), 'röd: spelaren bytte namn på samma kort igen (kort_handelser)', b.skal);
  b = bedom(r, { scry: true, lek, minne: [], kh: kh.concat([{ tid: iso(90), kort: 'c1', typ: 'sent_namn', namn: 'Chain Lightning', kalla: 'telefon' }]), senare: [] });
  ok(b.niva === 'rod' && /läste senare kortet som Chain Lightning/.test(b.skal), 'röd: telefonen läste samma kort senare som ett annat namn', b.skal);
  b = bedom(r, { scry: true, lek: { namn: ['Shock'], hel: true }, minne: [], kh, senare: [] });
  ok(b.niva === 'rod' && /leken är hel/.test(b.skal), 'röd: leken är hel men namnet saknas i den', b.skal);
  b = bedom(r, { scry: true, lek, minne: [], kh: kh.slice(0, 1), senare: [{ kod: 'R-0002', spar: 7, t: t0 + 30000, handelse: 'namnbyte', gissning: 'Lightning Bolt', ratt: 'Chain Lightning' }] });
  ok(b.niva === 'rod' && /R-0002/.test(b.skal), 'röd: en senare rättelse av samma spår bytte bort namnet', b.skal);
  b = bedom(r, { scry: false, lek, minne: [], kh, senare: [] });
  ok(b.niva === 'rod' && /inte hos Scryfall/.test(b.skal), 'röd: namnet finns inte hos Scryfall');
  b = bedom(r, { scry: null, lek, minne: [], kh, senare: [] });
  ok(b.niva === '?', 'okänd: Scryfall svarade inte');
  ok(bedom({ ratt: null, handelse: 'borttaget' }, {}).niva === null, 'inget namn (borttaget): ingen nivå');
  /* Claude är aldrig ett vittne: en senare läsning av Claude (eller ur minnet) räknas inte som D. */
  const khClaude = kh.slice(0, 1).concat([{ tid: iso(120), kort: 'c9', typ: 'namn', namn: 'Lightning Bolt', kalla: 'claude' }, { tid: iso(130), kort: 'c8', typ: 'namn', namn: 'Lightning Bolt', kalla: 'minne' }]);
  b = bedom(Object.assign({}, r, { kandidater: null }), { scry: true, lek: false, minne: [], kh: khClaude, senare: [] });
  ok(b.vittnen.D.ja === false && b.niva === 'rod', 'Claudes och minnets läsningar räknas inte som vittne D', JSON.stringify(b.vittnen.D));
  b = bedom(Object.assign({}, r, { kandidater: null }), { scry: true, lek: false, minne: ['Lightning Bolt'], kh: kh.slice(0, 1), senare: [] });
  ok(b.vittnen.B.ja === true && /tidigare parti/.test(b.vittnen.B.skal), 'B: telefonen läste namnet i ett tidigare parti');
  b = bedom({ ratt: 'Delver of Secrets // Insectile Aberration', t: t0, handelse: 'name_this_card', spar: 3, kandidater: [{ namn: 'Delver of Secrets' }] }, { scry: true, lek: { namn: ['Delver of Secrets'], hel: false }, minne: null, kh: [], senare: [] });
  ok(b.niva === 'gron' && b.vittnen.C.ja && b.vittnen.B.ja === true && b.vittnen.D.ja === false, 'dubbelsidigt kort: framsidan räcker (B och C → grön)', JSON.stringify(b.vittnen));
}

/* ── 2. skapaUnderlag ── */
(async () => {
  {
    let anrop = 0;
    const S = { rest: async (m, v) => { anrop++; if (v.startsWith('kort_handelser')) throw new Error('permission denied for table kort_handelser'); return []; } };
    const U = skapaUnderlag(S);
    const kh = await U.kh('g1', 'u1'), kh2 = await U.kh('g1', 'u1'), lek = await U.lek('g1', 'u1');
    ok(kh === null && kh2 === null && /permission denied/.test(Object.values(U.fel())[0] || '') && lek === false, 'en tabell som inte går att läsa: null (okänt) och felet, inget nej', JSON.stringify(U.fel()));
    ok(anrop === 2, `cachen: samma fråga ställs en gång (${anrop} anrop för kh ×2 + lek utan lek_id)`);
    const S2 = { rest: async (m, v) => { if (v.startsWith('decks')) throw new Error('permission denied for table decks'); return v.startsWith('game_players') ? [{ lek_id: 'l1' }] : []; } };
    ok(await skapaUnderlag(S2).lek('g1', 'u1') === null, 'en lek som finns men inte går att läsa: null (okänd), inte false (ingen lek)');
  }

  /* ── 3. granska-matt rakna ── */
  {
    const rad = (kod, x) => Object.assign({ v: 1, t: iso(0), kod, typ: 'namn', ok: true, val: 'traning', forslagForst: 'traning', forslag: { val: 'traning' }, tid: { ms: 5000 }, namn: { spelarens: 'A', valt: 'A', andrat: false } }, x);
    const L = [
      rad('R-1', { tid: { ms: 4000 }, fortroende: { niva: 'gron' } }),
      rad('R-2', { val: 'test', sort: 'skymt', blint: true, forslagSort: ['skymt', 'litet'], forslagForst: 'traning', forslag: { val: 'test' }, tid: { ms: 8000 }, fortroende: { niva: 'gul' }, namn: { spelarens: 'A', valt: 'B', andrat: true } }),
      rad('R-3', { val: 'test', sort: 'blank', blint: true, forslagSort: ['skymt', 'blank'], forslagForst: 'test', forslag: { val: 'test' }, tid: { ms: 6000 }, fortroende: { niva: 'gron' }, kandidater: { antal: 3, spelarensBland: true, valtBland: true } }),
      rad('R-4', { ok: false, sparr: true, val: 'test' }),
      rad('R-4', { val: 'slangd', forslagForst: 'test', tid: { ms: 2000 } }),
      rad('R-5', { svep: true, tid: { ms: 10 }, fortroende: { niva: 'rod' }, kandidater: { antal: 2, spelarensBland: false, valtBland: false } })
    ];
    const R = rakna(L);
    ok(R.lyckade === 5 && R.nej === 1 && R.svep === 1, `räknar kort, nej och svep (${R.lyckade} kort, ${R.nej} nej, ${R.svep} svep)`);
    ok(R.foljtForst.foljt === 3 && R.foljtForst.av === 5 && R.foljtNu.foljt === 4, `förslaget följt: som när raden visades 3/5, vid trycket 4/5 (${R.foljtForst.foljt}/${R.foljtForst.av}, ${R.foljtNu.foljt}/${R.foljtNu.av})`);
    ok(R.tid.median === 5000 && R.tid.n === 4, `tiden: median utan svepet (${R.tid.median} ms av ${R.tid.n})`);
    ok(R.sort.tot.fall === 2 && R.sort.tot.forst === 1 && R.sort.tot.bland === 2 && /blint läge: 2 av 100/.test(R.sort.grind), `sorten: 1 av 2 först, 2 av 2 bland förslagen; grinden väntar på 100 blinda (${R.sort.grind})`);
    const Rs = rakna(L.concat([rad('R-7', { val: 'test', sort: 'skymt', blint: false, forslagSort: ['skymt'] })]));
    ok(Rs.sort.tot.fall === 2 && Rs.sort.synliga === 1 && blindaProv(L).length === 2, 'ett Prov där gissningen syntes före valet räknas inte i träffen eller bland de blinda', JSON.stringify(Rs.sort));
    ok(R.kandidater.av === 2 && R.kandidater.rattBland === 1, 'rätt namn bland kandidaterna: 1 av 2');
    ok(R.fortroende.granskade === 4 && R.fortroende.andrade === 1 && R.fortroende.nivaer.gul.andrade === 1 && /för få/.test(R.fortroende.grind), `förtroendet: 4 granskade, ändringen bland de gula, grinden väntar (${R.fortroende.grind})`);
    const R2 = rakna(L.concat([rad('R-6', { fortroende: { niva: 'gron' }, namn: { spelarens: 'X', valt: 'Y', andrat: true } })]));
    ok(/^FALLER/.test(R2.fortroende.grind) && /R-6: X → Y/.test(R2.fortroende.grind), 'grinden faller på en namnändring bland de gröna, och säger vilken', R2.fortroende.grind);
  }

  /* ── 4. granskningssidan mot attrappen ── */
  const UT = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-prov-granskning-')), IN = path.join(UT, 'hamtade');
  fs.mkdirSync(path.join(UT, 'dev', 'material', 'arbete', 'markning'), { recursive: true });
  const G = '11111111-1111-1111-1111-111111111111', U1 = '22222222-2222-2222-2222-222222222222';
  const MAN = JSON.parse(fs.readFileSync(path.join(ROT, 'dev', 'embed', 'riktiga', 'manifest.json'), 'utf8'));
  const rattelse = (kod, s, j) => {
    const mapp = path.join(IN, kod); fs.mkdirSync(mapp, { recursive: true });
    fs.copyFileSync(path.join(ROT, 'dev', 'embed', 'riktiga', MAN[0].fil), path.join(mapp, 'beskarning.jpg'));
    const full = Object.assign({ varfor: 'modell+orb', spelkod: 'PROVG', t: t0 + s * 1000, bild: 'telefon', saker: false,
      ruta: { x: 0.4, y: 0.3, w: 0.14, h: 0.33, bild: { w: 360, h: 203 }, kalla: 'beskarning', t: 1 }, maskade: [] }, j);
    fs.writeFileSync(path.join(mapp, 'rattelse.json'), JSON.stringify(full));
    return { kod, created_at: iso(s), user_id: U1, game_id: G, anvandning: null, bilder: 'klar', kalla: 'rattelse', vy: { handelse: j.handelse, gissning: j.gissning, ratt: j.ratt, spar: j.spar } };
  };
  const db = {
    rapporter: [
      rattelse('R-9001', 0, { handelse: 'namnbyte', gissning: 'Shock', ratt: 'Lightning Bolt', spar: 7, kandidater: [{ namn: 'Shock', poang: 0.7, marginal: 0 }, { namn: 'Lightning Bolt', poang: 0.6, marginal: -0.1 }] }),
      rattelse('R-9002', 10, { handelse: 'namnbyte', gissning: 'Opt', ratt: 'Brainstorm', spar: 8, kandidater: [{ namn: 'Brainstorm', poang: 0.5, marginal: 0 }] }),
      rattelse('R-9003', 20, { handelse: 'name_this_card', gissning: 'Opt', ratt: 'Counterspell', spar: 9, kandidater: [{ namn: 'Counterspell', poang: 0.4, marginal: 0 }] }),
      rattelse('R-9004', 30, { handelse: 'borttaget', gissning: 'Forest', ratt: null, spar: 10 }),
      rattelse('R-9005', 40, { handelse: 'namnbyte', gissning: 'Opt', ratt: 'Lightnign Bolt', spar: 11 })
    ],
    kort_handelser: [
      { game_id: G, user_id: U1, tid: iso(2), kort: 'c1', typ: 'bytt', namn: 'Lightning Bolt', fran: 'Shock', kalla: null, rapport: null },
      { game_id: G, user_id: U1, tid: iso(120), kort: 'c9', typ: 'namn', namn: 'Lightning Bolt', fran: null, kalla: 'telefon', rapport: null },
      { game_id: G, user_id: U1, tid: iso(11), kort: 'c2', typ: 'bytt', namn: 'Brainstorm', fran: 'Opt', kalla: null, rapport: null },
      { game_id: G, user_id: U1, tid: iso(60), kort: 'c2', typ: 'bytt', namn: 'Ponder', fran: 'Brainstorm', kalla: null, rapport: null },
      { game_id: G, user_id: U1, tid: iso(21), kort: 'p3', typ: 'namngiven', namn: 'Counterspell', fran: null, kalla: null, rapport: { spar: 9 } },
      { game_id: G, user_id: U1, tid: iso(200), kort: 'c5', typ: 'namn', namn: 'Counterspell', fran: null, kalla: 'claude', rapport: null },
      { game_id: 'annat-parti', user_id: U1, tid: iso(-9000), kort: 'x1', typ: 'namn', namn: 'Counterspell', fran: null, kalla: 'claude', rapport: null }
    ],
    game_players: [{ game_id: G, user_id: U1, lek_id: 'lek-1' }],
    decks: [{ id: 'lek-1', kort: [{ name: 'Lightning Bolt', n: 4 }, { name: 'Shock', n: 4 }] }]
  };
  const SCRY = ['Lightning Bolt', 'Brainstorm', 'Counterspell', 'Shock', 'Opt', 'Ponder', 'Forest'];
  const stub = http.createServer(async (req, res) => {
    let kropp = ''; for await (const c of req) kropp += c;
    const u = new URL(req.url, 'http://x'), send = (k, o) => { res.writeHead(k, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (u.pathname === '/cards/named') { const n = u.searchParams.get('exact'); return SCRY.includes(n) ? send(200, { name: n, image_uris: {} }) : send(404, { object: 'error' }); }
    const m = u.pathname.match(/^\/rest\/v1\/(\w+)$/), T = m && db[m[1]];
    if (!T) return send(404, { message: 'okänd väg ' + u.pathname });
    const filt = [...u.searchParams.entries()].filter(([k]) => !['select', 'order', 'limit'].includes(k));
    const passar = r => filt.every(([k, v]) => {
      const i = v.indexOf('.'), op = v.slice(0, i), x = v.slice(i + 1), f = r[k];
      return op === 'eq' ? String(f) === x : op === 'neq' ? String(f) !== x : op === 'is' ? (x === 'null' ? f == null : false)
        : op === 'in' ? x.replace(/^\(|\)$/g, '').split(',').includes(String(f)) : op === 'gt' ? String(f) > x : false;
    });
    let rader = T.filter(passar);
    if (req.method === 'PATCH') { const p = JSON.parse(kropp || '{}'); rader.forEach(r => Object.assign(r, p)); return send(200, rader); }
    if (req.method !== 'GET') return send(405, { message: req.method });
    const sel = u.searchParams.get('select');
    if (sel && sel !== '*') rader = rader.map(r => Object.fromEntries(sel.split(',').map(k => [k, r[k] === undefined ? null : r[k]])));
    send(200, rader);
  });
  const ledig = () => new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
  await new Promise(r => stub.listen(0, '127.0.0.1', r));
  const SP = stub.address().port, PORT = await ledig();
  const env = Object.assign({}, process.env, { SUPABASE_URL: `http://127.0.0.1:${SP}`, SUPABASE_SERVICE_ROLE_KEY: 'attrapp', MESA_RAPPORTER: IN, MESA_FALL_UT: UT, MESA_SCRYFALL: `http://127.0.0.1:${SP}` });
  delete env.MESA_BESLUT_LOGG;
  const srv = spawn(process.execPath, [path.join(__dirname, 'granska.cjs'), '--port', String(PORT)], { cwd: ROT, env });
  let srvUt = ''; srv.stdout.on('data', d => { srvUt += d; }); srv.stderr.on('data', d => { srvUt += d; });
  const BAS = `http://127.0.0.1:${PORT}`, LOGG = path.join(UT, 'granska-beslut.jsonl');
  try {
    for (let i = 0; i < 100 && !/Granskningen av rättelserna/.test(srvUt); i++) await new Promise(r => setTimeout(r, 50));
    ok(/Granskningen av rättelserna/.test(srvUt), 'granska.cjs startar mot attrappen', srvUt.slice(0, 300));
    const F = await (await fetch(BAS + '/api/fortroende')).json();
    const n = k => F.fortroende && F.fortroende[k] && F.fortroende[k].niva;
    ok(n('R-9001') === 'gron' && n('R-9002') === 'rod' && n('R-9003') === 'gul' && n('R-9004') === null && n('R-9005') === 'rod',
      `/api/fortroende: grön (lek + kandidat + senare läsning), röd (bytt igen), gul (bara kandidaten; Claudes läsningar räknas inte), inget namn, röd (inte hos Scryfall): ${['R-9001', 'R-9002', 'R-9003', 'R-9004', 'R-9005'].map(n).join(', ')}`, JSON.stringify(F).slice(0, 600));
    const post = b => fetch(BAS + '/api/sortera', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BAS }, body: JSON.stringify(b) }).then(r => r.json());
    const loggRader = () => fs.existsSync(LOGG) ? fs.readFileSync(LOGG, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
    /* Släng */
    let bl = await (await fetch(BAS + '/api/blint')).json();
    ok(bl.antal === 0 && bl.mal === 100, `/api/blint utan logg: 0 av 100 (${JSON.stringify(bl)})`);
    let s = await post({ kod: 'R-9001', val: 'slangd', blint: true, forslag: { val: 'traning', varfor: 'Ingen sorts fel vald.', utanSort: true }, forslagForst: 'traning', forslagSort: ['skymt'], matt: { kort: 180, ljus: 120, blank: 0, skarpa: 300, skymt: 0.2 }, tid: { ms: 4200, msSedd: 9000, msRord: 3000 } });
    let L = loggRader(), a = L[0] || {};
    ok(s.ok && !s.loggFel && L.length === 1 && a.kod === 'R-9001' && a.val === 'slangd' && a.forslag.val === 'traning' && a.forslagForst === 'traning' && a.forslagSort[0] === 'skymt'
      && a.matt.skymt === 0.2 && a.tid.ms === 4200 && a.blint === true && a.fortroende.niva === 'gron' && a.fortroende.vittnen.C === true && a.namn.andrat === false && a.parti === G && a.spelare === U1 && a.ok === true,
      'Släng: en rad i loggen (i MESA_FALL_UT) med förslaget, bildens sort och mått, tiden och nivån', JSON.stringify(a));
    ok(db.rapporter.find(r => r.kod === 'R-9001').anvandning === 'slangd', 'valet gick genom satt.cjs till (attrappens) tabell, som förut');
    /* Ett nej före valet är inget beslut: ingen rad. */
    s = await post({ kod: 'R-9003', val: 'test', ratt: 'Counterspell', sort: '' });
    ok(!s.ok && loggRader().length === 1, 'Prov utan sort: nej före valet, ingen rad i loggen', s.text);
    s = await post({ kod: 'R-9003', val: 'traning', ratt: 'Counterspel' });
    ok(!s.ok && /Scryfall/.test(s.text) && loggRader().length === 1, 'ett namn som inte finns hos Scryfall: nej före valet, ingen rad', s.text);
    /* Träning med ett ändrat namn: till-fall.cjs skriver i MESA_FALL_UT, loggen säger att namnet ändrades. */
    s = await post({ kod: 'R-9002', val: 'traning', ratt: 'Ponder', forslag: { val: 'traning', varfor: 'x' }, forslagForst: 'traning', tid: { ms: 7000 } });
    L = loggRader(); a = L[1] || {};
    ok(s.ok && a.kod === 'R-9002' && a.val === 'traning' && a.namn.spelarens === 'Brainstorm' && a.namn.valt === 'Ponder' && a.namn.andrat === true && a.fortroende.niva === 'rod'
      && a.kandidater && a.kandidater.spelarensBland === true && a.kandidater.valtBland === false,
      'Träning med ändrat namn: raden säger Brainstorm → Ponder, nivån (röd) och att spelarens namn fanns bland kandidaterna', (s.text || '').slice(0, 300) + ' ' + JSON.stringify(a));
    ok(fs.existsSync(path.join(UT, 'dev', 'material', 'arbete', 'markning', 'rapporter-traning-mesa', 'R-9002')), 'träningen skrevs i den tillfälliga mappen, inte i repot');
    /* Loggen går inte att skriva: valet är ändå gjort, och svaret säger det. */
    fs.renameSync(LOGG, LOGG + '.spar'); fs.mkdirSync(LOGG);
    s = await post({ kod: 'R-9004', val: 'slangd', tid: { ms: 1000 } });
    fs.rmdirSync(LOGG); fs.renameSync(LOGG + '.spar', LOGG);
    ok(s.ok && /Beslutsloggen gick inte att skriva/.test(s.loggFel || '') && db.rapporter.find(r => r.kod === 'R-9004').anvandning === 'slangd', 'loggen går inte att skriva: valet gjort, svaret säger det', JSON.stringify(s));
    /* Blint läge: servern räknar de blinda Proven ur loggen, med samma funktion som rapporten. */
    const syn = (kod, blint) => JSON.stringify({ v: 1, t: iso(500), kod, typ: 'namn', ok: true, val: 'test', sort: 'skymt', blint, forslagSort: ['skymt'] }) + '\n';
    fs.appendFileSync(LOGG, syn('R-8001', true) + syn('R-8002', false) + syn('R-8003', true));
    bl = await (await fetch(BAS + '/api/blint')).json();
    ok(bl.antal === 2, `/api/blint: två blinda Prov, det synliga räknas inte (${JSON.stringify(bl)})`);
    fs.writeFileSync(LOGG, fs.readFileSync(LOGG, 'utf8').split('\n').filter(l => !/R-800/.test(l)).join('\n'));
    /* Rapporten läser loggen. */
    const { execFileSync } = require('child_process');
    const ut = execFileSync(process.execPath, [path.join(__dirname, 'granska-matt.cjs'), '--fil', LOGG], { encoding: 'utf8' });
    ok(/2 kort beslutade/.test(ut) && /grön \| 0 \|/.test(ut) === false && /röd \| 1 \| 1 \(R-9002: Brainstorm → Ponder\)/.test(ut), 'granska-matt.cjs läser loggen: två beslut, namnändringen bland de röda', ut);
  } catch (e) { ok(false, 'serverdelen kastade: ' + (e && e.stack || e)); }
  finally { srv.kill(); stub.close(); fs.rmSync(UT, { recursive: true, force: true }); }
  console.log(fel ? `prov-granskning: ${fel} FEL` : 'prov-granskning: allt OK');
  process.exit(fel ? 1 : 0);
})();

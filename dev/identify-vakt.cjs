/* ══════════════════════════════════════════════════════════════════
   Provet för vakten framför /api/identify (MES-316).

     node dev/identify-vakt.cjs              allt, mot en låtsad Anthropic (gratis)
     node dev/identify-vakt.cjs --claude     de lyckade frågorna går till den
                                             RIKTIGA Claude med nyckeln ur
                                             .env.local (nio frågor i kameraläget,
                                             runt 1 cent styck)
     node dev/identify-vakt.cjs --vanta      låter servrarna stå kvar efteråt,
                                             för egna curl-anrop

   Vad som är riktigt och vad som är låtsat:
     riktigt   api/identify.js:s default-export (rutten hos Vercel), med en
               adapter för req/res som i dev/stub-server.cjs; api/_vakt.js;
               migrationen supabase/migrations/20261002100000_claude_fragor.sql,
               körd i PGlite (Postgres i WebAssembly) — rpc:n och tabellen är
               alltså samma SQL som Jesper kör i Supabase; curl.
     låtsat    Supabase runt databasen: JWKS, PostgREST (rpc + PATCH) och
               /auth/v1/user, på en lokal port, med en ES256-nyckel som provet
               skapar själv. Produktionens Supabase rörs aldrig: SUPABASE_URL
               pekar på den lokala porten.
               Anthropic, utom med --claude: en server som svarar som
               Messages-API:t (JSON och SSE), eller 529 när provet ber om det.

   PGlite hämtas inte: provet letar efter ett paket som redan finns på
   datorn (PGLITE=<sökväg till pglite/dist/index.js>, annars
   ../pairing-app/node_modules/@electric-sql/pglite). Finns det inte säger
   provet det och slutar med kod 2 — det låtsas aldrig att SQL:en är provad.

   Vad det INTE prövar: att två databasanslutningar samtidigt respekterar
   låset i rpc:n (PGlite kör en fråga i taget), och Vercels egen runtime.

   Slutkod 0 = alla steg OK, 1 = något FEL.
   ══════════════════════════════════════════════════════════════════ */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { execFile } = require('child_process');
const sh = (kmd, env) => new Promise((ok, nej) => execFile('sh', ['-c', kmd], { env: Object.assign({}, process.env, env), encoding: 'utf8', maxBuffer: 1 << 24 }, (e, ut) => e ? nej(e) : ok(ut)));
const { pathToFileURL } = require('url');

const ROT = path.join(__dirname, '..');
const RIKTIG_CLAUDE = process.argv.includes('--claude');
const VANTA = process.argv.includes('--vanta');
const PORT_SB = +(process.env.PORT_SB || 8271), PORT_AN = +(process.env.PORT_AN || 8272), PORT_API = +(process.env.PORT_API || 8273);
const TAK = 3;

function hittaPglite() {
  const kand = [process.env.PGLITE,
    path.join(ROT, '..', 'pairing-app', 'node_modules', '@electric-sql', 'pglite', 'dist', 'index.js'),
    '/Users/jesperfunk/Code/pairing-app/node_modules/@electric-sql/pglite/dist/index.js'].filter(Boolean);
  return kand.find(f => fs.existsSync(f)) || null;
}

let ok = 0, fel = 0;
function prov(namn, villkor, detalj) {
  if (villkor) { ok++; console.log('OK   ' + namn); }
  else { fel++; console.log('FEL  ' + namn + (detalj ? '\n     ' + detalj : '')); }
}

/* ── nycklar och tokens ─────────────────────────────────────────────── */
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const KID = 'prov-' + crypto.randomBytes(4).toString('hex');
const jwk = Object.assign(publicKey.export({ format: 'jwk' }), { kid: KID, alg: 'ES256', use: 'sig' });
const annan = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const HS_HEMLIGHET = crypto.randomBytes(32).toString('hex');
const SB_URL = `http://localhost:${PORT_SB}`;
const b64u = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
function token(last, o = {}) {
  const nu = Math.floor(Date.now() / 1000);
  const p = Object.assign({ iss: SB_URL + '/auth/v1', aud: 'authenticated', role: 'authenticated',
    iat: nu, exp: nu + 3600, is_anonymous: false }, last);
  const alg = o.alg || 'ES256';
  const h = { alg, typ: 'JWT', kid: o.kid === undefined ? KID : o.kid };
  const data = b64u(h) + '.' + b64u(p);
  const sig = alg === 'HS256'
    ? crypto.createHmac('sha256', o.hemlighet || HS_HEMLIGHET).update(data).digest()
    : crypto.sign('sha256', Buffer.from(data), { key: o.nyckel || privateKey, dsaEncoding: 'ieee-p1363' });
  return data + '.' + Buffer.from(sig).toString('base64url');
}
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';
const D = '44444444-4444-4444-8444-444444444444', E = '55555555-5555-4555-8555-555555555555';   // taket per parti (2026-10-09)

/* ── låtsad Supabase runt PGlite ────────────────────────────────────── */
let db, rpcFel = false, authAnrop = 0, jwksNere = false;
const KOLUMNER = ['modell', 'input_tokens', 'output_tokens', 'cache_read', 'cache_write', 'dollar', 'ms', 'status', 'ok', 'spel', 'raknas'];
function lasKropp(req) { return new Promise(r => { let b = ''; req.on('data', c => b += c); req.on('end', () => r(b)); }); }
const supabase = http.createServer(async (req, res) => {
  const u = new URL(req.url, SB_URL);
  const svara = (s, o) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(o === undefined ? '' : JSON.stringify(o)); };
  if (u.pathname === '/auth/v1/.well-known/jwks.json') return jwksNere ? svara(503, { message: 'låtsad hicka' }) : svara(200, { keys: [jwk] });
  if (u.pathname === '/auth/v1/user') {
    authAnrop++;
    const t = String(req.headers.authorization || '').replace(/^Bearer /, '');
    try {
      const [h, p, s] = t.split('.');
      const egen = crypto.createHmac('sha256', HS_HEMLIGHET).update(h + '.' + p).digest('base64url');
      if (egen !== s) return svara(403, { error_code: 'bad_jwt' });
      return svara(200, { id: JSON.parse(Buffer.from(p, 'base64url')).sub, is_anonymous: false });
    } catch (e) { return svara(403, { error_code: 'bad_jwt' }); }
  }
  if (req.headers.apikey !== 'sb_secret_prov') return svara(401, { message: 'fel nyckel' });
  const kropp = await lasKropp(req);
  if (u.pathname === '/rest/v1/rpc/claude_fraga_reservera' && req.method === 'POST') {
    if (rpcFel) return svara(500, { message: 'låtsat databasfel' });
    const b = JSON.parse(kropp);
    try {
      const r = await db.query('select * from public.claude_fraga_reservera($1, $2, $3, $4, $5)', [b.p_user, b.p_tak, b.p_mode, b.p_spel, b.p_tak_parti == null ? null : b.p_tak_parti]);
      return svara(200, r.rows.map(x => Object.assign({}, x, { nollstalls: new Date(x.nollstalls).toISOString() })));
    } catch (e) { return svara(400, { message: e.message }); }
  }
  if (u.pathname === '/rest/v1/claude_fragor' && req.method === 'PATCH') {
    const id = +(u.searchParams.get('id') || '').replace(/^eq\./, '');
    const b = JSON.parse(kropp);
    const k = Object.keys(b).filter(x => KOLUMNER.includes(x));
    if (!k.length || !id) return svara(400, { message: 'inget att uppdatera' });
    await db.query(`update public.claude_fragor set ${k.map((x, i) => `${x} = $${i + 1}`).join(', ')} where id = $${k.length + 1}`, k.map(x => b[x]).concat([id]));
    return svara(204);
  }
  svara(404, { message: 'okänd väg ' + u.pathname });
});

/* ── låtsad Anthropic ───────────────────────────────────────────────── */
let anthropicLage = 'ok', anthropicAnrop = 0;
const anthropic = http.createServer(async (req, res) => {
  const b = JSON.parse(await lasKropp(req) || '{}');
  anthropicAnrop++;
  if (anthropicLage === '529') { res.writeHead(529, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } })); }
  const kamera = /Leken — bara de här namnen/.test(JSON.stringify(b.messages || ''));
  const text = kamera ? '{"kort": [{"namn": "Maul of the Skyclaves", "x": 200, "y": 260, "sakerhet": "hog"}]}' : '{"n": 1, "sakerhet": "hog"}';
  const msg = { id: 'msg_prov', type: 'message', role: 'assistant', model: b.model, content: [{ type: 'text', text }],
    stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1234, output_tokens: 56 } };
  if (!b.stream) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(msg)); }
  res.writeHead(200, { 'Content-Type': 'text/event-stream' });
  const ev = (t, d) => res.write(`event: ${t}\ndata: ${JSON.stringify(Object.assign({ type: t }, d))}\n\n`);
  ev('message_start', { message: Object.assign({}, msg, { content: [], stop_reason: null, usage: { input_tokens: 1234, output_tokens: 1 } }) });
  ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
  ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text } });
  ev('content_block_stop', { index: 0 });
  ev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 56 } });
  ev('message_stop', {});
  res.end();
});

/* ── rutten, som hos Vercel ─────────────────────────────────────────── */
let handler;
const api = http.createServer(async (req, res) => {
  const body = await lasKropp(req);
  req.body = null;
  if (body) { try { req.body = JSON.parse(body); } catch (e) { res.writeHead(400); return res.end('{"error":"trasig JSON"}'); } }
  res.status = c => { res.statusCode = c; return res; };
  res.json = o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return res; };
  res.send = d => { res.end(typeof d === 'string' ? d : JSON.stringify(d)); return res; };
  try { await handler(req, res); }
  catch (e) { console.error('handlern kastade', e); if (!res.headersSent) { res.writeHead(500); res.end('{}'); } }
});

/* curl med tokenen i miljön, så att kommandot som skrivs ut är det som körs. */
async function curl(beskr, args, env = {}) {
  const kmd = ['curl -s -i -m 60', ...args].join(' ');
  const ut = await sh(kmd, env);
  const [huvud, ...rest] = ut.split(/\r?\n\r?\n/);
  const status = +(huvud.match(/^HTTP\/[\d.]+ (\d+)/) || [])[1];
  const kropp = rest.join('\n\n');
  let j = null; try { j = JSON.parse(kropp); } catch (e) {}
  console.log(`\n$ ${kmd}\n  → ${status} ${kropp.slice(0, 400)}`);
  const retry = (huvud.match(/^retry-after:\s*(\d+)/im) || [])[1];
  return { status, j, retry: retry ? +retry : null };
}
const BILD = fs.readFileSync(path.join(ROT, 'dev', 'embed', 'riktiga', '01-01-ai.jpg')).toString('base64');   // Maul of the Skyclaves
const LEK = fs.readFileSync(path.join(ROT, 'dev', 'golden', 'lek.txt'), 'utf8').split('\n')
  .map(r => r.trim()).filter(r => r && !r.startsWith('#')).map(r => r.replace(/^\d+\s+/, ''));
const KROPP = path.join(require('os').tmpdir(), 'identify-vakt-kamera.json');
fs.writeFileSync(KROPP, JSON.stringify({ mode: 'kamera', image: BILD, names: LEK, spel: 'PROV42' }));
const URL_API = `http://localhost:${PORT_API}/api/identify`;
const POST = ['-X POST', URL_API, "-H 'Content-Type: application/json'", `--data @${KROPP}`];
const MED = ['-H "Authorization: Bearer $TOKEN"'];
const rader = async u => (await db.query('select id, mode, modell, input_tokens, output_tokens, dollar, status, ok, spel, raknas from public.claude_fragor where user_id = $1 order by id', [u])).rows;

(async () => {
  const pg = hittaPglite();
  if (!pg) { console.error('identify-vakt: PGlite finns inte på datorn (sätt PGLITE=…/pglite/dist/index.js). SQL:en är INTE provad.'); process.exit(2); }
  const { PGlite } = await import(pathToFileURL(pg).href);
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users (id uuid primary key);
    insert into auth.users values ('${A}'), ('${B}'), ('${C}'), ('${D}'), ('${E}');`);
  await db.exec(fs.readFileSync(path.join(ROT, 'supabase', 'migrations', '20261002100000_claude_fragor.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(ROT, 'supabase', 'migrations', '20261009100000_claude_tak_per_parti.sql'), 'utf8'));

  process.env.SUPABASE_URL = SB_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_prov';
  delete process.env.SUPABASE_JWT_SECRET;
  process.env.CLAUDE_TAK_PER_MANAD = String(TAK);
  process.env.ALLOWED_ORIGINS = 'https://mesa.example';
  if (RIKTIG_CLAUDE) {
    const m = fs.readFileSync(path.join(ROT, '.env.local'), 'utf8').match(/^\s*ANTHROPIC_API_KEY\s*=\s*("?)(.*?)\1\s*$/m);
    if (!m || !m[2]) { console.error('--claude: ingen ANTHROPIC_API_KEY i .env.local (symlänka den i en worktree)'); process.exit(2); }
    process.env.ANTHROPIC_API_KEY = m[2];
    delete process.env.ANTHROPIC_BASE_URL;
  } else {
    process.env.ANTHROPIC_API_KEY = 'prov';
    process.env.ANTHROPIC_BASE_URL = `http://localhost:${PORT_AN}`;
  }
  const mod = await import(pathToFileURL(path.join(ROT, 'api', 'identify.js')).href);
  handler = mod.default;
  await Promise.all([[supabase, PORT_SB], [anthropic, PORT_AN], [api, PORT_API]].map(([s, p]) => new Promise((ok, nej) => s.once('error', nej).listen(p, '127.0.0.1', ok))));
  console.log(`Supabase (låtsad, PGlite) :${PORT_SB} · Anthropic ${RIKTIG_CLAUDE ? 'RIKTIG' : `(låtsad) :${PORT_AN}`} · rutten :${PORT_API} · tak ${TAK} per månad`);

  const TA = token({ sub: A, email: 'a@prov' }), TB = token({ sub: B }), TC = token({ sub: C });

  console.log('\n══ de tre kommandona i MES-316 ══');
  let r = await curl('utan token', POST);
  prov('utan token → 401', r.status === 401 && r.j && r.j.kod === 'inloggning', JSON.stringify(r.j));
  /* Kallstart + Supabase-hicka: nyckelcachen är tom och JWKS svarar inte.
     Då ska svaret vara 503 (tillfälligt), inte 401 "inte inloggad" — och
     nästa fråga ska försöka igen direkt, inte vänta ut 30-sekundersspärren
     (granskningen av MES-316, 2026-10-02: klienten tog 401 som utloggad och
     skickade hela bilden om i 30 s per instans). Den första frågan med giltig
     token är alltså den enda som ser en tom cache. */
  jwksNere = true;
  const foreNere = anthropicAnrop;
  r = await curl('giltig token, JWKS nere, tom cache', POST.concat(MED), { TOKEN: TA });
  jwksNere = false;
  prov('JWKS nere med tom cache → 503 kod inloggning-nere (inte 401), ingen fråga till Anthropic',
    r.status === 503 && r.j && r.j.kod === 'inloggning-nere' && anthropicAnrop === foreNere, `${r.status} ${JSON.stringify(r.j)}`);
  const fore = anthropicAnrop;
  r = await curl('giltig token', POST.concat(MED), { TOKEN: TA });
  prov('giltig token → 200 med svar, direkt efter hickan (ingen 30-sekundersspärr på tom cache)', r.status === 200 && Array.isArray(r.j && r.j.kort) && r.j.kort.length > 0, JSON.stringify(r.j));
  /* Samma sak i vakten ensam, mot en port där ingenting lyssnar — det
     granskaren mätte. En egen modulinstans (?tom-cache), så att cachen är tom. */
  {
    const V = await import(pathToFileURL(path.join(ROT, 'api', '_vakt.js')).href + '?tom-cache');
    const url0 = process.env.SUPABASE_URL;
    process.env.SUPABASE_URL = 'http://127.0.0.1:1';
    const v = await V.verifiera(token({ sub: A, iss: 'http://127.0.0.1:1/auth/v1' }));
    process.env.SUPABASE_URL = url0;
    prov('vakten ensam, tom cache, Supabase onåbar → tillfalligt (503), inte "okänd nyckel"', v.ok === false && v.tillfalligt === true, JSON.stringify(v));
  }
  for (let i = 2; i <= TAK; i++) {
    r = await curl(`fråga ${i}`, POST.concat(MED), { TOKEN: TA });
    prov(`fråga ${i} av ${TAK} → 200`, r.status === 200, JSON.stringify(r.j));
  }
  const fore429 = anthropicAnrop;
  r = await curl(`fråga ${TAK + 1}`, POST.concat(MED), { TOKEN: TA });
  prov(`fråga ${TAK + 1} (över taket) → 429 kod tak`, r.status === 429 && r.j && r.j.kod === 'tak' && r.j.tak === TAK && r.j.antal === TAK && !!r.j.nollstalls, JSON.stringify(r.j));
  prov('429 har Retry-After till månadsskiftet', r.retry > 3600, 'Retry-After ' + r.retry);
  if (!RIKTIG_CLAUDE) prov('över taket når aldrig Anthropic', anthropicAnrop === fore429, `${anthropicAnrop - fore429} anrop`);
  if (!RIKTIG_CLAUDE) prov(`${TAK} lyckade = ${TAK} anrop till Anthropic`, fore429 - fore === TAK, `${fore429 - fore}`);

  console.log('\n══ raderna i claude_fragor för konto A ══');
  const ra = await rader(A);
  for (const x of ra) console.log('  ' + JSON.stringify(x));
  prov(`${TAK} rader, alla räknade, status 200, ok, modell och tokens ifyllda, spelkoden med`,
    ra.length === TAK && ra.every(x => x.raknas && x.status === 200 && x.ok && x.modell && x.input_tokens > 0 && x.output_tokens > 0 && x.mode === 'kamera' && x.spel === 'PROV42'));
  const PRIS_PROV = { 'claude-opus-5': [5, 25], 'claude-sonnet-5': [2, 10] };   // egen kopia: provet ska inte räkna med funktionen det prövar
  prov('dollar ifyllt på varje rad, och lika med tokens × modellens pris',
    ra.every(x => PRIS_PROV[x.modell] && x.dollar != null &&
      Math.abs(+x.dollar - (x.input_tokens * PRIS_PROV[x.modell][0] + x.output_tokens * PRIS_PROV[x.modell][1]) / 1e6) < 1e-9),
    ra.length ? 'rad 1: ' + ra[0].modell + ' ' + ra[0].dollar + ' USD' : '');

  console.log('\n══ fler fall ══');
  r = await curl('annat konto', POST.concat(MED), { TOKEN: TB });
  prov('ett annat konto påverkas inte av A:s tak → 200', r.status === 200);

  const avvisas = [
    ['skräp', 'abc.def.ghi'],
    ['anon-rollen (som anon-nyckeln)', token({ sub: A, role: 'anon', aud: 'anon' })],
    ['utgången', token({ sub: A, exp: Math.floor(Date.now() / 1000) - 120 })],
    ['annat projekt (iss)', token({ sub: A, iss: 'https://annat.supabase.co/auth/v1' })],
    ['anonymt konto', token({ sub: A, is_anonymous: true })],
    ['utan konto-id', token({ sub: 'inte-ett-uuid' })],
    ['okänd nyckel (kid)', token({ sub: A }, { kid: 'finns-inte' })],
    ['rätt kid, fel nyckel', token({ sub: A }, { nyckel: annan.privateKey })],
    ['alg none', b64u({ alg: 'none', typ: 'JWT' }) + '.' + b64u({ sub: A, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 600, iss: SB_URL + '/auth/v1' }) + '.'],
    ['HS256 med fel hemlighet (via /auth/v1/user)', token({ sub: A }, { alg: 'HS256', hemlighet: 'fel', kid: null })]
  ];
  const foreAvv = anthropicAnrop, raderFore = (await db.query('select count(*)::int n from public.claude_fragor')).rows[0].n;
  for (const [namn, t] of avvisas) {
    r = await curl(namn, POST.concat(MED), { TOKEN: t });
    prov(`token: ${namn} → 401`, r.status === 401, `${r.status} ${JSON.stringify(r.j)}`);
  }
  const raderEfter = (await db.query('select count(*)::int n from public.claude_fragor')).rows[0].n;
  prov('avvisade tokens skriver ingen rad och når inte Anthropic', raderEfter === raderFore && anthropicAnrop === foreAvv);

  const authFore = authAnrop;
  r = await curl('HS256 utan hemlighet på servern', POST.concat(MED), { TOKEN: token({ sub: C }, { alg: 'HS256', kid: null }) });
  prov('HS256 utan SUPABASE_JWT_SECRET: Supabase Auth tillfrågas och godkänner → 200', r.status === 200 && authAnrop === authFore + 1);
  process.env.SUPABASE_JWT_SECRET = HS_HEMLIGHET;
  const authFore2 = authAnrop;
  r = await curl('HS256 med hemligheten på servern', POST.concat(MED), { TOKEN: token({ sub: C }, { alg: 'HS256', kid: null }) });
  prov('HS256 med SUPABASE_JWT_SECRET: lokalt, utan Supabase Auth → 200', r.status === 200 && authAnrop === authFore2);
  r = await curl('HS256 med fel hemlighet, hemligheten satt', POST.concat(MED), { TOKEN: token({ sub: C }, { alg: 'HS256', hemlighet: 'fel', kid: null }) });
  prov('HS256 med fel hemlighet → 401', r.status === 401);
  delete process.env.SUPABASE_JWT_SECRET;

  r = await curl('ingen bild', ['-X POST', URL_API, "-H 'Content-Type: application/json'", `-d '{"mode":"kamera"}'`].concat(MED), { TOKEN: TC });
  const cRader = await rader(C);
  prov('trasig fråga → 400, och den tar ingen plats i taket', r.status === 400 && cRader.length === 2, `${r.status}, ${cRader.length} rader`);

  if (!RIKTIG_CLAUDE) {
    anthropicLage = '529';
    const t0 = Date.now();
    r = await curl('Anthropic överbelastad', POST.concat(MED), { TOKEN: TC });
    anthropicLage = 'ok';
    const sista = (await rader(C)).pop();
    prov('Anthropic svarar 529 → 502 till klienten, raden står kvar men räknas inte', r.status === 502 && sista && sista.raknas === false && sista.status === 502 && sista.ok === false,
      `${r.status} ${JSON.stringify(sista)} (${Date.now() - t0} ms med SDK:ns omförsök)`);
    r = await curl('fråga 3 för C', POST.concat(MED), { TOKEN: TC });
    prov('efter 529 finns platsen kvar: C:s tredje räknade fråga → 200', r.status === 200);
    r = await curl('fråga 4 för C', POST.concat(MED), { TOKEN: TC });
    prov('C:s fjärde → 429', r.status === 429 && r.j.kod === 'tak');
  }

  rpcFel = true;
  const foreRpc = anthropicAnrop;
  r = await curl('räknaren nere', POST.concat(MED), { TOKEN: TB });
  rpcFel = false;
  prov('räknaren svarar inte → 503 kod raknare, och ingen fråga till Anthropic', r.status === 503 && r.j.kod === 'raknare' && anthropicAnrop === foreRpc);

  r = await curl('fel ursprung', POST.concat(MED, ["-H 'Origin: https://ond.example'"]), { TOKEN: TB });
  prov('ursprung utanför ALLOWED_ORIGINS → 403 (före inloggningen)', r.status === 403);
  r = await curl('förhandsfråga', ['-X OPTIONS', URL_API, "-H 'Origin: https://mesa.example'", "-H 'Access-Control-Request-Headers: authorization,content-type'"]);
  prov('förhandsfrågan från en tillåten sida släpper igenom Authorization', r.status === 204);
  const hv = await sh(`curl -s -i -X OPTIONS ${URL_API} -H 'Origin: https://mesa.example'`);
  prov('Access-Control-Allow-Headers innehåller Authorization', /access-control-allow-headers:.*authorization/i.test(hv));
  r = await curl('hälsokollen', [URL_API]);
  prov('GET utan token → 200, inloggning: true, takPerManad, takPerParti', r.status === 200 && r.j.inloggning === true && r.j.takPerManad === TAK && r.j.takPerParti === 30 && r.j.ready === true, JSON.stringify(r.j));

  /* Samtidigt: B har en fråga kvar (två räknade). Fem på en gång → en går igenom. */
  const bRakn = (await rader(B)).filter(x => x.raknas).length;
  const kvar = TAK - bRakn;
  const sv = await Promise.all(Array.from({ length: 5 }, () => fetch(URL_API, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TB }, body: fs.readFileSync(KROPP) }).then(x => x.status)));
  console.log(`\n  fem samtidiga för B med ${kvar} kvar: ${sv.join(', ')}`);
  prov(`fem samtidiga frågor med ${kvar} kvar → exakt ${kvar} går igenom`, sv.filter(s => s === 200).length === kvar && sv.filter(s => s === 429).length === 5 - kvar);

  /* Taket per parti (Jespers beslut 2026-10-09): 2 per parti här, 3 per månad som för alla. */
  console.log('\n══ taket per parti ══');
  process.env.CLAUDE_TAK_PER_PARTI = '2';
  const TD = token({ sub: D });
  const kropp = spel => { const f = KROPP + '.' + (spel || 'utan'); fs.writeFileSync(f, JSON.stringify(Object.assign({ mode: 'kamera', image: BILD, names: LEK }, spel ? { spel } : {}))); return f; };
  const postSpel = spel => ['-X POST', URL_API, "-H 'Content-Type: application/json'", `--data @${kropp(spel)}`];
  r = await curl('D, parti P1, fråga 1', postSpel('PARTI1').concat(MED), { TOKEN: TD });
  prov('parti 1, fråga 1 → 200', r.status === 200);
  r = await curl('D, parti P1, fråga 2', postSpel('PARTI1').concat(MED), { TOKEN: TD });
  prov('parti 1, fråga 2 → 200', r.status === 200);
  const forePa = anthropicAnrop;
  r = await curl('D, parti P1, fråga 3', postSpel('PARTI1').concat(MED), { TOKEN: TD });
  prov('parti 1, fråga 3 → 429 kod tak-parti, med taket, antalet och spelkoden', r.status === 429 && r.j && r.j.kod === 'tak-parti' && r.j.tak === 2 && r.j.antal === 2 && r.j.spel === 'PARTI1', JSON.stringify(r.j));
  if (!RIKTIG_CLAUDE) prov('över partiets tak når aldrig Anthropic', anthropicAnrop === forePa);
  prov('över partiets tak skriver ingen rad', (await rader(D)).length === 2);
  r = await curl('D, parti P2', postSpel('PARTI2').concat(MED), { TOKEN: TD });
  prov('ett annat parti har eget tak → 200 (månadens tredje)', r.status === 200);
  r = await curl('D, utan parti', postSpel(null).concat(MED), { TOKEN: TD });
  prov('månaden går före: fjärde frågan → 429 kod tak (inte tak-parti)', r.status === 429 && r.j && r.j.kod === 'tak', JSON.stringify(r.j));
  process.env.CLAUDE_TAK_PER_PARTI = '0';
  r = await curl('E, CLAUDE_TAK_PER_PARTI=0', postSpel('PARTI3').concat(MED), { TOKEN: token({ sub: E }) });
  prov('CLAUDE_TAK_PER_PARTI=0 → inga frågor i ett parti (429 tak-parti)', r.status === 429 && r.j && r.j.kod === 'tak-parti' && r.j.tak === 0, JSON.stringify(r.j));
  {
    const V = await import(pathToFileURL(path.join(ROT, 'api', '_vakt.js')).href);
    process.env.CLAUDE_TAK_PER_PARTI = 'av'; const av = V.takPerParti();
    delete process.env.CLAUDE_TAK_PER_PARTI; const forval = V.takPerParti();
    prov('CLAUDE_TAK_PER_PARTI: "av" = inget tak, tomt = 30', av === null && forval === 30, `${av} ${forval}`);
  }
  {
    /* En server med gammal kod anropar med fyra namngivna argument: den nya funktionen svarar, utan tak per parti. */
    const g = await db.query(`select * from public.claude_fraga_reservera(p_user => '${C}', p_tak => 100, p_mode => 'kamera', p_spel => 'GAMMAL')`);
    prov('gamla anropet med fyra argument når den nya funktionen', g.rows.length === 1 && g.rows[0].ok === true && g.rows[0].parti === 1, JSON.stringify(g.rows[0]));
  }
  for (const f of fs.readdirSync(path.dirname(KROPP))) if (f.startsWith(path.basename(KROPP) + '.')) fs.rmSync(path.join(path.dirname(KROPP), f), { force: true });

  /* dev-verktygens väg: utan inloggning, och utan rad i räknaren */
  const foreDev = (await db.query('select count(*)::int n from public.claude_fragor')).rows[0].n;
  const devRes = await new Promise(resolve => {
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.statusCode = c; return this; },
      json(o) { resolve({ status: this.statusCode, j: o }); return this; }, end() { resolve({ status: this.statusCode }); return this; } };
    mod.identifiera({ method: 'POST', headers: { host: 'localhost' }, body: JSON.parse(fs.readFileSync(KROPP, 'utf8')) }, res);
  });
  const efterDev = (await db.query('select count(*)::int n from public.claude_fragor')).rows[0].n;
  prov('identifiera (stubben, lekgolden): svarar utan token och skriver ingen rad', devRes.status === 200 && efterDev === foreDev, JSON.stringify(devRes).slice(0, 200));

  console.log(`\n${ok} OK, ${fel} FEL`);
  fs.rmSync(KROPP, { force: true });
  if (VANTA) {
    console.log(`\nServrarna står kvar (Ctrl-C). Token för konto A:\n  export TOKEN=${TA}`);
    return;
  }
  for (const s of [supabase, anthropic, api]) s.close();
  await db.close();
  process.exit(fel ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

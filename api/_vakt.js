/* ══════════════════════════════════════════════════════════════════
   Vakten framför /api/identify (MES-316): vem frågar, och har kontot
   frågor kvar den här månaden?

   Filen börjar med understreck och blir därför ingen egen rutt hos
   Vercel — den importeras bara av api/identify.js.

   1. INLOGGNINGEN. Klienten skickar sin Supabase-session som
      `Authorization: Bearer <access_token>`. Servern verifierar tokenens
      signatur själv, utan att fråga Supabase, så att en fråga till Claude
      inte blir en rundresa längre:
        ES256/RS256  mot projektets publika nycklar (JWKS), som hämtas en
                     gång per varm instans och sedan var tionde minut.
                     Uppmätt 2026-10-02: projektets JWKS har en ES256-nyckel.
        HS256        mot SUPABASE_JWT_SECRET, om den är satt (äldre projekt).
        annars       frågar servern Supabase Auth (/auth/v1/user) och
                     minns svaret en minut — långsammare, men aldrig fel.
      Sedan påståendena: inte utgången, roll och mottagare "authenticated"
      (anon-nyckeln är också en JWT, med rollen anon — den släpps inte),
      utfärdad av det här projektet, inte ett anonymt konto, och ett
      konto-id. Ingen token, eller en som inte håller = 401.
      Det som inte syns lokalt: en utloggad session gäller tills tokenen
      går ut (högst en timme, Supabases förval).

   2. TAKET. En rad per fråga i tabellen claude_fragor
      (supabase/migrations/20261002100000_claude_fragor.sql). Rpc:n
      claude_fraga_reservera räknar kontots frågor i kalendermånaden och
      skriver nästa rad i samma steg, under ett lås per konto. Taket:
      CLAUDE_TAK_PER_MANAD, förval 300 (Jespers beslut 2026-09-28 i
      MES-316). Når servern inte räknaren svarar den 503 — hellre AI-hjälpen
      pausad än frågor som ingen räknar.

   3. LOGGEN. När svaret gått fylls raden i: modell, tokens, dollar,
      svarstid, status, om svaret gick att använda, och om Anthropic alls
      svarade 200 (raknas). En fråga som aldrig nådde Anthropic räknas inte mot taket:
      ett avbrott hos dem ska inte äta upp spelarnas månad. Fel i loggen
      ignoreras — den får aldrig fälla ett svar.

   Miljövariabler:
     SUPABASE_URL               krävs (finns redan för /api/config)
     SUPABASE_SERVICE_ROLE_KEY  krävs för räknaren (ligger i Vercel sedan 2026-09-28)
     SUPABASE_JWT_SECRET        valfri, bara för HS256-tokens
     CLAUDE_TAK_PER_MANAD       valfri, förval 300
   ══════════════════════════════════════════════════════════════════ */
import crypto from 'node:crypto';

const env = k => (process.env[k] || '').trim();
const basUrl = () => env('SUPABASE_URL').replace(/\/+$/, '');
const tjanstNyckel = () => env('SUPABASE_SERVICE_ROLE_KEY');

export const TAK_FORVAL = 300;
export function takPerManad() {
  const n = parseInt(env('CLAUDE_TAK_PER_MANAD'), 10);
  return Number.isFinite(n) && n >= 0 ? n : TAK_FORVAL;
}

/* De nya nycklarna (sb_secret_…) är inga JWT och går bara i apikey; den
   gamla service_role-nyckeln är en JWT och går i båda. Båda formerna
   provade mot projektets PostgREST 2026-10-02 (404 PGRST202 på en rpc som
   inte finns = nyckeln godtogs). */
function tjanstHuvuden(extra) {
  const k = tjanstNyckel();
  const h = { apikey: k, 'Content-Type': 'application/json' };
  if (!k.startsWith('sb_')) h.Authorization = 'Bearer ' + k;
  return Object.assign(h, extra);
}

/* ── 1. inloggningen ───────────────────────────────────────────────── */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MARGINAL_S = 10;                  // klockor som går lite olika

export function bearer(huvud) {
  const m = /^Bearer\s+([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*)\s*$/i.exec(String(huvud || ''));
  return m ? m[1] : null;
}

function dela(token) {
  const p = String(token).split('.');
  if (p.length !== 3) return null;
  try {
    return {
      huvud: JSON.parse(Buffer.from(p[0], 'base64url').toString('utf8')),
      last: JSON.parse(Buffer.from(p[1], 'base64url').toString('utf8')),
      data: Buffer.from(p[0] + '.' + p[1]),
      sig: Buffer.from(p[2], 'base64url')
    };
  } catch (e) { return null; }
}

/* Projektets publika nycklar. Hämtas om var tionde minut, och direkt när en
   token bär ett okänt kid (nyckeln har roterats) — men högst var 30:e
   sekund, så att skräptokens inte blir en ström av hämtningar.

   Spärren gäller bara när cachen har nycklar. En tom cache — kallstart och
   Supabase svarar inte just då — ska försöka igen vid nästa fråga: annars
   svarade instansen "okänd nyckel" (401) i en halv minut, och klienten
   tolkade det som utloggad, förnyade sessionen och skickade hela bilden om
   för varje fråga (granskningen av MES-316, 2026-10-02). Nu blir det 503
   "tillfälligt" i stället (tillfalligt nedan), och samtidiga frågor delar
   en hämtning. */
const jwks = { nycklar: new Map(), hamtad: 0, forsokt: 0, pagar: null };
function hamtaJwks() {
  if (jwks.pagar) return jwks.pagar;
  jwks.pagar = (async () => {
    try {
      const r = await fetch(basUrl() + '/auth/v1/.well-known/jwks.json', { signal: AbortSignal.timeout(3000) });
      if (!r.ok) throw new Error('svarade ' + r.status);
      const j = await r.json();
      const ny = new Map();
      for (const k of (j && Array.isArray(j.keys) ? j.keys : [])) {
        try { ny.set(k.kid || '', { jwk: k, nyckel: crypto.createPublicKey({ key: k, format: 'jwk' }) }); } catch (e) {}
      }
      jwks.nycklar = ny; jwks.hamtad = Date.now();
      return true;
    } catch (e) { console.error('vakt: JWKS gick inte att hämta:', e && e.message); return false; }
    finally { jwks.pagar = null; }
  })();
  return jwks.pagar;
}
/* Nyckeln för kid, null när den inte finns bland projektets nycklar — eller
   { tillfalligt: true } när cachen är tom och hämtningen föll, så att svaret
   blir "försök strax igen" och inte "inte inloggad". */
async function nyckel(kid) {
  const nu = Date.now();
  const tom = jwks.nycklar.size === 0;
  const gammal = nu - jwks.hamtad > 10 * 60_000;
  const okand = kid && !jwks.nycklar.has(kid);
  let hamtat = null;
  if (tom || ((gammal || okand) && nu - jwks.forsokt > 30_000)) {
    jwks.forsokt = nu;
    hamtat = await hamtaJwks();
  }
  const n = jwks.nycklar.get(kid || '') || null;
  if (n) return n;
  if (jwks.nycklar.size === 0 && hamtat === false) return { tillfalligt: true };
  return null;
}

function signaturHaller(alg, n, data, sig) {
  try {
    if (alg === 'ES256' && n.jwk.kty === 'EC') return crypto.verify('sha256', data, { key: n.nyckel, dsaEncoding: 'ieee-p1363' }, sig);
    if (alg === 'RS256' && n.jwk.kty === 'RSA') return crypto.verify('sha256', data, n.nyckel, sig);
  } catch (e) {}
  return false;
}

function hmacHaller(hemlighet, data, sig) {
  const egen = crypto.createHmac('sha256', hemlighet).update(data).digest();
  return egen.length === sig.length && crypto.timingSafeEqual(egen, sig);
}

/* Påståendena i tokenen. null = godkänd, annars varför inte. */
export function pastaendenFel(p, nuS = Math.floor(Date.now() / 1000)) {
  if (!p || typeof p !== 'object') return 'ingen last';
  if (typeof p.exp !== 'number' || p.exp + MARGINAL_S < nuS) return 'utgången';
  if (typeof p.nbf === 'number' && p.nbf - MARGINAL_S > nuS) return 'inte giltig än';
  if (p.role !== 'authenticated') return 'rollen är ' + (p.role || 'tom');
  const aud = Array.isArray(p.aud) ? p.aud : [p.aud];
  if (!aud.includes('authenticated')) return 'fel mottagare';
  if (p.is_anonymous === true) return 'anonymt konto';
  const iss = basUrl() ? basUrl() + '/auth/v1' : '';
  if (iss && String(p.iss || '').replace(/\/+$/, '') !== iss) return 'fel utfärdare';
  if (!UUID.test(String(p.sub || ''))) return 'inget konto-id';
  return null;
}

/* Reservvägen: Supabase Auth själv. Minns ett godkänt svar en minut per
   token (nyckeln är en hash, aldrig tokenen). Underkända svar minns den
   inte — i stället högst 30 underkända per minut och instans, så att
   påhittade tokens inte blir en ström av frågor till Supabase Auth. */
const authMinne = new Map();
const authUnderkanda = [];
let reservSagt = false;
async function fragaAuth(token, last) {
  const h = crypto.createHash('sha256').update(token).digest('base64url');
  const nu = Date.now();
  const sparat = authMinne.get(h);
  if (sparat && sparat.till > nu) return sparat.svar;
  while (authUnderkanda.length && nu - authUnderkanda[0] > 60_000) authUnderkanda.shift();
  if (authUnderkanda.length >= 30) return { ok: false, varfor: 'för många underkända tokens den här minuten' };
  if (!reservSagt) { reservSagt = true; console.warn('vakt: tokenen verifieras via /auth/v1/user (HS256 utan SUPABASE_JWT_SECRET) — fungerar, men kostar en rundresa'); }
  const k = tjanstNyckel() || env('SUPABASE_ANON_KEY');
  let svar;
  try {
    const r = await fetch(basUrl() + '/auth/v1/user', {
      headers: { apikey: k, Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(4000) });
    if (!r.ok) svar = { ok: false, varfor: 'Supabase Auth svarade ' + r.status };
    else {
      const u = await r.json();
      svar = u && u.id && u.id === last.sub && !u.is_anonymous
        ? { ok: true, anvandare: u.id } : { ok: false, varfor: 'Supabase Auth gav inget konto' };
    }
  } catch (e) { return { ok: false, varfor: 'Supabase Auth gick inte att nå', tillfalligt: true }; }
  if (svar.ok) {
    if (authMinne.size > 2000) authMinne.clear();
    authMinne.set(h, { svar, till: Math.min(nu + 60_000, last.exp * 1000) });
  } else authUnderkanda.push(nu);
  return svar;
}

/* { ok: true, anvandare } eller { ok: false, varfor }. Kastar aldrig. */
export async function verifiera(token) {
  if (!token) return { ok: false, varfor: 'ingen token' };
  if (!basUrl()) return { ok: false, varfor: 'SUPABASE_URL saknas på servern', tillfalligt: true };
  const t = dela(token);
  if (!t) return { ok: false, varfor: 'inte en JWT' };
  const fel = pastaendenFel(t.last);
  if (fel) return { ok: false, varfor: fel };
  const alg = t.huvud && t.huvud.alg;
  if (alg === 'ES256' || alg === 'RS256') {
    const n = await nyckel(t.huvud.kid);
    if (n && n.tillfalligt) return { ok: false, varfor: 'projektets nycklar (JWKS) gick inte att hämta', tillfalligt: true };
    if (!n) return { ok: false, varfor: 'okänd nyckel (kid)' };
    if (n.jwk.alg && n.jwk.alg !== alg) return { ok: false, varfor: 'nyckeln är inte för ' + alg };
    return signaturHaller(alg, n, t.data, t.sig)
      ? { ok: true, anvandare: t.last.sub } : { ok: false, varfor: 'signaturen håller inte' };
  }
  if (alg === 'HS256') {
    const hemlighet = env('SUPABASE_JWT_SECRET');
    if (hemlighet) return hmacHaller(hemlighet, t.data, t.sig)
      ? { ok: true, anvandare: t.last.sub } : { ok: false, varfor: 'signaturen håller inte' };
    return fragaAuth(token, t.last);
  }
  return { ok: false, varfor: 'algoritmen ' + (alg || 'saknas') + ' godtas inte' };
}

/* ── 2. taket ──────────────────────────────────────────────────────── */
/* { ok, antal, tak, id, nollstalls } — eller kastar, när räknaren inte
   gick att nå (då svarar identify 503). */
export async function reservera({ anvandare, mode, spel }) {
  if (!basUrl() || !tjanstNyckel()) throw new Error('SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY saknas på servern');
  const tak = takPerManad();
  const r = await fetch(basUrl() + '/rest/v1/rpc/claude_fraga_reservera', {
    method: 'POST', headers: tjanstHuvuden(),
    body: JSON.stringify({ p_user: anvandare, p_tak: tak, p_mode: mode, p_spel: spel || null }),
    signal: AbortSignal.timeout(4000)
  });
  const txt = await r.text();
  if (!r.ok) throw new Error('räknaren svarade ' + r.status + ': ' + txt.slice(0, 200));
  let rad;
  try { const j = JSON.parse(txt); rad = Array.isArray(j) ? j[0] : j; } catch (e) {}
  if (!rad || typeof rad.ok !== 'boolean') throw new Error('räknaren svarade utan rad: ' + txt.slice(0, 200));
  return { ok: rad.ok, antal: rad.antal, tak, id: rad.id, nollstalls: rad.nollstalls };
}

/* ── 3. loggen ─────────────────────────────────────────────────────── */
/* USD per miljon tokens [in, ut]: samma tal som AI_PRIS i index.html (den
   raden är klientens kopia, den här är den som hamnar i claude_fragor.dollar).
   Ändras ett pris ändras båda. Modellens id stryks på datumsuffix (-YYYYMMDD)
   före uppslaget. Cache: läsning kostar 0,1 × inpriset, skrivning (5 min) 1,25 ×
   — och Anthropics input_tokens räknar inte cache-tokens, så de läggs till. */
const PRIS = { 'claude-opus-5': [5, 25], 'claude-sonnet-5': [2, 10], 'claude-fable-5-1': [10, 50], 'claude-haiku-4-5': [1, 5] };
const CACHE_LASA = 0.1, CACHE_SKRIV = 1.25;
/* Dollar för en fråga, eller null när modellen eller tokens saknas: "okänt"
   är ett svar, 0 vore en lögn. */
export function dollar(modell, f) {
  const p = modell && PRIS[String(modell).replace(/-\d{8}$/, '')];
  if (!p || !f || f.input_tokens == null || f.output_tokens == null) return null;
  const n = v => (v == null || !Number.isFinite(+v)) ? 0 : +v;
  const inTok = n(f.input_tokens) + n(f.cache_read) * CACHE_LASA + n(f.cache_write) * CACHE_SKRIV;
  return Math.round((inTok * p[0] + n(f.output_tokens) * p[1])) / 1e6;
}
export async function logga(id, falt) {
  if (id == null || !basUrl() || !tjanstNyckel()) return;
  const d = falt && falt.dollar == null ? dollar(falt.modell, falt) : null;
  if (d != null) falt = Object.assign({}, falt, { dollar: d });
  try {
    const r = await fetch(basUrl() + '/rest/v1/claude_fragor?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH', headers: tjanstHuvuden({ Prefer: 'return=minimal' }),
      body: JSON.stringify(falt), signal: AbortSignal.timeout(3000)
    });
    if (!r.ok) console.error('vakt: loggen svarade', r.status, (await r.text()).slice(0, 200));
  } catch (e) { console.error('vakt: loggen gick inte att skriva:', e && e.message); }
}

/* Texten klienten visar när taket är nått: datumet i svensk tid, eftersom
   månaden räknas så. */
export function takText(tak, nollstalls) {
  let datum = '';
  try { datum = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'Europe/Stockholm' }).format(new Date(nollstalls)); } catch (e) {}
  return `Your AI help for this month is used up (${tak} of ${tak} questions to Claude). ` +
    (datum ? `It starts again on ${datum}. ` : 'It starts again next month. ') +
    'Mesa keeps recognizing cards on its own; the ones it is unsure of go to Which card is this?';
}

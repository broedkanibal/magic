/* supabase-js för partiprovet av minnet (dev/minnet/prov-parti.mjs, MES-373). Serveras i stället för CDN-modulen
   som Moln laddar, så att appens EGNA Moln-anrop körs. Till skillnad från dev/rapport/fake-supabase.mjs finns ingen
   tabell här: varje fråga skickas som det PostgREST hade fått (tabell, verb, rader, filter, onConflict) till provets
   server (POST /pg), som kör den i en riktig Postgres (PGlite) som den inloggade spelaren — så RLS gäller på riktigt.
   Kanalen och hinken gör ingenting. Sessionen sätts av provet i globalThis.__sbpg innan sidan laddas. */
const S = globalThis.__sbpg = globalThis.__sbpg || { session: null };
S.logg = S.logg || [];

class Q {
  constructor(t) { this.t = t; this.op = 'select'; this.f = []; this.cols = '*'; }
  select(c) { if (this.op === 'select') this.cols = c || '*'; else this.ret = true; return this; }
  insert(r) { this.op = 'insert'; this.rows = Array.isArray(r) ? r : [r]; return this; }
  upsert(r, o) { this.op = 'upsert'; this.rows = Array.isArray(r) ? r : [r]; this.onConflict = o && o.onConflict; return this; }
  update(v) { this.op = 'update'; this.val = v; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(k, v) { this.f.push([k, 'eq', v]); return this; }
  neq(k, v) { this.f.push([k, 'neq', v]); return this; }
  in(k, a) { this.f.push([k, 'in', a]); return this; }
  is(k, v) { this.f.push([k, 'is', v]); return this; }
  lte(k, v) { this.f.push([k, 'lte', v]); return this; }
  gte(k, v) { this.f.push([k, 'gte', v]); return this; }
  order(k, o) { this.ord = [k, o && o.ascending === false ? 'desc' : 'asc']; return this; }
  limit(n) { this.lim = n; return this; }
  range() { return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; this.maybe = true; return this; }
  then(res, rej) { return this.kor().then(res, rej); }
  async kor() {
    const fraga = { uid: S.session && S.session.user ? S.session.user.id : null, t: this.t, op: this.op, rows: this.rows, val: this.val, f: this.f,
                    onConflict: this.onConflict, cols: this.cols, ret: !!this.ret, ord: this.ord, lim: this.lim };
    let j;
    try { j = await (await fetch('/pg', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fraga) })).json(); }
    catch (e) { return { data: null, error: { message: 'Failed to fetch' } }; }
    S.logg.push({ t: this.t, op: this.op, n: this.rows ? this.rows.length : undefined, fel: j.error ? j.error.message : undefined });
    if (j.error) return { data: null, error: j.error, status: 400 };
    let d = j.data;
    if (this.one) {
      if (d.length === 1) d = d[0];
      else if (!d.length && this.maybe) d = null;
      else return { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } };
    }
    return { data: this.op === 'select' || this.ret ? d : null, error: null };
  }
}

const kanal = () => { const c = { on() { return c; }, subscribe(cb) { setTimeout(() => cb && cb('SUBSCRIBED'), 0); return c; }, async send() { return 'ok'; }, async unsubscribe() { return 'ok'; }, async track() { return 'ok'; }, presenceState() { return {}; } }; return c; };
const hink = () => ({ async upload() { return { data: null, error: { message: 'ingen hink i provet' } }; }, async list() { return { data: [], error: null }; }, async remove() { return { data: [], error: null }; },
                      async createSignedUrl() { return { data: { signedUrl: 'about:blank' }, error: null }; }, async download() { return { data: null, error: { message: 'not found' } }; }, getPublicUrl() { return { data: { publicUrl: 'about:blank' } }; } });

const klient = {
  auth: {
    async getSession() { return { data: { session: S.session }, error: null }; },
    onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
    async getUser() { return S.session ? { data: { user: S.session.user }, error: null } : { data: null, error: { message: 'no user' } }; },
    async refreshSession() { return { data: { session: S.session }, error: null }; },
    async signOut() { return { error: null }; },
    async updateUser() { return { data: { user: S.session && S.session.user }, error: null }; }
  },
  from: t => new Q(t),
  async rpc() { return { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } }; },
  storage: { from: hink },
  channel: kanal, removeChannel: async () => 'ok', getChannels: () => [],
  functions: { async invoke() { return { data: null, error: null }; } }
};
export function createClient() { return klient; }

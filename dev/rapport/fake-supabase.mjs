/* Attrappen av supabase-js för dev/rapport/prov-c.cjs (MES-367). prov-c serverar den i stället för
   CDN-modulen som Moln laddar (import(CDN) i klient()), så att appens EGNA Moln-funktioner provas —
   godkannVillkor, sattBildInstallning, bildInstallning, rapportAntal, raderaMinaRapporter,
   rapportRad, rapportFil, rapportRadera — mot en tabell och en hink i sidan.

   Reglerna som provet lutar sig mot är de riktiga:
   - rapporter: spelaren ser, uppdaterar och raderar bara sina rader (user_id); insert sätter kod
     (R-NNNN), sokvag (<uid>/rapporter/<kod>) och created_at; taket 20 rapporter per 24 h → rapport_tak.
   - raderingar: insert bara för en kod som tillhör en av spelarens EGNA rader som FINNS (därför måste
     Delete skriva raderingar före raderingen); unique (kod) → 23505 (20261013170000); select ger inget
     (bara service role läser).
   - storage scans: bara under <uid>/.
   Tillståndet ligger i globalThis.__sb och sparas i sessionStorage, så att det överlever en omladdning
   (Agree and continue laddar om sidan). S.natNere = true: varje anrop svarar "Failed to fetch".
   S.removeFel = N: hinkens remove fallerar de N nästa gångerna. S.listVanta = ms: varje list väntar så länge. S.updateFel = N: samma för auth.updateUser. */
const NYCKEL = '__sbfake';
const las = () => { try { return JSON.parse(sessionStorage.getItem(NYCKEL)); } catch (e) { return null; } };
const S = globalThis.__sb = globalThis.__sb || Object.assign(
  { seq: 0, session: null, db: { rapporter: [], raderingar: [] }, filer: {}, logg: [], oauth: [], natNere: false, uppVanta: 0 }, las() || {});
S.spara = () => { try { sessionStorage.setItem(NYCKEL, JSON.stringify({ seq: S.seq, session: S.session, db: S.db, filer: S.filer, logg: S.logg, oauth: S.oauth, updateFel: S.updateFel || 0 })); } catch (e) {} };
const fel = m => ({ data: null, error: { message: m } });
const uid = () => S.session && S.session.user && S.session.user.id;
const RLS = { rapporter: true, raderingar: true };
const logga = o => { S.logg.push(Object.assign({ tid: Date.now() }, o)); S.spara(); };

class Q {
  constructor(t) { this.t = t; this.op = 'select'; this.f = []; this.opts = {}; }
  select(c, o) { if (this.op === 'select') { this.cols = c; this.opts = o || {}; } else this.ret = true; return this; }
  insert(r) { this.op = 'insert'; this.rows = Array.isArray(r) ? r : [r]; return this; }
  upsert(r) { this.op = 'insert'; this.rows = Array.isArray(r) ? r : [r]; return this; }
  update(v) { this.op = 'update'; this.val = v; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(k, v) { this.f.push(r => r[k] === v); return this; }
  neq(k, v) { this.f.push(r => r[k] !== v); return this; }
  in(k, a) { this.f.push(r => a.includes(r[k])); return this; }
  is(k, v) { this.f.push(r => (r[k] == null ? null : r[k]) === v); return this; }
  gte(k, v) { this.f.push(r => r[k] >= v); return this; }
  gt(k, v) { this.f.push(r => r[k] > v); return this; }
  lt(k, v) { this.f.push(r => r[k] < v); return this; }
  lte(k, v) { this.f.push(r => r[k] <= v); return this; }
  not() { return this; } or() { return this; } filter() { return this; } match() { return this; }
  order() { return this; } range() { return this; } limit(n) { this.lim = n; return this; }
  single() { this.one = true; return this; } maybeSingle() { this.one = true; this.maybe = true; return this; }
  then(res, rej) { return Promise.resolve().then(() => this.kor()).then(res, rej); }
  kor() {
    logga({ tab: this.t, op: this.op, n: this.rows ? this.rows.length : undefined, kalla: this.rows && this.rows[0] && this.rows[0].kalla });
    if (S.natNere) return fel('Failed to fetch');
    const jag = uid();
    if (!S.db[this.t]) S.db[this.t] = [];
    const tab = S.db[this.t];
    if (this.op === 'insert') {
      const ut = [];
      for (const r0 of this.rows) {
        const r = Object.assign({}, r0);
        if (this.t === 'rapporter') {
          if (!jag) return fel('JWT expired');
          const kalla = r.kalla || 'rapport';
          const dygn = tab.filter(x => x.user_id === jag && x.kalla === kalla && Date.now() - Date.parse(x.created_at) < 864e5).length;
          if (kalla === 'rapport' && dygn >= 20) return fel('rapport_tak');
          r.kod = 'R-' + String(++S.seq).padStart(4, '0');
          Object.assign(r, { user_id: jag, kalla, sokvag: jag + '/rapporter/' + r.kod, created_at: new Date().toISOString(), anvandning: null });
        } else if (this.t === 'raderingar') {
          if (!jag || !S.db.rapporter.some(x => x.kod === r.kod && x.user_id === jag)) return fel('new row violates row-level security policy for table "raderingar"');
          if (tab.some(x => x.kod === r.kod) || ut.some(x => x.kod === r.kod)) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "raderingar_kod_unik"' } };   // 20261013170000
          r.raderad_at = new Date().toISOString();
        }
        ut.push(r);
      }
      tab.push(...ut); S.spara();
      return { data: this.ret ? (this.one ? Object.assign({}, ut[0]) : ut.map(r => Object.assign({}, r))) : null, error: null };
    }
    let rader = tab.filter(r => !RLS[this.t] || r.user_id === jag).filter(r => this.f.every(f => f(r)));
    if (this.t === 'raderingar') rader = [];
    if (this.op === 'update') { rader.forEach(r => Object.assign(r, this.val)); S.spara(); return { data: null, error: null }; }
    if (this.op === 'delete') { S.db[this.t] = tab.filter(r => !rader.includes(r)); S.spara(); return { data: null, error: null }; }
    if (this.opts.head) return { data: null, count: rader.length, error: null };
    if (this.lim) rader = rader.slice(0, this.lim);
    if (this.one) return rader.length ? { data: Object.assign({}, rader[0]), error: null } : this.maybe ? { data: null, error: null } : fel('JSON object requested, multiple (or no) rows returned');
    return { data: rader.map(r => Object.assign({}, r)), count: this.opts.count ? rader.length : null, error: null };
  }
}

const hink = () => ({
  async upload(p, blob) {
    logga({ tab: 'storage', op: 'upload', p });
    if (S.uppVanta) await new Promise(r => setTimeout(r, S.uppVanta));
    if (S.natNere) return fel('Failed to fetch');
    if (!uid() || !p.startsWith(uid() + '/')) return fel('new row violates row-level security policy');
    S.filer[p] = (blob && blob.size) || 0; S.spara();
    return { data: { path: p }, error: null };
  },
  async list(dir) {
    if (S.listVanta) await new Promise(r => setTimeout(r, S.listVanta));   // provet: Delete tar tid (en rapport skickas under tiden)
    if (S.natNere) return fel('Failed to fetch');
    const pre = String(dir).replace(/\/$/, '') + '/', ut = new Map();
    for (const k of Object.keys(S.filer)) {
      if (!k.startsWith(pre) || !k.startsWith(uid() + '/')) continue;
      const rest = k.slice(pre.length), i = rest.indexOf('/');
      if (i < 0) ut.set(rest, { name: rest, id: 'f-' + k });
      else if (!ut.has(rest.slice(0, i))) ut.set(rest.slice(0, i), { name: rest.slice(0, i), id: null });
    }
    return { data: [...ut.values()], error: null };
  },
  async remove(ps) {
    logga({ tab: 'storage', op: 'remove', n: ps.length });
    if (S.natNere) return fel('Failed to fetch');
    if (S.removeFel > 0) { S.removeFel--; return fel('Failed to fetch'); }   // provet: hinken fallerar N gånger
    for (const p of ps) if (p.startsWith(uid() + '/')) delete S.filer[p];
    S.spara(); return { data: [], error: null };
  },
  async createSignedUrl() { return { data: { signedUrl: 'about:blank' }, error: null }; },
  async download() { return fel('not found'); },
  getPublicUrl() { return { data: { publicUrl: 'about:blank' } }; }
});

const kanal = () => { const c = { on() { return c; }, subscribe(cb) { setTimeout(() => cb && cb('SUBSCRIBED'), 0); return c; }, async send() { return 'ok'; }, async unsubscribe() { return 'ok'; }, async track() { return 'ok'; }, presenceState() { return {}; } }; return c; };

const klient = {
  auth: {
    async getSession() { return { data: { session: S.session }, error: null }; },
    onAuthStateChange(cb) { S.authCb = cb; return { data: { subscription: { unsubscribe() {} } } }; },
    async getUser() { if (S.natNere) return fel('Failed to fetch'); return S.session ? { data: { user: JSON.parse(JSON.stringify(S.session.user)) }, error: null } : fel('no user'); },
    async updateUser(o) {
      logga({ tab: 'auth', op: 'updateUser', data: o && o.data });
      if (S.natNere) return fel('Failed to fetch');
      if (S.updateFel > 0) { S.updateFel--; S.spara(); return fel('Failed to fetch'); }
      if (!S.session) return fel('no user');
      Object.assign(S.session.user.user_metadata, (o && o.data) || {}); S.spara();
      return { data: { user: JSON.parse(JSON.stringify(S.session.user)) }, error: null };
    },
    async signInWithOAuth(o) { S.oauth.push(o || {}); S.spara(); return { data: {}, error: null }; },
    async signOut() { S.session = null; S.spara(); return { error: null }; },
    async refreshSession() { return { data: { session: S.session }, error: null }; }
  },
  from: t => new Q(t),
  async rpc(n) {
    if (S.natNere) return fel('Failed to fetch');
    if (n === 'rapporter_idag') return { data: S.db.rapporter.filter(r => r.user_id === uid() && r.kalla === 'rapport' && Date.now() - Date.parse(r.created_at) < 864e5).length, error: null };
    return { data: null, error: null };
  },
  storage: { from: hink },
  channel: kanal, removeChannel: async () => 'ok', getChannels: () => [],
  functions: { async invoke() { return { data: null, error: null }; } }
};
export function createClient() { return klient; }

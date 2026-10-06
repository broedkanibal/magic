/* ── Rörelsemotorn ────────────────────────────────────────────────────
   En klocka, en kö med kamerans uppdateringar och en lista med spår. Varje
   bildruta räknas varje aktivt spår fram och skrivs som transform, opacitet
   och (bara vid nedtoning) filter på kortens lager. Inget läggs i DOM:en
   medan det rör sig, och React rör aldrig de egenskaperna.

   Avbrott: ett spår som startar på en egenskap som redan rör sig tar över
   från där den står, och för position, vridning och skala tas farten med —
   det första segmentets easing byts mot cubic-bezier(x1, k·x1, x2, y2) där
   k = v·T/Δ (v = farten nu, T = segmentets längd, Δ = sträckan kvar). Då
   fortsätter kortet i samma fart åt det nya hållet i stället för att stanna
   och börja om. */

const Z = 920 / 1424;                       // mattans zoom: brädet 1424 px brett i 920 px
const KW = 178, KH = 248;                   // MATTA.CW × MATTA.CH
const HOG_MITT = [76 / Z, 416 / Z];         // mitten av graveyard-kortet (22+54, 344+72) i brädets px
const BAS = {
  llanowar: { namn: 'Llanowar Elves', hem: [420, 80], z: 10 },
  serra: { namn: 'Serra Angel', hem: [630, 80], z: 11 },
  woodelves: { namn: 'Wood Elves', hem: [840, 80], z: 12 },
  forest1: { hem: [440, 420], z: 1 }, forest2: { hem: [466, 446], z: 2 },
  plains1: { hem: [700, 420], z: 3 }, plains2: { hem: [726, 446], z: 4 },
  anthem: { namn: 'Glorious Anthem', hem: [1060, 80], z: 13, ute: true },
  P: { hem: [1000, 440], z: 60, plats: true },
};
const PUNKT = { M1: [1000, 440], M2: [1180, 330], serraNy: [1210, 400] };

const SCEN = {
  utspel: { kort: 'anthem', plats: 'anthem', vid: 'hem', knapp: 'Utspel', under: 'platshållare → namn' },
  flytt: { kort: 'llanowar', plats: 'P', vid: 'M1', knapp: 'Flytt', under: 'tappas → platshållare → namn' },
  avbrott: { kort: 'llanowar', plats: 'P', vid: 'M1', mal2: 'M2', knapp: 'Flytt, avbruten', under: 'ny rapport mitt i flytten' },
  tappat: { kort: 'serra', knapp: 'Tappat kort', under: 'väntan → nedtonat' },
  tillbaka: { kort: 'serra', plats: 'P', vid: 'hem', dimmad: true, knapp: 'Tillbaka', under: 'nedtonat → samma plats' },
  tillbakaNy: { kort: 'serra', plats: 'P', vid: 'serraNy', dimmad: true, knapp: 'Tillbaka, ny plats', under: 'nedtonat → ny plats' },
  grav: { kort: 'woodelves', knapp: 'Till graveyard', under: 'högen växer under väntan' },
  tap: { kort: 'llanowar', knapp: 'Tap / untap', under: 'när kameran är säker', ingenSetup: true },
};
const OM = {
  plats: 'Kameran ser något nytt 0,1–0,5 s efter att handen släppt · “Reading the card…”',
  claude: '“Asking Claude…” · namnet kan dröja upp till 5 s',
  namn: 'Namnet kommer 0,3–2 s efter platshållaren',
  tappad: 'Handen tar kortet — eller så skyms det bara',
  nedtonad: 'Ingen ny plats och ingen hög växte',
  flytt: 'Samma namn på en ny plats medan kortet väntade',
  avbrott: 'Kameran rättar platsen och ser att kortet är tappat',
  tillbaka: 'Platshållaren binds till det nedtonade kortet',
  tillbakaNy: 'Platshållaren binds till det nedtonade kortet',
  grav: 'Högvakten: högen i bild blev större medan kortet väntade',
  tap: 'Bara en tydlig dom, inom 20° (tapTydlig)',
  untap: 'Bara en tydlig dom, inom 20° (tapTydlig)',
};

const sek = ms => (ms / 1000).toFixed(ms % 100 ? 2 : 1).replace('.', ',') + ' s';
const tal = v => {
  const s = String(Math.round(v * 1000) / 1000).replace('.', ',');
  return s;
};

/* cubic-bezier: y(x) och lutningen dy/dx. */
function bezier(p) {
  if (!p) return { y: x => x, d: () => 1 };
  const [x1, y1, x2, y2] = p;
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t;
  const dX = t => (3 * ax * t + 2 * bx) * t + cx, dY = t => (3 * ay * t + 2 * by) * t + cy;
  const tAv = x => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = X(t) - x, d = dX(t);
      if (Math.abs(e) < 1e-6) return t;
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1; t = x;
    for (let i = 0; i < 40; i++) { if (X(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return t;
  };
  return {
    y: x => x <= 0 ? 0 : x >= 1 ? 1 : Y(tAv(x)),
    d: x => { const t = tAv(Math.min(1, Math.max(0, x))), dx = dX(t); return Math.abs(dx) < 1e-6 ? 0 : dY(t) / dx; },
  };
}
const BEZ = {};
for (const k in EASE) if (Array.isArray(EASE[k].b)) BEZ[k] = bezier(EASE[k].b);

function grund(id) {
  const b = BAS[id], dold = b.ute || b.plats;
  return { x: b.hem[0], y: b.hem[1], r: 0, s: 1, o: dold ? 0 : 1, dy: 0, lift: 0, face: b.plats ? 0 : 1, ph: b.plats ? 1 : 0,
    dim: 0, ring: 1, glow: 0, clip: 1, scan: 1, cb: 0, cbs: 1, cbg: 0, z: b.z, claude: false, tappad: false };
}
const hogGrund = () => ({ o: 0, dy: 0, s: 1 });

class Motor {
  constructor(rot, ab) {
    this.ab = ab; this.klocka = 0; this.q = []; this.vantar = []; this.aktiva = []; this.raf = 0; this.sist = 0; this.topZ = 100;
    this.o = {};
    for (const id in BAS) this.o[id] = { id, v: grund(id), els: [] };
    this.o.spok = { id: 'spok', v: { x: 0, y: 0, r: 0, o: 0 }, els: [] };
    this.o.hog = { id: 'hog', v: hogGrund(), els: [] };
    this.o.hogring = { id: 'hogring', v: { s: .5, o: 0 }, els: [] };
    this.o.hogtal = { id: 'hogtal', v: { s: 1 }, els: [] };
    this.fastna(rot);
  }
  fastna(rot) {
    this.rot = rot;
    for (const k in this.o) this.o[k].els = [];
    for (const m of rot.querySelectorAll('[data-mat]')) {
      const vrid = +m.dataset.rot || 0;
      for (const el of m.querySelectorAll('[data-k]')) {
        const q = s => el.querySelector(s);
        this.o[el.dataset.k].els.push({ el, vrid, sh: q('.k-sh'), ph: q('.k-ph'), face: q('.k-face'), lost: q('.k-lost'), scan: q('.k-scan'), ring: q('.k-ring'), glow: q('.k-glow'), cb: q('.k-cb') });
      }
      const sp = m.querySelector('[data-spok]'); if (sp) this.o.spok.els.push({ el: sp, vrid });
      const h = m.querySelector('[data-hog]'); if (h) this.o.hog.els.push({ el: h, vrid });
      const hr = m.querySelector('[data-hogring]'); if (hr) this.o.hogring.els.push({ el: hr, vrid });
      const ht = m.querySelector('[data-hogtal]'); if (ht) this.o.hogtal.els.push({ el: ht, vrid });
    }
    for (const k in this.o) this.mala(this.o[k]);
  }

  /* ── ritningen ── */
  mala(ob) {
    const v = ob.v;
    if (ob.id === 'spok') {
      for (const e of ob.els) {
        e.el.style.transform = `translate(${v.x}px,${v.y}px) rotate(${v.r + e.vrid}deg)`;
        e.el.style.opacity = v.o; e.el.style.visibility = v.o > .001 ? 'visible' : 'hidden';
      }
      return;
    }
    if (ob.id === 'hog') {
      for (const e of ob.els) { e.el.style.transform = `translateY(${v.dy}px) scale(${v.s}) rotate(${e.vrid}deg)`; e.el.style.opacity = v.o; }
      return;
    }
    if (ob.id === 'hogring') { for (const e of ob.els) { e.el.style.transform = `scale(${v.s})`; e.el.style.opacity = v.o; } return; }
    if (ob.id === 'hogtal') { for (const e of ob.els) e.el.style.transform = `scale(${v.s})`; return; }
    const tapp = Math.min(1, Math.abs(v.r) / 90);
    const ljus = (1 - .14 * tapp) * (1 - .45 * v.dim);
    const filter = v.dim > .001 || tapp > .001 ? `grayscale(${(.8 * v.dim).toFixed(3)}) brightness(${ljus.toFixed(3)}) saturate(${(1 - .06 * tapp).toFixed(3)})` : 'none';
    const rp = Math.max(0, Math.min(1, v.ring)), spread = 12 * rp;
    const cbFarg = v.cbg > .5 ? '#6fd49a' : '#e7ecf4';
    for (const e of ob.els) {
      const st = e.el.style;
      st.transform = `translate(${v.x.toFixed(2)}px,${(v.y + v.dy).toFixed(2)}px) rotate(${(v.r + e.vrid).toFixed(2)}deg) scale(${v.s.toFixed(4)})`;
      st.opacity = v.o; st.visibility = v.o > .001 ? 'visible' : 'hidden'; st.zIndex = v.z;
      e.sh.style.opacity = v.lift;
      e.ph.style.opacity = v.ph;
      e.ph.classList.toggle('claude', !!v.claude);
      e.ph.classList.toggle('syns', v.ph > .001 && v.o > .001);
      if (e.face) {
        e.face.style.opacity = v.face;
        e.face.style.filter = filter;
        e.face.style.clipPath = v.clip < .999 ? `inset(0 0 ${((1 - v.clip) * 100).toFixed(2)}% 0 round 10px)` : 'none';
      }
      e.lost.style.opacity = v.dim;
      e.scan.style.opacity = v.scan > .001 && v.scan < .999 ? 1 : 0;
      e.scan.style.transform = `translateY(${(v.scan * KH - 1.5).toFixed(1)}px)`;
      e.ring.style.opacity = rp < 1 ? (.53 * (1 - rp)).toFixed(3) : 0;
      e.ring.style.transform = `scale(${1 + 2 * spread / KW},${1 + 2 * spread / KH})`;
      e.glow.style.opacity = v.glow;
      e.cb.style.opacity = v.cb; e.cb.style.transform = `scale(${v.cbs})`; e.cb.style.color = cbFarg;
    }
  }

  /* ── spåren ── */
  varde(sym, ob, prop, ctx) {
    if (typeof sym === 'number') return sym;
    if (sym === 'cur') return ob.v[prop];
    if (sym === 'hogS') return 92 / (KW * Z);
    if (sym === 'flygS') return Math.min(1, 108 * .8 / (KW * Z));
    const p = sym === 'mal' ? ctx.mal : sym === 'mal2' ? ctx.mal2 : sym === 'hog' ? [HOG_MITT[0] - KW / 2, HOG_MITT[1] - KH / 2] : null;
    return p ? p[prop === 'x' ? 0 : 1] : 0;
  }
  /* Ett spår ur SPEC blir ett eller två (position = x och y) körbara spår. */
  lagg(spec, ob, t0, ctx) {
    const [, prop, nycklar, flagga] = spec;
    for (const p of prop === 'pos' ? ['x', 'y'] : [prop]) {
      this.vantar.push({ ob, p, ctx, svag: flagga === 'svag', k: nycklar.map(([t, v, e]) => ({ t: t0 + t, sym: v, e: e || 'LIN' })) });
    }
    this.vantar.sort((a, b) => a.k[0].t - b.k[0].t);
  }
  vardeI(s, T) {
    const k = s.k, n = k.length;
    if (n === 1 || T >= k[n - 1].t) return k[n - 1].v;
    let i = 0; while (i < n - 2 && T >= k[i + 1].t) i++;
    const a = k[i], b = k[i + 1], D = b.t - a.t;
    const x = D <= 0 ? 1 : Math.max(0, Math.min(1, (T - a.t) / D));
    if (a.e === 'STEP') return x >= 1 ? b.v : a.v;
    const f = a.bez || BEZ[a.e];
    return a.v + (b.v - a.v) * (f ? f.y(x) : x);
  }
  starta(s, T) {
    const ob = s.ob, p = s.p;
    const gammal = this.aktiva.find(a => a.ob === ob && a.p === p);
    if (gammal && s.svag) return false;
    /* 'cur' är där egenskapen står när spåret börjar — räknat ur det gamla
       spåret vid starttiden, inte ur förra bildrutan. */
    const t0 = s.k[0].t, nu0 = gammal ? this.vardeI(gammal, t0) : ob.v[p];
    for (const k of s.k) k.v = k.sym === 'cur' ? nu0 : this.varde(k.sym, ob, p, s.ctx);
    if (gammal) {
      if (['x', 'y', 'r', 's'].includes(p) && s.k.length > 1) {
        /* Farten tas med, också när det nya målet ligger åt andra hållet:
           då blir y1 negativt och kortet bär vidare en bit innan det vänder. */
        const v0 = (this.vardeI(gammal, t0) - this.vardeI(gammal, t0 - 4)) / 4;
        const a = s.k[0], b = s.k[1], delta = b.v - a.v, D = b.t - a.t;
        const bas = EASE[a.e] && EASE[a.e].b;
        if (Array.isArray(bas) && Math.abs(delta) > .01 && D > 0 && Math.abs(v0) > 1e-4) {
          const x1 = Math.max(bas[0], .15), k = v0 * D / delta;
          a.bez = bezier([x1, Math.max(-1.2, Math.min(k * x1, 3)), bas[2], bas[3]]);
          a.fart = k;
        }
      }
      this.aktiva = this.aktiva.filter(a => a !== gammal);
    }
    this.aktiva.push(s);
    return true;
  }
  steg(T) {
    while (this.vantar.length && this.vantar[0].k[0].t <= T) {
      const s = this.vantar.shift();
      this.starta(s, T);
    }
    const smutsiga = new Set();
    this.aktiva = this.aktiva.filter(s => {
      s.ob.v[s.p] = this.vardeI(s, T);
      smutsiga.add(s.ob);
      return T < s.k[s.k.length - 1].t;
    });
    for (const ob of smutsiga) this.mala(ob);
  }
  glom(ob) {
    this.aktiva = this.aktiva.filter(s => s.ob !== ob);
    this.vantar = this.vantar.filter(s => s.ob !== ob);
  }

  /* ── klockan ── */
  senare(t, fn, kort) { this.q.push({ t: (this.fasTid != null ? this.fasTid : this.klocka) + t, fn, kort }); this.q.sort((a, b) => a.t - b.t); this.igang(); }
  igang() { if (!this.raf) { this.sist = performance.now(); this.raf = requestAnimationFrame(n => this.tick(n)); } }
  tick(nu) {
    this.raf = 0;
    const dt = Math.min(64, nu - this.sist) * this.ab.fart(); this.sist = nu;
    this.klocka += dt;
    /* En uppdatering räknas från sin egen tid, inte från bildrutan den
       råkade hamna i — annars står kortet still en bildruta. */
    while (this.q.length && this.q[0].t <= this.klocka) { const x = this.q.shift(); this.fasTid = x.t; x.fn(); this.fasTid = null; }
    this.steg(this.klocka);
    this.ab.huvuden(this.klocka);
    if (this.q.length || this.aktiva.length || this.vantar.length || this.ab.huvudenIgang(this.klocka)) this.igang();
  }
  hoppa() {
    if (!this.q.length) return 0;
    const d = this.q[0].t - this.klocka;
    for (const x of this.q) x.t -= d;
    return d;
  }
  stopp() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
}

/* ── Artboarden ───────────────────────────────────────────────────── */
class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { sel: 'flytt', fart: 1, minskad: false, namnMs: 1200, logg: [], gravN: 2 };
    this.rotRef = el => { this.rotEl = el; };
    this.lopp = null;
    this.korFn = {}; for (const id in SCEN) this.korFn[id] = () => this.kor(id);
    this.fartFn = {}; for (const f of [1, .5, .25]) this.fartFn[f] = () => this.setState({ fart: f });
    this.namnFn = {}; for (const n of [500, 1200, 4000]) this.namnFn[n] = () => this.setState({ namnMs: n });
    this.rorFn = { full: () => this.setState({ minskad: false }), min: () => this.setState({ minskad: true }) };
    this.hoppa = () => { if (this.m) this.m.hoppa(); };
    this.aterstall = () => this.aterstallAllt();
  }
  componentDidMount() {
    if (!this.rotEl) return;
    this.m = new Motor(this.rotEl, {
      fart: () => this.state.fart,
      huvuden: T => this.huvuden(T),
      huvudenIgang: T => this.huvudenIgang(T),
    });
  }
  componentDidUpdate() { if (this.m && this.rotEl && this.m.rot !== this.rotEl) this.m.fastna(this.rotEl); }
  componentWillUnmount() { if (this.m) this.m.stopp(); }

  spec() { return VAR !== 'N' && this.state.minskad ? SPEC.R : SPEC[VAR]; }

  /* Faserna för en händelse: [{ kind, at }] i ms från händelsens början. */
  faser(id) {
    const sp = this.spec(), w = SPEC[VAR].vanta, n = this.state.namnMs;
    const S = SCEN[id], ut = [];
    const plus = (kind, at) => ut.push({ kind, at });
    if (id === 'utspel') { plus('plats', 0); if (n >= 2500) plus('claude', 1500); plus('namn', n); }
    if (id === 'flytt' || id === 'avbrott') {
      plus('tappad', 0); if (w < 1000) plus('nedtonad', w); plus('plats', 1000); plus('flytt', 1000 + n);
      if (id === 'avbrott') {
        const pos = (sp.flytt || []).find(t => t[1] === 'pos' && t[0] === 'kort'), nk = pos ? pos[2] : null;
        const halv = nk && nk.length > 1 ? Math.round((nk[nk.length - 1][0] + nk[0][0]) / 2) : 200;
        plus('avbrott', 1000 + n + halv);
      }
    }
    if (id === 'tappat') { plus('tappad', 0); plus('nedtonad', w); }
    if (id === 'tillbaka') { plus('plats', 0); plus('tillbaka', n); }
    if (id === 'tillbakaNy') { plus('plats', 0); plus('tillbakaNy', n); }
    if (id === 'grav') { plus('tappad', 0); if (w < 900) plus('nedtonad', w); plus('grav', 900); }
    if (id === 'tap') plus(this.m && this.m.o[S.kort].v.tappad ? 'untap' : 'tap', 0);
    return ut.sort((a, b) => a.at - b.at);
  }

  /* ── en händelse ── */
  kor(id) {
    const m = this.m; if (!m) return;
    const S = SCEN[id], kort = m.o[S.kort], logg = [];
    if (!S.ingenSetup) {
      /* Förbered: bara de kort händelsen gäller, direkt och utan rörelse. */
      const rora = [kort, m.o.P];
      if (id === 'grav') rora.push(m.o.hog, m.o.hogring, m.o.hogtal);
      m.q = m.q.filter(x => !rora.includes(x.kort));
      for (const ob of rora) m.glom(ob);
      Object.assign(kort.v, grund(kort.id));
      if (S.dimmad) for (const t of this.spec().nedtonad) if (t[0] === 'kort') { const k = t[2][t[2].length - 1]; kort.v[t[1]] = typeof k[1] === 'number' ? k[1] : kort.v[t[1]]; }
      Object.assign(m.o.P.v, grund('P'));
      m.o.spok.v.o = 0;
      if (id === 'grav') this.hogAterstall();
      for (const ob of rora.concat(m.o.spok)) m.mala(ob);
    }
    const faser = this.faser(id);
    const t0 = m.klocka;
    this.lopp = { id, t0, faser: faser.map(f => ({ kind: f.kind, at: t0 + f.at })) };
    const ctx = { kort, plats: S.plats ? m.o[S.plats] : null, vid: S.vid === 'hem' ? BAS[S.kort].hem : PUNKT[S.vid], mal2: S.mal2 ? PUNKT[S.mal2] : null };
    faser.forEach((f, i) => m.senare(f.at, () => this.fas(f.kind, ctx, i), S.ingenSetup ? null : kort));
    this.setState({ sel: id, logg: S.ingenSetup ? this.state.logg : [] });
    m.igang();
  }
  logga(txt) {
    const m = this.m, t = this.lopp ? m.klocka - this.lopp.t0 : 0;
    this.setState(s => ({ logg: s.logg.concat({ t: sek(Math.max(0, Math.round(t / 10) * 10)), txt }).slice(-6) }));
  }
  fas(kind, ctx, i) {
    const m = this.m, sp = this.spec(), kort = ctx.kort, nu = m.fasTid != null ? m.fasTid : m.klocka, namn = BAS[kort.id].namn;
    if (this.lopp && this.lopp.faser[i] && this.lopp.faser[i].kind === kind) this.lopp.faser[i].at = nu;
    let spar = sp[kind] || [];
    if (kind === 'tap' || kind === 'untap') {
      const ar = kort.v.tappad; kind = ar ? 'untap' : 'tap'; spar = sp[kind]; kort.v.tappad = !ar;
      if (this.lopp && this.lopp.id === 'tap') this.lopp.faser[0].kind = kind;
    }
    const pl = ctx.plats;
    if (kind === 'plats' && pl) {
      if (pl !== kort) Object.assign(pl.v, grund('P'), { x: ctx.vid[0], y: ctx.vid[1] });
      else Object.assign(pl.v, { x: ctx.vid[0], y: ctx.vid[1], face: 0, ph: 1, clip: 1, scan: 1, cb: 0, cbs: 1, cbg: 0, claude: false, o: 0 });
      m.mala(pl);
    }
    if (kind === 'claude' && pl) { pl.v.claude = true; m.mala(pl); }
    if (kind === 'flytt' || kind === 'tillbakaNy') {
      ctx.mal = [pl.v.x, pl.v.y];
      Object.assign(m.o.spok.v, { x: kort.v.x, y: kort.v.y, r: kort.v.r });
      kort.v.z = ++m.topZ; m.mala(kort);
    }
    if (kind === 'avbrott') { kort.v.tappad = true; }
    if (kind === 'grav') {
      kort.v.z = ++m.topZ; m.mala(kort);
      Object.assign(m.o.spok.v, { x: kort.v.x, y: kort.v.y, r: kort.v.r });
      const hogT = spar.filter(t => /^hog/.test(t[0])).map(t => t[2][0][0]);
      const byt = hogT.length ? Math.min(...hogT) : 0;
      m.senare(byt, () => {
        for (const e of m.o.hog.els) e.el.src = e.el.dataset.src;
        Object.assign(m.o.hog.v, hogGrund()); m.mala(m.o.hog);
        this.setState({ gravN: 3 });
      }, m.o.hog);
    }
    const mal = { kort, plats: pl, spok: m.o.spok, hog: m.o.hog, hogring: m.o.hogring, hogtal: m.o.hogtal };
    for (const t of spar) { const ob = mal[t[0]]; if (ob) m.lagg(t, ob, nu, ctx); }
    const LOGG = {
      plats: 'Något nytt på bordet: “Reading the card…”',
      claude: 'Kameran frågar Claude: “Asking Claude…”',
      namn: 'Namnet: ' + namn,
      tappad: 'Kameran ser inte ' + namn + ' längre',
      nedtonad: 'Ingen ny plats, ingen hög växte på ' + sek(SPEC[VAR].vanta) + ' → nedtonat',
      flytt: 'Namnet: ' + namn + ' — samma kort som försvann: en flytt',
      avbrott: 'Ny rapport: kortet ligger längre bort, och är tappat',
      tillbaka: 'Namnet: ' + namn + ' — det nedtonade kortet syns igen',
      tillbakaNy: 'Namnet: ' + namn + ' — det nedtonade kortet, på ny plats',
      grav: 'Graveyard-högen växer 2 → 3: kortet gick dit',
      tap: 'Kameran är säker: ' + namn + ' är tappat',
      untap: 'Kameran är säker: ' + namn + ' är otappat',
    };
    this.logga(LOGG[kind]);
    m.igang();
  }
  hogAterstall() {
    const m = this.m;
    for (const e of m.o.hog.els) e.el.removeAttribute('src');
    Object.assign(m.o.hog.v, hogGrund()); Object.assign(m.o.hogring.v, { s: .5, o: 0 }); m.o.hogtal.v.s = 1;
    m.mala(m.o.hog); m.mala(m.o.hogring); m.mala(m.o.hogtal);
    this.setState({ gravN: 2 });
  }
  aterstallAllt() {
    const m = this.m; if (!m) return;
    m.q = []; m.aktiva = []; m.vantar = [];
    for (const id in BAS) { m.o[id].v = grund(id); m.mala(m.o[id]); }
    m.o.spok.v.o = 0; m.mala(m.o.spok);
    this.hogAterstall();
    this.lopp = null;
    this.setState({ logg: [] });
    this.huvuden(m.klocka);
  }

  /* ── tidslinjens spelhuvuden ── */
  axlar(id) {
    const sp = this.spec();
    return this.faser(id).map(f => {
      const spar = (sp[f.kind] || []).filter(t => t[3] !== 'intern');
      const slut = spar.reduce((a, t) => Math.max(a, t[2][t[2].length - 1][0]), 0);
      return Math.max(500, Math.ceil((slut + 1) / 100) * 100);
    });
  }
  huvuden(T) {
    if (!this.rotEl) return;
    const el = this.rotEl.querySelectorAll('.tl-head');
    const lopp = this.lopp && this.lopp.id === this.state.sel ? this.lopp : null;
    const ax = lopp ? this.axlar(lopp.id) : [];
    el.forEach((h, i) => {
      const f = lopp && lopp.faser[i], d = f ? T - f.at : -1;
      if (!f || d < 0 || d > ax[i]) { h.style.opacity = 0; return; }
      h.style.opacity = 1;
      h.style.transform = `translateX(${(d / ax[i] * 380).toFixed(1)}px)`;
    });
  }
  huvudenIgang(T) {
    const l = this.lopp; if (!l) return false;
    const ax = this.axlar(l.id);
    return l.faser.some((f, i) => T - f.at <= ax[i] + 50);
  }

  /* ── tidslinjen som data åt mallen ── */
  tidslinje() {
    const id = this.state.sel, sp = this.spec(), faser = this.faser(id), ax = this.axlar(id);
    const visa = v => typeof v === 'number' ? tal(v) : { cur: 'nu', mal: 'nya platsen', mal2: 'rättade platsen', hog: 'högen', hogS: 'högens storlek (' + tal(92 / (KW * Z)) + ')', flygS: tal(Math.min(1, 108 * .8 / (KW * Z))) }[v] || v;
    return faser.map((f, i) => {
      const A = ax[i];
      const spar = (sp[f.kind] || []).filter(t => t[3] !== 'intern');
      const steg = A <= 600 ? 100 : A <= 1000 ? 200 : 500;
      const ticks = [];
      for (let t = 0; t <= A; t += steg) ticks.push({ stil: `left: ${(t / A * 100).toFixed(2)}%`, txt: t === 0 ? '0 ms' : String(t) });
      const rader = spar.map(([malId, prop, k, flagga]) => {
        const bitar = [];
        if (k.length === 1) bitar.push({ cls: 'tl-d', stil: `left: ${(k[0][0] / A * 100).toFixed(2)}%` });
        for (let j = 0; j < k.length - 1; j++) {
          const a = k[j][0], b = k[j + 1][0];
          bitar.push({ cls: 'tl-b' + (k[j][2] === 'STEP' ? ' hopp' : ''), stil: `left: ${(a / A * 100).toFixed(2)}%; width: ${Math.max(.6, (b - a) / A * 100).toFixed(2)}%` });
          if (j > 0) bitar.push({ cls: 'tl-k', stil: `left: ${(a / A * 100).toFixed(2)}%` });
        }
        const grad = prop === 'r' ? '°' : '';
        const varden = k.map(x => visa(x[1]) + (typeof x[1] === 'number' ? grad : '')).join(' → ');
        const tid = k.length === 1 ? (k[0][0] ? 'vid ' + k[0][0] + ' ms' : 'direkt') : (k[0][0] ? k[0][0] + '–' : '') + k[k.length - 1][0] + ' ms';
        const eases = [...new Set(k.slice(0, -1).map(x => x[2] || 'LIN'))].filter(e => e !== 'STEP' || k.length > 2).join('/');
        const extra = f.kind === 'avbrott' && k[0][1] === 'cur' && ['pos', 's', 'r'].includes(prop) ? ' · farten tas med' : flagga === 'svag' ? ' · inte mitt i en flytt' : '';
        return { cls: 'm-' + malId, lbl: MAL[malId] + ' · ' + EGENSKAP[prop], bitar, txt: varden + ' · ' + tid + (eases && k.length > 1 ? ' · ' + eases : '') + extra };
      });
      const tomTxt = f.kind === 'claude' ? 'Texten i platshållaren byts. Inget rör sig.'
        : f.kind === 'tappad' ? (VAR === 'N' ? 'Ingenting än. Kortet tonas ned efter 0,6 s.' : 'Ingenting ändras. Kortet står kvar som det står i upp till ' + sek(SPEC[VAR].vanta) + '. Fem av sex tappade kort är falsklarm (82 borta-domar på fem minuter, högst 10 riktiga), så väntan syns inte.')
        : 'Ingenting rör sig.';
      return { titel: FAS[f.kind], nar: (i === 0 ? 'vid ' : '+') + sek(f.at), om: OM[f.kind] + (f.kind === 'nedtonad' ? ' på ' + sek(SPEC[VAR].vanta) : ''), ticks, rader, harRader: !!rader.length, tom: !rader.length, tomTxt };
    });
  }

  renderVals() {
    const st = this.state;
    const tappSek = sek(SPEC[VAR].vanta);
    return {
      rotRef: this.rotRef,
      knappar: Object.keys(SCEN).map(id => ({ namn: SCEN[id].knapp, under: id === 'tappat' ? 'väntan ' + tappSek + ' → nedtonat' : SCEN[id].under, cls: id === st.sel ? 'vald' : '', kor: this.korFn[id] })),
      farter: [[1, '1×'], [.5, '½×'], [.25, '¼×']].map(([f, txt]) => ({ txt, cls: st.fart === f ? 'vald' : '', val: this.fartFn[f] })),
      namnval: [[500, '0,5 s'], [1200, '1,2 s'], [4000, '4 s · Claude']].map(([n, txt]) => ({ txt, cls: st.namnMs === n ? 'vald' : '', val: this.namnFn[n] })),
      rorelse: [['full', 'Full'], ['min', 'Minskad']].map(([k, txt]) => ({ txt, cls: (k === 'min') === st.minskad ? 'vald' : '', val: this.rorFn[k] })),
      visaRorelse: VAR !== 'N',
      logg: st.logg,
      loggTom: !st.logg.length,
      gravN: st.gravN,
      tl: this.tidslinje(),
      tlTitel: SCEN[st.sel].knapp + (VAR !== 'N' && st.minskad ? ' · minskad rörelse' : ''),
      hoppa: this.hoppa,
      aterstall: this.aterstall,
    };
  }
}

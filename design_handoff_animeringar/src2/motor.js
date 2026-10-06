/* ── Motorn och bordet ─────────────────────────────────────────────────
   Motor: en klocka, en kö med kamerans uppdateringar och spår som räknas
   fram varje bildruta. Den skriver transform, opacitet och (bara under
   nedtoning och graveyard-flygningen) filter direkt på kortens lager. Den
   går också att köra utan DOM — översikten räknar fram sina bilder så.

   Avbrott: ett spår som tar över en egenskap som redan rör sig börjar där
   den står, och för position, vridning och skala tas farten med — första
   segmentet blir cubic-bezier(x1, k·x1, x2, y2), k = v·T/Δ.

   Bord: händelserna (vad kameran säger och när) och vad varje fas gör. */

const Z = 920 / 1424;                       // mattans zoom
const KW = 178, KH = 248;                   // MATTA.CW × MATTA.CH
const HOG_MITT = [76 / Z, 416 / Z];         // graveyard-kortets mitt i brädets px
const IN_DY = 90;                           // ett utspelat kort kommer 90 px från spelarens håll
const BAS = {
  llanowar: { namn: 'Llanowar Elves', hem: [420, 80], z: 10 },
  serra: { namn: 'Serra Angel', hem: [630, 80], z: 11 },
  woodelves: { namn: 'Wood Elves', hem: [840, 80], z: 12 },
  forest1: { hem: [440, 420], z: 1 }, forest2: { hem: [466, 446], z: 2 },
  plains1: { hem: [700, 420], z: 3 }, plains2: { hem: [726, 446], z: 4 },
  anthem: { namn: 'Glorious Anthem', hem: [1060, 80], z: 13, ute: true },
};
const PUNKT = { M1: [1000, 440], M2: [1180, 330], serraNy: [1210, 400], knuff: [884, 116] };

const SCEN = {
  utspel: { kort: 'anthem', vid: 'hem', knapp: 'Utspel', under: 'syns när namnet finns' },
  knuff: { kort: 'woodelves', vid: 'knuff', knapp: 'Knuff', under: 'kameran följer kortet' },
  flytt: { kort: 'llanowar', vid: 'M1', knapp: 'Flytt', under: 'bärs dit när platsen är känd' },
  avbrott: { kort: 'llanowar', vid: 'M1', mal2: 'M2', knapp: 'Flytt, avbruten', under: 'ny rapport mitt i flytten' },
  tappat: { kort: 'serra', knapp: 'Tappat kort', under: 'väntan 5 s → nedtonat' },
  tillbaka: { kort: 'serra', vid: 'hem', dimmad: true, knapp: 'Tillbaka', under: 'nedtonat → samma plats' },
  tillbakaNy: { kort: 'serra', vid: 'serraNy', dimmad: true, knapp: 'Tillbaka, ny plats', under: 'nedtonat → ny plats' },
  grav: { kort: 'woodelves', knapp: 'Till graveyard', under: 'flyger dit när högen växer' },
  tap: { kort: 'llanowar', knapp: 'Tap / untap', under: 'när kameran är säker', ingenSetup: true },
};

const sek = ms => (ms / 1000).toFixed(ms % 100 ? 2 : 1).replace('.', ',') + ' s';
const tal = v => String(Math.round(v * 1000) / 1000).replace('.', ',');

/* cubic-bezier: y(x). */
function bezier(p) {
  if (!p) return { y: x => x };
  const [x1, y1, x2, y2] = p;
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t;
  const dX = t => (3 * ax * t + 2 * bx) * t + cx;
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
  return { y: x => x <= 0 ? 0 : x >= 1 ? 1 : Y(tAv(x)) };
}
const BEZ = {};
for (const k in EASE) if (Array.isArray(EASE[k].b)) BEZ[k] = bezier(EASE[k].b);

function grund(id) {
  const b = BAS[id];
  return { x: b.hem[0], y: b.hem[1], r: 0, s: 1, o: b.ute ? 0 : 1, lift: 0, dim: 0, grav: 0, ring: 1, glow: 0, z: b.z, tappad: false };
}
const hogGrund = () => ({ o: 0, s: 1 });

/* Kortets lager som stilar — samma för motorn (DOM) och översikten (mallen). */
function kortStil(v, vrid) {
  const tapp = Math.min(1, Math.abs(v.r) / 90);
  const ljus = (1 - .14 * tapp) * (1 - .45 * v.dim) * (1 - .45 * v.grav);
  const filter = v.dim > .001 || v.grav > .001 || tapp > .001
    ? `grayscale(${(Math.max(.8 * v.dim, .6 * v.grav)).toFixed(3)}) brightness(${ljus.toFixed(3)}) contrast(${(1 + .05 * v.grav).toFixed(3)}) saturate(${(1 - .06 * tapp).toFixed(3)})` : 'none';
  const rp = Math.max(0, Math.min(1, v.ring)), spread = 12 * rp;
  return {
    el: { transform: `translate(${v.x.toFixed(2)}px,${v.y.toFixed(2)}px) rotate(${(v.r + vrid).toFixed(2)}deg) scale(${v.s.toFixed(4)})`, opacity: v.o, visibility: v.o > .001 ? 'visible' : 'hidden', zIndex: v.z },
    sh: { opacity: v.lift },
    face: { filter },
    lost: { opacity: v.dim },
    ring: { opacity: rp < 1 ? +(.53 * (1 - rp)).toFixed(3) : 0, transform: `scale(${1 + 2 * spread / KW},${1 + 2 * spread / KH})` },
    glow: { opacity: v.glow },
  };
}
const stilText = o => Object.entries(o).map(([k, v]) => k.replace(/[A-Z]/g, c => '-' + c.toLowerCase()) + ': ' + v).join('; ');

class Motor {
  constructor(rot, ab) {
    this.ab = ab; this.klocka = 0; this.q = []; this.vantar = []; this.aktiva = []; this.raf = 0; this.sist = 0; this.topZ = 100; this.fasTid = null;
    this.o = {};
    for (const id in BAS) this.o[id] = { id, v: grund(id), els: [] };
    this.o.hog = { id: 'hog', v: hogGrund(), els: [] };
    this.o.hogring = { id: 'hogring', v: { s: .5, o: 0 }, els: [] };
    this.o.hogtal = { id: 'hogtal', v: { s: 1 }, els: [] };
    this.fastna(rot);
  }
  fastna(rot) {
    this.rot = rot;
    for (const k in this.o) this.o[k].els = [];
    if (!rot) return;
    for (const m of rot.querySelectorAll('[data-mat]')) {
      const vrid = +m.dataset.rot || 0;
      for (const el of m.querySelectorAll('[data-k]')) {
        const q = s => el.querySelector(s);
        this.o[el.dataset.k].els.push({ el, vrid, sh: q('.k-sh'), face: q('.k-face'), lost: q('.k-lost'), ring: q('.k-ring'), glow: q('.k-glow') });
      }
      const h = m.querySelector('[data-hog]'); if (h) this.o.hog.els.push({ el: h, vrid });
      const hr = m.querySelector('[data-hogring]'); if (hr) this.o.hogring.els.push({ el: hr, vrid });
      const ht = m.querySelector('[data-hogtal]'); if (ht) this.o.hogtal.els.push({ el: ht, vrid });
    }
    for (const k in this.o) this.mala(this.o[k]);
  }
  mala(ob) {
    const v = ob.v;
    if (ob.id === 'hog') { for (const e of ob.els) { e.el.style.transform = `scale(${v.s}) rotate(${e.vrid}deg)`; e.el.style.opacity = v.o; } return; }
    if (ob.id === 'hogring') { for (const e of ob.els) { e.el.style.transform = `scale(${v.s})`; e.el.style.opacity = v.o; } return; }
    if (ob.id === 'hogtal') { for (const e of ob.els) e.el.style.transform = `scale(${v.s})`; return; }
    for (const e of ob.els) {
      const s = kortStil(v, e.vrid);
      Object.assign(e.el.style, s.el);
      for (const lager of ['sh', 'face', 'lost', 'ring', 'glow']) Object.assign(e[lager].style, s[lager]);
    }
  }

  /* ── spåren ── */
  varde(sym, ob, prop, ctx) {
    if (typeof sym === 'number') return sym;
    if (sym === 'hogS') return 92 / (KW * Z);
    const p = sym === 'mal' ? ctx.mal : sym === 'in' ? [ctx.mal[0], ctx.mal[1] + IN_DY] : sym === 'mal2' ? ctx.mal2
      : sym === 'hog' ? [HOG_MITT[0] - KW / 2, HOG_MITT[1] - KH / 2] : null;
    return p ? p[prop === 'x' ? 0 : 1] : 0;
  }
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
  starta(s) {
    const ob = s.ob, p = s.p;
    const gammal = this.aktiva.find(a => a.ob === ob && a.p === p);
    if (gammal && s.svag) return;
    const t0 = s.k[0].t, nu0 = gammal ? this.vardeI(gammal, t0) : ob.v[p];
    for (const k of s.k) k.v = k.sym === 'cur' ? nu0 : this.varde(k.sym, ob, p, s.ctx);
    if (gammal) {
      if (['x', 'y', 'r', 's'].includes(p) && s.k.length > 1) {
        const v0 = (this.vardeI(gammal, t0) - this.vardeI(gammal, t0 - 4)) / 4;
        const a = s.k[0], b = s.k[1], delta = b.v - a.v, D = b.t - a.t;
        const bas = EASE[a.e] && EASE[a.e].b;
        if (Array.isArray(bas) && Math.abs(delta) > .01 && D > 0 && Math.abs(v0) > 1e-4) {
          const x1 = Math.max(bas[0], .15), k = v0 * D / delta;
          a.bez = bezier([x1, Math.max(-1.2, Math.min(k * x1, 3)), bas[2], bas[3]]);
        }
      }
      this.aktiva = this.aktiva.filter(a => a !== gammal);
    }
    this.aktiva.push(s);
  }
  steg(T) {
    while (this.vantar.length && this.vantar[0].k[0].t <= T) this.starta(this.vantar.shift());
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
    this.q = this.q.filter(x => x.kort !== ob);
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
  /* Utan skärm: kör klockan i steg om 16 ms fram till T. */
  spola(T) { while (this.klocka < T) { const n = this.sist + 16; this.tick(n); } }
  hoppa() {
    if (!this.q.length) return;
    const d = this.q[0].t - this.klocka;
    for (const x of this.q) x.t -= d;
  }
  stopp() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
}

class Bord {
  /* opt: minskad(), namnMs(), logga(txt), gravN(n) */
  constructor(m, opt) { this.m = m; this.opt = opt; this.lopp = null; }
  spec() { return this.opt.minskad() ? SPEC.R : SPEC.D; }

  /* Faserna för en händelse: [{ kind, at }] i ms från händelsens början. */
  faser(id) {
    const n = this.opt.namnMs(), w = SPEC.D.vanta, ut = [];
    const plus = (kind, at) => ut.push({ kind, at });
    if (id === 'utspel') { plus('syns', 0); if (n >= 2500) plus('claude', 1500); plus('namn', n); }
    if (id === 'knuff') plus('knuff', 0);
    if (id === 'flytt' || id === 'avbrott') {
      plus('tappad', 0); plus('syns', 1000); plus('flytt', 1000 + n);
      if (id === 'avbrott') plus('avbrott', 1000 + n + 210);
    }
    if (id === 'tappat') { plus('tappad', 0); plus('nedtonad', w); }
    if (id === 'tillbaka') { plus('syns', 0); plus('tillbaka', n); }
    if (id === 'tillbakaNy') { plus('syns', 0); plus('tillbakaNy', n); }
    if (id === 'grav') { plus('tappad', 0); plus('grav', 900); }
    if (id === 'tap') plus(this.m.o[SCEN.tap.kort].v.tappad ? 'untap' : 'tap', 0);
    return ut.sort((a, b) => a.at - b.at);
  }

  kor(id) {
    const m = this.m, S = SCEN[id], kort = m.o[S.kort];
    if (!S.ingenSetup) {
      /* Förbered: bara kortet händelsen gäller, direkt och utan rörelse. */
      const rora = [kort];
      if (id === 'grav') rora.push(m.o.hog, m.o.hogring, m.o.hogtal);
      for (const ob of rora) m.glom(ob);
      Object.assign(kort.v, grund(kort.id));
      if (S.dimmad) kort.v.dim = 1;
      if (id === 'grav') this.hogAterstall();
      for (const ob of rora) m.mala(ob);
    }
    const faser = this.faser(id), t0 = m.klocka;
    this.lopp = { id, t0, faser: faser.map(f => ({ kind: f.kind, at: t0 + f.at })) };
    const ctx = { kort, mal: S.vid === 'hem' ? BAS[S.kort].hem : S.vid ? PUNKT[S.vid] : null, mal2: S.mal2 ? PUNKT[S.mal2] : null };
    faser.forEach((f, i) => m.senare(f.at, () => this.fas(f.kind, ctx, i), S.ingenSetup ? null : kort));
    m.igang();
  }
  fas(kind, ctx, i) {
    const m = this.m, kort = ctx.kort, nu = m.fasTid != null ? m.fasTid : m.klocka, namn = BAS[kort.id].namn;
    if (this.lopp && this.lopp.faser[i]) this.lopp.faser[i].at = nu;
    if (kind === 'tap' || kind === 'untap') {
      kind = kort.v.tappad ? 'untap' : 'tap'; kort.v.tappad = !kort.v.tappad;
      if (this.lopp && this.lopp.id === 'tap') this.lopp.faser[0].kind = kind;
    }
    const spar = this.spec()[kind] || [];
    if (kind === 'namn') { Object.assign(kort.v, { x: ctx.mal[0], y: ctx.mal[1] + IN_DY, o: 0 }); kort.v.z = ++m.topZ; m.mala(kort); }
    if (kind === 'flytt' || kind === 'tillbakaNy' || kind === 'grav') { kort.v.z = ++m.topZ; m.mala(kort); }
    if (kind === 'avbrott') kort.v.tappad = true;
    if (kind === 'grav') {
      const hogT = spar.filter(t => /^hog/.test(t[0])).map(t => t[2][0][0]);
      m.senare(hogT.length ? Math.min(...hogT) : 0, () => {
        for (const e of m.o.hog.els) e.el.src = e.el.dataset.src;
        Object.assign(m.o.hog.v, hogGrund()); m.mala(m.o.hog);
        this.opt.gravN(3);
      }, m.o.hog);
    }
    const mal = { kort, hog: m.o.hog, hogring: m.o.hogring, hogtal: m.o.hogtal };
    for (const t of spar) { const ob = mal[t[0]]; if (ob) m.lagg(t, ob, nu, ctx); }
    const LOGG = {
      syns: 'Kameran ser något nytt — visas inte än',
      claude: 'Kameran frågar Claude — visas fortfarande inte',
      namn: 'Namnet: ' + namn + ' → läggs ned',
      knuff: 'Kameran följer ' + namn + ': den har flyttats en bit',
      tappad: 'Kameran ser inte ' + namn + ' — står kvar',
      flytt: namn + ' ligger på en ny plats → bärs dit',
      avbrott: 'Ny rapport: längre bort, och tappat',
      nedtonad: 'Ingen ny plats, ingen hög växte på 5 s → nedtonat',
      tillbaka: namn + ' syns igen → tänds',
      tillbakaNy: namn + ' syns igen, på ny plats → bärs dit',
      grav: 'Graveyard-högen växer 2 → 3 → ' + namn + ' flyger dit',
      tap: 'Kameran är säker: ' + namn + ' är tappat',
      untap: 'Kameran är säker: ' + namn + ' är otappat',
    };
    this.opt.logga(LOGG[kind], this.lopp ? nu - this.lopp.t0 : 0);
    m.igang();
  }
  hogAterstall() {
    const m = this.m;
    for (const e of m.o.hog.els) e.el.removeAttribute('src');
    Object.assign(m.o.hog.v, hogGrund()); Object.assign(m.o.hogring.v, { s: .5, o: 0 }); m.o.hogtal.v.s = 1;
    m.mala(m.o.hog); m.mala(m.o.hogring); m.mala(m.o.hogtal);
    this.opt.gravN(2);
  }
  aterstallAllt() {
    const m = this.m;
    m.q = []; m.aktiva = []; m.vantar = [];
    for (const id in BAS) { m.o[id].v = grund(id); m.mala(m.o[id]); }
    this.hogAterstall();
    this.lopp = null;
  }
}

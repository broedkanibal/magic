/* ── Motorn: klockan, spåren och lagren ────────────────────────────────
   Som i D: en klocka, en kö med det som händer och spår som räknas fram
   varje bildruta. Motorn skriver transform, opacitet och filter direkt på
   lagren. Nytt i E: objekt av flera slag — mattans kort, det fysiska
   bordets kort, händerna, mattans yta (zoom och utsnitt), högarna och
   raden "→ hand". Allt räknas i bordets px: mattan i 100 % visar 1424 × 898,
   kameran ser 1900 × 1198 (det fysiska bordet). Det fysiska bordet och
   mattan använder samma koordinater: trogen plats. */

const BW = 1424, BH = 898;                  // mattan i 100 %: MATTA.VP
const CW = 1900, CH = 1198;                 // hela kamerabilden
const KW = 178, KH = 248;                   // MATTA.CW × MATTA.CH
const ZM = 792 / BW;                        // mattans skala på artboarden
const ZP = 560 / CW;                        // det fysiska bordets skala
const ZSTEG = [1, .86, BW / CW];            // zoomstegen; det sista är golvet: hela kamerabilden
const HW = 210, HH = 260;                   // handen
const IN_DY = 90;                           // ett utspelat kort kommer 90 px från spelarens håll
const MARG = 2 * KW + 60;                   // plats för ungefär två kort till
/* Högarna ligger där de ligger på bordet (MES-334, D1): samma px på det
   fysiska bordet och på mattan, och de följer mattans zoom. Ingen fast
   högkolumn. */
const FHOG = [30, 512], FBIB = [234, 512];

const BAS = {
  llanowar:  { namn: 'Llanowar Elves', hem: [430, 70], z: 10 },
  serra:     { namn: 'Serra Angel', hem: [640, 70], z: 11 },
  woodelves: { namn: 'Wood Elves', hem: [850, 70], z: 12 },
  forest1:   { namn: 'Forest', hem: [450, 470], z: 1 },
  forest2:   { namn: 'Forest', hem: [650, 470], z: 2 },
  plains1:   { namn: 'Plains', hem: [850, 470], z: 3 },
  plains2:   { namn: 'Plains', hem: [1050, 470], z: 4 },
  anthem:    { namn: 'Glorious Anthem', hem: [1080, 70], z: 13, ute: true },
  okand:     { namn: 'Faithful Pikemaster', hem: [1080, 70], z: 14, ute: true },
};
const LEKEN = ['Faithful Pikemaster', 'Glorious Anthem', 'Llanowar Elves', 'Serra Angel', 'Wood Elves', 'Forest', 'Plains'];
const BILD_AV = { 'Faithful Pikemaster': 'okand', 'Glorious Anthem': 'anthem', 'Llanowar Elves': 'llanowar', 'Serra Angel': 'serra', 'Wood Elves': 'woodelves', Forest: 'forest1', Plains: 'plains1' };

const sek = ms => (ms / 1000).toFixed(ms % 100 ? 2 : 1).replace('.', ',') + ' s';
const tal = v => String(Math.round(v * 1000) / 1000).replace('.', ',');
const mitt = p => [p[0] + KW / 2, p[1] + KH / 2];

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

const kortGrund = id => { const b = BAS[id]; return { x: b.hem[0], y: b.hem[1], r: 0, s: 1, o: b.ute ? 0 : 1, lift: 0, blur: 0, ring: 1, glow: 0, grav: 0, z: b.z, tappad: false }; };
const GRUND = {
  kort: kortGrund,
  fys: id => { const b = BAS[id]; return { x: b.hem[0], y: b.hem[1], r: 0, s: 1, o: b.ute ? 0 : 1, lift: 0, z: b.z }; },
  hand: () => ({ x: 900, y: CH + 80, r: 0, o: 0 }),
  yta: () => ({ zf: 1, vx: 0, vy: 0, o: 1 }),
  hog: () => ({ o: 0, s: 1 }),
  hogring: () => ({ s: .5, o: 0 }),
  hogtal: () => ({ s: 1 }),
  bib: () => ({ s: 1 }),
  rad: () => ({ p: 0 }),
};

/* Mattans kort: lagren som stilar. sudd = hur suddigt kamerans foto är (px). */
function kortStil(v, sudd) {
  const tapp = Math.min(1, Math.abs(v.r) / 90);
  /* Graveyard-tonen är D1:s (grayscale .45, brightness .75), samma som högens kort, så bytet syns inte. */
  const ljus = (1 - .14 * tapp) * (1 - .25 * v.grav);
  const filter = v.grav > .001 || tapp > .001
    ? `grayscale(${(.45 * v.grav).toFixed(3)}) brightness(${ljus.toFixed(3)}) saturate(${(1 - .06 * tapp).toFixed(3)})` : 'none';
  const rp = Math.max(0, Math.min(1, v.ring)), spread = 12 * rp, b = Math.max(0, Math.min(1, v.blur));
  return {
    el: { transform: `translate(${v.x.toFixed(2)}px,${v.y.toFixed(2)}px) rotate(${v.r.toFixed(2)}deg) scale(${v.s.toFixed(4)})`, opacity: v.o, visibility: v.o > .001 ? 'visible' : 'hidden', zIndex: v.z },
    sh: { opacity: v.lift },
    face: { filter },
    foto: { opacity: Math.min(1, b * 1.6).toFixed(3), filter: `blur(${(sudd * (.35 + .65 * b)).toFixed(2)}px) saturate(.72) brightness(.9) contrast(.92)` },
    glans: { opacity: (.55 * b).toFixed(3) },
    ring: { opacity: rp < 1 ? +(.53 * (1 - rp)).toFixed(3) : 0, transform: `scale(${1 + 2 * spread / KW},${1 + 2 * spread / KH})` },
    glow: { opacity: v.glow },
  };
}
const stilText = o => Object.entries(o).map(([k, v]) => k.replace(/[A-Z]/g, c => '-' + c.toLowerCase()) + ': ' + v).join('; ');

class Motor {
  /* ab: fart(), sudd(), efterBild() */
  constructor(rot, ab) {
    this.ab = ab; this.klocka = 0; this.q = []; this.vantar = []; this.aktiva = []; this.raf = 0; this.sist = 0; this.topZ = 100; this.fasTid = null;
    this.o = {};
    const ny = (nyckel, typ, id) => { this.o[nyckel] = { nyckel, typ, id, v: GRUND[typ](id), els: [] }; };
    for (const id in BAS) { ny('m:' + id, 'kort', id); ny('f:' + id, 'fys', id); }
    for (const h of ['h1', 'h2']) ny(h, 'hand', h);
    for (const t of ['yta', 'hog', 'hogring', 'hogtal', 'bib', 'rad']) ny(t, t, t);
    this.fastna(rot);
  }
  fastna(rot) {
    this.rot = rot;
    for (const k in this.o) this.o[k].els = [];
    if (!rot) return;
    const q = (el, s) => el.querySelector(s);
    for (const el of rot.querySelectorAll('[data-k]')) {
      this.o['m:' + el.dataset.k].els.push({ el, sh: q(el, '.k-sh'), face: q(el, '.k-face'), foto: q(el, '.k-foto'), glans: q(el, '.k-glans'), ring: q(el, '.k-ring'), glow: q(el, '.k-glow') });
    }
    for (const el of rot.querySelectorAll('[data-f]')) this.o['f:' + el.dataset.f].els.push({ el, sh: q(el, '.fk-sh') });
    for (const el of rot.querySelectorAll('[data-hand]')) this.o[el.dataset.hand].els.push({ el });
    const yta = rot.querySelector('[data-yta]'), vy = rot.querySelector('[data-vy]');
    if (yta) this.o.yta.els.push({ el: yta, vy });
    for (const n of ['hog', 'hogring', 'hogtal', 'bib']) { const el = rot.querySelector(`[data-${n}]`); if (el) this.o[n].els.push({ el }); }
    for (const k in this.o) this.mala(this.o[k]);
  }
  mala(ob) {
    const v = ob.v;
    if (ob.typ === 'kort') {
      const sudd = this.ab.sudd();
      for (const e of ob.els) {
        const s = kortStil(v, sudd);
        Object.assign(e.el.style, s.el);
        for (const l of ['sh', 'face', 'foto', 'glans', 'ring', 'glow']) Object.assign(e[l].style, s[l]);
      }
      return;
    }
    if (ob.typ === 'fys') {
      for (const e of ob.els) {
        Object.assign(e.el.style, { transform: `translate(${v.x.toFixed(1)}px,${v.y.toFixed(1)}px) rotate(${v.r.toFixed(2)}deg) scale(${v.s.toFixed(4)})`, opacity: v.o, visibility: v.o > .001 ? 'visible' : 'hidden', zIndex: v.z });
        e.sh.style.opacity = v.lift;
      }
      return;
    }
    if (ob.typ === 'hand') {
      for (const e of ob.els) Object.assign(e.el.style, { transform: `translate(${v.x.toFixed(1)}px,${v.y.toFixed(1)}px) rotate(${v.r.toFixed(2)}deg)`, opacity: v.o, visibility: v.o > .001 ? 'visible' : 'hidden' });
      return;
    }
    if (ob.typ === 'yta') {
      for (const e of ob.els) {
        e.el.style.transform = `scale(${(ZM * v.zf).toFixed(5)}) translate(${(-v.vx).toFixed(1)}px,${(-v.vy).toFixed(1)}px)`;
        e.el.style.opacity = v.o;
        e.el.style.setProperty('--inv', (1 / (ZM * v.zf)).toFixed(4));   // brickorna behåller sin storlek
        if (e.vy) Object.assign(e.vy.style, { transform: `translate(${v.vx.toFixed(1)}px,${v.vy.toFixed(1)}px)`, width: (BW / v.zf).toFixed(1) + 'px', height: (BH / v.zf).toFixed(1) + 'px' });
      }
      return;
    }
    if (ob.typ === 'hog') { for (const e of ob.els) { e.el.style.transform = `scale(${v.s})`; e.el.style.opacity = v.o; } return; }
    if (ob.typ === 'hogring') { for (const e of ob.els) { e.el.style.transform = `scale(${v.s})`; e.el.style.opacity = v.o; } return; }
    if (ob.typ === 'hogtal' || ob.typ === 'bib') { for (const e of ob.els) e.el.style.transform = `scale(${v.s})`; return; }
    if (ob.typ === 'rad') {
      const bar = this.rot && this.rot.querySelector('[data-radbar]');
      if (bar) bar.style.transform = `scaleX(${Math.max(0, v.p).toFixed(4)})`;
    }
  }

  /* ── spåren ── */
  varde(sym, ob, p, ctx) {
    if (typeof sym === 'number') return sym;
    if (ob.typ === 'yta') return ctx.yta[sym];
    if (sym === 'hogS' || sym === 'bibS') return ctx[sym];
    const pos = ctx[sym === 'in' ? 'mal' : sym];
    if (!pos) return ob.v[p];
    return p === 'x' ? pos[0] : pos[1] + (sym === 'in' ? IN_DY : 0);
  }
  lagg(spec, ob, t0, ctx) {
    const [, prop, nycklar, flagga] = spec;
    for (const p of prop === 'pos' ? ['x', 'y'] : [prop]) {
      this.vantar.push({ ob, p, ctx, svag: flagga === 'svag', k: nycklar.map(([t, v, e]) => ({ t: t0 + t, sym: v, e: e || 'LIN' })) });
    }
    this.vantar.sort((a, b) => a.k[0].t - b.k[0].t);
  }
  /* Ett eget spår: från där egenskapen står till ett värde. */
  till(ob, p, varde, t0, dur, e) {
    this.vantar.push({ ob, p, ctx: {}, k: dur > 0 ? [{ t: t0, sym: 'cur', e: e || 'INOUT' }, { t: t0 + dur, sym: varde }] : [{ t: t0, sym: varde }] });
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
      if (['x', 'y', 'r', 's', 'zf', 'vx', 'vy'].includes(p) && s.k.length > 1) {
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

  /* ── klockan ── */
  senare(t, fn) { this.q.push({ t, fn }); this.q.sort((a, b) => a.t - b.t); this.igang(); }
  igang() { if (!this.raf && this.rot) { this.sist = performance.now(); this.raf = requestAnimationFrame(n => this.tick(n)); } }
  tick(nu) {
    this.raf = 0;
    const dt = Math.min(64, nu - this.sist) * this.ab.fart(); this.sist = nu;
    this.klocka += dt;
    /* En händelse räknas från sin egen tid, inte från bildrutan den råkade
       hamna i — annars står kortet still en bildruta. */
    while (this.q.length && this.q[0].t <= this.klocka) { const x = this.q.shift(); this.fasTid = x.t; x.fn(); this.fasTid = null; }
    this.steg(this.klocka);
    if (this.ab.efterBild) this.ab.efterBild(this.klocka);
    if (this.q.length || this.aktiva.length || this.vantar.length) this.igang();
  }
  /* Utan skärm: kör klockan i steg om 16 ms fram till T. */
  spola(T) { while (this.klocka < T) { const n = this.sist + 16; this.tick(n); } }
  nu() { return this.fasTid != null ? this.fasTid : this.klocka; }
  glom(ob) { this.aktiva = this.aktiva.filter(s => s.ob !== ob); this.vantar = this.vantar.filter(s => s.ob !== ob); }
  tom() { this.q = []; this.aktiva = []; this.vantar = []; }
  stopp() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
}

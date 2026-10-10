/* Uppspelarens motor (MES-333). Körs INNE i appens sida — index.html eller
   den fil kor.cjs fått med --fil — och spelar upp telefonens bord genom
   appens riktiga avstamBord, med appens riktiga mattan (matSynk, FLIP).

   Klockan är simulerad. När motorn är på:
     - Date.now() ger uppspelningens tid, inte väggklockan,
     - setTimeout/setInterval som appen ställer under uppspelningen läggs i
       en egen kö och körs när klockan passerar deras tid (nådtimern i
       avstamBord, nykortets omritning efter 2,6 s, toasterna …),
     - varje Web Animation som skapas (el.animate: kortens glid, vridning,
       lyft och skugga, mattans zoom) får sin starttid på uppspelningens
       klocka, och ställs före varje steg och varje mätning på den tid
       klockan säger. Animeringen fortsätter att "köra" (playState running),
       så appens egen avbrottslogik (matKor, matNu, matFart) ser det den ser
       i en riktig sida,
     - Math.random är fröad, så att kortens cid (uid) blir desamma varje gång.
   Hela uppspelningen går synkront i ett svep (korFall). Inget som tar
   väggklocka (nätet, bilder som laddas) hinner emellan, så två körningar på
   samma index.html ger samma tal.

   Visaren (visa.html) använder samma motor i en iframe: där driver videons
   tid klockan (till), och bakåtspolning laddar om sidan och spelar fram.

   Ingenting här ändrar appens kod. Motorn byter globala funktioner
   (Date.now, setTimeout, Element.prototype.animate) i den sida den laddas
   i — bara i uppspelarens egen huvudlösa Chrome eller visarens iframe. */
(function () {
  'use strict';
  if (window.__upp) return;
  const U = window.__upp = { version: 1 };

  /* ── klockan ─────────────────────────────────────────────────────── */
  const VIRT0 = 1790000000000;          // 2026-09-21: klockan börjar långt från 0 (0 betyder "aldrig" på flera ställen i appen)
  let virt = VIRT0, pa = false;
  const riktigNu = Date.now.bind(Date);
  Date.now = function () { return pa ? virt : riktigNu(); };
  U.ms = s => VIRT0 + Math.round(s * 1000);
  U.sek = t => (t - VIRT0) / 1000;
  U.nu = () => virt;

  /* Appens timrar under uppspelningen: en kö på uppspelningens klocka.
     Motorn laddas före appen (kor.cjs och visaren lägger den först i
     sidan), så timrar appen ställer när den startar — renderAutoBar varje
     sekund, kamerapricken, strömmen — fångas också: när uppspelningen
     börjar stoppas de riktiga och läggs i kön med samma takt. */
  const rST = window.setTimeout, rCT = window.clearTimeout, rSI = window.setInterval, rCI = window.clearInterval;
  let ko = [], timN = 0;
  const TID0 = 900000000;
  const forTimrar = new Map();   // timrar från före uppspelningen: riktigt id → { fn, ms, args, period, due }
  function kolagg(fn, ms, args, period, alias) { const id = TID0 + (++timN); ko.push({ id, t: virt + Math.max(0, +ms || 0), fn, args, period, n: timN, alias }); return id; }
  window.setTimeout = function (fn, ms, ...args) {
    if (pa && typeof fn === 'function') return kolagg(fn, ms, args, 0);
    if (typeof fn !== 'function') return rST.call(window, fn, ms, ...args);
    let id; id = rST.call(window, (...a) => { forTimrar.delete(id); fn(...a); }, ms, ...args);
    forTimrar.set(id, { fn, ms: +ms || 0, args, period: 0, due: riktigNu() + (+ms || 0) });
    return id;
  };
  window.setInterval = function (fn, ms, ...args) {
    if (pa && typeof fn === 'function') return kolagg(fn, ms, args, Math.max(1, +ms || 0));
    const id = rSI.call(window, fn, ms, ...args);
    if (typeof fn === 'function') forTimrar.set(id, { fn, ms: Math.max(1, +ms || 0), args, period: Math.max(1, +ms || 0) });
    return id;
  };
  const rensa = id => { const f = ko.length; ko = ko.filter(x => x.id !== id && x.alias !== id); return ko.length !== f; };
  window.clearTimeout = function (id) { if (typeof id === 'number' && (id > TID0 || rensa(id))) { rensa(id); return; } forTimrar.delete(id); rCT.call(window, id); };
  window.clearInterval = function (id) { if (typeof id === 'number' && (id > TID0 || rensa(id))) { rensa(id); return; } forTimrar.delete(id); rCI.call(window, id); };
  /* Uppspelningen börjar: de riktiga timrarna stoppas och går vidare i kön. */
  function flyttaTimrar() {
    const nu = riktigNu();
    for (const [id, x] of forTimrar) {
      rCT.call(window, id); rCI.call(window, id);
      kolagg(x.fn, x.period ? x.period : Math.max(0, x.due - nu), x.args, x.period, id);
    }
    forTimrar.clear();
  }
  function nastaTimer() { let b = null; for (const x of ko) if (!b || x.t < b.t || (x.t === b.t && x.n < b.n)) b = x; return b; }

  /* En bildruta: det webbläsaren gör mellan två uppgifter och som appen
     lyssnar på — requestAnimationFrame och ResizeObserver (index.html:
     bordsvyn ritar om mattan när rutan runt den ändrar storlek). Under
     uppspelningen körs de här, efter varje steg, på uppspelningens klocka;
     webbläsarens egna leveranser släpps inte fram. */
  const rRaf = window.requestAnimationFrame, rCaf = window.cancelAnimationFrame;
  let rafKo = [], rafN = 0;
  window.requestAnimationFrame = function (fn) { if (!pa) return rRaf.call(window, fn); const id = 800000000 + (++rafN); rafKo.push({ id, fn }); return id; };
  window.cancelAnimationFrame = function (id) { if (id > 800000000) rafKo = rafKo.filter(x => x.id !== id); else rCaf.call(window, id); };
  const RRO = window.ResizeObserver, observatorer = new Set();
  if (RRO) {
    window.ResizeObserver = class extends RRO {
      constructor(cb) { super((e, o) => { if (!pa) cb(e, o); }); this.__cb = cb; this.__mal = new Map(); observatorer.add(this); }
      observe(t, o) { super.observe(t, o); this.__mal.set(t, null); }
      unobserve(t) { super.unobserve(t); this.__mal.delete(t); }
      disconnect() { super.disconnect(); this.__mal.clear(); }
    };
  }
  const storlekAv = t => { const r = t.getBoundingClientRect(); return { w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100 }; };
  function storlekarNu() { for (const o of observatorer) for (const t of o.__mal.keys()) o.__mal.set(t, storlekAv(t)); }
  function bildruta() {
    for (let varv = 0; varv < 4; varv++) {
      const raf = rafKo; rafKo = [];
      for (const x of raf) try { x.fn(virt); } catch (e) { if (L) L.fel.push('requestAnimationFrame: ' + (e && e.message || e)); }
      let levererat = false;
      for (const o of observatorer) {
        const poster = [];
        for (const [t, f] of o.__mal) {
          const n = storlekAv(t);
          if (!f || f.w !== n.w || f.h !== n.h) { o.__mal.set(t, n); poster.push({ target: t, contentRect: { width: n.w, height: n.h, x: 0, y: 0, top: 0, left: 0, right: n.w, bottom: n.h }, borderBoxSize: [{ inlineSize: n.w, blockSize: n.h }], contentBoxSize: [{ inlineSize: n.w, blockSize: n.h }] }); }
        }
        if (poster.length) { levererat = true; try { o.__cb(poster, o); } catch (e) { if (L) L.fel.push('ResizeObserver: ' + (e && e.message || e)); } }
      }
      if (!levererat && !rafKo.length) break;
    }
  }

  /* Nätet under uppspelningen: ett anrop som aldrig svarar. Kortens
     uppslag (resolveAll) väntar då som i ett spel där leken redan finns
     lokalt — inget svar kommer in mitt i uppspelningen och ritar om mattan
     vid en tid som beror på nätet. Huvudlöst kommer inget svar ändå (hela
     körningen är ett svep), och visaren beter sig då likadant. */
  const rFetch = window.fetch;
  window.fetch = function (...a) { return pa ? new Promise(() => {}) : rFetch.apply(window, a); };

  /* Fröat Math.random (mulberry32): uid() i appen blandar slump och klocka. */
  const rRandom = Math.random;
  let fro = 1;
  function slump() { fro |= 0; fro = fro + 0x6D2B79F5 | 0; let t = Math.imul(fro ^ fro >>> 15, 1 | fro); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  Math.random = function () { return pa ? slump() : rRandom(); };

  /* ── animeringarna på uppspelningens klocka ─────────────────────── */
  const anims = new Set();
  const rAnimate = Element.prototype.animate;
  Element.prototype.animate = function (k, o) {
    const a = rAnimate.call(this, k, o);
    if (pa) { a.__v0 = virt; anims.add(a); }
    return a;
  };
  function synka() {
    for (const a of anims) {
      const ps = a.playState;
      if (ps === 'idle' || ps === 'finished') { anims.delete(a); continue; }
      const slut = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming().endTime : Infinity;
      const t = Math.max(0, virt - a.__v0);
      if (t >= slut) { a.currentTime = slut; anims.delete(a); }
      else if (a.currentTime !== t) a.currentTime = t;
    }
  }

  /* ── läsningen av mattan ─────────────────────────────────────────── */
  const CW = () => (typeof MATTA !== 'undefined' ? MATTA.CW : 178);
  const serie = new WeakMap(); let serN = 0;
  const serOf = el => { let s = serie.get(el); if (!s) { s = ++serN; serie.set(el, s); } return s; };
  const mig = () => (typeof minSpelare === 'function' ? minSpelare() : player());
  /* Kortens element på min matta: nyckeln c:<cid> i matSynk. Läget i
     brädkoordinater: elementets mitt (left/top + halva måttet) plus den
     förskjutning en rörelse ger just nu (translate). Mattans zoom och pan
     ingår inte — de räknas för sig. */
  function kortEl() {
    const ut = [];
    for (const el of gridEl.children) { const m = el._mat; if (m && m.nyckel && m.nyckel.startsWith('c:')) ut.push(el); }
    return ut;
  }
  function lage(el) {
    const s = getComputedStyle(el), tr = String(s.translate || 'none').split(/\s+/);
    const dx = tr[0] === 'none' ? 0 : parseFloat(tr[0]) || 0, dy = tr[0] === 'none' ? 0 : parseFloat(tr[1] || '0') || 0;
    const l = parseFloat(el.style.left) || 0, t = parseFloat(el.style.top) || 0, w = parseFloat(el.style.width) || CW(), h = parseFloat(el.style.height) || 248;
    return { lx: l + w / 2, ly: t + h / 2, vx: l + w / 2 + dx, vy: t + h / 2 + dy, w, h };
  }
  /* En flytt eller knuff som går just nu (matGlid i index.html, el._matA.pos). */
  const glider = el => !!(el._matA && el._matA.pos && el._matA.pos.playState === 'running');
  function lasPos() { const m = new Map(); for (const el of kortEl()) m.set(serOf(el), Object.assign(lage(el), { glid: glider(el) })); return m; }
  function zonen(c) { try { return zonAv(c); } catch (e) { return c.zon || ''; } }
  /* Det motorn läser ur appens inre (mattans transform, nycklarna c:/p:,
     klassen .lyft) går inte alltid att lita på när appen ändras. Går en
     läsning inte att tolka skrivs det som ett fel, och kor.cjs avbryter
     med slutkod 2 — en mätning som tystnar får inte se ut som 0. */
  const tolk = (vad) => { if (L && !L.tolkSett.has(vad)) { L.tolkSett.add(vad); L.fel.push('tolkning: ' + vad); } };
  function grid() {
    const t = gridEl._matT || '', m = /translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px\)\s*scale\(([\d.]+)\)/.exec(t);
    if (t && !m) tolk('mattans transform (gridEl._matT) går inte att läsa: ' + t.slice(0, 80));
    if (pa && !t) tolk('mattans transform (gridEl._matT) saknas');
    /* Glider: mattans egen rörelse (matBradeSkriv), eller CSS-övergången bordsvyn och zoomknapparna sätter (.bordglid, .glider). */
    return { t, z: m ? +m[3] : null, px: m ? +m[1] : null, py: m ? +m[2] : null, glider: !!(gridEl._matZoom && gridEl._matZoom.playState === 'running') || gridEl.classList.contains('bordglid') || gridEl.classList.contains('glider') };
  }

  /* ── loggen ──────────────────────────────────────────────────────── */
  let L = null;          // allt som samlas under en körning
  function nyLogg(opt) {
    return {
      opt, kort: new Map(), platser: new Map(), hopp: [], grid: [], utanfor: [], ogon: [],
      steg: 0, rapporter: 0, hjartslag: 0, timrar: 0, prov: 0,
      forraProv: null, forraProvT: null, snabbSist: new Map(), teleport: new Set(), fel: [], tolkSett: new Set(), sattKortEl: false
    };
  }
  /* Ett kortelement: födsel, död (och varför), nedtoningar, chip och banan
     (bara när läget ändrats mer än en halv pixel). */
  function kortPost(el, c, t) {
    const s = serOf(el);
    let k = L.kort.get(s);
    if (!k) {
      const cid = el._mat.nyckel.slice(2);
      k = { s, cid, namn: c ? c.name : (el.getAttribute('aria-label') || ''), fodd: t, dod: null, dodSom: null,
            zonFodd: c ? zonen(c) : '', lyft: [], chip: [], bana: [], sparFodd: c && c.spar != null ? c.spar : null };
      L.kort.set(s, k);
    }
    return k;
  }
  /* Läser mattan och för loggen framåt. fullt: också bana, utanför kanten
     och mattans transform (vid klockans mätpunkter); annars bara födslar,
     dödsfall, nedtoningar och chip (efter varje steg). */
  function observera(t, fullt) {
    const p = mig(), cards = new Map(((p && p.cards) || []).map(c => [c.cid, c]));
    const sedda = new Set();
    const cw = CW();
    let vp = null;
    if (fullt) { const r = gridWrap.getBoundingClientRect(); vp = { l: r.left, t: r.top, r: r.right, b: r.bottom }; }
    for (const el of kortEl()) {
      const cid = el._mat.nyckel.slice(2), c = cards.get(cid);
      if (!c) tolk('ett c:-element vars kort inte finns i mig.cards');
      L.sattKortEl = true;
      const k = kortPost(el, c, t);
      sedda.add(k.s);
      if (c && k.namn !== c.name) k.namn = c.name;
      const lyft = el.classList.contains('lyft');
      if (c && (c.lyft != null) !== lyft) tolk('klassen .lyft stämmer inte med kortets lyft (' + (c.lyft != null ? 'lyft utan klass' : 'klass utan lyft') + ')');
      const sistaL = k.lyft[k.lyft.length - 1];
      if (lyft && !(sistaL && sistaL[1] == null)) k.lyft.push([t, null]);
      if (!lyft && sistaL && sistaL[1] == null) sistaL[1] = t;
      const chipEl = el.querySelector(':scope > .kortchip'), chip = chipEl ? chipEl.textContent.trim() : '';
      const sistaC = k.chip[k.chip.length - 1];
      if (sistaC && sistaC[2] == null && sistaC[0] !== chip) sistaC[2] = t;
      if (chip && !(sistaC && sistaC[2] == null && sistaC[0] === chip)) k.chip.push([chip, t, null]);
      if (fullt) {
        const g = lage(el), b = k.bana[k.bana.length - 1];
        if (!b || Math.abs(b[1] - g.vx) > 0.5 || Math.abs(b[2] - g.vy) > 0.5 || Math.abs(b[3] - g.lx) > 0.5 || Math.abs(b[4] - g.ly) > 0.5)
          k.bana.push([t, +g.vx.toFixed(1), +g.vy.toFixed(1), +g.lx.toFixed(1), +g.ly.toFixed(1), el.classList.contains('tappad') ? 1 : 0]);
        /* Utanför mattans kant: kortets ruta på skärmen (med mattans zoom,
           pan och kortets egen rörelse) sticker ut ur mattans fönster. */
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.left < vp.l - 2 || r.top < vp.t - 2 || r.right > vp.r + 2 || r.bottom > vp.b + 2)) L.utanfor.push([t, k.s]);
      }
    }
    /* Döda element: vad hände med kortet? */
    for (const k of L.kort.values()) {
      if (k.dod != null || sedda.has(k.s)) continue;
      k.dod = t;
      const c = cards.get(k.cid);
      const ers = [...sedda].some(s => s !== k.s && L.kort.get(s).cid === k.cid && L.kort.get(s).fodd === t);
      k.dodSom = ers ? 'utbytt element' : !c ? 'borttaget' : (zonen(c) === 'grav' ? 'graveyard' : zonen(c) === 'exil' ? 'exile' : /hand/i.test(zonen(c)) ? 'hand' : 'inte på mattan');
      const sl = k.lyft[k.lyft.length - 1]; if (sl && sl[1] == null) sl[1] = t;
      const sc = k.chip[k.chip.length - 1]; if (sc && sc[2] == null) sc[2] = t;
    }
    /* Allt annat som syns på mattan och inte är ett kort eller en hög
       (h:): platshållarna i dag (.plats, nyckeln p:<spår>), och det som
       ersätter dem (ett oframkallat kort, MES-344) utan att motorn behöver
       ändras. Texten: .platstxt, annars elementets egen. */
    const pSedda = new Set();
    for (const el of gridEl.children) {
      const m = el._mat;
      if (!m || !m.nyckel) {
        if (el.matches('.card[data-cid], .plats')) tolk('ett kort eller en platshållare på mattan utan matSynk-nyckel');
        continue;
      }
      if (el.matches('.card[data-cid]') && !m.nyckel.startsWith('c:') && !m.nyckel.startsWith('h:')) tolk('.card-element med nyckeln ' + m.nyckel.split(':')[0] + ': (väntade c:)');
      if (el.matches('.plats') && !m.nyckel.startsWith('p:')) tolk('.plats-element med nyckeln ' + m.nyckel.split(':')[0] + ': (väntade p:)');
      if (m.nyckel.startsWith('c:') || m.nyckel.startsWith('h:')) continue;
      const s = serOf(el); pSedda.add(s);
      let q = L.platser.get(s);
      const txtEl = el.querySelector('.platstxt'), txt = ((txtEl || el).textContent || '').trim().slice(0, 80);
      const l = parseFloat(el.style.left) || 0, tp = parseFloat(el.style.top) || 0, w = parseFloat(el.style.width) || cw, h = parseFloat(el.style.height) || 248;
      const ix = m.nyckel.indexOf(':'), slag = ix > 0 ? m.nyckel.slice(0, ix) : m.nyckel;
      if (!q) { q = { s, nyckel: m.nyckel, slag, spar: ix > 0 ? m.nyckel.slice(ix + 1) : null, fodd: t, dod: null, texter: [], x: l + w / 2, y: tp + h / 2 }; L.platser.set(s, q); }
      if (txt && !q.texter.includes(txt)) q.texter.push(txt);
      q.sx = l + w / 2; q.sy = tp + h / 2;
    }
    for (const q of L.platser.values()) if (q.dod == null && !pSedda.has(q.s)) q.dod = t;
    /* Mattans transform (zoom och pan) efter varje steg: glider säger om
       ändringen fick en rörelse (matBradeSkriv) eller skrevs direkt. */
    const g = grid(), f = L.grid[L.grid.length - 1];
    if (g.t && (!f || f.t !== g.t)) L.grid.push({ s: t, t: g.t, z: g.z, px: g.px, py: g.py, glider: g.glider });
  }
  /* Ett steg i appen (en rapport, ett hjärtslag eller en av appens timrar):
     läget före och efter, i samma ögonblick. Ett kort som syns på ett annat
     ställe efter steget än före, utan att någon tid gått, har hoppat. */
  function steg(namn, fn) {
    synka();
    const fore = lasPos();
    try { fn(); } catch (e) { L.fel.push(namn + ': ' + (e && e.message || e)); }
    synka();
    bildruta();   // det webbläsaren gör innan nästa bild: rAF och ResizeObserver (index.html ritar om mattan när rutan ändrar storlek)
    synka();
    const efter = lasPos(), cw = CW();
    for (const [s, b] of efter) {
      const a = fore.get(s); if (!a) continue;
      const d = Math.hypot(b.vx - a.vx, b.vy - a.vy) / cw;
      if (d > 0.1) { L.hopp.push({ s: virt, ser: s, d: +d.toFixed(2), slag: 'utan rörelse', vad: namn }); L.teleport.add(s); }
    }
    observera(virt, false);
    L.steg++;
  }
  /* Klockans mätpunkt (en videoruta, 1/15 s): hela läget, och kort som
     rört sig mer än en kortbredd sedan förra rutan utan att ha hoppat i ett
     steg emellan. */
  function prov() {
    synka();
    observera(virt, true);
    const nu = lasPos(), cw = CW(), f = L.forraProv;
    if (f) for (const [s, b] of nu) {
      /* En glidning (matGlid) är en rörelse, hur lång den än är: bara det som rör sig utan en räknas. */
      const a = f.get(s); if (!a || L.teleport.has(s) || a.glid || b.glid) continue;
      const d = Math.hypot(b.vx - a.vx, b.vy - a.vy) / cw;
      if (d <= L.opt.snabb) continue;
      /* Flera rutor i rad över gränsen för samma kort är ett hopp (en rörelse), med den största sträckan. */
      const f0 = L.snabbSist.get(s);
      if (f0 && f0.till === L.forraProvT) { f0.d = Math.max(f0.d, +d.toFixed(2)); f0.rutor++; f0.till = virt; continue; }
      const h = { s: virt, ser: s, d: +d.toFixed(2), slag: 'snabb', rutor: 1, till: virt };
      L.hopp.push(h); L.snabbSist.set(s, h);
    }
    L.forraProv = nu; L.forraProvT = virt; L.teleport = new Set();
    L.prov++;
  }
  /* Ögonblicksbilden (partiet 2026-09-21): varje kort på mattan med sitt
     spår, sin ruta i brädet och på skärmen, och mattans fönster. */
  function ogonblick(namn) {
    synka();
    const p = mig(), cards = new Map(((p && p.cards) || []).map(c => [c.cid, c]));
    const r = gridWrap.getBoundingClientRect(), g = grid();
    const kort = [];
    for (const el of kortEl()) {
      const c = cards.get(el._mat.nyckel.slice(2)); if (!c) continue;
      const rect = typeof matRect === 'function' ? matRect(c) : { x: c.x, y: c.y, w: CW(), h: 248 };
      const sk = el.getBoundingClientRect();
      kort.push({ cid: c.cid, namn: c.name, spar: c.spar != null ? c.spar : null, lyft: c.lyft != null, tappad: !!c.tapped,
                  rect, cx: rect.x + rect.w / 2, cy: rect.y + rect.h / 2,
                  skarm: { l: sk.left, t: sk.top, r: sk.right, b: sk.bottom } });
    }
    /* Det mattan visar för ett spår som inte är ett kort med namn än: det
       oframkallade kortet (MES-344, nyckeln o:<spår>) och platshållaren
       (p:<spår>). Samma uppgifter, med plats: true och utan namn — o: först,
       så att det går före en platshållare för samma spår. Partiet genom
       kedjan (parti-kedjan) har få namn, och då är det det här som ligger där
       kortet ligger. Läget: elementets left/top/width/height, som för
       platshållarna i observera(). Det oframkallade kortets nyckel bär
       spåret det föddes på; har kortet bundits om till ett nytt spår står
       det i appens ofrMinne (post-id → { spar }), och det är det spåret
       som gäller nu. Går det inte att läsa — ofrMinne är ingen Map, posten saknas, eller
       dess spar är inget tal — är det ett tolkningsfel (kod 2), inte nyckelns
       spår i tysthet: då paras kortet med fel spår, och saknade kort och
       avstånd blir andra tal utan att något säger det (granskningen). */
    const ofrNu = typeof ofrMinne !== 'undefined' && ofrMinne instanceof Map ? ofrMinne : null;
    for (const pre of ['o:', 'p:']) for (const el of gridEl.children) {
      const m = el._mat; if (!m || !m.nyckel || !m.nyckel.startsWith(pre)) continue;
      const l = parseFloat(el.style.left) || 0, tp = parseFloat(el.style.top) || 0, w = parseFloat(el.style.width) || CW(), h = parseFloat(el.style.height) || 248;
      const sk = el.getBoundingClientRect(), s0 = m.nyckel.slice(2), id = s0 === '' ? null : (isFinite(+s0) ? +s0 : s0);
      let spar = id;
      if (pre === 'o:') {
        const post = ofrNu && id != null ? (ofrNu.get(id) || ofrNu.get(String(id))) : null;
        if (!ofrNu) { tolk('oframkallat kort (o:) men appens ofrMinne går inte att läsa som en Map'); continue; }
        if (!post) { tolk('oframkallat kort ' + m.nyckel + ' saknas i appens ofrMinne'); continue; }
        if (!Number.isFinite(post.spar)) { tolk('oframkallat kort ' + m.nyckel + ': posten i ofrMinne har inget spår (spar ' + String(post.spar).slice(0, 20) + ')'); continue; }
        spar = post.spar;
      }
      kort.push({ cid: null, namn: '', spar, lyft: false, tappad: w > h, plats: true, slag: pre[0],
                  rect: { x: l, y: tp, w, h }, cx: l + w / 2, cy: tp + h / 2,
                  skarm: { l: sk.left, t: sk.top, r: sk.right, b: sk.bottom } });
    }
    /* Facits läge på mattan (parti-kedjan, fall.v2Par = 'plats'): varje v2-kort i
       ögonblickets ruta räknat genom appens egen kamTillMatta med den skala
       mattan står i — kamSkalaFryst() eller den låsta kamSkala.las för mig.
       kamSkala() själv anropas inte: den låser om skalan, och en mätning får
       inte ändra appen. Går det inte att läsa: tolkningsfel (kod 2). */
    let facit = null;
    const rv = fallNu && fallNu.v2Par === 'plats' ? (fallNu.v2 || []).find(q => String(q.ruta) === namn) : null;
    if (rv) {
      const fr = typeof kamSkalaFryst === 'function' ? kamSkalaFryst() : null;
      const las = typeof kamSkala === 'function' && kamSkala.las instanceof Map ? kamSkala.las.get(p && p.id) : null;
      const sk = fr || (typeof las === 'number' ? las : las && las.v);
      if (typeof kamTillMatta !== 'function' || !Number.isFinite(sk) || sk <= 0) tolk('facits läge på mattan: kamTillMatta eller mattans skala (kamSkalaFryst / kamSkala.las) går inte att läsa');
      else facit = rv.kort.map(k => { const m = kamTillMatta({ x: k.x, y: k.y }, sk); return { mx: m.x, my: m.y }; });
    }
    L.ogon.push({ namn, s: U.sek(virt), vp: { l: r.left, t: r.top, r: r.right, b: r.bottom }, z: g.z, kort, facit });
  }

  /* ── spelet: som dev/mattan.cjs ──────────────────────────────────── */
  function starta(fall) {
    pa = true; fro = 0x5EED ^ (fall.fro || 1); virt = U.ms((fall.fran || 0) - 1);
    ko = []; rafKo = []; anims.clear();
    flyttaTimrar();
    visaVy('app');
    const m = player();
    spelLage = { id: 'upp-' + fall.id, kod: 'UPP001', namn: 'Uppspelaren', vard: m.id, mig: m.id };
    m.lage = 'bord'; m.cards = []; m.pending = []; m.plats = 1;
    state.players = [m]; state.active = m.id;
    oppSatt({ klar: true });
    kamAnsluten = true; kamFas = ''; prefs.autoLage = true;
    kamUpplosning = fall.upplosning || null;
    if (typeof sattLekTal === 'function') sattLekTal(fall.lek || null);
    /* En motståndare, som i ett riktigt spel (förval): bordsvyn delar
       skärmen mellan mattorna, och den ritar om mattan när rutan ändras.
       Hennes kort ligger still. --solo: bara mitt bord. */
    if (fall.motstandare !== false) {
      const opp = normalisera({ id: 'upp-opp', name: 'Sara', color: '#b782ff', plats: 2, lage: 'bord', cards: [
        { cid: 'uo1', name: 'Delver of Secrets', x: 40, y: 60, z: 1, tapped: 0, cts: [] },
        { cid: 'uo2', name: 'Island', x: 260, y: 330, z: 2, tapped: 0, cts: [] }], shots: [], shotIdx: 0, pending: [], pane: null, namnkalla: 'anvandare', version: 1 }, 1);
      state.players = [m, opp]; state.active = m.id;
      if (typeof bord !== 'undefined' && bord) bord.valt = 'all';
    }
    renderAll(true);
    bildruta();
    storlekarNu();
  }
  /* En rad ur bordsloggen, som kamTogsEmot tar emot den: grundläget före
     avstämningen, sedan avstamBord. */
  function tillampa(r) {
    if (r.grund !== undefined && r.grund !== kamGrund) { kamGrund = r.grund; try { visaKamGrund(); } catch (e) {} }
    avstamBord(r.spar || [], r.nollstall, r.fas, undefined, undefined, r.grav);
  }
  /* Händelserna: rapporterna och telefonens hjärtslag (var tredje sekund
     från första rapporten, senaste bordet igen — index.html, setInterval på
     telefonen), som dev/dubbletter.cjs och dev/eventtest/jamfor.cjs. */
  function handelser(fall) {
    const rader = fall.rader, ut = [];
    rader.forEach((r, i) => ut.push({ t: U.ms(r.s), slag: 'rapport', r, nr: i }));
    if (rader.length && fall.hjartslag !== false) {
      const tSlut = U.ms(fall.till);
      for (let t = U.ms(rader[0].s) + 3000; t <= tSlut; t += 3000) ut.push({ t, slag: 'hjärtslag' });
    }
    ut.sort((p, q) => (p.t - q.t) || ((p.slag === 'hjärtslag') - (q.slag === 'hjärtslag')) || ((p.nr || 0) - (q.nr || 0)));
    return ut;
  }
  /* Kör klockan fram till t: appens timrar (före en händelse på samma tid,
     som nådtimern i dubbletter.cjs), händelserna, mätpunkterna. */
  let H = [], hi = 0, senast = null, tick = 0, ogonT = [], oi = 0, fallNu = null;
  function till(tMal, mata) {
    for (;;) {
      const tim = nastaTimer(), h = H[hi], tk = mata ? tick : Infinity, og = mata && ogonT[oi] ? U.ms(ogonT[oi].s) : Infinity;
      const tT = tim ? tim.t : Infinity, tH = h ? h.t : Infinity;
      const nast = Math.min(tT, tH, tk, og);
      if (nast > tMal || nast === Infinity) break;
      virt = nast;
      if (tim && tT === nast && tT <= tH) {
        if (tim.period) tim.t += tim.period; else ko.splice(ko.indexOf(tim), 1);
        if (U.spara) U.spara.push({ t: U.sek(virt), timer: String(tim.fn).slice(0, 90) });   // felsökning: __upp.spara = [] i konsolen loggar timrarna
        steg('timer', () => tim.fn(...(tim.args || [])));
        if (L) L.timrar++;
        continue;
      }
      if (h && tH === nast) {
        hi++;
        if (h.slag === 'rapport') { if (h.r.nollstall) senast = null; else senast = h.r; steg('rapport', () => tillampa(h.r)); if (L) L.rapporter++; }
        else if (senast) { const r = Object.assign({}, senast, { nollstall: false }); steg('hjärtslag', () => tillampa(r)); if (L) L.hjartslag++; }
        continue;
      }
      if (og === nast) { ogonblick(ogonT[oi].namn); oi++; continue; }
      if (tk === nast) { prov(); tick += L.opt.ruta; continue; }
    }
    virt = Math.max(virt, tMal);
    synka();
  }
  U.till = s => till(U.ms(s), false);

  /* En hel körning: spelet, alla händelser, mätpunkterna. Returnerar
     loggen som vanliga objekt (kor.cjs räknar måtten ur den). */
  U.korFall = function (fall) {
    const opt = { ruta: 1000 / 15, snabb: fall.snabb || 1.0 };
    starta(fall);
    L = nyLogg(opt);
    fallNu = fall; H = handelser(fall); hi = 0; senast = null;
    tick = U.ms(fall.fran); ogonT = (fall.ogonblick || []).slice().sort((a, b) => a.s - b.s); oi = 0;
    L.forraProv = null;
    till(U.ms(fall.till), true);
    if ((fall.facit || []).some(h => h.typ === 'spelar') && !L.sattKortEl) tolk('fallet har utspel i facit men mattan fick aldrig ett c:-element');
    const ut = {
      kort: [...L.kort.values()], platser: [...L.platser.values()], hopp: L.hopp, grid: L.grid, utanfor: L.utanfor, ogon: L.ogon,
      steg: L.steg, rapporter: L.rapporter, hjartslag: L.hjartslag, timrar: L.timrar, prov: L.prov, fel: L.fel,
      vp: (() => { const r = gridWrap.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
      cw: CW()
    };
    for (const k of ut.kort) for (const b of k.bana) b[0] = +U.sek(b[0]).toFixed(3);
    const sek = v => v == null ? null : +U.sek(v).toFixed(3);
    for (const k of ut.kort) { k.fodd = sek(k.fodd); k.dod = sek(k.dod); k.lyft = k.lyft.map(([a, b]) => [sek(a), sek(b)]); k.chip = k.chip.map(([c, a, b]) => [c, sek(a), sek(b)]); }
    for (const q of ut.platser) { q.fodd = sek(q.fodd); q.dod = sek(q.dod); }
    for (const h of ut.hopp) { h.s = sek(h.s); if (h.till != null) h.till = sek(h.till); }
    for (const g of ut.grid) g.s = sek(g.s);
    ut.utanfor = ut.utanfor.map(([t, s]) => [sek(t), s]);
    return ut;
  };

  /* Visaren: starta utan mätning och kör fram till en tid. */
  U.visaStarta = function (fall) {
    starta(fall);
    L = nyLogg({ ruta: 1000 / 15, snabb: 1 });
    fallNu = fall; H = handelser(fall); hi = 0; senast = null; ogonT = []; oi = 0;
  };
  U.visaTill = function (s) { if (U.ms(s) >= virt) till(U.ms(s), false); return U.sek(virt); };
  U.visaLage = function () { return { s: U.sek(virt), hi, n: H.length, kort: kortEl().length, platser: [...gridEl.children].filter(el => el._mat && el._mat.nyckel.startsWith('p:')).length }; };
})();

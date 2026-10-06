/* Uppspelarens mått (MES-333): ur motorns logg (motor.js) och fallets
   facit. Definitionerna står i LÄS-MIG.md; konstanterna här är de som står
   där. Ett mått som inte går att räkna för ett fall är null ("–"), aldrig 0.
   .cjs eftersom package.json säger "type": "module". */
'use strict';
const { bordAvstand, bordRekt } = require('./fall.cjs');

const FORE = 2, EFTER = 10;        // fönstret runt facits tid, som dev/spegelfacit/jamfor.cjs
const UTBYTT_S = 10;               // ett nytt kort med samma namn inom så här lång tid efter att ett försvann = utbytt
const VILA_TOL = 0.25;             // kortbredder: kortet "ligger på sin plats" inom så här långt från sitt viloläge
const FLYTT_MIN = 0.5;             // kortbredder: så långt ska viloläget ändras för att en flytt ska räknas som speglad
const RUTA_S = 1 / 15;             // en videoruta
const OMLOTT = 0.2;                // två kortrutor på mattan ligger omlott när de delar en femtedel av den mindre (som jamfor.cjs)

/* Måtten, i den ordning de skrivs. riktning: vad som är bättre. */
const MATT = [
  ['hopp', 'Hopp utan rörelse (kortet byter plats på mattan i ett ögonblick)', 'lagre', 'antal'],
  ['hoppSnabba', 'Snabba hopp (mer än 1 kortbredd på en videoruta, 1/15 s)', 'lagre', 'antal'],
  ['utbytta', 'Utbytta kort (försvann och skapades igen i stället för att flyttas)', 'lagre', 'antal'],
  ['extraKort', 'Nya kort utan utspel i facit', 'lagre', 'antal'],
  ['felNedtoning', 'Fel nedtoning eller fel borttagning (kortet ligger kvar enligt facit)', 'lagre', 'antal'],
  ['bortaMissade', 'Borttagna kort som står kvar på mattan', 'lagre', 'antal'],
  ['felTillHanden', 'Fel till handen (kortet ligger kvar enligt facit)', 'lagre', 'antal'],
  ['tidBortaMedian', 'Tid till borta, median (miss = 10 s)', 'lagre', 's'],
  ['tidBortaMax', 'Tid till borta, längst (miss = 10 s)', 'lagre', 's'],
  ['utspelSyntes', 'Utspel som syntes på mattan', 'hogre', 'kvot'],
  ['utspelKort', 'Utspel där kortet kom med namn', 'hogre', 'kvot'],
  ['tidSynsMedian', 'Tid till något syns, median (miss = 10 s)', 'lagre', 's'],
  ['tidSynsMax', 'Tid till något syns, längst (miss = 10 s)', 'lagre', 's'],
  ['tidPlatsMedian', 'Tid till rätt plats, median (miss = 10 s)', 'lagre', 's'],
  ['tidPlatsMax', 'Tid till rätt plats, längst (miss = 10 s)', 'lagre', 's'],
  ['flyttGlid', 'Flyttar där samma kort glider till nya platsen', 'hogre', 'kvot'],
  ['flyttTidMedian', 'Flytt: tid till nya platsen, median (miss = 10 s)', 'lagre', 's'],
  ['zoomPerMin', 'Mattans zoomändringar per minut', 'lagre', '/min'],
  ['panPerMin', 'Mattans panoreringar per minut', 'lagre', '/min'],
  ['zoomUtanGlid', 'Zoom eller pan som hoppar (utan glidning)', 'lagre', 'antal'],
  ['platshallare', 'Platshållare som syntes', 'lagre', 'antal'],
  ['platshallareS', 'Platshållare, sekunder på mattan', 'lagre', 's'],
  ['laddtexter', 'Laddtexter som syntes (Reading…, Moving…, Reading the card…, Asking Claude…)', 'lagre', 'antal'],
  ['utanforKort', 'Kort som var utanför mattans kant (antal kort)', 'lagre', 'antal'],
  ['utanforS', 'Kort utanför mattans kant, kortsekunder', 'lagre', 's'],
  ['avstandMedian', 'Avståndsfel mattan mot bordet, median (kortbredder)', 'lagre', 'kb'],
  ['avstandP90', 'Avståndsfel mattan mot bordet, 90:e percentilen (kortbredder)', 'lagre', 'kb'],
  ['falskaOmlott', 'Falska omlott (kortpar · rutor)', 'lagre', 'antal'],
  ['utanforRutor', 'Kort utanför mattans kant (kort · rutor)', 'lagre', 'antal'],
  ['saknasRutor', 'Kort i facit som saknas på mattan (kort · rutor)', 'lagre', 'antal']
];

const median = l => { if (!l.length) return null; const s = l.slice().sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const kvantil = (l, q) => { if (!l.length) return null; const s = l.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const r2 = v => v == null ? null : Math.round(v * 100) / 100;
const tak = v => v == null ? EFTER : Math.min(v, EFTER);   // en miss = taket

/* Kortets läge vid tiden t ur banan: [t, vx, vy, lx, ly, tappad]. */
function vid(k, t) { let b = null; for (const x of k.bana) { if (x[0] > t + 1e-9) break; b = x; } return b; }

function berakna(fall, logg) {
  const cw = logg.cw || 178;
  const kort = logg.kort.map(k => Object.assign({}, k));
  const harFacit = fall.slag !== 'facit';
  const facit = harFacit ? fall.facit.slice().sort((a, b) => a.t - b.t) : [];
  const detalj = { utspel: [], borta: [], flytt: [], utbytta: [], extra: [], fel: [], hopp: logg.hopp };

  /* Födslar och förluster. Ett element som byts mot ett nytt för samma kort
     i samma ögonblick (matSynk byter tagg) är en utbytt DOM-nod, ingen ny
     födsel. Förlusten är första nedtoningen eller döden. */
  const ersatt = new Set(kort.filter(k => k.dodSom === 'utbytt element').map(k => k.cid + '@' + k.dod));
  const fodslar = kort.filter(k => !ersatt.has(k.cid + '@' + k.fodd));
  const domNod = kort.filter(k => k.dodSom === 'utbytt element').length;
  const forluster = [];
  for (const k of kort) {
    const l = k.lyft.length ? k.lyft[0][0] : null;
    const d = k.dod != null && k.dodSom !== 'utbytt element' ? k.dod : null;
    const t = l != null && (d == null || l <= d) ? l : d;
    if (t != null) forluster.push({ t, k, som: l != null && t === l ? 'nedtonad' : k.dodSom });
  }
  forluster.sort((a, b) => a.t - b.t);

  const m = {};
  /* ── hopp ── */
  m.hopp = logg.hopp.filter(h => h.slag === 'utan rörelse').length;
  m.hoppSnabba = logg.hopp.filter(h => h.slag === 'snabb').length;

  /* Viloläget och när kortet låg där: läget (lx, ly) vid tref, och första
     tiden efter t0 från vilken det synliga läget (vx, vy) ligger inom
     VILA_TOL av det ända till tref. */
  const vila = (k, t0, tref) => {
    const slut = vid(k, tref); if (!slut) return null;
    const mal = [slut[3], slut[4]];
    let sett = null;
    for (const x of k.bana) {
      if (x[0] > tref + 1e-9) break;
      const nara = Math.hypot(x[1] - mal[0], x[2] - mal[1]) / cw <= VILA_TOL;
      if (x[0] < t0) { sett = nara ? t0 : null; continue; }
      if (!nara) sett = null; else if (sett == null) sett = x[0];
    }
    return sett == null ? null : { t: sett, mal };
  };
  const nastaFor = (namn, T) => { const h = facit.find(h => h.t > T + 1e-6 && h.kort === namn); return h ? h.t : Infinity; };

  /* Namnen ett spår bar i telefonens bord: id → [[s, Set(namn)]]. */
  const sparNamn = new Map();
  for (const r of fall.rader || []) for (const t of r.spar || []) {
    const n = new Set([t.namn, t.gissning, t.cands && t.cands[0] && t.cands[0].name].filter(Boolean));
    if (!n.size) continue;
    (sparNamn.get(String(t.id)) || sparNamn.set(String(t.id), []).get(String(t.id))).push([r.s, n]);
  }
  const sparBar = (id, namn, a, b) => (sparNamn.get(String(id)) || []).some(([s, n]) => s >= a && s <= b && n.has(namn));

  if (harFacit) {
    /* ── utspel: något syns, och kortet ligger på sin plats ── */
    const tagnaF = new Set(), tagnaP = new Set();
    /* Ankomster: ett nytt element, eller ett nedtonat kort som kommer
       tillbaka (nedtoningen släpps, kortet står normalt igen). */
    const ankomst = [];
    for (const k of fodslar) ankomst.push({ k, t: k.fodd, ny: true });
    for (const k of kort) for (const [a, b] of k.lyft) if (b != null && (k.dod == null || b < k.dod)) ankomst.push({ k, t: b, ny: false });
    const tagnaA = new Set();
    for (const h of facit.filter(h => h.typ === 'spelar' || h.typ === 'grav_till_bord')) {
      const an = ankomst.filter(x => !tagnaA.has(x) && x.k.namn === h.kort && x.t >= h.t - FORE && x.t <= h.t + EFTER).sort((a, b) => a.t - b.t)[0] || null;
      if (an) { tagnaA.add(an); if (an.ny) tagnaF.add(an.k); }
      const k = an ? Object.assign({}, an.k, { fodd: an.t, sparFodd: an.ny ? an.k.sparFodd : null }) : null;
      /* Något annat som syntes före kortet (i dag platshållaren, .plats;
         i morgon vad som helst som inte är ett kort eller en hög): samma
         spår som kortet, eller inom 1,5 kortbredder från där kortet kom.
         Kom kortet aldrig räknas bara det vars spår i telefonens bord bär
         facits namn (namn, gissning eller första förslag) i fönstret — en
         platshållare någon annanstans på bordet är inte det här utspelet. */
      const slut = k ? k.fodd : h.t + EFTER;
      const kandidat = logg.platser.filter(q => !tagnaP.has(q) && q.fodd >= h.t - FORE && q.fodd <= slut + 1e-9);
      const kPos = k ? vid(k, k.fodd + 1e-6) : null;
      let q = k ? kandidat.find(q => k.sparFodd != null && q.spar != null && String(q.spar) === String(k.sparFodd)) : null;
      if (!q && kPos) q = kandidat.filter(q => Math.hypot(q.sx - kPos[3], q.sy - kPos[4]) / cw <= 1.5).sort((a, b) => a.fodd - b.fodd)[0] || null;
      if (!q && !k) q = kandidat.filter(q => q.spar != null && sparBar(q.spar, h.kort, h.t - FORE, h.t + EFTER)).sort((a, b) => a.fodd - b.fodd)[0] || null;
      if (q) for (const p of logg.platser) if (p.spar != null && String(p.spar) === String(q.spar) && p.fodd >= q.fodd && p.fodd <= slut + 1e-9) tagnaP.add(p);
      const syns = [k && k.fodd, q && q.fodd].filter(v => v != null);
      const tref = k ? Math.min(h.t + EFTER, nastaFor(h.kort, h.t) - 0.01, k.dod != null ? k.dod - 0.001 : Infinity) : null;
      const v = k && tref > k.fodd ? vila(k, k.fodd, tref) : null;
      detalj.utspel.push({ t: h.t, kort: h.kort, kortT: k ? r2(k.fodd - h.t) : null, platsT: q ? r2(q.fodd - h.t) : null,
        syns: syns.length ? +(Math.min(...syns) - h.t).toFixed(3) : null, plats: v ? +(v.t - h.t).toFixed(3) : null, ser: k ? k.s : null });
    }
    const u = detalj.utspel;
    m.utspelSyntes = u.length ? { n: u.filter(x => x.syns != null).length, av: u.length } : null;
    m.utspelKort = u.length ? { n: u.filter(x => x.kortT != null).length, av: u.length } : null;
    /* En miss (inget syntes, kortet kom aldrig till ro) räknas som taket,
       EFTER = 10 s — annars blir medianen bättre när det blir sämre. */
    const sy = u.map(x => tak(x.syns)), pl = u.map(x => tak(x.plats));
    m.tidSynsMedian = r2(median(sy)); m.tidSynsMax = sy.length ? r2(Math.max(...sy)) : null;
    m.tidPlatsMedian = r2(median(pl)); m.tidPlatsMax = pl.length ? r2(Math.max(...pl)) : null;

    /* ── borttagningar: rätt och fel ── */
    const tagnaL = new Set();
    for (const h of facit.filter(h => h.typ === 'tar_bort')) {
      const f = forluster.find(f => !tagnaL.has(f) && f.k.namn === h.kort && f.t >= h.t - FORE && f.t <= h.t + EFTER);
      if (f) tagnaL.add(f);
      detalj.borta.push({ t: h.t, kort: h.kort, till: h.till, dt: f ? r2(f.t - h.t) : null, som: f ? f.som : null });
    }
    /* En borttagning som syns först efter fönstret: raden står kvar (missad,
       taket i tiden), men nedtoningen är ingen fel nedtoning — kortet var
       borta. Före nästa utspel med namnet. */
    for (const b of detalj.borta.filter(b => b.dt == null)) {
      const nasta = facit.find(h => h.t > b.t && h.kort === b.kort && (h.typ === 'spelar' || h.typ === 'grav_till_bord'));
      const f = forluster.find(f => !tagnaL.has(f) && f.k.namn === b.kort && f.t > b.t + EFTER && (!nasta || f.t < nasta.t - FORE));
      if (f) { tagnaL.add(f); b.sen = r2(f.t - b.t); b.som = f.som; }
    }
    m.bortaMissade = detalj.borta.filter(b => b.dt == null).length;
    const bt = detalj.borta.map(b => tak(b.dt));
    m.tidBortaMedian = r2(median(bt)); m.tidBortaMax = bt.length ? r2(Math.max(...bt)) : null;
    for (const f of forluster) if (!tagnaL.has(f)) detalj.fel.push({ t: f.t, kort: f.k.namn, som: f.som, ser: f.k.s });
    m.felNedtoning = detalj.fel.length;
    /* Till handen (MES-343): ett kort som lämnar mattan mot handen fast det
       ligger kvar. I dag går inget kort till handen av sig självt. */
    m.felTillHanden = detalj.fel.filter(f => f.som === 'hand' || f.som === 'borttaget').length;   // borttaget = ur korten helt: appens hand och library är ett

    /* ── flyttar ── */
    const tagnaU = new Set();
    for (const h of facit.filter(h => h.typ === 'flyttar')) {
      const t0 = h.t - FORE, t1 = Math.min(h.t + EFTER, nastaFor(h.kort, h.t) - 0.01);
      let svar = null;
      for (const k of kort.filter(k => k.namn === h.kort && k.fodd <= t0 && (k.dod == null || k.dod > h.t))) {
        const a = vid(k, t0), slutT = k.dod != null ? Math.min(t1, k.dod - 0.001) : t1, b = vid(k, slutT);
        if (!a || !b || Math.hypot(b[3] - a[3], b[4] - a[4]) / cw < FLYTT_MIN) continue;
        if (k.lyft.some(([x, y]) => x >= t0 && x <= slutT)) continue;   // via nedtoning: inte samma kort som glider
        const v = vila(k, h.t - FORE, slutT);
        svar = { som: 'glid', dt: v ? r2(v.t - h.t) : null, ser: k.s }; break;
      }
      if (!svar) {
        const k = fodslar.find(k => !tagnaF.has(k) && !tagnaU.has(k) && k.namn === h.kort && k.fodd >= t0 && k.fodd <= h.t + EFTER);
        if (k) { tagnaU.add(k); const v = vila(k, k.fodd, Math.min(t1, k.dod != null ? k.dod - 0.001 : Infinity)); svar = { som: 'nytt kort', dt: v ? r2(v.t - h.t) : null, ser: k.s }; }
      }
      detalj.flytt.push(Object.assign({ t: h.t, kort: h.kort }, svar || { som: 'syntes inte', dt: null }));
    }
    const fl = detalj.flytt;
    m.flyttGlid = fl.length ? { n: fl.filter(x => x.som === 'glid').length, av: fl.length } : null;
    m.flyttTidMedian = r2(median(fl.map(x => tak(x.dt))));

    /* ── utbytta och extra kort ──
       Utbytt: en flytt i facit som syntes som ett nytt kort, eller ett nytt
       kort med samma namn strax (UTBYTT_S) efter att ett kort med namnet
       försvann FAST det låg kvar (en fel nedtoning eller borttagning). Ett
       nytt kort efter en riktig borttagning, eller utan någon förlust alls,
       är ett kort som inte finns (extra). */
    const felForlust = new Set(detalj.fel.map(f => f.ser + '@' + f.t));
    for (const k of fodslar) {
      if (tagnaF.has(k)) continue;
      if (tagnaU.has(k)) { const fl = detalj.flytt.find(x => x.ser === k.s); detalj.utbytta.push({ t: k.fodd, kort: k.namn, forlust: 'flytt i facit ' + (fl ? fl.t : '?'), forlustT: null, ser: k.s }); continue; }
      const f = forluster.find(f => f.k !== k && f.k.namn === k.namn && felForlust.has(f.k.s + '@' + f.t) && f.t <= k.fodd + 1e-9 && f.t >= k.fodd - UTBYTT_S);
      if (f) detalj.utbytta.push({ t: k.fodd, kort: k.namn, forlust: f.som, forlustT: f.t, ser: k.s });
      else detalj.extra.push({ t: k.fodd, kort: k.namn, ser: k.s });
    }
    m.utbytta = detalj.utbytta.length + domNod;
    m.extraKort = detalj.extra.length;
  } else {
    for (const n of ['utspelSyntes', 'utspelKort', 'tidSynsMedian', 'tidSynsMax', 'tidPlatsMedian', 'tidPlatsMax', 'bortaMissade', 'tidBortaMedian', 'tidBortaMax', 'felNedtoning', 'felTillHanden', 'flyttGlid', 'flyttTidMedian', 'utbytta', 'extraKort']) m[n] = null;
  }

  /* ── mattans rörelser ── */
  const g = logg.grid, min = (fall.till - fall.fran) / 60;
  let zoom = 0, pan = 0, hopp = 0;
  for (let i = 1; i < g.length; i++) {
    const a = g[i - 1], b = g[i];
    if (a.z != null && b.z != null && Math.abs(a.z - b.z) > 1e-4) zoom++; else pan++;
    if (!b.glider) hopp++;
  }
  m.zoomPerMin = r2(zoom / min); m.panPerMin = r2(pan / min); m.zoomUtanGlid = hopp;
  detalj.grid = g;

  /* ── platshållare och laddtexter ── */
  const episoder = [];
  for (const q of logg.platser.filter(q => q.slag === 'p').sort((a, b) => a.fodd - b.fodd)) {
    const e = episoder.find(e => e.spar === q.spar && e.dod != null && Math.abs(e.dod - q.fodd) < 1e-6);
    const slut = q.dod != null ? q.dod : fall.till;
    if (e) { e.dod = q.dod; e.slut = slut; for (const t of q.texter) if (!e.texter.includes(t)) e.texter.push(t); }
    else episoder.push({ spar: q.spar, fodd: q.fodd, dod: q.dod, slut, texter: q.texter.slice() });
  }
  m.platshallare = episoder.length;
  m.platshallareS = r2(episoder.reduce((a, e) => a + (e.slut - e.fodd), 0));
  const LADD = /^(Reading…|Moving…)$/, LADDP = /Reading the card…|Asking Claude…/;
  let ladd = 0;
  for (const k of kort) for (const c of k.chip) if (LADD.test(c[0])) ladd++;
  for (const e of episoder) if (e.texter.some(t => LADDP.test(t))) ladd++;
  m.laddtexter = ladd;
  detalj.platser = episoder;

  /* ── utanför kanten ── */
  m.utanforKort = new Set(logg.utanfor.map(x => x[1])).size;
  m.utanforS = r2(logg.utanfor.length * RUTA_S);

  /* ── partiet 2026-09-21: mattan mot v2-facit i var tionde sekund ── */
  if (fall.v2) {
    const fel = [], omlott = [], ut = [], saknas = [];
    const tack = (p, q) => {
      const iw = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x), ih = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y);
      return iw <= 0 || ih <= 0 ? 0 : iw * ih / Math.min(p.w * p.h, q.w * q.h);
    };
    for (const o of logg.ogon) {
      const ruta = fall.v2.find(r => String(r.ruta) === o.namn); if (!ruta) continue;
      const par = ruta.kort.map(f => ({ f, m: o.kort.find(k => k.spar === f.id && !k.lyft) })).filter(x => { if (!x.m) saknas.push({ ruta: ruta.ruta, id: x.f.id }); return !!x.m; });
      for (let i = 0; i < par.length; i++) for (let j = i + 1; j < par.length; j++) {
        const a = par[i], b = par[j];
        const dBord = bordAvstand(a.f, b.f), dMatta = Math.hypot(a.m.cx - b.m.cx, a.m.cy - b.m.cy) / cw;
        fel.push(Math.abs(dMatta - dBord));
        /* Omlott på bordet: samma hög i facit, eller korten (i den storlek
           de har där i bilden) rör alls vid varandra. Falskt omlott: de
           ligger fria på bordet men täcker varandra på mattan. */
        const paBordet = (a.f.hog !== '-' && a.f.hog === b.f.hog) || tack(bordRekt(a.f), bordRekt(b.f)) > 0;
        if (tack(a.m.rect, b.m.rect) > OMLOTT && !paBordet) omlott.push({ ruta: ruta.ruta, a: a.f.id, b: b.f.id, bord: +dBord.toFixed(2), matta: +dMatta.toFixed(2) });
      }
      for (const x of par) { const s = x.m.skarm; if (s.l < o.vp.l - 2 || s.t < o.vp.t - 2 || s.r > o.vp.r + 2 || s.b > o.vp.b + 2) ut.push({ ruta: ruta.ruta, id: x.f.id }); }
    }
    m.avstandMedian = r2(median(fel)); m.avstandP90 = r2(kvantil(fel, 0.9));
    m.falskaOmlott = omlott.length; m.utanforRutor = ut.length; m.saknasRutor = saknas.length;
    detalj.v2 = { par: fel.length, omlott, utanfor: ut, saknas };
  } else for (const n of ['avstandMedian', 'avstandP90', 'falskaOmlott', 'utanforRutor', 'saknasRutor']) m[n] = null;

  return { matt: m, detalj, n: { steg: logg.steg, rapporter: logg.rapporter, hjartslag: logg.hjartslag, timrar: logg.timrar, prov: logg.prov, kort: kort.length, fel: logg.fel } };
}

/* Totalt över fallen med telefonens ström (golden och passet): antal
   summeras, tider räknas ur alla händelser ihop, per minut ur summan. */
function totalt(res) {
  const R = res.filter(r => r.slag !== 'facit');
  const t = {};
  const alla = key => R.map(r => r.matt[key]).filter(v => v != null);
  for (const [key, , , enh] of MATT) {
    const l = alla(key);
    if (!l.length) { t[key] = null; continue; }
    if (enh === 'kvot') t[key] = { n: l.reduce((a, v) => a + v.n, 0), av: l.reduce((a, v) => a + v.av, 0) };
    else if (enh === 'antal' || key === 'platshallareS' || key === 'utanforS') t[key] = r2(l.reduce((a, v) => a + v, 0));
    else t[key] = null;
  }
  const lista = (f, key) => R.flatMap(r => (r.detalj[f] || []).map(x => tak(x[key])));   // en miss = taket, som per fall
  const mx = l => l.length ? r2(Math.max(...l)) : null;
  const sy = lista('utspel', 'syns'), pl = lista('utspel', 'plats'), bt = lista('borta', 'dt');
  t.tidSynsMedian = r2(median(sy)); t.tidSynsMax = mx(sy);
  t.tidPlatsMedian = r2(median(pl)); t.tidPlatsMax = mx(pl);
  t.tidBortaMedian = r2(median(bt)); t.tidBortaMax = mx(bt);
  t.flyttTidMedian = r2(median(lista('flytt', 'dt')));
  const min = R.reduce((a, r) => a + r.minuter, 0);
  const zoom = R.reduce((a, r) => a + (r.matt.zoomPerMin || 0) * r.minuter, 0), pan = R.reduce((a, r) => a + (r.matt.panPerMin || 0) * r.minuter, 0);
  t.zoomPerMin = min ? r2(zoom / min) : null; t.panPerMin = min ? r2(pan / min) : null;
  return t;
}

/* Sämre? null efter men ett tal före = vet inte = sämre. Tider jämförs på
   hundradelar (det som skrivs ut). */
function samre(key, fore, efter, grind) {
  const def = MATT.find(x => x[0] === key); if (!def) return false;
  if (grind && def[3] === 's' && typeof fore === 'number' && typeof efter === 'number')
    return def[2] === 'lagre' ? efter > fore + 0.1 + 1e-9 : efter < fore - 0.1 - 1e-9;   // tider: ±0,1 s
  if (fore == null) return false;
  if (efter == null) return true;
  if (typeof fore === 'object' || typeof efter === 'object') {   // kvot n/av: färre n är sämre (av är facits rader, samma före och efter)
    const a = typeof fore === 'object' ? fore.n : fore, b = typeof efter === 'object' ? efter.n : efter;
    return def[2] === 'hogre' ? b < a : b > a;
  }
  return def[2] === 'lagre' ? Math.round(efter * 100) > Math.round(fore * 100) : Math.round(efter * 100) < Math.round(fore * 100);
}
const visa = v => v == null ? '–' : typeof v === 'object' ? `${v.n}/${v.av}` : String(v).replace('.', ',');

module.exports = { MATT, berakna, totalt, samre, visa, FORE, EFTER, UTBYTT_S, VILA_TOL, FLYTT_MIN, OMLOTT };

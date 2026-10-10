#!/usr/bin/env node
/* Positionerna (MES-342): ligger korten på mattan där de ligger på bordet?

   Kör:  node dev/eventtest/positioner.cjs [--html fil] [--fall 13,18,p0921] [--lager app|alla|geometri] [--detalj] [--json ut.json]

   Mäter mattans lägen mot facits RITADE lägen (rita.html, MES-286: kortens fyra
   hörn i bilden, ett läge per händelse) på telefonens RIKTIGA ström:

     13   golden 13 (MES-246:s tur 1–4, 0,5×, 40 cm, svart matta), 0–172 s,
          facit dev/golden/inspelningar/2026-09-19-mes-246-las-fore-slapp/lagen.json
     18   golden 18 (samma manus på träbord, sidoljus), 0–181 s,
          facit dev/golden/inspelningar/2026-10-02-fall-13b-0,5x-sidoljus/lagen.json
     p0921  partiet 2026-09-21 ur uppspelarens fall (v2-facit som ideal telefon:
          lådorna är facit, inte detektorn — som jämförelse, inte som mått på kameran)

   Bordsloggen för 13 och 18 är golden-körningens (dev/golden/senaste.json, utan
   Claude). Den spelas upp genom datorns RIKTIGA avstamBord ur index.html med
   klockan på rapporternas tid, hjärtslaget var tredje sekund och nådtimern (som
   dev/eventtest/jamfor.cjs), och efter varje steg genom datorns RIKTIGA
   speglaKamPos, kamSkala, kamTillMatta och clampKort (som skala.cjs).

   Tre lager, så att felet går att lägga där det uppstår:
     app       (förval) bara kort som fått namn av telefonen — det mattan visar i dag
     alla      varje spår som ligger på ett facit-kort får kortets namn, som om
               telefonen läst alla: mattan får alla kort, genom samma avstämning
     geometri  varje spår i rapporten rakt genom kamSkala + kamTillMatta, utan
               avstämningen (ingen dödzon, ingen låst skala) — bara räkningen från
               bild till bräde

   Vid varje ritat läge läses mattan 3 s efter (eller 0,3 s före nästa läge), och
   kort paras med facit på namn och läge i bilden. Mått, som uppspelarens p0921:
     avståndsfel  för varje par kort: |avståndet på mattan − avståndet på bordet| i
                  kortbredder. På bordet: avståndet i bilden delat med kortens egen
                  bredd där de ligger (namnradens kant ur hörnen) — perspektivet
                  ingår alltså i facit. Median, p90, max
     falska omlott  kortpar som täcker varandra till mer än en femtedel på mattan
                  men inte rör varandra på bordet (hörnens polygoner) och inte är
                  samma hög i facit
     högar isär   kortpar i samma hög (eller omlott mer än en femtedel) på bordet
                  som inte rör varandra på mattan
     vid kanten   kort som klämts mot brädets kant (KANT/TOPP)

   Ett MÅTT, inget prov: slutkod 0. .cjs eftersom package.json säger "type": "module". */
'use strict';
const fs = require('fs'), path = require('path');
const ROT = path.join(__dirname, '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const HTML = path.resolve(arg('--html', path.join(ROT, 'index.html')));
const FALLEN = arg('--fall', '13,18,p0921').split(',');
const LAGER = arg('--lager', 'app');
const DETALJ = process.argv.includes('--detalj');
const JSONUT = arg('--json', '');
if (!['app', 'alla', 'geometri'].includes(LAGER)) throw new Error('--lager app|alla|geometri');

/* ── utdraget ur index.html ── */
const src = fs.readFileSync(HTML, 'utf8');
const NAD_MS = +((src.match(/const BORTA_NAD = (\d+);/) || [0, 3000])[1]);
const SLUT = 'let senasteSpar = [];';
const a = src.indexOf('/* ── samma kort, två spår'), b = src.indexOf(SLUT, a);
const r0 = src.indexOf(src.includes('function kamSkalaFryst()') ? 'function kamSkalaFryst()' : 'function kamKortsida('), r1 = src.indexOf('/* Library-högen (MES-93', r0);
const c0 = src.indexOf('function clampKort(e, board, gravRuta)'), c1 = src.indexOf('/* Hur stor del av rm som täcks av ro. */', c0);
if (a < 0 || b < 0 || r0 < 0 || r1 < 0 || c0 < 0 || c1 < 0) throw new Error('hittar inte avstämningen eller ritningen (kamKortsida … speglaKamPos, clampKort) i ' + HTML);
const kod = src.slice(a, b + SLUT.length);
const ritkod = src.slice(r0, r1) + '\n' + src.slice(c0, c1);

/* Miljön: som jamfor.cjs och skala.cjs, plus det ritningen läser i dag (leken och graveyard bland korten
   finns inte här: lekPlacera gör ingenting, ingen graveyard-ruta). */
const miljo = `
const spelLage = { mig: 'p1', id: 'spel1' };
const lsMinne = new Map();
const LS = { get: (k, d) => lsMinne.has(k) ? JSON.parse(lsMinne.get(k)) : d, set: (k, v) => { lsMinne.set(k, JSON.stringify(v)); return true; }, del: k => { lsMinne.delete(k); } };
const state = { players: [{ id: 'p1', cards: [], pending: [] }] };
const minSpelare = () => state.players[0];
const ZON_SPELL = 'spell', ZON_MANA = 'mana', ZON_GRAV = 'grav', ZON_EXIL = 'exil';
const LAND = new Set(['Plains', 'Forest', 'Swamp', 'Island', 'Mountain']);
const zonAv = e => e.zon || (LAND.has(e.name) ? ZON_MANA : ZON_SPELL);
let n = 0; const uid = () => 'c' + (++n);
const cropCache = new Map();
const prefs = { lyftForklarad: true }; const savePrefs = () => {};
const save = () => {}, renderAll = () => {}, resolveAll = () => {}, renderMode = () => {}, renderGrid = () => {}, uppdateraPbStatus = () => {}, kamSkruvTal = () => {};
let kamFas = '', kamYta = null, kamRad = '', kamTot = 0, kamLast = 0, kamSer = 0;
const BORTA_NAD = ${NAD_MS}, SAMTIDIGT_MS = 3000; let lyftT = null, lyftTips = null;
let hoppade = new Set(), borttagna = new Set();
function slappLyft(k) { delete k.lyft; if (lyftTips === k.cid) lyftTips = null; }
function glomSpar() {}
let kamGrund = null;
let lekTal = new Map();
const lekAntal = namn => lekTal.has(namn) ? lekTal.get(namn) : Infinity;
let grundFragor = [];
function grundFraga(namn, spar) { grundFragor.push({ namn, spar, nu: Date.now() }); }
const MATTA = { CW: 178, CH: 248, LW: 178, LH: 248, KANT: 8, TOPP: 50, HOG: 26 };
let kamUpplosning = { w: 1920, h: 1080 };
let kamSpegel = false, kamVand = 0;
const kamOriNyckel = () => kamVand + (kamSpegel ? 'm' : '');
const oppFor = () => ({});
const arMitt = () => true, mittLage = () => 'bord'; let kamAnsluten = true;
const gravRuta = () => null;
const paMattan = e => { const z = zonAv(e); return z !== ZON_GRAV && z !== ZON_EXIL; };
function matSlag(e) { return zonAv(e) === ZON_MANA ? 'land' : 'perm'; }
function matStorlek(e) { return matSlag(e) === 'land' ? { w: MATTA.LW, h: MATTA.LH } : { w: MATTA.CW, h: MATTA.CH }; }
function lekPlacera() { return false; }
function speglatBord() { return true; }
let kamGravRad = null;
`;
const CW = 178, CH = 248;

/* ── facit ── */
const kant = (h, i, j, B, H) => Math.hypot((h[i][0] - h[j][0]) * B, (h[i][1] - h[j][1]) * H);
function lasLagen(fil, tMax) {
  const L = JSON.parse(fs.readFileSync(fil, 'utf8'));
  const B = L.bredd, H = L.hojd;
  return { B, H, lagen: L.lagen.filter(l => l.t <= tMax).map(l => ({ t: l.t, kort: l.kort.filter(k => k.zon !== 'bib' && !/^token|^library$/.test(k.namn)).map(k => ({
    namn: k.namn, id: k.id, hog: k.hog || '-', tappad: !!k.tappad,
    cx: k.horn.reduce((s, p) => s + p[0], 0) / 4, cy: k.horn.reduce((s, p) => s + p[1], 0) / 4,
    kortPx: (kant(k.horn, 0, 1, B, H) + kant(k.horn, 2, 3, B, H)) / 2,   // namnradens kant = kortsidan, i bildens pixlar
    poly: k.horn.map(p => [p[0] * B, p[1] * H])
  })) })) };
}
/* Bordsloggen fryst i uppspelarens underlag (ur dev/golden/senaste.json, commit 5505933), så att talen inte
   flyttar sig när golden sparas om. */
const UNDERLAG = path.join(ROT, 'dev', 'mattest', 'underlag', 'golden-13-18-bordlogg.json.gz');
let underlag = null;
function golden(nr, lagenFil, tMax) {
  if (!underlag) underlag = JSON.parse(require('zlib').gunzipSync(fs.readFileSync(UNDERLAG)).toString('utf8'));
  const id = Object.keys(underlag.fall).find(k => k.startsWith(nr + '-'));
  const r = id && underlag.fall[id];
  if (!r || !r.bordLogg) throw new Error(`golden ${nr} saknar bordslogg i ${path.relative(ROT, UNDERLAG)}`);
  const m = /(\d+)\s*[×x]\s*(\d+)/.exec(r.kallStorlek);
  const facit = lasLagen(path.join(ROT, lagenFil), tMax);
  let rader = r.bordLogg;
  if (LAGER === 'alla') {
    /* Varje spår på ett facit-kort (senaste ritade läget, högst 0,6 kortbredd från kortets mitt) får kortets namn. */
    rader = rader.map(rad => {
      let l = null; for (const x of facit.lagen) { if (x.t > rad.s + 0.5) break; l = x; }
      if (!l) return rad;
      return Object.assign({}, rad, { spar: (rad.spar || []).map(t => {
        if (t.w == null || t.h == null) return t;
        const cx = t.vx != null ? t.vx : t.x + t.w / 2, cy = t.vy != null ? t.vy : t.y + t.h / 2;
        let bast = null, bd = Infinity;
        for (const k of l.kort) { const d = Math.hypot((cx - k.cx) * facit.B, (cy - k.cy) * facit.H) / k.kortPx; if (d < bd) { bd = d; bast = k; } }
        if (!bast || bd > 0.6) return t;
        return Object.assign({}, t, { namn: bast.namn, tillstand: t.tillstand === 'okand' || !t.tillstand ? 'klar' : t.tillstand, saker: true });
      }) });
    });
  }
  return { id: 'g' + nr, rader, upplosning: { w: +m[1], h: +m[2] }, facit };
}
function p0921() {
  const { lasFall } = require(path.join(ROT, 'dev', 'mattest', 'fall.cjs'));
  const f = lasFall('p0921'); const B = 705, H = 438;
  const kortB = y => 98 + 14.6 * (y - 0.27);   // som dev/mattest/fall.cjs
  const lagen = f.v2.map(q => ({ t: q.ruta, kort: q.kort.map(k => {
    const bw = kortB(k.y), bh = bw * 1.43, w = k.tappad ? bh : bw, h = k.tappad ? bw : bh, x0 = k.x * B - w / 2, y0 = k.y * H - h / 2;
    return { namn: 'Kort ' + String(k.id).padStart(2, '0'), id: k.id, hog: k.hog, tappad: k.tappad, cx: k.x, cy: k.y, kortPx: bw, poly: [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]] };
  }) }));
  return { id: 'p0921', rader: f.rader, upplosning: f.upplosning, facit: { B, H, lagen }, ideal: true };
}

/* ── uppspelningen ── */
function byggApp(upplosning, klocka, timers) {
  let timerN = 0;
  const setTimeoutV = (fn, ms) => { const id = ++timerN; timers.push({ id, t: klocka.t + (+ms || 0), fn }); timers.sort((p, q) => p.t - q.t); return id; };
  const clearTimeoutV = id => { const i = timers.findIndex(x => x.id === id); if (i >= 0) timers.splice(i, 1); };
  return new Function('Date', 'setTimeout', 'clearTimeout', miljo + kod + '\n' + ritkod + `
kamUpplosning = ${JSON.stringify(upplosning)};
return { avstamBord, kamSkala, speglaKamPos, kamTillMatta, get kort() { return state.players[0].cards; }, set grund(v) { kamGrund = v; } };`)({ now: () => klocka.t }, setTimeoutV, clearTimeoutV);
}
const rekt = (x, y, tappad) => tappad ? { x: x - CH / 2, y: y - CW / 2, w: CH, h: CW } : { x: x - CW / 2, y: y - CH / 2, w: CW, h: CH };
function spela(fall) {
  const klocka = { t: 1e6 }, timers = [];
  const app = byggApp(fall.upplosning, klocka, timers);
  const loggat = fall.rader.find(r => r.grund != null);
  app.grund = loggat ? loggat.grund : 90;
  const VIRT0 = 1e6;
  const alla = fall.rader.map((r, i) => ({ t: VIRT0 + Math.round(r.s * 1000), r, slag: 'rapport', nr: i }));
  const slutT = alla[alla.length - 1].t + 3500;
  for (let t = alla[0].t + 3000; t <= slutT; t += 3000) alla.push({ t, slag: 'hjärtslag' });
  alla.sort((p, q) => (p.t - q.t) || ((p.slag === 'hjärtslag') - (q.slag === 'hjärtslag')) || ((p.nr || 0) - (q.nr || 0)));
  const p = { id: 'p1', cards: null }, v = { pan: { x: 0, y: 0 }, z: 1 };
  const bilder = [];
  let senast = null, fas;
  const matt = rad => {
    p.cards = app.kort;
    if (LAGER === 'geometri') {
      /* Varje spår rakt genom kamSkala (ett nytt bord per rapport: ingen låst skala) och kamTillMatta. */
      const spar = (rad ? rad.spar || [] : []).filter(t => t.w != null && t.h != null && (fall.ideal || ['stilla', 'klar', 'okand'].includes(t.tillstand)));
      const kam = t => ({ x: t.vx != null ? t.vx : t.x + t.w / 2, y: t.vy != null ? t.vy : t.y + t.h / 2, w: t.w, h: t.h });
      const q = { id: 'geo' + bilder.length, cards: spar.map(t => ({ kam: kam(t) })) };
      const skala = spar.length ? app.kamSkala(q) : null;
      bilder.push({ s: (klocka.t - VIRT0) / 1000, skala, kort: spar.map(t => { const k = kam(t), m = app.kamTillMatta(k, skala); return { namn: null, spar: t.id, kam: k, cx: m.x, cy: m.y, tappad: !!t.tappad, rect: null }; }) });
      return;
    }
    app.speglaKamPos(p, v);
    const skala = app.kamSkala(p);
    const syn = p.cards.filter(c => c.spar != null && c.kam && c.lyft == null && c.zon !== 'grav' && c.zon !== 'exil' && c.x != null);
    bilder.push({ s: (klocka.t - VIRT0) / 1000, skala, kort: syn.map(c => ({ namn: c.name, spar: c.spar, kam: c.kam, cx: c.x + CW / 2, cy: c.y + CH / 2, tappad: !!c.tapped, kant: c.x <= MATTA_KANT + 0.01 || c.y <= MATTA_TOPP + 0.01 })) });
  };
  const MATTA_KANT = 8, MATTA_TOPP = 50;
  for (const h of alla) {
    while (timers.length && timers[0].t <= h.t) { const tm = timers.shift(); klocka.t = tm.t; tm.fn(); matt(senast); }
    klocka.t = h.t;
    if (h.slag === 'hjärtslag') { if (senast) { app.avstamBord(senast.spar, false, fas, undefined, undefined, senast.grav); matt(senast); } continue; }
    fas = h.r.fas; senast = h.r.nollstall ? null : h.r;
    app.avstamBord(h.r.spar || [], !!h.r.nollstall, h.r.fas, undefined, undefined, h.r.grav);
    matt(h.r);
  }
  return bilder;
}

/* ── måtten ── */
function area(p) { let s = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; s += x1 * y2 - x2 * y1; } return Math.abs(s) / 2; }
/* Skärningens area för två konvexa polygoner (Sutherland–Hodgman). */
function skarning(subj, clip) {
  let o = 0; for (let i = 0; i < clip.length; i++) { const [x1, y1] = clip[i], [x2, y2] = clip[(i + 1) % clip.length]; o += x1 * y2 - x2 * y1; }
  const riktning = Math.sign(o) || 1;
  let ut = subj;
  for (let i = 0; i < clip.length && ut.length; i++) {
    const A = clip[i], B = clip[(i + 1) % clip.length];
    const inne = p => riktning * ((B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0])) >= 0;
    const skar = (p, q) => { const dx = q[0] - p[0], dy = q[1] - p[1], ex = B[0] - A[0], ey = B[1] - A[1]; const t = (ex * (p[1] - A[1]) - ey * (p[0] - A[0])) / (ey * dx - ex * dy); return [p[0] + t * dx, p[1] + t * dy]; };
    const inn = ut; ut = [];
    for (let j = 0; j < inn.length; j++) { const P = inn[j], Q = inn[(j + 1) % inn.length], pi = inne(P), qi = inne(Q); if (pi) { ut.push(P); if (!qi) ut.push(skar(P, Q)); } else if (qi) ut.push(skar(P, Q)); }
  }
  return ut.length >= 3 ? area(ut) : 0;
}
const rektPoly = r => [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
const median = l => { if (!l.length) return null; const s = l.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const kvantil = (l, q) => { if (!l.length) return null; const s = l.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const f2 = x => x == null ? '–' : x.toFixed(2);

/* Para mattans kort med facits: på namn (p0921: spårets id), sedan närmast i bilden. I geometrin: bara på läget. */
function para(bild, lage, fall) {
  const kand = [];
  for (const m of bild.kort) for (const f of lage.kort) {
    if (LAGER !== 'geometri' && (fall.ideal ? m.spar !== f.id : m.namn !== f.namn)) continue;
    const d = Math.hypot((m.kam.x - f.cx) * fall.facit.B, (m.kam.y - f.cy) * fall.facit.H) / f.kortPx;
    if (d <= (LAGER === 'geometri' ? 0.6 : 1.2)) kand.push([d, m, f]);
  }
  kand.sort((x, y) => x[0] - y[0]);
  const tF = new Set(), tM = new Set(), par = [];
  for (const [, m, f] of kand) { if (tF.has(f) || tM.has(m)) continue; tF.add(f); tM.add(m); par.push({ m, f, rect: rekt(m.cx, m.cy, LAGER === 'geometri' ? f.tappad : m.tappad) }); }
  return par;
}

const ut = {};
console.log(`${path.relative(ROT, HTML) || HTML} · lager ${LAGER}`);
for (const id of FALLEN) {
  const fall = id === '13' ? golden('13', 'dev/golden/inspelningar/2026-09-19-mes-246-las-fore-slapp/lagen.json', 172)
    : id === '18' ? golden('18', 'dev/golden/inspelningar/2026-10-02-fall-13b-0,5x-sidoljus/lagen.json', 181)
    : id === 'p0921' ? p0921() : null;
  if (!fall) throw new Error('okänt fall ' + id + ' (finns: 13, 18, p0921)');
  const bilder = spela(fall);
  const L = fall.facit.lagen;
  const fel = [], felPar = [], omlott = [], isar = [], skalor = [], kantN = [];
  let parade = 0, iFacit = 0;
  for (let i = 0; i < L.length; i++) {
    const lage = L[i], nasta = L[i + 1] ? L[i + 1].t : lage.t + 10;
    const ts = fall.ideal ? lage.t + 2.5 : Math.min(lage.t + 3, nasta - 0.3);
    let bild = null; for (const x of bilder) { if (x.s > ts + 1e-9) break; bild = x; }
    if (!bild) continue;
    const par = para(bild, lage, fall);
    parade += par.length; iFacit += lage.kort.length;
    if (bild.skala) skalor.push(bild.skala);
    for (let x = 0; x < par.length; x++) for (let y = x + 1; y < par.length; y++) {
      const A = par[x], B = par[y];
      const dBord = Math.hypot((A.f.cx - B.f.cx) * fall.facit.B, (A.f.cy - B.f.cy) * fall.facit.H) / ((A.f.kortPx + B.f.kortPx) / 2);
      const dMatta = Math.hypot(A.m.cx - B.m.cx, A.m.cy - B.m.cy) / CW;
      fel.push(Math.abs(dMatta - dBord)); felPar.push({ t: lage.t, a: A.f.namn, b: B.f.namn, bord: dBord, matta: dMatta });
      const tBord = skarning(A.f.poly, B.f.poly) / Math.min(area(A.f.poly), area(B.f.poly));
      const tMatta = skarning(rektPoly(A.rect), rektPoly(B.rect)) / Math.min(A.rect.w * A.rect.h, B.rect.w * B.rect.h);
      const hog = A.f.hog !== '-' && A.f.hog === B.f.hog;
      if (tMatta > 0.2 && tBord <= 0 && !hog) omlott.push({ t: lage.t, a: A.f.namn, b: B.f.namn, matta: +tMatta.toFixed(2) });
      if ((hog || tBord > 0.2) && tMatta <= 0) isar.push({ t: lage.t, a: A.f.namn, b: B.f.namn, bord: +dBord.toFixed(2), matta: +dMatta.toFixed(2) });
    }
    for (const q of par) if (q.m.kant) kantN.push({ t: lage.t, namn: q.f.namn });
  }
  const r = { lagen: L.length, parade, iFacit, par: fel.length, median: median(fel), p90: kvantil(fel, 0.9), max: fel.length ? Math.max(...fel) : null,
    falskaOmlott: omlott.length, hogarIsar: isar.length, vidKanten: kantN.length, skala: skalor.length ? [Math.min(...skalor), median(skalor), Math.max(...skalor)].map(Math.round) : null };
  ut[fall.id] = Object.assign({}, r, DETALJ ? { omlott, isar, storstaFel: felPar.sort((x, y) => Math.abs(y.matta - y.bord) - Math.abs(x.matta - x.bord)).slice(0, 10) } : {});
  console.log(`  ${fall.id.padEnd(6)} ${r.lagen} lägen, ${r.parade}/${r.iFacit} kort parade, ${r.par} par · avståndsfel median ${f2(r.median)} p90 ${f2(r.p90)} max ${f2(r.max)} kortbredder · falska omlott ${r.falskaOmlott} · högar isär ${r.hogarIsar} · vid kanten ${r.vidKanten}${r.skala ? ' · skala ' + r.skala.join('/') : ''}`);
  if (DETALJ) {
    for (const o of omlott) console.log('      falskt omlott', JSON.stringify(o));
    for (const o of isar) console.log('      hög isär', JSON.stringify(o));
    for (const x of ut[fall.id].storstaFel) console.log(`      ${x.t} ${x.a} – ${x.b}: bordet ${f2(x.bord)}, mattan ${f2(x.matta)}`);
  }
}
if (JSONUT) { fs.writeFileSync(path.resolve(JSONUT), JSON.stringify(ut, null, 1) + '\n'); console.log(`  skrivet till ${JSONUT}`); }

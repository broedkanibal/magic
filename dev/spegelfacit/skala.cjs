#!/usr/bin/env node
/* Spegelläget: glider korten isär på det digitala bordet? (MES-293, beslut 5)

   Kör:  node dev/spegelfacit/skala.cjs [--korning fil.json] [--html index.html] [--S 0.16] [--json ut.json]

   Spelar upp telefonens bordslogg (steg 1, kor.cjs) genom datorns RIKTIGA
   avstamBord — samma utdrag och miljö som jamfor.cjs — och efter varje steg
   datorns RIKTIGA ritning ur samma index.html: kamSkala (och kamSkalaFryst
   där den finns), kamTillMatta, speglaKamPos och clampKort. Det är vad Table
   leads ritar på brädet. Mäter:

   - skalan över tid (brädpixlar per bildbredd): min, median, max och hur
     många gånger den bytte
   - glidningen: hur långt varje synligt kort ligger från där det hade legat
     om HELA bordet ritats med en och samma skala (minsta kvadrat, steg för
     steg), i kortbredder. Ett bord ritat med en skala har 0. Kort som klämts
     mot kanten räknas inte här — de står i nästa rad
   - kort·steg vid brädets kant: kortets hörn på MATTA.KANT (vänster) eller
     MATTA.TOPP (överkant), och var kortets mitt låg i bilden

   Kameran antas otappad = lodrätt, ingen vridning eller spegling av vyn
   (kamVand 0), och ingen graveyard-ruta att klämma mot (den ritas av DOM:en).
   Den frysta skalan behöver provkortets kortsida S (bildbredder, uppstartens
   steg 4); utan --S tas medianen av de namngivna otappade spårens lådbredd i
   loggen, en ställföreträdare — provkortet finns inte i passets video.

   Ett MÅTT, inget prov: slutkod 0. .cjs eftersom package.json säger "type": "module". */
'use strict';
const fs = require('fs'), path = require('path');
const { ROT, PASS_FORVAL, materialMapp, lekAntal } = require('./facit.cjs');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const HTML = path.resolve(arg('--html', path.join(ROT, 'index.html')));
const KORNING = path.resolve(arg('--korning', path.join(materialMapp(arg('--pass', PASS_FORVAL)), 'spegel-lokal.json')));
const JSONUT = arg('--json', '');
const src = fs.readFileSync(HTML, 'utf8');
const NAD_MS = +((src.match(/const BORTA_NAD = (\d+);/) || [0, 3000])[1]);
const SLUT = 'let senasteSpar = [];';
const a = src.indexOf('/* ── samma kort, två spår'), b = src.indexOf(SLUT, a);
if (a < 0 || b < 0) throw new Error('hittar inte avstämningen i ' + HTML);
const kod = src.slice(a, b + SLUT.length);
const r0 = src.indexOf(src.includes('function kamSkalaFryst()') ? 'function kamSkalaFryst()' : 'function kamSkala(p)');
const r1 = src.indexOf('/* Library-högen (MES-93', r0);
const c0 = src.indexOf('function clampKort(e, board, gravRuta)'), c1 = src.indexOf('/* Hur stor del av rm som täcks av ro. */', c0);
if (r0 < 0 || r1 < 0 || c0 < 0 || c1 < 0) throw new Error('hittar inte ritningen (kamSkala … speglaKamPos, clampKort) i ' + HTML);
const ritkod = src.slice(r0, r1) + '\n' + src.slice(c0, c1);

/* Miljön: som jamfor.cjs, plus det ritningen läser. */
const TYPER = { 'Killing Glare': 'Sorcery', "Night's Whisper": 'Sorcery', 'Coat with Venom': 'Instant', 'Resistance Reunited': 'Instant', "Vraska's Finisher": 'Instant', 'Pacifism': 'Enchantment — Aura' };
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
const TYPER = ${JSON.stringify(TYPER)};
const typLinje = k => TYPER[k.name] || '';
let grundFragor = [];
function grundFraga(namn, spar) { grundFragor.push({ namn, spar, nu: Date.now() }); }
const MATTA = { CW: 178, CH: 248, LW: 178, LH: 248, KANT: 8, TOPP: 50 };
let kamUpplosning = { w: 1080, h: 610 };
let kamSpegel = false, kamVand = 0;
const kamOriNyckel = () => kamVand + (kamSpegel ? 'm' : '');
let oppStub = {};
const oppFor = () => oppStub;
const arMitt = () => true, mittLage = () => 'bord'; let kamAnsluten = true;
const gravRuta = () => null;
const paMattan = e => { const z = zonAv(e); return z !== ZON_GRAV && z !== ZON_EXIL; };
function matSlag(e) { return zonAv(e) === ZON_MANA ? 'land' : 'perm'; }
function matStorlek(e) { return matSlag(e) === 'land' ? { w: MATTA.LW, h: MATTA.LH } : { w: MATTA.CW, h: MATTA.CH }; }
`;
const klocka = { t: 1e6 };
const timers = []; let timerN = 0;
const setTimeoutV = (fn, ms) => { const id = ++timerN; timers.push({ id, t: klocka.t + (+ms || 0), fn }); timers.sort((p, q) => p.t - q.t); return id; };
const clearTimeoutV = id => { const i = timers.findIndex(x => x.id === id); if (i >= 0) timers.splice(i, 1); };
const app = new Function('Date', 'setTimeout', 'clearTimeout', miljo + kod + '\n' + ritkod + `
return {
  avstamBord, kamSkala, speglaKamPos,
  fryst: typeof kamSkalaFryst === 'function' ? kamSkalaFryst : null,
  get kort() { return state.players[0].cards; },
  set grund(v) { kamGrund = v; },
  set lek(m) { lekTal = m; },
  set opp(o) { oppStub = o; },
  get upplosning() { return kamUpplosning; }
};`)({ now: () => klocka.t }, setTimeoutV, clearTimeoutV);
app.lek = lekAntal();

const R = JSON.parse(fs.readFileSync(KORNING, 'utf8'));
const logg = Array.isArray(R) ? R : (R.resultat ? R.resultat.bordLogg : R.bordLogg);
if (!Array.isArray(logg) || !logg.length) throw new Error('ingen bordslogg i ' + KORNING);
const loggat = logg.find(r => r.grund !== undefined && r.grund !== null);
app.grund = loggat ? loggat.grund : 90;
const med = l => { const s = l.slice().sort((p, q) => p - q); return s.length ? s[s.length >> 1] : null; };
let S = +arg('--S', 0);
if (!S) S = med(logg.flatMap(r => (r.spar || []).filter(t => t.tillstand === 'klar' && t.namn && !t.tappad && t.w > 0 && t.h > 0).map(t => t.w)));
if (app.fryst) app.opp = { klar: true, provKort: { S, L: S * 88 / 63 } };

/* Uppspelningen, som jamfor.cjs: rapporterna, hjärtslaget var tredje sekund, nådtimern. */
const VIRT0 = 1e6, HJ = 3000, SVANS = 3500;
const hand = logg.map((r, i) => ({ t: VIRT0 + Math.round(r.s * 1000), fas: r.fas, nollstall: !!r.nollstall, spar: r.spar, grav: r.grav, slag: 'rapport', nr: i }));
const alla = hand.slice();
for (let t = hand[0].t + HJ; t <= hand[hand.length - 1].t + SVANS; t += HJ) alla.push({ t, slag: 'hjärtslag' });
alla.sort((p, q) => (p.t - q.t) || ((p.slag === 'hjärtslag') - (q.slag === 'hjärtslag')) || ((p.nr || 0) - (q.nr || 0)));
const p = { cards: null }, v = { pan: { x: 0, y: 0 }, z: 1 };
const skalor = [], glid = [], kant = [];
let byten = 0, forraSkala = null, stegMedKort = 0, stegOver = 0;
const matt = () => {
  p.cards = app.kort;
  app.speglaKamPos(p, v);
  const skala = app.fryst && app.fryst() ? app.fryst() : app.kamSkala(p);
  if (forraSkala != null && Math.abs(skala - forraSkala) > 1e-9) byten++;
  forraSkala = skala; skalor.push(skala);
  const asp = app.upplosning.h / app.upplosning.w;
  const syn0 = p.cards.filter(c => c.spar != null && c.kam && c.lyft == null && c.zon !== 'grav' && c.zon !== 'exil' && !c.attachedTo && c.x != null);
  for (const c of syn0) if (c.x <= 8.01 || c.y <= 50.01) kant.push({ namn: c.name, x: c.x, y: c.y, kx: c.kam.x, ky: c.kam.y });
  const syn = syn0.filter(c => c.x > 8.01 && c.y > 50.01);
  if (syn.length < 2) return;
  /* Bästa enda skala: kortets mitt = (198 + s·kx, 50 + s·asp·ky) i kamTillMatta med kamVand 0. */
  let num = 0, den = 0;
  for (const c of syn) { const cx = c.x + 89 - 198, cy = c.y + 124 - 50, kx = c.kam.x, ky = c.kam.y * asp; num += cx * kx + cy * ky; den += kx * kx + ky * ky; }
  const s = num / den;
  const res = syn.map(c => Math.hypot(c.x + 89 - 198 - s * c.kam.x, c.y + 124 - 50 - s * asp * c.kam.y) / 178);
  glid.push(...res); stegMedKort++; if (Math.max(...res) > 0.5) stegOver++;
};
let senastBord = null, senastRapport = null, senastFas;
const steg = (slag, t, spar, nollstall, fas, grav) => {
  klocka.t = t;
  if (slag === 'nådtimer') { const tm = timers.shift(); tm.fn(); }
  else app.avstamBord(spar, nollstall, fas, undefined, undefined, grav);
  matt();
};
for (const h of alla) {
  while (timers.length && timers[0].t <= h.t) steg('nådtimer', timers[0].t, null, false, senastFas);
  if (h.slag === 'hjärtslag') { if (senastBord) steg('hjärtslag', h.t, senastBord, false, senastFas, senastRapport ? senastRapport.grav : undefined); continue; }
  if (h.nollstall) senastBord = null; else { senastBord = h.spar; senastRapport = h; }
  senastFas = h.fas;
  steg('rapport', h.t, h.spar || [], h.nollstall, h.fas, h.grav);
}
const q = (l, f) => { const s = l.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(f * s.length))] : null; };
const f2 = x => x == null ? '–' : (+x).toFixed(2);
const kantNamn = [...new Set(kant.map(k => k.namn))];
const ut = {
  html: path.relative(ROT, HTML) || HTML, korning: path.relative(ROT, KORNING), bord: logg.length, fryst: !!app.fryst, S: +(+S).toFixed(4),
  skala: { min: Math.round(Math.min(...skalor)), median: Math.round(q(skalor, 0.5)), max: Math.round(Math.max(...skalor)), byten, steg: skalor.length },
  glid: { kortSteg: glid.length, median: +f2(q(glid, 0.5)), p90: +f2(q(glid, 0.9)), max: +f2(Math.max(0, ...glid)), over025: glid.filter(x => x > 0.25).length, over050: glid.filter(x => x > 0.5).length },
  stegMedKort, stegOverHalv: stegOver,
  kant: { kortSteg: kant.length, vanster: kant.filter(k => k.x <= 8.01).length, overkant: kant.filter(k => k.y <= 50.01).length,
          kort: kantNamn.map(nm => { const l = kant.filter(k => k.namn === nm); return { namn: nm, kortSteg: l.length, bildY: [+f2(Math.min(...l.map(k => k.ky))), +f2(Math.max(...l.map(k => k.ky)))] }; }) }
};
console.log(`${ut.html} ${ut.fryst ? `(fryst skala: provkortets kortsida S ${ut.S})` : '(medianen av korten i bild)'} · ${ut.korning}, ${logg.length} bord`);
console.log(`  skalan: ${ut.skala.min}–${ut.skala.max} brädpixlar per bildbredd (median ${ut.skala.median}), bytte ${byten} gånger på ${skalor.length} steg`);
console.log(`  glidning mot en enda skala: median ${f2(ut.glid.median)} · p90 ${f2(ut.glid.p90)} · max ${f2(ut.glid.max)} kortbredder över ${glid.length} kort·steg; över 0,25: ${ut.glid.over025}, över 0,5: ${ut.glid.over050}; steg där något kort låg över 0,5 fel: ${stegOver}/${stegMedKort}`);
console.log(`  kort·steg vid brädets kant: ${kant.length} (vänster ${ut.kant.vanster}, överkant ${ut.kant.overkant})${ut.kant.kort.length ? ' — ' + ut.kant.kort.map(k => `${k.namn} ${k.kortSteg} (mitten i bilden y ${k.bildY.join('–')})`).join(', ') : ''}`);
if (JSONUT) { fs.writeFileSync(path.resolve(JSONUT), JSON.stringify(ut, null, 1) + '\n'); console.log(`  skrivet till ${JSONUT}`); }

#!/usr/bin/env node
/* Spegelläget mot händelsefacit, steg 2: det digitala bordet över tid,
   jämfört med facit rad för rad.

   Kör:  node dev/spegelfacit/jamfor.cjs [--pass …] [--korning fil.json] [--md rapport.md] [--tsv bordet.tsv] [--json allt.json]
         node dev/spegelfacit/jamfor.cjs --logg ~/Downloads/pass-….json   (en bordslogg sparad ur appen i ett riktigt pass)

   Källan är telefonens bordslogg ur steg 1 (kor.cjs) — eller ur ett riktigt
   pass, sparad med "Spara bordsloggen". Varje bord spelas upp genom datorns
   RIKTIGA avstamBord ur index.html, med klockan på bordets tid, hjärtslaget
   var tredje sekund och nådtimern härmad — som dev/dubbletter.cjs. Efter
   varje steg läses det digitala bordet av (varje kort: namn, zon, tappat,
   nedtonat, kamerans läge på mattan, fäst vid), och ändringarna blir en
   tidslinje: nytt kort, ut ur graveyard, tillbaka, nedtonat, till
   graveyard, tappat, otappat, flyttat, fråga i granskningen.

   Sedan jämförs tidslinjen med facit, en rad i taget, i ett fönster från
   FORE s före facits tid till EFTER s efter (facits tid är när rösten
   börjar, strax efter att handen släppt):

     spelar, grav_till_bord  ett kort med namnet kom på bordet (nytt, ut ur
                             graveyard eller tillbaka efter nedtoning)
     tar_bort                kortet lämnade bordet: till graveyard av sig
                             självt, eller nedtonat (frågan "plockades det upp?")
     tappar, otappar         kortets tap-läge slog om åt rätt håll
     flyttar                 SAMMA kort bytte plats — ett kort som tonades ned
                             och ett nytt med samma namn är "borta + nytt", inte
                             en flytt
     drar                    library minskar med ett (appen räknar leken som
                             "hand och library ihop", så ett drag syns inte;
                             telefonens signal — leken lyft ur sin ruta — står
                             bredvid)
     grav_till_hand, grav_exile, grav_ur_bild
                             graveyard minskar med ett (högvaktens räknare på
                             telefonen står bredvid)

   Varje kort med namnet och varje händelse används för högst en rad (flera
   Swamp som tappas samtidigt ska vara flera kort som vrids). Två varv: först
   tar varje rad en händelse med SITT namn; i andra varvet får en rad utan
   träff en händelse med ett annat namn inom EFTER_ANNAT s (då syntes
   handlingen, men på fel kort), en fråga i granskningen, eller "borta + nytt". Tap-läge och plats läses i bordet en sekund
   efter händelsen. Plats: "ensamt" = kortets ruta på mattan täcker inget
   annat kort; "hög A" = den täcker ett Swamp (hög A är landhögen);
   "ovanpå"/"under" med ett kort i `till` = den täcker det kortet. "Fäst
   digitalt" = kortets attachedTo pekar på det kortet — kameran sätter det
   aldrig i dag, så kolumnen mäter ett hål, inte ett fel i en regel.

   Ett MÅTT, inget prov: slutkod 0 vad siffrorna än blir, ingen baslinje.

   Utdraget ur index.html och miljön är kopierade ur dev/dubbletter.cjs (som
   i sin tur kopierar dev/avstamning.cjs), med två tillägg: lekens antal ur
   dev/golden/lek.txt (appen har leken i ett spel; utan den kan ett kort
   aldrig lyftas ur graveyard, MES-248) och typraden för de namn där den
   spelar roll (besvärjelseregeln, auran). .cjs eftersom package.json säger
   "type": "module". */
'use strict';
const fs = require('fs'), path = require('path');
const { ROT, PASS_FORVAL, materialMapp, lasFacit, lekAntal } = require('./facit.cjs');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PASS = arg('--pass', PASS_FORVAL);
const LOGG = arg('--logg', '');
const KORNING = LOGG ? '' : path.resolve(arg('--korning', path.join(materialMapp(PASS), 'spegel-lokal.json')));
const MD = arg('--md', ''), TSV = arg('--tsv', ''), JSONFIL = arg('--json', '');
const FORE = +arg('--fore', 2), EFTER = +arg('--efter', 10);
const UTAN_LEK = process.argv.includes('--utan-lek');
/* --html <fil>: en annan index.html (t.ex. main:s, ur `git show main:index.html`),
   så att före och efter spelas upp på samma logg från samma träd (MES-294). */
const HTML = path.resolve(arg('--html', path.join(ROT, 'index.html')));
const SVANS_S = 3.5, HJARTSLAG_MS = 3000, VIRT0 = 1e6, GRUND_PROD = 90;
/* Ett annat namn får svara mot en rad bara nära facits tid: annars blev ett
   falskt tap på kortet som lades ut nio sekunder senare "fel kort" för raden. */
const EFTER_ANNAT = +arg('--efter-annat', 4);
const TACK = 0.2;   // två kortrutor på mattan "ligger ihop" när de delar en femtedel av den mindre

/* ── utdraget ur index.html (som dev/dubbletter.cjs) ── */
const src = fs.readFileSync(HTML, 'utf8');
/* --nad <ms>: datorns väntan innan ett tappat kort tonas ned (BORTA_NAD) i
   uppspelningen — för att jämföra väntetider på samma logg (MES-291).
   Förval: appens eget värde. */
const NAD_MS = +arg('--nad', (src.match(/const BORTA_NAD = (\d+);/) || [0, 3000])[1]);
const AUTO_FLYTT = +((src.match(/const AUTO_FLYTT = ([\d.]+);/) || [0, 0.15])[1]);
const SLUT = 'let senasteSpar = [];';
const a = src.indexOf('/* ── samma kort, två spår'), b = src.indexOf(SLUT, a);
if (a < 0 || b < 0) throw new Error('hittar inte avstämningen i ' + HTML);
const kod = src.slice(a, b + SLUT.length);

/* Typraden där den ändrar vad avstämningen gör: Instant/Sorcery
   (besvärjelseregeln) och Aura (följer sin värd till graveyard). Övriga
   namn i leken är varelser, utrustning och land. */
const TYPER = { 'Killing Glare': 'Sorcery', "Night's Whisper": 'Sorcery', 'Coat with Venom': 'Instant', 'Resistance Reunited': 'Instant', "Vraska's Finisher": 'Instant', 'Pacifism': 'Enchantment — Aura' };

const miljo = `
const spelLage = { mig: 'p1', id: 'spel1' };
const lsMinne = new Map();
const LS = { get: (k, d) => lsMinne.has(k) ? JSON.parse(lsMinne.get(k)) : d, set: (k, v) => { lsMinne.set(k, JSON.stringify(v)); return true; }, del: k => { lsMinne.delete(k); } };
const state = { players: [{ id: 'p1', cards: [], pending: [] }] };
const minSpelare = () => state.players[0];
const ZON_SPELL = 'spell', ZON_MANA = 'mana', ZON_GRAV = 'grav';
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
`;

function byggApp(grund, lek) {
  const klocka = { t: VIRT0 };
  const timers = []; let timerN = 0;
  const setTimeoutV = (fn, ms) => { const id = ++timerN; timers.push({ id, t: klocka.t + (+ms || 0), fn }); timers.sort((p, q) => p.t - q.t); return id; };
  const clearTimeoutV = id => { const i = timers.findIndex(x => x.id === id); if (i >= 0) timers.splice(i, 1); };
  const app = new Function('Date', 'setTimeout', 'clearTimeout', miljo + kod + `
return {
  avstamBord, tackning,
  get kort() { return state.players[0].cards; },
  get pending() { return state.players[0].pending; },
  set grund(v) { kamGrund = v; },
  set lek(m) { lekTal = m; }
};`)({ now: () => klocka.t }, setTimeoutV, clearTimeoutV);
  app.grund = grund;
  if (lek) app.lek = lek;
  return { app, klocka, timers };
}

/* ── källan ── */
function lasKalla() {
  let logg, namn, extra = {};
  if (LOGG) {
    const R = JSON.parse(fs.readFileSync(path.resolve(LOGG), 'utf8'));
    logg = Array.isArray(R) ? R : R.bordLogg; namn = path.basename(LOGG);
  } else {
    if (!fs.existsSync(KORNING)) throw new Error(`${KORNING} finns inte — kör steg 1 först: node dev/spegelfacit/kor.cjs`);
    const R = JSON.parse(fs.readFileSync(KORNING, 'utf8'));
    logg = R.resultat.bordLogg; namn = path.relative(ROT, KORNING);
    extra = { ai: R.ai, pool: R.pool, skapad: R.skapad, aiFel: R.aiFel, modell: R.resultat.ai, promptv: R.resultat.promptv, namnViaAi: R.resultat.namnViaAi };
  }
  if (!Array.isArray(logg) || !logg.length || logg.some(r => r.spar == null && !r.nollstall)) throw new Error('ingen giltig bordslogg i ' + namn);
  return { namn, logg, extra };
}

/* ── uppspelningen: det digitala bordet efter varje steg ── */
const r3 = v => v == null ? null : Math.round(v * 1000) / 1000;
const sek = t => +((t - VIRT0) / 1000).toFixed(2);
function bild(app) {
  return {
    kort: app.kort.map(c => ({ cid: c.cid, namn: c.name, zon: c.zon || null, lyft: c.lyft != null, borta: !!c.borta, tappad: !!c.tapped, spar: c.spar != null ? c.spar : null,
      kam: c.kam ? { x: r3(c.kam.x), y: r3(c.kam.y), w: r3(c.kam.w), h: r3(c.kam.h) } : null, fast: c.attachedTo || null, gravAuto: !!c.gravAuto, spellAuto: !!c.spellAuto })),
    fragor: app.pending.map(q => ({ id: q.id, spar: q.spar, namn: q.cands && q.cands[0] ? q.cands[0].name : null, overTak: !!q.overTak }))
  };
}
function spelaUpp(logg, lek) {
  const loggat = logg.find(r => r.grund !== undefined && r.grund !== null);
  const grund = loggat ? loggat.grund : GRUND_PROD;
  const { app, klocka, timers } = byggApp(grund, lek);
  const hand = logg.map((r, i) => ({ t: VIRT0 + Math.round(r.s * 1000), s: r.s, fas: r.fas, nollstall: !!r.nollstall, spar: r.spar, grav: r.grav, bib: r.bib, slag: 'rapport', nr: i }));
  const alla = hand.slice();
  const tSlut = hand[hand.length - 1].t + Math.round(SVANS_S * 1000);
  for (let t = hand[0].t + HJARTSLAG_MS; t <= tSlut; t += HJARTSLAG_MS) alla.push({ t, slag: 'hjärtslag' });
  alla.sort((p, q) => (p.t - q.t) || ((p.slag === 'hjärtslag') - (q.slag === 'hjärtslag')) || ((p.nr || 0) - (q.nr || 0)));
  const bilder = []; let forra = '';
  let senastBord = null, senastRapport = null, senastFas;
  const steg = (slag, t, spar, nollstall, fas, grav) => {
    klocka.t = t;
    if (slag === 'nådtimer') { const tm = timers.shift(); tm.fn(); }
    else app.avstamBord(spar, nollstall, fas, undefined, undefined, grav);
    const b = bild(app), sig = JSON.stringify(b);
    if (sig !== forra) { forra = sig; bilder.push(Object.assign({ s: sek(t), slag }, b)); }
  };
  for (const h of alla) {
    while (timers.length && timers[0].t <= h.t) steg('nådtimer', timers[0].t, null, false, senastFas);
    if (h.slag === 'hjärtslag') { if (senastBord) steg('hjärtslag', h.t, senastBord, false, senastFas, senastRapport ? senastRapport.grav : undefined); continue; }
    if (h.nollstall) senastBord = null; else { senastBord = h.spar; senastRapport = h; }
    senastFas = h.fas;
    steg('rapport', h.t, h.spar || [], h.nollstall, h.fas, h.grav);
  }
  return { grund, bilder };
}

/* ── tidslinjen: ändringarna mellan två bilder ── */
const paMattan = c => c.zon !== 'grav' && c.zon !== 'exil';
const syns = c => paMattan(c) && !c.lyft;
function tidslinje(bilder) {
  const h = []; let fore = { kort: [], fragor: [] };
  for (const b of bilder) {
    const var0 = new Map(fore.kort.map(c => [c.cid, c]));
    for (const c of b.kort) {
      const v = var0.get(c.cid), e = (typ, x) => h.push(Object.assign({ s: b.s, typ, cid: c.cid, namn: c.namn }, x || {}));
      if (!v) { e(paMattan(c) ? 'ny' : 'ny i graveyard'); continue; }
      if (!paMattan(v) && paMattan(c)) e('ut ur graveyard');
      if (paMattan(v) && !paMattan(c)) e(c.zon === 'grav' ? 'till graveyard' : 'till exile', { varfor: c.gravAuto ? 'högvakten' : c.spellAuto ? 'besvärjelseregeln' : '–', fran: v.lyft ? 'nedtonat' : 'bordet' });
      if (paMattan(c) && paMattan(v) && !v.lyft && c.lyft) e('nedtonat');
      if (paMattan(c) && paMattan(v) && v.lyft && !c.lyft) e('tillbaka');
      if (syns(c) && v.tappad !== c.tappad) e(c.tappad ? 'tappat' : 'otappat');
      if (c.kam && v.kam && (c.kam.x !== v.kam.x || c.kam.y !== v.kam.y)) {
        const d = Math.hypot(c.kam.x - v.kam.x, c.kam.y - v.kam.y), wd = Math.max(c.kam.w, 1e-6);
        if (d > AUTO_FLYTT * wd) e('flyttat', { d: +(d / wd).toFixed(2), fran: [v.kam.x, v.kam.y], till: [c.kam.x, c.kam.y] });
      }
      if (c.fast !== v.fast) e(c.fast ? 'fäst' : 'lossat', { vid: c.fast });
    }
    const f0 = new Set(fore.fragor.map(q => q.id));
    for (const q of b.fragor) if (!f0.has(q.id)) h.push({ s: b.s, typ: 'fråga', cid: null, namn: q.namn, overTak: q.overTak, fraga: q.id });
    fore = b;
  }
  return h;
}

/* Bordet vid tiden s: sista bilden med s' <= s. */
function bordVid(bilder, s) { let lo = 0, hi = bilder.length - 1, r = null; while (lo <= hi) { const m = (lo + hi) >> 1; if (bilder[m].s <= s) { r = bilder[m]; lo = m + 1; } else hi = m - 1; } return r || { kort: [], fragor: [] }; }
function tack(p, q) {
  if (!p || !q) return 0;
  const iw = Math.min(p.x + p.w / 2, q.x + q.w / 2) - Math.max(p.x - p.w / 2, q.x - q.w / 2);
  const ih = Math.min(p.y + p.h / 2, q.y + q.h / 2) - Math.max(p.y - p.h / 2, q.y - q.h / 2);
  return iw <= 0 || ih <= 0 ? 0 : iw * ih / Math.max(1e-9, Math.min(p.w * p.h, q.w * q.h));
}
/* Vilka synliga kort på mattan kortets ruta ligger ihop med. */
function grannar(bord, cid) {
  const c = bord.kort.find(x => x.cid === cid); if (!c || !c.kam) return null;
  return bord.kort.filter(x => x.cid !== cid && syns(x) && x.kam && tack(c.kam, x.kam) > TACK).map(x => x.namn);
}

/* ── facit mot tidslinjen ── */
const MATTAN = new Set(['spelar', 'grav_till_bord', 'tar_bort', 'tappar', 'otappar', 'flyttar']);
function jamfor(rader, bilder, h, logg) {
  const tagna = new Set();   // index i h som redan svarat mot en rad
  const ut = [];
  /* Två varv: först tar varje rad en händelse med SITT namn, i tidsordning;
     först i andra varvet får en rad som inte hittat något en händelse med ett
     annat namn, en fråga, eller "borta + nytt". Annars kunde ett utspel som
     bara blev en fråga ta nästa kort som lades ut och kalla det fel kort. */
  let varv = 1;
  const inom = (x, r, efter = EFTER) => x.s >= r.t - FORE && x.s <= r.t + efter;
  const forsta = (r, test, efter) => { let bast = -1; h.forEach((x, i) => { if (!tagna.has(i) && inom(x, r, efter) && test(x) && (bast < 0 || x.s < h[bast].s)) bast = i; }); return bast; };
  const ta = i => { tagna.add(i); return h[i]; };
  /* Facits förväntade tap-läge för ett namn som bara ligger en gång på bordet (null när det är flera, som landhögen). */
  const facitTap = (namn, t) => {
    let n = 0, tap = 0;
    for (const r of rader) { if (r.t > t + 1e-6 || r.kort !== namn) continue;
      if (r.handelse === 'spelar' || r.handelse === 'grav_till_bord') { n++; } if (r.handelse === 'tar_bort') { n--; tap = 0; }
      if (r.handelse === 'tappar') tap = 1; if (r.handelse === 'otappar') tap = 0; }
    return n === 1 ? tap : null;
  };
  const platsOk = (r, gr) => {
    if (gr == null) return null;
    const p = (r.plats || '').toLowerCase();
    if (r.till && /ovanpå|under/.test(p)) return gr.includes(r.till);
    if (/hög a/.test(p)) return gr.includes('Swamp');
    if (/^ensam/.test(p)) return gr.length === 0;
    if (r.till) return gr.includes(r.till);
    return null;   // ingen plats i facit att döma mot
  };
  const fastOk = (bord, cid, till) => {
    if (!till) return null;
    const c = bord.kort.find(x => x.cid === cid); if (!c) return false;
    const vard = c.fast && bord.kort.find(x => x.cid === c.fast);
    return !!(vard && vard.namn === till);
  };
  /* Telefonens library-ruta: första gången i fönstret leken gick från att ligga till att inte ligga (lyftes, eller skymdes av en hand). */
  const bibLyft = r => { let forra = null; for (const b of logg) { if (!b.bib) continue; const l = b.bib.ligger; if (b.s >= r.t - FORE && b.s <= r.t + EFTER && forra === true && l === false) return +(b.s - r.t).toFixed(2); if (b.s > r.t + EFTER) break; forra = l; } return null; };
  const gravAndrad = r => {
    let fore = null;
    for (const b of logg) { if (!b.grav || typeof b.grav.n !== 'number') continue; if (b.s < r.t - FORE) { fore = b.grav.n; continue; } if (b.s > r.t + EFTER) break; if (fore != null && b.grav.n > fore) return +(b.s - r.t).toFixed(2); if (fore == null) fore = b.grav.n; }
    return null;
  };
  const bibDig = s => { const bord = bordVid(bilder, s); return bord.kort.length; };   // kort ute ur leken (bordet + graveyard); appens library = lekens antal minus dem
  const gravDig = (s, namn) => bordVid(bilder, s).kort.filter(c => c.zon === 'grav' && (!namn || c.namn === namn)).length;

  const enRad = r => {
    const o = { nr: r.nr, t: r.t, handelse: r.handelse, kort: r.kort, till: r.till, plats: r.plats, syntes: false, rattKort: null, rattTap: null, rattPlats: null, fast: null, dt: null, hur: '', not: '' };
    if (r.handelse === 'spelar' || r.handelse === 'grav_till_bord') {
      const ankomst = x => x.typ === 'ny' || x.typ === 'ut ur graveyard' || x.typ === 'tillbaka';
      let i = forsta(r, x => ankomst(x) && x.namn === r.kort);
      if (i < 0 && varv === 1) return null;
      if (i < 0) i = forsta(r, x => x.typ === 'ny' && x.namn !== r.kort, EFTER_ANNAT);
      if (i >= 0) {
        const x = ta(i), bord = bordVid(bilder, x.s + 1), c = bord.kort.find(k => k.cid === x.cid);
        o.syntes = true; o.rattKort = x.namn === r.kort; o.dt = +(x.s - r.t).toFixed(2);
        o.hur = x.typ + (o.rattKort ? '' : ` — fel kort: ${x.namn}`);
        const vantTap = facitTap(r.kort, Math.max(r.t, x.s) + 1);   // facit när kortet syntes: det kan ha hunnit tappas
        o.rattTap = c ? (c.tappad ? 1 : 0) === (vantTap == null ? 0 : vantTap) : null;
        const gr = grannar(bord, x.cid); o.rattPlats = platsOk(r, gr); if (gr && gr.length) o.not = 'ligger ihop med ' + gr.join(', ');
        o.fast = fastOk(bord, x.cid, r.till);
        if (r.handelse === 'grav_till_bord' && x.typ !== 'ut ur graveyard') { o.not = (o.not ? o.not + '; ' : '') + 'kortet i graveyard ligger kvar där'; o.rattPlats = false; }
      } else {
        const q = forsta(r, x => x.typ === 'fråga');
        if (q >= 0) { const x = ta(q); o.hur = `bara en fråga i granskningen (${x.namn || 'utan förslag'}${x.overTak ? ', över lekens antal' : ''})`; o.dt = +(x.s - r.t).toFixed(2); }
        else o.hur = 'inget på bordet';
      }
    } else if (r.handelse === 'tar_bort') {
      const lamnar = x => x.typ === 'nedtonat' || x.typ === 'till graveyard' || x.typ === 'till exile';
      let i = forsta(r, x => lamnar(x) && x.namn === r.kort);
      if (i < 0 && varv === 1) return null;
      if (i < 0) i = forsta(r, x => lamnar(x) && x.namn !== r.kort, EFTER_ANNAT);
      if (i >= 0) {
        const x = ta(i);
        o.syntes = true; o.rattKort = x.namn === r.kort; o.dt = +(x.s - r.t).toFixed(2);
        /* Nedtonat först och sedan till graveyard inom fönstret (efterskottet, MES-85): slutet räknas. */
        let slut = x;
        if (x.typ === 'nedtonat') { const j = h.findIndex((y, k) => !tagna.has(k) && y.cid === x.cid && y.typ === 'till graveyard' && y.s >= x.s && y.s <= r.t + EFTER); if (j >= 0) slut = ta(j); }
        o.hur = (slut === x ? x.typ : `nedtonat, sedan till graveyard ${fs2(slut.s - r.t)}`) + (slut.varfor && slut.varfor !== '–' ? ` (${slut.varfor})` : '') + (o.rattKort ? '' : ` — fel kort: ${x.namn}`);
        o.rattPlats = r.till === 'grav' ? slut.typ === 'till graveyard' : null;
      } else {
        const kvar = bordVid(bilder, r.t + EFTER).kort.filter(c => c.namn === r.kort && syns(c)).length;
        o.hur = kvar ? `ligger kvar på bordet (${kvar} synligt med namnet)` : 'fanns inte på bordet';
      }
      const g = gravAndrad(r); if (r.till === 'grav') o.not = g == null ? 'högvakten: ingen ändring' : `högvakten: ändring ${fs2(g)}`;
    } else if (r.handelse === 'tappar' || r.handelse === 'otappar') {
      const typ = r.handelse === 'tappar' ? 'tappat' : 'otappat';
      let i = forsta(r, x => x.typ === typ && x.namn === r.kort);
      if (i < 0 && varv === 1) return null;
      if (i < 0) i = forsta(r, x => x.typ === typ && x.namn !== r.kort, EFTER_ANNAT);
      if (i >= 0) {
        const x = ta(i);
        o.syntes = true; o.rattKort = x.namn === r.kort; o.dt = +(x.s - r.t).toFixed(2); o.hur = typ + (o.rattKort ? '' : ` — fel kort: ${x.namn}`);
        /* Står läget kvar tre sekunder senare? En vridning som tas tillbaka är ingen. */
        const c = bordVid(bilder, x.s + 3).kort.find(k => k.cid === x.cid);
        o.rattTap = !!c && c.tappad === (typ === 'tappat');
        if (c && !o.rattTap) o.not = 'slog tillbaka inom 3 s';
        const gr = grannar(bordVid(bilder, x.s), x.cid); o.rattPlats = platsOk(r, gr);
        if (gr) o.not = (o.not ? o.not + '; ' : '') + (gr.length ? 'ligger ihop med ' + gr.join(', ') : 'ligger ensamt');
      } else {
        const bord = bordVid(bilder, r.t + EFTER), med = bord.kort.filter(c => c.namn === r.kort && syns(c));
        o.hur = med.length ? `ingen vridning (${med.length} ${r.kort} på bordet, ${med.filter(c => c.tappad).length} tappade)` : 'kortet fanns inte på bordet';
      }
    } else if (r.handelse === 'flyttar') {
      let i = forsta(r, x => x.typ === 'flyttat' && x.namn === r.kort);
      if (i < 0 && varv === 1) return null;
      if (i >= 0) {
        const x = ta(i), bord = bordVid(bilder, x.s + 1), c = bord.kort.find(k => k.cid === x.cid);
        o.syntes = true; o.rattKort = true; o.dt = +(x.s - r.t).toFixed(2);
        const via = h.some(y => y.cid === x.cid && y.typ === 'nedtonat' && y.s >= r.t - FORE && y.s <= x.s);
        o.hur = `flytt, samma kort (${x.d} kortbredder)` + (via ? ', via nedtoning' : '');
        const vantTap = facitTap(r.kort, r.t);
        const fore = bordVid(bilder, r.t - FORE).kort.find(k => k.cid === x.cid);
        o.rattTap = c ? (vantTap != null ? (c.tappad ? 1 : 0) === vantTap : !!fore && fore.tappad === c.tappad) : null;
        const gr = grannar(bord, x.cid); o.rattPlats = platsOk(r, gr); if (gr) o.not = gr.length ? 'ligger ihop med ' + gr.join(', ') : 'ligger ensamt';
        o.fast = fastOk(bord, x.cid, r.till);
      } else {
        const borta = h.findIndex((y, k) => !tagna.has(k) && inom(y, r) && y.namn === r.kort && (y.typ === 'nedtonat' || y.typ === 'till graveyard'));
        const nytt = h.findIndex((y, k) => !tagna.has(k) && inom(y, r) && y.namn === r.kort && y.typ === 'ny');
        if (borta >= 0 && nytt >= 0) { ta(borta); ta(nytt); o.hur = `borta + nytt kort (${h[borta].typ} ${fs2(h[borta].s - r.t)}, nytt ${fs2(h[nytt].s - r.t)})`; o.syntes = true; o.rattKort = true; o.rattPlats = false; o.dt = +(Math.max(h[borta].s, h[nytt].s) - r.t).toFixed(2); o.not = 'räknas inte som flytt'; }
        else if (borta >= 0) { ta(borta); o.hur = `${h[borta].typ} ${fs2(h[borta].s - r.t)}, inget kort på nya platsen`; }
        else if (nytt >= 0) { ta(nytt); o.hur = `nytt kort ${fs2(h[nytt].s - r.t)}, det gamla ligger kvar`; }
        else { const med = bordVid(bilder, r.t).kort.filter(c => c.namn === r.kort && syns(c)); o.hur = med.length ? 'ingen flytt (under 15 % av kortbredden, eller inte sedd)' : 'kortet fanns inte på bordet'; }
      }
    } else if (r.handelse === 'drar') {
      if (varv === 1) return null;
      const f = bibDig(r.t - FORE), e = bibDig(r.t + EFTER);
      o.hur = `appen räknar inte drag (library = lekens antal − kort ute${e > f ? `; ${e - f} kort kom ut i fönstret, på bordet` : ''})`;
      const l = bibLyft(r); o.not = l == null ? 'telefonen såg inte leken lämna sin ruta' : `telefonen såg leken lämna sin ruta ${fs2(l)}`;
    } else if (r.handelse === 'grav_till_hand' || r.handelse === 'grav_exile' || r.handelse === 'grav_ur_bild') {
      const i = forsta(r, x => x.typ === 'ut ur graveyard' && x.namn === r.kort);
      if (i < 0 && varv === 1) return null;
      const f = gravDig(r.t - FORE, r.kort), e = gravDig(r.t + EFTER, r.kort);
      if (i >= 0) { const x = ta(i); o.syntes = true; o.rattKort = true; o.dt = +(x.s - r.t).toFixed(2); o.hur = 'ut ur graveyard (men till bordet)'; o.rattPlats = false; }
      else o.hur = `graveyard: ${r.kort} ${f} → ${e}`;
      const g = gravAndrad(r); o.not = g == null ? 'högvakten: ingen ändring' : `högvakten: ändring ${fs2(g)}`;
    } else return undefined;
    return o;
  };
  const svar = new Map();
  for (varv = 1; varv <= 2; varv++) for (const r of rader) { if (svar.has(r)) continue; const o = enRad(r); if (o) svar.set(r, o); }
  for (const r of rader) if (svar.has(r)) ut.push(svar.get(r));
  /* Det som hände på bordet utan en rad i facit: nya kort, vridningar, nedtoningar och flyttar som ingen rad tog. */
  const over = h.map((x, i) => Object.assign({ i }, x)).filter(x => !tagna.has(x.i) && ['ny', 'ut ur graveyard', 'tappat', 'otappat', 'nedtonat', 'till graveyard', 'flyttat', 'fråga'].includes(x.typ));
  return { rader: ut, over };
}

/* ── utskriften ── */
const TYP_ORD = ['spelar', 'grav_till_bord', 'tar_bort', 'tappar', 'otappar', 'flyttar', 'drar', 'grav_till_hand', 'grav_exile', 'grav_ur_bild'];
const median = l => { const s = l.slice().sort((p, q) => p - q); return s.length ? (s.length % 2 ? s[s.length >> 1] : +((s[s.length / 2 - 1] + s[s.length / 2]) / 2).toFixed(2)) : null; };
const kv = (n, m) => m ? `${n}/${m}` : '–';
const fs2 = v => v == null ? '–' : (v >= 0 ? '+' : '') + (+v).toFixed(2).replace('.', ',') + ' s';
function rapport(k, res, spel, rader) {
  const L = [];
  const p = s => L.push(s);
  p(`# Spegelläget mot händelsefacit — ${PASS}`);
  p('');
  p(`Källa: \`${k.namn}\`${k.extra.skapad ? ` (körd ${k.extra.skapad.slice(0, 16).replace('T', ' ')})` : ''}. ${k.extra.ai ? `Med Claude (${k.extra.modell || '?'}, systemprompt v${k.extra.promptv != null ? k.extra.promptv : '?'}, ${k.extra.namnViaAi || 0} namn via Claude${k.extra.aiFel && k.extra.aiFel.n ? `, ${k.extra.aiFel.n} anrop misslyckades` : ''})` : 'Utan Claude — bara telefonens egen igenkänning'}. Poolen: ${k.extra.pool != null ? k.extra.pool + ' kort' : '–'}. ${k.logg.length} bord från telefonen, uppspelade genom datorns avstamBord med grundläget ${spel.grund}°, lekens antal ${UTAN_LEK ? 'av' : 'ur lek.txt'}, nåd ${NAD_MS} ms. Fönster: ${FORE} s före till ${EFTER} s efter facits tid.`);
  p('');
  p('## Per händelsetyp');
  p('');
  p('| Händelse | Rader | Syntes | Rätt kort | Rätt tap-läge | Rätt plats | Fäst digitalt | Median efter facit | Längst |');
  p('|---|---|---|---|---|---|---|---|---|');
  for (const typ of TYP_ORD) {
    const l = res.rader.filter(r => r.handelse === typ); if (!l.length) continue;
    const s = l.filter(r => r.syntes), dts = s.map(r => r.dt).filter(v => v != null);
    const del = key => { const m = l.filter(r => r[key] != null); return m.length ? kv(m.filter(r => r[key]).length, m.length) : '–'; };
    p(`| ${typ} | ${l.length} | ${kv(s.length, l.length)} | ${kv(s.filter(r => r.rattKort).length, l.length)} | ${del('rattTap')} | ${del('rattPlats')} | ${del('fast')} | ${fs2(median(dts))} | ${fs2(dts.length ? Math.max(...dts) : null)} |`);
  }
  const mat = res.rader.filter(r => MATTAN.has(r.handelse)), ms = mat.filter(r => r.syntes);
  p(`| **på mattan** | ${mat.length} | ${kv(ms.length, mat.length)} | ${kv(ms.filter(r => r.rattKort).length, mat.length)} | | | | ${fs2(median(ms.map(r => r.dt).filter(v => v != null)))} | |`);
  p('');
  p('*Syntes*: något på det digitala bordet svarade mot raden i fönstret. *Rätt kort*: på kortet med rätt namn. *Rätt tap-läge*: utspel — kortet ligger som i facit en sekund efter; tap — läget står kvar tre sekunder; flytt — läget är detsamma som före. *Rätt plats*: se huvudet i `jamfor.cjs` (ensamt / hög A / ovanpå-under kortet i `till`; tar_bort till grav = kortet hamnade i graveyard). *Fäst digitalt*: kortets attachedTo pekar på kortet i `till`. Kvoterna räknar bara rader där det går att döma.');
  p('');
  p('## Rader som missades');
  p('');
  const miss = res.rader.filter(r => !r.syntes || r.rattKort === false || r.rattTap === false || r.rattPlats === false);
  p('| Rad | t | Händelse | Kort | Plats / till | Vad det digitala bordet gjorde | Fel |');
  p('|---|---|---|---|---|---|---|');
  for (const r of miss) {
    const fel = !r.syntes ? 'syntes inte' : [r.rattKort === false && 'fel kort', r.rattTap === false && 'fel tap-läge', r.rattPlats === false && 'fel plats'].filter(Boolean).join(', ');
    p(`| ${r.nr} | ${r.t.toFixed(2).replace('.', ',')} | ${r.handelse} | ${r.kort || '–'} | ${[r.plats, r.till && 'till ' + r.till].filter(Boolean).join(', ') || '–'} | ${r.hur}${r.dt != null && r.syntes ? ` (${fs2(r.dt)})` : ''}${r.not ? ' — ' + r.not : ''} | ${fel} |`);
  }
  p('');
  p('## Alla rader');
  p('');
  p('| Rad | t | Händelse | Kort | Syntes | Efter facit | Vad det digitala bordet gjorde |');
  p('|---|---|---|---|---|---|---|');
  for (const r of res.rader) p(`| ${r.nr} | ${r.t.toFixed(2).replace('.', ',')} | ${r.handelse} | ${r.kort || '–'} | ${r.syntes ? (r.rattKort === false ? 'fel kort' : 'ja') : 'nej'} | ${r.syntes ? fs2(r.dt) : '–'} | ${r.hur}${r.not ? ' — ' + r.not : ''} |`);
  p('');
  p('## Det digitala bordet gjorde utöver facit');
  p('');
  const grupp = {};
  for (const x of res.over) (grupp[x.typ] = grupp[x.typ] || []).push(x);
  if (!res.over.length) p('Ingenting.');
  for (const [typ, l] of Object.entries(grupp)) p(`- **${typ}** (${l.length}): ` + l.map(x => `${x.s.toFixed(1).replace('.', ',')} s ${x.namn || '?'}${x.d != null ? ` ${x.d} kb` : ''}${x.overTak ? ' (över lekens antal)' : ''}`).join(' · '));
  p('');
  p('## Slutbordet');
  p('');
  /* Vid facits "slut" (sista rutan före Kontrollcenter i passet 2026-09-22), annars sista bilden. */
  const slutRad = rader.find(r => r.handelse === 'slut');
  const slut = slutRad ? bordVid(spel.bilder, slutRad.t) : (spel.bilder[spel.bilder.length - 1] || { kort: [], fragor: [] });
  p(`Vid ${slutRad ? `facits slut, ${String(slutRad.t).replace('.', ',')} s` : 'videons slut'}:`);
  p('');
  const dig = new Map(); for (const c of slut.kort.filter(syns)) { const q = dig.get(c.namn) || dig.set(c.namn, { n: 0, t: 0 }).get(c.namn); q.n++; if (c.tappad) q.t++; }
  const fac = new Map(), tapN = new Map();
  for (const r of rader) {
    if (r.handelse === 'spelar' || r.handelse === 'grav_till_bord') fac.set(r.kort, (fac.get(r.kort) || 0) + 1);
    if (r.handelse === 'tar_bort') fac.set(r.kort, (fac.get(r.kort) || 0) - 1);
    if (r.handelse === 'tappar') tapN.set(r.kort, (tapN.get(r.kort) || 0) + 1);
    if (r.handelse === 'otappar') tapN.set(r.kort, Math.max(0, (tapN.get(r.kort) || 0) - 1));
    if (r.handelse === 'tar_bort') tapN.set(r.kort, 0);
  }
  p('| Kort | Facit (tappade) | Digitalt (tappade) |');
  p('|---|---|---|');
  for (const namn of [...new Set([...fac.keys(), ...dig.keys()])].sort()) {
    const f = fac.get(namn) || 0, d = dig.get(namn) || { n: 0, t: 0 };
    if (!f && !d.n) continue;
    p(`| ${namn} | ${f}${f ? ` (${Math.min(f, tapN.get(namn) || 0)})` : ''} | ${d.n}${d.n ? ` (${d.t})` : ''}${d.n !== f ? ' ←' : ''} |`);
  }
  const grav = slut.kort.filter(c => c.zon === 'grav').map(c => c.namn), ned = slut.kort.filter(c => paMattan(c) && c.lyft).map(c => c.namn);
  p('');
  p(`Graveyard digitalt: ${grav.length ? grav.join(', ') : 'tom'}. Nedtonade (frågan): ${ned.length ? ned.join(', ') : 'inga'}. Frågor i granskningen: ${slut.fragor.length}.`);
  return L.join('\n') + '\n';
}

/* ── kör ── */
let k;
try { k = lasKalla(); } catch (e) { console.error('spegelfacit/jamfor.cjs: ' + e.message); process.exit(2); }
const rader = lasFacit(PASS);
const lek = UTAN_LEK ? null : lekAntal();
const spel = spelaUpp(k.logg, lek);
const h = tidslinje(spel.bilder);
const res = jamfor(rader, spel.bilder, h, k.logg);
const text = rapport(k, res, spel, rader);
process.stdout.write(text);
if (MD) { fs.writeFileSync(path.resolve(MD), text); console.log(`\nrapporten skriven till ${MD}`); }
if (TSV) {
  fs.writeFileSync(path.resolve(TSV), 's\ttyp\tcid\tnamn\tdetalj\n' + h.map(x => [x.s, x.typ, x.cid || '', x.namn || '', [x.varfor && 'varför ' + x.varfor, x.fran && !Array.isArray(x.fran) && 'från ' + x.fran, x.d != null && x.d + ' kortbredder', x.vid && 'vid ' + x.vid, x.overTak && 'över lekens antal'].filter(Boolean).join(', ')].join('\t')).join('\n') + '\n');
  console.log(`det digitala bordets tidslinje skriven till ${TSV} (${h.length} ändringar)`);
}
if (JSONFIL) { fs.writeFileSync(path.resolve(JSONFIL), JSON.stringify({ pass: PASS, kalla: k.namn, logg: LOGG ? path.resolve(LOGG) : KORNING, html: path.relative(ROT, HTML), fore: FORE, efter: EFTER, grund: spel.grund, rader: res.rader, over: res.over, tidslinje: h, bilder: spel.bilder }) + '\n'); console.log(`allt skrivet till ${JSONFIL}`); }
process.exit(0);

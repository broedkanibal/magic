#!/usr/bin/env node
/* Dubblettmätningen (MES-43): telefonens bordsrapporter genom datorns
   avstämning, med klockan på rapporternas egen tid.

   Kör:  node dev/dubbletter.cjs --fall 07 [--json fil] [--svans 3.5]
         node dev/dubbletter.cjs --logg ~/Downloads/pass-2026-09-11-1002.json [--json fil]
         node dev/dubbletter.cjs --rapporter dev/avstamning-rapporter.json nyTelefon.horn [--json fil]

   Jesper hade ett Killing Glare och ett Plains på bordet och fick två av
   varje, och tap-läget blev ofta fel. Var uppstår det — i telefonens spår
   eller i datorns avstämning? Det här är ett MÅTT, inget prov: slutkod 0
   vad siffrorna än blir, ingen baslinje.

   Så går det till. Källan är golden-fallets bordslogg (varje bord datorn
   fick under videokörningen, sparad av kor.html i senaste.json, med facit
   ur video.handelser), ett riktigt pass sparat ur appen (--logg: knappen
   "Spara bordsloggen" i sammanfattningen när auto stängs av — samma rader,
   utan facit), eller en inspelad rapportlista ur
   dev/avstamning-rapporter.json (utan facit — då räknas bara korten per
   namn över tid). Varje rapport spelas upp genom den RIKTIGA avstamBord ur
   index.html, som i dev/avstamning.cjs, med
     - klockan satt till rapportens tid,
     - hjärtslaget härmat: telefonen skickar senaste bordet igen var tredje
       sekund (setInterval i index.html), som det är — också `sen`,
     - nådtimern härmad: avstamBord sätter en setTimeout på BORTA_NAD + 100
       som kör avstämningen igen när telefonen är tyst; här en virtuell
       timer som fyrar när klockan passerar dess tid,
     - det grundläge telefonen hade när loggen skrevs (kor.html loggar det
       per bord; null i ett golden-fall), och som jämförelse det andra läget
       (ett sparat tal respektive inget).
   Efter varje steg mäts bordet: per namn hur många kort som är bundna
   (spår != null, inte nedtonade) och nedtonade, mot hur många facit säger
   ligger på bordet just då, och vilka kort som är tappade. Varje kort som
   skapas bokförs med tiden, spåret, spårets domskäl (varfor) och om det
   redan fanns ett kort med samma namn (bundet eller nedtonat) — det är
   diagnosen: en dubblett är ett kort som skapas fast kortet redan finns.

   Utdraget och miljön är kopierade ur dev/avstamning.cjs, inte importerade:
   den filen är ett prov med slutkod och kör sina fall vid laddning, och
   ett mått som lånar ett provs miljö ska inte kunna fälla provet eller
   fällas av det. Dubbleringen är avsiktlig; glider utdraget isär syns det
   i att avstamBord inte hittas.
   .cjs eftersom package.json säger "type": "module". */
'use strict';
const fs = require('fs'), path = require('path');
const ROT = path.join(__dirname, '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const FALL = arg('--fall', '');
const RAPP_I = process.argv.indexOf('--rapporter');
const RAPPORTER = RAPP_I >= 0 ? { fil: process.argv[RAPP_I + 1], nyckel: process.argv[RAPP_I + 2] } : null;
const LOGG = arg('--logg', '');            // en bordslogg sparad ur appen: knappen "Spara bordsloggen" i sammanfattningen när auto stängs av
const JSONFIL = arg('--json', '');
const SVANS_S = +arg('--svans', 3.5);      // så länge klockan går efter sista rapporten (hjärtslag och nådtimer får fyra)
const HTML = arg('--html', path.join(ROT, 'index.html'));
const HJARTSLAG_MS = 3000;                 // index.html: setInterval(… senastBord …, 3000)
const TOLERANS_S = 0.5;                    // facits tider är avlästa ur bildrutorna, ±0,5 s (facit.json)
const VIRT0 = 1e6;                         // klockan startar långt från noll: noll betyder "aldrig" på flera ställen
const GRUND_PROD = 12;                     // ett sparat grundläge, vilket tal som helst: avstämningen läser bara om det är null

if (!FALL && !RAPPORTER && !LOGG) {
  console.log('Kör: node dev/dubbletter.cjs --fall 07 [--json fil]\n     node dev/dubbletter.cjs --logg ~/Downloads/pass-2026-09-11-1002.json [--json fil]   (sparad ur appen: "Spara bordsloggen" när auto stängs av)\n     node dev/dubbletter.cjs --rapporter dev/avstamning-rapporter.json nyTelefon.horn [--json fil]');
  process.exit(0);
}

/* ── utdraget ur index.html (kopia av dev/avstamning.cjs, se ovan) ── */
const src = fs.readFileSync(HTML, 'utf8');
const SLUT = 'let senasteSpar = [];';
const a = src.indexOf('/* ── samma kort, två spår'), b = src.indexOf(SLUT, a);
if (a < 0 || b < 0) throw new Error('hittar inte avstämningen i ' + HTML);
const kod = src.slice(a, b + SLUT.length);

/* Det avstamBord läser utanför utdraget (samma stubbar som avstamning.cjs):
   spelLage, state/minSpelare, zonAv (ett land är ZON_MANA på namnet), uid,
   cropCache, prefs/savePrefs, save/renderAll/resolveAll/renderMode/
   uppdateraPbStatus/kamSkruvTal, kamFas/kamYta/kamRad/kamTot/kamLast/kamSer,
   BORTA_NAD/lyftT/lyftTips, hoppade/borttagna, slappLyft, glomSpar,
   kamGrund/grundFraga, och LS för sammanfattningen (autoSum*). losaSpar,
   sparSedd och autoRemsaModell ligger INNE i utdraget. */
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
const BORTA_NAD = 3000; let lyftT = null, lyftTips = null;
let hoppade = new Set(), borttagna = new Set();
function slappLyft(k) { delete k.lyft; if (lyftTips === k.cid) lyftTips = null; }
function glomSpar() {}
let kamGrund = null;
let grundFragor = [];
function grundFraga(namn, spar) { grundFragor.push({ namn, spar, nu: Date.now() }); }
`;

/* En app per läge: egen klocka, egna virtuella timers (nådtimern), eget
   bord. setTimeout/clearTimeout är det avstamBord får — timern fyrar i
   spelaUpp när klockan passerar dess tid, aldrig i riktig tid. */
function byggApp(grund) {
  const klocka = { t: VIRT0 };
  const timers = []; let timerN = 0;
  const setTimeoutV = (fn, ms) => { const id = ++timerN; timers.push({ id, t: klocka.t + (+ms || 0), fn }); return id; };
  const clearTimeoutV = id => { const i = timers.findIndex(x => x.id === id); if (i >= 0) timers.splice(i, 1); };
  const app = new Function('Date', 'setTimeout', 'clearTimeout', miljo + kod + `
return {
  avstamBord, tackning, sammaPlats, syskon, ledarOrdning,
  get kort() { return state.players[0].cards; },
  get pending() { return state.players[0].pending; },
  get losa() { return losaSpar; },
  get grundFragor() { return grundFragor; },
  get chip() { return { kamSer, kamLast, kamTot }; },
  set grund(v) { kamGrund = v; }
};`)({ now: () => klocka.t }, setTimeoutV, clearTimeoutV);
  app.grund = grund;
  return { app, klocka, timers };
}

/* ── källan: rapporter med tid, och facit ─────────────────────────── */
/* En händelse: { t (ms på klockan), s (sekunder att skriva), fas, nollstall, spar, slag, nr } */
function lasKalla() {
  if (FALL) {
    const fil = path.join(__dirname, 'golden', 'senaste.json');
    const rader = JSON.parse(fs.readFileSync(fil, 'utf8'));
    const rad = rader.find(r => r.id.startsWith(FALL));
    if (!rad) throw new Error(`inget fall som börjar på ${FALL} i ${fil}`);
    if (!rad.bordLogg) throw new Error(`${rad.id} har ingen bordLogg — bara videofall har en`);
    if (rad.bordLogg.some(r => r.spar == null)) throw new Error(`${rad.id}: bordLogg saknar hela spårposten (äldre format med bara namn och tillstånd) — kör om: node dev/golden/kor.cjs --fall ${FALL} --spara`);
    const facitFil = path.join(__dirname, 'golden', 'fall', rad.id, 'facit.json');
    const facit = JSON.parse(fs.readFileSync(facitFil, 'utf8'));
    const handelser = rad.bordLogg.map((r, i) => ({ t: VIRT0 + Math.round(r.s * 1000), s: r.s, fas: r.fas, nollstall: !!r.nollstall, spar: r.spar, slag: 'rapport', nr: i }));
    return { namn: rad.id, handelser, facit: { handelser: (facit.video && facit.video.handelser) || [], kort: facit.kort || [] }, sekund: sek, bordLogg: rad.bordLogg };
  }
  if (LOGG) {
    /* Ett riktigt pass, sparat ur appen (sparaBordLogg i index.html): samma
       rader som videofallens bordLogg — s, fas, nollstall, grund, spar — men
       utan facit. Grundläget kommer ur raderna (loggat per bord). */
    const R = JSON.parse(fs.readFileSync(path.resolve(LOGG), 'utf8'));
    const logg = Array.isArray(R) ? R : R.bordLogg;
    if (!Array.isArray(logg) || !logg.length) throw new Error(`${LOGG}: ingen bordLogg — spara den med "Spara bordsloggen" i sammanfattningen när auto stängs av`);
    if (logg.some(r => r.spar == null)) throw new Error(`${LOGG}: rader utan spår — filen är ingen bordslogg`);
    const handelser = logg.map((r, i) => ({ t: VIRT0 + Math.round(r.s * 1000), s: r.s, fas: r.fas, nollstall: !!r.nollstall, spar: r.spar, slag: 'rapport', nr: i }));
    return { namn: (R.id || path.basename(LOGG)) + (R.kapad ? ' (kapad: de äldsta borden saknas)' : ''), handelser, facit: null, sekund: sek, bordLogg: logg };
  }
  const R = JSON.parse(fs.readFileSync(path.resolve(RAPPORTER.fil), 'utf8'));
  const logg = RAPPORTER.nyckel.split('.').reduce((o, k) => o == null ? undefined : o[k], R);
  if (!Array.isArray(logg)) throw new Error(`${RAPPORTER.nyckel} finns inte i ${RAPPORTER.fil}, eller är ingen lista`);
  const handelser = logg.map((r, i) => ({ t: r.nu, s: r.nu / 1000, fas: undefined, nollstall: false, spar: r.spar, slag: 'rapport', nr: i }));
  return { namn: RAPPORTER.fil + ' ' + RAPPORTER.nyckel, handelser, facit: null, sekund: t => +(t / 1000).toFixed(2), bordLogg: logg.map(r => ({ s: r.nu / 1000, spar: r.spar })) };
}

/* Hjärtslagen: var tredje sekund från första rapporten, senaste bordet som
   det är (senastBord i index.html: nollställningen tömmer det). Fasen är
   senaste rapportens — kor.html loggar fas per bord, inte per hjärtslag. */
function medHjartslag(handelser) {
  if (!handelser.length) return [];
  const t0 = handelser[0].t, tSlut = handelser[handelser.length - 1].t + Math.round(SVANS_S * 1000);
  const alla = handelser.slice();
  for (let t = t0 + HJARTSLAG_MS; t <= tSlut; t += HJARTSLAG_MS) alla.push({ t, s: null, slag: 'hjärtslag' });
  /* Rapporter före hjärtslag på samma tid: setInterval kommer efter det som redan låg i kön. */
  alla.sort((p, q) => (p.t - q.t) || ((p.slag === 'hjärtslag') - (q.slag === 'hjärtslag')) || ((p.nr || 0) - (q.nr || 0)));
  return alla;
}

/* Facit: hur många kort med namnet som KAN ligga på bordet vid s, med
   toleransen — ett utspel räknas från t − 0,5, ett bortplock från t + 0,5.
   Det största rimliga talet, så att ett överskott aldrig beror på en halv
   sekunds avläsning. */
function vantat(facit, s, namn) {
  if (!facit) return null;
  let n = 0;
  for (const h of facit.handelser) {
    if (h.spelar === namn && h.t - TOLERANS_S <= s) n++;
    if (h.tar_bort === namn && h.t + TOLERANS_S <= s) n--;
  }
  return Math.max(0, n);
}
function facitNamn(facit) {
  if (!facit) return [];
  return [...new Set(facit.handelser.map(h => h.spelar || h.tar_bort).concat(facit.kort.map(k => k.namn)))];
}

/* ── uppspelningen ─────────────────────────────────────────────────── */
function bordet(app) {
  const per = new Map();
  for (const c of app.kort) {
    const p = per.get(c.name) || per.set(c.name, { bundna: [], nedtonade: [], tappade: [], nad: [] }).get(c.name);
    if (c.lyft != null) p.nedtonade.push(c.cid);
    else if (c.spar != null) { p.bundna.push(c.cid); if (c.tapped) p.tappade.push(c.cid); if (c.borta) p.nad.push(c.cid); }
    else p.nedtonade.push(c.cid);   // varken bundet eller nedtonat (utanför kanLyftas): finns inte här, men räknas inte som på bordet
  }
  return per;
}
const sek = t => +((t - VIRT0) / 1000).toFixed(2);

function spelaUpp(kalla, grund) {
  const { app, klocka, timers } = byggApp(grund);
  const facit = kalla.facit;
  const namnen = new Set(facitNamn(facit));
  const alla = medHjartslag(kalla.handelser);
  const tidslinje = [], skapade = [], tapMotSpar = [], steg = [];
  let senastBord = null, senastFas = undefined, senastRapport = null;
  let forraSig = null;
  const sparI = (spar, id) => (spar || []).find(t => t.id === id);

  const mat = (slag, t, spar, fas) => {
    const s = kalla.sekund(t);   // golden och --logg: sekunder från passets start (klockan startar på VIRT0); --rapporter: riktiga ms
    const per = bordet(app);
    for (const c of app.kort) namnen.add(c.name);
    const rad = { s, slag, fas: fas || null, spar: spar ? spar.length : null, namn: {} };
    let overskott = 0;
    for (const namn of [...namnen].sort()) {
      const p = per.get(namn) || { bundna: [], nedtonade: [], tappade: [], nad: [] };
      const f = vantat(facit, s, namn);
      const o = f == null ? null : Math.max(0, (p.bundna.length - p.nad.length) - f);   // kort i nåd (spåret borta, nådtiden löper) är inte en dubblett: avstämningen håller dem 3 s med flit
      if (o) overskott += o;
      if (p.bundna.length || p.nedtonade.length || (f != null && f > 0))
        rad.namn[namn] = { bundna: p.bundna.length, nedtonade: p.nedtonade.length, nad: p.nad.length, facit: f, overskott: o, tappade: p.tappade.slice() };
    }
    rad.overskott = facit ? overskott : null;
    /* Tap mot spåret: ett bundet kort vars spår står i rapporten ska ha
       spårets tappad — annars är det datorn som tappar fel, inte telefonen. */
    if (spar) for (const c of app.kort) {
      if (c.spar == null || c.lyft != null) continue;
      const t = sparI(spar, c.spar); if (!t) continue;
      if ((c.tapped ? 1 : 0) !== (t.tappad ? 1 : 0)) tapMotSpar.push({ s, cid: c.cid, namn: c.name, spar: c.spar, kort: c.tapped ? 1 : 0, sparTappad: !!t.tappad });
    }
    steg.push(rad);
    const sig = JSON.stringify(rad.namn);
    if (sig !== forraSig) { forraSig = sig; tidslinje.push(rad); }
    return rad;
  };

  const kor = (slag, t, spar, nollstall, fas) => {
    klocka.t = t;
    const fore = new Map(app.kort.map(c => [c.cid, c]));
    const foreBord = bordet(app);
    if (slag === 'nådtimer') { const tm = timers.shift(); tm.fn(); }
    else app.avstamBord(spar, nollstall, fas);
    const nya = app.kort.filter(c => !fore.has(c.cid));
    const rad = mat(slag, t, nollstall ? null : spar, fas);
    for (const c of nya) {
      const t2 = sparI(spar, c.spar) || {};
      const p = foreBord.get(c.name) || { bundna: [], nedtonade: [], nad: [] };
      const post = { s: rad.s, slag, cid: c.cid, namn: c.name, spar: c.spar, varfor: t2.varfor || null, sen: t2.sen, tappad: !!c.tapped, sparTappad: !!t2.tappad,
                     fannsBundna: p.bundna.length, fannsNedtonade: p.nedtonade.length, fannsINad: p.nad.length,
                     facit: vantat(facit, rad.s, c.name) };
      skapade.push(post); rad.skapade = (rad.skapade || []).concat(post);
      if (tidslinje[tidslinje.length - 1] !== rad) tidslinje.push(rad);
    }
  };

  for (const h of alla) {
    /* Nådtimern fyrar när klockan passerar dess tid — före händelsen. */
    while (timers.length && timers[0].t <= h.t) kor('nådtimer', timers[0].t, senastRapport ? senastRapport.spar : [], false, senastFas);
    if (h.slag === 'hjärtslag') {
      if (!senastBord) continue;
      kor('hjärtslag', h.t, senastBord, false, senastFas);
    } else {
      if (h.nollstall) senastBord = null; else { senastBord = h.spar; senastRapport = h; }
      senastFas = h.fas;
      kor('rapport', h.t, h.spar, h.nollstall, h.fas);
    }
  }

  /* Summan. */
  const perNamn = {};
  for (const namn of [...namnen].sort()) {
    const q = { maxBundna: 0, maxNedtonade: 0, maxOverskott: facit ? 0 : null, skapade: 0, skapadeMedBundet: 0, skapadeMedNedtonat: 0, facitFysiska: facit ? facit.handelser.filter(h => h.spelar === namn).length : null, facitSlut: facit ? facit.kort.filter(k => k.namn === namn).length : null };
    for (const r of steg) { const p = r.namn[namn]; if (!p) continue; q.maxBundna = Math.max(q.maxBundna, p.bundna); q.maxNedtonade = Math.max(q.maxNedtonade, p.nedtonade); if (facit) q.maxOverskott = Math.max(q.maxOverskott, p.overskott || 0); }
    for (const k of skapade) if (k.namn === namn) { q.skapade++; if (k.fannsBundna) q.skapadeMedBundet++; if (k.fannsNedtonade) q.skapadeMedNedtonat++; }
    perNamn[namn] = q;
  }
  const tappadeSteg = steg.filter(r => Object.values(r.namn).some(p => p.tappade.length));
  const tappadeCid = new Set(); let tappadePar = 0, maxTappade = 0;
  for (const r of steg) { let n = 0; for (const p of Object.values(r.namn)) { n += p.tappade.length; tappadePar += p.tappade.length; for (const cid of p.tappade) tappadeCid.add(cid); } maxTappade = Math.max(maxTappade, n); }
  const slut = app.kort.map(c => ({ cid: c.cid, namn: c.name, spar: c.spar != null ? c.spar : null, tappad: !!c.tapped, nedtonad: c.lyft != null, nad: !!c.borta }));
  const totalt = {
    steg: steg.length, rapporter: steg.filter(r => r.slag === 'rapport').length, hjartslag: steg.filter(r => r.slag === 'hjärtslag').length, nadtimer: steg.filter(r => r.slag === 'nådtimer').length,
    nyaCid: skapade.length, facitFysiska: facit ? facit.handelser.filter(h => h.spelar).length : null,
    skapadeMedNedtonat: skapade.filter(k => k.fannsNedtonade).length, skapadeMedBundet: skapade.filter(k => k.fannsBundna).length,
    maxOverskott: facit ? Math.max(0, ...steg.map(r => r.overskott || 0)) : null,
    tapMotSpar: tapMotSpar.length,
    tapMotFacit: facit ? { par: tappadePar, steg: tappadeSteg.length, maxSamtidigt: maxTappade, kort: tappadeCid.size } : null,
    grundFragor: app.grundFragor.length, granskning: app.pending.length
  };
  return { grund, tidslinje, skapade, tapMotSpar, totalt, perNamn, slut };
}

/* ── loggen själv: vad telefonen sa, oavsett datorn ──────────────── */
/* Tap-läget per spår i rapporterna: hur ofta spåret var tappat, och hur
   många gånger det slog om. Ett spår som slår om varje sekund är
   telefonens debounce som inte håller; ett som är tappat hela tiden på
   ett otappat kort är grundläget eller vinkeln. */
function sparStatistik(bordLogg) {
  const per = new Map();
  for (const r of bordLogg) for (const t of r.spar || []) {
    const p = per.get(t.id) || per.set(t.id, { id: t.id, forst: r.s, sist: r.s, rapporter: 0, tappade: 0, tappadeRorligt: 0, byten: 0, forra: null, namn: new Set(), klar: 0, varfor: new Set(), intervall: [] }).get(t.id);
    p.sist = r.s; p.rapporter++;
    if (t.tappad) {
      p.tappade++;
      if (t.tillstand === 'ny') p.tappadeRorligt++;   // tappat medan spåret rör sig: en hand, inte ett kort som vridits
      /* Sammanhängande rapporter med tappad: ett intervall i sekunder, så att man ser NÄR. */
      const iv = p.intervall[p.intervall.length - 1];
      if (iv && p.forra) { iv.till = r.s; iv.n++; } else p.intervall.push({ fran: r.s, till: r.s, n: 1 });
    }
    if (p.forra != null && p.forra !== !!t.tappad) p.byten++;
    p.forra = !!t.tappad;
    if (t.namn) p.namn.add(t.namn + (t.saker ? '' : '?'));
    if (t.tillstand === 'klar') p.klar++;
    if (t.varfor) p.varfor.add(t.varfor);
  }
  return [...per.values()].map(p => ({ id: p.id, forst: p.forst, sist: p.sist, rapporter: p.rapporter, tappade: p.tappade, tappadeRorligt: p.tappadeRorligt, byten: p.byten, klar: p.klar, namn: [...p.namn], varfor: [...p.varfor], intervall: p.intervall }));
}

/* Samma namn på flera spår samtidigt — det är där en dubblett FÖDS. Ett
   osäkert spår bär sitt bästa förslag som namn (eller en ledtråd som
   gissning); blir två sådana spår klara med samma namn räknar avstamBord
   dem som ETT kort bara om de ligger på samma plats (sammaPlats: inte
   båda färska, inte syskon, och överlapp). Här räknas, rapport för rapport,
   hur många FYSISKA kort avstämningen skulle räkna per namn om varje spår
   som bär namnet vore klart — med appens egna sammaPlats/syskon/
   ledarOrdning, samma gruppering som steg 2 i avstamBord — mot facit. Ett
   tal över facit är en dubblett som bara väntar på att Claude (eller
   granskningen) ska säga ja på båda spåren. */
function sammaNamn(kalla, app) {
  const facit = kalla.facit;
  const rader = [], perNamn = {};
  let forra = '';
  for (const r of kalla.bordLogg) {
    const per = new Map();
    for (const t of r.spar || []) { if (t.tillstand === 'skrap') continue; const n = t.namn || t.gissning; if (!n) continue; (per.get(n) || per.set(n, []).get(n)).push(t); }
    const rad = { s: r.s, namn: {} };
    for (const [n, l] of per) {
      if (l.length < 2) continue;
      const grupper = [];
      for (const t of l.slice().sort(app.ledarOrdning)) {
        const g = grupper.find(g => !g.some(u => app.syskon(u, t)) && g.some(u => app.sammaPlats(u, t)));
        if (g) g.push(t); else grupper.push([t]);
      }
      const f = vantat(facit, r.s, n);
      const q = perNamn[n] || (perNamn[n] = { maxSpar: 0, maxFysiska: 0, maxOverskott: facit ? 0 : null, rapporterMedFlera: 0, rapporterMedOverskott: 0, fran: r.s, till: r.s });
      q.maxSpar = Math.max(q.maxSpar, l.length); q.maxFysiska = Math.max(q.maxFysiska, grupper.length); q.rapporterMedFlera++; q.till = r.s;
      const o = f == null ? null : Math.max(0, grupper.length - Math.max(1, f));   // EN grupp är aldrig en dubblett — bara en felgissning när facit säger 0
      if (o) { q.maxOverskott = Math.max(q.maxOverskott, o); q.rapporterMedOverskott++; }
      rad.namn[n] = { spar: l.map(t => `${t.id}${t.saker ? '' : '?'}${farskt(t) ? 'f' : ''}${t.skymd ? 's' : ''}`), grupper: grupper.map(g => g.map(t => t.id)), fysiska: grupper.length, facit: f, overskott: o };
    }
    const sig = JSON.stringify(rad.namn);
    if (sig !== forra) { forra = sig; rader.push(rad); }
  }
  return { rader, perNamn };
}
const FARSK_MS = 500;   // som i index.html: `sen` under så här är spåret färskt (detektorn gav det en region nyss)
const farskt = t => t.sen != null && t.sen < FARSK_MS;

/* ── utskriften ────────────────────────────────────────────────────── */
const pad = (s, n) => String(s).padEnd(n);
const f2 = v => v == null ? '–' : (+v).toFixed(2);
function skrivTidslinje(res, facit) {
  console.log(`\n  Tidslinje (bara steg där bordet ändrades; bundna/facit, +N nedtonade, T = tappade):`);
  console.log('  ' + pad('s', 8) + pad('händelse', 11) + pad('spår', 6) + 'bordet');
  for (const r of res.tidslinje) {
    const delar = Object.entries(r.namn).map(([namn, p]) => {
      let s = `${namn} ${p.bundna}`;
      if (facit) s += `/${p.facit}`;
      if (p.nad) s += ` (${p.nad} i nåd)`;
      if (p.nedtonade) s += ` +${p.nedtonade} ned`;
      if (p.tappade.length) s += ` T${p.tappade.length}`;
      if (p.overskott) s += ` ÖVERSKOTT ${p.overskott}`;
      return s;
    });
    const skap = (r.skapade || []).map(k => `+${k.namn} (spår ${k.spar}, ${k.varfor || 'utan skäl'}${k.fannsBundna || k.fannsNedtonade ? `, fanns: ${k.fannsBundna} bundet ${k.fannsNedtonade} nedtonat` : ''})`);
    console.log('  ' + pad(f2(r.s), 8) + pad(r.slag, 11) + pad(r.spar == null ? '–' : r.spar, 6) + (delar.join(' · ') || '(tomt)') + (skap.length ? '  ' + skap.join(' ') : ''));
  }
}
function skrivSkapade(res) {
  console.log(`\n  Skapade kort (${res.skapade.length}): tid, spår, domskäl, om ett kort med namnet redan fanns just då`);
  if (!res.skapade.length) { console.log('    inga'); return; }
  console.log('  ' + pad('s', 8) + pad('kort', 5) + pad('namn', 20) + pad('spår', 6) + pad('varfor', 12) + pad('sen', 6) + pad('tappad', 8) + pad('facit', 7) + 'fanns redan');
  for (const k of res.skapade) console.log('  ' + pad(f2(k.s), 8) + pad(k.cid, 5) + pad(k.namn, 20) + pad(k.spar, 6) + pad(k.varfor || '–', 12) + pad(k.sen == null ? '–' : k.sen, 6) + pad(k.tappad ? 'ja' : 'nej', 8) + pad(k.facit == null ? '–' : k.facit, 7)
    + (k.fannsBundna || k.fannsNedtonade ? `${k.fannsBundna} bundet${k.fannsINad ? ` (${k.fannsINad} i nåd)` : ''}, ${k.fannsNedtonade} nedtonat  ← DUBBLETT?` : 'inget'));
}
function skrivTotalt(res, facit) {
  const t = res.totalt;
  console.log(`\n  Totalt (kamGrund = ${res.grund === null ? 'null' : res.grund}): ${t.steg} steg = ${t.rapporter} rapporter + ${t.hjartslag} hjärtslag + ${t.nadtimer} nådtimer`);
  console.log('  ' + pad('namn', 20) + pad('max bundna', 12) + (facit ? pad('max överskott', 15) : '') + pad('skapade', 9) + pad('…med bundet', 13) + pad('…med nedtonat', 15) + (facit ? pad('facit fysiska', 15) + 'facit slut' : ''));
  for (const [namn, q] of Object.entries(res.perNamn)) console.log('  ' + pad(namn, 20) + pad(q.maxBundna, 12) + (facit ? pad(q.maxOverskott, 15) : '') + pad(q.skapade, 9) + pad(q.skapadeMedBundet, 13) + pad(q.skapadeMedNedtonat, 15) + (facit ? pad(q.facitFysiska, 15) + q.facitSlut : ''));
  console.log(`  nya kort (cid) totalt: ${t.nyaCid}` + (facit ? ` mot ${t.facitFysiska} fysiska kort i facit (utspel)` : '')
    + `; skapade medan ett nedtonat med samma namn fanns: ${t.skapadeMedNedtonat}; medan ett bundet fanns: ${t.skapadeMedBundet}`
    + (facit ? `; största samtidiga överskott: ${t.maxOverskott}` : ''));
  console.log(`  tap: kort mot spårets tappad — ${t.tapMotSpar} avvikelser` + (facit ? `; mot facit (alla otappade) — ${t.tapMotFacit.par} kort-steg tappade i ${t.tapMotFacit.steg} av ${t.steg} steg, högst ${t.tapMotFacit.maxSamtidigt} samtidigt, ${t.tapMotFacit.kort} olika kort` : '')
    + `; grundfrågor: ${t.grundFragor}; kvar i granskningen: ${t.granskning}`);
  console.log('  slutbordet: ' + (res.slut.length ? res.slut.map(c => `${c.cid} ${c.namn}${c.tappad ? ' T' : ''}${c.nedtonad ? ' (nedtonat)' : c.nad ? ' (i nåd)' : ''}${c.spar != null ? ' spår ' + c.spar : ''}`).join(' · ') : '(tomt)'));
  if (facit) console.log('  facit slut: ' + facit.kort.map(k => k.namn).join(' · '));
}
function skrivSparStatistik(stat) {
  console.log(`\n  Spåren i loggen (telefonens sida, oavsett datorn): tappad = rapporter där spåret var tappat (varav medan det rörde sig, 'ny'), byten = hur många gånger det slog om, när = sekunderna`);
  console.log('  ' + pad('spår', 6) + pad('s', 15) + pad('rapporter', 11) + pad('klar', 6) + pad('tappad', 14) + pad('byten', 7) + pad('namn', 30) + pad('varfor', 13) + 'tappat när');
  for (const p of stat) console.log('  ' + pad(p.id, 6) + pad(`${f2(p.forst)}–${f2(p.sist)}`, 15) + pad(p.rapporter, 11) + pad(p.klar, 6) + pad(`${p.tappade}/${p.rapporter}` + (p.tappadeRorligt ? ` (${p.tappadeRorligt} ny)` : ''), 14) + pad(p.byten, 7) + pad(p.namn.join(', ') || '–', 30) + pad(p.varfor.join(', ') || '–', 13)
    + (p.intervall.length ? p.intervall.map(iv => `${f2(iv.fran)}–${f2(iv.till)} (${iv.n})`).join(', ') : '–'));
}
function skrivSammaNamn(sn, facit) {
  console.log(`\n  Samma namn på flera spår samtidigt (osäkra medräknade; f = färskt, s = skymt, ? = osäkert): fysiska = kort avstamBord skulle räkna om alla spåren vore klara${facit ? ', mot facit' : ''}`);
  if (!sn.rader.some(r => Object.keys(r.namn).length)) { console.log('    aldrig'); return; }
  console.log('  ' + pad('s', 8) + 'namn: spår → grupper (fysiska' + (facit ? '/facit' : '') + ')');
  for (const r of sn.rader) {
    const delar = Object.entries(r.namn).map(([n, p]) => `${n}: ${p.spar.join(' ')} → ${p.grupper.map(g => '[' + g.join('+') + ']').join(' ')} (${p.fysiska}${facit ? '/' + p.facit : ''}${p.overskott ? ' ÖVERSKOTT ' + p.overskott : ''})`);
    console.log('  ' + pad(f2(r.s), 8) + (delar.join(' · ') || '–'));
  }
  console.log('  ' + pad('namn', 20) + pad('max spår', 10) + pad('max fysiska', 13) + (facit ? pad('max överskott', 15) + pad('rapporter m. överskott', 24) : '') + pad('rapporter m. flera', 20) + 'när');
  for (const [n, q] of Object.entries(sn.perNamn)) console.log('  ' + pad(n, 20) + pad(q.maxSpar, 10) + pad(q.maxFysiska, 13) + (facit ? pad(q.maxOverskott, 15) + pad(q.rapporterMedOverskott, 24) : '') + pad(q.rapporterMedFlera, 20) + `${f2(q.fran)}–${f2(q.till)}`);
}

/* ── kör ───────────────────────────────────────────────────────────── */
/* Slutkod 0 vad mätningen än visar; 2 bara när den inte gick att göra
   (fallet finns inte, loggen är i det gamla formatet) — som avstand.cjs. */
let kalla;
try { kalla = lasKalla(); } catch (e) { console.error('dubbletter.cjs: ' + (e && e.message || e)); process.exit(2); }
console.log(`Dubblettmätningen: ${kalla.namn} — ${kalla.handelser.length} rapporter, ${kalla.facit ? `facit: ${kalla.facit.handelser.filter(h => h.spelar).length} utspel, ${kalla.facit.handelser.filter(h => h.tar_bort).length} bortplock, ${kalla.facit.kort.length} kort i slutet` : 'utan facit'}; hjärtslag var ${HJARTSLAG_MS / 1000} s, svans ${SVANS_S} s`);
if (kalla.facit) console.log('  facit: ' + kalla.facit.handelser.map(h => `${h.t} s ${h.spelar ? 'ut ' + h.spelar : 'bort ' + h.tar_bort}`).join(', ') + ` (±${TOLERANS_S} s)`);

/* Primärkörningen har det grundläge telefonen faktiskt hade när loggen
   skrevs (kor.html loggar det per bord sedan MES-43; i ett golden-fall är
   det null — ingen har sparat något). Jämförelsen är det andra läget. */
const loggat = kalla.bordLogg.find(r => r.grund !== undefined);
const GRUND_LOGGAT = loggat ? loggat.grund : undefined;
const grundPrimar = GRUND_LOGGAT !== undefined ? GRUND_LOGGAT : GRUND_PROD;
const grundJamfor = grundPrimar == null ? GRUND_PROD : null;
const prod = spelaUpp(kalla, grundPrimar);
const utanGrund = spelaUpp(kalla, grundJamfor);
skrivTidslinje(prod, kalla.facit);
skrivSkapade(prod);
skrivTotalt(prod, kalla.facit);
/* Jämförelsen med det andra grundläget (sparat mot inget sparat). Sedan
   MES-27 (db99c07) tappar datorn inga kort alls när inget läge är sparat,
   så borden FÅR skilja sig i tap-läget — då står båda här. */
const lika = JSON.stringify([prod.tidslinje, prod.skapade, prod.slut]) === JSON.stringify([utanGrund.tidslinje, utanGrund.skapade, utanGrund.slut]);
console.log(`\n  Med kamGrund = ${grundJamfor === null ? "null" : grundJamfor}: bordet ${lika ? 'IDENTISKT' : 'SKILJER SIG'} — grundfrågor ${utanGrund.totalt.grundFragor}, nya kort ${utanGrund.totalt.nyaCid}, tap mot spåret ${utanGrund.totalt.tapMotSpar}` + (kalla.facit ? `, största överskott ${utanGrund.totalt.maxOverskott}` : ''));
if (!lika) { skrivTidslinje(utanGrund, kalla.facit); skrivSkapade(utanGrund); skrivTotalt(utanGrund, kalla.facit); }
console.log('  (utan sparat grundläge rör datorn inte tap-läget; med ett sparat följer det spårets tappad, som telefonen mäter mot sitt grundläge)');
/* Telefonens sida, ur loggen som den är: var dubbletterna föds, och var tap-läget slår. */
const sn = sammaNamn(kalla, byggApp(GRUND_PROD).app);
skrivSammaNamn(sn, kalla.facit);
const stat = sparStatistik(kalla.bordLogg);
skrivSparStatistik(stat);

if (JSONFIL) {
  fs.writeFileSync(path.resolve(JSONFIL), JSON.stringify({ kalla: kalla.namn, hjartslagMs: HJARTSLAG_MS, svansS: SVANS_S, toleransS: TOLERANS_S, facit: kalla.facit, prod, utanGrund, sammaNamn: sn, spar: stat }, null, 1) + '\n');
  console.log(`\n  allt skrivet till ${JSONFIL}`);
}
process.exit(0);

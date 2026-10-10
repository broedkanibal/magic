// Avstämningsprov (MES-29): datorns avstamBord mot telefonens spår.
// Kör: node dev/avstamning.cjs [index.html]
// Plockar ut avstämningen ur index.html — från "samma kort, två spår" till
// `let senasteSpar = [];` — och kör den mot en stubbad app: en spelare, inga
// vyer, ingen synk, och en klocka provet styr själv. Fallen är de som gav
// dubbletter (Ukud Cobra i Jespers parti 2026-09-10), de som inte får slås
// ihop (landhögar, Claudes syskon, två kort med en glipa), och telefonens
// riktiga rapporter uppspelade ur avstamning-rapporter.json (inspelade ur
// Kamera-modulen på kamerabänkens rutor, före och efter fältet `sen`).
// Slutkod 1 om något faller. .cjs eftersom package.json säger "type": "module".
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const fil = process.argv[2] || path.join(__dirname, '..', 'index.html');
const src = fs.readFileSync(fil, 'utf8');
const SLUT = 'let senasteSpar = [];';
const a = src.indexOf('/* ── samma kort, två spår'), b = src.indexOf(SLUT, a);
if (a < 0 || b < 0) throw new Error('hittar inte avstämningen i ' + fil);
const kod = src.slice(a, b + SLUT.length);

/* Det avstamBord läser utanför utdraget. zonAv härmar appens: ett land är
   ZON_MANA på namnet, allt annat en permanent, och `zon` vinner. */
const miljo = `
const spelLage = { mig: 'p1', id: 'spel1' };
/* Sammanfattningen (autoSum) sparar passet per spel i localStorage genom
   appens LS; här en karta, så att en omladdning går att spela upp. */
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
const save = () => {}, renderAll = () => {}, renderGrid = () => {}, resolveAll = () => {}, renderMode = () => {}, uppdateraPbStatus = () => {}, kamSkruvTal = () => {};
let kamFas = '', kamYta = null, kamRad = '', kamTot = 0, kamLast = 0, kamSer = 0;
const BORTA_NAD = 3000, SAMTIDIGT_MS = 3000; let lyftT = null, lyftTips = null;   // proven är skrivna mot tre sekunders nåd (klocka.t += 3100); appens värde står i index.html
let hoppade = new Set(), borttagna = new Set();
function slappLyft(k) { delete k.lyft; if (lyftTips === k.cid) lyftTips = null; }
function glomSpar() {}
/* Grundläget (MES-30, MES-27): telefonens besked i varje bord (null = inte
   sparat, undefined = telefon utan fältet, tal = sparat). Sparat i de flesta
   proven — tap-synken från spåren gäller bara då; T- och G-serien sätter
   null och provar otappat-tills-sparat och steget i statusfältet. */
let kamGrund = 20;
/* Lekens antal per namn (dev/plan/lagen.md): ett prior och en varning, aldrig
   ett tak. Utan lek Infinity — då beter sig avstämningen exakt som förut.
   Sätts per prov med app.lek = new Map([['Sol Ring', 1]]). */
let lekTal = new Map();
const lekAntal = namn => lekTal.has(namn) ? lekTal.get(namn) : Infinity;
/* Baslandets typ — samma som appens landTyp (ett basland med egen remsa räknar lekens antal annorlunda). */
function landTyp(namn) { const m = /^(?:Snow-Covered )?(Plains|Island|Swamp|Mountain|Forest|Wastes)$/.exec(String(namn || '')); return m ? m[1] : null; }
/* Typraden (besvärjelseregeln, MODE-3): per namn i provet, annars tom. */
let typRad = new Map();
function typLinje(k) { return typRad.get(k.name) || ''; }
/* Uppstarten (MES-122): pågår den spelas inget ut. Av i alla prov utom UP. */
let oppPagar = false;
function oppstartPagar() { return oppPagar; }
/* Graveyard ur spelet (MES-334 steg 4): flödet är på (Follow the table, mitt bord, telefonen, ingen
   graveyard-ruta) bara i GY-proven; kamerans vridning som i appen (kamVand/kamSpegel). */
let gravFlode = false, kamVand = 0, kamSpegel = false;
function gravFlodeAktivt() { return gravFlode; }
/* Ignore this spot gäller så länge kameran speglar mitt bord i Mirror my table (gravIgnoreAktivt, kontrollgranskningen
   N1) — också efter Yes, när flödet är av. På i GY-proven; av i Screen leads och utan telefon. */
let gravSpeglar = false;
function gravIgnoreAktivt() { return gravSpeglar; }
/* Det svaren utanför utdraget läser (se svarKod nedan): mattan, molnet,
   handen och högarna. delaHand ger index per zon, som appens. */
const ZON_EXIL = 'exil';
const paMattan = e => { const z = zonAv(e); return z !== ZON_GRAV && z !== ZON_EXIL; };
const Moln = { sandKam() {} };
const addEventListener = () => {};   // spelupplevelsens pagehide (khSkicka) ligger i utdraget
const hand = () => state.players[0].cards, angraPunkt = () => {}, clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
/* Omritningens släpp av bifogade kort (losBifogade) och bannerns svar
   (förut svaraLyftAlla, borta med nedtoningen i MES-343): paMattanKort som appens, en bifogad plats en bit
   nedanför värden, och mitt bord går alltid att ändra. */
const paMattanKort = c => c && paMattan(c) && c.lyft == null;
const bifogadPlats = (v, k) => ({ x: (v.x || 0) + 10 * (k + 1), y: (v.y || 0) + 10 * (k + 1), z: 0 });
const redigerbar = () => true;
function delaHand() {
  const d = { spell: [], mana: [], grav: [], exil: [] };
  hand().forEach((c, i) => { const z = zonAv(c); d[z === ZON_GRAV ? 'grav' : z === ZON_EXIL ? 'exil' : z === ZON_MANA ? 'mana' : 'spell'].push(i); });
  return d;
}
`;
/* Svaren som binder ett kort till ett spår utanför avstämningen (MES-291):
   granskningens svar (namngePend, med sammaKortVid) och handflytten till
   graveyard eller exile (flyttaTill, med aurorFoljer). Ur samma index.html, så att proven kör
   appens egen kod. En funktion slutar vid första "}" i början av en rad. */
const funk = namn => {
  const i = src.indexOf('function ' + namn + '('), j = src.indexOf('\n}\n', i);
  if (i < 0 || j < 0) throw new Error('hittar inte ' + namn + ' i ' + fil);
  return src.slice(i, j + 3);
};
const svarKod = ['sammaKortVid', 'namngePend', 'aurorFoljer', 'flyttaTill', 'losBifogade'].map(funk).join('\n');
/* Timrarna (MES-291): avstamBord ställer en timer som låter nåden och
   väntan löpa ut när telefonen är tyst. Här virtuella: tid(t) flyttar
   klockan till t och kör timrarna som hinner gå ut, i ordning, med klockan
   på deras tid. Ett prov som inte anropar tid() kör aldrig någon timer. */
const klocka = { t: 1e6 };
const timrar = []; let timerN = 0;
const setTimeoutV = (fn, ms) => { const id = ++timerN; timrar.push({ id, t: klocka.t + (+ms || 0), fn }); return id; };
const clearTimeoutV = id => { const i = timrar.findIndex(x => x.id === id); if (i >= 0) timrar.splice(i, 1); };
const tid = t => {
  for (;;) {
    timrar.sort((x, y) => x.t - y.t);
    if (!timrar.length || timrar[0].t > t) break;
    const tm = timrar.shift(); klocka.t = tm.t; tm.fn();
  }
  klocka.t = t;
};
const app = new Function('Date', 'setTimeout', 'clearTimeout', miljo + kod + svarKod + `
return {
  avstamBord, tackning, sammaPlats, lekPrior,
  kamBildTillVy, kamVyTillBild, provKortMatt, provKortStorlek, zonForslag, bibBredvid, provkortSpar, provkortUt, provLasSteg,
  oppSteg4Klar, oppOppnasIgen,
  set gravFlode(v) { gravFlode = !!v; },
  set gravSpeglar(v) { gravSpeglar = !!v; },
  get grav() { return gravLageNu(); },
  set bib(h) { state.players[0].bibHog = h; },
  set vand(v) { kamVand = v; },
  set oppstart(v) { oppPagar = !!v; },
  get spar() { return senasteSpar; },
  get kort() { return state.players[0].cards; },
  get pending() { return state.players[0].pending; },
  get chip() { return { kamSer, kamLast, kamTot }; },
  get borttagna() { return borttagna; },
  get hoppade() { return hoppade; },
  set grund(v) { kamGrund = v; },
  /* Lekens antal per namn, och spelläget ('skarm' | 'bord' | null = som
     stubbspelaren: inget läge, vilket avstämningen läser som Table leads). */
  set lek(m) { lekTal = m; },
  set spelsatt(v) { if (v) state.players[0].lage = v; else delete state.players[0].lage; },
  set typ(m) { typRad = m; },
  get senasteKamSpar() { return senasteKamSpar; },
  /* Kortet knappen Save i kameravyn tar läget ur (senasteMattaKort). Statusfältets steg om grundläget
     (grundSteg) är borttaget i MES-334 steg 6: telefonen tar läget ur leken. */
  senaste() { return senasteMattaKort(state.players[0], senasteSpar); },
  /* Statusfältet (MES-32, MES-27): modellen som renderAutoBar ritar, med
     samma underlag som i appen — senaste bordet, avstämningens lösa spår
     och när varje spår först sågs. extra lägger till det som kommer
     utifrån (sma, fas, rad). */
  remsa(extra) { return autoRemsaModell(senasteSpar, state.players[0], Object.assign({ nu: Date.now(), sedd: sparSedd, lage: sparLage, losa: losaSpar, borttagna, ser: kamSer }, extra || {})); },
  /* De oframkallade korten (MES-344, ofrSteg i avstämningen) — de ersätter platshållarna (MES-42). */
  get ofr() { return ofrLista(); },
  ofrFoto(spar, b64) { return ofrFotoSatt(spar, b64); },
  get losa() { return losaSpar; },
  get lage() { return sparLage; },
  /* Sammanfattningen när auto stängs av: passet, boken, datorns anrop,
     och summan — som stangAvAuto räknar den, ur senaste bordet och mitt bord. */
  get pass() { return autoSum; },
  set pass(v) { autoSum = v; },
  get ls() { return lsMinne; },
  starta: autoSumStarta, bok: b => autoSumBok(b), dator: (m, u, fel) => autoSumDator(m, u, fel),
  summa() { return autoSumSammanfatta(autoSum, senasteSpar, state.players[0], Date.now()); },
  avsluta() { return autoSumAvsluta(senasteSpar, state.players[0], Date.now()); },
  kostnad: aiKostnad, pris: aiPris,
  /* Svaren utanför avstämningen (MES-291): granskningens svar på en post, och handflytten till en hög. */
  namnge(q, namn) { return namngePend(state.players[0], q, namn, null, null); },
  flytta(i, zon) { return flyttaTill(i, zon); },
  losBifogade() { return losBifogade(state.players[0].cards); },
  /* Raden vid nederkanten (MES-343): korten kameran skickat till handen, med valet kvar. */
  get handRad() { return handRad; },
  handVal(cid, val) { /* kvar/angra: kortet och dess auror tillbaka (handRadTillbaka), som handRadVal i appen; exil/bib: bara valet */ const h = handRad.find(x => x.cid === cid && !x.val); if (!h) return false; if (val === 'kvar' || val === 'angra') { const r = handRadTillbaka(state.players[0], h, val, Date.now()); h.kort.kvarSagt = 1; return r; } h.val = val; h.nar = Date.now(); return true; },
  tillbaka(namn, utom) { return kortSomKomTillbaka(state.players[0].cards, namn, utom); },
  /* Nollställningen går genom avstamBord: det är där "senaste kortet"
     börjar om, som när telefonen nollställt sig. Grundläget och "Inte nu"
     hör till spelet, inte nollställningen — de sätts om här, som när man
     lämnar spelet. */
  nollstall() { avstamBord([], true); state.players[0].cards = []; state.players[0].pending = []; hoppade = new Set(); borttagna = new Set(); n = 0; lyftTips = null; handRad = []; kamFas = ''; kamGrund = 20; lekTal = new Map(); typRad = new Map(); delete state.players[0].lage; autoSum = null; lsMinne.clear(); oppPagar = false;
    gravFlode = false; gravSpeglar = false; kamVand = 0; kamSpegel = false; gravLage = null; gravSedda = new Map(); gravOmstart = 0; delete state.players[0].bibHog; }
};`)({ now: () => klocka.t }, setTimeoutV, clearTimeoutV);

const stam = (spar, fas = 'kort') => app.avstamBord(spar, false, fas);
/* Till handen (MES-343): kortet är ur app.kort och står i raden (app.handRad) med sitt kortobjekt. */
const iHanden = k => !app.kort.includes(k) && app.handRad.some(h => h.cid === k.cid && !h.val);
const iHandenNamn = namn => app.handRad.some(h => h.namn === namn && !h.val);
const box = (x, y, w, h) => ({ x, y, w, h });
/* Ett stående kort 0,063 × 0,088 av bilden, och samma kort tappat runt sitt
   nedre vänstra hörn (liggande, hörnet delat). */
const PORT = box(0.40, 0.40, 0.063, 0.088), LAND_ = box(0.40, 0.40 + 0.088 - 0.063, 0.088, 0.063);
const LANGT = box(0.8, 0.1, 0.063, 0.088);
const klar = (id, namn, rest) => Object.assign({ id, tillstand: 'klar', namn, saker: true, tappad: false }, rest);
const ok = [], fel = [];
const prov = (namn, f) => {
  app.nollstall(); klocka.t = 1e6; timrar.length = 0;
  try { f(); ok.push('OK   ' + namn); } catch (e) { fel.push('FEL  ' + namn + ' — ' + e.message); }
};

prov('S1 Ukud tappas, två spår på samma plats: ett kort, tappat, som följer ledaren', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  assert.equal(app.kort.length, 1);
  stam([klar(1, 'Ukud Cobra', { skymd: true, sen: 1200, ...PORT }), klar(2, 'Ukud Cobra', { tappad: true, sen: 30, ...LAND_ })]);
  assert.equal(app.kort.length, 1, 'dubblett');
  assert.equal(app.kort[0].tapped, 1); assert.equal(app.kort[0].spar, 2);
  // vänds tillbaka: spår 1 färskt igen, 2 inaktuellt
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT }), klar(2, 'Ukud Cobra', { tappad: true, skymd: true, sen: 900, ...LAND_ })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].tapped, 0);
  // gamla spåret dör: kortet flyttar med utan borta
  stam([klar(2, 'Ukud Cobra', { tappad: true, sen: 20, ...LAND_ })]);
  assert.equal(app.kort.length, 1); assert.ok(!app.kort[0].borta); assert.equal(app.kort[0].spar, 2);
});
prov('S1b utan sen (äldre telefon): överlappet räcker', () => {
  stam([klar(1, 'Ukud Cobra', PORT)]);
  stam([klar(1, 'Ukud Cobra', { skymd: true, ...PORT }), klar(2, 'Ukud Cobra', { tappad: true, ...LAND_ })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].tapped, 1);
});
prov('S2 gamla spåret borta i samma meddelande som det nya kommer', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  stam([klar(7, 'Ukud Cobra', { sen: 10, ...LANGT })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].spar, 7); assert.ok(!app.kort[0].borta);
});
prov('S3 två riktiga långt isär: två kort', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT }), klar(2, 'Ukud Cobra', { sen: 10, ...LANGT })]);
  assert.equal(app.kort.length, 2);
});
prov('S4 landhög delad av Claude: tre syskon blir tre', () => {
  const ai = { kort: 3, klunga: 5, modell: 'x' };
  stam([5, 11, 12].map((id, i) => klar(id, 'Plains', { ai, sen: i ? 400 : 10, skymd: !!i, ...box(0.2, 0.2 + i * 0.012, 0.05, 0.07) })));
  assert.equal(app.kort.length, 3);
});
prov('S4b syskon utan klunga-märket (samma ai-objekt, äldre telefon)', () => {
  const ai = { kort: 2, modell: 'x', usage: { input_tokens: 812, output_tokens: 90 } };
  stam([5, 11].map((id, i) => klar(id, 'Plains', { ai, sen: i ? 400 : 10, ...box(0.2, 0.2 + i * 0.012, 0.05, 0.07) })));
  assert.equal(app.kort.length, 2);
});
prov('S5 helbild och detektorn på samma kort: ett kort, detektorns tap-läge', () => {
  stam([klar(3, 'Ukud Cobra', { ai: { helbild: true }, sen: null, ...box(0.41, 0.42, 0.063, 0.088) })]);
  stam([klar(3, 'Ukud Cobra', { ai: { helbild: true }, sen: null, ...box(0.41, 0.42, 0.063, 0.088) }),
        klar(9, 'Ukud Cobra', { tappad: true, sen: 10, ...PORT })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].tapped, 1);
});
prov('S6 två helbildsspår omlott är två kort (Claude sa två)', () => {
  stam([3, 4].map((id, i) => klar(id, 'Forest', { ai: { helbild: true }, sen: null, ...box(0.3, 0.3 + i * 0.02, 0.063, 0.088) })));
  assert.equal(app.kort.length, 2);
});
prov('S7 osäkert spår ovanpå ett klart med samma namn: ingen granskning', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  app.pending.push({ id: 'q', spar: 2 });
  stam([klar(1, 'Ukud Cobra', { skymd: true, sen: 1500, ...PORT }),
        { id: 2, tillstand: 'okand', namn: 'Ukud Cobra', cands: [{ name: 'Ukud Cobra' }], sen: 10, ...LAND_ }]);
  assert.equal(app.kort.length, 1); assert.equal(app.pending.length, 0);
});
prov('S7b osäkert med ANNAN gissning ovanpå: granskas som förut', () => {
  stam([klar(1, 'Ukud Cobra', { skymd: true, sen: 1500, ...PORT }),
        { id: 2, tillstand: 'okand', namn: 'Llanowar Elves', cands: [{ name: 'Llanowar Elves' }], sen: 10, ...LAND_ }]);
  assert.equal(app.pending.length, 1);
});
prov('S8 borttaget för hand: skapas inte igen, inte heller via det andra spåret', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  const k = app.kort.pop(); app.borttagna.add(k.spar);
  stam([klar(1, 'Ukud Cobra', { skymd: true, sen: 900, ...PORT }), klar(2, 'Ukud Cobra', { sen: 10, ...LAND_ })]);
  assert.equal(app.kort.length, 0);
});
prov('S9 inlagt för hand före kameran binds, inget nytt', () => {
  app.kort.push({ cid: 'm', name: 'Forest', flipped: 0 });
  stam([klar(1, 'Forest', { sen: 10, ...PORT })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].spar, 1);
});
prov('S10 kortet i graveyard men bundet: inget nytt', () => {
  app.kort.push({ cid: 'g', name: 'Ukud Cobra', flipped: 0, zon: 'grav', spar: 1 });
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  assert.equal(app.kort.length, 1);
});
prov('S11 ett släppt kort (spåret lästes om, MES-343) tas tillbaka av ett nytt spår', () => {
  app.kort.push({ cid: 'l', name: 'Ukud Cobra', flipped: 0, slappt: 1 });
  stam([klar(4, 'Ukud Cobra', { sen: 10, ...PORT })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].slappt, undefined); assert.equal(app.kort[0].spar, 4);
});
prov('S12 befintlig dubblett (två bundna) lämnas, följer var sitt spår', () => {
  app.kort.push({ cid: 'a', name: 'Ukud Cobra', flipped: 0, spar: 1, tapped: 0 }, { cid: 'b', name: 'Ukud Cobra', flipped: 0, spar: 2, tapped: 1 });
  stam([klar(1, 'Ukud Cobra', { skymd: true, sen: 900, ...PORT }), klar(2, 'Ukud Cobra', { tappad: true, sen: 10, ...LAND_ })]);
  assert.equal(app.kort.length, 2); assert.ok(app.kort.every(c => c.lyft == null));
});
prov('S12b befintlig dubblett: när helbildens spår försvinner går dess kort till handen efter väntan', () => {
  app.kort.push({ cid: 'a', name: 'Ukud Cobra', flipped: 0, spar: 3, tapped: 1 }, { cid: 'b', name: 'Ukud Cobra', flipped: 0, spar: 4, tapped: 0 });
  const det = klar(3, 'Ukud Cobra', { tappad: true, sen: 10, ...box(0.367, 0.367, 0.179, 0.213) });
  stam([det, klar(4, 'Ukud Cobra', { ai: { helbild: true }, sen: null, ...box(0.5, 0.327, 0.129, 0.287) })]);
  stam([det]);
  const b = app.kort.find(c => c.cid === 'b');
  assert.ok(b.borta, 'nåd');
  klocka.t += 3100; stam([det]);
  const a = app.kort.find(c => c.cid === 'a');
  assert.equal(app.kort.length, 1); assert.equal(a.spar, 3);
  assert.ok(iHanden(b), 'till handen'); assert.equal(b.spar, undefined);
});
prov('S13 två färska detektorspår omlott (landhög skuren) räknas som två', () => {
  stam([klar(1, 'Plains', { sen: 10, ...box(0.2, 0.2, 0.05, 0.07) }), klar(2, 'Plains', { sen: 10, ...box(0.2, 0.215, 0.05, 0.07) })]);
  assert.equal(app.kort.length, 2);
});
prov('S14 land i manaraden räknas: nytt spår på samma plats binder det', () => {
  stam([klar(1, 'Forest', { sen: 10, ...PORT })]);
  stam([klar(1, 'Forest', { skymd: true, sen: 900, ...PORT }), klar(2, 'Forest', { tappad: true, sen: 10, ...LAND_ })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].tapped, 1);
});
prov('S15 väntande granskning vars spår blir klart och samma kort: försvinner', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  app.pending.push({ id: 'q', spar: 2 });
  stam([klar(1, 'Ukud Cobra', { skymd: true, sen: 900, ...PORT }), klar(2, 'Ukud Cobra', { sen: 10, ...LAND_ })]);
  assert.equal(app.kort.length, 1); assert.equal(app.pending.length, 0);
});
prov('S16 samma spår, ett annat säkert namn: det gamla ligger kvar orört och släpps (fall 5), det nya får ett kort', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  stam([klar(1, 'Llanowar Elves', { sen: 10, ...PORT })]);
  const u = app.kort.find(c => c.name === 'Ukud Cobra'), l = app.kort.find(c => c.name === 'Llanowar Elves');
  assert.equal(app.kort.length, 2); assert.equal(u.spar, undefined); assert.ok(u.slappt, 'släppt'); assert.equal(l.spar, 1);
  assert.equal(app.handRad.length, 0, 'inte till handen');
});
/* Landen går till handen som permanents (MES-29, MES-343): förut släpptes ett
   lyft lands bindning tyst, och raden sa fyra Forest när tre låg kvar. Graveyard aldrig. */
prov('L1 ett land kameran inte ser längre går till handen efter väntan, det andra står kvar', () => {
  stam([klar(1, 'Forest', { sen: 10, ...PORT }), klar(2, 'Forest', { sen: 10, ...LANGT })]);
  const a = app.kort.find(c => c.spar === 1), b = app.kort.find(c => c.spar === 2);
  stam([klar(2, 'Forest', { sen: 10, ...LANGT })]);
  assert.ok(a.borta, 'nåd');
  klocka.t += 3100; stam([klar(2, 'Forest', { sen: 10, ...LANGT })]);
  assert.equal(app.kort.length, 1); assert.ok(iHanden(a), 'till handen'); assert.equal(a.spar, undefined);
  assert.equal(b.spar, 2);
});
prov('L2 ett land i graveyard tonas inte ned när spåret dör — bindningen släpps tyst', () => {
  stam([klar(1, 'Forest', { sen: 10, ...PORT })]);
  app.kort[0].zon = 'grav';
  stam([]); klocka.t += 3100; stam([]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].lyft, undefined); assert.equal(app.kort[0].spar, undefined);
});
prov('L3 ett land som gått till handen: Still on the table lägger tillbaka det, och ett nytt spår tar det — inget nytt Forest', () => {
  stam([klar(1, 'Forest', { sen: 10, ...PORT })]);
  const k = app.kort[0];
  stam([]); klocka.t += 3100; stam([]);
  assert.ok(iHanden(k), 'till handen'); assert.equal(app.kort.length, 0);
  assert.ok(app.handVal(k.cid, 'kvar'));
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0], k, 'samma kortpost');
  stam([klar(9, 'Forest', { sen: 10, ...PORT })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].spar, 9);
});
prov('L4 samma spår, ett annat säkert namn på ett land: det gamla landet ligger kvar orört', () => {
  stam([klar(1, 'Forest', { sen: 10, ...PORT })]);
  stam([klar(1, 'Mountain', { sen: 10, ...PORT })]);
  const f = app.kort.find(c => c.name === 'Forest'), m = app.kort.find(c => c.name === 'Mountain');
  assert.equal(app.kort.length, 2); assert.equal(f.spar, undefined); assert.ok(f.slappt); assert.equal(m.spar, 1);
});

/* Telefonens riktiga rapporter, med telefonens klocka. */
const R = JSON.parse(fs.readFileSync(path.join(__dirname, 'avstamning-rapporter.json'), 'utf8'));
const spela = logg => { for (const r of logg) { klocka.t = r.nu; stam(r.spar); } };
for (const [namn, logg] of [
  ['R1 tappat runt hörnet, gammal telefon', R.gammalTelefon.horn],
  ['R2 detektorn först, helbilden 0,6 L bredvid, gammal telefon', R.gammalTelefon.detektorForst],
  ['R3 helbilden först, regionen 0,7 L bort, gammal telefon', R.gammalTelefon.helbildForst],
  ['R4 tappat runt hörnet, ny telefon', R.nyTelefon.horn],
  ['R5 detektorn först, ny telefon', R.nyTelefon.detektorForst],
  ['R6 helbilden först, ny telefon', R.nyTelefon.helbildForst]])
  prov(namn + ': ett kort, tappat', () => {
    spela(logg);
    assert.equal(app.kort.length, 1, 'kort: ' + JSON.stringify(app.kort));
    assert.equal(app.kort[0].tapped, 1, 'tappad');
  });

prov('N1 kort bundet till ett osäkert spår räknas: ett nytt Forest långt bort får ett kort', () => {
  app.kort.push({ cid: 'a', name: 'Forest', flipped: 0, spar: 1 });
  stam([{ id: 1, tillstand: 'okand', namn: 'Forest', gissning: 'Forest', sen: 10, ...PORT }, klar(2, 'Forest', { sen: 10, ...LANGT })]);
  assert.equal(app.kort.length, 2);
});
prov('N2 spärrad grupp med kort, och ett nytt riktigt exemplar långt bort: det får ett kort', () => {
  app.kort.push({ cid: 'a', name: 'Ukud Cobra', flipped: 0, spar: 1 });
  app.borttagna.add(2);   // man tog bort dubbletten som satt på spår 2
  stam([klar(1, 'Ukud Cobra', { skymd: true, sen: 900, ...PORT }), klar(2, 'Ukud Cobra', { sen: 10, ...LAND_ }),
        klar(3, 'Ukud Cobra', { sen: 10, ...LANGT })]);
  assert.equal(app.kort.length, 2);
});
prov('N3 helbildsspår som fått en region (färskt, tappat) och ett inaktuellt detektorspår: tappat', () => {
  stam([klar(3, 'Ukud Cobra', { sen: 10, ...PORT })]);
  stam([klar(3, 'Ukud Cobra', { skymd: true, sen: 2000, ...PORT }), klar(9, 'Ukud Cobra', { tappad: true, ai: { helbild: true }, sen: 20, ...LAND_ })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].tapped, 1);
});
prov('N4 två Forest med en centimeters glipa, det ena bara i helbilden: två kort', () => {
  stam([klar(1, 'Forest', { sen: 10, ...box(0.40, 0.40, 0.063, 0.088) }),
        klar(2, 'Forest', { ai: { helbild: true }, sen: null, ...box(0.40 + 0.063 + 0.01, 0.40, 0.063, 0.088) })]);
  assert.equal(app.kort.length, 2);
});
prov('N5 chippet räknar kort, inte spår', () => {
  spela(R.gammalTelefon.detektorForst);
  assert.equal(app.chip.kamSer, 1); assert.equal(app.chip.kamLast, 1); assert.equal(app.chip.kamTot, 1);
});

/* Skräp i granskningen (MES-29): ett okänt spår som prövas väntar på
   Claude — ingen post, ingen bindning på ledtråden, och chippet räknar det
   som att det läses. En telefon utan fältet beter sig som förut. */
const okant = (id, rest) => Object.assign({ id, tillstand: 'okand', namn: 'Plains', saker: false, gissning: null,
  cands: [{ name: 'Plains', sid: null, score: 0.4 }], tappad: false, sen: 10 }, PORT, rest);
prov('P1 prövas: ingen granskning, och chippet räknar spåret som att det läses', () => {
  stam([okant(901, { provas: true })]);
  assert.equal(app.pending.length, 0); assert.equal(app.kort.length, 0);
  assert.equal(app.chip.kamSer, 1); assert.equal(app.chip.kamTot, 0);
});
prov('P2 samma spår när svaret kommit (provas false): granskningen som förut', () => {
  stam([okant(901, { provas: true })]);
  stam([okant(901, { provas: false })]);
  assert.equal(app.pending.length, 1); assert.equal(app.pending[0].spar, 901); assert.equal(app.chip.kamTot, 1);
});
prov('P3 ledtråden väntar: ett obundet Forest står kvar obundet medan spåret prövas, binds sedan', () => {
  app.kort.push({ cid: 'f', name: 'Forest', flipped: 0 });
  stam([okant(902, { gissning: 'Forest', provas: true })]);
  assert.equal(app.kort[0].spar, undefined);
  stam([okant(902, { gissning: 'Forest', provas: false })]);
  assert.equal(app.kort[0].spar, 902); assert.equal(app.pending.length, 0);
});
prov('P4 Claude: inget kort — den köade posten tas bort, inget kort skapas', () => {
  stam([okant(903, { provas: false })]);
  assert.equal(app.pending.length, 1);
  stam([{ id: 903, tillstand: 'skrap', ...PORT }]);
  assert.equal(app.pending.length, 0); assert.equal(app.kort.length, 0);
});
prov('P5 telefon utan fältet provas: köas på en gång som förut', () => {
  stam([okant(904)]);
  assert.equal(app.pending.length, 1); assert.equal(app.chip.kamTot, 1);
});
/* Ur granskningen av MES-29 (adversariell, bekräftad mot koden). */
prov('K4 obundet kort bundet på ledtråden och sedan tappat: fortfarande ett kort', () => {
  app.kort.push({ cid: 'u', name: 'Ukud Cobra', flipped: 0 });
  stam([okant(1, { namn: 'Ukud Cobra', gissning: 'Ukud Cobra', sen: 10, ...PORT })]);
  assert.equal(app.kort[0].spar, 1, 'bands inte på ledtråden');
  stam([okant(1, { namn: 'Ukud Cobra', gissning: 'Ukud Cobra', skymd: true, sen: 1200, ...PORT }), klar(2, 'Ukud Cobra', { tappad: true, sen: 30, ...LAND_ })]);
  assert.equal(app.kort.length, 1, 'dubblett'); assert.equal(app.kort[0].spar, 2); assert.equal(app.kort[0].tapped, 1);
  assert.equal(app.pending.length, 0, 'det osäkra spåret köades');
  stam([klar(2, 'Ukud Cobra', { tappad: true, sen: 20, ...LAND_ })]);
  klocka.t += 5000; stam([klar(2, 'Ukud Cobra', { tappad: true, sen: 20, ...LAND_ })]);
  assert.equal(app.kort.length, 1); assert.equal(app.handRad.length, 0, 'originalet gick till handen');
});
prov('K5 borttaget för hand, det spärrade spåret dör men ett annat ser kortet: skapas inte igen', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  const k = app.kort.pop(); app.borttagna.add(k.spar);
  stam([klar(1, 'Ukud Cobra', { skymd: true, sen: 900, ...PORT }), klar(2, 'Ukud Cobra', { tappad: true, sen: 10, ...LAND_ })]);
  assert.equal(app.kort.length, 0);
  stam([klar(2, 'Ukud Cobra', { tappad: true, sen: 10, ...LAND_ })]);
  assert.equal(app.kort.length, 0, 'kortet kom tillbaka fast det aldrig lyfts');
  stam([]);   // nu lyfts det: spärren släpper
  stam([klar(3, 'Ukud Cobra', { sen: 10, ...PORT })]);
  assert.equal(app.kort.length, 1, 'ett kort som läggs ut igen efter lyftet får ett kort');
});

/* Tap-synken från kameran till bordet står kvar (produktregeln 2026-09-10:
   kameran läser tappat/otappat, mot ett bekräftat grundläge). Kortets
   tapped följer spårets tappad åt båda hållen, och ett kort som skapas
   från ett tappat spår föds tappat — när ett grundläge är sparat (20 här,
   se miljo). Utan sparat läge (MES-27, T3) spelas korten otappade: det
   första kortet i Jespers parti lades ut tappat, och först därefter kom
   frågan om det låg otappat. */
prov('T1 spårets tappad styr det bundna kortet: tappas, och otappas igen', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  assert.equal(app.kort[0].tapped, 0);
  stam([klar(1, 'Ukud Cobra', { tappad: true, sen: 10, ...LAND_ })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].tapped, 1);
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  assert.equal(app.kort[0].tapped, 0);
});
prov('T2 ett kort som skapas ur ett tappat spår föds tappat', () => {
  stam([klar(1, 'Forest', { tappad: true, sen: 10, ...LAND_ })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].tapped, 1);
});
prov('T3 utan sparat läge (null): ett tappat spår skapar ett otappat kort, tappar inte ett bundet, och lämnar den digitala tappningen', () => {
  app.grund = null;
  stam([klar(1, 'Forest', { tappad: true, sen: 10, ...LAND_ })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].tapped, 0, 'föds otappat');
  stam([klar(1, 'Forest', { tappad: true, sen: 10, ...LAND_ })]);
  assert.equal(app.kort[0].tapped, 0, 'bundet kort tappas inte av spåret');
  app.kort[0].tapped = 1;   // tappat för hand på datorn
  stam([klar(1, 'Forest', { sen: 10, ...PORT })]);
  assert.equal(app.kort[0].tapped, 1, 'ett otappat spår otappar inte heller');
  /* Granskningens post bär INGEN bedömning (null), inte "otappat": kortet
     applyPick skapar ur den föds otappat ändå, men ett nedtonat kort som
     svaret binder om behåller det tap-läge spelaren satt för hand — ett
     false hade avtappat det. */
  stam([klar(1, 'Forest', { sen: 10, ...PORT }), { id: 2, tillstand: 'okand', namn: null, cands: [], tappad: true, sen: 10, ...LANGT }]);
  assert.equal(app.pending.length, 1); assert.strictEqual(app.pending[0].tappad, null);
});
prov('T4 läget sparas (20): nästa bord tappar det bundna kortet efter spåret — som förut', () => {
  app.grund = null;
  stam([klar(1, 'Forest', { tappad: true, sen: 10, ...LAND_ })]);
  assert.equal(app.kort[0].tapped, 0);
  /* Telefonen dömer om spåren när läget sparas (grundFranSpar → domOm) och
     skickar bordet på en gång, med talet i meddelandet; kamTogsEmot sätter
     kamGrund innan avstamBord läser det. */
  app.grund = 20;
  stam([klar(1, 'Forest', { tappad: true, sen: 10, ...LAND_ })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].tapped, 1, 'spårets dom gäller från första bordet med läge');
  stam([klar(1, 'Forest', { sen: 10, ...PORT })]);
  assert.equal(app.kort[0].tapped, 0);
});
prov('T5 telefon utan fältet (undefined): spårets dom gäller som förut', () => {
  app.grund = undefined;
  stam([klar(1, 'Forest', { tappad: true, sen: 10, ...LAND_ })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].tapped, 1, 'föds tappat');
  stam([klar(1, 'Forest', { sen: 10, ...PORT })]);
  assert.equal(app.kort[0].tapped, 0);
});
/* Knappen Save i kameravyn (senasteMattaKort): det senast skapade kamerakortet vars spår detektorn mätt
   (sen != null, inte helbild); är det borta, det senast bundna. Statusfältets steg som nämnde samma kort
   är borttaget (MES-334 steg 6). */
prov('T6 knappen Save i kameravyn: senaste mätta kamerakortet', () => {
  app.grund = null;
  assert.equal(app.senaste(), null, 'tomt bord');
  stam([klar(3, 'Ukud Cobra', { ai: { helbild: true }, sen: null, ...box(0.41, 0.42, 0.063, 0.088) })]);
  assert.equal(app.kort.length, 1); assert.equal(app.senaste(), null, 'ett helbildskort har ingen vinkel');
  stam([klar(3, 'Ukud Cobra', { ai: { helbild: true }, sen: null, ...box(0.41, 0.42, 0.063, 0.088) }), klar(4, 'Forest', { sen: 10, ...LANGT })]);
  assert.equal(app.senaste().spar, 4, 'första mätta kortet');
  stam([klar(4, 'Forest', { sen: 10, ...LANGT }), klar(5, 'Plains', { sen: 10, ...PORT })]);
  assert.equal(app.senaste().spar, 5, 'det senaste kortet');
  stam([klar(4, 'Forest', { sen: 10, ...LANGT })]);   // Plains lyfts: kortet är borta i nåd, knappen tar Forest
  assert.equal(app.senaste().spar, 4);
});
prov('T6b knappen också för ett kort som låg på bordet och bands till ett mätt spår', () => {
  app.grund = null;
  app.kort.push({ cid: 'm', name: 'Forest', flipped: 0 });
  stam([klar(1, 'Forest', { sen: 10, ...PORT })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].spar, 1); assert.equal(app.senasteKamSpar, null);
  assert.equal(app.senaste().spar, 1);
});

/* Statusfältet (MES-32, MES-27): { text, not, paVag, granska }. text räknar
   riktiga kort på bordet (bundna, inte nedtonade) och spår på väg (läses
   eller väntar på Claude); paVag är de spåren med när datorn först såg
   dem; granska är kön; not är högst en anmärkning utan siffror. Osäkra,
   skymda och dubbla spår får inget eget besked: de osäkra ÄR granskningen,
   resten syns i kameravyn. */
const paVag = m => m.paVag.map(v => v.slag + ':' + v.spar);
prov('R1 ett nytt spår: "1 på väg", sett från första bordet, och notisen att det läses', () => {
  stam([{ id: 1, tillstand: 'ny', sen: 10, ...PORT }]);
  let m = app.remsa();
  assert.equal(m.text, 'Camera · 1 on the way'); assert.equal(m.not, 'The card you put down is being read …'); assert.equal(m.puls, true); assert.equal(m.granska, 0);
  assert.deepEqual(paVag(m), ['laser:1']); assert.equal(m.paVag[0].sedan, klocka.t); assert.equal(m.paVag[0].namn, null);
  klocka.t += 2400; stam([{ id: 1, tillstand: 'stilla', sen: 10, ...PORT }]);
  m = app.remsa(); assert.deepEqual(paVag(m), ['laser:1']); assert.equal(klocka.t - m.paVag[0].sedan, 2400); assert.equal(m.not, 'The card you put down is being read …');
});
prov('R1b ett spår som är "ny" i över tre sekunder rör sig: "Något rör sig på bordet"', () => {
  stam([{ id: 1, tillstand: 'ny', sen: 10, ...PORT }]);
  klocka.t += 3500; stam([{ id: 1, tillstand: 'ny', sen: 10, ...PORT }]);
  const m = app.remsa(); assert.equal(m.not, 'Something is moving on the table'); assert.equal(m.text, 'Camera · 1 on the way');
});
prov('R2 ett spår som prövas väntar på Claude: på väg, gissningen som namn, ingen post i kön', () => {
  stam([{ id: 1, tillstand: 'okand', provas: true, gissning: 'Forest', sen: 10, ...PORT }]);
  klocka.t += 5000; stam([{ id: 1, tillstand: 'okand', provas: true, gissning: 'Forest', sen: 10, ...PORT }]);
  const m = app.remsa();
  assert.equal(app.pending.length, 0); assert.equal(m.granska, 0);
  assert.deepEqual(paVag(m), ['vantar:1']); assert.equal(m.paVag[0].namn, 'Forest'); assert.equal(klocka.t - m.paVag[0].sedan, 5000);
  assert.equal(m.text, 'Camera · 1 on the way'); assert.equal(m.not, 'The card you put down (Forest?) — asking Claude …'); assert.equal(m.puls, true);
});
prov('R3 okänt med post i kön: granskningen räknar det, inget "på väg", notisen säger vart det tog vägen', () => {
  stam([{ id: 1, tillstand: 'okand', cands: [{ name: 'Forest', sid: 's', score: 0.5 }], sen: 10, ...PORT }]);
  assert.equal(app.pending.length, 1);
  const m = app.remsa();
  assert.equal(m.granska, 1); assert.deepEqual(m.paVag, []); assert.equal(m.not, 'The card you put down went to the review'); assert.equal(m.puls, false);
  assert.equal(m.text, 'Camera');            // inte "bordet är tomt": kameran ser ett kort
});
prov('R3b okänt som hoppats över i granskningen: varken på väg eller i kön', () => {
  stam([{ id: 1, tillstand: 'okand', sen: 10, ...PORT }]);
  app.pending.length = 0; app.hoppade.add(1);
  stam([{ id: 1, tillstand: 'okand', sen: 10, ...PORT }]);
  assert.equal(app.pending.length, 0);
  const m = app.remsa(); assert.equal(m.granska, 0); assert.deepEqual(m.paVag, []); assert.equal(m.text, 'Camera');
});
prov('R4 skymt spår som inte är ett kort: inte på väg, ingen anmärkning', () => {
  stam([{ id: 1, tillstand: 'stilla', skymd: true, sen: 900, ...PORT }]);
  const m = app.remsa(); assert.deepEqual(m.paVag, []); assert.equal(m.not, null); assert.equal(m.text, 'Camera');
});
prov('R5 sma=1: "Ett kort är för litet för att läsas", utan spår; två blir "Två kort … för små"', () => {
  stam([]);
  let m = app.remsa({ sma: 1 });
  assert.equal(m.not, 'One card is too small to read'); assert.equal(m.text, 'Camera'); assert.deepEqual(m.paVag, []);
  m = app.remsa({ sma: 2 }); assert.equal(m.not, 'Two cards are too small to read');
  m = app.remsa({ sma: 7 }); assert.equal(m.not, '7 cards are too small to read');
});
prov('R5b telefonens råd om avståndet står aldrig för sig självt: "för litet" gäller, annars inget', () => {
  stam([]);
  let m = app.remsa({ rad: 'The cards are small in the picture. Move the phone closer to the table.', sma: 1 });
  assert.equal(m.not, 'One card is too small to read');
  m = app.remsa({ rad: 'The cards are small in the picture. The phone gives 1280×720 but can do 3840×2160.' });
  assert.equal(m.not, null);
});
prov('R6 allt bundet: "N kort på bordet" och inget mer — också när ett kort ses som två spår', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT }), klar(2, 'Forest', { sen: 10, ...LANGT })]);
  let m = app.remsa();
  assert.equal(m.text, 'Camera · 2 cards on the table'); assert.deepEqual(m.paVag, []); assert.equal(m.not, null); assert.equal(m.granska, 0);
  stam([klar(1, 'Ukud Cobra', { skymd: true, sen: 1200, ...PORT }), klar(3, 'Ukud Cobra', { tappad: true, sen: 30, ...LAND_ }), klar(2, 'Forest', { sen: 10, ...LANGT })]);
  m = app.remsa(); assert.equal(m.text, 'Camera · 2 cards on the table'); assert.deepEqual(m.paVag, []);
  assert.deepEqual([...app.losa], []);
  /* Spåren borta: korten är bundna och synliga i väntan (BORTA_NAD), så de
     räknas tills de går till handen (MES-343) — då är bordet tomt, och raden
     vid nederkanten säger vart de tog vägen, inte anmärkningen. */
  stam([]); m = app.remsa(); assert.equal(m.text, 'Camera · 2 cards on the table'); assert.equal(m.not, null);
  klocka.t += 3200; stam([]); m = app.remsa();
  assert.equal(m.text, 'Camera · the table is empty'); assert.equal(m.not, null); assert.equal(app.handRad.length, 2);
});
prov('R6b två kort på bordet och ett tredje på väg: "2 kort på bordet · 1 på väg"', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT }), klar(2, 'Forest', { sen: 10, ...LANGT }), { id: 3, tillstand: 'ny', sen: 10, ...LAND_ }]);
  const m = app.remsa();
  assert.equal(m.text, 'Camera · 2 cards on the table · 1 on the way'); assert.deepEqual(paVag(m), ['laser:3']);
});
prov('R7 ett kort som gått till handen räknas inte som på bordet, och ingen anmärkning', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  const k = app.kort[0];
  stam([]); klocka.t += 3200; stam([]);
  assert.ok(iHanden(k), 'till handen');
  const m = app.remsa();
  assert.equal(m.not, null); assert.equal(m.text, 'Camera · the table is empty');
});
prov('R7b flera till handen: raden har båda, ingen anmärkning', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT }), klar(2, 'Forest', { sen: 10, ...LANGT })]);
  stam([]); klocka.t += 3200; stam([]);
  assert.equal(app.kort.length, 0); assert.equal(app.handRad.length, 2);
  assert.equal(app.remsa().not, null);
});
prov('R8 medan telefonen lär sig ljuset: "lär sig ljuset" och "Håll telefonen stilla", inget annat', () => {
  stam([{ id: 1, tillstand: 'ny', sen: 10, ...PORT }]);
  const m = app.remsa({ fas: 'lar' });
  assert.equal(m.text, 'Camera · learning the light'); assert.equal(m.not, 'Hold the phone still'); assert.deepEqual(m.paVag, []);
  /* Ytans betyg hör till kameravyn, aldrig till fältet: notisen är den om
     kortet som läses, med eller utan yta. */
  assert.equal(app.remsa({ yta: { dom: 'orolig', rad: 'The table pattern makes the camera unsure. …' } }).not, 'The card you put down is being read …');
});
prov('R9 ett kort borttaget för hand: spåret är löst men varken på väg eller i kön', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  const k = app.kort.pop(); app.borttagna.add(k.spar);
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  assert.equal(app.kort.length, 0);
  const m = app.remsa(); assert.deepEqual(m.paVag, []); assert.equal(m.granska, 0); assert.equal(m.text, 'Camera');
});
prov('R10 nollställning glömmer när spåren sågs: spår 1 är nytt igen', () => {
  stam([{ id: 1, tillstand: 'ny', sen: 10, ...PORT }]);
  klocka.t += 4000; app.avstamBord([], true);
  stam([{ id: 1, tillstand: 'stilla', sen: 10, ...PORT }]);
  const m = app.remsa(); assert.deepEqual(paVag(m), ['laser:1']); assert.equal(m.paVag[0].sedan, klocka.t);
});

/* Notisen om kortet man just la ut (MES-27): det spår som ändrades senast —
   dök upp, eller flyttade sig mer än 15 % av sin bredd — så länge det läses
   eller väntar på Claude, och fyra sekunder efter att det hamnade i
   granskningen. Telefonens råd om ytan och avståndet hör till det kortet,
   aldrig till bordet. Inget nytt: ingen notis. Lägeskartan (sparLage)
   nollställs med kameran. */
const flytt = (b, dx) => box(b.x + dx, b.y, b.w, b.h);
const BLANK = 'There is glare in the picture. Move the lamp or the phone so the glare goes away.';
prov('K1 två spår: notisen gäller det som dök upp senast, och pulserar medan det läses', () => {
  stam([{ id: 1, tillstand: 'stilla', sen: 10, ...PORT }]);
  let m = app.remsa(); assert.equal(m.not, 'The card you put down is being read …'); assert.equal(m.puls, true);
  klocka.t += 1500; stam([{ id: 1, tillstand: 'stilla', sen: 10, ...PORT }, { id: 2, tillstand: 'ny', sen: 10, ...LANGT }]);
  assert.equal(app.remsa().not, 'The card you put down is being read …');
  /* Spår 2 går till Claude medan 1 fortfarande läses: notisen följer 2. */
  klocka.t += 500; stam([{ id: 1, tillstand: 'stilla', sen: 10, ...PORT }, { id: 2, tillstand: 'okand', provas: true, gissning: 'Forest', sen: 10, ...LANGT }]);
  m = app.remsa(); assert.equal(m.not, 'The card you put down (Forest?) — asking Claude …'); assert.equal(m.puls, true);
  assert.equal(app.lage.get(1).andrad, klocka.t - 2000); assert.equal(app.lage.get(2).andrad, klocka.t - 500);
});
prov('K2 ett spår som flyttat sig mer än 15 % av sin bredd är det senaste igen; darr räknas inte', () => {
  stam([{ id: 1, tillstand: 'stilla', sen: 10, ...PORT }]);
  klocka.t += 1000; stam([{ id: 1, tillstand: 'stilla', sen: 10, ...PORT }, { id: 2, tillstand: 'okand', provas: true, gissning: 'Forest', sen: 10, ...LANGT }]);
  assert.equal(app.remsa().not, 'The card you put down (Forest?) — asking Claude …');
  klocka.t += 1000; stam([{ id: 1, tillstand: 'stilla', sen: 10, ...flytt(PORT, 0.005) }, { id: 2, tillstand: 'okand', provas: true, gissning: 'Forest', sen: 10, ...LANGT }]);
  assert.equal(app.remsa().not, 'The card you put down (Forest?) — asking Claude …', 'darr på 8 % av bredden');
  klocka.t += 1000; stam([{ id: 1, tillstand: 'stilla', sen: 10, ...flytt(PORT, 0.035) }, { id: 2, tillstand: 'okand', provas: true, gissning: 'Forest', sen: 10, ...LANGT }]);
  assert.equal(app.remsa().not, 'The card you put down is being read …', 'flyttat en halv kortbredd');
  assert.equal(app.lage.get(1).andrad, klocka.t); assert.equal(app.lage.get(1).x, PORT.x + 0.035);
});
prov('K3 hamnade i granskningen: fyra sekunder, sedan ingen notis — kön står kvar', () => {
  stam([{ id: 1, tillstand: 'okand', namnLast: { namn: 'Killing Glare', poang: 0.9 }, cands: [{ name: 'Killing Glare', sid: 's', score: 0.5 }], sen: 10, ...PORT }]);
  let m = app.remsa(); assert.equal(m.not, 'The card you put down (Killing Glare?) went to the review'); assert.equal(m.puls, false); assert.equal(m.granska, 1);
  klocka.t += 3900; stam([{ id: 1, tillstand: 'okand', namnLast: { namn: 'Killing Glare', poang: 0.9 }, sen: 10, ...PORT }]);
  assert.equal(app.remsa().not, 'The card you put down (Killing Glare?) went to the review');
  klocka.t += 200; stam([{ id: 1, tillstand: 'okand', namnLast: { namn: 'Killing Glare', poang: 0.9 }, sen: 10, ...PORT }]);
  m = app.remsa(); assert.equal(m.not, null); assert.equal(m.granska, 1);
  /* Väntade det på Claude först räknas de fyra sekunderna från svaret. */
  klocka.t += 1000; stam([{ id: 2, tillstand: 'okand', provas: true, sen: 10, ...LANGT }]);
  assert.equal(app.remsa().not, 'The card you put down — asking Claude …');
  klocka.t += 3000; stam([{ id: 2, tillstand: 'okand', cands: [{ name: 'Forest', sid: 's', score: 0.4 }], sen: 10, ...LANGT }]);
  assert.equal(app.remsa().not, 'The card you put down went to the review'); assert.equal(app.lage.get(2).klar, klocka.t);
});
prov('K3b ett kort som fick sitt namn: ingen notis — det syns på bordet', () => {
  stam([{ id: 1, tillstand: 'stilla', sen: 10, ...PORT }]);
  assert.equal(app.remsa().not, 'The card you put down is being read …');
  klocka.t += 1200; stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  const m = app.remsa(); assert.equal(m.not, null); assert.equal(m.puls, false); assert.equal(m.text, 'Camera · 1 card on the table');
  /* Ett kort som var klart redan när det dök upp (telefonen kopplade upp
     mot ett dukat bord) får inte heller någon notis. */
  klocka.t += 1000; stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT }), klar(2, 'Forest', { sen: 10, ...LANGT })]);
  assert.equal(app.remsa().not, null);
});
prov('K4 telefonens råd hör till kortet som läses, aldrig till bordet', () => {
  stam([]);
  assert.equal(app.remsa({ rad: BLANK }).not, null, 'tomt bord: inget råd');
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  assert.equal(app.remsa({ rad: BLANK }).not, null, 'inget nytt kort: inget råd');
  klocka.t += 1000; stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT }), { id: 2, tillstand: 'stilla', sen: 10, ...LANGT }]);
  const m = app.remsa({ rad: BLANK });
  assert.equal(m.not, 'The card you put down is hard to read — there is glare on it'); assert.equal(m.puls, true);
  assert.equal(app.remsa({ rad: 'The table pattern makes the camera unsure. A plain cloth or a large sheet of paper under the cards helps.' }).not, 'The card you put down is hard to read — the table pattern interferes');
  assert.equal(app.remsa({ rad: 'The cards are small in the picture. Move the phone closer to the table.' }).not, 'The card you put down is hard to read — it is small in the picture');
  assert.equal(app.remsa({ rad: 'The cards are small in the picture. The phone gives 1280×720 but can do 3840×2160.' }).not, 'The card you put down is hard to read — it is small in the picture');
  assert.equal(app.remsa({ rad: 'The table is almost as light as the cards. A darker cloth under the cards makes the camera more certain.' }).not, 'The card you put down is hard to read — the table is almost as light as the card');
  assert.equal(app.remsa({ rad: 'Something entirely new. Second sentence.' }).not, 'The card you put down is hard to read — something entirely new');
  /* Väntar kortet på Claude säger notisen det — rådet står i kameravyn. */
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT }), { id: 2, tillstand: 'okand', provas: true, sen: 10, ...LANGT }]);
  assert.equal(app.remsa({ rad: BLANK }).not, 'The card you put down — asking Claude …');
  /* Rörelsen går före allt: den går över av sig själv. */
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT }), { id: 3, tillstand: 'ny', sen: 10, ...LANGT }]);
  klocka.t += 3500; stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT }), { id: 3, tillstand: 'ny', sen: 10, ...LANGT }]);
  assert.equal(app.remsa({ rad: BLANK }).not, 'Something is moving on the table');
});
prov('K5 raden vid nederkanten står i sex sekunder (HAND_RAD_MS), sedan står handen fast', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  const k = app.kort[0];
  stam([]); klocka.t += 3200; stam([]);
  assert.ok(iHanden(k)); const nar = app.handRad[0].nar;
  klocka.t = nar + 5900; stam([]); assert.ok(iHanden(k), 'raden står');
  klocka.t = nar + 6100; stam([]); assert.equal(app.handRad.length, 0, 'raden borta: handen står fast'); assert.equal(app.kort.length, 0);
});
prov('K6 nollställningen glömmer spårens lägen: samma spår är nytt igen', () => {
  stam([{ id: 1, tillstand: 'okand', cands: [{ name: 'Forest', sid: 's', score: 0.5 }], sen: 10, ...PORT }]);
  assert.equal(app.remsa().not, 'The card you put down went to the review'); assert.equal(app.lage.size, 1);
  klocka.t += 10000; app.avstamBord([], true);
  assert.equal(app.lage.size, 0);
  stam([{ id: 1, tillstand: 'okand', cands: [{ name: 'Forest', sid: 's', score: 0.5 }], sen: 10, ...PORT }]);
  assert.equal(app.lage.get(1).andrad, klocka.t); assert.equal(app.lage.get(1).klar, klocka.t);
  assert.equal(app.remsa().not, 'The card you put down went to the review');
  /* Spår som försvinner glöms också, som i sparSedd. */
  stam([]); assert.equal(app.lage.size, 0);
});

/* Sammanfattningen när auto stängs av: korten räknas en gång per cid ur
   ledarspåret med metod och tid, kostnaden ur telefonens bok per session
   (skillnaden mot den första boken efter start) plus datorns egna anrop,
   och priset ur tabellen med serverns modellnamn. */
const bok = (sess, per, extra) => Object.assign({ sess, anrop: Object.values(per).reduce((a, q) => a + q.anrop, 0), fel: 0, utan: 0, ute: 0, per }, extra || {});
const OPUS = 'claude-opus-5', SONNET = 'claude-sonnet-5';
const nara = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;
prov('A1 boken per modell: telefonens anrop räknas per modell, tokens och pris', () => {
  stam([klar(1, 'Forest', { sen: 10, lokalMs: 400, ...PORT })]);
  app.bok(bok('s1', {}));
  app.bok(bok('s1', { [OPUS]: { anrop: 2, fel: 0, in: 1000, ut: 100 }, [SONNET]: { anrop: 1, fel: 0, in: 500, ut: 50 } }));
  const k = app.summa().kostnad;
  assert.equal(k.telefon.anrop, 3); assert.equal(k.telefon.per[OPUS].anrop, 2); assert.equal(k.telefon.per[SONNET].in, 500);
  assert.equal(k.telefon.in, 1500); assert.equal(k.telefon.ut, 150);
  assert.ok(nara(k.telefon.per[OPUS].usd, (1000 * 5 + 100 * 25) / 1e6)); assert.ok(nara(k.telefon.per[SONNET].usd, (500 * 2 + 50 * 10) / 1e6));
  assert.ok(nara(k.totalt.usd, 0.0075 + 0.0015)); assert.equal(k.ingenBok, false); assert.deepEqual(k.totalt.okandPris, []);
});
prov('A2 samma bok igen (hjärtslaget) ändrar ingenting', () => {
  const b = bok('s1', { [OPUS]: { anrop: 2, fel: 0, in: 812, ut: 90 } });
  assert.equal(app.bok(bok('s1', {})), true);
  assert.equal(app.bok(b), true); assert.equal(app.bok(b), false); assert.equal(app.bok(JSON.parse(JSON.stringify(b))), false);
  assert.equal(app.summa().kostnad.telefon.anrop, 2); assert.equal(app.summa().kostnad.telefon.in, 812);
});
prov('A3 två telefonsessioner summeras, och en omladdad telefon drar inte ifrån', () => {
  app.bok(bok('s1', {})); app.bok(bok('s1', { [OPUS]: { anrop: 2, fel: 0, in: 1000, ut: 100 } }));
  app.bok(bok('s2', {}));                         // telefonen laddades om: ny sess på noll
  assert.equal(app.summa().kostnad.telefon.anrop, 2, 'omladdningen drog ifrån');
  app.bok(bok('s2', { [OPUS]: { anrop: 1, fel: 0, in: 300, ut: 30 } }));
  const k = app.summa().kostnad;
  assert.equal(k.telefon.anrop, 3); assert.equal(k.telefon.in, 1300); assert.equal(k.sessioner, 2);
});
prov('A3b första boken efter start är nollpunkten: det som redan stod i den räknas inte', () => {
  app.bok(bok('s1', { [OPUS]: { anrop: 5, fel: 1, in: 9000, ut: 900 } }, { fel: 1 }));
  assert.equal(app.summa().kostnad.telefon.anrop, 0);
  app.bok(bok('s1', { [OPUS]: { anrop: 6, fel: 1, in: 9500, ut: 950 } }, { fel: 1 }));
  const k = app.summa().kostnad.telefon;
  assert.equal(k.anrop, 1); assert.equal(k.fel, 0); assert.equal(k.in, 500); assert.equal(k.ut, 50);
});
prov('A4 medianen: udda, jämnt, tomt — lokalt, med Claude och alla lästa', () => {
  const lokal = (id, ms, b) => klar(id, 'Kort ' + id, { sen: 10, lokalMs: ms, varfor: 'bild', ...b });
  stam([lokal(1, 100, PORT), lokal(2, 300, LANGT), lokal(3, 200, box(0.1, 0.7, 0.063, 0.088))]);
  let m = app.summa();
  assert.equal(m.lokal.n, 3); assert.equal(m.lokal.medianMs, 200); assert.equal(m.ai.medianMs, null); assert.equal(m.medianMs, 200);
  stam([lokal(4, 400, box(0.6, 0.7, 0.063, 0.088))]);
  m = app.summa();
  assert.equal(m.lokal.n, 4); assert.equal(m.lokal.medianMs, 250); assert.equal(m.kort, 4);
  /* Claude: lokal tid + svarstid; medianen per modell och för alla lästa. */
  stam([klar(5, 'Ukud Cobra', { sen: 10, lokalMs: 600, varfor: 'ai', ai: { modell: OPUS, ms: 2000, klunga: 5 }, ...PORT }),
        klar(6, 'Plains', { sen: 10, lokalMs: 500, varfor: 'ai osäker', ai: { modell: SONNET, ms: 1500, klunga: 6 }, ...LANGT })]);
  m = app.summa();
  assert.equal(m.ai.n, 2); assert.equal(m.ai.medianMs, 2300); assert.equal(m.ai.per[OPUS].medianMs, 2600); assert.equal(m.ai.per[SONNET].n, 1);
  assert.equal(m.medianMs, 350, 'alla lästa: [100,200,300,400,2000,2600] → 350');
  /* Ett kort utan tid räknas men ingår inte i medianen. */
  stam([klar(7, 'Swamp', { sen: 10, varfor: 'bild', ...box(0.1, 0.1, 0.063, 0.088) })]);
  m = app.summa(); assert.equal(m.lokal.n, 5); assert.equal(m.lokal.medianMs, 250);
});
prov('A4b tomt pass: inga kort, ingen median, ingen bok', () => {
  app.starta();
  const m = app.summa();
  assert.equal(m.hittade, 0); assert.equal(m.medianMs, null); assert.equal(m.kostnad.ingenBok, true); assert.equal(m.kostnad.totalt.usd, 0);
});
prov('A5 priset exakt: Opus 812 in / 90 ut = 0,00631 USD; datumsuffixet stryks', () => {
  assert.ok(nara(app.kostnad(OPUS, 812, 90), 0.00631)); assert.ok(nara(app.kostnad('claude-opus-5-20260901', 812, 90), 0.00631));
  assert.ok(nara(app.kostnad('claude-fable-5-1', 1e6, 1e6), 60)); assert.ok(nara(app.kostnad('claude-haiku-4-5', 1e6, 0), 1));
  app.bok(bok('s1', {})); app.bok(bok('s1', { [OPUS]: { anrop: 1, fel: 0, in: 812, ut: 90 } }));
  assert.ok(nara(app.summa().kostnad.totalt.usd, 0.00631));
});
prov('A6 okänd modell (attrappens stub-model, null): priset är null, aldrig 0, och står som okänt', () => {
  assert.equal(app.kostnad('stub-model', 812, 90), null); assert.equal(app.kostnad(null, 812, 90), null); assert.equal(app.pris('claude-opus-9'), null);
  app.bok(bok('s1', {})); app.bok(bok('s1', { 'stub-model': { anrop: 2, fel: 0, in: 812, ut: 90 } }));
  const k = app.summa().kostnad;
  assert.equal(k.telefon.per['stub-model'].usd, null); assert.equal(k.totalt.usd, null); assert.deepEqual(k.totalt.okandPris, ['stub-model']);
  assert.equal(k.totalt.in, 812, 'tokens räknas ändå');
  /* Blandat: den kända modellen prisas, den okända står som okänd. */
  app.bok(bok('s1', { 'stub-model': { anrop: 2, fel: 0, in: 812, ut: 90 }, [OPUS]: { anrop: 1, fel: 0, in: 812, ut: 90 } }));
  const k2 = app.summa().kostnad;
  assert.ok(nara(k2.totalt.usd, 0.00631)); assert.deepEqual(k2.totalt.okandPris, ['stub-model']);
});
prov('A7 ett kort ur helbilden räknas en gång, med Claude, utan lokal tid — hur många bord det än står i', () => {
  const hb = klar(3, 'Ukud Cobra', { ai: { helbild: true, modell: OPUS, ms: 9000 }, varfor: 'helbild', sen: null, ...box(0.41, 0.42, 0.063, 0.088) });
  for (let i = 0; i < 5; i++) { stam([hb]); klocka.t += 3000; }
  let m = app.summa();
  assert.equal(m.kort, 1); assert.equal(m.ai.n, 1); assert.equal(m.ai.per[OPUS].n, 1); assert.equal(m.ai.medianMs, 9000);
  /* Detektorn tar över kortet (samma plats): fortfarande ett kort. */
  stam([hb, klar(9, 'Ukud Cobra', { tappad: true, sen: 10, lokalMs: 300, varfor: 'bild', ...PORT })]);
  m = app.summa(); assert.equal(m.kort, 1); assert.equal(app.kort.length, 1);
});
prov('A8 ett misslyckat anrop räknas som anrop och fel, utan tokens', () => {
  app.bok(bok('s1', {}));
  app.bok(bok('s1', { 'okänd': { anrop: 1, fel: 1, in: 0, ut: 0 } }, { fel: 1, utan: 1, ute: 2 }));
  const k = app.summa().kostnad;
  assert.equal(k.telefon.anrop, 1); assert.equal(k.telefon.fel, 1); assert.equal(k.telefon.utan, 1); assert.equal(k.ute, 2, 'frågor på väg ur senaste boken');
  assert.equal(k.totalt.usd, null); assert.deepEqual(k.totalt.okandPris, ['okänd']);
});
prov('A9 gammal telefon utan bok: avstämningen som förut, och rutan säger att boken saknas', () => {
  stam([klar(1, 'Forest', { sen: 10, ...PORT }), klar(2, 'Ukud Cobra', { sen: 10, ...LANGT })]);
  assert.equal(app.kort.length, 2);
  const m = app.summa();
  assert.equal(m.kort, 2); assert.equal(m.lokal.n, 2); assert.equal(m.lokal.medianMs, null, 'ingen lokalMs'); assert.equal(m.kostnad.ingenBok, true);
  assert.equal(m.kostnad.totalt.anrop, 0);
});
prov('A10 ett kort som tas bort från bordet räknas ändå — och räknas inte om när det kommer igen', () => {
  stam([klar(1, 'Forest', { sen: 10, lokalMs: 200, ...PORT })]);
  app.kort.pop();
  stam([]); klocka.t += 4000; stam([]);
  assert.equal(app.kort.length, 0); assert.equal(app.summa().kort, 1);
  /* Samma spår igen, lyft och lagt tillbaka: nytt kort, ny cid → ett kort till (kameran hittade två gånger). Ett nedtonat som binds om räknas inte om. */
  app.kort.push({ cid: 'x', name: 'Forest', flipped: 0, lyft: 1 });
  stam([klar(5, 'Forest', { sen: 10, lokalMs: 150, ...PORT })]);
  assert.equal(app.kort[0].spar, 5);
  const m = app.summa(); assert.equal(m.kort, 2); assert.equal(m.lokal.medianMs, 175);
  stam([klar(5, 'Forest', { sen: 10, lokalMs: 150, ...PORT })]);
  assert.equal(app.summa().kort, 2, 'bundet igen: inget nytt');
});
prov('A11 ifyllt för hand: skapat på datorn (applyPick), spåret blir klart med domskälet hand', () => {
  app.kort.push({ cid: 'q1', name: 'Blixtpil', flipped: 0, spar: 4 });   // granskningen skapade kortet med spåret
  stam([{ id: 4, tillstand: 'okand', namn: null, sen: 10, ...PORT }]);
  assert.equal(app.summa().kort, 0, 'okänt: inte räknat än');
  stam([klar(4, 'Blixtpil', { sen: 10, lokalMs: 700, varfor: 'hand', ...PORT })]);
  const m = app.summa();
  assert.equal(m.kort, 1); assert.equal(m.hand.n, 1); assert.equal(m.lokal.n, 0); assert.equal(m.medianMs, null, 'handen har ingen tid');
});
prov('A11b ännu utan namn: okända spår som inte blivit kort räknas som hittade', () => {
  stam([klar(1, 'Forest', { sen: 10, lokalMs: 100, ...PORT }), { id: 2, tillstand: 'okand', cands: [{ name: 'Plains' }], sen: 10, ...LANGT }]);
  const m = app.summa();
  assert.equal(m.kort, 1); assert.equal(m.okanda, 1); assert.equal(m.hittade, 2);
});
prov('A12 passet överlever en omladdning av datorn: sparat per spel, laddat vid nästa bord, glömt vid avslut', () => {
  app.starta();
  stam([klar(1, 'Forest', { sen: 10, lokalMs: 100, ...PORT })]);
  app.bok(bok('s1', {})); app.bok(bok('s1', { [OPUS]: { anrop: 1, fel: 0, in: 812, ut: 90 } }));
  assert.ok(app.ls.has('sthv.autosum.v1.spel1'));
  app.pass = null;                                   // omladdning: minnet borta, localStorage kvar
  stam([klar(1, 'Forest', { sen: 10, lokalMs: 100, ...PORT }), klar(2, 'Plains', { sen: 10, lokalMs: 300, ...LANGT })]);
  let m = app.summa();
  assert.equal(m.kort, 2, 'kortet från före omladdningen är kvar'); assert.equal(m.kostnad.telefon.anrop, 1, 'boken också');
  const slut = app.avsluta();
  assert.equal(slut.kort, 2); assert.ok(nara(slut.kostnad.totalt.usd, 0.00631)); assert.ok(!app.ls.has('sthv.autosum.v1.spel1'), 'glömt');
  assert.equal(app.avsluta(), null, 'stängt två gånger: inget pass');
  /* Nästa bord efter avslutet startar ett nytt pass — inte det gamla. */
  stam([klar(3, 'Swamp', { sen: 10, lokalMs: 50, ...PORT })]);
  assert.equal(app.summa().kort, 1);
});
prov('A13 datorns egna anrop medan auto är på räknas i en egen bok, med serverns modell', () => {
  stam([klar(1, 'Forest', { sen: 10, lokalMs: 100, ...PORT })]);
  app.dator(OPUS, { input_tokens: 812, output_tokens: 90 }, false);
  app.dator(null, null, true);
  const k = app.summa().kostnad;
  assert.equal(k.dator.anrop, 2); assert.equal(k.dator.fel, 1); assert.equal(k.dator.utan, 1); assert.ok(nara(k.dator.per[OPUS].usd, 0.00631));
  assert.equal(k.totalt.anrop, 2); assert.ok(nara(k.totalt.usd, 0.00631)); assert.deepEqual(k.totalt.okandPris, ['unknown']);
});

/* ── framkallningen (MES-344): det oframkallade kortet ersätter platshållaren (MES-42) ── */
/* Ett kort som ligger still på bordet utan namn: kortlikt, vilar, inte skymt. */
const ovila = (id, rest) => Object.assign({ id, tillstand: 'ny', kortlik: true, vilar: true, sen: 0 }, PORT, rest);
const ofrSlag = () => app.ofr.map(p => `${p.spar}${p.pend ? '#' : ''}${p.overTak ? '+' + p.namn : ''}`);
const FOTO = 'data:image/jpeg;base64,AAAA';
prov('O1 namnet dröjer: inget syns före 0,5 s, sedan ett oframkallat kort — på millisekunden, utan ny rapport', () => {
  const t0 = klocka.t;
  stam([ovila(1)]);
  assert.deepEqual(ofrSlag(), []);
  klocka.t = t0 + 400; stam([ovila(1)]);
  assert.deepEqual(ofrSlag(), [], 'för tidigt');
  tid(t0 + 700);                                            // telefonen tyst: timern lägger ned det
  assert.deepEqual(ofrSlag(), ['1']);
  assert.equal(app.ofr[0].lagd, t0 + 500, 'lades ned 0,5 s efter släppet');
  assert.equal(app.kort.length, 0); assert.equal(app.pending.length, 0);
  assert.equal(app.ofr[0].namn, null, 'aldrig ett namn');
});
prov('O1b släppet är när kortet först ligger still: ett kort som bärs i en sekund får sitt halva sekund därifrån', () => {
  const t0 = klocka.t;
  for (let t = t0; t <= t0 + 1000; t += 200) { klocka.t = t; stam([ovila(1, { vilar: false })]); }
  klocka.t = t0 + 1100; stam([ovila(1)]);                    // läggs ned
  tid(t0 + 1500);
  assert.deepEqual(ofrSlag(), [], 'räknat från när spåret sågs');
  tid(t0 + 1700);
  assert.deepEqual(ofrSlag(), ['1']); assert.equal(app.ofr[0].vila, t0 + 1100);
});
prov('O2 namnet kommer: kortet skapas och tar över det oframkallade kortets element (ofrFran); posten går', () => {
  stam([ovila(1)]);
  tid(klocka.t + 600);
  assert.deepEqual(ofrSlag(), ['1']);
  stam([klar(1, 'Swamp', { kortlik: true, vilar: true, sen: 0, ...PORT })]);
  assert.equal(app.kort.length, 1); assert.deepEqual(ofrSlag(), []);
  assert.equal(app.kort[0].ofrFran && app.kort[0].ofrFran.nyckel, 'o:1');
});
prov('O3 namnet i tid (före 0,5 s): kortet direkt, aldrig något oframkallat', () => {
  const t0 = klocka.t;
  stam([ovila(1)]);
  klocka.t = t0 + 300; stam([klar(1, 'Swamp', { kortlik: true, vilar: true, sen: 0, ...PORT })]);
  tid(t0 + 2000);
  assert.equal(app.kort.length, 1); assert.deepEqual(ofrSlag(), []); assert.ok(!app.kort[0].ofrFran);
});
prov('O4 en hand, något som rör sig eller ligger skymt ger aldrig ett oframkallat kort', () => {
  const t0 = klocka.t;
  stam([{ id: 1, tillstand: 'ny', sen: 0, ...PORT }, ovila(2, { vilar: false, ...LANGT }), ovila(3, { skymd: true, ...box(0.1, 0.6, 0.063, 0.088) })]);
  for (let t = t0 + 300; t <= t0 + 3000; t += 300) { klocka.t = t; stam([{ id: 1, tillstand: 'ny', sen: 0, ...PORT }, ovila(2, { vilar: false, ...LANGT }), ovila(3, { skymd: true, ...box(0.1, 0.6, 0.063, 0.088) })]); }
  assert.deepEqual(ofrSlag(), []);
});
prov('O5 osäkert i granskningen: oframkallat med posten, utan förslaget; frågar Claude: oframkallat utan post', () => {
  stam([ovila(1, { tillstand: 'okand', provas: true, gissning: 'Plains', cands: [{ name: 'Plains', score: 0.4 }] })]);
  tid(klocka.t + 600);
  assert.deepEqual(ofrSlag(), ['1']); assert.equal(app.ofr[0].namn, null, 'gissningen syns inte');
  stam([ovila(1, { tillstand: 'okand', cands: [{ name: 'Swamp', score: 0.4 }] })]);
  assert.equal(app.pending.length, 1);
  assert.deepEqual(ofrSlag(), ['1#']); assert.equal(app.ofr[0].pend, app.pending[0].id); assert.equal(app.ofr[0].namn, null, 'förslaget syns inte');
  // svaret i sökrutan (granskningens väg): kortet skapas på spåret, posten går vid nästa bord
  app.namnge(app.pending[0], 'Swamp');
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].name, 'Swamp');
  stam([klar(1, 'Swamp', { kortlik: true, vilar: true, sen: 0, ...PORT })]);
  assert.equal(app.kort.length, 1); assert.deepEqual(ofrSlag(), []);
});
prov('O6 spåret föds om på samma plats: samma oframkallade kort; dör det utan att födas om går det efter nåden', () => {
  stam([ovila(1)]);
  tid(klocka.t + 600);
  const id = app.ofr[0].id;
  stam([]);                                                  // spåret dör
  assert.deepEqual(ofrSlag(), ['1'], 'står kvar i nåden');
  klocka.t += 300; stam([ovila(5)]);                          // föds om på samma plats
  assert.equal(app.ofr.length, 1); assert.equal(app.ofr[0].id, id); assert.equal(app.ofr[0].spar, 5);
  stam([]);
  tid(klocka.t + 1500);
  assert.deepEqual(ofrSlag(), [], 'borta efter nåden');
});
prov('O7 ett kort i väntan bärs till spåret (MES-341): inget oframkallat kort blinkar förbi på den nya platsen', () => {
  stam([klar(1, 'Mirran Bardiche', { sen: 10, ...PORT })]);
  klocka.t += 200; stam([]);                                 // lyfts
  const t0 = klocka.t + 300;
  klocka.t = t0; stam([ovila(2, LANGT)]);                      // läggs ned på en ny plats, oläst
  tid(t0 + 600);
  assert.deepEqual(ofrSlag(), [], 'oframkallat medan flytten avgörs');
  klocka.t = t0 + 650; stam([ovila(2, { tillstand: 'stilla', ...LANGT })]);   // telefonen bestämmer sig för att läsa: kortet bärs dit
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].spar, 2);
  tid(t0 + 2000);
  assert.deepEqual(ofrSlag(), []);
});
prov('O8 ett exemplar för mycket: oframkallat med frågan, och det säkra namnet', () => {
  app.lek = new Map([['Sol Ring', 1]]);
  stam([klar(1, 'Sol Ring', { sen: 20, ...PORT })]);
  stam([klar(1, 'Sol Ring', { sen: 20, ...PORT }), klar(2, 'Sol Ring', { kortlik: true, vilar: true, sen: 20, ...LANGT })]);
  tid(klocka.t + 600);
  assert.deepEqual(ofrSlag(), ['2#+Sol Ring']);
});
prov('O9 kamerans foto: följer med det oframkallade kortet, och med kortet som tar över', () => {
  app.ofrFoto(1, FOTO);
  stam([ovila(1)]);
  tid(klocka.t + 600);
  assert.equal(app.ofr[0].foto, FOTO);
  stam([klar(1, 'Swamp', { kortlik: true, vilar: true, sen: 0, ...PORT })]);
  assert.equal(app.kort[0].ofrFran.foto, FOTO);
});
prov('O10 ett nedvänt kort och ett spår som tagits bort får inget oframkallat kort', () => {
  app.borttagna.add(2);
  stam([ovila(1, { ned: true }), ovila(2, LANGT)]);
  tid(klocka.t + 1000);
  assert.deepEqual(ofrSlag(), []);
});
prov('O12 spelaren säger "inte ett kort" (eller hoppar över det): det oframkallade kortet går', () => {
  stam([ovila(1, { tillstand: 'okand', cands: [{ name: 'Swamp', score: 0.4 }] })]);
  tid(klocka.t + 600);
  assert.deepEqual(ofrSlag(), ['1#']);
  app.borttagna.add(1); app.pending.length = 0;
  stam([ovila(1, { tillstand: 'okand', cands: [{ name: 'Swamp', score: 0.4 }] })]);
  assert.deepEqual(ofrSlag(), []);
});
prov('O13 (granskningen F4) ett spår som föds om där ett kort i väntan ligger (högen tappas): inget oframkallat kort ovanpå kortet', () => {
  stam([klar(1, 'Swamp', { sen: 0, ...PORT })]);
  const a = app.kort[0];
  klocka.t += 150; stam([]);                                   // spåret dog (tap i högen)
  klocka.t += 300; stam([ovila(2)]);                           // föds om på samma plats: ny, kortlik, vilar
  tid(klocka.t + 600);
  assert.deepEqual(ofrSlag(), [], 'ett oframkallat kort ritas över kortet som ligger kvar');
  klocka.t += 150; stam([ovila(2, { tillstand: 'stilla' })]);  // telefonen bestämmer sig för att läsa: kortet binds
  assert.equal(a.spar, 2); assert.deepEqual(ofrSlag(), []);
  // ett nytt kort bredvid (inte över kortet i väntan) får sitt oframkallade kort som vanligt
  stam([ovila(2, { tillstand: 'stilla' }), ovila(3, LANGT)]);
  tid(klocka.t + 600);
  assert.deepEqual(ofrSlag(), ['3']);
});
prov('O14 (kontrollen, G2) ett ANNAT kort läggs där ett kort i väntan ligger och är oläsbart: när läsningen säger ett annat namn får det sitt oframkallade kort', () => {
  stam([klar(1, 'Swamp', { sen: 0, ...PORT })]);
  klocka.t += 150; stam([]);                                   // Swampen lyfts
  klocka.t += 300; stam([ovila(2)]);                           // något läggs ned på samma plats, oläst
  tid(klocka.t + 600);
  assert.deepEqual(ofrSlag(), [], 'oläst: det kan vara Swampen sedd igen');
  klocka.t += 150; stam([ovila(2, { tillstand: 'okand', gissning: 'Forest', cands: [{ name: 'Forest', score: 0.4 }] })]);   // läst: inte Swampen
  tid(klocka.t + 100);
  assert.deepEqual(ofrSlag(), ['2#'], 'ett annat kort som aldrig fick namn ska ha "Name this card" på mattan');
});
prov('O15 läsningen gissar kortet i väntans namn: det är kortet sett igen, inget oframkallat kort', () => {
  app.spelsatt = 'skarm';                                     // Screen leads: ingen flytt binder, så bara regeln avgör
  stam([klar(1, 'Swamp', { sen: 0, ...PORT })]);
  klocka.t += 150; stam([]);
  klocka.t += 300; stam([ovila(2)]);
  tid(klocka.t + 600);
  klocka.t += 150; stam([ovila(2, { tillstand: 'okand', gissning: 'Swamp', cands: [{ name: 'Swamp', score: 0.4 }] })]);
  tid(klocka.t + 100);
  assert.deepEqual(ofrSlag(), []);
});
/* MES-346: korten i en landhög. Telefonens under (MES-331) säger vilka spår som ligger ÖVER ett spår; ett spår som
   setts ligga över ett annat är ett annat kort. Högen: ett Plains (PORT), och kort ovanpå förskjutna en bit nedåt. */
const OVANPA = box(PORT.x, PORT.y + 0.02, 0.063, 0.088);
prov('O16 (MES-346) ett nytt land läggs på en hög: landet under täcks och dess spår dör, men det nya syns — oframkallat, också när läsningen gissar samma namn', () => {
  stam([klar(1, 'Plains', { sen: 0, ...PORT })]);
  const a = app.kort[0];
  klocka.t += 150; stam([klar(1, 'Plains', { sen: 0, under: [2], ...PORT }), ovila(2, { vilar: false, ...OVANPA })]);   // handen lägger det nya ovanpå
  klocka.t += 150; stam([klar(1, 'Plains', { sen: 0, under: [2], ...PORT }), ovila(2, OVANPA)]);                        // det nya ligger still; telefonen ser det över det gamla
  klocka.t += 150; stam([ovila(2, OVANPA)]);                                                                           // det gamla täcks helt: spåret dör, kortet väntar
  tid(klocka.t + 600);
  assert.deepEqual(ofrSlag(), ['2'], 'ett nytt land på en hög ska synas oframkallat');
  assert.equal(a.spar, 1, 'kortet under binds inte till det nya spåret');
  klocka.t += 150; stam([ovila(2, { tillstand: 'okand', gissning: 'Plains', cands: [{ name: 'Plains', score: 0.4 }], ...OVANPA })]);   // läst: osäkert Plains, som landet under
  tid(klocka.t + 100);
  assert.deepEqual(ofrSlag(), ['2#'], 'samma namn som landet under gör det inte till samma kort');
});
prov('O17 (MES-346) samma hög, men utan att telefonen sett det nya spåret över det gamla: kortet sett igen (som O13), inget oframkallat kort', () => {
  stam([klar(1, 'Plains', { sen: 0, ...PORT })]);
  klocka.t += 150; stam([klar(1, 'Plains', { sen: 0, ...PORT }), ovila(2, OVANPA)]);   // syns samtidigt, men ingen relation: okänt
  klocka.t += 150; stam([ovila(2, OVANPA)]);
  tid(klocka.t + 600);
  assert.deepEqual(ofrSlag(), []);
});
prov('O18 (MES-346) det bakre kortet i en hög: dess spår dör och föds om medan det främre ligger kvar — det oframkallade kortet följer med, i stället för att gå för att det främre "ligger där"', () => {
  stam([klar(1, 'Plains', { sen: 0, ...OVANPA }), ovila(3, { under: [1], ...PORT })]);   // främre Plains (1) över det bakre, olästa (3)
  tid(klocka.t + 600);
  assert.deepEqual(ofrSlag(), ['3']);
  const id = app.ofr[0].id;
  klocka.t += 150; stam([klar(1, 'Plains', { sen: 0, ...OVANPA })]);                    // det bakres spår dör (bara titelraden syns, detektorn tappar den)
  assert.deepEqual(ofrSlag(), ['3'], 'det främre kortet är grannen, inte det bakre');
  klocka.t += 300; stam([klar(1, 'Plains', { sen: 0, ...OVANPA }), ovila(4, { under: [1], ...PORT })]);   // föds om på samma plats
  assert.equal(app.ofr.length, 1); assert.equal(app.ofr[0].id, id); assert.equal(app.ofr[0].spar, 4);
  // dör det och inget föds om går det efter nåden, som förut
  klocka.t += 150; stam([klar(1, 'Plains', { sen: 0, ...OVANPA })]);
  tid(klocka.t + 1500);
  assert.deepEqual(ofrSlag(), []);
});
prov('O19 (MES-346) en tappad hög med två kort: spåren föds om, och det nya främre syns över det gamla bakre — inget oframkallat kort på någon av dem', () => {
  const BAK = PORT, FRAM = OVANPA;
  stam([klar(1, 'Swamp', { sen: 0, under: [2], ...BAK }), klar(2, 'Swamp', { sen: 0, ...FRAM })]);
  const [b, f] = app.kort;
  klocka.t += 150; stam([klar(1, 'Swamp', { sen: 0, ...BAK })]);                                            // det främres spår dör (vrids)
  klocka.t += 150; stam([klar(1, 'Swamp', { sen: 0, under: [12], ...BAK }), ovila(12, FRAM)]);              // föds om: telefonen ser det över det bakre
  klocka.t += 150; stam([ovila(12, FRAM)]);                                                                 // det bakres spår dör
  klocka.t += 150; stam([ovila(12, FRAM), ovila(11, BAK)]);                                                 // och föds om
  tid(klocka.t + 600);
  assert.deepEqual(ofrSlag(), [], 'ett oframkallat kort ovanpå en hög som bara tappats');
  assert.ok(app.kort.includes(b) && app.kort.includes(f));
});
prov('O20 (MES-346, granskningen T4) det nya landet läses snabbt som osäkert Plains: landet under ligger kvar under det, utan gissad flytt (passar i steg 3b, och motsager i steg 5 som ångrar i samma avstämning)', () => {
  stam([klar(1, 'Plains', { sen: 0, ...PORT })]);
  const a = app.kort[0];
  klocka.t += 150; stam([klar(1, 'Plains', { sen: 0, under: [2], ...PORT }), ovila(2, { vilar: false, ...OVANPA })]);
  klocka.t += 150; stam([klar(1, 'Plains', { sen: 0, under: [2], ...PORT }), ovila(2, OVANPA)]);
  klocka.t += 150; stam([ovila(2, { tillstand: 'stilla', ...OVANPA })]);
  klocka.t += 150; stam([ovila(2, { tillstand: 'okand', gissning: 'Plains', cands: [{ name: 'Plains', score: 0.4 }], ...OVANPA })]);
  assert.equal(a.spar, 1, 'landet under bars till det nya landet'); assert.ok(!a.flyttFran);
});
prov('O21 (MES-346) en gissad flytt ångras när telefonen ser det nya spåret ligga över kortets gamla (motsager)', () => {
  stam([klar(1, 'Mirran Bardiche', { sen: 10, ...PORT })]);
  const a = app.kort[0];
  klocka.t += 200; stam([]);                                                       // lyfts
  klocka.t += 300; stam([ovila(2, { tillstand: 'stilla', ...OVANPA })]);           // något läggs ned bredvid: flytten gissas
  assert.equal(a.spar, 2); assert.ok(!!a.flyttFran);
  klocka.t += 150; stam([{ id: 1, tillstand: 'ny', kortlik: true, vilar: true, sen: 0, under: [2], ...PORT }, ovila(2, { tillstand: 'okand', ...OVANPA })]);   // det gamla spåret syns igen, med det nya över sig
  assert.equal(a.spar, 1, 'kortet ligger kvar under det nya — flytten var fel'); assert.ok(!a.flyttFran);
});
prov('O22 (MES-346, granskningen T2) två lådor på SAMMA kort: en låda inne i kortets egen räknas inte som ett kort ovanpå — inget oframkallat kort när kortets spår dör', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const DEL = box(PORT.x, PORT.y + 0.03, 0.063, 0.058);                             // en bit av samma kort
  klocka.t += 150; stam([klar(1, 'Ukud Cobra', { sen: 0, under: [5], ...PORT }), ovila(5, DEL)]);
  klocka.t += 150; stam([klar(1, 'Ukud Cobra', { sen: 0, under: [5], ...PORT }), ovila(5, DEL)]);
  klocka.t += 150; stam([ovila(5, PORT)]);                                          // huvudspåret dör, dubbletten är kortet
  tid(klocka.t + 600);
  assert.deepEqual(ofrSlag(), [], 'ett oframkallat kort ovanpå kortet');
});
prov('O11 namnet kommer på ett spår som fötts om bredvid: kortet tar över, ingen post blir kvar bredvid', () => {
  stam([ovila(1)]);
  tid(klocka.t + 600);
  stam([klar(7, 'Swamp', { kortlik: true, vilar: true, sen: 0, ...box(0.405, 0.405, 0.063, 0.088) })]);   // spår 1 dog, 7 föddes på platsen med namn
  assert.equal(app.kort.length, 1); assert.deepEqual(ofrSlag(), []);
  assert.equal(app.kort[0].ofrFran && app.kort[0].ofrFran.nyckel, 'o:1');
});

prov('K7 ett osäkert spår med telefonens lågt vägda namn: notisen skriver det som en gissning, aldrig som kortets namn', () => {
  stam([{ id: 1, tillstand: 'okand', namn: 'Forest', saker: false, cands: [{ name: 'Forest', sid: 's', score: 0.35 }], sen: 10, ...PORT }]);
  assert.equal(app.remsa().not, 'The card you put down (Forest?) went to the review');
  // ett säkert namn på ett klart spår ger ingen notis alls — kortet syns på bordet
  stam([klar(2, 'Swamp', { sen: 10, ...LANGT })]);
  assert.equal(app.remsa().not, null);
});

/* MODE-4: kantstyrd tap-synk. Kameran skriver tapped bara när dess egen dom
   ändras, så en digital rättning står sig över hjärtslagen. E = kant. */
prov('E1 digital untap överlever tre hjärtslag med samma bord', () => {
  stam([klar(1, 'Ukud Cobra', { tappad: true, sen: 20, ...LAND_ })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].tapped, 1); assert.equal(app.kort[0].kamTap, 1);
  app.kort[0].tapped = 0;                                   // rättad på skärmen
  for (let i = 0; i < 3; i++) { klocka.t += 3000; stam([klar(1, 'Ukud Cobra', { tappad: true, sen: 20, ...LAND_ })]); }
  assert.equal(app.kort[0].tapped, 0, 'hjärtslaget skrev över rättningen');
});
prov('E2 efter rättningen följer kortet nästa fysiska vridning igen', () => {
  stam([klar(1, 'Ukud Cobra', { tappad: true, sen: 20, ...LAND_ })]);
  app.kort[0].tapped = 0;
  stam([klar(1, 'Ukud Cobra', { tappad: false, sen: 20, ...PORT })]);   // fysiskt otappat: domen byter, redan otappat
  assert.equal(app.kort[0].tapped, 0); assert.equal(app.kort[0].kamTap, 0);
  stam([klar(1, 'Ukud Cobra', { tappad: true, sen: 20, ...LAND_ })]);    // tappas igen fysiskt: följer
  assert.equal(app.kort[0].tapped, 1);
  stam([klar(1, 'Ukud Cobra', { tappad: false, sen: 20, ...PORT })]);
  assert.equal(app.kort[0].tapped, 0);
});
prov('E3 Screen leads: domen följs men tapped skrivs aldrig', () => {
  app.spelsatt = 'skarm';
  stam([klar(1, 'Ukud Cobra', { tappad: false, sen: 20, ...PORT })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].tapped, 0);
  stam([klar(1, 'Ukud Cobra', { tappad: true, sen: 20, ...LAND_ })]);
  assert.equal(app.kort[0].tapped, 0, 'skarm skrev tapped'); assert.equal(app.kort[0].kamTap, 1);
  app.kort[0].tapped = 1;                                   // tappad på skärmen
  stam([klar(1, 'Ukud Cobra', { tappad: false, sen: 20, ...PORT })]);
  assert.equal(app.kort[0].tapped, 1, 'skarm avtappade');
});
prov('E4 ombindning till ett nytt spår med samma dom skriver inte; nästa vridning gör det', () => {
  stam([klar(1, 'Ukud Cobra', { tappad: false, sen: 20, ...PORT })]);
  app.kort[0].tapped = 1;                                   // tappad på skärmen
  stam([klar(7, 'Ukud Cobra', { tappad: false, sen: 10, ...LANGT })]);   // spåret dog, ett nytt på annan plats binder om
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].spar, 7);
  assert.equal(app.kort[0].tapped, 1, 'ombindningen skrev över rättningen'); assert.equal(app.kort[0].kamTap, 0);
  stam([klar(7, 'Ukud Cobra', { tappad: true, sen: 10, ...box(0.8, 0.1 + 0.088 - 0.063, 0.088, 0.063) })]);
  assert.equal(app.kort[0].tapped, 1);
  stam([klar(7, 'Ukud Cobra', { tappad: false, sen: 10, ...LANGT })]);
  assert.equal(app.kort[0].tapped, 0, 'följer inte den fysiska vridningen efter ombindningen');
});
prov('E5 första domen tas alltid: ett kort fött före grundläget, och ett lagt till för hand', () => {
  app.grund = null;                                          // inget grundläge: kortet föds otappat, utan dom
  stam([klar(1, 'Ukud Cobra', { tappad: true, sen: 20, ...LAND_ })]);
  assert.equal(app.kort[0].tapped, 0); assert.equal(app.kort[0].kamTap, undefined);
  app.grund = 20;                                            // grundläget sparat: första domen tas
  stam([klar(1, 'Ukud Cobra', { tappad: true, sen: 20, ...LAND_ })]);
  assert.equal(app.kort[0].tapped, 1); assert.equal(app.kort[0].kamTap, 1);
  // ett kort lagt till för hand som kameran binder: bordet är sanningen — första domen tas
  app.nollstall(); klocka.t = 1e6;
  app.kort.push({ cid: 'hand1', name: 'Ukud Cobra', flipped: 0, tapped: 0 });
  stam([klar(1, 'Ukud Cobra', { tappad: true, sen: 20, ...LAND_ })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].spar, 1);
  assert.equal(app.kort[0].tapped, 1); assert.equal(app.kort[0].kamTap, 1);
  app.kort[0].tapped = 0;                                    // rättad: står sig
  stam([klar(1, 'Ukud Cobra', { tappad: true, sen: 20, ...LAND_ })]);
  assert.equal(app.kort[0].tapped, 0);
});

/* D5-8 (Q = antalspriorn). Leken har N av kortet: det N+1:e blir en fråga på
   platsen (pending med overTak), aldrig ett kort och aldrig ett stopp. */
prov('Q1 utan lek: två Sol Ring blir två kort, som förut', () => {
  stam([klar(1, 'Sol Ring', { sen: 20, ...PORT }), klar(2, 'Sol Ring', { sen: 20, ...LANGT })]);
  assert.equal(app.kort.length, 2); assert.equal(app.pending.length, 0);
});
prov('Q2 leken har 1 Sol Ring: det andra spåret blir en fråga, inte ett kort; frågan ställs en gång', () => {
  app.lek = new Map([['Sol Ring', 1]]);
  stam([klar(1, 'Sol Ring', { sen: 20, ...PORT })]);
  assert.equal(app.kort.length, 1);
  stam([klar(1, 'Sol Ring', { sen: 20, ...PORT }), klar(2, 'Sol Ring', { sen: 20, ...LANGT })]);
  assert.equal(app.kort.length, 1, 'ett kort till skapades');
  assert.equal(app.pending.length, 1); assert.equal(app.pending[0].spar, 2); assert.equal(app.pending[0].overTak, true); assert.equal(app.pending[0].tak, 1);
  assert.ok(app.pending[0].overTak);
  klocka.t += 3000;
  stam([klar(1, 'Sol Ring', { sen: 20, ...PORT }), klar(2, 'Sol Ring', { sen: 20, ...LANGT })]);
  assert.equal(app.pending.length, 1, 'dubblett av frågan'); assert.equal(app.kort.length, 1);
  stam([klar(1, 'Sol Ring', { sen: 20, ...PORT })]);       // spåret dör: frågan försvinner
  assert.equal(app.pending.length, 0); assert.equal(app.kort.length, 1);
});
/* QB1–QB4: ett basland med egen namnremsa (rl) som ligger skild från kortet på bordets (skildaRemsor) är
   ett kort till, också över lekens antal — Jespers bord 2026-10-10: Island lagt över Island, leken har ett.
   Remsa som täcker kortets egen, syntetisk remsa eller ett annat kort än basland: frågan som förut. */
const OVER = box(0.42, 0.415, 0.063, 0.088);
const RL_A = box(0.403, 0.403, 0.057, 0.008), RL_B = box(0.423, 0.418, 0.057, 0.008), RL_PA_A = box(0.404, 0.404, 0.056, 0.008);
prov('QB1 leken har 1 Island: ett Island över det första, med egen skild remsa, blir ett kort till utan fråga', () => {
  app.lek = new Map([['Island', 1]]);
  stam([klar(1, 'Island', { sen: 20, ...PORT, rl: RL_A })]);
  stam([klar(1, 'Island', { sen: 20, ...PORT, rl: RL_A }), klar(2, 'Island', { sen: 20, ...OVER, rl: RL_B })]);
  assert.equal(app.pending.length, 0, 'frågan ställdes'); assert.equal(app.kort.length, 2);
  assert.deepEqual(app.kort.map(k => k.spar).sort(), [1, 2]);
});
prov('QB1c samma, och telefonen ser det nya ligga över det undre (under): ingen väntan — ett kort till direkt', () => {
  app.lek = new Map([['Island', 1]]);
  stam([klar(1, 'Island', { sen: 20, ...PORT, rl: RL_A })]);
  stam([klar(1, 'Island', { sen: 20, ...PORT, rl: RL_A, skymd: true, under: [2] }), klar(2, 'Island', { sen: 20, ...OVER, rl: RL_B })]);
  assert.equal(app.pending.length, 0, 'frågan ställdes'); assert.equal(app.kort.length, 2, 'väntade');
});
prov('QB1d utan lek: Island på Island med under väntar inte heller', () => {
  stam([klar(1, 'Island', { sen: 20, ...PORT, rl: RL_A })]);
  stam([klar(1, 'Island', { sen: 20, ...PORT, rl: RL_A, skymd: true, under: [2] }), klar(2, 'Island', { sen: 20, ...OVER, rl: RL_B })]);
  assert.equal(app.kort.length, 2, 'väntade');
});
prov('QB1b samma, med det undre kortets spår skymt av det övre: dubbletten väntar (DUBBLETT_VANTA), sedan ett kort till', () => {
  app.lek = new Map([['Island', 1]]);
  stam([klar(1, 'Island', { sen: 20, ...PORT, rl: RL_A })]);
  stam([klar(1, 'Island', { sen: 20, ...PORT, rl: RL_A, skymd: true }), klar(2, 'Island', { sen: 20, ...OVER, rl: RL_B })]);
  klocka.t += 3100;
  stam([klar(1, 'Island', { sen: 20, ...PORT, rl: RL_A, skymd: true }), klar(2, 'Island', { sen: 20, ...OVER, rl: RL_B })]);
  assert.equal(app.pending.length, 0, 'frågan ställdes'); assert.equal(app.kort.length, 2);
});
prov('QB2 leken har 1 Island: ett andra spår vars remsa täcker kortets egen blir frågan, inte ett kort', () => {
  app.lek = new Map([['Island', 1]]);
  stam([klar(1, 'Island', { sen: 20, ...PORT, rl: RL_A })]);
  stam([klar(1, 'Island', { sen: 20, ...PORT, rl: RL_A }), klar(2, 'Island', { sen: 20, ...LANGT, rl: Object.assign({}, RL_PA_A) }), ]);
  assert.equal(app.kort.length, 1, 'ett kort till skapades'); assert.equal(app.pending.length, 1); assert.ok(app.pending[0].overTak);
});
prov('QB3 leken har 1 Island: syntetisk remsa eller ingen remsa ger frågan som förut', () => {
  app.lek = new Map([['Island', 1]]);
  stam([klar(1, 'Island', { sen: 20, ...PORT, rl: RL_A })]);
  stam([klar(1, 'Island', { sen: 20, ...PORT, rl: RL_A }), klar(2, 'Island', { sen: 20, ...LANGT, rl: box(0.803, 0.103, 0.057, 0.008), rsynt: 1 })]);
  assert.equal(app.kort.length, 1); assert.equal(app.pending.length, 1); assert.ok(app.pending[0].overTak);
  app.nollstall(); app.lek = new Map([['Island', 1]]);
  stam([klar(1, 'Island', { sen: 20, ...PORT, rl: RL_A })]);
  stam([klar(1, 'Island', { sen: 20, ...PORT, rl: RL_A }), klar(2, 'Island', { sen: 20, ...LANGT })]);
  assert.equal(app.kort.length, 1); assert.equal(app.pending.length, 1); assert.ok(app.pending[0].overTak);
});
prov('QB4 leken har 1 Sol Ring: egen skild remsa ändrar inget för annat än basland — frågan som förut', () => {
  app.lek = new Map([['Sol Ring', 1]]);
  stam([klar(1, 'Sol Ring', { sen: 20, ...PORT, rl: RL_A })]);
  stam([klar(1, 'Sol Ring', { sen: 20, ...PORT, rl: RL_A }), klar(2, 'Sol Ring', { sen: 20, ...LANGT, rl: box(0.803, 0.103, 0.057, 0.008) })]);
  assert.equal(app.kort.length, 1); assert.equal(app.pending.length, 1); assert.ok(app.pending[0].overTak);
});
prov('Q3 spåret dör och ett nytt föds på annan plats i samma bord: samma kort binder om, ingen fråga', () => {
  app.lek = new Map([['Sol Ring', 1]]);
  stam([klar(1, 'Sol Ring', { sen: 20, ...PORT })]);
  stam([klar(2, 'Sol Ring', { sen: 20, ...LANGT })]);
  assert.equal(app.kort.length, 1); assert.equal(app.pending.length, 0); assert.equal(app.kort[0].spar, 2);
});
prov('Q4 leken har 4 Forest: fyra kort, det femte en fråga', () => {
  app.lek = new Map([['Forest', 4]]);
  const b = i => box(0.1 + i * 0.15, 0.2, 0.063, 0.088);
  stam([1, 2, 3, 4].map(i => klar(i, 'Forest', { sen: 20, ...b(i) })));
  assert.equal(app.kort.length, 4);
  stam([1, 2, 3, 4, 5].map(i => klar(i, 'Forest', { sen: 20, ...b(i) })));
  assert.equal(app.kort.length, 4); assert.equal(app.pending.length, 1); assert.equal(app.pending[0].tak, 4);
});

/* MODE-3: policymatrisen. P = policy. */
prov('P1 Screen leads: spåret dör → bindningen släpps tyst, ingen nedtoning', () => {
  app.spelsatt = 'skarm';
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  assert.equal(app.kort.length, 1);
  stam([]); klocka.t += 3100; stam([]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].spar, undefined); assert.equal(app.kort[0].lyft, undefined); assert.equal(app.kort[0].borta, undefined);
});
prov('P2 Table leads: samma sak skickar kortet till handen', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  const k = app.kort[0];
  stam([]); klocka.t += 3100; stam([]);
  assert.ok(iHanden(k)); assert.equal(k.spar, undefined); assert.equal(k.borta, undefined);
});
prov('P3 fysisk: kortet flyttat till graveyard digitalt medan spåret lever — spåret föds om på ny plats: tyst ombindning i sin zon, inget nytt kort', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  app.kort[0].zon = 'grav'; app.kort[0].fysisk = true;     // som flyttaTill gör
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  assert.equal(app.kort.length, 1, 'spöke');
  stam([klar(7, 'Ukud Cobra', { sen: 10, ...LANGT })]);   // detektorn födde ett nytt spår
  assert.equal(app.kort.length, 1, 'spöke vid omfödsel'); assert.equal(app.kort[0].spar, 7); assert.equal(app.kort[0].zon, 'grav');
  // spåret dör för gott: flaggan släpps, ingen nedtoning (kortet är i graveyard)
  stam([]); klocka.t += 3100; stam([]);
  assert.equal(app.kort[0].fysisk, undefined); assert.equal(app.kort[0].lyft, undefined); assert.equal(app.kort[0].spar, undefined);
  // och ett nytt spår med namnet är nu ett nytt kort
  stam([klar(9, 'Ukud Cobra', { sen: 10, ...PORT })]);
  assert.equal(app.kort.length, 2);
});
prov('P5 besvärjelseregeln: ett instant som plockas upp inom 20 s går till graveyard i båda lägena; efter 20 s som vanligt', () => {
  app.typ = new Map([['Lightning Bolt', 'Instant'], ['Ukud Cobra', 'Creature — Snake']]);
  stam([klar(1, 'Lightning Bolt', { sen: 20, ...PORT }), klar(2, 'Ukud Cobra', { sen: 20, ...LANGT })]);
  klocka.t += 4000;
  stam([klar(2, 'Ukud Cobra', { sen: 20, ...LANGT })]); klocka.t += 3100; stam([klar(2, 'Ukud Cobra', { sen: 20, ...LANGT })]);
  const bolt = app.kort.find(k => k.name === 'Lightning Bolt');
  assert.equal(bolt.zon, 'grav'); assert.ok(bolt.spellAuto);
  // varelsen som plockas upp går till handen (bord)
  stam([]); klocka.t += 3100; stam([]);
  assert.ok(iHandenNamn('Ukud Cobra')); assert.equal(app.kort.filter(k => k.name === 'Ukud Cobra').length, 0);
  // efter 20 s: instantet är en permanent på bordet, inte en besvärjelse — det går till handen
  app.nollstall(); klocka.t = 1e6; app.typ = new Map([['Lightning Bolt', 'Instant']]);
  stam([klar(1, 'Lightning Bolt', { sen: 20, ...PORT })]);
  klocka.t += 25000; stam([klar(1, 'Lightning Bolt', { sen: 20, ...PORT })]);
  stam([]); klocka.t += 3100; stam([]);
  assert.equal(app.kort.length, 0); assert.ok(iHandenNamn('Lightning Bolt')); assert.equal(app.handRad[0].kort.zon, undefined);
  // Screen leads: samma regel, men en permanent släpps tyst
  app.nollstall(); klocka.t = 1e6; app.spelsatt = 'skarm'; app.typ = new Map([['Lightning Bolt', 'Instant']]);
  stam([klar(1, 'Lightning Bolt', { sen: 20, ...PORT })]);
  stam([]); klocka.t += 3100; stam([]);
  assert.equal(app.kort[0].zon, 'grav');
});
prov('P6 täckt: ett bifogat kort vars värd syns är inte borta när dess spår dör; värden som försvinner går till handen och utrustningen blir kvar', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT }), klar(2, 'Bonesplitter', { sen: 20, ...LANGT })]);
  const vard = app.kort.find(k => k.name === 'Ukud Cobra'), utr = app.kort.find(k => k.name === 'Bonesplitter');
  utr.attachedTo = vard.cid;
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]); klocka.t += 3100; stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  assert.equal(utr.spar, undefined); assert.ok(app.kort.includes(utr)); assert.equal(app.handRad.length, 0);
  stam([]); klocka.t += 3100; stam([]);
  assert.ok(iHanden(vard)); assert.deepEqual(app.kort.map(k => k.name), ['Bonesplitter'], 'utrustningen blir kvar');
});
prov('P7 kamerans läge: skrivs vid skapandet och vid en flytt större än darret, med ny stämpel', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  const k = app.kort[0];
  assert.ok(k.kam); assert.ok(Math.abs(k.kam.x - (PORT.x + PORT.w / 2)) < 1e-9); assert.equal(k.kam.nar, klocka.t);
  const nar0 = k.kam.nar; klocka.t += 3000;
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...box(PORT.x + 0.003, PORT.y, PORT.w, PORT.h) })]);   // darr
  assert.equal(k.kam.nar, nar0);
  klocka.t += 3000;
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...box(PORT.x + 0.03, PORT.y, PORT.w, PORT.h) })]);    // flytt
  assert.equal(k.kam.nar, klocka.t); assert.ok(Math.abs(k.kam.x - (PORT.x + 0.03 + PORT.w / 2)) < 1e-9);
  // ett spår i rörelse ('ny') skriver inget
  klocka.t += 3000;
  stam([{ id: 1, tillstand: 'ny', namn: 'Ukud Cobra', saker: true, tappad: false, sen: 20, ...box(PORT.x + 0.2, PORT.y, PORT.w, PORT.h) }]);
  assert.ok(Math.abs(k.kam.x - (PORT.x + 0.03 + PORT.w / 2)) < 1e-9);
});

prov('P8 kamerans läge läser telefonens viloläge (vx, vy), och ett läge på väg ankras om i vila (MES-214)', () => {
  // lådan i rapporten ligger 0,004 fel (en hand intill) — läget är vilolägets
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...box(PORT.x + 0.004, PORT.y, PORT.w, PORT.h), vx: PORT.x + PORT.w / 2, vy: PORT.y + PORT.h / 2, vilar: true })]);
  const k = app.kort[0];
  assert.ok(Math.abs(k.kam.x - (PORT.x + PORT.w / 2)) < 1e-9); assert.ok(!k.kam.prel);
  // kortet flyttas och följs: vilar false → läget skrivs som preliminärt
  klocka.t += 300;
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT, vx: PORT.x + 0.04 + PORT.w / 2, vy: PORT.y + PORT.h / 2, vilar: false })]);
  assert.ok(Math.abs(k.kam.x - (PORT.x + 0.04 + PORT.w / 2)) < 1e-9); assert.equal(k.kam.prel, 1);
  // …det landar 0,004 längre bort, långt under AUTO_FLYTT: ankras om ändå, med ny stämpel
  klocka.t += 300; const nar1 = k.kam.nar;
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT, vx: PORT.x + 0.044 + PORT.w / 2, vy: PORT.y + PORT.h / 2, vilar: true })]);
  assert.ok(Math.abs(k.kam.x - (PORT.x + 0.044 + PORT.w / 2)) < 1e-9); assert.ok(!k.kam.prel); assert.ok(k.kam.nar > nar1);
  // i vila: darr under AUTO_FLYTT skriver inget
  klocka.t += 3000; const nar2 = k.kam.nar;
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT, vx: PORT.x + 0.046 + PORT.w / 2, vy: PORT.y + PORT.h / 2, vilar: true })]);
  assert.equal(k.kam.nar, nar2);
});

/* K10/K11 (MES-85): högvakten. GR = graveyard. hog(n, sen) är telefonens
   högvakt i rapporten: n ändringar av högen, sen ms sedan den senaste. */
const stamG = (spar, grav) => app.avstamBord(spar, false, 'kort', undefined, undefined, grav);
const hog = (n, sen = 0) => ({ n, sen });
const MITT = box(0.1, 0.1, 0.063, 0.088);
prov('GR1 Table leads: kortet försvinner och högen ändras en sekund senare → graveyard utan fråga', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(0));
  klocka.t += 150; stamG([], hog(0));             // spåret dog: borta
  klocka.t += 1000; stamG([], hog(1));            // högen blev stilla med ett nytt kort
  klocka.t += 2100; stamG([], hog(1));            // nådatiden ute
  const k = app.kort[0];
  assert.equal(k.zon, 'grav'); assert.ok(k.gravAuto); assert.equal(k.lyft, undefined); assert.equal(k.spar, undefined);
});
prov('GR2 Screen leads: samma sak — ingenting, kortet ligger kvar', () => {
  app.spelsatt = 'skarm';
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(0));
  klocka.t += 150; stamG([], hog(0));
  klocka.t += 1000; stamG([], hog(1));
  klocka.t += 2100; stamG([], hog(1));
  assert.equal(app.kort[0].zon, undefined); assert.equal(app.kort[0].gravAuto, undefined); assert.equal(app.kort[0].lyft, undefined);
});
prov('GR3 högen ändras inte: kortet går till handen', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(0));
  const k = app.kort[0];
  klocka.t += 150; stamG([], hog(0)); klocka.t += 3100; stamG([], hog(0));
  assert.equal(k.zon, undefined); assert.ok(iHanden(k));
});
prov('GR3b en token vars spår dör när högen ändras upphör att finnas, och en aura-token på en värd som går dit likaså — en vanlig aura följer med (MES-105)', () => {
  app.typ = new Map([['Monster Role', 'Token Enchantment — Aura Role'], ['Pacifism', 'Enchantment — Aura'], ['Bonesplitter', 'Artifact — Equipment']]);
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT }), klar(2, 'Soldier', { sen: 20, ...LANGT })], hog(0));
  const ukud = app.kort.find(k => k.name === 'Ukud Cobra'), sold = app.kort.find(k => k.name === 'Soldier');
  sold.tok = 1;                                   // en token, som addCards gör den
  app.kort.push({ cid: 'r', name: 'Monster Role', flipped: 0, tok: 1, attachedTo: ukud.cid },
                { cid: 'u', name: 'Pacifism', flipped: 0, attachedTo: ukud.cid },
                { cid: 'q', name: 'Bonesplitter', flipped: 0, attachedTo: ukud.cid });
  klocka.t += 150; stamG([klar(2, 'Soldier', { sen: 20, ...LANGT })], hog(0));   // Ukud borta
  klocka.t += 1000; stamG([klar(2, 'Soldier', { sen: 20, ...LANGT })], hog(1));
  klocka.t += 2100; stamG([klar(2, 'Soldier', { sen: 20, ...LANGT })], hog(1));
  assert.equal(ukud.zon, 'grav'); assert.ok(ukud.gravAuto);
  assert.ok(!app.kort.some(k => k.name === 'Monster Role'), 'aura-token kvar');
  assert.equal(app.kort.find(k => k.name === 'Pacifism').zon, 'grav');
  assert.equal(app.kort.find(k => k.name === 'Bonesplitter').zon, undefined, 'utrustningen blir kvar');
  klocka.t += 150; stamG([], hog(1));             // tokenens spår dör
  klocka.t += 1000; stamG([], hog(2));
  klocka.t += 2100; stamG([], hog(2));
  assert.ok(!app.kort.includes(sold), 'tokenen ligger i graveyard');
  assert.ok(!app.kort.some(k => k.tok), 'en token blev kvar');
});
prov('GR3c handflytt till graveyard: en aura-token på kortet upphör att finnas, en vanlig aura följer med (flyttaTill)', () => {
  app.typ = new Map([['Monster Role', 'Token Enchantment — Aura Role'], ['Pacifism', 'Enchantment — Aura']]);
  app.kort.push({ cid: 'v', name: 'Grizzly Bears', flipped: 0, x: 10, y: 10 },
                { cid: 'r', name: 'Monster Role', flipped: 0, tok: 1, attachedTo: 'v' },
                { cid: 'u', name: 'Pacifism', flipped: 0, attachedTo: 'v' });
  assert.ok(app.flytta(0, 'grav'));
  assert.deepEqual(app.kort.map(k => k.name + ':' + (k.zon || '')), ['Grizzly Bears:grav', 'Pacifism:grav']);
});
prov('GR3d en värd som kameran skickat till handen (MES-343): auran går till graveyard, en aura-token upphör, utrustningen blir kvar; Still on the table lägger tillbaka värden på sin plats i listan', () => {
  app.typ = new Map([['Monster Role', 'Token Enchantment — Aura Role'], ['Pacifism', 'Enchantment — Aura'], ['Bonesplitter', 'Artifact — Equipment']]);
  stam([klar(1, 'Grizzly Bears', { sen: 20, ...PORT })]);
  const v = app.kort[0];
  app.kort.push({ cid: 'r', name: 'Monster Role', flipped: 0, tok: 1, attachedTo: v.cid },
                { cid: 'u', name: 'Pacifism', flipped: 0, attachedTo: v.cid },
                { cid: 'q', name: 'Bonesplitter', flipped: 0, attachedTo: v.cid });
  const bild = () => app.kort.map(k => k.name + ':' + (k.zon || '') + (k.attachedTo ? '@' + k.attachedTo : ''));
  klocka.t += 150; stam([]); klocka.t += 3100; stam([]);
  assert.ok(iHanden(v));
  assert.deepEqual(bild(), ['Pacifism:grav', 'Bonesplitter:@' + v.cid], 'auran till graveyard, token borta, utrustningen kvar (omritningen släpper den)');
  assert.ok(app.handVal(v.cid, 'kvar'));
  assert.equal(app.kort[0], v, 'tillbaka först i listan, där det låg'); assert.equal(app.handRad[0].val, 'kvar');
});
prov('GR3e värden till handen tar auran till graveyard; högens ändring efteråt kan vara auran, så värden stannar i handen — utan aura flyttar efterskottet värden till graveyard', () => {
  app.typ = new Map([['Pacifism', 'Enchantment — Aura']]);
  /* Arket förut, nu flyttaTill: graveyard för värden går genom aurorFoljer. */
  app.kort.push({ cid: 'v', name: 'Grizzly Bears', flipped: 0, x: 10, y: 10 },
                { cid: 'u', name: 'Pacifism', flipped: 0, attachedTo: 'v' },
                { cid: 'w', name: 'Llanowar Elves', flipped: 0, x: 200, y: 10 });
  app.losBifogade(); app.flytta(0, 'grav'); app.losBifogade();
  const pac = app.kort.find(k => k.name === 'Pacifism');
  assert.equal(pac.zon, 'grav');
  /* Högvaktens efterskott: värden gick till handen, högen ändras inom fönstret efter spårets död (gravAutoOm). */
  app.nollstall(); klocka.t = 1e6; app.typ = new Map([['Pacifism', 'Enchantment — Aura']]);
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(0));
  const ukud = app.kort[0];
  app.kort.push({ cid: 'u', name: 'Pacifism', flipped: 0, attachedTo: ukud.cid });
  klocka.t += 150; stamG([], hog(0));             // spåret dog: borta
  klocka.t += 3100; stamG([], hog(0));            // till handen
  assert.ok(iHanden(ukud), 'värden gick inte till handen'); assert.equal(app.kort[0].zon, 'grav', 'auran följde till graveyard');
  klocka.t += 1000; stamG([], hog(1));            // högen ändras inom fönstret: det kan vara auran som lades där (Tc2) — värden stannar i handen
  assert.ok(iHanden(ukud)); assert.notEqual(ukud.zon, 'grav');
  /* Utan aura: efterskottet skickar värden till graveyard (GR6). */
  app.nollstall(); klocka.t = 1e6;
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(0));
  const u2 = app.kort[0];
  klocka.t += 150; stamG([], hog(0)); klocka.t += 3100; stamG([], hog(0));
  klocka.t += 1000; stamG([], hog(1));
  assert.equal(u2.zon, 'grav'); assert.ok(u2.gravAuto); assert.ok(app.kort.includes(u2)); assert.equal(app.handRad.length, 0);
});
prov('GR4 två kort försvinner, högen ändras en gång: båda frågas', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT }), klar(2, 'Grizzly Bears', { sen: 20, ...LANGT })], hog(0));
  klocka.t += 150; stamG([], hog(0));
  klocka.t += 1000; stamG([], hog(1));
  klocka.t += 2100; stamG([], hog(1));
  for (const k of app.kort) { assert.equal(k.zon, undefined, k.name); assert.ok(k.lyft != null, k.name); }
});
prov('GR5 tre kort på en gång och tre ändringar: fall 8 — ingenting ändras, bindningarna släpps', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT }), klar(2, 'Grizzly Bears', { sen: 20, ...LANGT }), klar(3, 'Llanowar Elves', { sen: 20, ...MITT })], hog(0));
  klocka.t += 150; stamG([], hog(0));
  klocka.t += 1000; stamG([], hog(3));
  klocka.t += 2100; stamG([], hog(3));
  assert.equal(app.kort.length, 3); assert.equal(app.handRad.length, 0);
  for (const k of app.kort) { assert.equal(k.zon, undefined, k.name); assert.equal(k.spar, undefined, k.name); assert.ok(k.slappt, k.name); }
});
prov('GR6 efterskottet: högen blir stilla efter väntan — kortet som gått till handen går till graveyard i stället', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(0));
  const k = app.kort[0];
  klocka.t += 150; stamG([], hog(0)); klocka.t += 3100; stamG([], hog(0));
  assert.ok(iHanden(k));
  klocka.t += 900; stamG([], hog(1));             // 4 s efter att det försvann
  assert.equal(k.zon, 'grav'); assert.ok(k.gravAuto); assert.ok(app.kort.includes(k)); assert.equal(app.handRad.length, 0);
});
prov('GR7 högen ändrades tio sekunder innan kortet försvann: till handen', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(0));
  const k = app.kort[0];
  klocka.t += 150; stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(1));
  klocka.t += 10000; stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(1));
  klocka.t += 150; stamG([], hog(1)); klocka.t += 3100; stamG([], hog(1));
  assert.equal(k.zon, undefined); assert.ok(iHanden(k));
});
prov('GR8 telefonen startade om (talet sjunker): ingen falsk ändring — till handen', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(5));
  const k = app.kort[0];
  klocka.t += 150; stamG([], hog(5));
  klocka.t += 1000; stamG([], hog(0));
  klocka.t += 2100; stamG([], hog(0));
  assert.equal(k.zon, undefined); assert.ok(iHanden(k));
});
prov('GR9 besvärjelsen tar högens ändring: varelsen som plockades samtidigt går till handen', () => {
  app.typ = new Map([['Lightning Bolt', 'Instant'], ['Ukud Cobra', 'Creature — Snake']]);
  stamG([klar(1, 'Lightning Bolt', { sen: 20, ...PORT }), klar(2, 'Ukud Cobra', { sen: 20, ...LANGT })], hog(0));
  const cobra = app.kort.find(k => k.name === 'Ukud Cobra');
  klocka.t += 150; stamG([], hog(0));
  klocka.t += 1000; stamG([], hog(1));
  klocka.t += 2100; stamG([], hog(1));
  assert.equal(app.kort.find(k => k.name === 'Lightning Bolt').zon, 'grav');
  assert.equal(cobra.zon, undefined); assert.ok(iHanden(cobra));
});
/* Fönstret börjar efter att spåret dog (GRAV_TIDIGAST, 350 ms = telefonens
   stillaMs − bortaMs): armen över högen medan kortet flyttas någon annanstans
   gav i passet 2026-09-22 två "ändringar" −1,35 och +0,15 s runt spårets död. */
prov('GR11 högen ändras medan kortet ligger kvar skymt, spåret dör efteråt: till handen, inte graveyard', () => {
  stamG([klar(1, 'Mirran Bardiche', { sen: 20, ...PORT })], hog(0));
  const k = app.kort[0];
  klocka.t += 150; stamG([klar(1, 'Mirran Bardiche', { sen: 1500, skymd: true, ...PORT })], hog(1));   // armen över högen
  klocka.t += 1350; stamG([], hog(1));                                                               // spåret dör 1,35 s efter ändringen
  klocka.t += 150; stamG([], hog(2));                                                                // och en till, 0,15 s efter
  klocka.t += 3100; stamG([], hog(2));
  assert.equal(k.zon, undefined); assert.ok(iHanden(k));
});
prov('GR12 ändringen 0,4 s efter att spåret dog räcker: graveyard', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(0));
  klocka.t += 150; stamG([], hog(0));
  klocka.t += 400; stamG([], hog(1));
  klocka.t += 2700; stamG([], hog(1));
  assert.equal(app.kort[0].zon, 'grav'); assert.ok(app.kort[0].gravAuto);
});
prov('GR10 utan ruta (grav null) eller en telefon utan vakten: som förut — till handen', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], null);
  const k = app.kort[0];
  klocka.t += 150; stamG([], null); klocka.t += 3100; stamG([], null);
  assert.ok(iHanden(k)); assert.equal(k.zon, undefined);
});

/* VN (MES-291, Jespers beslut 3): ett kort kameran tappar antas först ha
   flyttats. Det väntar orört i BORTA_NAD (3000 i provet, 5000 i appen) och
   går till handen först sedan (MES-343; förut tonades det ned); läggs det
   ner på en ny plats under väntan flyttar det dit; växer graveyard-högen
   slutar väntan direkt. Det som inte ska gå till handen — besvärjelsen, ett
   täckt kort, Screen leads — avgörs efter den korta nåden (SLAPP_MS, 600 ms)
   som förut. */
const mitt = b => b.x + b.w / 2;
prov('VN0 appens väntan är 5 s och den korta nåden 600 ms (Jespers beslut 3, mätt i passet 2026-09-22)', () => {
  assert.equal(+((src.match(/const BORTA_NAD = (\d+);/) || [])[1]), 5000, 'BORTA_NAD i index.html');
  assert.equal(+((src.match(/const SLAPP_MS = (\d+);/) || [])[1]), 600, 'SLAPP_MS i index.html');
});
prov('VN1 väntan: ett tappat kort står kvar orört och bundet under väntan, och går till handen när den är slut', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([]);
  klocka.t += 1000; stam([]);                     // 1 s: efter den korta nåden, mitt i väntan
  assert.ok(k.borta, 'väntar'); assert.ok(app.kort.includes(k)); assert.equal(k.spar, 1);
  klocka.t += 1500; stam([]);                     // 2,5 s: fortfarande väntan
  assert.ok(app.kort.includes(k), 'kvar vid 2,5 s'); assert.equal(app.handRad.length, 0);
  klocka.t += 650; stam([]);                      // 3,15 s: väntan slut
  assert.ok(iHanden(k), 'till handen efter väntan'); assert.equal(k.spar, undefined); assert.equal(k.borta, undefined);
  assert.equal(app.handRad[0].borta0, 1e6 + 150, 'borta0 = när spåret dog');
});
prov('VN2 flytt under väntan: samma namn på en ny plats är samma kort — det flyttar dit och tonas aldrig ned', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  const k = app.kort[0], cid = k.cid;
  klocka.t += 150; stam([]);
  klocka.t += 2000; stam([]);
  assert.equal(k.lyft, undefined);
  klocka.t += 500; stam([klar(2, 'Ukud Cobra', { sen: 20, ...LANGT })]);   // 2,5 s: lagt på nya platsen, läst
  assert.equal(app.kort.length, 1, 'ett andra kort'); assert.equal(app.kort[0].cid, cid);
  assert.equal(k.spar, 2); assert.equal(k.borta, undefined); assert.equal(k.lyft, undefined);
  assert.ok(Math.abs(k.kam.x - mitt(LANGT)) < 1e-9, 'läget följde med: ' + k.kam.x);
  klocka.t += 3000; stam([klar(2, 'Ukud Cobra', { sen: 20, ...LANGT })]);
  assert.equal(k.lyft, undefined, 'tonat efteråt');
});
prov('VN3 flytt under väntan när ett annat kort med samma namn redan gått till handen: det väntande flyttar, det i handen stannar där', () => {
  stam([klar(1, 'Swamp', { sen: 20, ...PORT }), klar(2, 'Swamp', { sen: 20, ...LANGT })]);
  const a = app.kort.find(c => c.spar === 1), b = app.kort.find(c => c.spar === 2);
  klocka.t += 150; stam([klar(1, 'Swamp', { sen: 20, ...PORT })]);            // B tappas …
  klocka.t += 3100; stam([klar(1, 'Swamp', { sen: 20, ...PORT })]);           // … och går till handen
  assert.ok(iHanden(b), 'B till handen');
  klocka.t += 150; stam([]);                                                   // A tappas
  klocka.t += 2000; stam([klar(3, 'Swamp', { sen: 20, ...MITT })]);           // och läggs ner på en ny plats
  assert.equal(app.kort.length, 1);
  assert.equal(a.spar, 3, 'A band om'); assert.ok(Math.abs(a.kam.x - mitt(MITT)) < 1e-9);
  assert.ok(iHanden(b), 'B står kvar i handen');
});
prov('VN4 graveyard-högen växer under väntan: kortet går dit direkt, utan att vänta ut väntan eller tonas ned', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(0));
  klocka.t += 150; stamG([], hog(0));
  klocka.t += 1000; stamG([], hog(1));            // 1 s efter att spåret dog, långt före väntans slut
  const k = app.kort[0];
  assert.equal(k.zon, 'grav'); assert.ok(k.gravAuto); assert.equal(k.lyft, undefined); assert.equal(k.spar, undefined); assert.equal(k.borta, undefined);
});
prov('VN5 två kort tappas och högen växer en gång: båda väntar; läggs det ena ner på en ny plats går det andra till graveyard', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT }), klar(2, 'Grizzly Bears', { sen: 20, ...LANGT })], hog(0));
  const u = app.kort.find(c => c.name === 'Ukud Cobra'), g = app.kort.find(c => c.name === 'Grizzly Bears');
  klocka.t += 150; stamG([], hog(0));
  klocka.t += 1000; stamG([], hog(1));            // vilket av dem? går inte att säga: båda väntar vidare
  assert.equal(u.zon, undefined); assert.equal(g.zon, undefined); assert.equal(u.lyft, undefined); assert.equal(g.lyft, undefined);
  klocka.t += 500; stamG([klar(3, 'Grizzly Bears', { sen: 20, ...MITT })], hog(1));   // björnen flyttades
  assert.equal(g.spar, 3); assert.equal(g.zon, undefined); assert.equal(g.lyft, undefined);
  assert.equal(u.zon, 'grav', 'Ukud till graveyard'); assert.ok(u.gravAuto); assert.equal(u.lyft, undefined);
});
prov('VN6 armen över högen före och strax efter att spåret dog kortar inte väntan: kortet väntar, går till handen efteråt, inte graveyard', () => {
  stamG([klar(1, 'Mirran Bardiche', { sen: 20, ...PORT })], hog(0));
  const k = app.kort[0];
  klocka.t += 150; stamG([klar(1, 'Mirran Bardiche', { sen: 1500, skymd: true, ...PORT })], hog(1));
  klocka.t += 1350; stamG([], hog(1));
  klocka.t += 150; stamG([], hog(2));             // 0,15 s efter döden: för tidigt för att vara kortet
  klocka.t += 1000; stamG([], hog(2));
  assert.equal(k.zon, undefined); assert.ok(app.kort.includes(k), 'kvar under väntan'); assert.ok(k.borta);
  klocka.t += 2000; stamG([], hog(2));
  assert.equal(k.zon, undefined); assert.ok(iHanden(k), 'till handen efter väntan');
});
prov('VN7 det som inte tonas ned väntar inte: besvärjelsen går till graveyard och Screen leads släpper efter den korta nåden', () => {
  app.typ = new Map([['Lightning Bolt', 'Instant']]);
  stam([klar(1, 'Lightning Bolt', { sen: 20, ...PORT })]);
  klocka.t += 150; stam([]);
  klocka.t += 700; stam([]);
  assert.equal(app.kort[0].zon, 'grav'); assert.ok(app.kort[0].spellAuto);
  app.nollstall(); klocka.t = 1e6; app.spelsatt = 'skarm';
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  klocka.t += 150; stam([]);
  klocka.t += 700; stam([]);
  assert.equal(app.kort[0].spar, undefined, 'bindningen släppt'); assert.equal(app.kort[0].borta, undefined); assert.equal(app.kort[0].lyft, undefined);
});
/* Svar och handflyttar under väntan (granskningen av MES-291). Förut var
   ett kort i väntan redan nedtonat efter 0,6 s, och svaren tog det som
   nedtonat; nu har det kvar sitt döda spår i hela väntan. */
const okandLangt = id => ({ id, tillstand: 'okand', namn: null, saker: false, gissning: null, sen: 20,
  cands: [{ name: 'Grizzly Bears', score: 0.4 }, { name: 'Ukud Cobra', score: 0.3 }], ...LANGT });
prov('VN8 granskningens svar under väntan: kortet i väntan är kortet som kom tillbaka — inget andra kort, och det tonas inte ned', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([]);                                   // lyfts: spåret dör
  klocka.t += 1500; stam([okandLangt(2)]);                     // läggs ner där telefonen inte kan läsa det: en fråga
  assert.equal(app.pending.length, 1, 'ingen fråga'); assert.ok(k.borta, 'väntar inte');
  klocka.t += 1500; app.namnge(app.pending[0], 'Ukud Cobra'); // svaret, 3,15 s efter att spåret dog
  assert.equal(app.kort.length, 1, 'ett andra Ukud Cobra'); assert.equal(k.spar, 2); assert.equal(k.borta, undefined); assert.equal(app.pending.length, 0);
  const lastKlar = Object.assign(okandLangt(2), { tillstand: 'klar', namn: 'Ukud Cobra', saker: true, varfor: 'hand' });
  klocka.t += 100; stam([lastKlar]);
  klocka.t += 3000; stam([lastKlar]);                          // där väntan hade tagit slut
  assert.equal(app.kort.length, 1); assert.equal(k.lyft, undefined, 'originalet tonades ned'); assert.equal(k.spar, 2);
  assert.ok(Math.abs(k.kam.x - mitt(LANGT)) < 1e-9, 'läget följde med: ' + k.kam.x);
});
prov('VN9 handflytt till graveyard under väntan: bindningen släpps, och nästa exemplar med samma namn blir ett kort på mattan', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([]);                                   // spåret dör; högen syntes inte
  klocka.t += 1000; stam([]);
  assert.ok(k.borta, 'väntar inte');
  app.flytta(app.kort.indexOf(k), 'grav');                     // spelaren lägger det i graveyard själv
  assert.equal(k.zon, 'grav'); assert.equal(k.fysisk, undefined, 'fysisk på ett kort med dött spår'); assert.equal(k.spar, undefined); assert.equal(k.borta, undefined);
  klocka.t += 300; stam([klar(2, 'Ukud Cobra', { sen: 20, ...LANGT })]);   // ett annat exemplar läggs ut och läses
  const matta = app.kort.filter(c => c.zon !== 'grav');
  assert.equal(matta.length, 1, 'inget kort på mattan'); assert.equal(matta[0].spar, 2);
  assert.equal(k.spar, undefined, 'graveyard-kortet band det nya spåret');
});
prov('VN10 timern: med hjärtslag var tredje sekund går kortet till handen när väntan tar slut, inte vid rapporten efter', () => {
  const T0 = klocka.t;
  tid(T0); stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  const k = app.kort[0];
  tid(T0 + 150); stam([]);                                     // spåret dör
  let nar = null;
  for (let t = T0 + 150 + 2900; t < T0 + 12000; t += 2900) { tid(t); stam([]); const h = app.handRad.find(x => x.cid === k.cid); if (h && nar == null) nar = h.nar; }   // hjärtslagen: samma tomma bord
  assert.ok(!app.kort.includes(k), 'aldrig till handen');
  assert.ok(nar != null && nar - T0 <= 150 + 3000 + 150, `till handen vid ${nar == null ? '–' : nar - T0} ms, väntan slut vid ${150 + 3000}`);
});
prov('VN11 timern spelar upp telefonens bord som det kom: ett spår som tvivlas på ger inte kortet i handen ett nytt kort', () => {
  /* Passet 2026-09-22, 154 s: Pharika's Chosen lyfts från svärdet under sig;
     spåret lägger sig på svärdet med Pharikas namn (tvivelSteg: kortet under).
     Den gamla timern spelade upp det avstämda bordet, där spåret saknas, och
     då glömde tvivelSteg det. */
  const T0 = klocka.t, UNDER = box(PORT.x + 0.02, PORT.y - 0.02, 0.063, 0.088);
  const vila = (dx, rest) => Object.assign({ x: PORT.x + dx, y: PORT.y, w: PORT.w, h: PORT.h, vx: PORT.x + dx + PORT.w / 2, vy: PORT.y + PORT.h / 2, vilar: true }, rest);
  const b3 = () => [klar(1, "Pharika's Chosen", { sen: 20, ...vila(0.015) }), klar(2, "Valkyrie's Sword", { sen: 3750, skymd: true, ...UNDER })];
  tid(T0); stam([klar(1, "Pharika's Chosen", { sen: 20, ...vila(0) }), klar(2, "Valkyrie's Sword", { sen: 20, skymd: true, ...UNDER })]);
  tid(T0 + 150); stam([klar(1, "Pharika's Chosen", { sen: 2100, skymd: true, ...vila(0) }), klar(2, "Valkyrie's Sword", { sen: 2250, skymd: true, ...UNDER })]);
  tid(T0 + 1650); stam(b3());
  const ph = app.kort.find(c => c.name === "Pharika's Chosen");
  assert.ok(ph.borta, 'Pharika väntar inte');
  tid(T0 + 1650 + 3000 + 400);                                 // telefonen tyst: timern tar väntan till slut
  assert.ok(iHanden(ph), 'timern skickade inte till handen');
  tid(T0 + 1650 + 3000 + 900); stam(b3());                     // nästa rapport, samma bord
  assert.equal(app.kort.filter(c => c.name === "Pharika's Chosen").length, 0, 'spöksspåret gav ett nytt Pharika');
});
prov('VN12 kortSomKomTillbaka: väntande före obundet, aldrig kortet självt eller ett i graveyard', () => {
  const c = (cid, rest) => Object.assign({ cid, name: 'Swamp', flipped: 0 }, rest);
  const obundet = c('o'), vant = c('v', { spar: 7, borta: 1 }), bundet = c('b', { spar: 8 }), grav = c('g', { zon: 'grav', spar: 9, borta: 1 }), sjalv = c('s', { spar: 10, borta: 1 });
  app.kort.push(obundet, bundet, grav, sjalv, vant);
  assert.equal(app.tillbaka('Swamp', sjalv), vant, 'väntande först');
  app.kort.splice(app.kort.indexOf(vant), 1);
  assert.equal(app.tillbaka('Swamp', sjalv), obundet, 'sedan obundet');
  app.kort.splice(app.kort.indexOf(obundet), 1);
  assert.equal(app.tillbaka('Swamp', sjalv), null, 'ett bundet, ett i graveyard eller kortet självt');
});
prov('VN13 ett täckt kort väntar inte: det släpps efter den korta nåden, och står inte i vägen när högen växer för ett annat kort', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT }), klar(2, 'Bonesplitter', { sen: 20, ...MITT }), klar(3, 'Grizzly Bears', { sen: 20, ...LANGT })], hog(0));
  const vard = app.kort.find(k => k.name === 'Ukud Cobra'), utr = app.kort.find(k => k.name === 'Bonesplitter'), bj = app.kort.find(k => k.name === 'Grizzly Bears');
  utr.attachedTo = vard.cid;
  klocka.t += 150; stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(0));   // utrustningen skyms av värden, björnen lyfts
  klocka.t += 1000; stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(1));  // högen växer: björnen lades där
  klocka.t += 150; stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(1));
  assert.equal(utr.borta, undefined, 'utrustningen väntar'); assert.equal(utr.spar, undefined); assert.equal(utr.lyft, undefined);
  assert.equal(bj.zon, 'grav', 'björnen fick inte högens ändring'); assert.ok(bj.gravAuto);
});
prov('VN14 besvärjelsen räknas från när den plockades upp: ett instant som plockas upp efter 19,8 s går till graveyard', () => {
  app.typ = new Map([['Lightning Bolt', 'Instant']]);
  stam([klar(1, 'Lightning Bolt', { sen: 20, ...PORT })]);
  klocka.t += 19800; stam([klar(1, 'Lightning Bolt', { sen: 20, ...PORT })]);
  stam([]);                                                    // plockas upp 19,8 s efter att det lades ut
  klocka.t += 700; stam([]);                                   // nåden slut 20,5 s efter
  assert.equal(app.kort[0].zon, 'grav'); assert.ok(app.kort[0].spellAuto); assert.equal(app.kort[0].lyft, undefined);
});

/* GU (MES-248): ett kort som tas UR graveyard och läggs på bordet igen —
   reanimator, recursion, Trusty Retriever. Samma kort flyttar tillbaka,
   och bara när ett nytt kort skulle ge fler exemplar än leken har. */
const iGrav = namn => app.kort.filter(c => c.zon === 'grav' && c.name === namn).length;
/* TV (dev/eventtest, passet 2026-09-22): ett klart spår som stått utan
   region i minst 2 s och lägger sig en bit bort är inte längre ett bevis
   för kortet — men bara när ett annat kort kan förklara det (tvivelSteg,
   annatKortDar). vila(t, dx) = spåret vilar dx bildandelar till höger om PORT. */
const vila = (dx, rest) => Object.assign({ x: PORT.x + dx, y: PORT.y, w: PORT.w, h: PORT.h, vx: PORT.x + dx + PORT.w / 2, vy: PORT.y + PORT.h / 2, vilar: true }, rest);
const UNDER = box(PORT.x + 0.02, PORT.y - 0.02, 0.063, 0.088);   // svärdet under Pharika, förskjutet så att en del syns
prov('TV1 kortet ovanpå lyfts till graveyard, kortet under tar spåret: det övre lämnar bordet, det undre ligger kvar', () => {
  stamG([klar(1, "Pharika's Chosen", { sen: 20, ...vila(0) }), klar(2, "Valkyrie's Sword", { sen: 20, skymd: true, ...UNDER })], hog(0));
  klocka.t += 150; stamG([klar(1, "Pharika's Chosen", { sen: 2100, skymd: true, ...vila(0) }), klar(2, "Valkyrie's Sword", { sen: 2250, skymd: true, ...UNDER })], hog(0));
  klocka.t += 1500; stamG([klar(1, "Pharika's Chosen", { sen: 20, ...vila(0.015) }), klar(2, "Valkyrie's Sword", { sen: 3750, skymd: true, ...UNDER })], hog(0));
  const ph = app.kort.find(k => k.name === "Pharika's Chosen"), sv = app.kort.find(k => k.name === "Valkyrie's Sword");
  assert.ok(ph.borta, 'Pharika i nåd'); assert.equal(sv.spar, 2);
  assert.ok(Math.abs(ph.kam.x - (PORT.x + PORT.w / 2)) < 1e-9, 'läget står kvar där kortet låg');
  klocka.t += 1500; stamG([klar(1, "Pharika's Chosen", { sen: 20, ...vila(0.015) }), klar(2, "Valkyrie's Sword", { sen: 5250, skymd: true, ...UNDER })], hog(1));   // högen ändras
  klocka.t += 1600; stamG([klar(1, "Pharika's Chosen", { sen: 20, ...vila(0.015) }), klar(2, "Valkyrie's Sword", { sen: 6850, skymd: true, ...UNDER })], hog(1));   // nådatiden (bänkens 3 s) ute
  assert.equal(ph.zon, 'grav'); assert.ok(ph.gravAuto);
  assert.equal(sv.zon, undefined); assert.equal(sv.lyft, undefined); assert.equal(app.kort.length, 2, 'inget nytt kort');
  assert.equal(app.pending.length, 0, 'ingen fråga om spåret');
});
prov('TV2 samma rörelse utan kort under: en flytt under handen, samma kort', () => {
  stam([klar(1, "Pharika's Chosen", { sen: 20, ...vila(0) })]);
  klocka.t += 150; stam([klar(1, "Pharika's Chosen", { sen: 2100, skymd: true, ...vila(0) })]);
  klocka.t += 1500; stam([klar(1, "Pharika's Chosen", { sen: 20, ...vila(0.015) })]);
  const k = app.kort[0];
  assert.equal(k.spar, 1); assert.ok(!k.borta); assert.ok(Math.abs(k.kam.x - (PORT.x + 0.015 + PORT.w / 2)) < 1e-9, 'kortet flyttar');
});
prov('TV3 spåret var utan region i under 2 s: som förut, också med ett kort under', () => {
  stam([klar(1, "Pharika's Chosen", { sen: 20, ...vila(0) }), klar(2, "Valkyrie's Sword", { sen: 20, skymd: true, ...UNDER })]);
  klocka.t += 150; stam([klar(1, "Pharika's Chosen", { sen: 1500, skymd: true, ...vila(0) }), klar(2, "Valkyrie's Sword", { sen: 1650, skymd: true, ...UNDER })]);
  klocka.t += 300; stam([klar(1, "Pharika's Chosen", { sen: 20, ...vila(0.015) }), klar(2, "Valkyrie's Sword", { sen: 1950, skymd: true, ...UNDER })]);
  assert.equal(app.kort.find(k => k.name === "Pharika's Chosen").spar, 1); assert.ok(!app.kort.find(k => k.name === "Pharika's Chosen").borta);
});
prov('TV4 kortet på annat håll: spöksspåret tar ett annat kort, Ukud (1 i leken) följer spåret med dess namn', () => {
  app.lek = new Map([['Ukud Cobra', 1]]);
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...vila(0) })]);
  klocka.t += 150; stam([klar(1, 'Ukud Cobra', { sen: 2100, skymd: true, ...vila(0) }), { id: 3, tillstand: 'okand', namn: 'Ukud Cobra', saker: false, gissning: null, sen: 20, ...LANGT }]);
  klocka.t += 5000; stam([klar(1, 'Ukud Cobra', { sen: 20, ...vila(0.02) }), { id: 3, tillstand: 'okand', namn: 'Ukud Cobra', saker: false, gissning: null, sen: 20, ...LANGT }]);
  assert.equal(app.kort.length, 1, 'inget nytt kort'); assert.equal(app.kort[0].spar, 3); assert.ok(!app.kort[0].borta);
  assert.equal(app.pending.length, 0, 'spöksspåret blir ingen fråga, och frågan på spår 3 är besvarad');
  // telefonen läser om spöksspåret: det nya namnet gäller
  klocka.t += 150; stam([klar(1, 'Killing Glare', { sen: 20, ...vila(0.02), varfor: 'bild' }), { id: 3, tillstand: 'okand', namn: 'Ukud Cobra', saker: false, gissning: null, sen: 20, ...LANGT }]);
  assert.ok(app.kort.some(k => k.name === 'Killing Glare' && k.spar === 1));
});
prov('TV5 landhögen: ett Swamp ovanpå ett annat Swamp — samma namn förklarar inget, kortet står kvar', () => {
  stam([klar(1, 'Swamp', { sen: 20, ...vila(0) }), klar(2, 'Swamp', { sen: 20, skymd: true, ...UNDER })]);
  klocka.t += 150; stam([klar(1, 'Swamp', { sen: 2100, skymd: true, ...vila(0) }), klar(2, 'Swamp', { sen: 2250, skymd: true, ...UNDER })]);
  klocka.t += 1500; stam([klar(1, 'Swamp', { sen: 20, ...vila(0.015) }), klar(2, 'Swamp', { sen: 3750, skymd: true, ...UNDER })]);
  assert.ok(app.kort.every(k => !k.borta && k.lyft == null)); assert.equal(app.kort.length, 2);
});
prov('TV6 spåret läses om till ett annat kort och högen ändras en sekund senare: det gamla kortet (släppt, orört) gick till graveyard', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(0));
  klocka.t += 150; stamG([klar(1, 'Mirran Bardiche', { sen: 20, ...PORT })], hog(0));
  const ukud = app.kort.find(k => k.name === 'Ukud Cobra');
  assert.ok(ukud.slappt, 'släppt'); assert.equal(ukud.spar, undefined); assert.equal(app.handRad.length, 0, 'inte till handen');
  klocka.t += 1200; stamG([klar(1, 'Mirran Bardiche', { sen: 20, ...PORT })], hog(1));
  assert.equal(ukud.zon, 'grav'); assert.ok(ukud.gravAuto); assert.equal(ukud.slappt, undefined);
});
prov('GU1 leken har 1 Trusty Retriever och den ligger i graveyard: kortet på mattan är SAMMA kort, tillbaka i spel', () => {
  app.lek = new Map([['Trusty Retriever', 1]]);
  app.kort.push({ cid: 'g', name: 'Trusty Retriever', flipped: 1, zon: 'grav', gravAuto: 1, tapped: 1, x: 40, y: 80, cts: [{ t: '+1/+1', n: 2 }] });
  stam([klar(1, 'Trusty Retriever', { sen: 20, ...PORT })]);
  assert.equal(app.kort.length, 1, 'ett nytt kort skapades bredvid det i högen');
  const k = app.kort[0];
  assert.equal(k.cid, 'g'); assert.equal(k.zon, undefined); assert.equal(k.spar, 1);
  assert.equal(k.gravAuto, undefined); assert.equal(k.tapped, 0); assert.equal(k.etb, 1);
  assert.deepEqual(k.cts, [], 'countrarna blev kvar på bordet'); assert.equal(k.flipped, 0, 'sidan blev kvar på bordet');
  assert.equal(k.x, null, 'platsen ska räknas om'); assert.equal(iGrav('Trusty Retriever'), 0);
});
prov('GU1b högvakten tog fel: kortet kommer tillbaka på mattan strax efter gravAuto och behåller countrar och sida; efter GRAV_ATER_MS är det ett nytt objekt', () => {
  const kor = (vanta) => {
    app.nollstall(); klocka.t = 1e6;
    app.lek = new Map([['Ukud Cobra', 1]]);
    stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(0));
    const k = app.kort[0];
    k.cts = [{ t: '+1/+1', n: 2 }]; k.flipped = 1;
    klocka.t += 150; stamG([], hog(0));             // spåret dog: borta
    klocka.t += 1000; stamG([], hog(1));            // högen ändrades av något annat
    klocka.t += 2100; stamG([], hog(1));
    assert.equal(k.zon, 'grav'); assert.ok(k.gravAuto, 'högvakten tog det');
    klocka.t += vanta; stamG([klar(2, 'Ukud Cobra', { sen: 20, ...LANGT })], hog(1));   // kortet låg bara på ett nytt ställe
    assert.equal(app.kort.length, 1, 'ett nytt kort skapades'); assert.equal(k.zon, undefined); assert.equal(k.spar, 2);
    return k;
  };
  const strax = kor(3000);
  assert.deepEqual(strax.cts, [{ t: '+1/+1', n: 2 }], 'countrarna försvann på ett kort som aldrig lämnat bordet');
  assert.equal(strax.flipped, 1, 'sidan vändes på ett kort som aldrig lämnat bordet');
  const senare = kor(12000);                      // utanför GRAV_ATER_MS (8 s): ett nytt objekt, som Feign Death
  assert.deepEqual(senare.cts, []); assert.equal(senare.flipped, 0);
});
prov('GU2 leken har 4 Forest, tre på bordet och ett i graveyard: det fjärde på mattan är ett NYTT kort ur handen', () => {
  app.lek = new Map([['Forest', 4]]);
  app.kort.push({ cid: 'g', name: 'Forest', flipped: 0, zon: 'grav' });
  const b = i => box(0.1 + i * 0.15, 0.2, 0.063, 0.088);
  stam([1, 2].map(i => klar(i, 'Forest', { sen: 20, ...b(i) })));
  assert.equal(app.kort.length, 3); assert.equal(iGrav('Forest'), 1);
  stam([1, 2, 3].map(i => klar(i, 'Forest', { sen: 20, ...b(i) })));
  assert.equal(app.kort.length, 4, 'kortet i högen plockades upp i stället'); assert.equal(iGrav('Forest'), 1);
  // det FJÄRDE på mattan skulle ge fem exemplar: nu är det kortet i högen
  stam([1, 2, 3, 4].map(i => klar(i, 'Forest', { sen: 20, ...b(i) })));
  assert.equal(app.kort.length, 4, 'ett femte Forest skapades'); assert.equal(iGrav('Forest'), 0);
});
prov('GU3 utan lek: som förut — ett nytt kort, högen orörd', () => {
  app.kort.push({ cid: 'g', name: 'Ukud Cobra', flipped: 0, zon: 'grav' });
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  assert.equal(app.kort.length, 2); assert.equal(iGrav('Ukud Cobra'), 1);
});
prov('GU4 Screen leads: kameran rör inte högen — ett nytt kort, som förut', () => {
  app.spelsatt = 'skarm'; app.lek = new Map([['Ukud Cobra', 1]]);
  app.kort.push({ cid: 'g', name: 'Ukud Cobra', flipped: 0, zon: 'grav' });
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  assert.equal(iGrav('Ukud Cobra'), 1, 'kortet lyftes ur högen i Screen leads');
});
prov('GU5 kortet ligger kvar fysiskt (fysisk): bindningen är tyst i zonen, det lyfts inte ur högen', () => {
  app.lek = new Map([['Ukud Cobra', 1]]);
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  app.kort[0].zon = 'grav'; app.kort[0].fysisk = true;          // som flyttaTill gör
  stam([klar(7, 'Ukud Cobra', { sen: 10, ...LANGT })]);         // detektorn födde ett nytt spår
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].zon, 'grav');
});
prov('GU6 tappat kort ur högen: det föds tappat, som ett nytt kamerakort', () => {
  app.lek = new Map([['Ukud Cobra', 1]]);
  app.kort.push({ cid: 'g', name: 'Ukud Cobra', flipped: 0, zon: 'grav', tapped: 0 });
  stam([klar(1, 'Ukud Cobra', { tappad: true, sen: 20, ...LAND_ })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].tapped, 1); assert.equal(app.kort[0].kamTap, 1);
});
prov('GU7 högens ändring tas av kortet som lyfts ur den: nästa kort som försvinner får frågan, inte graveyard', () => {
  app.lek = new Map([['Trusty Retriever', 1], ['Ukud Cobra', 1]]);
  app.kort.push({ cid: 'g', name: 'Trusty Retriever', flipped: 0, zon: 'grav' });
  stamG([klar(2, 'Ukud Cobra', { sen: 20, ...LANGT })], hog(0));
  klocka.t += 1000; stamG([klar(2, 'Ukud Cobra', { sen: 20, ...LANGT })], hog(1));   // högen ändrades: kortet lyftes ur den
  klocka.t += 1000; stamG([klar(1, 'Trusty Retriever', { sen: 20, ...PORT }), klar(2, 'Ukud Cobra', { sen: 20, ...LANGT })], hog(1));
  assert.equal(iGrav('Trusty Retriever'), 0, 'kortet kom inte ur högen');
  // nu försvinner Ukud Cobra utan att högen ändras: frågan, inte auto-graveyard
  klocka.t += 150; stamG([klar(1, 'Trusty Retriever', { sen: 20, ...PORT })], hog(1));
  klocka.t += 3100; stamG([klar(1, 'Trusty Retriever', { sen: 20, ...PORT })], hog(1));
  assert.ok(!app.kort.some(k => k.name === 'Ukud Cobra' && k.zon === 'grav'), 'högens ändring räknades två gånger');
  assert.ok(iHandenNamn('Ukud Cobra'), 'till handen');
});

/* K6: antalspriorn som ren funktion (telefonen läser den i kamIdentifiera och kamAiPoster). */
prov('Q5 lekPrior: utan lek eller okänt namn står ett säkert svar; med lekens alla exemplar upptagna faller det', () => {
  assert.equal(app.lekPrior(true, Infinity, 5), true);
  assert.equal(app.lekPrior(true, null, 5), true);
  assert.equal(app.lekPrior(true, 4, 3), true);
  assert.equal(app.lekPrior(true, 4, 4), false);
  assert.equal(app.lekPrior(true, 1, 1), false);
  assert.equal(app.lekPrior(false, 4, 0), false);
});

/* MES-122: uppstartens rutor. Raden i camera_setups byggs på ett ställe
   (RR1), och graveyard/library föreslås i spelarens nedre vänstra hörn (ZN). */
prov('RR1 varje skrivning av camera_setups-raden går genom kamRutaRad', () => {
  const rader = src.split('\n').filter(l => l.includes('Moln.sparaKalibrering('));
  assert.ok(rader.length >= 5, 'för få skrivare: ' + rader.length);
  for (const l of rader) assert.ok(l.includes('kamRutaRad('), 'utan kamRutaRad: ' + l.trim().slice(0, 90));
});
const naraZ = (a, b, tol = 0.006) => Math.abs(a - b) <= tol;
const inomZ = z => z.x >= -1e-9 && z.y >= -1e-9 && z.x + z.w <= 1 + 1e-9 && z.y + z.h <= 1 + 1e-9;
const KS = 0.1, KL = 0.1 * 88 / 63, A43 = 0.75;
prov('ZN1 vid 0°: graveyard nere till vänster, library till höger om den', () => {
  const f = app.zonForslag(KS, KL, A43, 0, false);
  assert.ok(naraZ(f.grav.x, 0.0225), 'x ' + f.grav.x); assert.ok(naraZ(f.grav.y + f.grav.h, 0.97), 'nederkant ' + (f.grav.y + f.grav.h));
  assert.ok(f.bib.x > f.grav.x + f.grav.w, 'library till höger'); assert.ok(naraZ(f.bib.y, f.grav.y));
  assert.ok(naraZ(f.grav.w, 1.15 * KS, 0.002), 'kortbredd ' + f.grav.w); assert.ok(naraZ(f.grav.h, 1.15 * KL / A43, 0.002), 'korthöjd ' + f.grav.h);
  assert.ok(!f.trangt && inomZ(f.grav) && inomZ(f.bib));
});
prov('ZN2 vid 180°: rutorna uppe till höger i bilden, library till vänster om graveyard', () => {
  const f = app.zonForslag(KS, KL, A43, 180, false);
  assert.ok(naraZ(f.grav.x + f.grav.w, 1 - 0.0225), 'högerkant ' + (f.grav.x + f.grav.w)); assert.ok(naraZ(f.grav.y, 0.03), 'överkant ' + f.grav.y);
  assert.ok(f.bib.x + f.bib.w < f.grav.x, 'library till vänster i bilden');
});
prov('ZN3 bild → vy → bild i alla vridningar, med och utan spegling; platsen står upprätt i vyn', () => {
  for (const r of [0, 90, 180, 270]) for (const sp of [false, true]) {
    const p = { x: 0.2, y: 0.7 }, q = app.kamVyTillBild(app.kamBildTillVy(p, r, sp), r, sp);
    assert.ok(naraZ(q.x, p.x, 1e-9) && naraZ(q.y, p.y, 1e-9), `r ${r} s ${sp}`);
    const f = app.zonForslag(KS, KL, A43, r, sp);
    assert.ok(inomZ(f.grav) && inomZ(f.bib), `inom bilden r ${r} s ${sp}`);
    /* Platsen är ett stående kort som spelaren ser det: vid 90/270 ligger
       den därför på tvären i telefonens bild. */
    const ligg = r === 90 || r === 270, bw = ligg ? 1.15 * KL : 1.15 * KS, bh = ligg ? 1.15 * KS / A43 : 1.15 * KL / A43;
    assert.ok(!f.trangt && naraZ(f.grav.w, bw, 0.002) && naraZ(f.grav.h, bh, 0.002), `form r ${r} s ${sp}: ${JSON.stringify(f.grav)}`);
  }
});
prov('ZN4 spegling: vid 0° hamnar graveyard nere till höger i bilden', () => {
  const f = app.zonForslag(KS, KL, A43, 0, true);
  assert.ok(naraZ(f.grav.x + f.grav.w, 1 - 0.0225)); assert.ok(f.bib.x + f.bib.w < f.grav.x);
});
prov('ZN5 kortets storlek ur lådan: snett, stående och tappat; och ur provbordet', () => {
  const lada = th => { const r = th * Math.PI / 180, c = Math.abs(Math.cos(r)), sn = Math.abs(Math.sin(r)); return { w: KL * c + KS * sn, h: (KL * sn + KS * c) / A43 }; };
  for (const [g, tappat, th] of [[90, false, 90], [30, false, 30], [90, true, 180], [120, false, 120]]) {
    const m = app.provKortMatt(lada(th), null, null, A43, g, tappat);
    assert.ok(m && Math.abs(m.S - KS) / KS < 0.02, `g ${g} tappat ${tappat}: S ${m && m.S}`);
  }
  const ur = app.provKortMatt({ id: 5, w: 0.5, h: 0.5 }, [{ id: 5, kort: 24, lang: 33.5 }], { aw: 240 }, A43, 90, false);
  assert.ok(naraZ(ur.S, 0.1, 1e-9) && naraZ(ur.L, 33.5 / 240, 1e-9), 'provbordet ' + JSON.stringify(ur));
  assert.equal(app.provKortMatt({ id: 1, w: 0.4, h: 0.02 }, null, null, A43, 90, false), null, 'orimlig låda');
});
prov('ZN6 ett för stort kort: rutorna krymps, ryms och överlappar inte; library följer en flyttad graveyard', () => {
  const f = app.zonForslag(0.45, 0.45 * 88 / 63, A43, 0, false);
  assert.ok(f.trangt && inomZ(f.grav) && inomZ(f.bib) && f.bib.x >= f.grav.x + f.grav.w - 1e-9);
  const g = { x: 0.3, y: 0.4, w: 0.13, h: 0.24 }, b = app.bibBredvid(g, 0, false);
  assert.ok(naraZ(b.x, 0.3 + 0.13 * 1.2) && naraZ(b.y, 0.4) && naraZ(b.w, 0.13) && naraZ(b.h, 0.24), JSON.stringify(b));
  const kant = app.bibBredvid({ x: 0.85, y: 0.4, w: 0.13, h: 0.24 }, 0, false);
  assert.ok(kant.x + kant.w <= 0.85, 'till vänster vid kanten');
});
prov('ZN7 kortets storlek utan vinkel (Use camera to add cards): stående, på tvären, snett och brusigt; provbordet när lådan inte är ett kort', () => {
  const lada = th => { const r = th * Math.PI / 180, c = Math.abs(Math.cos(r)), sn = Math.abs(Math.sin(r)); return { w: KL * c + KS * sn, h: (KL * sn + KS * c) / A43 }; };
  for (const th of [0, 90, 180, 270, 15, 30, 45, 60, 80, 120]) {
    const m = app.provKortStorlek({ id: 1, ...lada(th) }, null, null, A43);
    assert.ok(m && Math.abs(m.S - KS) / KS < 0.02 && naraZ(m.L, m.S * 88 / 63, 1e-9), `${th}°: ${JSON.stringify(m)}`);
  }
  /* Detektorns låda är inte exakt: ett stående kort med fem procent för hög låda. */
  const brus = app.provKortStorlek({ id: 1, w: KS, h: 1.05 * KL / A43 }, null, null, A43);
  assert.ok(brus && Math.abs(brus.S - KS) / KS < 0.05, 'brus ' + JSON.stringify(brus));
  /* Ingen vinkel och inget grundläge behövs: samma svar i en bild med annat format. */
  const bred = app.provKortStorlek({ id: 1, w: KS, h: KL / 0.5625 }, null, null, 0.5625);
  assert.ok(bred && Math.abs(bred.S - KS) / KS < 0.02, '16:9 ' + JSON.stringify(bred));
  /* En avlång remsa är inget kort: provbordets mått, och utan dem null. */
  const ur = app.provKortStorlek({ id: 5, w: 0.4, h: 0.02 }, [{ id: 5, kort: 24, lang: 33.5 }], { aw: 240 }, A43);
  assert.ok(ur && naraZ(ur.S, 0.1, 1e-9) && naraZ(ur.L, 33.5 / 240, 1e-9), 'provbordet ' + JSON.stringify(ur));
  assert.equal(app.provKortStorlek({ id: 5, w: 0.4, h: 0.02 }, null, null, A43), null, 'orimlig låda');
  assert.equal(app.provKortStorlek(null, null, null, A43), null);
  /* Platserna blir kortstora: ett snett provkort ger samma graveyard som ett rakt. */
  const snett = app.provKortStorlek({ id: 1, ...lada(35) }, null, null, A43), f = app.zonForslag(snett.S, snett.L, A43, 0, false);
  assert.ok(naraZ(f.grav.w, 1.15 * KS, 0.004) && naraZ(f.grav.h, 1.15 * KL / A43, 0.006) && !f.trangt, 'platsen ' + JSON.stringify(f.grav));
});

/* MES-122: medan uppstarten pågår spelas inget ut. UP = uppstarten. Gäller båda kameralägena: Mirror my
   table har inget steg 4 sedan MES-334 sida 5, men uppstarten kan stå öppen med telefonen ansluten (pillret
   mitt i spelet, eller en telefon som redan är ansluten när leken och läget väljs) — spärren återinförd efter
   granskningen av sida 5 (L4). */
prov('UP1 uppstarten pågår: ett känt spår blir inget kort och ingen fråga, men följs', () => {
  app.oppstart = true;
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  assert.equal(app.kort.length, 0); assert.equal(app.pending.length, 0);
  assert.deepEqual(app.spar.map(t => t.id), [1]);
});
prov('UP2 uppstarten pågår: ett okänt spår ger ingen granskning', () => {
  app.oppstart = true;
  stam([{ id: 2, tillstand: 'okand', namn: null, sen: 20, ...PORT }]);
  klocka.t += 5000; stam([{ id: 2, tillstand: 'okand', namn: null, sen: 20, ...PORT }]);
  assert.equal(app.pending.length, 0); assert.equal(app.kort.length, 0);
});
prov('UP3 uppstarten öppnas mitt i spelet: ett kort tappas inte och tonas inte ned', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  assert.equal(app.kort.length, 1);
  app.oppstart = true;
  stam([klar(1, 'Ukud Cobra', { tappad: true, sen: 20, ...LAND_ })]);
  assert.equal(app.kort[0].tapped, 0);
  klocka.t += 150; stam([]); klocka.t += 3100; stam([]);
  assert.ok(!app.kort[0].borta); assert.equal(app.kort[0].lyft, undefined);
});
prov('UP4 Start playing: provkortet och ett andra spår ovanpå spärras', () => {
  app.oppstart = true;
  const spar = [klar(1, 'Ukud Cobra', { sen: 20, ...PORT }), klar(2, 'Ukud Cobra', { sen: 20, ...LAND_ }), klar(3, 'Swamp', { sen: 20, ...LANGT })];
  stam(spar);
  const ut = app.provkortUt(app.spar, 1);
  assert.deepEqual(ut.sort(), [1, 2]);
  for (const id of ut) app.borttagna.add(id);
  app.oppstart = false;
  stam(spar);
  assert.deepEqual(app.kort.map(k => k.name), ['Swamp']);
});
prov('UP5 provkortet lyfts: spärren släpper, och ett nytt kort med samma namn spelas', () => {
  app.oppstart = true;
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  for (const id of app.provkortUt(app.spar, 1)) app.borttagna.add(id);
  app.oppstart = false;
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  assert.equal(app.kort.length, 0);
  klocka.t += 150; stam([]);
  assert.ok(!app.borttagna.has(1));
  klocka.t += 150; stam([klar(4, 'Ukud Cobra', { sen: 20, ...LANGT })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].spar, 4);
});
prov('UP6 högen ändras under uppstarten: ett kort som försvinner efteråt går inte till graveyard av det', () => {
  app.oppstart = true;
  stamG([], hog(0)); klocka.t += 1000; stamG([], hog(1));
  app.oppstart = false;
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(1));
  const k = app.kort[0];
  klocka.t += 150; stamG([], hog(1)); klocka.t += 3100; stamG([], hog(1));
  assert.equal(k.zon, undefined); assert.ok(iHanden(k));
});
prov('UP7 provkortSpar: ett mätt spår före ett ur helbilden, inte skräp, inte i rutorna, samma kort som förra gången', () => {
  const hel = { id: 1, tillstand: 'klar', namn: 'Swamp', sen: null, ai: { helbild: true }, ...PORT };
  const matt = { id: 2, tillstand: 'ny', namn: null, sen: 30, ...LANGT };
  let r = app.provkortSpar([hel, matt], [], null, null);
  assert.equal(r.t.id, 2); assert.equal(r.matt, true);
  r = app.provkortSpar([hel], [], null, null);
  assert.equal(r.t.id, 1); assert.equal(r.matt, false);
  assert.equal(app.provkortSpar([{ id: 3, tillstand: 'skrap', sen: 10, ...PORT }], [], null, null), null);
  assert.equal(app.provkortSpar([matt], [{ x: 0.78, y: 0.08, w: 0.1, h: 0.14 }], null, null), null);
  r = app.provkortSpar([{ ...hel, sen: 40, ai: null }, matt], [], null, 1);
  assert.equal(r.t.id, 1);
});
prov('UP9 provkortSpar: förra spåret släpps när det är skymt och en dubblett går att mäta; den låsta platsen går före', () => {
  const skymd = { id: 1, tillstand: 'klar', namn: 'Plains', sen: 30, skymd: true, ...PORT };
  const dubb = { id: 2, tillstand: 'klar', namn: 'Plains', sen: 20, ...PORT };
  let r = app.provkortSpar([skymd, dubb], [], null, 1);
  assert.equal(r.t.id, 2); assert.equal(r.matt, true);
  r = app.provkortSpar([skymd], [], null, 1);
  assert.equal(r.t.id, 1); assert.equal(r.matt, false);
  const annat = { id: 5, tillstand: 'ny', namn: null, sen: 10, ...LANGT };
  r = app.provkortSpar([dubb, annat], [], null, null, PORT);
  assert.equal(r.t.id, 2); assert.equal(r.vidLas, true);
  r = app.provkortSpar([annat], [], null, null, PORT);
  assert.equal(r.t.id, 5); assert.equal(r.vidLas, false);
});
prov('UP10 provkortets lås: inte på ett spår som rör sig eller nuddar bildens kant, bara på ett stilla kort inne i bilden (MES-166)', () => {
  const las = spar => app.provLasSteg(null, app.provkortSpar(spar, [], null, null, null), false);
  /* Ett nyfött spår utan stilla-fältet (äldre telefon): 'ny' rör sig. */
  let p = app.provkortSpar([{ id: 1, tillstand: 'ny', sen: 20, ...PORT }], [], null, null);
  assert.equal(p.matt, true); assert.equal(p.lasbar, false); assert.equal(las([{ id: 1, tillstand: 'ny', sen: 20, ...PORT }]).las, null);
  /* Handen och kortet: stilla en stund, men lådan når nederkanten. */
  const hand = { id: 2, tillstand: 'stilla', stilla: true, sen: 20, ...box(0.3, 0.4, 0.3, 0.6) };
  p = app.provkortSpar([hand], [], null, null);
  assert.equal(p.lasbar, false); assert.equal(p.kant, true); assert.equal(las([hand]).las, null);
  /* Telefonen säger att ett läst kort rör sig: inget lås fast det inte är 'ny'. */
  assert.equal(las([{ id: 3, tillstand: 'klar', namn: 'Plains', stilla: false, sen: 20, ...PORT }]).las, null);
  /* Stilla inne i bilden: låst, med kortets egen ruta. */
  const r = las([{ id: 4, tillstand: 'stilla', stilla: true, sen: 20, ...PORT }]);
  assert.equal(r.ny, true); assert.equal(r.las.id, 4); assert.deepEqual(r.las.box, PORT);
  /* Ett stilla kort går före handen som fortfarande är i bild. */
  p = app.provkortSpar([{ id: 5, tillstand: 'ny', sen: 10, ...box(0.3, 0.3, 0.4, 0.7) }, { id: 4, tillstand: 'stilla', stilla: true, sen: 20, ...LANGT }], [], null, null);
  assert.equal(p.t.id, 4); assert.equal(p.lasbar, true);
});
prov('UP11 provkortets lås: rutan följer kortet, och handen över kortet släpper det inte', () => {
  const steg = (las, spar) => app.provLasSteg(las, app.provkortSpar(spar, [], null, las ? las.id : null, las ? las.box : null), false);
  const las = { id: 1, box: PORT, n: 7 };
  /* Samma kort, lite förskjutet: samma lås (ingen ny animering), ny ruta. */
  const flytt = box(PORT.x + 0.01, PORT.y + 0.005, PORT.w, PORT.h);
  let r = steg(las, [{ id: 1, tillstand: 'klar', namn: 'Plains', stilla: true, sen: 20, ...flytt }]);
  assert.equal(r.ny, false); assert.equal(r.las.n, 7); assert.deepEqual(r.las.box, flytt);
  /* Handen täcker kortet: kortets spår skymt, handens klump rör sig. Låset står. */
  r = steg(las, [{ id: 1, tillstand: 'klar', namn: 'Plains', stilla: true, skymd: true, sen: 900, ...PORT }, { id: 6, tillstand: 'ny', stilla: false, sen: 10, ...box(0.35, 0.35, 0.3, 0.65) }]);
  assert.equal(r.las, las);
  /* Medan telefonen räknar svaret rörs låset inte, vad bordet än säger. */
  assert.equal(app.provLasSteg(las, null, true).las, las);
});
prov('UP12 provkortets lås: ett flyttat kort låses på den nya platsen, och ett kort i rörelse släpper det gamla', () => {
  const steg = (las, spar) => app.provLasSteg(las, app.provkortSpar(spar, [], null, las ? las.id : null, las ? las.box : null), false);
  const las = { id: 1, box: PORT, n: 7 };
  /* Kortet är på väg: rör sig, och inget ligger över den gamla platsen. */
  assert.equal(steg(las, [{ id: 1, tillstand: 'klar', namn: 'Plains', stilla: false, sen: 10, ...LANGT }]).las, null);
  /* Kortet ligger stilla på den nya platsen medan handen fortfarande är över den gamla. */
  const r = steg(las, [{ id: 8, tillstand: 'ny', stilla: false, sen: 10, ...box(0.38, 0.38, 0.12, 0.62) }, { id: 1, tillstand: 'klar', namn: 'Plains', stilla: true, sen: 20, ...LANGT }]);
  assert.equal(r.ny, true); assert.equal(r.las.id, 1); assert.deepEqual(r.las.box, LANGT);
});
prov('UP13 provkortets lås: ett spår som blivit kvar utan region håller inte platsen, ett skymt gör det', () => {
  const steg = (las, spar) => app.provLasSteg(las, app.provkortSpar(spar, [], null, las ? las.id : null, las ? las.box : null), false);
  const las = { id: 1, box: PORT, n: 7 };
  assert.equal(steg(las, [{ id: 1, tillstand: 'klar', namn: 'Plains', stilla: true, sen: 2500, ...PORT }]).las, null);
  assert.equal(steg(las, [{ id: 1, tillstand: 'klar', namn: 'Plains', stilla: true, skymd: true, sen: 2500, ...PORT }]).las, las);
  assert.equal(steg(las, []).las, null);
});
/* MES-171: steg 4 i Use camera to add cards ('skarm'). Spärren läser bara
   att uppstarten pågår, inte läget — här provat i det läget. */
prov('UP14 Use camera to add cards, steg 4 pågår: inget nytt kort, ingen granskning, men spåren följs', () => {
  app.spelsatt = 'skarm'; app.oppstart = true;
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  const okand = { id: 2, tillstand: 'okand', namn: null, sen: 20, ...LANGT };
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT }), okand]);
  klocka.t += 5000; stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT }), okand]);
  assert.equal(app.kort.length, 0); assert.equal(app.pending.length, 0);
  assert.deepEqual(app.spar.map(t => t.id), [1, 2]);
  /* Samma bord när uppstarten är klar: läget lägger till kort. */
  app.oppstart = false;
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  assert.deepEqual(app.kort.map(k => k.name), ['Ukud Cobra']);
});
prov('UP15 Use camera to add cards, Start playing: provkortet och ett andra spår ovanpå spelas inte ut, ett annat kort gör det', () => {
  app.spelsatt = 'skarm'; app.oppstart = true;
  const spar = [klar(1, 'Ukud Cobra', { sen: 20, ...PORT }), klar(2, 'Ukud Cobra', { sen: 20, ...LAND_ }), klar(3, 'Swamp', { sen: 20, ...LANGT })];
  stam(spar);
  for (const id of app.provkortUt(app.spar, 1)) app.borttagna.add(id);
  app.oppstart = false;
  stam(spar); klocka.t += 5000; stam(spar);
  assert.deepEqual(app.kort.map(k => k.name), ['Swamp']); assert.equal(app.pending.length, 0);
  /* Provkortet lyfts och blandas in: spärren släpper, och samma namn spelas senare som ett nytt kort. */
  klocka.t += 150; stam([klar(3, 'Swamp', { sen: 20, ...LANGT })]);
  assert.ok(!app.borttagna.has(1) && !app.borttagna.has(2));
  klocka.t += 150; stam([klar(3, 'Swamp', { sen: 20, ...LANGT }), klar(4, 'Ukud Cobra', { sen: 20, ...box(0.1, 0.1, 0.063, 0.088) })]);
  assert.deepEqual(app.kort.map(k => k.name).sort(), ['Swamp', 'Ukud Cobra']);
});
prov('UP16 steg 4 klart: Start playing, eller rutorna på raden från en annan dator — och alltid i Mirror my table', () => {
  const k = app.oppSteg4Klar;
  /* Use camera to add cards: ett nytt spel (lage 'skarm' innan läget valts, MES-192) och ett valt läge utan rutor. */
  assert.equal(k({}, false, null, false), false);
  assert.equal(k({ lage: true, lekOk: true }, false, null, false), false);
  assert.equal(k({ lage: true, b4: true, provKlar: true, gravKlar: true, bibKlar: true }, false, null, true), false, 'allt klart men Start playing inte tryckt');
  assert.equal(k({ lage: true, b4: true, startat: true }, false, null, true), true);
  /* Raden har rutorna från en annan dator: klart utan vinkel — men inte om steget börjats här eller görs om. */
  assert.equal(k({}, false, null, true), true);
  assert.equal(k({ b4: true }, false, 20, true), false);
  assert.equal(k({ grundOm: true }, false, 20, true), false);
  /* Mirror my table har inget steg 4 (MES-334 steg 6): alltid klart, med eller utan vinkel och rutor. */
  assert.equal(k({}, true, null, false), true);
  assert.equal(k({ b4: true, grundOm: true }, true, null, false), true);
  assert.equal(k({ utan4: true }, false, null, false), true);
});
prov('UP17 uppstarten öppnas igen: klar i Use camera to add cards före steg 4 kräver inte steget; Redo setup gör om det', () => {
  const igen = (o, om, lage) => Object.assign({}, o, app.oppOppnasIgen(o, om, lage));
  const fore = { lekOk: true, lage: true, klar: true };
  let o = igen(fore, false, 'skarm');
  assert.equal(o.klar, false); assert.equal(o.utan4, true); assert.equal(app.oppSteg4Klar(o, false, null, false), true);
  /* Redo setup: steg 4 görs om, också när raden har rutorna. */
  o = igen(o, true, 'skarm');
  assert.equal(o.utan4, false); assert.equal(o.lage, false); assert.equal(app.oppSteg4Klar(o, false, null, true), false);
  assert.equal(app.oppSteg4Klar(igen(fore, true, 'bord'), true, null, false), true, 'Redo setup i Mirror my table: inget steg 4 att göra om');
  /* Klar med Start playing, i Mirror my table, eller inte klar: ingen vakt. */
  assert.equal(igen({ ...fore, startat: true }, false, 'skarm').utan4, undefined);
  assert.equal(igen(fore, false, 'bord').utan4, undefined);
  assert.equal(igen({ lekOk: true, lage: true, b4: true }, false, 'skarm').utan4, undefined);
  assert.equal(igen({ lekOk: true, avbojd: true }, false, 'skarm').utan4, undefined);
});
prov('UP8 lägesbytet spelar upp bordet medan uppstarten pågår: inget kort', () => {
  app.oppstart = true;
  app.avstamBord([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  assert.equal(app.kort.length, 0);
});
prov('UP18 Mirror my table utan steg 4 (MES-334 steg 6): uppstarten klar så fort leken, läget och telefonen är klara — då spelas kort ut', () => {
  app.spelsatt = 'bord';
  assert.equal(app.oppSteg4Klar({ lekOk: true, lage: true }, true, null, false), true, 'steg 4 klart utan provkort och rutor');
  app.oppstart = false;
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  assert.deepEqual(app.kort.map(k => k.name), ['Ukud Cobra']);
});

/* B4 (MES-294, Jespers beslut 4 2026-09-24, regel 1): spärren "ett osäkert
   spår som ligger på ett klart kort med samma namn är samma kort" jämför med
   det namn granskningsposten skulle VISA — kandidatlistans etta, och en
   väntande posts egen lista — inte bara med spårets eget namn och
   ledtråden. Platsen är sammaPlats som förut (två färska spår är inte samma
   kort), och regel 2 (mer än 70 % täckning är ett kort, oavsett namn) togs
   inte. Regeln ändrar bara något när namnet posten visar skiljer sig från
   spårets eget och ledtrådens — B4a, B4b, B4d:s tredje del och B4e fäller
   på main. B4c och B4d:s två första delar visar att fästa kort och
   landhögen är som förut, B4e att regeln går ihop med väntan (MES-291). */
const osaker = (id, rest) => Object.assign({ id, tillstand: 'okand', saker: false, gissning: null, tappad: false, sen: 10 }, LAND_, rest);
prov('B4a antalspriorn tog spårets namn men lämnade kortet överst i listan: posten hade frågat om kortet den ligger på — ingen post', () => {
  /* priorPaGissningar på telefonen: alla lekens exemplar är säkra, så namnet
     tas bort — men är det enda förslaget står det kvar överst (namn null). */
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  stam([klar(1, 'Ukud Cobra', { skymd: true, sen: 1500, ...PORT }), osaker(2, { namn: null, cands: [{ name: 'Ukud Cobra', score: 0.4 }] })]);
  assert.equal(app.pending.length, 0, 'en post som frågar om kortet den ligger på');
  assert.equal(app.kort.length, 1); assert.equal(app.chip.kamSer, 1, 'kameran ser två kort');
});
prov('B4b en väntande post som visar namnet på kortet den ligger på tas bort; spårets nya läsning får en egen post', () => {
  /* Båda färska när posten lades (kanske två kort): "Ukud Cobra?". Spåret
     läses om, fortfarande osäkert, till ett annat namn — posten står kvar
     med den lista den fick. */
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT }), osaker(2, { namn: 'Ukud Cobra', cands: [{ name: 'Ukud Cobra', score: 0.4 }] })]);
  assert.equal(app.pending.length, 1); assert.equal(app.pending[0].cands[0].name, 'Ukud Cobra');
  const omlast = { namn: 'Llanowar Elves', cands: [{ name: 'Llanowar Elves', score: 0.4 }, { name: 'Ukud Cobra', score: 0.3 }] };
  stam([klar(1, 'Ukud Cobra', { skymd: true, sen: 1500, ...PORT }), osaker(2, omlast)]);
  assert.equal(app.pending.length, 0, 'posten "Ukud Cobra?" på Ukud Cobra står kvar');
  /* Ett kort som lagts ovanpå göms inte: nästa rapport frågar om det spåret nu läser. */
  stam([klar(1, 'Ukud Cobra', { skymd: true, sen: 1650, ...PORT }), osaker(2, omlast)]);
  assert.equal(app.pending.length, 1); assert.equal(app.pending[0].cands[0].name, 'Llanowar Elves');
  assert.equal(app.kort.length, 1);
});
prov('B4c ett equipment och en aura på en varelse slås inte ihop med den, fast de täcker den till mer än 70 % och varelsen står tvåa i listan', () => {
  const vard = klar(1, 'Danitha Capashen, Paragon', { skymd: true, sen: 1500, ...PORT });
  const blad = box(0.404, 0.408, 0.063, 0.088), aura = box(0.396, 0.392, 0.063, 0.088);   // förskjutna så att namnraden syns
  assert.ok(app.tackning(blad, PORT) > 0.7 && app.tackning(aura, PORT) > 0.7, 'täcker mer än 70 %');
  const danitha = { name: 'Danitha Capashen, Paragon', score: 0.3 };
  const b = osaker(2, { ...blad, namn: 'Ancestral Blade', cands: [{ name: 'Ancestral Blade', score: 0.4 }, danitha] });
  const p = osaker(3, { ...aura, namn: 'Pacifism', cands: [{ name: 'Pacifism', score: 0.4 }, danitha] });
  stam([vard, b, p]);
  assert.deepEqual(app.pending.map(q => q.cands[0].name).sort(), ['Ancestral Blade', 'Pacifism']);
  /* Blir de säkra är de egna kort bredvid värden. */
  stam([vard, Object.assign({}, b, { tillstand: 'klar', saker: true }), Object.assign({}, p, { tillstand: 'klar', saker: true })]);
  assert.deepEqual(app.kort.map(c => c.name).sort(), ['Ancestral Blade', 'Danitha Capashen, Paragon', 'Pacifism']);
  assert.equal(app.pending.length, 0);
});
prov('B4d landhögen: ett andra Swamp omlott med det första, osäkert med Swamp överst — samma som på main utom när antalspriorn tagit namnet', () => {
  const undre = box(0.2, 0.2, 0.05, 0.07), ovre = box(0.2, 0.215, 0.05, 0.07);   // som S13: förskjutet en femtedel
  const andra = rest => osaker(2, Object.assign({ ...ovre, namn: 'Swamp', cands: [{ name: 'Swamp', score: 0.4 }, { name: 'Plains', score: 0.3 }] }, rest));
  /* Båda färska: detektorn ser två kort — det andra exemplaret får sin post, som på main. */
  stam([klar(1, 'Swamp', { sen: 10, ...undre }), andra()]);
  assert.equal(app.pending.length, 1, 'det andra exemplaret fick ingen post'); assert.equal(app.kort.length, 1);
  /* Det undre utan region (sen över FARSK_MS): samma kort — så gör main redan, regel 1 ändrar det inte. */
  stam([klar(1, 'Swamp', { skymd: true, sen: 900, ...undre }), andra()]);
  assert.equal(app.pending.length, 0); assert.equal(app.kort.length, 1);
  /* Det enda som ändras: antalspriorn har tagit namnet (lekens alla Swamp ligger
     säkra) och Swamp står kvar överst. Main lade en post, regel 1 räknar det som
     samma kort — ett riktigt exemplar till syns då först när det läses säkert. */
  app.nollstall(); klocka.t = 1e6;
  stam([klar(1, 'Swamp', { sen: 10, ...undre })]);
  stam([klar(1, 'Swamp', { skymd: true, sen: 900, ...undre }), andra({ namn: null, cands: [{ name: 'Swamp', score: 0.4 }] })]);
  assert.equal(app.pending.length, 0, 'posten "Swamp?" på Swamp, som på main'); assert.equal(app.kort.length, 1);
  /* Läses det säkert är det ett kort till, också när det undre är färskt. */
  stam([klar(1, 'Swamp', { sen: 10, ...undre }), klar(2, 'Swamp', { sen: 10, ...ovre })]);
  assert.equal(app.kort.length, 2);
});
prov('B4e med väntan (MES-291): det klara spåret dör medan det osäkra ligger kvar — posten kommer, och svaret tar kortet i väntan', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  const k = app.kort[0];
  const o = osaker(2, { namn: null, cands: [{ name: 'Ukud Cobra', score: 0.4 }] });
  klocka.t += 150; stam([klar(1, 'Ukud Cobra', { skymd: true, sen: 900, ...PORT }), o]);
  assert.equal(app.pending.length, 0, 'samma kort');
  klocka.t += 150; stam([o]);                                  // det klara spåret dör: kortet väntar
  assert.ok(k.borta, 'väntar inte'); assert.equal(k.lyft, undefined);
  assert.equal(app.pending.length, 1, 'ingen post när kortet under är borta');
  klocka.t += 1000; app.namnge(app.pending[0], 'Ukud Cobra');
  assert.equal(app.kort.length, 1, 'ett andra Ukud Cobra'); assert.equal(k.spar, 2); assert.equal(k.borta, undefined);
  klocka.t += 3000; stam([Object.assign({}, o, { tillstand: 'klar', namn: 'Ukud Cobra', saker: true, varfor: 'hand' })]);
  assert.equal(app.kort.length, 1); assert.equal(k.lyft, undefined, 'tonades ned');
});

// ── GY: graveyard ur spelet (MES-334 sida 5, steg 4) ─────────────────
/* Leken ligger mitt i bilden (steg 3:s bibHog med kamerans läge), landen till höger om den. Ett kort är
   0,063 × 0,088 av bilden; kam är mitten. kort(x, y) är ett spår vars mitt ligger där. */
const kortVid = (x, y, w = 0.063, h = 0.088) => box(x - w / 2, y - h / 2, w, h);
const LEK = { id: 1, upp: 0, kam: { x: 0.5, y: 0.7, w: 0.063, h: 0.088, nar: 1 } };
const gyStart = () => { app.gravFlode = true; app.gravSpeglar = true; app.bib = LEK; };
const fraga = () => app.grav.fraga;
const namnPa = cids => (cids || []).map(cid => (app.kort.find(c => c.cid === cid) || {}).name);
prov('GY1 sidoregeln: första kortet på andra sidan om leken från landen, i lekens rad, ger frågan', () => {
  gyStart();
  stam([klar(1, 'Forest', { sen: 10, ...kortVid(0.62, 0.7) }), klar(2, 'Plains', { sen: 10, ...kortVid(0.7, 0.7) })]);
  assert.equal(fraga(), null, 'land ger ingen fråga');
  klocka.t += 2000;
  stam([klar(1, 'Forest', { sen: 10, ...kortVid(0.62, 0.7) }), klar(2, 'Plains', { sen: 10, ...kortVid(0.7, 0.7) }), klar(3, 'Ukud Cobra', { sen: 10, ...kortVid(0.38, 0.71) })]);
  assert.ok(fraga(), 'ingen fråga'); assert.equal(fraga().orsak, 'sida'); assert.deepEqual(namnPa(fraga().cids), ['Ukud Cobra']);
  assert.equal(app.kort.find(c => c.name === 'Ukud Cobra').zon, undefined, 'graveyard före Yes');
});
prov('GY1b sidoregeln: ett kort i raden ovanför leken (del A: 3 och 2 fel frågor) och på landsidan ger ingen fråga', () => {
  gyStart();
  stam([klar(1, 'Forest', { sen: 10, ...kortVid(0.62, 0.7) }), klar(3, 'Ukud Cobra', { sen: 10, ...kortVid(0.38, 0.55) }), klar(4, 'Pacifism', { sen: 10, ...kortVid(0.8, 0.7) })]);
  assert.equal(fraga(), null);
});
prov('GY1c sidoregeln: land på båda sidor, inget land, eller ingen lek — ingen fråga', () => {
  gyStart();
  stam([klar(1, 'Forest', { sen: 10, ...kortVid(0.62, 0.7) }), klar(2, 'Plains', { sen: 10, ...kortVid(0.3, 0.7) }), klar(3, 'Ukud Cobra', { sen: 10, ...kortVid(0.38, 0.71) })]);
  assert.equal(fraga(), null, 'land på båda sidor');
  app.nollstall(); gyStart();
  stam([klar(3, 'Ukud Cobra', { sen: 10, ...kortVid(0.38, 0.71) })]);
  assert.equal(fraga(), null, 'inget land');
  app.nollstall(); app.gravFlode = true;
  stam([klar(1, 'Forest', { sen: 10, ...kortVid(0.62, 0.7) }), klar(3, 'Ukud Cobra', { sen: 10, ...kortVid(0.38, 0.71) })]);
  assert.equal(fraga(), null, 'ingen lek');
});
prov('GY1d sidoregeln i spelarens led: bilden vriden ett kvarts varv — landen "till höger" ligger nedåt i bilden', () => {
  gyStart(); app.vand = 90;
  app.bib = { id: 1, upp: 0, kam: { x: 0.5, y: 0.5, w: 0.088, h: 0.063, nar: 1 } };
  stam([klar(1, 'Forest', { sen: 10, ...kortVid(0.5, 0.65, 0.088, 0.063) }), klar(3, 'Ukud Cobra', { sen: 10, ...kortVid(0.51, 0.35, 0.088, 0.063) })]);
  assert.ok(fraga(), 'ingen fråga i den vridna bilden'); assert.equal(fraga().orsak, 'sida');
});
prov('GY2 reserven: ett kort rakt ovanpå ett annat ger frågan, kortet under är graveyards första', () => {
  gyStart(); app.bib = null;
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...kortVid(0.3, 0.3) })]);
  klocka.t += 3000;
  stam([klar(2, 'Pacifism', { sen: 10, ...kortVid(0.302, 0.303) })]);
  assert.ok(fraga(), 'ingen fråga'); assert.equal(fraga().orsak, 'ovanpa'); assert.deepEqual(namnPa(fraga().cids), ['Ukud Cobra', 'Pacifism']);
});
prov('GY2b reserven: fäst (sticker ut 15 %) och land på land ger ingen fråga; kortet under får ha legat länge', () => {
  gyStart(); app.bib = null;
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...kortVid(0.3, 0.3) })]);
  klocka.t += 3000;
  stam([klar(1, 'Ukud Cobra', { skymd: true, sen: 900, ...kortVid(0.3, 0.3) }), klar(2, 'Valkyrie\'s Sword', { sen: 10, ...kortVid(0.3, 0.3 + 0.15 * 0.088) })]);
  assert.equal(fraga(), null, 'fäst');
  app.nollstall(); gyStart(); app.bib = null;
  stam([klar(1, 'Forest', { sen: 10, ...kortVid(0.3, 0.3) })]);
  klocka.t += 3000;
  stam([klar(2, 'Plains', { sen: 10, ...kortVid(0.3, 0.3) })]);
  assert.equal(fraga(), null, 'land på land');
  app.nollstall(); gyStart(); app.bib = null;
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...kortVid(0.3, 0.3) })]);
  klocka.t += 20000;                                     // kortet under har legat i 20 s: det som räknas är att kortet OVANPÅ är nytt
  stam([klar(2, 'Pacifism', { sen: 10, ...kortVid(0.3, 0.3) })]);
  assert.ok(fraga(), 'kortet ovanpå är nytt, kortet under får vara gammalt');
});
prov('GY3 medan frågan står: kort som läggs på högen hör till samma fråga, ett kort bredvid gör det inte', () => {
  gyStart(); app.bib = null;
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...kortVid(0.3, 0.3) })]);
  klocka.t += 3000;
  stam([klar(2, 'Pacifism', { sen: 10, ...kortVid(0.3, 0.3) })]);
  const id = fraga().id;
  klocka.t += 3000;
  stam([klar(2, 'Pacifism', { sen: 10, ...kortVid(0.3, 0.3) }), klar(3, 'Killing Glare', { sen: 10, ...kortVid(0.305, 0.31) }), klar(4, 'Serpent Assassin', { sen: 10, ...kortVid(0.6, 0.3) })]);
  assert.equal(fraga().id, id); assert.deepEqual(namnPa(fraga().cids), ['Ukud Cobra', 'Pacifism', 'Killing Glare']);
});
prov('GY8 ett kort som FLYTTAS till andra sidan om leken (en varelse som dör) ger frågan — samma kort, inget nytt spår', () => {
  gyStart();
  const land = [klar(1, 'Forest', { sen: 10, ...kortVid(0.62, 0.7) }), klar(2, 'Plains', { sen: 10, ...kortVid(0.7, 0.7) })];
  stam(land.concat([klar(3, 'Ukud Cobra', { sen: 10, ...kortVid(0.45, 0.45) })]));   // i spel, ovanför lekens rad: ingen fråga
  assert.equal(fraga(), null, 'frågade när varelsen spelades');
  klocka.t += 20000;                                      // långt efter att den lades ut
  stam(land.concat([klar(3, 'Ukud Cobra', { sen: 10, ...kortVid(0.452, 0.452) })]));  // darr: inget
  assert.equal(fraga(), null, 'darr gav en fråga');
  klocka.t += 2000;
  stam(land.concat([klar(3, 'Ukud Cobra', { sen: 10, ...kortVid(0.38, 0.71) })]));    // varelsen dör: flyttas till graveyard-platsen
  assert.equal(app.kort.filter(c => c.name === 'Ukud Cobra').length, 1, 'ett andra Ukud Cobra');
  assert.ok(fraga(), 'flyttat kort gav ingen fråga'); assert.equal(fraga().orsak, 'flytt', 'bredvid library: Jespers regel för flyttade kort (GY12) går före sidoregeln'); assert.deepEqual(namnPa(fraga().cids), ['Ukud Cobra']);
});
prov('GY9 medan frågan står: ett kort som flyttas till högen hör till den; ett kort som flyttas ovanpå ett annat ger frågan', () => {
  gyStart(); app.bib = null;
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...kortVid(0.3, 0.3) }), klar(4, 'Serpent Assassin', { sen: 10, ...kortVid(0.6, 0.3) })]);
  klocka.t += 3000;
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...kortVid(0.3, 0.3) }), klar(4, 'Serpent Assassin', { sen: 10, ...kortVid(0.6, 0.3) }), klar(2, 'Pacifism', { sen: 10, ...kortVid(0.302, 0.303) })]);
  const id = fraga().id;
  klocka.t += 20000;
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...kortVid(0.3, 0.3) }), klar(2, 'Pacifism', { sen: 10, ...kortVid(0.302, 0.303) }), klar(4, 'Serpent Assassin', { sen: 10, ...kortVid(0.305, 0.305) })]);
  assert.equal(fraga().id, id); assert.deepEqual(namnPa(fraga().cids), ['Ukud Cobra', 'Pacifism', 'Serpent Assassin']);
  /* Utan stående fråga: ett gammalt kort som flyttas rakt ovanpå ett annat — reserven gäller också flyttade kort. */
  app.nollstall(); gyStart(); app.bib = null;
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...kortVid(0.3, 0.3) }), klar(4, 'Serpent Assassin', { sen: 10, ...kortVid(0.6, 0.3) })]);
  klocka.t += 20000;
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...kortVid(0.3, 0.3) }), klar(4, 'Serpent Assassin', { sen: 10, ...kortVid(0.302, 0.302) })]);
  assert.ok(fraga(), 'flyttat ovanpå gav ingen fråga'); assert.equal(fraga().orsak, 'ovanpa'); assert.deepEqual(namnPa(fraga().cids), ['Ukud Cobra', 'Serpent Assassin']);
});
prov('GY10 (granskningen av rättelsen, fynd 1) ett kort som rättas till inom frågans hög står bara en gång i frågan', () => {
  gyStart(); app.bib = null;
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...kortVid(0.3, 0.3) })]);
  klocka.t += 3000;
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...kortVid(0.3, 0.3) }), klar(2, 'Pacifism', { sen: 10, ...kortVid(0.302, 0.303) })]);
  klocka.t += 2000;
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...kortVid(0.3, 0.3) }), klar(2, 'Pacifism', { sen: 10, ...kortVid(0.302 + 0.04, 0.303) })]);   // rättas till ~0,6 kortbredd, mitten kvar i högen
  assert.deepEqual(namnPa(fraga().cids), ['Ukud Cobra', 'Pacifism'], 'kortet står två gånger');
});
prov('GY11 (granskningen av rättelsen, fynd 2) kameran som flyttar sig flyttar alla kort på en gång — ingen fråga; en ny referensbild glömmer lägena', () => {
  gyStart();
  const bord = d => [klar(1, 'Forest', { sen: 10, ...kortVid(0.62 + d, 0.7) }), klar(2, 'Plains', { sen: 10, ...kortVid(0.7 + d, 0.7) }),
                     klar(3, 'Ukud Cobra', { sen: 10, ...kortVid(0.3 + d, 0.3) }), klar(4, 'Pacifism', { sen: 10, ...kortVid(0.302 + d, 0.302) })];
  stam(bord(0));
  klocka.t += 20000;
  app.grav.fraga = null; app.grav.sida = false;
  stam(bord(0.06));                                       // knuffad: allt 0,06 åt sidan i samma meddelande
  assert.equal(fraga(), null, 'kameran som flyttade sig gav en fråga');
  klocka.t += 2000;
  stam(bord(0.06), 'ljus'); stam(bord(0.1), 'kort');       // ny referensbild: lägena glöms, och nästa läge är inget flytt
  assert.equal(fraga(), null, 'en ny referensbild gav en fråga');
});
prov('GY12 (Jesper 2026-10-06) ett kort som flyttas bredvid library — också på landsidan — ger frågan; flyttat långt bort gör det inte', () => {
  gyStart();
  const land = [klar(1, 'Forest', { sen: 10, ...kortVid(0.7, 0.7) }), klar(2, 'Plains', { sen: 10, ...kortVid(0.78, 0.7) })];
  stam(land.concat([klar(3, 'Ukud Cobra', { sen: 10, ...kortVid(0.45, 0.4) })]));
  klocka.t += 20000;
  stam(land.concat([klar(3, 'Ukud Cobra', { sen: 10, ...kortVid(0.45, 0.25) })]));          // flyttad, men inte bredvid library
  assert.equal(fraga(), null, 'flyttat långt från library gav en fråga');
  klocka.t += 2000;
  stam(land.concat([klar(3, 'Ukud Cobra', { sen: 10, ...kortVid(0.585, 0.702) })]));       // bredvid library, till höger (landsidan)
  assert.ok(fraga(), 'ingen fråga bredvid library'); assert.equal(fraga().orsak, 'flytt'); assert.deepEqual(namnPa(fraga().cids), ['Ukud Cobra']);
});
prov('GY13 (Jesper 2026-10-06) före Yes: ett instant som spelas och sedan flyttas bredvid library är samma kort och ger frågan — det går inte till graveyard digitalt', () => {
  gyStart(); app.typ = new Map([['Lightning Bolt', 'Instant']]);
  const land = [klar(1, 'Forest', { sen: 10, ...kortVid(0.7, 0.7) })];
  stam(land.concat([klar(3, 'Lightning Bolt', { sen: 10, ...kortVid(0.5, 0.35) })]));
  klocka.t += 1500; stam(land);                                                            // plockas upp
  klocka.t += 1200; stam(land.concat([klar(4, 'Lightning Bolt', { sen: 10, ...kortVid(0.415, 0.702) })]));   // läggs bredvid library
  klocka.t += 300; stam(land.concat([klar(4, 'Lightning Bolt', { sen: 10, ...kortVid(0.415, 0.702) })]));
  const bolt = app.kort.filter(c => c.name === 'Lightning Bolt');
  assert.equal(bolt.length, 1, 'två Lightning Bolt'); assert.notEqual(bolt[0].zon, 'grav', 'gick till graveyard före Yes');
  assert.ok(fraga(), 'ingen fråga'); assert.deepEqual(namnPa(fraga().cids), ['Lightning Bolt']);
});
prov('GY14 (granskningen av besluten, fynd 7) ett kort bredvid library som TAPPAS (vrids runt ett hörn, mitten flyttar ~1 kortbredd) ger ingen fråga', () => {
  gyStart();
  const land = [klar(1, 'Forest', { sen: 10, ...kortVid(0.7, 0.7) })];
  stam(land.concat([klar(3, 'Ukud Cobra', { sen: 10, ...kortVid(0.585, 0.702) })]));
  klocka.t += 20000; app.grav.fraga = null;
  stam(land.concat([klar(3, 'Ukud Cobra', { sen: 10, tappad: true, ...kortVid(0.585 + 0.04, 0.702 + 0.01, 0.088, 0.063) })]));   // tappat och lite förskjutet, kvar i lekens rad bredvid library
  assert.equal(fraga(), null, 'tappningen gav en fråga');
});
prov('GY15 (granskningen varv 2) en TAPPAD varelse som dör och läggs OTAPPAD bredvid library ger frågan — tappningsundantaget gäller bara en vridning', () => {
  gyStart();
  const land = [klar(1, 'Forest', { sen: 10, ...kortVid(0.62, 0.7) }), klar(2, 'Plains', { sen: 10, ...kortVid(0.7, 0.7) })];
  stam(land.concat([klar(3, 'Ukud Cobra', { sen: 10, ...kortVid(0.45, 0.45) })]));
  klocka.t += 20000;
  stam(land.concat([klar(3, 'Ukud Cobra', { sen: 10, tappad: true, ...kortVid(0.45 + 0.04, 0.45 + 0.01, 0.088, 0.063) })]));   // anfaller: tappad på plats
  klocka.t += 5000;
  stam(land.concat([klar(3, 'Ukud Cobra', { sen: 10, ...kortVid(0.38, 0.71) })]));    // dör: flyttas otappad till graveyard-platsen
  const c = app.kort.find(c => c.name === 'Ukud Cobra');
  assert.ok(fraga(), 'flyttat (och otappat) kort gav ingen fråga');
});



prov('GY16 (granskningen varv 2) en varelse tappas PÅ PLATS (anfaller), dör och skjuts TAPPAD bredvid library — ger frågan', () => {
  gyStart();
  const land = [klar(1, 'Forest', { sen: 10, ...kortVid(0.62, 0.7) }), klar(2, 'Plains', { sen: 10, ...kortVid(0.7, 0.7) })];
  stam(land.concat([klar(3, 'Ukud Cobra', { sen: 10, ...kortVid(0.45, 0.45) })]));
  klocka.t += 20000;
  stam(land.concat([klar(3, 'Ukud Cobra', { sen: 10, tappad: true, ...kortVid(0.452, 0.452, 0.088, 0.063) })]));
  klocka.t += 5000;
  stam(land.concat([klar(3, 'Ukud Cobra', { sen: 10, tappad: true, ...kortVid(0.38, 0.71, 0.088, 0.063) })]));
  assert.ok(fraga(), 'tappat kort flyttat till graveyard-platsen gav ingen fråga');
});
prov('GY4 Permanent: Mesa frågar en gång till när ett kort läggs ovanpå på samma plats, sedan aldrig', () => {
  gyStart(); app.bib = null;
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...kortVid(0.3, 0.3) })]);
  klocka.t += 3000;
  stam([klar(2, 'Pacifism', { sen: 10, ...kortVid(0.3, 0.3) })]);
  const q = fraga(); app.grav.nej.push({ kam: q.kam, typ: 'perm', igen: 0 }); app.grav.fraga = null;   // som gravSvar('perm')
  klocka.t += 3000;
  stam([klar(2, 'Pacifism', { sen: 10, ...kortVid(0.3, 0.3) }), klar(3, 'Killing Glare', { sen: 10, ...kortVid(0.302, 0.301) })]);
  assert.ok(fraga(), 'frågade inte igen'); assert.equal(fraga().igen, true); assert.ok(namnPa(fraga().cids).includes('Killing Glare'));
  app.grav.fraga = null;                                  // Permanent igen
  klocka.t += 3000;
  stam([klar(3, 'Killing Glare', { sen: 10, ...kortVid(0.302, 0.301) }), klar(4, 'Serpent Assassin', { sen: 10, ...kortVid(0.3, 0.3) })]);
  assert.equal(fraga(), null, 'frågade en tredje gång');
});
prov('GY5 Ignore this spot: spår där blir inga kort, och Mesa frågar aldrig om platsen', () => {
  gyStart(); app.bib = null;
  app.grav.nej.push({ kam: { x: 0.3, y: 0.3, w: 0.08, h: 0.1 }, typ: 'ign' });
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...kortVid(0.3, 0.3) }), klar(2, 'Pacifism', { sen: 10, ...kortVid(0.6, 0.3) })]);
  assert.deepEqual(app.kort.map(c => c.name), ['Pacifism']); assert.equal(fraga(), null);
});
prov('GY5b Ignore this spot glöms när kameran nollställer sig (ny referensbild, telefonen startade om), och filtrerar bara när kameran speglar mitt bord (granskningen av sida 5, V1; kontrollgranskningen N1)', () => {
  gyStart(); app.bib = null;
  app.grav.nej.push({ kam: { x: 0.3, y: 0.3, w: 0.08, h: 0.1 }, typ: 'ign' });
  app.gravFlode = false;                                  // Yes på en annan hög: flödet av, kameran speglar fortfarande
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...kortVid(0.3, 0.3) })]);
  assert.deepEqual(app.kort.map(c => c.name), [], 'efter Yes: platsen filtrerar fortfarande');
  app.gravSpeglar = false;                                // Screen leads, ingen telefon
  klocka.t += 150; stam([klar(1, 'Ukud Cobra', { sen: 10, ...kortVid(0.3, 0.3) })]);
  assert.deepEqual(app.kort.map(c => c.name), ['Ukud Cobra'], 'kameran speglar inte: platsen filtrerar inte');
  app.nollstall(); gyStart(); app.bib = null;
  app.grav.nej.push({ kam: { x: 0.3, y: 0.3, w: 0.08, h: 0.1 }, typ: 'ign' }, { kam: { x: 0.6, y: 0.3, w: 0.08, h: 0.1 }, typ: 'perm', igen: 0 });
  app.avstamBord([], true);                               // telefonen nollställde sig
  assert.equal(app.grav.nej.length, 0, 'platserna står kvar efter nollställningen');
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...kortVid(0.3, 0.3) })]);
  assert.deepEqual(app.kort.map(c => c.name), ['Ukud Cobra'], 'ett kort på den gamla platsen syns inte');
});
prov('GY7 (kontrollgranskningen N1, granskarens K1) Ignore this spot, sedan Yes på en annan hög: den ignorerade högen kommer inte tillbaka som kort i spel', () => {
  gyStart(); app.bib = null;
  const A1 = klar(1, 'Ukud Cobra', { sen: 10, ...kortVid(0.3, 0.3) }), A2 = klar(2, 'Pacifism', { sen: 10, ...kortVid(0.3, 0.3) });
  stam([A1]); klocka.t += 3000; stam([A1, A2]);
  const q = fraga(); assert.ok(q, 'ingen fråga');
  // som gravSvar('ign')
  const L = app.grav;
  L.nej.push({ kam: Object.assign({}, q.kam, { w: q.kam.w * 1.1, h: q.kam.h * 1.1 }), typ: 'ign' });
  for (const cid of q.cids) { const c = app.kort.find(x => x.cid === cid); if (c.spar != null) app.borttagna.add(c.spar); app.kort.splice(app.kort.indexOf(c), 1); }
  L.fraga = null;
  for (let i = 0; i < 5; i++) { klocka.t += 150; stam([A1, A2]); }
  assert.equal(app.kort.length, 0, 'kort kvar efter Ignore: ' + app.kort.map(c => c.name));
  // Yes på en annan hög: kamGravRad sätts, flödet av — kameran speglar fortfarande mitt bord
  app.gravFlode = false;
  klocka.t += 150; stam([A1, A2]);
  klocka.t += 150; stam([A1, A2]);
  assert.equal(app.kort.length, 0, 'den ignorerade högen kom tillbaka som kort i spel: ' + app.kort.map(c => c.name).join(', '));
});
prov('GY5c (kontrollgranskningen N6) Ignore this spot glöms när telefonen knuffats och tar en ny referensbild (fasen tillbaka till ljus efter kort), inte vid starten', () => {
  app.nollstall(); gyStart(); app.bib = null;
  app.grav.nej.push({ kam: { x: 0.3, y: 0.3, w: 0.08, h: 0.1 }, typ: 'ign' });
  app.avstamBord([], false, 'ljus');                      // kameran lär sig ljuset för första gången
  assert.equal(app.grav.nej.length, 1, 'platsen glömdes vid starten');
  stam([klar(1, 'Pacifism', { sen: 10, ...kortVid(0.6, 0.3) })]);
  klocka.t += 150; app.avstamBord([], false, 'ljus');     // "The picture has moved": ny referensbild
  assert.equal(app.grav.nej.length, 0, 'platsen står kvar efter omtagningen');
  klocka.t += 150; stam([klar(1, 'Pacifism', { sen: 10, ...kortVid(0.6, 0.3) }), klar(2, 'Ukud Cobra', { sen: 10, ...kortVid(0.3, 0.3) })]);
  assert.ok(app.kort.some(c => c.name === 'Ukud Cobra'), 'ett kort på den gamla platsen syns inte efter omtagningen');
});
prov('GY6 flödet av (uppstartens ruta, Screen leads, ingen telefon): ingen fråga', () => {
  app.bib = LEK;
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...kortVid(0.3, 0.3) })]);
  klocka.t += 3000;
  stam([klar(2, 'Pacifism', { sen: 10, ...kortVid(0.3, 0.3) })]);
  assert.equal(fraga(), null);
});

/* FL (MES-341, bordets minne): en flytt väntar inte på namnet, och dubbletten
   väntar på handen. Jesper 2026-10-06 (val 1 på sida 3). Ett namnlöst spår
   som telefonen ser som ett kort som ligger still (kortlik, vilar) på en tom
   plats, strax efter att ett korts spår dött, är det kortet: det bärs dit och
   namnet bekräftar — eller rättar — i efterhand. Vid tvekan binds inget. */
/* Ett vilande kort telefonen läst en gång utan att känna igen det (okand utan förslag): det är först
   då steg 3b binder — ett nytt eller stilla spår kan ännu säga emot kortet vid första läsningen. */
const vilande = (id, b, rest) => Object.assign({ id, tillstand: 'okand', namn: null, saker: false, cands: [], gissning: null, tappad: false, sen: 0, kortlik: true, vilar: true, skymd: false, vx: b.x + b.w / 2, vy: b.y + b.h / 2 }, b, rest);
const NY_PLATS = box(0.70, 0.40, 0.063, 0.088);
prov('FL1 flytt utan namn: spåret dör, ett namnlöst kort vilar på en tom plats — kortet bärs dit; samma namn bekräftar', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([vilande(2, NY_PLATS, { vilar: false })]);          // kortet lyft: spåret dör, något bärs
  klocka.t += 300; stam([vilande(2, NY_PLATS)]);                             // det vilar på nya platsen
  assert.equal(app.kort.length, 1); assert.equal(k.spar, 2, 'buret dit'); assert.equal(k.borta, undefined); assert.equal(k.lyft, undefined);
  assert.ok(Math.abs(k.kam.x - mitt(NY_PLATS)) < 1e-9, 'läget är nya platsen'); assert.ok(k.flyttFran, 'gissningen minns var kortet låg');
  assert.equal(app.pending.length, 0, 'ingen granskning för spåret');
  klocka.t += 2000; stam([klar(2, 'Ukud Cobra', { sen: 0, ...NY_PLATS, vx: mitt(NY_PLATS), vy: NY_PLATS.y + NY_PLATS.h / 2, vilar: true })]);   // namnet bekräftar
  assert.equal(app.kort.length, 1); assert.equal(k.spar, 2); assert.equal(k.flyttFran, undefined, 'bekräftad');
});
prov('FL2 rättelsen: ett annat säkert namn på spåret — kortet tillbaka där det låg och väntar som förut, det nya kortet får platsen', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([]);
  klocka.t += 300; stam([vilande(2, NY_PLATS)]);
  assert.equal(k.spar, 2);
  klocka.t += 1000; stam([klar(2, 'Grizzly Bears', { sen: 0, ...NY_PLATS })]);
  const g = app.kort.find(c => c.name === 'Grizzly Bears');
  assert.equal(app.kort.length, 2); assert.equal(g.spar, 2, 'det nya kortet tog spåret');
  assert.equal(k.spar, 1, 'tillbaka på det döda spåret'); assert.ok(k.borta, 'väntar'); assert.equal(k.lyft, undefined);
  assert.ok(Math.abs(k.kam.x - mitt(PORT)) < 1e-9, 'läget är det gamla'); assert.equal(k.flyttFran, undefined);
  klocka.t += 3000; stam([klar(2, 'Grizzly Bears', { sen: 0, ...NY_PLATS })]);
  assert.ok(iHanden(k), 'till handen när väntan tog slut, räknad från det första försvinnandet');
});
prov('FL3 högen upphäver flytten: graveyard växer i fönstret efter att spåret dog — kortet går dit, spåret blir fritt', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })], hog(0));
  const k = app.kort[0];
  klocka.t += 150; stamG([], hog(0));
  klocka.t += 300; stamG([vilande(2, NY_PLATS)], hog(0));
  assert.equal(k.spar, 2, 'buret dit innan högen hunnit växa');
  klocka.t += 1000; stamG([vilande(2, NY_PLATS)], hog(1));
  assert.equal(k.zon, 'grav', 'till graveyard'); assert.ok(k.gravAuto); assert.equal(k.spar, undefined); assert.equal(k.flyttFran, undefined);
  assert.ok(Math.abs(k.kam.x - mitt(PORT)) < 1e-9, 'läget är det gamla');
  assert.ok(!app.kort.some(c => c.spar === 2), 'spåret håller inget kort längre');
});
prov('FL4 tvekan: två kort med olika namn i väntan och ett spår, eller två spår för ett kort — inget binds; samma namn: det närmaste', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), klar(2, 'Grizzly Bears', { sen: 0, ...LANGT })]);
  klocka.t += 150; stam([]);
  klocka.t += 300; stam([vilande(3, NY_PLATS)]);
  assert.ok(app.kort.every(c => c.spar !== 3), 'olika namn: ingen tar spåret');
  app.nollstall(); klocka.t = 1e6;
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  klocka.t += 150; stam([]);
  klocka.t += 300; stam([vilande(2, NY_PLATS), vilande(3, box(0.70, 0.70, 0.063, 0.088))]);
  assert.equal(app.kort[0].spar, 1, 'två spår: inget binds');
  app.nollstall(); klocka.t = 1e6;
  const NARA = box(0.50, 0.40, 0.063, 0.088);
  stam([klar(1, 'Swamp', { sen: 0, ...PORT }), klar(2, 'Swamp', { sen: 0, ...LANGT })]);
  const a = app.kort.find(c => c.spar === 1), b = app.kort.find(c => c.spar === 2);
  klocka.t += 150; stam([]);
  klocka.t += 300; stam([vilande(3, NARA)]);
  assert.equal(a.spar, 3, 'samma namn: det närmaste (PORT) tar spåret'); assert.equal(b.spar, 2); assert.equal(app.kort.length, 2);
});
prov('FL5 platsen ska ha varit tom: ett spår som vilar där ett annat spår nyss låg (en landhög) binds inte — där ett känt kort ligger synligt binds det', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), { id: 9, tillstand: 'okand', namn: null, cands: [], sen: 0, ...NY_PLATS }]);
  klocka.t += 150; stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);       // det osäkra spåret dog
  klocka.t += 150; stam([]);
  klocka.t += 300; stam([vilande(2, NY_PLATS)]);
  assert.equal(app.kort[0].spar, 1, 'platsen var inte tom: inget binds');
  app.nollstall(); klocka.t = 1e6;
  const OVANPA = box(0.71, 0.42, 0.063, 0.088);
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), klar(5, 'Grizzly Bears', { sen: 0, ...NY_PLATS })]);
  klocka.t += 150; stam([klar(5, 'Grizzly Bears', { sen: 0, ...NY_PLATS })]);
  klocka.t += 300; stam([klar(5, 'Grizzly Bears', { sen: 0, ...NY_PLATS }), vilande(2, OVANPA)]);   // lagt delvis över björnen
  const k = app.kort.find(c => c.name === 'Ukud Cobra');
  assert.equal(k.spar, 2, 'ett känt kort som syns där är ingen rörig plats');
});
prov('FL6 fönstret: ett spår som fötts innan kortet senast sågs fritt är inte kortet som lyftes', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), vilande(2, NY_PLATS, { vilar: false })]);   // något annat är redan på väg
  klocka.t += 1000; stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), vilande(2, NY_PLATS, { vilar: false })]);
  klocka.t += 150; stam([vilande(2, NY_PLATS)]);                             // kortet lyft, det andra lägger sig
  assert.equal(app.kort[0].spar, 1, 'spåret är äldre än lyftet: inget binds');
});
prov('FL7 dubbletten väntar: kortet med namnet är i händerna (skymt) när ett klart spår med samma namn dyker upp — inget nytt förrän handen gått', () => {
  stam([klar(1, 'Swamp', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([klar(1, 'Swamp', { sen: 150, skymd: true, ...PORT }), klar(2, 'Swamp', { sen: 0, ...NY_PLATS })]);
  assert.equal(app.kort.length, 1, 'inget andra Swamp medan handen är på det första');
  klocka.t += 300; stam([klar(2, 'Swamp', { sen: 0, ...NY_PLATS })]);       // det gamla spåret dog: det var en flytt
  assert.equal(app.kort.length, 1); assert.equal(k.spar, 2, 'kortet bars dit'); assert.equal(k.lyft, undefined);
  app.nollstall(); klocka.t = 1e6;
  stam([klar(1, 'Swamp', { sen: 0, ...PORT })]);
  klocka.t += 150; stam([klar(1, 'Swamp', { sen: 150, skymd: true, ...PORT }), klar(2, 'Swamp', { sen: 0, ...NY_PLATS })]);
  klocka.t += 300; stam([klar(1, 'Swamp', { sen: 0, ...PORT }), klar(2, 'Swamp', { sen: 0, ...NY_PLATS })]);   // handen gick, kortet låg kvar
  assert.equal(app.kort.length, 2, 'två Swamp när det första syns fritt igen');
  app.nollstall(); klocka.t = 1e6;
  stam([klar(1, 'Swamp', { sen: 0, ...PORT })]);
  klocka.t += 150; stam([klar(1, 'Swamp', { sen: 150, skymd: true, ...PORT }), klar(2, 'Swamp', { sen: 0, ...NY_PLATS })]);
  klocka.t += 3100; stam([klar(1, 'Swamp', { sen: 3250, skymd: true, ...PORT }), klar(2, 'Swamp', { sen: 0, ...NY_PLATS })]);
  assert.equal(app.kort.length, 2, 'väntan tar slut: det andra skapas fast handen ligger kvar');
});
prov('FL8 tap i spelarens ordning: tre land vrids ett i taget, så fort var sitt spår dömts — mitt i svepet', () => {
  const L = [box(0.2, 0.4, 0.063, 0.088), box(0.4, 0.4, 0.063, 0.088), box(0.6, 0.4, 0.063, 0.088)];
  stam(L.map((b, i) => klar(i + 1, 'Forest', { sen: 0, ...b })));
  const tappade = () => [1, 2, 3].map(id => app.kort.find(c => c.spar === id).tapped ? 1 : 0).join('');
  assert.equal(tappade(), '000');
  klocka.t += 150; stam([klar(1, 'Forest', { sen: 0, tappad: true, ...L[0] }), klar(2, 'Forest', { sen: 200, skymd: true, ...L[1] }), klar(3, 'Forest', { sen: 0, ...L[2] })]);
  assert.equal(tappade(), '100', 'det första vrids medan handen är på det andra');
  klocka.t += 150; stam([klar(1, 'Forest', { sen: 0, tappad: true, ...L[0] }), klar(2, 'Forest', { sen: 0, tappad: true, ...L[1] }), klar(3, 'Forest', { sen: 200, skymd: true, ...L[2] })]);
  assert.equal(tappade(), '110');
  klocka.t += 150; stam(L.map((b, i) => klar(i + 1, 'Forest', { sen: 0, tappad: true, ...b })));
  assert.equal(tappade(), '111');
});

/* H (MES-341, princip 3): handen fryser, den raderar inte. En hand är ett
   skymt spår eller ett spår som rör sig utan ett korts form. */
const hand = (id, b) => ({ id, tillstand: 'ny', namn: null, saker: false, tappad: false, sen: 0, kortlik: false, vilar: false, skymd: false, ...b });
prov('H1 handen över korten: två skymda kort — ingenting ändras, ingen granskning, ingen nedtoning, läget och tap-läget står kvar', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), klar(2, 'Forest', { sen: 0, tappad: true, ...LAND_ })]);
  const fore = app.kort.map(c => [c.spar, c.kam.x, c.kam.y, c.tapped, c.lyft]);
  for (let i = 0; i < 20; i++) { klocka.t += 150; stam([klar(1, 'Ukud Cobra', { sen: 150 * (i + 1), skymd: true, ...PORT }), klar(2, 'Forest', { sen: 150 * (i + 1), skymd: true, tappad: true, ...LAND_ })]); }
  assert.deepEqual(app.kort.map(c => [c.spar, c.kam.x, c.kam.y, c.tapped, c.lyft]), fore, 'under handen (3 s)');
  assert.equal(app.pending.length, 0); assert.equal(app.kort.length, 2);
  klocka.t += 300; stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), klar(2, 'Forest', { sen: 0, tappad: true, ...LAND_ })]);
  assert.deepEqual(app.kort.map(c => [c.spar, c.kam.x, c.kam.y, c.tapped, c.lyft]), fore, 'handen borta: båda ligger kvar');
});
prov('H2 flytta med andra handen kvar: ett kort bärs utan namn medan en hand vilar på ett annat — det andra rörs inte', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), klar(2, 'Serra Angel', { sen: 0, ...LANGT })]);
  const u = app.kort.find(c => c.name === 'Ukud Cobra'), s = app.kort.find(c => c.name === 'Serra Angel');
  klocka.t += 150; stam([klar(2, 'Serra Angel', { sen: 150, skymd: true, ...LANGT })]);
  klocka.t += 300; stam([klar(2, 'Serra Angel', { sen: 450, skymd: true, ...LANGT }), vilande(3, NY_PLATS)]);
  assert.equal(u.spar, 3, 'Ukud buret dit'); assert.equal(s.spar, 2); assert.equal(s.lyft, undefined); assert.ok(Math.abs(s.kam.x - mitt(LANGT)) < 1e-9, 'Serra ligger kvar');
});
prov('H3 en hand nära platsen skjuter upp vägen till handen tills handen gått — utan tak', () => {
  const OVER = box(PORT.x - 0.02, PORT.y - 0.05, 0.12, 0.10);   // handen över platsen, utan ett korts form
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([hand(5, OVER)]);
  klocka.t += 3100; stam([hand(5, OVER)]);                      // väntan (3 s i provet) är slut, men handen är kvar
  assert.ok(k.borta, 'väntar ännu'); assert.ok(app.kort.includes(k), 'kvar under handen');
  klocka.t += 1000; stam([hand(5, OVER)]);
  assert.ok(app.kort.includes(k), 'fortfarande under handen');
  klocka.t += 150; stam([]);                                    // handen gick
  assert.ok(iHanden(k), 'till handen när handen gått'); assert.equal(k.spar, undefined);
  app.nollstall(); klocka.t = 1e6;
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const k2 = app.kort[0];
  klocka.t += 150; stam([hand(5, OVER)]);
  klocka.t += 3100; stam([hand(5, OVER)]);
  klocka.t += 5100; stam([hand(5, OVER)]);                      // handen blir kvar: inget tak (granskningen T1)
  klocka.t += 5000; stam([hand(5, OVER)]);
  assert.ok(app.kort.includes(k2) && k2.borta, 'orört så länge handen ligger kvar');
  klocka.t += 150; stam([]);
  assert.ok(iHanden(k2), 'till handen när handen gått');
  app.nollstall(); klocka.t = 1e6;
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const k3 = app.kort[0];
  klocka.t += 150; stam([hand(5, LANGT)]);                      // en hand långt bort spelar ingen roll
  klocka.t += 3100; stam([hand(5, LANGT)]);
  assert.ok(iHanden(k3), 'till handen: handen var inte nära');
});
prov('H4 högen är starkare än handen: graveyard växer medan handen är kvar över platsen — kortet går dit', () => {
  const OVER = box(PORT.x - 0.02, PORT.y - 0.05, 0.12, 0.10);
  stamG([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })], hog(0));
  const k = app.kort[0];
  klocka.t += 150; stamG([hand(5, OVER)], hog(0));
  klocka.t += 1000; stamG([hand(5, OVER)], hog(1));
  assert.equal(k.zon, 'grav'); assert.equal(k.lyft, undefined);
});

/* GR341 — den fristående granskningens prov (2026-10-07), rättelserna 1–6 i
   MES-341: en flytt utan namn tas tillbaka när spåret bär ett annat namn
   också utan att vara säkert (GRa2, GRa3); ett kort under en vilande hand
   är inte lyft förrän spåret dör (GRa4); nedvända kort binds aldrig (GRbak);
   tap-domen väntar på ett klart spår (GRd); kedjan minns ursprungsplatsen
   (GRk); en omladdning sparar platsen före flytten (GRr, slimKort). */
const P1 = box(0.55, 0.40, 0.063, 0.088), P2 = box(0.70, 0.60, 0.063, 0.088);
prov('GRa2 A lyfts, ett namnlöst kort läggs på ny plats; spåret blir okänt med gissningen Grizzly Bears — A tillbaka, spåret till granskningen; A väntar orört så länge spåret är oläst, och går till handen när det blivit ett annat kort', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([]);
  klocka.t += 300; stam([vilande(2, NY_PLATS)]);
  assert.equal(k.spar, 2, 'buret dit');
  const okand = () => vilande(2, NY_PLATS, { tillstand: 'okand', gissning: 'Grizzly Bears', cands: [{ name: 'Grizzly Bears', score: 0.8 }, { name: 'Ukud Cobra', score: 0.1 }] });
  klocka.t += 1000; stam([okand()]);
  assert.equal(k.spar, 1, 'tillbaka på det döda spåret'); assert.ok(k.borta); assert.equal(k.flyttFran, undefined);
  assert.ok(Math.abs(k.kam.x - mitt(PORT)) < 1e-9, 'på sin gamla plats'); assert.equal(app.pending.length, 1, 'spåret fick sin granskning');
  for (let i = 0; i < 10; i++) { klocka.t += 1000; stam([okand()]); }
  assert.ok(app.kort.includes(k) && k.spar === 1 && k.borta, 'osäkert betyder orört: A väntar så länge spåret är oläst'); assert.equal(app.kort.length, 1);
  klocka.t += 1000; stam([klar(2, 'Grizzly Bears', { sen: 0, ...NY_PLATS })]);   // spåret blev ett annat kort
  assert.equal(app.kort.filter(c => c.name === 'Grizzly Bears').length, 1);
  assert.ok(iHanden(k), 'A till handen när inget oläst finns kvar');
});
prov('GRa3 samma, men spåret blir klart med Grizzly Bears UTAN saker — Grizzly Bears skapas, A tillbaka', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([]);
  klocka.t += 300; stam([vilande(2, NY_PLATS)]);
  klocka.t += 1000; stam([klar(2, 'Grizzly Bears', { sen: 0, saker: false, ...NY_PLATS })]);
  const g = app.kort.find(c => c.name === 'Grizzly Bears');
  assert.ok(g && g.spar === 2, 'Grizzly Bears på spåret'); assert.equal(k.spar, 1); assert.ok(Math.abs(k.kam.x - mitt(PORT)) < 1e-9);
});
prov('GRa4 handen vilar på A i 2 s, ett namnlöst kort läggs ut under tiden, sedan lyfts A — binds inte: kortet fanns före lyftet', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  for (let i = 1; i <= 6; i++) { klocka.t += 300; stam([klar(1, 'Ukud Cobra', { sen: 300 * i, skymd: true, ...PORT })]); }
  klocka.t += 300; stam([klar(1, 'Ukud Cobra', { sen: 2100, skymd: true, ...PORT }), vilande(2, NY_PLATS, { vilar: false })]);
  klocka.t += 300; stam([klar(1, 'Ukud Cobra', { sen: 2400, skymd: true, ...PORT }), vilande(2, NY_PLATS)]);
  klocka.t += 300; stam([vilande(2, NY_PLATS)]);
  assert.equal(k.spar, 1, 'A väntar på sitt döda spår'); assert.ok(k.borta);
});
prov('GRd ett tappat kort flyttas utan namn: tap-läget står kvar tills spåret är klart', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, tappad: true, ...PORT })]);
  const k = app.kort[0];
  assert.equal(k.tapped, 1);
  klocka.t += 150; stam([]);
  klocka.t += 300; stam([vilande(2, NY_PLATS, { tappad: false })]);
  assert.equal(k.spar, 2); assert.equal(k.tapped, 1, 'inte avtappat av spårets preliminära dom'); assert.equal(k.kamTap, 1);
  klocka.t += 1000; stam([klar(2, 'Ukud Cobra', { sen: 0, tappad: false, ...NY_PLATS })]);
  assert.equal(k.tapped, 0, 'klart spår: domen gäller');
});
prov('GRk kedja: lagt i två steg (P1, lyft igen, P2) och namnet säger ett annat kort — A tillbaka till ursprungsplatsen, inte mellanplatsen', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([]);
  klocka.t += 300; stam([vilande(2, P1)]); assert.equal(k.spar, 2);
  klocka.t += 500; stam([]);
  klocka.t += 300; stam([vilande(3, P2)]); assert.equal(k.spar, 3);
  assert.ok(Math.abs(k.flyttFran.kam.x - mitt(PORT)) < 1e-9, 'den första gissningen minns ursprungsplatsen');
  klocka.t += 500; stam([klar(3, 'Grizzly Bears', { sen: 0, ...P2 })]);
  assert.ok(Math.abs(k.kam.x - mitt(PORT)) < 1e-9, 'tillbaka till PORT'); assert.equal(k.spar, 1);
});
prov('GRbak ett nedvänt kort (baksida, kortlik, vilar) läggs ut när A lyfts: binds inte', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([]);
  klocka.t += 300; stam([vilande(2, NY_PLATS, { tillstand: 'stilla', ned: true })]);
  assert.equal(k.spar, 1); assert.ok(k.borta);
});
prov('GRf ett täckt kort i en hög (gi 1) vars spår dog medan det översta syns: inte i väntan — ett namnlöst kort tar det inte', () => {
  const UNDER = box(PORT.x + 0.005, PORT.y + 0.005, 0.063, 0.088);
  stam([klar(1, 'Swamp', { sen: 0, ...PORT, ai: { klunga: 1 } }), klar(2, 'Swamp', { sen: 0, ...UNDER, ai: { klunga: 2 } })]);
  const b = app.kort.find(c => c.spar === 2);
  klocka.t += 150; stam([klar(1, 'Swamp', { sen: 0, ...PORT, ai: { klunga: 1 } })]);
  klocka.t += 300; stam([klar(1, 'Swamp', { sen: 0, ...PORT, ai: { klunga: 1 } }), vilande(3, NY_PLATS)]);
  assert.equal(b.spar, 2, 'platsen är täckt av det synliga Swampet: ingen flytt utan namn');
});
prov('GRr omladdning mitt i en flytt utan namn: slimKort sparar platsen FÖRE flytten, så kortet ligger kvar där det låg', () => {
  const slim = src.slice(src.indexOf('function slimKort('), src.indexOf('\n}\n', src.indexOf('function slimKort(')) + 2);
  const slimKort = new Function(slim + '; return slimKort;')();
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([]);
  klocka.t += 300; stam([vilande(2, NY_PLATS)]);
  assert.equal(k.spar, 2);
  const sparat = slimKort([k])[0];
  assert.ok(Math.abs(sparat.kam.x - mitt(PORT)) < 1e-9, 'det sparade läget är platsen före flytten');
  assert.equal(sparat.flyttFran, undefined); assert.equal(sparat.spar, undefined);
});

/* V2 — kontrollgranskningen av mes-341-v2 (2026-10-07): kortet som syns igen
   på sin plats slår en gissad flytt (V2flimmer, V2flimmerNyId), och ett
   gissat spår som dör lägger tillbaka kortet (V2sparDor). */
const stillaSpar = (id, b, rest) => vilande(id, b, Object.assign({ tillstand: 'stilla' }, rest));
prov('V2flimmer A:s spår dör kort (flimmer), ett namnlöst stilla spår annanstans tar A; A:s spår kommer tillbaka klart med samma id — A tillbaka, ingen dubblett', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), vilande(2, NY_PLATS, { vilar: false })]);
  const k = app.kort[0];
  klocka.t += 150; stam([stillaSpar(2, NY_PLATS)]);
  assert.equal(k.spar, 2, 'gissningen');
  klocka.t += 600; stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), stillaSpar(2, NY_PLATS)]);
  assert.equal(app.kort.length, 1, 'dubblett'); assert.equal(k.spar, 1); assert.equal(k.flyttFran, undefined); assert.equal(k.borta, undefined);
  assert.ok(Math.abs(k.kam.x - mitt(PORT)) < 1e-9, 'tillbaka på sin plats');
  klocka.t += 1000; stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), vilande(2, NY_PLATS, { tillstand: 'okand', gissning: 'Grizzly Bears', cands: [{ name: 'Grizzly Bears', score: 0.8 }] })]);
  assert.equal(app.kort.filter(c => c.name === 'Ukud Cobra').length, 1); assert.equal(app.pending.length, 1, 'det andra spårets granskning');
});
prov('V2flimmerNyId samma, men det återkomna spåret har ett nytt id — ingen dubblett', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), vilande(2, NY_PLATS, { vilar: false })]);
  const k = app.kort[0];
  klocka.t += 150; stam([stillaSpar(2, NY_PLATS)]);
  assert.equal(k.spar, 2);
  klocka.t += 600; stam([klar(3, 'Ukud Cobra', { sen: 0, ...PORT }), stillaSpar(2, NY_PLATS)]);
  assert.equal(app.kort.filter(c => c.name === 'Ukud Cobra').length, 1, 'dubblett'); assert.equal(k.spar, 3); assert.equal(k.flyttFran, undefined);
});
prov('V2sparDor det gissade spåret dör utan namn: A tillbaka där det låg, och väntan räknas från det första försvinnandet', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([]);
  const borta0 = klocka.t;
  klocka.t += 600; stam([stillaSpar(2, NY_PLATS)]);
  assert.equal(k.spar, 2);
  klocka.t += 1000; stam([]);
  assert.equal(k.spar, 1); assert.equal(k.borta, borta0, 'väntan från det första försvinnandet'); assert.equal(k.flyttFran, undefined);
  assert.ok(Math.abs(k.kam.x - mitt(PORT)) < 1e-9, 'tillbaka där det låg');
  klocka.t += 1500; stam([]);                                   // 3,25 s efter det första försvinnandet: väntan (3 s i provet) slut
  assert.ok(iHanden(k), 'till handen när väntan tog slut');
});

/* TH — till handen (MES-343): fall 1, 2, 5, 7 och 8 ur dev/plan/spegelmattan-principer.md,
   orört-reglerna (något oläst, platsen täckt, vid kanten, namnet någon annanstans) och valen i raden.
   Väntan är 3 s i provet (BORTA_NAD i miljön), HAND_RAD_MS 6 s som i appen. */
prov('TH1 fall 1: platsen tom och ingen hand nära → kortet ur bordet och i raden, med borta0 = spårets död och nar = beslutet', () => {
  stam([klar(1, 'Wood Elves', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([]);
  const dog = klocka.t;
  klocka.t += 3100; stam([]);
  assert.ok(iHanden(k)); const h = app.handRad[0];
  assert.equal(h.borta0, dog); assert.equal(h.nar, klocka.t); assert.equal(h.namn, 'Wood Elves'); assert.equal(h.tok, false); assert.equal(h.i, 0);
  assert.equal(k.spar, undefined); assert.equal(k.borta, undefined);
});
prov('TH2 fall 2: lyft och lagt tillbaka nästan på samma plats inom väntan — ingenting', () => {
  stam([klar(1, 'Wood Elves', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([]);
  klocka.t += 1500; stam([klar(7, 'Wood Elves', { sen: 0, ...box(PORT.x + 0.005, PORT.y, PORT.w, PORT.h) })]);
  assert.equal(app.kort.length, 1); assert.equal(k.spar, 7); assert.equal(k.borta, undefined); assert.equal(app.handRad.length, 0);
  klocka.t += 5000; stam([klar(7, 'Wood Elves', { sen: 0, ...box(PORT.x + 0.005, PORT.y, PORT.w, PORT.h) })]);
  assert.equal(app.handRad.length, 0, 'aldrig till handen');
});
prov('TH5 fall 5: platsen täckt av ett annat synligt kort — kortet ligger kvar orört, ingen rad; lyfts täckaren binder kortets spår det igen', () => {
  stam([klar(1, 'Wood Elves', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  const over = klar(2, 'Pacifism', { sen: 0, ...box(PORT.x + 0.01, PORT.y + 0.01, PORT.w, PORT.h) });
  klocka.t += 150; stam([over]);
  klocka.t += 3100; stam([over]);
  klocka.t += 6000; stam([over]);
  assert.ok(app.kort.includes(k), 'kvar'); assert.equal(k.spar, 1, 'bundet till sitt döda spår'); assert.ok(k.borta); assert.equal(app.handRad.length, 0);
  assert.equal(app.kort.length, 2, 'täckaren är ett eget kort');
  klocka.t += 1000; stam([klar(9, 'Wood Elves', { sen: 0, ...PORT })]);   // täckaren lyfts, Wood Elves syns igen
  assert.equal(k.spar, 9); assert.equal(k.borta, undefined); assert.equal(app.kort.length, 2);
});
prov('TH6 något oläst med ett korts form, fött efter lyftet, håller kortet orört; blir det ett annat kort går kortet till handen', () => {
  stam([klar(1, 'Wood Elves', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([]);
  klocka.t += 2900; stam([{ id: 2, tillstand: 'ny', namn: null, saker: false, tappad: false, sen: 0, kortlik: true, vilar: true, skymd: false, ...LANGT }]);
  klocka.t += 300; stam([{ id: 2, tillstand: 'ny', namn: null, saker: false, tappad: false, sen: 0, kortlik: true, vilar: true, skymd: false, ...LANGT }]);
  assert.ok(app.kort.includes(k) && k.borta, 'väntar medan spåret läses'); assert.equal(app.handRad.length, 0);
  klocka.t += 500; stam([klar(2, 'Grizzly Bears', { sen: 0, ...LANGT })]);
  assert.ok(iHanden(k), 'till handen när det olästa blev ett annat kort'); assert.equal(app.kort.length, 1);
});
prov('TH6b ett oläst spår som fanns FÖRE lyftet håller inte kortet', () => {
  const olast = () => ({ id: 2, tillstand: 'ny', namn: null, saker: false, tappad: false, sen: 0, kortlik: true, vilar: true, skymd: false, ...LANGT });
  stam([klar(1, 'Wood Elves', { sen: 0, ...PORT }), olast()]);
  const k = app.kort[0];
  klocka.t += 2000; stam([klar(1, 'Wood Elves', { sen: 0, ...PORT }), olast()]);
  klocka.t += 150; stam([olast()]);
  klocka.t += 3100; stam([olast()]);
  assert.ok(iHanden(k));
});
prov('TH7 fall 7: en token lämnar bordet — ur bordet, raden med Ångra (tok), och Ångra lägger tillbaka den', () => {
  stam([klar(1, 'Soldier', { sen: 0, ...PORT })]);
  const k = app.kort[0]; k.tok = 1;
  klocka.t += 150; stam([]); klocka.t += 3100; stam([]);
  assert.ok(iHanden(k)); assert.equal(app.handRad[0].tok, true);
  assert.ok(app.handVal(k.cid, 'angra'));
  assert.ok(app.kort.includes(k)); assert.equal(app.handRad[0].val, 'angra');
});
prov('TH8 fall 8: tre spår dör samtidigt utan hög — ingenting ändras; när kameran ankrat om binder namnen korten igen', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), klar(2, 'Grizzly Bears', { sen: 0, ...LANGT }), klar(3, 'Llanowar Elves', { sen: 0, ...MITT })]);
  const av = n => app.kort.find(k => k.name === n), a = av('Ukud Cobra'), b = av('Grizzly Bears'), c = av('Llanowar Elves');
  klocka.t += 150; stam([]);
  klocka.t += 3100; stam([]);
  assert.equal(app.kort.length, 3); assert.equal(app.handRad.length, 0);
  for (const k of [a, b, c]) { assert.equal(k.spar, undefined); assert.ok(k.slappt); }
  klocka.t += 2000; stam([klar(11, 'Ukud Cobra', { sen: 0, ...PORT }), klar(12, 'Grizzly Bears', { sen: 0, ...LANGT }), klar(13, 'Llanowar Elves', { sen: 0, ...MITT })]);
  assert.equal(app.kort.length, 3); assert.equal(a.spar, 11); assert.equal(b.spar, 12); assert.equal(c.spar, 13); assert.equal(a.slappt, undefined);
});
prov('TH8b två spår som dör samtidigt är inte fall 8: båda till handen', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), klar(2, 'Grizzly Bears', { sen: 0, ...LANGT })]);
  klocka.t += 150; stam([]); klocka.t += 3100; stam([]);
  assert.equal(app.kort.length, 0); assert.equal(app.handRad.length, 2);
});
prov('TH9 vid kanten: spåret glider ut ur bilden och dör längre ut än kortet vilade — kortet ligger kvar orört', () => {
  const vid = box(0.40, 0.02, 0.063, 0.088);   // vilar nära kanten
  stam([klar(1, 'Wood Elves', { sen: 0, ...vid })]);
  const k = app.kort[0];
  klocka.t += 300; stam([klar(1, 'Wood Elves', { sen: 0, ...box(0.40, 0.0, 0.063, 0.088), vilar: false })]);   // skjuts ut: detektorns låda nuddar kanten
  klocka.t += 150; stam([]);
  klocka.t += 3100; stam([]);
  assert.ok(app.kort.includes(k) && k.borta, 'kvar, väntar'); assert.equal(app.handRad.length, 0);
});
prov('TH10 namnet syns någon annanstans som gissning på ett obundet spår: ledtråden binder det väntande kortet dit (flytten), ingen rad', () => {
  stam([klar(1, 'Wood Elves', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([]);
  const gissar = () => okant(2, { gissning: 'Wood Elves', cands: [{ name: 'Wood Elves', score: 0.5 }], provas: false, sen: 0, ...LANGT });
  klocka.t += 3100; stam([gissar()]);
  assert.equal(app.kort.length, 1); assert.equal(k.spar, 2, 'ledtråden band det väntande kortet'); assert.equal(k.borta, undefined); assert.equal(app.handRad.length, 0);
});
prov('TH11 raden: Still on the table lägger tillbaka kortet på sin plats i listan; efter bekräftelsen (HAND_RAD_SVAR_MS) är raden tom', () => {
  stam([klar(1, 'Forest', { sen: 0, ...PORT }), klar(2, 'Wood Elves', { sen: 0, ...LANGT }), klar(3, 'Swamp', { sen: 0, ...MITT })]);
  const k = app.kort.find(c => c.name === 'Wood Elves'), ordning = app.kort.map(c => c.name), plats = app.kort.indexOf(k);
  klocka.t += 150; stam([klar(1, 'Forest', { sen: 0, ...PORT }), klar(3, 'Swamp', { sen: 0, ...MITT })]);
  klocka.t += 3100; stam([klar(1, 'Forest', { sen: 0, ...PORT }), klar(3, 'Swamp', { sen: 0, ...MITT })]);
  assert.ok(iHanden(k)); assert.equal(app.handRad[0].i, plats);
  assert.ok(app.handVal(k.cid, 'kvar'));
  assert.deepEqual(app.kort.map(c => c.name), ordning, 'samma ordning som före');
  klocka.t += 1900; stam([klar(1, 'Forest', { sen: 0, ...PORT }), klar(3, 'Swamp', { sen: 0, ...MITT })]);
  assert.equal(app.handRad.length, 0, 'bekräftelsen borta');
  klocka.t += 3100; stam([klar(1, 'Forest', { sen: 0, ...PORT }), klar(3, 'Swamp', { sen: 0, ...MITT })]);
  assert.ok(app.kort.includes(k), 'kortet tillbaka utan spår ligger kvar: inget dött spår att vänta på');
});
prov('TH12 Screen leads: inget till handen, ingen rad', () => {
  app.spelsatt = 'skarm';
  stam([klar(1, 'Wood Elves', { sen: 0, ...PORT })]);
  klocka.t += 150; stam([]); klocka.t += 3100; stam([]);
  assert.equal(app.kort.length, 1); assert.equal(app.handRad.length, 0);
});
prov('TH13 efterskottet räknar kortet i raden som en granne: två kort borta och en ändring — ingen får högen', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT }), klar(2, 'Grizzly Bears', { sen: 20, ...LANGT })], hog(0));
  klocka.t += 150; stamG([], hog(0));
  klocka.t += 3100; stamG([], hog(0));
  assert.equal(app.handRad.length, 2);
  klocka.t += 500; stamG([], hog(1));            // en ändring, två kort i raden: vilket? ingen
  assert.equal(app.handRad.length, 2); assert.equal(app.kort.length, 0);
});

/* T — granskarens riktade prov (2026-10-07): handen utan tak, auror, fall 9 inom radens tid, valen, fall 8. */
const OVER9 = box(PORT.x - 0.02, PORT.y - 0.05, 0.12, 0.10);
const nyHand = (id, b) => ({ id, tillstand: 'ny', namn: null, saker: false, tappad: false, sen: 0, kortlik: false, vilar: false, skymd: false, ...b });
prov('T1 en hand vilar över kortet längre än HAND_MAX medan spåret är dött: kortet ligger kvar orört', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  for (let i = 0; i < 70; i++) { klocka.t += 150; stam([nyHand(5, OVER9)]); }   // 10,5 s med handen över platsen
  assert.ok(app.kort.includes(k) && k.borta && k.spar === 1, 'kortet gick till handen fast handen ligger kvar över platsen'); assert.equal(app.handRad.length, 0);
  klocka.t += 150; stam([]);
  assert.ok(iHanden(k), 'till handen när handen gått');
});
prov('T2 aura och token-aura på kortet: till handen och sedan Still on the table — auran tillbaka ur graveyard på värden, token-auran tillbaka', () => {
  app.typ = new Map([['Pacifism', 'Enchantment — Aura'], ['Monster Role', 'Enchantment — Aura']]);
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), klar(2, 'Pacifism', { sen: 0, ...box(PORT.x + 0.01, PORT.y + 0.03, 0.063, 0.088) })]);
  const a = app.kort.find(c => c.name === 'Ukud Cobra'), p = app.kort.find(c => c.name === 'Pacifism');
  p.attachedTo = a.cid;
  app.kort.push({ cid: 'tokR', name: 'Monster Role', tok: 1, attachedTo: a.cid, flipped: 0, tapped: 0 });
  klocka.t += 150; stam([]);                           // båda spåren dog (kortet lyft med auran)
  klocka.t += 3100; stam([]);
  assert.ok(iHanden(a)); assert.equal(app.handRad.length, 1, 'auran fick en egen rad'); assert.equal(p.zon, 'grav'); assert.ok(!app.kort.some(c => c.cid === 'tokR'));
  assert.ok(app.handVal(a.cid, 'kvar'));
  assert.ok(app.kort.includes(a)); assert.equal(p.zon, undefined, 'auran ligger i graveyard fast kortet är tillbaka'); assert.equal(p.attachedTo, a.cid);
  assert.ok(app.kort.some(c => c.cid === 'tokR' && c.attachedTo === a.cid), 'token-auran är borta');
});
prov('T2b värd och aura lyfts ihop och syns igen: samma kort tillbaka ur raden med auran på sig, ingen dubblett', () => {
  app.typ = new Map([['Pacifism', 'Enchantment — Aura']]);
  const PA = box(PORT.x + 0.01, PORT.y + 0.03, 0.063, 0.088);
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), klar(2, 'Pacifism', { sen: 0, ...PA })]);
  const a = app.kort.find(c => c.name === 'Ukud Cobra'), p = app.kort.find(c => c.name === 'Pacifism');
  p.attachedTo = a.cid;
  klocka.t += 150; stam([]);
  klocka.t += 3100; stam([]);
  assert.ok(iHanden(a)); assert.equal(app.handRad.length, 1); assert.equal(p.zon, 'grav');
  klocka.t += 1000; stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), klar(2, 'Pacifism', { sen: 0, ...PA })]);
  assert.deepEqual(app.kort.map(c => [c.name, c.zon, c.attachedTo]).sort(), [['Pacifism', undefined, a.cid], ['Ukud Cobra', undefined, undefined]].sort());
  assert.equal(a.spar, 1); assert.equal(app.handRad[0].val, 'kvar', 'raden bekräftar');
});
prov('T2c bara värden lyfts (auran ligger kvar på platsen): värden orörd, täckt av auran', () => {
  app.typ = new Map([['Pacifism', 'Enchantment — Aura']]);
  const PA = box(PORT.x + 0.01, PORT.y + 0.03, 0.063, 0.088);
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), klar(2, 'Pacifism', { sen: 0, ...PA })]);
  const a = app.kort.find(c => c.name === 'Ukud Cobra'), p = app.kort.find(c => c.name === 'Pacifism');
  p.attachedTo = a.cid;
  klocka.t += 150; stam([klar(2, 'Pacifism', { sen: 0, ...PA })]);
  klocka.t += 3100; stam([klar(2, 'Pacifism', { sen: 0, ...PA })]); klocka.t += 5100; stam([klar(2, 'Pacifism', { sen: 0, ...PA })]);
  assert.ok(app.kort.includes(a) && a.borta); assert.equal(app.handRad.length, 0);
});
prov('T3 fall 9 inom radens 6 s: kortet syns igen — samma kortpost tillbaka ur raden, raden bekräftar, Still on the table ger ingen dubblett', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([]);
  klocka.t += 3100; stam([]);
  assert.ok(iHanden(k));
  klocka.t += 1000; stam([klar(7, 'Ukud Cobra', { sen: 0, ...PORT })]);   // samma kort syns igen
  assert.deepEqual(app.kort, [k], 'ett nytt kort bredvid det i handen'); assert.equal(k.spar, 7); assert.equal(app.handRad[0].val, 'kvar');
  assert.equal(app.handVal(k.cid, 'kvar'), false, 'valet är redan gjort');
  assert.equal(app.kort.filter(c => c.name === 'Ukud Cobra').length, 1, 'dubblett');
});
prov('T4 valen med samma kort: Exile ger ett kort i exile och inget på mattan; Library ger inget kort; Still on the table ger samma kortpost som binds igen utan dubblett', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([]); klocka.t += 3100; stam([]);
  assert.ok(iHanden(k));
  assert.ok(app.handVal(k.cid, 'exil')); app.kort.push(k); app.flytta(app.kort.length - 1, 'exil');   // som handRadVal
  assert.equal(app.kort.filter(c => c === k).length, 1); assert.equal(k.zon, 'exil');
  klocka.t += 500; stam([]); assert.equal(app.kort.filter(c => c.name === 'Ukud Cobra').length, 1);
  app.nollstall(); klocka.t = 1e6;
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const k2 = app.kort[0];
  klocka.t += 150; stam([]); klocka.t += 3100; stam([]);
  assert.ok(app.handVal(k2.cid, 'bib')); klocka.t += 500; stam([]);
  assert.equal(app.kort.length, 0); assert.equal(app.handRad[0].val, 'bib');
  app.nollstall(); klocka.t = 1e6;
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const k3 = app.kort[0];
  klocka.t += 150; stam([]); klocka.t += 3100; stam([]);
  assert.ok(app.handVal(k3.cid, 'kvar')); assert.equal(app.kort[0], k3); assert.equal(k3.spar, undefined);
  klocka.t += 1000; stam([klar(8, 'Ukud Cobra', { sen: 0, ...PORT })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0], k3, 'samma kortpost bunden igen'); assert.equal(k3.spar, 8);
});
prov('T5 valet efter 6 s: raden är borta, kortet står i handen, inget val går — och ett kort med namnet som syns sedan är ett nytt kort (fall 9)', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([]); klocka.t += 3100; stam([]);
  const nar = app.handRad[0].nar;
  klocka.t = nar + 6100; stam([]);
  assert.equal(app.handRad.length, 0); assert.equal(app.handVal(k.cid, 'kvar'), false); assert.equal(app.kort.length, 0);
  klocka.t += 1000; stam([klar(7, 'Ukud Cobra', { sen: 0, ...PORT })]);
  assert.equal(app.kort.length, 1); assert.notEqual(app.kort[0], k);
});
prov('T6 spåret dött > BORTA_NAD utan hand eller täckning, kortet till handen; syns det igen inom radens tid följer identiteten med (tapped, counters)', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, tappad: true, ...PORT })]);
  const k = app.kort[0]; k.cts = [{ t: '+1/+1', n: 2 }];
  klocka.t += 150; stam([]); klocka.t += 3100; stam([]);
  assert.ok(iHanden(k), 'till handen efter väntan utan hand/täckning');
  klocka.t += 2000; stam([klar(9, 'Ukud Cobra', { sen: 0, tappad: true, ...PORT })]);
  const n = app.kort.find(c => c.name === 'Ukud Cobra');
  assert.equal(n, k, 'kortet kom tillbaka som ett nytt kort: counters borta'); assert.deepEqual(n.cts, [{ t: '+1/+1', n: 2 }]); assert.equal(n.tapped, 1); assert.equal(n.spar, 9);
});
prov('T8 fall 8 med tre spår: ingenting ändras, och korten binds om på namnet när kameran ankrat sig', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), klar(2, 'Grizzly Bears', { sen: 0, ...LANGT }), klar(3, 'Forest', { sen: 0, ...LAND_ })]);
  klocka.t += 150; stam([]); klocka.t += 3100; stam([]);
  assert.equal(app.kort.length, 3); assert.equal(app.handRad.length, 0);
  klocka.t += 2000; stam([klar(11, 'Ukud Cobra', { sen: 0, ...PORT }), klar(12, 'Grizzly Bears', { sen: 0, ...LANGT }), klar(13, 'Forest', { sen: 0, ...LAND_ })]);
  assert.equal(app.kort.length, 3); assert.ok(app.kort.every(c => c.spar != null && c.slappt == null));
});

/* Tb/Tc — kontrollgranskningen av 50f4e6a (2026-10-07): ur raden bara på ett säkert namn, aurorna och högen. */
prov('Tb1 ur raden aldrig på en gissning (steg 5): ett okänt spår som gissar A lämnar A i raden; blir spåret klart som ett annat kort är A fortfarande i handen', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const a = app.kort[0];
  klocka.t += 150; stam([]); klocka.t += 3100; stam([]);
  assert.ok(iHanden(a));
  klocka.t += 1000; stam([vilande(2, NY_PLATS, { tillstand: 'okand', gissning: 'Ukud Cobra', cands: [{ name: 'Ukud Cobra', score: 0.5 }] })]);
  assert.ok(iHanden(a), 'A togs tillbaka ur raden på en gissning'); assert.equal(app.kort.length, 0);
  klocka.t += 1000; stam([klar(2, 'Grizzly Bears', { sen: 0, ...NY_PLATS })]);
  assert.ok(!app.kort.includes(a) && iHanden(a), 'A blev ett spöke på mattan'); assert.deepEqual(app.kort.map(c => c.name), ['Grizzly Bears']);
});
prov('Tb2 två Swamp: S1 gick till handen (raden står), S2 flimrar och kommer tillbaka — S2 binds om, raden står kvar', () => {
  stam([klar(1, 'Swamp', { sen: 0, ...PORT }), klar(2, 'Swamp', { sen: 0, ...LANGT })]);
  const s1 = app.kort.find(c => c.spar === 1), s2 = app.kort.find(c => c.spar === 2);
  klocka.t += 150; stam([klar(2, 'Swamp', { sen: 0, ...LANGT })]);
  klocka.t += 3100; stam([klar(2, 'Swamp', { sen: 0, ...LANGT })]);
  assert.ok(iHanden(s1));
  klocka.t += 150; stam([]);                                            // S2 flimrar
  klocka.t += 300; stam([klar(3, 'Swamp', { sen: 0, ...LANGT })]);
  assert.equal(s2.spar, 3); assert.ok(iHanden(s1)); assert.equal(app.kort.length, 1);
});
prov('Tc1 auran tillbaka på värden när auran redan skapats igen på mattan (eget spår): den i graveyard stannar där', () => {
  app.typ = new Map([['Pacifism', 'Enchantment — Aura']]);
  const PA = box(PORT.x + 0.01, PORT.y + 0.03, 0.063, 0.088);
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), klar(2, 'Pacifism', { sen: 0, ...PA })]);
  const a = app.kort.find(c => c.name === 'Ukud Cobra'), p = app.kort.find(c => c.name === 'Pacifism');
  p.attachedTo = a.cid;
  klocka.t += 150; stam([]); klocka.t += 3100; stam([]);
  assert.ok(iHanden(a)); assert.equal(p.zon, 'grav');
  klocka.t += 1000; stam([klar(5, 'Pacifism', { sen: 0, ...LANGT })]);   // auran läggs på bordet igen, ensam
  assert.ok(app.handVal(a.cid, 'kvar'));
  assert.equal(app.kort.filter(c => c.name === 'Pacifism' && c.zon !== 'grav').length, 1, 'två Pacifism på mattan');
  assert.equal(p.zon, 'grav'); assert.equal(p.attachedTo, undefined);
});
prov('Tc2 studsad varelse med aura: värden till handen, auran till graveyard — högen växer av auran, och värden stannar i handen', () => {
  app.typ = new Map([['Pacifism', 'Enchantment — Aura']]);
  const PA = box(PORT.x + 0.01, PORT.y + 0.03, 0.063, 0.088);
  stamG([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), klar(2, 'Pacifism', { sen: 0, ...PA })], hog(0));
  const a = app.kort.find(c => c.name === 'Ukud Cobra'), p = app.kort.find(c => c.name === 'Pacifism');
  p.attachedTo = a.cid;
  klocka.t += 150; stamG([], hog(0)); klocka.t += 3100; stamG([], hog(0));
  assert.ok(iHanden(a)); assert.equal(p.zon, 'grav');
  klocka.t += 800; stamG([], hog(1));                                   // auran lades i graveyard
  assert.notEqual(a.zon, 'grav', 'värden (i handen) skickades till graveyard av aurans högändring'); assert.ok(iHanden(a));
});
prov('Tc3 värden tillbaka via Still on the table efter att högen tagit auran: ingen dubblett av auran', () => {
  app.typ = new Map([['Pacifism', 'Enchantment — Aura']]);
  const PA = box(PORT.x + 0.01, PORT.y + 0.03, 0.063, 0.088);
  stamG([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), klar(2, 'Pacifism', { sen: 0, ...PA })], hog(0));
  const a = app.kort.find(c => c.name === 'Ukud Cobra'), p = app.kort.find(c => c.name === 'Pacifism');
  p.attachedTo = a.cid;
  klocka.t += 150; stamG([], hog(0)); klocka.t += 3100; stamG([], hog(0));
  assert.ok(app.handVal(a.cid, 'kvar'));
  assert.equal(app.kort.filter(c => c.name === 'Pacifism').length, 1); assert.equal(p.attachedTo, a.cid); assert.equal(p.zon, undefined);
});

/* LS — kort utan spår (LOS_MS, Jesper 2026-10-08): bindningen släpps (omladdning, nollställning, fall 8) och
   kortet ligger inte kvar fysiskt. Förut stod det på mattan för alltid. */
const LOS = 8000;
const losgor = () => { for (const c of app.kort) delete c.spar; };   // som en omladdning: spar sparas inte
const tick = (ms, spar = []) => { for (let t = 0; t < ms; t += 1000) { klocka.t += 1000; stam(spar); } };
prov('LS1 omladdning, kortet borta ur bild: kvar i LOS_MS, sedan till handen', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), klar(2, 'Plains', { sen: 0, ...LANGT })]);
  const a = app.kort.find(c => c.name === 'Ukud Cobra'), b = app.kort.find(c => c.name === 'Plains'); losgor();
  stam([klar(5, 'Plains', { sen: 0, ...LANGT })]);                      // Plains syns igen, Ukud Cobra inte
  assert.equal(b.spar, 5);
  klocka.t += LOS - 200; stam([klar(5, 'Plains', { sen: 0, ...LANGT })]);
  assert.ok(app.kort.includes(a), 'för tidigt');
  klocka.t += 400; stam([klar(5, 'Plains', { sen: 0, ...LANGT })]);
  assert.ok(iHanden(a)); assert.ok(app.kort.includes(b));
});
prov('LS2 omladdning, kortet syns på en ny plats: binds, går inte till handen', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const [a] = app.kort; losgor();
  tick(LOS * 2, [klar(9, 'Ukud Cobra', { sen: 0, ...LANGT })]);
  assert.equal(a.spar, 9); assert.ok(app.kort.includes(a)); assert.equal(app.handRad.length, 0);
  assert.equal(app.kort.filter(c => c.name === 'Ukud Cobra').length, 1);
});
prov('LS3 platsen täckt av ett annat kort: väntar (ligger under)', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const [a] = app.kort; losgor();
  tick(LOS * 2, [klar(4, 'Grizzly Bears', { sen: 0, ...PORT })]);
  assert.ok(app.kort.includes(a));
});
prov('LS4 något kortformat i bild är inte färdigläst: väntar', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const [a] = app.kort; losgor();
  tick(LOS * 2, [vilande(7, NY_PLATS, { tillstand: 'ny' })]);
  assert.ok(app.kort.includes(a));
  tick(LOS + 1000, [klar(7, 'Grizzly Bears', { sen: 0, ...NY_PLATS })]);
  assert.ok(iHanden(a) || !app.kort.includes(a));
});
prov('LS5 Still on the table: står kvar efter LOS_MS, tills kameran bundit det', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const [a] = app.kort; losgor();
  stam([]); tick(LOS);
  assert.ok(iHanden(a));
  assert.ok(app.handVal(a.cid, 'kvar'));
  tick(LOS * 2);
  assert.ok(app.kort.includes(a), 'gick till handen igen');
});
prov('LS6 kort utan kamerans läge (lagt för hand) rörs inte', () => {
  app.kort.push({ cid: 'm', name: 'Forest', flipped: 0 });
  stam([]); tick(LOS * 2);
  assert.equal(app.kort.length, 1);
});
prov('LS7 Use camera to add cards: kameran tar aldrig bort', () => {
  app.spelsatt = 'skarm';
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  losgor(); stam([]); tick(LOS * 2);
  assert.equal(app.kort.length, 1);
});
prov('LS8 fall 8 och korten kommer aldrig tillbaka: till handen efter efterskottet och LOS_MS', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), klar(2, 'Grizzly Bears', { sen: 0, ...LANGT }), klar(3, 'Forest', { sen: 0, ...NY_PLATS })]);
  const alla = app.kort.slice();
  klocka.t += 150; stam([]); klocka.t += 3100; stam([]);
  assert.equal(app.kort.length, 3);                                      // fall 8: ingenting ändras än
  tick(5000 + LOS + 1000);
  assert.ok(alla.every(iHanden));
});
prov('LS9 klockan börjar om när telefonen lär sig ljuset', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  const [a] = app.kort; losgor();
  stam([]); klocka.t += LOS - 1000; stam([]);
  klocka.t += 500; app.avstamBord([], false, 'ljus');
  klocka.t += 1000; stam([]);
  assert.ok(app.kort.includes(a), 'klockan räknade genom ljuset');
  klocka.t += LOS + 100; stam([]);
  assert.ok(iHanden(a));
});

/* Kortet sett igen bredvid, på läsningens namn (Jespers bild 2, 2026-10-08). Kortets spår dör (en hand, blänket)
   och ett nytt spår föds strax bredvid, men blir stilla först efter nåden — flyttens fönster (steg 3b) har
   stängts. Läsningen säger "not sure (Militant Inquisitor)", utan platsens ledtråd. Förut väntade kortet på sitt
   döda spår för alltid (namnet syntes ju annanstans) och spåret gick till granskningen: två kort på mattan,
   ett fysiskt. Nu tar spåret kortet som en gissad flytt. */
const VILA_ = { kortlik: true, vilar: true }, BREDVID = box(0.43, 0.41, 0.063, 0.088);
const borjaV = () => { const mi = klar(1, 'Militant Inquisitor', { sen: 10, ...PORT, ...VILA_ }); stam([mi]); tick(2000, [mi]); return app.kort[0]; };
const nyttV = (tillstand, rest) => Object.assign({ id: 2, tillstand, namn: null, saker: false, gissning: null, cands: null, tappad: false, sen: 10, ...BREDVID, kortlik: true, vilar: tillstand !== 'ny' }, rest || {});
const osakertV = (namn, rest) => nyttV('okand', Object.assign({ namn, cands: [{ name: namn, score: 0.5 }] }, rest || {}));
const medMinne = (namn, sparId = 1) => ({ remsa: { namn, saker: false, minne: { provad: true, omfodd: true, vittne: true, saker: false, namn, sparId } } });
const fodV = () => { tick(4000, [nyttV('ny')]); tick(1000, [nyttV('stilla')]); tick(8000, [nyttV('okand', { provas: true })]); };
prov('V1 osäkert spår bredvid med kortets namn och minnet av kortets remsa, efter nåden: samma kort, flyttat — ingen granskning', () => {
  const k = borjaV(); fodV();
  assert.equal(k.spar, 1, 'kortet väntar på sitt döda spår medan det nya läses');
  tick(3000, [osakertV('Militant Inquisitor', medMinne('Militant Inquisitor'))]);
  assert.equal(app.kort.length, 1); assert.equal(k.spar, 2); assert.equal(app.pending.length, 0);
  assert.ok(Math.abs(k.kam.x - (BREDVID.x + BREDVID.w / 2)) < 1e-9, 'kortet står där spåret ligger');
});
prov('V2 läsningen säger ett annat namn: kortet väntar orört, spåret till granskningen (som förut)', () => {
  const k = borjaV(); fodV();
  tick(3000, [osakertV('Flutterfox')]);
  assert.equal(k.spar, 1); assert.equal(app.pending.length, 1);
});
prov('V3 två väntande kort med namnet: inget binds på namnet, spåret till granskningen', () => {
  const a = klar(1, 'Militant Inquisitor', { sen: 10, ...PORT, ...VILA_ }), b = klar(3, 'Militant Inquisitor', { sen: 10, ...LANGT, ...VILA_ });
  stam([a, b]); tick(2000, [a, b]);
  assert.equal(app.kort.length, 2);
  fodV(); tick(3000, [osakertV('Militant Inquisitor', medMinne('Militant Inquisitor'))]);
  assert.ok(app.kort.every(c => c.spar !== 2)); assert.equal(app.pending.length, 1);
});
prov('V4 en senare säker läsning med ett annat namn: flytten ångras, kortet tillbaka där det låg', () => {
  const k = borjaV(); const kam0 = Object.assign({}, k.kam); fodV();
  tick(3000, [osakertV('Militant Inquisitor', medMinne('Militant Inquisitor'))]);
  assert.equal(k.spar, 2);
  tick(1000, [klar(2, 'Flutterfox', { sen: 10, ...BREDVID, ...VILA_ })]);
  assert.ok(Math.abs(k.kam.x - kam0.x) < 1e-9 && k.spar === 1, 'kortet tillbaka på sin plats och sitt döda spår');
  assert.ok(app.kort.some(c => c.name === 'Flutterfox' && c.spar === 2), 'det nya kortet får spåret');
});
prov('V5 platsen täckt av ett annat kort: kortet ligger kvar under, binds inte på namnet', () => {
  const k = borjaV();
  const tackare = klar(4, 'Mirran Bardiche', { sen: 10, ...flytt(PORT, 0.004), ...VILA_ });
  tick(4000, [tackare, nyttV('ny')]); tick(1000, [tackare, nyttV('stilla')]); tick(8000, [tackare, nyttV('okand', { provas: true })]);
  tick(3000, [tackare, osakertV('Militant Inquisitor', medMinne('Militant Inquisitor'))]);
  assert.equal(k.spar, 1); assert.equal(app.pending.length, 1);
});
prov('V6 samma fall utan minnets vittne: läsningens osäkra namn binder inte, spåret till granskningen', () => {
  const k = borjaV(); fodV();
  tick(3000, [osakertV('Militant Inquisitor')]);
  assert.equal(k.spar, 1); assert.equal(app.pending.length, 1);
});
prov('V7 minnet säger inte vittne, eller vittnar om ett annat spår än kortets: binder inte', () => {
  const k = borjaV(); fodV();
  tick(3000, [osakertV('Militant Inquisitor', { remsa: { namn: 'Militant Inquisitor', minne: { provad: true, vittne: false, namn: 'Militant Inquisitor', sparId: 1 } } })]);
  assert.equal(k.spar, 1);
  tick(1000, [osakertV('Militant Inquisitor', medMinne('Militant Inquisitor', 7))]);
  assert.equal(k.spar, 1); assert.equal(app.pending.length, 1);
});
prov('V8 Claudes svar ensamt binder inte (Claude är inget villkor, och inget vittne heller)', () => {
  const k = borjaV(); fodV();
  tick(3000, [osakertV('Militant Inquisitor', { ai: { svar: [{ namn: 'Militant Inquisitor', sakerhet: 'medel', saker: false }] } })]);
  assert.equal(k.spar, 1); assert.equal(app.pending.length, 1);
});

/* SP (MES-356): mattan visar aldrig fler kort än kameran ser. Jespers bord 2026-10-09 (spelet 2YBSJX): två
   Island bredvid varandra, båda namngivna för hand. Han flyttade det ena (A) och lade det ovanpå det andra (B).
   Mattan visade tre: A kvar på sin gamla plats (i väntan, spåret dött), B, och ett oframkallat kort där A lades
   (telefonen: "? not sure (Island)"). Leken har ett Island. Spöket ska inte finnas: A ska bäras dit det lades. */
const ISL_A = box(0.20, 0.40, 0.063, 0.088), ISL_B = box(0.45, 0.40, 0.063, 0.088), PA_B = box(0.455, 0.41, 0.063, 0.088);
const islandsPaMattan = () => app.kort.filter(c => c.name === 'Island').length + app.ofr.length;
const lastOsakert = (id, namn, b, rest) => ovila(id, Object.assign({ tillstand: 'okand', namn, saker: false, cands: [{ name: namn, score: 0.4 }] }, b, rest || {}));
const tvaIslands = () => {
  stam([klar(1, 'Island', { sen: 0, kortlik: true, vilar: true, ...ISL_A }), klar(2, 'Island', { sen: 0, kortlik: true, vilar: true, ...ISL_B })]);
  app.lek = new Map([['Island', 1]]);                                       // leken har ett: två på bordet är spelarens egna namn
  assert.equal(app.kort.length, 2);
  return [app.kort.find(c => c.spar === 1), app.kort.find(c => c.spar === 2)];
};
prov('SP1 (MES-356) Island läggs ovanpå Island: B syns skymt under det — A bärs dit, inget oframkallat kort, två Islands', () => {
  const [a, b] = tvaIslands();
  const B = (rest) => klar(2, 'Island', Object.assign({ sen: 0, kortlik: true, vilar: true, ...ISL_B }, rest || {}));
  klocka.t += 150; stam([B()]);                                              // A lyfts: spåret dör
  klocka.t += 300; stam([B({ skymd: true, sen: 150, under: [3] }), ovila(3, { vilar: false, ...PA_B })]);   // handen lägger A över B
  klocka.t += 150; stam([B({ skymd: true, sen: 300, under: [3] }), ovila(3, PA_B)]);                        // A ligger still över B
  klocka.t += 150; stam([B({ skymd: true, sen: 450, under: [3] }), ovila(3, { tillstand: 'stilla', ...PA_B })]);
  tid(klocka.t + 700);
  klocka.t += 150; stam([B({ skymd: true, sen: 600, under: [3] }), lastOsakert(3, 'Island', PA_B)]);        // "? not sure (Island)"
  tid(klocka.t + 100);
  assert.deepEqual(ofrSlag(), [], 'ett oframkallat kort där A lades: spöket');
  assert.equal(a.spar, 3, 'A bars till där det lades'); assert.equal(b.spar, 2, 'B ligger kvar');
  assert.ok(Math.abs(a.kam.x - mitt(PA_B)) < 1e-9, 'A ritas där det ligger nu');
  for (let i = 0; i < 8; i++) { klocka.t += 1000; stam([B({ skymd: true, sen: 600, under: [3] }), lastOsakert(3, 'Island', PA_B)]); }
  assert.equal(islandsPaMattan(), 2, 'två Islands på mattan efter väntan'); assert.equal(app.handRad.length, 0);
});
prov('SP2 (MES-356) samma, men B täcks helt och dess spår dör (telefonen såg A över B först): A bärs dit, B ligger kvar under', () => {
  const [a, b] = tvaIslands();
  const B = (rest) => klar(2, 'Island', Object.assign({ sen: 0, kortlik: true, vilar: true, ...ISL_B }, rest || {}));
  klocka.t += 150; stam([B()]);
  klocka.t += 300; stam([B({ skymd: true, sen: 150, under: [3] }), ovila(3, { vilar: false, ...PA_B })]);
  klocka.t += 150; stam([B({ skymd: true, sen: 300, under: [3] }), ovila(3, PA_B)]);
  klocka.t += 150; stam([ovila(3, { tillstand: 'stilla', ...PA_B })]);                                    // B:s spår dör under A
  tid(klocka.t + 700);
  klocka.t += 150; stam([lastOsakert(3, 'Island', PA_B)]);
  tid(klocka.t + 100);
  assert.deepEqual(ofrSlag(), [], 'spöket');
  assert.equal(a.spar, 3, 'A bars till där det lades'); assert.notEqual(b.spar, 3, 'B tog inte A:s spår');
  for (let i = 0; i < 8; i++) { klocka.t += 1000; stam([lastOsakert(3, 'Island', PA_B)]); }
  assert.equal(islandsPaMattan(), 2, 'två Islands på mattan efter väntan'); assert.ok(app.kort.includes(b), 'B ligger kvar under A'); assert.equal(app.handRad.length, 0);
});
prov('SP3 (MES-356) läsningen säger ett annat namn: kortet som lades över B är ett annat kort — A bärs inte dit, det nya får sitt oframkallade kort', () => {
  const [a, b] = tvaIslands();
  const B = (rest) => klar(2, 'Island', Object.assign({ sen: 0, kortlik: true, vilar: true, ...ISL_B }, rest || {}));
  klocka.t += 150; stam([B()]);
  klocka.t += 300; stam([B({ skymd: true, sen: 150, under: [3] }), ovila(3, { vilar: false, ...PA_B })]);
  klocka.t += 150; stam([B({ skymd: true, sen: 300, under: [3] }), ovila(3, PA_B)]);
  klocka.t += 150; stam([B({ skymd: true, sen: 450, under: [3] }), ovila(3, { tillstand: 'stilla', ...PA_B })]);
  klocka.t += 150; stam([B({ skymd: true, sen: 600, under: [3] }), lastOsakert(3, 'Ancestral Blade', PA_B)]);
  tid(klocka.t + 700);
  assert.equal(a.spar, 1, 'A väntar på sin plats'); assert.deepEqual(ofrSlag(), ['3#']);
});
prov('SP4 (MES-356) spöket: ett läst spår vars lokala gissning är namnet på ett kort som nyss lyfts och lämnat sin plats ritas inte som ett oframkallat kort, också när flytten inte kan bindas', () => {
  /* Platsen var inte tom (ett namnlöst spår låg nyss där, FL5): steg 3b binder inte. Mattan visar då A på den gamla
     platsen — ett kort, som kameran ser ett — inte A och ett oframkallat kort. */
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), { id: 9, tillstand: 'okand', namn: null, cands: [], sen: 0, ...NY_PLATS }]);
  const k = app.kort[0];
  klocka.t += 150; stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  klocka.t += 150; stam([]);
  klocka.t += 300; stam([vilande(2, NY_PLATS, { tillstand: 'stilla' })]);
  tid(klocka.t + 700);
  klocka.t += 150; stam([vilande(2, NY_PLATS, { namn: 'Ukud Cobra', cands: [{ name: 'Ukud Cobra', score: 0.4 }] })]);
  tid(klocka.t + 100);
  assert.equal(k.spar, 1, 'platsen var inte tom: inget binds (FL5)');
  assert.deepEqual(ofrSlag(), [], 'A och ett oframkallat kort för samma kort');
  // Claudes gissning räknas inte: ett spår som bara Claude namngett får sitt oframkallade kort som förut
  app.nollstall(); klocka.t = 1e6;
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), { id: 9, tillstand: 'okand', namn: null, cands: [], sen: 0, ...NY_PLATS }]);
  klocka.t += 150; stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  klocka.t += 150; stam([]);
  klocka.t += 300; stam([vilande(2, NY_PLATS, { tillstand: 'stilla' })]);
  tid(klocka.t + 700);
  klocka.t += 150; stam([vilande(2, NY_PLATS, { namn: 'Ukud Cobra', cands: [{ name: 'Ukud Cobra', score: 0.4 }], ai: { svar: [{ namn: 'Ukud Cobra', saker: false }] } })]);
  tid(klocka.t + 100);
  assert.equal(app.ofr.length, 1, 'Claudes svar är inget vittne');
});
prov('SP4b (MES-356) efter nåden: kortet i väntan bärs till spöket som en gissad flytt, med sitt eget namn, när telefonens remsa eller titelrad vittnar — inte på läsningens namn ensamt, och inte när flera lösa spår läses som namnet', () => {
  /* Förut kom det oframkallade kortet tillbaka när nåden gått, och kortet stod kvar på sin gamla plats (namnAnnanstans):
     Jespers tre Islands kom tillbaka efter 5 s. Bildmodellens osäkra gissning är ofta samma namn för många kort (i Mat
     tests parti-kedjan gissade ett tjugotal spår Night's Whisper, och utan vittneskravet bars Night's Whisper efter att
     det lagts i graveyard till två andra kort): bara med ett vittne, och läses två lösa spår som namnet bärs inget. */
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), { id: 9, tillstand: 'okand', namn: null, cands: [], sen: 0, ...NY_PLATS }]);
  const k = app.kort[0];
  klocka.t += 150; stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  klocka.t += 150; stam([]);
  klocka.t += 300; stam([vilande(2, NY_PLATS, { tillstand: 'stilla' })]);
  tid(klocka.t + 4000);
  klocka.t += 150; stam([vilande(2, NY_PLATS, { namn: 'Ukud Cobra', cands: [{ name: 'Ukud Cobra', score: 0.4 }] })]);
  tid(klocka.t + 100);
  assert.equal(k.spar, 1, 'läsningens osäkra namn ensamt bär inte (Night\'s Whisper i parti-kedjan)'); assert.equal(app.ofr.length, 1);
  klocka.t += 150; stam([vilande(2, NY_PLATS, { namn: 'Ukud Cobra', cands: [{ name: 'Ukud Cobra', score: 0.4 }], remsa: { namn: 'Ukud Cobra', saker: false, marginal: 0.12 } })]);   // namnremsan vittnar
  tid(klocka.t + 100);
  assert.equal(k.spar, 2, 'buret dit efter nåden'); assert.ok(k.flyttFran, 'en gissad flytt'); assert.equal(k.name, 'Ukud Cobra');
  assert.deepEqual(ofrSlag(), []); assert.equal(app.kort.length, 1);
  klocka.t += 1000; stam([klar(2, 'Grizzly Bears', { sen: 0, ...NY_PLATS })]);   // en säker läsning med ett annat namn ångrar flytten
  assert.notEqual(k.spar, 2); assert.equal(k.flyttFran, undefined); assert.ok(app.kort.some(c => c.name === 'Grizzly Bears' && c.spar === 2));
  assert.ok(iHanden(k), 'väntan var redan slut, och namnet syns inte längre någon annanstans: till handen');
  app.nollstall(); klocka.t = 1e6;
  const ANNAN = box(0.70, 0.70, 0.063, 0.088);
  stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT }), { id: 9, tillstand: 'okand', namn: null, cands: [], sen: 0, ...NY_PLATS }, { id: 8, tillstand: 'okand', namn: null, cands: [], sen: 0, ...ANNAN }]);
  klocka.t += 150; stam([klar(1, 'Ukud Cobra', { sen: 0, ...PORT })]);
  klocka.t += 150; stam([]);
  klocka.t += 300; stam([vilande(2, NY_PLATS, { tillstand: 'stilla' }), vilande(3, ANNAN, { tillstand: 'stilla' })]);
  tid(klocka.t + 700);
  klocka.t += 150; stam([2, 3].map((id, i) => vilande(id, [NY_PLATS, ANNAN][i], { namn: 'Ukud Cobra', cands: [{ name: 'Ukud Cobra', score: 0.4 }] })));
  tid(klocka.t + 100);
  assert.equal(app.kort[0].spar, 1); assert.equal(app.ofr.length, 2, 'två spår gissar samma namn: tvekan');
});
prov('SP6 (MES-356) med Claude på: Claudes osäkra svar skriver över namnet, men remsan eller titelraden säger Island — A bärs ändå dit', () => {
  for (const vittne of [{ remsa: { namn: 'Island', saker: false, marginal: 0.12 } }, { namnLast: { namn: 'Island', poang: 0.7, marginal: 0.3 } }, { remsa: { namn: null, ocr: { namn: 'Island', poang: 0.8 } } }]) {
    app.nollstall(); klocka.t = 1e6;
    const [a, b] = tvaIslands();
    const B = (rest) => klar(2, 'Island', Object.assign({ sen: 0, kortlik: true, vilar: true, ...ISL_B }, rest || {}));
    const ai = { svar: [{ namn: 'Island', sakerhet: 'medel', saker: false }] };
    klocka.t += 150; stam([B()]);
    klocka.t += 300; stam([B({ skymd: true, sen: 150, under: [3] }), ovila(3, { vilar: false, ...PA_B })]);
    klocka.t += 150; stam([B({ skymd: true, sen: 300, under: [3] }), ovila(3, PA_B)]);
    klocka.t += 150; stam([B({ skymd: true, sen: 450, under: [3] }), ovila(3, { tillstand: 'stilla', ...PA_B })]);
    klocka.t += 150; stam([B({ skymd: true, sen: 600, under: [3] }), lastOsakert(3, 'Island', PA_B, Object.assign({ ai }, vittne))]);   // "? not sure (Island) · Claude"
    tid(klocka.t + 100);
    assert.equal(a.spar, 3, 'A bars dit: ' + JSON.stringify(vittne)); assert.equal(b.spar, 2); assert.deepEqual(ofrSlag(), []);
  }
});
prov('SP7 (MES-356) bara Claude säger Island: ingenting bärs, varken före eller efter nåden — Claude är aldrig ett villkor', () => {
  const [a] = tvaIslands();
  const B = (rest) => klar(2, 'Island', Object.assign({ sen: 0, kortlik: true, vilar: true, ...ISL_B }, rest || {}));
  const ai = { svar: [{ namn: 'Island', sakerhet: 'medel', saker: false }] };
  const svag = { remsa: { namn: 'Island', saker: false, marginal: 0.02 }, namnLast: { namn: 'Island', poang: 0.3 } };   // under vittnesgränserna
  klocka.t += 150; stam([B()]);
  klocka.t += 300; stam([B({ skymd: true, sen: 150, under: [3] }), ovila(3, { vilar: false, ...PA_B })]);
  klocka.t += 150; stam([B({ skymd: true, sen: 300, under: [3] }), ovila(3, PA_B)]);
  klocka.t += 150; stam([B({ skymd: true, sen: 450, under: [3] }), ovila(3, { tillstand: 'stilla', ...PA_B })]);
  for (let i = 0; i < 10; i++) { klocka.t += 1000; stam([B({ skymd: true, sen: 600, under: [3] }), lastOsakert(3, 'Island', PA_B, Object.assign({ ai }, svag))]); }
  assert.equal(a.spar, 1, 'A bars dit på Claudes svar'); assert.ok(!a.flyttFran);
});
prov('SP5 (MES-356) tre kort flyttas samtidigt: inga oframkallade kort bredvid korten i väntan medan telefonen läser, sedan bärs vart kort dit det lades', () => {
  const FR = [box(0.10, 0.20, 0.063, 0.088), box(0.25, 0.20, 0.063, 0.088), box(0.40, 0.20, 0.063, 0.088)];
  const TILL = [box(0.15, 0.65, 0.063, 0.088), box(0.45, 0.65, 0.063, 0.088), box(0.75, 0.65, 0.063, 0.088)];
  const NAMN = ['Ukud Cobra', 'Grizzly Bears', 'Llanowar Elves'];
  stam(NAMN.map((n, i) => klar(i + 1, n, { sen: 0, ...FR[i] })));
  const kort = [1, 2, 3].map(id => app.kort.find(c => c.spar === id));
  klocka.t += 150; stam([]);                                                        // alla tre lyfts i samma hand
  klocka.t += 300; stam(TILL.map((b, i) => vilande(11 + i, b, { tillstand: 'ny' })));
  klocka.t += 150; stam(TILL.map((b, i) => vilande(11 + i, b, { tillstand: 'stilla' })));
  tid(klocka.t + 700);
  assert.deepEqual(ofrSlag(), [], 'sex kort på mattan: tre i väntan och tre oframkallade');
  // telefonen läser ett i taget: det första med en gissning, de andra väntar
  klocka.t += 300; stam(TILL.map((b, i) => vilande(11 + i, b, i === 0 ? { namn: NAMN[0], cands: [{ name: NAMN[0], score: 0.4 }] } : { tillstand: 'stilla' })));
  tid(klocka.t + 100);
  assert.equal(kort[0].spar, 11); assert.deepEqual(ofrSlag(), []);
  klocka.t += 300; stam(TILL.map((b, i) => vilande(11 + i, b, i < 2 ? { namn: NAMN[i], cands: [{ name: NAMN[i], score: 0.4 }] } : { tillstand: 'stilla' })));
  klocka.t += 300; stam(TILL.map((b, i) => vilande(11 + i, b, { namn: NAMN[i], cands: [{ name: NAMN[i], score: 0.4 }] })));
  tid(klocka.t + 100);
  assert.deepEqual(kort.map(k => k.spar), [11, 12, 13], 'vart kort dit det lades');
  assert.deepEqual(ofrSlag(), []); assert.equal(app.kort.length, 3);
});

console.log([...ok, ...fel].join('\n'));
console.log(`\n${ok.length} OK, ${fel.length} FEL`);
process.exit(fel.length ? 1 : 0);

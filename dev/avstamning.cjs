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
/* Typraden (besvärjelseregeln, MODE-3): per namn i provet, annars tom. */
let typRad = new Map();
function typLinje(k) { return typRad.get(k.name) || ''; }
/* Uppstarten (MES-122): pågår den spelas inget ut. Av i alla prov utom UP. */
let oppPagar = false;
function oppstartPagar() { return oppPagar; }
`;
const klocka = { t: 1e6 };
const app = new Function('Date', 'setTimeout', 'clearTimeout', miljo + kod + `
return {
  avstamBord, tackning, sammaPlats, lekPrior,
  kamBildTillVy, kamVyTillBild, provKortMatt, provKortStorlek, zonForslag, bibBredvid, provkortSpar, provkortUt, provLasSteg,
  oppSteg4Klar, oppOppnasIgen,
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
  /* Steget att spara ett otappat läge (MES-27): det statusfältet ritar, ur
     mitt bord och senaste bordet — { namn, spar } eller null — och "Inte
     nu"-flaggan. senaste() är kortet knappen i kameravyn tar. */
  steg() { return grundSteg(state.players[0], senasteSpar); },
  senaste() { return senasteMattaKort(state.players[0], senasteSpar); },
  set avbojd(v) { grundAvbojd = !!v; },
  /* Statusfältet (MES-32, MES-27): modellen som renderAutoBar ritar, med
     samma underlag som i appen — senaste bordet, avstämningens lösa spår
     och när varje spår först sågs. extra lägger till det som kommer
     utifrån (sma, fas, rad). */
  remsa(extra) { return autoRemsaModell(senasteSpar, state.players[0], Object.assign({ nu: Date.now(), sedd: sparSedd, lage: sparLage, losa: losaSpar, borttagna, ser: kamSer }, extra || {})); },
  /* Platshållarna i rutnätet (MES-42): samma underlag som remsan. */
  platser(extra) { return autoPlatser(senasteSpar, state.players[0], Object.assign({ nu: Date.now(), sedd: sparSedd, lage: sparLage, losa: losaSpar, borttagna, ser: kamSer }, extra || {})); },
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
  /* Nollställningen går genom avstamBord: det är där "senaste kortet"
     börjar om, som när telefonen nollställt sig. Grundläget och "Inte nu"
     hör till spelet, inte nollställningen — de sätts om här, som när man
     lämnar spelet. */
  nollstall() { avstamBord([], true); state.players[0].cards = []; state.players[0].pending = []; hoppade = new Set(); borttagna = new Set(); n = 0; lyftTips = null; kamFas = ''; kamGrund = 20; grundAvbojd = false; lekTal = new Map(); typRad = new Map(); delete state.players[0].lage; autoSum = null; lsMinne.clear(); oppPagar = false; }
};`)({ now: () => klocka.t }, () => 0, () => {});

const stam = (spar, fas = 'kort') => app.avstamBord(spar, false, fas);
const box = (x, y, w, h) => ({ x, y, w, h });
/* Ett stående kort 0,063 × 0,088 av bilden, och samma kort tappat runt sitt
   nedre vänstra hörn (liggande, hörnet delat). */
const PORT = box(0.40, 0.40, 0.063, 0.088), LAND_ = box(0.40, 0.40 + 0.088 - 0.063, 0.088, 0.063);
const LANGT = box(0.8, 0.1, 0.063, 0.088);
const klar = (id, namn, rest) => Object.assign({ id, tillstand: 'klar', namn, saker: true, tappad: false }, rest);
const ok = [], fel = [];
const prov = (namn, f) => {
  app.nollstall(); klocka.t = 1e6;
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
prov('S11 nedtonat kort tas tillbaka av ett nytt spår', () => {
  app.kort.push({ cid: 'l', name: 'Ukud Cobra', flipped: 0, lyft: 1 });
  stam([klar(4, 'Ukud Cobra', { sen: 10, ...PORT })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].lyft, undefined); assert.equal(app.kort[0].spar, 4);
});
prov('S12 befintlig dubblett (två bundna) lämnas, följer var sitt spår', () => {
  app.kort.push({ cid: 'a', name: 'Ukud Cobra', flipped: 0, spar: 1, tapped: 0 }, { cid: 'b', name: 'Ukud Cobra', flipped: 0, spar: 2, tapped: 1 });
  stam([klar(1, 'Ukud Cobra', { skymd: true, sen: 900, ...PORT }), klar(2, 'Ukud Cobra', { tappad: true, sen: 10, ...LAND_ })]);
  assert.equal(app.kort.length, 2); assert.ok(app.kort.every(c => c.lyft == null));
});
prov('S12b befintlig dubblett: när helbildens spår försvinner tonas dess kort ned efter nådatiden', () => {
  app.kort.push({ cid: 'a', name: 'Ukud Cobra', flipped: 0, spar: 3, tapped: 1 }, { cid: 'b', name: 'Ukud Cobra', flipped: 0, spar: 4, tapped: 0 });
  const det = klar(3, 'Ukud Cobra', { tappad: true, sen: 10, ...box(0.367, 0.367, 0.179, 0.213) });
  stam([det, klar(4, 'Ukud Cobra', { ai: { helbild: true }, sen: null, ...box(0.5, 0.327, 0.129, 0.287) })]);
  stam([det]);
  assert.ok(app.kort.find(c => c.cid === 'b').borta, 'nåd');
  klocka.t += 3100; stam([det]);
  const [a, b] = ['a', 'b'].map(cid => app.kort.find(c => c.cid === cid));
  assert.equal(app.kort.length, 2); assert.equal(a.spar, 3); assert.equal(a.lyft, undefined);
  assert.equal(b.spar, undefined); assert.ok(b.lyft != null, 'nedtonat');
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
prov('S16 samma spår, ett annat säkert namn: det gamla tonas ned, det nya får ett kort', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  stam([klar(1, 'Llanowar Elves', { sen: 10, ...PORT })]);
  const u = app.kort.find(c => c.name === 'Ukud Cobra'), l = app.kort.find(c => c.name === 'Llanowar Elves');
  assert.equal(app.kort.length, 2); assert.ok(u.lyft != null); assert.equal(u.spar, undefined); assert.equal(l.spar, 1);
});
/* Landen tonas ned som permanents (MES-29): förut släpptes ett lyft lands
   bindning tyst, och raden sa fyra Forest när tre låg kvar. Graveyard aldrig. */
prov('L1 ett land kameran inte ser längre tonas ned efter nådatiden, det andra står kvar', () => {
  stam([klar(1, 'Forest', { sen: 10, ...PORT }), klar(2, 'Forest', { sen: 10, ...LANGT })]);
  const a = app.kort.find(c => c.spar === 1), b = app.kort.find(c => c.spar === 2);
  stam([klar(2, 'Forest', { sen: 10, ...LANGT })]);
  assert.ok(a.borta && a.lyft == null, 'nåd');
  klocka.t += 3100; stam([klar(2, 'Forest', { sen: 10, ...LANGT })]);
  assert.equal(app.kort.length, 2); assert.ok(a.lyft != null, 'nedtonat'); assert.equal(a.spar, undefined);
  assert.equal(b.lyft, undefined); assert.equal(b.spar, 2);
});
prov('L2 ett land i graveyard tonas inte ned när spåret dör — bindningen släpps tyst', () => {
  stam([klar(1, 'Forest', { sen: 10, ...PORT })]);
  app.kort[0].zon = 'grav';
  stam([]); klocka.t += 3100; stam([]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].lyft, undefined); assert.equal(app.kort[0].spar, undefined);
});
prov('L3 ett nedtonat land läggs tillbaka: ett nytt spår tar det, inget nytt Forest', () => {
  stam([klar(1, 'Forest', { sen: 10, ...PORT })]);
  stam([]); klocka.t += 3100; stam([]);
  assert.ok(app.kort[0].lyft != null, 'nedtonat');
  stam([klar(9, 'Forest', { sen: 10, ...PORT })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].lyft, undefined); assert.equal(app.kort[0].spar, 9);
});
prov('L4 samma spår, ett annat säkert namn på ett land: det gamla landet tonas ned', () => {
  stam([klar(1, 'Forest', { sen: 10, ...PORT })]);
  stam([klar(1, 'Mountain', { sen: 10, ...PORT })]);
  const f = app.kort.find(c => c.name === 'Forest'), m = app.kort.find(c => c.name === 'Mountain');
  assert.equal(app.kort.length, 2); assert.ok(f.lyft != null); assert.equal(f.spar, undefined); assert.equal(m.spar, 1);
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
prov('P3 ledtråden väntar: ett nedtonat Forest står kvar lyft medan spåret prövas, binds sedan', () => {
  app.kort.push({ cid: 'f', name: 'Forest', flipped: 0, lyft: 1 });
  stam([okant(902, { gissning: 'Forest', provas: true })]);
  assert.ok(app.kort[0].lyft != null, 'lyft'); assert.equal(app.kort[0].spar, undefined);
  stam([okant(902, { gissning: 'Forest', provas: false })]);
  assert.equal(app.kort[0].lyft, undefined); assert.equal(app.kort[0].spar, 902); assert.equal(app.pending.length, 0);
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
prov('K4 nedtonat kort bundet på ledtråden och sedan tappat: fortfarande ett kort', () => {
  app.kort.push({ cid: 'u', name: 'Ukud Cobra', flipped: 0, lyft: 1 });
  stam([okant(1, { namn: 'Ukud Cobra', gissning: 'Ukud Cobra', sen: 10, ...PORT })]);
  assert.equal(app.kort[0].spar, 1, 'bands inte på ledtråden');
  stam([okant(1, { namn: 'Ukud Cobra', gissning: 'Ukud Cobra', skymd: true, sen: 1200, ...PORT }), klar(2, 'Ukud Cobra', { tappad: true, sen: 30, ...LAND_ })]);
  assert.equal(app.kort.length, 1, 'dubblett'); assert.equal(app.kort[0].spar, 2); assert.equal(app.kort[0].tapped, 1);
  assert.equal(app.pending.length, 0, 'det osäkra spåret köades');
  stam([klar(2, 'Ukud Cobra', { tappad: true, sen: 20, ...LAND_ })]);
  klocka.t += 5000; stam([klar(2, 'Ukud Cobra', { tappad: true, sen: 20, ...LAND_ })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].lyft, undefined, 'originalet tonades ned');
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
/* Steget i statusfältet (grundSteg): "Lägg korten som du vill ha dem
   otappade — <kort> ligger så nu? [Spara som otappat läge] [Inte nu]".
   Visas så snart ett kamerakort detektorn mätt (sen != null, inte helbild)
   ligger på bordet och telefonen själv sagt att inget läge är sparat
   (null); inte för en telefon som inte kan svara (undefined), inte när
   läget finns, och inte efter "Inte nu". Nämner det senaste kortet — samma
   som knappen i kameravyn tar. */
prov('T6 steget: första mätta kamerakortet, inget läge, inte avböjt', () => {
  app.grund = null;
  assert.equal(app.steg(), null, 'tomt bord: inget steg');
  stam([klar(3, 'Ukud Cobra', { ai: { helbild: true }, sen: null, ...box(0.41, 0.42, 0.063, 0.088) })]);
  assert.equal(app.kort.length, 1); assert.equal(app.steg(), null, 'ett helbildskort har ingen vinkel: inget steg');
  stam([klar(3, 'Ukud Cobra', { ai: { helbild: true }, sen: null, ...box(0.41, 0.42, 0.063, 0.088) }), klar(4, 'Forest', { sen: 10, ...LANGT })]);
  assert.deepEqual(app.steg(), { namn: 'Forest', spar: 4 }, 'första mätta kortet');
  stam([klar(4, 'Forest', { sen: 10, ...LANGT }), klar(5, 'Plains', { sen: 10, ...PORT })]);
  assert.deepEqual(app.steg(), { namn: 'Plains', spar: 5 }, 'det senaste kortet');
  assert.equal(app.senaste().spar, 5, 'knappen i kameravyn tar samma kort');
  stam([klar(4, 'Forest', { sen: 10, ...LANGT })]);   // Plains lyfts: kortet är borta i nåd, steget tar Forest
  assert.deepEqual(app.steg(), { namn: 'Forest', spar: 4 });
  app.avbojd = true;
  assert.equal(app.steg(), null, '"Inte nu" håller undan steget');
  app.avstamBord([], true);   // telefonen tog en ny referensbild — steget ska inte tjata igen
  stam([klar(6, 'Forest', { sen: 10, ...LANGT })]);
  assert.equal(app.steg(), null, 'avböjt gäller över en nollställning');
  app.avbojd = false;
  assert.deepEqual(app.steg(), { namn: 'Forest', spar: 6 });
  app.grund = 20;
  assert.equal(app.steg(), null, 'läget sparat: inget steg');
  app.grund = undefined;
  assert.equal(app.steg(), null, 'telefon som inte kan svara: inget steg');
});
prov('T6b steget också för ett kort som låg på bordet och bands till ett mätt spår', () => {
  app.grund = null;
  app.kort.push({ cid: 'm', name: 'Forest', flipped: 0 });
  stam([klar(1, 'Forest', { sen: 10, ...PORT })]);
  assert.equal(app.kort.length, 1); assert.equal(app.kort[0].spar, 1); assert.equal(app.senasteKamSpar, null);
  assert.deepEqual(app.steg(), { namn: 'Forest', spar: 1 });
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
  /* Spåren borta: korten är bundna och synliga i nådatiden (BORTA_NAD), så
     de räknas tills de tonas ned — då är bordet tomt och anmärkningen
     säger varför. */
  stam([]); m = app.remsa(); assert.equal(m.text, 'Camera · 2 cards on the table'); assert.equal(m.not, null);
  klocka.t += 3200; stam([]); m = app.remsa();
  assert.equal(m.text, 'Camera · the table is empty'); assert.equal(m.not, 'Two cards are no longer visible');
});
prov('R6b två kort på bordet och ett tredje på väg: "2 kort på bordet · 1 på väg"', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT }), klar(2, 'Forest', { sen: 10, ...LANGT }), { id: 3, tillstand: 'ny', sen: 10, ...LAND_ }]);
  const m = app.remsa();
  assert.equal(m.text, 'Camera · 2 cards on the table · 1 on the way'); assert.deepEqual(paVag(m), ['laser:3']);
});
prov('R7 ett nedtonat kort: "<namn> syns inte längre", och det räknas inte som på bordet', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  stam([]); klocka.t += 3200; stam([]);
  assert.ok(app.kort[0].lyft, 'nedtonat');
  const m = app.remsa();
  assert.equal(m.not, 'Ukud Cobra is no longer visible'); assert.equal(m.text, 'Camera · the table is empty');
});
prov('R7b flera nedtonade: "Två kort syns inte längre"', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT }), klar(2, 'Forest', { sen: 10, ...LANGT })]);
  stam([]); klocka.t += 3200; stam([]);
  assert.equal(app.kort.filter(c => c.lyft).length, 2);
  assert.equal(app.remsa().not, 'Two cards are no longer visible');
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
prov('K5 "syns inte längre" står i sex sekunder efter nedtoningen, sedan inte', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  stam([]); klocka.t += 3200; stam([]);
  assert.equal(app.remsa().not, 'Ukud Cobra is no longer visible');
  klocka.t += 5900; assert.equal(app.remsa().not, 'Ukud Cobra is no longer visible');
  klocka.t += 200; assert.equal(app.remsa().not, null); assert.ok(app.kort[0].lyft, 'fortfarande nedtonat');
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

/* ── platshållarna på bordet (MES-42) ── */
const platsSlag = l => l.map(p => `${p.slag}:${p.spar}${p.namn ? '=' + p.namn : ''}${p.pend ? '#' : ''}`);
prov('H1 ett spår som just föddes ("ny") får ingen plats förrän efter en halv sekund; stilla får en direkt', () => {
  stam([{ id: 1, tillstand: 'ny', sen: 0, ...PORT }]);
  assert.deepEqual(platsSlag(app.platser()), []);
  klocka.t += 400; stam([{ id: 1, tillstand: 'ny', sen: 0, ...PORT }]);
  assert.deepEqual(platsSlag(app.platser()), []);
  klocka.t += 200; stam([{ id: 1, tillstand: 'ny', sen: 0, ...PORT }]);
  assert.deepEqual(platsSlag(app.platser()), ['laser:1']);
  stam([{ id: 1, tillstand: 'stilla', sen: 0, ...PORT }, { id: 2, tillstand: 'stilla', sen: 0, ...LANGT }]);
  assert.deepEqual(platsSlag(app.platser()), ['laser:1', 'laser:2'], 'i den ordning de sågs');
});
prov('H1b ett nytt spår med ett korts mått (kortlik) får platsen i första rapporten, med spårets tap-läge (MES-226)', () => {
  stam([{ id: 1, tillstand: 'ny', kortlik: true, tappad: true, sen: 0, ...PORT }, { id: 2, tillstand: 'ny', sen: 0, ...LANGT }]);
  const l = app.platser();
  assert.deepEqual(platsSlag(l), ['laser:1'], 'handen (inte kortlik) väntar sin halva sekund');
  assert.equal(l[0].tappad, true);
  // spåret dör utan namn: platsen försvinner tyst, inget kort och ingen granskning
  stam([]);
  assert.deepEqual(platsSlag(app.platser()), []); assert.equal(app.kort.length, 0); assert.equal(app.pending.length, 0);
});
prov('H2 ett spår som väntar på Claude: "vantar" med gissningen; skymda och klara bundna får ingen plats', () => {
  stam([{ id: 1, tillstand: 'okand', provas: true, gissning: 'Plains', sen: 0, ...PORT }, klar(2, 'Forest', { sen: 10, ...LANGT }), { id: 3, tillstand: 'stilla', skymd: true, sen: 900, x: 0.1, y: 0.1, w: 0.063, h: 0.088 }]);
  assert.equal(app.kort.length, 1);
  assert.deepEqual(platsSlag(app.platser()), ['vantar:1=Plains']);
});
prov('H3 ett osäkert spår i granskningen: "fyll" med posten och förslaget; kortet ifyllt → platsen borta, kortet kvar', () => {
  stam([{ id: 1, tillstand: 'okand', sen: 0, cands: [{ name: 'Swamp', score: 0.4 }], ...PORT }]);
  assert.equal(app.pending.length, 1);
  const l = app.platser();
  assert.deepEqual(platsSlag(l), ['fyll:1=Swamp#']); assert.equal(l[0].pend, app.pending[0].id);
  // spåret blir klart (namnet fylldes i och telefonen fick det): kortet skapas, posten och platsen försvinner
  stam([klar(1, 'Swamp', { sen: 0, ...PORT })]);
  assert.equal(app.kort.length, 1); assert.equal(app.pending.length, 0);
  assert.deepEqual(platsSlag(app.platser()), []);
});
prov('H4 platserna och remsan räknar samma "på väg"', () => {
  stam([{ id: 1, tillstand: 'stilla', sen: 0, ...PORT }, { id: 2, tillstand: 'okand', provas: true, sen: 0, ...LANGT }]);
  const m = app.remsa();
  assert.equal(m.text, 'Camera · 2 on the way');
  assert.equal(app.platser().filter(p => p.slag !== 'fyll').length, m.paVag.length);
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
  assert.deepEqual(platsSlag(app.platser()), ['fyll:2=Sol Ring#']);
  klocka.t += 3000;
  stam([klar(1, 'Sol Ring', { sen: 20, ...PORT }), klar(2, 'Sol Ring', { sen: 20, ...LANGT })]);
  assert.equal(app.pending.length, 1, 'dubblett av frågan'); assert.equal(app.kort.length, 1);
  stam([klar(1, 'Sol Ring', { sen: 20, ...PORT })]);       // spåret dör: frågan försvinner
  assert.equal(app.pending.length, 0); assert.equal(app.kort.length, 1);
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
prov('P2 Table leads: samma sak tonar ned kortet', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  stam([]); klocka.t += 3100; stam([]);
  assert.ok(app.kort[0].lyft != null);
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
prov('P4 grundsteget bara i Table leads', () => {
  app.grund = null;
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  assert.ok(app.steg(), 'bord: inget steg');
  app.spelsatt = 'skarm';
  assert.equal(app.steg(), null, 'skarm: steg');
});
prov('P5 besvärjelseregeln: ett instant som plockas upp inom 20 s går till graveyard i båda lägena; efter 20 s som vanligt', () => {
  app.typ = new Map([['Lightning Bolt', 'Instant'], ['Ukud Cobra', 'Creature — Snake']]);
  stam([klar(1, 'Lightning Bolt', { sen: 20, ...PORT }), klar(2, 'Ukud Cobra', { sen: 20, ...LANGT })]);
  klocka.t += 4000;
  stam([klar(2, 'Ukud Cobra', { sen: 20, ...LANGT })]); klocka.t += 3100; stam([klar(2, 'Ukud Cobra', { sen: 20, ...LANGT })]);
  const bolt = app.kort.find(k => k.name === 'Lightning Bolt');
  assert.equal(bolt.zon, 'grav'); assert.ok(bolt.spellAuto); assert.equal(bolt.lyft, undefined);
  // varelsen som plockas upp tonas ned (bord)
  stam([]); klocka.t += 3100; stam([]);
  assert.ok(app.kort.find(k => k.name === 'Ukud Cobra').lyft != null);
  // efter 20 s: instantet är en permanent på bordet, inte en besvärjelse
  app.nollstall(); klocka.t = 1e6; app.typ = new Map([['Lightning Bolt', 'Instant']]);
  stam([klar(1, 'Lightning Bolt', { sen: 20, ...PORT })]);
  klocka.t += 25000; stam([klar(1, 'Lightning Bolt', { sen: 20, ...PORT })]);
  stam([]); klocka.t += 3100; stam([]);
  assert.equal(app.kort[0].zon, undefined); assert.ok(app.kort[0].lyft != null);
  // Screen leads: samma regel, men en permanent släpps tyst
  app.nollstall(); klocka.t = 1e6; app.spelsatt = 'skarm'; app.typ = new Map([['Lightning Bolt', 'Instant']]);
  stam([klar(1, 'Lightning Bolt', { sen: 20, ...PORT })]);
  stam([]); klocka.t += 3100; stam([]);
  assert.equal(app.kort[0].zon, 'grav');
});
prov('P6 täckt: ett bifogat kort vars värd syns är inte borta när dess spår dör', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT }), klar(2, 'Bonesplitter', { sen: 20, ...LANGT })]);
  const vard = app.kort.find(k => k.name === 'Ukud Cobra'), utr = app.kort.find(k => k.name === 'Bonesplitter');
  utr.attachedTo = vard.cid;
  stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]); klocka.t += 3100; stam([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })]);
  assert.equal(utr.lyft, undefined); assert.equal(utr.spar, undefined);
  stam([]); klocka.t += 3100; stam([]);
  assert.ok(vard.lyft != null);
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
prov('GR3 högen ändras inte: frågan som förut', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(0));
  klocka.t += 150; stamG([], hog(0)); klocka.t += 3100; stamG([], hog(0));
  assert.equal(app.kort[0].zon, undefined); assert.ok(app.kort[0].lyft != null);
});
prov('GR4 två kort försvinner, högen ändras en gång: båda frågas', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT }), klar(2, 'Grizzly Bears', { sen: 20, ...LANGT })], hog(0));
  klocka.t += 150; stamG([], hog(0));
  klocka.t += 1000; stamG([], hog(1));
  klocka.t += 2100; stamG([], hog(1));
  for (const k of app.kort) { assert.equal(k.zon, undefined, k.name); assert.ok(k.lyft != null, k.name); }
});
prov('GR5 tre kort på en gång och tre ändringar: bannern, ingen auto', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT }), klar(2, 'Grizzly Bears', { sen: 20, ...LANGT }), klar(3, 'Llanowar Elves', { sen: 20, ...MITT })], hog(0));
  klocka.t += 150; stamG([], hog(0));
  klocka.t += 1000; stamG([], hog(3));
  klocka.t += 2100; stamG([], hog(3));
  for (const k of app.kort) { assert.equal(k.zon, undefined, k.name); assert.ok(k.lyft != null, k.name); }
});
prov('GR6 efterskottet: högen blir stilla efter nådatiden — det nedtonade kortet går till graveyard', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(0));
  klocka.t += 150; stamG([], hog(0)); klocka.t += 3100; stamG([], hog(0));
  assert.ok(app.kort[0].lyft != null);
  klocka.t += 900; stamG([], hog(1));             // 4 s efter att det försvann
  assert.equal(app.kort[0].zon, 'grav'); assert.ok(app.kort[0].gravAuto); assert.equal(app.kort[0].lyft, undefined);
});
prov('GR7 högen ändrades tio sekunder innan kortet försvann: frågan', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(0));
  klocka.t += 150; stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(1));
  klocka.t += 10000; stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(1));
  klocka.t += 150; stamG([], hog(1)); klocka.t += 3100; stamG([], hog(1));
  assert.equal(app.kort[0].zon, undefined); assert.ok(app.kort[0].lyft != null);
});
prov('GR8 telefonen startade om (talet sjunker): ingen falsk ändring', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], hog(5));
  klocka.t += 150; stamG([], hog(5));
  klocka.t += 1000; stamG([], hog(0));
  klocka.t += 2100; stamG([], hog(0));
  assert.equal(app.kort[0].zon, undefined); assert.ok(app.kort[0].lyft != null);
});
prov('GR9 besvärjelsen tar högens ändring: varelsen som plockades samtidigt frågas', () => {
  app.typ = new Map([['Lightning Bolt', 'Instant'], ['Ukud Cobra', 'Creature — Snake']]);
  stamG([klar(1, 'Lightning Bolt', { sen: 20, ...PORT }), klar(2, 'Ukud Cobra', { sen: 20, ...LANGT })], hog(0));
  klocka.t += 150; stamG([], hog(0));
  klocka.t += 1000; stamG([], hog(1));
  klocka.t += 2100; stamG([], hog(1));
  assert.equal(app.kort.find(k => k.name === 'Lightning Bolt').zon, 'grav');
  const cobra = app.kort.find(k => k.name === 'Ukud Cobra');
  assert.equal(cobra.zon, undefined); assert.ok(cobra.lyft != null);
});
prov('GR10 utan ruta (grav null) eller en telefon utan vakten: som förut', () => {
  stamG([klar(1, 'Ukud Cobra', { sen: 20, ...PORT })], null);
  klocka.t += 150; stamG([], null); klocka.t += 3100; stamG([], null);
  assert.ok(app.kort[0].lyft != null); assert.equal(app.kort[0].zon, undefined);
});

/* GU (MES-248): ett kort som tas UR graveyard och läggs på bordet igen —
   reanimator, recursion, Trusty Retriever. Samma kort flyttar tillbaka,
   och bara när ett nytt kort skulle ge fler exemplar än leken har. */
const iGrav = namn => app.kort.filter(c => c.zon === 'grav' && c.name === namn).length;
prov('GU1 leken har 1 Trusty Retriever och den ligger i graveyard: kortet på mattan är SAMMA kort, tillbaka i spel', () => {
  app.lek = new Map([['Trusty Retriever', 1]]);
  app.kort.push({ cid: 'g', name: 'Trusty Retriever', flipped: 0, zon: 'grav', gravAuto: 1, tapped: 1, x: 40, y: 80 });
  stam([klar(1, 'Trusty Retriever', { sen: 20, ...PORT })]);
  assert.equal(app.kort.length, 1, 'ett nytt kort skapades bredvid det i högen');
  const k = app.kort[0];
  assert.equal(k.cid, 'g'); assert.equal(k.zon, undefined); assert.equal(k.spar, 1);
  assert.equal(k.gravAuto, undefined); assert.equal(k.tapped, 0); assert.equal(k.etb, 1);
  assert.equal(k.x, null, 'platsen ska räknas om'); assert.equal(iGrav('Trusty Retriever'), 0);
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
  const c = app.kort.find(k => k.name === 'Ukud Cobra');
  assert.equal(c.zon, undefined, 'högens ändring räknades två gånger'); assert.ok(c.lyft != null);
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

/* MES-122: medan uppstarten pågår spelas inget ut. UP = uppstarten. */
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
  klocka.t += 150; stamG([], hog(1)); klocka.t += 3100; stamG([], hog(1));
  assert.equal(app.kort[0].zon, undefined); assert.ok(app.kort[0].lyft != null);
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
prov('UP16 steg 4 klart: Start playing, eller rutorna på raden från en annan dator — vinkeln bara i Mirror my table', () => {
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
  /* Mirror my table kräver vinkeln på raden, och utan4 gäller inte där. */
  assert.equal(k({}, true, null, true), false);
  assert.equal(k({}, true, 20, true), true);
  assert.equal(k({ utan4: true }, true, null, false), false);
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
  assert.equal(app.oppSteg4Klar(igen(fore, true, 'bord'), true, 20, true), false, 'Redo setup i Mirror my table');
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

console.log([...ok, ...fel].join('\n'));
console.log(`\n${ok.length} OK, ${fel.length} FEL`);
process.exit(fel.length ? 1 : 0);

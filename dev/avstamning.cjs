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
const save = () => {}, renderAll = () => {}, resolveAll = () => {}, renderMode = () => {}, uppdateraPbStatus = () => {}, kamSkruvTal = () => {};
let kamFas = '', kamYta = null, kamRad = '', kamTot = 0, kamLast = 0, kamSer = 0;
const BORTA_NAD = 3000; let lyftT = null, lyftTips = null;
let hoppade = new Set(), borttagna = new Set();
function slappLyft(k) { delete k.lyft; if (lyftTips === k.cid) lyftTips = null; }
function glomSpar() {}
/* Grundläget (MES-30, MES-27): telefonens besked i varje bord (null = inte
   sparat, undefined = telefon utan fältet, tal = sparat). Sparat i de flesta
   proven — tap-synken från spåren gäller bara då; T- och G-serien sätter
   null och provar otappat-tills-sparat och steget i statusfältet. */
let kamGrund = 20;
`;
const klocka = { t: 1e6 };
const app = new Function('Date', 'setTimeout', 'clearTimeout', miljo + kod + `
return {
  avstamBord, tackning, sammaPlats,
  get kort() { return state.players[0].cards; },
  get pending() { return state.players[0].pending; },
  get chip() { return { kamSer, kamLast, kamTot }; },
  get borttagna() { return borttagna; },
  get hoppade() { return hoppade; },
  set grund(v) { kamGrund = v; },
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
  remsa(extra) { return autoRemsaModell(senasteSpar, state.players[0], Object.assign({ nu: Date.now(), sedd: sparSedd, losa: losaSpar, borttagna, ser: kamSer }, extra || {})); },
  get losa() { return losaSpar; },
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
  nollstall() { avstamBord([], true); state.players[0].cards = []; state.players[0].pending = []; hoppade = new Set(); borttagna = new Set(); n = 0; lyftTips = null; kamFas = ''; kamGrund = 20; grundAvbojd = false; autoSum = null; lsMinne.clear(); }
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
prov('R1 ett nytt spår: "1 på väg", sett från första bordet, ingen anmärkning', () => {
  stam([{ id: 1, tillstand: 'ny', sen: 10, ...PORT }]);
  let m = app.remsa();
  assert.equal(m.text, 'Auto · 1 på väg'); assert.equal(m.not, null); assert.equal(m.granska, 0);
  assert.deepEqual(paVag(m), ['laser:1']); assert.equal(m.paVag[0].sedan, klocka.t); assert.equal(m.paVag[0].namn, null);
  klocka.t += 2400; stam([{ id: 1, tillstand: 'stilla', sen: 10, ...PORT }]);
  m = app.remsa(); assert.deepEqual(paVag(m), ['laser:1']); assert.equal(klocka.t - m.paVag[0].sedan, 2400); assert.equal(m.not, null);
});
prov('R1b ett spår som är "ny" i över tre sekunder rör sig: "Något rör sig på bordet"', () => {
  stam([{ id: 1, tillstand: 'ny', sen: 10, ...PORT }]);
  klocka.t += 3500; stam([{ id: 1, tillstand: 'ny', sen: 10, ...PORT }]);
  const m = app.remsa(); assert.equal(m.not, 'Något rör sig på bordet'); assert.equal(m.text, 'Auto · 1 på väg');
});
prov('R2 ett spår som prövas väntar på Claude: på väg, gissningen som namn, ingen post i kön', () => {
  stam([{ id: 1, tillstand: 'okand', provas: true, gissning: 'Forest', sen: 10, ...PORT }]);
  klocka.t += 5000; stam([{ id: 1, tillstand: 'okand', provas: true, gissning: 'Forest', sen: 10, ...PORT }]);
  const m = app.remsa();
  assert.equal(app.pending.length, 0); assert.equal(m.granska, 0);
  assert.deepEqual(paVag(m), ['vantar:1']); assert.equal(m.paVag[0].namn, 'Forest'); assert.equal(klocka.t - m.paVag[0].sedan, 5000);
  assert.equal(m.text, 'Auto · 1 på väg');
});
prov('R3 okänt med post i kön: granskningen räknar det, inget "på väg", ingen anmärkning', () => {
  stam([{ id: 1, tillstand: 'okand', cands: [{ name: 'Forest', sid: 's', score: 0.5 }], sen: 10, ...PORT }]);
  assert.equal(app.pending.length, 1);
  const m = app.remsa();
  assert.equal(m.granska, 1); assert.deepEqual(m.paVag, []); assert.equal(m.not, null);
  assert.equal(m.text, 'Auto');            // inte "bordet är tomt": kameran ser ett kort
});
prov('R3b okänt som hoppats över i granskningen: varken på väg eller i kön', () => {
  stam([{ id: 1, tillstand: 'okand', sen: 10, ...PORT }]);
  app.pending.length = 0; app.hoppade.add(1);
  stam([{ id: 1, tillstand: 'okand', sen: 10, ...PORT }]);
  assert.equal(app.pending.length, 0);
  const m = app.remsa(); assert.equal(m.granska, 0); assert.deepEqual(m.paVag, []); assert.equal(m.text, 'Auto');
});
prov('R4 skymt spår som inte är ett kort: inte på väg, ingen anmärkning', () => {
  stam([{ id: 1, tillstand: 'stilla', skymd: true, sen: 900, ...PORT }]);
  const m = app.remsa(); assert.deepEqual(m.paVag, []); assert.equal(m.not, null); assert.equal(m.text, 'Auto');
});
prov('R5 sma=1: "Ett kort är för litet för att läsas", utan spår; två blir "Två kort … för små"', () => {
  stam([]);
  let m = app.remsa({ sma: 1 });
  assert.equal(m.not, 'Ett kort är för litet för att läsas'); assert.equal(m.text, 'Auto'); assert.deepEqual(m.paVag, []);
  m = app.remsa({ sma: 2 }); assert.equal(m.not, 'Två kort är för små för att läsas');
  m = app.remsa({ sma: 7 }); assert.equal(m.not, '7 kort är för små för att läsas');
});
prov('R5b telefonens råd om avståndet: första meningen, utan siffror, före "för litet"', () => {
  stam([]);
  let m = app.remsa({ rad: 'Korten är små i bilden. Flytta telefonen närmare bordet.', sma: 1 });
  assert.equal(m.not, 'Korten är små i bilden');
  m = app.remsa({ rad: 'Korten är små i bilden. Telefonen ger 1280×720 men klarar 3840×2160.' });
  assert.equal(m.not, 'Korten är små i bilden');
});
prov('R6 allt bundet: "N kort på bordet" och inget mer — också när ett kort ses som två spår', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT }), klar(2, 'Forest', { sen: 10, ...LANGT })]);
  let m = app.remsa();
  assert.equal(m.text, 'Auto · 2 kort på bordet'); assert.deepEqual(m.paVag, []); assert.equal(m.not, null); assert.equal(m.granska, 0);
  stam([klar(1, 'Ukud Cobra', { skymd: true, sen: 1200, ...PORT }), klar(3, 'Ukud Cobra', { tappad: true, sen: 30, ...LAND_ }), klar(2, 'Forest', { sen: 10, ...LANGT })]);
  m = app.remsa(); assert.equal(m.text, 'Auto · 2 kort på bordet'); assert.deepEqual(m.paVag, []);
  assert.deepEqual([...app.losa], []);
  /* Spåren borta: korten är bundna och synliga i nådatiden (BORTA_NAD), så
     de räknas tills de tonas ned — då är bordet tomt och anmärkningen
     säger varför. */
  stam([]); m = app.remsa(); assert.equal(m.text, 'Auto · 2 kort på bordet'); assert.equal(m.not, null);
  klocka.t += 3200; stam([]); m = app.remsa();
  assert.equal(m.text, 'Auto · bordet är tomt'); assert.equal(m.not, 'Två kort syns inte längre');
});
prov('R6b två kort på bordet och ett tredje på väg: "2 kort på bordet · 1 på väg"', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT }), klar(2, 'Forest', { sen: 10, ...LANGT }), { id: 3, tillstand: 'ny', sen: 10, ...LAND_ }]);
  const m = app.remsa();
  assert.equal(m.text, 'Auto · 2 kort på bordet · 1 på väg'); assert.deepEqual(paVag(m), ['laser:3']);
});
prov('R7 ett nedtonat kort: "<namn> syns inte längre", och det räknas inte som på bordet', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  stam([]); klocka.t += 3200; stam([]);
  assert.ok(app.kort[0].lyft, 'nedtonat');
  const m = app.remsa();
  assert.equal(m.not, 'Ukud Cobra syns inte längre'); assert.equal(m.text, 'Auto · bordet är tomt');
});
prov('R7b flera nedtonade: "Två kort syns inte längre"', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT }), klar(2, 'Forest', { sen: 10, ...LANGT })]);
  stam([]); klocka.t += 3200; stam([]);
  assert.equal(app.kort.filter(c => c.lyft).length, 2);
  assert.equal(app.remsa().not, 'Två kort syns inte längre');
});
prov('R8 medan telefonen lär sig ljuset: "lär sig ljuset" och "Håll telefonen stilla", inget annat', () => {
  stam([{ id: 1, tillstand: 'ny', sen: 10, ...PORT }]);
  const m = app.remsa({ fas: 'lar' });
  assert.equal(m.text, 'Auto · lär sig ljuset'); assert.equal(m.not, 'Håll telefonen stilla'); assert.deepEqual(m.paVag, []);
  /* Ytans råd hör till kameravyn, aldrig till fältet: ingen anmärkning. */
  assert.equal(app.remsa({ yta: { dom: 'orolig', rad: 'Bordets mönster gör kameran osäker. …' } }).not, null);
});
prov('R9 ett kort borttaget för hand: spåret är löst men varken på väg eller i kön', () => {
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  const k = app.kort.pop(); app.borttagna.add(k.spar);
  stam([klar(1, 'Ukud Cobra', { sen: 10, ...PORT })]);
  assert.equal(app.kort.length, 0);
  const m = app.remsa(); assert.deepEqual(m.paVag, []); assert.equal(m.granska, 0); assert.equal(m.text, 'Auto');
});
prov('R10 nollställning glömmer när spåren sågs: spår 1 är nytt igen', () => {
  stam([{ id: 1, tillstand: 'ny', sen: 10, ...PORT }]);
  klocka.t += 4000; app.avstamBord([], true);
  stam([{ id: 1, tillstand: 'stilla', sen: 10, ...PORT }]);
  const m = app.remsa(); assert.deepEqual(paVag(m), ['laser:1']); assert.equal(m.paVag[0].sedan, klocka.t);
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
  assert.equal(k.totalt.anrop, 2); assert.ok(nara(k.totalt.usd, 0.00631)); assert.deepEqual(k.totalt.okandPris, ['okänd']);
});

console.log([...ok, ...fel].join('\n'));
console.log(`\n${ok.length} OK, ${fel.length} FEL`);
process.exit(fel.length ? 1 : 0);

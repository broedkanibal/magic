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
const spelLage = { mig: 'p1' };
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
  nollstall() { state.players[0].cards = []; state.players[0].pending = []; hoppade = new Set(); borttagna = new Set(); n = 0; lyftTips = null; kamFas = ''; }
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

console.log([...ok, ...fel].join('\n'));
console.log(`\n${ok.length} OK, ${fel.length} FEL`);
process.exit(fel.length ? 1 : 0);

/* Riktat prov för kamSkalas lås (MES-342, granskningens fynd 1 och 2): leken och första kortet inom 8 %,
   en blink på 1 s, två värden som fladdrar mot varandra, ett nytt värde som står sig, ett kort som bärs (kam.prel),
   spärren medan korten bärs, ett kort i graveyard, leken och ett kort som aldrig vilar, korten borta.
   MES-345: bara kort som syns hela mäter (kamHel) — en hög med delvis täckta kort (under, en remsa som inte ryms i
   lådan, en låda från när kortet låg i högen, en hand över), och att skalan ändå byts av hela kort och får en
   första skala ur en hög när inget är mätt.
   Kör: node dev/kamskala-las.cjs [index.html]. Slutkod 1 vid FEL. .cjs eftersom package.json säger "type": "module". */
'use strict';
const fs = require('fs');
const HTML = process.argv[2] || require('path').join(__dirname, '..', 'index.html');
const src = fs.readFileSync(HTML, 'utf8');
const a0 = src.indexOf('function kamKortsida('), a = a0 >= 0 ? a0 : src.indexOf('function kamSkala(p)'), b = src.indexOf('function kamTillMatta', a);   // kamKortsida (MES-342) och kamHel (MES-345) står före kamSkala där de finns
const kod = src.slice(a, b);
let fel = 0;
const ok = (namn, villkor, info) => { console.log(`${villkor ? 'OK ' : 'FEL'}  ${namn}${info ? '  (' + info + ')' : ''}`); if (!villkor) fel++; };
const ASP = 1080 / 1920, R = 1.397;
function ny() {
  const klocka = { t: 0 };
  const app = new Function('Date', `const MATTA = { CW: 178 }; const kamUpplosning = { w: 1920, h: 1080 }; const kamSkalaFryst = () => null; const paMattan = e => !e.zon || (e.zon !== 'grav' && e.zon !== 'exil');\nlet senasteRa = [];\n${kod}\nreturn { kamSkala, bord: r => { senasteRa = r; } };`)({ now: () => klocka.t });
  const p = { id: 'p1', cards: [], bibHog: null };
  /* Spela: varje 0,1 s ett anrop med kortens bredder enligt fn(t) (null = inga kort), lek = lekens bredd. Varje kort har ett
     spår i telefonens bord (senasteRa) med samma låda, helt. Ett objekt är en låda som den är: { w, h, prel, zon } och
     spårets fält (MES-345): under, skymd, rl (remsans låda, andelar av bredden), rsynt, nu ({ w, h }: spårets låda i bordet
     när den inte är k.kam), utanSpar (kortets spår finns inte i bordet). */
  const spela = (t0, t1, fn, lek) => { const ut = []; for (let t = t0; t <= t1 + 1e-9; t += 100) {
    klocka.t = t; const w = fn(t);
    const lador = w == null ? [] : [].concat(w).map(x => typeof x === 'object' ? x : { w: x, h: x * R / ASP });
    p.cards = lador.map((x, i) => ({ spar: i + 1, kam: { w: x.w, h: x.h, prel: x.prel }, zon: x.zon }));
    app.bord(lador.map((x, i) => ({ id: x.utanSpar ? -1 : i + 1, w: (x.nu || x).w, h: (x.nu || x).h, under: x.under || null, skymd: !!x.skymd, rl: x.rl || null, rsynt: !!x.rsynt })));
    p.bibHog = lek ? { kam: { w: lek, h: lek * R / ASP } } : null; ut.push([t, app.kamSkala(p)]); } return ut; };
  return { spela };
}
const S = w => Math.round(178 / w);
const unika = l => [...new Set(l.map(x => Math.round(x[1])))];

/* 1. Leken satte låset, första kortet inom 8 % — sedan en blink på 1 s (0,095) ska INTE flytta mattan. */
{
  const { spela } = ny();
  spela(0, 2000, () => null, 0.075);                         // leken: 2373
  spela(2100, 5000, () => [0.077], 0.075);                    // första kortet, inom 8 %
  const blink = spela(5100, 6000, () => [0.095], 0.075);      // blinkar 1 s
  const efter = spela(6100, 12000, () => [0.077], 0.075);
  ok('1 · leken, kort inom 8 %, blink 1 s: mattan står still', unika(blink.concat(efter)).length === 1 && unika(blink)[0] === S(0.075), 'skalor ' + unika(blink.concat(efter)).join(', '));
}
/* 1b. Leken till första kortet långt ifrån: byts direkt (som förut). */
{
  const { spela } = ny();
  spela(0, 2000, () => null, 0.075);
  const r = spela(2100, 2100, () => [0.090], 0.075);
  ok('1b · leken → första kortet mer än 8 % ifrån: byts direkt', Math.round(r[0][1]) === S(0.090), 'skala ' + Math.round(r[0][1]));
}
/* 2. Två värden som fladdrar mot varandra, båda mer än 8 % från låset: byts efter 3 s, till deras median. */
{
  const { spela } = ny();
  spela(0, 3000, () => [0.075]);                              // korten: 2373
  const r = spela(3100, 33000, t => [Math.floor(t / 300) % 2 ? 0.088 : 0.097]);
  const byte = r.find(x => Math.round(x[1]) !== S(0.075));
  ok('2 · fladder 2023/1835 i 30 s: skalan byts', !!byte, byte ? `byttes vid ${((byte[0] - 3100) / 1000).toFixed(1)} s till ${Math.round(byte[1])}` : 'satt fast vid ' + S(0.075));
  ok('2 · …efter 3 s, inte före', !!byte && byte[0] - 3100 >= 3000 && byte[0] - 3100 <= 3300);
  ok('2 · …och står sedan still', !!byte && unika(r.filter(x => x[0] > byte[0])).length === 1, byte ? 'skalor efter bytet ' + unika(r.filter(x => x[0] > byte[0])).join(', ') : '');
}
/* 3. Ett nytt värde som står sig: byts efter 3 s. En blink på 1 s från kortens lås: byts inte. */
{
  const { spela } = ny();
  spela(0, 3000, () => [0.075]);
  const blink = spela(3100, 4000, () => [0.095]);
  const tillbaka = spela(4100, 9000, () => [0.075]);
  ok('3 · kortens lås, blink 1 s: står still', unika(blink.concat(tillbaka)).length === 1);
  const r = spela(9100, 14000, () => [0.090]);
  const byte = r.find(x => Math.round(x[1]) === S(0.090));
  ok('3 · nytt värde som står sig: byts efter 3 s', !!byte && byte[0] - 9100 >= 3000 && byte[0] - 9100 <= 3300, byte ? `efter ${((byte[0] - 9100) / 1000).toFixed(1)} s` : 'byttes aldrig');
}
/* 5. Handen bär det enda kortet i 4 s (kam.prel, lådan nästan fyrkantig med handen): skalan står kvar.
      Kortet läggs ned med en låda inom 8 %: står kvar. (golden 12, 38,55–41,25 s) */
{
  const { spela } = ny();
  spela(0, 3000, () => [0.075]);
  const bars = spela(3100, 7100, () => [{ w: 0.136, h: 0.256, prel: 1 }]);
  const ned = spela(7200, 12000, () => [0.078]);
  ok('5 · kortet bärs 4 s (prel) och läggs ned: skalan står still', unika(bars.concat(ned)).length === 1 && unika(bars)[0] === S(0.075), 'skalor ' + unika(bars.concat(ned)).join(', '));
}
/* 5b. Två kort: det ena bärs (prel, fel låda) — det vilande bär skalan. */
{
  const { spela } = ny();
  spela(0, 3000, () => [0.075, 0.076]);
  const r = spela(3100, 9000, () => [0.075, { w: 0.15, h: 0.16, prel: 1 }]);
  ok('5b · ett kort bärs, ett vilar: det vilande bär skalan', unika(r).length === 1, 'skalor ' + unika(r).join(', '));
}
/* 5c. Sex kort, händerna bär tre (prel) i 4 s, de tre som vilar har en annan median: skalan står kvar. (passet 2026-09-22, 158,7–162 s) */
{
  const { spela } = ny();
  spela(0, 3000, () => [0.070, 0.072, 0.075, 0.075, 0.078, 0.080]);
  const r = spela(3100, 7100, () => [0.066, 0.067, 0.068, { w: 0.09, h: 0.2, prel: 1 }, { w: 0.09, h: 0.2, prel: 1 }, { w: 0.09, h: 0.2, prel: 1 }]);
  ok('5c · tre av sex kort bärs: skalan står kvar', unika(r).length === 1, 'skalor ' + unika(r).join(', '));
}
/* 6. Spärren nollställer väntan: en blink, 10 s med två av två kort i handen, en blink till — skalan står kvar.
      (kontrollgranskningen: förut byttes den direkt 2373 -> 1874) */
{
  const { spela } = ny();
  spela(0, 3000, () => [0.075, 0.075]);
  const r = spela(3100, 4000, () => [0.095, 0.095])
    .concat(spela(4100, 14000, () => [{ w: 0.075, h: 0.18, prel: 1 }, { w: 0.075, h: 0.18, prel: 1 }]))
    .concat(spela(14100, 15000, () => [0.095, 0.095]))
    .concat(spela(15100, 20000, () => [0.075, 0.075]));
  ok('6 · blink, spärren 10 s, blink: skalan står kvar', unika(r).length === 1, 'skalor ' + unika(r).join(', '));
}
/* 7. Ett kort i graveyard (behåller kam, prel) spärrar inte skalan för det enda kortet på mattan. */
{
  const { spela } = ny();
  spela(0, 3000, () => [0.075]);
  const r = spela(3100, 8000, () => [0.090, { w: 0.075, h: 0.18, prel: 1, zon: 'grav' }]);
  const byte = r.find(x => Math.round(x[1]) === S(0.090));
  ok('7 · kort i graveyard räknas inte: nytt värde byts efter 3 s', !!byte && byte[0] - 3100 >= 3000 && byte[0] - 3100 <= 3300, byte ? `efter ${((byte[0] - 3100) / 1000).toFixed(1)} s` : 'byttes aldrig: ' + unika(r).join(', '));
}
/* 8. Leken satte låset, första kortet vilar aldrig (prel): skalan står kvar på lekens värde. (förut: kortets burna låda, 1618, fast) */
{
  const { spela } = ny();
  spela(0, 2000, () => null, 0.075);
  const r = spela(2100, 9000, () => [{ w: 0.11, h: 0.25, prel: 1 }], 0.075);
  ok('8 · leken, sedan ett kort som aldrig vilar: lekens skala står kvar', unika(r).length === 1 && unika(r)[0] === S(0.075), 'skalor ' + unika(r).join(', '));
  const vilar = spela(9100, 9100, () => [0.077], 0.075);
  ok('8 · …och när kortet vilar (inom 8 %) står den kvar', Math.round(vilar[0][1]) === S(0.075), 'skala ' + Math.round(vilar[0][1]));
}
/* 4. Korten lämnar bordet (ingen lek): skalan står kvar. */
{
  const { spela } = ny();
  spela(0, 3000, () => [0.075]);
  const r = spela(3100, 10000, () => null);
  ok('4 · korten borta, ingen lek: skalan står kvar', unika(r).length === 1 && unika(r)[0] === S(0.075), 'skalor ' + unika(r).join(', '));
}
/* ── MES-345: bara kort som syns hela mäter ── */
/* Ett delvis täckt kort i en hög: lådan är den synliga delen, nästan kvadratisk (kortsidan ur lådan ~0,055 mot ett helt korts 0,075). */
const del = (extra) => Object.assign({ w: 0.075, h: 0.075 * 1.1 / ASP }, extra);
/* 9. Tre hela kort, sedan en landhög: två hela och tre delvis täckta med ett spår ovanpå (under). Medianen över alla fem
      vore högens (byte efter 3 s); bara de hela mäter, och skalan står kvar. (passet 2026-09-22, 237,75 s) */
{
  const { spela } = ny();
  spela(0, 3000, () => [0.075, 0.075, 0.075]);
  const r = spela(3100, 13000, () => [0.075, 0.076, del({ under: [1] }), del({ under: [4] }), del({ under: [5] })]);
  ok('9 · landhög med tre delvis täckta kort (under): skalan står kvar', unika(r).length === 1 && unika(r)[0] === S(0.075), 'skalor ' + unika(r).join(', '));
}
/* 9b. Samma hög, men korten ovanpå har inget eget spår (under = null): namnremsan (rl, 0,072 lång) ryms inte i lådans kortsida. */
{
  const { spela } = ny();
  spela(0, 3000, () => [0.075, 0.075, 0.075]);
  const rl = { x: 0.1, y: 0.1, w: 0.072, h: 0.012 };
  const r = spela(3100, 13000, () => [0.075, 0.076, del({ rl }), del({ rl }), del({ rl })]);
  ok('9b · delvis täckta kort utan spår ovanpå, remsan längre än lådan: skalan står kvar', unika(r).length === 1 && unika(r)[0] === S(0.075), 'skalor ' + unika(r).join(', '));
}
/* 9c. En remsa som är lådans kant (rsynt) är inget mått: tre hela kort med var sin sådan remsa och ett nytt avstånd byter skalan efter 3 s. */
{
  const { spela } = ny();
  spela(0, 3000, () => [0.075, 0.075, 0.075]);
  const rl = { x: 0.1, y: 0.1, w: 0.2, h: 0.012 };
  const r = spela(3100, 9000, () => [0.090, 0.090, 0.090].map(w => ({ w, h: w * R / ASP, rl, rsynt: true })));
  const byte = r.find(x => Math.round(x[1]) === S(0.090));
  ok('9c · remsan är lådans kant (rsynt): hela kort byter skalan efter 3 s', !!byte && byte[0] - 3100 >= 3000 && byte[0] - 3100 <= 3300, byte ? `efter ${((byte[0] - 3100) / 1000).toFixed(1)} s` : 'byttes aldrig: ' + unika(r).join(', '));
}
/* 9d. k.kam är från när kortet låg i högen (en kvadratisk låda), men spåret syns helt nu: k.kam är inte kortets låda och
      mäter inte. (passet 2026-09-22, 146 s: k.kam 0,122 × 0,256, lådan nu 0,161 × 0,379) */
{
  const { spela } = ny();
  spela(0, 3000, () => [0.075]);
  const r = spela(3100, 13000, () => [0.075, del({ nu: { w: 0.075, h: 0.075 * R / ASP } }), del({ nu: { w: 0.075, h: 0.075 * R / ASP } })]);
  ok('9d · två kort vars k.kam är från högen, lådan nu hel: skalan står kvar', unika(r).length === 1 && unika(r)[0] === S(0.075), 'skalor ' + unika(r).join(', '));
}
/* 9e. En hand över högen (skymd): lådorna mäter inte. */
{
  const { spela } = ny();
  spela(0, 3000, () => [0.075, 0.075]);
  const r = spela(3100, 13000, () => [0.075, del({ skymd: true }), del({ skymd: true })]);
  ok('9e · handen över två kort (skymd): skalan står kvar', unika(r).length === 1 && unika(r)[0] === S(0.075), 'skalor ' + unika(r).join(', '));
}
/* 9f. Telefonen flyttas medan en hög ligger kvar: de hela korten (0,090) byter skalan efter 3 s, högen (delvis täckt) drar inte. */
{
  const { spela } = ny();
  spela(0, 3000, () => [0.075, 0.075, del({ under: [1] }), del({ under: [2] })]);
  const r = spela(3100, 9000, () => [0.090, 0.090, del({ w: 0.09, h: 0.09 * 1.1 / ASP, under: [1] }), del({ w: 0.09, h: 0.09 * 1.1 / ASP, under: [2] }), del({ w: 0.09, h: 0.09 * 1.1 / ASP, under: [1] })]);
  const byte = r.find(x => Math.round(x[1]) !== S(0.075));
  ok('9f · telefonen flyttad, högen kvar: de hela korten byter skalan efter 3 s, till sitt värde', !!byte && byte[0] - 3100 >= 3000 && byte[0] - 3100 <= 3300 && Math.round(byte[1]) === S(0.090), byte ? `efter ${((byte[0] - 3100) / 1000).toFixed(1)} s till ${Math.round(byte[1])} (hela korten ${S(0.090)})` : 'byttes aldrig');
}
/* 9g. Bara en hög på bordet och inget mätt: högen ger en första skala (bättre än gissningen), och första hela kortet tar över efter 3 s. */
{
  const { spela } = ny();
  const forsta = spela(0, 2000, () => [del({ under: [2] }), del({ under: [1] })]);
  ok('9g · bara delvis täckta kort, inget mätt: de ger en första skala', unika(forsta).length === 1 && unika(forsta)[0] !== Math.round(178 / 0.12), 'skala ' + unika(forsta).join(', '));
  const r = spela(2100, 8000, () => [0.075, del({ under: [3] }), del({ under: [1] })]);
  const byte = r.find(x => Math.round(x[1]) === S(0.075));
  ok('9g · …och första hela kortet tar över efter 3 s', !!byte && byte[0] - 2100 >= 3000 && byte[0] - 2100 <= 3300, byte ? `efter ${((byte[0] - 2100) / 1000).toFixed(1)} s` : 'byttes aldrig: ' + unika(r).join(', '));
}
/* 9h. Två kort vars spår inte finns i bordet (nåd, eller ett spår som dött) är inte kända som hela: skalan står kvar.
      Med spåren i bordet (kontrollen) byter samma lådor skalan efter 3 s. */
{
  const { spela } = ny();
  spela(0, 3000, () => [0.075]);
  const r = spela(3100, 9000, () => [0.075, { w: 0.09, h: 0.09 * R / ASP, utanSpar: true }, { w: 0.09, h: 0.09 * R / ASP, utanSpar: true }]);
  ok('9h · två kort utan spår i bordet: skalan står kvar', unika(r).length === 1 && unika(r)[0] === S(0.075), 'skalor ' + unika(r).join(', '));
  const k = ny();
  k.spela(0, 3000, () => [0.075]);
  const r2 = k.spela(3100, 9000, () => [0.075, 0.09, 0.09]);
  ok('9h · …kontrollen: med spåren i bordet byts den efter 3 s', unika(r2).length === 2 && Math.round(r2[r2.length - 1][1]) === S(0.09), 'skalor ' + unika(r2).join(', '));
}
/* 9i. Kortens lås, leken i bild med ett annat värde, och alla tre korten skymda i 6 s: leken tar inte över låset (förut
      byttes skalan till lekens och tillbaka när korten syntes igen — två zoomsteg; granskningen av MES-345, G1). */
{
  const { spela } = ny();
  spela(0, 3000, () => [0.075, 0.075, 0.075], 0.090);
  const r = spela(3100, 9100, () => [del({ skymd: true }), del({ skymd: true }), del({ skymd: true })], 0.090)
    .concat(spela(9200, 12000, () => [0.075, 0.075, 0.075], 0.090));
  ok('9i · handen över alla kort, leken i bild med ett annat värde: kortens lås står kvar', unika(r).length === 1 && unika(r)[0] === S(0.075), 'skalor ' + unika(r).join(', '));
}
/* 9j. Samma, men kortens spår är borta ur bordet i 6 s (telefonen tappade bordet, eller spår-id:n började om): låset står kvar. (G2) */
{
  const { spela } = ny();
  spela(0, 3000, () => [0.075, 0.075, 0.075], 0.090);
  const r = spela(3100, 9100, () => [0.075, 0.075, 0.075].map(w => ({ w, h: w * R / ASP, utanSpar: true })), 0.090)
    .concat(spela(9200, 12000, () => [0.075, 0.075, 0.075], 0.090));
  ok('9j · kortens spår borta ur bordet, leken i bild: kortens lås står kvar', unika(r).length === 1 && unika(r)[0] === S(0.075), 'skalor ' + unika(r).join(', '));
}
console.log(fel ? `kamskala-las: ${fel} FEL` : 'kamskala-las: 0 FEL');
process.exit(fel ? 1 : 0);

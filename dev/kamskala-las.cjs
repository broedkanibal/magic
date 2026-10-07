/* Riktat prov för kamSkalas lås (MES-342, granskningens fynd 1 och 2): leken och första kortet inom 8 %,
   en blink på 1 s, två värden som fladdrar mot varandra, ett nytt värde som står sig, korten borta.
   Kör: node dev/kamskala-las.cjs [index.html]. Slutkod 1 vid FEL. .cjs eftersom package.json säger "type": "module". */
'use strict';
const fs = require('fs');
const HTML = process.argv[2] || require('path').join(__dirname, '..', 'index.html');
const src = fs.readFileSync(HTML, 'utf8');
const a = src.indexOf('function kamSkala(p)'), b = src.indexOf('function kamTillMatta', a);
const kod = src.slice(a, b);
let fel = 0;
const ok = (namn, villkor, info) => { console.log(`${villkor ? 'OK ' : 'FEL'}  ${namn}${info ? '  (' + info + ')' : ''}`); if (!villkor) fel++; };
function ny() {
  const klocka = { t: 0 };
  const kamSkala = new Function('Date', `const MATTA = { CW: 178 }; const kamUpplosning = { w: 1920, h: 1080 }; const kamSkalaFryst = () => null;\n${kod}\nreturn kamSkala;`)({ now: () => klocka.t });
  const p = { id: 'p1', cards: [], bibHog: null };
  /* Spela: varje 0,1 s ett anrop med kortens bredder enligt fn(t) (null = inga kort), lek = lekens bredd. */
  const spela = (t0, t1, fn, lek) => { const ut = []; for (let t = t0; t <= t1 + 1e-9; t += 100) { klocka.t = t; const w = fn(t); p.cards = w == null ? [] : [].concat(w).map(x => ({ kam: { w: x, h: x * 1.397 / (1080 / 1920) } })); p.bibHog = lek ? { kam: { w: lek, h: lek * 1.397 / (1080 / 1920) } } : null; ut.push([t, kamSkala(p)]); } return ut; };
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
/* 4. Korten lämnar bordet (ingen lek): skalan står kvar. */
{
  const { spela } = ny();
  spela(0, 3000, () => [0.075]);
  const r = spela(3100, 10000, () => null);
  ok('4 · korten borta, ingen lek: skalan står kvar', unika(r).length === 1 && unika(r)[0] === S(0.075), 'skalor ' + unika(r).join(', '));
}
console.log(fel ? `kamskala-las: ${fel} FEL` : 'kamskala-las: 0 FEL');
process.exit(fel ? 1 : 0);

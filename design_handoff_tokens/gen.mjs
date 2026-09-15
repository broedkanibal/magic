// Bygger designytan "Mesa Token Spawn" (MES-142): tre sätt att visa att tokens
// kommer ur kortet som spelades ut, plus nuläget. Mått och rörelser ur
// index.html: kort 178×248, radie 10, skuggan 0 4px 12px -3px #000c; tokenhögen
// 18 px till höger om kortet och korten i den 26 px isär (MATTA.HOG, MES-141);
// landningen cLand (.5 s), stöten cRing (.55 s), lyftet från .card.held,
// studsen cSettle och den gröna pulsen nypuls. Mattan är .matta. Allt går i en
// slinga på 4 s (tweaken "fart" sänker den). Kör: node gen.mjs
// Bilderna (Scryfall, 272×380) ligger i gitignorerade dev/bilder/tokens/.
import { writeFileSync } from 'node:fs';

const CW = 178, CH = 248, GAP = 18, HOG = 26, BAS = CW + GAP;
const SANS = '-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Helvetica,Arial,sans-serif';
const MONO = 'ui-monospace,SFMono-Regular,&quot;SF Mono&quot;,Menlo,monospace';
const UT = 'cubic-bezier(.2,.8,.3,1)';                 // appens landning och studs
const SKUGGA = '0 4px 12px -3px #000c', LYFT = '0 26px 40px -12px #000f';
const GLOD = '0 0 0 3px #f0a52a, 0 0 32px -2px #f0a52a99';

const SCENER = [
  { rubrik: 'Ancestral Blade → 1 Soldier', kalla: 'blade.jpg', token: 'soldier.jpg', n: 1 },
  { rubrik: 'Siege-Gang Commander → 3 Goblins', kalla: 'siege.jpg', token: 'goblin.jpg', n: 3 },
];

const pr = x => (Math.round(x * 100) / 100) + '%';
/* Tidpunkten (0–1) då en cubic-bezier når förloppet y — var vändningen står på kant. */
function bezierX(x1, y1, x2, y2, y) {
  const b = (t, a, c) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * c + t ** 3;
  let lo = 0, hi = 1;
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (b(m, y1, y2) < y) lo = m; else hi = m; }
  return b((lo + hi) / 2, x1, x2);
}
const kf = (namn, steg) => `@keyframes ${namn}{${steg.map(([t, css, e]) =>
  `${[].concat(t).map(pr).join(',')}{${css}${e ? `;animation-timing-function:${e}` : ''}}`).join('')}}`;
const LANDA = [
  [0, `opacity:0;transform:translateY(-40px) scale(1.14);box-shadow:${SKUGGA}`, UT],
  [7.5, `opacity:1;transform:translateY(4px) scale(.98);box-shadow:${SKUGGA}`, UT],
  [12.5, `opacity:1;transform:none;box-shadow:${SKUGGA}`],
];
const SLUT = [[92, 'opacity:1;transform:none'], [[97, 100], 'opacity:0;transform:none']];
// Tokens plats i scenen, och förskjutningen som lägger den på källkortet.
const plats = i => ({ x: BAS + HOG * i, y: HOG * i, dx: -(BAS + HOG * i), dy: -HOG * i });

/* Varje variant: namnet på källkortets animation, token i:s animation och z,
   och keyframes för en scen med n tokens. */
const VAR = {
  nu: {
    tokZ: i => 20 + i,
    css: n => [
      kf(`nuK${n}`, [...LANDA, ...SLUT]),
      ...Array.from({ length: n }, (_, i) => kf(`nuT${n}_${i}`, [
        [[0, 14.9], `opacity:0;box-shadow:${SKUGGA}, 0 0 0 0 #5fbf7f00`],
        [15, `opacity:1;box-shadow:${SKUGGA}, 0 0 0 0 #5fbf7f88`, 'ease-out'],
        [39.5, `opacity:1;box-shadow:${SKUGGA}, 0 0 0 12px #5fbf7f00`],
        ...SLUT,
      ])),
    ],
  },
  a: {
    tokZ: i => 1 + i,                    // under kortet medan den glider ut
    css: n => [
      kf(`aK${n}`, [...LANDA, [15, 'transform:none', UT], [17.5, 'transform:translateX(-5px) rotate(-.8deg)', UT], [23, 'transform:none'], ...SLUT]),
      ...Array.from({ length: n }, (_, i) => {
        const { dx, dy } = plats(i), s = 15 + 3 * i;
        return kf(`aT${n}_${i}`, [
          [[0, s], `opacity:0;transform:translate(${dx}px,${dy}px) scale(.97);box-shadow:${SKUGGA}`],
          [s + 0.2, `opacity:1;transform:translate(${dx}px,${dy}px) scale(.97);box-shadow:${SKUGGA}`, 'cubic-bezier(.4,0,.6,1)'],
          [s + 5, `opacity:1;transform:translate(${Math.round(dx * 0.4)}px,${Math.round(dy * 0.4) - 12}px) scale(1.05);box-shadow:${LYFT}`, 'cubic-bezier(.3,.7,.2,1)'],
          [s + 10, `opacity:1;transform:translate(0px,0px) scale(1.03);box-shadow:${LYFT}`, UT],
          [s + 12, `transform:scale(.985);box-shadow:${SKUGGA}`, UT],
          [s + 14, `transform:none;box-shadow:${SKUGGA}`],
          ...SLUT,
        ]);
      }),
    ],
  },
  b: {
    tokZ: i => 20 + i,                   // ovanpå kortet: de kommer ut ur det
    ringar: true,
    css: n => {
      const land = i => 16 + 3.5 * i + 6.5, g1 = land(n - 1);
      return [
        kf(`bK${n}`, [...LANDA, [14, `box-shadow:${SKUGGA}`], [16, `box-shadow:${GLOD}`], [g1, `box-shadow:${GLOD}`], [g1 + 4, `box-shadow:${SKUGGA}`], ...SLUT]),
        kf(`bR${n}`, [[[0, 14], 'opacity:0;transform:scale(.5)'], [14.2, 'opacity:.7;transform:scale(.5)', 'ease-out'], [28, 'opacity:0;transform:scale(1.5)'], [[28.1, 100], 'opacity:0;transform:scale(.5)']]),
        ...Array.from({ length: n }, (_, i) => {
          const { dx, dy } = plats(i), s = 16 + 3.5 * i, t = land(i);
          return kf(`bT${n}_${i}`, [
            [[0, s], `opacity:0;transform:translate(${dx}px,${dy}px) scale(.3) rotate(0deg)`],
            [s + 0.2, `opacity:1;transform:translate(${dx}px,${dy}px) scale(.3) rotate(0deg)`, 'cubic-bezier(.2,.6,.4,1)'],
            [s + 3, `opacity:1;transform:translate(${Math.round(dx * 0.45)}px,${Math.round(dy * 0.45) - 84}px) scale(.8) rotate(-4deg)`, 'cubic-bezier(.5,0,.8,.6)'],
            [t, 'opacity:1;transform:translate(0px,4px) scale(1.04) rotate(0deg)', UT],
            [t + 2.5, 'transform:none'],
            ...SLUT,
          ]) + kf(`bL${n}_${i}`, [[[0, t], 'opacity:0;transform:scale(.5)'], [t + 0.1, 'opacity:.55;transform:scale(.5)', 'ease-out'], [t + 13, 'opacity:0;transform:scale(1.4)'], [[t + 13.1, 100], 'opacity:0;transform:scale(.5)']]);
        }),
      ];
    },
  },
  c: {
    tokZ: i => 20 + i,                   // kopian ligger först exakt ovanpå kortet
    tvaSidor: true,
    css: n => [
      kf(`cK${n}`, [...LANDA, ...SLUT]),
      ...Array.from({ length: n }, (_, i) => {
        const { dx, dy } = plats(i), s = 15 + 4 * i;
        /* Sidorna byts när kortet står på kant (90°) i stället för med
           backface-visibility, som webbläsaren inte höll i kanvasens ram. */
        const kant = s + 3 + 8 * bezierX(0.2, 0.8, 0.3, 1, 0.5);
        return kf(`cF${n}_${i}`, [[[0, kant], 'opacity:0'], [[kant + 0.01, 100], 'opacity:1']])
          + kf(`cB${n}_${i}`, [[[0, kant], 'opacity:1'], [[kant + 0.01, 100], 'opacity:0']])
          + kf(`cT${n}_${i}`, [
          [[0, s], `opacity:0;transform:translate(${dx}px,${dy}px) rotateY(180deg) scale(1)`],
          [s + 0.2, `opacity:1;transform:translate(${dx}px,${dy}px) rotateY(180deg) scale(1)`, 'cubic-bezier(.3,.7,.2,1)'],
          [s + 3, `opacity:1;transform:translate(${dx}px,${dy - 14}px) rotateY(180deg) scale(1.05)`, 'cubic-bezier(.4,0,.2,1)'],
          [s + 11, 'opacity:1;transform:translate(0px,-6px) rotateY(0deg) scale(1.03)', UT],
          [s + 13, 'transform:translate(0px,0px) rotateY(0deg) scale(.985)', UT],
          [s + 15, 'transform:none'],
          ...SLUT,
        ]);
      }),
    ],
  },
};

const anim = namn => `animation-name: ${namn}; animation-duration: {{cyk}}`;
function scen(v, sc) {
  const V = VAR[v], n = sc.n;
  const W = BAS + CW + HOG * (n - 1), H = CH + HOG * (n - 1);
  const bitar = [`<div class="k" style="left: 0px; top: 0px; z-index: 10; ${anim(`${v}K${n}`)}"><img src="${sc.kalla}" alt=""></div>`];
  if (V.ringar) bitar.push(`<i class="ring" style="left: ${CW / 2 - 150}px; top: ${CH / 2 - 150}px; width: 300px; height: 300px; z-index: 15; ${anim(`bR${n}`)}"></i>`);
  for (let i = 0; i < n; i++) {
    const { x, y } = plats(i);
    const yta = V.tvaSidor
      ? `<img class="bak" src="${sc.kalla}" alt="" style="${anim(`cB${n}_${i}`)}"><img src="${sc.token}" alt="" style="${anim(`cF${n}_${i}`)}">`
      : `<img src="${sc.token}" alt="">`;
    bitar.push(`<div class="k${V.tvaSidor ? ' k3d' : ''}" style="left: ${x}px; top: ${y}px; z-index: ${V.tokZ(i)}; ${anim(`${v}T${n}_${i}`)}">${yta}</div>`);
    if (V.ringar) bitar.push(`<i class="ring" style="left: ${x + CW / 2 - 110}px; top: ${y + CH / 2 - 110}px; width: 220px; height: 220px; z-index: ${30 + i}; ${anim(`bL${n}_${i}`)}"></i>`);
  }
  return `<div style="display: flex; flex-direction: column; gap: 18px">
      <span style="font: 600 9.5px/1 ${SANS}; letter-spacing: .9px; text-transform: uppercase; color: #5c6b82">${sc.rubrik}</span>
      <div style="position: relative; flex: none; width: ${W}px; height: ${H}px; perspective: 1400px">
        ${bitar.join('\n        ')}
      </div>
    </div>`;
}

function artboard(v, { etikett, titel, varfor, plus, minus, notis }) {
  const css = SCENER.flatMap(sc => VAR[v].css(sc.n)).join('\n    ');
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
    body { margin: 0; background: #0d1015; }
    a { color: #6b8cff; } a:hover { color: #9db0ff; }
    .k { position: absolute; width: ${CW}px; height: ${CH}px; border-radius: 10px; box-shadow: ${SKUGGA}; animation-iteration-count: infinite; animation-fill-mode: both; animation-timing-function: linear; }
    .k img { width: 100%; height: 100%; display: block; object-fit: cover; border-radius: 10px; background: #11161e; }
    .k3d { transform-style: preserve-3d; box-shadow: none; }
    .k3d img { position: absolute; inset: 0; box-shadow: ${SKUGGA}; animation-iteration-count: infinite; animation-fill-mode: both; animation-timing-function: linear; }
    .k3d img.bak { transform: rotateY(180deg); }
    .ring { position: absolute; display: block; border-radius: 50%; border: 2px solid #e8c98a; pointer-events: none; animation-iteration-count: infinite; animation-fill-mode: both; animation-timing-function: linear; }
    ${css}
  </style>
</helmet>
<div style="box-sizing: border-box; min-height: 100vh; padding: 36px 40px 44px; background: #0d1015; color: #e7ecf4; font: 14px/1.45 ${SANS}; display: flex; flex-direction: column; gap: 28px">
  <div style="display: flex; flex-direction: column; gap: 8px; max-width: 760px">
    <span style="font: 700 11px/1 ${MONO}; letter-spacing: 1.2px; text-transform: uppercase; color: #f0a52a">${etikett}</span>
    <h1 style="margin: 0; font: 650 24px/1.2 ${SANS}; color: #e7ecf4; text-wrap: pretty">${titel}</h1>
    <p style="margin: 0; font: 14.5px/1.5 ${SANS}; color: #93a1b6; text-wrap: pretty">${varfor}</p>
    ${plus ? `<div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px; font: 13.5px/1.45 ${SANS}">
      <span style="color: #7fd6a2">+ ${plus}</span>
      <span style="color: #ff9099">− ${minus}</span>
    </div>` : ''}
  </div>
  <div style="display: flex; flex-wrap: wrap; gap: 72px; align-items: flex-start; padding: 104px 56px 56px; border-radius: 12px; background: radial-gradient(1250px 620px at 46% 26%, #18232f, #0a0f14 72%); box-shadow: inset 0 0 90px 20px #00000066, 0 0 0 1px #28313f; overflow: hidden">
    ${SCENER.map(sc => scen(v, sc)).join('\n    ')}
  </div>
  <p style="margin: 0; max-width: 820px; font: 13px/1.5 ${SANS}; color: #93a1b6; text-wrap: pretty">${notis}</p>
</div>
</x-dc>
<script data-dc-script data-props='{"fart":{"editor":"enum","options":["1×","½×","¼×"],"default":"1×","section":"Animation"}}'>
class Component extends DCLogic {
  renderVals() {
    const f = this.props.fart ?? '1×';
    return { cyk: f === '¼×' ? '16s' : f === '½×' ? '8s' : '4s' };
  }
}
</script>
</body>
</html>
`;
}

const B = t => `<b style="color: #e7ecf4">${t}</b>`;
const filer = {
  'Nulage.dc.html': artboard('nu', {
    etikett: 'Nuläge',
    titel: 'Tokens dyker upp — men inte ur något',
    varfor: 'När Ancestral Blade eller Siege-Gang Commander läggs ut står tokens bara där bredvid, med samma gröna puls som varje nytt kort. Ingenting säger att det var kortet som skapade dem.',
    notis: `${B('Idag:')} token läggs ut när kortets data hämtats och ritas med <span style="font-family: ${MONO}; color: #e7ecf4">.nykort</span> (nypuls, 1,4 s). Alla tokens kommer samtidigt.`,
  }),
  'Main.dc.html': artboard('a', {
    etikett: 'Variant A · förslaget',
    titel: 'Token dras fram under kortet',
    varfor: 'Token ligger först gömd under kortet som spelades och glider ut åt höger till sin plats, som när man drar fram ett kort under ett annat. Kortet ger ifrån sig en liten knuff när token lossnar. Flera tokens glider ut en i taget och bygger upp högen.',
    plus: 'Samma material som resten av mattan: lyftet från ett drag och studsen när ett kort sätter sig. Lugnt nog för tio tokens, och varje tur.',
    minus: 'Tyst — tittar man på den fysiska duken kan man missa den. Knuffen är det enda som säger att kortet gjorde något.',
    notis: `${B('Tider (1×):')} kortet landar på 0,5 s. 0,1 s senare glider token ut på 0,4 s, med dragets skugga mitt i, och sätter sig på 0,16 s. Goblins 120 ms isär. ${B('I appen:')} token ritas på sin plats och animeras från kortets rect, som flygTillGrav fast åt andra hållet, med z under kortet medan den glider. Utan rörelse (prefers-reduced-motion) tonas token in på sin plats.`,
  }),
  'VariantB.dc.html': artboard('b', {
    etikett: 'Variant B',
    titel: 'Tokens slås ut ur kortet',
    varfor: 'Kortet lyser upp i bärnsten och en ring slår ut från det. Tokens växer fram ur kortets mitt och kastas i en båge till sin plats, där var och en landar med en egen liten stöt.',
    plus: 'Omisskännligt — det ser ut som en effekt, och det är det. Ringen är samma stöt som när ett kort landar i graveyarden.',
    minus: 'Mest rörelse: med tre tokens händer mycket på en gång och blicken dras från bordet. Blir tjatigt för det som händer varje tur (en Treasure i taget).',
    notis: `${B('Tider (1×):')} ringen slår ut från kortet efter 0,56 s (cRing, 0,55 s). Varje token flyger 0,26 s och landar på 0,1 s, 140 ms isär; glöden runt kortet släcks när sista token landat. ${B('I appen:')} ringarna är egna element över mattan som tas bort efteråt; bågen är två steg (upp ur kortet, ned på platsen). Utan rörelse: bara tokens som tonas in.`,
  }),
  'VariantC.dc.html': artboard('c', {
    etikett: 'Variant C',
    titel: 'En kopia lyfts av kortet och vänds till token',
    varfor: 'En kopia av kortet lossnar från ovansidan, lyfts som när man tar upp ett kort och vänds i luften på väg till sin plats. När den landar är den token. Att kortet gör token syns i själva rörelsen.',
    plus: 'Säger mest med minst: sambandet mellan kortet och token är hela animationen. Vändningen känns som att lägga ett kort med framsidan upp.',
    minus: 'Ett ögonblick ser det ut som att kortet självt flyttar sig eller dupliceras. Ett tappat kort måste vändas kring rätt axel.',
    notis: `${B('Tider (1×):')} kopian lyfts på 0,12 s, flyger och vänds på 0,32 s och sätter sig på 0,16 s; goblins 160 ms isär. ${B('I appen:')} token får två sidor under animationen — kortets bild på baksidan, sin egen på framsidan — och vänds rotateY 180° → 0. Utan rörelse: tonas in.`,
  }),
};
for (const [namn, html] of Object.entries(filer)) writeFileSync(new URL(namn, import.meta.url), html);

const canvas = {
  artboards: [
    { file: 'Nulage.dc.html', title: 'Nuläge', x: 0, y: 0, w: 1110, h: 800 },
    { file: 'Main.dc.html', title: 'A · Dras fram under kortet', x: 1190, y: 0, w: 1110, h: 900 },
    { file: 'VariantB.dc.html', title: 'B · Slås ut ur kortet', x: 0, y: 1040, w: 1110, h: 900 },
    { file: 'VariantC.dc.html', title: 'C · Kopian vänds till token', x: 1190, y: 1040, w: 1110, h: 900 },
  ],
  annotations: [
    { id: 'fragan', x: 0, y: -190, w: 640, text: 'MES-142 — tokens som skapas när ett kort spelas ut ska synas komma ur kortet.\nVarje artboard går i en slinga: kortet landar, tokens kommer, allt tonas ut och börjar om. Chippet ”fart” ovanför en artboard saktar ner den (½×, ¼×).\nPlatserna är appens: högen 18 px till höger om kortet, 26 px mellan korten i den (MES-141).' },
  ],
  launch: { view: 'canvas' },
};
writeFileSync(new URL('canvas.json', import.meta.url), JSON.stringify(canvas, null, 2));
console.log('skrev', Object.keys(filer).length, 'artboards');

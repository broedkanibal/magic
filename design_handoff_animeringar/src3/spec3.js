/* ── E · Lugn matta — tidslinjerna som data ───────────────────────────
   Jesper 2026-10-02 (dev/plan/spegelmattan-principer.md). Bygger på D:
   bordet visar bara det kameran vet, och varje ändring är en enda rörelse.
   Nytt i E:
     - framkallningen: dröjer namnet mer än tröskeln (~0,5 s) läggs ett
       oframkallat kort ned — Magic-ramen skarp, de unika ytorna kamerans
       foto, suddigt — och skärps när namnet kommer
     - till handen: en tom plats efter att händerna nära den gått betyder
       att kortet lämnat bordet; det glider ut genom nederkanten
     - handen fryser lokalt; en flytt binds av spårningen när kortet vilar
     - tap i spelarens ordning och tempo
     - mattan zoomar i fasta steg, i samma rörelse som kortet läggs ned
     - ingen nedtoning: osäkert = orört

   Ett spår: [mål, egenskap, nycklar, flagga?]  — som i D.
     värde  'cur' = där egenskapen står, 'mal' = nya platsen, 'in' = nya
            platsen 90 px närmare spelaren, 'hem' = kortets plats på bordet,
            'ut' = under mattans nederkant (handen), 'hog' = graveyard-högen,
            'hogS' = högens storlek, 'bib' = library-högen, 'bibS',
            'zf'/'vx'/'vy' = mattans nya zoomsteg och utsnitt.
     flagga 'svag' = hoppas över om egenskapen redan rör sig; 'ring' =
            bara när den gröna ringen är på. */

const EASE = {
  UT:    { b: [.2, .8, .3, 1],   css: 'cubic-bezier(.2,.8,.3,1)',   om: 'appens landning och settle (cLand, cSettle)' },
  FLY:   { b: [.4, 0, .2, 1],    css: 'cubic-bezier(.4,0,.2,1)',    om: 'flygturen till graveyard (flygTillGrav)' },
  SOFT:  { b: [.3, .7, .3, 1],   css: 'cubic-bezier(.3,.7,.3,1)',   om: 'mjuk vridning utan överslag' },
  OUT:   { b: [0, 0, .58, 1],    css: 'ease-out' },
  IN:    { b: [.42, 0, 1, 1],    css: 'ease-in' },
  INOUT: { b: [.42, 0, .58, 1],  css: 'ease-in-out' },
  LIN:   { b: null,              css: 'linear' },
  STEP:  { b: 'step',            css: 'hopp' },
};
const EGENSKAP = {
  pos: 'position', s: 'skala', r: 'vridning', o: 'opacitet', lift: 'skugga',
  blur: 'framkallning', ring: 'grön ring', glow: 'grön kant', grav: 'graveyard-ton',
  zf: 'zoom', vx: 'utsnitt x', vy: 'utsnitt y',
};
const MAL = { kort: 'kortet', hog: 'högens toppkort', hogring: 'högens ring', hogtal: 'högens tal', bib: 'library-högen', yta: 'mattan' };

/* Lägg ned (D:s utspel). Samma för ett kort med namn och ett oframkallat. */
const LAGG = [
  ['kort', 'o', [[0, 0, 'LIN'], [90, 1]]],
  ['kort', 'pos', [[0, 'in', 'UT'], [330, 'mal']]],
  ['kort', 's', [[0, 1.08, 'OUT'], [260, 1.02, 'UT'], [330, .985, 'UT'], [400, 1]]],
  ['kort', 'lift', [[0, 1, 'LIN'], [200, 1, 'IN'], [330, 0]]],
];
/* Lyft, bär, sätt ned (D:s flytt). */
const BARA = [
  ['kort', 'lift', [[0, 'cur', 'OUT'], [90, 1, 'LIN'], [320, 1, 'IN'], [450, 0]]],
  ['kort', 's', [[0, 'cur', 'OUT'], [90, 1.05, 'LIN'], [320, 1.05, 'UT'], [390, .985, 'UT'], [450, 1]]],
  ['kort', 'pos', [[0, 'cur', 'FLY'], [420, 'mal']]],
];
const VRID = mal => [
  ['kort', 'r', [[0, 'cur', 'SOFT'], [240, mal]]],
  ['kort', 's', [[0, 'cur', 'INOUT'], [120, 1.03, 'INOUT'], [240, 1]], 'svag'],
  ['kort', 'lift', [[0, 'cur', 'INOUT'], [120, .5, 'INOUT'], [240, 0]], 'svag'],
];

const SPEC = {
  E: {
    namn: [...LAGG, ['kort', 'ring', [[330, 0, 'OUT'], [1030, 1]], 'ring']],
    oframkallad: LAGG,
    framkalla: [
      ['kort', 'blur', [[0, 'cur', 'OUT'], [300, 0]]],
      ['kort', 's', [[0, 'cur', 'INOUT'], [150, 1.015, 'INOUT'], [300, 1]], 'svag'],
      ['kort', 'ring', [[300, 0, 'OUT'], [1000, 1]], 'ring'],
    ],
    knuff: [['kort', 'pos', [[0, 'cur', 'UT'], [220, 'mal']]]],
    flytt: BARA,
    tillHanden: [
      ['kort', 'lift', [[0, 'cur', 'OUT'], [90, 1, 'LIN'], [450, 1]]],
      ['kort', 's', [[0, 'cur', 'OUT'], [90, 1.05, 'FLY'], [450, .96]]],
      ['kort', 'pos', [[0, 'cur', 'FLY'], [450, 'ut']]],
      ['kort', 'o', [[0, 1, 'LIN'], [280, 1, 'LIN'], [450, 0]]],
    ],
    tillbaka: [
      ['kort', 'o', [[0, 0, 'LIN'], [120, 1]]],
      ['kort', 'lift', [[0, 1, 'LIN'], [320, 1, 'IN'], [450, 0]]],
      ['kort', 's', [[0, 1.05, 'LIN'], [320, 1.05, 'UT'], [390, .985, 'UT'], [450, 1]]],
      ['kort', 'pos', [[0, 'ut', 'FLY'], [420, 'hem']]],
    ],
    tillBib: [
      ['kort', 'o', [[0, 0, 'LIN'], [100, 1, 'LIN'], [380, 1, 'LIN'], [450, 0]]],
      ['kort', 'pos', [[0, 'ut', 'FLY'], [450, 'bib']]],
      ['kort', 's', [[0, 1, 'FLY'], [450, 'bibS']]],
      ['bib', 's', [[450, 1.04, 'UT'], [570, .99, 'UT'], [670, 1]]],
    ],
    grav: [
      ['kort', 'lift', [[0, 'cur', 'OUT'], [90, 1, 'LIN'], [300, 1, 'IN'], [400, 0]]],
      ['kort', 's', [[0, 'cur', 'OUT'], [90, 1.05, 'FLY'], [400, 'hogS']]],
      ['kort', 'pos', [[0, 'cur', 'FLY'], [400, 'hog']]],
      ['kort', 'r', [[0, 'cur', 'FLY'], [200, -4, 'UT'], [400, 0]]],
      ['kort', 'grav', [[240, 0, 'LIN'], [400, 1]]],
      ['kort', 'o', [[400, 0]]],
      ['hog', 'o', [[400, 1]]],
      ['hog', 's', [[400, 1.04, 'UT'], [520, .99, 'UT'], [620, 1]]],
      ['hogring', 's', [[400, .5, 'OUT'], [950, 1.5]]],
      ['hogring', 'o', [[400, .7, 'OUT'], [950, 0]]],
      ['hogtal', 's', [[400, 1, 'UT'], [568, 1.18, 'UT'], [820, 1]]],
    ],
    tap: VRID(90),
    untap: VRID(0),
    zoom: [
      ['yta', 'zf', [[0, 'cur', 'UT'], [500, 'zf']]],
      ['yta', 'vx', [[0, 'cur', 'UT'], [500, 'vx']]],
      ['yta', 'vy', [[0, 'cur', 'UT'], [500, 'vy']]],
    ],
  },

  /* Minskad rörelse (prefers-reduced-motion): bara toning. Platsen,
     vridningen och zoomen byts medan kortet eller mattan är nästan osynlig. */
  R: {
    namn: [['kort', 'pos', [[0, 'mal']]], ['kort', 'o', [[0, 0, 'LIN'], [200, 1]]], ['kort', 'glow', [[200, .8, 'LIN'], [900, 0]], 'ring']],
    oframkallad: [['kort', 'pos', [[0, 'mal']]], ['kort', 'o', [[0, 0, 'LIN'], [200, 1]]]],
    framkalla: [['kort', 'blur', [[0, 'cur', 'LIN'], [300, 0]]], ['kort', 'glow', [[300, .8, 'LIN'], [1000, 0]], 'ring']],
    knuff: [['kort', 'o', [[0, 1, 'LIN'], [80, .4, 'LIN'], [200, 1]]], ['kort', 'pos', [[80, 'mal']]]],
    flytt: [['kort', 'o', [[0, 1, 'LIN'], [150, 0, 'LIN'], [350, 1]]], ['kort', 'pos', [[150, 'mal']]]],
    tillHanden: [['kort', 'o', [[0, 1, 'LIN'], [200, 0]]], ['kort', 'pos', [[200, 'ut']]]],
    tillbaka: [['kort', 'pos', [[0, 'hem']]], ['kort', 'o', [[0, 0, 'LIN'], [200, 1]]]],
    tillBib: [['bib', 's', [[0, 1]]]],
    grav: [['kort', 'o', [[0, 1, 'LIN'], [200, 0]]], ['hog', 'o', [[0, 0, 'LIN'], [200, 1]]]],
    tap: [['kort', 'o', [[0, 1, 'LIN'], [100, .3, 'LIN'], [240, 1]]], ['kort', 'r', [[100, 90]]]],
    untap: [['kort', 'o', [[0, 1, 'LIN'], [100, .3, 'LIN'], [240, 1]]], ['kort', 'r', [[100, 0]]]],
    zoom: [
      ['yta', 'o', [[0, 1, 'LIN'], [150, .35, 'LIN'], [400, 1]]],
      ['yta', 'zf', [[150, 'zf']]], ['yta', 'vx', [[150, 'vx']]], ['yta', 'vy', [[150, 'vy']]],
    ],
  },
};

const FAS = {
  namn: 'Namnet kommer i tid → kortet läggs ned',
  oframkallad: 'Namnet dröjer → det oframkallade kortet läggs ned',
  framkalla: 'Namnet kommer → kortet framkallas',
  knuff: 'Kortet knuffas förbi dödzonen',
  flytt: 'Kortet vilar på en ny plats → bärs dit',
  tillHanden: 'Platsen är tom och händerna borta → till handen',
  tillbaka: '"Still on the table" → tillbaka',
  tillBib: '"Library" → till library-högen',
  grav: 'Graveyard-högen växer',
  tap: 'Kameran är säker: tappat',
  untap: 'Kameran är säker: otappat',
  zoom: 'Kortet får inte plats → ett zoomsteg ut',
};

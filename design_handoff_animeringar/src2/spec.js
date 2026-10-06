/* ── D · När kameran vet — tidslinjerna som data ──────────────────────
   Jesper 2026-09-25, efter sida 1: inga laddlägen, och varje ändring är en
   enda rörelse från det gamla läget till det nya. Bordet visar bara det
   kameran vet:
     - ett nytt kort syns först när namnet finns, och läggs då ned
     - ett kort kameran tappat står kvar orört tills den vet var det hamnade,
       och bärs sedan dit i en rörelse — ingen platshållare på nya platsen
     - till graveyard flyger kortet direkt och landar som högens toppkort,
       utan att tonas först
   Rörelsen lyfts och sätts ned (Jespers val): skugga och lite skala.

   Ett spår: [mål, egenskap, nycklar, flagga?]  — som på sida 1.
     värde  'cur' = där egenskapen står, 'mal' = nya platsen, 'in' = nya
            platsen 90 px närmare spelaren (där kortet kommer ifrån när det
            spelas ut), 'mal2' = rättade platsen, 'hog' = graveyard-högen,
            'hogS' = kortet i högens storlek.
     flagga 'svag' = hoppas över om egenskapen redan rör sig; 'intern' =
            visas inte i tidslinjen. */

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
  dim: 'nedtoning', grav: 'graveyard-ton', ring: 'grön ring', glow: 'grön kant',
};
const MAL = { kort: 'kortet', hog: 'högens toppkort', hogring: 'högens ring', hogtal: 'högens tal' };

/* Lyft, bär, sätt ned — flytten, och tillbaka till en ny plats. */
const BARA = [
  ['kort', 'lift', [[0, 'cur', 'OUT'], [90, 1, 'LIN'], [320, 1, 'IN'], [450, 0]]],
  ['kort', 's', [[0, 'cur', 'OUT'], [90, 1.05, 'LIN'], [320, 1.05, 'UT'], [390, .985, 'UT'], [450, 1]]],
  ['kort', 'pos', [[0, 'cur', 'FLY'], [420, 'mal']]],
];

const SPEC = {
  D: {
    vanta: 5000,
    syns: [],                  // kameran ser något men vet inte vad: ingenting visas
    tappad: [],                // kameran ser inte kortet: det står kvar som det står
    namn: [                    // utspel: kortet läggs ned, från spelarens håll
      ['kort', 'o', [[0, 0, 'LIN'], [90, 1]]],
      ['kort', 'pos', [[0, 'in', 'UT'], [330, 'mal']]],
      ['kort', 's', [[0, 1.08, 'OUT'], [260, 1.02, 'UT'], [330, .985, 'UT'], [400, 1]]],
      ['kort', 'lift', [[0, 1, 'LIN'], [200, 1, 'IN'], [330, 0]]],
      ['kort', 'ring', [[330, 0, 'OUT'], [1030, 1]]],
    ],
    knuff: [['kort', 'pos', [[0, 'cur', 'UT'], [220, 'mal']]]],
    flytt: BARA,
    avbrott: [
      ['kort', 'pos', [[0, 'cur', 'FLY'], [320, 'mal2']]],
      ['kort', 's', [[0, 'cur', 'LIN'], [180, 1.05, 'UT'], [260, .985, 'UT'], [320, 1]]],
      ['kort', 'lift', [[0, 'cur', 'LIN'], [180, 1, 'IN'], [300, 0]]],
      ['kort', 'r', [[0, 'cur', 'SOFT'], [240, 90]]],
    ],
    nedtonad: [['kort', 'dim', [[0, 0, 'INOUT'], [480, 1]]]],
    tillbaka: [
      ['kort', 'dim', [[0, 1, 'OUT'], [240, 0]]],
      ['kort', 's', [[0, 'cur', 'OUT'], [90, 1.03, 'UT'], [300, 1]]],
      ['kort', 'lift', [[0, 0, 'OUT'], [90, .6, 'IN'], [300, 0]]],
    ],
    tillbakaNy: [['kort', 'dim', [[0, 1, 'OUT'], [200, 0]]], ...BARA],
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
    tap: [['kort', 'r', [[0, 'cur', 'SOFT'], [240, 90]]], ['kort', 's', [[0, 'cur', 'INOUT'], [120, 1.03, 'INOUT'], [240, 1]], 'svag'], ['kort', 'lift', [[0, 'cur', 'INOUT'], [120, .5, 'INOUT'], [240, 0]], 'svag']],
    untap: [['kort', 'r', [[0, 'cur', 'SOFT'], [240, 0]]], ['kort', 's', [[0, 'cur', 'INOUT'], [120, 1.03, 'INOUT'], [240, 1]], 'svag'], ['kort', 'lift', [[0, 'cur', 'INOUT'], [120, .5, 'INOUT'], [240, 0]], 'svag']],
  },

  /* Minskad rörelse (prefers-reduced-motion): bara toning. Platsen och
     vridningen byts medan kortet är osynligt eller nästan osynligt. */
  R: {
    vanta: 5000,
    syns: [], tappad: [],
    namn: [['kort', 'pos', [[0, 'mal']]], ['kort', 'o', [[0, 0, 'LIN'], [200, 1]]], ['kort', 'glow', [[200, .8, 'LIN'], [900, 0]]]],
    knuff: [['kort', 'o', [[0, 1, 'LIN'], [80, .4, 'LIN'], [200, 1]]], ['kort', 'pos', [[80, 'mal']]]],
    flytt: [['kort', 'o', [[0, 1, 'LIN'], [150, 0, 'LIN'], [350, 1]]], ['kort', 'pos', [[150, 'mal']]]],
    avbrott: [['kort', 'o', [[0, 'cur', 'LIN'], [100, 0, 'LIN'], [250, 1]]], ['kort', 'pos', [[100, 'mal2']]], ['kort', 'r', [[100, 90]]]],
    nedtonad: [['kort', 'dim', [[0, 0, 'LIN'], [480, 1]]]],
    tillbaka: [['kort', 'dim', [[0, 1, 'LIN'], [240, 0]]]],
    tillbakaNy: [['kort', 'o', [[0, 1, 'LIN'], [150, 0, 'LIN'], [350, 1]]], ['kort', 'pos', [[150, 'mal']]], ['kort', 'dim', [[150, 0]]]],
    grav: [['kort', 'o', [[0, 1, 'LIN'], [200, 0]]], ['hog', 'o', [[0, 0, 'LIN'], [200, 1]]]],
    tap: [['kort', 'o', [[0, 1, 'LIN'], [100, .3, 'LIN'], [240, 1]]], ['kort', 'r', [[100, 90]]]],
    untap: [['kort', 'o', [[0, 1, 'LIN'], [100, .3, 'LIN'], [240, 1]]], ['kort', 'r', [[100, 0]]]],
  },
};

const FAS = {
  syns: 'Kameran ser något',
  claude: 'Kameran frågar Claude',
  tappad: 'Kameran tappar kortet',
  namn: 'Namnet kommer',
  knuff: 'Kortet knuffas',
  flytt: 'Kameran vet nya platsen',
  avbrott: 'Ny rapport mitt i flytten',
  nedtonad: 'Väntan slut',
  tillbaka: 'Kameran känner igen kortet',
  tillbakaNy: 'Kameran känner igen kortet, på ny plats',
  grav: 'Graveyard-högen växer',
  tap: 'Kameran är säker: tappat',
  untap: 'Kameran är säker: otappat',
};
/* Vad som händer i en fas där ingenting rör sig — designbeslutet, i klartext. */
const TOM = {
  claude: 'Ingenting visas än. Namnet kan dröja upp till 5 s.',
  syns: 'Ingenting visas. Kameran vet inte vad det är än — kortet dyker upp när namnet finns.',
  tappad: 'Ingenting ändras. Kortet står kvar där det låg tills kameran vet var det hamnade.',
};

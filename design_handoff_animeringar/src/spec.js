/* ── Tidslinjerna, som data ─────────────────────────────────────────────
   Samma data driver animeringen i artboarden och ritar tidslinjen under
   den, så att det som syns och det som står aldrig kan skilja sig åt.

   Ett spår: [mål, egenskap, nycklar, flagga?]
     mål        kort · plats · spok · hog · hogring · hogtal
     egenskap   se EGENSKAP nedan
     nycklar    [[t ms, värde, easing för segmentet som börjar här], …]
                En enda nyckel = värdet sätts direkt vid t.
     värde      tal, eller 'cur' (där egenskapen står just nu), 'mal' (nya
                platsen), 'mal2' (den rättade platsen), 'hog' (graveyard-
                högen), 'hogS' (kortet i högens storlek), 'flygS' (skalan
                flygTillGrav använder).
     flagga     'svag' = hoppas över om egenskapen redan animeras av något
                annat (tap mitt i en flytt tar inte över skalan).
                'intern' = styr ritningen men visas inte i tidslinjen.
   t räknas från kamerans uppdatering, inte från handen. */

const EASE = {
  UT:    { b: [.2, .8, .3, 1],   css: 'cubic-bezier(.2,.8,.3,1)',   om: 'appens landning och settle (cLand, cSettle, graveyard-högen)' },
  HF:    { b: [.3, .75, .25, 1], css: 'cubic-bezier(.3,.75,.25,1)', om: 'flygturen ur solfjädern till mattan (hfFlyg, 480 ms)' },
  FLY:   { b: [.4, 0, .2, 1],    css: 'cubic-bezier(.4,0,.2,1)',    om: 'flygturen till graveyard (flygTillGrav, 340 ms)' },
  OS:    { b: [.34, 1.4, .5, 1], css: 'cubic-bezier(.34,1.4,.5,1)', om: '.card-transitionen i dag: tap med överslag' },
  SOFT:  { b: [.3, .7, .3, 1],   css: 'cubic-bezier(.3,.7,.3,1)',   om: 'mjuk vridning utan överslag (ny)' },
  OUT:   { b: [0, 0, .58, 1],    css: 'ease-out' },
  IN:    { b: [.42, 0, 1, 1],    css: 'ease-in' },
  INOUT: { b: [.42, 0, .58, 1],  css: 'ease-in-out' },
  LIN:   { b: null,              css: 'linear' },
  STEP:  { b: 'step',            css: 'hopp' },
};

const EGENSKAP = {
  pos: 'position', dy: 'lyft i y', s: 'skala', r: 'vridning', o: 'opacitet',
  lift: 'skugga', face: 'framsida', ph: 'platshållare', dim: 'nedtoning',
  ring: 'grön ring', glow: 'grön kant', clip: 'framsidan skannas', scan: 'skannerlinje',
  cb: 'sökarhörn', cbs: 'hörnens skala',
};
const MAL = { kort: 'kortet', plats: 'platshållaren', spok: 'spåret', hog: 'högens toppkort', hogring: 'högens ring', hogtal: 'högens tal' };

/* Graveyard-högens landning (GRAVEYARD_ANIMATION.md §3): cLand på
   toppkortet, cRing ur högen och cBump på talet — flyttad i tid. */
function landa(t) {
  return [
    ['hog', 'o', [[t, 0, 'UT'], [t + 500, 1]]],
    ['hog', 'dy', [[t, -40, 'UT'], [t + 300, 4, 'UT'], [t + 500, 0]]],
    ['hog', 's', [[t, 1.14, 'UT'], [t + 300, .98, 'UT'], [t + 500, 1]]],
    ['hogring', 's', [[t, .5, 'OUT'], [t + 550, 1.5]]],
    ['hogring', 'o', [[t, .7, 'OUT'], [t + 550, 0]]],
    ['hogtal', 's', [[t, 1, 'UT'], [t + 168, 1.18, 'UT'], [t + 420, 1]]],
  ];
}
/* Dagens flygtur till graveyard, oförändrad. */
const FLYG_I_DAG = [
  ['kort', 'pos', [[0, 'cur', 'FLY'], [340, 'hog']]],
  ['kort', 's', [[0, 1, 'FLY'], [340, 'flygS']]],
  ['kort', 'r', [[0, 'cur', 'FLY'], [340, -12]]],
  ['kort', 'o', [[0, 1, 'FLY'], [340, .15, 'STEP'], [341, 0]]],
];

const SPEC = {
  /* ── I dag: det index.html gör nu ── */
  N: {
    vanta: 700,                  // BORTA_NAD 600 ms + lyftT 100 ms
    plats: [['plats', 'o', [[0, 1]]]],
    namn: [['kort', 'face', [[0, 1]]], ['kort', 'ph', [[0, 0]]], ['kort', 'ring', [[0, 0, 'OUT'], [1400, 1]]]],
    tappad: [],
    nedtonad: [['kort', 'dim', [[0, 1]]]],
    flytt: [['kort', 'pos', [[0, 'mal']]], ['kort', 'dim', [[0, 0]]], ['plats', 'o', [[0, 0]]]],
    avbrott: [['kort', 'pos', [[0, 'mal2']]], ['plats', 'pos', [[0, 'mal2']]], ['kort', 'r', [[0, 'cur', 'OS'], [340, 90]]]],
    tillbaka: [['kort', 'dim', [[0, 0]]], ['plats', 'o', [[0, 0]]]],
    tillbakaNy: [['kort', 'pos', [[0, 'mal']]], ['kort', 'dim', [[0, 0]]], ['plats', 'o', [[0, 0]]]],
    grav: [['kort', 'dim', [[0, 0]]], ...FLYG_I_DAG, ...landa(0)],
    tap: [['kort', 'r', [[0, 'cur', 'OS'], [340, 90]]]],
    untap: [['kort', 'r', [[0, 'cur', 'OS'], [340, 0]]]],
  },

  /* ── A · Stilla: toning och raka glid, inget lyfts ── */
  A: {
    vanta: 5000,
    plats: [['plats', 'o', [[0, 0, 'OUT'], [180, 1]]], ['plats', 's', [[0, .96, 'UT'], [180, 1]]]],
    namn: [['kort', 'face', [[0, 0, 'OUT'], [220, 1]]], ['kort', 'ph', [[0, 1, 'LIN'], [220, 0]]], ['kort', 'ring', [[0, 0, 'OUT'], [900, 1]]]],
    tappad: [],
    nedtonad: [['kort', 'dim', [[0, 0, 'INOUT'], [480, 1]]]],
    flytt: [['kort', 'pos', [[0, 'cur', 'HF'], [380, 'mal']]], ['plats', 'o', [[220, 1, 'LIN'], [380, 0]]]],
    avbrott: [['kort', 'pos', [[0, 'cur', 'HF'], [320, 'mal2']]], ['plats', 'pos', [[0, 'cur', 'HF'], [320, 'mal2']]], ['kort', 'r', [[0, 'cur', 'UT'], [200, 90]]]],
    tillbaka: [['kort', 'dim', [[0, 1, 'OUT'], [240, 0]]], ['plats', 'o', [[0, 1, 'LIN'], [160, 0]]]],
    tillbakaNy: [['kort', 'pos', [[0, 'cur', 'HF'], [380, 'mal']]], ['kort', 'dim', [[0, 1, 'OUT'], [380, 0]]], ['plats', 'o', [[220, 1, 'LIN'], [380, 0]]]],
    grav: [...FLYG_I_DAG, ...landa(200)],
    tap: [['kort', 'r', [[0, 'cur', 'UT'], [200, 90]]]],
    untap: [['kort', 'r', [[0, 'cur', 'UT'], [200, 0]]]],
  },

  /* ── B · Handen: läggs ned, lyfts, bärs, sätts ned ── */
  B: {
    vanta: 5000,
    plats: [
      ['plats', 'o', [[0, 0, 'LIN'], [120, 1]]],
      ['plats', 'dy', [[0, -18, 'UT'], [180, 2, 'UT'], [300, 0]]],
      ['plats', 's', [[0, 1.06, 'UT'], [180, .99, 'UT'], [300, 1]]],
      ['plats', 'lift', [[0, 1, 'UT'], [300, 0]]],
    ],
    namn: [['kort', 'face', [[0, 0, 'OUT'], [200, 1]]], ['kort', 'ph', [[0, 1, 'LIN'], [200, 0]]], ['kort', 'ring', [[0, 0, 'OUT'], [900, 1]]]],
    tappad: [],
    nedtonad: [['kort', 'dim', [[0, 0, 'INOUT'], [520, 1]]], ['kort', 's', [[0, 1, 'INOUT'], [520, .975]]]],
    flytt: [
      ['kort', 'lift', [[0, 'cur', 'OUT'], [100, 1, 'LIN'], [300, 1, 'IN'], [420, 0]]],
      ['kort', 's', [[0, 'cur', 'OUT'], [100, 1.05, 'LIN'], [300, 1.05, 'UT'], [380, .985, 'UT'], [450, 1]]],
      ['kort', 'pos', [[0, 'cur', 'FLY'], [420, 'mal']]],
      ['plats', 'o', [[300, 1, 'LIN'], [400, 0]]],
    ],
    avbrott: [
      ['kort', 'pos', [[0, 'cur', 'FLY'], [320, 'mal2']]],
      ['plats', 'pos', [[0, 'cur', 'HF'], [320, 'mal2']]],
      ['kort', 's', [[0, 'cur', 'LIN'], [170, 1.05, 'UT'], [250, .985, 'UT'], [320, 1]]],
      ['kort', 'lift', [[0, 'cur', 'LIN'], [170, 1, 'IN'], [290, 0]]],
      ['kort', 'r', [[0, 'cur', 'SOFT'], [240, 90]]],
    ],
    tillbaka: [['kort', 'dim', [[0, 1, 'OUT'], [260, 0]]], ['kort', 's', [[0, 'cur', 'UT'], [150, 1.02, 'UT'], [300, 1]]], ['plats', 'o', [[0, 1, 'LIN'], [160, 0]]]],
    tillbakaNy: [
      ['kort', 'dim', [[0, 1, 'OUT'], [200, 0]]],
      ['kort', 'lift', [[0, 'cur', 'OUT'], [100, 1, 'LIN'], [300, 1, 'IN'], [420, 0]]],
      ['kort', 's', [[0, 'cur', 'OUT'], [100, 1.05, 'LIN'], [300, 1.05, 'UT'], [380, .985, 'UT'], [450, 1]]],
      ['kort', 'pos', [[0, 'cur', 'FLY'], [420, 'mal']]],
      ['plats', 'o', [[300, 1, 'LIN'], [400, 0]]],
    ],
    grav: [
      ['kort', 'lift', [[0, 'cur', 'OUT'], [80, 1]]],
      ['kort', 's', [[0, 'cur', 'OUT'], [80, 1.04, 'FLY'], [360, 'hogS']]],
      ['kort', 'pos', [[0, 'cur', 'FLY'], [360, 'hog']]],
      ['kort', 'r', [[0, 'cur', 'FLY'], [180, -6, 'UT'], [360, 0]]],
      ['kort', 'o', [[360, 0]]],
      ['hog', 'o', [[360, 1]]],
      ['hog', 's', [[360, 1.06, 'UT'], [540, .985, 'UT'], [660, 1]]],
      ['hogring', 's', [[360, .5, 'OUT'], [910, 1.5]]],
      ['hogring', 'o', [[360, .7, 'OUT'], [910, 0]]],
      ['hogtal', 's', [[360, 1, 'UT'], [528, 1.18, 'UT'], [780, 1]]],
    ],
    tap: [['kort', 'r', [[0, 'cur', 'SOFT'], [240, 90]]], ['kort', 's', [[0, 'cur', 'INOUT'], [120, 1.03, 'INOUT'], [240, 1]], 'svag'], ['kort', 'lift', [[0, 'cur', 'INOUT'], [120, .5, 'INOUT'], [240, 0]], 'svag']],
    untap: [['kort', 'r', [[0, 'cur', 'SOFT'], [240, 0]]], ['kort', 's', [[0, 'cur', 'INOUT'], [120, 1.03, 'INOUT'], [240, 1]], 'svag'], ['kort', 'lift', [[0, 'cur', 'INOUT'], [120, .5, 'INOUT'], [240, 0]], 'svag']],
  },

  /* ── C · Kameran: visar vad kameran vet ── */
  C: {
    vanta: 5000,
    plats: [['plats', 'o', [[0, 0, 'LIN'], [140, 1]]], ['plats', 'cb', [[0, 0, 'UT'], [220, 1]]], ['plats', 'cbs', [[0, 1.12, 'UT'], [220, 1]]]],
    namn: [
      ['kort', 'face', [[0, 1]], 'intern'], ['kort', 'cbg', [[0, 1]], 'intern'],
      ['kort', 'clip', [[0, 0, 'FLY'], [280, 1]]],
      ['kort', 'scan', [[0, 0, 'FLY'], [280, 1]]],
      ['kort', 'ph', [[0, 1, 'LIN'], [280, 0]]],
      ['kort', 'cb', [[0, 1, 'LIN'], [1100, 1, 'OUT'], [1400, 0]]],
    ],
    tappad: [['kort', 'cbg', [[0, 0]], 'intern'], ['kort', 'cb', [[1500, 0, 'INOUT'], [1900, .45]]], ['kort', 'cbs', [[1500, 1.06, 'INOUT'], [1900, 1]]]],
    nedtonad: [['kort', 'dim', [[0, 0, 'INOUT'], [480, 1]]], ['kort', 'cb', [[0, 'cur', 'LIN'], [480, 0]]]],
    flytt: [
      ['kort', 'cbg', [[0, 1]], 'intern'],
      ['kort', 'pos', [[0, 'cur', 'HF'], [360, 'mal']]],
      ['spok', 'o', [[0, .7, 'OUT'], [600, 0]]],
      ['plats', 'o', [[200, 1, 'LIN'], [360, 0]]],
      ['kort', 'cb', [[0, 'cur', 'LIN'], [120, .8, 'LIN'], [1000, .8, 'OUT'], [1300, 0]]],
    ],
    avbrott: [['kort', 'pos', [[0, 'cur', 'HF'], [300, 'mal2']]], ['plats', 'pos', [[0, 'cur', 'HF'], [300, 'mal2']]], ['kort', 'r', [[0, 'cur', 'UT'], [220, 90]]]],
    tillbaka: [
      ['kort', 'cbg', [[0, 1]], 'intern'],
      ['kort', 'dim', [[0, 1, 'OUT'], [280, 0]]],
      ['kort', 'scan', [[0, 0, 'FLY'], [280, 1]]],
      ['plats', 'o', [[0, 1, 'LIN'], [160, 0]]],
      ['kort', 'cb', [[0, 'cur', 'LIN'], [120, .8, 'LIN'], [900, .8, 'OUT'], [1200, 0]]],
    ],
    tillbakaNy: [
      ['kort', 'cbg', [[0, 1]], 'intern'],
      ['kort', 'dim', [[0, 1, 'OUT'], [360, 0]]],
      ['kort', 'pos', [[0, 'cur', 'HF'], [360, 'mal']]],
      ['spok', 'o', [[0, .7, 'OUT'], [600, 0]]],
      ['plats', 'o', [[200, 1, 'LIN'], [360, 0]]],
      ['kort', 'cb', [[0, 'cur', 'LIN'], [120, .8, 'LIN'], [1000, .8, 'OUT'], [1300, 0]]],
    ],
    grav: [['kort', 'cb', [[0, 'cur', 'LIN'], [120, 0]]], ['spok', 'o', [[0, .7, 'OUT'], [600, 0]]], ...FLYG_I_DAG, ...landa(200)],
    tap: [['kort', 'r', [[0, 'cur', 'UT'], [220, 90]]]],
    untap: [['kort', 'r', [[0, 'cur', 'UT'], [220, 0]]]],
  },

  /* ── Minskad rörelse (prefers-reduced-motion), samma för A, B och C:
        bara toning. Positionen och vridningen byts medan kortet är
        osynligt eller nästan osynligt. ── */
  R: {
    vanta: 5000,
    plats: [['plats', 'o', [[0, 0, 'LIN'], [150, 1]]]],
    namn: [['kort', 'face', [[0, 0, 'LIN'], [200, 1]]], ['kort', 'ph', [[0, 1, 'LIN'], [200, 0]]], ['kort', 'glow', [[0, .8, 'LIN'], [900, 0]]]],
    tappad: [],
    nedtonad: [['kort', 'dim', [[0, 0, 'LIN'], [480, 1]]]],
    flytt: [['kort', 'o', [[0, 1, 'LIN'], [150, 0, 'LIN'], [350, 1]]], ['kort', 'pos', [[150, 'mal']]], ['plats', 'o', [[150, 1, 'LIN'], [350, 0]]]],
    avbrott: [['kort', 'o', [[0, 'cur', 'LIN'], [100, 0, 'LIN'], [250, 1]]], ['kort', 'pos', [[100, 'mal2']]], ['plats', 'pos', [[100, 'mal2']]], ['kort', 'r', [[100, 90]]]],
    tillbaka: [['kort', 'dim', [[0, 1, 'LIN'], [240, 0]]], ['plats', 'o', [[0, 1, 'LIN'], [160, 0]]]],
    tillbakaNy: [['kort', 'o', [[0, 1, 'LIN'], [150, 0, 'LIN'], [350, 1]]], ['kort', 'pos', [[150, 'mal']]], ['kort', 'dim', [[150, 0]]], ['plats', 'o', [[150, 1, 'LIN'], [350, 0]]]],
    grav: [['kort', 'o', [[0, 1, 'LIN'], [200, 0]]], ['hog', 'o', [[0, 0, 'LIN'], [200, 1]]]],
    tap: [['kort', 'o', [[0, 1, 'LIN'], [100, .3, 'LIN'], [240, 1]]], ['kort', 'r', [[100, 90]]]],
    untap: [['kort', 'o', [[0, 1, 'LIN'], [100, .3, 'LIN'], [240, 1]]], ['kort', 'r', [[100, 0]]]],
  },
};

/* Faserna — vad kameran säger, och när. Vilka faser en händelse får beror
   på väntetiden (I dag tonas ett tappat kort ned innan platshållaren kommer)
   och på hur snabbt namnet kommer. */
const FAS = {
  plats: 'Platshållaren syns',
  claude: 'Kameran frågar Claude',
  namn: 'Namnet kommer',
  tappad: 'Kameran tappar kortet',
  nedtonad: 'Väntan slut: nedtonat',
  flytt: 'Namnet kommer: samma kort, ny plats',
  avbrott: 'Ny rapport mitt i flytten',
  tillbaka: 'Namnet kommer: det nedtonade kortet',
  tillbakaNy: 'Namnet kommer: det nedtonade kortet, ny plats',
  grav: 'Graveyard-högen växer',
  tap: 'Kameran är säker: tappat',
  untap: 'Kameran är säker: otappat',
};

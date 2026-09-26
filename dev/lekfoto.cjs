#!/usr/bin/env node
/* Telefonens lekfoto (MES-289) provat utan telefon och utan webbläsare.

   Klipper ut telfotoLas (och det den sparar med — LEKSLAG, lekSparaKo,
   lekFargerAv, lekNamnSkiljer) ur index.html och matar den med påhittade
   svar från /api/identify i läget 'lek': tomma namn, namn som inte går att
   slå upp, ett helt oläsligt foto, fler kort än servern tar emot (kapade),
   dubbletter över två foton, samma foto två gånger, och nätfel i
   sparningen — också ett nätfel där raden ändå skrevs. Scryfall och servern
   (decks-raden) är attrapper.

   Dubbletter efter ett försvunnet svar (MES-289, A–C): varje ändring har ett
   id och raden bär id:na på det som redan ligger i den (decks.klara). A
   (telefonen, datorn sparade emellan), B (datorns kö växte mellan försöken)
   och C (pollningen läste in datorns egen skrivning) provas här — och mot
   index.html med id-mekanismen bortplockad, bit för bit, där de ska fällas.

   Frågan varje fall svarar på: blir varje kort som svaret visar en rad i
   leken — ett vanligt kort, eller en post under To check — och säger
   telefonens klar-skärm hur många som inte kom med alls?

   Sedan spelet (granskningen av MES-289): platshållarna kommer aldrig in i
   spelets lek eller kamerans pool, och spelets antal är lika överallt. Det
   provet körs också mot index.html med varje filter bortplockat, ett i
   taget — det ska fällas varje gång (mutationsprovet).

     node dev/lekfoto.cjs                   provet mot index.html (ingår i dev/kolla.sh)
     node dev/lekfoto.cjs --mot <fil>       fallen mot en annan index.html också,
                                            som tabell FÖRE → EFTER (till exempel
                                            git show 22644e3:index.html > /tmp/fore.html)

   Slutar med "lekfoto: N OK, M FEL" och slutkod 1 om något faller.
   .cjs eftersom package.json säger "type": "module". */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const FIL = path.join(__dirname, '..', 'index.html');
const MOT = arg('--mot', '');

const skarUr = (src, namn) => (fran, till) => {
  const a = src.indexOf(fran), b = src.indexOf(till, a);
  if (a < 0 || b < 0) throw new Error(`hittar inte "${fran}" … "${till}" i ${namn}`);
  return src.slice(a, b);
};

/* ── telefonens avläsning, utklippt ──────────────────────────────── */
function laddaSrc(src, namn = 'index.html') {
  const skar = skarUr(src, namn);
  const kod = [
    skar('/* ══ BLOCK: LEKSLAG', '/* ══ SLUT: LEKSLAG ══ */'),
    skar('const LEK_BL_FARG', '/* Namnet på en ny lek'),
    skar('const lekNamnForm =', '/* Vad i det skrivna namnet'),
    skar('/* En sparning av en kö mot en rad.', '/* Efter en sparning:'),
    skar('/* ── avläsningen ── */', '/* ══ SLUT: TELEFONENS LEKFOTO ══ */'),
  ].join('\n');
  /* Det utklippet läser utanför sig självt. Allt går via ctx, som varje fall
     ställer in på nytt. */
  const miljo = `
const MANA_ORD = ['W', 'U', 'B', 'R', 'G', 'C'];
const lekKortData = () => null;
const telfoto = ctx.telfoto;
const aiEnabled = () => true;
const AI_ENDPOINT = '/api/identify';
const fetch = (...a) => ctx.fetch(...a);
const bokforDatorAi = () => {};
const lekKallDuk = () => ({ width: 1, height: 1 });
const lekB64 = () => ({ b64: 'xx' });
const lekRemsa = (x, y) => 'remsa:' + x + ',' + y;
const lookup = n => ctx.lookup(n);
const imgOf = k => k.small || null;
const lekKanalSag = m => ctx.kanal.push(m);
const telfotoSteg = s => { telfoto.steg = s; ctx.steg.push(s); };
const lekSpara = (...a) => ctx.lekSpara(...a);
const lekHamtaRad = (...a) => ctx.lekHamtaRad(...a);
const uid = () => Math.random().toString(36).slice(2, 9) + 'abc';
`;
  return new Function('ctx', miljo + kod + `
return { lekSlagTillampa, lekSlagSummor, lekFargerAv, lekSparaKo, telfotoLas,
  telfotoIgen: typeof telfotoIgen === 'function' ? telfotoIgen : null };`);
}
const ladda = fil => laddaSrc(fs.readFileSync(fil, 'utf8'), fil);

/* ── attrapperna ─────────────────────────────────────────────────── */
const kopia = o => JSON.parse(JSON.stringify(o));
const K = (name, id, ci = []) => ({ id, name, small: 'https://img/' + id + '.jpg', ci });
/* Scryfall: det luddiga uppslaget rättar "Lightnig Bolt"; "Blixtpil" finns
   inte (404); "Brainstorm" får ett nätfel (tillfälligt, namnet kan vara rätt). */
const SCRYFALL = new Map([
  ['sol ring', K('Sol Ring', 'sr')], ['arcane signet', K('Arcane Signet', 'as')],
  ['lightning bolt', K('Lightning Bolt', 'lb', ['R'])], ['lightnig bolt', K('Lightning Bolt', 'lb', ['R'])],
  ['thalia, guardian of thraben', K('Thalia, Guardian of Thraben', 'th', ['W'])],
  ['swords to plowshares', K('Swords to Plowshares', 'sp', ['W'])], ['counterspell', K('Counterspell', 'cs', ['U'])],
  ['plains', K('Plains', 'pl')],
]);
const NATFEL = new Set(['brainstorm']);

function nyCtx(app0) {
  const ctx = { telfoto: {}, kanal: [], steg: [], svar: [], las: 0 };
  let klocka = 1000;
  ctx.server = { rad: { id: 'lek1', namn: 'Boros', kort: [], farger: [], antal: 0, ts: klocka }, fel: [], nereLas: 0, skrivna: 0 };
  ctx.fetch = async () => {
    const s = ctx.svar.shift();
    if (!s) throw new Error('inget svar kvar i provet');
    return { ok: true, status: 200, json: async () => kopia(s) };
  };
  ctx.lookup = async namn => {
    const q = String(namn).toLowerCase().trim();
    if (NATFEL.has(q)) { const e = new Error('no connection'); e.tillfallig = true; throw e; }
    const c = SCRYFALL.get(q);
    if (!c) throw new Error('not found');
    return kopia(c);
  };
  /* Servern som Moln.sparaLek: skriver bara om raden inte ändrats sedan
     `sedd`, annars {konflikt, rad}. fel-kön styr nästa sparning:
       'nere'    nätet föll innan något skrevs
       'tappat'  raden skrevs, men svaret kom aldrig fram
     Båda svarar som den riktiga: {ok: false, fel}. forsok (tiden den försökte
     skriva) svarade den riktiga före decks.klara; det står kvar för --mot
     mot en äldre index.html, och dagens kod läser det inte. */
  ctx.lekSpara = async (id, data, sedd) => {
    const f = ctx.server.fel.shift(), rad = ctx.server.rad;
    const ts = ++klocka;
    if (f === 'nere') return { ok: false, fel: 'TypeError: Failed to fetch', forsok: ts };
    if (sedd && rad.ts > sedd) return { ok: false, konflikt: true, rad: kopia(rad) };
    ctx.server.rad = Object.assign({}, rad, kopia(data), { ts });
    ctx.server.skrivna++;
    if (f === 'tappat') return { ok: false, fel: 'TypeError: Failed to fetch', forsok: ts };
    return { ok: true, rad: kopia(ctx.server.rad) };
  };
  ctx.lekHamtaRad = async () => {
    ctx.las++;
    if (ctx.server.nereLas > 0) { ctx.server.nereLas--; throw new Error('TypeError: Failed to fetch'); }
    return kopia(ctx.server.rad);
  };
  /* En annan enhet (datorn) sparar något mellan två foton. */
  ctx.datorn = ops => {
    const v = app0.lekSlagTillampa(ctx.server.rad, ops);
    ctx.server.rad = Object.assign({}, ctx.server.rad, { kort: v.kort, antal: app0.lekSlagSummor(v.kort).main, ts: ++klocka });
  };
  return ctx;
}

/* Telefonens vy för en lek: som telfotoOppna, med raden hämtad. */
function oppna(ctx) {
  Object.assign(ctx.telfoto, { id: 'lek1', bas: kopia(ctx.server.rad), namn: 'Boros', steg: 'ansluten', foto: 1,
    sista: null, fel: '', laser: false, osparat: null });
}
const KALLA = { canvas: {}, box: { x: 0, y: 0, w: 1, h: 1 }, hogar: 5 };
const post = (namn, x, y, sakerhet = 'hog') => ({ namn, x, y, sakerhet });

/* Ett foto som telefonen tar: svaret ställs i kö och telfotoLas körs. */
async function foto(app, ctx, svar) { ctx.svar.push(svar); await app.telfotoLas(KALLA); }
/* Felskärmens Try again. Efter: sparar det lästa fotot igen. Före fanns inget
   läst foto kvar: knappen öppnade leken på nytt (telfotoOppna — raden läses,
   räkningen börjar om på Photo 1) och det enda sättet vidare var att ta
   fotot igen, alltså samma svar en gång till. */
async function igen(app, ctx, svar) {
  if (app.telfotoIgen && ctx.telfoto.osparat) { await app.telfotoIgen(); return 'sparat igen'; }
  ctx.telfoto.bas = kopia(ctx.server.rad); ctx.telfoto.foto = 1;
  await foto(app, ctx, svar);
  return 'fotot taget igen';
}

/* Lekens rader efter fallet: vanliga kort, To check med ett kort (modellen
   tvekade eller Scryfall rättade), och platshållare (inget kort). */
function leken(ctx) {
  const kort = ctx.server.rad.kort || [];
  const n = f => kort.filter(f).reduce((t, k) => t + (Number(k.n) || 1), 0);
  return { rad: kort, antal: ctx.server.rad.antal, totalt: n(() => true), vanliga: n(k => !k.koll),
           koll: n(k => k.koll && !k.okand), okand: n(k => k.okand), okandRader: kort.filter(k => k.okand) };
}

/* ── fallen ──────────────────────────────────────────────────────── */
const SOL = post('Sol Ring', 170, 120), SIG = post('Arcane Signet', 170, 240), THA = post('Thalia, Guardian of Thraben', 170, 360);
const TRE = { kort: [SOL, SIG, THA], otydliga: 0, kapade: 0 };
const TRE_FACIT = { 'Sol Ring': 1, 'Arcane Signet': 1, 'Thalia, Guardian of Thraben': 1 };
/* Fyra kort att spela med och två oläsliga titelrader. */
const TOMMA = { kort: [SOL, SIG, post('', 170, 480, 'lag'), post('Lightning Bolt', 500, 120, 'medel'), post('', 500, 240, 'lag'), THA], otydliga: 0 };
const OLASLIGT = { kort: [post('', 170, 120, 'lag'), post('', 170, 240, 'lag'), post('', 170, 360, 'lag')], otydliga: 0 };
const HUVUDFEL = 'None of the names in the photo matched a card. Photograph fewer cards at a time, straight from above.';
const FALL = [
  { id: 'tomma', namn: 'två titelrader gick inte att läsa (tomt namn)',
    poster: 6, facit: { 'Sol Ring': 1, 'Arcane Signet': 1, 'Thalia, Guardian of Thraben': 1, 'Lightning Bolt': 1, okand: 2 },
    kor: async (app, ctx) => foto(app, ctx, TOMMA) },
  { id: 'uppslag', namn: 'namn som inte går att slå upp (404 och nätfel)',
    poster: 4, facit: { 'Sol Ring': 1, 'Lightning Bolt': 1, okand: 2 },
    kor: async (app, ctx) => foto(app, ctx, { kort: [post('Blixtpil', 170, 120, 'lag'), post('Lightnig Bolt', 170, 240), post('Brainstorm', 170, 360), SOL], otydliga: 0 }) },
  { id: 'olasligt', namn: 'helt oläsligt foto: inget namn gick att läsa',
    poster: 3, facit: {},
    kor: async (app, ctx) => foto(app, ctx, OLASLIGT) },
  { id: 'olasligt-uppslag', namn: 'inget av namnen gick att slå upp (404, nätfel)',
    poster: 2, facit: {},
    kor: async (app, ctx) => foto(app, ctx, { kort: [post('Blixtpil', 170, 120, 'lag'), post('Brainstorm', 170, 240)], otydliga: 0 }) },
  { id: 'olasligt-omtag', namn: 'oläsligt foto, sedan taget om',
    poster: 3, facit: TRE_FACIT,
    kor: async (app, ctx) => {
      await foto(app, ctx, OLASLIGT);
      ctx.fall.felskarm = ctx.telfoto.steg === 'fel';
      await foto(app, ctx, TRE);
    } },
  { id: 'kapade', namn: 'fler kort än servern tar emot (kapade) + två tomma',
    poster: 4, facit: { 'Sol Ring': 1, 'Arcane Signet': 1, okand: 2 },
    /* Servern räknar in de kapade i otydliga: modellen missade 1, servern kapade 3. */
    kor: async (app, ctx) => foto(app, ctx, { kort: [SOL, post('', 170, 240, 'lag'), post('', 170, 360, 'lag'), SIG], otydliga: 4, kapade: 3 }) },
  { id: 'dubbletter', namn: 'dubbletter och tomma namn över två foton',
    poster: 7, facit: { 'Lightning Bolt': 3, 'Sol Ring': 1, okand: 3 },
    kor: async (app, ctx) => {
      await foto(app, ctx, { kort: [post('Lightning Bolt', 170, 120), post('Lightning Bolt', 170, 240), post('', 170, 360, 'lag'), SOL], otydliga: 0 });
      await foto(app, ctx, { kort: [post('Lightning Bolt', 170, 120), post('', 170, 240, 'lag'), post('Blixtpil', 170, 360, 'lag')], otydliga: 0 });
    } },
  { id: 'samma', namn: 'samma tre kort fotade två gånger (mäts)', matning: true,
    poster: 6, facit: TRE_FACIT,
    kor: async (app, ctx) => { await foto(app, ctx, TRE); await foto(app, ctx, TRE); } },
  { id: 'tappat-nere', namn: 'nätfel efter att raden skrevs, nätet nere → Try again',
    poster: 3, facit: TRE_FACIT,
    kor: async (app, ctx) => {
      ctx.server.fel.push('tappat'); ctx.server.nereLas = 1;
      await foto(app, ctx, TRE);
      ctx.fall.felskarm = ctx.telfoto.steg === 'fel';
      ctx.fall.igen = await igen(app, ctx, TRE);
    } },
  { id: 'tappat-uppe', namn: 'nätfel efter att raden skrevs, nätet uppe igen',
    poster: 3, facit: TRE_FACIT,
    kor: async (app, ctx) => {
      ctx.server.fel.push('tappat');
      await foto(app, ctx, TRE);
      ctx.fall.felskarm = ctx.telfoto.steg === 'fel';
      if (ctx.fall.felskarm) ctx.fall.igen = await igen(app, ctx, TRE);
    } },
  { id: 'nere', namn: 'nätfel innan något skrevs → Try again',
    poster: 3, facit: TRE_FACIT,
    kor: async (app, ctx) => {
      ctx.server.fel.push('nere');
      await foto(app, ctx, TRE);
      ctx.fall.felskarm = ctx.telfoto.steg === 'fel';
      ctx.fall.igen = await igen(app, ctx, TRE);
    } },
  { id: 'tomma-tappat', namn: 'tomma namn + nätfel efter att raden skrevs → Try again',
    poster: 4, facit: { 'Sol Ring': 1, 'Arcane Signet': 1, okand: 2 },
    kor: async (app, ctx) => {
      ctx.server.fel.push('tappat'); ctx.server.nereLas = 1;
      const svar = { kort: [SOL, post('', 170, 240, 'lag'), post('', 170, 360, 'lag'), SIG], otydliga: 0 };
      await foto(app, ctx, svar);
      ctx.fall.igen = await igen(app, ctx, svar);
    } },
  { id: 'konflikt', namn: 'datorn lade till 4 Plains under tiden (konflikt)',
    poster: 3, facit: Object.assign({ Plains: 4 }, TRE_FACIT),
    kor: async (app, ctx) => {
      ctx.datorn([{ typ: 'antal', name: 'Plains', sb: false, d: 4, kort: { name: 'Plains', sid: 'pl', small: null } }]);
      await foto(app, ctx, TRE);
    } },
  /* A (MES-289): tidsstämpeln som förut skulle känna igen den egna
     skrivningen gjorde det bara om ingen annan skrev emellan — 3 blev 6. */
  { id: 'kant-a', namn: 'A: svaret försvann, datorn sparade emellan → Try again',
    poster: 3, facit: Object.assign({ Plains: 4 }, TRE_FACIT),
    kor: async (app, ctx) => {
      ctx.server.fel.push('tappat'); ctx.server.nereLas = 1;
      await foto(app, ctx, TRE);
      ctx.datorn([{ typ: 'antal', name: 'Plains', sb: false, d: 4, kort: { name: 'Plains', sid: 'pl', small: null } }]);
      ctx.fall.igen = await igen(app, ctx, TRE);
    } },
];

async function korAlla(fil) {
  const app0 = ladda(fil)(nyCtx(null));
  const ut = new Map();
  for (const f of FALL) {
    const ctx = nyCtx(app0), app = ladda(fil)(ctx);
    ctx.fall = {};
    oppna(ctx);
    let krasch = null;
    try { await f.kor(app, ctx); } catch (e) { krasch = e; }
    /* Färgerna med en tidigare identitet (blått) som reserv: ett kort med
       okända färger släpper in reserven, en platshållare ska inte göra det. */
    const farger = app.lekFargerAv(ctx.server.rad.kort, ['U']);
    ut.set(f.id, { ctx, leken: leken(ctx), krasch, sista: ctx.telfoto.sista, steg: ctx.telfoto.steg, fall: ctx.fall, farger });
  }
  return ut;
}

/* ── domen ───────────────────────────────────────────────────────── */
const ok = [], fel = [];
const prov = (namn, f) => { try { f(); ok.push('OK   ' + namn); } catch (e) { fel.push('FEL  ' + namn + ' — ' + e.message); } };

function doma(r) {
  const R = id => r.get(id);
  for (const f of FALL) {
    const x = R(f.id);
    if (x.krasch) { fel.push(`FEL  ${f.namn} — kraschade: ${x.krasch.message}`); continue; }
  }
  prov('tomma namn: alla sex poster blir rader — de två tomma som platshållare under To check, var och en med sin remsa', () => {
    const l = R('tomma').leken;
    assert.equal(l.totalt, 6, `leken fick ${l.totalt} av 6`);
    assert.equal(l.okand, 2, 'två platshållare');
    assert.deepEqual(l.okandRader.map(k => k.koll.remsa).sort(), ['remsa:170,480', 'remsa:500,240'], 'var sin remsa');
    assert.ok(l.okandRader.every(k => k.koll.las === '' && k.koll.kalla === 'Photo 1' && !k.sid), 'tomt läst namn, Photo 1, inget sid');
    assert.equal(l.koll, 1, 'Lightning Bolt (medel) under To check som förut');
    assert.equal(l.antal, 4, 'decks.antal räknar bara kort att spela med');
  });
  prov('tomma namn: klar-skärmen och datorn får 6 nya, 3 att kolla', () => {
    const x = R('tomma');
    assert.equal(x.steg, 'klar');
    assert.equal(x.sista.nya, 6); assert.equal(x.sista.koll, 3);
    const m = x.ctx.kanal.find(k => k.typ === 'sparad');
    assert.ok(m && m.nya === 6 && m.koll === 3 && m.foto === 1, JSON.stringify(m));
  });
  prov('ej uppslagna: 404 och nätfel blir platshållare med det fotot läste; Scryfalls rättning under To check', () => {
    const l = R('uppslag').leken;
    assert.equal(l.totalt, 4, `leken fick ${l.totalt} av 4`);
    assert.deepEqual(l.okandRader.map(k => k.koll.las).sort(), ['Blixtpil', 'Brainstorm']);
    const lb = l.rad.find(k => k.name === 'Lightning Bolt');
    assert.ok(lb && lb.koll && lb.koll.las === 'Lightnig Bolt', 'rättat namn ska kollas');
  });
  prov('helt oläsligt foto: felet som förut, inga platshållare, leken orörd, samma fotonummer', () => {
    const x = R('olasligt');
    assert.equal(x.steg, 'fel'); assert.equal(x.ctx.telfoto.fel, HUVUDFEL);
    assert.equal(x.leken.totalt, 0, `leken fick ${x.leken.totalt}`); assert.equal(x.ctx.server.skrivna, 0, 'ingen skrivning');
    assert.equal(x.ctx.telfoto.foto, 1, 'fotot räknas inte');
    assert.ok(!x.ctx.kanal.some(m => m.typ === 'sparad'), 'datorn får inget "sparad"');
    assert.equal(x.ctx.telfoto.osparat, null, 'inget att spara igen');
  });
  prov('inget av namnen gick att slå upp: samma fel, inga platshållare', () => {
    const x = R('olasligt-uppslag');
    assert.equal(x.steg, 'fel'); assert.equal(x.ctx.telfoto.fel, HUVUDFEL);
    assert.equal(x.leken.totalt, 0); assert.equal(x.ctx.server.skrivna, 0);
  });
  prov('oläsligt foto som tas om: bara det nya fotots kort — inga platshållare kvar, totalen stämmer', () => {
    const x = R('olasligt-omtag');
    assert.ok(x.fall.felskarm, 'första fotot gav felet');
    assert.equal(x.leken.totalt, 3, `leken fick ${x.leken.totalt} av 3`);
    assert.equal(x.leken.okand, 0);
    assert.equal(x.ctx.telfoto.foto, 2, 'omtaget var Photo 1, nästa är Photo 2');
  });
  prov('kapade: posterna i svaret blir rader, och klar-skärmen säger hur många som inte lästes och att de ska fotas igen', () => {
    const x = R('kapade');
    assert.equal(x.leken.totalt, 4, `leken fick ${x.leken.totalt} av 4 poster`);
    assert.match(x.sista.extra || '', /\b4 cards\b/, `texten: "${x.sista.extra}"`);
    assert.match(x.sista.extra || '', /again/, `texten: "${x.sista.extra}"`);
  });
  prov('dubbletter över två foton: samma namn läggs ihop, tomma slås aldrig ihop, Photo 1 och Photo 2', () => {
    const x = R('dubbletter'), l = x.leken;
    assert.equal(l.totalt, 7, `leken fick ${l.totalt} av 7`);
    assert.equal(l.rad.find(k => k.name === 'Lightning Bolt').n, 3);
    assert.equal(l.okandRader.length, 3, 'två tomma och Blixtpil — tre rader');
    assert.ok(l.okandRader.every(k => k.n === 1));
    assert.deepEqual(l.okandRader.map(k => k.koll.kalla).sort(), ['Photo 1', 'Photo 2', 'Photo 2']);
    assert.equal(x.ctx.telfoto.foto, 3, 'nästa foto är Photo 3');
  });
  prov('nätfel där raden skrevs, nätet nere: felskärm, Try again sparar det lästa fotot — korten läggs in EN gång', () => {
    const x = R('tappat-nere');
    assert.ok(x.fall.felskarm, 'felskärmen visades');
    assert.equal(x.fall.igen, 'sparat igen', 'Try again ska spara samma foto, inte be om ett nytt');
    assert.equal(x.leken.totalt, 3, `leken fick ${x.leken.totalt} av 3`);
    assert.equal(x.steg, 'klar');
    assert.equal(x.ctx.telfoto.foto, 2);
  });
  prov('nätfel där raden skrevs, nätet uppe: ingen felskärm, korten EN gång', () => {
    const x = R('tappat-uppe');
    assert.equal(x.fall.felskarm, false, 'felskärmen ska inte visas när raden gick att läsa');
    assert.equal(x.leken.totalt, 3, `leken fick ${x.leken.totalt} av 3`);
    assert.equal(x.steg, 'klar');
  });
  prov('nätfel innan något skrevs: Try again sparar, korten EN gång', () => {
    const x = R('nere');
    assert.ok(x.fall.felskarm);
    assert.equal(x.leken.totalt, 3);
    assert.equal(x.ctx.server.skrivna, 1, 'en skrivning');
  });
  prov('tomma namn och tappat svar: platshållarna läggs inte in två gånger', () => {
    const x = R('tomma-tappat');
    assert.equal(x.leken.totalt, 4, `leken fick ${x.leken.totalt} av 4`);
    assert.equal(x.leken.okand, 2);
  });
  prov('lekens färger: platshållarna gör inte färgerna okända (Thalia W + Bolt R, inte reservens U)', () => {
    assert.deepEqual(R('tomma').farger, ['W', 'R']);
  });
  prov('konflikt: datorns 4 Plains står kvar, fotots 3 kort läggs till', () => {
    const l = R('konflikt').leken;
    assert.equal(l.totalt, 7);
    assert.equal(l.rad.find(k => k.name === 'Plains').n, 4);
  });
  prov('A: svaret försvann, datorn sparade emellan → Try again: fotots kort EN gång, datorns 4 Plains kvar', () => {
    const x = R('kant-a');
    assert.equal(x.fall.igen, 'sparat igen');
    assert.equal(x.steg, 'klar');
    assert.equal(x.leken.totalt, 7, `leken fick ${x.leken.totalt} av 7: ${x.leken.rad.map(k => k.n + ' ' + k.name).join(', ')}`);
    assert.equal(x.leken.rad.find(k => k.name === 'Plains').n, 4);
  });
}

/* ── lekSparaKo direkt: kön växer mellan försöken ─────────────────── */
const L = (name, id, d = 1) => ({ typ: 'antal', name, sb: false, d, kort: { name, sid: id, small: null } });
async function sparaKoProv(fil) {
  const ctx = nyCtx(null), app = ladda(fil)(ctx);
  const bas = kopia(ctx.server.rad);
  ctx.server.fel.push('tappat'); ctx.server.nereLas = 1;
  /* Kön är samma objekt mellan försöken (datorns y.ops, telefonens osparade
     foto): det nya läggs till i slutet. */
  const ko = [L('Sol Ring', 'sr')];
  const a = await app.lekSparaKo('lek1', bas, ko.slice());
  ko.push(L('Counterspell', 'cs', 2));
  const b = await app.lekSparaKo('lek1', bas, ko.slice(), { forsok: a.forsok });
  prov('lekSparaKo: första försöket gick igenom utan svar, kön växte — bara det nya spelas upp', () => {
    assert.equal(a.ok, false);
    assert.ok(b.ok, JSON.stringify(b));
    const l = leken(ctx);
    assert.equal(l.totalt, 3, `leken fick ${l.totalt}, ska vara 1 Sol Ring + 2 Counterspell`);
    assert.equal(l.rad.find(k => k.name === 'Sol Ring').n, 1);
  });
}

/* ── Moln.sparaLek mot en påhittad databas ───────────────────────────
   Attrappen ovan svarar som sparaLek. Här provas sparaLek själv — utklippt
   ur Moln, mot en låtsad Supabase-klient — så att klara verkligen hamnar i
   raden också när svaret aldrig kom fram, så att en omläsning som faller på
   ett nätfel inte blir "leken är borta", och A hela vägen: telefonens och
   datorns lekSparaKo mot den riktiga sparaLek. */
function laddaMoln(fil, db) {
  const src = fs.readFileSync(fil, 'utf8');
  const a = src.indexOf('  const lekTs = r =>'), b = src.indexOf('  async function dopOmLek(', a);
  if (a < 0 || b < 0) throw new Error('hittar inte lekens rader i Moln i ' + fil);
  /* Låtsasklienten: from('decks') med update/eq/lte/select och
     select/eq/maybeSingle — det sparaLek och hamtaLekRad använder. */
  const klient = {
    from: () => {
      const q = { op: 'select', data: null, filt: [] };
      const kor = async () => {
        const f = q.op === 'update' ? db.fel.shift() : db.lasFel.shift();
        if (f === 'nere') return { data: null, error: { message: 'TypeError: Failed to fetch' } };
        const traff = db.rader.filter(r => q.filt.every(t => t(r)));
        if (q.op === 'update') traff.forEach(r => Object.assign(r, JSON.parse(JSON.stringify(q.data))));
        if (f === 'tappat') return { data: null, error: { message: 'TypeError: Failed to fetch' } };
        const ut = JSON.parse(JSON.stringify(traff));
        return q.op === 'enda' ? { data: ut[0] || null, error: null } : { data: ut, error: null };
      };
      const b = {
        update(d) { q.op = 'update'; q.data = d; return b; },
        eq(k, v) { q.filt.push(r => r[k] === v); return b; },
        lte(k, v) { q.filt.push(r => Date.parse(r[k]) <= Date.parse(v)); return b; },
        select() { return q.op === 'update' ? kor() : b; },
        maybeSingle() { q.op = 'enda'; return kor(); },
      };
      return b;
    },
    auth: { refreshSession: async () => ({ error: null }) },
  };
  return new Function('klientObj', `
const klient = async () => klientObj, inloggad = () => true, minId = () => 'u1';
const console = { warn() {}, log() {}, error() {} };   // sparaLek varnar i konsolen vid fel
${src.slice(a, b)}
return { sparaLek, hamtaLekRad };`)(klient);
}
async function molnProv(fil) {
  const iso = ms => new Date(ms).toISOString();
  const vila = () => new Promise(r => setTimeout(r, 3));   // sparaLek stämplar i ms: två skrivningar ska inte dela tid
  const db = { rader: [{ id: 'lek1', user_id: 'u1', namn: 'Boros', kort: [], antal: 0, uppdaterad: iso(Date.now() - 60000) }], fel: [], lasFel: [] };
  const M = laddaMoln(fil, db);
  const bas = await M.hamtaLekRad('lek1');
  db.fel.push('tappat');
  const a = await M.sparaLek('lek1', { kort: [{ name: 'Sol Ring', sid: 'sr', n: 1 }], antal: 1, klara: ['op1'] }, bas.ts);
  const efter = await M.hamtaLekRad('lek1');
  prov('Moln.sparaLek: ett svar som aldrig kom är ett fel — och raden bär ändringens id (klara)', () => {
    assert.equal(a.ok, false);
    assert.ok(a.fel, JSON.stringify(a));
    assert.equal(efter.antal, 1, 'raden skrevs');
    assert.deepEqual(efter.klara, ['op1']);
  });
  /* Konflikt (raden ändrad efter bas) och omläsningen faller på nätet. */
  db.lasFel.push('nere');
  const c = await M.sparaLek('lek1', { antal: 5 }, bas.ts);
  prov('Moln.sparaLek: konflikt där omläsningen faller på nätet är ett fel att försöka igen — inte "leken är borta"', () => {
    assert.equal(c.ok, false);
    assert.ok(!c.borta, 'borta: ' + JSON.stringify(c));
    assert.ok(c.fel, JSON.stringify(c));
  });
  const d = await M.sparaLek('lek-som-inte-finns', { antal: 5 }, bas.ts);
  prov('Moln.sparaLek: en lek som verkligen är borta är fortfarande borta', () => {
    assert.equal(d.borta, true, JSON.stringify(d));
  });

  /* A hela vägen, mot den riktiga sparaLek: telefonens foto skrivs men
     svaret försvinner och omläsningen faller; datorn (som läst raden före
     fotot) lägger till 4 Plains; en äldre flik sparar utan klara (update
     sätter bara de fält den får); telefonen trycker Try again med samma
     kö-objekt som sitt osparade foto. */
  const db2 = { rader: [{ id: 'lek1', user_id: 'u1', namn: 'Boros', kort: [], antal: 0, farger: [], klara: [], uppdaterad: iso(Date.now() - 60000) }], fel: [], lasFel: [] };
  const M2 = laddaMoln(fil, db2);
  const kopp = () => ladda(fil)({ lekSpara: M2.sparaLek, lekHamtaRad: M2.hamtaLekRad, telfoto: {}, kanal: [], steg: [] });
  const tel = kopp(), dator = kopp();
  const telBas = await M2.hamtaLekRad('lek1'), datorBas = await M2.hamtaLekRad('lek1');
  const fotot = [L('Sol Ring', 'sr'), L('Arcane Signet', 'as'), L('Counterspell', 'cs')];
  await vila();
  db2.fel.push('tappat'); db2.lasFel.push('nere');
  const t1 = await tel.lekSparaKo('lek1', telBas, fotot);
  await vila();
  const dr = await dator.lekSparaKo('lek1', datorBas, [L('Plains', 'pl', 4)]);
  await vila();
  const radNu = await M2.hamtaLekRad('lek1');
  await M2.sparaLek('lek1', { namn: 'Boros 2', kort: radNu.kort, antal: radNu.antal }, radNu.ts);
  await vila();
  const t2 = await tel.lekSparaKo('lek1', telBas, fotot);
  const slut = db2.rader[0], tal = n => (slut.kort.find(k => k.name === n) || {}).n || 0;
  prov(`A mot den riktiga sparaLek: telefonen fel → datorn +4 Plains → en äldre flik sparar → Try again: ${slut.kort.map(k => k.n + ' ' + k.name).join(', ')}`, () => {
    assert.equal(t1.ok, false, 'första försöket ska ha gett fel');
    assert.ok(dr.ok && t2.ok, JSON.stringify({ dr: dr.ok, t2 }));
    assert.deepEqual([tal('Sol Ring'), tal('Arcane Signet'), tal('Counterspell'), tal('Plains')], [1, 1, 1, 4]);
    assert.equal(slut.namn, 'Boros 2');
    assert.ok(fotot.every(op => slut.klara.includes(op.id)), 'fotots id:n står kvar i klara efter den äldre flikens skrivning');
  });
}

/* ── spelet: platshållarna räknas inte, och antalet är lika överallt ────
   Granskningen av MES-289: platshållarna räknades i decks.antal, som spelet
   läser på flera ställen (lek_info till motståndarna, deras chip och
   library-räkning, uppstarten, lekväxlaren), medan lekKvar inte räknade dem
   — 60 för motståndarna, 58 för mig. Nu räknar spelet bara kort att spela
   med, överallt, som innan platshållarna fanns; lekens sida och Home räknar
   dem också, eftersom de står under To check där.

   Utklippt: lekInfo, lekSattAktiv, lekKvar (spelets lek), lekKortAntal och
   sattKamLekAntal (kameran), byggLekPoolRa (kamerans pool), oppLekVyHtml,
   hemLekRad och lekRadHtml (uppstarten och Home) — mot attrapper för det
   de läser utanför sig. */
function laddaSpel(src, namn = 'index.html') {
  const skar = skarUr(src, namn);
  const kod = [
    skar('/* ══ BLOCK: LEKSLAG', '/* ══ SLUT: LEKSLAG ══ */'),
    skar('const LEK_BL_FARG', '/* Namnet på en ny lek'),
    skar('const lekInfo = ', '\nconst pipsHtml'),
    skar('function lekSattAktiv(rad) {', '/* Samma lager oavsett konto'),
    skar('let lekTal = null;', '/* Typgrupperna i leklådan.'),
    skar('/* Typgrupperna i leklådan.', '/* ── fotot in'),
    skar('function lekKortAntal(lek) {', '/* ═══'),
    skar('async function byggLekPoolRa(', '/* Datorns avläsningar'),
    skar('let kamLekAntal = null;', 'async function kamValdLek()'),
    skar('function oppLekVyHtml(l) {', '/* Pennan (G1Edit)'),
    skar('function lekOmslag(kort) {', 'async function hemHamtaLekar()'),
  ].join('\n');
  const miljo = `
const norm = s => String(s || '').toLowerCase().replace(/\\s+/g, ' ').trim();
const MANA_ORD = ['W', 'U', 'B', 'R', 'G', 'C'];
const LS = { get: (k, d) => d, set: () => true, del: () => {} }, K = { lekaktiv: 'lekaktiv' };
const lekForhamta = async () => {};
let lekAktiv = null;
const spelLage = null, minSpelare = () => ({ cards: [] });
/* Kortcachen: varje namn är en artefakt utan färger (typen sorterar bara). */
const cardCache = new Map(), cardFor = name => ({ name, faces: [{ type: 'Artifact' }] });
const lookup = async () => { throw new Error('inget nät i provet'); }, lookupId = lookup;
const Pool = { idx: null, load: async () => null };
const fetchQuery = async q => { ctx.fragor.push(q); };
const byggPoolAv = async (cards, code) => ({ cards, code });
const BASICS = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);
const BASLAND_NAMN = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];
const BAKSIDA = 'baksida.jpg', BAKSIDA_NAMN = '(baksida)';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pipsHtml = () => '', lsIk = () => '', LS_PRICKAR = '', imgOf = () => null, renderOppstart = () => {};
const LS_GRUPP = { creature: 'Creatures', planeswalker: 'Planeswalkers', spell: 'Instants & sorceries',
  artifact: 'Artifacts & enchantments', enchantment: 'Artifacts & enchantments', land: 'Lands', other: 'Other' };
const LS_GRUPP_ORDNING = ['Creatures', 'Planeswalkers', 'Instants & sorceries', 'Artifacts & enchantments', 'Lands', 'Other'];
`;
  return new Function('ctx', miljo + kod + `
return { lekSlagSummor, lekFargerAv, lekInfo, lekSattAktiv, lekKvar, lekKortAntal, byggLekPoolRa, sattKamLekAntal,
  oppLekVyHtml, hemLekRad, lekRadHtml,
  get lekAktiv() { return lekAktiv; }, get lekKort() { return lekKort; }, get lekTal() { return lekTal; },
  get kamLekAntal() { return kamLekAntal; } };`);
}

/* Kontrollerna, som [namn, fel|null]. Leken byggs av telefonens riktiga
   avläsning (fallet "tomma": fyra kort + två oläsliga titelrader) och
   sparas med den riktiga lekSparaKo — decks.antal kommer därifrån. */
const OKAND = /unreadable card/i;
async function spelKontroller(src) {
  const ut = [], kolla = (namn, f) => { try { f(); ut.push([namn, null]); } catch (e) { ut.push([namn, e.message]); } };
  const ctx = nyCtx(null), tel = laddaSrc(src)(ctx);
  ctx.fall = {}; oppna(ctx);
  await foto(tel, ctx, TOMMA);
  const rad = kopia(ctx.server.rad), SPEL = 4, LEKEN = 6;
  const S = { fragor: [] }, s = laddaSpel(src)(S);
  s.lekSattAktiv(rad);
  s.sattKamLekAntal(rad.kort);
  const pool = await s.byggLekPoolRa(rad, 'u1');
  const hr = s.hemLekRad(rad), vy = s.oppLekVyHtml(hr);
  kolla('spelets lek (lekSattAktiv): inga platshållare i lekKort eller lekTal', () => {
    assert.ok(s.lekKort.length && s.lekKort.every(k => !k.okand), 'en platshållare i lekKort');
    assert.ok(![...s.lekTal.keys()].some(n => OKAND.test(n)), 'en platshållare i lekTal');
  });
  kolla('kamerans pool (byggLekPoolRa): inga platshållare bland korten eller i frågorna till Scryfall', () => {
    assert.ok(pool.cards.length >= SPEL && !pool.cards.some(c => OKAND.test(c.name)), 'en platshållare i poolen');
    assert.ok(S.fragor.length && !S.fragor.some(q => OKAND.test(q)), 'en platshållare i frågan: ' + S.fragor.join(' | '));
  });
  kolla('kamerans antal per namn (sattKamLekAntal): inga platshållare', () => {
    assert.ok(![...s.kamLekAntal.keys()].some(n => OKAND.test(n)));
  });
  kolla('uppstartens library (oppLekVyHtml): inga platshållare bland högarna', () => {
    assert.ok(!OKAND.test(vy), 'platshållaren står bland korten som går till library');
  });
  const tal = { 'decks.antal (lekväxlaren, lekAktiv)': rad.antal, 'lek_info till motståndarna (lekInfo)': s.lekInfo(rad).antal,
    'menyn och chipet (lekAktiv.antal)': s.lekAktiv.antal, 'mitt library (lekKvar)': (s.lekKvar() || {}).totalt,
    'kamerans statusrad (lekKortAntal)': s.lekKortAntal(rad), 'uppstartens lekrad (hemLekRad)': hr.antal };
  kolla(`spelets antal är lika överallt (${SPEL}): ${Object.values(tal).join(' · ')}`, () => {
    for (const [var_, n] of Object.entries(tal)) assert.equal(n, SPEL, `${var_} = ${n}`);
    assert.match(s.lekRadHtml(hr, { radio: true }), new RegExp(`>${SPEL} cards<`), 'uppstartens rad');
    assert.match(vy, new RegExp(`>${SPEL} cards<`), 'uppstartens skylt över högarna');
  });
  kolla(`lekens sida och Home räknar platshållarna också (${LEKEN}) — de står under To check där`, () => {
    assert.equal(s.lekSlagSummor(rad.kort).main, LEKEN, 'lekens sida');
    const home = s.lekRadHtml(hr, { meny: true });
    assert.match(home, new RegExp(`>${LEKEN} cards<`), 'Home');
    assert.match(home, />3 to check</, 'Home: 3 to check');
  });
  kolla('lekens färger (lekFargerAv): platshållarna gör inte färgerna okända', () => {
    assert.deepEqual(s.lekFargerAv(rad.kort, ['U']), ['W', 'R']);
  });
  return ut;
}
/* Varje filter bortplockat, ett i taget: kontrollerna ska fällas. Står
   raden inte längre i index.html (koden skrevs om) är det ett FEL här —
   uppdatera då mutationen, så att provet fortsätter att vakta filtret. */
const MUTATIONER = [
  ['spelets lek (lekSattAktiv)', 'rad.kort.filter(k => !k.okand)', 'rad.kort'],
  ['decks.antal (lekSparaKo)', 'antal: lekSpelAntal(kort)', 'antal: lekSlagSummor(kort).main'],
  ['kamerans statusrad (lekKortAntal)', 'lekSpelbara(lek.kort).reduce', 'lek.kort.reduce'],
  ['kamerans antal per namn (sattKamLekAntal)', 'kort = Array.isArray(kort) ? lekSpelbara(kort) : kort;', ''],
  ['kamerans pool (byggLekPoolRa)', '(lek.kort || []).filter(k => !k.okand).map(k => k.name)', '(lek.kort || []).map(k => k.name)'],
  ['uppstartens library (oppLekVyHtml)', '.filter(k => !k.sb && !k.okand)', '.filter(k => !k.sb)'],
  ['lekens färger (lekFargerAv)', 'if (k.sb || k.okand) continue;', 'if (k.sb) continue;'],
  ['lekSpelbara självt', 'filter(k => k && !k.okand)', 'filter(k => k)'],
];
async function spelProv(fil) {
  const src = fs.readFileSync(fil, 'utf8');
  for (const [namn, f] of await spelKontroller(src)) prov(namn, () => { if (f) throw new Error(f); });
  for (const [namn, fran, till] of MUTATIONER) {
    const n = src.split(fran).length - 1;
    if (n !== 1) { fel.push(`FEL  mutationen "${namn}": raden står ${n} gånger i index.html — uppdatera MUTATIONER i dev/lekfoto.cjs`); continue; }
    let r;
    try { r = await spelKontroller(src.replace(fran, () => till)); } catch (e) { r = [['laddningen', e.message]]; }
    const fallna = r.filter(([, f]) => f).map(([k]) => k.split(' (')[0].split(':')[0]);
    prov(`utan filtret i ${namn} fälls provet (${fallna.length} av ${r.length}: ${fallna.join(', ')})`, () => assert.ok(fallna.length > 0, 'ingen kontroll föll'));
  }
}

/* ── A, B och C: dubbletter efter ett försvunnet svar (MES-289) ────────
   Granskningen av e49bdce återskapade tre sätt att få dubbletter som
   tidsstämpeln (forsok) inte fångade. Med ändringarnas id:n i raden
   (decks.klara) ska alla tre ge rätt antal. Varje fall ger [namn, fel|null,
   det leken fick]. forsok skickas fortfarande med mellan försöken — det gör
   ingenting i dagens kod, men låter --mot köra samma fall mot en äldre
   index.html med dess eget skydd. */
async function luckor(src) {
  const ut = [], kolla = (namn, fick, f) => { let e = null; try { f(); } catch (x) { e = x.message; } ut.push([namn, e, fick]); };
  const txt = kort => (kort || []).map(k => `${k.n} ${k.name}`).join(', ');
  const tal = (kort, n) => ((kort || []).find(k => k.name === n) || {}).n || 0;
  { /* A: telefonen — svaret försvann, omläsningen föll, datorn sparade emellan, Try again. */
    const app0 = laddaSrc(src)(nyCtx(null));
    const ctx = nyCtx(app0), app = laddaSrc(src)(ctx);
    ctx.fall = {}; oppna(ctx);
    ctx.server.fel.push('tappat'); ctx.server.nereLas = 1;
    await foto(app, ctx, TRE);
    ctx.datorn([{ typ: 'antal', name: 'Plains', sb: false, d: 4, kort: { name: 'Plains', sid: 'pl', small: null } }]);
    await igen(app, ctx, TRE);
    const k = ctx.server.rad.kort;
    kolla('A telefonen: svaret försvann, datorn sparade emellan → Try again', txt(k),
      () => assert.deepEqual(['Sol Ring', 'Arcane Signet', 'Thalia, Guardian of Thraben', 'Plains'].map(n => tal(k, n)), [1, 1, 1, 4]));
  }
  { /* B: datorn — kön växer efter ett försvunnet svar, och nästa försök faller också. */
    const ctx = nyCtx(null), app = laddaSrc(src)(ctx);
    let bas = kopia(ctx.server.rad), forsok = [];
    const ops = [L('Sol Ring', 'sr'), L('Arcane Signet', 'as')];
    ctx.server.fel.push('tappat'); ctx.server.nereLas = 1;
    let r = await app.lekSparaKo('lek1', bas, ops.slice(), { forsok });
    if (r.rad) bas = r.rad; if (r.forsok) forsok = r.forsok;
    ops.push(L('Counterspell', 'cs'));
    ctx.server.fel.push(undefined, 'nere'); ctx.server.nereLas = 1;
    r = await app.lekSparaKo('lek1', bas, ops.slice(), { forsok });
    if (r.rad) bas = r.rad; if (r.forsok) forsok = r.forsok;
    r = await app.lekSparaKo('lek1', bas, ops.slice(), { forsok });
    const k = ctx.server.rad.kort;
    kolla('B datorn: kön växte efter ett försvunnet svar, nästa försök föll också', txt(k), () => {
      assert.ok(r.ok, 'sista försöket ska gå igenom');
      assert.deepEqual(['Sol Ring', 'Arcane Signet', 'Counterspell'].map(n => tal(k, n)), [1, 1, 1]);
    });
  }
  { /* C: pollningen — datorns sparning skrevs men svaret försvann; pollningen
       (hamtaNyare) sätter y.bas till den egna skrivningen medan y.ops ligger
       kvar. Både vyn (nu() = lekSlagTillampa(y.bas, y.ops)) och nästa
       sparning ska visa korten en gång. */
    const ctx = nyCtx(null), app = laddaSrc(src)(ctx);
    const ops = [L('Sol Ring', 'sr'), L('Arcane Signet', 'as')];
    ctx.server.fel.push('tappat'); ctx.server.nereLas = 1;
    const r1 = await app.lekSparaKo('lek1', kopia(ctx.server.rad), ops.slice(), { forsok: [] });
    const yBas = kopia(ctx.server.rad);                       // hamtaNyare
    const vy = app.lekSlagTillampa(yBas, ops).kort;           // nu()
    await app.lekSparaKo('lek1', yBas, ops.slice(), { forsok: r1.forsok || [] });
    const k = ctx.server.rad.kort;
    kolla('C pollningen läste in datorns egen skrivning', `vyn ${txt(vy)} · raden ${txt(k)}`, () => {
      assert.deepEqual(['Sol Ring', 'Arcane Signet'].map(n => tal(vy, n)), [1, 1], 'vyn');
      assert.deepEqual(['Sol Ring', 'Arcane Signet'].map(n => tal(k, n)), [1, 1], 'raden');
    });
  }
  return ut;
}
/* Id-mekanismen bortplockad, bit för bit: fallen ska fällas. `alla` = alla
   tre ska falla; annars räcker ett. Står raden inte längre i index.html är
   det ett FEL — uppdatera mutationen. */
const LUCKMUTATIONER = [
  ['id-hoppet helt (lekSlagKlara ser inga id:n)', 'const lekSlagKlara = bas => new Set(bas && Array.isArray(bas.klara) ? bas.klara : []);', 'const lekSlagKlara = bas => new Set();', true],
  ['hoppet i lekSlagTillampa', 'if (op.id && klara.has(op.id)) continue;', '', false],
  ['klara skrivs inte (lekSparaKo)', ',\n                   klara: lekSlagKlaraEfter(rad, ops) };', ' };', true],
  ['id:n sätts inte (lekSparaKo)', 'for (const op of ops) if (op && !op.id) op.id = lekOpId();', '', true],
];
async function luckProv(fil) {
  const src = fs.readFileSync(fil, 'utf8');
  for (const [namn, f, fick] of await luckor(src)) prov(`${namn}: ${fick}`, () => { if (f) throw new Error(f); });
  for (const [namn, fran, till, alla] of LUCKMUTATIONER) {
    const n = src.split(fran).length - 1;
    if (n !== 1) { fel.push(`FEL  mutationen "${namn}": raden står ${n} gånger i index.html — uppdatera LUCKMUTATIONER i dev/lekfoto.cjs`); continue; }
    let r;
    try { r = await luckor(src.replace(fran, () => till)); } catch (e) { r = [['laddningen', e.message, '']]; }
    const fallna = r.filter(([, f]) => f).map(([k]) => k.split(' ')[0]);
    prov(`utan ${namn} fälls ${alla ? 'A, B och C' : 'provet'} (${fallna.length} av ${r.length}: ${fallna.join(', ') || 'inget'})`,
      () => assert.ok(alla ? fallna.length === r.length : fallna.length > 0, 'fälldes inte'));
  }
}

/* ── utskriften ──────────────────────────────────────────────────── */
/* Jämfört med facit, rad för rad: kort som saknas (borta) och kort som
   kom in fler gånger än de fotades (för många). Platshållarna räknas som
   en grupp — de har inget namn att jämföra. */
function rad(f, x) {
  if (x.krasch) return 'kraschade: ' + x.krasch.message;
  const l = x.leken, fick = new Map([['okand', l.okand]]);
  for (const k of l.rad) if (!k.okand) fick.set(k.name, (fick.get(k.name) || 0) + (Number(k.n) || 1));
  let borta = 0, over = 0;
  for (const nyckel of new Set([...Object.keys(f.facit), ...fick.keys()])) {
    const d = (fick.get(nyckel) || 0) - (f.facit[nyckel] || 0);
    if (d < 0) borta -= d; else over += d;
  }
  const tc = l.koll + l.okand;
  return `${String(l.totalt).padStart(2)} i leken (${tc} To check, ${l.okand} platsh.)`
    + (borta ? `, ${borta} borta` : '') + (over ? `, ${over} för många` : '') + (x.steg === 'fel' ? ', felskärm' : '');
}
(async () => {
  const efter = await korAlla(FIL);
  const fore = MOT ? await korAlla(MOT) : null;
  const B = 58;
  console.log(`${'Fall'.padEnd(B)} poster  ${fore ? 'FÖRE'.padEnd(38) + ' → ' : ''}EFTER`);
  for (const f of FALL) {
    const e = efter.get(f.id);
    console.log(`${f.namn.slice(0, B).padEnd(B)} ${String(f.poster).padStart(4)}    ${fore ? rad(f, fore.get(f.id)).padEnd(38) + ' → ' : ''}${rad(f, e)}`);
  }
  const skarm = r => (r.get('kapade').sista || {}).extra || '(ingen text)';
  if (fore) console.log(`\nklar-skärmen, kapade — före: "${skarm(fore)}"`);
  console.log(`klar-skärmen, kapade${fore ? ' — efter' : ''}: "${skarm(efter)}"`);
  console.log('samma foto två gånger: leken får båda — appen kan inte veta att det är samma fysiska kort (mätning, inget fel)');
  console.log('\ndubbletter efter ett försvunnet svar (MES-289, facit: varje kort en gång, 4 Plains i A):');
  const lE = await luckor(fs.readFileSync(FIL, 'utf8'));
  const lF = MOT ? await luckor(fs.readFileSync(MOT, 'utf8')) : null;
  lE.forEach(([namn, f, fick], i) => console.log(`  ${namn}:${lF ? `\n    FÖRE  ${lF[i][2]}${lF[i][1] ? '  (fel)' : ''}\n    EFTER` : ''} ${fick}${f ? '  (fel)' : ''}`));
  console.log('');
  doma(efter);
  await sparaKoProv(FIL);
  await molnProv(FIL);
  await luckProv(FIL);
  await spelProv(FIL);
  for (const r of [...ok, ...fel]) console.log(r);
  console.log(`\nlekfoto: ${ok.length} OK, ${fel.length} FEL`);
  process.exit(fel.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

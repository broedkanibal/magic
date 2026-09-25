#!/usr/bin/env node
/* Telefonens lekfoto (MES-289) provat utan telefon och utan webbläsare.

   Klipper ut telfotoLas (och det den sparar med — LEKSLAG, lekSparaKo,
   lekFargerAv, lekNamnSkiljer) ur index.html och matar den med påhittade
   svar från /api/identify i läget 'lek': tomma namn, namn som inte går att
   slå upp, fler kort än servern tar emot (kapade), dubbletter över två
   foton, samma foto två gånger, och nätfel i sparningen — också ett nätfel
   där raden ändå skrevs. Scryfall och servern (decks-raden) är attrapper.

   Frågan varje fall svarar på: blir varje kort som svaret visar en rad i
   leken — ett vanligt kort, eller en post under To check — och säger
   telefonens klar-skärm hur många som inte kom med alls?

     node dev/lekfoto.cjs                   provet mot index.html (ingår i dev/kolla.sh)
     node dev/lekfoto.cjs --mot <fil>       samma fall mot en annan index.html också,
                                            som tabell FÖRE → EFTER (till exempel
                                            git show 22644e3:index.html > /tmp/fore.html)

   Slutar med "lekfoto: N OK, M FEL" och slutkod 1 om något faller.
   .cjs eftersom package.json säger "type": "module". */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const FIL = path.join(__dirname, '..', 'index.html');
const MOT = arg('--mot', '');

/* ── appen, utklippt ─────────────────────────────────────────────── */
function ladda(fil) {
  const src = fs.readFileSync(fil, 'utf8');
  const skar = (fran, till) => {
    const a = src.indexOf(fran), b = src.indexOf(till, a);
    if (a < 0 || b < 0) throw new Error(`hittar inte "${fran}" … "${till}" i ${fil}`);
    return src.slice(a, b);
  };
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
     Båda svarar som den riktiga: {ok: false, fel, forsok: tiden den försökte skriva}. */
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
const FALL = [
  { id: 'tomma', namn: 'två titelrader gick inte att läsa (tomt namn)',
    poster: 6, facit: { 'Sol Ring': 1, 'Arcane Signet': 1, 'Thalia, Guardian of Thraben': 1, 'Lightning Bolt': 1, okand: 2 },
    kor: async (app, ctx) => foto(app, ctx, { kort: [SOL, SIG, post('', 170, 480, 'lag'), post('Lightning Bolt', 500, 120, 'medel'), post('', 500, 240, 'lag'), THA], otydliga: 0 }) },
  { id: 'uppslag', namn: 'namn som inte går att slå upp (404 och nätfel)',
    poster: 4, facit: { 'Sol Ring': 1, 'Lightning Bolt': 1, okand: 2 },
    kor: async (app, ctx) => foto(app, ctx, { kort: [post('Blixtpil', 170, 120, 'lag'), post('Lightnig Bolt', 170, 240), post('Brainstorm', 170, 360), SOL], otydliga: 0 }) },
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
    poster: 6, facit: { 'Sol Ring': 1, 'Arcane Signet': 1, 'Thalia, Guardian of Thraben': 1 },
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
    assert.equal(l.antal, 6, 'lekens antal räknar platshållarna');
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
}

/* ── lekSparaKo direkt: kön växer mellan försöken ─────────────────── */
async function sparaKoProv(fil) {
  const ctx = nyCtx(null), app = ladda(fil)(ctx);
  const L = (name, id, d = 1) => ({ typ: 'antal', name, sb: false, d, kort: { name, sid: id, small: null } });
  const bas = kopia(ctx.server.rad);
  ctx.server.fel.push('tappat'); ctx.server.nereLas = 1;
  const a = await app.lekSparaKo('lek1', bas, [L('Sol Ring', 'sr')]);
  const b = await app.lekSparaKo('lek1', bas, [L('Sol Ring', 'sr'), L('Counterspell', 'cs', 2)], { forsok: a.forsok });
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
   ur Moln, mot en låtsad Supabase-klient — så att tiden den lämnar i
   `forsok` verkligen är den tid raden bär om skrivningen gick igenom, och
   så att en omläsning som faller på ett nätfel inte blir "leken är borta". */
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
  const db = { rader: [{ id: 'lek1', user_id: 'u1', namn: 'Boros', kort: [], antal: 0, uppdaterad: iso(Date.now() - 60000) }], fel: [], lasFel: [] };
  const M = laddaMoln(fil, db);
  const bas = await M.hamtaLekRad('lek1');
  db.fel.push('tappat');
  const a = await M.sparaLek('lek1', { kort: [{ name: 'Sol Ring', sid: 'sr', n: 1 }], antal: 1 }, bas.ts);
  const efter = await M.hamtaLekRad('lek1');
  prov('Moln.sparaLek: ett svar som aldrig kom bär tiden raden fick (forsok = radens ts)', () => {
    assert.equal(a.ok, false);
    assert.ok(a.forsok, 'forsok saknas');
    assert.equal(efter.ts, a.forsok);
    assert.equal(efter.antal, 1, 'raden skrevs');
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
    + (borta ? `, ${borta} borta` : '') + (over ? `, ${over} för många` : '');
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
  console.log('samma foto två gånger: leken får båda — appen kan inte veta att det är samma fysiska kort (mätning, inget fel)\n');
  doma(efter);
  await sparaKoProv(FIL);
  await molnProv(FIL);
  for (const r of [...ok, ...fel]) console.log(r);
  console.log(`\nlekfoto: ${ok.length} OK, ${fel.length} FEL`);
  process.exit(fel.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

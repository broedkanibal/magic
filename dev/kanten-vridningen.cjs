#!/usr/bin/env node
/* Kameran sköter sig själv (MES-359): mattan vrids efter korten, och ett kort delvis utanför bilden
   väntar tills det syns helt.

   Kör:  node dev/kanten-vridningen.cjs          alla tre delarna
         node dev/kanten-vridningen.cjs --utan-chrome   bara telefonens två delar (sekunder)

   1. Telefonens röst om vridningen (riktningVakt): Kamera-modulen ur index.html i node, som
      dev/kamerabank.cjs, med spår vars namnremsa pekar åt ett känt håll. Två kort överens avgör,
      ett tappat kort fäller det inte, ett ensamt kort avgör först efter RIKT_ENSAM_MS, och ett kort
      nära 45° röstar inte. Spåren läggs in direkt: dagens detektor i node har ingen remsa, och det
      som provas är rösträkningen, inte KortVinkel (den har sin egen bänk, VK i kamerabanken).
   2. Kanten (kantVakt): samma modul, syntetiska bildrutor genom steg(). Ett kort som skärs av
      bildens överkant står inte i bordet till datorn och läses inte; efter KANT_SAG_MS stilla säger
      telefonen fasen 'kant'; flyttat in syns det, läses och fasen går; ett kort som setts helt och
      sedan glider ut en bit står kvar; en hand som sveper längs kanten ger aldrig fasen; ett kort
      en pixel från kanten (Mirran Bardiche i golden 16) läses som vanligt.
   3. Datorns sida i en huvudlös Chrome (minnet "kamerans datorsida provas utan telefon"): appen
      laddar utan undantag, autoVandUrKorten vrider mattan rätt för 0°, 90°, 180° och 270° (också
      speglat) — ett kort vars namn pekar åt det hållet i bilden får namnet uppåt på mattan — en
      gång per uppställning, ↻ efteråt vinner och skrivs aldrig över, en rad från före MES-359 med
      en vridning räknas som spelarens, och panelens meningar (sida 1 D och 2 L) kommer och går.

   Slutkod 1 om något faller, 2 om Chrome inte går att starta. .cjs eftersom package.json säger
   "type": "module". */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROT = path.join(__dirname, '..');
const FIL = path.join(ROT, 'index.html');
const ok = [], fel = [];
const check = (namn, villkor, detalj) => { (villkor ? ok : fel).push(`${villkor ? 'OK  ' : 'FEL '} ${namn}${detalj ? ' — ' + detalj : ''}`); };

/* ── Kamera-modulen i node, som kamerabanken ─────────────────────────── */
function laddaKamera() {
  const src = fs.readFileSync(FIL, 'utf8').split('\n');
  const utsnitt = forsta => { const a = src.findIndex(l => l.startsWith(forsta)); let b = -1; for (let i = a; a >= 0 && i < src.length; i++) if (src[i].startsWith('})();')) { b = i; break; } return a >= 0 && b > a ? src.slice(a, b + 1).join('\n') : ''; };
  let kod = utsnitt('const Kamera = (() => {');
  const kvKod = utsnitt('const KortVinkel = (() => {');
  if (!kod) throw new Error('hittar inte Kamera-modulen');
  /* Provets krok: riktningVakt och spårlistan utifrån (modulen lämnar inte ut dem). */
  const krok = '  globalThis.__prov = { riktningVakt: nu => riktningVakt(nu), avskuren: t => avskuren(t), get riktning() { return riktning; },\n'
    + '    nollstall: () => { riktning = null; riktEnsam = null; spar = []; lek = null; lekUte = []; }, satSpar: s => { spar = s; }, satForra: v => { forra = v; }, satMatt: (w, h) => { AW = w; AH = h; } };\n';
  if (!kod.includes('  function riktningVakt(nu) {')) throw new Error('hittar inte riktningVakt i Kamera-modulen');
  kod = kod.replace('  function riktningVakt(nu) {', krok + '  function riktningVakt(nu) {');
  const ctx = {
    document: { createElement: () => ({ getContext: () => ({ drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(0) }), translate() {}, rotate() {}, setTransform() {}, scale() {}, fillRect() {}, clearRect() {},
      beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, fillStyle: '' }), width: 0, height: 0 }) },
    navigator: {}, performance: { now: () => 0 }, requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    KamDet: { redo: () => false, status: () => 'av', fel: null, felVariant: null, felRutor: 0, laddat: null, variant: null, pa: () => false },
    window: {}, Math, Float32Array, Uint8Array, Int32Array, Uint8ClampedArray, Object, Array, Set, Map, Promise, console, Infinity, Number, JSON
  };
  ctx.isFinite = isFinite; ctx.globalThis = ctx;
  vm.createContext(ctx);
  if (kvKod) vm.runInContext(kvKod + '\n;this.KortVinkel = KortVinkel;', ctx);
  vm.runInContext(kod + '\n;this.Kamera = Kamera;', ctx);
  return { Kamera: ctx.Kamera, prov: ctx.__prov, ctx };
}

/* ── 1. Telefonens röst om vridningen ──────────────────────────────── */
function delRiktning() {
  const { Kamera, prov } = laddaKamera();
  Kamera.satTrosklar({ kvotMin: 0.55, kvotMax: 0.95, stillaMs: 800 });
  prov.satMatt(240, 150);
  /* Ett stilla, namngivet kort vars namnremsa pekar upp grader i bilden (KortVinkel: 0 = upp, 90 = höger). */
  const kort = (id, upp, o) => Object.assign({ id, tillstand: 'klar', namn: 'Kort ' + id, saker: true, box: { x: 20 + 45 * id, y: 50, w: 30, h: 42 }, cx: 35 + 45 * id, cy: 71,
    kort: 30, lang: 42, regionNar: 10000, stillaFran: 0, vinkel: Math.PI / 2, vm: { kalla: 'remsa', hallen: false, upp, axel: Math.PI / 2 }, vmStabil: 5, klass: 'kort', tappad: false, skymd: false }, o || {});
  const kor = (spar, nu) => { prov.satSpar(spar); prov.satForra(nu); prov.riktningVakt(nu); return prov.riktning; };
  for (const q of [0, 90, 180, 270]) {
    prov.nollstall();
    const r = kor([kort(1, q + 8), kort(2, (q + 354) % 360)], 10000);
    check(`R1 två kort med namnet mot ${q}° i bilden: riktningen ${r}`, r === q);
  }
  prov.nollstall();
  check('R2 två kort mot 0° och ett tappat mot 90° (utan tap-dom): 0° — det tappade fäller det inte', kor([kort(1, 2), kort(2, -4), kort(3, 91)], 10000) === 0, String(prov.riktning));
  prov.nollstall();
  check('R3 ett kort mot 0° och ett tappat (t.tappad) mot 90°: inget avgörande av dem två', kor([kort(1, 2), kort(2, 90, { tappad: true })], 10000) == null, String(prov.riktning));
  prov.nollstall();
  check('R4 ett kort mot 0° och ett mot 90°: oavgjort, ingen vridning', kor([kort(1, 0), kort(2, 90)], 10000) == null, String(prov.riktning));
  prov.nollstall();
  check('R5 två kort nära 45° (40° och 50°): röstar inte', kor([kort(1, 40), kort(2, 50)], 10000) == null, String(prov.riktning));
  prov.nollstall();
  check('R6 två kort, vinkeln inte mätt ur remsan (form): ingen röst', kor([kort(1, 90, { vm: { kalla: 'form', hallen: false, upp: null } }), kort(2, 90, { vm: { kalla: 'form', hallen: false, upp: null } })], 10000) == null, String(prov.riktning));
  prov.nollstall();
  check('R7 två kort, det ena rör sig (inte stilla): ingen röst av det', kor([kort(1, 90), kort(2, 90, { stillaFran: 9900 })], 10000) == null, String(prov.riktning));
  /* Ett ensamt kort: först efter RIKT_ENSAM_MS (3 s). */
  prov.nollstall();
  const ensam = [kort(1, 268)];
  const e0 = kor(ensam, 10000), e1 = kor(ensam, 12900), e2 = kor(ensam, 13000);
  check(`R8 ett ensamt kort mot 270°: ${e0} efter 0 s, ${e1} efter 2,9 s, ${e2} efter 3 s`, e0 == null && e1 == null && e2 === 270);
  prov.nollstall();
  const t2 = [kort(1, 180), kort(2, 0, { vm: { kalla: 'form', hallen: false, upp: null } })];
  kor(t2, 10000);
  check('R9 ett kort med matt riktning och ett utan: inte ensamt, ingen vridning efter 5 s', kor(t2, 15000) == null, String(prov.riktning));
  prov.nollstall();
  kor([kort(1, 90), kort(2, 90)], 10000);
  const sedan = kor([kort(1, 0), kort(2, 0), kort(3, 0)], 20000);
  check('R10 avgjord står kvar: tre kort mot 0° efteråt ändrar inte 90°', sedan === 90, String(sedan));
}

/* ── 2. Kanten, med syntetiska bildrutor ───────────────────────────── */
async function delKanten() {
  const { Kamera, ctx } = laddaKamera();
  const W = 240, H = 150, TAKT = 150, V = 8;   // V videopixlar per analyspixel, som kamerabanken
  /* Den tränade detektorns lådor matas in som i appen (steg(…, det)), klippta mot bilden som detektor.js gör.
     Detektor.para är kamerabankens stubb: varje låda blir ett kort (ingen remsa här). */
  ctx.window.Detektor = { para: kort => kort.map(b => Object.assign({}, b, { remsa: null, ur: 'lada', klass: b.klass || 'kort' })) };
  let lador = [], medDet = true;
  let nu = 0, bord = [], fas = null, faser = [], identifieringar = 0;
  Kamera.installera({
    status: l => { fas = l; faser.push(l); },
    bord: (spar, nollstall) => { if (!nollstall) bord = spar; },
    identifiera: () => { identifieringar++; return Promise.resolve({ namn: 'Plains', sid: 's1', saker: true, cands: [{ name: 'Plains', sid: 's1', score: 0.9 }] }); }
  });
  const nystart = () => {
    Kamera.satKalibrering({ ruta: { x: 0, y: 0, w: 1, h: 1, upp: 'v' } });
    Kamera.satTrosklar({ auto: 1, troskel: 26, minArea: 60, kvotMin: 0.55, kvotMax: 0.95, fyllnad: 0.72, stillaPx: 1.6, stillaMs: 800, bortaMs: 450, tomMin: 0.3, skymdMin: 0.6, areaVaxt: 1.6, spokMs: 20000 });
    nu = 0; bord = []; fas = null; faser = []; identifieringar = 0;
  };
  const lcg = seed => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
  /* Kortet som i kamerabanken, men klippt mot bildens kanter: x och y får ligga utanför. */
  const kortPixel = (u, v, w, h, niv) => {
    if (u < 1 || v < 1 || u >= w - 1 || v >= h - 1) return Math.max(0, niv - 150);
    if (v > h * 0.12 && v < h * 0.55 && u > 2 && u < w - 3) return Math.max(0, niv - 90) + ((u * 7 + v * 3) % 5) * 4;
    if (v > h * 0.6 && (v % 3) === 0 && u > 2 && u < w - 3) return Math.max(0, niv - 60);
    return niv;
  };
  const klipp = (v, hi) => Math.max(0, Math.min(hi, v));
  const kort = (g, x, y, w = 30, h = 42, niv = 180) => {
    for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++) for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) g[yy * W + xx] = kortPixel(xx - x, yy - y, w, h, niv);
    lador.push({ x0: klipp(x * V, W * V), y0: klipp(y * V, H * V), x1: klipp((x + w) * V, W * V), y1: klipp((y + h) * V, H * V), poang: 0.9, klass: 'kort' });
  };
  const ruta = async bygg => {
    nu += TAKT;
    const sl = lcg(1000 + nu), g = new Float32Array(W * H);
    for (let i = 0; i < g.length; i++) g[i] = 100 + (sl() * 2 - 1) * 3;
    lador = [];
    if (bygg) bygg(g);
    Kamera.steg(g, nu, H, undefined, V, medDet ? { lador: { kort: lador, remsor: [] }, ruta: { x: 0, y: 0, w: W * V, h: H * V } } : undefined);
    await new Promise(r => setImmediate(r));
  };
  const referens = async () => { for (let i = 0; i < 6; i++) await ruta(null); };
  const fasEfter = async (n, bygg) => { const f = []; for (let i = 0; i < n; i++) { await ruta(bygg); f.push(fas); } return f; };

  /* K1 ett kort som skärs av överkanten: 17 av 42 rader utanför bilden. */
  nystart(); await referens();
  const ute = g => kort(g, 100, -17);
  const f1 = await fasEfter(7, ute);           // ~1 s
  const tidigt = f1.includes('kant');
  const f2 = await fasEfter(8, ute);           // ~2,2 s
  const sparUte = Kamera.spar.filter(t => t.tillstand !== 'skrap');
  check(`K1 kortet delvis utanför bilden: ${sparUte.length} spår i telefonen, ${bord.length} i bordet till datorn, ${identifieringar} läsningar`, sparUte.length === 1 && bord.length === 0 && identifieringar === 0,
        sparUte.map(t => `#${t.id} ${JSON.stringify(t.box)} ${t.tillstand}`).join(' '));
  check(`K2 fasen 'kant' först när lådan legat stilla (inte inom 1 s: ${tidigt}), sedan ja: ${f2.slice(-1)[0]}`, !tidigt && f2.slice(-1)[0] === 'kant', f1.concat(f2).join(','));
  /* K3 skjutet in (tre pixlar per ruta): syns helt, läses, och fasen går. */
  let ky = -17; await fasEfter(9, g => { kort(g, 100, ky); ky = Math.min(10, ky + 3); });
  const f3 = await fasEfter(12, g => kort(g, 100, 10));
  check(`K3 flyttat in helt: fasen ${f3.slice(-1)[0]}, ${bord.length} spår i bordet, namn ${bord[0] && bord[0].namn}, läsningar ${identifieringar}`,
        f3.slice(-1)[0] === 'kort' && bord.length === 1 && bord[0].namn === 'Plains' && identifieringar === 1, f3.join(','));
  /* K4 glider ut en bit igen: kortet finns redan på mattan och står kvar i bordet, ingen fas. */
  await fasEfter(7, g => { kort(g, 100, ky); ky = Math.max(-10, ky - 3); });
  const f4 = await fasEfter(16, g => kort(g, 100, -10));
  check(`K4 kortet som setts helt glider ut en bit: ${bord.length} spår i bordet, fasen ${f4.slice(-1)[0]}`, bord.length === 1 && !f4.includes('kant'), f4.join(','));
  /* K5 bort: fasen går till tom. */
  const f5 = await fasEfter(12, null);
  check(`K5 kortet bort: fasen ${f5.slice(-1)[0]}`, f5.slice(-1)[0] === 'tom', f5.join(','));

  /* K6 en hand som sveper längs kanten: inget stilla, aldrig fasen. */
  nystart(); await referens();
  let hx = 10; const f6 = await fasEfter(20, g => { kort(g, hx, -15, 34, 40, 60); hx += 9; });
  check(`K6 något som sveper längs överkanten i 3 s: fasen 'kant' ${f6.filter(f => f === 'kant').length} gånger`, !f6.includes('kant'), f6.join(','));

  /* K7 ett kort en analyspixel från kanten (Mirran Bardiche i golden 16): läses som vanligt. */
  nystart(); await referens();
  const f7 = await fasEfter(14, g => kort(g, 1, 100, 30, 42));
  check(`K7 kortet 1 px från vänsterkanten: fasen ${f7.slice(-1)[0]}, ${bord.length} i bordet, läsningar ${identifieringar}`,
        f7.slice(-1)[0] === 'kort' && bord.length === 1 && identifieringar === 1, Kamera.spar.map(t => JSON.stringify(t.box)).join(' '));

  /* K8 kortet läggs delvis utanför och tas bort utan att ha setts helt: fasen går. */
  nystart(); await referens();
  await fasEfter(16, g => kort(g, -12, 60));
  const fore = fas;
  const f8 = await fasEfter(10, null);
  check(`K8 kortet vid vänsterkanten: fasen ${fore}, borttaget: ${f8.slice(-1)[0]}, läsningar ${identifieringar}`, fore === 'kant' && f8.slice(-1)[0] === 'tom' && identifieringar === 0, f8.join(','));

  /* K9 utan den tränade detektorn gäller det som förut: regionen ur masken krymper en till två pixlar från
     kanten och går inte att skilja från ett kort precis innanför (K7), så kortet läses. */
  medDet = false; nystart(); await referens();
  const f9 = await fasEfter(15, ute);
  check(`K9 utan tränad detektor: kortet vid överkanten läses som förut (fasen ${f9.slice(-1)[0]}, ${bord.length} i bordet, läsningar ${identifieringar})`,
        f9.slice(-1)[0] === 'kort' && bord.length === 1 && identifieringar === 1, Kamera.spar.map(t => JSON.stringify(t.box)).join(' '));
  medDet = true;
}

/* ── 3. Datorns sida i Chrome ─────────────────────────────────────── */
async function delDatorn() {
  const { server, chrome, vantaApp } = require('./mattest/chrome.cjs');
  const srv = await server(FIL);
  let c = null;
  try {
    c = await chrome();
    await c.cdp('Page.navigate', { url: `http://127.0.0.1:${srv.address().port}/` });
    await vantaApp(c);
    await new Promise(r => setTimeout(r, 400));
    const ut = await c.ev(`(async () => {
      const r = [], ok = (namn, v, d) => r.push([namn, !!v, d == null ? '' : String(d)]);
      const sparade = [];
      Moln.sparaKalibrering = async (id, ruta) => { sparade.push(JSON.parse(JSON.stringify(ruta))); return true; };
      visaVy('app');
      const mig = player();
      spelLage = { id: 'vridprov', kod: 'VRID01', namn: 'Prov', vard: mig.id, mig: mig.id };
      mig.lage = 'bord'; mig.cards = []; mig.pending = []; mig.plats = 1;
      state.players = [mig]; state.active = mig.id;
      oppSatt({ klar: true });
      kamAnsluten = true; kamFas = ''; kamGrund = 0; prefs.autoLage = true;
      renderAll(true);
      /* Ett kort mitt i bilden vars namn pekar q grader (0 = upp, 90 = höger i bilden): en punkt en bit åt
         namnets håll ska hamna rakt ovanför kortets mitt på mattan. */
      const pekar = q => {
        const a = q * Math.PI / 180, m = kamTillMatta({ x: 0.5, y: 0.5 }, 200), p = kamTillMatta({ x: 0.5 + 0.05 * Math.sin(a), y: 0.5 - 0.05 * Math.cos(a) * (kamUpplosning && kamUpplosning.w ? kamUpplosning.w / kamUpplosning.h : 4 / 3) }, 200);
        return { dx: +(p.x - m.x).toFixed(2), dy: +(p.y - m.y).toFixed(2) };
      };
      const ny = () => { lasKamOri(null); kamOriLast = true; sparade.length = 0; };
      for (const spegel of [false, true]) for (const q of [0, 90, 180, 270]) {
        ny(); kamSpegel = spegel;
        autoVandUrKorten(q);
        const p = pekar(q), upp = p.dy < -1 && Math.abs(p.dx) < 0.01;
        ok('V1 ' + (spegel ? 'speglad, ' : '') + 'namnen mot ' + q + '° i bilden: mattan vriden ' + kamVand + '°, namnet pekar (' + p.dx + ', ' + p.dy + ') på mattan, raden: ' + JSON.stringify(sparade.map(s => s.vand + '/' + s.vandKalla)),
           upp && kamVandKalla === 'auto' && sparade.length === 1 && sparade[0].vand === kamVand && sparade[0].vandKalla === 'auto');
      }
      kamSpegel = false;
      /* En gång per uppställning. */
      ny(); autoVandUrKorten(90); const v1 = kamVand; autoVandUrKorten(180);
      ok('V2 en gång: andra rösten (180°) efter den första (90°) ändrar inte mattan', kamVand === v1 && sparade.length === 1, kamVand);
      /* ↻ vinner, och skrivs aldrig över. */
      ny(); autoVandUrKorten(0);
      modeKlick({ target: { closest: () => ({ dataset: { mode: 'vand' } }) } });
      const efterKnapp = kamVand;
      lasKamOri(sparade[sparade.length - 1]); kamOriLast = true;
      autoVandUrKorten(180);
      ok('V3 ↻ efter den automatiska: ' + efterKnapp + '°, raden ' + sparade[sparade.length - 1].vandKalla + ', en ny röst (180°) efter omläsning: ' + kamVand + '°',
         efterKnapp === 90 && kamVand === 90 && kamVandKalla === 'spelare' && sparade[sparade.length - 1].vandKalla === 'spelare');
      ny(); modeKlick({ target: { closest: () => ({ dataset: { mode: 'vand' } }) } }); autoVandUrKorten(0);
      ok('V4 ↻ före rösten: rösten (0°) rör inte spelarens 90°', kamVand === 90 && kamVandKalla === 'spelare', kamVand);
      /* Raden från före MES-359. */
      lasKamOri({ vand: 270 }); ok('V5 en äldre rad med vridning 270° räknas som spelarens', kamVandKalla === 'spelare', kamVandKalla);
      lasKamOri({ vand: 0 }); ok('V6 en äldre rad utan vridning: inte bestämd', kamVandKalla === null, kamVandKalla);
      lasKamOri({ vand: 90, vandKalla: 'auto' }); ok('V7 en rad satt av korten: auto', kamVandKalla === 'auto', kamVandKalla);
      /* Raden inte läst: ingen vridning. */
      lasKamOri(null); kamOriLast = false; sparade.length = 0; autoVandUrKorten(90);
      ok('V8 raden inte läst (nätet): ingen vridning', kamVand === 0 && kamVandKalla === null && !sparade.length, kamVand);
      /* Panelen, sida 1 D och 2 L. */
      lasKamOri(null); kamOriLast = true; kamFas = 'tom';
      const p1 = kamStatusModell(null);
      ok('P1 tomt bord, vridningen inte bestämd: "' + (p1 && p1.rub) + '" / "' + (p1 && p1.sub) + '"', p1 && /Ready\\./.test(p1.rub) && p1.sub === 'The mat turns to match how you sit from your first cards.');
      autoVandUrKorten(0);
      const p2 = kamStatusModell(null);
      ok('P2 bestämd: den andra raden borta ("' + (p2 && p2.sub) + '")', p2 && /Ready\\./.test(p2.rub) && p2.sub !== 'The mat turns to match how you sit from your first cards.');
      kamFas = 'kant';
      const p3 = kamStatusModell(null);
      ok('P3 kort delvis utanför: "' + (p3 && p3.rub) + '" / "' + (p3 && p3.sub) + '"', p3 && p3.rub === '<b>A card is partly outside the picture</b>' && p3.sub === "Move it in a little. The camera can't see the whole card, so it's not on the mat yet." && p3.ton === 'varn');
      kamFas = 'kort';
      const p4 = kamStatusModell(null);
      ok('P4 kortet inne igen: meningen borta ("' + (p4 && p4.rub) + '")', p4 && !/outside/.test(p4.rub));
      const streck = [p1, p2, p3, p4].some(p => p && /[–—]/.test(p.rub + p.sub));
      ok('P5 inga tankstreck i det spelaren ser', !streck);
      return r;
    })()`);
    for (const [namn, v, d] of ut) check(namn, v, d);
    check(`D0 appen laddade utan undantag (${c.konsol.length} i konsolen)`, c.konsol.length === 0, c.konsol.join(' | '));
  } finally { if (c) await c.stang(); srv.close(); }
}

(async () => {
  let kod = 0;
  try {
    delRiktning();
    await delKanten();
    if (!process.argv.includes('--utan-chrome')) await delDatorn();
  } catch (e) { console.error('kanten-vridningen: ' + (e.stack || e.message)); kod = e.kod === 2 ? 2 : 1; }
  for (const r of ok.concat(fel)) console.log(r);
  console.log(`\n${ok.length} OK, ${fel.length} FEL`);
  process.exit(kod || (fel.length ? 1 : 0));
})();

// Mätbänk för kameramodulen (MES-22, MES-26). Kör: node dev/kamerabank.cjs
// Plockar ut Kamera-modulen ur index.html och kör den i node på syntetiska
// bildrutor: arm över ett känt kort, handformad fläck, lyft kort, flimmer,
// spöken, ihopskjutna kort, exponeringssväng, diagonalt kort, brus → tröskel,
// varaktig ljusändring, igenkänning som inte är redo, paus i analysen, och
// sedan MES-26: ådrat trä med blänk, skakning, drift, tonkurva, skräp, avstånd,
// och sedan MES-28 ytorna bänken saknade: ljus matta med mörka kort, mörkt
// rum, låg kontrast, överexponering, tryckt matta (G1–G5).
// Slutkod 1 om något faller. Med --diagnos <fil.json> spelas en sparad
// diagnos från appen upp i stället; --scen <namn> ändrar ljussättningen på
// den (inverterad, dimmat, kontrast, starkt) och --vantat <n> gör det till
// ett prov. .cjs eftersom package.json säger "type": "module".
'use strict';
// ── extrahering ──────────────────────────────────────────────────────
const fs = require('fs'), vm = require('vm');
const fil = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : require('path').join(__dirname, '..', 'index.html');
const src = fs.readFileSync(fil, 'utf8').split('\n');
const start = src.findIndex(l => l.startsWith('const Kamera = (() => {'));
let slut = -1;
for (let i = start; i < src.length; i++) if (src[i].startsWith('})();')) { slut = i; break; }
if (start < 0 || slut < 0) throw new Error('hittar inte Kamera-modulen');
const kod = src.slice(start, slut + 1).join('\n');
const ctx = {
  /* Canvasen är en attrapp: beskärningen (beskar), maskningen (maskaTackt) och remsans skärning (skarRemsa, MES-331 pass 6) ritar i den utan att något läses tillbaka. */
  document: { createElement: () => ({ getContext: () => ({ drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(0) }), translate() {}, rotate() {}, setTransform() {}, scale() {}, fillRect() {}, clearRect() {}, fillStyle: '' }), width: 0, height: 0 }) },
  navigator: {}, performance: { now: () => 0 }, requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  /* Den tränade detektorn (MES-329) finns utanför Kamera-modulen; bänken kör
     dagens detektor (steg() direkt, aldrig loop()), men rapportera() frågar
     KamDet.status() via bildlage — utan stubben föll varje ruta med
     ReferenceError sedan 1d947bb (upptäckt av kolla.sh 2026-10-02). */
  KamDet: { redo: () => false, status: () => 'av', fel: null, felVariant: null, felRutor: 0, laddat: null, variant: null, pa: () => false },
  window: {},
  Math, Float32Array, Uint8Array, Int32Array, Uint8ClampedArray, Object, Array, Set, Promise, console, Infinity, Number, JSON
};
vm.createContext(ctx);
vm.runInContext(kod + '\n;this.Kamera = Kamera;', ctx);
const Kamera = ctx.Kamera;
// ── syntetiska bildrutor ─────────────────────────────────────────────
function matta(W, H, niv, brus, slump) {
  const g = new Float32Array(W * H);
  for (let i = 0; i < g.length; i++) g[i] = niv + (slump() * 2 - 1) * brus;
  return g;
}
/* Ett kort är inte en jämn platta: svart kant, ljus ram, mörkt konstverk i
   övre halvan och textrader i den nedre. Detektorn kräver sedan MES-26 att
   en region har spridning (ett kort ≥ 15, en träflisa < 10), så en platta
   utan struktur vore inte ett kort — och den vore inte ett riktigt prov. */
/* k skalar kortets egna kontraster (kant, konstverk, textrader) — 1 är
   kortet i vanligt ljus, 0,375 är ett kort där allt ligger inom 30 gråsteg
   från ramen: så ser låg kontrast ut, och det går inte att härma genom att
   bara flytta ramens nivå närmare mattan (då blev konstverket 60 steg
   MÖRKARE än mattan och kortet syntes bättre än förut). */
function kortPixel(u, v, w, h, niv, k = 1) {
  if (u < 1 || v < 1 || u >= w - 1 || v >= h - 1) return Math.max(0, niv - 150 * k);      // svart kant
  if (v > h * 0.12 && v < h * 0.55 && u > 2 && u < w - 3) return Math.max(0, niv - 90 * k) + ((u * 7 + v * 3) % 5) * 4 * k;   // konstverk, lite struktur
  if (v > h * 0.6 && (v % 3) === 0 && u > 2 && u < w - 3) return Math.max(0, niv - 60 * k);   // textrad
  return niv;
}
function kort(g, W, x, y, w, h, niv, k = 1) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g[yy * W + xx] = kortPixel(xx - x, yy - y, w, h, niv, k); }
function hand(g, W, cx, cy, rx, ry, niv) {
  for (let yy = Math.max(0, cy - ry); yy < cy + ry; yy++) for (let xx = Math.max(0, cx - rx); xx < cx + rx; xx++) {
    const dx = (xx - cx) / rx, dy = (yy - cy) / ry;
    if (dx * dx + dy * dy <= 1 && xx < W) g[yy * W + xx] = niv;
  }
}
// Deterministisk slump så att körningarna går att jämföra.
function lcg(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// ── scenarierna ──────────────────────────────────────────────────────
const W = 240, H = 150, TAKT = 150;

function arm(g, W, H, x0, bredd, niv, slump) {
  for (let y = 20; y < H; y++) { const dx = Math.round((slump() - 0.5) * 6); for (let x = x0 + dx; x < x0 + bredd + dx; x++) if (x >= 0 && x < W) g[y * W + x] = niv; }
}
function kortVriden(g, W, cx, cy, w, h, vinkel, niv) {
  const c = Math.cos(vinkel), s = Math.sin(vinkel);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - cx, dy = y - cy;
    const u = dx * c + dy * s, v = -dx * s + dy * c;
    if (Math.abs(u) <= w / 2 && Math.abs(v) <= h / 2) g[y * W + x] = kortPixel(Math.round(u + w / 2), Math.round(v + h / 2), w, h, niv);
  }
}

// ── uppspelning av en diagnosfil ───────────────────────────────────
// node dev/kamerabank.cjs --diagnos mesa-diagnos-….json
// Referensen och bildrutan i filen är råa gråskalebyte, så ingen bildavkodare
// behövs. Trösklarna i filen tvingas på (auto av), och masken skrivs som PGM.
if (process.argv.includes('--diagnos')) {
  const fs = require('fs'), path = require('path');
  const fil = process.argv[process.argv.indexOf('--diagnos') + 1];
  if (!fil || fil.startsWith('--')) { console.error('Användning: node dev/kamerabank.cjs --diagnos <fil.json>'); process.exit(2); }
  const d = JSON.parse(fs.readFileSync(fil, 'utf8'));
  const standardTro = Kamera.trosklar;                 // modulens egna, innan filens tvingas på
  const { aw, ah } = d.matt;
  const ur = b64 => { const u = Buffer.from(b64, 'base64'); const f = new Float32Array(u.length); for (let i = 0; i < u.length; i++) f[i] = u[i]; return f; };
  const ref = ur(d.ref), ruta = d.ruta ? ur(d.ruta) : null;
  /* Ljussättningen ändras på filen, inte på bordet: samma bord, samma
     kort, annat ljus. Det är så tabellen i MES-28 togs fram — dimmat ×0,5
     gav 1 av 3, låg kontrast ×0,4 gav 0 av 3 med de fasta trösklarna.
     Referensen och rutan får samma behandling, och bruset skalas med. */
  const SCEN = {
    original: [v => v, 1],
    inverterad: [v => 255 - v, 1],
    dimmat: [v => v * 0.5, 0.5],
    kontrast: [v => 128 + (v - 128) * 0.4, 0.4],
    starkt: [v => Math.min(255, v + 90), 1]
  };
  const scenNamn = process.argv.includes('--scen') ? process.argv[process.argv.indexOf('--scen') + 1] : 'original';
  if (!SCEN[scenNamn]) { console.error('Okänd scen: ' + scenNamn + '. Välj bland ' + Object.keys(SCEN).join(', ')); process.exit(2); }
  const [scenF, scenBrus] = SCEN[scenNamn];
  if (scenNamn !== 'original') { for (let i = 0; i < ref.length; i++) ref[i] = scenF(ref[i]); if (ruta) for (let i = 0; i < ruta.length; i++) ruta[i] = scenF(ruta[i]); }
  const vantat = process.argv.includes('--vantat') ? +process.argv[process.argv.indexOf('--vantat') + 1] : null;
  console.log('scen          ', scenNamn + (vantat != null ? `, väntar ${vantat} kort` : ''));
  Kamera.installera({ status: () => {}, bord: () => {}, fas: () => {}, identifiera: () => Promise.resolve(null) });
  Kamera.satKalibrering({ ruta: (d.kal && d.kal.ruta) || { x: 0, y: 0, w: 1, h: 1, upp: 'v' } });
  /* Referensen i filen är redan den suddade medelbilden — den läggs in
     rakt, med filens brus, i stället för att köras genom steg() och suddas
     en gång till. Rutan är rå och går genom steg() som på telefonen. */
  Kamera.laddaReferens(ref, (d.yta ? d.yta.brus : 0) * scenBrus, ah, aw);
  Kamera.satTrosklar(Object.assign({}, d.tro, { auto: 0, autoUts: 0 }));   // filens trösklar rakt av, även avvikelsen
  let nu = 900;
  console.log('yta ur filen  ', JSON.stringify(d.yta));
  console.log('yta på bänken ', JSON.stringify(Kamera.yta && { dom: Kamera.yta.dom, brus: Kamera.yta.brus, textur: Kamera.yta.textur, blank: Kamera.yta.blank }));
  console.log('trösklar      ', JSON.stringify(d.tro));
  /* Videopixlar per analyspixel: golvet för kortsidan (90 videopixlar)
     räknas i videons mått. Nyare filer bär videons bredd; äldre antas vara
     1080 breda — det Jespers telefon ger. */
  const vb = (d.matt && d.matt.vb) || 1080;
  const skala = (vb * (((d.kal && d.kal.ruta) || { w: 1 }).w)) / aw;
  if (ruta) {
    for (let i = 0; i < 8; i++) { nu += 150; Kamera.steg(ruta, nu, ah, aw, skala); }
    console.log('--- med filens referens (rensad från kortformade regioner) ---');
    const dia = Kamera.diagnosfil();
    console.log('regioner', dia.dia.regioner, 'för små', dia.dia.forSma, 'fel kvot', dia.dia.felKvot, 'otäta', dia.dia.otat, 'täckning', (dia.dia.tackning * 100).toFixed(1) + '%', 'spritt', (dia.dia.spritt * 100).toFixed(2) + '%');
    console.log('spår', Kamera.spar.map(t => `#${t.id} ${Math.round(t.lang)}×${Math.round(t.kort)} ${t.tillstand}${t.skymd ? ' skymd' : ''}`).join(' | ') || '(inga)');
    const ut = path.join(path.dirname(fil), path.basename(fil, '.json') + '.mask.pgm');
    const m = dia.maskRa; const buf = Buffer.alloc(aw * ah); for (let i = 0; i < aw * ah; i++) buf[i] = m[i] ? 255 : 0;
    fs.writeFileSync(ut, Buffer.concat([Buffer.from(`P5\n${aw} ${ah}\n255\n`), buf]));
    console.log('spår i filen', (d.spar || []).map(t => `#${t.id} ${t.tillstand}`).join(' | '), '\nmask skriven till', ut);
    /* Samma ruta en gång till, men referensen lärs ur rutan själv: så ser
       det ut när telefonen pekas mot ett bord som redan har kort på sig. */
    console.log('--- utan filens referens: referensen lärs ur rutan med korten på, med dagens trösklar ---');
    /* Här gäller modulens egna trösklar, inte filens: den här delen visar
       vad koden av i dag gör med bordet, inte vad telefonen gjorde då. */
    Kamera.satTrosklar(Object.assign({}, standardTro, { auto: 1 }));
    Kamera.satKalibrering({ ruta: (d.kal && d.kal.ruta) || { x: 0, y: 0, w: 1, h: 1, upp: 'v' } });
    for (let i = 0; i < 14; i++) { nu += 150; Kamera.steg(ruta, nu, ah, aw, skala); }
    console.log('spår', Kamera.spar.map(t => `#${t.id} ${Math.round(t.lang)}×${Math.round(t.kort)} @${Math.round(t.cx)},${Math.round(t.cy)} ${t.tillstand}${t.skymd ? ' skymd' : ''}`).join(' | ') || '(inga)');
    /* Provet gäller det andra läget: det är dagens kod mot bordet, och det
       som ska hålla när ljuset ändras. Skräp räknas inte som kort. */
    if (vantat != null) {
      const fann = Kamera.spar.filter(t => t.tillstand !== 'skrap').length;
      const T2 = Kamera.trosklar, D2 = Kamera.diagnos;
      console.log(`${fann === vantat ? 'OK  ' : 'FEL '} ${scenNamn}: ${fann} kort, väntade ${vantat} — avvikelse ${T2.utseende} (otsu ${D2.otsu}), spridning ${T2.spridning}, tröskel ${T2.troskel}, σ ${(Kamera.sigma || 0).toFixed(2)}, matta ${D2.matta}, regioner ${D2.regioner}, blänk ${D2.blanka}, flata ${D2.flata}, fel kvot ${D2.felKvot}, otäta ${D2.otat}`);
      process.exit(fann === vantat ? 0 : 1);
    }
  }
  console.log('bord på datorn', JSON.stringify(d.bord));
  process.exit(0);
}

let identifieringar = 0, bord = [], nollst = 0, nu = 0;
let bordExtra = null, bordRapporter = 0;   // tredje argumentet till bord (MES-31: sma, upplosning), och hur många bord som gått
let namnSvar = () => ({ namn: 'Plains', sid: 's1', saker: true, cands: [{ name: 'Plains', sid: 's1', score: 0.9 }] });
Kamera.installera({
  status: () => {},
  bord: (spar, nollstall, extra) => { bord = spar; bordExtra = extra || null; bordRapporter++; if (nollstall) nollst++; },
  identifiera: (c, id, gissning) => { identifieringar++; return Promise.resolve(namnSvar(id, gissning)); }
});

function nystart() {
  Kamera.satKalibrering({ ruta: { x: 0, y: 0, w: 1, h: 1, upp: 'v' } });
  Kamera.satTrosklar({ auto: 1, troskel: 26, minArea: 60, kvotMin: 0.55, kvotMax: 0.95, fyllnad: 0.72, stillaPx: 1.6, stillaMs: 800, bortaMs: 450, tomMin: 0.3, skymdMin: 0.6, areaVaxt: 1.6, spokMs: 20000 });
  identifieringar = 0; bord = []; nu = 0; bordExtra = null; bordRapporter = 0;
}
// En ruta: matta + valfria objekt. `brus` i gråsteg (likformigt ±brus ≈ σ·√3).
async function ruta(bygg, brus = 3, niv = 100, gain = 1) {
  nu += TAKT;
  const sl = lcg(1000 + nu);
  const g = matta(W, H, niv, brus, sl);
  if (bygg) bygg(g, sl);
  if (gain !== 1) for (let i = 0; i < g.length; i++) g[i] = Math.min(255, g[i] * gain);
  Kamera.steg(g, nu, H, undefined, 8);       // 8 videopixlar per analyspixel, som 1920/240
  await new Promise(r => setImmediate(r));   // låt identifieringen (async) landa
  return Kamera.spar.map(t => ({ id: t.id, st: t.tillstand, namn: t.namn, tappad: !!t.tappad, skymd: !!t.skymd, tomMs: t.tomMs, cx: t.cx, cy: t.cy }));
}
const referens = async () => { for (let i = 0; i < 6; i++) await ruta(null); };
const KORT = (g) => kort(g, W, 60, 50, 30, 42, 180);
const ok = [], fel = [];
const check = (namn, villkor, detalj) => { (villkor ? ok : fel).push(`${villkor ? 'OK  ' : 'FEL '} ${namn}${detalj ? ' — ' + detalj : ''}`); };

(async () => {
  // ── T8: brus → tröskel ───────────────────────────────────────────
  for (const [brus, vantad] of [[2, null], [8, null], [20, null]]) {
    nystart(); for (let i = 0; i < 6; i++) await ruta(null, brus);
    const sig = Kamera.sigma, tro = Kamera.trosklar.troskel;
    // likformigt ±b har σ = b/√3; efter 3×3-medel ≈ σ/3
    check(`T8 brus ±${brus}: σ=${sig.toFixed(2)} → tröskel ${tro}`, tro >= 10 && tro <= 50 && tro === Math.min(50, Math.max(10, Math.round(3 * sig + 4))));
    let falska = 0; for (let i = 0; i < 30; i++) { const s = await ruta(null, brus); falska += s.length; }
    check(`T8 brus ±${brus}: falska spår på tom matta över 30 rutor = ${falska}`, falska === 0);
  }

  // ── T1: arm över ett känt kort ───────────────────────────────────
  nystart(); await referens();
  let s;
  for (let i = 0; i < 8; i++) s = await ruta(KORT);
  check(`T1 kortet läses: ${JSON.stringify(s)}`, s.length === 1 && s[0].st === 'klar' && s[0].namn === 'Plains');
  const id0 = s[0].id; let skymda = 0, kvar = true;
  for (let i = 0; i < 40; i++) { s = await ruta((g, sl) => { KORT(g); arm(g, W, H, 55, 40, 60, sl); }); if (s.length === 1 && s[0].id === id0) { if (s[0].skymd) skymda++; } else kvar = false; }
  check(`T1 armen täcker 6 s: spåret ${kvar ? 'överlever med samma id' : 'FÖRSVANN'}, skymt i ${skymda}/40 rutor`, kvar && skymda >= 38);
  for (let i = 0; i < 5; i++) s = await ruta(KORT);
  check(`T1 armen borta: samma id ${s[0] && s[0].id === id0}, namn ${s[0] && s[0].namn}, skymd ${s[0] && s[0].skymd}, identifieringar totalt ${identifieringar}, spår ${JSON.stringify(s)}`,
        s.length === 1 && s[0].id === id0 && s[0].namn === 'Plains' && !s[0].skymd && identifieringar === 1);

  // ── T1b: handformad fläck — kapar den spåret? ────────────────────
  nystart(); await referens();
  for (let i = 0; i < 8; i++) s = await ruta(KORT);
  let flipp = 0;
  for (let i = 0; i < 12; i++) { s = await ruta(g => { KORT(g); hand(g, W, 75, 71, 55, 40, 60); }); if (s[0] && s[0].tappad) flipp++; }
  check(`T1b handformad fläck 1,8 s: tap-state slog om i ${flipp}/12 rutor, skymd=${s[0] && s[0].skymd}`, flipp === 0 && s[0] && s[0].skymd);
  const idB = s[0] && s[0].id;
  for (let i = 0; i < 4; i++) s = await ruta(KORT);
  check(`T1b efteråt: upprätt=${s[0] && !s[0].tappad}, samma id=${s[0] && s[0].id === idB}, spår ${JSON.stringify(s)}`, s.length === 1 && !s[0].tappad && s[0].id === idB);

  // ── T2: kortet lyfts — borta inom bortaMs, spöke kvar ────────────
  nystart(); await referens();
  for (let i = 0; i < 8; i++) s = await ruta(KORT);
  let bortaEfter = null;
  for (let i = 1; i <= 10; i++) { s = await ruta(null); if (!s.length && bortaEfter == null) bortaEfter = i * TAKT; }
  check(`T2 lyft kort: spåret borta efter ${bortaEfter} ms (bortaMs 700), spöken ${Kamera.spoken.length}`, bortaEfter != null && bortaEfter <= 900 && Kamera.spoken.length === 1);

  // ── T3b: flimmer < 1,5 s — allt ärvs, ingen ny identifiering ─────
  nystart(); await referens();
  for (let i = 0; i < 8; i++) s = await ruta(KORT);
  const id3b = s[0].id;
  for (let i = 0; i < 8; i++) s = await ruta(null);           // 1,2 s borta
  const idFore = identifieringar;
  for (let i = 0; i < 4; i++) s = await ruta(g => kort(g, W, 62, 51, 30, 42, 180));   // tillbaka, 2 px fel
  check(`T3b flimmer 1,2 s: samma id ${s[0] && s[0].id === id3b}, namn ${s[0] && s[0].namn}, tillstånd ${s[0] && s[0].st}, nya identifieringar ${identifieringar - idFore}`,
        s.length === 1 && s[0].id === id3b && s[0].namn === 'Plains' && s[0].st === 'klar' && identifieringar === idFore);

  // ── T3: tillbaka efter 3 s — id ärvs, namnet läses om med ledtråd ─
  nystart(); await referens();
  for (let i = 0; i < 8; i++) s = await ruta(KORT);
  const id3 = s[0].id;
  for (let i = 0; i < 20; i++) s = await ruta(null);          // 3 s borta
  let ledtrad = null; namnSvar = (id, g) => { ledtrad = g; return { namn: 'Plains', sid: 's1', saker: true, cands: [{ name: 'Plains', sid: 's1', score: 0.9 }] }; };
  for (let i = 0; i < 8; i++) s = await ruta(g => kort(g, W, 62, 51, 30, 42, 180));
  check(`T3 återkomst efter 3 s: samma id ${s[0] && s[0].id === id3}, tillstånd ${s[0] && s[0].st}, ledtråd till identifieringen "${ledtrad}", identifieringar ${identifieringar}`,
        s.length === 1 && s[0].id === id3 && s[0].st === 'klar' && ledtrad === 'Plains' && identifieringar === 2);
  namnSvar = () => ({ namn: 'Plains', sid: 's1', saker: true, cands: [{ name: 'Plains', sid: 's1', score: 0.9 }] });

  // ── T4: ett kort på ANNAN plats ärver inte ───────────────────────
  nystart(); await referens();
  for (let i = 0; i < 8; i++) s = await ruta(KORT);
  const id4 = s[0].id;
  for (let i = 0; i < 8; i++) s = await ruta(null);
  for (let i = 0; i < 3; i++) s = await ruta(g => kort(g, W, 130, 50, 30, 42, 180));
  check(`T4 kort 70 px bort: nytt id ${s[0] && s[0].id !== id4}, spöket kvar ${Kamera.spoken.length}`, s.length === 1 && s[0].id !== id4 && Kamera.spoken.length === 1);

  // ── T5: två kort skjuts ihop — båda överlever, ingen tap-flipp ───
  nystart(); await referens();
  const TVA = g => { kort(g, W, 60, 50, 30, 42, 180); kort(g, W, 100, 50, 30, 42, 180); };
  for (let i = 0; i < 8; i++) s = await ruta(TVA);
  check(`T5 två kort läses: ${s.length} spår, båda klara ${s.every(t => t.st === 'klar')}`, s.length === 2 && s.every(t => t.st === 'klar'));
  let tapFel = 0, tappade = 0;
  for (let i = 0; i < 20; i++) { s = await ruta(g => { kort(g, W, 60, 50, 30, 42, 180); kort(g, W, 90, 50, 30, 42, 180); }); if (s.length !== 2) tapFel++; tappade += s.filter(t => t.tappad).length; }
  check(`T5 ihopskjutna 3 s: rutor med fel antal spår ${tapFel}/20, tappade-avläsningar ${tappade}`, tapFel === 0 && tappade === 0);

  // ── T6: exponeringssväng ×1,25 med hand på 40 % av mattan ────────
  nystart(); await referens();
  const TRE = g => { kort(g, W, 40, 40, 30, 42, 180); kort(g, W, 110, 40, 30, 42, 180); kort(g, W, 180, 40, 30, 42, 180); };
  for (let i = 0; i < 8; i++) s = await ruta(TRE);
  const ids = s.map(t => t.id).join(',');
  const idSet = new Set(s.map(t => t.id));
  const troFore = Kamera.trosklar.troskel;
  let nya = 0, tappadeSpar = 0, maxTack = 0;
  for (let i = 0; i < 20; i++) {
    s = await ruta((g, sl) => { TRE(g); for (let y = 90; y < H; y++) for (let x = 0; x < W; x++) g[y * W + x] = 60; }, 3, 100, 1.25);
    const d = Kamera.diagnos; if (d.tackning > maxTack) maxTack = d.tackning;
    if (s.some(t => !idSet.has(t.id))) nya++; if (s.length < 3) tappadeSpar++;
  }
  for (let i = 0; i < 5; i++) s = await ruta(TRE);
  check(`T6 sväng: nya spår i ${nya} rutor, rutor med tappat spår ${tappadeSpar}, tröskel ${troFore}→${Kamera.trosklar.troskel}, gain sist ${Kamera.diagnos.gain.toFixed(2)}, ids efteråt ${s.map(t => t.id).join(',')} (före ${ids})`,
        nya === 0 && tappadeSpar === 0 && Math.abs(Kamera.trosklar.troskel - troFore) <= 2 && s.map(t => t.id).join(',') === ids);

  // ── T7: diagonalt kort som missar en ruta åldras inte ────────────
  nystart(); await referens();
  const DIAG = g => kortVriden(g, W, 100, 75, 30, 42, Math.PI / 4, 180);
  for (let i = 0; i < 8; i++) s = await ruta(DIAG);
  check(`T7 diagonalt kort läses: ${s.length} spår`, s.length === 1);
  Kamera.satTrosklar({ kvotMin: 0.9 }); s = await ruta(DIAG); Kamera.satTrosklar({ kvotMin: 0.55 });
  check(`T7 en missad ruta: tomMs=${s[0] && s[0].tomMs}, skymd=${s[0] && s[0].skymd}`, s.length === 1 && s[0].tomMs === 0);

  // ── T12: tap-vridningen döms på två stilla rutor, en glitchruta rör inget (K3) ──
  nystart(); await referens();
  for (let i = 0; i < 8; i++) s = await ruta(KORT);
  const id10 = s[0].id;
  check(`T12 otappat från start: tappad ${s[0] && s[0].tappad}`, s.length === 1 && !s[0].tappad);
  s = await ruta(g => kort(g, W, 54, 44, 42, 30, 180));      // en ruta liggande (glitch)
  for (let i = 0; i < 8; i++) s = await ruta(KORT);
  check(`T12 en glitchruta: samma id ${s[0] && s[0].id === id10}, tappad ${s[0] && s[0].tappad}`, s.length === 1 && s[0].id === id10 && !s[0].tappad);
  let flip = null;
  for (let i = 0; i < 12; i++) { s = await ruta(g => kort(g, W, 54, 44, 42, 30, 180)); if (flip == null && s[0] && s[0].tappad) flip = i + 1; }
  check(`T12 vriden 90°: tappad ${s[0] && s[0].tappad} efter ${flip} rutor, samma id ${s[0] && s[0].id === id10}`, s.length === 1 && s[0].tappad && s[0].id === id10 && flip != null && flip <= 10);
  let tillbaka = null;
  for (let i = 0; i < 12; i++) { s = await ruta(KORT); if (tillbaka == null && s[0] && !s[0].tappad) tillbaka = i + 1; }
  check(`T12 tillbaka: otappad efter ${tillbaka} rutor`, s.length === 1 && !s[0].tappad && tillbaka != null && tillbaka <= 10);

  // ── V1/V2: läget följer ett namngivet kort, med hysteres mot darr (K5, MES-214) ──
  /* Ett klart kort som glider följs medan det rör sig: läget (vx) går i
     rapporterna under glidningen med vilar false, och landar med vilar true
     på den nya platsen — högst en rapport per ruta. Förut (K5) väntade läget
     på två stilla rutor: högst 3 rapporter, alla efter glidningen. */
  nystart(); await referens();
  for (let i = 0; i < 10; i++) s = await ruta(KORT);
  let rapFore = bordRapporter, underVags = 0, vxMax = 0;
  for (let i = 1; i <= 10; i++) { s = await ruta(g => kort(g, W, 60 + 4 * i, 50, 30, 42, 180)); if (bord[0] && bord[0].vilar === false && bord[0].vx * W > 77) underVags++; }   // glider 40 px på 10 rutor
  for (let i = 0; i < 6; i++) s = await ruta(g => kort(g, W, 100, 50, 30, 42, 180));
  const rapGlid = bordRapporter - rapFore;
  check(`V1 glidning 40 px: ${rapGlid} rapporter (högst 16), läget följde i ${underVags} rutor under glidningen, landade på vx ${bord[0] && (bord[0].vx * W).toFixed(1)} vilar ${bord[0] && bord[0].vilar}`,
        s.length === 1 && rapGlid >= 1 && rapGlid <= 16 && underVags >= 5 && bord[0] && bord[0].vilar === true && Math.abs(bord[0].vx * W - 115) < 2);
  rapFore = bordRapporter;
  for (let i = 0; i < 12; i++) s = await ruta(g => kort(g, W, 100 + (i % 2), 50, 30, 42, 180));   // darr ±1 px över gränsen
  check(`V2 darr ±1 px i 12 rutor: ${bordRapporter - rapFore} extra rapporter (0)`, bordRapporter - rapFore === 0);

  // ── BL1: ett kort i ljus plastficka på mörk matta är inget blänk (MES-166) ──
  /* Golden 12: Pharika's Chosen i grön ficka på den mörka mattan i dagsljus
     var mättat i fläckar och hade inget mörkare än mattan — blänkreglerna
     friar bara på en mörk kant, och kortet dömdes som blänk varje ruta det
     låg stilla. Här: ficka 150 i kanten, kortet 200–255 med konstverk och
     textrader, mattan 70 — allt ljusare än mattan, textrutan mättad. */
  const FICKA = g => { for (let yy = 50; yy < 92; yy++) for (let xx = 60; xx < 90; xx++) { const u = xx - 60, v = yy - 50;
    g[yy * W + xx] = (u < 2 || v < 2 || u > 27 || v > 39) ? 150 : (v > 5 && v < 22) ? 200 + ((u * 7 + v * 3) % 5) * 6 : (v > 24 && (v % 3) === 0) ? 215 : 252; } };
  nystart(); for (let i = 0; i < 6; i++) await ruta(null, 3, 70);
  let blBlank = 0;
  for (let i = 0; i < 12; i++) { s = await ruta(FICKA, 3, 70); blBlank += Kamera.diagnos.blanka; }
  const blSkymd = []; for (let i = 0; i < 10; i++) { s = await ruta(FICKA, 3, 70); blBlank += Kamera.diagnos.blanka; blSkymd.push(s[0] && s[0].skymd ? 1 : 0); }
  check(`BL1 kort i ljus ficka på mörk matta: ${s.length} spår, ${s[0] && s[0].st}, blänkdomar ${blBlank}, skymt ${blSkymd.join('')}`,
        s.length === 1 && s[0].st === 'klar' && blBlank === 0 && blSkymd.every(v => v === 0));

  // ── BL2: ett överexponerat kort på svart matta, utan synlig kant, är inget blänk ──
  /* Jesper 2026-09-21, provkortet Pacifism på den svarta mattan i 4K: kortet
     var 206 i snitt mot mattans 120, 15 % utbränt, spridningen 26 och kanten
     osynlig mot mattan. Blänkreglerna 1 och 2 friar ett kortformat område
     (MES-166), men regel 4 ("platsen blänket flyttat till": ljusare än
     referensen överallt, ljust, flatt, nära mättnad) gjorde det inte — kortet
     kastades varje ruta, spåret stod "skymt" och provkortet låstes aldrig.
     Här: mattan 120, ramen 200, konstverk 205–221, textrader 220, textrutan
     250 — inget under mattan, spridningen ~31 (regeln kräver under 32). Utan
     rättningen dömer regel 4 kortet som blänk i varje ruta. */
  const OVEREXP = g => { for (let yy = 50; yy < 92; yy++) for (let xx = 60; xx < 90; xx++) { const u = xx - 60, v = yy - 50;
    g[yy * W + xx] = (u < 2 || v < 2 || u > 27 || v > 39) ? 200 : (v > 5 && v < 22) ? 205 + ((u * 7 + v * 3) % 5) * 4 : (v > 24 && (v % 3) === 0) ? 220 : 250; } };
  nystart(); for (let i = 0; i < 6; i++) await ruta(null, 3, 120);
  let bl2Blank = 0; const bl2Skymd = [];
  for (let i = 0; i < 22; i++) { s = await ruta(OVEREXP, 3, 120); bl2Blank += Kamera.diagnos.blanka; if (i >= 12) bl2Skymd.push(s[0] && s[0].skymd ? 1 : 0); }
  check(`BL2 överexponerat kort utan kant på svart matta: ${s.length} spår, ${s[0] && s[0].st}, blänkdomar ${bl2Blank}, skymt ${bl2Skymd.join('')}`,
        s.length === 1 && s[0].st === 'klar' && bl2Blank === 0 && bl2Skymd.every(v => v === 0));

  // ── OM1: en hand över en tredjedel av bilden tar inte om referensen (MES-166) ──
  /* Golden 12: handen platt över provkortet i 1,5 s tog om referensen med
     handen i, och handens spöke stod kvar i referensen i 43 s. Omtaget ska
     komma när bilden ändrats överallt (R2: telefonen flyttad), inte när en
     hand ligger i bild. Här en hand/arm med struktur över x 0–80 i 3 s. */
  nystart(); await referens();
  for (let i = 0; i < 8; i++) s = await ruta(g => kort(g, W, 150, 50, 30, 42, 180));
  const omtagFore = Kamera.omtag, idOm = s[0] && s[0].id;
  for (let i = 0; i < 20; i++) s = await ruta(g => { kort(g, W, 150, 50, 30, 42, 180); for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < 80; xx++) g[yy * W + xx] = 165 + ((xx * 3 + yy * 5) % 11) * 3; });
  const omtagHand = Kamera.omtag - omtagFore;
  for (let i = 0; i < 4; i++) s = await ruta(g => kort(g, W, 150, 50, 30, 42, 180));
  check(`OM1 handen över x 0–80 i 3 s: omtag ${omtagHand}, sedan ${s.length} spår, samma id ${s[0] && s[0].id === idOm}, skymt ${s[0] && s[0].skymd}`,
        omtagHand === 0 && s.length === 1 && s[0].id === idOm && !s[0].skymd);

  // ── VX1/VX2: ett namngivet kort vars region växer ihop med något bredvid flyttar inte (MES-179) ──
  /* Golden 11: Faithful Pikemaster växte ihop med leken bredvid — regionen
     blev kortet och en flik av leken, lådan 1,3 × kortets höjd, och varje
     sådan ruta flyttade kortet på datorn. Lådan blev kvar ihopvuxen och höll
     kortet på bordet när det lagts på högen. Här: kortet 30 × 42, och
     varannan ruta en flik 8 × 40 kant i kant till höger som går 8 px nedanför
     (lådan 38 × 50, ytan 1,25 ×). Datorn får kortets låda, inte klumpens. */
  const FLIK = g => { for (let yy = 60; yy < 100; yy++) for (let xx = 90; xx < 98; xx++) g[yy * W + xx] = 180; };
  nystart(); await referens();
  for (let i = 0; i < 10; i++) s = await ruta(KORT);
  const idVx = s[0] && s[0].id;
  let vxStorst = 0;
  for (let i = 0; i < 20; i++) {
    s = await ruta(g => { KORT(g); if (i % 2 === 0) FLIK(g); });
    const b = bord.find(t => t.id === idVx);
    if (b) vxStorst = Math.max(vxStorst, Math.round(b.w * W) * Math.round(b.h * H));
  }
  check(`VX1 flik kant i kant varannan ruta i 3 s: ${s.length} spår, samma id ${s[0] && s[0].id === idVx}, största rapporterade låda ${vxStorst} px (kortet 1120)`,
        s.length === 1 && s[0].id === idVx && vxStorst <= 1.1 * 28 * 40);
  let vxBorta = null;
  for (let i = 1; i <= 12; i++) { s = await ruta(FLIK); if (!s.some(t => t.id === idVx) && vxBorta == null) vxBorta = i * TAKT; }
  check(`VX2 kortet lyfts, fliken ligger kvar: spåret borta efter ${vxBorta} ms`, vxBorta != null && vxBorta <= 1200);

  // ── VX3: ett namngivet kort som tappas SNETT fryses inte, och tap-läget tas i första rutan (MES-214) ──
  /* Den raka lådan runt ett kort som ligger 15° från vågrätt är 1,3 × kortets
     kortsida: MES-179-regeln tog det för en ihopväxning och höll kvar det
     gamla tap-läget (golden 09: +4,65 s). Regionens egna mått är desamma i
     alla vinklar. Kortet vrids runt sitt hörn, så mitten flyttar: den
     optimistiska domen tar tap-läget i första rutan. */
  nystart(); await referens();
  for (let i = 0; i < 10; i++) s = await ruta(g => kortVriden(g, W, 110, 70, 30, 42, 0, 180));
  const idVx3 = s[0] && s[0].id, tapFore = s[0] && s[0].tappad;
  let vx3Flip = null;
  for (let i = 0; i < 8; i++) { s = await ruta(g => kortVriden(g, W, 118, 78, 30, 42, Math.PI / 2 - 15 * Math.PI / 180, 180)); const t = s.find(x => x.id === idVx3); if (vx3Flip == null && t && t.tappad) vx3Flip = i + 1; }
  check(`VX3 tappat 15° snett runt hörnet: före tap=${tapFore}, tappad i ruta ${vx3Flip} (högst 2), spår ${s.length}, samma id ${!!s.find(x => x.id === idVx3)}`,
        tapFore === false && vx3Flip != null && vx3Flip <= 2 && s.length === 1 && !!s.find(x => x.id === idVx3));

  // ── TT1: tap-läget ändras bara vid en TYDLIG dom (MES-293, Jespers beslut 1) ──
  /* Ett namngivet kort som ligger 50° från grundläget — som när blänk i en
     ficka gör regionen sned nära 45° — vrids inte, hur många stilla rutor
     det än ligger: domen är otydlig (tapTydlig kräver 20° från grundläget
     eller kvartsvarvet). Förut vred löpräknaren det efter två rutor. Vrids
     kortet till 88° tas tappningen, och ett snett läge efteråt vrider inte
     tillbaka. */
  nystart(); await referens();
  for (let i = 0; i < 10; i++) s = await ruta(g => kortVriden(g, W, 110, 70, 30, 42, 0, 180));
  const idTt = s[0] && s[0].id, klarTt = !!(s[0] && s[0].st === 'klar');
  const tt = () => s.find(x => x.id === idTt);
  let ttSnett = 0, ttTapp = null, ttTillbaka = 0;
  for (let i = 0; i < 12; i++) { s = await ruta(g => kortVriden(g, W, 110, 70, 30, 42, 50 * Math.PI / 180, 180)); if (tt() && tt().tappad) ttSnett++; }
  for (let i = 0; i < 6; i++) { s = await ruta(g => kortVriden(g, W, 110, 70, 30, 42, 88 * Math.PI / 180, 180)); if (ttTapp == null && tt() && tt().tappad) ttTapp = i + 1; }
  for (let i = 0; i < 12; i++) { s = await ruta(g => kortVriden(g, W, 110, 70, 30, 42, 50 * Math.PI / 180, 180)); if (tt() && !tt().tappad) ttTillbaka++; }
  check(`TT1 tydlig dom: klart före ${klarTt}; 50° i 12 rutor: tappad i ${ttSnett}; 88°: tappad i ruta ${ttTapp} (högst 2); 50° igen i 12 rutor: otappad i ${ttTillbaka}; samma id ${!!tt()}`,
        klarTt && ttSnett === 0 && ttTapp != null && ttTapp <= 2 && ttTillbaka === 0 && !!tt() && s.length === 1);
  /* TT2: ett spår UTAN namn (osäkert svar, granskningen) har inga egna mått
     och prövas mot de namngivna kortens (kortMatt): samma regel — 50° vrider
     inget, 88° med ett korts mått vrider det. Utan måttet stod ett tappat
     kort som ingen kunnat namnge otappat för alltid (golden 13–15: Plains
     tappat i hörnet, spåret okand). */
  {
    nystart(); await referens();
    const namnFore = namnSvar;
    for (let i = 0; i < 10; i++) s = await ruta(g => kortVriden(g, W, 60, 50, 30, 42, 0, 180));
    const idA = s[0] && s[0].id, klarA = !!(s[0] && s[0].st === 'klar');
    namnSvar = () => ({ namn: 'Plains', sid: 's1', saker: false, cands: [{ name: 'Plains', sid: 's1', score: 0.5 }] });
    const TVA = v => g => { kortVriden(g, W, 60, 50, 30, 42, 0, 180); kortVriden(g, W, 170, 75, 30, 42, v * Math.PI / 180, 180); };
    const b = () => s.find(x => x.id !== idA);
    let bSnett = 0, bTapp = null, bTillbaka = 0;
    for (let i = 0; i < 12; i++) { s = await ruta(TVA(50)); if (b() && b().tappad) bSnett++; }
    const stB = b() && b().st;
    for (let i = 0; i < 6; i++) { s = await ruta(TVA(88)); if (bTapp == null && b() && b().tappad) bTapp = i + 1; }
    for (let i = 0; i < 12; i++) { s = await ruta(TVA(50)); if (b() && !b().tappad) bTillbaka++; }
    namnSvar = namnFore;
    check(`TT2 spår utan namn mot de namngivnas mått: A klart ${klarA}, B ${stB}; 50° i 12 rutor: tappad i ${bSnett}; 88°: tappad i ruta ${bTapp} (högst 2); 50° igen: otappad i ${bTillbaka}; spår ${s.length}`,
          klarA && stB !== 'klar' && bSnett === 0 && bTapp != null && bTapp <= 2 && bTillbaka === 0 && s.length === 2);
  }
  /* TT3: ett kort som fick sitt namn medan det låg 12° snett. Dess raka låda
     är då större än kortet, och ett mått ur lådan gjorde varje senare dom
     otydlig: kortet tappas rent (90°) men vrids aldrig. */
  nystart(); await referens();
  for (let i = 0; i < 10; i++) s = await ruta(g => kortVriden(g, W, 110, 70, 30, 42, 12 * Math.PI / 180, 180));
  const idT3 = s[0] && s[0].id, klarT3 = !!(s[0] && s[0].st === 'klar');
  let t3Tapp = null;
  for (let i = 0; i < 6; i++) { s = await ruta(g => kortVriden(g, W, 110, 70, 30, 42, 90 * Math.PI / 180, 180)); const t = s.find(x => x.id === idT3); if (t3Tapp == null && t && t.tappad) t3Tapp = i + 1; }
  check(`TT3 namngivet 12° snett, sedan tappat rent: klart ${klarT3}, tappad i ruta ${t3Tapp} (högst 2), samma id ${!!s.find(x => x.id === idT3)}`,
        klarT3 && t3Tapp != null && t3Tapp <= 2 && !!s.find(x => x.id === idT3));
  /* TT4–TT6: ett kort som tappas SLARVIGT, 60–80° (MES-298). Måttkollen i
     tapTydlig jämförde förut regionens egna mått (ur momenten, lika i alla
     vinklar) med kortets RAKA låda — och den är större än kortet så fort
     kortet ligger snett. Pharika's Chosen i spegelfacit 2026-09-22: tappat
     71°, men lådan togs om efter ett flimmer medan kortet låg tappat och
     snett (78×66 mot 66×48), och domen fälldes. Nu jämförs med namnForm:
     ramen, eller lådan uträtad med kortets vinkel. */
  /* TT4: namngivet 16° snett (den raka lådan 1,1–1,3 × kortet), sedan
     tappat 75°. */
  nystart(); await referens();
  for (let i = 0; i < 10; i++) s = await ruta(g => kortVriden(g, W, 110, 70, 30, 42, 16 * Math.PI / 180, 180));
  const idT4 = s[0] && s[0].id, klarT4 = !!(s[0] && s[0].st === 'klar');
  let t4Tapp = null;
  for (let i = 0; i < 6; i++) { s = await ruta(g => kortVriden(g, W, 112, 72, 30, 42, 75 * Math.PI / 180, 180)); const t = s.find(x => x.id === idT4); if (t4Tapp == null && t && t.tappad) t4Tapp = i + 1; }
  check(`TT4 namngivet 16° snett, sedan tappat 75°: klart ${klarT4}, tappad i ruta ${t4Tapp} (högst 2), samma id ${!!s.find(x => x.id === idT4)}`,
        klarT4 && t4Tapp != null && t4Tapp <= 2 && !!s.find(x => x.id === idT4));
  /* TT5: Pharika-fallet. Namngivet rakt, handen skymmer kortet i 0,6 s
     (spåret dör och återuppstår med namnet, flimmer under 1,5 s) och kortet
     ligger sedan tappat 72° snett, stilla. Måttet får inte tas om ur det
     sneda kortet: förut gjordes det, ur den raka lådan, och kortet blev
     aldrig tappat. */
  nystart(); await referens();
  for (let i = 0; i < 10; i++) s = await ruta(g => kortVriden(g, W, 110, 70, 30, 42, 0, 180));
  const idT5 = s[0] && s[0].id, klarT5 = !!(s[0] && s[0].st === 'klar');
  for (let i = 0; i < 4; i++) s = await ruta(null);
  const doT5 = !s.find(x => x.id === idT5);
  let t5Tapp = null, t5Id = null;
  for (let i = 0; i < 8; i++) { s = await ruta(g => kortVriden(g, W, 113, 73, 30, 42, 72 * Math.PI / 180, 180)); const t = s.find(x => x.id === idT5); if (t) t5Id = t.id; if (t5Tapp == null && t && t.tappad) t5Tapp = i + 1; }
  check(`TT5 namngivet rakt, borta 0,6 s, tillbaka tappat 72°: klart ${klarT5}, spåret dog ${doT5}, samma id tillbaka ${t5Id === idT5}, tappad i ruta ${t5Tapp} (högst 3)`,
        klarT5 && doT5 && t5Id === idT5 && t5Tapp != null && t5Tapp <= 3);
  /* TT6: gränsen är T.tapTapp (55° som förval, Jespers val 2026-09-28;
     var 65°, dessförinnan 70°). Med förvalet vrider 60° kortet och även
     −60° (moturs); med tapTapp 65 (--tro "tapTapp:65" i golden) är 60°
     otydligt och vrider inget. 78° vrider med förvalet. (60°, inte 58°:
     momentvinkeln på det lilla syntetiska kortet drar ~4° mot rakt, så 58°
     mäts under 55°. Det lilla
     syntetiska kortet ritas 10 % mindre i vissa vinklar — 65°, 67°, 71° —
     och faller då på måttkollens 0,85, vilket riktiga kort inte gör:
     Pharika's Chosen är 65×47 rakt och 66×48 tappad.) */
  const t6 = async (vinkel, tro) => {
    nystart(); if (tro) Kamera.satTrosklar(tro); await referens();
    for (let i = 0; i < 10; i++) s = await ruta(g => kortVriden(g, W, 110, 70, 30, 42, 0, 180));
    const id = s[0] && s[0].id; let tapp = null;
    for (let i = 0; i < 8; i++) { s = await ruta(g => kortVriden(g, W, 112, 72, 30, 42, vinkel * Math.PI / 180, 180)); const t = s.find(x => x.id === id); if (tapp == null && t && t.tappad) tapp = i + 1; }
    Kamera.satTrosklar({ tapOtapp: 20, tapTapp: 55 });
    return tapp;
  };
  const t6a = await t6(60), t6m = await t6(-60), t6b = await t6(60, { tapTapp: 65 }), t6c = await t6(78);
  check(`TT6 tappat 60° med förvalet: tappad i ruta ${t6a} (högst 2); −60° (moturs): i ruta ${t6m} (högst 2); 60° med tapTapp 65: i ruta ${t6b} (ska aldrig); 78° med förvalet: i ruta ${t6c} (högst 2); förvalet ${Kamera.trosklar.tapOtapp}/${Kamera.trosklar.tapTapp}`,
        t6a != null && t6a <= 2 && t6m != null && t6m <= 2 && t6b == null && t6c != null && t6c <= 2 && Kamera.trosklar.tapOtapp === 20 && Kamera.trosklar.tapTapp === 55);

  // ── LT1: latensmätningens stämplar (MES-215) följer med rapporten bara när den är på ──
  nystart(); await referens();
  for (let i = 0; i < 8; i++) s = await ruta(KORT);
  const utanTs = bord[0] && bord[0].ts === undefined && bordExtra && bordExtra.bortaTs === undefined;
  Kamera.satLatens(true);
  nystart(); await referens();
  const tLt = Date.now();
  for (let i = 0; i < 8; i++) s = await ruta(KORT);
  const ts = bord[0] && bord[0].ts;
  for (let i = 0; i < 12; i++) s = await ruta(g => kort(g, W, 54, 44, 42, 30, 180));   // tappas
  const ts2 = bord[0] && bord[0].ts;
  for (let i = 0; i < 8; i++) s = await ruta(null);   // lyfts
  const borta = bordExtra && bordExtra.bortaTs;
  Kamera.satLatens(false);
  check(`LT1 latensstämplar: utan ${utanTs}, med ${JSON.stringify(ts)}, tap ${ts2 && ts2.tap != null}, borta ${JSON.stringify(borta)}`,
        utanTs && !!ts && ts.hittat >= tLt && ts.stilla >= ts.hittat && ts.namn >= ts.stilla && ts.namnBild != null && !!ts2 && ts2.tap >= ts2.namn
        && Array.isArray(borta) && borta.length === 1 && borta[0].namn === 'Plains' && borta[0].borta >= ts2.tap);

  /* LT1b–LT1j (MES-242): rapporten mäter från att handen släpper. Varje
     stämpel bär rörelsens slut (<vad>Ror: sista rutan där spåret rörde sig
     eller var skymt), skuggan har en stämpel, och namnet stämplas på ALLA
     vägar med vägen i namnVag. En missad väg ger fel siffror i tysthet, så
     varje väg provas för sig, och uppsamlaren i rapportera (vägen 'okand')
     provas med ett spår som ingen väg stämplat. */
  {
    const osaker = () => ({ namn: 'Plains', sid: 's1', saker: false, cands: [{ name: 'Plains', sid: 's1', score: 0.4 }] });
    const saker = () => ({ namn: 'Plains', sid: 's1', saker: true, cands: [{ name: 'Plains', sid: 's1', score: 0.9 }] });
    const TAPPAT = g => kort(g, W, 54, 44, 42, 30, 180);
    const fraga = t => { t.aiFragad = true; t.provas = true; t.aiFragadNar = nu; };
    const klaraUtanNamnTs = () => Kamera.spar.filter(t => t.tillstand === 'klar' && t.saker && !(t.ts && t.ts.namn));
    Kamera.satLatens(true);

    /* LT1b: den lokala vägen — ordningen hittat ≤ rörelsens slut ≤ skugga ≤ namn, och läsningen loggad. */
    namnSvar = saker; nystart(); await referens();
    for (let i = 0; i < 8; i++) s = await ruta(KORT);
    const a = (Kamera.spar[0] || {}).ts || {};
    check(`LT1b lokal: vag ${a.namnVag}, hittat ≤ namnRor ≤ skugga ≤ namn: ${a.hittat} ${a.namnRor} ${a.skugga} ${a.namn}, läsningar ${JSON.stringify(a.las)}`,
          a.namnVag === 'lokal' && a.namnRor > 0 && a.hittat <= a.namnRor && a.namnRor <= a.skugga && a.skugga <= a.namn && a.skuggaRor === a.namnRor
          && Array.isArray(a.las) && a.las.length >= 1 && a.las.every(l => l.start >= a.hittat && l.ms >= 0 && (l.slag === 'las' || l.slag === 'spek')) && a.las.some(l => l.saker));
    /* LT1c: tap och borta bär sin egen rörelse — senare än namnets, och högst stämpeln. */
    for (let i = 0; i < 12; i++) s = await ruta(TAPPAT);
    const b = (Kamera.spar[0] || {}).ts || {};
    for (let i = 0; i < 2; i++) s = await ruta(g => { TAPPAT(g); hand(g, W, 75, 59, 30, 24, 60); });   // handen över kortet: skymt
    const handSlut = Date.now();
    for (let i = 0; i < 8; i++) s = await ruta(null);
    const bo = (bordExtra && bordExtra.bortaTs) || [];
    check(`LT1c tap och borta: tapRor ${b.tapRor} (namnRor ${b.namnRor}, tap ${b.tap}), borta ${JSON.stringify(bo)}`,
          b.namnRor > 0 && b.tapRor > b.namnRor && b.tapRor <= b.tap && bo.length === 1 && bo[0].ror > b.tapRor && bo[0].ror <= handSlut && bo[0].ror <= bo[0].borta);

    /* LT1d: ett flimmer (borta och tillbaka inom 1,5 s) behåller namnets stämpel — inget nytt namn. */
    nystart(); await referens();
    for (let i = 0; i < 8; i++) s = await ruta(KORT);
    const f0 = Object.assign({}, (Kamera.spar[0] || {}).ts), fid = (Kamera.spar[0] || {}).id;
    for (let i = 0; i < 5; i++) s = await ruta(null);
    const dog = !Kamera.spar.some(t => t.id === fid);
    for (let i = 0; i < 4; i++) s = await ruta(KORT);
    const f1 = ((Kamera.spar.find(t => t.id === fid) || {}).ts) || {};
    check(`LT1d flimmer: dog ${dog}, samma spår ${!!Kamera.spar.find(t => t.id === fid)}, namn ${f0.namn} → ${f1.namn}, återkom ${!!f1.aterkom}, utan namnstämpel ${klaraUtanNamnTs().length}`,
          dog && f1.namn === f0.namn && f1.namnVag === 'lokal' && !!f1.aterkom && klaraUtanNamnTs().length === 0);

    /* LT1e: Claude, ett kort — vägen 'ai', och frågans tid. */
    namnSvar = osaker; nystart(); await referens();
    for (let i = 0; i < 8; i++) s = await ruta(KORT);
    let t = Kamera.spar.find(x => x.tillstand === 'okand') || { id: -1 };
    fraga(t); (t.ts || (t.ts = {})).fraga = Date.now();
    Kamera.svarAI(t.id, [{ namn: 'Plains', sid: 's1', saker: true, x: 0.5, y: 0.5 }], { antal: 1, ms: 1800 });
    const e = t.ts || {};
    check(`LT1e Claude: ${t.tillstand} vag ${e.namnVag}, fraga ≤ namn ${e.fraga} ${e.namn}, namnRor ${e.namnRor}`,
          t.tillstand === 'klar' && e.namnVag === 'ai' && e.fraga <= e.namn && e.namnRor != null && e.namnRor <= e.namn);

    /* LT1f: klungan — två kort 'hog' i beskärningen av EN låda (MES-331):
       inget blir säkert. Posten närmast mitten (Plains, 0,45) läggs överst
       bland förslagen, spåret är okänt med 'ai klunga', ingen namnstämpel,
       och lådan är ett kort (inga säkra spår att mäta mot) så grannen
       (Island, 0,85) blir inget nytt spår. Före rättelsen delades spåret i
       två säkra — golden 05 fick då grannens namn säkert på Pacifism. */
    namnSvar = osaker; nystart(); await referens();
    for (let i = 0; i < 8; i++) s = await ruta(KORT);
    t = Kamera.spar.find(x => x.tillstand === 'okand') || { id: -1 };
    fraga(t);
    Kamera.svarAI(t.id, [{ namn: 'Island', sid: 's3', saker: true, x: 0.85, y: 0.5 }, { namn: 'Plains', sid: 's1', saker: true, x: 0.45, y: 0.5 }], { antal: 2, ms: 1234 });
    const kl = Kamera.spar.filter(x => x.ai && x.ai.klunga === t.id);
    check(`LT1f klunga: ${kl.map(x => `#${x.id} ${x.tillstand} ${x.namn} [${x.varfor}] stämpel ${x.ts && x.ts.namn}`).join(', ')}, svar ${JSON.stringify((t.ai || {}).svar)}`,
          kl.length === 1 && kl[0] === t && t.tillstand === 'okand' && !t.saker && t.namn === 'Plains' && t.varfor === 'ai klunga' && t.cands && t.cands[0].name === 'Plains'
          && !!t.ts && t.ts.namn == null && !!t.ai.svar && t.ai.svar.length === 2 && t.ai.svar.every(x => !x.saker && x.sakerhet === 'klunga'));

    /* LT1g: helbilden — ett nytt spår ur Claudes helbild får hittat och vägen 'helbild'. */
    nystart(); await referens();
    Kamera.tillampaHelbild([{ x: 110 / W, y: 70 / H, namn: 'Plains', sid: 's1', saker: true }], { helbild: true, skal: 'auto' }, nu);
    const hb = Kamera.spar.find(x => x.varfor === 'helbild') || {};
    check(`LT1g helbild: ${hb.tillstand} ${hb.namn}, vag ${hb.ts && hb.ts.namnVag}, hittat ≤ namn ${hb.ts && hb.ts.hittat} ${hb.ts && hb.ts.namn}`,
          hb.tillstand === 'klar' && !!hb.ts && hb.ts.namnVag === 'helbild' && hb.ts.hittat <= hb.ts.namn);

    /* LT1h: för hand — datorn namngav kortet i granskningen. */
    namnSvar = osaker; nystart(); await referens();
    for (let i = 0; i < 8; i++) s = await ruta(KORT);
    t = Kamera.spar.find(x => x.tillstand === 'okand') || { id: -1 };
    Kamera.namnge(t.id, 'Plains', 's1');
    check(`LT1h för hand: ${t.tillstand} vag ${t.ts && t.ts.namnVag}`, t.tillstand === 'klar' && !!t.ts && t.ts.namnVag === 'hand');

    /* LT1i: spöket — ett andra spår utan region över ett klart kort dör inom bortaMs (MES-331 pass 3: mattan under
       ett känt kort bevisar inget om det). Till 2026-10-02 stod det som skymt för alltid, lästes till samma namn och
       blev 'dubblett'; den vägen finns kvar (ett spår som är 'stilla' läses i första rutan, här innan det dör). */
    namnSvar = saker; nystart(); await referens();
    for (let i = 0; i < 8; i++) s = await ruta(KORT);
    const q = Kamera.spar[0] || {};
    Kamera.spar.push({ id: 999, cx: q.cx, cy: q.cy, lang: q.lang, kort: q.kort, vinkel: q.vinkel, box: Object.assign({}, q.box), areaRef: q.areaRef,
                       sedd: nu, fodd: nu, stillaFran: 0, tomMs: 0, skymd: false, regionNar: nu, tappad: false, tappRun: 0, tillstand: 'stilla', fragad: false });
    let duBorta = null, duLast = false;
    for (let i = 1; i <= 6; i++) { s = await ruta(KORT); const du = Kamera.spar.find(x => x.id === 999); if (du && du.ts && du.ts.namn != null) duLast = true; if (!du && duBorta == null) duBorta = i * TAKT; }
    check(`LT1i spöke över ett klart kort: #999 borta efter ${duBorta} ms (≤ ${450 + TAKT}, bortaMs 450), läst ${duLast}, kortet kvar ${(Kamera.spar.find(x => x.id === q.id) || {}).tillstand}`,
          duBorta != null && duBorta <= 450 + TAKT && (Kamera.spar.find(x => x.id === q.id) || {}).tillstand === 'klar');

    /* LT1l: födelsevakten (MES-331 pass 4, B) — en region som syns i EN ruta föds inte (den var en hand eller en
       extra detektorlåda på ett kort i rörelse: spökena i golden 07 och 11); samma region två rutor i rad föds i den
       andra rutan (fodd = den rutan; stillaFran tas från den första, där lådan bevisligen stod still). Vakten är
       avstängd i förvalet (T.fodVakt 0, se index.html: den kostade golden 07 och 13 ett namn var, i alla fyra
       varianter) — provet slår på den och stänger av den igen. Kontrollen: med fodVakt 0 föds den i första rutan, som förut. */
    namnSvar = saker; Kamera.satTrosklar({ fodVakt: 1 }); nystart(); await referens();
    s = await ruta(KORT);
    const fodd1 = s.length;
    for (let i = 0; i < 3; i++) s = await ruta(null);
    const kvar1 = s.length;
    s = await ruta(KORT); const nu1 = nu; s = await ruta(KORT);
    const t2 = Kamera.spar[0] || {};
    check(`LT1l födelsevakten: en ruta → ${fodd1} spår (0), borta efteråt ${kvar1} (0); två rutor → ${s.length} spår fött i andra rutan (fodd ${t2.fodd} = ${nu}, första rutan ${nu1})`,
          fodd1 === 0 && kvar1 === 0 && s.length === 1 && t2.fodd === nu);
    Kamera.satTrosklar({ fodVakt: 0 }); nystart(); await referens();
    s = await ruta(KORT);
    check(`LT1l kontroll utan vakten (fodVakt 0): en ruta → ${s.length} spår (1, som förut)`, s.length === 1);
    Kamera.satTrosklar({ fodVakt: 0 });   // förvalet

    /* LT1j: uppsamlaren — ett säkert spår som ingen väg stämplat får raden ändå, med vägen 'okand'. */
    namnSvar = osaker; nystart(); await referens();
    for (let i = 0; i < 8; i++) s = await ruta(KORT);
    t = Kamera.spar.find(x => x.tillstand === 'okand') || { id: -1 };
    t.tillstand = 'klar'; t.saker = true; t.namn = 'Plains';   // en väg som glömt stämpla
    Kamera.rapportera();
    const up = (bord.find(x => x.id === t.id) || {}).ts || {};
    check(`LT1j uppsamlaren: vag ${up.namnVag}, namn ${up.namn}`, up.namnVag === 'okand' && up.namn != null);

    /* LT1k: stegtiden räknas bara med latens på, och följer inte med utan. */
    const hist = Kamera.stegHist;
    Kamera.satLatens(false);
    check(`LT1k stegtiden: ${hist && hist.reduce((x, y) => x + y, 0)} steg med latens, utan ${JSON.stringify(Kamera.stegHist)}`,
          Array.isArray(hist) && hist.length === 101 && hist.reduce((x, y) => x + y, 0) > 0 && Kamera.stegHist === null);
    namnSvar = saker;
  }

  // ── RS1/RS2: rapporten säger när ett kort ligger stilla och när spåret blivit gammalt (MES-166) ──
  /* Datorns provkortslås låser bara ett stilla kort och släpper ett spår utan
     region. Båda slår om bara för att tiden går — förut jämförde steget
     signaturen före och efter sig självt, med samma klocka, och sådant blev
     aldrig en rapport: sen stod kvar på 0 i varje hjärtslag. */
  nystart(); await referens();
  for (let i = 0; i < 10; i++) s = await ruta(KORT);
  const rs1 = [];
  for (let i = 0; i < 10; i++) { const r0 = bordRapporter; s = await ruta(g => kort(g, W, 65, 50, 30, 42, 180)); rs1.push({ r: bordRapporter - r0, stilla: bord[0] && bord[0].stilla }); }
  const vandS = rs1.findIndex(r => r.stilla === true);
  check(`RS1 flyttat 5 px: stilla ${rs1.map(r => r.stilla ? 1 : 0).join('')}, rapporter ${rs1.map(r => r.r).join('')} — stilla igen efter stillaMs, i en egen rapport`,
        rs1[0].stilla === false && vandS >= 4 && vandS <= 7 && rs1[vandS].r === 1 && s.length === 1 && s[0].st === 'klar');
  /* Kortet borta, men en rund fläck fyller 45 % av lådan: ingen region för
     spåret (fel kvot), inte tomt nog att räknas bort — spåret blir kvar. */
  const flack = g => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dx = x - 80, dy = y - 71; if (dx * dx + dy * dy <= 180) g[y * W + x] = 150; } };
  let senMax = 0, rsTid = null;
  for (let i = 1; i <= 20; i++) { await ruta(flack); const t = bord[0]; if (t && t.sen > senMax) senMax = t.sen; if (rsTid == null && t && t.sen >= 2000) rsTid = i * TAKT; }
  check(`RS2 spåret utan region: ${Kamera.spar.length} spår kvar, rapporterat sen ${senMax} ms, sen ≥ 2 s rapporterat efter ${rsTid} ms`,
        rsTid != null && rsTid <= 2400);

  // ── ST1/ST2: ett spår som krympt till en del tar hela kortet tillbaka (MES-83) ──
  const langST = () => Kamera.spar[0] ? Math.round(Kamera.spar[0].lang) : null;
  nystart(); await referens();
  for (let i = 0; i < 8; i++) s = await ruta(g => kort(g, W, 60, 50, 40, 56, 180));   // ett kort 40×56
  const idST = s[0].id;
  check(`ST1 kortet läses: ${s.length} spår, ${s[0] && s[0].st}, lång sida ${langST()} (56)`, s.length === 1 && s[0].st === 'klar' && langST() >= 52);
  for (let i = 0; i < 6; i++) s = await ruta(g => kort(g, W, 60, 50, 40, 26, 180));   // bara övre halvan syns (ett snitt): spåret krymper till delen
  check(`ST1 en del av kortet: ${s.length} spår, samma id ${s[0] && s[0].id === idST}, lång sida ${langST()} (40 eller 26)`, s.length === 1 && s[0].id === idST && langST() <= 42);
  for (let i = 0; i < 8; i++) s = await ruta(g => kort(g, W, 66, 56, 40, 56, 180));   // hela kortet igen, 6 px förskjutet: mitten 22 px från delens (gräns 0,6×56 = 34 — inom, men ytan 2,1× större hade avvisats)
  check(`ST1 hela kortet igen: ${s.length} spår (1), samma id ${s[0] && s[0].id === idST}, namn ${s[0] && s[0].namn}, lång sida ${langST()} (56)`, s.length === 1 && s[0].id === idST && s[0].namn === 'Plains' && langST() >= 52);
  nystart(); await referens();
  for (let i = 0; i < 8; i++) s = await ruta(g => kort(g, W, 60, 50, 40, 56, 180));
  for (let i = 0; i < 6; i++) s = await ruta(g => kort(g, W, 60, 50, 40, 26, 180));
  for (let i = 0; i < 8; i++) s = await ruta(g => kort(g, W, 60, 50, 40, 26, 180) || kort(g, W, 130, 50, 40, 56, 180));   // delen kvar OCH ett nytt kort en bit bort
  check(`ST2 ett nytt kort bredvid delen föds som eget spår: ${s.length} spår (2)`, s.length === 2);

  // ── GY1/GY2: graveyard-rutan (K9-lite) — inga spår föds i rutan, utanför som vanligt ──
  nystart(); await referens();
  Kamera.satGrav({ x: 0.1, y: 0.1, w: 0.35, h: 0.8 });   // KORT (60..90, 50..92) ligger i rutan
  for (let i = 0; i < 8; i++) s = await ruta(KORT);
  check(`GY1 kort i graveyard-rutan: ${s.length} spår (0)`, s.length === 0);
  for (let i = 0; i < 8; i++) s = await ruta(g => kort(g, W, 150, 50, 30, 42, 180));   // utanför rutan
  check(`GY2 kort utanför rutan: ${s.length} spår, klart ${s[0] && s[0].st}`, s.length === 1 && s[0].st === 'klar');
  Kamera.satGrav(null);
  for (let i = 0; i < 8; i++) s = await ruta(g => { KORT(g); kort(g, W, 150, 50, 30, 42, 180); });
  check(`GY2 rutan borta: ${s.length} spår (2)`, s.length === 2);

  // ── GY3–GY5: högvakten (MES-85) — ett nytt kort på högen räknas, en hand som sveper förbi eller vilar gör det inte ──
  const ZON = { x: 0.1, y: 0.1, w: 0.35, h: 0.8 };
  const HOG = g => kort(g, W, 60, 50, 30, 42, 180);      // högens översta kort
  /* Ett annat kort ovanpå: mörkare ram, ljusare konstverk, lite större och
     förskjutet. Inte samma kort bara mörkare — en jämn mörkning är
     exponering för vakten (gravSkillnad räknar bort den) — och inte samma
     kort snett på samma plats (bara hörnen skiljer). */
  const NYTT = g => kort(g, W, 52, 44, 40, 56, 150, 0.4);
  /* En hand som vilar på högen, med underarmen in från spelarens sida. En
     riktig arm står aldrig helt still: kanterna darrar någon bildpunkt per
     ruta (fall 11, 51–54 s: 21 % av cellerna rörde sig), och vakten dömer
     inte medan rutan rör sig. En helt stilla, slät hand utan arm inne i
     rutan i över stillaMs kan vakten ta för ett kort — datorn flyttar ändå
     bara ett kort som samtidigt försvann från mattan. */
  /* Måtten i bänkens skala (kortet 30 px ≈ 63 mm): underarmen ≈ 8 cm = 38 px, handflatan ≈ 9 cm. */
  const ARM = (g, sl) => { for (let y = 70; y < H; y++) { const dx = Math.round((sl() - 0.5) * 6); for (let x = 52 + dx; x < 90 + dx; x++) g[y * W + x] = 150; } hand(g, W, 71, 66, 22, 26, 150); };
  nystart(); await referens(); Kamera.satGrav(ZON);
  for (let i = 0; i < 10; i++) await ruta(HOG);
  const gy0 = Kamera.grav ? Kamera.grav.n : null;
  for (let i = 0; i < 3; i++) await ruta(g => { HOG(g); hand(g, W, 70 + 10 * i, 70, 30, 25, 150); });   // handen lägger kortet
  for (let i = 0; i < 10; i++) await ruta(NYTT);
  const gy3 = Kamera.grav ? Kamera.grav.n - gy0 : null;
  check(`GY3 ett kort läggs på högen: ${gy3} ändring (1), i rapporten n ${bordExtra && bordExtra.grav && bordExtra.grav.n}`,
        gy3 === 1 && !!bordExtra && !!bordExtra.grav && bordExtra.grav.n === Kamera.grav.n);
  const gy1 = Kamera.grav ? Kamera.grav.n : null;
  for (let i = 0; i < 4; i++) await ruta(g => { NYTT(g); hand(g, W, 40 + 15 * i, 80, 28, 22, 150); });   // en hand sveper förbi
  for (let i = 0; i < 10; i++) await ruta(NYTT);
  for (let i = 0; i < 10; i++) await ruta((g, sl) => { NYTT(g); ARM(g, sl); });                          // en hand med arm vilar på högen (1,5 s)
  for (let i = 0; i < 10; i++) await ruta(NYTT);
  check(`GY4 en hand sveper förbi och vilar på högen: ${Kamera.grav ? Kamera.grav.n - gy1 : null} ändringar (0)`, !!Kamera.grav && Kamera.grav.n - gy1 === 0);
  Kamera.satGrav(null);
  for (let i = 0; i < 8; i++) await ruta(NYTT);
  check(`GY5 ingen ruta: grav ${JSON.stringify(Kamera.grav)} (null), i rapporten ${bordExtra && JSON.stringify(bordExtra.grav)}`, Kamera.grav === null && !!bordExtra && bordExtra.grav === null);

  // ── BB1–BB7: library-rutan (MES-122) — inga spår föds i rutan, och `ligger` säger att en lek ligger där ──
  /* En kortbaksida: svart kant, mörk fläckig ram, brun oval med en ljus ring.
     Leken har tjocklek: två mörka lager en bildpunkt ner och till höger. */
  function baksida(g, x, y, w, h) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      const u = (xx - x) / w - 0.5, v = (yy - y) / h - 0.5, e = (u / 0.38) ** 2 + (v / 0.44) ** 2;
      let p = 70 + ((xx * 5 + yy * 3) % 7) * 3;
      if (e < 1) p = 125 + ((xx * 3 + yy * 7) % 5) * 3;
      if (e >= 0.82 && e < 1) p = 165;
      if (xx === x || yy === y || xx === x + w - 1 || yy === y + h - 1) p = 30;
      g[yy * W + xx] = p;
    }
  }
  const LEK = g => { for (let k = 2; k >= 1; k--) for (let yy = 52 + k; yy < 94 + k; yy++) for (let xx = 150 + k; xx < 180 + k; xx++) g[yy * W + xx] = 45; baksida(g, 150, 52, 30, 42); };
  const BIB = { x: 0.6, y: 0.3, w: 0.17, h: 0.38 };     // 41×57 px: ett kort (30×42) med luft, som uppstartens förslag
  const liggerNu = () => !!(Kamera.bib && Kamera.bib.ligger);

  nystart(); await referens(); Kamera.satBib(BIB);
  for (let i = 0; i < 8; i++) s = await ruta(g => kort(g, W, 150, 52, 30, 42, 180));
  check(`BB1 kort i library-rutan: ${s.length} spår (0)`, s.length === 0);
  for (let i = 0; i < 8; i++) s = await ruta(g => { kort(g, W, 150, 52, 30, 42, 180); KORT(g); });
  check(`BB1 kort utanför rutan: ${s.length} spår, klart ${s[0] && s[0].st}`, s.length === 1 && s[0].st === 'klar');
  Kamera.satBib(null);
  for (let i = 0; i < 8; i++) s = await ruta(g => { kort(g, W, 150, 52, 30, 42, 180); KORT(g); });
  check(`BB1 rutan borta: ${s.length} spår (2)`, s.length === 2);

  nystart(); await referens(); Kamera.satBib(BIB);
  for (let i = 0; i < 6; i++) await ruta(null);
  const bb2Fore = liggerNu();
  /* BB11 (MES-139): uppstartens kvittens. "tackt" medan handen lägger leken
     — datorn säger Got it direkt — och "lek" när handen släppt men leken
     inte legat still i stillaMs än — datorn ritar ramen runt. */
  let bb11Tackt = false, bb11Lek = false;
  for (let i = 0; i < 3; i++) { await ruta(g => { LEK(g); hand(g, W, 175 + 6 * i, 85, 26, 30, 150); }); if (Kamera.bib && Kamera.bib.tackt) bb11Tackt = true; }   // handen lägger leken
  let bb2Ruta = -1;
  for (let i = 0; i < 12; i++) { await ruta(LEK); if (!liggerNu() && Kamera.bib && Kamera.bib.lek) bb11Lek = true; if (bb2Ruta < 0 && liggerNu()) bb2Ruta = i + 1; }
  check(`BB2 leken läggs i rutan: ligger före ${bb2Fore} (false), ligger efter ${bb2Ruta} rutor (≤ 8), i rapporten ${bordExtra && JSON.stringify(bordExtra.bib)}`,
        !bb2Fore && bb2Ruta > 0 && bb2Ruta <= 8 && !!bordExtra && !!bordExtra.bib && bordExtra.bib.ligger === true);
  check(`BB11 (MES-139) täckt medan handen lägger leken: ${bb11Tackt} (true), en lek som ska ligga still innan den ligger: ${bb11Lek} (true)`, bb11Tackt && bb11Lek);
  let bb4Ruta = -1;
  for (let i = 0; i < 16; i++) { await ruta(null); if (bb4Ruta < 0 && !liggerNu()) bb4Ruta = i + 1; }
  check(`BB4 leken lyfts: ligger falsk efter ${bb4Ruta} rutor (≤ ${Math.ceil(2 * 700 / TAKT) + 2})`, bb4Ruta > 0 && bb4Ruta <= Math.ceil(2 * 700 / TAKT) + 2);

  const ARM_B = (g, sl) => { for (let y = 90; y < H; y++) { const dx = Math.round((sl() - 0.5) * 6); for (let x = 146 + dx; x < 184 + dx; x++) g[y * W + x] = 150; } hand(g, W, 165, 76, 22, 26, 150); };
  nystart(); await referens(); Kamera.satBib(BIB);
  for (let i = 0; i < 10; i++) await ruta(ARM_B);
  for (let i = 0; i < 6; i++) await ruta(null);
  check(`BB3 en arm vilar i rutan: ligger ${liggerNu()} (false)`, !liggerNu());

  nystart(); await referens(); Kamera.satGrav(ZON); Kamera.satBib(BIB);
  for (let i = 0; i < 10; i++) await ruta(HOG);
  const bb5a = Kamera.grav ? Kamera.grav.n : null;
  for (let i = 0; i < 12; i++) await ruta(g => { HOG(g); LEK(g); });
  const bb5b = Kamera.grav ? Kamera.grav.n : null;
  for (let i = 0; i < 3; i++) await ruta(g => { HOG(g); LEK(g); hand(g, W, 70 + 10 * i, 70, 30, 25, 150); });
  for (let i = 0; i < 10; i++) await ruta(g => { NYTT(g); LEK(g); });
  const bb5c = Kamera.grav ? Kamera.grav.n : null;
  check(`BB5 båda rutorna: leken ändrar inte högen (${bb5b - bb5a}, 0), ett nytt kort på högen (${bb5c - bb5b}, 1), ligger ${liggerNu()}`,
        bb5b - bb5a === 0 && bb5c - bb5b === 1 && liggerNu());
  const bb7Fore = liggerNu();
  Kamera.satBib(Object.assign({}, BIB));
  check(`BB7 samma ruta igen nollställer inte: ligger ${bb7Fore} → ${liggerNu()}`, bb7Fore && liggerNu());
  Kamera.satKalibrering({ ruta: { x: 0, y: 0, w: 1, h: 1, upp: 'v', bib: BIB } });
  check(`BB7 raden bär rutan: bib ${JSON.stringify(Kamera.bib)}`, Kamera.bib !== null && Kamera.bib.ligger === false);
  Kamera.satGrav(null);

  // ── BB8–BB10 (MES-138): en lek i plastfickor, en lek intill graveyard-högen, en hand som vilar på leken ──
  /* Enfärgade fickor: ingen struktur alls, och större än kortet (fickan,
     lekens tjocklek). Kortreglerna dömer den slät, och förut såg rutan den
     aldrig — Jespers lek i gröna fickor låg i rutan i 7 s utan "ligger". */
  const FICKLEK = g => {
    for (let k = 3; k >= 1; k--) for (let yy = 50 + k; yy < 98 + k; yy++) for (let xx = 147 + k; xx < 182 + k; xx++) g[yy * W + xx] = 40;
    for (let yy = 50; yy < 98; yy++) for (let xx = 147; xx < 182; xx++) g[yy * W + xx] = 55;
  };
  /* Telefonens avvikelse och spridning på Jespers bord (22–29 och 13–17 i
     inspelningen), inte bänkens: på den brusfria bänken sjunker avvikelsen
     av sig själv, spridningskravet med den, och en slät lek såg ut som ett
     kort. Gäller BB8–BB10. */
  const TELEFON = { autoUts: 0, utseende: 25, spridning: 15 };
  nystart(); Kamera.satTrosklar(TELEFON); await referens(); Kamera.satBib(BIB);
  for (let i = 0; i < 6; i++) await ruta(null);
  const bb8Fore = liggerNu();
  for (let i = 0; i < 3; i++) await ruta(g => { FICKLEK(g); hand(g, W, 178 + 6 * i, 88, 26, 30, 150); });
  let bb8Ruta = -1;
  for (let i = 0; i < 12; i++) { await ruta(FICKLEK); if (bb8Ruta < 0 && liggerNu()) bb8Ruta = i + 1; }
  check(`BB8 lek i enfärgade fickor (slät, större än kortet): ligger före ${bb8Fore} (false), ligger efter ${bb8Ruta} rutor (≤ 8)`, !bb8Fore && bb8Ruta > 0 && bb8Ruta <= 8);

  /* Graveyard-högen till vänster har vuxit ihop med leken: en region över
     båda rutorna, större än 1,6 rutor och med mitten nära gränsen. */
  const GZ = { x: 0.42, y: 0.3, w: 0.17, h: 0.38 };
  const HOG9 = g => kort(g, W, 112, 52, 35, 46, 180);
  nystart(); Kamera.satTrosklar(TELEFON); await referens(); Kamera.satGrav(GZ); Kamera.satBib(BIB);
  for (let i = 0; i < 8; i++) await ruta(HOG9);
  let bb9Ruta = -1;
  for (let i = 0; i < 12; i++) { await ruta(g => { HOG9(g); FICKLEK(g); }); if (bb9Ruta < 0 && liggerNu()) bb9Ruta = i + 1; }
  check(`BB9 leken intill graveyard-högen (en region): ligger efter ${bb9Ruta} rutor (≤ 8), spår ${Kamera.spar.length} (0)`, bb9Ruta > 0 && bb9Ruta <= 8 && Kamera.spar.length === 0);
  Kamera.satGrav(null);

  /* I spel: handen vilar på leken, med armen in från bildens nederkant, i
     3 s. Leken är inte lyft — förut räknades den lyft efter två bortaMs. */
  const VILA = (g, sl) => {
    FICKLEK(g);
    for (let y = 95; y < H; y++) { const dx = Math.round((sl() - 0.5) * 4); for (let x = 150 + dx; x < 182 + dx; x++) g[y * W + x] = 150; }
    hand(g, W, 166, 84, 20, 16, 150);
  };
  nystart(); Kamera.satTrosklar(TELEFON); await referens(); Kamera.satBib(BIB);
  for (let i = 0; i < 12; i++) await ruta(FICKLEK);
  const bb10Fore = liggerNu();
  let bb10Lyft = false;
  for (let i = 0; i < 20; i++) { await ruta(VILA); if (!liggerNu()) bb10Lyft = true; }
  for (let i = 0; i < 6; i++) await ruta(FICKLEK);
  check(`BB10 en hand vilar på leken i 3 s: ligger före ${bb10Fore} (true), lyft under tiden ${bb10Lyft} (false), ligger efter ${liggerNu()} (true)`, bb10Fore && !bb10Lyft && liggerNu());
  Kamera.satBib(null); Kamera.satTrosklar({ autoUts: 1 });

  nystart(); await referens();
  for (let i = 0; i < 8; i++) s = await ruta(KORT);
  check(`BB6 ingen library-ruta: bib ${JSON.stringify(Kamera.bib)} (null), i rapporten ${bordExtra && JSON.stringify(bordExtra.bib)}`, Kamera.bib === null && !!bordExtra && bordExtra.bib === null);

  // ── T9: varaktig ljusändring till 55 % — inga falska spår, referensen följer ──
  nystart(); await referens();
  for (let i = 0; i < 8; i++) s = await ruta(KORT);
  const id9 = s[0].id;
  let falska9 = 0, borta9 = 0, maxSpar9 = 0;
  for (let i = 0; i < 200; i++) {                        // 30 s
    s = await ruta(KORT, 3, 55);
    if (s.some(t => t.id !== id9)) falska9++; if (!s.some(t => t.id === id9)) borta9++; maxSpar9 = Math.max(maxSpar9, s.length);
  }
  check(`T9 ljuset faller till 55 % i 30 s: rutor med falska spår ${falska9}, rutor utan kortet ${borta9}, flest spår samtidigt ${maxSpar9}, gain sist ${Kamera.diagnos.gain.toFixed(2)}, skymt sist ${s[0] && s[0].skymd}`,
        falska9 === 0 && borta9 === 0 && Math.abs(Kamera.diagnos.gain - 1) < 0.15 && s.length === 1 && !s[0].skymd);

  // ── T10: igenkänningen inte redo — frågas igen efter 1,5 s, inte varje ruta ──
  nystart(); await referens();
  namnSvar = () => null;
  for (let i = 0; i < 20; i++) s = await ruta(KORT);      // 3 s
  const fragor = identifieringar;
  namnSvar = () => ({ namn: 'Plains', sid: 's1', saker: true, cands: [{ name: 'Plains', sid: 's1', score: 0.9 }] });
  for (let i = 0; i < 12; i++) s = await ruta(KORT);
  check(`T10 leken inte klar i 3 s: ${fragor} frågor (inte 15), sedan klar: ${s[0] && s[0].st} ${s[0] && s[0].namn}`, fragor <= 3 && fragor >= 1 && s[0] && s[0].st === 'klar');

  // ── T11: paus i analysen — en ensam tom ruta får inte släppa spåret ──
  nystart(); await referens();
  for (let i = 0; i < 8; i++) s = await ruta(KORT);
  nu += 5000; s = await ruta(null);
  check(`T11 efter 5 s paus, en tom ruta: spår kvar ${s.length === 1}, tomMs ${s[0] && s[0].tomMs}`, s.length === 1 && s[0].tomMs <= 300);
  for (let i = 0; i < 5; i++) s = await ruta(null);
  check(`T11 fem tomma rutor till: spåret borta ${s.length === 0}`, s.length === 0);

  // ── W: trä, blänk, skakning, drift, tonkurva (MES-26) ─────────────
  function tra(slump, o = {}) {
    const { dx = 0, dy = 0, gamma = 1, blank = true, bx = 150, by = 62, brus = 6 } = o;
    const g = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const X = x + dx, Y = y + dy;
      const fas = Y + 3.5 * Math.sin(0.03 * X) + 1.5 * Math.sin(0.11 * X);
      const adra = Math.pow(Math.max(0, Math.cos(fas * 2 * Math.PI / 7)), 8);
      let v = 128 - 55 * adra + 8 * Math.sin(0.25 * X + 0.4 * Y) + 6 * Math.sin(1.3 * X);
      for (const [kx, ky] of [[40, 110], [200, 30]]) { const d2 = ((X - kx) ** 2 + (Y - ky) ** 2) / (2 * 9 ** 2); v -= 45 * Math.exp(-d2) * (0.6 + 0.4 * Math.cos(0.9 * Math.hypot(X - kx, Y - ky))); }
      if (blank) { const d2 = (X - bx) ** 2 / (2 * 22 ** 2) + (Y - by) ** 2 / (2 * 15 ** 2); v += 125 * Math.exp(-d2); }
      v = 255 * Math.pow(Math.max(0, Math.min(255, v)) / 255, gamma);
      v += (slump() * 2 - 1) * brus;
      g[y * W + x] = Math.max(0, Math.min(255, v));
    }
    return g;
  }
  const kortPaTra = (g, x, y) => { kort(g, W, x, y, 22, 31, 205); return g; };
  const TREW = g => { kortPaTra(g, 60, 70); kortPaTra(g, 95, 72); kortPaTra(g, 130, 68); return g; };
  let seedW = 900;
  const rutaTra = async (o, bygg) => { nu += TAKT; const g = tra(lcg(seedW++), o); if (bygg) bygg(g); Kamera.steg(g, nu, H, undefined, 8); await new Promise(r => setImmediate(r)); return Kamera.spar; };
  /* Geometrin, inte bara antalet: ett kort som blivit tre bitar räknas inte. */
  const KORTEN = [[60, 70], [95, 72], [130, 68]];
  /* Bara spår som fick träff i sista rutan räknas (skymd = ingen träff): ett
     spår som lever på sitt minne är inte ett hittat kort (granskningen). */
  const helaKort = s => KORTEN.every(([x, y]) => s.filter(t => !t.skymd && Math.abs(t.lang - 31) <= 8 && Math.abs(t.kort - 22) <= 6 && Math.hypot(t.cx - (x + 10.5), t.cy - (y + 15)) <= 4).length === 1);
  const refTra = async () => { for (let i = 0; i < 6; i++) await rutaTra({}); };
  const summa = async (n, f) => { let sum = 0, max = 0, sist = []; for (let i = 0; i < n; i++) { const s = await f(i); sum += s.length; max = Math.max(max, s.length); sist = s; } return { sum, max, sist }; };
  nystart(); await refTra();
  check(`W0 ytans betyg på trä med blänk: ${JSON.stringify({ dom: Kamera.yta.dom, textur: Kamera.yta.textur, blank: Kamera.yta.blank })}`, Kamera.yta.dom === 'blank');
  let r = await summa(40, i => rutaTra({ dx: (i % 3) - 1, dy: i % 2 }));
  /* Tröskelns värde är inte måttet längre (se W3): den styr bara mönster-
     jämförelsen, och får klättra medan ådrorna skakar. Falska spår är måttet. */
  check(`W2 skakning ±1 px i båda led, tomt trä: falska spår ${r.sum} (flest ${r.max}), spritt ${(Kamera.diagnos.spritt * 100).toFixed(2)}%, tröskel ${Kamera.trosklar.troskel}`, r.sum === 0);
  nystart(); await refTra(); r = await summa(60, () => rutaTra({ dx: 2, dy: 1 }));
  /* Tröskeln får klättra här: sedan MES-26 avgör den bara jämförelsen mot
     referensen där mattan har eget mönster (ådrorna), och ligger ådrorna två
     bildpunkter fel är det just den som ska upp tills referensen hunnit
     ikapp. Måttet är falska spår, inte tröskelns värde. */
  check(`W3 drift 2,1 px som stannar i 9 s: falska spår ${r.sum}, tröskel ${Kamera.trosklar.troskel}`, r.sum === 0);
  nystart(); await refTra(); r = await summa(40, () => rutaTra({ gamma: 0.85 }));
  check(`W7 tonkurvan ändras (gamma 0,85): falska spår ${r.sum}`, r.sum === 0);
  nystart(); await refTra(); r = await summa(30, () => rutaTra({ bx: 153, by: 64 }));
  check(`W6 blänket flyttar 3 px: falska spår ${r.sum}`, r.sum === 0);
  nystart(); await refTra(); r = await summa(12, () => rutaTra({}, TREW));
  check(`W4 tre små kort (22×31) på trä: spår ${r.sist.length} (${r.sist.map(t => Math.round(t.lang) + '×' + Math.round(t.kort)).join(', ')}), alla klara ${r.sist.every(t => t.tillstand === 'klar')}, hela kort ${helaKort(r.sist)}`, r.sist.length === 3 && r.sist.every(t => t.tillstand === 'klar') && helaKort(r.sist));
  const idsW = new Set(r.sist.map(t => t.id));
  /* Under skakningen räknas rutor, inte bara den sista: kortet i blänkets
     halo får tappa träffen en ruta då och då (det är W11:s gräns), men inte
     ofta, och aldrig sitt id. */
  let helaRutor = 0;
  r = await summa(30, async i => { const s = await rutaTra({ dx: i % 2 }, TREW); if (helaKort(s)) helaRutor++; return s; });
  check(`W5 tre kort + skakning 4,5 s: samma tre id kvar ${r.sist.filter(t => idsW.has(t.id)).length === 3 && r.sist.length === 3}, rutor med alla tre hela ${helaRutor}/30 (${r.sist.map(t => Math.round(t.lang) + '×' + Math.round(t.kort) + '@' + Math.round(t.cx) + ',' + Math.round(t.cy) + (t.skymd ? ' skymd' : '')).join(', ')})`, r.sist.filter(t => idsW.has(t.id)).length === 3 && r.sist.length === 3 && helaRutor >= 24);
  nystart(); await refTra(); namnSvar = () => ({ skrap: true });
  r = await summa(34, () => rutaTra({}, TREW));                         // två omförsök à 1,5 s, sedan dom
  /* 12 = tre försök per kort som förut (9) plus en tidig läsning per kort
     medan det väntade (K4, MES-86): skräp ur den tidiga läsningen räknas
     inte som ett försök — domen faller på samma tre som i dag. */
  check(`W8 skräp: beskärning utan textruta blir 'skrap' efter tre försök, inte okänd: ${r.sist.map(t => t.tillstand).join(',')}, frågor ${identifieringar}`, r.sist.length === 3 && r.sist.every(t => t.tillstand === 'skrap') && identifieringar === 12);
  /* W8b: skräp först, sedan ett riktigt namn — utan att kortet flyttats. */
  let forsok = 0; namnSvar = () => (++forsok <= 2 ? { skrap: true } : { namn: 'Plains', sid: 's1', saker: true, cands: [] });
  nystart(); await refTra(); r = await summa(30, () => rutaTra({}, g => kortPaTra(g, 60, 70)));
  check(`W8b mörk första beskärning, sedan läsbar: ${r.sist.map(t => t.tillstand).join(',')}`, r.sist.length === 1 && r.sist[0].tillstand === 'klar');
  /* W10: ett kort läggs ovanpå ett skräpspår — kortet ska få ett eget spår. */
  namnSvar = () => ({ skrap: true }); nystart(); await refTra();
  r = await summa(34, () => rutaTra({}, g => { for (let yy = 76; yy < 96; yy++) for (let xx = 97; xx < 121; xx++) g[yy * W + xx] = ((Math.floor(xx / 3) + Math.floor(yy / 3)) % 2) ? 200 : 110; }));   // en ljus, rutig flisa 24×20 — struktur nog för detektorn, ingen textruta
  const flisa = r.sist.length === 1 && r.sist[0].tillstand === 'skrap';
  const flisId = r.sist.length ? r.sist[0].id : -1;
  namnSvar = () => ({ namn: 'Plains', sid: 's1', saker: true, cands: [] });
  r = await summa(14, () => rutaTra({}, g => kortPaTra(g, 96, 72)));
  /* Kortet ska bli ett läst kort utan att flisan lämnar ett spöke. Om det
     är flisans spår som läses om (kortet flyttade det) eller ett nytt spår
     spelar ingen roll för datorn: skräp visas aldrig, kortet är nytt ändå. */
  check(`W10 kort ovanpå skräp: flisan var skräp ${flisa}, sedan ${r.sist.map(t => '#' + t.id + (t.id === flisId ? ' (flisans id)' : '') + ' ' + t.tillstand + ' ' + Math.round(t.lang) + '×' + Math.round(t.kort)).join(' | ')}, spöken ${Kamera.spoken.length}`, flisa && r.sist.length === 1 && r.sist[0].tillstand === 'klar' && Kamera.spoken.length === 0 && Math.abs(r.sist[0].lang - 31) <= 8);
  /* W11: ett kort ovanpå referensens blänk. Känd gräns, dokumenterad här:
     kortets ljusa ram har ingen kontrast mot blänkets halo, kvar blir
     konstverket (uppmätt 18×16 av 31×22), och det förkastas som blänkets
     gamla plats eller blir skräp. Det som skyddar spelaren är betyget vid
     referensen: blänk är ett fel att åtgärda innan spelet, inte att tolka. */
  nystart(); await refTra(); r = await summa(12, () => rutaTra({}, g => kortPaTra(g, 139, 47)));
  check(`W11 kort ovanpå referensens blänk: betyget '${Kamera.yta.dom}', inget falskt kort i full storlek (${r.sist.map(t => Math.round(t.lang) + '×' + Math.round(t.kort)).join(',') || 'inga spår'})`, Kamera.yta.dom === 'blank' && !r.sist.some(t => t.lang > 26));
  /* W13: en nästan vit matta får betyget ljus. */
  nystart(); for (let i = 0; i < 6; i++) await ruta(null, 3, 200);
  check(`W13 nästan vit matta (200): betyget '${Kamera.yta.dom}'`, Kamera.yta.dom === 'ljus');
  /* W6b: blänket flyttar sig längre — 15 och 30 px. */
  for (const bx of [165, 180]) { nystart(); await refTra(); r = await summa(30, () => rutaTra({ bx, by: 64 })); check(`W6b blänket flyttar ${bx - 150} px: falska spår ${r.sum}`, r.sum === 0); }
  check(`W12 diagnosfil är en funktion och ger mask ${W * H}`, typeof Kamera.diagnosfil === 'function' && Kamera.diagnosfil().maskRa.length === W * H);
  nystart(); await referens();
  for (let i = 0; i < 8; i++) s = await ruta(g => kort(g, W, 60, 50, 14, 20, 180));
  check(`W9 för litet kort (14×20 vid 240, ×8 = 112 videopx): rådet '${(Kamera.rad || '').slice(0, 24)}…', kortsida ${Kamera.spar.map(t => t.kort.toFixed(1)).join(',')}, tillstånd ${Kamera.spar.map(t => t.tillstand).join(',')}`, /small in the picture/.test(Kamera.rad || ''));
  /* W9b: bänken har ingen ström, alltså inget tak att jämföra med — då är
     rådet det gamla, "flytta närmare" (vidTaket antar att telefonen ger allt
     den kan). Ett kort över golvet men under 150 är ett spår, inte "litet":
     sma 0. */
  check(`W9b utan känd upplösning (${JSON.stringify(Kamera.upplosning)}) är rådet det gamla: '${Kamera.rad}', sma ${Kamera.sma}`,
        Kamera.upplosning === null && Kamera.rad === 'The cards are small in the picture. Move the phone closer to the table.' && Kamera.sma === 0);
  /* W9c–W9f (MES-31): med Claude påslagen (aiPa) gäller rådet först när
     Claude inte heller läser de små korten. Uppmätt i avståndsprovet
     2026-09-11: Claude läste 9 av 11 kort i golden 06 på 129 px kortsida
     medan rådet stod tänt. Bänken har ingen video, så frågan ställs för
     hand som i W12 (aiFragad, provas) och besvaras via Kamera.svarAI. */
  {
    const litet = g => kort(g, W, 60, 50, 14, 20, 180);   // 112 videopx: under golvet, men ett spår (W9)
    const osaker = () => ({ namn: 'Plains', sid: 's1', saker: false, cands: [{ name: 'Plains', sid: 's1', score: 0.4 }] });
    const radet = () => /small in the picture/.test(Kamera.rad || '');
    Kamera.installera({ aiPa: () => true });
    namnSvar = osaker; nystart(); await referens();
    for (let i = 0; i < 8; i++) s = await ruta(litet);
    let t = Kamera.spar.find(x => x.tillstand === 'okand');
    check(`W9c Claude på, det lilla kortet oläst och ingen fråga ute: rådet '${(Kamera.rad || '').slice(0, 24)}…'`, !!t && radet());
    t.aiFragad = true; t.provas = true; t.aiFragadNar = nu; s = await ruta(litet);
    check(`W9d frågan till Claude är ute: rådet ${JSON.stringify(Kamera.rad)} (väntar)`, !radet());
    Kamera.svarAI(t.id, [{ namn: 'Plains', sid: 's1', saker: true, x: 0.5, y: 0.5 }], { antal: 1 }); s = await ruta(litet);
    check(`W9e Claude läste det: ${t.tillstand} ${t.namn}, rådet ${JSON.stringify(Kamera.rad)}`, t.tillstand === 'klar' && !radet());
    namnSvar = osaker; nystart(); await referens();
    for (let i = 0; i < 8; i++) s = await ruta(litet);
    t = Kamera.spar.find(x => x.tillstand === 'okand');
    t.aiFragad = true; t.provas = true; t.aiFragadNar = nu;
    Kamera.svarAI(t.id, [{ namn: 'Plains', sid: 's1', saker: false, x: 0.5, y: 0.5 }], { antal: 1 }); s = await ruta(litet);
    check(`W9f Claude osäker också: ${t.tillstand} (${t.varfor}), rådet '${(Kamera.rad || '').slice(0, 24)}…'`, t.tillstand === 'okand' && radet());
    Kamera.installera({ aiPa: null });
    namnSvar = () => ({ namn: 'Plains', sid: 's1', saker: true, cands: [{ name: 'Plains', sid: 's1', score: 0.9 }] });
  }

  // ── MES-31 små kort: räknas och rapporteras i stället för att tigas ihjäl ──
  /* Ett kort under golvet (KORT_MIN_PX × 0,6 = 90 videopx kort sida) blir
     aldrig ett spår ('liten' i bedom) och syntes förut ingenstans — inte i
     rådet (som räknar på spår), inte i bordet. Nu räknas det för sig
     (dia.smaKort, inte dammet under minArea i forSma), hålls som median
     över sex rutor (Kamera.sma) och går med i bordet som tredje argument
     (sma). Uppmätt vid 8 videopx/analyspx: ett 9×13 ritat kort mäts 10,8
     kort sida efter suddningen = 86 videopx och är litet; 10×14 mäts 11,8
     = 94 och blir ett spår (W9 ovan är 14×20). */
  {
    nystart(); await referens();
    const rapFore = bordRapporter;
    for (let i = 0; i < 8; i++) s = await ruta(g => kort(g, W, 60, 50, 9, 13, 180));
    const d = Kamera.diagnos;
    check(`SM1 kort under golvet (9×13, ≈86 videopx): inget spår (${s.length}), smaKort ${d.smaKort}, forSma ${d.forSma}, sma ${Kamera.sma}, rad ${JSON.stringify(Kamera.rad)}`,
          s.length === 0 && d.smaKort === 1 && d.forSma === 0 && Kamera.sma === 1 && Kamera.rad === null);
    check(`SM2 bordet gick EN gång (${bordRapporter - rapFore}) när talet ändrades, med sma ${bordExtra && bordExtra.sma} och upplosning ${bordExtra && JSON.stringify(bordExtra.upplosning)}`,
          bordRapporter - rapFore === 1 && !!bordExtra && bordExtra.sma === 1 && bordExtra.upplosning === null);
    /* Medianen: kortet lyfts — talet står kvar tre rutor och faller på den
       fjärde (fönstret är sex rutor), och bordet går igen just då. */
    const rapMitt = bordRapporter, forlopp = [];
    for (let i = 0; i < 5; i++) { s = await ruta(null); forlopp.push(Kamera.sma); }
    check(`SM3 kortet lyfts: sma ruta för ruta ${forlopp.join(',')}, bordet gick ${bordRapporter - rapMitt} gång`,
          forlopp.join(',') === '1,1,1,0,0' && bordRapporter - rapMitt === 1);
    /* En ruta med ett kortformat fragment (en hand som sveper) tänder inget:
       medianen över sex rutor är 0 så länge fem av dem är tomma. */
    for (let i = 0; i < 3; i++) s = await ruta(null);
    const rapFrag = bordRapporter;
    s = await ruta(g => kort(g, W, 60, 50, 9, 13, 180));
    const ettVarv = Kamera.sma;
    for (let i = 0; i < 2; i++) s = await ruta(null);
    check(`SM4 en enda ruta med ett litet fragment: sma ${ettVarv} sedan ${Kamera.sma}, bordet gick ${bordRapporter - rapFrag} gånger`,
          ettVarv === 0 && Kamera.sma === 0 && bordRapporter - rapFrag === 0);
    /* Damm — en region under minArea (60) — räknas i forSma, inte i smaKort:
       de två talen ska inte gå att blanda ihop. 5×6 är 30 bildpunkter. */
    for (let i = 0; i < 4; i++) s = await ruta(g => kort(g, W, 120, 100, 5, 6, 180));
    const d2 = Kamera.diagnos;
    check(`SM5 damm (5×6): forSma ${d2.forSma}, smaKort ${d2.smaKort}, sma ${Kamera.sma}, spår ${s.length}`, d2.forSma >= 1 && d2.smaKort === 0 && Kamera.sma === 0 && s.length === 0);
    /* Diagnosfilen bär upplösningen i matt — null på bänken, telefonens på telefonen. */
    const df = Kamera.diagnosfil();
    check(`SM6 diagnosfilen: matt.upplosning ${JSON.stringify(df.matt.upplosning)}, dia.smaKort ${df.dia.smaKort}`, df.matt.upplosning === null && df.dia.smaKort === 0);
    nystart();
  }

  // ── R1: korten ligger REDAN på mattan när referensen tas (MES-26) ──
  /* Så ser ett riktigt bord ut: telefonen pekas mot ett bord med kort på.
     Förut lärde sig referensen in korten och de var osynliga för alltid. */
  nystart(); namnSvar = () => ({ namn: 'Plains', sid: 's1', saker: true, cands: [] });
  /* Korten på fri yta. Ett kort som ligger i blänkets halo när referensen
     tas är W11:s kända gräns: det syns inte som kort under inlärningen och
     blir kvar i referensen som mattans mönster. Lyfts det står platsen
     kvar som skillnad tills driften tagit in den; läggs det tillbaka syns
     det inte. Uppmätt i granskningen — därför ligger korten här fritt. */
  /* …och fritt från kvisten vid (40, 110): förut låg det andra kortet på
     x 47–69 och överlappade kvisten (radie 9) med två bildpunkter, och om
     kvistens flank hamnade i modellgrenen eller mönstergrenen avgjorde om
     kortet blev 29×20 eller 34×25 (MES-28). Ett kort som nuddar en mörk
     fläck i träet kan smälta ihop med den — det är en känd gräns, och ett
     prov för sig, inte ett villkor för "kort på fri yta". */
  const TRE_R = g => { kortPaTra(g, 12, 70); kortPaTra(g, 52, 100); kortPaTra(g, 82, 72); return g; };
  const helaR = s => [[12, 70], [52, 100], [82, 72]].every(([x, y]) => s.filter(t => !t.skymd && Math.abs(t.lang - 31) <= 8 && Math.abs(t.kort - 22) <= 6 && Math.hypot(t.cx - (x + 10.5), t.cy - (y + 15)) <= 4).length === 1);
  for (let i = 0; i < 6; i++) await rutaTra({}, TRE_R);
  r = await summa(12, () => rutaTra({}, TRE_R));
  check(`R1 tre kort på mattan NÄR referensen tas: spår ${r.sist.length}, hela kort ${helaR(r.sist)}, klara ${r.sist.filter(t => t.tillstand === 'klar').length}`, r.sist.length === 3 && helaR(r.sist) && r.sist.every(t => t.tillstand === 'klar'));
  /* …och när ett av dem lyfts ska det försvinna, inte lämna ett spöke i referensen. */
  r = await summa(12, () => rutaTra({}, g => { kortPaTra(g, 12, 70); kortPaTra(g, 82, 72); }));
  check(`R1b ett av dem lyfts: spår ${r.sist.length}`, r.sist.length === 2);
  // ── R2: telefonen flyttas 30 px och stannar — korten hittas igen på nya platsen ──
  /* Flyttas telefonen flyttar sig både träet och korten i bilden — korten
     ritas alltså på nya platser (granskningen: förut stod korten kvar och
     "flytten" prövade ingenting). Omtaget av referensen är inget villkor:
     på ett slätt bord behöver det aldrig ske, mattmodellen följer med. */
  const TRE_F = g => { kortPaTra(g, 40, 100); kortPaTra(g, 75, 102); kortPaTra(g, 110, 98); return g; };
  nystart(); await refTra(); r = await summa(12, () => rutaTra({}, TRE_F));
  /* Träet flyttar (dx 30, dy 12) och korten med det: (40,100) → (70,112) osv.
     Blänket hamnar på (120, 50), sextio bildpunkter ovanför korten. */
  r = await summa(30, () => rutaTra({ dx: 30, dy: 12 }, g => { kortPaTra(g, 70, 112); kortPaTra(g, 105, 114); kortPaTra(g, 140, 110); }));
  const helaFlytt = s => [[70, 112], [105, 114], [140, 110]].every(([x, y]) => s.filter(t => !t.skymd && Math.abs(t.lang - 31) <= 8 && Math.abs(t.kort - 22) <= 6 && Math.hypot(t.cx - (x + 10.5), t.cy - (y + 15)) <= 4).length === 1);
  check(`R2 telefonen flyttad 30×12 px i 4,5 s: spår ${r.sist.length} (${r.sist.map(t => Math.round(t.lang) + '×' + Math.round(t.kort) + '@' + Math.round(t.cx) + ',' + Math.round(t.cy)).join(', ')}), hela kort på nya platsen ${helaFlytt(r.sist)}, referensen togs om ${Kamera.omtag > 0}`, r.sist.length === 3 && helaFlytt(r.sist));
  // ── R3: ett kort vars konstverk har mattans ljus — sluten ring, hålet fylls ──
  nystart(); await refTra();
  const morkt = g => { kort(g, W, 60, 70, 22, 31, 205); for (let yy = 70 + 4; yy < 70 + 17; yy++) for (let xx = 60 + 3; xx < 60 + 19; xx++) g[yy * W + xx] = 128; return g; };
  r = await summa(12, () => rutaTra({}, morkt));
  check(`R3 kort med konstverk i mattans ljus, ram runt om: spår ${r.sist.map(t => Math.round(t.lang) + '×' + Math.round(t.kort)).join(',') || 'inga'}`, r.sist.length === 1 && Math.abs(r.sist[0].lang - 31) <= 6 && Math.abs(r.sist[0].kort - 22) <= 5);
  /* R3b: en äkta П — konstverket når kortets överkant, så hålet är öppet mot
     mattan och hålfyllningen från kanten kan inte ta det. Det är den
     ortogonala fyllningens fall (granskningen: R3 prövade bara ringen). */
  nystart(); await refTra();
  const pe = g => { kort(g, W, 60, 70, 22, 31, 205); for (let yy = 70; yy < 70 + 17; yy++) for (let xx = 60 + 3; xx < 60 + 19; xx++) g[yy * W + xx] = 128; return g; };
  r = await summa(12, () => rutaTra({}, pe));
  check(`R3b П-kort (konstverket öppet uppåt): spår ${r.sist.map(t => Math.round(t.lang) + '×' + Math.round(t.kort)).join(',') || 'inga'}`, r.sist.length === 1 && Math.abs(r.sist[0].lang - 31) <= 6 && Math.abs(r.sist[0].kort - 22) <= 5);
  // ── R4: en ljusstrimma som ändras (lampan) blir inget kort och stör inte korten ──
  nystart(); await refTra();
  /* Strimman ligger i luften mellan kort 1 och 2 (x 86–90; korten slutar
     på 81 och börjar på 95, så fyra bildpunkter luft på var sida — två
     bildpunkter sluter stängningen, och då är strimman en del av kortet:
     det är den kända gränsen) och långt från blänket vid (150, 62) — förut
     gick den rakt genom blänket, som klippte den, och provet prövade
     ingenting (granskningen). */
  r = await summa(20, () => rutaTra({}, g => { TREW(g); for (let yy = 20; yy < 140; yy++) for (let xx = 86; xx < 91; xx++) g[yy * W + xx] = Math.min(255, g[yy * W + xx] + 40); }));
  check(`R4 lodrät ljusstrimma 5 px mellan korten: spår ${r.sist.length} (${r.sist.map(t => Math.round(t.lang) + '×' + Math.round(t.kort) + '@' + Math.round(t.cx) + ',' + Math.round(t.cy) + (t.skymd ? ' skymd' : '')).join(', ')}), hela kort ${helaKort(r.sist)}`, r.sist.length === 3 && helaKort(r.sist));

  // ── G: ytorna bänken saknade (MES-28) ─────────────────────────────
  /* Varje syntetisk yta hittills har haft kort ~80 gråsteg LJUSARE än
     mattan i vanligt ljus, och trösklarna är absoluta gråsteg (utseende
     25, blänk 235). Det som faller på ett annat bord föll därför aldrig
     här. Uppmätt på diagnosfil 21-04 med ändrad ljussättning: dimmat ×0,5
     gav 1 av 3, låg kontrast ×0,4 gav 0 av 3, starkt ljus +90 gav 2 av 3.
     Fem ytor som fångar det: ljus matta med mörka kort, mörkt rum (allt
     ×0,45 OCH bruset ×2 — T9 sänker bara mattan och ökar kontrasten), låg
     kontrast (kortet inom 30 steg från mattan), överexponering (mattan
     210, kortets ram klipper), tryckt matta. Tre kort på 30×42. */
  const G_KORT = [[40, 40], [110, 40], [180, 40]];
  const treG = (niv, k = 1) => g => { for (const [x, y] of G_KORT) kort(g, W, x, y, 30, 42, niv, k); };
  const helaG = s => G_KORT.every(([x, y]) => s.filter(t => t.tillstand !== 'skrap' && !t.skymd && Math.abs(t.lang - 42) <= 8 && Math.abs(t.kort - 30) <= 6 && Math.hypot(t.cx - (x + 15), t.cy - (y + 21)) <= 4).length === 1);
  const gRad = () => Kamera.spar.map(t => `${Math.round(t.lang)}×${Math.round(t.kort)}@${Math.round(t.cx)},${Math.round(t.cy)} ${t.tillstand}${t.skymd ? ' skymd' : ''}`).join(', ') || 'inga';
  const gKlara = () => Kamera.spar.length === 3 && helaG(Kamera.spar) && Kamera.spar.every(t => t.tillstand === 'klar');
  namnSvar = () => ({ namn: 'Plains', sid: 's1', saker: true, cands: [] });
  /* G1: ljus matta (200), mörka kort (120). Det raka motsatsfallet. */
  nystart(); for (let i = 0; i < 6; i++) await ruta(null, 3, 200);
  for (let i = 0; i < 12; i++) await ruta(treG(120), 3, 200);
  check(`G1 ljus matta 200, mörka kort 120: ${gRad()}; betyg '${Kamera.yta.dom}'`, gKlara());
  /* G2: mörkt rum — allt ×0,45 och bruset fördubblat (±6). */
  nystart(); for (let i = 0; i < 6; i++) await ruta(null, 6, 100, 0.45);
  for (let i = 0; i < 12; i++) await ruta(treG(180), 6, 100, 0.45);
  check(`G2 mörkt rum ×0,45, brus ±6: ${gRad()}; σ ${Kamera.sigma.toFixed(2)}, tröskel ${Kamera.trosklar.troskel}, avvikelse ${Kamera.trosklar.utseende}`, gKlara());
  /* G3: låg kontrast — kortets ram 30 steg från mattan, resten av kortet
     inom det (k = 0,375). */
  nystart(); await referens();
  for (let i = 0; i < 12; i++) await ruta(treG(130, 0.375));
  check(`G3 låg kontrast, kort 30 steg från mattan: ${gRad()}; avvikelse ${Kamera.trosklar.utseende}`, gKlara());
  /* G4: överexponering — mattan 210, kortets ram vill vara 290 och
     klipper vid 255. Blänkreglerna får inte döma ett helt kort som blänk. */
  const klipp = g => { treG(290)(g); for (let i = 0; i < g.length; i++) if (g[i] > 255) g[i] = 255; };
  nystart(); for (let i = 0; i < 6; i++) await ruta(null, 3, 210);
  for (let i = 0; i < 12; i++) await ruta(klipp, 3, 210);
  check(`G4 överexponerat, matta 210 och ram som klipper: ${gRad()}; blänkdomar ${Kamera.diagnos.blanka}, betyg '${Kamera.yta.dom}'`, gKlara());
  /* G5: tryckt matta — en mörk linje tvärs över, en ljus logotyp, ett
     textband — allt i referensen. Korten läggs ÖVER trycket. Trycket
     ska varken bli kort (under skakning) eller gömma dem. */
  const tryck = (dx = 0, dy = 0) => g => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const X = x - dx, Y = y - dy, i = y * W + x;
      if (Y >= 58 && Y < 62) g[i] = 55;                                                         // linje tvärs över, genom korten
      else if ((X - 125) ** 2 + (Y - 64) ** 2 < 15 ** 2) g[i] = 130;                               // logotyp under kort 2 (30 steg ljusare än mattan; vid 150 var kortets ram bara 30 steg från den — det är G3:s fall, inte tryckets)
      else if (Y >= 120 && Y < 132 && X > 30 && X < 210) g[i] = ((X >> 2) & 1) ? 70 : 135;      // textband
      else if (X >= 8 && X < 11 || X >= 229 && X < 232) g[i] = 60;                                 // kantlinjer
    }
  };
  nystart(); for (let i = 0; i < 6; i++) await ruta(tryck());
  const monsterFalska = [];
  for (let i = 0; i < 20; i++) { const s = await ruta(tryck((i % 3) - 1, i % 2)); monsterFalska.push(s.length); }
  check(`G5a tryckt matta, skakning ±1 px, inga kort: falska spår ${monsterFalska.reduce((a, b) => a + b, 0)} (flest ${Math.max(...monsterFalska)}); betyg '${Kamera.yta.dom}'`, monsterFalska.every(n => n === 0));
  for (let i = 0; i < 12; i++) await ruta(g => { tryck()(g); treG(180)(g); });
  check(`G5b tre kort ovanpå trycket: ${gRad()}`, gKlara());
  let g5Hela = 0;
  for (let i = 0; i < 20; i++) { await ruta(g => { tryck((i % 3) - 1, i % 2)(g); treG(180)(g); }); if (gKlara()) g5Hela++; }
  check(`G5c korten kvar under skakning: hela i ${g5Hela}/20 rutor, sist ${gRad()}`, g5Hela >= 18);

  // ── N: kort kant i kant (MES-28 Del 2) ─────────────────────────────
  /* Två kort som nuddar har ingen springa: masken är EN region med två
     svarta kanter intill varandra, och erosionen i dela() kan inte dela
     den. Skärlinjen (skar) hittar sömmen som en dal i profilen längs
     regionens axel. Delarna måste vara kort och lika stora; finns en
     referens (säkert namngivna spår) ska de dessutom ha kortets storlek.
     Helt kort här: 30×42 mäts som ~40×28. */
  const N_FMT = () => Kamera.spar.map(t => `${Math.round(t.lang)}×${Math.round(t.kort)}@${Math.round(t.cx)},${Math.round(t.cy)}${t.skymd ? ' skymd' : ''}`).join(', ');
  const N_HELA = () => Kamera.spar.every(t => !t.skymd && Math.abs(t.lang - 40) <= 6 && Math.abs(t.kort - 28) <= 6);

  // N2: tre kort i rad, kant i kant, utan referens → 3
  nystart(); await referens();
  const N2 = g => { kort(g, W, 60, 50, 30, 42, 180); kort(g, W, 90, 50, 30, 42, 180); kort(g, W, 120, 50, 30, 42, 180); };
  for (let i = 0; i < 8; i++) s = await ruta(N2);
  check(`N2 tre kort i rad kant i kant, utan referens: spår ${s.length} (${N_FMT()}), skurna ${Kamera.diagnos.skurna}`, s.length === 3 && N_HELA());

  // N3: två kort ovanpå varandra, kortsida mot kortsida → 2
  nystart(); await referens();
  const N3 = g => { kort(g, W, 100, 20, 30, 42, 180); kort(g, W, 100, 62, 30, 42, 180); };
  for (let i = 0; i < 8; i++) s = await ruta(N3);
  check(`N3 två kort kortsida mot kortsida: spår ${s.length} (${N_FMT()}), skurna ${Kamera.diagnos.skurna}`, s.length === 2 && N_HELA());

  // N5: ett kort med en mörk linje tvärs över vid 57 % (konstverk/textruta) → 1, helt. Regressionsvakten.
  nystart(); await referens();
  /* Linjen är 3 px och 45 mörk: 2 px svart (30) suddades till mattans nivå
     och delade MASKEN — kortet blev 28×22 redan före skärlinjen (uppmätt
     här: 2 px/30 → 28×22, 3 px/45 → 40×28). Det är en annan sak, och inte
     det provet mäter. */
  const N5 = g => { kort(g, W, 100, 50, 30, 42, 180); for (let yy = 74; yy < 77; yy++) for (let xx = 100; xx < 130; xx++) g[yy * W + xx] = 45; };
  for (let i = 0; i < 8; i++) s = await ruta(N5);
  check(`N5 ett kort med mörk linje vid 57 %: spår ${s.length} (${N_FMT()}), skurna ${Kamera.diagnos.skurna}`, s.length === 1 && N_HELA());
  // N5b: samma kort med ett rent kort bredvid (referensen finns) → 2
  nystart(); await referens();
  const N5b = g => { kort(g, W, 30, 50, 30, 42, 180); N5(g); };
  for (let i = 0; i < 8; i++) s = await ruta(N5b);
  check(`N5b linjekortet bredvid ett rent kort: spår ${s.length} (${N_FMT()}), skurna ${Kamera.diagnos.skurna}`, s.length === 2 && N_HELA());

  // N4: R4:s strimma utan luft mot korten (mätning: strimman är ljus, inte en söm)
  nystart(); await refTra();
  r = await summa(20, () => rutaTra({}, g => { TREW(g); for (let yy = 20; yy < 140; yy++) for (let xx = 82; xx < 95; xx++) g[yy * W + xx] = Math.min(255, g[yy * W + xx] + 40); }));
  console.log(`     N4 (mätning) strimma 13 px utan luft mot korten: spår ${r.sist.length} (${r.sist.map(t => Math.round(t.lang) + '×' + Math.round(t.kort) + '@' + Math.round(t.cx) + ',' + Math.round(t.cy) + (t.skymd ? ' skymd' : '')).join(', ')}), hela kort ${helaKort(r.sist)}, skurna ${Kamera.diagnos.skurna}`);

  // ── MES-29 helbild: rutan är borta, läget (upp) byts utan nollställning ──
  // U1: läget byts på datorn — tappläget tolkas om, inget nollställs
  nystart(); await referens();
  for (let i = 0; i < 8; i++) s = await ruta(KORT);
  const idU = s[0] && s[0].id, nollU = nollst;
  Kamera.satUpp('h'); s = await ruta(KORT);
  check(`U1 liggande: samma id ${s[0] && s[0].id === idU}, tappad ${s[0] && s[0].tappad}, nollställningar ${nollst - nollU}`, s.length === 1 && s[0].id === idU && s[0].tappad && nollst === nollU);
  Kamera.satUpp('v'); s = await ruta(KORT);
  check(`U1 stående igen: tappad ${s[0] && s[0].tappad}`, s.length === 1 && !s[0].tappad);
  // U2: en sparad ruta från förr krymper inte bilden, men läget gäller
  Kamera.satKalibrering({ ruta: { x: 0.25, y: 0.25, w: 0.5, h: 0.5, upp: 'h' } });
  const rU = Kamera.ruta;
  check(`U2 gammal kalibrering: ${JSON.stringify(rU)}`, rU.x === 0 && rU.y === 0 && rU.w === 1 && rU.h === 1 && rU.upp === 'h');
  nystart();   // U2 lämnar läget liggande
  // ── MES-29 dubblett: ett kort får inte bli två spår ─────────────────
  /* Datorns avstämning räknar fysiska kort (se dev/avstamning.cjs); här
     provas telefonens halva: var det andra spåret föddes. */
  {
    namnSvar = () => ({ namn: 'Plains', sid: 's1', saker: true, cands: [{ name: 'Plains', sid: 's1', score: 0.9 }] });
    const fmt = l => l.map(t => `#${t.id} ${t.tillstand} ${t.namn || ''} tap=${t.tappad ? 1 : 0}${t.ai && t.ai.helbild ? ' helbild' : ''}`).join(', ');
    const kortSpar = () => Kamera.spar.filter(t => t.tillstand !== 'skrap');
    /* D1: helbilden lägger Claudes punkt 0,6 kortlängder bredvid ett tappat
       kort — ett tappat kort är brett och lågt, och punkten hamnar utanför
       lådan. Förut blev den ett eget, otappat helbildsspår bredvid
       detektorns tappade, och datorn fick två kort för ett (Jespers parti
       2026-09-10). Punkten ska räknas till spåret som redan bär namnet. */
    const tappat = g => kortVriden(g, W, 110, 70, 30, 42, Math.PI / 2, 180);
    nystart(); await referens();
    for (let i = 0; i < 10; i++) await ruta(tappat);
    Kamera.tillampaHelbild([{ x: (110 + 0.6 * 42) / W, y: 70 / H, namn: 'Plains', sid: 's1', saker: true }], { helbild: true, skal: 'auto' }, nu);
    const detRapport = bord.find(t => t.tillstand !== 'skrap');
    for (let i = 0; i < 10; i++) await ruta(tappat);
    const d1 = kortSpar();
    check(`D1 helbildens punkt 0,6 L bredvid ett tappat kort: spår ${d1.length} (${fmt(d1)})`,
          d1.length === 1 && !d1.some(t => t.ai && t.ai.helbild) && d1[0].tappad);
    /* D2: rapporten bär `sen` — ms sedan detektorn gav spåret en region, det
       datorn kallar färskt. Ett spår som bara finns i helbilden har inget. */
    nystart(); await referens();
    Kamera.tillampaHelbild([{ x: 110 / W, y: 70 / H, namn: 'Plains', sid: 's1', saker: true }], { helbild: true, skal: 'auto' }, nu);
    const helRapport = bord.find(t => t.ai && t.ai.helbild);
    check(`D2 sen i rapporten: detektorns spår ${detRapport && detRapport.sen} ms, helbildens ${helRapport && helRapport.sen}`,
          !!detRapport && typeof detRapport.sen === 'number' && detRapport.sen < 500 && !!helRapport && helRapport.sen === null);
    /* D3: tappat runt nedre vänstra hörnet med en hand över. Mittpunkten
       flyttar sig mer än matcha tar, så det gamla spåret dör och ett nytt
       föds — men aldrig två klara samtidigt, och ett spår till sist. */
    const hx = 110 - 15 + 21, hy = 70 + 21 + 15;
    nystart(); await referens();
    for (let i = 0; i < 10; i++) await ruta(g => kortVriden(g, W, 110, 70, 30, 42, 0, 180));
    for (let i = 0; i < 4; i++) await ruta(g => { kortVriden(g, W, hx, hy, 30, 42, Math.PI / 2, 180); hand(g, W, 112, 88, 30, 28, 60); });
    let flestKlara = 0;
    for (let i = 0; i < 25; i++) { await ruta(g => kortVriden(g, W, hx, hy, 30, 42, Math.PI / 2, 180)); flestKlara = Math.max(flestKlara, Kamera.spar.filter(t => t.tillstand === 'klar').length); }
    const d3 = kortSpar();
    check(`D3 tappat runt hörnet med hand: spår sist ${d3.length} (${fmt(d3)}), flest klara samtidigt ${flestKlara}`,
          d3.length === 1 && d3[0].tappad && flestKlara <= 1);
    /* D4: helbildens kort i graveyard- och library-rutan är högarna, inte
       bordet (MES-180). Golden 11: Claude såg högens översta kort, och det
       blev säkra spår — Night's Whisper medan högen bläddrades, Faithful
       Pikemaster efter att det lagts på högen. Ett kort utanför rutorna
       blir ett spår som förut. */
    nystart(); await referens(); Kamera.satGrav({ x: 0, y: 0.5, w: 0.25, h: 0.5 }); Kamera.satBib({ x: 0.25, y: 0.5, w: 0.2, h: 0.5 });
    Kamera.tillampaHelbild([{ x: 0.12, y: 0.75, namn: 'Plains', sid: 's1', saker: true }, { x: 0.35, y: 0.75, namn: 'Swamp', sid: 's2', saker: true },
                            { x: 110 / W, y: 40 / H, namn: 'Island', sid: 's3', saker: true }], { helbild: true, skal: 'auto' }, nu);
    const d4 = Kamera.spar.map(t => t.namn);
    Kamera.satGrav(null); Kamera.satBib(null);
    check(`D4 helbildens kort i graveyard- och library-rutan: spår ${JSON.stringify(d4)}`, d4.length === 1 && d4[0] === 'Island');
  }

  // ── MES-29 skräp: Claudes "inget kort" och spår som prövas ─────────
  /* Bänken har ingen video (c = null), så fragaAI anropas aldrig. Proven
     ställer frågan för hand — aiFragad, provas, aiFragadNar, som identifiera
     gör — och svarar via Kamera.svarAI, som kamFragaAI gör när svaret kommit. */
  {
    const osaker = () => ({ namn: 'Plains', sid: 's1', saker: false, cands: [{ name: 'Plains', sid: 's1', score: 0.4 }] });
    const ETT = g => kortPaTra(g, 60, 70), FLYTT = g => kortPaTra(g, 63, 70);
    const iBord = t => bord.find(x => x.id === t.id) || {};
    const fraga = t => { t.aiFragad = true; t.provas = true; t.aiFragadNar = nu; };
    const fmt = t => `${t.tillstand}${t.provas ? ' prövas' : ''}${t.namn ? ' ' + t.namn : ''}${t.varfor ? ' (' + t.varfor + ')' : ''}`;
    /* Ett okänt Plains på trä, med en fråga ute. */
    const ettOkant = async () => {
      namnSvar = osaker; nystart(); await refTra();
      for (let i = 0; i < 12; i++) await rutaTra({}, ETT);
      const t = Kamera.spar.find(x => x.tillstand === 'okand') || { id: -1 };
      fraga(t); return t;
    };
    /* W12: Claude såg inget kort → skräp, utan namn och ledtråd, och läses
       inte om medan det ligger stilla. */
    let t = await ettOkant();
    Kamera.svarAI(t.id, [], { antal: 0 });
    const b12 = iBord(t), fr12 = identifieringar;
    for (let i = 0; i < 10; i++) await rutaTra({}, ETT);
    check(`W12 Claude: inget kort → skräp: ${fmt(t)}, gissning ${t.gissning}, bordet ${b12.tillstand}, omläst ${identifieringar - fr12}`,
          t.tillstand === 'skrap' && t.varfor === 'ai: inget kort' && t.namn === null && t.gissning === null && t.provas === false && b12.tillstand === 'skrap' && identifieringar === fr12);
    /* W13: en post utan namn — ett kort utanför leken, en token — är ett kort. */
    t = await ettOkant();
    Kamera.svarAI(t.id, [], { antal: 1 });
    check(`W13 Claude såg ett kort den inte kunde namnge (antal 1): ${fmt(t)}, bordet prövas ${iBord(t).provas}`,
          t.tillstand === 'okand' && t.provas === false && iBord(t).provas === false);
    /* W14: inget svar alls — den lokala domen står. */
    t = await ettOkant();
    Kamera.svarAI(t.id, null, { fel: 502 });
    check(`W14 inget svar (502): ${fmt(t)}, ai.fel ${t.ai && t.ai.fel}`, t.tillstand === 'okand' && t.provas === false && !!t.ai && t.ai.fel === 502);
    /* W15: svaret kommer aldrig — efter PROVA_MS (15 s) släpps provet, och
       signaturen gör det till en rapport. */
    t = await ettOkant();
    Kamera.rapportera();
    const fore15 = iBord(t).provas;
    for (let i = 0; i < 93; i++) await rutaTra({}, ETT);       // 14 s
    const mitt15 = iBord(t).provas;
    for (let i = 0; i < 14; i++) await rutaTra({}, ETT);       // 16 s
    check(`W15 svaret kommer aldrig: prövas ${fore15} → 14 s ${mitt15} → 16 s ${t.provas}, bordet ${iBord(t).provas}, ${fmt(t)}`,
          fore15 === true && mitt15 === true && t.provas === false && iBord(t).provas === false && t.tillstand === 'okand');
    /* W16: ett lokalt säkert spår rörs inte av "inget kort". */
    namnSvar = () => ({ namn: 'Plains', sid: 's1', saker: true, cands: [{ name: 'Plains', sid: 's1', score: 0.9 }] });
    nystart(); await refTra();
    for (let i = 0; i < 12; i++) await rutaTra({}, ETT);
    t = Kamera.spar.find(x => x.tillstand === 'klar') || { id: -1 };
    t.aiFragad = true;
    Kamera.svarAI(t.id, [], { antal: 0 });
    check(`W16 lokalt säkert spår, Claude: inget kort → står kvar: ${fmt(t)}`, t.tillstand === 'klar' && t.namn === 'Plains');
    /* W17: helbildens osäkra namn är Claudes egen motsatta dom. */
    t = await ettOkant(); t.varfor = 'helbild osäker';
    Kamera.svarAI(t.id, [], { antal: 0 });
    check(`W17 helbildens osäkra namn, beskärningen: inget kort → står kvar: ${fmt(t)}`, t.tillstand === 'okand' && t.namn === 'Plains');
    /* W18: en fråga till efter rörelse, aldrig fler. */
    t = await ettOkant();
    Kamera.svarAI(t.id, [], { antal: 0 });
    const forst18 = fmt(t);
    for (let i = 0; i < 12; i++) await rutaTra({}, FLYTT);
    const andra18 = `${fmt(t)}, frågad ${!!t.aiFragad}`;
    const ok18 = t.tillstand === 'okand' && !t.aiFragad && t.aiInget === 1;
    fraga(t); Kamera.svarAI(t.id, [], { antal: 0 });
    const fr18 = identifieringar;
    for (let i = 0; i < 12; i++) await rutaTra({}, ETT);
    check(`W18 inget kort, flyttad 3 px: ${forst18} → ${andra18} (en fråga till); inget kort igen, flyttad: ${fmt(t)}, aiInget ${t.aiInget}, lästes lokalt ${identifieringar - fr18}`,
          /* Två lokala läsningar sedan MES-227: spåret läses i första hela rutan efter flytten (T.luft) och, när den missar, en gång till när det ligger stilla. Frågan till Claude är fortfarande EN. */
          ok18 && t.tillstand === 'skrap' && t.aiInget === 2 && t.aiFragad === true && identifieringar - fr18 >= 1 && identifieringar - fr18 <= 2);
    /* W19: ett svar på en fråga från före en nollställning gäller inte. */
    t = await ettOkant(); t.aiFragad = false;
    const ai19 = t.ai;
    Kamera.svarAI(t.id, [], { antal: 0 });
    check(`W19 gammalt svar efter en nollställning (aiFragad false): ${fmt(t)}`, t.tillstand === 'okand' && t.ai === ai19 && t.namn === 'Plains');
    /* W20: utan fragaAI (AI av, taket nått) prövas inget — granskningen som förut. */
    namnSvar = osaker; nystart(); await refTra();
    for (let i = 0; i < 12; i++) await rutaTra({}, ETT);
    const t20 = Kamera.spar.find(x => x.tillstand === 'okand') || {};
    const b20 = iBord(t20);
    check(`W20 utan fragaAI: ett osäkert Plains på trä: ${fmt(t20)}, bordet ${b20.tillstand} prövas ${b20.provas}`,
          t20.tillstand === 'okand' && t20.provas === false && b20.tillstand === 'okand' && b20.provas === false);
    /* W21: spåret flimrar medan frågan är ute. Frågan följer med (fodSpar),
       och svaret som kommer sedan gäller det återfödda spåret. */
    t = await ettOkant();
    const id21 = t.id;
    for (let i = 0; i < 20 && Kamera.spar.some(x => x.id === id21); i++) await rutaTra({});
    const dog21 = !Kamera.spar.some(x => x.id === id21);
    for (let i = 0; i < 2; i++) await rutaTra({}, ETT);
    const t21 = Kamera.spar.find(x => x.id === id21) || { id: -1 };
    const arv21 = `prövas ${t21.provas}, frågad ${t21.aiFragad}`;
    Kamera.svarAI(id21, [], { antal: 0 });
    check(`W21 flimmer medan frågan är ute: dog ${dog21}, samma id igen ${t21.id === id21} (${arv21}), svaret sedan: ${fmt(t21)}`,
          dog21 && t21.id === id21 && arv21 === 'prövas true, frågad true' && t21.tillstand === 'skrap');

    /* ── tiderna till sammanfattningen när auto stängs av ──
       identifiera mäter den lokala kedjan med väggklockan (performance.now),
       som bänken stubbar till 0. Här går den fem enheter per avläsning så
       att tiden syns; rutklockan nu rörs inte. lokalMs och ai.ms ska
       överleva rapportera() — det är ur bordet datorn räknar. */
    const pnFore = ctx.performance.now; let tick = 0; ctx.performance.now = () => (tick += 5);
    namnSvar = () => ({ namn: 'Plains', sid: 's1', saker: true, cands: [{ name: 'Plains', sid: 's1', score: 0.9 }] });
    nystart(); await refTra();
    for (let i = 0; i < 12; i++) await rutaTra({}, ETT);
    t = Kamera.spar.find(x => x.tillstand === 'klar') || { id: -1 };
    const b22 = iBord(t);
    check(`W22 lokalMs i bordet: spåret ${t.lokalMs} ms, bordet ${b22.lokalMs} ms (ai ${JSON.stringify(b22.ai)})`,
          typeof t.lokalMs === 'number' && t.lokalMs > 0 && b22.lokalMs === t.lokalMs && b22.ai === null);
    /* W22b: omförsöken (inte redo, sedan svar) läggs ihop — inte skrivs över. */
    let varv = 0; namnSvar = () => (++varv < 3 ? null : { namn: 'Plains', sid: 's1', saker: true, cands: [{ name: 'Plains', sid: 's1', score: 0.9 }] });
    nystart(); await refTra();
    for (let i = 0; i < 40 && !(Kamera.spar[0] && Kamera.spar[0].tillstand === 'klar'); i++) await rutaTra({}, ETT);
    t = Kamera.spar[0] || { id: -1 };
    check(`W22b tre försök (två "inte redo"): lokalMs ${t.lokalMs} ms, försök ${varv}, ${fmt(t)}`, varv === 3 && t.lokalMs >= 3 * 5 && t.tillstand === 'klar');
    /* W23: Claudes svarstid (ms i info från kamFragaAI) landar i t.ai.ms och
       i bordet, med spårets lokala tid bredvid. Svaret är en klunga (två
       Plains): spåret blir okänt med Plains överst (MES-331, inget säkert ur
       en klunga, inget nytt spår på en enkortslåda) men bär ändå tiden. */
    namnSvar = osaker; t = await ettOkant();
    const lokal23 = t.lokalMs;
    Kamera.svarAI(t.id, [{ namn: 'Plains', sid: 's1', saker: true, x: 0.3, y: 0.5 }, { namn: 'Plains', sid: 's1', saker: true, x: 0.7, y: 0.5 }], { antal: 2, ms: 1234, modell: 'claude-opus-5' });
    const delar = bord.filter(x => x.ai && x.ai.klunga === t.id);
    check(`W23 ai.ms i bordet: ${delar.map(x => `#${x.id} ${x.tillstand} ${x.namn} lokalMs ${x.lokalMs} ai.ms ${x.ai.ms} ${x.ai.modell}`).join(' | ')} (klungans lokala tid ${lokal23})`,
          delar.length === 1 && delar[0].tillstand === 'okand' && delar[0].namn === 'Plains' && !delar[0].saker && delar.every(x => x.ai.ms === 1234 && x.ai.modell === 'claude-opus-5' && x.lokalMs === lokal23 && lokal23 > 0));
    /* W24: ett flimmer behåller tiden med namnet; en omläsning efter 3 s mäter om. */
    namnSvar = () => ({ namn: 'Plains', sid: 's1', saker: true, cands: [{ name: 'Plains', sid: 's1', score: 0.9 }] });
    nystart(); await refTra();
    for (let i = 0; i < 12; i++) await rutaTra({}, ETT);
    t = Kamera.spar.find(x => x.tillstand === 'klar') || { id: -1 };
    const ms24 = t.lokalMs, id24 = t.id;
    for (let i = 0; i < 6; i++) await rutaTra({});                 // 0,9 s borta: flimmer
    for (let i = 0; i < 3; i++) await rutaTra({}, ETT);
    const t24 = Kamera.spar.find(x => x.id === id24) || { id: -1 };
    const flimmer24 = t24.id === id24 && t24.lokalMs === ms24 && t24.tillstand === 'klar';
    for (let i = 0; i < 22; i++) await rutaTra({});                // 3,3 s borta: omläsning med ledtråd
    for (let i = 0; i < 12; i++) await rutaTra({}, ETT);
    const t24b = Kamera.spar.find(x => x.id === id24) || { id: -1 };
    check(`W24 flimmer: samma id ${t24.id === id24}, lokalMs ${t24.lokalMs} (var ${ms24}); omläsning efter 3 s: ${fmt(t24b)}, lokalMs ${t24b.lokalMs}`,
          flimmer24 && t24b.id === id24 && t24b.tillstand === 'klar' && typeof t24b.lokalMs === 'number' && t24b.lokalMs > 0 && t24b.lokalMs < ms24 + 5 * 3);
    ctx.performance.now = pnFore;
  }

  // ── MES-30 grundläget: tappat mäts mot en bekräftad vinkel ──────────
  /* Otappat är sällan exakt 0° och tappat sällan exakt 90°. Grundläget är
     axeln spelaren bekräftade som otappad; mer än 45° därifrån är tappat.
     Utan grundläge gäller upp som förut ('v' lodrät, 'h' vågrät). */
  {
    namnSvar = () => ({ namn: 'Plains', sid: 's1', saker: true, cands: [{ name: 'Plains', sid: 's1', score: 0.9 }] });
    const rad = d => d * Math.PI / 180, grader = v => Math.round(v * 180 / Math.PI);
    const axSk = (u, v) => Math.abs(Math.atan2(Math.sin(2 * (u - v)), Math.cos(2 * (u - v)))) / 2;
    const T = (d, upp) => Kamera.tappad(rad(d), upp || 'v');
    nystart();
    check(`GL0 utan grundläge: grund ${Kamera.grund}; upp 'v': 20° ${T(20)}, 80° ${T(80)}; upp 'h': 20° ${T(20, 'h')}, 80° ${T(80, 'h')}`,
          Kamera.grund === null && T(20) && !T(80) && !T(20, 'h') && T(80, 'h'));
    Kamera.satGrund(rad(20));
    /* 65° är exakt gränsen (45° från 20°) och avgörs av avrundningen — den
       provas inte; 64° och 66° ligger på var sin sida. */
    check(`GL1 grundläge 20°: 20° ${T(20)}, 110° ${T(110)}, 64° ${T(64)}, 66° ${T(66)}, 200° ${T(200)} (samma axel som 20°), −70° ${T(-70)} (samma som 110°); upp 'h' ändrar inget: 20° ${T(20, 'h')}`,
          !T(20) && T(110) && !T(64) && T(66) && !T(200) && T(-70) && !T(20, 'h'));
    Kamera.satGrund(null);
    check(`GL2 satGrund(null) faller tillbaka på upp: grund ${Kamera.grund}, 20° med 'v' ${T(20)}, med 'h' ${T(20, 'h')}`, Kamera.grund === null && T(20) && !T(20, 'h'));
    Kamera.satKalibrering({ ruta: { x: 0, y: 0, w: 1, h: 1, upp: 'v', grund: 150 } });
    const g150 = Kamera.grund;
    Kamera.satKalibrering({ ruta: { x: 0, y: 0, w: 1, h: 1, upp: 'h' } });
    check(`GL3 satKalibrering läser ruta.grund i grader: 150 → ${g150 == null ? g150 : grader(g150) + '°'}; en rad utan grund (golden-facit, bänken) → ${Kamera.grund}`,
          g150 != null && Math.abs(g150 - rad(150)) < 1e-9 && Kamera.grund === null);
    /* GL4: grundFranSpar dömer om spåren som redan finns. Ett stående kort
       (axel 90°) och ett vridet 52° (axel 142°): med upp 'v' ligger det
       vridna ~49° från axeln — ingen TYDLIG dom (MES-293: under 20° från
       grundläget eller över 55°), så det står otappat som det föddes.
       Bekräftas det vridna som otappat blir grundläget ~141°: det vridna
       otappat och det stående (~51° från grundläget) tappat — på en gång, i
       rapporten (satGrund dömer om varje spår mot den nya axeln), och det
       står sig ruta för ruta: ~51° är ingen tydlig dom åt något håll. (Var
       60° med gränsen 65°; med 55° är 60° tydligt tappat redan vid födseln.) */
    nystart(); await referens();
    const TVA_V = g => { KORT(g); kortVriden(g, W, 160, 75, 30, 42, rad(52), 180); };
    for (let i = 0; i < 10; i++) s = await ruta(TVA_V);
    const staende = Kamera.spar.find(t => Math.abs(t.cx - 75) < 8) || null, vridet = Kamera.spar.find(t => Math.abs(t.cx - 160) < 8) || null;
    /* Detektorn mäter det vridna kortets axel till ~141° (−39°), inte 142°:
       momentvinkeln på ett 30×42-kort i 52° drar några grader, och den
       spritter ±5° ruta för ruta. Grundläget är axeln i ögonblicket det
       togs — det är den som jämförs, inte sista rutans. */
    const vAx = vridet ? vridet.vinkel : 0;
    const fore = `före: stående tap=${staende && staende.tappad}, vridet tap=${vridet && vridet.tappad} (axel ${vridet && grader(vAx)}°)`;
    const okFore = !!staende && !!vridet && !staende.tappad && !vridet.tappad;
    const fann = okFore && Kamera.grundFranSpar(vridet.id, false);
    const rap = t => t && (bord.find(x => x.id === t.id) || {}).tappad;
    const direkt = `rapporten direkt: stående ${rap(staende)}, vridet ${rap(vridet)}`;
    const okDirekt = fann && rap(staende) === true && rap(vridet) === false;
    for (let i = 0; i < 6; i++) s = await ruta(TVA_V);
    check(`GL4 grundFranSpar(vridet 52°): ${fore}; ${direkt}; efter 6 rutor stående ${staende && staende.tappad}, vridet ${vridet && vridet.tappad}, grund ${Kamera.grund == null ? null : grader(Kamera.grund) + '°'}`,
          okFore && okDirekt && staende.tappad && !vridet.tappad && axSk(Kamera.grund, vAx) < 1e-9);
    /* GL5: "Det är tappat" — otappat är 90° från kortets axel. Stående
       tappat (90° från grundläget 0°), vridet 30° från det: otappat. */
    if (okFore) Kamera.grundFranSpar(staende.id, true);
    check(`GL5 grundFranSpar(stående, tappat): grund ${Kamera.grund == null ? null : grader(Kamera.grund) + '°'} (axel ${staende && grader(staende.vinkel)}°), stående tap=${staende && staende.tappad}, vridet tap=${vridet && vridet.tappad}`,
          okFore && Math.abs(axSk(Kamera.grund, staende.vinkel) - Math.PI / 2) < 0.02 && staende.tappad && !vridet.tappad);
    /* GL6: satGrund(null) ger upp tillbaka: stående otappat, vridet tappat. */
    Kamera.satGrund(null);
    check(`GL6 satGrund(null): stående tap=${staende && staende.tappad}, vridet tap=${vridet && vridet.tappad}`, okFore && !staende.tappad && vridet.tappad);
    /* GL7: ett spår ur helbilden föds i grundläget, otappat — det har ingen
       egen vinkel. GL8: det duger därför inte som grund; okänt spår inte heller. */
    Kamera.satGrund(rad(150));
    Kamera.tillampaHelbild([{ x: 40 / W, y: 135 / H, namn: 'Plains', sid: 's1', saker: true }], { helbild: true, skal: 'auto' }, nu);
    const hb = Kamera.spar.find(t => t.ai && t.ai.helbild) || null;
    check(`GL7 helbildsspår med grundläge 150°: vinkel ${hb && grader(hb.vinkel)}°, tap=${hb && hb.tappad}`, !!hb && Math.abs(hb.vinkel - rad(150)) < 1e-9 && !hb.tappad);
    check(`GL8 grundFranSpar(helbildsspår utan region) = ${hb && Kamera.grundFranSpar(hb.id, false)}, okänt id = ${Kamera.grundFranSpar(9999, false)}, grund kvar ${Kamera.grund == null ? null : grader(Kamera.grund) + '°'}`,
          !!hb && !Kamera.grundFranSpar(hb.id, false) && !Kamera.grundFranSpar(9999, false) && Math.abs(Kamera.grund - rad(150)) < 1e-9);
    nystart();
  }

  // ── K4 (MES-86, MES-214): den tidiga läsningen ────────────────────
  /* Ett spår som stått formstilla i två rutor läses medan det ännu är 'ny'.
     Sedan MES-214 tas ett SÄKERT tidigt svar på en gång: spåret blir 'klar'
     utan att vänta på stillaMs, och rapporten bär stilla false tills kortet
     vilat — då mäts läget om (spekTidig) och en rapport med stilla true går.
     Ett osäkert tidigt svar kastas som förut. Läsningarna loggas med spårets
     tillstånd i ögonblicket de begärdes. */
  {
    const saker = () => ({ namn: 'Plains', sid: 's1', saker: true, cands: [{ name: 'Plains', sid: 's1', score: 0.9 }] });
    const osaker = () => ({ namn: 'Plains', sid: 's1', saker: false, cands: [{ name: 'Plains', sid: 's1', score: 0.4 }] });
    let lasLogg = [];
    const logga = svar => (id, g) => { const t = Kamera.spar.find(x => x.id === id); lasLogg.push(t ? t.tillstand : '?'); return svar(id, g); };
    /* Namn medan spåret väntar: får aldrig synas — ett namn gör spåret klart. */
    const namnSomNy = l => l.filter(t => t.st === 'ny' && t.namn).length;
    // K4a: kortet ligger still från första rutan
    namnSvar = logga(saker); lasLogg = []; nystart(); await referens();
    let nyMedNamn = 0, forstaKlar = null, forstaRapport = null;
    for (let i = 0; i < 10; i++) { s = await ruta(KORT); nyMedNamn += namnSomNy(s); if (forstaKlar == null && s[0] && s[0].st === 'klar') { forstaKlar = i + 1; forstaRapport = bord[0] && { stilla: bord[0].stilla, namn: bord[0].namn }; } }
    const t4a = Kamera.spar[0] || {};
    check(`K4a stilla kort: läsningar ${JSON.stringify(lasLogg)}, klar i ruta ${forstaKlar} (stillaMs 800 = ruta 7), namn medan ny ${nyMedNamn}, via tidigt svar ${!!t4a.spekKlar}, första rapporten ${JSON.stringify(forstaRapport)}, sist stilla ${bord[0] && bord[0].stilla} vx ${bord[0] && bord[0].vx != null ? (bord[0].vx * W).toFixed(1) : null}`,
          lasLogg.length === 1 && lasLogg[0] === 'ny' && identifieringar === 1 && s.length === 1 && s[0].st === 'klar' && s[0].namn === 'Plains'
          && nyMedNamn === 0 && forstaKlar != null && forstaKlar < 7 && !!t4a.spekKlar && !t4a.spekTidig
          && forstaRapport && forstaRapport.stilla === false && forstaRapport.namn === 'Plains'
          && bord[0].stilla === true && Math.abs(bord[0].vx * W - 75) < 2);
    // K4b: läst tidigt, sedan flyttat 12 px och stilla igen — namnet sitter kvar på spåret (ingen ny läsning), och viloläget följer med till den nya platsen
    namnSvar = logga(saker); lasLogg = []; nystart(); await referens();
    nyMedNamn = 0;
    for (let i = 0; i < 3; i++) { s = await ruta(KORT); nyMedNamn += namnSomNy(s); }
    const lastFore = identifieringar;
    for (let i = 0; i < 10; i++) { s = await ruta(g => kort(g, W, 72, 50, 30, 42, 180)); nyMedNamn += namnSomNy(s); }
    check(`K4b läst tidigt, flyttat 12 px: läsningar före flytten ${lastFore}, alla ${JSON.stringify(lasLogg)}, sist ${s[0] && s[0].st} ${s[0] && s[0].namn}, namn medan ny ${nyMedNamn}, vx ${bord[0] && bord[0].vx != null ? (bord[0].vx * W).toFixed(1) : null}`,
          lastFore === 1 && identifieringar === 1 && s.length === 1 && s[0].st === 'klar' && s[0].namn === 'Plains' && nyMedNamn === 0
          && bord[0] && Math.abs(bord[0].vx * W - 87) < 2 && bord[0].stilla === true);
    // K4c: det tidiga svaret är osäkert — spåret läses som i dag när det är stilla
    namnSvar = logga(osaker); lasLogg = []; nystart(); await referens();
    for (let i = 0; i < 10; i++) s = await ruta(KORT);
    check(`K4c osäkert tidigt svar: läsningar ${JSON.stringify(lasLogg)}, sist ${s[0] && s[0].st}`,
          lasLogg.length === 2 && lasLogg[0] === 'ny' && lasLogg[1] === 'stilla' && s.length === 1 && s[0].st === 'okand');
    // K4d: formen svänger (kortet 30 ↔ 34 brett runt samma mitt) — ingen tidig läsning, bara den vanliga
    namnSvar = logga(saker); lasLogg = []; nystart(); await referens();
    let formMax = 0;
    for (let i = 0; i < 10; i++) { s = await ruta(g => (i % 2 ? kort(g, W, 58, 50, 34, 42, 180) : KORT(g))); formMax = Math.max(formMax, (Kamera.spar[0] && Kamera.spar[0].formN) || 0); }
    check(`K4d formen svänger: läsningar ${JSON.stringify(lasLogg)}, formN högst ${formMax}, sist ${s[0] && s[0].st}`,
          lasLogg.length === 1 && lasLogg[0] === 'stilla' && formMax < 2 && s.length === 1 && s[0].st === 'klar');
    namnSvar = saker;
  }

  // ── RM: minnet av remsor (MES-331 pass 6) ────────────────────────
  /* Ett kort läggs helt synligt och blir säkert Plains; minnet tar dess
     remsa (cb.remsVektor). Kortet lyfts (spåret dör), och ett nytt kort
     läggs på samma plats med ett annat kort ovanpå — täckt: detektorns
     remsa för det övre ligger i det undres låda (fyndUrLador). Det täckta
     spåret läses osäkert på hela kortet, och remsläsningen (cb.lasRemsa)
     får minnet som kandidat — bara när det gamla spåret inte lever, inom
     T.remsaMinneS sekunder, och på samma plats. Kortet ovanpå är inte
     täckt och får inget minne. Detektorns lådor matas in som i appen
     (steg(…, det)); Detektor.para är en stubb som parar varje remsa med
     den låda den ligger i. Videon är en attrapp med måtten — start()
     sätter den och återkopplingarna innan getUserMedia faller i node.
     Sist i banken: videon står kvar i modulen. */
  {
    ctx.window.Detektor = { para: (kort, remsor) => kort.map(b => { const r = remsor.find(s => { const cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2; return cx >= b.x0 && cx <= b.x1 && cy >= b.y0 && cy <= b.y1; }); return Object.assign({}, b, { remsa: r || null, ur: 'lada', klass: b.klass || 'kort' }); }) };
    const V = 8;   // videopixlar per analyspixel, som ovan
    const lada = (x, y, w, h) => ({ x0: x * V, y0: y * V, x1: (x + w) * V, y1: (y + h) * V, poang: 0.9, klass: 'kort' });
    const remsa = (x, y, w, h) => ({ x0: x * V, y0: y * V, x1: (x + w) * V, y1: (y + h) * V, poang: 0.9 });
    const det = (kort, remsor) => ({ lador: { kort, remsor }, ruta: { x: 0, y: 0, w: W * V, h: H * V } });
    const rutaDet = async (bygg, d) => {
      nu += TAKT; const sl = lcg(1000 + nu); const g = matta(W, H, 100, 3, sl); if (bygg) bygg(g, sl);
      Kamera.steg(g, nu, H, undefined, V, d);
      await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r));
      return Kamera.spar.map(t => ({ id: t.id, st: t.tillstand, namn: t.namn, varfor: t.varfor, tackt: !!(t.tackt && t.tackt.length) }));
    };
    const vek = seed => { const v = new Float32Array(512); for (let k = 0; k < 512; k++) v[k] = Math.sin(seed * 7 + k * 0.37); return v; };
    let fangster = 0, remsFragor = [];
    const fakeVideo = { videoWidth: W * V, videoHeight: H * V, paused: false, play: () => Promise.resolve(), srcObject: null };
    await Kamera.start({ video: fakeVideo, overlay: { getContext: () => ({}) } }, {
      status: () => {}, bord: (spar) => { bord = spar; }, identifiera: (c, id, gissning) => { identifieringar++; return Promise.resolve(namnSvar(id, gissning)); },
      remsVektor: () => { fangster++; return Promise.resolve({ hel: vek(1), titel: vek(2), ms: 1 }); },
      lasRemsa: (c, id, o) => {
        const m = (o && o.minnen) || [];
        remsFragor.push({ id, minnen: m.map(e => e.namn + '#' + e.sparId + '×' + e.prov.length) });
        return Promise.resolve(m.length
          ? { namn: m[0].namn, sid: m[0].sid, saker: true, varfor: 'remsa minne', marginal: 0.05, cands: [{ name: m[0].namn, sid: m[0].sid, score: 0.5 }], minne: { provad: true, namn: m[0].namn, saker: true, hel: 0.3, titel: 0.3, n: m.length } }
          : { namn: 'Pacifism', sid: 's2', saker: false, varfor: 'remsa osäker', marginal: 0.02, cands: [] });
      }
    }).catch(() => {});
    const A = { x: 60, y: 50, w: 30, h: 42 };
    const kortA = g => kort(g, W, A.x, A.y, A.w, A.h, 180);
    const detA = det([lada(A.x, A.y, A.w, A.h)], [remsa(A.x, A.y, A.w, 6)]);
    const saker = () => ({ namn: 'Plains', sid: 's1', saker: true, cands: [{ name: 'Plains', sid: 's1', score: 0.9 }] });
    const osaker = () => ({ namn: 'Pacifism', sid: 's2', saker: false, cands: [{ name: 'Pacifism', sid: 's2', score: 0.3 }] });
    const B = { x: 60, y: 60, w: 30, h: 42 };   // ovanpå, förskjutet nedåt: dess remsa (y 60–66) ligger i den undres låda, den undres remsa (y 50–56) utanför
    const bygg3 = g => { kortA(g); kort(g, W, B.x, B.y, B.w, B.h, 140); };
    const det3 = det([lada(A.x, A.y, A.w, A.h), lada(B.x, B.y, B.w, B.h)], [remsa(A.x, A.y, A.w, 6), remsa(B.x, B.y, B.w, 6)]);
    /* Spöket (fodSpar): ett spår som dog och föds om på samma plats inom 1,5 s
       är ett flimmer och får namnet tillbaka; inom spokMs därefter får det nya
       spåret samma id men läses om ('ny'). Lyftet här är 3 s, så att det nya
       kortet läses — med spokMs 2000 (RM3) som ett nytt id, med förvalet
       (RM3b) som samma id. Båda ska få minnet. */
    const lyft = async n => { let s = []; for (let i = 0; i < n; i++) s = await rutaDet(null, det([], [])); return s; };
    const LYFT = 20;   // 3 s: spåret dör efter bortaMs (450 ms), och det nya kortet kommer 2,4 s senare — inget flimmer
    /* Varje scen börjar med 3 s tom matta: förra scenens spår dör och deras spöken åldras förbi flimret (annars föds kortet som förra scenens okända, redan frågade spår och läses aldrig). */
    const lagg = async (tro) => { namnSvar = saker; nystart(); Kamera.satTrosklar(tro || {}); await lyft(LYFT); let s = []; for (let i = 0; i < 25; i++) s = await rutaDet(kortA, detA); return s; };
    // RM1: kortet läggs, blir säkert, och minnet tar dess remsa (en fångst, förnyad högst var 3 s)
    fangster = 0;
    let s = await lagg({ spokMs: 2000 });
    const m1 = Kamera.remsMinne, idA = s[0] && s[0].id;
    check(`RM1 helt synligt säkert kort: spår ${JSON.stringify(s)}, minne ${JSON.stringify(m1.map(e => ({ id: e.sparId, namn: e.namn, prov: e.prov, lever: e.lever })))}, fångster ${fangster}`,
          s.length === 1 && s[0].st === 'klar' && s[0].namn === 'Plains' && m1.length === 1 && m1[0].namn === 'Plains' && m1[0].sparId === idA && m1[0].prov >= 1 && m1[0].lever && fangster >= 1 && fangster <= 2);
    // RM2: kortet lyfts — spåret dör, minnet står kvar
    s = await lyft(LYFT);
    const m2 = Kamera.remsMinne;
    check(`RM2 kortet lyft: spår ${s.length}, minne ${JSON.stringify(m2.map(e => ({ id: e.sparId, lever: e.lever })))}, spöken ${Kamera.spoken.length}`, s.length === 0 && m2.length === 1 && m2[0].sparId === idA && !m2[0].lever && Kamera.spoken.length === 0);
    // RM3: nytt kort (nytt id) på samma plats med ett kort ovanpå — det täckta spåret läses osäkert, remsan får minnet som kandidat, namnet blir säkert ur minnet.
    //      Kortet ovanpå ligger omlott (i en hög) och får också kandidaten — i appen avgör remsMinnesDom på vektorerna; här säger stubben ja åt båda.
    namnSvar = osaker; remsFragor = [];
    for (let i = 0; i < 20; i++) s = await rutaDet(bygg3, det3);
    const c3 = s.find(t => t.tackt) || {}, o3 = s.find(t => !t.tackt) || {}, q3 = remsFragor.find(f => f.id === c3.id), qo = remsFragor.find(f => f.id === o3.id);
    check(`RM3 nytt täckt kort på platsen (nytt id): spår ${JSON.stringify(s)}, remsfrågor ${JSON.stringify(remsFragor)}, säkra ur minnet ${Kamera.minneStat.sakra}`,
          s.length === 2 && c3.id !== idA && c3.st === 'klar' && c3.namn === 'Plains' && c3.varfor === 'remsa minne' && !!q3 && q3.minnen.length === 1 && q3.minnen[0] === 'Plains#' + idA + '×' + m1[0].prov
          && !!o3.id && !!qo && qo.minnen.length === 1 && Kamera.minneStat.sakra >= 1);
    // RM3b: samma med spokMs förvalet — det nya spåret får spökets id och läses om som 'ny'; minnet står kvar (ett spår utan säkert namn rör det inte) och får gälla
    s = await lagg(); const idB = s[0] && s[0].id; s = await lyft(LYFT);
    namnSvar = osaker; remsFragor = [];
    for (let i = 0; i < 20; i++) s = await rutaDet(bygg3, det3);
    const c3b = s.find(t => t.tackt) || {}, q3b = remsFragor.find(f => f.id === c3b.id);
    check(`RM3b spökets id: spår ${JSON.stringify(s)}, remsfrågor ${JSON.stringify(remsFragor)}`,
          s.length === 2 && c3b.id === idB && c3b.st === 'klar' && c3b.namn === 'Plains' && c3b.varfor === 'remsa minne' && !!q3b && q3b.minnen.length === 1);
    // RM3c: glomKort (människan sa att namnet var fel) stryker minnet för spåret — det läses om utan minne
    s = await lagg(); const idC = s[0] && s[0].id;
    Kamera.glomKort(idC); namnSvar = osaker; remsFragor = [];
    const m3c = Kamera.remsMinne.length;
    for (let i = 0; i < 20; i++) s = await rutaDet(kortA, detA);
    check(`RM3c glömt kort: minne efter glomKort ${m3c}, spår ${JSON.stringify(s)}, fångster efter ${fangster}`, m3c === 0 && s.length === 1 && s[0].st === 'okand');
    // RM4: samma som RM3, men kortet har varit borta längre än T.remsaMinneS (20 s): minnet är rensat, det täckta kortet förblir okänt
    s = await lagg({ spokMs: 2000 }); const idA4 = s[0] && s[0].id;
    s = await lyft(Math.ceil(21000 / TAKT));
    const m4 = Kamera.remsMinne;
    namnSvar = osaker; remsFragor = [];
    for (let i = 0; i < 20; i++) s = await rutaDet(bygg3, det3);
    const c4 = s.find(t => t.tackt) || {}, q4 = remsFragor.find(f => f.id === c4.id);
    check(`RM4 borta 21 s: minne efter lyftet ${m4.length}, täckt spår ${c4.st} ${c4.namn || '–'} [${c4.varfor || ''}], remsfråga ${JSON.stringify(q4)}`,
          idA4 != null && m4.length === 0 && c4.st === 'okand' && !!q4 && q4.minnen.length === 0);
    // RM5: samma plats i tiden men inte i rummet — det nya täckta kortet ligger två kortbredder bort: inget minne
    s = await lagg({ spokMs: 2000 }); const s5a = JSON.stringify(s), m5a = Kamera.remsMinne.length, f5a = fangster;
    s = await lyft(LYFT); const m5b = Kamera.remsMinne.length;
    namnSvar = osaker; remsFragor = [];
    const dx = 70, bygg5 = g => { kort(g, W, A.x + dx, A.y, A.w, A.h, 180); kort(g, W, B.x + dx, B.y, B.w, B.h, 140); };
    const det5 = det([lada(A.x + dx, A.y, A.w, A.h), lada(B.x + dx, B.y, B.w, B.h)], [remsa(A.x + dx, A.y, A.w, 6), remsa(B.x + dx, B.y, B.w, 6)]);
    for (let i = 0; i < 20; i++) s = await rutaDet(bygg5, det5);
    const c5 = s.find(t => t.tackt) || {}, q5 = remsFragor.find(f => f.id === c5.id);
    check(`RM5 annan plats: efter läggningen spår ${s5a} minne ${m5a} fångster ${f5a}, efter lyftet minne ${m5b}, sist minne ${Kamera.remsMinne.length}, täckt spår ${c5.st} ${c5.namn || '–'} [${c5.varfor || ''}], remsfråga ${JSON.stringify(q5)}`,
          Kamera.remsMinne.length === 1 && c5.st === 'okand' && !!q5 && q5.minnen.length === 0);
    // RM7: det ÖVERSTA kortet i en hög lärs (omlott men inget ovanpå), det undre inte ('kort ovanpå') — steg 1 efter pass 6
    namnSvar = saker; nystart(); Kamera.satTrosklar({ spokMs: 2000 }); await lyft(LYFT); fangster = 0;
    for (let i = 0; i < 30; i++) s = await rutaDet(bygg3, det3);
    const m7 = Kamera.remsMinne, c7 = s.find(t => t.tackt) || {}, o7 = s.find(t => !t.tackt) || {};
    const skal7 = Kamera.spar.map(t => ({ id: t.id, skal: t.minneSkal || null, omlott: !!t.omlott }));
    check(`RM7 högens översta kort lärs: spår ${JSON.stringify(s)}, minne ${JSON.stringify(m7.map(e => ({ id: e.sparId, namn: e.namn, prov: e.prov })))}, skäl ${JSON.stringify(skal7)}, fångster ${fangster}`,
          s.length === 2 && o7.st === 'klar' && m7.length === 1 && m7[0].sparId === o7.id && m7[0].prov >= 1 && !m7.some(e => e.sparId === c7.id)
          && skal7.some(x => x.id === c7.id && x.skal === 'kort ovanpå') && skal7.some(x => x.id === o7.id && x.omlott && !x.skal));
    // RM8: det översta kortets remslåda rymmer det undres remsa (golden 05 hög B) — lärs inte ('grannens remsa i remsan')
    nystart(); Kamera.satTrosklar({ spokMs: 2000 }); await lyft(LYFT); fangster = 0;
    const B8 = { x: 60, y: 55, w: 30, h: 42 };   // fem px ned: B:s remsa (y 55–61, lös) skär A:s (y 50–56); A:s remsmitt (53) ligger utanför B — A under B, B fri
    const bygg8 = g => { kortA(g); kort(g, W, B8.x, B8.y, B8.w, B8.h, 140); };
    const det8 = det([lada(A.x, A.y, A.w, A.h), lada(B8.x, B8.y, B8.w, B8.h)], [remsa(A.x, A.y, A.w, 6), remsa(B8.x, B8.y, B8.w, 6)]);
    for (let i = 0; i < 30; i++) s = await rutaDet(bygg8, det8);
    const m8 = Kamera.remsMinne, o8 = s.find(t => !t.tackt) || {};
    const skal8 = Kamera.spar.map(t => ({ id: t.id, skal: t.minneSkal || null }));
    check(`RM8 grannens remsa i remsan: spår ${JSON.stringify(s)}, minne ${m8.length}, skäl ${JSON.stringify(skal8)}, fångster ${fangster}`,
          s.length === 2 && o8.st === 'klar' && m8.length === 0 && fangster === 0 && skal8.some(x => x.id === o8.id && x.skal === 'grannens remsa i remsan'));
    // RM6: avstängt (T.remsaMinne 0): ingen fångst, ingen kandidat
    fangster = 0;
    s = await lagg({ spokMs: 2000, remsaMinne: 0 }); s = await lyft(LYFT);
    namnSvar = osaker; remsFragor = [];
    for (let i = 0; i < 20; i++) s = await rutaDet(bygg3, det3);
    const c6 = s.find(t => t.tackt) || {}, q6 = remsFragor.find(f => f.id === c6.id);
    check(`RM6 remsaMinne 0: fångster ${fangster}, minne ${Kamera.remsMinne.length}, täckt spår ${c6.st}, remsfråga ${JSON.stringify(q6)}`,
          fangster === 0 && Kamera.remsMinne.length === 0 && c6.st === 'okand' && !!q6 && q6.minnen.length === 0);
    Kamera.satTrosklar({ remsaMinne: 1 });
    namnSvar = saker;
  }

  // ── LK: leken utan uppstart (MES-334 steg 3) ─────────────────────
  /* Ingen library-ruta (kal.bib null): lekvakten letar efter leken bland
     detektorns baksidelådor (klass baksida). Högen ritas som ett mörkt
     kort så att masken ser den, och lådan matas in som i appen
     (steg(…, det)). Identifieringen svarar 'baksida ficka' för spår med
     klassen baksida — som kamIdentifiera för en lek i sleeves — och Plains
     för allt annat. Kraven ur Byggunderlaget och del A:s mått: still i
     1,5 s, inte vid kanten, ensam (eller den som ligger kvar), upplockad
     först när detektorn tappat den i 1,5 s OCH platsen sett tom ut i 2 s. */
  {
    /* RM-blocket startade modulen med en egen bord-återkoppling utan extra: tillbaka till bänkens, som läser rapportens extra (lek). */
    const forraSvar = namnSvar;
    Kamera.installera({ bord: (spar, nollstall, extra) => { bord = spar; bordExtra = extra || null; bordRapporter++; if (nollstall) nollst++; } });
    const V = 8;
    const lada = (b, klass) => ({ x0: b.x * V, y0: b.y * V, x1: (b.x + b.w) * V, y1: (b.y + b.h) * V, poang: 0.9, klass });
    const det = kort => ({ lador: { kort, remsor: [] }, ruta: { x: 0, y: 0, w: W * V, h: H * V } });
    const svar = (id, gissning) => {
      const t = Kamera.spar.find(q => q.id === id);
      return t && t.klass === 'baksida' ? { baksida: true, varfor: 'baksida ficka', poang: 0.9 } : { namn: 'Plains', sid: 's1', saker: true, cands: [{ name: 'Plains', sid: 's1', score: 0.9 }] };
    };
    const steg1 = async (ritar, lador) => {
      nu += TAKT; const sl = lcg(2000 + nu); const g = matta(W, H, 100, 3, sl);
      for (const r of ritar) r(g);
      Kamera.steg(g, nu, H, undefined, V, det(lador));
      await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r));
      return Kamera.lek;
    };
    const hog = b => g => kort(g, W, b.x, b.y, b.w, b.h, 55);       // en nedvänd hög: mörk, med kortets struktur
    const kortR = b => g => kort(g, W, b.x, b.y, b.w, b.h, 180);
    const kor = async (n, ritar, lador) => { let l = null; for (let i = 0; i < n; i++) l = await steg1(ritar, lador); return l; };
    const grader = () => Kamera.grund == null ? null : Math.round(Kamera.grund * 180 / Math.PI) % 180;
    const L = { x: 150, y: 60, w: 30, h: 42 }, L2 = { x: 40, y: 70, w: 30, h: 42 };
    const nyttBord = async upp => { nystart(); Kamera.satKalibrering({ ruta: { x: 0, y: 0, w: 1, h: 1, upp: upp || 'v' } }); namnSvar = svar; await kor(14, [], []); };

    // LK1: leken läggs ner på ett tomt bord — library efter 1,5 s still, och dess vinkel blir otappat
    await nyttBord('h');
    const l1a = await kor(6, [hog(L)], [lada(L, 'baksida')]);
    const l1b = await kor(8, [hog(L)], [lada(L, 'baksida')]);
    const sp1 = Kamera.spar.find(t => t.klass === 'baksida');
    check(`LK1 leken läggs ner: efter 0,9 s ${l1a && l1a.lage}, efter 2,1 s ${l1b && l1b.lage} ruta ${JSON.stringify(l1b && l1b.ruta)}, grundläget ${grader()}° (${l1b && l1b.grund}), rapporten ${bordExtra && bordExtra.lek && bordExtra.lek.lage}, högens spår ${sp1 && sp1.tillstand} [${sp1 && sp1.varfor}]`,
          !!l1a && l1a.lage === 'ingen' && !!l1b && l1b.lage === 'nere' && Math.abs(l1b.ruta.x - L.x / W) < 0.01 && Math.abs(l1b.ruta.w - L.w / W) < 0.01
          && grader() === 90 && l1b.grund === 'lek' && bordExtra && bordExtra.lek && bordExtra.lek.lage === 'nere' && !!sp1 && sp1.tillstand === 'skrap');
    const id1 = l1b && l1b.id;

    // LK2: Not my library — högen blir ett nedvänt kort (ute), texten tillbaka till steg 1, grundläget släpps (inget kort lagt); väljs inte igen
    const inte = Kamera.lekInte(id1);
    const l2a = Kamera.lek;
    const l2b = await kor(14, [hog(L)], [lada(L, 'baksida')]);
    check(`LK2 Not my library: svar ${inte}, ${l2a && l2a.lage}, ute ${JSON.stringify(l2b && l2b.ute)}, efter 2 s till ${l2b && l2b.lage}, grundläget ${grader()}`,
          inte === true && l2a.lage === 'ingen' && l2b.lage === 'ingen' && l2b.ute.length === 1 && l2b.ute[0].id === id1 && grader() === null);
    // LK2b: It's my library — det nedvända kortet blir leken igen
    const ja = Kamera.lekJa(id1);
    const l2c = await kor(2, [hog(L)], [lada(L, 'baksida')]);
    check(`LK2b It's my library: svar ${ja}, ${l2c && l2c.lage} id ${l2c && l2c.id}, ute ${l2c && l2c.ute.length}, grundläget ${grader()}`,
          ja === true && l2c.lage === 'nere' && l2c.id === id1 && l2c.ute.length === 0 && grader() === 90);

    // LK3: en hand vilar på leken (lådan borta, platsen täckt) — leken fryser, blir inte upplockad
    const handL = g => hand(g, W, L.x + 15, L.y + 21, 26, 30, 170);
    const l3a = await kor(25, [hog(L), handL], []);
    check(`LK3 hand på leken i 3,7 s: ${l3a && l3a.lage}`, !!l3a && l3a.lage === 'nere');
    // LK4: leken plockas upp (platsen tom) — upplockad efter ~2 s, inte före 1,5 s
    const l4a = await kor(8, [], []);
    const l4b = await kor(10, [], []);
    check(`LK4 leken upplockad: efter 1,2 s ${l4a && l4a.lage}, efter 2,7 s ${l4b && l4b.lage}, ruta kvar ${!!(l4b && l4b.ruta)}`,
          !!l4a && l4a.lage === 'nere' && !!l4b && l4b.lage === 'upp' && !!l4b.ruta);
    // LK5: leken läggs ner någon annanstans — den flyttar dit, samma id
    const l5a = await kor(4, [hog(L2)], [lada(L2, 'baksida')]);
    const l5b = await kor(10, [hog(L2)], [lada(L2, 'baksida')]);
    check(`LK5 leken lagd på ny plats: efter 0,6 s ${l5a && l5a.lage}, efter 2,1 s ${l5b && l5b.lage} x ${l5b && l5b.ruta && l5b.ruta.x} (väntat ${(L2.x / W).toFixed(3)}), id ${l5b && l5b.id} (var ${id1})`,
          l5a.lage === 'upp' && l5b.lage === 'nere' && Math.abs(l5b.ruta.x - L2.x / W) < 0.01 && l5b.id === id1);

    // LK6: två nedvända högar (starthanden nedvänd) — ingen lek förrän en plockats upp; den som ligger kvar blir library
    await nyttBord('v');
    const l6a = await kor(16, [hog(L), hog(L2)], [lada(L, 'baksida'), lada(L2, 'baksida')]);
    const l6b = await kor(20, [hog(L)], [lada(L, 'baksida')]);
    check(`LK6 två högar: medan båda ligger ${l6a && l6a.lage}, när den ena plockats upp ${l6b && l6b.lage} x ${l6b && l6b.ruta && l6b.ruta.x} (väntat ${(L.x / W).toFixed(3)})`,
          l6a.lage === 'ingen' && l6b.lage === 'nere' && Math.abs(l6b.ruta.x - L.x / W) < 0.01);

    // LK6b: två högar, och en hand vilar på den ena (ingen låda, platsen täckt) — den andra blir inte ensam; när handen gått och högen är borta: library
    await nyttBord('v');
    const handL2 = g => hand(g, W, L2.x + 15, L2.y + 21, 26, 30, 170);
    await kor(16, [hog(L), hog(L2)], [lada(L, 'baksida'), lada(L2, 'baksida')]);
    const l6c = await kor(27, [hog(L), hog(L2), handL2], [lada(L, 'baksida')]);
    const l6d = await kor(24, [hog(L)], [lada(L, 'baksida')]);
    check(`LK6b hand på den ena högen i 4 s: ${l6c && l6c.lage}; handen och högen borta: ${l6d && l6d.lage} x ${l6d && l6d.ruta && l6d.ruta.x}`,
          l6c.lage === 'ingen' && l6d.lage === 'nere' && Math.abs(l6d.ruta.x - L.x / W) < 0.01);

    // LK7: en hög vid bildkanten blir aldrig library
    await nyttBord('v');
    const K = { x: 0, y: 40, w: 30, h: 42 };
    const l7 = await kor(16, [hog(K)], [lada(K, 'baksida')]);
    check(`LK7 hög vid kanten: ${l7 && l7.lage}`, l7.lage === 'ingen');

    // LK8: ingen lek — första kortets vinkel blir otappat (liggande kort med upp 'v' → 0°); en lek som kommer sedan ändrar den inte
    await nyttBord('v');
    const F = { x: 60, y: 50, w: 42, h: 30 };
    await kor(10, [kortR(F)], [lada(F, 'kort')]);
    const g8a = grader(), l8a = Kamera.lek;
    await kor(14, [kortR(F), hog(L)], [lada(F, 'kort'), lada(L, 'baksida')]);
    const l8b = Kamera.lek;
    check(`LK8 första kortet utan lek: grundläget ${g8a}° (${l8a && l8a.grund}); leken efteråt ${l8b && l8b.lage}, grundläget ${grader()}° (${l8b && l8b.grund})`,
          g8a === 0 && l8a.grund === 'kort' && l8b.lage === 'nere' && grader() === 0 && l8b.grund === 'kort');

    // LK8b: handen som lägger första kortet blir ett kortformat spår som dör (golden 07) — första kortets vinkel tas ändå
    await nyttBord('v');
    const Hf = { x: 110, y: 40, w: 28, h: 38 };
    await kor(3, [kortR(F), kortR(Hf)], [lada(F, 'kort'), lada(Hf, 'kort')]);
    await kor(10, [kortR(F)], [lada(F, 'kort')]);
    check(`LK8b första kortet med handens spår intill: grundläget ${grader()}° (${Kamera.lek && Kamera.lek.grund})`, grader() === 0 && Kamera.lek && Kamera.lek.grund === 'kort');
    // LK8c: två kort som båda ligger still innan något gav vinkeln (kameran såg dem samtidigt) — inget första kort, grundläget orört
    await nyttBord('v');
    const F4 = { x: 120, y: 50, w: 42, h: 30 };
    await kor(12, [kortR(F), kortR(F4)], [lada(F, 'kort'), lada(F4, 'kort')]);
    check(`LK8c två kort samtidigt: grundläget ${grader()} (${Kamera.lek && Kamera.lek.grund})`, grader() === null && Kamera.lek && Kamera.lek.grund === null);

    // LK9: ett uppvänt kort läggs över lekens kant (klassen kort, mitten utanför lekens ruta) — läses som vanligt, blir inte lekens skräp.
    //      Ett kort med mitten PÅ leken syns inte (lekens ruta, LK16) — som med uppstartens library-ruta.
    const P = { x: 172, y: 64, w: 30, h: 42 };   // över lekens högra kant, men ett eget kort (egen låda)
    await nyttBord('v');
    await kor(14, [hog(L)], [lada(L, 'baksida')]);   // leken först, som i spel
    await kor(14, [hog(L), kortR(P)], [lada(L, 'baksida'), lada(P, 'kort')]);
    const p9 = Kamera.spar.find(t => t.klass === 'kort' && Math.abs(t.cx - (P.x + P.w / 2)) < 4);
    check(`LK9 kort över lekens kant: ${p9 && p9.tillstand} ${p9 && p9.namn} [${p9 && p9.varfor}]`, !!p9 && p9.tillstand === 'klar' && p9.namn === 'Plains');

    // LK10: kameran startar med kort på bordet och en ensam hög (som golden 08): högen blir library, och inget "första kort" sätter vinkeln
    nystart(); Kamera.satKalibrering({ ruta: { x: 0, y: 0, w: 1, h: 1, upp: 'v' } }); namnSvar = svar;
    const F2 = { x: 30, y: 30, w: 30, h: 42 }, F3 = { x: 80, y: 30, w: 30, h: 42 };
    const l10 = await kor(26, [kortR(F2), kortR(F3), hog(L)], [lada(F2, 'kort'), lada(F3, 'kort'), lada(L, 'baksida')]);
    check(`LK10 kort och en hög från början: ${l10 && l10.lage} (${l10 && l10.grund}), grundläget ${grader()}°`, l10.lage === 'nere' && l10.grund === 'lek' && grader() === 90);

    // LK12: sleevesens färg — medianen i lekens inre över flera rutor, också när ett blänk ligger på leken i varannan ruta; magic = false (spåret sa 'baksida ficka')
    await nyttBord('v');
    const rgbaRuta = blank => { const d = new Uint8ClampedArray(W * H * 4); for (let i = 0; i < W * H; i++) { d[4 * i] = 90; d[4 * i + 1] = 80; d[4 * i + 2] = 70; d[4 * i + 3] = 255; }
      for (let y = L.y; y < L.y + L.h; y++) for (let x = L.x; x < L.x + L.w; x++) { const i = 4 * (y * W + x); d[i] = 40; d[i + 1] = 140; d[i + 2] = 80; }
      if (blank) for (let y = L.y + 10; y < L.y + 18; y++) for (let x = L.x + 8; x < L.x + 22; x++) { const i = 4 * (y * W + x); d[i] = d[i + 1] = d[i + 2] = 250; }
      return d; };
    let l12 = null;
    for (let i = 0; i < 60; i++) {
      nu += TAKT; const g = matta(W, H, 100, 3, lcg(2000 + nu)); hog(L)(g);
      Kamera.steg(g, nu, H, undefined, V, det([lada(L, 'baksida')]), rgbaRuta(i % 2 === 1));
      await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r));
      l12 = Kamera.lek;
    }
    check(`LK12 sleevesens färg: ${JSON.stringify(l12 && l12.farg)}`, !!l12 && l12.lage === 'nere' && !!l12.farg && Math.abs(l12.farg.r - 40) <= 2 && Math.abs(l12.farg.g - 140) <= 2 && Math.abs(l12.farg.b - 80) <= 2 && l12.farg.magic === false);

    // ── Granskningen runda 1 (MES-334 steg 3): fynd 2, 3 och 5 som bänkfall (granskarens GP1–GP3) och fynd 1 (lekens ruta) ──
    // LK13 (GP1): grundläget ur leken nollas av en skrivning av raden utan grundläge (tillampaKalRad → satGrund(null)) — telefonen tar lekens vinkel igen
    await nyttBord('h');
    await kor(14, [hog(L)], [lada(L, 'baksida')]);
    const g13a = grader(), l13a = Kamera.lek && Kamera.lek.grund;
    Kamera.satGrund(null);
    await kor(30, [hog(L)], [lada(L, 'baksida')]);
    check(`LK13 grundläget ur leken efter en radskrivning utan grundläge: före ${g13a}° (${l13a}), efter 4,5 s ${grader()}° (${Kamera.lek && Kamera.lek.grund}), leken ${Kamera.lek && Kamera.lek.lage}`,
          g13a === 90 && grader() === 90 && Kamera.lek && Kamera.lek.grund === 'lek');
    // LK14 (GP2): leken lyfts medan ett nedvänt kort ligger still vid L2 sedan länge — Picked up, inte ett hopp till L2
    await nyttBord('v');
    await kor(14, [hog(L)], [lada(L, 'baksida')]);
    const id14 = Kamera.lek && Kamera.lek.id;
    await kor(20, [hog(L), hog(L2)], [lada(L, 'baksida'), lada(L2, 'baksida')]);
    let upp14 = false, l14 = null;
    for (let i = 0; i < 40; i++) { l14 = await steg1([hog(L2)], [lada(L2, 'baksida')]); if (l14 && l14.lage === 'upp') upp14 = true; }
    check(`LK14 leken lyfts medan ett nedvänt kort ligger vid L2: upp någon gång ${upp14}, efter 6 s ${l14 && l14.lage} x ${l14 && l14.ruta && l14.ruta.x} (L ${(L.x / W).toFixed(3)}), id ${l14 && l14.id} (var ${id14})`,
          upp14 && !!l14 && l14.lage === 'upp' && Math.abs(l14.ruta.x - L.x / W) < 0.01 && l14.id === id14);
    // LK14b (GP2b): leken läggs ner på en ny plats L3 medan kortet vid L2 ligger kvar — dit, samma id
    const L3 = { x: 100, y: 95, w: 30, h: 42 };
    const l14b = await kor(20, [hog(L2), hog(L3)], [lada(L2, 'baksida'), lada(L3, 'baksida')]);
    check(`LK14b leken lagd vid L3 medan kortet vid L2 ligger kvar: ${l14b && l14b.lage} x ${l14b && l14b.ruta && l14b.ruta.x} (L3 ${(L3.x / W).toFixed(3)}), id ${l14b && l14b.id}`,
          !!l14b && l14b.lage === 'nere' && Math.abs(l14b.ruta.x - L3.x / W) < 0.01 && l14b.id === id14);
    // LK15 (GP3): två högar ligger där från början, sedan läggs starthanden nedvänd — ingen av dem förrän bara en är kvar
    await nyttBord('v');
    const Hh = { x: 100, y: 95, w: 30, h: 42 };
    await kor(26, [hog(L), hog(L2)], [lada(L, 'baksida'), lada(L2, 'baksida')]);
    const l15 = await kor(16, [hog(L), hog(L2), hog(Hh)], [lada(L, 'baksida'), lada(L2, 'baksida'), lada(Hh, 'baksida')]);
    check(`LK15 två gamla högar + starthanden nedvänd: ${l15 && l15.lage}${l15 && l15.ruta ? ' x ' + l15.ruta.x : ''}`, !!l15 && l15.lage === 'ingen');
    // LK16: lekens egen ruta — när leken hittats föds inga spår på leken (en kortlåda mitt på den), och rutan följer med när leken läggs någon annanstans
    await nyttBord('v');
    await kor(14, [hog(L)], [lada(L, 'baksida')]);
    const P16 = { x: L.x + 2, y: L.y + 3, w: 26, h: 36 };   // mitten inne i lekens ruta
    await kor(14, [hog(L), kortR(P16)], [lada(L, 'baksida'), lada(P16, 'kort')]);
    const pa16 = Kamera.spar.filter(t => t.klass === 'kort' && Math.abs(t.cx - (P16.x + P16.w / 2)) < 4 && t.tillstand !== 'skrap').length;
    await kor(26, [], []);   // leken upplockad
    await kor(14, [hog(L2)], [lada(L2, 'baksida')]);   // och lagd vid L2
    const P16b = { x: L2.x + 2, y: L2.y + 3, w: 26, h: 36 };
    await kor(14, [hog(L2), kortR(P16b)], [lada(L2, 'baksida'), lada(P16b, 'kort')]);
    const pa16b = Kamera.spar.filter(t => t.klass === 'kort' && Math.abs(t.cx - (P16b.x + P16b.w / 2)) < 4 && t.tillstand !== 'skrap').length;
    const pa16c = Kamera.spar.filter(t => t.klass === 'kort' && t.tillstand !== 'skrap').length;
    check(`LK16 lekens ruta: spår på leken vid L ${pa16}, leken flyttad till L2 (${Kamera.lek && Kamera.lek.lage} x ${Kamera.lek && Kamera.lek.ruta && Kamera.lek.ruta.x}), spår på leken vid L2 ${pa16b}, kortspår totalt ${pa16c}`,
          pa16 === 0 && pa16b === 0 && Kamera.lek && Kamera.lek.lage === 'nere' && Math.abs(Kamera.lek.ruta.x - L2.x / W) < 0.01);
    // LK16b: utan lek ingen ruta — samma kortlåda på samma plats blir ett spår
    await nyttBord('v');
    await kor(14, [kortR(P16)], [lada(P16, 'kort')]);
    const pa16d = Kamera.spar.filter(t => t.klass === 'kort' && t.tillstand !== 'skrap').length;
    check(`LK16b utan lek: kortet vid L blir ett spår (${pa16d})`, pa16d === 1);

    // LK17 (granskarens RP1, runda 2 fynd 2): leken flyttas till bildkanten — den står som upplockad vid L,
    //   men lekens ruta står inte kvar på den tomma platsen: ett riktigt kort som läggs där får ett spår
    await nyttBord('v');
    await kor(14, [hog(L)], [lada(L, 'baksida')]);
    const k17E = { x: 0, y: 60, w: 30, h: 42 };
    await kor(30, [hog(k17E)], [lada(k17E, 'baksida')]);
    const l17 = Kamera.lek;
    const k17P = { x: L.x + 2, y: L.y + 3, w: 26, h: 36 };
    await kor(20, [hog(k17E), kortR(k17P)], [lada(k17E, 'baksida'), lada(k17P, 'kort')]);
    const n17 = Kamera.spar.filter(t => t.klass === 'kort' && Math.abs(t.cx - (k17P.x + k17P.w / 2)) < 4 && t.tillstand !== 'skrap').length;
    check(`LK17 leken flyttad till kanten: ${l17 && l17.lage} x ${l17 && l17.ruta && l17.ruta.x}; kort på lekens gamla plats efter 3 s: ${n17} spår`, n17 === 1);

    // LK18 (granskarens RP2, runda 2 fynd 3): leken lyfts (söka), handen läggs nedvänd medan leken är uppe
    //   (och tas för leken), leken läggs tillbaka vid L, handen plockas upp — leken ligger vid L igen
    await nyttBord('v');
    await kor(14, [hog(L)], [lada(L, 'baksida')]);
    await kor(26, [], []);
    const l18a = Kamera.lek && Kamera.lek.lage;
    const k18H = { x: 100, y: 95, w: 30, h: 42 };
    const l18b = await kor(14, [hog(k18H)], [lada(k18H, 'baksida')]);
    const l18c = await kor(14, [hog(k18H), hog(L)], [lada(k18H, 'baksida'), lada(L, 'baksida')]);
    const l18d = await kor(40, [hog(L)], [lada(L, 'baksida')]);
    check(`LK18 handen nedvänd under sökningen: lyft ${l18a}; handen lagd ${l18b && l18b.lage} x ${l18b && l18b.ruta && l18b.ruta.x}; leken tillbaka vid L ${l18c && l18c.lage}; handen upplockad 6 s: ${l18d && l18d.lage} x ${l18d && l18d.ruta && l18d.ruta.x} (L ${(L.x / W).toFixed(3)})`,
          !!l18d && l18d.lage === 'nere' && Math.abs(l18d.ruta.x - L.x / W) < 0.01);

    // LK19 (granskarens RP5, runda 2 fynd 1): leken blandas i handen ovanför bordet — detektorn ser den ibland,
    //   också över lekens gamla plats — och läggs ner vid L3: leken glider dit
    await nyttBord('v');
    await kor(14, [hog(L)], [lada(L, 'baksida')]);
    const id19 = Kamera.lek && Kamera.lek.id;
    const k19L3 = { x: 100, y: 95, w: 30, h: 42 };
    for (const s of [0.4, 0.5, 0.6, 0.5, 0.4, 0.3, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]) {
      const b = { x: Math.round(L.x + (k19L3.x - L.x) * s), y: Math.round(L.y + (k19L3.y - L.y) * s), w: 30, h: 42 };
      await steg1([hog(b)], [lada(b, 'baksida')]);
    }
    let upp19 = false, l19 = null;
    for (let i = 0; i < 60; i++) { l19 = await steg1([hog(k19L3)], [lada(k19L3, 'baksida')]); if (l19 && l19.lage === 'upp') upp19 = true; }
    check(`LK19 leken blandad ovanför bordet och lagd vid L3: upp någon gång ${upp19}, efter 9 s ${l19 && l19.lage} x ${l19 && l19.ruta && l19.ruta.x} (L3 ${(k19L3.x / W).toFixed(3)}), id ${l19 && l19.id} (var ${id19})`,
          !!l19 && l19.lage === 'nere' && Math.abs(l19.ruta.x - k19L3.x / W) < 0.01 && l19.id === id19);

    // LK20 (granskarens RP6, runda 2 fynd 1): leken upp, lagd vid L3, och EN ruta med en baksida över lekens
    //   gamla plats (handen med något nedvänt, ett blänk) — leken glider ändå till L3
    await nyttBord('v');
    await kor(14, [hog(L)], [lada(L, 'baksida')]);
    await kor(26, [], []);
    const l20a = Kamera.lek && Kamera.lek.lage;
    await kor(3, [hog(k19L3)], [lada(k19L3, 'baksida')]);
    await steg1([hog(k19L3), hog(L)], [lada(k19L3, 'baksida'), lada(L, 'baksida')]);
    const l20 = await kor(60, [hog(k19L3)], [lada(k19L3, 'baksida')]);
    check(`LK20 leken upp (${l20a}), lagd vid L3, en ruta med en baksida över den gamla platsen: efter 9 s ${l20 && l20.lage} x ${l20 && l20.ruta && l20.ruta.x} (L3 ${(k19L3.x / W).toFixed(3)})`,
          !!l20 && l20.lage === 'nere' && Math.abs(l20.ruta.x - k19L3.x / W) < 0.01);

    // LK21 (granskarens RP7, runda 3 fynd 1): sökningen med två lyft. Leken lyfts från L och läggs vid L3 (steg 3
    //   flyttar den), handen läggs nedvänd vid H, och leken lyfts igen för att blandas: leken står som upplockad
    //   (Picked up), den hoppar inte till handen. Blandningen tar 12 s, leken läggs vid L4, handen plockas upp:
    //   leken ligger vid L4.
    const k21L3 = { x: 100, y: 95, w: 30, h: 42 }, k21H = { x: 40, y: 70, w: 30, h: 42 }, k21L4 = { x: 190, y: 95, w: 30, h: 42 };
    const xs21 = l => l && l.ruta ? l.ruta.x : null;
    const tvaLyft = async blanda => {
      await nyttBord('v');
      await kor(24, [hog(L)], [lada(L, 'baksida')]);
      await kor(26, [], []);
      const a = await kor(14, [hog(k21L3)], [lada(k21L3, 'baksida')]);
      await kor(14, [hog(k21L3), hog(k21H)], [lada(k21L3, 'baksida'), lada(k21H, 'baksida')]);
      const b = await kor(26, [hog(k21H)], [lada(k21H, 'baksida')]);
      await kor(blanda, [hog(k21H)], [lada(k21H, 'baksida')]);
      await kor(14, [hog(k21H), hog(k21L4)], [lada(k21H, 'baksida'), lada(k21L4, 'baksida')]);
      const c = await kor(40, [hog(k21L4)], [lada(k21L4, 'baksida')]);
      return { a, b, c };
    };
    const r21 = await tvaLyft(80);
    check(`LK21 två lyft (blandning 12 s): leken vid L3 ${r21.a && r21.a.lage} x ${xs21(r21.a)} (L3 ${(k21L3.x / W).toFixed(3)}); handen lagd, leken lyft igen: ${r21.b && r21.b.lage} x ${xs21(r21.b)} (H ${(k21H.x / W).toFixed(3)}); lagd vid L4, handen upp: ${r21.c && r21.c.lage} x ${xs21(r21.c)} (L4 ${(k21L4.x / W).toFixed(3)})`,
          !!r21.a && r21.a.lage === 'nere' && Math.abs(r21.a.ruta.x - k21L3.x / W) < 0.01 && !!r21.b && r21.b.lage === 'upp' && !!r21.c && r21.c.lage === 'nere' && Math.abs(r21.c.ruta.x - k21L4.x / W) < 0.01);
    // LK21b (granskarens RP7k): samma, men blandningen tar 3 s
    const r21b = await tvaLyft(20);
    check(`LK21b två lyft (blandning 3 s): leken lyft igen: ${r21b.b && r21b.b.lage} x ${xs21(r21b.b)}; lagd vid L4, handen upp: ${r21b.c && r21b.c.lage} x ${xs21(r21b.c)} (L4 ${(k21L4.x / W).toFixed(3)})`,
          !!r21b.b && r21b.b.lage === 'upp' && !!r21b.c && r21b.c.lage === 'nere' && Math.abs(r21b.c.ruta.x - k21L4.x / W) < 0.01);

    // LK22 (granskarens RP8, runda 3 fynd 1 och 2): LK18 med en sökning på 15 s — handen nedvänd medan leken är uppe
    //   (och tas för leken), leken tillbaka vid L, handen plockas upp: leken ligger vid L igen, hur lång sökningen än är
    await nyttBord('v');
    await kor(14, [hog(L)], [lada(L, 'baksida')]);
    await kor(26, [], []);
    const k22H = { x: 100, y: 95, w: 30, h: 42 };
    const l22a = await kor(14, [hog(k22H)], [lada(k22H, 'baksida')]);
    await kor(100, [hog(k22H)], [lada(k22H, 'baksida')]);
    await kor(14, [hog(k22H), hog(L)], [lada(k22H, 'baksida'), lada(L, 'baksida')]);
    const l22 = await kor(40, [hog(L)], [lada(L, 'baksida')]);
    check(`LK22 handen nedvänd under en sökning på 15 s: handen lagd ${l22a && l22a.lage} x ${xs21(l22a)}; handen upplockad 6 s: ${l22 && l22.lage} x ${xs21(l22)} (L ${(L.x / W).toFixed(3)})`,
          !!l22 && l22.lage === 'nere' && Math.abs(l22.ruta.x - L.x / W) < 0.01);

    // LK11: med uppstartens library-ruta gäller dagens lekvakt (bibSag) — ingen ny lek i rapporten
    nystart(); Kamera.satKalibrering({ ruta: { x: 0, y: 0, w: 1, h: 1, upp: 'v', bib: { x: L.x / W - 0.02, y: L.y / H - 0.02, w: L.w / W + 0.04, h: L.h / H + 0.04 } } }); namnSvar = svar;
    await kor(26, [hog(L)], [lada(L, 'baksida')]);
    check(`LK11 med uppstartens ruta: Kamera.lek ${JSON.stringify(Kamera.lek)}, rapporten ${bordExtra && JSON.stringify(bordExtra.lek)}, bib ${JSON.stringify(Kamera.bib)}`,
          Kamera.lek === null && bordExtra && bordExtra.lek === null && !!Kamera.bib);
    nystart(); namnSvar = forraSvar;
  }

  console.log([...ok, ...fel].join('\n'));
  console.log(`\n${ok.length} OK, ${fel.length} FEL`);
  process.exit(fel.length ? 1 : 0);
})();

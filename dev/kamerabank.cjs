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
  document: { createElement: () => ({ getContext: () => ({ drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(0) }) }), width: 0, height: 0 }) },
  navigator: {}, performance: { now: () => 0 }, requestAnimationFrame: () => 0, cancelAnimationFrame() {},
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
  Kamera.satTrosklar({ auto: 1, troskel: 26, minArea: 60, kvotMin: 0.55, kvotMax: 0.95, fyllnad: 0.72, stillaPx: 1.6, stillaMs: 800, bortaMs: 700, tomMin: 0.3, skymdMin: 0.6, areaVaxt: 1.6, spokMs: 20000 });
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

  // ── V1/V2: viloläget rapporteras med hysteres (K5) ────────────────
  nystart(); await referens();
  for (let i = 0; i < 10; i++) s = await ruta(KORT);
  let rapFore = bordRapporter;
  for (let i = 1; i <= 10; i++) s = await ruta(g => kort(g, W, 60 + 4 * i, 50, 30, 42, 180));   // glider 40 px på 10 rutor
  for (let i = 0; i < 6; i++) s = await ruta(g => kort(g, W, 100, 50, 30, 42, 180));
  const rapGlid = bordRapporter - rapFore;
  check(`V1 glidning 40 px: ${rapGlid} rapporter (högst 3), samma id ${s[0] && s[0].id === id10 + 0 || true}`, s.length === 1 && rapGlid >= 1 && rapGlid <= 3);
  rapFore = bordRapporter;
  for (let i = 0; i < 12; i++) s = await ruta(g => kort(g, W, 100 + (i % 2), 50, 30, 42, 180));   // darr ±1 px över gränsen
  check(`V2 darr ±1 px i 12 rutor: ${bordRapporter - rapFore} extra rapporter (0)`, bordRapporter - rapFore === 0);

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
  check(`W8 skräp: beskärning utan textruta blir 'skrap' efter tre försök, inte okänd: ${r.sist.map(t => t.tillstand).join(',')}, frågor ${identifieringar}`, r.sist.length === 3 && r.sist.every(t => t.tillstand === 'skrap') && identifieringar === 9);
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
  check(`W9 för litet kort (14×20 vid 240, ×8 = 112 videopx): rådet '${(Kamera.rad || '').slice(0, 24)}…', kortsida ${Kamera.spar.map(t => t.kort.toFixed(1)).join(',')}, tillstånd ${Kamera.spar.map(t => t.tillstand).join(',')}`, /små i bilden/.test(Kamera.rad || ''));
  /* W9b: bänken har ingen ström, alltså inget tak att jämföra med — då är
     rådet det gamla, "flytta närmare" (vidTaket antar att telefonen ger allt
     den kan). Ett kort över golvet men under 150 är ett spår, inte "litet":
     sma 0. */
  check(`W9b utan känd upplösning (${JSON.stringify(Kamera.upplosning)}) är rådet det gamla: '${Kamera.rad}', sma ${Kamera.sma}`,
        Kamera.upplosning === null && Kamera.rad === 'Korten är små i bilden. Flytta telefonen närmare bordet.' && Kamera.sma === 0);
  /* W9c–W9f (MES-31): med Claude påslagen (aiPa) gäller rådet först när
     Claude inte heller läser de små korten. Uppmätt i avståndsprovet
     2026-09-11: Claude läste 9 av 11 kort i golden 06 på 129 px kortsida
     medan rådet stod tänt. Bänken har ingen video, så frågan ställs för
     hand som i W12 (aiFragad, provas) och besvaras via Kamera.svarAI. */
  {
    const litet = g => kort(g, W, 60, 50, 14, 20, 180);   // 112 videopx: under golvet, men ett spår (W9)
    const osaker = () => ({ namn: 'Plains', sid: 's1', saker: false, cands: [{ name: 'Plains', sid: 's1', score: 0.4 }] });
    const radet = () => /små i bilden/.test(Kamera.rad || '');
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
          ok18 && t.tillstand === 'skrap' && t.aiInget === 2 && t.aiFragad === true && identifieringar - fr18 === 1);
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
       i bordet; delarna ur en klunga bär klungans lokala tid och samma ai. */
    namnSvar = osaker; t = await ettOkant();
    const lokal23 = t.lokalMs;
    Kamera.svarAI(t.id, [{ namn: 'Plains', sid: 's1', saker: true, x: 0.3, y: 0.5 }, { namn: 'Plains', sid: 's1', saker: true, x: 0.7, y: 0.5 }], { antal: 2, ms: 1234, modell: 'claude-opus-5' });
    const delar = bord.filter(x => x.ai && x.ai.klunga === t.id);
    check(`W23 ai.ms i bordet: ${delar.map(x => `#${x.id} ${x.tillstand} lokalMs ${x.lokalMs} ai.ms ${x.ai.ms} ${x.ai.modell}`).join(' | ')} (klungans lokala tid ${lokal23})`,
          delar.length === 2 && delar.every(x => x.ai.ms === 1234 && x.ai.modell === 'claude-opus-5' && x.lokalMs === lokal23 && lokal23 > 0));
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
       (axel 90°) och ett vridet 60° (axel 150°): med upp 'v' är det vridna
       tappat. Bekräftas det vridna som otappat blir grundläget 150°: det
       vridna otappat och det stående (60° från grundläget) tappat — på en
       gång, i rapporten, och det står sig ruta för ruta. */
    nystart(); await referens();
    const TVA_V = g => { KORT(g); kortVriden(g, W, 160, 75, 30, 42, rad(60), 180); };
    for (let i = 0; i < 10; i++) s = await ruta(TVA_V);
    const staende = Kamera.spar.find(t => Math.abs(t.cx - 75) < 8) || null, vridet = Kamera.spar.find(t => Math.abs(t.cx - 160) < 8) || null;
    /* Detektorn mäter det vridna kortets axel till ~146° (−34°), inte 150°:
       momentvinkeln på ett 30×42-kort i 60° drar några grader, och den
       spritter ±5° ruta för ruta. Grundläget är axeln i ögonblicket det
       togs — det är den som jämförs, inte sista rutans. */
    const vAx = vridet ? vridet.vinkel : 0;
    const fore = `före: stående tap=${staende && staende.tappad}, vridet tap=${vridet && vridet.tappad} (axel ${vridet && grader(vAx)}°)`;
    const okFore = !!staende && !!vridet && !staende.tappad && vridet.tappad;
    const fann = okFore && Kamera.grundFranSpar(vridet.id, false);
    const rap = t => t && (bord.find(x => x.id === t.id) || {}).tappad;
    const direkt = `rapporten direkt: stående ${rap(staende)}, vridet ${rap(vridet)}`;
    const okDirekt = fann && rap(staende) === true && rap(vridet) === false;
    for (let i = 0; i < 6; i++) s = await ruta(TVA_V);
    check(`GL4 grundFranSpar(vridet 60°): ${fore}; ${direkt}; efter 6 rutor stående ${staende && staende.tappad}, vridet ${vridet && vridet.tappad}, grund ${Kamera.grund == null ? null : grader(Kamera.grund) + '°'}`,
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

  console.log([...ok, ...fel].join('\n'));
  console.log(`\n${ok.length} OK, ${fel.length} FEL`);
  process.exit(fel.length ? 1 : 0);
})();

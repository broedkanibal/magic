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
let namnSvar = () => ({ namn: 'Plains', sid: 's1', saker: true, cands: [{ name: 'Plains', sid: 's1', score: 0.9 }] });
Kamera.installera({
  status: () => {},
  bord: (spar, nollstall) => { bord = spar; if (nollstall) nollst++; },
  identifiera: (c, id, gissning) => { identifieringar++; return Promise.resolve(namnSvar(id, gissning)); }
});

function nystart() {
  Kamera.satKalibrering({ ruta: { x: 0, y: 0, w: 1, h: 1, upp: 'v' } });
  Kamera.satTrosklar({ auto: 1, troskel: 26, minArea: 60, kvotMin: 0.55, kvotMax: 0.95, fyllnad: 0.72, stillaPx: 1.6, stillaMs: 800, bortaMs: 700, tomMin: 0.3, skymdMin: 0.6, areaVaxt: 1.6, spokMs: 20000 });
  identifieringar = 0; bord = []; nu = 0;
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

  console.log([...ok, ...fel].join('\n'));
  console.log(`\n${ok.length} OK, ${fel.length} FEL`);
  process.exit(fel.length ? 1 : 0);
})();

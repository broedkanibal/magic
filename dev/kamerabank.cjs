// Mätbänk för kameramodulen (MES-22, MES-26). Kör: node dev/kamerabank.cjs
// Plockar ut Kamera-modulen ur index.html och kör den i node på syntetiska
// bildrutor: arm över ett känt kort, handformad fläck, lyft kort, flimmer,
// spöken, ihopskjutna kort, exponeringssväng, diagonalt kort, brus → tröskel,
// varaktig ljusändring, igenkänning som inte är redo, paus i analysen, och
// sedan MES-26: ådrat trä med blänk, skakning, drift, tonkurva, skräp, avstånd.
// Slutkod 1 om något faller. Med --diagnos <fil.json> spelas en sparad
// diagnos från appen upp i stället. .cjs eftersom package.json säger "type": "module".
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
function kort(g, W, x, y, w, h, niv) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g[yy * W + xx] = niv; }
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
    if (Math.abs(u) <= w / 2 && Math.abs(v) <= h / 2) g[y * W + x] = niv;
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
  const { aw, ah } = d.matt;
  const ur = b64 => { const u = Buffer.from(b64, 'base64'); const f = new Float32Array(u.length); for (let i = 0; i < u.length; i++) f[i] = u[i]; return f; };
  const ref = ur(d.ref), ruta = d.ruta ? ur(d.ruta) : null;
  Kamera.installera({ status: () => {}, bord: () => {}, fas: () => {}, identifiera: () => Promise.resolve(null) });
  Kamera.satKalibrering({ ruta: (d.kal && d.kal.ruta) || { x: 0, y: 0, w: 1, h: 1, upp: 'v' } });
  /* Referensen i filen är redan den suddade medelbilden — den läggs in
     rakt, med filens brus, i stället för att köras genom steg() och suddas
     en gång till. Rutan är rå och går genom steg() som på telefonen. */
  Kamera.laddaReferens(ref, d.yta ? d.yta.brus : 0, ah, aw);
  Kamera.satTrosklar(Object.assign({}, d.tro, { auto: 0 }));
  let nu = 900;
  console.log('yta ur filen  ', JSON.stringify(d.yta));
  console.log('yta på bänken ', JSON.stringify(Kamera.yta && { dom: Kamera.yta.dom, brus: Kamera.yta.brus, textur: Kamera.yta.textur, blank: Kamera.yta.blank }));
  console.log('trösklar      ', JSON.stringify(d.tro));
  if (ruta) {
    for (let i = 0; i < 8; i++) { nu += 150; Kamera.steg(ruta, nu, ah, aw); }
    const dia = Kamera.diagnosfil();
    console.log('regioner', dia.dia.regioner, 'för små', dia.dia.forSma, 'fel kvot', dia.dia.felKvot, 'otäta', dia.dia.otat, 'täckning', (dia.dia.tackning * 100).toFixed(1) + '%', 'spritt', (dia.dia.spritt * 100).toFixed(2) + '%');
    console.log('spår', Kamera.spar.map(t => `#${t.id} ${Math.round(t.lang)}×${Math.round(t.kort)} ${t.tillstand}${t.skymd ? ' skymd' : ''}`).join(' | ') || '(inga)');
    const ut = path.join(path.dirname(fil), path.basename(fil, '.json') + '.mask.pgm');
    const m = dia.maskRa; const buf = Buffer.alloc(aw * ah); for (let i = 0; i < aw * ah; i++) buf[i] = m[i] ? 255 : 0;
    fs.writeFileSync(ut, Buffer.concat([Buffer.from(`P5\n${aw} ${ah}\n255\n`), buf]));
    console.log('spår i filen', (d.spar || []).map(t => `#${t.id} ${t.tillstand}`).join(' | '), '\nmask skriven till', ut);
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
  Kamera.satTrosklar({ auto: 1, troskel: 26, minArea: 60, kvotMin: 0.5, kvotMax: 0.95, fyllnad: 0.72, stillaPx: 1.6, stillaMs: 800, bortaMs: 700, tomMin: 0.3, skymdMin: 0.6, areaVaxt: 1.6, spokMs: 20000 });
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
  Kamera.satTrosklar({ kvotMin: 0.9 }); s = await ruta(DIAG); Kamera.satTrosklar({ kvotMin: 0.5 });
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
  const kortPaTra = (g, x, y) => { for (let yy = y; yy < y + 31; yy++) for (let xx = x; xx < x + 22; xx++) { const inre = xx > x + 2 && xx < x + 22 - 3 && yy > y + 3 && yy < y + 31 * 0.55; g[yy * W + xx] = inre ? 95 : 205; } return g; };
  const TREW = g => { kortPaTra(g, 60, 70); kortPaTra(g, 95, 72); kortPaTra(g, 130, 68); return g; };
  let seedW = 900;
  const rutaTra = async (o, bygg) => { nu += TAKT; const g = tra(lcg(seedW++), o); if (bygg) bygg(g); Kamera.steg(g, nu, H, undefined, 8); await new Promise(r => setImmediate(r)); return Kamera.spar; };
  /* Geometrin, inte bara antalet: ett kort som blivit tre bitar räknas inte. */
  const KORTEN = [[60, 70], [95, 72], [130, 68]];
  const helaKort = s => KORTEN.every(([x, y]) => s.filter(t => Math.abs(t.lang - 31) <= 8 && Math.abs(t.kort - 22) <= 6 && Math.hypot(t.cx - (x + 10.5), t.cy - (y + 15)) <= 4).length === 1);
  const refTra = async () => { for (let i = 0; i < 6; i++) await rutaTra({}); };
  const summa = async (n, f) => { let sum = 0, max = 0, sist = []; for (let i = 0; i < n; i++) { const s = await f(i); sum += s.length; max = Math.max(max, s.length); sist = s; } return { sum, max, sist }; };
  nystart(); await refTra();
  check(`W0 ytans betyg på trä med blänk: ${JSON.stringify({ dom: Kamera.yta.dom, textur: Kamera.yta.textur, blank: Kamera.yta.blank })}`, Kamera.yta.dom === 'blank');
  let r = await summa(40, i => rutaTra({ dx: (i % 3) - 1, dy: i % 2 }));
  check(`W2 skakning ±1 px i båda led, tomt trä: falska spår ${r.sum} (flest ${r.max}), spritt ${(Kamera.diagnos.spritt * 100).toFixed(2)}%, tröskel ${Kamera.trosklar.troskel}`, r.sum === 0 && Kamera.trosklar.troskel <= 14);
  nystart(); await refTra(); r = await summa(60, () => rutaTra({ dx: 2, dy: 1 }));
  check(`W3 drift 2,1 px som stannar i 9 s: falska spår ${r.sum}, tröskel ${Kamera.trosklar.troskel}`, r.sum === 0 && Kamera.trosklar.troskel <= 14);
  nystart(); await refTra(); r = await summa(40, () => rutaTra({ gamma: 0.85 }));
  check(`W7 tonkurvan ändras (gamma 0,85): falska spår ${r.sum}`, r.sum === 0);
  nystart(); await refTra(); r = await summa(30, () => rutaTra({ bx: 153, by: 64 }));
  check(`W6 blänket flyttar 3 px: falska spår ${r.sum}`, r.sum === 0);
  nystart(); await refTra(); r = await summa(12, () => rutaTra({}, TREW));
  check(`W4 tre små kort (22×31) på trä: spår ${r.sist.length} (${r.sist.map(t => Math.round(t.lang) + '×' + Math.round(t.kort)).join(', ')}), alla klara ${r.sist.every(t => t.tillstand === 'klar')}, hela kort ${helaKort(r.sist)}`, r.sist.length === 3 && r.sist.every(t => t.tillstand === 'klar') && helaKort(r.sist));
  const idsW = new Set(r.sist.map(t => t.id));
  r = await summa(30, i => rutaTra({ dx: i % 2 }, TREW));
  check(`W5 tre kort + skakning 4,5 s: samma tre id kvar ${r.sist.filter(t => idsW.has(t.id)).length === 3 && r.sist.length === 3}, hela kort ${helaKort(r.sist)}`, r.sist.filter(t => idsW.has(t.id)).length === 3 && r.sist.length === 3 && helaKort(r.sist));
  nystart(); await refTra(); namnSvar = () => ({ skrap: true });
  r = await summa(34, () => rutaTra({}, TREW));                         // två omförsök à 1,5 s, sedan dom
  check(`W8 skräp: beskärning utan textruta blir 'skrap' efter tre försök, inte okänd: ${r.sist.map(t => t.tillstand).join(',')}, frågor ${identifieringar}`, r.sist.length === 3 && r.sist.every(t => t.tillstand === 'skrap') && identifieringar === 9);
  /* W8b: skräp först, sedan ett riktigt namn — utan att kortet flyttats. */
  let forsok = 0; namnSvar = () => (++forsok <= 2 ? { skrap: true } : { namn: 'Plains', sid: 's1', saker: true, cands: [] });
  nystart(); await refTra(); r = await summa(30, () => rutaTra({}, g => kortPaTra(g, 60, 70)));
  check(`W8b mörk första beskärning, sedan läsbar: ${r.sist.map(t => t.tillstand).join(',')}`, r.sist.length === 1 && r.sist[0].tillstand === 'klar');
  /* W10: ett kort läggs ovanpå ett skräpspår — kortet ska få ett eget spår. */
  namnSvar = () => ({ skrap: true }); nystart(); await refTra();
  r = await summa(34, () => rutaTra({}, g => { for (let yy = 80; yy < 90; yy++) for (let xx = 100; xx < 114; xx++) g[yy * W + xx] = 200; }));   // en ljus flisa 14×10
  const flisa = r.sist.length === 1 && r.sist[0].tillstand === 'skrap';
  namnSvar = () => ({ namn: 'Plains', sid: 's1', saker: true, cands: [] });
  r = await summa(14, () => rutaTra({}, g => kortPaTra(g, 96, 72)));
  check(`W10 kort ovanpå skräp: flisan var skräp ${flisa}, sedan ${r.sist.map(t => t.tillstand + ' ' + Math.round(t.lang) + '×' + Math.round(t.kort)).join(' | ')}`, flisa && r.sist.length === 1 && r.sist[0].tillstand === 'klar' && Math.abs(r.sist[0].lang - 31) <= 8);
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

  console.log([...ok, ...fel].join('\n'));
  console.log(`\n${ok.length} OK, ${fel.length} FEL`);
  process.exit(fel.length ? 1 : 0);
})();

// Mätbänk för kameramodulen (MES-22). Kör: node dev/kamerabank.cjs
// Plockar ut Kamera-modulen ur index.html, kör den i node på syntetiska
// bildrutor och rapporterar det som står i commit-meddelandet: arm över ett
// känt kort, handformad fläck, lyft kort, flimmer, spöken, ihopskjutna kort,
// exponeringssväng, diagonalt kort, brus → tröskel, varaktig ljusändring,
// igenkänning som inte är redo, paus i analysen. Slutkod 1 om något faller.
// .cjs eftersom package.json säger "type": "module".
'use strict';
// ── extrahering ──────────────────────────────────────────────────────
const fs = require('fs'), vm = require('vm');
const fil = process.argv[2] || require('path').join(__dirname, '..', 'index.html');
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
  Kamera.steg(g, nu, H);
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

  console.log([...ok, ...fel].join('\n'));
  console.log(`\n${ok.length} OK, ${fel.length} FEL`);
  process.exit(fel.length ? 1 : 0);
})();

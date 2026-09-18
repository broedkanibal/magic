'use strict';
/* Gemensamt för bänken (MES-213): modeller, förbehandling, inbäddning,
   referenser och mått. Körs i Node med onnxruntime-node + sharp; samma
   förbehandling (kvadratisk inmatning, medel/spridning) görs med canvas i
   webbläsarmodulen dev/embed/embed.js. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
/* Laddas först när en modell behövs: synt.cjs använder bara sharp, och de två
   biblioteken i samma process gav segfault i generatorn. */
let ort = null;

const HAR = __dirname;
const CACHE = path.join(HAR, 'cache');
const IMAGENET = { medel: [0.485, 0.456, 0.406], std: [0.229, 0.224, 0.225] };
const INGEN = { medel: [0, 0, 0], std: [1, 1, 1] };

/* Kandidaterna. ut: hur vektorn plockas ur modellens svar. */
const MODELLER = {
  'dinov2-small':         { fil: 'dinov2-small.onnx',         sida: 224, norm: IMAGENET, ut: 'cls' },
  'dinov2-small-q8':      { fil: 'dinov2-small-q8.onnx',      sida: 224, norm: IMAGENET, ut: 'cls' },
  'dinov2-small-fp16':    { fil: 'dinov2-small-fp16.onnx',    sida: 224, norm: IMAGENET, ut: 'cls' },
  'mobileclip-s0':        { fil: 'mobileclip-s0-vision.onnx', sida: 256, norm: INGEN,    ut: 'rak' },
  'mobileclip-s0-q8':     { fil: 'mobileclip-s0-vision-q8.onnx', sida: 256, norm: INGEN, ut: 'rak' },
  'mobileclip-s0-fp16':   { fil: 'mobileclip-s0-vision-fp16.onnx', sida: 256, norm: INGEN, ut: 'rak' },
  'mobilenetv4-small':    { fil: 'mobilenetv4-small.onnx',    sida: 224, norm: IMAGENET, ut: 'rak' },
  'mobilenetv4-small-f':  { fil: 'mobilenetv4-small-feat.onnx', sida: 224, norm: IMAGENET, ut: 'rak' },
  'mobilenetv4-small-q8': { fil: 'mobilenetv4-small-q8.onnx', sida: 224, norm: IMAGENET, ut: 'rak' },
};

/* Kortets delar, i kortets egna koordinater 0–1 (samma konstruta som Matcher). */
const VYER = {
  hel:   [0, 0, 1, 1],
  konst: [0.075, 0.105, 0.85, 0.445],
  topp:  [0, 0, 1, 0.6],            // titel + konst: det som syns av ett kort i en solfjäder
};
const MARGINAL = 0.08;              // beskar() i index.html

async function laddaModell(namn, o) {
  if (!ort) ort = require('onnxruntime-node');
  const m = MODELLER[namn]; if (!m) throw new Error('okänd modell ' + namn);
  const fil = path.join(HAR, 'modeller', m.fil);
  if (!fs.existsSync(fil)) throw new Error(`modellen saknas: ${fil} — se dev/embed/LÄS-MIG.md`);
  const session = await ort.InferenceSession.create(fil, { intraOpNumThreads: (o && o.tradar) || 4, graphOptimizationLevel: 'all' });
  const sida = (o && o.sida) || m.sida;
  return { namn, session, sida, norm: m.norm, ut: m.ut, in: session.inputNames[0], utNamn: session.outputNames[0], mb: fs.statSync(fil).size / 1e6 };
}

/* rå RGB (Buffer, w×h×3) → CHW float in i `mal` på plats `i`. */
function tillTensor(raw, sida, norm, mal, i) {
  const n = sida * sida, bas = i * 3 * n;
  for (let p = 0; p < n; p++) for (let c = 0; c < 3; c++)
    mal[bas + c * n + p] = (raw[p * 3 + c] / 255 - norm.medel[c]) / norm.std[c];
}

/* En bild (Buffer/fil) → rå RGB sida×sida för vyn. Frågebilder bär 8 %
   marginal (beskar); den skärs bort innan vyn tas. rot: 0/90/180/270 medurs. */
async function vyRa(bild, sida, vy, o) {
  o = o || {};
  let s = sharp(bild).removeAlpha();
  const meta = await sharp(bild).metadata();
  let W = meta.width, H = meta.height, x0 = 0, y0 = 0, w = W, h = H;
  if (o.marginal) { const f = MARGINAL / (1 + 2 * MARGINAL); x0 = W * f; y0 = H * f; w = W - 2 * x0; h = H - 2 * y0; }
  const r = VYER[vy] || VYER.hel;
  if (o.op && (o.op.lag || o.op.sudd || o.op.varm)) {
    /* Referensvarianter: skanningen görs lik ett foto — låg upplösning,
       oskärpa, varmt ljus — så att gapet skanning/kamera krymper. */
    let b = await s.toBuffer();
    if (o.op.lag) b = await sharp(b).resize(o.op.lag).toBuffer();
    if (o.op.sudd) b = await sharp(b).blur(o.op.sudd).toBuffer();
    if (o.op.varm) b = await sharp(b).recomb([[1.08, 0, 0], [0, 0.9, 0], [0, 0, 0.62]]).toBuffer();
    s = sharp(b); const m2 = await sharp(b).metadata(); W = m2.width; H = m2.height; x0 = 0; y0 = 0; w = W; h = H;
  }
  if (o.op && o.op.zoom) {
    /* TTA på frågan: samma beskärning lite inzoomad/förskjuten. */
    const z = o.op.zoom, nw = w / z, nh = h / z;
    x0 += (w - nw) / 2 + (o.op.dx || 0) * w; y0 += (h - nh) / 2 + (o.op.dy || 0) * h; w = nw; h = nh;
  }
  if (o.rot) {
    /* Referensen vrids FÖRST, sedan tas vyn ur det vridna kortet — så ser en
       fråga ut när kortet ligger vridet i beskärningen. */
    const buf = await s.rotate(o.rot).toBuffer({ resolveWithObject: true });
    s = sharp(buf.data); W = buf.info.width; H = buf.info.height; x0 = 0; y0 = 0; w = W; h = H;
  }
  const left = Math.max(0, Math.round(x0 + r[0] * w)), top = Math.max(0, Math.round(y0 + r[1] * h));
  const width = Math.max(1, Math.min(W - left, Math.round(r[2] * w))), height = Math.max(1, Math.min(H - top, Math.round(r[3] * h)));
  return s.extract({ left, top, width, height }).resize(sida, sida, { fit: 'fill', kernel: o.karna || 'lanczos3' }).raw().toBuffer();
}

async function korBatch(modell, raer) {
  const sida = modell.sida, data = new Float32Array(raer.length * 3 * sida * sida);
  raer.forEach((r, i) => tillTensor(r, sida, modell.norm, data, i));
  const svar = await modell.session.run({ [modell.in]: new ort.Tensor('float32', data, [raer.length, 3, sida, sida]) });
  const t = svar[modell.utNamn], d = t.data, ut = [];
  for (let i = 0; i < raer.length; i++) {
    let v;
    if (modell.ut === 'cls') { const [, T, D] = t.dims; v = Float32Array.from(d.subarray(i * T * D, i * T * D + D)); }
    else if (modell.ut === 'cls+medel') {
      const [, T, D] = t.dims; v = new Float32Array(2 * D);
      let n1 = 0; for (let k = 0; k < D; k++) { v[k] = d[i * T * D + k]; n1 += v[k] * v[k]; }
      for (let p = 1; p < T; p++) for (let k = 0; k < D; k++) v[D + k] += d[(i * T + p) * D + k] / (T - 1);
      let n2 = 0; for (let k = 0; k < D; k++) n2 += v[D + k] * v[D + k];
      n1 = Math.sqrt(n1) || 1; n2 = Math.sqrt(n2) || 1;
      for (let k = 0; k < D; k++) { v[k] /= n1; v[D + k] /= n2; }
    } else { const D = t.dims[t.dims.length - 1]; v = Float32Array.from(d.subarray(i * D, i * D + D)); }
    let n = 0; for (let k = 0; k < v.length; k++) n += v[k] * v[k];
    n = Math.sqrt(n) || 1; for (let k = 0; k < v.length; k++) v[k] /= n;
    ut.push(v);
  }
  return ut;
}

/* Inbäddningar för en lista {nyckel, bild(Buffer|fil), rot, marginal} — med
   cache på disk per modell, vy och nyckel, så att prov efter prov går fort. */
async function baddaIn(modell, poster, vy, o) {
  o = o || {};
  const tagg = `${modell.namn}${modell.ut === 'cls' ? '' : '-' + modell.ut}-${modell.sida}-${vy}${o.karna ? '-' + o.karna : ''}`;
  const cfil = path.join(CACHE, 'vek', tagg + '-' + (o.cache || 'x') + '.json');
  let lager = {};
  if (o.cache && fs.existsSync(cfil)) { try { lager = JSON.parse(fs.readFileSync(cfil, 'utf8')); } catch (e) { lager = {}; } }
  const ut = new Array(poster.length), kvar = [];
  const avkoda = b64 => { const b = Buffer.from(b64, 'base64'); return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
  poster.forEach((p, i) => { const k = p.nyckel + '|' + (p.rot || 0) + '|' + (p.marginal ? 1 : 0); if (lager[k]) ut[i] = avkoda(lager[k]); else kvar.push(i); });
  const B = o.batch || 8; let ms = 0;
  for (let a = 0; a < kvar.length; a += B) {
    const idx = kvar.slice(a, a + B);
    const raer = await Promise.all(idx.map(i => vyRa(poster[i].bild, modell.sida, vy, { rot: poster[i].rot, marginal: poster[i].marginal, karna: o.karna, op: poster[i].op })));
    const t0 = performance.now();
    const v = await korBatch(modell, raer);
    ms += performance.now() - t0;
    idx.forEach((i, j) => { ut[i] = v[j]; const p = poster[i]; lager[p.nyckel + '|' + (p.rot || 0) + '|' + (p.marginal ? 1 : 0)] = Buffer.from(v[j].buffer).toString('base64'); });
    if (o.logg) process.stdout.write(`  ${tagg}: ${Math.min(a + B, kvar.length)}/${kvar.length}\r`);
  }
  if (kvar.length && o.logg) process.stdout.write('\n');
  if (o.cache && kvar.length) { fs.mkdirSync(path.dirname(cfil), { recursive: true }); fs.writeFileSync(cfil, JSON.stringify(lager)); }
  return { vek: ut, msPerBild: kvar.length ? ms / kvar.length : null };
}

/* Referenserna för en lek: cache/<lek>.json ur hamta-referenser.cjs. */
function lasLek(lek) {
  const j = JSON.parse(fs.readFileSync(path.join(CACHE, lek + '.json'), 'utf8'));
  return j.kort.map(c => Object.assign({}, c, { bild: path.join(HAR, c.normalFil), liten: path.join(HAR, c.smallFil) }));
}

async function byggReferenser(modell, kort, vy, o) {
  o = o || {};
  const rotar = o.rotar || [0];
  const poster = [];
  const varianter = o.varianter || [null];       // null = skanningen som den är
  for (const c of kort) for (const rot of rotar) for (const op of varianter)
    poster.push({ nyckel: (o.liten ? 's:' : 'n:') + c.id + (op ? '#' + JSON.stringify(op) : ''), bild: o.liten ? c.liten : c.bild, rot, op, namn: c.name, id: c.id });
  const { vek } = await baddaIn(modell, poster, vy, { cache: 'ref', logg: o.logg, karna: o.karna });
  return { vek, namn: poster.map(p => p.namn), id: poster.map(p => p.id), rot: poster.map(p => p.rot) };
}

/* Dra bort en medelvektor och normera om. */
function medelAv(vek) { const D = vek[0].length, m = new Float32Array(D); for (const v of vek) for (let k = 0; k < D; k++) m[k] += v[k] / vek.length; return m; }
function centrera(v, medel) { const D = v.length, u = new Float32Array(D); let n = 0; for (let k = 0; k < D; k++) { u[k] = v[k] - medel[k]; n += u[k] * u[k]; } n = Math.sqrt(n) || 1; for (let k = 0; k < D; k++) u[k] /= n; return u; }

const punkt = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

/* Poäng per NAMN: bästa referensens cosinus. vikt: flera vyer läggs ihop.
   utan: namn som räknas bort (deck-prior). Svar: sorterad lista {namn, poang}. */
function rangordna(q, refs, o) {
  o = o || {};
  const per = new Map();
  for (let i = 0; i < refs.vek.length; i++) {
    const s = punkt(q, refs.vek[i]), n = refs.namn[i];
    const f = per.get(n); if (f === undefined || s > f.poang) per.set(n, { namn: n, poang: s, id: refs.id[i], rot: refs.rot[i] });
  }
  return [...per.values()].filter(x => !(o.utan && o.utan.has(x.namn))).sort((a, b) => b.poang - a.poang);
}

/* Säkra fel = 0: sortera på säkerhetsmåttet, hitta den lägsta tröskel där
   inget fel är säkert. andelSaker = hur många som då är säkra (och rätt). */
function nollfelsTroskel(rader, matt) {
  const s = rader.map(r => ({ v: matt(r), ratt: r.ratt })).sort((a, b) => b.v - a.v);
  let n = 0; while (n < s.length && s[n].ratt) n++;
  const hogstaFel = n < s.length ? s[n].v : null;
  return { troskel: hogstaFel, sakra: n, andel: s.length ? n / s.length : 0 };
}
/* Vid en GIVEN tröskel: säkra rätt, säkra fel. */
function vidTroskel(rader, matt, tr) {
  let sr = 0, sf = 0; for (const r of rader) if (matt(r) > tr) { if (r.ratt) sr++; else sf++; }
  return { sakraRatt: sr, sakraFel: sf, andel: rader.length ? sr / rader.length : 0 };
}

/* ── Receptet i embed.js, i Node (MES-230) ─────────────────────────────
   Samma 8 vektorer per bild som Embed.byggLek räknar i webbläsaren: fyra
   vridningar (0/90/180/270) × två varianter (skanningen som den är, och en
   suddig: 150 px bred + tre varv lådfilter 3×1 och 1×3). Ordningen är
   modulens: skarp 0, 90, 180, 270, sudd 0, 90, 180, 270. Webbläsaren ritar
   med canvas; här gör sharp omskalningen. Hur nära det kommer är uppmätt i
   forrakna-prov.cjs (dev/embed/INLARNING.md). */
const RECEPT = { sida: 256, rotar: [0, 90, 180, 270], varianter: ['skarp', 'sudd'], suddBredd: 150, karna: 'webb' };

/* Vrid en kvadratisk RGB-bild 90° medurs n gånger — exakt, utan omsampling. */
function vridRa(raw, sida, rot) {
  let a = raw;
  for (let v = 0; v < ((rot / 90) % 4 + 4) % 4; v++) {
    const b = Buffer.alloc(a.length);
    for (let y = 0; y < sida; y++) for (let x = 0; x < sida; x++) {
      const fran = (y * sida + x) * 3, till = (x * sida + (sida - 1 - y)) * 3;   // (x, y) → (sida-1-y, x)
      b[till] = a[fran]; b[till + 1] = a[fran + 1]; b[till + 2] = a[fran + 2];
    }
    a = b;
  }
  return a;
}
/* Omskalning som webbläsarens canvas gör den (karna 'webb'): varje ny pixel
   samplas bilinjärt i källan, utan förfiltrering — uppmätt i huvudlös Chrome
   (drawImage med imageSmoothingQuality 'high'): 1,2 i medelavvikelse per
   kanal mot 9–11 för sharps kärnor. Nedskalning blir då kornig (vikning). */
function bilinjarRa(src, W, H, w, h) {
  const ut = Buffer.alloc(w * h * 3), sx = W / w, sy = H / h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = Math.max(0, Math.min(W - 1, (x + 0.5) * sx - 0.5)), v = Math.max(0, Math.min(H - 1, (y + 0.5) * sy - 0.5));
    const x0 = Math.floor(u), y0 = Math.floor(v), x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1), a = u - x0, b = v - y0;
    for (let c = 0; c < 3; c++) {
      const p = (xx, yy) => src[(yy * W + xx) * 3 + c];
      ut[(y * w + x) * 3 + c] = Math.round((p(x0, y0) * (1 - a) + p(x1, y0) * a) * (1 - b) + (p(x0, y1) * (1 - a) + p(x1, y1) * a) * b);
    }
  }
  return ut;
}
/* En mipmapnivå: 2×2-medel. */
function halveraRa(src, W, H) {
  const w = Math.floor(W / 2), h = Math.floor(H / 2), ut = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
    const i = (yy, xx) => src[(yy * W + xx) * 3 + c];
    ut[(y * w + x) * 3 + c] = Math.round((i(2 * y, 2 * x) + i(2 * y, 2 * x + 1) + i(2 * y + 1, 2 * x) + i(2 * y + 1, 2 * x + 1)) / 4);
  }
  return { data: ut, W: w, H: h };
}
/* Bild → rå RGB w×h med kärnan (sharps namn, eller 'webb'). 'webb': krymper
   bilden mer än 2 gånger åt båda hållen tar Chrome en halverad mipmapnivå
   först (uppmätt 488×680 → 150×209: 1,4 i avvikelse med, 11,8 utan; → 256×256,
   där ena ledden krymper mindre än 2 gånger: ingen). */
async function skalaRa(bild, w, h, karna, raw) {
  const s = raw ? sharp(bild, { raw }) : sharp(bild).removeAlpha();
  if (karna !== 'webb') return s.resize(w, h, { fit: 'fill', kernel: karna }).raw().toBuffer();
  const { data, info } = await s.raw().toBuffer({ resolveWithObject: true });
  let m = { data, W: info.width, H: info.height };
  while (Math.min(m.W / w, m.H / h) >= 2) m = halveraRa(m.data, m.W, m.H);
  return bilinjarRa(m.data, m.W, m.H, w, h);
}
/* Den suddiga varianten, pixel för pixel som suddig() i embed.js. */
async function suddRa(bild, karna) {
  const meta = await sharp(bild).metadata(), w = RECEPT.suddBredd, h = Math.round(w * meta.height / meta.width);
  const a = Buffer.from(await skalaRa(bild, w, h, karna)), b = Buffer.alloc(a.length);
  const varv = (fran, till, dx, dy) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
      let s = 0;
      for (let k = -1; k <= 1; k++) { const xx = Math.min(w - 1, Math.max(0, x + k * dx)), yy = Math.min(h - 1, Math.max(0, y + k * dy)); s += fran[(yy * w + xx) * 3 + c]; }
      till[(y * w + x) * 3 + c] = Math.min(255, Math.max(0, Math.round(s / 3)));   // Uint8ClampedArray avrundar
    }
  };
  for (let i = 0; i < 3; i++) { varv(a, b, 1, 0); varv(b, a, 0, 1); }
  return { raw: a, w, h };
}
/* Bildfil/Buffer → Float32Array(8 × DIM), normerade, i modulens ordning.
   o.karna: sharps omskalning ned till 256 (skarp) och till 150 px (sudd);
   o.upp: omskalningen från 150 px upp till 256. */
async function receptVektorer(modell, bild, o) {
  o = o || {};
  const S = RECEPT.sida, ner = o.karna || RECEPT.karna, upp = o.upp || (ner === 'webb' ? 'webb' : 'cubic');
  const skarp = await skalaRa(bild, S, S, ner);
  const s = await suddRa(bild, ner);
  const sudd = await skalaRa(s.raw, S, S, upp, { width: s.w, height: s.h, channels: 3 });
  const raer = [];
  for (const v of RECEPT.varianter) for (const r of RECEPT.rotar) raer.push(vridRa(v === 'sudd' ? sudd : skarp, S, r));
  const vek = await korBatch(modell, raer), D = vek[0].length, ut = new Float32Array(vek.length * D);
  vek.forEach((v, i) => ut.set(v, i * D));
  return ut;
}

/* fp16 (IEEE 754 half) — lagringens format: 8 × 512 tal = 8 KB per bild. */
function tillF16(f32) {
  const ut = new Uint16Array(f32.length), fv = new Float32Array(1), iv = new Uint32Array(fv.buffer);
  for (let i = 0; i < f32.length; i++) {
    fv[0] = f32[i]; const x = iv[0], tecken = (x >>> 16) & 0x8000, e = (x >>> 23) & 0xff, m = x & 0x7fffff;
    let h;
    if (e === 0xff) h = tecken | 0x7c00 | (m ? 0x200 : 0);
    else {
      const ne = e - 127 + 15;
      if (ne >= 0x1f) h = tecken | 0x7c00;
      else if (ne <= 0) { if (ne < -10) h = tecken; else { const mm = m | 0x800000, sk = 14 - ne; h = tecken | (mm >>> sk); if ((mm >>> (sk - 1)) & 1 && ((mm & ((1 << (sk - 1)) - 1)) || (h & 1))) h++; } }
      else { h = tecken | (ne << 10) | (m >>> 13); if ((m & 0x1000) && ((m & 0x2fff) || (h & 1))) h++; }   // avrunda till jämnt
    }
    ut[i] = h;
  }
  return ut;
}
function franF16(u16) {
  const ut = new Float32Array(u16.length);
  for (let i = 0; i < u16.length; i++) {
    const h = u16[i], s = h & 0x8000 ? -1 : 1, e = (h >>> 10) & 0x1f, m = h & 0x3ff;
    ut[i] = e === 0 ? s * m * 2 ** -24 : e === 31 ? (m ? NaN : s * Infinity) : s * (1 + m / 1024) * 2 ** (e - 15);
  }
  return ut;
}

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);

module.exports = { RECEPT, receptVektorer, vridRa, tillF16, franF16, medelAv, centrera, MODELLER, VYER, MARGINAL, CACHE, HAR, laddaModell, vyRa, korBatch, baddaIn, lasLek, byggReferenser, rangordna, punkt, nollfelsTroskel, vidTroskel, mulberry32, hash };

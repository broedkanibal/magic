'use strict';
/* Gemensamt för bänken (MES-213): modeller, förbehandling, inbäddning,
   referenser och mått. Körs i Node med onnxruntime-node + sharp; samma
   förbehandling (kvadratisk inmatning, medel/spridning) görs med canvas i
   webbläsarmodulen dev/embed/embed.js. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const ort = require('onnxruntime-node');

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
    const raer = await Promise.all(idx.map(i => vyRa(poster[i].bild, modell.sida, vy, { rot: poster[i].rot, marginal: poster[i].marginal, karna: o.karna })));
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
  for (const c of kort) for (const rot of rotar) poster.push({ nyckel: (o.liten ? 's:' : 'n:') + c.id, bild: o.liten ? c.liten : c.bild, rot, namn: c.name, id: c.id });
  const { vek } = await baddaIn(modell, poster, vy, { cache: 'ref', logg: o.logg, karna: o.karna });
  return { vek, namn: poster.map(p => p.namn), id: poster.map(p => p.id), rot: poster.map(p => p.rot) };
}

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

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);

module.exports = { MODELLER, VYER, MARGINAL, CACHE, HAR, laddaModell, vyRa, korBatch, baddaIn, lasLek, byggReferenser, rangordna, punkt, nollfelsTroskel, vidTroskel, mulberry32, hash };

'use strict';
/* Syntetiska beskärningar (MES-213): referensbilden → så som kameran ser
   kortet på ett bord. Varje bild får EN förstärkt störning (typen), så att
   det syns var en modell går sönder, plus grupperna "kombinerad" (två–tre
   störningar samtidigt) och "kombinerad-hard" (i snitt fem — ett stresstest). Bilden byggs som kedjan bygger den: kortet i en pose på
   ett underlag, spårets raka låda + 8 % marginal (med lite fel i lådan),
   liggande lådor vrids −90° (Kamera.beskar i index.html).

     node dev/embed/synt.cjs                          4000 bilder ur golden-leken → cache/synt
     node dev/embed/synt.cjs --lek commander100 --ut synt-c100 --n 3000
     node dev/embed/synt.cjs --ark                    kontaktark med ett prov per typ
     node dev/embed/synt.cjs --lek lek-golden-tryck --exkl lek-golden --typer grund,kombinerad --ut synt-tryck --n 400
                                                      samma konst i ett ANNAT tryck än referensens

   Underlag: riktiga bitar av borden i golden-fotona (ytor utan spår) och
   ritade (trä, duk, spelmatta, ljus skiva). Slumpen är sådd: samma
   kommando ger samma bilder. */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const L = require('./lib.cjs');

const arg = (namn, forval) => { const i = process.argv.indexOf('--' + namn); return i < 0 ? forval : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const GOLDEN = path.join(L.HAR, '..', 'golden');
const ASPEKT = 0.716, BIT = 50;

const TYPER = ['grund', 'rotation', 'rot90', 'perspektiv', 'oskarpa', 'rorelse', 'lagupplost', 'jpeg', 'varmt', 'kallt', 'under', 'over', 'skugga', 'blank', 'finger', 'kort-over', 'bakgrund'];

/* ── linjär algebra: homografi ur fyra punktpar ── */
function homografi(fran, till) {
  const A = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = fran[i], [u, v] = till[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let c = 0; c < 8; c++) {
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < 8; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k]; }
  }
  const h = A.map((r, i) => r[8] / r[i]);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

/* Kortets fyra hörn i bilden: vridning i planet, kameralutning, perspektiv. */
function horn(theta, lutX, lutY, avstand, forskjut) {
  const w = ASPEKT, h = 1, ox = (forskjut && forskjut[0]) || 0, oy = (forskjut && forskjut[1]) || 0, ov = (forskjut && forskjut[2]) || 0;
  const pk = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
  const ct = Math.cos(theta), st = Math.sin(theta), cx = Math.cos(lutX), sx = Math.sin(lutX), cy = Math.cos(lutY), sy = Math.sin(lutY), co = Math.cos(ov), so = Math.sin(ov);
  return pk.map(([a, b]) => {
    const a1 = a * co - b * so + ox, b1 = a * so + b * co + oy;          // det övre kortets läge i det undres plan
    let X = a1 * ct - b1 * st, Y = a1 * st + b1 * ct, Z = 0;
    let Y2 = Y * cx - Z * sx, Z2 = Y * sx + Z * cx; Y = Y2; Z = Z2;
    let X2 = X * cy + Z * sy, Z3 = -X * sy + Z * cy; X = X2; Z = Z3;
    const s = avstand / (avstand + Z);
    return [X * s, Y * s];
  });
}

/* ── underlag ── */
function mjuktBrus(w, h, cell, rnd) {
  const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, g = new Float32Array(gw * gh);
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  const ut = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = x / cell, fy = y / cell, x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0;
    const a = g[y0 * gw + x0], b = g[y0 * gw + x0 + 1], c = g[(y0 + 1) * gw + x0], d = g[(y0 + 1) * gw + x0 + 1];
    ut[y * w + x] = (a * (1 - ax) + b * ax) * (1 - ay) + (c * (1 - ax) + d * ax) * ay;
  }
  return ut;
}
function ritatUnderlag(w, h, sort, rnd) {
  const ut = new Uint8Array(w * h * 3);
  const grov = mjuktBrus(w, h, 40 + rnd() * 60, rnd), fin = mjuktBrus(w, h, 3 + rnd() * 4, rnd);
  let bas, amp = 0, fq = 0, fi = rnd() * Math.PI;
  if (sort === 'tra')        { const m = 0.5 + rnd() * 0.9; bas = [150 * m, 95 * m, 50 * m]; amp = 22; fq = 0.25 + rnd() * 0.5; }
  else if (sort === 'ljust') { const m = 170 + rnd() * 70; bas = [m, m - rnd() * 12, m - rnd() * 25]; amp = 4; fq = 0.2; }
  else if (sort === 'duk')   { bas = [[120, 30, 35], [30, 60, 120], [35, 90, 50], [200, 195, 180], [90, 90, 95]][Math.floor(rnd() * 5)]; amp = 0; }
  else                        { bas = [18 + rnd() * 30, 18 + rnd() * 30, 22 + rnd() * 35]; amp = 0; }   // spelmatta
  const blobbar = sort === 'matta' && rnd() < 0.5 ? [mjuktBrus(w, h, 50, rnd), mjuktBrus(w, h, 50, rnd), mjuktBrus(w, h, 50, rnd)] : null;
  const cf = Math.cos(fi), sf = Math.sin(fi);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x;
    const band = amp ? amp * Math.sin((x * cf + y * sf) * fq + grov[p] * 14) : 0;
    const vav = sort === 'duk' ? 9 * Math.sin(x * 2.1) * Math.sin(y * 2.1) : 0;
    const ljus = 0.8 + 0.4 * grov[p];
    for (let c = 0; c < 3; c++) {
      let v = (bas[c] + band + vav + (fin[p] - 0.5) * 18) * ljus;
      if (blobbar) v += (blobbar[c][p] - 0.4) * 160;
      ut[p * 3 + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
  return ut;
}

/* Riktiga bordsbitar: fönster i golden-fotona som inte rör något spår. */
async function riktigaUnderlag(rnd) {
  const ai = Object.values(JSON.parse(fs.readFileSync(path.join(GOLDEN, 'senaste-ai.json'), 'utf8')));
  const bitar = [];
  for (const fall of ai) {
    const fil = path.join(GOLDEN, 'fall', fall.id, 'bild.jpg');
    const { data, info } = await sharp(fil).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height, S = Math.round(Math.min(W, H) * 0.22);
    let funna = 0;
    for (let forsok = 0; forsok < 400 && funna < 6; forsok++) {
      const x = Math.floor(rnd() * (W - S)), y = Math.floor(rnd() * (H - S));
      const fri = fall.spar.every(t => { const m = 0.03; return (t.x - m) * W > x + S || (t.x + t.w + m) * W < x || (t.y - m) * H > y + S || (t.y + t.h + m) * H < y; });
      if (!fri) continue;
      const bit = new Uint8Array(S * S * 3);
      for (let r = 0; r < S; r++) bit.set(data.subarray(((y + r) * W + x) * 3, ((y + r) * W + x + S) * 3), r * S * 3);
      bitar.push({ data: bit, w: S, h: S, fall: fall.id }); funna++;
    }
  }
  return bitar;
}
/* Underlag i rätt storlek: en bit speglas ut (så att inga sömmar syns). */
function underlagAv(bit, w, h, rnd) {
  const ut = new Uint8Array(w * h * 3), ox = Math.floor(rnd() * bit.w), oy = Math.floor(rnd() * bit.h), sk = 0.6 + rnd() * 0.9;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let sx = Math.floor(x * sk + ox) % (2 * bit.w), sy = Math.floor(y * sk + oy) % (2 * bit.h);
    if (sx >= bit.w) sx = 2 * bit.w - 1 - sx; if (sy >= bit.h) sy = 2 * bit.h - 1 - sy;
    const q = (sy * bit.w + sx) * 3, p = (y * w + x) * 3;
    ut[p] = bit.data[q]; ut[p + 1] = bit.data[q + 1]; ut[p + 2] = bit.data[q + 2];
  }
  return ut;
}

/* Kortet ritas in genom homografin (omvänd avbildning, bilinjärt), med rundade hörn. */
function ritaKort(mal, w, h, kalla, H) {
  const kw = kalla.w, kh = kalla.h, d = kalla.data, r = 0.05 * kw;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = H[6] * x + H[7] * y + H[8], u = (H[0] * x + H[1] * y + H[2]) / s, v = (H[3] * x + H[4] * y + H[5]) / s;
    if (u < 0 || v < 0 || u >= kw - 1 || v >= kh - 1) continue;
    const dx = u < r ? r - u : u > kw - 1 - r ? u - (kw - 1 - r) : 0, dy = v < r ? r - v : v > kh - 1 - r ? v - (kh - 1 - r) : 0;
    if (dx && dy && dx * dx + dy * dy > r * r) continue;
    const x0 = Math.floor(u), y0 = Math.floor(v), ax = u - x0, ay = v - y0, p = (y * w + x) * 3;
    for (let c = 0; c < 3; c++) {
      const a = d[(y0 * kw + x0) * 3 + c], b = d[(y0 * kw + x0 + 1) * 3 + c], e = d[((y0 + 1) * kw + x0) * 3 + c], f = d[((y0 + 1) * kw + x0 + 1) * 3 + c];
      mal[p + c] = (a * (1 - ax) + b * ax) * (1 - ay) + (e * (1 - ax) + f * ax) * ay;
    }
  }
}

const kallCache = new Map();
async function lasKalla(fil, bredd) {
  const k = fil + '|' + bredd; if (kallCache.has(k)) return kallCache.get(k);
  const { data, info } = await sharp(fil).removeAlpha().resize(bredd).raw().toBuffer({ resolveWithObject: true });
  const v = { data, w: info.width, h: info.height };
  if (kallCache.size > 400) kallCache.clear();
  kallCache.set(k, v); return v;
}

async function gorBild(kort, alla, typ, rnd, underlag) {
  const u = (a, b) => a + rnd() * (b - a);
  /* Vilka störningar som är förstärkta: typen själv; 'kombinerad' = två eller
     tre slumpvisa samtidigt (så ser riktiga beskärningar ut: varmt ljus OCH
     lite oskärpa); 'kombinerad-hard' = var och en med 30 % chans, i snitt fem
     på en gång — värre än något golden-foto, ett rent stresstest. */
  const aktiva = new Set();
  if (typ === 'kombinerad') { const val = TYPER.filter(t => t !== 'grund'); const k = rnd() < 0.5 ? 2 : 3; while (aktiva.size < k) aktiva.add(val[Math.floor(rnd() * val.length)]); }
  else if (typ === 'kombinerad-hard') { for (const t of TYPER) if (t !== 'grund' && rnd() < 0.3) aktiva.add(t); }
  else aktiva.add(typ);
  const stark = t => aktiva.has(t);
  let overNamn = null;
  /* Grundnivå: lätt av allt. */
  let theta = u(-5, 5) * Math.PI / 180 + (rnd() < 0.5 ? Math.PI : 0);
  let lutX = u(0, 8) * Math.PI / 180, lutY = u(-4, 4) * Math.PI / 180;
  let kortsida = u(150, 200), oskarpa = u(0.3, 0.8), jpeg = Math.round(u(70, 90)), brus = u(1, 4);
  let vinst = u(0.85, 1.1), farg = [1, 1, 1], lademiss = 0.03, marginal = 0.08;
  if (stark('rotation')) theta = u(0, 2 * Math.PI);
  const rot90 = stark('rot90');
  if (rot90) theta = (rnd() < 0.5 ? 1 : -1) * Math.PI / 2 + u(-8, 8) * Math.PI / 180;
  if (stark('perspektiv')) { lutX = u(20, 42) * Math.PI / 180 * (rnd() < 0.5 ? 1 : -1); lutY = u(-18, 18) * Math.PI / 180; }
  if (stark('lagupplost')) kortsida = u(100, 130);
  if (stark('oskarpa')) oskarpa = u(1.4, 2.8) * kortsida / 160;
  if (stark('jpeg')) jpeg = Math.round(u(10, 30));
  if (stark('varmt')) farg = [u(1.0, 1.15), u(0.82, 0.95), u(0.5, 0.75)];
  else if (stark('kallt')) farg = [u(0.68, 0.85), u(0.9, 1.0), u(1.05, 1.2)];
  if (stark('under')) { vinst = u(0.28, 0.5); brus = u(5, 10); }
  else if (stark('over')) vinst = u(1.5, 2.1);
  if (stark('bakgrund')) { lademiss = 0.10; marginal = u(0.12, 0.25); }
  const avstand = u(3, 6);

  const hn = horn(theta, lutX, lutY, avstand);
  /* Skala: kortets kortsida i bilden = kortsida px. */
  const sidor = [0, 1, 2, 3].map(i => Math.hypot(hn[(i + 1) % 4][0] - hn[i][0], hn[(i + 1) % 4][1] - hn[i][1]));
  const sk = kortsida / Math.min((sidor[0] + sidor[2]) / 2, (sidor[1] + sidor[3]) / 2);
  let px = hn.map(([a, b]) => [a * sk, b * sk]);
  let x0 = Math.min(...px.map(p => p[0])), x1 = Math.max(...px.map(p => p[0])), y0 = Math.min(...px.map(p => p[1])), y1 = Math.max(...px.map(p => p[1]));
  if (rot90) {
    /* Helbildens låda vet inte hur kortet ligger: en stående låda i kortets
       storlek över ett liggande kort — ändarna skärs av. */
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, kort0 = kortsida, lang0 = kortsida / ASPEKT;
    x0 = cx - kort0 / 2; x1 = cx + kort0 / 2; y0 = cy - lang0 / 2; y1 = cy + lang0 / 2;
  }
  let bw = x1 - x0, bh = y1 - y0;
  /* Lådans fel (detektorn träffar inte kanten exakt) och marginalen. */
  x0 += u(-lademiss, lademiss) * bw; x1 += u(-lademiss, lademiss) * bw; y0 += u(-lademiss, lademiss) * bh; y1 += u(-lademiss, lademiss) * bh;
  bw = x1 - x0; bh = y1 - y0;
  x0 -= marginal * bw; x1 += marginal * bw; y0 -= marginal * bh; y1 += marginal * bh;
  const w = Math.max(16, Math.round(x1 - x0)), h = Math.max(16, Math.round(y1 - y0));
  px = px.map(([a, b]) => [a - x0, b - y0]);

  /* Underlaget */
  let bild;
  const ul = underlag.riktiga.length && rnd() < 0.55 ? underlag.riktiga[Math.floor(rnd() * underlag.riktiga.length)] : null;
  if (ul) bild = Float32Array.from(underlagAv(ul, w, h, rnd));
  else bild = Float32Array.from(ritatUnderlag(w, h, ['tra', 'ljust', 'duk', 'matta'][Math.floor(rnd() * 4)], rnd));

  const kalla = await lasKalla(kort.bild, Math.round(kortsida * 1.4));
  const kh = [[0, 0], [kalla.w - 1, 0], [kalla.w - 1, kalla.h - 1], [0, kalla.h - 1]];
  ritaKort(bild, w, h, kalla, homografi(px, kh));

  /* Skymt av ett annat kort som ligger över (20–45 % av kortet). */
  if (stark('kort-over')) {
    const annan = alla[Math.floor(rnd() * alla.length)]; overNamn = annan.name;
    const sida = Math.floor(rnd() * 4), tack = u(0.2, 0.45);
    const f = [[ASPEKT * (1 - tack), u(-0.15, 0.15)], [-ASPEKT * (1 - tack), u(-0.15, 0.15)], [u(-0.1, 0.1), 1 - tack], [u(-0.1, 0.1), -(1 - tack)]][sida];
    const hn2 = horn(theta, lutX, lutY, avstand, [f[0], f[1], u(-0.2, 0.2)]).map(([a, b]) => [a * sk - x0, b * sk - y0]);
    const k2 = await lasKalla(annan.bild, Math.round(kortsida * 1.4));
    ritaKort(bild, w, h, k2, homografi(hn2, [[0, 0], [k2.w - 1, 0], [k2.w - 1, k2.h - 1], [0, k2.h - 1]]));
  }
  /* Ett finger in från en kant: en hudfärgad kapsel över 15–35 % av kortet. */
  if (stark('finger')) {
    const ccx = w / 2, ccy = h / 2, v = u(0, 2 * Math.PI), langd = Math.max(w, h), tj = kortsida * u(0.22, 0.34), in_ = kortsida * u(0.05, 0.45);
    const sx = ccx + Math.cos(v) * langd, sy = ccy + Math.sin(v) * langd, ex = ccx + Math.cos(v) * in_ * -0.2 + Math.cos(v) * (kortsida * 0.5 - in_), ey = ccy + Math.sin(v) * in_ * -0.2 + Math.sin(v) * (kortsida * 0.5 - in_);
    const hud = [[224, 172, 140], [198, 140, 105], [141, 90, 60], [240, 195, 170]][Math.floor(rnd() * 4)];
    const dx = ex - sx, dy = ey - sy, l2 = dx * dx + dy * dy;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let t = ((x - sx) * dx + (y - sy) * dy) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const d = Math.hypot(x - (sx + t * dx), y - (sy + t * dy));
      if (d > tj / 2) continue;
      const skugg = 1 - 0.35 * (d / (tj / 2)) ** 2, p = (y * w + x) * 3;
      for (let c = 0; c < 3; c++) bild[p + c] = hud[c] * skugg;
    }
  }
  /* Skuggkant: ett halvplan mörkare, mjuk kant. */
  if (stark('skugga')) {
    const v = u(0, 2 * Math.PI), nx = Math.cos(v), ny = Math.sin(v), forsk = u(-0.25, 0.25) * Math.min(w, h), djup = u(0.4, 0.7), mjuk = u(4, 25);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const d = ((x - w / 2) * nx + (y - h / 2) * ny - forsk) / mjuk, t = d < -1 ? 0 : d > 1 ? 1 : (d + 1) / 2, k = 1 - djup * t * t * (3 - 2 * t), p = (y * w + x) * 3;
      bild[p] *= k; bild[p + 1] *= k; bild[p + 2] *= k;
    }
  }
  /* Blänk från plastficka: en ljus fläck som tvättar ur bilden + slöja över allt. */
  if (stark('blank')) {
    const gx = w / 2 + u(-0.3, 0.3) * kortsida, gy = h / 2 + u(-0.45, 0.45) * kortsida / ASPEKT, s1 = kortsida * u(0.18, 0.38), s2 = s1 * u(0.35, 1), v = u(0, Math.PI), a = u(0.75, 1), sloja = u(0.05, 0.22);
    const cv = Math.cos(v), sv = Math.sin(v);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ex = (x - gx) * cv + (y - gy) * sv, ey = -(x - gx) * sv + (y - gy) * cv, g = a * Math.exp(-(ex * ex) / (2 * s1 * s1) - (ey * ey) / (2 * s2 * s2)), p = (y * w + x) * 3;
      for (let c = 0; c < 3; c++) { let t = bild[p + c] * (1 - sloja) + 235 * sloja; bild[p + c] = t + (250 - t) * g; }
    }
  }
  /* Ljus, färgstick, brus. */
  const ut = Buffer.alloc(w * h * 3);
  for (let p = 0; p < w * h * 3; p++) {
    const g = (rnd() + rnd() + rnd() - 1.5) * 2 * brus;
    const v = bild[p] * vinst * farg[p % 3] + g;
    ut[p] = v < 0 ? 0 : v > 255 ? 255 : v;
  }
  let s = sharp(ut, { raw: { width: w, height: h, channels: 3 } });
  if (oskarpa >= 0.3) s = s.blur(oskarpa);
  let buf = await s.png().toBuffer();
  if (stark('rorelse')) {
    /* Rörelseoskärpa: medel längs en riktning (kortet läggs ner, handen rör telefonen). */
    const { data } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    const n = Math.round(u(5, 11) * kortsida / 160), v = u(0, Math.PI), ax = Math.cos(v), ay = Math.sin(v), m = Buffer.alloc(w * h * 3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let k = 0; k < n; k++) { const t = k - (n - 1) / 2; let xx = Math.round(x + ax * t), yy = Math.round(y + ay * t); xx = xx < 0 ? 0 : xx >= w ? w - 1 : xx; yy = yy < 0 ? 0 : yy >= h ? h - 1 : yy; sum += data[(yy * w + xx) * 3 + c]; }
      m[(y * w + x) * 3 + c] = sum / n;
    }
    buf = await sharp(m, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
  }
  /* beskar(): en liggande låda vrids −90°. */
  if (w > h) buf = await sharp(buf).rotate(-90).png().toBuffer();
  buf = await sharp(buf).jpeg({ quality: jpeg }).toBuffer();
  return { buf, kortsida: Math.round(kortsida), underlag: ul ? 'foto:' + ul.fall.slice(0, 2) : 'ritat', starka: [...aktiva], over: overNamn };
}

(async () => {
  const lek = arg('lek', 'lek-golden'), ut = arg('ut', 'synt'), N = +arg('n', 4000), fro = +arg('fro', 1);
  const mapp = path.join(L.CACHE, ut); fs.mkdirSync(mapp, { recursive: true });
  /* 64 % jämnt över typerna, 7,5 % stresstestet, resten kombinerad. */
  const plan = [];
  if (arg('typer')) { const val = String(arg('typer')).split(','); for (let i = 0; i < N; i++) plan.push(val[i % val.length]); }   // --typer grund,kombinerad: bara de typerna, varvade
  else {
    const perTyp = Math.floor(N * 0.64 / TYPER.length);
    for (const t of TYPER) for (let i = 0; i < perTyp; i++) plan.push(t);
    for (let i = 0; i < Math.round(N * 0.075); i++) plan.push('kombinerad-hard');
    while (plan.length < N) plan.push('kombinerad');
  }

  if (arg('fran') === undefined) {
    /* Föraren: bitar om 50 i egna processer. sharp/libvips föll med segfault
       på slumpvisa ställen i en lång körning (Node 25, Intel-Mac); varje bild
       har sitt eget frö, så en bit som faller körs bara om — och en bit som
       redan är klar (del-N.json finns) hoppas över. */
    const { spawnSync } = require('child_process');
    const t0 = Date.now();
    const extra = (arg('typer') ? ['--typer', String(arg('typer'))] : []).concat(arg('exkl') ? ['--exkl', String(arg('exkl'))] : []);
    const bit = (fran, till) => spawnSync(process.execPath, [__filename, '--lek', lek, '--ut', ut, '--n', String(N), '--fro', String(fro), '--fran', String(fran), '--till', String(till)].concat(extra), { stdio: ['ignore', 'ignore', 'inherit'] }).status === 0;
    for (let a = 0; a < N; a += BIT) {
      const b = Math.min(N, a + BIT), fil = path.join(mapp, `del-${a}.json`);
      for (let forsok = 0; forsok < 3 && !fs.existsSync(fil); forsok++) bit(a, b);
      if (!fs.existsSync(fil)) {
        /* Biten faller varje gång (samma bildföljd, samma krasch) men varje bild
           går igenom ensam: kör dem en och en och lägg ihop. */
        const del = [];
        for (let i = a; i < b; i++) { for (let f = 0; f < 5 && !bit(i, i + 1); f++); const e = path.join(mapp, `del-${i}.json`); del.push(...JSON.parse(fs.readFileSync(e, 'utf8'))); if (i !== a) fs.unlinkSync(e); }
        fs.writeFileSync(fil, JSON.stringify(del));
      }
      process.stdout.write(`  ${b}/${N}\r`);
    }
    const manifest = [];
    for (let a = 0; a < N; a += BIT) manifest.push(...JSON.parse(fs.readFileSync(path.join(mapp, `del-${a}.json`), 'utf8')));
    for (let a = 0; a < N; a += BIT) fs.unlinkSync(path.join(mapp, `del-${a}.json`));
    fs.writeFileSync(path.join(mapp, 'manifest.json'), JSON.stringify(manifest));
    console.log(`${manifest.length} bilder → ${path.relative(process.cwd(), mapp)} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    if (arg('ark')) {
      const cell = 130, ch = Math.round(cell * 1.45), typer = TYPER.concat(['kombinerad', 'kombinerad-hard']), kol = 6, lager = [];
      for (const [ti, t] of typer.entries()) for (const [k, m] of manifest.filter(m => m.typ === t).slice(0, kol).entries())
        lager.push({ input: await sharp(path.join(mapp, m.fil)).resize(cell, ch, { fit: 'contain', background: '#222' }).toBuffer(), left: k * cell, top: ti * ch });
      await sharp({ create: { width: kol * cell, height: typer.length * ch, channels: 3, background: '#222' } }).composite(lager).jpeg({ quality: 82 }).toFile(path.join(L.CACHE, ut + '-ark.jpg'));
      console.log('rader i arket:', typer.join(', '));
    }
    return;
  }

  /* En bit: bilderna fran..till, var och en med eget frö. */
  sharp.cache(false); sharp.concurrency(1);
  const fran = +arg('fran'), till = +arg('till');
  let kort = L.lasLek(lek);
  if (arg('exkl')) {
    /* Provet "samma konst, annat tryck": bara tryckningar som INTE är referenser
       men vars konstverk finns bland referenserna. */
    const ref = L.lasLek(String(arg('exkl'))), ids = new Set(ref.map(c => c.id)), konst = new Set(ref.map(c => c.illustration));
    kort = kort.filter(c => !ids.has(c.id) && konst.has(c.illustration));
  }
  const namnen = [...new Set(kort.map(c => c.name))];
  const underlag = { riktiga: await riktigaUnderlag(L.mulberry32(fro)) };
  const manifest = [];
  for (let i = fran; i < till; i++) {
    const rnd = L.mulberry32(fro * 1000003 + i * 7919);
    const namn = namnen[Math.floor(rnd() * namnen.length)];
    const mina = kort.filter(c => c.name === namn), c = mina[Math.floor(rnd() * mina.length)];
    const r = await gorBild(c, kort, plan[i], rnd, underlag);
    const fil = `${String(i).padStart(5, '0')}.jpg`;
    fs.writeFileSync(path.join(mapp, fil), r.buf);
    manifest.push({ fil, namn, id: c.id, ram: c.frame, typ: plan[i], kortsidaPx: r.kortsida, underlag: r.underlag, starka: r.starka, over: r.over });
  }
  fs.writeFileSync(path.join(mapp, `del-${fran}.json`), JSON.stringify(manifest));
})().catch(e => { console.error('FEL', e); process.exit(1); });

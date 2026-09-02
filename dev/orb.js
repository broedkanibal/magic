/* ══════════════════════════════════════════════════════════════════
   Lokala särdrag med geometrisk verifiering — ORB i miniatyr.

   Varför inte bara jämföra hela kortet mot en mall (som förut)?
   Tre saker som en helhetsjämförelse inte klarar men det här gör:

     • Övertäckning — behöver bara ~15 synliga punkter, inte hela kortet.
     • Perspektiv   — punkterna får förskjutas, transformen räknas fram.
     • AVVISNING    — ett tangentbord eller en livtotal ger aldrig en
                      geometriskt konsekvent matchning, och faller bort.
                      Det sista är hela poängen: helhetsjämförelsen hade
                      inget sätt att säga "det här är inte ett kort".

   OpenCV.js har ORB men saknar findHomography i standardbygget och väger
   10 MB. Det här är ~400 rader och följer med i filen.
   ══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const NB = 32;                       // 256 bitar per deskriptor
  const PATCH = 31, HALF = 15;
  const FAST_T = 18;                   // hörntröskel
  const CIRC = [[0,-3],[1,-3],[2,-2],[3,-1],[3,0],[3,1],[2,2],[1,3],
                [0,3],[-1,3],[-2,2],[-3,1],[-3,0],[-3,-1],[-2,-2],[-1,-3]];

  /* BRIEF-mönster. Måste vara identiskt när indexet byggs och när det
     används, därför en fast slumpgenerator i stället för Math.random. */
  const PAT = (() => {
    let s = 0x2f6e2b1 >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const gauss = () => {
      let u = 0, v = 0;
      while (!u) u = rnd();
      while (!v) v = rnd();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    const p = new Int8Array(256 * 4);
    for (let i = 0; i < 256; i++) {
      for (let k = 0; k < 4; k++) {
        let v = Math.round(gauss() * (PATCH / 5));
        if (v > HALF - 1) v = HALF - 1;
        if (v < -(HALF - 1)) v = -(HALF - 1);
        p[i * 4 + k] = v;
      }
    }
    return p;
  })();

  /* ── gråskala ur en bild eller canvas ── */
  const gcv = document.createElement('canvas');
  const gcx = gcv.getContext('2d', { willReadFrequently: true });
  function grayOf(src, w, h) {
    gcv.width = w; gcv.height = h;
    gcx.imageSmoothingEnabled = true;
    gcx.imageSmoothingQuality = 'high';
    gcx.setTransform(1, 0, 0, 1, 0, 0);
    gcx.fillStyle = '#000';
    gcx.fillRect(0, 0, w, h);
    gcx.drawImage(src, 0, 0, w, h);
    const d = gcx.getImageData(0, 0, w, h).data;
    const L = new Float32Array(w * h);
    for (let i = 0, j = 0; i < w * h; i++, j += 4) L[i] = d[j] * 0.299 + d[j + 1] * 0.587 + d[j + 2] * 0.114;
    return L;
  }

  /* ── FAST-9 hörn ── */
  function fast(L, W, H, thr) {
    const out = [];
    const off = CIRC.map(([dx, dy]) => dy * W + dx);
    const b = HALF + 2;
    for (let y = b; y < H - b; y++) {
      for (let x = b; x < W - b; x++) {
        const i = y * W + x, p = L[i], hi = p + thr, lo = p - thr;
        // snabbavvisning på de fyra "kompasspunkterna"
        const a0 = L[i + off[0]], a4 = L[i + off[4]], a8 = L[i + off[8]], a12 = L[i + off[12]];
        let nb = (a0 > hi) + (a4 > hi) + (a8 > hi) + (a12 > hi);
        let nd = (a0 < lo) + (a4 < lo) + (a8 < lo) + (a12 < lo);
        if (nb < 3 && nd < 3) continue;
        // full cirkel: 9 sammanhängande ljusare eller mörkare
        let runB = 0, runD = 0, maxB = 0, maxD = 0, score = 0;
        for (let k = 0; k < 24; k++) {
          const v = L[i + off[k & 15]];
          if (v > hi) { runB++; if (runB > maxB) maxB = runB; } else runB = 0;
          if (v < lo) { runD++; if (runD > maxD) maxD = runD; } else runD = 0;
          if (k < 16) score += Math.abs(v - p);
        }
        if (maxB >= 9 || maxD >= 9) out.push({ x, y, score });
      }
    }
    return out;
  }

  /* ── icke-max-undertryckning + bästa N ── */
  function pickBest(kps, n, minDist) {
    kps.sort((a, b) => b.score - a.score);
    const keep = [], d2 = minDist * minDist;
    for (const k of kps) {
      let ok = true;
      for (const q of keep) {
        const dx = k.x - q.x, dy = k.y - q.y;
        if (dx * dx + dy * dy < d2) { ok = false; break; }
      }
      if (ok) keep.push(k);
      if (keep.length >= n) break;
    }
    return keep;
  }

  /* ── orientering via intensitetscentroid ── */
  function orient(L, W, kps) {
    for (const k of kps) {
      let m01 = 0, m10 = 0;
      for (let dy = -HALF; dy <= HALF; dy++) {
        const row = (k.y + dy) * W + k.x;
        for (let dx = -HALF; dx <= HALF; dx++) {
          if (dx * dx + dy * dy > HALF * HALF) continue;
          const v = L[row + dx];
          m01 += dy * v; m10 += dx * v;
        }
      }
      k.a = Math.atan2(m01, m10);
    }
  }

  /* ── roterad BRIEF ── */
  function describe(L, W, H, kps) {
    const out = new Uint8Array(kps.length * NB);
    for (let n = 0; n < kps.length; n++) {
      const k = kps[n], cs = Math.cos(k.a), sn = Math.sin(k.a), base = n * NB;
      for (let i = 0; i < 256; i++) {
        const ax = PAT[i * 4], ay = PAT[i * 4 + 1], bx = PAT[i * 4 + 2], by = PAT[i * 4 + 3];
        const ax2 = Math.round(ax * cs - ay * sn), ay2 = Math.round(ax * sn + ay * cs);
        const bx2 = Math.round(bx * cs - by * sn), by2 = Math.round(bx * sn + by * cs);
        const pa = L[(k.y + ay2) * W + (k.x + ax2)];
        const pb = L[(k.y + by2) * W + (k.x + bx2)];
        if (pa < pb) out[base + (i >> 3)] |= (1 << (i & 7));
      }
    }
    return out;
  }

  /* ── särdrag ur en bild ── */
  /* Orienterade deskriptorer (rBRIEF) gav sämre resultat än oorienterade:
     på suddiga lågupplösta kort blir vinkelskattningen brusig, och då pekar
     mönstret olika håll i fråga och referens. Beskärningen rätas redan upp
     med kortets uppmätta vinkel, så rotationsinvarians behövs inte —
     resterande fel är några grader, vilket BRIEF tål. */
  function features(src, w, h, maxKp, thr, rotInv) {
    const L = grayOf(src, w, h);
    const t = thr == null ? FAST_T : thr;
    let kps = fast(L, w, h, t);
    if (kps.length < 24) kps = fast(L, w, h, Math.max(6, t - 8));
    kps = pickBest(kps, maxKp, 4);
    if (!kps.length) return { kps: [], desc: new Uint8Array(0), w, h };
    if (rotInv) orient(L, w, kps); else for (const k of kps) k.a = 0;
    return { kps, desc: describe(L, w, h, kps), w, h };
  }

  /* ── hamming ── */
  function popcount(v) {
    v = v - ((v >> 1) & 0x55555555);
    v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
    return ((v + (v >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
  }
  function ham(a, ao, b, bo) {
    let d = 0;
    for (let i = 0; i < NB; i += 4) {
      const x = ((a[ao + i] ^ b[bo + i])) | ((a[ao + i + 1] ^ b[bo + i + 1]) << 8) |
                ((a[ao + i + 2] ^ b[bo + i + 2]) << 16) | ((a[ao + i + 3] ^ b[bo + i + 3]) << 24);
      d += popcount(x);
    }
    return d;
  }

  /* ── matcha med Lowes kvottest ── */
  function match(qd, qn, rd, rn, ratio) {
    const out = [];
    const R = ratio == null ? 0.80 : ratio;
    for (let i = 0; i < qn; i++) {
      let b1 = 999, b2 = 999, bi = -1;
      const qo = i * NB;
      for (let j = 0; j < rn; j++) {
        const d = ham(qd, qo, rd, j * NB);
        if (d < b1) { b2 = b1; b1 = d; bi = j; }
        else if (d < b2) b2 = d;
      }
      if (bi >= 0 && b1 < 72 && b1 < b2 * R) out.push({ q: i, r: bi, d: b1 });
    }
    return out;
  }

  /* ── RANSAC på likformig transform (rotation + skala + förflyttning) ──
     Två punktpar räcker för att bestämma modellen. Kortet är plant, så en
     likformig transform är en god approximation av vad kameran gör; en full
     homografi kräver fyra par och är känsligare för brus vid få träffar. */
  function ransac(qk, rk, matches, tolFrac, iters, refSize) {
    const n = matches.length;
    if (n < 4) return { inliers: [], model: null, n: 0 };
    const tol = Math.max(3, (tolFrac == null ? 0.045 : tolFrac) * refSize);
    const tol2 = tol * tol;
    let best = [], bestM = null;
    let seed = 0x9e3779b9 >>> 0;
    const rnd = m => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % m; };
    const IT = iters == null ? 220 : iters;
    for (let it = 0; it < IT; it++) {
      const i1 = rnd(n), i2 = rnd(n);
      if (i1 === i2) continue;
      const a1 = qk[matches[i1].q], b1 = rk[matches[i1].r];
      const a2 = qk[matches[i2].q], b2 = rk[matches[i2].r];
      const dax = a2.x - a1.x, day = a2.y - a1.y;
      const dbx = b2.x - b1.x, dby = b2.y - b1.y;
      const da2 = dax * dax + day * day;
      if (da2 < 36) continue;
      // lös s*R som komplex kvot (db / da)
      const sr = (dbx * dax + dby * day) / da2;
      const si = (dby * dax - dbx * day) / da2;
      const sc = Math.sqrt(sr * sr + si * si);
      if (sc < 0.35 || sc > 2.8) continue;
      const tx = b1.x - (sr * a1.x - si * a1.y);
      const ty = b1.y - (si * a1.x + sr * a1.y);
      const inl = [];
      for (let k = 0; k < n; k++) {
        const a = qk[matches[k].q], b = rk[matches[k].r];
        const px = sr * a.x - si * a.y + tx, py = si * a.x + sr * a.y + ty;
        const ex = px - b.x, ey = py - b.y;
        if (ex * ex + ey * ey < tol2) inl.push(matches[k]);
      }
      if (inl.length > best.length) { best = inl; bestM = { sr, si, tx, ty, scale: sc, rot: Math.atan2(si, sr) }; }
      if (best.length > n * 0.75 && best.length >= 14) break;
    }
    return { inliers: best, model: bestM, n };
  }

  /* Verifiera ETT kandidatkort mot en fråga. Returnerar antal inliers. */
  function verify(qf, rf, opts) {
    const o = opts || {};
    if (!qf.kps.length || !rf.kps.length) return { inliers: 0, model: null };
    const m = match(qf.desc, qf.kps.length, rf.desc, rf.kps.length, o.ratio);
    if (m.length < 4) return { inliers: m.length, model: null, matches: m.length };
    const r = ransac(qf.kps, rf.kps, m, o.tol, o.iters, Math.max(rf.w, rf.h));
    return { inliers: r.inliers.length, model: r.model, matches: m.length };
  }

  /* ── referensbild → särdrag i den konfiguration som mätte bäst ──
     240 px bred och lätt oskärpt. Skärpan MÅSTE likna frågebildens: en
     skarp referens mot en suddig webbkamerabild gav 3/10 rätt, samma
     referens nedskalad och oskärpt gav 10/10. Det var den enskilt
     viktigaste inställningen. */
  const REF_W = 240, REF_H = Math.round(240 / 0.716), REF_BLUR = 1.2;
  const rcv = document.createElement('canvas');
  rcv.width = REF_W; rcv.height = REF_H;
  const rcx = rcv.getContext('2d', { willReadFrequently: true });
  function refFeatures(img, maxKp) {
    rcx.setTransform(1, 0, 0, 1, 0, 0);
    rcx.filter = 'none';
    rcx.fillStyle = '#000';
    rcx.fillRect(0, 0, REF_W, REF_H);
    rcx.imageSmoothingEnabled = true;
    rcx.imageSmoothingQuality = 'high';
    rcx.filter = `blur(${REF_BLUR}px)`;
    rcx.drawImage(img, 0, 0, REF_W, REF_H);
    rcx.filter = 'none';
    return features(rcv, REF_W, REF_H, maxKp || 200, 18, false);
  }
  function queryFeatures(cropCanvas, maxKp) {
    return features(cropCanvas, REF_W, REF_H, maxKp || 300, 14, false);
  }

  /* Packa alla referenser till tre platta arrayer — ett objekt per kort
     skulle kosta både minne och tid att serialisera till IndexedDB. */
  function pack(list) {
    let total = 0;
    for (const f of list) total += f.kps.length;
    const desc = new Uint8Array(total * NB), xy = new Int16Array(total * 2), off = new Int32Array(list.length + 1);
    let k = 0;
    for (let i = 0; i < list.length; i++) {
      off[i] = k;
      const f = list[i];
      desc.set(f.desc, k * NB);
      for (let j = 0; j < f.kps.length; j++) { xy[(k + j) * 2] = f.kps[j].x; xy[(k + j) * 2 + 1] = f.kps[j].y; }
      k += f.kps.length;
    }
    off[list.length] = k;
    return { desc, xy, off, w: REF_W, h: REF_H };
  }
  const _kpBuf = [];
  function unpack(o, i) {
    const a = o.off[i], b = o.off[i + 1], n = b - a;
    _kpBuf.length = 0;
    for (let j = 0; j < n; j++) _kpBuf.push({ x: o.xy[(a + j) * 2], y: o.xy[(a + j) * 2 + 1] });
    return { kps: _kpBuf.slice(), desc: o.desc.subarray(a * NB, b * NB), w: o.w, h: o.h };
  }

  global.ORB = { features, refFeatures, queryFeatures, verify, match, ransac, pack, unpack,
                 NB, PAT, REF_W, REF_H, REF_BLUR };
})(window);

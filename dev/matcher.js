/* ══════════════════════════════════════════════════════════════════
   Visuell kortmatchning mot en begränsad kortpool.

   Poolen är liten (ett set, ~600–800 kort), inte alla 30 000 MTG-kort.
   Det är förutsättningen för att en enkel bildsignatur ska räcka.

   Signaturen består av två fönster:
     • hela kortet  — luminans 16×22 + färg 8×11 (röd−grön, gul−blå)
     • konstverket  — luminans 12×12 + färg 6×6
   Konstverket väger tungt eftersom kortramar ser likadana ut mellan kort;
   det är bilden som skiljer dem åt.

   Luminansen högpassfiltreras (varje ruta minus sitt lokala medelvärde)
   innan normalisering. Det tar bort skrivbordslampans ljusgradient och
   glans, vilket global normalisering inte klarar.

   Sökningen sker i tre steg: grovt över hela poolen, fint kring de bästa,
   och till sist lokal klättring per kandidat — inklusive fri bredd/höjd
   för att kompensera för att kameran ser bordet snett.
   ══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const ASPECT = 0.716;                      // kortets bredd / höjd

  /* Signaturens två fönster. rect anges i kortets egna koordinater (0–1). */
  const PARTS = [
    { key: 'full', rect: [0, 0, 1, 1],                 SW: 32, SH: 44, LW: 16, LH: 22, CW: 8, CH: 11 },
    { key: 'art',  rect: [0.075, 0.105, 0.85, 0.445],  SW: 24, SH: 24, LW: 12, LH: 12, CW: 6, CH: 6 }
  ];
  for (const p of PARTS) { p.NL = p.LW * p.LH; p.NC = p.CW * p.CH; p.N = p.NL + p.NC * 2; }
  let off = 0;
  for (const p of PARTS) { p.off = off; off += p.N; }
  const DESC = off;                          // 528 + 216 = 744 byte
  const SCALE = 40;                          // Int8-kvantisering (±3.17 σ)

  /* Vikter per del. Konstverket är mer särskiljande än ramen. */
  /* Vikterna är uppmätta, inte gissade. Mot en realistisk bänk (glans,
     perspektiv, oskärpa, brus) gav utgångsläget 79 % rätt överst / 89 %
     bland de fem bästa. Högpassfiltret lyfte det till 85/94, och 30 %
     vikt på konstverksfönstret till 89/98. Mer vikt på konstverket blev
     sämre igen — ramfärg och layout bär verklig information. */
  const W = { full: { L: 0.43, A: 0.13, B: 0.13 }, art: { L: 0.21, A: 0.05, B: 0.05 } };
  const OPT = { highpass: true, hpRadius: 2 };

  /* ── arbetsytor ── */
  const gcv = document.createElement('canvas');
  const gctx = gcv.getContext('2d', { willReadFrequently: true });
  const GRAB_W = 176, MARGIN = 0.55;

  const rcv = document.createElement('canvas');
  const rctx = rcv.getContext('2d', { willReadFrequently: true });
  rctx.imageSmoothingEnabled = true;
  rctx.imageSmoothingQuality = 'high';

  /* återanvända buffertar — signaturer beräknas hundratals gånger per sökning */
  const scratch = PARTS.map(p => ({
    L: new Float32Array(p.NL), A: new Float32Array(p.NC), B: new Float32Array(p.NC),
    T: new Float32Array(p.NL)
  }));
  const _tmp = new Int8Array(DESC);

  /* ── normalisering ── */
  function highpass(v, w, h, out, r) {
    // separabelt boxmedel med klippta kanter, sedan v − medel
    const tmp = out;                                  // återanvänd som mellansteg
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0, n = 0;
        for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) { s += v[y * w + xx]; n++; } }
        tmp[y * w + x] = s / n;
      }
    }
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let s = 0, n = 0;
        for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) { s += tmp[yy * w + x]; n++; } }
        out[y * w + x] = v[y * w + x] - s / n;
      }
    }
  }
  function znorm(v, out, o, n) {
    let m = 0;
    for (let i = 0; i < n; i++) m += v[i];
    m /= n;
    let s = 0;
    for (let i = 0; i < n; i++) { const d = v[i] - m; s += d * d; }
    s = Math.sqrt(s / n) || 1;
    for (let i = 0; i < n; i++) {
      const q = Math.round(((v[i] - m) / s) * SCALE);
      out[o + i] = q > 127 ? 127 : q < -128 ? -128 : q;
    }
  }
  function finish(transient) {
    for (let pi = 0; pi < PARTS.length; pi++) {
      const p = PARTS[pi], sc = scratch[pi];
      if (OPT.highpass) { highpass(sc.L, p.LW, p.LH, sc.T, OPT.hpRadius); znorm(sc.T, _tmp, p.off, p.NL); }
      else znorm(sc.L, _tmp, p.off, p.NL);
      znorm(sc.A, _tmp, p.off + p.NL, p.NC);
      znorm(sc.B, _tmp, p.off + p.NL + p.NC, p.NC);
    }
    return transient ? _tmp : new Int8Array(_tmp);
  }
  function clearScratch() {
    for (const s of scratch) { s.L.fill(0); s.A.fill(0); s.B.fill(0); }
  }

  /* ── referenssignatur: en hel, ren kortbild ── */
  function describeImage(img) {
    clearScratch();
    for (let pi = 0; pi < PARTS.length; pi++) {
      const p = PARTS[pi], sc = scratch[pi];
      rcv.width = p.SW; rcv.height = p.SH;
      rctx.imageSmoothingEnabled = true;
      rctx.imageSmoothingQuality = 'high';
      rctx.setTransform(1, 0, 0, 1, 0, 0);
      rctx.fillStyle = '#7f7f7f';
      rctx.fillRect(0, 0, p.SW, p.SH);
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      rctx.drawImage(img, p.rect[0] * iw, p.rect[1] * ih, p.rect[2] * iw, p.rect[3] * ih, 0, 0, p.SW, p.SH);
      const px = rctx.getImageData(0, 0, p.SW, p.SH).data;
      const lby = p.SH / p.LH, lbx = p.SW / p.LW, cby = p.SH / p.CH, cbx = p.SW / p.CW;
      for (let y = 0; y < p.SH; y++) {
        const ly = ((y / lby) | 0) * p.LW, cy = ((y / cby) | 0) * p.CW;
        for (let x = 0; x < p.SW; x++) {
          const i = (y * p.SW + x) << 2, r = px[i], g = px[i + 1], b = px[i + 2];
          sc.L[ly + ((x / lbx) | 0)] += r * 0.299 + g * 0.587 + b * 0.114;
          const ci = cy + ((x / cbx) | 0);
          sc.A[ci] += r - g;
          sc.B[ci] += (r + g) * 0.5 - b;
        }
      }
    }
    return finish(false);
  }

  /* ── "grab": läs in rutan + marginal en gång, sampla sedan i ren JS ── */
  function grab(img, box) {
    const tw = box.w * (1 + 2 * MARGIN), th = box.h * (1 + 2 * MARGIN);
    const gw = GRAB_W, gh = Math.max(8, Math.round(gw * th / tw));
    gcv.width = gw; gcv.height = gh;
    gctx.setTransform(1, 0, 0, 1, 0, 0);
    gctx.imageSmoothingEnabled = true;
    gctx.imageSmoothingQuality = 'high';
    gctx.fillStyle = '#7f7f7f';
    gctx.fillRect(0, 0, gw, gh);
    const x0 = box.x - box.w * MARGIN, y0 = box.y - box.h * MARGIN;
    const s = gw / tw;
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const sx = Math.max(0, Math.floor(x0)), sy = Math.max(0, Math.floor(y0));
    const sx2 = Math.min(iw, Math.ceil(x0 + tw)), sy2 = Math.min(ih, Math.ceil(y0 + th));
    if (sx2 <= sx || sy2 <= sy) return null;
    try {
      gctx.drawImage(img, sx, sy, sx2 - sx, sy2 - sy,
                     (sx - x0) * s, (sy - y0) * s, (sx2 - sx) * s, (sy2 - sy) * s);
    } catch (e) { return null; }
    return { d: gctx.getImageData(0, 0, gw, gh).data, w: gw, h: gh, x0, y0, s };
  }

  /* Signatur för ett roterat rektangelområde i grab-bufferten.
     w och h anges separat: kameran ser bordet snett, så kortet blir
     hoptryckt i höjdled — en gemensam skala klarar inte det. */
  function describeAt(g, cx, cy, w, h, rotDeg, transient) {
    const rad = rotDeg * Math.PI / 180, cs = Math.cos(rad), sn = Math.sin(rad);
    const gw = g.w, gh = g.h, d = g.d, maxX = gw - 1, maxY = gh - 1;
    clearScratch();
    for (let pi = 0; pi < PARTS.length; pi++) {
      const p = PARTS[pi], sc = scratch[pi];
      const rx = p.rect[0], ry = p.rect[1], rw = p.rect[2], rh = p.rect[3];
      const lby = p.SH / p.LH, lbx = p.SW / p.LW, cby = p.SH / p.CH, cbx = p.SW / p.CW;
      for (let oy = 0; oy < p.SH; oy++) {
        const v = (ry + (oy + 0.5) / p.SH * rh - 0.5) * h;
        const ly = ((oy / lby) | 0) * p.LW, cyy = ((oy / cby) | 0) * p.CW;
        for (let ox = 0; ox < p.SW; ox++) {
          const u = (rx + (ox + 0.5) / p.SW * rw - 0.5) * w;
          const ix = cx + u * cs - v * sn, iy = cy + u * sn + v * cs;
          let fx = (ix - g.x0) * g.s - 0.5, fy = (iy - g.y0) * g.s - 0.5;
          fx = fx < 0 ? 0 : fx > maxX ? maxX : fx;
          fy = fy < 0 ? 0 : fy > maxY ? maxY : fy;
          const xi = fx | 0, yi = fy | 0;
          const xj = xi < maxX ? xi + 1 : xi, yj = yi < maxY ? yi + 1 : yi;
          const tx = fx - xi, ty = fy - yi;
          const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
          const i00 = (yi * gw + xi) << 2, i10 = (yi * gw + xj) << 2,
                i01 = (yj * gw + xi) << 2, i11 = (yj * gw + xj) << 2;
          const r = d[i00] * w00 + d[i10] * w10 + d[i01] * w01 + d[i11] * w11;
          const gg = d[i00 + 1] * w00 + d[i10 + 1] * w10 + d[i01 + 1] * w01 + d[i11 + 1] * w11;
          const b = d[i00 + 2] * w00 + d[i10 + 2] * w10 + d[i01 + 2] * w01 + d[i11 + 2] * w11;
          sc.L[ly + ((ox / lbx) | 0)] += r * 0.299 + gg * 0.587 + b * 0.114;
          const ci = cyy + ((ox / cbx) | 0);
          sc.A[ci] += r - gg;
          sc.B[ci] += (r + gg) * 0.5 - b;
        }
      }
    }
    return finish(transient);
  }

  /* ── likhet ── */
  const K = SCALE * SCALE;
  function similarity(a, b) {
    let acc = 0;
    for (let pi = 0; pi < PARTS.length; pi++) {
      const p = PARTS[pi], w = W[p.key];
      let sl = 0, sa = 0, sb = 0;
      let i = p.off; const eL = i + p.NL;
      for (; i < eL; i++) sl += a[i] * b[i];
      const eA = i + p.NC;
      for (; i < eA; i++) sa += a[i] * b[i];
      const eB = i + p.NC;
      for (; i < eB; i++) sb += a[i] * b[i];
      acc += w.L * sl / (p.NL * K) + w.A * sa / (p.NC * K) + w.B * sb / (p.NC * K);
    }
    return acc;
  }

  /* ── sökparametrar ── */
  const P = {
    COARSE_ROT: [0, -8, 8, -17, 17],
    COARSE_SC: [0.75, 0.87, 1.0, 1.12],
    FINE_SC: [0.68, 0.76, 0.84, 0.92, 1.0, 1.08, 1.17],
    FINE_OFF: [-0.085, 0, 0.085],
    FINE_ROT: [-9, -4.5, 0, 4.5, 9],
    // När detektorn redan pekat ut kortet behövs inget brett finsök —
    // läge, storlek och vinkel är nära nog, och steg 3 tar resten.
    HINT_SC: [0.85, 1.0, 1.18, 1.36],
    HINT_OFF: [-0.15, 0, 0.15],
    HINT_ROT: [-5, 0, 5]
  };

  function variants(g, box, scales, dxs, dys, rots) {
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    const out = [];
    for (const sc of scales) {
      const w = box.w * sc, h = box.h * sc;
      for (const dx of dxs) for (const dy of dys) for (const r of rots) {
        out.push({ d: describeAt(g, cx + box.w * dx, cy + box.h * dy, w, h, r), sc, sy: 1, dx, dy, rot: r });
      }
    }
    return out;
  }
  function rankAll(qs, index, keep) {
    const n = index.names.length, all = index.descs;
    const best = new Float32Array(n), bv = new Int16Array(n);
    for (let i = 0; i < n; i++) {
      const ref = all.subarray(i * DESC, i * DESC + DESC);
      let b = -2, bi = 0;
      for (let v = 0; v < qs.length; v++) {
        const s = similarity(qs[v].d, ref);
        if (s > b) { b = s; bi = v; }
      }
      best[i] = b; bv[i] = bi;
    }
    const idx = Array.from({ length: n }, (_, i) => i);
    idx.sort((a, b) => best[b] - best[a]);
    return idx.slice(0, keep).map(i => ({ i, score: best[i], vi: bv[i] }));
  }

  /* Lokal klättring per kandidat. sy är höjdens skala relativt bredden —
     den fångar perspektivet när kameran ser bordet snett. */
  function refine(g, box, index, results, topN) {
    const cx0 = box.x + box.w / 2, cy0 = box.y + box.h / 2;
    const n = Math.min(topN, results.length);
    const scLo = P.FINE_SC[0] * 0.92, scHi = P.FINE_SC[P.FINE_SC.length - 1] * 1.25;
    const OFF = 0.26, SY_LO = 0.78, SY_HI = 1.22;
    const cl = t => {
      t.sc = t.sc < scLo ? scLo : t.sc > scHi ? scHi : t.sc;
      t.sy = t.sy < SY_LO ? SY_LO : t.sy > SY_HI ? SY_HI : t.sy;
      t.dx = t.dx < -OFF ? -OFF : t.dx > OFF ? OFF : t.dx;
      t.dy = t.dy < -OFF ? -OFF : t.dy > OFF ? OFF : t.dy;
      return t;
    };
    const at = t => describeAt(g, cx0 + box.w * t.dx, cy0 + box.h * t.dy,
                              box.w * t.sc, box.h * t.sc * t.sy, t.rot, true);
    for (let k = 0; k < n; k++) {
      const r = results[k];
      if (!r.fit) continue;
      const ref = index.descs.subarray(r.i * DESC, r.i * DESC + DESC);
      let cur = r.fit, best = r.score;
      let sStep = 0.05, oStep = 0.042, rStep = 3.2, yStep = 0.05;
      for (let it = 0; it < 5; it++) {
        let moved = false;
        for (let j = 0; j < 10; j++) {
          const t = { sc: cur.sc, sy: cur.sy, dx: cur.dx, dy: cur.dy, rot: cur.rot };
          if (j === 0) t.sc = cur.sc * (1 + sStep);
          else if (j === 1) t.sc = cur.sc * (1 - sStep);
          else if (j === 2) t.dx = cur.dx + oStep;
          else if (j === 3) t.dx = cur.dx - oStep;
          else if (j === 4) t.dy = cur.dy + oStep;
          else if (j === 5) t.dy = cur.dy - oStep;
          else if (j === 6) t.rot = cur.rot + rStep;
          else if (j === 7) t.rot = cur.rot - rStep;
          else if (j === 8) t.sy = cur.sy * (1 + yStep);
          else t.sy = cur.sy * (1 - yStep);
          cl(t);
          const s = similarity(at(t), ref);
          if (s > best) { best = s; cur = t; moved = true; }
        }
        if (!moved) { sStep *= 0.5; oStep *= 0.5; rStep *= 0.5; yStep *= 0.5; }
      }
      r.score = best;
      r.fit = cur;
    }
    results.sort((a, b) => b.score - a.score);
  }

  /* Ett försök med "robust" poängsättning — kasta de sämst matchande
     cellerna innan poängen räknas, för att hantera överlappande kort — gav
     exakt noll skillnad i mätningar vid 35–75 % behållna celler. Vid kraftig
     övertäckning finns rätt kort inte ens bland kandidaterna, så det hjälper
     inte att omvärdera dem. Borttaget; detekteringen får i stället se till
     att kortet hamnar i ifyllnadslistan. */

  function scan(img, box, index, opts) {
    const o = opts || {};
    const g = grab(img, box);
    if (!g) return { error: 'tainted', results: [] };
    const t0 = performance.now();

    // När detektorn redan gett vinkel och storlek räcker ett smalare grovsök.
    const hint = o.hint;
    const rots = hint != null
      ? [hint - 8, hint, hint + 8, hint + 172, hint + 180, hint + 188]
      : o.orientation === 'up' ? P.COARSE_ROT
      : o.orientation === 'flip' ? P.COARSE_ROT.map(r => r + 180)
      : P.COARSE_ROT.concat(P.COARSE_ROT.map(r => r + 180));
    const cscales = hint != null ? [0.9, 1.0, 1.1] : P.COARSE_SC;
    const coarse = variants(g, box, cscales, [0], [0], rots);
    const keep = Math.min(index.names.length, o.keep || 70);
    const top = rankAll(coarse, index, keep);

    // högst tre basrotationer — utan tak exploderar antalet varianter
    const cnt = new Map();
    top.slice(0, 12).forEach((t, rank) => {
      const r = coarse[t.vi].rot;
      const e = cnt.get(r) || { n: 0, best: rank };
      e.n++;
      cnt.set(r, e);
    });
    const baseRots = Array.from(cnt.entries())
      .sort((a, b) => b[1].n - a[1].n || a[1].best - b[1].best)
      .slice(0, hint != null ? 2 : 3).map(e => e[0]);
    const fRot = hint != null ? P.HINT_ROT : P.FINE_ROT;
    const fSc = hint != null ? P.HINT_SC : P.FINE_SC;
    const fOff = hint != null ? P.HINT_OFF : P.FINE_OFF;
    const fineRots = [];
    for (const br of baseRots) for (const dr of fRot) fineRots.push(br + dr);
    const fine = variants(g, box, fSc, fOff, fOff, Array.from(new Set(fineRots)));

    const results = top.map(t => {
      let best = -2, bv = null;
      const ref = index.descs.subarray(t.i * DESC, t.i * DESC + DESC);
      for (let v = 0; v < fine.length; v++) {
        const s = similarity(fine[v].d, ref);
        if (s > best) { best = s; bv = fine[v]; }
      }
      return {
        i: t.i, name: index.names[t.i], id: index.ids ? index.ids[t.i] : null,
        score: best, fit: bv ? { sc: bv.sc, sy: 1, dx: bv.dx, dy: bv.dy, rot: bv.rot } : null
      };
    }).sort((a, b) => b.score - a.score);

    refine(g, box, index, results, o.refine == null ? 14 : o.refine);

    const conf = results.length > 1 ? results[0].score - results[1].score : 1;
    const f = results[0] && results[0].fit;
    const lo = P.FINE_SC[0], hi = P.FINE_SC[P.FINE_SC.length - 1];
    const edge = !f ? 0 : f.sc <= lo * 0.96 ? -1 : f.sc >= hi * 1.04 ? 1 : 0;
    return { results, ms: Math.round(performance.now() - t0), confidence: conf, edge, grab: g };
  }

  /* Grovt luminansrutnät, 8×11, z-normaliserat. Används för att bygga
     "genomsnittskortet" som detektorn letar efter. Medvetet UTAN
     högpassfilter: filtret kostade mer än allt annat i detektorsvepet
     tillsammans, och z-normaliseringen räcker för att detektera. */
  const G8W = 8, G8H = 11, G8N = G8W * G8H;
  const g8cv = document.createElement('canvas');
  g8cv.width = 32; g8cv.height = 44;
  const g8x = g8cv.getContext('2d', { willReadFrequently: true });
  g8x.imageSmoothingEnabled = true;
  g8x.imageSmoothingQuality = 'high';
  function grid8(img) {
    g8x.setTransform(1, 0, 0, 1, 0, 0);
    g8x.fillStyle = '#7f7f7f';
    g8x.fillRect(0, 0, 32, 44);
    g8x.drawImage(img, 0, 0, 32, 44);
    const px = g8x.getImageData(0, 0, 32, 44).data;
    const g = new Float32Array(G8N);
    for (let y = 0; y < 44; y++) {
      const gy = ((y / 4) | 0) * G8W;
      for (let x = 0; x < 32; x++) {
        const i = (y * 32 + x) << 2;
        g[gy + ((x / 4) | 0)] += px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
      }
    }
    let m = 0;
    for (let k = 0; k < G8N; k++) m += g[k];
    m /= G8N;
    let s = 0;
    for (let k = 0; k < G8N; k++) { const d = g[k] - m; s += d * d; }
    s = Math.sqrt(s / G8N) || 1;
    for (let k = 0; k < G8N; k++) g[k] = (g[k] - m) / s;
    return g;
  }

  /* "Genomsnittskortet": medelvärdet av hela poolens luminanssignaturer.
     Konstverken tar ut varandra och kvar blir det alla magickort har
     gemensamt — titelrad, konstruta, typrad, textruta. Det är den strukturen
     detektorn letar efter, i stället för en mörk ram mot bordet. En ram
     fungerar bara när korten ligger isär; strukturen syns även när de
     ligger omlott. */
  function template(index) {
    if (index._tmpl) return index._tmpl;
    if (!index.tmpl) return null;                    // pool byggd före mallstödet
    const t = Float32Array.from(index.tmpl);
    let m = 0;
    for (let k = 0; k < G8N; k++) m += t[k];
    m /= G8N;
    let s = 0;
    for (let k = 0; k < G8N; k++) { const d = t[k] - m; s += d * d; }
    s = Math.sqrt(s / G8N) || 1;
    for (let k = 0; k < G8N; k++) t[k] = (t[k] - m) / s;
    index._tmpl = { grid: t, LW: G8W, LH: G8H, n: G8N };
    return index._tmpl;
  }

  global.Matcher = {
    DESC, ASPECT, MARGIN, PARTS, params: P, weights: W, opt: OPT, template,
    describeImage, describeAt, grab, similarity, variants, rankAll, refine, scan, grid8,
    tune(k) { if (k) Object.assign(P, k); },
    tuneW(k) { if (k) for (const key in k) Object.assign(W[key], k[key]); }
  };
})(window);

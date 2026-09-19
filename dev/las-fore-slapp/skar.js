/* Skär ut kortet ur en region som är HAND + KORT.
   MES-246 del 1, fråga b. Används av dev/las-fore-slapp/las.html.

   Detektorn i index.html ger en region — allt som skiljer sig från mattan.
   Medan handen håller kortet är den regionen hand + kort och har inte ett
   korts mått, så det finns ingen beskärning att läsa. Den här filen provar
   om kortet ändå går att lägga ut, med två saker som är kända:

     · kortets mått i bildpunkter (kortRef), som kameran redan mäter
     · att ett kort är en RAK REKTANGEL: den del som sticker fram ur handen
       har raka kanter mot mattan och minst ett hörn

   Gången:
     1. Varje bildpunkt sorteras i matta (mörk), hud (hudfärgad) eller kort.
     2. Största sammanhängande kort-klumpen är det som syns av kortet.
     3. Klumpens minsta omslutande rektangel ger kortets VINKEL — dess långa,
        raka kant mot mattan är det som styr.
     4. I den vinkeln provas åtta lägen (fyra hörn × stående/liggande) av en
        rektangel med kortets kända mått. Det läge vinner som täcker klumpen,
        inte har matta inuti sig och inte sticker ut ur bilden.
     5. Domen: vann något läge med god marginal är kortet utskuret, och
        `synlig` säger hur stor del av kortet som faktiskt syns (resten är
        handen).

   Ingenting här är kedjans kod — det är förslaget som del 2 skulle behöva.
   window.Skar. */
(function (global) {
  'use strict';

  /* ── bildpunkternas sorter ──────────────────────────────────────── */
  /* Mattan är nästan svart (mätt i inspelningen: 15–45 gråsteg), handen är
     varm och ljus (R klart över B), kortet är allt annat: ljus ram, vit
     textruta, färgat konstverk, och plastfickans blänk. */
  const MATTA = 0, HUD = 1, KORT = 2;
  function sortera(d, n, o) {
    const s = new Uint8Array(n);
    const mattaMax = o.mattaMax, hudDiff = o.hudDiff;
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      const r = d[p], g = d[p + 1], b = d[p + 2];
      const v = r > g ? (r > b ? r : b) : (g > b ? g : b);
      if (v <= mattaMax) { s[i] = MATTA; continue; }
      /* Hud: rött över blått med god marginal, och inte alltför ljust
         (en vit textruta har också r > b men bara någon enstaka nivå). */
      const mattnad = v ? (v - (r < g ? (r < b ? r : b) : (g < b ? g : b))) / v : 0;
      s[i] = (r - b >= hudDiff && r >= g && g >= b - 4 && mattnad >= 0.22 && mattnad <= 0.62) ? HUD : KORT;
    }
    return s;
  }

  /* Mattans nivå ur bilden själv: den mörka toppen i histogrammet. */
  function mattaNiva(d, n) {
    const h = new Int32Array(256);
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      const r = d[p], g = d[p + 1], b = d[p + 2];
      h[r > g ? (r > b ? r : b) : (g > b ? g : b)]++;
    }
    let topp = 0, bast = -1;
    for (let v = 0; v < 110; v++) if (h[v] > bast) { bast = h[v]; topp = v; }
    /* Gränsen läggs där histogrammet har sjunkit till en tiondel av toppen. */
    let g = topp;
    for (let v = topp; v < 200; v++) { if (h[v] < bast * 0.10) { g = v; break; } g = v; }
    return Math.max(topp + 8, Math.min(g, topp + 55));
  }

  /* ── klumpar ────────────────────────────────────────────────────── */
  function klumpar(s, W, H, sort, minArea) {
    const n = W * H, sedd = new Uint8Array(n), ko = new Int32Array(n), ut = [];
    for (let st = 0; st < n; st++) {
      if (s[st] !== sort || sedd[st]) continue;
      let h = 0, t = 0; ko[t++] = st; sedd[st] = 1;
      let x0 = W, y0 = H, x1 = -1, y1 = -1, antal = 0;
      const pix = [];
      while (h < t) {
        const q = ko[h++], x = q % W, y = (q / W) | 0;
        antal++; pix.push(q);
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x > 0 && s[q - 1] === sort && !sedd[q - 1]) { sedd[q - 1] = 1; ko[t++] = q - 1; }
        if (x < W - 1 && s[q + 1] === sort && !sedd[q + 1]) { sedd[q + 1] = 1; ko[t++] = q + 1; }
        if (y > 0 && s[q - W] === sort && !sedd[q - W]) { sedd[q - W] = 1; ko[t++] = q - W; }
        if (y < H - 1 && s[q + W] === sort && !sedd[q + W]) { sedd[q + W] = 1; ko[t++] = q + W; }
      }
      if (antal >= minArea) ut.push({ antal, box: { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }, pix });
    }
    return ut.sort((a, b) => b.antal - a.antal);
  }

  /* ── minsta omslutande rektangel (roterande skjutmått) ──────────── */
  function skrov(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const kryss = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const ned = [], upp = [];
    for (const q of p) { while (ned.length >= 2 && kryss(ned[ned.length - 2], ned[ned.length - 1], q) <= 0) ned.pop(); ned.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upp.length >= 2 && kryss(upp[upp.length - 2], upp[upp.length - 1], q) <= 0) upp.pop(); upp.push(q); }
    ned.pop(); upp.pop();
    return ned.concat(upp);
  }
  function minstaRekt(pts) {
    const h = skrov(pts);
    if (h.length < 3) return null;
    let bast = null;
    for (let i = 0; i < h.length; i++) {
      const a = h[i], b = h[(i + 1) % h.length];
      const vinkel = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const c = Math.cos(-vinkel), s = Math.sin(-vinkel);
      let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
      for (const q of h) {
        const u = q[0] * c - q[1] * s, v = q[0] * s + q[1] * c;
        if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v;
      }
      const yta = (u1 - u0) * (v1 - v0);
      if (!bast || yta < bast.yta) bast = { yta, vinkel, u0, u1, v0, v1 };
    }
    return bast;
  }

  /* ── huvudsaken ─────────────────────────────────────────────────── */
  /* bild: en canvas eller Image med regionen (hand + kort) plus marginal.
     o.kortLang, o.kortKort: kortets mått i bildens bildpunkter.
     Svar:
       { ok, rekt: {cx, cy, lang, kort, vinkel}, synlig, matta, ute, poang,
         skal }  — allt i bildens egna bildpunkter. */
  function skar(bild, o) {
    const ARB = o.arbetsbredd || 320;
    const skala = Math.min(1, ARB / bild.width);
    const W = Math.max(8, Math.round(bild.width * skala)), H = Math.max(8, Math.round(bild.height * skala));
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx2 = cv.getContext('2d', { willReadFrequently: true });
    cx2.imageSmoothingQuality = 'high';
    cx2.drawImage(bild, 0, 0, W, H);
    const d = cx2.getImageData(0, 0, W, H).data, n = W * H;
    const mattaMax = o.mattaMax != null ? o.mattaMax : mattaNiva(d, n);
    const s = sortera(d, n, { mattaMax, hudDiff: o.hudDiff != null ? o.hudDiff : 26 });
    const L = o.kortLang * skala, K = o.kortKort * skala;
    const kl = klumpar(s, W, H, KORT, Math.max(30, 0.02 * L * K));
    if (!kl.length) return { ok: false, skal: 'ingen kortklump', mattaMax };
    const bl = kl[0];
    const pts = bl.pix.map(q => [q % W, (q / W) | 0]);
    const mr = minstaRekt(pts);
    if (!mr) return { ok: false, skal: 'ingen rektangel', mattaMax };

    /* Vinkelkandidater: den minsta rektangelns vinkel, och samma ± 90°.
       Den raka kanten mot mattan är den som styr, och den ligger alltid i
       en av dem. Några grader åt vardera hållet provas också — klumpens
       hörn är hackiga. */
    const vinklar = [];
    for (const g of [-4, -2, 0, 2, 4]) vinklar.push(mr.vinkel + g * Math.PI / 180);

    let bast = null;
    for (const vinkel of vinklar) {
      const c = Math.cos(-vinkel), si = Math.sin(-vinkel);
      let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
      for (const q of pts) { const u = q[0] * c - q[1] * si, v = q[0] * si + q[1] * c; if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v; }
      for (const lagg of [[L, K], [K, L]]) {            // [bredd i u, höjd i v]
        const bu = lagg[0], bv = lagg[1];
        if (u1 - u0 > bu + 3 || v1 - v0 > bv + 3) continue;   // klumpen ryms inte
        /* Fyra hörn: klumpen dras till vart och ett av rektangelns hörn. */
        for (const hu of [0, 1]) for (const hv of [0, 1]) {
          const ru0 = hu ? u1 - bu : u0, rv0 = hv ? v1 - bv : v0;
          const p = poang(s, W, H, vinkel, ru0, rv0, bu, bv, bl.antal);
          if (!bast || p.poang > bast.poang) bast = Object.assign(p, { vinkel, ru0, rv0, bu, bv });
        }
      }
    }
    if (!bast) return { ok: false, skal: 'kortet ryms inte i klumpen', mattaMax, klump: bl.antal };

    /* Rektangelns mitt tillbaka i bildens koordinater. */
    const c = Math.cos(bast.vinkel), si = Math.sin(bast.vinkel);
    const mu = bast.ru0 + bast.bu / 2, mv = bast.rv0 + bast.bv / 2;
    const mx = mu * c - mv * si, my = mu * si + mv * c;
    const lang = Math.max(bast.bu, bast.bv), kortS = Math.min(bast.bu, bast.bv);
    /* Vinkeln för LÅNGSIDAN, som i kameran. */
    const langVinkel = bast.bu >= bast.bv ? bast.vinkel : bast.vinkel + Math.PI / 2;
    const ok = bast.matta <= (o.mattaTak != null ? o.mattaTak : 0.10) && bast.ute <= 0.05 && bast.tacker >= 0.9;
    return {
      ok, skal: ok ? null : (bast.matta > 0.10 ? 'matta inuti kortet' : bast.ute > 0.05 ? 'utanför bilden' : 'klumpen täcks inte'),
      rekt: { cx: mx / skala, cy: my / skala, lang: lang / skala, kort: kortS / skala, vinkel: langVinkel },
      synlig: +bast.synlig.toFixed(3), matta: +bast.matta.toFixed(3), hud: +bast.hud.toFixed(3),
      ute: +bast.ute.toFixed(3), tacker: +bast.tacker.toFixed(3), poang: +bast.poang.toFixed(3),
      mattaMax, klump: bl.antal, arbW: W, arbH: H
    };
  }

  /* Hur bra ett läge är: inget matta inuti kortet, klumpen täckt, inget
     utanför bilden. */
  function poang(s, W, H, vinkel, ru0, rv0, bu, bv, klumpAntal) {
    const c = Math.cos(vinkel), si = Math.sin(vinkel);
    const steg = Math.max(1, Math.round(Math.min(bu, bv) / 40));
    let n = 0, matta = 0, hud = 0, kort = 0, ute = 0, klump = 0;
    for (let u = 0; u < bu; u += steg) for (let v = 0; v < bv; v += steg) {
      const uu = ru0 + u, vv = rv0 + v;
      const x = Math.round(uu * c - vv * si), y = Math.round(uu * si + vv * c);
      n++;
      if (x < 0 || y < 0 || x >= W || y >= H) { ute++; continue; }
      const t = s[y * W + x];
      if (t === 0) matta++; else if (t === 1) hud++; else { kort++; klump++; }
    }
    if (!n) return { poang: -1, matta: 1, hud: 0, synlig: 0, ute: 1, tacker: 0 };
    const mA = matta / n, hA = hud / n, kA = kort / n, uA = ute / n;
    /* Andelen av KLUMPEN som ligger inne i rektangeln (grovt: kort-andelen
       gånger rektangelns yta mot klumpens). */
    const tacker = Math.min(1, (kA * bu * bv) / Math.max(1, klumpAntal));
    return { poang: kA + hA - 3 * mA - 3 * uA, matta: mA, hud: hA, synlig: kA, ute: uA, tacker };
  }

  /* Beskär den utskurna rektangeln upprätt, som beskar() gör men med
     kortets egen vinkel — det är vad en riktig utskärning skulle ge. */
  function rakUt(bild, rekt, bredd) {
    const skala = Math.min(1, bredd / rekt.kort);
    const ow = Math.max(8, Math.round(rekt.kort * skala)), oh = Math.max(8, Math.round(rekt.lang * skala));
    const c = document.createElement('canvas'); c.width = ow; c.height = oh;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingQuality = 'high';
    x.translate(ow / 2, oh / 2);
    /* rekt.vinkel är långsidans vinkel mot x-axeln; kortet ska stå upp. */
    x.rotate(-(rekt.vinkel - Math.PI / 2));
    x.scale(skala, skala);
    x.translate(-rekt.cx, -rekt.cy);
    x.drawImage(bild, 0, 0);
    return c;
  }

  global.Skar = { skar, rakUt, mattaNiva, MATTA, HUD, KORT };
})(window);

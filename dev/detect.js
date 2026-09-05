/* ══════════════════════════════════════════════════════════════════
   Automatisk avläsning av en skärmdump från ett videosamtal.

   Två steg, båda utan externa bibliotek:

   1. Videorutor. Videosamtalet lägger spelarna i ett rutnät med helsvarta
      mellanrum. En kolumn som är svart hela vägen ner är mellanrum eller
      tom ruta — allt annat är innehåll. Samma sak radvis inom varje
      kolumnband ger rutnätets celler.

   2. Kort i en ruta. Ett magickort är en MÖRK RAM mot ett ljusare bord
      och ett ljusare innehåll. Det går att mäta direkt med integralbilder:
      medelljus i ramen jämfört med innanför och strax utanför. Att svepa
      rutan i några vinklar fångar kort som ligger snett. Det är både
      enklare och tåligare än att försöka segmentera fram korten — särskilt
      när de överlappar varandra, vilket de nästan alltid gör.

   Detektorn föreslår bara var kort KAN finnas. Matcharen avgör sedan vad
   de föreställer, och förslag som inte liknar något kort faller bort.
   ══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const ASPECT = 0.716;

  /* ── hjälpare ── */
  function work(img, sx, sy, sw, sh, maxW) {
    const s = Math.min(1, maxW / sw);
    const w = Math.max(8, Math.round(sw * s)), h = Math.max(8, Math.round(sh * s));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.imageSmoothingEnabled = true;
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    return { cv, data: cx.getImageData(0, 0, w, h).data, w, h, k: sw / w, ox: sx, oy: sy };
  }
  function luma(data, n) {
    const L = new Float32Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) L[i] = data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114;
    return L;
  }
  function runs(flags, minLen) {
    const out = [];
    let s = -1;
    for (let i = 0; i < flags.length; i++) {
      if (flags[i]) { if (s < 0) s = i; }
      else if (s >= 0) { if (i - s >= minLen) out.push([s, i]); s = -1; }
    }
    if (s >= 0 && flags.length - s >= minLen) out.push([s, flags.length]);
    return out;
  }

  /* ══ 1. videorutor ══ */

  /* Videoappens sidopanel — den med "Cards / Game Log", sökrutan, "Last Card"
     och listan över tidigare spelade kort — innehåller kortBILDER. Ett svep
     över den ger 12 förslag, varav 3 tar sig förbi ljusfiltret: kort som
     aldrig legat på något bord.

     Att den ändå hållit sig utanför rutorna var tur, inte en regel. Panelens
     bakgrund ligger på luma 16–18 och tröskeln för svart är 30, så den råkar
     läsas som samma svarta list som ramar in videon. Marginalen är 13 luma.
     Sätts tröskeln till 14 — vad ett ljusare tema motsvarar — slås de två
     rutorna ihop till EN som når bildkanten, och hela panelen följer med.
     Då försvinner dessutom den svarta raden mellan rutorna, så de två
     spelarna slås ihop till en.

     Den letas därför upp för sig. Panelen är en enfärgad UI-yta mot bildens
     högerkant: andelen pixlar inom ±6 luma från bakgrundstonen är 0.99 inne i
     panelen mot 0.00–0.03 i videokolumnerna, och håller sig över 0.35 även
     genom kortminiatyrerna. Uppmätt 12.5 % av bredden på den ena
     skärmdumpen och 12.2 % på den andra, bakgrundston 18 i båda. */
  function sidebarZone(L, W, H) {
    /* Tonen tas från fyra kolumner, inte från den yttersta: där ligger en
       1 px ram på luma 28 som ensam skulle ge fel ton. */
    const bins = new Int32Array(64);
    for (let x = W - 4; x < W; x++) for (let y = 0; y < H; y++) bins[Math.min(63, L[y * W + x] >> 2)]++;
    let bi = 0;
    for (let i = 1; i < 64; i++) if (bins[i] > bins[bi]) bi = i;
    const bg = bi * 4 + 2, andel = bins[bi] / (4 * H);
    /* Golvet på 12 skiljer panelen (16–22) från ren brevlådesvärta (0–2);
       taket och andelen stänger ute videokolumner (andel 0.02–0.09) och en
       beskärning av bara bordet (ton 130+). */
    if (bg < 12 || bg > 40 || andel < 0.60) return null;
    /* Vandringen får inte stanna på första kolumnen som inte passar. Panelen
       har en 1 px ram på luma 26, och den ligger utanför ±6-fönstret: i en
       nedskalad bild medelvärdas den bort, men i en beskärning där en
       arbetskolumn är nästan en bildpunkt blev den yttersta kolumnen ramen —
       zonen blev noll bred och panelen släpptes in igen. Tre kolumners
       tålamod räcker: videokolumnerna ligger på 0.00–0.03 och stoppar ändå,
       kortminiatyrerna på 0.35–0.42 och passerar. */
    let x0 = W, miss = 0;
    for (let x = W - 1; x >= 0; x--) {
      let n = 0;
      for (let y = 0; y < H; y++) if (Math.abs(L[y * W + x] - bg) <= 6) n++;
      if (n / H < 0.20) { if (++miss > 3) break; continue; }
      miss = 0; x0 = x;
    }
    const bredd = W - x0;
    return (bredd >= W * 0.03 && bredd <= W * 0.45) ? x0 : null;
  }

  function findPanes(img) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const im = work(img, 0, 0, iw, ih, 640);
    const L = luma(im.data, im.w * im.h), W = im.w, H = im.h;
    const BLACK = 30, FULL = 0.965;
    const zon = sidebarZone(L, W, H);                  // kolumn där panelen börjar, eller null
    const XMAX = zon == null ? W : zon;

    const colFlags = new Array(W);
    for (let x = 0; x < W; x++) {
      let n = 0;
      for (let y = 0; y < H; y++) if (L[y * W + x] < BLACK) n++;
      colFlags[x] = x < XMAX && (n / H) < FULL;
    }
    const panes = [];
    for (const [x0, xr] of runs(colFlags, Math.round(W * 0.10))) {
      const x1 = Math.min(xr, XMAX);                   // en löpa som vuxit in i panelen kapas här
      const bw = x1 - x0;
      if (bw <= 0) continue;
      const rowFlags = new Array(H);
      for (let y = 0; y < H; y++) {
        let n = 0;
        for (let x = x0; x < x1; x++) if (L[y * W + x] < BLACK) n++;
        rowFlags[y] = (n / bw) < FULL;
      }
      for (const [y0, y1] of runs(rowFlags, Math.round(H * 0.10))) {
        const w = bw, h = y1 - y0, ar = w / h;
        if (w < W * 0.18) continue;                    // videorutor är breda, UI-paneler smala
        if (ar < 0.8 || ar > 3.6) continue;            // videorutor är liggande
        if (w * h < W * H * 0.03) continue;
        panes.push({ x: x0 * im.k, y: y0 * im.k, w: w * im.k, h: h * im.k });
      }
    }
    /* Nödfallsrutan måste också stanna vid panelen. Annars släpps hela
       sidopanelen in varje gång ingen ruta hittades. */
    if (!panes.length) panes.push({ x: 0, y: 0, w: XMAX * im.k, h: ih });
    panes.sort((a, b) => (a.y - b.y) || (a.x - b.x));
    /* Zonen följer med ut: snappaTillKort söker i en fritt svävande kvadrat
       som inte är begränsad till någon ruta, och behöver samma spärr. */
    panes.zon = zon == null ? null : zon * im.k;
    return panes;
  }

  /* ══ 2. kortförslag i en ruta ══ */
  function rotatedLuma(srcCanvas, deg) {
    const rad = deg * Math.PI / 180;
    const c = Math.abs(Math.cos(rad)), s = Math.abs(Math.sin(rad));
    const w = srcCanvas.width, h = srcCanvas.height;
    const W = Math.ceil(w * c + h * s), H = Math.ceil(w * s + h * c);
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.fillStyle = '#000';
    cx.fillRect(0, 0, W, H);
    cx.translate(W / 2, H / 2);
    cx.rotate(-rad);                                   // motrotera så kort i vinkel blir raka
    cx.drawImage(srcCanvas, -w / 2, -h / 2);
    const d = cx.getImageData(0, 0, W, H).data;
    return { L: luma(d, W * H), W, H, rad, w, h };
  }
  function backMap(r, X, Y) {
    const dx = X - r.W / 2, dy = Y - r.H / 2;
    const c = Math.cos(r.rad), s = Math.sin(r.rad);    // invers av −rad
    return { x: dx * c - dy * s + r.w / 2, y: dx * s + dy * c + r.h / 2 };
  }
  function integral(L, W, H) {
    const W1 = W + 1, I = new Float64Array(W1 * (H + 1));
    for (let y = 0; y < H; y++) {
      let run = 0;
      for (let x = 0; x < W; x++) { run += L[y * W + x]; I[(y + 1) * W1 + x + 1] = I[y * W1 + x + 1] + run; }
    }
    return I;
  }
  const rsum = (I, W1, x0, y0, x1, y1) =>
    I[y1 * W1 + x1] - I[y0 * W1 + x1] - I[y1 * W1 + x0] + I[y0 * W1 + x0];

  /* Kortlikhet.

     Första försöket mätte ramen som helhet mot innanmätet. Det gick fel:
     den svarta bakgrunden runt hela videorutan blev en jättelik "kortram"
     och vann över de riktiga korten. Rätt mått ställer krav på VARJE sida
     för sig — ett kort har mörk kant runt om, inte bara på ett håll — och
     jämför kanten både med kortets insida och med bordet strax utanför.
     Poängen är den svagaste sidan, så ett ensamt mörkt streck räcker inte. */
  function cardness(I, W1, W, H, x, y, w, h) {
    const b = Math.max(2, Math.round(w * 0.06));
    const x1 = x + w, y1 = y + h;
    if (x < 0 || y < 0 || x1 > W || y1 > H) return -1e9;
    const ix0 = x + b, iy0 = y + b, ix1 = x1 - b, iy1 = y1 - b;
    if (ix1 <= ix0 + 3 || iy1 <= iy0 + 3) return -1e9;
    const inner = rsum(I, W1, ix0, iy0, ix1, iy1) / ((ix1 - ix0) * (iy1 - iy0));
    const p = Math.max(2, Math.round(w * 0.09));
    const side = (rx0, ry0, rx1, ry1, ox0, oy0, ox1, oy1) => {
      const ra = (rx1 - rx0) * (ry1 - ry0);
      if (ra <= 0) return -1e9;
      const ring = rsum(I, W1, rx0, ry0, rx1, ry1) / ra;
      const cx0 = Math.max(0, ox0), cy0 = Math.max(0, oy0);
      const cx1 = Math.min(W, ox1), cy1 = Math.min(H, oy1);
      const oa = (cx1 - cx0) * (cy1 - cy0);
      const out = oa > 0 ? rsum(I, W1, cx0, cy0, cx1, cy1) / oa : inner;
      return (inner + out) * 0.5 - ring;
    };
    /* Poängen är den SVAGASTE sidan. Ett försök att kompensera för lampglans
       genom att dela med hur nära vitt området låg gjorde det klart sämre —
       det belönade platta överexponerade bordsytor i stället för kort. */
    return Math.min(
      side(x, y, x1, y + b,        x, y - p, x1, y),          // ovan
      side(x, y1 - b, x1, y1,      x, y1, x1, y1 + p),        // under
      side(x, y + b, x + b, y1 - b, x - p, y, x, y1),         // vänster
      side(x1 - b, y + b, x1, y1 - b, x1, y, x1 + p, y1)      // höger
    );
  }

  /* ── mallmatchning: "ser det här ut som ett magickort inuti?" ──
     Korrelation mellan fönstrets 8×11-luminansrutnät och poolens
     genomsnittskort. Till skillnad från ramtestet bryr den sig inte om vad
     som finns UTANFÖR kortet, och fungerar därför även när korten ligger
     omlott — vilket de nästan alltid gör på ett riktigt bord.

     Cellgränserna förberäknas per kortstorlek: att räkna ut dem per fönster
     kostade mer än själva jämförelsen. */
  const TW = 8, TH = 11, TN = TW * TH;
  const _t = new Float32Array(TN);
  const _offs = new Map();
  function offsets(w, h) {
    const key = w * 4096 + h;
    let o = _offs.get(key);
    if (o) return o;
    const xs = new Int32Array(TW + 1), ys = new Int32Array(TH + 1);
    for (let c = 0; c <= TW; c++) xs[c] = Math.round(c * w / TW);
    for (let r = 0; r <= TH; r++) ys[r] = Math.round(r * h / TH);
    for (let c = 0; c < TW; c++) if (xs[c + 1] <= xs[c]) xs[c + 1] = xs[c] + 1;
    for (let r = 0; r < TH; r++) if (ys[r + 1] <= ys[r]) ys[r + 1] = ys[r] + 1;
    const area = new Float32Array(TN);
    for (let r = 0; r < TH; r++)
      for (let c = 0; c < TW; c++) area[r * TW + c] = 1 / ((xs[c + 1] - xs[c]) * (ys[r + 1] - ys[r]));
    o = { xs, ys, area };
    _offs.set(key, o);
    return o;
  }
  function tmplScore(I, W1, W, H, x, y, w, h, T) {
    if (x < 0 || y < 0 || x + w > W || y + h > H) return -1e9;
    const o = offsets(w, h), xs = o.xs, ys = o.ys, area = o.area;
    let m = 0;
    for (let r = 0; r < TH; r++) {
      const y0 = (y + ys[r]) * W1, y1 = (y + ys[r + 1]) * W1;
      for (let c = 0; c < TW; c++) {
        const x0 = x + xs[c], x1 = x + xs[c + 1];
        const v = (I[y1 + x1] - I[y0 + x1] - I[y1 + x0] + I[y0 + x0]) * area[r * TW + c];
        _t[r * TW + c] = v;
        m += v;
      }
    }
    m /= TN;
    let s = 0;
    for (let k = 0; k < TN; k++) { const d = _t[k] - m; s += d * d; }
    s = Math.sqrt(s / TN);
    if (s < 1e-3) return -1e9;                    // helt platt yta — inget kort
    let dot = 0;
    for (let k = 0; k < TN; k++) dot += (_t[k] - m) * T[k];
    return dot / (s * TN);
  }

  /* Alla kortförslag i en ruta.

     Två svep. Det första letar brett över storlekar och hittar hur stora
     korten är i rutan; det andra går tätt vid just den storleken och ger
     välcentrerade träffar. Finns en kortpool används genomsnittskortet som
     mall — annars faller detektorn tillbaka på ramtestet. */
  function proposeCards(img, pane, opts) {
    const o = Object.assign({ maxW: 760, rots: [-26, -19, -13, -6, 0, 6, 13, 19, 26], want: 18 }, opts || {});
    const im = work(img, pane.x, pane.y, pane.w, pane.h, o.maxW);
    const T = o.template ? o.template.grid : null;

    const frames = o.rots.map(deg => {
      const r = rotatedLuma(im.cv, deg);
      return { deg, r, I: integral(r.L, r.W, r.H), W1: r.W + 1 };
    });
    const inside = (r, x, y, w, h) => {
      const m = w * 0.16;
      for (const [px, py] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
        const q = backMap(r, px, py);
        if (q.x < -m || q.y < -m || q.x > r.w + m || q.y > r.h + m) return false;
      }
      return true;
    };
    const scoreAt = (f, x, y, cw, ch) => T
      ? tmplScore(f.I, f.W1, f.r.W, f.r.H, x, y, cw, ch, T)
      : cardness(f.I, f.W1, f.r.W, f.r.H, x, y, cw, ch) / 60;
    const sweep = (widths, stepFrac, minScore, useFrames) => {
      const out = [];
      for (const f of (useFrames || frames)) {
        const r = f.r;
        for (const cw of widths) {
          const ch = Math.round(cw / ASPECT);
          if (ch >= r.H || cw >= r.W) continue;
          const step = Math.max(2, Math.round(cw * stepFrac));
          for (let y = 0; y + ch <= r.H; y += step) {
            for (let x = 0; x + cw <= r.W; x += step) {
              const s = scoreAt(f, x, y, cw, ch);
              if (s < minScore) continue;
              if (!inside(r, x, y, cw, ch)) continue;
              out.push({ score: s, deg: f.deg, w: cw, x, y, f });
            }
          }
        }
      }
      return out;
    };

    const MIN = T ? 0.14 : 0.16;

    /* Känd kortstorlek: hoppa över storleksuppskattningen och sök bara läge och
       vinkel. Uppskattningen behöver en yta med flera kort för att bli stabil,
       så den fungerar inte i ett litet fönster runt EN punkt — och det är just
       vad som behövs när något annat redan sagt var kortet ligger. */
    if (o.fixedW) {
      const wf = Math.max(8, Math.round(o.fixedW / im.k));
      const nära = sweep(Array.from(new Set([0.94, 1.0, 1.06].map(f => Math.round(wf * f)))), 0.05, -1e9);
      if (!nära.length) return { proposals: [], work: im, cardW: o.fixedW };
      nära.sort((a, b) => b.score - a.score);
      const valda = [];
      for (const c of nära) {
        const u = backMap(c.f.r, c.x + c.w / 2, c.y + (c.w / ASPECT) / 2);
        if (valda.some(v => Math.abs(v.ux - u.x) < wf * 0.5 && Math.abs(v.uy - u.y) < wf * 0.5)) continue;
        valda.push({ score: c.score, deg: c.deg, w: c.w, ux: u.x, uy: u.y });
        if (valda.length >= (o.want || 1)) break;
      }
      return {
        proposals: valda.map(c => ({
          score: c.score, deg: c.deg,
          cx: pane.x + c.ux * im.k, cy: pane.y + c.uy * im.k,
          w: c.w * im.k, h: (c.w / ASPECT) * im.k
        })),
        work: im, cardW: o.fixedW
      };
    }

    const wMin = Math.max(16, im.w * 0.07), wMax = im.w * 0.30;
    const w1 = [];
    for (let w = wMin; w <= wMax; w *= 1.14) w1.push(Math.round(w));
    const pass1 = sweep(w1, 0.22, MIN);
    if (!pass1.length) return { proposals: [], work: im, cardW: 0 };
    pass1.sort((a, b) => b.score - a.score);
    /* Kortstorlek: den bredd vars BÄSTA träffar är starkast.
       Ett viktat histogram över alla träffar var systematiskt fel — små
       fönster får långt fler positioner att samla poäng på, så summan pekade
       alltid mot för små kort. Medelvärdet av de fem bästa poängen per
       bredd har inte den snedvridningen, eftersom det inte beror på hur
       många fönster som fanns. */
    const perW = new Map();
    for (const c of pass1) {
      let a = perW.get(c.w);
      if (!a) { a = []; perW.set(c.w, a); }
      if (a.length < 5) a.push(c.score);
      else if (c.score > a[4]) { a[4] = c.score; a.sort((x, y) => y - x); }
    }
    let wRef = 0, bestV = -1e9;
    for (const [w, a] of perW) {
      if (a.length < 3) continue;
      const v = a.reduce((s, x) => s + x, 0) / a.length;
      if (v > bestV) { bestV = v; wRef = w; }
    }
    if (!wRef) wRef = pass1[0].w;

    // Svep 2 går tätt kring den funna storleken. Ladderns bredd är satt så
    // att även en storleksgissning som är 25 % fel fångas upp.
    const w2 = Array.from(new Set([0.88, 1.0, 1.13].map(f => Math.round(wRef * f))));
    const pass2 = sweep(w2, 0.06, MIN);
    const cands = pass2.length ? pass2 : pass1;
    cands.sort((a, b) => b.score - a.score);

    /* Absolut tröskel när mallen används. Uppmätt på en ruta med
       tangentbord, mus och videoöverlägg: riktiga kort 0.79–0.89,
       allt annat 0.48–0.69. Bara en relativ tröskel räckte inte — om det
       bäst poängsatta råkade vara ett tangentbord blev allt relativt det. */
    /* tmplScore är en korrelationskoefficient — mallen z-normaliseras i
       template() — så score når aldrig över 1.0 och 0.55*score aldrig över
       0.55. Math.max(0.70, ...) var därför alltid exakt 0.70 och såg bara ut
       att anpassa sig efter bästa träffen. Skrivet som den konstant det är. */
    const cut = T ? 0.70 : cands[0].score * 0.38;
    /* Inget "behåll minst N" när mallen används. Regeln var tänkt som skydd
       om toppvärdet råkade komma från något som inte var ett kort, men med
       en absolut tröskel gör den bara skada: den tvingade igenom ett förslag
       med mallpoäng 0.64 i en ruta med fyra kort, och det blev ett felaktigt
       kort i handen. */
    const MIN_KEEP = T ? 0 : 5;
    const keep = [];
    for (const c of cands) {
      if (c.score < cut && keep.length >= MIN_KEEP) break;
      const p = backMap(c.f.r, c.x + c.w / 2, c.y + (c.w / ASPECT) / 2);
      let dup = false;
      for (const k of keep) {
        const lim = Math.min(c.w, k.w);
        if (Math.abs(p.x - k.ux) < lim * 0.55 && Math.abs(p.y - k.uy) < lim * 0.55) { dup = true; break; }
      }
      if (dup) continue;
      keep.push({ score: c.score, deg: c.deg, w: c.w, ux: p.x, uy: p.y });
      if (keep.length >= o.want) break;
    }
    return {
      proposals: keep.map(c => ({
        score: c.score, deg: c.deg,
        cx: pane.x + c.ux * im.k, cy: pane.y + c.uy * im.k,
        w: c.w * im.k, h: (c.w / ASPECT) * im.k
      })),
      work: im, cardW: wRef * im.k
    };
  }

  global.Detect = { findPanes, sidebarZone, proposeCards, cardness, integral, rotatedLuma, work, ASPECT };
})(window);

/* ══════════════════════════════════════════════════════════════════
   Den tränade detektorn (MES-288 → MES-329): hittar korten i
   kamerabilden, lokalt i webbläsaren.

   YOLOX-nano (Megvii, Apache-2.0), finjusterad på Mesas bord (grind 3,
   natt 2: dev/detektor/tran/GRIND3.md). Tre klasser: kort, baksida och
   namnrad — remsan högst upp på kortet där namnet står. Remsan är det som
   gör högarna läsbara: i en tät landhög syns bara namnremsorna, och
   dubblettsteget (NMS) slog ihop kortlådorna. Uppmätt mot MES-246-facit
   (GRIND3.md): kortlådor ensamma 728/738 kort och 97/107 hela högar, 0
   falska; kortlåda ELLER remsa 738/738 och 105/105. Golden (8 fall med
   hörn): kortlådor 73/74, 2 falska (en flisa vid kanten i 06).

   Modellen tar en bild på 960 × 544: bilden skalas (bevarat format) in
   uppe till vänster, resten fylls med 114, BGR 0–255 som i OpenCV (samma
   som forbehandla i tran/prov.py). Utdata: en rad per ankare, 10 710 rader
   × 8 tal — cx, cy, w, h i indatans bildpunkter, objektpoäng, tre
   klasspoäng. Poäng = objekt × klass. Trösklarna är valda på valideringen
   och ändras inte utan mätning: kortlådor (kort + baksida) ≥ 0,56 med
   NMS 0,7 klassoberoende; remsor ≥ 0,68 med NMS 0,6 bland remsorna.

   Parningen (para): en remsa hör till den kortlåda i vars kant den ligger
   — överkanten för ett otappat kort, en sidkant för ett tappat (remsan står
   på högkant). Två kortlådor som delar remsa är dubbletter och slås ihop.
   En remsa utan kortlåda är ett kort som dubblettsteget slagit ihop med
   grannen: kortet skapas ur remsan med kortstorleken, åt det håll grannens
   kropp ligger från grannens remsa. Mätt i tran/parprov.py innan den
   kopplades in i appen.

   Körs med onnxruntime-web, samma laddning och samma backend-val som
   bildmodellen (dev/embed/embed.js): WebGPU när det finns, annars WASM.
   Samma form som embed.js: en fristående fil, window.Detektor — och i
   node (module.exports) de rena delarna, så att parprov.py mäter exakt
   den kod appen kör. Appens koppling bor i index.html (KamDet).
   ══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const V = 1;                               // modellens version i lagringen: ändras den hämtas filen om
  const BREDD = 960, HOJD = 544, FYLL = 114, FALT = 8;
  const KLASSER = ['kort', 'baksida', 'namnrad'];
  /* Valda på valideringen (dataset v3): troskel_val.py, nms_val.py, remsprov.py. */
  const T = { kort: 0.56, nmsKort: 0.7, remsa: 0.68, nmsRemsa: 0.6, golv: 0.02 };
  const REMSA = 0.14;                        // remsans höjd i andel av kortets höjd (dev/detektor/remsa.py)
  const KVOT = 0.716;                        // ett Magic-kort är 63 × 88 mm
  const ORT_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';
  const FORVAL = {
    ort: ORT_CDN + 'ort.webgpu.min.js', wasmPaths: ORT_CDN,
    /* fp32 på båda vägarna tills fp16 är mätt på telefonen (MES-329 steg 6). */
    modell: { fp32: 'dev/detektor/modell/yolox_nano_mesa_960x544.onnx', fp16: 'dev/detektor/modell/yolox_nano_mesa_960x544_fp16.onnx' },
    backend: 'auto',                         // 'auto' | 'webgpu' | 'wasm'
    variant: 'fp32'                          // 'fp32' | 'fp16'
  };

  /* ── rena delar: geometri, avkodning, parning ── */
  const iou = (a, b) => {
    const x0 = Math.max(a.x0, b.x0), y0 = Math.max(a.y0, b.y0), x1 = Math.min(a.x1, b.x1), y1 = Math.min(a.y1, b.y1);
    const s = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
    const u = (a.x1 - a.x0) * (a.y1 - a.y0) + (b.x1 - b.x0) * (b.y1 - b.y0) - s;
    return u > 0 ? s / u : 0;
  };
  /* Högsta poäng först; allt som överlappar en behållen låda mer än tak kastas. */
  function nms(dets, tak) {
    const s = dets.slice().sort((a, b) => b.poang - a.poang), kvar = [];
    for (const d of s) if (kvar.every(k => iou(d, k) <= tak)) kvar.push(d);
    return kvar;
  }
  const klipp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

  /* Modellens utdata → lådor i källbildens bildpunkter. ut: tal [n × 8]
     (cx cy w h obj k0 k1 k2); r: skalan källa → indata (lådorna delas med
     den); W, H: källans mått, lådorna klipps mot dem. Etiketten är den
     bästa klassen (som prov.py); remsorna räknas ur sin egen kolumn över
     alla ankare (som remsprov.py), så ett ankare kan vara både kortlåda
     och remsa. Svar: { kort, remsor } efter tröskel och NMS. */
  function avkoda(ut, r, W, H, tro) {
    tro = Object.assign({}, T, tro || {});   // ett ofullständigt tro (bara tak) ska inte ge noll lådor
    const kort = [], remsor = [], n = Math.floor(ut.length / FALT);
    const lada = (o, poang, klass) => {
      const cx = ut[o], cy = ut[o + 1], w = ut[o + 2], h = ut[o + 3];
      return { x0: klipp((cx - w / 2) / r, 0, W), y0: klipp((cy - h / 2) / r, 0, H), x1: klipp((cx + w / 2) / r, 0, W), y1: klipp((cy + h / 2) / r, 0, H), poang, klass };
    };
    for (let i = 0; i < n; i++) {
      const o = i * FALT, obj = ut[o + 4];
      if (!(obj >= tro.golv)) continue;
      const k0 = ut[o + 5], k1 = ut[o + 6], k2 = ut[o + 7];
      const sr = obj * k2;
      if (sr >= tro.remsa) remsor.push(lada(o, sr, 'namnrad'));
      /* argmax som numpy: första bästa vid lika. */
      const kl = k0 >= k1 && k0 >= k2 ? 0 : k1 >= k2 ? 1 : 2;
      if (kl === 2) continue;
      const sk = obj * (kl === 0 ? k0 : k1);
      if (sk >= tro.kort) kort.push(lada(o, sk, KLASSER[kl]));
    }
    return { kort: nms(kort, tro.nmsKort), remsor: nms(remsor, tro.nmsRemsa), raKort: kort.length, raRemsor: remsor.length };
  }

  /* Kortstorleken ur bildens egna kortlådor: medianen av lång- och kortsida
     över lådorna med kortets kvot (0,6–0,85 — hela, otäckta kort). null
     under två sådana. */
  function mattUr(kort) {
    const l = [], k = [];
    for (const b of kort) {
      const w = b.x1 - b.x0, h = b.y1 - b.y0, kv = Math.min(w, h) / Math.max(w, h);
      if (kv >= 0.6 && kv <= 0.85) { l.push(Math.max(w, h)); k.push(Math.min(w, h)); }
    }
    if (l.length < 2) return null;
    const med = a => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
    return { lang: med(l), kort: med(k), av: l.length };
  }

  /* Remsa ↔ kortlåda. kort och remsor efter avkoda (samma bildpunkter);
     matt: kortstorleken { lang, kort } i samma bildpunkter, eller null (då
     ur bildens egna lådor, annars ur remsans längd). o.lod / o.vag: åt
     vilket håll kroppen ligger från en remsa utan granne (+1 = nedåt / åt
     höger, −1 = uppåt / åt vänster); förval nedåt och åt vänster (ett kort
     som tappats medurs har sin överkant åt höger).
     Svar: kortlådorna, var och en med remsa (eller null) och ur: 'lada'
     (modellens egen) eller 'remsa' (skapad ur en remsa utan låda). */
  function para(kort, remsor, matt, o) {
    o = o || {};
    /* Toleranserna räknas i KORTETS höjd (lådans sida tvärs remsan), inte i
       remsans tjocklek: i en tät hög ligger korten 11–20 % av korthöjden
       isär (MES-246), och den detekterade remsan är tjockare än facits 14 %.
       Mätt i tran/parprov.py: 0,6 remstjocklekar slog ihop två Plains i
       samma hög i sex lägen; 5 % av korthöjden gör det inte. */
    const TOL = o.tol != null ? o.tol : 0.05, TOL2 = o.tol2 != null ? o.tol2 : 0.08;
    const DUB_IOU = o.dubIou != null ? o.dubIou : 0.3;     // dubbletter: delad remsa och minst så här mycket täckning (appens värde; 0,5 slog aldrig ihop något)
    const SKAPA = o.skapa || 'alla';                        // 'alla' | 'fria' (bara remsor utanför varje låda) | 'inga'
    const INNE = o.inne != null ? o.inne : 0;              // > 0: en låda som till så stor del ligger inne i en starkare kastas (nollprovets inneslutning)
    const FORM = o.form || 'hel';                           // skapade kort: 'hel' (kortets höjd) | 'synlig' (fram till nästa kort i högen)
    /* Längs remsan (MES-331): en remsa som hör till en låda spänner över
       lådans sida — den börjar och slutar inom LANGS av sidans längd från
       lådans kanter. Bara i dubblettsteget: i en hög som förskjuts längs
       remsans riktning (golden 06: liggande kort, remsorna lodräta i högra
       kanten) ligger det främre kortets remsa inne i det bakre kortets hela
       låda vid samma kant — passning 0, men 0,4 sidor in. Utan måttet
       dömdes mittkortet (0,86) som en dubblett av Plains (IoU 0,44) och
       försvann. Mätt i tran/parprov.py (MES-246 + golden) före och efter. */
    const LANGS = o.langs != null ? o.langs : 0.25;
    const tjock = s => Math.max(1, Math.min(s.x1 - s.x0, s.y1 - s.y0));
    const vagrat = s => (s.x1 - s.x0) >= (s.y1 - s.y0);
    const langs = (s, k) => vagrat(s)
      ? Math.max(Math.abs(s.x0 - k.x0), Math.abs(s.x1 - k.x1)) / Math.max(1, k.x1 - k.x0)
      : Math.max(Math.abs(s.y0 - k.y0), Math.abs(s.y1 - k.y1)) / Math.max(1, k.y1 - k.y0);
    /* Hur långt från sin kant remsan sitter i lådan, i andel av lådans sida
       tvärs remsan: över- eller underkanten för en vågrät remsa, vänster-
       eller högerkanten för en stående. Infinity när remsans mitt ligger
       utanför lådan eller remsan sticker ut mer än sin tjocklek i sin egen
       längdriktning. */
    const passning = (s, k) => {
      const t = tjock(s), cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2;
      if (cx < k.x0 || cx > k.x1 || cy < k.y0 || cy > k.y1) return Infinity;
      if (vagrat(s)) {
        if (s.x0 < k.x0 - t || s.x1 > k.x1 + t) return Infinity;
        return Math.min(Math.abs(s.y0 - k.y0), Math.abs(s.y1 - k.y1)) / Math.max(1, k.y1 - k.y0);
      }
      if (s.y0 < k.y0 - t || s.y1 > k.y1 + t) return Infinity;
      return Math.min(Math.abs(s.x0 - k.x0), Math.abs(s.x1 - k.x1)) / Math.max(1, k.x1 - k.x0);
    };
    let ut = kort.map(k => Object.assign({}, k, { remsa: null, ur: 'lada' }));
    /* 0. En remsa är låg och lång: 14 % av kortets höjd och nästan hela
       bredden (tjocklek/längd ≈ 0,2 i facit; den detekterade är tjockare,
       0,25–0,37 — i golden 05, 1440 px bred, 77 av 210). Tjockare än 0,45
       är den något annat: två remsor som NMS lagt ihop, eller en bit av ett
       tappat kort (MES-246 222,65 s: 143 × 299 = 0,48 på ett kort på
       488 × 329). Den räknas inte. 0,35 kastade golden 05:s riktiga remsor,
       och det täckta kortet fick aldrig sin täckning. */
    /* …0,50 sedan MES-331 pass 4: golden 15:s ensamma Plains (liggande, titeln
       på högkant i högerkanten) har en remsa på 23 × 50 analyspixlar = 0,46,
       som 0,45 kastade — kortet stod osäkert utan remsa att läsa. Det betyder
       att biten av ett tappat kort ovan (0,48) nu släpps igenom: den paras
       bara om den sitter i en lådas kant (passning), och det den läses mot
       har remsans egen gräns (T.remsaTroskel). Mätt i tran/parprov.py med
       appens inställningar: MES-246 och golden oförändrade (728/738, 37
       dubbletter, 97/107 högar; golden 75/75), golden 0 nya fel namn. */
    /* …0,70 sedan 2026-10-03 (MES-331): ett tappat kort ligger sällan rakt
       90° — Jesper tappar 60–70° — och den raka lådan runt en snett liggande
       remsa blir då 0,50–0,69 tjock. Filtret kastade remsan på 25 av 38
       tappade kort i golden 18:s inspelning (13b) och 42 av 114 i MES-246,
       med modellens poäng median 0,88: modellen såg dem, filtret tog dem.
       Mätt i tran/remsfall.py (varje kort genom stegen) och tran/parprov.py:
       13b land i hög med remsa 32 → 42/42, MES-246 219 → 248/257, hela högar
       99 → 105/107, dubbletter och falska oförändrade, golden-fotona 72/75
       oförändrade; 0,8 ger exakt samma som 0,7. */
    remsor = remsor.filter(s => tjock(s) / Math.max(1, Math.max(s.x1 - s.x0, s.y1 - s.y0)) <= (o.tjockMax != null ? o.tjockMax : 0.7));
    /* 1. Dubbletter: två lådor som båda har remsan i sin kant OCH täcker
       varandra (IoU ≥ DUB_IOU, 0,3 — en dubblett är ofta lådan runt den
       synliga delen bredvid lådan runt hela kortet, så de överlappar inte
       till hälften) är samma kort. Den med högst poäng behålls (som NMS
       hade gjort). Utan IoU-kravet slogs två tappade Plains i samma hög
       ihop (IoU 0,45 — de delade en bred remsa). */
    const bort = new Set();
    let dubbletter = 0;
    for (const s of remsor) {
      const pass = [];
      ut.forEach((k, ki) => { if (!bort.has(ki) && passning(s, k) <= TOL && langs(s, k) <= LANGS) pass.push(ki); });
      if (pass.length < 2) continue;
      const bast = pass.reduce((a, b) => ut[b].poang > ut[a].poang ? b : a);
      for (const ki of pass) if (ki !== bast && iou(ut[ki], ut[bast]) >= DUB_IOU) { bort.add(ki); dubbletter++; }
    }
    ut = ut.filter((k, ki) => !bort.has(ki));
    if (INNE > 0) {
      const andelInne = (a, b) => { const x0 = Math.max(a.x0, b.x0), y0 = Math.max(a.y0, b.y0), x1 = Math.min(a.x1, b.x1), y1 = Math.min(a.y1, b.y1); const s = Math.max(0, x1 - x0) * Math.max(0, y1 - y0), aa = (a.x1 - a.x0) * (a.y1 - a.y0); return aa > 0 ? s / aa : 0; };
      const kvar = [];
      for (const k of ut.slice().sort((a, b) => b.poang - a.poang)) { if (kvar.some(q => andelInne(k, q) >= INNE)) { dubbletter++; continue; } kvar.push(k); }
      ut = kvar;
    }
    /* 2. Tilldelning: bästa passning först, en remsa per låda och en låda
       per remsa; först inom TOL, sedan inom TOL2 för det som blev över (en
       remsa som sitter några bildpunkter fel ska inte bli ett eget kort). */
    const tagna = new Set();
    for (const tol of [TOL, TOL2]) {
      const par = [];
      remsor.forEach((s, si) => { if (tagna.has(si)) return; ut.forEach((k, ki) => { if (k.remsa) return; const p = passning(s, k); if (p <= tol) par.push({ p, si, ki, poang: k.poang }); }); });
      par.sort((a, b) => a.p - b.p || b.poang - a.poang);
      for (const q of par) { if (tagna.has(q.si) || ut[q.ki].remsa) continue; ut[q.ki].remsa = remsor[q.si]; tagna.add(q.si); }
    }
    /* 3. Remsor utan låda → ett kort var, med kortstorleken, åt det håll
       grannens kropp ligger från grannens remsa (samma hög, samma riktning). */
    const m = matt || mattUr(ut);
    const mitt = s => ({ x: (s.x0 + s.x1) / 2, y: (s.y0 + s.y1) / 2 });
    const inne = (p, k) => p.x >= k.x0 && p.x <= k.x1 && p.y >= k.y0 && p.y <= k.y1;
    let skapade = 0, hogar = 0;
    /* Två remsors avstånd tvärs sin riktning, i den tunnares tjocklek (appens remsaIsar, index.html): under ISAR är
       det samma titel två gånger — NMS 0,6 släpper igenom par med IoU under 0,6, och de ligger högst ~0,45 isär;
       två kort i en hög ligger minst ~0,8 isär (golden 04). */
    const ISAR = o.isar != null ? o.isar : 0.6;
    const ihop = (a, b) => { if (vagrat(a) !== vagrat(b)) return false; const ca = mitt(a), cb = mitt(b), t = Math.min(tjock(a), tjock(b)); return Math.hypot(ca.x - cb.x, ca.y - cb.y) / t < ISAR; };
    /* 2b. En låda som är en HÖG (MES-340 steg 2.2): ytan mer än HOG_YTA kort (kortstorleken m) och minst en remsa
       inne i den. Dubblettsteget (NMS 0,7) har lagt en låda över flera kort — golden 17:s hög B: en låda över tre
       tappade land, som appen dömde som skräp för att den inte var kortformad, och högens remsor kastades med den.
       Lådan ersätts av ett kort per remsa inne i den (lådan ur remsan och kortstorleken, åt lådans mitt); remsor som
       ligger ihop (ISAR) räknas en gång. Bara med en kortstorlek (m), aldrig utan remsa: en låda utan remsa har
       inget att läsa och går till kamIdentifiera som förut. o.hog slår på (appen: T.detHog). */
    const HOG_YTA = o.hogYta != null ? o.hogYta : 1.5;
    const skapaUr = (s, si, lod, vag) => {
      const vg = vagrat(s), c = mitt(s), t = tjock(s), hinder = [];
      if (FORM === 'synlig') { for (const k of ut) hinder.push(k); remsor.forEach((q, qi) => { if (qi !== si) hinder.push(q); }); }
      const sidled = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)) >= 0.5 * (a1 - a0);
      let b;
      if (vg) {
        const w = m ? m.kort : (s.x1 - s.x0) / 0.92, h = m ? m.lang : w / KVOT;
        let y0, y1;
        if (lod > 0) { y0 = s.y0 - 0.02 * h; y1 = y0 + h; for (const q of hinder) if (q.y0 > s.y1 - 0.25 * t && sidled(s.x0, s.x1, q.x0, q.x1) && q.y0 < y1) y1 = q.y0; y1 = Math.max(y1, s.y1 + 0.5 * t); }
        else { y1 = s.y1 + 0.02 * h; y0 = y1 - h; for (const q of hinder) if (q.y1 < s.y0 + 0.25 * t && sidled(s.x0, s.x1, q.x0, q.x1) && q.y1 > y0) y0 = q.y1; y0 = Math.min(y0, s.y0 - 0.5 * t); }
        b = { x0: c.x - w / 2, x1: c.x + w / 2, y0, y1 };
      } else {
        const h = m ? m.kort : (s.y1 - s.y0) / 0.92, w = m ? m.lang : h / KVOT;
        let x0, x1;
        if (vag > 0) { x0 = s.x0 - 0.02 * w; x1 = x0 + w; for (const q of hinder) if (q.x0 > s.x1 - 0.25 * t && sidled(s.y0, s.y1, q.y0, q.y1) && q.x0 < x1) x1 = q.x0; x1 = Math.max(x1, s.x1 + 0.5 * t); }
        else { x1 = s.x1 + 0.02 * w; x0 = x1 - w; for (const q of hinder) if (q.x1 < s.x0 + 0.25 * t && sidled(s.y0, s.y1, q.y0, q.y1) && q.x1 > x0) x0 = q.x1; x0 = Math.min(x0, s.x0 - 0.5 * t); }
        b = { x0, x1, y0: c.y - h / 2, y1: c.y + h / 2 };
      }
      return b;
    };
    if (o.hog && m) {
      const kortYta = m.lang * m.kort, behall = [], nya = [];
      for (const k of ut.slice()) {
        const yta = (k.x1 - k.x0) * (k.y1 - k.y0);
        if (!(yta > HOG_YTA * kortYta)) { behall.push(k); continue; }
        const kc = { x: (k.x0 + k.x1) / 2, y: (k.y0 + k.y1) / 2 }, inneI = [];
        remsor.forEach((s, si) => { if ((k.remsa === s || !tagna.has(si)) && inne(mitt(s), k) && !inneI.some(j => ihop(remsor[j], s))) inneI.push(si); });
        if (!inneI.length) { behall.push(k); continue; }
        hogar++;
        /* Alla kort i en hög vänder titeln åt samma håll: kroppen ligger från remsornas GEMENSAMMA läge mot lådans mitt
           (remsa för remsa hade det nedersta kortets remsa i en nedåt förskjuten hög fått kroppen uppåt). */
        const mc = inneI.reduce((a, si) => { const c = mitt(remsor[si]); a.x += c.x / inneI.length; a.y += c.y / inneI.length; return a; }, { x: 0, y: 0 });
        const lod = kc.y >= mc.y ? 1 : -1, vag = kc.x >= mc.x ? 1 : -1;
        for (const si of inneI) {
          const s = remsor[si];
          const b = skapaUr(s, si, lod, vag);
          nya.push({ x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, poang: s.poang, klass: 'kort', remsa: s, ur: 'hog' });
          tagna.add(si); skapade++;
        }
      }
      ut = behall.concat(nya);
    }
    remsor.forEach((s, si) => {
      if (tagna.has(si) || SKAPA === 'inga') return;
      const vg = vagrat(s), c = mitt(s);
      if (SKAPA === 'fria' && ut.some(k => inne(c, k))) return;
      /* Vakt (a), MES-340 steg 2.1: samma titel som en redan parad remsa — inget kort till (parprov: 'alla' rakt av
         gav 76 dubbletter i MES-246 mot 37; en andra remsa på samma kant var den vanligaste). Samma titel = ligger
         ihop med den parade remsan (ISAR) OCH ligger till minst INNE_ANDEL inne i den parade remsans låda. Golden 17
         hög A: Island (tappat, överst) har en lös remsa som täcker högens titlar, och Forests remsa under den ligger
         0,56 tjocklekar bort — men till hälften UTANFÖR Islands låda: det är en annan titel som sticker fram, och den
         ska bli ett kort. MES-246:s dubblettremsor ligger helt inne i sin låda. */
      const andelInne = (a, k) => { const ix = Math.max(0, Math.min(a.x1, k.x1) - Math.max(a.x0, k.x0)), iy = Math.max(0, Math.min(a.y1, k.y1) - Math.max(a.y0, k.y0)), aa = (a.x1 - a.x0) * (a.y1 - a.y0); return aa > 0 ? ix * iy / aa : 0; };
      const INNE_ANDEL = o.inneAndel != null ? o.inneAndel : 0.7;
      if (o.vakt !== false && ut.some(k => k.remsa && ihop(k.remsa, s) && andelInne(s, k) >= INNE_ANDEL)) return;
      /* Vakt (b): remsan ligger i en låda UTAN remsa, vid dess kant men längre in än TOL2 (parprov: 0,145–0,16 av
         kortsidan — en låda som tar med sig fickan eller kortet under): remsan hör till den lådan, och paras dit.
         Högst TOL3 in; en remsa mitt i en remslös låda är något annat. */
      const TOL3 = o.tol3 != null ? o.tol3 : 0.2;
      if (o.vakt !== false) { const k = ut.find(q => !q.remsa && passning(s, q) <= TOL3); if (k) { k.remsa = s; tagna.add(si); return; } }
      let lod = o.lod || 1, vag = o.vag || -1;
      const granne = ut.find(k => k.remsa && vagrat(k.remsa) === vg && inne(c, k)) || ut.find(k => k.remsa && vagrat(k.remsa) === vg && iou(k, { x0: c.x - 1, y0: c.y - 1, x1: c.x + 1, y1: c.y + 1 }) > 0);
      if (granne) {
        const g = granne.remsa, gc = mitt(g), kc = { x: (granne.x0 + granne.x1) / 2, y: (granne.y0 + granne.y1) / 2 };
        if (vg) lod = kc.y >= gc.y ? 1 : -1; else vag = kc.x >= gc.x ? 1 : -1;
      }
      /* Lådan: från remsan och kortets höjd åt kroppens håll (form 'hel' —
         facits och modellens lådor runt det synliga är i en snett förskjuten
         hög nästan hela kortet; mätt i parprov.py gav 'hel' +2 kort, 'synlig'
         0). Med form 'synlig' bara fram till nästa kort i högen — den
         närmaste lådan eller remsan vars kant ligger bortom remsan och som
         överlappar den i sidled till minst hälften. Minst 1,5 remstjocklekar. */
      const b = skapaUr(s, si, lod, vag);
      ut.push({ x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, poang: s.poang, klass: 'kort', remsa: s, ur: 'remsa' });
      skapade++;
    });
    ut.dubbletter = dubbletter; ut.skapade = skapade; ut.hogar = hogar; ut.matt = m;
    return ut;
  }

  /* ── webbläsaren: laddning och körning ── */
  const harDOM = typeof document !== 'undefined';
  /* Riktig tid också i golden, där performance.now är videons klocka (performance.riktigNu, som Kameras nuRiktig). */
  const nu = () => { const pf = global.performance; return (pf.riktigNu || pf.now).call(pf); };
  let session = null, backend = null, inNamn = null, utNamn = null, laddar = null, laddatVariant = null, cv = null, ctx = null;

  const skript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('kunde inte ladda ' + src)); document.head.appendChild(s); });

  /* Modellfilen hämtas en gång och läggs i Cache Storage, som bildmodellen:
     ett spel ska gå att starta utan nät. */
  async function hamtaModell(url) {
    let c = null; try { c = await caches.open('mesa-detektor-modell-v' + V); } catch (e) {}
    let svar = c ? await c.match(url) : null;
    if (!svar) { svar = await fetch(url); if (!svar.ok) throw new Error('modellen svarade ' + svar.status); if (c) { try { await c.put(url, svar.clone()); } catch (e) {} } }
    return new Uint8Array(await svar.arrayBuffer());
  }
  async function webGPU() {
    try { const a = global.navigator.gpu && await global.navigator.gpu.requestAdapter(); return a ? { f16: a.features.has('shader-f16') } : null; } catch (e) { return null; }
  }

  /* Ladda modellen. o som FORVAL (ort, wasmPaths, modell.{fp32,fp16},
     backend, variant). Svar: { backend, modell, variant, tradar, ms }. En
     laddning i taget; samma variant igen ger samma löfte. En annan variant
     byter session (fp16 provas på telefonen). */
  function ladda(o) {
    o = Object.assign({}, FORVAL, o || {}); o.modell = Object.assign({}, FORVAL.modell, (o && o.modell) || {});
    const variant = o.variant === 'fp16' ? 'fp16' : 'fp32';
    if (laddar && laddatVariant === variant) return laddar;
    laddatVariant = variant;
    laddar = (async () => {
      const t0 = nu();
      /* onnxruntime hämtas en gång för båda modulerna (bildmodellen laddar
         samtidigt på telefonen): ett delat löfte, annars två <script> och
         två initieringar. */
      if (!global.ort) { try { await (global.__mesaOrtLaddar || (global.__mesaOrtLaddar = skript(o.ort))); } catch (e) { global.__mesaOrtLaddar = null; throw e; } }
      const ort = global.ort;
      if (o.wasmPaths) ort.env.wasm.wasmPaths = new URL(o.wasmPaths, global.location.href).href;
      const tradar = global.crossOriginIsolated ? Math.min(4, global.navigator.hardwareConcurrency || 2) : 1;
      ort.env.wasm.numThreads = tradar;
      const gpu = o.backend === 'wasm' ? null : await webGPU(), forsok = [];
      const url = o.modell[variant] || o.modell.fp32;
      if (gpu) forsok.push(['webgpu', url]);
      if (o.backend !== 'webgpu') forsok.push(['wasm', url]);
      if (forsok.length && forsok[0][0] === 'wasm') ort.env.wasm.proxy = true;
      let fel = null;
      for (const [b, u] of forsok) {
        let s = null;
        try {
          const bytes = await hamtaModell(u);
          s = await ort.InferenceSession.create(bytes, { executionProviders: [b], graphOptimizationLevel: 'all' });
          const inn = s.inputNames[0];
          /* Värm upp innan sessionen tas i bruk: första körningen kompilerar, och faller den ska den gamla sessionen stå kvar. */
          const sFast = s, innFast = inn;
          await korMed(() => ({ s: sFast, inn: innFast }), new Float32Array(3 * BREDD * HOJD), TAK_UPPVARMNING_MS);
          /* Bad någon om en annan variant medan den här laddades installeras den inte: annars kunde session vara fp32 medan variant sa fp16. */
          if (laddatVariant !== variant) { try { await s.release(); } catch (e) {} throw new Error('varianten byttes under laddningen'); }
          const gammal = session;
          session = s; backend = b; inNamn = inn; utNamn = s.outputNames[0];
          if (gammal && gammal !== s) { try { await gammal.release(); } catch (e) {} }
          return { backend, modell: u.split('/').pop(), variant, tradar: b === 'wasm' ? tradar : null, ms: Math.round(nu() - t0) };
        } catch (e) { fel = e; if (s && s !== session) { try { await s.release(); } catch (e2) {} } if (laddatVariant !== variant) break; }
      }
      if (laddatVariant === variant) { laddar = null; laddatVariant = null; }
      throw fel || new Error('ingen backend');
    })();
    return laddar;
  }

  /* En körning i taget mot grafikkortet — i en kö som delas med bildmodellen
     (dev/embed/embed.js): två sessioner som kör samtidigt på WebGPU gjorde
     att bildmodellens svar aldrig kom (golden 01: 0 av 3 namn). */
  const koDelad = global.__mesaOrtKo || (global.__mesaOrtKo = { p: Promise.resolve() });
  /* Tidstak på varje körning: en körning mot grafikkortet som aldrig svarar
     (golden F, 2026-10-01: från fall 14 stod loopen stilla) får inte hänga
     kön — efter taket går kön vidare och anropet avvisas, så att appen tar
     rutan med dagens detektor (tre i rad stänger modellen, KamDet). */
  const TAK_MS = 3000, TAK_UPPVARMNING_MS = 30000;
  const medTak = (p, ms) => { let t = null; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('detektorn svarade inte på ' + ms + ' ms')), ms); })]).finally(() => clearTimeout(t)); };
  /* valj(): sessionen och indatanamnet läses först när kön når körningen —
     byts varianten medan en körning står i kö ska den gå på den nya
     sessionen, inte på en som släppts. */
  function korMed(valj, data, tak) {
    const p = koDelad.p.then(() => medTak((async () => {
      const { s, inn } = valj();
      if (!s) throw new Error('detektorn är inte laddad');
      const svar = await s.run({ [inn]: new global.ort.Tensor('float32', data, [1, 3, HOJD, BREDD]) });
      const t = svar[s.outputNames[0]];
      return t.getData ? await t.getData() : t.data;
    })(), tak || TAK_MS));
    koDelad.p = p.catch(() => {});
    return p;
  }
  const korTensor = (data, tak) => korMed(() => ({ s: session, inn: inNamn }), data, tak);

  /* Rutan r = { x, y, w, h } i källans bildpunkter (bordets ruta; null =
     hela källan) skalas in i 960 × 544 uppe till vänster, resten 114.
     En STÅENDE ruta (telefonen på högkant, golden 01–08) vrids 90° moturs
     innan modellen ser den, och lådorna vrids tillbaka — som prov246.py
     och parprov.py gör: modellen tar 960 × 544 liggande, och en stående
     bild krymps annars till ~390 px bred, korten 1,4 gånger mindre än det
     mätningen gjordes på. Skalningen är webbläsarens egen bilinjära
     ('low'), som cv2:s INTER_LINEAR vid nedskalning tar ett par
     källpunkter per bildpunkt — det är så modellen tränats och mätts.
     Tensorn är ny för varje körning: i onnxruntime-webs proxy-läge (WASM)
     överförs bufferten till workern och är tom efteråt. Svar: { kort,
     remsor, ms (bara modellen), forMs (ritning + tensor), skala, roterad,
     W, H }, lådorna i rutans bildpunkter. */
  async function kor(kalla, r, tro) {
    if (!session) throw new Error('detektorn är inte laddad');
    if (!cv) { cv = document.createElement('canvas'); cv.width = BREDD; cv.height = HOJD; ctx = cv.getContext('2d', { willReadFrequently: true }); }
    const sw = kalla.videoWidth || kalla.naturalWidth || kalla.width, sh = kalla.videoHeight || kalla.naturalHeight || kalla.height;
    const rx = r ? r.x : 0, ry = r ? r.y : 0, rw = r ? r.w : sw, rh = r ? r.h : sh;
    const roterad = rh > rw, W = roterad ? rh : rw, H = roterad ? rw : rh;   // bilden modellen ser: liggande
    const s = Math.min(BREDD / W, HOJD / H);
    const t0 = nu();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgb(' + FYLL + ',' + FYLL + ',' + FYLL + ')'; ctx.fillRect(0, 0, BREDD, HOJD);
    /* Moturs: källans (x, y) → (s·y, s·(rw − x)); överkanten hamnar till vänster. */
    if (roterad) ctx.setTransform(0, -s, s, 0, 0, s * rw); else ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.drawImage(kalla, rx, ry, rw, rh, 0, 0, rw, rh);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const d = ctx.getImageData(0, 0, BREDD, HOJD).data, n = BREDD * HOJD, tensor = new Float32Array(3 * n);
    for (let p = 0, i = 0; p < n; p++, i += 4) { tensor[p] = d[i + 2]; tensor[n + p] = d[i + 1]; tensor[2 * n + p] = d[i]; }
    const t1 = nu();
    const ut = await korTensor(tensor, tro && tro.tak);
    const t2 = nu();
    const a = avkoda(ut, s, W, H, tro);
    if (roterad) {
      /* Tillbaka till den stående rutan: (x', y') → (rw − y', x'). */
      const vrid = b => Object.assign(b, { x0: rw - b.y1, y0: b.x0, x1: rw - b.y0, y1: b.x1 });
      for (const b of a.kort) vrid(b);
      for (const b of a.remsor) vrid(b);
    }
    return Object.assign(a, { ms: Math.round(t2 - t1), forMs: Math.round(t1 - t0), skala: s, roterad, W: rw, H: rh });
  }

  /* Släpp sessionen (efter tre fel i rad, KamDet): nästa ladda() hämtar ur cachen och värmer upp på nytt. */
  async function slapp() {
    const s = session; session = null; backend = null; laddar = null; laddatVariant = null;
    if (s) { try { await s.release(); } catch (e) {} }
  }
  const api = {
    V, BREDD, HOJD, KLASSER, T, REMSA, KVOT, FORVAL,
    iou, nms, avkoda, mattUr, para,
    ladda, kor, slapp,
    get redo() { return !!session; },
    get backend() { return backend; },
    get variant() { return session ? laddatVariant : null; }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (harDOM) global.Detektor = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* ══════════════════════════════════════════════════════════════════
   Kortnamn ur en bildmodell, lokalt i webbläsaren (MES-213).

   En färdig bildkodare (MobileCLIP-S0) gör om en bild till 512 tal. Lekens
   referensbilder från Scryfall bäddas in en gång; en beskärning från
   kameran bäddas in och jämförs mot dem. Närmaste referens säger namnet,
   avståndet till nästa NAMN säger hur säkert det är.

   Uppmätt (dev/embed/RAPPORT.md): 55 av 61 riktiga golden-beskärningar
   rätt, 42 av 43 vanliga kort; dagens Matcher + ORB får 40 av 61 på samma
   bilder. Marginal > 0,11 gav 99 % rätt i kalibreringen.

   Receptet är det bänken mätte fram, och varje del är mätt:
     • hela kortet, inte konstrutan (55 mot 39 av 61)
     • beskärningens 8 % marginal skärs bort (Kamera.beskar lägger dit den)
     • varje referens i fyra vridningar — helbildens lådor vet inte hur
       kortet ligger (55 mot 51) — och två varianter: skanningen som den är
       och en suddig lågupplöst. Referensen är en knivskarp skanning, frågan
       ett foto; den suddiga varianten lyfte oskärpa från 61 till 97 %.
     • referensernas medelvektor dras bort före jämförelsen: det alla
       Magic-kort har gemensamt ska inte räknas som likhet (50 → 55)
     • poäng per NAMN = bästa referensen för namnet; alla konstverk och
       lärda referenser (K7/K8) är bara fler bilder av samma namn

   Modellen körs med onnxruntime-web: WebGPU när det finns, annars WASM
   (flera trådar om sidan är cross-origin isolated, annars en). Samma form
   som dev/matcher.js och dev/orb.js: en fristående fil, window.Embed.
   ══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const V = 1;                               // receptets version: ändras den byggs allt om
  const SIDA = 256, DIM = 512;
  const MARGINAL = 0.08;                     // Kamera.beskar()
  const ROTAR = [0, 90, 180, 270];
  const VARIANTER = ['skarp', 'sudd'];
  const TROSKEL = 0.11;                      // marginal till nästa namn för "säker"
  /* marginal → andel rätt, uppmätt på syntetiska + riktiga (recept.cjs). */
  const KALIBRERING = [[0, 0.40], [0.03, 0.54], [0.05, 0.81], [0.07, 0.875], [0.095, 0.92], [0.13, 0.99], [0.2, 1]];
  const ORT_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';
  const MODELL_HF = 'https://huggingface.co/Xenova/mobileclip_s0/resolve/main/onnx/';
  const FORVAL = {
    ort: ORT_CDN + 'ort.webgpu.min.js', wasmPaths: ORT_CDN,
    /* fp16 är hälften så stor och lika träffsäker (55/61 båda), men går bara på
       grafikkort med shader-f16 — på den här bänkens Intel-Mac föll den. int8
       (den färdiga dynamiskt kvantiserade) är oanvändbar: 7/61 rätt. */
    modell: { webgpu16: MODELL_HF + 'vision_model_fp16.onnx', webgpu: MODELL_HF + 'vision_model.onnx', wasm: MODELL_HF + 'vision_model.onnx' },
    backend: 'auto',                         // 'auto' | 'webgpu' | 'wasm'
  };

  let session = null, backend = null, inNamn = null, utNamn = null, laddar = null;

  /* ── arbetsytor ── */
  const qcv = document.createElement('canvas'); qcv.width = SIDA; qcv.height = SIDA;
  const qctx = qcv.getContext('2d', { willReadFrequently: true });
  qctx.imageSmoothingEnabled = true; qctx.imageSmoothingQuality = 'high';

  const skript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('kunde inte ladda ' + src)); document.head.appendChild(s); });
  const bildAv = src => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('bild ' + src)); i.src = src; });

  /* Modellfilen hämtas en gång och läggs i Cache Storage: 23–45 MB ska inte
     hämtas om för varje spel, och ett spel ska gå att starta utan nät. */
  async function hamtaModell(url) {
    let c = null; try { c = await caches.open('mesa-embed-modell-v' + V); } catch (e) {}
    let svar = c ? await c.match(url) : null;
    if (!svar) { svar = await fetch(url); if (!svar.ok) throw new Error('modellen svarade ' + svar.status); if (c) { try { await c.put(url, svar.clone()); } catch (e) {} } }
    return new Uint8Array(await svar.arrayBuffer());
  }

  /* null = ingen WebGPU; annars { f16 } — om grafikkortet räknar med halvprecision. */
  async function webGPU() {
    try { const a = global.navigator.gpu && await global.navigator.gpu.requestAdapter(); return a ? { f16: a.features.has('shader-f16') } : null; } catch (e) { return null; }
  }

  /* Ladda modellen. Svar: { backend, ms, tradar }. Anropas en gång; senare anrop får samma löfte. */
  function ladda(o) {
    if (laddar) return laddar;
    o = Object.assign({}, FORVAL, o || {}); o.modell = Object.assign({}, FORVAL.modell, (o && o.modell) || {});
    laddar = (async () => {
      const t0 = performance.now();
      if (!global.ort) await skript(o.ort);
      const ort = global.ort;
      if (o.wasmPaths) ort.env.wasm.wasmPaths = new URL(o.wasmPaths, global.location.href).href;
      const tradar = global.crossOriginIsolated ? Math.min(4, global.navigator.hardwareConcurrency || 2) : 1;
      ort.env.wasm.numThreads = tradar;
      /* Försöken i tur och ordning: [backend, modellfil]. Faller ett (ingen
         shader-f16, drivrutinen säger nej, filen går inte att hämta) prövas nästa. */
      const gpu = o.backend === 'wasm' ? null : await webGPU(), forsok = [];
      if (gpu && gpu.f16 && o.modell.webgpu16) forsok.push(['webgpu', o.modell.webgpu16]);
      if (gpu) forsok.push(['webgpu', o.modell.webgpu]);
      if (o.backend !== 'webgpu') forsok.push(['wasm', o.modell.wasm]);
      /* Utan WebGPU räknar WASM — i en egen worker, så att sidan inte står still under körningen. */
      if (forsok.length && forsok[0][0] === 'wasm') ort.env.wasm.proxy = true;
      let fel = null;
      for (const [b, url] of forsok) {
        try {
          const bytes = await hamtaModell(url);
          session = await ort.InferenceSession.create(bytes, { executionProviders: [b], graphOptimizationLevel: 'all' });
          backend = b; inNamn = session.inputNames[0]; utNamn = session.outputNames[0];
          await kor(new Float32Array(3 * SIDA * SIDA));          // värm upp: första körningen kompilerar
          return { backend, modell: url.split('/').pop(), tradar: b === 'wasm' ? tradar : null, ms: Math.round(performance.now() - t0) };
        } catch (e) { fel = e; session = null; }
      }
      laddar = null; throw fel || new Error('ingen backend');
    })();
    return laddar;
  }

  /* En körning i taget: WebGPU-sessionen tål inte två samtidiga run(). */
  let ko = Promise.resolve();
  function kor(data) {
    const p = ko.then(async () => {
      const svar = await session.run({ [inNamn]: new global.ort.Tensor('float32', data, [1, 3, SIDA, SIDA]) });
      const t = svar[utNamn], d = t.getData ? await t.getData() : t.data, v = new Float32Array(DIM);
      let n = 0; for (let k = 0; k < DIM; k++) { v[k] = d[k]; n += v[k] * v[k]; }
      n = Math.sqrt(n) || 1; for (let k = 0; k < DIM; k++) v[k] /= n;
      return v;
    });
    ko = p.catch(() => {});
    return p;
  }

  /* Det som ligger i qcv → tal 0–1, kanal för kanal (MobileCLIP normerar inte mer än så). */
  function tensorAvYta() {
    const d = qctx.getImageData(0, 0, SIDA, SIDA).data, n = SIDA * SIDA, t = new Float32Array(3 * n);
    for (let p = 0, i = 0; p < n; p++, i += 4) { t[p] = d[i] / 255; t[n + p] = d[i + 1] / 255; t[2 * n + p] = d[i + 2] / 255; }
    return t;
  }

  /* Frågan: beskärningen utan sin marginal, tryckt till kvadrat. rot (90-steg) används av lärda referenser. */
  function fragaTensor(kalla, o) {
    const w = kalla.naturalWidth || kalla.videoWidth || kalla.width, h = kalla.naturalHeight || kalla.videoHeight || kalla.height;
    const f = (o && o.marginal === false) ? 0 : MARGINAL / (1 + 2 * MARGINAL), rot = (o && o.rot) || 0;
    qctx.setTransform(1, 0, 0, 1, 0, 0); qctx.clearRect(0, 0, SIDA, SIDA);
    qctx.translate(SIDA / 2, SIDA / 2); qctx.rotate(rot * Math.PI / 180);
    qctx.drawImage(kalla, w * f, h * f, w * (1 - 2 * f), h * (1 - 2 * f), -SIDA / 2, -SIDA / 2, SIDA, SIDA);
    qctx.setTransform(1, 0, 0, 1, 0, 0);
    return tensorAvYta();
  }

  /* Referensens suddiga variant: 150 px bred och tre varv lådfilter (≈ gauss 1,4).
     ctx.filter finns inte i Safari, därför för hand. */
  const vcv = document.createElement('canvas'), vctx = vcv.getContext('2d', { willReadFrequently: true });
  function suddig(img) {
    const w = 150, h = Math.round(150 * (img.naturalHeight || img.height) / (img.naturalWidth || img.width));
    vcv.width = w; vcv.height = h; vctx.imageSmoothingQuality = 'high'; vctx.drawImage(img, 0, 0, w, h);
    const id = vctx.getImageData(0, 0, w, h), a = id.data, b = new Uint8ClampedArray(a.length);
    const varv = (fran, till, dx, dy) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) { let s = 0; for (let k = -1; k <= 1; k++) { const xx = Math.min(w - 1, Math.max(0, x + k * dx)), yy = Math.min(h - 1, Math.max(0, y + k * dy)); s += fran[(yy * w + xx) * 4 + c]; } till[(y * w + x) * 4 + c] = s / 3; } for (let p = 3; p < till.length; p += 4) till[p] = 255; };
    for (let i = 0; i < 3; i++) { varv(a, b, 1, 0); varv(b, a, 0, 1); }
    vctx.putImageData(id, 0, 0);
    return vcv;
  }
  function refTensor(kalla, rot) {
    const w = kalla.naturalWidth || kalla.width, h = kalla.naturalHeight || kalla.height;
    qctx.setTransform(1, 0, 0, 1, 0, 0); qctx.clearRect(0, 0, SIDA, SIDA);
    qctx.translate(SIDA / 2, SIDA / 2); qctx.rotate(rot * Math.PI / 180);
    /* Kortet trycks till kvadrat och vrids i 90-steg — på en kvadrat är det samma
       sak som att vrida först och trycka sedan, vilket är vad en vriden fråga går igenom. */
    qctx.drawImage(kalla, 0, 0, w, h, -SIDA / 2, -SIDA / 2, SIDA, SIDA);
    qctx.setTransform(1, 0, 0, 1, 0, 0);
    return tensorAvYta();
  }

  /* ── IndexedDB: en post per lek, och en per kort (så att en ändrad lek bara bäddar in de nya korten) ── */
  const db = () => new Promise((res, rej) => {
    const r = indexedDB.open('mesa-embed', 1);
    r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('lek')) d.createObjectStore('lek', { keyPath: 'kod' }); if (!d.objectStoreNames.contains('kort')) d.createObjectStore('kort', { keyPath: 'nyckel' }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const idb = async (lager, satt, gor) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(lager, satt), q = gor(t.objectStore(lager)); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
  const hamta = (lager, k) => idb(lager, 'readonly', s => s.get(k)).catch(() => null);
  const satt = (lager, v) => idb(lager, 'readwrite', s => s.put(v)).catch(() => null);
  const stryk = (lager, k) => idb(lager, 'readwrite', s => s.delete(k)).catch(() => null);

  /* Posten i minnet: ra = normerade vektorer som modellen gav dem, vek = centrerade. */
  function centrera(idx) {
    const N = idx.names.length, c = new Float32Array(N * DIM);
    for (let i = 0; i < N; i++) { let n = 0; for (let k = 0; k < DIM; k++) { const v = idx.ra[i * DIM + k] - idx.medel[k]; c[i * DIM + k] = v; n += v * v; } n = Math.sqrt(n) || 1; for (let k = 0; k < DIM; k++) c[i * DIM + k] /= n; }
    idx.vek = c; return idx;
  }

  /* Bygg inbäddningarna för en lek. kort: [{id, name, small|normal|bild}] — samma lista som
     byggPoolAv får. Svar: posten (sparad i IndexedDB under kod). onProg({done,total}). */
  async function byggLek(kod, kort, o) {
    o = o || {}; await ladda(o.ladda);
    const per = ROTAR.length * VARIANTER.length, names = [], ids = [], rot = [], delar = [];
    let done = 0, fel = 0, nya = 0;
    for (const c of kort) {
      const nyckel = `v${V}|${c.id}`;
      let post = await hamta('kort', nyckel);
      if (!post || !post.vek || post.vek.length !== per * DIM) {
        try {
          const img = await bildAv(c.normal || c.small || c.bild), vek = new Float32Array(per * DIM);
          let j = 0;
          for (const v of VARIANTER) { const kalla = v === 'sudd' ? suddig(img) : img; for (const r of ROTAR) vek.set(await kor(refTensor(kalla, r)), (j++) * DIM); }
          post = { nyckel, vek }; await satt('kort', post); nya++;
        } catch (e) { fel++; post = null; }
      }
      if (post) { for (const v of VARIANTER) for (const r of ROTAR) { names.push(c.name); ids.push(c.id); rot.push(r); } delar.push(post.vek); }
      if (o.onProg) o.onProg({ done: ++done, total: kort.length, fel, nya });
    }
    const N = names.length, ra = new Float32Array(N * DIM); let at = 0; for (const d of delar) { ra.set(d, at); at += d.length; }
    const medel = new Float32Array(DIM); for (let i = 0; i < N; i++) for (let k = 0; k < DIM; k++) medel[k] += ra[i * DIM + k] / N;
    const idx = { kod, v: V, ts: Date.now(), names, ids, rot, ra, medel, fel, larda: 0 };
    await satt('lek', idx);
    return centrera(idx);
  }
  async function laddaLek(kod) { const idx = await hamta('lek', kod); return idx && idx.v === V && idx.ra ? centrera(idx) : null; }
  async function glom(kod) { await stryk('lek', kod); }

  /* En lärd referens (K7/K8): kamerans egen beskärning av ett kort med känt namn,
     rak och vänd. Medelvektorn rörs inte — den hör till Scryfall-bilderna. */
  async function laggTill(idx, ref) {
    await ladda();
    const nya = [await kor(fragaTensor(ref.bild, { rot: 0 })), await kor(fragaTensor(ref.bild, { rot: 180 }))];
    const N = idx.names.length, ra = new Float32Array((N + 2) * DIM); ra.set(idx.ra); ra.set(nya[0], N * DIM); ra.set(nya[1], (N + 1) * DIM);
    idx.ra = ra; idx.names = idx.names.concat([ref.name, ref.name]); idx.ids = idx.ids.concat([ref.id, ref.id]); idx.rot = idx.rot.concat([0, 180]); idx.larda = (idx.larda || 0) + 1;
    centrera(idx); await satt('lek', Object.assign({}, idx, { vek: undefined }));
    return idx;
  }
  async function taBort(idx, id) {
    const behall = idx.ids.map((x, i) => x === id ? -1 : i).filter(i => i >= 0), ra = new Float32Array(behall.length * DIM);
    behall.forEach((i, j) => ra.set(idx.ra.subarray(i * DIM, (i + 1) * DIM), j * DIM));
    idx.ra = ra; idx.names = behall.map(i => idx.names[i]); idx.ids = behall.map(i => idx.ids[i]); idx.rot = behall.map(i => idx.rot[i]);
    centrera(idx); await satt('lek', Object.assign({}, idx, { vek: undefined }));
    return idx;
  }

  function sakerhetAv(m) {
    const K = KALIBRERING; if (m <= K[0][0]) return K[0][1];
    for (let i = 1; i < K.length; i++) if (m < K[i][0]) return K[i - 1][1] + (K[i][1] - K[i - 1][1]) * (m - K[i - 1][0]) / (K[i][0] - K[i - 1][0]);
    return 1;
  }

  /* Rangordna en färdig vektor mot leken. o.utan: Set med namn som räknas bort (deck-prior). */
  function rangordna(q, idx, o) {
    const c = new Float32Array(DIM); let n = 0; for (let k = 0; k < DIM; k++) { c[k] = q[k] - idx.medel[k]; n += c[k] * c[k]; } n = Math.sqrt(n) || 1; for (let k = 0; k < DIM; k++) c[k] /= n;
    const per = new Map(), N = idx.names.length, utan = o && o.utan;
    for (let i = 0; i < N; i++) {
      const namn = idx.names[i]; if (utan && utan.has(namn)) continue;
      let s = 0; const b = i * DIM; for (let k = 0; k < DIM; k++) s += c[k] * idx.vek[b + k];
      const f = per.get(namn); if (!f || s > f.poang) per.set(namn, { namn, poang: s, id: idx.ids[i], rot: idx.rot[i] });
    }
    return [...per.values()].sort((a, b) => b.poang - a.poang);
  }

  /* Svaret för en beskärning (canvas, bild eller video):
       { namn, id, saker, sakerhet, marginal, poang, rot, cands, ms, backend }
     marginal = bästa namnets poäng minus nästa NAMNS. saker = marginal > TROSKEL.
     sakerhet = uppmätt andel rätt vid den marginalen (0–1). */
  async function identifiera(kalla, idx, o) {
    if (!idx || !idx.vek || !idx.names.length) return null;
    await ladda();
    const t0 = performance.now();
    const q = await kor(fragaTensor(kalla, o));
    const lista = rangordna(q, idx, o), a = lista[0], b = lista[1];
    if (!a) return null;
    const marginal = a.poang - (b ? b.poang : 0);
    return { namn: a.namn, id: a.id, rot: a.rot, poang: a.poang, marginal, saker: marginal > ((o && o.troskel) || TROSKEL), sakerhet: sakerhetAv(marginal),
             cands: lista.slice(0, 5).map(x => ({ name: x.namn, sid: x.id, score: x.poang })), ms: performance.now() - t0, backend, vektor: o && o.vektor ? q : undefined };
  }

  global.Embed = { V, SIDA, DIM, TROSKEL, ROTAR, VARIANTER, ladda, byggLek, laddaLek, glom, laggTill, taBort, identifiera, rangordna, sakerhetAv,
                   get backend() { return backend; }, get redo() { return !!session; } };
})(window);

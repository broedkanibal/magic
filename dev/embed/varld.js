/* ══════════════════════════════════════════════════════════════════
   Världens fingeravtryck i telefonen (MES-375, etapp 2a): läsaren.

   En världsfil (dev/remsa/varldsfil.py bygg) är alla Magic-kort — Scryfalls
   unique_artwork, ~49 500 konstverk och ~33 200 namn — som bildmodellens
   vektorer, redan centrerade och normerade. Den här modulen laddar filen och
   söker: samma regel som bänken (dev/remsa/varlden.py, Lista.rangordna):

     • frågan = bildmodellens normerade vektor (embed.js), en per vridning
       0, 90, 180, 270 — referenserna är bara upprätta
     • frågan centreras mot världens medel och normeras (och projiceras med
       filens PCA och normeras igen, om filen har en)
     • poäng per namn = bästa referensen för namnet; basland är typer
       (Plains … Wastes), som appens landTyp
     • vridningen vars etta har högst poäng gäller; marginal = ettan minus
       tvåan (nästa NAMN)

   Domen (säker eller inte) gör inte modulen: utanför leken får bildmodellen
   aldrig vara ensam vittne (G1, MES-361) — ORB mot bästa konstverkets bild
   (id + sida i svaret) ska bära ettan. Kopplas in i kedjan i MES-376/377.

   Filen: "MESV", uint32 huvudlängd, JSON-huvud, och delar på 8-bytegränser
   (little-endian; positionerna står i huvudet.delar). Börjar filen med gzip
   (1f 8b) packas den upp med DecompressionStream direkt ur strömmen — så kan
   den läggas upp gzippad, det som går över nätet är gzip-storleken, och det
   packade ligger aldrig helt i minnet.

     const v = await Varld.ladda(url);                 // eller ett Response, en ReadableStream, en ArrayBuffer
     const s = Varld.sok(v, [q0, q90, q180, q270], 5); // Float32Array(512) var
     // s = { rot, namn, poang, marginal, topp: [{ namn, poang, ref, id, sida }] }

   En fristående fil, Varld på window (eller self i en worker), inga paket.
   ══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const VRIDNINGAR = [0, 90, 180, 270];
  const TYPER = { f32: Float32Array, f16: Uint16Array, int8: Int8Array, u16: Uint16Array, u32: Uint32Array, u8: Uint8Array, utf8: Uint8Array };

  /* Filens bytes som en ström, uppackad om den börjar med gzip (1f 8b). Ingenting hålls i minnet utöver biten
     som läses just nu och det uppackade som växer (rättelsen 2026-10-17 fynd 3: förut låg svaret, 31 MB packat
     som ArrayBuffer, en Blob-kopia av den och de 41 MB uppackade i minnet samtidigt — 130–170 MB på en telefon).
     rakna.bytes räknar bytena in (det som gick över nätet). */
  async function strom(body, rakna) {
    const r = body.getReader();
    let forsta = new Uint8Array(0), slut = false;
    while (forsta.length < 2 && !slut) {   // de två första bytena avgör gzip eller inte; en bit kan vara kortare än så
      const x = await r.read();
      if (x.done) slut = true;
      else if (x.value && x.value.length) { const n = new Uint8Array(forsta.length + x.value.length); n.set(forsta); n.set(x.value, forsta.length); forsta = n; }
    }
    const gz = forsta.length >= 2 && forsta[0] === 0x1f && forsta[1] === 0x8b;
    if (gz && typeof DecompressionStream === 'undefined') throw new Error('världsfilen är gzippad men webbläsaren saknar DecompressionStream');
    rakna.bytes = forsta.length;
    const s = new ReadableStream({
      start(c) { if (forsta.length) c.enqueue(forsta); if (slut) c.close(); },
      async pull(c) { const x = await r.read(); if (x.done) c.close(); else { rakna.bytes += x.value.length; c.enqueue(x.value); } },
      cancel(skal) { return r.cancel(skal); }
    });
    return gz ? s.pipeThrough(new DecompressionStream('gzip')) : s;
  }

  function franF16(u16) {
    const ut = new Float32Array(u16.length);
    for (let i = 0; i < u16.length; i++) {
      const h = u16[i], s = h & 0x8000 ? -1 : 1, e = (h >>> 10) & 0x1f, m = h & 0x3ff;
      ut[i] = e === 0 ? s * m * 2 ** -24 : e === 31 ? 0 : s * (1 + m / 1024) * 2 ** (e - 15);
    }
    return ut;
  }

  /* url (sträng), ett Response (fetch eller Cache Storage — kroppen läses som ström), en ReadableStream eller en
     ArrayBuffer → världen. Svaret packas upp direkt ur strömmen; v.bytes är bytena in, v.bytesUppackad filen i
     minnet. o.modell: bildmodellens version att kontrollera huvudet mot. */
  async function ladda(kalla, o) {
    o = o || {};
    const t0 = performance.now();
    const rakna = { bytes: 0 };
    if (typeof kalla === 'string') { const r = await fetch(kalla); if (!r.ok) throw new Error('världsfilen svarade ' + r.status); kalla = r; }
    let kropp;
    if (kalla && typeof kalla === 'object' && kalla.body && typeof kalla.body.getReader === 'function') kropp = kalla.body;   // Response
    else if (kalla && typeof kalla.getReader === 'function') kropp = kalla;                                                  // ReadableStream
    else if (kalla && (kalla instanceof ArrayBuffer || ArrayBuffer.isView(kalla))) kropp = new ReadableStream({ start(c) { c.enqueue(kalla instanceof ArrayBuffer ? new Uint8Array(kalla) : new Uint8Array(kalla.buffer, kalla.byteOffset, kalla.byteLength)); c.close(); } });
    else throw new Error('Varld.ladda: ingen url, Response, ström eller ArrayBuffer');
    const buf = await new Response(await strom(kropp, rakna)).arrayBuffer();
    if (new Uint8Array(new Uint16Array([1]).buffer)[0] !== 1) throw new Error('världsfilen kräver little-endian');
    const dv = new DataView(buf);
    if (String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== 'MESV') throw new Error('inte en världsfil');
    const hlen = dv.getUint32(4, true);
    const huvud = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hlen)));
    if (huvud.format !== 'mesa-varld' || huvud.formatV !== 1) throw new Error('okänt världsformat ' + huvud.format + ' v' + huvud.formatV);
    // Världens vektorer är bara jämförbara med frågor från samma modell och recept. Embed.MODELL säger
    // receptets version men inte modellfilen (helTagg i embed.js): kör Embed en annan .onnx ska den som
    // anropar skicka o.modell. I en worker utan Embed och utan o.modell hoppas kontrollen över (MES-377).
    const modell = o.modell || (global.Embed && global.Embed.MODELL);
    if (modell && huvud.modell !== modell) throw new Error('världsfilen är byggd för ' + huvud.modell + ', inte ' + modell);
    const del = namn => { const x = huvud.delar[namn]; if (!x) return null; const T = TYPER[x.typ]; return new T(buf, x.start, x.bytes / T.BYTES_PER_ELEMENT); };
    const N = huvud.antal, D = huvud.dim;
    let vek = del('vek');
    if (huvud.delar.vek.typ === 'f16') vek = franF16(vek);         // fp16 → Float32 en gång (variant A, referenspunkten)
    const v = {
      huvud, N, D, dimIn: huvud.dimIn, vek, int8: huvud.delar.vek.typ === 'int8',
      skala: del('skala'), medel: del('medel'), pca: del('pca'), namnidx: del('namnidx'), bild: del('bild'),
      bildId: del('bild_id'), bildSida: del('bild_sida'),
      namn: new TextDecoder().decode(del('namn')).split('\n'),
      buf, bytes: rakna.bytes, bytesUppackad: buf.byteLength,
    };
    v.laddMs = performance.now() - t0;
    return v;
  }

  function idAv(v, b) {
    let h = ''; for (let k = 0; k < 16; k++) h += v.bildId[b * 16 + k].toString(16).padStart(2, '0');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  /* Frågan som filens rum: minus medel, normerad, (PCA, normerad). */
  function iRummet(v, q) {
    const Din = v.dimIn, c = new Float32Array(Din); let n = 0;
    for (let k = 0; k < Din; k++) { c[k] = q[k] - v.medel[k]; n += c[k] * c[k]; }
    n = Math.sqrt(n) || 1; for (let k = 0; k < Din; k++) c[k] /= n;
    if (!v.pca) return c;
    const z = new Float32Array(v.D); let m = 0;
    for (let j = 0; j < v.D; j++) { let s = 0; const b = j * Din; for (let k = 0; k < Din; k++) s += v.pca[b + k] * c[k]; z[j] = s; m += s * s; }
    m = Math.sqrt(m) || 1; for (let j = 0; j < v.D; j++) z[j] /= m;
    return z;
  }

  /* fragor: vektorer per vridning i VRIDNINGAR-ordning (1–4 st; färre = bara de första vridningarna).
     En passage över minnet räknar alla vridningar på en gång. Svar som ovan. */
  function sok(v, fragor, n) {
    n = n || 5;
    const R = fragor.length, D = v.D, N = v.N, A = v.namn.length;
    const cs = fragor.map(q => iRummet(v, q));
    const per = [], bast = [];
    for (let r = 0; r < R; r++) { per.push(new Float32Array(A).fill(-2)); bast.push(new Int32Array(A).fill(-1)); }
    const vek = v.vek, skala = v.skala, ni = v.namnidx;
    const c0 = cs[0], c1 = cs[1] || c0, c2 = cs[2] || c0, c3 = cs[3] || c0;
    for (let i = 0; i < N; i++) {
      let s0 = 0, s1 = 0, s2 = 0, s3 = 0; const b = i * D;
      for (let k = 0; k < D; k++) { const x = vek[b + k]; s0 += x * c0[k]; s1 += x * c1[k]; s2 += x * c2[k]; s3 += x * c3[k]; }
      if (skala) { const f = skala[i]; s0 *= f; s1 *= f; s2 *= f; s3 *= f; }
      const a = ni[i];
      if (s0 > per[0][a]) { per[0][a] = s0; bast[0][a] = i; }
      if (R > 1 && s1 > per[1][a]) { per[1][a] = s1; bast[1][a] = i; }
      if (R > 2 && s2 > per[2][a]) { per[2][a] = s2; bast[2][a] = i; }
      if (R > 3 && s3 > per[3][a]) { per[3][a] = s3; bast[3][a] = i; }
    }
    let svar = null;
    for (let r = 0; r < R; r++) {
      /* topp-n (n+1 för marginalen) utan att sortera alla namn */
      const k = Math.min(Math.max(n, 2), A), topp = [];
      for (let a = 0; a < A; a++) {
        const s = per[r][a];
        if (topp.length < k) { topp.push(a); if (topp.length === k) topp.sort((x, y) => per[r][y] - per[r][x]); continue; }
        if (s > per[r][topp[k - 1]]) { let j = k - 1; while (j > 0 && per[r][topp[j - 1]] < s) { topp[j] = topp[j - 1]; j--; } topp[j] = a; }
      }
      if (topp.length < k) topp.sort((x, y) => per[r][y] - per[r][x]);
      if (!svar || per[r][topp[0]] > svar.poang) {
        svar = {
          rot: VRIDNINGAR[r], namn: v.namn[topp[0]], poang: per[r][topp[0]], marginal: per[r][topp[0]] - (topp[1] != null ? per[r][topp[1]] : 0),
          topp: topp.slice(0, n).map(a => { const i = bast[r][a], bi = v.bild[i]; return { namn: v.namn[a], poang: per[r][a], ref: i, id: idAv(v, bi), sida: v.bildSida[bi] }; }),
        };
      }
    }
    return svar;
  }

  global.Varld = { ladda, sok, VRIDNINGAR, idAv };
})(typeof self !== 'undefined' ? self : window);

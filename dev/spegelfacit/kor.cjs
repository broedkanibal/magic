#!/usr/bin/env node
/* Spegelläget mot händelsefacit, steg 1: videon genom kamerakedjan.

   Kör:  node dev/spegelfacit/kor.cjs [--pass 2026-09-22-1x-34cm-normaltempo] [--ai] [--port 8263] [--ut fil.json] [--konsol] [--tro "tapTapp:60"]
   Sedan: node dev/spegelfacit/jamfor.cjs (läser filen och jämför med facit)

   Kör passets kamera.mp4 (dev/material/inspelningar/<pass>/, utanför git)
   genom appens kamerakedja PRECIS som golden kör sina videofall: attrappen
   (dev/stub-server.cjs), dev/golden/kor.html i en huvudlös Chrome, en ruta i
   taget med videons klocka. Skillnaden är bara att fallet inte ligger i
   dev/golden/fall/ — ett händelsefacit är inget golden-fall än (LÄS-MIG.md
   i facitmappen) — utan läggs till i sidans lista härifrån, med ett facit
   byggt ur handelser.tsv. Inget i appen, i kor.html eller i baslinjerna
   ändras, och inget sparas som baslinje.

   Det som sparas är telefonens bordslogg (varje bord datorn hade fått, med
   videons tid) plus golden-sidans eget resultat för fallet. Loggen bär också
   library-rutans läge per bord (bib: { ligger, tackt, lek }) — kor.html
   loggar bara högvakten, så återkopplingen lindas in här.

   Rutorna för graveyard och library är avlästa ur videon (samma platser
   hela passet), och grundläget sätts till 90° (ett otappat kort står
   lodrätt i bilden): i appen sparades båda i uppstartens steg 4, och utan
   grundläge rör datorns avstämning aldrig tap-läget.

   Egen Chrome-profil (os.tmpdir()/mesa-spegel-profil) så att en golden-
   körning i en annan session inte krockar med den här; första gången
   kopieras golden-profilen, så att poolen och lekens inbäddning inte
   hämtas om (en tunn pool efter Scryfalls 429 gör siffrorna till skräp —
   läs raden Poolen:, den ska säga 114). */
'use strict';
const { spawn, execFileSync } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const { ROT, PASS_FORVAL, materialMapp, lasFacit } = require('./facit.cjs');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PASS = arg('--pass', PASS_FORVAL);
const AIFLAG = process.argv.includes('--ai');
const TRO = arg('--tro', '');   // "tapTapp:60,tapOtapp:25" — valfria trösklar till Kamera.satTrosklar, som golden-kor.cjs --tro (MES-298)
const PORT = +arg('--port', 8263);
const UT = path.resolve(arg('--ut', path.join(materialMapp(PASS), `spegel-${AIFLAG ? 'ai' : 'lokal'}.json`)));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TAK_MS = +arg('--tak', 120 * 60 * 1000);
const CDP_TAK_MS = +arg('--cdp-tak', 120000);
const EMBED_LOKALT = fs.existsSync(path.join(ROT, 'dev', 'embed', 'modeller', 'mobileclip-s0-vision.onnx')) && fs.existsSync(path.join(ROT, 'dev', 'embed', 'node_modules', 'onnxruntime-web', 'dist', 'ort.webgpu.min.js'));
const ID = 'spegel-' + PASS;

/* Rutorna i bildandelar, avlästa ur kamera.mp4 (1080×610) i rutorna 25,
   45, 150 och 284 s: graveyard-högen x 80–243, leken x 243–427, båda från
   y ≈ 338 till kanten. Telefonens egen zonram i skärminspelningen (röd/gul
   streckad) går 82–405 × 342–605. */
const ZONER = {
  '2026-09-22-1x-34cm-normaltempo': { grav: { x: 0.074, y: 0.55, w: 0.151, h: 0.45 }, bib: { x: 0.225, y: 0.55, w: 0.17, h: 0.45 } }
};

/* Facit för kor.html: slutläget (kort) och förloppet (video.handelser) i
   golden-formatet, så att sidans eget förloppsbetyg också räknas. Videons
   sökväg är relativ till fall/<id>/ och landar i dev/material/…. */
function byggFacit(rader) {
  const handelser = [], bord = new Map();
  for (const r of rader) {
    if (r.handelse === 'spelar' || r.handelse === 'grav_till_bord') { handelser.push({ t: r.t, spelar: r.kort }); bord.set(r.kort, (bord.get(r.kort) || 0) + 1); }
    else if (r.handelse === 'tar_bort') { handelser.push(Object.assign({ t: r.t, tar_bort: r.kort }, r.till === 'grav' ? { till: 'grav' } : {})); bord.set(r.kort, (bord.get(r.kort) || 0) - 1); }
    else if (r.handelse === 'tappar' || r.handelse === 'otappar' || r.handelse === 'flyttar') handelser.push({ t: r.t, [r.handelse]: r.kort });
  }
  const kort = [];
  for (const [namn, n] of bord) for (let i = 0; i < n; i++) kort.push({ namn });
  const z = ZONER[PASS];
  if (!z) throw new Error(`inga graveyard- och library-rutor för passet ${PASS} — lägg dem i ZONER i ${__filename}`);
  return {
    yta: 'svart matta', ljus: 'dagsljus', hojd_cm: 34,
    ruta: { upp: 'v', grund: 90 },
    grav: z.grav, bib: z.bib, kort,
    video: { fil: `../../../material/inspelningar/${PASS}/kamera.mp4`, takt_ms: 150, svans_s: 8, handelser }
  };
}

const vanta = ms => new Promise(r => setTimeout(r, ms));
async function tills(f, ms, vad) { const t0 = Date.now(); for (;;) { const v = await f().catch(e => { if (e && e.hart) throw e; return null; }); if (v) return v; if (Date.now() - t0 > ms) throw new Error('väntade förgäves på ' + vad); await vanta(500); } }

const barn = [];
process.on('exit', () => { for (const c of barn) { try { c.kill('SIGKILL'); } catch (e) {} } });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(130));

(async () => {
  if (!fs.existsSync(CHROME)) { console.error('Hittar inte Chrome på ' + CHROME); process.exit(2); }
  const video = path.join(materialMapp(PASS), 'kamera.mp4');
  if (!fs.existsSync(video)) { console.error(`Videon saknas: ${video} (ligger utanför git)`); process.exit(2); }
  const rader = lasFacit(PASS);
  const facit = byggFacit(rader);
  console.log(`Pass ${PASS}: ${rader.length} rader i facit, ${facit.video.handelser.length} som golden-händelser, ${facit.kort.length} kort i slutläget${AIFLAG ? ' — MED Claude (kostar)' : ' — utan Claude'}`);

  /* 1. attrappen */
  const server = spawn(process.execPath, [path.join(ROT, 'dev', 'stub-server.cjs')], { env: Object.assign({}, process.env, { PORT: String(PORT) }, AIFLAG ? { MESA_AI: '1' } : {}), stdio: ['ignore', 'pipe', 'pipe'] });
  barn.push(server);
  const aiFel = { n: 0, forsta: '' }; let serverRest = '';
  const lasServer = d => {
    serverRest += d; const r = serverRest.split('\n'); serverRest = r.pop();
    for (const x of r) { const m = x.match(/^identify\/\w+: ([45]\d\d)\b(.*)$/); if (m) { aiFel.n++; if (!aiFel.forsta) aiFel.forsta = (m[1] + m[2]).slice(0, 240); } }
  };
  server.stdout.on('data', lasServer); server.stderr.on('data', lasServer);
  await tills(() => fetch(`http://localhost:${PORT}/dev/golden/kor.html`).then(r => r.ok), 10000, `attrappen på port ${PORT} (upptagen? lsof -iTCP:${PORT})`);

  /* 2. Chrome, med egen profil (kopia av golden-profilen första gången) */
  const profil = path.join(os.tmpdir(), 'mesa-spegel-profil'), golden = path.join(os.tmpdir(), 'mesa-golden-profil');
  if (!fs.existsSync(profil) && fs.existsSync(golden)) { console.log('kopierar golden-profilen (poolen och inbäddningen följer med)…'); execFileSync('cp', ['-R', golden, profil]); for (const l of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) { try { fs.unlinkSync(path.join(profil, l)); } catch (e) {} } }
  const gpu = ['--enable-unsafe-webgpu', '--enable-features=WebGPU', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'];
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profil, '--no-first-run', '--no-default-browser-check', '--window-size=1400,1000'].concat(gpu, ['about:blank']), { stdio: ['ignore', 'ignore', 'pipe'] });
  barn.push(chrome);
  let wsUrl = null, stderr = '';
  chrome.stderr.on('data', d => { stderr += d; const m = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) wsUrl = m[1]; });
  await tills(async () => wsUrl, 15000, 'Chrome (DevTools-porten)');
  const port = new URL(wsUrl).port;
  const sida = await tills(async () => { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); return l.find(t => t.type === 'page'); }, 10000, 'en sida i Chrome');
  const ws = new WebSocket(sida.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let nr = 0, dod = null; const svar = new Map();
  const avbryt = orsak => { if (dod) return; dod = orsak; for (const [, f] of svar) f({ dod: orsak }); svar.clear(); };
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Inspector.targetCrashed') { avbryt('fliken i Chrome kraschade'); return; }
    if (m.id && svar.has(m.id)) { svar.get(m.id)(m); svar.delete(m.id); }
    else if (m.method === 'Runtime.consoleAPICalled' && process.argv.includes('--konsol')) console.log('  [konsol] ' + (m.params.args || []).map(a => a.value !== undefined ? a.value : a.description || '').join(' '));
    else if (m.method === 'Runtime.exceptionThrown') console.error('  [sidan] ' + (m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text).split('\n')[0]);
  };
  ws.onclose = () => avbryt('förbindelsen till Chrome stängdes');
  chrome.on('exit', kod => avbryt('Chrome avslutades (kod ' + kod + ')'));
  const cdp = (method, params, ms = CDP_TAK_MS) => new Promise((res, rej) => {
    const hart = t => Object.assign(new Error(t), { hart: true });
    if (dod) return rej(hart(`${method}: ${dod}`));
    const id = ++nr;
    const t = setTimeout(() => { svar.delete(id); rej(hart(`${method} svarade inte på ${Math.round(ms / 1000)} s`)); }, ms);
    svar.set(id, m => { clearTimeout(t); if (m.dod) rej(hart(`${method}: ${m.dod}`)); else res(m); });
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
  const kor = async uttryck => { const r = await cdp('Runtime.evaluate', { expression: uttryck, awaitPromise: true, returnByValue: true }); if (r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.text + ' ' + ((r.result.exceptionDetails.exception || {}).description || '')); return r.result && r.result.result ? r.result.result.value : undefined; };
  await cdp('Runtime.enable'); await cdp('Inspector.enable');

  /* 3. golden-sidan, som kor.cjs öppnar den (bildmodellen lokalt när vikterna finns) */
  /* Poolen sparas i profilens IndexedDB per ursprung — alltså per PORT. På
     en ny port hämtas hela leken från Scryfall, och svarar den 429 blir
     poolen tunn. Då väntas en minut och sidan laddas om, som sidan själv
     säger; en tunn pool mäts aldrig (--tunn-pool kör ändå, för felsökning). */
  const param = [AIFLAG && 'ai=1', EMBED_LOKALT && 'embedlokalt=1', TRO && 'tro=' + encodeURIComponent(TRO)].filter(Boolean).join('&');
  const status = () => kor(`(document.querySelector('#status') || {}).textContent || ''`);
  let poolRad = '', poolN = 0;
  for (let forsok = 1; ; forsok++) {
    await cdp('Page.navigate', { url: `http://localhost:${PORT}/dev/golden/kor.html${param ? '?' + param : ''}` });
    process.stdout.write(`förbereder (poolen, namnläsaren, bildmodellen), försök ${forsok}…`);
    const redo = await tills(async () => { const s = await status(); if (/^Fel/.test(s)) throw new Error(s); return /Redo|Kör ändå|ofullständig/.test(s) ? s : null; }, 20 * 60 * 1000, 'poolen');
    console.log('\r' + redo.slice(0, 200));
    poolRad = await kor(`(document.querySelector('#pool') || {}).textContent || ''`);
    poolN = +((poolRad.match(/Poolen: (\d+) kort/) || [])[1] || 0);
    if (poolN === 114 || process.argv.includes('--tunn-pool')) break;
    if (forsok >= 8) throw new Error(`poolen blev aldrig hel (${poolN} av 114 kort efter ${forsok} försök) — Scryfall svarar 429; vänta några minuter och kör om`);
    console.log(`  poolen har ${poolN} kort, inte 114 — väntar 70 s och laddar om`);
    await vanta(70000);
  }
  console.log(poolRad);
  if (poolN !== 114) console.log(`\n  VARNING: poolen har ${poolN} kort, inte 114 — siffrorna nedan går inte att lita på (SNABBGUIDE: Innan du litar på en körning).\n`);

  /* 4. fallet in i sidans lista, bib in i bordsloggen, och kör */
  await kor(`(() => {
    const f = { id: ${JSON.stringify(ID)}, facit: ${JSON.stringify(facit)}, fel: null };
    f.facit.ruta = Object.assign({ x: 0, y: 0, w: 1, h: 1, upp: 'v' }, f.facit.ruta);
    fall.push(f);
    if (!window.__spegelAter) {
      window.__spegelAter = true;
      const orig = aterkoppling;
      aterkoppling = function (ff, prov) {
        const a = orig(ff, prov), bord = a.bord;
        a.bord = (spar, noll, extra) => {
          const n = prov.bordLogg ? prov.bordLogg.length : 0;
          bord(spar, noll, extra);
          if (prov.bordLogg && prov.bordLogg.length > n && extra && extra.bib !== undefined) prov.bordLogg[prov.bordLogg.length - 1].bib = extra.bib ? Object.assign({}, extra.bib) : null;
        };
        return a;
      };
    }
    korDessa([f]);
    return 'ok';
  })()`);
  const t0 = Date.now(); let sist = '';
  await tills(async () => { const s = await status(); if (s !== sist) { sist = s; process.stdout.write('\r  ' + s.padEnd(76).slice(0, 76)); } return /^(Klar|Stoppad)/.test(s) ? s : null; }, TAK_MS, 'körningen');
  console.log(`\n  klar på ${((Date.now() - t0) / 60000).toFixed(1)} min`);

  /* 5. resultatet, i bitar: bordsloggen är tusentals bord */
  const fel = await kor(`(resultat.get(${JSON.stringify(ID)}) || {}).fel || null`);
  if (fel) throw new Error('fallet gick inte att köra: ' + fel);
  const nycklar = await kor(`Object.keys(resultat.get(${JSON.stringify(ID)}))`);
  const res = {};
  for (const k of nycklar) {
    if (k === 'bordLogg') continue;
    res[k] = JSON.parse(await kor(`JSON.stringify(resultat.get(${JSON.stringify(ID)})[${JSON.stringify(k)}]) || 'null'`));
  }
  const n = await kor(`(resultat.get(${JSON.stringify(ID)}).bordLogg || []).length`);
  res.bordLogg = [];
  for (let i = 0; i < n; i += 250) res.bordLogg.push(...JSON.parse(await kor(`JSON.stringify(resultat.get(${JSON.stringify(ID)}).bordLogg.slice(${i}, ${i + 250}))`)));
  const metod = await kor(`(document.querySelector('#metod') || {}).textContent || ''`);
  const ut = { pass: PASS, skapad: new Date().toISOString(), ai: AIFLAG, pool: poolN, poolRad, metod, aiFel, facit, resultat: res };
  fs.mkdirSync(path.dirname(UT), { recursive: true });
  fs.writeFileSync(UT, JSON.stringify(ut) + '\n');
  console.log(`  ${n} bord i loggen, video ${res.videoSekunder} s av ${res.videoLangd} s${res.tak ? ' — TAKET SLOG TILL' : ''}; golden-förloppet: ${res.videoLagda}/${res.videoLagdaAv} spelade, ${res.videoBorta}/${res.videoBortaAv} borttagna, tap ${res.videoTapp}/${res.videoTappAv}, flytt ${res.videoFlytt}/${res.videoFlyttAv}, hög ${res.videoGrav}/${res.videoGravAv}`);
  if (AIFLAG) console.log(`  Claude: ${res.ai || 'inget svar'}${res.promptv != null ? ', systemprompt v' + res.promptv : ''}, ${res.namnViaAi || 0} namn via Claude${aiFel.n ? ` — VARNING: ${aiFel.n} misslyckades (${aiFel.forsta}); körningen mäter i praktiken den lokala kedjan` : ''}`);
  console.log(`  sparat: ${path.relative(ROT, UT)}\n  jämför: node dev/spegelfacit/jamfor.cjs${arg('--ut') || AIFLAG ? ' --korning ' + path.relative(ROT, UT) : ''}`);
  try { ws.close(); } catch (e) {}
  process.exit(0);
})().catch(e => { console.error('\nspegelfacit/kor.cjs: ' + (e && e.message || e)); process.exit(2); });

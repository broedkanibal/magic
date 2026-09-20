#!/usr/bin/env node
/* Golden setet från terminalen. Kör: node dev/golden/kor.cjs [--spara] [--detalj] [--rutor] [--fall 03] [--beskarningar <mapp>] [--ai] [--port 8239] [--konsol]

   Startar attrappen (dev/stub-server.cjs), öppnar dev/golden/kor.html i en
   huvudlös Chrome, trycker "Kör alla", skriver tabellen, och med --spara
   sparar resultatet som dev/golden/senaste.json (med --fall byts bara de
   fallen ut, resten står kvar). Slutkod 1 om något fall
   blev sämre än senaste.json (rätt namn, falska eller fel namn), så att den
   går att köra före en commit.

   Ett fall är en stillbild eller en VIDEO (facit.video). Ett videofall matas
   ruta för ruta med videons egen klocka och har sitt eget tak i videotid
   (videons längd + svans_s); --tak nedan gäller hela körningen. Kolumnen
   Förlopp i tabellen är videofallens: vad kameran hann se hända.

   Varför huvudlös Chrome och inte bänken: hela kedjan — beskärningen,
   matcharen, ORB och namnläsaren — finns bara i webbläsaren. Och varför
   inte bara fliken: en flik i bakgrunden stryps (rAF pausas, tidtagare en
   gång i sekunden), och namnläsaren tog tio sekunder per kort där. En
   huvudlös Chrome räknas som synlig och stryps inte.

   Profilen ligger kvar mellan körningarna (os.tmpdir()/mesa-golden-profil),
   så poolen och tesseract-datan cachas: första körningen tar en minut
   extra, de följande inte. .cjs eftersom package.json säger "type": "module". */
'use strict';
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const ROT = path.join(__dirname, '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const SPARA = process.argv.includes('--spara');
const PORT = +arg('--port', 8239);
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TAK_MS = +arg('--tak', 20 * 60 * 1000);
const FALL = arg('--fall', '');
/* --ai: attrappen kör riktiga anrop (MESA_AI=1, nyckeln ur .env.local) och sidan
   låter kamerans osäkra spår fråga servern. Kostar pengar; jämförs mot och
   sparas i senaste-ai.json, inte senaste.json. */
const AIFLAG = process.argv.includes('--ai');
/* --ref: lekens lärda referenser (K7) med i poolen; --lar-ref: varje fall lär
   facit in efter domen; --glom-ref: referenserna för golden-poolen tas bort
   först. Baslinjen sparas aldrig med --ref (den mäter kameran utan lärdom). */
const REFFLAG = process.argv.includes('--ref'), LARFLAG = process.argv.includes('--lar-ref'), GLOMFLAG = process.argv.includes('--glom-ref');
const BASFIL = AIFLAG ? 'senaste-ai.json' : 'senaste.json';
const BESKARNINGAR = arg('--beskarningar', '');   // mapp att skriva beskärningarna till: <fall>-spar<nr>.jpg
/* --ljus <variant>: samma fall i ett annat ljus (MES-216): morkare, ljusare,
   varmare, kallare, kontrast, brus, gradient — eller 'alla' för alla sju i
   följd (en tabell per variant och en sammanställning sist). Jämförs mot den
   vanliga baslinjen; sparas aldrig. */
const LJUS = arg('--ljus', '');
/* Bildmodellen (MES-225) körs som i appen. --utan-modell stänger av den
   (reserven Matcher + ORB mäts — kedjan från före modellen); --wasm tvingar
   WASM-vägen; --utan-leken "Namn1,Namn2" tar bort namnen ur leken, så att
   korten på borden är kort utanför leken (varje säkert namn på dem är ett fel).
   Chrome får WebGPU-flaggorna bara när modellen är med, så att --utan-modell
   mäter exakt som förut. Ligger onnxruntime-web och vikterna lokalt
   (dev/embed/node_modules, dev/embed/modeller — se dev/embed/LÄS-MIG.md)
   serveras de av attrappen; annars hämtas de en gång och ligger kvar i
   profilens cache. */
const UTAN_MODELL = process.argv.includes('--utan-modell'), WASM = process.argv.includes('--wasm');
const UTAN_LEKEN = arg('--utan-leken', '');
const LUFT = arg('--luft', '');   // 0 eller 1: läsningen på första hela rutan (MES-227) av eller på, oavsett appens förval
const TRO = arg('--tro', '');   // "snabb:1,stillaMs:600" — valfria trösklar till Kamera.satTrosklar före varje fall (prov, aldrig baslinje)
const RUTLOGG = arg('--rutlogg', '');   // fil att skriva videofallens ruta-för-ruta-logg till (utredningar; sparas aldrig i baslinjen)
const LASWORKER = arg('--lasworker', '');   // 0 | 1 | kontroll: läsningens räknetråd (MES-221) av, på (appens förval) eller i kontroll — tråden och huvudtråden räknar båda, skillnader loggas (--konsol)
const EMBED_LOKALT = fs.existsSync(path.join(ROT, 'dev', 'embed', 'modeller', 'mobileclip-s0-vision.onnx')) && fs.existsSync(path.join(ROT, 'dev', 'embed', 'node_modules', 'onnxruntime-web', 'dist', 'ort.webgpu.min.js'));

const vanta = ms => new Promise(r => setTimeout(r, ms));
async function tills(f, ms, vad) { const t0 = Date.now(); for (;;) { const v = await f().catch(() => null); if (v) return v; if (Date.now() - t0 > ms) throw new Error('väntade förgäves på ' + vad); await vanta(250); } }

/* Terminalens tabell: en rad per fall med rubriker. Antalet kort i facit står
   först, så att en ändring får sin skala (9 av 10 är inte 9 av 40), och
   "(var N)" står där ett tal skiljer sig från baslinjen. Sidans egen rad
   (tider, tröskel, yta) står under --detalj. */
function skrivTabell(rs, gamla) {
  const skiljer = (r, g, k) => g && g[k] != null && g[k] !== r[k] ? ` (var ${g[k]})` : '';
  /* Förloppet finns bara i ett videofall: hur många utspelade kort kameran
     hann namnge säkert, hur många bortplockade som försvann ur bordet, och
     hur många som kom i rätt ordning. En stillbild har inget förlopp. */
  const forlopp = (r, g) => (r.videoLagdaAv == null && r.videoBortaAv == null) ? '–'   // fältet saknas = foto; noll utspel är fortfarande ett videofall
    : `${r.videoLagda}/${r.videoLagdaAv} spelade${skiljer(r, g, 'videoLagda')}`
    + ` · ${r.videoBorta}/${r.videoBortaAv} borttagna${skiljer(r, g, 'videoBorta')}`
    + ` · ordning ${r.videoOrdning}/${r.videoOrdningAv}${skiljer(r, g, 'videoOrdning')}`
    + (r.videoDubbletter != null ? ` · dubbletter ${r.videoDubbletter}${skiljer(r, g, 'videoDubbletter')}` : '')
    + (r.videoTappAv ? ` · tap ${r.videoTapp}/${r.videoTappAv}${skiljer(r, g, 'videoTapp')}` : '')
    + (r.videoTappFalska ? ` · falska tap-flippar ${r.videoTappFalska}${skiljer(r, g, 'videoTappFalska')}` : '')
    + (r.videoFlyttAv ? ` · flytt ${r.videoFlytt}/${r.videoFlyttAv}${skiljer(r, g, 'videoFlytt')}` : '')
    + (r.videoGravAv ? ` · hög ${r.videoGrav}/${r.videoGravAv}${skiljer(r, g, 'videoGrav')}, falska ${r.videoGravFalska}${skiljer(r, g, 'videoGravFalska')}` : '');
  const kolumner = [
    ['Fall', 42, r => r.id],
    ['Kort', 12, r => r.kort + (r.dolda ? ` +${r.dolda} dolt` : '')],
    ['Hittade', 13, (r, g) => r.hittade + skiljer(r, g, 'hittade')],
    ['Rätt namn', 17, (r, g) => `${r.namn}/${r.kort}` + skiljer(r, g, 'namn')],
    ['Fel namn', 13, (r, g) => r.felNamn + skiljer(r, g, 'felNamn')],
    ['Falska', 13, (r, g) => r.falska + skiljer(r, g, 'falska')],
    ['Plats', 12, r => r.platsAv ? `${r.plats}/${r.platsAv}` + (r.lageFel != null ? ` ±${r.lageFel}` : '') : '–'],
    ['Tappad', 8, r => r.tappadAv ? `${r.tappad}/${r.tappadAv}` : '–'],
    /* K5/MODE-5: lägesuppdateringar — rapporter där ett stilla kort flyttat mer än AUTO_FLYTT av sin bredd; per minut av fallets tid. */
    ['Läge', 16, (r, g) => r.lagesUpp == null ? '–' : `${r.lagesUpp}${skiljer(r, g, 'lagesUpp')}${r.lagesPerMin != null ? ` (${r.lagesPerMin}/min)` : ''}`],
    ['Förlopp', 72, forlopp]
  ];
  const rad = celler => '  ' + celler.map((c, i) => String(c).padEnd(kolumner[i][1])).join('').trimEnd();
  /* Summan är null när ingen rad bär fältet — en baslinje från före ett nytt mått ska inte stå som "(var 0)". */
  const summa = (lista, k) => lista.some(r => r[k] != null) ? lista.reduce((a, r) => a + (r[k] || 0), 0) : null;
  const totalt = lista => Object.fromEntries(['kort', 'dolda', 'hittade', 'namn', 'felNamn', 'falska', 'plats', 'platsAv', 'tappad', 'tappadAv',
    'videoLagda', 'videoLagdaAv', 'videoBorta', 'videoBortaAv', 'videoOrdning', 'videoOrdningAv', 'videoFelUnder', 'videoDubbletter', 'videoTapp', 'videoTappAv', 'videoTappFalska', 'videoFlytt', 'videoFlyttAv', 'videoGrav', 'videoGravAv', 'videoGravFalska', 'lagesUpp'].map(k => [k, summa(lista, k)]));
  console.log(rad(kolumner.map(k => k[0])));
  for (const r of rs) console.log(rad(kolumner.map(k => k[2](r, gamla.get(r.id)))));
  const gs = rs.map(r => gamla.get(r.id));
  console.log(rad(kolumner.map(k => k[2](Object.assign({ id: `Totalt, ${rs.length} fall` }, totalt(rs)), gs.every(Boolean) ? totalt(gs) : null))));
  console.log('\n  Kort: synliga kort i facit (ett kort som ligger under ett annat är dolt och räknas inte).');
  console.log('  Hittade: kort kameran lade ut — också dolda kort den ändå såg, och falska spår. Därför kan talet bli större än Kort.');
  console.log('  Rätt namn: synliga kort som fick rätt namn med säkert svar. Fel namn: säkert svar men fel kort (ska vara 0).');
  console.log('  Falska: spår där inget kort ligger. Plats och Tappad provas bara där facit har rutor; ± är medianfelet mellan spårets och rutans mitt i kortbredder. (var N): baslinjens tal.');
  console.log('  Läge: rapporter där ett stilla kort flyttat mer än 15 % av sin bredd sedan förra rapporten (det datorn speglar i Table leads) — ska vara 0 på ett stilla bord; per minut av fallets tid.');
  console.log('  Förlopp: bara videofall — utspelade kort som fick ett säkert rätt namn någon gång, bortplockade kort som');
  console.log('  inte ligger kvar med säkert namn, och hur många av utspelen kameran såg i rätt ordning. Slutläget står i kolumnerna före.');
  console.log('  hög: kort som lades på graveyard-högen i bild och som högvakten såg inom 6 s (MES-85); falska = högändringar utan ett kort dit.');
}

(async () => {
  if (!fs.existsSync(CHROME)) { console.error('Hittar inte Chrome på ' + CHROME + ' — sätt CHROME=/sökväg/till/Chrome'); process.exit(2); }
  /* 1. attrappen, på en egen port så att en flik som redan kör inte störs */
  const server = spawn(process.execPath, [path.join(ROT, 'dev', 'stub-server.cjs')], { env: Object.assign({}, process.env, { PORT: String(PORT) }, AIFLAG ? { MESA_AI: '1' } : {}), stdio: ['ignore', 'pipe', 'pipe'] });
  /* Attrappens utskrift läses (MES-181): ett anrop som Anthropic avvisar —
     slut på krediter, fel nyckel, överbelastning — loggas där som
     "identify/kamera: 400 …", och sidan faller då tyst tillbaka på den lokala
     kedjan. 2026-09-16 sparades så en "AI-baslinje" på 31/57 som var den
     lokala kedjan rakt av. Felen räknas och sägs sist, och --spara vägras. */
  const aiFel = { n: 0, forsta: '' };
  let serverRest = '';
  const lasServer = d => {
    serverRest += d; const rader = serverRest.split('\n'); serverRest = rader.pop();
    for (const r of rader) { const m = r.match(/^identify\/\w+: ([45]\d\d)\b(.*)$/); if (m) { aiFel.n++; if (!aiFel.forsta) aiFel.forsta = (m[1] + m[2]).slice(0, 240); } }
  };
  server.stdout.on('data', lasServer); server.stderr.on('data', lasServer);
  await tills(() => fetch(`http://localhost:${PORT}/dev/golden/kor.html`).then(r => r.ok), 10000, 'attrappen');
  /* 2. Chrome, huvudlös, med egen profil som får ligga kvar */
  const profil = path.join(os.tmpdir(), 'mesa-golden-profil');
  const gpu = UTAN_MODELL || WASM ? [] : ['--enable-unsafe-webgpu', '--enable-features=WebGPU', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'];   // som dev/embed/webb.cjs --gpu
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profil, '--no-first-run', '--no-default-browser-check', '--window-size=1400,1000'].concat(gpu, ['about:blank']), { stdio: ['ignore', 'ignore', 'pipe'] });
  let wsUrl = null, stderr = '';
  chrome.stderr.on('data', d => { stderr += d; const m = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) wsUrl = m[1]; });
  await tills(async () => wsUrl, 15000, 'Chrome (DevTools-porten)');
  const port = new URL(wsUrl).port;
  const sidor = await tills(async () => { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); return l.find(t => t.type === 'page'); }, 10000, 'en sida i Chrome');
  const ws = new WebSocket(sidor.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let nr = 0; const svar = new Map();
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && svar.has(m.id)) { svar.get(m.id)(m); svar.delete(m.id); }
    /* --konsol: sidans och appens console.log (också ur iframen) skrivs ut — för tillfälliga mätrader medan ett fall felsöks. */
    else if (m.method === 'Runtime.consoleAPICalled' && process.argv.includes('--konsol')) console.log('  [konsol] ' + (m.params.args || []).map(a => a.value !== undefined ? a.value : a.description || '').join(' '));
    else if (m.method === 'Runtime.exceptionThrown') console.error('  [sidan] ' + (m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text).split('\n')[0]);
  };
  const cdp = (method, params) => new Promise(res => { const id = ++nr; svar.set(id, res); ws.send(JSON.stringify({ id, method, params: params || {} })); });
  const kor = async uttryck => { const r = await cdp('Runtime.evaluate', { expression: uttryck, awaitPromise: true, returnByValue: true }); if (r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.text); return r.result && r.result.result ? r.result.result.value : undefined; };
  await cdp('Runtime.enable');
  let gamla = new Map();
  try { gamla = new Map(JSON.parse(fs.readFileSync(path.join(__dirname, BASFIL), 'utf8')).map(r => [r.id, r])); } catch (e) { /* ingen baslinje — inget att jämföra med */ }
  let samre = [], battre = [];   // domen för den senaste (enda) körningen — slutkoden läser dem efter slingan
  const varianter = LJUS === 'alla' ? ['morkare', 'ljusare', 'varmare', 'kallare', 'kontrast', 'brus', 'gradient'] : [LJUS];
  const sammanstallning = [];
  for (const ljus of varianter) {
  if (ljus) console.log(`\n══ ljus: ${ljus} ══`);
  const param = [AIFLAG && 'ai=1', REFFLAG && 'ref=1', LARFLAG && 'lar=1', GLOMFLAG && 'glomref=1', ljus && 'ljus=' + ljus,
                 UTAN_MODELL ? 'embed=0' : (EMBED_LOKALT && 'embedlokalt=1'), WASM && 'embedbackend=wasm', RUTLOGG && 'rutlogg=1', TRO && 'tro=' + encodeURIComponent(TRO), (LUFT === '0' || LUFT === '1') && 'luft=' + LUFT, UTAN_LEKEN && 'utanleken=' + encodeURIComponent(UTAN_LEKEN.split(',').map(x => x.trim()).join('|')),
                 (LASWORKER === '0' || LASWORKER === '1' || LASWORKER === 'kontroll') && 'lasworker=' + LASWORKER].filter(Boolean).join('&');
  await cdp('Page.navigate', { url: `http://localhost:${PORT}/dev/golden/kor.html${param ? '?' + param : ''}` });
  const status = () => kor(`(document.querySelector('#status') || {}).textContent || ''`);
  /* 3. vänta in poolen och namnläsaren, tryck Kör alla, vänta in Klar */
  process.stdout.write('förbereder (poolen, namnläsaren)…');
  const redo = await tills(async () => { const s = await status(); if (/^Fel/.test(s)) throw new Error(s); return /Redo|Kör ändå|ofullständig/.test(s) ? s : null; }, 20 * 60 * 1000, 'poolen');   // första inbäddningen av leken på WASM tar flera minuter
  console.log('\r' + redo);
  console.log(await kor(`(document.querySelector('#pool') || {}).textContent || ''`));
  console.log(await kor(`(document.querySelector('#metod') || {}).textContent || ''`));
  /* --fall <prefix>: bara fallen vars id börjar så — ett fall i taget när ett steg mäts */
  /* --fall 07,01: flera prefix, körda i DEN ordningen. Ordningen är själva
     provet ibland — ett videofall lämnade förut klockan i framtiden, och
     det syntes bara om ett foto kördes efter det. */
  await kor(FALL ? `korDessa(${JSON.stringify(FALL.split(','))}.flatMap(p => fall.filter(f => f.id.startsWith(p)))); 'ok'` : `document.querySelector('#korAlla').click(); 'ok'`);
  let sist = '';
  await tills(async () => { const s = await status(); if (s !== sist) { sist = s; process.stdout.write('\r  ' + s.padEnd(70).slice(0, 70)); } return /^(Klar|Stoppad)/.test(s) ? s : null; }, TAK_MS, 'körningen');
  console.log('');
  /* 4. resultatet: samma JSON som Kopiera resultat, som en tabell med rubriker */
  const rader = await kor(`[...document.querySelectorAll('#rader tr')].map(tr => tr.innerText.replace(/\\s+/g, ' '))`);
  const json = await kor(`(() => { const rs = fall.map(f => resultat.get(f.id)).filter(r => r && !r.fel); return '[\\n' + rs.map(r => JSON.stringify(r)).join(',\\n') + '\\n]\\n'; })()`);
  console.log('');
  skrivTabell(JSON.parse(json), gamla);
  /* K7: referenserna — hur många poolen bar per fall (--ref) och hur många varje fall lärde (--lar-ref). */
  if (REFFLAG || LARFLAG) { const rs = JSON.parse(json); console.log('\n  lärda referenser: ' + rs.map(r => `${r.id.slice(0, 2)}: ${REFFLAG ? r.ref + ' i poolen' : ''}${REFFLAG && LARFLAG ? ', ' : ''}${LARFLAG ? '+' + (r.larda || 0) + ' lärda' : ''}`).join(' · ')); }
  { const f0 = JSON.parse(json)[0]; if (f0) console.log('\n  metod: ' + f0.metod + (f0.ai ? ' (' + f0.ai + (f0.promptv != null ? ', systemprompt v' + f0.promptv : '') + ')' : '')
      + (f0.modell ? ` — bildmodellen räknade på ${f0.modell === 'webgpu' ? 'WebGPU' : f0.modell === 'wasm' ? 'WASM' : f0.modell}` : ' — utan bildmodell (reserven Matcher + ORB)')
      + '\n  (lokal: konstverket jämförs med lekens kort; ocr: kortnamnet läses ur titelraden; modell: bildmodellen rangordnar och ORB kontrollerar; ai: Claude frågas om det som är osäkert)');
    /* MES-225: vilket vittne som bar de säkra rätta namnen, och hur många Claude behövdes för. */
    const rsV = JSON.parse(json), vf = {}; for (const r of rsV) for (const k in (r.varforRatt || {})) vf[k] = (vf[k] || 0) + r.varforRatt[k];
    if (Object.keys(vf).length) console.log('  domskäl för de säkra rätta namnen: ' + Object.entries(vf).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ')
      + (AIFLAG ? ` — namnViaAi ${rsV.reduce((a, r) => a + (r.namnViaAi || 0), 0)}` : ''));
    /* MES-228: land per typ — facits basland mot kamerans, typ för typ (en hög räknas med sitt antal). */
    { const av = rsV.reduce((a, r) => a + (r.landAv || 0), 0), ratt = rsV.reduce((a, r) => a + (r.landRatt || 0), 0), over = rsV.reduce((a, r) => a + (r.landOver || 0), 0);
      if (av) console.log(`  land per typ: ${ratt}/${av} rätt, ${over} för många — ` + rsV.filter(r => r.landAv || r.landOver).map(r => `${r.id.slice(0, 2)}: ${r.landRatt}/${r.landAv}${r.landOver ? ' (+' + r.landOver + ')' : ''}`).join(' · ')); }
    const sk = rsV.filter(r => r.videoSkuggaSynlig != null).map(r => `${r.id.slice(0, 2)}: rapport +${r.videoSkuggaRapport} s, synlig +${r.videoSkuggaSynlig} s (före +${r.videoSkuggaSynligFore}), blinkar ${r.videoSkuggaBlink}`);
    if (sk.length) console.log('  skuggan (median efter utspelet, MES-226): ' + sk.join(' · '));
    { const alla = k => rsV.flatMap(r => r[k] || []).sort((a, b) => a - b), e = alla('videoSkuggaEfter'), e0 = alla('videoSkuggaEfterFore'), med = l => l.length ? l[l.length >> 1] : null;
      if (e.length) console.log(`  skuggan, datorns egen del (från första rapporten med spåret till ritad plats), ${e.length} kort: median ${med(e)} s, störst ${e[e.length - 1]} s, inom 0,3 s: ${e.filter(v => v <= 0.3).length}/${e.length} — med regeln före MES-226: median ${med(e0)} s, störst ${e0[e0.length - 1]} s, inom 0,3 s: ${e0.filter(v => v <= 0.3).length}/${e0.length}`); }
    const fd = rsV.filter(r => r.videoFordrojning != null).map(r => `${r.id.slice(0, 2)}: ${r.videoFordrojning} s${r.videoFordrojningB != null ? ' (' + r.videoFordrojningB + ' med beräkningstid)' : ''}`);
    if (fd.length) console.log('  fördröjning till namn (median per videofall): ' + fd.join(' · ')); }
  /* --detalj: varje spår med vad namnläsaren såg, för att skruva trösklarna */
  if (process.argv.includes('--detalj')) for (const r of JSON.parse(json)) {
    console.log('\n' + r.id + (r.missade.length ? ' — missade: ' + r.missade.join(', ') : ''));
    { const sidan = rader.find(x => x.includes(r.id)); if (sidan) console.log('  sidans rad: ' + sidan.replace(/^Kör\s+/, '')); }
    if (r.tidDelar) console.log(`  stegtid: median ${r.ms} ms, max ${r.msMax} ms — ` + Object.entries(r.tidDelar).map(([k, v]) => `${k} ${v.median} (${v.max})`).join(', '));
    /* MES-221: räknetrådens frågor sedan sidan laddades (hela körningen hittills, inte bara fallet). */
    if (r.lasworker) { const l = r.lasworker; console.log(`  räknetråd (${l.lage}): ${l.fragor} frågor — ${l.trad} i tråden, ${l.huvud} på huvudtråden, ${l.fel} fel, ${l.gammal} mot gammal pool, ${l.olika} olika i kontrollen; trådens räknetid median ${l.ms == null ? '–' : l.ms + ' ms'}, max ${l.msMax == null ? '–' : l.msMax + ' ms'}`); }
    console.log(`  delning: delade ${r.delade}, skurna ${r.skurna}, kortRef ${r.kortRef ? r.kortRef.lang + '×' + r.kortRef.kort + ' (av ' + r.kortRef.av + ')' : '–'}`);
    /* K5/MODE-5: lägesuppdateringarna och lägesfelet mot facits rutor. */
    if (r.lagesUpp != null) console.log(`  läge: ${r.lagesUpp} uppdateringar (${r.lagesPerMin}/min)${r.lagesSnitt ? `, ${r.lagesSnitt} storleksbyten på plats (räknas inte)` : ''}${r.lageFel != null ? `, medianfel ${r.lageFel} kortbredder mot facits rutor` : ''}`
      + ((r.lagesLista || []).length ? ' — ' + r.lagesLista.map(x => `spår ${x.nr != null ? '#' + x.nr + ' (id ' + x.id + ')' : 'id ' + x.id} @${x.s} s flyttade ${x.flytt} kortbredder${x.fran ? ` (${x.fran[0]},${x.fran[1]} @${x.fran[2]} s → ${x.till[0]},${x.till[1]}, ${x.st}, ytan ×${x.yta})` : ''}`).join(', ') : '')
      + ((r.lagesNara || []).length ? '; nästan (0,10–0,15): ' + r.lagesNara.map(x => `${x.nr != null ? '#' + x.nr : 'id ' + x.id} @${x.s} s ${x.flytt}`).join(', ') : ''));
    /* Videofallet: förloppet i videons sekunder — vad facit säger, när
       kameran namngav kortet, och varje spår från födsel till död. Det är
       här man ser ett kort som kom fram sent, ett som aldrig blev säkert,
       och ett som låg kvar efter att det plockats bort. */
    if (r.videoSpar) {
      console.log(`  video: ${r.videoSekunder} s av ${r.videoLangd} s i takt ${r.videoTakt} ms; ${r.videoLagda}/${r.videoLagdaAv} spelade, ${r.videoBorta}/${r.videoBortaAv} borttagna, ordning ${r.videoOrdning}/${r.videoOrdningAv}, fördröjning ${r.videoFordrojning == null ? '–' : r.videoFordrojning + ' s'} (median)`
        + (r.videoVerkligMs != null ? `; med beräkningstid: namn ${r.videoFordrojningB == null ? '–' : r.videoFordrojningB + ' s'}, tap ${r.videoTappFordrojningB == null ? '–' : r.videoTappFordrojningB + ' s'}, flytt ${r.videoFlyttFordrojningB == null ? '–' : r.videoFlyttFordrojningB + ' s'}, borta ${r.videoBortaFordrojningB == null ? '–' : r.videoBortaFordrojningB + ' s'} (${(r.videoVerkligMs / 1000).toFixed(1)} s verklig tid som klockan stod still, ${r.videoVerkligRutor} rutor)` : ''));
      /* K1: borta-fördröjning (telefonsidan: första rapporten utan säkert spår), tap-vridningar och dubbletter ur bordsloggen. */
      console.log(`  K1: borta-fördröjning ${r.videoBortaFordrojning == null ? '–' : r.videoBortaFordrojning + ' s'} (median${(r.videoBortaDt || []).length ? ': ' + r.videoBortaDt.join(', ') + ' s' : ''})`
        + `; tap ${r.videoTappAv == null ? '– (inga tap-händelser i facit)' : `${r.videoTapp}/${r.videoTappAv}, fördröjning ${r.videoTappFordrojning == null ? '–' : r.videoTappFordrojning + ' s'}`}`
        + `; dubbletter ${r.videoDubbletter}${Object.keys(r.videoDubbletterNamn || {}).length ? ' (' + Object.entries(r.videoDubbletterNamn).map(([n, q]) => `${n}: +${q.max} ${q.fran}–${q.till} s`).join(', ') + ')' : ''}`);
      /* MES-226: skuggan — när bar en rapport kortets spår, och när ritade datorn det. */
      if (r.videoSkuggaHandelser) console.log(`  skuggan: rapport ${r.videoSkuggaRapport == null ? '–' : '+' + r.videoSkuggaRapport + ' s'}, synlig på datorn ${r.videoSkuggaSynlig == null ? '–' : '+' + r.videoSkuggaSynlig + ' s'} (med regeln före MES-226: ${r.videoSkuggaSynligFore == null ? '–' : '+' + r.videoSkuggaSynligFore + ' s'}; median efter utspelet); per kort: `
        + r.videoSkuggaHandelser.map(x => `${x.namn} rapport +${x.rapport} synlig +${x.synlig} (före +${x.synligFore}) namn +${x.namnDt}`).join(' · ')
        + `; platser som ritades och försvann utan namn: ${r.videoSkuggaBlink}${(r.videoSkuggaBlinkLista || []).length ? ' (' + r.videoSkuggaBlinkLista.map(x => `#${x.id} ${x.fran}–${x.till} s`).join(', ') + ')' : ''}`);
      if ((r.videoTappFalskaLista || []).length) console.log('    FALSKA tap-flippar: ' + r.videoTappFalskaLista.map(x => `${x.s} s ${x.namn} → ${x.till ? 'tappad' : 'otappad'}`).join(', '));
      for (const x of r.videoTappHandelser || []) console.log(`    ${x.t} s ${x.vill ? 'tappar' : 'otappar'} ${x.namn}: ` + (x.dt == null ? 'SÅGS ALDRIG inom 8 s' : `sågs +${x.dt} s`));
      if (r.videoGravAndringar) console.log(`  högvakten (MES-85): ändringar vid ${r.videoGravAndringar.length ? r.videoGravAndringar.join(', ') + ' s' : '–'}`);
      for (const x of r.videoGravHandelser || []) console.log(`    ${x.t} s ${x.namn} till högen: ` + (x.dt == null ? 'HÖGEN ÄNDRADES INTE inom 6 s' : `högen ändrades +${x.dt} s`));
      for (const x of r.videoFlyttHandelser || []) console.log(`    ${x.t} s flyttar ${x.namn}: ` + (x.dt == null ? (x.sedd ? 'SÅGS ALDRIG inom 8 s' : 'inget säkert spår med namnet före flytten') : `sågs +${x.dt} s`));
      for (const h of r.videoHandelser || []) console.log(h.spelar
        ? `    ${h.t} s ut ${h.spelar}: ` + (h.s == null ? 'aldrig säkert namngivet' : `säkert ${h.s} s (spår ${h.spar}, +${h.dt} s)`)
        : `    ${h.t} s bort ${h.tar_bort}: ` + (h.borta ? 'borta ur bordet' : 'LIGGER KVAR'));
      if (r.videoFelUnder) console.log('    säkra namn på kort som aldrig var i partiet: ' + (r.videoFelUnderNamn || []).map(x => `${x.namn} (spår ${x.spar}, ${x.s} s)`).join(', '));
      for (const l of r.videoSpar) console.log(`    spår ${l.id}${l.nr ? ` (#${l.nr} i slutet)` : ''}: ${l.fodd}–${l.borta != null ? l.borta : l.sist} s`
        + (l.borta != null ? ' (försvann)' : '') + (l.skrap != null ? `, skräp från ${l.skrap} s` : '')
        + `, ${l.sakra.length ? 'säkert ' + l.sakra.map(x => `${x.namn} @${x.s} s`).join(', ') : 'aldrig säkert namngivet'}`
        + `, sist ${l.namn || '–'}${l.namn && !l.saker ? ' (osäker)' : ''} ${l.tillstand}`);
    }
    if (r.helbild) console.log(`  helbild (${r.helbild.skal}): Claude såg ${r.helbild.kort} kort — ${r.helbild.nya} nya spår, ${r.helbild.namngivna} egna namngivna, ${r.helbild.bort} borttagna; ${r.helbild.ms} ms; låda ${r.helbild.matt ? r.helbild.matt.lang + '×' + r.helbild.matt.kort + ' (' + r.helbild.matt.kalla + ')' : '–'}${r.helbild.modell ? '; ' + r.helbild.modell : ''}`);
    for (const p of r.skurnaAlla || []) console.log(`    skuret vid ${p.s} s: ${p.lang}×${p.kort} ${p.grader}° led ${p.led}${p.minne ? ' (minne)' : ''}: ${p.snitt.map(c => c.vid + ' (djup ' + c.djup + ', mörk ' + c.mork + ')').join(', ')} → ${p.delar.join(' | ')}`);
    if (process.argv.includes('--rutor')) {
      /* Bara raderna som SKILJER sig från rutan före: på en stillbild är de flesta rutor lika, och det är bytena man letar efter. */
      let forra = '';
      for (const l of r.skarLogg || []) { const s = `skurna ${l.skurna}${l.prov.length ? ' — ' + l.prov.join('; ') : ''}`; if (s !== forra) { forra = s; console.log(`    ruta ${l.ruta}: ${s}`); } }
      for (const p of r.tidslinje || []) console.log(`    ${p.s} s${p.ruta != null ? ' (ruta ' + p.ruta + ')' : ''} [${p.lage}]: ${p.spar || '–'}`);
    }
    /* MES-83: varje födsel med närmaste lediga spår (avstånd mot gränsen, areakvot, ms utan region, täckning) och närmaste spår som redan hade en region. */
    /* MES-85: högvaktens domar — en per stilla stund i graveyard-rutan, och var 2:a sekund medan den rör sig. */
    for (const p of r.gravProv || []) console.log(`    högvakt ${p.s} s: ${p.dom}${p.byt != null ? ` — ${p.byt}/${p.av} celler ändrade${p.behov != null ? ` (krav ${p.behov})` : ''}` : p.av != null ? ` (${p.av} celler)` : ''}`
      + `${p.median != null ? `, struktur ${p.median}, släta ${p.slata}` : ''}${p.rort != null ? ` (${Math.round(p.rort * 100)} % av cellerna rör sig)` : ''}`
      + `${p.d ? ` [största skillnader ${p.d.join(' ')}; gräns ${p.grans}]` : ''}`);
    for (const b of r.fodslar || []) console.log(`    född ${b.s} s @${b.cx},${b.cy} lång ${b.lang} (gräns ${b.grans}): ledigt ${b.narm ? `#${b.narm.id} ${b.narm.d} px, area ×${b.narm.area}, ${b.narm.sen} ms utan region, ${b.narm.st}${b.narm.namn ? ' ' + b.narm.namn : ''}, täckning ${b.narm.tackning}` : '–'}; upptaget ${b.upptaget ? `#${b.upptaget.id} ${b.upptaget.d} px` : '–'}`);
    /* MES-94: varje lokal läsning — beskärningens storlek, bildens dom med poäng och ORB-inliers, namnläsarens svar — så att en säker bilddom går att spåra till sina tal. */
    for (const l of r.lasningar || []) console.log(`    läst ${l.s} s${l.spek ? ' (tidigt)' : ''} spår ${l.nr != null ? '#' + l.nr : 'id ' + l.spar} ${l.w}×${l.h}: ${l.dom}${l.varfor ? ' [' + l.varfor + ']' : ''}${l.namn ? ' ' + l.namn : ''}`
      + (l.bild ? ` — ${l.bild.modell ? `modell ${l.bild.poang}, marginal ${l.bild.marginal}${l.bild.ensamt ? '' : ', inte ensamt'}, ${l.bild.ms} ms; ORB ${l.bild.inliers} inliers${l.bild.orbNamn ? ' på ' + l.bild.orbNamn : ''} (ettan ${l.bild.stod}${l.bild.skala != null ? ', skala ' + l.bild.skala : ''})` : `bild ${l.bild.poang}, ${l.bild.inliers} inliers${l.bild.efterModell ? ' (andra åsikten efter modellen)' : ''}`}${l.bild.accept ? ', accept' : ''}` : '')
      + ((l.cands || []).length ? ' (' + l.cands.map(c => c.name + (c.score != null ? ' ' + c.score : '')).join(', ') + ')' : '')
      + (l.ocr ? (l.ocr.hoppad ? ` [ocr hoppad: ${l.ocr.hoppad}]` : ` [ocr "${l.ocr.text || ''}" → ${l.ocr.namn || '–'} ${l.ocr.poang}/${l.ocr.marginal}${l.ocr.vand ? ' vänd' : ''}]`) : ''));
    for (const p of r.skarProv || []) console.log(`    snitt ${p.lang}×${p.kort} ${p.grader}° led ${p.led}${p.minne ? ' (minne)' : ''}${p.niv ? ' [' + p.niv + ']' : ''}: ${p.snitt.map(c => c.vid + ' (djup ' + c.djup + ', mörk ' + c.mork + ')').join(', ')} → ${p.delar.join(' | ')} → ${p.dom}`);
    for (const t of r.spar) console.log(`  #${t.id} @${t.x},${t.y} ${t.w}×${t.h} ${t.tillstand}${t.varfor ? ' [' + t.varfor + ']' : ''}${t.namn ? ' ' + t.namn + (t.saker ? '' : ' (osäker: ' + t.cands.join(', ') + ')') : ''}${t.ocr ? (t.ocr.hoppad ? ' [ocr hoppad: ' + t.ocr.hoppad + ']' : ' [ocr "' + (t.ocr.text || '') + '" → ' + (t.ocr.namn || '–') + ' ' + t.ocr.poang + '/' + t.ocr.marginal + (t.ocr.start != null ? ' @' + Math.round(t.ocr.start * 100) + '%' + (t.ocr.vand ? ' vänd' : '') : '') + ', ' + t.ocr.ms + ' ms]') : ''}`);
  }
  /* --beskarningar <mapp>: det kameran faktiskt skickade till igenkänningen,
     en jpg per spår, döpt efter spårets nummer i --detalj (#nr). Ett spår
     som identifierats men försvunnit innan fallet var klart heter
     -sparM<modulid>-borta. Hämtas en i taget: en data-URL är 100–300 kB. */
  if (BESKARNINGAR) {
    fs.mkdirSync(BESKARNINGAR, { recursive: true });
    const lista = await kor(`Object.entries(beskarningar).map(([id, l]) => ({ id, spar: l.map(p => ({ spar: p.spar, nr: p.nr, w: p.w, h: p.h })) }))`);
    const index = [];
    for (const f of lista) for (let i = 0; i < f.spar.length; i++) {
      const p = f.spar[i];
      const b64 = await kor(`beskarningar[${JSON.stringify(f.id)}][${i}].b64`);
      const fil = `${f.id}-spar${p.nr != null ? p.nr : 'M' + p.spar + '-borta'}.jpg`;
      fs.writeFileSync(path.join(BESKARNINGAR, fil), Buffer.from(String(b64 || '').replace(/^data:image\/jpeg;base64,/, ''), 'base64'));
      index.push({ fall: f.id, nr: p.nr, modulId: p.spar, w: p.w, h: p.h, fil });
    }
    fs.writeFileSync(path.join(BESKARNINGAR, 'index.json'), JSON.stringify(index, null, 1) + '\n');
    console.log(`\n${index.length} beskärningar skrivna till ${BESKARNINGAR} (index.json listar dem)`);
  }
  if (RUTLOGG) { const rl = JSON.parse(json).filter(r => r.rutLogg).map(r => ({ id: r.id, handelser: r.videoHandelser, spar: r.videoSpar, rutLogg: r.rutLogg })); fs.writeFileSync(RUTLOGG, JSON.stringify(rl) + '\n'); console.log(`\nrutloggen skriven till ${RUTLOGG} (${rl.length} videofall)`); }
  /* 5. sämre än senaste.json? rätt namn ner, falska eller fel namn upp */
  /* Domen mot baslinjen skrivs alltid: BÄTTRE, LIKA BRA, SÄMRE eller BLANDAT,
     totalt och fall för fall. Förut syntes bara det som blev sämre, så en
     körning med en annan modell som gick lika bra eller bättre sa ingenting. */
  samre = []; battre = []; const rs = JSON.parse(json);
  const vad = r => `${r.ai || 'bara det lokala'}${r.promptv != null ? ', systemprompt v' + r.promptv : ''}`;
  for (const r of rs) { const g = gamla.get(r.id); if (!g) continue;
    /* Videofallen jämförs också på förloppet: ett kort som lades ut och
       aldrig fick sitt namn syns inte i slutläget. Nämnaren är förloppets
       egen — utspelade respektive bortplockade kort, inte korten i facit. */
    for (const [k, namn, merArBattre, avK] of [['namn', 'rätt namn', true, 'kort'], ['felNamn', 'fel namn', false, 'kort'], ['falska', 'falska', false, 'kort'],
                                               ['videoLagda', 'spelade kort som fick namn', true, 'videoLagdaAv'], ['videoBorta', 'borttagna kort som försvann', true, 'videoBortaAv'],
                                               ['videoOrdning', 'utspel i rätt ordning', true, 'videoOrdningAv'], ['videoFelUnder', 'säkra namn på kort som aldrig var i partiet', false, 'videoLagdaAv'],
                                               ['videoDubbletter', 'dubbletter', false, 'kort'], ['videoTapp', 'tap-vridningar som sågs', true, 'videoTappAv'],
                                               ['videoTappFalska', 'falska tap-flippar', false, 'kort'],
                                               ['lagesUpp', 'lägesuppdateringar', false, 'kort'], ['videoFlytt', 'flyttar som sågs', true, 'videoFlyttAv'],
                                               ['videoGrav', 'kort till högen som högvakten såg', true, 'videoGravAv'], ['videoGravFalska', 'falska högändringar', false, 'kort'],
                                               ['landRatt', 'land rätt per typ', true, 'landAv'], ['landOver', 'land för många per typ', false, 'landAv']]) {
      if (r[k] == null || g[k] == null || r[k] === g[k]) continue;
      ((r[k] > g[k]) === merArBattre ? battre : samre).push(`${r.id}: ${namn} ${g[k]} → ${r[k]} (av ${r[avK]} kort)`);
    } }
  const jamforda = rs.filter(r => gamla.has(r.id));
  if (jamforda.length) {
    const gs = jamforda.map(r => gamla.get(r.id)), s = (l, k) => l.reduce((a, r) => a + (r[k] || 0), 0);
    /* Sämre mot en annan modell eller systemprompt är en jämförelse, inget fel. */
    if (gs[0].ai !== jamforda[0].ai || (gs[0].promptv != null && gs[0].promptv !== jamforda[0].promptv))
      console.log(`\nOBS: baslinjen (${BASFIL}) är gjord med ${vad(gs[0])}, den här körningen med ${vad(jamforda[0])}`);
    const dom = samre.length && battre.length ? 'BLANDAT — bättre i något fall, sämre i ett annat' : samre.length ? 'SÄMRE' : battre.length ? 'BÄTTRE' : 'LIKA BRA';
    console.log(`\nJämfört med baslinjen (${BASFIL}): ${dom}`);
    console.log(`  totalt: rätt namn ${s(gs, 'namn')} → ${s(jamforda, 'namn')} av ${s(jamforda, 'kort')} kort, fel namn ${s(gs, 'felNamn')} → ${s(jamforda, 'felNamn')}, falska ${s(gs, 'falska')} → ${s(jamforda, 'falska')}`
      + (jamforda.some(r => r.videoLagdaAv != null || r.videoBortaAv != null) ? `\n  förloppet: spelade ${s(gs, 'videoLagda')} → ${s(jamforda, 'videoLagda')} av ${s(jamforda, 'videoLagdaAv')} kort, borttagna ${s(gs, 'videoBorta')} → ${s(jamforda, 'videoBorta')} av ${s(jamforda, 'videoBortaAv')} kort, ordning ${s(gs, 'videoOrdning')} → ${s(jamforda, 'videoOrdning')}, fel namn under förloppet ${s(gs, 'videoFelUnder')} → ${s(jamforda, 'videoFelUnder')}` : ''));
    if (battre.length) console.log('  bättre:\n    ' + battre.join('\n    '));
    if (samre.length) console.log('  sämre:\n    ' + samre.join('\n    '));
  } else console.log(`\nIngen baslinje att jämföra med för de här fallen (${BASFIL}).`);
  /* --spara med --fall byter bara de körda fallen i baslinjen; övriga står kvar
     ur filen. Förut skrev "--fall 07 --spara" en baslinje med enbart fall 07,
     och alla andra fall slutade jämföras — just när ett nytt fall lagts till. */
  if (ljus) { sammanstallning.push({ ljus, rs, samre: samre.slice(), battre: battre.slice() }); if (varianter.length > 1 || SPARA) { if (SPARA) console.log('\n(--spara gäller inte med --ljus: baslinjen mäter fotona som de är)'); continue; } }
  if (aiFel.n) console.log(`\nVARNING: ${aiFel.n} anrop till Claude misslyckades — resultatet ovan är i praktiken den lokala kedjan. Första felet: ${aiFel.forsta}`);
  if (SPARA && aiFel.n) { console.log(`\n--spara vägrat: ${BASFIL} skrivs inte när anrop till Claude misslyckats.`); process.exitCode = 1; }
  else if (SPARA && !REFFLAG) {
    let rader = JSON.parse(json); for (const r of rader) delete r.rutLogg;
    if (FALL) {
      let gamla = []; try { gamla = JSON.parse(fs.readFileSync(path.join(__dirname, BASFIL), 'utf8')); } catch (e) {}
      const korda = new Set(rader.map(r => r.id));
      rader = gamla.filter(r => !korda.has(r.id)).concat(rader).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    }
    fs.writeFileSync(path.join(__dirname, BASFIL), '[\n' + rader.map(r => JSON.stringify(r)).join(',\n') + '\n]\n');
    console.log(`\nsparat som dev/golden/${BASFIL}${FALL ? ` (fall ${FALL}… bytta, övriga ur filen)` : ''} — lägg en rad i historik.md`);
  }
  else if (REFFLAG) console.log('\n(--spara gäller inte med --ref: baslinjen mäter kameran utan lärda referenser)');
  else console.log('\n(--spara skriver ' + BASFIL + ')');
  }
  /* --ljus alla: sammanställningen — per variant och fall: rätt namn, fel namn, falska, förloppet — mot baslinjen. Där kedjan går sönder först. */
  if (sammanstallning.length > 1) {
    console.log('\n══ Sammanställning: kedjan i sju ljus (mot baslinjen) ══');
    const kol = (v, n) => String(v).padEnd(n);
    console.log('  ' + kol('fall', 8) + sammanstallning.map(x => kol(x.ljus, 16)).join('') + 'baslinje');
    const g0 = sammanstallning[0].rs;
    for (const r0 of g0) {
      const g = gamla.get(r0.id);
      const cell = r => `${r.namn}/${r.kort} ${r.felNamn}f ${r.falska}x` + (r.videoLagdaAv != null ? ` ${r.videoLagda}/${r.videoLagdaAv}s` : '');
      console.log('  ' + kol(r0.id.slice(0, 2), 8) + sammanstallning.map(x => { const r = x.rs.find(q => q.id === r0.id); return kol(r ? cell(r) : '–', 16); }).join('') + (g ? cell(g) : '–'));
    }
    console.log('  (rätt namn/kort · f = fel namn · x = falska · s = spelade kort som fick namn)');
    for (const x of sammanstallning) console.log(`  ${x.ljus}: ${x.samre.length ? 'SÄMRE — ' + x.samre.join('; ') : 'inte sämre'}${x.battre.length ? ' | bättre: ' + x.battre.join('; ') : ''}`);
  }
  ws.close(); chrome.kill(); server.kill();
  process.exit(sammanstallning.length ? 0 : (samre.length || aiFel.n ? 1 : 0));
})().catch(e => { console.error('\nkor.cjs: ' + (e && e.message || e)); process.exit(2); });

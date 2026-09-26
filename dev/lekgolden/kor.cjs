#!/usr/bin/env node
/* Lekfotots golden set (MES-289). Kör: node dev/lekgolden/kor.cjs [--spara] [--detalj]
     [--beskarning hela|ram|bada] [--foto 09,13] [--set S01,S08] [--las-om 09,13|alla]
     [--bara-cache] [--svar sista|forsta|N] [--spridning] [--parallellt 4]
     [--skarm 390x844] [--beskarningar <mapp>] [--mapp <fotomapp>]

   Mäter hela kedjan när en lek läggs in med telefonens lekfoto: fotot →
   beskärningen och nedskalningen som telefonen gör → Claude i läget 'lek'
   (api/identify.js) → namnen slås upp mot Scryfall → ändringarna läggs i
   leken → leken efter alla foton i ett set. Resultatet jämförs med ett
   facit: vilka kort som ligger helt i varje foto, och vilka foton som
   tillsammans ska ge exakt leken.

   TELEFONENS RIKTIGA KOD, inte en omskrivning. Allt klipps ut ur index.html
   vid körningen, på samma sätt som dev/lekfoto.cjs gör:

     i Chrome (huvudlös)  beskärningen: filväljarens väg (loadImage + duken
                          med KALLA_MAX + rutan {.02,.02,.96,.96}) eller
                          kamerans (telfotoKnapp + telfotoRamBox, med appens
                          egen CSS för ramen och videon på en telefonskärm),
                          sedan lekKallDuk, lekB64 och lekDomAv
     i Node               api/identify.js (handlern, som attrappen kör den),
                          sedan telfotoLas, telfotoSpara och lekSparaKo med
                          appens lookup mot Scryfall

   Varför Chrome för beskärningen: det är en canvas som skalar och en
   JPEG-kodare som komprimerar, och båda finns bara i en webbläsare. Chrome
   är inte Safari på en iPhone — kodaren och skalningen skiljer sig i
   detaljer — men det är samma kod och samma tak (2 MP, 2400 px, JPEG 0,85).

   Varje foto läses EN gång per beskärning. Claudes svar sparas på disk
   (<fotomapp>/svar/, gitignorerat som resten av dev/material), med en nyckel
   av fotot, beskärningen, modellen, systemprompten (PANE_PROMPT_V och en
   hash av hela lekblocket i api/identify.js) och telefonens beskärningskod.
   Ändras något av det läses fotot om av sig självt. --las-om tvingar en ny
   läsning; den läggs till i cachen, och den senaste används (--svar väljer
   en annan). Scryfalls svar sparas också, så att en körning ur cachen ger
   samma tal varje gång.

   Seten spelas upp som telefonen gör Photo 1, Photo 2 …: varje foto läses
   med telfotoLas på den lek de förra fotona lämnade, och leken sparas med
   lekSparaKo mot en påhittad rad (ingen databas, inga nätfel).

   Slutkod 1 om något blev sämre än baslinjen (dev/lekgolden/senaste.json),
   2 om körningen inte gick att genomföra. .cjs eftersom package.json säger
   "type": "module". Hur den körs och vad kolumnerna betyder:
   dev/lekgolden/SNABBGUIDE.md. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

const ROT = path.join(__dirname, '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
const flagga = n => process.argv.includes(n);
const MAPP = path.resolve(ROT, arg('--mapp', 'dev/material/foton/2026-09-26-lekfoto'));
const SVARMAPP = path.join(MAPP, 'svar');
const LAGEN = { hela: ['hela'], ram: ['ram'], bada: ['hela', 'ram'], 'båda': ['hela', 'ram'] }[arg('--beskarning', 'bada')];
const lista = s => s ? s.split(',').map(x => x.trim()).filter(Boolean) : null;
const FOTO_VAL = lista(arg('--foto', ''));
const SET_VAL = lista(arg('--set', ''));
const LAS_OM = arg('--las-om', '');
const BARA_CACHE = flagga('--bara-cache');
const SVARVAL = arg('--svar', 'forsta');
const PARALLELLT = Math.max(1, +arg('--parallellt', 4));
const SPARA = flagga('--spara'), DETALJ = flagga('--detalj'), SPRIDNING = flagga('--spridning');
const [SKARM_B, SKARM_H] = arg('--skarm', '390x844').split('x').map(Number);
const BESKARNINGAR = arg('--beskarningar', '');
const BASFIL = path.join(__dirname, 'senaste.json');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
/* Pris per miljon tokens (in, ut) — samma tabell som dev/golden/SNABBGUIDE.md. */
const PRIS = { 'claude-opus-5': [5, 25], 'claude-sonnet-5': [2, 10], 'claude-fable-5-1': [10, 50], 'claude-haiku-4-5': [1, 5] };

if (!LAGEN) { console.error('--beskarning ska vara hela, ram eller bada'); process.exit(2); }
const sha = s => crypto.createHash('sha1').update(s).digest('hex');
const kopia = o => JSON.parse(JSON.stringify(o));
const vanta = ms => new Promise(r => setTimeout(r, ms));

/* ══ Telefonens kod, utklippt ur index.html ═════════════════════════════ */
const SRC = fs.readFileSync(path.join(ROT, 'index.html'), 'utf8');
function skar(fran, till, start = 0) {
  const a = SRC.indexOf(fran, start), b = a < 0 ? -1 : SRC.indexOf(till, a + fran.length);
  if (a < 0 || b < 0) throw new Error(`hittar inte "${fran}" … "${till}" i index.html — koden har skrivits om; uppdatera utklippen i dev/lekgolden/kor.cjs`);
  return SRC.slice(a, b);
}
const rad1 = re => { const m = SRC.match(re); if (!m) throw new Error('hittar inte ' + re + ' i index.html'); return m[0]; };
const HOGAR = +rad1(/const TELFOTO_HOGAR = (\d+);/).match(/\d+/)[0];

/* Beskärningen (körs i Chrome). */
const DUK_KOD = skar('/* ── duken som skickas', '/* Modellen svarar med titelradens mittpunkt');
const RAM_KOD = skar('function telfotoRamBox() {', '/* "Names are readable"');
const BILD_KOD = skar('function loadImage(src, cross) {', '\nfunction loadShot(');
const KNAPP_KOD = skar('  const box = telfotoRamBox();', '  telfotoStoppKamera();', SRC.indexOf('function telfotoKnapp() {'));
const FIL_BLOCK = skar("$('#telFil').onchange", '/* ── avläsningen ── */');
const FIL_KOD = FIL_BLOCK.slice(FIL_BLOCK.indexOf('    const img = await loadImage(url, false);'), FIL_BLOCK.indexOf('    telfotoStoppKamera();'));
const HELA_BOX_SRC = (FIL_BLOCK.slice(FIL_BLOCK.indexOf('    telfotoStoppKamera();')).match(/box:\s*(\{[^}]*\})/) || [])[1];
if (!FIL_KOD.includes('loadImage') || !HELA_BOX_SRC) throw new Error('filväljarens väg ser annorlunda ut i index.html — uppdatera utklippen i dev/lekgolden/kor.cjs');
const CSS = skar('<style>', '</style>').slice('<style>'.length);
const VY = skar('<div id="vyLekfoto"', '  <input type="file" id="telFil"').replace(/ hidden(?=[\s>])/g, '') + '</div>';
const BESK_KOD_SHA = sha(DUK_KOD + RAM_KOD + BILD_KOD + KNAPP_KOD + FIL_KOD + HELA_BOX_SRC).slice(0, 8);

/* Avläsningen och sparningen (körs i Node), som dev/lekfoto.cjs klipper dem. */
const LEK_KOD = [
  skar('/* ══ BLOCK: LEKSLAG', '/* ══ SLUT: LEKSLAG ══ */'),
  skar('const LEK_BL_FARG', '/* Namnet på en ny lek'),
  skar('const lekNamnForm =', '/* Vad i det skrivna namnet'),
  skar('/* En sparning av en kö mot en rad.', '/* Efter en sparning:'),
  skar('/* ── avläsningen ── */', '/* ══ SLUT: TELEFONENS LEKFOTO ══ */'),
].join('\n');
/* Uppslagningen: Scryfall-klienten SF, kortcachen och lookup — appens egna. */
const UPPSLAG_KOD = [
  rad1(/^const sleep = .*$/m), rad1(/^const norm = .*$/m),
  skar('const SF = (() => {', '/* ─────────── kortcache ─────────── */'),
  skar('/* ─────────── kortcache ─────────── */', 'function cardFor(name) {'),
  skar('function imgOf(card, face, size) {', '\n/* ═══'),
].join('\n');

/* ══ Facit, leken och systemprompten ════════════════════════════════════ */
const FACIT_TEXT = fs.readFileSync(path.join(MAPP, 'facit.json'), 'utf8');
const FACIT = JSON.parse(FACIT_TEXT);
const FACIT_SHA = sha(FACIT_TEXT).slice(0, 8);
const LEKEN = new Map();
for (const r of fs.readFileSync(path.join(ROT, 'dev', 'golden', 'lek.txt'), 'utf8').split('\n')) {
  const t = r.trim(); if (!t || t.startsWith('#')) continue;
  const m = t.match(/^(\d+)\s+(.+)$/);
  LEKEN.set(m ? m[2] : t, m ? +m[1] : 1);
}
const BASLAND = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);
const multi = namn => { const m = new Map(); for (const n of namn) m.set(n, (m.get(n) || 0) + 1); return m; };
const grupperna = gs => (gs || []).flatMap(g => { if (!FACIT.grupper[g]) throw new Error(`facit: gruppen "${g}" finns inte`); return FACIT.grupper[g]; });
const summa = m => [...m.values()].reduce((a, b) => a + b, 0);
/* Facit självt provas innan något mäts: varje namn ska finnas i leken, och
   ett set ska ge exakt leken (40) eller leken utan basland (26). Annars mäter
   provet facit i stället för kedjan. */
function provaFacit() {
  const fel = [];
  for (const [g, namn] of Object.entries(FACIT.grupper)) for (const n of namn) if (!LEKEN.has(n)) fel.push(`gruppen ${g}: "${n}" finns inte i dev/golden/lek.txt`);
  const helaLeken = LEKEN, utanBas = new Map([...LEKEN].filter(([n]) => !BASLAND.has(n)));
  for (const [s, v] of Object.entries(FACIT.set)) {
    const m = multi(grupperna(v.foton.flatMap(f => { if (!FACIT.foton[f]) throw new Error(`facit: set ${s} har fotot ${f} som inte finns`); return FACIT.foton[f].hela; })));
    if (summa(m) !== v.antal) fel.push(`set ${s}: fotonas hela grupper ger ${summa(m)} kort, facit säger ${v.antal}`);
    const mot = v.antal === summa(utanBas) ? utanBas : helaLeken;
    for (const n of new Set([...m.keys(), ...mot.keys()])) if ((m.get(n) || 0) !== (mot.get(n) || 0)) fel.push(`set ${s}: ${n} ${m.get(n) || 0} gånger, leken har ${mot.get(n) || 0}`);
  }
  for (const f of Object.keys(FACIT.foton)) if (!fs.existsSync(path.join(MAPP, f))) fel.push(`fotot ${f} saknas i ${MAPP}`);
  return fel;
}

const IDENT = fs.readFileSync(path.join(ROT, 'api', 'identify.js'), 'utf8');
const PROMPTV = +(IDENT.match(/const PANE_PROMPT_V = (\d+)/) || [])[1];
const MODELL = process.env.ANTHROPIC_MODEL || (IDENT.match(/const MODEL = process\.env\.ANTHROPIC_MODEL \|\| '([^']+)'/) || [])[1];
const LEKBLOCK = (() => {
  const a = IDENT.indexOf("if (mode === 'lek') {"), b = IDENT.indexOf('/* ── Kameran:', a);
  if (a < 0 || b < 0) throw new Error("hittar inte läget 'lek' i api/identify.js");
  return sha(IDENT.slice(a, b)).slice(0, 8);
})();

/* ══ Chrome: beskärningen ═══════════════════════════════════════════════ */
const barn = [];
process.on('exit', () => { for (const c of barn) { try { c.kill('SIGKILL'); } catch (e) {} } });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(130));
async function tills(f, ms, vad) { const t0 = Date.now(); for (;;) { const v = await f().catch(() => null); if (v) return v; if (Date.now() - t0 > ms) throw new Error('väntade förgäves på ' + vad); await vanta(150); } }

function sidan() {
  /* En sida med appens hela stilmall och telefonens vy (#vyLekfoto med
     kameralagret synligt), så att ramen och videon läggs ut av appens egen
     CSS på den skärm Emulation ger. Fotot står i videons ställe. */
  const kod = `
const $ = s => document.querySelector(s);
${rad1(/^const clamp = .*$/m)}
const TELFOTO_HOGAR = ${HOGAR};
${DUK_KOD}
${BILD_KOD}
${RAM_KOD}
async function filTillDuk(url) {
${FIL_KOD}
  return cv;
}
function knappTillDuk(v) {
${KNAPP_KOD}
  return { cv, box };
}
const HELA_BOX = ${HELA_BOX_SRC};
const bildAv = async b64 => {
  const url = URL.createObjectURL(new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], { type: 'image/jpeg' }));
  return { url, img: await loadImage(url, false) };
};
window.lekMatt = async b64 => { const { url, img } = await bildAv(b64); URL.revokeObjectURL(url); return [img.naturalWidth, img.naturalHeight]; };
window.lekgolden = async (b64, lage) => {
  const { url, img } = await bildAv(b64);
  try {
    let kalla;
    if (lage === 'hela') kalla = { canvas: await filTillDuk(url), box: HELA_BOX };
    else {
      /* Kamerans väg: videons mått är fotots (4:3 som fotot), och videoelementet
         ligger där appens CSS lägger det. telfotoKnapp ritar videorutan på en
         duk; här ritas fotot, som är den rutan. */
      const vid = $('#telVideo');
      for (const o of [vid, img]) {
        Object.defineProperty(o, 'videoWidth', { value: img.naturalWidth, configurable: true });
        Object.defineProperty(o, 'videoHeight', { value: img.naturalHeight, configurable: true });
      }
      const r = knappTillDuk(img);
      kalla = { canvas: r.cv, box: r.box };
    }
    const duk = lekKallDuk(kalla.canvas, kalla.box);
    const dom = lekDomAv(duk, TELFOTO_HOGAR);
    const ut = lekB64(duk);
    const ram = $('#telRam').getBoundingClientRect();
    return { b64: ut.b64, q: ut.q, w: ut.cv.width, h: ut.cv.height, kalla: [kalla.canvas.width, kalla.canvas.height], box: kalla.box,
      dom: { kod: dom.kod, W: Math.round(dom.W), titel: +dom.titel.toFixed(1), varians: Math.round(dom.varians), utbrant: +dom.utbrant.toFixed(3) },
      skarm: [innerWidth, innerHeight], ram: [ram.left, ram.top, ram.width, ram.height].map(v => +v.toFixed(1)) };
  } finally { URL.revokeObjectURL(url); }
};`;
  return `<!doctype html><html><head><meta charset="utf-8">${rad1(/<meta name="viewport"[^>]*>/)}<style>${CSS}</style></head><body>${VY}<script>${kod}</script></body></html>`;
}

async function beskar(foton) {
  if (!fs.existsSync(CHROME)) throw new Error('Hittar inte Chrome på ' + CHROME + ' — sätt CHROME=/sökväg/till/Chrome');
  const profil = path.join(os.tmpdir(), 'mesa-lekgolden-profil');
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profil, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  barn.push(chrome);
  let wsUrl = null, stderr = '';
  chrome.stderr.on('data', d => { stderr += d; const m = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) wsUrl = m[1]; });
  await tills(async () => wsUrl, 15000, 'Chrome (DevTools-porten)');
  const port = new URL(wsUrl).port;
  const version = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).Browser || 'Chrome';
  const sida = await tills(async () => (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'), 10000, 'en sida i Chrome');
  const ws = new WebSocket(sida.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let nr = 0; const svar = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && svar.has(m.id)) { svar.get(m.id)(m); svar.delete(m.id); } };
  const cdp = (method, params) => new Promise((res, rej) => {
    const id = ++nr, t = setTimeout(() => { svar.delete(id); rej(new Error(method + ' svarade inte på 60 s')); }, 60000);
    svar.set(id, m => { clearTimeout(t); if (m.error) rej(new Error(method + ': ' + m.error.message)); else res(m.result); });
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
  const kor = async uttryck => {
    const r = await cdp('Runtime.evaluate', { expression: uttryck, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
    return r.result.value;
  };
  const skarm = (b, h) => cdp('Emulation.setDeviceMetricsOverride', { width: b, height: h, deviceScaleFactor: 3, mobile: true });
  await skarm(SKARM_B, SKARM_H);
  await cdp('Page.navigate', { url: 'data:text/html;base64,' + Buffer.from(sidan()).toString('base64') });
  await tills(() => kor(`typeof lekgolden === 'function'`), 10000, 'sidan med telefonens kod');
  const ut = new Map();
  for (const f of foton) {
    const jpg = fs.readFileSync(path.join(MAPP, f)).toString('base64');
    const [bb, bh] = await kor(`lekMatt(${JSON.stringify(jpg)})`);
    for (const lage of LAGEN) {
      /* Ett liggande foto togs med telefonen på tvären: skärmen är liggande
         också (844×390), och appens CSS för en låg skärm gäller (top 22 %). */
      if (lage === 'ram') await skarm(bb > bh ? SKARM_H : SKARM_B, bb > bh ? SKARM_B : SKARM_H);
      const r = await kor(`lekgolden(${JSON.stringify(jpg)}, ${JSON.stringify(lage)})`);
      r.bild = [bb, bh]; r.fotoSha = sha(Buffer.from(jpg, 'base64')).slice(0, 12); r.bildSha = sha(r.b64).slice(0, 12);
      ut.set(f + '|' + lage, r);
      if (BESKARNINGAR) { fs.mkdirSync(BESKARNINGAR, { recursive: true }); fs.writeFileSync(path.join(BESKARNINGAR, `${f.replace(/\.\w+$/, '')}-${lage}.jpg`), Buffer.from(r.b64, 'base64')); }
    }
  }
  try { ws.close(); } catch (e) {}
  chrome.kill('SIGTERM');
  return { ut, version };
}

/* ══ Claude: api/identify.js i läget 'lek' ══════════════════════════════ */
let handlerP = null;
function laddaHandler() {
  /* Samma som attrappen (dev/stub-server.cjs --ai): nyckeln ur .env.local,
     handlern importerad och anropad med ett req/res som Vercels. */
  if (!handlerP) handlerP = (async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      let env = ''; try { env = fs.readFileSync(path.join(ROT, '.env.local'), 'utf8'); } catch (e) {}
      const m = env.match(/^\s*ANTHROPIC_API_KEY\s*=\s*("?)(.*?)\1\s*$/m);
      if (m && m[2]) process.env.ANTHROPIC_API_KEY = m[2];
    }
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ingen ANTHROPIC_API_KEY i miljön eller .env.local (symlänka .env.local i en worktree)');
    return (await import(pathToFileURL(path.join(ROT, 'api', 'identify.js')).href)).default;
  })();
  return handlerP;
}
async function fragaClaude(b64) {
  const handler = await laddaHandler(), t0 = Date.now();
  return new Promise(resolve => {
    const klar = (status, j) => resolve({ status, j, ms: Date.now() - t0 });
    const res = { statusCode: 200, setHeader() {}, status(c) { this.statusCode = c; return this; },
      json(o) { klar(this.statusCode, o); return this; }, send(d) { klar(this.statusCode, typeof d === 'string' ? { text: d } : d); return this; },
      end() { klar(this.statusCode, null); return this; } };
    Promise.resolve(handler({ method: 'POST', headers: { host: 'localhost' }, body: { mode: 'lek', image: b64 } }, res))
      .catch(e => klar(500, { error: 'handlern kastade: ' + (e && e.message) }));
  });
}

/* Cachen: en fil per foto, beskärning och nyckel, med alla svar som lästs. */
function nyckelAv(f, lage, b) {
  const delar = { foto: b.fotoSha, lage, box: Object.fromEntries(Object.entries(b.box).map(([k, v]) => [k, +(+v).toFixed(4)])),
    duk: `${b.w}x${b.h}`, q: b.q, besk: BESK_KOD_SHA, modell: MODELL, promptv: PROMPTV, lekblock: LEKBLOCK };
  return { delar, id: sha(JSON.stringify(delar)).slice(0, 12) };
}
const cacheFil = (f, lage, id) => path.join(SVARMAPP, `${f.replace(/\.\w+$/, '')}.${lage}.${id}.json`);
function lasCache(f, lage, id) { try { return JSON.parse(fs.readFileSync(cacheFil(f, lage, id), 'utf8')); } catch (e) { return null; } }
/* Vilket svar som används när ett foto lästs flera gånger: det första, så
   att baslinjen står still när några foton läses om för att mäta spridningen.
   Ett foto som läses om i DEN HÄR körningen (--las-om) visas med sitt nya
   svar. --svar sista|N väljer ett annat för alla. */
function valjSvar(c, nytt) {
  if (!c || !c.svar || !c.svar.length) return null;
  const val = nytt ? 'sista' : SVARVAL;
  const i = val === 'forsta' ? 0 : val === 'sista' ? c.svar.length - 1 : Math.min(c.svar.length, Math.max(1, +val)) - 1;
  return Object.assign({ nr: i + 1, av: c.svar.length }, c.svar[i]);
}

/* ══ Scryfall: appens lookup, med svaren sparade ════════════════════════ */
const SF_FIL = path.join(SVARMAPP, 'scryfall.json');
let sfCache = {}; try { sfCache = JSON.parse(fs.readFileSync(SF_FIL, 'utf8')); } catch (e) {}
const sfRakna = { natet: 0, cache: 0, spärr: 0 };
const OVERGAENDE = new Set([408, 425, 429, 500, 502, 503, 504]);
/* Scryfall spärrar i 60 s den som går över ~10 anrop i sekunden (429, med
   Retry-After), och varnar för en blockering av nätet om det fortsätter.
   Appens kö (SF, 95 ms mellan anropen) ligger precis på gränsen: första
   körningen 2026-09-26 fick 429 på 8 av 36 namn, och de blev platshållare —
   provet mätte Scryfalls spärr i stället för avläsningen. Här går nätanropen
   därför högst ett per SF_TAKT ms, och ett 429 väntas ut och görs om (högst
   tre gånger) innan svaret lämnas till appens kod. Avbrottssignalen (SF:s
   12 s) skickas inte vidare: väntan på spärren ska inte bli "no connection".
   Hur många gånger spärren slog till står i utskriften. */
const SF_TAKT = 250;
let sfSenast = 0;
async function sfFetch(url, opt = {}) {
  const k = opt.method === 'POST' ? url + ' ' + opt.body : url;
  let e = sfCache[k];
  if (e) sfRakna.cache++;
  else {
    if (BARA_CACHE) throw new TypeError('--bara-cache: ' + url + ' finns inte i cachen');
    for (let forsok = 0; ; forsok++) {
      const vant = SF_TAKT - (Date.now() - sfSenast);
      if (vant > 0) await vanta(vant);
      sfSenast = Date.now();
      const r = await fetch(url, { method: opt.method || 'GET', body: opt.body,
        headers: Object.assign({}, opt.headers, { 'User-Agent': 'Mesa-lekgolden/1 (MES-289)' }) });
      e = { status: r.status, body: await r.text() };
      sfRakna.natet++;
      if (r.status !== 429 || forsok >= 3) break;
      sfRakna.spärr++;
      const s = Math.min(90, Math.max(5, +r.headers.get('retry-after') || 60));
      process.stdout.write(`  (Scryfall: 429 — väntar ${s} s)\n`);
      await vanta(s * 1000 + 500);
    }
    /* Ett övergående fel (429, 5xx) sparas inte — det säger inget om namnet. */
    if (!OVERGAENDE.has(e.status)) sfCache[k] = e;
  }
  return { ok: e.status >= 200 && e.status < 300, status: e.status, json: async () => JSON.parse(e.body) };
}
const UPPSLAG = new Function('sfFetch', `const fetch = (...a) => sfFetch(...a);
const LS = { get: (k, d) => d, set: () => true, del: () => {} }, K = { cards: 'c', alias: 'a' };
${UPPSLAG_KOD}
return { lookup, imgOf };`)(sfFetch);

/* ══ Telefonens avläsning av ett foto, och ett set som Photo 1, 2 … ════ */
function laddaTelefon(ctx) {
  const miljo = `
const MANA_ORD = ['W', 'U', 'B', 'R', 'G', 'C'];
const lekKortData = () => null;
const telfoto = ctx.telfoto;
const aiEnabled = () => true;
const AI_ENDPOINT = '/api/identify';
const fetch = (...a) => ctx.aiFetch(...a);
const bokforDatorAi = () => {};
const lekKallDuk = () => ({ width: 1, height: 1 });     // beskärningen är redan gjord i Chrome
const lekB64 = () => ({ b64: ctx.b64 });
const lekRemsa = (x, y) => 'remsa:' + x + ',' + y;      // remsan är bara till för ögat
const lookup = n => ctx.lookup(n);
const imgOf = (...a) => ctx.imgOf(...a);
const lekKanalSag = () => {};
const telfotoSteg = s => { telfoto.steg = s; };
const lekSpara = (...a) => ctx.lekSpara(...a);
const lekHamtaRad = (...a) => ctx.lekHamtaRad(...a);
const uid = () => ctx.uid();
`;
  return new Function('ctx', miljo + LEK_KOD + '\nreturn { telfotoLas, lekSlagSummor, lekSpelAntal };')(ctx);
}

async function spela(foton, lage, avl, svarFor) {
  let klocka = 1000, n = 0;
  const ctx = { telfoto: {}, svar: null, b64: null, lookup: UPPSLAG.lookup, imgOf: UPPSLAG.imgOf,
    uid: () => 'g' + String(++n).padStart(5, '0') };
  ctx.server = { rad: { id: 'lek', namn: 'Lekgolden', kort: [], farger: [], antal: 0, ts: klocka } };
  ctx.lekSpara = async (id, data) => { ctx.server.rad = Object.assign({}, ctx.server.rad, kopia(data), { ts: ++klocka }); return { ok: true, rad: kopia(ctx.server.rad) }; };
  ctx.lekHamtaRad = async () => kopia(ctx.server.rad);
  ctx.aiFetch = async () => { const s = ctx.svar; return { ok: s.status >= 200 && s.status < 300, status: s.status, json: async () => kopia(s.j) }; };
  const tel = laddaTelefon(ctx);
  Object.assign(ctx.telfoto, { id: 'lek', bas: kopia(ctx.server.rad), namn: 'Lekgolden', steg: 'ansluten', foto: 1, sista: null, fel: '', laser: false, osparat: null });
  const steg = [];
  for (const f of foton) {
    const b = avl.get(f + '|' + lage), s = b && svarFor(f, lage);
    if (!s) { steg.push({ foto: f, saknas: true }); continue; }
    ctx.svar = s; ctx.b64 = b.b64; ctx.telfoto.sista = null; ctx.telfoto.fel = '';
    await tel.telfotoLas({ canvas: {}, box: b.box, hogar: HOGAR });
    steg.push({ foto: f, steg: ctx.telfoto.steg, fel: ctx.telfoto.fel, sista: ctx.telfoto.sista, svar: s });
  }
  const kort = ctx.server.rad.kort || [];
  return { kort, alla: tel.lekSlagSummor(kort).main, spelbara: tel.lekSpelAntal(kort), steg };
}

/* ══ Domen ══════════════════════════════════════════════════════════════ */
/* Rätt: per namn, min(facit, Mesa). Saknas: facit − rätt. Extra: fler av ett
   namn i leken än facit har (dubbletter, eller ett kort som inte ligger i
   fotot); varav kant: av dem, namn ur grupper som bara syns kapade vid
   fotots kant. Fel namn: ett namn som inte finns i leken alls. Oläsliga:
   platshållarna (titelraden gick inte att läsa, eller namnet att slå upp).
   Osäkra: kort med namn under To check (modellen tvekade, eller Scryfall
   rättade namnet). */
function doma(r, facit, kant) {
  const mesa = new Map(), sakra = new Map(); let olasliga = 0, osakra = 0;
  for (const k of r.kort) {
    if (k.sb) continue;
    const n = Number(k.n) || 1;
    if (k.okand) { olasliga += n; continue; }
    mesa.set(k.name, (mesa.get(k.name) || 0) + n);
    if (k.koll) osakra += n; else sakra.set(k.name, (sakra.get(k.name) || 0) + n);
  }
  let ratt = 0, saknas = 0, extra = 0, kantN = 0, felNamn = 0, felSakra = 0;
  const saknade = [], extras = [], fela = [];
  for (const [n, f] of facit) { const m = mesa.get(n) || 0; ratt += Math.min(f, m); if (m < f) { saknas += f - m; saknade.push(`${f - m} ${n}`); } }
  for (const [n, m] of mesa) {
    const over = m - (facit.get(n) || 0);
    if (over <= 0) continue;
    /* Ett fel namn utan To check är det värsta: det går rakt in i leken. */
    if (!LEKEN.has(n)) { felNamn += over; felSakra += sakra.get(n) || 0; fela.push(`${over} ${n}${sakra.get(n) ? ' (utan koll)' : ''}`); continue; }
    extra += over; extras.push(`${over} ${n}`);
    kantN += Math.min(over, (kant && kant.get(n)) || 0);
  }
  const svaren = r.steg.filter(s => s.svar).map(s => s.svar.j || {});
  const poster = svaren.reduce((a, j) => a + (Array.isArray(j.kort) ? j.kort.length : 0), 0);
  const tomma = svaren.reduce((a, j) => a + (Array.isArray(j.kort) ? j.kort.filter(k => !k.namn).length : 0), 0);
  const otydliga = svaren.reduce((a, j) => a + (+j.otydliga || 0), 0);
  const felsteg = r.steg.filter(s => s.steg === 'fel').map(s => `${s.foto}: ${s.fel}`);
  const saknasSvar = r.steg.filter(s => s.saknas).map(s => s.foto);
  return { facit: summa(facit), alla: r.alla, spelbara: r.spelbara, ratt, saknas, extra, kant: kantN, felNamn, felSakra, olasliga, osakra,
    poster, tomma, otydliga, felsteg, saknasSvar, lista: { saknade, extras, fela } };
}

/* ══ Utskriften ═════════════════════════════════════════════════════════ */
function tabell(kol, rader) {
  const b = kol.map((k, i) => Math.max(k.length, ...rader.map(r => String(r[i]).length)));
  const rad = r => '  ' + r.map((c, i) => String(c).padEnd(b[i] + 2)).join('').trimEnd();
  console.log(rad(kol)); for (const r of rader) console.log(rad(r));
}
const MATT = ['ratt', 'saknas', 'extra', 'felNamn', 'olasliga'];
const HOGT_AR_BRA = { ratt: true };
const var_ = (m, g, k) => g && g[k] != null && g[k] !== m[k] ? ` (var ${g[k]})` : '';
/* Nycklarna är 'foto-05', inte '05': ett heltalslikt namn ('10') sorteras
   före de andra i ett JS-objekt, och tabellen kom i fel ordning. */
const fotoId = f => f.replace(/\.\w+$/, '');
const kortnamn = f => fotoId(f).replace('foto-', '');
const fotoMatchar = (f, p) => [fotoId(f), kortnamn(f), f].includes(p);

(async () => {
  const facitFel = provaFacit();
  if (facitFel.length) { console.error('Facit stämmer inte — rätta ' + path.join(MAPP, 'facit.json') + ' först:\n  ' + facitFel.join('\n  ')); process.exit(2); }
  const fotoOk = f => !FOTO_VAL || FOTO_VAL.some(p => fotoMatchar(f, p));
  const foton = Object.keys(FACIT.foton).filter(fotoOk).sort();
  const seten = Object.entries(FACIT.set).filter(([s, v]) => (!SET_VAL || SET_VAL.some(p => s.startsWith(p))) && v.foton.every(fotoOk));
  if (!foton.length) { console.error('Inga foton valda.'); process.exit(2); }

  /* 1. beskärningen, i Chrome */
  process.stdout.write(`beskär ${foton.length} foton × ${LAGEN.join('+')} i Chrome (telefonens kod)…`);
  const { ut: avl, version } = await beskar(foton);
  console.log(' klart.');

  /* 2. Claude — ur cachen, eller ett nytt anrop */
  const omlas = f => LAS_OM === 'alla' || (LAS_OM && lista(LAS_OM).some(p => fotoMatchar(f, p)));
  const cacher = new Map(), jobb = [];
  for (const f of foton) for (const lage of LAGEN) {
    const b = avl.get(f + '|' + lage), nyckel = nyckelAv(f, lage, b);
    b.nyckel = nyckel;
    const c = lasCache(f, lage, nyckel.id);
    cacher.set(f + '|' + lage, c);
    if (!c || omlas(f)) jobb.push([f, lage]);
  }
  let nyaAnrop = 0; const anropsFel = [];
  if (jobb.length && BARA_CACHE) console.log(`--bara-cache: ${jobb.length} läsningar saknas i cachen och hoppas över.`);
  else if (jobb.length) {
    console.log(`Claude (${MODELL}, läget 'lek', systemprompt v${PROMPTV}): ${jobb.length} läsningar, ${PARALLELLT} åt gången — riktiga anrop, kostar pengar.`);
    fs.mkdirSync(SVARMAPP, { recursive: true });
    let klara = 0; const antal = jobb.length;
    const arbetare = async () => {
      for (let jb; (jb = jobb.shift());) {
        const [f, lage] = jb, b = avl.get(f + '|' + lage);
        let r = await fragaClaude(b.b64);
        /* 429 och 5xx är övergående: en gång till efter en paus. */
        if (r.status === 429 || r.status >= 500) { await vanta(8000); r = await fragaClaude(b.b64); }
        klara++; nyaAnrop++;
        const j = r.j || {};
        console.log(`  ${String(klara).padStart(2)}/${antal}  ${f} ${lage.padEnd(4)}  ${r.status}  ${(r.ms / 1000).toFixed(0).padStart(3)} s  ${Array.isArray(j.kort) ? j.kort.length + ' poster' : (j.error || j.varfor || '?')}`);
        if (r.status !== 200) { anropsFel.push(`${f} ${lage}: ${r.status} ${j.error || ''}`); continue; }
        const c = lasCache(f, lage, b.nyckel.id) || { nyckel: b.nyckel.delar, svar: [] };
        c.svar.push({ tid: new Date().toISOString(), ms: r.ms, bildSha: b.bildSha, status: r.status, j });
        fs.writeFileSync(cacheFil(f, lage, b.nyckel.id), JSON.stringify(c, null, 1));
        cacher.set(f + '|' + lage, c);
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLELLT, jobb.length) }, arbetare));
  }
  const svarFor = (f, lage) => valjSvar(cacher.get(f + '|' + lage), omlas(f) && !BARA_CACHE);
  const bytesAndrade = [];
  for (const [k, c] of cacher) { const s = svarFor(...k.split('|')), b = avl.get(k); if (s && s.bildSha && s.bildSha !== b.bildSha) bytesAndrade.push(k.replace('|', ' ')); }

  /* 3. varje foto för sig, och seten */
  const res = { foton: {}, set: {} };
  for (const lage of LAGEN) {
    res.foton[lage] = {}; res.set[lage] = {};
    for (const f of foton) {
      const r = await spela([f], lage, avl, svarFor);
      const b = avl.get(f + '|' + lage), s = svarFor(f, lage);
      const d = doma(r, multi(grupperna(FACIT.foton[f].hela)), multi(grupperna(FACIT.foton[f].kant)));
      Object.assign(d, { duk: `${b.w}×${b.h}`, q: b.q, lampan: b.dom.kod, box: b.box, svarNr: s ? `${s.nr}/${s.av}` : '–',
        ms: s ? s.ms : null, usage: s && s.j && s.j.usage, modell: s && s.j && s.j.modell, promptv: s && s.j && s.j.promptv });
      res.foton[lage][fotoId(f)] = d;
    }
    for (const [s, v] of seten) {
      const r = await spela(v.foton, lage, avl, svarFor);
      res.set[lage][s] = doma(r, multi(grupperna(v.foton.flatMap(f => FACIT.foton[f].hela))), null);
      res.set[lage][s].foton = v.foton.map(kortnamn).join('+');
    }
  }
  fs.mkdirSync(SVARMAPP, { recursive: true });
  fs.writeFileSync(SF_FIL, JSON.stringify(sfCache));

  /* 4. tabellerna */
  let bas = null; try { bas = JSON.parse(fs.readFileSync(BASFIL, 'utf8')); } catch (e) {}
  const g = (del, lage, id) => bas && bas[del] && bas[del][lage] && bas[del][lage][id];
  const cell = (m, gm, k, fmt) => (fmt ? fmt(m) : m[k]) + var_(m, gm, k);
  const felCell = m => m.felNamn + (m.felSakra ? ` (${m.felSakra} utan koll)` : '');
  for (const lage of LAGEN) {
    const namn = lage === 'hela' ? 'HELA — filväljarens väg, rutan {.02,.02,.96,.96}' : `RAM — kamerans ram (telfotoRamBox) på en ${SKARM_B}×${SKARM_H}-skärm, fotot som video`;
    console.log(`\n══ ${namn} ══`);
    console.log('\nSeten (fotona spelas upp i ordning på en tom lek, som Photo 1, Photo 2 …):');
    tabell(['Set', 'Foton', 'Facit', 'Mesa (spelbara)', 'Rätt', 'Saknas', 'Extra', 'Fel namn', 'Oläsliga', 'Osäkra', 'Poster', 'Otydl'],
      Object.entries(res.set[lage]).map(([s, m]) => { const gm = g('set', lage, s); return [s, m.foton, m.facit, cell(m, gm, 'alla', m => `${m.alla} (${m.spelbara})`), cell(m, gm, 'ratt'), cell(m, gm, 'saknas'), cell(m, gm, 'extra'),
        cell(m, gm, 'felNamn', felCell), cell(m, gm, 'olasliga'), cell(m, gm, 'osakra'), m.poster, m.otydliga]; }));
    console.log('\nVarje foto för sig, mot fotots hela grupper (kant räknas inte):');
    tabell(['Foto', 'Duk', 'Lampan', 'Facit', 'Poster (tomma)', 'Otydl', 'Mesa (spelbara)', 'Rätt', 'Saknas', 'Extra (kant)', 'Fel namn', 'Oläsliga', 'Osäkra', 'Svar', 'Tid'],
      Object.entries(res.foton[lage]).map(([f, m]) => { const gm = g('foton', lage, f); return [f, m.duk, m.lampan, m.facit, `${m.poster} (${m.tomma})`, m.otydliga, cell(m, gm, 'alla', m => `${m.alla} (${m.spelbara})`),
        cell(m, gm, 'ratt'), cell(m, gm, 'saknas'), cell(m, gm, 'extra', m => `${m.extra} (${m.kant})`), cell(m, gm, 'felNamn', felCell), cell(m, gm, 'olasliga'), cell(m, gm, 'osakra'), m.svarNr, m.ms ? Math.round(m.ms / 1000) + ' s' : '–']; }));
    const fel = [...Object.entries(res.set[lage]).flatMap(([s, m]) => m.felsteg.map(t => `${s} ${t}`)), ...Object.entries(res.foton[lage]).flatMap(([, m]) => m.saknasSvar.map(t => t + ': inget svar i cachen'))];
    if (fel.length) console.log('\n  Telefonens felskärm eller inget svar:\n    ' + [...new Set(fel)].join('\n    '));
    if (DETALJ) {
      for (const [del, rs] of [['set', res.set[lage]], ['foto', res.foton[lage]]]) for (const [id, m] of Object.entries(rs)) {
        const l = m.lista;
        if (!l.saknade.length && !l.extras.length && !l.fela.length) continue;
        console.log(`\n  ${del} ${id}: ` + [l.saknade.length && 'saknas ' + l.saknade.join(', '), l.extras.length && 'extra ' + l.extras.join(', '), l.fela.length && 'FEL NAMN ' + l.fela.join(', ')].filter(Boolean).join(' · '));
      }
    }
  }

  /* 5. summeringen */
  const tot = (rs, k) => Object.values(rs).reduce((a, m) => a + (m[k] || 0), 0);
  const totalt = rs => Object.fromEntries(['facit', 'alla', 'spelbara', 'ratt', 'saknas', 'extra', 'kant', 'felNamn', 'felSakra', 'olasliga', 'osakra'].map(k => [k, tot(rs, k)]));
  const exakt = rs => Object.values(rs).filter(m => m.ratt === m.facit && m.alla === m.facit).length;
  console.log('\n══ Summering ══');
  const rader = [];
  const gTot = (del, lage) => bas && bas[del] && bas[del][lage] ? totalt(bas[del][lage]) : null;
  for (const lage of LAGEN) for (const del of ['set', 'foton']) {
    const t = totalt(res[del][lage]), gt = gTot(del, lage), n = Object.keys(res[del][lage]).length;
    if (!n) continue;
    rader.push([`${lage} · ${del === 'set' ? n + ' set' : n + ' foton'}`, t.facit, `${t.alla} (${t.spelbara})`, `${t.ratt}/${t.facit}` + var_(t, gt, 'ratt'), t.saknas + var_(t, gt, 'saknas'),
      (del === 'foton' ? `${t.extra} (${t.kant})` : t.extra) + var_(t, gt, 'extra'), felCell(t) + var_(t, gt, 'felNamn'), t.olasliga + var_(t, gt, 'olasliga'), t.osakra + var_(t, gt, 'osakra'),
      del === 'set' ? `${exakt(res.set[lage])}/${n}` : '']);
  }
  tabell(['', 'Facit', 'Mesa (spelbara)', 'Rätt', 'Saknas', 'Extra', 'Fel namn', 'Oläsliga', 'Osäkra', 'Exakt rätt'], rader);
  console.log('\n  Facit: korten som ska in. Mesa: kort i leken efteråt, med platshållarna; (spelbara) utan dem = decks.antal.');
  console.log('  Rätt: per namn min(facit, Mesa). Saknas: facit − rätt. Extra: fler av ett namn än facit (dubbletter, kort ur ett annat foto);');
  console.log('  (kant): av dem, namn ur grupper som bara syns kapade vid fotots kant. Fel namn: ett kort som inte finns i leken (ska vara 0);');
  console.log('  (utan koll): av dem, kort som inte står under To check — de går rakt in i leken, det värsta felet.');
  console.log('  Oläsliga: platshållare (Unreadable card) — titelraden gick inte att läsa eller namnet att slå upp. Osäkra: kort med namn under To check.');
  console.log('  Poster: kort i Claudes svar (tomma: utan namn). Otydl: kort Claude såg men inte tog med. Lampan: telefonens dom om duken (lekDomAv).');
  console.log('  Exakt rätt: set där leken blev precis facit — alla kort rätt, inga extra, inga platshållare. (var N): baslinjens tal.');

  /* metod och kostnad */
  const anvanda = [...new Set(foton.flatMap(f => LAGEN.map(l => svarFor(f, l)).filter(Boolean)))];
  const tin = anvanda.reduce((a, s) => a + ((s.j.usage || {}).input_tokens || 0), 0), tut = anvanda.reduce((a, s) => a + ((s.j.usage || {}).output_tokens || 0), 0);
  const modeller = [...new Set(anvanda.map(s => s.j.modell).filter(Boolean))], pv = [...new Set(anvanda.map(s => s.j.promptv).filter(v => v != null))];
  const pris = PRIS[modeller[0] || MODELL];
  const tider = anvanda.map(s => s.ms).filter(Boolean).sort((a, b) => a - b);
  console.log(`\n  metod: lekfoto — Claude ${modeller.join(', ') || MODELL} via api/identify.js i läget 'lek', systemprompt v${pv.join(', ') || PROMPTV} (lekblocket ${LEKBLOCK})`
    + `\n         beskärning: telefonens lekKallDuk/lekB64/telfotoRamBox (kod ${BESK_KOD_SHA}) i ${version} · avläsning: telfotoLas + lekSparaKo i Node · uppslagning: appens lookup mot Scryfall`
    + `\n         facit ${FACIT_SHA} · ${foton.length} foton × ${LAGEN.length} beskärningar = ${anvanda.length} svar (${SVARVAL === 'forsta' ? 'det första' : SVARVAL === 'sista' ? 'det senaste' : 'svar ' + SVARVAL} per foto${LAS_OM ? ', det nya för de omlästa' : ''})`);
  if (pv.length && !pv.includes(PROMPTV)) console.log(`  OBS: svaren kom från systemprompt v${pv.join(', ')}, api/identify.js säger nu v${PROMPTV}.`);
  if (bas && (bas.promptv !== PROMPTV || bas.modell !== (modeller[0] || MODELL) || bas.lekblock !== LEKBLOCK)) console.log(`  OBS: baslinjen gjordes med ${bas.modell}, systemprompt v${bas.promptv} (lekblocket ${bas.lekblock}).`);
  if (bas && bas.facit !== FACIT_SHA) console.log(`  OBS: baslinjen gjordes mot ett annat facit (${bas.facit}).`);
  console.log(`  Claude: ${nyaAnrop} nya anrop i den här körningen${anropsFel.length ? ', ' + anropsFel.length + ' misslyckades' : ''}. Svaren som används: ${anvanda.length} anrop, ${tin} tokens in / ${tut} ut`
    + (pris ? ` ≈ $${((tin * pris[0] + tut * pris[1]) / 1e6).toFixed(2)} om allt läses om` : '')
    + (tider.length ? `; svarstid median ${Math.round(tider[tider.length >> 1] / 1000)} s, längst ${Math.round(tider[tider.length - 1] / 1000)} s.` : '.'));
  console.log(`  Scryfall: ${sfRakna.natet} anrop mot nätet${sfRakna.spärr ? ` (varav ${sfRakna.spärr} spärrade med 429 och gjorda om)` : ''}, ${sfRakna.cache} ur cachen (${SF_FIL.replace(ROT + '/', '')}).`);
  if (anropsFel.length) console.log('  Misslyckade anrop:\n    ' + anropsFel.join('\n    '));
  if (bytesAndrade.length) console.log(`  OBS: duken som skickades nu skiljer sig i bytes från den som lästes (${bytesAndrade.join(', ')}) — samma kod och mått, men kodaren gav andra bytes. Svaret gäller ändå samma beskärning.`);

  /* --spridning: fotona med fler än ett svar, svar för svar */
  if (SPRIDNING) {
    console.log('\n══ Spridning: samma foto, flera läsningar ══');
    const sr = [];
    for (const f of foton) for (const lage of LAGEN) {
      const c = cacher.get(f + '|' + lage);
      if (!c || c.svar.length < 2) continue;
      const namnAv = j => multi((j.kort || []).map(k => k.namn || '(tomt)'));
      const forsta = namnAv(c.svar[0].j);
      for (let i = 0; i < c.svar.length; i++) {
        const s = Object.assign({ nr: i + 1, av: c.svar.length }, c.svar[i]);
        const r = await spela([f], lage, avl, () => s);
        const d = doma(r, multi(grupperna(FACIT.foton[f].hela)), multi(grupperna(FACIT.foton[f].kant)));
        const m = namnAv(s.j); let skiljer = 0;
        for (const n of new Set([...m.keys(), ...forsta.keys()])) skiljer += Math.abs((m.get(n) || 0) - (forsta.get(n) || 0));
        sr.push([`${fotoId(f)} ${lage}`, `${i + 1}/${c.svar.length}`, s.tid.slice(0, 16), (s.j.kort || []).length, d.ratt + '/' + d.facit, d.saknas, `${d.extra} (${d.kant})`, d.felNamn, d.olasliga, d.osakra, i ? skiljer : '–']);
      }
    }
    if (sr.length) tabell(['Foto', 'Svar', 'Läst', 'Poster', 'Rätt', 'Saknas', 'Extra (kant)', 'Fel namn', 'Oläsliga', 'Osäkra', 'Poster som skiljer från svar 1'], sr);
    else console.log('  Inget foto har fler än ett svar i cachen — läs om några med --las-om 09,13.');
  }

  /* 6. domen mot baslinjen, och --spara */
  let samre = false;
  if (bas) {
    console.log('\n  Mot baslinjen (' + (bas.datum || '?') + '):');
    for (const lage of LAGEN) for (const del of ['set', 'foton']) {
      const t = totalt(res[del][lage]), gt = gTot(del, lage);
      if (!gt) continue;
      const battre = MATT.filter(k => HOGT_AR_BRA[k] ? t[k] > gt[k] : t[k] < gt[k]), varre = MATT.filter(k => HOGT_AR_BRA[k] ? t[k] < gt[k] : t[k] > gt[k]);
      const dom = !battre.length && !varre.length ? 'LIKA BRA' : !varre.length ? 'BÄTTRE' : !battre.length ? 'SÄMRE' : 'BLANDAT';
      if (varre.length) samre = true;
      console.log(`    ${lage} · ${del}: ${dom}` + (battre.length || varre.length ? ' — ' + [...battre, ...varre].map(k => `${k} ${gt[k]} → ${t[k]}`).join(', ') : ''));
    }
  }
  if (SPARA) {
    if (anropsFel.length || BARA_CACHE && jobb.length) { console.log('\n  --spara vägras: alla foton har inte ett svar.'); process.exit(2); }
    const ren = rs => Object.fromEntries(Object.entries(rs).map(([id, m]) => [id, Object.fromEntries(Object.entries(m).filter(([k]) => !['lista', 'felsteg', 'saknasSvar', 'usage', 'box'].includes(k)))]));
    const ny = { datum: new Date().toISOString().slice(0, 16).replace('T', ' '), modell: modeller[0] || MODELL, promptv: pv[0] != null ? pv[0] : PROMPTV, lekblock: LEKBLOCK,
      besk: BESK_KOD_SHA, facit: FACIT_SHA, skarm: `${SKARM_B}x${SKARM_H}`, svar: SVARVAL,
      foton: Object.assign({}, bas && bas.foton, Object.fromEntries(LAGEN.map(l => [l, ren(res.foton[l])]))),
      set: Object.assign({}, bas && bas.set, Object.fromEntries(LAGEN.map(l => [l, ren(res.set[l])]))) };
    fs.writeFileSync(BASFIL, JSON.stringify(ny, null, 1) + '\n');
    console.log(`\n  Sparat som baslinje: ${path.relative(ROT, BASFIL)} — skriv en rad i dev/lekgolden/historik.md.`);
  }
  process.exit(samre && !SPARA ? 1 : 0);
})().catch(e => { console.error('\nlekgolden: ' + (e && e.stack || e)); process.exit(2); });

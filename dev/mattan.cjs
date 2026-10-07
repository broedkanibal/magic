#!/usr/bin/env node
/* Mattan behåller sina element (MES-334 steg 2).

   Kör:  node dev/mattan.cjs            bänken (dev/kolla.sh): identiteten genom avstamBord
         node dev/mattan.cjs --tid      tiden för en mattuppdatering med 40 kort
         node dev/mattan.cjs --tid --fil /tmp/fore.html   samma tid mot en annan index.html
         node dev/mattan.cjs --visa     ett fönster i stället för huvudlös Chrome
         node dev/mattan.cjs --film <mapp>   rutor ur en flytt och en tap (JPEG), med
                                        animeringarna stoppade på 0, 60, 120 … 420 ms

   Appen själv i en huvudlös Chrome, utan telefon och utan inloggning (minnet
   "kamerans datorsida provas utan telefon"): ett spel i Mirror my table med
   kameran ansluten, och telefonens bord matas in genom avstamBord som när
   rapporterna kommer. Provet räknar elementen före och efter varje
   uppdatering — ett kort som flyttas eller tappas ska vara SAMMA element, och
   glida eller vridas dit (animeringarna på translate och rotate) i stället
   för att byggas om. Samma för en motståndares matta (fjarrBord) och för en
   hög, som är en post med egen nyckel i matSynk (grunden för steg 3–5).
   Ett klick på ett återanvänt element ska ge exakt en tap — lyssnarna sitter
   på brädet och får varken tappas eller dubbleras.

   Egen liten filserver på 127.0.0.1 och en port som systemet väljer, egen
   tillfällig Chrome-profil, och nätet utanför datorn spärrat (Scryfall,
   Supabase, CDN): provet rör ingen annans server eller profil, och korten
   står som namnlappar. Slutkod 1 om något faller, 2 om Chrome inte går att
   starta. .cjs eftersom package.json säger "type": "module". */
'use strict';
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os'), http = require('http');
const ROT = path.join(__dirname, '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const TID = process.argv.includes('--tid'), VISA = process.argv.includes('--visa'), FILM = arg('--film', '');
const FIL = path.resolve(arg('--fil', path.join(ROT, 'index.html')));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const vanta = ms => new Promise(r => setTimeout(r, ms));

/* Filservern: index.html (eller --fil) på /, resten ur repot. Bara läsning,
   bara 127.0.0.1, inga punktkataloger (.env.local) och inget utanför repot. */
const TYPER = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.wasm': 'application/wasm' };
function server() {
  return new Promise(res => {
    const s = http.createServer((req, ut) => {
      const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const fil = u === '/' || u === '/index.html' ? FIL : path.join(ROT, path.normalize(u));
      if (u.split('/').some(d => d.startsWith('.')) || (fil !== FIL && !fil.startsWith(ROT + path.sep))) { ut.writeHead(404); return ut.end(); }
      fs.readFile(fil, (fel, data) => {
        if (fel) { ut.writeHead(404); return ut.end(); }
        ut.writeHead(200, { 'Content-Type': TYPER[path.extname(fil)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        ut.end(data);
      });
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}

/* Chrome via DevTools-protokollet, som golden och spegelfacit. */
async function chrome() {
  if (!fs.existsSync(CHROME)) { console.error('mattan: hittar inte Chrome på ' + CHROME + ' (sätt CHROME=…)'); process.exit(2); }
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-mattan-'));
  const p = spawn(CHROME, [VISA ? '' : '--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profil, '--no-first-run',
    '--no-default-browser-check', '--window-size=1400,1000', 'about:blank'].filter(Boolean), { stdio: ['ignore', 'ignore', 'pipe'] });
  let ws = null, err = '';
  p.stderr.on('data', d => { err += d; const m = err.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) ws = m[1]; });
  const t0 = Date.now();
  while (!ws) { if (Date.now() - t0 > 15000) throw new Error('Chrome svarade inte (DevTools-porten)'); await vanta(50); }
  const port = new URL(ws).port;
  let sida = null;
  while (!sida) { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); sida = l.find(t => t.type === 'page'); if (!sida) await vanta(50); }
  const sock = new WebSocket(sida.webSocketDebuggerUrl);
  await new Promise((res, rej) => { sock.onopen = res; sock.onerror = rej; });
  let nr = 0; const svar = new Map(), konsol = [];
  sock.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && svar.has(m.id)) { svar.get(m.id)(m); svar.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') konsol.push('undantag: ' + ((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text));
  };
  const cdp = (method, params) => new Promise((res, rej) => {
    const id = ++nr; svar.set(id, m => m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result));
    sock.send(JSON.stringify({ id, method, params: params || {} }));
  });
  const stang = async () => {
    try { await cdp('Browser.close'); } catch (e) {}
    for (let i = 0; i < 40 && p.exitCode == null; i++) await vanta(50);
    if (p.exitCode == null) p.kill();
    try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {}
  };
  return { cdp, stang, konsol };
}

/* Provet i sidan. Returnerar [namn, ok, detalj]-rader. */
const PROV = async () => {
  const rad = [], ok = (namn, villkor, detalj) => rad.push([namn, !!villkor, detalj || '']);
  const vanta = ms => new Promise(r => setTimeout(r, ms));
  const els = () => new Map([...gridEl.querySelectorAll('.card[data-cid]')].map(e => [e.dataset.cid, e]));
  const gar = el => el.getAnimations().some(a => a.playState === 'running');
  const anim = el => el.getAnimations().map(a => Object.keys((a.effect.getKeyframes() || [])[0] || {}).filter(k => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)).join('+')).join(',');
  ok('sidan är synlig (annars animerar matSynk inget)', !document.hidden, document.visibilityState);

  /* Ett spel i Mirror my table, kameran ansluten, uppstarten klar. */
  visaVy('app');
  const mig = player();
  spelLage = { id: 'mattprov', kod: 'MATT01', namn: 'Prov', vard: mig.id, mig: mig.id };
  mig.lage = 'bord'; mig.cards = []; mig.pending = []; mig.plats = 1;
  state.players = [mig]; state.active = mig.id;
  oppSatt({ klar: true });
  kamAnsluten = true; kamFas = ''; kamGrund = 0; prefs.autoLage = true;
  renderAll(true);
  const spar = (id, namn, x, y, tappad) => ({ id, tillstand: 'klar', namn, saker: true, x, y, w: 0.08, h: 0.11, tappad: !!tappad, vilar: true });
  const rapport = [spar(1, 'Llanowar Elves', 0.2, 0.2), spar(2, 'Forest', 0.42, 0.2), spar(3, 'Serra Angel', 0.64, 0.2)];
  avstamBord(rapport, false);
  const f1 = els();
  ok('avstamBord lägger ut tre kort', f1.size === 3, f1.size + ' element');

  /* Ett kort flyttas och tappas, de andra ligger still. */
  const k1 = mig.cards.find(c => c.spar === 1), x0 = k1 && k1.x;
  rapport[0] = spar(1, 'Llanowar Elves', 0.3, 0.45, true);
  avstamBord(rapport, false);
  const f2 = els();
  ok('samma element genom avstamBord', f2.size === 3 && [...f1].every(([cid, el]) => f2.get(cid) === el), [...f1.keys()].filter(c => f2.get(c) !== f1.get(c)).length + ' utbytta');
  const e1 = k1 && f2.get(k1.cid);
  ok('kortet flyttade sig och tappades', !!k1 && k1.x !== x0 && k1.tapped === 1, k1 ? `x ${Math.round(x0)} → ${Math.round(k1.x)}, tapped ${k1.tapped}` : 'inget kort');
  const a1 = e1 ? anim(e1) : '';
  ok('det glider och vrids dit (translate, rotate)', /translate/.test(a1) && /rotate/.test(a1), a1 || 'inga animeringar');
  ok('kortet står redan i sitt nya läge (.tappad, left/top)', !!e1 && e1.classList.contains('tappad') && parseFloat(e1.style.left) === Math.round(k1.x), e1 ? e1.style.left + ' ' + e1.className : '');
  /* Skarp åt båda håll: det flyttade kortet rör sig, de andra inte. Mot den
     gamla koden rör sig inget alls, och då faller kontrollen. */
  const rorlig = el => el.getAnimations().some(a => a.playState === 'running' && a.effect && a.effect.getKeyframes().some(k => k.translate || k.rotate));
  const stilla = [...f2.values()].filter(el => el !== e1);
  ok('bara det flyttade kortet rör sig', !!e1 && rorlig(e1) && stilla.length === 2 && stilla.every(el => !rorlig(el)), `flyttat ${e1 ? anim(e1) : '–'} · stilla ${stilla.map(anim).join(' | ')}`);

  /* Avbrott: en ny rapport mitt i flytten börjar där kortet syns. */
  await vanta(120);
  const mitt = e1.getBoundingClientRect();
  rapport[0] = spar(1, 'Llanowar Elves', 0.2, 0.6, true);
  avstamBord(rapport, false);
  const efter = e1.getBoundingClientRect();
  /* Elementet måste sitta i sidan och ha en ruta — ett utbytt, frikopplat
     element ger 0,0 före och efter och säger ingenting. */
  ok('ett avbrott hoppar inte', e1.isConnected && mitt.width > 0 && efter.width > 0 && Math.abs(mitt.left - efter.left) < 3 && Math.abs(mitt.top - efter.top) < 3,
    `${e1.isConnected ? 'i sidan' : 'frikopplat'}, ${Math.round(mitt.left)},${Math.round(mitt.top)} → ${Math.round(efter.left)},${Math.round(efter.top)}`);
  ok('samma element efter avbrottet', els().get(k1.cid) === e1);

  /* Ett nytt kort: de gamla står kvar, ett element till. */
  rapport.push(spar(4, 'Wood Elves', 0.42, 0.6));
  avstamBord(rapport, false);
  const f3 = els();
  ok('nytt kort: ett element till, de gamla kvar', f3.size === 4 && [...f2].every(([cid, el]) => f3.get(cid) === el), f3.size + ' element');

  /* Till graveyard: elementet tas bort, de andra står kvar. */
  const k3 = mig.cards.find(c => c.spar === 3);
  flyttaTill(mig.cards.indexOf(k3), ZON_GRAV);
  const f4 = els();
  ok('till graveyard: elementet borta, de andra kvar', f4.size === 3 && !f4.has(k3.cid) && [...f4].every(([cid, el]) => f3.get(cid) === el), f4.size + ' element');

  /* Ett kort lagt för hand: ett klick på det återanvända elementet ger
     exakt en tap — brädets lyssnare finns kvar och är inte dubblerade. */
  const hk = normaliseraKort({ cid: 'mattprov-hand', name: 'Grizzly Bears', x: 700, y: 400, z: 9, tapped: 0, cts: [] }, mig.cards.length);
  mig.cards.push(hk); renderAll(true);
  const hEl = els().get(hk.cid);
  renderAll(true); renderGrid(true);
  ok('handkortet behåller sitt element genom omritningar', els().get(hk.cid) === hEl);
  const klick = typ => hEl.dispatchEvent(new PointerEvent(typ, { bubbles: true, button: 0, buttons: typ === 'pointerdown' ? 1 : 0, clientX: 10, clientY: 10, pointerId: 1, isPrimary: true }));
  klick('pointerdown'); klick('pointerup');
  ok('ett klick = en tap', hk.tapped === 1, 'tapped ' + hk.tapped);
  ok('och kortet vrids, i samma element', els().get(hk.cid) === hEl && /rotate/.test(anim(hEl)), anim(hEl));
  const tappadFore = hk.tapped;
  klick('pointerdown'); klick('pointerup');
  ok('ett klick till = untap (kortet var tappat)', tappadFore === 1 && hk.tapped === 0, `tapped ${tappadFore} → ${hk.tapped}`);

  /* Pillen över ett hovrat kort (granskning runda 4): den räknas ur kortets
     data, alltså målet. Medan kortet glider dit ska den inte stå över tom
     matta — den ritas igen när kortet landat, över kortet. */
  await vanta(500);
  matHover = hk.cid; renderPill();
  const pillFore = !!gridEl.querySelector('.pill');
  hk.x = (hk.x || 0) + 400; renderGrid(true);
  const pillUnder = gridEl.querySelector('.pill'), kortGlider = !!els().get(hk.cid) && els().get(hk.cid).getAnimations().some(a => a.playState === 'running');
  await vanta(600);
  const pillEfter = gridEl.querySelector('.pill'), kortR = els().get(hk.cid).getBoundingClientRect(), pR = pillEfter && pillEfter.getBoundingClientRect();
  const ihop = !!pR && Math.abs((pR.left + pR.right) / 2 - (kortR.left + kortR.right) / 2) < 4;
  ok('pillen hoppar inte före ett kort som glider, och står över det när det landat', pillFore && kortGlider && !pillUnder && ihop,
    `före ${pillFore}, kortet glider ${kortGlider}, pillen under glidningen ${!!pillUnder}, efter: över kortet ${ihop}`);
  matHover = null; renderPill();

  /* Lyftets skugga i ett eget lager (granskning runda 2, fynd 1): kortet
     under arket (.aktuell, strålkastaren 0 0 0 9999px) tappas och flyttas
     av kameran. Mitt i rörelsen ska strålkastaren stå kvar på kortet, och
     skuggan synas i lagret. */
  await vanta(500);
  delete k1.ny;   // det nya kortets gröna puls (nypuls, box-shadow) är inte det som provas
  ark = { cid: k1.cid, mode: 'mattprov' }; renderGrid(true);
  await vanta(300);   // .card-övergången på box-shadow (0,13 s) in i strålkastaren
  const sv = el => getComputedStyle(el).boxShadow, lagret = el => el.querySelector(':scope > .lyftskugga');
  /* Bara mattans egna rörelser (Web Animations) ställs på tiden t — inte CSS:ens övergångar och animeringar. */
  const vid = (el, t) => { for (const a of el.getAnimations({ subtree: true })) if (!(a instanceof CSSTransition) && !(a instanceof CSSAnimation)) a.currentTime = t; return { bs: sv(el), sk: lagret(el) ? +getComputedStyle(lagret(el)).opacity : -1 }; };
  const vila = sv(e1);
  rapport[0] = spar(1, 'Llanowar Elves', 0.2, 0.6, false);   // otappas
  avstamBord(rapport, false);
  const iTap = vid(e1, 120);
  await vanta(500);
  rapport[0] = spar(1, 'Llanowar Elves', 0.55, 0.3, false);  // flyttas långt
  avstamBord(rapport, false);
  const iFlytt = vid(e1, 200);
  ok('strålkastaren (.aktuell) står kvar mitt i tap och flytt, skuggan i sitt lager', /9999px/.test(vila) && /9999px/.test(iTap.bs) && /9999px/.test(iFlytt.bs) && iTap.sk > 0.3 && iFlytt.sk > 0.9,
    `vila ${/9999px/.test(vila)} · tap 120 ms ${/9999px/.test(iTap.bs) ? '9999px' : iTap.bs}, lagret ${iTap.sk} · flytt 200 ms ${/9999px/.test(iFlytt.bs) ? '9999px' : iFlytt.bs}, lagret ${iFlytt.sk}`);
  ark = null; renderGrid(true);
  await vanta(500);

  /* Farten i en kedja av avbrott (fynd 2): kameran skjuter kortet var 70:e
     ms. Före varje avbrott ska appens skattning (matFart) stämma med farten
     i den rörelse som faktiskt går — dess egen kurva, inte baskurvan. */
  const bezY = (b, x) => { const f = (t, p1, p2) => 3 * p1 * t * (1 - t) * (1 - t) + 3 * p2 * t * t * (1 - t) + t * t * t; let lo = 0, hi = 1, t = x; for (let i = 0; i < 40; i++) { t = (lo + hi) / 2; if (f(t, b[0], b[2]) < x) lo = t; else hi = t; } return f(t, b[1], b[3]); };
  const sannFart = a => {
    const tm = a.effect.getTiming(), m = /cubic-bezier\(([^)]*)\)/.exec(tm.easing || ''), kf = a.effect.getKeyframes();
    if (!m || !kf.length || !kf[0].translate) return null;
    const b = m[1].split(',').map(Number), fr = String(kf[0].translate).split(/\s+/).map(parseFloat), T = tm.duration, t = +a.currentTime || 0, e = 1;
    const u0 = Math.max(0, t - e) / T, u1 = Math.min(T, t + e) / T, dE = (bezY(b, u1) - bezY(b, u0)) / ((u1 - u0) * T);
    return [-(fr[0] || 0) * dE, -(fr[1] || 0) * dE];
  };
  const fel = [];
  for (let s = 1; s <= 6; s++) {
    await vanta(70);
    const A = e1._matA || {};
    if (s > 1 && A.pos && A.pos.playState === 'running') {
      const sann = sannFart(A.pos), skattad = typeof matFart === 'function' ? matFart(A.pos, A.posInfo) : null;
      if (sann && skattad) { const n = Math.hypot(sann[0], sann[1]); fel.push(n > 0.02 ? Math.hypot(sann[0] - skattad[0], sann[1] - skattad[1]) / n : 0); }
      else fel.push(Infinity);
    }
    rapport[0] = spar(1, 'Llanowar Elves', 0.55 + 0.025 * s, 0.3, false);
    avstamBord(rapport, false);
  }
  ok('farten i en kedja av avbrott skattas ur den kurva rörelsen går på (inom 5 %)', fel.length >= 3 && fel.every(f => f <= 0.05),
    fel.map(f => isFinite(f) ? Math.round(f * 100) + ' %' : 'saknas').join(', ') || 'inga avbrott');
  await vanta(500);

  /* Fliken i bakgrunden (fynd 4a): inget glider medan sidan är dold, inte
     heller första rapporten efteråt (en ny vy) — den andra glider igen. */
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  rapport[0] = spar(1, 'Llanowar Elves', 0.35, 0.3, false);
  avstamBord(rapport, false);
  const dold = gar(e1) || gar(gridEl);
  delete document.hidden;
  rapport[0] = spar(1, 'Llanowar Elves', 0.2, 0.3, false);
  avstamBord(rapport, false);
  const forsta = gar(e1);
  await vanta(450);
  rapport[0] = spar(1, 'Llanowar Elves', 0.42, 0.45, false);
  avstamBord(rapport, false);
  const andra = gar(e1);
  ok('fliken i bakgrunden: inget glider dold eller i första rapporten efter, den andra glider', !document.hidden && !dold && !forsta && andra, `dold ${dold}, första ${forsta}, andra ${andra}`);
  await vanta(450);

  /* Nya vyer ritas på plats (granskningen av steg 2, fynd 1): ingen zoom
     glider in efter en ritning medan mattan var dold (här), eller i ett nytt
     parti (sist). Brädets transform ska ha ändrats — annars mäts ingenting. */
  await vanta(450);
  visaVy('hem'); renderAll(true);
  const tDold = gridEl.style.transform;
  visaVy('app'); renderAll(true);
  ok('efter en ritning medan mattan var dold ritas zoomen på plats', gridEl.style.transform !== tDold && !gar(gridEl), `${tDold} → ${gridEl.style.transform}`);

  /* Mattans zoom när ett kort läggs långt ut: zoomstegen (MES-338) har
     ett eget avsnitt sist i provet, med en kamerabild av känd storlek. */

  /* En hög som post i matSynk (grunden för leken och graveyard i steg 3–5):
     egen nyckel, samma element, och den glider när läget ändras. */
  const hogHtml = (x, y) => `<div class="provhog" style="left:${x}px;top:${y}px;width:178px;height:248px;position:absolute"><span class="bricka">Library 33</span></div>`;
  /* Utan matSynk (en index.html från före steg 2, --fil) faller kontrollerna
     i stället för att provet dör, så att resten syns. */
  if (typeof matSynk !== 'function') { ok('en hög behåller sitt element och glider', false, 'matSynk finns inte'); ok('och tas bort när posten går', false, 'matSynk finns inte'); }
  else {
    const kort = [...gridEl.children].filter(el => el._mat && el._mat.nyckel.startsWith('c:')).map(el => ({ nyckel: el._mat.nyckel, html: el._mat.html, glid: true }));
    matSynk(gridEl, kort.concat([{ nyckel: 'h:prov', html: hogHtml(60, 500), glid: true }]));
    const hog = gridEl.querySelector('.provhog');
    const s1 = matSynk(gridEl, kort.concat([{ nyckel: 'h:prov', html: hogHtml(400, 520), glid: true }]));
    ok('en hög behåller sitt element och glider', gridEl.querySelector('.provhog') === hog && /translate/.test(anim(hog)) && s1.nya === 0, `nya ${s1.nya}, flyttade ${s1.flyttade}`);
    matSynk(gridEl, kort);
    ok('och tas bort när posten går', !gridEl.querySelector('.provhog'));
  }
  renderAll(true);

  /* Minskad rörelse: bara en toning (opacitet), inget lyft. */
  window.__mattLugn = true;
  const lugn = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (let i = 0; i < 100 && !lugn(); i++) await vanta(20);
  const k2 = mig.cards.find(c => c.spar === 2), e2 = els().get(k2.cid);
  rapport[1] = spar(2, 'Forest', 0.8, 0.5);
  avstamBord(rapport, false);
  const a2 = e2.getAnimations().map(a => a.effect.getKeyframes().map(k => Object.keys(k).join('/')).join(' ')).join(' | ');
  ok('minskad rörelse: toning, ingen skala', lugn() && /opacity/.test(a2) && !/scale/.test(a2) && els().get(k2.cid) === e2, a2 || 'inga');
  /* Och av igen: resten av provet mäter de vanliga rörelserna. */
  window.__mattLugn = false;
  for (let i = 0; i < 100 && lugn(); i++) await vanta(20);
  ok('minskad rörelse är av igen', !lugn());

  /* En motståndares matta: hens kort behåller sina element när hen spelar. */
  const opp = normalisera({ id: 'mattprov-opp', name: 'Sara', color: '#b782ff', plats: 2, lage: 'bord', cards: [
    { cid: 'o1', name: 'Delver of Secrets', x: 40, y: 60, z: 1, tapped: 0, cts: [] },
    { cid: 'o2', name: 'Island', x: 260, y: 330, z: 2, tapped: 0, cts: [] }], shots: [], shotIdx: 0, pending: [], pane: null, namnkalla: 'anvandare', version: 1 }, 1);
  /* En motståndare kommer med mitt i partiet (granskning runda 2, fynd 3):
     rutan runt min matta hoppar till sin nya storlek, och brädet ska inte
     glida i den — en ny layout är en ny vy. */
  mig.cards = mig.cards.filter(c => c.cid !== 'mattprov-ute'); matVyer.delete(mig.id);   // zoomen ur golvet (0,3), så att den kan ändras
  renderAll(true);
  await vanta(450);
  const tEnsam = gridEl.style.transform;
  state.players = [mig, opp]; state.active = mig.id; bord.valt = 'all';
  renderAll(true);
  ok('en motståndare kommer med: min matta ritas på plats (ingen zoom glider)', gridEl.style.transform !== tEnsam && !gar(gridEl), `${tEnsam} → ${gridEl.style.transform}`);

  /* Ett nivåbyte i bordsvyn (granskning runda 3, fynd 1): mitt kort glider
     (en flytt på 420 ms), nivån byts (tangenten 1) och kamerans nästa
     hjärtslag ritar om — kortet ska fortsätta glida, inte hoppa till slutet. */
  await vanta(600);
  hk.x = (hk.x || 0) + 400; renderGrid(true);
  const hFlytt = els().get(hk.cid), glider = el => !!el && el.getAnimations().some(a => a.playState === 'running' && a.effect && a.effect.getKeyframes().some(k => k.translate));
  const foreByte = glider(hFlytt);
  await vanta(100);
  bordValj('me');
  await vanta(50);
  renderGrid(true);
  const efterByte = glider(els().get(hk.cid)) && els().get(hk.cid) === hFlytt;
  ok('ett nivåbyte i bordsvyn avbryter inte ett kort som glider', foreByte && efterByte, `glider före bytet ${foreByte}, efter hjärtslaget ${efterByte}`);
  bordValj('all');
  await vanta(650);
  const oEls = () => new Map([...document.querySelectorAll('#oppMattor .obrade .card[data-cid]')].map(e => [e.dataset.cid, e]));
  const o1 = oEls();
  const kopia = opp.cards.map(c => Object.assign({}, c));
  kopia[0].x += 160; kopia[0].tapped = 1;
  fjarrBord({ game_id: spelLage.id, user_id: opp.id, kort: kopia, version: 2 });
  const o2 = oEls(), oe = o2.get('o1');
  ok('motståndarens kort behåller sina element (fjarrBord)', o1.size === 2 && [...o1].every(([cid, el]) => o2.get(cid) === el), o1.size + ' före, ' + o2.size + ' efter');
  ok('och hens flytt glider', !!oe && /translate/.test(anim(oe)), oe ? anim(oe) : '');

  /* Dold information (MES-305): hen vänder kortet. Raden kommer utan namn,
     som slimDelat skickar den — och samma element får inte bära namnet kvar
     någonstans (text, aria-label, alt, bild). */
  ok('före vändningen bär elementet namnet (provet mäter något)', !!oe && oe.outerHTML.includes('Delver'));
  const vand = kopia.map(c => Object.assign({}, c));
  delete vand[0].name; delete vand[0].sid; vand[0].flipped = 1;
  fjarrBord({ game_id: spelLage.id, user_id: opp.id, kort: vand, version: 3 });
  const o3 = oEls(), ve = o3.get('o1'), img = ve && ve.querySelector('img');
  ok('vänt kort: samma element, inget namn kvar', ve === oe && !ve.outerHTML.includes('Delver') && String(ve.getAttribute('aria-label')).startsWith(DOLD_NAMN) && !!img && img.src === BAKSIDA,
    ve ? `${ve.getAttribute('aria-label')} · baksidan ${!!img && img.src === BAKSIDA} · namnet i elementet ${ve.outerHTML.includes('Delver')}` : 'inget element');

  await vanta(500);
  const tParti = gridEl.style.transform, oBrade = document.querySelector('#oppMattor .obrade'), oParti = oBrade && oBrade.style.transform;
  spelLage = Object.assign({}, spelLage, { id: 'mattprov-2' });
  oppSatt({ klar: true });
  mig.cards = [normaliseraKort({ cid: 'mattprov-n1', name: 'Plains', x: 60, y: 70, z: 1, tapped: 0, cts: [] }, 0)];
  matVyer.delete(mig.id);   // brädet räknas om för det nya partiets kort, så att zoomen säkert ändras
  opp.cards = [normaliseraKort({ cid: 'o9', name: 'Island', x: 900, y: 700, z: 1, tapped: 0, cts: [] }, 0)];
  renderAll(true);
  const oNy = document.querySelector('#oppMattor .obrade');
  ok('ett nytt parti ritas på plats (ingen zoom glider in, inte heller hos motståndaren)',
    gridEl.style.transform !== tParti && !gar(gridEl) && !!oNy && oNy.style.transform !== oParti && !gar(oNy),
    `min ${tParti} → ${gridEl.style.transform}; hens ${oParti} → ${oNy && oNy.style.transform}`);

  /* ── Zoomsteg (MES-338) ───────────────────────────────────────────────
     Mitt speglade bord zoomar i fasta steg: 100 %, 86 %, 75 % och 65 % av
     bordets 100 %, och sist golvet — hela kamerabilden (dev/plan/
     spegelmattan-principer.md, Mattan: zoomsteg; prototypens zoomFor). Ett
     kort som inte får plats ger ett steg ut som glider 500 ms (UT), till den
     första nivån där korten ryms med ungefär två kort till åt det håll bordet
     växte. Aldrig in av sig själv — bara i ett nytt parti. Ensam vid bordet
     (100 % = zoom 1). Kamerabilden 16:9 och ett kort en tiondel av dess
     bredd: skalan 1780, bilden 1780 × 1001 på brädet från (198, 50).
     Kastar något (en index.html utan zoomstegen, --fil) faller avsnittet som
     en kontroll i stället för att hela provet dör. */
  try {
  await vanta(600);
  state.players = [mig]; state.active = mig.id;
  spelLage = Object.assign({}, spelLage, { id: 'mattprov-zoom' });
  oppSatt({ klar: true });
  mig.cards = []; matVyer.delete(mig.id);
  if (kamSkala.las) kamSkala.las.delete(mig.id);
  kamUpplosning = { w: 1920, h: 1080 };
  renderAll(true);
  const zs = (id, namn, cx, cy) => ({ id, tillstand: 'klar', namn, saker: true, x: cx - 0.05, y: cy - 0.124, w: 0.1, h: 0.248, tappad: false, vilar: true });
  const zr = [zs(21, 'Llanowar Elves', 0.25, 0.4), zs(22, 'Forest', 0.35, 0.4)];
  avstamBord(zr, false);
  await vanta(700);
  const NIVA = [1, 0.86, 0.75, 0.65], KANT = MATTA.KANT, TOPP = MATTA.TOPP;
  const yta = () => { const vp = matVy(mig).vp; return { w: vp.w - 2 * KANT, h: vp.h - TOPP - KANT, vp }; };
  const bild = () => { const sk = kamSkala(mig), a = kamTillMatta({ x: 0, y: 0 }, sk), b = kamTillMatta({ x: 1, y: 1 }, sk); return { x0: a.x, y0: a.y, x1: b.x, y1: b.y }; };
  const golvNu = () => { const a = yta(), b = bild(); return Math.max(MATTA.ZOOM_MIN, Math.min(1, a.w / (b.x1 - b.x0), a.h / (b.y1 - b.y0))); };
  /* Vyn i brädets koordinater, ur transformen som skrivits (inte ur appens tillstånd). */
  const vyn = () => { const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)\s*scale\(([\d.]+)\)/.exec(gridEl._matT || ''), a = yta();
    const px = +m[1], py = +m[2], z = +m[3]; return { z, x0: (KANT - px) / z, x1: (a.vp.w - KANT - px) / z, y0: (TOPP - py) / z, y1: (a.vp.h - KANT - py) / z }; };
  const syns = () => { const w = gridWrap.getBoundingClientRect(); return [...gridEl.querySelectorAll('.card[data-cid]')].every(el => { const r = el.getBoundingClientRect(); return r.left >= w.left - 1 && r.right <= w.right + 1 && r.top >= w.top - 1 && r.bottom <= w.bottom + 1; }); };
  const pct = z => Math.round(z * 100) + ' %', avZ = () => vyn().z;
  const ram = () => matRam(mig);
  const zA = avZ();
  ok('zoomsteg: två kort mitt i bilden — 100 % fit, och de syns', Math.abs(zA - 1) < 1e-6 && syns() && !matVy(mig).manuell, pct(zA) + ', bilden ' + JSON.stringify(bild()));

  /* Ett kort långt till höger: ett steg ut, och det glider 500 ms med UT. */
  zr.push(zs(23, 'Serra Angel', 0.72, 0.4));
  avstamBord(zr, false);
  const zB = avZ(), A = gridEl._matZoom, tim = A && A.effect.getTiming();
  ok('zoomsteg: ett kort som inte får plats ger ett steg ut som glider 500 ms (UT)', zB < zA - 0.01 && !!A && A.playState === 'running' && tim.duration === 500 && /cubic-bezier\(0?\.2,\s*0?\.8,\s*0?\.3,\s*1\)/.test(tim.easing),
    `${pct(zA)} → ${pct(zB)}, ${A ? tim.duration + ' ms ' + tim.easing : 'ingen glidning'}`);
  const nivaer = () => { const g = golvNu(); return NIVA.filter(s => s > g * 1.03).concat([g]); };
  ok('zoomsteg: nivån är en av de fasta (100/86/75/65 % eller golvet)', nivaer().some(n => Math.abs(n - zB) < 1e-4), `${pct(zB)}; nivåerna ${nivaer().map(pct).join(', ')}`);
  /* Brickan och frågan behåller sin storlek medan zoomen glider: --matz följer zoomen som syns. */
  await vanta(150);
  const syntZ = (() => { const m = /matrix\(\s*([-\d.e]+),\s*([-\d.e]+)/.exec(getComputedStyle(gridEl).transform); return m ? Math.hypot(+m[1], +m[2]) : NaN; })();
  const matz = parseFloat(gridEl.style.getPropertyValue('--matz'));
  ok('zoomsteg: --matz följer zoomen medan den glider (brickorna behåller sin storlek)', gar(gridEl) && Math.abs(matz - syntZ) < 0.006 && syntZ > zB + 0.02, `--matz ${matz.toFixed(3)}, zoomen som syns ${syntZ.toFixed(3)}, målet ${zB.toFixed(3)}`);
  await vanta(500);
  const vB = vyn(), rB = ram(), bB = bild();
  ok('zoomsteg: efter steget syns alla kort, och --matz är målet', syns() && Math.abs(parseFloat(gridEl.style.getPropertyValue('--matz')) - zB) < 1e-3, JSON.stringify(vB));
  /* Plats för ungefär två kort till åt höger (prototypens MARG, två kortbredder och 60 px, eller hela bilden),
     och nivån innanför hade inte haft den. */
  const behov = Math.min(rB.x1 + 2 * MATTA.CW + 60, bB.x1);
  const inne = nivaer().filter(n => n > zB + 1e-4).pop();
  const yB = yta();
  ok('zoomsteg: steget ger plats för två kort till åt höger, och nivån innanför hade inte räckt',
    vB.x1 >= behov - 1 && (inne == null || yB.w / inne < behov - rB.x0 + 1),
    `vyn ${Math.round(vB.x0)}–${Math.round(vB.x1)}, korten ${Math.round(rB.x0)}–${Math.round(rB.x1)}, behov till ${Math.round(behov)}; nivån innanför ${inne ? pct(inne) + ' rymmer ' + Math.round(yB.w / inne) : '–'}`);

  /* Aldrig in av sig själv: kortet långt ut går till graveyard, och ett nytt kort mitt i — zoomen står kvar. */
  const tB = gridEl._matT;
  flyttaTill(mig.cards.findIndex(c => c.spar === 23), ZON_GRAV);
  zr.pop(); zr.push(zs(24, 'Wood Elves', 0.3, 0.6));
  avstamBord(zr, false);
  await vanta(600);
  ok('zoomsteg: aldrig in av sig själv (kortet längst ut gick, ett nytt kom mitt i)', gridEl._matT === tB && syns(), `${tB} → ${gridEl._matT}`);

  /* Golvet: kort ut mot bildens kanter — vänster, höger, uppåt, men inne i bilden. Zoomen går aldrig längre
     ut än hela bilden. */
  zr.push(zs(25, 'Plains', 0.06, 0.5), zs(26, 'Island', 0.94, 0.5), zs(27, 'Swamp', 0.5, 0.13));
  for (let i = 0; i < 3; i++) { avstamBord(zr.slice(0, zr.length - 2 + i), false); await vanta(250); }
  await vanta(600);
  const vG = vyn(), bG = bild(), g = golvNu();
  ok('zoomsteg: vid golvet syns hela kamerabilden, och aldrig längre ut', Math.abs(vG.z - g) < 1e-3 && vG.x0 <= bG.x0 + 1 && vG.x1 >= bG.x1 - 1 && vG.y0 <= bG.y0 + 1 && vG.y1 >= bG.y1 - 1 && syns(),
    `${pct(vG.z)}, golvet ${pct(g)}, vyn ${[vG.x0, vG.y0, vG.x1, vG.y1].map(Math.round).join(',')}, bilden ${[bG.x0, bG.y0, bG.x1, bG.y1].map(Math.round).join(',')}`);

  /* Minskad rörelse: steget är en toning (mattan till 0,35, bytet vid 150 ms, tillbaka vid 400). */
  window.__mattLugn = true;
  for (let i = 0; i < 100 && !lugn(); i++) await vanta(20);
  spelLage = Object.assign({}, spelLage, { id: 'mattprov-zoom-lugn' });
  oppSatt({ klar: true });
  zr.length = 2; mig.cards = mig.cards.filter(c => c.spar === 21 || c.spar === 22);
  renderAll(true); await vanta(100);
  const zL = avZ();
  zr.push(zs(28, 'Grizzly Bears', 0.72, 0.4));
  avstamBord(zr, false);
  const L = gridEl._matZoom, kf = L ? L.effect.getKeyframes() : [];
  ok('zoomsteg med minskad rörelse: mattan tonas (0,35) och zoomen byts mitt i, 400 ms', lugn() && avZ() < zL - 0.01 && !!L && L.effect.getTiming().duration === 400 && kf.some(k => +k.opacity === 0.35) && !kf.some(k => k.easing && /cubic/.test(k.easing)),
    L ? `${pct(zL)} → ${pct(avZ())}, ${kf.map(k => k.offset.toFixed(3) + ':' + k.opacity).join(' ')}` : `ingen rörelse: ${pct(zL)} → ${pct(avZ())}, lugn ${lugn()}, klasser ${gridEl.className}, kort ${mig.cards.map(c => c.spar).join(',')}`);
  window.__mattLugn = false;
  for (let i = 0; i < 100 && lugn(); i++) await vanta(20);

  /* Ett nytt parti börjar på 100 % igen, på plats (korten mitt i ryms; kortet långt ut är borta). */
  await vanta(500);
  const zFore = avZ();
  spelLage = Object.assign({}, spelLage, { id: 'mattprov-zoom-2' });
  oppSatt({ klar: true });
  mig.cards = mig.cards.filter(c => c.spar === 21 || c.spar === 22);
  renderAll(true);
  ok('zoomsteg: ett nytt parti börjar på 100 %, ritat på plats', zFore < 0.99 && Math.abs(avZ() - 1) < 1e-6 && !gar(gridEl), `${pct(zFore)} → ${pct(avZ())}`);
  } catch (e) { ok('zoomsteg: avsnittet gick att köra', false, String(e && e.message || e).slice(0, 200)); window.__mattLugn = false; }
  kamUpplosning = null;
  return rad;
};

/* Filmen: tre kort ur kameran, sedan flyttas det första och tappas.
   Animeringarna pausas och ställs på tiden t, så att varje ruta visar
   precis det läget (ingen klocka att missa). Returnerar brädets ruta. */
const FILMPROV = async () => {
  const vanta = ms => new Promise(r => setTimeout(r, ms));
  visaVy('app');
  const mig = player();
  spelLage = { id: 'mattfilm', kod: 'MATT02', namn: 'Film', vard: mig.id, mig: mig.id };
  mig.lage = 'bord'; mig.cards = []; mig.pending = [];
  state.players = [mig]; state.active = mig.id;
  oppSatt({ klar: true });
  kamAnsluten = true; kamFas = ''; kamGrund = 0; prefs.autoLage = true;
  const spar = (id, namn, x, y, tappad) => ({ id, tillstand: 'klar', namn, saker: true, x, y, w: 0.08, h: 0.11, tappad: !!tappad, vilar: true });
  const rapport = [spar(1, 'Llanowar Elves', 0.2, 0.25), spar(2, 'Forest', 0.42, 0.25), spar(3, 'Serra Angel', 0.64, 0.25)];
  avstamBord(rapport, false);
  for (const c of mig.cards) delete c.ny;
  renderAll(true);
  await vanta(1600);
  rapport[0] = spar(1, 'Llanowar Elves', 0.3, 0.55, true);
  avstamBord(rapport, false);
  window.__film = document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('#grid'));
  window.__film.forEach(a => a.pause());
  const r = gridWrap.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height, n: window.__film.length };
};

/* Tiden för en mattuppdatering med många kort: 40 kort (land och
   permanenter), och tre slags uppdateringar som avstamBord ger — inget
   ändrat (tvingad omritning), ett kort flyttat, ett kort tappat. Varje
   omritning mäts med layouten som följer (offsetWidth), medianen av 60. */
const TIDPROV = async () => {
  const vanta = ms => new Promise(r => setTimeout(r, ms));
  visaVy('app');
  const mig = player();
  const namn = ['Llanowar Elves', 'Forest', 'Serra Angel', 'Island', 'Wood Elves', 'Plains', 'Delver of Secrets', 'Swamp'];
  mig.cards = Array.from({ length: 40 }, (_, i) => normaliseraKort({ cid: 'tid' + i, name: namn[i % namn.length], x: 40 + (i % 8) * 200, y: 60 + Math.floor(i / 8) * 270, z: i + 1, tapped: i % 5 === 0 ? 1 : 0, cts: [] }, i));
  renderAll(true);
  await vanta(300);
  /* Varje omritning börjar från vila, som en riktig uppdatering: rörelserna
     från förra varvet stoppas utanför klockan (annars mäts bara avbrott). */
  const vila = () => { for (const a of document.getAnimations()) a.cancel(); void gridEl.offsetWidth; };
  const matt = (n, f) => { const t = []; for (let i = 0; i < n; i++) { vila(); const a = performance.now(); f(i); void gridEl.offsetWidth; t.push(performance.now() - a); } t.sort((x, y) => x - y); return t[Math.floor(t.length / 2)]; };
  const ut = {};
  ut.oforandrad = matt(60, () => renderGrid(true));
  ut.flyttad = matt(60, i => { mig.cards[7].x = 40 + (i % 2) * 300; renderGrid(true); });
  ut.tappad = matt(60, () => { mig.cards[9].tapped = mig.cards[9].tapped ? 0 : 1; renderGrid(true); });
  ut.alla = matt(20, i => { mig.cards.forEach((c, j) => { c.x = 40 + (j % 8) * 200 + (i % 2) * 30; }); renderGrid(true); });
  ut.allaLangt = matt(20, i => { mig.cards.forEach((c, j) => { c.x = 40 + (j % 8) * 200 + (i % 2) * 400; }); renderGrid(true); });
  /* Samma flytt utan rörelser (en ny vy ritas på plats): bara ritningen,
     utan att animeringarna sätts upp. Den gamla koden läser inte _matVy. */
  ut.allaUtan = matt(20, i => { mig.cards.forEach((c, j) => { c.x = 40 + (j % 8) * 200 + (i % 2) * 400; }); gridEl._matVy = 'ny vy'; renderGrid(true); });
  /* Alla 40 avbrutna mitt i lyftet (Ångra direkt efter Tidy up): flyttas
     långt, och 120 ms senare igen — bara den andra ritningen mäts. */
  const avbr = [];
  for (let i = 0; i < 15; i++) {
    vila();
    mig.cards.forEach((c, j) => { c.x = 40 + (j % 8) * 200 + 400; }); renderGrid(true);
    await vanta(120);
    const a = performance.now();
    mig.cards.forEach((c, j) => { c.x = 40 + (j % 8) * 200; }); renderGrid(true); void gridEl.offsetWidth;
    avbr.push(performance.now() - a);
  }
  avbr.sort((x, y) => x - y); ut.avbrutna = avbr[Math.floor(avbr.length / 2)];
  return ut;
};

(async () => {
  const srv = await server();
  const url = `http://127.0.0.1:${srv.address().port}/`;
  const c = await chrome();
  let kod = 0;
  try {
    await c.cdp('Runtime.enable'); await c.cdp('Page.enable'); await c.cdp('Network.enable');
    await c.cdp('Network.setBlockedURLs', { urls: ['*scryfall*', '*supabase*', '*jsdelivr*', '*unpkg*', '*googleapis*', '*gstatic*', '*cdnjs*'] });
    await c.cdp('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
    await c.cdp('Page.navigate', { url });
    const t0 = Date.now();
    for (;;) {
      const r = await c.cdp('Runtime.evaluate', { expression: "document.readyState === 'complete' && typeof renderGrid === 'function' && typeof avstamBord === 'function'", returnByValue: true }).catch(() => null);
      if (r && r.result && r.result.value) break;
      if (Date.now() - t0 > 30000) throw new Error('appen laddade inte (renderGrid saknas)');
      await vanta(100);
    }
    await vanta(300);
    if (FILM) {
      fs.mkdirSync(FILM, { recursive: true });
      const r = await c.cdp('Runtime.evaluate', { expression: '(' + FILMPROV.toString() + ')()', awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error('filmen: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
      const ruta = r.result.value;
      for (const t of [0, 60, 120, 180, 240, 300, 360, 420]) {
        await c.cdp('Runtime.evaluate', { expression: `window.__film.forEach(a => { a.currentTime = ${t}; }); void document.body.offsetWidth; true`, returnByValue: true });
        await vanta(60);
        const bild = await c.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 70, clip: { x: ruta.x, y: ruta.y, width: ruta.w, height: ruta.h, scale: 0.6 } });
        fs.writeFileSync(path.join(FILM, `ruta-${String(t).padStart(3, '0')}ms.jpg`), Buffer.from(bild.data, 'base64'));
      }
      console.log(`mattan --film: ${ruta.n} animeringar pausade, 8 rutor i ${FILM}`);
    } else if (TID) {
      const r = await c.cdp('Runtime.evaluate', { expression: '(' + TIDPROV.toString() + ')()', awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error('tidprovet: ' + (r.exceptionDetails.exception || {}).description);
      const t = r.result.value, f = n => n.toFixed(2).padStart(6) + ' ms';
      console.log(`mattan --tid (${path.relative(process.cwd(), FIL) || FIL}), 40 kort, median per omritning inkl. layout:`);
      console.log(`  inget ändrat (renderGrid(true))  ${f(t.oforandrad)}`);
      console.log(`  ett kort flyttat                 ${f(t.flyttad)}`);
      console.log(`  ett kort tappat                  ${f(t.tappad)}`);
      console.log(`  alla 40 knuffade (30 px)         ${f(t.alla)}`);
      console.log(`  alla 40 flyttade (400 px, lyft)  ${f(t.allaLangt)}`);
      console.log(`  alla 40 flyttade, utan rörelser  ${f(t.allaUtan)}`);
      console.log(`  alla 40 avbrutna mitt i lyftet   ${f(t.avbrutna)}`);
    } else {
      /* Minskad rörelse slås på mitt i provet (window.__mattLugn): Chrome
         emulerar mediefrågan, så att appens matLugn() läser den på riktigt.
         Den kan slås på och av flera gånger (mattans rörelser, zoomstegen). */
      let provKlart = false;
      const r0 = c.cdp('Runtime.evaluate', { expression: '(' + PROV.toString() + ')()', awaitPromise: true, returnByValue: true }).finally(() => { provKlart = true; });
      const vakt = (async () => {
        let pa = false;
        const slut = Date.now() + 120000;
        while (!provKlart && Date.now() < slut) {
          const v = await c.cdp('Runtime.evaluate', { expression: 'window.__mattLugn', returnByValue: true }).catch(() => null), x = v && v.result.value;
          if (x === true && !pa) { pa = true; await c.cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); }
          if (x === false && pa) { pa = false; await c.cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] }); }
          await vanta(5);
        }
      })();
      const r = await r0; await vakt;
      if (r.exceptionDetails) throw new Error('provet: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
      let n = 0, fel = 0;
      for (const [namn, ok, detalj] of r.result.value) { n++; if (!ok) fel++; console.log(`${ok ? 'OK ' : 'FEL'}  ${namn}${detalj ? '  (' + detalj + ')' : ''}`); }
      for (const k of c.konsol) console.log('     ' + k);
      console.log(`mattan: ${n - fel} OK, ${fel} FEL`);
      if (fel) kod = 1;
    }
  } catch (e) { console.error('mattan: ' + e.message); for (const k of c.konsol) console.error('     ' + k); kod = 1; }
  await c.stang(); srv.close();
  process.exit(kod);
})();

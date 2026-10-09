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
  /* Ett riktigt musklick mitt på elementet (Node skickar trycket och släppet, se vakt). */
  const riktigtKlick = async el => {
    const q = el.getBoundingClientRect(), nr = (window.__mattKlick ? window.__mattKlick.nr : 0) + 1;
    window.__mattKlick = { x: q.left + q.width / 2, y: q.top + q.height / 2, nr };
    for (let i = 0; i < 300 && window.__mattKlickKlar !== nr; i++) await vanta(10);
    await vanta(30);
    return window.__mattKlickKlar === nr;
  };
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
  await vanta(450);   // utspelet (MES-344: korten läggs ned, 400 ms) är klart innan flytten provas

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

  /* Mitt speglade bords utgångsläge (hela kamerabilden, MES-338) har ett
     eget avsnitt sist i provet, med en kamerabild av känd storlek. */

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
  if (kamSkala.las) kamSkala.las.delete(mig.id);   // och utan kamerabild börjar partiet på 100 % (utgångsläget), inte i samma bild som förut
  opp.cards = [normaliseraKort({ cid: 'o9', name: 'Island', x: 900, y: 700, z: 1, tapped: 0, cts: [] }, 0)];
  renderAll(true);
  const oNy = document.querySelector('#oppMattor .obrade');
  ok('ett nytt parti ritas på plats (ingen zoom glider in, inte heller hos motståndaren)',
    gridEl.style.transform !== tParti && !gar(gridEl) && !!oNy && oNy.style.transform !== oParti && !gar(oNy),
    `min ${tParti} → ${gridEl.style.transform}; hens ${oParti} → ${oNy && oNy.style.transform}`);

  /* ── Utgångsläget (MES-338, Jesper 2026-10-08) ─────────────────────────
     Mitt speglade bord sätts i ett utgångsläge när partiet börjar (bordets
     100 %, eller hela kamerabilden om den redan är känd), och sedan styr
     spelaren zoom och panorering helt: ingenting flyttas eller zoomas av att
     kort eller leken läggs ut, flyttas eller tas bort — inte heller när
     kamerabilden blir känd. 0 eller knappen "Fit camera view (0)" tar
     mattan till hela kamerabilden: så stor den får plats — bredden eller
     höjden fyller mattan — och centrerad, så att ingen del av bilden är dold.
     Ensam vid bordet. Kamerabilden 16:9 och ett kort en tiondel av dess
     bredd: skalan 1780, bilden 1780 × 1001 på brädet från (198, 50).
     Kastar något (en index.html utan utgångsläget, --fil) faller avsnittet som
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
  const t00 = gridEl._matT;   // mattan innan något ligger på den och innan kamerabilden är känd
  const zs = (id, namn, cx, cy) => ({ id, tillstand: 'klar', namn, saker: true, x: cx - 0.05, y: cy - 0.124, w: 0.1, h: 0.248, tappad: false, vilar: true });
  const zr = [zs(21, 'Llanowar Elves', 0.25, 0.4), zs(22, 'Forest', 0.35, 0.4)];
  avstamBord(zr, false);
  await vanta(700);
  const KANT = MATTA.KANT, TOPP = MATTA.TOPP;
  const yta = () => { const vp = matVy(mig).vp; return { w: vp.w - 2 * KANT, h: vp.h - TOPP - KANT, vp }; };
  const bild = () => { const sk = kamSkala(mig), a = kamTillMatta({ x: 0, y: 0 }, sk), b = kamTillMatta({ x: 1, y: 1 }, sk); return { x0: a.x, y0: a.y, x1: b.x, y1: b.y }; };
  const golvNu = () => { const a = yta(), b = bild(); return Math.max(MATTA.ZOOM_MIN, Math.min(1, a.w / (b.x1 - b.x0), a.h / (b.y1 - b.y0))); };
  const kamZ = () => { const a = yta(), b = bild(); return Math.max(MATTA.ZOOM_MIN, Math.min(MATTA.ZOOM_MAX, a.w / (b.x1 - b.x0), a.h / (b.y1 - b.y0))); };
  /* Vyn i brädets koordinater, ur transformen som skrivits (inte ur appens tillstånd). */
  const vyn = () => { const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)\s*scale\(([\d.]+)\)/.exec(gridEl._matT || ''), a = yta();
    const px = +m[1], py = +m[2], z = +m[3]; return { z, x0: (KANT - px) / z, x1: (a.vp.w - KANT - px) / z, y0: (TOPP - py) / z, y1: (a.vp.h - KANT - py) / z }; };
  const syns = () => { const w = gridWrap.getBoundingClientRect(); return [...gridEl.querySelectorAll('.card[data-cid]')].every(el => { const r = el.getBoundingClientRect(); return r.left >= w.left - 1 && r.right <= w.right + 1 && r.top >= w.top - 1 && r.bottom <= w.bottom + 1; }); };
  const pct = z => Math.round(z * 100) + ' %', avZ = () => vyn().z;
  /* Hela kamerabilden: zoomen som får den att fylla bredden eller höjden, bilden inne i vyn och mitt i den. */
  const helaBilden = () => { const v = vyn(), b = bild(), t = 2 / v.z;
    const inne = v.x0 <= b.x0 + t && v.x1 >= b.x1 - t && v.y0 <= b.y0 + t && v.y1 >= b.y1 - t;
    const mitt = Math.abs((v.x0 + v.x1) / 2 - (b.x0 + b.x1) / 2) < t && Math.abs((v.y0 + v.y1) / 2 - (b.y0 + b.y1) / 2) < t;
    const fyller = Math.abs((v.x1 - v.x0) - (b.x1 - b.x0)) < 2 * t || Math.abs((v.y1 - v.y0) - (b.y1 - b.y0)) < 2 * t;
    return { ok: Math.abs(v.z - kamZ()) < 1e-3 && inne && mitt && fyller, txt: `${pct(v.z)} (väntat ${pct(kamZ())}), vyn ${[v.x0, v.y0, v.x1, v.y1].map(Math.round).join(',')}, bilden ${[b.x0, b.y0, b.x1, b.y1].map(Math.round).join(',')}, inne ${inne} mitt ${mitt} fyller ${fyller}` }; };
  ok('utgångsläget: när kamerabilden blir känd flyttas ingenting — mattan står i bordets 100 %, som innan kortet lades ut', !!matKamRam(mig) && gridEl._matT === t00 && Math.abs(avZ() - 1) < 1e-6 && !matVy(mig).manuell && !gar(gridEl),
    `${t00} → ${gridEl._matT}`);
  fitView(); await vanta(450); gridEl.classList.remove('glider');
  { const h = helaBilden();
    ok('utgångsläget: 0 tar mattan till hela kamerabilden — fyller bredden eller höjden, centrerad', h.ok && !matVy(mig).manuell && syns(), h.txt); }
  const skLek = kamSkala.las.get(mig.id);

  /* Ingen zoom när kort läggs ut: inzoomad av spelaren, och ett kort långt till höger utanför vyn. */
  zoomTill(1.6); await vanta(450); gridEl.classList.remove('glider');
  const tIn = gridEl._matT;
  zr.push(zs(23, 'Serra Angel', 0.9, 0.4));
  avstamBord(zr, false);
  await vanta(600);
  ok('ingen zoom när ett kort läggs ut utanför vyn (inzoomad av spelaren)', gridEl._matT === tIn && !(gridEl._matZoom && gridEl._matZoom.playState === 'running'), `${tIn} → ${gridEl._matT}`);
  /* … och inte heller i utgångsläget, flyttat av spelaren: kort ut mot bildens kanter. */
  fitView(); await vanta(450); gridEl.classList.remove('glider');
  { const vy = matVyFor(mig); vy.pan = { x: vy.pan.x + 260, y: vy.pan.y + 40 }; matSkriv(mig); }
  const tFlytt = gridEl._matT;
  zr.push(zs(25, 'Plains', 0.06, 0.5), zs(26, 'Island', 0.94, 0.5), zs(27, 'Swamp', 0.5, 0.13));
  for (let i = 0; i < 3; i++) { avstamBord(zr.slice(0, zr.length - 2 + i), false); await vanta(250); }
  await vanta(600);
  ok('ingen zoom och ingen panorering när kort läggs ut (utgångsläget, flyttat av spelaren)', gridEl._matT === tFlytt && !matVy(mig).manuell, `${tFlytt} → ${gridEl._matT}`);

  /* 0 och knappen: tillbaka till hela kamerabilden, utan egen zoom — efter egen zoom och ett eget drag. */
  zoomTill(1.4); await vanta(450);
  { const vy = matVyFor(mig); vy.pan = { x: vy.pan.x - 150, y: vy.pan.y + 70 }; matSkriv(mig); }
  fitView(); await vanta(450);
  { const h = helaBilden();
    ok('tangenten 0: hela kamerabilden igen, centrerad, utan egen zoom (efter egen zoom och ett drag)', h.ok && !matVy(mig).manuell && syns(), h.txt); }
  const t0 = gridEl._matT, knapp = $('#mattaChrome [data-mat="kamvy"]');
  zoomTill(1.5); await vanta(450);
  { const k = $('#mattaChrome [data-mat="kamvy"]'); if (k) k.click(); }
  await vanta(450);
  ok('knappen "Fit camera view (0)" i mattans list gör som 0', !!knapp && /^Fit camera view \(0\)$/.test(knapp.textContent.trim()) && gridEl._matT === t0 && !matVy(mig).manuell,
    knapp ? `"${knapp.textContent.trim()}", ${gridEl._matT} / ${t0}` : 'ingen knapp');
  /* Mirror my table: inget Untap all, inget Tidy up, inget U i tipsraden — och U ställer inte upp något. */
  { const tk = mig.cards.find(c => c.spar === 21); tk.tapped = 1;
    untapAlla(); stadaUpp();
    const hint = $('#hintUntap');
    ok('Mirror my table: inget Untap all eller Tidy up i listan, inget U i tipsraden, och U gör ingenting',
      !$('#mattaChrome [data-mat="untap"]') && !$('#mattaChrome [data-mat="tidy"]') && !!hint && hint.hidden && tk.tapped === 1,
      `untap ${!!$('#mattaChrome [data-mat="untap"]')}, tidy ${!!$('#mattaChrome [data-mat="tidy"]')}, tipsraden ${hint ? (hint.hidden ? 'dold' : 'syns') : 'saknas'}, tappad ${tk.tapped}`);
    tk.tapped = 0; renderAll(true); await vanta(300); gridEl.classList.remove('glider'); }

  /* Leken läggs ut medan kort redan ligger på mattan och spelaren zoomat själv: kamerabilden blir känd, och mattan
     ligger kvar — ingen glidning, ingen ny zoom, ingen ny panorering (Jesper 2026-10-08). */
  { const sp0 = spelLage, kort0 = mig.cards;
    spelLage = Object.assign({}, spelLage, { id: 'mattprov-zoom-lek' }); oppSatt({ klar: true });
    kamSkala.las.delete(mig.id);
    mig.cards = [normaliseraKort({ cid: 'zl1', name: 'Grizzly Bears', x: 500, y: 300, z: 1, tapped: 0, cts: [] }, 0), normaliseraKort({ cid: 'zl2', name: 'Forest', x: 720, y: 300, z: 2, tapped: 0, cts: [] }, 1)];
    renderAll(true);
    zoomBy(0.8); await vanta(450); gridEl.classList.remove('glider');
    const tFore = gridEl._matT, manFore = matVy(mig).manuell;
    kamSkala.las.set(mig.id, skLek); renderAll(true);
    await vanta(150);
    ok('leken läggs ut: mattan ligger kvar (ingen zoom, ingen panorering, ingen glidning), och spelarens egna zoom står kvar', !!matKamRam(mig) && manFore && matVy(mig).manuell && gridEl._matT === tFore && !gar(gridEl) && !(gridEl._matZoom && gridEl._matZoom.playState === 'running'),
      `${tFore} → ${gridEl._matT}`);
    await vanta(500);
    ok('leken läggs ut: …och den ligger kvar efteråt', gridEl._matT === tFore, `${tFore} → ${gridEl._matT}`);
    /* Leken och korten flyttas och tas bort: samma sak. */
    const lek0 = mig.cards.length;
    mig.cards[0].x += 900; mig.cards[0].y += 400; renderAll(true); await vanta(300);
    mig.cards = mig.cards.filter(c => c.cid !== 'zl2'); renderAll(true); await vanta(300);
    ok('ett kort flyttas långt och ett annat tas bort: mattan ligger kvar', mig.cards.length === lek0 - 1 && gridEl._matT === tFore && !gar(gridEl), `${tFore} → ${gridEl._matT}`);
    spelLage = sp0; mig.cards = kort0; renderAll(true); await vanta(450); gridEl.classList.remove('glider'); }

  /* Tillbaka in i ett spel (Jesper 2026-10-08): ett spel man varit i får sin zoom och pan tillbaka precis som man
     lämnade dem — också när telefonen ansluter en stund efter att man kommit in (då flyttade mattan sig förut och
     försökte passa kamerabilden, inte exakt). Bara det första besöket i ett nytt spel börjar i hela kamerabilden.
     Knappen "Fit camera view" syns hela tiden på mitt speglade bord, också innan kamerabilden är känd. Provet går
     genom samma hjälpare som oppnaSpel och lamnaSpelet (matVyLamna, matVyAterta); moln- och kanaldelen utelämnas. */
  { const sp0 = spelLage, kort0 = mig.cards;
    const tb = [zs(31, 'Llanowar Elves', 0.25, 0.4), zs(32, 'Forest', 0.35, 0.4)];
    const tb2 = tb.map(u => Object.assign({}, u, { w: 0.14, h: 0.35 }));   // telefonen på ett annat avstånd än förra gången
    const lamna = () => { matVyLamna(); for (const c of mig.cards) delete c.kam; kamSkala.las.delete(mig.id); };
    const gaIn = async (id, nytt) => { spelLage = Object.assign({}, spelLage, { id }); oppSatt({ klar: true }); const aterv_ = matVyAterta(id, mig.id);
      if (nytt) mig.cards = []; renderAll(true); await vanta(300); return aterv_; };
    const knapp = () => !!$('#mattaChrome [data-mat="kamvy"]');
    const lika = (a, b) => a === b;
    /* Första besöket i spel A: kamerabilden blir känd, spelaren zoomar och drar mattan. */
    matVyPerSpel.clear(); matVyer.delete(mig.id); kamSkala.las.delete(mig.id);
    spelLage = Object.assign({}, spelLage, { id: 'mattprov-tillbaka' }); oppSatt({ klar: true });
    mig.cards = []; renderAll(true); avstamBord(tb, false); await vanta(700);
    zoomBy(0.8); await vanta(450); gridEl.classList.remove('glider');
    { const vy = matVyFor(mig), v = matVy(mig); vy.pan = clampPan({ x: v.pan.x + 37, y: v.pan.y + 23 }, v.z, v.board, v.vp, v.ram); }
    renderAll(true); await vanta(450); gridEl.classList.remove('glider');
    const T0 = gridEl._matT, man0 = matVy(mig).manuell;
    /* Ut ur spelet och in igen. */
    lamna(); const aterv = await gaIn('mattprov-tillbaka', false);
    ok('tillbaka i spelet: vyn är återställd, och knappen syns innan kamerabilden är känd', aterv && !matKamRam(mig) && knapp(), `återställd ${aterv}, kamerabilden ${matKamRam(mig) ? 'känd' : 'okänd'}, knappen ${knapp() ? 'syns' : 'saknas'}`);
    ok('tillbaka i spelet: samma zoom och pan som när man lämnade', man0 && matVy(mig).manuell && lika(gridEl._matT, T0), `${T0} / ${gridEl._matT}`);
    /* Telefonen ansluter en stund senare, på ett annat avstånd: mattan ligger kvar. */
    avstamBord(tb2, false); await vanta(900);
    ok('tillbaka i spelet: när kamerabilden blir känd flyttar sig inte mattan', !!matKamRam(mig) && matVy(mig).manuell && lika(gridEl._matT, T0), `${T0} / ${gridEl._matT}`);
    /* Ett nytt spel börjar i hela kamerabilden, utan egen zoom. */
    lamna(); await gaIn('mattprov-tillbaka-nytt', true);
    ok('nytt spel: knappen syns innan kamerabilden är känd, och ingen vy återställs', !matKamRam(mig) && knapp() && !matVy(mig).manuell, `kamerabilden ${matKamRam(mig) ? 'känd' : 'okänd'}`);
    avstamBord(tb2, false); await vanta(900);
    { const hb = helaBilden(); ok('nytt spel: när kamerabilden blir känd hoppar mattan till hela kamerabilden, utan egen zoom', !!matKamRam(mig) && hb.ok && !matVy(mig).manuell && !gar(gridEl), hb.txt); }
    fitView(); await vanta(450);
    { const hb = helaBilden(); ok('nytt spel: 0 ger samma hela kamerabild', hb.ok && !matVy(mig).manuell, hb.txt); }
    /* In i ett spel utan minne (en omladdning, eller ett spel man inte varit i), med korten redan på mattan: när
       kamerabilden blir känd hoppar mattan direkt till hela kamerabilden — ingen glidning (500 ms). */
    lamna(); await gaIn('mattprov-tillbaka-ominl', false);
    avstamBord(tb, false); await vanta(250);   // kamerabilden blir känd; en glidning på 500 ms skulle fortfarande pågå
    { const A = gridEl._matZoom, glider = !!A && A.playState === 'running', hb = helaBilden();
      ok('in i ett spel utan minne: när kamerabilden blir känd hoppar mattan direkt till hela kamerabilden, utan glidning', !!matKamRam(mig) && !glider && hb.ok && !matVy(mig).manuell, `${glider ? 'glider' : 'ingen glidning'}; ${hb.txt}`); }
    /* Ett spel där kamerabilden aldrig hann bli känd, men spelaren flyttat mattan: tillbaka dit ska den heller inte
       hoppa till kamerabilden när telefonen ansluter (matVyAterta tar bort s.hopp). */
    lamna(); await gaIn('mattprov-tillbaka-rort', true);
    zoomBy(0.8); await vanta(450); gridEl.classList.remove('glider');
    const T1 = gridEl._matT;
    lamna(); await gaIn('mattprov-tillbaka-rort', false);
    avstamBord(tb2, false); await vanta(900);
    ok('tillbaka i ett spel utan sedd kamerabild men med egen zoom: mattan ligger kvar när kamerabilden blir känd', !!matKamRam(mig) && matVy(mig).manuell && lika(gridEl._matT, T1), `${T1} / ${gridEl._matT}`);
    /* Tillbaka till spel A efter ett besök i ett annat: A:s vy, inte B:s. */
    lamna(); await gaIn('mattprov-tillbaka', false);
    avstamBord(tb, false); await vanta(900);
    ok('tillbaka i spel A efter ett besök i B: A:s zoom och pan, och de ligger kvar när kamerabilden blir känd', matVy(mig).manuell && lika(gridEl._matT, T0), `${T0} / ${gridEl._matT}`);
    /* Knappen tar mattan till hela kamerabilden, som förut. */
    fitView(); await vanta(450);
    { const hb = helaBilden(); ok('tillbaka i spelet: Fit camera view ger hela kamerabilden, utan egen zoom', hb.ok && !matVy(mig).manuell && knapp(), hb.txt); }
    spelLage = sp0; mig.cards = kort0; kamSkala.las.set(mig.id, skLek); matVyPerSpel.clear(); renderAll(true); await vanta(450); gridEl.classList.remove('glider'); }

  /* Bord utan utgångsläge (Digital table, Use camera to add cards, utanför ett spel): brädets fit hålls kvar. Förut
     följde den brädet, som växer när ett kort läggs utanför det, och mattan zoomade ut av sig själv. */
  { const sp0 = spelLage, kort0 = mig.cards;
    spelLage = null; matVyer.delete(mig.id);
    mig.cards = [normaliseraKort({ cid: 'fl1', name: 'Forest', x: 300, y: 300, z: 1, tapped: 0, cts: [] }, 0)];
    renderAll(true); await vanta(300); gridEl.classList.remove('glider');
    const tF = gridEl._matT;
    mig.cards.push(normaliseraKort({ cid: 'fl2', name: 'Island', x: 4200, y: 2600, z: 2, tapped: 0, cts: [] }, 1));
    renderAll(true); await vanta(500);
    const bF = matVy(mig).board;
    ok('bord utan utgångsläge: ett kort långt utanför brädet zoomar inte ut mattan', bF.w > 3000 && gridEl._matT === tF && !matVy(mig).manuell, `${tF} → ${gridEl._matT}, brädet ${bF.w} × ${bF.h}`);
    mig.cards = mig.cards.filter(c => c.cid !== 'fl2'); renderAll(true); await vanta(400);
    ok('bord utan utgångsläge: och när det tas bort ligger mattan kvar', gridEl._matT === tF, `${tF} → ${gridEl._matT}`);
    zoomTill(1.3); await vanta(450); gridEl.classList.remove('glider');
    const tF2 = gridEl._matT;
    mig.cards.push(normaliseraKort({ cid: 'fl3', name: 'Swamp', x: 4300, y: 100, z: 3, tapped: 0, cts: [] }, 2));
    renderAll(true); await vanta(400);
    ok('bord utan utgångsläge: spelarens egen zoom och pan ligger kvar när ett kort läggs långt utanför', gridEl._matT === tF2 && matVy(mig).manuell, `${tF2} → ${gridEl._matT}`);
    spelLage = sp0; mig.cards = kort0; matVyer.delete(mig.id); renderAll(true); await vanta(450); gridEl.classList.remove('glider'); }

  /* Raderna ovanför mattan ("N cards to fill in", Auto-läget) kommer och går med korten och gör mattan lägre eller
     högre. Mattan i utgångsläget ligger kvar: bara fönstret, panelen och bordsvyns nivå räknar om den. */
  { const sp0 = spelLage, kort0 = mig.cards;
    matVyPerSpel.clear(); matVyer.delete(mig.id); kamSkala.las.delete(mig.id);
    spelLage = Object.assign({}, spelLage, { id: 'mattprov-rad' }); oppSatt({ klar: true });
    mig.cards = []; renderAll(true); avstamBord([zs(41, 'Llanowar Elves', 0.25, 0.4), zs(42, 'Forest', 0.35, 0.4)], false); await vanta(700);
    fitView(); await vanta(450); gridEl.classList.remove('glider');
    const tR = gridEl._matT, hR = gridWrap.clientHeight, bar = $('#autoBar'), pend = $('#pendBar'), bar0 = bar.hidden, pend0 = pend.hidden;
    bar.hidden = false; pend.hidden = false; await vanta(500);
    const hRad = gridWrap.clientHeight;
    ok('en rad kommer ovanför mattan: mattan i utgångsläget ligger kvar (zoom och pan)', hRad !== hR && gridEl._matT === tR && !gar(gridEl), `höjden ${hR} → ${hRad}, ${tR} → ${gridEl._matT}`);
    bar.hidden = true; pend.hidden = true; await vanta(500);
    ok('… och när raden går ligger den kvar', gridWrap.clientHeight === hR && gridEl._matT === tR, `höjden ${gridWrap.clientHeight}, ${tR} → ${gridEl._matT}`);
    bar.hidden = bar0; pend.hidden = pend0;
    spelLage = sp0; mig.cards = kort0; matVyPerSpel.clear(); renderAll(true); await vanta(450); gridEl.classList.remove('glider'); }

  /* ── Kamerans yta (MES-338, Jespers val B 2026-10-07) ──
     En kontur runt kamerabilden i brädets koordinater, bordet utanför svagt mörkare. Den följer mattans zoom och
     panorering, finns bara på min matta, och spelarens egen utzoomning stannar ett steg (×0,87) förbi golvet. */
  const kamYta = () => gridWrap.querySelector(':scope > .kamlager > .kamyta');
  /* Ytans ruta på skärmen, räknad ur transformen som skrivits och bilden i brädet — inte ur elementet. */
  const ytaVantad = b => { const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)\s*scale\(([\d.]+)\)/.exec(gridEl._matT), w = gridWrap.getBoundingClientRect(), z = +m[3];
    return { l: w.left + +m[1] + b.x0 * z, t: w.top + +m[2] + b.y0 * z, r: w.left + +m[1] + b.x1 * z, b: w.top + +m[2] + b.y1 * z }; };
  const ytaStammer = b => { const e = kamYta(), r = e && e.getBoundingClientRect(), v = ytaVantad(b);
    return !!r && Math.abs(r.left - v.l) < 1.5 && Math.abs(r.top - v.t) < 1.5 && Math.abs(r.right - v.r) < 1.5 && Math.abs(r.bottom - v.b) < 1.5; };
  const kY = kamYta(), bY = bild();
  ok('kamerans yta: finns på min matta runt kamerabilden, i ett eget lager före brädet (uppspelaren och brädet ser den inte)',
    !!kY && !kY.hidden && !gridEl.querySelector('.kamyta') && document.querySelectorAll('.kamyta').length === 1 && gridWrap.querySelector(':scope > .kamlager + #grid') && ytaStammer(bY) && /Camera view/.test(kY.textContent) && kY.querySelectorAll(':scope > .ks').length === 4 && parseFloat(getComputedStyle(kY.querySelector('.ks.o')).width) > 0,
    kY ? `${kY.style.cssText}; bilden ${[bY.x0, bY.y0, bY.x1, bY.y1].map(Math.round).join(',')}` : 'ingen');
  /* Spelarens egen zoom ut: stannar ett steg förbi golvet, och ytan följer zoomen. */
  for (let i = 0; i < 4; i++) { zoomBy(0.8); await vanta(80); }
  await vanta(450);
  const zMin = avZ(), gMin = golvNu();
  ok('kamerans yta: egen utzoomning stannar ett steg förbi golvet (×0,87), och ytan följer zoomen',
    Math.abs(zMin - gMin * 0.87) < 2e-3 && matVy(mig).manuell && ytaStammer(bild()) && syns(),
    `${pct(zMin)}, golvet ${pct(gMin)}, ett steg förbi ${pct(gMin * 0.87)}`);
  /* Toningen (förslaget B): ytan syns när mattan visar bord utanför kamerabilden, och tonas ut när vyn ligger inne i
     bilden — 200 ms, och utan övergång med minskad rörelse (provas nedan). */
  const synsYta = () => !!kamYta() && kamYta().classList.contains('syns');
  const utSyns = synsYta();
  zoomTill(1.6); await vanta(450);
  const vIn = vyn(), bIn = bild(), vyInne = vIn.x0 >= bIn.x0 && vIn.x1 <= bIn.x1 && vIn.y0 >= bIn.y0 && vIn.y1 <= bIn.y1;
  ok('kamerans yta: tonas in när mattan visar bord utanför bilden, ut när vyn ligger inne i den (200 ms)',
    utSyns && vyInne && !synsYta() && /opacity/.test(getComputedStyle(kamYta()).transitionProperty) && getComputedStyle(kamYta()).transitionDuration.split(',')[0].trim() === '0.2s',
    `utzoomad ${utSyns}, inzoomad (vyn inne i bilden ${vyInne}) ${synsYta()}, ${getComputedStyle(kamYta()).transitionProperty} ${getComputedStyle(kamYta()).transitionDuration}`);
  /* Tillbaka till "fit" med zoomknapparna: utgångsläget, också panoreringen — efter egen zoom, och efter ett
     eget drag (+ och − tillbaka). */
  const stegT = () => { const s = matVyFor(mig).steg; return `translate(${Math.round(s.pan.x)}px,${Math.round(s.pan.y)}px) scale(${s.z})`; };
  matVyFor(mig).pan = { x: matVyFor(mig).pan.x + 140, y: matVyFor(mig).pan.y + 60 }; matSkriv(mig);
  zoomTill(matVy(mig).fit);
  const efterZoom = gridEl._matT;
  await vanta(450);
  const vyP = matVyFor(mig); vyP.pan = { x: vyP.pan.x - 120, y: vyP.pan.y + 50 }; matSkriv(mig);
  await vanta(450);
  const draget = gridEl._matT, ytaDraget = ytaStammer(bild());
  zoomBy(1.25); zoomBy(0.8);
  ok('kamerans yta: tillbaka till "fit" med zoomknapparna ger utgångsläget, också panoreringen (efter egen zoom och efter ett drag)',
    efterZoom === stegT() && draget !== stegT() && gridEl._matT === stegT() && !matVy(mig).manuell,
    `efter zoom ${efterZoom}, efter draget ${draget}, efter + och − ${gridEl._matT}, utgångsläget ${stegT()}`);
  await vanta(450);
  ok('kamerans yta: följer panoreringen (ett eget drag, och tillbaka)', ytaDraget && ytaStammer(bild()));
  /* Tangenten 0: utgångsläget (hela kamerabilden), samma vy som "fit" med zoomknapparna. */
  zoomBy(1.25); fitView();
  ok('tangenten 0: samma vy som "fit" med zoomknapparna (utgångsläget)', gridEl._matT === stegT() && !matVy(mig).manuell, `${gridEl._matT} / ${stegT()}`);
  zoomTill(matVy(mig).fit); await vanta(450);
  gridEl.classList.remove('glider');
  /* Kamerabilden blir mindre mitt i partiet (skalan låses om till 80 %): mattan står still, ytan krymper. Kortet
     längst till vänster går först till graveyard: med en mindre bild sticker det ut två px förbi vyn (korten är lika
     stora på brädet), och då centreras vyn om — alla kort ska synas. */
  flyttaTill(mig.cards.findIndex(c => c.spar === 25), ZON_GRAV); zr.splice(zr.findIndex(r => r.id === 25), 1);
  await vanta(500);
  { const las = kamSkala.las.get(mig.id), tFore = gridEl._matT, sk0 = las.v;
    /* Först utzoomad till gränsen (×0,87): gränsen räknas ur bilden som den varit i partiet och stiger inte när bilden
       krymper, så zoomen hoppar inte in. Sedan tillbaka till fit: utgångsläget har stått still. */
    for (let i = 0; i < 4; i++) zoomBy(0.8);
    await vanta(450);
    const tUt = gridEl._matT;
    kamSkala.las.set(mig.id, { v: sk0 * 0.8, kalla: 'kort', kand: { sedan: Date.now(), varden: [] } });
    renderAll(true); await vanta(600);
    const tUtEfter = gridEl._matT;
    zoomTill(matVy(mig).fit); await vanta(450);
    const a = kamTillMatta({ x: 0, y: 0 }, sk0 * 0.8), b = kamTillMatta({ x: 1, y: 1 }, sk0 * 0.8), mindre = { x0: a.x, y0: a.y, x1: b.x, y1: b.y };
    ok('kamerans yta: kamerabilden blir mindre mitt i partiet, utzoomad till gränsen — zoomen står still',
      tUtEfter === tUt && kamSkala.las.get(mig.id).v === sk0 * 0.8, `${tUt} → ${tUtEfter}`);
    ok('kamerans yta: kamerabilden blir mindre mitt i partiet — utgångsläget står still, ytan visar var kameran ser',
      gridEl._matT === tFore && ytaStammer(mindre) && kamYta().getBoundingClientRect().width < ytaVantad(bY).r - ytaVantad(bY).l - 50,
      `${tFore} → ${gridEl._matT}, skalan ${Math.round(sk0)} → ${Math.round(kamSkala.las.get(mig.id).v)}`);
    kamSkala.las.set(mig.id, { v: sk0, kalla: 'kort', kand: null }); renderAll(true); await vanta(600);
    gridEl.classList.remove('glider'); }
  /* Bara på min matta: inte på motståndarens, inte heller när hens bord kommer (fjarrBord). */
  state.players = [mig, opp]; state.active = mig.id; bord.valt = 'all'; renderAll(true); await vanta(100);
  fjarrBord({ game_id: spelLage.id, user_id: opp.id, kort: [{ cid: 'o20', name: 'Island', x: 300, y: 200, z: 1, tapped: 0 }], version: 20 });
  ok('kamerans yta: bara på min matta — inte på motståndarens (bordsvyn, fjarrBord)',
    document.querySelectorAll('#oppMattor .kamyta').length === 0 && document.querySelectorAll('.kamyta').length === 1 && !!kamYta() && !kamYta().hidden,
    `${document.querySelectorAll('.kamyta').length} i sidan, ${document.querySelectorAll('#oppMattor .kamyta').length} hos motståndaren`);
  state.players = [mig]; state.active = mig.id; bord.valt = null; renderAll(true); await vanta(600);
  /* Byter man till Digital table mitt i partiet (menyn: kameran av, eller avböjd i uppstarten utan telefon) finns
     ingen kamerayta, fast den låsta skalan lever kvar, och egen zoom går ut till 30 % som förut. */
  { const auto0 = prefs.autoLage, ans0 = kamAnsluten, ute = () => { for (let i = 0; i < 14; i++) zoomBy(0.8); return avZ(); };
    prefs.autoLage = false; kamAnsluten = false; renderAll(true);
    const zMeny = ute(), ytaMeny = !!kamYta() && !kamYta().hidden;
    prefs.autoLage = true; oppSatt({ avbojd: true }); renderAll(true);
    const zAvb = ute(), ytaAvb = !!kamYta() && !kamYta().hidden;
    ok('Digital table mitt i partiet: ingen kamerayta, och egen zoom ut till 30 % som förut (menyn, och avböjd i uppstarten)',
      !ytaMeny && !ytaAvb && Math.abs(zMeny - MATTA.ZOOM_MIN) < 1e-6 && Math.abs(zAvb - MATTA.ZOOM_MIN) < 1e-6 && !!kamSkala.las.get(mig.id),
      `menyn: ${pct(zMeny)}, ytan ${ytaMeny}; avböjd: ${pct(zAvb)}, ytan ${ytaAvb}`);
    oppSatt({ avbojd: false, klar: true }); prefs.autoLage = auto0; kamAnsluten = ans0;
    zoomTill(matVy(mig).fit); renderAll(true); await vanta(450);
    ok('…och tillbaka i Mirror my table: ytan är där igen', !!kamYta() && !kamYta().hidden);
    /* Mirror my table innan skalan är mätt (inga kort från kameran än): ingen kamerayta, och 30 % som förut. */
    const sp0 = spelLage, kort0 = mig.cards, las0 = kamSkala.las.get(mig.id);
    spelLage = Object.assign({}, spelLage, { id: 'mattprov-zoom-omatt' }); oppSatt({ klar: true });
    kamSkala.las.delete(mig.id);
    mig.cards = [normaliseraKort({ cid: 'om1', name: 'Grizzly Bears', x: 300, y: 300, z: 1, tapped: 0, cts: [] }, 0), normaliseraKort({ cid: 'om2', name: 'Forest', x: 520, y: 300, z: 2, tapped: 0, cts: [] }, 1)];
    renderAll(true);
    const zOmatt = ute(), ytaOmatt = !!kamYta() && !kamYta().hidden;
    ok('Mirror my table innan skalan är mätt: ingen kamerayta, och egen zoom ut till 30 % som förut',
      !matKamRam(mig) && !ytaOmatt && Math.abs(zOmatt - MATTA.ZOOM_MIN) < 1e-6, `${pct(zOmatt)}, ytan ${ytaOmatt}`);
    matVyFor(mig).zoomManual = null; spelLage = sp0; mig.cards = kort0; kamSkala.las.set(mig.id, las0);
    renderAll(true); await vanta(450); }
  gridEl.classList.remove('glider');   // zoomknapparnas övergång (zoomTill, fitView) får inte ta glidningen nedan

  /* Minskad rörelse: när leken läggs ut händer ingenting med mattan, med eller utan rörelse. */
  window.__mattLugn = true;
  for (let i = 0; i < 100 && !lugn(); i++) await vanta(20);
  ok('kamerans yta med minskad rörelse: ingen egen rörelse (ingen övergång)', !!kamYta() && parseFloat(getComputedStyle(kamYta()).transitionDuration) === 0, kamYta() ? getComputedStyle(kamYta()).transitionDuration : 'ingen');
  { const sp0 = spelLage, kort0 = mig.cards, las0 = kamSkala.las.get(mig.id);
    spelLage = Object.assign({}, spelLage, { id: 'mattprov-zoom-lugn' }); oppSatt({ klar: true });
    kamSkala.las.delete(mig.id);
    mig.cards = [normaliseraKort({ cid: 'zu1', name: 'Grizzly Bears', x: 500, y: 300, z: 1, tapped: 0, cts: [] }, 0)];
    renderAll(true); await vanta(100);
    const zL = avZ(), tL = gridEl._matT;
    kamSkala.las.set(mig.id, las0); renderAll(true);
    await vanta(450);
    const L = gridEl._matZoom;
    ok('leken läggs ut med minskad rörelse: ingen toning, ingen zoom, mattan ligger kvar', lugn() && gridEl._matT === tL && !(L && L.playState === 'running') && Math.abs(avZ() - zL) < 1e-6,
      `${pct(zL)} → ${pct(avZ())}, ${tL} → ${gridEl._matT}, lugn ${lugn()}`);
    window.__mattLugn = false;
    for (let i = 0; i < 100 && lugn(); i++) await vanta(20);
    await vanta(500);
    spelLage = sp0; mig.cards = kort0; renderAll(true); }

  /* Ett nytt parti med kamerabilden redan känd (en omladdning mitt i): hela kamerabilden direkt, på plats. */
  await vanta(500);
  zoomTill(1.5); await vanta(450); gridEl.classList.remove('glider');
  spelLage = Object.assign({}, spelLage, { id: 'mattprov-zoom-2' });
  oppSatt({ klar: true });
  mig.cards = mig.cards.filter(c => c.spar === 21 || c.spar === 22);
  renderAll(true);
  { const h = helaBilden();
    ok('ett nytt parti med känd kamerabild börjar i hela kamerabilden, ritat på plats', h.ok && !matVy(mig).manuell && !gar(gridEl), h.txt); }
  } catch (e) { ok('utgångsläget: avsnittet gick att köra', false, String(e && e.message || e).slice(0, 200)); window.__mattLugn = false; }
  kamUpplosning = null;

  /* ── Till handen (MES-343): scenen "Ta upp i handen" på sida 3 ──
     Kameran skickar ett kort till handen (tillHanden, som avstamBord gör
     när väntan är slut): kortet ur listan, kopian glider ut genom
     nederkanten, raden med Exile · Still on the table · Library. Still on
     the table lägger tillbaka samma kortpost och elementet glider in från
     nederkanten; Library bekräftar; en token tonas ut med Undo; Exile
     flyttar kortet till exile. Inget kort blir grått. */
  try {
    await vanta(500);
    spelLage = Object.assign({}, spelLage, { id: 'mattprov-hand' });
    oppSatt({ klar: true });
    mig.cards = []; mig.pending = []; handRad.length = 0;
    const sp3 = [spar(31, 'Llanowar Elves', 0.2, 0.25), spar(32, 'Forest', 0.42, 0.25), spar(33, 'Serra Angel', 0.64, 0.25)];
    avstamBord(sp3, false);
    for (const c of mig.cards) delete c.ny;
    renderAll(true); await vanta(600);
    const k = mig.cards.find(c => c.spar === 32), kEl = els().get(k.cid);
    const n0 = els().size, x0 = kEl.getBoundingClientRect(), left0 = kEl.style.left, top0 = kEl.style.top;
    delete k.spar; tillHanden(mig, k, Date.now() - 5000, Date.now()); save(); renderAll(true);
    const flyg = gridWrap.querySelector('.handflyg'), rad = $('#handRad');
    const kf = (el, egenskap) => !!el && el.getAnimations().some(a => a.effect.getKeyframes().some(f => f[egenskap] != null));
    ok('till handen: kortet ur listan och dess element borta ur brädet', !mig.cards.includes(k) && !els().has(k.cid) && els().size === n0 - 1, `${els().size} element`);
    ok('till handen: en kopia glider ut genom nederkanten inne i mattans fönster (translate, scale, opacitet)', !!flyg && flyg.parentElement === gridWrap && flyg.getAnimations().some(a => a.playState === 'running') && kf(flyg, 'translate') && kf(flyg, 'scale') && kf(flyg, 'opacity'), flyg ? anim(flyg) : 'ingen kopia');
    const radTxt = rad && !rad.hidden ? rad.textContent : '';
    ok('raden: "Forest went to your hand" med Exile · Still on the table · Library', !!rad && !rad.hidden && /Forest went to your hand/.test(radTxt) && ['exil', 'kvar', 'bib'].every(v => rad.querySelector(`[data-hand="${v}"]`)) && rad.querySelector('[data-hand="kvar"]').textContent === 'Still on the table', radTxt.trim().slice(0, 80));
    const rr = rad.getBoundingClientRect(), wr = gridWrap.getBoundingClientRect();
    ok('raden står vid nederkanten, mitt på mattan, med en stapel som rinner ut', Math.abs((rr.left + rr.right) / 2 - (wr.left + wr.right) / 2) < 4 && rr.bottom <= wr.bottom && rr.bottom > wr.bottom - 40 && !!rad.querySelector('.hrad-bar'), `${Math.round(rr.left)}–${Math.round(rr.right)} i ${Math.round(wr.left)}–${Math.round(wr.right)}, botten ${Math.round(rr.bottom)} mot ${Math.round(wr.bottom)}`);
    ok('inget kort är nedtonat och bannern finns inte', !gridEl.querySelector('.card.lyft') && !document.querySelector('.lyftbanner') && !document.querySelector('.kortchip.lost'), '');
    await vanta(800);
    ok('kopian städas efter flygturen', !gridWrap.querySelector('.handflyg'), '');
    /* Still on the table. */
    rad.querySelector('[data-hand="kvar"]').click();
    const kEl2 = els().get(k.cid);
    ok('Still on the table: samma kortpost tillbaka i listan, på sin plats på brädet', mig.cards.includes(k) && !!kEl2 && kEl2.style.left === left0 && kEl2.style.top === top0, kEl2 ? `${kEl2.style.left} ${kEl2.style.top} mot ${left0} ${top0}` : 'inget element');
    ok('… och glider in från nederkanten (A.pos med translate, opacitet 0 → 1)', !!kEl2 && kEl2._matA && kEl2._matA.pos && kEl2._matA.pos.playState === 'running' && kf(kEl2, 'translate') && kf(kEl2, 'opacity'), kEl2 ? anim(kEl2) : '');
    ok('raden bekräftar "Forest is back on the table", utan knappar', /Forest is back on the table/.test($('#handRad').textContent) && !$('#handRad').querySelector('[data-hand]'), $('#handRad').textContent.trim().slice(0, 60));
    await vanta(600);
    const r2 = els().get(k.cid) && els().get(k.cid).getBoundingClientRect();
    ok('kortet landar där det låg, i samma element', els().get(k.cid) === kEl2 && !!r2 && Math.abs(r2.left - x0.left) < 2 && Math.abs(r2.top - x0.top) < 2, r2 ? `${Math.round(r2.left)},${Math.round(r2.top)} mot ${Math.round(x0.left)},${Math.round(x0.top)}` : 'borta');
    await vanta(1400);
    ok('bekräftelsen går ut efter 1,8 s: raden dold', $('#handRad').hidden, $('#handRad').textContent.trim().slice(0, 40));
    /* Library: handen och library är ett — kortet stannar borta, raden bekräftar. */
    const k2 = mig.cards.find(c => c.spar === 33);
    delete k2.spar; tillHanden(mig, k2, Date.now() - 5000, Date.now()); save(); renderAll(true); await vanta(500);
    $('#handRad').querySelector('[data-hand="bib"]').click();
    ok('Library: kortet stannar ur listan, raden säger "went to your library"', !mig.cards.includes(k2) && !els().has(k2.cid) && /Serra Angel went to your library/.test($('#handRad').textContent), $('#handRad').textContent.trim().slice(0, 60));
    await vanta(2000);
    /* En token (fall 7): tonas ut på plats, raden med Undo. */
    const k3 = mig.cards.find(c => c.spar === 31); k3.tok = 1;
    delete k3.spar; tillHanden(mig, k3, Date.now() - 5000, Date.now()); save(); renderAll(true);
    const flyg3 = gridWrap.querySelector('.handflyg');
    ok('token: tonas ut på plats (bara opacitet), raden "Llanowar Elves is gone · Undo"', !!flyg3 && !kf(flyg3, 'translate') && kf(flyg3, 'opacity') && /Llanowar Elves is gone/.test($('#handRad').textContent) && !!$('#handRad').querySelector('[data-hand="angra"]') && !$('#handRad').querySelector('[data-hand="exil"]'), $('#handRad').textContent.trim().slice(0, 60));
    $('#handRad').querySelector('[data-hand="angra"]').click();
    ok('Undo: token tillbaka på mattan', mig.cards.includes(k3) && !!els().get(k3.cid), '');
    await vanta(2000);
    /* Exile: kortet in i bordet och till exile. */
    k3.tok = 0; delete k3.spar; tillHanden(mig, k3, Date.now() - 5000, Date.now()); save(); renderAll(true); await vanta(500);
    $('#handRad').querySelector('[data-hand="exil"]').click();
    ok('Exile: kortet i exile, raden säger "went to exile"', mig.cards.includes(k3) && zonAv(k3) === ZON_EXIL && !els().has(k3.cid) && /went to exile/.test($('#handRad').textContent), $('#handRad').textContent.trim().slice(0, 60));
    /* Inget val: raden går ut efter HAND_RAD_MS och handen står fast. */
    await vanta(2000);
    const k4 = mig.cards.find(c => c.name === 'Forest'); delete k4.spar; tillHanden(mig, k4, Date.now() - 5000, Date.now()); save(); renderAll(true);
    await vanta(5800);
    const stodKvar = !$('#handRad').hidden;
    await vanta(500);
    ok('inget val på 6 s: raden går ut och kortet stannar i handen', stodKvar && $('#handRad').hidden && !mig.cards.includes(k4), `stod vid 5,8 s: ${stodKvar}`);
  } catch (e) { ok('till handen: avsnittet gick att köra', false, String(e && e.message || e).slice(0, 200)); }

  /* ── Framkallningen (MES-344): scenerna "Lägg ut ett kort" och "Ett kort utan namn" på sida 3 ──
     Namnet i tid: kortet läggs ned färdigt (matLagg: opacitet, translate från spelarens håll, skala, grön
     ring). Namnet dröjer: ett oframkallat kort (.ofr, nyckeln o:<spår>) läggs ned 0,5 s efter släppet, med
     kamerans foto (MES-351: Mesas egen ram, helt suddigt medan Claude läser) och utan namn; när namnet kommer
     tar kortet över SAMMA element och framkallas (fotot tonas bort). Aldrig något namn: skarp mitt, "NOT
     IDENTIFIED" och "Enter name", sökrutan BREDVID kortet, och det valda namnet framkallar kortet. Ingen
     platshållare och ingen laddtext någonstans. */
  try {
    await vanta(500);
    spelLage = Object.assign({}, spelLage, { id: 'mattprov-ofr' });
    oppSatt({ klar: true });
    mig.cards = []; mig.pending = []; handRad.length = 0; renderAll(true);
    lekKort = [{ name: 'Fencing Ace', n: 2 }, { name: 'Serra Angel', n: 1 }, { name: 'Forest', n: 12 }];
    const FOTO = (() => { const c = document.createElement('canvas'); c.width = 16; c.height = 22; const x = c.getContext('2d'); x.fillStyle = '#c8b27a'; x.fillRect(0, 0, 16, 22); return c.toDataURL('image/jpeg', 0.6); })();
    const S = (id, namn, x, y, rest) => Object.assign({ id, tillstand: namn ? 'klar' : 'ny', namn, saker: !!namn, x, y, w: 0.08, h: 0.11, tappad: false, vilar: true, kortlik: true }, rest || {});
    const ofrEl = id => [...gridEl.children].find(el => el._mat && el._mat.nyckel === 'o:' + id) || null;
    const kf = (el, egenskap) => !!el && el.getAnimations().some(a => a.effect.getKeyframes().some(f => f[egenskap] != null));
    const r = [S(41, 'Llanowar Elves', 0.2, 0.25)];
    avstamBord(r, false);
    const kN = mig.cards.find(c => c.spar === 41), eN = els().get(kN && kN.cid);
    const tN = eN && eN._matA && eN._matA.pos ? eN._matA.pos.effect.getKeyframes()[0].translate : '';
    ok('namnet i tid: kortet läggs ned färdigt från spelarens håll (opacitet, translate nedifrån, skala, grön ring)', !!eN && kf(eN, 'opacity') && /^0px 90px$/.test(tN) && kf(eN, 'scale') && kf(eN, 'boxShadow') && !ofrEl(41), eN ? anim(eN) + ' · ' + tN : 'inget kort');
    await vanta(600);
    /* Namnet dröjer. */
    tagEmotFoto({ spar: 42, b64: FOTO });
    r.push(S(42, null, 0.42, 0.25));
    avstamBord(r, false);
    ok('namnet dröjer: ingenting syns direkt', !ofrEl(42) && !gridEl.querySelector('.plats'), '');
    await vanta(420);
    ok('… inte heller efter 0,4 s', !ofrEl(42), '');
    await vanta(200);
    const o = ofrEl(42);
    const ram = o && o.querySelector(':scope > .ofram'), skarp0 = ram && ram.querySelector('.oskarp');
    ok('efter 0,5 s: ett oframkallat kort, utan namn, med kamerans foto helt suddigt (Claude läser, läge 1)', !!o && o.classList.contains('ofr') && !o.matches('.card') && !!o.querySelector('.ofram .ofsudd') && !ram.classList.contains('skarp') && !!skarp0 && getComputedStyle(skarp0).display === 'none' && !/Fencing|Llanowar|Forest/.test(o.outerHTML),
      o ? o.className + ' · ' + o.getAttribute('aria-label') : 'inget');
    const rs = ram && getComputedStyle(ram), ts = o && getComputedStyle(o.querySelector('.ofsudd')).transform;
    ok('… i Mesas egen ram (4 px #121417), fotot förstorat 1,18 (läge 1, MES-351)', !!rs && rs.borderTopWidth === '4px' && rs.borderTopColor === 'rgb(18, 20, 23)' && /^matrix\(1\.18, 0, 0, 1\.18/.test(ts || ''), rs ? `${rs.borderTopWidth} ${rs.borderTopColor} · ${ts}` : '');
    ok('… inte klickbart, ingen text, ingen etikett, ingen knapp', !o.classList.contains('fraga') && !o.textContent.trim() && !gridEl.querySelector(':scope > [data-ofr="42"]:not(.ofr)'), '');
    ok('… och det läggs ned (opacitet, skala)', !!o && kf(o, 'opacity') && kf(o, 'scale'), o ? anim(o) : '');
    const sudd = o && getComputedStyle(o.querySelector('.ofsudd')).filter;
    ok('hela fotot är suddigt, 12 px (sida 3, Suddighet Mellan), saturate .7 brightness .85 (MES-351)', /blur\(12px\) saturate\(0\.7\) brightness\(0\.85\)/.test(sudd || ''), sudd);
    await vanta(500);
    r[1] = S(42, 'Fencing Ace', 0.42, 0.25);
    avstamBord(r, false);
    const kF = mig.cards.find(c => c.spar === 42), eF = kF && els().get(kF.cid);
    ok('namnet kommer: kortet tar över det oframkallade kortets element', !!eF && eF === o && !ofrEl(42) && eF.matches('.card[data-cid]'), eF ? (eF === o ? 'samma element' : 'nytt element') : 'inget kort');
    const lager = eF && eF.querySelector(':scope > .ofram');
    ok('… och framkallas: fotot tonas bort på 300 ms', !!lager && lager.getAnimations().some(a => a.playState === 'running' && a.effect.getTiming().duration === 300), lager ? lager.getAnimations().map(a => a.effect.getTiming().duration).join(',') : 'inga lager');
    await vanta(400);
    ok('… efter 300 ms syns kortet, fotot är borta', !!lager && +getComputedStyle(lager).opacity === 0, lager ? getComputedStyle(lager).opacity : '');
    /* Aldrig något namn: i granskningen. */
    await vanta(300);
    tagEmotFoto({ spar: 43, b64: FOTO });
    r.push(S(43, null, 0.64, 0.25, { tillstand: 'okand', gissning: 'Serra Angel', cands: [{ name: 'Serra Angel', score: 0.4 }] }));
    avstamBord(r, false);
    await vanta(650);
    const u = ofrEl(43), mark = gridEl.querySelector(':scope > .ofrmark[data-ofr="43"]'), etik43 = gridEl.querySelector(':scope > .ofretik[data-ofr="43"]');   // egna element i brädet (MES-346, MES-351)
    ok('aldrig något namn: oframkallat med "NOT IDENTIFIED" och "Enter name", utan kamerans gissning', !!u && !!mark && !!etik43 && mark.textContent === 'Enter name' && mark.getAttribute('aria-label') === 'Enter the name of this card' && etik43.textContent === 'NOT IDENTIFIED' && mark.dataset.pend === u.dataset.pend && etik43.dataset.pend === u.dataset.pend && !/Serra/.test(u.outerHTML + mark.outerHTML + etik43.outerHTML), u ? u.textContent : 'inget');
    const ram43 = u && u.querySelector(':scope > .ofram'), sk43 = ram43 && ram43.querySelector('.oskarp'), mask43 = sk43 ? getComputedStyle(sk43).maskImage || getComputedStyle(sk43).webkitMaskImage : '';
    ok('… med skarp mitt som tonas in på 300 ms (läge 2)', !!ram43 && ram43.classList.contains('skarp') && getComputedStyle(sk43).display === 'block' && /radial-gradient/.test(mask43) && getComputedStyle(sk43).animationDuration === '0.3s', `${ram43 ? ram43.className : 'ingen ram'} · ${mask43.slice(0, 60)}`);
    /* Provets fönster är litet: vid fit är kortet under 120 px och etiketten dold (läge 6). Zooma in på kortet. */
    const zoomPa = async (el, z) => { const w = gridWrap.getBoundingClientRect(), q = el.getBoundingClientRect(); matZoomMot(z, q.left + q.width / 2 - w.left, q.top + q.height / 2 - w.top); await vanta(400); };
    const zFit = matVy(player()).z;
    await zoomPa(u, 1);
    const ur0 = u.getBoundingClientRect(), er0 = etik43.getBoundingClientRect(), mr0 = mark.getBoundingClientRect();
    ok('… etiketten överst på kortet (9 px under överkanten), knappen nederst', !etik43.classList.contains('dold') && Math.abs(er0.top - ur0.top - 9) <= 1.5 && mr0.bottom <= ur0.bottom && mr0.top > ur0.top + ur0.height / 2 && u.title === 'The camera couldn’t identify this card. Click to enter its name.',
      `etikett ${Math.round(er0.top - ur0.top)} px ned, knapp ${Math.round(mr0.top - ur0.top)}–${Math.round(mr0.bottom - ur0.top)} av ${Math.round(ur0.height)}`);
    ok('ingen platshållare och ingen laddtext på mattan', !gridEl.querySelector('.plats') && !/Reading|Asking Claude|Moving…/.test(gridEl.textContent), '');
    ok('raden "N cards to fill in" står inte där: kortet namnges på mattan (designytan Mesa Name This Card)', mig.pending.length === 1 && $('#pendBar').hidden, `${mig.pending.length} i granskningen, raden ${$('#pendBar').hidden ? 'dold' : 'synlig'}`);
    /* Motståndarna: bordsraden bär det oframkallade kortet som en post utan namn, med en liten suddig bild. */
    for (let i = 0; i < 20 && !(ofrLista()[0] || {}).liten; i++) await vanta(25);
    const delat = hogDelat(mig).filter(h => h.hog === 'ofr');
    ok('bordsraden: det oframkallade kortet som en post utan namn, med en liten bild (22 × 31)', delat.length === 1 && delat[0].name == null && delat[0].cands == null && !/Serra/.test(JSON.stringify(delat)) && OFR_BILD.test(delat[0].f || ''),
      JSON.stringify(delat.map(h => Object.assign({}, h, { f: h.f ? h.f.length + ' tecken' : null }))));
    const oppO = normalisera({ id: 'mattprov-opp-ofr', name: 'Sara', color: '#b782ff', plats: 2, lage: 'bord', cards: [], shots: [], shotIdx: 0, pending: [], pane: null, namnkalla: 'anvandare', version: 1 }, 1);
    const spelare0 = state.players.slice();
    state.players = [mig, oppO]; state.active = mig.id; bord.valt = 'all'; renderAll(true);
    fjarrBord({ game_id: spelLage.id, user_id: oppO.id, version: 2, kort: [{ cid: 'n1', flipped: 1, x: 40, y: 60, z: 1 }].concat(delat) });
    const oo = document.querySelectorAll('#oppMattor .ofr');
    ok('motståndaren ser det oframkallade kortet (den lilla bilden), och inget för hens nedvända kort', oo.length === 1 && oppO.cards.length === 1 && !!oo[0].querySelector('.ofram .ofoto') && !oo[0].querySelector('.ofrmark, .oskarp') && !document.querySelector('#oppMattor .ofretik'), `${oo.length} oframkallade, ${oppO.cards.length} kort`);
    state.players = spelare0; renderAll(true);
    /* Etiketten, knappen och kortet öppnar rutan, med riktiga klick: lassot fick inte ta dem (pekarfångsten). */
    await riktigtKlick(etik43);
    const sokE = document.querySelector('.ofrsok');
    ok('klicket på "NOT IDENTIFIED" öppnar sökrutan: "Enter card name", kamerans foto skarpt överst (läge 5)', !!sokE && ofrSok && ofrSok.pend === u.dataset.pend && sokE.querySelector('.sok-l').textContent === 'Enter card name' && sokE.getAttribute('aria-label') === 'Enter card name' && !!sokE.querySelector('.sok-foto img') && sokE.querySelector('.sok-foto img').src === FOTO && sokE.querySelector('.sok-foto img').getBoundingClientRect().width === 120,
      sokE ? sokE.textContent.slice(0, 60) : 'ingen ruta');
    ok('… knappen "Enter name" är dold medan rutan är öppen, etiketten står kvar', mark.classList.contains('dold') && getComputedStyle(mark).visibility === 'hidden' && !etik43.classList.contains('dold'), mark.className + ' · ' + etik43.className);
    ok('… pekaren på etiketten lyser upp kortet (läge 3)', u.classList.contains('pekad'), u.className);
    ofrSokStang();
    ok('rutan stängd: knappen är tillbaka', !mark.classList.contains('dold'), mark.className);
    await riktigtKlick(mark);
    ok('klicket på "Enter name" öppnar sökrutan', !!document.querySelector('.ofrsok') && ofrSok && ofrSok.pend === u.dataset.pend, '');
    ofrSokStang();
    await riktigtKlick(u);   // mitt på kortet: hela kortet öppnar rutan
    ok('pekaren på kortet: kortet och knappen lyser upp (läge 3)', u.classList.contains('pekad') && mark.classList.contains('pekad') && getComputedStyle(u).outlineWidth === '2px', `${u.className} · ${mark.className}`);
    const sok = document.querySelector('.ofrsok'), ur = u.getBoundingClientRect(), sr = sok && sok.getBoundingClientRect();
    ok('klicket öppnar sökrutan bredvid kortet, inte över det', !!sok && (sr.right <= ur.left || sr.left >= ur.right) && document.activeElement === sok.querySelector('.sok-in'), sr ? `ruta ${Math.round(sr.left)}–${Math.round(sr.right)}, kort ${Math.round(ur.left)}–${Math.round(ur.right)}` : 'ingen ruta');
    ok('… med leken först och inget förvalt (inga gissningar)', /From your deck/.test(sok.textContent) && sok.querySelectorAll('.sok-t').length === 3 && !sok.querySelector('.sok-t.on'), sok.textContent.slice(0, 80));
    const inp = sok.querySelector('.sok-in');
    inp.value = 'fen'; inp.dispatchEvent(new Event('input'));
    ok('autocomplete ur leken', [...sok.querySelectorAll('.sok-t')].map(b => b.textContent).join(',') === 'Fencing Ace' && !!sok.querySelector('.sok-t.on'), [...sok.querySelectorAll('.sok-t')].map(b => b.textContent).join(','));
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const kU = mig.cards.find(c => c.spar === 43), eU = kU && els().get(kU.cid);
    ok('det valda namnet: kortet framkallas i samma element, sökrutan stängd, granskningen tom', !!kU && kU.name === 'Fencing Ace' && eU === u && !!eU.querySelector(':scope > .ofram') && !document.querySelector('.ofrsok') && !mig.pending.length,
      kU ? `${kU.name}, ${eU === u ? 'samma element' : 'nytt element'}` : 'inget kort');
    matZoomMot(zFit, 0, 0); await vanta(300);
    /* Minskad rörelse (TIDSLINJER-E, tabellerna längst ner): bara toning — utspelet och det oframkallade
       kortet tonas in på 200 ms utan glid eller skala, framkallningen är linjär. */
    window.__mattLugn = true;
    const lugn = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (let i = 0; i < 100 && !lugn(); i++) await vanta(20);
    await vanta(400);
    r.push(S(44, 'Forest', 0.2, 0.6));
    avstamBord(r, false);
    const kL = mig.cards.find(c => c.spar === 44), eL = kL && els().get(kL.cid);
    const aL = eL ? anim(eL) : '';
    ok('minskad rörelse: utspelet bara tonas in (och den gröna kanten)', lugn() && /opacity/.test(aL) && !/translate|scale/.test(aL), aL || 'inga');
    tagEmotFoto({ spar: 45, b64: FOTO });
    r.push(S(45, null, 0.42, 0.6));
    avstamBord(r, false);
    await vanta(600);
    const oL = ofrEl(45), aO = oL ? anim(oL) : '';
    r[r.length - 1] = S(45, 'Serra Angel', 0.42, 0.6);
    avstamBord(r, false);
    const lL = oL && oL.querySelector(':scope > .ofram'), eas = lL ? lL.getAnimations().map(a => a.effect.getTiming().easing).join(',') : '';
    ok('minskad rörelse: det oframkallade kortet tonas in, framkallningen är linjär', !!oL && /opacity/.test(aO) && !/translate|scale/.test(aO) && eas === 'linear', `${aO} · ${eas}`);
    window.__mattLugn = false;
    for (let i = 0; i < 100 && lugn(); i++) await vanta(20);
    /* MES-346: tre oframkallade kort omlott, alla i granskningen. Etiketterna är egna element i brädet och läggs
       ut så att de inte täcker varandra; var och en syns överst där den står, och klicket öppnar sökrutan
       bredvid sitt eget kort. Kontrollen: på sina vanliga platser (--ofrdy borttaget) krockar de. */
    const tata = [61, 62, 63];
    tata.forEach((id, i) => r.push(S(id, null, 0.66 + 0.012 * i, 0.3 + 0.01 * i, { tillstand: 'okand', cands: [{ name: 'Forest', score: 0.4 }] })));
    avstamBord(r, false);
    await vanta(650);
    const etik = tata.map(id => gridEl.querySelector(`:scope > .ofrmark[data-ofr="${id}"]`));
    const rekt = el => el.getBoundingClientRect(), skar = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const par = f => etik.flatMap((a, i) => etik.slice(i + 1).map(b => f(rekt(a), rekt(b))));
    const fore = etik.every(Boolean) ? (() => { for (const el of etik) el.style.removeProperty('--ofrdy'); const k = par(skar).some(Boolean); ofrMarkLagg(); return k; })() : false;
    ok('kort omlott: utan utläggningen täcker etiketterna varandra (kontrollen)', fore, etik.map(el => el ? 'etikett' : 'ingen').join(','));
    ok('… med den: tre etiketter, ingen täcker en annan', etik.every(Boolean) && !par(skar).some(Boolean), etik.filter(Boolean).map(el => { const q = rekt(el); return `${Math.round(q.left)},${Math.round(q.top)}`; }).join(' '));
    const overst = el => { const q = rekt(el), t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return !!t && (t === el || el.contains(t)); };
    ok('… och var och en ligger överst där den står (går att läsa och klicka på)', etik.every(el => el && overst(el)), etik.map(el => el && overst(el) ? 'ja' : 'nej').join(','));
    /* MES-351, läge 9: en "NOT IDENTIFIED" som skulle täcka en knapp eller en annan etikett döljs. */
    await zoomPa(ofrEl(62), 0.8);
    const nid = tata.map(id => gridEl.querySelector(`:scope > .ofretik[data-ofr="${id}"]`)), syns = nid.filter(el => el && !el.classList.contains('dold'));
    const alla = syns.concat(etik.filter(Boolean)), tackt = alla.flatMap((a, i) => alla.slice(i + 1).map(b => skar(rekt(a), rekt(b)))).some(Boolean);
    ok('… "NOT IDENTIFIED" på alla tre, men ingen synlig etikett täcker en annan eller en knapp (läge 9)', nid.every(Boolean) && syns.length >= 1 && !tackt, `${syns.length} av ${nid.filter(Boolean).length} synliga`);
    /* Läge 6: liten zoom. Ett kort lägre än 120 px på skärmen visar knappen men inte etiketten. */
    matZoomMot(100 / MATTA.CH, 0, 0);
    const smal = gridEl.querySelector(':scope > .ofretik[data-ofr="61"]'), smalM = gridEl.querySelector(':scope > .ofrmark[data-ofr="61"]'), kh = ofrEl(61).getBoundingClientRect().height;
    ok('liten zoom: kortet lägre än 120 px, etiketten dold, knappen kvar (läge 6)', kh < 120 && !!smal && smal.classList.contains('dold') && !!smalM && !smalM.classList.contains('dold'), `kortet ${Math.round(kh)} px, etikett ${smal ? smal.className : 'ingen'}`);
    matZoomMot(zFit, 0, 0); await vanta(300);
    const mitt = etik[1], mittKort = ofrEl(62);
    if (mitt) await riktigtKlick(mitt);
    const sok2 = document.querySelector('.ofrsok'), kr = mittKort && rekt(mittKort), sr2 = sok2 && rekt(sok2);
    ok('klicket på den mittersta etiketten öppnar sökrutan för just det kortet, bredvid det', !!sok2 && ofrSok && ofrSok.pend === mitt.dataset.pend && mittKort.dataset.pend === mitt.dataset.pend && (sr2.right <= kr.left || sr2.left >= kr.right),
      sok2 ? `pend ${ofrSok && ofrSok.pend} / ${mitt.dataset.pend}, ruta ${Math.round(sr2.left)}–${Math.round(sr2.right)}, kort ${Math.round(kr.left)}–${Math.round(kr.right)}` : 'ingen ruta');
    ok('… och raden "N cards to fill in" står fortfarande inte där (tre kort i granskningen, alla på mattan)', mig.pending.length === 3 && $('#pendBar').hidden, `${mig.pending.length} i granskningen, raden ${$('#pendBar').hidden ? 'dold' : 'synlig'}`);
    /* Not a card (granskningsradens Discard, för ett kort i taget): kortet går, och kameran frågar inte mer om spåret. */
    const nej = sok2 && sok2.querySelector('[data-soknej]'), pend62 = mitt && mitt.dataset.pend;
    if (nej) await riktigtKlick(nej);
    avstamBord(r, false);
    await vanta(50);
    ok('Not a card i sökrutan: kortet och dess etikett går, granskningen har de två andra, och spåret frågas inte igen', !!nej && !ofrEl(62) && !gridEl.querySelector(':scope > .ofrmark[data-ofr="62"]') && !document.querySelector('.ofrsok')
      && mig.pending.length === 2 && !mig.pending.some(q => q.id === pend62 || q.spar === 62) && borttagna.has(62) && !!ofrEl(61) && !!ofrEl(63),
      `${nej ? 'knapp' : 'ingen knapp'}, ${mig.pending.length} i granskningen, oframkallade ${[61, 62, 63].filter(id => ofrEl(id)).join(',')}`);
    /* Sökrutan, Jespers beslut 2026-10-09: stavfel hittar lekens kort, och ett kort utanför leken läggs till i leken
       när det väljs. Scryfall, uppslaget och lekens sparning är attrapper här — det som prövas är att rätt
       ändring går till leken som spelas. */
    {
      const lek0 = lekKort, lekId0 = mig.lekId, sf0 = SF.autocomplete, lu0 = lookup, hr0 = lekHamtaRad, sk0 = lekSparaKo, es0 = lekEfterSpar;
      let sparat = null;
      try {
        lekKort = [{ name: 'Lightning Bolt', sid: 'lb' }, { name: 'Serra Angel', sid: 'sa' }, { name: 'Forest', sid: 'fo' }];
        mig.lekId = 'lekprov';
        SF.autocomplete = q => Promise.resolve({ data: /counter/i.test(q) ? ['Counterspell'] : [] });
        lookup = async n => ({ name: n, id: 'cs1', ci: ['U'], faces: [{ img: { small: 'liten.jpg' } }] });
        lekHamtaRad = async id => ({ id, namn: 'Prov', kort: [], ts: 1 });
        lekSparaKo = async (id, bas, ops) => { sparat = { id, ops }; return { ok: true, rad: Object.assign({}, bas, { kort: [ops[0].kort] }) }; };
        lekEfterSpar = () => {};
        const pend61 = (gridEl.querySelector(':scope > .ofrmark[data-ofr="61"]') || {}).dataset;
        ofrSokOppna(pend61 && pend61.pend);
        const skriv = async t => { ofrSok.inp.value = t; ofrSok.inp.dispatchEvent(new Event('input')); await vanta(30); };
        await skriv('Lighting Bolt');
        const stav = ofrSok && ofrSok.traffar.map(t => t.namn + (t.lek ? '' : ' (alla)')).join(',');
        ok('sökrutan: stavfelet "Lighting Bolt" hittar Lightning Bolt i leken', stav === 'Lightning Bolt', stav);
        await skriv('Counterspell');
        const grp = ofrSok && ofrSok.res.textContent;
        const knapp = ofrSok && ofrSok.res.querySelector('[data-soki="0"]');
        ok('… ett kort utanför leken söks bland alla kort och säger att det läggs till i leken', !!knapp && /Counterspell/.test(knapp.textContent) && /adds to your deck/i.test(grp), grp);
        if (knapp) await riktigtKlick(knapp);
        await vanta(60);
        const op = sparat && sparat.ops[0];
        ok('… och valet namnger kortet och lägger till ett exemplar i leken som spelas', !!op && sparat.id === 'lekprov' && op.typ === 'antal' && op.name === 'Counterspell' && op.d === 1 && op.sb === false && op.kort.sid === 'cs1'
          && mig.cards.some(c => c.name === 'Counterspell'), JSON.stringify(sparat));
      } finally {
        lekKort = lek0; mig.lekId = lekId0; SF.autocomplete = sf0; lookup = lu0; lekHamtaRad = hr0; lekSparaKo = sk0; lekEfterSpar = es0;
      }
    }
    /* AI-brytaren gäller telefonen (Jespers beslut 2026-10-09): datorn skickar sin inställning när telefonens
       bord säger något annat, och telefonen tar den. Kanalen är en attrapp. */
    {
      const sk0 = Moln.sandKam, in0 = Moln.inloggad, id0 = Moln.minId, auto0 = prefs.aiAuto, chk0 = AI.checked, lage0 = kamLage;
      const skickat = [];
      try {
        Moln.sandKam = (typ, data) => { skickat.push([typ, data]); return true; };
        Moln.inloggad = () => true; Moln.minId = () => 'jag';
        AI.checked = true; prefs.aiAuto = false; aiTillTelSenast = 0;
        aiJamforTelefonen(true);
        aiJamforTelefonen(true);   // inom tre sekunder: inget nytt
        aiJamforTelefonen(false);  // samma som datorn: inget
        aiJamforTelefonen(undefined);   // telefon med äldre kod: inget
        ok('AI-brytaren: telefonen har den på, datorn av → datorn skickar av, en gång', skickat.length === 1 && skickat[0][0] === 'ai' && skickat[0][1].pa === false, JSON.stringify(skickat));
        prefs.aiAuto = true; kamLage = true;
        kamKommando({ typ: 'ai', pa: false, av: 'jag', fran: 'dator' });
        const tog = prefs.aiAuto;
        prefs.aiAuto = true;
        kamKommando({ typ: 'ai', pa: false, av: 'någon annan', fran: 'dator' });
        ok('… telefonen tar datorns av, men bara från min egen dator', tog === false && prefs.aiAuto === true, `tog ${tog}, främling ${prefs.aiAuto}`);
        /* Allt annat som kamFragaAI kräver är uppfyllt (serverns AI, poolen, en bild): det som stoppar frågan är brytaren. */
        const mode0 = AI.mode, idx0 = Pool.idx, n0 = kamAiTider.length;
        try {
          AI.mode = 'server'; Pool.idx = Pool.idx || { names: [] }; prefs.aiAuto = false;
          ok('… och kameran frågar då inte Claude', kamFragaAI(document.createElement('canvas'), 1) === false && kamAiTider.length === n0 && kamAiVantar === 0);
        } finally { AI.mode = mode0; Pool.idx = idx0; }
      } finally {
        Moln.sandKam = sk0; Moln.inloggad = in0; Moln.minId = id0; prefs.aiAuto = auto0; AI.checked = chk0; kamLage = lage0; savePrefs();
      }
    }
    ofrSokStang();
    /* MES-351, läge 9 där etiketterna MÅSTE krocka: tre oframkallade kort på samma rad, tätt i sidled, inzoomat så
       att korten är över 120 px (då döljs ingen etikett för storlekens skull). Minst en "NOT IDENTIFIED" döljs, och
       ingen synlig täcker en knapp eller en annan etikett. Kontrollen: en dold etikett behåller sin ruta
       (visibility:hidden), och på de rutorna hade etiketterna täckt varandra eller en knapp. */
    const tat9 = [64, 65, 66];
    tat9.forEach((id, i) => r.push(S(id, null, 0.48 + 0.02 * i, 0.45, { tillstand: 'okand', cands: [{ name: 'Forest', score: 0.4 }] })));
    avstamBord(r, false);
    await vanta(650);
    /* Zooma och flytta vyn så att kortet står mitt i fönstret (vyn kan stå förskjuten efter tidigare prov). */
    const centrera = async (el, z) => {
      await zoomPa(el, z);
      const p = player(), v = matVy(p), w = gridWrap.getBoundingClientRect(), q = rekt(el);
      matVyFor(p).pan = clampPan({ x: v.pan.x + (w.left + w.width / 2) - (q.left + q.width / 2), y: v.pan.y + (w.top + w.height / 2) - (q.top + q.height / 2) }, v.z, v.board, v.vp, v.ram);
      matSkriv(p); await vanta(400);
    };
    if (ofrEl(65)) await centrera(ofrEl(65), Math.max(1, 130 / MATTA.CH));
    const skarT = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    const synligaKnappar = () => [...gridEl.querySelectorAll(':scope > .ofrmark[data-ofr]')].filter(el => !el.classList.contains('dold'));
    const tacker = (el, ovriga) => ovriga.some(b => b !== el && skarT(rekt(el), rekt(b)));
    const etik9 = tat9.map(id => gridEl.querySelector(`:scope > .ofretik[data-ofr="${id}"]`)), kh9 = tat9.map(id => ofrEl(id) ? Math.round(rekt(ofrEl(id)).height) : 0);
    const dold9 = etik9.filter(el => el && el.classList.contains('dold'));
    const allaSyn = [...gridEl.querySelectorAll(':scope > .ofretik[data-ofr]')].filter(el => !el.classList.contains('dold'));
    const synTackt = allaSyn.filter(el => tacker(el, allaSyn.concat(synligaKnappar())));
    const utanDolj = etik9.every(Boolean) && etik9.some(el => tacker(el, etik9.concat(synligaKnappar())));
    ok('läge 9, tät rad: korten över 120 px, minst en "NOT IDENTIFIED" dold för att den skulle täcka något', etik9.every(Boolean) && kh9.every(h => h >= OFR_ETIK_MIN) && dold9.length >= 1,
      `kort ${kh9.join('/')} px, ${etik9.filter(el => el && !el.classList.contains('dold')).length} synliga, ${dold9.length} dolda`);
    ok('… ingen synlig etikett täcker en knapp eller en annan etikett', etik9.every(Boolean) && !synTackt.length, synTackt.map(el => el.dataset.ofr).join(',') || '');
    ok('… kontrollen: utan döljningen hade etiketterna täckt varandra eller en knapp', utanDolj, '');
    /* Sökrutan öppen på ett kort i den täta raden: dess knapp döljs men läggs ut som om den syntes, så att
       grannarnas knappar och etiketter står kvar. Kortet vars knapp läggs ut först (ankaret överst, sedan till
       vänster: samma ordning som ofrMarkLagg) — utan rättelsen flyttade grannarna in på dess plats. */
    const knapp9 = tat9.map(id => gridEl.querySelector(`:scope > .ofrmark[data-ofr="${id}"]`)).filter(Boolean)
      .sort((a, b) => (parseFloat(a.style.top) - parseFloat(b.style.top)) || (parseFloat(a.style.left) - parseFloat(b.style.left)));
    const forst9 = knapp9[0], fId = forst9 && forst9.dataset.ofr;
    const lage9 = () => { const g = gridEl.getBoundingClientRect(); return [...gridEl.querySelectorAll(':scope > .ofrmark[data-ofr], :scope > .ofretik[data-ofr]')]
      .filter(el => !(el.dataset.ofr === fId && el.classList.contains('ofrmark')))
      .map(el => { const q = rekt(el); return `${el.dataset.ofr}${el.classList.contains('ofrmark') ? 'k' : 'e'}${el.classList.contains('dold') ? '·dold' : ''}@${Math.round(q.left - g.left)},${Math.round(q.top - g.top)}`; }).join(' '); };
    const fore9 = lage9();
    if (forst9) await riktigtKlick(forst9);
    const oppen9 = !!document.querySelector('.ofrsok') && !!ofrSok && !!forst9 && ofrSok.pend === forst9.dataset.pend, under9 = lage9();
    const forstK = () => gridEl.querySelector(`:scope > .ofrmark[data-ofr="${fId}"]`);
    ok('sökrutan öppen i en tät rad: dess knapp är dold, grannarnas knappar och etiketter står kvar (samma ruta, samma klass)', oppen9 && !!forstK() && forstK().classList.contains('dold') && knapp9.length === 3 && fore9 === under9,
      (fore9 === under9 ? `kort ${fId}` : `före ${fore9} · under ${under9}`) + ` · ruta ${oppen9}, knapp ${forstK() ? forstK().className : 'ingen'}, ${knapp9.length} knappar`);
    ofrSokStang();
    const efter9 = lage9();
    ok('… och när rutan stängs står allt där det stod', !!forstK() && !forstK().classList.contains('dold') && efter9 === fore9, efter9 === fore9 ? '' : `före ${fore9} · efter ${efter9}`);
    matZoomMot(zFit, 0, 0); await vanta(300);
    /* Läge 7: ett tappat oframkallat kort (kamGrund = 0, spåret tappat). Etiketten står 9 px under den vridna
       rutans överkant och knappen strax ovanför dess nederkant, båda raka (bara skala och förskjutning). */
    r.push(S(67, null, 0.88, 0.6, { tillstand: 'okand', tappad: true, w: 0.11, h: 0.08, cands: [{ name: 'Forest', score: 0.4 }] }));
    avstamBord(r, false);
    await vanta(650);
    const t7 = ofrEl(67);
    if (t7) await zoomPa(t7, Math.max(1, 140 / MATTA.CW));
    const e7 = gridEl.querySelector(':scope > .ofretik[data-ofr="67"]'), m7 = gridEl.querySelector(':scope > .ofrmark[data-ofr="67"]');
    const rak = el => { const s = getComputedStyle(el), m = /^matrix\(([^)]+)\)$/.exec(s.transform), v = m ? m[1].split(',').map(Number) : null;
      return (s.transform === 'none' || (!!v && Math.abs(v[1]) < 1e-6 && Math.abs(v[2]) < 1e-6)) && (!s.rotate || s.rotate === 'none' || parseFloat(s.rotate) === 0); };
    const ur7 = t7 && rekt(t7), er7 = e7 && rekt(e7), mr7 = m7 && rekt(m7);
    ok('läge 7, tappat kort: etiketten 9 px under den vridna rutans överkant, knappen strax ovanför dess nederkant, båda raka',
      !!ur7 && !!er7 && !!mr7 && ur7.width > ur7.height && !e7.classList.contains('dold') && Math.abs(er7.top - ur7.top - 9) <= 1.5 && ur7.bottom - mr7.bottom >= 0 && ur7.bottom - mr7.bottom <= 10 && rak(e7) && rak(m7),
      ur7 && er7 && mr7 ? `ruta ${Math.round(ur7.width)}×${Math.round(ur7.height)}, etikett ${(er7.top - ur7.top).toFixed(1)} px ned${e7.classList.contains('dold') ? ' (dold)' : ''}, knapp ${(ur7.bottom - mr7.bottom).toFixed(1)} px över nederkanten, ${getComputedStyle(e7).transform} / ${getComputedStyle(m7).transform}` : `kort ${!!t7}, etikett ${!!e7}, knapp ${!!m7}`);
    matZoomMot(zFit, 0, 0); await vanta(300);
    /* Läge 8: antalets fråga (overTak). Leken har ett Lightning Bolt och det ligger redan på bordet; ett nytt spår
       med samma namn blir frågan "Another Lightning Bolt?" — kortet är identifierat, så ingen "NOT IDENTIFIED". */
    const lekKort0 = lekKort, lekTal0 = lekTal;
    lekKort = lekKort.concat([{ name: 'Lightning Bolt', n: 1 }]); sattLekTal(lekKort);
    r.push(S(68, 'Lightning Bolt', 0.6, 0.85));
    avstamBord(r, false);
    await vanta(300);
    const lagd8 = mig.cards.filter(c => c.name === 'Lightning Bolt').length;
    r.push(S(69, 'Lightning Bolt', 0.8, 0.85));
    avstamBord(r, false);
    await vanta(650);
    const o8 = ofrEl(69), m8 = gridEl.querySelector(':scope > .ofrmark[data-ofr="69"]'), e8 = gridEl.querySelector(':scope > .ofretik[data-ofr="69"]');
    ok('läge 8, antalets fråga: knappen "Another Lightning Bolt?", ingen "NOT IDENTIFIED"', lagd8 === 1 && mig.pending.some(q => q.spar === 69 && q.overTak) && !!o8 && !!m8 && m8.textContent === 'Another Lightning Bolt?' && !e8,
      `${lagd8} på bordet, fråga ${mig.pending.some(q => q.spar === 69 && q.overTak)}, kort ${!!o8}, knapp ${m8 ? m8.textContent : 'ingen'}, etikett ${e8 ? 'finns' : 'ingen'}`);
    lekKort = lekKort0; lekTal = lekTal0;
  } catch (e) { ok('framkallningen: avsnittet gick att köra', false, String(e && e.message || e).slice(0, 200)); }
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
      /* Riktiga musklick (window.__mattKlick, riktigtKlick i provet): Chrome får tryck och släpp som från en mus,
         så att pekarfångsten (setPointerCapture) gäller som för en spelare. En syntetisk el.click() går förbi
         pointerdown — så missade provet att lassot svalde klicket på "Name this card". */
      let klickNr = 0;
      const vakt = (async () => {
        let pa = false;
        const slut = Date.now() + 120000;
        while (!provKlart && Date.now() < slut) {
          const v = await c.cdp('Runtime.evaluate', { expression: '[window.__mattLugn, window.__mattKlick || null]', returnByValue: true }).catch(() => null), [x, k] = (v && v.result.value) || [];
          if (x === true && !pa) { pa = true; await c.cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); }
          if (x === false && pa) { pa = false; await c.cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] }); }
          if (k && k.nr !== klickNr) {
            klickNr = k.nr;
            await c.cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: k.x, y: k.y });
            await c.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: k.x, y: k.y, button: 'left', buttons: 1, clickCount: 1 });
            await c.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: k.x, y: k.y, button: 'left', buttons: 0, clickCount: 1 });
            await c.cdp('Runtime.evaluate', { expression: `window.__mattKlickKlar = ${k.nr}` });
          }
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

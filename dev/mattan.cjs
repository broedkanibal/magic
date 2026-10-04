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
  klick('pointerdown'); klick('pointerup');
  ok('ett klick till = untap', hk.tapped === 0, 'tapped ' + hk.tapped);

  /* Nya vyer ritas på plats (granskningen av steg 2, fynd 1): ingen zoom
     glider in efter en ritning medan mattan var dold (här), eller i ett nytt
     parti (sist). Brädets transform ska ha ändrats — annars mäts ingenting. */
  await vanta(450);
  const gar = el => el.getAnimations().some(a => a.playState === 'running');
  visaVy('hem'); renderAll(true);
  const tDold = gridEl.style.transform;
  visaVy('app'); renderAll(true);
  ok('efter en ritning medan mattan var dold ritas zoomen på plats', gridEl.style.transform !== tDold && !gar(gridEl), `${tDold} → ${gridEl.style.transform}`);

  /* Mattans zoom: fit som krymper när ett kort läggs långt ut glider (i en
     synlig vy under spelet). */
  await vanta(450);
  const ny = normaliseraKort({ cid: 'mattprov-ute', name: 'Island', x: 3400, y: 2600, z: 10, tapped: 0, cts: [] }, mig.cards.length);
  const zFore = matVy(mig).z;
  mig.cards.push(ny); renderAll(true);
  const zEfter = matVy(mig).z;
  ok('zoomen ändrades och glider (brädets transform)', zEfter < zFore && gridEl.getAnimations().some(a => a.playState === 'running'), `${zFore.toFixed(3)} → ${zEfter.toFixed(3)}`);

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
  state.players = [mig, opp]; state.active = mig.id; bord.valt = 'all';
  renderAll(true);
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
    } else {
      /* Minskad rörelse slås på mitt i provet (window.__mattLugn): Chrome
         emulerar mediefrågan, så att appens matLugn() läser den på riktigt. */
      let provKlart = false;
      const r0 = c.cdp('Runtime.evaluate', { expression: '(' + PROV.toString() + ')()', awaitPromise: true, returnByValue: true }).finally(() => { provKlart = true; });
      const vakt = (async () => {
        let pa = false;
        for (let i = 0; i < 4000 && !provKlart; i++) {
          const v = await c.cdp('Runtime.evaluate', { expression: 'window.__mattLugn', returnByValue: true }).catch(() => null), x = v && v.result.value;
          if (x === true && !pa) { pa = true; await c.cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); }
          if (x === false && pa) { await c.cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] }); return; }
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

#!/usr/bin/env node
/* Leken bland korten på datorn (MES-334 steg 3).

   Kör:  node dev/leken.cjs              bänken (dev/kolla.sh)
         node dev/leken.cjs --bild <mapp>  dessutom skärmbilder av mattan (JPEG) i varje steg
         node dev/leken.cjs --visa       ett fönster i stället för huvudlös Chrome

   Appen själv i en huvudlös Chrome, utan telefon och utan inloggning (minnet
   "kamerans datorsida provas utan telefon"), som dev/mattan.cjs: ett spel i
   Mirror my table med kameran ansluten och uppstarten klar UTAN library-ruta
   (uppstartens steg 4 satte ingen). Telefonens lek matas in genom
   tagEmotLek, som kamTogsEmot gör med fältet lek i varje bord, och
   telefonens kort genom avstamBord. Provet går designytans sida 5 ("Mesa
   Piles From Play") steg för steg:
     1 · ingen lek: mitt på mattan "Put your library on the table"
     2 · leken ligger: texten byter till "Play your first card when you're
         ready" i samma element och stil, och leken ligger bland korten (D1:
         högen med brickan Library N, ingen ram), dagens fasta hög är borta
     2 · klick på leken: menyn med Not my library → högen blir ett nedvänt
         kort med It's my library, texten tillbaka till steg 1; telefonen får
         lekinte (och lekja tillbaka)
     7 · leken plockas upp: Library · Picked up, skuggan står kvar, texten
         likaså; läggs den ner någon annanstans glider den dit (samma element)
     3 · första kortet: texten försvinner
   och sedan: bordsraden bär leken som en post utan namn, en motståndare ser
   den i sin matta (sleeves eller baksidan, inget namn, ingen meny), dagens
   flöde med library-ruta är orört, och nedvända kort får bordets sleeves.

   Egen liten filserver på 127.0.0.1 och en port som systemet väljer, egen
   tillfällig Chrome-profil, och nätet utanför datorn spärrat. Slutkod 1 om
   något faller, 2 om Chrome inte går att starta. .cjs eftersom package.json
   säger "type": "module". */
'use strict';
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os'), http = require('http');
const ROT = path.join(__dirname, '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const VISA = process.argv.includes('--visa'), BILD = arg('--bild', '');
const FIL = path.resolve(arg('--fil', path.join(ROT, 'index.html')));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const vanta = ms => new Promise(r => setTimeout(r, ms));

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
async function chrome() {
  if (!fs.existsSync(CHROME)) { console.error('leken: hittar inte Chrome på ' + CHROME + ' (sätt CHROME=…)'); process.exit(2); }
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-leken-'));
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

/* Provet i sidan, i steg: varje steg returnerar [namn, ok, detalj]-rader och
   lämnar sidan i ett läge som en skärmbild kan tas av (--bild). */
const PROV = async steg => {
  const rad = [], ok = (namn, villkor, detalj) => rad.push([namn, !!villkor, detalj || '']);
  const vanta = ms => new Promise(r => setTimeout(r, ms));
  const W = window;
  const mig = () => minSpelare();
  const lekEl = () => gridEl.querySelector('.lekhog');
  const text = () => { const e = $('#emptyHand'); return e && !e.classList.contains('hide') ? e.textContent.trim() : null; };
  const anim = el => el ? el.getAnimations().map(a => Object.keys((a.effect.getKeyframes() || [])[0] || {}).filter(k => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)).join('+')).join(',') : '';
  const lek = (lage, id, ruta, extra) => Object.assign({ lage, id, ruta, farg: { r: 47, g: 138, b: 82, magic: false }, ute: [], grund: 'lek' }, extra || {});
  const R1 = { x: 0.58, y: 0.5, w: 0.1, h: 0.22 }, R2 = { x: 0.22, y: 0.55, w: 0.1, h: 0.22 };
  if (steg === 0) {
    /* Ett spel i Mirror my table, kameran ansluten, uppstarten klar utan library-ruta. */
    visaVy('app');
    const p = player();
    spelLage = { id: 'lekprov', kod: 'LEK001', namn: 'Prov', vard: p.id, mig: p.id };
    p.lage = 'bord'; p.cards = []; p.pending = []; p.plats = 1; p.lekId = 'lek1'; p.lek = { id: 'lek1', namn: 'Elves', antal: 40 };
    state.players = [p]; state.active = p.id;
    oppSatt({ klar: true });
    kamAnsluten = true; kamFas = ''; kamGrund = 0; prefs.autoLage = true; kamBibRad = null; kamGravRad = null;
    W.__sant = []; W.__sparat = [];
    Moln.sandKam = (typ, data) => { W.__sant.push(Object.assign({ typ }, data)); return true; };
    Moln.sparaBord = (id, kort, dolt) => { W.__sparat.push({ kort, dolt }); return Promise.resolve(true); };
    renderAll(true);
    tagEmotLek(lek('ingen', null, null, { farg: null, grund: null }));
    ok('1 · ingen lek: texten mitt på mattan', text() === 'Put your library on the table', text());
    ok('1 · ingen hög på mattan, och "Play your first card" nämns inte', !lekEl() && !/first card/i.test(text() || ''));
    ok('1 · ingen fast hög heller (sida 5, tavla 1: bara texten)', $('#bibHog').hidden);
    W.__textEl = $('#emptyHand').querySelector('.tomlek');
  }
  if (steg === 1) {
    const fastHog = () => !$('#bibHog').hidden;
    tagEmotLek(lek('nere', 1, R1));
    const el = lekEl(), m = mig();
    ok('2 · leken ligger: texten byter', text() === "Play your first card when you're ready", text());
    ok('2 · samma stil och plats (klassen tomlek)', !!$('#emptyHand .tomlek') && $('#emptyHand .tomlek b').textContent === "Play your first card when you're ready");
    ok('2 · leken bland korten på mattan (en post i brädet)', !!el && el.parentElement === gridEl && el._mat && el._mat.nyckel === 'h:bib', el ? el.className : 'ingen');
    ok('2 · brickan bara "Library", inget tal (Jespers beslut 2026-10-04), och aria-label likaså', !!el && el.querySelector('.lekbr.ledig').textContent.trim() === 'Library' && !el.querySelector('.lekbr b') && /^Library\. Open the menu$/.test(el.getAttribute('aria-label') || ''), el ? el.querySelector('.lekbr.ledig').textContent + ' | ' + el.getAttribute('aria-label') : '');
    ok('2 · D1: ingen ram, ingen streckad kant (högen ritad i sleevens färg)', !!el && getComputedStyle(el).borderStyle === 'none' && !!el.querySelector('.lekslv') && /--s1:#/.test(el.getAttribute('style')), el ? el.getAttribute('style') : '');
    ok('2 · dagens fasta hög är borta', !fastHog());
    ok('2 · mattan visar leken rak (ingen rotation)', !!el && !/rotate/.test(el.getAttribute('style') || '') && getComputedStyle(el).transform === 'none');
    ok('2 · läget ur kameran (kamTillMatta) och delat', m.bibHog && m.bibHog.x != null && m.bibHog.y != null && m.bibHog.upp === 0, JSON.stringify(m.bibHog && { x: Math.round(m.bibHog.x), y: Math.round(m.bibHog.y), upp: m.bibHog.upp }));
    W.__lekEl = el;
  }
  if (steg === 2) {
    /* Bordsraden: leken som en post utan namn. */
    sparaNu();
    const sist = W.__sparat[W.__sparat.length - 1], post = sist && sist.kort.find(k => k.hog === 'bib');
    ok('raden bär leken som en post bland korten, utan namn', !!post && post.cid === 'hog:bib' && post.name === undefined && post.f === '47,138,82' && post.x === Math.round(mig().bibHog.x), JSON.stringify(post));
    const ut = delaUtHogar(sist.kort);
    ok('och den lyfts ut på vägen in (inget som räknar kort ser den)', ut.kort.every(k => k.hog == null) && !!ut.bibHog && ut.bibHog.farg && ut.bibHog.farg.g === 138);
    /* Granskningen runda 1, fynd 2: raden i camera_setups bär telefonens grundläge, inte det gamla null. */
    const gr0 = kamGrund, rad0 = kamGrundRad; kamGrund = 90; kamGrundRad = null;
    const g1 = kamRutaRad().grund; kamGrund = null; const g2 = kamRutaRad().grund; kamGrund = gr0; kamGrundRad = rad0;
    ok('raden (kamRutaRad) bär telefonens grundläge när det finns', g1 === 90 && g2 === null, `med 90 → ${g1}, utan → ${g2}`);
    /* Klick på leken: menyn med Not my library. */
    const el = lekEl();
    el.click();
    const meny = $('#zonPerm .lekmeny');
    ok('2 · klick på leken: menyn med Not my library', !!meny && /Library/.test(meny.querySelector('.rub').textContent) && /Not my library/.test(meny.textContent) && /It's a face-down card/.test(meny.textContent), meny ? meny.textContent.replace(/\s+/g, ' ') : 'ingen meny');
  }
  if (steg === 3) {
    $('#zonPerm .lekmeny [data-lekmeny="inte"]').click();
    const s = W.__sant.find(x => x.typ === 'lekinte');
    ok('Not my library: telefonen får lekinte med högens id', !!s && s.id === 1, JSON.stringify(W.__sant));
    ok('Not my library: menyn stängs, leken är borta från mattan', !$('#zonPerm .lekmeny') && !lekEl() && !mig().bibHog);
    ok('Not my library: texten går tillbaka till steg 1', text() === 'Put your library on the table', text());
    const ute = gridEl.querySelector('.lekute');
    ok('Not my library: högen blir ett nedvänt kort med It\'s my library', !!ute && /Face-down card/.test(ute.textContent) && !!ute.querySelector('[data-lekja="1"]') && !!ute.querySelector('.lekslv'), ute ? ute.textContent.replace(/\s+/g, ' ') : 'inget');
    /* En rapport från före klicket (telefonen har inte hunnit) gäller inte. */
    tagEmotLek(lek('nere', 1, R1));
    ok('en rapport från före klicket tar inte tillbaka leken', !lekEl() && !mig().bibHog);
    tagEmotLek(lek('ingen', null, null, { ute: [{ id: 1, ruta: R1 }], grund: null }));
    ok('telefonens svar: ingen lek, högen ute', !lekEl() && !!gridEl.querySelector('.lekute[data-lekute="1"]') && text() === 'Put your library on the table');
    /* Granskningen runda 1, fynd 6: bordets sleeves står kvar utan lek — på brädet och i raden (alla ser samma). */
    sparaNu();
    const rad6 = W.__sparat[W.__sparat.length - 1].kort, slv6 = rad6.find(k => k.hog === 'slv');
    ok('utan lek: bordets sleeves står kvar på brädet och i raden', gridEl.classList.contains('harslv') && !!slv6 && slv6.f === '47,138,82' && !rad6.some(k => k.hog === 'bib'), JSON.stringify(slv6));
  }
  if (steg === 4) {
    gridEl.querySelector('[data-lekja="1"]').click();
    const s = W.__sant.find(x => x.typ === 'lekja');
    ok("It's my library: telefonen får lekja, och högen är leken igen", !!s && s.id === 1 && !!lekEl() && !gridEl.querySelector('.lekute') && text() === "Play your first card when you're ready", JSON.stringify(s));
    tagEmotLek(lek('ingen', null, null, { ute: [{ id: 1, ruta: R1 }] }));   // från före klicket
    ok('en rapport från före It\'s my library tar inte bort leken', !!lekEl());
    tagEmotLek(lek('nere', 1, R1));
    W.__lekEl = lekEl();
  }
  if (steg === 5) {
    /* 7 · leken plockas upp: skuggan står kvar, brickan säger Library · Picked up, texten står kvar. */
    tagEmotLek(lek('upp', 1, R1));
    const el = lekEl();
    await vanta(450);
    const syns = q => el && getComputedStyle(el.querySelector(q)).opacity;
    ok('7 · upplockad: samma element, klassen upp', el === W.__lekEl && el.classList.contains('upp'));
    ok('7 · brickan Library · Picked up syns, Library N inte', syns('.lekbr.upptxt') === '1' && syns('.lekbr.ledig') === '0', `upptxt ${syns('.lekbr.upptxt')}, ledig ${syns('.lekbr.ledig')}`);
    ok('7 · skuggan står kvar, högen är lyft', +syns('.avtryck') > 0.4 && +syns('.lekkropp') < 0.1, `skugga ${syns('.avtryck')}, högen ${syns('.lekkropp')}`);
    ok('7 · texten står kvar', text() === "Play your first card when you're ready", text());
    ok('7 · delat med de andra (upp i raden)', hogDelat(mig())[0].upp === 1);
  }
  if (steg === 6) {
    /* Leken läggs ner någon annanstans: den glider dit, samma element. */
    const el = lekEl(), x0 = mig().bibHog.x;
    tagEmotLek(lek('nere', 1, R2));
    const el2 = lekEl();
    ok('leken lagd på ny plats: samma element, inte längre upplockad', el2 === el && !el2.classList.contains('upp'));
    ok('och den glider dit (translate)', mig().bibHog.x !== x0 && /translate/.test(anim(el2)), `x ${Math.round(x0)} → ${Math.round(mig().bibHog.x)}, ${anim(el2)}`);
  }
  if (steg === 7) {
    /* 3 · första kortet läggs ner: texten försvinner, leken ligger kvar. */
    avstamBord([{ id: 7, tillstand: 'klar', namn: 'Forest', saker: true, x: 0.2, y: 0.2, w: 0.08, h: 0.11, tappad: false, vilar: true }], false);
    ok('3 · första kortet: texten försvinner', text() === null, String(text()));
    ok('3 · leken ligger kvar bland korten', !!lekEl() && gridEl.querySelectorAll('.card[data-cid]').length === 1);
    /* Ett nedvänt kort på mattan i bordets sleeves (MES-305: fortfarande en baksida för andra). */
    const c = mig().cards[0]; c.flipped = 1; renderAll(true);
    const e = gridEl.querySelector('.card[data-cid].bak');
    ok('nedvänt kort: bordets sleeves på brädet', gridEl.classList.contains('harslv') && !!e && getComputedStyle(e.querySelector('.lekslv')).display === 'block' && getComputedStyle(e.querySelector('img')).visibility === 'hidden',
      e ? `harslv ${gridEl.classList.contains('harslv')}` : 'inget nedvänt kort');
    c.flipped = 0; renderAll(true);
  }
  if (steg === 8) {
    /* En motståndare: hens rad med leken som post (sleeves, upplockad) och ett kort. */
    const jag = mig();
    const opp = normalisera({ id: 'lekprov-opp', name: 'Sara', color: '#b782ff', plats: 2, lage: 'bord', lekId: 'l2', lek: { id: 'l2', namn: 'Blue', antal: 60 }, cards: [], shots: [], shotIdx: 0, pending: [], pane: null, namnkalla: 'anvandare', version: 1 }, 1);
    state.players = [jag, opp]; state.active = jag.id; bord.valt = 'all';
    renderAll(true);
    fjarrBord({ game_id: spelLage.id, user_id: opp.id, version: 2, kort: [
      { cid: 'o1', name: 'Delver of Secrets', x: 40, y: 60, z: 1, tapped: 0 },
      { cid: 'hog:bib', hog: 'bib', x: 420, y: 300, upp: 1, f: '30,60,160' }] });
    const s = document.querySelector('#oppMattor .obrade .lekhog');
    ok('motståndaren: hens kortlista utan lekposten', opp.cards.length === 1 && opp.cards[0].cid === 'o1' && !!opp.bibHog && opp.bibHog.upp === 1, `${opp.cards.length} kort, bibHog ${JSON.stringify(opp.bibHog)}`);
    ok('motståndaren: leken bland hens kort, upplockad, i hens sleeves', !!s && s.classList.contains('upp') && /--s1:#/.test(s.getAttribute('style')) && s.dataset.lekhog === '0' && !s.hasAttribute('tabindex'), s ? s.className : 'ingen');
    ok('motståndaren: inget namn i hens lek, och ingen fast library-hög bredvid', !!s && !/Delver/.test(s.outerHTML) && !document.querySelector('#oppMattor .ohogar .bib'), s ? s.getAttribute('aria-label') : '');
    s.click();
    ok('motståndarens lek har ingen meny', !$('#zonPerm .lekmeny'));
    fjarrBord({ game_id: spelLage.id, user_id: opp.id, version: 3, kort: [{ cid: 'o1', name: 'Delver of Secrets', x: 40, y: 60, z: 1, tapped: 0 }] });
    ok('motståndaren utan lek i raden: dagens fasta hög igen', !document.querySelector('#oppMattor .obrade .lekhog') && !!document.querySelector('#oppMattor .ohogar .bib'));
    /* Min lek står kvar på min matta i bordsvyn, och brädet rymmer den (i en låg ruta kan den ligga
       under kanten vid minsta zoomen, som ett kort längst ner i bilden — mattan går att dra dit). */
    { const e = lekEl(), v = matVy(jag), lr = lekRam(jag);
      ok('bordsvyn: min lek står kvar på min matta, och brädet rymmer den', !!e && !!lr && lr.x1 <= v.board.w && lr.y1 <= v.board.h, `bräde ${v.board.w}×${v.board.h}, leken ${JSON.stringify(lr)}`); }
    fjarrBord({ game_id: spelLage.id, user_id: opp.id, version: 4, kort: [
      { cid: 'o1', name: 'Delver of Secrets', x: 40, y: 60, z: 1, tapped: 0 },
      { cid: 'hog:bib', hog: 'bib', x: 420, y: 300, f: '30,60,160' }] });   // tillbaka på bordet, för skärmbilden
  }
  if (steg === 9) {
    state.players = [mig()]; bord.valt = null; renderAll(true);
    /* Uppstartens steg 4 satte en library-ruta: dagens flöde, orört. */
    kamBibRad = { x: 0.1, y: 0.6, w: 0.15, h: 0.3 };
    tagEmotLek(null);
    ok('med uppstartens ruta: ingen hög på mattan, dagens fasta hög står', !lekEl() && !mig().bibHog && !$('#bibHog').hidden);
    mig().cards = []; renderAll(true);
    ok('med uppstartens ruta: tomrutan som förut (ingen lek-text)', !/library/i.test(text() || ''), text());
    kamBibRad = null;
  }
  return rad;
};

(async () => {
  const srv = await server();
  const url = `http://127.0.0.1:${srv.address().port}/`;
  const c = await chrome();
  let kod = 0, n = 0, fel = 0;
  try {
    await c.cdp('Runtime.enable'); await c.cdp('Page.enable'); await c.cdp('Network.enable');
    await c.cdp('Network.setBlockedURLs', { urls: ['*scryfall*', '*supabase*', '*jsdelivr*', '*unpkg*', '*googleapis*', '*gstatic*', '*cdnjs*'] });
    await c.cdp('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
    await c.cdp('Page.navigate', { url });
    const t0 = Date.now();
    for (;;) {
      const r = await c.cdp('Runtime.evaluate', { expression: "document.readyState === 'complete' && typeof renderGrid === 'function' && typeof tagEmotLek === 'function'", returnByValue: true }).catch(() => null);
      if (r && r.result && r.result.value) break;
      if (Date.now() - t0 > 30000) throw new Error('appen laddade inte (tagEmotLek saknas)');
      await vanta(100);
    }
    await vanta(300);
    if (BILD) fs.mkdirSync(BILD, { recursive: true });
    const NAMN = ['1-ingen-lek', '2-leken-ligger', '2-menyn', '2-not-my-library', '2-its-my-library', '7-upplockad', '7-ny-plats', '3-forsta-kortet', 'motstandaren', 'uppstartens-ruta'];
    for (let s = 0; s < NAMN.length; s++) {
      const r = await c.cdp('Runtime.evaluate', { expression: '(' + PROV.toString() + ')(' + s + ')', awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(`steg ${s}: ` + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
      for (const [namn, ok, detalj] of r.result.value) { n++; if (!ok) fel++; console.log(`${ok ? 'OK ' : 'FEL'}  ${namn}${detalj ? '  (' + detalj + ')' : ''}`); }
      if (BILD) {
        await vanta(500);
        const sel = NAMN[s] === 'motstandaren' ? '#bord' : '#zonPerm';   // motståndarens matta står bredvid min i bordsvyn
        const z = await c.cdp('Runtime.evaluate', { expression: "(() => { const r = document.querySelector('" + sel + "').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()", returnByValue: true });
        const q = z.result.value;
        const bild = await c.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 72, clip: { x: q.x, y: q.y, width: q.w, height: q.h, scale: 0.7 } });
        fs.writeFileSync(path.join(BILD, `${String(s).padStart(2, '0')}-${NAMN[s]}.jpg`), Buffer.from(bild.data, 'base64'));
      }
    }
    for (const k of c.konsol) console.log('     ' + k);
    console.log(`leken: ${n - fel} OK, ${fel} FEL`);
    if (fel) kod = 1;
  } catch (e) { console.error('leken: ' + e.message); for (const k of c.konsol) console.error('     ' + k); kod = 1; }
  await c.stang(); srv.close();
  process.exit(kod);
})();

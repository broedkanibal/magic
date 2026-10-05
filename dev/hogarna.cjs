#!/usr/bin/env node
/* Högarna på datorn: graveyard-frågan och högarna bland korten (MES-334 sida 5, steg 4–5).

   Kör:  node dev/hogarna.cjs              bänken (dev/kolla.sh)
         node dev/hogarna.cjs --bild <mapp>  dessutom skärmbilder av mattan (JPEG) i varje steg
         node dev/hogarna.cjs --visa       ett fönster i stället för huvudlös Chrome

   Samma upplägg som dev/leken.cjs: appen i en huvudlös Chrome, ett spel i
   Mirror my table med kameran ansluten, uppstarten klar utan graveyard- och
   library-ruta. Telefonens lek matas in genom tagEmotLek och korten genom
   avstamBord, som kamTogsEmot gör. Provet går designytans sida 5:
     5 · Is this your graveyard?  sidoregeln (andra sidan om leken från
         landen, i lekens rad) ger frågan ovanför kortet; inget är graveyard
         före Yes; ett kort som läggs på högen hör till samma fråga; Yes gör
         korten till graveyard och ger telefonen högens ruta (MES-85)
     6 · No: menyn M1 — Permanent (korten ligger kvar; Mesa frågar en gång
         till när ett kort läggs ovanpå) och Ignore this spot (korten bort,
         Mesa följer inte platsen)
   Bara ägaren ser frågan: den delas inte i bordsraden.

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
  if (!fs.existsSync(CHROME)) { console.error('hogarna: hittar inte Chrome på ' + CHROME + ' (sätt CHROME=…)'); process.exit(2); }
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-hogarna-'));
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

/* Provet i sidan, i steg: varje steg returnerar [namn, ok, detalj]-rader och lämnar sidan i ett läge
   som en skärmbild kan tas av (--bild). */
const PROV = async steg => {
  const rad = [], ok = (namn, villkor, detalj) => rad.push([namn, !!villkor, detalj || '']);
  const vanta = ms => new Promise(r => setTimeout(r, ms));
  const W = window;
  const mig = () => minSpelare();
  const fragaEl = () => gridEl.querySelector('.gravfraga');
  const menyEl = () => gridEl.querySelector('.gravmeny');
  const kortNamn = z => mig().cards.filter(c => (z === 'grav') === (zonAv(c) === ZON_GRAV)).map(c => c.name);
  const namnPa = cids => cids.map(cid => (mig().cards.find(c => c.cid === cid) || {}).name).join(',');
  const lek = (lage, id, ruta) => ({ lage, id, ruta, farg: { r: 47, g: 138, b: 82, magic: false }, ute: [], grund: 'lek', forsta: true });
  /* Ett spår vars mitt ligger i (cx, cy): ett kort 0,1 × 0,22 av bilden, som leken. */
  const spar = (id, namn, cx, cy) => ({ id, tillstand: 'klar', namn, saker: true, x: cx - 0.05, y: cy - 0.11, w: 0.1, h: 0.22, tappad: false, vilar: true, sen: 10 });
  const R1 = { x: 0.40, y: 0.5, w: 0.1, h: 0.22 };            // leken, mitten (0,45; 0,61)
  const LAND = [spar(11, 'Forest', 0.6, 0.61), spar(12, 'Forest', 0.72, 0.61)];
  const nollGrav = () => { gravLage = null; gravSedda = new Set(); gravMenyOppen = false; try { localStorage.removeItem('sthv.grav.v1.' + spelLage.id); } catch (e) {} kamGravRad = null; };
  /* Ett bord från telefonen, en stund efter det förra (kortets ny-stämpel avgör vem som ligger under). */
  const stam = async lista => { await vanta(15); avstamBord(lista, false); };
  if (steg === 0) {
    visaVy('app');
    const p = player();
    spelLage = { id: 'hogprov', kod: 'HOG001', namn: 'Prov', vard: p.id, mig: p.id };
    p.lage = 'bord'; p.cards = []; p.pending = []; p.plats = 1; p.lekId = 'lek1'; p.lek = { id: 'lek1', namn: 'Elves', antal: 40 };
    state.players = [p]; state.active = p.id;
    oppSatt({ klar: true });
    kamAnsluten = true; kamFas = ''; kamGrund = 90; prefs.autoLage = true; kamBibRad = null; kamGravRad = null;
    W.__sant = []; W.__sparat = []; W.__kal = [];
    Moln.sandKam = (typ, data) => { W.__sant.push(Object.assign({ typ }, data)); return true; };
    Moln.sparaBord = (id, kort, dolt) => { W.__sparat.push({ kort, dolt }); return Promise.resolve(true); };
    Moln.sparaKalibrering = (id, ruta) => { W.__kal.push(ruta); return Promise.resolve(true); };
    nollGrav();
    renderAll(true);
    tagEmotLek(lek('nere', 1, R1));
    await stam(LAND);
    ok('landen till höger om leken: ingen fråga', !fragaEl() && !gravLageNu().fraga);
    await stam(LAND.concat([spar(21, 'Llanowar Elves', 0.3, 0.62)]));
    const f = fragaEl(), c = mig().cards.find(k => k.name === 'Llanowar Elves'), ce = c && gridEl.querySelector(`.card[data-cid="${c.cid}"]`);
    ok('5 · första kortet på andra sidan om leken, i lekens rad: "Is this your graveyard?  Yes · No"', !!f && /Is this your graveyard\?/.test(f.textContent) && !!f.querySelector('[data-gravsvar="ja"]') && !!f.querySelector('[data-gravsvar="nej"]'), f ? f.textContent : 'ingen fråga');
    const fr = f && f.getBoundingClientRect(), kr = ce && ce.getBoundingClientRect();
    ok('5 · rutan står ovanför kortet, mitt över det', !!fr && !!kr && fr.bottom <= kr.top + 1 && Math.abs((fr.left + fr.right) / 2 - (kr.left + kr.right) / 2) < 3,
      fr && kr ? `fråga ${Math.round(fr.left)}–${Math.round(fr.right)} / ${Math.round(fr.bottom)}, kort ${Math.round(kr.left)}–${Math.round(kr.right)} / ${Math.round(kr.top)}` : '');
    ok('5 · inget är graveyard före Yes: kortet ligger i spel', !!c && zonAv(c) !== ZON_GRAV && !!ce);
    sparaNu();
    const raden = JSON.stringify(W.__sparat[W.__sparat.length - 1]);
    ok('bara ägaren ser frågan: bordsraden bär ingen fråga', !/gravsvar|graveyard\?|fraga/i.test(raden));
  }
  if (steg === 1) {
    const id = gravLageNu().fraga.id;
    await stam(LAND.concat([spar(21, 'Llanowar Elves', 0.3, 0.62), spar(22, 'Wood Elves', 0.305, 0.625), spar(23, 'Serra Angel', 0.8, 0.3)]));
    const q = gravLageNu().fraga;
    ok('5 · ett kort som läggs på högen hör till samma fråga (ett kort långt bort gör det inte)', !!q && q.id === id && q.cids.length === 2, q ? namnPa(q.cids) : 'ingen fråga');
    ok('5 · frågan står kvar och blockerar inget (ingen modal)', !!fragaEl() && !document.querySelector('.ov.open'));
  }
  if (steg === 2) {
    W.__kal = [];
    fragaEl().querySelector('[data-gravsvar="ja"]').click();
    ok('5 · Yes: korten blir graveyard (det sist lagda överst)', kortNamn('grav').join(',') === 'Wood Elves,Llanowar Elves', kortNamn('grav').join(','));
    ok('5 · Yes: frågan är borta', !fragaEl() && !gravLageNu().fraga);
    const r = W.__kal[W.__kal.length - 1];
    ok('5 · Yes: telefonen får högens ruta (MES-85 mot högen där den ligger)', !!r && !!r.grav && r.grav.x < 0.26 && r.grav.x + r.grav.w > 0.35 && !!kamGravRad, JSON.stringify(r && r.grav));
    await stam(LAND.concat([spar(23, 'Serra Angel', 0.8, 0.3), spar(24, 'Ukud Cobra', 0.18, 0.62)]));
    ok('efter Yes frågar Mesa inte igen', !fragaEl() && !gravLageNu().fraga);
    /* 4 · I spel (steg 5, D1): graveyard bland korten där högen ligger, med brickan Graveyard N. */
    renderAll(true);
    const g = gridEl.querySelector('.gravd1');
    ok('4 · graveyard ligger bland korten (en post i brädet), ingen fast hög bredvid', !!g && g.parentElement === gridEl && g._mat && g._mat.nyckel === 'h:grav' && !manaRow.querySelector('.grav'), g ? g.className : 'ingen');
    ok('4 · brickan "Graveyard 2" på underkanten, översta kortet tonat och två kort i högen', !!g && /^Graveyard2$/.test(g.querySelector('.lekbr').textContent.replace(/\s+/g, '')) && !!g.querySelector('img.topp') && !!g.querySelector('img.u1') && /grayscale/.test(getComputedStyle(g.querySelector('img.topp')).filter), g ? g.querySelector('.lekbr').textContent : '');
    const lek = gridEl.querySelector('.lekhog'), gr = g && g.getBoundingClientRect(), lr = lek && lek.getBoundingClientRect();
    ok('4 · högen ligger där den ligger på bordet: till vänster om leken, i samma rad', !!gr && !!lr && gr.right <= lr.left + 2 && Math.abs((gr.top + gr.bottom) / 2 - (lr.top + lr.bottom) / 2) < lr.height * 0.4, gr && lr ? `högen ${Math.round(gr.left)}–${Math.round(gr.right)}, leken ${Math.round(lr.left)}–${Math.round(lr.right)}` : '');
    ok('4 · D1: ingen ram runt högen', !!g && getComputedStyle(g).borderStyle === 'none');
    g.click();
    await vanta(50);
    ok('4 · klick på högen tar upp korten i handen (solfjädern, som den fasta högen)', hf.src === ZON_GRAV && hf.fas !== 'stangd', `${hf.src} ${hf.fas}`);
    hfStang(); await vanta(400);
    sparaNu();
    const rad4 = W.__sparat[W.__sparat.length - 1].kort, post = rad4.find(k => k.hog === 'grav');
    ok('4 · bordsraden bär högens läge (inga namn — korten ligger i listan med zon grav)', !!post && post.cid === 'hog:grav' && post.name === undefined && post.x === Math.round(mig().gravHog.x), JSON.stringify(post));
  }
  if (steg === 3) {
    /* Reserven, och No → menyn M1 → Permanent. */
    mig().cards = []; nollGrav(); renderAll(true);
    await stam([spar(31, 'Ukud Cobra', 0.75, 0.3)]);
    await stam([spar(32, 'Pacifism', 0.752, 0.302)]);
    const q = gravLageNu().fraga;
    ok('reserven: ett kort rakt ovanpå ett annat ger frågan (kortet under först)', !!q && q.orsak === 'ovanpa' && namnPa(q.cids) === 'Ukud Cobra,Pacifism' && !!fragaEl(), q ? namnPa(q.cids) : 'ingen fråga');
    fragaEl().querySelector('[data-gravsvar="nej"]').click();
    const m = menyEl();
    ok('6 · No: menyn M1 i samma slags ruta — Permanent och Ignore this spot', !fragaEl() && !!m && /Not your graveyard\. What is it\?/.test(m.textContent) && /Permanent/.test(m.textContent) && /Back on the table where it lies/.test(m.textContent) && /Ignore this spot/.test(m.textContent) && /Mesa stops following this pile/.test(m.textContent), m ? m.textContent : 'ingen meny');
    m.querySelector('[data-gravsvar="perm"]').click();
    ok('6 · Permanent: korten ligger kvar i spel, ingen fråga', !menyEl() && !fragaEl() && kortNamn('spel').join(',') === 'Ukud Cobra,Pacifism', kortNamn('spel').join(','));
  }
  if (steg === 4) {
    await stam([spar(31, 'Ukud Cobra', 0.75, 0.3), spar(32, 'Pacifism', 0.752, 0.302), spar(33, 'Killing Glare', 0.751, 0.301)]);
    const q = gravLageNu().fraga;
    ok('6 · efter Permanent: ett kort ovanpå på samma plats — Mesa frågar en gång till', !!q && q.igen === true && !!fragaEl());
    fragaEl().querySelector('[data-gravsvar="nej"]').click();
    menyEl().querySelector('[data-gravsvar="ign"]').click();
    ok('6 · Ignore this spot: korten tas bort från mattan, ingen fråga', !menyEl() && !fragaEl() && mig().cards.length === 0, kortNamn('spel').join(','));
    await stam([spar(31, 'Ukud Cobra', 0.75, 0.3), spar(34, 'Serpent Assassin', 0.748, 0.299)]);
    ok('6 · efter Ignore this spot följer Mesa inte platsen: nya kort där blir inga kort, ingen fråga', mig().cards.length === 0 && !gravLageNu().fraga);
    await stam([spar(35, 'Wood Elves', 0.3, 0.3)]);
    ok('…men ett kort någon annanstans är ett kort', kortNamn('spel').join(',') === 'Wood Elves', kortNamn('spel').join(','));
  }
  if (steg === 5) {
    /* 8 · Högarna följer mattans zoom, brickan behåller sin storlek; ett ensamt nedvänt kort visas (steg 5). */
    const vy = matVyFor(player()), zs = matVy().z;
    tagEmotLek(Object.assign(lek('nere', 1, R1), { ned: [{ id: 9, ruta: { x: 0.85, y: 0.6, w: 0.1, h: 0.22 } }] }));
    const nk = gridEl.querySelector('.nedkort');
    ok('ett ensamt nedvänt kort visas på mattan, i bordets sleeves och utan namn', !!nk && !!nk.querySelector('.lekslv') && nk.getAttribute('aria-label') === 'Face-down card');
    sparaNu();
    const rad5 = W.__sparat[W.__sparat.length - 1].kort;
    ok('…och delas utan namn i bordsraden', rad5.some(k => k.hog === 'ned' && k.name === undefined));
    const lb = () => gridEl.querySelector('.lekhog .lekbr.ledig').getBoundingClientRect(), gk = () => gridEl.querySelector('.lekhog').getBoundingClientRect();
    await vanta(600);                                       // brädets zoom glider in efter en omritning: mät när den stått still
    const br0 = lb(), k0 = gk();
    vy.zoomManual = Math.max(MATTA.ZOOM_MIN, zs * 0.6); renderGrid(true); await vanta(600);
    const br1 = lb(), k1 = gk();
    ok('8 · högarna följer mattans zoom, brickan behåller sin storlek', k1.width < k0.width * 0.75 && Math.abs(br1.height - br0.height) < 1.5, `leken ${Math.round(k0.width)} → ${Math.round(k1.width)} px, brickan ${br0.height.toFixed(1)} → ${br1.height.toFixed(1)} px`);
    vy.zoomManual = null; renderGrid(true);
    tagEmotLek(lek('nere', 1, R1));
    /* Frågan behåller sin storlek på skärmen när mattan zoomas (--matz). */
    mig().cards = []; nollGrav(); renderAll(true);
    await stam([spar(41, 'Ukud Cobra', 0.75, 0.3)]);
    await stam([spar(42, 'Pacifism', 0.751, 0.301)]);
    await vanta(600);
    const v = matVyFor(player()), b0 = fragaEl().getBoundingClientRect(), z0 = matVy().z;
    v.zoomManual = Math.max(MATTA.ZOOM_MIN, z0 * 0.6); renderGrid(true);
    await vanta(600);
    const b1 = fragaEl().getBoundingClientRect();
    v.zoomManual = null; renderGrid(true);
    ok('frågan behåller sin storlek när mattan zoomas ut', Math.abs(b1.width - b0.width) < 2 && Math.abs(b1.height - b0.height) < 2, `${Math.round(b0.width)}×${Math.round(b0.height)} → ${Math.round(b1.width)}×${Math.round(b1.height)} (zoom ${z0.toFixed(2)} → ${(z0 * 0.6).toFixed(2)})`);
  }
  if (steg === 6) {
    /* En motståndare: hens graveyard bland hens kort (D1) och inget fast graveyard bredvid. */
    const jag = mig();
    const opp = normalisera({ id: 'hogprov-opp', name: 'Sara', color: '#b782ff', plats: 2, lage: 'bord', lekId: 'l2', lek: { id: 'l2', namn: 'Blue', antal: 60 }, cards: [], shots: [], shotIdx: 0, pending: [], pane: null, namnkalla: 'anvandare', version: 1 }, 1);
    state.players = [jag, opp]; state.active = jag.id; bord.valt = 'all';
    renderAll(true);
    fjarrBord({ game_id: spelLage.id, user_id: opp.id, version: 2, kort: [
      { cid: 'o1', name: 'Delver of Secrets', x: 40, y: 60, z: 1, tapped: 0 },
      { cid: 'o2', name: 'Opt', zon: 'grav' },
      { cid: 'hog:grav', hog: 'grav', x: 420, y: 300 }] });
    const g = document.querySelector('#oppMattor .obrade .gravd1');
    ok('motståndaren: hens graveyard bland hens kort, och inget fast graveyard bredvid', opp.cards.length === 2 && !!opp.gravHog && !!g && g.dataset.gravhog === '0' && !document.querySelector('#oppMattor .ohogar .grav'), g ? g.className : 'ingen');
    g.click(); await vanta(50);
    ok('motståndarens graveyard: klick tittar i korten (solfjädern, hens hög)', hf.src === ZON_GRAV && hf.pid === opp.id, `${hf.src} ${hf.pid}`);
    hfStang(); await vanta(400);
    state.players = [jag]; bord.valt = null; renderAll(true);
  }
  if (steg === 7) {
    /* Utan kamera: graveyard och library på fast plats som i dag, i D1:s utseende (inga ramar, bricka på underkanten). */
    kamAnsluten = false; kamGravRad = null; mig().gravHog = null; mig().bibHog = null; kamLek = null; renderAll(true); renderBibHog();
    const gh = manaRow.querySelector('.grav'), rad = manaRow.querySelector('.gravtxt');
    ok('utan kamera: graveyard på sin fasta plats', !!gh && !gridEl.querySelector('.gravd1'));
    ok('utan kamera: D1 — ingen ram, och brickan på underkanten', !!gh && getComputedStyle(gh).borderTopColor === 'rgba(0, 0, 0, 0)' && !!rad && getComputedStyle(rad).backgroundColor !== 'rgba(0, 0, 0, 0)' && rad.getBoundingClientRect().top < gh.getBoundingClientRect().bottom, gh ? getComputedStyle(gh).borderTopColor : '');
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
      const r = await c.cdp('Runtime.evaluate', { expression: "document.readyState === 'complete' && typeof renderGrid === 'function' && typeof gravSvar === 'function'", returnByValue: true }).catch(() => null);
      if (r && r.result && r.result.value) break;
      if (Date.now() - t0 > 30000) throw new Error('appen laddade inte (gravSvar saknas)');
      await vanta(100);
    }
    await vanta(300);
    if (BILD) fs.mkdirSync(BILD, { recursive: true });
    const NAMN = ['5-fragan', '5-samma-fraga', '5-yes-4-i-spel', '6-nej-permanent', '6-ignore', '8-zoom-nedvant', 'motstandaren', 'utan-kamera'];
    for (let s = 0; s < NAMN.length; s++) {
      const r = await c.cdp('Runtime.evaluate', { expression: '(' + PROV.toString() + ')(' + s + ')', awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(`steg ${s}: ` + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
      for (const [namn, ok, detalj] of r.result.value) { n++; if (!ok) fel++; console.log(`${ok ? 'OK ' : 'FEL'}  ${namn}${detalj ? '  (' + detalj + ')' : ''}`); }
      if (BILD) {
        await vanta(500);
        const z = await c.cdp('Runtime.evaluate', { expression: "(() => { const r = document.querySelector('#zonPerm').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()", returnByValue: true });
        const q = z.result.value;
        const bild = await c.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 72, clip: { x: q.x, y: q.y, width: q.w, height: q.h, scale: 0.7 } });
        fs.writeFileSync(path.join(BILD, `${String(s).padStart(2, '0')}-${NAMN[s]}.jpg`), Buffer.from(bild.data, 'base64'));
      }
    }
    for (const k of c.konsol) console.log('     ' + k);
    console.log(`hogarna: ${n - fel} OK, ${fel} FEL`);
    if (fel) kod = 1;
  } catch (e) { console.error('hogarna: ' + e.message); for (const k of c.konsol) console.error('     ' + k); kod = 1; }
  await c.stang(); srv.close();
  process.exit(kod);
})();

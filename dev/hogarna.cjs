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
  const nollGrav = () => { gravLage = null; gravSedda = new Map(); gravOmstart = 0; gravTomNar = 0; gravTomSparr = false; gravFoljdaSpar = new Map(); gravMenyOppen = false; try { localStorage.removeItem('sthv.grav.v1.' + spelLage.id); } catch (e) {} kamGravRad = null; };
  /* Ett bord från telefonen, en stund efter det förra (kortets ny-stämpel avgör vem som ligger under). */
  const stam = async lista => { await vanta(15); avstamBord(lista, false); };
  /* Brädets zoom glider efter en omritning (matSynk, MES-334 steg 2): mät när lekens ruta stått still. */
  const stilla = async () => { const r = () => { const e = gridEl.querySelector('.lekhog'); return e ? e.getBoundingClientRect().width : 0; }; await vanta(450); let a = r(); for (let i = 0; i < 40; i++) { await vanta(150); const b = r(); if (Math.abs(a - b) < 0.05) return; a = b; } };   // glidningen hinner börja (en ruta i en dold flik) innan stillheten mäts
  if (steg === 0) {
    visaVy('app');
    const p = player();
    spelLage = { id: 'hogprov', kod: 'HOG001', namn: 'Prov', vard: p.id, mig: p.id };
    p.lage = 'bord'; p.cards = []; p.pending = []; p.plats = 1; p.lekId = 'lek1'; p.lek = { id: 'lek1', namn: 'Elves', antal: 40 };
    state.players = [p]; state.active = p.id;
    oppSatt({ klar: true });
    kamAnsluten = true; kamFas = ''; kamGrund = 90; prefs.autoLage = true; kamGravRad = null;
    W.__sant = []; W.__sparat = []; W.__kal = [];
    Moln.sandKam = (typ, data) => { W.__sant.push(Object.assign({ typ }, data)); return true; };
    Moln.sparaBord = (id, kort, dolt) => { W.__sparat.push({ kort, dolt }); return Promise.resolve(true); };
    Moln.sparaKalibrering = (id, ruta) => { W.__kal.push(ruta); return Promise.resolve(true); };
    nollGrav();
    renderAll(true);
    /* Jesper i produktionen 2026-10-05: graveyard-platsen syntes direkt när kameran anslöt, utan ett enda kort. */
    ok('1 · kameran ansluten, inga kort: ingen graveyard alls, varken fast hög eller bland korten (sida 5, tavla 1)', !manaRow.querySelector('.grav') && !gridEl.querySelector('.gravd1'), manaRow.innerHTML.slice(0, 80));
    tagEmotLek(lek('nere', 1, R1));
    ok('2 · leken ligger: fortfarande ingen graveyard (tavla 2)', !manaRow.querySelector('.grav') && !gridEl.querySelector('.gravd1'));
    await stam(LAND);
    ok('3 · land i spel: fortfarande ingen graveyard (tavla 3)', !manaRow.querySelector('.grav') && !gridEl.querySelector('.gravd1'));
    ok('landen till höger om leken: ingen fråga', !fragaEl() && !gravLageNu().fraga);
    await stam(LAND.concat([spar(21, 'Llanowar Elves', 0.3, 0.62)]));
    const f = fragaEl(), c = mig().cards.find(k => k.name === 'Llanowar Elves'), ce = c && gridEl.querySelector(`.card[data-cid="${c.cid}"]`);
    ok('5 · första kortet på andra sidan om leken, i lekens rad: "Is this your graveyard?  Yes · No"', !!f && /Is this your graveyard\?/.test(f.textContent) && !!f.querySelector('[data-gravsvar="ja"]') && !!f.querySelector('[data-gravsvar="nej"]'), f ? f.textContent : 'ingen fråga');
    const fr = f && f.getBoundingClientRect(), kr = ce && ce.getBoundingClientRect();
    ok('5 · rutan står ovanför kortet, mitt över det', !!fr && !!kr && fr.bottom <= kr.top + 1 && Math.abs((fr.left + fr.right) / 2 - (kr.left + kr.right) / 2) < 3,
      fr && kr ? `fråga ${Math.round(fr.left)}–${Math.round(fr.right)} / ${Math.round(fr.bottom)}, kort ${Math.round(kr.left)}–${Math.round(kr.right)} / ${Math.round(kr.top)}` : '');
    ok('5 · inget är graveyard före Yes: kortet ligger i spel', !!c && zonAv(c) !== ZON_GRAV && !!ce);
    ok('5 · före Yes visas ingen graveyard-hög eller bricka någonstans', !manaRow.querySelector('.grav') && !gridEl.querySelector('.gravd1'));
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
    kamAnsluten = false; renderAll(true);
    ok('5 · kameran tappas: frågan står kvar tills man svarar (bordet står fruset)', !!fragaEl());
    kamAnsluten = true; renderAll(true);
  }
  if (steg === 2) {
    W.__kal = [];
    /* Första kortet i högen före Yes: graveyard ska skapas precis där det ligger (Jesper 2026-10-05). */
    const forsta = mig().cards.find(k => k.name === 'Llanowar Elves'), fx = forsta && forsta.x, fy = forsta && forsta.y;
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
    const gh = mig().gravHog;
    ok('4 · graveyard skapas där första kortet låg (inom en femtedels kort)', fx != null && !!gh && Math.abs(gh.x - fx) < MATTA.CW * 0.2 && Math.abs(gh.y - fy) < MATTA.CH * 0.2,
       gh ? `kortet ${Math.round(fx)},${Math.round(fy)} → högen ${Math.round(gh.x)},${Math.round(gh.y)} (kortbredd ${MATTA.CW})` : 'ingen hög');
    /* Högarna ligger på samma matta som korten: de följer panoreringen lika mycket som ett kort. */
    { await stilla();
      const kortEl = gridEl.querySelector('.card[data-cid]'), rekt = () => [g, lek, kortEl].map(e => e.getBoundingClientRect());
      const fore = rekt(), vyP = matVyFor(player()), p0 = Object.assign({}, vyP.pan);
      vyP.pan = { x: p0.x + 90, y: p0.y + 40 }; renderGrid(true); await stilla();
      document.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} });   // glidningen till slutläget: under last hann den inte börja
      /* Glidningen kan börja sent under last (en dold flik stryper timrarna): vänta tills kortet flyttat sig, högst 4 s. */
      for (let i = 0; i < 40 && Math.abs(kortEl.getBoundingClientRect().left - fore[2].left) < 1; i++) await vanta(100);
      await stilla();
      const efter = rekt(), d = efter.map((r, i) => [r.left - fore[i].left, r.top - fore[i].top]);
      ok('4 · leken och graveyard följer panoreringen precis som ett kort (samma matta)', !!kortEl && Math.abs(d[2][0]) > 20 && d.every(q => Math.abs(q[0] - d[2][0]) < 1.5 && Math.abs(q[1] - d[2][1]) < 1.5),
         JSON.stringify(d.map(q => q.map(Math.round))));
      vyP.pan = p0; renderGrid(true); await stilla(); }
    /* Skalan byts (telefonen närmare: korten 30 % bredare i bilden, utan att flytta sig): kort, lek och
       graveyard räknas om med samma skala. Förut stod korten kvar räknade med den gamla och högarna gled. */
    { const rel = () => { const sk = kamSkala(mig()), h = mig().bibHog, gh = mig().gravHog, ut = [];
        const mh = kamTillMatta(h.kam, sk), gr = kamGravRad, mg = gr && kamTillMatta({ x: gr.x + gr.w / 2, y: gr.y + gr.h / 2, w: gr.w, h: gr.h }, sk);
        for (const c of mig().cards.filter(c => c.kam && c.spar != null && paMattan(c) && !c.attachedTo)) {
          const mc = kamTillMatta(c.kam, sk), sz = matStorlek(c), cx = c.x + sz.w / 2, cy = c.y + sz.h / 2;
          ut.push(Math.round((h.x + MATTA.CW / 2 - cx) - (mh.x - mc.x)), Math.round((h.y + MATTA.CH / 2 - cy) - (mh.y - mc.y)));
          if (gh && mg) ut.push(Math.round((gh.x + MATTA.CW / 2 - cx) - (mg.x - mc.x)), Math.round((gh.y + MATTA.CH / 2 - cy) - (mg.y - mc.y)));
        }
        return ut; };
      const r0 = rel(), s0 = kamSkala(mig()), gamla = new Map(mig().cards.filter(c => c.kam).map(c => [c.cid, c.kam]));
      /* Lådan ändras både i kortets kam och i telefonens senaste bord: kamSkala mäter bara en kam som är den låda kortet
         har nu (kamHel, MES-345). */
      const gamlaRa = senasteRa.map(t => Object.assign({}, t));
      const nyLada = (c, f) => { c.kam = Object.assign({}, c.kam, f(c.kam)); senasteRa = senasteRa.map(u => u.id === c.spar && u.w != null ? Object.assign({}, u, f(u)) : u); };   // nya spårobjekt: senasteRa är arrayen provet skickade (LAND), den får inte ändras
      const aterstall = () => { for (const c of mig().cards) if (gamla.has(c.cid)) c.kam = gamla.get(c.cid); senasteRa = gamlaRa.map(t => Object.assign({}, t)); };
      for (const c of mig().cards) if (c.kam) nyLada(c, k => ({ w: k.w * 1.3, h: k.h * 1.3 }));
      renderGrid(true); await stilla();
      /* Skalan byts först när det nya värdet stått sig i 3 s (MES-342): direkt efter står den kvar. */
      const sTidigt = kamSkala(mig());
      await vanta(3100); renderGrid(true); await stilla();
      const r1 = rel(), s1 = kamSkala(mig());
      ok('skalan byts: kort, lek och graveyard räknas med samma skala (inget glider isär)', sTidigt === s0 && s1 < s0 * 0.9 && r1.length > 0 && r0.concat(r1).every(d => Math.abs(d) <= 2),
         `skala ${s0.toFixed(0)} → ${sTidigt.toFixed(0)} direkt → ${s1.toFixed(0)} efter 3 s, avvikelser före ${JSON.stringify(r0)} efter ${JSON.stringify(r1)}`);
      aterstall();
      renderGrid(true); await stilla(); await vanta(3100); renderGrid(true); await stilla();
      /* Tre kort tappas (kortsidan på höjden i bilden): skalan står kvar — förut krympte hela bordet. Också efter 3 s. */
      const s2 = kamSkala(mig()), asp = 4 / 3, tre = mig().cards.filter(c => c.kam && c.kam.w).slice(0, 3);
      for (const c of tre) nyLada(c, k => ({ w: k.h * asp, h: k.w / asp }));
      kamSkala(mig()); await vanta(3100);
      const s3 = kamSkala(mig());
      ok('tre kort tappas: skalan står kvar (kortsidan räknas, inte bredden i bilden)', tre.length === 3 && s3 === s2 && Math.abs(s2 / s0 - 1) <= 0.08, `${s0.toFixed(0)} → ${s2.toFixed(0)} → ${s3.toFixed(0)} efter 3 s`);
      aterstall();
      renderGrid(true); await stilla(); }
    g.click();
    await vanta(50);
    ok('4 · klick på högen tar upp korten i handen (solfjädern, som den fasta högen)', hf.src === ZON_GRAV && hf.fas !== 'stangd', `${hf.src} ${hf.fas}`);
    hfStang(); await vanta(400);
    sparaNu();
    const rad4 = W.__sparat[W.__sparat.length - 1].kort, post = rad4.find(k => k.hog === 'grav');
    ok('4 · bordsraden bär högens läge (inga namn — korten ligger i listan med zon grav)', !!post && post.cid === 'hog:grav' && post.name === undefined && post.x === Math.round(mig().gravHog.x), JSON.stringify(post));
    /* Graveyard följer med (Jesper 2026-10-06): högen lyfts (telefonen: rutan tom) och läggs ner ovanför landen —
       spåret med översta kortets namn är högen. Rutan flyttas dit, och inget Wood Elves hamnar i spel. */
    { const bas = [spar(23, 'Serra Angel', 0.8, 0.3), spar(24, 'Ukud Cobra', 0.18, 0.62)].concat(LAND);
      const gr0 = Object.assign({}, kamGravRad), n0 = gravSistaN || 0, g0 = Object.assign({}, mig().gravHog);
      await vanta(15); avstamBord(bas, false, 'kort', undefined, '', { n: n0, sen: null, tom: true });
      await vanta(15); avstamBord(bas.concat([spar(91, 'Wood Elves', 0.45, 0.25)]), false, 'kort', undefined, '', { n: n0, sen: null, tom: true });
      await vanta(15); avstamBord(bas.concat([spar(91, 'Wood Elves', 0.45, 0.25)]), false, 'kort', undefined, '', { n: n0, sen: null, tom: true });   // telefonen har inte fått den nya rutan än
      renderAll(true); await stilla();
      const r = kamGravRad, mitt = r ? { x: r.x + r.w / 2, y: r.y + r.h / 2 } : null, gh = mig().gravHog;
      ok('graveyard följer med: högen lyfts och läggs ovanför landen — rutan flyttar dit, graveyard på mattan med, inget kort i spel',
         !!mitt && Math.abs(mitt.x - 0.45) < 0.02 && Math.abs(mitt.y - 0.25) < 0.02 && !mig().cards.some(c => c.name === 'Wood Elves' && zonAv(c) !== ZON_GRAV)
           && kortNamn('grav').join(',') === 'Wood Elves,Llanowar Elves' && !!gh && Math.hypot(gh.x - g0.x, gh.y - g0.y) > 100,
         JSON.stringify({ fore: gr0 && { x: +(gr0.x + gr0.w / 2).toFixed(2), y: +(gr0.y + gr0.h / 2).toFixed(2) }, efter: mitt && { x: +mitt.x.toFixed(2), y: +mitt.y.toFixed(2) }, iSpel: mig().cards.filter(c => zonAv(c) !== ZON_GRAV).map(c => c.name) }));
      /* Telefonen säger fortfarande tom (har inte fått den nya rutan): ett nytt Wood Elves på en tredje plats flyttar inte rutan igen. */
      const r1 = Object.assign({}, kamGravRad);
      await vanta(15); avstamBord(bas.concat([spar(92, 'Wood Elves', 0.8, 0.62)]), false, 'kort', undefined, '', { n: n0, sen: null, tom: true });
      await vanta(15); avstamBord(bas.concat([spar(92, 'Wood Elves', 0.8, 0.62)]), false, 'kort', undefined, '', { n: n0, sen: null, tom: true });
      ok('graveyard följer med: inte en gång till innan telefonen sett den nya rutan', kamGravRad.x === r1.x && kamGravRad.y === r1.y, JSON.stringify(kamGravRad));
      /* Tillbaka: högen ligger där den nu ligger (telefonen: inte tom). */
      await vanta(15); avstamBord(bas, false, 'kort', undefined, '', { n: n0, sen: null, tom: false });
      /* Ett andra spår på ett Wood Elves i spel (armen som lyfter högen sveper över det) är inte högen. */
      const r2 = Object.assign({}, kamGravRad), we = mig().cards.find(c => c.name === 'Wood Elves' && zonAv(c) !== ZON_GRAV);
      if (we) { we.ny -= 5000; if (sparSedd.has(we.spar)) sparSedd.set(we.spar, sparSedd.get(we.spar) - 5000); }   // kortet låg i spel en stund före lyftet, som på riktigt
      await vanta(15); avstamBord(bas, false, 'kort', undefined, '', { n: n0, sen: null, tom: true });
      if (we && we.kam) { const sx = we.kam.x + 0.004, sy = we.kam.y + 0.004;
        await vanta(15); avstamBord(bas.concat([spar(we.spar, 'Wood Elves', we.kam.x, we.kam.y), spar(93, 'Wood Elves', sx, sy)]), false, 'kort', undefined, '', { n: n0, sen: null, tom: true }); }
      ok('graveyard följer med: ett andra spår på ett Wood Elves i spel är inte högen', !!we && kamGravRad.x === r2.x && kamGravRad.y === r2.y, we ? JSON.stringify(kamGravRad) : 'inget Wood Elves i spel');
      await vanta(15); avstamBord(bas, false, 'kort', undefined, '', { n: n0, sen: null, tom: false });
      /* Graveyard med ett kort: att ta kortet ur den (unearth) går inte att skilja från att flytta högen — rutan står kvar. */
      const g2 = mig().cards.filter(c => zonAv(c) === ZON_GRAV), spara = g2.slice(1);
      for (const c of spara) mig().cards.splice(mig().cards.indexOf(c), 1);
      const r3 = Object.assign({}, kamGravRad);
      await vanta(15); avstamBord(bas, false, 'kort', undefined, '', { n: n0, sen: null, tom: true });
      await vanta(15); avstamBord(bas.concat([spar(94, g2[0].name, 0.55, 0.3)]), false, 'kort', undefined, '', { n: n0, sen: null, tom: true });
      ok('graveyard följer med: inte när graveyard bara har ett kort (det kortet togs upp)', kamGravRad.x === r3.x && kamGravRad.y === r3.y, JSON.stringify(kamGravRad));
      await vanta(15); avstamBord(bas, false, 'kort', undefined, '', { n: n0, sen: null, tom: false });
      for (const c of spara) mig().cards.push(c);
      mig().cards = mig().cards.filter(c => !(c.spar === 94 && zonAv(c) !== ZON_GRAV)); }
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
    await stilla();
    /* Zoomen läses när mattan stått still: det nedvända kortet långt till höger kan ha gett ett zoomsteg ut
       (MES-338). Står mattan redan nära minsta zoomen provas det inåt i stället. */
    const br0 = lb(), k0 = gk(), zFore = matVy().z, zNy = zFore * 0.6 >= MATTA.ZOOM_MIN ? zFore * 0.6 : Math.min(MATTA.ZOOM_MAX, zFore * 1.6);
    vy.zoomManual = zNy; renderGrid(true); await stilla();
    const br1 = lb(), k1 = gk();
    ok('8 · högarna följer mattans zoom, brickan behåller sin storlek', Math.abs(k1.width / k0.width - zNy / zFore) < 0.05 && Math.abs(br1.height - br0.height) < 1.5,
      `zoom ${zFore.toFixed(2)} → ${zNy.toFixed(2)} (startade på ${zs.toFixed(2)}), leken ${Math.round(k0.width)} → ${Math.round(k1.width)} px, brickan ${br0.height.toFixed(1)} → ${br1.height.toFixed(1)} px`);
    vy.zoomManual = null; renderGrid(true);
    tagEmotLek(lek('nere', 1, R1));
    /* Frågan behåller sin storlek på skärmen när mattan zoomas (--matz). */
    mig().cards = []; nollGrav(); renderAll(true);
    await stam([spar(41, 'Ukud Cobra', 0.75, 0.3)]);
    await stam([spar(42, 'Pacifism', 0.751, 0.301)]);
    await stilla();
    const v = matVyFor(player()), b0 = fragaEl().getBoundingClientRect(), z0 = matVy().z;
    v.zoomManual = Math.max(MATTA.ZOOM_MIN, z0 * 0.6); renderGrid(true);
    await stilla();
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
    ok('motståndaren i Mirror my table före Yes och utan lek: ingen fast graveyard och ingen fast library (som på hens egen matta)',
       !document.querySelector('#oppMattor .ohogar .grav') && !document.querySelector('#oppMattor .ohogar .bib'), (document.querySelector('#oppMattor .ohogar') || {}).innerHTML || 'inga högar');
    opp.lage = 'utan'; renderAll(true);
    ok('motståndaren i Digital table: graveyard och library på fast plats som förut',
       !!document.querySelector('#oppMattor .ohogar .grav') && !!document.querySelector('#oppMattor .ohogar .bib'));
    opp.lage = 'bord'; renderAll(true);
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
  if (steg === 8) {
    /* Uppstarten har inget steg 4 (MES-334 steg 6, och läget Use camera to add cards är borttaget): med leken
       vald, läget valt och telefonen ansluten är uppstarten klar — inget provkort, ingen graveyard-plats, ingen
       library-ruta, och statusfältet ber inte om grundläget. */
    kamAnsluten = true; prefs.autoLage = true; kamGrund = null;
    const p = mig(); p.lage = 'bord'; oppSatt({ klar: false, avbojd: false, lekOk: true, lage: true, grundOm: true });
    renderMode();
    ok('Mirror my table: uppstarten klar utan steg 4', oppFor().klar === true && !oppOppen && !$('#opp4'), JSON.stringify({ klar: oppFor().klar, oppen: oppOppen, opp4: !!$('#opp4') }));
    ok('Mirror my table: statusfältet ber inte om grundläget (inget "Save as untapped angle")', !/untapped/i.test($('#autoBar').textContent || ''), ($('#autoBar').textContent || '').trim().slice(0, 80));
    oppSatt({ klar: true }); renderMode();
  }
  if (steg === 9) {
    /* Granskningen av sida 5, V4: telefonens graveyard-ruta efter Yes ur korten som de ligger nu, oberoende av
       riktningen — en kvadrat i bildpunkter, längsta sidan × 1,15. Ett TAPPAT första kort: nästa kort, stående
       och förskjutet 0,45 kortlängder, har sin mitt i rutan; grannkort intill (stående till höger, stående
       under, ett mellanrum på 0,01) har det inte. Bildens proportioner: kamBildAsp() (0,75 här). */
    kamAnsluten = true; prefs.autoLage = true; kamGrund = 90; oppSatt({ klar: true }); mig().lage = 'bord';
    mig().cards = []; nollGrav(); tagEmotLek(lek('nere', 1, R1)); renderAll(true);
    const A = kamBildAsp(), L = 0.22, K = 0.1;                 // ett kort: K bildbredder brett, L bildhöjder högt
    const tappat = (id, namn, cx, cy) => Object.assign(spar(id, namn, cx, cy), { x: cx - L * A / 2, y: cy - K / A / 2, w: L * A, h: K / A, tappad: true });
    await stam([tappat(51, 'Ukud Cobra', 0.75, 0.3)]);
    await stam([tappat(52, 'Pacifism', 0.751, 0.301)]);
    W.__kal = [];
    fragaEl().querySelector('[data-gravsvar="ja"]').click();
    const r = (W.__kal[W.__kal.length - 1] || {}).grav, inne = (x, y) => !!r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    const nasta = inne(0.75, 0.3 + 0.45 * L), hoger = inne(0.75 + L * A / 2 + 0.01 + K / 2, 0.3), under = inne(0.75, 0.3 + K / A / 2 + 0.01 + L / 2);
    ok('V4 · Yes på ett tappat första kort: rutan är kvadratisk i bildpunkter (längsta sidan × 1,15)', !!r && Math.abs(r.w - r.h * A) < 0.004 && Math.abs(r.w - L * A * 1.15) < 0.01, JSON.stringify(r));
    ok('V4 · nästa kort, stående och 0,45 kortlängder ner, hamnar i rutan; grannkorten intill gör det inte', nasta && !hoger && !under, `nästa ${nasta}, stående till höger ${hoger}, stående under ${under}`);
    /* V3: telefonens grundläge skrivs till raden när det skiljer mer än en grad och stått kvar i 2 s — bara
       tal (en omstartad telefon säger null innan den läst raden). */
    W.__kal = []; kamGrundRad = null; kamGrund = 90; grundTillRad();
    const fore = W.__kal.length; await vanta(2300);
    const forsta = W.__kal.map(k => k.grund);
    kamGrund = 91; grundTillRad(); await vanta(2300);
    const knuff = W.__kal.length;
    kamGrund = null; grundTillRad(); await vanta(2300);
    const efterNull = W.__kal.length;
    ok('V3 · telefonens grundläge till raden efter 2 s; en grad är inget byte; null skrivs inte', fore === 0 && forsta.join() === '90' && kamGrundRad === 90 && knuff === 1 && efterNull === 1, `före ${fore}, sedan ${forsta}, knuff ${knuff}, efter null ${efterNull}, raden ${kamGrundRad}`);
    /* Jesper 2026-10-06: grundläget antas alltid i bakgrunden — statusfältet säger aldrig något om det, inte heller
       när det saknas med kort på bordet (raden från granskningen av sida 5, V3, är borta). */
    await stam([spar(53, 'Serra Angel', 0.3, 0.3)]);
    kamGrund = null; await vanta(50); renderAutoBar();
    const not = $('#autoNot');
    ok('statusfältet säger ingenting om grundläget, också när det saknas med kort på bordet', not.hidden && !/Untapped angle|Save/.test(not.textContent) && !document.querySelector('[data-mode="grund-spara"]'), not.textContent);
    kamGrund = 90; renderAutoBar();
  }
  if (steg === 10) {
    /* Rättelse 2 (Jespers beslut 2026-10-05): ett ensamt nedvänt kort — en token, ett kort med baksidan upp — syns lika
       fort som ett vanligt kort och går lika fort. Telefonens tider provas i dev/kamerabank.cjs (LN1–LN4: 0 ms med
       kortstorlek, 150 ms utan, borta i fjärde tomma rutan som ett spår); här datorns del. Ett meddelande som kamTogsEmot
       tar emot det (leken först, sedan bordet): ett nytt vanligt kort (kortlik) och ett nytt nedvänt kort vars spår
       telefonen märkt ned. Det vanliga kortet får sin platshållare och det nedvända kortet ritas — i samma meddelande —
       och det nedvända kortets spår får ingen platshållare bredvid. Nästa meddelande, där telefonen släppt båda: båda borta. */
    kamAnsluten = true; prefs.autoLage = true; kamGrund = 90; kamFas = ''; oppSatt({ klar: true }); mig().lage = 'bord';
    mig().cards = []; mig().pending = []; nollGrav(); tagEmotLek(lek('nere', 1, R1)); renderAll(true);
    const ny = (id, cx, cy, extra) => Object.assign(spar(id, null, cx, cy), { tillstand: 'ny', namn: null, saker: false, kortlik: true, vilar: false, sen: 0 }, extra || {});
    const meddelande = async (l, lista) => { await vanta(15); tagEmotLek(l); avstamBord(lista, false); };
    const NED = { id: 7, ruta: { x: 0.80, y: 0.5, w: 0.1, h: 0.22 } };
    /* Framkallningen (MES-344): platshållaren är borta. Det vanliga kortet syns först med namnet, eller som ett
       oframkallat kort en halv sekund efter att det lagt sig (ofrSteg) — det nedvända kortets spår får aldrig
       något bredvid sig. */
    await meddelande(Object.assign(lek('nere', 1, R1), { ned: [NED] }), [ny(61, 0.2, 0.3, { vilar: true }), ny(62, 0.85, 0.61, { ned: true, vilar: true })]);
    const p1 = gridEl.querySelectorAll('.plats, .ofr').length, n1 = gridEl.querySelectorAll('.nedkort').length;
    ok('nedvänt kort och vanligt kort i samma meddelande: det nedvända syns på en gång, ingenting bredvid det', p1 === 0 && n1 === 1, `platshållare/oframkallade ${p1}, nedvända kort ${n1}`);
    await vanta(560);
    const o1 = [...gridEl.querySelectorAll('.ofr')].map(el => el._mat && el._mat.nyckel), n1b = gridEl.querySelectorAll('.nedkort').length;
    ok('… en halv sekund senare: det vanliga kortet oframkallat, det nedvända fortfarande utan något bredvid', o1.join(',') === 'o:61' && n1b === 1 && !gridEl.querySelector('.plats'), `oframkallade ${o1.join(',') || '–'}, nedvända kort ${n1b}`);
    await meddelande(lek('nere', 1, R1), []);
    const n2 = gridEl.querySelectorAll('.nedkort').length;
    ok('telefonen släpper båda i samma meddelande: det nedvända borta på en gång', n2 === 0, `nedvända kort ${n2}`);
    await vanta(1400);
    const p2 = gridEl.querySelectorAll('.plats, .ofr').length;
    ok('… och det oframkallade när dess nåd (OFR_NAD, ett spår som föds om på platsen) gått', p2 === 0, `oframkallade ${p2}`);
  }
  if (steg === 11) {
    /* Rester från uppstartens steg 4 (Jesper 2026-10-08, kamerabilden med en bred graveyard-ruta över library-högen): steget
       är borttaget, så rutorna som ett äldre spel bär på raden rensas — lokalt och på raden — men aldrig en ruta som Yes
       sparat (ingen library-ruta bredvid). Raden läses som telefonen läser den (lasKamOri). */
    kamAnsluten = true; prefs.autoLage = true; kamGrund = 90; kamFas = ''; oppSatt({ klar: true }); mig().lage = 'bord';
    mig().cards = []; mig().pending = []; nollGrav();
    const GR = { x: 0.03, y: 0.6, w: 0.3, h: 0.12 }, BR = { x: 0.4, y: 0.6, w: 0.1, h: 0.2 };
    W.__kal.length = 0;
    lasKamOri({ grav: GR, bib: BR }); rensaOppstartsRutor(); await vanta(40);
    ok('rutorna från steg 4 på raden: graveyard-rutan borta lokalt', !kamGravRad && !kamRutaRest, JSON.stringify([kamGravRad, kamRutaRest]));
    ok('… och raden skrevs om utan dem (telefonen slutar filtrera där)', W.__kal.length === 1 && !W.__kal[0].grav && !W.__kal[0].bib, JSON.stringify(W.__kal));
    W.__kal.length = 0; lasKamOri({ grav: GR }); rensaOppstartsRutor(); await vanta(40);
    ok('en graveyard-ruta från Yes (ingen library-ruta) rörs inte', !!kamGravRad && W.__kal.length === 0);
    kamGravRad = null; nollGrav(); renderAll(true);
  }
  if (steg === 7) {
    /* Kameran tappad i Mirror my table (Jesper i produktionen 2026-10-05: graveyard och "Pick up 40" i hörnet):
       bordet står fruset, och inga fasta högar kommer fram — inte före första rapporten heller (kamLek undefined). */
    kamAnsluten = false; nollGrav(); mig().gravHog = null; mig().bibHog = null; mig().cards = []; kamLek = undefined; renderAll(true); renderBibHog();
    ok('kameran tappad i Mirror my table: ingen fast graveyard och ingen fast library', !manaRow.querySelector('.grav') && $('#bibHog').hidden, manaRow.innerHTML.slice(0, 80));
    kamLek = lek('ingen', null, null); renderAll(true); renderBibHog();
    ok('…också när telefonen sagt "ingen lek" innan den tappades', !manaRow.querySelector('.grav') && $('#bibHog').hidden);
    /* Reserven: ett kort i graveyard utan hög bland korten (flyttat dit i appen före Yes) syns på den fasta platsen. */
    mig().cards = [{ cid: 'gx', name: 'Opt', zon: ZON_GRAV, x: null, y: null, z: 1, tapped: 0 }]; renderAll(true);
    ok('reserven utan lek på mattan: ett kort i graveyard visas på den fasta platsen', !!manaRow.querySelector('.grav:not(.tom)'));
    /* Med leken på mattan: reserven och exile bredvid leken, på sidan bort från landen — aldrig i hörnet. */
    kamAnsluten = true; tagEmotLek(lek('nere', 1, R1)); renderAll(true);
    const lx = mig().bibHog.x;
    mig().cards = [{ cid: 'gl', name: 'Forest', zon: ZON_MANA, x: lx + 600, y: mig().bibHog.y, z: 1, tapped: 0 },
                   { cid: 'gx', name: 'Lightning Bolt', zon: ZON_GRAV, x: null, y: null, z: 2, tapped: 0 },
                   { cid: 'ex', name: 'Opt', zon: ZON_EXIL, x: null, y: null, z: 3, tapped: 0 }];
    renderAll(true); await stilla();
    { const lekR = gridEl.querySelector('.lekhog').getBoundingClientRect(), gd = gridEl.querySelector('.gravd1[data-gravhog="1"]'), ed = gridEl.querySelector('.exild1[data-exilhog="1"]');
      const gr = gd && gd.getBoundingClientRect(), er = ed && ed.getBoundingClientRect();
      ok('reserven med leken på mattan: graveyard bredvid leken, bort från landen, ingen fast hög', !!gr && gr.right <= lekR.left + 2 && Math.abs(gr.top - lekR.top) < 3 && !manaRow.querySelector('.grav') && /Graveyard1/.test(gd.textContent.replace(/\s+/g, '')),
         gr ? `graveyard ${Math.round(gr.left)}–${Math.round(gr.right)}, leken ${Math.round(lekR.left)}` : 'ingen');
      ok('exile bredvid graveyard på mattan, i D1 (bricka "Exile 1"), ingen exile-bricka i hörnet', !!er && er.right <= gr.left + 2 && Math.abs(er.top - lekR.top) < 3 && !manaRow.querySelector('.exilhog') && /Exile1/.test(ed.textContent.replace(/\s+/g, '')),
         er ? `exile ${Math.round(er.left)}–${Math.round(er.right)}` : 'ingen');
      { exilPlats(true); const pl = manaRow.querySelector('.exilplats'), mitt = el => { const r = el.getBoundingClientRect(); return { clientX: (r.left + r.right) / 2, clientY: (r.top + r.bottom) / 2 }; };
        ok('exile tar emot ett kort både på högen bredvid leken och på platsen i hörnet (under ett drag ur graveyard)', hogUnder(mitt(ed)) === 'exil' && !!pl && hogUnder(mitt(pl)) === 'exil', `högen ${hogUnder(mitt(ed))}, platsen ${pl && hogUnder(mitt(pl))}`);
        exilPlats(false); }
      ed.click(); await vanta(50);
      ok('klick på exile tar upp korten i handen (solfjädern)', hf.src === ZON_EXIL, `${hf.src}`);
      hfStang(); await vanta(400); }
    /* Leken nära mattans vänsterkant, landen till höger: högarna hamnar inte utanför mattan och inte på ett kort. */
    { tagEmotLek(lek('nere', 1, { x: 0.005, y: 0.5, w: 0.1, h: 0.22 })); renderAll(true);
      const lh = mig().bibHog;
      mig().cards = [{ cid: 'gl', name: 'Forest', zon: ZON_MANA, x: lh.x + 220, y: lh.y, z: 1, tapped: 0 },
                     { cid: 'gx', name: 'Lightning Bolt', zon: ZON_GRAV, x: null, y: null, z: 2, tapped: 0 },
                     { cid: 'ex', name: 'Opt', zon: ZON_EXIL, x: null, y: null, z: 3, tapped: 0 }];
      renderAll(true);
      const b = hogarBredvid(mig()), krock = q => [lh, mig().cards[0]].some(k => Math.abs(k.x - q.x) < MATTA.CW && Math.abs(k.y - q.y) < MATTA.CH);
      ok('leken vid kanten: graveyard och exile inom mattan, inte på leken eller ett land, inte på varandra', !!b.grav && !!b.exil && b.grav.x >= MATTA.KANT && b.exil.x >= MATTA.KANT && !krock(b.grav) && !krock(b.exil) && Math.abs(b.grav.x - b.exil.x) >= MATTA.CW,
         JSON.stringify({ lek: Math.round(lh.x), land: Math.round(lh.x + 220), grav: b.grav && Math.round(b.grav.x), exil: b.exil && Math.round(b.exil.x) })); }
    /* Efter Yes men tom (korten tillbaka i spel): ingen tom graveyard på mattan. */
    kamGravRad = { x: 0.2, y: 0.55, w: 0.1, h: 0.22 }; mig().cards = []; renderAll(true);
    { const tg = gridEl.querySelector('.gravd1[data-gravhog="1"]');
      ok('graveyard efter Yes men tom: ingen synlig tom hög, men ett släppmål där högen ligger', !!tg && tg.classList.contains('tom') && getComputedStyle(tg).visibility === 'hidden' && !manaRow.querySelector('.grav'), tg ? getComputedStyle(tg).visibility : 'ingen');
      tg.classList.add('over');
      ok('…som syns när ett kort dras över den', getComputedStyle(tg).visibility === 'visible');
      tg.classList.remove('over'); }
    kamGravRad = null; mig().gravHog = null; mig().bibHog = null; kamAnsluten = false;
    mig().cards = [];
    /* Digital table: graveyard och library på fast plats som i dag, i D1:s utseende (inga ramar, bricka på underkanten).
       Utan kamera, som valet av Digital table gör (oppUtan): en kamera som är på gör raden till Mirror my table (kameraLage). */
    mig().lage = 'utan'; prefs.autoLage = false; kamLek = null; renderAll(true); renderBibHog();
    const gh = manaRow.querySelector('.grav'), rad = manaRow.querySelector('.gravtxt');
    ok('Digital table: graveyard och library på sin fasta plats', !!gh && !gridEl.querySelector('.gravd1') && !$('#bibHog').hidden);
    ok('Digital table: D1 — ingen ram, och brickan på underkanten', !!gh && getComputedStyle(gh).borderTopColor === 'rgba(0, 0, 0, 0)' && !!rad && getComputedStyle(rad).backgroundColor !== 'rgba(0, 0, 0, 0)' && rad.getBoundingClientRect().top < gh.getBoundingClientRect().bottom, gh ? getComputedStyle(gh).borderTopColor : '');
    /* Kameran slås på i Digital table (Turn on camera, Reconnect camera, en telefon som skannat koden): raden
       blir Mirror my table (kameraLage). Digital table i uppstarten gör tvärtom: raden får 'utan' och kameran
       stängs av (oppUtan). */
    const sattLage0 = Moln.sattLage; W.__lage = [];
    Moln.sattLage = (id, l) => { W.__lage.push(l); return Promise.resolve(true); };
    /* prefs.autoLage gäller hela webbläsaren: på utan telefon i det här spelet (ett Digital table-spel som öppnas efter
       ett Mirror-spel) byter inte läget (granskningen, 3a). */
    kameraLage.fel = 0; kamAnsluten = false; prefs.autoLage = true; renderMode(); await vanta(40);
    ok('kameran på utan telefon i spelet: raden står kvar på Digital table', mig().lage === 'utan' && W.__lage.length === 0, `${mig().lage} [${W.__lage}]`);
    kamAnsluten = true; renderMode(); await vanta(40);
    ok('kameran på i Digital table: raden blir Mirror my table', mig().lage === 'bord' && W.__lage.join() === 'bord', `${mig().lage} [${W.__lage}]`);
    W.__lage = []; oppSatt({ klar: false, avbojd: false }); oppUtan(); await vanta(40);
    ok('Digital table i uppstarten: raden blir utan och kameran stängs av', mig().lage === 'utan' && W.__lage.join() === 'utan' && prefs.autoLage !== true && oppFor().avbojd === true,
       `${mig().lage} [${W.__lage}] auto ${prefs.autoLage} avbojd ${oppFor().avbojd}`);
    /* Menyns Digital table: kameran av, raden 'utan', och uppstarten avböjd — annars slog steg 3 på kameran igen. */
    oppSatt({ klar: false, avbojd: false, lekOk: true, lage: true }); prefs.autoLage = true; kamAnsluten = false; mig().lage = 'bord'; W.__lage = [];
    $('#menuBtn').click(); await vanta(40); document.querySelector('.menu button[data-a="lage-utan"]').click(); await vanta(80); renderMode(); await vanta(40);
    ok('Digital table i menyn med uppstarten öppen: raden utan, uppstarten stängd, kameran förblir av', mig().lage === 'utan' && !oppOppen && prefs.autoLage === false,
       `${mig().lage} öppen ${oppOppen} auto ${prefs.autoLage}`);
    /* …men en uppstart som redan är klar räknas inte som avböjd: Mirror my table i menyn efteråt ska inte ärva Digital table. */
    oppSatt({ klar: true, avbojd: false }); prefs.autoLage = true; mig().lage = 'bord';
    $('#menuBtn').click(); await vanta(40); document.querySelector('.menu button[data-a="lage-utan"]').click(); await vanta(80);
    ok('Digital table i menyn efter uppstarten: raden utan, uppstarten inte avböjd', mig().lage === 'utan' && oppFor().klar === true && !oppFor().avbojd, JSON.stringify(oppFor()));
    Moln.sattLage = sattLage0; oppSatt({ klar: true, avbojd: false });
    prefs.autoLage = true; mig().lage = 'bord';
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
    const NAMN = ['5-fragan', '5-samma-fraga', '5-yes-4-i-spel', '6-nej-permanent', '6-ignore', '8-zoom-nedvant', 'motstandaren', 'utan-kamera', 'uppstarten', 'v3-v4', 'nedvant-lika-fort', 'rester-steg-4'];
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

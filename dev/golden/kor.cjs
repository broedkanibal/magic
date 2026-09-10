#!/usr/bin/env node
/* Golden setet från terminalen. Kör: node dev/golden/kor.cjs [--spara] [--detalj] [--rutor] [--fall 03] [--beskarningar <mapp>] [--ai] [--port 8239]

   Startar attrappen (dev/stub-server.cjs), öppnar dev/golden/kor.html i en
   huvudlös Chrome, trycker "Kör alla", skriver tabellen, och med --spara
   sparar resultatet som dev/golden/senaste.json (med --fall byts bara de
   fallen ut, resten står kvar). Slutkod 1 om något fall
   blev sämre än senaste.json (rätt namn, falska eller fel namn), så att den
   går att köra före en commit.

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
const BASFIL = AIFLAG ? 'senaste-ai.json' : 'senaste.json';
const BESKARNINGAR = arg('--beskarningar', '');   // mapp att skriva beskärningarna till: <fall>-spar<nr>.jpg

const vanta = ms => new Promise(r => setTimeout(r, ms));
async function tills(f, ms, vad) { const t0 = Date.now(); for (;;) { const v = await f().catch(() => null); if (v) return v; if (Date.now() - t0 > ms) throw new Error('väntade förgäves på ' + vad); await vanta(250); } }

/* Terminalens tabell: en rad per fall med rubriker. Antalet kort i facit står
   först, så att en ändring får sin skala (9 av 10 är inte 9 av 40), och
   "(var N)" står där ett tal skiljer sig från baslinjen. Sidans egen rad
   (tider, tröskel, yta) står under --detalj. */
function skrivTabell(rs, gamla) {
  const skiljer = (r, g, k) => g && g[k] !== r[k] ? ` (var ${g[k]})` : '';
  const kolumner = [
    ['Fall', 42, r => r.id],
    ['Kort', 12, r => r.kort + (r.dolda ? ` +${r.dolda} dolt` : '')],
    ['Hittade', 13, (r, g) => r.hittade + skiljer(r, g, 'hittade')],
    ['Rätt namn', 17, (r, g) => `${r.namn}/${r.kort}` + skiljer(r, g, 'namn')],
    ['Fel namn', 13, (r, g) => r.felNamn + skiljer(r, g, 'felNamn')],
    ['Falska', 13, (r, g) => r.falska + skiljer(r, g, 'falska')],
    ['Plats', 7, r => r.platsAv ? `${r.plats}/${r.platsAv}` : '–'],
    ['Tappad', 7, r => r.tappadAv ? `${r.tappad}/${r.tappadAv}` : '–']
  ];
  const rad = celler => '  ' + celler.map((c, i) => String(c).padEnd(kolumner[i][1])).join('').trimEnd();
  const summa = (lista, k) => lista.reduce((a, r) => a + (r[k] || 0), 0);
  const totalt = lista => Object.fromEntries(['kort', 'dolda', 'hittade', 'namn', 'felNamn', 'falska', 'plats', 'platsAv', 'tappad', 'tappadAv'].map(k => [k, summa(lista, k)]));
  console.log(rad(kolumner.map(k => k[0])));
  for (const r of rs) console.log(rad(kolumner.map(k => k[2](r, gamla.get(r.id)))));
  const gs = rs.map(r => gamla.get(r.id));
  console.log(rad(kolumner.map(k => k[2](Object.assign({ id: `Totalt, ${rs.length} fall` }, totalt(rs)), gs.every(Boolean) ? totalt(gs) : null))));
  console.log('\n  Kort: synliga kort i facit (ett kort som ligger under ett annat är dolt och räknas inte).');
  console.log('  Hittade: kort kameran lade ut — också dolda kort den ändå såg, och falska spår. Därför kan talet bli större än Kort.');
  console.log('  Rätt namn: synliga kort som fick rätt namn med säkert svar. Fel namn: säkert svar men fel kort (ska vara 0).');
  console.log('  Falska: spår där inget kort ligger. Plats och Tappad provas bara där facit har rutor. (var N): baslinjens tal.');
}

(async () => {
  if (!fs.existsSync(CHROME)) { console.error('Hittar inte Chrome på ' + CHROME + ' — sätt CHROME=/sökväg/till/Chrome'); process.exit(2); }
  /* 1. attrappen, på en egen port så att en flik som redan kör inte störs */
  const server = spawn(process.execPath, [path.join(ROT, 'dev', 'stub-server.cjs')], { env: Object.assign({}, process.env, { PORT: String(PORT) }, AIFLAG ? { MESA_AI: '1' } : {}), stdio: 'ignore' });
  await tills(() => fetch(`http://localhost:${PORT}/dev/golden/kor.html`).then(r => r.ok), 10000, 'attrappen');
  /* 2. Chrome, huvudlös, med egen profil som får ligga kvar */
  const profil = path.join(os.tmpdir(), 'mesa-golden-profil');
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profil, '--no-first-run', '--no-default-browser-check', '--window-size=1400,1000', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
    else if (m.method === 'Runtime.exceptionThrown') console.error('  [sidan] ' + (m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text).split('\n')[0]);
  };
  const cdp = (method, params) => new Promise(res => { const id = ++nr; svar.set(id, res); ws.send(JSON.stringify({ id, method, params: params || {} })); });
  const kor = async uttryck => { const r = await cdp('Runtime.evaluate', { expression: uttryck, awaitPromise: true, returnByValue: true }); if (r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.text); return r.result && r.result.result ? r.result.result.value : undefined; };
  await cdp('Runtime.enable');
  await cdp('Page.navigate', { url: `http://localhost:${PORT}/dev/golden/kor.html${AIFLAG ? '?ai=1' : ''}` });
  const status = () => kor(`(document.querySelector('#status') || {}).textContent || ''`);
  /* 3. vänta in poolen och namnläsaren, tryck Kör alla, vänta in Klar */
  process.stdout.write('förbereder (poolen, namnläsaren)…');
  const redo = await tills(async () => { const s = await status(); if (/^Fel/.test(s)) throw new Error(s); return /Redo|Kör ändå|ofullständig/.test(s) ? s : null; }, 5 * 60 * 1000, 'poolen');
  console.log('\r' + redo);
  console.log(await kor(`(document.querySelector('#pool') || {}).textContent || ''`));
  console.log(await kor(`(document.querySelector('#metod') || {}).textContent || ''`));
  /* --fall <prefix>: bara fallen vars id börjar så — ett fall i taget när ett steg mäts */
  await kor(FALL ? `korDessa(fall.filter(f => f.id.startsWith(${JSON.stringify(FALL)}))); 'ok'` : `document.querySelector('#korAlla').click(); 'ok'`);
  let sist = '';
  await tills(async () => { const s = await status(); if (s !== sist) { sist = s; process.stdout.write('\r  ' + s.padEnd(70).slice(0, 70)); } return /^(Klar|Stoppad)/.test(s) ? s : null; }, TAK_MS, 'körningen');
  console.log('');
  /* 4. resultatet: samma JSON som Kopiera resultat, som en tabell med rubriker */
  const rader = await kor(`[...document.querySelectorAll('#rader tr')].map(tr => tr.innerText.replace(/\\s+/g, ' '))`);
  const json = await kor(`(() => { const rs = fall.map(f => resultat.get(f.id)).filter(r => r && !r.fel); return '[\\n' + rs.map(r => JSON.stringify(r)).join(',\\n') + '\\n]\\n'; })()`);
  let gamla = new Map();
  try { gamla = new Map(JSON.parse(fs.readFileSync(path.join(__dirname, BASFIL), 'utf8')).map(r => [r.id, r])); } catch (e) { /* ingen baslinje — inget att jämföra med */ }
  console.log('');
  skrivTabell(JSON.parse(json), gamla);
  { const f0 = JSON.parse(json)[0]; if (f0) console.log('\n  metod: ' + f0.metod + (f0.ai ? ' (' + f0.ai + (f0.promptv != null ? ', systemprompt v' + f0.promptv : '') + ')' : '')
      + '\n  (lokal: konstverket jämförs med lekens kort; ocr: kortnamnet läses ur titelraden; ai: Claude frågas om det som är osäkert)'); }
  /* --detalj: varje spår med vad namnläsaren såg, för att skruva trösklarna */
  if (process.argv.includes('--detalj')) for (const r of JSON.parse(json)) {
    console.log('\n' + r.id + (r.missade.length ? ' — missade: ' + r.missade.join(', ') : ''));
    { const sidan = rader.find(x => x.includes(r.id)); if (sidan) console.log('  sidans rad: ' + sidan.replace(/^Kör\s+/, '')); }
    console.log(`  delning: delade ${r.delade}, skurna ${r.skurna}, kortRef ${r.kortRef ? r.kortRef.lang + '×' + r.kortRef.kort + ' (av ' + r.kortRef.av + ')' : '–'}`);
    if (r.helbild) console.log(`  helbild (${r.helbild.skal}): Claude såg ${r.helbild.kort} kort — ${r.helbild.nya} nya spår, ${r.helbild.namngivna} egna namngivna, ${r.helbild.bort} borttagna; ${r.helbild.ms} ms; låda ${r.helbild.matt ? r.helbild.matt.lang + '×' + r.helbild.matt.kort + ' (' + r.helbild.matt.kalla + ')' : '–'}${r.helbild.modell ? '; ' + r.helbild.modell : ''}`);
    for (const p of r.skurnaAlla || []) console.log(`    skuret vid ${p.s} s: ${p.lang}×${p.kort} ${p.grader}° led ${p.led}${p.minne ? ' (minne)' : ''}: ${p.snitt.map(c => c.vid + ' (djup ' + c.djup + ', mörk ' + c.mork + ')').join(', ')} → ${p.delar.join(' | ')}`);
    if (process.argv.includes('--rutor')) {
      /* Bara raderna som SKILJER sig från rutan före: på en stillbild är de flesta rutor lika, och det är bytena man letar efter. */
      let forra = '';
      for (const l of r.skarLogg || []) { const s = `skurna ${l.skurna}${l.prov.length ? ' — ' + l.prov.join('; ') : ''}`; if (s !== forra) { forra = s; console.log(`    ruta ${l.ruta}: ${s}`); } }
      for (const p of r.tidslinje || []) console.log(`    ${p.s} s${p.ruta != null ? ' (ruta ' + p.ruta + ')' : ''} [${p.lage}]: ${p.spar || '–'}`);
    }
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
  /* 5. sämre än senaste.json? rätt namn ner, falska eller fel namn upp */
  /* Domen mot baslinjen skrivs alltid: BÄTTRE, LIKA BRA, SÄMRE eller BLANDAT,
     totalt och fall för fall. Förut syntes bara det som blev sämre, så en
     körning med en annan modell som gick lika bra eller bättre sa ingenting. */
  const samre = [], battre = [], rs = JSON.parse(json);
  const vad = r => `${r.ai || 'bara det lokala'}${r.promptv != null ? ', systemprompt v' + r.promptv : ''}`;
  for (const r of rs) { const g = gamla.get(r.id); if (!g) continue;
    const av = ` (av ${r.kort} kort)`;
    for (const [k, namn, merArBattre] of [['namn', 'rätt namn', true], ['felNamn', 'fel namn', false], ['falska', 'falska', false]]) {
      if (r[k] === g[k]) continue;
      ((r[k] > g[k]) === merArBattre ? battre : samre).push(`${r.id}: ${namn} ${g[k]} → ${r[k]}${av}`);
    } }
  const jamforda = rs.filter(r => gamla.has(r.id));
  if (jamforda.length) {
    const gs = jamforda.map(r => gamla.get(r.id)), s = (l, k) => l.reduce((a, r) => a + (r[k] || 0), 0);
    /* Sämre mot en annan modell eller systemprompt är en jämförelse, inget fel. */
    if (gs[0].ai !== jamforda[0].ai || (gs[0].promptv != null && gs[0].promptv !== jamforda[0].promptv))
      console.log(`\nOBS: baslinjen (${BASFIL}) är gjord med ${vad(gs[0])}, den här körningen med ${vad(jamforda[0])}`);
    const dom = samre.length && battre.length ? 'BLANDAT — bättre i något fall, sämre i ett annat' : samre.length ? 'SÄMRE' : battre.length ? 'BÄTTRE' : 'LIKA BRA';
    console.log(`\nJämfört med baslinjen (${BASFIL}): ${dom}`);
    console.log(`  totalt: rätt namn ${s(gs, 'namn')} → ${s(jamforda, 'namn')} av ${s(jamforda, 'kort')} kort, fel namn ${s(gs, 'felNamn')} → ${s(jamforda, 'felNamn')}, falska ${s(gs, 'falska')} → ${s(jamforda, 'falska')}`);
    if (battre.length) console.log('  bättre:\n    ' + battre.join('\n    '));
    if (samre.length) console.log('  sämre:\n    ' + samre.join('\n    '));
  } else console.log(`\nIngen baslinje att jämföra med för de här fallen (${BASFIL}).`);
  /* --spara med --fall byter bara de körda fallen i baslinjen; övriga står kvar
     ur filen. Förut skrev "--fall 07 --spara" en baslinje med enbart fall 07,
     och alla andra fall slutade jämföras — just när ett nytt fall lagts till. */
  if (SPARA) {
    let rader = JSON.parse(json);
    if (FALL) {
      let gamla = []; try { gamla = JSON.parse(fs.readFileSync(path.join(__dirname, BASFIL), 'utf8')); } catch (e) {}
      const korda = new Set(rader.map(r => r.id));
      rader = gamla.filter(r => !korda.has(r.id)).concat(rader).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    }
    fs.writeFileSync(path.join(__dirname, BASFIL), '[\n' + rader.map(r => JSON.stringify(r)).join(',\n') + '\n]\n');
    console.log(`\nsparat som dev/golden/${BASFIL}${FALL ? ` (fall ${FALL}… bytta, övriga ur filen)` : ''} — lägg en rad i historik.md`);
  }
  else console.log('\n(--spara skriver ' + BASFIL + ')');
  ws.close(); chrome.kill(); server.kill();
  process.exit(samre.length ? 1 : 0);
})().catch(e => { console.error('\nkor.cjs: ' + (e && e.message || e)); process.exit(2); });

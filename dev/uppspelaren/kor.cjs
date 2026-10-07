#!/usr/bin/env node
/* Uppspelaren (MES-333): ett inspelat parti genom appens riktiga avstämning
   och appens riktiga matta, med simulerad klocka, och måtten ur det.

   Kör:  node dev/uppspelaren/kor.cjs                  alla fall mot index.html, tabellen
         node dev/uppspelaren/kor.cjs --fall g07,p0921 bara de fallen
         node dev/uppspelaren/kor.cjs --fil /tmp/x.html en annan index.html
         node dev/uppspelaren/kor.cjs --spara          skriver baslinjen (baslinje/baslinje.json och .md)
         node dev/uppspelaren/kor.cjs --jamfor [--fil …]  rad för rad mot baslinjen; slutkod 1 om någon rad är sämre
         node dev/uppspelaren/kor.cjs --json ut.json   allt: loggen och måtten per fall
         node dev/uppspelaren/kor.cjs --detalj g09     vad som räknades, händelse för händelse
         node dev/uppspelaren/kor.cjs --bilder <mapp>  skärmdumpar ur visaren (huvudlös): baslinjens tre,
                                       eller --vid g12:7.5,g12:7.85 (fall:sekund)
         node dev/uppspelaren/kor.cjs --visa [--fall p0921]  visaren i ett fönster (videon/rutorna och mattan)

   Fallen (fall.cjs): golden 07, 09, 10, 11, 12 och passet 2026-09-22 —
   telefonens riktiga bordslogg — partiet 2026-09-21 sek 240–540, där
   v2-facit matas in som en idealiserad telefon (p0921), och samma parti
   genom kedjan på skärminspelningens kamerabild, sek 230–540 (p0921k;
   telefonens egen ström i 4K finns inte). Hur måtten räknas: LÄS-MIG.md.

   Slutkod 0 = gick (och inget sämre med --jamfor), 1 = sämre än
   baslinjen, 2 = gick inte att köra (Chrome, underlaget, appen).
   .cjs eftersom package.json säger "type": "module". */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const { server, chrome, vantaApp, vanta, ROT } = require('./chrome.cjs');
const { ALLA, lasFall } = require('./fall.cjs');
const { MATT, berakna, totalt, samre, visa } = require('./matt.cjs');

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const har = n => process.argv.includes(n);
const FIL = path.resolve(arg('--fil', path.join(ROT, 'index.html')));
const FALL = arg('--fall', '') ? arg('--fall').split(',').map(s => s.trim()).filter(Boolean) : null;
const BASLINJE = path.join(__dirname, 'baslinje', 'baslinje.json');
const SOLO = process.argv.includes('--solo');

function gitHead() { try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROT, encoding: 'utf8' }).trim(); } catch (e) { return null; } }
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 12);

/* Ett fall i en ny sida: appen laddas, motorn läggs in, uppspelningen går
   i ett svep. Fallets data hämtas från filservern. */
async function korEtt(c, url, fall) {
  await c.cdp('Page.navigate', { url: url + 'app.html?upp=1' });
  await vantaApp(c);
  await vanta(300);
  if (!(await c.ev("typeof __upp === 'object' && !!__upp.korFall"))) throw new Error('motorn laddades inte i sidan (app.html)');
  return c.ev(`(async () => { const f = await (await fetch('/__upp/fall/${fall.id}.json')).json(); if (${SOLO}) f.motstandare = false; return __upp.korFall(f); })()`);
}

async function korAlla(ids) {
  const fall = [];
  for (const id of ids) {
    try { fall.push(lasFall(id)); }
    catch (e) { console.error(`uppspelaren: fallet ${id} går inte att läsa — ${e.message}`); process.exitCode = 2; fall.push({ id, fel: e.message }); }
  }
  const extra = {};
  for (const f of fall) if (!f.fel) { const data = JSON.stringify(Object.assign({}, f, { media: undefined })); extra[`/__upp/fall/${f.id}.json`] = () => data; }
  const srv = await server(FIL, extra);
  const url = `http://127.0.0.1:${srv.address().port}/`;
  let c;
  try { c = await chrome(); } catch (e) { console.error('uppspelaren: ' + e.message); srv.close(); process.exit(e.kod || 2); }
  const res = [];
  try {
    for (const f of fall) {
      if (f.fel) { res.push({ id: f.id, fel: f.fel }); continue; }
      const t0 = Date.now();
      try {
        const logg = await korEtt(c, url, f);
        const b = berakna(f, logg);
        res.push({ id: f.id, namn: f.namn, slag: f.slag, kalla: f.kalla, anm: f.anm, minuter: (f.till - f.fran) / 60, ms: Date.now() - t0, matt: b.matt, detalj: b.detalj, n: b.n, logg });
        /* Ett undantag i appen, eller en läsning motorn inte kan tolka, gör
           måtten opålitliga: slutkod 2 i alla lägen, också med --jamfor. */
        if (b.n.fel.length) { console.error(`uppspelaren: ${f.id}: ${b.n.fel.length} fel under uppspelningen (undantag i appen eller en läsning som inte går att tolka) — måtten gäller inte: ${b.n.fel.slice(0, 3).join(' | ')}`); process.exitCode = 2; }
      } catch (e) {
        console.error(`uppspelaren: ${f.id} gick inte att köra — ${e.message}`);
        for (const k of c.konsol.splice(0)) console.error('     ' + k);
        res.push({ id: f.id, fel: e.message }); process.exitCode = 2;
      }
    }
  } finally { await c.stang(); srv.close(); }
  return res;
}

/* ── utskriften ── */
const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n);
function tabell(res, tot) {
  const ok = res.filter(r => !r.fel);
  const kol = ok.map(r => r.id).concat(['totalt*']);
  const L = [];
  L.push(pad('mått', 62) + kol.map(k => lpad(k, 9)).join(''));
  for (const [key, namn] of MATT) {
    const v = ok.map(r => visa(r.matt[key])).concat([visa(tot[key])]);
    if (v.every(x => x === '–')) continue;
    L.push(pad(namn.length > 61 ? namn.slice(0, 60) + '…' : namn, 62) + v.map(x => lpad(x, 9)).join(''));
  }
  L.push('* totalt = fallen med telefonens ström (golden och passet 2026-09-22); p0921 (facit som ideal telefon) och p0921k (kedjan på skärminspelningens kamerabild) räknas inte in');
  return L.join('\n');
}
function markdown(res, tot, meta) {
  const ok = res.filter(r => !r.fel);
  const L = [];
  L.push(`# Uppspelarens baslinje — ${meta.datum}`);
  L.push('');
  L.push(`Kod: \`${meta.html}\` (sha256 ${meta.sha}, commit ${meta.commit || '?'}). Simulerad klocka: två körningar på samma fil ger samma tal. Spelet har en motståndare (bordsvyn), som ett riktigt parti. Grinden (\`--jamfor\`) är totalt-kolumnen och p0921; tider ±0,1 s, antal exakt. Definitionerna: [LÄS-MIG](../LÄS-MIG.md).`);
  L.push('');
  L.push('| Fall | Vad | Underlag |');
  L.push('|---|---|---|');
  for (const r of ok) L.push(`| ${r.id} | ${r.namn} | ${r.kalla} |`);
  L.push('');
  L.push('**p0921 är facit, inte telefonen:** v2-facit för partiet 2026-09-21 matat som en idealiserad telefon var tionde sekund. Där mäts mattans geometri (avstånd, omlott, kanten), inte kamerans fart eller träffsäkerhet.');
  L.push('');
  L.push('**p0921k är kedjan på skärminspelningens kamerabild** (704 × 438, Mesas ramar i bilden, utan Claude), sek 230–540: händer, skymda och korta spår som i ett riktigt parti, men nästan inga namn — mattan visar mest platshållare. Inte telefonens egen ström i 4K.');
  L.push('');
  L.push('| Mått | ' + ok.map(r => r.id).join(' | ') + ' | totalt* |');
  L.push('|---|' + ok.map(() => '---:').join('|') + '|---:|');
  for (const [key, namn] of MATT) {
    const v = ok.map(r => visa(r.matt[key])).concat([visa(tot[key])]);
    if (v.every(x => x === '–')) continue;
    L.push(`| ${namn} | ${v.join(' | ')} |`);
  }
  L.push('');
  L.push('\\* totalt = golden 07, 09–12 och passet 2026-09-22 (telefonens ström; inte p0921 och p0921k). Tider i sekunder från facits tid (rösten eller bildrutan), medianer över alla händelser ihop. – = går inte att räkna för fallet (inget facit för det).');
  return L.join('\n') + '\n';
}
function detaljUt(r) {
  const L = [`${r.id} — ${r.namn}: ${r.n.rapporter} rapporter, ${r.n.hjartslag} hjärtslag, ${r.n.timrar} timrar, ${r.n.prov} mätpunkter, ${r.n.kort} kortelement (${r.ms} ms)`];
  const d = r.detalj;
  if (d.utspel.length) { L.push('  utspel (facit t → kort, platshållare, syns, rätt plats; s efter facit):'); for (const u of d.utspel) L.push(`    ${pad(u.t, 7)} ${pad(u.kort, 26)} kort ${pad(visa(u.kortT), 6)} plats ${pad(visa(u.platsT), 6)} syns ${pad(visa(u.syns), 6)} rätt plats ${visa(u.plats)}`); }
  if (d.borta.length) { L.push("  borttagningar:"); for (const b of d.borta) L.push(`    ${pad(b.t, 7)} ${pad(b.kort, 26)} ${b.dt == null ? "står kvar" + (b.sen != null ? ` (lämnar mattan först +${visa(b.sen)} s, ${b.som})` : "") + (b.fanns === false ? " — fanns inte som kort på mattan" : "") : visa(b.dt) + " s, " + b.som}`); }
  if (d.fel.length) { L.push('  fel nedtoning / borttagning:'); for (const f of d.fel) L.push(`    ${pad(f.t, 7)} ${pad(f.kort, 26)} ${f.som}`); }
  if (d.flytt.length) { L.push('  flyttar:'); for (const f of d.flytt) L.push(`    ${pad(f.t, 7)} ${pad(f.kort, 26)} ${f.som}${f.dt != null ? ', ' + visa(f.dt) + ' s' : ''}`); }
  if (d.utbytta.length) { L.push('  utbytta:'); for (const u of d.utbytta) L.push(`    ${pad(u.t, 7)} ${pad(u.kort, 26)} efter ${u.forlust} vid ${u.forlustT}`); }
  if (d.extra.length) { L.push('  nya kort utan utspel i facit:'); for (const u of d.extra) L.push(`    ${pad(u.t, 7)} ${u.kort}`); }
  if (d.hopp.length) { L.push('  hopp:'); for (const h of d.hopp) { const k = r.logg.kort.find(k => k.s === h.ser); L.push(`    ${pad(h.s, 8)} ${pad(k ? k.namn : h.ser, 26)} ${h.d} kortbredder, ${h.slag}${h.vad ? ' (' + h.vad + ')' : ''}`); } }
  if (d.grid && d.grid.length > 1) { L.push('  mattans transform:'); for (const g of d.grid) L.push(`    ${pad(g.s, 8)} zoom ${g.z != null ? g.z.toFixed(3) : '?'} pan ${g.px},${g.py}${g.glider ? ' (glider)' : ''}`); }
  if (d.platser && d.platser.length) L.push(`  platshållare: ${d.platser.map(e => `${e.fodd}–${e.dod == null ? 'slut' : e.dod} spår ${e.spar}`).join(', ')}`);
  if (d.v2) { L.push(`  v2: ${d.v2.par} kortpar; falska omlott: ${d.v2.omlott.map(o => `ruta ${o.ruta} kort ${o.a}+${o.b} (bord ${o.bord} kb, matta ${o.matta} kb)`).join(', ') || 'inga'}`); L.push(`      utanför kanten: ${d.v2.utanfor.map(o => `${o.ruta}:${o.id}`).join(' ') || 'inga'}; saknas: ${d.v2.saknas.map(o => `${o.ruta}:${o.id}`).join(' ') || 'inga'}`); if (d.v2.somPlats && d.v2.somPlats.length) L.push(`      utan kort med namn (spårets oframkallade kort eller platshållare): ${d.v2.somPlats.length} — ${d.v2.somPlats.map(o => `${o.ruta}:${o.id}`).join(' ')}`); }
  return L.join('\n');
}

/* ── visaren ── */
async function visaren(ids, bilder) {
  const fall = ids.map(id => { try { return lasFall(id); } catch (e) { console.error(`uppspelaren: ${id}: ${e.message}`); return null; } }).filter(Boolean);
  const extra = { '/__upp/fall.json': () => JSON.stringify(fall.map(f => ({ id: f.id, namn: f.namn, slag: f.slag, fran: f.fran, till: f.till, media: f.media, anm: f.anm, facit: f.facit }))) };
  for (const f of fall) { const data = JSON.stringify(Object.assign({}, f, { media: undefined })); extra[`/__upp/fall/${f.id}.json`] = () => data; }
  const srv = await server(FIL, extra);
  const url = `http://127.0.0.1:${srv.address().port}/dev/uppspelaren/visa.html`;
  if (!bilder) {
    const c = await chrome({ visa: true, storlek: [1680, 1000] });
    await c.cdp('Page.navigate', { url: url + '?fall=' + fall[0].id });
    console.log(`uppspelaren --visa: ${url}?fall=${fall[0].id} — stäng fönstret eller Ctrl-C för att sluta`);
    await new Promise(() => {});
  }
  fs.mkdirSync(bilder, { recursive: true });
  const c = await chrome({ storlek: [1600, 900] });
  const ut = [];
  try {
    const lista = arg('--vid') ? arg('--vid').split(',').map(x => { const [id, s] = x.split(':'); return [id, +s, `${id}-${s}.jpg`]; }) : BILDER.filter(b => ids.includes(b[0]));
    for (const [id, s, namn] of lista) {
      await c.cdp('Page.navigate', { url: `${url}?fall=${id}&t=${s}` });
      const t0 = Date.now();
      for (;;) { const k = await c.ev('window.__visaKlar === true').catch(() => false); if (k) break; if (Date.now() - t0 > 60000) throw new Error('visaren blev inte klar för ' + id); await vanta(200); }
      await vanta(800);
      const b = await c.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 70, clip: { x: 0, y: 0, width: 1600, height: 900, scale: 0.75 } });
      const fil = path.join(bilder, namn);
      fs.writeFileSync(fil, Buffer.from(b.data, 'base64'));
      ut.push(fil);
    }
  } finally { await c.stang(); srv.close(); }
  return ut;
}
/* Skärmdumparna i baslinjen: [fall, sekund, filnamn]. */
const BILDER = [
  ['p0921', 240.6, 'p0921-240.jpg'],
  ['g09', 21.0, 'g09-21.jpg'],
  ['p0922', 166.0, 'p0922-166.jpg']
];

/* ── kör ── */
(async () => {
  const ids = FALL || ALLA;
  for (const id of ids) if (!ALLA.includes(id)) { console.error(`uppspelaren: okänt fall ${id} (finns: ${ALLA.join(', ')})`); process.exit(2); }
  if (har('--visa')) { await visaren(FALL || ['p0921']); return; }
  if (arg('--bilder')) { const vid = arg('--vid') ? [...new Set(arg('--vid').split(',').map(x => x.split(':')[0]))] : null; const l = await visaren(vid || FALL || [...new Set(BILDER.map(b => b[0]))], path.resolve(arg('--bilder'))); console.log('uppspelaren --bilder: ' + l.map(f => path.relative(process.cwd(), f)).join(', ')); return; }

  const t0 = Date.now();
  const res = await korAlla(har('--jamfor') && !FALL && fs.existsSync(BASLINJE) ? JSON.parse(fs.readFileSync(BASLINJE, 'utf8')).fall.map(f => f.id) : ids);
  const ok = res.filter(r => !r.fel);
  const tot = totalt(ok);
  const meta = { datum: new Date().toLocaleDateString('sv-SE'), html: path.relative(ROT, FIL) || FIL, sha: sha(FIL), commit: FIL === path.join(ROT, 'index.html') ? gitHead() : null };
  console.log(`Uppspelaren: ${meta.html} (sha256 ${meta.sha}), ${ok.length} fall på ${((Date.now() - t0) / 1000).toFixed(1)} s, simulerad klocka`);
  console.log(tabell(res, tot));
  for (const id of (arg('--detalj', '') || '').split(',').filter(Boolean)) { const r = ok.find(r => r.id === id); if (r) console.log('\n' + detaljUt(r)); }
  if (arg('--json')) { fs.writeFileSync(path.resolve(arg('--json')), JSON.stringify({ meta, totalt: tot, fall: res }) + '\n'); console.log(`allt skrivet till ${arg('--json')}`); }

  if (har('--spara')) {
    if (res.some(r => r.fel || r.n.fel.length)) { console.error('uppspelaren --spara: ett fall gick inte att köra eller gav fel under uppspelningen — ingen baslinje skriven'); process.exit(2); }
    fs.mkdirSync(path.dirname(BASLINJE), { recursive: true });
    const B = { meta, totalt: tot, fall: ok.map(r => ({ id: r.id, namn: r.namn, slag: r.slag, kalla: r.kalla, anm: r.anm, minuter: r.minuter, matt: r.matt, n: Object.assign({}, r.n, { fel: undefined, felAntal: r.n.fel.length }) })) };
    fs.writeFileSync(BASLINJE, JSON.stringify(B, null, 1) + '\n');
    fs.writeFileSync(path.join(path.dirname(BASLINJE), 'baslinje.md'), markdown(res, tot, meta));
    console.log(`baslinjen skriven: ${path.relative(process.cwd(), BASLINJE)} och baslinje.md`);
  }

  if (har('--jamfor')) {
    if (!fs.existsSync(BASLINJE)) { console.error('uppspelaren --jamfor: ingen baslinje (' + path.relative(process.cwd(), BASLINJE) + ') — kör --spara först'); process.exit(2); }
    const B = JSON.parse(fs.readFileSync(BASLINJE, 'utf8'));
    console.log(`\nJämfört med baslinjen ${B.meta.datum} (${B.meta.html}, sha256 ${B.meta.sha}, commit ${B.meta.commit || '?'}):`);
    /* Baslinjen ska vara main: har origin/main:s index.html ändrats sedan den
       sparades jämförs en ändring mot fel utgångsläge. */
    try {
      const mainHtml = execFileSync('git', ['show', 'origin/main:index.html'], { cwd: ROT, maxBuffer: 64 << 20 });
      const mainSha = crypto.createHash('sha256').update(mainHtml).digest('hex').slice(0, 12);
      if (mainSha !== B.meta.sha) console.log(`  VARNING: origin/main:s index.html (sha256 ${mainSha}) är inte baslinjens (${B.meta.sha}). Kör --spara på main först, annars jämförs mot ett gammalt utgångsläge.`);
    } catch (e) { console.log('  VARNING: kunde inte läsa origin/main:index.html (' + String(e.message).split('\n')[0] + ')'); }
    /* Grinden, per kolumn: null = varje mått, en lista = bara de måtten.
       totalt (golden + passet) och p0921 (facit som ideal telefon,
       MES-342/338:s fall) grindar på allt. p0921k (partiet genom kedjan, när
       baslinjen har det) grindar bara på det som inte hänger på namn eller
       på kedjans namnlöshet: geometrin mot v2, hoppen och zoomen som hoppar.
       Resten av p0921k — allt som räknar på namn, platshållarna,
       laddtexterna, zoom och pan per minut, och tills MES-344 är inne också
       utspel som syntes och tid till något syns — är diagnos. Tider får
       skilja ±0,1 s, antal inget. Det som inte grindar skrivs som VARNING
       och fäller inte. */
    const GRIND = {
      totalt: null, p0921: null,
      p0921k: ['avstandMedian', 'avstandP90', 'falskaOmlott', 'utanforRutor', 'utanforKort', 'utanforS', 'saknasRutor', 'hopp', 'hoppSnabba', 'zoomUtanGlid']
    };
    const grindar = (fall, key) => Object.prototype.hasOwnProperty.call(GRIND, fall) && (GRIND[fall] == null || GRIND[fall].includes(key));
    let samreN = 0, battreN = 0, varnN = 0, saknas = 0, saknasMatt = 0;
    /* Måtten som jämförs är baslinjens OCH dagens: ett mått som finns i
       baslinjen men inte längre räknas (borttaget ur MATT) får inte tyst
       hoppas över — då kan grinden aldrig fälla på det (granskningen av
       MES-333, fynd 3). Det ger slutkod 2, som ett fall som inte gick att köra. */
    const nycklar = m => [...new Set([...MATT.map(x => x[0]), ...Object.keys(m || {})])];
    const rad = (fall, key, f, e) => {
      if (!MATT.find(m => m[0] === key)) { console.log(`  ${pad(fall, 8)} ${pad(key, 61)} ${lpad(visa(f), 8)} → MÅTTET RÄKNAS INTE LÄNGRE`); saknasMatt++; return; }
      const namn = (MATT.find(m => m[0] === key) || [, key])[1];
      const grind = grindar(fall, key);
      const s = samre(key, f, e, true), b = !s && samre(key, e, f, true);
      if (s && grind) samreN++; else if (s) varnN++;
      if (b && grind) battreN++;
      if (s || b || har('--alla')) console.log(`  ${pad(fall, 8)} ${pad(namn.length > 60 ? namn.slice(0, 59) + '…' : namn, 61)} ${lpad(visa(f), 8)} → ${pad(visa(e), 8)} ${s ? (grind ? 'SÄMRE' : 'VARNING (diagnos, fäller inte)') : b ? 'bättre' : ''}`);
    };
    for (const bf of B.fall.filter(f => !FALL || FALL.includes(f.id))) {
      const r = ok.find(r => r.id === bf.id);
      if (!r) { console.log(`  ${pad(bf.id, 8)} GICK INTE ATT KÖRA`); saknas++; continue; }
      for (const key of nycklar(bf.matt)) rad(bf.id, key, bf.matt[key], r.matt[key]);
    }
    if (!FALL) for (const key of nycklar(B.totalt)) rad('totalt', key, B.totalt[key], tot[key]);
    else console.log('  (--fall: bara de fallen jämförs, inte totalt)');
    console.log(`  → grinden (totalt, p0921, p0921k:s geometri, hopp och zoomhopp): ${samreN} rader sämre, ${battreN} bättre; per fall: ${varnN} varningar${saknas ? `; ${saknas} fall gick inte att köra` : ''}${har('--alla') ? '' : ' (oförändrade rader visas med --alla)'}`);
    if (saknasMatt) console.log(`  → ${saknasMatt} mått i baslinjen räknas inte längre — spara om baslinjen på main om det är avsiktligt`);
    if (saknas || saknasMatt) process.exitCode = 2;
    else if (samreN && process.exitCode !== 2) process.exitCode = 1;
  }
})().catch(e => { console.error('uppspelaren: ' + (e && e.stack || e)); process.exit(2); });

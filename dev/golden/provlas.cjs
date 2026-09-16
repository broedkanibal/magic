// Provkortets lås (MES-166): spelar videofallens bordsloggar genom datorns
// provkortSpar + provLasSteg, som steg 4 i uppstarten gör med varje bord.
// Kör: node dev/golden/provlas.cjs [--mot <gammal index.html>] [--fall 11]
//
// Loggarna är telefonens riktiga rapporter (senaste.json, sparade av
// kor.html), med händer i bild — det bänken inte kan härma: en syntetisk
// hand blir aldrig en klump som går igenom detektorn. Måttet är hur länge
// låset stod med en ruta större än 1,6 kort (fallets median av klara spår),
// och hur många nya lås som föddes större än så eller vid bildens kant. Har
// facit `provkort` (fall 12) mäts också vilorna: hur stor del av tiden då
// kortet ligger ensamt och stilla som låset står på en kortstor ruta, hur
// snart det låses, och hur många lås som föds medan handen är i bild.
// Fallen har flera kort, så låset hoppar mellan dem; det är storleken som
// räknas, inte antalet lås. --mot kör samma loggar genom en annan fil, t.ex.
//   git show HEAD~1:index.html > /tmp/fore.html
//   node dev/golden/provlas.cjs --mot /tmp/fore.html
// En fil utan provLasSteg körs med låset som det var före MES-166.
// .cjs eftersom package.json säger "type": "module".
'use strict';
const fs = require('fs'), path = require('path');
const arg = n => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
const FALL = arg('--fall') || '';

/* En funktion ur källan, från "function namn(" till sin avslutande klammer. */
function plock(src, namn) {
  const a = src.indexOf('function ' + namn + '(');
  if (a < 0) throw new Error('hittar inte ' + namn);
  let d = 0, i = src.indexOf('{', a);
  for (; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}' && --d === 0) break; }
  return src.slice(a, i + 1);
}
/* Låset som det var före MES-166 (oppSteg4): ett spår som täcker låset tar
   id:t, ett mätt spår låser, annars släpps det. */
const FORE = `function provLasSteg(las, p, vantar) {
  if (p && p.vidLas && las) return { las: Object.assign({}, las, { id: p.t.id }), ny: false };
  if (p && p.matt) return { las: { id: p.t.id, box: { x: p.t.x, y: p.t.y, w: p.t.w, h: p.t.h } }, ny: true };
  return { las: vantar ? las : null, ny: false };
}`;
function bygg(fil) {
  const src = fs.readFileSync(fil, 'utf8');
  const kant = src.includes('const PROV_KANT') ? src.slice(src.indexOf('const PROV_KANT'), src.indexOf('function provkortSpar(')) : '';
  const steg = src.includes('function provLasSteg(') ? plock(src, 'provLasSteg') : FORE;
  return new Function(plock(src, 'tackning') + '\n' + kant + '\n' + plock(src, 'provkortSpar') + '\n' + steg + '\nreturn { provkortSpar, provLasSteg };')();
}

function kor(app, f) {
  const klara = [];
  for (const b of f.bordLogg) for (const t of b.spar || []) if (t.tillstand === 'klar' && t.w > 0) klara.push(t.w * t.h);
  klara.sort((a, b) => a - b);
  const kortYta = klara[klara.length >> 1] || 0;
  const stor = box => kortYta > 0 && box.w * box.h > 1.6 * kortYta;
  const vidKant = box => box.x <= 0.01 || box.y <= 0.01 || box.x + box.w >= 0.99 || box.y + box.h >= 0.99;
  let las = null, forra = f.bordLogg.length ? f.bordLogg[0].s : 0;
  const ut = { nya: 0, stora: 0, kanten: 0, lastS: 0, storS: 0 };
  /* Facits provkort (fall 12): vila = kortet ligger ensamt och stilla, där
     ska det vara låst på en kortstor ruta; handen = handen i bild, där ska
     inget nytt lås födas. Loggen är bara rapporterna, så låset gäller från
     en rapport till nästa. */
  const pk = f.provkort || null, inom = (t, lista) => (lista || []).find(([a, b]) => t >= a && t < b);
  const vila = pk ? pk.vila.map(([a, b]) => ({ a, b, lasS: 0, forst: null })) : [];
  if (pk) Object.assign(ut, { vilaS: 0, vilaLasS: 0, handNya: 0 });
  const rakna = (t0, t1, l) => { for (const v of vila) { const a = Math.max(t0, v.a), b = Math.min(t1, v.b); if (b <= a) continue; if (l && !stor(l.box)) { v.lasS += b - a; if (v.forst == null) v.forst = a - v.a; } } };
  for (const b of f.bordLogg) {
    const dt = b.s - forra;
    if (las) { ut.lastS += dt; if (stor(las.box)) ut.storS += dt; }
    if (pk) rakna(forra, b.s, las);
    forra = b.s;
    if (b.nollstall) { las = null; continue; }
    const p = app.provkortSpar(b.spar || [], [], null, las ? las.id : null, las ? las.box : null);
    const s = app.provLasSteg(las, p, false);
    las = s.las;
    if (s.ny) { ut.nya++; if (stor(las.box)) ut.stora++; if (vidKant(las.box)) ut.kanten++; if (pk && inom(b.s, pk.handen)) ut.handNya++; }
  }
  if (pk) {
    const slut = f.bordLogg.length ? f.bordLogg[f.bordLogg.length - 1].s : 0;
    rakna(forra, slut, las);
    for (const v of vila) { ut.vilaS += v.b - v.a; ut.vilaLasS += v.lasS; }
    const ford = vila.map(v => v.forst == null ? Infinity : v.forst).sort((x, y) => x - y);
    ut.vilaFord = ford.length ? ford[ford.length >> 1] : null;
    ut.vilaAldrig = vila.filter(v => v.forst == null).length; ut.vilaAntal = vila.length;
  }
  return ut;
}
const rad = u => `${u.nya} nya lås (${u.stora} större än 1,6 kort, ${u.kanten} vid kanten) · låst ${u.lastS.toFixed(1)} s, med för stor ruta ${u.storS.toFixed(1)} s`
  + (u.vilaS != null ? `\n       vila: låst på kortet ${u.vilaLasS.toFixed(1)} av ${u.vilaS.toFixed(1)} s (${Math.round(100 * u.vilaLasS / Math.max(1e-9, u.vilaS))} %), till lås ${u.vilaFord === Infinity ? 'aldrig' : u.vilaFord == null ? '–' : u.vilaFord.toFixed(1) + ' s'} (median), ${u.vilaAldrig} av ${u.vilaAntal} vilor utan lås · nya lås medan handen är i bild ${u.handNya}` : '');

const nu = bygg(path.join(__dirname, '..', '..', 'index.html'));
const mot = arg('--mot') ? bygg(arg('--mot')) : null;
const res = JSON.parse(fs.readFileSync(path.join(__dirname, 'senaste.json'), 'utf8'));
const fall = (Array.isArray(res) ? res : Object.values(res)).filter(f => f && Array.isArray(f.bordLogg) && f.bordLogg.length && (!FALL || FALL.split(',').some(x => f.id.startsWith(x))));
for (const f of fall) { try { f.provkort = JSON.parse(fs.readFileSync(path.join(__dirname, 'fall', f.id, 'facit.json'), 'utf8')).provkort || null; } catch (e) { f.provkort = null; } }
if (!fall.length) { console.log('Inga videofall med bordslogg i senaste.json' + (FALL ? ' för --fall ' + FALL : '') + '.'); process.exit(0); }
let storNu = 0, storMot = 0;
for (const f of fall) {
  const a = kor(nu, f); storNu += a.storS;
  console.log(f.id);
  if (mot) { const b = kor(mot, f); storMot += b.storS; console.log('  mot: ' + rad(b)); }
  console.log('  nu:  ' + rad(a));
}
console.log(`\nMed för stor ruta totalt: ${storNu.toFixed(1)} s` + (mot ? ` (mot ${storMot.toFixed(1)} s)` : ''));

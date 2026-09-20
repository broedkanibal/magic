// Spärren mot säkra FEL namn på en bit av ett kort (MES-259, ur MES-246 del 1).
// Kör: node dev/delmarginal.cjs   — ingår i dev/kolla.sh. Slutkod 1 om något faller.
//
// Vad det provar: `identifyMedModell` i index.html accepterar ett namn som ORB
// bär. Ramar ORB:s träff bara in en BIT av ett kort (skalan under ORB_HEL) krävs
// sedan MES-259 att modellen själv har en marginal över DEL_MARGINAL.
//
// Provet spelar upp de SPARADE domarna från MES-246 del 1
// (dev/las-fore-slapp/matning/, 1 045 beskärningar ur en hand som lägger ner
// kort, i åtta lager: 4K, 1080p, hela regionen, rörelseoskärpa, hård jpeg).
// Varje rad bär de tal domen föll på — marginal, inliers, skala — och facit.
// Det är alltså inte en ny mätning utan en uppspelning: den låser fast det
// mätta utfallet, så att en ändring av ORB_HEL eller DEL_MARGINAL inte i
// tysthet släpper tillbaka de fel namn spärren sattes för.
//
// Varför en uppspelning och inte golden: golden kör hela kedjan på video och
// har inget fall där en hand håller kortet. De tre fel namnen finns bara i det
// här materialet. Golden mäter att spärren inte KOSTAR något — det här mäter
// att den GER något.
'use strict';
const fs = require('fs'), path = require('path');
const rot = path.join(__dirname, '..');

// ── konstanterna läses ur index.html, så att provet följer koden ──────
const src = fs.readFileSync(path.join(rot, 'index.html'), 'utf8');
function konstant(namn) {
  const m = new RegExp('\\b' + namn + '\\s*=\\s*([0-9]*\\.?[0-9]+)').exec(src);
  if (!m) throw new Error('hittar inte ' + namn + ' i index.html');
  return parseFloat(m[1]);
}
const ORB_HEL = konstant('ORB_HEL'), DEL_MARGINAL = konstant('DEL_MARGINAL');
// Spärren ska sitta i bar-raden, inte bara vara deklarerad.
if (!/const bar = [\s\S]{0,200}DEL_MARGINAL/.test(src)) {
  console.error('FEL  DEL_MARGINAL används inte i bar-raden i identifyMedModell');
  process.exit(1);
}

/* Domen är accept = bar || ensam. Spärren sitter på `bar`. En rad som faller
   på spärren har marginal < DEL_MARGINAL (0,08), och `ensam` kräver att
   modellen är säker (Embed.TROSKEL 0,11) eller landregeln (0,15) — båda över
   0,08. En rad som spärren tar kan alltså aldrig ha burits av `ensam`, och
   accept följer bar. Därför räcker de sparade fälten för att räkna om domen. */
const spard = r => r.accept;
const medSparr = r => r.accept && (!(r.skala < ORB_HEL) || r.marginal >= DEL_MARGINAL);

const filer = ['svar-allt.json', 'svar-forsamrad.json'];
let fel = 0, lager = 0, felNamnFore = 0, felNamnEfter = 0, tappadeRatt = 0, rattEfter = 0;

for (const f of filer) {
  const p = path.join(rot, 'dev', 'las-fore-slapp', 'matning', f);
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const nycklar = new Set();
  for (const r of j.svar) for (const k of Object.keys(r.lager || {})) nycklar.add(k);
  for (const k of [...nycklar].sort()) {
    const rader = j.svar.filter(r => r.lager && r.lager[k]).map(r => Object.assign({ facit: r.facit }, r.lager[k]));
    const fore = rader.filter(spard), efter = rader.filter(medSparr);
    const fF = fore.filter(r => r.namn !== r.facit).length;
    const fE = efter.filter(r => r.namn !== r.facit).length;
    const rF = fore.length - fF, rE = efter.length - fE;
    lager++; felNamnFore += fF; felNamnEfter += fE; tappadeRatt += rF - rE; rattEfter += rE;
    const rad = `${f.replace('svar-', '').replace('.json', '')}/${k}`.padEnd(38);
    // Hårda krav per lager: inget fel namn får finnas kvar, och spärren får
    // aldrig kosta mer än den tar.
    if (fE > 0) { console.error(`FEL  ${rad} ${fE} säkra FEL namn kvar efter spärren`); fel++; continue; }
    if (rF - rE > 2) { console.error(`FEL  ${rad} spärren tar ${rF - rE} rätta läsningar (högst 2 väntat)`); fel++; continue; }
    console.log(`OK   ${rad} fel namn ${fF} → 0, rätta ${rF} → ${rE}`);
  }
}

// Totalen, som den står i kommentaren vid DEL_MARGINAL i index.html.
if (lager !== 8) { console.error(`FEL  väntade 8 lager, fick ${lager}`); fel++; }
if (felNamnFore !== 3) { console.error(`FEL  materialet ska ha 3 säkra FEL namn utan spärren, har ${felNamnFore}`); fel++; }
if (felNamnEfter !== 0) { console.error(`FEL  ${felNamnEfter} fel namn kvar totalt`); fel++; }
if (tappadeRatt > 2) { console.error(`FEL  spärren tar ${tappadeRatt} rätta läsningar totalt (högst 2 väntat)`); fel++; }

console.log(`\ndelmarginal (ORB_HEL ${ORB_HEL}, DEL_MARGINAL ${DEL_MARGINAL}): ` +
  `${lager} lager, fel namn ${felNamnFore} → ${felNamnEfter}, ` +
  `rätta läsningar ${rattEfter + tappadeRatt} → ${rattEfter} (−${tappadeRatt})`);
console.log(fel === 0 ? 'delmarginal: allt ok' : `delmarginal: ${fel} FEL`);
process.exit(fel === 0 ? 0 : 1);

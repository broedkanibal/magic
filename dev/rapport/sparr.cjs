/* Problemrapporten D (MES-368): spärren mellan test och träning.

   En rapport eller en tyst rättelse som blivit ett regressionsprov (ett
   Mat test-fall eller ett bänkfall) får aldrig hamna i träningen — då mäter
   provet att modellen minns kortet. Och tvärtom: det modellen tränats på
   får aldrig bli ett prov. Samma regel som detektorns spärr prov/träning
   (dev/detektor/delning.py, MES-288). En mätregel, inte en samtyckesfråga.

   Spärren sitter på två ställen, och båda måste säga ja:
     1. Tabellen: rapporter.anvandning är test eller traning, aldrig båda.
        När den väl är test eller traning byts den aldrig (varken av
        till-fall.cjs eller satt.cjs) — inte heller via fix eller slangd,
        annars går det att tvätta test → slangd → traning.
     2. Repot: koden får inte finnas i en kopia på andra sidan (Mat test-
        underlaget och bänken mot träningsmaterialet). Det håller också när
        tabellen inte går att nå, när raden raderats och för fall som skrevs
        med --lokal.
   En rättelse är en egen rad med egen kod (kalla 'rattelse'), så regeln
   gäller per rättelse med samma kod. */
'use strict';
const fs = require('fs'), path = require('path');
const { ROT } = require('./supa.cjs');
const UTROT = process.env.MESA_FALL_UT ? path.resolve(process.env.MESA_FALL_UT) : ROT;   // som i till-fall.cjs

const VARDEN = ['fix', 'test', 'traning', 'slangd'];
const LAST = new Set(['test', 'traning']);   // när raden har ett av dem byts det aldrig

/* Får anvandning gå från `fore` till `efter`? { ok, varfor }. */
function overgang(fore, efter) {
  if (!VARDEN.includes(efter)) return { ok: false, varfor: `okänt värde ${efter} (${VARDEN.join(' | ')})` };
  if (fore === efter) return { ok: true, redan: true };
  if (LAST.has(fore)) return { ok: false, varfor: `rapporten är redan ${fore} och byts aldrig${efter === 'test' || efter === 'traning' ? ' — test och träning är aldrig samma rapport' : ' (annars går det att tvätta test → slangd → traning)'}` };
  return { ok: true };
}

/* Var koden finns i repot. test: Mat test-underlaget och bänken; traning:
   märkningsmaterialet (dev/material/arbete/markning, utanför git). */
const PLATSER = {
  test: [
    () => mappar(path.join(UTROT, 'dev', 'mattest', 'underlag', 'rapporter')).map(d => path.join(d, 'fall.json')),
    () => [path.join(UTROT, 'dev', 'remsa', 'rapportbank', 'manifest.json')]
  ],
  traning: [
    () => mappar(path.join(UTROT, 'dev', 'material', 'arbete', 'markning')).flatMap(p => mappar(p).map(k => path.join(k, 'markning.json')))
  ]
};
function mappar(d) {
  try { return fs.readdirSync(d, { withFileTypes: true }).filter(x => x.isDirectory() || x.isSymbolicLink()).map(x => path.join(d, x.name)); } catch (e) { return []; }
}
/* Koden som ett helt ord: R-0412 hittar inte R-04120. */
function harKod(fil, kod) {
  let t; try { t = fs.readFileSync(fil, 'utf8'); } catch (e) { return false; }
  return new RegExp('(^|[^0-9A-Za-z-])' + kod.replace(/[-]/g, '\\-') + '(?![0-9])').test(t);
}
function kopior(kod) {
  const ut = { test: [], traning: [] };
  for (const sida of Object.keys(PLATSER)) for (const f of PLATSER[sida]) for (const fil of f()) if (harKod(fil, kod)) ut[sida].push(path.relative(UTROT, fil));
  return ut;
}

/* Spärren i repot för en export till `sida` (test | traning). Kastar om
   koden finns på andra sidan. */
function kravLokal(kod, sida) {
  if (!kod) return;
  const k = kopior(kod), andra = sida === 'test' ? 'traning' : 'test';
  if (k[andra].length) {
    const e = new Error(`SPÄRREN: ${kod} finns redan som ${andra === 'test' ? 'prov (test)' : 'träning'} i repot: ${k[andra].join(', ')} — en rapport är test eller träning, aldrig båda`);
    e.sparr = true; throw e;
  }
}

/* Spärren i tabellen: läser raden, prövar övergången och sätter värdet med
   ett villkor på det gamla (två samtidiga kan inte båda vinna). Kastar om
   spärren säger nej. Returnerar { fore, efter, redan }. */
async function sattAnvandning(S, kod, efter, opt) {
  opt = opt || {};
  const [rad] = await S.rest('GET', `rapporter?kod=eq.${encodeURIComponent(kod)}&select=kod,kalla,anvandning`);
  if (!rad) { const e = new Error(`${kod} finns inte i tabellen rapporter`); e.saknas = true; throw e; }
  const fore = rad.anvandning || null;
  if (opt.franTillFall && fore === 'slangd') { const e = new Error(`${kod} är slangd — sätt om den med satt.cjs först om den ska bli ett fall`); e.sparr = true; throw e; }
  const g = overgang(fore, efter);
  if (!g.ok) { const e = new Error(`SPÄRREN: ${kod}: ${g.varfor}`); e.sparr = true; throw e; }
  if (g.redan) return { fore, efter, redan: true, kalla: rad.kalla };
  if (opt.torr) return { fore, efter, torr: true, kalla: rad.kalla };
  const villkor = fore == null ? 'anvandning=is.null' : `anvandning=eq.${fore}`;
  const r = await S.rest('PATCH', `rapporter?kod=eq.${encodeURIComponent(kod)}&${villkor}`, { anvandning: efter });
  if (!r || !r.length) throw new Error(`${kod}: raden ändrades under tiden (anvandning var ${fore}) — kör igen`);
  return { fore, efter, kalla: rad.kalla };
}

module.exports = { VARDEN, overgang, kopior, kravLokal, sattAnvandning, harKod };

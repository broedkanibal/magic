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
   Regeln gäller PER PARTI, inte per kod (som detektorns spärr, som delar
   per inspelningstillfälle): två rättelser av samma kort i samma parti, eller
   en rapport och en rättelse ur samma parti, är nästan samma bild — blir
   den ena test och den andra träning mäter provet att modellen minns
   partiet. Partiets nyckel är { game_id, spelkod }: game_id ur tabellen
   (eller rapportens miljo.spelId / bordsloggens spel), annars spelkoden ur
   rattelse.json eller rapportens miljo.spel. Två poster är samma parti om
   de delar game_id ELLER spelkod (en spelkod kan i sällsynta fall återanvändas
   — då vägrar spärren en gång för mycket, aldrig för lite). Saknas nyckeln
   helt gäller spärren per kod, och till-fall/satt skriver en varning.
   Nyckeln skrivs som `parti` i fall.json, bänkens manifest.json och
   markning.json. */
'use strict';
const fs = require('fs'), path = require('path');
const { ROT } = require('./supa.cjs');
const UTROT = process.env.MESA_FALL_UT ? path.resolve(process.env.MESA_FALL_UT) : ROT;   // som i till-fall.cjs

const VARDEN = ['fix', 'test', 'traning', 'slangd'];
const LAST = new Set(['test', 'traning']);   // när raden har ett av dem byts det aldrig
const MARKNING = path.join(UTROT, 'dev', 'material', 'arbete', 'markning');

/* Får anvandning gå från `fore` till `efter`? { ok, varfor }. */
function overgang(fore, efter) {
  if (!VARDEN.includes(efter)) return { ok: false, varfor: `okänt värde ${efter} (${VARDEN.join(' | ')})` };
  if (fore === efter) return { ok: true, redan: true };
  /* fix → traning: en fix tar med sitt testfall (till-fall --mattest/--bank = test), så en fix blir aldrig träning */
  if (fore === 'fix' && efter === 'traning') return { ok: false, varfor: 'rapporten är en fix — en fix tar med sitt testfall och blir test (till-fall.cjs --mattest/--bank), aldrig träning' };
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
/* Partiets nycklar: 'game:<uuid>' och 'spel:<SPELKOD>'. */
function partiNycklar(p) {
  if (!p) return [];
  const ut = [];
  if (p.game_id) ut.push('game:' + String(p.game_id).toLowerCase());
  if (p.spelkod) ut.push('spel:' + String(p.spelkod).toUpperCase());
  return ut;
}
const harParti = p => partiNycklar(p).length > 0;
/* Posterna i en fil (fall.json, markning.json: ett objekt; manifest.json: en lista) → [{ kod, parti }]. */
function poster(fil) {
  let j; try { j = JSON.parse(fs.readFileSync(fil, 'utf8')); } catch (e) { return []; }
  return (Array.isArray(j) ? j : [j]).filter(x => x && typeof x === 'object').map(x => ({ kod: x.rapport || x.kod || null, parti: x.parti || null }));
}
/* Var koden — eller partiet — finns på varje sida: { test: [...], traning: [...] } med en rad per fil. */
function kopior(kod, parti) {
  const ut = { test: [], traning: [] }, mina = partiNycklar(parti);
  for (const sida of Object.keys(PLATSER)) for (const f of PLATSER[sida]) for (const fil of f()) {
    const rel = path.relative(UTROT, fil);
    if (kod && harKod(fil, kod)) { ut[sida].push(rel); continue; }
    if (!mina.length) continue;
    const traff = poster(fil).find(p => partiNycklar(p.parti).some(n => mina.includes(n)));
    if (traff) ut[sida].push(`${rel} (samma parti: ${traff.kod || 'utan kod'}, ${partiNycklar(traff.parti).filter(n => mina.includes(n)).join(', ')})`);
  }
  return ut;
}

/* Spärren i repot för en export till `sida` (test | traning). Kastar om
   koden finns på andra sidan. */
function kravLokal(kod, sida, parti) {
  if (!kod && !harParti(parti)) return;
  /* Utan träningsmaterialet kan spärren inte se ena sidan (test), och en
     träningsexport skulle hamna fel (en worktree utan länken dev/material):
     slutkod 2, inte ett tyst ja. */
  if (!fs.existsSync(MARKNING)) {
    const e = new Error(`${path.relative(UTROT, MARKNING)} finns inte — spärren kan inte pröva träningsmaterialet (saknas länken dev/material i en worktree?). Inget gjort`);
    e.kod = 2; throw e;
  }
  const k = kopior(kod, parti), andra = sida === 'test' ? 'traning' : 'test';
  if (k[andra].length) {
    const e = new Error(`SPÄRREN: ${kod || 'fallet'}${harParti(parti) ? ' (parti ' + partiNycklar(parti).join(', ') + ')' : ''} finns redan som ${andra === 'test' ? 'prov (test)' : 'träning'} i repot: ${k[andra].join('; ')} — en rapport, och ett parti, är test eller träning, aldrig båda`);
    e.sparr = true; throw e;
  }
}

/* Spärren i tabellen: läser raden, prövar övergången och sätter värdet med
   ett villkor på det gamla (två samtidiga kan inte båda vinna). Kastar om
   spärren säger nej. Returnerar { fore, efter, redan }. */
async function sattAnvandning(S, kod, efter, opt) {
  opt = opt || {};
  const [rad] = await S.rest('GET', `rapporter?kod=eq.${encodeURIComponent(kod)}&select=kod,kalla,anvandning,game_id`);
  if (!rad) { const e = new Error(`${kod} finns inte i tabellen rapporter`); e.saknas = true; throw e; }
  const fore = rad.anvandning || null, game_id = rad.game_id || null;
  if (opt.franTillFall && fore === 'slangd') { const e = new Error(`${kod} är slangd — sätt om den med satt.cjs först om den ska bli ett fall`); e.sparr = true; throw e; }
  const g = overgang(fore, efter);
  if (!g.ok) { const e = new Error(`SPÄRREN: ${kod}: ${g.varfor}`); e.sparr = true; throw e; }
  /* Per parti: ingen annan rad ur samma parti (game_id) på andra sidan, och
     ingen kopia ur partiet på andra sidan i repot (med tabellens game_id). */
  const parti = Object.assign({}, opt.parti || {}, game_id ? { game_id } : {});
  if (LAST.has(efter)) {
    const andra = efter === 'test' ? 'traning' : 'test';
    if (game_id) {
      const ovr = await S.rest('GET', `rapporter?game_id=eq.${encodeURIComponent(game_id)}&kod=neq.${encodeURIComponent(kod)}&anvandning=eq.${andra}&select=kod`);
      if (ovr && ovr.length) { const e = new Error(`SPÄRREN: ${kod}: samma parti (game_id ${game_id}) har redan ${ovr.map(x => x.kod).join(', ')} som ${andra} — ett parti är test eller träning, aldrig båda`); e.sparr = true; throw e; }
    }
    kravLokal(kod, efter, parti);
  }
  const extra = { kalla: rad.kalla, game_id, utanParti: !harParti(parti) };
  if (g.redan) return Object.assign({ fore, efter, redan: true }, extra);
  if (opt.torr) return Object.assign({ fore, efter, torr: true }, extra);
  const villkor = fore == null ? 'anvandning=is.null' : `anvandning=eq.${fore}`;
  const r = await S.rest('PATCH', `rapporter?kod=eq.${encodeURIComponent(kod)}&${villkor}`, { anvandning: efter });
  if (!r || !r.length) throw new Error(`${kod}: raden ändrades under tiden (anvandning var ${fore}) — kör igen`);
  return Object.assign({ fore, efter }, extra);
}

module.exports = { VARDEN, overgang, kopior, kravLokal, sattAnvandning, harKod, partiNycklar, harParti };

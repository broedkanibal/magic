/* Granskningens mått i skugga (dev/plan/granskning-skala.md, steg 1–3): räknar beslutsloggen som granskningssidan
   skriver (beslutslogg.cjs, ~/.mesa/granska-beslut.jsonl). Läser bara; ändrar inga gränser och styr ingenting.

   Kör:  node dev/rapport/granska-matt.cjs                  tabellerna
         node dev/rapport/granska-matt.cjs --fil <jsonl>    en annan logg (provet)
         node dev/rapport/granska-matt.cjs --sedan 2026-10-20
         node dev/rapport/granska-matt.cjs --json           siffrorna som JSON

   Steg 1  hur ofta förslaget följdes (när raden visades, och vid trycket), tid per kort (median, utan "Alla →
           Träning"), hur ofta rätt namn fanns bland telefonens kandidater.
   Steg 2  sorten bilden föreslog först mot den sort du valde (bara Prov: sorten väljs bara där). Grinden i planen:
           ≥ 80 % totalt och ≥ 70 % i varje sort med minst 10 fall. Planen sätter gränserna på de första 100 och
           prövar dem på nästa 100 — här räknas bara. "Din sort först" (Jespers beslut 2026-10-15): bara Prov där
           sorten valdes innan sidan visat sin gissning räknas i träffen (provSortForst; sidan visar gissningen först
           efter valet de första 100). Ett Prov där gissningen syntes före valet räknas för sig — där kan valet ha
           följt knappen.
   Steg 3  facits förtroende mot dina namnändringar (Träning och Prov: där du godkänner eller byter namnet).
           Grinden: 0 av dina namnändringar bland de gröna, på minst 200 granskade.

   Ett kort som beslutats flera gånger (spärren sa nej, sedan ett annat val) räknas med sitt sista lyckade beslut.
   Inget här frågar Claude. */
'use strict';
const { las, LOGG } = require('./beslutslogg.cjs');

const GRIND = { sortTotal: 0.8, sortPer: 0.7, sortMinFall: 10, gronaMin: 200 };
const SORT_FORST_MAL = 100;   // Prov med "din sort först" innan sidan visar sortgissningen som knapp igen

/* Ett kort som beslutats flera gånger räknas med sitt sista lyckade beslut. */
function sistaPerKod(rader) { const m = new Map(); for (const r of rader) if (r.ok) m.set(r.kod, r); return [...m.values()]; }
/* Prov med sort där sorten valdes innan sidans gissning syntes (sortForst === true i loggen). Granskningssidan räknar
   samma lista för "Din sort först: N av 100". */
const provSortForst = rader => sistaPerKod(rader).filter(r => r.typ === 'namn' && r.val === 'test' && r.sort && r.sortForst === true);
const NIVA = { gron: 'grön', gul: 'gul', rod: 'röd', '?': 'okänd' };

const pct = (a, b) => b ? `${Math.round(100 * a / b)} %` : '–';
const andel = (a, b) => `${a}/${b} (${pct(a, b)})`;
const median = v => { if (!v.length) return null; const s = v.slice().sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const kvantil = (v, q) => { if (!v.length) return null; const s = v.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const sek = ms => ms == null ? '–' : (ms / 1000).toFixed(1).replace('.', ',') + ' s';

function rakna(rader) {
  const lyckade = rader.filter(r => r.ok);
  const B = sistaPerKod(rader), namn = B.filter(r => r.typ === 'namn');
  const ut = { beslut: rader.length, lyckade: B.length, nej: rader.length - lyckade.length, namn: namn.length, handlingar: B.length - namn.length,
    svep: B.filter(r => r.svep).length, forsta: rader.length ? rader[0].t : null, sista: rader.length ? rader[rader.length - 1].t : null };

  /* Steg 1 */
  const medForst = B.filter(r => r.forslagForst), medNu = B.filter(r => r.forslag && r.forslag.val);
  ut.foljtForst = { foljt: medForst.filter(r => r.forslagForst === r.val).length, av: medForst.length };
  ut.foljtNu = { foljt: medNu.filter(r => r.forslag.val === r.val).length, av: medNu.length };
  ut.perForslag = {};
  for (const r of medForst) { const p = ut.perForslag[r.forslagForst] || (ut.perForslag[r.forslagForst] = { av: 0, foljt: 0, val: {} }); p.av++; if (r.val === r.forslagForst) p.foljt++; p.val[r.val] = (p.val[r.val] || 0) + 1; }
  const tider = B.filter(r => !r.svep && r.tid && r.tid.ms != null).map(r => r.tid.ms);
  ut.tid = { n: tider.length, median: median(tider), p90: kvantil(tider, 0.9) };
  const tidNamn = namn.filter(r => !r.svep && r.tid && r.tid.ms != null).map(r => r.tid.ms);
  ut.tidNamn = { n: tidNamn.length, median: median(tidNamn) };
  const medKand = namn.filter(r => r.kandidater);
  /* det namn som gäller: det du skrev om du skrev, annars spelarens */
  ut.kandidater = { av: medKand.length, rattBland: medKand.filter(r => r.namn && r.namn.valt ? r.kandidater.valtBland : r.kandidater.spelarensBland).length, utan: namn.length - medKand.length };

  /* Steg 2 */
  const prov = provSortForst(rader);
  const per = {};
  for (const r of prov) {
    const f = Array.isArray(r.forslagSort) ? r.forslagSort : [], p = per[r.sort] || (per[r.sort] = { fall: 0, forst: 0, bland: 0, inget: 0 });
    p.fall++; if (f[0] === r.sort) p.forst++; if (f.includes(r.sort)) p.bland++; if (!f.length) p.inget++;
  }
  const tot = Object.values(per).reduce((s, p) => ({ fall: s.fall + p.fall, forst: s.forst + p.forst, bland: s.bland + p.bland, inget: s.inget + p.inget }), { fall: 0, forst: 0, bland: 0, inget: 0 });
  const bedomda = Object.entries(per).filter(([, p]) => p.fall >= GRIND.sortMinFall);
  ut.sort = { per, tot, utanMatt: prov.filter(r => r.forslagSort == null).length,
    synliga: namn.filter(r => r.val === 'test' && r.sort && r.sortForst !== true).length,
    grind: !tot.fall ? 'inga Prov där du valt sort först än'
      : tot.fall < SORT_FORST_MAL ? `din sort först: ${tot.fall} av ${SORT_FORST_MAL} Prov (planen sätter gränserna på de första 100 och prövar dem på nästa 100)`
      : tot.forst / tot.fall >= GRIND.sortTotal && bedomda.every(([, p]) => p.forst / p.fall >= GRIND.sortPer) ? 'klarar grinden (80 % totalt, 70 % per sort med ≥ 10 fall)'
      : `klarar inte grinden: ${pct(tot.forst, tot.fall)} totalt${bedomda.filter(([, p]) => p.forst / p.fall < GRIND.sortPer).map(([s, p]) => `, ${s} ${pct(p.forst, p.fall)}`).join('')}` };

  /* Steg 3 */
  const granskade = namn.filter(r => (r.val === 'traning' || r.val === 'test') && r.fortroende && r.fortroende.niva);
  const nivaer = {};
  for (const r of granskade) { const n = nivaer[r.fortroende.niva] || (nivaer[r.fortroende.niva] = { granskade: 0, andrade: 0, exempel: [] }); n.granskade++; if (r.namn && r.namn.andrat) { n.andrade++; if (n.exempel.length < 5) n.exempel.push(`${r.kod}: ${r.namn.spelarens} → ${r.namn.valt}`); } }
  const gron = nivaer.gron || { granskade: 0, andrade: 0, exempel: [] };
  ut.fortroende = { granskade: granskade.length, utanNiva: namn.filter(r => (r.val === 'traning' || r.val === 'test') && !(r.fortroende && r.fortroende.niva)).length,
    andrade: granskade.filter(r => r.namn && r.namn.andrat).length, nivaer,
    grind: gron.andrade ? `FALLER: ${gron.andrade} namnändring${gron.andrade === 1 ? '' : 'ar'} bland de gröna (${gron.exempel.join('; ')})`
      : granskade.length < GRIND.gronaMin ? `0 bland de gröna hittills, men för få: ${granskade.length} av ${GRIND.gronaMin} granskade`
      : `klarar grinden: 0 namnändringar bland ${gron.granskade} gröna, på ${granskade.length} granskade` };
  return ut;
}

function skriv(R, fil, trasiga) {
  const L = [];
  L.push(`Granskningens mått i skugga — ${fil}`);
  if (trasiga) L.push(`VARNING: ${trasiga} rad(er) i loggen gick inte att läsa och är inte med.`);
  if (!R.beslut) { L.push('', 'Inga beslut i loggen än. Den fylls när du väljer Träning, Prov, Släng eller Mat test på granskningssidan.'); return L.join('\n'); }
  L.push(`${R.beslut} beslut ${R.forsta.slice(0, 10)}–${R.sista.slice(0, 10)}: ${R.lyckade} kort beslutade (${R.namn} namnrättelser, ${R.handlingar} handlingar)${R.nej ? `, ${R.nej} tryck där spärren eller verktyget sa nej` : ''}${R.svep ? `, ${R.svep} genom "Alla → Träning"` : ''}.`, '');
  L.push('## Steg 1: underlaget', '', '| | |', '|---|---|');
  L.push(`| Förslaget följt, som det stod när raden visades | ${andel(R.foljtForst.foljt, R.foljtForst.av)} |`);
  L.push(`| Förslaget följt, som det stod vid trycket | ${andel(R.foljtNu.foljt, R.foljtNu.av)} (förslaget ändras när du väljer en sort) |`);
  for (const [f, p] of Object.entries(R.perForslag)) L.push(`| Förslag ${f} | följt ${andel(p.foljt, p.av)} · valen: ${Object.entries(p.val).map(([v, n]) => `${v} ${n}`).join(', ')} |`);
  L.push(`| Tid per kort, median | ${sek(R.tid.median)} (90 % under ${sek(R.tid.p90)}, ${R.tid.n} kort; namnrättelser ${sek(R.tidNamn.median)}). Mål: under 10 s i en rad |`);
  L.push(`| Rätt namn bland telefonens kandidater | ${R.kandidater.av ? andel(R.kandidater.rattBland, R.kandidater.av) : '–'}${R.kandidater.utan ? ` (${R.kandidater.utan} utan kandidater: äldre rättelser)` : ''} |`, '');
  L.push('## Steg 2: sorten sidan gissade mot din sort (Prov där du valde sort först)', '', 'Gissningen kommer ur bildens mått; "Liknande kort" ur att telefonen gissade ett annat namn. Bara Prov där du valde sort innan gissningen syntes räknas.', '');
  if (!R.sort.tot.fall) L.push('Inga Prov där du valt sort först än.');
  else {
    L.push('| Din sort | Fall | Sidans första förslag = din | Bland sidans förslag | Inget förslag |', '|---|---|---|---|---|');
    for (const [s, p] of Object.entries(R.sort.per).sort((a, b) => b[1].fall - a[1].fall)) L.push(`| ${s} | ${p.fall} | ${pct(p.forst, p.fall)} | ${pct(p.bland, p.fall)} | ${p.inget} |`);
    L.push(`| **totalt** | ${R.sort.tot.fall} | ${pct(R.sort.tot.forst, R.sort.tot.fall)} | ${pct(R.sort.tot.bland, R.sort.tot.fall)} | ${R.sort.tot.inget} |`);
    if (R.sort.utanMatt) L.push('', `${R.sort.utanMatt} Prov valdes innan bilden hunnit mätas (räknas som utan förslag).`);
  }
  if (R.sort.synliga) L.push('', `${R.sort.synliga} Prov med sort där gissningen syntes före valet räknas inte i träffen.`);
  L.push('', `Grinden: ${R.sort.grind}.`, '');
  L.push('## Steg 3: facits förtroende mot dina namnändringar (Träning och Prov)', '');
  if (!R.fortroende.granskade) L.push('Inga granskade med en nivå än.');
  else {
    L.push('| Nivå | Granskade | Du ändrade namnet |', '|---|---|---|');
    for (const k of ['gron', 'gul', 'rod', '?']) { const n = R.fortroende.nivaer[k]; if (n) L.push(`| ${NIVA[k]} | ${n.granskade} | ${n.andrade}${n.exempel.length ? ` (${n.exempel.join('; ')})` : ''} |`); }
    L.push(`| **alla** | ${R.fortroende.granskade} | ${R.fortroende.andrade} |`);
  }
  if (R.fortroende.utanNiva) L.push('', `${R.fortroende.utanNiva} granskade utan nivå (borttaget kort utan namn, eller förtroendet gick inte att räkna).`);
  L.push('', `Grinden: ${R.fortroende.grind}.`);
  return L.join('\n');
}

if (require.main === module) {
  const a = process.argv.slice(2), arg = n => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : null; };
  const { rader, trasiga, fil } = las(arg('--fil') || LOGG);
  const sedan = arg('--sedan');
  const urval = sedan ? rader.filter(r => String(r.t) >= sedan) : rader;
  const R = rakna(urval);
  if (a.includes('--json')) console.log(JSON.stringify(Object.assign({ fil, trasiga }, R), null, 1));
  else console.log(skriv(R, fil, trasiga));
}

module.exports = { rakna, skriv, GRIND, SORT_FORST_MAL, provSortForst };

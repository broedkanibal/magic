'use strict';
/* Domarna ur RAK-raderna (MES-287): samma rad bär modellens svar, den
   uträtade jämförelsen (NCC, och NCC + ECC) och ORB — här räknas varje regel
   ut i efterhand, med trösklar valda på det syntetiska setet och prövade på
   de riktiga och på högbänkens fall.

     node dev/embed/rak-analys.cjs                      (synt → trösklar; riktiga, hog med dem)
     node dev/embed/rak-analys.cjs --tagg x             (filerna webb-rak-<set>-x.json)
     node dev/embed/rak-analys.cjs --fel                (skriv varje säkert fel)

   Reglerna (säker = spärren släpper igenom namnet):
     ORB       som FUSION i bank.html: ORB bär ettan (≥ 10 inliers) eller modellen
               säker (marginal > 0,11) utan att ORB säger emot (≥ 6 på annat namn).
     RAK       uträtad + ECC i ORB:s ställe: rho (korrelationen efter inpassning)
               bär ettan när rho ≥ T och avståndet till nästa namn ≥ M; säger emot
               när ett annat namn ligger ≥ M över ettan. Modellen säker utan
               motsägelse räknas som i ORB-regeln.
     RAK0      samma med NCC utan inpassning (centrerad korrelation nccC).
     KOMBI     RAK först; är den varken bär eller emot avgör ORB. Räknar hur
               ofta ORB behövdes.
   Ett fall räknas som rätt när gissningen finns bland de rätta namnen
   (riktiga/synt: facit; hog: överst/over/under/annat). */
const fs = require('fs');
const path = require('path');
const arg = (namn, forval) => { const i = process.argv.indexOf('--' + namn); return i < 0 ? forval : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const RES = path.join(__dirname, 'cache', 'resultat');
const TAGG = arg('tagg', null);
const las = set => { const f = path.join(RES, `webb-rak-${set}${TAGG ? '-' + TAGG : ''}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };

const ratta = r => new Set(r.ratta || [r.namn]);
const arRatt = (r, namn) => ratta(r).has(namn);

/* Måtten per namn ur raden. */
/* Inpassningens skala: sqrt|det| av den affina varpens linjära del. Ett helt
   kort i sin ruta ger ≈ 1 (uppmätt 0,90–0,98 på rätta kort); en bit av ett
   kort (kortet större än rutan) > 1, en ruta större än kortet (klunga) < 1. */
const skalaAv = p => p ? Math.sqrt(Math.abs((1 + p[0]) * (1 + p[3]) - p[1] * p[2])) : null;
function rak(r, matt) {
  const per = r[matt === 'nccC' ? 'rak0' : 'rak1'], lista = Object.keys(per).map(n => ({ namn: n, v: per[n][matt], skala: skalaAv(per[n].p) })).sort((a, b) => b.v - a.v);
  const etta = lista.find(x => x.namn === r.gissning), annan = lista.find(x => x.namn !== r.gissning);
  return { bast: lista[0], etta: etta ? etta.v : -1, annan: annan ? annan.v : -1, skala: etta ? etta.skala : null };
}
function domORB(r) {
  const b = r.orb.bast, bar = b.inliers >= 10 && b.namn === r.gissning, emot = b.inliers >= 6 && b.namn !== r.gissning;
  return { saker: !r.skrap && ((r.embedSaker && !emot) || bar), bar, emot };
}
/* k: { matt, T, M, L, modell }. bar = ettan bärs (≥ T och M över nästa namn);
   emot = ett annat namn bärs i stället; stod = ettan når L (svagare än T).
   Modellen säker ensam kräver stödet: utan det släppte regeln igenom fall
   11:s Swamp i plastficka (modellen säker på Plains, rho 0,78 — under T men
   ingen motsägelse), som ORB stoppar med 9 inliers på Swamp. */
function domRAK(r, k) {
  const m = rak(r, k.matt), hel = !k.skala || (m.skala != null && m.skala >= k.skala[0] && m.skala <= k.skala[1]);
  const bar = m.etta >= k.T && m.etta - m.annan >= k.M && r.marginal >= (k.modMarg || 0) && hel, emot = m.annan - m.etta >= k.M && m.annan >= k.T;
  const stod = m.etta >= (k.L == null ? k.T : k.L);
  const saker = !r.skrap && (bar || (k.modell && r.embedSaker && stod && !emot));
  return { saker, bar, emot, etta: m.etta, annan: m.annan };
}
function domKOMBI(r, k) {
  const a = domRAK(r, k); if (a.bar || a.emot) return Object.assign(a, { orb: false });
  return Object.assign(domORB(r), { orb: true });
}
function summera(rader, dom) {
  const s = { n: rader.length, ratt: 0, sakraRatt: 0, sakraFel: 0, orb: 0 };
  for (const r of rader) { const d = dom(r), ok = arRatt(r, r.gissning); if (ok) s.ratt++; if (d.saker) { if (ok) s.sakraRatt++; else s.sakraFel++; } if (d.orb) s.orb++; }
  return s;
}
function perTyp(rader, dom) {
  const per = new Map(); for (const r of rader) { const g = per.get(r.typ) || []; g.push(r); per.set(r.typ, g); }
  return [...per.entries()].sort().map(([typ, rs]) => Object.assign({ typ }, summera(rs, dom)));
}
const med = xs => { const v = xs.slice().sort((a, b) => a - b); return v.length ? v[v.length >> 1] : 0; };
const p90 = xs => { const v = xs.slice().sort((a, b) => a - b); return v.length ? v[Math.floor(v.length * 0.9)] : 0; };

(async () => {
  /* --tagg utan (lek-golden-utan: 12 av 28 namn borttagna): trösklarna tas ur
     det vanliga syntetiska setet, och riktiga/hog läses med taggen. */
  const synt = las('synt') || (TAGG && JSON.parse(fs.readFileSync(path.join(RES, 'webb-rak-synt.json'), 'utf8'))), riktiga = las('riktiga'), hog = las('hog');
  if (!synt) { console.error('saknar cache/resultat/webb-rak-synt.json'); process.exit(1); }
  const S = synt.rader;
  /* Trösklar: på synt, 0 säkra fel, flest säkra rätt. */
  const val = [];
  for (const matt of ['rho', 'nccC2', 'nccC']) for (const modell of [true, false]) {
    let bast = null;
    const Ts = matt === 'rho' ? [0.84, 0.86, 0.88, 0.90, 0.92, 0.94] : [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
    const Ms = matt === 'rho' ? [0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.10] : [0.05, 0.1, 0.15, 0.2, 0.3];
    const Ls = !modell ? [null] : matt === 'rho' ? [0.78, 0.80, 0.82, 0.84, 0.86, 0.88] : [0.0, 0.1, 0.2, 0.3];
    for (const T of Ts) for (const M of Ms) for (const L of Ls) {
      if (L != null && L > T) continue;
      const k = { matt, T, M, L, modell }, s = summera(S, r => domRAK(r, k));
      if (s.sakraFel === 0 && (!bast || s.sakraRatt > bast.s.sakraRatt)) bast = { k, s };
    }
    if (bast) val.push(bast);
  }
  /* --L 0.80: stödtröskeln satt för hand (prövad på de riktiga: fall 11:s
     Swamp i plastficka ligger på rho 0,78–0,79, just över syntens 0,78). */
  if (arg('L')) for (const v of val) if (v.k.matt === 'rho' && v.k.modell) { v.k.L = +arg('L'); v.s = summera(S, r => domRAK(r, v.k)); v.k.hand = true; }
  /* --M 0.05 --modMarg 0.06: trösklarna för "bär" satta för hand (kort UTANFÖR
     leken, bänken med lek-golden-utan: tvillingkort som Thriving Heath/Moor når
     rho 0,91–0,94 — inom de rätta kortens 0,94–0,97 — med 0,03–0,05 till nästa
     namn och modellens marginal 0,02–0,04). */
  /* --skala 0.85,1.18: bär bara när inpassningens skala säger att kortet fyller rutan (som ORB_SKALA/ORB_HEL). */
  for (const v of val) { if (arg('M')) v.k.M = +arg('M'); if (arg('T')) v.k.T = +arg('T'); if (arg('modMarg')) v.k.modMarg = +arg('modMarg'); if (arg('skala')) v.k.skala = String(arg('skala')).split(',').map(Number); if (arg('M') || arg('T') || arg('modMarg') || arg('skala')) { v.s = summera(S, r => domRAK(r, v.k)); v.k.hand = true; } }
  console.log('══ Trösklar valda på syntetiska (0 säkra fel, flest säkra rätt) ══');
  for (const v of val) console.log(`  ${v.k.matt.padEnd(6)} modell-säker ${v.k.modell ? 'ja ' : 'nej'}  T ≥ ${v.k.T}  M ≥ ${v.k.M}${v.k.L != null ? '  L ≥ ' + v.k.L : ''}  → säkra rätt ${v.s.sakraRatt}/${v.s.n}`);
  /* Också: den lägsta tröskeln som ger 0 fel på synt när modellen INTE får vara säker ensam, för jämförelse. */
  const regler = [['ORB (som i dag)', r => domORB(r)]];
  for (const v of val) regler.push([`RAK ${v.k.matt}${v.k.modell ? '' : ' utan modell-säker'} (T ${v.k.T}, M ${v.k.M}${v.k.modMarg ? ', marg ' + v.k.modMarg : ''})`, r => domRAK(r, v.k)]);
  const bastRho = val.find(v => v.k.matt === 'rho' && v.k.modell);
  if (bastRho) regler.push([`KOMBI rho → ORB när osäker`, r => domKOMBI(r, bastRho.k)]);

  const tabell = (namn, rader, medTyp) => {
    console.log(`\n══ ${namn} (${rader.length}) ══`);
    console.log('  ' + 'regel'.padEnd(46) + 'rätt'.padStart(8) + 'säkra rätt'.padStart(12) + 'säkra FEL'.padStart(11) + 'ORB behövdes'.padStart(14));
    for (const [n, dom] of regler) { const s = summera(rader, dom); console.log('  ' + n.padEnd(46) + `${s.ratt}/${s.n}`.padStart(8) + String(s.sakraRatt).padStart(12) + String(s.sakraFel).padStart(11) + (n.startsWith('KOMBI') ? String(s.orb).padStart(14) : '')); }
    if (arg('fel')) for (const [n, dom] of regler) for (const r of rader) { const d = dom(r); if (d.saker && !arRatt(r, r.gissning)) console.log(`     FEL ${n.slice(0, 28).padEnd(28)} ${r.fil.padEnd(30)} ${[...ratta(r)].join('|')} → ${r.gissning}  marg ${r.marginal}  rho ${JSON.stringify(Object.fromEntries(Object.entries(r.rak1).map(([k, v]) => [k, v.rho])))} orb ${JSON.stringify(r.orb.bast)}`); }
    if (medTyp) {
      console.log('\n  per störning: rätt | säkra rätt / säkra FEL — ORB · RAK rho · KOMBI');
      const rORB = perTyp(rader, regler[0][1]), rRAK = bastRho ? perTyp(rader, r => domRAK(r, bastRho.k)) : null, rK = bastRho ? perTyp(rader, r => domKOMBI(r, bastRho.k)) : null;
      rORB.forEach((o, i) => console.log('    ' + o.typ.padEnd(40) + `${o.ratt}/${o.n}`.padStart(8) + ` | ${o.sakraRatt}/${o.sakraFel}`.padEnd(10) + (rRAK ? `· ${rRAK[i].sakraRatt}/${rRAK[i].sakraFel}`.padEnd(10) : '') + (rK ? `· ${rK[i].sakraRatt}/${rK[i].sakraFel} (orb ${rK[i].orb})` : '')));
    }
    const ms = { embed: med(rader.map(r => r.msEmbed)), rak0: med(rader.map(r => r.msRak0)), rak1: med(rader.map(r => r.msRak1)), orb: med(rader.map(r => r.msOrb)), orbP90: p90(rader.map(r => r.msOrb)), rak1P90: p90(rader.map(r => r.msRak1)) };
    /* KOMBI:s tid per kort: uträtad alltid, ORB bara när den behövdes. */
    const tK = bastRho ? rader.map(r => r.msRak1 + (domKOMBI(r, bastRho.k).orb ? r.msOrb : 0)) : null;
    console.log(`  ms per kort (median): modellen ${ms.embed} · NCC ${ms.rak0} · NCC+ECC ${ms.rak1} (p90 ${ms.rak1P90}) · ORB ${ms.orb} (p90 ${ms.orbP90})${tK ? ` · KOMBI ${med(tK).toFixed(1)} (p90 ${p90(tK).toFixed(1)})` : ''}  → modell+ORB ${(ms.embed + ms.orb).toFixed(1)}, modell+uträtad ${(ms.embed + ms.rak1).toFixed(1)}${tK ? `, modell+KOMBI ${(ms.embed + med(tK)).toFixed(1)}` : ''}`);
  };
  tabell('Syntetiska (var 8:e)', S, true);
  if (riktiga) tabell('Riktiga golden-beskärningar', riktiga.rader, false);
  if (hog) tabell('Högbänken (högar, kort på kort, hand, ensamma)', hog.rader, true);
})();

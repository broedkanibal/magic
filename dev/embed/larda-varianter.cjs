'use strict';
/* MES-232: hur ska bildmodellen använda lärda referenser (K7/K8)?

   Läser råvektorerna som bank.html LARDA_DUMP() sparade
   (cache/resultat/larda-dump.json): lekens vektorer som modulen byggt dem,
   och för varje riktig golden-beskärning frågans vektor samt samma
   beskärning inbäddad som LÄRD referens (146×204 jpeg, rak och vänd — exakt
   Embed.laggTill). Här räknas sedan varje variant på samma tal, med samma
   delning som LARDA: referenserna ur fall 03–06 (kort för sig själva, högst
   4 per namn, 14 stycken), provet de 47 övriga — uppdelat på samma
   tillfälle (03–06) och andra tillfällen.

     node dev/embed/larda-varianter.cjs            tabellen per variant
     node dev/embed/larda-varianter.cjs --kort     dessutom varje beskärning som byter svar eller säkerhet

   Varianterna (V0 = utan lärda, V1 = dagens laggTill):
     V2  stöd bara: rangordningen utan lärda; en lärd referens får bara höja
         ETTANS poäng (och därmed marginalen), aldrig lyfta ett annat namn
     V3  egen medelvektor för kamerafoton: lärda referenser och frågan
         centreras med de lärdas egen medelvektor när de jämförs med varandra
     V3b kamerariktningen bort: riktningen (lärdas medel − lekens medel) dras
         ur alla vektorer (lek, lärda, fråga) före jämförelsen
     V4  högre tröskel när ettans bästa träff är en lärd referens
     V5  lärd räknas bara vid nära dubblett (rå cosinus över τ)
     V6  lärd poäng med avdrag δ
     D   rapportens del D-protokoll: lärda = ALLA beskärningar från ANDRA
         inspelningstillfällen, provet alla 61 (leave-one-occasion-out) */
const fs = require('fs');
const path = require('path');
const DIM = 512, TROSKEL = 0.11;
const dump = JSON.parse(fs.readFileSync(path.join(__dirname, 'cache', 'resultat', 'larda-dump.json'), 'utf8'));
const VISA_KORT = process.argv.includes('--kort');
const TILLFALLE = { '01': 'a', '02': 'a', '08': 'a', '03': 'b', '04': 'c', '05': 'd', '06': 'e', '07': 'f', '09': 'g', '10': 'g', '11': 'g', '12': 'h' };
const tillf = fil => TILLFALLE[fil.slice(0, 2)] || fil.slice(0, 2);

/* ── vektorräkning ── */
const norm = v => { let n = 0; for (let k = 0; k < DIM; k++) n += v[k] * v[k]; n = Math.sqrt(n) || 1; const u = new Float32Array(DIM); for (let k = 0; k < DIM; k++) u[k] = v[k] / n; return u; };
const sub = (a, b) => { const u = new Float32Array(DIM); for (let k = 0; k < DIM; k++) u[k] = a[k] - b[k]; return u; };
const dot = (a, b) => { let s = 0; for (let k = 0; k < DIM; k++) s += a[k] * b[k]; return s; };
const centrera = (v, m) => norm(sub(v, m));
const medelAv = vs => { const m = new Float32Array(DIM); for (const v of vs) for (let k = 0; k < DIM; k++) m[k] += v[k] / vs.length; return m; };
const utanRiktning = (v, c) => { const p = dot(v, c), u = new Float32Array(DIM); for (let k = 0; k < DIM; k++) u[k] = v[k] - p * c[k]; return u; };

/* Leken: ra → per referens (rå), som modulen håller dem. */
const lek = dump.lek, N = lek.names.length, medel = Float32Array.from(lek.medel);
const lekRa = []; for (let i = 0; i < N; i++) lekRa.push(Float32Array.from(lek.ra.slice(i * DIM, (i + 1) * DIM)));
const lekRef = lekRa.map((v, i) => ({ namn: lek.names[i], ra: v, vek: centrera(v, medel), lard: false }));
const kort = dump.kort.map(k => Object.assign({}, k, { q: Float32Array.from(k.q), l0: Float32Array.from(k.l0), l180: Float32Array.from(k.l180) }));

/* Rangordna som Embed.rangordna: poäng per NAMN = bästa referensen för namnet; refs bär redan färdiga (centrerade) vektorer i `vek`, frågan ges färdig. */
function rangordna(qc, refs) {
  const per = new Map();
  for (const r of refs) { const s = dot(qc, r.vek), f = per.get(r.namn); if (!f || s > f.poang) per.set(r.namn, { namn: r.namn, poang: s, lard: r.lard }); }
  return [...per.values()].sort((a, b) => b.poang - a.poang);
}
const domAv = (lista, troskel) => { const a = lista[0], b = lista[1]; const marginal = a.poang - (b ? b.poang : 0); return { namn: a.namn, marginal, saker: marginal > (troskel == null ? TROSKEL : troskel), lardEtta: !!a.lard, lista }; };

/* ── delningen som LARDA ── */
const perNamn = new Map(), larda = [];
for (const k of kort) { if (!/^0[3-6]-/.test(k.fil) || k.skymd || k.helbild || (perNamn.get(k.namn) || 0) >= 4) continue; perNamn.set(k.namn, (perNamn.get(k.namn) || 0) + 1); larda.push(k); }
const lardaFiler = new Set(larda.map(k => k.fil)), test = kort.filter(k => !lardaFiler.has(k.fil));
const lardaNamn = new Set(larda.map(k => k.namn));
const lardaRefsAv = (ks, m) => ks.flatMap(k => [{ namn: k.namn, ra: k.l0, vek: centrera(k.l0, m), lard: true, fil: k.fil }, { namn: k.namn, ra: k.l180, vek: centrera(k.l180, m), lard: true, fil: k.fil }]);

/* ── varianterna: var och en är en funktion (fråga, lärda) → dom ── */
function varianter(lardaKort) {
  const L = lardaRefsAv(lardaKort, medel);                     // lärda centrerade med LEKENS medel, som laggTill
  const medelKam = medelAv(lardaKort.flatMap(k => [k.l0, k.l180]));  // de lärdas egen medelvektor (finns i appen: alla lärda i leken)
  const Lkam = lardaRefsAv(lardaKort, medelKam);
  const riktning = norm(sub(medelKam, medel));
  const lekUtan = lekRef.map(r => ({ namn: r.namn, vek: norm(utanRiktning(sub(r.ra, medel), riktning)), lard: false }));
  const LUtan = L.map(r => ({ namn: r.namn, vek: norm(utanRiktning(sub(r.ra, medel), riktning)), lard: true }));
  const V = {};
  V['V0 utan lärda'] = k => domAv(rangordna(centrera(k.q, medel), lekRef));
  V['V1 med lärda (dagens laggTill)'] = k => domAv(rangordna(centrera(k.q, medel), lekRef.concat(L)));
  /* V2: ettan ur leken ensam; lärda får höja ETTANS poäng, inte lyfta en annan. */
  V['V2 stöd bara för ettan'] = k => {
    const qc = centrera(k.q, medel), lista = rangordna(qc, lekRef), a = lista[0], b = lista[1];
    let bast = a.poang; for (const r of L) if (r.namn === a.namn) bast = Math.max(bast, dot(qc, r.vek));
    const marginal = bast - (b ? b.poang : 0);
    return { namn: a.namn, marginal, saker: marginal > TROSKEL, lardEtta: bast > a.poang, lista };
  };
  /* V2c: som V2, men de lärda röstar också sinsemellan — stödet gäller bara när
     ettans egen lärda referens är den bästa av ALLA lärda (jämförda med
     varandra bär de samma kameraprägel, så den tar ut sig). Två vittnen som
     säger samma sak; ett lärt foto av kort B kan aldrig göra en osäker,
     felaktig etta A säker. V2d: samma, röstningen i kamerarummet (lärdas medel). */
  const stodMedRost = (k, lardaRefs, qFor) => {
    const qc = centrera(k.q, medel), lista = rangordna(qc, lekRef), a = lista[0], b = lista[1];
    const perLard = new Map(); for (const r of lardaRefs) { const s = dot(qFor(r), r.vek); if (!perLard.has(r.namn) || s > perLard.get(r.namn)) perLard.set(r.namn, s); }
    let bastLard = null; for (const [namn, s] of perLard) if (!bastLard || s > bastLard.s) bastLard = { namn, s };
    const stod = perLard.has(a.namn) && bastLard.namn === a.namn;
    let bast = a.poang; if (stod) for (const r of L) if (r.namn === a.namn) bast = Math.max(bast, dot(qc, r.vek));
    const marginal = bast - (b ? b.poang : 0);
    return { namn: a.namn, marginal, saker: marginal > TROSKEL, lardEtta: bast > a.poang, lista };
  };
  V['V2c stöd bara när de lärda själva har ettan'] = k => stodMedRost(k, L, () => centrera(k.q, medel));
  V['V2d som V2c, röstning i kamerarummet'] = k => stodMedRost(k, Lkam, () => centrera(k.q, medelKam));
  /* V2b: som V2, och ett annat namn får ta över när dess lärda referens är klart bäst (δ över lekens etta). */
  for (const d of [0.05, 0.10]) V[`V2b stöd + byte vid lärd ≥ etta + ${d.toFixed(2)}`] = k => {
    const qc = centrera(k.q, medel), lista = rangordna(qc, lekRef), a = lista[0];
    let byte = null; for (const r of L) { const s = dot(qc, r.vek); if (r.namn !== a.namn && s >= a.poang + d && (!byte || s > byte.poang)) byte = { namn: r.namn, poang: s }; }
    if (byte) { const b2 = lista.find(x => x.namn !== byte.namn); const marginal = byte.poang - (b2 ? b2.poang : 0); return { namn: byte.namn, marginal, saker: marginal > TROSKEL, lardEtta: true, lista }; }
    let bast = a.poang; for (const r of L) if (r.namn === a.namn) bast = Math.max(bast, dot(qc, r.vek));
    const b = lista[1], marginal = bast - (b ? b.poang : 0);
    return { namn: a.namn, marginal, saker: marginal > TROSKEL, lardEtta: bast > a.poang, lista };
  };
  /* V3: lärda jämförs i kamerarummet (de lärdas medel), leken som förut; bästa per namn över båda. */
  V['V3 egen medelvektor för lärda'] = k => domAv(rangordna(centrera(k.q, medel), lekRef).length ? (() => {
    const qc = centrera(k.q, medel), qk = centrera(k.q, medelKam), per = new Map();
    for (const r of lekRef) { const s = dot(qc, r.vek), f = per.get(r.namn); if (!f || s > f.poang) per.set(r.namn, { namn: r.namn, poang: s, lard: false }); }
    for (const r of Lkam) { const s = dot(qk, r.vek), f = per.get(r.namn); if (!f || s > f.poang) per.set(r.namn, { namn: r.namn, poang: s, lard: true }); }
    return [...per.values()].sort((a, b) => b.poang - a.poang);
  })() : []);
  /* V3b: kamerariktningen ur allt. */
  V['V3b kamerariktningen bort ur allt'] = k => domAv(rangordna(norm(utanRiktning(sub(k.q, medel), riktning)), lekUtan.concat(LUtan)));
  V['V3c kamerariktningen bort, utan lärda'] = k => domAv(rangordna(norm(utanRiktning(sub(k.q, medel), riktning)), lekUtan));
  /* V4: dagens blandning, men högre tröskel när ettans bästa träff är lärd. */
  for (const t of [0.15, 0.20, 0.25]) V[`V4 tröskel ${t.toFixed(2)} när ettan är lärd`] = k => { const d = domAv(rangordna(centrera(k.q, medel), lekRef.concat(L))); if (d.lardEtta) d.saker = d.marginal > t; return d; };
  /* V5: en lärd referens räknas bara som nära dubblett (rå cosinus över τ). */
  for (const tau of [0.85, 0.90, 0.93]) V[`V5 lärd bara vid rå cos > ${tau.toFixed(2)}`] = k => { const qc = centrera(k.q, medel), refs = lekRef.concat(L.filter(r => dot(k.q, r.ra) > tau)); return domAv(rangordna(qc, refs)); };
  /* V6: lärd poäng med avdrag. */
  for (const d of [0.03, 0.06, 0.10]) V[`V6 lärd poäng − ${d.toFixed(2)}`] = k => { const qc = centrera(k.q, medel), per = new Map(); for (const r of lekRef.concat(L)) { const s = dot(qc, r.vek) - (r.lard ? d : 0), f = per.get(r.namn); if (!f || s > f.poang) per.set(r.namn, { namn: r.namn, poang: s, lard: r.lard }); } return domAv([...per.values()].sort((a, b) => b.poang - a.poang)); };
  return V;
}

/* ── tabellen ── */
const sum = (ks, doms) => ({ n: ks.length, ratt: doms.filter(d => d.ratt).length, sakraRatt: doms.filter(d => d.ratt && d.saker).length, sakraFel: doms.filter(d => !d.ratt && d.saker).length });
const cell = s => `${String(s.ratt).padStart(2)} / ${String(s.sakraRatt).padStart(2)} / ${String(s.sakraFel).padStart(1)}`;
function tabell(rubrik, ks, V, delning) {
  console.log(`\n${rubrik}\n  ${'variant'.padEnd(44)} ${'alla (n ' + ks.length + ')'.padEnd(16)} ${delning.map(([namn, f]) => (namn + ' (n ' + ks.filter(f).length + ')').padEnd(22)).join('')}   rätt / säkra rätt / säkra FEL`);
  const ut = {};
  for (const [namn, f] of Object.entries(V)) {
    const doms = ks.map(k => { const d = f(k); d.ratt = d.namn === k.namn; d.fil = k.fil; d.facit = k.namn; return d; });
    ut[namn] = doms;
    console.log(`  ${namn.padEnd(44)} ${cell(sum(ks, doms)).padEnd(16)} ${delning.map(([, g]) => cell(sum(ks.filter(g), doms.filter((d, i) => g(ks[i])))).padEnd(22)).join('')}`);
  }
  return ut;
}
const sammaTillf = k => /^0[3-6]-/.test(k.fil), annatTillf = k => !sammaTillf(k);

console.log(`larda-dump: ${dump.backend}, ${dump.modell}, leken ${N} vektorer, ${kort.length} beskärningar; lärda ${larda.length} (${[...lardaNamn].length} namn), prov ${test.length}`);
/* Självkoll: V0 i Node ska ge exakt modulens svar i Chrome (dump.svar). */
{ const V0 = varianter(larda)['V0 utan lärda']; let olika = 0, dmax = 0; for (const k of kort) { const d = V0(k); if (d.namn !== k.svar.namn) olika++; dmax = Math.max(dmax, Math.abs(d.marginal - k.svar.marginal)); } console.log(`självkoll mot modulen: ${olika} andra namn, största marginalskillnad ${dmax.toFixed(4)}`); }

const V = varianter(larda);
const ut = tabell('LARDA-delningen: referenser ur 03–06 (kort för sig själva), provet de 47 övriga', test, V, [['samma tillfälle', sammaTillf], ['andra tillfällen', annatTillf]]);
/* Hypotesen: förlusten i V1 ligger hos frågor vars RÄTTA namn saknar lärd referens (en annan lärd stjäl dem). */
{ const har = k => lardaNamn.has(k.namn), saknar = k => !har(k); tabell('Samma delning, uppdelat på om facits namn HAR en lärd referens', test, { 'V0 utan lärda': V['V0 utan lärda'], 'V1 med lärda (dagens laggTill)': V['V1 med lärda (dagens laggTill)'] }, [['namnet har lärd', har], ['namnet saknar lärd', saknar]]); }

if (VISA_KORT) {
  console.log('\nBeskärningar där en variant skiljer sig från V0 (namn → namn, marginal → marginal):');
  const v0 = ut['V0 utan lärda'];
  for (const [namn, doms] of Object.entries(ut)) { if (namn.startsWith('V0')) continue; const rader = doms.map((d, i) => [d, v0[i]]).filter(([d, o]) => d.namn !== o.namn || d.saker !== o.saker).map(([d, o]) => `${d.fil} facit ${d.facit}: ${o.namn}${o.saker ? '*' : ''} ${o.marginal.toFixed(3)} → ${d.namn}${d.saker ? '*' : ''} ${d.marginal.toFixed(3)}${d.lardEtta ? ' (lärd etta)' : ''}`); if (rader.length) console.log(`  ${namn}:\n    ` + rader.join('\n    ')); }
}

/* Del D-protokollet: lärda = alla beskärningar från ANDRA tillfällen, provet alla 61. */
console.log('\nRapportens del D-protokoll (leave-one-occasion-out): varje fråga med lärda ur ALLA andra tillfällen');
{
  const namnV = Object.keys(V);
  const doms = {}; for (const n of namnV) doms[n] = [];
  for (const k of kort) { const Vk = varianter(kort.filter(x => tillf(x.fil) !== tillf(k.fil))); for (const n of namnV) { const d = Vk[n](k); d.ratt = d.namn === k.namn; doms[n].push(d); } }
  console.log(`  ${'variant'.padEnd(44)} ${'alla (n ' + kort.length + ')'.padEnd(16)} rätt / säkra rätt / säkra FEL`);
  for (const n of namnV) console.log(`  ${n.padEnd(44)} ${cell(sum(kort, doms[n]))}`);
  if (VISA_KORT) {
    console.log('\n  Del D: beskärningar där en variant skiljer sig från V0:');
    const v0 = doms['V0 utan lärda'];
    for (const n of namnV) { if (n.startsWith('V0')) continue; const rader = doms[n].map((d, i) => [d, v0[i], kort[i]]).filter(([d, o]) => d.namn !== o.namn || d.saker !== o.saker).map(([d, o, k]) => `${k.fil} facit ${k.namn}${k.skymd ? ' (skymd)' : ''}${k.helbild ? ' (helbild)' : ''}: ${o.namn}${o.saker ? '*' : ''} ${o.marginal.toFixed(3)} → ${d.namn}${d.saker ? '*' : ''} ${d.marginal.toFixed(3)}${d.lardEtta ? ' (lärd etta)' : ''}`); if (rader.length) console.log(`    ${n}:\n      ` + rader.join('\n      ')); }
  }
}

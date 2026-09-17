'use strict';
/* Del 1 steg 5 (MES-213): gör enkla medel den bästa kandidaten bättre?
   Mäter efter varje steg, på de riktiga beskärningarna och (där det går) på
   det syntetiska setet:

     A  bas: hela kortet, fyra vridningar av referensen, centrerat
     B  + flera referenser per kort (skanningen gjord lik ett foto: låg
          upplösning, oskärpa, varmt ljus) — kostar inget per fråga
     C  + test-time-augmentering (frågan bäddas in tre gånger, lite inzoomad)
     D  + lärda referenser (K7/K8): riktiga beskärningar av samma kort från
          ANDRA inspelningstillfällen läggs till som referenser
     E  + fusion med OCR-vittnet (namnläsarens svar ur golden-baslinjen)
     F  + deck-prior: kort som redan ligger säkert på bordet räknas bort

     node dev/embed/forbattra.cjs [--modell mobileclip-s0] [--synt-var 4] */
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');

const arg = (namn, forval) => { const i = process.argv.indexOf('--' + namn); return i < 0 ? forval : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const pct = (a, b) => b ? (100 * a / b).toFixed(1) + ' %' : '—';
const ROTAR = [0, 90, 180, 270];
const VARIANTER = [null, { lag: 110 }, { lag: 150, sudd: 1.5 }, { lag: 150, varm: 1 }];
const TTA = [null, { zoom: 1.1 }, { zoom: 1.22 }];
/* Inspelningstillfällen: lärda referenser får aldrig komma ur samma tillfälle som frågan. */
const TILLFALLE = { '01': 'a', '02': 'a', '08': 'a', '03': 'b', '04': 'c', '05': 'd', '06': 'e', '07': 'f', '09': 'g', '10': 'g', '11': 'g', '12': 'h' };

function lasSet(namn, varN) {
  const mapp = namn === 'riktiga' ? path.join(L.HAR, 'riktiga') : path.join(L.CACHE, namn);
  let m = JSON.parse(fs.readFileSync(path.join(mapp, 'manifest.json'), 'utf8'));
  if (varN) m = m.filter((_, i) => i % varN === 0);
  return m.map(p => Object.assign({}, p, { bild: path.join(mapp, p.fil), nyckel: namn + ':' + p.fil }));
}
function lekAntal() {
  const antal = new Map();
  for (const rad of fs.readFileSync(path.join(L.HAR, '..', 'golden', 'lek.txt'), 'utf8').split('\n')) {
    const r = rad.trim(); if (!r || r.startsWith('#')) continue; const m = r.match(/^(\d+)\s+(.*)$/);
    antal.set(m ? m[2] : r, m ? +m[1] : 1);
  }
  return antal;
}

async function fragor(modell, test, set, tta) {
  const ops = tta ? TTA : [null], delar = [];
  for (const op of ops) delar.push((await L.baddaIn(modell, test.map(t => ({ nyckel: t.nyckel + (op ? '#' + JSON.stringify(op) : ''), bild: t.bild, marginal: true, op })), 'hel', { cache: set, logg: true })).vek);
  return test.map((_, i) => { const D = delar[0][i].length, v = new Float32Array(D); for (const d of delar) for (let k = 0; k < D; k++) v[k] += d[i][k]; let n = 0; for (let k = 0; k < D; k++) n += v[k] * v[k]; n = Math.sqrt(n); for (let k = 0; k < D; k++) v[k] /= n; return v; });
}

function dom(q, refs, medel, o) {
  const lista = L.rangordna(L.centrera(q, medel), refs, o);
  return { gissning: lista[0].namn, poang: lista[0].poang, marginal: lista[0].poang - (lista[1] ? lista[1].poang : 0), lista };
}
function rad(etikett, rader, tr) {
  const n = rader.length, ratt = rader.filter(r => r.ratt).length, z = L.nollfelsTroskel(rader, r => r.marginal);
  let s = `  ${etikett.padEnd(44)} rätt ${String(ratt).padStart(4)}/${n} ${pct(ratt, n).padStart(7)}   0 säkra fel: ${String(z.sakra).padStart(4)} säkra ${pct(z.sakra, n).padStart(7)} (marg > ${z.troskel == null ? '—' : z.troskel.toFixed(3)})`;
  if (tr != null) { const v = L.vidTroskel(rader, r => r.marginal, tr); s += `   vid ${tr.toFixed(3)}: ${v.sakraRatt} säkra rätt, ${v.sakraFel} säkra FEL`; }
  console.log(s);
  return { etikett, n, ratt, nollfel: z };
}

(async () => {
  const modell = await L.laddaModell(arg('modell', 'mobileclip-s0'));
  const kort = L.lasLek('lek-golden');
  const refA = await L.byggReferenser(modell, kort, 'hel', { rotar: ROTAR, logg: true });
  const refB = await L.byggReferenser(modell, kort, 'hel', { rotar: ROTAR, varianter: VARIANTER, logg: true });
  const mA = L.medelAv(refA.vek), mB = L.medelAv(refB.vek);
  const cA = Object.assign({}, refA, { vek: refA.vek.map(v => L.centrera(v, mA)) }), cB = Object.assign({}, refB, { vek: refB.vek.map(v => L.centrera(v, mB)) });

  /* ── syntetiska: A, B, C ── */
  const varN = +arg('synt-var', 4);
  const synt = lasSet('synt', varN);
  const sQ = await fragor(modell, synt, 'synt', false), sQt = await fragor(modell, synt, 'synt', true);
  const mjuka = t => t.typ !== 'kombinerad-hard';
  const sRad = (Q, refs, medel) => synt.map((t, i) => { const d = dom(Q[i], refs, medel); return Object.assign(d, { ratt: d.gissning === t.namn, typ: t.typ, over: t.over, namn: t.namn, lista: undefined }); });
  console.log(`\n══ ${modell.namn} — syntetiska (var ${varN}:e, ${synt.length} bilder)`);
  const sA = sRad(sQ, cA, mA), sB = sRad(sQ, cB, mB), sC = sRad(sQt, cB, mB);
  rad('A bas', sA); rad('B + flera referenser', sB); rad('C + TTA ×3', sC);
  /* Tröskeln: inga säkra fel på det syntetiska (utan stresstestet; ett svar som
     namnger kortet som LIGGER ÖVER räknas inte som fel — det kortet finns där). */
  const forTroskel = r => r.filter((x, i) => mjuka(synt[i])).map(x => Object.assign({}, x, { ratt: x.ratt || x.gissning === x.over }));
  const trB = L.nollfelsTroskel(forTroskel(sB), r => r.marginal), trC = L.nollfelsTroskel(forTroskel(sC), r => r.marginal);
  console.log(`  tröskel ur syntetiska (utan stresstestet, övre kortet godtaget): B marg > ${trB.troskel.toFixed(3)} (${pct(trB.sakra, forTroskel(sB).length)} säkra), C marg > ${trC.troskel.toFixed(3)} (${pct(trC.sakra, forTroskel(sC).length)} säkra)`);
  console.log('  per typ (B):');
  for (const typ of [...new Set(synt.map(t => t.typ))]) { const a = sA.filter(r => r.typ === typ), b = sB.filter(r => r.typ === typ), c = sC.filter(r => r.typ === typ); console.log(`    ${typ.padEnd(18)} A ${pct(a.filter(r => r.ratt).length, a.length).padStart(7)}   B ${pct(b.filter(r => r.ratt).length, b.length).padStart(7)}   C ${pct(c.filter(r => r.ratt).length, c.length).padStart(7)}   (n ${a.length})`); }

  /* ── riktiga: A–F ── */
  const RSET = arg('rset', 'riktiga');               // --rset riktiga-forsamrad: samma beskärningar, försämrade (forsamra.cjs)
  const rikt = lasSet(RSET);
  const rQ = await fragor(modell, rikt, RSET, false), rQt = await fragor(modell, rikt, RSET, true);
  /* lärda referenser: varje riktig beskärning, rak och vänd */
  const lar = [];
  for (const rot of [0, 180]) { const v = (await L.baddaIn(modell, rikt.map(t => ({ nyckel: t.nyckel, bild: t.bild, marginal: true, rot })), 'hel', { cache: RSET, logg: true })).vek; rikt.forEach((t, i) => lar.push({ vek: v[i], namn: t.namn, tillf: TILLFALLE[t.fil.slice(0, 2)], fil: t.fil })); }
  const medLarda = (refs, medel, tillf) => { const mina = lar.filter(x => x.tillf !== tillf); return { vek: refs.vek.concat(mina.map(x => L.centrera(x.vek, medel))), namn: refs.namn.concat(mina.map(x => x.namn)), id: refs.id.concat(mina.map(x => 'lard:' + x.fil)), rot: refs.rot.concat(mina.map(() => 0)) }; };
  const rRad = (Q, refsAv, medel) => rikt.map((t, i) => { const d = dom(Q[i], refsAv(t), medel); return Object.assign(d, { ratt: d.gissning === t.namn, t }); });
  console.log(`\n══ ${modell.namn} — ${RSET} (${rikt.length})`);
  const tr = trC.troskel;
  const rA = rRad(rQ, () => cA, mA), rB = rRad(rQ, () => cB, mB), rC = rRad(rQt, () => cB, mB), rD = rRad(rQt, t => medLarda(cB, mB, TILLFALLE[t.fil.slice(0, 2)]), mB);
  rad('A bas', rA, trB.troskel); rad('B + flera referenser', rB, trB.troskel); rad('C + TTA ×3', rC, tr); rad('D + lärda referenser (andra tillfällen)', rD, tr);

  /* E: OCR-fusion — trösklarna är kamIdentifieras egna. */
  const fusion = (rader, trHog, trLag) => rader.map(r => {
    const o = r.t.ocr, lastNamn = o && o.namn, sakert = lastNamn && o.poang >= 0.6 && o.marginal >= 0.2, svagt = lastNamn && !sakert && o.poang >= 0.5 && o.marginal >= 0.15;
    let namn = r.gissning, saker = r.marginal > trHog, varfor = saker ? 'bild' : 'osäker';
    if (sakert && o.namn === r.gissning) { saker = true; varfor = 'bild+namn'; }
    else if (sakert && o.namn !== r.gissning) { if (saker) { saker = false; varfor = 'konflikt'; } else { namn = o.namn; saker = true; varfor = 'namn ensamt'; } }
    else if (svagt && o.namn === r.gissning && r.marginal > trLag) { saker = true; varfor = 'bild+svagt namn'; }
    return { namn, saker, varfor, ratt: namn === r.t.namn, t: r.t };
  });
  const visaF = (etikett, f) => { const n = f.length; console.log(`  ${etikett.padEnd(44)} säkra rätt ${f.filter(x => x.saker && x.ratt).length}/${n}, säkra FEL ${f.filter(x => x.saker && !x.ratt).length}, osäkra ${f.filter(x => !x.saker).length}   (${Object.entries(f.reduce((a, x) => (a[x.varfor] = (a[x.varfor] || 0) + 1, a), {})).map(([k, v]) => k + ' ' + v).join(', ')})`); };
  console.log(`  — säkra svar vid tröskeln ur det syntetiska (marg > ${tr.toFixed(3)}), lägre tröskel vid svagt namn ${(tr / 2).toFixed(3)}:`);
  visaF('C utan OCR', fusion(rC.map(r => Object.assign({}, r, { t: Object.assign({}, r.t, { ocr: null }) })), tr, tr / 2));
  visaF('E = C + OCR-vittnet', fusion(rC, tr, tr / 2));
  visaF('E = D + OCR-vittnet', fusion(rD, tr, tr / 2));
  visaF('bara OCR (dagens namnläsare ensam)', rC.map(r => { const o = r.t.ocr, s = !!(o && o.namn && o.poang >= 0.6 && o.marginal >= 0.2); return { namn: o && o.namn, saker: s, varfor: s ? 'namn' : 'osäker', ratt: !!o && o.namn === r.t.namn, t: r.t }; }));

  /* F: deck-prior per fall — säkraste först; ett namn vars exemplar tagit slut räknas bort. */
  const antal = lekAntal();
  const prior = (Q, refsAv, medel) => {
    const ut = [];
    for (const fall of [...new Set(rikt.map(t => t.fall))]) {
      const idx = rikt.map((t, i) => i).filter(i => rikt[i].fall === fall && rikt[i].kalla === 'ai'), kvar = new Map(antal), klara = new Set();
      while (klara.size < idx.length) {
        const utan = new Set([...kvar.entries()].filter(([, n]) => n <= 0).map(([k]) => k));
        let bast = null;
        for (const i of idx) { if (klara.has(i)) continue; const d = dom(Q[i], refsAv(rikt[i]), medel, { utan }); if (!bast || d.marginal > bast.d.marginal) bast = { i, d }; }
        klara.add(bast.i);
        /* bara ett SÄKERT svar tar ett exemplar ur leken */
        if (bast.d.marginal > tr) kvar.set(bast.d.gissning, (kvar.get(bast.d.gissning) || 0) - 1);
        ut.push(Object.assign(bast.d, { ratt: bast.d.gissning === rikt[bast.i].namn, t: rikt[bast.i] }));
      }
    }
    return ut;
  };
  const utanVar = rader => rader.filter(r => r.t.kalla === 'ai');
  rad('C (utan varianten, som jämförelse)', utanVar(rC), tr);
  rad('F = C + deck-prior', prior(rQt, () => cB, mB), tr);
  rad('F = D + deck-prior', prior(rQt, t => medLarda(cB, mB, TILLFALLE[t.fil.slice(0, 2)]), mB), tr);

  /* Uppdelat på källa (Jespers tillägg): Mesas kameravy mot kameraappen. */
  console.log('  — uppdelat på källa:');
  for (const [etikett, rader] of [['A bas', rA], ['C + flera ref + TTA', rC], ['D + lärda', rD]]) for (const k of ['kameravy', 'kameraapp']) rad(`${etikett} · ${k}`, rader.filter(r => r.t.kalla2 === k), tr);
  console.log('  — basland mot övriga (C):');
  const BAS = new Set(['Plains', 'Swamp']);
  rad('basland', rC.filter(r => BAS.has(r.t.namn)), tr); rad('övriga', rC.filter(r => !BAS.has(r.t.namn)), tr);
  console.log('  — fel som står kvar i C:');
  for (const r of rC.filter(r => !r.ratt)) console.log(`    ${r.t.fil.padEnd(16)} ${r.t.namn} → ${r.gissning} (marg ${r.marginal.toFixed(3)}; ${r.t.varfor}${r.t.skymd ? ', skymd' : ''}${r.t.helbild ? ', helbildslåda' : ''}; rätt på plats ${r.lista.findIndex(x => x.namn === r.t.namn) + 1})`);
  fs.mkdirSync(path.join(L.CACHE, 'resultat'), { recursive: true });
  fs.writeFileSync(path.join(L.CACHE, 'resultat', `forbattra-${modell.namn}${RSET === 'riktiga' ? '' : '-' + RSET}.json`), JSON.stringify({ troskel: tr, riktiga: { A: rA, B: rB, C: rC, D: rD }.valueOf ? Object.fromEntries(Object.entries({ A: rA, B: rB, C: rC, D: rD }).map(([k, v]) => [k, v.map(r => ({ fil: r.t.fil, namn: r.t.namn, gissning: r.gissning, marginal: r.marginal, poang: r.poang, ratt: r.ratt }))])) : null }));
})().catch(e => { console.error('FEL', e); process.exit(1); });

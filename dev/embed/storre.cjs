'use strict';
/* Del 1 steg 6 (MES-213): hur faller träffsäkerheten med antalet kandidater?

   - golden-leken (28 namn) mot en Commander-stor mängd (100 namn, de mest
     spelade Commander-korten enligt EDHREC) och mot båda samtidigt (126 namn
     — "motståndarens kort är också kandidater")
   - en kurva: golden-leken + K slumpade namn ur Commander-listan
   - "samma konst, annat tryck": frågan är en tryckning som inte är referens

     node dev/embed/storre.cjs [--modell mobileclip-s0]
   Referenserna bäddas in med fyra vridningar och två varianter (skanningen +
   en suddig lågupplöst) — hälften av golden-provets fyra, för att 908
   Commander-bilder ska hinna bäddas in (3,6 tusen × 4). */
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');

const arg = (namn, forval) => { const i = process.argv.indexOf('--' + namn); return i < 0 ? forval : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const pct = (a, b) => b ? (100 * a / b).toFixed(1) + ' %' : '—';
const ROTAR = [0, 90, 180, 270], VARIANTER = [null, { lag: 150, sudd: 1.5 }];

function lasSet(namn, filter) {
  const mapp = namn === 'riktiga' ? path.join(L.HAR, 'riktiga') : path.join(L.CACHE, namn);
  let m = JSON.parse(fs.readFileSync(path.join(mapp, 'manifest.json'), 'utf8'));
  if (filter) m = m.filter(filter);
  return m.map(p => Object.assign({}, p, { bild: path.join(mapp, p.fil), nyckel: namn + ':' + p.fil }));
}
const sla = (a, b) => ({ vek: a.vek.concat(b.vek), namn: a.namn.concat(b.namn), id: a.id.concat(b.id), rot: a.rot.concat(b.rot) });
const bara = (refs, namnSet) => { const i = refs.namn.map((n, k) => namnSet.has(n) ? k : -1).filter(k => k >= 0); return { vek: i.map(k => refs.vek[k]), namn: i.map(k => refs.namn[k]), id: i.map(k => refs.id[k]), rot: i.map(k => refs.rot[k]) }; };

function mat(etikett, Q, test, refs, tr) {
  const medel = L.medelAv(refs.vek), c = Object.assign({}, refs, { vek: refs.vek.map(v => L.centrera(v, medel)) });
  const rader = test.map((t, i) => { const l = L.rangordna(L.centrera(Q[i], medel), c); return { ratt: l[0].namn === t.namn, marginal: l[0].poang - l[1].poang, typ: t.typ, over: t.over, gissning: l[0].namn }; });
  const n = rader.length, ratt = rader.filter(r => r.ratt).length, z = L.nollfelsTroskel(rader, r => r.marginal), v = L.vidTroskel(rader, r => r.marginal, tr);
  console.log(`  ${etikett.padEnd(58)} ${String(new Set(refs.namn).size).padStart(4)} namn ${String(refs.vek.length).padStart(6)} vektorer   rätt ${String(ratt).padStart(4)}/${n} ${pct(ratt, n).padStart(7)}   vid marg > ${tr}: ${pct(v.sakraRatt, n).padStart(7)} säkra rätt, ${v.sakraFel} säkra fel   (0 fel vid > ${z.troskel == null ? '—' : z.troskel.toFixed(3)}: ${pct(z.sakra, n)})`);
  return rader;
}

(async () => {
  const modell = await L.laddaModell(arg('modell', 'mobileclip-s0'));
  const tr = +arg('troskel', 0.109);
  const gold = await L.byggReferenser(modell, L.lasLek('lek-golden'), 'hel', { rotar: ROTAR, varianter: VARIANTER, logg: true });
  const c100 = await L.byggReferenser(modell, L.lasLek('commander100').filter(c => !['Plains', 'Swamp'].includes(c.name)), 'hel', { rotar: ROTAR, varianter: VARIANTER, logg: true });
  const bada = sla(gold, c100);
  const q = async (set, test) => (await L.baddaIn(modell, test.map(t => ({ nyckel: t.nyckel, bild: t.bild, marginal: true })), 'hel', { cache: set, logg: true })).vek;

  const rikt = lasSet('riktiga'), rQ = await q('riktiga', rikt);
  const synt = lasSet('synt', (_, i) => i % 2 === 0).filter(t => t.typ !== 'kombinerad-hard'), sQ = await q('synt', synt);
  const sc = lasSet('synt-c100').filter(t => t.typ !== 'kombinerad-hard' && !['Plains', 'Swamp'].includes(t.namn)), cQ = await q('synt-c100', sc);

  console.log(`\n══ ${modell.namn}: fler kandidater (säkerhetströskel marg > ${tr})`);
  console.log(' riktiga beskärningar (golden-lekens kort):');
  mat('mot golden-leken', rQ, rikt, gold, tr);
  mat('mot golden-leken + Commander-100 (motståndarens kort med)', rQ, rikt, bada, tr);
  console.log(' syntetiska ur golden-leken (varannan, utan stresstestet):');
  mat('mot golden-leken', sQ, synt, gold, tr);
  const cNamn = [...new Set(c100.namn)], rnd = L.mulberry32(11);
  const blandade = cNamn.map(n => [rnd(), n]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  for (const k of [22, 47, 72]) mat(`mot golden-leken + ${k} Commander-namn`, sQ, synt, sla(gold, bara(c100, new Set(blandade.slice(0, k)))), tr);
  mat('mot golden-leken + Commander-100', sQ, synt, bada, tr);
  console.log(' syntetiska ur Commander-100:');
  const rc = mat('mot Commander-100', cQ, sc, c100, tr);
  mat('mot Commander-100 + golden-leken', cQ, sc, bada, tr);
  console.log('   per typ (mot Commander-100):');
  for (const typ of [...new Set(sc.map(t => t.typ))]) { const a = rc.filter(r => r.typ === typ); console.log(`     ${typ.padEnd(14)} ${pct(a.filter(r => r.ratt).length, a.length).padStart(7)}  (n ${a.length})`); }

  /* Samma konst, annat tryck. */
  if (fs.existsSync(path.join(L.CACHE, 'synt-tryck', 'manifest.json'))) {
    const tt = lasSet('synt-tryck'), tQ = await q('synt-tryck', tt), refRam = new Map(L.lasLek('lek-golden').map(c => [c.illustration, c.frame])), tryck = new Map(L.lasLek('lek-golden-tryck').map(c => [c.id, c]));
    console.log(' samma konst i ett ANNAT tryck än referensens (golden-lekens namn):');
    for (const typ of ['grund', 'kombinerad']) {
      const i = tt.map((t, k) => t.typ === typ ? k : -1).filter(k => k >= 0);
      const samma = i.filter(k => refRam.get(tryck.get(tt[k].id).illustration) === tt[k].ram), annan = i.filter(k => !samma.includes(k));
      mat(`${typ}: samma ramgeneration`, samma.map(k => tQ[k]), samma.map(k => tt[k]), gold, tr);
      mat(`${typ}: annan ramgeneration (t.ex. 2015 mot 2003)`, annan.map(k => tQ[k]), annan.map(k => tt[k]), gold, tr);
    }
  }
})().catch(e => { console.error('FEL', e); process.exit(1); });

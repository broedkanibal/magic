'use strict';
/* Vilket recept ska modulen ha? (MES-213) Varje referensvektor kostar en
   modellkörning när leken byggs (105 konstverk × 16 = 1 680 körningar ≈ 3 min
   på den här datorn), så frågan är vilka vridningar och varianter som
   faktiskt behövs. Allt räknas ur cachade vektorer — kör forbattra.cjs först.

     node dev/embed/recept.cjs [--modell mobileclip-s0]

   Skriver också kalibreringen marginal → andel rätt (till modulens "säkerhet"). */
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const arg = (namn, forval) => { const i = process.argv.indexOf('--' + namn); return i < 0 ? forval : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const pct = (a, b) => b ? (100 * a / b).toFixed(1) + ' %' : '—';
const V = { skarp: null, lag110: { lag: 110 }, sudd: { lag: 150, sudd: 1.5 }, varm: { lag: 150, varm: 1 } };

function lasSet(namn, filter) {
  const mapp = namn === 'riktiga' ? path.join(L.HAR, 'riktiga') : path.join(L.CACHE, namn);
  let m = JSON.parse(fs.readFileSync(path.join(mapp, 'manifest.json'), 'utf8')); if (filter) m = m.filter(filter);
  return m.map(p => Object.assign({}, p, { bild: path.join(mapp, p.fil), nyckel: namn + ':' + p.fil }));
}

(async () => {
  const modell = await L.laddaModell(arg('modell', 'mobileclip-s0'));
  const kort = L.lasLek('lek-golden');
  const q = async (set, test) => (await L.baddaIn(modell, test.map(t => ({ nyckel: t.nyckel, bild: t.bild, marginal: true })), 'hel', { cache: set })).vek;
  const rikt = lasSet('riktiga'), rQ = await q('riktiga', rikt);
  const synt = lasSet('synt', (_, i) => i % 4 === 0), sQ = await q('synt', synt);
  const recept = [
    ['4 vridningar × 4 varianter (bänkens B)', [0, 90, 180, 270], ['skarp', 'lag110', 'sudd', 'varm']],
    ['4 vridningar × 2 (skarp + suddig)', [0, 90, 180, 270], ['skarp', 'sudd']],
    ['2 vridningar × 4', [0, 180], ['skarp', 'lag110', 'sudd', 'varm']],
    ['2 vridningar × 2 (skarp + suddig)', [0, 180], ['skarp', 'sudd']],
    ['2 vridningar × 1 (bara skarp)', [0, 180], ['skarp']],
    ['4 vridningar × 1 (bänkens A)', [0, 90, 180, 270], ['skarp']],
  ];
  console.log(`\n══ ${modell.namn}: recept (vektorer per konstverk → träff). Syntetiska utan stresstestet; "utan rot90" = utan liggande-i-stående-låda.`);
  let kal = null;
  for (const [namn, rotar, varianter] of recept) {
    const refs = await L.byggReferenser(modell, kort, 'hel', { rotar, varianter: varianter.map(v => V[v]) });
    const medel = L.medelAv(refs.vek), c = Object.assign({}, refs, { vek: refs.vek.map(v => L.centrera(v, medel)) });
    const dom = (Q, test) => test.map((t, i) => { const l = L.rangordna(L.centrera(Q[i], medel), c); return { ratt: l[0].namn === t.namn, marginal: l[0].poang - l[1].poang, typ: t.typ, over: t.over, gissning: l[0].namn }; });
    const r = dom(rQ, rikt), s = dom(sQ, synt).filter(x => x.typ !== 'kombinerad-hard'), s2 = s.filter(x => x.typ !== 'rot90');
    const zr = L.nollfelsTroskel(r, x => x.marginal);
    console.log(`  ${namn.padEnd(40)} ${String(rotar.length * varianter.length).padStart(2)}/konstverk   riktiga ${r.filter(x => x.ratt).length}/${r.length} (0 fel: ${zr.sakra} säkra)   syntetiska ${pct(s.filter(x => x.ratt).length, s.length)}   utan rot90 ${pct(s2.filter(x => x.ratt).length, s2.length)}   rot90 ${pct(s.filter(x => x.typ === 'rot90' && x.ratt).length, s.filter(x => x.typ === 'rot90').length)}`);
    if (!kal) kal = s.concat(r);
  }
  /* Kalibrering: andel rätt per marginalintervall (receptet B; ett svar som namnger det övre kortet räknas som rätt). */
  console.log('\n  marginal → andel rätt (syntetiska utan stresstestet + riktiga):');
  const granser = [0, 0.02, 0.04, 0.06, 0.08, 0.11, 0.15, 0.2, 0.3, 1];
  for (let i = 0; i + 1 < granser.length; i++) { const g = kal.filter(x => x.marginal >= granser[i] && x.marginal < granser[i + 1]); console.log(`    ${granser[i].toFixed(2)}–${granser[i + 1].toFixed(2)}   ${pct(g.filter(x => x.ratt || x.gissning === x.over).length, g.length).padStart(7)}   (n ${g.length})`); }
})().catch(e => { console.error('FEL', e); process.exit(1); });

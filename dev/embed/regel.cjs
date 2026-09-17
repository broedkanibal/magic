'use strict';
/* Säkerhetsregeln (MES-213): räcker marginalen till nästa namn, eller behövs
   ett golv på själva poängen också? Provar ett rutnät av (marginal, poäng) på
   modulens recept (4 vridningar × skarp/suddig) — riktiga beskärningar och
   varannan syntetisk (utan stresstestet; det övre kortets namn godtas).

     node dev/embed/regel.cjs      (räknar ur cachade vektorer) */
const path = require('path'), fs = require('fs');
const L = require('./lib.cjs');
const V = [null, { lag: 150, sudd: 1.5 }];
function lasSet(namn, filter) { const mapp = namn === 'riktiga' ? path.join(L.HAR, 'riktiga') : path.join(L.CACHE, namn); let m = JSON.parse(fs.readFileSync(path.join(mapp, 'manifest.json'), 'utf8')); if (filter) m = m.filter(filter); return m.map(p => Object.assign({}, p, { bild: path.join(mapp, p.fil), nyckel: namn + ':' + p.fil })); }
(async () => {
  const modell = await L.laddaModell('mobileclip-s0');
  const refs = await L.byggReferenser(modell, L.lasLek('lek-golden'), 'hel', { rotar: [0, 90, 180, 270], varianter: V });
  const medel = L.medelAv(refs.vek), c = Object.assign({}, refs, { vek: refs.vek.map(v => L.centrera(v, medel)) });
  const q = async (set, test) => (await L.baddaIn(modell, test.map(t => ({ nyckel: t.nyckel, bild: t.bild, marginal: true })), 'hel', { cache: set })).vek;
  const dom = (Q, test) => test.map((t, i) => { const l = L.rangordna(L.centrera(Q[i], medel), c); return { fil: t.fil, skymd: !!t.skymd, helbild: !!t.helbild, ratt: l[0].namn === t.namn || l[0].namn === t.over, marginal: l[0].poang - l[1].poang, poang: l[0].poang, typ: t.typ }; });
  const rikt = lasSet('riktiga'), r = dom(await q('riktiga', rikt), rikt);
  const synt = lasSet('synt', (_, i) => i % 2 === 0), s = dom(await q('synt', synt), synt).filter(x => x.typ !== 'kombinerad-hard');
  console.log('riktiga fel:'); for (const x of r.filter(x => !x.ratt)) console.log('  ', x.fil, 'marg', x.marginal.toFixed(3), 'poäng', x.poang.toFixed(3));
  const rp = r.filter(x => x.ratt).map(x => x.poang).sort((a, b) => a - b);
  console.log('riktiga rätt, poäng vid 5/25/50 %:', [0.05, 0.25, 0.5].map(p => rp[Math.floor(p * rp.length)].toFixed(3)).join(' / '));
  console.log('marg  poäng | riktiga säkra rätt / FEL | syntetiska säkra rätt / FEL');
  for (const tm of [0.08, 0.11, 0.14]) for (const tp of [0, 0.3, 0.35, 0.4, 0.45, 0.5]) {
    const f = x => x.marginal > tm && x.poang > tp;
    console.log(`  ${tm.toFixed(2)}  ${tp.toFixed(2)}  |  ${r.filter(x => f(x) && x.ratt).length}/${r.length} / ${r.filter(x => f(x) && !x.ratt).length}   |  ${(100 * s.filter(x => f(x) && x.ratt).length / s.length).toFixed(1)} % / ${s.filter(x => f(x) && !x.ratt).length} (av ${s.length})`);
  }
  /* Spår som kedjan själv märkt som skymda (kort i klunga, delar ur Claudes svar) får inte bli säkra på modellen ensam. */
  console.log('regeln "skymda spår blir aldrig säkra på modellen ensam":');
  for (const tm of [0.06, 0.08, 0.11, 0.14]) { const f = x => x.marginal > tm && !x.skymd; console.log(`  marg > ${tm.toFixed(2)}, ej skymd  |  riktiga säkra rätt ${r.filter(x => f(x) && x.ratt).length}/${r.length}, FEL ${r.filter(x => f(x) && !x.ratt).length}   (skymda: ${r.filter(x => x.skymd).length}, varav rätt överst ${r.filter(x => x.skymd && x.ratt).length})`); }
})();

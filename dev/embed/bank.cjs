'use strict';
/* Offline-bänken (MES-213): sätter en bildmodell rätt namn på en beskärning?

     node dev/embed/bank.cjs --set riktiga --modell dinov2-small,mobileclip-s0,mobilenetv4-small
     node dev/embed/bank.cjs --set synt --modell dinov2-small --vy hel+konst --rotar 0,90,180,270

   --set      riktiga (dev/embed/riktiga) eller synt (dev/embed/cache/synt)
   --lek      referenserna, cache/<lek>.json (förval lek-golden)
   --vy       hel | konst | topp, flera med + (poängen läggs ihop)
   --rotar    vilka vridningar av referensen som bäddas in (förval 0,180)
   --hela     skär INTE bort beskärningens 8 % marginal på frågebilden
   --centrera dra bort referensernas medelvektor före jämförelsen
   --liten    referenser ur Scryfalls small (146×204) i stället för normal
   --ut       cls | cls+medel (bara DINOv2)
   --sida     inmatningens sida i px (DINOv2 tar vilken multipel av 14 som helst)
   --json     skriv raderna till cache/resultat/<namn>.json
   Slutet set: bara lekens namn är kandidater. */
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');

const arg = (namn, forval) => { const i = process.argv.indexOf('--' + namn); return i < 0 ? forval : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const pct = x => (100 * x).toFixed(1).padStart(5) + ' %';
const BASLAND = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);

function lasSet(namn) {
  const mapp = namn === 'riktiga' ? path.join(L.HAR, 'riktiga') : path.join(L.CACHE, namn);
  const m = JSON.parse(fs.readFileSync(path.join(mapp, 'manifest.json'), 'utf8'));
  return m.map(p => Object.assign({}, p, { bild: path.join(mapp, p.fil), nyckel: namn + ':' + p.fil }));
}

async function kor(modellNamn, o) {
  const modell = await L.laddaModell(modellNamn, { sida: o.sida });
  if (o.ut) modell.ut = o.ut;
  const kort = L.lasLek(o.lek);
  const test = o.test;
  const vyer = o.vy.split('+');
  const perVy = [];
  let ms = null;
  for (const vy of vyer) {
    const refs = await L.byggReferenser(modell, kort, vy, { rotar: o.rotar, liten: o.liten, logg: true });
    const q = await L.baddaIn(modell, test.map(t => ({ nyckel: t.nyckel, bild: t.bild, marginal: !o.hela })), vy, { cache: o.set, logg: true });
    if (q.msPerBild != null) ms = (ms || 0) + q.msPerBild;
    if (o.centrera) {
      /* Dra bort referensernas medelvektor: det alla Magic-kort har gemensamt
         (ram, textruta) försvinner, kvar blir det som skiljer korten åt. */
      const D = refs.vek[0].length, medel = new Float32Array(D);
      for (const v of refs.vek) for (let k = 0; k < D; k++) medel[k] += v[k] / refs.vek.length;
      const c = v => { const u = new Float32Array(D); let n = 0; for (let k = 0; k < D; k++) { u[k] = v[k] - medel[k]; n += u[k] * u[k]; } n = Math.sqrt(n) || 1; for (let k = 0; k < D; k++) u[k] /= n; return u; };
      refs.vek = refs.vek.map(c); q.vek = q.vek.map(c);
    }
    perVy.push({ refs, q: q.vek });
  }
  const rader = test.map((t, i) => {
    /* Flera vyer: poängen per namn läggs ihop (medel). */
    const sum = new Map();
    for (const v of perVy) for (const r of L.rangordna(v.q[i], v.refs)) sum.set(r.namn, (sum.get(r.namn) || 0) + r.poang / perVy.length);
    const lista = [...sum.entries()].map(([namn, poang]) => ({ namn, poang })).sort((a, b) => b.poang - a.poang);
    const rang = lista.findIndex(x => x.namn === t.namn);
    return { fil: t.fil, namn: t.namn, typ: t.typ || t.fall || '', gissning: lista[0].namn, poang: lista[0].poang, marginal: lista[0].poang - lista[1].poang,
             ratt: lista[0].namn === t.namn, rang, tvaa: lista[1].namn, topp5: lista.slice(0, 5).map(x => [x.namn, +x.poang.toFixed(3)]), meta: t };
  });
  return { modell, rader, ms };
}

function redovisa(namn, rader, o) {
  const n = rader.length, ratt = rader.filter(r => r.ratt).length;
  console.log(`\n══ ${namn} — ${o.set}, vy ${o.vy}, rotar ${o.rotar.join('/')}${o.liten ? ', små referenser' : ''}${o.hela ? ', med marginal' : ''}${o.centrera ? ', centrerat' : ''}`);
  console.log(`  rätt överst  ${ratt}/${n} (${pct(ratt / n).trim()})   bland tre: ${rader.filter(r => r.rang >= 0 && r.rang < 3).length}/${n}`);
  const m = L.nollfelsTroskel(rader, r => r.marginal), p = L.nollfelsTroskel(rader, r => r.poang);
  console.log(`  0 säkra fel  marginal > ${m.troskel == null ? '—' : m.troskel.toFixed(3)} → ${m.sakra}/${n} säkra (${pct(m.andel).trim()})   |   poäng > ${p.troskel == null ? '—' : p.troskel.toFixed(3)} → ${p.sakra}/${n} (${pct(p.andel).trim()})`);
  const grupper = new Map();
  for (const r of rader) { const g = grupper.get(r.typ) || []; g.push(r); grupper.set(r.typ, g); }
  if (grupper.size > 1) for (const [g, rs] of [...grupper.entries()].sort()) {
    const mm = L.nollfelsTroskel(rs, r => r.marginal);
    console.log(`    ${String(g).padEnd(44)} ${String(rs.filter(r => r.ratt).length).padStart(4)}/${String(rs.length).padEnd(4)} ${pct(rs.filter(r => r.ratt).length / rs.length)}   säkra vid 0 fel ${pct(mm.andel)}`);
  }
  const land = rader.filter(r => BASLAND.has(r.namn)), ovr = rader.filter(r => !BASLAND.has(r.namn));
  if (land.length) console.log(`    basland ${land.filter(r => r.ratt).length}/${land.length}   övriga ${ovr.filter(r => r.ratt).length}/${ovr.length}`);
  if (o.fel) for (const r of rader.filter(r => !r.ratt)) console.log(`    FEL ${r.fil.padEnd(22)} ${r.namn} → ${r.gissning} (${r.poang.toFixed(3)}, marg ${r.marginal.toFixed(3)}, rätt på plats ${r.rang + 1})`);
  return { n, ratt, nollfelMarginal: m, nollfelPoang: p };
}

(async () => {
  const o = {
    set: arg('set', 'riktiga'), lek: arg('lek', 'lek-golden'), vy: arg('vy', 'hel'), rotar: String(arg('rotar', '0,180')).split(',').map(Number),
    hela: !!arg('hela', false), liten: !!arg('liten', false), ut: arg('ut', null), sida: arg('sida', null) ? +arg('sida') : null, fel: !!arg('fel', false), centrera: !!arg('centrera', false),
  };
  o.test = lasSet(o.set);
  if (arg('kalla')) o.test = o.test.filter(t => t.kalla === arg('kalla'));
  if (arg('max')) o.test = o.test.slice(0, +arg('max'));
  for (const m of String(arg('modell', 'dinov2-small')).split(',')) {
    const t0 = Date.now();
    const r = await kor(m, o);
    const s = redovisa(`${m} (${r.modell.mb.toFixed(1)} MB, ${r.modell.sida} px)`, r.rader, o);
    console.log(`  tid ${((Date.now() - t0) / 1000).toFixed(0)} s${r.ms ? `, modellen ${r.ms.toFixed(1)} ms/bild i Node på den här datorn` : ''}`);
    if (arg('json')) {
      fs.mkdirSync(path.join(L.CACHE, 'resultat'), { recursive: true });
      const namn = arg('json') === true ? `${o.set}-${m}-${o.vy}-${o.rotar.join('_')}${o.liten ? '-liten' : ''}${o.hela ? '-hela' : ''}${o.centrera ? '-c' : ''}${o.sida ? '-' + o.sida : ''}${o.ut ? '-' + o.ut : ''}` : arg('json');
      fs.writeFileSync(path.join(L.CACHE, 'resultat', namn + '.json'), JSON.stringify({ o: Object.assign({}, o, { test: undefined }), modell: m, summa: s, rader: r.rader.map(x => Object.assign({}, x, { meta: undefined })) }));
    }
  }
})().catch(e => { console.error('FEL', e); process.exit(1); });

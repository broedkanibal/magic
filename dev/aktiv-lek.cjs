#!/usr/bin/env node
// G4 (MES-374): hur snabbt hittar "den aktiva leken" rätt lek?
//
// Simulerar en spelare vars minne är hennes lekar. Ett nytt parti drar säkra
// kort ur en lek (basland räknas inte, som i appen), ett i taget, och regeln
// väljer aktiv lek: start i senaste leken, byte via samförekomst.
//
//   node dev/aktiv-lek.cjs --data <mapp med decks.txt och boards.txt> [--prov 400] [--json ut.json]
//
// Datat hämtas ur Supabase (decks, boards; bara kortnamn, inga konton) av den
// som kör, och ligger utanför git (dev/material). Format:
//   decks.txt  : en rad per lek, "<spelare>|<lek>|Kort×antal|Kort×antal|..."
//   boards.txt : en rad per bords sista läge, "Kort|Kort|..." (namn, ingen spelare)
// Skriptet läser aldrig Supabase och ändrar ingenting i appen.
const fs = require('fs');
const path = require('path');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : process.argv[i + 1]; };
const DATA = arg('data', path.join(__dirname, 'material/arbete/2026-10-15-mes-374-g4'));
const PROV = +arg('prov', 400);
const JSON_UT = arg('json', null);

// ---------- data ----------
const BASLAND = new Set(['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes',
  'snow-covered plains', 'snow-covered island', 'snow-covered swamp', 'snow-covered mountain', 'snow-covered forest']);
const norm = (s) => s.trim().toLowerCase();
const kort = (s) => norm(s.replace(/×\d+$/, ''));

const decks = fs.readFileSync(path.join(DATA, 'decks.txt'), 'utf8').split('\n').filter(Boolean).map((l) => {
  const [user, id, ...c] = l.split('|');
  const namn = [...new Set(c.map(kort))].filter((n) => !BASLAND.has(n));
  return { user, id, namn };
});
const boards = fs.readFileSync(path.join(DATA, 'boards.txt'), 'utf8').split('\n').filter(Boolean)
  .map((l) => [...new Set(l.split('|').map(norm))].filter((n) => !BASLAND.has(n)))
  .filter((b) => b.length >= 1);

// ---------- slump ----------
let seed = 20261015;
const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const blanda = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- regeln ----------
// minne: [{id, set:Set}] (spelarens lekar, så som Mesa lärt dem)
// regel: { m: lägsta bevis för att byta, idf: väg kort efter hur få lekar de finns i,
//          dropN/dropThr: efter dropN kort med träffandel < dropThr → ingen aktiv lek }
function nyttParti(minne, regel, start) {
  const df = new Map();
  for (const d of minne) for (const n of d.set) df.set(n, (df.get(n) || 0) + 1);
  const s = { minne, regel, df, sedda: [], vikt: minne.map(() => 0), rakna: minne.map(() => 0), aktiv: start, senast: start };
  return s;
}
function nyttKort(s, namn) {
  if (s.sedda.includes(namn)) return s.aktiv;
  s.sedda.push(namn);
  const { minne, regel } = s;
  minne.forEach((d, i) => {
    if (d.set.has(namn)) { s.rakna[i]++; s.vikt[i] += regel.idf ? 1 / s.df.get(namn) : 1; }
  });
  let bast = -1;
  for (let i = 0; i < minne.length; i++) {
    if (bast < 0 || s.vikt[i] > s.vikt[bast] + 1e-9) bast = i;
    else if (Math.abs(s.vikt[i] - s.vikt[bast]) < 1e-9) {
      // lika: behåll den aktiva, annars den senast spelade
      const pref = (k) => (minne[k].id === s.aktiv ? 2 : minne[k].id === s.senast ? 1 : 0);
      if (pref(i) > pref(bast)) bast = i;
    }
  }
  const akt = minne.findIndex((d) => d.id === s.aktiv);
  if (s.vikt[bast] >= regel.m - 1e-9 && minne[bast].id !== s.aktiv && (akt < 0 || s.vikt[bast] > s.vikt[akt] + 1e-9)) {
    s.aktiv = minne[bast].id;
  }
  if (regel.dropN && s.aktiv) {
    const i = minne.findIndex((d) => d.id === s.aktiv);
    if (s.sedda.length >= regel.dropN && s.rakna[i] / s.sedda.length < regel.dropThr && !(s.vikt[bast] >= regel.m && minne[bast].id === s.aktiv)) s.aktiv = null;
  }
  return s.aktiv;
}

// ---------- scenarier ----------
const lekarAv = (u) => decks.filter((d) => d.user === u);
const inlarning = (d, f) => ({ id: d.id, set: new Set(f >= 1 ? d.namn : blanda(d.namn).slice(0, Math.max(1, Math.round(d.namn.length * f)))) });
const K = 12;

// Känd lek: rätt lek finns i minnet. start = 'ratt' | 'fel' | 'ingen'
function kand(regel, { f, start, pool }) {
  const rader = [];
  const spelare = pool ? [null] : [...new Set(decks.map((d) => d.user))];
  for (const u of spelare) {
    const lekar = pool ? decks : lekarAv(u);
    for (const sann of lekar) {
      if (start === 'fel' && lekar.length < 2) continue;
      for (let t = 0; t < PROV; t++) {
        const minne = lekar.map((d) => inlarning(d, f));
        const andra = lekar.filter((d) => d.id !== sann.id);
        const st = start === 'ratt' ? sann.id : start === 'fel' ? andra[Math.floor(rnd() * andra.length)].id : null;
        const s = nyttParti(minne, regel, st);
        const ord = blanda(sann.namn).slice(0, K);
        const akt = [st];
        for (const n of ord) akt.push(nyttKort(s, n));
        rader.push({ sann: sann.id, akt });
      }
    }
  }
  return sammanfatta(rader);
}
function sammanfatta(rader) {
  const n = rader.length;
  // k till stabilt rätt: första k så att aktiv == sann för alla k..K
  const ks = rader.map((r) => { let k = null; for (let i = r.akt.length - 1; i >= 0; i--) { if (r.akt[i] === r.sann) k = i; else break; } return k; });
  const klara = ks.filter((k) => k !== null).sort((a, b) => a - b);
  const q = (p) => (klara.length ? klara[Math.min(klara.length - 1, Math.floor(p * klara.length))] : null);
  const fel = (k) => rader.filter((r) => r.akt[Math.min(k, r.akt.length - 1)] !== r.sann).length / n;
  return { n, median: q(0.5), p90: q(0.9), aldrig: 1 - klara.length / n, fel0: fel(0), fel1: fel(1), fel2: fel(2), fel3: fel(3), fel5: fel(5) };
}

// Ny lek: den spelade leken finns inte i minnet. start = senaste (annan) lek.
function ny(regel, { f }) {
  const rader = [];
  for (const u of [...new Set(decks.map((d) => d.user))]) {
    const lekar = lekarAv(u);
    if (lekar.length < 2) continue;
    for (const sann of lekar) {
      const kvar = lekar.filter((d) => d.id !== sann.id);
      for (let t = 0; t < PROV; t++) {
        const minne = kvar.map((d) => inlarning(d, f));
        const s = nyttParti(minne, regel, kvar[Math.floor(rnd() * kvar.length)].id);
        const akt = [s.aktiv];
        for (const n of blanda(sann.namn).slice(0, K)) akt.push(nyttKort(s, n));
        akt.sann = sann.id;
        rader.push(akt);
      }
    }
  }
  const lasta = (k) => rader.filter((a) => a[Math.min(k, a.length - 1)] !== null).length / rader.length;
  const perLek = {};
  for (const a of rader) { const o = perLek[a.sann] = perLek[a.sann] || { n: 0, l3: 0, l12: 0 }; o.n++; if (a[3] !== null) o.l3++; if (a[a.length - 1] !== null) o.l12++; }
  return { perLek, n: rader.length, last0: lasta(0), last1: lasta(1), last2: lasta(2), last3: lasta(3), last5: lasta(5), last12: lasta(12) };
}

// Riktiga bord: alla sex lekar i minnet, start utan lek. Facit = den lek som har
// flest av bordets kort, om det är minst hälften av dem och ingen annan lek delar förstaplatsen.
function bord(regel) {
  const minne = decks.map((d) => ({ id: d.id, set: new Set(d.namn) }));
  let tot = 0, ny_ = 0, tvetydig = 0, med3 = 0, ratt3 = 0, fel3 = 0, ingen3 = 0, ratt = 0;
  for (const b of boards) {
    if (b.length < 2) continue;
    tot++;
    const traff = minne.map((d) => b.filter((n) => d.set.has(n)).length);
    const mx = Math.max(...traff);
    const topp = traff.filter((x) => x === mx).length;
    if (mx < b.length / 2) { ny_++; } else if (topp > 1) { tvetydig++; }
    const facit = mx >= b.length / 2 && topp === 1 ? minne[traff.indexOf(mx)].id : null;
    if (b.length < 3) continue;
    med3++;
    for (let t = 0; t < 40; t++) {
      const s = nyttParti(minne, regel, null);
      const ord = blanda(b);
      let akt = null;
      for (let i = 0; i < 3; i++) akt = nyttKort(s, ord[i]);
      if (akt === facit) ratt3++; else if (akt === null) ingen3++; else fel3++;
    }
  }
  const dr = med3 * 40;
  return { bord: tot, nyaLekar: ny_, tvetydiga: tvetydig, medTreKort: med3, rattEfter3: ratt3 / dr, felEfter3: fel3 / dr, ingenEfter3: ingen3 / dr };
}

// ---------- körning ----------
const pct = (x) => (x * 100).toFixed(0) + '%';
const REGLER = [];
for (const m of [1, 2, 3]) for (const idf of [false, true]) for (const [dropN, dropThr] of [[0, 0], [4, 0.2], [6, 0.2]]) REGLER.push({ m, idf, dropN, dropThr });
const namnPaRegel = (r) => `m=${r.m}${r.idf ? ' idf' : ''}${r.dropN ? ` släpp@${r.dropN}` : ''}`;
const ut = { lekar: decks.length, spelare: new Set(decks.map((d) => d.user)).size, bord: boards.length, rader: [] };

console.log(`G4 · ${decks.length} lekar (${ut.spelare} spelare), ${boards.length} bord, ${PROV} dragningar per lek och variant\n`);
console.log('| Regel | minne | start | kort till rätt (median / p90) | aldrig | fel@1 | fel@2 | fel@3 | fel@5 | ny lek: låst@3 / @5 / @12 |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const regel of REGLER) {
  for (const f of [1, 0.6]) {
    const nyr = ny(regel, { f });
    for (const start of ['ratt', 'fel', 'ingen']) {
      const r = kand(regel, { f, start, pool: false });
      ut.rader.push({ regel: namnPaRegel(regel), f, start, ...r, ny: nyr });
      console.log(`| ${namnPaRegel(regel)} | ${pct(f)} | ${start} | ${r.median} / ${r.p90} | ${pct(r.aldrig)} | ${pct(r.fel1)} | ${pct(r.fel2)} | ${pct(r.fel3)} | ${pct(r.fel5)} | ${pct(nyr.last3)} / ${pct(nyr.last5)} / ${pct(nyr.last12)} |`);
    }
  }
}
console.log('\nAlla sex lekar i samma minne (värsta fallet för staples):\n');
console.log('| Regel | minne | start | median / p90 | aldrig | fel@3 |');
console.log('|---|---|---|---|---|---|');
for (const regel of REGLER) for (const f of [1, 0.6]) for (const start of ['ratt', 'ingen']) {
  const r = kand(regel, { f, start, pool: true });
  console.log(`| ${namnPaRegel(regel)} | ${pct(f)} | ${start} | ${r.median} / ${r.p90} | ${pct(r.aldrig)} | ${pct(r.fel3)} |`);
}
console.log('\nRiktiga bord (alla sex lekar i minnet, start utan lek, 3 kort):\n');
console.log('| Regel | bord | nya lekar | tvetydiga | rätt@3 | fel@3 | ingen@3 |');
console.log('|---|---|---|---|---|---|---|');
for (const regel of REGLER) {
  const b = bord(regel);
  ut.rader.push({ regel: namnPaRegel(regel), bord: b });
  console.log(`| ${namnPaRegel(regel)} | ${b.bord} | ${b.nyaLekar} | ${b.tvetydiga} | ${pct(b.rattEfter3)} | ${pct(b.felEfter3)} | ${pct(b.ingenEfter3)} |`);
}
console.log('\nNy lek per lek som saknas i minnet (förslagsregeln m=2 släpp@4; låst = någon annan lek vald):\n');
console.log('| Saknad lek | minne | låst@3 | låst@12 |');
console.log('|---|---|---|---|');
for (const f of [1, 0.6]) {
  const r = ny({ m: 2, idf: false, dropN: 4, dropThr: 0.2 }, { f });
  for (const [id, o] of Object.entries(r.perLek)) console.log(`| ${id} | ${pct(f)} | ${pct(o.l3 / o.n)} | ${pct(o.l12 / o.n)} |`);
}
if (JSON_UT) fs.writeFileSync(JSON_UT, JSON.stringify(ut, null, 1));

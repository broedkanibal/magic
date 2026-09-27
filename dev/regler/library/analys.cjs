const { KAT, klassa } = require('./klassa.cjs');
const K = require('./korpus.json');
const P = {
  O1: 'Dra', O2: 'Topp-N privat', O3: 'Topp-N offentlig', O4: 'Flytta översta N direkt', O5: 'Sök i leken',
  O6: 'Blanda', O7: 'Lägg i leken på position', O8: 'Avslöja tills', O9: 'Exile med spelrätt',
  O10: 'Löpande toppläge', O11: 'Ansiktet nedåt från toppen', O12: 'Lekräknare/tom lek',
  O13: 'Annan spelares lek', O14: 'Understa kortet/slump',
};
const MAP = {
  scry: 'O2', surveil: 'O2', titta_n: 'O2', titta_1: 'O2', ordna: 'O2',
  avsloja_n: 'O3', avsloja_1: 'O3', explore: 'O3', clash: 'O3', topp_till_bf: 'O3',
  mill: 'O4', exil_topp: 'O4', dredge: 'O4', hela_leken: 'O4', mill_annan: 'O4', fran_lek: 'O4',
  sok: 'O5', sok_land: 'O5', blanda: 'O6',
  topp_fran_zon: 'O7', topp_fran_hand: 'O7', botten: 'O7', botten_slump: 'O7', nte: 'O7', blanda_in: 'O7', byt_hand_lek: 'O7',
  tills: 'O8', cascade: 'O8', discover: 'O8', ripple: 'O8',
  impuls: 'O9', exil_nedvand: 'O9', hideaway: 'O9',
  titta_alltid: 'O10', avslojt_topp: 'O10', spela_topp: 'O10',
  manifest: 'O11', nedvand_bf: 'O11', lekstorlek: 'O12', vinst_tom: 'O12',
  titta_annan: 'O13', sok_annan: 'O13', spela_annans: 'O13', fateseal: 'O13',
  botten_kort: 'O14', slump: 'O14', miracle: 'O1', dragna: 'O1', topp_till_hand: 'O1',
};
for (const k of KAT) if (!MAP[k.id]) throw new Error('saknar map ' + k.id);
function krav(ids) {
  const s = new Set(ids), R = new Set(['O1']);
  const has = (...a) => a.some(x => s.has(x));
  const dialog = has('scry', 'surveil', 'titta_n', 'titta_1', 'avsloja_n', 'avsloja_1', 'explore', 'clash', 'tills', 'cascade', 'discover', 'ripple', 'titta_annan', 'spela_annans', 'fateseal', 'sok', 'impuls', 'exil_nedvand');
  for (const id of ids) {
    let p = MAP[id];
    if ((id === 'botten' || id === 'botten_slump') && dialog) continue; // underst ingår i dialogen
    if (id === 'blanda' && has('sok', 'blanda_in', 'sok_annan')) continue; // blandningen ingår i sök / blanda-in
    if (id === 'exil_topp' && has('impuls', 'exil_nedvand', 'hideaway', 'tills', 'cascade', 'discover', 'spela_annans')) continue;
    if (id === 'byt_hand_lek' && has('blanda_in', 'nte', 'topp_fran_zon')) continue;
    R.add(p);
  }
  return R;
}
for (const c of K) { c.ids = klassa(c); c.krav = krav(c.ids); }
const pop = {
  alla: K.filter(c => c.ids.length),
  cmd5000: K.filter(c => c.ids.length && c.edh && c.edh <= 5000),
  cmd1000: K.filter(c => c.ids.length && c.edh && c.edh <= 1000),
};
const tackt = (L, S) => L.filter(c => [...c.krav].every(p => S.has(p))).length;
// Greedy per population
const out = { antal: Object.fromEntries(Object.entries(pop).map(([k, v]) => [k, v.length])), okl: K.filter(c => !c.ids.length).length, greedy: {}, fast: {} };
for (const [namn, L] of Object.entries(pop)) {
  const S = new Set(['O1']); const steg = [];
  steg.push({ p: 'O1', n: tackt(L, S) });
  while (S.size < Object.keys(P).length) {
    let best = null, bn = -1;
    for (const p of Object.keys(P)) if (!S.has(p)) { S.add(p); const n = tackt(L, S); S.delete(p); if (n > bn) { bn = n; best = p; } }
    S.add(best); steg.push({ p: best, n: bn });
  }
  out.greedy[namn] = steg.map(x => `${x.p} ${(100 * x.n / L.length).toFixed(1)}%`);
}
// Fast föreslagen ordning
const ORD = ['O1', 'O2', 'O5', 'O6', 'O4', 'O7', 'O3', 'O9', 'O8', 'O12', 'O10', 'O11', 'O13', 'O14'];
for (const [namn, L] of Object.entries(pop)) {
  const S = new Set(); out.fast[namn] = ORD.map(p => { S.add(p); const n = tackt(L, S); return `${p} ${n} (${(100 * n / L.length).toFixed(1)}%)`; });
}
// Per primitiv: antal kort som kräver den (alla / cmd5000 / cmd1000), topp-exempel
out.perPrim = Object.fromEntries(Object.keys(P).map(p => {
  const L = pop.alla.filter(c => c.krav.has(p)).sort((a, b) => (a.edh ?? 1e9) - (b.edh ?? 1e9));
  return [p, { namn: P[p], alla: L.length, cmd5000: L.filter(c => c.edh && c.edh <= 5000).length, cmd1000: L.filter(c => c.edh && c.edh <= 1000).length, ex: L.slice(0, 8).map(c => c.name) }];
}));
// "enda saknade" : kort som bara saknar p givet alla andra
out.perKat = Object.fromEntries(KAT.map(k => {
  const L = pop.alla.filter(c => c.ids.includes(k.id)).sort((a, b) => (a.edh ?? 1e9) - (b.edh ?? 1e9));
  return [k.id, { namn: k.namn, prim: MAP[k.id], alla: L.length, cmd5000: L.filter(c => c.edh && c.edh <= 5000).length, cmd1000: L.filter(c => c.edh && c.edh <= 1000).length, ex: L.slice(0, 6).map(c => c.name) }];
}));
// Kombinationer: vanligaste kravmängder
const komb = {};
for (const c of pop.alla) { const k = [...c.krav].filter(p => p !== 'O1').sort().join('+') || '(bara O1)'; komb[k] = (komb[k] || 0) + 1; }
out.komb = Object.entries(komb).sort((a, b) => b[1] - a[1]).slice(0, 25);
require('fs').writeFileSync('analys.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify({ antal: out.antal, okl: out.okl, greedy: out.greedy, fast: out.fast }, null, 1));
for (const [p, v] of Object.entries(out.perPrim)) console.log(p.padEnd(4), v.namn.padEnd(28), String(v.alla).padStart(5), String(v.cmd5000).padStart(5), String(v.cmd1000).padStart(5), v.ex.slice(0, 5).join(' | '));
console.log(out.komb.map(x => x[1] + ' ' + x[0]).join('\n'));

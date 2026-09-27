// Återanvänder analys.cjs logik: kräver att analys.cjs exporterar; enklast att köra om den inline.
const { klassa } = require('./klassa.cjs');
const K = require('./korpus.json');
const src = require('fs').readFileSync('./analys.cjs', 'utf8');
const MAP = eval('(' + src.match(/const MAP = (\{[\s\S]*?\n\});/)[1] + ')');
const krav = eval('(' + src.match(/function krav\(ids\) (\{[\s\S]*?\n\})/)[0].replace(/^function krav\(ids\) /, '(ids) => ') + ')');
for (const c of K) { c.ids = klassa(c); c.krav = krav(c.ids); }
const pop = { alla: K.filter(c => c.ids.length), t5000: K.filter(c => c.ids.length && c.edh && c.edh <= 5000), t1000: K.filter(c => c.ids.length && c.edh && c.edh <= 1000) };
const sets = {
  'G1–G6 (O1,O2,O3,O4,O5,O6,O7)': ['O1','O2','O3','O4','O5','O6','O7'],
  'Måste: G1–G6 + G9': ['O1','O2','O3','O4','O5','O6','O7','O12'],
  '+ G7 impuls': ['O1','O2','O3','O4','O5','O6','O7','O12','O9'],
  '+ G8 avslöja tills': ['O1','O2','O3','O4','O5','O6','O7','O12','O9','O8'],
  '+ G10 toppläge': ['O1','O2','O3','O4','O5','O6','O7','O12','O9','O8','O10'],
  '+ G11 manifest': ['O1','O2','O3','O4','O5','O6','O7','O12','O9','O8','O10','O11'],
  '+ G12 annan spelares lek': ['O1','O2','O3','O4','O5','O6','O7','O12','O9','O8','O10','O11','O13'],
  'bara G2 (topp-N privat) + G1': ['O1','O2'],
  'bara G4 (sök) + G1': ['O1','O5','O6'],
};
for (const [n, s] of Object.entries(sets)) {
  const S = new Set(s);
  const f = L => { const k = L.filter(c => [...c.krav].every(p => S.has(p))).length; return `${k}/${L.length} = ${(100 * k / L.length).toFixed(1)} %`; };
  console.log(n.padEnd(34), '|', f(pop.alla), '|', f(pop.t5000), '|', f(pop.t1000));
}
// Kort i topp-1000 som INTE täcks av Måste+G7+G8+G10
const S = new Set(['O1','O2','O3','O4','O5','O6','O7','O12','O9','O8','O10']);
console.log('\nTopp-5000 som saknas efter beta:', pop.t5000.filter(c => ![...c.krav].every(p => S.has(p))).sort((a,b)=>a.edh-b.edh).slice(0,25).map(c => `${c.name} [${[...c.krav].filter(p=>!S.has(p))}]`).join('; '));

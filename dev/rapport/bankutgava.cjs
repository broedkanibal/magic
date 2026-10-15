/* Bänkens utgåvor: rapportbänken (dev/material/rapportbank/) växer med varje
   granskning, så en siffra från förra månaden mäter en annan bänk än i dag.
   En utgåva fryser bänken som den är: v1, v2, … Varje utgåva innehåller den
   förras fall plus det som kommit in sedan dess, och dess fall skrivs aldrig
   över (till-fall.cjs vägrar --skriv-over på ett fall med utgava).

   Kör:  node dev/rapport/bankutgava.cjs            läget: utgåvorna, inkommande, bänken per sort mot målet
         node dev/rapport/bankutgava.cjs --klipp    frys allt inkommande som nästa utgåva
         node dev/rapport/bankutgava.cjs --klipp --torr   visa vad som skulle frysas

   Mät på en utgåva, med den gamla och den nya modellen i SAMMA körning —
   jämför aldrig mot en gammal siffra:
     ~/.mesa/detektor-venv/bin/python dev/remsa/helkort_jamfor.py --bank dev/material/rapportbank --utgava 2 \
         dev/embed/modeller/mobileclip-s0-mesa-v4.onnx dev/embed/modeller/mobileclip-s0-mesa-v5.onnx
   Historik-raden skriver utgåvan ("rapportbänken v2: 31/38 → 34/38").

   Varje fall har fältet utgava: null = inkommande (inte fryst än), N = kom
   in i utgåva N. Utgåva N = alla fall med utgava ≤ N. utgavor.json bredvid
   manifest.json listar varje utgåvas filer, så att en utgåva går att återskapa
   också när ett fall tagits bort för att spelaren raderat sin rapport — då
   mäter utgåvan ett fall mindre, och helkort_jamfor.py säger det. */
'use strict';
const fs = require('fs'), path = require('path');
const { MAL, TAK, SORTER, sortNamn } = require('./sorter.cjs');

const ROT = path.join(__dirname, '..', '..');
const UTROT = process.env.MESA_FALL_UT ? path.resolve(process.env.MESA_FALL_UT) : ROT;   // som i till-fall.cjs
const BANK = path.join(UTROT, 'dev', 'material', 'rapportbank');
const MAN = path.join(BANK, 'manifest.json'), UTG = path.join(BANK, 'utgavor.json');
const las = (f, tom) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return tom; } };

/* Bänken nu: fallen, utgåvorna och räkningen per sort (för granskningssidan också). */
function lage() {
  const fall = las(MAN, []), utgavor = las(UTG, []);
  const sorter = SORTER.map(s => ({ id: s.id, namn: s.namn, text: s.text, mal: MAL, antal: 0, fryst: 0 }));
  for (const p of fall) {
    let s = sorter.find(x => x.id === (p.sort || null));
    if (!s) { s = { id: p.sort || null, namn: sortNamn(p.sort), text: p.sort ? 'sorten finns inte längre i sorter.cjs' : 'bänkfall från före sorterna', mal: null, antal: 0, fryst: 0 }; sorter.push(s); }
    s.antal++; if (p.utgava != null) s.fryst++;
  }
  const inkommande = fall.filter(p => p.utgava == null).length;
  const senaste = utgavor.length ? utgavor[utgavor.length - 1].utgava : 0;
  /* Varje provs namn, sort och parti: sidan räknar taken mot dem. Partiets nyckel som parti() i granska.html. */
  const prov = fall.map(p => ({ namn: p.namn || null, gissning: p.gissning || null, sort: p.sort || null,
    parti: p.parti ? p.parti.game_id || (p.parti.spelkod ? 'kod:' + p.parti.spelkod : null) : null }));
  return { antal: fall.length, inkommande, senaste, utgavor, sorter, mal: MAL, tak: TAK, prov };
}

function klipp(torr) {
  const fall = las(MAN, []), utgavor = las(UTG, []);
  const nya = fall.filter(p => p.utgava == null);
  if (!nya.length) return { ok: false, text: 'inget inkommande — ingen ny utgåva' };
  const n = (utgavor.length ? utgavor[utgavor.length - 1].utgava : 0) + 1;
  for (const p of nya) p.utgava = n;
  const ingar = fall.filter(p => p.utgava != null && p.utgava <= n);
  const perSort = {};
  for (const p of ingar) perSort[p.sort || 'utan'] = (perSort[p.sort || 'utan'] || 0) + 1;
  const post = { utgava: n, datum: new Date().toISOString().slice(0, 10), antal: ingar.length, nya: nya.length, per_sort: perSort, filer: ingar.map(p => p.fil) };
  if (!torr) {
    fs.writeFileSync(MAN, JSON.stringify(fall, null, 1) + '\n');
    fs.writeFileSync(UTG, JSON.stringify(utgavor.concat([post]), null, 1) + '\n');
  }
  return { ok: true, post, text: `${torr ? '(torr) ' : ''}utgåva v${n}: ${ingar.length} fall, varav ${nya.length} nya${torr ? ' — inget skrivet' : ` — skrivet i ${path.relative(UTROT, UTG)} och manifest.json`}` };
}

function visa(L) {
  const rad = [];
  rad.push(`Rapportbänken: ${L.antal} fall — ${L.inkommande} inkommande (inte frysta)${L.senaste ? `, senaste utgåvan v${L.senaste}` : ', ingen utgåva än'}`);
  for (const u of L.utgavor) rad.push(`  v${u.utgava} ${u.datum}: ${u.antal} fall (${u.nya} nya)`);
  rad.push('', `Per sort (målet ${L.mal} fall per sort):`);
  for (const s of L.sorter) {
    const kvar = s.mal == null ? '' : s.antal >= s.mal ? 'full' : `${s.mal - s.antal} kvar till målet`;
    rad.push(`  ${String(s.antal).padStart(3)}${s.mal != null ? '/' + s.mal : '   '}  ${s.namn.padEnd(22)} ${kvar}`);
  }
  return rad.join('\n');
}

if (require.main === module) {
  const a = process.argv.slice(2);
  if (a.includes('--klipp')) {
    const r = klipp(a.includes('--torr'));
    console.log(r.text);
    if (!r.ok) process.exit(1);
  } else console.log(visa(lage()));
}
module.exports = { lage, klipp };

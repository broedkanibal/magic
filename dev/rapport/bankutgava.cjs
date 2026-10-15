/* Bänkens utgåvor: rapportbänken (dev/material/rapportbank/) växer med varje
   granskning, så en siffra från förra månaden mäter en annan bänk än i dag.
   En utgåva fryser bänken som den är: v1, v2, … Varje utgåva innehåller den
   förras fall plus det som kommit in sedan dess, och dess fall skrivs aldrig
   över (till-fall.cjs vägrar --skriv-over på ett fall med utgava).

   Kör:  node dev/rapport/bankutgava.cjs            läget: utgåvorna, inkommande, bänken per sort mot målet
         node dev/rapport/bankutgava.cjs --klipp    frys allt inkommande som nästa utgåva
         node dev/rapport/bankutgava.cjs --klipp --torr   visa vad som skulle frysas
         node dev/rapport/bankutgava.cjs --andra R-0008.jpg [--namn "Shock"] [--sort blank]
                                                    byt namn eller sort på ett inkommande fall
         node dev/rapport/bankutgava.cjs --ta-bort R-0008.jpg   ta bort ett inkommande fall ur bänken

   Ändra och ta bort (granskningssidan: klicka på en sort): bara inkommande fall
   — ett fall i en fryst utgåva rörs inte, annars mäter utgåvan något annat än
   när den frystes (radera.cjs tar ändå bort det när spelaren raderat sin
   rapport). Namnet prövas inte här: granska.cjs prövar det mot Scryfall först.
   Ett borttaget fall: bilden och raden i manifest.json och kopieindexet tas
   bort; rättelsen står kvar som test i tabellen, så tillfället förblir låst
   till prov (spärren byter aldrig test). Varje ändring skrivs i
   andringar.jsonl bredvid manifest.json: vad som var före och efter.

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
const { MAL, TAK, SORTER, SORT_ID, sortNamn } = require('./sorter.cjs');
const kopior = require('./kopior.cjs');

const ROT = path.join(__dirname, '..', '..');
const UTROT = process.env.MESA_FALL_UT ? path.resolve(process.env.MESA_FALL_UT) : ROT;   // som i till-fall.cjs
const BANK = path.join(UTROT, 'dev', 'material', 'rapportbank');
const MAN = path.join(BANK, 'manifest.json'), UTG = path.join(BANK, 'utgavor.json'), LOGG = path.join(BANK, 'andringar.jsonl');
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
  /* Varje provs kod, namn, sort och parti: sidan räknar taken per tillfälle (koden → radens tillfälle), annars per parti
     (nyckeln som parti() i granska.html). */
  const prov = fall.map(p => ({ kod: p.kod || null, namn: p.namn || null, gissning: p.gissning || null, sort: p.sort || null,
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

/* Fallen i bänken, med det sidan visar. sort: undefined = alla, null = fallen utan sort. */
function fallen(sort) {
  return las(MAN, []).filter(p => sort === undefined || (p.sort || null) === sort).map(p => ({
    fil: p.fil, kod: p.kod || null, namn: p.namn || null, gissning: p.gissning || null, sort: p.sort || null, utgava: p.utgava == null ? null : p.utgava,
    tillagd: p.tillagd || null, andrad: p.andrad || null, handelse: p.handelse || null, varfor: p.varfor || null, kalla: p.kalla || null,
    spelkod: p.parti && p.parti.spelkod || null, bredd: p.bredd || null, hojd: p.hojd || null }));
}
/* Bildens sökväg, bara för ett fall som står i manifest.json. */
function bildFor(fil) {
  const p = las(MAN, []).find(x => x.fil === fil);
  return p ? path.join(BANK, path.basename(p.fil)) : null;
}
const logga = rad => fs.appendFileSync(LOGG, JSON.stringify(Object.assign({ nar: new Date().toISOString() }, rad)) + '\n');
/* Ett inkommande fall som går att ändra, eller ett svar som säger varför inte. */
function inkommande(fall, fil) {
  const p = fall.find(x => x.fil === fil);
  if (!p) return { fel: `${fil} finns inte i bänken (${path.relative(UTROT, MAN)})` };
  if (p.utgava != null) return { fel: `${fil} ingår i den frysta utgåvan v${p.utgava} — rörs inte, annars mäter utgåvan något annat än när den frystes` };
  return { p };
}
function andra(fil, o) {
  const fall = las(MAN, []), { p, fel } = inkommande(fall, fil);
  if (fel) return { ok: false, text: fel };
  if (o.sort != null && !SORT_ID.has(o.sort)) return { ok: false, text: `sorten ${JSON.stringify(o.sort)} finns inte (sorter.cjs: ${[...SORT_ID].join(', ')})` };
  const namn = o.namn != null ? String(o.namn).trim() : p.namn, sort = o.sort != null ? o.sort : p.sort;
  if (!namn) return { ok: false, text: 'namnet är tomt' };
  if (namn === p.namn && sort === p.sort) return { ok: true, text: `${fil}: inget ändrat` };
  const fran = { namn: p.namn, sort: p.sort || null };
  p.namn = namn; p.sort = sort; p.andrad = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(MAN, JSON.stringify(fall, null, 1) + '\n');
  logga({ typ: 'andrad', fil, kod: p.kod || null, fran, till: { namn, sort } });
  const vad = [fran.namn !== namn ? `namn ${fran.namn} → ${namn}` : '', fran.sort !== sort ? `sort ${sortNamn(fran.sort)} → ${sortNamn(sort)}` : ''].filter(Boolean).join(', ');
  return { ok: true, text: `${fil}: ${vad}` };
}
function taBort(fil) {
  const fall = las(MAN, []), { p, fel } = inkommande(fall, fil);
  if (fel) return { ok: false, text: fel };
  const filer = [p.fil, p.kontext].filter(Boolean).map(f => path.join(BANK, path.basename(f)));
  fs.writeFileSync(MAN, JSON.stringify(fall.filter(x => x !== p), null, 1) + '\n');
  for (const f of filer) fs.rmSync(f, { force: true });
  kopior.strykKopia('bank', p.fil);
  logga({ typ: 'borttagen', fil, kod: p.kod || null, fran: { namn: p.namn, sort: p.sort || null } });
  return { ok: true, text: `${fil} borttaget ur bänken (${p.namn}, ${sortNamn(p.sort)})${p.kod ? ` — ${p.kod} står kvar som test i tabellen, så tillfället förblir låst till prov` : ''}` };
}
/* Fallen som tagits bort ur bänken (andringar.jsonl): kod → { fil, nar }. */
function borttagna() {
  let t; try { t = fs.readFileSync(LOGG, 'utf8'); } catch (e) { return new Map(); }
  const ut = new Map();
  for (const r of t.split('\n')) { let x; try { x = JSON.parse(r); } catch (e) { continue; } if (x && x.typ === 'borttagen' && x.kod) ut.set(x.kod, { fil: x.fil, nar: x.nar }); }
  return ut;
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
  const a = process.argv.slice(2), arg = n => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined; };
  if (a.includes('--andra') || a.includes('--ta-bort')) {
    const fil = arg(a.includes('--andra') ? '--andra' : '--ta-bort');
    if (!fil || fil.startsWith('--')) { console.error('ange fallets fil, som den står i manifest.json (R-0008.jpg)'); process.exit(2); }
    const r = a.includes('--andra') ? andra(fil, { namn: arg('--namn'), sort: arg('--sort') }) : taBort(fil);
    console.log(r.text);
    if (!r.ok) process.exit(1);
  } else if (a.includes('--klipp')) {
    const r = klipp(a.includes('--torr'));
    console.log(r.text);
    if (!r.ok) process.exit(1);
  } else console.log(visa(lage()));
}
module.exports = { lage, klipp, fallen, bildFor, andra, taBort, borttagna };

/* Kopieindexet (granskningen i skala, steg 5): var varje kopia av en rapport
   ligger, så att radera.cjs kan ta bort dem när spelaren raderat sin rapport.

   till-fall.cjs skriver en rad varje gång det gör en kopia:
     { kod, plats: 'mattest' | 'bank' | 'traning', id, filer: [...], parti, nar }
   filer är sökvägar relativt repots rot; en mapp slutar med '/'. En kopia
   som skrivs om (--skriv-over) ersätter sin rad (samma plats och id).

   VAR INDEXET LIGGER — där kopiorna ligger, ett index per sida:
     dev/rapport/kopior.jsonl            Mat test-fallen (i git). Indexet följer med samma
                                         commit som kopian: en gren som gör ett fall bär sin
                                         rad, och en worktree ser precis de kopior den har.
                                         merge=union (.gitattributes): två grenar som lägger
                                         till rader krockar inte.
     dev/material/rapportbank/kopior.jsonl
                                         bänken (utanför git sedan 2026-10-15: repot är publikt,
                                         och en spelares bild ska aldrig ligga i git-historiken).
     dev/material/arbete/markning/rapporter-traning-mesa/kopior.jsonl
                                         träningen (utanför git, bara på Jespers Mac). Ett
                                         index i git skulle peka på mappar som inte finns i en
                                         annan klon, och kopiorna utanför git försvinner inte med
                                         en git-gren — så indexet ligger bredvid dem.
   Indexet är ett snabbspår, inte det enda: radera.cjs letar också i platserna
   själva (sparr.cjs) och kör grep, så en kopia utan rad hittas ändå.

   Kör:  node dev/rapport/kopior.cjs            raderna, per kod
         node dev/rapport/kopior.cjs --fyll     fyll indexet bakåt ur det som redan finns
         node dev/rapport/kopior.cjs --fyll --torr   visa vad som skulle läggas till */
'use strict';
const fs = require('fs'), path = require('path');
const ROT = path.join(__dirname, '..', '..');
const UTROT = process.env.MESA_FALL_UT ? path.resolve(process.env.MESA_FALL_UT) : ROT;   // som i till-fall.cjs
const MATTEST = path.join(UTROT, 'dev', 'mattest', 'underlag', 'rapporter');
const BANK = path.join(UTROT, 'dev', 'material', 'rapportbank');
const TRAN = path.join(UTROT, 'dev', 'material', 'arbete', 'markning', 'rapporter-traning-mesa');
const INDEX = { git: path.join(UTROT, 'dev', 'rapport', 'kopior.jsonl'), bank: path.join(BANK, 'kopior.jsonl'), traning: path.join(TRAN, 'kopior.jsonl') };
const indexFor = plats => plats === 'traning' ? INDEX.traning : plats === 'bank' ? INDEX.bank : INDEX.git;
const rel = f => path.relative(UTROT, f).split(path.sep).join('/');

function lasIndex(fil) {
  let t; try { t = fs.readFileSync(fil, 'utf8'); } catch (e) { return []; }
  return t.split('\n').filter(r => r.trim()).map(r => { try { return JSON.parse(r); } catch (e) { return null; } }).filter(Boolean);
}
function skrivIndex(fil, rader) {
  if (!rader.length) { try { fs.unlinkSync(fil); } catch (e) {} return; }
  fs.mkdirSync(path.dirname(fil), { recursive: true });
  fs.writeFileSync(fil, rader.map(r => JSON.stringify(r)).join('\n') + '\n');
}
/* Alla rader, alla tre indexen. */
const alla = () => lasIndex(INDEX.git).concat(lasIndex(INDEX.bank), lasIndex(INDEX.traning));

/* En kopia till: ersätter raden med samma plats och id. */
function lagg(rad) {
  if (!rad.kod) return;
  const fil = indexFor(rad.plats);
  const r = Object.assign({ kod: rad.kod, plats: rad.plats, id: rad.id, filer: rad.filer, parti: rad.parti || null, nar: rad.nar || new Date().toISOString() });
  skrivIndex(fil, lasIndex(fil).filter(x => !(x.plats === r.plats && x.id === r.id)).concat([r]));
}
/* Ta bort kodens rader (radera.cjs). Svarar med antalet borttagna. */
function stryk(kod) {
  let n = 0;
  for (const fil of [INDEX.git, INDEX.bank, INDEX.traning]) {
    const r = lasIndex(fil), kvar = r.filter(x => x.kod !== kod);
    if (kvar.length !== r.length) { n += r.length - kvar.length; skrivIndex(fil, kvar); }
  }
  return n;
}

/* Raderna för en kopia, som till-fall.cjs skriver dem. */
const radMattest = (kod, mapp, parti) => ({ kod, plats: 'mattest', id: path.basename(mapp), filer: [rel(mapp) + '/'], parti });
const radBank = (kod, post) => ({ kod, plats: 'bank', id: post.fil, filer: [post.fil, post.kontext].filter(Boolean).map(f => rel(path.join(BANK, f))), parti: post.parti || null, manifest: rel(path.join(BANK, 'manifest.json')) });
const radTraning = (kod, mapp, parti) => ({ kod, plats: 'traning', id: path.basename(mapp), filer: [rel(mapp) + '/'], parti });

/* Kopiorna som finns på platserna, oavsett index: [{ kod, plats, id, filer, parti, nar }]. nar = filens ändringsdag
   (bakåtfyllning: när kopian gjordes är okänt, det är en övre gräns). */
function iPlatserna() {
  const ut = [], mtime = f => { try { return fs.statSync(f).mtime.toISOString(); } catch (e) { return null; } };
  const lasJ = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
  const mappar = d => { try { return fs.readdirSync(d, { withFileTypes: true }).filter(x => x.isDirectory()).map(x => path.join(d, x.name)); } catch (e) { return []; } };
  for (const m of mappar(MATTEST)) { const F = lasJ(path.join(m, 'fall.json')); if (F && F.rapport) ut.push(Object.assign(radMattest(F.rapport, m, F.parti), { nar: F.skapad || mtime(path.join(m, 'fall.json')) })); }
  for (const p of lasJ(path.join(BANK, 'manifest.json')) || []) if (p && p.kod) ut.push(Object.assign(radBank(p.kod, p), { nar: p.tillagd ? p.tillagd + 'T00:00:00.000Z' : mtime(path.join(BANK, p.fil)) }));
  for (const m of mappar(TRAN)) { const M = lasJ(path.join(m, 'markning.json')); if (M && M.rapport) ut.push(Object.assign(radTraning(M.rapport, m, M.parti), { nar: mtime(path.join(m, 'markning.json')) })); }
  return ut;
}
/* Bakåtfyllning: varje kopia i platserna som saknar en rad får en. */
function fyll(torr) {
  const har = new Set(alla().map(r => r.plats + '|' + r.id)), nya = iPlatserna().filter(r => !har.has(r.plats + '|' + r.id));
  if (!torr) for (const r of nya) lagg(r);
  return nya;
}

if (require.main === module) {
  const a = process.argv.slice(2);
  if (a.includes('--fyll')) {
    const n = fyll(a.includes('--torr'));
    console.log(n.length ? n.map(r => `${a.includes('--torr') ? 'skulle lägga till' : 'lagt till'} ${r.kod} ${r.plats} ${r.filer.join(' ')}`).join('\n') : 'Indexet har redan en rad för varje kopia.');
  } else {
    const r = alla();
    console.log(r.length ? r.map(x => `${x.kod.padEnd(8)} ${x.plats.padEnd(8)} ${x.nar.slice(0, 10)}  ${x.filer.join(' ')}`).join('\n') : 'Indexet är tomt.');
  }
}
module.exports = { INDEX, lasIndex, alla, lagg, stryk, radMattest, radBank, radTraning, iPlatserna, fyll, rel };

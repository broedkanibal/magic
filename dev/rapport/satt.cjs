/* Problemrapporten D (MES-368): sätt vad en rapport blev.

   Kör:  node dev/rapport/satt.cjs R-0412 fix        en fix (felet rättas; testfallet följer i samma commit)
         node dev/rapport/satt.cjs R-0412 test       ett regressionsprov (Mat test eller bänken)
         node dev/rapport/satt.cjs R-0412 traning    träningsdata
         node dev/rapport/satt.cjs R-0412 slangd     inget att göra (gallra.cjs tar den efter 90 dagar)
         … --torr                                   visa bara vad som skulle hända
         … --mapp <dir>                             den hämtade mappen (förval dev/diagnos/rapporter/<kod>)

   Fungerar lika för en tyst rättelse (kalla 'rattelse'): den har en egen kod.

   SPÄRREN (sparr.cjs): test och traning är aldrig samma rapport. När raden
   väl är test eller traning byts den aldrig — inte heller via fix eller
   slangd. satt.cjs vägrar också test när koden redan finns i
   träningsmaterialet, och traning när den finns i Mat test eller bänken —
   per parti: en annan rad med samma game_id på andra sidan, eller en kopia
   ur samma parti i repot, vägrar också. fix → traning vägras (en fix tar med
   sitt testfall och blir test).

   PARTIET läses ur den hämtade mappen dev/diagnos/rapporter/<kod>/ när den
   finns (eller --mapp <dir>): game_id och spelkod som till-fall.cjs läser dem
   (partiUrMapp). Repot prövas på det, och tabellen frågas på både radens och
   mappens game_id — så att en rad utan game_id (telefonens rapporter, ett
   raderat parti) eller en kopia som bara bär spelkoden ändå spärras per parti.
   Utan mapp och utan game_id i tabellen: per kod, med en VARNING.
   Slutkod 3 = spärren sa nej, 1 = fel, 0 = satt (eller redan så).

   test och traning sätts oftast av till-fall.cjs, som skriver fallet i
   samma svep; satt.cjs är för det som inte blir ett fall (fix, slangd) och
   för att reservera en rapport innan fallet skrivs. Service role ur .env.local. */
'use strict';
const fs = require('fs'), path = require('path');
const { supa, ROT } = require('./supa.cjs');
const { VARDEN, kravLokal, sattAnvandning, harParti, partiNycklar } = require('./sparr.cjs');

/* S: tabellens klient (provet prov-d.cjs skickar en attrapp); annars supa(). */
async function satt(a, S) {
  const kod = (a.find(x => /^R-\d{4,}$/i.test(x)) || '').toUpperCase();
  const varde = a.find(x => VARDEN.includes(x));
  if (!kod || !varde) throw Object.assign(new Error(`Kör: node dev/rapport/satt.cjs R-0412 ${VARDEN.join('|')} [--torr]`), { kod: 2 });
  const mi = a.indexOf('--mapp');
  if (mi >= 0 && !a[mi + 1]) throw Object.assign(new Error('--mapp <dir>'), { kod: 2 });
  const mapp = mi >= 0 ? path.resolve(a[mi + 1]) : path.join(ROT, 'dev', 'diagnos', 'rapporter', kod);
  let parti = null;
  if (fs.existsSync(mapp)) { const { partiUrMapp, lasRattelse } = require('./till-fall.cjs'); parti = partiUrMapp(mapp, lasRattelse(mapp)); }
  else if (mi >= 0) throw Object.assign(new Error(`${a[mi + 1]} finns inte`), { kod: 2 });
  if (varde === 'test' || varde === 'traning') kravLokal(kod, varde, parti);
  const r = await sattAnvandning(S || supa(), kod, varde, { torr: a.includes('--torr'), parti });
  const lagt = varde === 'test' || varde === 'traning';
  const p = Object.assign({}, parti || {}, r.game_id ? { game_id: r.game_id } : {});
  const varn = lagt && r.utanParti ? `\nVARNING: ${kod} har inget game_id i tabellen och ingen hämtad mapp med ett parti (${path.relative(ROT, mapp)}) — spärren gäller bara per kod, inte per parti` : '';
  const pr = lagt && harParti(p) ? `\npartiet: ${partiNycklar(p).join(', ')}${parti ? ' (mappen ' + path.relative(ROT, mapp) + (r.game_id ? ' + tabellen' : '') + ')' : ' (tabellen)'}` : '';
  return `${kod} (${r.kalla}): anvandning ${r.fore || 'null'} → ${r.efter}${r.redan ? ' (var redan så)' : ''}${r.torr ? ' (torr — inte satt)' : ''}${pr}${varn}`;
}

if (require.main === module) {
  satt(process.argv.slice(2)).then(t => console.log(t)).catch(e => { console.error('satt: ' + e.message); process.exit(e.sparr ? 3 : e.kod || 1); });
}
module.exports = { satt };

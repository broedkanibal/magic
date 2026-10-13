/* Problemrapporten D (MES-368): sätt vad en rapport blev.

   Kör:  node dev/rapport/satt.cjs R-0412 fix        en fix (felet rättas; testfallet följer i samma commit)
         node dev/rapport/satt.cjs R-0412 test       ett regressionsprov (Mat test eller bänken)
         node dev/rapport/satt.cjs R-0412 traning    träningsdata
         node dev/rapport/satt.cjs R-0412 slangd     inget att göra (gallra.cjs tar den efter 90 dagar)
         … --torr                                   visa bara vad som skulle hända

   Fungerar lika för en tyst rättelse (kalla 'rattelse'): den har en egen kod.

   SPÄRREN (sparr.cjs): test och traning är aldrig samma rapport. När raden
   väl är test eller traning byts den aldrig — inte heller via fix eller
   slangd. satt.cjs vägrar också test när koden redan finns i
   träningsmaterialet, och traning när den finns i Mat test eller bänken —
   per parti: en annan rad med samma game_id på andra sidan, eller en kopia
   ur samma parti i repot, vägrar också. fix → traning vägras (en fix tar med
   sitt testfall och blir test).
   Slutkod 3 = spärren sa nej, 1 = fel, 0 = satt (eller redan så).

   test och traning sätts oftast av till-fall.cjs, som skriver fallet i
   samma svep; satt.cjs är för det som inte blir ett fall (fix, slangd) och
   för att reservera en rapport innan fallet skrivs. Service role ur .env.local. */
'use strict';
const { supa } = require('./supa.cjs');
const { VARDEN, kravLokal, sattAnvandning } = require('./sparr.cjs');

async function satt(a) {
  const kod = (a.find(x => /^R-\d{4,}$/i.test(x)) || '').toUpperCase();
  const varde = a.find(x => VARDEN.includes(x));
  if (!kod || !varde) throw Object.assign(new Error(`Kör: node dev/rapport/satt.cjs R-0412 ${VARDEN.join('|')} [--torr]`), { kod: 2 });
  if (varde === 'test' || varde === 'traning') kravLokal(kod, varde);
  const r = await sattAnvandning(supa(), kod, varde, { torr: a.includes('--torr') });
  const varn = (varde === 'test' || varde === 'traning') && r.utanParti ? `\nVARNING: ${kod} har inget game_id i tabellen — spärren gäller bara per kod, inte per parti` : '';
  return `${kod} (${r.kalla}): anvandning ${r.fore || 'null'} → ${r.efter}${r.redan ? ' (var redan så)' : ''}${r.torr ? ' (torr — inte satt)' : ''}${varn}`;
}

if (require.main === module) {
  satt(process.argv.slice(2)).then(t => console.log(t)).catch(e => { console.error('satt: ' + e.message); process.exit(e.sparr ? 3 : e.kod || 1); });
}
module.exports = { satt };

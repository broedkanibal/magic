/* Problemrapporten (MES-365): gallringen (README §7).

   Kör:  node dev/rapport/gallra.cjs --torr   visar vad som skulle tas bort
         node dev/rapport/gallra.cjs          tar bort det

   Tar bort rader i rapporter som är äldre än 90 dagar och har anvandning
   null eller 'slangd', och deras filer i hinken (scans/<uid>/rapporter/<kod>/).
   En rapport som blivit fix, test eller traning ligger kvar: den är ett
   prov eller träningsdata (del D). Service role ur .env.local. */
'use strict';
const { supa } = require('./supa.cjs');

(async () => {
  const torr = process.argv.includes('--torr'), DAGAR = 90;
  const S = supa();
  const grans = new Date(Date.now() - DAGAR * 86400000).toISOString();
  const rader = await S.rest('GET', `rapporter?select=kod,sokvag,created_at,kalla,anvandning&created_at=lt.${grans}&or=(anvandning.is.null,anvandning.eq.slangd)&order=created_at.asc&limit=1000`);
  if (!rader.length) { console.log(`Inget att gallra (äldre än ${DAGAR} dagar, anvandning null eller slangd).`); return; }
  let filer = 0;
  for (const r of rader) {
    const f = r.sokvag ? await S.lista(r.sokvag) : [];
    filer += f.length;
    console.log(`${torr ? 'skulle ta bort' : 'tar bort'} ${r.kod} (${r.kalla}, ${r.created_at.slice(0, 10)}, ${r.anvandning || 'osorterad'}) och ${f.length} filer`);
    if (torr) continue;
    await S.radera(f.map(x => r.sokvag + '/' + x.namn));
    await S.rest('DELETE', `rapporter?kod=eq.${encodeURIComponent(r.kod)}`);
  }
  console.log(`${torr ? 'Torrkörning: ' : ''}${rader.length} rapporter, ${filer} filer${torr ? ' skulle tas bort' : ' borttagna'}.`);
})().catch(e => { console.error('gallra: ' + e.message); process.exit(1); });

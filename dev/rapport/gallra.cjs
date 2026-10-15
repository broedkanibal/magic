/* Problemrapporten (MES-365): gallringen (README §7), utökad i granskningen
   i skala, steg 5 (dev/plan/granskning-skala.md, avsnitt 8).

   Kör:  node dev/rapport/gallra.cjs --torr   visar allt som skulle tas bort
         node dev/rapport/gallra.cjs          tar bort det

   | Vad                                   | Tas bort                                                      |
   |---------------------------------------|---------------------------------------------------------------|
   | raden i rapporter + filerna i hinken  | 90 dagar efter rapporten, när anvandning är null eller slangd |
   | filerna i hinken, slängd              | 7 dagar efter rapporten (raden ligger kvar till 90 dagar)     |
   | filerna i hinken, exporterad          | 14 dagar efter att kopian finns i bänken eller träningen      |
   |                                       | (kopieindexet, kopior.cjs). Raden ligger kvar: spärren        |
   |                                       | mellan prov och träning behöver den                           |
   | den lokala kopian                     | dev/diagnos/rapporter/<kod>/ 30 dagar efter beslutet (kopians |
   |                                       | dag i indexet; för fix och slängd, som inte har en dag:       |
   |                                       | mappens senaste ändring), och när raden inte finns längre     |

   Ligger kvar: raden för fix, test och traning; hinkens filer för ett Mat
   test-fall och en fix (diagnosen till fixen); en osorterad rapports lokala
   kopia. Reserven över taken (planen, steg 6) finns inte än. En raderad
   rapport tas av radera.cjs, inte här. Service role ur .env.local. */
'use strict';
const fs = require('fs'), path = require('path');
const { supa, ROT } = require('./supa.cjs');
const kopior = require('./kopior.cjs');

const DAG = 86400000, RAD_DAGAR = 90, SLANGD_DAGAR = 7, EXPORT_DAGAR = 14, LOKAL_DAGAR = 30;
const UTROT = process.env.MESA_FALL_UT ? path.resolve(process.env.MESA_FALL_UT) : ROT;   // som i till-fall.cjs (provet: en tillfällig mapp)
const DIAGNOS = path.join(UTROT, 'dev', 'diagnos', 'rapporter');
const sedan = iso => (Date.now() - Date.parse(iso)) / DAG;
const dag = iso => String(iso).slice(0, 10);

(async () => {
  const torr = process.argv.includes('--torr');
  const S = supa(), gor = torr ? 'skulle ta bort' : 'tar bort';
  let rader = 0, filer = 0, mappar = 0;
  const filerFor = async r => r.sokvag ? await S.lista(r.sokvag) : [];
  const rensa = async (r, f) => { if (!torr && f.length) await S.radera(f.map(x => r.sokvag + '/' + x.namn)); filer += f.length; };

  /* 1. Rader (och filer) äldre än 90 dagar, osorterade eller slängda — som förut. */
  const grans = new Date(Date.now() - RAD_DAGAR * DAG).toISOString();
  const gamla = await S.rest('GET', `rapporter?select=kod,sokvag,created_at,kalla,anvandning&created_at=lt.${grans}&or=(anvandning.is.null,anvandning.eq.slangd)&order=created_at.asc&limit=1000`);
  console.log(`Rader äldre än ${RAD_DAGAR} dagar, osorterade eller slängda (raden och filerna):`);
  for (const r of gamla) {
    const f = await filerFor(r);
    console.log(`  ${gor} ${r.kod} (${r.kalla}, ${dag(r.created_at)}, ${r.anvandning || 'osorterad'}) och ${f.length} filer`);
    await rensa(r, f); rader++;
    if (!torr) await S.rest('DELETE', `rapporter?kod=eq.${encodeURIComponent(r.kod)}`);
  }
  if (!gamla.length) console.log('  —');

  /* 2. Slängda: filerna efter 7 dagar. */
  const g7 = new Date(Date.now() - SLANGD_DAGAR * DAG).toISOString();
  const slangda = (await S.rest('GET', `rapporter?select=kod,sokvag,created_at,kalla&anvandning=eq.slangd&created_at=lt.${g7}&created_at=gte.${grans}&order=created_at.asc&limit=1000`));
  console.log(`\nSlängda, äldre än ${SLANGD_DAGAR} dagar (filerna; raden ligger kvar till ${RAD_DAGAR} dagar):`);
  let n = 0;
  for (const r of slangda) {
    const f = await filerFor(r); if (!f.length) continue;
    console.log(`  ${gor} ${f.length} filer för ${r.kod} (${r.kalla}, ${dag(r.created_at)})`); await rensa(r, f); n++;
  }
  if (!n) console.log('  —');

  /* 3. Exporterade till bänken eller träningen: filerna 14 dagar efter kopian (kopians dag i indexet). */
  const exp = new Map();
  for (const k of kopior.alla()) if (k.plats === 'bank' || k.plats === 'traning') { const e = exp.get(k.kod); if (!e || k.nar < e.nar) exp.set(k.kod, k); }
  console.log(`\nExporterade till bänken eller träningen, kopian äldre än ${EXPORT_DAGAR} dagar (filerna; raden ligger kvar för spärren):`);
  n = 0;
  const klara = [...exp.values()].filter(k => sedan(k.nar) > EXPORT_DAGAR).map(k => k.kod);
  for (let i = 0; i < klara.length; i += 100) {
    const del = await S.rest('GET', `rapporter?select=kod,sokvag,kalla,anvandning&kod=in.(${klara.slice(i, i + 100).map(encodeURIComponent).join(',')})&anvandning=in.(test,traning)`);
    for (const r of del) {
      const f = await filerFor(r); if (!f.length) continue;
      const k = exp.get(r.kod);
      console.log(`  ${gor} ${f.length} filer för ${r.kod} (${k.plats === 'bank' ? 'bänken' : 'träningen'} sedan ${dag(k.nar)})`); await rensa(r, f); n++;
    }
  }
  if (!n) console.log('  —');

  /* 4. Den lokala kopian: 30 dagar efter beslutet, eller när raden inte finns längre. */
  console.log(`\nLokala kopior i ${path.relative(UTROT, DIAGNOS)}/, ${LOKAL_DAGAR} dagar efter beslutet:`);
  n = 0;
  const lokala = (() => { try { return fs.readdirSync(DIAGNOS).filter(d => /^R-\d{4,}$/.test(d) && fs.statSync(path.join(DIAGNOS, d)).isDirectory()); } catch (e) { return []; } })();
  const tab = new Map();
  for (let i = 0; i < lokala.length; i += 100)
    for (const r of await S.rest('GET', `rapporter?select=kod,anvandning&kod=in.(${lokala.slice(i, i + 100).join(',')})`)) tab.set(r.kod, r);
  const forsta = new Map();
  for (const k of kopior.alla()) if (!forsta.has(k.kod) || k.nar < forsta.get(k.kod)) forsta.set(k.kod, k.nar);
  for (const kod of lokala) {
    const mapp = path.join(DIAGNOS, kod), r = tab.get(kod);
    let skal = null;
    if (!r) skal = 'raden finns inte längre (gallrad eller raderad)';
    else if (r.anvandning) {
      const nar = forsta.get(kod) || fs.statSync(mapp).mtime.toISOString();
      if (sedan(nar) > LOKAL_DAGAR) skal = `${r.anvandning} sedan ${dag(nar)}${forsta.has(kod) ? '' : ' (mappens senaste ändring)'}`;
    }
    if (!skal) continue;
    console.log(`  ${gor} ${path.relative(UTROT, mapp)}/ — ${skal}`);
    if (!torr) fs.rmSync(mapp, { recursive: true, force: true });
    n++; mappar++;
  }
  if (!n) console.log('  —');

  console.log(`\n${torr ? 'Torrkörning: ' : ''}${rader} rader, ${filer} filer i hinken och ${mappar} lokala mappar${torr ? ' skulle tas bort' : ' borttagna'}.`);
})().catch(e => { console.error('gallra: ' + e.message); process.exit(1); });

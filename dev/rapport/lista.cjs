/* Problemrapporten (MES-365): rapporterna i tabellen rapporter.

   Kör:  node dev/rapport/lista.cjs               de senaste 50 rapporterna (kalla 'rapport')
         node dev/rapport/lista.cjs --nya         bara de som inte sorterats (anvandning null)
         node dev/rapport/lista.cjs --alla        också felrapporter och rättelser
         node dev/rapport/lista.cjs --rattelser   bara de tysta rättelserna (del B); går att kombinera med --nya
         node dev/rapport/lista.cjs --antal 200   fler rader
         node dev/rapport/lista.cjs --kontaktad R-0412   sätter kontaktad_at = nu (du har skrivit till spelaren)
         node dev/rapport/lista.cjs --raderade    koderna i raderingar (kopiorna tas bort med radera.cjs)

   Visar kod, när, vem (namn och e-post ur kontot), tagg, text, anvandning.
   Service role ur .env.local. */
'use strict';
const { supa } = require('./supa.cjs');

(async () => {
  const a = process.argv.slice(2), arg = n => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : null; };
  const S = supa();
  const kontaktad = arg('--kontaktad');
  if (kontaktad) {
    const r = await S.rest('PATCH', `rapporter?kod=eq.${encodeURIComponent(kontaktad.toUpperCase())}`, { kontaktad_at: new Date().toISOString() });
    if (!r || !r.length) { console.error(`${kontaktad} finns inte.`); process.exit(1); }
    console.log(`${r[0].kod}: kontaktad ${r[0].kontaktad_at.slice(0, 16).replace('T', ' ')}`);
    return;
  }
  if (a.includes('--raderade')) {
    const r = await S.rest('GET', 'raderingar?select=kod,raderad_at&order=raderad_at.desc&limit=500');
    if (!r.length) { console.log('Inga raderade rapporter med fall i repot.'); return; }
    console.log('Raderade av spelaren — ta bort kopiorna med node dev/rapport/radera.cjs --torr, sedan utan:');
    console.table(r.map(x => ({ kod: x.kod, raderad: x.raderad_at.slice(0, 16).replace('T', ' ') })));
    return;
  }
  const antal = +(arg('--antal') || 50);
  let q = `rapporter?select=kod,created_at,user_id,game_id,kalla,tagg,text,vy,anvandning,bilder,storlek,kontaktad_at&order=created_at.desc&limit=${antal}`;
  if (a.includes('--rattelser')) q += '&kalla=eq.rattelse';   // de tysta rättelserna (del B), en rad var
  else if (!a.includes('--alla')) q += '&kalla=eq.rapport';
  if (a.includes('--nya')) q += '&anvandning=is.null';
  const rader = await S.rest('GET', q);
  if (!rader.length) { console.log('Inga rapporter.'); return; }
  const ut = [];
  for (const r of rader) {
    const k = await S.konto(r.user_id);
    ut.push({ kod: r.kod, nar: r.created_at.slice(0, 16).replace('T', ' '), vem: k ? `${k.namn || '–'} <${k.epost || '–'}>` : r.user_id.slice(0, 8),
      kalla: r.kalla, tagg: r.tagg || '', text: (r.text || (r.vy && r.vy.handelse === 'handling' ? `handlingar: ${(r.vy.handlingar || []).map(h => h.typ).join(', ')}` : '')).replace(/\s+/g, ' ').slice(0, 60),   // MES-385 anvandning: r.anvandning || '',
      bilder: r.bilder || '', kb: r.storlek ? Math.round(r.storlek / 1024) : '', kontaktad: r.kontaktad_at ? r.kontaktad_at.slice(0, 10) : '' });
  }
  console.table(ut);
  console.log('Hämta en: node dev/rapport/hamta.cjs <kod>');
})().catch(e => { console.error('lista: ' + e.message); process.exit(1); });

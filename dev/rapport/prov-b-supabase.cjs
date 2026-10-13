/* Problemrapporten B (MES-366), DoD 2 mot riktiga Supabase: en tyst rättelse som rad + filer, hämtad
   med hamta.cjs, och sedan bortstädad.

   Kör:  node dev/rapport/prov-b.cjs --rattelse /tmp/r.json      (sidans rättelse: raden, rattelse.json, beskärningen)
         node dev/rapport/prov-b-supabase.cjs /tmp/r.json

   Service role ur .env.local. Lägger in EN rad (kalla 'rattelse') på kontot --konto <uid> (förval: det
   första kontot), laddar upp beskarning.jpg och rattelse.json under radens sokvag (servern sätter den),
   kör hamta.cjs på koden och kontrollerar mappen, och tar sedan bort filerna, raden och den lokala
   mappen. Löpnumret (sekvensen rapporter_nr) går inte att återställa härifrån: skriv ut koden så att
   den kan återställas med SQL om det behövs. */
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { supa, lasEnv, ROT } = require('./supa.cjs');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };

(async () => {
  const fil = process.argv.slice(2).find(x => !x.startsWith('--') && fs.existsSync(x));
  if (!fil) { console.error('Kör: node dev/rapport/prov-b-supabase.cjs <rättelse.json från prov-b.cjs --rattelse>'); process.exit(2); }
  const sid = JSON.parse(fs.readFileSync(fil, 'utf8'));
  const S = supa(), env = lasEnv(), url = env.SUPABASE_URL.replace(/\/$/, ''), h = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY };
  let uid = arg('--konto', '');
  if (!uid) { const r = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1`, { headers: h }); const j = await r.json(); uid = j.users && j.users[0] && j.users[0].id; }
  if (!uid) { console.error('inget konto att lägga provraden på'); process.exit(2); }
  const rader = [], ok = (n, v, d) => rader.push([n, !!v, d || '']);
  let rad = null, ut = null;
  try {
    [rad] = await S.rest('POST', 'rapporter', { user_id: uid, kalla: 'rattelse', game_id: null, text: null, tagg: null, vy: sid.rad.vy, bilder: null });
    ok('raden: kalla rattelse, kod och sokvag från servern, anvandning null', rad && /^R-\d{4,}$/.test(rad.kod) && rad.sokvag === `${uid}/rapporter/${rad.kod}` && rad.anvandning === null, rad && `${rad.kod} ${rad.sokvag.replace(uid, '<uid>')}`);
    const j = Object.assign({}, sid.rattelse);
    await S.laggUpp(rad.sokvag + '/beskarning.jpg', Buffer.from(sid.beskarning.split(',')[1], 'base64'), 'image/jpeg');
    await S.laggUpp(rad.sokvag + '/rattelse.json', Buffer.from(JSON.stringify(j)), 'application/json');
    await S.rest('PATCH', `rapporter?kod=eq.${rad.kod}`, { bilder: 'klar' });
    const ut0 = execFileSync(process.execPath, [path.join(__dirname, 'hamta.cjs'), rad.kod], { encoding: 'utf8', cwd: ROT });
    ut = path.join(ROT, 'dev', 'diagnos', 'rapporter', rad.kod);
    const jj = JSON.parse(fs.readFileSync(path.join(ut, 'rattelse.json'), 'utf8'));
    const bild = fs.readFileSync(path.join(ut, 'beskarning.jpg'));
    const las = fs.readFileSync(path.join(ut, 'LÄS-MIG.md'), 'utf8');
    ok('hamta.cjs hämtar raden och båda filerna', jj.gissning === j.gissning && jj.ratt === j.ratt && bild.length > 1000 && bild[0] === 0xff && bild[1] === 0xd8, ut0.trim());
    ok('LÄS-MIG.md säger gissning, rätt namn och domskäl', las.includes(j.gissning) && las.includes(j.ratt) && las.includes(j.varfor));
    const lista = execFileSync(process.execPath, [path.join(__dirname, 'lista.cjs'), '--alla'], { encoding: 'utf8', cwd: ROT });
    ok('lista.cjs --alla visar rättelsen', lista.includes(rad.kod));
  } catch (e) { ok('kördes utan fel', false, e.message); }
  finally {
    if (rad) {
      try { await S.radera([rad.sokvag + '/beskarning.jpg', rad.sokvag + '/rattelse.json']); } catch (e) { console.error('städningen (filer): ' + e.message); }
      try { await S.rest('DELETE', `rapporter?kod=eq.${rad.kod}`); } catch (e) { console.error('städningen (raden): ' + e.message); }
      const kvar = await S.rest('GET', `rapporter?kod=eq.${rad.kod}&select=kod`).catch(() => null);
      const filer = await S.lista(rad.sokvag).catch(() => null);
      ok('städat: raden och filerna borta', kvar && kvar.length === 0 && filer && filer.length === 0, `löpnumret ${rad.kod} är förbrukat`);
    }
    if (ut) fs.rmSync(ut, { recursive: true, force: true });
  }
  let fel = 0;
  for (const [n, v, d] of rader) { if (!v) fel++; console.log(`${v ? 'OK ' : 'FEL'}  ${n}${d ? '  (' + d + ')' : ''}`); }
  console.log(`\nprov-b-supabase: ${rader.length - fel} OK, ${fel} FEL`);
  process.exit(fel ? 1 : 0);
})();

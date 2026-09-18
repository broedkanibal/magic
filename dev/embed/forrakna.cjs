'use strict';
/* Förräknade bildvektorer (MES-230). Räknar Embed-modulens 8 vektorer per
   referensbild (4 vridningar × skarp/suddig, dev/embed/embed.js) en gång,
   på den här datorn, och laddar upp dem till Supabase-tabellen
   card_embeddings — nyckel: Scryfall-id + modell (Embed.MODELL). Appen
   hämtar dem i stället för att räkna själv: en Commander-lek (~900 bilder)
   är redo på sekunder i stället för en kvart.

     node dev/embed/forrakna.cjs --lekar                 alla lekar i databasen
     node dev/embed/forrakna.cjs --lek dev/golden/lek.txt  en lekfil (ett namn per rad)
     node dev/embed/forrakna.cjs --namn "Sol Ring" --namn "Arcane Signet"
     … --torr                bara räkna, ladda inte upp: skriver cache/forrakade/<ut>.json
     … --om                  räkna om och skriv över det som redan finns

   Nycklarna läses ur miljön eller ur .env.local i repots rot:
     SUPABASE_URL                 https://<projekt>.supabase.co (saknas den: produktionens /api/config)
     SUPABASE_SERVICE_ROLE_KEY    tjänstenyckeln (Project Settings → API Keys → secret / service_role)
   Tjänstenyckeln är den enda som får skriva i tabellen; den ska aldrig
   lämna den här datorn. Faller körningen (sharp har segfaultat i långa
   körningar här) — kör samma kommando igen: det som redan finns hoppas över.

   Modellen: dev/embed/modeller/mobileclip-s0-vision.onnx (se LÄS-MIG.md).
   Receptet: lib.cjs receptVektorer, med webbläsarens omskalning ('webb') —
   uppmätt mot huvudlös Chromes egna vektorer: cosinus median 0,9997, sämst
   0,9955 över golden-lekens 105 bilder (forrakna-prov.cjs). */
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const U = require('./urval.cjs');

const ROT = path.join(__dirname, '..', '..');
const REF = path.join(L.CACHE, 'ref');
const argv = process.argv.slice(2);
const arg = (namn, forval) => { const i = argv.indexOf('--' + namn); return i < 0 ? forval : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const alla = namn => argv.flatMap((a, i) => a === '--' + namn && argv[i + 1] ? [argv[i + 1]] : []);
const PER = L.RECEPT.rotar.length * L.RECEPT.varianter.length, DIM = 512, BYTES = PER * DIM * 2;

/* Nyckeln måste vara exakt modulens: läses ur embed.js, så att de två inte kan glida isär. */
function modellNyckel() {
  const js = fs.readFileSync(path.join(__dirname, 'embed.js'), 'utf8');
  const v = js.match(/const V = (\d+);/), m = js.match(/const MODELL = '([^']+)' \+ V;/);
  if (!v || !m) throw new Error('hittar inte V / MODELL i embed.js');
  return m[1] + v[1];
}

function lasEnv() {
  const env = Object.assign({}, process.env), fil = path.join(ROT, '.env.local');
  if (fs.existsSync(fil)) for (const rad of fs.readFileSync(fil, 'utf8').split('\n')) {
    const m = rad.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/); if (m && !env[m[1]]) env[m[1]] = m[2];
  }
  return env;
}

/* PostgREST med tjänstenyckeln. Nya nycklar (sb_secret_…) går bara i apikey;
   gamla (JWT) också som Bearer. */
function restKlient(url, nyckel) {
  return async (metod, vag, kropp, huvud) => {
    const h = Object.assign({ apikey: nyckel, 'Content-Type': 'application/json' }, huvud || {});
    if (!nyckel.startsWith('sb_')) h.Authorization = 'Bearer ' + nyckel;
    const r = await fetch(url.replace(/\/$/, '') + '/rest/v1/' + vag, { method: metod, headers: h, body: kropp === undefined ? undefined : JSON.stringify(kropp) });
    const text = await r.text();
    if (!r.ok) {
      const fel = new Error(`${metod} ${vag.split('?')[0]}: ${r.status} ${text.slice(0, 300)}`);
      fel.saknas = r.status === 404 || /PGRST205|42P01|does not exist|Could not find the table/.test(text);
      throw fel;
    }
    return text ? JSON.parse(text) : null;
  };
}

async function hamtaBild(url, fil) {
  if (fs.existsSync(fil) && fs.statSync(fil).size > 1000) return fil;
  const svar = await fetch(url, { headers: { 'User-Agent': 'MesaEmbed/0.2 (dev tools)' } });
  if (!svar.ok) throw new Error(`bild ${svar.status} ${url}`);
  fs.mkdirSync(path.dirname(fil), { recursive: true });
  fs.writeFileSync(fil, Buffer.from(await svar.arrayBuffer()));
  await U.vanta(60);
  return fil;
}

(async () => {
  const MODELL = modellNyckel(), torr = !!arg('torr'), om = !!arg('om');
  const env = lasEnv();
  let rest = null;
  if (!torr) {
    let url = env.SUPABASE_URL;
    if (!url) { try { url = (await (await fetch('https://magic-mauve-xi.vercel.app/api/config')).json()).supabaseUrl; } catch (e) {} }
    const nyckel = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !nyckel) { console.error('Saknar SUPABASE_URL och/eller SUPABASE_SERVICE_ROLE_KEY (miljön eller .env.local). --torr räknar utan att ladda upp.'); process.exit(2); }
    rest = restKlient(url, nyckel);
    console.log(`Supabase: ${new URL(url).host}, modell ${MODELL}`);
  }

  /* 1. Vilka bilder. */
  let namnen = [], egna = [];
  if (arg('lekar')) {
    if (!rest) { console.error('--lekar läser databasen och kräver nycklarna (inte --torr).'); process.exit(2); }
    const lekar = await rest('GET', 'decks?select=id,namn,kort');
    for (const d of lekar || []) for (const k of (d.kort || [])) {
      if (!k || !k.name) continue; namnen.push(k.name);
      if (k.sid) egna.push({ sid: k.sid, name: k.name, normal: typeof k.small === 'string' && k.small.includes('/small/') ? k.small.replace('/small/', '/normal/') : null });
    }
    console.log(`${(lekar || []).length} lekar i databasen`);
  }
  if (arg('lek')) namnen.push(...U.lasLekfil(path.resolve(arg('lek'))));
  namnen.push(...alla('namn'));
  namnen = [...new Set(namnen)];
  if (!namnen.length) { console.error('Ange --lekar, --lek <fil> eller --namn "<kort>".'); process.exit(2); }
  console.log(`${namnen.length} namn — frågar Scryfall efter konstverken (samma urval som appen)…`);
  const kort = await U.lekensBilder(namnen, { egna, logg: true });
  console.log(`${kort.length} bilder (med kortbaksidan)`);

  /* 2. Det som redan finns. */
  const finns = new Set();
  if (rest && !om) {
    for (let fran = 0; ; fran += 1000) {
      let rader;
      try { rader = await rest('GET', `card_embeddings?select=scryfall_id&modell=eq.${encodeURIComponent(MODELL)}&order=scryfall_id&limit=1000&offset=${fran}`); }
      catch (e) { if (e.saknas) { console.error('Tabellen card_embeddings finns inte än — kör migrationen först (dev/embed/INLARNING.md).'); process.exit(2); } throw e; }
      for (const r of rader) finns.add(r.scryfall_id);
      if (rader.length < 1000) break;
    }
  }
  const kvar = kort.filter(c => !finns.has(c.id));
  console.log(`${finns.size} finns redan för ${MODELL}; ${kvar.length} att räkna`);
  if (!kvar.length) return;

  /* 3. Räkna och ladda upp i omgångar om 25, så att en avbruten körning inte tappar något. */
  const modell = await L.laddaModell('mobileclip-s0', { tradar: 4 });
  const utfil = torr ? path.join(L.CACHE, 'forrakade', arg('ut', 'forrakade') + '.json') : null;
  const tidigare = utfil && fs.existsSync(utfil) ? JSON.parse(fs.readFileSync(utfil, 'utf8')) : null;
  const torrUt = { modell: MODELL, vek: (tidigare && tidigare.modell === MODELL && tidigare.vek) || {} };
  let rader = [], klara = 0, fel = 0; const t0 = Date.now();
  const skicka = async () => {
    if (!rader.length) return;
    if (rest) await rest('POST', 'card_embeddings?on_conflict=modell,scryfall_id', rader, { Prefer: 'resolution=merge-duplicates,return=minimal' });
    rader = [];
  };
  for (const c of kvar) {
    try {
      let url = c.normal;
      if (!url) url = await U.normalFor(c.id);
      if (!url) throw new Error('ingen bild');
      const fil = await hamtaBild(url, path.join(REF, `${c.id}-normal.jpg`));
      const f16 = L.tillF16(await L.receptVektorer(modell, fil));
      const b = Buffer.from(f16.buffer, f16.byteOffset, f16.byteLength);   // little-endian på x86 och ARM
      if (b.length !== BYTES) throw new Error('fel storlek ' + b.length);
      if (torr) torrUt.vek[c.id] = b.toString('base64');
      else rader.push({ scryfall_id: c.id, modell: MODELL, vek: '\\x' + b.toString('hex') });
      klara++;
    } catch (e) { fel++; console.error(`\n  ${c.name} (${c.id}): ${e.message}`); }
    if (rader.length >= 25) await skicka();
    const s = (Date.now() - t0) / 1000;
    process.stdout.write(`  ${klara + fel}/${kvar.length}  ${(s / (klara + fel)).toFixed(2)} s/bild  ${fel ? fel + ' fel' : ''}   \r`);
  }
  await skicka();
  process.stdout.write('\n');
  if (torr) { fs.mkdirSync(path.dirname(utfil), { recursive: true }); fs.writeFileSync(utfil, JSON.stringify(torrUt)); console.log(`skrev ${path.relative(ROT, utfil)} (${Object.keys(torrUt.vek).length} bilder)`); }
  console.log(`klart: ${klara} ${torr ? 'räknade' : 'uppladdade'}, ${fel} fel, ${Math.round((Date.now() - t0) / 1000)} s`);
  if (fel) process.exitCode = 1;
})().catch(e => { console.error('FEL', e.message || e); process.exit(1); });

'use strict';
/* MES-375: lägg upp en världsfil i Supabase-lagringen, bucketen modeller (publik, som remsornas modell
   i dev/embed/embed.js, REMS_MODELL_URL).

     node dev/remsa/varldsfil-ladda-upp.cjs <varld-X.bin.gz>              torrkörning: visar namn, storlek och URL
     node dev/remsa/varldsfil-ladda-upp.cjs <varld-X.bin.gz> --ladda-upp  laddar upp på riktigt

   Filnamnet versioneras ur innehållet: varld-<modell>-<variant>-<sha256 8 tecken>.bin(.gz). En fil får
   ALDRIG skrivas över under samma namn (samma skäl som remsmodellen: telefonen cachar per URL), därför
   x-upsert: false, och finns namnet redan stannar skriptet. Lägg upp den gzippade filen: varld.js packar
   upp den med DecompressionStream, och då är det gzip-storleken som går över nätet.

   Nyckeln: SUPABASE_URL och SUPABASE_SERVICE_ROLE_KEY ur .env.local (aldrig utskriven).
   Gränsen: Supabase tar som förval högst 50 MB per fil (projektets inställning "Upload file size limit").
   Större filer avvisas med 413 — välj en mindre variant eller höj gränsen i Supabase först. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const ROT = path.join(__dirname, '..', '..');
const BUCKET = 'modeller';
const fil = process.argv[2];
const PA_RIKTIGT = process.argv.includes('--ladda-upp');

function env() {
  const ut = {};
  const f = path.join(ROT, '.env.local');
  if (!fs.existsSync(f)) throw new Error('.env.local saknas (symlänka den från main-mappen i en worktree)');
  for (const rad of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = rad.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) ut[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return ut;
}

(async () => {
  if (!fil || !fs.existsSync(fil)) { console.error('node dev/remsa/varldsfil-ladda-upp.cjs <varld-X.bin.gz> [--ladda-upp]'); process.exit(2); }
  const data = fs.readFileSync(fil);
  const gz = data[0] === 0x1f && data[1] === 0x8b;
  const ra = gz ? zlib.gunzipSync(data) : data;
  if (ra.subarray(0, 4).toString('latin1') !== 'MESV') throw new Error('inte en världsfil');
  const huvud = JSON.parse(ra.subarray(8, 8 + ra.readUInt32LE(4)).toString('utf8'));
  const sha = crypto.createHash('sha256').update(ra).digest('hex');   // innehållets hash (den uppackade filen)
  const modell = huvud.modell.replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, '');
  const namn = `varld-${modell}-${huvud.variant}-${sha.slice(0, 8)}.bin${gz ? '.gz' : ''}`;
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env();
  if (!SUPABASE_URL) throw new Error('SUPABASE_URL saknas i .env.local');
  const publik = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${namn}`;
  console.log(`fil:      ${path.relative(ROT, path.resolve(fil))}`);
  console.log(`variant:  ${huvud.variant} — ${huvud.om}; ${huvud.antal} referenser × ${huvud.dim}, ${huvud.namnAntal} namn`);
  console.log(`storlek:  ${(data.length / 1e6).toFixed(1)} MB${gz ? ` (gzip; uppackad ${(ra.length / 1e6).toFixed(1)} MB)` : ''}`);
  console.log(`sha256:   ${sha}`);
  console.log(`namn:     ${BUCKET}/${namn}`);
  console.log(`URL:      ${publik}`);
  if (data.length > 50 * 1024 * 1024) console.log('VARNING:  över 50 MB — Supabases förvalda gräns per fil');
  const finns = await fetch(publik, { method: 'HEAD' });
  if (finns.ok) { console.log('finns redan under det namnet — ingenting laddas upp (samma innehåll, samma hash)'); return; }
  if (!PA_RIKTIGT) { console.log('torrkörning: lägg till --ladda-upp för att ladda upp'); return; }
  if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY saknas i .env.local');
  const t0 = Date.now();
  const svar = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${namn}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY,
      // Bucketen tar bara application/octet-stream (application/gzip ger 415 invalid_mime_type). varld.js
      // känner igen gzip på de två första byten, och utan Content-Encoding packar webbläsaren inte upp den själv.
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'max-age=31536000, immutable', 'x-upsert': 'false',
    },
    body: data,
  });
  if (!svar.ok) throw new Error(`uppladdningen svarade ${svar.status}: ${(await svar.text()).slice(0, 400)}`);
  const koll = await fetch(publik, { method: 'HEAD' });
  console.log(`uppladdad på ${((Date.now() - t0) / 1000).toFixed(0)} s; publik HEAD ${koll.status}, ${koll.headers.get('content-length')} byte`);
  console.log(publik);
})().catch(e => { console.error('FEL', e.message); process.exit(1); });

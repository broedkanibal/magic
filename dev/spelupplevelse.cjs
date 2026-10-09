#!/usr/bin/env node
/* Spelupplevelsen i terminalen: vyerna ur supabase/migrations/20261009120000_spelupplevelse.sql.

     node dev/spelupplevelse.cjs            hela bilden + per spelare + partier
     node dev/spelupplevelse.cjs --spel     också per spelare och spel
     node dev/spelupplevelse.cjs --json     allt som JSON

   Läser bara. Nycklarna ur miljön eller .env.local i repots rot:
     SUPABASE_URL                 (annars hämtas den ur produktionens /api/config)
     SUPABASE_SERVICE_ROLE_KEY    vyerna är bara läsbara för service_role */
const fs = require('fs'), path = require('path');
const ROT = path.join(__dirname, '..');

function lasEnv() {
  const env = Object.assign({}, process.env), fil = path.join(ROT, '.env.local');
  if (fs.existsSync(fil)) for (const rad of fs.readFileSync(fil, 'utf8').split('\n')) {
    const m = rad.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/); if (m && !env[m[1]]) env[m[1]] = m[2];
  }
  return env;
}

async function hamta(url, nyckel, vy, ordning) {
  const h = { apikey: nyckel };
  if (!nyckel.startsWith('sb_')) h.Authorization = 'Bearer ' + nyckel;
  const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${vy}?select=*${ordning ? '&order=' + ordning : ''}`, { headers: h });
  const text = await r.text();
  if (!r.ok) {
    if (/PGRST205|42P01|does not exist|Could not find/.test(text)) throw new Error(`${vy} finns inte — kör supabase/migrations/20261009120000_spelupplevelse.sql först`);
    throw new Error(`${vy}: ${r.status} ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

const RUBRIK = {
  rattningar_per_100_kort: 'Rättningar per 100 kort (huvudmåttet, ska ner)',
  fel_namn_per_100_kort: 'Fel namn per 100 kort (löftet, ska vara ~0)',
  procent_identifierade: '% kort som fick namn utan spelaren',
  procent_identifierade_utan_claude: '% kort som fick namn utan spelaren och utan Claude',
  procent_ratt_av_sig_sjalv: '% kort rätt av sig själv (aldrig rört)',
  median_ms: 'Tid till namn, median (ms)',
  p90_ms: 'Tid till namn, 9 av 10 inom (ms)',
  procent_spel_alla_identifierade: '% spel där alla kort fick namn',
  procent_spel_hogst_1_rattning_per_spelare: '% spel med högst 1 rättning per spelare',
  procent_partier_klara: '% partier avslutade i Mesa',
  procent_spelade_igen_14d: '% spelare som spelade igen inom 14 dagar',
  betyg_snitt: '"How did the camera do?" snitt (1–5)',
};

(async () => {
  const env = lasEnv(), arg = process.argv.slice(2);
  let url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) { try { url = (await (await fetch('https://magic-mauve-xi.vercel.app/api/config')).json()).supabaseUrl; } catch (e) {} }
  const nyckel = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !nyckel) { console.error('Saknar SUPABASE_URL och/eller SUPABASE_SERVICE_ROLE_KEY (miljön eller .env.local).'); process.exit(2); }

  const [totalt] = await hamta(url, nyckel, 'upplevelse_totalt');
  const spelare = await hamta(url, nyckel, 'upplevelse_spelare', 'kort.desc');
  const partier = await hamta(url, nyckel, 'upplevelse_partier', 'startad.desc');
  const perSpel = arg.includes('--spel') ? await hamta(url, nyckel, 'upplevelse_spelare_spel', 'forsta_kort.desc') : null;
  if (arg.includes('--json')) { console.log(JSON.stringify({ totalt, spelare, partier, perSpel }, null, 2)); return; }

  const v = x => x == null ? '–' : String(x);
  console.log(`\nSpelupplevelsen · ${v(totalt.spel)} spel · ${v(totalt.spelare)} spelare · ${v(totalt.kort)} kort\n`);
  for (const [k, txt] of Object.entries(RUBRIK)) console.log(`  ${txt.padEnd(56)} ${v(totalt[k])}`);
  console.log(`  ${'Betyg: svar / hoppade över'.padEnd(56)} ${v(totalt.betyg_svar)} / ${v(totalt.betyg_hoppade)}`);

  console.log('\nPer spelare');
  console.table(spelare.map(s => ({ spelare: s.spelare, spel: s.spel, kort: s.kort, '% namn': s.procent_identifierade,
    'ej id./spel': s.ej_identifierade_per_spel, 'namngivna/spel': s.namngivna_per_spel,
    'rättn./100': s.rattningar_per_100_kort, 'fel/100': s.fel_namn_per_100_kort, median_ms: s.median_ms, p90_ms: s.p90_ms })));

  console.log('Partier');
  console.table(partier.map(p => ({ kod: p.kod, startad: (p.startad || '').slice(0, 16).replace('T', ' '),
    klart: p.klart ? 'ja' : p.pagar ? 'pågår' : 'nej', spelare: p.spelare,
    'igen 14 d': p.avgjort ? p.spelade_igen : `${p.spelade_igen} (ej avgjort)`, svar: p.svar, betyg: p.betyg_snitt })));

  if (perSpel) {
    console.log('Per spelare och spel');
    console.table(perSpel.map(r => ({ kod: r.kod, spelare: r.spelare, kort: r.kort, 'ej id.': r.ej_identifierade,
      namngivna: r.namngivna, 'utan namn': r.lamnade_utan_namn, fel: r.fel_namn, tillagda: r.tillagda,
      borttagna: r.borttagna, claude: r.via_claude, median_ms: r.median_ms, p90_ms: r.p90_ms, betyg: r.betyg })));
  }
})().catch(e => { console.error(e.message || e); process.exit(1); });

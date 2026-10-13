/* Mat test: grinden för fallen ur rapporter och pass (MES-368, granskningens fynd 2).

   Fallen ur dev/rapport/till-fall.cjs (slag 'rapport', underlag/rapporter/<id>/)
   räknas inte in i totalt och fanns inte i den gemensamma baslinjen — då
   fällde de aldrig --jamfor, och ett fel som en rapport visat kunde komma
   tillbaka tyst. Varje sådant fall har nu en egen baslinje bredvid sig,
   underlag/rapporter/<id>/grind.json, och --jamfor fäller när fallet blir
   sämre på de mått rapporten handlar om:

     fäller   fantomer       Kort som inte blev något
              felTillHanden  Fel till handen
     varnar   allt annat i fallet (facit ur en rapport underskattar: det
              ingen rättade antas rätt, så övriga mått är diagnos)

   grind.json skrivs av `kor.cjs --spara` (alla fall: också den gemensamma
   baslinjen) eller `kor.cjs --fall <id> --spara` när bara rapportfall är
   valda (då skrivs BARA grind.json, den gemensamma baslinjen rörs inte).
   Regeln "en fix tar med sitt testfall": gör fallet, se att det fäller på
   koden före fixen, spara grind.json på koden efter, committa ihop.

   De gamla fallens mått, tabell och grind ändras inte: rapportfallen skrivs
   i ett eget avsnitt efter den vanliga jämförelsen. */
'use strict';
const fs = require('fs'), path = require('path');
const { MATT, samre, visa } = require('./matt.cjs');

const GRIND_RAPPORT = ['fantomer', 'felTillHanden'];
const MAPP = path.join(__dirname, 'underlag', 'rapporter');
const fil = id => path.join(MAPP, id, 'grind.json');

function lasGrind(id) { try { return JSON.parse(fs.readFileSync(fil(id), 'utf8')); } catch (e) { return null; } }
/* Fallen som har en egen baslinje. */
function grindIds() {
  try { return fs.readdirSync(MAPP).filter(d => fs.existsSync(fil(d))).sort(); } catch (e) { return []; }
}
function sparaGrind(r, meta) {
  const G = { id: r.id, datum: meta.datum, html: meta.html, sha: meta.sha, commit: meta.commit, fäller: GRIND_RAPPORT, matt: r.matt };
  fs.writeFileSync(fil(r.id), JSON.stringify(G, null, 1) + '\n');
  return path.relative(process.cwd(), fil(r.id));
}

/* Jämför rapportfallen i `ok` med sina grind.json. Skriver raderna och
   returnerar { samre, battre, varn, utan }. */
function jamforRapporter(ok, opt) {
  opt = opt || {};
  const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n);
  const ut = { samre: 0, battre: 0, varn: 0, utan: [] };
  const fall = ok.filter(r => r.slag === 'rapport');
  if (!fall.length) return ut;
  console.log(`\nFallen ur rapporter (egen baslinje underlag/rapporter/<id>/grind.json; fäller på ${GRIND_RAPPORT.join(', ')}, resten varnar):`);
  for (const r of fall) {
    const G = lasGrind(r.id);
    if (!G) { ut.utan.push(r.id); console.log(`  ${pad(r.id, 8)} ingen grind.json — fäller inget (spara med: node dev/mattest/kor.cjs --fall ${r.id} --spara)`); continue; }
    console.log(`  ${pad(r.id, 8)} baslinjen ${G.datum} (${G.html}, sha256 ${G.sha}, commit ${G.commit || '?'})`);
    for (const [key, namn] of MATT) {
      const f = G.matt[key], e = r.matt[key];
      if (f == null && e == null) continue;
      const grind = GRIND_RAPPORT.includes(key);
      const s = samre(key, f, e, true), b = !s && samre(key, e, f, true);
      if (s && grind) ut.samre++; else if (s) ut.varn++;
      if (b && grind) ut.battre++;
      if (s || b || grind || opt.alla) console.log(`  ${pad(r.id, 8)} ${pad(namn.length > 60 ? namn.slice(0, 59) + '…' : namn, 61)} ${lpad(visa(f), 8)} → ${pad(visa(e), 8)} ${s ? (grind ? 'SÄMRE' : 'VARNING (diagnos, fäller inte)') : b ? 'bättre' : ''}`);
    }
  }
  console.log(`  → grinden för rapportfallen: ${ut.samre} rader sämre, ${ut.battre} bättre; ${ut.varn} varningar${ut.utan.length ? `; utan grind.json: ${ut.utan.join(', ')}` : ''}`);
  return ut;
}

module.exports = { GRIND_RAPPORT, lasGrind, grindIds, sparaGrind, jamforRapporter };

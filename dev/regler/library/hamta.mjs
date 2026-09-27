// Hämtar alla kort för en Scryfall-fråga (alla sidor) och sparar kompakt JSON.
import fs from 'node:fs';
const [,, q, ut] = process.argv;
const H = { 'User-Agent': 'MesaResearch/1.0', 'Accept': 'application/json' };
const sov = ms => new Promise(r => setTimeout(r, ms));
let url = 'https://api.scryfall.com/cards/search?' + new URLSearchParams({ q, order: 'edhrec' });
const kort = [];
let total = 0;
while (url) {
  const r = await fetch(url, { headers: H });
  const j = await r.json();
  if (j.object === 'error') { console.error(j.details); break; }
  total = j.total_cards;
  for (const c of j.data) {
    const faces = c.card_faces && !c.oracle_text ? c.card_faces : [c];
    kort.push({
      name: c.name,
      oracle: faces.map(f => f.oracle_text || '').join('\n//\n'),
      type: c.type_line,
      kw: c.keywords,
      edh: c.edhrec_rank ?? null,
      cmd: c.legalities?.commander,
      set: c.set, rel: c.released_at,
    });
  }
  url = j.has_more ? j.next_page : null;
  process.stderr.write(`${kort.length}/${total}\r`);
  await sov(150);
}
fs.writeFileSync(ut, JSON.stringify(kort));
console.log(`\nsparade ${kort.length} (total_cards ${total}) -> ${ut}`);

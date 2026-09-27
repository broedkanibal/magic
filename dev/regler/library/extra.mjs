import fs from 'node:fs';
const B = ' game:paper -is:funny';
const Q = [
 ['topp_tuck', "o:/on top of (its|their) owner'?s'? librar/"],
 ['botten_tuck', "o:/on the bottom of (its|their) owner'?s'? librar/"],
 ['dragna', 'o:"drawn this turn"'],
 ['blanda_perm', "o:/shuffles? (target|it|that|each|all|them|those|this|up to)[^.]*into (its|their|your) (owner'?s'? )?librar/"],
 ['titta_reveal', 'o:/looks? at the top/ o:/you may reveal/'],
 ['sok_reveal', 'o:/search[^.]*librar[^.]*reveal/'],
 ['sok_gy', 'o:/search your library for [^.]*into your graveyard/'],
 ['impuls_lang', '(o:/exiles? the top/ or o:/exiles? [^.]*cards? [^.]*from the top of/) o:/(until the end of your next turn|as long as)/ (o:"you may play" or o:"you may cast")'],
 ['titta_nedvand', 'o:/looks? at the top/ o:"face down"'],
 ['sok_annan_namn', 'o:/search [^.]*graveyard, hand, and library/'],
 ['mill_egen', 'keyword:mill -o:/(player|opponent)s? mills?/'],
 ['titta_slump', 'o:/looks? at the top/ o:"random order"'],
 ['botten_valfri', 'o:/bottom of [^.]*librar(y|ies) in any order/'],
 ['avsloja_pilar', 'o:/separate[^.]*piles/ o:/top/'],
];
const H = { 'User-Agent': 'MesaResearch/1.0', 'Accept': 'application/json' };
const sov = ms => new Promise(r => setTimeout(r, ms));
const ut = JSON.parse(fs.readFileSync('fragor.json'));
for (const [id, q0] of Q) {
  const q = (q0 + B).trim();
  let j;
  for (let f = 0; f < 3; f++) {
    const r = await fetch('https://api.scryfall.com/cards/search?' + new URLSearchParams({ q, order: 'edhrec' }), { headers: H });
    j = await r.json();
    if (r.status === 429 || /rate-limited/.test(j.details || '')) { console.log('rate-limit, väntar 70 s'); await sov(70000); continue; }
    break;
  }
  ut[id] = { q, total: j.total_cards ?? 0, fel: j.object === 'error' ? j.details : (j.warnings ? 'VARNING ' + j.warnings.join(' ') : null), topp: (j.data || []).slice(0, 5).map(c => c.name) };
  console.log(String(ut[id].total).padStart(6), id.padEnd(16), ut[id].fel || ut[id].topp.slice(0, 4).join(' | '));
  await sov(650);
}
fs.writeFileSync('fragor.json', JSON.stringify(ut, null, 1));

// Kör Scryfall-räkningar: total_cards + de fem mest spelade (order=edhrec) per fråga.
import fs from 'node:fs';
const B = ' game:paper -is:funny';
const Q = [
 ['alla', ''],
 ['alla_cmd', 'f:commander'],
 ['korpus', '(fo:library or keyword:mill or keyword:scry or keyword:surveil or keyword:explore or keyword:cascade or keyword:discover or keyword:manifest or keyword:"manifest dread" or keyword:cloak or keyword:fateseal or keyword:clash or keyword:dredge or keyword:hideaway or keyword:ripple or keyword:miracle or keyword:transmute or keyword:typecycling or keyword:landcycling)'],
 ['o_library', 'o:library'],
 ['fo_library', 'fo:library'],
 ['draw', '(o:"draw a card" or o:/draws? \\w+ cards/ or o:"draw cards")'],
 ['titta_n', '(o:/looks? at the top \\w+ cards/ or o:/looks? at [^.]{0,40}cards? from the top of/)'],
 ['titta_1', 'o:/looks? at the top card of/ -o:"any time"'],
 ['titta_rest_botten', 'o:/looks? at the top/ o:/(rest|other|others|remaining cards?) [^.]{0,30}bottom/'],
 ['titta_hand', 'o:/looks? at the top/ o:/(put|reveal) [^.]*into your hand/'],
 ['ordna', 'o:/in any order/ o:/librar(y|ies)/'],
 ['scry', 'keyword:scry'],
 ['surveil', 'keyword:surveil'],
 ['fateseal', 'keyword:fateseal'],
 ['clash', 'keyword:clash'],
 ['avsloja_n', '(o:/reveals? the top \\w+ (\\w+ )?cards/ or o:/reveals? [^.]{0,40}cards? from the top of/) -o:until'],
 ['avsloja_1', 'o:/reveals? the top card of/'],
 ['tills_text', 'o:/(reveal|exile|mill|put)s? cards from the top of [^.]{0,40}until/'],
 ['tills_alla', '(o:/(reveal|exile|mill|put)s? cards from the top of [^.]{0,40}until/ or keyword:cascade or keyword:discover or keyword:ripple)'],
 ['cascade', 'keyword:cascade'],
 ['discover', 'keyword:discover'],
 ['ripple', 'keyword:ripple'],
 ['mill', 'keyword:mill'],
 ['mill_annan', 'o:/(target|each|that|defending|chosen) (player|opponent)s? ([^.]{0,30} )?mills?\\b|\\b(opponents?|players?) mills?\\b/'],
 ['mill_halva', 'o:/mills? half|top half of/'],
 ['exil_topp', '(o:/exiles? the top (card|\\w+ cards?) of/ or o:/exiles? [^.]{0,20}cards?[^.]{0,40} from the top of/)'],
 ['impuls', '(o:/exiles? the top/ or o:/exiles? [^.]{0,20}cards?[^.]{0,40} from the top of/) (o:"you may play" or o:"you may cast")'],
 ['exil_nedvand', 'o:/exiles? (the top|[^.]*from the top)[^.]*face down/'],
 ['hideaway', 'keyword:hideaway'],
 ['titta_alltid', 'o:/look at the top card of (your|their) library (at )?any time/'],
 ['avslojt_topp', 'o:/play with the top cards? of [^.]{0,20}librar(y|ies) revealed/'],
 ['spela_topp', 'o:/(play|cast) [^.]*from the top of (your|their|each)[^.]*librar/'],
 ['sok', 'o:/\\bsearch(es)? [^.]*librar(y|ies)/'],
 ['sok_fo', 'fo:/\\bsearch(es)? [^.]*librar(y|ies)/'],
 ['sok_land', 'o:/search(es)? [^.]*librar(y|ies) for [^.]*(land|plains|island|swamp|mountain|forest)/'],
 ['sok_hand', 'o:/search your library for [^.]*(it|that card|them|those cards) into your hand/'],
 ['sok_bf', 'o:/search your library for [^.]*onto the battlefield/'],
 ['sok_topp', 'o:/search your library for [^.]*on top/'],
 ['sok_annan', 'o:/search (target (player|opponent)\'s|an opponent\'s|each opponent\'s|that player\'s|its owner\'s|target player\'s) [^.]{0,30}librar/'],
 ['fetchland', 't:land o:/search your library for/'],
 ['blanda', 'o:/\\bshuffles?\\b/'],
 ['blanda_utan_sok', 'o:/\\bshuffles?\\b/ -o:search'],
 ['blanda_in', 'o:/shuffles? [^.]*into (your|their|its owner\'s|its owners\'|his or her|each player\'s|a) librar/'],
 ['blanda_gy', 'o:/shuffles? [^.]*graveyards? into/'],
 ['blanda_hand', 'o:/shuffles? [^.]*hands?[^.]* into [^.]*librar/'],
 ['topp_fran_zon', 'o:/on top of (your|their|its owner\'s|his or her|that player\'s) (owner\'s )?librar/'],
 ['topp_fran_hand', 'o:/from (your|their) hand on top of/'],
 ['topp_tuck', 'o:/on top of (its|their) owners?\'? librar/'],
 ['botten', 'o:/bottom of [^.]{0,30}librar(y|ies)/'],
 ['botten_tuck', 'o:/on the bottom of (its|their) owners?\'? librar/'],
 ['botten_slump', 'o:/random order/ o:/bottom/'],
 ['botten_kort', 'o:/bottom card of/'],
 ['nte', 'o:/(second|third|fourth|fifth|sixth|seventh) from the top|beneath the top/'],
 ['manifest', '(keyword:manifest or keyword:"manifest dread" or keyword:cloak)'],
 ['explore', 'keyword:explore'],
 ['dredge', 'keyword:dredge'],
 ['miracle', 'keyword:miracle'],
 ['transmute_cycling', '(keyword:transmute or keyword:typecycling or keyword:landcycling or keyword:"basic landcycling" or keyword:plainscycling or keyword:islandcycling or keyword:swampcycling or keyword:mountaincycling or keyword:forestcycling or keyword:wizardcycling or keyword:slivercycling)'],
 ['titta_annan', 'o:/look at the top [^.]{0,30}of (target|each|an|that) (player|opponent)\'s librar/'],
 ['spela_annans', 'o:/(exile|look at|reveal)s? the top [^.]{0,40}of (target|each|an|that) (player|opponent)\'s librar(y|ies)/ (o:"you may cast" or o:"you may play")'],
 ['lekstorlek', 'o:/cards in (your|their|target player\'s|that player\'s|each player\'s) librar|no cards in (your|their) library|library has no cards|number of cards in [^.]{0,20}librar/'],
 ['vinst_tom', 'o:/no cards in (your|their) library|library has no cards|cards in your library/ o:/(win|lose)s? the game/'],
 ['slump', 'o:/at random from [^.]*librar|random card (from|in) [^.]*librar/'],
 ['partner_with', 'keyword:"partner with"'],
 ['exil_topp_annan', 'o:/exiles? the top [^.]*of (target|each|that|an) (player|opponent)\'s librar/'],
 ['topp_till_bf', 'o:/put the top (card|\\w+ cards?) of [^.]*librar(y|ies) onto the battlefield/'],
 ['topp_fran_gy', 'o:/from (your|a|their) graveyard on top of/'],
 ['fran_lek', 'o:/(graveyard|exile) from (your|a|their) librar|from your library and\\/or/'],
];
const H = { 'User-Agent': 'MesaResearch/1.0', 'Accept': 'application/json' };
const sov = ms => new Promise(r => setTimeout(r, ms));
const ut = {};
await sov(Number(process.env.VANTA || 0));
for (const [id, q0] of Q) {
  const q = (q0 + B).trim();
  let j;
  for (let forsok = 0; forsok < 3; forsok++) {
    const r = await fetch('https://api.scryfall.com/cards/search?' + new URLSearchParams({ q, order: 'edhrec' }), { headers: H });
    j = await r.json();
    if (r.status === 429 || /rate-limited/.test(j.details || '')) { console.log('rate-limit, väntar 70 s'); await sov(70000); continue; }
    break;
  }
  ut[id] = { q, total: j.total_cards ?? 0, fel: j.object === 'error' ? j.details : (j.warnings ? 'VARNING ' + j.warnings.join(' ') : null), topp: (j.data || []).slice(0, 5).map(c => c.name) };
  console.log(String(ut[id].total).padStart(6), id.padEnd(18), ut[id].fel ? 'FEL ' + ut[id].fel : ut[id].topp.slice(0, 4).join(' | '));
  await sov(650);
}
fs.writeFileSync('fragor.json', JSON.stringify(ut, null, 1));

// Lokal klassning av library-korpusen i fina kategorier och grundoperationer (primitiver).
const N = String.raw`(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|twenty|x|\d+|that many|those|any number of|a number of|half)`;
const LIB = String.raw`librar(?:y|ies)`;
const OWN = String.raw`(?:your|their|its owner's|its owners'|their owner's|their owners'|his or her|that player's|target player's|each player's|a player's|its controller's)`;
const OTHER = String.raw`(?:target (?:player|opponent)'s|an opponent's|each opponent's|each player's|that player's|defending player's|the chosen player's|target players'|chosen opponent's|another player's|that opponent's|a player's|each other player's)`;
const r = s => new RegExp(s);
const kw = (c, k) => (c.kw || []).some(x => x.toLowerCase() === k);

// Varje kategori: id, namn, primitiv, test(t = oracle utan påminnelsetext, gemener; c = kortet)
const KAT = [
  // --- Titta/avslöja översta N och fördela
  { id: 'scry', p: 'P2', namn: 'Scry', t: (t, c) => kw(c, 'scry') || /\bscry\b/.test(t) },
  { id: 'surveil', p: 'P2', namn: 'Surveil', t: (t, c) => kw(c, 'surveil') || /\bsurveil\b/.test(t) },
  { id: 'titta_n', p: 'P2', namn: 'Look at the top N (N≥2/X)', t: t => r(String.raw`look(?:s)? at the top (?!card)${N} (?:\w+ )?cards?|looks? at [^.]{0,40}cards? from the top of`).test(t) },
  { id: 'titta_1', p: 'P2', namn: 'Look at the top card (engång)', t: t => /looks? at the top card of/.test(t) && !/look at the top card of your library (?:at )?any time/.test(t) },
  { id: 'ordna', p: 'P2', namn: 'In any order / rearrange', t: t => r(String.raw`(?:on top of|back on top of|top of) [^.]{0,40}${LIB}[^.]{0,10} in any order|in any order[^.]{0,40}(?:top|bottom)|rearrange`).test(t) },
  { id: 'avsloja_n', p: 'P3', namn: 'Reveal the top N', t: t => r(String.raw`reveals? the top (?!card)${N} (?:\w+ ){0,2}cards?|reveals? [^.]{0,40}cards? from the top of (?![^.]{0,40}until)`).test(t) },
  { id: 'avsloja_1', p: 'P3', namn: 'Reveal the top card', t: t => /reveals? the top card of/.test(t) },
  { id: 'explore', p: 'P3', namn: 'Explore', t: (t, c) => kw(c, 'explore') || /\bexplores?\b/.test(t) },
  { id: 'clash', p: 'P3', namn: 'Clash', t: (t, c) => kw(c, 'clash') },
  { id: 'fateseal', p: 'P13', namn: 'Fateseal', t: (t, c) => kw(c, 'fateseal') },
  // --- Avslöja/exilera tills
  { id: 'tills', p: 'P8', namn: 'Reveal/exile until …', t: t => r(String.raw`(?:reveal|exile|mill|put)s? cards from the top of [^.]{0,40}${LIB}[^.]{0,40}until|until (?:you|they|that player|he or she|each player|a player) (?:reveal|exile|mill|put)s?`).test(t) },
  { id: 'cascade', p: 'P8', namn: 'Cascade', t: (t, c) => kw(c, 'cascade') },
  { id: 'discover', p: 'P8', namn: 'Discover', t: (t, c) => kw(c, 'discover') || /\bdiscover \d|\bdiscover x/.test(t) },
  { id: 'ripple', p: 'P8', namn: 'Ripple', t: (t, c) => kw(c, 'ripple') },
  // --- Flytta översta N utan val
  { id: 'mill', p: 'P4', namn: 'Mill', t: (t, c) => kw(c, 'mill') || /\bmills?\b/.test(t) || r(String.raw`put the top [^.]{0,30} of [^.]{0,30}${LIB} into [^.]{0,30}graveyard`).test(t) },
  { id: 'exil_topp', p: 'P4', namn: 'Exile the top N (face up)', t: t => r(String.raw`exiles? the top (?:card|${N} (?:\w+ )?cards?) of (?!.{0,40}face down)|exiles? [^.]{0,20}cards?[^.]{0,40} from the top of (?![^.]{0,40}until)`).test(t) },
  { id: 'dredge', p: 'P4', namn: 'Dredge', t: (t, c) => kw(c, 'dredge') },
  { id: 'topp_till_hand', p: 'P1', namn: 'Put the top N into hand (ej draw)', t: t => r(String.raw`put (?:the top (?:card|${N} (?:\w+ )?cards?)|${N} cards from the top) of [^.]{0,30}${LIB} into [^.]{0,20}hand`).test(t) },
  { id: 'topp_till_bf', p: 'P3', namn: 'Top card(s) onto the battlefield', t: t => r(String.raw`put the top (?:card|${N} (?:\w+ )?cards?) of [^.]{0,30}${LIB} onto the battlefield(?! face down)`).test(t) },
  // --- Impuls / spela från toppen
  { id: 'impuls', p: 'P9', namn: 'Impulse draw (exile top, may play)', t: t => /exiles? the top|exiles? [^.]{0,20}cards?[^.]{0,40} from the top of/.test(t) && /(?:you may|may) (?:play|cast)|you may (?:play|cast) (?:that card|those cards|them|it|cards exiled|one of those|spells? from among)|until end of turn, you may|until the end of your next turn, you may/.test(t) },
  { id: 'exil_nedvand', p: 'P9', namn: 'Exile top face down', t: t => r(String.raw`exiles? the top [^.]{0,50}face down|exile (?:the top card|them|it|that card|those cards|one of them|one of those cards|a card) [^.]{0,40}face down`).test(t) && r(LIB).test(t) },
  { id: 'hideaway', p: 'P9', namn: 'Hideaway', t: (t, c) => kw(c, 'hideaway') },
  { id: 'titta_alltid', p: 'P10', namn: 'Look at the top card any time', t: t => /look at the top card of (?:your|their) library (?:at )?any time|look at the top card of your library whenever/.test(t) },
  { id: 'avslojt_topp', p: 'P10', namn: 'Play with the top card revealed', t: t => /play with the top cards? of (?:your|their|his or her|each player's) librar(?:y|ies) revealed|top card of your library is revealed/.test(t) },
  { id: 'spela_topp', p: 'P10', namn: 'Play/cast from the top of library', t: t => /(?:play|cast)(?:(?!reveal|exile|mill|put|look|search)[^.]){0,80}from the top of (?:your|their|each|target|an opponent's|that player's)[^.]{0,20}librar|(?:play|cast) the top card of/.test(t) },
  // --- Söka
  { id: 'sok', p: 'P5', namn: 'Search library (tutor/fetch)', t: (t, c) => r(String.raw`\bsearch(?:es)? [^.]{0,60}${LIB}`).test(t) || ['transmute', 'typecycling', 'landcycling', 'transfigure'].some(k => kw(c, k)) || (c.kw||[]).some(x => /cycling$/i.test(x) && x.toLowerCase() !== 'cycling') || kw(c, 'partner with') },
  { id: 'sok_land', p: 'P5', namn: 'Search for land (fetch/ramp)', t: t => r(String.raw`search(?:es)? [^.]{0,40}${LIB} for [^.]{0,60}(?:land|plains|island|swamp|mountain|forest|gate|desert)`).test(t) },
  { id: 'sok_annan', p: 'P13', namn: "Search another player's library (du letar)", t: t => r(String.raw`(?:^|[.:;\n—] ?|then |and |may |you )search ${OTHER}[^.]{0,40}${LIB}|search (?:its owner's|their owner's|its controller's|target player's) (?:graveyard, hand, and |hand and |graveyard and )?${LIB}|search (?:target|that) (?:player|opponent)'s|searches ${OTHER}|while (?:they're|an opponent is) searching their librar`).test(t) },
  // --- Blanda
  { id: 'blanda', p: 'P6', namn: 'Shuffle (any)', t: t => /\bshuffles?\b/.test(t) },
  { id: 'blanda_in', p: 'P7', namn: 'Shuffle cards into library', t: t => r(String.raw`shuffles? [^.]{0,100}into (?:your|their|its owner's|its owners'|their owner's|their owners'|his or her|that player's|each player's|target player's|a) ${LIB}`).test(t) },
  // --- Lägga kort i leken
  { id: 'topp_fran_zon', p: 'P7', namn: 'Put card on top of library (from other zone)', t: t => r(String.raw`(?:put|puts|return|returns|place|places)[^.]{0,120}on top of ${OWN} (?:owner'?s'? )?${LIB}`).test(t) && !r(String.raw`the top [^.]{0,40}back on top`).test(t) },
  { id: 'topp_fran_hand', p: 'P7', namn: 'Put card(s) from hand on top (Brainstorm)', t: t => /from (?:your|their) hand on top of|cards? from (?:your|their) hand on (?:the )?top|put (?:a|one|two|three|x|\w+) cards? from your hand on top/.test(t) },
  { id: 'botten', p: 'P7', namn: 'Bottom of library (any)', t: t => r(String.raw`bottom of ${OWN}? ?(?:owner'?s'? )?${LIB}|on the bottom\b`).test(t) },
  { id: 'botten_slump', p: 'P7', namn: 'Bottom in a random order', t: t => /bottom of [^.]{0,40}librar(?:y|ies) in (?:a|any) random order|in a random order on the bottom|on the bottom[^.]{0,40}in a random order/.test(t) },
  { id: 'botten_kort', p: 'P14', namn: 'Bottom card (look/draw/play)', t: t => /bottom card of (?:your|their|target|each|that)/.test(t) },
  { id: 'nte', p: 'P7', namn: 'N-th from the top', t: t => /(?:second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+(?:st|nd|rd|th)|xth) from the top|just beneath the top|beneath the top \w+ cards?|second card from|third card from/.test(t) },
  // --- Ansiktet nedåt
  { id: 'manifest', p: 'P11', namn: 'Manifest / manifest dread / cloak', t: (t, c) => kw(c, 'manifest') || kw(c, 'manifest dread') || kw(c, 'cloak') || /\bmanifest|\bcloak/.test(t) },
  { id: 'nedvand_bf', p: 'P11', namn: 'Top card onto battlefield face down', t: t => /top [^.]{0,40}onto the battlefield face down/.test(t) },
  // --- Räkna / tom lek
  { id: 'lekstorlek', p: 'P12', namn: 'Library size matters', t: t => r(String.raw`cards? in (?:your|their|his or her|target player's|that player's|each player's|a player's|an opponent's|each opponent's|target opponent's) ${LIB}|no cards in (?:your|their|it)|${LIB} (?:has|with) no cards|empty ${LIB}|${LIB} is empty|fewest cards in|${LIB} has [^.]{0,20}cards in it|number of cards in [^.]{0,20}${LIB}`).test(t) },
  { id: 'vinst_tom', p: 'P12', namn: 'Win/lose via library (Lab Man/Oracle)', t: t => r(String.raw`(?:win|lose)s? the game`).test(t) && r(String.raw`cards? in (?:your|their|target player's) ${LIB}|no cards in (?:your|their) ${LIB}|draw a card while your ${LIB} has no cards|${LIB} has no cards|empty ${LIB}`).test(t) },
  // --- Annan spelares lek
  { id: 'titta_annan', p: 'P13', namn: "Look at another player's library (du ser deras dolda kort)", t: t => r(String.raw`look at the top (?:card|${N} (?:\w+ )?cards?) of ${OTHER} (?:${LIB})|look at the top (?:card|${N} (?:\w+ )?cards?) of (?:target|each|an|that) (?:player|opponent)'?s? ${LIB}|look (?:at|through) ${OTHER} ${LIB}|look at the top card of (?:target|each) (?:player|opponent)`).test(t) },
  { id: 'spela_annans', p: 'P13', namn: "Play cards from another player's library", t: t => r(String.raw`(?:exile|reveal|look at)s? the top [^.]{0,40} of (?:target (?:player|opponent)'s|an opponent's|each opponent's|each other player's|that player's|target opponent's|defending player's|each player's|their) ${LIB}`).test(t) && /you may (?:cast|play)|you may spend mana as though|cast (?:it|that card|those cards|spells from among) (?:this turn|without)/.test(t) && !/each player may cast|they may cast/.test(t) },
  { id: 'mill_annan', p: 'P4', namn: 'Mill another player (target/each opponent)', t: t => /(?:target|each|that|chosen|defending|another) (?:player|opponent)s? (?:[^.]{0,30} )?mills?\b|\b(?:opponents?|players?) mills?\b|its (?:owner|controller) mills|that creature's controller mills/.test(t) },
  // --- Övrigt
  { id: 'fran_lek', p: 'P4', namn: 'Triggers on cards leaving the library (from library)', t: t => r(String.raw`from (?:your|a|their|anywhere other than (?:your|a)|a player's|an opponent's) (?:hand or |graveyard or )?${LIB}|(?:hand|graveyard) or ${LIB}|${LIB} or (?:graveyard|hand)`).test(t) && !/search/.test(t) },
  { id: 'slump', p: 'P14', namn: 'Random card from library', t: t => r(String.raw`at random from [^.]{0,30}${LIB}|random card (?:from|of|in) [^.]{0,30}${LIB}|${LIB}[^.]{0,30}at random`).test(t) },
  { id: 'miracle', p: 'P1', namn: 'Miracle (reveal on draw)', t: (t, c) => kw(c, 'miracle') },
  { id: 'dragna', p: 'P1', namn: 'Cards drawn this turn (Sylvan Library)', t: t => /drawn this turn/.test(t) },
  { id: 'byt_hand_lek', p: 'P7', namn: 'Hand/graveyard/battlefield → library (not shuffle, not top/bottom)', t: t => r(String.raw`(?:put|puts|return|returns)[^.]{0,80}into (?:your|their|its owner's|his or her|its owners'|their owners') ${LIB}`).test(t) },
  { id: 'hela_leken', p: 'P4', namn: 'Whole library / half library', t: t => r(String.raw`(?:exile|mill|reveal|put)s? (?:all cards (?:in|from) )?(?:your|their|that player's|target player's|each player's) ${LIB}(?! for| until)|half (?:of )?(?:their|your|that player's) ${LIB}|mills? half|each card in (?:your|their) ${LIB}|all cards in (?:your|their) ${LIB}|all but the bottom|all but the top`).test(t) },
];

const strip = s => s.replace(/\([^)]*\)/g, ' ').replace(/[’]/g, "'").toLowerCase();
const full = s => s.replace(/[’]/g, "'").toLowerCase();
function klassa(c) {
  const t = strip(c.oracle);
  let ids = KAT.filter(k => { try { return k.t(t, c); } catch (e) { return false; } }).map(k => k.id);
  if (!ids.length) { // bara påminnelsetexten nämner leken (partner with, lander/junk-token, 'has cascade' …)
    const f = full(c.oracle);
    ids = KAT.filter(k => { try { return k.t(f, c); } catch (e) { return false; } }).map(k => k.id);
    if (ids.length) c.viaPaminnelse = true;
  }
  return ids;
}
module.exports = { KAT, klassa, strip, full };

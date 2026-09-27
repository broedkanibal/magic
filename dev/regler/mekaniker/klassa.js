// Klassificerar topp 2000 Commander-kort (EDHREC-ordning) per mekanik.
const fs = require('fs');
const top = require('./top2000.json');

function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function prep(c) {
  const faces = c.card_faces || [];
  let txt = [c.oracle_text || '', ...faces.map(f => f.oracle_text || '')].join('\n');
  const names = [c.name, ...faces.map(f => f.name)].filter(Boolean)
    .sort((a, b) => b.length - a.length);
  for (const n of names) txt = txt.replace(new RegExp(esc(n), 'g'), 'CARDNAME');
  // kort med kommatecken i namnet refererar ofta till förnamnet ("Atraxa")
  const first = c.name.split(',')[0];
  if (first !== c.name && first.length > 3) txt = txt.replace(new RegExp('\\b' + esc(first) + '\\b', 'g'), 'CARDNAME');
  txt = txt.replace(/\u2212/g, '-');
  const type = [c.type_line || '', ...faces.map(f => f.type_line || '')].join(' // ');
  const kws = new Set((c.keywords || []).map(k => k.toLowerCase()));
  const parts = (c.all_parts || []).filter(p => p.component === 'token');
  return { c, t: txt.toLowerCase(), raw: txt, type, kws, parts, layout: c.layout };
}

const cards = top.map(prep);

const kw = (...ks) => x => ks.some(k => x.kws.has(k));
const re = r => x => r.test(x.t);
const ty = r => x => r.test(x.type);
const or = (...fs) => x => fs.some(f => f(x));
const and = (...fs) => x => fs.every(f => f(x));
const not = f => x => !f(x);

// Hjälp: meningar (för att hålla regex inom en mening)
const S = '[^.\\n]*';
const sent = (a, b) => new RegExp(a + S + b);

const isAura = ty(/\bAura\b/);
const tokenPart = x => x.parts.some(p => /^Token/.test(p.type_line) || p.type_line === 'Token');

const M = [];
const add = (grupp, namn, f, q, extra) => M.push({ grupp, namn, f, q, ...(extra || {}) });

// ---------- Tokens och spelnivå ----------
add('Tokens och spelnivå', 'Skapar tokens (alla slag)',
  or(tokenPart, re(/\bcreates?\b[^.\n]*\btokens?\b/), kw('amass', 'incubate', 'investigate', 'fabricate', 'living weapon', 'afterlife', 'populate', 'embalm', 'eternalize', 'myriad', 'encore', 'offspring', 'squad', 'mobilize')),
  'f:commander (fo:/\\bcreates?\\b[^.]*\\btokens?\\b/ or kw:amass or kw:incubate or kw:investigate or kw:fabricate or kw:"living weapon" or kw:afterlife or kw:populate or kw:embalm or kw:eternalize or kw:myriad or kw:encore or kw:offspring or kw:squad or kw:mobilize)');

const PRE = ['treasure', 'food', 'clue', 'blood', 'map', 'powerstone', 'incubator', 'gold', 'junk', 'shard', 'lander', 'mutagen'];
add('Tokens och spelnivå', 'Fördefinierade tokens (något av nedan)',
  or(re(new RegExp('\\b(' + PRE.join('|') + ') tokens?\\b')), re(/\brole tokens?\b/), kw('investigate', 'incubate')),
  'f:commander (fo:/\\b(treasure|food|clue|blood|map|powerstone|incubator|gold|junk|shard|lander|mutagen|role) tokens?\\b/ or kw:investigate or kw:incubate)');
for (const [n, r, q] of [
  ['Treasure', /\btreasure tokens?\b/, 'fo:/\\btreasure tokens?\\b/'],
  ['Food', /\bfood tokens?\b/, 'fo:/\\bfood tokens?\\b/'],
  ['Clue (inkl. investigate)', /\bclue tokens?\b|\binvestigate\b/, '(fo:/\\bclue tokens?\\b/ or kw:investigate)'],
  ['Blood', /\bblood tokens?\b/, 'fo:/\\bblood tokens?\\b/'],
  ['Map', /\bmap tokens?\b/, 'fo:/\\bmap tokens?\\b/'],
  ['Powerstone', /\bpowerstone tokens?\b/, 'fo:/\\bpowerstone tokens?\\b/'],
  ['Incubator (incubate)', /\bincubat(e|or)\b/, '(fo:/\\bincubator tokens?\\b/ or kw:incubate)'],
  ['Role-tokens', /\brole tokens?\b/, 'fo:/\\brole tokens?\\b/'],
  ['Gold/Junk/Shard/Lander', /\b(gold|junk|shard|lander) tokens?\b/, 'fo:/\\b(gold|junk|shard|lander) tokens?\\b/'],
]) add('Tokens och spelnivå', '  ' + n, re(r), 'f:commander ' + q);

add('Tokens och spelnivå', 'Token-kopior av kort',
  or(re(/\btokens?\b[^.\n]*\b(that's|that are) (a )?cop(y|ies)\b/), re(/\btoken cop(y|ies)\b/), re(/\bcreate a copy of\b/), re(/\bpopulate\b/), kw('embalm', 'eternalize', 'myriad', 'encore', 'offspring', 'squad', 'populate')),
  'f:commander (fo:/tokens? (that\'s|that are) (a )?cop(y|ies)/ or fo:/token cop(y|ies)/ or kw:populate or kw:embalm or kw:eternalize or kw:myriad or kw:encore or kw:offspring or kw:squad)');

const ANDRA = '(its controller|its owner|target opponent|target player|that player|each opponent|each player|each other player|an opponent|that opponent|defending player|the chosen player|chosen player|each of those players|that spell\'s controller|the player|their controller)';
add('Tokens och spelnivå', 'Token ges till annan spelare',
  or(re(new RegExp('\\b' + ANDRA + ' (may )?creates?\\b' + S + '\\btokens?\\b')),
     re(/\btokens?\b[^.\n]*under (target|that|an|each) (opponent|player)'s control/),
     re(/for each opponent, (that player|they) creates?/)),
  'f:commander (fo:/(its controller|its owner|target opponent|target player|that player|each opponent|each player|each other player|an opponent|that opponent|chosen player|the player) (may )?creates?\\b[^.]*\\btokens?/ or fo:/tokens?[^.]*under (target|that|an|each) (opponent|player)\'s control/)');

add('Tokens och spelnivå', 'Emblem', re(/\bemblem\b/), 'f:commander o:emblem');
add('Tokens och spelnivå', 'Monarch', re(/\bmonarch\b/), 'f:commander o:monarch');
add('Tokens och spelnivå', 'Initiative', re(/\binitiative\b/), 'f:commander o:initiative');
add('Tokens och spelnivå', 'Venture into the dungeon', re(/venture into the dungeon/), 'f:commander o:"venture into the dungeon"');
add('Tokens och spelnivå', 'Day/night', or(kw('daybound', 'nightbound'), re(/\bit becomes (day|night)\b|\bday and night\b|if it's (day|night)/)), 'f:commander (kw:daybound or kw:nightbound or o:"becomes day" or o:"becomes night")');
add('Tokens och spelnivå', 'The Ring tempts you', re(/the ring tempts you/), 'f:commander o:"the ring tempts you"');
add('Tokens och spelnivå', "City's blessing / ascend", or(kw('ascend'), re(/city's blessing/)), 'f:commander (kw:ascend or o:"city\'s blessing")');
add('Tokens och spelnivå', 'Speed (Start your engines!)', or(kw('start your engines!', 'max speed'), re(/\byour speed\b/)), 'f:commander (kw:"start your engines!" or o:"your speed")');

// ---------- Räknare ----------
const PC = /\b(put|puts|with|remove|removes|move|moves|double|distribute|additional|get|gets|twice|that many|number of)\b/;
add('Räknare på permanents', 'Någon räknare på permanents (alla slag)',
  or(re(/\b(put|puts|placing|place)\b[^.\n]*\bcounters?\b[^.\n]*\bon\b/), re(/enters (the battlefield )?with [^.\n]*counters?/), re(/\bproliferate\b/), ty(/Planeswalker|Saga|Battle/), kw('modular', 'evolve', 'outlast', 'adapt', 'mentor', 'bolster', 'support', 'graft', 'persist', 'undying', 'vanishing', 'fading', 'suspend', 'impending', 'station', 'backup', 'training', 'riot')),
  'f:commander (fo:/\\bput[^.]*\\bcounters? on/ or fo:/enters with[^.]*counters?/ or t:planeswalker or t:saga or t:battle)');
add('Räknare på permanents', '+1/+1-räknare', or(re(/\+1\/\+1 counters?/), kw('modular', 'evolve', 'outlast', 'adapt', 'mentor', 'bolster', 'support', 'graft', 'undying', 'riot', 'training', 'backup')), 'f:commander fo:"+1/+1 counter"');
add('Räknare på permanents', '-1/-1-räknare', or(re(/-1\/-1 counters?/), kw('wither', 'persist', 'infect')), 'f:commander (fo:"-1/-1 counter" or kw:wither or kw:infect)');
add('Räknare på permanents', 'Loyalty / planeswalkers', or(ty(/Planeswalker/), re(/loyalty counters?/)), 'f:commander (t:planeswalker or o:"loyalty counter")');
add('Räknare på permanents', '  varav planeswalker-kort', ty(/Planeswalker/), 'f:commander t:planeswalker');
add('Räknare på permanents', 'Lore / sagor', or(ty(/Saga/), re(/lore counters?/)), 'f:commander (t:saga or o:"lore counter")');
add('Räknare på permanents', 'Charge', re(/charge counters?/), 'f:commander o:"charge counter"');
add('Räknare på permanents', 'Time (suspend, vanishing, impending)', or(re(/\btime counters?\b/), kw('suspend', 'vanishing', 'impending')), 'f:commander (fo:"time counter" or kw:suspend or kw:vanishing or kw:impending)');
add('Räknare på permanents', 'Shield', re(/shield counters?/), 'f:commander o:"shield counter"');
add('Räknare på permanents', 'Stun', re(/stun counters?/), 'f:commander o:"stun counter"');
add('Räknare på permanents', 'Oil', re(/\boil counters?/), 'f:commander o:"oil counter"');
const KWC = '(flying|first strike|double strike|deathtouch|haste|hexproof|indestructible|lifelink|menace|reach|trample|vigilance|decayed)';
add('Räknare på permanents', 'Keyword counters (flying/lifelink … counter)',
  or(re(new RegExp('\\b' + KWC + ' counters?\\b')), re(/counter of your choice|choice of a [^.\n]*counter/)),
  'f:commander (o:/\\b(flying|first strike|double strike|deathtouch|haste|hexproof|indestructible|lifelink|menace|reach|trample|vigilance) counters?/ or o:"counter of your choice")');
add('Räknare på permanents', 'Proliferate', re(/\bproliferate\b/), 'f:commander o:proliferate');
add('Räknare på permanents', 'Station (rymdskepp)', kw('station'), 'f:commander kw:station');

add('Räknare på spelare', 'Poison / infect / toxic', or(re(/poison counters?/), kw('infect', 'toxic', 'poisonous')), 'f:commander (o:"poison counter" or kw:infect or kw:toxic or kw:poisonous)');
add('Räknare på spelare', 'Energy', or(re(/\{e\}/), re(/energy counters?/)), 'f:commander (o:{E} or o:"energy counter")');
add('Räknare på spelare', 'Experience', re(/experience counters?/), 'f:commander o:"experience counter"');
add('Räknare på spelare', 'Rad', re(/\brad counters?/), 'f:commander o:"rad counter"');
add('Räknare på spelare', 'Commander damage (text som nämner det)', re(/combat damage[^.\n]*\bcommander\b|commander damage/), 'f:commander o:/combat damage[^.]*commander/');

// ---------- Fästa och kontroll ----------
add('Fästa och kontroll', 'Equipment', or(ty(/Equipment/), kw('equip')), 'f:commander t:equipment');
add('Fästa och kontroll', 'Aura (alla)', isAura, 'f:commander t:aura');
add('Fästa och kontroll', 'Fästa utan equip/aura ("attach")', and(not(ty(/Equipment|Aura/)), re(/\battach(es)?\b/)), 'f:commander -t:equipment -t:aura o:/\\battach(es)?\\b/');
add('Fästa och kontroll', 'Fortification', ty(/Fortification/), 'f:commander t:fortification');
add('Fästa och kontroll', 'Reconfigure', kw('reconfigure'), 'f:commander kw:reconfigure');
add('Fästa och kontroll', 'Bestow', kw('bestow'), 'f:commander kw:bestow');
add('Fästa och kontroll', 'Role-tokens (auror som token)', re(/\brole tokens?\b/), 'f:commander fo:"role token"');
const HOSTILE = /enchanted (creature|permanent|artifact|land|planeswalker)(['’]s)? [^.\n]*?(can't attack|can't block|can't attack or block|doesn't untap|activated abilities can't|loses all|base power and toughness|is a [^.\n]* with base)|you control enchanted|gain control of enchanted|enchant [^\n]*an opponent controls|enchanted [a-z]+'s controller (loses|sacrifices)|enchanted creature gets -\d/;
add('Fästa och kontroll', 'Aura på motståndarens permanent (Pacifism, Control Magic)', and(isAura, re(HOSTILE)),
  'f:commander t:aura (o:/enchanted (creature|permanent)[^.]*(can\'t attack|can\'t block|doesn\'t untap|activated abilities can\'t|loses all|base power and toughness)/ or o:"you control enchanted" or o:"an opponent controls" or o:/enchanted creature gets -/)');
add('Fästa och kontroll', 'Curse / aura på spelare', and(isAura, re(/^enchant player|\nenchant player|enchant opponent/)), 'f:commander t:aura o:"enchant player"');

add('Fästa och kontroll', 'Kontrollbyte (alla slag)',
  or(re(/gain(s)? control of/), re(/exchange control/), re(/you control enchanted/), re(/under your control[^.\n]*(from|in) (a|an opponent's|any|each opponent's|target opponent's|their|that player's) graveyard|(from|in) (a|an opponent's|any|each opponent's|target opponent's|their|that player's|all) graveyards?[^.\n]*under your control/)),
  'f:commander (o:"gain control of" or o:"gains control of" or o:"exchange control" or o:"you control enchanted")');
add('Fästa och kontroll', '  tillfälligt ("until end of turn")', re(/gain control of[^.\n]*until end of turn|until end of turn, gain control/), 'f:commander o:/gain control of[^.]*until end of turn/');
add('Fästa och kontroll', '  permanent / "for as long as"',
  or(and(re(/gain control of/), x => x.t.split(/[.\n]/).some(s => /gain control of/.test(s) && !/until end of turn/.test(s))), re(/you control enchanted/)),
  'f:commander (o:/gain control of(?![^.]*until end of turn)/ or o:"you control enchanted")');
add('Fästa och kontroll', '  reanimation ur valfri/motståndarens graveyard',
  re(/(from|in) (a|an opponent's|any|each opponent's|target opponent's|their|that player's|all|opponents') graveyards?[^.\n]*(onto|to) the battlefield under your control|(card|cards) in (a|an opponent's|any) graveyard[^]*under your control|onto the battlefield under your control[^.\n]*from (a|an opponent's|any|all) graveyards?/),
  'f:commander (o:/(from|in) (a|an opponent\'s|any|each opponent\'s|target opponent\'s|all) graveyards?[^.]*onto the battlefield under your control/ or o:/card in a graveyard/ o:"under your control")');
add('Fästa och kontroll', '  Donate / exchange (ger bort egen permanent)',
  re(/exchange control|(target|that|an|each) (player|opponent) gains control of|gains control of (it|target permanent you control|that creature|CARDNAME)/),
  'f:commander (o:"exchange control" or o:/(target|that|an) (player|opponent) gains control of/)');
add('Fästa och kontroll', 'Spela/kasta kort som motståndare äger',
  re(/(you may|you can) (cast|play)[^.\n]*(spells?|cards?)[^.\n]*(exiled with|you don't own|an opponent owns|opponents own|they own|your opponents'? (graveyards?|libraries|exile))|cast[^.\n]*from (an opponent's|opponents') graveyard|(cast|play) (a|one of those|that) (card|spell)s?[^.\n]*(exiled with CARDNAME)|spells? you don't own|cards? you don't own|an opponent owns/),
  'f:commander (o:"you don\'t own" or o:"an opponent owns" or o:/cast[^.]*from (an opponent\'s|opponents\') graveyard/)');
add('Fästa och kontroll', 'Battle-kort', ty(/\bBattle\b/), 'f:commander t:battle');
add('Fästa och kontroll', 'Goad', or(kw('goad'), re(/\bgoad/)), 'f:commander o:goad');
add('Fästa och kontroll', 'Suspect', re(/\bsuspect(ed)?\b/), 'f:commander o:/\\bsuspect/');

// ---------- Zoner ----------
const PERM = '(creature|permanent|artifact|enchantment|planeswalker|land|token|battle|nonland|attacking|blocking)';
add('Zoner', 'Exile från bordet (removal)',
  x => x.t.split(/[.\n]/).some(s => new RegExp('\\bexiles? (target|all|each|up to|another|any number of|that|those|x target|two target|one target)\\b[^;]*\\b' + PERM + 's?\\b').test(s) && !/\bcards?\b(?! named)/.test(s) && !/\bspells?\b/.test(s) && !/(then return|return (it|that card|them|those cards))/.test(s)),
  'f:commander otag:removal-exile');
add('Zoner', 'Exile "until … leaves the battlefield"', re(/until [^.\n]*leaves the battlefield/), 'f:commander o:/until [^.]*leaves the battlefield/');
add('Zoner', 'Exile face down', re(/exile[^.\n]*face down|face-down[^.\n]*exiled|exiled face down|face down in exile/), 'f:commander (o:/exile[^.]*face down/ or o:"exiled face down" or o:"face down in exile")');
add('Zoner', 'Flicker / blink',
  x => /\bexile\b/.test(x.t) && /\breturn (it|that card|them|those cards|the exiled (card|cards|permanent|creature)s?|each card exiled this way|that creature|that permanent|CARDNAME|those permanents|the exiled permanents?)\b[^.\n]*to the battlefield/i.test(x.t) && !/until [^.\n]*leaves the battlefield/.test(x.t),
  'f:commander otag:flicker');

add('Zoner', 'Spela ur graveyard (flashback, escape, unearth …)',
  or(kw('flashback', 'escape', 'unearth', 'disturb', 'embalm', 'eternalize', 'jump-start', 'retrace', 'aftermath', 'encore', 'scavenge', 'harmonize', 'mayhem', 'blitz'), re(/(cast|play)[^.\n]*from your graveyard|from your graveyard[^.\n]*(cast|play)/)),
  'f:commander (kw:flashback or kw:escape or kw:unearth or kw:disturb or kw:embalm or kw:eternalize or kw:jump-start or kw:retrace or kw:aftermath or kw:encore or kw:scavenge or kw:harmonize or kw:mayhem or o:/(cast|play)[^.]*from your graveyard/)');
add('Zoner', '  varav nyckelord (flashback, escape …)', kw('flashback', 'escape', 'unearth', 'disturb', 'embalm', 'eternalize', 'jump-start', 'retrace', 'aftermath', 'encore', 'scavenge', 'harmonize', 'mayhem'),
  'f:commander (kw:flashback or kw:escape or kw:unearth or kw:disturb or kw:embalm or kw:eternalize or kw:jump-start or kw:retrace or kw:aftermath or kw:encore or kw:scavenge or kw:harmonize or kw:mayhem)');
add('Zoner', 'Reanimation ur egen graveyard (→ battlefield)',
  re(/(return|put)s? [^.\n]*cards?[^.\n]*from (your|a|any|target player's|their|an opponent's|all|each player's) graveyards?[^.\n]*(to|onto) the battlefield|(return|put)s? [^.\n]*(to|onto) the battlefield[^.\n]*from (your|a|any|their) graveyard|return CARDNAME from your graveyard to the battlefield/),
  'f:commander otag:reanimate');
add('Zoner', 'Regrowth (graveyard → hand)', re(/return[^.\n]*from (your|a) graveyard to (your|its owner's|their) hand|return[^.\n]*cards? from your graveyard to your hand|return CARDNAME from your graveyard to your hand/), 'f:commander o:/return[^.]*from your graveyard to your hand/');
add('Zoner', 'Spela ur exile (alla slag)',
  or(x => x.layout === 'adventure', kw('foretell', 'suspend', 'plot', 'discover', 'cascade', 'warp', 'airbend', 'rebound', 'hideaway', 'impending'),
     re(/exile[^.\n]*\.?[^.\n]*(you may (play|cast)|until [^.\n]*, you may (play|cast))|you may (play|cast)[^.\n]*(exiled (with|by)|cards? exiled|from exile|those cards this turn|that card this turn|them this turn)|cast [^.\n]*from exile|play lands and cast spells from among cards exiled/)),
  'f:commander (is:adventure or kw:foretell or kw:suspend or kw:plot or kw:discover or kw:cascade or kw:warp or kw:rebound or kw:hideaway or o:/exile[^.]*you may (play|cast)/ or o:/you may (play|cast)[^.]*(exiled|from exile)/)');
add('Zoner', '  impulse draw ("exile top … you may play")',
  re(/exile the top[^.\n]*card[^]{0,120}?you may (play|cast)|exile the top[^.\n]*card[^]{0,160}?until [^.\n]*(you may|you can) (play|cast)/),
  'f:commander o:/exile the top[^.]*card[^.]*\\.[^.]*you may (play|cast)/');
add('Zoner', '  adventure / foretell / suspend / plot / warp', or(x => x.layout === 'adventure', kw('foretell', 'suspend', 'plot', 'warp')), 'f:commander (is:adventure or kw:foretell or kw:suspend or kw:plot or kw:warp)');
add('Zoner', 'Discard', re(/\bdiscards?\b/), 'f:commander o:discard');
add('Zoner', 'Räknar kort i graveyard (delve, threshold, descend …)',
  or(kw('delve', 'threshold', 'delirium', 'descend', 'fathomless descent', 'undergrowth', 'escape'),
     re(/(number of|for each|seven or more|four or more|eight or more|ten or more|card types among|twenty or more|equal to the number)[^.\n]*cards? in [^.\n]*graveyards?|descend \d/)),
  'f:commander (kw:delve or kw:threshold or kw:delirium or kw:descend or o:/(number of|for each|seven or more|card types among)[^.]*cards? in [^.]*graveyards?/)');
add('Zoner', 'Commander-zonen: partner / background / companion',
  or(kw('partner', 'partner with', 'friends forever', 'choose a background', 'companion', "doctor's companion"), ty(/Background/)),
  'f:commander (kw:partner or kw:"partner with" or kw:"friends forever" or kw:"choose a background" or kw:companion or t:background or kw:"doctor\'s companion")');
add('Zoner', '"commander" i regeltexten', re(/\bcommanders?\b/), 'f:commander o:/\\bcommanders?\\b/');
add('Zoner', 'Sideboard / utanför spelet (learn, lesson, wish)', or(re(/\blearn\b|outside the game/), ty(/Lesson/)), 'f:commander (o:learn or o:"outside the game" or t:lesson)');

// ---------- Kortformer ----------
for (const [n, f, q] of [
  ['Layout transform (dubbelsidigt)', x => x.layout === 'transform', 'is:transform'],
  ['Layout modal_dfc', x => x.layout === 'modal_dfc', 'is:mdfc'],
  ['Layout meld', x => x.layout === 'meld', 'is:meld'],
  ['Layout split (inkl. room)', x => x.layout === 'split', 'is:split'],
  ['Layout adventure', x => x.layout === 'adventure', 'is:adventure'],
  ['Layout flip', x => x.layout === 'flip', 'is:flip'],
  ['Saga', x => /Saga/.test(x.type), 't:saga'],
  ['Class', x => /\bClass\b/.test(x.type), 't:class'],
  ['Case', x => /\bCase\b/.test(x.type), 't:case'],
  ['Room', x => /\bRoom\b/.test(x.type), 't:room'],
  ['Prototype', x => x.layout === 'prototype' || x.kws.has('prototype'), 'kw:prototype'],
  ['Battle (layout)', x => /\bBattle\b/.test(x.type), 't:battle'],
  ['Dubbelsidiga alls (transform+mdfc+meld+battle)', x => ['transform', 'modal_dfc', 'meld', 'reversible_card'].includes(x.layout) || /\bBattle\b/.test(x.type), '(is:dfc or is:meld or t:battle)'],
]) add('Kortformer', n, f, 'f:commander ' + q);
add('Kortformer', 'Nedvänt: morph/megamorph/disguise/manifest/cloak',
  or(kw('morph', 'megamorph', 'disguise', 'manifest', 'manifest dread', 'cloak'), re(/\bmanifest\b|\bcloak\b|turn[^.\n]*face down|face-down (creature|permanent|spell)/)),
  'f:commander (kw:morph or kw:megamorph or kw:disguise or kw:manifest or kw:"manifest dread" or kw:cloak or o:/face.down (creature|permanent)/)');
add('Kortformer', 'Phasing', or(kw('phasing'), re(/\bphases? (out|in)\b|\bphasing\b/)), 'f:commander (o:phase or kw:phasing)');
add('Kortformer', 'Mutate', kw('mutate'), 'f:commander kw:mutate');
add('Kortformer', 'Vehicles / crew', or(ty(/Vehicle/), kw('crew')), 'f:commander (t:vehicle or kw:crew)');
add('Kortformer', 'Spacecraft / station', or(ty(/Spacecraft/), kw('station')), 'f:commander (t:spacecraft or kw:station)');
add('Kortformer', '"doesn\'t untap during … untap step"', re(/(doesn't|don't) untap during/), 'f:commander o:/(doesn\'t|don\'t) untap during/');

// ---------- Kör ----------
const res = M.map(m => {
  const hits = cards.filter(x => { try { return m.f(x); } catch (e) { console.error(m.namn, e); return false; } });
  const ranks = hits.map(x => x.c.edhrec_rank);
  return { grupp: m.grupp, namn: m.namn, q: m.q, n: hits.length,
    top100: hits.filter(x => cards.indexOf(x) < 100).length,
    top500: hits.filter(x => cards.indexOf(x) < 500).length,
    ex: hits.slice(0, 12).map(x => x.c.name) };
});
fs.writeFileSync('res.json', JSON.stringify(res, null, 1));
for (const r of res) console.log(`${r.grupp} | ${r.namn} | ${r.n} (t100 ${r.top100}, t500 ${r.top500}) | ${r.ex.join('; ')}`);

// Skriver mekaniker-frekvens.md ur fraga-res.json + manuella anteckningar.
const fs = require('fs');
const Q = require('./fragor.js');
const R = require('./fraga-res.json');

const id = {}; Q.forEach(([, n], i) => { id[n] = 'S' + (i + 1); });
const grupper = { T: 'Tokens och spelnivå', C: 'Räknare på permanents', P: 'Räknare på spelare', A: 'Fästa kort', K: 'Kontroll och ägande', Z: 'Zoner', F: 'Kortformer' };

const not = {
  'Skapar tokens (alla slag)': '5 i topp 100 — och 4 av dem (Beast Within, An Offer You Can\'t Refuse, Generous Gift, Swan Song) ger token till **motståndaren**. Enligt `all_parts` förekommer ~86 token-slag (namn+typ) i topp 2 000: 76 creature-tokens och 10 andra, där Treasure och "Copy" (token-kopior) dominerar, följda av Food, Clue, Map, Gold, Lander och Role.',
  'Token ges till annan spelare': 'Manuellt granskade: alla 21 kan ge token till en annan spelare. Prismari Command ("target player") ges oftast till en själv.',
  'Fördefinierade tokens (nämner någon av nedan)': 'Treasure står för 66 av 78.',
  'Räknare på permanents (alla slag)': 'Utöver typerna nedan finns ~20 namngivna räknare med 1–2 kort var i topp 2 000: quest, burden (The One Ring), luck, void (Dauthi Voidwalker, **på kort i exile**), wish, fellowship, hour, descent, vow, gold, growth, influence, foreshadow, ice (Dark Depths), nest, chorus, bore, night.',
  '  Keyword counters (flying, lifelink …)': 'Främst de fem Dominus-korten (Mondrak, Solphim …): indestructible counter.',
  'Aura (alla)': '23 av 32 läggs på egna permanents (Wild Growth, Utopia Sprawl, Rancor, Curiosity, umbras). 7 läggs på motståndarens creature/permanent, 1 på en spelare (Curse of Opulence) och Animate Dead på en creature ur valfri graveyard.',
  '  Aura på motståndarens creature (Pacifism, Control Magic …)': '**Manuellt granskat: 7** — Darksteel Mutation, Kenrith\'s Transformation, Imprisoned in the Moon, Amphibian Downpour, Witness Protection, Song of the Dryads, Shiny Impetus. Frågan ger 6, varav 1 fel (Sheltered by Ghosts). 6 av de 7 **gör om** varelsen (Insect 0/1, Elk 3/3, Frog 1/1, Forest, "Legitimate Businessperson"). Pacifism (#5234) och Control Magic ligger utanför topp 2 000.',
  'Kontrollbyte (alla slag)': 'Manuellt uppdelat: 11 reanimerar ur valfri graveyard (Reanimate, Animate Dead, Necromancy, Ancient Brass Dragon …), 5 stjäl permanents (Hellkite Tyrant, Archmage\'s Charm, Treasure Nabber, Seize the Spotlight, Insurrection), 5 ger bort/skickar runt (Wishclaw Talisman, Coveted Jewel, Humble Defector, Alexios — byter kontrollant **varje upkeep**, Homeward Path tar tillbaka), 2 övrigt (Emrakul: styr en spelare; Commandeer: stjäl en spell).',
  '  Tillfälligt ("… until end of turn", Threaten)': 'Threaten/Act of Treason ligger utanför topp 2 000. Treasure Nabber ("until the end of your next turn") räknas här inte.',
  'Reanimation (graveyard → battlefield)': 'Frågan missar Ancient Brass Dragon ("from graveyards" utan artikel), så det rätta talet är 45.',
  '  Reanimation ur valfri/motståndares graveyard': 'Manuellt: 11. Frågan missar Ancient Brass Dragon.',
  'Spelar kort som motståndaren äger': 'Ägare ≠ kontrollant uppstår också här: kortet går tillbaka till **ägarens** graveyard.',
  'Exile av permanents (removal)': 'Swords to Plowshares (#11) och Path to Exile (#15) är två av de mest spelade korten över huvud taget.',
  '  "… until ~ leaves the battlefield" (O-Ring)': 'Banishing Light (#2376) och Oblivion Ring (#5054) ligger precis utanför topp 2 000.',
  'Discard': 'Inkluderar channel-länderna (Boseiju, Otawara) som kastas ur handen som kostnad. Zonflytten hand → graveyard.',
  'Dubbelsidiga (transform, mdfc, meld, battle)': '38 av 50 är MDFC: 25 "spell // land" (Malakir Rebirth // Malakir Mire, som ofta spelas med **baksidan** upp) och 10 Pathway-länder (land // land). Spelaren väljer sida när kortet spelas.',
  '"commander" i regeltexten': 'Command Tower, Arcane Signet (färgidentitet), Deadly Rollick och Fierce Guardianship ("if you control a commander") — appen behöver veta vilket kort som är commander. 6 i topp 100.',
  'Commander-zonen: partner / background / companion': 'Partner/background = två commanders → två separata commander damage-räkningar.',
  'Kopia av annat kort (Clone, "as a copy of")': 'Spark Double, Phyrexian Metamorph, Sculpting Steel — och länder som Thespian\'s Stage/Vesuva. Kortet som syns ≠ kortet det är.',
  'Nedvänt på bordet: morph/megamorph/disguise/manifest/cloak': 'Reality Shift (#283) manifesterar åt **motståndaren**.',
  'Phasing': 'Teferi\'s Protection (#109) fasar ut **alla** ens permanents.',
  '  Commander damage (nämns i texten)': 'Regeln (21 combat damage från samma commander) gäller alla partier men nämns nästan aldrig i korttext.',
  'Spelnivå-markör (någon av: emblem, monarch, initiative, dungeon, day/night, Ring, blessing, speed)': 'Emblem 5, ascend 4, Ring 3, monarch 1, speed 1.',
};

const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
function exempel(r) {
  const ut = r.hits.slice(0, 3).map(h => `${h.n} (#${h.r})`);
  for (const e of r.ex0) { if (ut.length >= 3) break; const namn = e.replace(/ \(\d+\)$/, ''); if (!r.hits.some(h => h.n === namn)) ut.push(e.replace(/\((\d+)\)$/, '(#$1)')); }
  return ut.join('; ') || '—';
}
const esc = s => s.replace(/\|/g, '\\|');

let md = '';
md += `# Mekaniker i Commander — hur vanliga är de?\n\n`;
md += `Mätt 2026-09-27 mot Scryfall. Library-effekter (scry, mill, tutor, shuffle) ingår inte — de utreds separat.\n\n`;

md += `## Det viktigaste\n\n`;
md += `- **Tokens är den största luckan.** 262 av topp 2 000 (13 %) skapar tokens. I topp 100 finns 5 — och 4 av dem (Beast Within, An Offer You Can't Refuse, Generous Gift, Swan Song) ger token till **en annan spelare**. Treasure ensam: 66 kort.\n`;
md += `- **Räknare nästan lika vanliga:** 228 (11 %), varav +1/+1 144. Övriga räknartyper har var för sig ≤ 20 kort, men ~20 olika namngivna räknare förekommer — räknare behöver fritt namn, inte en fast lista.\n`;
md += `- **Zoner bortom hand/bord/graveyard:** reanimation 44, spela ur exile 44, spela ur graveyard 35, regrowth 26, flicker 21.\n`;
md += `- **Kort som korsar spelargränsen:** 57 kort (2,9 %). 28 byter kontrollant eller låter en spela motståndarens kort, 21 ger token till en annan spelare och 8 är auror som läggs på motståndarens creature eller på en spelare.\n`;
md += `- **Kortformer:** 50 dubbelsidiga (38 MDFC, oftast spelade med landet uppåt), 17 kloner. Nedvänt på bordet bara 2.\n`;
md += `- **Nästan frånvarande i topp 2 000 (0 kort):** initiative, dungeon, day/night, meld, flip, prototype, mutate, fortification, suspect, shield/oil/rad-räknare, Blood/Powerstone/Incubator. Monarch och battle: 1 kort var.\n\n`;

md += `## Metod\n\n`;
md += `| Steg | Vad |\n|---|---|\n`;
md += `| Urval | \`f:commander\` sorterat \`order=edhrec\`. Topp 2 000 = de 2 000 Commander-lagliga korten med \`edhrec_rank ≤ 2011\` (11 rankplatser tas av bannade kort, t.ex. Dockside Extortionist). Alla Commander-lagliga kort: **32 116**. |\n`;
md += `| Mått | Varje mekanik är **en** Scryfall-fråga (lista S1–S${Q.length} längst ned). Samma fråga ger både *totalt* (\`total_cards\`) och *topp 2 000* (sidor i EDHREC-ordning tills rank > 2011). Båda talen har alltså exakt samma definition. |\n`;
md += `| Syntax | \`o:\` = regeltext utan påminnelsetext, \`fo:\` = med påminnelsetext, \`kw:\` = nyckelord, \`t:\` = typrad, \`is:\` = layout. |\n`;
md += `| Kontroll | En oberoende lokal regex-klassning av de 2 000 nedladdade korten (\`oracle_text\` + \`card_faces\`, \`keywords\`, \`layout\`, \`all_parts\`) gav samma tal ±6 för tokens (256 mot 262), räknare (224 mot 228), +1/+1 (145 mot 144), equipment (57 = 57) och aura (32 = 32). Discard (126 mot 85) och "commander" i texten (31 mot 23) skiljer sig, eftersom den lokala räkningen tog med påminnelsetext (t.ex. cycling: "Discard this card"). Det gör frågorna medvetet inte. Listorna för auror, kontrollbyte, token till annan spelare, O-Ring, exile-removal och flicker är granskade kort för kort; rättelser står i kolumnen *Not*. |\n`;
md += `| Topp 100 / 500 | Kort med EDHREC-rank ≤ 100 resp. ≤ 500. Visar om mekaniken finns på de riktiga staplarna — ett topp 100-kort ligger i en stor andel av alla lekar. |\n\n`;
md += `**Vad måttet inte säger:** det räknar *olika kort*, inte hur ofta de spelas. En mekanik med få kort i topp 2 000 (t.ex. initiative) kan ändå dominera ett parti om en lek är byggd kring den. EDHREC-ranken ändras över tid: Banishing Light (#2376), Clone (#3717), Oblivion Ring (#5054) och Pacifism (#5234) ligger i dag utanför topp 2 000.\n\n`;

// (a) sorterad kompakt tabell
md += `## Alla mekaniker, sorterade efter topp 2 000\n\n`;
md += `| # | Mekanik | Topp 2 000 | Andel | Topp 100 | Topp 500 | Totalt | Sök |\n|---:|---|---:|---:|---:|---:|---:|---|\n`;
for (const r of Object.values(R)) { r.t100 = r.hits.filter(h => h.r <= 100).length; r.t500 = r.hits.filter(h => h.r <= 500).length; }
const sorterade = Object.values(R).sort((a, b) => b.n - a.n || b.total - a.total);
sorterade.forEach((r, i) => {
  md += `| ${i + 1} | ${esc(r.namn.trim())} | ${r.n} | ${(r.n / 20).toFixed(1).replace('.', ',')} % | ${r.t100} | ${r.t500} | ${fmt(r.total)} | ${id[r.namn]} |\n`;
});
md += `\nIndragna rader i tabellerna nedan är delmängder av raden ovanför.\n\n`;

// per grupp
for (const [g, rubrik] of Object.entries(grupper)) {
  md += `## ${rubrik}\n\n`;
  md += `| Mekanik | Topp 2 000 | Topp 100 / 500 | Totalt | Sök | Exempel (mest spelade först; #EDHREC-rank, över 2011 = utanför topp 2 000) | Not |\n|---|---:|---:|---:|---|---|---|\n`;
  for (const [gg, namn] of Q) {
    if (gg !== g) continue;
    const r = R[namn];
    const indrag = namn.match(/^ */)[0].length;
    const visning = (indrag ? '↳ '.padStart(indrag + 2, ' ').replace(/ /g, '&nbsp;') : '') + namn.trim();
    md += `| ${esc(visning)} | ${r.n} | ${r.t100} / ${r.t500} | ${fmt(r.total)} | ${id[namn]} | ${esc(exempel(r))} | ${esc(not[namn] || '')} |\n`;
  }
  md += `\n`;
}

md += fs.readFileSync('slut.md', 'utf8');

md += `\n## Sökfrågorna (exakta, kopierbara)\n\n`;
md += `Klistra in i scryfall.com eller \`https://api.scryfall.com/cards/search?order=edhrec&q=…\`. Alla börjar med \`f:commander\`.\n\n\`\`\`\n`;
Q.forEach(([, namn, expr], i) => { md += `S${i + 1}  ${namn.trim()}\n     f:commander ${expr}\n`; });
md += `\`\`\`\n\n`;
md += `Rådata och skript: \`sf/\` bredvid den här filen (\`top2000.json\`, \`fraga-res.json\` med alla träfflistor, \`fragor.js\`, \`hamta.js\`, \`klassa.js\`).\n`;

fs.writeFileSync('../mekaniker-frekvens.md', md);
console.log('skrivet', md.length, 'tecken');

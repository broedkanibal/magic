# Library-effekter i Magic: katalog för Mesas digitala spelare

Research 2026-09-27 · källa: Scryfall API (kortdata per 2026-09-27) · syfte: välja vilka library-operationer appen måste ha i private beta för en spelare vars lek bara finns i appen.

## Kort version

- **4 381 av 32 381 kort (13,5 %)** gör något med en lek utöver att dra kort. Ytterligare 3 304 kort drar kort (referens).
- **Sök i leken är störst, inte scry.** 1 167 kort söker, och bland de library-kort som hör till Commanders 1 000 mest spelade är det hälften (85 av 171). Mest är det ramp och fetch.
- **Sex grundoperationer (G1–G6) täcker ungefär 80 %** av library-korten, 79 % av dem i EDHREC topp-5000 och 86 % av topp-1000.
- **Beta-förslaget (G1–G10) täcker ungefär 95 %**, 96 % av topp-5000 och 98 % av topp-1000.
- Det som blir kvar är nästan bara **effekter på en annan spelares lek** (Ragavan, Etali, Opposition Agent, Gonti, Bribery). De är svåra i Mesa, eftersom den dolda informationen ska till någon annan än ägaren.
- Siffrorna är regex-räkningar. Kategorierna överlappar och räkningarna är ungefärliga, så räkna med ±5 procentenheter.

## Grundoperationerna

| # | Grundoperation | Vad den gör i appen | Kort som behöver den: alla / topp‑5000 / topp‑1000 | Beta |
|---|---|---|---:|---|
| G1 | **Dra** | översta → hand, och logga "dragen denna tur" | (3 304 kort drar, referens) | **Måste** |
| G2 | **Topp-N-dialog, privat** | visa översta N bara för ägaren. Varje kort dras till hand / överst i vald ordning / underst / graveyard / exile / battlefield. Förinställningar för scry, surveil och Ponder | 1 192 / 169 / 38 | **Måste** |
| G3 | **Topp-N-dialog, offentlig** | samma dialog, men alla ser korten (reveal, explore, Dark Confidant) | 303 / 42 / 2 | **Måste** (samma komponent som G2) |
| G4 | **Sök i leken + blanda** | hela leken privat, med filter, flerval, destination per kort, "avslöja" och blandning | 1 167 (+54 bara blanda) / 317 (+8) / 85 (+2) | **Måste** |
| G5 | **Flytta översta N direkt** | mill → graveyard, exile face up, "halva leken" | 668 / 122 / 14 | **Måste** |
| G6 | **Lägg i leken på position** | från vilken zon som helst: överst / underst / N:te uppifrån / blanda in | 502 / 81 / 16 | **Måste** |
| G7 | **Exile med spelrätt** | exile översta N (face up eller down), och märk vem som får spela kortet och hur länge | 406 / 104 / 14 | **Bör** |
| G8 | **Avslöja tills** | "+1 kort" i G3 tills spelaren säger stopp, resten underst i slumpad ordning | 243 / 58 / 5 | **Bör** (billig med G3) |
| G9 | **Lekräknare** | antal kort i leken synligt för alla, varning vid tom lek | 21 / 6 / 2 | **Måste** (nästan gratis) |
| G10 | **Löpande toppläge** | en växel: översta kortet synligt för mig eller för alla, och spelbart därifrån | 66 / 25 / 4 | **Bör** (billig, vanlig i Commander) |
| G11 | Ansiktet nedåt från toppen | manifest, manifest dread, cloak | 72 / 6 / 1 | Vänta |
| G12 | Annan spelares lek | någon annan än ägaren tittar i, söker i, tar ur eller spelar ur leken | 157 / 30 / 3 | Vänta (svårast) |
| G13 | Understa kortet / slump | titta på eller dra understa kortet, slumpat kort ur leken | 6 / 1 / 0 | Vänta |

"Kort som behöver den" är de kort i korpusen som enligt den lokala klassningen kräver operationen. Ett kort kan kräva flera, så kolumnen summerar inte till 4 381. "Resten underst" inuti en dialog räknas inte som G6, och blandningen efter en sökning räknas inte som en egen blanda-knapp.

## Täckningsgrad

Ett kort räknas som täckt när alla operationer det kräver finns. Det betyder att spelaren kan utföra effekten i appen, inte att appen förstår kortet och gör det automatiskt.

| Operationer som finns | Alla library-kort (4 372) | EDHREC topp‑5000 (877) | EDHREC topp‑1000 (171) |
|---|---:|---:|---:|
| G1 + G2 (bara topp-N privat) | 23,8 % | 17,3 % | 19,9 % |
| G1 + G4 (bara sök) | 24,8 % | 35,7 % | 48,5 % |
| **G1–G6** | **80,5 %** | **78,7 %** | **86,0 %** |
| G1–G6 + G9 (måste-listan) | 81,0 % | 79,4 % | 87,1 % |
| + G7 impuls | 87,6 % | 86,4 % | 92,4 % |
| + G8 avslöja tills | 93,2 % | 92,9 % | 95,3 % |
| **+ G10 toppläge (= beta-förslaget)** | **94,6 %** | **95,8 %** | **97,7 %** |
| + G11 manifest | 96,3 % | 96,5 % | 98,2 % |
| + G12 annan spelares lek | 99,9 % | 99,9 % | 100 % |

4 372 är 4 381 minus 9 kort som inte klassades (sju ante-kort, Panglacial Wurm och Worldknit). 100 % är per definition andelen av de *klassade* korten, inte av alla kort som finns.

Väljer man operationerna girigt (den som täcker flest nya kort först) blir ordningen G4, G2, G5, G6, G3, G7, G8, G12 för alla kort, och G4, G2, G6, G5, G7, G8, G10, G12 för topp-1000. De fyra första är desamma oavsett urval: G4, G2 och sedan G5 och G6. Därefter skiljer det sig. För alla kort kommer G3 tidigt, men för Commander-korten kommer G7, G8 och G10 före G3. G3 kostar ändå nästan inget, eftersom den är samma dialog som G2.

## Private beta: vad som ska med och vad som kan vänta

### Måste: G1–G6 och G9

- **G4 Sök** är störst i Commander, med 85 av 171 kort i topp-1000. Mest är det ramp och fetch (Cultivate, Farseek, Evolving Wilds, Nature's Lore, Path to Exile för motståndaren). En Commander-lek utan sökning går inte att spela.
- **G2/G3 Topp-N-dialogen** gäller 1 192 + 303 kort, och bara scry och surveil är ungefär 690. En komponent med en flagga för synlighet och förinställningar räcker. Appen behöver inte förstå kortet, spelaren drar korten dit de ska, precis som vid ett fysiskt bord.
- **G5 Mill/exile** kräver ingen dialog och gäller 668 kort.
- **G6 Lägg i leken** gäller 502 kort, via kortets meny: Brainstorm, Sensei's Divining Top, Chaos Warp, Mystic Sanctuary, tuck-removal.
- **G9 Lekräknaren** är nästan gratis, och Thassa's Oracle är en av Commanders vanligaste vinstvägar.

### Bör med, eftersom de är billiga: G7, G8 och G10

- **G7 Impuls** gäller 406 kort, 104 av dem i topp-5000 (Jeska's Will, Light Up the Stage, Professional Face-Breaker, Laelia). Det är så röda lekar drar kort i Commander. Det kräver en exile-zon där kortet bär "spelbart av X till …". I beta räcker det att spelaren tar bort märkningen själv.
- **G8 Avslöja tills** blir, när G3 finns, en knapp "+1 kort" och "resten underst i slumpad ordning". Det gäller 243 kort, 58 i topp-5000 (cascade, discover, Demonic Consultation). Automatisk villkorskoll kan vänta.
- **G10 Toppläget** är en växel på leken. Det gäller 66 kort, men 25 av dem ligger i topp-5000 (Bolas's Citadel, Mystic Forge, Courser of Kruphix, Oracle of Mul Daya, Augur of Autumn). Utan växeln kan en digital spelare inte spela de korten alls, eftersom hen inte kan kika på en lek som inte finns fysiskt.

### Kan vänta: G11, G12, G13 och automatiken

- **G12 Annan spelares lek** gäller 157 kort, 30 i topp-5000. Av de 25 mest spelade korten som inte täcks efter beta är 23 G12: Etali, Ragavan, Opposition Agent, Mishra's Bauble, Grenzo, Praetor's Grasp, Gonti och fler. Det är svårast, eftersom dold information ska till fel person, kontrollanten inte är ägaren, och lekarna kan vara fysiska. Reserv i beta: ägaren gör operationen och visar skärmen, precis som när man räcker över sin lek vid ett fysiskt bord.
- **G11 Manifest/cloak** gäller 72 kort, 6 i topp-5000. Det kräver face-down 2/2 på bordet.
- **G13** gäller 6 kort.
- **Automatiken** kan vänta: villkoren i cascade och discover, livförlusten i Dark Confidant, dredge som ersätter en dragning, miracle-utlösningen, automatisk utgång för "spelbart till nästa tur" och högarna i Fact or Fiction. Allt det kan spelaren göra för hand i beta.

## Dolt eller offentligt: vad motståndaren ska se

Grundregeln (CR 401) är att leken är en dold hög med baksidan upp. Ingen får titta i den eller ändra ordningen om inte ett kort säger det, men alla får när som helst räkna hur många kort en lek har. Det spelaren *gör* är offentligt: att hen scry:ar 2, hur många kort som går underst, att hen söker och blandar. Det som är dolt är vilka kort det gäller.

| Operation | Ägaren ser | Motståndarna ser | Förslag i appen |
|---|---|---|---|
| Dra | kortet | antalet (handstorleken är offentlig) | logg: "drog 1" |
| Look at the top N, scry | korten | att det sker, N, och hur många som går överst, underst och till handen | dialogen bara på ägarens skärm; logg utan kortnamn |
| Surveil | korten | korten som går till graveyard, och antalet som ligger kvar överst | graveyard-korten syns direkt |
| Titta och "you may reveal" (Herald's Horn, Growing Rites) | korten | bara det avslöjade kortet | per kort: "visa för bordet" |
| Reveal the top N, explore, Dark Confidant, cascade | alla | alla | dialogen visas i bordsvyn |
| Mill, exile face up (impuls) | alla | alla | korten syns i graveyard eller exile |
| Exile face down (Necropotence, hideaway) | ägaren, om kortet tillåter det | att ett kort ligger där | kortets baksida |
| Search | hela leken medan sökningen pågår | att sökningen sker, hur många kort som tas och vart, kortet om det avslöjas eller hamnar på battlefield eller i graveyard, och blandningen | leken visas bara för ägaren; logg: "sökte, 1 till handen (dolt), blandade" |
| Tutor till toppen (Vampiric Tutor) | kortet | att ett känt kort ligger överst, men inte vilket (Enlightened, Mystical och Worldly Tutor avslöjar det) | toppkortet märks "känt av ägaren" |
| Shuffle | – | händelsen | logg; nollställer "kända kort" i leken |
| Från handen överst (Brainstorm) | korten | antalet | logg: "la 2 kort från handen överst" |
| Från en offentlig zon in i leken (tuck, Approach of the Second Sun) | kortet | kortet och platsen | märk "känt av alla, plats 7" tills leken blandas |
| Manifest, cloak | kontrollanten får titta | en face-down 2/2; kortet avslöjas när det lämnar battlefield | face-down-kort med en titta-knapp för kontrollanten |
| Play with the top card revealed (Courser of Kruphix) | alla, hela tiden | alla, hela tiden | toppkortet visas i bordsvyn |
| Look at the top card any time (Bolas's Citadel) | ägaren, hela tiden | nej, men ett kort som spelas därifrån blir offentligt | toppkortet visas bara hos ägaren |
| Lekens storlek | ja | ja, alltid | räknare i bordsvyn |
| Annan spelares lek (Gonti, Praetor's Grasp, fateseal) | **nej**: den som gör effekten ser korten, inte ägaren | den som gör effekten | rätt person måste ha en skärm (G12) |

Motståndaren ska alltså alltid se *att* något görs och hur många kort som flyttas vart, men aldrig vilka dolda kort det gäller. En händelselogg i bordsvyn löser det mesta, och den behövs ändå för att bordet ska kunna lita på en lek som ingen kan se.

Sökningarna är mindre dolda än man tror. Ungefär en tredjedel avslöjar det hittade kortet (391 kort), och 367 lägger det på battlefield. Bara runt 50 är helt dolda tutors till handen (Demonic Tutor) och runt 50 lägger kortet överst (Vampiric Tutor).

## Fällor och överraskningar

1. **Sök är störst, och sökdialogen är den svåraste av de enkla.** Den behöver filter på typ och subtyp ("basic Forest"), flerval, *olika destination per kort* (Cultivate: ett till battlefield tapped, ett till handen), "fail to find" (reglerna låter en spelare låta bli att hitta kort med en angiven egenskap) och **blandning i rätt ordning**. Vampiric Tutor blandar först och lägger sedan kortet överst, och Long-Term Plans lägger det tredje uppifrån efter blandningen. Blandar appen sist förstörs effekten.
2. **Ordet "library" fångar bara 64 % av korten.** `o:library` ger 2 802 kort, men mill, scry, surveil, explore, cascade, discover och manifest nämner inte leken i oracle-texten, så korpusen är 4 381. 62 kort når dessutom leken bara via påminnelsetext eller tokens: partner with (söker partnern), Lander-token (söker basic land), Junk-token (impuls), "spells you cast have cascade". Ska appen någon gång föreslå åtgärder utifrån korttexten måste den gå på keywords och påminnelsetext, inte på ordet "library".
3. **Effekter över spelargränsen.** 266 kort får en annan spelare att mill:a, och 157 låter någon annan än ägaren titta i, söka i eller spela ur en lek. Efter beta är det nästan allt som saknas bland de populära Commander-korten. I Mesa krockar det med blandningen av fysiska och digitala lekar (se nästa avsnitt).
4. **Slumpad ordning är vanligare än valfri.** 188 kort lägger resten underst i *slumpad* ordning, mot 112 i valfri ordning. Appen måste slumpa själv, spelaren får inte välja.
5. **Titta och sedan kanske avslöja** gäller 181 kort. Synligheten måste sättas per kort, inte per dialog.
6. **Kända kort i leken.** Tuck och Approach of the Second Sun gör att bordet vet var ett kort ligger. Blandar appen utan att kortet säger det, till exempel automatiskt efter varje dialog, förstörs information som spelarna har rätt till. Blanda bara när kortet säger det.
7. **Tokens gör också library-operationer.** Lander (sök), Junk (impuls), Map (explore) och Clue (dra) räknas inte som kort i Scryfall, men de använder samma primitiver.

## Mesa: fysiska och digitala lekar vid samma bord

| Situation | Exempel | Vad som behövs |
|---|---|---|
| Den digitala spelarens kort påverkar en fysisk lek | Brain Freeze, Syr Konrad, Ruin Crab (mill); Ragavan, Grenzo (exile och spela) | Appen kan inte röra den fysiska leken, så den visar en uppmaning till den spelaren. Ragavan-typen kräver att den digitala spelaren kan *kontrollera* ett fysiskt kort. Hur det ska visas är en designfråga. |
| En fysisk spelares kort påverkar den digitala leken | en fysisk Ragavan, Gonti, Praetor's Grasp, Bribery, mill | Den digitala leken måste gå att manövrera på en annan spelares begäran, och dold information (Gonti, Praetor's Grasp) ska till den spelaren, inte till ägaren. Den fysiska spelaren har kanske ingen skärm. |
| "Each player" | Etali, Primal Storm; Breach the Multiverse; Timetwister-varianter; Consuming Aberration | Samma operation på den digitala leken, plus en uppmaning till de fysiska spelarna. |
| Ägaren är inte kontrollanten | Bribery, Chaos Warp på ett stulet kort, "its owner's library" | Den digitala lekens kort kan hamna hos en fysisk spelare och ska tillbaka till *ägarens* lek eller graveyard. Ett fysiskt kort som den digitala spelaren kontrollerar ska till den fysiska leken. |

Mill på andra spelare är ingen svår operation för den digitala leken (G5), men den *startas* av någon annan. Den digitala lekens knappar behöver därför gå att använda "på grund av motståndarens kort", och det ska synas i loggen.

## Katalog per kategori

Varje tabell visar Scryfalls `total_cards` för en exakt sökfråga, den lokala klassningens antal (alla / EDHREC topp‑5000 / topp‑1000, bara inom korpusen) och de mest spelade korten enligt `order=edhrec`. De exakta frågorna ligger i den fällbara rutan under varje tabell. Kategorierna överlappar: ett kort som både scry:ar och söker räknas i båda.

### 1. Dra kort (referens)

**Grundoperation:** G1

| Delkategori | Scryfall total_cards | Lokalt: alla / topp‑5000 / topp‑1000 | Mest spelade (order=edhrec) |
|---|---:|---:|---|
| Dra kort (alla ordalydelser) | 3 304 | – | Mind Stone · Solemn Simulacrum · Skullclamp · Rhystic Study |
| "Drawn this turn" (Sylvan Library) | 17 | 5 / 2 / 1 | Sylvan Library · Proft's Eidetic Memory · Fists of Flame · Heliod, the Radiant Dawn // Heliod, the Warped Eclipse |
| Miracle (avslöja när kortet dras) | 17 | 17 / 6 / 0 | Reforge the Soul · Temporal Mastery · Metamorphosis Fanatic · Redress Fate |
| Dredge (ersätter en dragning med mill) | 14 | 14 / 5 / 1 | Life from the Loam · Dakmor Salvage · Golgari Grave-Troll · Stinkweed Imp |

<details><summary>Exakta sökfrågor</summary>

```
draw                3304  (o:"draw a card" or o:/draws? \w+ cards/ or o:"draw cards") game:paper -is:funny
dragna                17  o:"drawn this turn" game:paper -is:funny
miracle               17  keyword:miracle game:paper -is:funny
dredge                14  keyword:dredge game:paper -is:funny
```

</details>

**UI-primitiv:** G1 **Dra N** (översta → hand). Appen bör logga vilka kort som dragits denna tur (Sylvan Library, miracle, "third card you drew"). Dredge och miracle är ersättnings-/utlösningsregler kring dragningen och kan vänta; spelaren gör dem manuellt med G5.

### 2. Titta på översta N privat (look at the top N)

**Grundoperation:** G2

| Delkategori | Scryfall total_cards | Lokalt: alla / topp‑5000 / topp‑1000 | Mest spelade (order=edhrec) |
|---|---:|---:|---|
| Look at the top N kort (N ≥ 2 eller X) | 408 | 407 / 60 / 8 | Ponder · Sensei's Divining Top · Thassa's Oracle · Growing Rites of Itlimoc // Itlimoc, Cradle of the Sun |
| Look at the top card (engångs) | 86 | 88 / 11 / 1 | Herald's Horn · Mishra's Bauble · Risen Reef · Explorer's Scope |
| … resten underst (valfri eller slumpad ordning) | 271 | – | Thassa's Oracle · Growing Rites of Itlimoc // Itlimoc, Cradle of the Sun · Dig Through Time · Loot, Exuberant Explorer |
| … resten underst i **slumpad** ordning | 188 | – | Thassa's Oracle · Loot, Exuberant Explorer · Narset, Parter of Veils · Wandering Archaic // Explore the Vastlands |
| … underst i **valfri** ordning (alla källor) | 112 | – | Growing Rites of Itlimoc // Itlimoc, Cradle of the Sun · Dig Through Time · Stock Up · Experimental Augury |
| … ett eller flera till handen | 293 | – | Herald's Horn · Growing Rites of Itlimoc // Itlimoc, Cradle of the Sun · Dig Through Time · Expressive Iteration |
| … "you may reveal" (privat → valfritt offentligt) | 181 | – | Herald's Horn · Growing Rites of Itlimoc // Itlimoc, Cradle of the Sun · Loot, Exuberant Explorer · Narset, Parter of Veils |
| "In any order" (ordna om: Sensei's Top, Brainstorm) | 172 | 28 / 7 / 1 | Brainstorm · Ponder · Sensei's Divining Top · Growing Rites of Itlimoc // Itlimoc, Cradle of the Sun |

<details><summary>Exakta sökfrågor</summary>

```
titta_n              408  (o:/looks? at the top \w+ cards/ or o:/looks? at [^.]{0,40}cards? from the top of/) game:paper -is:funny
titta_1               86  o:/looks? at the top card of/ -o:"any time" game:paper -is:funny
titta_rest_botten    271  o:/looks? at the top/ o:/(rest|other|others|remaining cards?) [^.]{0,30}bottom/ game:paper -is:funny
titta_slump          188  o:/looks? at the top/ o:"random order" game:paper -is:funny
botten_valfri        112  o:/bottom of [^.]*librar(y|ies) in any order/ game:paper -is:funny
titta_hand           293  o:/looks? at the top/ o:/(put|reveal) [^.]*into your hand/ game:paper -is:funny
titta_reveal         181  o:/looks? at the top/ o:/you may reveal/ game:paper -is:funny
ordna                172  o:/in any order/ o:/librar(y|ies)/ game:paper -is:funny
```

</details>

**UI-primitiv:** G2 **Topp-N-dialogen, privat**: visa översta N bara för ägaren; varje kort dras till hand / överst (spelaren väljer ordning) / underst (valfri eller slumpad ordning enligt kortet) / graveyard / exile / battlefield. Knapp "avslöja det här kortet" per kort. Förinställningar: Scry N, Surveil N, Ponder ("blanda?"), Impulse (1 till hand, resten underst), "upp till 1 till hand, resten underst i slumpad ordning".

### 3. Scry, Surveil, Fateseal, Clash

**Grundoperation:** G2/G3

| Delkategori | Scryfall total_cards | Lokalt: alla / topp‑5000 / topp‑1000 | Mest spelade (order=edhrec) |
|---|---:|---:|---|
| Scry | 430 | 433 / 62 / 17 | Path of Ancestry · Preordain · Opt · Viscera Seer |
| Surveil | 256 | 258 / 34 / 11 | Consider · Undercity Sewers · Underground Mortuary · Hedge Maze |
| Fateseal (scry på motståndarens lek) | 2 | 2 / 0 / 0 | Mesmeric Sliver · Spin into Myth |
| Clash (båda avslöjar översta, väljer överst/underst) | 29 | 29 / 0 / 0 | Marvo, Deep Operative · Hoarder's Greed · Research the Deep · Revive the Fallen |

<details><summary>Exakta sökfrågor</summary>

```
scry                 430  keyword:scry game:paper -is:funny
surveil              256  keyword:surveil game:paper -is:funny
fateseal               2  keyword:fateseal game:paper -is:funny
clash                 29  keyword:clash game:paper -is:funny
```

</details>

**UI-primitiv:** Förinställningar av Topp-N-dialogen: **Scry** = {överst i valfri ordning, underst}; **Surveil** = {överst i valfri ordning, graveyard}; **Fateseal** = scry på en annan spelares lek (G12); **Clash** = avslöja 1 från två lekar, var och en väljer överst/underst (G3 + G12). Fateseal och clash är så sällsynta (2 resp. 29 kort, 0 i topp-5000) att de kan vänta.

### 4. Mill (översta N till graveyard)

**Grundoperation:** G5

| Delkategori | Scryfall total_cards | Lokalt: alla / topp‑5000 / topp‑1000 | Mest spelade (order=edhrec) |
|---|---:|---:|---|
| Mill (alla) | 586 | 586 / 114 / 14 | Takenuma, Abandoned Mire · Syr Konrad, the Grim · Ripples of Undeath · Six |
| … bara egen lek | 343 | 320 / 60 / 8 | Takenuma, Abandoned Mire · Ripples of Undeath · Six · Tibalt's Trickery |
| … annan/alla spelare (target player, each opponent) | 256 | 266 / 54 / 6 | Syr Konrad, the Grim · Altar of Dementia · Brain Freeze · Breach the Multiverse |
| Halva leken (Traumatize, Maddening Cacophony) | 10 | 19 / 8 / 0 | Ulamog, the Defiler · Maddening Cacophony · Jidoor, Aristocratic Capital // Overture · Singularity Rupture |
| Utlöses av kort som lämnar leken ("from your library") | 15 | 32 / 5 / 0 | Hedge Shredder · Laelia, the Blade Reforged · Colossal Grave-Reaver · Sidisi, Brood Tyrant |

<details><summary>Exakta sökfrågor</summary>

```
mill                 586  keyword:mill game:paper -is:funny
mill_egen            343  keyword:mill -o:/(player|opponent)s? mills?/ game:paper -is:funny
mill_annan           256  o:/(target|each|that|defending|chosen) (player|opponent)s? ([^.]{0,30} )?mills?\b|\b(opponents?|players?) mills?\b/ game:paper -is:funny
mill_halva            10  o:/mills? half|top half of/ game:paper -is:funny
fran_lek              15  o:/(graveyard|exile) from (your|a|their) librar|from your library and\/or/ game:paper -is:funny
```

</details>

**UI-primitiv:** G5 **Flytta översta N direkt** → graveyard, med N som tal, X eller "halva (avrunda upp/ned)". Ingen dialog behövs, men appen ska sända en händelse "kort X gick från lek till graveyard" (Sidisi, Hedge Shredder och liknande reagerar på det). Lokalt räknas "halva/hela leken" bredare (även exile av hela leken).

### 5. Avslöja översta N offentligt (reveal) och välj

**Grundoperation:** G3

| Delkategori | Scryfall total_cards | Lokalt: alla / topp‑5000 / topp‑1000 | Mest spelade (order=edhrec) |
|---|---:|---:|---|
| Reveal the top N kort | 103 | 113 / 18 / 1 | Fact or Fiction · Genesis Wave · Grisly Salvage · Shigeki, Jukai Visionary |
| Reveal the top card | 108 | 108 / 17 / 1 | Chaos Warp · Twilight Prophet · Dark Confidant · Ad Nauseam |
| Motståndaren delar i högar (Fact or Fiction) | 11 | – | Fact or Fiction · Jace, Architect of Thought · Sphinx of Uthuun · Unesh, Criosphinx Sovereign |
| Explore | 54 | 54 / 7 / 0 | Get Lost · Worldwalker Helm · Path of Discovery · Hakbal of the Surging Soul |
| Översta kortet direkt till battlefield | 1 | 0 / 0 / 0 | Cybership |

<details><summary>Exakta sökfrågor</summary>

```
avsloja_n            103  (o:/reveals? the top \w+ (\w+ )?cards/ or o:/reveals? [^.]{0,40}cards? from the top of/) -o:until game:paper -is:funny
avsloja_1            108  o:/reveals? the top card of/ game:paper -is:funny
avsloja_pilar         11  o:/separate[^.]*piles/ o:/top/ game:paper -is:funny
explore               54  keyword:explore game:paper -is:funny
topp_till_bf           1  o:/put the top (card|\w+ cards?) of [^.]*librar(y|ies) onto the battlefield/ game:paper -is:funny
```

</details>

**UI-primitiv:** G3 **Topp-N-dialogen, offentlig**: samma komponent som G2 men alla vid bordet ser korten. Dark Confidant och Ad Nauseam behöver kortets mana value (appen har det). Fact or Fiction kräver att *motståndaren* delar högarna, vilket är samma problem som G12; beta: ägaren gör det muntligt.

### 6. Avslöja tills något kommer (cascade, discover, "until")

**Grundoperation:** G8

| Delkategori | Scryfall total_cards | Lokalt: alla / topp‑5000 / topp‑1000 | Mest spelade (order=edhrec) |
|---|---:|---:|---|
| Reveal/exile cards … until (text) | 155 | 170 / 41 / 4 | Tibalt's Trickery · Etali, Primal Conqueror // Etali, Primal Sickness · Demonic Consultation · Consuming Aberration |
| Cascade | 37 | 37 / 9 / 0 | Apex Devastator · Maelstrom Wanderer · Call Forth the Tempest · Imoti, Celebrant of Bounty |
| Discover | 31 | 31 / 8 / 1 | Chimil, the Inner Sun · Brass's Tunnel-Grinder // Tecutlan, the Searing Rift · Trumpeting Carnosaur · Hit the Mother Lode |
| Ripple | 5 | 5 / 0 / 0 | Surging Dementia · Surging Flame · Surging Aether · Surging Sentinels |
| Alla ovan | 228 | – | Tibalt's Trickery · Chimil, the Inner Sun · Etali, Primal Conqueror // Etali, Primal Sickness · Demonic Consultation |

<details><summary>Exakta sökfrågor</summary>

```
tills_text           155  o:/(reveal|exile|mill|put)s? cards from the top of [^.]{0,40}until/ game:paper -is:funny
cascade               37  keyword:cascade game:paper -is:funny
discover              31  keyword:discover game:paper -is:funny
ripple                 5  keyword:ripple game:paper -is:funny
tills_alla           228  (o:/(reveal|exile|mill|put)s? cards from the top of [^.]{0,40}until/ or keyword:cascade or keyword:discover or keyword:ripple) game:paper -is:funny
```

</details>

**UI-primitiv:** G8 **Avslöja tills**: avslöja ett kort i taget ("+1 kort") tills spelaren säger stopp; träffen → hand / battlefield / "kasta gratis"; resten → underst i slumpad ordning, graveyard eller exile enligt kortet. Villkoren är mest "nonland", "creature", "land" eller "MV mindre än" (cascade/discover), som appen kan pröva automatiskt eftersom den känner korten. Beta: manuellt stopp räcker.

### 7. Exile översta och få spela det (impulse draw)

**Grundoperation:** G7

| Delkategori | Scryfall total_cards | Lokalt: alla / topp‑5000 / topp‑1000 | Mest spelade (order=edhrec) |
|---|---:|---:|---|
| Exile the top N (alla, face up) | 414 | 355 / 77 / 8 | Jeska's Will · Professional Face-Breaker · Etali, Primal Storm · Ragavan, Nimble Pilferer |
| Impulse draw (exile + "you may play/cast") | 315 | 349 / 87 / 9 | Jeska's Will · Professional Face-Breaker · Etali, Primal Storm · Ragavan, Nimble Pilferer |
| … längre fönster ("until the end of your next turn", "as long as") | 98 | – | Light Up the Stage · Atsushi, the Blazing Sky · Valakut Exploration · Reckless Impulse |
| Exile från toppen face down (Necropotence, Praetor's Grasp) | 27 | 47 / 11 / 2 | Necropotence · Ugin, the Ineffable · Decadent Dragon // Expensive Taste · Outrageous Robbery |
| Hideaway | 15 | 15 / 6 / 3 | Mosswort Bridge · Windbrisk Heights · Spinerock Knoll · Cemetery Tampering |

<details><summary>Exakta sökfrågor</summary>

```
exil_topp            414  (o:/exiles? the top (card|\w+ cards?) of/ or o:/exiles? [^.]*cards? [^.]*from the top of/) game:paper -is:funny
impuls               315  (o:/exiles? the top/ or o:/exiles? [^.]*cards? [^.]*from the top of/) (o:"you may play" or o:"you may cast") game:paper -is:funny
impuls_lang           98  (o:/exiles? the top/ or o:/exiles? [^.]*cards? [^.]*from the top of/) o:/(until the end of your next turn|as long as)/ (o:"you may play" or o:"you may cast") game:paper -is:funny
exil_nedvand          27  o:/exiles? (the top|[^.]*from the top)[^.]*face down/ game:paper -is:funny
hideaway              15  keyword:hideaway game:paper -is:funny
```

</details>

**UI-primitiv:** G7 **Exile med spelrätt**: exile översta N face up eller face down, och märk varje kort med *vem* som får spela det och *hur länge* (denna tur / t.o.m. nästa tur / så länge det ligger kvar). Kortet spelas direkt från exile-zonen. Beta: märkningen tas bort manuellt; automatisk utgång kräver att appen vet vems tur det är.

### 8. Spela från toppen / översta kortet synligt

**Grundoperation:** G10

| Delkategori | Scryfall total_cards | Lokalt: alla / topp‑5000 / topp‑1000 | Mest spelade (order=edhrec) |
|---|---:|---:|---|
| "Look at the top card of your library any time" | 51 | 51 / 22 / 3 | Bolas's Citadel · Mystic Forge · Realmwalker · The Reality Chip |
| "Play with the top card of your library revealed" | 17 | 14 / 3 / 1 | Oracle of Mul Daya · Courser of Kruphix · Conspicuous Snoop · Lantern of Insight |
| Play/cast från toppen av leken | 59 | 54 / 25 / 4 | Bolas's Citadel · Mystic Forge · Oracle of Mul Daya · Realmwalker |

<details><summary>Exakta sökfrågor</summary>

```
titta_alltid          51  o:/look at the top card of (your|their) library (at )?any time/ game:paper -is:funny
avslojt_topp          17  o:/play with the top cards? of [^.]{0,20}librar(y|ies) revealed/ game:paper -is:funny
spela_topp            59  o:/(play|cast) [^.]*from the top of (your|their|each)[^.]*librar/ game:paper -is:funny
```

</details>

**UI-primitiv:** G10 **Löpande toppläge**: en växel på leken, "visa översta kortet: av / för mig / för alla", plus att översta kortet går att dra direkt till battlefield eller stack. Få kort, men många av dem spelas i Commander (Bolas's Citadel, Mystic Forge, Courser of Kruphix, Oracle of Mul Daya).

### 9. Söka i leken (tutors, fetchlands, ramp)

**Grundoperation:** G4

| Delkategori | Scryfall total_cards | Lokalt: alla / topp‑5000 / topp‑1000 | Mest spelade (order=edhrec) |
|---|---:|---:|---|
| Search … library (oracle-text) | 996 | 1167 / 317 / 85 | Path to Exile · Evolving Wilds · Cultivate · Farseek |
| … inkl. påminnelsetext (partner with, typecycling) | 1 128 | – | Path to Exile · Evolving Wilds · Cultivate · Farseek |
| Söker land (ramp, fetch) | 450 | 473 / 165 / 53 | Path to Exile · Evolving Wilds · Cultivate · Farseek |
| Land som söker (fetchlands) | 64 | – | Evolving Wilds · Terramorphic Expanse · Myriad Landscape · Polluted Delta |
| Tutor till handen | 305 | – | Demonic Tutor · Gamble · Inventors' Fair · Diabolic Intent |
| Till battlefield | 367 | – | Evolving Wilds · Cultivate · Farseek · Nature's Lore |
| Överst i leken (Vampiric/Mystical/Worldly Tutor) | 45 | – | Vampiric Tutor · Enlightened Tutor · Mystical Tutor · Worldly Tutor |
| Till graveyard (Entomb, Buried Alive) | 17 | – | Entomb · Buried Alive · Goblin Engineer · Unmarked Grave |
| Med "reveal" (det hittade kortet visas) | 391 | – | Cultivate · Kodama's Reach · Enlightened Tutor · Mystical Tutor |
| Transmute, typecycling, landcycling | 113 | – | Ash Barrens · Muddle the Mixture · Angel of the Ruins · Lórien Revealed |
| Partner with (söker partnern) | 52 | – | Alisaie Leveilleur · Alphinaud Leveilleur · Pippin, Warden of Isengard · Brallin, Skyshark Rider |

<details><summary>Exakta sökfrågor</summary>

```
sok                  996  o:/\bsearch(es)? [^.]*librar(y|ies)/ game:paper -is:funny
sok_fo              1128  fo:/\bsearch(es)? [^.]*librar(y|ies)/ game:paper -is:funny
sok_land             450  o:/search(es)? [^.]*librar(y|ies) for [^.]*(land|plains|island|swamp|mountain|forest)/ game:paper -is:funny
fetchland             64  t:land o:/search your library for/ game:paper -is:funny
sok_hand             305  o:/search your library for [^.]*(it|that card|them|those cards) into your hand/ game:paper -is:funny
sok_bf               367  o:/search your library for [^.]*onto the battlefield/ game:paper -is:funny
sok_topp              45  o:/search your library for [^.]*on top/ game:paper -is:funny
sok_gy                17  o:/search your library for [^.]*into your graveyard/ game:paper -is:funny
sok_reveal           391  o:/search[^.]*librar[^.]*reveal/ game:paper -is:funny
transmute_cycling    113  (keyword:transmute or keyword:typecycling or keyword:landcycling or keyword:"basic landcycling" or keyword:plainscycling or keyword:islandcycling or keyword:swampcycling or keyword:mountaincycling or keyword:forestcycling or keyword:wizardcycling or keyword:slivercycling) game:paper -is:funny
partner_with          52  keyword:"partner with" game:paper -is:funny
```

</details>

**UI-primitiv:** G4 **Sök i leken**: visa hela leken privat, sorterad och filtrerbar (typ, subtyp som "basic Forest", namn, MV). Välj 0–k kort, med *egen destination per kort* (Cultivate: ett till battlefield tapped, ett till handen), växeln "avslöja", sedan automatisk blandning. Ordningen spelar roll: Vampiric Tutor och Long-Term Plans blandar *först* och lägger sedan kortet överst eller tredje uppifrån. "Fail to find" måste gå när sökningen gäller kort med en angiven egenskap.

### 10. Blanda (shuffle) och blanda in i leken

**Grundoperation:** G4/G6

| Delkategori | Scryfall total_cards | Lokalt: alla / topp‑5000 / topp‑1000 | Mest spelade (order=edhrec) |
|---|---:|---:|---|
| Shuffle (alla) | 1 209 | 1229 / 345 / 87 | Path to Exile · Evolving Wilds · Cultivate · Farseek |
| Shuffle utan search (Ponder, Chaos Warp …) | 224 | – | Chaos Warp · Ponder · Midnight Clock · Urza, Lord High Artificer |
| Blanda in kort i leken (alla källor) | 167 | 178 / 40 / 4 | Chaos Warp · Green Sun's Zenith · Midnight Clock · Blightsteel Colossus |
| Blanda in graveyard (Elixir of Immortality, Kozilek) | 68 | – | Midnight Clock · Kozilek, Butcher of Truth · Finale of Revelation · Ulamog, the Infinite Gyre |
| Blanda in handen (Timetwister, Winds of Change) | 31 | – | Midnight Clock · Winds of Change · Echo of Eons · Commit // Memory |
| Blanda in ett permanent/kort (Chaos Warp, Blightsteel) | 80 | – | Chaos Warp · Blightsteel Colossus · Vigor · Elixir of Immortality |

<details><summary>Exakta sökfrågor</summary>

```
blanda              1209  o:/\bshuffles?\b/ game:paper -is:funny
blanda_utan_sok      224  o:/\bshuffles?\b/ -o:search game:paper -is:funny
blanda_in            167  o:/shuffles? [^.]*into (your|their|its owner's|its owners'|his or her|each player's|a) librar/ game:paper -is:funny
blanda_gy             68  o:/shuffles? [^.]*graveyards? into/ game:paper -is:funny
blanda_hand           31  o:/shuffles? [^.]*hands?[^.]* into [^.]*librar/ game:paper -is:funny
blanda_perm           80  o:/shuffles? (target|it|that|each|all|them|those|this|up to)[^.]*into (its|their|your) (owner'?s'? )?librar/ game:paper -is:funny
```

</details>

**UI-primitiv:** **Blanda** är en knapp (ingår i G4). **Blanda in** hör till G6: flytta ett kort eller en hel zon (graveyard, hand) in i leken och blanda. Lokalt nämner 1 229 kort shuffle. 1 004 av dem är sökningar och 171 till blandar in något; där ingår blandningen redan. Bara 54 kort behöver en fristående blanda-knapp (Ponder, Urza, Lord High Artificer, Lim-Dûl's Vault).

### 11. Lägga kort överst, underst eller N:te uppifrån

**Grundoperation:** G6

| Delkategori | Scryfall total_cards | Lokalt: alla / topp‑5000 / topp‑1000 | Mest spelade (order=edhrec) |
|---|---:|---:|---|
| On top of library (från annan zon) | 188 | 187 / 24 / 10 | Brainstorm · Mystic Sanctuary · Sensei's Divining Top · Sylvan Library |
| Från handen överst (Brainstorm) | 25 | 25 / 7 / 1 | Brainstorm · Brainsurge · Jace, the Mind Sculptor · Enter the Infinite |
| Från graveyard överst (Mystic Sanctuary, Academy Ruins) | 46 | – | Mystic Sanctuary · Hall of Heliod's Generosity · Academy Ruins · Noxious Revival |
| Överst i ägarens lek (tuck till toppen) | 74 | – | Sensei's Divining Top · Noxious Revival · Memory Lapse · Submerge |
| Underst i ägarens lek (tuck till botten: Condemn, Terminus) | 55 | – | Murderous Rider // Swift End · Condemn · Terminus · Bant Charm |
| N:te uppifrån (Approach of the Second Sun, God-Eternals) | 33 | 33 / 8 / 1 | Approach of the Second Sun · God-Eternal Oketra · Ilharg, the Raze-Boar · Commit // Memory |

<details><summary>Exakta sökfrågor</summary>

```
topp_fran_zon        188  o:/on top of (your|their|its owner's|his or her|that player's) (owner's )?librar/ game:paper -is:funny
topp_fran_hand        25  o:/from (your|their) hand on top of/ game:paper -is:funny
topp_fran_gy          46  o:/from (your|a|their) graveyard on top of/ game:paper -is:funny
topp_tuck             74  o:/on top of (its|their) owner'?s'? librar/ game:paper -is:funny
botten_tuck           55  o:/on the bottom of (its|their) owner'?s'? librar/ game:paper -is:funny
nte                   33  o:/(second|third|fourth|fifth|sixth|seventh) from the top|beneath the top/ game:paper -is:funny
```

</details>

**UI-primitiv:** G6 **Lägg i leken på position**: i varje korts meny, "till leken: överst / underst / N:te uppifrån / blanda in". Flera kort till botten: valfri eller slumpad ordning. Kort som läggs dit från en offentlig zon blir *kända* för alla tills leken blandas (Approach: alla vet att den ligger sjunde).

### 12. Understa kortet (bottom of library)

**Grundoperation:** G6/G13

| Delkategori | Scryfall total_cards | Lokalt: alla / topp‑5000 / topp‑1000 | Mest spelade (order=edhrec) |
|---|---:|---:|---|
| "Bottom of … library" (alla omnämnanden) | 556 | 581 / 98 / 8 | Thassa's Oracle · Valakut Awakening // Valakut Stoneforge · Growing Rites of Itlimoc // Itlimoc, Cradle of the Sun · Tibalt's Trickery |
| Underst i slumpad ordning (random order) | 295 | 306 / 66 / 4 | Thassa's Oracle · Tibalt's Trickery · Loot, Exuberant Explorer · Narset, Parter of Veils |
| "Bottom card of" (titta på, dra, spela understa) | 6 | 5 / 1 / 0 | Arvinox, the Mind Flail · Nicol Bolas, the Ravager // Nicol Bolas, the Arisen · Grenzo, Dungeon Warden · Phyrexian Furnace |
| Slumpat kort ur leken | 0 | 1 / 0 / 0 | – |

<details><summary>Exakta sökfrågor</summary>

```
botten               556  o:/bottom of [^.]{0,30}librar(y|ies)/ game:paper -is:funny
botten_slump         295  o:/random order/ o:/bottom/ game:paper -is:funny
botten_kort            6  o:/bottom card of/ game:paper -is:funny
slump                  0  o:/at random from [^.]*librar|random card (from|in) [^.]*librar/ game:paper -is:funny
```

</details>

**UI-primitiv:** Nästan all "bottom" ingår i Topp-N-dialogen (resten underst), i avslöja-tills (cascade) eller i G6. Att titta på eller dra *understa* kortet och slumpa ur leken (G13) gäller bara 6 kort och kan vänta.

### 13. Ansiktet nedåt från toppen (manifest, cloak) och Gonti-typen

**Grundoperation:** G11

| Delkategori | Scryfall total_cards | Lokalt: alla / topp‑5000 / topp‑1000 | Mest spelade (order=edhrec) |
|---|---:|---:|---|
| Manifest / manifest dread / cloak | 68 | 71 / 6 / 1 | Reality Shift · Kozilek, the Broken Reality · Orochi Soul-Reaver · Scroll of Fate |
| Titta och exile face down (Gonti, Thief of Sanity) | 22 | – | Gonti, Lord of Luxury · Rev, Tithe Extractor · Gonti, Night Minister · Thief of Sanity |

<details><summary>Exakta sökfrågor</summary>

```
manifest              68  (keyword:manifest or keyword:"manifest dread" or keyword:cloak) game:paper -is:funny
titta_nedvand         22  o:/looks? at the top/ o:"face down" game:paper -is:funny
```

</details>

**UI-primitiv:** G11 **Ansiktet nedåt**: översta kortet till battlefield som en face-down 2/2 som ägaren kan titta på och vända upp. Kräver face-down-permanents på bordet i Mesa. Få kort i Commander (6 i topp-5000). Gonti-typen hör till G12.

### 14. Motståndarens lek

**Grundoperation:** G12

| Delkategori | Scryfall total_cards | Lokalt: alla / topp‑5000 / topp‑1000 | Mest spelade (order=edhrec) |
|---|---:|---:|---|
| Söker i en annan spelares lek | 49 | 60 / 4 / 1 | Praetor's Grasp · Bribery · Inevitable Betrayal · Thada Adel, Acquisitor |
| … namnbaserat (Surgical Extraction, Cranial Extraction) | 34 | – | The Rise of Sozin // Fire Lord Sozin · Kassandra, Eagle Bearer · Deadly Cover-Up · Surgical Extraction |
| Tittar i en annan spelares lek | 41 | 42 / 7 / 0 | Mishra's Bauble · Gonti, Lord of Luxury · Rev, Tithe Extractor · Thief of Sanity |
| Exile/titta på andras topp och spela kortet | 40 | 65 / 23 / 2 | Etali, Primal Storm · Ragavan, Nimble Pilferer · Grenzo, Havoc Raiser · Gix, Yawgmoth Praetor |
| Exile the top of another player's library (alla) | 41 | – | Etali, Primal Storm · Ragavan, Nimble Pilferer · Grenzo, Havoc Raiser · Gix, Yawgmoth Praetor |
| Mill på andra (se avsnitt 4) | 256 | 266 / 54 / 6 | Syr Konrad, the Grim · Altar of Dementia · Brain Freeze · Breach the Multiverse |

<details><summary>Exakta sökfrågor</summary>

```
sok_annan             49  o:/search (target (player|opponent)'s|an opponent's|each opponent's|that player's|its owner's|target player's) [^.]{0,30}librar/ game:paper -is:funny
sok_annan_namn        34  o:/search [^.]*graveyard, hand, and library/ game:paper -is:funny
titta_annan           41  o:/look at the top [^.]{0,30}of (target|each|an|that) (player|opponent)'s librar/ game:paper -is:funny
spela_annans          40  o:/(exile|look at|reveal)s? the top [^.]{0,40}of (target|each|an|that) (player|opponent)'s librar(y|ies)/ (o:"you may cast" or o:"you may play") game:paper -is:funny
exil_topp_annan       41  o:/exiles? the top [^.]*of (target|each|that|an) (player|opponent)'s librar/ game:paper -is:funny
mill_annan           256  o:/(target|each|that|defending|chosen) (player|opponent)s? ([^.]{0,30} )?mills?\b|\b(opponents?|players?) mills?\b/ game:paper -is:funny
```

</details>

**UI-primitiv:** G12 **Annan spelares lek**: någon annan än ägaren ser leken (Gonti, Praetor's Grasp), får kort ur den (Bribery), eller spelar kort ur den (Ragavan, Etali). Det svåraste fallet: den dolda informationen ska till en annan person än ägaren, och kort får en kontrollant som inte är ägaren. Namnbaserad sökning (Surgical Extraction) kan appen däremot göra automatiskt, utan att visa leken.

### 15. Lekens storlek: vinna eller förlora

**Grundoperation:** G9

| Delkategori | Scryfall total_cards | Lokalt: alla / topp‑5000 / topp‑1000 | Mest spelade (order=edhrec) |
|---|---:|---:|---|
| Antal kort i leken spelar roll | 17 | 21 / 6 / 2 | Thassa's Oracle · Laboratory Maniac · Jace, Wielder of Mysteries · Peer into the Abyss |
| Vinna/förlora via tom lek (Thassa's Oracle, Lab Man) | 7 | 7 / 4 / 2 | Thassa's Oracle · Laboratory Maniac · Jace, Wielder of Mysteries · Out of the Tombs |

<details><summary>Exakta sökfrågor</summary>

```
lekstorlek            17  o:/cards in (your|their|target player's|that player's|each player's) librar|no cards in (your|their) library|library has no cards|number of cards in [^.]{0,20}librar/ game:paper -is:funny
vinst_tom              7  o:/no cards in (your|their) library|library has no cards|cards in your library/ o:/(win|lose)s? the game/ game:paper -is:funny
```

</details>

**UI-primitiv:** G9 **Lekräknare**: visa alltid antal kort i leken för alla (det är offentlig information), varna vid dragning ur tom lek (man förlorar vid nästa kontroll). Laboratory Maniac, Jace och Thassa's Oracle behöver bara räknaren; vinsten sköter spelarna.

## Metod

- **Källa:** Scryfall API `/cards/search`, 2026-09-27, med curl och node och User-Agent `MesaResearch/1.0`. Alla frågor har tillägget `game:paper -is:funny`: bara kort som finns på papper, alltså inga Un-set och inga Alchemy-kort med `seek` eller `conjure`. `unique=cards` (standard) räknar varje kort en gång oavsett tryck, och `order=edhrec` sätter de mest spelade Commander-korten först.
- **Två räkningar:**
  1. **Scryfalls `total_cards` per fråga.** Frågorna står under varje tabell.
  2. **Lokal klassning** av hela korpusen: 4 381 kort, hämtade sida för sida med frågan nedan, och 48 reguljära uttryck i JavaScript. De körs på oracle-texten utan påminnelsetext, och med påminnelsetexten när inget annat träffat (62 kort nås bara så). Klassningen ger kolumnen "Lokalt" och täckningsgraden. Den gäller bara korpusen och kan därför vara lägre än Scryfalls tal för kategorier som också finns utanför, till exempel "drawn this turn" (17 hos Scryfall, 5 i korpusen). Några uttryck skiljer sig också mellan de två räkningarna. Ett exempel är "in any order": 172 hos Scryfall, som räknar alla kort som nämner både leken och "in any order", mot 28 lokalt, där ordningen måste gälla leken.
- **Korpusen:**

  ```
  (fo:library or keyword:mill or keyword:scry or keyword:surveil or keyword:explore or keyword:cascade or keyword:discover or keyword:manifest or keyword:"manifest dread" or keyword:cloak or keyword:fateseal or keyword:clash or keyword:dredge or keyword:hideaway or keyword:ripple or keyword:miracle or keyword:transmute or keyword:typecycling or keyword:landcycling) game:paper -is:funny   → 4 381
  ```

- **Nämnare:**

  ```
  game:paper -is:funny                 32 381  alla kort
  f:commander game:paper -is:funny     32 115  lagliga i Commander
  o:library game:paper -is:funny        2 802  nämner "library" i oracle-texten
  fo:library game:paper -is:funny       3 658  … inklusive påminnelsetext
  (draw-frågan i avsnitt 1)             3 304  drar kort
  ```

- **Popularitet:** EDHREC-rank ur Scryfall. 171 av korpusens kort ligger bland de 1 000 mest spelade Commander-korten, 877 bland de 5 000 mest spelade.
- **Kontroll för hand:** stickprov på ungefär 150 kort i de känsligaste kategorierna (sök i en annans lek, spela från toppen, N:te uppifrån, lekstorlek, mill på andra). Ett fel rättades: "cast … from the top" träffade först "whenever you cast a spell, each opponent reveals cards from the top" (Consuming Aberration). Kända fel som finns kvar: "each player mills" räknas som mill på andra fast det också gäller den egna leken, kort som *ger* cascade ("spells you cast have cascade") räknas som cascade-kort, och ovanliga ordalydelser missas.
- **Två fällor i Scryfall att känna till:** ett regex med stora intervall som `[^.]{0,60}` ignoreras tyst ("Too much repetition"), och då returnerar frågan *alla* 32 381 kort. Använd `[^.]*` i stället. Söket blev rate-limitat vid ungefär fem anrop per sekund, medan 650 ms mellan anropen höll.

## Bilaga: skript och data

Skripten ligger i `dev/regler/library/`. Korpusen (`korpus.json`, 1,6 MB) är inte sparad — kör `hamta.mjs` för att hämta den igen. Vägarna i skripten pekar på sessionens scratchpad och behöver justeras.

| Fil | Vad |
|---|---|
| `library/hamta.mjs` | hämtar alla sidor för en Scryfall-fråga till kompakt JSON |
| `library/klassa.cjs` | de 48 kategorierna som reguljära uttryck |
| `library/analys.cjs`, `library/tackning.cjs` | kategori → grundoperation, täckningsgrad, girig ordning |
| `library/fragor.mjs`, `library/extra.mjs`, `library/fragor.json` | Scryfall-räkningarna och deras resultat |
| `library/sektioner.cjs` | genererar tabellerna i katalogen |

# Mesa — produktkontext för brainstorming och marknadsundersökning

*Sammanställd 2026-09-25 ur repot (kod, planer, designunderlag, commits), Linear
och projektets egna anteckningar. Filen skrivs över nästa gång den tas fram.*

## Så här använder du det här

Du har inte tillgång till Mesas kod, Linear eller appen — allt du vet om Mesa
står här. Dokumentet är till för att brainstorma och göra marknadsundersökning.

- **Citatblock och texter i citattecken är ordagranna**: visionen,
  positioneringen och appens egna texter. De går att citera och resonera om
  ord för ord.
- **Allt annat är sammanfattat.** Namn och siffror stämmer med källorna, men
  fråga hellre än gissa när ett resonemang hänger på en detalj.
- **Siffrorna har projektet mätt själv, på små underlag**: en persons bord, en
  testlek på 40 kort, några korta pass med riktig telefon. Läs dem som
  riktning, inte som statistik. Projektet rör sig fort (20–70 commits om dagen),
  så siffrorna åldras på dagar.
- **Projektet har ingen marknadsdata.** Ingen konkurrentanalys, ingen
  prissättning, ingen affärsmodell, ingen användarundersökning. Det som står om
  konkurrenter i avsnitt 12 är antingen omnämnanden i repot eller ledtrådar som
  måste verifieras. Att repot inte nämner något betyder inte att det inte finns.
- **Föreslå inte det som står under "Redan förkastat"** utan ett nytt argument.

## 1. Mesa på en minut

- **Vad:** en webbapp för att spela Magic: The Gathering på distans med sina
  riktiga, fysiska kort.
- **Hur:** varje spelare har en telefon i ett stativ rakt ovanför sin spelyta.
  Telefonen filmar bordet, känner igen vilka kort som ligger där och om de är
  vridna (tappade), och skickar det till ett delat digitalt bord som alla i
  spelet ser på sina datorer.
- **Motståndarna ser en digital återgivning** av ditt bord med kortbilder —
  inte din kamerabild. Handen och leken är privata.
- **Ingen video eller röst i appen.** Mesa förutsätter att spelarna pratar i
  ett separat videosamtal.
- **Bara Magic** i dag, fast visionen gäller brädspel och bordsspel i stort.
- **Mognad:** drygt tre veckor gammalt (första commit 2026-09-02), en person
  (Jesper) som bygger med Claude Code-agenter, fyra konton i databasen, ingen
  lansering, inget pris.
- **Tekniskt läge:** att känna igen ett ensamt kort är nästan löst. Att hitta
  alla kort på ett riktigt, fullt bord är det inte — ett riktigt parti på 20
  minuter 2026-09-21 bedömdes som "ospelbart". En färdig detektor hittade
  nyligen 62 av 66 kort där dagens hittar 29, och det pekar ut vägen framåt.

## 2. Visionen och positioneringen

### Vision (Linear, ordagrant)

> Mesa makes tabletop gaming possible with anyone, anywhere, without losing
> the feeling of playing together in person.

### Product positioning (Linear, ordagrant)

> Mesa lets you play real, physical board games and tabletop games with people
> anywhere in the world, combining the tactile feeling of playing with physical
> pieces with a seamless digital experience. A camera above the table captures
> the game in real time and automatically shares what each player needs to
> see, so you can play with your actual cards, miniatures, boards and pieces
> without having to constantly explain, move or show what is happening. The
> result is a new way to play tabletop games remotely, where the physical game
> remains at the heart of the experience and digital technology makes playing
> together feel natural, immersive and connected.

Båda står i det Linear-projekt som skapades 2026-09-07 (i dag avslutat och
omdöpt till "Mesa Magic (historik före 20 sep 2026)"). Linear-arbetsytan heter
Mesa och har adressen `mesagames`.

### Så presenterar appen sig i dag (ordagrant)

| Var | Text |
|---|---|
| Flikens titel | Mesa — physical cards, shared board |
| Metabeskrivning | Your deck and your hand stay yours. What you play on the table shows up for everyone in the game. |
| Inloggningssidans rubrik | Physical cards, shared table |
| Ingressen under | Your deck and your hand are your own. What you play onto the table is seen by everyone in the game — without anyone having to type anything in. |
| Enda knappen | Continue with Google |

Inloggningssidan är bara ett inloggningskort: ingen funktionslista, inga
skärmbilder, inget om pris, beta eller väntelista.

### Namnet (commit 2026-09-06, ordagrant)

> Appen heter Mesa. Ordet betyder bord, och ett platåberg är en plan yta sedd
> uppifrån — vilket är precis vad kameran ser. Märket är två plan: det undre
> ifyllt, bordet du sitter vid; det övre bara en kontur, samma yta digitalt.

### README (senast ändrad 2026-09-11, delvis inaktuell, ordagrant)

> **Mesa — fysiska kort på ett delat, digitalt bord**
>
> En fristående webbsida (`index.html`, en enda fil) som kompletterar
> spelltable.wizards.com.

### Löftet i det aktiva projektet (Linear, ordagrant)

> Du lägger ner ett kort, tappar det, flyttar det, skickar det till graveyard.
> **Skärmen ska hinna med dig** — utan att du väntar, och utan att du behöver
> rätta den efteråt.

### Glappet mellan visionen och produkten

- **Spelen.** Visionen talar om "board games and tabletop games … cards,
  miniatures, boards and pieces". Allt som är byggt gäller Magic; kod och
  planer nämner inga andra spel.
- **Vad som delas.** Positioneringen lovar att kameran delar "what each player
  needs to see". I dag delas korten som ligger framme, deras tap-läge och
  deras plats på bordet. Kameran läser inte räknare eller tärningar, och appen
  har ingen livräkning eller turordning.
- **Känslan.** Visionen lovar känslan av att spela "together in person". Mesa
  har ingen video eller röst och lämnar den delen åt ett annat verktyg.

## 3. Var projektet står

| | Läge 2026-09-25 |
|---|---|
| Ålder | Första commit 2026-09-02; 555 commits på main |
| Team | En person, Jesper, som fattar produkt- och designbesluten. Koden skrivs av Claude Code-agenter under hans styrning, ofta flera parallellt. Inga andra utvecklare syns i historiken. |
| Drift | Live på Vercels standarddomän `magic-mauve-xi.vercel.app`, ingen egen domän |
| Användare | Fyra konton i databasen (uppmätt 2026-09-23) |
| Prov med andra | Minst ett parti med två spelare (2026-09-08). En person till har rapporterat lekfoton där kort inte kändes igen. En instruktion för kompisar att spela in sina egna bord hemma är planerad men inte skickad. |
| Återkoppling | Linear-dokumentet "Alpha-noteringar" är en tom mall (Testare, Feedback, Beslut, Nästa steg) |
| Releaseplan | Etiketterna Alpha, Enhanced Alpha och Open Beta finns i Linear men används inte. En issue säger att en licensfråga ska vara löst "före Open Beta". |
| Pris och affär | Finns inte: inget pris, inga planer, inga gränser som användaren ser. Enda kostnadstexten i appen: "A few cents per read". |
| Språk | Appen på engelska; kod, planer och Linear på svenska |

**Produktmålen**, skrivna som slutvillkor för projekt i Linear 2026-09-20
(ordagrant):

- Uppstarten: "En spelare kan ställa upp telefonen och komma in i spelet utan
  hjälp."
- Lekbyggaren: "Man kan gå från ingen lek alls till ett pågående spel utan att
  lämna appen."
- Spelvyn: "Ett helt parti går att spela utan att något i vyn står i vägen."
- Spegelläget: tre löften om fart och träffsäkerhet, se avsnitt 9.

## 4. Ursprunget

| Datum | Vad hände |
|---|---|
| 2026-09-02 | Första versionen hette **"Handvy — MTG-händer från SpellTable-skärmdumpar"**: klistra in en skärmdump av SpellTable-fönstret, så hittar appen spelarnas videorutor och läser korten i dem |
| 2026-09-05 | Inloggning med Google, spel och ett delat bord; telefonen blir kamera via QR-kod |
| 2026-09-06 | Namnbyte till Mesa. Kameran ser hela mattan: detektera, spåra, identifiera en gång. Fyra omfångsbeslut (avsnitt 10) |
| 2026-09-07 | Leken går att fotografera och sparas på kontot |
| 2026-09-12–17 | Fri matta, flera lekar, spellägen, bordsvy med motståndare, lekbyggare, Home |
| 2026-09-18 | En liten bildmodell (MobileCLIP) i telefonens webbläsare känner igen kort lokalt |
| 2026-09-19–20 | Prov med riktig telefon; hårdare mål för farten |
| 2026-09-21 | Ett riktigt parti på 20 minuter var ospelbart. Planen efteråt: "Vi har optimerat mot fel prov." Sedan dess mäts mot riktiga partier |
| 2026-09-24–25 | Brainstorm om igenkänningen; nollprov med färdiga detektorer (OWLv2 hittar 62 av 66 kort) |

Jespers första idé var en särskild yta för nya kort och en knapp för att läsa
av tap-läget. Han kallade den själv "en amatörs gissning" och bad att den
skulle ifrågasättas till förmån för visionen. Den ersattes av en kamera som ser
hela bordet hela tiden.

Jesper äger själv en fysisk lek men har ingen digital leklista och inget konto
på Moxfield eller Archidekt. Det formade lekflödet: man fotograferar leken i
stället för att klistra in en lista.

## 5. Vem produkten är för (som repot antyder — inte undersökt)

- **Magicspelare som äger sina kort fysiskt** och vill spela med vänner på
  andra platser. Appen säger "Invite your friends", README "Dela med
  spelgruppen".
- **Spelare utan digital leklista.** Så här motiverades lekfotot
  (commit 2026-09-07, ordagrant):
  > Och den enda vägen in var att klistra in en textlista, vilket förutsätter
  > ett konto på Moxfield som den som äger korten fysiskt sällan har.
  > Funktionen var alltså byggd för alla utom sin egen målgrupp.
- **Commander antyds men är inte valt.** Tekniken räknar med lekar på omkring
  100 kort, och en funktion beskrivs som "en Commander-lek redo för kameran på
  sekunder". Men commander-zonen är medvetet bortvald, det finns inget
  formatval, och testleken har 40 kort.
- **Flera spelare.** Bordsvyn är ritad för upp till fyra spelare; databasen har
  inget tak, och kortkommandona räcker till åtta motståndare.
- Det finns ingen persona, inga segment och inga intervjuer.

## 6. Hur produkten fungerar: användarens resa

### Det här behöver varje spelare

- Ett Google-konto (enda sättet att logga in)
- En lek inlagd i Mesa. Appen: "Only cards from the deck you pick will be
  recognized."
- En dator med webbläsare, för bordet
- För kameralägena: en telefon med webbläsare och ett stativ rakt ovanför
  spelytan. Ingen app ("nothing to install").
- Ett separat videosamtal för att prata

### Steg 1 — Home

"Hi <förnamn>" och två listor, **Your games** och **Your decks**. Här finns
**Start a game** och en ruta för spelkod med **Join**. Varje spel visar kod,
spelare och status ("Playing" eller "Getting ready"). Värden kan avsluta ett
spel.

### Steg 2 — Lägga in leken

Tre vägar:

| Väg | Appens beskrivning (ordagrant) |
|---|---|
| **Scan with your phone** (Recommended) | Photograph your physical deck, about 30 cards at a time. |
| **Paste a list** | From Moxfield, Arena, MTGO or plain text. |
| **Type card names** | One card at a time, with suggestions. |

- **Lekfotot:** korten läggs "In columns, overlapping, so only the name line of
  each card shows. About 30 cards at a time. Leave the basic lands out."
  Claude läser namnen.
- **Klistrad lista:** formatet känns igen automatiskt, också Archidekt,
  TappedOut och Deckstats.
- **Basländer** anges som antal.
- **Osäkra kort** hamnar under **To check**: "Did you mean …?" eller "Which
  card is this?".
- Kortdata och bilder kommer från Scryfall. Leken sparas på kontot.
- Det finns inget formatval och ingen kontroll av att leken är giltig. En
  sideboard sparas men går inte att använda i spel.

### Steg 3 — Starta eller gå med i ett spel

- Ett spel har en kod på sex tecken och en inbjudningslänk. Man går med via
  koden eller länken.
- Det finns inget väntrum än. Varje spelare går igenom uppstarten själv och
  trycker **Start playing**. De andra ser hens status: Picking a deck, Setting
  up, Ready eller Playing.
- Ett väntrum med **I'm ready** och en **Start the game** för värden är
  designat men inte byggt.

### Steg 4 — Get ready for the game

Panelen har två delar, **Invite your friends** och **Get ready yourself**.
Den senare har fyra steg:

1. **Pick your deck.**
2. **Choose game mode.** Tre lägen:

   | Läge | Appens beskrivning (ordagrant) |
   |---|---|
   | **Mirror my table** (Recommended, under "Hybrid modes") | Everything you do with your cards shows up here: play, tap, move, remove. |
   | **Use camera to add cards** (under "Hybrid modes") | You tap, move and remove cards digitally. |
   | **Digital table** (under "Digital mode") | No phone and no camera. You put your cards on the mat yourself. |

3. **Connect your phone.** Appen: "Scan the code with your phone's camera —
   nothing to install. Then put the phone in its holder, straight above your
   cards."
4. **Set up your table.**
   - Ett provkort läggs ut så som otappade kort ligger (Untapped/Tapped).
   - Kortets storlek sparas.
   - Graveyard-platsen bekräftas.
   - Leken läggs med baksidan upp på sin plats (library).
   - Sedan: "Your table is set up" → **Start playing**.

Ljuset har inget eget steg. Appen ger råd när ett problem syns: reflexer, en
för ljus duk, ett mönstrat bord.

### Steg 5 — Spelet

- **Mattan:** en fri yta med zoom och panorering. Korten visas som
  Scryfall-bilder.
- **Placering:** i Mirror my table följer kortens platser det fysiska bordet.
  I de andra lägena placeras nya kort automatiskt och dras sedan fritt.
- **Kamerapillret** visar kamerans status på ett ställe, till exempel "Camera ·
  ready", "Camera · N cards" eller "Camera · can't find your cards".
- **Kortets meny:** tap, vänd, räknare (bara power/toughness), skapa token,
  till graveyard, tillbaka till handen. Det finns kortkommandon, och ⌘Z ångrar.
- **Högar:**
  - Graveyard, Library och Exile.
  - Library-siffran räknar hand och library ihop: "cards not played yet".
  - Klickar man på en hög visas korten i en solfjäder.
  - Ur den egna leken kan man dra kort för hand. I spel går bara kort ur den
    egna leken att lägga till.
- **Om ett kort försvinner** frågar appen: "<Name> isn't on the table — Where
  did it go?" Svaren: Graveyard / Exile / Back to hand or library / It's still
  there / Decide later. Försvinner flera på en gång visas en banner: "The
  camera lost N cards at once. Nothing is removed until you choose."
- **Om kameran inte känner igen ett kort** frågar appen "Which card is this?"
  och visar kamerans utsnitt och upp till tre gissningar ur leken. Svaret lär
  kameran.
- **Bordsvyn:**
  - En växel med **Me**, **Everyone** och en knapp per motståndare, plus en
    kant man kan dra i.
  - Motståndarens matta ligger mitt emot, med kort som går att vända upprätt.
  - Motståndarens graveyard och exile går att bläddra i men inte ändra.

### Vad motståndarna ser

- En **digital återgivning**, inte video: dina kort, var de ligger, om de är
  tappade, räknare, fästa kort, graveyard och exile, antal kort i library, samt
  lekens namn och färger.
- Telefonens bild går bara till din egen dator, och bara medan kamerapanelen
  är öppen.
- Handen syns inte för någon annan.

### Vad som inte finns i appen

- **Saknas:** video, röst, chatt, livräkning, turordning, faser och tärningar.
- Planen från 2026-09-12 säger om liv och turordning: "SpellTable äger dem".
- Chatt finns som en idé i backloggen.
- Koden har ett kompakt läge för "ett smalt fönster vid sidan av
  videosamtalet" (kodkommentar).

### Designat men inte byggt (urval)

- Väntrum och gemensam start: I'm ready → Start the game.
- Home med spelen som brickor och fler lägen (Waiting for you, Nobody playing,
  Ended …).
- Animeringar som gör det speglade bordet begripligt för motståndaren. Väntar
  på Jespers ja.
- Tokens och fästa kort (equipment, auror) som kameran placerar själv.
- En visning av vad utrustning och auror ger ett kort (P/T, förmågor).

## 7. Vad kameran gör och vad spelaren gör

| Automatiskt | För hand |
|---|---|
| **Båda kameralägena:** ser ett nytt kort och känner igen det mot leken — lokalt, annars via Claude, annars med frågan "Which card is this?". En platshållare syns nästan direkt | Allt i Digital table |
| **Båda kameralägena:** en instant eller sorcery som lyfts strax efter att den spelats går till graveyard | I Use camera to add cards: tap, flytt och borttagning |
| **Mirror my table:** tap och untap, ur kortets vinkel mot det sparade otappade läget | Räknare, fästa kort, vända kort, exile, tillbaka till handen, dubblera, untap all |
| **Mirror my table:** kortens platser på mattan | Tokens utöver "när X kommer in, skapa N" (via kortets meny) |
| **Mirror my table:** ett försvunnet kort väntar ~5 s. Växer graveyard-högen hamnar det där; annars tonas det ned och appen frågar | Svaret på vart ett försvunnet kort tog vägen |
| Appen själv, inte kameran: tokens från "When ~ enters, create N X"; auror följer sin varelse till graveyard | Kortdragning och handen (spåras inte); liv och turer (finns inte) |

Grundregeln sedan 2026-09-08: **kameran får lägga till kort och vrida dem,
aldrig ta bort dem** utan att spelaren valt.

## 8. Tekniken i klartext

Avsnittet finns för att kunna bedöma genomförbarhet, kostnad och försprång.

### Flödet

1. **Telefonen** filmar i 4K med 15 bilder/s. Var 150:e ms krymps bilden till
   en analysbild, 360 px bred. Handskriven bildanalys hittar korten som
   avvikelser mot den tomma mattan, följer dem mellan bildrutor och läser av
   vinkeln.
2. **När ett kort ligger still** känns det igen en gång, på telefonen, i tre
   steg:
   - en liten bildmodell (MobileCLIP-S0 på WebGPU, ~0,1 s)
   - en geometrisk bildmatchning (ORB) som andra vittne
   - OCR av namnraden
3. **Är telefonen osäker** skickas en beskärning och lekens kortnamn (högst 80)
   till Claude via en serverfunktion på Vercel. Modellen är `claude-opus-5`,
   vald efter en jämförelse: Opus fick 57 av 57 rätt och 0 fel, Sonnet 5 fick
   54 av 57.
4. **Telefonen skickar bordets tillstånd**, några hundra byte, över Supabase
   Realtime till spelarens dator.
5. **Datorn stämmer av** mot sitt bord, ställer frågorna och sparar bordet i
   Supabase. Därifrån får motståndarna det.

Det finns ingen WebRTC och ingen video mellan spelarna. En spelare är en
telefon (kameran) plus en dator (skärmen).

### Varför bara mot den egna leken

- Beslutet 2026-09-06 kallade det "förutsättningen för att identifieringen ska
  kunna köras lokalt på telefonen utan modellanrop i loopen".
- Arkitekturcommiten samma dag: kortet "matchas mot spelarens LEK — ett
  hundratal kandidater i stället för trettiotusen".
- Mätningarna visar att träffen sjunker med ungefär 5 procentenheter för varje
  fördubbling av antalet kandidatnamn. Att ta med motståndarens kort kostar
  ungefär tio procentenheter.
- Följden: en spelare måste lägga in sin lek innan hen kan spela.

### Försprång som faktiskt finns i koden

- **Förräknade bildvektorer** per kort i databasen: en lek är redo för kameran
  på 0,26 s, mot 92,7 s om telefonen räknar själv.
- **Lärda foton:** när Claude eller spelaren bekräftar ett kort sparas kamerans
  bild, knuten till lek och konto. I dag ger de dock fel namn i vissa ljus, och
  ett beslut om dem väntar.
- **Ett eget mätsystem mot facit:**
  - "golden set": 16 fall från riktiga bord
  - "spegelfacit": ett inspelat parti jämfört med en lista över vad som
    faktiskt hände
  - ett ritverktyg för facit
  - en latensrapport från riktig telefon
- **Bara webbläsare**, både på telefonen och datorn.

### Kostnader och gränser

| Post | Vad repot säger |
|---|---|
| Claude-priser (dollar per miljon token, in/ut) | Opus 5: 5/25. Sonnet 5: 2/10 |
| En beskärning till Claude | ~1 cent med Opus 5 (0,35 cent med Sonnet 5) |
| Hela bordet till Claude | ~3 cent och ~9 s (Opus) |
| Per fråga (uppmätt) | ~0,9 cent med Opus 5: snitt 1 400 tokens in och 65 ut över 523 frågor i golden (`senaste-ai.json`, 2026-09-28) |
| Per parti | **Inte mätt direkt.** Provpasset 2026-09-21 (20 min, en telefon, 154 namn): 29 % lokalt, resten via Claude — 45 beskärningar, 7 klungor och 9–19 helbilder, alltså ~60–70 frågor som gav ett namn. Räknat med snittet per fråga (~3 cent för en helbild): **~0,7–1 dollar per telefon och 20 minuter**, ~2–3 dollar i timmen. Frågor som inte gav något namn syns inte i rapporten. Målet är färre frågor till Claude |
| Takt | Telefonen: högst 20 Claude-frågor i minuten. Servern: 40 i minuten och 600 per dag, per IP-adress |
| Supabase | Gratisnivån. Den utgående trafiken gick över kvoten (6,2 av 5 GB) med bara fyra konton, på grund av telefonens förhandsbilder. Nu strypt. Direktöverföring (WebRTC) skulle ta bort trafiken |
| Linear | Gratisnivån; slog i taket på 250 aktiva issues |

### Licenser och villkor — en affärsrisk som inte är utredd

- Bildmodellens vikter (Apples MobileCLIP) har licensen "Apple Sample Code
  License". Den ska läsas "före Open Beta". Alternativen träffar sämre.
- Ultralytics YOLO är AGPL-licensierad och utesluten som färdig detektor.
- Scryfalls och Wizards of the Coasts villkor för kortbilder — både i appen och
  för att träna en modell — är inte utredda.

## 9. Mätt läge: vad fungerar och vad gör det inte

### De tre löftena i spegelläget (mål)

| Löfte | Mål |
|---|---|
| Kortet syns på rätt plats och i rätt tap-läge | ≤ 0,3 s från att handen släpper |
| Rätt namn står där | median ≤ 0,3 s (siktet 0,1 s), 95 % ≤ 0,6 s, aldrig över 2 s |
| Bordet stämmer när du tittar upp | 99 gånger av 100 |

Löftena gäller "allt man gör vid bordet: lägga ner, tappa och untappa, flytta,
till graveyard, till handen, tillbaka i library, stacka mana, och fästa ett
kort vid ett annat."

Regeln över allt, ordagrant: "**0 fel namn.** … En ändring som hittar fler kort
men gissar fel är värdelös."

### Fart på riktig iPhone, 2026-09-20

Räknat från att handen släpper kortet. Ett pass på 2,5 min, svart matta, 4K.

| Händelse | Median | Inom 0,3 s |
|---|---|---|
| Något syns | 97 ms | 100 % |
| Flytt | 89 ms | |
| Tap | 267 ms | |
| Namn | 544 ms (p95 5,75 s) | 42 % |
| Borta | 598 ms | 0 % |

58 % av namnen gick till Claude, med 2,8 s i median. Projektets slutsats: vägen
till snabbare namn är inte en snabbare Claude, utan att färre kort behöver
Claude.

### Ett riktigt parti, 2026-09-21: "ospelbart"

Partiet varade 20 minuter med en lek på 40 kort:

- 230 spår för 40 kort
- 205 domar om att ett kort var borta
- 71 spår som dog utan namn
- namnen kom 2,4 s i median efter att kortet hittats, p95 26 s

I de analyserade bildrutorna låg det i median fyra kort för mycket på det
digitala bordet, och tappade kort i övre raden speglades inte alls. Flera
rättelser gick ut 2026-09-25, men partiet är inte omspelat.

### Ett inspelat parti mot facit, 2026-09-22

4 min 46 s, 59 händelser.

| | Rätt på det digitala bordet |
|---|---|
| Med Claude | 35 av 59 |
| Utan Claude | 20 av 59 |

Per händelse, med Claude:

| Händelse | Rätt |
|---|---|
| Utspel | 12/13 |
| Tap | 4/13 |
| Untap | 5/8 |
| Flytt | 9/18 |
| Dra kort | 0/6 |
| Fästa kort | 0/4 |

### Golden set: 16 fall från riktiga bord och ljus

| Mätning | Resultat |
|---|---|
| Lokalt, 2026-09-25 | 64 av 97 kort hittade, 49 av 97 rätt namn, 1 fel namn, 38 av 40 rätt tap-läge |
| Med Claude, 12 fall, 2026-09-16 och -18 | 57 av 57 rätt namn och 0 fel |

### Det största hålet: detektorn

Dagens detektor gör spår av 41 av 57 kort. De som saknas ligger omlott, och
högar klarar den inte alls.

**Nollprovet 2026-09-25:** färdiga modeller utan träning, prövade på Jespers
foton med 66 kort.

| Detektor | Hittade | Tid per bild |
|---|---|---|
| Dagens | 29 av 66 | 28 ms |
| OWLv2 | 62 av 66 | 11,5 s (dator) |
| YOLO-World, 1280 px | 58 av 66 | 0,6 s (men AGPL-licens) |

- Rapportens slutsats: "Det var upplösningen som fattades, inte
  modellstorleken."
- Planen: OWLv2 märker upp riktiga bildrutor, och sedan tränas en liten modell
  med fri licens som klarar telefonen. Den beräknas ta 0,1–0,2 s per bild.
- Att hyra GPU för träningen beräknas kosta 10–40 dollar. Det beslutet är
  Jespers.

### Övrigt som är känt

- Ett kort går inte att läsa medan handen håller det. Det blir läsbart först
  0,1–0,2 s innan handen släpper.
- 1080p läser korten lika bra som 4K.
- Telefonen blir varm under ett spel. Motmedel: 15 bilder/s och mörk skärm.
  Ett värmeprov återstår.

## 10. Beslut som gäller

| Beslut | Varför |
|---|---|
| Leken krävs, och igenkänningen sker bara mot den egna leken | Det gör lokal igenkänning möjlig (avsnitt 8) |
| En telefon per spelare, rakt uppifrån | Ett av fyra omfångsbeslut 2026-09-06 |
| Kort på bordet och tap-läge sköts automatiskt; hand, graveyard, räknare och tokens för hand | Beslutet 2026-09-06 säger att räknare och tokens är "uttryckligen utanför räckhåll för dagens teknik". Graveyard och tokens blev senare delvis automatiska |
| Webbläsaren, ingen app | Omfångsbeslut; inget att installera |
| Detektera → spåra → identifiera en gång | Var kortet ligger och om det är vridet är billig geometri; vilket kort det är är dyrt att avgöra |
| Kameran tar aldrig bort ett kort utan att spelaren valt | "Nothing is removed until you choose." |
| Tap läses mot ett otappat läge som spelaren sparar | Otappat är inte alltid exakt 0° och tappat inte exakt 90° |
| Leken fotograferas i solfjäder; basländer anges som antal | Den tryckta namnraden är signalen, och den som äger korten fysiskt har sällan en digital lista |
| Mirror my table är förvalt (Recommended) | Jespers val 2026-09-13 |
| Ingen grön "OK"-notis när vyn redan visar vad som hänt | En regel utan undantag, utom borttagning från bordet |
| Man startar ett "game", aldrig ett "table", och går med via kod eller länk. Utan lek går det inte att spela | Jespers ordval 2026-09-18 |
| Byggarverktygen ligger bakom `?debug`; status visas på ett enda ställe; uppstarten är skild från spelet | "en vanlig spelare ska bara se det nästa steg kräver" |
| Lekens antal är en förväntning, inte ett tak ("Add anyway") | Kloner, extra land och tokens är legitima |
| Hela appen på engelska | Beslut 2026-09-11/12 |

## 11. Redan förkastat

| Alternativ | Skäl |
|---|---|
| En särskild yta för nya kort och en knapp för att läsa av tap-läget | Jespers första idé; den blandade ihop det dyra med det billiga |
| Bara inklistrad leklista | Förutsätter en digital lista som målgruppen sällan har |
| Rutnätsfoto av leken (10×10) | Kräver mer bordsyta och ger inga namn utan OCR. Idén lever vidare som foton av hela kort som stöd för igenkänningen |
| Bläddra korten förbi kameran | "hundra läggningar är för tråkigt" |
| Att leken lär sig själv, som enda väg | Första spelet blir ett modellanrop per kort. Finns kvar som komplement |
| Göra Claude snabbare | Mätt; det gav ingenting. Vägen är färre frågor |
| Läsa kortet medan handen håller det | Handen täcker kortet |
| Ett lokalt läge utan konto | Borttaget 2026-09-14; man spelar bara inloggad, i ett spel |
| Sökfält för vilket Magic-kort som helst i spel | Bara kort ur den egna leken |
| Kameraläsning av tärningar och räknare, commander-zon, import från Moxfield-länk | Klippt ur planen 2026-09-12 |
| Ultralytics/YOLO-World som färdig detektor | AGPL-licens |

## 12. Konkurrenter och referenser

### Det som nämns i repot

- **SpellTable** (spelltable.wizards.com, Wizards of the Coast). Mesas första
  version läste SpellTable-skärmdumpar. README kallar Mesa ett komplement till
  SpellTable, och planen lämnar liv och turordning åt SpellTable.
- **Convoke** nämns en gång, som teknisk jämförelse. Jesper 2026-09-19: "1080p
  borde räcka (Convoke kör det)".
- **Moxfield, Archidekt, Arena, MTGO, TappedOut och Deckstats** nämns bara som
  format för leklistor.
- **Scryfall** står för kortdata och kortbilder. Gatherer valdes bort eftersom
  det saknar öppet API.

### Det som inte finns i repot

- Ingen konkurrentanalys och ingen jämförelse av funktioner eller priser.
- Discord, Tabletop Simulator, Cockatrice och Untap nämns inte, och inte heller
  andra spel.

### Ledtrådar att verifiera (inte från repot)

Kategorier att kartlägga, med exempel att kontrollera:

| Kategori | Exempel |
|---|---|
| Fysisk Magic över webbkamera | SpellTable, Convoke, videosamtal i Discord med webbkamera |
| Digital Magic utan fysiska kort | MTG Arena, Magic Online, Cockatrice, XMage, Forge, Untap.in |
| Allmänna virtuella spelbord | Tabletop Simulator |
| Kortskannerappar för samlingar | Delver Lens, ManaBox, TCGplayer-appen — närliggande teknik och möjliga partners |
| Lekbyggare | Moxfield, Archidekt — källor för leklistor och möjliga kanaler |

Juridik att reda ut: Wizards of the Coasts policy för fanprodukter och
kommersiell användning av Magic, samt Scryfalls API-villkor.

## 13. Öppet just nu

### Produkt och teknik

- **Hitta alla kort på ett riktigt bord.** Vägen är en egen tränad detektor.
  Två saker avgör: att en liten modell på ~1000 px hittar lika många kort som
  OWLv2 och klarar telefonen, och att Jesper säger ja till att hyra GPU.
- **Namnens fart.** 544 ms i median och en lång svans, eftersom mer än hälften
  av namnen går till Claude. Andelen som kan klaras lokalt avgör.
- **Borttagna kort.** De syns sent (598 ms) och sedan 2026-09-25 medvetet ännu
  senare (upp till ~6 s), så att en flytt inte ska se ut som en borttagning.
- **Ett nytt riktigt parti** behövs för att se om rättelserna 2026-09-25 gör
  spelet spelbart.
- **Animeringar kontra löftet.** Designen som väntar på Jespers ja visar ett
  nytt kort först när namnet är känt. Den bryter alltså medvetet mot löftet om
  0,3 s.
- **Uppstarten.** Provkort i plastficka och ljusa träbord känns dåligt igen.
- **Drift och licenser.** Infrastrukturen står på gratisnivåer, och
  licenserna ska vara klara före Open Beta.

### Marknad och affär — frågor som marknadsundersökningen bör besvara

| Fråga | Vad som skulle avgöra den |
|---|---|
| **Tillägg eller eget bord?** Mesa saknar video, röst, liv och turer och förutsätter ett annat verktyg. Ska Mesa ligga ovanpå SpellTable/Discord eller bli det enda fönstret? | Var distansgrupperna faktiskt spelar i dag, och vad ett byte kostar dem |
| **Vilket problem löser Mesa bättre än en webbkamera?** Läsa motståndarens kort, se hela bordet på en gång, slippa förklara, en snygg bild för stream? | Vad spelare klagar på i dag, i forum och intervjuer |
| **Är friktionen värd det?** Konto, inlagd lek, telefon i stativ rakt ovanför, dator och fyra uppstartssteg — för varje spelare | Hur många i målgruppen som har eller skulle skaffa ett stativ; om ett stativ kan säljas eller skickas med |
| **Vem börjar?** Värdet uppstår när flera i gruppen använder Mesa | Om en ensam spelare får värde (Digital table, bordsvyn) eller om hela gruppen måste med |
| **Vilket format och vilken grupp först?** Commander antyds (100 kort, fyra spelare) men är inte valt | Storlek och smärta per format; hur Commander-grupper spelar i dag |
| **Vilket spel efter Magic?** Visionen gäller alla bordsspel. Tekniken — hitta kort och känna igen dem mot en känd lek — flyttar lättast till andra samlarkortspel och sämre till brädspel och miniatyrer | Marknaden per spel, och hur nära tekniken är |
| **Affärsmodell och kostnad per spelare** | Uppmätt kostnad per parti (inte gjort), betalningsvilja, och vem som betalar: spelaren, gruppen, butiken, arrangören eller den som streamar |
| **Rättigheter och villkor** | Wizards policy, Scryfalls villkor, modellernas licenser |
| **Kanaler** | Var distansspelande Magicgrupper finns: Discord, Reddit, spelbutiker, innehållsskapare |

## 14. Ordlista

| Ord | Betyder |
|---|---|
| Magic: The Gathering (MTG) | Samlarkortspelet Mesa byggs för |
| Commander (EDH) | Ett populärt format med lekar på 100 kort, ofta fyra spelare |
| Tap / untap (tappa) | Vrida ett kort ett kvarts varv för att använda det, och vrida tillbaka |
| Permanents | Kort som ligger framme på bordet |
| Graveyard / Library / Exile | Slänghögen / resten av leken med baksidan upp / bortplockade kort |
| Token | Ett tillfälligt kort som skapas av ett annat kort |
| Attach / equip / aura | Kort som fästs vid ett annat kort |
| Basländer (basic lands) | De vanligaste landkorten; en lek har många likadana |
| Plastficka (sleeve) | Skyddsficka runt kortet; ger reflexer i kameran |
| Mirror my table (spegelläget) | Läget där det digitala bordet följer det fysiska. Hette tidigare "Follow the table" och "Table leads" |
| Use camera to add cards | Kameran lägger bara till nya kort; resten görs digitalt |
| Digital table | Utan telefon och kamera |
| Mattan | Den digitala spelytan i appen |
| Spår | Ett kort som kameran följer mellan bildrutor |
| Lekfoto | Ett foto av leken i överlappande kolumner, för att lägga in den |
| Golden set / facit | Projektets testfall från riktiga bord, med rätt svar |
| Spegelfacit | Ett inspelat parti jämfört med en lista över vad som faktiskt hände |
| Scryfall | En öppen databas över alla Magic-kort, med API och bilder |
| Claude | Anthropics AI-modell; Mesa frågar den när telefonen är osäker |

## Det som inte är med

Följande finns men är utelämnat. Be om det om ett resonemang kräver det:

- Promptarna till Claude, i sin helhet
- Kodens uppbyggnad
- Hela backloggen (~300 issues)
- Designunderlagen med alternativ A/B/C för varje vy
- Detaljerade mätprotokoll

## Öppningsreplik

> Det som skaver mest är att Mesa är byggt som ett lager ovanpå ett
> videosamtal — ingen video, inget ljud, inga liv eller turer, och planen säger
> rakt ut "SpellTable äger dem" — medan visionen lovar känslan av att sitta vid
> samma bord. Då står och faller Mesa med en fråga som går att undersöka innan
> tekniken är klar: vad saknar en grupp som redan spelar fysisk Magic över
> webbkamera, som är värt en telefon i stativ, fyra uppstartssteg och en inlagd
> lek per spelare? Jag börjar där. Först kartlägger jag var sådana grupper
> spelar i dag och vad de klagar på. Sedan sorterar jag klagomålen i sådant
> Mesas digitala bord redan löser — läsa motståndarens kort, se hela bordet,
> slippa förklara — och sådant som bara ett eget videofönster skulle lösa. Den
> sorteringen avgör om Mesa ska vara ett tillägg till SpellTable och Discord
> eller ett eget bord.

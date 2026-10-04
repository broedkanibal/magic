# Högarna utan uppstart: library, graveyard och otappat ur spelet

> Beslutat med Jesper 2026-10-02 i fyra frågerundor. Ingen kod är ändrad.
> Bygger på [`spegelmattan-principer.md`](spegelmattan-principer.md). Den
> filen gäller för hur mattan rör sig, och den här för hur högarna och
> grundläget hittas.
>
> **Beslutet ersätter två äldre beslut:**
> - 2026-09-13: steg 4 i uppstarten (provkort, graveyard, library) är
>   obligatoriskt.
> - 2026-09-10: grundläget bekräftas vid första kortet.
>
> Linear: MES-334 (etapp 1). Designytan för etapp 1 och 2: "Mesa Piles From
> Play", https://claude.ai/artifact/RkqPz5qYrBHV5jckSC3fQh, med källan i
> `design_handoff_hogar/`.
>
> Nästa steg: mätningen i befintliga inspelningar, sedan Jespers
> inspelningar. Prompten: [`prompt-hogarna-matning-och-etapp-1.md`](prompt-hogarna-matning-och-etapp-1.md).

## Byggunderlaget (Jesper 2026-10-04): det här byggs

**Det här avsnittet gäller före allt annat i filen.** Säger något längre ned
emot det, gäller avsnittet. Resten av filen visar hur besluten växte fram.

Det som byggs är **designytans sida 5**, "The whole flow (chosen)" i "Mesa Piles
From Play". Allt på sidan byggs i en leverans, utan något mellanbygge med dagens
fasta högar. Bygget kräver att mattan inte ritas om från noll (spegelmattans grund
2), så att högar och kort kan glida. Det ingår i arbetet.

### Partiet börjar

| Läge | Beslut |
|---|---|
| Ingen lek på bordet | Mitt på mattan: "Put your library on the table" (sida 5, tavla 1). Första kortet nämns inte |
| En nedvänd hög ligger still före första kortet | Den antas vara library. Texten byter till "Play your first card when you're ready", i samma stil och på samma plats, och det bytet är kvittensen. Leken visas med brickan "Library 33" |
| Flera nedvända högar före första kortet (starthanden nedvänd under mulligan) | Library är **den som ligger kvar** när de andra plockats upp |
| Fel hög | Man klickar på leken och väljer **Not my library**. Högen blir ett nedvänt kort, och texten går tillbaka till steg 1 |
| Leken plockas upp före första kortet (blanda efter mulligan) | "Library · Picked up". Skuggan står kvar och texten likaså |
| Första kortet läggs ner | Texten försvinner |
| Första kortet spelas utan att leken har synts | Första kortets vinkel blir otappat, utan fråga. Läggs leken ner senare blir den library, men vinkeln står kvar |

### Vinkeln

- **Mattan visar alltid rakt:** otappat 0°, tappat 90°. Leken och korten ritas aldrig snett.
- **Kameran läser varje kort i dess verkliga vinkel.** Beskärningen vrids så att läsningen ser kortet rakt.
- **Tappat eller otappat:** kortets vinkel jämförs med lekens vinkel just nu. Inom 45° är kortet otappat, annars tappat. Vrids leken följer referensen med, och en liten knuff ändrar inget.
- **Det här är det tekniskt svåraste.** Detektorns lådor är raka, så vinkeln måste mätas per kort inne i lådan (kontur eller namnremsa). Mät det först.

### Graveyard

| Läge | Beslut |
|---|---|
| Första kortet på andra sidan om leken från landen, eller ett kort som läggs ovanpå ett annat (inte land på land, inte fäst) | En ruta ovanför högen: "Is this your graveyard?  Yes · No". **Den står kvar tills man svarar och blockerar inget** |
| Innan man svarat | **Inget räknas som graveyard.** Kortet ligger i spel som vanligt, och ingen bricka visas |
| Fler kort läggs på högen innan man svarat | De hör till **samma fråga**. Yes gör alla till graveyard, och Permanent lägger tillbaka alla i spel |
| Yes | Korten blir graveyard (tonas), och brickan "Graveyard 1" visas |
| No | Samma slags ruta med menyn M1: **Permanent** (tillbaka i spel där kortet ligger) eller **Ignore this spot** (Mesa följer inte platsen) |
| Efter Permanent läggs ett kort ovanpå | Mesa frågar en gång till |
| Efter Ignore this spot | Mesa frågar aldrig mer om den platsen |
| Vem ser frågan | Bara spelaren vars bord det är. Motståndarna ser korten i spel tills svaret är Yes |

### I spel

| Läge | Beslut |
|---|---|
| Utseendet | D1: högarna ser ut som högar, utan ramar och linjer, med en bricka för namn och antal |
| Platsen | Högarna ligger bland korten där de ligger på bordet och följer mattans zoomsteg. Brickan behåller sin storlek |
| Leken plockas upp | "Library · Picked up". Skuggan står kvar för alla. Leken glider dit där den läggs ner igen |
| Sleeves | Leken och nedvända kort får automatiskt bordets sleeve-färg, eller Magic-baksidan om man inte har sleeves. Färgen går inte att ändra |
| Spelare utan kamera | Högarna står på **fast plats som i dag**, men i D1:s utseende |
| Exile | **Som i dag (Jesper 2026-10-04):** kameran letar inte efter en exile-hög. Man exilar i appen, och exile står på sin fasta plats bredvid leken, i D1:s utseende. Att känna igen en fysisk exile-hög har en egen issue |

### Inte i det här bygget

- **Graveyard minns kort utan namn** (foto efter 0,5 s, namnet fylls i efter hand, namnges för hand). Det har en egen issue.
- Exile i Nej-menyn, command zone, att dra kort, och minnet av bordsupplägget mellan partier.

## Varför

I dag gör spelaren tre saker innan partiet börjar: visar ett provkort, pekar
ut graveyard och lägger leken på en plats som Mesa visar. Det är samma tre
saker som spelaren ändå gör under partiets första minuter:

- lägger ner leken efter att ha dragit sju kort
- spelar ett land
- lägger det första kortet i graveyard

Den tränade detektorn (MES-329) har en egen klass för kortbaksidor
(`baksida`, AP 0,99 i valideringen), så den hittar leken var den än ligger.
Mesa kan därför lära sig bordet av partiet i stället för att fråga innan det
börjar.

## Principerna

De gäller för alla lösningar av den här sorten: där Mesa härleder något ur
spelet i stället för att fråga först. Command zone i Commander och exile är
nästa exempel.

| # | Princip | I praktiken |
|---|---|---|
| 1 | **Lär av det spelaren ändå gör** | Inga steg före partiet. Leken, grundläget och högarna kommer ur partiets första minuter |
| 2 | **Anta det troliga, visa det, gör det lätt att ändra** | Mesa väntar inte på svar. Den gör det troliga, visar det med en rörelse och erbjuder en ändring ("Not my graveyard") |
| 3 | **Fråga först när svaret behövs** | Finns ingen reserv frågar Mesa i stunden, till exempel vid första kortet till en hög, aldrig i förväg |
| 4 | **Varje del har en reserv** | Syns inte leken tas grundläget ur första kortet, och graveyard kommer ur kort ovanpå kort. Inget är obligatoriskt |
| 5 | **Högarna är saker, inte rutor** | Library och graveyard har plats, riktning och tillstånd (ledig eller upptagen) och flyttar med när spelaren flyttar dem. Rutorna som telefonen tittar på följer högarna |
| 6 | **Ett kort tar med sig sin identitet** | Ett kort som går från mattan till graveyard är samma kort, och läsningen av högen är bara ett andra vittne. Den är ensam källa bara för kort från handen eller leken (discard, mill) |
| 7 | **Minns att något hände, också utan namn** | Ett kort som lagts på högen räknas och får ett foto, också när namnet inte kommer. Namnet fylls i senare eller för hand |
| 8 | **Ett Nej leder till ett val** | "Nej" följs av "vad är det då?" (Permanent, Exile eller Ignore), aldrig av en återvändsgränd. Samma meny får Command zone i Commander |
| 9 | **Osäkert betyder orört** | Samma som princip 10 i spegelmattan. Kan Mesa inte avgöra något står det som det stod |
| 10 | **Mät före bygget** | Varje regel prövas först mot inspelade partier. En regel som verkar rimlig men inte är mätt räknas inte som ett svar (minnet `kontroller-som-ljuger`) |

## Besluten, en del i taget

### Library

| Läge | Beslut |
|---|---|
| Leken läggs ner | Den första nedvända högen eller det första nedvända kortet (klassen `baksida`) som ligger still innan första kortet spelas antas vara library. Ingen egen kvittens behövs: att texten mitt på mattan byter från "Put your library on the table" till "Play your first card when you're ready" är kvittensen (Jesper 2026-10-04). "Not my library" finns i menyn när man klickar på leken |
| Leken flyttas | Leken glider till sin nya plats, och rutan följer med |
| Leken lämnar bilden (söka, blanda, mulligan) | Leken visas som **upplockad för alla**: skuggan står kvar och brickan säger "Library · Picked up". Den står kvar på sin plats med en lugn animering, eftersom motståndarna ändå ser det vid bordet. När leken syns igen, också på en ny plats, glider den dit |
| Handen täcker leken (drar ett kort) | Leken är inte upptagen, eftersom handen fryser (spegelmattans princip 3). Upptagen kräver att platsen syns och är tom |
| Ett nytt nedvänt kort när leken redan är känd | Ett nedvänt kort på mattan (spegelmattans fall 6), inte en ny lek |
| Leken syns aldrig | Grundläget tas ur första kortet, och graveyard kommer ur kort ovanpå kort |
| Dra kort | Kommer senare. Leken byggs som ett spårat objekt, så att "handen går till leken och tillbaka medan leken ligger kvar" kan läggas till |
| "Not my library" | Högen blir ett nedvänt kort, och texten går tillbaka till "Put your library on the table" |

### Otappat (grundläget)

**Jesper 2026-10-04:** när leken är bekräftad som library är dess vinkel otappat.
Det sker automatiskt och utan fråga. Den exakta vinkeln gäller: ligger leken 20°
snett, är otappat 20° snett och tappat 110°. Korten läses också i den vinkeln, både
beskärningen och läsningen. Ingen omröstning, ingen rättning i efterhand och inga
bekräftelsefrågor (N2 och N3 är avfärdade).

| Läge | Beslut |
|---|---|
| Leken är bekräftad | Lekens vinkel blir grundläget (`satGrund`), i grader och inte bara stående eller liggande |
| Leken flyttas eller vrids | *Förslag:* grundläget följer med, så att leken förblir referensen |
| Ingen lek | *Förslag:* första kortets vinkel när det först ligger still |

**Mattan visar alltid rakt (Jesper 2026-10-04).** Vinkeln är kamerans sak. På
mattan ligger leken och korten alltid raka: otappat 0°, tappat 90°, mätt mot
lekens vinkel. En lek som ligger 20° snett ritas rak.

**Genomförbarhet, viktigt:** den tränade detektorns lådor är raka (`fyndUrLador`,
`index.html` ~rad 23659). Ett kort som ligger 20° snett får en nästan kvadratisk
låda både otappat och tappat, så lådan kan inte skilja dem åt. Vinkeln behöver
mätas per kort inne i lådan, ur kortets kontur (minsta omslutande rektangel på
masken) eller ur namnremsans läge, och lekens vinkel mäts på samma sätt.
Beskärningen (`beskar`) vrids med grundläget så att läsningen ser kortet rakt.
Det här mäts i del A innan det byggs.

### Graveyard

| Läge | Beslut |
|---|---|
| Första kortet som läggs på andra sidan om leken från landen | Det antas vara graveyard. Kortet ligger kvar där det ligger, och en animering visar att en graveyard skapas där. En ruta ovanför frågar **"Is this your graveyard?  Yes · No"**. Inget svar räknas som ja efter några sekunder, och då står bara brickan "Graveyard 1" kvar. No öppnar menyn M1 i samma slags ruta (Jesper 2026-10-04) |
| Leken syns inte, inga land ligger ute än, eller land ligger på båda sidor | **Reserven:** ett kort som läggs rakt ovanpå ett annat ger samma sak. Land på land och fästa kort räknas inte. Kortet under blir graveyards första kort |
| Instant eller sorcery som läggs på bordet | Behandlas som vilket kort som helst. Den räknas till graveyard först när den faktiskt flyttas dit. Dagens regel (`SPELL_MS`: försvinner den inom 20 s går den till graveyard med Undo) står kvar |
| Nej, "vad är det då?" (menyn M1, vald 2026-10-04) | **Permanent** (kortet ligger kvar som ett vanligt kort) · **Exile** (högen blir exile-högen, `ZON_EXIL`; kommer i etapp 2) · **Ignore this spot** (sideboard eller tärningar; Mesa följer inte platsen) |
| Efter ett Nej | Sidoregeln frågar inte igen under partiet. Reserven, kort ovanpå kort, tar över |
| Högen flyttas | Rutan följer med (etapp 2) |
| Ett kort lämnar mattan och högen ändras | Samma regel som i MES-85, en ändring per kort, men mot högen där den ligger |

### Graveyard minns korten (etapp 3)

| Läge | Beslut |
|---|---|
| Kort från mattan | Identiteten följer med, så inget behöver läsas |
| Kort som inte legat på mattan (discard, mill) | Det översta kortet läses när högen ligger still efter en ändring. Ett säkert namn läggs in |
| Inget namn inom **0,5 s** | Ett foto av kortet sparas, det skarpaste av rutorna medan kortet låg överst. Kortet räknas som lagt också utan namn |
| Ett nytt kort läggs ovanpå | Läsningen av det täckta kortet fortsätter lokalt på det sparade fotot |
| Högen på mattan | Det översta kortet syns |
| Graveyard öppnas | Alla kort visas, också de utan namn (med foto). Namnen fylls i efter hand |
| Ett kort får aldrig något namn | Det namnges för hand med autocomplete, först ur leken och sedan ur alla kort. Det är samma mönster som för spegelmattans oframkallade kort |
| Claude | **Används inte för graveyard-kort.** Bara lokalt och för hand |

**Gränser att känna till:**
- **Läsningen i bakgrunden ger bara något nytt med nytt underlag.** Samma
  modell svarar likadant på samma bild. Det som kan ge ett namn senare är en
  skarpare ruta, remsan som andra vittne, eller att kortet syns igen när
  kortet ovanpå tas bort.
- **Mesa räknar högens ändringar, inte antalet kort.** Mill 3 blir en
  ändring. Antalet går att rätta i graveyard-vyn.
- **0 fel namn gäller också här.** Graveyard är öppen information, så ett
  fel namn syns för alla.
- **Fotot är ett nytt dataflöde till motståndarna.** Det ska kollas mot
  MES-305 (dold information), precis som framkallningen.

### Lägena

| Läge | Vad gäller |
|---|---|
| Follow the table (Table leads) | Allt ovan |
| Screen leads | Högarna hittas ändå, eftersom de håller kort i högarna borta från mattan. Grundläget och auto-graveyard följer `spelPolicy`, som i dag |

### Utseendet (designytans sida 3)

| Fråga | Läge |
|---|---|
| **Sleeves** | **Beslutat (Jesper 2026-10-02, förenklat 2026-10-04):** leken och nedvända kort visas automatiskt i en färg som efterliknar sleevesen på bordet, eller som Magic-baksidan om spelaren inte har sleeves. Färgen tas ur kamerans bild av leken när den ligger still och syns hel, som median över flera rutor så att blänket (MES-246) inte styr. **Färgen går inte att ändra i den här versionen.** Alla ser samma sleeves |
| **Fasta platser** | **Beslutat (Jesper 2026-10-03):** högarna har ingen fast plats på mattan. De ligger bland korten och följer zoomstegen som vilket kort som helst. Brickan med namn och antal behåller sin storlek. För en digital spelare får högarna en förvald plats som går att flytta |
| **Utseendet** | **Beslutat (Jesper 2026-10-03): riktning D1.** Inga ramar och inga streckade kanter. Högarna ser ut som högar: leken har kortkanter i sleevens färg, och graveyard ligger lite huller om buller. Namn och antal står i en bricka på underkanten. Ersätter A1 i "Mesa Table Piles". D1:s rörelser (graveyard skapas, leken upptagen med skuggan kvar, zoomsteget) är förslag tills de provats i designytan |

## Etapperna

| Etapp | Vad | Kräver |
|---|---|---|
| **1 · Uppstarten försvinner** | Leken hittas själv och visar en kvittens. Grundläget är lekens vinkel, automatiskt och exakt. Graveyard skapas via sidoregeln eller via kort ovanpå kort. Nej-menyn har Permanent och Ignore. Mesa sätter dagens rutor själv (`satBib`/`satGrav` via `kamRutaRad`), och rutan flyttas när leken flyttas. Uppstartens steg 4 tas bort | Inget nytt, dagens matta räcker. Kortet flyger till dagens graveyard-hög (`flygTillGrav`) |
| **2 · Högarna lever** | Rutorna följer högarna med en rörelse, och leken visas som upptagen. Graveyard skapas på kortets plats med en animering. Exile kommer in i Nej-menyn | Spegelmattans steg 3 (mattan utan omritning) och steg 4 (bordets minne). Högarna ritas bland korten i utseendet D1 (sida 3 i "Mesa Piles From Play") |
| **3 · Graveyard minns** | Foto efter 0,5 s, kort som räknas utan namn, läsning i bakgrunden, namn som fylls i efter hand och manuell namngivning | Spegelmattans steg 5 (framkallningen, med samma foto och samma sökruta) |

Etapp 1 är fristående från spegelmattan och kan börja efter mätningen.

### Vad etapp 1 rör i koden (pekare, inte kontrollerade i detalj)

| Vad | Var i dag |
|---|---|
| Uppstartens steg 4 | `oppSteg4`, `oppSteg4Klar`, `oppOppnasIgen` (`b4`, `provKlar`, `gravKlar`, `bibKlar`) |
| Spärren under uppstarten | `oppstartSparr` i `avstamBord` (bänkfallen UP1–UP8) |
| Statusfältets fråga om grundläget | `grundSteg`, `grundAvbojd` |
| Lekvakten | `bibSag`, `bibLage`, `satBib` (MES-122/138/139) |
| Högvakten | `gravVakt`, `satGrav`, `gravTaEmot`, `gravAutoOm` (MES-85) |
| Grundläget på telefonen | `satGrund`, `grundFranSpar` |
| En baksida i dag | Telefonens svar `baksida` blir `skrap` (`identifiera`), och syns inte på mattan |
| Provkortets andra uppgift | `kortstor` (graveyard-platsens storlek). Kontrollera vad mer som läser provkortet innan det tas bort |

## Mätningen före bygget

**Först befintliga inspelningar** (inga nya inspelningar, ingen kod):

| Inspelning | Vad den kan svara på |
|---|---|
| Partiet 2026-09-21 (20 min, 4K 15 fps, båda högarna i bild; facit sek 240–540 på grenen `natt-2026-09-22`) | Syns leken innan första kortet? Var ligger graveyard i förhållande till leken och landen? Läggs kort på "graveyard-sidan" som inte är graveyard? Hur länge ligger ett kort överst på högen innan nästa? |
| Partiet 2026-09-22 (normaltempo, med spårrutor; `handelser.tsv`, `tal.tsv` där Jesper säger vad han gör) | Samma frågor i ett andra parti, och när leken lyfts (sökning, blandning) |
| MES-246 (4K 60, utan spårrutor, manus) | Hittar detektorn leken (klassen `baksida`) när den ligger still, när en hand vilar på den och i fickor? |
| Golden 01–16 | Hur ofta ger detektorn `baksida` på något som inte är en lek? |

**Måtten:**
1. Hur ofta leken syns och ligger still innan första kortet, och efter hur lång tid.
2. Lekens vinkel mot de otappade kortens vinkel i grader, och om vinkeln går att mäta per kort inne i detektorns raka låda (kontur eller remsa).
3. Sidoregeln: hur många kort som hamnar på andra sidan om leken från landen och *inte* är graveyard.
4. Reserven: hur många gånger ett kort läggs ovanpå ett annat utan att det är graveyard (utöver land på land och fästa kort).
5. Hur länge ett kort ligger synligt överst på högen innan nästa läggs dit. Det avgör hur mycket 0,5 s-gränsen fångar.
6. Hur ofta och hur länge leken lämnar bilden, och om det går att skilja från en hand som täcker den.

**Sedan Jespers inspelningar.** Det här är ett utkast. Det skärps efter
måtten ovan, och det som redan är besvarat stryks. Spela in med "Keep the
picture on" och klappa två gånger för synk (minnet `mes-166-provkortets-las`).

1. Partistart: blanda, dra sju, lägg ner leken stående, spela ett land, passa.
2. Samma sak men med leken på tvären.
3. Thriving Heath (tappad) som första land.
4. Ett land som tappas direkt för en 1-drop.
5. En instant läggs på bordet och flyttas sedan till högen på andra sidan om leken.
6. En varelse dör och flyttas till graveyard.
7. Discard på tur 1 innan något land ligger ute: först ett kort, sedan ett till ovanpå.
8. En varelse läggs på andra sidan om leken för att det är trångt (Nej-fallet).
9. Leken lyfts för en sökning, blandas och läggs tillbaka på en ny plats.
10. Tre kort till graveyard snabbt efter varandra, och sedan mill 3 i en rörelse.
11. En hand vilar på leken, och ett kort dras (leken ska inte bli upptagen).
12. Starthanden läggs nedvänd på bordet medan spelaren funderar på mulligan.

## Vad det här ändrar i det som redan finns

| Var | Ändring |
|---|---|
| Uppstartens steg 4 (MES-122, MES-139, MES-166) | Tas bort i etapp 1. Provkortet, platsförslaget för graveyard och animeringen "Put your library here" behövs inte. `bibSag` och `gravVakt` återanvänds |
| MES-85 (auto-graveyard) | Regeln står kvar, men Mesa sätter rutan |
| Grundläget (2026-09-10) | Ersätts av lekens exakta vinkel, automatiskt. Statusfältets fråga tas bort |
| `spegelmattan-principer.md` | Fall 4 (till graveyard) och fall 10 (till library) gäller högen där den ligger. "Ingen exile-plats i uppstarten" står kvar, och exile kommer via Nej-menyn i etapp 2 |
| Designytan "Mesa Table Piles" (A1, byggd i MES-125) | Ersätts i etapp 2 av D1: högarna bland korten, utan ramar, med en bricka. Den fasta högkolumnen (`HOG_LUFT`, `hogSkarm`) försvinner |

## Öppet, tas när det byggs

- **Starthanden nedvänd på bordet** ger flera baksidor före första kortet.
  Förslag: library är den hög som ligger kvar när de andra plockats upp.
- **Leken i plastfickor** med en egen baksida: poolen saknade fickans
  baksida (MES-247, MES-258). Kontrollera att detektorns `baksida` tar
  Jespers gröna fickor.
- **Två högar på samma sida**, till exempel graveyard och exile bredvid varandra.
- **"Not my library"**, se förslaget ovan.
- Hur länge kvittensen och "Not my graveyard"-raden ska stå (spegelmattan har ~6 s för "→ hand").
- Hur animeringen "en graveyard skapas här" ser ut. Det avgörs i designytan.

## Senare, med samma principer

- **Command zone** (Private beta · Commander): ett tredje val i Nej-menyn och en egen hög.
- **Minnet av spelarens bordsupplägg mellan partier**, till exempel att
  graveyard brukar ligga till höger om leken. Då kan sidoregeln användas
  redan innan första landet.
- **Bildens vridning** (`kamVand`) ställs fortfarande in för hand. Armarna
  kommer alltid in från spelarens kant, så det är nästa möjliga härledning.
- **Dra kort**: leken räknar ned och handen upp.

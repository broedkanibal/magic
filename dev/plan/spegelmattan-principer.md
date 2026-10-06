# Spegelmattan: principer för en lugn och levande matta

> Beslutat med Jesper 2026-10-02, i frågor och svar.
> Bygger vidare på design D i MES-292 ("När kameran vet"). Där de säger emot
> varandra gäller den här filen. Hur högarna och grundläget hittas står i
> [`hogarna-principer.md`](hogarna-principer.md) (MES-334), som bygger på den
> här filen.

## Läget 2026-10-06

Läs det här först. Resten av filen är besluten som de togs 2026-10-02, och
där läget har ändrats sedan dess gäller avsnittet.

**Designytan är klar men inte godkänd.** Sida 3, "Lugn matta", i
[Mesa Mirror Animations](https://claude.ai/artifact/EbDpd4ggjnb7cp7j3KuEhY)
har en prototyp med det fysiska bordet och mattan sida vid sida (källan:
`design_handoff_animeringar/src3/` och `gen3.mjs`, tiderna i
`TIDSLINJER-E.md`). MES-292 står i Behöver dig tills Jesper sagt ja. Inget av
det som återstår byggs i `index.html` förrän dess.

**Fyra saker bestämdes i designytan och väntar på Jespers bekräftelse:**

1. En flytt väntar inte på namnet. Vilar ett kort på en ny plats i samma stund
   som ett känt kort försvann, är det samma kort och bärs dit direkt. Namnet
   bekräftar i efterhand.
2. Untap i ett svep vrids med 150 ms mellanrum, ungefär handens fart.
3. Raden och sökrutan är på engelska, som resten av appen: "went to your hand",
   "Still on the table", "Which card is this?".
4. Sökrutan öppnas bredvid kortet, inte över det.

**Byggt sedan dess, av andra sessioner:**

| Vad | Var | Läge |
|---|---|---|
| Mattan ritas inte om från noll (grund 2 nedan). Varje kort behåller sitt element, och knuff, flytt, tap och zoom glider (FLIP) med D:s tider | MES-334 steg 2, `b757b86`; `matSynk` i `index.html`, provet `dev/mattan.cjs` | på main, MES-334 Redo att testas |
| Högarna har ingen fast plats. De ligger bland korten där de ligger på bordet, i utseendet D1, och följer mattans zoom | MES-334 sida 5 | på main |
| Uppstartens steg 4 (provkort, graveyard-plats, library-ruta) är borta i Mirror my table | MES-334 sida 5, `870ae6e` | på main |

**Issues som täcker delar av filen:**

| Issue | Del | Läge |
|---|---|---|
| MES-333 uppspelaren | grund 1 | Triage. Baslinjen blir main som den är nu, alltså redan med mattan utan omritning |
| MES-338 zoomstegen | "Mattan: zoomsteg" | Triage |
| MES-336 graveyard minns kort utan namn | framkallningen och sökrutan, för graveyard | Triage |
| MES-337 den fysiska exile-högen | ersätter inte "ingen exile-plats i uppstarten" | Triage |

**Utan issue än**, skapas när designytan är godkänd: bordets minne och
handzonen, kort som lämnar bordet (fall 1–11) och att nedtoningen tas bort,
framkallningen för nya kort på mattan, utspelets rörelse (lägg ned), tap i
spelarens ordning, och positionerna (perspektiv, dödzon, inga falska omlott).

**Ändrat av högarna (MES-334):**
- Fall 4 (till graveyard) och fall 10 (till library) gäller högen där den
  ligger bland korten, inte en fast hög nere till vänster.
- Graveyard finns först när spelaren svarat Yes på "Is this your graveyard?".
- Exile görs i appen och står på en fast plats bredvid leken.

Designytans sida 3 visar högarna så sedan 2026-10-06: graveyard och library ligger bland korten i D1, med brickan, och följer zoomen.

## Problemen, och varför de fanns 2026-10-02

| Det Jesper ser | Vad som händer i koden |
|---|---|
| Kort ploppar upp med "Reading the card…" och flimrar i sidled | En platshållare (`platsHtml`, `.plats`) ritas när telefonen ser något, och den följer rutan medan handen håller kortet. När namnet kommer skapas kortet och flyttas sedan till platsen där det vilar. Det blir två hopp |
| Kort gråas ut fast de ligger kvar | Spåret har varit borta i `BORTA_NAD` 5 s, så kortet tonas ned (`k.lyft`). Det beror oftast på kort omlott eller på att handen täckte kortet under en flytt. Gråtonen slår om utan övergång |
| En flytt blir: grått kort, nytt kort som laddar, det gamla försvinner | Telefonen ser en flytt som att ett spår dör och ett nytt föds. Det nya spåret får en platshållare, och när det kopplas till det väntande kortet ritas kortet om på den nya platsen |
| Tillstånden hoppar när handen går över korten | `kortChip` visar "Moving…" och "Reading…", och handen själv kan få en platshållare. Telefonen har ingen signal för att en hand är i bild, bara `skymd` per spår |
| Positionerna stämmer inte | `kamTillMatta` skalar kamerabilden rakt, utan rättning för kamerans vinkel. `AUTO_FLYTT` ignorerar rörelser under 15 % av kortbredden, och nedtonade kort står kvar där de sågs sist |
| Kort hamnar utanför bild | Mattan växer men krymper aldrig (`grown`), och zoomen följer mattans storlek (`fitZoom`), inte korten |
| Tap och flytt saknar animering | `avstamBord` kör `renderAll(true)`, som bygger om hela mattan från början. Kort som byggs om kan inte glida. Kamerans tap anropar inte `vridIn` |

**Grundorsaken:** mattan visar kamerans rådata nästan direkt, alltså spår som föds, dör och darrar. Den har inget eget minne av bordet, och den byggs om från noll vid varje uppdatering.

## Principerna

| # | Princip | I praktiken |
|---|---|---|
| 1 | **Bordet har ett eget minne** | Mattan är en lugn bild av bordet. Kamerans rådata syns aldrig, bara slutsatser |
| 2 | **Ett kort är samma kort hela vägen** | Från utspel till graveyard är det ett och samma digitala kort. En flytt är att kortet rör sig, aldrig att det försvinner på ett ställe och skapas på ett annat |
| 3 | **Handen fryser, den raderar inte** | Kort under och intill handen står stilla. Inga slutsatser dras om dem förrän handen lämnat området. Kort längre bort uppdateras som vanligt |
| 4 | **Ändra när kortet vilar** | Ett kort uppdateras när det ligger still på sin nya plats, i en enda rörelse, även när händerna jobbar med andra kort |
| 5 | **Ingenting ser ut att ladda** | Ingen skimmer, ingen text som "Reading…" eller "Moving…", ingen snurra |
| 6 | **Små skillnader är brus** | Darr och små knuffar syns inte. Kortet ligger där det ligger på bordet, men städat |
| 7 | **Mattan står still** | Alla kort syns alltid. Mattan zoomar sällan och i fasta steg, aldrig in av sig själv under ett parti |
| 8 | **Varje ändring har en rörelse** | Utspel, flytt, knuff, tap, untap, till handen och till graveyard. Korta, mjuka rörelser som kan avbrytas |
| 9 | **En tom plats visar att kortet gått** | Ett kort har lämnat bordet när platsen syns och är tom efter att händerna nära den gått. Att kortet rörde sig innan är ett extra bevis |
| 10 | **Osäkert betyder orört** | Kan kameran inte avgöra något ligger kortet kvar som det låg. Inga grå kort |
| 11 | **Mattan speglar din ordning och ditt tempo** | Tappar du fyra land efter varandra vrids de i samma ordning och takt. Mattan hittar inte på egna mönster |
| 12 | **Korta väntan först, dölj den sedan** | Farten är högsta prioritet. Den väntan som blir kvar döljs i rörelsen |

## Besluten, en händelse i taget

### Utspel

| Läge | Beslut |
|---|---|
| Namnet kommer inom ungefär 0,5 s | Ingenting syns innan. Kortet läggs ned färdigt, ~400 ms från spelarens håll (D) |
| Namnet dröjer mer än ~0,5 s | **Framkallningen:** ett oframkallat kort läggs ned på platsen. Det har Magic-ram, och de ytor som är unika för kortet (bild, namn, text) visar kamerans eget foto suddigt. När namnet kommer blir ytorna skarpa, ~300 ms |
| Namnet kommer strax efter 0,5 s | Skärpningen sker medan kortet läggs ned, så att det inte blir ett blink |
| Kortet får aldrig något namn | Det ligger oframkallat på sin plats med en markering. Klick öppnar en sökruta med autocomplete, först ur leken och sedan ur alla kort. Inga knappar med gissningar. När du bekräftat namnet tonas kortet in |
| Vad som får ge ett oframkallat kort | Bara något med ett korts form som ligger still. Aldrig en hand, aldrig något som rör sig |
| Vilka som ser det | Alla ser samma sak. Motståndarna behöver då en liten suddig bild. Det är ett nytt dataflöde, och det ska kollas mot MES-305 (dold information) |

**Det här ändrar ett mål.** I `dev/plan/etapper.md` är löftet "något syns på rätt plats inom 0,3 s". För kort vars namn dröjer blir det 0,5 s. Etapperna ändras när helheten är beslutad.

**Avfärdat:**
- En kortbaksida medan vi väntar. I Magic betyder ett nedvänt kort något (morph, manifest), så den skulle säga något som inte är sant.
- En räknare utanför mattan, eftersom det är en laddtext på en annan plats.
- Att visa den bästa gissningen direkt och rätta den sedan, eftersom motståndarna skulle se fel namn.

### Flytt och knuff

| Läge | Beslut |
|---|---|
| Du bär ett kort | Ingenting händer på mattan. Kortet står kvar orört på sin gamla plats |
| Kortet ligger still på sin nya plats | Det lyfts, bärs dit och sätts ned i en rörelse, ~450 ms (D). Det gäller också med händer kvar i bild på andra ställen |
| Lyft, läst och lagt tillbaka på nästan samma plats | Ingenting händer |
| En knuff medan kameran ser kortet hela tiden | Kortet glider dit, ~220 ms (D). Darr under dödzonen syns inte |

### Handen

- **Lokal handzon:** kort under och intill handen fryser, och inga slutsatser dras om dem förrän handen lämnat området.
- **En hand som vilar längre bort spelar ingen roll.** Det gäller också vid bordskanten, för då räknas bara händer nära kortet.
- **Signalen** byggs av det telefonen redan har: spår som är skymda (`skymd`, täckning ≥ 0,6) och rörelse utan ett korts form. En egen handklass i den tränade detektorn (MES-288/329) kommer bara om det här inte räcker, eftersom den kräver träningsdata.

### Kort som lämnar bordet

**En regel ändras:** i dag får kameran bara lägga till och vrida kort ("att ta bort ett kort är alltid människans beslut", kommentaren i `index.html` vid `BORTA_NAD`). Nu flyttar kameran själv ett kort till handen, och du kan ändra det. Jesper beslutade det 2026-10-02.

| # | Fall | Vad kameran ser | Beslut |
|---|---|---|---|
| 1 | Till handen | Platsen syns och är tom när händerna nära den gått. Graveyard växte inte, och kortet syns inte någon annanstans | Kortet glider mot nederkanten, mot handen. Raden "Llanowar Elves → hand · ändra" visas i ~6 s, och gör du inget står det fast. Du kan ändra till **Exile**, **Ligger kvar** (kortet flyger tillbaka) eller **Library** |
| 2 | Lyft och lagt tillbaka | Kortet ligger still igen nästan på samma plats | Ingenting |
| 3 | Flyttat | Kortet ligger still på en ny plats | Det bärs dit |
| 4 | Till graveyard | Högen växer | Kortet flyger till högen (`flygTillGrav`, D:s 400 ms) |
| 5 | Täckt av ett annat kort, eller av utrustning eller aura som fästs | Spåret dör, och ett annat kort ligger nu där | Kortet ligger kvar orört, och ingen fråga ställs |
| 6 | Vänt nedåt (morph, manifest) | Samma plats, men kameran ser en baksida | Det blir ett nedvänt kort på samma plats |
| 7 | En token lämnar bordet | Token-spåret försvinner som i fall 1 | Tokenen tonas ut, eftersom en token inte kan vara i handen. Ångra finns en stund |
| 8 | Telefonen knuffad, eller ljuset slår om | Tre eller fler spår dör samtidigt, utan att korten rört sig | Ingenting på mattan ändras. Kameran ankras om när bilden lugnat sig |
| 9 | Kortet kommer tillbaka från handen | Samma namn dyker upp igen | Det spelas ut som vanligt, från spelarens kant |
| 10 | Till library | Kortet bärs till library-högen | Det glider till library-högen (`flygTillBib`) |
| 11 | Instant eller sorcery som spelats | Som i dag (`SPELL_MS`) | Graveyard |

- Ingen exile-plats i uppstarten nu. Exile väljs i raden vid nederkanten.
- "Till motståndaren" (kontrollbyte) finns inte bland valen.

### Nedtoningen tas bort helt

Med reglerna ovan blir inget kort grått. `.card.lyft`, chippen "Where did it go?" och "Camera lost it", och bannern "The camera can't see N cards" ersätts av fall 1, 5, 8 och 10. Ligger ett kort kvar digitalt fast det är borta tar spelaren bort det själv.

### Tap och untap

- Kortet vrids bara när kameran är säker (MES-293).
- Det animeras, ~240 ms SOFT med ett litet lyft (D), precis som tap för hand.
- Ordningen och tempot följer dina. När kameran ser flera kort på en gång, för att handen täckte dem, vrids de i den ordning handen rörde vid dem.

### Positionerna: trogen plats, städad

- Kortet ligger där det ligger på bordet, med rättning för kamerans vinkel (perspektiv).
- Darr och små knuffar under en dödzon syns inte. Den är i dag 15 % av kortbredden (`AUTO_FLYTT`), och storleken prövas i uppspelaren.
- Kort som inte ligger omlott på bordet gör det inte heller på mattan. Det som ligger omlott fysiskt, som landhögar och fästa kort, visas som högar.
- Knuffas telefonen ändras inte mattan, eftersom bara kamerans räkning ankras om (fall 8).

### Mattan: zoomsteg

| Regel | Hur |
|---|---|
| Zoomsteg, inte glidande zoom | 4–5 fasta nivåer |
| Nytt steg när ett kort inte får plats | Steget ger plats för ungefär två kort till åt vänster, åt höger och uppåt |
| Zoom och centrering i en rörelse | ~500 ms, samtidigt som kortet som behövde platsen läggs ned |
| Golv | Aldrig längre ut än hela kamerabilden |
| Aldrig in av sig själv | Bara när ett nytt parti börjar. Spelarens egen zoom fungerar som i dag |

### Rörelserna

- D:s tider och easings (`design_handoff_animeringar/TIDSLINJER.md`) är utgångsläget. **Tempot bestäms i designytan**, där Jesper provar med reglagen.
- Minskad rörelse (`prefers-reduced-motion`) ger bara toning, som i D.

## Grunden som måste byggas först

Det här är inga designval, men allt ovan bygger på dem.

| # | Vad | Varför |
|---|---|---|
| 1 | **Uppspelaren** (byggs först) | Ett inspelat parti med videon bredvid mattan, med de riktiga animeringarna, och med paus och spola. Den räknar hopp, kort som bytts ut i stället för flyttats, kort som felaktigt gått till handen, tid till första synliga och tid till rätt plats. Den mäter dagens läge innan något ändras |
| 2 | **Mattan byggs inte om från noll** | Varje kort behåller sitt element hela livet, och rörelser blir transform-animeringar som kan avbrytas (FLIP). **Byggt 2026-10-04 i MES-334 steg 2** (`matSynk`) |
| 3 | **Bordets minne** | Ett lager mellan kamerans spår och mattan, som drar slutsatser (principerna 1, 3, 4, 9, 10) |
| 4 | **Handzonen** | Från det telefonen redan skickar (`skymd`, `kortlik`, `vilar`) |
| 5 | **Perspektivrättningen** | `kamTillMatta` i dag är rak skalning |

**Uppspelarens underlag finns redan:**
- `dev/spegelfacit` spelar upp bordsloggen genom `avstamBord`.
- `dev/dubbletter.cjs` spelar upp rapporter.
- v2-facit för partiet 2026-09-21 beskriver varje kort i varje ruta.

Inget av dem ritar mattan. Det är det nya.

## Vad det här ändrar i det som redan finns

| Var | Ändring |
|---|---|
| MES-292, design D | Platshållaren tas bort, som i D. "Inget kort förrän namnet" kompletteras med framkallningen. Lägena "nedtonat" och "tillbaka" utgår. "Till handen" och zoomstegen tillkommer |
| MES-291 (5 s väntan) | Ersätts av handzonen och den tomma platsen |
| MES-248 (kort som lämnar bilden) | Fall 1, 7 och 10 täcker en stor del. Stäm av innan den byggs |
| MES-245 (spelytan) | Behövs inte för zoomen, eftersom golvet är hela kamerabilden |
| `etapper.md` | Löftet blir 0,5 s för kort vars namn dröjer |

## Öppet, tas i designytan eller när det byggs

- Hur suddiga ytorna ska vara, och om 0,5 s är rätt tröskel.
- Den gröna ringen efter utspel (`nypuls`, D): ska den behållas när kortet framkallas?
- Om det är okej att dela en liten suddig bild med motståndarna (MES-305).
- Vad som händer om kameran inte går att ankra om efter en knuff. I dag är det bannern.
- Hur stor handzonen är.
- Hur stor dödzonen är.

## Ordningen (förslag, inte beslutad)

1. Uppspelaren och mätningen av dagens läge (MES-333).
2. Designytan "Mesa Mirror Animations" uppdaterad med besluten. Jesper provar tempot. *(Sida 3 finns, väntar på Jespers ja.)*
3. Mattan utan omritning, och animeringar för det som redan finns: tap, flytt och utspel. *(Omritningen, tap, flytt och zoom är byggda i MES-334 steg 2. Utspelets rörelse återstår.)*
4. Bordets minne, handzonen och kort som lämnar bordet.
5. Framkallningen.
6. Positionerna (perspektiv, städat) och zoomstegen.

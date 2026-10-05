# Högarna utan uppstart: resultatet av orkestreringen (MES-334, 2026-10-04)

> En orkestrerande session (Opus 5.5) körde del A och del B i
> [`prompt-hogarna-matning-och-etapp-1.md`](prompt-hogarna-matning-och-etapp-1.md) från 05:20 den 4 oktober
> till natten mot den 5 oktober. Alla agenter körde på Opus 5.5.
> **Bygget är halvvägs:** steg 1 och 2 ligger på main och är ute i produktionen, steg 3 ligger på en gren,
> och steg 4–6 återstår. Jesper valde att avsluta här och köra steg 4–6 i en ny, snålare session:
> [`prompt-hogarna-steg-4-6.md`](prompt-hogarna-steg-4-6.md).

## Sammanfattning

| Del | Läge | Var |
|---|---|---|
| **A · Mätningen** | ✅ Klar | [`hogarna-matning.md`](hogarna-matning.md), commit 700fd11 |
| **0 · Baslinjen** | ✅ Klar | `dev/material/arbete/2026-10-04-hogarna-matning/baslinje.md` (lokalt) |
| **1 · Vinkeln per kort** | ✅ På main, ute | e138dae (ovanpå en annan sessions "minnet av remsor steg 3", 261803e) |
| **2 · Mattan ritas inte om från noll** | ✅ På main, ute | 5da8fc0 |
| **3 · Leken** | Byggt och granskat i tre varv, **inte på main** | grenen `mes-334-steg3` (7bc8564), pushad som gren |
| **4 · Graveyard, 5 · Högarna bland korten, 6 · Steg 4 bort** | Inte påbörjade | ny session |

## Grindarna

| Grind | Dom |
|---|---|
| **G1 · Vinkeln per kort** | **Klarar.** 71 av 71 helt synliga kort inom ±10° av facits hörn (krav 95 %), median 0,7°. Dagens metod klarade 57 av 71. Nämnaren är golden 03–06 och 13–18; 01, 02 och 07–12 saknar hörn i facit |
| **G2 · Leken hittas** | **Uppfylld för partiet 09-22** (leken still 28 s före första kortet, låda i 137 av 141 rutor). **Partiet 09-21 går inte att mäta:** kamerabilden saknas de första ~46 s. Enligt grinden byggdes det ändå |
| **G3 · Inget blir sämre** | Steg 1: bättre (se nedan). Steg 2: oförändrat (kamerans kod orörd). Steg 3: golden lokalt LIKA BRA/BÄTTRE, 0 fel namn — med en känd rest utan uppstartens ruta (nedan) |

## Vad som byggdes

### Steg 1 · Vinkeln per kort

- Kortets vinkel mäts inne i detektorns raka låda med A2:s metod "pkomb" (gradientriktningar + namnremsan),
  i en egen modul `KortVinkel` före Kamera-blocket. Vinkeln räknas bara när lådan ändras, högst fyra kort per ruta.
- **Bara en långsida som remsan ger är säker.** Den sätter `sparVinkel().matt` och får vrida beskärningen.
  Formens långsida får ge tap-domen när den är tydlig, men aldrig vrida eller låsa (rättelse 2, efter att
  granskningen visat att en hand i lådan kunde ge fel långsida).
- Tap-domen: tappat = mer än 45° från referensvinkeln (mod 180). Mattan ritar alltid 0°/90°.
- **API till steg 3:** `Kamera.satGrundGrader(g)`, `Kamera.foljGrundGrader(g)` (flyttar referensen först vid
  ≥ 8°, `T.grundKnuff`), `Kamera.sparVinkel(id)` → `{grader, matt, kalla, upp}`, `Kamera.grundGrader`. Grader =
  långsidan från bildens x-axel, medurs, mod 180; ett stående otappat kort är 90.

| Mått (golden lokalt 01–18, mot B0) | Före | Efter |
|---|---|---|
| Fel namn | 0 | **0** |
| Hittade | 118 | 118 |
| Rätt namn | 92/119 | **95/119** |
| Utlagda med namn (videofall) | 28/42 | 30/42 |
| Tap sedda | 11/29 | 14/29 |
| Falska tap-flippar | 6 | 5 |
| `--utan-leken`, fel namn | 6 (kända) | 6 (samma sex) |
| Kamerabänken | 169 OK | 191 OK |

**Verifierat på det ihopslagna läget (e138dae), samma profil och port:** bänken grön (kamerabänken 192, avstämningen
186, mattan 32, lekfotot och lekslag 0 FEL); golden lokalt 01–08 LIKA BRA (51/52), 09–18 44/67 mot 41, 0 fel namn,
falska 1 → 1; golden med Claude (MES-334:s andra `--ai`) 01–08 52/52 och 09–17 41/57 mot 40, 0 fel namn.
**Fall 18 med Claude gav 1 fel namn — också på main utan steg 1** (261803e, en annan sessions "minnet av remsor
steg 3", omkört med `--detalj`); baslinjen 828ad87 hade 0. Felet följer alltså inte steg 1. Enligt MES-331-sessionen
är det ett **tokenspår** (Soldier ovanpå Ancestral Blade i hög C) som Claude ger det säkra namnet "Ancestral Blade";
kor.html räknar ett säkert namn på ett tokenspår som fel namn. 261803e innehåller både remsminnet steg 3 och
MES-334 steg 2 (5da8fc0), så orsaken är inte avgjord: MES-331-sessionen kör `--ai --fall 18` på 5da8fc0 och på main.

**Följd för steg 3–6:** leken har ingen namnremsa och får därför aldrig `matt`. Lekens vinkel blir alltså inte
grundläge av sig själv efter omläggningen. Nästa session måste ge leken en egen, strängare väg (formens vinkel
när leken ligger still, utan hand, med samma axel över tid) — se prompten.

### Steg 2 · Mattan ritas inte om från noll

- `matSynk` ändrar befintliga element i stället för att bygga om med `innerHTML`. Varje kort behåller sitt
  element, också hos motståndaren. Flytt, tap och mattans zoom är avbrytbara FLIP-animeringar med TIDSLINJER:s
  tider; skuggan ligger i ett eget lager (strålkastaren `.aktuell` orörd); `prefers-reduced-motion` ger toning.
- En hög kan vara en post med egen nyckel (`h:bib`) som behåller sitt element och glider — grunden för steg 3–5.
- Nya vyer (dold ritning, nytt parti, motståndare in/ut, nivåbyte) ritas på plats utan glidning.

| Mått | Före | Efter |
|---|---|---|
| Bänken | 469 OK | grön, nytt prov `dev/mattan.cjs` 32 OK (9 OK / 23 FEL mot basen) |
| Omritning av 40 kort | 3,9–4,0 ms | 1,0–1,5 ms |
| Spegelfacit | 29/60 syntes, 25/60 rätt | oförändrat |

Kvar som avvikelse från TIDSLINJER: skalan tar inte med farten vid ett avbrott.

### Steg 3 · Leken (på grenen `mes-334-steg3`)

- **Telefonen:** utan uppstartens ruta hittar en lekvakt leken bland detektorns baksidelådor (ensam hög, still,
  inte vid bildkanten). Flera högar → den som ligger kvar. Upplockad kräver två vittnen: ingen låda på 1,5 s
  *och* platsen tom i masken 2 s i följd (handen fryser). Grundläget ur leken, eller ur första kortets vinkel
  när leken saknas. Mesa sätter lekens ruta själv medan leken ligger. Sleeves-färgen = median över 8 rutor.
- **Datorn:** "Put your library on the table" → "Play your first card when you're ready" → borta vid första
  kortet. Leken bland korten i D1 med brickan **"Library"** (utan tal, Jespers beslut), menyn med *Not my
  library*, "Library · Picked up" med skuggan kvar, och leken glider till sin nya plats. Leken delas utan namn;
  motståndarna ser sleeves eller baksida.
- Bänken på 7bc8564: kamerabänken 198 OK, `dev/leken.cjs` 44 OK, mattan 32 OK, avstämningen 186 OK.
- Golden lokalt (på f45c5e0, före rättelse 4): 01–08 BÄTTRE (07: dubbletter 1 → 0), 09–18 LIKA BRA, 0 fel namn.
  `--utan-leken`: samma 6 fel namn som baslinjen.

## Vad som mättes (del A)

Allt står i [`hogarna-matning.md`](hogarna-matning.md). Kort:

- Sidoregeln fungerar om den bara räknar kort **i lekens rad** (0 fel frågor mot 3 och 2).
- "Kort ovanpå kort" måste undanta **fästa** kort (bakre kortet sticker ut 10–25 %).
- Alla 33 graveyard-kort i de två partierna låg överst minst 0,8 s → fotot efter 0,5 s räcker (MES-336).
- "Picked up" går inte att avgöra med detektorn ensam: en hand över leken och en tom plats ser likadana ut.
- Detektorns `baksida` hittar leken i 97–100 % av rutorna när den ligger still, också i gröna fickor; 0 falsklarm
  i golden 01–16, men fyra stilla falska lådor på kompisens stökiga bord (golden 17).

## Vad granskningarna hittade

Varje steg granskades av fristående agenter som inte byggt steget. Varje rättelse granskades igen.

| Steg | Varv | Fynd (blockerande / viktiga / små) | Exempel på det som hittades |
|---|---|---|---|
| 2 | 1 | 0 / 1 / 2 | zoomen gled efter en dold ritning |
| 2 | 2 | 0 / 1 / 3 | skuggan animerades på kortet, så strålkastaren under arket blinkade bort |
| 2 | 3 | 0 / 0 / 2 | kort hoppade till slutet efter ett nivåbyte; långsam skuggläsning med 40 kort |
| 2 | 4 | 0 / 0 / 1 | pillret hoppade medan kortet gled |
| 3 | 1 | 0 / 3 / 4 | ingen egen ruta för leken; grundläget nollades när datorn sparade kamerainställningen; leken hoppade till en annan hög |
| 3 | 2 | 0 / 1 / 4 | regression: en upplockad lek kunde fastna som Picked up hela partiet |
| 3 | 3 | 0 / 1 / 2 | ett tidsfönster lät leken hoppa till en nedvänd hand |
| 1 | 1 | 0 / 2 / 4 | fel långsida med en hand i lådan; tap-domen för kort utan namn jämförde mot fel lådor |
| 1 | 2 | 0 / 1 / 4 | rättelsen fångade inte sitt eget fall (golden 18) — därför "bara remsan är säker" |

Inget varv hittade ett säkert fel namn. Rättelse 4 av steg 3 (7bc8564) och steg 1:s rättelse 2 (21b451b, kontrollerad av orkestreraren) är inte granskade
separat; de ingår i nästa sessions helgranskning av steg 3–6.

## Vad som valdes där underlaget var oklart

| Val | Varför |
|---|---|
| Steg 3–6 slås ihop på main **tillsammans** (steg 3 väntar på en gren) | Byggunderlaget: sida 5 i *en* leverans. Steg 1 och 2 står på egna ben och slogs ihop när de var gröna |
| "Ligger still", "andra sidan om leken", "inte fäst", "platsen tom" genomförs med del A:s mått (still ≥ 1,5 s, i lekens rad, sticker ut 10–25 %, tom ~2 s med två vittnen) | Förslag ur mätningen som genomförande av reglerna, inte ändrade beslut |
| En hög som syns under passets första 3 s blir bara leken om den är ensam | Annars får golden 13 och 18 aldrig sin lek — de börjar med leken i bild |
| Brickan "Library" utan tal | **Jespers beslut** 2026-10-04 (frågat i sessionen): Mesa vet inte när kort dras |
| Zoomen glider i en synlig vy men ritas på plats vid vybyten | Steg 2:s prompt bad om transform-animering för zoom; zoomstegen själva är MES-338 |
| Steg 1 vrider bara beskärningen när remsan ger riktningen | Osäkert = orört; formens riktning gav fel långsida med en hand i lådan |

## Vad som fattas

- **Steg 4–6** (graveyard, högarna bland korten, uppstartens steg 4 bort): [`prompt-hogarna-steg-4-6.md`](prompt-hogarna-steg-4-6.md).
- **Golden 18 utan uppstartens ruta:** 7 hittade / 1 rätt namn mot 9 / 2 med rutan. Orsaken är **okänd**
  (korten som skiljer ligger 3–4 kortbredder från leken); nio varianter av lekens egen ruta gav högst 8 / 1.
  Golden kör i dag med facits ruta, som uppstarten. Steg 6 tar bort uppstarten, så skillnaden måste hittas eller
  redovisas där.
- Golden 07: en falsk "lek" vid 30,6 s efter första kortet (en inbränd ram i videon).
- Ett nedvänt kort på lekens gamla plats tas för leken vid första lyftet efter en flytt (Not my library rättar).
- Riktig telefon är oprovad för allt: vinkelns kostnad på telefonen, upplockad lek med en riktig hand,
  sleeves-färgen under lampan, mattans tempo.
- `dev/spegelfacit/kor.cjs` väntar på en pool om 114 kort; poolen är 168. Kör med `--tunn-pool` tills det rättats.
- **Golden 18 med Claude har 1 fel namn på main** sedan 261803e eller tidigare (ett tokenspår som Claude namnger;
  inte steg 1; om det är remsminnet eller steg 2 prövar MES-331-sessionen). Nästa sessions `--ai`-körning
  jämförs mot det, inte mot 0, tills orsaken är hittad.

## Hur körningen gick (lärdomar)

- **För långsamt och för dyrt:** ~20 timmar och ~10 M agent-tokens för del A och steg 0–3. Mest i granskningsloopar
  (varje granskare läser in index.html från noll, ~300–450k tokens) och i golden-körningar som köade på ett lås.
  Jesper valde mitt på dagen ett snålare upplägg (minnet `snal-matning-vid-orkestrering`), och resten körs så.
- **Disken blev full** 05:40 (växlingsminnet + tre Python-jobb). npm- och pip-cacherna tömdes (~3,8 GB); på
  Jespers fråga togs gamla golden-profiler och trädkopior bort i två avslutade sessioners scratchpadar (~4,7 GB).
- **Pushen till main nekades först** av behörighetskontrollen i auto-läget; Jesper godkände den sedan i chatten.
- Ett mätlås (`matlas.sh` i sessionens scratchpad) höll golden, bänken och tunga Python-jobb till en åt gången.
- En golden-körning med "⏱ tak" på ett fall är ogiltig — fallet slog i tidstaket under last.

## Inspelningslistan (ur del A)

Ur [`hogarna-matning.md`](hogarna-matning.md), avsnittet "Inspelningslistan (skärpt)". Spela in med **"Keep the
picture on"**, klappa två gånger för synk, starta **innan leken läggs ner**, spela in telefonens egen film utan
Mesas spårrutor, gör uppstarten **utan** steg 4, och säg högt vad du gör.

| # | Vad du gör | Vad den mäter | Regeln den prövar |
|---|---|---|---|
| 1 | Partistart med kameran igång: blanda, dra sju, **lägg ner leken stående**, spela ett land, passa | När leken dyker upp, hur länge den ligger still, att den är den enda baksidelådan; tiden till första kortet | Library = nedvänd hög som ligger still före första kortet |
| 2 | Samma, men **leken på tvären**, korten åt samma håll som leken | Att lekens vinkel blir otappat också 90° mot bildens axel, och att tap-domen följer den | Otappat = lekens vinkel |
| 3 | **Thriving Heath (tappad) som första land**: a) med leken i bild, b) utan | a) tap-domen mot leken; b) reserven: ger ett tappat första kort ett grundläge 90° fel? | Första kortet utan lek ger vinkeln |
| 7 | **Discard på tur 1** före något land: ett kort, sedan ett till rakt ovanpå. Fäst en utrustning senare | Att reserven slår till på andra kortet; hur mycket det fästa kortet sticker ut | Kort ovanpå kort, utom fästa |
| 8 | En varelse på andra sidan om leken **i lekens rad**, för att det är trångt | Om sidoregeln med lekens rad frågar fel; hur Nej → Permanent ser ut | Sidoregeln; Nej-menyn |
| 9 | **Leken lyfts** för en sökning, blandas och läggs tillbaka **på en ny plats** | Hur länge platsen är tom, om ett bildmått skiljer den från en hand; att leken glider och vinkeln följer | Picked up |
| 10 | **Mill 3** i en rörelse | Att högen räknar en ändring; hur länge översta kortet syns | Fler kort hör till samma fråga; MES-85 |
| 12 | **Starthanden nedvänd** medan du funderar på mulligan; ta mulligan och lägg ner leken igen | Flera baksidelådor före första kortet, vilken som ligger kvar, överlappande lådor; Picked up före första kortet | Flera högar: library = den som ligger kvar |
| 13 | **Leken ~20–30° snett**, några kort 30–45° från bildens axel, otappade och tappade | pkomb där den är svagast, tap-marginalen med sned lek | Vinkeln per kort; tappat > 45° |
| 14 | **Stökigt bord**: sladdar, en ask, telefonens skugga, lösa baksidor vid kanten, allt på plats innan leken | Falska baksidelådor som ligger still; vad förslaget tar bort | Library-regeln; högar vid kanten ignoreras |
| 15 | Ett **uppvänt vitt kort i lampans blänk** som ligger still | Om det får en baksidelåda och visas som nedvänt kort | Ett ensamt nedvänt kort visas |

Punkterna 4, 5, 6, 11 och första halvan av 10 är redan besvarade av partierna 09-21 och 09-22 (se del A).

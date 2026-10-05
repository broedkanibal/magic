# Högarna utan uppstart: resultatet av orkestreringen (MES-334, 2026-10-04 och 2026-10-05)

> En orkestrerande session (Opus 5.5) körde del A och del B i
> [`prompt-hogarna-matning-och-etapp-1.md`](prompt-hogarna-matning-och-etapp-1.md) från 05:20 den 4 oktober
> till natten mot den 5 oktober. Alla agenter körde på Opus 5.5. Steg 4–6 byggdes den 5 oktober i en ny,
> snålare session ([`prompt-hogarna-steg-4-6.md`](prompt-hogarna-steg-4-6.md)).
> **Läget 2026-10-05 kl. 20:** steg 1 och 2 ligger på main och är ute. Steg 3–6 är byggda, granskade i tre varv
> och gröna i bänken och i lokal golden, men **inte ihopslagna**: golden med Claude ger ett säkert fel namn i
> fall 05 som main inte ger (avsnittet *Där det stannade*). Allt ligger på grenen `mes-334-sida5` (6002cd0, pushad).

## Sammanfattning

| Del | Läge | Var |
|---|---|---|
| **A · Mätningen** | ✅ Klar | [`hogarna-matning.md`](hogarna-matning.md), commit 700fd11 |
| **0 · Baslinjen** | ✅ Klar | `dev/material/arbete/2026-10-04-hogarna-matning/baslinje.md` (lokalt) |
| **1 · Vinkeln per kort** | ✅ På main, ute | e138dae (ovanpå en annan sessions "minnet av remsor steg 3", 261803e) |
| **2 · Mattan ritas inte om från noll** | ✅ På main, ute | 5da8fc0 |
| **3 · Leken** | Byggt och granskat, **inte på main** | grenen `mes-334-sida5` (omlagd på main, 6002cd0) |
| **4 · Graveyard, 5 · Högarna bland korten, 6 · Steg 4 bort** | Byggda och granskade i tre varv, **inte på main** | samma gren; stoppade av fall 05 med Claude |

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
kor.html räknar ett säkert namn på ett tokenspår som fel namn. **Avgjort samma natt:** MES-331-sessionen körde
18 med Claude omväxlande — 0 av 3 fel på 5da8fc0 (MES-334 steg 2), 3 av 4 efter remsminnet steg 3 (261803e), och
tokenspåret uppstår bara efter. Remsminnet steg 3 är borttaget från main (2db6621). MES-334 steg 1 och 2 är friade.

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

### Sida 5, 2026-10-05: steg 0 och 4–6 (grenen `mes-334-sida5`)

En byggare (mesa-bygg, Opus) gjorde allt i följd på en gren; en granskare läste hela diffen, två till kontrollerade
rättelserna. Detaljerna, med funktionsnamn: `dev/material/arbete/2026-10-04-hogarna-matning/steg4-6-rapport.md`
(lokalt) och granskningarna `granskning/sida5-granskning.md`, `sida5-kontroll.md`, `sida5-kontroll2.md`.

| Commit | Vad |
|---|---|
| c89ed37 · steg 0 | steg 3 omlagt på main med steg 1; leken får en egen, strängare väg till grundläget (`lekVinkel`: still, en låda, ingen hand, tre nya mätningar ±5° över ≥ 2 s; `lekGrund.exakt`). Uppmätt i golden 10, 11, 13: 87,8–91,3° |
| 794a988 · steg 4 | graveyard ur spelet: sidoregeln (i lekens rad) och kort ovanpå kort (≥ 90 % täckt) ger "Is this your graveyard? Yes · No" ovanför högen, bara för ägaren; Yes → graveyard där den ligger + telefonens ruta (MES-85); No → Permanent / Ignore this spot (`gravFragaSteg`, `gravSvar`) |
| ee1c1d3 · steg 5 | högarna bland korten i D1: graveyard där den ligger med brickan "Graveyard N", brickan behåller sin storlek i zoomen, ensamma nedvända kort visas; delas utan namn |
| 870ae6e · steg 6 | uppstartens steg 4 bort **i Mirror my table** (provkort, Card direction, graveyard-plats, library-ruta, statusfältets fråga om grundläget). Use camera to add cards behåller steget (Jespers beslut, MES-339) |
| c32d5ec · rättelse 1 | Ignore-zonerna glöms vid nollställning; grundläget skrivs till raden och överlever en omladdning; graveyard-rutan ur korten, oberoende av riktning; spärren medan uppstarten står öppen tillbaka |
| 4ea0759 · rättelse 2 | **Jespers beslut:** ensamma nedvända kort och leken som läggs ner igen visas lika fort som ett vanligt kort (0 ms med kortstorlek, annars 150 ms; förut 3000 resp. 1500 ms) |
| ec7b2b9 · rättelse 3 | Ignore gäller också efter Yes; leken flyttar till den nya högen när platsen sett tom ut > 450 ms och ritas aldrig som nedvänt kort; ett uppvänt kort på ett nedvänt tappas inte |

**Mätt på det sammanslagna läget** (31c5480 = main 36ebf2a + grenen, inte pushat), profilen golden-tmp, port 8271, pool 168:

| Prov | Resultat |
|---|---|
| `dev/kolla.sh` | grön (avstämningen 199, kamerabänken 239, leken 45, högarna 42, mattan 32, lekfoto 84/56/48 …) |
| Golden lokalt (byggaren, efter steg 6) | 95/119, 0 fel namn — som main |
| `--utan-leken` | 54 rätt, samma sex fel namn som main |
| `--utan-bib` 10, 11, 13, 17 (efter rättelserna) | 9/24 rätt, 0 fel namn, 1 falsk — som efter steg 6 |
| `--utan-bib` 18 | 8 hittade / 3 rätt mot 9 / 4 med facits ruta (glappet var 7/1 mot 9/2 i steg 3) |
| **Med Claude, 01–17** | 93/109 rätt (var 92), **1 fel namn i 05** (var 0) |
| Med Claude, 18 | 4/10 (var 3), 0 fel namn |

## Där det stannade: fall 05 med Claude (2026-10-05 kl. 20)

**Felet:** Pacifism (spår 1, hög B ovanpå/under Scourge of the Undercity) blir säkert **Scourge of the Undercity**
via helbilden (`varfor: helbild`) — fast spår 6 redan är säkert Scourge ur remsan. Kortets egen fråga ger klungan
"Scourge, Pacifism" osäker. Samma hög är MES-331:s kända klunga-fälla, men den här vägen går genom helbilden.

**Mätt, fall 05 med Claude, tre körningar per steg, om växlande, samma profil och port:**

| Kod | Fel namn |
|---|---|
| main 36ebf2a | 0 · 0 · 0 |
| 208ca99 (steg 3:s första commit) | 0 · 0 · 0 |
| ad4b5b2 (steg 3 klart, före steg 0) | 1 · 1 · 0 |
| c89ed37 (steg 0) | 0 · 0 · 0 |
| ee1c1d3 (steg 5) | 0 · 1 · 1 |
| 870ae6e (steg 6) | 1 · 0 · 0 |
| 4ea0759 (rättelse 2) | 0 · 0 · 0 |
| ec7b2b9 / 31c5480 (allt) | 1 · 0 · 1 · 1 |

Före steg 3:s andra commit: 0 av 6. Efter: 8 av 19. Felet är slumpartat (Claudes helbild svarar olika) men
kommer in med **steg 3 (leken), mellan 208ca99 och ad4b5b2**. Fall 05 hittar ingen lek (`ingen lek vald`), så det
är inte lekens ruta som lägger kortet. **Misstankar, inte prövade:** (1) lekvaktens arbete per ruta flyttar
*när* helbilden skickas, och helbildens fördelning av svaret på spåren (`tillampaHelbild`) har en svaghet som main
råkar slippa; (2) helbilden ger ett andra säkert Scourge fast leken bara har ett och ett annat spår redan bär
namnet — antalsspärren (`lekTak`/dubblettregeln) verkar inte gälla helbildens namn. Utskrifterna:
`/private/tmp/claude-501/-Users-jesperfunk-Code-magic/efd1c35f-2a55-4b48-8dad-5e911547e617/scratchpad/bisekt/`
och `…/f05/` (JSON per körning, `spar[].varfor`, `helbild`).

**Nästa steg:** en mesa-bygg-tung som (1) prövar misstanke 2 i koden — gäller lekens antal helbildens namn? — och
(2) kör 05 med Claude fler gånger på main för att veta mains egen frekvens. Rättas det i helbildens väg är det en
ändring som rör 0 fel namn även på main. Sedan: ihopslagningen enligt prompten (merge-tree + bänk + `--ai`).

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

| 3–6 (sida 5) | 1 | 0 / 4 / 4 | Ignore this spot blev en osynlig zon för alltid; grundläget överlevde inte en omladdning; graveyard-rutan för låg efter Yes; en nedvänd hand blir ett nedvänt kort (V2, Jesper accepterade) |
| 3–6, rättelse 1+2 | 2 | 0 / 4 / 5 | regression: Ignore + Yes gav tillbaka den ignorerade högen; leken visades som nedvänt kort efter en flytt; ett uppvänt kort på ett nedvänt tappades |
| 3–6, rättelse 3 | 3 | 0 / 1 / 3 | K2-1: lyft lek + nedvänt kort + leken tillbaka inom 0,6–2 s → Library hamnar på det nedvända kortet (känd rest) |

Inget granskningsvarv hittade ett säkert fel namn. Felet i fall 05 hittades av golden med Claude, inte av granskningen.
Rättelse 4 av steg 3 granskades i helgranskningen av sida 5 (RP2, RP7, RP8 — håller).

## Vad som valdes där underlaget var oklart

| Val | Varför |
|---|---|
| Steg 3–6 slås ihop på main **tillsammans** (steg 3 väntar på en gren) | Byggunderlaget: sida 5 i *en* leverans. Steg 1 och 2 står på egna ben och slogs ihop när de var gröna |
| "Ligger still", "andra sidan om leken", "inte fäst", "platsen tom" genomförs med del A:s mått (still ≥ 1,5 s, i lekens rad, sticker ut 10–25 %, tom ~2 s med två vittnen) | Förslag ur mätningen som genomförande av reglerna, inte ändrade beslut |
| En hög som syns under passets första 3 s blir bara leken om den är ensam | Annars får golden 13 och 18 aldrig sin lek — de börjar med leken i bild |
| Brickan "Library" utan tal | **Jespers beslut** 2026-10-04 (frågat i sessionen): Mesa vet inte när kort dras |
| Zoomen glider i en synlig vy men ritas på plats vid vybyten | Steg 2:s prompt bad om transform-animering för zoom; zoomstegen själva är MES-338 |
| Steg 1 vrider bara beskärningen när remsan ger riktningen | Osäkert = orört; formens riktning gav fel långsida med en hand i lådan |
| Use camera to add cards behåller uppstartens steg 4 | **Jespers beslut** 2026-10-05: graveyard-frågan kräver Follow the table; resten i MES-339 |
| Nedvända kort och leken som läggs ner igen visas direkt; en nedlagd hand blir ett nedvänt kort | **Jespers beslut** 2026-10-05: hellre direkt än 3 s väntan, som ändå inte hjälper när handen ligger nere medan man bläddrar i leken |
| K2-1 (lyft lek + nedvänt kort inom ~2 s) blir känd rest | Sista granskningsvarvet: rester som inte ger fel namn eller läcker dold info rättas inte |

## Vad som fattas

- **Fall 05 med Claude** (ovan): stoppar ihopslagningen.
- **Kända rester** (steg4-6-rapport.md, *Kända rester efter rättelse 3*): N5 blandning på bordet ger nedvända kort
  ~1 s; N7–N9 misstankar; N4:s rest (ett draget kort kan blinka förbi som nedvänt); Ignore filtrerar inte i Screen
  leads; K2-1; V2 (Jespers val); golden 18 utan ruta 8/3 mot 9/4; golden 07:s falska lek vid 30,6 s.
- Kort ovanpå kort kräver att kameran ser det nya kortet som eget kort (MES-250); Ignore har ingen ångra.
- **Riktig telefon är oprovad för allt** i sida 5. Provlistan för Jesper: `dev/plan/hogarna-telefonprov.md`.
- `dev/spegelfacit/kor.cjs` väntar på en pool om 114 kort; poolen är 168. Kör med `--tunn-pool` tills det rättats.

## Hur körningen gick (lärdomar)

- **För långsamt och för dyrt:** ~20 timmar och ~10 M agent-tokens för del A och steg 0–3. Mest i granskningsloopar
  (varje granskare läser in index.html från noll, ~300–450k tokens) och i golden-körningar som köade på ett lås.
  Jesper valde mitt på dagen ett snålare upplägg (minnet `snal-matning-vid-orkestrering`), och resten körs så.
- **Disken blev full** 05:40 (växlingsminnet + tre Python-jobb). npm- och pip-cacherna tömdes (~3,8 GB); på
  Jespers fråga togs gamla golden-profiler och trädkopior bort i två avslutade sessioners scratchpadar (~4,7 GB).
- **Pushen till main nekades först** av behörighetskontrollen i auto-läget; Jesper godkände den sedan i chatten.
- Ett mätlås (`matlas.sh` i sessionens scratchpad) höll golden, bänken och tunga Python-jobb till en åt gången.
- En golden-körning med "⏱ tak" på ett fall är ogiltig — fallet slog i tidstaket under last.
- **Steg 4–6 (2026-10-05):** bygget tog ~4 h, granskning + tre rättelser ~3 h, ihopslagningens mätning ~1 h, och
  fall 05 ~2 h (mest väntan på en annan sessions 4K-jobb och på svar). Varje kontroll av en rättelse hittade nya
  fel (3 av 3). Mätbudgeten står nu i `dev/plan/orkestrering.md` och agentdefinitionerna (05c1bab), och
  stillbildstaket i golden är 60 s (36ebf2a).
- **Samordning med andra sessioner:** skicka "golden startar" *och* "klart" — ett uteblivet "klart" fick en annan
  session att starta 4K-märkning som sedan krockade med nästa golden. En pausad process (SIGSTOP) syns fortfarande
  i `pgrep`; vänta på lasten, inte på processen.

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

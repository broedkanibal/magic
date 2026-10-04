# Högarna utan uppstart: mätningen (MES-334, del A)

> Del A i [`prompt-hogarna-matning-och-etapp-1.md`](prompt-hogarna-matning-och-etapp-1.md),
> 2026-10-04. Ingen kod är ändrad. Besluten som prövas står i avsnittet *Byggunderlaget* i
> [`hogarna-principer.md`](hogarna-principer.md). Talen kommer ur fyra agentrapporter i
> `dev/material/arbete/2026-10-04-hogarna-matning/` (nedan `$ARB`, utanför git): A1a (partiet
> 09-21), A1b (partiet 09-22), A2 (vinkeln) och A3 (detektorn).
>
> **Mätt** = räknat eller avläst i bilden och kontrollerat. **Bedömt** = slutsats eller
> uppskattning som ingen har räknat fram. En regel som verkar rimlig men inte är mätt räknas inte
> som ett svar.

## Sammanfattning

- **Vinkeln går att mäta per kort.** En ny metod (A2) hittar kortets vinkel inne i detektorns raka
  låda: 71 av 71 helt synliga kort inom ±10°, mot 57 av 71 med dagens app.
- **Leken hittas.** Detektorns klass `baksida` ger leken en stadig låda när den ligger still, också i
  Jespers gröna fickor. På ett stökigt bord ger den också falska lådor som ligger lika still.
- **Graveyard:** sidoregeln fungerar om den bara räknar kort i **lekens rad**. Kort ovanpå kort
  måste undanta **fästa** kort. Fotot efter 0,5 s hinner med alla graveyard-kort i båda partierna.
- **Picked up** går inte att avgöra med detektorn ensam: en tom plats och en hand över leken ser
  likadana ut. Det behövs ett andra vittne och en tidsgräns.
- **Det som saknas helt i materialet:** leken som läggs ner med kameran igång, starthanden nedvänd
  (mulligan), ett verkligt lyft av leken i Jespers partier och kort nära 45°. Det är vad
  inspelningslistan sist ska täcka.

### Domen för grindarna

| Grind | Dom | Underlag | |
|---|---|---|---|
| **G1 · Vinkeln per kort** | **Klarar.** 71 av 71 helt synliga kort = 100 % inom ±10° (kravet är 95 %). Median 0,7°, största fel 3,8° | **Nämnaren:** alla helt synliga kort (synlig ≥ 0,95) i de tio golden-fall som har kortens hörn i facit: 03, 04, 05, 06, 13, 14, 15, 16, 17 och 18. **Golden 01, 02 och 07–12 saknar hörn i facit** och kan inte räknas. Metoden kördes på dem ändå, och alla 25 kortlådor och 3 leklådor ser rätt ut med ögat | mätt (01, 02, 07–12: bedömt) |
| **G2 · Leken hittas** | **Uppfylld för 09-22. 09-21 går inte att mäta.** I 09-21 saknas kamerabilden de första ~46 s, alltså före första kortet. Grinden säger då: *bygg ändå, och skriv det i rapporten*. Det står här | 09-22: leken syns och ligger still i 28 s före första kortet, och detektorn ger den en låda i 137 av 141 rutor. Alla andra partistarter i materialet (MES-246, golden 13 och 18, kompisens film) klarar kravet | mätt |
| **G3 · Inget blir sämre** | **Prövas per byggsteg** mot baslinjen från steg 0 i del B (`$ARB/baslinje/`). Del A kan inte döma den | – | – |

### Ord som används

| Ord | Betyder |
|---|---|
| Detektorn | Den tränade modellen som hittar *var* korten ligger (MES-329). Den ritar en rak **låda** runt varje kort |
| `baksida` | Detektorns klass för nedvända kort och högar, alltså leken |
| Remsa | Namnraden på ett kort. Detektorn hittar den som en egen låda |
| pkomb | A2:s metod för kortets vinkel: kanternas riktning ger axeln, remsan eller lådans form avgör vilken axel som är långsidan |
| Facit | Det en människa (eller agent) har läst ur filmen och skrivit ner, som mätningen jämförs med |
| Golden 01–18 | Mesas fasta provbilder och provfilmer |

---

## Mått 1 · Syns leken och ligger still före första kortet?

| Inspelning | Syns leken still före första kortet? | Första kortet | Detektorns låda på leken före första kortet | |
|---|---|---|---|---|
| **Partiet 09-21** | **Går inte att se.** Kamerabilden syns först vid ~46–47 s (A1a: 47 s, A3: ~46 s). Mesas lekvakt visade leken på sin plats 0–23 och 30–44 s | ~44,8 s (±0,3), Plains till höger om leken. Se motsägelsen nedan | kan inte mätas | mätt (lekvakten: bedömt) |
| 09-21, första kamerabilden (47 s) | Leken ligger still och är den **enda** nedvända högen. Graveyard-rutan är tom | – | – | mätt |
| **Partiet 09-22** | **Ja**, från filmens början till första kortet. Still 0,00–23,00 (lådan rör sig högst 2 px). Handen rättar till leken 23–24 s, sedan still till 28,08 | 28,08 s, Swamp | **137 av 141 rutor (97,2 %)**. De fyra utan låda är handen som passerar 23,2–23,8 s | mätt |
| MES-246 (4K, grön ficka) | Ja, 0–12 s | ~12 s | 49 av 49 | mätt |
| Golden 13 | Ja, 0–6,6 s | 6,6 s | 34 av 34 | mätt |
| Golden 18 (13b, träbord) | Ja, 0–6,5 s | 6,5 s | 33 av 33 | mätt |
| Kompisens film (person1) | Ja: leken läggs ner vid 18 s, första kortet ~39 s. **Den enda inspelningen där nedläggningen syns** | ~39 s | 20 av 21 (rutan utan låda: en hand vid leken). Dessutom 3–4 falska baksidelådor som ligger still från filmens början | mätt |

| Fråga | Svar | |
|---|---|---|
| Hur lång tid efter partistart lades leken ner? | Går inte att mäta i Jespers partier: båda filmerna börjar med leken redan nere | – |
| Fanns flera nedvända högar före första kortet? | Nej, i ingen partistart som syns. Ingen inspelning har starthanden nedvänd på bordet | mätt (avsaknad) |
| Låg leken på en plats Jesper valde själv? | **Inte i 09-21.** Uppstartens steg 4 gjordes före inspelningen, så leken och graveyard låg där Mesa pekade | mätt |

**Motsägelse om första kortet i 09-21.** A1a säger ~44,8 s. A3 säger att första kortet lades
redan efter 12–18 s.

| Rapport | Vad den bygger på |
|---|---|
| A1a: ~44,8 s | Latensrapportens första skugga (spår 13, Plains), omräknad till filmens tid med menyradens klocka. Rapportens enda rad före det är "borta" för spår 12 vid ~22,9 s, troligen provkortet från uppstarten som plockas upp |
| A3: 12–18 s | Panelens text: "Waiting for the first card event" vid 12 s och "1 card event recorded" vid 18 s |

Bedömning: A1a:s tid håller. I A3:s eget kontaktark (`$ARB/a3/titt/p21-seq-0-240.jpg`) säger panelen
"2 card events recorded" redan vid 24 s, och vid 48 s visar kamerapanelen Plains som "on the way —
asking Claude" med "Sees 1 cards and recognises 0". Det passar ett första kort vid ~45 s. Panelens
"card events" före det var troligen provkortet (bedömt). Båda rapporterna är överens om det som
gäller för G2: partistarten i 09-21 går inte att mäta.

---

## Mått 2 · Lekens vinkel mot korten, och går vinkeln att mäta per kort?

### Går vinkeln att mäta inne i detektorns raka låda?

Ja. Tabellen jämför metoderna på golden: 71 helt synliga kort i de tio fallen med hörn i facit.

| Metod | Inom ±10° | Median | Största fel | |
|---|---|---|---|---|
| Dagens app (lådans långsida, bara 0° eller 90°) | 57 av 71 (80,3 %) | 3,2° | 28,8° | mätt |
| Kortets kontur (OpenCV, som referens) | 64 av 71 (90,1 %) | 0,8° | 89,9° | mätt |
| Remsans läge i lådan (69 kort har remsa) | 69 av 71 (97,2 %) | 0,9° | 3,4° | mätt |
| **pkomb** (kanternas riktning + remsa/form) | **71 av 71 (100 %)** | 0,7° | 3,8° | mätt |
| pkomb utan remsan | 71 av 71 | 0,7° | 3,8° | mätt |

| Fler lägen (ritade rutor ur provinspelningarna) | Helt synliga kort | Dagens app | **pkomb** | |
|---|---|---|---|---|
| MES-246 (4K, svart matta) | 415 | 359 (86,5 %) | **414 (99,8 %)** | mätt |
| 13b (4K, träbord, 0,5×) | 93 | 63 (67,7 %) | **93 (100 %)** | mätt |
| person1 (kompisens vita bord) | 38 | 26 (68,4 %) | **38 (100 %)** | mätt |
| Alla tre | 546 | 448 (82,1 %) | **545 (99,8 %)** | mätt |

Det enda kortet som faller är en Plains utan remsa i MES-246 (254,87 s): axeln var rätt men
långsidan fel med 90° (mätt).

| Kort nära 45° (golden-bilderna vridna) | Kort | pkomb | |
|---|---|---|---|
| 0–10° från bildens axel | 97 | 96 (99 %) | mätt |
| 10–30° | 223 | 218–219 (~98 %) | mätt |
| 30–40° | 97 | 90 (92,8 %) | mätt |
| 40–45° | 63 | 49–50 (78–79 %) | mätt |

Nära 45° saknar korten nästan alltid remsa, och lådan säger inget om vilken sida som är lång. I det
inspelade materialet ligger 16 av 617 helt synliga kort mer än 30° från en axel, och pkomb tog alla
16 (mätt). Kort nära 45° finns alltså knappt i materialet.

**Lekens vinkel** mäts med samma metod: 101 av 104 lekar inom ±10°. De tre som föll fick ingen låda
av detektorn (mätt).

**Tap-domen hela vägen** (lekens uppmätta vinkel mot kortets, tappat = mer än 45° ifrån):

| Källa | Helt synliga kort | Tap-domen rätt | |
|---|---|---|---|
| Golden 13, 17, 18 | 18 | 18 | mätt |
| MES-246 | 417 | 416 (Plains ovan) | mätt |
| 13b | 93 | 93 | mätt |
| person1 | 40 | 40 | mätt |

**Kostnad:** 3,4 ms per kort i Chrome på Macen (median), med beskärningen ur 4K-bilden (mätt).
Telefonen är omätt, uppskattad till ~7–15 ms per kort (bedömt).

### Hur snett ligger leken och korten?

| Källa | Lekens vinkel från bildens axel | Otappade kort mot leken (median / p90 / max) | Tappade kort mot leken (min / median / max) | |
|---|---|---|---|---|
| Golden 13 / 17 / 18 | 0,8° / 10,7° / 1,6° | 4,0° / 9,4° / 14,3° (18 kort) | 59,6° / 72,2° / 84,9° (6) | mätt (facits hörn) |
| MES-246 | 0,3° | 1,9° / 6,9° / 11,2° (400) | 54,8° / 70,7° / 79,8° (62) | mätt (facits hörn) |
| 13b | 1,6° | 4,3° / 7,0° / 8,4° (77) | 55,7° / 64,8° / 84,5° (31) | mätt (facits hörn) |
| person1, kompisens bord | 1,5–3,4° | 5,0° / 14,9° / **40,3°** (32) | **47,0°** / 60,7° / 87,6° (13) | mätt (facits hörn) |
| **Partiet 09-21** (0–540 s) | median 5,3°: ~2° till 80 s, sedan ~7° | 3,3° / 9,4° / 22,7° (178) | 62,6° / 69,4° / 88,4° (16) | mätt med metoden, inget hörnfacit |
| 09-21, grov kontroll (rutorna 480–1180) | 1–10° | 4–15° från lodrätt | 52–70° mot leken (6 mätningar) | mätt grovt, marginalen bedömd |
| **Partiet 09-22** | median 0,6° | 2,0° / 7,9° / 31,0° (126) | 58,8° / 72,4° / 82,8° (30) | mätt med metoden, inget hörnfacit |

Båda partifilmerna har Mesas spårrutor inbrända, och de drar metoden mot sina egna vinklar
(bedömt). Maxvärdena i partierna är därför osäkra.

**Vad det betyder:** skillnaden mot 45°-gränsen är oftast 30° eller mer, och mätfelet (median 0,7°)
är litet mot det. Undantaget är kompisens bord: länder 22–40° och tappade länder 47–49° från leken,
alltså **2–5° marginal** (mätt). I 09-21 är marginalen ~7° för det minst vridna tappade kortet
(bedömt).

---

## Mått 3 · Sidoregeln: kort på andra sidan om leken som inte är graveyard

Landen ligger till höger om leken i båda partierna, så graveyard-sidan är vänster.

| | Partiet 09-21 | Partiet 09-22 | |
|---|---|---|---|
| Var första kortet på andra sidan graveyard? | **Nej.** Serpent Assassin lades där vid 187 s, 11 s före första graveyard-kortet (198 s) | **Ja.** Killing Glare, 45,5 s | mätt |
| Kort på andra sidan som inte är graveyard, bara x-led | **3 placeringar** (2 olika kort plus ett okänt), alla i raden ovanför | **2** (Valkyrie's Sword ~5 s, Pharika's Chosen ~50 s), båda i raden ovanför | mätt |
| … om kortet också måste ligga i **lekens rad** | **0** | **0** | mätt |
| Graveyard-korten i lekens rad | 27 av 27 | Högen ligger i lekens rad (y 345–560 mot lekens 343–592) | mätt |
| Kort på landsidan nära lekens mitt | – | 2 inom 20 px (Killing Glare +18, Ukud Cobra +12), båda ovanför leken | mätt |
| Valde Jesper graveyard-platsen själv? | Nej, uppstarten pekade ut den | Ja | mätt |

Med bara x-led hade sidoregeln frågat "Is this your graveyard?" om Serpent Assassin, ett kort i
spel (bedömt). Med lekens rad som krav frågar den rätt i båda partierna (bedömt ur måtten).

---

## Mått 4 · Reserven: kort ovanpå kort som inte är graveyard

| | Partiet 09-21 | Partiet 09-22 | |
|---|---|---|---|
| Lösa kort ovanpå ett annat (inte fäst, inte land, inte graveyard) | **0 säkra**, högst 2 osäkra (262 och 735 s, ser ut som fäst) | **0** | 09-21: mätt / bedömt · 09-22: bedömt (röstfacit och helbilder) |
| Fästa kort (utrustningar) | **4 säkra och 2 osäkra**, alltså 4–6 på 20 min | **6** | 09-21: mätt · 09-22: röstfacit |
| Land på land | Många, landhögarna växer till 5–7 kort (inte räknat) | 2 | mätt |
| Kort omlott vid kanten eller hörnen | Kort som vrids ett tag går omlott i kanten (fem perioder) | Ett par tappade grannar, högst ~20 px omlott (230–268 s) | bedömt |
| När hade reserven gett graveyard? | Vid andra graveyard-kortet (214 s): det första lades på tom plats, så reserven slår till först när det andra hamnar på det | – (sidoregeln hade redan slagit till) | mätt |
| Hur skiljer man fäst från graveyard? | Fäst: bakre kortet sticker ut 10–25 % så att titelraden syns. Graveyard: kortet täcker nästan allt | Fäst ligger förskjutet, graveyard täcker helt | bedömt, inte mätt |

Utan undantag för fästa kort hade reserven frågat om graveyard 4–6 gånger i onödan i 09-21 och 6
gånger i 09-22 (bedömt ur måtten).

---

## Mått 5 · Hur länge syns ett kort överst på graveyard?

Tiden räknas från att handen lämnat högen tills nästa hand täcker den. Kortet släpps under handen och
syns inte förrän handen har gått.

| | Partiet 09-21 | Partiet 09-22 | |
|---|---|---|---|
| Kort till graveyard | 27 | 6, plus 3 kort ur graveyard (till handen, exile och bordet) | mätt |
| Synligt överst **under 0,5 s** | **0** | **0** | mätt |
| Kortast tid överst | **0,8 s** (G20) | 13,9 s (avbruten av filmens slut), annars 23,2 s. Kortast ostört direkt efter handen: 2,5 s | mätt |
| Synligt överst högst 2 s | 5 | 0 | mätt |
| Median | 25 s (max 108 s) | – | mätt |
| Snabbaste följden | 3 kort på 5 s (898–902) och 4 kort på 8 s (828–835) | – | mätt |
| Hur länge handen täcker högen vid varje kort | 0,4–3,2 s, oftast 0,8–2 s | 0,87–2,67 s | mätt |
| Upplösning | 0,2 s för 23 kort, 0,4–1 s för 4 | 0,07 s (varje ruta) | – |

**Svar:** en gräns på 0,5 s fångar alla graveyard-kort i båda partierna, om den räknas från när
handen lämnat högen. Kortaste tiden, 0,8 s, är 12 bildrutor i 15 fps och ~5 analyser med dagens takt
på 150 ms (mätt).

---

## Mått 6 · Lämnar leken bilden, och går det att skilja från en hand?

| | Partiet 09-21 | Partiet 09-22 | Andra inspelningar (A3) | |
|---|---|---|---|---|
| Leken lämnar bilden (söka, blanda, mulligan) | **0 gånger** på 1131 s med bild | **0 gånger** på 284 s | MES-139: upplockad två gånger, 1–2 s. person1: upplockad 89–97 s, lagd på ny plats vid 98 s | mätt |
| Handen täcker leken | **69 gånger, 171 s** (räknat per sekund; en av de 69 är en skymd ruta utan hud vid 1123 s) | **29 gånger** (minst 0,2 s), 10 % av tiden. Helt täckt 22 gånger, längst 1,33 s | – | mätt |
| Längsta täckning | 12 s (563–574: handen vilar på leken och skjuter den) | 2,67 s (graveyard-kort vid 267,9 s) | – | mätt |
| Leken flyttad | En gång, ~4–5 % av bildbredden (563–574) | Lådan rör sig högst ~20 px | – | mätt |
| Falskt "tom" med ett bildmått (matta, ingen hud) | 3 enstaka sekunder (en svart klocka, armskugga), aldrig 2 s i följd | Aldrig: i helt täckta rutor är minst 65 % hud och högst 5 % matta | – | mätt |
| Detektorns låda under handen | – | Borta 0,2–1,0 s per dragning, längsta lucka 1,4 s | Golden 11 och 18: luckor upp till **2,8 s** (handen vid graveyard, armen vilar) | mätt |
| Går tom och täckt att skilja ur detektorn? | – | – | **Nej.** Båda ger ingen låda, ingen svag låda och ingen kortlåda över platsen. Detektorn har ingen klass för hand | mätt |
| Går det med ett bildmått mot hur platsen ser ut tom? | – | – | Ja i MES-139: upplockad 6,1–9,9 gråsteg, hand 11,4–39,0. **Smal marginal**, en enda inspelning | mätt (en inspelning) |

**Två rapporter, två tal för Picked up.** A1a och A1b säger att platsen ska vara tom i minst
~1,5–2 s. A3 säger att detektorns luckor under en hand är upp till 2,8 s. Båda stämmer, för de mäter
olika saker: A1a och A1b mätte med färg (matta syns, ingen hud), A3 mätte bara detektorns låda. Med
ett bildmått räcker 1,5–2 s i de här partierna. Med detektorn ensam skulle gränsen behöva vara över
2,8 s, och då missas lyften i MES-139 som var 1–2 s (bedömt ur måtten).

---

## Mått 7 · Detektorn: ger `baksida` en låda på leken, och på något annat?

**Viktigt om materialet:** golden 01–02, 07, 09–12, MES-138 och båda partierna är skärminspelningar
med Mesas egna ramar inritade. Detektorn ger `baksida` på tomma ritade ramar (poäng upp till 0,97).
Appen ser aldrig de ramarna, så de räknas inte som falsklarm nedan.

### Leken still

| Inspelning | Lek-låda | Poäng | Lådan rör sig | |
|---|---|---|---|---|
| 09-22, före första kortet | 137 av 141 (97,2 %) | 0,56–0,95 | högst 11 px | mätt |
| 09-22, hela partiet | 1 318 av 1 433 (92,0 %) | 0,56–0,93 | 31 luckor, längst 1,4 s | mätt |
| 09-21, hela partiet (46–1 211 s) | 764 av 1 131 (67,6 %). Leken låg kvar i 19 av 19 kontrollerade rutor, så luckorna beror på materialet (miniatyr 705 × 438 med ramar) | 0,56–0,90 | upp till 48 px | mätt (A3) |
| 09-21, A2:s urval (en ruta per 10 s, 0–540 s) | leken hittad i 27 av 54 rutor. Urvalet börjar vid 0 s, där kamerabilden saknas till ~46 s | – | – | mätt (A2); förklaringen bedömd |
| MES-246, före första kortet | 49 av 49 | 0,95–0,96 | högst 8 px | mätt |
| Golden 13 | 859 av 860 | 0,79–0,95 | högst 8 px | mätt |
| Golden 18 | 885 av 900 | 0,90–0,95 | högst 9 px | mätt |
| Golden 10 (Magic-baksida) | 170 av 176 | 0,92–0,96 | högst 6 px | mätt |
| Golden 11 | 434 av 485 (luckorna: handen vid graveyard) | 0,63–0,94 | – | mätt |
| MES-139 / MES-138 | 81 av 81 / 21 av 21 | 0,94–0,96 | högst 2 px | mätt |
| Golden 17 (kompisens bord) | leken får **två lådor** (0,93 och 0,84) | – | – | mätt |

### Hand på leken

| Händelse | Rutor med hand | Lådan kvar | |
|---|---|---|---|
| MES-246, mill 3 | 20 | 12 | mätt |
| MES-246, Flutterfox läggs på leken | 12 | 2 | mätt |
| 09-22, sex dragningar | 25 | 8 (32 %) | mätt |
| Golden 18, armen vilar över leken | 15 | 0 | mätt |
| MES-139, handen vilar på eller håller leken | 71 | 56 (79 %) | mätt |

Fingrar på leken låter lådan stå kvar. En handflata eller arm tar bort den helt (mätt).

### Gröna fickor

Fickan gör ingen skillnad: 0,93–0,96 i sex inspelningar med grön ficka, samma som Magic-baksidan
(mätt). MES-138:s gamla problem (fickan döms som slät yta) finns inte i den tränade detektorn.

### Falsklarm

| Var | Falska baksidelådor | Ligger de still? | |
|---|---|---|---|
| Golden 01–16, stillbilderna | **0** | – | mätt |
| Golden 13 och 18 (filmerna) | Korta, från tokens med baksidan upp i handen, högst 1,4 s i följd | nej | mätt; orsaken bedömd |
| Golden 07, 09–12 (skärminspelningar) | Korta: händer, kort i handen, mörka ytor, 0,4–0,8 s (utom Mesas ritade ramar) | nej | mätt; orsaken bedömd |
| MES-246 | **Ett uppvänt vitt kort i lampans blänk**, 17 rutor, 0,85–0,94 | **ja** | mätt; orsaken bedömd |
| Golden 17 (kompisens bord) | **4:** två sladdar, en ask och telefonens skugga, 0,76–0,88 | **ja**: i kompisens film finns de från de första sekunderna (0–9 s), före leken, och ligger kvar i 232–270 av 270 rutor | mätt |
| Golden 13 och 18 | En token med ett fäst kort under får **två** överlappande lådor | – | mätt |

| Golden 17: kompisens andra baksidor | Svar | |
|---|---|---|
| Högen i högerkanten (fyra kort) | En låda för alla fyra, skär bildkanten | mätt |
| Högen nere till vänster (tre kort) | Ingen låda alls. Trycket liknar framsidor av promokort | mätt / bedömt |
| Vad tar kravet "inte vid bildkanten, 0,6–1,6 kortytor" bort? | Sladdarna, asken och högerkantens hög. **Telefonens skugga blir kvar** (0,78 kortytor, inte vid kanten) | mätt mot bilden, regeln bedömd |

Korta falsklarm (0,2–0,8 s) försvinner med ett krav på att högen ska ligga still i ~1,5 s (bedömt).
Det vita kortet i blänket och falsklarmen på kompisens bord klarar det kravet.

---

## Bedömning per regel i Byggunderlaget

**Förslagen här är förslag ur mätningen, inte ändrade beslut.** Byggunderlaget gäller tills Jesper
säger något annat.

### Partiet börjar

| Regel | Bedömning | Måttet som visar det |
|---|---|---|
| Ingen lek: "Put your library on the table" | Inte prövad (text) | – |
| En nedvänd hög som ligger still före första kortet antas vara library | **Håller med ändring.** På Jespers bord håller den: leken är den enda baksidelådan, 97–100 % av rutorna, stilla inom 11 px. På ett stökigt bord ligger 3–4 falska lådor lika still från början. *Förslag:* library är den baksidehög som **dyker upp** under passet, ligger still i minst 1,5 s, inte rör bildkanten och är 0,6–1,6 kortytor | Mått 1 och 7 (mätt); förslaget bedömt |
| Flera nedvända högar: library är den som ligger kvar | **Oprövad.** Ingen inspelning har läget. Falska lådor "ligger kvar" också, så regeln behöver samma krav som ovan | Mått 1 och 7 |
| Fel hög: Not my library | **Behövs** som reserv: telefonens skugga klarar alla föreslagna krav | Mått 7 (bedömt) |
| Leken plockas upp före första kortet: Picked up | Oprövad före första kortet. Villkoret: se *Leken plockas upp* under I spel | – |
| Första kortet läggs ner: texten försvinner | Inte prövad (text) | – |
| Första kortet utan att leken synts: dess vinkel blir otappat | **Oprövad.** Leken syntes i alla partistarter. Risk: ett första kort som tappas tidigt (i 09-22 tappades Swamp 2,5 s efter att den spelats) ger ett grundläge som är 90° fel om vinkeln tas efter tapet | Mått 1, röstfacit 09-22 (risken bedömd) |
| Ett ensamt nedvänt kort visas | **Håller med ändring:** baksidelådor som överlappar måste slås ihop till ett kort (token med fäst kort, leken i golden 17). Risk: det vita kortet i blänket (MES-246) och telefonens skugga (golden 17) ligger still och skulle visas som nedvända kort | Mått 7 (mätt); risken bedömd |
| En hög som inte är leken, eller som skärs av bildkanten, ignoreras | **Håller.** Kantregeln tar högerkantens hög i golden 17 och tre av fyra falska lådor. Högen nere till vänster ger ingen låda | Mått 7 (mätt) |

### Vinkeln

| Regel | Bedömning | Måttet som visar det |
|---|---|---|
| Mattan visar alltid rakt (0° / 90°) | Inte prövad (ritning) | – |
| Kameran läser varje kort i dess verkliga vinkel, beskärningen vrids | **Vinkeln går att mäta** (71/71 i golden, 545/546 i lägena). Om läsningen blir lika bra i den vridna beskärningen är omätt: det avgör G3 (0 nya fel namn) i bygget | Mått 2 (mätt) |
| Tappat = mer än 45° från lekens vinkel just nu | **Håller**, tap-domen rätt i 567 av 568 kort. **Liten marginal på kompisens bord** (2–5°). A2 föreslår att dagens osäkra band i `tapTydlig` (20°–55°) får gälla, så att kort nära gränsen lämnas orörda. Att referensen följer leken behövs: i 09-21 vreds leken från ~2° till ~7° under partiet | Mått 2 (mätt); förslaget bedömt |
| Namnremsan som riktmärke | **Håller med fällor.** Riktningen ur remsan rätt i 69/69 (golden) och 490/496 (lägena). Fel på fullart-land och tokens, där remsan sitter på typraden (person1: 6 av 31), men axeln blir ändå rätt. Nära 45° saknas remsan nästan alltid, och pkomb klarar sig utan den (71/71). En låda runt två kort (fäst par) kan få långsidan att hoppa 90° mellan rutorna (09-22: 6 av 14 mätningar) → A2 föreslår att långsidan inte får byta utan att lådan rört sig | Mått 2 (mätt); förslaget bedömt |
| Det svåraste: mät per kort först | **Gjort, G1 klarar.** Kostnaden på telefonen är omätt | Mått 2 |

### Graveyard

| Regel | Bedömning | Måttet som visar det |
|---|---|---|
| Sidoregeln: första kortet på andra sidan om leken från landen ger frågan | **Håller med ändring: räkna bara kort i lekens rad** (samma höjd som leken). Bara x-led gav 3 fel frågor i 09-21 (den första före första graveyard-kortet) och 2 i 09-22. Med lekens rad: 0 och 0. Obs: i 09-21 var graveyard-platsen utpekad av uppstarten | Mått 3 (mätt) |
| Kort ovanpå kort ger frågan (inte land på land, inte fäst) | **Håller med ändring: fästa kort måste undantas säkert.** De är vanliga (4–6 i 09-21, 6 i 09-22), och det bakre kortet sticker ut 10–25 %. Kort som går omlott vid kanten eller hörnen får inte heller räknas. *Förslag:* kräv att kortet täcker nästan hela kortet under. Reserven gav rätt graveyard vid 214 s i 09-21 | Mått 4 (fäst: mätt; förskjutningen: bedömd) |
| Inget är graveyard före svaret, och fler kort hör till samma fråga | Inte prövad (beteende), men **behövs:** andra graveyard-kortet kom 16 s efter det första i 09-21, och korten kom upp till 4 på 8 s | Mått 5 (mätt) |
| Yes, No, Permanent, Ignore this spot, vem ser frågan | Inte prövade (beteende och text) | – |
| Efter Yes gäller MES-85 mot högen där den ligger (del B, steg 4) | **Stöds:** graveyard flyttades med leken (563–574) och bläddrades (1122–1141) i 09-21, och i 09-22 togs 3 kort ur högen så att korten under syntes igen | Mått 5 och 6 (mätt) |
| Fotot efter 0,5 s (MES-336, inte i det här bygget) | **Håller,** räknat från när handen lämnat högen: 27 av 27 och 6 av 6 kort låg överst minst 0,8 s | Mått 5 (mätt) |

### I spel

| Regel | Bedömning | Måttet som visar det |
|---|---|---|
| Utseendet D1, platsen bland korten, spelare utan kamera, exile som i dag | Inte prövade (ritning och beteende) | – |
| Leken plockas upp: "Library · Picked up", skuggan kvar, leken glider dit där den läggs ner | **Håller med ändring: platsen ska synas och vara tom i minst ~1,5–2 s.** Detektorn ensam kan inte skilja tom från täckt, och dess luckor under en hand är upp till 2,8 s. Det behövs ett andra vittne, till exempel ett bildmått mot hur platsen ser ut tom (fungerar i MES-139, med smal marginal). Inget verkligt lyft finns i Jespers partier. Att leken flyttas finns: i 09-21 sköts den av handen, och i kompisens film lades den på ny plats | Mått 6 och 7 (mätt); villkoret bedömt |
| Handen täcker leken: inte upptagen (avsnittet Library) | **Håller och behövs.** Handen täckte leken 69 gånger i 09-21 och 29 gånger i 09-22, och lådan försvinner 0,2–2,8 s varje gång. Utan regeln skulle leken blinka till Picked up vid varje dragning | Mått 6 och 7 (mätt) |
| Sleeves: färgen ur kamerans bild av leken när den ligger still och syns hel | **Stöds:** leken ligger still med en stadig låda i 28 s före första kortet i 09-22, och gröna fickor fungerar som Magic-baksidan. Själva färgmätningen är inte gjord | Mått 1 och 7 (bedömt) |

### Förslagen samlade (inte beslut)

| # | Förslag | Varifrån |
|---|---|---|
| 1 | Sidoregeln räknar bara kort i lekens rad | A1a, A1b |
| 2 | Kort ovanpå kort undantar fästa kort (förskjutna 10–25 %) och kanter som går omlott | A1a, A1b |
| 3 | Picked up kräver att platsen syns och är tom i minst ~1,5–2 s, med ett andra vittne utöver detektorn | A1a, A1b, A3 |
| 4 | Library är en baksidehög som dyker upp under passet, ligger still ≥ 1,5 s, inte rör bildkanten och är 0,6–1,6 kortytor | A3 |
| 5 | Baksidelådor som överlappar slås ihop till ett kort | A3 |
| 6 | Vinkeln med pkomb (`$ARB/a2/kortvinkel.js`), utan 90°-byte av långsidan om lådan inte rört sig, och `tapTydlig`s osäkra band nära 45° | A2 |
| 7 | 0,5 s-gränsen för fotot räknas från när handen lämnat högen (MES-336) | A1a, A1b |

---

## Sidofynd

| Fynd | Varför det spelar roll | |
|---|---|---|
| Dagens lekvakt (`bibSag`) visade "Put your library back here" i **1092 av 1131 s** i 09-21, medan leken låg synlig | `bibSag` ska återanvändas i bygget. Dess "borta" går inte att lita på i dag | mätt |
| Mesas graveyard-räknare visade **"Graveyard 9"** vid slutet av 09-21. **27 kort** lades dit och 3 togs ur | Kort direkt från handen (instants, sorceries) räknas troligen inte i dag. Det stöder etapp 3 | räknaren mätt, orsaken bedömd |
| I 09-22 hörs rösten **1,5–2,8 s före** graveyard-kortet syns fritt, och före handen når högen i alla 6 | En latens för graveyard räknad från röstfacit (`handelser.tsv`, `tal.tsv`) innehåller upp till 2,8 s då kortet inte syns. Röstfacits LÄS-MIG säger att tiden ligger "strax efter att handen släppte", men det gäller inte graveyard-korten | mätt |
| Skärminspelningar med Mesas ramar ger falska baksidelådor (upp till 0,97) och stör vinkelmätningen | Nya inspelningar bör vara telefonens egen film, utan Mesas spårrutor (som MES-246) | mätt / bedömt |

---

## Var facit och arbetsfilerna ligger

| Var | Vad |
|---|---|
| `dev/golden/inspelningar/2026-09-21-parti/hogar-handelser.tsv` | Händelsefacit för leken och graveyard i 09-21 (60 rader) |
| `dev/golden/inspelningar/2026-09-21-parti/hogar-gy-topp.tsv` | Mått 5 i 09-21, ett graveyard-kort per rad |
| `dev/golden/inspelningar/2026-09-21-parti/hogar-leken-tackt.tsv` | Mått 6 i 09-21, varje gång leken täcks |
| `dev/golden/inspelningar/2026-09-21-parti/hogar-LÄS-MIG.md` | Hur 09-21-facit läses och kom till |
| `dev/golden/inspelningar/2026-09-22-1x-34cm-normaltempo/hogar-handelser.tsv` | Facit för leken och graveyard i 09-22 (52 rader) |
| `dev/golden/inspelningar/2026-09-22-1x-34cm-normaltempo/hogar-LÄS-MIG.md` | Hur 09-22-facit läses och kom till |
| `$ARB/A1a-parti-0921.md`, `A1b-parti-0922.md`, `A2-vinkeln.md`, `A3-detektorn.md` | Agenternas fulla rapporter |
| `$ARB/a1a/`, `$ARB/a1b/` | Rutor, kontaktark och skript för partierna |
| `$ARB/a2/` | Vinkelmetoden, med prototypen för appen i `kortvinkel.js` |
| `$ARB/a3/` | Detektorkörningarna, ögonfacit och kontaktark |

Facit är skrivet av agenter och inte granskat av Jesper.

### Kontrollräknat mot facit

| Tal i rapporten | Räknat i | Utfall |
|---|---|---|
| 27 graveyard-kort i 09-21 | `hogar-handelser.tsv` (27 rader `till graveyard`) och `hogar-gy-topp.tsv` (27 rader) | stämmer |
| 3 kort på andra sidan i 09-21, alla i raden ovanför | `hogar-handelser.tsv`: 187, 337, 605 s med y 25–29 %, alla graveyard-rader på y 73 % som leken | stämmer |
| Kortast 0,8 s överst, median 25 s, 0 under 0,5 s, 5 högst 2 s | `hogar-gy-topp.tsv` | stämmer |
| Handen över leken 69 gånger, 171 s, i 09-21 | `hogar-leken-tackt.tsv` (69 rader, 171 s; en rad är "skymd (ingen hud)") | stämmer |
| Första kortet 28,08 s och 6 graveyard-kort i 09-22, kortast 13,9 s överst | `hogar-handelser.tsv` för 09-22 | stämmer |
| Leken täckt 29 gånger, 29,3 s, helt täckt 22 gånger i 09-22 | Facit har 29 rader `lek_tackt` (minst 0,2 s). Deras längder blir **30,2 s**, eftersom raderna tar med glipor inuti. A1b:s skript (`tackt.py`, omkört) ger 29,3 s och 22 helt täckta sträckor (7,9 s) när glipor räknas bort. Facit visar helt täckt i 19 rader, eftersom vissa rader har två sträckor | små skillnader i definitionen, ingen motsägelse |

---

## Inspelningslistan (skärpt)

**Så spelas det in:**

- Slå på **"Keep the picture on"** på telefonen, och **klappa två gånger** för synk i början
  (minnet `mes-166-provkortets-las`).
- Starta inspelningen **innan leken läggs ner.** I båda partierna låg leken redan nere när filmen
  började, och i 09-21 syntes kamerabilden först efter 46 s.
- Spela in **telefonens egen film**, utan Mesas spårrutor (som MES-246). Inbrända rutor ger falska
  baksidelådor och stör vinkelmätningen.
- Gör uppstarten **utan** steg 4, så att leken och graveyard ligger där du själv lägger dem.
- Säg högt vad du gör, som i 09-22.

### Struket, redan besvarat

| # | Punkten i utkastet | Besvarat av |
|---|---|---|
| 4 | Ett land som tappas direkt för en 1-drop | 09-22 har det: Swamp spelas 28,08 och tappas 30,62 med leken i bild. Alla 30 tappade kort som mättes i 09-22 låg 58,8–82,8° från leken, långt över 45° (mätt med metoden). Fallet utan lek ingår i punkt 3 |
| 5 | En instant läggs på bordet och flyttas till högen | Båda partierna: i 09-22 blev Killing Glare första graveyard-kortet efter ~10 s på bordet, och i 09-21 låg ett lila kort (troligen Killing Glare), Night's Whisper och en svart instant 9–18 s på bordet innan graveyard |
| 6 | En varelse dör och flyttas till graveyard | Båda partierna (09-21: bl.a. Flutterfox och Trusty Retriever, 09-22: Flutterfox, Pharika's Chosen och Ukud Cobra) |
| 10, första halvan | Tre kort till graveyard snabbt | 09-21: 3 kort på 5 s och 4 på 8 s, kortast 0,8 s överst. Mill 3 står kvar (punkt 10 nedan) |
| 11 | En hand vilar på leken medan ett kort dras | 09-21 (handen vilade 12 s), 09-22 (sex dragningar), golden 18 (armen vilar 2,8 s) och MES-139. Detektorns låda försvinner under handflatan, så regeln "handen fryser" behövs |

### Kvar att spela in

| # | Vad du gör | Vad den mäter | Regeln den prövar |
|---|---|---|---|
| 1 | Partistart med kameran igång: blanda, dra sju, **lägg ner leken stående**, spela ett land, passa | När leken dyker upp, efter hur lång tid den ligger still, och att den är den enda baksidelådan. Tiden från nedläggning till första kortet | En nedvänd hög som ligger still före första kortet blir library; förslaget "dyker upp under passet, still ≥ 1,5 s" |
| 2 | Samma, men **leken på tvären**, och korten spelas åt samma håll som leken | Att lekens vinkel blir otappat också när den ligger 90° mot bildens axel, och att tap-domen följer den | Otappat = lekens vinkel |
| 3 | **Thriving Heath (tappad) som första land**: a) med leken i bild, b) med leken utanför bild | a) tap-domen mot leken på första kortet. b) reserven: ger ett tappat första kort ett grundläge som är 90° fel? | Första kortet utan lek ger vinkeln |
| 7 | **Discard på tur 1** innan något land ligger ute: ett kort, sedan ett till rakt ovanpå. Fäst också en utrustning på en varelse senare i samma inspelning | Att reserven slår till på andra kortet, med det första som graveyards första kort. Hur mycket det fästa kortet sticker ut mot ett graveyard-kort (procent av kortet) | Kort ovanpå kort, med undantag för fästa kort |
| 8 | En varelse läggs på andra sidan om leken **i lekens rad**, för att det är trångt | Om sidoregeln med lekens rad fortfarande frågar fel, och hur Nej → Permanent ser ut | Sidoregeln (förslaget med lekens rad); Nej-menyn |
| 9 | **Leken lyfts** för en sökning, blandas och läggs tillbaka **på en ny plats** | Hur länge platsen är tom, och om ett bildmått skiljer den från en hand. Att leken glider till nya platsen och att vinkeln följer med | Picked up (förslaget: tom ≥ 1,5–2 s, med ett andra vittne) |
| 10 | **Mill 3** i en rörelse till graveyard | Att högen räknar en ändring, och hur länge översta kortet syns | Fler kort hör till samma fråga; MES-85 mot högen där den ligger |
| 12 | **Starthanden nedvänd på bordet** medan du funderar på mulligan. Ta mulligan: lägg tillbaka handen, blanda och lägg ner leken igen | Flera baksidelådor före första kortet, vilken som ligger kvar, och om överlappande lådor slås ihop. Picked up före första kortet | Flera nedvända högar: library är den som ligger kvar; Picked up före första kortet |
| 13 *(ny)* | **Leken ~20–30° snett**, och några kort lagda **30–45° från bildens axel**, både otappade och tappade | pkomb där den är svagast (78–79 % nära 45° i vridprovet), och tap-marginalen när leken själv är sned | Vinkeln per kort; tappat = mer än 45° från leken |
| 14 *(ny)* | **Stökigt bord** som hos kompisen: sladdar, en ask, telefonens skugga och några lösa baksidor vid bildkanten, alla på plats innan leken läggs ner | Hur många falska baksidelådor som ligger still, och vad förslaget (dyker upp, inte vid kanten, 0,6–1,6 kortytor) tar bort | Library-regeln; högar vid bildkanten ignoreras; Not my library |
| 15 *(ny)* | Ett **uppvänt vitt kort i lampans blänk** som ligger still en stund | Om det får en baksidelåda och visas som ett nedvänt kort | Ett ensamt nedvänt kort visas |

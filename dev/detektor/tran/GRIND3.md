# Grind 3, natt 1: hjälper mer data? (MES-288)

**Läget 2026-10-01:** natt 1 körd och mätt, se *Resultatet*. (2026-09-30 kväll: förberett, inte startat.) Dataset v2 är byggt lokalt och kontrollerat
(`ladda_upp.py --namn v2` utan `--kor`: OK). Kerneln pekar på v2 och har två körningar i `JOBB`.
Jesper godkände ~5 GPU-timmar för natten när han skickade startprompten.

## Frågan

| Jämförelse | Svarar på |
|---|---|
| A mot B | hjälper mer data av samma sort? Är A klart bättre: fler syntetiska bord, kompisens film och fler ritade rutor är värda det. Liten skillnad: det är något annat än mängden som begränsar (högarna) |
| A mot grind 2:s nano | hjälper längre träning? Blandat med 11 nya ritade rutor — säger att kombinationen hjälpte, inte vilken del |

## Körningarna (`kernel/mesa_detektor_tran.py`, `JOBB`)

| Namn | Modell | Data | Epoker | Ungefärlig tid |
|---|---|---|---|---|
| A-allt | YOLOX-nano | allt i v2 | 150 | ~5 h |
| B-halva | YOLOX-nano | halva v2 (samma andel riktiga och syntetiska, fast urval) | 150 | ~2,5 h |

Båda: Jespers ritade rutor ×5 per epok, samma validering (71 riktiga + 300 syntetiska).

## Dataset v2

Som v1 (regel G 0,5, 638 riktiga + 3 000 syntetiska) plus 11 nya ritade rutor: **23 rutor med
Jespers ritning som facit** (460 lådor). Riktiga träning: 4 675 kort, 602 baksida, 5 438 ignorerade.
`filista-v2.txt`. Handrutor: dataset.py läser Jespers handrutor (H i ritverktyget) när de finns,
annars `larare/matning/hander.json`; handen själv är bakgrund, bara kort under den ignoreras.

## Körordning

Python: `~/.mesa/detektor-venv/bin/python` (cv2, onnxruntime, torch 2.2.2 CPU). Kaggle:
`~/.mesa/kaggle-venv/bin/kaggle` — läs aldrig ut nyckeln. Konto `jesperfunkrosling`.

1. **Kontroll:** `python dev/detektor/tran/ladda_upp.py --namn v2` (utan `--kor`) ska säga OK.
   Finns inte `dev/material/arbete/2026-09-30-mes-288-traning-detektor-v2/`: bygg med
   `python dev/detektor/tran/dataset.py --synt g2-a,g2-b,g2-c,g2-d --namn v2`.
2. **Ladda upp:** `ladda_upp.py --namn v2 --kor`. Vänta tills `kaggle datasets status
   jesperfunkrosling/mesa-mes288-detektor-v2` säger `ready`. **Kontrollera att det är privat:**
   `kaggle datasets metadata … -p <scratchpad>` ska ha `"isPrivate": true`, och
   `curl -s -o /dev/null -w "%{http_code}" https://www.kaggle.com/datasets/jesperfunkrosling/mesa-mes288-detektor-v2`
   ska ge 404. Annars: stoppa och säg till.
3. **Starta:** `kaggle kernels push -p dev/detektor/tran/kernel` (ny version av
   `mesa-mes288-detektor-tran`). Kontrollera efter en minut att status är RUNNING.
4. **Vänta:** en bakgrundsloop som frågar `kaggle kernels status` var 10:e minut och avslutas när
   statusen inte längre är RUNNING/QUEUED (grind 2 gjorde så). Ingen `sleep` i förgrunden.
5. **Hämta:** `kaggle kernels output jesperfunkrosling/mesa-mes288-detektor-tran -p
   dev/material/arbete/2026-10-01-mes-288-grind3-natt1`. Saknas ONNX-filerna:
   `python dev/detektor/tran/exportera.py --mapp <den mappen>` (exporterar A-allt och B-halva).
   Kolla loggarna (`logg-A-allt.txt`, `logg-B-halva.txt`) efter fel och antal epoker.
6. **Provet, per modell** (`<namn>` = `natt1-A` resp. `natt1-B`, `<onnx>` = `ut/A-allt/yolox_nano_mesa_960x544.onnx` osv.):
   ```
   python dev/detektor/tran/prov.py --onnx <onnx> --namn <namn> --filista dev/detektor/tran/filista-v2.txt
   python dev/detektor/tran/troskel_val.py --onnx <onnx> --namn <namn> --data dev/material/arbete/2026-09-30-mes-288-traning-detektor-v2
   python dev/detektor/tran/prov246.py --onnx <onnx> --namn <namn> --troskel <troskel_val ur resultat/<namn>.json>
   ```
   Kör **också grind 2:s nano** (`dev/material/arbete/2026-09-30-mes-288-grind2-modeller/ut/yolox_nano/yolox_nano_mesa_960x544.onnx`,
   namn `tranad-nano`, tröskel 0,56) genom `prov246.py` igen, så att alla tre mäts mot samma facit
   (Jesper ritar handrutor i MES-246 under natten; utan det är jämförelsen orättvis).
   Sammanställ: `python dev/detektor/rapport.py --fil dev/detektor/resultat/tranad-nano.json dev/detektor/resultat/natt1-A.json dev/detektor/resultat/natt1-B.json dev/detektor/resultat/dagens.json dev/detektor/resultat/owlv2.json --per-fall`.
7. **Tid per bild:** medianen ur `prov.py` (Macens processor).
8. **Skriv resultatet** under *Resultatet* nedan, en kommentar på MES-288 via
   `dev/linear-agent/klient.cjs` (text via fil) och uppdatera minnet `mes-288-tranad-detektor`.
   Committa resultatfilerna i `dev/detektor/resultat/` och GRIND3.md. Pusha inte.

## Hur svaret läses

Provet är litet: 7 golden-bilder (66 kort) och MES-246 (605 förekomster men bara ~84 unika
kortlägen av 25 kort). Skillnader på 1–3 kort är brus.

| Utfall | Slutsats |
|---|---|
| A bättre än B på **både** golden och MES-246:s unika kortlägen, med minst 3 kort på något av dem | mer data hjälper → fler syntetiska bord (billigt), kompisens film, fler bord |
| A ≈ B (inom 2 kort på båda) | mängden är inte flaskhalsen → titta på högarna specifikt (vilka kort missas, se `per_lage` i `resultat/<namn>-mes246-summa.json`) |
| B bättre än A | misstänk något fel (urvalet, loggarna) innan någon slutsats |

Rapportera till Jesper i vardagsspråk, en tabell: dagens 29/66, OWLv2 62/66, grind 2 nano,
natt 1 A och B — golden (egna, falska, högkort, hela högar), MES-246 (egna, falska, unika
kortlägen rätt), tid per bild. Säg vad som är mätt och vad som är bedömt.

## Resultatet

**Körningen (2026-09-30 23:04 – 2026-10-01 03:46, kerneln version 2, T4 × 2, ~4,6 h GPU-session).**
Jespers tak blev 6 h. Budgeten räknas nu på epok 2–3 i stället för epok 1, som är ~1,7× långsammare
(0777b66). Med epok 1 hade A fått ~100 epoker och B 150, och då hade de inte gått att jämföra. Följden:
A 148 epoker (4,57 h), B 150 (2,91 h). B fick 1 666 träningsbilder mot A:s 3 351 (8 respektive 21 av
Jespers ritade rutor, ×5). Kaggles ONNX-export gick via den nya exportvägen (omvandlingen till opset 17
föll, fil med extern data). Den exporterades om lokalt med `exportera.py`, precis som grind 2:s nano.
Kaggles filer ligger i `ut/<namn>/kaggle-export/`. Modellerna: `dev/material/arbete/2026-10-01-mes-288-grind3-natt1/ut/`.

**Golden.** Fall 16 är nytt (8 kort, alla modeller 8/8), men dagens och OWLv2 är bara mätta på de
sju gamla, så jämförelsen görs på sju fall (66 kort). Tröskeln är vald på valideringen.

| Modell | Tröskel | Egna, 7 fall | Alla 8 fall | Falska | Högkort egna | Hela högar | ms/bild (Macens processor) |
|---|---|---|---|---|---|---|---|
| dagens detektor | – | 29/66 | – | 2 | 9/29 | 4/15 | 28 |
| OWLv2 (läraren) | 0,16 | 62/66 | – | 0 | 25/29 | 11/15 | 11 484 |
| grind 2 nano (49 epoker) | 0,56 | 61/66 | 69/74 | 1 | 24/29 | 10/15 | 40 |
| natt 1 A, allt (148 epoker) | 0,58 | 59/66 | 67/74 | 1 | 24/29 | 10/15 | 45 |
| natt 1 B, halva (150 epoker) | 0,40 | 60/66 | 68/74 | 1 | 25/29 | 11/15 | 42 |

**MES-246** (facit `lagen.json` i 5bfbc8b, med Jespers handrutor; bara ett läge har handrutor än så länge, 10 rutor;
graveyard: bara det översta kortet krävs). Alla tre är mätta mot samma facit.

| Modell | Egna | Sammanslagna | Missade | Falska | Högkort egna | Hela högar | Unika kortlägen rätt |
|---|---|---|---|---|---|---|---|
| grind 2 nano | 700/749 | 37 | 12 | 0 | 234/281 | 67/110 | 77/90 |
| natt 1 A | 711/749 | 25 | 13 | 0 | 247/281 | 81/110 | 77/90 |
| natt 1 B | 719/749 | 19 | 11 | 0 | 253/281 | 86/110 | 80/90 |

**Kontrollen, eftersom B ≥ A** (enligt *Hur svaret läses* ska den göras innan någon slutsats dras): byter man A:s och B:s trösklar
(A vid 0,40, B vid 0,58) blir det 77 mot 80 unika lägen igen, så tröskeln förklarar inte skillnaden.
Urvalet stämmer (1 666 mot 3 351 bilder). Loggarna har inga fel utom exporten. På valideringen
(träningsfilmernas sista tiondel) ligger A något före: AP50 `kort` 0,933 mot 0,923. Inget fel hittat.

**Vad svaret betyder (bedömt).** A ≈ B: på golden skiljer de sig med ett kort, på MES-246 med 3 av 90 unika
lägen, och det är B som ligger före. Dubbelt så mycket data av samma sort hjälpte inte på provet; den
hjälpte lite på valideringen, som liknar träningen. **Mängden är inte flaskhalsen.** Längre träning (A mot
grind 2:s nano) gav fler hela högar i MES-246 (67 → 81, sammanslagna 37 → 25) men inte fler unika
lägen rätt (77 = 77), och golden står still. Nästan alla fel är högkort: av A:s 38 kort utan egen låda
i MES-246 är 34 högkort (B: 28 av 30). Nästa steg enligt tabellen ovan: titta på högarna specifikt
(vilka högkort som missas och varför), inte fler bord av samma sort. Provet är litet (66 kort, 90 unika
lägen), så skillnader på 1–3 är brus.

## Efter natt 1: varför missas högkorten? (2026-10-01, utan GPU)

**Dubblettgränsen (NMS) prövad.** `MESA_NMS=0.7` (matt.py; förval 0,6). Samma modeller och trösklar, inget omtränat.

| Modell | NMS | Golden 7 fall | Hela högar golden | MES-246 egna | Hela högar MES-246 | Dubbletter MES-246 | Falska | Unika lägen |
|---|---|---|---|---|---|---|---|---|
| grind 2 nano | 0,6 | 61/66 | 10/15 | 700/749 | 67/110 | 14 | 0 | 77/90 |
| grind 2 nano | 0,7 | 63/66 | 12/15 | 725/749 | 92/110 | 26 | 0 | 78/90 |
| natt 1 A | 0,6 | 59/66 | 10/15 | 711/749 | 81/110 | 17 | 0 | 77/90 |
| natt 1 A | 0,7 | 62/66 | 13/15 | 727/749 | 97/110 | 29 | 0 | 78/90 |
| natt 1 B | 0,6 | 60/66 | 11/15 | 719/749 | 86/110 | 20 | 0 | 80/90 |
| natt 1 B | 0,7 | 62/66 | 13/15 | 730/749 | 97/110 | 56 | 0 | 81/90 |

Vid 0,8 rusar dubbletterna (84–148 i MES-246) utan att fler kort blir rätt. Falska i golden: 1 för alla, oförändrat.
En dubblett är en andra låda på ett kort som redan har en; i appen kan den bli ett spökkort om inget steg efter slår ihop dem (inte mätt).

**Bildarket** (`hogfel.py`, sparat i `dev/material/arbete/2026-10-01-mes-288-hogar/`). Vid 0,6 missar B 8 unika högkortlägen (28 rutor):
4 där detektorn hade rätt låda och NMS tog bort den (19 rutor; täta land-högar där bara namnremsan syns), och 4 där en hand
ligger över högen (91,00 s och 260,61 s; facit saknar handrutor där). Vid 0,7 är det kvar 3–4 NMS-fall per modell
(lådan överlappar grannens till mer än 0,7) och samma handfall.

**Slutsats (bedömd).** Högarna begränsas inte av träningen: modellen ritar lådorna, och dubblettsteget efteråt tar bort dem.
Nästa: (1) gränsen 0,7, med nano eller A (B:s låga tröskel ger dubbelt så många dubbletter); (2) ett dubblettsteg som vet
hur en hög ser ut (två lådor förskjutna längs kortet med minst en namnremsa behålls båda), mätt mot dubbletterna;
(3) handrutor i 91,00 och 260,61 (Jesper).

**Gränsen vald på valideringen** (`nms_val.py`, 300 syntetiska bord + 71 riktiga rutor; mått = matchade − falska − dubbletter).
Natt 1 A: 0,7 bäst (4 363; 0,6 ger 4 325, 0,8 ger 4 169). Grind 2:s nano: 0,65 bäst (4 318), 0,7 ger 4 277:
den kortare tränade modellen ritar fler dubbletter. A vid 0,7 är bäst av allt på valideringen, och samma val
står sig på provet (tabellen ovan): golden 62/66 och 13/15 hela högar, MES-246 97/110 hela högar, 0 falska.

**Prövat och förkastat:** en högregel som behåller en låda som är förskjuten mot grannen med minst en namnremsa
(4 361, ingen vinst mot 0,7), och en som bara tar bort lådor som ligger nästan helt inne i en annan (4 375 mot
4 363, för liten vinst för en egen regel).

**Beslutet att föreslå:** natt 1 A med NMS 0,7. Kvar i högarna är 3–4 täta land-högar där överlappet är över 0,7, och
handfallen (91,00 s och 260,61 s), som Jespers handrutor tar hand om.

## Natt 2: namnremsan som tredje klass (2026-10-01)

**Körningen:** kerneln version 3, 11:51–15:43, ~3,6 h GPU, nano, 150 epoker, dataset v3 (v2 plus 29 347 remsor ur
hörnen i syntetiska bord och Jespers ritade rutor; lärarens rutor: 20 % kant runt varje kort ignorerad).
Provet är mot MES-246-facit med Jespers handrutor i sju lägen (5cf32f7). ONNX exporterad lokalt (som natt 1).
Valideringen: `namnrad` AP50 0,985; `kort` AP50 0,832 (natt 1 A: 0,933), men kortprovet blev inte sämre (nedan).

**Kortlådorna (C mot natt 1 A, NMS 0,7, tröskeln vald på valideringen: C 0,56, A 0,58):**

| | Golden egna | Golden hela högar | MES-246 egna | MES-246 hela högar | Dubbletter MES-246 | Unika lägen | Falska |
|---|---|---|---|---|---|---|---|
| natt 1 A | 70/74 | 13/15 | 727/738 | 97/107 | 29 | 84/90 | 1 / 0 |
| natt 2 C | 73/74 | 14/15 | 728/738 | 97/107 | 37 | 85/90 | 1 / 0 |

NMS-gränsen vald på valideringen för C: 0,65 (4 477) mot 0,7 (4 474) — lika; 0,7 behålls för jämförelsen.

**Remsorna (`remsprov.py`, tröskel 0,68 vald på valideringen, IoU ≥ 0,5):**

| | Krävda | Egna | Högkort egna | Hela högar | Falska | Dubbletter |
|---|---|---|---|---|---|---|
| golden | 74 | 69 | 25/25 | 11/11 | 0 | 1 |
| MES-246 | 735 | 557 (76 %) | 256/271 | 93/105 | 2 | 8 |

Remsorna som missas i MES-246 ligger mest utanför högarna: vita kort i blanka fickor där namnraden
bländas bort (poäng 0,6–0,66, strax under tröskeln), och remsor som hittas men sitter några bildpunkter
lägre än facit (facit räknas från kortets kant, detektorn lägger den på den tryckta namnraden; en
18 px hög låda tål lite). Med IoU ≥ 0,3: 620/735 (84 %); med tröskel 0,5 och IoU 0,3: 651/735 (89 %).

**Kortlåda eller remsa (det appen kan använda):** ett kort räknas om det har en egen kortlåda (NMS 0,7)
eller en egen remsa.

| | Kort | Hela högar (minst 2 kort, utom graveyard) |
|---|---|---|
| golden, bara kortlådor | 73/74 | 10/11 |
| golden, kortlåda eller remsa | **74/74** | **11/11** |
| MES-246, bara kortlådor | 728/738 | 95/105 |
| MES-246, kortlåda eller remsa | **738/738** | **105/105** |

**Slutsats (mätt):** med remsan hittas alla kort i båda proven, också i de täta landhögarna. Kortlådorna blev
inte sämre av den tredje klassen. **Förbehåll:** golden och MES-246 är filmade i samma miljö som träningen
(andra tillfällen) — ett bord modellen aldrig sett är inte provat. "Kortlåda eller remsa" förutsätter att
appen parar ihop en remsa med sin kortlåda (remsan ligger i lådans övre kant); det steget finns inte än.
Dubbletterna bland kortlådorna (37) är inte hanterade — en remsa per kort kan vara det som löser dem.

## I appen (MES-329, 2026-10-01)

Modellen från natt 2 ligger i `dev/detektor/modell/` (fp32 och fp16) och körs av
`dev/detektor/modell/detektor.js` i appen (index.html: `KamDet`, `fyndUrLador`). Parningen
remsa + kortlåda mättes med appens egen JS-kod innan den kopplades in: `tran/parprov.py`
(node via `modell/para_cli.cjs`, nollprovets mått, samma facit som `prov246.py`).

| MES-246, 66 lägen | Eget | Sammanslaget | Falska | Dubbl | Hela högar | Unika lägen |
|---|---|---|---|---|---|---|
| modellens kortlådor (NMS 0,7, avkodade i JS — exakt natt 2) | 728/738 | 10 | 0 | 37 | 97/107 | 85/90 |
| + kort ur remsor utan låda (kortets höjd) | 730/738 | 8 | 0 | 76 | 99/107 | 86/90 |
| + kort ur remsor, kortets synliga del i stället | 728/738 | 10 | 0 | 51 (+30 kluster) | 97/107 | 85/90 |
| nollprovets inneslutningsregel (0,8) | 720/738 | 18 | 0 | 22 | 89/107 | 84/90 |

Golden (8 fall med hörn): 73/74 och 14/15 högar i alla varianter (2 falska: en flisa vid kanten i 06).
Dubbletter som delar remsa: 0,6 remstjocklekar som tolerans slog ihop två tappade Plains i samma hög
(222,65–241,66 s); 5 % av korthöjden och IoU ≥ 0,3 slår bara ihop riktiga dubbletter. Remsor tjockare
än 0,45 av sin längd räknas inte (0,35 kastade golden 05:s riktiga remsor, 0,37 i en 1440 px bred bild). Skapade kort ger alltså +2 kort och +2 hela högar för ~40
dubblettlådor på 66 lägen — golden (`--tro "detRemsa:0"`) avgör förvalet, se `dev/golden/historik.md`.

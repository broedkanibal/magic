# MES-328 — kan en namnremsa få ett namn? Steg 1–2 mätta (natten 2026-10-02)

**Frågan:** ett kort i en hög visar bara sin överkant med namnraden. Får det ett namn ändå — av
dagens bildmodell (MobileCLIP-S0, som jämför *hela* kort mot Scryfall), av dagens namnläsare
(tesseract.js), eller först efter träning på remsor?

**Svaret, kort:**

| | |
|---|---|
| Behövs träning för remsan som sådan? | **Nej.** På skarpa foton (golden 03–06, 14–16: 64 remsor ur exakta hörn) sätter dagens otränade bildmodell rätt namn på **64 av 64**, 0 säkra fel, 23 av 23 högkort. Det är bättre än hela kort ger (53/61). |
| Vad fäller den då? | **Bilden, inte modellen.** (1) Blänk och oskärpa: i 4K-filmen MES-246 (vita kort i blanka fickor under lampa) är namnraden urblekt; modellen svarar *Swamp* på 598 av 735 remsor, 24 % rätt, 27 säkra fel. (2) Geometrin: appens axelparallella lådor i stället för kortets hörn kostar 67 → 41 av 61. (3) Upplösningen: 960 px analysbild kostar 12 av 74. |
| OCR på samma remsor? | Sämre än bildmodellen överallt och lägger så gott som aldrig till ett kort den missar (1 remsa av 2 950): golden 38/74 (0 fel) vid full upplösning, 23/74 vid 960; **MES-246 0/735** — texten finns inte i bilden. |
| Högbänken (MES-250: högar 0/13, par 2/13) | Med detektorns remsor och bildmodellen: **högar 3/13, par 5/13, ensamma 14/39, 0 fel namn**. Högbänkens bilder är 1080p-skärminspelningar med ~10 px titelrad — där kan inget läsa. |
| Rekommendation | **Inte träning nu.** Skär remsan ur kortets geometri (20 % av kortet, ur kamerans fulla bild), kalibrera om tröskeln på remsor, och mät blänket på riktig telefon. Steg 3 (träningsdata, Kaggle) är inte gjort — se *Rekommendation*. |

Allt är mätt med skripten i `dev/remsa/` (*LÄS-MIG* längst ner). Inget i appen är ändrat.
Tabellerna är genererade ur resultatfilerna av `tabell.py` (`--kontrollera` säger om dokumentet avviker
från filerna); granskningen 2026-10-02 hittade två avskrivna mått som inte stämde (högkort "25/25" och
"20/160"), och sedan dess skrivs ingen tabell för hand.
Alla bilder är prov-material enligt `dev/detektor/delning.py` — `remsor.krav_prov` sitter på varje källa,
också `riktiga()` (sedan granskningen 2026-10-02), och stoppar annat.

## 0. Kontrollen först: återger Python-koden embed.js?

Innan remsor mäts måste omskrivningen av receptet visas ge samma svar som modulen på det som
redan är mätt. `kalibrering.py` kör exakt receptet (256 px, skarp + sudd, fyra vridningar,
centrering, poäng per namn, säker vid marginal > 0,11, webbläsarens omskalning) på de 61
riktiga beskärningarna i `dev/embed/riktiga/`:

<!-- tabell: kalibrering -->
| | Rätt | Säkra rätt | Säkra fel |
|---|---|---|---|
| `dev/embed/RAPPORT.md`, modulen (2026-09-18) | 52/61 | 46 | 1–2 |
| `kalibrering.py` (den här koden) | **53/61** | **46** | **2** |
<!-- /tabell -->

Samma kort faller (fall 11:s Swamp som Plains är det kända säkra felet). Receptet är rätt
återgivet; det som mäts nedan är modellen, inte en bugg i omskrivningen.

## 1. Steg 1 — nollprovet: dagens bildmodell på remsor, utan träning

**Referenser:** remsan (de översta 12, 16 eller 20 % av kortet) ur lekens Scryfall-bilder
(28 namn, 105 konstverk, samma urval som appen), i varianterna skarp + sudd och vridningarna
0° och 180° (en remsa ur en detektor ligger alltid vågrätt, men kan vara vänd).
**Frågor:** remsan ur kortens **ritade hörn** (MES-286) — exakt där namnraden sitter, också för
kort i vinkel och i högar — varpad till samma form som referensremsan:

| Källa | Vad | Remsor | Högkort |
|---|---|---|---|
| golden | fall 03–06 (bild.jpg, 1080 px) och 13–16 (originalen: 5712 px foton; 13 = 4K-rutan ur MES-246) | 74 | 29 |
| mes246 | 63 ritade lägen i 4K-filmen (3840 × 2160), minst halva namnraden synlig, inte under hand | 735 (77 unika kortlägen) | 271 |
| riktiga | appens egna beskärningar ur golden 01–12 (axelparallell låda, 8 % marginal), översta andelen | 61 | 0 |

Upplösning: `orig` = bilden som den är; `1920`/`960` = hela bilden nerskalad till den bredden
först (960 är appens analysbild).

### Tabellen (`nollprov.py`, `resultat/nollprov.json`)

Säker = marginal > 0,11 (dagens tröskel, kalibrerad på hela kort). *Nollfel* = den lägsta
tröskel som ger 0 säkra fel på just det materialet, och hur många rätt som då blir säkra.

<!-- tabell: nollprov -->
| Källa | Andel | Upplösning | Remsor | Rätt | Säkra rätt | **Säkra fel** | Högkort rätt | Högkort säkra fel | Marginal (median, rätt) | Nollfel: tröskel → säkra | Remsans höjd i källan (px) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| golden | 0,12 | orig | 74 | 56 (76 %) | 42 | **0** | 21/29 | 0 | 0,249 | 0,079 → 46 | 47 |
| golden | 0,16 | orig | 74 | 65 (88 %) | 61 | **1** | 25/29 | 0 | 0,351 | 0,124 → 60 | 62 |
| golden | 0,20 | orig | 74 | 67 (91 %) | 63 | **0** | 25/29 | 0 | 0,388 | 0,060 → 65 | 78 |
| golden | 0,20 | 1920 | 74 | 66 (89 %) | 61 | **1** | 25/29 | 0 | 0,354 | 0,110 → 61 | 43 |
| golden | 0,20 | 960 | 74 | 55 (74 %) | 36 | **1** | 23/29 | 0 | 0,224 | 0,121 → 36 | 38 |
| golden | 0,16 | 960 | 74 | 40 (54 %) | 29 | **2** | 16/29 | 0 | 0,210 | 0,176 → 26 | 30 |
| golden | 0,12 | 960 | 74 | 26 (35 %) | 9 | **3** | 9/29 | 3 | 0,081 | 0,123 → 7 | 22 |
| mes246 | 0,12 | orig | 735 | 123 (17 %) | 0 | **8** | 107/271 | 0 | 0,025 | 0,145 → 0 | 49 |
| mes246 | 0,16 | orig | 735 | 168 (23 %) | 44 | **5** | 154/271 | 0 | 0,083 | 0,130 → 21 | 66 |
| mes246 | 0,20 | orig | 735 | 178 (24 %) | 66 | **27** | 157/271 | 3 | 0,093 | 0,180 → 11 | 82 |
| mes246 | 0,20 | 1920 | 735 | 179 (24 %) | 70 | **33** | 159/271 | 3 | 0,098 | 0,177 → 13 | 41 |
| mes246 | 0,16 | 960 | 735 | 188 (26 %) | 9 | **47** | 165/271 | 0 | 0,041 | 0,230 → 0 | 16 |
| mes246 | 0,20 | 960 | 735 | 180 (24 %) | 42 | **11** | 155/271 | 1 | 0,052 | 0,149 → 15 | 20 |
| riktiga | 0,12 | orig | 61 | 17 (28 %) | 9 | **1** | – | – | 0,117 | 0,115 → 9 | 29 |
| riktiga | 0,16 | orig | 61 | 29 (48 %) | 23 | **1** | – | – | 0,224 | 0,125 → 23 | 38 |
| riktiga | 0,20 | orig | 61 | 41 (67 %) | 31 | **0** | – | – | 0,258 | 0,104 → 32 | 48 |
<!-- /tabell -->

(Alla 21 kombinationer ligger i `resultat/nollprov.json`; de utelämnade raderna ändrar inte bilden.)

### Golden per fall (andel 0,20, orig)

<!-- tabell: golden-per-fall -->
| Fall | Rätt | Säkra fel | Högkort rätt | OCR rätt (titelraden) |
|---|---|---|---|---|
| 03 trä, lampa, 40 cm, 11 kort omlott | 11/11 | 0 | 2/2 | 9/11 |
| 04 trä, dagsljus, 8 kort omlott | 8/8 | 0 | 3/3 | 5/8 |
| 05 ribbor, dagsljus, 6 kort omlott | 6/6 | 0 | 4/4 | 3/6 |
| 06 ljusgrå, dagsljus, 12 kort omlott | 11/11 | 0 | 2/2 | 7/11 |
| 14 trä, lampa, 50 cm, 11 kort omlott (foto) | 10/10 | 0 | 6/6 | 5/10 |
| 15 trä, dagsljus, 50 cm, samma kort (foto) | 10/10 | 0 | 6/6 | 4/10 |
| 16 trä, lampa, 8 kort (foto) | 8/8 | 0 | 0/0 | 5/8 |
| 13 svart matta, lampa, 4K-ruta ur MES-246 | 3/10 | 0 | 2/6 | 0/10 |
<!-- /tabell -->

**Sju foton: 64 av 64, alla säkra utom två, inget säkert fel, 23 av 23 högkort.** Fall 13 har 6 högkort,
2 rätt. Marginalerna är stora (median
0,39, mot 0,11 som gräns). Det är bättre än hela kort ger på samma sorts bilder (riktiga: 53/61)
— remsan är det mest särskiljande på kortet, och ur exakta hörn är den fri från bord och grannar.

### MES-246 — varför 24 %

Modellen svarar **Swamp på 598 av 735 remsor**. Per namn (0,20, orig): Swamp 147/150, Plains
17/126, Thriving Moor 3/61, Fencing Ace 0/58, Ancestral Blade 0/55, Mirran Bardiche 0/44 …
De 157 "rätta högkorten" är nästan alla Swamp-högar (140/143) — inte en förmåga, en tur.

Bilderna (`dev/material/arbete/2026-10-02-mes-328-remsor/nollprov-0.20-mes246-orig/` och
kontaktsidorna i `…-ark/`) visar varför: det är 4K-film under lampa, korten ligger i **blanka
fickor** och de vita kortens namnrad är **urblekt** — en ljus suddig yta där namnet knappt anas.
Också de gula (Thriving Moor) är **suddiga**: bokstäverna är utsmetade fast raden är 40 px hög.
Efter centreringen ser alla sådana remsor likadana ut, och det närmaste namnet blir det mörkaste
landet. Swamp-högarna klarar sig för att svart ram med vit text tål blänket. Golden 13 är en ruta
ur samma film och faller på samma sätt (3/10). GRIND3.md såg samma sak för detektorn: remsklassen
missar just "bländade vita kort i fickor".

Det är alltså inte remsan som är för liten (66–82 px hög i 4K) utan bilden som är urblekt och
suddig. Steg 2 nedan visar att OCR läser 0 av 735 där. Vad träning kan göra åt det är *inte* mätt —
se steg 3 nedan: att informationen "saknas i bilden" är ett antagande, med ett prov som fäller det.

### Tre saker till ur tabellen

1. **Andelen:** 0,20 slår 0,16 slår 0,12 på allt. Namnraden sitter 4–11 % ner på kortet, men
   hörnen är ritade runt *fickan* och i Jespers fickor sitter kortet 2–4 mm ner, så 12 % missar
   halva namnet. Detektorns remsklass är tränad på 14 % (`remsa.py`); för bildmodellen bör
   remsan vara 20 % — då delar referens och fråga mer ram och lite konst.
2. **Upplösningen:** 960 px (appens analysbild) kostar 12 av 74 på golden (67 → 55) och gör
   trösklarna värdelösa (säkra fel 1–3). Remsan ska skäras ur kamerans fulla bild, som
   beskärningen gör i dag — inte ur analysbilden.
3. **Dagens tröskel 0,11 gäller inte remsor.** På foton räcker 0,06 för noll fel; på
   lampfilmen krävs 0,18 och då återstår 11 säkra av 735. Tröskeln måste kalibreras om på
   remsor, på bättre bilder än MES-246.

### `riktiga` — appens lådor duger inte som remskälla

Samma kort som ger 53/61 på hela kortet ger 41/61 när den översta femtedelen av *lådan* tas:
lådan är axelparallell runt det synliga, med marginal, så remsan hamnar fel på kort i vinkel och
tar bord med sig. Remsan måste komma ur något som vet var kortet är: detektorns remsklass
(MES-329) tillsammans med kortlådan, eller kortets hörn.

## 2. Steg 2 — OCR på samma remsor, och sätt 2 mot sätt 3

**Läsaren är appens:** tesseract.js 5.1.1, språket eng, PSM 7, Dice-likhet mot lekens 28 namn,
godkänt vid poäng ≥ 0,6 — koden i `ocr.cjs` är tagen rakt ur `Namn` i index.html (appens *dom* är
strängare: säkert namn kräver också marginal ≥ 0,2, och band under 20 px läses inte — se högbänken). Remsan skalas
som appen gör (64 px hög, högst 4× upp). Titelraden skärs ur hörnen i tre lägen (2, 5 och 8 %
ner, 10 % höga) som prövas i ordning tills något når 0,6 — appens läsare prövar sex lägen av
samma skäl. **Rätt** = godkänt och facit. **Fel** = godkänt men ett annat namn: det som blir ett
fel namn på bordet.

### OCR ur hörnen (`ocr_export.py` + `ocr.cjs` + `ocr_rapport.py`)

<!-- tabell: ocr-horn -->
| Källa | Upplösning | Utsnitt | Remsor | Rätt (≥ 0,6) | **Fel (≥ 0,6)** | Inget namn | Topp-1 rätt oavsett poäng | Högkort rätt | Titelrad px i källan | ms/kort (under last) |
|---|---|---|---|---|---|---|---|---|---|---|
| golden | orig | titelraden, 3 lägen | 74 | 38 (51 %) | **0** | 36 | 46 | 12/29 | 39 | 144 |
| golden | 960 | titelraden, 3 lägen | 74 | 23 (31 %) | **0** | 51 | 32 | 8/29 | 19 | 173 |
| golden | orig | hela 14 %-remsan | 74 | 10 (14 %) | **0** | 64 | 18 | 2/29 | 54 | 66 |
| mes246 | orig | titelraden, 3 lägen | 735 | 0 (0 %) | **0** | 735 | 18 | 0/271 | 41 | 163 |
| mes246 | 960 | titelraden, 3 lägen | 735 | 0 (0 %) | **0** | 735 | 26 | 0/271 | 10 | 184 |
| mes246 | orig | hela 14 %-remsan | 735 | 0 (0 %) | **0** | 735 | 15 | 0/271 | 57 | 60 |
<!-- /tabell -->

Golden per fall (orig, titelraden): 03 9/11, 04 5/8, 05 3/6, 06 7/11, 13 **0/10**, 14 5/10,
15 4/10, 16 5/8. Det som läses rätt är nästan alltid säkert (poäng median 0,9); det som inte når
0,6 är mest skräp ("Yalkyric SSWerd" 0,50, "l Arn ral Bla Ie" 0,43). **I MES-246 läser OCR:n
ingenting**: högsta poäng 0,40 på 735 kort — inte ens Swamp-högarna (svart ram, vit text), som
bildmodellen klarar. Texten går inte att läsa i den filmen, varken vid 4K eller 960.

**Fälla, uppmätt:** ger man tesseract *hela* 14 %-remsan (fickkant, svart ram, namnrad, lite
konst) läser den ingenting — 0 av 1 332 detektorremsor i första försöket, 10/74 på golden ur
hörnen. PSM 7 vill ha en rad. Därför tunna band, som appens `Namn.las` redan gör.

### Sida vid sida — samma remsor ur hörnen

Bildmodellen vid 20 %, OCR på titelraden. "OCR rätt eller bildmodellen säker" är vad en
kombination skulle ge med dagens trösklar; "…fel" är vad den skulle sätta fel namn på.

<!-- tabell: sida-vid-sida -->
| Remsor | Både rätt | Bara OCR | Bara bildmodellen | Ingen | OCR rätt / fel | Bildmodellen rätt / säkra rätt / säkra fel | OCR rätt ELLER bildmodellen säker | …fel | Högkort: OCR / bild / ingen |
|---|---|---|---|---|---|---|---|---|---|
| **golden orig** 74 | 38 | **0** | 29 | 7 | 38 / 0 | 67 / 63 / 0 | 64 | 0 | 12 / 25 / 4 av 29 |
| **golden 960** 74 | 23 | **0** | 32 | 19 | 23 / 0 | 55 / 36 / 1 | 38 | 1 | 8 / 23 / 6 av 29 |
| **mes246 orig** 735 | 0 | **0** | 178 | 557 | 0 / 0 | 178 / 66 / 27 | 66 | 27 | 0 / 157 / 114 av 271 |
| **mes246 960** 735 | 0 | **0** | 180 | 555 | 0 / 0 | 180 / 42 / 11 | 42 | 11 | 0 / 155 / 116 av 271 |
<!-- /tabell -->

**OCR lägger aldrig till ett kort som bildmodellen missar.** De sju golden-remsor där båda faller
är alla ur fall 13 (lampfilmen): fyra urblekta vita namnrader (Plains ×2, Fencing Ace, Ancestral
Blade), tre suddiga (Ukud Cobra, Thriving Moor, Mirran Bardiche). I MES-246 är de 557 "ingen"
samma två fel: **blänk** på de vita korten och **oskärpa** på allt — se kontaktsidorna
`dev/material/arbete/2026-10-02-mes-328-ark/bada-fel-*.jpg`. Ingen hand, ingen för liten remsa.

### Remsorna detektorn faktiskt ger (`detektor_remsor.py`)

Det appen får är inte hörn utan den tränade detektorns (MES-329) axelparallella remslådor
(`namnrad` ≥ 0,68, NMS 0,6), körda på 960 px analysbild och skurna ur källan. Varje låda paras
med facit (IoU ≥ 0,3): 666 av 692 lådor fick ett namn; 143 av 809 facitremsor saknade låda
(mest MES-246:s bländade kort, som GRIND3.md). Tappade kort: remsan står på högkant och vrids
vågrät åt det håll hörnen säger — det vet appens parning ur kortlådan. Referens: 14 %-remsa
(det klassen tränades på).

<!-- tabell: detektor -->
| | Remsor | Bildmodellen rätt | säkra rätt / **säkra fel** | OCR rätt (band) / fel | Bara OCR | Högkort bild |
|---|---|---|---|---|---|---|
| golden, ur källan (orig) | 69 | **63 (91 %)** | 56 / **0** | 25 / 0 | 0 | 23/27 |
| golden, ur analysbilden (960) | 69 | **50 (72 %)** | 39 / **1** | 6 / 0 | 1 | 18/27 |
| mes246, ur källan (4K) | 597 | **119 (20 %)** | 2 / **1** | 0 / 0 | 0 | 78/256 |
| mes246, ur analysbilden (960) | 597 | **175 (29 %)** | 19 / **5** | 0 / 0 | 0 | 152/256 |
<!-- /tabell -->

Golden ur källan: 63/69 mot 67/74 ur hörnen — detektorns låda duger nästan lika bra som hörnen
när källan är skarp och lådan vrids rätt. Kolumnen *Bara OCR* är det OCR:n lägger till som bildmodellen
missar: en remsa av 1 332 — Militant Inquisitor i fall 03 vid 960, där bildmodellen sa Venomous
Hierophant med marginal 0,03 och OCR läste rätt med 0,62. De sex som faller: fem ur fall 13 (blänk, oskärpa) och
en där lådan sitter på grannkortet (Scourge under Pacifism: båda metoderna läser Scourge — ett
parningsfel i provet, inte i metoden). Lådan sträckt nedåt till 20 % med 20 %-referenser:
57/69 på golden (ingen vinst — 14 % + rätt vridning räcker för lådor) men 57 säkra fel i MES-246
(mer ficka och konst i blänket). För bildmodellen i appen: **lådan som detektorn ger, vriden rätt,
ur kamerans fulla bild.**

Den första körningen av skriptet gav 48/69 på golden ur källan — det är mätt och förklarat
(granskningen 2026-10-02): koden i commit 62e2b72 vred en remsa som står på högkant alltid medurs,
men i golden står 37 av 74 namnrader lodrätt i bilden (liggande inspelningar, alla åt samma håll)
och ska vridas moturs — de lästes upp och ner. Den gamla koden omkörd ger 48/69 igen (säkra rätt 40,
0 säkra fel; ur 960: 37/69), och 17 av dess 21 fel är sådana lodräta remsor
(`resultat/gammal-vridning-detektorremsor.json`). Med hörnens riktning (`vagrat`, e038fda) blir det
63/69, som byggaren och granskaren fått var för sig.

### Högbänken — jämförelsen MES-250 (`hogbank_remsor.py`)

68 fall ur passet 2026-09-22 (skärminspelning av kameravyn, 1080 × 610, kort 165 px breda →
titelrad ~10 px) och golden 01–06/14–16. Detektorn körs på hela bilden; remsor vars mitt ligger
i fallets låda är högens. En hög är hel när minst n remsor säger högens namn säkert; ett par när
topp och under båda finns; **fel namn** = ett säkert/godkänt namn som inte hör till fallet.

<!-- tabell: hogbank -->
| Sätt | Högar hela | Par hela | Ensamma | **Fel namn** | Remsor i lådorna | Fall utan remsa |
|---|---|---|---|---|---|---|
| MES-250, dagens kedja (namnläsaren på hela beskärningen) | 0/13 | 2/13 | 13/39 | – | – | – |
| bildmodellen (säker, marginal > 0,11) | 3/13 | 5/13 | 14/39 | **0** | 97 | 3 |
| OCR (≥ 0,6, band ur detektorremsan, båda vridningarna) | 0/13 | 4/13 | 12/39 | **0** | 97 | 3 |
| OCR med appens dom (≥ 0,6 **och** marginal ≥ 0,2) | 0/13 | 4/13 | 11/39 | **0** | 97 | 3 |
| OCR (≥ 0,6) eller bildmodellen | 3/13 | 5/13 | 16/39 | **0** | 97 | 3 |
<!-- /tabell -->

Det som blir helt är golden-fallen (g03, g04, g14, g15: 35–180 px remsor ur foton). Passets
högar (31–40 px remsor ur en suddig skärminspelning) får Swamp med marginal 0,02–0,13 — rätt
namn överst oftast, men inte säkert, och OCR når 0,6 en gång (pass-213). Det är MES-250:s
slutsats igen: på det materialet kan ingen läsa titelraden. Det är ändå bättre än dagens 0/13 och
2/13, utan ett enda fel namn.

**Bänkens OCR-dom är mildare än appens på två sätt** (`ocr.cjs`, huvudkommentaren): appen kallar ett
namn säkert först vid poäng ≥ 0,6 *och* marginal ≥ 0,2 till näst bästa namn (index.html, `sakertNamn`)
— med den regeln faller g01-thriving-heath (poäng 0,73, marginal 0,13) och OCR:ns ensamma blir 11/39,
raden ovan. Och appen läser inte alls när bandet i källan är under 20 px (`MIN_KALLHOJD`) utan svarar
"liten": vid 960 px analysbild gäller det 61 av 74 golden-remsor och alla 735 i MES-246, så där hade
appen hoppat över i stället för att läsa 0. Golden-siffrorna i OCR-tabellerna står: alla 77 rätt ur
hörnen och 31 ur detektorlådorna har marginal ≥ 0,2.

### Tiden per remsa på Macen (`tid.py` och `ocr.cjs --bara`, sparat i `resultat/tid*.json`)

<!-- tabell: tid -->
| Steg | Tid | Mätt |
|---|---|---|
| varpning ur hörn + tryck till 256 × 256, ur en 3840 px bred bild | 1,0 ms | `tid.py`, last 3,3 |
| bildmodellen, onnxruntime på processorn, 4 trådar, en remsa i taget | **25 ms** (åtta i taget: 29 ms per remsa) | `tid.py`, last 3,3 |
| bildmodellen, 4 trådar, under last (nollprovets 21 körningar, median per körning) | 35–61 ms | `nollprov.json`, `ms_modell` |
| bildmodellen, 1 tråd | 85 ms | `tid.py` |
| OCR (tesseract.js, en arbetare) per kort, 1–3 band tills 0,6 som appen: golden orig titelraden (74 kort) | **117 ms** (p90 232 ms; 2,2 band per kort) | `tid-ocr-golden-orig-titelraden.json` |
<!-- /tabell -->

Bildmodellens 25 ms gäller en körning utan annan egen last (lastmedel 3,3 vid start); under nollprovets
21 körningar, med annat igång, låg medianen 35–61 ms. OCR-tiden är en sparad ensam körning av samma
74 golden-remsor som OCR-tabellen (`--bara orig/namnrad/golden`): 38 rätt, 0 fel, som där.
Telefonen är inte mätt. MES-213 mätte 98 ms per 256 × 256-tensor med WebGPU i webbläsaren på
Jespers Intel-Mac; remsan är samma tensor. Detektorn på 960 × 544: 52–96 ms per bild här.

## 3. Steg 3 — träningsdatat: inte gjort, med avsikt

Promptens regel: *gör steg 3 bara om steg 1 säger att träning behövs.* Steg 1 säger att dagens
modell klarar remsan när remsan är skarp och rätt skuren (64/64, 0 säkra fel), och att det som
fäller den — blänk, oskärpa, 10 px titelrader, fel geometri — fäller OCR:n lika hårt. Tiden lades i
stället på steg 2: tre upplösningar, tre lägen för titelraden, detektorns egna lådor och högbänken.

**Att blänket "inte går att träna bort" är ett antagande, inte ett mått.** Att OCR läser 0 bevisar
inte att en bildvektor inte kan skilja urblekta remsor på ram och konst, och felet i MES-246 är
*systematiskt* (Swamp på 598 av 735, 27 säkra fel) — precis det en finjustering med störningarna i
`dev/detektor/synt/` (blänk, oskärpa) är tänkt att rätta. Provet som fäller antagandet: en liten
finjustering på Scryfall-remsor med synt-blänk och -oskärpa plus riktiga remsor ur träningsfilmerna,
mätt på MES-246-remsorna som hålls helt utanför träningen (`delning.py`). Ger den fler än 66 säkra
rätt av 735 vid 0 säkra fel (dagens 66 och 27) är antagandet fel och träning rätt väg. Provet måste
räkna per namn — mätt bara på Swamp-högarna hade en finjustering kunnat "hjälpa" av samma tur som
i dag. Den mätningen är steg 3–4 och är inte gjord.

Det som *skulle* gå att träna bort, om det behövs senare: tolerans mot fickkanten och lite bord i
en axelparallell låda (detektorn ger 63/69 mot hörnens 67/74 — litet), och delvis blänk. Datat
finns då: Scryfall-remsor med `dev/detektor/synt/`:s störningar (ficka, blänk, oskärpa,
perspektiv) och riktiga remsor ur träningsfilmerna där Jesper ritat namn (66 namngivna kort i
`dev/detektor/larare/matning/*/lagen.json`, mest Plains/Swamp — tunt). Prov och träning hålls
isär med `delning.py`. Men mät först på en skarp telefoninspelning i fickor under lampa: är
blänket lika illa där som i MES-246 är det exponeringen, inte modellen, som ska fixas.

## Rekommendation

**Räcker sätt 1 + 2? Nej — sätt 1 (minnet, MES-233) + bildmodellen på remsor, som redan finns.
Inte träning (sätt 3), inte OCR (sätt 2) som huvudspår.** I ordning:

1. **Remsan ur geometrin, inte ur lådan.** Appen har nu kortlådan och remsan parade (MES-329).
   Skär remsan ur kamerans fulla bild (inte 960-analysbilden), 20 % av kortets höjd, vriden rätt
   för tappade kort. Mät med `nollprov.py` som grind: golden-fotona ska ge 64/64 och 0 säkra fel.
2. **Kalibrera tröskeln på remsor.** 0,11 är kalibrerad på hela kort; på remsor ger den 27 säkra
   fel i MES-246. Gör om `KALIBRERING` för remsor, med marginal > 0,18 som golv tills det är mätt
   på riktig telefon.
3. **Blänket är nästa mätning, inte nästa modell.** MES-246 är filmad i blanka fickor under en
   lampa; både OCR och bildmodellen läser 0 där. Spela in samma bord med telefonens egen
   exponering (och utan fickor) och kör `nollprov.py` — se om det är fickorna, lampan eller
   kameraappens film (4K 60 fps är mjuk) som tar texten.
4. OCR som andra vittne på det bildmodellen är osäker på — den lägger inte till kort, men den
   gav 0 fel på 148 golden-remsor och kan bekräfta. Alltid på tunna band, aldrig hela remsan.
5. Steg 3–4 (finjustering på Kaggle) först om 1–3 lämnar kvar fel på skarpa bilder.

**Issuens "Klart när" är inte uppfyllt — det är besvarat med resonemang, inte mätt fullt ut.** Kravet
var GO/NO-GO med siffror på högbänken (gjort: 3/13, 5/13, 0 fel namn), 0 säkra fel (gjort på golden;
inte i MES-246 med dagens tröskel), tid per remsa *på telefonen* (omätt — bara Macen) och sätt 3 mot
sätt 2 på samma remsor (sätt 3 = finjusteringen är inte mätt; det som ställts mot OCR är dagens
otränade modell). NO-GO:t gäller alltså *nu*: skarpa remsor behöver ingen träning, och innan träning
prövas ska geometri, tröskel och blänk mätas på telefonen. Antagandet och provet som fäller det står i
steg 3.

**Vad Jesper behöver göra:** läsa det här, säga om riktningen håller (geometri + tröskel +
blänkmätning före träning), och om han vill: spela in blänkprovet i punkt 3.

## LÄS-MIG: skripten

| Skript | Gör |
|---|---|
| `lib.py` | bildmodellen i Python med embed.js-receptet; remsor ur hörn (perspektivvarp) |
| `remsor.py` | var remsorna med känt namn finns (golden, MES-246, riktiga); spärren `krav_prov` |
| `kalibrering.py` | hela kort på `dev/embed/riktiga` — ska ge ≈ 52/61 |
| `nollprov.py` | steg 1: `--andelar 0.12 0.16 0.20 --kallor golden mes246 riktiga --res orig 1920 960 --ark` |
| `ocr_export.py` | titelraden (tre lägen) och 14 %-remsan som PNG, skalade som appens läsare |
| `ocr.cjs` | tesseract.js v5, eng, PSM 7, Dice-matchning mot leken — rakt ur `Namn` i index.html |
| `ocr_rapport.py` | OCR-tabellen och sida vid sida med bildmodellen; kontaktsidor där båda faller |
| `detektor_remsor.py` | remsorna den tränade detektorn (MES-329) faktiskt ger: bildmodellen på dem, band för OCR |
| `hogbank_remsor.py` | högbänkens 68 fall med detektorremsor: högar/par hela, fel namn; `--rapport` med OCR |
| `tid.py` | tiden per remsa (`--ut resultat/tid.json`); OCR-tiden med `ocr.cjs --bara … --ut` |
| `tabell.py` | RESULTAT.md:s tabeller ur resultatfilerna: `--skriv` byter ut dem, `--kontrollera` larmar när dokumentet avviker |

Modellen: `dev/embed/modeller/mobileclip-s0-vision.onnx` (gitignorerad) = `vision_model.onnx`
från huggingface.co/Xenova/mobileclip_s0 (45 MB). Referenserna: `node dev/embed/hamta-referenser.cjs`.
Python: `~/.mesa/detektor-venv/bin/python` (onnxruntime, cv2). OCR: `npm install` i `dev/remsa/`.
Resultaten: `dev/remsa/resultat/*.json`; bilderna och kontaktsidorna i
`dev/material/arbete/2026-10-02-mes-328-*` (gitignorerat, bara på Macen).

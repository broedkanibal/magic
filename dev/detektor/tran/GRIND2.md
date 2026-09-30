# Grind 2: ett litet träningsförsök och provet mot det ritade facit (MES-288)

**Svar 2026-09-30: GO.** Båda modellerna klarar lägstanivån (minst 55 av 66 egna, högst 2 falska).
Tabellen står under *Resultatet* längst ned.

## Vad som tränas

| | |
|---|---|
| Modeller | YOLOX-tiny (5,1 M) och YOLOX-nano (0,9 M), Megvii, Apache-2.0 — inte Ultralytics |
| Start | COCO-förtränade vikter ur YOLOX-repots release 0.1.1rc0; klasshuvudet börjar om (2 klasser i stället för 80), 636 av 642 tensorer laddas |
| Indata | 960 × 544 (rektangulärt; YOLOX klarar det, ingen kvadratisk letterbox). Bilder med annat format skalas in och fylls ut med 114 nere/till höger |
| Klasser | `kort`, `baksida` |
| Ignorerade ytor | förlusten maskas: klass 2 i etiketterna = ignorerad yta. De tas bort ur tilldelningen (SimOTA ser bara riktiga lådor), och ankare vars mitt ligger i en ignorerad yta och som inte blivit positiva får vikten 0 i objektförlusten. Klassförlusten och lådförlusten gäller bara positiva ankare och påverkas inte. Kontrollerat på en riktig batch: 0–2 003 av 10 710 ankare per bild maskas, objektförlusten ändras (12,8 → 12,2) |
| Förstärkning | YOLOX:s mosaik (4 bilder, skala 0,5–1,5, vridning ±10°, skjuvning 2°), HSV, spegling; ingen mixup (som YOLOX-tiny/nano). Flera storlekar (864–1088 px breda) var tionde iteration; de sista 10 % av epokerna utan mosaik, med L1-förlusten på, som i YOLOX |
| Optimering | SGD med nesterov, lr 0,01/64 per bild, cosinus med uppvärmning, EMA 0,9998, fp16 (AMP), batch 16 |
| Tid | epokerna anpassas efter första epoken så att träningen ryms i 3 h per modell; tiny och nano samtidigt på Kaggles T4 × 2 (en modell per kort) |
| Kernel | `dev/detektor/tran/kernel/` (script, `is_private: true`, `enable_gpu: true`, internet på för att hämta YOLOX och vikterna från Megvii:s GitHub). Rökprovad lokalt på processorn (3 iterationer, validering, ONNX-export) |
| Export | ONNX opset 17, avkodningen kvar i grafen (som `fart/exportera_yolox.py`), utan onnxsim; fp16 med `onnxruntime.transformers.float16` |

## Datat (byggt 2026-09-30, lokalt)

`python dev/detektor/tran/dataset.py --synt g2-a,g2-b,g2-c,g2-d --namn v1` →
`dev/material/arbete/2026-09-30-mes-288-traning-detektor-v1/` (283 MB, gitignorerat).

| Del | Bilder | Lådor `kort` | Lådor `baksida` | Ignorerade ytor |
|---|---|---|---|---|
| riktiga, träning | 567 | 4 550 | 597 | 5 599 |
| riktiga, validering | 71 | 734 | 109 | 903 |
| syntetiska, träning | 2 700 | 32 764 | 3 026 | 6 150 |
| syntetiska, validering | 300 | 4 034 | 296 | 1 117 |

- **Regel G vid 0,5 och de ritade rutorna (2026-09-30, före uppladdningen):** `OMLOTT_G` 0,33 → 0,5 gav
  lärarens facit 121 egna lådor mot Jespers ritning i stället för 95 (1 av 129 helt synliga missat, 0 falska,
  som förut). De tolv rutor Jesper ritat (`larare/matning/`) har hans ritning som facit: 250 lådor, 7 kort
  under en hand ignorerade (`larare/matning/hander.json`). `kort`-lådorna i riktiga träningsrutor gick
  från 3 809 till 4 550.
- **Riktiga:** de 638 rutorna ur Jespers tre träningsfilmer med lärarens facit (regel A–H), nedskalade
  direkt till **960 × 540** — modellen ser aldrig mer än 960 px, och 1920 px hade fyrdubblat datasetet
  utan att tillföra något till 960-träningen (mosaiken skalar 0,5–1,5, så förstoring blir lite mjukare;
  korten i filmerna är redan större än i golden). Baksidesflaggan → `baksida`, övriga → `kort`.
- **Regel H (2026-09-30, före träningen):** 240 facit-lådor med klassen `kort` som kan vara en baksida
  (Magic-baksidan utan ficka på trä och vitt bord, två baksidor omlott, fickor och leken under en hand)
  är nu ignorerade ytor i stället — ungefär 151 av dem var baksidor med fel klass, ungefär 44 var
  framsidor som ignoreras i onödan (räknat med ögat på alla 240). `kort`-lådorna i de riktiga rutorna
  gick från 4 676 till 4 436; `baksida` är orörd (701). Se `larare/TRANINGSRUTOR.md` avsnitt 10.
  Datasetet v1 är ombyggt efter H (tabellen ovan) och filistan prövad igen.
- **Syntetiska:** 3 000 bord (`--fro` 200000–203749), 960 × 544. Lådor = kort med `far_lada`; ignorerade =
  kort med en synlig låda men utan `far_lada` (för lite syns, eller handen täcker > 45 %).
  Händer i 1 327 av 3 000. Tolv riktiga underlag (178–222 bord var) och ritad yta i 589.
- **Validering** (bara för att se att träningen går framåt): var tionde syntetiska bord (`fro % 10 == 0`)
  och de sista 10 % av varje film i tid, så att nästan likadana grannrutor inte hamnar på båda sidor.
  Provet är aldrig det här.
- **Spärren:** alla 3 638 källbilder och utfiler gick genom `krav_traning_alla`; filistan (bara
  sökvägar) är `dev/detektor/tran/filista-v1.txt`. Ingen rad pekar på golden, `rita/`, högbänken,
  MES-246, fotona eller partiet (grep: 0). De tolv bakgrundskällorna i de syntetiska borden prövades
  också (alla träning). `ladda_upp.py --namn v1` (utan `--kor`) kontrollerar dessutom att mappen
  innehåller exakt filistans bilder och inget annat: OK.
- **Facit mot ritverktyget** (`synt/kontroll.cjs`): 6 · 14 · 12 · 6 avvikelser av ~12 300 kort per
  750 bord, största 0,125 (leken, den kända skillnaden i hur lekens sidor skymmer; övriga ≤ 0,054).

## Provet

Samma mått och skript som nollprovet: `prov.py` kör ONNX-filen på de sju ritade golden-fallens
`bild.jpg` (och högbänken) och sparar i kor.py:s format; `rapport.py` väljer tröskeln på fall 03 och
bedömer de sex andra orört. Klassen `baksida` räknas som vilken låda som helst: ligger den på leken
blir den `ovrig` genom facits `rita.ovriga` (som i nollprovet), annars eget/kluster/falsk som en
kortlåda. `prov246.py` räknar MES-246:s 57 ritade lägen med samma mått och tröskeln från fall 03.

## Resultatet (2026-09-30)

Kerneln `mesa-mes288-detektor-tran` version 1 körde 13:05–15:56 på Kaggle (T4 × 2). Tiny hann 87 epoker
(2,7 h), nano 49 (1,8 h). Exporten till ONNX föll på Kaggle (`onnxscript` saknades); vikterna sparades och
exporterades lokalt med `tran/exportera.py`. Kerneln installerar nu `onnxscript`.

**De sju ritade golden-fallen** (`prov.py` + `rapport.py`, tröskeln vald på fall 03, NMS 0,6):

| Modell | Tröskel | Egna kort | Sammanslagna | Missade | Falska | Sex orörda fall | Högkort egna | Hela högar | ms/bild (Macens processor) |
|---|---|---|---|---|---|---|---|---|---|
| dagens detektor | – | 29/66 | 13 | 24 | 2 | 26/55 | 9/29 | 4/15 | 28 |
| OWLv2 (läraren) | 0,16 | 62/66 | 4 | 0 | 0 | 51/55 | 25/29 | 11/15 | 11 484 |
| **YOLOX-tiny, tränad** | 0,78 | **58/66** | 6 | 2 | 1 | 49/55 | 23/29 | 9/15 | 93 |
| **YOLOX-nano, tränad** | 0,76 | **60/66** | 4 | 2 | 0 | 49/55 | 23/29 | 9/15 | 40 |

Fall 03 är det fall tröskeln väljs på, så "sex orörda fall" är den ärliga siffran: 49/55 för båda.
Nollprovets otränade YOLOX-nano gav 55/66 med 7 falska.

**MES-246:s ritade lägen** (`prov246.py`, 54 lägen med synliga kort, tröskeln från fall 03):

| Modell | Egna kort | Sammanslagna | Missade | Falska | Högkort egna | Hela högar |
|---|---|---|---|---|---|---|
| YOLOX-tiny | 551/605 (91 %) | 21 | 33 | 0 | 181/218 (83 %) | 62/92 |
| YOLOX-nano | 539/605 (89 %) | 40 | 26 | 0 | 173/218 (79 %) | 58/92 |

Dagens detektor och OWLv2 är inte mätta på MES-246 med det här måttet, så där finns ingen jämförelse.

**Högbänken** (antal lådor mot väntat antal kort i lådan): ensamma kort 39/39 för båda; högar 5/13 (tiny)
och 6/13 (nano); par 3/13; hand 0/3 och 1/3. Högarna är det svaga.

**Valideringen i träningen** (inte provet): AP50 `kort` 0,93 för båda, `baksida` 1,00 (tiny) och 0,99 (nano).

**Förbehåll.** Tiny hann fler epoker men är inte bättre än nano på golden; skillnaderna (58 mot 60 av 66)
är ett par kort och ligger inom bruset för sju bilder. Golden-fallen och MES-246 är filmade på samma
bord och mattor som delar av träningsmaterialet (andra tillfällen, spärren håller isär dem) — ett bord
modellen aldrig sett är inte provat. Telefonen är inte mätt; tiderna är Macens processor.

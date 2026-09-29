# Grind 2: ett litet träningsförsök och provet mot det ritade facit (MES-288)

**Läget 2026-09-30 natt:** steg 1–3 är gjorda lokalt (underlagen, ~3 000 syntetiska bord med
händer, datasetet med filistan genom `krav_traning_alla`). **Inget är uppladdat till Kaggle och
ingen kernel är pushad** — Jesper vill se de syntetiska borden först (kontaktarket
`dev/detektor/synt/grind2.html`). Träningen (steg 4), provet (steg 5) och svaret nedan fylls i
när det är gjort.

## Vad som tränas (plan, inte körd)

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
| riktiga, träning | 567 | 3 977 | 593 | 6 180 |
| riktiga, validering | 71 | 699 | 108 | 944 |
| syntetiska, träning | 2 700 | 32 764 | 3 026 | 6 150 |
| syntetiska, validering | 300 | 4 034 | 296 | 1 117 |

- **Riktiga:** de 638 rutorna ur Jespers tre träningsfilmer med lärarens facit (regel A–G), nedskalade
  direkt till **960 × 540** — modellen ser aldrig mer än 960 px, och 1920 px hade fyrdubblat datasetet
  utan att tillföra något till 960-träningen (mosaiken skalar 0,5–1,5, så förstoring blir lite mjukare;
  korten i filmerna är redan större än i golden). Baksidesflaggan → `baksida`, övriga → `kort`.
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

# Nollprovet: färdiga detektorer mot det ritade facit (MES-288 steg 0)

**Frågan:** hittar en färdig modell, utan att ha tränats på kort, fler av
korten på bordet än dagens handskrivna detektor — utan fler falska — och
klarar den högarna? Provat 2026-09-25 på Jespers Mac (Intel i5-8259U, fyra
kärnor, ingen användbar GPU), bara processorn.

Skripten ligger i den här mappen; alla siffror i tabellerna kommer ur
`resultat/*.json` via `rapport.py` och går att räkna om.

## Svaret: (a) — en färdig modell hittar redan fler kort än dagens detektor, utan fler falska

| | Egna kort (7 fall, 66 synliga) | Missade | Falska | Högar hela (av 15) | Tid per bild, Mac-processorn |
|---|---|---|---|---|---|
| **Dagens detektor** | 29 | 24 | 2 | 4 | 28 ms (analysbilden 360 px, i webbläsaren) |
| **OWLv2 base** (text: "card" m.fl.) | **62** | **0** | **0** | **11** | 11,5 s |
| Grounding DINO tiny | 57 | 2 | 3 (0 med storleksfilter) | 8 | 10,9 s |
| YOLO-World s | 40 | 19 | 0 | 3 | 0,20 s |
| MobileSAM (automatiska masker + kortregler) | 42 | 19 | 1 | 3 | 55 s (16×16 punkter, två trådar) |

Tröskeln valdes på fall 03; på de **sex andra** fallen, orört, hittar OWLv2
51 av 55 kort (dagens 26), Grounding DINO 46, YOLO-World 30.

**Vad det betyder.** Att *hitta* korten är löst av en färdig modell —
också omlott, i landhögar, på det ribbade utebordet (fall 05: 6/6 mot
dagens 0/6) och på den svarta mattan med små kort (fall 13: 10/10 mot 3/10).
OWLv2 missar inget kort i de sju fallen; de fyra som inte blir egna är kort
under andra kort där modellen ritar en låda över hela högen (sammanslagna).
Den ritar också extra lådor över delar av kort (13 kluster, 10 dubbletter);
med storleksfiltret (appen vet kortstorleken) blir det 4 kluster och
0 falska.

**Men den är för långsam för telefonen som den är.** 11,5 s per bild på
Macens processor. På telefonen med WebGPU blir det troligen 2–5 s per
ruta (se *Tid på telefonen*), mot löftets 0,3 s. Den lilla modellen som är
snabb nog (YOLO-World s, 0,2 s på processorn, ~0,15–0,3 s på telefonen)
hittar 40 kort utan falska med 640 px indata — bättre än i dag på träborden
(fall 03: 10/11, 04: 7/8, 05: 4/6) men sämre på den ljusgrå skivan (06:
3/11) och den svarta mattan (13: 2/10), där dagens detektor är bra.

**Bifyndet som avgör vad som byggs:** ges samma lilla modell bilden i
1280 px i stället för 640 hittar den **58 av 66** (06: 11/11, 13: 9/10) med
0 falska när storleksfiltret och inneslutningsregeln är på — nästan OWLv2:s
nivå, för ~0,6 s på Macens processor med två trådar. Det var upplösningen
som fattades, inte modellstorleken. Dagens detektor ser en analysbild som
är 360 px bred; en tränad detektor i den här klassen ska se ~1000 px.

**Förslag på vad som byggs** (steg 1–2 i issuen, med en ändring i steg 1):

1. **OWLv2 som lärare, inte som detektor.** Låt OWLv2 sätta lådor på
   riktiga rutor ur inspelningarna (dev/material, golden-videorna, MES-246,
   passet 2026-09-22) på Macen: 11 s per ruta, tusen rutor på tre timmar,
   ingen GPU. Det ger tusentals riktiga träningsbilder med facit, och
   syntetiska bord (`dev/embed/synt.cjs`) behövs bara för det OWLv2 inte
   ser: kort under kort i högar, med hörn och ordning.
2. **Träna en liten detektor** i YOLO-nano/s-klassen (5–12 M parametrar)
   med **~1000 px indata**, exportera till ONNX för onnxruntime-web/WebGPU
   som bildmodellen. YOLO-World s visar att den storleken redan når 58/66
   utan träning när den ser 1280 px; träningen ska ge en poäng som skiljer
   kort från bord (så att tröskeln inte behöver ligga på golvet) och lära
   den kortet under i högen. Välj en Apache-licensierad arkitektur
   (RT-DETR, D-FINE, YOLOX eller liknande) — Ultralytics YOLO-World är
   AGPL-3.0, se *Licenserna*. Räknemängden vid 1000 px är 2,5 × den vid
   640: en nano-modell hamnar kring 25 GFLOPs, uppskattningsvis 0,1–0,2 s
   på telefonen.
3. **Mät mot det ritade facit**, aldrig mot det som tränats på.

**Vad steg 2 kostar.** En hyrd GPU (T4/L4/A10, 0,5–2 dollar i timmen) i
5–20 timmar för träning och några omtag: **10–40 dollar**. Etiketteringen
med OWLv2 kostar ingenting utöver Macens tid. Det beslutet är Jespers.

**Oprovat:** ingenting här har körts på en telefon. Tiderna på telefonen
är uppskattningar ur modellstorlek och MES-238:s mätning av bildmodellen.

## Vad som mättes

**Testdata:** de sju golden-fallen med ritat facit (MES-286): 03, 04, 05,
06, 13, 14 och 15 — 66 synliga kort och 3 dolda, 15 högar, tokens och
library i fall 13. Bilden är `bild.jpg` i varje fall (1080 px bred, samma
bild dagens detektor ser). Facit är testdata; inget har tränats.

**Tröskelfall:** poänggränsen per modell valdes på fall 03 (elva kort på
lackat trä i lampljus, en landhög) som den gräns som ger flest egna kort
minus falska. De sex andra fallen bedömdes sedan med den gränsen, orört
("sex andra" i tabellerna). Allt annat är fast: NMS med IoU 0,6,
klassoberoende; golvtröskel 0,02 vid körningen.

**Dagens detektor** kommer ur `dev/golden/senaste.json` (spårens lådor,
afa24cb; detektorn har inte ändrats sedan dess) och bedöms med exakt samma
mått (`dagens.py`). Golden själv räknar "hittade" som antal spår och
"plats" med IoU ≥ 0,3, så dess tal (33 spår på de sju fallen, 2 falska) är
inte samma sak som talen här.

## Måttet

Per synligt kort i facit (dolda kort räknas för sig, som i golden):

| Dom | Betyder |
|---|---|
| **eget** | en detektion matchar just det kortet: IoU ≥ 0,5 mot lådan runt kortets synliga del (facits `x y w h`). Girig matchning efter fallande IoU, en-till-en, så en detektion ger högst ett kort |
| **sammanslaget** | ingen egen detektion, men minst 70 % av kortets synliga låda ligger inne i en enda detektion — en låda över två eller fler kort, typiskt en hög |
| **missat** | ingetdera |

eget + sammanslaget + missat = synliga kort. Per detektion:

| Dom | Betyder |
|---|---|
| **matchad** | gav ett eget kort |
| **dubblett** | IoU ≥ 0,5 mot ett kort som redan har en egen detektion |
| **kluster** | ligger till ≥ 50 % på kort men matchar inget: en låda över en hög, eller en del av ett kort (konstverket, textrutan) |
| **övrig** | ligger på tokens, library eller annat i `rita.ovriga` — räknas inte |
| **falsk** | ligger till mindre än 50 % på något kort eller föremål. Det är det som skulle bli ett falskt spår |

**Högar:** samma domar för korten som har `hog` i facit, och "hög hel" när
alla högens synliga kort är egna.

**Högbänken** (68 fall ur grenen `mes-250-hoglasning`, facit i
`hogbank-facit.json`; bilderna ur `dev/material/hogbank` och golden): för
varje fall räknas detektionerna vars mittpunkt ligger i lådan appen skar och
som till minst hälften ligger i den. Rätt = lika många som facit väntar.
Det är **inte** högbänkens eget mått (högläsningen: antal, tappade och namn
ur en beskärning), så MES-250:s tal — högar 0/13, par 2/13, ensamma 13/39 —
går inte att läsa rakt mot kolumnen.

**Tid per bild:** väggklocka för hela modellsteget (förbehandling, modell,
efterbehandling) på processorn, median över bilderna, med `nice -n 19`.
Första bilden körs två gånger och den första tiden kastas.

## Modellerna

| Modell | Vikter | Licens | Storlek |
|---|---|---|---|
| OWLv2 base | `google/owlv2-base-patch16-ensemble` (Hugging Face, Google) | Apache-2.0 | 155 M parametrar, 960×960 in |
| Grounding DINO tiny | `IDEA-Research/grounding-dino-tiny` (Hugging Face, IDEA) | Apache-2.0 | 172 M parametrar, 800 px kortsida in |
| YOLO-World v2 s | `yolov8s-worldv2.pt` (Ultralytics) + CLIP ViT-B/32 som textkodare | **AGPL-3.0** (Ultralytics); CLIP MIT | 12,7 M parametrar, ~51 GFLOPs vid 640 (Ultralytics tabell) |
| MobileSAM | `github.com/ChaoningZhang/MobileSAM`, `weights/mobile_sam.pt` | Apache-2.0 | 10,1 M parametrar (bildkodaren 6,1 M), 1024 px in |

Textfrågorna till de tre open-vocabulary-modellerna: *playing card*,
*trading card*, *card* och *magic the gathering card*, alla i samma
anrop (OWLv2 får "a photo of a …"). Raden "alla" i tabellerna är alla
frågor ihop; raderna per fråga är de lådor där just den frågan fick högst
poäng — inte en egen körning med bara den frågan.

MobileSAM ger masker av allt i bilden. Kortlika masker valdes med tre fasta
regler: masken fyller sin minsta roterade rektangel till ≥ 85 %,
rektangelns sidförhållande ligger mellan 0,55 och 0,9 (kortet är 0,716), och
ytan ligger inom 0,4–1,6 × fallets medelkort. Kortstorleken känner appen
från uppstarten, så den regeln är tillåten.

Allt installerades från PyPI, Hugging Face (upphovsmännens repon) och
Ultralytics respektive MobileSAM:s officiella GitHub-repo, i en egen venv i
sessionens scratchpad. torch 2.2.2 är det sista bygget för macOS på Intel.
Inga vikter i git (`.gitignore`).

## Resultaten

Tröskel vald på fall 03; "sex andra" = de sex fallen som inte påverkat
tröskeln. NMS 0,6. Kolumnerna: egna kort av synliga kort, sammanslagna,
missade, falska, dubbletter, kluster; högkort som blev egna av alla högkort;
hela högar av 15. Högbänken: fall med rätt antal detektioner i lådan, per
typ. Tiden är medianen per bild på Macens processor.

### Alla fyra frågorna ihop, inga extra regler

| Modell | Tröskel | Alla 7: eget | sammansl | missat | falska | dubbl | kluster | Sex andra: eget | sammansl | missat | falska | Högkort eget | Högar hela | Högbänken (68) | ms/bild |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| dagens detektor (senaste.json) | – | 29/66 | 13 | 24 | 2 | 0 | 2 | 26/55 | 5 | 24 | 0 | 9/29 | 4/15 | – (annat mått i MES-250) | 28 |
| OWLv2 base | 0,16 | **62/66** | 4 | 0 | 0 | 10 | 13 | **51/55** | 4 | 0 | 0 | 25/29 | 11/15 | ensam 27/39 · hog 5/13 · par 0/13 · hand 1/3 | 11 484 |
| Grounding DINO tiny | 0,08 | 57/66 | 7 | 2 | 3 | 1 | 10 | 46/55 | 7 | 2 | 3 | 20/29 | 8/15 | ensam 31/39 · hog 5/13 · par 4/13 · hand 1/3 | 10 954 |
| YOLO-World s, 640 | 0,02 | 40/66 | 7 | 19 | 0 | 0 | 0 | 30/55 | 6 | 19 | 0 | 13/29 | 3/15 | ensam 26/39 · hog 2/13 · par 5/13 · hand 0/3 | 197 |
| YOLO-World s, 1280, golv 0,001 (två trådar) | 0,001 | 60/66 | 6 | 0 | 7 | 5 | 120 | 49/55 | 6 | 0 | 7 | 23/29 | 9/15 | ensam 12/39 · hog 5/13 · par 0/13 | 594 |
| MobileSAM, masker + kortregler (bara de sju fallen, 16×16 punkter, två trådar) | 0,97 (predicted IoU) | 42/66 | 5 | 19 | 1 | 2 | 6 | 33/55 | 5 | 17 | 1 | 9/29 | 3/15 | ensam 15/16 · hog 1/5 · par 4/7 (bara fallbilderna) | 54 662 |

Grounding DINO:s tre falska är lådor runt hela mattan eller hela gruppen av
kort (fall 13: två, fall 05: en). YOLO-World:s tröskel hamnade på golvet
0,02 — alla dess poäng på riktiga kort ligger mellan 0,02 och 0,27, så
modellen är osäker på vad ett kort är, men den ritar ändå inga lådor på
annat.

### Med storleksfiltret (0,4–1,6 × fallets medelkort) och inneslutningsregeln

Storleksfiltret är tillåtet: appen vet kortstorleken från uppstarten.
Inneslutningsregeln slänger en låda som till 80 % ligger inuti en starkare
låda (delar av kort). Båda är fasta regler, inte inställda på fallen.

| Modell | Regler | Alla 7: eget | sammansl | missat | falska | dubbl | kluster | Sex andra: eget | falska | Högkort eget | Högar hela | Högbänken (68) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| OWLv2 base | storlek | 60/66 | 4 | 2 | 0 | 10 | 4 | 49/55 | 0 | 23/29 | 9/15 | ensam 29/39 · hog 5/13 · par 2/13 |
| OWLv2 base | storlek + inneslutning | 60/66 | 4 | 2 | 0 | 7 | 2 | 49/55 | 0 | 23/29 | 9/15 | ensam 36/39 · hog 4/13 · par 3/13 |
| OWLv2 base | bara inneslutning | 61/66 | 5 | 0 | 0 | 7 | 8 | 50/55 | 0 | 24/29 | 10/15 | ensam 36/39 · hog 4/13 · par 1/13 |
| Grounding DINO tiny | storlek | 55/66 | 6 | 5 | **0** | 1 | 4 | 44/55 | 0 | 18/29 | 7/15 | ensam 31/39 · hog 5/13 · par 5/13 |
| Grounding DINO tiny | storlek + inneslutning | 55/66 | 6 | 5 | 0 | 0 | 1 | 44/55 | 0 | 18/29 | 7/15 | ensam 39/39 · hog 2/13 · par 6/13 |
| Grounding DINO tiny | bara inneslutning | 48/66 | 14 | 4 | 1 | 0 | 1 | 38/55 | 1 | 12/29 | 2/15 | ensam 39/39 · hog 1/13 · par 10/13 |
| YOLO-World s, 640 | storlek (+ inneslutning) | 40/66 | 7 | 19 | 0 | 0 | 0 | 30/55 | 0 | 13/29 | 3/15 | ensam 26–27/39 · hog 2/13 · par 5/13 |

Inneslutningsregeln utan storleksfilter drar ner Grounding DINO: dess låda
över hela gruppen får högst poäng och sväljer korten under sig. Med
storleksfiltret först försvinner grupplådan och regeln gör bara nytta.
Storleksfiltret kostar OWLv2 två kort: två lådor som var rätt men mer än
1,6 × medelkortet (tappade kort ligger snett och får en större
axelparallell låda).

### Per fall

Dagens detektor:

| Fall | Kort | Eget | Sammanslaget | Missat | Falska | Högkort eget | Högar hela | Inte egna (* = sammanslaget) |
|---|---|---|---|---|---|---|---|---|
| 03 (tröskelfall) | 11 | 3 | 8 | 0 | 2 | 0/2 | 0/1 | Thriving Heath*, Plains*, Plains*, Faithful Pikemaster*, Pharika's Chosen*, Aphelia*, Danitha*, Militant Inquisitor* |
| 04 | 8 | 1 | 0 | 7 | 0 | 0/3 | 0/1 | Ukud Cobra, Ancestral Blade, Valkyrie's Sword, Fencing Ace, Plains, Plains, Swamp |
| 05 | 6 | 0 | 0 | 6 | 0 | 0/4 | 0/2 | alla sex |
| 06 | 11 | 10 | 1 | 0 | 0 | 1/2 | 0/1 | Swamp* |
| 13 | 10 | 3 | 1 | 6 | 0 | 3/6 | 2/4 | Pharika's Chosen, Ukud Cobra, Swamp, Swamp, Plains*, Thriving Moor, Fencing Ace |
| 14 | 10 | 6 | 1 | 3 | 0 | 2/6 | 1/3 | Plains, Plains, Plains, Resistance Reunited* |
| 15 | 10 | 6 | 2 | 2 | 0 | 3/6 | 1/3 | Pharika's Chosen, Plains, Plains*, Resistance Reunited* |

OWLv2 base, alla frågor, tröskel 0,16, inga extra regler:

| Fall | Kort | Eget | Sammanslaget | Missat | Falska | Dubbl | Kluster | Övriga | Högkort eget | Högar hela | Inte egna |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 03 (tröskelfall) | 11 | 11 | 0 | 0 | 0 | 3 | 2 | 0 | 2/2 | 1/1 | |
| 04 | 8 | 7 | 1 | 0 | 0 | 1 | 2 | 0 | 2/3 | 0/1 | Plains* |
| 05 | 6 | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 4/4 | 2/2 | |
| 06 | 11 | 11 | 0 | 0 | 0 | 3 | 1 | 0 | 2/2 | 1/1 | |
| 13 | 10 | 10 | 0 | 0 | 0 | 0 | 0 | 3 (två tokens, library) | 6/6 | 4/4 | |
| 14 | 10 | 9 | 1 | 0 | 0 | 2 | 3 | 0 | 5/6 | 2/3 | Plains* |
| 15 | 10 | 8 | 2 | 0 | 0 | 1 | 5 | 0 | 4/6 | 1/3 | Plains*, Resistance Reunited* |

Grounding DINO tiny, alla frågor, tröskel 0,08, inga extra regler:

| Fall | Kort | Eget | Sammanslaget | Missat | Falska | Dubbl | Kluster | Övriga | Högkort eget | Högar hela | Inte egna |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 03 (tröskelfall) | 11 | 11 | 0 | 0 | 0 | 0 | 2 | 0 | 2/2 | 1/1 | |
| 04 | 8 | 7 | 1 | 0 | 0 | 0 | 1 | 0 | 2/3 | 0/1 | Plains* |
| 05 | 6 | 5 | 1 | 0 | 1 | 1 | 4 | 0 | 3/4 | 1/2 | Scourge of the Undercity* |
| 06 | 11 | 11 | 0 | 0 | 0 | 0 | 2 | 0 | 2/2 | 1/1 | |
| 13 | 10 | 9 | 1 | 0 | 2 | 0 | 1 | 3 | 5/6 | 3/4 | Plains* |
| 14 | 10 | 7 | 2 | 1 | 0 | 0 | 0 | 0 | 3/6 | 1/3 | Plains, Plains*, Resistance Reunited* |
| 15 | 10 | 7 | 2 | 1 | 0 | 0 | 0 | 0 | 3/6 | 1/3 | Plains, Plains*, Resistance Reunited* |

YOLO-World s (640), alla frågor, tröskel 0,02:

| Fall | Kort | Eget | Sammanslaget | Missat | Falska | Högkort eget | Högar hela | Inte egna |
|---|---|---|---|---|---|---|---|---|
| 03 (tröskelfall) | 11 | 10 | 1 | 0 | 0 | 1/2 | 0/1 | Plains* |
| 04 | 8 | 7 | 1 | 0 | 0 | 2/3 | 0/1 | Plains* |
| 05 | 6 | 4 | 2 | 0 | 0 | 2/4 | 0/2 | Swamp*, Scourge of the Undercity* |
| 06 | 11 | 3 | 0 | 8 | 0 | 0/2 | 0/1 | Swamp, Plains, Venomous Hierophant, Hooded Blightfang, Scourge, Trusty Retriever, Pacifism, Serpent Assassin |
| 13 | 10 | 2 | 0 | 8 | 0 | 2/6 | 1/4 | Pharika's Chosen, Ukud Cobra, Plains, Plains, Thriving Moor, Fencing Ace, Ancestral Blade, Mirran Bardiche |
| 14 | 10 | 7 | 1 | 2 | 0 | 3/6 | 1/3 | Plains, Plains*, Resistance Reunited |
| 15 | 10 | 7 | 2 | 1 | 0 | 3/6 | 1/3 | Plains, Plains*, Resistance Reunited* |

MobileSAM, automatiska masker (16×16 punkter) med kortreglerna, tröskel 0,97 på maskens egen IoU-gissning:

| Fall | Kort | Eget | Sammanslaget | Missat | Falska | Högkort eget | Högar hela | Inte egna |
|---|---|---|---|---|---|---|---|---|
| 03 (tröskelfall) | 11 | 9 | 0 | 2 | 0 | 0/2 | 0/1 | Plains, Plains |
| 04 | 8 | 7 | 1 | 0 | 0 | 2/3 | 0/1 | Plains* |
| 05 | 6 | 3 | 2 | 1 | 0 | 2/4 | 0/2 | Swamp*, Vraska's Finisher, Scourge of the Undercity* |
| 06 | 11 | 7 | 0 | 4 | 0 | 0/2 | 0/1 | Swamp, Plains, Hooded Blightfang, Scourge of the Undercity |
| 13 | 10 | 4 | 0 | 6 | 1 | 1/6 | 1/4 | Swamp, Swamp, Plains, Plains, Thriving Moor, Ancestral Blade |
| 14 | 10 | 6 | 1 | 3 | 0 | 2/6 | 1/3 | Plains, Plains, Plains, Resistance Reunited* |
| 15 | 10 | 6 | 1 | 3 | 0 | 2/6 | 1/3 | Plains, Plains, Plains, Resistance Reunited* |

MobileSAM vet inte vad ett kort är; den segmenterar allt, och kortreglerna
(rektangulär, kortets sidförhållande, kortets storlek) väljer ut. Det ger
42 av 66 med en falsk — som dagens detektor plus tretton, men sämst av
modellerna på högarna (9 av 29 högkort): en mask över två kort omlott är
inte rektangulär och faller på fyllnadsregeln. Utan storleksregeln och
utan tröskel blir det 53 egna, 8 falska och 96 klusterlådor (masker över
konstverket, textrutan och andra delar av kort). 55 s per bild på
processorn med 256 avkodningar; det är "allt"-läget som kostar, inte
bildkodaren.

### Kortet som inte blir eget: kortet under i högen

Det som återstår för alla modellerna är samma sak: **kortet under i en hög
där bara en kant sticker fram** (Plains under Plains i fall 04, 14 och 15;
Resistance Reunited under Trusty Retriever). Modellen ritar en låda över
hela högen (sammanslaget), eller hittar bara det översta. Ingen färdig
modell ger högens ordning eller kortens hörn; det är det steg 2 i issuen
ska träna fram (hörn eller mask per kort), och det syntetiska bordet är
det enda som ger facit för det.

## Varianterna

### YOLO-World s: lägre golv och större indata

Tröskeln för YOLO-World hamnade på golvet (0,02), så golvet sänktes till
0,001 och indatastorleken höjdes från 640 till 1280 px (kortet i fall 13 är
~80 px brett i 1080-bilden, alltså ~47 px vid 640 och ~95 px vid 1280).
Körda med två trådar (golden gick samtidigt), så tiden är inte jämförbar
med 197 ms-raden.

| Variant | Regler | Tröskel | Alla 7: eget | sammansl | missat | falska | dubbl | kluster | Sex andra: eget | falska | Högkort eget | Högar hela | Högbänken | ms/bild |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 640, golv 0,001 | inga | 0,01 | 43/66 | 6 | 17 | 0 | 1 | 2 | 32/55 | 0 | 15/29 | 4/15 | ensam 28/39 · hog 3/13 · par 5/13 | 276 (2 trådar) |
| **1280**, golv 0,001 | inga | 0,001 | 60/66 | 6 | 0 | 7 | 5 | 120 | 49/55 | 7 | 23/29 | 9/15 | ensam 12/39 · hog 5/13 · par 0/13 | 594 (2 trådar) |
| 1280 | storlek | 0,001 | 59/66 | 6 | 1 | 0 | 7 | 14 | 48/55 | 0 | 22/29 | 8/15 | ensam 20/39 · hog 5/13 · par 3/13 | |
| **1280** | **storlek + inneslutning** | 0,001 | **58/66** | 7 | 1 | **0** | **0** | 2 | **47/55** | **0** | 21/29 | 7/15 | ensam 37/39 · hog 2/13 · par 6/13 | |

Per fall, 1280 med storlek + inneslutning:

| Fall | Kort | Eget | Sammanslaget | Missat | Falska | Högkort eget | Högar hela | Inte egna |
|---|---|---|---|---|---|---|---|---|
| 03 (tröskelfall) | 11 | 11 | 0 | 0 | 0 | 2/2 | 1/1 | |
| 04 | 8 | 7 | 1 | 0 | 0 | 2/3 | 0/1 | Plains* |
| 05 | 6 | 4 | 2 | 0 | 0 | 2/4 | 0/2 | Swamp*, Scourge of the Undercity* |
| 06 | 11 | 11 | 0 | 0 | 0 | 2/2 | 1/1 | |
| 13 | 10 | 9 | 0 | 1 | 0 | 5/6 | 3/4 | Plains |
| 14 | 10 | 8 | 2 | 0 | 0 | 4/6 | 1/3 | Plains*, Resistance Reunited* |
| 15 | 10 | 8 | 2 | 0 | 0 | 4/6 | 1/3 | Plains*, Resistance Reunited* |

Det här är provets viktigaste bifynd: **den lilla modellen hittar nästan
lika många kort som OWLv2 när den får se bilden i 1280 px** — fall 06 går
från 3 till 11 och fall 13 från 2 till 9 — och med de två fasta reglerna
utan en enda falsk. Det var alltså upplösningen, inte modellstorleken, som
saknades. Dagens detektor arbetar på en analysbild som är 360 px bred.
Baksidan: vid 1280 ligger de sju falska (utan storleksfilter) alla i
fall 05, på springorna mellan ribborna, och tröskeln 0,001 är golvet — en
tränad modell behöver en poäng som faktiskt skiljer kort från bord.

### Originalfotona i högre upplösning (13, 14, 15), 2×2 rutor

Originalen (5712×4284 för 14 och 15, rutan 3840×2160 för 13) skalades till
2160 px bredd och kördes i fyra överlappande rutor (15 % överlapp) som slogs
ihop med samma NMS. Redovisas för sig eftersom bara tre fall har original.

| Modell | Regler | Tre fall: eget (av 30) | sammansl | missat | falska | dubbl | kluster | Samma tre fall på golden-bilden |
|---|---|---|---|---|---|---|---|---|
| YOLO-World s 1280, tröskel 0,001 | inga | 25/30 | 5 | 0 | 11 | 9 | 61 | 26/30, 0 falska |
| YOLO-World s 1280, tröskel 0,001 | storlek + inneslutning | 22/30 | 6 | 2 | 1 | 7 | 1 | 25/30, 0 falska |
| OWLv2 base, tröskel 0,16 | inga | 27/30 | 1 | 2 | 0 | 6 | 27 | 27/30, 0 falska, 3 sammanslagna |
| OWLv2 base, tröskel 0,16 | storlek + inneslutning | 26/30 | 1 | 3 | 0 | 5 | 4 | 25/30 |

Mer upplösning hjälper inte: rutorna skär kort i kanten och ger dubbletter,
kluster och (för YOLO-World) falska i skarvarna, och korten var redan stora
nog i 1080-bilden. OWLv2 tar dessutom 68 s per foto (fyra rutor, två
trådar). Dagens detektor ser däremot bara 360 px, så för den är hoppet till
1080 det som spelar roll.

### OWLv2 med ett kort som fråga i stället för text

OWLv2 kan ta en bild som fråga ("hitta det som liknar den här"). Frågan var
en beskärning av Fencing Ace ur golden-fall 16, som inte är med i provet.

**Nej.** Modellen ger tusentals lådor per bild med poäng nära 1 (poängen
är relativ den bästa lådan), och de som rankas högst är lådor över hela
grupper av kort — inte enskilda kort. Vid bästa tröskel (0,999, vald på
fall 03) blir det 2 egna kort av 66, 40 sammanslagna och 40 falska; med
storleksfiltret 2 egna och 64 missade. Bildfrågan hittar alltså "något som
liknar ett kort" i grova drag men skiljer inte kort från kort. 34 s per bild
med två trådar. Textfrågan är vägen för OWLv2.

## Tid på telefonen

Inget här har körts på en telefon. Uppskattningen bygger på modellstorlek
och på MES-238: bildmodellen (MobileCLIP-S0, ~1,5 GFLOPs) tog ~98 ms per
anrop på telefonen med WebGPU, och telefonen var lika snabb som Macen på
den vägen.

| Modell | Räknemängd per bild | Mac-processorn, mätt | Telefon med WebGPU, uppskattat | Duger till 0,3 s-löftet? |
|---|---|---|---|---|
| YOLO-World s, 640 | ~45–51 GFLOPs, 12,7 M parametrar | 0,20 s | 0,15–0,3 s | på gränsen — men hittar bara 40/66 vid 640 |
| YOLO-World s, 1280 | ~4 × 640-raden: ~200 GFLOPs | 0,59 s (2 trådar; ~0,35 s med 4) | 0,5–1 s | nej per ruta; en tränad nano-variant vid ~1000 px (~25 GFLOPs) 0,1–0,2 s |
| OWLv2 base, 960² | ViT-B/16 på 3 600 bildbitar: ~300–400 GFLOPs, 155 M parametrar | 11,5 s | 2–5 s | nej — bara som ett sällsynt "andra ögonkast" när bordet står stilla |
| Grounding DINO tiny | Swin-T + BERT-textkodare + tvärkodare, 172 M parametrar | 10,9 s | 2–5 s | nej |
| MobileSAM, automatiska masker | bildkodaren ~40 GFLOPs en gång, sedan en avkodning per rutnätspunkt (256 vid 16×16) | 55 s (16×16 punkter, 2 trådar) | 1–3 s | nej som "allt"-läge; med en punkt per kort ~50 ms |

Varför: WebGPU på telefonen ligger i praktiken kring några hundra GFLOPS
för sådana här modeller, med ett fast påslag per anrop på tiotals
millisekunder. Det ger 0,1–0,3 s för 50 GFLOPs och sekunder för OWLv2, som
dessutom kör uppmärksamhet över 3 600 bildbitar (minnesbunden, inte bara
räknebunden — därav 58 × YOLO-World på Macen fast räknemängden bara är
~8 ×). Osäkerheten är minst en faktor 2 åt båda hållen tills MES-238:s
telefonprov görs om med en detektor.

## Licenserna

| Modell | Licens | Går att skeppa i Mesa? |
|---|---|---|
| OWLv2 (Google, Hugging Face) | Apache-2.0 | ja |
| Grounding DINO (IDEA-Research, Hugging Face) | Apache-2.0 | ja |
| MobileSAM (ChaoningZhang) | Apache-2.0 | ja |
| YOLO-World v2 s (Ultralytics) | **AGPL-3.0** — kräver att appens kod öppnas, eller Ultralytics företagslicens | inte utan beslut; också modeller tränade med Ultralytics kod räknar de som AGPL |
| CLIP ViT-B/32 (OpenAI, textkodaren YOLO-World använder) | MIT | ja |
| torch, transformers, timm, opencv | BSD/Apache | ja |

För steg 2 finns Apache-licensierade arkitekturer i samma storleksklass:
RT-DETR (Baidu/Hugging Face), D-FINE, YOLOX, RF-DETR. Scryfalls och
Wizards villkor för kortbilder i träning är fortfarande oprövade (står i
issuen).

## Så här körs det om

```
python3 -m venv <mapp>/venv && <mapp>/venv/bin/pip install "numpy<2" torch==2.2.2 torchvision==0.17.2 transformers timm scipy pillow opencv-python-headless ultralytics
VIKTER=<mapp>/vikter <venv>/bin/python dev/detektor/hamta.py          # hämtar och rökprovar alla fyra
sh dev/detektor/vanta-golden.sh                                         # aldrig samtidigt med golden
VIKTER=<mapp>/vikter nice -n 19 <venv>/bin/python dev/detektor/kor.py --modell owlv2   # gdino | yoloworld | mobilesam
<venv>/bin/python dev/detektor/dagens.py                                # dagens detektor ur senaste.json
<venv>/bin/python dev/detektor/rapport.py [--per-fall] [--storlek] [--inneslut]
<venv>/bin/python dev/detektor/visa.py --fil resultat/owlv2.json --fall 14 --troskel 0.16   # ritar lådorna
```

`resultat/*.json` bär alla råa detektioner (golvtröskel 0,02), så trösklar
och regler kan prövas utan att modellerna körs om.

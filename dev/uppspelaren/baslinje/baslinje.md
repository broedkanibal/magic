# Uppspelarens baslinje — 2026-10-07

Kod: `index.html` (sha256 f123226f39c8, commit 1fda2a6). Simulerad klocka: två körningar på samma fil ger samma tal. Spelet har en motståndare (bordsvyn), som ett riktigt parti. Grinden (`--jamfor`) är totalt-kolumnen och p0921; tider ±0,1 s, antal exakt. Definitionerna: [LÄS-MIG](../LÄS-MIG.md).

| Fall | Vad | Underlag |
|---|---|---|
| g07 | golden 07-tra-dagsljus-40cm-5kort-rorelse | underlag/golden-bordlogg.json.gz (5505933 (2026-10-03)) |
| g09 | golden 09-svartmatta-lampa-40cm-4kort-tap | underlag/golden-bordlogg.json.gz (5505933 (2026-10-03)) |
| g10 | golden 10-svartmatta-lampa-40cm-4kort-graveyard | underlag/golden-bordlogg.json.gz (5505933 (2026-10-03)) |
| g11 | golden 11-svartmatta-lampa-40cm-4kort-gravfallor | underlag/golden-bordlogg.json.gz (5505933 (2026-10-03)) |
| g12 | golden 12-svartmatta-dagsljus-provkort | underlag/golden-bordlogg.json.gz (5505933 (2026-10-03)) |
| p0922 | passet 2026-09-22 (1x, 34 cm, normaltempo) | dev/material/arbete/2026-10-04-hogarna-matning/baslinje/spegel-lokal.json (körd 2026-10-04, poolen 168, utan Claude) |
| p0921 | partiet 2026-09-21, sek 240–540 — FACIT SOM IDEAL TELEFON | underlag/2026-09-21-v2-tabell.tsv (v2-facit, var 10:e sekund) |
| p0921k | partiet 2026-09-21, sek 230–540 — telefonens kedja på skärminspelningens kamerabild | underlag/2026-09-21-kedja-bordlogg.json.gz (dev/spegelfacit/kor.cjs på dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/kamera-180-540.mp4, 2026-10-07, poolen 114, utan Claude) |

**p0921 är facit, inte telefonen:** v2-facit för partiet 2026-09-21 matat som en idealiserad telefon var tionde sekund. Där mäts mattans geometri (avstånd, omlott, kanten), inte kamerans fart eller träffsäkerhet.

**p0921k är kedjan på skärminspelningens kamerabild** (704 × 438, Mesas ramar i bilden, utan Claude), sek 230–540: händer, skymda och korta spår som i ett riktigt parti, men nästan inga namn — mattan visar mest platshållare. Inte telefonens egen ström i 4K.

| Mått | g07 | g09 | g10 | g11 | g12 | p0922 | p0921 | p0921k | totalt* |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Hopp utan rörelse (kortet byter plats på mattan i ett ögonblick) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Snabba hopp (mer än 1 kortbredd på en videoruta, 1/15 s) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Utbytta kort (försvann och skapades igen i stället för att flyttas) | 0 | 0 | 0 | 0 | 0 | 1 | – | 2 | 1 |
| Nya kort utan utspel i facit | 0 | 0 | 0 | 0 | 0 | 5 | – | 5 | 5 |
| Fel nedtoning eller fel borttagning (kortet ligger kvar enligt facit) | 0 | 0 | 0 | 0 | 0 | 3 | – | 1 | 3 |
| Borttagna kort som står kvar på mattan | 1 | 0 | 0 | 0 | 1 | 4 | – | 10 | 6 |
| Fel till handen (kortet ligger kvar enligt facit) | 0 | 0 | 0 | 0 | 0 | 0 | – | 0 | 0 |
| Tid till borta, median (miss = 10 s) | 8,32 | – | 2 | 7 | 10 | 10 | – | 10 | 7,05 |
| Tid till borta, längst (miss = 10 s) | 10 | – | 2,2 | 7,25 | 10 | 10 | – | 10 | 10 |
| Utspel som syntes på mattan | 7/7 | 4/4 | 4/4 | 5/5 | 1/2 | 10/14 | – | 12/13 | 31/36 |
| Utspel där kortet kom med namn | 7/7 | 4/4 | 4/4 | 5/5 | 1/2 | 8/14 | – | 0/13 | 29/36 |
| Tid till något syns, median (miss = 10 s) | -0,35 | -0,47 | -0,55 | -0,5 | 4,85 | 1,36 | – | -0,7 | 0,32 |
| Tid till något syns, längst (miss = 10 s) | 2,3 | -0,4 | 0,45 | -0,1 | 10 | 10 | – | 10 | 10 |
| Tid till rätt plats, median (miss = 10 s) | 0,7 | -0,23 | 0,12 | 0,37 | 5,25 | 7,9 | – | 10 | 0,95 |
| Tid till rätt plats, längst (miss = 10 s) | 3,27 | 1,57 | 1 | 0,9 | 10 | 10 | – | 10 | 10 |
| Flyttar där samma kort glider till nya platsen | – | 1/1 | – | – | 1/1 | 5/18 | – | 1/9 | 7/20 |
| Flytt: tid till nya platsen, median (miss = 10 s) | – | 0,3 | – | – | 0,77 | 10 | – | 10 | 10 |
| Mattans zoomändringar per minut | 5,31 | 0 | 0 | 0 | 0 | 1,03 | 0,39 | 0,76 | 0,87 |
| Mattans panoreringar per minut | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Zoom eller pan som hoppar (utan glidning) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Platshållare som syntes | 21 | 10 | 5 | 19 | 9 | 217 | 0 | 523 | 281 |
| Platshållare, sekunder på mattan | 14 | 6,75 | 2,25 | 18,15 | 11,25 | 699,1 | 0 | 2286,4 | 751,5 |
| Laddtexter som syntes (Reading…, Moving…, Reading the card…, Asking Claude…) | 28 | 14 | 9 | 22 | 9 | 244 | 0 | 540 | 326 |
| Kort som var utanför mattans kant (antal kort) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Kort utanför mattans kant, kortsekunder | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Avståndsfel mattan mot bordet, median (kortbredder) | – | – | – | – | – | – | 0,07 | 0,18 | – |
| Avståndsfel mattan mot bordet, 90:e percentilen (kortbredder) | – | – | – | – | – | – | 0,17 | 0,42 | – |
| Falska omlott (kortpar · rutor) | – | – | – | – | – | – | 0 | 0 | – |
| Kort utanför mattans kant (kort · rutor) | – | – | – | – | – | – | 0 | 0 | – |
| Kort i facit som saknas på mattan (kort · rutor) | – | – | – | – | – | – | 0 | 26 | – |

\* totalt = golden 07, 09–12 och passet 2026-09-22 (telefonens ström; inte p0921 och p0921k). Tider i sekunder från facits tid (rösten eller bildrutan), medianer över alla händelser ihop. – = går inte att räkna för fallet (inget facit för det).

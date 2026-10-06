# Uppspelarens baslinje — 2026-10-07

Kod: `index.html` (sha256 d539e3fe26cb, commit a59238e). Simulerad klocka: två körningar på samma fil ger samma tal. Definitionerna: [LÄS-MIG](../LÄS-MIG.md).

| Fall | Vad | Underlag |
|---|---|---|
| g07 | golden 07-tra-dagsljus-40cm-5kort-rorelse | underlag/golden-bordlogg.json.gz (5505933 (2026-10-03)) |
| g09 | golden 09-svartmatta-lampa-40cm-4kort-tap | underlag/golden-bordlogg.json.gz (5505933 (2026-10-03)) |
| g10 | golden 10-svartmatta-lampa-40cm-4kort-graveyard | underlag/golden-bordlogg.json.gz (5505933 (2026-10-03)) |
| g11 | golden 11-svartmatta-lampa-40cm-4kort-gravfallor | underlag/golden-bordlogg.json.gz (5505933 (2026-10-03)) |
| g12 | golden 12-svartmatta-dagsljus-provkort | underlag/golden-bordlogg.json.gz (5505933 (2026-10-03)) |
| p0922 | passet 2026-09-22 (1x, 34 cm, normaltempo) | dev/material/arbete/2026-10-04-hogarna-matning/baslinje/spegel-lokal.json (körd 2026-10-04, poolen 168, utan Claude) |
| p0921 | partiet 2026-09-21, sek 240–540 — FACIT SOM IDEAL TELEFON | underlag/2026-09-21-v2-tabell.tsv (v2-facit, var 10:e sekund) |

**p0921 är facit, inte telefonen:** v2-facit för partiet 2026-09-21 matat som en idealiserad telefon var tionde sekund. Där mäts mattans geometri (avstånd, omlott, kanten), inte kamerans fart eller träffsäkerhet.

| Mått | g07 | g09 | g10 | g11 | g12 | p0922 | p0921 | totalt* |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Hopp utan rörelse (kortet byter plats på mattan i ett ögonblick) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Snabba hopp (mer än 1 kortbredd på en videoruta, 1/15 s) | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| Utbytta kort (försvann och skapades igen i stället för att flyttas) | 0 | 0 | 0 | 0 | 0 | 1 | – | 1 |
| Nya kort utan utspel i facit | 1 | 0 | 0 | 0 | 0 | 5 | – | 6 |
| Fel nedtoning eller fel borttagning (kortet ligger kvar enligt facit) | 0 | 0 | 0 | 0 | 0 | 9 | – | 9 |
| Borttagna kort som står kvar på mattan | 1 | 0 | 0 | 1 | 1 | 4 | – | 7 |
| Tid till borta, median | 6,65 | – | 2 | 6,95 | – | 3,76 | – | 4,84 |
| Utspel som syntes på mattan | 7/7 | 4/4 | 4/4 | 5/5 | 1/2 | 14/14 | – | 35/36 |
| Utspel där kortet kom med namn | 7/7 | 4/4 | 4/4 | 5/5 | 1/2 | 8/14 | – | 29/36 |
| Tid till något syns, median | -0,35 | -0,47 | -0,55 | -0,5 | -0,3 | 0,34 | – | -0,3 |
| Tid till något syns, längst | 2,3 | -0,4 | 0,45 | -0,1 | -0,3 | 3,43 | – | 3,43 |
| Tid till rätt plats, median | 1,3 | -0,23 | 0,82 | 0,37 | 0,5 | 2,15 | – | 0,82 |
| Tid till rätt plats, längst | 5,83 | 1,57 | 4,47 | 0,9 | 0,5 | 6,51 | – | 6,51 |
| Flyttar där samma kort glider till nya platsen | – | 0/1 | – | – | 1/1 | 3/18 | – | 4/20 |
| Flytt: tid till nya platsen, median | – | – | – | – | 0,37 | 1,95 | – | 1,54 |
| Mattans zoomändringar per minut | 1,33 | 1,18 | 1,5 | 0,59 | 1,99 | 0,21 | 2,93 | 0,78 |
| Mattans panoreringar per minut | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Zoom eller pan som hoppar (utan glidning) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Platshållare som syntes | 21 | 10 | 5 | 19 | 9 | 220 | 0 | 284 |
| Platshållare, sekunder på mattan | 14 | 6,75 | 2,25 | 18,15 | 11,25 | 699,7 | 0 | 752,1 |
| Laddtexter som syntes (Reading…, Moving…, Reading the card…, Asking Claude…) | 29 | 14 | 9 | 22 | 9 | 247 | 0 | 330 |
| Kort som var utanför mattans kant (antal kort) | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 |
| Kort utanför mattans kant, kortsekunder | 0 | 0 | 0 | 0 | 0 | 0 | 8,13 | 0 |
| Avståndsfel mattan mot bordet, median (kortbredder) | – | – | – | – | – | – | 0,07 | – |
| Avståndsfel mattan mot bordet, 90:e percentilen (kortbredder) | – | – | – | – | – | – | 0,17 | – |
| Falska omlott (kortpar · rutor) | – | – | – | – | – | – | 0 | – |
| Kort utanför mattans kant (kort · rutor) | – | – | – | – | – | – | 3 | – |
| Kort i facit som saknas på mattan (kort · rutor) | – | – | – | – | – | – | 0 | – |

\* totalt = golden 07, 09–12 och passet 2026-09-22 (telefonens ström). Tider i sekunder från facits tid (rösten eller bildrutan), medianer över alla händelser ihop. – = går inte att räkna för fallet (inget facit för det).

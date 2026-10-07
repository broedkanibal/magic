# Uppspelarens baslinje — 2026-10-07

Kod: `index.html` (sha256 8b7d85a3f427, commit 82200c6). Simulerad klocka: två körningar på samma fil ger samma tal. Spelet har en motståndare (bordsvyn), som ett riktigt parti. Grinden (`--jamfor`) är totalt-kolumnen och p0921; tider ±0,1 s, antal exakt. Definitionerna: [LÄS-MIG](../LÄS-MIG.md).

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
| Snabba hopp (mer än 1 kortbredd på en videoruta, 1/15 s) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Utbytta kort (försvann och skapades igen i stället för att flyttas) | 0 | 0 | 0 | 0 | 0 | 1 | – | 1 |
| Nya kort utan utspel i facit | 0 | 0 | 0 | 0 | 0 | 5 | – | 5 |
| Fel nedtoning eller fel borttagning (kortet ligger kvar enligt facit) | 0 | 0 | 0 | 0 | 0 | 7 | – | 7 |
| Borttagna kort som står kvar på mattan | 1 | 0 | 0 | 1 | 1 | 4 | – | 7 |
| Fel till handen (kortet ligger kvar enligt facit) | 0 | 0 | 0 | 0 | 0 | 0 | – | 0 |
| Tid till borta, median (miss = 10 s) | 8,32 | – | 2 | 7,1 | 10 | 10 | – | 7,25 |
| Tid till borta, längst (miss = 10 s) | 10 | – | 2,2 | 10 | 10 | 10 | – | 10 |
| Utspel som syntes på mattan | 7/7 | 4/4 | 4/4 | 5/5 | 1/2 | 10/14 | – | 31/36 |
| Utspel där kortet kom med namn | 7/7 | 4/4 | 4/4 | 5/5 | 1/2 | 8/14 | – | 29/36 |
| Tid till något syns, median (miss = 10 s) | -0,35 | -0,47 | -0,55 | -0,5 | 4,85 | 1,21 | – | 0,22 |
| Tid till något syns, längst (miss = 10 s) | 2,3 | -0,4 | 0,45 | -0,1 | 10 | 10 | – | 10 |
| Tid till rätt plats, median (miss = 10 s) | 1,3 | -0,23 | 0,82 | 0,37 | 5,25 | 8,25 | – | 1,71 |
| Tid till rätt plats, längst (miss = 10 s) | 5,83 | 1,57 | 4,47 | 0,9 | 10 | 10 | – | 10 |
| Flyttar där samma kort glider till nya platsen | – | 0/1 | – | – | 1/1 | 4/18 | – | 5/20 |
| Flytt: tid till nya platsen, median (miss = 10 s) | – | 10 | – | – | 0,37 | 10 | – | 10 |
| Mattans zoomändringar per minut | 5,31 | 0 | 1,5 | 0 | 0 | 0,41 | 0,39 | 0,68 |
| Mattans panoreringar per minut | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Zoom eller pan som hoppar (utan glidning) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Platshållare som syntes | 21 | 10 | 5 | 19 | 9 | 220 | 0 | 284 |
| Platshållare, sekunder på mattan | 14 | 6,75 | 2,25 | 18,15 | 11,25 | 699,6 | 0 | 752 |
| Laddtexter som syntes (Reading…, Moving…, Reading the card…, Asking Claude…) | 28 | 14 | 9 | 22 | 9 | 245 | 0 | 327 |
| Kort som var utanför mattans kant (antal kort) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Kort utanför mattans kant, kortsekunder | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Avståndsfel mattan mot bordet, median (kortbredder) | – | – | – | – | – | – | 0,07 | – |
| Avståndsfel mattan mot bordet, 90:e percentilen (kortbredder) | – | – | – | – | – | – | 0,17 | – |
| Falska omlott (kortpar · rutor) | – | – | – | – | – | – | 0 | – |
| Kort utanför mattans kant (kort · rutor) | – | – | – | – | – | – | 0 | – |
| Kort i facit som saknas på mattan (kort · rutor) | – | – | – | – | – | – | 0 | – |

\* totalt = golden 07, 09–12 och passet 2026-09-22 (telefonens ström). Tider i sekunder från facits tid (rösten eller bildrutan), medianer över alla händelser ihop. – = går inte att räkna för fallet (inget facit för det).

# Högarnas facit för partiet 2026-09-22

Facit för leken och graveyard i Jespers parti 2026-09-22 (1x, 34 cm, normaltempo,
4 min 46 s). Det kompletterar röstfacit `handelser.tsv` i samma mapp. Rösten säger
*vad* Jesper gjorde. Det här facit säger *när leken och högen syntes, täcktes och
bytte kort*, läst ur bilden. En agent skrev det 2026-10-04 (MES-334, del A, A1b),
och Jesper har inte granskat det. Rapporten som använder facit:
[`dev/plan/hogarna-matning.md`](../../../plan/hogarna-matning.md).

Arbetsfilerna ligger utanför git, i `dev/material/arbete/2026-10-04-hogarna-matning/a1b/`
(nedan `a1b/`).

| Fil | Vad |
|---|---|
| `hogar-handelser.tsv` | facit: en rad per händelse för leken och graveyard, i tidsordning (52 rader) |
| `a1b/skript/lekfarg.csv` | råvaran: en rad per ruta (15 fps, 4297 rutor) med andel grönt, hud och matta i lekens ruta, och samma för graveyard-rutan |
| `a1b/skript/` | skripten som gav talen (se nedan) |
| `a1b/ark/` | kontaktarken som tiderna lästes ur |

## Tiderna

Alla tider är sekunder i `telefon.MP4`, som i `handelser.tsv`. Facit är läst ur
`kamera.mp4` (bara mattan, 1080×610, 15 fps). Filmerna har samma tidslinje
(286,36 mot 286,47 s), så en tid i `kamera.mp4` är samma tid i telefonens film.
Klappen vid 21,84 s är synkpunkten.

Upplösningen är **en ruta = 0,07 s**. Graveyard-tiderna lästes ruta för ruta
i 15 fps-ark (`a1b/ark/g1`–`g9`). Lekens tider mättes per ruta ur färgen.

## Kolumnerna

Kolumnerna är desamma som i `handelser.tsv`: `t`, `handelse`, `kort`, `till`,
`plats`, `osaker` och `tal`. I `tal` står anteckningen:

- `(bild)`: läst i rutorna
- `(färg)`: uppmätt av `a1b/skript/lekfarg.py`
- `(ur handelser.tsv)`: en rad kopierad från röstfacit som referens

### Händelserna

| Händelse | När raden skrivs | Tiden `t` är |
|---|---|---|
| `lek_ner` | leken ligger nere | 0,00. Leken ligger redan nere när filmen börjar, så nedläggningen syns inte (`osaker`) |
| `lek_borta` | leken lämnar bilden (söka, blanda, mulligan) | **inga rader:** leken lämnar aldrig bilden i partiet |
| `lek_tillbaka` | leken syns igen efter `lek_borta` | **inga rader** |
| `lek_tackt` | en hand eller ett kort täcker leken i minst 0,2 s | första rutan med under 80 % grönt i lekens inre ruta. I `tal` står slutet, hur länge leken var helt täckt (under 5 % grönt) och närmaste händelse i röstfacit |
| `till_graveyard` | ett kort hamnar överst på graveyard | **första rutan där kortet ligger fritt**, alltså när handen har lämnat högen. När handen kom in över högen, och när rösten hördes, står i `tal` |
| `ur_graveyard` | översta kortet tas från graveyard (`till` = `hand`, `exile` eller `bord`) | första rutan där högen syns fri igen. `plats` säger vad som ligger överst efteråt |
| `grav_stord` | en hand eller arm täcker hela eller delar av översta kortet, utan att högen ändras | första rutan. Slutet står i `tal` |
| `spelar`, `slut` | kopierade från röstfacit som referens (första kortet och slutet) | som i `handelser.tsv` |

**Varför `till_graveyard` räknas från när handen gått:** kortet släpps under
handen och syns inte förrän handen lämnat högen, 0,9–2,7 s efter att handen kom
in. Ett foto efter 0,5 s (byggunderlaget, etapp 3) kan bara räknas därifrån.

## Hur talen kom till

Skripten ligger i `a1b/skript/`.

| Vad | Hur | Skript |
|---|---|---|
| Leken täckt | För varje ruta mäts andelen grönt (lekens fickor), hud och matta i lekens inre ruta, x 262–410, y 355–585. Täckt = under 80 % grönt. En fri lek har 93–100 % grönt (första percentilen 0,93) | `lekfarg.py`, `tackt.py` |
| Lekens läge | Den gröna lådan i en större ruta runt leken (x 200–480, y 300–610) | `lekfarg.py`, `sek.py` |
| Graveyard-händelserna | Kontaktark med varje ruta i 15 fps runt varje händelse. Tiderna lästa för hand | `ark.py` (arken `g1`–`g9`) |
| Översta kortet stört | Varje ruta i graveyard-rutan (x 100–228, y 360–550) jämförs med kortets egen bild direkt efter att det landat. Jämförelsen är en normaliserad korrelation, som tål ljusbyten. Under 0,75 = stört. Varje störning är kontrollerad i rutorna (`st_0`, `st_1`) | `overst.py`, `fonster.py` |
| Kortens läge mot leken (mått 3) | Helbilder med rutnät vid varje kort som läggs nära leken | `lagen.py` (arken `lg_0`–`lg_2`) |

## Vad facit inte säger

- Hur leken lades ner, och hur lång tid det tog från partistart: filmen börjar
  med leken redan nere.
- Hur en lek som lämnar bilden ser ut. Det händer aldrig i partiet, så det finns
  inget exempel att mäta mot.
- Exakt när kortet släpps under handen. Det syns inte, och därför räknas
  `till_graveyard` från när högen är fri.
- Spårrutorna är inbrända i filmen från cirka 29 s. De kan färga rutorna lite men
  täcker inte leken. Korrelationen för översta kortet kan sjunka när en spårruta
  ritas om. Därför är varje `grav_stord` kontrollerad i bilden, och de två
  osäkra är märkta i `osaker`.

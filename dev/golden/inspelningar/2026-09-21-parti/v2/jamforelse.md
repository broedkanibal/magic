# Jämförelsen: mattan mot det digitala bordet, partiet 2026-09-21

Ur `tabell.tsv` (31 rutor, 240–540, var 10:e sekund). Skript: `jamfor.cjs`. Skrivet 2026-09-22 11:34.

## Siffrorna

| Mått | Värde |
|---|---|
| rutor | 31 |
| rutor utan digitalt-rad | 0 |
| `diff_kort` (digitalt − fysiskt), median | 4 |
| `diff_kort`, värsta | 8 (ruta 480) |
| `diff_tappade` (digitalt − fysiskt), median | 2 |
| `diff_tappade`, värsta | 7 (ruta 500) |
| rutor med tappade kort på mattan | 12 av 31 |
| … av dem med minst ett tappat kort på det digitala bordet | 11 av 12 |
| fysiskt tappade kort totalt (alla rutor) | 39 |
| digitalt tappade kort totalt (alla rutor) | 76 |
| rutor med `lage` = osäker på minst ett kort | 6 av 31 |
| andel rutor med `granskning` > 0 | 18/31 |
| andel rutor med `cantsee` > 0 | 26/31 |
| rutor med hand i bild | 16 av 31 |

## Library mot kort som syns

`library` (siffran under högen) ska sjunka lika mycket som `fys_kort + graveyard` stiger, om varje kort som lämnade leken ligger på mattan eller i graveyard. Skillnaden mellan raderna är kort som är någon annanstans: i handen, eller räknade fel.

| ruta | klocka | library | fys_kort | graveyard (dig) | fys_kort + graveyard | library + fys_kort + graveyard |
|---|---|---|---|---|---|---|
| 240 | 23:11 | 29 | 8 | 1 | 9 | 38 |
| 250 | 23:11 | 29 | 8 | 1 | 9 | 38 |
| 260 | 23:11 | 29 | 10 | 1 | 11 | 40 |
| 270 | 23:11 | 29 | 10 | 1 | 11 | 40 |
| 280 | 23:11 | 29 | 10 | 1 | 11 | 40 |
| 290 | 23:12 | 29 | 11 | 1 | 12 | 41 |
| 300 | 23:12 | 29 | 8 | 2 | 10 | 39 |
| 310 | 23:12 | 27 | 9 | 2 | 11 | 38 |
| 320 | 23:12 | 27 | 9 | 2 | 11 | 38 |
| 330 | 23:12 | 27 | 10 | 2 | 12 | 39 |
| 340 | 23:12 | 27 | 11 | 1 | 12 | 39 |
| 350 | 23:13 | 27 | 10 | 1 | 11 | 38 |
| 360 | 23:13 | 26 | 9 | 1 | 10 | 36 |
| 370 | 23:13 | 26 | 9 | 1 | 10 | 36 |
| 380 | 23:13 | 26 | 11 | 1 | 12 | 38 |
| 390 | 23:13 | 26 | 11 | 1 | 12 | 38 |
| 400 | 23:13 | 26 | 11 | 1 | 12 | 38 |
| 410 | 23:14 | 25 | 11 | 1 | 12 | 37 |
| 420 | 23:14 | 25 | 10 | 1 | 11 | 36 |
| 430 | 23:14 | 25 | 12 | 1 | 13 | 38 |
| 440 | 23:14 | 24 | 11 | 1 | 12 | 36 |
| 450 | 23:14 | 23 | 9 | 2 | 11 | 34 |
| 460 | 23:14 | 23 | 9 | 2 | 11 | 34 |
| 470 | 23:15 | 23 | 10 | 2 | 12 | 35 |
| 480 | 23:15 | 23 | 10 | 2 | 12 | 35 |
| 490 | 23:15 | 23 | 10 | 2 | 12 | 35 |
| 500 | 23:15 | 22 | 10 | 2 | 12 | 34 |
| 510 | 23:15 | 22 | 11 | 2 | 13 | 35 |
| 520 | 23:15 | 21 | 10 | 2 | 12 | 33 |
| 530 | 23:16 | 21 | 11 | 2 | 13 | 34 |
| 540 | 23:16 | 21 | 11 | 2 | 13 | 34 |

## Per ruta

| ruta | klocka | fys kort | fys tappade | fys högar | dig kort | dig tappade | diff kort | diff tappade | granskning | cantsee | hand |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 240 | 23:11 | 8 | 0 | 2 | 12 | 3 | 4 | 3 | 1 | 0 | ja |
| 250 | 23:11 | 8 | 0 (+1 osäkra) | 2 | 12 | 2 | 4 | 2 | 1 | 0 | ja |
| 260 | 23:11 | 10 | 0 (+2 osäkra) | 3 | 11 | 3 | 1 | 3 | 1 | 0 | ja |
| 270 | 23:11 | 10 | 0 | 3 | 10 | 3 | 0 | 3 | 0 | 0 | nej |
| 280 | 23:11 | 10 | 0 | 4 | 10 | 3 | 0 | 3 | 0 | 0 | ja |
| 290 | 23:12 | 11 | 4 | 4 | 10 | 2 | -1 | -2 | 0 | 3 | nej |
| 300 | 23:12 | 8 | 2 (+2 osäkra) | 2 | 8 | 2 | 0 | 0 | 0 | 3 | ja |
| 310 | 23:12 | 9 | 0 | 4 | 11 | 3 | 2 | 3 | 1 | 5 | ja |
| 320 | 23:12 | 9 | 1 | 4 | 13 | 1 | 4 | 0 | 2 | 5 | ja |
| 330 | 23:12 | 10 | 1 | 4 | 14 | 1 | 4 | 0 | 2 | 5 | nej |
| 340 | 23:12 | 11 | 1 | 4 | 16 | 0 | 5 | -1 | 3 | 4 | nej |
| 350 | 23:13 | 10 | 1 | 3 | 13 | 1 | 3 | 0 | 3 | 3 | ja |
| 360 | 23:13 | 9 | 0 (+1 osäkra) | 2 | 13 | 2 | 4 | 2 | 2 | 4 | ja |
| 370 | 23:13 | 9 | 0 (+1 osäkra) | 2 | 16 | 4 | 7 | 4 | 2 | 4 | ja |
| 380 | 23:13 | 11 | 0 | 4 | 14 | 3 | 3 | 3 | 1 | 7 | ja |
| 390 | 23:13 | 11 | 0 | 4 | 13 | 4 | 2 | 4 | 0 | 5 | ja |
| 400 | 23:13 | 11 | 0 | 4 | 13 | 3 | 2 | 3 | 0 | 6 | nej |
| 410 | 23:14 | 11 | 0 | 4 | 14 | 3 | 3 | 3 | 0 | 8 | ja |
| 420 | 23:14 | 10 | 0 | 4 | 15 | 3 | 5 | 3 | 0 | 8 | nej |
| 430 | 23:14 | 12 | 0 | 4 | 16 | 2 | 4 | 2 | 0 | 7 | nej |
| 440 | 23:14 | 11 | 0 | 3 | 15 | 1 | 4 | 1 | 1 | 5 | nej |
| 450 | 23:14 | 9 | 0 | 3 | 15 | 0 | 6 | 0 | 0 | 6 | ja |
| 460 | 23:14 | 9 | 4 | 2 | 15 | 1 | 6 | -3 | 0 | 6 | nej |
| 470 | 23:15 | 10 | 7 | 2 | 17 | 2 | 7 | -5 | 1 | 9 | nej |
| 480 | 23:15 | 10 | 7 | 2 | 18 | 3 | 8 | -4 | 2 | 8 | nej |
| 490 | 23:15 | 10 | 7 | 2 | 17 | 1 | 7 | -6 | 2 | 8 | nej |
| 500 | 23:15 | 10 | 1 | 3 | 17 | 8 | 7 | 7 | 1 | 12 | ja |
| 510 | 23:15 | 11 | 0 | 3 | 17 | 1 | 6 | 1 | 1 | 9 | nej |
| 520 | 23:15 | 10 | 0 | 3 | 17 | 4 | 7 | 4 | 0 | 8 | nej |
| 530 | 23:16 | 11 | 0 (+1 osäkra) | 3 | 17 | 4 | 6 | 4 | 0 | 7 | ja |
| 540 | 23:16 | 11 | 3 | 3 | 17 | 3 | 6 | 0 | 1 | 11 | nej |

## Rutor med tappade kort på mattan

| ruta | fys tappade | dig tappade | speglat? |
|---|---|---|---|
| 290 | 4 | 2 | ja |
| 300 | 2 | 2 | ja |
| 320 | 1 | 1 | ja |
| 330 | 1 | 1 | ja |
| 340 | 1 | 0 | nej |
| 350 | 1 | 1 | ja |
| 460 | 4 | 1 | ja |
| 470 | 7 | 2 | ja |
| 480 | 7 | 3 | ja |
| 490 | 7 | 1 | ja |
| 500 | 1 | 8 | ja |
| 540 | 3 | 3 | ja |

# Historik — lekfotots golden set, en rad per sparad baslinje

Totalerna ur summeringen i `node dev/lekgolden/kor.cjs`, för de tio seten:
*rätt / facit*, *saknas*, *extra*, *fel namn* (inom parentes: utan To check),
*oläsliga* (platshållare), *osäkra* (namn under To check) och *exakt rätt*
(set där leken blev precis facit). `hela` är filväljarens väg, `ram` kamerans
ram. Commit är den commit som `senaste.json` checkades in i.

| datum | commit | modell, prompt | beskärning | rätt | saknas | extra | fel namn | oläsliga | osäkra | exakt | vad |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-26 | 4b090e2 | claude-opus-5, v20 (lekblocket ace61f53) | hela | 336/372 | 36 | 4 | 4 (0) | 92 | 100 | 4/10 | första baslinjen (MES-289): 15 foton, 10 set, facit 345c83d1 |
| 2026-09-26 | 4b090e2 | claude-opus-5, v20 (lekblocket ace61f53) | ram | 128/372 | 244 | 0 | 0 | 82 | 22 | 0/10 | samma svar genom kamerans ram på 390×844 — fotona är tagna för hela bilden, inte för ramen |

## Spridning, 2026-09-26

Tre foton lästa en gång till (`--las-om 07,09,13 --spridning`), samma bild,
samma prompt:

| Foto | Beskärning | Svar 1 | Svar 2 | Poster som skilde |
|---|---|---|---|---|
| 07 (närbild, kant på båda sidor) | hela | 12/12 rätt, 1 extra (kant), 9 oläsliga | 12/12, 0 extra, 9 oläsliga | 1 av 22 |
| 09 (hela bordet, på tvären) | hela | 19/40, 2 fel namn, 24 oläsliga | 24/40, 2 fel namn, 21 oläsliga | 9 av 48 |
| 13 (hela bordet, på tvären, blänk) | hela | 28/40, 2 fel namn, 23 oläsliga | 26/40, **7 fel namn**, 17 oläsliga, 3 extra | 32 av 53 |
| 09 | ram | 7/40 | 4/40, 1 fel namn | 9 av 24 |
| 13 | ram | 5/40 | 4/40, 1 fel namn | 2 av 16 |

Närbilder i gott ljus ger samma svar; helbordet på tvären varierar kraftigt
mellan två läsningar av samma bild. Alla fel namn stod under To check.

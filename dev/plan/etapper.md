# Spegelläget i etapper (MES-237)

Kartan över vägen till målen i MES-237. Linear är källan för status; den
här filen finns för att en ny Claude Code-session ska kunna läsa planen
utan att gå till Linear. Uppdatera båda när något ändras.

## Målen

| Löfte | Mål |
|---|---|
| Något syns på rätt plats och i rätt tap-läge | ≤ 0,3 s från att handen släpper |
| Rätt namn står där | median ≤ 0,3 s (siktet 0,1 s), 95 % ≤ 0,6 s, tak 2 s |
| Slutläget är rätt | 99 fall av 100 |

Gäller allt man gör vid bordet: lägga ner, tappa och untappa, flytta,
till graveyard, till handen, tillbaka i library, stacka mana, och fästa
ett kort vid ett annat.

## Etapperna

| Etapp | Issue | Innehåller | Ändrar hur appen känns? |
|---|---|---|---|
| 1 Mät klart | MES-253 | MES-244, 243, 164, 238, 242, 190 | nej |
| 2 Farten | MES-254 | MES-246, 221, 252, 222 | ja, namnet kommer tidigare |
| 3 Träffsäkerheten | MES-255 | **MES-250**, 233, 106, 241, 245, 234, 235, 232, 220, 219, 218, 217, 223 | ja, färre fel och fler kort hittas |
| 4 Handlingarna | MES-256 | MES-247, 251, 248 | ja, tokens, attach och zonerna |

Etapp 4 rör appen och avstämningen, inte igenkänningen, och kan byggas
parallellt med 2 och 3 av en egen session.

## Läget 2026-09-20

* **Uppmätt på riktig telefon (MES-238):** telefonens beslut → ritat på
  datorn ~0,1 s, lika i 4K·15 och 1080p·30. Telefonen är lika snabb som
  Macen. Modellen gick på WebGPU.
* **Uppmätt i golden (MES-244):** igenkänningen håller 0 fel ner till
  48 px kortsida. Spärrarna (ORB-inliers, skala, titelraden) bromsar inte
  små kort. Analysbilden är högst 360 px bred i både 4K och 1080p.
* **Det som saknas är att HITTA korten:** 41 av 57 blir spår, och de
  som fattas ligger omlott (MES-250). De korten går till Claude, och det
  är det som gör namnen långsamma.
* **Namn i dag:** 0,84 s i median på telefon, hälften via Claude
  (1,5–6 s). Lokalt rätt namn 35/57, med Claude 57/57, 0 fel.

## Beroenden värda att minnas

* MES-246 del 2 (läs före släppet) vill ha MES-221 (läsningen i egen
  tråd), annars fryser analysen av en läsning per ruta.
* MES-241 (större spelyta) och MES-245 (markera spelytan) hänger på
  MES-250: med vidvinkel blir ett kort ~42 px i analysbilden, och då
  faller omlott liggande kort isär.
* MES-247 (tokens) och MES-251 (attach) väntar på svaret i MES-246 del 1:
  syns en flytt som en flytt?
* MES-243 (värmeprovet) väntar på MES-244 (vilka lägen som ska provas).

## Regler som gäller i hela kedjan

* **0 fel namn.** Golden (12 fall), `--utan-leken` och `--ljus alla`.
  En ändring som hittar fler kort men gissar fel är värdelös.
* Systemprompten ändras bara på Jespers uttryckliga begäran (CLAUDE.md).
* En golden-körning i taget, egen port, `ps aux | grep "[k]or.cjs"` före.

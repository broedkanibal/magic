# Bordsvy med motståndare — "B with seats" (MES-133)

Förlagan för att ersätta spelarflikarna med ett bord där motståndarna sitter
mitt emot. Den levande designytan är facit:
https://claude.ai/artifact/2HYUbafSPUKP8voM3DTrc7 — sida 3 "3 · B with seats"
(version 6, 2026-09-15). Sida 1–2 är historik (A/B/C och B utforskad) och ska
inte byggas.

## Mappen

| Sökväg | Vad |
|---|---|
| `artboards/Seats4.dc.html` | fyra spelare: Me · Sara · Erik · Linus · All |
| `artboards/Seats2.dc.html` | två spelare: Me · Erik · Both |
| `artboards/*.jpg`, `support.js` | bilderna och körmiljön så att artboardsen går att öppna fristående |
| `src/` | källorna artboardsen byggdes av (referens — `gen3.mjs` kräver sida 1–2, som bara finns i designytan) |

Öppna en artboard fristående: servera repot (`.claude/launch.json`, "mesa")
och gå till `/design_handoff_bordsvy/artboards/Seats4.dc.html`.

## Var logiken finns i `src/`

| Fil | Innehåll |
|---|---|
| `logic-v3.js` | allt nytt: nivåerna (`nivaH`), `seatLayout` (mått per läge), kanten (`kantDown` — drag följer pekaren, snäpper åt draghållet efter 14 px), `seatKeys`, klick-för-att-välja (`matDown`, `klickValj`, `startPan`), `mat3` (full / kolumn / list), högarna (graveyard-solfjädern, drop på graveyard/library) |
| `base.js` | zoom/pan per matta som appen: `v2Wheel`, `zoomAt`, `klampVy`, `fit2`, Select/Pan (`S`, mellanslag, höger-/mittenknapp) |
| `v3.css` | växeln på kanten (`.ssw`, `.sseg`, spelarfärger), kanten (`.kant3`, 56 px), kolumner (`.kol`), listen (`.strip`), högarna (`.grav3`, `.bib3`, `.gfan3`) |
| `frags3.html` | markupen för en matta, kanten och foten |
| `S4.js`, `S2.js` | konfigurationen: `opps`, `ids`, förval `all` |

## Beteendet i korthet

- **Nivåer:** mitt bord stort (motståndarna som 46 px-list) · alla (hälften
  var) · en motståndare stor (övriga som 112 px-kolumner, mitt bord som list).
  Allt glider med samma 0,5 s-övergång; byte mellan motståndare glider i sidled.
- **Kanten:** 56 px band mellan motståndarna och mitt bord, växeln
  Me · spelare · All mitt på. Klick på en spelare väljer; drag var som helst
  på kanten (också från en knapp) flyttar kanten och snäpper; klick på bandet
  växlar mitt bord ↔ alla.
- **Klick i en ruta** (matta, kolumn eller list) väljer spelaren; ett drag
  över 4 px pannar i stället. I min egen stora matta tappar klick på ett kort
  fortfarande kortet.
- **Tangenter:** 1–3 = motståndarna i sittordning (bara motståndarna), M =
  mitt bord, A = alla/båda, ↑↓ = nivå, ←→/Tab = nästa motståndare, Esc =
  stäng solfjädern.
- **Varje matta** har egen zoom/pan/fit och zoomchip. Motståndarens matta är
  vriden 180° med högarna uppe till höger.
- **Högarna** som MES-125: gul streckad graveyard med solfjäder vid pekning
  (mina: Return to play / Exile / dra ut), blå library-ram med baksidor.

Erik, Sara och Linus och korten är påhittade.

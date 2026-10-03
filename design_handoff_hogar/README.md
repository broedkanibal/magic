# Högarna utan uppstart: designytan (MES-334)

**Designytan:** "Mesa Piles From Play",
https://claude.ai/artifact/RkqPz5qYrBHV5jckSC3fQh

Besluten bakom den står i [`dev/plan/hogarna-principer.md`](../dev/plan/hogarna-principer.md).
Bygg ingenting i `index.html` förrän Jesper har valt.

## Sidorna och valen

Gröna lappar på ytan är mitt förslag. Sida 4 ersätter sida 1, och sida 3 ersätter ramarna på sida 2:
G1–G3 och U1–U3 gäller bara om D1 inte byggs.

| Sida | Rad | Varianter | Förslag |
|---|---|---|---|
| 1 · Today's table (etapp 1) | Leken hittas | **K1** kvittensen vid högen (Main, går att klicka) · **K2** i kamerapillret · efter "Not my library" | K1 |
| | Otappat byts efter tre kort | **N1** rörelse + rad med Undo · **N2** bara rörelsen | N1 |
| | Första kortet till graveyard | flygturen till dagens hög + kvittensen · **M1** Nej som meny · **M2** Nej som val i raden | M2 |
| 2 · Piles where they lie (etapp 2) | En graveyard skapas där kortet ligger | **G1** ramen lägger sig runt kortet · **G2** en fördjupning öppnas under kortet · **G3** tryckt på mattan | G1 |
| | Leken är upptagen, för alla | **U1** ramen står kvar och andas · **U2** leken blandas på sin plats · **U3** leken lyfts och svävar | U1 |
| | Leken flyttas · Nej med Exile | leken glider och ramen följer med · Nej-menyn med Exile | — |
| 3 · No drawn lines (ny riktning) | Tre riktningar | **D1** bara korten, bricka på underkanten · **D2** färgad flik · **D3** graveyard som kaskad | **Jesper valde D1** (2026-10-03), och högarna följer mattan |
| | D1 i rörelse | graveyard skapas · leken upptagen (skuggan står kvar) · zoomsteg där högarna följer med | — |
| | Sleeves | **S1** sleeves ur kameran när leken hittas · **S2** valet på lekens sida | S1 + S2 |
| 4 · Stage 1 in the new look | Samma val som sida 1, i D1:s utseende | K1/K2 · N1/N2 · graveyard skapas där kortet ligger · M1/M2 | K1, N1, M2 |

## Källan

- `project/`: en `.dc.html` per tavla, `canvas.json`, `mesa.css` (kopia ur
  `design_handoff_hand/`), `hogar.css` (sida 1–2), `hogar2.css` (sida 3: högar
  utan linjer och sleeves, ritade i CSS) och `img/`.
- Rörelserna är `@keyframes` i `hogar.css` och följer tiderna i
  `design_handoff_animeringar/TIDSLINJER.md`: utspel med UT 330 ms, flygturen
  med FLY 420 ms, tap med SOFT 240 ms.
- **Ändra ytan:** redigera filen, kontrollera med Artifact `read`
  (`project/canvas.json`) att Jesper inte ändrat något i mellantiden, och
  publicera till samma url med `root` = den här mappen.

# Lekbyggaren — "Mesa Deck Builder" (MES-146)

Tre varianter av vyn där man skapar, ändrar och tar bort lekar, bredvid dagens
dialog. Den levande designytan är facit:
https://claude.ai/artifact/PU4Vk5m2yrr7Vw3mo53NZV

| Artboards | Vad |
|---|---|
| `Today` | dagens dialog (`#lekOv`) med lekväxlarens meny öppen |
| `A1Decks`, `A2New`, `Main` (= A3), `A4Paste`, `A5Type` | A · egen sida för lekarna (förslaget) |
| `B1Type`, `B2Paste`, `B3Phone` | B · låda vid kanten, bordet syns |
| `C1Start`, `C2Photo`, `C3Shelf` | C · skanningsbordet |
| `P1Guide`, `P2Camera`, `P3Read` | telefonen, samma i alla tre |

Sida 2 "A, clarified" (MES-146) och sida 3 "Landing in a game" (MES-151):

| Artboards | Vad |
|---|---|
| `A1Decks2`, `A2Start`, `A2Phone`, `A2Photo`, `A2Paste`, `A2Type` | A förtydligad: tre skilda sätt, vad som händer efter QR/inklistring/inskrivet, flera exemplar och sideboard |
| `Landing` | dagens landning i ett spel ("Set up your table") |
| `D1Host` … `D4Join` | D · leken bredvid panelen |
| `E1Host` … `E4Join` | E · lobbyn först |
| `F1Host` … `F4Join` | F · direkt på bordet |
| `L3A1Decks2` … `L3A2Type` | A från sida 2 igen, som rad under F (kopior, byggs av gen2.mjs) |

Sida 4 "Decks & Get ready" (MES-163): lekar som eget begrepp och uppstarten
"Get ready for the game". Panelen står till vänster överallt och korten till höger.

| Artboards | Vad |
|---|---|
| `H1Home`, `H2Deck` | Home före spel (Your games, Your decks) och lekens egen sida |
| `H3Edit`, `H4Select` | ändra eller ta bort ett kort, och flera kort på en gång |
| `N1Empty` … `N5Read`, `N8Check`, `PN2Connected` … `PN5Read` | en ny lek med telefonen, telefonens skärm under varje steg, och klicket på ett kort med Check |
| `N6Paste`, `N7Pasted` | Paste a list: korten läggs in direkt, osäkra under To check |
| `G1Deck` … `G6Grave`, `G1Edit`, `G5Size`, `PG4Light` | Get ready for the game, värden: Pick your deck (med G1Edit: ändra en befintlig lek) → Choose game mode (Hybrid modes / Digital mode) → Connect your phone → Set up your table |
| `L1Wait` … `L6Done` | library-platsens alla lägen, ur designytan "Mesa Library Drop" (MES-139) |
| `J1Welcome`, `J2Mode` | den som joinar via länk |

## Bygga om

```bash
node gen3.mjs
```

`gen3.mjs` importerar `gen2.mjs`, som i sin tur kör `gen.mjs`: sida 1–3 byggs
först, byte för byte som förut, och sedan sida 4 och `artboards/canvas.json`
med alla fyra sidorna. `gen2.mjs` ensam ger en canvas utan sida 4.
Manasymbolerna läses ur `MANA_SVG` i `../index.html`. Kortbilderna ligger i
`img/` (Scryfall, 250 px).

Öppna en artboard fristående: `artboards/` har `support.js` och bilderna
bredvid. Servera repot med launch-konfigen "mesa-22" och gå till
`/design_handoff_lekbygge/artboards/Main.dc.html`.

Läggningsguiden (`guide()` i gen.mjs) går i två omgångar på 18 s:
1. Korten läggs i kolumner där bara namnraden syns.
2. Ramen fälls ut och blixten går.
3. "Photo N" bockas av.
4. Korten skjuts undan och nästa omgång läggs.

Stegen under guiden tänds i takt med omgångarna.

Lekarna och korten är påhittade exempel.

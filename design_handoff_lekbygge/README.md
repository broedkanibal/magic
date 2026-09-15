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

## Bygga om

```bash
node gen.mjs
```

`gen.mjs` skriver `artboards/*.dc.html` och `artboards/canvas.json`.
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

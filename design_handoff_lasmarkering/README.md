# Läsmarkeringen — MES-362

Ett nytt kort i Mirror my table syns direkt med kamerans foto, och namnet fylls i
när det finns: lokalt, via Claude eller av spelaren. Bakgrund: D2 och "Nästa steg
(Jespers beslut 2026-10-11)" i `dev/plan/lekar-och-minnet.md`.

**Designytan:** "Mesa Reading Mark", https://claude.ai/artifact/EguWdqncyTDFqvPR5TGYNM
(Design-typen). Väntar på Jespers val. Bygg ingenting i `index.html` förrän han valt.

| Tavla | Vad |
|---|---|
| `Main.dc.html` | prototypen: A, B och C sida vid sida i realtid, sju fall, Tweaks *tempo*, *overgang*, *framkallningstid* (B) |
| `Fall.dc.html` | samma fall i stillbilder vid 0,3 · 1,2 · 3,5 · 7,5 s från släppet |
| `canvas.json` | tavlornas plats på ytan |

| Variant | Medan kortet läses | Namnet kommer | Spelaren behövs |
|---|---|---|---|
| **A · Stilla sudd** | dagens oframkallade kort (MES-344): suddigt foto, matt glans, ingenting rör sig | framkallning 300 ms + grön ring | skarp mitt + NOT IDENTIFIED + Enter name (MES-351) |
| **B · Framkallas i takt** | fotot klarnar sakta: blur 12 → ~3,5 px, mättnad och ljus upp, glansen ned, `1 − e^(−t/1800 ms)` | som A | fotot blir klart på 300 ms, sedan som A |
| **C · Tyst prick** | som A + en prick 7 px uppe till höger som andas (0,35–0,85, 2,4 s) | pricken tonas bort, sedan som A | pricken tonas bort, sedan som A |

Gemensamt för alla tre: kortet läggs ned vid släppet (I1 i MES-349, i dag 0,5 s:
`OFR_TROSKEL`), en osäker gissning visas aldrig, motståndaren får bara den lilla
suddiga bilden och aldrig den skarpa mitten, och utan Claude går kortet till
spelaren så fort telefonen inte är säker.

Motorn är funktionen `rita()` i båda tavlorna; tiderna för läggningen och
framkallningen är `TIDSLINJER-E.md` (*Utspel*) i `design_handoff_animeringar/`.
Bilderna är uppladdade `/_blob/`-assets: kamerans beskärningar ur
`dev/embed/riktiga/` och kortbilder ur `dev/embed/cache/ref/`.

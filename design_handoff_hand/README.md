# Hand och lek i appen — MES-299

En digital spelare har ingen fysisk lek. Den här mappen är designen för det
hen behöver i stället: en hand, en lek att dra ur, titta på de översta korten,
söka i leken, och hur motståndaren ser att det händer.

**Designytan:** "Mesa Hand and Library",
https://claude.ai/artifact/EPxHitCQV7gDAVo5AwmZCc

Bygg ingenting i `index.html` förrän Jesper valt. Byggena är MES-40 (hand och
ordnad lek), MES-300 (översta N), MES-301 (sök), MES-302 (till och från
leken), MES-303 (exile med spelrätt, toppkortet synligt) och MES-304 (loggen).

## Sidorna och valen

Varje sida svarar på en fråga. Gröna lappar på ytan är mitt förslag.

| Sida | Fråga | Varianter | Förslag |
|---|---|---|---|
| 1 · The hand | var handen bor, hur ett kort spelas | **A** solfjädern på bordskanten · **B** list under mattan · **C** tredje hög | A |
| 2 · Draw and opening hand | dra, blanda, öppningshand, mulligan | lekhögens lägen och meny · **O1** utdelad på mattan · **O2** rakt in i handen | O1 |
| 3 · Top of the library | titta på översta N | **T1** i händerna, bredvid handen · **T2** bricka med fält | T1 |
| 4 · Search | sök i leken | **S1** solfjädern som redan finns · **S2** sökpanel | S1 |
| 5 · What the others see | vad motståndaren ser | **L1** logg under det stora kortet · **L2** textrader på mattan | L1 (ersatt av sida 6) |
| 6 · Seeing what they do | samma fråga, utan text | **V1** korten rör sig · **V2** handen hålls upp · **V3** hans hand gör det | V1 |

## Jespers val (2026-10-01)

Sida 1 **A**, sida 2 **O2**, sida 4 **S2**, sida 6 **V1**. Kvar: sida 3 och
textraden på sida 6. Found-sektionen i S2 ska ritas om.

## Sida 6 · Att se vad motståndaren gör (iteration 2)

Jesper 2026-09-30: sida 5 skriver vad motståndaren gör. Det ska kännas som
vid ett riktigt bord, där man *ser* vad hen gör. Sida 6 har tre varianter
där varje handling är en rörelse av kort, animerad i slinga. Sida 5 ligger
kvar.

| Tavla | Vad |
|---|---|
| **V1 · The cards move** (förslag) | hans hand är baksidor vid bortre kanten; dra, scry 2, sök + blanda, avslöja |
| **V2 · His hand held up** | handen som en stor solfjäder av baksidor från kanten; kort han tittar på går in i den |
| **V3 · His hand does it** | V1 plus en pekare i hans färg som gör varje rörelse |
| V1 · More actions | spela ur handen, mill 2, discard, lägg två överst |
| V1 · On Sara's screen | helbild utan loggkolumn och utan statustext, scry 2 pågår |
| When his table is a strip | samma rörelser i miniatyr när hans bord bara är en list |
| **TA · A line under his library** (förslag) | rad 3: en kort rad under hans lek medan det händer, först vad, sedan utfallet; står kvar några sekunder |
| TB · Marks that stay a while | inga ord, märken som ↑1 ↓1 och +1 står kvar på högen och handen |
| TC · At his name, with replay | det senaste står vid hans namn tills nästa handling, med en knapp som spelar upp det igen |

Rad 3 kom av Jespers kommentar 2026-09-30: V1 och detaljerna är bra, men helt
utan text kan man missa vad någon gör. Rad 3 kör rörelserna med en längre
svans (scry 9 s, sök 11 s) så att det som står kvar hinner synas.

Digital mot fysisk spelare: fallen och förslagen står i
[`digital-mot-fysisk.md`](digital-mot-fysisk.md).

Tekniken: `project/see.css` har rörelserna som `@keyframes` med målen som
CSS-variabler per element (`--tx`, `--hx` …). Vändningar görs utan 3D (kortet
trycks ihop på bredden och framsidan tänds på kanten), eftersom
`backface-visibility` inte höll i förhandsvisningen. Pekaren i V3 är ritad
ur ändringen, inte hans riktiga muspekare, så den kostar ingen extra trafik.

Prova en ruta i en viss fas: öppna tavlan fristående och kör i konsolen
`document.getAnimations().forEach(a => { a.pause(); a.currentTime = 0.45 * a.effect.getTiming().duration })`.

## Principerna bakom

- **Appen läser inte kortet.** Spelaren lägger korten där de ska, som vid ett
  fysiskt bord. Förvalen (Scry 2, Surveil 1) fyller bara i antalet.
- **Färgen säger vems korten är.** Blå kant = kort ur leken som bara jag ser.
  Gul kant = alla ser dem. Samma färger som högarna har i dag.
- **Handen står alltid till vänster**, med sin etikett. Kort ur leken kommer
  upp till höger om den.
- **Blanda bara när spelaren ber om det.** En sökning slutar med att leken
  läggs ner och blandas; "Put down without shuffling" finns för undantagen.
- **Motståndaren ser att och hur många, aldrig vilka.** Dolda kort är
  baksidor hos motståndaren; avslöjade kort ligger uppvända på mattan.

## Tangenterna i förslaget

| Tangent | Gör |
|---|---|
| `D` | dra ett kort |
| `H` | handen (i C: ta upp den); på ett kort ur leken: till handen |
| `L` | ta upp leken och sök, som i dag |
| `K` | titta på de översta korten |
| `B` / `T` | kortet underst / överst |
| `Enter` | spela kortet, eller klar |
| `⇧Enter` | till bordet tappat |
| `G` | discard, eller till graveyard |
| `Space` | +1 kort (reveal until) |
| `R` | resten underst i slumpad ordning |
| `Y` | loggen |

Krockar med dagens tangenter, att lösa före bygget:

- `D` är i dag "Duplicate the card under the pointer". Förslaget gör `D` till
  dra. Antingen flyttas Duplicate, eller så drar `D` bara när pekaren inte
  står på ett kort.
- `R` är i dag "Rename yourself". I förslaget gäller `R` bara medan kort ur
  leken ligger framme.
- `H` är redan "Return the card to your hand" och betyder samma sak här.
- `K` och `Y` är lediga i hjälplistan, men inte kontrollerade mot alla lägen.

## Det som inte är ritat

- Handen i vyn Everyone, där min matta bara är 374 px hög (syns på sida 5,
  men från motståndarens skärm).
- Handen med fler än tio kort.
- Surveil (som scry, men Graveyard i stället för Bottom) och mill/exile av
  de översta N (menyraderna finns, ingen dialog behövs).
- Telefonen.
- Rörelserna: draget ur högen, blandningen, kortet som flyger till botten.
  De beskrivs på lapparna men är inte animerade.

## Leken i bilderna

En 40-kortslek, grön och vit, så att talen går ihop på varje bild
(lek + hand + bord + graveyard = 40). Llanowar Elves ×4, Wood Elves ×4,
Faithful Pikemaster ×4, Serra Angel ×3, Glorious Anthem ×3, Ancestral
Blade ×3, Danitha ×2, Forest ×10, Plains ×7. Faithful Pikemaster har scry 2
och Wood Elves söker en Forest, så exemplen är riktiga kort. Bilderna är de
som redan låg i `design_handoff_bordsvy/` och `design_handoff_lekbygge/`.

## Mappen

| Sökväg | Vad |
|---|---|
| `project/*.dc.html` | artboards, en fil var, skrivna för hand |
| `project/mesa.css` | appens utseende (ur `index.html`) plus det nya, delad av alla artboards |
| `project/canvas.json` | sidor, lägen och lappar på ytan |
| `project/img/` | kortbilderna |
| `project/support.js` | lokal kopia av körmiljön, bara för att öppna artboards fristående. Publiceras inte |
| `fan.cjs` | räknar solfjäderns lägen med appens egna tal (`HF`: R 1300, kort 124×173) |

## Öppna en artboard fristående

```bash
mkdir -p dev/bilder/hand && cp -R design_handoff_hand/project/ dev/bilder/hand/
```

Starta sedan en av stub-servrarna (till exempel `mesa-22`) och öppna
`/dev/bilder/hand/Main.dc.html`. Viewport 1440×900 för helbilderna,
1061×752 för de beskurna.

## Ändra

Designytan håller sina filer under `project/`. Läs en fil med Artifact `read`
(`path: "project/TopT1.dc.html"`), ändra den och publicera bara den filen till
samma adress. `canvas.json` skickas bara när en artboard läggs till, flyttas
eller byter storlek, och läses precis före. Nya förslag läggs som nya
artboards eller en ny sida; det som finns ligger kvar som historik.

# Högarnas facit: partiet 2026-09-21

Gjort 2026-10-04 av mätagent A1a (MES-334, del A). Ingen kod ändrad. Rapporten som
använder facit: [`dev/plan/hogarna-matning.md`](../../../plan/hogarna-matning.md).

## Källan

Filmen är `dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/dator.mov` (utanför git).
Det är en skärminspelning av datorn (2258 × 1800, ~59 fps, 1210 s). Telefonen filmade i 4K 15 fps, men
kamerabilden syns bara i Mesas kamerapanel, **705 × 438 px**, med Mesas spårrutor inbrända.

| Tid i filmen | Vad som syns |
|---|---|
| 0–46 s | **Ingen kamerabild.** Panelen visar latensrapporten. Uppstarten är redan gjord, och Mesa visar "Play your first card" |
| 47–1199 s | Kamerabilden. Den saknas bara 110–115, 166–174, 546–550 och 877–878, när en kortförstoring täcker panelen |
| 1200– | Rapportens panel |

**Klockslaget:** menyradens klocka slår om till 23:08 vid filmens 44,9–45,1 s.
Latensrapporten startade 23:07:20,281, alltså vid filmens ~5,2 s (±0,3).

## Filerna

| Fil | Vad den innehåller |
|---|---|
| `hogar-handelser.tsv` | Händelserna för leken och graveyard, och det måtten behöver. Samma kolumner som `handelser.tsv` i samma mapp |
| `hogar-gy-topp.tsv` | Mått 5: hur länge varje graveyard-kort syns överst |
| `hogar-leken-tackt.tsv` | Mått 6: varje gång lekens yta inte syns, med tid och orsak |

`handelser.tsv` och `platser.tsv` i den här mappen är facit för sek 240–540 från grenen
`natt-2026-09-22`.

## Händelserna i `hogar-handelser.tsv`

| Händelse | Betyder |
|---|---|
| `lek ner` / `lek borta` / `lek tillbaka` | Leken läggs ner, lämnar sin plats eller kommer tillbaka. Före 47 s finns ingen bild, och raderna bygger då på Mesas biblioteksruta. De är markerade `osäker` |
| `lek synlig` | Första kamerabilden av leken |
| `lek flyttad` | Leken flyttas på bordet, en gång (563–574) |
| `första kortet` | Partiets första kort, enligt latensrapportens första skugga |
| `till graveyard` | Ett kort hamnar överst på graveyard-högen. G1–G27 i tidsordning. Sekunden är när handen lägger kortet |
| `ur graveyard` / `graveyard upplockad` | Ett kort tas ur högen, eller hela högen tas upp och bläddras |
| `kort på andra sidan` | Ett kort vars mitt hamnar till vänster om lekens vänsterkant (landen ligger till höger) och som inte är graveyard |
| `kort ovanpå kort` | Ett kort som läggs på ett annat, utom land på land. I kommentaren står om kortet sitter fäst (utrustning) |
| `land på land` | Bara exempel från partistarten. Alla land-på-land är inte uppräknade |
| `lades` / `flyttades` / `togs bort` | Som i `handelser.tsv` i samma mapp. Bara de kort som behövs för måtten är med |

`plats` är P-numret ur `platser.tsv` i samma mapp när kortet finns där. Annars står ett
eget nummer (K1–K13, G1–G27). `x` och `y` är kortets mitt i procent av kamerarutan, avläst med ett
rutnät var 5:e procent. Osäkra rader börjar med `osäker` i kommentaren.

## Så gjordes det

Arbetsfilerna ligger utanför git, i `dev/material/arbete/2026-10-04-hogarna-matning/a1a/`
(nedan `a1a/`).

1. En ruta per sekund togs ut med `dev/rutor.swift` (kamerarutan, 705 × 438, 1207 rutor). Snabba
   byten av graveyard-toppen togs ut var 0,2 s, i 18 fönster.
2. Kontaktark med tidsstämpel i varje ruta lästes för hela partiet: kamerarutan, högarnas hörn, den
   övre raden och landen. Fönstren med graveyard-byten lästes också var 0,2 s. Allt ligger under
   `a1a/ark/`.
3. Lekens ruta mättes per sekund med ett pixelmått (`a1a/leken.py`): andelen lekgrönt, hud och
   mörk matta i en inre ruta av leken. Måttet jämfördes mot 20 handnoterade gånger då handen var
   över leken, och alla 20 fanns med. De tre sekunder där måttet sa "tom" var en klocka eller en
   armskugga, och det kontrollerades i rutorna.
4. Mesas biblioteksruta (nere till vänster på skärmen) togs ut per sekund och klassades (`a1a/tile/`,
   `a1a/tile-per-sekund.json`). Var 40:e sekund kontrollerades för hand.

## Det som är svagt

- **Partistarten saknar bild.** Allt före 47 s bygger på Mesas biblioteksruta och latensrapporten.
  Biblioteksrutan sa "Put your library back here" i 1092 av de 1131 sekunder som har bild, medan
  leken låg synlig i kameran. Dess "borta" går alltså inte att lita på.
- **Leken låg där uppstarten pekade.** Steg 4 gjordes före inspelningen, och graveyard-rutan var
  utpekad nere till vänster. Partiet visar alltså inte var en spelare lägger högarna utan hjälp.
- Graveyard-korten är mest beskrivna med konsten, inte med namn. Fickorna bländar och rutan är liten.

# Inspelningsprovet (MES-190)

**Frågan:** kan telefonen spela in sin egen kamerabild medan Mesa känner igen
kort, utan att igenkänningen blir sämre? Och går filen att få hem? Svaret
avgör hur inspelningsläget i MES-191 byggs.

Provet finns bara med `?debug`. Det ändrar ingenting i kameran: upplösning,
takt och analys är desamma som i ett vanligt spel.

## Delarna

| Del | Var | Vad den gör |
|---|---|---|
| Telefonen | `InspProv` i `index.html` | Mäter varje analyssteg och spelar in strömmen med MediaRecorder. Laddar upp en bit var 10:e sekund och skickar en statusrad var 5:e sekund. |
| Datorn | `InspDator` i `index.html`, raden *Recording probe* i kameradialogen | Startar och stoppar passen, pingar telefonen var 10:e sekund (klockornas förskjutning) och hämtar hem video + logg. |
| Lagringen | `scans/<uid>/inspelning/<pass>/` i Supabase | `0001.mp4` … (eller `.webm`), `logg.json` (telefonen) och `dator.json` (datorn). |
| Sammanställningen | `node dev/insp/sammanfatta.cjs <logg.json> …` | Tabell per pass. B döms mot A från samma telefon. `--md` ger tabellerna för kommentaren. |
| Tidsbasen | `dev/insp/tidsbas.html` | Hittar handen över linsen i videon och jämför med telefonens logg. Ger formeln från datorns klocka till videons sekunder. |

## Passen

| Pass | Längd | Inspelning | Syfte |
|---|---|---|---|
| A | 10 min | nej | Baslinje |
| B | 10 min | ja, telefonens egen bithastighet | Påverkan, storlek, uppladdning, batteri |
| C | 3 min | ja, 1,5 Mbit/s | Storlek för golden, tidsbasen och ett nätavbrott |

## Vad Jesper gör på telefonen

Samma steg för iPhone (Safari) och Android (Chrome). Räkna med cirka 40
minuter per telefon.

**Förbered (en gång per telefon)**
1. iPhone: slå på *Batteriprocent* (Inställningar → Batteri).
2. Öppna `https://magic-mauve-xi.vercel.app/?debug` i telefonens webbläsare. Då minns telefonen debug.
3. Ladda telefonen till minst 80 %. Dra ur laddaren, ta av ett tjockt skal och låt telefonen ligga svalt i 10 minuter.
4. Lägg fram 5 kort ur leken bredvid bordet.

**Starta**
5. Datorn: öppna ett spel med `?debug`. Telefonen: skanna QR-koden och kör uppstarten som vanligt. Låt den mörka skärmen vara på.
6. Datorn: öppna kameradialogen (kamerapillret). Raden *Recording probe · MES-190* ligger längst ner.

**Pass A (10 min, utan inspelning)**
7. Skriv upp batteriprocenten.
8. Välj **A · Without recording** och tryck **Start**. Statusraden ska visa steg/s inom några sekunder.
9. Lägg ut de 5 korten ett i taget under första minuten. Rör sedan inte telefonen.
10. Passet stoppar efter 10 min. Skriv upp batteriprocenten och plocka bort korten.
11. Paus i 10 minuter. Telefonen står kvar i hållaren och är uppkopplad.

**Pass B (10 min, med inspelning)**
12. Skriv upp batteriprocenten. Välj **B · Recording** och tryck **Start**. En röd prick syns på telefonen.
13. Lägg ut samma 5 kort som i steg 9.
14. Efter 10 min: skriv upp batteriprocenten. Är telefonen varmare än efter A? Kom en värmevarning?

**Pass C (3 min, låg bithastighet, tidsbas)**
15. Välj **C · Recording, low bitrate** och tryck **Start**.
16. Efter cirka 10 s: täck linsen helt med handen i 2 s. Gör det igen vid cirka 1:30 och vid cirka 2:40.
17. Vid cirka 2:00: slå av wifi (och mobildata) i 20 s, sedan på igen.
18. Passet stoppar efter 3 min.

**Hämta hem**
19. Vänta tills statusraden säger *done*. Välj passet i den nedre listan (↻ laddar om den) och tryck **Download recording + log**. Gör det för B och C, och för A (bara loggen). Chrome kan fråga om sidan får ladda ner flera filer: svara ja.

**Skicka tillbaka i chatten**
- Telefonmodell och systemversion.
- Batteriet före och efter A, B och C.
- Värmen: hur telefonen kändes efter A och efter B, och om en varning kom.
- Något som föll ur: sidan laddades om, kameran blev svart, anslutningen tappades.
- Var filerna ligger, eller dra in dem i chatten.

## Hur resultatet läses

```bash
node dev/insp/sammanfatta.cjs ~/Downloads/insp-*-A-logg.json ~/Downloads/insp-*-B-logg.json ~/Downloads/insp-*-C-logg.json
```

**Igenkänningen räknas som sämre** i B än i A om något av detta gäller. Gränserna bestämdes före mätningen:

| Villkor | Gräns |
|---|---|
| Steg/s (median) | lägre än 90 % av A |
| Hela stegets tid, p95 | högre än 1,25 × A |
| Kamerans rutor/s | under 12 i mer än 30 s sammanlagt, när A inte var det |
| Nedtakt | ett 10-sekundersfönster under 4 steg/s som A saknar |
| Kontroll med kort | alla 5 kort på mattan senast 90 s in i passet, i både A och B |

**Tidsbasen:** öppna `http://localhost:8232/dev/insp/tidsbas.html` (efter
`npm run dev`) och släpp in C-videon och C-loggen. Spridningen mellan de tre
markeringarna ska vara under 0,5 s, som är facits tolerans för ett videofall.

## Att veta

- **Mätningen körs i telefonen.** Datorns webbläsare stryper en dold flik
  (färre steg, färre rutor). Siffror från ett prov på datorn säger bara att
  kedjan hänger ihop.
- **Rutor/s** är avkodade rutor (`getVideoPlaybackQuality`).
  `requestVideoFrameCallback` loggas också (`rutor_s`), men stryps när
  videon inte syns.
- **Webm** (om Android inte ger mp4) läses inte av `video/koda.swift`. Den
  behöver konverteras innan den blir ett golden-fall.
- **Hinken** `scans` har ingen update-policy. Varje fil laddas upp en gång,
  och en bit som redan kommit fram räknas som klar vid omförsök.

# Spegelläget mot händelsefacit

Mäter hur väl det digitala bordet följer ett riktigt spel: passets video
genom appens kamerakedja, telefonens bord genom datorns avstämning, och
resultatet jämfört med händelsefacit rad för rad. Ett **mått**, inget prov:
ingen baslinje, slutkod 0 vad siffrorna än blir. Ändrar ingenting i appen.

| Steg | Kommando | Gör | Tid |
|---|---|---|---|
| 1 | `node dev/spegelfacit/kor.cjs` | kör `kamera.mp4` genom kedjan som golden kör sina videofall (`dev/golden/kor.html`, huvudlös Chrome, en ruta i taget med videons klocka) och sparar telefonens bordslogg i `dev/material/inspelningar/<pass>/spegel-lokal.json` | ~25 min |
| 2 | `node dev/spegelfacit/jamfor.cjs` | spelar upp loggen genom datorns riktiga `avstamBord`, loggar det digitala bordet över tid och jämför med `handelser.tsv` | sekunder |

Flaggor:

| Flagga | Steg | Gör |
|---|---|---|
| `--ai` | 1 | med Claude (kostar; sparas som `spegel-ai.json`) — jämför sedan med `--korning dev/material/inspelningar/<pass>/spegel-ai.json` |
| `--pass <mapp>` | 1, 2 | ett annat pass (förval `2026-09-22-1x-34cm-normaltempo`); graveyard- och library-rutorna står i `ZONER` i `kor.cjs` |
| `--port 8263` | 1 | attrappens port. Poolen sparas i Chrome-profilen **per port**: byt inte i onödan, första körningen på en ny port hämtar leken från Scryfall |
| `--md fil`, `--tsv fil`, `--json fil` | 2 | rapporten som markdown; det digitala bordets tidslinje (en rad per ändring); allt |
| `--fore 2 --efter 10` | 2 | fönstret runt facits tid, i sekunder |
| `--utan-lek` | 2 | utan lekens antal (då kan inget kort lyftas ur graveyard) |
| `--logg fil` | 2 | en bordslogg sparad ur appen i ett riktigt pass ("Spara bordsloggen") i stället för steg 1 |

## Vad som räknas

Se huvudet i `jamfor.cjs`. Kort:

- **Syntes** — något på det digitala bordet svarade mot raden inom fönstret.
  Varje kort och varje ändring svarar för högst en rad.
- **Flytt** räknas bara när **samma** kort bytt plats. Ett kort som tonas ned
  och ett nytt med samma namn är "borta + nytt".
- **drar**, **grav_till_hand**, **grav_exile**, **grav_ur_bild** syns inte på
  mattan. De mäts som "library respektive graveyard minskar med ett". Appen
  räknar library som *hand och library ihop*, så ett drag kan aldrig synas
  där; telefonens egen signal (leken lyft ur sin ruta, högvaktens räknare)
  står bredvid.
- **Fäst digitalt** — kortets `attachedTo`. Kameran sätter det aldrig i dag,
  så kolumnen visar ett hål, inte en regel som slagit fel. *Rätt plats*
  mäter i stället om korten ligger ihop på mattan.

## Fällor

- Läs raden `Poolen:` — 114 kort. `kor.cjs` laddar om och väntar tills
  poolen är hel.
- Videon är en skärminspelning av Mesas kameravy, så appens egna rutor syns i
  bilden (som i golden-fallen 09–12).
- Uppspelningen har grundläget 90° (kortet otappat = lodrätt) och lekens
  antal ur `dev/golden/lek.txt`, som appen hade dem i passet.

# Nattpasset 2026-09-25: rapporten

Passet började 00:33 och kördes klart autonomt på Jespers begäran (07:26). Det
slutade 12:20. Instruktionen: `dev/plan/orkestrering-natt-2026-09-25.md`.
Loggen steg för steg: `dev/plan/natt-2026-09-25-logg.md`.

## Kort sagt

| | Antal | Vilka |
|---|---|---|
| Ute i produktionen | 5 | steg 0 (facit), MES-293, MES-291, MES-289, MES-294 |
| Besvarade utredningar | 2 | MES-287 (nej som ersättare för ORB), MES-288 steg 0 (ja, färdiga detektorer hittar nästan alla kort) |
| Byggda men inte ihopslagna | 2 | MES-232 (nya fel namn i andra ljus), MES-295 (ingen mätbar effekt) |
| Nya fel namn i produktionen | 0 | |

**Tre fynd väger tyngst:**

1. **En färdig detektor (OWLv2) hittar 62 av 66 kort** på dina ritade foton, mot dagens 29. Ytterligare en slutsats följer av det: upplösningen avgör. Dagens detektor ser 360 px, och en liten modell går från 40 till 58 kort när den får 1280 px i stället för 640.
2. **Lärda referenser ger fel namn i produktionen i dag:** 6 i sju ljus, mot 0 utan dem (MES-232).
3. **Tap-regeln från MES-293 fäller vridna kort på måtten**, inte på vinkeln. Pharika's Chosen ligger 71°, alltså inom 20°, men måttkollen jämför en rak låda med ett vridet kort. Rättelsen är liten.

## Klart och i produktionen

| Issue | Vad | Commit | Före → efter |
|---|---|---|---|
| MES-286, steg 0 (Provas, videorna kvar) | Dina ritade facit för golden 03–06 och 13–15, ny baslinje | afa24cb | hittade 64/93 → 64/97 · plats 10/10 → **40/76** · namn 50/93 → 49/97 · **fel namn 0 → 1** (MES-296) · falska 6 → 3 · tap 10/10 → **37/40**. Samma kamerakod; bara facit skiljer |
| MES-293 (Provas) | Tap-läget ändras bara vid tydlig dom; skalan fryst efter uppstarten | 4f11291 | Tap-domar som vände tillbaka **11 → 1**, falska vridningar **4 → 2**, skalan bytt **15 → 1** gång; golden tap 37 → **38/40**; 0 nya fel namn i sju ljus |
| MES-291 (Done) | Ett tappat kort väntar 5 s innan nedtoning; graveyard-högen avbryter | ab2580b | Flyttar via nedtoning **4 → 0**, nedtoningar **17 → 10**; längsta tid innan en borttagning syns 3,0 → 6,3 s (accepterat pris); rättat efter oberoende granskning |
| MES-289 (Provas) | Lekfotot tappar inga kort tyst: namnlösa blir platshållare under To check; den för höga totalen (ett förlorat svar lade in fotot två gånger) rättad | e49bdce | Provet 4/6 → **6/6** kort in i leken; ett helt oläsligt foto ger felet som förut; tre dubblettvägar kvar, också på main; rättat efter oberoende granskning |
| MES-294 (Done) | Granskningens spärr jämför med namnet posten visar (din regel 1) | 264bc9a | **Ingen mätbar effekt:** telefonen ger redan osäkra kort listans etta. Av 7 dubbletter var 4 flyttade kort på en annan plats |
| MES-288 steg 0 (Provas) | Nollprov: färdiga detektorer mot dina ritade facit | 2765480 (bara utredningen) | Dagens 29/66 · **OWLv2 62/66** (0 falska, 11 av 15 högar, 11,5 s/bild) · YOLO-World s **58/66 på 1280 px** (0,6 s) · Grounding DINO 57 · MobileSAM 42 |

Alla ihopslagningar hade `kolla.sh` grönt. Golden var inte sämre och gav 0 nya fel namn, också i sju ljus och med `--utan-leken`. Produktionen var identisk med filen efter varje push.

## Inte ihopslaget

| Issue | Varför | Gren på GitHub |
|---|---|---|
| MES-232 (Provas) | Stödregeln var bättre i vanligt ljus men gav **3 nya fel namn** i sju ljus (alla basländer) | `mes-232-larda-stod` |
| MES-287 (Done) | Svaret är leveransen: **ersätter inte ORB**, men kan komplettera den med en skalspärr som inte är byggd. Koden byggde poolens gråbilder även med växeln av, så den skulle ha kostat på telefonen utan att ge något | `mes-287-rak` |
| MES-295 (Provas) | **Ingen mätbar effekt:** kameran ser borden rakt uppifrån. I partiet 09-21 kunde ändringen ha gjort det sämre | `mes-295-grundlage-per-plats` |

## Väntar på Jesper

| Issue | Vad som behövs |
|---|---|
| **MES-232** | **Hur ska lärda referenser användas?** I dag ger de 6 fel namn i sju ljus. A: stäng av dem tills en variant klarar sju ljus (redan mätt säkert). B: ut ur bildmodellen men kvar för ORB. C: stödregeln utan basländer. D: behåll |
| **MES-288** | **Hyra en GPU (uppskattat 10–40 dollar) för att träna en egen detektor?** OWLv2 kan märka upp riktiga rutor gratis på Macen. En liten Apache-licensierad modell (inte Ultralytics, som är AGPL) på ~1000 px beräknas ta 0,1–0,2 s på telefonen |
| **MES-293** | **Ett parti med telefonen** (v2-mätningen kräver en telefoninspelning). 20°-frågan är ersatt: felet sitter i måttkollen, se nästa steg |
| **MES-295** | Ska grenen ligga kvar eller läggas ned? Nyttan är omätt, och de riktiga orsakerna till missade tappningar är andra (måttkollen, kort vridna ~60°, högar) |
| **MES-289** | **Ett lekfoto** där korten försvann (beskrivet i issuen). **Ladda om öppna flikar och telefonen**: en flik som laddades före driftsättningen gör en platshållare till en vanlig rad. Titta gärna på raden under To check ("Which card is this?") |
| MES-296 | Avgjort: högen i fall 14 räknas som **fel namn**. Kvar är en rättelse i läsningen (Backlog) |
| MES-286 | Videorna i ritverktyget |
| MES-291 | Inte blockerande: i Table leads går det inte att dra ett kort under väntan, som ett nedtonat kort förut |

## Nästa steg för att hitta fler kort (förslag)

| # | Vad | Varför |
|---|---|---|
| 1 | **Rätta måttkollen i `tapTydlig`** så att den jämför den vridna rektangeln med kortets mått | Slarvigt tappade kort (60–75°) speglas inte i dag; det fäller Pharika och Fencing Ace. Liten ändring, mätbar i golden och spegelfacit |
| 2 | **Pröva högre analysupplösning i dagens detektor** (analysbredden, MES-244/274) | Nollprovet visar att upplösningen avgör. Dagens detektor ser 360 px. Billigt att mäta i golden, ingen träning |
| 3 | **MES-288 steg 1–2:** OWLv2 som lärare och en egen liten detektor | Upp till 62 av 66 kort i stället för 29, också på ribbor och svart matta |
| 4 | **MES-296:** namnraden ska inte ge ett säkert namn när bildmodellen säger ett annat kort | Det enda fel namnet i golden |
| 5 | **MES-232 val C**, mätt i sju ljus, sedan MES-290 (lekens egna foton som referenser) | Lärda foton gav +21 rätt namn i sju ljus med stödregeln. Felen gällde bara basländer |
| 6 | Kortet under i en hög med bara en kant framme | Ingen modell klarar det. Det kräver högens historik (MES-233) eller syntetiska högar i träningen |

## Att veta om mätningen

* **Baslinjen `senaste.json` är från afa24cb.** Main ger i dag tappad 38/40 (MES-293), filen säger 37/40. Den bör sparas om vid nästa golden-körning (`--spara`).
* **Poolen kan bli ofullständig utan att golden säger ifrån.** Scryfall 429 skrev en pool på 29 eller 61 kort (i stället för 114) till profilen tre gånger i natt. Nästa körning i samma profil läste bara tillbaka den. Agenterna märkte det på raden "Poolen". Golden borde vägra köra på en halv pool, som i MES-260.
* **`pgrep -f kor.cjs` kan ljuga åt båda hållen.** Den träffade en annan agents sovande skal vars kommandorad innehöll ordet. En låsfil vore säkrare.
* **Två agenter delar en golden-kö dåligt.** En agent som kör direkt efter varandra stänger ute den andra i timmar; det hände i natt. Luckan på en minut mellan körningar hjälpte.
* **Modellerna för nollprovet** (OWLv2 m.fl., venv och vikter) ligger kvar i worktreen `.claude/worktrees/agent-a48fd23ee4fabc982/`, utanför git, om steg 1 ska använda dem.

# Lekfotots golden set — snabbguide

Lekfotot är när spelaren lägger ut sin lek på bordet och fotograferar den med
telefonen, och Mesa gör leken av fotona. Det här provet mäter **hela den
kedjan** mot ett facit, med riktig Claude:

| Steg | Vad som körs | Var |
|---|---|---|
| 1. Beskärningen | telefonens kod: filväljarens väg eller kamerans ram, sedan `lekKallDuk` och `lekB64` (högst 2 MP, 2400 px, JPEG 0,85) | huvudlös Chrome |
| 2. Avläsningen | `api/identify.js` i läget `lek` — samma handler som i produktionen | Node, riktiga anrop |
| 3. Namnen | appens `lookup` mot Scryfall (luddig sökning) | Node |
| 4. Leken | `telfotoLas` + `lekSparaKo`: kort, platshållare och To check, som på telefonen | Node |
| 5. Setet | fotona spelas upp i ordning på en tom lek — Photo 1, Photo 2 … | Node |

Koden klipps ut ur `index.html` vid varje körning (som `dev/lekfoto.cjs` gör),
så provet mäter det som faktiskt ligger i appen — inte en omskrivning.

## Materialet

Fotona ligger i `dev/material/foton/2026-09-26-lekfoto/` (gitignorerat — i en
worktree: symlänka `dev/material` och `.env.local` från huvudträdet):

| Fil | Vad |
|---|---|
| `foto-05.jpg` … `foto-19.jpg` | samma 40-kortslek (`dev/golden/lek.txt`) i olika ljus, vridning och antal kort per bild |
| `facit.json` | grupperna (kolumnerna på bordet), vilka grupper som ligger **helt** i varje foto (`hela`) och vilka som bara syns kapade vid kanten (`kant` — räknas inte), och tio **set**: foton som tillsammans ska ge exakt leken (40 kort, eller 26 utan basland) |
| `svar/` | cachen: Claudes svar per foto och beskärning, och Scryfalls svar |

Facit provas innan något mäts: varje namn ska finnas i `lek.txt`, och varje
set ska ge exakt leken. Stämmer det inte stannar körningen och säger vad.

## Kommandona

Körs från repots rot. Kräver Chrome och `ANTHROPIC_API_KEY` i `.env.local`.

| Kommando | Gör |
|---|---|
| `node dev/lekgolden/kor.cjs` | alla foton, båda beskärningarna. Läser bara det som saknas i cachen |
| `node dev/lekgolden/kor.cjs --detalj` | samma, plus vilka kort som saknas, är extra eller har fel namn — per set och per foto |
| `node dev/lekgolden/kor.cjs --beskarning hela` | bara filväljarens väg (`ram` = bara kamerans ram) |
| `node dev/lekgolden/kor.cjs --foto 09,13` | bara de fotona (och de set som bara består av dem) |
| `node dev/lekgolden/kor.cjs --set S08` | bara de seten |
| `node dev/lekgolden/kor.cjs --las-om 09,13` | läser om fotona med Claude (kostar), fast de finns i cachen. `--las-om alla` läser om allt |
| `node dev/lekgolden/kor.cjs --spridning` | foton som lästs mer än en gång, svar för svar: hur mycket Claude varierar på samma bild |
| `node dev/lekgolden/kor.cjs --bara-cache` | anropar aldrig Claude eller Scryfall — det som saknas hoppas över |
| `node dev/lekgolden/kor.cjs --svar sista` | använd det senaste svaret för varje foto (förval: det första — se *Cachen*) |
| `node dev/lekgolden/kor.cjs --spara` | gör körningen till ny baslinje (`dev/lekgolden/senaste.json`); skriv då en rad i `historik.md` |
| `node dev/lekgolden/kor.cjs --beskarningar /tmp/dukar` | sparar dukarna som skickades till Claude — titta på dem när ett foto blir fel |
| `node dev/lekgolden/kor.cjs --skarm 390x844` | telefonskärmen som kamerans ram räknas på (förval 390×844) |
| `ANTHROPIC_MODEL=claude-sonnet-5 node dev/lekgolden/kor.cjs` | en annan modell — får egna svar i cachen; raden `metod:` visar vilken |

Slutkod 1 om något blev sämre än baslinjen, 2 om körningen inte gick att göra.

## Tabellerna

En tabell per set och en per foto, för varje beskärning, och en summering
sist. `(var N)` efter ett tal är baslinjens tal när det skiljer sig.

| Kolumn | Betyder |
|---|---|
| Facit | kort som ska in: setets 40 (26), eller fotots hela grupper |
| Mesa (spelbara) | kort i leken efteråt, **med** platshållarna — det lekens sida visar. Inom parentes utan dem: `decks.antal`, det spelet räknar med |
| Rätt | per namn: det minsta av facit och Mesa. 40 Plains-rätt kräver 7 Plains, inte 8 |
| Saknas | facit − rätt: kort som inte kom in med rätt namn |
| Extra | fler av ett namn än facit har: en dubblett, eller ett kort ur ett annat foto. Per foto står inom parentes hur många av dem som kommer ur grupper vid **kanten** |
| Fel namn | ett kort som inte finns i leken alls — **ska vara 0**. `(N utan koll)`: av dem, de som inte står under To check och alltså går rakt in i leken — det värsta felet |
| Oläsliga | platshållare (*Unreadable card*): titelraden gick inte att läsa, eller namnet gick inte att slå upp. De står under To check med sin remsa |
| Osäkra | kort med namn under To check: Claude tvekade, eller Scryfall rättade namnet |
| Poster (tomma) | kort i Claudes svar; inom parentes de utan namn |
| Otydl | kort Claude säger att den såg men inte tog med |
| Lampan | telefonens egen dom om duken (`lekDomAv`: ok, smalt, litet, suddigt, blankt). Telefonen visar den bara i kameran, och den räknar med fem kolumner över bilden |
| Svar | vilket av fotots svar i cachen som användes, av hur många |
| Exakt rätt | set där leken blev precis facit: alla kort rätt, inget extra, inga platshållare |

Raden `metod:` säger modell, systemprompt (`PANE_PROMPT_V` och en hash av
lekblocket i `api/identify.js`), vilken beskärningskod och vilken Chrome.
`OBS:` säger när baslinjen gjordes med något annat.

## De två beskärningarna

| | `hela` | `ram` |
|---|---|---|
| Telefonens väg | Filväljaren eller telefonens egen kamera (`#telFil`) | Appens kamera, knappen i mitten (`telfotoKnapp`) |
| Vad som skickas | hela fotot utom 2 % vid varje kant | bara det som ligger innanför ramen på skärmen |
| Hur rutan räknas | fast `{x:.02, y:.02, w:.96, h:.96}` ur koden | `telfotoRamBox` med appens CSS (`.telram`: 18 px från kanterna, 26 % ned, 346:186) på en 390×844-skärm, videon i `object-fit: cover` |

Kamerans väg körs med **fotot i videons ställe**: videon antas ha fotots mått
(4:3 som fotot). Ett liggande foto räknas som taget med telefonen på tvären —
skärmen blir 844×390 och appens CSS för en låg skärm gäller (`top: 22%`). Då
når ramen nedanför skärmens underkant; rutan klipps vid bildens kant.

Fotona i materialet är tagna för hela bilden, inte för ramen. `ram` mäter
alltså vad ramen skär bort om spelaren fotar så — inte hur bra kameran läser
när korten ligger i ramen.

## Cachen och spridningen

Varje foto läses **en gång per beskärning**. Svaret sparas i
`<fotomapp>/svar/<foto>.<beskärning>.<nyckel>.json`. Nyckeln är fotot,
beskärningen, rutan, dukens mått och kvalitet, telefonens beskärningskod,
modellen, `PANE_PROMPT_V` och en hash av hela lekblocket i `api/identify.js`.
Ändras något av det läses fotot om av sig självt — en ändring i
systemprompten ger alltså nya svar utan att någon behöver tänka på cachen.

`--las-om` lägger ett nytt svar i samma fil. Körningen visar det nya svaret
för de omlästa fotona; alla andra körningar använder det **första**, så att
baslinjen står still. `--spridning` visar alla svar sida vid sida.

Scryfalls svar sparas i `svar/scryfall.json`. En körning ur cachen ger
därför samma utskrift varje gång (provat 2026-09-26: två körningar, identisk
utskrift).

**Scryfall spärrar.** Går man över ungefär tio anrop i sekunden svarar
Scryfall 429 i en minut och varnar för att blockera nätet. Appens kö (95 ms
mellan anropen) ligger precis på gränsen, och första körningen fick 429 på 8
av 36 namn — i appen blir det platshållare. Provet går därför högst ett
anrop per 250 ms och väntar ut en spärr innan det försöker igen. Raden
`Scryfall:` säger hur ofta det hände.

## Vad en körning kostar

Uppmätt 2026-09-26 med `claude-opus-5`: 30 läsningar (15 foton × 2
beskärningar) tog **ca 90 000 tokens in och 37 000 ut, ungefär 1,40 dollar**,
och drygt två minuter med fyra anrop åt gången (median 14 s per foto, längst
50 s — helbordet på tvären). En läsning av ett foto: ca 3 000 tokens in och
1 000–3 000 ut. Ur cachen kostar körningen ingenting.

## Vad som inte är troget

| Skillnad mot telefonen | Varför det spelar roll |
|---|---|
| Chrome, inte Safari på en iPhone | samma kod och samma tak, men skalningen och JPEG-kodaren skiljer sig i detaljer |
| Fotona är chattens bilagor (2000×1500 och 1500×1125), inte telefonens 4K | i `hela` får Claude 2 MP av de större (05–08, 15) och bara 1,6 MP av de mindre (09–14, 16–19) — telefonen hade skickat 2 MP |
| Kamerans väg ritar fotot, inte en videoruta | en videoruta är ofta mjukare och mer komprimerad än ett foto |
| Videons mått = fotots | en riktig iPhone-ström är ofta 16:9 — då skär `object-fit: cover` bort mindre på bredden |
| Remsan (bilden av titelraden bredvid To check) görs inte | den är bara till för ögat och påverkar inte leken |
| Ingen databas, inga nätfel, ingen annan enhet som sparar samtidigt | det provas i `dev/lekfoto.cjs` |
| Scryfall hålls under spärren | appen gör det inte — se *Cachen och spridningen* |

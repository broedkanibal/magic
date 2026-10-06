# Uppspelaren (MES-333)

Spelar upp ett inspelat parti genom **appens riktiga kod** — `avstamBord` och
mattan (`matSynk`, FLIP-rörelserna) i `index.html` — och räknar hur mattan
beter sig: hopp, utbytta kort, fel nedtoningar, tid till något syns, tid till
rätt plats, mattans rörelser, platshållare. Visaren visar bilden från bordet
till vänster och mattan till höger, med paus, spola och ruta för ruta.

Den är grinden för spegelmattans issues (MES-341, 338, 342, 343, 344):
`--jamfor` säger rad för rad om något blivit sämre än baslinjen för main.

Ingenting i `index.html`, `api/` eller `dev/golden/*.cjs` ändras. Allt bor här.

## Kör

| Kommando | Gör | Tid |
|---|---|---|
| `node dev/uppspelaren/kor.cjs` | alla sju fallen mot `index.html`, tabellen | ~15 s |
| `node dev/uppspelaren/kor.cjs --fil /tmp/x.html --jamfor` | samma mot en annan `index.html`, rad för rad mot baslinjen. **Slutkod 1 om någon rad är sämre** | ~15 s |
| `node dev/uppspelaren/kor.cjs --jamfor --alla` | jämförelsen med alla rader, också de oförändrade | |
| `node dev/uppspelaren/kor.cjs --fall g09,p0921 --detalj g09` | bara de fallen, och vad som räknades händelse för händelse | några s |
| `node dev/uppspelaren/kor.cjs --spara` | skriver baslinjen (`baslinje/baslinje.json` och `baslinje.md`) — bara när en ändring ska bli den nya baslinjen | |
| `node dev/uppspelaren/kor.cjs --json ut.json` | allt: motorns logg och måtten per fall | |
| `node dev/uppspelaren/kor.cjs --visa --fall g09` | visaren i ett Chrome-fönster | |
| `node dev/uppspelaren/kor.cjs --bilder <mapp> [--vid g12:7.5,g12:7.85]` | skärmdumpar ur visaren, huvudlöst | ~10 s |

Slutkod: 0 = gick (och inget sämre med `--jamfor`), 1 = sämre än baslinjen,
2 = gick inte att köra (Chrome, underlaget saknas, appen laddade inte).
Ett fall som inte går att köra under `--jamfor` räknas som sämre — en grind
som inte vet svarar inte ja.

I en worktree: symlänka `dev/material` (passet 2026-09-22 och bilderna
ligger där), annars faller fallet p0922 med slutkod 2.

## Fallen

| Fall | Vad | Telefonens ström? |
|---|---|---|
| g07, g09, g10, g11, g12 | golden-videofallen. Bordsloggen ur golden-körningen (utan Claude), fryst i `underlag/golden-bordlogg.json.gz` (ur `dev/golden/senaste.json`, commit 5505933) så att baslinjen inte flyttar sig när golden sparas om. Facit: `dev/golden/fall/<id>/facit.json` (`video.handelser`). Video: `dev/golden/fall/<id>/video.mp4` | ja |
| p0922 | passet 2026-09-22. Bordsloggen ur `dev/spegelfacit/kor.cjs` på passets video, körd 2026-10-04 utan Claude (`dev/material/arbete/2026-10-04-hogarna-matning/baslinje/spegel-lokal.json`, 1262 bord). Facit: `dev/golden/inspelningar/2026-09-22-1x-34cm-normaltempo/handelser.tsv`. Ingen video här (Google Drive) — visaren visar kontaktarken, en ruta per sekund | ja |
| p0921 | partiet 2026-09-21, sek 240–540. **Facit, inte telefonen:** v2-facit (`underlag/2026-09-21-v2-tabell.tsv`, kopia av den otrackade filen i huvudträdet) matas in som en idealiserad telefon — ett klart, säkert spår per kort var tionde sekund, kortets mitt ur facit och en låda i den storlek ett kort har där i bilden. Namnen är påhittade ("Kort 01"). Här mäts mattans geometri, inte kamerans fart | **nej** |

Det som saknas: partiet 2026-09-21 genom telefonens kedja. Videon ligger på
Google Drive, och ingen bordslogg finns för partiet. När videon är tillbaka:
`node dev/spegelfacit/kor.cjs --pass 2026-09-21-…` ger bordsloggen, och ett
fall till i `fall.cjs` gör resten.

## Hur uppspelningen går till

`motor.js` laddas i appens sida (huvudlös Chrome, sidan exakt 1400 × 1000 px)
efter att appen startat. Den gör samma uppstart som `dev/mattan.cjs`: ett
spel i Mirror my table, kameran ansluten, ingen inloggning, nätet spärrat.

**Klockan är simulerad.** Medan motorn kör:

- `Date.now()` ger uppspelningens tid.
- Appens `setTimeout`/`setInterval` (nådtimern i `avstamBord`, nya kortets
  omritning efter 2,6 s …) körs när klockan passerar deras tid.
- Varje Web Animation (kortens glid, vridning och lyft, mattans zoom) får sin
  starttid på uppspelningens klocka och ställs på rätt tid före varje steg
  och varje mätning. Den fortsätter att "köra", så appens egen logik för
  avbrutna rörelser (`matKor`, `matNu`, `matFart`) ser det den ser i en
  riktig sida.
- `Math.random` är fröad (kortens cid), och `fetch` svarar aldrig (kortens
  uppslag väntar, som i ett spel där leken redan finns lokalt).

Hela fallet går i ett svep, så inget som tar väggklocka kommer emellan. **Två
körningar på samma `index.html` ger samma tal** — också hela loggen, byte för
byte (provat 2026-10-07).

Varje bord i loggen tas emot som `kamTogsEmot` gör (grundläget och
library-rutan, sedan `avstamBord`). Telefonens hjärtslag härmas: senaste
bordet igen var tredje sekund från första rapporten, som i
`dev/dubbletter.cjs` och `dev/spegelfacit/jamfor.cjs`. Mätpunkterna går en
gång per videoruta (1/15 s), och dessutom före och efter varje steg.

## Måtten

Läget för ett kort är elementets mitt i mattans brädkoordinater plus den
förskjutning en rörelse ger just då (`translate`). Mattans zoom och pan räknas
för sig. **Kortbredd** = `MATTA.CW` = 178 px på brädet. Fönstret runt facits
tid är 2 s före till 10 s efter (som spegelfacit). Facits tid är när rösten
börjar (p0922) eller avläst ur bildrutan (golden, ±0,5 s) — därför kan tider
bli negativa.

| Mått | Exakt | Bättre |
|---|---|---|
| **Hopp utan rörelse** | ett kortelement vars synliga läge ändras mer än 0,1 kortbredd inne i ett steg (före → efter en rapport, ett hjärtslag eller en av appens timrar), alltså utan att någon tid gått | lägre |
| **Snabba hopp** | ett kort som rör sig mer än 1 kortbredd mellan två videorutor (1/15 s) utan att ha hoppat i ett steg emellan. Flera rutor i rad är ett hopp. En flytt på D:s 420 ms längre än ~3 kortbredder räknas | lägre |
| **Utbytta kort** | en flytt i facit som syntes som ett nytt kort, eller ett nytt kortelement med samma namn högst 10 s efter att ett kort med namnet tonades ned eller lämnade mattan *fast det låg kvar* (en fel nedtoning). Plus element som byts ut i DOM:en för samma kort | lägre |
| **Nya kort utan utspel i facit** | ett nytt kortelement som inte svarar mot något utspel i facit (inom fönstret, rätt namn) och inte är utbytt: en dubblett, ett felnamn, eller ett kort som kom tillbaka ur graveyard fast det låg kvar där | lägre |
| **Fel nedtoning eller fel borttagning** | ett kort som tonas ned (`.lyft`) eller lämnar mattan (graveyard, exile, borta) utan att facit har en `tar_bort` för namnet inom fönstret | lägre |
| **Borttagna kort som står kvar** | en `tar_bort` i facit utan att något kort med namnet tonas ned eller lämnar mattan inom fönstret | lägre |
| **Tid till borta** | från facits `tar_bort` till nedtoningen eller till att kortet lämnar mattan (median) | lägre |
| **Utspel som syntes** | utspel (`spelar`, `grav_till_bord`) där något syntes inom fönstret: kortet, eller en platshållare för samma spår | högre |
| **Utspel där kortet kom med namn** | utspel där kortet själv kom (nytt element, eller ett nedtonat som kom tillbaka) | högre |
| **Tid till något syns** | från facits tid till det första som syntes: platshållaren (`.plats`, samma spår som kortet, annars inom 1,5 kortbredder) eller kortet. Median och längst | lägre |
| **Tid till rätt plats** | från facits tid till att kortet ligger där det sedan ligger kvar: inom 0,25 kortbredd från sitt läge 10 s efter (eller före nästa facit-händelse för kortet) och kvar där hela vägen. Ett kort som glider iväg när ett annat kort kommer (skalan räknas om) är inte på plats förrän det slutat. Median och längst | lägre |
| **Flyttar där samma kort glider** | `flyttar` i facit där samma element med namnet får ett nytt viloläge minst 0,5 kortbredd bort, utan nedtoning emellan | högre |
| **Flytt: tid till nya platsen** | från facits `flyttar` till att kortet ligger på den nya platsen (samma regel som rätt plats), också när flytten blev ett nytt kort | lägre |
| **Mattans zoom-/panoreringsändringar per minut** | antal gånger mattans transform (`matBradeSkriv`) ändras, delat med fallets längd. Zoom = skalan ändras; pan = bara förskjutningen | lägre |
| **Zoom eller pan som hoppar** | transformändringar utan glidning | lägre |
| **Platshållare** | platshållare (`.plats`) som syntes, och sekunder de stod på mattan. Ett element som byts (span → button) i samma ögonblick är samma platshållare | lägre |
| **Laddtexter** | chippen "Reading…" och "Moving…" på kort, och platshållare med "Reading the card…" eller "Asking Claude…" | lägre |
| **Kort utanför mattans kant** | kort vars ruta på skärmen (med zoom, pan och rörelse) sticker ut ur mattans fönster (`#gridWrap`), räknat per videoruta: antal kort och kortsekunder | lägre |
| **Avståndsfel** (p0921) | för varje par kort i var tionde sekund: \|avståndet på mattan − avståndet på bordet\| i kortbredder. På bordet: avståndet i bilden delat med kortbredden där korten ligger (98 px i övre raden, 105 px i nedre, uppmätt i rutorna 240 och 450). Median och 90:e percentilen | lägre |
| **Falska omlott** (p0921) | kortpar som täcker varandra till mer än en femtedel på mattan men inte rör varandra på bordet (och inte är samma hög i facit) | lägre |
| **Kort utanför kanten** (p0921) | kort · rutor, 2,5 s efter varje facit-ruta | lägre |
| **Kort i facit som saknas** (p0921) | facit-kort utan ett kort på mattan (ej nedtonat) | lägre |

– betyder att måttet inte går att räkna för fallet (inget facit för det),
aldrig 0. Totalt räknas över fallen med telefonens ström (golden och
p0922): antal summeras, tider ur alla händelser ihop.

**Sämre** i `--jamfor`: antal och tider som blivit större (tider på
hundradelar), kvoter vars täljare blivit mindre, och – där baslinjen hade ett
tal. Bättre rader skrivs också.

## Kontrollräknat för hand (2026-10-07)

Varje mått stämdes av mot underlaget innan det kallades mätt:

| Mått | Ögonblick | Vad jag såg |
|---|---|---|
| Tid till något syns / kortet kom | g09 Plains (facit 4,5 s) | Videon: handen släpper kortet ~4,0 s, fri vid 4,2. Loggen: spår 1 `ny` utan namn i rapporten 4,05 → platshållare 4,05 (−0,45); `klar` Plains 4,2 → kortet 4,2 (−0,3). Facit ligger ~0,5 s efter släppet här |
| Tid till något syns | p0922, alla 14 utspel | Kortets tid är densamma som `dev/spegelfacit/jamfor.cjs` ger på samma logg (Flutterfox +0,49, Pharika +2,13, Mirran +2,10, Trusty +0,73, Ancestral Blade +1,86) — ett annat verktyg, på ett utdrag ur avstämningen |
| Tid till borta, borttagna som står kvar | g07 Fencing Ace 29,5 / Plains 32 | Videon: Fencing Ace borta 30,0, Plains lyfts 31,5–32,5. Mattan tonar ned Fencing Ace 36,15 (+6,65) — samma som `dev/dubbletter.cjs --fall 07`. Plains står kvar till slutet (dubbletter: "c6 Plains (i nåd)" i slutbordet) |
| Nya kort utan utspel | g07 Swamp 31,8 | Videon 32,5–36,2: ett Swamp, som låg under Plains. Mattan skapar ett andra Swamp när Plains lyfts (dubbletter: c4 och c10 Swamp i slutbordet) |
| Utbytta kort, fel nedtoning | p0922 Swamp, facit flyttar 207,02 | Kontaktarket 205–214: det ensamma Swamp till höger flyttas in i högen (208–210). Mattan skapar ett nytt Swamp i högen 210,45 och tonar ned det gamla 216,3. (`jamfor.cjs` kallar raden en flytt, men det är ett annat Swamp som knuffades 0,2 kortbredd) |
| Snabba hopp | p0922 Mirran Bardiche 227,5 | Banan: nedtonat 138,75–227,4 på x 448, binds om och flyger till x 1068 (3,5 kortbredder) på 420 ms: 47, 211, 203, 97 px per ruta → 1,19 kortbredd som mest |
| Hopp utan rörelse | alla fall: 0 | Detektorn provad: samma körning med `matSynk` utan rörelser (`--fil`, `animera = false`) ger 137 hopp och slutkod 1 |
| Tid till rätt plats | g07 Thriving Moor 5,83 s | Banan: kortet ligger 6,2–11,27, flyttas 0,32 kortbredd 11,27–11,47 (när Ukud Cobra blir kort bredvid). Videon 10,5–12,5: handen knuffar kortet lite när Ukud läggs |
| Flyttar som glider | g12 Pharika 40,5 | Videon 38,5–41,5: handen bär kortet åt höger. Mattan glider kortet efter i steg 38,9–41,4 (samma element) |
| Mattans zoomändringar | g12 7,35 / 7,8 / 7,95 | Visaren: "100% fit" med platshållaren vid 7,85, "73% fit" med kortet vid 8,4. Zoomen slår fram och tillbaka när bordet går mellan tomt och ett kort |
| Platshållare | g09: 10 | Loggen: spåren 1–10 är alla utan namn en stund (spår 1: 3,3–4,05, spår 6: 20,1–22,05 …) |
| Laddtexter | g09: 14 | Visarens bild vid 21,0: två "Reading the card…" på mattan |
| Kort utanför kanten | p0921 ruta 240: kort 3, 7, 8 | Visarens bild vid 240,6: Kort 03 skärs av vid högerkanten, 07 och 08 syns inte. Skärmrutorna: 1149, 1293, 1305 px mot fönstrets 1021 |
| Avståndsfel | p0921 ruta 240, kort 1–2 (Serpent Assassin, Danitha) | Facit (18, 28) och (34, 28): 113 px / 98 px = 1,15 kortbredder. Mattan 414 → 606 px: 1,08. Fel 0,07, och de ligger inte omlott på mattan |

## Vad baslinjen säger (main 2026-10-07, a59238e)

Tabellen: [`baslinje/baslinje.md`](baslinje/baslinje.md). Bilder ur visaren:
`baslinje/bilder/`. Det som sticker ut:

- **Korten glider redan** (MES-334 steg 2): 0 hopp utan rörelse i alla fall.
  Det enda snabba hoppet är en flytt på 3,5 kortbredder.
- **Platshållarna och laddtexterna** dominerar: 284 platshållare och 330
  laddtexter i golden och passet (220 i passet ensamt, 700 s på mattan).
- **Passet 2026-09-22:** 9 fel nedtoningar/borttagningar, 6 nya kort som
  inte finns, 3 av 18 flyttar glider (resten syns inte eller blir ett nytt
  kort), och kortet med namn kom i 8 av 14 utspel (de andra 6 bara som
  platshållare).
- **Mattans zoom ritas med förra layoutens mått** när bordet går från tomt
  till ett kort: rutan runt mattan ändras (panelen till höger och tipsraden
  dyker upp) efter att zoomen räknats. I p0921 ligger tre kort utanför kanten
  i 2,6 s vid första bordet, och i g12 slår zoomen 73 % → 100 % → 73 % på
  0,6 s. Det rättar sig först vid nästa omritning som ändrar något.
- **Korten flyttar sig när ett annat kort kommer** (skalan räknas om): tid
  till rätt plats har en lång svans (5,8 s i g07, 6,5 s i p0922).
- **p0921 (facit som ideal telefon):** avståndsfelet är litet (median 0,07,
  p90 0,17 kortbredder) och inga falska omlott. Serpent Assassin ovanpå
  Danitha i ruta 240 uppstod alltså inte i mattans räkning från bild till
  bräde — i inspelningen kom det ur telefonens lådor.

## Gränser

- Korten ritas som namnlappar (nätet är spärrat, ingen kortbild laddas).
- Visaren kör i riktig tid i en iframe; mätningen kör huvudlöst i ett svep.
  Det de visar är samma kod på samma klocka, men visaren kan ligga någon
  ruta efter vid uppspelning i 1×.
- Golden-fallens tider är relativa facits avläsning (±0,5 s).
- Perspektivet i p0921 är uppmätt för hand i två rutor (~7 %). Ett nytt
  facit med kortets storlek per rad gör avståndsfelet skarpare.
- p0921 matas var tionde sekund: där finns inga tider, bara lägen.

## Filer

| Fil | Vad |
|---|---|
| `kor.cjs` | kommandot: fallen, Chrome, måtten, baslinjen, jämförelsen, visaren |
| `motor.js` | motorn i appens sida: klockan, timrarna, animeringarna, loggen |
| `matt.cjs` | måtten ur loggen och facit |
| `fall.cjs` | fallen: bordslogg, facit, bild |
| `chrome.cjs` | filservern och Chrome (som `dev/mattan.cjs`) |
| `visa.html` | visaren |
| `underlag/` | frysta golden-bordsloggar och v2-tabellen för 2026-09-21 |
| `baslinje/` | baslinjen för main: `baslinje.json` (grinden läser den), `baslinje.md`, `bilder/` |

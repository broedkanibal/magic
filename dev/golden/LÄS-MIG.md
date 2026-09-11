# Golden set — riktiga bord med facit

**Ny här?** Börja med [SNABBGUIDE.md](SNABBGUIDE.md): kommandona, hur ett nytt
foto läggs till, och var algoritmen, systemprompten och modellen finns. Den här
filen är referensen.

Riktiga bilder från olika bord och ljus, var och en med ett facit över vilka
kort som ligger var — och sedan fall 07 också **videor**, där kort läggs ut
och plockas bort medan kameran går. `kor.html` kör **hela kamerakedjan** —
detektering, ram, beskärning, igenkänning mot leken — på varje fall och
jämför med facit, så att
en ändring i algoritmen mäts mot verkligheten i stället för att gissas.
Bänken (`node dev/kamerabank.cjs`) provar syntetiska ytor och rörelse; det här
provar det bänken inte kan: ett riktigt bord, en riktig lampa, riktiga kort.

Mappen följer med koden. Den är **inte** gitignorerad, till skillnad från
`dev/bilder/`, `dev/diagnos/` och `dev/videos/`.

```
dev/golden/
  LÄS-MIG.md         den här filen
  lek.txt            leken kedjan känner igen mot — ett kortnamn per rad
  markera.html       annoteringsverktyget: ritar facit.json i webbläsaren
  kor.html           provkörningen, i webbläsaren
  kor.cjs            samma provkörning från terminalen, i en huvudlös Chrome
  vriden.html/.cjs   skräpfiltret mot kort i vinkel och mot bordet utan kort
  avstand.html/.cjs  avståndsprovet: fotona nerskalade steg för steg — vilket
                     golv i kedjan går först (ett mått, ingen baslinje)
  senaste.json       senaste incheckade körningen — det kor.html jämför med
  historik.md        en rad per incheckad körning: datum, commit, metod, totaler
  video/             verktygen som gör en telefoninspelning till ett videofall
                     (koda.swift, ruta.swift, kontaktark.swift — bara macOS
                      egna delar, ingen ffmpeg)
  fall/
    01-tra-lampa-60cm-3kort/
      bild.jpg
      facit.json
    02-tra-lampa-150cm-4kort/
      bild.jpg
      facit.json
      diagnos.json   (valfritt: telefonens egen referens, brus och trösklar —
                      spelas upp med bänken, se nedan; kor.html läser den inte)
    07-tra-dagsljus-40cm-5kort-rorelse/
      bild.jpg       sista rutan: slutläget, som facit dömer mot
      video.mp4      hela förloppet — ett videofall (facit.video)
      facit.json
    …
```

Ett fall = en mapp. Mappnamnet är fallets id. Att lägga till, byta ut eller ta
bort ett fall rör inget annat: `kor.html` listar `fall/` själv.

## Köra provet

Från terminalen, det som ska köras före varje commit i kameran:

```bash
node dev/golden/kor.cjs
```

Den startar attrappen på en egen port, öppnar `kor.html` i en huvudlös Chrome,
trycker *Kör alla*, skriver tabellen och slutar med kod 1 om något fall blev
sämre än `senaste.json` (färre rätta namn, fler falska eller fler fel namn).
`--spara` skriver resultatet som `senaste.json` (med `--fall` byts bara de
fallen ut), `--detalj` skriver varje spår
med läge, storlek och vad namnläsaren såg, plus delningen per fall: erosionens
*delade*, skärlinjernas *skurna*, kortreferensen (ur säkert namngivna spår) och
varje prövat snitt med dom (`grund`, `grå`, `ljus`, `olika`, `flisa`, `skuren`…).
`--ai` låter kamerans osäkra spår fråga Claude via attrappen, som då kör riktiga
anrop med nyckeln ur `.env.local` (`MESA_AI=1`, kostar pengar: uppmätt 10–15
cent per körning med Opus 5). Metoden blir `lokal+ocr+ai` och modellen står i
fältet `ai`; resultatet jämförs mot och sparas i `senaste-ai.json`, aldrig i
`senaste.json`, så att den lokala baslinjen står kvar för sig.
Med `--ai` kan kameran också be Claude om **hela bilden** (helbilden, MES-28
Del 4): när detektorn inte ser något på bordet eller ytan inte är lugn, så
snart bilden stått stilla tre sekunder — det är så fall 05 (ribborna, noll
regioner) får sina kort. Spåren som föds ur svaret har `varfor: "helbild"`
och `ai.helbild: true`, fallet bär `helbild` (vad Claude såg, tiden, lådans
mått), och `--detalj` skriver raden. Utan `--ai` händer inget av det.
`--fall 03` kör bara fallen vars id börjar så, `--rutor` skriver snittförsöken
ruta för ruta över hela fallet (bara rutorna som skiljer sig från rutan före,
och `(minne)` efter ett snitt som togs ur snittminnet) och en tidslinje över
spåren varje gång något av dem bytte tillstånd, storlek eller skymning — ett
snitt som flimrar, eller ett spår som aldrig blir stilla, syns bara där.
`--beskarningar <mapp>` skriver det kameran faktiskt skickade till igenkänningen,
en jpg per spår (`<fall>-spar<nr>.jpg`, nr = raden i `--detalj`): det är dem
man ska titta på när ett kort blir osäkert. Varje spår i `--detalj` bär domskälet
i hakparentes (`bild`, `bild+namn`, `namn ensamt`, `namn slår land`,
`konflikt`, `osäker`) och namnläsarens rad med remsans läge (`@8%`, `vänd`).
I ett **videofall** skriver `--detalj` dessutom förloppet: varje utspelat och
bortplockat kort med sin tid och när kameran namngav det, och varje spår från
födsel till död i videons sekunder. Första körningen tar en minut extra (poolen och
namnläsarens data hämtas och cachas i en egen Chrome-profil), de följande
inte. Kräver Chrome på Macen (`CHROME=/sökväg` om den ligger någon annanstans).

För att **titta** — bilden med facit och spår, radklick, kameravyn i rutan till
höger — kör i webbläsaren:

```bash
npm run dev
```

Öppna sedan <http://localhost:8232/dev/golden/kor.html> och tryck **Kör alla**.
Vilken statisk server som helst duger (`python3 -m http.server` också), men
attrappen på 8232 listar mappar som JSON och ger CORS; utan det får sidan
gissa ur en HTML-lista. Tidsmåtten i en flik som ligger i bakgrunden är inte
sanna: Chrome stryper den (namnläsaren tog tio sekunder per kort där, mot
0,1–0,4 s i den huvudlösa). Mät i terminalen, titta i webbläsaren.

Det är appen själv som kör, i en ruta till höger: `kor.html` laddar
`index.html` i en iframe och matar in fallets bild som kamerabild. Ingen kopia
av Kamera-modulen, ingen extraktion som kan glida isär från den riktiga. Första
gången byggs igenkänningspoolen ur `lek.txt` (Scryfall-uppslag plus ett
sjuttiotal kortbilder, en halv minut); sedan ligger den i webbläsarens
IndexedDB tills `lek.txt` ändras. Fliken får ligga i bakgrunden medan det kör.

**Vad som mäts, och vad som inte gör det.** Körningen är telefonens kedja
rakt av: datorseende i webbläsaren — mattmodell, ram, beskärning, Matcher och
ORB mot leken, och sedan MES-28 **kortnamnet läst ur titelraden** (tesseract.js,
lokalt i webbläsaren) matchat mot lekens namn. Ingen AI-modell är inblandad,
och det står i sidhuvudet och i varje rad i `senaste.json` (`"metod":
"lokal+ocr"`, eller `"lokal"` om namnläsaren inte gick att hämta, `"ai": null`).
Skulle ett AI-steg någon gång ingå i provet ska fältet bära modellens namn, så
att två körningar aldrig jämförs utan att man vet vad som svarade. Det som
INTE provas här är datorns sida: granskningslistan, AI-hjälpen på osäkra kort
och det som händer på bordet efteråt (datorns avstämning — samma kort som två
spår, nedtonade land, spår som väntar på Claude — provas med
`node dev/avstamning.cjs`). Ett osäkert svar räknas därför inte som igenkänt —
det är där kedjan slutar. Med `--ai` räknas också Claudes "inget kort" som skräp
(`varfor: "ai: inget kort"`). Skräpfiltret (`serUtSomKort`) har sedan MES-29 två
regler till: kortet ska skilja sig från marginalen runt det, och strukturen ska
finnas i minst hälften av 4×5 celler i kortets insida; bildpunkter utanför
videon räknas inte. Ett kort som ligger snett mäts i spårets vridna rektangel,
inte i beskärningens raka låda (beskar skickar den med). Det provas för sig:

```bash
node dev/golden/vriden.cjs
```

klistrar in facitkorten ur fall 02 i 0–60° på bordet (fall 01:s kort får
bara plats raka) och dömer dem med appens egen `serUtSomKort`, dels direkt,
dels genom hela kameran (detektorns egen vinkel och låda). Raka kort mäts
också i en rektangel som med flit är 5–25° fel vriden, som när detektorns
vinkel brusar. Mot dem står kortstora bitar av borden utan kort, inne på
bordet och mot bildens kant (vridna på 02–06). Slutkod 1 om ett vridet kort
blir skräp, en vriden bit av bordet godkänns eller en vinkel inte fick ett
enda mätt kort. Raka bitar som godkänns står i
tabellen men fäller inte körningen: där mäter appen som förut, och det provar
`kor.cjs` (i 04–06 är de skålen, bordskanten mot golvet och ribborna).
Ett fall som varken har rutor i facit eller spår i `senaste-ai.json` hoppas
över, och det skrivs ut: utan att veta var korten ligger skulle sidan mäta
mattans nivå över dem och klippa "bitar av bordet" mitt i ett kort. Fall 07
är ett sådant i dag.

**Avståndet** mäts för sig, som ett mått utan dom:

```bash
node dev/golden/avstand.cjs [--fall 01,02] [--faktorer 1,0.5] [--json fil]
```

`avstand.html` laddar `kor.html` i en iframe — som gör allt den brukar: listar
fallen, laddar appen, bygger poolen, hämtar namnläsaren — och lånar sedan
dess egna funktioner (`stallUpp`, `korStillFall`, `bedom`) för att köra varje
stillbildsfall nerskalat med faktorerna 1, 0,8, 0,65, 0,5, 0,4 och 0,3:
samma bord, samma kort, bara längre bort. Bilden skalas med hög kvalitet i en
canvas som sedan är "videon", och varje faktor är en egen `Kamera.start`/
`stopp`, precis som ett fall i kor.html; klart-villkoret och taket på 30 s är
kor.html:s. Ingen rad av kedjedrivningen är kopierad, så måttet är alltid
kor.html:s. Utan Claude. Videofallen körs inte — de har inget stillbildsläge
att skala.

Per fall och faktor står kortsidan i videopixlar (facits rutor i 01–02;
annars telefonens egen kortreferens ur säkert namngivna spår, annars ett
annat faktorsteg i samma fall omskalat, märkt ≈, och sist spårens median,
märkt spår?), rätt namn, fel namn, falska,
och **telefonens egna skäl** — avlästa medan fallet kör, eftersom `stopp()`
tömmer spåren:

| Golv | I `index.html` | Läses som |
|---|---|---|
| långt bort | `KORT_MIN_PX` 150: medianen av spårens kortsida i videopixlar, `forLangtBort()` | `K.rad` börjar med "Korten är små i bilden" |
| liten | kortformade regioner under 0,6 × 150 = 90 px kastas i `detektera` innan de blir spår | `dia.smaKort` (sista rutan / störst under fallet / `K.sma`, medianen över sex rutor) |
| namnläsaren hoppar | `MIN_KALLHOJD` 20 px: titelraden i beskärningen för låg att läsas — ~235 px beskärningshöjd, ~145 px kortsida | spår med `namnLast.hoppad = 'liten'`, mot antalet som identifierades |
| beskärningen kapas | `BESKAR_BREDD` 720: beskärningen krymps — börjar vid ~620 px kortsida (8 % marginal) | bredden på beskärningarna kameran skickade (kor.html sparar dem per spår) |

Raden bär också detekterans **avslag i sista rutan**, i den ordning de
prövas — damm, blänk, kvot, otät, slät, liten — så att man ser *vad* som tog
korten när de blev små: 'liten' prövas sist, och ett litet kort kan lika
gärna ha fallit på slätheten före. Sist står, per golv, den största faktorn
där det slog till och i vilka fall, plus när det första rätta namnet
tappades mot faktor 1 och när inga namn alls blev rätt. Slutkod 0 efter en genomförd mätning oavsett siffror
(2 bara om körningen inte gick att genomföra, eller om poolen är
ofullständig — då mäts leken, inte kameran). Profilen är en egen
(`mesa-avstand-profil`), så kor.cjs kan köra samtidigt; första körningen
bygger poolen. Poolen cachas per port (appens IndexedDB), så byt inte
`--port` mellan körningar om du vill slippa bygga om den.

**Skalan mot telefonen.** Fallens bilder är 1080 px breda (fall 04: 1440) och
telefonen ger sedan MES-30 3840 px. Faktor 1 motsvarar därför telefonen på
ungefär 3,5 gånger avståndet i fallets namn (3840/1080 = 3,6), och faktor
0,3 nästan tolv gånger: kortsidan som är ~380 px i fall 01 här är ~1350 px på
telefonen, långt över alla golv. Provet mäter alltså längre bort än telefonen
någonsin sitter, med flit — det är golvens *ordning* och kortsidan i pixlar
där de faller som är svaret, inte en centimetersiffra. Vill man veta hur
det ser ut på telefonens avstånd är det fotona som ska tas om i 3840 px.

Namnläsaren körs bara när titelraden är hög nog att läsas (remsan minst 20 px
hög i källbilden, `MIN_KALLHOJD` i `index.html`; golvet låg på 40 tills fotona i
03–06 visade att skärpan avgör mer än höjden) och
läses i `senaste.json` per spår som `ocr: { text, namn, poang, marginal, ms,
hoppad }`. Ett kort är säkert när bild och namn håller med, eller när ett av
dem är starkt nog att stå för sig — men aldrig när de är säkra på var sitt
kort; då går det till granskningen med båda överst. Ett basland blir aldrig
säkert på bilden ensam när läsaren tydligt läst ett annat namn.

**Kolumnerna, per fall:**

| | |
|---|---|
| **Hittade** | spår som inte är skräp, mot antal synliga kort i facit (dolda räknas inte) |
| **Rätt plats** | spår som täcker ett facitkort (IoU ≥ 0,3), mot facitkort med ruta. `–` när facit bara har namn |
| **Rätt namn** | facitkort som fått rätt namn **med säkert svar**, mot synliga kort i facit. Inom parentes: rätt namn men osäkert — det går till granskningen och räknas inte som igenkänt — och hur många av de rätta som namnläsaren också läste rätt (*via namn*) |
| **Fel namn** | säkert svar med fel namn — på rätt plats, eller på ett falskt spår. Det värsta som kan hända: kortet hamnar på bordet utan att någon frågas |
| **Falska** | spår som inte motsvarar något facitkort. Inom parentes: spår vid rutans kant som facit ursäktar som avskurna, och dolda kort som ändå hittats |
| **Förlopp** | bara videofall: utspelade kort som fick ett säkert rätt namn någon gång under videon, bortplockade kort som inte ligger kvar på bordet i slutet, och hur många av utspelen kameran såg i rätt ordning. `–` för ett foto |
| **ms** | analyssteget i millisekunder, medianen över körningen, med den dyraste rutan inom parentes, och namnläsarens median per kort (*ocr*). Mätt i den här datorns webbläsare — säger inget om telefonen |
| **mätt** | mattans brus σ, tröskeln, avvikelsen (`utseende`) och ytans dom |

Klicka på en rad för att se bilden med facit (grönt) och spåren (blått känt,
gult läses, rött okänt, grått skräp, streckat skymt).

**Jämförelsen.** Finns `senaste.json` visar tabellen skillnaden mot den med
▲▼ efter varje tal; grönt är bättre (för *hittade* betyder det närmare facit,
inte fler). **Kopiera resultat** ger en JSON-array med en rad per fall — fall
som inte körts i omgången tas ur `senaste.json`, och statusraden säger hur
många. Spara den som `dev/golden/senaste.json`, lägg en rad i `historik.md`
(datum, commit, metod, totalerna ur sista raden, vad som ändrats) och checka
in båda tillsammans med ändringen. Så syns en försämring nästa gång i stället
för att behöva upptäckas, och effekten av varje ändring går att läsa i
efterhand. Ingen ändring i kameran ska försämra ett fall utan att det står i
commit-meddelandet.

En rad som slagit i taket (30 s) märks `⏱ tak`, en rad där appens loop kastat
`✗ krasch`, och en rad körd mot en ofullständig pool `⚠ pool`. Ett ⚠ efter
fallets namn betyder att något facitnamn saknas i poolen — då mäter raden
leken, inte kameran.

Sigma är 0 på en stillbild — det finns inget brus mellan rutorna — så
tröskeln går till sitt golv (10). På ett slätt bord spelar det ingen roll
(masken kommer ur mattmodellen), på en tryckt matta gör det det. Det är en
känd skillnad mot telefonen. En `diagnos.json` från telefonen (*Spara
diagnos*) bär det riktiga bruset och trösklarna och spelas upp med bänken,
inte med `kor.html`:

```bash
node dev/kamerabank.cjs --diagnos dev/golden/fall/<id>/diagnos.json --vantat 3
```

`--scen dimmat` (eller `inverterad`, `kontrast`, `starkt`) ändrar
ljussättningen på samma fil — det är så tabellen i MES-28 togs fram — och
`--vantat` gör det till ett prov med slutkod.

## Lägga till ett fall

Steg för steg står i [SNABBGUIDE.md](SNABBGUIDE.md), under *Lägga till ett nytt
foto* och *Lägga till en video*. Här är detaljerna bakom.

1. **Fotografera.** Telefonen i hållaren rakt över bordet, som när man
   spelar. Stillbild med kameraappen eller en ruta ur en video — lägg in den
   utvalda rutan som JPEG, inte telefonens egen videofil (den är tiotals
   megabyte och hör hemma i det gitignorerade `dev/videos/`). Ska fallet
   vara ett *videofall* går videon in i mappen, men klippt och omkodad till
   några megabyte — se *facit.json för ett videofall* längre ner.
   Skala bilden till högst 1080 px bred, kvalitet ~80, så blir den 150–250 kB.
   Detekteringen kör på 360 px och beskärningen behöver 250–400 px kortsida,
   så det räcker. På en Mac:

   ```bash
   sips --resampleWidth 1080 -s format jpeg -s formatOptions 80 IMG_1234.jpg --out bild.jpg
   ```

2. **Döp mappen** `NN-<yta>-<ljus>-<avstånd>-<antal>kort[-<variant>]`. Namnet
   är bara en etikett så att man ser vad fallet provar; inget i provet läser
   det, och avståndet räcker som gissning:
   - `NN` löpnummer, så att ordningen är stabil
   - `<yta>`: `tra`, `vitmatta`, `svartmatta`, `tryckt`, `glansig`, `duk`
   - `<ljus>`: `lampa`, `dagsljus`, `morkt`, `motljus`, `blandat`
   - `<avstånd>`: `40cm`, `60cm`, `100cm`, `150cm`
   - `<antal>kort`: facit i namnet, så att fel syns direkt i en fillista
   - `<variant>` valfritt: `tappade`, `overlapp`, `hand`, `rorelse`

   Exempel: `03-vitmatta-dagsljus-100cm-4kort`, `08-tryckt-lampa-60cm-3kort-hand`.

3. **Skriv facit.** En **namnlista** räcker: `kort` med bara `namn` per post,
   ett kort per rad, också dubbletter — så lades fall 03–06 till. Då provas
   namnen men inte platsen (kolumnen Plats visar `–`). Ett kort som ligger
   under ett annat så att bara en kant syns får `"dold": true`.

   Vill du också prova var korten ligger kan du rita
   rutor — frivilligt, och det går att göra senare. Kör `npm run dev`, öppna
   <http://localhost:8232/dev/golden/markera.html>, släpp in bilden, dra en
   ruta runt varje kort, skriv namnet (autokomplettering ur `lek.txt`),
   *avskuret* för kort som skärs av kanten och
   *dold* för kort under ett annat, och tryck **Kopiera facit.json**.
   markera.html läser också en namnlista och låter dig rita ruta för ruta.
   Kryssa *tappad* för liggande kort, så provas tap-läget också.

4. **Kontrollera leken.** Varje kortnamn i facit måste finnas i `lek.txt` —
   annars kan kedjan inte känna igen kortet, och provet mäter leken i stället
   för kameran. Lägg till namnet om det saknas; poolen byggs om av sig själv.

5. **Kör fallet och spara det.** `node dev/golden/kor.cjs --fall 08 --detalj`
   visar raden; sedan `node dev/golden/kor.cjs --fall 08 --spara` (och
   `--ai --fall 08 --spara` för Claude-baslinjen — med `--fall` byts bara det
   fallet), en rad i `historik.md`, och mappen och baslinjerna i samma commit.
   `kor.html` behövs inte: det är samma prov i webbläsaren, för den som vill
   se bilden med spåren.

   **Diagnosfil — valfritt.** Bara om du tryckt *Spara diagnos* på telefonen
   i samma läge: lägg filen som `diagnos.json` i mappen, så bär den
   telefonens egen referens, brus och trösklar. Utan den fungerar allt.

### facit.json

```json
{
  "id": "03-vitmatta-dagsljus-100cm-4kort",
  "yta": "vit spelmatta, tyg",
  "ljus": "dagsljus från fönster till vänster",
  "telefon": "iPhone 15 Pro",
  "hojd_cm": 100,
  "ruta": { "x": 0, "y": 0, "w": 1, "h": 1, "upp": "v" },
  "kort": [
    { "namn": "Valkyrie's Sword", "x": 0.18, "y": 0.44, "w": 0.20, "h": 0.28, "tappad": false },
    { "namn": "Plains",           "x": 0.62, "y": 0.44, "w": 0.20, "h": 0.28, "tappad": true }
  ],
  "avskurna": ["Thriving Heath"],
  "anteckning": "kortet längst till höger skärs av bildkanten"
}
```

- Koordinaterna är **andelar av hela bilden**, inte pixlar — då överlever
  facit att bilden skalas om eller att analysbredden ändras.
- `ruta` används inte längre till beskärning — sedan MES-29 läser kameran hela
  bilden, och kor.html räknar om spåren genom modulens egen ruta (`K.ruta`),
  inte facits. Bara `ruta.upp` läses: `"v"` när ett otappat kort står lodrätt i
  bilden (telefon i porträtt rakt över bordet), `"h"` när det ligger vågrätt.
  Rutläget i markera.html behövs inte för nya fall.
- `avskurna` listar kort som syns men skärs av kanten. De räknas inte som
  missar; i dag spåras de medvetet inte.
- `tappad` gör att tap-läget provas, inte bara namnen. Kameran läser tappat
  mot ett grundläge spelaren bekräftar i spelet; i provet är grundläget
  `ruta.upp` (stående eller liggande otappat).
- `dold: true` på ett kort betyder att det ligger under ett annat så att bara
  en kant syns. Det räknas inte i nämnaren — ingen kamera ser det — men
  hittas det ändå räknas det inte som falskt.
- En post får ha bara `namn`. Då provas namnet men inte platsen.

### facit.json för ett videofall

Ett fall med `video` i facit är ett **förlopp**: kort läggs ut, flyttas och
plockas bort medan kameran går. `kort` är fortfarande **slutläget** — det som
ligger kvar när videon tar slut, och det bild.jpg (sista rutan) visar — så
alla kolumner utom Förlopp betyder exakt samma sak som för ett foto.

```json
{
  "ruta": { "upp": "h" },
  "kort": [ { "namn": "Ukud Cobra" }, { "namn": "Swamp" } ],
  "video": {
    "fil": "video.mp4",
    "takt_ms": 150,
    "svans_s": 8,
    "handelser": [
      { "t": 5.5, "spelar": "Thriving Moor" },
      { "t": 29.5, "tar_bort": "Fencing Ace" }
    ]
  }
}
```

- `fil` ligger i fallets egen mapp och checkas in (till skillnad från
  originalinspelningen, som hör hemma i det gitignorerade `dev/videos/`).
- `takt_ms` är hur tätt rutorna matas in i modulen. 150 är appens egen takt;
  lägre än så hoppar modulen över rutor och mäter inget mer.
- `svans_s` är hur många sekunder kameran får på **sista rutan** efter att
  videon tagit slut, innan fallet döms — ett kort som lades ut i sista
  sekunden ska hinna bli namngivet. Det är också fallets tidsgräns:
  videons längd + `svans_s`, räknat i videotid.
- `handelser` är avlästa ur bildrutorna (`video/kontaktark.swift`): `t` i
  sekunder in i videon, `spelar` för ett kort som läggs ut och `tar_bort`
  för ett som plockas bort. En halv sekund fel gör ingen skada — en
  namngivning räknas som svar på utspelet om den kom tidigast två sekunder
  före den avlästa tiden.
- Varje namn, också de som bara syns en stund, måste finnas i `lek.txt`.

**Så körs en video.** Provet spelar inte upp den. Det söker fram ruta k ×
`takt_ms`, ritar av den i canvasattrappen, flyttar fram appens klocka ett
takt-steg och kör ETT analyssteg — och väntar sedan in identifieringarna
innan nästa ruta. Appens `performance.now()` är videons tid under fallet
(och sätts tillbaka efteråt), så en igenkänning som tar 300 ms flyttar inte
bordet 300 ms framåt: två körningar på samma fil ger samma svar, spår för
spår. Efter sista rutan matas samma ruta vidare tills fallet är klart på
samma villkor som ett foto (alla spår har svar, ingenting har ändrat sig på
1,5 s) eller taket ovan slår till.

**Förloppets tal** (`videoLagda`, `videoBorta`, `videoOrdning`,
`videoFordrojning`, `videoFelUnder` i `senaste.json`): utspelade kort som
något spår bar som säkert rätt namn någon gång, bortplockade kort som inte
ligger kvar på bordet i slutet, längsta växande delföljd av
namngivningstiderna mot facits ordning, mediantiden från utspel till säkert
namn, och säkra namn på kort som aldrig var i partiet. `--detalj` skriver
dem kort för kort, och varje spår från födsel till död i videons sekunder;
`senaste.json` bär dessutom hela loggen (`videoSpar`) och varje bord datorn
fick (`bordLogg`).

## Fallen som finns, och de som saknas

Fall 01–02 är byggda ur en skärminspelning av telefonen
(`video_scan_table.MP4`, 12 och 15 sekunder in): bilden är kalibreringsrutans
insida, så appens egna gula spårrutor är inbakade i bilden. Samma träbord,
samma kväll, samma lampa; facit har rutor.

Fall 03–06 är Jespers foton ur kameraappen (2026-09-09): det mörka träbordet
i lampljus, ett ljust furubord i dagsljus, ett ribbat utebord med mörka
springor, och en ljusgrå yta med en skål i bild. Facit är namnlistor — rutor
kan ritas i markera.html — och i alla fyra ligger kort omlott eller staplade:
kort kant i kant är den kända gränsen (två kort blir ett), och ett kort under
ett annat är `dold`. Att facit listar alla kort på bordet, också de som
ligger under andra, är rätt: det är så bordet ser ut. Men ingen kamera ser
ett kort som bara visar en kant, och därför räknas de dolda för sig.

Fall 07 är det första **videofallet** (2026-09-10): en skärminspelning av
Mesas kameravy på ett träbord i dagsljus, 37 sekunder, där sju kort läggs ut
ett i taget och två av dem plockas bort igen. Bordet är tomt de första fyra
sekunderna, en hand är i bild vid varje utspel, och appens egna spårrutor är
inbakade i bilden som i 01–02. `bild.jpg` är sista rutan och facit `kort` de
fem kort som ligger kvar då; `video.handelser` bär förloppet. Uppmätt lokalt
utan Claude: 2 av 7 utspelade kort hann få ett säkert namn, 1 av 2
bortplockade försvann ur bordet, 6 spår mot 5 kort i slutet. Det är sämre än
fotona, och det ska det vara — en hand i bild, kort som skjuts in bredvid
varandra och ett bord som ändras hela tiden är svårare än en stillbild.

Det som fortfarande saknas, i den ordning det skulle lära oss mest:

- **Vit eller svart spelmatta** — det raka motsatsfallet mot trä.
- **Tryckt spelmatta** (mönster, logotyp, ramar) — ribborna i fall 05 är det
  närmaste hittills.
- **Mörkt rum**, bara en lampa i taket.
- **Motljus** — fönstret bakom bordet.
- **Glansig yta** — lackat bord eller glas, med reflexer.
- **Tappade kort** (liggande) på den yta som fungerar sämst.
- **Kort med luft emellan** på de nya borden — så att omlott och yta går att
  skilja åt i siffrorna.

Fler bord slår fler bilder av samma bord. Video med rörelse blir egna fall
(`-rorelse`) och ska förväntas ge sämre resultat; det är själva poängen.
Hur man gör en ny video till ett fall står i
[SNABBGUIDE.md](SNABBGUIDE.md) under *Lägga till en video* — verktygen ligger
i `dev/golden/video/` och behöver ingen ffmpeg.

## Är det här AI-evals eller regressionstest?

Båda orden passar, och de betyder olika saker här. Mängden — bilder med
facit — är en **evalueringsmängd** (en "golden set", "ground truth"). En
körning mot den ger en kvalitetssiffra för kedjan som den är just nu. Sparas
körningen (`senaste.json`, `historik.md`) och jämförs nästa gång blir samma
körning ett **regressionstest**: den säger om en ändring gjorde det sämre.
Det som skiljer det från "AI-evals" i vanlig mening är att kedjan är
deterministiskt datorseende, inte en modell som svarar olika: samma bild ger
samma svar, så en skillnad mellan två körningar är alltid en ändring i koden
eller i leken. Bänken (`node dev/kamerabank.cjs`) är den andra halvan:
syntetiska ytor och rörelse som en stillbild inte kan prova.

Kvaliteten i **produktion** syns inte här — ingen telemetri lämnar telefonen.
Det som finns är *Spara diagnos* på datorn: en fil med telefonens referens,
ruta, brus och trösklar från ett riktigt spel, som bänken spelar upp. Vill
man veta hur det går för riktiga bord är det de filerna man samlar in, och
gör fall av.

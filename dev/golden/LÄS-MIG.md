# Golden set — riktiga bord med facit

**Ny här?** Börja med [SNABBGUIDE.md](SNABBGUIDE.md): kommandona, hur ett nytt
foto läggs till, och var algoritmen, prompten och modellen finns. Den här
filen är referensen.

Riktiga bilder från olika bord och ljus, var och en med ett facit över vilka
kort som ligger var. `kor.html` kör **hela kamerakedjan** — detektering, ram,
beskärning, igenkänning mot leken — på varje fall och jämför med facit, så att
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
  senaste.json       senaste incheckade körningen — det kor.html jämför med
  historik.md        en rad per incheckad körning: datum, commit, metod, totaler
  fall/
    01-tra-lampa-60cm-3kort/
      bild.jpg
      facit.json
    02-tra-lampa-150cm-4kort/
      bild.jpg
      facit.json
      diagnos.json   (valfritt: telefonens egen referens, brus och trösklar —
                      spelas upp med bänken, se nedan; kor.html läser den inte)
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
`konflikt`, `osäker`) och namnläsarens rad med remsans läge (`@8%`, `vänd`). Första körningen tar en minut extra (poolen och
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

Namnläsaren körs bara när titelraden är hög nog att läsas (remsan ≥ 40 px i
beskärningen; på 60 cm ja, på 150 cm nej — där gav den tomt på alla kort) och
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
| **Tappad** | spår på rätt plats med rätt tap-läge, mot facitkort med ruta |
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

1. **Fotografera.** Telefonen i hållaren rakt över bordet, som när man
   spelar. Stillbild med kameraappen eller en ruta ur en video — lägg bara in
   den utvalda rutan som JPEG, aldrig videofilen (44 MB hör inte hemma i git).
   Skala till högst 1080 px bred, kvalitet ~80, så blir den 150–250 kB.
   Detekteringen kör på 360 px och beskärningen behöver 250–400 px kortsida,
   så det räcker. På en Mac:

   ```bash
   sips --resampleWidth 1080 -s format jpeg -s formatOptions 80 IMG_1234.jpg --out bild.jpg
   ```

2. **Döp mappen** `NN-<yta>-<ljus>-<avstånd>-<antal>kort[-<variant>]`:
   - `NN` löpnummer, så att ordningen är stabil
   - `<yta>`: `tra`, `vitmatta`, `svartmatta`, `tryckt`, `glansig`, `duk`
   - `<ljus>`: `lampa`, `dagsljus`, `morkt`, `motljus`, `blandat`
   - `<avstånd>`: `40cm`, `60cm`, `100cm`, `150cm`
   - `<antal>kort`: facit i namnet, så att fel syns direkt i en fillista
   - `<variant>` valfritt: `tappade`, `overlapp`, `hand`, `rorelse`

   Exempel: `03-vitmatta-dagsljus-100cm-4kort`, `07-tryckt-lampa-60cm-3kort-tappade`.

3. **Rita facit** med <http://localhost:8232/dev/golden/markera.html>: släpp in
   bilden, dra en ruta runt varje kort, skriv namnet (autokomplettering ur
   `lek.txt`), kryssa *tappad* för liggande kort, *avskuret* för kort som
   skärs av kanten och *dold* för kort som ligger under ett annat så att bara
   en kant syns, och tryck **Kopiera facit.json**. Klistra in som `facit.json` i mappen.

   Har du bråttom räcker en **namnlista**: `kort` med bara `namn` per post.
   Då provas namnen men inte platsen och tap-läget (kolumnerna visar `–`), och
   rutorna kan ritas senare — markera.html läser ett sådant facit och låter
   dig rita ruta för ruta.

4. **Kontrollera leken.** Varje kortnamn i facit måste finnas i `lek.txt` —
   annars kan kedjan inte känna igen kortet, och provet mäter leken i stället
   för kameran. Lägg till namnet om det saknas; poolen byggs om av sig själv.

5. **Kör** `kor.html`, titta på raden, och checka in mappen. Har du tryckt
   *Spara diagnos* på telefonen i samma läge: lägg filen som `diagnos.json`
   i mappen — den bär telefonens egen referens, brus och trösklar.

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
- `tappad` gör att tap-läget provas, inte bara namnen.
- `dold: true` på ett kort betyder att det ligger under ett annat så att bara
  en kant syns. Det räknas inte i nämnaren — ingen kamera ser det — men
  hittas det ändå räknas det inte som falskt.
- En post får ha bara `namn`. Då provas namnet men inte platsen.

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

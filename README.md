# Handvy — MTG-händer från SpellTable-skärmdumpar

En fristående webbsida (`index.html`, en enda fil) som kompletterar
[spelltable.wizards.com](https://spelltable.wizards.com).

**Klistra in en skärmdump av hela SpellTable-fönstret.** Appen hittar spelarnas
videorutor, läser av korten som ligger på borden, och skapar en spelare per ruta.
Sedan kan du växla mellan spelare, se hela handen på en gång och zooma in på ett
enskilt kort med piltangenterna — i skarp upplösning från Scryfall.

## Kom igång

Öppna `index.html` i Chrome. Inget bygge, ingen installation, inget konto.

**Dela med spelgruppen:** dra `index.html` till [vercel.com/new](https://vercel.com/new)
eller [app.netlify.com/drop](https://app.netlify.com/drop). Publik URL på ett par
sekunder, gratis.

Första gången du läser av en bild bygger appen ett bildindex över kortsetet
(~780 kort, ca 30 sekunder). Det sparas lokalt och görs aldrig om.

**Tre vägar in i handen.** Skriv kortnamnet i sökfältet, klistra in en lista med
namn (`Lista`, eller <kbd>B</kbd>), eller klistra in en bild (`Bild`, eller
<kbd>I</kbd>) — en beskuren skärmdump, ett foto, en kortbild från nätet. Bilden
LÄGGER TILL kort; det som redan ligger i handen rörs inte. Att klistra in en hel
SpellTable-skärmdump utan att först öppna den rutan gör något annat: då läses
hela bordet om och handen ersätts.

## Är allt driftsatt?

Produktionen ligger på <https://magic-mauve-xi.vercel.app>. Fyra kontroller, i
den ordningen. Samma lista finns som slash-kommandot `/driftkoll` om du kör
Claude Code i det här repot.

**1. Finns det något ocommittat?**

```bash
git status --short
```

Tomt svar = allt är committat. Varje rad som dyker upp är en fil som skiljer
sig från senaste commiten: `M` ändrad, `A` tillagd och redo, `??` ny och
ospårad.

**2. Ligger det något lokalt som inte nått GitHub?**

```bash
git fetch -q origin && git rev-list --count origin/main..HEAD
```

`git fetch` hämtar hem vad GitHub tror att `main` är — utan den jämför du mot
en gammal bild av verkligheten, och det är just då man tror att man pushat fast
man inte gjort det. `origin/main..HEAD` betyder "commits som finns hos mig men
inte hos GitHub". Svaret `0` betyder att allt är uppe.

**3. Lever serverfunktionen, och är det rätt version?**

```bash
curl -s https://magic-mauve-xi.vercel.app/api/identify
```

Svarar `{"ok":true,"ready":true,"model":"claude-opus-5","promptv":11}`.

| fält | betyder |
| --- | --- |
| `ok` | funktionen kör. Kommer HTML tillbaka i stället är deployen trasig. |
| `ready` | `ANTHROPIC_API_KEY` finns i Vercels miljövariabler. Är den `false` svarar appen ändå, men bara den lokala igenkänningen fungerar. |
| `model` | vilken modell servern faktiskt använder. |
| `promptv` | versionen på instruktionerna. Se nedan. |

**4. Är sidan som ligger ute exakt din fil?**

```bash
diff <(curl -s https://magic-mauve-xi.vercel.app/) index.html && echo IDENTISKA
```

Ingen utskrift plus `IDENTISKA` betyder att exakt den fil du har på disk är den
besökarna får. Det är starkare bevis än "Vercel säger Ready", som bara betyder
att bygget gick igenom — inte *vilken* kod som byggdes.

### Vad `promptv` är

Instruktionerna som skickas till bildmodellen ligger i
[`api/identify.js`](api/identify.js), en per läge:

| läge | rad | vad den gör |
| --- | --- | --- |
| `land` | ~156 | jämför ett suddigt kort mot de fem riktiga basländerna |
| `namn` | ~230 | läser spelarens namn ur SpellTables överlägg |
| `card` | ~279 | namnger ETT kort på en närbild |
| `pane` | ~332 | hittar alla kort i en hel videoruta |

`PANE_PROMPT_V` högst upp i samma fil är ett heltal som höjs för hand varje
gång någon av promterna eller lägena ändras. Det ska alltså **stämma med
siffran hälsokollen svarar** — gör det inte det kör produktionen gammal kod.

Den finns för att det annars är omöjligt att skilja "modellen svarade så här"
från "deployen hade inte hunnit ut". Under utvecklingen drog vi fel slutsats
två gånger av precis det skälet, och letade efter fel i promterna när
problemet var att ändringen inte låg ute.

Siffran syns på tre ställen: i koden (`PANE_PROMPT_V`), i hälsokollens svar,
och i appen under **Meny → AI-hjälp**, där det står "instruktioner v11" bredvid
modellnamnet.

## Köra lokalt

Två lägen, olika portar. Båda kan köras samtidigt.

```bash
npm run dev        # http://localhost:8232 — attrapp, gratis
npm run dev:ai     # http://localhost:3000 — riktiga Claude, kostar krediter
```

**`npm run dev`** startar `dev/stub-server.cjs`. Steg 1–3 av igenkänningen körs i
webbläsaren och är därför identiska med produktion — det är bara det sista steget,
att fråga Claude om de osäkra korten, som är en attrapp. Den svarar "inget av
kandidaterna passar", så osäkra kort stannar i granskningslistan. Använd det här
till gränssnitt, flöden och detekteringen.

Attrappen svarade tidigare "kandidat 1, hög säkerhet" på allt utan att titta på
bilden, vilket tryckte in felaktiga kort i handen och såg ut som ett fel i
igenkänningen. Sätt `STUB_AI=accept` för att medvetet testa den vägen.
`STUB_PANE=kort` låter helrutsläget svara med kort, och `STUB_NAMN=Xepman` låter
namnläget svara med ett spelarnamn — utan den svarar det tomt, som en modell som
inte gissar.

Testbilderna i `dev/bilder/` är gitignorerade, så `vercel dev` serverar dem inte.
Vill du köra sidan mot riktiga Claude med en av dem: öppna sidan på port 3000 och
hämta bilden från `http://localhost:8232/dev/bilder/…` — attrappen skickar CORS
även på statiska filer just för det.

**`npm run dev:ai`** kör `vercel dev`, alltså den riktiga `api/identify.js` med din
riktiga nyckel. Kräver engångsuppsättning:

```bash
npm install
npm i -g vercel
vercel link              # välj projektet "magic"
vercel env pull .env.local
```

`.env.local` innehåller nyckeln och är gitignorerad.

## Så fungerar det

1. Ta en skärmdump av hela SpellTable-fönstret (⇧⌘4 + mellanslag på Mac).
2. Klistra in i appen med ⌘V — var som helst.
3. Appen skapar en spelare per videoruta och lägger till korten den känner igen.

Kort den inte är säker på läggs **inte** till automatiskt — ett kort som smyger
in fel är värre än ett som saknas. De hamnar i stället i en rad högst upp:
*"N kort hittades men kunde inte identifieras"* → **Granska**.

Där får du, ett kort i taget: **en upprätad beskärning av just det kortet ur din
skärmdump**, ett sökfält att skriva namnet i, och de förslag matchningen ändå kom
fram till. Välj förslag med `1`–`5`, skriv namnet, eller hoppa över. Nästa kort
öppnas automatiskt.

Det gäller även när ingenting alls känns igen: appen hittar korten på bordet i två
skilda steg — *var* de ligger och *vad* de är — och det första fungerar även när
det andra inte gör det. Du får alltid en lista att fylla i.

I bildvyn (`S`) ser du skärmdumpen med markeringar: **grönt** = tillagt,
**gult** = behöver fyllas i. Klicka på en markering för att ändra kortet, eller på
tom yta för att lägga till ett kort appen missat.

En ny inklistring **ersätter** spelarens kort, så vyn speglar bordet som det ser
ut nu. Enskilda kort kan alltid läggas till för hand via sökrutan.

| | |
|---|---|
| **Överblick** | Rutnätet anpassar kortstorleken så hela handen ryms på en skärm |
| **Zooma in** | Piltangenter väljer kort, `F` ger fokusläge |
| **Byt spelare** | `1`–`9`, eller `Tab` |
| **Bildvyn** | `S` |
| **Alla kommandon** | `?` |

## Om igenkänningen

Att känna igen ett MTG-kort ur en webbkamerabild mot alla ~30 000 kort går inte.
Mot ett **begränsat set** går det. Standard är Foundations Jumpstart (`j25`) plus
aktuella **basic lands** — Plains, Island, Swamp, Mountain, Forest, ca 48
konstverk per typ. Drygt 1 000 kort. Byt set eller stäng av landskapen under
**⋯ → Kortpool**.

Igenkänningen sker i tre steg, och vart och ett löser något det förra inte kunde:

**1. Var korten ligger** — mallmatchning. Appen letar efter *kortets inre
struktur* (titelrad, konstruta, textruta) genom att jämföra med genomsnittet av
hela kortpoolen. Ett tidigare försök letade efter mörka ramar mot ljust bord;
det fungerade bara när korten låg isär, för så fort de överlappar blir grannens
kant "bordet" och de starkaste rektanglarna hamnar i springorna. Mätt på
överlappande kort: 0/10 välcentrerade med rammetoden, 10/10 med mallen.

**2. Vilka kort det är** — helhetslikhet mot poolens bildsignaturer, som rankar
fram ett tjugotal kandidater.

**3. Vilket av dem det faktiskt är** — lokala särdrag med geometrisk
verifiering. Hundratals små punkter (FAST-hörn med BRIEF-deskriptorer) matchas
mellan bild och kandidat, och RANSAC räknar fram om träffarna hänger ihop
geometriskt. Det ger tre saker de två första stegen inte klarar:

- **övertäckning** — behöver bara ~15 synliga punkter, inte hela kortet
- **perspektiv** — punkterna får förskjutas, transformen räknas fram
- **avvisning** — ett tangentbord eller SpellTables livtotal ger aldrig en
  geometriskt konsekvent matchning. Det var precis de sakerna som hamnade i
  ifyllnadslistan förut; helhetsjämförelsen hade inget sätt att säga "det här
  är inte ett kort".

Transformen avgör också **vändningen**, så beskärningen i ifyllnadslistan alltid
visas rättvänd — även för kort som ligger upp och ner mot motståndaren.

Två saker som visade sig avgörande vid mätning:

- **Skärpan måste matcha.** En skarp referensbild mot en suddig webbkamerabild
  gav 3/10 rätt vid 45 % övertäckning. Samma referens nedskalad till 240 px och
  lätt oskärpt gav 10/10. Det var den enskilt viktigaste inställningen.
- **Rotationsinvarians skadade.** Orienterade deskriptorer (rBRIEF) gav 5/10;
  oorienterade gav 9/10. På suddiga kort blir vinkelskattningen brusig, och
  beskärningen rätas ändå redan upp med kortets uppmätta vinkel.

Ett kort läggs till automatiskt bara när **två oberoende bevis** pekar åt samma
håll: minst 10 geometriskt konsekventa punkter *och* hög helhetslikhet (eller
25+ punkter, vilket får stå på egna ben — det är där kraftigt övertäckta kort
räddas). Enbart det ena räckte inte: ett område som inte var ett kort fick 20
konsekventa punkter men låg helhetslikhet, och hamnade i handen.

Basic lands bedöms på en egen regel: ett landskap är ett landskap oavsett
konstverk, och poolens varianter konkurrerar med varandra, så rätt landskap får
sällan hög enskild poäng. I stället räknas samstämmigheten — hur många av de sex
bästa kandidaterna som är samma landskapstyp. Uppmätt: rätt landskap 3–6 av 6,
fel landskap 1 av 6.

### Uppmätt träffsäkerhet

Hela kedjan på en syntetisk SpellTable-skärmdump (två rutor, 10 kort, perspektiv,
lampglans, tangentbord, mus och SpellTables eget överlägg med namn och livtotal):

| Korten ligger | Rätt automatiskt | Felaktigt | Kvar att fylla i |
|---|---|---|---|
| Isär | 9/10 | **0** | 0 |
| Omlott 20 % | 7/10 | **0** | 2 |
| Omlott 40 % | 2/10 | **0** | 4 |

**Noll felaktiga kort i samtliga fall.** Vid kraftig övertäckning sjunker både
detektering och identifiering — hälften av kortet är då grannkortet. De korten
måste läggas till för hand: klicka på tom yta i bilden så föreslås ett kort där.

Avläsningen tar 10–30 sekunder. Kortdatabasen byggs en gång (~1 000 kortbilder,
bildsignaturer och 6 MB lokala särdrag) och tar ungefär en minut.

## Vad som är testat

Verifierat i Chrome på laptopstorlek:

- Rutdetektering på en syntetisk SpellTable-layout (2×2, en svart "video off"-ruta,
  sidopanel) — hittar rätt rutor på ±1 px, ignorerar sidopanel och tom ruta.
- Kortdetektering och matchning, inklusive stresstest med starkare glans, mer brus
  och hårdare JPEG-komprimering.
- Manuell inmatning, listimport, dubbelsidiga kort, flera spelare, delning, export.

**Inte testat:** en riktig SpellTable-skärmdump med riktiga webbkameror — testerna
använder syntetiska bilder som härmar förhållandena. Räkna med att verkligheten är
något svårare, särskilt vid kraftigt överlappande kort.

## AI-hjälp

Den lokala igenkänningen klarar de flesta korten gratis och utan nätverk. För
dem den inte är säker på frågas en bildmodell — den ser det beskurna kortet och
de bästa kandidaterna och väljer ett av dem. Bara svar med **hög säkerhet**
läggs till automatiskt; resten hamnar kvar i ifyllnadslistan med förslaget
överst.

**Nyckeln ligger på servern och lämnar den aldrig.** Ingen användare behöver ett
eget konto, och ingen kan läsa nyckeln ur webbläsaren. Appen frågar servern vid
start om den finns, så ingen behöver redigera koden för att slå på det.

Utan server fungerar appen ändå — den lokala igenkänningen är oberoende — och
den som kör `index.html` som ensam fil kan lägga in en egen nyckel under
**⋯ → AI-hjälp**. Det läget är till för enstaka användare, inte för att dela ut.

### Sätta upp servern

```
index.html        appen
api/identify.js   serverfunktionen som håller nyckeln
package.json      dess enda beroende
```

1. Lägg mappen i ett Git-repo och koppla det till Vercel, eller kör `vercel` i
   mappen. Dra-och-släpp av en ensam fil räcker inte — hela mappen behövs för
   att serverfunktionen ska följa med.
2. Under **Settings → Environment Variables**:

   | Variabel | Krävs | Betydelse |
   |---|---|---|
   | `ANTHROPIC_API_KEY` | ja | Nyckeln. Bara här — aldrig i någon fil du delar. |
   | `ALLOWED_ORIGINS` | bör | Kommaseparerade adresser, t.ex. `https://magic-mauve-xi.vercel.app`. Utelämnad = alla ursprung tillåts. |
   | `ANTHROPIC_MODEL` | nej | Standard `claude-opus-5`. |
   | `RATE_PER_MIN` | nej | Standard 40 anrop per IP och minut. |
   | `RATE_PER_DAY` | nej | Standard 600 anrop per IP och dygn. |

3. Sätt en **månadsgräns** på nyckeln i Anthropics konsol.

### Om skyddet, ärligt

Servern kontrollerar avsändarens adress, begränsar antal anrop per IP, och
avvisar för stora bilder. Men takräkningen sitter i minnet och nollställs när en
instans startas om — den stoppar slarv och skenande loopar, inte en beslutsam
angripare. Behöver du ett vattentätt tak: lägg Upstash Redis bakom och byt ut
`allow()` i `api/identify.js`.

**Det som verkligen begränsar kostnaden är utgiftsgränsen på nyckeln.** Sätt
den, så är det värsta som kan hända att AI-hjälpen slutar svara för månaden.

### Vad det kostar

Per kort appen är **osäker** på — inte per kort på bordet:

| Modell | Per kort |
|---|---|
| `claude-opus-5` (standard) | ~5 öre |
| `claude-haiku-4-5` | ~1 öre |

En skärmdump med åtta osäkra kort kostar 10–40 öre. Byt modell med
`ANTHROPIC_MODEL` utan att röra koden.

## Vad som lagras var

Allt lokalt: **localStorage** (spelare, händer, inställningar) och **IndexedDB**
(skärmdumpar, kortpoolens bildsignaturer). Nätverksanrop går bara till **Scryfall**
(kortdata och bilder) och, om du slår på det, **Anthropic**.
⋯ → *Nollställ appen* rensar allt.

## Varför Scryfall och inte Gatherer

Gatherer är Wizards officiella kortdatabas men går inte att använda från en webbapp:
den saknar CORS-headers och publikt API, så en webbläsare får varken hämta data
eller läsa av bilderna i canvas. Scryfall har samma officiella WotC-kortbilder,
ett dokumenterat API och fungerande CORS.

## Filer

```
index.html      appen
api/identify.js serverfunktionen som håller API-nyckeln
package.json    serverfunktionens beroende
dev/matcher.js  bildsignaturer och helhetsmatchning
dev/orb.js      lokala särdrag (FAST + BRIEF) och RANSAC-verifiering
dev/detect.js   videoruts- och kortdetektering
dev/bench.html  mätbänk för träffsäkerheten
dev/mock.js     syntetisk SpellTable-skärmdump för test
dev/stub-server.cjs  attrapp för /api/identify vid lokal utveckling
assets/mana/    Wizards manasymboler, hämtade från Scryfall
scripts/hamta-mana.sh  hämtar om dem
.claude/skills/driftkoll/  slash-kommandot /driftkoll
```

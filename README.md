# Mesa — fysiska kort på ett delat, digitalt bord

En fristående webbsida (`index.html`, en enda fil) som kompletterar
[spelltable.wizards.com](https://spelltable.wizards.com).

**Kameran ser bordet.** I ett spel sitter din telefon i en hållare rakt
över din spelyta. Den hittar varje kort som ligger där, följer det från
bildruta till bildruta, läser om det är vridet, och känner igen det — mot
din egen lek, på telefonen, en gång per kort. Den filmar i 4K om den kan:
ett kort behöver vara minst 150 px kort sida i bilden för att gå att läsa,
och vid 1080p var korten på ett vanligt bord 100–130 px. Kort som är för
små räknas och rapporteras till datorn (`sma` i varje bord) i stället för
att tigas ihjäl, och telefonen visar vilken upplösning den fick.

**Leken lär du appen genom att fotografera den.** Korten läggs i högar som
överlappar nedåt, så att bara titelraden syns, och ett foto räcker för ett
trettiotal kort. Namnen läses ur den tryckta texten, slås upp mot Scryfall och
visas som en lista du rättar innan den sparas. Har du listan digitalt går den
lika bra att klistra in.

Leken hör till ditt **konto**, inte till spelet: fotograferar du den i telefonen
finns den på datorn, och den följer med in i varje nytt spel. Du kan ändra den
när som helst, också mitt i ett parti — telefonen bygger om sin igenkänning så
fort du sparat. Utan konto sparas den i webbläsaren. Det som lämnar telefonen är
ett litet bordstillstånd när något ändrats.

**Telefonen läser av hela bilden** — det finns ingen yta att markera. Sätt den i
en hållare rakt ovanför korten du spelar ut, och håll leken och graveyard utanför
bild. Tappat läses ur kortets vinkel mot ett **otappat läge**, och det läget
sparar du själv i ett eget steg: lägg ett kort som du vill ha det otappat, och
tryck *Spara som otappat läge* i statusfältet (eller *Spara* i kameravyn). Tills
dess spelas kamerans kort otappade; från då är ett kort som ligger mer än 45°
från det läget tappat. Otappat är sällan exakt rakt och tappat sällan exakt 90°,
så läget tas ur ett riktigt kort i stället för en fast axel; det sparas i
spelet och går att spara om i kameravyn.

**Auto-remsan** under topbaren säger varför ett kort inte kommit än, utan att
du öppnar något: "Auto · ser 3 kort · 2 på bordet" och ett chip per kort
kameran ser men inte lagt ut — *läses (2 s)*, *väntar på Claude (5 s)*,
*osäkert – fyll i i granskningen* (länken är Review-knappen), *skymt – något
ligger över*, *för litet för att läsas*, *syns inte längre* för ett nedtonat
kort. Är allt känt står bara "Auto · 3 kort på bordet, alla kända". Steget att
spara det otappade läget står i samma rad. Chippet i topbaren är kvar som förut och
öppnar **kameravyn**: en panel dockad vid högerkanten (från 900 px bred skärm)
med telefonens bild, statusraden och reglagen, som inte täcker bordet — ett
kort som dyker upp medan du skruvar syns. QR-koden för att koppla telefonen
är samma panels första steg.

**När auto stängs av** får du en sammanfattning av passet i stället för en
notis: hur många kort kameran hittade, hur de fick sitt namn — lokalt
(konstverk och titelrad), med Claude per modell, fyllt i för hand, eller ännu
utan namn — medianen för hur lång tid ett kort tog att känna igen, och vad
Claude-anropen kostade: anrop, tokens in och ut, USD, för telefonens frågor
(beskärningar och hela bilden) och datorns egna medan auto var på. Kostnaden
räknas ur en bok telefonen för per anrop, inte ur spåren — ett svar kan sitta
på flera kort, och ett anrop som inte gav något kostade ändå. En modell utan
pris i tabellen står som "pris okänt", aldrig som 0 USD. Ett nedtonat land
bär samma etikett som ett nedtonat permanent, "Syns inte", när kortet är
brett nog för den.

Den digitala vyn är en spegel av bordet — men kameran får bara lägga till kort
och vrida dem, aldrig ta bort dem. Den räknar kort, inte spår: känner den igen
ett kort som redan ligger på bordet läggs det inte till en gång till — den lägger
bara till så många som fattas för att appen ska ha lika många av kortet som det
ligger på bordet. Ser den samma kort två gånger — Claude läser av hela bordet och
placerar kortet en bit bredvid där kameran redan ser det — blir det ett kort, och
ett osäkert kort ovanpå ett känt med samma namn hamnar inte i granskningen.

Ett kort den inte längre ser tonas ned där det ligger, med tre val: till
graveyard, ligger kvar, eller bort från bordet (samma kryss som på varje kort).
Att göra ingenting betyder att det ligger kvar, och lägger du tillbaka det på
bordet tonas det upp av sig självt. Har flera kort tonats ned på en gång får
du ett svar för alla i zonrubriken. Det gäller landen också: ett land kameran
inte ser läggs nedtonat sist i sin färggrupp med samma tre val, minus tar ett
nedtonat land först, och Lands har en egen rad för alla.

Något som inte är ett kort — en bit av bordet, en skugga, en baksida — läggs
varken till eller i granskningen. Telefonen avgör först om beskärningen alls ser
ut som ett kort mot det som ligger runt den, och med AI-hjälpen på har Claude
sista ordet: säger Claude att det inte är något kort blir det skräp. Ett riktigt
kort som kameran är osäker på går fortfarande till granskningen, men först när
Claude svarat — högst 15 sekunder senare.

Mätbänken för kameran ligger i `dev/kamerabank.cjs` (`node dev/kamerabank.cjs`),
och datorns avstämning — samma kort som två spår, landhögar, nedtonade land,
spår som väntar på Claude — provas med `node dev/avstamning.cjs`.
En hand eller en arm över korten ändrar ingenting: ett spår släpps först när
bordet *under* det sett tomt ut. Korten hittas som det som avviker från vad
bordet självt ser ut som i samma bildruta (uppmätt på ett träbord; reglaget
*Avvikelse* under Auto-chippet ändrar det), så korten får ligga kvar när
kameran startar — håll bara telefonen stilla en sekund. Bara där bordet har
eget tryck eller mönster räknas i stället skillnaden mot referensbilden, med
en tröskel ur bordets brus. På ett slätt, enfärgat bord eller en duk i vanligt
ljus behöver inget ställas in.

**Ett tomt bord säger vad som händer härnäst.** I ett spel är *Slå på auto*
huvudvalet på det tomma brädet, med en mening om vad det är. Väntar appen på
telefonen står *Visa QR-koden* där; har kameran tappats står *Koppla om*; är den
kopplad står en uppmaning att lägga ut ett kort på bordet. Skärmdumpen är alltid
andrahandsvalet, och den lägger till — liksom kortikonen i toppraden, som står
kvar också när auto går. Klistrar du in en bild på det enda kort kameran väntar
på ett namn för, tar kortet över kamerans spår: frågan försvinner ur kön och
tappningen följer med. På ett lokalt bord finns ingen telefon, så där är
skärmdumpen huvudvalet.

**Klistra in en skärmdump av hela videosamtalets fönster.** Appen hittar spelarnas
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
namn (`Lista`, eller <kbd>B</kbd>), eller ge appen en bild. En bild med ett
eller flera kort kan läggas till från kortikonen i toppraden (<kbd>I</kbd>) — i
alla lägen, också medan auto går.

**Var bilden hamnar avgör vad som händer:**

| var | vad som händer |
| --- | --- |
| huvudvyn — <kbd>⌘V</kbd>, dra in en fil, eller släpp den i någon av rutorna | korten som hittas **läggs till**; det som redan ligger i handen står kvar |
| tilläggsrutan (*Add cards from an image* — kortikonen i toppraden, <kbd>I</kbd>, *Drag in cards*, tomrutans *Klistra in en skärmdump*) | korten **läggs alltid till**, också på ett tomt bräde |
| huvudvyn när brädet är **tomt** och ingen ruta är öppen | hela bordet läses av från grunden, en flik per spelare |
| bildvyn (kameraikonen i toppraden eller <kbd>S</kbd>) | bilden läses av som ett helt bord och **handen ersätts** |

Bilden kan innehålla ett kort eller flera — en beskuren skärmdump, ett foto, en
kortbild från nätet, eller en hel skärmdump av videosamtalet. Är det en hel skärmdump
söker appen bara igenom videorutorna, så sidopanelens kortlista kommer inte med.

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

Svarar `{"ok":true,"ready":true,"model":"claude-opus-5","promptv":20}` (plus `modeller` per läge).

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
| `namn` | ~230 | läser spelarens namn ur videoappens överlägg |
| `card` | ~279 | namnger ETT kort på en närbild |
| `pane` | ~332 | hittar alla kort i en hel videoruta |
| `lek` | ~459 | läser kortnamnen ur ett foto av den utlagda leken |
| `kamera` | ~640 | kamerans osäkra beskärning + lekens namn in, ett namn EXAKT ur leken per kort som syns ut (med läge och `usage`). Modellen väljs med `ANTHROPIC_MODEL_KAMERA` (standard samma som `ANTHROPIC_MODEL`); uppmätt lika träffsäkra på beskärningarna, Sonnet 5 en tredjedel av priset och 1,7 mot 2,2 s. Lokalt: `MESA_AI=1 node dev/stub-server.cjs` kör riktiga anrop med nyckeln ur `.env.local`. |

`PANE_PROMPT_V` högst upp i samma fil är ett heltal som höjs för hand varje
gång någon av promterna eller lägena ändras. Det ska alltså **stämma med
siffran hälsokollen svarar** — gör det inte det kör produktionen gammal kod.

Den finns för att det annars är omöjligt att skilja "modellen svarade så här"
från "deployen hade inte hunnit ut". Under utvecklingen drog vi fel slutsats
två gånger av precis det skälet, och letade efter fel i promterna när
problemet var att ändringen inte låg ute.

Siffran syns på tre ställen: i koden (`PANE_PROMPT_V`), i hälsokollens svar,
och i appen under **Meny → AI-hjälp**, där det står "instruktioner v18" bredvid
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
till gränssnitt, flöden och detekteringen. I kameraläget svarar attrappen utan
kortlista, och kameran räknar det som att inget svar kom: osäkra kort hamnar i
granskningen som vanligt.

Attrappen svarade tidigare "kandidat 1, hög säkerhet" på allt utan att titta på
bilden, vilket tryckte in felaktiga kort i handen och såg ut som ett fel i
igenkänningen. Sätt `STUB_AI=accept` för att medvetet testa den vägen.
`STUB_PANE=kort` låter helrutsläget svara med kort, och `STUB_NAMN=Xepman` låter
namnläget svara med ett spelarnamn — utan den svarar det tomt, som en modell som
inte gissar.

`STUB_LEK=kort` låter lekfotot svara med elva kort valda för att vara svåra att
bygga rätt mot: fyra likadana Mountain som ska bli **en** rad med antalet fyra,
ett tomt namn som ska hamna i ifyllnadslistan, ett namn som inte finns på
Scryfall, och ett `medel` som ska begära bekräftelse trots att det slås upp utan
fel. `STUB_LEK=trasigt` svarar utan JSON. Utan variabeln svarar den "inga kort".

`PORT` går att sätta, standard 8232 — så att två attrapper med olika lägen kan
köras samtidigt.

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

1. Ta en skärmdump av hela videosamtalets fönster (⇧⌘4 + mellanslag på Mac).
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
- **avvisning** — ett tangentbord eller videoappens livtotal ger aldrig en
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

Hela kedjan på en syntetisk skärmdump av videosamtalet (två rutor, 10 kort, perspektiv,
lampglans, tangentbord, mus och videoappens eget överlägg med namn och livtotal):

| Korten ligger | Rätt automatiskt | Felaktigt | Kvar att fylla i |
|---|---|---|---|
| Isär | 9/10 | **0** | 0 |
| Omlott 20 % | 7/10 | **0** | 2 |
| Omlott 40 % | 2/10 | **0** | 4 |

**Noll felaktiga kort i samtliga fall.** Vid kraftig övertäckning sjunker både
detektering och identifiering — hälften av kortet är då grannkortet. De korten
måste läggas till för hand: klicka på tom yta i bilden så föreslås ett kort där.

Avläsningen tar 25–45 sekunder med AI-hjälpen påslagen — uppmätt 28 s på en
skarp bild där allt hittas lokalt, 42 s på en bild med lampglans där hälften av
korten bara går att hitta med bildmodellen. Utan AI-hjälp tar den 10–15 sekunder
och hittar bara det detektorn ser. Rutläget (leta igenom hela videorutan) och
baslandsjämförelsen går till den tunga modellen, närbilderna till en snabbare:
2 s per kort mot 7. Kortdatabasen byggs en gång (~1 000 kortbilder,
bildsignaturer och 6 MB lokala särdrag) och tar ungefär en minut.

## Vad som är testat

Verifierat i Chrome på laptopstorlek:

- Rutdetektering på en syntetisk videosamtalslayout (2×2, en svart "video off"-ruta,
  sidopanel) — hittar rätt rutor på ±1 px, ignorerar sidopanel och tom ruta.
- Kortdetektering och matchning, inklusive stresstest med starkare glans, mer brus
  och hårdare JPEG-komprimering.
- Manuell inmatning, listimport, dubbelsidiga kort, flera spelare, delning, export.
- Lekens fotoväg mot attrappen (`STUB_LEK=kort`, port 8233), med en syntetisk
  solfjäder på 3024 px: geometrin landar på 436 px kortbredd och 1390x1439
  levererad bild, mot designens förutsagda 435 och 1387x1442. Elva svarsposter
  blir åtta rader, fyra Mountain blir en rad med antalet fyra, ett andra foto
  staplas ovanpå det första, ett borttaget foto stryker just sina kort, och en
  lek sparad i ett spel sås tillbaka ur den lokala kopian i nästa.

**Inte testat:** en riktig skärmdump av videosamtalet med riktiga webbkameror — testerna
använder syntetiska bilder som härmar förhållandena. Räkna med att verkligheten är
något svårare, särskilt vid kraftigt överlappande kort.

**Inte heller testat:** ett riktigt foto av en riktig lek. Den syntetiska
solfjädern har perfekt ljus, ingen oskärpa och inget perspektiv, och saknar
därmed just det som gör uppgiften svår — reflexen som lägger sig tvärs över tre
titelrader samtidigt. Titelradens höjd är däremot uppmätt på en riktig
Scryfall-bild: versalhöjden är 2,9 % av kortbredden, alltså 14 punkter på en
kortbild i 488 punkters bredd. Det är talet hela geometrin vilar på.

## AI-hjälp

Den lokala igenkänningen klarar de flesta korten gratis och utan nätverk. För
dem den inte är säker på frågas en bildmodell — den ser det beskurna kortet och
de bästa kandidaterna och väljer ett av dem. Bara svar med **hög säkerhet**
läggs till automatiskt; resten hamnar kvar i ifyllnadslistan med förslaget
överst. I kameraläget frågas Claude om varje kort kameran är osäker på: ett namn
ur leken med hög säkerhet lägger till kortet, "inget kort" gör spåret till
skräp, och uteblir svaret (nätet, taket per minut) går kortet till granskningen
som förut.

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

Allt lokalt: **localStorage** (spelare, händer, inställningar, och en kopia av
leken) och **IndexedDB** (skärmdumpar, kortpoolens bildsignaturer). Är du
inloggad ligger leken dessutom på ditt konto i Supabase, i tabellen `lekar` —
det är den som gör att den finns på alla dina enheter. Nätverksanrop går bara till **Scryfall**
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
dev/mock.js     syntetisk skärmdump av videosamtalet för test
dev/lekmock.js  syntetisk solfjäder och mätbänk för lekens fotoväg
dev/stub-server.cjs  attrapp för /api/identify vid lokal utveckling
dev/kamerabank.cjs   mätbänk för kameramodulen (telefonens sida)
dev/avstamning.cjs   prov för datorns avstämning, med telefonens riktiga rapporter i dev/avstamning-rapporter.json
dev/golden/     golden setet: riktiga bord med facit, hela kamerakedjan i appen
assets/mana/    Wizards manasymboler, hämtade från Scryfall
scripts/hamta-mana.sh  hämtar om dem
.claude/skills/driftkoll/  slash-kommandot /driftkoll
```

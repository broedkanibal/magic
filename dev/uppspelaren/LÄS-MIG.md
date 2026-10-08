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
| `node dev/uppspelaren/kor.cjs` | alla åtta fallen mot `index.html`, tabellen | ~25 s |
| `node dev/uppspelaren/kor.cjs --fil /tmp/x.html --jamfor` | samma mot en annan `index.html`, rad för rad mot baslinjen. **Slutkod 1 om något mått i totalt-kolumnen eller i p0921 är sämre, eller något av parti-kedjans grindrader** (geometrin, hoppen, zoomhoppen — se *Grinden*); övriga parti-kedjan-rader är diagnos | ~25 s |
| `node dev/uppspelaren/kor.cjs --jamfor --alla` | jämförelsen med alla rader, också de oförändrade | |
| `node dev/uppspelaren/kor.cjs --fall g09,p0921 --detalj g09` | bara de fallen, och vad som räknades händelse för händelse | några s |
| `node dev/uppspelaren/kor.cjs --spara` | skriver baslinjen (`baslinje/baslinje.json` och `baslinje.md`) — bara när en ändring ska bli den nya baslinjen | |
| `node dev/uppspelaren/kor.cjs --json ut.json` | allt: motorns logg och måtten per fall | |
| `node dev/uppspelaren/kor.cjs --visa --fall g09` | visaren i ett Chrome-fönster | |
| `node dev/uppspelaren/kor.cjs --bilder <mapp> [--vid g12:7.5,g12:7.85]` | skärmdumpar ur visaren, huvudlöst | ~10 s |
| `--solo` | bara mitt bord, ingen motståndare (inte baslinjens läge — bara för felsökning) | |

Slutkod: 0 = gick (och inget sämre med `--jamfor`), 1 = sämre än baslinjen,
2 = gick inte att mäta: Chrome, underlaget saknas, appen laddade inte, ett
fall gick inte att köra, **appen kastade ett undantag under uppspelningen**,
eller **motorn kunde inte tolka något den läser ur appen** (mattans transform
`gridEl._matT`, nycklarna `c:`/`p:` i `matSynk`, klassen `.lyft` mot kortets
`lyft`, eller inga `c:`-element alls i ett fall med utspel). Kod 2 gäller i
alla lägen, också `--jamfor` och `--spara` (som då inte skriver något). En
grind som inte vet svarar inte ja — och en mätning som tystnar när appen
byter form (MES-338 kan ändra transformens form) får inte se ut som 0.

`--jamfor` varnar också när `origin/main:index.html` inte längre är den fil
baslinjen sparades på: kör då `--spara` på main först.

I en worktree: symlänka `dev/material` (passet 2026-09-22 och bilderna
ligger där), annars faller fallet p0922 med slutkod 2.

## Fallen

| Fall | Vad | Telefonens ström? |
|---|---|---|
| g07, g09, g10, g11, g12 | golden-videofallen. Bordsloggen ur golden-körningen (utan Claude), fryst i `underlag/golden-bordlogg.json.gz` (ur `dev/golden/senaste.json`, commit 5505933) så att baslinjen inte flyttar sig när golden sparas om. Facit: `dev/golden/fall/<id>/facit.json` (`video.handelser`). Video: `dev/golden/fall/<id>/video.mp4` | ja |
| p0922 | passet 2026-09-22. Bordsloggen ur `dev/spegelfacit/kor.cjs` på passets video, körd 2026-10-04 utan Claude (`dev/material/arbete/2026-10-04-hogarna-matning/baslinje/spegel-lokal.json`, 1262 bord). Facit: `dev/golden/inspelningar/2026-09-22-1x-34cm-normaltempo/handelser.tsv`. Ingen video här (Google Drive) — visaren visar kontaktarken, en ruta per sekund | ja |
| p0921 | partiet 2026-09-21, sek 240–540. **Facit, inte telefonen:** v2-facit (`underlag/2026-09-21-v2-tabell.tsv`, kopia av den otrackade filen i huvudträdet) matas in som en idealiserad telefon — ett klart, säkert spår per kort var tionde sekund, kortets mitt ur facit och en låda i den storlek ett kort har där i bilden. Namnen är påhittade ("Kort 01"). Här mäts mattans geometri, inte kamerans fart | **nej** |
| parti-kedjan (hette `p0921k` till 2026-10-07; det gamla id:t tas fortfarande emot) | partiet 2026-09-21, sek 230–540, **genom kedjan**: kamerabilden ur skärminspelningen `dator.mov` (Mesas kamerapanel, 704 × 438 px, Mesas spårramar i bilden) körd genom `dev/spegelfacit/kor.cjs` utan Claude från sek 180 (avsnittet nedan). Bordsloggen fryst i `underlag/2026-09-21-kedja-bordlogg.json.gz` med `node dev/uppspelaren/frys-kedja.cjs`. Facit: `underlag/2026-09-21-handelser.tsv` (händelser med namn och läge i bilden) och v2-tabellen. Visaren visar kamerans rutor, en per sekund | ja, men inte telefonens egen (se nedan) |

### parti-kedjan: partiet genom kedjan

**Vad det är.** Telefonen filmade partiet i 4K15, men den inspelningen finns
inte. Det som finns är skärminspelningen av datorn, där kamerabilden syns i
Mesas kamerapanel i 704 × 438 px med Mesas egna ramar ritade ovanpå. Den
bilden klipps ut (samma utsnitt som `rutor/kam-NNN.jpg` och v2-facit, kollat
pixel för pixel i ruta 260 och 450) och körs genom kedjan som ett pass.
Graveyard-rutan är Mesas gula ruta i bilden, library-rutan den gröna leken.

**Vad kedjan gör med den bilden** (körningen 2026-10-07, sek 180–540, 1992
bord, utan Claude), mot v2 i de 31 rutorna 240–540. Det här är en
**engångsanalys av telefonens bord** (`node dev/uppspelaren/frys-kedja.cjs
--bara-analys`), inga mått i uppspelaren — uppspelaren har till exempel
inget tap-mått:

| | |
|---|---|
| facits kort som har ett spår på samma plats (högst 60 px, som i fall.cjs) | 278 av 310 (90 %) |
| spår utan kort i facit | 40 av 318 (13 %; mest händer och spår som står kvar där ett kort togs bort) |
| tappad/upprätt rätt, bland de parade | 262 av 273 (96 %) |
| spår med säkert namn, bland de parade | 64 av 278 — bara landen (Plains, Swamp) |
| spår i hela körningen | 428, mediantid 1,7 s |

Kedjan **hittar korten och var de ligger, men sätter nästan inga namn**:
icke-land i blanka fickor blir `okand` (bildmodellens bästa gissning under
gränsen), utom Trusty Retriever i 0,6 s när handen lyfte det (407,85, rätt
namn). Utan Claude ligger de som platshållare på mattan ("Fill in …?").
Telefonen i partiet läste i 4K och frågade Claude; den här strömmen gör
inte det. Mesas ramar ligger i bilden, som i golden 09–12 och passet
2026-09-22.

**Vad parti-kedjan säger** (main 2f2fd99, efter MES-342, med motståndare):
något syntes i 12 av 13 utspel, median −0,7 s från att handen lade kortet
(platshållaren kommer med handen); Valkyrie's Sword 246,5 är missen —
telefonen behöll spåret där Killing Glare låg (232) och mattan sin
platshållare, så inget nytt syntes. 0 av 13 utspel kom som kort med namn,
10 av 10 borttagningar "står kvar" (korten låg bara som platshållare). 523
platshållare, 2286 s, 540 laddtexter. Saknade kort och avståndet paras
sedan 2026-10-07 på plats (nedan): 26 facit-kort · rutor saknas, 1204
kortpar, avståndsfel 0,18 / 0,42 kortbredder (parat på spår: 45 saknade,
1039 kortpar, 0,20 / 0,45).

**Avståndet före och efter MES-342 (kamerans skala).** Skalan är medianen
av kortens lådor i bilden (`kamSkala`; uppspelaren har inget provkort).

| | main 8114741 (före) | main 2f2fd99 (efter) |
|---|---|---|
| avståndsfel, median / p90 (kortbredder) | 0,34 / 0,70 | 0,20 / 0,45 |
| avstånden på mattan mot bordets (798 kortpar mer än 1,5 kb isär), median (p10–p90) | 0,84 (0,76–0,93) | 1,08 (0,95–1,18) |
| falska omlott | 2 | 0 |
| mattans zoomändringar per minut | 0,57 | 0,76 |

Före lade mattan korten för tätt (lådornas kortsida 120 px i median mot
kortets ~98–105). Efter ligger de lite för glest. De två falska omlotten
före kom ur lådorna: ruta 360 (spår 194 nere till höger, armen täcker;
lådan är bara överkanten, 126 × 91 px, så platshållaren hamnade upp mot
Trusty Retriever i övre raden) och ruta 530 (spår 388, skymt, lådan 135 ×
97 px blev ett tappat Plains som täckte grannen). De andra måtten ändrades
inte av MES-342.

**Vad parti-kedjan kan och inte kan mäta.** Det kan mäta **var** mattan lägger
det telefonen ser (avståndsfel, falska omlott, kanten) och **saknade kort**
(facits kort utan något på mattan för spåret där — det enda antal parti-kedjan
mäter), plus hoppen och zoomen som hoppar. De måtten grindar. Tap mäts
inte: uppspelaren har inget tap-mått, och 262 av 273 ovan är
engångsanalysen av telefonens bord. Det kan **inte** mäta **namn**: kedjan
på den här bilden namnger bara landen, så "kortet kom med namn",
borttagningar, flyttar och utbytta mäter kedjans namnlöshet, inte mattan.
Platshållarna och laddtexterna mäter också namnlösheten — varje kort utan
namn blir en platshållare — och är diagnos, liksom zoom och pan per minut.
*Utspel som syntes* och *tid till något syns* är diagnos tills MES-344 är
inne; då ska de grinda (det oframkallade kortet är det som ska synas inom
0,5 s). Namnen kräver en körning med `--ai` (som telefonen i partiet,
kostar) eller en ny 4K-inspelning från telefonen.

**Osäkra rader i facit** (`osaker` = trolig/osäker i
`underlag/2026-09-21-handelser.tsv`): Trusty Retriever flyttar 287
(osäker — kom ur handen, kan vara ett nytt kort), Plains flyttar 314, 319
och 398 (osäkra omflyttningar i landhögarna), Killing Glare 230/232,
Trusty Retriever 230 (P4), Ancestral Blade 254/282/446,5, Mirran Bardiche
374/437, Coat with Venom 508/514 och Faithful Pikemaster 529 (troliga:
namnet ur konsten eller en delvis läsbar titel, inte en tydlig titelrad).
Sekunderna är avlästa i rutor en per sekund, i bytesfönstren 0,2–0,4 s;
räkna med ±0,5 s.

**Mätningen börjar 230 s** (`matFran`). Kedjan startar kall vid 180 med åtta
kort på bordet; det som föds på mattan före 230 är uppstarten och räknas
inte — inga nya kort, platshållare, laddtexter, hopp eller mattans rörelser
före 230. Utan `matFran` (alla andra fall) räknas allt, som förut.

**Facit** (`underlag/2026-09-21-handelser.tsv`) är byggt 2026-10-07 ur
`handelser.tsv` (natten 2026-09-22, underkänd som helhet), dess rättelser i
`platser.tsv`/`platser-sammanfattning.md`, `hogar-handelser.tsv` (A1a) och
rutorna 230–540 sekund för sekund (fönstren med byten 0,2–0,4 s). Raderna
`ligger` är bordet vid 230. Varje rad har kortets mitt i bilden (x, y i
procent). Rättat mot `handelser.tsv`: Killing Glare till graveyard 232 och
Swamp 239,5 saknades; Trusty Retriever och Valkyrie's Sword flyttades
(287, 302), de var inga nya kort; Ancestral Blade gick till graveyard 446,5
(saknas också i `hogar-handelser.tsv`); två Plains spelades 401,5 och 422;
Coat with Venom spelades 508 och lades i graveyard 514; kortet vid 81,29
sek 529 är Faithful Pikemaster och Vraska's Finisher låg kvar (tappades).
Tappningar finns inte med — uppspelaren mäter dem inte. Omflyttningar
inne i landhögarna finns bara med där ett land flyttats minst ett kort
(314, 319, 398, osäkra). Kontroll mot v2: bordet som händelserna ger har
lika många kort som v2 i 24 av 31 rutor; i de sju andra har facit ett kort
till, och i alla sju ligger ett kort dolt i v2:s ruta (under ett annat kort
i högen, eller under handen eller armen).

**Två regler gäller bara parti-kedjan**, för att facit har kortets läge i bilden:

- *Tid till något syns*: kom kortet aldrig räknas också det mattan visar
  för ett spår som i telefonens bord låg där facits kort ligger (högst
  60 px, ett kort är ~98 px brett) i fönstret.
- *v2-rutorna* (avstånd, omlott, kanten, saknas) jämförs med mattan 1 s
  efter rutan, **på plats**: motorn räknar varje facit-korts läge på mattan
  med appens egen `kamTillMatta` och den skala mattan står i
  (`kamSkalaFryst()` eller den låsta `kamSkala.las`; `kamSkala()` anropas
  inte, den låser om), och det paras med det närmaste på mattan — kort,
  MES-344:s oframkallade kort (`o:`) eller platshållare (`p:`), inte
  nedtonat — inom 0,5 kortbredd, närmast först, ett mot ett. Inget där =
  saknat. Telefonens spår-id spelar ingen roll. Går läget inte att räkna:
  kod 2. `--detalj parti-kedjan` visar hur många som inte var kort med namn.
  (p0921 parar som förut på spår, som där är facit.)
  Måttet räknar att *något* ligger på platsen, inte att det är rätt kort:
  på main paras 14 av de 27 facit-kort som telefonen aldrig såg ändå, oftast
  med ett land i samma hög (granskningen 2026-10-07). Saknade kort i parti-kedjan
  är alltså ett golv, inte ett exakt tal.

## Hur uppspelningen går till

Filservern lägger `motor.js` **först** i appens sida (`/app.html`), före
appens egen kod, både i den huvudlösa Chrome som mäter (sidan exakt
1400 × 1000 px) och i visarens iframe. Motorn gör ingenting förrän
uppspelningen börjar. Då gör den samma uppstart som `dev/mattan.cjs` — ett
spel i Mirror my table, kameran ansluten, ingen inloggning, nätet spärrat —
**med en motståndare** (Sara, två kort som ligger still), som i ett riktigt
spel: bordsvyn delar skärmen mellan mattorna och ritar om min matta när
rutan runt den ändrar storlek. `--solo` tar bort henne.

**Klockan är simulerad.** Medan motorn kör:

- `Date.now()` ger uppspelningens tid.
- Appens `setTimeout`/`setInterval` körs när klockan passerar deras tid —
  också de appen ställde när den startade (renderAutoBar varje sekund,
  kamerapricken …): de riktiga stoppas när uppspelningen börjar och går
  vidare i kön med samma takt.
- Efter varje steg körs det webbläsaren gör före nästa bild:
  `requestAnimationFrame` och `ResizeObserver` (bordsvyn ritar om mattan när
  rutan ändras, `index.html` vid `new ResizeObserver`). Webbläsarens egna
  leveranser släpps inte fram under uppspelningen.
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
börjar (p0922) eller avläst ur bildrutan (golden). Golden-facit ligger ofta
~0,5 s efter att handen släppte kortet (g09 Plains: släppt ~4,0 s, facit
4,5 s) — därför blir tiderna negativa i golden, t.ex. −0,3 s.

**En miss räknas som taket, 10 s,** i varje median och "längst": ett utspel
där inget syntes, ett kort som aldrig kom till ro, en borttagning eller flytt
som inte syntes. Annars blir medianen bättre när det blir sämre.

| Mått | Exakt | Bättre |
|---|---|---|
| **Hopp utan rörelse** | ett kortelement vars synliga läge ändras mer än 0,1 kortbredd inne i ett steg (före → efter en rapport, ett hjärtslag eller en av appens timrar), alltså utan att någon tid gått | lägre |
| **Snabba hopp** | ett kort som rör sig mer än 1 kortbredd mellan två videorutor (1/15 s) **utan att en glidning (`matGlid`) går** och utan att ha hoppat i ett steg emellan. Flera rutor i rad är ett hopp. En lång flytt som glider räknas inte, hur fort den än går | lägre |
| **Utbytta kort** | en flytt i facit som syntes som ett nytt kort, eller ett nytt kortelement med samma namn högst 10 s efter att ett kort med namnet tonades ned eller lämnade mattan *fast det låg kvar* (en fel nedtoning). Plus element som byts ut i DOM:en för samma kort | lägre |
| **Nya kort utan utspel i facit** | ett nytt kortelement som inte svarar mot något utspel i facit (inom fönstret, rätt namn) och inte är utbytt: en dubblett, ett felnamn, eller ett kort som kom tillbaka ur graveyard fast det låg kvar där | lägre |
| **Fel nedtoning eller fel borttagning** | ett kort som tonas ned (`.lyft`) eller lämnar mattan (graveyard, exile, borta) utan att facit har en `tar_bort` för namnet inom fönstret. En borttagning som syns först efter fönstret (före nästa utspel med namnet) är ingen fel nedtoning — den räknas som "står kvar" | lägre |
| **Fel till handen** | som ovan, men kortet lämnar mattan mot handen (zonen heter något med hand, eller kortet tas ur korten helt — i appen är hand och library ett). Sedan MES-343 skickar kameran själv ett kort till handen när platsen är tom efter att händerna gått: kortet tas ur listan, så det räknas här som `borttaget` | lägre |
| **Borttagna kort som står kvar** | en `tar_bort` i facit utan att något kort med namnet tonas ned eller lämnar mattan inom fönstret | lägre |
| **Tid till borta** | från facits `tar_bort` till nedtoningen eller till att kortet lämnar mattan, median och längst (miss = 10 s) | lägre |
| **Utspel som syntes** | utspel (`spelar`, `grav_till_bord`) där något syntes inom fönstret, med regeln i *Tid till något syns* | högre |
| **Utspel där kortet kom med namn** | utspel där kortet själv kom (nytt element, eller ett nedtonat som kom tillbaka) | högre |
| **Tid till något syns** | från facits tid till det första som syntes: kortet, eller vilket annat element som helst på mattan som inte är ett kort eller en hög (i dag platshållaren `.plats`; i morgon t.ex. ett oframkallat kort) — samma spår som kortet, eller inom 1,5 kortbredder från där kortet kom. **Kom kortet aldrig** räknas ett sådant element bara om dess spår i telefonens bord bär facits namn (namn, gissning eller första förslag) i fönstret: en platshållare någon annanstans på bordet är inte det här utspelet. Det är strängare än sant: Killing Glare 35,02 i p0922 låg som platshållare som gissade Proctor's Gaze och räknas inte. Median och längst (miss = 10 s) | lägre |
| **Tid till rätt plats** | från facits tid till att kortet ligger där det sedan ligger kvar: inom 0,25 kortbredd från sitt läge 10 s efter (eller före nästa facit-händelse för kortet) och kvar där hela vägen. Ett kort som flyttas på mattan efteråt (en knuff, skalan, en zoom som flyttar det ur graveyard-rutan) är inte på plats förrän det slutat. Median och längst (miss = 10 s) | lägre |
| **Flyttar där samma kort glider** | `flyttar` i facit där samma element med namnet får ett nytt viloläge minst 0,5 kortbredd bort, utan nedtoning emellan | högre |
| **Flytt: tid till nya platsen** | från facits `flyttar` till att kortet ligger på den nya platsen (samma regel som rätt plats), också när flytten blev ett nytt kort (miss = 10 s) | lägre |
| **Mattans zoom-/panoreringsändringar per minut** | antal gånger mattans transform (`matBradeSkriv`) ändras, delat med fallets längd. Zoom = skalan ändras; pan = bara förskjutningen | lägre |
| **Zoom eller pan som hoppar** | transformändringar utan glidning (varken mattans egen rörelse eller CSS-övergången `.bordglid`/`.glider`) | lägre |
| **Platshållare** | platshållare (`.plats`) som syntes, och sekunder de stod på mattan. Ett element som byts (span → button) i samma ögonblick är samma platshållare | lägre |
| **Laddtexter** | chippen "Reading…" och "Moving…" på kort, och platshållare med "Reading the card…" eller "Asking Claude…" | lägre |
| **Kort utanför mattans kant** | kort vars ruta på skärmen (med zoom, pan och rörelse) sticker ut ur mattans fönster (`#gridWrap`), räknat per videoruta: antal kort och kortsekunder | lägre |
| **Avståndsfel** (p0921) | för varje par kort i var tionde sekund: \|avståndet på mattan − avståndet på bordet\| i kortbredder. På bordet: avståndet i bilden delat med kortbredden där korten ligger (98 px i övre raden, 105 px i nedre, uppmätt i rutorna 240 och 450). Median och 90:e percentilen | lägre |
| **Falska omlott** (p0921) | kortpar som täcker varandra till mer än en femtedel på mattan men inte rör varandra på bordet (och inte är samma hög i facit) | lägre |
| **Kort utanför kanten** (p0921) | kort · rutor, 2,5 s efter varje facit-ruta | lägre |
| **Kort i facit som saknas** (p0921) | facit-kort utan ett kort på mattan (ej nedtonat). I parti-kedjan: inget kort, oframkallat kort eller platshållare inom 0,5 kortbredd från facits läge på mattan (parat på plats) | lägre |

– betyder att måttet inte går att räkna för fallet (inget facit för det),
aldrig 0. Totalt räknas över fallen med telefonens ström (golden och
p0922): antal summeras, tider ur alla händelser ihop. p0921 och parti-kedjan står
i egna kolumner och räknas inte in.

**Grinden** i `--jamfor` är, per kolumn (`GRIND` i `kor.cjs`):

| Kolumn | Grindar |
|---|---|
| **totalt** (golden och passet ihop) | varje mått |
| **p0921** (facit som ideal telefon, MES-342/338:s fall) | varje mått |
| **parti-kedjan** (partiet genom kedjan) — först när baslinjen sparats med parti-kedjan: `--jamfor` kör baslinjens fall | avståndsfel median och p90, falska omlott, utanför kanten (kort · rutor, antal kort, kortsekunder), saknade kort, hopp, snabba hopp, zoom/pan som hoppar. **Inte**: det som räknar på namn (kom med namn, borttagna, tid till borta, tid till rätt plats, flyttar, utbytta, nya kort utan utspel, fel nedtoning, fel till handen), platshållare, platshållarsekunder, laddtexter, zoom och pan per minut — och tills MES-344 är inne utspel som syntes och tid till något syns. **När MES-344 är inne ska de två grinda** |

Sämre = antal som blivit större (exakt), tider som blivit mer än 0,1 s
längre, kvoter vars täljare blivit mindre, och – där baslinjen hade ett tal.
Sämre rader som inte grindar (per fall, och parti-kedjans diagnosrader) skrivs
som **VARNING** — diagnos, fäller inte. Bättre
rader skrivs också.

## Kontrollräknat för hand (2026-10-07)

Varje mått stämdes av mot underlaget innan det kallades mätt:

| Mått | Ögonblick | Vad jag såg |
|---|---|---|
| Tid till något syns / kortet kom | g09 Plains (facit 4,5 s) | Videon: handen släpper kortet ~4,0 s, fri vid 4,2. Loggen: spår 1 `ny` utan namn i rapporten 4,05 → platshållare 4,05 (−0,45); `klar` Plains 4,2 → kortet 4,2 (−0,3). Facit ligger ~0,5 s efter släppet här |
| Tid till något syns | p0922, utspelen med kort | Kortets tid är densamma som `dev/spegelfacit/jamfor.cjs` ger på samma logg (Flutterfox +0,49, Pharika +2,13, Mirran +2,10, Trusty +0,73, Ancestral Blade +1,86) — ett annat verktyg, på ett utdrag ur avstämningen |
| Något syns utan kort | p0922 Pharika 217,24 och Killing Glare 35,02 | Pharika: platshållaren +0,86 bär Pharika i spåret (jamfor: "bara en fråga i granskningen (Pharika's Chosen)"). Den förra regeln tog en annan platshållare −1,69. Killing Glare: spår 2 gissade Proctor's Gaze — räknas inte |
| Tid till borta, borttagna som står kvar | g07 Fencing Ace 29,5 / Plains 32 | Videon: Fencing Ace borta 30,0, Plains lyfts 31,5–32,5. Mattan tonar ned Fencing Ace 36,15 (+6,65) — samma som `dev/dubbletter.cjs --fall 07`. Plains står kvar till slutet (dubbletter: "c6 Plains (i nåd)" i slutbordet) |
| Nya kort utan utspel | g07 Swamp 31,8 | Videon 32,5–36,2: ett Swamp, som låg under Plains. Mattan skapar ett andra Swamp när Plains lyfts (dubbletter: c4 och c10 Swamp i slutbordet) |
| Utbytta kort, fel nedtoning | p0922 Swamp, facit flyttar 207,02 | Kontaktarket 205–214: det ensamma Swamp till höger flyttas in i högen (208–210). Mattan skapar ett nytt Swamp i högen 210,45 och tonar ned det gamla 216,3. (`jamfor.cjs` kallar raden en flytt, men det är ett annat Swamp som knuffades 0,2 kortbredd) |
| Snabba hopp | p0922 Mirran Bardiche 227,5 | Banan: nedtonat 138,75–227,4, binds om och glider 3,5 kortbredder på 420 ms (211 px på en ruta). Det är en glidning — räknas inte längre |
| Hopp utan rörelse | alla fall: 0 | Detektorn provad: samma körning med `matSynk` utan rörelser (`--fil`, `animera = false`) ger 131 hopp i totalt och slutkod 1 |
| Tid till rätt plats | g07 Thriving Moor 5,77 s | Banan: kortet ligger 6,2–11,27 och flyttas 0,32 kortbredd 11,27–11,47. Videon 10,5–12,5: handen knuffar kortet lite när Ukud Cobra läggs bredvid |
| Flyttar som glider | g12 Pharika 40,5 | Videon 38,5–41,5: handen bär kortet åt höger. Mattan glider kortet efter i steg 38,9–41,4 (samma element) |
| Mattans zoomändringar | g12 7,35 / 7,8 / 7,95 (solo) | Visaren: "100% fit" med platshållaren vid 7,85, "73% fit" med kortet vid 8,4. Zoomen slår fram och tillbaka när bordet går mellan tomt och ett kort |
| Zoom som hoppar | p0921 (med motståndare och ResizeObserver) | Rutan runt mattan ändras när första kortet kommer (solo mättes 1380 × 847 → 1011 × 817 px: panelen till höger och tipsraden dyker upp efter att zoomen räknats); bordsvyns ResizeObserver kör `matResize`, som skriver zoomen utan glidning: ett hopp. De tre korten utanför kanten vid ruta 240 (solo, utan ResizeObserver) försvinner då |
| Platshållare | g09: 10 | Loggen: spåren 1–10 är alla utan namn en stund (spår 1: 3,3–4,05, spår 6: 20,1–22,05 …) |
| Laddtexter | g09: 14 | Visarens bild vid 21,0: två "Reading the card…" på mattan |
| Avståndsfel | p0921 ruta 240, kort 1–2 (Serpent Assassin, Danitha) | Facit (18, 28) och (34, 28): 113 px / 98 px = 1,15 kortbredder. Mattan 414 → 606 px: 1,08. Fel 0,07, och de ligger inte omlott på mattan |
| parti-kedjan: tid till något syns | Night's Whisper 427 (facit 76,28 %) | Rutorna 427–428: handen lägger kortet, det ligger 428. Loggen: spår 262 fanns redan 408–411,75 på Valkyrie's Swords plats (78,26 %, kortet till graveyard 411) och kommer tillbaka 427,80, 13 px från facits plats, `okand` — det föds inte då. Mattan: platshållare för spår 262 428,1 ("Reading the card…", sedan "Fill in Night's Whisper?") → +1,1 s, samma som uppspelaren |
| parti-kedjan: missat utspel | Valkyrie's Sword 246,5 | Ruta 240–244: tom grön ram där Killing Glare låg (taget 232). Loggen: spår 6 står kvar där 241,5–256,5 (12 px), mattans platshållare för spår 6 sedan 235,35 — inget nytt föds när kortet läggs, alltså miss (10 s) |
| parti-kedjan: avståndsfel | ruta 450, Serpent Assassin (19,27 %) och Danitha (37,24 %) | Bordet: 127,6 px / 97,8 px (kortbredden vid y 27 och 24 %) = 1,30 kb. Mattan 451 på 8114741: platshållarna för spår 296 och 205 (telefonen: 20,28 och 37,27 %) i 418,247 och 617,233 → 199,5 px / 178 = 1,12 kb, fel 0,18. På 2f2fd99 (MES-342): 463,287 och 705,267 → 242,8 px = 1,36 kb, fel 0,06 |
| parti-kedjan: falskt omlott (8114741, före MES-342) | ruta 360, spår 184 och 194 | Ruta 360: armen täcker nedre raden; facit Trusty Retriever 79,35 och kortet 78,73 i högen nere till höger, 1,63 kb isär. Telefonens låda för 194 är bara överkanten (126 × 91 px, mitt 74,63 %), så platshållaren hamnar 165 px under Trusty Retrievers på mattan — mindre än ett korts höjd (248) |
| Grinden | granskarens varianter | `avstamBord` som kastar varannan rapport: kod 2. `BORTA_NAD` 15 s: tid till borta 7,25 → 10, borttagna som står kvar 7 → 10, kod 1. Inga platshållare: utspel som syntes 31 → 29 av 36, kod 1. Samma fil: kod 0 |

## Vad baslinjen säger (main 2026-10-07, a59238e, med motståndare)

Tabellen: [`baslinje/baslinje.md`](baslinje/baslinje.md). Bilder ur visaren:
`baslinje/bilder/`. Det som sticker ut:

- **Korten glider redan** (MES-334 steg 2): 0 hopp utan rörelse och 0
  snabba hopp i alla fall.
- **Zoomen hoppar.** 31 zoomändringar utan glidning i golden och passet
  (3,6 ändringar per minut): bordsvyns `ResizeObserver` kör `matResize` när
  rutan runt mattan ändras — panelen Last card, raden "N cards to fill in" —
  och den skriver zoomen direkt. I p0921 hoppar zoomen en gång, vid första
  kortet. Det är det MES-338 ska rätta.
- **Platshållarna och laddtexterna** dominerar: 284 platshållare och 330
  laddtexter i golden och passet (220 i passet ensamt, 700 s på mattan).
- **Passet 2026-09-22:** 8 fel nedtoningar/borttagningar, 6 nya kort som
  inte finns, 3 av 18 flyttar glider, något syntes i 10 av 14 utspel och
  kortet med namn kom i 8.
- **Korten flyttar sig efter att de landat** — en knuff, skalan, eller en
  zoom som flyttar kortet ur graveyard-rutan: tid till rätt plats har median
  2,0 s och flera missar (10 s).
- **p0921 (facit som ideal telefon):** avståndsfelet är litet (median 0,07,
  p90 0,18 kortbredder), inga falska omlott och inga kort utanför kanten.
  Serpent Assassin ovanpå Danitha i ruta 240 uppstod alltså inte i mattans
  räkning från bild till bräde — i inspelningen kom det ur telefonens lådor.

## Gränser

- **Vad p0921 inte kan mäta.** Facit matas som en telefon utan händer: inga
  spår som är skymda (`skymd`), inga som rör sig, inga som föds och dör, och
  bara ett bord var tionde sekund — alltså inga tider. Därför mäter p0921
  **inte** MES-341:s scener (handen fryser, flytt utan att vänta på namnet),
  **inte** MES-344:s "något syns inom 0,5 s" och **inte** MES-342:s mål om
  falska omlott så som de uppstår i telefonens lådor. Det p0921 mäter är hur
  mattan placerar korten när lägena är rätt: avstånd, omlott, kanten, zoomen.
  Tider och händer i partiet 2026-09-21 mäts i parti-kedjan.
- **Vad parti-kedjan inte är.** Det är inte telefonens egen ström: bilden är 704
  px bred i stället för 4K, Mesas ramar ligger i bilden och kedjan körs
  utan Claude. Därför kommer nästan inga namn, och allt som räknas på namn
  (kortet kom med namn, borttagningar, flyttar, utbytta) mäter kedjans
  namnlöshet mer än mattan, och platshållarna och laddtexterna likaså. Det
  som håller är v2-rutornas geometri, saknade kort, hoppen och zoomhoppen
  — det som grindar — och, när MES-344 är inne, när något syns. Med Claude (`--ai`, som telefonen i partiet) eller
  telefonens egen 4K-inspelning av ett nytt parti blir namnen riktiga.
- **Saknade kort parades förut på telefonens nuvarande spår**, och det
  fällde MES-344 för fel sak. Med MES-344 v2 (c7baf19, `--fil`) blev det 73
  saknade mot 45 på main; 22 av de 29 nya syntes ändå (telefonen gav kortet
  ett nytt spår-id, median 0,9 s före ögonblicket, och MES-344:s kort låg
  kvar på det äldre spåret inom 0,5 kortbredd), och 7 syntes inte: sex
  ytterligare kort i landhögar vars nya, olästa spår inte får något och
  Faithful Pikemaster 530. **På plats** (sedan 2026-10-07): main 26, c7baf19
  29. Av de 22 eftersläpningarna räknas 20 inte längre (300 spår 133 saknas
  också på main; 500 spår 392 i vänstra landhögen saknas på c7baf19). Av de
  7 räknas 6 (290, 330, 440, 450, 510 och 530); 360 spår 194 (armen över
  högen, telefonens låda bara överkanten) har något inom 0,5 kortbredd.
  Nya mot main på c7baf19 är just de sex plus 500.
- **Borttagna kort som står kvar** i parti-kedjan: kortet låg oftast aldrig på
  mattan som kort, bara som platshållare. `--detalj parti-kedjan` skriver "fanns
  inte som kort på mattan" för dem.
- Korten ritas som namnlappar (nätet är spärrat, ingen kortbild laddas).
- Visaren kör i riktig tid i en iframe; mätningen kör huvudlöst i ett svep.
  Det de visar är samma kod på samma klocka, men visaren kan ligga någon
  ruta efter vid uppspelning i 1×.
- Golden-fallens tider är relativa facits avläsning (~0,5 s efter släppet).
- Perspektivet i p0921 är uppmätt för hand i två rutor (~7 %). Ett nytt
  facit med kortets storlek per rad gör avståndsfelet skarpare.
- Kortet på väg ut ur mattan (MES-343:s rörelse mot handen) är en kopia i
  mattans fönster utanför brädet (`.handflyg` i `#gridWrap`), så den syns
  inte för motorn: varken som snabbt hopp eller utanför kanten. Kortets
  död räknas när elementet försvinner ur brädet, i samma steg som beslutet.

## Filer

| Fil | Vad |
|---|---|
| `kor.cjs` | kommandot: fallen, Chrome, måtten, baslinjen, jämförelsen, visaren |
| `motor.js` | motorn i appens sida: klockan, timrarna, animeringarna, loggen |
| `matt.cjs` | måtten ur loggen och facit |
| `fall.cjs` | fallen: bordslogg, facit, bild |
| `frys-kedja.cjs` | fryser partiets bordslogg genom kedjan (`spegel-lokal.json`, start 180) till `underlag/2026-09-21-kedja-bordlogg.json.gz` och skriver engångsanalysen mot v2 (`--bara-analys`: bara den) |
| `chrome.cjs` | filservern och Chrome (som `dev/mattan.cjs`) |
| `visa.html` | visaren |
| `underlag/` | frysta golden-bordsloggar, v2-tabellen för 2026-09-21, partiets bordslogg genom kedjan (`2026-09-21-kedja-bordlogg.json.gz`) och dess händelsefacit (`2026-09-21-handelser.tsv`) |
| `baslinje/` | baslinjen för main: `baslinje.json` (grinden läser den), `baslinje.md`, `bilder/` |

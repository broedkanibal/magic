# Kartan över Mesas mätningar

Vad som mäts, med vad, och när. Den här sidan har **inga siffror**, bara
förklaringar. De senaste siffrorna visar skillen `/measurements`
(`node dev/measurements/show.cjs`), som bygger på den här kartan.

## Namnen

Namnen är på engelska (Jespers beslut 2026-10-08). Två mappar byter namn i
prompt H; tills dess gäller den gamla mappen.

| Namn | Mapp och kommando | Hette förut |
|---|---|---|
| **Golden** | `dev/golden/` | |
| **Event test** | `dev/spegelfacit/`, blir `dev/eventtest/` | händelseprovet, spegelfacit |
| **Mat test** | `dev/uppspelaren/`, blir `dev/mattest/` | mattprovet, uppspelaren |
| **Deck golden** | `dev/lekgolden/` (byter inte namn) | lekfotot, lekgolden |
| **Latency** | `dev/latens/` | latens |
| **Component tests** | se avsnitt 6 | delprov, bänkarna |

Två riktiga partier är inspelade:

| Namn | Vad | Används i |
|---|---|---|
| **Game 22/9** | 4 min 46 s, telefonen 34 cm över mattan. Jesper sa högt vad han gjorde, och rösten blev facit | Event test, Mat test, component test *Piles* |
| **Game 21/9** | 20 min i 4K, men telefonens egen film finns inte. Bara en skärminspelning av datorn finns. Sek 230–540 används | Mat test (som facit och genom kameran) |

## 1. Fem frågor, ett verktyg per fråga

| Grupp | Frågan | Verktyg | Material | Claude |
|---|---|---|---|---|
| **Kameran läser korten** | Känner kameran igen korten, och sätter den rätt namn? | **Golden** | 18 fall: 11 foton + 7 videor | utan (förval) och med |
| | Blir leken rätt när spelaren fotograferar den? | **Deck golden** | 15 foton av en utlagd 40-kortslek | bara med |
| **Kameran följer spelet** | Kommer varje utspel, tap och borttagning fram, i tid? | **Golden, videofallen** | 7 korta videor | utan och med |
| | Följer det digitala bordet ett helt riktigt parti? | **Event test** | 1 lång video, Game 22/9 | utan och med |
| **Mattan visar bordet** | Beter sig korten på skärmen rätt: inga hopp, rätt plats, borta i tid? | **Mat test** | inspelade loggar från 8 fall | ingår inte |
| **Fart på riktig telefon** | Hur lång tid tar det från att kortet släpps tills namnet syns? | **Latency** | dina pass med riktig telefon | med, som i spelet |
| **Component tests** | *Var* i kedjan går något fel? | fem component tests, se avsnitt 6 | utklippta bitar och konstgjorda bilder | ingår inte |

**Golden och lekfotot är grindar.** Blir de sämre stoppas ändringen. Det gäller
också Mat test för spegelmattan. Component tests är diagnos: de förklarar varför
en grind rörde sig, men stoppar inget. Det är Jespers beslut från 2026-10-06.
Undantaget är *Camera rules*, som körs före varje push.

## 2. Verktygen ett och ett

### Golden: kameran läser korten

- **Vad:** appens riktiga kamerakod körs på 18 inspelade bord där vi vet
  exakt vilka kort som ligger var (facit). Sedan räknas hur många kort den
  hittade och namngav rätt.
- **Måtten, i läsordning:** fel namn (ska alltid vara 0) → hittade → rätt
  namn → utlagda med namn (bara videor). Resten (högar, land per typ, falska,
  tap) är felsökning.
- **Körs när:** kamerakod som ska behållas hamnar på main, eller när facit
  eller en video ändras. Inte för gränssnitt, dokument eller datorsidan.
- **Tid:** ~25 min. Utan Claude kostar det inget. Med Claude (`--ai`) kostar
  det 10–20 cent.
- **Kommando:** `node dev/golden/kor.cjs` · guide: `dev/golden/SNABBGUIDE.md`
- **Resultat:** `dev/golden/historik.md` (en rad per körning),
  `dev/golden/senaste.json` (baslinjen utan Claude) och `senaste-ai.json`
  (med Claude).

### Golden, videofallen: förloppet

Videofallen körs **som video**, inte som stillbilder:

1. Golden matar in en bildruta i taget, en per 150 ms video.
2. Appens klocka sätts till **videons tid**. Därför väntar golden in varje
   ruta, och samma video ger alltid samma svar, hur belastad datorn än är.
3. Kameran följer korten genom hela filmen, som i appen.
4. Resultatet jämförs med facits lista över vad som hände och när.

| Mått | Betyder |
|---|---|
| utlagda med namn | av korten som läggs ut: hur många fick säkert rätt namn någon gång |
| borttagna | kort som plockas bort: ligger de inte kvar i slutet? |
| ordning | såg kameran utspelen i rätt ordning? |
| tap | upptäcktes vridningarna? |
| fördröjning | sekunder **i videon** från att kortet läggs till att det får namn |

**Fördröjning är videotid, inte fart.** Måttet svarar på "hur mycket av
filmen behöver kameran se?". Att datorn eller telefonen är långsam syns aldrig
här. En suddig eller hårt komprimerad video gör siffran sämre. Fall 18:s 34 s
var komprimeringen: samma inspelning i en skarpare fil gav 1 s.

### Event test: ett helt parti (`dev/spegelfacit/`)

- **Vad:** ett riktigt parti (Game 22/9) körs genom kameran. Sedan
  spelas telefonens rapporter upp genom **datorns** avstämning, den kod som
  bygger det digitala bordet. Till sist jämförs bordet med en handskriven
  lista över partiets händelser, rad för rad.
- **Skillnad mot golden:** golden räknar vad **telefonens kamera** såg.
  Event test räknar vad som syntes på **det digitala bordet**, inom ett
  fönster på 2 s före till 10 s efter händelsen, och om kortet hamnade på
  rätt plats och i rätt tap-läge.
- **Körs när:** vid utredningar av spegelläget. Det finns ingen baslinje och
  ingen grind.
- **Tid:** ~25 min plus några sekunder för jämförelsen.
- **Kommando:** `node dev/spegelfacit/kor.cjs` och sedan
  `node dev/spegelfacit/jamfor.cjs` · guide: `dev/spegelfacit/LÄS-MIG.md`
- **Resultat:** `dev/spegelfacit/resultat/<pass>-lokal.md` (utan Claude) och
  `…-ai.md` (med Claude).

### Mat test: mattan (`dev/uppspelaren/`)

- **Vad:** spelar upp vad kameran **redan sa**, en inspelad logg, genom
  appens riktiga mattkod med en simulerad klocka. Kameran körs inte. Den
  mäter hur korten på skärmen beter sig: hopp, utbytta kort, tid till något
  syns, tid till rätt plats, tid till borta, zoom och panorering.
- **Körs när:** för varje ändring av spegelmattan, som grind
  (`--jamfor` mot baslinjen). `dev/kolla.sh` kör den också före varje push,
  men bara för att se att den fungerar. Jämförelsen mot baslinjen görs där inte.
- **Tid:** ~25 s.
- **Kommando:** `node dev/uppspelaren/kor.cjs` · guide: `dev/uppspelaren/LÄS-MIG.md`
- **Resultat:** `dev/uppspelaren/baslinje/baslinje.md`

Fallen:

| Fall | Vad det är |
|---|---|
| g07, g09–g12 | golden-videofallens loggar (frysta 2026-10-03) |
| Game 22/9 (`p0922`) | kamerans logg från en körning 2026-10-04 |
| Game 21/9 som facit (`p0921`) | **facit** matas in som en perfekt telefon. Mäter bara mattans geometri, inte kameran |
| Game 21/9 genom kameran (`parti-kedjan`, hette `p0921k`) | samma parti, men **genom kameran**. Se nedan |

**Vad är Game 21/9 genom kameran, och hur skiljer det sig från Event test?** Det är ett annat
och längre parti (sek 230–540 av 20 min). Telefonens egen film finns inte,
bara en skärminspelning av datorn där kamerabilden syns i 704 × 438 px med
Mesas ramar ovanpå. Den bilden kördes genom kameran (med Event tests steg 1),
och loggen frystes. Mat test mäter sedan **var mattan lägger korten**. Det
fungerar: 90 % av korten hittas på rätt plats. Namnen däremot nästan inte, för
bilden är för liten.

| | Event test | Mat test, Game 21/9 genom kameran |
|---|---|---|
| Parti | Game 22/9 | Game 21/9 |
| Frågan | kom varje händelse fram till det digitala bordet? | ligger korten rätt på mattan, och hoppar de? |
| Mäter namn | ja | nästan inte (bilden är för liten) |

### Deck golden: lekfotot (`dev/lekgolden/`)

- **Vad:** spelarens foton av sin utlagda lek går genom telefonens
  beskärning, Claude, Scryfall och lekens regler. Det som kommer ut jämförs
  med facit: tio *set* av foton som tillsammans ska ge exakt leken.
- **Två vägar:** `hela` (filväljaren, hela fotot) och `ram` (kamerans ram).
- **Körs när:** när lekfotots kod eller dess prompt ändras. Det kostar
  Claude-anrop, men svaren sparas så att en omkörning är gratis.
- **Kommando:** `node dev/lekgolden/kor.cjs` · guide: `dev/lekgolden/SNABBGUIDE.md`
- **Resultat:** `dev/lekgolden/historik.md` och `senaste.json`

### Latency: fart på riktig telefon

- **Vad:** den enda mätningen av **verklig** tid. Du spelar med telefonen,
  appen loggar varje händelse, och analysen räknar tiden från att handen
  släpper kortet till att datorn ritat det. Målet är 0,3 s till namn.
- **Hur:** öppna appen med `?debug`, gå till kameradialogen → *Latency*,
  spela och spara filen. Kör sedan `node dev/latens/analys.cjs <fil>`.
- **Körs när:** när du gör ett telefonprov. Senaste pass: 2026-09-21.
- **Guide:** `dev/latens/LÄS-MIG.md` · läsa rapporten: `dev/golden/SNABBGUIDE.md`,
  avsnittet *Läsa rapporten mot målen*.

## 3. Händelserna

Både golden-videorna och Event test har en handskriven lista över vad som
hände. Typerna:

| Händelse | Vad spelaren gjorde | Golden-videor | Event test |
|---|---|---|---|
| spelar | lade ut ett kort | 07, 09–13, 18 | ja |
| tappar / otappar | vred kortet, eller vred tillbaka det | 09, 13, 18 | ja |
| flyttar | flyttade ett kort på bordet | 09, 12, 13, 18 | ja |
| tar_bort | tog bort ett kort (`till` = till graveyard) | 07, 10, 11, 12 | ja |
| grav_till_bord | tog upp ett kort från graveyard till bordet | – | ja |
| grav_ur_bild | ett kort lämnade graveyard och kamerans bild | – | ja |
| drar | drog ett kort från leken | – | ja (appen kan inte se drag i dag) |

Samma sorts lista räknas på två ställen:

- **Golden** räknar på **telefonens** spår: fick något spår säkert rätt namn
  *någon gång* under filmen?
- **Event test** räknar på **datorns** digitala bord, inom ett tidsfönster,
  med plats och tap-läge.

## 4. Materialet: vad kameran faktiskt tittar på

Det finns tre sorters material:

| Etikett | Betyder |
|---|---|
| **ren kamera** | telefonens egen bild: ett foto ur kameraappen eller en film ur kameraappen |
| **skärminspelning** | en inspelning av Mesas skärm. Mesas ramar runt korten finns inbrända i bilden, och bilden är mindre och mer komprimerad än vad telefonen ser |
| **konstgjort** | en bild som har ändrats i efterhand |

| Golden-fall | Foto/video | Material | Vad fallet provar |
|---|---|---|---|
| 01 trä, lampa, 60 cm, 3 kort | foto | skärminspelning | enkla kort på avstånd |
| 02 trä, lampa, 150 cm, 4 kort | foto | skärminspelning | långt avstånd |
| 03 trä, lampa, 40 cm, 11 kort | foto | ren kamera | kort omlott |
| 04 trä, dagsljus, 8 kort | foto | ren kamera | kort omlott |
| 05 ribbor, dagsljus, 6 kort | foto | ren kamera | randigt bord, kort omlott |
| 06 ljusgrå, dagsljus, 12 kort | foto | ren kamera | kort omlott, skål i bild |
| 07 trä, dagsljus, 5 kort | video | skärminspelning | utspel och borttagning med handen i bild |
| 08 = 01 + en kortbaksida | foto | konstgjort | baksidan ska inte bli ett namn |
| 09 svart matta, tap | video | skärminspelning | tap, otap, flytt |
| 10 svart matta, graveyard | video | skärminspelning | kort till graveyard |
| 11 svart matta, gravfällor | video | skärminspelning | fällor för graveyard-högen |
| 12 svart matta, provkort | video | skärminspelning | uppstartens provkort (steg 4 finns sedan 2026-10-05 bara kvar i *Use camera to add cards*) |
| 13 svart matta, 10 kort, tokens | video | ren kamera (4K) | ett riktigt spels turer 1–4: tap, otap, flytt, tokens |
| 14 ljust trä, lampa, 11 kort | foto | ren kamera | omlott, ljus 1 |
| 15 samma kort, dagsljus | foto | ren kamera | omlott, ljus 2 (samma kort, bara ljuset ändrat) |
| 16 ljust trä, 8 kort | foto | ren kamera | utspritt, inget omlott |
| 17 vitt bord, mörker, 12 kort | foto | ren kamera (bild ur en film) | ljust bord i mörker, högar |
| 18 trä, sidoljus, 0,5× | video | ren kamera (4K, i golden nedkodad till 1080p 1500 kbit/s) | samma manus som 13, med vidvinkel och sidoljus |

Övrigt material:

| Var | Material |
|---|---|
| Event test, Game 22/9 | skärminspelning (Mesas ramar från ~29 s) |
| Mat test, Game 21/9 genom kameran | skärminspelning av datorn, 704 × 438 px |
| Deck golden | ren kamera (15 foton) |
| Latency | riktig telefon, inget inspelat material |

**Beslut 2026-10-07:** skärminspelningarna behålls tills det finns ersättare.

## 5. Med och utan Claude

**Förvalet är alltid utan Claude.** Det mäter telefonens egen igenkänning,
kostar inget och ger samma svar varje gång. Med Claude mäts hela kedjan som
spelaren möter den.

| Verktyg | Utan Claude | Med Claude |
|---|---|---|
| Golden | `node dev/golden/kor.cjs` | `--ai` |
| Event test | `-lokal` | `--ai` |
| Mat test | ja (loggarna är inspelade utan Claude) | – |
| Deck golden | – (det är Claude som läser fotot) | ja |
| Latency | – | ja (riktiga pass) |
| Component tests | ja | – |

## 6. Component tests (hette delprov och bänkar)

En provbänk lyfter ut en del av kedjan och provar den ensam. Golden provar
hela kedjan och kan bara säga *att* något blev sämre. Component tests säger *var*.

| Component test | Delen | Material | Kommando | Körs när |
|---|---|---|---|---|
| **Camera rules** (kamerans regler, kamerabänken) | rörelse, hand över kortet, flimmer, ljusändringar, skakning | konstgjorda bilder som skriptet ritar | `node dev/kamerabank.cjs` | före varje push (`dev/kolla.sh`) |
| **Image model, whole cards** (helkortsbänken) | känner bildmodellen igen ett helt kort? | 61 utklippta kort ur golden | `dev/remsa/helkort_jamfor.py` | ny bildmodell |
| **Image model, strips** (remsbänken + remsregeln) | namnremsan på kort i högar | remsor ur golden, 13b, blänkfilmen MES-246 och Jespers lek | `dev/remsa/remsexp.py` + `remsregel.py` | ny bildmodell eller tröskel |
| **Detector** (detektorbänken, parprovet) | hittar detektorn varje kort och varje remsa? | blänkfilmen MES-246 med ritade hörn, plus golden | `dev/detektor/tran/parprov.py` | ny detektor eller ändrad parning |
| **Piles** (högarna) | läses korten i en hög? | 68 högar ur Game 22/9 och golden (`dev/detektor/hogbank-facit.json`) | `dev/remsa/hogbank_remsor.py` | när högläsningen ändras |

Component tests i Python körs med `~/.mesa/detektor-venv/bin/python`.

## 7. Det som är arkiverat eller borttaget

| Vad | Läge |
|---|---|
| **Högbänken** `dev/hogbank.cjs` | arkiverad 2026-10-08 som taggen `arkiv/mes-250-hoglasning`. Den provade en gammal idé, att räkna kortkanterna i en hög, som inte klarade sin grind. Samma 68 högar mäts i dag av component testen *Piles*, med dagens sätt att läsa |
| **Matcher-bänken** `dev/bench.html` | borttagen 2026-10-08. Den provade en gammal kopia av bildjämförelsen. Den finns kvar i git (`git show 6dfb2b1:dev/bench.html`) |

## 8. Kända luckor

| Lucka | Följd |
|---|---|
| Båda helpartierna (Game 22/9 och Game 21/9) är skärminspelningar | ingen mätning visar hur ett helt parti ser ut genom telefonens egen 4K-bild |
| Golden-videorna 07 och 09–12 är skärminspelningar | tap, graveyard och provkort mäts på mindre, komprimerade bilder med Mesas ramar i |
| Latency senast mätt 2026-09-21 | detektorn, bildmodellen och remsan har ändrats sedan dess, så ingen vet dagens fart på telefonen |
| Event test senast kört 2026-09-23 | koden har ändrats sedan dess |

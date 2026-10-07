# Kartan över Mesas mätningar

Vad som mäts, med vad, och när. Den här sidan har **inga siffror**, bara
förklaringar. De senaste siffrorna visar `/mätningarna` (byggs ovanpå den här
kartan).

## Namnen

Verktygen heter något annat i koden än här. Kommandona är oförändrade.

| Namn här | Mapp och kommando | Hette förut |
|---|---|---|
| **Golden** | `dev/golden/` | |
| **Händelseprovet** | `dev/spegelfacit/` | spegelfacit |
| **Mattprovet** | `dev/uppspelaren/` | uppspelaren |
| **Lekfotot** | `dev/lekgolden/` | lekfotots golden |
| **Latens** | `dev/latens/` | |
| **Delprov** | se avsnitt 6 | bänkarna |

Två riktiga partier är inspelade:

| Namn här | Vad | Används i |
|---|---|---|
| **Parti 22/9** | 4 min 46 s, telefonen 34 cm över mattan. Jesper sa högt vad han gjorde, och rösten blev facit | händelseprovet, mattprovet, högarnas delprov |
| **Parti 21/9** | 20 min i 4K, men telefonens egen film finns inte. Bara en skärminspelning av datorn finns. Sek 230–540 används | mattprovet (som facit och genom kameran) |

## 1. Fem frågor, ett verktyg per fråga

| Grupp | Frågan | Verktyg | Material | Claude |
|---|---|---|---|---|
| **Kameran läser korten** | Känner kameran igen korten, och sätter den rätt namn? | **Golden** | 18 fall: 11 foton + 7 videor | utan (förval) och med |
| | Blir leken rätt när spelaren fotograferar den? | **Lekfotot** | 15 foton av en utlagd 40-kortslek | bara med |
| **Kameran följer spelet** | Kommer varje utspel, tap och borttagning fram, i tid? | **Golden, videofallen** | 7 korta videor | utan och med |
| | Följer det digitala bordet ett helt riktigt parti? | **Händelseprovet** | 1 lång video, Parti 22/9 | utan och med |
| **Mattan visar bordet** | Beter sig korten på skärmen rätt: inga hopp, rätt plats, borta i tid? | **Mattprovet** | inspelade loggar från 8 fall | ingår inte |
| **Fart på riktig telefon** | Hur lång tid tar det från att kortet släpps tills namnet syns? | **Latens** | dina pass med riktig telefon | med, som i spelet |
| **Delprov** | *Var* i kedjan går något fel? | fem delprov, se avsnitt 6 | utklippta bitar och konstgjorda bilder | ingår inte |

**Golden och lekfotot är grindar.** Blir de sämre stoppas ändringen. Det gäller
också mattprovet för spegelmattan. Delproven är diagnos: de förklarar varför
en grind rörde sig, men stoppar inget. Det är Jespers beslut från 2026-10-06.
Undantaget är *kamerans regler*, som körs före varje push.

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

### Händelseprovet: ett helt parti (`dev/spegelfacit/`)

- **Vad:** ett riktigt parti (Parti 22/9) körs genom kameran. Sedan
  spelas telefonens rapporter upp genom **datorns** avstämning, den kod som
  bygger det digitala bordet. Till sist jämförs bordet med en handskriven
  lista över partiets händelser, rad för rad.
- **Skillnad mot golden:** golden räknar vad **telefonens kamera** såg.
  Händelseprovet räknar vad som syntes på **det digitala bordet**, inom ett
  fönster på 2 s före till 10 s efter händelsen, och om kortet hamnade på
  rätt plats och i rätt tap-läge.
- **Körs när:** vid utredningar av spegelläget. Det finns ingen baslinje och
  ingen grind.
- **Tid:** ~25 min plus några sekunder för jämförelsen.
- **Kommando:** `node dev/spegelfacit/kor.cjs` och sedan
  `node dev/spegelfacit/jamfor.cjs` · guide: `dev/spegelfacit/LÄS-MIG.md`
- **Resultat:** `dev/spegelfacit/resultat/<pass>-lokal.md` (utan Claude) och
  `…-ai.md` (med Claude).

### Mattprovet: mattan (`dev/uppspelaren/`)

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
| Parti 22/9 (`p0922`) | kamerans logg från en körning 2026-10-04 |
| Parti 21/9 som facit (`p0921`) | **facit** matas in som en perfekt telefon. Mäter bara mattans geometri, inte kameran |
| Parti 21/9 genom kameran (`parti-kedjan`, hette `p0921k`) | samma parti, men **genom kameran**. Se nedan |

**Vad är Parti 21/9 genom kameran, och hur skiljer det sig från händelseprovet?** Det är ett annat
och längre parti (sek 230–540 av 20 min). Telefonens egen film finns inte,
bara en skärminspelning av datorn där kamerabilden syns i 704 × 438 px med
Mesas ramar ovanpå. Den bilden kördes genom kameran (med händelseprovets steg 1),
och loggen frystes. Mattprovet mäter sedan **var mattan lägger korten**. Det
fungerar: 90 % av korten hittas på rätt plats. Namnen däremot nästan inte, för
bilden är för liten.

| | Händelseprovet | Mattprovet, Parti 21/9 genom kameran |
|---|---|---|
| Parti | Parti 22/9 | Parti 21/9 |
| Frågan | kom varje händelse fram till det digitala bordet? | ligger korten rätt på mattan, och hoppar de? |
| Mäter namn | ja | nästan inte (bilden är för liten) |

### Lekfotot

- **Vad:** spelarens foton av sin utlagda lek går genom telefonens
  beskärning, Claude, Scryfall och lekens regler. Det som kommer ut jämförs
  med facit: tio *set* av foton som tillsammans ska ge exakt leken.
- **Två vägar:** `hela` (filväljaren, hela fotot) och `ram` (kamerans ram).
- **Körs när:** när lekfotots kod eller dess prompt ändras. Det kostar
  Claude-anrop, men svaren sparas så att en omkörning är gratis.
- **Kommando:** `node dev/lekgolden/kor.cjs` · guide: `dev/lekgolden/SNABBGUIDE.md`
- **Resultat:** `dev/lekgolden/historik.md` och `senaste.json`

### Latens: fart på riktig telefon

- **Vad:** den enda mätningen av **verklig** tid. Du spelar med telefonen,
  appen loggar varje händelse, och analysen räknar tiden från att handen
  släpper kortet till att datorn ritat det. Målet är 0,3 s till namn.
- **Hur:** öppna appen med `?debug`, gå till kameradialogen → *Latency*,
  spela och spara filen. Kör sedan `node dev/latens/analys.cjs <fil>`.
- **Körs när:** när du gör ett telefonprov. Senaste pass: 2026-09-21.
- **Guide:** `dev/latens/LÄS-MIG.md` · läsa rapporten: `dev/golden/SNABBGUIDE.md`,
  avsnittet *Läsa rapporten mot målen*.

## 3. Händelserna

Både golden-videorna och händelseprovet har en handskriven lista över vad som
hände. Typerna:

| Händelse | Vad spelaren gjorde | Golden-videor | Händelseprovet |
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
- **Händelseprovet** räknar på **datorns** digitala bord, inom ett tidsfönster,
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
| Händelseprovet, Parti 22/9 | skärminspelning (Mesas ramar från ~29 s) |
| Mattprovet, Parti 21/9 genom kameran | skärminspelning av datorn, 704 × 438 px |
| Lekfotot | ren kamera (15 foton) |
| Latens | riktig telefon, inget inspelat material |

**Beslut 2026-10-07:** skärminspelningarna behålls tills det finns ersättare.

## 5. Med och utan Claude

**Förvalet är alltid utan Claude.** Det mäter telefonens egen igenkänning,
kostar inget och ger samma svar varje gång. Med Claude mäts hela kedjan som
spelaren möter den.

| Verktyg | Utan Claude | Med Claude |
|---|---|---|
| Golden | `node dev/golden/kor.cjs` | `--ai` |
| Händelseprovet | `-lokal` | `--ai` |
| Mattprovet | ja (loggarna är inspelade utan Claude) | – |
| Lekfotot | – (det är Claude som läser fotot) | ja |
| Latens | – | ja (riktiga pass) |
| Delprov | ja | – |

## 6. Delproven (hette "bänkar")

En provbänk lyfter ut en del av kedjan och provar den ensam. Golden provar
hela kedjan och kan bara säga *att* något blev sämre. Delproven säger *var*.

| Delprov | Delen | Material | Kommando | Körs när |
|---|---|---|---|---|
| **Kamerans regler** (kamerabänken) | rörelse, hand över kortet, flimmer, ljusändringar, skakning | konstgjorda bilder som skriptet ritar | `node dev/kamerabank.cjs` | före varje push (`dev/kolla.sh`) |
| **Bildmodellen, hela kort** (helkortsbänken) | känner bildmodellen igen ett helt kort? | 61 utklippta kort ur golden | `dev/remsa/helkort_jamfor.py` | ny bildmodell |
| **Bildmodellen, remsor** (remsbänken + remsregeln) | namnremsan på kort i högar | remsor ur golden, 13b, blänkfilmen MES-246 och Jespers lek | `dev/remsa/remsexp.py` + `remsregel.py` | ny bildmodell eller tröskel |
| **Detektorn** (detektorbänken, parprovet) | hittar detektorn varje kort och varje remsa? | blänkfilmen MES-246 med ritade hörn, plus golden | `dev/detektor/tran/parprov.py` | ny detektor eller ändrad parning |
| **Högarna** | läses korten i en hög? | 68 högar ur Parti 22/9 och golden (`dev/detektor/hogbank-facit.json`) | `dev/remsa/hogbank_remsor.py` | när högläsningen ändras |

Python-delproven körs med `~/.mesa/detektor-venv/bin/python`.

## 7. Det som inte är på main, och det som är gammalt

| Vad | Läge |
|---|---|
| **Högbänken** `dev/hogbank.cjs` | finns bara på grenen `mes-250-hoglasning` (2026-09-24). Den provar högläsningen som byggdes på samma gren (`hogBand`, `hogLas` i `index.html`), och den klarade inte sin grind. Bänken kan inte flyttas till main ensam, för koden den provar finns inte där. Högarna mäts i stället med `hogbank_remsor.py` mot samma 68 fall |
| **Matcher-bänken** `dev/bench.html` | från första committen 2026-09-02 och aldrig ändrad. Den provar `dev/matcher.js`, en gammal kopia av appens bildjämförelse som inte hålls i takt med appen. Inget annat använder den |

## 8. Kända luckor

| Lucka | Följd |
|---|---|
| Båda helpartierna (Parti 22/9 och Parti 21/9) är skärminspelningar | ingen mätning visar hur ett helt parti ser ut genom telefonens egen 4K-bild |
| Golden-videorna 07 och 09–12 är skärminspelningar | tap, graveyard och provkort mäts på mindre, komprimerade bilder med Mesas ramar i |
| Latens senast mätt 2026-09-21 | detektorn, bildmodellen och remsan har ändrats sedan dess, så ingen vet dagens fart på telefonen |
| Händelseprovet senast kört 2026-09-23 | koden har ändrats sedan dess |

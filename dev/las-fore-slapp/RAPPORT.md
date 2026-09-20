# Går det att läsa kortet innan handen släpper det? (MES-246 del 1)

Natten 19–20 september 2026, på Jespers inspelning
`dev/golden/inspelningar/mes-246/mes-246-video.mov`. Allt som mättes ligger
under `dev/las-fore-slapp/` och går att köra om — se **Köra om** sist.
**Ingenting i kamerakedjan (`index.html`) eller systemprompten är rört.**

## Svaret: nej — kortet är läsbart först när det redan ligger

**Kortet går inte att läsa medan handen håller det.** Jesper håller kortet
med handflatan över och släpper det först när det ligger; under hela vägen
ner är det som syns av kortet en remsa längs en kant. Bildmodellen sätter
rätt namn överst på **2–10 % av rutorna** mer än 0,2 sekunder före släppet —
det är slumpnivå (leken har 28 namn, slumpen ligger på ~4 %).

**Det som går:** i de sista **0,1–0,2 sekunderna** — när kortet ligger nere
men fingrarna ännu rör det — är kortet läsbart. Med kedjans egen bilddom
(modellen + ORB) plus en marginalspärr finns ett rätt och säkert namn före
släppet i **9 av 24 nedläggningar, med 0 fel namn**.

**Men bara 4 av de 9 är riktiga tidiga läsningar.** De andra fem är
basländer som läggs **på en hög av samma land** — modellen svarar "Swamp"
för att det redan ligger ett Swamp där, inte för att den läst kortet i
handen. Det syns på tiden: de fem tänder i median 0,79 s före släppet, alltså
innan kortet ens är framme.

| | Tänder | Median före släppet |
|---|---|---|
| Nytt namn på den platsen (riktig tidig läsning) | **4 av 19** | **0,12 s** |
| Samma kort låg redan där (land på hög) | 5 av 5 | 0,79 s |
| Fel namn | **0** | – |

| Vad frågan var | Svar |
|---|---|
| Kan namnet vara klart före släppet? | I **4 av 19 nedläggningar**, och då 0,1–0,2 s före |
| Hur mycket vinner vi i de fallen? | Namnet är klart **när handen släpper** — kvar är bara nätet och ritningen (~0,1 s) |
| Håller det 0 fel namn? | Ja, med marginalspärren. **Utan den ger kedjans dom 3 fel namn av 12** |
| Räcker 1080p? | **Ja.** 4K och 1080p ger samma siffror (51 % mot 50 % rätt överst, 31 mot 31 säkra, 0 fel i båda) |
| Räcker 30 rutor/s? | **Ja.** Samma utfall som 60 (9 av 24, 0 fel, median 0,10 mot 0,12 s) |

## Hur det mättes

| Steg | Verktyg | Vad |
|---|---|---|
| 1 | `rorelse.swift` | varje bildruta till 360×202 gråskala — **kamerans egen analysbredd** (`AW_MAX` i index.html skalar alltid videon till 240–360 px, 4K som 1080p) |
| 2 | `matt.cjs` | rörelsemåttet på **suddade** rutor. Inspelningen är tagen i lampljus och sensorbruset är stort: medelskillnaden mellan två stilla rutor är 3,2 gråsteg orörd, 0,7 suddad |
| 3 | `stega.cjs` | 66 steg (manusets 53 — ett steg som "untappa hög A, hög B och Thriving Moor" är tre rörelser), med `land`, `släpp` och `stilla` per steg |
| 4 | `sortera.cjs`, `fonster.cjs` | 24 av stegen är nedläggningar av ett kort |
| 5 | `regioner.cjs` | regionen ruta för ruta: samma mått som kameran räknar (andramomenten), plus **detektorns mask** |
| 6 | `klipp.swift` | 1 854 rutor ur 4K, ett utsnitt per ruta som följer regionen (~540 MB) |
| 7 | `skar.js` | förslaget till utskärning: kortets kända mått + dess raka kanter och hörn |
| 8 | `las.html` / `las.cjs` | kedjans **egna** `Embed.identifiera`, `identifyMedModell` och `serUtSomKort` i huvudlös Chrome, som `dev/golden/vriden.cjs` |
| 9 | `rapport.cjs` | tabellerna nedan |

**Facit per steg** ligger bredvid videon: `dev/golden/inspelningar/mes-246/FACIT.md`
och `facit-slapp.json`. **Stillbilder att granska** (tre rutor per sort:
−0,25 s, släppet, stilla) i `facit-bilder/`.

**Släppet** är definierat som Jesper skrev det: sista rutan där handen rör
kortet. Mätt inne i lådan som ändrades — sista rutan där andelen bildpunkter
som ser ut som de gör när bordet vilar ligger under 97 %. När fingrarna
ligger kvar ovanpå ett kort som redan är nere blir släppet någon hundradel
**sent** snarare än tidigt, så svaret ovan är försiktigt, inte optimistiskt.

## a. Hur mycket av kortet syns på vägen ner?

Medianen av hur stor del av kortets rektangel som är **kort** och inte hand,
per tiondels sekund före släppet (`skuren`, 24 nedläggningar, 1 698 rutor):

| Före släppet | Andel av kortet som syns |
|---|---|
| 0,0–0,1 s | 80 % |
| 0,1–0,2 s | 61 % |
| 0,2–0,3 s | 41 % |
| 0,3–0,4 s | 41 % |
| 0,4–0,5 s | 44 % |
| 0,5–0,6 s | 38 % |
| 0,6–0,7 s | 25 % |
| 0,7–0,8 s | 20 % |

Ungefär halva kortet syns alltså ner till en halv sekund före släppet. **Men
det räcker inte** — se c.

## b. Går kortet att skära ut ur hand + kort-regionen?

`skar.js` sorterar bildpunkterna i matta, hud och kort (mattan ur detektorns
egen mask — kortets mörka konstverk är mörkare än mattans tak, 22 % av
kortet ligger under 60 i ljusstyrka, så en tröskel på ljusstyrkan i
beskärningen klipper bort en femtedel av kortet), tar den största
kort-klumpen, låter dess minsta omslutande rektangel ge **vinkeln**, och
provar åtta lägen av en rektangel med kortets kända mått. Ett läge godtas
när det täcker klumpen, inte har matta inuti sig och inte sticker ut ur
bilden.

| Före släppet | Utskärningen lyckas |
|---|---|
| efter släppet (0–0,02 s) | 38 % |
| 0,0–0,1 s | 21 % |
| 0,1–0,2 s | 17 % |
| 0,2–0,3 s | 7 % |
| 0,3–0,8 s | 3–4 % |

**Svaret är nej medan handen håller kortet.** Det som fattas är inte
kortets mått — det är att handen täcker båda de hörn som skulle ge
rektangeln en entydig plats. Den remsa som sticker fram har en rak kant men
sällan två, och då finns det fyra lika goda lägen.

## c. Vad säger bildmodellen på beskärningarna?

Bildmodellen är kedjans egen (MobileCLIP-S0 på WebGPU, 114 uppslag ur
`dev/golden/lek.txt`, 912 vektorer), och domen är kedjans egen
`identifyMedModell` (modellen rangordnar, ORB kontrollerar de tre bästa).

| Före släppet | Rätt namn överst | Säkra svar | varav rätt | **Fel namn** |
|---|---|---|---|---|
| efter släppet | 67 % | 8 | 8 | 0 |
| 0,0–0,1 s | **51 %** | 31 | 31 | **0** |
| 0,1–0,2 s | 26 % | 4 | 4 | 0 |
| 0,2–0,3 s | 6 % | 0 | 0 | 0 |
| 0,3–0,4 s | 7 % | 0 | 0 | 0 |
| 0,4–0,5 s | 10 % | 2 | 0 | **2** |
| 0,5–0,6 s | 8 % | 0 | 0 | 0 |
| 0,6–0,7 s | 6 % | 2 | 2 | 0 |
| 0,7–0,8 s | 14 % | 6 | 5 | **1** |
| 0,8–0,9 s | 5 % | 2 | 2 | 0 |

Leken har 28 namn, så slumpen ligger på ~4 %. Mer än 0,2 s före släppet är
modellen alltså på slumpnivå — och de "säkra" svaren där är farliga: **3 av
dem är fel namn.**

**Utan utskärningen** (beskärningen tas ur hela hand + kort-regionen, som
kedjan skulle göra i dag) halveras det: 22 % rätt överst i sista tiondelen
i stället för 51 %, 20 säkra i stället för 31. Utskärningen är alltså värd
en hel del — men bara där kortet ändå är nere.

## d. Vilken regel skulle hålla, med 0 fel namn?

En regel = "samma namn i N rutor i följd, marginal över X, och kedjans egen
bilddom (`accept`)". Prövad på alla 24 nedläggningar, bara rutor **före**
släppet:

| Regel | Tänder i | Rätt | Fel | Median före släppet | Tidigast |
|---|---|---|---|---|---|
| `accept`, ingen marginalspärr | 12 av 24 | 9 | **3** | – | – |
| `accept` + marginal > 0,08 | **9 av 24** | **9** | **0** | 0,12 s | 0,88 s |
| `accept` + marginal > 0,08, två rutor i rad | 7 av 24 | 7 | 0 | 0,05 s | 0,85 s |
| marginal > 0,145, utan `accept` | 8 av 24 | 8 | 0 | 0,08 s | 0,88 s |

**Regeln som håller:** kedjans egen bilddom plus **marginal över 0,08**.
Kravet på flera rutor i rad hjälper inte — det kostar bara tid (0,12 → 0,05 s)
och två träffar. Det är marginalen som skiljer rätt från fel, inte upprepningen.

### Fällan i siffran: hälften av träffarna är grannen, inte kortet

Fem av de nio är **basländer som läggs på en hög av samma land** (fönster
11, 21, 39, 47, 54). Där svarar modellen rätt redan 0,79 s före släppet — men
då är kortet fortfarande i handen på väg dit, och det som läses är högen som
redan ligger där. Det är inte fel svar, men det är inte heller en läsning av
kortet i handen, och det hade fungerat lika bra utan all den här maskineriet.

Delar man upp dem:

| | Tänder | Vilka | Median före släppet |
|---|---|---|---|
| Nytt namn på platsen | **4 av 19** | 4 (Swamp), 7 (Plains), 44 (Venomous Hierophant), 61 (Flutterfox) | **0,12 s** |
| Samma kort låg redan där | 5 av 5 | 11, 21, 39, 47, 54 (alla basländer på hög) | 0,79 s |

Samma uppdelning i 1080p: 4 respektive 5, median 0,10 s och 0,87 s.

De tre fel namnen utan marginalspärren är lärorika: alla tre är
**"Night's Whisper"** — ett kort som ligger i library och aldrig kommer ut
på bordet. Modellen svarar alltid med något av lekens namn, och när
beskärningen mest är hand blir svaret det kort vars konstverk är mörkast.
Ett av dem (fönster 52) är dessutom **tomt bord** — tokenen som lyfts bort.

## e. Räcker ORB som snabb bekräftelse vid släppet?

I rutan vid släppet, för de 13 nedläggningar där utskärningen gav en
beskärning:

* ORB **bar** modellens etta i **6 av 13** — och **alla 6 var rätt**.
* Modellens etta var rätt i 9 av 13; i de tre där ORB inte bar var svaret
  ändå rätt (7, 11, 26, 54 bars av marginalen i stället).
* ORB bar **aldrig ett fel namn**. Skalan låg på 1,03–1,28, alltså inom
  `ORB_SKALA` — utskärningen ramar in ett helt kort.

**Ja, ORB duger som bekräftelse** — men bara som ett *ja*. Den säger inte
nej i tid: i 7 av 13 fall hade den inget att säga (2–13 inliers).

## Försämrad bild: 1080p, rörelseoskärpa och hårdare komprimering

Kameraappen ger en skarpare bild än Mesa i webbläsaren, så samma
beskärningar kördes en gång till försämrade. Rörelseoskärpan är räknad ur
regionens **uppmätta fart** i varje ruta (två rutor i 60 per sekund =
exponering 1/30 s), inte gissad.

| Variant | Rätt överst, sista tiondelen | Säkra | Fel namn |
|---|---|---|---|
| 4K | 51 % | 31 | 0 |
| 1080p | 50 % | 31 | 0 |
| 1080p + rörelseoskärpa | 35 % | 8 | 0 |
| 1080p + hård jpeg | 50 % | 11 | 0 |
| 1080p + båda | 25 % | 5 | 0 |

(De tre försämrade kördes på varannan ruta, därav färre säkra i absoluta tal;
läs andelarna.)

**Upplösningen spelar ingen roll. Rörelseoskärpan gör det** — den kostar
ungefär en tredjedel av de säkra svaren. Komprimeringen kostar nästan
ingenting. Inget av det ger fel namn.

Det stämmer med bänken i `dev/embed/RAPPORT.md`: modellen tål hård jpeg
(97 %) men inte rörelseoskärpa (87 % med flera referenser, 30 % med en).

## 30 mot 60 rutor i sekunden

Samma svar räknat på varannan ruta:

| | 60 rutor/s | 30 rutor/s |
|---|---|---|
| Regeln tänder i | 9 av 24 | 9 av 24 |
| Fel namn | 0 | 0 |
| Median före släppet | 0,12 s | 0,10 s |
| Tidigast | 0,88 s | 0,88 s |

**30 räcker.** Fönstret där kortet är läsbart är 0,1–0,2 s långt, alltså
3–6 rutor i 30 per sekund — gott om rutor. Det talar för MES-244:s riktning.

## Sort för sort

De 24 nedläggningarna, och hur många av dem som fick ett rätt och säkert
namn **före** släppet med regeln ovan:

| Sort | Antal | Tidigt namn | Vad som händer |
|---|---|---|---|
| Kort på tom matta | 10 | **4** | Det enda som fungerar. Kortet ligger nere och syns helt 0,1–0,2 s innan handen lämnar det (`facit-bilder/vanligt-kort.png`) |
| Land på hög | 5 | 5 (grannen) | Svaret kommer från landet som redan ligger där, inte från kortet i handen — se ovan |
| Kort som läggs ner tappat | 2 | 0 | Beskärningen måste vridas, och regionen är hand + liggande kort hela vägen |
| Equipment under en creature | 1 | 0 | Kortet skjuts in **under** — bara namnraden syns, aldrig konstverket, och modellen ser konstverk |
| Till graveyard eller mill | 4 | 0 | Kortet läggs på en hög med framsidan upp; regionen är hela högen |
| Flytt (Ancestral Blade om) | 1 | 0 | Se nedan |
| Token som lyfts bort | 1 | 0 | Tomt bord efteråt — men gav ett säkert FEL namn utan marginalspärren |

Auran (Pacifism på Ukud Cobra) och de två tokens som läggs ut blev inte
egna nedläggningar i mätningen: deras låda växte ihop med kortet bredvid,
så de ligger bland de 66 stegen men inte bland de 24. Stillbilder finns
ändå i `facit-bilder/aura.png` och `token-i-ficka.png`.

## Tokens och baksidor (MES-247)

Båda tokens är kort med baksidan upp — Soldier i **plastficka** (fickans
gröna baksida), Rebel **utan** ficka (Magic-baksidan). Kedjans pool bär
Magic-baksidan som ett eget uppslag (`BAKSIDA_NAMN`).

| | Modellens etta | Marginal | Säker? |
|---|---|---|---|
| Rebel (Magic-baksidan) | **`(baksida)`** | 0,25 | nej (ORB 3 inliers) |
| Soldier (grön plastficka) | Thriving Heath | 0,071 | nej |

**Ingen av dem fick ett säkert namn ur leken — vilket är rätt.** Men:

* Magic-baksidan känns igen som baksida med klar marginal. Bra.
* **Den gröna fickans baksida finns inte i poolen alls**, så den kan bara
  jämföras mot kortframsidor. Den landade på Thriving Heath med marginal
  0,071 — under tröskeln 0,11, men inte med mycket. **En rekommendation till
  MES-247: lägg in plastfickans baksida i poolen** på samma sätt som
  Magic-baksidan, så att en token i ficka får ett tydligt `(baksida)` i
  stället för ett knappt underkänt kortnamn.

## Flyttar (MES-248)

Ancestral Blade flyttas om, under Danitha (fönster 51). Regionen ruta för ruta:

* −0,90 till −0,15 s: **en** region, 98×181 analysbildpunkter (hand + arm +
  korten den passerar), aldrig med ett korts mått.
* −0,13 s: regionen blir plötsligt **35×49** — ett kort — på den nya platsen.

**En flytt syns alltså inte som att samma kort flyttar.** Det gamla kortet
försvinner under handen och ett nytt kort dyker upp där det landar. Det
bekräftar det MES-214 mätte i golden, nu i 60 rutor/s: det finns ingen
mellanliggande ruta där kortet syns på väg. Ska en flytt bli en flytt måste
datorn binda ihop dem på annat sätt (namn + att det gamla spårets plats blev
tom), inte på att följa kortet i bilden.

## Vidvinkeln (MES-241, MES-244)

| Avstånd från bildens mitt | Kortsidan i 4K | i 1080p | Kortets medelljus |
|---|---|---|---|
| 0,00–0,35 | 384 px | 192 px | – |
| 0,35–0,55 | 373 px | 187 px | 109 |
| 0,55–0,75 | 341 px | 171 px | 99 |
| 0,75–1,00 | 384 px | 192 px | **56** |

* **Storleken varierar bara ±10 %** över hela bilden. Vidvinkeln kostar
  alltså inte upplösning där det spelar roll.
* **Skärpan är jämförbar** i mitten och vid kanten (se
  `facit-bilder/vidvinkel-mitt-mot-kant.png`).
* **Ljuset är problemet.** Ett kort längst ut är hälften så ljust som ett i
  mitten (medel 56 mot 109, max 155 mot 227) och därmed mycket brusigare.
  Det är den enda mätbara kostnaden för vidvinkeln i den här inspelningen,
  och det är en lampfråga, inte en objektivfråga.

Kortsidan **176–192 px i 1080p** ligger klart över de 100–130 px där bänken
i `dev/embed/RAPPORT.md` fortfarande hade 95–100 % rätt. Det är förklaringen
till att 1080p inte kostar något här.

## Vad som skulle behövas för att komma längre

Det som stoppar oss är **inte** kedjan, upplösningen eller bildtakten. Det är
att handen ligger över kortet. Tre vägar, i storleksordning:

1. **Läs kortet i handen, inte på bordet.** Den remsa som syns under
   nedgången är ofta kortets övre kant — alltså **namnraden**. Namnläsaren
   (tesseract) är inte provad på det här materialet; det är en egen
   utredning värd att göra, och den skulle träffa exakt de fall där
   bildmodellen inte kan något.
2. **Lär känna handen.** En hudmask är billig (den finns redan i `skar.js`)
   och skulle låta detektorn dra bort handen ur regionen. Då blir "hand +
   kort" till "kort" tidigare, och kedjans vanliga väg tar vid.
3. **Ge spelaren en annan vana.** Att lägga kortet med två fingrar i ena
   hörnet i stället för med handflatan över skulle ensamt lösa frågan. Det
   är inget vi kan kräva, men det är värt att veta att skillnaden mellan
   Jespers två grepp i den här inspelningen är hela skillnaden mellan 5 %
   och 51 % rätt namn.

## Vad det betyder för målet (MES-237)

Målet är namn i median ≤ 0,3 s från släppet, siktet 0,1 s.

* Den regel som håller ger namnet **klart vid släppet i 4 av 19
  nedläggningar** (plus 5 landhögar där svaret kommer från grannen). I de
  fallen är kvarvarande fördröjning bara nätet och ritningen — telefonprovet
  (MES-238) mätte ~0,1 s. **Siktet 0,1 s nås där, men bara där.**
* I de andra börjar läsningen som i dag, vid släppet. Golvet är då
  ~0,15–0,2 s plus läsningen.
* **Bästa vi kan nå med det här:** en femtedel av korten får namnet gratis.
  Medianen över alla kort flyttar sig knappt. Det är **inte** vägen till
  0,1 s i median — det som skulle flytta medianen är att göra läsningen
  efter släppet snabbare (MES-221: läsningen i en worker, så att den kan
  köras varje ruta i stället för var 150:e ms).

**Slutsatsen för del 2:** bygg den inte som den är tänkt i issuen. Vinsten
är för liten och ligger i fel fall. Det som är värt att bygga av det här är
i stället de två billiga bitarna: **ORB som bekräftelse vid släppet** (bär
aldrig ett fel namn, se e) och **marginalspärren 0,08** som skydd mot de
säkra fel namn kedjans dom ensam släpper igenom på en hand.

## Köra om

```bash
bash dev/las-fore-slapp/kor-allt.sh <arbetsmapp> <video>
node dev/las-fore-slapp/lasjobb.cjs <arbetsmapp> <arbetsmapp>/bilder allt.json \
  --relmin -0.9 --relmax 0.3 --kallor skuren,region --varianter 4k,1080p
node dev/las-fore-slapp/las.cjs --jobb allt.json --ut svar.json --port 8290
node dev/las-fore-slapp/rapport.cjs svar.json --kalla skuren:4k
```

Arbetsmappen ligger i **`dev/videos/mes-246-arbete/`** — `dev/videos/` är
gitignorerad, så de tunga filerna (`gra.bin` 2,3 GB, de klippta rutorna
0,5 GB, Chrome-profilen 0,45 GB) ligger i repots arbetsträd men checkas
aldrig in. Lägg den **inte** i `/tmp`: den töms när Macen startar om, och det
hände två gånger under natten den här mättes.

Svaren som siffrorna i rapporten är räknade ur ligger däremot **incheckade**
i `dev/las-fore-slapp/matning/` (2,7 MB), så tabellerna går att räkna om med
`rapport.cjs` utan att köra om vare sig videon eller Chrome:

```bash
node dev/las-fore-slapp/rapport.cjs dev/las-fore-slapp/matning/svar-allt.json --kalla skuren:1080p
node dev/las-fore-slapp/rapport.cjs dev/las-fore-slapp/matning/svar-allt.json --kalla skuren:4k --fps 30
```

| Fil | Vad |
|---|---|
| `svar-allt.json` | 1 698 rutor × (utskuren, region) × (4K, 1080p) — huvudmätningen |
| `svar-forsamrad.json` | samma rutor med rörelseoskärpa och hård jpeg |
| `svar-namn.json` | de stilla rutorna, som facit-namnen lästes ur |
| `svar-token.json` | de två tokens och två kontrollkort |
| `vidvinkel.json` | kortstorlek och kantskärpa mot platsen i bilden |

## Förslag: inspelningen som golden-fall 13 (görs inte här)

Inspelningen täcker det inget golden-fall gör: tokens (i ficka och utan),
equip om, aura, graveyard till spel, till handen och till exile, mill, till
handen från bordet, överst i library — och 60 rutor/s. Facit finns redan
(`facit-slapp.json`), så steget som brukar ta tid är gjort.

**Så här skulle jag göra det:**

1. **Klipp en 15 rutor/s-version** som de andra fallen, med
   `dev/golden/video/koda.swift`. Videon är redan bara kamerabild (ingen
   iOS-rad, ingen Safari-rad), så utsnittet är hela bilden:
   `swift dev/golden/video/koda.swift mes-246-video.mov video.mp4 0 0 3840 2160 1080 1000 15`.
   Nio och en halv minut i 1080 px och 1 Mbit/s blir ~70 MB — **för stort för
   git** (gränsen i SNABBGUIDE är tio megabyte). **Klipp ut en bit:** turerna
   1–4 (0–170 s) räcker för nedläggning, tappat, land på hög, token i ficka,
   token utan ficka och equip om, och blir ~12 MB. Vill man ha graveyard och
   mill får det bli ett fall 14 av turerna 5–9.
2. **`facit.json` ur `facit-slapp.json` och `kort.txt`.** Tiderna räknas om
   mot `start_s`. Händelserna blir `spelar` för de 24 nedläggningarna,
   `tappar`/`otappar` ur de steg som är vridningar, `tar_bort` för de lyfta
   korten och `flyttar` för flyttarna. Graveyard- och library-rutorna
   (`grav`, `bib`) måste med — de ligger båda i bild, och utan dem mäter
   provet högarna som kort på bordet.
3. **Namnen:** alla 19 avlästa namn finns i `dev/golden/lek.txt`. De fem
   fönster som saknar namn (graveyard-högens översta efter mill, flytten,
   tokenen som lyfts bort) ska stå som händelser utan namn, eller utelämnas.
4. **Tokens, exile och attach räknas som mått utan dom** tills MES-247 och
   MES-248 är byggda, precis som kommentaren i MES-246 säger.
5. `node dev/golden/kor.cjs --fall 13 --detalj`, rad i `historik.md`,
   `--spara`, och mappen + `senaste.json` i samma commit.

**Det som är värt att veta innan:** fallet blir **svårt**. Bordet har upp
till nio kort samtidigt, flera i blanka plastfickor som lampan bränner ut,
två landhögar och ett kort längst ut i bilden där ljuset är halverat. Räkna
med lägre tal än fallen 09–12 — det är poängen med ett nytt fall, men det
ska sägas innan baslinjen sparas.

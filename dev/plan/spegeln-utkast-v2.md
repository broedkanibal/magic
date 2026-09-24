# Spegeln mot facit v2 — vad bordet faktiskt visade

> Partiet 2026-09-21, sekund 240–540 (fem minuter mitt i ett riktigt spel).
> Skrivet 2026-09-22 mot **v2-facit** (`dev/golden/inspelningar/2026-09-21-parti/v2/`),
> som beskriver *varje kort i varje ruta* — inte bara händelser.
> Ingen kod är ändrad, inga issues är skapade. Allt som kräver ett beslut av
> Jesper är märkt **BESLUT**.
>
> Ersätter `dev/plan/spegeln-utkast.md` där de säger emot varandra. Vad som
> höll och vad som föll står i avsnitt 6.

## Vad det här svarar på

| # | Fråga | Kort svar |
|---|---|---|
| 1 | **Tappningar** — speglas de? | Nej. I de två rutor jag granskat kort för kort är **noll** av mattans tappade kort speglade; de tappade kort bordet ritar är andra kort. 16 av fönstrets 45 tap-domar vände telefonens egen förra dom |
| 2 | **Antal** — varför ligger det för många kort på bordet? | Nästan hela överskottet är **kort kameran tappat bort och som ingen svarat på**. Dras de bort stämmer antalet på ±1 i 15 rutor av 31, mot 5 före |
| 3 | **Granskningen** — varför tar "N cards to fill in" aldrig slut? | Den är tom i 13 av 31 rutor, men aldrig länge. Det som hamnar där är mest ett **andra spår på ett kort som redan ligger på bordet** — gissningen namnger kortet bredvid |
| 4 | **Ordningen** — ligger korten rätt? | Grovt ja (vänster/höger, kort uppe · land nere), fint nej. Bordet blandar lägen räknade med **olika skalor**, och ett kort hade glidit ut över vänsterkanten i tio rutor i rad |

### De tre siffrorna som sammanfattar fem minuter

| Mått | Värde | Var det står |
|---|---|---|
| Kort på bordet som mattan inte har | **+4 i median, +8 som värst** (ruta 480) | `v2/jamforelse.md` |
| … när man drar bort de bortglömda korten | **−1 i median**, −5 till +4 | räknat här, avsnitt 3 |
| Tap-domar telefonen tog om under passet | **54 av 108** var en omvändning av dess egen förra dom | latensrapporten |

---

## 1. Underlaget

| Vad | Fil | Vad den säger |
|---|---|---|
| **Facit** (sanningen) | `v2/tabell.tsv` | en rad per fysiskt kort per ruta: var det ligger (x, y i procent av bilden), om det är upprätt eller tappat, vilken hög det tillhör. Plus en `digitalt:`-rad per ruta som beskriver Mesas bord i samma ögonblick |
| **Siffrorna** | `v2/jamforelse.md`, `v2/jamforelse.tsv` | facit hopräknat, ruta för ruta |
| **Bevis** | `dev/material/…/rutor/` | `kam-NNN.jpg` = mattan som telefonen ser den, `NNN.jpg` = hela skärmen |
| **Mesas beslut** | `dev/latens/latens-2026-09-21-mes-238-4k15-20min-varme.json` | 820 rader: spår som får namn, tappas, flyttas, dör. Läses med `node dev/latens/analys.cjs <fil>` |
| **Facits kontroll** | `v2/kontroll-2.md` | åtta rutor beskrivna blint och jämförda: **7 av 8 stämmer**. De två felen som hittades i facit är båda ±1 kort på `digitalt:`-raden, där kort ligger helt dolda |

### Klockan

Ruta = sekund i inspelningen. Menyradens minut byter vid ruta 286, 346, 406,
466 och 526 — alltså **ruta 286 = 23:12:00**. Latensrapporten började
23:07:20, det vill säga vid ruta 6. Alla rapporttider i det här dokumentet är
omräknade till rutnummer med den formeln; felet är under en sekund.

### Vad siffrorna i facit betyder

* **fys kort** — kort som syns på mattan, inklusive kort som bara visar en
  kant. Kort som ligger *helt* dolda kan inte räknas.
* **dig kort** — kort på Mesas bord, inklusive de nedtonade ("kameran ser
  dem inte") och platshållarna.
* **cantsee** — siffran i den gula bannern *"The camera can't see N cards.
  Nothing is removed until you choose."*
* **granskning** — siffran i *"N cards to fill in"*.

---

## 2. Fråga 1: Tappningar

### Vad som hände

Ett tappat kort är vridet ett kvarts varv — i Magic betyder det "använt den
här turen". Mattan hade tappade kort i **12 av 31 rutor**, totalt 39
kortrader. Bordet ritade tappade kort i **29 av 31 rutor**, totalt 76 kortrader.
Samma siffra betyder alltså inte samma kort.

| ruta | tappade på mattan | tappade på bordet | Stämmer det? |
|---|---|---|---|
| 290 | 4 (två i mitthögen uppe, två i solfjädern) | 2 | **nej** — se nedan |
| 300 | 2 | 2 | okänt — rätt antal, korten inte prövade |
| 320–350 | 1 | 1 / 1 / 0 / 1 | okänt — rätt antal, korten inte prövade |
| 460 | 4 | 1 | nej |
| 470 | 7 | 2 | nej |
| 480 | **7** | 3 | nej |
| 490 | 7 | 1 | nej |
| **500** | **1** | **8** | nej — åt andra hållet |
| 540 | 3 | 3 | okänt — rätt antal, korten inte prövade |

Och i **18 av de 19 rutor** där inget kort alls är tappat på mattan ritade
bordet ändå 1–4 tappade kort (t.ex. 240–280: noll på mattan, tre på bordet).

### Bevis, två rutor

**Ruta 480 — sju tappade, bordet visar ingen av de tre översta.**
I `kam-480.jpg` ligger de tre korten i övre raden tydligt vridna (facit:
18,27 · 36,29 · 59,29, "liggande, långsidan vågrät"). På `480.jpg` står
Serpent Assassin, Danitha Capashen, Pharika's Chosen, Valkyrie's Sword och
Trusty Retriever alla **upprätt**. De tre tappade korten bordet *ritar* är
land längre ner.

**Ruta 290 — fyra tappade, och de två bordet visar är fel kort.**
Facit: 63,29 och 60,37 (mitthögen uppe) och 57,80 och 56,90 (solfjädern) är
vridna ~90°. `290.jpg` visar fem upprätta kort i övre raden och två vridna
kort nere till höger. Latensrapporten har **ingen tap-dom alls** mellan
sekund 253 och 288 utom ett Swamp-spår som gick åt *fel* håll (sekund 288,7:
tappad → otappad). De två tappade korten bordet visar vid 290 har varit
tappade sedan sekund 160 respektive 239 — alltså sedan innan något kort
tappades fysiskt.

> Det här är fällan som gör siffror farliga: "4 på mattan, 2 på bordet" ser
> ut som halv spegling. I själva verket är noll av de fyra speglade, och de
> två på bordet är gamla felaktiga domar som råkar stå kvar.

### Var beslutet tas

Tappningen avgörs i **fyra steg**, tre på telefonen och ett på datorn.

| Steg | Var (`index.html`) | Vad som avgörs |
|---|---|---|
| 1. Kortets vinkel | rad **19284** | detektorn räknar regionens *huvudaxel* — den riktning fläcken är längst åt. Det är inte kortets kant, det är fläckens form |
| 2. Tappad eller inte | `tappad()`, rad **20140–20143** | skiljer huvudaxeln mer än **45°** från grundläget (`kal.grund`, vinkeln Jesper sparade som "otappat") är kortet tappat |
| 3. Hur många rutor som krävs | `matcha()`, rad **20403** och **20424–20426** | en *tydlig* dom (inom 20° av grundläget eller dess kvartsvarv, och regionen har kortets mått) tas direkt; annars krävs **två stilla rutor i rad** med den nya domen |
| 4. Bordet skrivs | `avstamBord` → `lagg`, rad **23909** och **23941–23947** | bordet skriver `tapped` **bara när telefonens egen dom ändras** (kantstyrt), och bara i läget *Mirror my table* (`spelPolicy`, rad 23428) och bara om ett grundläge är sparat |

Två detaljer som förklarar mycket:

* **Ett nyfött spår är alltid otappat** (`fodSpar`, rad 20204 och 20219).
  Dör ett spår och föds om — vilket händer hela tiden, se avsnitt 3 — börjar
  kortet på "otappat" och måste vinna två stilla rutor för att bli tappat
  igen. Under en hand som vrider kort ligger inget kort stilla.
* **Grundläget är en enda vinkel för hela bordet** (`satGrund`, rad
  20825–20836). Kameran tittar snett; ett kort längst till höger på mattan
  ligger i en annan vinkel i bilden än ett kort längst till vänster. En enda
  gräns på 45° ska täcka båda.

### Varför tappningen inte nådde bordet — vad rapporten säger

| Mått ur rapporten | Värde |
|---|---|
| tap-domar under hela passet (20 min) | **108** |
| … som var en omvändning av samma spårs förra dom | **54 (50 %)** |
| tap-domar i fönstret 240–540 | 45, varav **16 omvändningar** |
| mediantid innan en dom vändes | **7,2 s** (fem av de sexton inom 1,1 s) |
| från handen släpper till bordet ritar tappningen | median **397 ms** — målet 0,3 s klaras **inte** |
| från telefonens beslut till ritat | median **101 ms** |

Sista raden är viktig: **vägen är inte långsam, domen är fel.** Så fort
telefonen bestämt sig är kortet vridet på skärmen på en tiondels sekund.

Ett enda spår visar problemet: spår 27, ett Swamp, fick **tolv tap-domar**
mellan sekund 258 och 363, och var och en vände den förra — tappad, otappad,
tappad… sex gånger fram och tillbaka på 105 sekunder, medan facit säger att
inget kort på den delen av mattan rördes.

### Det omvända: tappade kort som inte finns

I `kam-240.jpg` syns varför. De två korten uppe till vänster ligger upprätta
i blanka fickor med kraftigt blänk, och Mesas spårlådor runt dem är ritade
**snett, ~30–40° vridna** — lådan följer blänkets form, inte kortets kant.
Med en gräns vid 45° blir domen ett myntkast.

På `240.jpg` syns resultatet: **Serpent Assassin ligger vriden ett kvarts
varv ovanpå Danitha Capashen** på bordet, medan båda korten står upprätta
sida vid sida på mattan.

Tre orsaker, i den ordning de kostar mest:

| # | Orsak | Bevis |
|---|---|---|
| 1 | **Blänk i blanka fickor gör regionen sned.** Vinkeln hamnar nära 45° och vippar | `kam-240.jpg` (lådorna snedställda), spår 27:s tolv domar i rad |
| 2 | **Två kort intill varandra blir en region.** Två upprätta kort sida vid sida har en vågrät huvudaxel — alltså "tappat" | `kam-480.jpg`: strecklådorna spänner över flera kort i taget |
| 3 | **Handen.** När Jesper vrider tillbaka korten vid sekund ~495–505 döms **sex nyfödda spår** som tappade på arton sekunder — bordet visar **8 tappade i ruta 500**, precis när mattan har **1** | rapportens tap-rader vid sekund 495, 495, 496, 500, 506, 510 och 513 |

### Vad det betyder

Tappningen är i dag inte en spegling av bordet utan en **mätning av
fläckform**, och den mätningen är inte stabil nog för en 45°-gräns. Att göra
vägen snabbare hjälper inte; domen måste bli säkrare, eller inte ställas alls
när underlaget är dåligt.

> **BESLUT 1 — ska tap stängas av tills domen är pålitlig?**
> Ett bord som aldrig vrider ett kort skulle sakna tappningen i 12 rutor av
> 31. Bordet som det är i dag ritar tappade kort i 29 av 31 rutor — och i 18
> av dem finns inget tappat kort alls på mattan. Ett kort som "används" utan
> att spelaren gjort något är svårare att förstå än ett kort som står kvar
> upprätt. Alternativen: (a) som i dag, (b) tap bara när
> domen är *tydlig* (inom 20° — `tapTydlig` finns redan), (c) av tills
> spärren är byggd.

> **BESLUT 2 — ett grundläge per bordsdel i stället för ett för hela
> mattan?** I dag sparas en vinkel för hela bordet. Kameran tittar snett, så
> samma kort har olika vinkel i olika hörn. Ska uppstarten fråga efter
> grundläget på två ställen (vänster och höger), eller ska vinkeln räknas ur
> de kort som redan ligger på bordet?

---

## 3. Fråga 2: Antalet kort

### Vad som hände

Bordet har nästan alltid **för många** kort, aldrig för få: i 30 av 31 rutor
är `dig ≥ fys`. Medianen är +4 och värsta rutan +8 (ruta 480).

### Ruta 480 — den värsta rutan, uppdelad

| Sort | På mattan | På bordet | Skillnad |
|---|---|---|---|
| Land (Plains + Swamp) | 7 | 7 (4 Plains + 3 Swamp) | **0** |
| Övriga kort | 3 | 8 namngivna + 3 utan namn (varav 2 granskningsposter) = 11 | **+8** |
| varav en *token* (Soldier, som Ancestral Blade skapar) | – | 1 | legitim, finns bara digitalt |
| **Summa** | **10** | **18** | **+8** |

Landet stämmer på kortet. Hela överskottet sitter bland de övriga korten —
och åtta av bordets kort är i samma ruta nedtonade under bannern *"The camera
can't see 8 cards."*

### Det är bortglömda kort, inte dubbletter

Drar man bort de nedtonade korten blir bordet nästan rätt:

| Mått | `dig − fys` | `dig − cantsee − fys` |
|---|---|---|
| median | **+4** | **−1** |
| spann | −1 … **+8** (480) | **−5 … +4** |
| inom ±1 | **5 av 31 rutor** | **15 av 31 rutor** |

Resten av skillnaden lutar åt andra hållet (−5 till +4, median −1): bannern
räknar också kort som **finns kvar på mattan** men som kameran just då inte
ser. Bordet har alltså inte för många kort — det har för många *nedtonade*
kort, och en del av dem ligger fortfarande på bordet på riktigt.

Alltså: **överskottet är kort kameran tappat bort och som ingen svarat på.**
De ligger kvar, nedtonade, tills spelaren trycker på bannern. Jesper tryckte
aldrig, och högen växte till som mest **12 kort** (ruta 500).

### Varför korten försvinner för kameran

| Mått i fönstret (fem minuter) | Antal |
|---|---|
| `borta`-domar i latensrapporten | **82** (61 med namn, 21 namnlösa) |
| … varav Plains | 24 |
| … varav Swamp | 19 |
| Kort som mattan **faktiskt** blev färre med, sammanlagt | **högst 10** |

Ungefär fem av sex "kortet är borta" var alltså fel (61 mot högst 10). Orsaken står i `matcha`, rad
**20497–20503**: ett spår dör när mattan under dess låda sett tom ut i
`bortaMs` = **450 ms** (rad 18597). Ligger kort omlott — vilket land i en
hög alltid gör — hamnar lådan för kortet under delvis på mattan, och mattan
"ser tom ut".

### De tre vägarna in på bordet, och vilken som felar

| Väg | Var | Felar den? |
|---|---|---|
| **Kort** — telefonen är säker på namnet | `avstamBord` rad 24059 | nej: 52 namn i fönstret, ett enda säkert fel namn |
| **Platshållare** — "Reading the card…", "Asking Claude…" | `autoPlatser` rad 23615 | nej, de försvinner av sig själva |
| **Granskningspost** — "Which card is this?" | `avstamBord` rad 24096–24106 | ja, se avsnitt 4 |
| **Nedtonat kort** — kameran ser det inte längre | `avstamBord` rad 24158–24176, `BORTA_NAD` = 600 ms (rad 23057) | **ja, det här är hela överskottet** |

### En sak som inte går ihop, och som ingen mätning här kan avgöra

Summan *library + kort på mattan + graveyard* borde vara konstant: varje kort
som lämnar leken hamnar på bordet eller i högen. I facit sjunker den från
**38–41** (ruta 240–290) till **33–34** (ruta 520–540) — fem till sju kort
"försvinner" ur bokföringen på fem minuter.

Två förklaringar är möjliga, och rutorna kan inte skilja dem åt: korten
ligger helt dolda i högarna (facit kan inte se dem), eller datorns graveyard
följer inte med (den visar 1–2 kort hela fönstret).

> **BESLUT 3 — vad ska hända med ett kort kameran tappat bort?**
> I dag: kortet ligger kvar nedtonat för alltid tills spelaren svarar, och
> bannern räknar upp. Alternativ: (a) som i dag, (b) kortet tas bort av sig
> självt efter N sekunder, (c) kortet ligger kvar men bannern visas bara när
> antalet nedtonade är litet, (d) land räknas som en hög med ett antal och
> slutar räknas kort för kort (nattpassets R2). Det här är den enskilt
> största posten i skillnaden mellan matta och bord.

---

## 4. Fråga 3: Granskningen — "N cards to fill in"

### Först en rättelse: raden blir tom, men aldrig länge

| Läge | Antal rutor |
|---|---|
| `granskning = 0` | **13 av 31** |
| `granskning = 1` | 10 |
| `granskning = 2` | 6 |
| `granskning = 3` | 2 |

Längsta tomma sträckan är ruta 390–430, alltså ungefär **50 sekunder**. Den
näst längsta 270–300. Påståendet "den blir aldrig tom" stämmer inte —
det rätta är att **den fylls på igen inom en minut, hela tiden.**

### Vad som hamnar där

Sju granskningsposter i fem rutor, lästa direkt ur skärmbilderna:

| Ruta | Posten gissar | Ligger det kortet redan på bordet? |
|---|---|---|
| 240 · 250 · 260 | *Danitha Capashen, Paragon?* | **ja** |
| 340 | *Serpent Assassin?* | **ja** |
| 340 | *Trusty Retriever?* | **ja** |
| 340 | *Ancestral Blade?* | nej — ett riktigt okänt kort (fick namn först sekund 357) |
| 480 · 490 | *Trusty Retriever?* | **ja** |
| 500 | *Serpent Assassin?* | **ja** |

**Sex av sju granskningsposter frågar om ett kort som redan ligger på
bordet.** Spelaren ser ett frågetecken bredvid Serpent Assassin, och
frågetecknet gissar "Serpent Assassin?".

### Varför det händer

Det uppstår när detektorn ger **två levande spår** åt samma fysiska kort —
efter en hand, ett blänk, en tappning eller ett kort som skjuts in bredvid.
Ett av spåren bär kortet; det andra är osäkert och blir en granskningspost.

Koden har en spärr mot precis detta (`avstamBord`, rad **24081**):

> ett osäkert spår som ligger på ett klart kort med samma namn är samma kort
> sett en gång till

Spärren missar i båda leden:

| # | Varför spärren inte tar | Var |
|---|---|---|
| 1 | Den jämför spårets **eget** namn eller gissning. Namnet som posten *visar* kommer från spårets kandidatlista (`cands[0]`), som spärren aldrig tittar på | rad 24081 mot rad 24105 |
| 2 | `sammaPlats()` returnerar **false när båda spåren är färska** — alltså när båda fått en region under den senaste halvsekunden. Två levande spår på samma kort är per definition färska båda två | `sammaPlats`, rad **23192–23196**; `farsktSpar`, rad **23162** (`FARSK_MS` = 500 ms) |

Regel 2 är avsiktlig: två färska regioner *brukar* vara två kort. Men den
gör spärren verkningslös i just det fall den finns för.

### Vad som hade krävts

| Åtgärd | Effekt i fönstret |
|---|---|
| Spärren tittar också på postens kandidatlista, inte bara spårets namn | tar 6 av 7 posterna |
| Två färska spår som täcker varandra till mer än ~70 % räknas som samma kort, inte som två | tar samma 6 |
| Detektorn föder inte ett andra spår på ett redan namngivet korts plats (nattpassets **R6**) | tar samma 6, men gömmer också kort som *verkligen* ligger under andra kort |

> **BESLUT 4 — får bordet neka ett nytt kort på en plats där ett känt kort
> redan ligger?** Vinsten är att granskningen blir nästan tom. Priset är att
> ett kort som verkligen läggs *under* eller *omlott med* ett annat blir
> ännu svårare att hitta (Ancestral Blade under Flutterfox tog 103 sekunder
> att hitta redan i dag). Frågan är vilket som är värst för spelaren: ett
> frågetecken för mycket, eller ett kort som aldrig dyker upp.

---

## 5. Fråga 4: Ordningen — ligger korten där de ligger?

### Kort svar

Ja, på det grova planet. Bordet håller **vänster–höger-ordningen** och
tvådelningen *kort uppe · land nere* i alla rutor jag öppnat. Det är inte en
slump: läget speglas på riktigt.

Nej, på det fina planet. Avstånden stämmer inte, högar blir inte högar, och
enskilda kort glider ut över kanten.

### Var läget bestäms

| Steg | Var (`index.html`) |
|---|---|
| Telefonen skickar spårets **mitt i bilden**, som andel av bildens bredd och höjd | `kamLage`, rad **23927–23939** |
| Datorn räknar om andelen till brädkoordinater: bilden vrids, speglas och skalas | `kamTillMatta`, rad **7949–7957** |
| Skalan = **medianen** av alla bundna korts bredd i bilden | `kamSkala`, rad **7944–7948** |
| Korten flyttas | `speglaKamPos`, rad **7959–7973** |
| Kortet klams mot brädkanten och graveyard-rutan | `clampKort`, rad **9516–9528** |

Under fem minuter flyttade bordet kort **64 gånger** (rapportens
`lage`-rader), 186 gånger under hela passet. En flytt når skärmen på
**112 ms** i median — 83 % inom 0,3 s. Också här är vägen snabb.

### De fyra sakerna som gör det fina planet fel

| # | Vad | Var | Följd |
|---|---|---|---|
| 1 | **Ett kort utan levande spår flyttas aldrig.** Villkoret är `c.spar != null && c.kam && c.lyft == null` | rad **7964** | de nedtonade korten (avsnitt 3 — som mest tolv stycken) fryser där de senast sågs och ligger kvar mitt i bilden |
| 2 | **Kortet ritas om bara när dess egen kamerastämpel ändrats** — men **skalan är gemensam** och ändras när kort kommer och går | rad **7965** mot rad **7944** | bordet blandar lägen räknade med *olika* skalor, och korten glider isär. *Läst ur koden, inte mätt* |
| 3 | **Flyttar under 15 % av kortbredden ignoreras** | `AUTO_FLYTT`, rad **23474/23937** | små justeringar (det man gör hela tiden med kort i en hög) syns inte |
| 4 | **Ett kort i en hög ger sin remsa som läge.** Syns bara kortets övre kant är det remsans mitt telefonen skickar, inte kortets | rad 23931 | högar dras isär och hamnar för högt. *Läst ur koden, inte mätt* |

### Bevis

**Kortet som gled ut över kanten.** I tio rutor i rad — 350, 360, 370, 380,
390, 400, 410, 420, 430 och 440 — noterar facit ett kort
"(avskuret vid vänsterkanten)" på bordet. I `430.jpg` är det Serpent
Assassin, halvvägs utanför brädets vänsterkant. På mattan ligger kortet vid
20 % av bildens bredd — en femtedel in, mitt på bordet. `clampKort` är den
enda kod som kan sätta ett kort exakt på brädkanten, så det är där det
fastnat, och där står det i nästan två minuter.

**Kort som överlappar fast de inte gör det.** I ruta 240 ligger de tre
korten i mattans övre rad *helt fria från varandra* (facit: alla tre `hog=-`
och `synligt=helt`, vid 18 %, 34 % och 71 %). På `240.jpg` ligger Serpent
Assassin ovanpå Danitha Capashen.

### Vad det betyder

Speglingen av *läget* är den del av spegelläget som fungerar bäst — den är
snabb och riktningen stämmer. Det som förstör intrycket är inte
positionsmatematiken utan att **för många kort inte har något spår**
(avsnitt 3). Ett kort utan spår kan inte flytta sig, och ju fler sådana
kort, desto mer ser bordet ut som ett gammalt fotografi av mattan.

> **BESLUT 5 — ska skalan frysas under ett spel?**
> I dag räknas skalan om ur medianen av korten som syns just nu, men bara de
> kort som *själva* rört sig får den nya skalan. Alternativ: (a) frys skalan
> när uppstarten är klar (kortstorleken är redan mätt där), (b) räkna om
> skalan men rita då om **alla** kort, (c) som i dag. (a) och (b) är båda
> små ändringar; (c) är den som ger glidningen.

---

## 6. Nattpassets regler R1–R6 mot v2-siffrorna

Nattpassets utkast (`dev/plan/spegeln-utkast.md`) byggde på ett facit av
**händelser** (`handelser.tsv` + `platser.tsv`): "kort lades här, kort
flyttades dit". v2 är ett facit av **tillstånd**: varje kort i varje ruta.
Det ändrar bedömningen av tre av sex regler.

| Regel | Håller mot v2? | Varför |
|---|---|---|
| **R1** — borta först när det är bevisat | **Ja, och starkare** | v2 visar att *hela* överskottet på bordet är de bortglömda korten: drar man bort dem stämmer antalet på ±1 i 15 rutor av 31 i stället för 5 |
| **R2** — landhögen är en sak med ett antal | **Byggde på fel facit** | se nedan |
| **R3** — helbildens namn är ett förslag | **Ja, och starkare** | se nedan |
| **R4** — flytt i stället för borta + nytt | **Varken eller** | v2 samplar var tionde sekund; en flytt tar en sekund. Frågan kan inte avgöras med det här facit |
| **R5** — spöken har ett bäst-före | **Siktar på fel sak** | se nedan |
| **R6** — nytt spår på ett känt korts plats blir en del av kortet | **Ja, och viktigare** | 6 av 7 granskningsposter i fönstret är precis det här fallet (avsnitt 4) |

### R2 byggde på fel facit

Utkastet skrev: *"antalet namngivna Plains på bordet svänger mellan 0 och 6
(0 sek 380, 6 sek 520–530) medan högen hela tiden har ~5–6 kort."*

v2 läser bordet direkt, och det stämmer inte:

| Mått | Utkastet | v2 |
|---|---|---|
| Plains på bordet, minst | 0 | **2** |
| Plains på bordet, mest | 6 | **5** |
| Land (Plains + Swamp) på bordet mot land på mattan | – | **medelavvikelse 0,84 kort**, som mest 3, exakt rätt i 11 av 31 rutor |
| Ruta 380, Plains på bordet | 0 | **3** |
| Ruta 480, land på bordet mot mattan | – | **7 mot 7** |

Utkastet räknade **namngivna spår i latensrapporten**, inte kort på bordet.
Spåren fladdrade (41 falska `borta` på land) — men datorn band om dem inom
nådatiden, och **spelaren såg det aldrig**.

Det betyder inte att R2 är fel idé. Det betyder att **argumentet för den är
borta**: land är den del av bordet som redan stämmer bäst. R2 måste i så
fall motiveras med något annat (att högen *ser* ut som en hög, att
placeringen blir stabil) och mätas om.

### R3 blev starkare

Rutorna 240 och 250 är de enda i fönstret där överskottet **inte** är
bortglömda kort: `cantsee = 0` och bordet har ändå **fyra kort för mycket**.
Där ligger beviset:

* I `kam-240.jpg` ritar Mesa en **heldragen grön ruta över tom matta** —
  ett namngivet spår där det inte finns något kort.
* Tre av bordets namn vid ruta 236 kom från helbilden i samma sekund
  (Killing Glare, Plains, Plains). Killing Glare låg redan i graveyard.
* Ett helbildsspår kan inte dö av tom matta: `matcha`, rad **20503**,
  undantar dem uttryckligen (`!arHelbild(t)`).

Ett helbildsspår är alltså ett kort som ligger på bordet tills nästa helbild
körs — oavsett vad kameran ser. Det är precis vad R3 vill åt.

### R5 siktar på fel sak

R5 vill ge "spöket" ett bäst-före. Men det finns **två** spöken, och det
långlivade är inte det R5 pekar på:

| "Spöke" | Var | Livslängd i dag |
|---|---|---|
| Telefonens minne av en plats (`spoken`) | `matcha`, `spokMs`, rad **18601** | **20 sekunder** — har redan en gräns, och den går att ställa |
| Datorns nedtonade kort ("Where did it go?") | `avstamBord`, rad **24158–24176** | **för alltid**, tills spelaren svarar på bannern |

Det som stod kvar i 140 sekunder i utkastets exempel var datorns nedtonade
kort — alltså samma sak som BESLUT 3 i avsnitt 3. R5 och R1 är i praktiken
samma beslut.

### Det som saknas i R1–R6

| Saknas | Varför det spelar roll |
|---|---|
| **Tappningar, helt** | Utkastet skriver själv att facit hade noll tappningar. v2 har 39 tappade kortrader i 12 rutor, och speglingen av dem är sämst av allt som mäts här (avsnitt 2). Ingen av R1–R6 rör tap |
| **Lägets skala** | Ingen regel rör att bordet blandar koordinater från olika skalor och klämmer kort mot kanten (avsnitt 5) |
| **Granskningens innehåll** | R6 finns, men utkastet räknade den som "dubbletter" (4 st). v2 visar att det är granskningsradens huvudinnehåll — 6 av 7 poster |
| **Tokens** | Soldier-token på bordet är legitim men räknas som ett fel i varje antalsjämförelse. En mätning måste skilja dem åt |

---

## 7. Tre saker jag såg på vägen — och vad som inte är prövat

### "Asking Claude… [object Object]?"

På `430.jpg` och `480.jpg` står en platshållare på bordet med texten
**"Asking Claude… [object Object]?"**. Det är en ren kodmiss:

| Rad | Vad som skickas som kortets namn | Följd |
|---|---|---|
| **23535** | spårets `namnLast` rakt av | `namnLast` är ett **objekt** (`{ text, namn, poäng, … }`, rad 22712), inte en sträng — skärmen får `[object Object]` |
| **23575** | `namnLast.namn` | här görs det rätt, i samma fil, fyrtio rader ner |

Rätt vore `(t.namnLast && t.namnLast.namn)`. Spelaren ska se vad telefonen
tror att kortet heter; i stället står det `[object Object]`.

### Den gröna rutan över tom matta

I `kam-240.jpg`, mitt i övre raden, ritar Mesa en **heldragen grön ruta**
(färgen för "recognised") över en helt tom del av mattan. Inget kort ligger
där. Det är ett helbildsspår som inte kan dö — se R3 i avsnitt 6.

### Hälsokollen under passet

`analys.cjs` skriver ut ett meddelande som gällde hela passet:

> *Dark screen is on: a screen recording will be black. Tap "Keep the picture
> on" on the phone before you record. Timing is fine either way.*

Tiderna påverkas inte, men det är värt att veta inför nästa inspelning.

### Vad i det här dokumentet som *inte* är prövat

| Påstående | Hur säkert |
|---|---|
| Vilket digitalt kort som motsvarar vilket fysiskt kort | bara i de åtta rutor jag öppnat för hand (240, 290, 340, 390, 430, 480, 490, 500). I övriga rutor jämförs bara antal |
| Skalan som glider och högar som dras isär (avsnitt 5, punkt 2 och 4) | **läst ur koden, inte mätt.** En mätning kräver att man loggar `kamSkala` och `k.kam` per ruta |
| Land på bordet mot land på mattan (avsnitt 6) | räknar bara **namngivet** land på bordet. Kort utan namn kan också vara land, så bordets landsiffra är ett golv |
| Allt som är kortare än tio sekunder | facit samplar var tionde sekund. En tappning som ångras inom en ruta syns inte alls |
| Facit självt | kontrollerat blint i åtta rutor: 7 av 8 stämmer, och de två fel som hittades är ±1 kort på `digitalt:`-raden (rutorna 330 och 450) |

---

## 8. Vad som kan bli issues

Inga är skapade. Titel + en rad, sorterade efter hur mycket de flyttar.

| Titel | En rad |
|---|---|
| Tap-domen vippar: hälften av alla domar är omvändningar | 54 av 108 tap-domar under passet vände spårets egen förra dom; ett Swamp-spår fick tolv domar i rad på 105 s, var och en en omvändning, utan att kortet rördes |
| Tappade kort i övre raden speglas inte alls | Sju tappade kort på mattan i ruta 470–490 ger noll tappade i bordets övre rad; grundläget är en enda vinkel för hela den snett sedda mattan |
| Nedtonade kort staplas tills spelaren svarar — bannern nådde 12 | Hela överskottet på bordet (+4 i median, +8 som värst) är kort kameran tappat; dras de bort stämmer antalet på ±1 i 15 rutor av 31 i stället för 5 |
| Granskningen fylls av kort som redan ligger på bordet | 6 av 7 granskningsposter i fönstret gissar namnet på kortet bredvid; spärren i `avstamBord` rad 24081 tittar inte på kandidatlistan och stängs av när båda spåren är färska |
| Helbildens spår kan aldrig dö | `matcha` rad 20503 undantar dem från "mattan är tom"; `kam-240.jpg` visar en grön ruta över tom matta, och Killing Glare låg på bordet medan kortet låg i graveyard |
| Bordet blandar lägen räknade med olika skalor | `speglaKamPos` ritar bara om kort vars egen stämpel ändrats, medan `kamSkala` är gemensam; ett kort låg fastklämt utanför vänsterkanten i tio rutor i rad (350–440) |
| "Asking Claude… [object Object]?" på platshållaren | `autoRemsaModell` rad 23535 skickar objektet `namnLast` där en sträng ska stå; rättas med `.namn`, som raden 40 rader ner redan gör |
| Mät om R2 (land som hög) innan den byggs | Argumentet för R2 — att antalet land svänger 0–6 — håller inte mot v2: medelavvikelsen mot mattan är 0,84 kort och land är den del av bordet som stämmer bäst |
| Bokföringen tappar 5–7 kort på fem minuter | `library + kort på mattan + graveyard` sjunker från 38–41 till 33–34; går inte att avgöra med rutorna om det är dolda kort eller en graveyard som inte följer med |
| Golden-fall ur partiet 2026-09-21 med v2-facit | v2 är det första facit som beskriver varje kort i varje ruta och är kontrollerat blint (7 av 8 rutor); det kan bli ett mätbart fall för tap, antal och granskning |

---

## 9. Besluten samlade

| # | Beslut | Avsnitt |
|---|---|---|
| **1** | Ska tap stängas av, begränsas till *tydliga* domar, eller vara som i dag? | 2 |
| **2** | Ett grundläge för hela mattan, eller ett per bordsdel? | 2 |
| **3** | Vad ska hända med ett kort kameran tappat bort — ligga kvar för alltid, försvinna efter N sekunder, eller räknas som hög? | 3 |
| **4** | Får bordet neka ett nytt kort på en plats där ett känt kort redan ligger? | 4 |
| **5** | Ska skalan frysas under ett spel, eller ska alla kort ritas om när den ändras? | 5 |


---

## Jespers svar 2026-09-24

| # | Svar |
|---|---|
| 1 | **(b)** tap bara när domen är tydlig (inom 20°, `tapTydlig`). |
| 2 | **Ingen ny fråga i uppstarten** — vinkeln räknas per plats på bordet (ur bordets perspektiv om uppstarten vet hörnen, annars ur korten som ligger). |
| 3 | **Vänta längre innan ett kort tonas ned — anta först att det flyttas — men sluta vänta när graveyard-högen växer.** Kort till hand/exile blir senare; accepterat. → MES-291. Flyttar och utspel animeras → MES-292 (design, prompten i `dev/plan/design-prompt-animeringar.md`). |
| 4 | **Bara regel 1** (spärren tittar på postens kandidatlista): tar samma 6 av 7 poster. Regel 2 (två spår som täcker varandra > 70 % = samma kort) **tas inte** — Jesper: ett equipment på en varelse täcker ofta mer än 70 % och skulle försvinna. Mät mot golden 13 (equip, aura). |
| 5 | **(a)** skalan fryses efter uppstarten. |

# Grind 1b: syntetiska bord med exakt facit (MES-288)

**Frågan:** går det att göra bord på datorn som ser tillräckligt riktiga ut
för att en liten detektor ska lära sig högarna på dem — landkolumner, kort
omlott, kort där bara namnraden eller en kant syns? Grind 1 visade att
OWLv2 som lärare missar just de korten (66 av 171), så de ska läras där
facit är exakt, eftersom datorn själv lagt ut korten. Gjort 2026-09-29.

**Det här är ingen mätning.** Om borden är realistiska nog avgör Jesper
med ögat, och på riktigt först när en detektor tränad på dem provas mot
golden i grind 2.

## Så tittar Jesper (5 minuter)

```sh
open /Users/jesperfunk/Code/magic/dev/detektor/synt/index.html
```

(Sökvägen gäller när grenen är ihopslagen. Från den här worktreen, med borden gjorda om 2026-09-29 —
20 bord där en del har ensamma kort med baksidan upp, på bakgrunder ur Jespers filmer:
`open /Users/jesperfunk/Code/magic/.claude/worktrees/agent-a7ad5463d2a9e77ff/dev/detektor/synt/index.html`.)

Sidan visar de 20 borden med facit. **F** slår av och på lådorna, **H**
hörnen, **I** korten som inte får någon låda. Klicka på en bild för att se
den stor, ← → bläddrar. Längst ner ligger tre riktiga rutor ur
träningsmaterialet att jämföra med. Bilderna ligger i
`dev/material/arbete/2026-09-29-mes-288-synt/bilder/` (bara på Macen,
gitignorerat); sidan pekar dit relativt.

| Färg på sidan | Betyder |
|---|---|
| grön låda, `31% B` | ett kort med låda runt den synliga delen; andel synligt; hög B |
| blå låda | klassen `baksida`: leken (`baksida · lek`) eller ett ensamt kort med baksidan upp (`baksida`) |
| grå streckad låda | för lite syns — ingen låda, ignoreras i träningen |
| gul fyrhörning, röd prick | kortets fyra hörn (också det som ligger under) och namnradens början |

## Svaret, kort

| | |
|---|---|
| Bilder | 20 st, 960 × 544, 311 objekt (284 `kort`, 27 `baksida`: 16 lekar och **11 ensamma kort med baksidan upp**), 283 lådor, 28 utan låda |
| Ensamma baksidor | 11 st i 8 av 20 bord; 5 av dem ligger omlott med ett annat kort; 6 i bordets ficka, 3 utan ficka (Magic-baksidan), 2 i klar ficka |
| Högar | 175 kort ligger i en hög; 113 kort med låda syns till mindre än 30 %, 57 av dem med mindre än halva namnraden |
| Facit | exakt ur geometrin; **räknat om med ritverktygets egen kod** (`kontroll.cjs` mot `rita-geometri.cjs`): synlighet, tappläge och högar stämmer på alla 311 objekt, största skillnad i synlig andel 0,036 (gränsen 0,04; med de gamla borden 0,027) |
| Bakgrund | 10 av 20 bord har en hel ruta ur en av Jespers tre träningsfilmer (5 trä, 3 vitt bord, 2 svart matta), resten ritade ytor |
| Tid | 20 bilder på 17 s, **median 0,71 s per bild** i en process (2026-09-29, efter ändringen). Tidigare mätning: 1,1 s per bild i en process (60 bilder) och 0,44 s med fyra processer samtidigt — inte mätt om |
| 10 000 bilder | **~75 minuter** med fyra processer på Macen (`nice -n 19`) enligt den tidigare mätningen, ~1 GB på disk; troligen snabbare nu, inte omräknat |
| Minst verkligt | inga händer; fickornas blänk och dis för rena; leken ser ut som en låda; den ritade trä-ytan (se *Vad som ser konstigt ut*) |

## Vad generatorn gör

Tre skript, i ordning. Allt tungt i en venv (`numpy<2`, `opencv-python-headless`,
`pillow`), inga andra bibliotek; `sharp` används inte.

| Steg | Skript | Gör |
|---|---|---|
| 1 | `hamta.py` | kortbilder från Scryfall → `scryfall/` + `kort.json` |
| 2 | `bakgrund.py` | tomma bord ur träningsmaterial → `bakgrund/` + `index.json` |
| 3 | `generera.py` | borden → `bilder/`: `synt-NNNNN.jpg`, `.json`, `.txt` (YOLO), och `coco.json`, `klasser.txt`, `facit.js` för hela körningen |
| koll | `kontroll.cjs` | räknar om facit med `dev/golden/rita-geometri.cjs` och jämför |

Per bild:

1. **Kamera.** En telefon på stativ ovanför bordet: en riktig
   hålkameramodell (inte bara en snedvriden bild), lutad 0–28° mot bordet,
   vriden ±5°, 55–68° synfält, 38–90 cm bord i bildens bredd (var femte bild
   90–140 cm). Korten blir 47–155 px breda, median 67 px.
2. **Bakgrund.** 65 % en hel ruta ur ett tomt bord i en av Jespers tre
   träningsfilmer (en film i taget, sedan en ruta ur den), 35 % en ritad yta (se *Bakgrunder*).
3. **Layout i bordets plan, i mm**, med kortets verkliga mått (63 × 88 mm,
   66 × 91 i ficka). Grupperna läggs där de inte krockar; scenen *motståndare* (2 av 20)
   har också motståndarens sida, med korten vända 180°.
4. **Varje kort** ritas in genom kamerans homografi, i 2× och nerskalat, med
   rundade hörn, skugga åt lampans håll, ofta i ficka, ibland rörelseoskärpa.
5. **Hela bilden:** lampans ljuskägla, vinjett, varmt/kallt/neutralt/mörkt
   ljus, ibland oskärpa, lägre upplösning eller skakning, brus (starkare i
   mörker), skärpning som i en telefon, JPEG-kvalitet 45–92.

Samma `--fro` ger samma bild.

## Variationerna

| Sort | Hur | I de 20 |
|---|---|---|
| Landkolumn | 2–6 land förskjutna 7–16 mm nedåt, så att bara överkanten eller namnraden syns på de undre; var fjärde tappad | 114 kort i 32 kolumner |
| Trappsteg | 3–5 kort förskjutna 8–18 mm snett | 7 |
| Två omlott | två kort 18–45 mm isär, vridna mot varandra | 16 |
| Equipment/aura | under varelsen (namnraden sticker upp) eller bredvid, ibland båda tappade; `fast` satt | 11 par |
| Tappat kort | 90° ± 4° | 64 tappade kort totalt |
| Enstaka kort, token | ±5°; en token ibland | |
| Rad av varelser | 2–4 kort bredvid varandra | |
| Graveyard-hög | 3–11 kort slarvigt på varandra, zon `grav` | 37 kort |
| Leken | baksidan upp, 10–24 mm tjock med synliga sidor, klassen `baksida` (`slag: lek`); oftast nära en kant som library-platsen | 16 |
| **Ensamt kort med baksidan upp** | ett kort utanför leken, ~1–2 mm tjockt, klassen `baksida` (`slag: ensam`); som en uppochnervänd token. 70 % i bordets ficka, 30 % i en egen (oftast ingen ficka alls: Magic-baksidan, ibland klar ficka). Var tredje ligger **omlott** med ett annat kort, baksidan över eller under. I 8 av 20 bord (i alla scener utom `tomt bord`, med 40–50 % chans per scen; i de 20 föll de ut i `fullt bord`, `täta högar`, `glest`, `motståndare` och `bara leken`) | 11, varav 5 omlott |
| Tomma ytor, tomt bord | glesa bord, en bild helt utan kort, en med bara leken | |
| Avskurna | kort ut över bildkanten | 28 |

| Kortet | Hur |
|---|---|
| Kortbilder | Scryfall: lekens alla namn (Plains och Swamp med 6 konstverk var), Island/Mountain/Forest (5 var), **66 % lekens kort och 34 % andra** i de 20 (målet 75/25 per grupp, 50/50 i motståndarscenen) (160 slumpade kort ur hela Magic, 12 tokens). Källfältet `kalla: lek` betyder *ur Jespers lek på Scryfall* och har inget med klassen `baksida` att göra |
| Ficka | 55 % färgad ficka (kanten runt kortet i fickans färg, oftast mörkgrön glitter som Jespers), 30 % klar ficka (genomskinlig kant), 15 % ingen |
| Fickans yta | dis 3–10 %, ljusare kant, lätt oskärpa, blänk från lampans reflexpunkt och ibland ett blankt band |
| Baksidan (leken och ensamma kort) | färgad ficka: fickans baksida med glitter; annars Magic-baksidan; sidorna i fickans färg med ränder |

## Facit

En JSON per bild. Hörnen och fälten följer ritverktyget (`dev/golden/rita-geometri.cjs`)
så långt det går:

| Fält | Betyder |
|---|---|
| `horn` / `horn_px` | fyra hörn, **medsols från namnradens början** (andelar av bilden / px). I ficka är hörnen **fickans** kontur — det kameran ser som föremålet. För en baksida: ovansidans hörn |
| `z` | ordningen, högre ligger överst |
| `klass` | `kort` eller `baksida` (byt namn från `lek` 2026-09-29, Jespers beslut: appen avgör om en baksida är leken eller ett ensamt kort ur platsen) |
| `slag` | bara för `baksida`: `lek` (den tjocka leken, `namn: library`) eller `ensam` (ett kort, `namn: baksida`) |
| `synlig` | andelen av kortet som ligger i bild och inte under ett kort med högre z |
| `namnrad` | samma sak för namnraden (4–59 × 3,5–9,5 mm i kortet, 1,5 mm in i fickan) |
| `dold`, `tappad`, `avskuret`, `hog`, `fast`, `zon` | som i ritverktyget: `dold` = mindre än halva namnraden syns; `hog` = kort omlott (≥ 3 % av det minsta kortet) som inte är fästa, leken och graveyard räknas inte |
| `lada` / `lada_px` | lådan runt den **synliga** delen (x, y, w, h) |
| `tjocklek_px` | den synliga delens största inskrivna cirkel, i 960-bilden |
| `far_lada` | om kortet ska ha en låda i träningen (regeln nedan) |
| övrigt | namn, Scryfall-id, källa (lek/slump/basland/token), ficka, grupp, rörelseoskärpa, och bildens kamera, bakgrund, ljus och efterbehandling |

**YOLO** (`synt-NNNNN.txt`): `klass cx cy w h`, normerat, bara kort med
`far_lada`; `klasser.txt` = `kort`, `baksida`. **COCO** (`coco.json`): samma
lådor med `horn_px` och `synlig` som extra fält; korten utan låda står per
bild i `images[].ignorera`.

### Regeln: när ett nästan helt dolt kort får en låda

Ett kort får en låda om **minst halva namnraden syns**, **eller** om
**minst 5 % av kortet syns och den synliga delen är minst 6 px tjock** i
960 × 544-bilden. En baksida (leken eller ett ensamt kort) får en låda om mer än 20 % av den syns.

Lådan dras bara runt delar som är minst **3 px** tjocka. Utan det drog en
hårfin remsa (kortet under sticker ut en halv millimeter längs sidan)
lådan över hela kortet — det syntes på första provet och är rättat.

Varför så: detektorn ska räkna varje synlig del, också en kant, men en remsa
på 2–4 px går varken att se eller att skilja från kortet ovanför. 6 px är
ungefär en kortkant på 4–5 mm vid medianstorleken. Korten under gränsen
(28 av 311, 27 av dem i graveyard-högar) är **inte negativa**: de står som
ignorerade områden, och grind 2 ska maska dem ur förlusten eller grå-tona dem
i bilden — annars lär sig eleven att en kortkant inte är ett kort. YOLOX
har ingen färdig ignorera-mekanism; det är en ändring i träningskoden.

Talen är ett förslag. Ändras de: konstanterna `LADA_*` överst i
`generera.py`, och bilderna görs om på någon minut.

## Bakgrunder

**Bara material som `delning.py` godkänner som träning.** `bakgrund.py`
prövar varje källa med `krav_traning` — rutan *och* videon den togs ur — och
stoppar med `ProvLacka` annars. Generatorn prövar källan igen varje gång den
använder en bakgrund, och **hoppar över** bakgrunder som spärren stoppar.
`python dev/detektor/synt/bakgrund.py --test` visar att MES-246 (videon och
golden-kopian), passet 2026-09-22, golden-fall, ritade rutor, lekfotot, partiet
och en okänd mapp stoppas, och att träningskällorna släpps igenom.

**Partiet 2026-09-21 är uteslutet** (Jespers beslut 2026-09-29:
skärminspelningens ramar och låga upplösning är fel material), och grind 1:s
mapp (`2026-09-28-mes-288-larare`) står nu som `oanvandbart` i `delning.json`
eftersom de flesta av dess rutor är ur partiet. **Följden:** de fyra äldre
bakgrundskällorna (utsnitt ur MES-138, MES-139, pacifism och pass 1, alla
skärminspelningar) **stoppas av spärren och används inte längre**. Kvar som
riktiga bakgrunder är Jespers tre träningsfilmer. `index.json` i
`bakgrund/` har fortfarande de gamla raderna; generatorn filtrerar bort dem.

| Bakgrund | Källa | Så används den |
|---|---|---|
| **trä, dagsljus + lampa** | Jespers film `2026-09-29-traning-tra-dagsljus-lampa`, 0–12 s (7 rutor) | hel ruta, 1920 × 1080, skalas 1,0–1,35 × och skärs slumpat; speglas ibland |
| **svart spelmatta på träbord** | `2026-09-29-traning-svartmatta-dagsljus`, 0–12 s (6 rutor) | som ovan; mattans kant, gröna saker och surfplattan vid kanten är kvar |
| **vitt bord med leksaker och böcker runt** | `2026-09-29-traning-vittbord-dagsljus`, 0–11 s (6 rutor) | som ovan; korten läggs slumpat i bilden, alltså ibland över leksaker — bordets form följs inte |
| trä, duk, spelmatta, ljus skiva | `texturer.py` | genererade här med numpy/OpenCV — ingen hämtad bild, ingen licens behövs |

Regler för valet (`valj_bakgrund` i `generera.py`): 65 % av borden får en
riktig bakgrund. **En film väljs först (lika chans), sedan en ruta ur den** —
rutorna inom en film är nästan identiska, så tre ytor får inte bli 19.
De hela filmrutorna används **utan utplattning och lapptäckning** (de gamla
utsnitten plattades ut och lapptäcktes eftersom de var små): en utplattning
hade jämnat ut ljushetsskillnaden mellan svart matta och trä (bedömt, inte provat),
och lapptäckning hade blandat matta och träbord. Följden är att lampans ljusfläck i träfilmen är kvar och
att generatorn lägger sin egen lampa ovanpå.

Spelmattan med tryckt konstverk tar konstverket ur en av Scryfall-bilderna
(mörkat och mjukat): en svår negativ, konst utan kortram.

### När Jespers nya filmer kommer

Varje ny film med kameraappen börjar med 5–10 s tomt bord. En rad per film:

```sh
python dev/detektor/synt/bakgrund.py --video dev/material/inspelningar/<datum>-traning-<underlag>-<ljus>/telefon.mov --till 8 --steg 2
```

Den stoppar om filmen inte är träning, läser de första 8 sekunderna i
ordning (ingen sökning), tar en ruta var 2 s i full upplösning (högst 1920 px)
och hoppar över rutor som skiljer sig från den första (`--fran`, standard 0 s):
fler kanter, mer färgmättnad, eller en fläck som ändrats (medelnivån
bortdragen, skillnadsmasken öppnad 3 × 3 så att stativets darrning längs
starka kanter inte räknas). Att den första rutan är ett tomt bord ska ses med
ögat, och `--till` väljs efter när handen kommer in. Rutorna blir hela
bakgrunder och generatorn tar dem med från nästa körning.

**Gjort 2026-09-29 (MES-288)** — 19 bakgrunder, alla sedda med ögat (tomma):

| Film | Kommando | Bakgrunder |
|---|---|---|
| trä, dagsljus + lampa | `--till 12 --steg 2` (handen kommer vid 13 s) | 7 (0–12 s) |
| svart matta, dagsljus | `--till 12 --steg 2` (handen vid 13 s; 2 s föll på en ljusglidning) | 6 |
| vitt bord, dagsljus | `--fran 2 --till 11 --steg 2`, plus 0 s ur första körningen (något i omgivningen flyttade sig mellan 0 och 2 s) | 6 |

Inom en film är bakgrunderna nästan identiska — det är tre ytor, inte 19.

## Vad som ser konstigt ut eller saknas

Ärligt, i ordning efter hur mycket jag tror det spelar roll:

| Vad | Varför det spelar roll |
|---|---|
| **Inga händer.** Nästan varje riktig ruta har en hand över bordet | eleven lär sig aldrig att en hand inte är ett kort, och inte kort som ligger delvis under en hand. Handfoton med mask att klistra in, eller de riktiga rutorna med lärarens lådor, behövs i grind 2 |
| **Fickorna är för rena.** I de riktiga rutorna är hela fickan mjölkigt blank, ofta med ljusreflexen över halva kortet och kortet självt ljusare och kontrastfattigare. Här är blänket en fläck och ett band | den vanligaste skillnaden man ser i jämförelsen |
| **Korten är helt platta och perfekta fyrhörningar.** Riktiga fickor buktar, kort ligger lite snett i fickan, fickans öppning syns | lådorna blir lite för lätta |
| **Leken ser ut som en låda** — raka, jämna sidor och skarpa kanter. En riktig lek är lite ojämn och fransig | |
| **Den ritade trä-ytan** har vågiga, för regelbundna ådringslinjer (ser ut som sand ibland) och fogar som är helt raka | syns direkt för ett mänskligt öga; troligen ofarligt för detektorn, men den lär sig ytan |
| **Inga andra föremål**: kortaskar, tärningar, räknare, livräknare, telefoner, glas | vanliga falska kort på ett riktigt bord (MES-139 har en kortask i bild) |
| **Scryfall-bilderna är digitala och mättade**; riktiga kort genom en ficka och en telefonkamera är mattare. Dis och JPEG tar bort en del | |
| **Ljuset är ett och samma över hela bilden**: ingen skugga från telefonen eller en arm, ingen andra lampa | |
| Rörelseoskärpan är på ett kort utan hand; ibland blir kortet en suddig kloss | |
| Spelmattans konstverk är uppskalat ur en kortbild och blir suddigt | |
| De riktiga bakgrunderna är tre ytor ur Jespers filmer, ingen annan bakgrund | fler filmer med andra bord ger fler ytor (en rad per film, ovan) |
| Bakgrunden är en platt bild: kameran i generatorn (lutning, avstånd) ändrar inte bordets perspektiv, bara korten. På vita bordet hamnar kort ibland på leksaker och böcker utanför bordet | eleven ser lite fler kort utanför bordet än i filmerna |
| **Ensamma baksidor är en enkel modell.** Ett kort utan ficka är Magic-baksidan med ram och logga, i ficka en enfärgad yta; inga böjda kort, inga fingrar | i filmerna ligger de ofta halvt under en hand |
| Kortens storlek i bild (median 66 px i 960-bilden, 45–150 px) är gissad ur kamerans synfält och bordets bredd. Jespers filmer har ≈ 75–79 px (300–315 px i 4K) | inte justerat; `kamera()` går att ändra så att medianen hamnar på 75 |

**Villkoren för bilderna i träning är inte prövade.** Hämtningen följer
Scryfalls API-villkor (User-Agent och Accept i varje anrop, 110 ms mellan
anropen, bilderna från `*.scryfall.io`, allt cachat). Men kortbilderna är
Wizards of the Coasts, och om villkoren (Scryfalls och Wizards Fan Content
Policy) tillåter att de används för att träna en modell som sedan ingår i en
produkt har ingen tittat på. Det behöver avgöras före grind 2 om modellen
ska släppas.

## Mätt och bedömt

| Mätt (går att räkna om) | Bedömt med ögat |
|---|---|
| tiden per bild, i en och fyra processer | att borden ser ut som bord, och listan ovan |
| att facit stämmer med ritverktygets geometri (`kontroll.cjs`) | att regeln för lådor är rimlig |
| att spärren stoppar provmappar (`bakgrund.py --test`, `delning.py --test`) | att utsnitten är fria från kort, händer och Mesas ramar |
| antalen i tabellerna (ur de 20 JSON-filerna, räknade om 2026-09-29 efter att `lek` blev `baksida`) | att de ensamma baksidorna ser ut som i filmerna (sett på fyra av borden) |

Tiden: 60 bilder i en process 72 s (median 1,12 s per bild); fyra
processer samtidigt 160 bilder på 71 s. Macen är en Intel i5-8259U med fyra
kärnor, allt med `nice -n 19` och ingen golden igång.

## Kör om

```sh
python3 -m venv <scratch>/venv && <scratch>/venv/bin/pip install "numpy<2" opencv-python-headless pillow
PY=<scratch>/venv/bin/python
$PY dev/detektor/synt/hamta.py                      # Scryfall, ~2 min första gången, sedan ingenting
$PY dev/detektor/synt/bakgrund.py --test            # spärren
$PY dev/detektor/synt/bakgrund.py                   # de handvalda tomma ytorna
nice -n 19 $PY dev/detektor/synt/generera.py        # 20 bilder → bilder/ (fro 1–20); ändrat 2026-09-29: klassen baksida, ensamma baksidor, filmbakgrunder
node dev/detektor/synt/kontroll.cjs                 # facit mot rita-geometri
nice -n 19 $PY dev/detektor/synt/generera.py --n 2500 --fro 100000 --ut trn-a   # en av fyra processer för 10 000
```

I en ny worktree: länka `dev/material` först (`ln -s /Users/jesperfunk/Code/magic/dev/material dev/material`).
Mappen `dev/material/arbete/2026-09-29-mes-288-synt/` står som *traning* i
`delning.json` (ny rad), så att grind 2:s träningsskript släpper igenom den.

## Nästa steg mot grind 2

1. **Jesper tittar** på kontaktarket och säger vad som ser mest fel ut.
   Det viktigaste att rätta i generatorn är troligen fickornas blänk.
2. **Händer.** Klistra in händer (maskade foton) över och bredvid korten,
   med korten under räknade som delvis dolda.
3. **Fler bakgrunder** (en rad per film, ovan) — de tre filmerna är gjorda; och
   kortstorleken justerad efter hur stativet står (medianen 66 → ~75 px).
4. **Ignorera-områdena** i YOLOX:s träning (maska förlusten eller grå-tona),
   innan någon tränar på lådorna.
5. **Blandningen i grind 2:** syntetiska bord för högarna + Jespers riktiga
   rutor med lärarens lådor för händer, ljus och fickor. Förslag att börja
   med 5 000–10 000 syntetiska (1–2 h att göra) och se om högarna i golden
   (fall 14, 15, MES-246) blir bättre utan att fler falska dyker upp.
6. **Villkoren** för Scryfall-bilderna i träning.

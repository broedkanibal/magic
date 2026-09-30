# Träningsrutor ur Jespers tre filmer, och lärarens facit på dem (MES-288)

Gjort 2026-09-29 på Jespers Mac. Underlag till grind 2: riktiga rutor med
händer, ljus och fickor, där OWLv2 (läraren) sätter lådorna.

**Kontaktarket:** `open /Users/jesperfunk/Code/magic/dev/detektor/larare/traning.html`
(bilderna ligger under `dev/material/`, som är gitignorerat — arket fungerar
bara där materialet finns). **Uppdaterat arket med regel F (osäkra lådor, gröna
ytor), från den här worktreen:**
`open /Users/jesperfunk/Code/magic/.claude/worktrees/agent-a7ad5463d2a9e77ff/dev/detektor/larare/traning.html`

## Svaret

**Filmerna är bra träningsmaterial, och läraren sätter bra lådor på de kort
som ligger för sig själva — också de som ligger lite omlott, under en suddig
hand eller med baksidan upp. Det den inte klarar är samma sak som i grind 1:
högar och kort som ligger snett.** Högarna blir ignorerade ytor, inte facit
och inte negativer. Ungefär en tredjedel av lärarens lådor på bordet blir
ignorerade.

| Fråga | Svar | Mätt eller bedömt |
|---|---|---|
| Rutor | **638** behållna av 849 provade (en var 2 s, nästan-dubbletter bort) | mätt |
| Bakgrunder (tomt bord) | **19** — men bara tre olika ytor | mätt / sett |
| Stod telefonen still? | **Ja.** Högst 9 bildpunkter (4K) från första rutan i trä och vitt bord; en engångsförskjutning på 8 px de första sekunderna | mätt |
| Facit | **7 583 lådor** i 638 rutor; median 10–14 per ruta, högst 24 | mätt |
| Baksidesflaggan | 701 lådor i 513 rutor (leken nästan varje ruta, plus ensamma baksidor) | mätt; att den träffar rätt är bedömt |
| Ignorerat | 31–36 % av lärarens lådor på bordet, 8–13 % av bildytan (median); regel F (avsnitt 8) lade till 120 osäkra ytor | mätt |
| Lådor på händer | **nästan inga** i de rutor jag sett; kort under en suddig hand får ofta rätt låda | bedömt |
| Lådor utanför bordet | **ja, på vita bordet:** böcker och leksaker runt bordet får lådor (0,16–0,21). Regel E tar bort dem | sett, regeln mätt |
| Snett liggande kort | **missas som facit:** lådan runt ett kort i 25–40° är större än 1,6 × kortet och fälls av storleksfiltret | bedömt |
| Tid | 12,1–12,8 s per ruta (median, 4 trådar, `nice -n 19`), **2,3 h** för alla 638 | mätt |

### Per film (ur `traning.py siffror`)

| Film | Rutor | Facit-lådor (median/ruta) | Baksida (lådor / rutor) | Ignorerade A · B · C · D · E | Ignorerat av lådorna på bordet | Ignorerad bildyta (median) |
|---|---|---|---|---|---|---|
| trä | 200 | 2 709 (14) | 227 / 167 | 116 · 105 · 644 · 356 · – | 31 % | 7,8 % |
| svart matta | 242 | 2 967 (12) | 320 / 205 | 447 · 173 · 645 · 245 · 110 | 34 % | 10,2 % |
| vitt bord | 196 | 1 907 (10) | 154 / 141 | 208 · 62 · 624 · 200 · 863 | 36 % | 12,7 % |

A är många på svarta mattan: där sprids korten i vinkel (se avsnitt 6). E är
många på vita bordet: böckerna och leksakerna runt det.

## Filmerna

Kameraappen rakt av, 3840 × 2160, 30 bps, liggande (ingen rotation i filen),
H.264. Alla tre gick att läsa med AVFoundation (`ruta.swift`) trots att två
saknade Spotlight-metadata. Mapparna heter `-traning-` och `krav_traning`
släpper igenom dem; utmappen står som `traning` i `delning.json`.

| Film | Längd | Underlag | Kortet i bild (4K) | Tomt bord |
|---|---|---|---|---|
| `2026-09-29-traning-tra-dagsljus-lampa` | 604 s | orange träbord, dagsljus + lampa | ≈ 300 × 425 px | 0–12 s |
| `2026-09-29-traning-svartmatta-dagsljus` | 621 s | svart spelmatta på träbord | ≈ 310 × 435 px | 0–12 s |
| `2026-09-29-traning-vittbord-dagsljus` | 471 s | vitt bord, leksaker och böcker runt | ≈ 315 × 440 px | 0–11 s |

Kortets storlek är medianen av lärarens säkra lådor (poäng ≥ 0,3), räknad om
till ett upprätt kort (63 × 88). I den 960 px breda analysbilden är ett kort
~76 × 106 px — större än i golden-fallen.

**Vad som finns i filmerna** (sett på översikten): spridda kort, landhögar
och kolumner omlott, kort i vinkel, tappade (90°), händer som lägger och
flyttar, kort i handen (utfläkta), graveyard, fullt bord, leken (gröna fickor
på trä och svart matta, rosa fickor på vita bordet), ensamma kort med
baksidan upp i ficka, och **kort utan ficka med Magic-baksidan upp** (två på
svarta mattan från ~6:30, två på träbordet i slutet, ett på vita bordet ~6:50).

## 1. Bakgrunder

`synt/bakgrund.py --video` gav först **noll** bakgrunder: den gamla spärren
(kanter > 2 %, färgmättnad > 1 %) var gjord för skärminspelningarnas ritade
ramar. Det orange träbordet är färgmättat i sig, och vita bordets omgivning
är full av kanter. Nu jämförs varje ruta med filmens första (`--fran`):
fler kanter, mer mättnad eller en fläck som ändrats stoppar den. Medelnivån
dras bort (exponeringen glider) och skillnadsmasken öppnas 3 × 3 (stativets
darrning ger tunna linjer längs mattans kant). Att den första rutan är tom
har jag sett med ögat.

| Film | Kommando | Bakgrunder | Handen kommer in |
|---|---|---|---|
| trä | `--till 12 --steg 2` (även provat `--till 14`) | 7 | 13 s |
| svart matta | `--till 12 --steg 2` | 6 (2 s föll: ljusglidning) | 13 s |
| vitt bord | `--fran 2 --till 11 --steg 2` + 0 s ur första körningen | 6 | 12 s |

Alla 19 är sedda: tomma. **Inom en film är de nästan identiska** — det är tre
ytor, inte nitton. Generatorn bör dra en av dem per film, inte vikta på antal.

## 2. Rutorna

`traning.py rutor`: en ruta var 2 s i full upplösning, behållen när den
skiljer sig mer än 4 gråsteg i snitt från den senast behållna (96 px bred
gråskala, som `dubbletter.py`).

| Film | Provade | Behållna | Varför så många |
|---|---|---|---|
| trä | 302 | 200 | händerna rör sig nästan hela tiden |
| svart matta | 311 | 242 | ljus hand mot svart matta ger stor skillnad; median 10 gråsteg mellan rutor |
| vitt bord | 236 | 196 | |
| **alla** | **849** | **638** | |

Gränsen 4 är grind 1:s mellersta. Med stativ och händer i nästan varje ruta
är de flesta rutor verkligen olika; fler bort skulle kosta händer.
`rutor.json` per film har skillnaden för varje provad ruta, så gränsen kan
ändras utan att filmerna läses om.

## 3. Läraren

Exakt grind 1:s inställningar: OWLv2 base, de fyra textfrågorna, tröskel
0,16, NMS 0,6, storleksfilter 0,4–1,6 × kortets yta, inneslutningsregeln.
**En skillnad:** rutan skalas ner till 1920 px bred innan den går in. OWLv2
ser ändå 960 × 960; provat på tre rutor gav 4K och 1920 samma lådor (12/12,
12/13, 13/13 med IoU > 0,8, poängen ±0,01) och 1920 var ~10 % snabbare.

En json per ruta (`owlv2/NNNNN.json`, skriven atomiskt), så en avbruten
körning fortsätter där den slutade. Ordningen är grovt till fint och filmerna
om vartannat (var 8:e ruta i varje film först), så att en halv körning ändå
täcker alla filmer och hela deras längd.

## 4. Baksidan — en flagga, inte en klass

Jesper har bestämt att klassen heter `baksida` (leken eller ett ensamt kort
med baksidan upp; appen avgör vilket ur lekens plats). Flaggan i facit heter
`baksida`. Två färgtest i lådans inre (12 % in från kanterna):

| Sort | Villkor | Fångar |
|---|---|---|
| **Ficka** (ogenomskinlig, en färg) | ≥ 90 % av ytan inom ±10 nyanssteg från den vanligaste färgen, median-mättnad ≥ 100, högst 2 % kanter, och inte hudens/träets nyans (4–30) | leken och ensamma kort i gröna och rosa fickor |
| **Magic-baksidan** (utan ficka) | ≥ 45 % brunt, ≥ 4 % blått (loggan), 3–10 % kanter | de två korten på svarta mattan |

**Prövat och förkastat** (sett på arket): brunt utan blått flaggade händer och
slättkort med solnedgång; 4 % kanter flaggade mörka, blåa framsidor på
träbordet; 70 % en färg flaggade en hand över leken.

**Vad den missar (bedömt):** Magic-baksidan på träbordet (lampans ljus gör
den brunorange ovalen omättad, brunt 0,08) och på vita bordet (loggan blir
grå, blått 0). Två fickor som ligger omlott får en gemensam låda, som ändå
flaggas. En ficka under en hand flaggas inte.

## 5. Högar och annat som okänt — regeln

En **ignorerad yta** är varken facit eller negativ för eleven (samma idé som
`ignorerade` i synt-facit). En facit-låda inne i en ignorerad yta är
fortfarande facit.

| Regel | Villkor | Vad det är |
|---|---|---|
| **A** | en låda över tröskeln som är **större än 1,6 × kortet** (storleksfiltret tog bort den) | låda över flera kort, en hel grupp, eller ett snett kort (se nedan) |
| **B** | en behållen låda som innehåller **två eller fler andra lådor av kortstorlek** (≥ 60 % av deras yta inne i den) | låda över en hög |
| **C** | **tre eller fler** behållna lådor som hänger ihop genom att ligga omlott (skärningen ≥ 15 % av den mindre) — varje låda i gruppen blir en ignorerad yta för sig | tät kolumn, landhög, graveyard |
| **D** | en låda över tröskeln som är **mindre än 0,4 × kortet** | del av ett kort: under handen, i kanten, i en hög — eller konstverket på ett synligt kort |
| **E** | lådans mitt **utanför bordet** (mask ur filmens tomma början; `bord.png`) | böcker, leksaker, surfplattan vid mattan |

Tre saker ändrades efter att arket setts: C var först gruppens omslutande
rektangel och drog in fristående kort bredvid högen; B räknade konstverket
och textrutan på samma kort som "andra kort"; leken (baksida) drogs in i
högens grupp. Nu undantas lådor med baksidesflaggan från C.

Träbordet har ingen mask (E): lampans ljusfläck gör bordet för olikt sig
självt, och bordet fyller nästan hela bilden. Inga lådor utanför bordet setts där.

## 6. Vad läraren missar i just de här filmerna

Bedömt med ögat på ~15 ritade rutor (arket och några till), inte mätt mot ritat facit.

| Vad | Hur ofta | Följd för träningen |
|---|---|---|
| **Kort i vinkel (25–40°)** får en låda som är för stor för storleksfiltret → ignorerad (A) | vanligt på svarta mattan när korten sprids (5:50: fyra kort i vinkel ignorerade, ett utan någon låda alls, av ~20) | de blir inte negativer, men inte heller facit — eleven får få snett liggande kort att lära av. Förslag: rotera storleksfiltret (en låda runt ett kort i vinkel θ är upp till ~1,9 × kortet) eller låt en A-låda utan andra lådor i sig vara facit |
| **Landhögar och kolumner** blir ignorerade (C, D, B) | i nästan varje ruta efter första minuten | som väntat: högarna ska läras på de syntetiska borden |
| **Böcker och leksaker** runt vita bordet får lådor | varje ruta | tas bort av E |
| **Surfplattan** vid svarta mattans kant fick en låda (0,16–0,17) | när den syns | tas bort av E |
| **Två fickor omlott** blir en låda | ibland | en låda över två baksidor som facit |
| **Kort i handen** (utfläkta) | 1–2 rutor per film | bara ignorerade ytor, inga facit — rätt |
| **Lådor på händer** | nästan aldrig; en låda gick över en suddig hand *och* kortet under | |
| **Enstaka kort utan låda** | någon per ruta, oftast under en hand eller i bildkanten | blir negativer — lite brus |

**Vad läraren klarar bra:** kort omlott två och två (båda får egna lådor),
kort under en suddig hand, tappade kort (90°), leken, ensamma baksidor, och
glansiga fickor i lampans ljus.

## 7. Är filmerna bra som träning?

| | Bedömning |
|---|---|
| Stativet | stod still: högst 9 px (4K) förskjutning i trä och vitt bord; en enda ruta på svarta mattan med 60 px, troligen en hand i bandet som mäts (mätt, `stabilitet`) |
| Skärpa | korten är skarpa när de ligger still. Träbordet är mjukast (Laplace-varians i lådorna, median 1 225 mot 2 119 på svarta mattan och 1 630 på vita bordet), troligen lampans blänk på fickorna. Händer i rörelse är suddiga, korten under dem oftast inte (mätt / bedömt) |
| Blänk | lampan ger vita fläckar på fickorna på träbordet — bra träning, precis det golden-fallen har |
| Omgivningen | vita bordet har leksaker och böcker i bild: bra svåra negativer, men läraren tror att några är kort (E behövs) |
| Samma lek | alla tre filmerna har samma kort i nya fickor (gröna eller rosa); variationen i kort är liten |
| Upplösning | 4K ger ~76 × 106 px per kort i 960 px-bilden — större än i golden (~50–70 px). Eleven bör också se nerskalade rutor |

## 8. Regel F: osäkra lådor blir ignorerade ytor (uppgift A, Jesper sa ja 2026-09-29)

**Problemet:** läraren (tröskel 0,16) missar ibland kort som syns helt. Ett synligt
kort utan låda lär eleven att kortet är bakgrund. Exemplet är Valkyrie's Sword i
svarta mattans ruta `01100` (1:50 in i filmen): kortet ligger helt synligt mellan låda 4 och 1,
utan låda.

**Regeln:** OWLv2:s råa lådor sparades med golv 0,02. Regel F använder **0,03** som
golv. Lådor med poäng 0,03–0,16 (efter NMS, som förut) blir **ignorerade ytor**, alltså
varken facit eller bakgrund. Lådor ≥ 0,16 är facit som förut. NMS görs över allt från
0,03 med högst poäng först, så de säkra lådorna blir exakt de som förut (kontrollerat:
facit-lådorna är **identiska**, 2 709 · 2 967 · 1 907, och regel A–E ger samma ytor).

En osäker låda blir bara en F-yta om **alla** stämmer (`traning.py`, konstanterna `F_*`):

| Villkor | Varför |
|---|---|
| storlek 0,5–2,2 × kortet och sidkvot ≤ 2 | en enskild kortstor yta; de flesta osäkra lådor är delar av kort (median 0,4 × kortet) eller hela högar |
| mitten på bordet (regel E:s mask) | böcker och leksaker runt bordet |
| **inte samma kort som en säker låda:** ≥ 60 % av den osäkra inne i en säker låda, eller ≥ 50 % av en säker låda inne i den osäkra | den extra regeln: en osäker låda över ett säkert kort ska inte göra det säkra kortet ignorerat, och släpps därför |
| inte ≥ 80 % inne i en redan ignorerad yta (A–D) | tillför ingenting |
| **mindre än 55 % hudfärg** (YCrCb) i lådans inre | första versionen gav 148 ytor och ungefär hälften på vita bordet var händer; att ignorera en hand hade tagit bort eleven från att lära sig att en hand inte är ett kort |
| inte IoU > 0,4 mot en tidigare F i rutan | dubbletter |

### Vad regeln lade till (alla 638 rutor, utan ny OWLv2-körning, 1 min)

| Film | Ignorerade ytor A–E före | + F | Rutor med F | Ignorerad bildyta, median (A–D → med F) |
|---|---|---|---|---|
| trä | 1 221 | **53** | 46 av 200 | 7,8 % → 8,1 % |
| svart matta | 1 620 | **46** | 26 av 242 | 10,2 % → 11,0 % |
| vitt bord | 1 957 | **21** | 21 av 196 | 12,7 % → 13,0 % |
| **alla** | 4 798 | **120** | 93 av 638 | |

### Kontrollen med ögat: synliga kort som varken har facit-låda eller ignorerad yta

Räknat med ögat på **42 rutor**: de 24 på kontaktarket (åtta per film, valda i förra
passet) och **18 slumpade rutor** utan att ha sett facit först — sex per film, jämnt
spridda över filmen och inte de handvalda (filnamnen är sekund × 10, `00900` = 1:30:
trä `00900 02020 02980 03800 04740 05560` · svart `00840 01800 02660 03520 04380 05580` ·
vitt `00440 01200 01900 02580 03300 04320`). Kort som ligger helt begravda i en hög räknas inte, bara kort
där en yta av kortet syns. Ett kort inne i en ignorerad yta (A–D) räknas som täckt.
I rutorna syns 10–25 kort var.

| | Före regel F | Efter regel F |
|---|---|---|
| Synliga kort utan täckning | **6** kort i 6 rutor | **1** kort i 1 ruta |

De sex: **Valkyrie's Sword** (svart `01100`, poäng 0,05, och trä `02020`, poäng 0,08),
**Ancestral Blade** (svart `03500`, poäng 0,06, och svart `02660`, poäng 0,04), ett
Fractal-token halvt bakom ett annat kort (vitt `04660`, 0,07) och ett kort i en hand
där bara kanten syns (svart `04380`). Regeln täcker de fem första. Det sjätte, kortet
i handen, har ingen osäker låda alls. Sett över hela materialet finns F i 93 av 638
rutor (15 %); i mina 42 rutor saknades ett kort i 6 (14 %), så de stämmer ihop.

**Valkyrie's Sword täcks:** OWLv2 gav den en låda med poäng **0,051**, storlek
139 × 179 px i den 1 600 px breda ritade bilden, alltså 1,1 × kortet. Den låg alltså
i den råa filen men under 0,16. Med golv 0,03 fångas den. (Den ritade bilden
`ritade/…svartmatta-dagsljus-01100.jpg` visar den som grön yta märkt `ignorera F 0.05`.)

### Vad F ignorerar i själva verket (bedömt på ett montage av alla 120 ytor)

| Sort | Ungefär hur många | Kommentar |
|---|---|---|
| Ett riktigt kort som läraren gav låg poäng | ~65 | Valkyrie's Sword, Ancestral Blade, Fencing Ace (samma kort i 22 rutor på träbordet), Fractal-token, ett kort i en hand. Det är det regeln är till för |
| **Leken eller baksidor i fickor** (gröna, rosa) | ~45 | lådor med poäng 0,09–0,15, alltså precis under tröskeln; runt 15 av dem har en hand på sig. De borde vara facit (`baksida`); nu blir de ignorerade i stället för bakgrund. Hälften av svarta mattans F-ytor är ett och samma gröna kort i ficka i rutorna `03840`–`03960` (6:24–6:36 in i filmen) |
| Tom yta eller bara en hand | ~10 | ett par suddiga händer på träbordet, där hudfärgen liknar träet så att hudfiltret inte fångar dem, och två tomma ytor på vita bordet. Litet fel, men eleven lär sig inte att en hand utan kort är bakgrund |

Hudfiltret tog bort 28 ytor, nästan alla på vita bordet (40 → 21). På träbordet
kan det inte skilja hand från träyta (samma nyanser), så där släpper det igenom fler.

### Vad som fortfarande missas

| Vad | Hur stort | Förslag |
|---|---|---|
| **Kort i handen där bara kanten syns** | 1 av 42 rutor | ingen låda alls; bör bli en D-yta. Ingen billig regel |
| **Baksidor i fickor med poäng 0,09–0,15** blir ignorerade, inte facit | ~45 av de 120 F-ytorna | en F-yta som klarar samma färgtest som `ar_baksida` (en färg, få kanter) kan bli facit med baksidesflaggan i stället. Byggs inte här: det ändrar facit |
| **Kort i vinkel (25–40°)** får en A-låda (> 1,6 × kortet) | 272 av 447 A-ytor på svarta mattan är högst 2,3 × kortet, alltså troligen ett enda snett kort | rotera storleksfiltret, eller låt en A-låda utan andra lådor i sig och högst 2,3 × kortet vara facit. Byggs inte här |
| **A-ytor som täcker halva bordet** | 238 av 771 A-ytor är över 3,5 × kortet | ett kort inne i en sådan yta räknas som täckt i måttet ovan, men träffas inte av något facit; två exempel: trä `05560` och svart `06120`, där ett tydligt synligt kort ligger i en jättestor A-yta. Bör delas upp eller ersättas |
| Kort under 0,03 | okänt | golvet 0,02 i de råa filerna är lägsta; ett lägre golv än 0,03 har inte provats, men de lådorna är i medeltal små delar av kort |

**Bordsfilter ("en kortstor, ljus/mörk, rektangulär yta som ingen låda täcker")** behövs
inte för Valkyrie's Sword, eftersom en låda fanns. För kort utan låda alls (kortet i
handen) skulle det kräva en bildanalys som hittar rektanglar på bordet, och det
har jag inte byggt.

**Oprovat:** inget är mätt mot ett ritat facit, bara räknat med ögat på 42 rutor.
Att eleven tränar bättre av F är inte prövat (det görs i grind 2).

## Det som ändrades i generatorn (`synt/`) för grind 2 (gjort 2026-09-29)

1. Klassen `lek` heter nu **`baksida`** i generatorn, facit, YOLO/COCO-klasslistan,
   kontaktarket och `SYNT.md`. Facit har ett nytt fält `slag` (`lek` eller `ensam`).
2. **Ensamma kort med baksidan upp** ligger utanför leken i en del av borden (11 st i
   8 av 20), ibland omlott med ett annat kort, som Magic-baksidan utan ficka, i klar
   ficka eller i bordets ficka.
3. Bakgrunderna är hela rutor ur de tre filmerna (en film väljs först, sedan en ruta
   ur den). De äldre skärminspelningsutsnitten stoppas nu av spärren, eftersom grind 1:s
   mapp står som oanvändbar sedan partiet lades bort.
4. Kortstorleken i `kamera()` är **inte** justerad (median 66 px, filmerna ≈ 75–79 px).

## Mätt och bedömt

| Mätt (går att räkna om) | Bedömt med ögat |
|---|---|
| antal rutor, provade och behållna (`rutor.json`) | att bakgrunderna är tomma |
| lärarens lådor, poäng, tid (`owlv2/*.json`) | vad läraren missar (avsnitt 6) |
| facit, ignorerade ytor per regel, baksidesflaggor (`facit.json`, `siffror`) | att baksidesflaggan träffar rätt (sett på ~15 rutor) |
| stativets förskjutning och skärpan (`stabilitet`) | att filmerna är bra träning |
| 4K mot 1920 px in i OWLv2 (tre rutor) | |

## Kör

```sh
ln -s /Users/jesperfunk/Code/magic/dev/material dev/material     # i en ny worktree
python3 -m venv <scratch>/venv && <scratch>/venv/bin/pip install "numpy<2" torch==2.2.2 torchvision==0.17.2 transformers timm scipy pillow opencv-python-headless
PY=<scratch>/venv/bin/python
$PY dev/detektor/synt/bakgrund.py --video dev/material/inspelningar/2026-09-29-traning-tra-dagsljus-lampa/telefon.mov --till 12 --steg 2
$PY dev/detektor/larare/traning.py rutor                       # ~20 min
sh dev/detektor/vanta-golden.sh && nice -n 19 $PY dev/detektor/larare/traning.py larare   # ~2 h, återupptagbar
$PY dev/detektor/larare/traning.py lage                        # hur långt läraren kommit
$PY dev/detektor/larare/traning.py facit && $PY dev/detektor/larare/traning.py ark
$PY dev/detektor/larare/traning.py siffror                     # talen ovan
$PY dev/detektor/larare/traning.py stabilitet
```

Utdata (gitignorerat): `dev/material/arbete/2026-09-29-mes-288-traningsrutor/<film>/`
— `rutor/`, `rutor.json`, `owlv2/`, `facit.json`, `bord.png` — och `ritade/`.
`facit.json` har per ruta `lador` (andelar av bilden, poäng, baksidesflagga
och färgmåtten) och `ignorera` (låda, regel A–E).

## Läget

Klart 2026-09-29 22:06: alla 638 rutor har lärarlådor, `facit.json` och
arket är gjorda på hela körningen. Kontaktarket har åtta handvalda rutor per
film (`HANDVALDA` i `traning.py`) och två bakgrunder per film.

## 9. Regel G: två lådor med stor överlapp (2026-09-29)

**Fyndet (Jesper):** tre Plains i en liten hög blev två säkra lådor (14: 0,36 och
17: 0,34). Ingen av dem passade ett enskilt kort, och det mittersta kortet fick
ingen låda. Regel C tar bara grupper om tre eller fler lådor, så paret blev facit.
Det lär eleven att en hög på tre kort är två kort med fel kanter.

**Regeln:** två säkra lådor som överlappar med minst `OMLOTT_G` = 0,33 av den
mindre lådan blir båda ignorerade ytor (`regel: 'G'`). Lätt omlott, under en
tredjedel, är kvar som facit. Baksidor mäts före, som för C.

**Siffrorna (facit ombyggt ur de sparade lådorna, ingen ny OWLv2-körning):**

| Film | Facit-lådor före | efter G | G-par | Överlapp i paren, median |
|---|---|---|---|---|
| trä, dagsljus + lampa | 2 709 | 1 843 | 433 | 0,58 |
| svart matta | 2 967 | 2 145 | 411 | 0,66 |
| vitt bord | 1 907 | 1 389 | 259 | 0,56 |

G tar bort ungefär 30 % av facit-lådorna. På sex slumpade rutor med G-par var
paren små högar (2–3 kort, landhögar, en hög under en hand, equipment under en
varelse); i ett par fall var den ena lådan rätt för sitt kort men följer med
ändå. Bedömt med ögat på sex rutor, inte mätt.

**Före/efter mäts med Jespers ritning:** lärarens facit före G ligger kvar som
`facit-fore-G.json` i varje films mapp, och
`matt_larare.py --facit facit-fore-G.json` mäter mot den. Huvudsiffrorna att
jämföra: synliga kort som läraren missar (varken eget eller okänt) och falska
eller sammanslagna facit-lådor.

## 10. Regel H: en låda som kan vara en baksida får klassen okänd (2026-09-30, Jesper sa ja)

**Problemet:** färgtestet `ar_baksida` missar Magic-baksidan utan ficka på träbordet (lampan gör
ovalen omättad, brunt 0,07–0,17) och på vita bordet, lådan över två baksidor omlott på svarta mattan
(brunt 0,30–0,45, strax under gränsen 0,45), och fickor med en hand över. De lådorna var facit med
klassen `kort` — en felaktig etikett som lär eleven fel klass.

**Regeln:** en facit-låda med klassen `kort` som **kan vara** en baksida blir en ignorerad yta
(`regel: 'H'`, fältet `sort` säger vilken delregel). Hellre några riktiga kort som ignoreras än en
baksida som heter `kort`. H körs **sist**, på det som annars hade blivit facit — regel A–G ger
exakt samma ytor som förut (kontrollerat ruta för ruta mot `facit-fore-H.json`), och lådorna med
baksidesflaggan är orörda (227 · 320 · 154).

Nytt mått, **lådans mitt**: en skiva med radien 0,2 × lådans kortaste sida, nerskalad till 48 × 48.
Magic-baksidans oval och en fickas baksida är jämna där; en framsida har konstverk, typrad och
textruta. På de femton lådor jag mätte först: baksidor spridning 7–10 gråsteg och 3–4 % kanter,
framsidor 30–58 och 17–27 %.

| Sort | Villkor (`kan_vara_baksida` i `traning.py`) | Fångar |
|---|---|---|
| **H1** | mitten jämn (spridning ≤ 14, kanter ≤ 0,06), rödbrun nyans (≤ 20 eller ≥ 165), grå 60–190, kanter i hela lådan ≥ 0,04 | Magic-baksidan utan ficka |
| **H1b** | som H1 men lösare mitt (≤ 24, ≤ 0,10) och blått i lådan ≥ 0,10 | Magic-baksidan med ett finger över, eller där prickarna i ovalen ger kanter |
| **H2** | mitten mycket jämn (≤ 8), mättad (≥ 110), inte hudens/träets nyans (0–30) | en ficka som färgtestet fällde |
| **H3** | brunt ≥ 0,25, blått ≥ 0,03, kanter ≤ 0,10 | lådan över två baksidor omlott; baksidor halvt under en hand |
| **H5** | en mättad färg över ≥ 35 % av lådan, kanter ≤ 0,03, inte nyans 4–30 | en ficka (leken) halvt under en hand |
| **H4** | ≥ 50 % hudfärg i lådan och slät mitt (≤ 22, ≤ 0,08) | en hand över något — vad som ligger under går inte att veta |

**Prövat och förkastat:** H1 med den lösare mitten utan kravet på blått gav 25 framsidor på vita
bordet (röda kort) för noll nya baksidor; H4 utan kravet på slät mitt tog 575 lådor på vita bordet
(rosa fickor och varma konstverk räknas som hudfärg); fyra förskjutna skivor i stället för en gav
inga baksidor alls.

### Siffrorna (facit ombyggt ur de sparade lådorna, ingen ny OWLv2-körning)

| Film | Facit `kort` före | efter H | H-ytor | H1 · H1b · H2 · H3 · H5 · H4 | Rutor med H |
|---|---|---|---|---|---|
| trä, dagsljus + lampa | 1 616 | 1 515 | 101 | 35 · 5 · 13 · 9 · 30 · 9 | 68 av 200 |
| svart matta | 1 825 | 1 758 | 67 | 9 · 0 · 6 · 25 · 6 · 21 | 59 av 242 |
| vitt bord | 1 235 | 1 163 | 72 | 3 · 0 · 26 · 6 · 6 · 31 | 61 av 196 |
| **alla** | 4 676 | 4 436 | **240** | 47 · 5 · 45 · 40 · 42 · 61 | 188 av 638 |

### Vad H-ytorna är (räknat med ögat på montage av alla 240 utklipp)

| Sort | Antal | Baksidor | Annat |
|---|---|---|---|
| H1 | 47 | 45 (Magic-baksidan: trä 35, svart 8, vitt 2) | 2 (en kant, en hand över ett kort) |
| H1b | 5 | 5 (träbordet, finger över eller vriden) | 0 |
| H2 | 45 | 44 (gröna och rosa fickor) | 1 framsida (mörkt land) |
| H3 | 40 | 19 (svarta mattan: två baksidor omlott) | 21 framsidor, nästan alla halvt under en hand; en papperslapp |
| H5 | 42 | 33 (leken eller ett kort i ficka under en hand) | 9 framsidor under en hand |
| H4 | 61 | minst 5 (två Magic-baksidor och en rosa ficka på vita bordet, leken under händer på svarta mattan) | ~11 framsidor som syns tydligt, ~45 där handen täcker det mesta |
| **alla** | **240** | **~151** | **~89**, varav ~44 framsidor som syns (de flesta halvt under en hand) och ~45 mest hand |

Alltså: **ungefär 151 baksidor hade klassen `kort`** i lärarens facit (3 % av `kort`-lådorna), och
regeln kostar ungefär 44 framsidor som hade kunnat vara facit (1 %).

### Kontrollen med ögat på hela rutor

32 rutor ritade med facit efter H (`k` = kort, `B` = baksida, H-ytor markerade):

- **14 rutor där det ligger baksidor utan ficka:** trä `05340 05400 05520 05700 05900`, svart
  `04200 04780 04900 05400 06060`, vitt `04040 04060 04080 04100`.
- **18 slumpade** (frö 288, sex per film): trä `00760 02700 03880 03980 04060 05680`, svart
  `00460 02820 02980 03300 03940 04400`, vitt `01100 01160 02660 02760 03600 04620`.

| | Baksidor med klassen `kort` före H | efter H | Framsidor som H ignorerade i onödan |
|---|---|---|---|
| 14 rutor med baksidor utan ficka | 17 (trä 9, svart 5, vitt 3) | **0** | 0 |
| 18 slumpade rutor | 8 (trä 3, svart 3, vitt 2) | **0** säkra, 2 oklara | 0 |

De två oklara: ett kort som hålls i en hand i trä `04060` och i vitt `01100`, där det inte går att
se vilken sida som är upp. I svart `04900` (490 s) var båda Magic-baksidorna redan `baksida`; felet
där ligger i grannrutorna (`04200`, `04400`, `04780`, `05400`: lådan över de två omlott hette `kort`,
nu H3). Alla 32 rutor sågs ritade, men de sista reglerna (H1b, H5) lades till efter att några av dem
setts; för dem är "efter" avläst ur `facit.json` (en H-yta på baksidans plats), inte sett en gång till.

**Inte gjort:** de ~45 av regel F:s osäkra ytor som är leken eller baksidor i fickor (avsnitt 8) är
redan ignorerade och alltså inte fel klass — de är orörda. Och de ~151 baksidorna i H blir *okända*,
inte facit `baksida`: H1, H1b och H2 träffar så rent (94 av 97) att de kunde bli `baksida` i stället,
men det ändrar facit åt andra hållet och är inte beställt.

**Före/efter för lärarmätningen:** facit före H ligger som `facit-fore-H.json` i varje films mapp
(bredvid `facit-fore-G.json`); `matt_larare.py --facit facit-fore-H.json` mäter mot den.

**Mätt och bedömt:** antalen per film och sort är mätta (ur `facit.json`). Vad ytorna föreställer
är räknat med ögat på montage av alla 240 utklipp och på de 32 rutorna — inte mot ett ritat facit.

# Träningsrutor ur Jespers tre filmer, och lärarens facit på dem (MES-288)

Gjort 2026-09-29 på Jespers Mac. Underlag till grind 2: riktiga rutor med
händer, ljus och fickor, där OWLv2 (läraren) sätter lådorna.

**Kontaktarket:** `open /Users/jesperfunk/Code/magic/dev/detektor/larare/traning.html`
(bilderna ligger under `dev/material/`, som är gitignorerat — arket fungerar
bara där materialet finns).

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
| Ignorerat | 31–36 % av lärarens lådor på bordet, 8–13 % av bildytan (median) | mätt |
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

## Det som behöver ändras i generatorn (`synt/`) inför grind 2

Inte ändrat nu (orkestrerarens besked):

1. **Klassnamnet `lek` blir `baksida`** i `generera.py` och i facit.
2. **Ensamma kort med baksidan upp** ska läggas ut utanför leken — i fickans
   färg och som Magic-baksida utan ficka — inte bara leken som en klump.
3. Bakgrunderna ur filmerna är tre ytor; dra per film, inte per fil.
4. Kortstorleken i `kamera()` kan sättas efter filmerna: ~300 × 425 px i 4K.

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

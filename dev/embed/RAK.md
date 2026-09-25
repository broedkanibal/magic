# Räta ut kortet och jämför hela bilden — kan det ersätta ORB? (MES-287)

Bänkprovet 2026-09-25. Frågan: bildmodellen (MobileCLIP-S0) rangordnar
lekens namn, och i dag kontrollerar ORB de tre bästa geometriskt. Kan en
**uträtad jämförelse pixel mot pixel** av hela kortet ersätta ORB som
kontroll, eller komplettera den — utan att tappa 0 säkra fel?

## Svaret: nej som ersättare, ja som en snabbare första kontroll — med en lärdom

| | Ersätter ORB? | Kompletterar ORB? |
|---|---|---|
| Säkra fel | 0 på alla fyra seten — men ORB har också 0–2, och kedjans ORB-regel 0–1 | 0 nya: felen är ORB:s egna |
| Säkra rätt | **färre**: 36 mot 46 (riktiga), 286 mot 362 (syntetiska), 31 mot 39 (högbänken) | **lika eller lite fler**: 47 mot 46, 372 mot 362, 39 mot 39 |
| Tid | 27 ms mot ORB:s 70 ms per kort (median) | ORB behövs för 44–65 % av korten; medianen sjunker 70 → 59 ms på de riktiga, p90 oförändrad |

**Lärdomen:** jämförelsen pixel mot pixel kan inte skilja *tvillingkort*
åt — Thriving Heath mot Thriving Moor, Resistance Reunited mot Danitha
Capashen: samma ram, samma layout, likartat konstverk. Efter inpassning når
fel tvilling rho 0,89–0,94, inom de rätta kortens 0,94–0,97. Det syntetiska
setet har inga kort utanför leken, så trösklarna valda där släppte igenom
dem: golden `--utan-leken` med växeln på gav **tre nya säkra fel** (02, 06,
16). Det som skiljer tvillingarna är avståndet till nästa namn (0,03–0,05)
och modellens egen marginal (0,02–0,04) — därför kräver "bär" nu 0,05 till
nästa namn och modellens marginal ≥ 0,06 (samma trappa som ORB:s 14
inliers). ORB:s geometriska kontroll är fortfarande det som håller kort
utanför leken borta; den uträtade jämförelsen kan bara ta över där
modellen redan är hyfsat säker.

Ensam är den uträtade jämförelsen dessutom sämre än ORB på kort som ligger
under ett annat (kort-over 6/18 mot 15/18) och kort i skugga (9/19 mot
16/19): pixel mot pixel faller när en del av rutan inte är kortet. ORB:s
särdrag tål det.

## Hur den räknar (`rakModul` i `index.html`, klipps ut till bänken av `utdrag.cjs`)

1. Beskärningen (kortet med 8 % marginal, upprätt som `Kamera.beskar` lämnar
   den) rätas ut till en gråbild 64 × 89 (63 × 88 mm) — i modellens
   vridning och den motsatta, som ORB.
2. Referensen (Scryfalls small) i samma storlek. Poolen bär gråbilderna
   (`rec.rak`, ~600 kB), byggda i `byggPoolAv`.
3. **NCC utan inpassning duger inte** (`rak0`): 0,54 för rätt kort mot
   0,54 för fel i ett fall, 0,38 mot 0,40 i ett annat. Ett par pixlars
   förskjutning i lådan räcker för att kvitta skillnaden.
4. **ECC** (Evangelidis & Psarakis 2008, samma som `cv::findTransformECC`):
   affin inpassning i två pyramidnivåer (32 × 44, sedan 64 × 89), högst 12
   varv per nivå, med stegkontroll (steget begränsas, och ett steg som sänker
   korrelationen tas tillbaka — utan det sken den iväg på svaga bilder).
   Efter inpassning: rätt kort 0,94–0,97, fel kort ur samma ram 0,79–0,88,
   fel tvilling 0,89–0,94. Per namn provas grovt den bild NCC valde och den
   bild modellen pekade på, i båda vridningarna; den bästa passas in fint.
5. Domen på **rho** (korrelationen efter inpassning): bär = ettan ≥ 0,88,
   0,05 över nästa namn och modellens marginal ≥ 0,06; emot = ett annat namn
   ligger ≥ 0,88 och 0,05 över ettan. T valt på det syntetiska setet (0
   säkra fel); M och marginalkravet efter kort utanför leken (nedan).
6. Centrering (lekens medelkort dras bort, som modellen gör med vektorerna)
   prövades som mått (`nccC`, `nccC2`): känsligare för konstverket men
   brusigare — 1–4 säkra fel på de riktiga vid samma tröskelval. Domen fälls
   på rho; centreringen finns kvar i raderna.

## Bänken

Samma rad bär modellens svar, NCC, NCC + ECC och ORB (`RAK()` i
`bank.html`), så varje regel räknas ut i efterhand (`rak-analys.cjs`).
Bänkens regel för "modellen säker ensam" kräver ett stöd rho ≥ 0,80
(`--L 0.80`): utan det fällde fall 11:s Swamp i plastficka två säkra fel
(rho 0,78–0,79 på Plains med modellen säker). I kedjans växel finns den
vägen inte alls: Rak bär eller säger emot, resten är som i dag.

ORB-regeln i bänken är `FUSION`:s (bär ≥ 10 inliers, emot ≥ 6, utan
kedjans skal- och marginalspärrar) — därför fler säkra fel här än kedjan
ger: 5 på 61 utanför leken mot golden `--utan-leken`:s 2.

Alla tabeller nedan: kedjans trösklar (`--M 0.05 --modMarg 0.06`).

### Riktiga golden-beskärningar (61)

| Regel | Rätt överst | Säkra rätt | Säkra FEL | ORB behövdes |
|---|---|---|---|---|
| ORB (som i dag) | 52 | 46 | 1 ¹ | 61 |
| Uträtad + ECC i ORB:s ställe | 52 | 36 | 0 | 0 |
| **Uträtad först, ORB när den är osäker** | 52 | **47** | 1 ¹ | 32 (52 %) |

¹ `05-06`: ett Plains ovanpå ett Swamp — bilden visar Plains, facit säger
kortet under. ORB:s eget fel, kvar i kombinationen.

### Samma 61 med 12 av lekens 28 namn borttagna (28 beskärningar utanför leken)

`cache/lek-golden-utan.json`: MES-266:s tolv efter tvillingprincipen (varje
borttaget namns lookalike står kvar). Varje säkert namn på de 28 är ett fel.

| Regel | Säkra rätt | Säkra FEL | Med M 0,03 (före) |
|---|---|---|---|
| ORB (bänkens regel) | 24 | 5 ² | 5 |
| Uträtad + ECC i ORB:s ställe | 14 | **0** | 4 |
| Uträtad först, ORB när den är osäker | 24 | 5 ² | 8 |

² Valkyrie's Sword → Ancestral Blade (×2, 10–11 inliers), Thriving Heath →
Thriving Moor (13), Mirran Bardiche → Ancestral Blade (modellen säker,
0,18), Swamp i hög → Night's Whisper (15 inliers vid skalan 0,39 — kedjans
skalspärr nollar den). Rak:s fyra med M 0,03: Thriving Heath → Thriving Moor
(×3, rho 0,91–0,94, 0,04–0,05 till nästa namn) och Resistance Reunited →
Danitha Capashen (0,89, 0,03).

### Syntetiska (var 8:e av 4 000 = 500)

| Regel | Rätt överst | Säkra rätt | Säkra FEL | ORB behövdes |
|---|---|---|---|---|
| ORB (som i dag) | 424 | 362 | 6 | 500 |
| Uträtad + ECC i ORB:s ställe | 424 | 286 | 0 | 0 |
| **Uträtad först, ORB när den är osäker** | 424 | **372** | 5 | 219 (44 %) |

Per störning, säkra rätt / säkra fel (ORB · uträtad · kombination):

| Störning | n | ORB | Uträtad | Kombination |
|---|---|---|---|---|
| bakgrund | 19 | 15/0 | **17/0** | 18/0 |
| blänk | 19 | 19/0 | 15/0 | 19/0 |
| finger | 19 | 17/0 | 15/0 | 17/0 |
| grund | 19 | 18/0 | 17/0 | 18/0 |
| jpeg | 18 | 16/0 | 14/0 | 16/0 |
| kombinerad | 143 | 83/4 | 49/0 | 86/3 |
| kombinerad-hård | 38 | 10/1 | 5/0 | 10/1 |
| **kort över** | 18 | 15/0 | **6/0** | 15/0 |
| lågupplöst | 19 | 18/0 | 15/0 | 18/0 |
| oskärpa | 19 | 18/0 | 17/0 | 18/0 |
| perspektiv | 18 | 16/0 | 13/0 | 17/0 |
| rörelseoskärpa | 19 | 10/0 | 9/0 | 10/0 |
| rot90 | 19 | 18/0 | 18/0 | 18/0 |
| **vridning** | 19 | 9/1 | **10/0** | 12/1 |
| **skugga** | 19 | 16/0 | **9/0** | 16/0 |
| underexponerat | 19 | 9/0 | 8/0 | 9/0 |
| varmt / kallt / över | 56 | 55/0 | 51/0 | 55/0 |

Förväntningen "bättre vid oskärpa och små kort" höll **inte**: oskärpa 17
mot 18, rörelse 9 mot 10, lågupplöst 15 mot 18. Vinsten ligger i vridning
och lådor som inte sitter, förlusten i kort som ligger under ett annat och
i skugga.

### Högbänken (68: högar, kort på kort, hand över, ensamma)

Beskärningar ur `dev/hogbank/facit.json` (grenen `mes-250-hoglasning`),
skurna av `hog-beskar.cjs`; ett namn räknas rätt när det är kortet överst,
kortet under eller ett tolererat namn i facit.

| Regel | Rätt överst | Säkra rätt | Säkra FEL | ORB behövdes |
|---|---|---|---|---|
| ORB (som i dag) | 56 | 39 | 2 ³ | 68 |
| Uträtad + ECC i ORB:s ställe | 56 | 31 | 0 | 0 |
| **Uträtad först, ORB när den är osäker** | 56 | 39 | 2 ³ | 42 (62 %) |

³ `g03-klump-heath-plains` → Night's Whisper med 10 inliers vid skalan 0,39
(kedjans skalspärr hade nollat den); `pass-220-pharika` → Pharika's Chosen,
där facit saknar namn men fallets id säger att det är just det kortet.
Inget av dem kommer ur den uträtade jämförelsen.

### Tid per kort (median, samma bänk, samma maskin, samma körning)

| | Modellen | NCC | NCC + ECC | ORB | Kombination |
|---|---|---|---|---|---|
| Riktiga (61) | 96 | 5 | 27 (p90 43) | 70 (p90 271) | 59 (p90 327) |
| Syntetiska (500) | 90 | 5 | 23 (p90 37) | 59 (p90 142) | 31 (p90 141) |
| Högbänken (68) | 85 | 6 | 30 (p90 45) | 75 (p90 414) | 86 (p90 453) |
| Riktiga utan 12 namn (61) | 85 | 6 | 31 (p90 44) | 116 (p90 342) | 120 (p90 386) |

"Några ms" höll inte: NCC ensam är 5 ms men duger inte, och inpassningen
kostar 23–31 ms i huvudtråden på Macen (2018, Intel). ORB:s p90 är
landkorten (24 konstverk per basland) — och det är just där kombinationen
fortfarande behöver ORB. Med marginalkravet behövs ORB oftare, och
kombinationens median närmar sig ORB:s.

## Växeln i kedjan

`identifyMedModell` kör den uträtade jämförelsen före ORB när
`Kamera.trosklar.rak` är på (`T.rak`, förval **0**; golden:
`--tro "rak:1"`). Poolen måste bära gråbilderna (`rec.rak`, byggs i
`byggPoolAv`; en sparad pool utan dem ger ORB som förut). Med växeln av är
kedjan oförändrad. `varfor` blir `modell+rak` när Rak bar ettan. Räkningen
går på huvudtråden — ett bygge bör flytta den till räknetråden (MES-221).

### Golden med växeln av och på (2026-09-25, port 8291, egen profil)

Samma port och profil, uppvärmningen kastad, `Poolen: 114 kort` i varje
körning (96 med `--utan-leken`), inget `⏱ tak`. FÖRE = main 4789db7 ur en
kopia (`git archive`), AV = grenen med `T.rak = 0`, PÅ = `--tro "rak:1"`.

| Sats | main 4789db7 | växeln AV | växeln PÅ, M 0,03 (första commiten) | växeln PÅ, M 0,05 + marginal 0,06 |
|---|---|---|---|---|
| 01–12: rätt namn · fel · falska · förlopp | 35/59 · 0 · 3 · 19/22 spelade, 9/9 borttagna | tabellen teckenidentisk | tabellen teckenidentisk | tabellen teckenidentisk |
| 13–16: rätt namn · fel · falska | 14/38 · 1 (det kända i 14, MES-296: spår #7 `[namn]` Resistance Reunited) · 0 | tabellen teckenidentisk | tabellen teckenidentisk | tabellen teckenidentisk, samma spår |
| domskäl 01–12 | modell+orb 20 · modell+namn 12 · modell land 2 · bild 1 | samma | modell+rak 15 · modell+orb 5 · … | modell+rak 13 · modell+orb 7 · … |
| domskäl 13–16 | modell+orb 10 · modell+namn 2 · modell land 1 · bild 1 | samma | modell+rak 6 · modell+orb 4 · … | modell+rak 5 · modell+orb 5 · … |
| `--utan-leken` 01–12 | 12/59 · 2 fel (01, 08 — kända) · 9 falska | samma | 13/59 · **4 fel** (02 och 06 nya) | tabellen teckenidentisk med AV (modell+rak 1) |
| `--utan-leken` 13–16 | 8/38 · 0 fel · 4 falska | samma | 8/38 · **1 fel** (16 nytt) | tabellen teckenidentisk med AV (modell+rak 2) |
| räknetrådens ORB-frågor, kumulativt (01–12 · 13–16) | – | 83 · 45 | 48 · 36 | 54 · 37 |
| stegtid, median per fall (ms) | – | 34 31 36 19 29 32 33 33 14 16 17 15 · 17 32 28 22 | 36 32 37 19 27 33 34 32 13 15 17 14 · 17 30 28 23 | 39 31 38 19 29 33 34 33 14 15 17 14 · 17 31 30 23 |
| fördröjning till namn, videofallen (s) | – | 07 0,6 · 09 0,6 · 10 0,5 · 11 0,85 · 12 1,35 | samma | samma |

Med de slutliga trösklarna bär den uträtade jämförelsen 18 av de 30 namn
ORB bar förut (60 %; 21 med M 0,03), och ORB räknas inte alls för dem.
Inget namn byter dom, inget nytt fel, inga nya falska. Stegtiden (analysen
av en ruta) rörs inte: Rak kör i läsningen, inte i rutans steg.
Fördröjningen till namn i videofallen är densamma på Macen — läsningen är
inte flaskhalsen där.

### `--ljus alla` med växeln på (M 0,05 + marginal 0,06): ett nytt fel

Sju ljus × två satser, `Poolen: 114` i alla fjorton, inget `⏱ tak`. Före =
MES-291:s och MES-293:s körningar på samma `index.html`: 0 fel namn i alla
fjorton. Efter: **0 fel namn i tretton, 1 fel i fall 04 i mörkare ljus**
(rätt namn/kort · fel · falska per ljus, 01–12 → 13–16):

| | mörkare | ljusare | varmare | kallare | kontrast | brus | gradient |
|---|---|---|---|---|---|---|---|
| 01–12 | 36/59 · **1** · 5 | 34 · 0 · 2 | 33 · 0 · 2 | 37 · 0 · 4 | 36 · 0 · 4 | 30 · 0 · 4 | 33 · 0 · 3 |
| 13–16 | 13/38 · 0 · 2 | 3 · 0 · 5 | 12 · 0 · 2 | 10 · 0 · 0 | 13 · 0 · 2 | 12 · 0 · 2 | 10 · 0 · 4 |

Felet, spår för spår (`--ljus morkare --fall 04 --detalj --beskarningar`,
växeln på och av; stillbildsfallen går på väggklockan, så spårmängden
skiljer sig mellan körningarna — 10 spår med växeln på, 7 utan): spår #1,
en låda 0,178 × 0,193 (nästan kvadratisk) över Ancestral Blade som ligger
vridet, blev **säker `[modell+rak]` Ancestral Blade** — rho 0,891, 0,22 över
nästa namn, modellens marginal 0,063 (knivsegg mot 0,06) — medan ORB gav 5
inliers vid skalan 0,505 (utanför `ORB_SKALA`, räknas inte) och utan
växeln lämnade spåret osäkert. Namnet är rätt kort på rätt plats, men lådan
är inte kortets: golden parar den inte med facit (IoU < 0,3) och räknar
ett säkert namn på en oparad låda som fel namn. **ECC:s egen skala säger
samma sak som ORB:s:** inpassningen gav skalan 0,79 (mallen fyller bara
79 % av rutan — rutan är större än kortet). I bänken ligger rätta bärande
kort på 0,90–0,98 i median, p5 0,75–0,83. Skalan är alltså det som fattas
i domen: samma spärr som `ORB_SKALA`/`ORB_HEL`, fast ur `p`. Den är inte
byggd — tiden tog slut — och därför står växeln kvar AV.

Andra celler som skiljer sig från MES-291:s körning är stillbilder utan
fel namn (väggklockan), som förut.

## Vad ett bygge behöver (förslag till issue)

1. **Skalspärr ur ECC:s `p`**: bär bara när sqrt|det| ligger inom ungefär
   0,85–1,15 (mät gränsen i bänken: rätta bärande kort p5 0,75–0,83, fel
   0,79–1,01 — spärren tar 04-mörkare-fallet men kostar några procent av
   de rätta), annars osäker eller `del`. Mät om golden, `--utan-leken` och
   `--ljus alla` med växeln på.
2. **Räknetråden**: Rak går i dag på huvudtråden (23–31 ms på Macen, mer på
   en telefon); flytta den till `LasWorker` som ORB (MES-221).
3. **Telefonen**: tiden via Latency-panelen (Jesper).
4. **Tvillingkort** är gränsen för metoden: samma ram och layout ger rho
   0,89–0,94 på fel kort. Marginalkraven (0,05 till nästa namn, modellens
   0,06) håller `--utan-leken` i golden, men de är valda på just de
   tolv namnen — en ny lek med andra tvillingar behöver mätas om.

## Så körs det om

```bash
node dev/embed/utdrag.cjs                                   # rakModul ur index.html → cache/kedjan.js
node dev/embed/synt.cjs                                     # det syntetiska setet (en gång, ~7 min)
git show mes-250-hoglasning:dev/hogbank/facit.json > dev/embed/cache/hog-facit.json
node dev/embed/hog-beskar.cjs                               # högbänkens 68 beskärningar → cache/hog
node dev/embed/webb.cjs bank.html "(async () => ({ r: await RAK('riktiga'), s: await RAK('synt', {var: 8}), h: await RAK('hog') }))()" --gpu --port 8391 --tak 1500
node dev/embed/lek-utan.cjs                                 # lek-golden-utan.json: 12 namn borttagna
node dev/embed/webb.cjs bank.html "RAK('riktiga', {lek: 'lek-golden-utan', tagg: 'utan'})" --gpu --port 8391
node dev/embed/rak-analys.cjs --L 0.80 --M 0.05 --modMarg 0.06 --fel          # tabellerna ovan
node dev/embed/rak-analys.cjs --tagg utan --L 0.80 --M 0.05 --modMarg 0.06 --fel
```

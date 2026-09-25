# Räta ut kortet och jämför hela bilden — kan det ersätta ORB? (MES-287)

Bänkprovet 2026-09-25. Frågan: bildmodellen (MobileCLIP-S0) rangordnar
lekens namn, och i dag kontrollerar ORB de tre bästa geometriskt. Kan en
**uträtad jämförelse pixel mot pixel** av hela kortet ersätta ORB som
kontroll, eller komplettera den — utan att tappa 0 säkra fel?

## Svaret: kompletterar, ersätter inte

| | Ersätter ORB? | Kompletterar ORB? |
|---|---|---|
| Säkra fel | 0 på alla tre seten — men ORB har 0–1 på de riktiga också | 0 nya: felen är ORB:s egna |
| Säkra rätt | **färre**: 36 mot 46 (riktiga), 320 mot 362 (syntetiska), 32 mot 39 (högbänken) | **fler eller lika**: 48 mot 46, 380 mot 362, 39 mot 39 |
| Tid | 27 ms mot ORB:s 70 ms per kort (median) | ORB behövs för 35–56 % av korten; medianen 41 ms mot 70, p90 oförändrad |

Ensam är den uträtade jämförelsen för snäll mot kort som ligger under ett
annat (kort-over 6/18 mot ORB:s 15/18) och kort i skugga (9/19 mot 16/19):
pixel mot pixel faller när en del av kortet inte är kortet. ORB:s
särdrag tål det. Som **första kontroll före ORB** — bär den ettan hoppas
ORB över, säger den emot är kortet osäkert, annars ORB som förut — vinner
kedjan två säkra rätt på de riktiga beskärningarna och 18 på de syntetiska,
utan ett enda nytt säkert fel.

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
   Efter inpassning: rätt kort 0,94–0,97, fel kort ur samma ram 0,79–0,88.
   Per namn provas grovt den bild NCC valde och den bild modellen pekade på,
   i båda vridningarna; den bästa passas in fint.
5. Domen på **rho** (korrelationen efter inpassning): bär = ettan ≥ 0,88 och
   0,03 över nästa namn; emot = ett annat namn bärs i stället. Trösklarna
   valda på det syntetiska setet (0 säkra fel, flest säkra rätt).
6. Centrering (lekens medelkort dras bort, som modellen gör med vektorerna)
   prövades som mått (`nccC`, `nccC2`): känsligare för konstverket men
   brusigare — 1–4 säkra fel på de riktiga vid samma tröskelval. Domen fälls
   på rho; centreringen finns kvar i raderna.

## Bänken

Samma rad bär modellens svar, NCC, NCC + ECC och ORB (`RAK()` i
`bank.html`), så varje regel räknas ut i efterhand (`rak-analys.cjs`).
Trösklarna för RAK valdes på det syntetiska setet; på de riktiga fällde de
först två säkra fel (fall 11:s Swamp i plastficka, rho 0,78–0,79 på Plains
med modellen säker) — därför kräver modellen-säker-ensam i bänkens regel ett
stöd på rho ≥ 0,80 (`--L 0.80`). I kedjans växel finns den vägen inte alls:
Rak bär eller säger emot, resten är som i dag.

ORB-regeln är bänkens (som `FUSION`): bär ≥ 10 inliers, emot ≥ 6, utan
kedjans skalspärr — därför ett säkert fel mer på högbänken än kedjan skulle
ge (10 inliers vid skalan 0,39).

### Riktiga golden-beskärningar (61)

| Regel | Rätt överst | Säkra rätt | Säkra FEL | ORB behövdes |
|---|---|---|---|---|
| ORB (som i dag) | 52 | 46 | 1 ¹ | 61 |
| Uträtad + ECC i ORB:s ställe | 52 | 36 | 0 | 0 |
| … utan modellen-säker-ensam | 52 | 29 | 0 | 0 |
| **Uträtad först, ORB när den är osäker** | 52 | **48** | 1 ¹ | 27 (44 %) |

¹ `05-06`: ett Plains ovanpå ett Swamp — bilden visar Plains, facit säger
kortet under. ORB:s eget fel, kvar i kombinationen.

### Syntetiska (var 8:e av 4 000 = 500)

| Regel | Rätt överst | Säkra rätt | Säkra FEL | ORB behövdes |
|---|---|---|---|---|
| ORB (som i dag) | 424 | 362 | 6 | 500 |
| Uträtad + ECC i ORB:s ställe | 424 | 320 | 0 | 0 |
| … utan modellen-säker-ensam | 424 | 299 | 0 | 0 |
| **Uträtad först, ORB när den är osäker** | 424 | **380** | 5 | 177 (35 %) |

Per störning, säkra rätt / säkra fel (ORB · uträtad · kombination):

| Störning | n | ORB | Uträtad | Kombination |
|---|---|---|---|---|
| bakgrund | 19 | 15/0 | **18/0** | 19/0 |
| blänk | 19 | 19/0 | 16/0 | 19/0 |
| finger | 19 | 17/0 | 15/0 | 17/0 |
| grund | 19 | 18/0 | 18/0 | 18/0 |
| jpeg | 18 | 16/0 | 16/0 | 16/0 |
| kombinerad | 143 | 83/4 | 61/0 | 89/3 |
| kombinerad-hård | 38 | 10/1 | 6/0 | 11/1 |
| **kort över** | 18 | 15/0 | **6/0** | 15/0 |
| lågupplöst | 19 | 18/0 | 18/0 | 18/0 |
| oskärpa | 19 | 18/0 | 17/0 | 18/0 |
| perspektiv | 18 | 16/0 | 16/0 | 17/0 |
| rörelseoskärpa | 19 | 10/0 | 9/0 | 10/0 |
| rot90 | 19 | 18/0 | 18/0 | 18/0 |
| **vridning** | 19 | 9/1 | **14/0** | 15/1 |
| **skugga** | 19 | 16/0 | **9/0** | 16/0 |
| underexponerat | 19 | 9/0 | 8/0 | 9/0 |
| varmt / kallt / över | 56 | 55/0 | 55/0 | 55/0 |

Förväntningen "bättre vid oskärpa och små kort" höll **inte**: oskärpa 17
mot 18, rörelse 9 mot 10, lågupplöst lika. Vinsten ligger i vridning och
bakgrund (lådor som inte sitter), förlusten i kort som ligger under ett
annat och i skugga.

### Högbänken (68: högar, kort på kort, hand över, ensamma)

Beskärningar ur `dev/hogbank/facit.json` (grenen `mes-250-hoglasning`),
skurna av `hog-beskar.cjs`; ett namn räknas rätt när det är kortet överst,
kortet under eller ett tolererat namn i facit.

| Regel | Rätt överst | Säkra rätt | Säkra FEL | ORB behövdes |
|---|---|---|---|---|
| ORB (som i dag) | 56 | 39 | 2 ² | 68 |
| Uträtad + ECC i ORB:s ställe | 56 | 32 | 0 | 0 |
| **Uträtad först, ORB när den är osäker** | 56 | 39 | 2 ² | 38 (56 %) |

² `g03-klump-heath-plains` → Night's Whisper med 10 inliers vid skalan 0,39
(kedjans skalspärr hade nollat den); `pass-220-pharika` → Pharika's Chosen,
där facit saknar namn men fallets id säger att det är just det kortet.
Inget av dem kommer ur den uträtade jämförelsen.

### Tid per kort (median, samma bänk, samma maskin, samma körning)

| | Modellen | NCC | NCC + ECC | ORB | Kombination |
|---|---|---|---|---|---|
| Riktiga (61) | 96 | 5 | 27 (p90 43) | 70 (p90 271) | 41 (p90 322) |
| Syntetiska (500) | 90 | 5 | 23 (p90 37) | 59 (p90 142) | 27 (p90 135) |
| Högbänken (68) | 85 | 6 | 30 (p90 45) | 75 (p90 414) | 67 (p90 453) |

"Några ms" höll inte: NCC ensam är 5 ms men duger inte, och inpassningen
kostar 23–30 ms i huvudtråden på Macen (2018, Intel). ORB:s p90 är
landkorten (24 konstverk per basland) — och det är just där kombinationen
fortfarande behöver ORB.

## Växeln i kedjan

`identifyMedModell` kör den uträtade jämförelsen före ORB när
`Kamera.trosklar.rak` är på (`T.rak`, förval **0**; golden:
`--tro "rak:1"`). Poolen måste bära gråbilderna (`rec.rak`, byggs i
`byggPoolAv`; en sparad pool utan dem ger ORB som förut). Med växeln av är
kedjan oförändrad. `varfor` blir `modell+rak` när Rak bar ettan. Räkningen
går på huvudtråden — ett bygge bör flytta den till räknetråden (MES-221).

Golden med växeln av och på: se `dev/golden/historik.md` 2026-09-25.

## Så körs det om

```bash
node dev/embed/utdrag.cjs                                   # rakModul ur index.html → cache/kedjan.js
node dev/embed/synt.cjs                                     # det syntetiska setet (en gång, ~7 min)
git show mes-250-hoglasning:dev/hogbank/facit.json > dev/embed/cache/hog-facit.json
node dev/embed/hog-beskar.cjs                               # högbänkens 68 beskärningar → cache/hog
node dev/embed/webb.cjs bank.html "(async () => ({ r: await RAK('riktiga'), s: await RAK('synt', {var: 8}), h: await RAK('hog') }))()" --gpu --port 8391 --tak 1500
node dev/embed/rak-analys.cjs --L 0.80 --fel                # tabellerna ovan
```

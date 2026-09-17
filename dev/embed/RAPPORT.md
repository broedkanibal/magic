# Kan en liten bildmodell sätta kortnamnet lokalt? (MES-213)

Natten 17–18 september 2026. Allt som mättes ligger under `dev/embed/` och
går att köra om — se [LÄS-MIG.md](LÄS-MIG.md).

## Svaret: GO — med två förbehåll

**Ja, bygg in den.** En färdig bildmodell (MobileCLIP-S0, 45 MB) som körs i
webbläsaren sätter rätt namn på **55 av 61 riktiga golden-beskärningar (90 %)**
och på **42 av 43 vanliga kort (98 %)**. Dagens lokala bildkedja
(Matcher + ORB) får 40 av 61 på exakt samma beskärningar. Med en
säkerhetströskel som ger **0 säkra fel** blir 42–49 av 61 kort säkra direkt,
mot 33 med dagens kedja — och svaret kommer på 0,1–0,25 s i stället för
Claudes 1,7–2,2 s.

Förbehållen:

1. **Målet ">95 % på <50 ms" nås inte rakt av.** 95 % nås för vanliga kort
   som ligger för sig själva, inte för hela bordet: basland i högar och kort
   som detektorn inte skurit ut rätt drar ner det till 90 %. Och 50 ms nås
   inte på den här datorn (113 ms med WebGPU, ~240 ms utan). Slutmålet
   *namn inom 300 ms* nås däremot.
2. **Claude behövs kvar — men i bakgrunden.** Ungefär tre av fyra kort blir
   säkra lokalt. Resten (landhögar, klungor, blänk i plastficka) går till
   Claude som i dag, utan att de säkra korten väntar på det.

## Siffrorna i korthet

Riktiga beskärningar = de 60 korten i golden-fallen (+ 1 variant), skurna ur
`bild.jpg` med spårlådorna ur AI-baslinjen, precis som `Kamera.beskar()` gör.
Slutet set: bara lekens 28 namn (105 referensbilder) är kandidater.

| Metod | Rätt namn överst | Säkra vid 0 säkra fel | Tid per kort (den här datorn) |
|---|---|---|---|
| Dagens bildkedja (Matcher + ORB), samma beskärningar | 40/61 (66 %) | 33/61 (54 %) | ~580 ms ¹ |
| Dagens hela lokala kedja i golden (bild + namnläsare) | — | 31/57 | — |
| Dagens kedja + Claude (golden `--ai`) | 57/57 | 57/57 | 1 700–2 200 ms |
| **MobileCLIP-S0**, en referens per konstverk | **55/61 (90 %)** | 51/61 ² | 113 ms WebGPU · 243 ms WASM |
| MobileCLIP-S0 + flera referenser per kort | 55/61 (90 %) | 42/61 (69 %) ³ | samma |
| MobileCLIP-S0 + flera referenser + lärda referenser (K7/K8) | 56/61 (92 %) | **49/61 (80 %)** ³ | samma |
| DINOv2-small (88 MB), med alla knep | 50/61 (82 %) | 27/61 | ~2× långsammare än MobileCLIP |
| MobileNetV4-small (10 MB), med alla knep | 48/61 (79 %) | 27/61 | 16 ms WebGPU · 32 ms WASM |

¹ Mätt i huvudlös Chrome medan en annan session belastade datorn; ostört
kanske hälften. Poängen står sig: inbäddningen är både snabbare och bättre.
² Tröskeln vald på samma 61 bilder — för snällt. ³ Tröskeln vald på det
**syntetiska** setet (marginal till tvåan > 0,11) och sedan prövad på de
riktiga: 47–49 säkra rätt, 0–1 säkert fel (felet är en liten bit av ett kort
i en jättelåda i fall 11, en beskärning dagens kedja själv kallade osäker).

### Uppdelat på källa

| Källa | Fall | MobileCLIP-S0 | Dagens bildkedja |
|---|---|---|---|
| Mesas egen kameravy (skärminspelning, 1080 px) | 01, 02, 07–12 | **23/24 (96 %)** | 19/24 |
| Kameraappen (foton, nedskalade till 1080 px) | 03–06 | **32/37 (86 %)** | 21/37 |

Skillnaden mellan källorna beror på **scenerna, inte bildkvaliteten**:
kameraapp-fallen är de svåra borden (8–12 kort omlott, landhögar, ribbor där
detektorn inte hittar något och Claudes helbildslådor används). Alla fel
utom ett är basland i en hög eller en helbildslåda.

**Åt vilket håll snedvrider 1080 px och dubbel komprimering?** Mot det
pessimistiska — appen borde göra bättre ifrån sig än golden visar:

- Appen beskär ur 4K; golden-videorna är 1080 px, komprimerade två gånger
  (skärminspelning → H.264 1 Mbit/s) och har dessutom appens gula/gröna
  spårrutor inbakade över korten.
- Modellen är känslig för just det. Prov: samma 61 beskärningar försämrade
  en gång till (halv upplösning + två varv hård jpeg) föll från 55 till 27
  rätt med en referens per kort, och till 37 med flera referenser. Kvalitet
  åt andra hållet borde alltså hjälpa — men hur mycket går inte att mäta:
  det finns inget 4K-material i repot.
- Kameraappens foton är skarpare än telefonens video (egen bildbehandling,
  ingen rörelse), så fall 03–06 är *snällare* än video i skärpa men lika
  nedskalade. Där är snedvridningen alltså blandad.
- Det som **inte** finns i golden alls: andra telefoner, riktigt dåligt
  ljus, kort i rörelse. Det täcks bara av det syntetiska setet.

Nästa mätning som skulle avgöra saken: låt appen spara sina egna
beskärningar ur 4K under ett pass (MES-190-spåret) och kör dem genom bänken.

## Vad som går sönder, och varför

Syntetiskt set: 4 000 bilder gjorda ur referensbilderna — kortet i en pose
på ett underlag (riktiga bitar av golden-borden + ritat trä/duk/matta),
spårets låda + 8 % marginal, och **en** förstärkt störning per bild.
MobileCLIP-S0, andel rätt namn (var fjärde bild, n ≈ 37 per typ):

| Störning | En referens | Flera referenser | Kommentar |
|---|---|---|---|
| Lätt av allt (grund) | 100 % | 100 % | |
| Varmt / kallt ljus | 100 / 97 % | 100 / 97 % | ofarligt |
| Överexponerat | 97 % | 100 % | |
| Underexponerat | 76 % | **100 %** | |
| Skuggkant | 92 % | 100 % | |
| Blänk från plastficka | 97 % | 100 % | men se riktiga fall 09–12 nedan |
| Finger över kortet | 100 % | 100 % | |
| Annat kort över (20–45 %) | 86 % | 89 % | svarar ofta med det ÖVRE kortet — rimligt |
| Perspektiv (20–40° lutning) | 97 % | 97 % | |
| Vridet 0–360° | 84 % | 89 % | 45°-lägen värst: lådan är mest bord |
| Liggande i stående låda (helbild) | 92 % | 100 % | |
| Låg upplösning (100–130 px) | 95 % | 100 % | |
| Hård jpeg | 89 % | 97 % | |
| **Oskärpa** | **61 %** | **97 %** | referensen är en skarp skanning |
| **Rörelseoskärpa** | **30 %** | **87 %** | största svagheten |
| Två–tre störningar samtidigt | 65 % | 78 % | |
| Stresstest (~fem samtidigt) | 39 % | 48 % | värre än något golden-foto |

Tre slutsatser:

1. **Oskärpa är fienden, och den går att förebygga gratis.** Referensen är
   en knivskarp skanning, frågan ett suddigt foto. Att bädda in varje
   referens i fyra varianter (skarp, lågupplöst, suddig, varmt ljus) lyfter
   oskärpa 61 → 97 % utan att kosta något per fråga.
2. **Säkra fel uppstår när beskärningen innehåller ett annat kort.** Ett
   kort som ligger över, eller en landhög, ger ett självsäkert svar på *det
   andra* kortet. Det är detektorns problem, inte modellens — och skälet
   till att Claude ska vara kvar som granskare av klungor.
3. **Basland:** för sig själva 94 % rätt (266/284 syntetiska); i golden
   13–14 av 18, och alla fel är högar där Plains och Swamp ligger i samma
   låda. 24 konstverk per landtyp är inget problem för modellen.

Riktiga fel som står kvar (flera referenser): `03-07` Plains i landhög,
`05-03` Scourge (helbildslåda, halvt under Pacifism), `05-06` Swamp under
Plains, `06-05` Swamp i hög, `11-01` Swamp (litet kort i stor låda, två
varianter). Inget vanligt kort som ligger för sig självt blev fel.

### Samma konst i olika tryck

⏳ *fylls i när `storre.cjs` är klar*

## Vad de enkla knepen gav (MobileCLIP-S0, riktiga beskärningar)

| Steg | Rätt överst | Säkra rätt / säkra fel (tröskel ur syntetiska) | Värt det? |
|---|---|---|---|
| A. En referens per konstverk, fyra vridningar, centrerat | 55/61 | 41 / 0 | grunden |
| B. + flera referenser per kort | 55/61 | 45 / 2 → 40 / 0 vid högre tröskel | **ja** — försäkring mot oskärpa, gratis per fråga |
| C. + test-time-augmentering ×3 | 55/61 | 47 / 1 | nej — tre gånger tiden, ingen vinst |
| D. + lärda referenser (K7/K8) från andra tillfällen | 56/61 | **49 / 0** | **ja** — kameravyn 24/24 |
| E. + OCR-vittnet | — | 49 / 0 | ger inget extra: allt namnläsaren kan läsa är redan säkert |
| F. + deck-prior (säkra kort räknas bort) | 56/60 | 49 / 0 | liten vinst, gratis — behåll K6 |

"Centrerat" = referensernas medelvektor dras bort före jämförelsen, så att
det alla Magic-kort har gemensamt (ram, textruta) inte räknas som likhet.
Det lyfte MobileCLIP från 50 till 55 rätt och är en rad kod.

Hela kortet slår konstrutan: hel 55/61, bara konst 39/61, båda ihop 52/61.

## Större lek

⏳ *fylls i när `storre.cjs` är klar*

## Tid och storlek

Mätt i huvudlös Chrome (onnxruntime-web 1.22) på den här datorn: MacBook Pro
2018, Intel i5-8259U, Iris Plus 655. En annan session belastade datorn under
natten, så WASM-talen är snarare för höga än för låga.

| Modell | Storlek | WASM, 4 trådar | WebGPU | Node (jämförelse) |
|---|---|---|---|---|
| MobileCLIP-S0, fp32 | 45,5 MB | 243 ms (bäst 177) | **113 ms** | 55–63 ms |
| MobileCLIP-S0, fp16 | 22,9 MB | ⏳ | ⏳ | — |
| MobileCLIP-S0, int8 | 11,8 MB | ⏳ | — | ⏳ |
| MobileNetV4-small | 10–15 MB | 32 ms | 16 ms | 3–6 ms |
| DINOv2-small | 88,5 MB | ⏳ | ⏳ | 103–115 ms |

Förbehandlingen (canvas → 256×256 → tal) tar 1–3 ms. Jämförelsen mot
referenserna (1 700 vektorer × 512 tal) tar under 1 ms.

**Telefonen — en uppskattning, inte en mätning.** Datorn här är sju år
gammal med inbyggd grafik; en iPhone 13 eller nyare har 1,5–2,5 gånger
snabbare grafik. Rimligt: **50–120 ms med WebGPU** (Safari 26 / Chrome på
Android). Utan WebGPU: 150–300 ms om sidan får köra WASM på flera trådar,
400–900 ms på en tråd. Osäkerheten är stor — en faktor två åt båda håll —
och går bara att få bort genom att öppna `bank.html` på telefonen. Det
kräver https (WebGPU och trådar finns bara i säker kontext), alltså en
förhandsdriftsättning; det gjordes inte i natt.

## Rekommenderad modell

**MobileCLIP-S0 bildkodare, fp16 (23 MB) på WebGPU, fp32/int8 på WASM som
reserv.** Den är bäst på varje mått som spelar roll, hälften så stor som
DINOv2 och dubbelt så snabb. MobileNetV4 klarar 50 ms men bara 79 % — den
duger inte som vittne.

Receptet: hela kortet (inte konstrutan), beskärningens 8 % marginal bortskuren,
256×256, referenser i fyra vridningar × fyra varianter, centrering,
cosinuslikhet, bästa referens per namn, säkert när marginalen till nästa
**namn** är > 0,11–0,15.

## Nästa steg

1. Bygg modulen och provsidan (del 2 nedan) — klart i natt.
2. Mät på Jespers telefon via en förhandsdriftsättning av `bank.html`.
3. För in modulen som vittne i `kamIdentifiera` (planen i del 2).
4. Spara appens egna 4K-beskärningar ur ett riktigt pass och kör dem i bänken.
5. Landhögarna: detektorns sak. Tills dess går klungor till Claude.

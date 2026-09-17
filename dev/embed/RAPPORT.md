# Kan en liten bildmodell sätta kortnamnet lokalt? (MES-213)

Natten 17–18 september 2026. Allt som mättes ligger under `dev/embed/` och
går att köra om — se [LÄS-MIG.md](LÄS-MIG.md).

## Svaret: GO — med två förbehåll

**Ja, bygg in den — som bildvittne i stället för Matcher, inte som ersättare
för Claude.** En färdig bildmodell (MobileCLIP-S0) som körs i webbläsaren
sätter rätt namn på **52–55 av 61 riktiga golden-beskärningar (85–90 %)** och
på **42 av 43 vanliga kort (98 %)**. Dagens bildkedja (Matcher + ORB) får
40 av 61 på exakt samma beskärningar. Svaret kommer på **~100 ms** på den
här datorn (WebGPU), mot ~500 ms för dagens bildkedja och 1,7–2,2 s för
Claude.

Förbehållen:

1. **">95 % på <50 ms" nås inte rakt av.** 95 % nås för vanliga kort som
   ligger för sig själva — inte för hela bordet: basland i högar och kort
   som inte är rätt utskurna drar ner det till 85–90 %. Och 50 ms nås inte
   här (98 ms med WebGPU, 250–700 ms utan). Slutmålet *namn inom 300 ms* nås
   med WebGPU.
2. **Claude behövs kvar — i bakgrunden.** Ungefär **två av tre kort blir
   säkra lokalt utan ett enda säkert fel** (39–42 av 61; dagens bildkedja
   33). Resten — landhögar, klungor, blänk i plastficka — går till Claude som
   i dag, men de säkra korten väntar inte längre på det.

## Siffrorna i korthet

Riktiga beskärningar = de 60 korten i golden-fallen (+ 1 variant), skurna ur
`bild.jpg` med spårlådorna ur AI-baslinjen, precis som `Kamera.beskar()` gör.
Slutet set: bara lekens 28 namn (105 referensbilder) är kandidater.

| Metod | Rätt namn överst | Säkra rätt / säkra fel | Tid per kort (den här datorn) |
|---|---|---|---|
| Dagens bildkedja (Matcher + ORB), samma beskärningar | 40/61 (66 %) | 33 / 0 | ~500 ms ¹ |
| Dagens hela lokala kedja i golden (bild + namnläsare) | — | 31 av 57 / 0 | — |
| Dagens kedja + Claude (golden `--ai`) | 57/57 | 57 / 0–1 | 1 700–2 200 ms |
| **MobileCLIP-S0**, bänken i Node, en referens per konstverk | **55/61 (90 %)** | 41 / 0 ² | — |
| **MobileCLIP-S0, modulen i webbläsaren** (8 vektorer per konstverk) | **52/61 (85 %)** | 46 / 2 ³ | **98 ms** (WebGPU) |
| … med regeln "skymda spår blir aldrig säkra på modellen ensam" | samma | **39–42 / 0** | samma |
| … + lärda referenser (K7/K8), bänken | 56/61 (92 %) | **49 / 0** | samma |
| DINOv2-small (88 MB), med alla knep | 50/61 (82 %) | 27 / 0 ⁵ | ~2× långsammare |
| MobileNetV4-small (10 MB), med alla knep | 48/61 (79 %) | 27 / 0 ⁵ | 16 ms WebGPU · 32 ms WASM |

¹ Huvudlös Chrome medan en annan session belastade datorn; ostört kanske
hälften. ² Tröskeln (marginal > 0,145) vald på det **syntetiska** setet och
sedan prövad på de riktiga. ³ De två säkra felen är samma kort: ett Swamp i
plastficka med blänk i fall 11 (gravfällorna), litet i en dubbelt så stor
låda, i två lådvarianter. Spåret är märkt `skymd` av kedjan själv — därav
regeln på nästa rad. Skillnaden 52 mot 55 är receptet (8 vektorer i stället
för 4 eller 16) och webbläsarens omskalning; se "Vad knepen gav".
⁵ Tröskeln vald på samma 61 bilder — för snällt, men de når ändå inte upp.

### Uppdelat på källa

| Källa | Fall | MobileCLIP-S0 (bänken) | Modulen i webbläsaren | Dagens bildkedja |
|---|---|---|---|---|
| Mesas egen kameravy (skärminspelning, 1080 px) | 01, 02, 07–12 | **23/24 (96 %)** | 22/24 | 19/24 |
| Kameraappen (foton, nedskalade till 1080 px) | 03–06 | **32/37 (86 %)** | 30/37 | 21/37 |

Skillnaden mellan källorna beror på **scenerna, inte bildkvaliteten**:
kameraapp-fallen är de svåra borden (8–12 kort omlott, landhögar, ribborna
där detektorn inte hittar något och Claudes helbildslådor används).

**Åt vilket håll snedvrider 1080 px och dubbel komprimering?** Mot det
pessimistiska — appen borde göra bättre ifrån sig än golden visar:

- Appen beskär ur 4K; golden-videorna är 1080 px, komprimerade två gånger
  (skärminspelning → H.264 1 Mbit/s), och har dessutom appens gula/gröna
  spårrutor inbakade över korten.
- Modellen är känslig för just det. Prov (`forsamra.cjs`): samma 61
  beskärningar försämrade en gång till — halv upplösning + två varv hård
  jpeg — föll från 55 till 27 rätt med en referens per kort, och till 37 med
  flera. Bättre bild borde alltså ge bättre svar, men hur mycket går inte att
  mäta: det finns inget 4K-material i repot.
- Kameraappens foton (03–06) är skarpare än telefonens video (egen
  bildbehandling, ingen rörelse) men lika nedskalade. Där är snedvridningen
  blandad: snällare i skärpa, lika i upplösning.
- Det som **inte** finns i golden alls: andra telefoner, riktigt dåligt ljus,
  kort i rörelse. Det täcks bara av det syntetiska setet.

Mätningen som avgör saken: låt appen spara sina egna beskärningar ur 4K
under ett pass (MES-190-spåret) och kör dem genom bänken.

## Vad som går sönder, och varför

Syntetiskt set: 4 000 bilder gjorda ur referensbilderna — kortet i en pose
på ett underlag (riktiga bitar av golden-borden + ritat trä/duk/matta),
spårets låda + 8 % marginal med lite fel, och **en** förstärkt störning per
bild. Andel rätt namn; MobileCLIP på var fjärde bild (n ≈ 37 per typ), dagens
kedja på var åttonde (n ≈ 19).

| Störning | MobileCLIP, en referens | MobileCLIP, flera referenser | Dagens kedja (Matcher + ORB) |
|---|---|---|---|
| Lätt av allt (grund) | 100 % | 100 % | 100 % |
| Varmt / kallt ljus | 100 / 97 % | 100 / 97 % | 100 / 89 % |
| Över- / underexponerat | 97 / 76 % | 100 / **100 %** | 89 / 100 % |
| Skuggkant | 92 % | 100 % | 100 % |
| Blänk från plastficka | 97 % | 100 % | 95 % |
| Finger över kortet | 100 % | 100 % | 100 % |
| Annat kort över (20–45 %) | 86 % | 89 % | 89 % |
| Annan bakgrund, slarvig låda | 97 % | 97 % | 95 % |
| Perspektiv (20–40° lutning) | 97 % | 97 % | **72 %** |
| Vridet 0–360° | 84 % | 89 % | **47 %** |
| Liggande kort i stående låda (helbildens lådor) | 92 % | 100 % | **5 %** |
| Låg upplösning (100–130 px) | 95 % | 100 % | 89 % |
| Hård jpeg | 89 % | 97 % | 100 % |
| **Oskärpa** | **61 %** | **97 %** | 95 % |
| **Rörelseoskärpa** | **30 %** | **87 %** | 84 % |
| Två–tre störningar samtidigt | 65 % | 78 % | 65 % |
| Stresstest (~fem samtidigt) | 39 % | 48 % | 55 % |
| **Alla** | **77 %** | **88 %** | **77 %** |

Fyra slutsatser:

1. **Oskärpa är modellens fiende — och den går att förebygga gratis.**
   Referensen är en knivskarp skanning, frågan ett suddigt foto. Att också
   bädda in en suddig, lågupplöst variant av varje referens lyfter oskärpa
   61 → 97 % utan att kosta något per fråga.
2. **Modellen och ORB är bra på olika saker.** Modellen tål vridning,
   perspektiv och lådor som inte sitter rätt; ORB tål oskärpa och — viktigast
   — har **aldrig ett säkert fel** (0 av 500 syntetiska, 0 av 61 riktiga),
   tack vare den geometriska kontrollen. Därför: modellen rangordnar, ORB
   kontrollerar. Se planen i del 2.
3. **Modellens säkra fel uppstår när beskärningen innehåller ett annat
   kort**: ett kort som ligger över, en landhög, ett litet kort i en stor
   låda. Den svarar då självsäkert med det som syns mest. Det är detektorns
   problem, inte modellens — och skälet till att klungor ska fortsätta gå
   till Claude.
4. **Basland:** för sig själva 94 % rätt (266 av 284 syntetiska). I golden
   13–14 av 18, och alla fel är högar där Plains och Swamp ligger i samma
   låda. 24 konstverk per landtyp är inget problem: poängen räknas per namn.

Riktiga fel som står kvar: `03-07` Plains i landhög, `05-03` Scourge
(helbildslåda, halvt under Pacifism), `05-06` Swamp under Plains, `06-05`
Swamp i hög, `11-01` Swamp (ovan). **Inget vanligt kort som ligger för sig
självt blev fel.**

### Samma konst i olika tryck

Frågan är en tryckning som *inte* finns bland referenserna, men vars
konstverk gör det (113 sådana tryckningar av lekens namn; Pacifism har 28).

| | Samma ramgeneration | Annan ramgeneration (t.ex. 2015 mot 2003) |
|---|---|---|
| Lätt störd | 168/168 (100 %) | 31/32 (97 %) |
| Två–tre störningar | 116/160 (73 %) | 30/40 (75 %) |

Ett annat tryck kostar alltså nästan ingenting — konsten bär. Poolens regel
"ett konstverk per namn räcker, vilket tryck som helst" håller.

## Vad de enkla knepen gav (MobileCLIP-S0, riktiga beskärningar, bänken)

| Steg | Rätt överst | Säkra rätt / säkra fel ⁴ | Värt det? |
|---|---|---|---|
| A. En referens per konstverk, fyra vridningar, centrerat | 55/61 | 41 / 0 | grunden |
| B. + flera referenser per kort (skarp, lågupplöst, suddig, varm) | 55/61 | 45 / 2 (40 / 0 vid högre tröskel) | **ja** — försäkring mot oskärpa, gratis per fråga; syntetiska 77 → 88 % |
| C. + test-time-augmentering ×3 | 55/61 | 47 / 1 | nej — tre gånger tiden, ingen vinst |
| D. + lärda referenser (K7/K8) från **andra** inspelningstillfällen | 56/61 | **49 / 0** | **ja** — kameravyn 24/24 |
| E. + OCR-vittnet (namnläsaren ur golden-baslinjen) | — | 49 / 0 | inget extra: det namnläsaren kan läsa (14 kort) är redan säkert |
| F. + deck-prior (säkra kort räknas bort ur kandidaterna) | 56/60 | 47 / 0 | liten vinst, gratis — behåll K6 |

⁴ Tröskeln vald på det syntetiska setet (marginal > 0,11–0,145), prövad här.

- **"Centrerat"** = referensernas medelvektor dras bort före jämförelsen, så
  att det alla Magic-kort har gemensamt (ram, textruta) inte räknas som
  likhet. Det lyfte MobileCLIP från 50 till 55 rätt och är en rad kod.
- **Hela kortet slår konstrutan:** hel 55/61, bara konst 39/61, båda 52/61.
- **Fyra vridningar av referensen behövs** (55 mot 51 med två): helbildens
  lådor vet inte hur kortet ligger.
- **Modulens recept** blev 4 vridningar × 2 varianter (skarp + suddig) = 8
  vektorer per konstverk: 54/61 i bänken, 90 % syntetiskt, halva byggtiden
  mot 16 vektorer (55/61, 91 %).

## Större lek

Commander-stor kandidatmängd = de 98 mest spelade Commander-korten enligt
EDHREC + baslanden (908 referensbilder). "Flera lekar samtidigt" =
golden-leken + hela den mängden (126 namn).

| Kandidater | Riktiga beskärningar | Syntetiska ur golden-leken | Säkra (marg > 0,11) |
|---|---|---|---|
| 28 namn (golden-leken) | 54/61 (89 %) | 89,9 % | 68 % |
| 50 namn | — | 84,3 % | 59 % |
| 75 namn | — | 82,3 % | 56 % |
| 100 namn | — | 80,9 % | 53 % |
| 126 namn (egen lek + motståndarens) | 48/61 (79 %) | 79,7 % | 52 % |
| Commander-100 mot sig själv (syntetiska ur den) | — | 81,5 % | 53 % |

Träffen faller **ungefär fem procentenheter per fördubbling** av antalet
namn, och andelen säkra faller snabbare än träffen (marginalerna krymper).
Antalet säkra **fel** växer inte (2 → 0 på de riktiga; 6–12 av 1 850 syntetiska
hela vägen, de flesta kort som ligger över ett annat). Slutsats: håll
kandidaterna till **spelarens egen lek** så länge det går (kameran ser
spelarens eget bord), och låt deck-priorn krympa mängden under spelet.
Motståndarens kort som kandidater kostar tio procentenheter.

## Tid och storlek

Mätt i huvudlös Chrome (onnxruntime-web 1.22) på den här datorn: MacBook Pro
2018, Intel i5-8259U, Iris Plus 655. En annan session belastade datorn hela
natten (load 11–34), så WASM-talen spretar; WebGPU-talen är stabila.

| Modell | Storlek | Träff (riktiga) | WebGPU | WASM 4 trådar | WASM 1 tråd |
|---|---|---|---|---|---|
| MobileCLIP-S0, fp32 | 45,5 MB | 55/61 | **113–130 ms** | 243 ms (bäst 177; 690 under hård last) | 374 ms |
| MobileCLIP-S0, fp16 | 22,9 MB | 55/61 — **ingen förlust** | gick inte här (grafikkortet saknar `shader-f16`) | 654 ms under hård last ≈ fp32 | — |
| MobileCLIP-S0, int8 (färdig, dynamisk) | 11,8 MB | **7/61 — oanvändbar** | — | långsammare än fp32 i Node (133 mot 55 ms) | — |
| MobileNetV4-small | 10–15 MB | 48/61 | 16 ms | 32 ms | — |
| DINOv2-small | 88,5 MB | 50/61 | inte mätt | inte mätt (Node: 103–115 ms, dubbla MobileCLIP) | — |

Hela modulens svar (förbehandling + modell + jämförelse mot 840 vektorer):
**median 98 ms, p90 113 ms** med WebGPU. Att bädda in golden-leken (105
bilder → 840 vektorer) tog 86 s; modellen laddar på 2–9 s första gången.

**Kvantisering:** fp16 kostar ingenting i träff och halverar nedladdningen —
använd den där grafikkortet klarar det (Apple-kretsar gör det). Den färdiga
int8-filen förstör modellen; en egen, kalibrerad int8 är ett eget arbete och
lockar inte: WASM blev inte snabbare av den.

**Telefonen — en uppskattning, inte en mätning.** Datorn här är sju år
gammal med inbyggd grafik; en iPhone 13 eller nyare har 1,5–2,5 gånger
snabbare grafik. Rimligt: **50–120 ms med WebGPU** (Safari 26, Chrome på
Android). Utan WebGPU: 150–400 ms om sidan får köra WASM på flera trådar,
400–900 ms på en tråd. Osäkerheten är en faktor två åt båda håll och går
bara att få bort genom att öppna `bank.html` på telefonen. Det kräver https
(WebGPU och trådar finns bara i säker kontext), alltså en
förhandsdriftsättning — det gjordes inte i natt.

## Rekommenderad modell

**MobileCLIP-S0:s bildkodare.** fp16 (23 MB) på WebGPU där det går, fp32
(45 MB) annars, WASM som reserv. Bäst på varje mått som spelar roll, hälften
så stor som DINOv2 och dubbelt så snabb. MobileNetV4 klarar 50 ms men bara
79 % — den duger inte som vittne.

Receptet: hela kortet, beskärningens 8 % marginal bortskuren, 256×256,
varje referens i fyra vridningar × skarp/suddig, centrering, cosinuslikhet,
bästa referens per **namn**, säkert när marginalen till nästa namn är > 0,11
(99 % rätt i kalibreringen) **och** spåret inte är skymt.

**Att kolla före produktion:** vikterna är Apples (licensen "Apple Sample
Code License" på Hugging Face). Läs den innan modellen skeppas i en produkt.

## Nästa steg

1. Mät på Jespers telefon: en förhandsdriftsättning av `bank.html` + modellen
   (kräver https och COOP/COEP-huvuden).
2. För in modulen som vittne i `kamIdentifiera` enligt planen i del 2, och
   bevisa det med golden-måtten där.
3. Spara appens egna 4K-beskärningar ur ett riktigt pass och kör dem i bänken.
4. Centralt förräknade vektorer per Scryfall-id (annars tar en Commander-lek
   en kvart att bädda in på telefonen).
5. Landhögarna är detektorns sak. Tills dess går klungor till Claude.

---

# Del 2 — modulen, provsidan och planen

## Modulen: `dev/embed/embed.js`

En fristående fil med samma form som `dev/matcher.js` och `dev/orb.js`
(`window.Embed`). Ingen ändring i `index.html`.

| Anrop | Gör |
|---|---|
| `Embed.ladda({backend})` | hämtar onnxruntime-web + modellen (läggs i Cache Storage), väljer WebGPU om det finns, annars WASM (flera trådar om sidan är isolerad, annars en; då i en egen worker) |
| `Embed.byggLek(kod, kort, {onProg})` | bäddar in lekens bilder: 8 vektorer per konstverk (4 vridningar × skarp/suddig). Sparar per kort och per lek i IndexedDB (`mesa-embed`) — en ändrad lek bäddar bara in de nya korten |
| `Embed.laddaLek(kod)` / `glom(kod)` | läser / tar bort lekens post |
| `Embed.identifiera(canvas, idx, {utan})` | svarar `{namn, id, saker, sakerhet, marginal, poang, cands, ms, backend}`. `utan` = namn som räknas bort (deck-prior) |
| `Embed.laggTill(idx, {id, name, bild})` / `taBort(idx, id)` | lärda referenser (K7/K8), rak och vänd |

`saker` = marginalen till nästa **namn** > 0,11. `sakerhet` = uppmätt andel
rätt vid den marginalen (0,40 vid 0 … 0,99 vid 0,13 … 1,0 från 0,2).

## Provsidan: `dev/embed/bank.html`

```bash
node dev/embed/server.cjs
```

Öppna <http://localhost:8377/dev/embed/bank.html>. Knapparna kör modulen,
dagens kedja (Matcher + ORB, utklippt ur `index.html` av `utdrag.cjs`) och
de två som vittnen tillsammans, mot de riktiga och de syntetiska
beskärningarna. Tabellen visar träff, säkra rätt, **säkra fel** och ms per
kort. Siffrorna nedan är körda i huvudlös Chrome (`webb.cjs`), eftersom
browserpanelens dolda flik stryper trådarna.

Modulen (MobileCLIP-S0 fp32 på WebGPU — grafikkortet här saknar shader-f16
så fp16 föll tillbaka), receptet 4 vridningar × skarp/suddig, tröskel
marginal > 0,11, och kedjans skräpspärr `serUtSomKort` före modellen (mattans
nivå skattad ur beskärningens marginal):

| | Rätt överst | Säkra rätt | Säkra fel | ms per kort (median) |
|---|---|---|---|---|
| Modulen ensam · riktiga (61) | 52 (85 %) | 46 | 1 ⁶ | **98** |
| Modulen ensam · syntetiska (var 8:e, 500) | 423 (85 %) | 289 (58 %) | 5 (1,0 %) | 119 |
| Dagens kedja (Matcher + ORB) · riktiga | 40 (66 %) | 33 | 0 | ~500 |
| Dagens kedja · syntetiska | 386 (77 %) | 333 (67 %) | 0 | ~490 |
| **Två vittnen: modulen rangordnar, ORB kontrollerar de tre bästa** · riktiga | 52 (85 %) | **46** | **1** ⁶ | 260 |
| Två vittnen · syntetiska | 424 (85 %) | **362 (72 %)** | 6 (1,2 %) ⁷ | 200 |
| WASM-vägen (4 trådar i egen worker, belastad dator) | fungerar | — | — | 258 (p90 464) |

⁶ Felet är `05-06`: ett Plains som ligger ovanpå ett Swamp — beskärningen är
till största delen Plains, och både modellen och ORB (13 inliers) säger
Plains. Det är en riktig bild av vad som syns; facit är kortet under.
Fall 11:s två beskärningar (samma Swamp i plastficka) blir osäkra i
tvåvittnesläget: ORB pekar på ett annat namn med 6–9 inliers, och då får
modellens marginal (0,18–0,21) inte bestämma ensam. ⁷ Tre av de sex är
kortet som ligger ÖVER (rätt om vad som syns); de tre andra är mörka svarta
kort som blir Night's Whisper (ORB håller med, 6–12 inliers).

Så många ORB-kontroller bär: av de 46 säkra riktiga bärs 45 av ORB (≥ 10
inliers på modellens etta), 1 av modellen ensam. Med "modellen ensam får
inte vara säker när ORB har ≥ 6 inliers på ett annat namn" föll säkra fel
från 3 till 1 på de riktiga och från 49 till 46 säkra rätt.

**Utanför leken:** slutet set betyder att modellen alltid svarar *något*.
Prov med en lek på 16 av de 28 korten: 5 av 61 blev säkra FEL på modellen
ensam. Ett kort som inte finns i leken (motståndarens, en token) måste
stoppas av ORB-kontrollen eller Claude — modellen märker det inte själv.

Självtestet (`SJALVTEST()`): lärd referens lyfter Pharika's Chosen från
marginal 0,10 (osäker) till 0,36 (säker); posten läses tillbaka ur IndexedDB
med samma svar; `taBort` återställer exakt; `utan` räknar bort ett namn.
Att bädda in golden-leken (105 bilder, 840 vektorer) tog 86 s med WebGPU
på den här datorn.

## Integrationsplanen (koden i `index.html` skrivs inte i natt)

Radnummer gäller `index.html` vid c5e8dad; funktionsnamnen är det som gäller
om filen flyttat på sig.

### 1. Var modulen går in: `kamIdentifiera` (rad ~20752)

I dag: `serUtSomKort` → `Namn.las` (titelraden, i worker) parallellt med
`identifyAt` (Matcher rangordnar hela poolen, ORB kontrollerar de 15 bästa)
→ tvåvittnesvägningen → `{namn, saker, cands, varfor}`.

Nytt: **modellen tar Matchers plats som den som rangordnar.**

| Steg | I dag | Med modulen |
|---|---|---|
| Skräpspärr | `serUtSomKort` | oförändrad |
| Rangordning | `Matcher.scan` över hela poolen (~300–500 ms) | `Embed.identifiera(canvas, idx, {utan})` (~100 ms), parallellt med `Namn.las` |
| Geometrisk kontroll | `orbIdentify` på Matchers 15 bästa | `orbIdentify` på modellens **3 bästa namn** (alla deras konstverk), vridningen ur modellens svar |
| Baksidan | poolens uppslag `BAKSIDA_NAMN` | baksidan bäddas in som ett eget namn — samma regel (`varfor: 'baksida'`) |
| Reserv | — | modulen inte laddad / leken inte inbäddad än / fel → dagens `identifyAt` som förut |

`identifyAt` behålls orörd för datorns skärmdumpsväg och som reserv.
`kamIdentifiera` får en gren: `const e = Embed.redo && EmbedLek ? await
Embed.identifiera(...) : null`.

### 2. Hur tvåvittnes-fusionen ändras

Tre vittnen i stället för två: **M** (modellen: namn + marginal), **O** (ORB:
inliers på modellens kandidater), **N** (namnläsaren, som i dag).

| Läge | Dom | `varfor` |
|---|---|---|
| M säker (marginal > 0,11) och varken O eller N säger emot | **säker** | `'modell'` |
| M:s etta bärs av O (≥ `ORB_ACCEPT` inliers) | **säker**, även vid låg marginal | `'modell+orb'` |
| M:s etta = N:s namn (säkert eller svagt namn) | **säker** | `'modell+namn'` |
| N säkert på ett ANNAT namn än M, M inte säker | N vinner som i dag | `'namn ensamt'` |
| M säker men N säkert på annat, eller O ≥ **6** inliers på ett annat av de tre | **osäker** → Claude | `'konflikt'` |
| Annars | **osäker** → Claude | `'osäker'` |

Landregeln (`confident`: 4 av 6 bästa samma basland) försvinner: modellen
räknar redan poäng per namn, så 24 konstverk konkurrerar inte med varandra.
Regeln "land mot namn" och antalspriorn K6 behålls — K6 får dessutom verka
tidigare: namn vars exemplar är slut skickas in som `utan`, så att modellen
inte ens föreslår dem.

Uppmätt i `bank.html` (två vittnen, riktiga): 46 säkra rätt, 1 säkert fel
(ett Plains ovanpå ett Swamp — det som syns), mot dagens 33 / 0.

Kort **i en klunga** ska aldrig bli säkra på modellen ensam: det är där de
säkra felen uppstår (den svarar med det kort som syns mest). Spår vars låda
är större än `kortRef` tillåter (klump, `skymd`) går till Claude som i dag.

### 3. Hur inbäddningarna byggs vid lekbygge

- `byggKamPool` (rad ~20693) → efter `byggLekPool`: `Embed.byggLek('lek:' +
  id, cards)` med **samma kortlista** som `byggPoolAv` får (alla konstverk,
  24 per basland, baksidan). Körs i bakgrunden; kameran använder dagens
  kedja tills posten finns. Statusraden: "Learning the deck… %" som i dag.
- Kostnad: 8 körningar per bild. Golden-leken (105 bilder) ≈ 95 s på den här
  datorn med WebGPU. Sparas **per kort** i IndexedDB, så ett nytt kort i
  leken kostar 1 s, inte en ombyggnad.
- En Commander-lek (≈ 900 bilder) tar en kvart lokalt — för långsamt. Där
  bör vektorerna **räknas en gång centralt** och hämtas: de beror bara på
  Scryfall-id och modellversion (8 × 512 tal ≈ 8 KB per bild som fp16).
  Förslag: en tabell/bucket i Supabase som fylls av ett skript (samma kod som
  `lib.cjs`), och `byggLek` frågar där först. Eget ärende.
- Lärda referenser (K7/K8): `Ref.tillampa` → också `Embed.laggTill`,
  `Pool.taBort` → också `Embed.taBort`. Mätt: +1 rätt och kameravyn 24/24.
- Modellfilen (23 MB fp16) hämtas när poolen byggs, som tesseract i dag, och
  läggs i Cache Storage. Går den inte att hämta: dagens kedja.
- **WASM-trådar kräver att sajten är cross-origin isolated** (COOP/COEP i
  `vercel.json`). Det påverkar allt sajten laddar från andra håll (Supabase,
  jsdelivr, Scryfall-bilder) och måste provas för sig. Utan det: WebGPU
  eller en tråd. Börja med WebGPU-vägen och låt WASM vara reserv.

### 4. Claude som bakgrundsgranskare

I dag ligger Claude på den kritiska vägen för 26 av 57 kort i golden (de
lokalt osäkra): spåret **prövas** i 1,7–2,2 s innan kortet får ett namn.

| | I dag | Med modulen |
|---|---|---|
| Säkert lokalt | 31/57 → klart direkt | ≈ 45–49/61 → klart på ~0,1–0,3 s |
| Osäkert | `kamFragaAI`, spåret prövas | **samma väg** — men det gäller färre kort, mest klungor och landhögar |
| Helbilden (`planeraHelbild`) | när detektorn inte ser något | oförändrad — och dess lådor är just de modellen klarar sämst (liggande kort i stående låda), så Claudes namn gäller där |
| Granskning av säkra lokala svar | finns inte | **ny, billig:** helbildens svar jämförs med spårens säkra namn; skiljer de sig blir spåret osäkert och går till granskningen. Ingen extra kostnad — helbilden tas ändå högst två gånger i minuten |

Ingen ändring i systemprompten behövs för något av detta.

### 5. Golden-mått som ska bevisa att det blev bättre

Kör `node dev/golden/kor.cjs` (utan `--ai`) före och efter, och `--ai` efter:

| Mått | I dag | Mål |
|---|---|---|
| Rätt namn lokalt (utan `--ai`) | 31/57 | **≥ 45/57** |
| Fel namn lokalt | 0 | **0** |
| Falska | 5 | inte fler |
| `namnViaAi` med `--ai` (kort som behövde Claude) | 26 | **≤ 12** |
| Rätt namn med `--ai` | 57/57, 0 fel | oförändrat |
| Tid per identifiering (spårets `lokalMs`) | ≈ 500 ms för bilddelen i bänken (belastad dator) | **≤ 300 ms** |
| `videoFordrojning` (07, 09–12): tid från utspel till säkert namn | nu | kortare — K4 (`spekulera`) får ett svar på 0,1 s |
| Nytt mått: `varfor` fördelat på `modell` / `modell+orb` / `modell+namn` | — | redovisas, så att det syns vilket vittne som bar |

Och `bank.html` körs före varje ändring av receptet (`Embed.V` höjs då, och
alla sparade vektorer byggs om).

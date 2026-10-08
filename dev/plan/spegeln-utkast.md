# Spegeln mot facit — utkast (partiet 2026-09-21, sekund 240–540)

> Utkast från nattpasset, del D. Skrivet avsnitt för avsnitt. Ingen kod är
> ändrad och inga issues är skapade. Allt som kräver ett beslut av Jesper är
> markerat **BESLUT**.

## Kort sammanfattning

Fem minuter av ett riktigt parti (sek 240–540), Mesas beslut mot ett facit
som två agenter skrivit ur rutorna. Siffrorna är **punktvärde (intervall)**;
intervallet är hur mycket facits osäkra rader kan flytta dem.

| Vad | Antal | Säkerhet |
|---|---|---|
| Spår per kort och vistelse (ideal 1) | icke-land **~2**, land i högen **5–8** | medel |
| Falska `borta` (kortet låg kvar) | **50** (43–55) — 41 av dem i landhögarna. Riktiga: 4 | hög |
| Missade kort (inget namn inom 5 s) | **6 av 8** (4–7) | medel |
| Fel namn (säkra) | **1** (1–3) — från helbilden, inte från telefonens läsning | medel |
| Dubbletter + kvarglömda kort | **5** (3–7) + **3** | medel |

**Vad det betyder:**

1. **Fladdret är landhögarna.** Fyra av fem falska `borta` och de flesta
   extra spår kommer från land som ligger omlott. Regler på datorn —
   "bordet som sanning" (avsnitt 7) — tar bort nästan allt fladder: från 50
   falska `borta` till ~5, och de tre kvarglömda korten.
2. **Missade kort löses inte av bordet.** De kräver kameran: kort under
   kort (Ancestral Blade, Mirran Bardiche), svarta kort som döms "not a
   card" (Vraska), och Claudes väntan.
3. **"Leken som facit" ger inget i läsningen** — den används redan. Det som
   skulle göra osäkra läsningar säkra är *platsen* (landhögen): 21 av 62
   osäkra läsningar, 0 fel i fönstret (avsnitt 8).
4. Fyra **BESLUT** för Jesper: nådens längd (R1), land som hög med antal
   (R2), spökets livstid (R5), och om läsningen ska få veta platsen (avsnitt 8).
   Plus fem frågor om facit (avsnitt 10).

## 1. Underlaget och hur det räknades

### Vad som jämförs

| | Vad | Var |
|---|---|---|
| **Facit** (sanningen) | vad som fysiskt hände på bordet, sekund för sekund | `dev/golden/inspelningar/2026-09-21-parti/` — `handelser.tsv` (agent B) och `platser.tsv` (agent C) |
| **Mesa** (det som prövas) | vad telefonen beslutade: spår föds, får namn, tappas, flyttas, dör | latensrapporten `dev/latens/latens-2026-09-21-mes-238-4k15-20min-varme.json`, 820 rader, 20 min |
| **Bevis** | en ruta per sekund: kamerabilden med Mesas lådor, och hela skärmen med datorns bord | `dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/rutor/` (`kam-NNN.jpg`, `NNN.jpg`) |

Avgränsning: sekund 240–540 av inspelningen (fem minuter mitt i partiet).

### Klockan: sekund i inspelningen ↔ rapportens tider

Menyradens klocka i `NNN.jpg` byter minut vid exakt samma sekund varje gång:

| Minut blir | Första rutan |
|---|---|
| 23:12 | 286 |
| 23:13 | 346 |
| 23:14 | 406 |
| 23:15 | 466 |
| 23:16 | 526 |

Alltså: **ruta 286 = 23:12:00,0–23:12:00,99**. Rapportens tider
(`stampel`, datorns `Date.now()`) räknas om med
`sekund = 285,5 + (tid − 23:12:00) / 1000`. Felet är ±0,5 s, och kontrollen
stämmer: rapporten startade enligt formeln vid sekund 5,8 och stoppade vid
1 206,7 (inspelningen är ~20 min).

### Det som gör räkningen svår — och hur jag hanterat det

| Problem | Följd | Hur det hanterades |
|---|---|---|
| **Rapporten har inga positioner.** En rad säger `spar 63 namn Serpent Assassin`, men inte *var* spåret låg | ett spår kan inte kopplas till en plats automatiskt | spåret kopplas till platsen via **namnet + tiden** (icke-land är ett exemplar var i leken), och via rutorna där det behövs. Namnlösa spår räknas för sig |
| **Spår kan dö utan en `borta`-rad.** Bara en av sju vägar ut ur spårlistan stämplar `borta` (`matcha`, rad 20503). Klungan, helbilden, omlott-städningen och `slappFlyttat` tar bort spår tyst (rader 20305, 20473, 20495, 20515, 21761, 22092) | ett spårs slut syns inte i rapporten; 18 spår i fönstret har ingen sista rad alls | slutet tas från rutorna där det spelar roll. **Detta är ett eget fynd** — se avsnitt 9 |
| **Spårnummer återanvänds.** Spår 63, 69, 93 och 96 dör och "föds" igen med samma nummer | ett nummer ≠ ett spår | varje ny `hittat` räknas som ett nytt spårliv (107 spårliv i fönstret) |
| **Landhögarna.** Facit har tre Plains (P5–P7) och en Swamp (P8), men rutorna visar fler: kam-420 har minst fyra Plains och två Swamp i klungorna | facit räknar inte varje land i en hög | land räknas **per hög** (Plains-högen, Swamp-högen), inte per kort. Fel i högarna redovisas separat och med lägre säkerhet |

### Facit: B:s händelser rättade med C:s identiteter

C:s rättelser går före B:s platsnummer. Efter sammanslagningen finns det
**tio fysiska kort som inte är land** i fönstret, plus två landhögar:

| Kort (fysiskt) | Facit-platser | På bordet (sekund) | Säkerhet |
|---|---|---|---|
| Serpent Assassin | P1 → P14 | 240–293 · graveyard · 338–540 | trolig |
| Danitha Capashen, Paragon | P2 → P15 | 240–292 · graveyard · ~330–540 | säker/trolig |
| Valkyrie's Sword | P3 → P11 → P12 → P13 (P22?) | 247–414, flyttad tre gånger (278, 297, 302–305) | säker/trolig |
| Trusty Retriever | P4 → P16 (P22?) | 240–~410, flyttad 284 och 302–305 | trolig/säker |
| Ancestral Blade | P9 | 254–540 (dold i högen, ensam 405–425) | trolig |
| Flutterfox | P10 | 264–~360 | säker |
| Mirran Bardiche | P19 | 375–~440 (under Danitha) | trolig |
| Night's Whisper | P23 | 430–~448 | trolig |
| Vraska's Finisher | P24 | 465–540, tappad 470–490, flyttad 530 | säker |
| okänt kort (Coat with Venom?) | P25 | 536–540 | osäker |
| Plains-högen | P5, P6, P7, P17, P20 | hela fönstret | säker (att det är Plains) |
| Swamp-högen | P8 | hela fönstret | säker (att det är Swamp) |

B:s "nya kort" P11–P16 och P22 är alltså flyttar eller återkomster, inte
nya kort. Två saker saknas helt i facit och räknas därför inte: **tappningar**
(B har noll, men alla tre korten i övre raden ligger vridna sek ~470–500,
`kam-480`) och **ett kort vid ~80,28 sek ~507–514** som handen tar upp igen
(`kam-510`, `kam-514`).

### Hur hårt är facit? (gäller alla siffror nedan)

Varje siffra i avsnitt 2–6 anges som **punktvärde (intervall)**. Intervallet
är vad siffran blir om de osäkra facitraderna faller åt andra hållet. De
som flyttar mest:

| Osäkerhet i facit | Påverkar |
|---|---|
| **P4 vid sekund 240–284**: C säger Trusty Retriever (titeln läst sek 288, men då på *en annan plats*, 83,30). Kortet på 78,24 sek 243 har rödorange konst som lika gärna kan vara Flutterfox, som Mesa kallat det sedan sek 213 | fel namn ±1, missade ±1 |
| **P22 / P13**: vilket av två kort i högen uppe till höger | fel namn ±1 |
| **P25**: okänt kort, fyra sekunder före slutet | missade ±1, fel namn ±1 |
| **Landhögarna**: hur många kort ligger där | spår per plats och dubbletter för land kan inte räknas mot facit — bara mot rutorna |
| **När korten gick till graveyard** (C läser graveyardtoppen, ±2–5 s) | falska `borta` ±2 |

## 2. Spår per fysisk plats

**Vad det mäter:** hur många gånger Mesa "tappade tråden" om ett kort. Ideal
är ett spår per kort och vistelse på bordet. Varje extra spår betyder att
kortet dog och föddes igen — på datorn syns det som ett spöke ("Where did it
go?"), ett frågetecken eller ett kort som hoppar.

| Kort | Vistelser i fönstret | Spår (spårliv) | Ideal | Spårnummer |
|---|---|---|---|---|
| Serpent Assassin | 2 (240–293, 338–540) | **4** (4–6) | 2 | 29 · 63 · 63 igen · 107 (+99, 87 med namnet som gissning) |
| Danitha Capashen | 2 (240–292, ~330–540) | **5** (5–6) | 2 | 14 · 62 · 62 igen · 91 · 110 (+33) |
| Valkyrie's Sword | 1, flyttad 3 gånger (247–414) | **2** (2–4) | 1 | 53 · 61; namnlösa spår 247–287 |
| Trusty Retriever | 1, flyttad 2 gånger (240–~410) | **3** (2–4) | 1 | 35 (som Killing Glare) · 40 · 47 |
| Ancestral Blade | 1 (254–540) | **2** | 1 | 54 · 65 |
| Flutterfox | 1 (264–~360) | **2** (1–2) | 1 | 28 · 66 (helbild, blev kvar efter att kortet gått) |
| Mirran Bardiche | 1 (375–~440) | **0–1** | 1 | inget namngivet spår |
| Night's Whisper | 1 (430–~448) | **2** | 1 | 84 · 84 igen |
| Vraska's Finisher | 1, tappad och flyttad (465–540) | **2–4** | 1 | grått spår ("not a card") 503–527, 118 |
| **Summa icke-land** | **12 vistelser** | **~22 (20–28)** | **12** | |
| Plains-högen | ~5–6 kort (kam-420) | **31** | ~6 | |
| Swamp-högen | ~2–3 kort (kam-420) | **23** | ~3 | |
| Namnlösa spår | — | **27**, 18 av dem levde under 5 s | 0 | händer, blänk, delar av kort |

**Slutsats:** ett vanligt kort får ungefär **två spår per vistelse**. Ett
land i högen får **fem till åtta spår på fem minuter**. Det är landhögarna
som står för nästan hela spårbytandet (54 av ~76 namngivna spårliv).

De tre vanligaste orsakerna (samma som för falska `borta` — se avsnitt 3,
eftersom varje extra spår föds ur en falsk `borta`):

1. **Handen i eller bredvid landhögen** (sek 395: fyra spår dör på 0,5 s, `kam-395.jpg`).
2. **Kortet tappas eller flyttas** och spåret följer inte med (sek 464,9 Serpent, `kam-466.jpg`/`kam-475.jpg`).
3. **Ett nytt kort läggs under eller bredvid** (sek 370–372, Mirran Bardiche under Danitha: Danitha, Serpent och Valkyrie dör samtidigt).

## 3. Falska `borta` — rapporten säger borta, facit säger kvar

**Vad det mäter:** gånger telefonen sa "kortet är lyft" fast det låg kvar.

| | Antal | Intervall | Varav ersatt av ett nytt spår med samma namn inom 5 s |
|---|---|---|---|
| Icke-land | **9** | 8–14 | 4 |
| Land (Plains + Swamp) | **41** | 35–41 | 28 |
| **Summa** | **50** | 43–55 | 32 |
| *Jämförelse: riktiga `borta` (kortet lyftes)* | *4* | *4–5* | — |

Alltså: **av 54 `borta` med namn i fönstret var 4 sanna.** Resten var
kort som låg kvar. De 21 `borta` för namnlösa spår är inte räknade — de
flesta är händer och blänk, och där är `borta` rätt.

Intervallet: 3 icke-land-`borta` gällde ett spår som var en dubblett (ett
annat spår höll redan kortet, sek 259,8, 260,6, 519,0) — räknas de blir det
12. Två gäller spår vars kort inte går att avgöra (60 "Hooded Blightfang",
87). Land: facit har inget land som lämnar bordet, men landhögarna är inte
räknade kort för kort, så upp till sex av dem kan vara en verklig flytt
mellan högar (B:s P17, P20).

### De icke-land-kort som dog fast de låg kvar

| Sekund | Spår | Kort | Vad som hände (ruta) | Tillbaka efter |
|---|---|---|---|---|
| 280,9 | 28 | Flutterfox | högen P4 + P10 flyttades (`kam-275`–`kam-290`) | nytt spår 287, namn 309 |
| 333,4 | 62 | Danitha | lades tillbaka ur graveyard, handen kvar över kortet | 2,5 s |
| 354,7 | 54 | Ancestral Blade (gissning) | hand över mitten (`kam-352`) | 2,1 s (helbilden) |
| 358,3 | 53 | Valkyrie's Sword | hand över mitten (`kam-352`); kortet låg kvar till 410–414 | aldrig |
| 370,0 | 62 | Danitha | Mirran Bardiche läggs under Danitha | **67 s** (helbilden 436,7) |
| 372,1 | 61 | Valkyrie's Sword (gissning) | samma hand | aldrig |
| 372,2 | 63 | Serpent Assassin | handen drar ur library (369–373) | 3,1 s |
| 432,3 | 84 | Night's Whisper ("Ukud Cobra"?) | kortet lagt, handen kvar | 5,5 s |
| 464,9 | 63 | Serpent Assassin | kortet tappas (anfall — alla tre korten i övre raden vrids, `kam-475`) | spåret 107, namn 507 |

**Obs — en falsk `borta` i rapporten är inte alltid något spelaren ser.**
Datorn väntar 600 ms (`BORTA_NAD`) och binder om till ett nytt spår med
samma namn, och ett kort som ligger i en hög på datorn lyfts inte alls
(`tackt`, rad 23950). Därför visar `380.jpg` fortfarande Danitha tio
sekunder efter att hennes spår dött. Det spelaren *ser* är nedtonade kort,
"Lost sight of it…" och "Where did it go?". Hur ofta just de syns går inte att
läsa ur rapporten — bara ur skärmrutorna.

### De tre vanligaste orsakerna

| # | Orsak | Antal (av 50) | Bevis | Var i koden |
|---|---|---|---|---|
| 1 | **Kort omlott i landhögen.** Handen lägger eller rättar ett land; lådan för korten under hamnar över matta eller en granne, mattan "ser tom ut", och spåret dör efter 450 ms | ~41 | sek 395,4: spår 69, 74, 76 dör samtidigt, 72 och 78 strax efter, `kam-395.jpg` (handen i Plains-högen); sek 507,9: fyra Swamp/Plains dör på en gång | `matcha`, rad 20497–20503: `tomMs > T.bortaMs` (`bortaMs: 450`, rad 18597) |
| 2 | **Handen över kortet i mer än ~0,5 s** medan något annat görs (dra ur library, lägga kort under, flytta en grannhög) | ~6 | sek 370–372: Danitha, Valkyrie, Serpent dör inom 2 s, `kam-365`/`kam-380` | samma rad; skymningen räknas bara när masken är **täckt** (`fyll >= T.skymdMin`) — en hand som bara delvis täcker lådan räknas som tom matta |
| 3 | **Kortet tappas eller flyttas**: lådan står kvar rak medan kortet ligger vridet eller bredvid | ~3 | sek 464,9 (Serpent tappad), sek 280,9 (högen flyttad) | `matcha` rad 20296–20310 (vilket spår en region får) och 20503; flytten binds bara om när det nya spåret redan är säkert (`slappFlyttat`, rad 21758) |

## 4. Missade kort — facit säger lades, rapporten har inget namn inom 5 s

**Vad det mäter:** kort som lades (eller kom tillbaka ur graveyard) och inte
fick något namn inom 5 sekunder. Flyttar räknas inte här.

| Sekund | Kort | Första namn | Missat? |
|---|---|---|---|
| 247 | Valkyrie's Sword | 309,5 (klunga) | **ja, 62 s** |
| 254 | Ancestral Blade (under Flutterfox) | 356,8 (helbild) | **ja, 103 s** |
| 264 | Flutterfox | spår 28 hette redan Flutterfox | nej (osäkert — se P4) |
| ~330 | Danitha (tillbaka) | 340,8 (Claude) | **ja, ~11 s** |
| 338 | Serpent Assassin (tillbaka) | 337,1 (lokal) | nej |
| 375 | Mirran Bardiche (under Danitha) | aldrig | **ja** |
| 430 | Night's Whisper | 439,4 (lokal) | **ja, 9 s** |
| 465 | Vraska's Finisher | 593,5 (efter fönstret) | **ja, >75 s** |
| 536 | okänt kort (P25) | — | kan inte avgöras |

**Missade: 6 av 8** som går att avgöra (intervall **4–7**). Danitha och
Night's Whisper ligger nära gränsen: räknar man från när C såg kortet ligga
(Night's Whisper ~436) blir de träffar. Flutterfox blir en miss om P4 inte
var Flutterfox.

Samma sak efter en **flytt**: Vraska flyttades sek 530 och fick sitt namn
sek 593 (63 s). Trusty Retriever och Valkyrie flyttades 302–305 och fick
namn 309,5 (4–7 s).

### De tre vanligaste orsakerna

| # | Orsak | Kort | Bevis | Var i koden |
|---|---|---|---|---|
| 1 | **Kortet ligger under eller omlott med ett annat kort** — bara en kant syns, och den räcker aldrig för en läsning | Ancestral Blade, Mirran Bardiche | `kam-266` (Ancestral Blade under Flutterfox), `kam-380` (Mirran under Danitha) | `matcha` rad 20507–20516: en omlott-del utan namn som ligger till 70 % under ett säkert kort tas bort efter `OMLOTT_NAMNLOS_MS` |
| 2 | **Kortet döms som "not a card" (grått)** — ett svart kort i blank ficka ser ut som matta | Vraska's Finisher | grå låda på Vraska `kam-506`, `kam-510`, `kam-527`; namnet kom först 593 s via Claude | `kamIdentifiera` rad 22560: `serUtSomKort(...)` → `{ skrap: true }` |
| 3 | **Kortet läggs där ett spöke eller ett gammalt spår står** — platsen är redan "upptagen" | Valkyrie's Sword | `kam-250`: kortet ligger synligt på 50,28; `250.jpg`: datorn visar fortfarande spöket Pharika's Chosen ("Where did it go?") på platsen, och inget Valkyrie. Spöket står kvar till minst sek 380 (`380.jpg`) | `matcha` (spöken, rad 20519–20521) och `fodSpar` rad 20194; läsningar av spår som aldrig får namn syns inte i rapporten (se avsnitt 9) |

Det som gör en miss långsam, när kortet väl läses: **Claude**. Danitha
(10,8 s) gick via Claude, och Claudes median i passet är 3,0 s från fråga
till namn, p90 19,9 s.

## 5. Fel namn — rapportens namn ≠ facit (där facit är säker eller trolig)

**Vad det mäter:** ett *säkert* namn (det som visas som kort på datorn) som
är fel. Gissningar i granskningen ("Which card is this?") räknas för sig.

| Sekund | Spår | Mesa sa | Facit | Väg | Räknas |
|---|---|---|---|---|---|
| 235,4 | 35 | **Killing Glare** | Trusty Retriever (P4, trolig) | helbild | **ja** — Killing Glare låg i graveyard (C: graveyardtoppen sek 340). Syns på datorn till ~305 (`250.jpg`, `290.jpg`) |
| 213 (–264) | 28 | Flutterfox | Trusty Retriever (P4, trolig) | Claude | bara om C har rätt om P4 (se avsnitt 1) |
| 513,9 | 114 | Coat with Venom | — | Claude | nej: kortet på ~80,28 sek ~507–514 **finns inte i facit** (`kam-510`, `kam-514`) |

**Fel namn: 1** (intervall **1–3**). Noll-fel-regeln håller alltså nästan i
den lokala läsningen: det enda säkra fel namnet i fönstret kom från
**helbilden** (Claude på hela bilden), inte från telefonens egen läsning.

Fel **gissningar** i granskningen (osäkra, visas som frågetecken med förslag):
5 st — "Hooded Blightfang" (sek 318–333), "Ukud Cobra" på Night's Whisper
(430–432), "Plains" på Valkyrie (298–308), "Trusty Retriever" på Valkyrie
(255–260), "Serpent Assassin" på ett kort bredvid Serpent (428–449).

### Orsakerna

| # | Orsak | Bevis | Var i koden |
|---|---|---|---|
| 1 | **Helbilden ger ett säkert namn som ingen kontrollerar mot bordet**, och spåret kan sedan inte dö av `bortaMs` — det står tills nästa helbild | Killing Glare sek 235,4 → kvar på datorn till ~305; Flutterfox (spår 66, sek 356,8) visas bakom Valkyrie **efter** att kortet gått till graveyard (`380.jpg`) | `tillampaHelbild` rad 22027–22092; `matcha` rad 20503 (`!arHelbild(t)`) |
| 2 | **Blänk:** vita kort i blank ficka ger ORB 4–8 inliers — för lite för en säker lokal dom, så namnet hämtas från Claude, som gissar rimligt men fel på ett urblekt kort | spår 28 (P4, `kam-243`) | `identifyMedModell` rad 16234 ff. (trapporna 25 / 14 / `ORB_ACCEPT`) |
| 3 | **Facit har luckor** — ett kort som inte finns i facit kan inte räknas | kortet vid ~80,28 sek ~507–514 | — (en fråga till Jesper, se avsnitt 10) |

## 6. Dubbletter — två levande spår på samma plats

| Sekund | Plats | Spåren | Vad datorn visade |
|---|---|---|---|
| 240–264 | P4 (ett kort) | 28 Flutterfox + 35 Killing Glare | två kort där ett låg (`250.jpg`) |
| 224–260 | P2 Danitha | 14 Danitha + 33 (gissning Danitha) | ett kort och en granskningspost |
| 287–354 | högen uppe till höger (två kort) | 47 Trusty + 53 Valkyrie + 54 (gissning Ancestral Blade) | tre delar för två kort |
| 325–358 | Valkyrie's Sword | 53 + 61 (gissning Valkyrie) | ett kort och en granskningspost |
| 503–519 | P14 Serpent | 107 Serpent + 99 (gissning Serpent) | ett kort och en granskningspost |
| **Kvarglömda** (kortet borta, spåret kvar) | | | |
| 240–~305 | P4 | 35 Killing Glare (helbild) | kort som aldrig låg där |
| 357–~437 | mitthögen | 66 Flutterfox (helbild) | Flutterfox bakom Valkyrie, fast den ligger i graveyard (`380.jpg`) |
| 240–≥380 | 50,28 | spöket Pharika's Chosen | "Where did it go?" i över 140 s |

**Dubbletter: 5** (intervall **3–7**: två av dem bygger på att ett spår med
en *gissning* ligger på samma kort). Plus **3 kvarglömda**, som är värre för
spelaren: ett kort som syns men inte finns.

Landhögarna går inte att räkna mot facit kort för kort. Men antalet
namngivna Plains på bordet svänger mellan **0 och 6** (0 sek 380, 6 sek
520–530) medan högen hela tiden har ~5–6 kort. Swamp svänger mellan 0 och 2.

### Orsakerna

| # | Orsak | Bevis | Var i koden |
|---|---|---|---|
| 1 | **Helbildens spår läggs ovanpå detektorns** och kan inte dö av tom matta | spår 35 + 28 (sek 240–264); 66 (357–437) | `tillampaHelbild` rad 22079–22092 (nya spår), `matcha` rad 20503 |
| 2 | **Nytt spår föds innan det gamla dött** — efter tap, flytt eller hand | 99 + 107 (503–519), 53 + 61 (325–358) | `fodSpar` rad 20194; `sammaKortSom` / `dubblettAv` rad 21784–21793 slår bara ihop när **båda** är säkra med samma namn |
| 3 | **Klungan delas i fler delar än kort** | 47 + 53 + 54 på en hög med två kort (287–354) | `svarAI`, flera kort, rad 21855–21915 |

## 7. Förslag: bordet som sanning

### Idén i en mening

I dag **är** telefonens spår bordet: dör ett spår försvinner kortet från
datorn, föds ett spår dyker det upp. Förslaget vänder på det: **kameran
skickar händelser** ("något lyftes här", "ett kort med det här namnet syns
där"), och **bordet på datorn bestämmer** vad som ligger var — med
väntetider och skydd, precis som en människa som tittar på bordet inte tror
att ett kort försvunnit för att en hand svepte förbi.

### Vad som ska tas bort (från avsnitt 2–6)

| Kategori | Antal i fönstret | Intervall |
|---|---|---|
| Extra spår per plats (över idealet) | ~10 icke-land + ~45 land | 8–16 + 40–45 |
| Falska `borta` | 50 | 43–55 |
| Missade kort | 6 | 4–7 |
| Fel namn (säkra) | 1 | 1–3 |
| Dubbletter + kvarglömda | 5 + 3 | 3–7 + 3 |

### Reglerna

Varje regel: vad den gör, hur många fel den tar bort **räknat mot facit i
fönstret**, och vad den riskerar.

#### R1 — Borta först när det är bevisat (väntetid + återbindning)

**Det finns redan, i liten skala.** Datorn låter ett kort vars spår dött
ligga kvar i `BORTA_NAD` = **600 ms** (rad 23057; den var 3 s före MES-214)
och binder om det till ett nytt spår med samma säkra namn på samma plats
(`avstamBord`, rad 23831 ff.). Efter nåden tonas kortet ned med "Where did
it go?". I fönstret kom samma namn tillbaka inom 1 s bara **8** gånger av 50
— resten blev nedtonade kort eller frågor.

**Vad:** nåden blir *N* sekunder i stället för 0,6, och kortet står
halvgenomskinligt under tiden. Föds ett spår med samma namn — eller
ett namnlöst spår på samma plats — inom *N* s, binds kortet om till det nya
spåret och ingenting har hänt för spelaren. Först efter *N* s utan ett nytt
spår är kortet borta.

| Tar bort | Med N = 3 s | Med N = 5 s |
|---|---|---|
| Falska `borta`, samma namn tillbaka | 26 (23 land) | **33** (29 land + 4 icke-land) |
| *(som jämförelse: N = 1 s tar bara bort 8)* | | |
| Falska `borta`, namnlöst spår på platsen | +1–2 | +2–3 |
| Extra spår per plats *som spelaren ser* | samma som ovan | ~32 av ~55 |
| Missade / fel namn / dubbletter | 0 | 0 |

**Risk:** ett kort som verkligen lyfts ligger kvar (genomskinligt) i upp
till *N* s. I fönstret gäller det **4** riktiga `borta`. Målet "borta syns
inom 0,3 s" (MES-237) klaras redan inte (median 706 ms i passet) — med R1
blir det uttryckligen *N* s för det slutgiltiga beskedet.
Återbindning till ett **namnlöst** spår kan ge fel namn: Valkyrie's Sword
lades sek 247 precis där spöket Pharika's Chosen stod, och P25 lades sek 536
där Vraska just lyfts. Återbindningen får därför bara ske när läsningen inte
säger emot (0 fel namn går före).

**BESLUT:** hur lång ska nåden vara — 0,6 s (i dag), 3 s (som före
MES-214), 5 s, eller "tills handen lämnat bilden"? Det är en direkt
avvägning mellan målet för `borta` och antalet falska `borta` spelaren ser.

#### R2 — Landhögen är en sak, med ett antal

**Vad:** bordet håller ett **antal per landhög** (Plains-högen: 6). Antalet
ändras först när kameran sett ett annat antal i *N* s i följd **utan hand i
bild**. Enskilda landspår i högen föds och dör utan att bordet ritas om.

| Tar bort | Antal |
|---|---|
| Falska `borta`, land | **41** (35–41) |
| Extra landspår som spelaren ser | ~45 |
| Antalet Plains som svänger 0–6 | hela svängningen |
| Missade / fel namn | 0 |

**Risk:** ett nyspelat land syns *N* s senare (ett per tur — sannolikt
godtagbart). Räknar kameran fel på en hög där korten ligger tätt omlott (ser
4 av 6) visar bordet ett stadigt fel i stället för ett fladdrande — därför
behövs ett startantal från uppstarten eller leken. Ett land som flyttas
*ut* ur högen till en egen plats måste fortfarande gå som ett vanligt kort.

**BESLUT:** får land visas som en hög med en siffra i stället för kort för
kort? Det är en ändring av spelvyn, inte bara av kameran.

#### R3 — Helbildens namn är ett förslag, inte ett kort

**Vad:** helbilden (Claude på hela bilden) får bara göra ett kort säkert om
(a) kortet inte redan ligger någon annanstans enligt bordet (graveyard, ett
annat säkert spår), och (b) detektorn ser ett kort på platsen. Ett
helbildsspår dör som alla andra spår, eller senast efter *N* s utan region.

| Tar bort | Antal |
|---|---|
| Fel namn (Killing Glare, sek 235) | **1** |
| Kvarglömda (Killing Glare 240–305, Flutterfox 357–437) | **2** |
| Dubbletter (P4: 28 + 35) | **1** |

**Risk:** helbilden gav 9 av 52 namn i fönstret och 29 % av alla namn i
passet. Den är det enda som hittade Ancestral Blade (dold, sek 356,8) och
Danitha efter 67 s (sek 436,7). Med villkor (b) blir de namnen kvar; med
villkor (a) kan ett riktigt kort nekas om bordets graveyard är fel — och
graveyarden på datorn visar 1–2 kort hela fönstret medan ~7 kort gick dit
(`300.jpg`–`540.jpg`). **R3 (a) kräver alltså en graveyard som stämmer.**

#### R4 — Flytt i stället för borta + nytt

**Vad:** dör ett namngivet spår och ett namnlöst spår föds inom 3 s där
handen släppte något, flyttar bordet kortet dit, med en liten markering
tills läsningen bekräftat (eller sagt emot).

| Tar bort | Antal |
|---|---|
| Falska `borta` vid flytt (Flutterfox 280,9) | 1 (1–2) |
| Namnet efter flytt: Vraska 530 (63 s), Trusty + Valkyrie 302–305 (4–7 s) | 2–3 väntetider |
| Dubbletter vid tap/flytt (99 + 107) | 0–1 |

**Risk:** fönstrets tydligaste motexempel ligger i samma sekund: sek 530
flyttas Vraska till 83,28 och sek 536 läggs ett **annat** kort på Vraskas
gamla plats. Ett kort i handen kan också vara ett annat än det som lyftes.
Utan läsningens ja blir R4 en källa till fel namn — den får bara flytta
*preliminärt*.

#### R5 — Spöken har ett bäst-före och blockerar aldrig ett nytt kort

**Vad:** "Where did it go?"-spöket försvinner efter *N* s (t.ex. 20 s), och
ett nytt kort på spökets plats läses som ett nytt kort, inte som spöket.

| Tar bort | Antal |
|---|---|
| Kvarglömda spöken (Pharika's Chosen, 140+ s) | 1 |
| Missade (Valkyrie sek 247, om orsaken är spöket) | 0–1 |

**Risk:** ett kort som ligger under en hand länge försvinner från datorn —
spöket finns för att fråga spelaren. **BESLUT:** hur länge ska ett spöke
stå?

#### R6 — Ett nytt spår på ett säkert korts plats föds som del av kortet

**Vad:** bordet godtar inte ett andra kort på en plats där ett säkert kort
redan ligger förrän läsningen visar ett **annat** namn. En gissning med
samma namn som grannen blir aldrig en egen granskningspost.

| Tar bort | Antal |
|---|---|
| Dubbletter med en gissning (14 + 33, 53 + 61, 99 + 107, 54 i högen) | **4** (2–4) |

**Risk:** kort som verkligen läggs omlott — Ancestral Blade under
Flutterfox, Mirran Bardiche under Danitha — göms ännu mer. De missas redan
i dag (avsnitt 4), så R6 gör inte just dem sämre, men den stänger dörren
för att hitta dem genom att "något nytt syns här". De behöver en egen väg
(helbilden, eller spelaren).

### Sammanställning: vad reglerna tar bort tillsammans

Räknat utan dubbelräkning (R1 och R2 överlappar på land — R2 räknas först):

| Kategori | Före | Efter R1–R6 | Kvar är främst |
|---|---|---|---|
| Falska `borta` (synliga för spelaren) | 50 | **~5** (4–12) | icke-land där kortet aldrig fick ett nytt spår (Valkyrie 358/372, Danitha 370 — tills helbilden kom) |
| Extra spår per plats (synliga) | ~55 | **~8** | samma |
| Missade | 6 | **5–6** | kort under andra kort, svarta kort som dömts "not a card", Claudes väntan |
| Fel namn | 1 | **0** | — |
| Dubbletter + kvarglömda | 5 + 3 | **~1 + 0** | — |

**Slutsats:** "bordet som sanning" löser **fladdret** — nästan alla falska
`borta`, dubbletter och kvarglömda — men **inte missade kort**. Missarna
kräver kameran: att se kort under kort, att inte döma svarta kort som
matta, och att få namnet utan Claude.

## 8. Leken som facit i läsningen

**Frågan:** hur många av de osäkra läsningarna hade blivit säkra om bara
lekens 28 kort fick vara kandidater?

**Svaret: 0 (0–2).** Läsningen använder **redan** bara leken. Poolen som
bildmodellen och ORB jämför mot byggs ur spelarens lek (`Pool`, "bildsignaturer
för spelarens lek (byggLekPool)", `index.html` rad 15560–15566), och varje
namn i hela rapporten — 820 rader, också Claudes svar — är ett av de 28.
Att smalna av till leken ändrar alltså ingenting; de osäkra läsningarna är
osäkra *mellan lekens egna kort*.

### Varför läsningarna var osäkra

Fönstret har 86 läsningar av spår som fick namn: 24 säkra, **62 osäkra**.

| Osäkra läsningar (62) | Antal | Vad som saknades |
|---|---|---|
| Ettan = kortets slutliga namn, **land** | **28** | 21 av dem hade modellens marginal > 0,11 (modellen var säker) men ORB < 10 inliers och spåret låg inte ensamt — landregeln kräver ett ensamt, mätt spår (`LAND_MARGINAL`, rad 16211) |
| Ettan = slutliga namnet, icke-land | 2 | marginal 0,06–0,16, inliers 5–9 |
| Ingen dom alls (ingen etta) | 20 | beskärningen gav inget namn — oftast en hand eller en del |
| Ettan ≠ slutliga namnet | 12 | riktig osäkerhet: Trusty Retriever på ett Plains, Swamp på ett Plains, m.m. |

Det som faktiskt skulle göra osäkra läsningar säkra är **platsen**, inte
leken: **21 läsningar** (alla land) hade blivit säkra med regeln "modellens
etta är samma land som högen spåret ligger i, och marginalen > 0,11". I
fönstret ger det **0 fel**. I hela passet finns två läsningar där modellen
sa Swamp om ett kort som till slut blev Plains (spår 30 sek 198,7, spår 188
sek 840,4) — regeln måste alltså kräva att **högen** är av samma typ, inte
bara att ettan är ett land.

Den starkare formen av "leken som facit" — **leken minus det som redan
ligger någon annanstans** (graveyard, ett annat säkert kort) — går inte att
räkna på den här rapporten: `las[].dom` sparar bara ettan och marginalen
till tvåan, inte *vilken* tvåan var. Antalsspärren (K6) gör redan detta för
kort som ligger säkert på bordet.

**BESLUT:** ska läsningen få veta *var* på bordet kortet ligger (landhögen)?
Det är samma sorts regel som R2, fast i telefonen.

## 9. Vad rapporten inte kan visa (och borde)

Den här räkningen tog längre tid och blev osäkrare än den behövt, av fyra
skäl i rapporten själv. Alla fyra är bara `?debug`-mätning — ingen ändring
av vad spelaren ser.

| Lucka | Följd här | Vad som skulle behövas |
|---|---|---|
| **Inga positioner** i raderna | spår kopplades till platser via namn och tid; namnlösa spår gick inte att placera alls | `cx, cy` (och gärna `lang`) i varje rad |
| **Sex av sju vägar ut ur spårlistan stämplar inte `borta`** (rad 20305, 20473, 20495, 20515, 21761, 22092 — bara 20503 gör det) | 18 spår i fönstret har inget slut; Killing Glare och Flutterfox syns som kvarglömda bara i skärmrutorna | en `borta`-rad med orsak (`klunga`, `helbild`, `omlott`, `flyttat`, `skrap`) på varje väg — samma princip som `namnVag`/`okand` |
| **Läsningar loggas bara för spår som till slut får namn** (`las[]` sitter på `namn`-raden) | varför Valkyrie (247–309) och Vraska (465–593) inte lästes syns inte | läsningarna som egna rader, eller på `borta`-raden |
| **Tvåan saknas i domen** | "leken minus det som ligger någon annanstans" kan inte räknas | `dom.tvaa` (namnet) bredvid `marginal` |

Därtill: **spårnummer återanvänds** (63, 69, 93, 96) — ett nummer är inte
ett spår. Och bordets egen **graveyard** stod på 1–2 kort hela fönstret
medan ~7 kort gick dit enligt facit; det hör inte till (1)–(5) men är en
förutsättning för R3.

## 10. Frågor till Jesper om facit

Siffrorna ovan flyttar sig lite beroende på svaren. Rutorna ligger i
`dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/rutor/`.

| Fråga | Rutor | Påverkar |
|---|---|---|
| Kortet på 78,24 sek 240–264: Trusty Retriever (C) eller Flutterfox (Mesa)? | `kam-243`, `kam-266`, `kam-288` | fel namn 1 ↔ 2, missade ±1 |
| Kortet vid ~80,28 sek ~507–514, som handen tar upp — vad var det? Samma som P25? | `kam-506`–`kam-516`, `kam-532`–`kam-540` | fel namn (Coat with Venom) 0 ↔ 1 |
| Hur många Plains och Swamp ligger i landhögarna? | `kam-420` | spår per plats för land |
| Tappningen sek ~470–500 (alla tre korten i övre raden) — ska facit ha den? | `kam-466`–`kam-500` | inget här, men nästa räkning av tap |
| Danitha tillbaka ur graveyard: sek 330 eller närmare 336? | `kam-326`–`kam-341` | missade 6 ↔ 5 |

## 11. Det som kan bli issues (inga är skapade)

Enligt tröskeln i CLAUDE.md: bara det som kräver ett beslut av Jesper,
spänner över flera sessioner, eller är ett löfte om produkten.

| Titel | En rad |
|---|---|
| Bordet väntar innan ett kort försvinner (R1) | borta blir halvgenomskinligt i N s och binds om till ett nytt spår med samma namn — tar bort ~33 av 50 falska `borta`; **BESLUT** om N |
| Landhögen som en hög med antal (R2) | bordet håller antal per landhög och ändrar det först efter N s utan hand — tar bort alla 41 falska land-`borta`; **BESLUT** om spelvyn |
| Helbildens namn kräver detektorn och ett bord som stämmer (R3) | helbildsspår kan dö och får inte göra ett kort säkert som ligger någon annanstans — tar bort Killing Glare-felet och två kvarglömda kort |
| Graveyarden på datorn följer inte partiet | 1–2 kort hela fönstret medan ~7 gick dit; en förutsättning för R3 |
| Svarta kort i blank ficka döms "not a card" | Vraska's Finisher grå i 20+ s (`kam-506`–`kam-527`), namn först efter 128 s |
| Kort under kort får aldrig namn | Ancestral Blade (103 s) och Mirran Bardiche (aldrig) — omlott-delen städas bort efter `OMLOTT_NAMNLOS_MS` |
| Landläsning med platsens prior | modellens land-etta godtas i en hög av samma typ — 21 osäkra läsningar blir säkra i fönstret, 0 fel |
| Latensrapporten: position, `borta` på alla vägar, läsningar för namnlösa spår, tvåan | fyra luckor som gjorde den här räkningen osäker (avsnitt 9) — mätning bakom `?debug` |
| Golden-fall ur partiet 2026-09-21 | facit (B + C, rättat) finns nu för sek 240–540 — kan bli ett mätbart fall för R1–R6 när frågorna i avsnitt 10 är besvarade |

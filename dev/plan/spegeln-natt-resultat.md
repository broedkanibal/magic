# Nattpasset 2026-09-22 — resultat (v2)

Planen för v2: `dev/plan/spegeln-facit-v2.md`. Kördes 2026-09-22 från 09:26 av
en session på Fable 5.1 (xhigh); agenterna på Opus. Ingen kod är ändrad, inga
issues är skapade, inget är pushat. Grenen `natt-2026-09-22` har två commits
från det här passet: en säkerhetscommit när tvåtimmarsbudgeten gick ut (facit,
kontroller, jämförelse) och en när förklaringen var klar.

## v1 underkänt

- B (Sonnet) skrev *händelser* ur 301 rutor och fick 0 tappningar, fast korten
  tappades i 12 av 31 rutor; positioner och flyttar stämde inte heller.
- C hittade felen men rättade inte filen, D räknade vidare på skissen, och
  orkestreraren läste B:s text utan att titta på bilderna.
- Rapporten användes som källa till *hur mycket* fel Mesa gjorde, men den kan
  inte se det största felet: att det digitala bordet inte liknar mattan.

## v2: vad som kördes och hur lång tid det tog

| Steg | Vem | Start–slut | Tid | Planen sa | Vakten |
|---|---|---|---|---|---|
| 1 tabellen | 6 × general-purpose · Opus, 5–6 rutor var | 09:26–10:12 | 46 min | ~15 min | 2 STILLA (första rutan tog >15 min; vakterna startades om), 1 TID (350–390, ett bud skickades, klar 4 min senare) |
| 2 kontroll 1 | 1 × general-purpose · Opus, 8 rutor blint | 10:13–10:43 | 30 min | ~10 min | KLAR |
| 2 omkörning | de tre berörda tabellagenterna, återupptagna med kontrollens fynd | 10:45–10:53 | 8 min | — | KLAR |
| 2 kontroll 2 | ny general-purpose · Opus, samma 8 rutor blint | 10:54–11:33 | 39 min | — | KLAR |
| 3 jämförelsen | `v2/jamfor.cjs` + orkestreraren | 11:34 | 1 min | ~10 min | — |
| 4 förklaringen | 1 × general-purpose · Opus | 11:36–11:58 | 23 min | ~30 min | KLAR |

Hela passet: 09:26–12:00, 2 h 34 min av 2 h. Tvåtimmarsbudgeten gick ut
11:26, mitt i kontroll 2. Steg 1–3 committades som "det som finns" när steg
3 var klart (11:36, commit `1ed6ffe`), och steg 4 kördes ändå till slut
eftersom sessionen levde och det var sista steget. Skillnaden mot planen
är att agenterna läser bilder tre gånger långsammare än planen räknade med:
en Opus-agent behövde 10–18 minuter för sin första ruta och 4–8 minuter per
ruta därefter.

### Orkestrerarens egen kontroll (före kontrollagenten)

Frö 20260922 → åtta rutor: 270, 280, 290, 330, 390, 420, 430, 450. Jag
tittade blint på 270, 390 och 430 (tre olika agenters delar) innan tabellerna
fanns, och jämförde sedan: mattan stämde rad för rad i alla tre; på
digitalt-raden räknade tabellerna fler kort och fler tappade än jag, och
zoomar på bordet gav tabellerna rätt (270: två liggande Plains och en
liggande Swamp; 430: två liggande Swamp bakom en upprätt). Noll felrader,
ingen del kördes om på den grunden.

## Kontrollens utfall

| Kontroll | Räknat som | Stämmer | Avviker | Vem hade fel |
|---|---|---|---|---|
| 1 (10:13–10:43) | kontrollagentens strängare räkning: varje siffra på digitalt-raden som eget mått | 3 av 8 | 5 (270, 280, 420, 430, 450) | kontrollen själv i 4 av 5; facit i 450 (`dig.kort`) |
| 1, omräknad | planens regel: högst en *rad* skiljer | 6 av 8 | 2 (430, 450) | samma |
| 2 (10:54–11:33) | planens regel, utskriven i prompten | **7 av 8** | 1 (280) | kontrollen själv, båda raderna |

Planens bokstav ("avviker mer än 2 av 8 → underkänt") slog till på kontroll 1
med den strängare räkningen, så de berörda delarna kördes om en gång: de tre
tabellagenterna återupptogs med kontrollens fynd och fick rätta där de höll
med. 240–290 lade till `?` för dolda kort i namnlistorna och stod fast på
290 (`tappade=2`, bevis: vågrät samlartext = kortet upprätt igen); 400–440
ändrade inget (ett kort i ficka, inte två: 117 px brett, ett kort vridet 13°
ger 129 px); 450–490 räknade om digitalt-raderna (450: 12 → 15). Sedan
kontroll 2, av en ny agent, blint: **7 av 8 stämmer** — facit godkänt.

**Kvar som osäkerhet:** `kort` på digitalt-raden är ±1 där kort ligger helt
dolda bakom andra (kontroll 2 säger 330 borde vara 15 och 450 14). Facit
ändrades inte för det; den som räknar på `dig_kort` ska veta det. På mattan
stämde facit i alla åtta kontrollerade rutor, båda gångerna, inklusive alla
tappningar.

## Var filerna ligger

Allt i `dev/golden/inspelningar/2026-09-21-parti/v2/` (i git), utom
förklaringen.

| Vad | Fil |
|---|---|
| facit, en del per agent | `tabell-240-290.tsv` … `tabell-500-540.tsv` (6 filer) |
| facit, hopslaget och sorterat | `tabell.tsv` (403 rader: 31 rutor, en rad per fysiskt kort + graveyard-, digitalt- och hand-rad per ruta) |
| kontroll 1: egen tabell + jämförelse | `kontroll-egen.tsv`, `kontroll.md` |
| kontroll 2: egen tabell + jämförelse | `kontroll-egen-2.tsv`, `kontroll-2.md` |
| jämförelsen: skript, tabell, sammanfattning | `jamfor.cjs`, `jamforelse.tsv`, `jamforelse.md` |
| klarmarkörer | `KLAR-1-*` (6), `KLAR-1b-*` (3, omkörningen), `KLAR-2`, `KLAR-2b`, `KLAR-4` |
| förklaringen (steg 4) | `dev/plan/spegeln-utkast-v2.md` |
| rutorna (ej i git) | `dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/rutor/` |
| v1, bara som jämförelse | `dev/golden/inspelningar/2026-09-21-parti/` (handelser.tsv, platser.tsv) och `dev/plan/spegeln-utkast.md` |

## Vad som saknas eller är svagt

- `x`/`y` är ögonmått i heltalsprocent; kontroll 2 ser skillnader på några
  procentenheter, mest i de undre högarna där kortets nederkant går utanför
  bilden. Jämförelsen använder dem inte.
- `hog`-bokstäverna är inte strikt "A från vänster" i 310–340 (agenten höll
  dem stabila mellan rutor i stället); jämförelsen räknar bara antal olika
  bokstäver.
- `graveyard N synliga` går sällan att räkna (stapel i sleeves): 16 av 31
  rutor har `graveyard ?`. Siffran under den digitala högen finns för alla.
- 6 av 31 rutor har minst ett kort med `lage` = osäker (hand eller arm över).
- Agenten för 350–390 skrev först rubrikens "N cards on the table" som `kort`
  på digitalt-raden och rättade själv till en räkning av ritade kort innan den
  blev klar; det är den konvention alla sex delar följer.

## De tre viktigaste siffrorna ur `jamforelse.md`

| Siffra | Vad den säger |
|---|---|
| **Tappningar går åt fel håll åt båda hållen.** 12 av 31 rutor har tappade kort på mattan (39 kort totalt); det digitala bordet visar 76 tappade totalt. `diff_tappade` median +2, värsta +7 (ruta 500: 8 digitala mot 1 fysiskt) och −6 (ruta 490: 1 mot 7) | Mesa ritar kort liggande i rutor där inget kort är tappat (240–280: 3 mot 0; 360–430: 2–4 mot 0), och missar de riktiga tappningarna när de kommer (460–490: 1–3 mot 4–7). "11 av 12 rutor speglas" i tabellen betyder bara att bordet hade *något* liggande kort, inte rätt kort |
| **Bordet har fyra kort för mycket.** `diff_kort` median +4, värsta +8 (ruta 480: 18 digitala mot 10 fysiska); bara 5 av 31 rutor har `diff_kort` ≤ 0 | Extra Plains/Swamp i landhögarna, `?`-kort ovanpå kort, och kort som ligger kvar på bordet efter att de lämnat mattan |
| **Granskningsraden och bannern är nästan alltid på.** `granskning` > 0 i 18 av 31 rutor, `cantsee` > 0 i 26 av 31 | Spelaren ser "N cards to fill in" och "The camera can't see N cards" större delen av fem minuters spel |

Library mot mattan: `library` sjunker 29 → 21 (åtta kort lämnade leken)
medan `fys_kort + graveyard` går 9 → 13 (fyra fler syns). Summan
`library + fys_kort + graveyard` sjunker 38 → 34, så ungefär fyra kort är i
handen eller utanför bild i slutet — rimligt, det är inte ett fel.

## Steg 4: förklaringen

`dev/plan/spegeln-utkast-v2.md` (561 rader, nio avsnitt) svarar på de fyra
frågorna med rutnummer och kodrader som bevis, tar ställning till R1–R6 och
slutar med tio issue-kandidater (avsnitt 8, inga skapade) och fem **BESLUT**
(avsnitt 9). Kortversionen:

| Fråga | Svar |
|---|---|
| Tappningar speglas? | Nej. I de två rutor som granskats kort för kort (290, 480) är noll av mattans tappade kort speglade; de liggande korten på bordet är andra kort. Rapporten: 54 av 108 tap-domar under passet vände spårets egen förra dom; ett Swamp-spår fick tolv domar i rad på 105 s utan att röras. Vägen beslut → ritat är snabb (101 ms) — domen är fel, inte långsam |
| Varför för många kort? | Nästan hela överskottet är kort kameran tappat bort och som ingen svarat på (nedtonade under bannern). Dras de bort går `diff_kort` från +4 till −1 i median, och 15 rutor av 31 hamnar inom ±1 i stället för 5 |
| Varför tar granskningen aldrig slut? | Den är tom i 13 av 31 rutor men aldrig länge. 6 av 7 lästa poster gissar namnet på ett kort som redan ligger på bordet: ett andra spår på samma kort. Spärren i `avstamBord` tittar på spårets eget namn i stället för kandidatlistan |
| Ligger korten rätt? | Grovt ja, fint nej: bordet blandar lägen räknade med olika skalor, och ett kort låg utanför vänsterkanten i tio rutor i rad (350–440) |

Om nattpassets regler: R1, R3 och R6 håller och blir starkare; **R2 byggde
på fel facit** (räknade spår, inte kort — land är den del av bordet som
stämmer bäst, 0,84 korts medelavvikelse); R4 går inte att avgöra med
tiosekundersrutor; R5 siktar på fel spöke. Tappningar, lägesskalan och tokens
saknas helt i R1–R6.

Två sidofynd i koden, inte prövade: platshållaren "Asking Claude… [object
Object]?" (ett objekt skickas där en sträng ska stå) och ett helbildsspår som
inte kan dö (grön ruta över tom matta i `kam-240.jpg`).

Nästa steg är Jespers: de fem besluten i avsnitt 9, och vilka av de tio
kandidaterna som ska bli issues.

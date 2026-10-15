# Golden-platån 97/119: varför de 22 namnen missas (2026-10-15)

Golden har stått på 97/119 rätt namn och 0 fel sedan 2026-10-10. Den här filen spårar varje missat namn i
baslinjen `dev/golden/senaste.json` till den väg i kamerakedjan där det tappas.

**Underlag:** `kor.cjs --fall 05,13,17,18 --detalj --rutlogg` på 9ed6fda (port 8293, pool 171, varm profil). Resultatet var
LIKA BRA och kort för kort som baslinjen. Slutrutorna i 13 och 18 och bilden i 17 är granskade för hand. Alla 22 missar
ligger i fall 05, 13, 17 och 18. Fall 14 och 15 har varsitt dolt kort, som inte räknas.

## Tabellen

| Fall | Kort (facit z) | Väg där namnet tappas | Skäl (mätt) |
|---|---|---|---|
| 13 | Fencing Ace | oläsbar i facit | utbränd i hylsan |
| 13 | Ancestral Blade | oläsbar i facit | titeln utbränd under token Soldier |
| 13 | Mirran Bardiche | oläsbar i facit | ingen bokstav i 1080p, under token Rebel |
| 18 | Ancestral Blade | oläsbar i facit | under token Soldier (Jespers beslut 2026-10-07) |
| 18 | Mirran Bardiche | oläsbar i facit + inget spår | utbränd i lampans reflex |
| 17 | Island (z14, 33 % synligt) | detektorn: inget spår | hög A, smal remsa på vitt bord i mörker |
| 17 | Island (z17, 17 %) | detektorn: inget spår | hög B, bara titelremsan syns |
| 17 | Forest (z18, 14 %) | detektorn: inget spår | hög B, bara titelremsan syns |
| 13 | Swamp (z3, under) | **namnet fanns, tappades** | Swamp nr 1 säker 8,1 s (spår 2). Swamp nr 2 läggs ovanpå 54,5 s: `modell land` säker (marginal 0,369, ORB 8 inliers på Swamp, accept) men **spärrad av `remsaLandVittne`** (spåret omlott, remsan 0,036 < 0,08) → aldrig säkert. Spår 2 följer det övre kortet, och det undre får ett nytt spår (#9) som läser "Rebel" 0,083 |
| 13 | Thriving Moor (z7) | **namnet fanns, tappades** | säker 16,5 s (remsa+titel 0,115). I slutet osäker: remsan 0,127–0,151 efter tap och otap. Dubblett TM +1 40–129 s |
| 18 | Swamp (z2, under) | **namnet fanns, tappades** | säker 6,3 s (spår 2). Spåret dör vid otap 39,6 s. Det nya spåret (id 60) har `modell land` säker (marginal 0,358/0,34, ORB 7/6, accept), **spärrad av `remsaLandVittne`** (remsan 0,006/0,043). Slutet: #12, remsan Swamp 0,066 |
| 18 | Swamp (z6, överst, helt synligt) | **namnet fanns, tappades** | säker 47,55 s (modell land+vittne, remsan 0,081, precis över 0,08). Spåret dör vid tap 96,3 s. Slutet: #5 **`modell land utan vittne`**, remsan "Rebel" 0,035 |
| 18 | Plains (z4, under, tappad) | **namnet fanns, tappades** | säker 23,7 s (spår 4). Spåret dör efter tap 56,3 s. Det nya spåret (#9) har ingen remsa, och modellen säger Swamp osäkert |
| 05 | Scourge of the Undercity (z5, 29 %) | remsan rätt, under tröskeln | hela remsan 0,041, titeln 0,061, textläsaren på remsan Scourge 0,59/0,21. `remsa+namn` kräver hela remsan ≥ 0,08 |
| 13 | Plains (z6, överst, tappad) | remsan rätt, under tröskeln | aldrig säker. Remsan Plains 0,162–0,193, titeln 0,101 (krav 0,28 / 0,20) |
| 17 | Additive Evolution | remsan rätt, under tröskeln | hela remsan 0,276 (krav 0,28), titeln 0,102. Textläsaren hoppad (liten) |
| 17 | Forest (z15, 27 %) | remsan rätt, under tröskeln | detektorns remslåda lös (192×110 px). Hela remsan 0,001, titeln Forest 0,252, men vakten kräver hela remsan ≥ 0,08 |
| 18 | Thriving Moor | remsan rätt, under tröskeln | aldrig säker. Remsan 0,026–0,075, titeln 0,035, namnraden ~24 px på 0,5× |
| 13 | Pharika's Chosen | modellen svag, inget vittne | modellen etta 0,39, marginal 0,087, ORB 8 utan accept. Ingen remsläsning |
| 18 | Pharika's Chosen | modellen svag, inget vittne | modellen etta, osäker. Ingen remsläsning |
| 18 | Ukud Cobra | alla vittnen fel | modellen, remsan (0,078) och titeln (0,105) säger alla Pharika's Chosen |
| 17 | Island (z13, 57 %) | modellen svag, ingen remsa | detektorn ger ingen remslåda (titeln står lodrätt vid kanten). Modellen Swamp 0,31 / Island 0,30 |

## Grupperna

| Grupp | Kort | Går det att rätta utan Claude? |
|---|---|---|
| Namnet fanns och tappades (landhögar och tap i video) | **5** (13 Swamp, 13 TM, 18 Swamp ×2, 18 Plains) | **Delvis.** Tre av de fem tappas på samma rad: `remsaLandVittne` spärrar en `modell land` som har ORB:s accept på samma land. Regeln kom 2026-10-07 (MES-340, cc16800) för v2:s två säkra fel, och de felen hade varken remsa eller ORB (historik 2026-10-06, "Golden C mot v2") |
| Remsan läser rätt men under sin tröskel | 5 | **Nej**, inte genom att sänka trösklarna. Bänken (`remsregel.py`) har säkra fel på 0,225 hel och 0,248 titel med hel 0,055, och värdena här ligger i samma band. 18 Ukud Cobra visar att tre överens vittnen kan peka fel på 0,5× |
| Oläsbara i facit | 5 | nej (räknas inte i "läsbara") |
| Modellen svag, eller alla vittnen fel | 4 | nej, inte lokalt |
| Detektorn ger inget spår | 3 | nej, kräver träning av detektorn (17, vitt bord i mörker) |

Ungefär 10 av de 22 är länder i högar (13: 2, 17: 5, 18: 3), som i första titten. Men de fördelar sig på fyra olika
vägar. Den största gruppen som går att rätta lokalt är "namnet fanns och tappades".

## Rättelsen

**ORB som vittne för `modell land` på ett täckt kort.** Ändringen är på en rad i `medRemsa`, se commit-meddelandet.
Bilden och ORB är två oberoende vittnen, och för ett kort som inte är ett land räcker `modell+orb` redan på ett täckt
spår. Resultatet står i `dev/golden/historik.md`.

# Historik — lekfotots golden set, en rad per sparad baslinje

Totalerna ur summeringen i `node dev/lekgolden/kor.cjs`, för de tio seten:
*rätt / facit*, *saknas*, *extra*, *fel namn* (inom parentes: utan To check),
*oläsliga* (platshållare), *osäkra* (namn under To check) och *exakt rätt*
(set där leken blev precis facit). `hela` är filväljarens väg, `ram` kamerans
ram. Commit är den commit som `senaste.json` checkades in i.

| datum | commit | modell, prompt | beskärning | rätt | saknas | extra | fel namn | oläsliga | osäkra | exakt | vad |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-26 | 4b090e2 | claude-opus-5, v20 (lekblocket ace61f53) | hela | 336/372 | 36 | 4 | 4 (0) | 92 | 100 | 4/10 | första baslinjen (MES-289): 15 foton, 10 set, facit 345c83d1 |
| 2026-09-26 | 4b090e2 | claude-opus-5, v20 (lekblocket ace61f53) | ram | 128/372 | 244 | 0 | 0 | 82 | 22 | 0/10 | samma svar genom kamerans ram på 390×844 — fotona är tagna för hela bilden, inte för ramen |

## Spridning, 2026-09-26

Tre foton lästa en gång till (`--las-om 07,09,13 --spridning`), samma bild,
samma prompt:

| Foto | Beskärning | Svar 1 | Svar 2 | Poster som skilde |
|---|---|---|---|---|
| 07 (närbild, kant på båda sidor) | hela | 12/12 rätt, 1 extra (kant), 9 oläsliga | 12/12, 0 extra, 9 oläsliga | 1 av 22 |
| 09 (hela bordet, på tvären) | hela | 19/40, 2 fel namn, 24 oläsliga | 24/40, 2 fel namn, 21 oläsliga | 9 av 48 |
| 13 (hela bordet, på tvären, blänk) | hela | 28/40, 2 fel namn, 23 oläsliga | 26/40, **7 fel namn**, 17 oläsliga, 3 extra | 32 av 53 |
| 09 | ram | 7/40 | 4/40, 1 fel namn | 9 av 24 |
| 13 | ram | 5/40 | 4/40, 1 fel namn | 2 av 16 |

Närbilder i gott ljus ger samma svar; helbordet på tvären varierar kraftigt
mellan två läsningar av samma bild. Alla fel namn stod under To check.

## Samma kort i två foton, 2026-09-28 (MES-324)

`node dev/lekgolden/tvafoton.cjs`, ur samma cache (svaren från 2026-09-26),
med telefonens regel som den ligger i appen: LB1 = hela fotot igen (minst
tre säkra icke-basland, två tredjedelar av dem i ett tidigare foto), LB2 =
ett kort vid det nya fotots vänster- eller högerkant (30 tusendelar) med ett
säkert namn som ett tidigare foto också hade.

| Beskärning | LB1 i seten (falsklarm) | LB1 på samma foto två gånger | LB2-flaggor | fångade kantkort (av kantkort lästa med namn) | onödiga frågor |
|---|---|---|---|---|---|
| hela | 0 | 14/14 fällda | 1 | 1 av 1 (S08: Swamp i foto 07) | 0 |
| ram | 0 | 3/3 fällda | 1 | 0 av 0 | 1 (S03: ett helt Swamp som modellen la på x = 1000 i foto 15) |

Vad modellen läser vid kanten är oftast ingenting: de kapade korten blev
namnlösa poster (platshållare) i alla foton utom ett. Med "endera kanten"
(också det gamla fotots kort vid kanten) blev det 7 onödiga frågor mot 1;
med över- och underkanten inräknade träffas hela kort som modellen lägger
på y = 1000 (34 av 338 namngivna kort). Lekgolden självt oförändrat efter
bygget: LIKA BRA i alla fyra, 0 fel namn rakt in i leken.

### Efter granskningen samma dag: LB1 kräver platsen, mätt på riktiga andrafoton

Granskningen visade att namnen ensamma inte räcker för LB1: "0 falsklarm"
var mätt på lek.txt, där alla icke-basland är singletons, och på en lek med
fyra av varje kort delar två foton om tolv ofta två tredjedelar av namnen
fast korten är nya exemplar. LB1 räknar nu bara par på samma plats efter
fotonas bästa förskjutning (medianen, tolerans 100 tusendelar), och
andelen mot det foto som läste färst kort. Den snälla kontrollen (samma
svar två gånger) kompletterades med riktiga andrafoton ur cachen:

| Beskärning | LB1 i seten | samma svar två gånger | riktiga andrafoton av samma bord | par som inte är samma bord |
|---|---|---|---|---|
| hela | 0 falsklarm | 14/14 | 4/7 träffar (16↔17, 18↔19; missarna är borden vridna 90° och 180°: 14↔15, 09↔13) | 0/3 falsklarm |
| ram | 0 falsklarm | 3/3 | 2/3 (16↔17; 14→15 vridet) | 0 räknade |

Syntetiskt (dev/lekfoto.cjs): fyra av varje kort med samma platser per
plats i listan (granskarens fall) och 40 slumpade nya uppläggningar ger
ingen LB1; samma bord förskjutet 60 tusendelar med ett kort läst
annorlunda ger LB1 med 11 kort. LB2 oförändrad: 1 fångat kantkort, 1
onödig fråga, och **omätt på riktiga foton** (kantkorten får inga namn).

Osäkra-kolumnen räknar sedan dess bara paret frågan gäller på en rad med
"One Swamp or two?", inte radens alla exemplar (kor.cjs doma): 101 och 23
(baslinjen 100 och 22, det ifrågasatta exemplaret räknas), inte 108 och 27.

## Kort som kapas vid kanten, 2026-09-28 (MES-324, Jespers val C)

En platshållare utan läst namn vid fotots vänster- eller högerkant (x inom
30 tusendelar) får koll.kant på telefonen, och datorn frågar "This card was
cut off at the edge." (LR3) i stället för "Which card is this?", när leken
har kort ur ett annat foto. Mätt ur cachen med `node dev/lekgolden/kantkort.cjs`
(inga anrop); platshållarna dömda mot facit, kolumnen och för ögat:

| Gräns (sidkanten) | hela: kapade som får frågan | hela: HELA kort som får den i onödan | ram: kapade | ram: hela |
|---|---|---|---|---|
| 30 (vald) | 25 av 31 | 0 | 4 av 23 | 0 |
| 60 | 28 av 31 | 0 | 5 av 23 | 1 (kolumnregeln, ej granskad) |
| 80 | 31 av 31 | 1 (Ukud Cobra, foto 11, x = 930) | 5 av 23 | 4 |

I seten med mer än ett foto: 30 LR3-frågor i hela (S06 5, S07 12, S08 13)
och 2 i ram, alla på kapade kort, 0 på hela. Övre och nedre kanten räknas
inte: 13 hela oläsliga kort ligger på y = 0 eller 1000 i helbordsfotona.
Claudes `kapade` är 0 i alla 30 svar och hjälper inte.

`node dev/lekgolden/kor.cjs --bara-cache` före och efter: identisk utskrift,
LIKA BRA i alla fyra (hela · 10 set 336/372, 4 fel namn, 0 utan koll, 4/10
exakt; ram · 10 set 128/372, 0 fel namn). Frågan ändrar inga tal i leken
förrän spelaren svarar.

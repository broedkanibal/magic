# Lärarmätningen: hur ofta missar läraren synliga kort? (MES-288)

**Vad det är.** Läraren (OWLv2) har satt lådor på 638 rutor ur dina tre
träningsfilmer. Hur ofta den missar ett kort som syns har bara bedömts med
ögat. Här ritar du korten i **tolv** av lärarens rutor, och ett skript räknar
ut hur många synliga kort läraren missade.

**Det är träningsmaterial, inte prov.** Ritningen sparas i
`dev/detektor/larare/matning/`, aldrig i golden, och mäter läraren — inte
detektorn som tränas.

## 1. Öppna gruppen i ritverktyget

1. Starta ritverktyget som vanligt: `node dev/golden/rita-server.cjs` (eller
   posten **mesa-rita**) och öppna <http://localhost:8287/>.
   Kör servern redan sedan före ihopslagningen: **starta om den**, annars
   finns inte gruppen.
2. Välj i listan uppe till vänster, under rubriken
   **Lärarmätning — träningsfilm, inte prov (MES-288)**:
   `lärarmätning · tra-dagsljus-lampa`, `· svartmatta-dagsljus`,
   `· vittbord-dagsljus`.
3. Varje film har **fyra rutor** (lägen). Bilden är lärarens egen ruta, så
   ritningen och lärarens lådor gäller exakt samma bild.

## 2. Vad du ritar

| Gör | Hur |
|---|---|
| **Alla kort** du ser, också de som ligger under andra | två klick längs namnraden, som vanligt. **Understa först** — det senast ritade hamnar överst (⌘-klick väljer, ↑ ↓ flyttar i ordningen) |
| Kort som ligger helt under andra och inte syns alls | behöver **inte** ritas — de räknas inte |
| Ett kort vars överkant inte syns | rita det så gott det går och dra hörnen på plats (**V**, dra ett hörn) |
| **Baksidan upp** (leken, ett kort i ficka, Magic-baksidan utan ficka) | rita kortet och tryck **B** |
| **Namn** | **hoppa över.** Namnrutan öppnas inte i lärarmätningen, och skriptet läser inga namn |
| Kort i handen | rita bara det som ligger på bordet eller syns tydligt i handen; en hand är inget kort |
| Samma storlek på alla kort | tryck **L** när du ritat två–tre kort: då ger klicken bara riktningen |
| Rutan är klar | **D** — nästa ruta öppnas **tom** (rutorna är olika bilder, så ingenting följer med). **[ ]** byter ruta |
| Klar med en film | **Skicka till GitHub** (⇧⌘S), välj nästa film i listan |

Graveyard (**G**), fäst (**F**) och tappat spelar ingen roll här.

**Tid:** rutorna har 10–20 kort. Räkna med **2–3 minuter per ruta**, alltså
**30–40 minuter** för alla tolv.

### Rutorna

| Film | Tid i filmen | Varför den valdes |
|---|---|---|
| trä, dagsljus + lampa | 284 s | kort i vinkel och landhögar, ingen hand |
| | 332 s | hand i bild (ett finger på ett kort), kort omlott |
| | 398 s | ensamma baksidor i gröna fickor, landhögar |
| | 526 s | fullt bord (21 lärarlådor) och leken |
| svart matta | 258 s | spridda kort och landhögar |
| | 298 s | kort i vinkel och högar |
| | 490 s | Magic-baksida utan ficka, spridda kort |
| | 614 s | fullt bord, kort i vinkel |
| vitt bord | 128 s | spridda kort, leksaker och böcker runt bordet |
| | 212 s | landhögar och kort omlott |
| | 344 s | ensamma baksidor i rosa fickor, högar |
| | 454 s | hand i bild över korten |

Alla är rutor där läraren redan har facit, och där korten står still: rörelsen
mellan ±0,2 s är låg i lärarens lådor (mätt ur filmen, se commit-meddelandet).

## 3. Mät efteråt

```sh
python3 dev/detektor/larare/matt_larare.py
```

Skriptet stoppar med en lista om någon ruta inte är ritad och klar (**D**).
Vill du se siffrorna för det som finns hittills:
`python3 dev/detektor/larare/matt_larare.py --bara-ritade`. Det går att köra
om hur många gånger som helst.

**Huvudsiffran:** andelen **helt synliga** kort (≥ 90 % syns) som läraren
missar — kortet har varken en egen låda eller ligger i en ignorerad yta
(regel A–F) — och antalet **falska** lådor (lådor som inte ligger på något
ritat kort).

| Dom per kort | Betyder |
|---|---|
| eget | en låda passar kortets synliga del (IoU ≥ 0,5) |
| okänt | ingen egen låda, men kortet ligger i en ignorerad yta (A–F): eleven lär sig inte att det är bakgrund |
| sammanslaget | kortet ligger i en låda som täcker flera kort |
| missat | ingenting: eleven lär sig att kortet är bakgrund |

Uppdelat på kort som syns helt, delvis (30–90 %) och nästan inte (< 30 %),
baksidor för sig, och per film och ruta.

Självtestet (konstgjorda ritningar med känt svar, och lärarens egna lådor
ritade som kort): `python3 dev/detektor/larare/matt_larare.py --sjalvtest`.

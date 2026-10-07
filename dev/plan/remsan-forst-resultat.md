# Remsan först — redogörelse (prompt D, 2026-10-07)

Prompten: `prompt-2026-10-07-D-remsan-forst.md`. Issue MES-340. Gren `remsan-forst` (worktree
`.claude/worktrees/remsan-forst`), bas `b464d8d` (origin/main 10:30) + MES-344 inslagen (`b66794a`).
Loggar, json och bänkutskrifter: sessionens scratchpad `…/d9b1ba4f…/scratchpad/{golden,bank}/`
(kopieras till `dev/material/arbete/markning/golden-2026-10-07/D/` när serien är klar).

Jespers beslut som gällde: modellvägen är **v2 bara på remsorna**; spärren mot kort i handen byggs i samma svep.
Jespers regel: ingenting skrivs mot ett visst kort — varje regel ska hjälpa ett annat kort i en annan lek i samma
situation, och trösklar mäts ur bruset.

## Steg 1 — läsningen

### 1.1 Remsmodellen v2 i appen

| Vad | Hur |
|---|---|
| Filen | `dev/embed/modeller/mobileclip-s0-mesa-v2.onnx` (43 MB, gitignorerad) ligger i projektets Supabase-lagring: bucketen `modeller` (publik, CORS `*`), `…/storage/v1/object/public/modeller/mobileclip-s0-mesa-v2.onnx`. sha256 `e0eb2612…733a` lika med den lokala filen. Varför inte Hugging Face: inget konto eller token på datorn; lagringen är projektets egen och appen pratar redan med den |
| embed.js | `FORVAL.remsModell` pekar dit (webgpu och wasm). Går filen inte att hämta läses remsorna med kortets modell som förut, och `remsFel` säger det |
| `V` | höjs **inte**: remsleken lagras under `remsTagg` (`'|' + filnamnet`), så v2:s vektorer blandas aldrig med den gamla modellens, och kortlekens förräknade vektorer (MES-230, 489 uppe) gäller hela kortets modell, som inte bytts |
| Golden | `--rems-modell` fungerar som förut för prov; utan flaggan hämtas v2 från lagringen (profilens Cache Storage tar den sedan) |

### 1.1b Trösklarna mätta om för v2

`dev/remsa/remsregel.py` på remsbänkens exakta remsor (`resultat/remsexp-v2.npz`, Jespers lek, 786 remsor):

| Trösklar hel/titel/vittne | golden | 13b | MES-246 | Säkra fel |
|---|---|---|---|---|
| 0,20 / 0,20 / 0,05 (appens) | 59 av 68 | 37 av 96 | 232 av 479 | **2** — hela remsan 0,225 Fencing Ace → Plains (mes246-515.07); titeldelen 0,248 med hela remsan 0,055 Hooded Blightfang → Plains (mes246-574.49) |
| 0,25 / 0,20 / 0,08 | 57 | 19 | 188 | 0 (0,025 över största felet) |
| **0,28 / 0,20 / 0,08** | 57 | 13 | 174 | **0** |
| 0,30 / 0,20 / 0,08 | 56 | 12 | 171 | 0 |

Valet: 0,28 = största felet på hela remsan (0,225) plus samma marginal som 0,15 → 0,20 fick 2026-10-03; vittnet 0,08
ligger över 0,055 (det näst största titelfelet med hela remsan ≥ 0,08 är 0,145, så titeln 0,20 står). Priset syns i
13b (37 → 13 säkra av 96): v2:s marginaler på 13b:s remsor ligger 0,20–0,28. I golden kostade 0,28 två kort som låg
strax under (13 Plains hög B 0,33 synlig: 0,208; 17 Additive Evolution: 0,276) och vittnet 0,08 ett (18 Swamp A 0,37:
remsan 0,074 som vittne åt `modell land`). Ingen av dem rörs: ett saknat namn är en rest, ett säkert fel är ett fel.

### 1.2 Remsan ur kortets geometri

Bänken `dev/remsa/appremsa.py` (ny): golden 03–06 och 13–18 i bild.jpg (det golden ser) + 18:s ruta ur 1920-videon,
92 remsor med egen detektorremsa. KortVinkel körs med appens egen kod (`dev/remsa/kortvinkel_cli.cjs` klipper IIFE:n ur
index.html). Tre sätt att skära, lästa med appens modell och v2 mot remsleken (Scryfall 14 %, 0/180), säker = marginal > 0,28:

| | KortVinkel mot facit | Remslådans mitt mot facitremsans mitt (kortlängder) | Lådans kanter |
|---|---|---|---|
| Mätt | median 0,9°, p90 2,0°, max 6,9°, 0 över 10° | median +0,007, p10 −0,011, p90 +0,028 (nästan utan bias, men spridd) | rakt kort: +0,04 utanför titelkanten, +0,025 innanför remsans innerkant; i vinkel: hörnen 0,15 förbi åt båda håll |

| Remsan skuren som | v2 säkra rätt | v2 säkra fel | v2 rätt överst | app säkra rätt |
|---|---|---|---|---|
| exakt (facits hörn) | 65 | 0 | 81/92 | 17 |
| **dagens detektorlåda** | 50 | 0 | 81/92 | 19 |
| **geometrin** (remslådans mitt + KortVinkel + bordets kortstorlek) | **60** | 0 | **86/92** | 9 |
| geometrin ur kortlådans kant i stället för remslådans mitt | 58 | 0 | 79/92 | 9 |

Konstruktionen: en vriden rektangel, 14 % av kortlängden tjock och en kortbredd lång, mitt i detektorns remslåda, med
kortets upp-riktning ur KortVinkel (`t.vmRa`) och kortets storlek (kortets egen ur lådan när lådan är hela kortet,
annars bordets `kortEgenMatt`); det som ligger ovanpå och grannens remsa målas över genom samma vridning. I 18:s
1920-ruta: Plains B 0,39 T låda 0,05 → geo 0,34, Fencing Ace 0,07 → 0,31. Kortlådans kant provades och var inte bättre.
Återstoden mot exakt (65 → 60) är placeringens spridning (±0,02 kortlängder = ±14 % av remsans tjocklek).

**Återfallet** (ur steg 1-körningen S1): för ett täckt kort där det som ligger ovanpå målas över mer än
`T.remsaGeoTackt` (0,25) av geometrins remsa skärs detektorns låda som förut — den ramar in den SYNLIGA titeln. Golden 04
Plains under Plains förskjutet 19 px (~40 % målat) blev Island 0,06 på geometrin men rätt på lådan; 05 Scourge med
Pacifism över ~70 % av bredden blev Danitha på geometrin, rätt på lådan; 14:s täckta Plains (0 % målat) vann på geometrin.

### 1.3 Spärren

- `medRemsa → remsaDomSkal` (`T.remsaStilla`): remsan gör namnet säkert bara på ett spår som är stilla (formstilla
  SPEK_RUTOR rutor eller vilat stillaMs), inte skymt och med region i den här eller förra rutan. Svaret sparas på spåret
  med skälet i `varfor` (`remsa väntar: skymt`), och spåret läses om när det vilat. Golden 11 vid 38,85 s (kortet i
  handen) är fallet; regeln gäller varje kort som hålls över bordet. `vm.hallen` (långsidan ur hysteresen) är inte en
  hand och spärrar inte.
- `modell land` på ett täckt kort (maskad, omlott eller kort ovanpå) kräver ett vittne (`T.remsaLandVittne`): remsan
  med samma namn ≥ remsaVittne (den läses för det) eller titelraden; utan vittne osäkert (`modell land utan vittne`).
  Så gick v2:s båda säkra fel på hela kortet. Appens modell hade 0 fel på vägen men samma väg.

## Steg 2 — parningen

Mätt i `dev/detektor/tran/parprov.py` (66 ritade lägen i MES-246 + 8 golden-fall) och `dev/remsa/hogfall.py --para`:

| Parningen | MES-246 eget | sammanslaget | missat | dubbletter | högar hela | skapade | golden |
|---|---|---|---|---|---|---|---|
| dagens (`skapa 'inga'`) | 728/738 | 10 | 0 | 37 | 97/107 | 0 | 75/75, 0 dubbl |
| `alla` rakt av (MES-329:s mätning) | 736 | 2 | 0 | **76** | 105 | 47 | lika |
| `alla` + vakt (a) ihop-remsa, vakt (b) låda utan remsa | 730 | 8 | 0 | 45 | 99 | 10 | lika |
| **`alla` + vakterna skärpta** (a kräver 70 % inne i den parade remsans låda; b högst 0,2 från kanten) | **730** | 8 | **0** | **48** | **99** | 13 | lika |
| …+ högdelningen (`hog`) | 733 | 4 | **1** | 48 | 103 | 36 | lika |

- **Vakt (a)**: en remsa som ligger ihop med en redan parad remsa (mittpunkterna < 0,6 tjocklekar isär, appens
  remsaIsar) och till ≥ 70 % inne i den parade remsans låda är samma titel en gång till — NMS 0,6 släpper igenom par
  under IoU 0,6. 70 %-kravet kom av golden 17 hög A: Islands lösa remsa täcker högens titlar och Forests remsa under
  ligger 0,56 tjocklekar bort men till hälften utanför Islands låda — det är en annan titel som sticker fram. Med den
  tighta vakten (utan 70 %) kastades Forest igen; med 70 % får Forest sin låda ur remsan.
- **Vakt (b)**: en remsa vid kanten av en låda utan remsa (passning ≤ 0,2; parprov: 0,145–0,16 av kortsidan, lådor som
  tar med sig fickan eller kortet under) paras dit.
- **Högdelningen** (en låda större än 1,5 kort med remsor → ett kort per remsa) är byggd (`T.detHog`, `para o.hog`) men
  **avstängd**: den gav 103 högar men ett missat kort (66,90 s Thriving Moor, vars låda togs bort). Hittade får aldrig
  gå ner. Remsor i en hög blir kort ändå via `detRemsa` (steg 3 i para, grannens riktning).
- **Skräpdomen**: en låda som bär detektorns egen namnremsa döms inte som skräp i kamIdentifiera för att den inte är
  kortformad (17 hög B: en låda över tre tappade land, remsan kastades med den). Remsan läses sedan i medRemsa.
- Kvar i parprov: 11 dubbletter mer än dagens (48 mot 37), de flesta en remsa som sticker ut 40–60 % ovanför sin låda
  (mes246-422.02, 574.49) eller ligger i ingen låda (327.48–445.18, samma kort över tid) — samma geometri som 17:s
  Forest, och går inte att skilja på lådorna. De blir "samma kort som" eller en granskningspost i appen; golden mäter
  dem i Dubbletter.

## Bänkarna (diagnos)

| Bänk | Resultat |
|---|---|
| remsregeln (`remsregel.py`, v2, 0,28/0,20/0,08) | 0 säkra fel i golden-leken och Jespers lek (13b, MES-246) |
| högbänken (`hogbank_remsor.py --modell v2 --troskel 0.28`, 68 fall) | högar 3/13, par 4/13, ensamma 15/39, **0 fel namn** (appens modell vid 0,11 i MES-328: 3/13, 5/13, 14/39, 0) |
| helkort (`helkort_jamfor.py`) | orörd: hela kortets modell är inte bytt (appens egen, 2 säkra fel vid 0,11 som förut — CLAUDE.md) |
| kamerabank / avstamning | 251 OK, 0 FEL / 258 OK, 0 FEL |

## Golden

Alla körningar: samma varma profil (TMPDIR = e4a618fc:s scratchpad), port 8293, pool 171, `--ny-embed --tak 3600000`.

| Körning | Kod | Hittade | Rätt namn | Läsbara | Fel namn | Falska | Högar | Fördröjning 18 | Tid |
|---|---|---|---|---|---|---|---|---|---|
| A:s C (10:37, referens i prompten) | 25bcf0a | 118/119 | 95/119 | 95/118 | 0 | 1 (+2 token) | 8/15 | 34,05 s | |
| **S1** = steg 1 ensamt (körd av misstag i stället för C: kor.cjs startades med fel rot — se *Fällor*) | cc16800 (geo utan återfall, detRemsa 0) | 118/119 | **96/119** | 96/118 | **0** | 1 (+2 token) | 6/15 (7 ordning rätt utan namn) | 27,65 s | 14:33–14:58 |
| **C** på bas b464d8d (kor.cjs med absolut sökväg, attrappen md5-kontrollerad) | b464d8d | 118/119 | **95/119** | 95/118 | **0** | 1 (+2 token) | 8/15 | 34,05 s | 15:13–15:39 |
| **B1** bygget (steg 1 + 2) | cb7ed38 | **121/119** | **98/119** | 98/118 | **0** | 1 (+2 token) | 8/15 | 27,65 s | 15:39–16:00 |
| **B2** bygget | cb7ed38 | 121/119 | **98/119** | 98/118 | **0** | 1 (+2 token) | 8/15 | 27,65 s | 16:01–16:23 — kort för kort identisk med B1 |

C är kort för kort lika med prompt A:s C på 25bcf0a (samma antal rätt per fall; domskäl modell+orb 53 · modell+namn 19 ·
modell land 7 · modell 4 · remsa 4 · bild 3 · remsa+titel 3 · namn 2; land 31/44). MES-346:s kamerabänk körde under
C:s uppstart och fall 01–03 (8–19 s av 60); de påverkades inte.

### B1 kort för kort mot C (`kortdom.py`)

| | Kort | Hur |
|---|---|---|
| **Vinster (7)** | 05 Pacifism | `remsa` — geometrins remsa lämnar Scourges titel utanför (var `konflikt`) |
| | 13 Plains hög B hel | `remsa` 0,329 |
| | 14 Plains ×2 i hög A (0,24/0,25 synliga) | `remsa+titel`, `remsa` (var osäkra Night's Whisper) |
| | 17 Island A hel T | `remsa` 0,566 |
| | 18 Plains, 18 Fencing Ace | `remsa` 0,340 / 0,326 (Fencing Ace var `bild`) |
| **Förluster (3)** | 05 Scourge 0,29 synlig | återfallet till lådan gav rätt namn (Scourge) men marginalen under 0,28 — appens modell hade 0,2x över 0,20. Tröskelns pris |
| | 18 Swamp A 0,37 | `modell land` kräver nu vittne; remsan Swamp 0,074 < 0,08. Vittnets pris |
| | 18 Plains hög B under | i C `modell+orb` på en **omaskad** beskärning med båda Plains i (rätt namn av tur); i B1 lästes den maskad → osäker "Rebel", remsan Forest 0,004 på lådan. Ordningen mellan läsningen och täckningen — B2 får döma |
| **Under tröskeln** | 13 Plains hög B 0,33 (0,208), 17 Additive Evolution (0,276) | hade varit säkra vid 0,20/0,25; rörs inte |
| **Fler än leken** | 17 Island A 0,57 (nytt spår ur remsan, 0,339) | lek.txt har `Island` utan antal (= 1) men 17 har fem Island och två Forest — antalspriorn (K6) spärrar varje Island efter den första. Golden-materialet (prompt B: tryckning/antal i lek.txt), inte kedjan; en ändring byter poolnyckel och kräver ny C |
| **Hittade** | 17 +2 (Island A 0,57 och Forest A ur remsor utan låda), 18 +1 (Ancestral Blade under token Soldier, remsa 0,145) | detRemsa med vakterna |
| **Övrigt** | domskäl remsa 4 → 10, remsa+titel 3 → 4, modell land 7 → 1 + land+vittne 4 · land 31 → 34/44 · högar 8/15 som C · fördröjning 18: 34,05 → 27,65 s · dubbletter 4 → 5 (11: 1) · falska tap-flippar 5 → 9 (13: 2, 18: 2, samma i S1 — fler kort får namn tidigare, så fler tap-lägen hinner rapporteras) | |

Målen i prompten (≥ 107/115 läsbara, högar ≥ 11/15) nås inte: +3 namn och högarna står på 8/15. Det som
sitter kvar i högarna är detektorn (17: fyra av sju högkort utan remsa) och lek-taket i 17, samt v2:s marginaler på
13/18:s små remsor (120–150 px breda i 1080/1500 kbit/s).

### S1 kort för kort mot A:s C (`kortdom.py`)

Vinster (7): 05 Pacifism (`remsa` — geometrin lämnar Scourges titel utanför; var `konflikt`), 13 Plains hög B hel
(0,329), 14 Plains ×2 (hög A, 0,24/0,25 synliga: `remsa`), 17 Island A (0,566), 18 Plains (0,340), 18 Fencing Ace (0,326).
Förluster (4): 04 Plains 0,19 (geometrin målad över → Island 0,06; återfallet rättar), 05 Scourge (samma; återfallet),
06 Swamp (spår 12 lästes aldrig — fallet slog i 60 s-taket, 28 → 60 s, medan parprov och högbänken körde på
datorn; stillbildsfallen är väggklockebundna), 18 Swamp A 0,37 (`modell land` → kräver vittne, remsan 0,074 < 0,08).
Under tröskeln: 13 Plains hög B 0,33 (0,208), 17 Additive Evolution (0,276). Fyra `modell land` fick vittne (04, 14, 15, 18).

## Granskningen före merge (agent, läsning)

Tretton fynd; tre av dem vägar till ett säkert fel namn, alla rättade i commiten efter cb7ed38 och mätta ×2 igen (B3/B4):

| Fynd | Rättelse |
|---|---|
| 1. Vakt (b) i para kunde para det undre kortets synliga remsa till det övre kortets remslösa låda (0,08–0,2 in från kanten) → det övre spåret får det undre kortets namn säkert | vakt (b) borttagen; en dubblett ur remsan är billigare än ett fel namn och slås ihop av sammaKortSom |
| 2. Geometrins remsa är en hel kortbredd och klipptes inte mot kortets låda — en granne utan egen låda (token, tärning, kort i sidled) kunde läsas, också i titeldelen | allt utanför kortets egen låda (ramen eller lådan + 4 %) målas med mattans nivå genom samma vridning |
| 3. Spärrens osäkra svar gick vidare som osäkert → Claude, som saknar stilla/skymd-koll | medRemsa returnerar `vanta`, identifiera läser om efter 1,5 s utan Claude och utan granskningspost |
| 4. Golden rapporterade remsmodellen bara med `--rems-modell` — en körning där v2 inte laddats hade sett ut som bygget | kor.html/kor.cjs skriver alltid `remsorna: <fil>` och varnar när den saknas |
| 5. `modell land` säkert mot remsan säker på annat namn → remsan vann | osäkert, `modell land mot remsa` |
| 6. Minnet blandade geo- och lådskurna prov | provet bär `geo`; bara lika skärning jämförs |
| 9. Vittnesläsningen för `modell land` körde textläsaren (0,4–1 s) i onödan | `vittneBara` hoppar över OCR |
| 10, 12, 13 | räknarna tackt/utom bara för det som rör remsan; filen i lagringen får aldrig skrivas över under samma namn; läsningsraden i --detalj visar låda/geo/synt |
| 7 (skräpdomen släpper lådor med remsa — en falsk remsa på en träbit kostar nu en läsning och kanske en Claude-fråga), 8 (återfallets täckning räknas på remsans omskrivna låda och slår för ofta för sneda kort), 11 (kamerabank saknar prov på geo-vägen) | lämnade medvetet; bevakas i golden (Falska, fördröjning) och står här |

Andra läsningen (av rättelserna):

| Fynd | Rättelse |
|---|---|
| Målningen utanför kortet gick mot `t.ram`, som finLada får krympa 12 % per sida — titeln börjar 7–8 % in, så ett helt synligt korts första bokstäver kunde målas över | unionen av detektorns låda och ramen: kan bara bli större än kortet |
| Spärrens omläsning saknade tak: ett kort under en vilande hand lästes om i full kedja var 1,5 s i evighet utan att nå spelaren | backoff 1,5 → 3 → 6 → 10 s och efter fyra varv (~20 s) den gamla vägen (osäkert → Claude/granskning) |
| `modell land` med spärrad remsa gick till Claude i stället för att vänta | samma `vanta` där |
| Minnets tröskel (0,10) är mätt på lådremsor; två geo-remsor på samma plats är identiskt inramade, så två olika kort liknar varandra mer | minnet dömer inte på geo-skurna remsor (`geo: minnets tröskel omätt`) tills tröskeln mätts om i remsexp |
| Parprov-tabellens rad "vakterna skärpta" mättes med vakt (b) | mäts om med bara vakt (a) — raden *slutlig parning* nedan |
| Förslagslistan vid `modell land mot remsa` kunde bära ett namn två gånger | dedupad på namn |

## Fällor

- **kor.cjs med relativ sökväg startade i fel worktree.** Första "C" kördes som `cd <bas> && node dev/golden/kor.cjs`
  och mätte ändå min gren: resultatets remsposter bar fältet `geo`, som bara min kor.html skriver. Attrappen i bas
  serverar rätt filer (md5 kontrollerad); varför kor.cjs fick fel rot är inte klarlagt (sessionens arbetskatalog
  byttes av harnessen flera gånger under passet). Åtgärd: starta alltid `node /abs/sökväg/till/worktreen/dev/golden/kor.cjs`
  och kontrollera medan den kör: `curl -s localhost:<port>/ | md5` mot worktreens index.html.
- **Inga bänkar medan golden kör**: 06 slog i taket i S1 med parprov och högbänken i bakgrunden (nice 19 räcker inte).
- `timeout` finns inte på macOS.
- kamerabank VK5/VK5b räknar canvas-vridningar som inte är hela kvartsvarv som beskärningens — remsans geometri vrider i
  kortets vinkel och stängs av i just de proven.

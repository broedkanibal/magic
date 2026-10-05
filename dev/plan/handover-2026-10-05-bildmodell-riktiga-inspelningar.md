# Handover: bildmodellen tränad på riktiga inspelningar (pass 2, 3, 5) — 2026-10-05

## Så här öppnar du
Läs det här, kör `git log --oneline -6` och `ls dev/material/*-traning-*/`, och fortsätt sedan direkt med
nästa steg. Ditt första meddelande ska vara öppningsrepliken längst ned, ordagrant eller mycket nära.
Ingen hälsning, ingen sammanfattning, nämn inte det här dokumentet. För Jesper är det samma samtal.

## Var vi står
Piloten (MobileCLIP-S0 finjusterad på **bara syntetiska** bord, `dev/remsa/tran/`) är mätt på riktigt och
**inte bättre**: golden 01–18 i samma profil och pool — C appens modell 95/119 · P pilot1 överallt 95 · H pilot1
bara för remsorna 94, alla 0 fel namn (historik.md 2026-10-05, main 0dcf0be). Pilot1 vinner i det svåra ljuset
(13, 17) men tappar remsor i fotonas högar (05/06/15) och är sämre på hela kort (53 → 50/61, nav Night's
Whisper). Ingenting har tränats på riktiga bilder än — pass 2 heller inte. Jesper har spelat in pass 2, 3 och 5
(alla med `-traning-` i mappnamnet, 4K 30 b/s):

| Pass | Mapp (`dev/material/…`) | Klipp |
|---|---|---|
| 2 svart matta, taklampa | `2026-10-04-traning-svartmatta-taklampa/` | klipp1-auto, klipp2-auto, klipp3-last (låst exponering) |
| 3 träbord, sidoljus/blänk | `2026-10-05-traning-tra-sidoljus/` | klipp1-rakt (5,5 min), klipp2-rakt, klipp3-vriden-bild (bordet ~30° snett); föremål på bordet |
| 5 landhögar | `2026-10-05-traning-landhogar/` | klipp1-monstrad-duk, klipp2-enfargad-duk, klipp3-enfargad-duk-island |

Korten är slumpkort hemifrån — **leken finns inte i Mesa**. Pass 4 (ljust bord i mörker, för detektorn)
är inte inspelat och blockerar inte namnmodellen.

## Pågår i repot samtidigt: MES-334 sida 5 (sessionen "MES-334 designyta sida 5 steg 4–6")

**Uppdatering 2026-10-05 20:20 (från MES-334-sessionen):** sida 5 är **inte** ihopslagen. Golden med Claude gav ett
säkert fel namn i fall 05 (Pacifism blev Scourge via helbilden), och det kommer in med steg 3. MES-334 står i **Todo**,
och en ny session (Fable) fortsätter enligt `dev/plan/prompt-hogarna-fall05.md` (2,5–5 h, i kväll eller i morgon).
Grenen `mes-334-sida5` (6002cd0) ändrar `index.html`, `dev/golden/kor.cjs` och `kor.html`.

**Regel tills MES-334 ligger på main:** ändra inget i `index.html`, `dev/embed/embed.js` (`MODELL_HF`, `V`),
`dev/golden/kor.cjs` eller `kor.html`, och lägg inte in den tränade modellen i appen. Behövs något av det: skicka ett
meddelande till MES-334-sessionen först. Annars måste sida 5 läggas om och mätas om. Golden-samordningen gäller som
förut: "golden startar" och "klart" mellan sessionerna (vi pausar med SIGSTOP/SIGCONT).

*Texten nedan är läget 14:40 och står kvar som historik.*

Grenen `mes-334-sida5` (steg 0, 4, 5, 6 + rättelse 1, omlagd på main 5491749, går ihop utan konflikt) väntar på
granskningens kontroll, sedan golden på det ihopslagna läget (lokalt + `--utan-leken` + `--utan-bib` + `--ai`) på
port 8271 och **push till main, som driftsätter**. Den ändrar kamerans kod i index.html (leken, graveyard,
högarna, uppstartens steg 4 bort) — inget som rör märkningen eller `dev/remsa/`. Fyra följder för det här arbetet:

1. **Last:** 4K-avkodning + detektorn på rutor är tung. En golden under last ger andra tal ("⏱ tak" = ogiltig
   körning för dem). Kör ingen tung bearbetning medan `pgrep -f "dev/golden/kor.cjs"` ger träff — vänta eller
   fråga sessionen. Sessionen är underrättad (2026-10-05 14:40).
2. **Baslinjen flyttar sig:** när sida 5 ligger på main är dagens C (95/119) inte längre jämförelsegrund — mät C
   på nytt på den nya main, i samma profil som den nya modellen, innan något jämförs. `--utan-bib` kan behövas.
3. **Disk:** 18 GB fritt, `dev/material` 17 GB; MES-334 stannar under 1,5 GB. Inga 4K-rutor på disk i onödan —
   spara beskärningar, inte rutor; 1080p-kopiorna är små (~1 MB/s × 20 min).
4. **Linear:** MES-334 står i Todo sedan 20:20 (se uppdateringen ovan). Det här arbetet är **MES-340** (In Progress, High).

## Osäkert läge
- **`dev/embed/node_modules` finns inte i huvudträdet.** Utan onnxruntime-web där tar golden appens modell från
  Hugging Face (kor.cjs varnar nu). Installera `onnxruntime-web@1.22.0` i en scratchmapp och symlänka; symlänka
  inte till huvudträdet.
- `dev/embed/modeller/mobileclip-s0-mesa-pilot1.onnx` finns bara lokalt (gitignorerad). Byt aldrig
  `mobileclip-s0-vision.onnx` i huvudträdet — använd `--modell <fil>` / `--rems-modell <fil>`.
- Golden-poolen ska vara **168 kort**. En ny profil får ofta 429 på 1–2 försök; kontrollen fångar det nu, men
  läs alltid `Poolen: N kort`. En golden i taget på datorn (MES-334-sessionen kör på port 8271).
- `ffmpeg` finns inte i PATH (golden 13/18:s 1080p-kopior gjordes av en tidigare session med okänt verktyg).

## Beslut
- **0 säkra fel namn är hårt; trösklarna står kvar** (remsa 0,20 / titel 0,20 / vittne 0,05, minne 0,10, hela
  kortet 0,11) — med pilot1 gav H en FEL läsning i golden 17 (Night's Whisper, inte på bordet) med titel 0,169;
  en titelgräns på 0,15 hade gjort den säker.
- **Pilot1 byts inte in, varken helt eller för remsorna.**
- **Nästa modell tränas på riktiga bilder ur pass 2, 3, 5 tillsammans med de syntetiska** — syntetiskt ensamt
  blev nästan felfritt på syntetisk validering men inte bättre i golden; hela kortet måste hållas (C får inte
  tappa 05/06/15).
- **Märkningen: namnet ur 4K-ögonblicket** när kortet ligger helt synligt ~1 s efter att det lagts; samma spår
  följs sedan till sämre lägen (täckt, i hög, i blänk) med samma namn. Osäkra kort slängs, eller visas för Jesper
  i en kort lista (frivillig). Ingen lista, ingen lek i Mesa, inget ritverktyg behövs.
  **Rättelse 2026-10-05 kväll:** "bildmodellen mot alla kort" är oprövat — MES-328:s 64/64 var mot golden-leken
  (33 namn), inte mot 30 000. Namnet i 4K tas i stället med **två vittnen**: textläsaren på titelraden i 4K
  (tesseract; `dev/remsa/ocr_export.py`) mot Scryfalls namnlista (ett entydigt närmaste namn, litet avstånd) OCH
  bildmodellen mot en **växande kandidatlek** (namnen som redan lästs i passen + basland) — överens = facit.
  Det som inte blir säkert: Claude på 4K-beskärningen, en fråga per kort-identitet, inte per ruta (~100–200
  frågor, ~1–2 $ — **fråga Jesper före**). Kvar efter det: slängs.
- **Modellen tränar på telefonens kvalitet** (samma rutor nedskalade till 1080p, 1500 kbit/s), 4K är bara facit.
- **Golden 01–18 och provinspelningar (13b, MES-246, exponering/) tränas aldrig** — `dev/detektor/delning.py`.
  Golden-lekens namn utom basland hålls utanför träningen (så golden mäter osedda kort) — Jespers slumpkort kan
  innehålla några: filtrera bort dem.
- **Håll undan några kortnamn ur de riktiga inspelningarna** som egen validering (riktiga bilder, osedda kort).

## Ambitionen: vad träningen ska ge, och vad den inte rör
Produktmålet (Private beta, milstolpe 6 · Mirror my table) är nära 100 % på allt: hittade kort, rätt namn, plats,
tap/untap, flytt, baksidor, tokens — i golden, videoproven och riktiga partier. **Den här träningen flyttar ett av
måtten.** Läget 2026-10-05 (golden 01–18, C) och vilket spår som flyttar varje mått:

| Mått | I dag | Spår |
|---|---|---|
| Hittade kort | 118/119 | detektorn (pass 4) |
| **Rätt namn** | **95/119** | **bildmodellen — den här planen** (18 av de 24 saknade), + textläsaren, Claude |
| Fel namn | 0 | hårt krav, alla spår |
| Falska kort | 1 | detektorn + spårningen |
| Plats | 99/106 | spårningen, avstämningen |
| Tap-dom | 99/99 | vinkeln (MES-334 steg 1) |
| Tokens | 2/5 | detektorn + namn (token ≠ kort) |
| Högar (ordning + namn) | 8/15 | remsan i hög (bildmodellen) + högordningen (MES-331) |
| Land per typ | 31/44 | bildmodellen (remsan) |
| Video: utlagda med namn | 30/42 | bildmodellen + läsögonblicket (MES-246) |
| Video: borttagna | 9/9 | spårningen |

Bildmodellen svarar på **vad** ett kort är, inte **var** det ligger. Den tränas här; inget annat i kedjan ändras.

| Mått | Mål | Varför det är modellens sak |
|---|---|---|
| **Rätt namn lokalt** | fler av felbokens 24 namnlösa kort (15 helt synliga men utbrända/suddiga; remsor i högar); konkret: golden 13 (3/10), 18 (4/10), 14 (8/10), remsorna i 05/06/15 får inte tappas | modellen rangordnar namnen för hela kortet och för remsan |
| **Fel namn** | **0 säkra fel**, som i dag — hårt | trösklarna står kvar; en bättre modell ger större marginal, inte lägre gräns |
| **Tid till namn** | ett kort som blir säkert lokalt får namn på ~0,1–0,5 s i stället för 0,4–1 s (textläsaren) eller 1,5–6 s (Claude); modellen själv blir inte snabbare (samma nät, samma ~100 ms) | färre kort faller igenom till de långsamma stegen |
| **Kostnad** | färre frågor till Claude per parti | samma sak |
| Hitta korten ("ej hittad", 6 st, fall 17) | **inte här** — detektorn, pass 4 (MES-288) | annan modell |
| Plats, flytt, tap/untap | **inte här** — spårningen och vinkeln (MES-334 steg 1) | ingen bildmodell inblandad |
| Baksidor | **inte här** — detektorns baksidesklass + poolens baksida; modellen ser baksidan som ett "namn" i leken, det räcker | |
| Dold information, handen | inte här (MES-246: handen täcker kortet, inget att läsa) | |

## Detektorn: samma material, eget spår — inte i den här sessionen
Jesper trodde att träningen gällde detektorn också (2026-10-05). Det gör den inte: detektorn (YOLOX, MES-288/329,
`dev/detektor/tran/`) är ett annat nät med andra etiketter (lådor från OWLv2-läraren, `dev/detektor/larare/`),
och dess lucka är en annan: av felbokens 24 namnlösa kort är **6 "ej hittad"** (5 i fall 17, ljust bord i mörker,
1 i 18 under en token) — de 18 andra är namnmodellens. Detektorns material är därför **pass 4**, som inte är
inspelat. Pass 2, 3 och 5 kan användas av detektorspåret senare (riktiga rutor i svårt ljus, högar), men **en
modell i taget**: byts båda samtidigt går det inte att se vilken som gav vad i golden. Det enda märkningen gör
för detektorn nu: spara **tidpunkterna** (inte rutorna — disk) för lägg-ögonblicken och högarna per klipp i
JSON, så att läraren kan köras på samma rutor senare.

## Kedjan i appen (så att märkningen och mätningen stämmer med den)
1. **Detektorn** (YOLOX 960×544 på telefonen) ger lådor: kort, remsa, baksida. Det är "var".
2. **Hela kortet:** `Kamera.beskar` skär kortet ur den fulla videobilden (förval 4K i spel; golden 13/18 är
   1080p/1500k), vrider det rakt om vinkeln är mätt ur remsan (`beskarVrid`, annars rak låda med bord i hörnen),
   8 % marginal som `fragaTensor` skär bort → 256×256 → bildmodellen mot **lekens** referenser (Scryfall normal,
   4 vridningar × skarp/sudd, medelvektorn bortdragen) → marginal till näst bästa NAMN; ORB kontrollerar topp 3
   (`MODELL_NAMN`); textläsaren på titelraden som vittne. **Topp-3 räknas, inte bara topp-1.**
3. **Remsan** (`kamLasRemsa`), för varje osäkert spår (`remsaAlla`): detektorns remslåda ur fulla bilden, vågrät,
   4 % marginal, 1920 på långsidan; hel remsa, sedan titeldelen (vänstra 55 %), sedan minnet, sedan textläsaren på
   bandet; mot **remsleken** (översta 14 % av samma Scryfall-bilder, 0/180 × skarp/sudd). Samma modell som i 2.
4. **Claude** sist, bara för det som fortfarande är osäkert, med remsan som vittne.
Samma nät i 2 och 3: träningen ska hålla båda (piloten tränade hel/remsa/titel 0,4/0,4/0,2).

**Bänkarna är inte appen.** `remsregel.py`, `helkort_jamfor.py` och remsbänken kör samma recept som embed.js
(likhet med appens modell 0,99995 i pilotens kontroll; Chromes nedskalning är bilinjär → `lib.kvadrat(karna='webb')`)
men saknar ORB, lekPrior, minnet, textläsaren, avrundningen, baksidan i leken, och framför allt **vilken ruta appen
läser** (stilla, utan hand). Bänken säger "rätt överst/säkra"; bara golden säger vad kedjan får. Båda behövs; golden
är grinden.

## Fällor att ta höjd för i märkningen (lärt i dag)
- **Handen.** En ruta där handen ligger över kortet får aldrig bli facit (MES-246). Kräv: lådan stilla ≥ 0,5 s,
  remslåda finns, ingen hud/rörelse i lådan (jämför två rutor).
- **Samma remsa, två kort.** Bänkens två största "fel" var dubbelparningar (golden-05/06): en remsa hör till ETT
  kort, det översta. Para remsa → kort en gång, högst en per remsa.
- **Vinklar.** Appen ser korten i två former: upprätade (vinkeln mätt ur remsan) och i rak låda med bord i hörnen
  (vinkeln omätt, < 10° eller osäker). Träna på **båda** utsnitten (remsexp har `app` och `rata`). Pass 3 klipp 3
  (bilden ~30° vriden) och pass 5 hög 3 ger just det. Referenserna har bara 0/90/180/270.
- **Två upplösningar.** I spel skärs kortet ur 4K; golden 13/18 ur 1080p/1500k. Gör träningsbeskärningar i båda
  (4K-rutan nedskalad ×2 med 'webb'-kärnan, och en 1500k-variant). `ffmpeg` saknas — cv2 läser HEVC-MOV; för
  1500k-varianten: `pip install imageio-ffmpeg` i detektor-venv eller JPEG-kvalitet som i skriptets `komprimera()`.
- **Detektorn kör på 960×544** också offline (`dev/detektor/tran/remsfall.py`, `prov.py` kör den i Python);
  lådorna räknas tillbaka till 4K för facit och till 1080p för träning.
- **Golden-lekens namn** (utom basland) ut ur träningen; Jespers slumpkort kan innehålla några. **Tokens** ut
  (fall 18:s fel var en token som namngavs). **Baksidor**: med som 'baksida' om det är billigt, annars ut.
- **Hela kortet får inte bli sämre** (piloten: 53 → 50/61 på `dev/embed/riktiga`, nav Night's Whisper): blanda
  riktiga hela kort i träningen och ha `helkort_jamfor.py` ≥ 53/61 som grind före golden.
- **ONNX-exporten** som piloten: samma in/ut-namn (`pixel_values` → `image_embeds`), fp32, SEBlock-poolen bytt;
  provas i golden med `--modell` innan något annat.
- **Facit-cirkularitet.** Märks namnen med dagens modell lär sig den nya dess vanor; därför textläsaren som
  oberoende vittne i 4K och stickprovet med egna ögon (20–30 per pass).
- **Vägen in i appen är ett senare beslut** (Jespers): modellen laddas från Hugging Face (`MODELL_HF`), vektorerna
  är förräknade i molnet (MES-230/231, nyckeln `MODELL`) — byte = ny fil + ny `V` + omräkning. Inte den här sessionen.

## Snålt: det som får köras EN gång (Jesper 2026-10-05: "inte om och om igen")
| Körning | Antal | Hur det hålls |
|---|---|---|
| Golden 01–18 | **2** (C på nya main, ny modell), samma varma profil, `--ny-embed` i båda | ingen golden under bygget; misstankar provas med `--fall 13` eller bänken; en körning görs om **bara** om loggen visar poolfel eller "⏱ tak" |
| Golden `--ai` | högst 1, på 13 och 18, bara om den lokala körningen klarar grinden | kostar |
| Remsbänkens npz | 1 per modell (~15 min, `MESA_REMSEXP_NPZ` egen fil) | |
| 4K-avkodning | 1 per klipp — detektioner och spår sparas som JSON, beskärningar som filer; alla senare steg läser JSON | aldrig "kör om pipelinen" för en regeländring |
| Byggarens prov | 30 s-utsnitt av ett klipp, inte hela klipp | |
| Granskning | 1 varv + kontroll av rättelsen, riktade prov, läser diffen, ~1 h tak | som i dag |
| Kaggle `--rok` | 1 (3 min) före den riktiga | |
| Kaggle riktig | 1 (~3 h), efter Jespers ja | |
Lärdomen från MES-334 (minnet `snal-matning-vid-orkestrering`): tiden gick i golden-loopar och granskningsvarv.

## Förkastat
- **Sänka trösklarna för pilot1** — förlusterna låg på marginal 0,007–0,051, felen når 0,17; se Beslut.
- **Hybrid "pilot1 bara för remsor" (H)** — 94/119, samma förluster som P. Koden finns kvar (embed.js
  `remsModell`, golden `--rems-modell`) för nästa modell.
- **Nattens "golden 92 → 95"** — mätte den gamla modellen (HF). Raden i historik.md är märkt OGILTIG.

## Öppna frågor
- **Hur namnen läses i 4K** — lokalt (bildmodellen på skarpa remsor/hela kort + textläsaren, överens) eller med
  Claude för de osäkra (kostar; fråga Jesper). MES-328: skarpa remsor ur exakta hörn gav 64/64 med dagens modell.
- **Uppladdning till Kaggle** — utsnitt (inte hela videorna) som privat dataset; Jespers inspelningar till en
  extern tjänst kräver hans ja. Stäm av GPU-tiden (~3 h) före körningen.
- **Konstverk av basland**: poolen tar `year>=2021`, högst 24 per typ — ett tidigt, aldrig mätt val. Jesper vill
  veta om fler år och ramar behövs; billigt att mäta.
- **Linear**: träningen spänner över sessioner — föreslå en issue i Triage (dev/linear-agent/klient.cjs).

## Rekommendation: modell, effort, upplägg (2026-10-05, Jespers fråga)
- **Huvudsessionen: Fable 5.1, xhigh.** Det som kan förstöra träningen i det tysta är omdömesfrågor — vad som får
  bli ett facitnamn, läckage från golden, vilka kort som hålls undan, hur resultaten ska läsas. Dagens två fällor
  (fel modell i golden, halva pooler) hittades genom att läsa noga, inte genom beräkning. **Inte max** (ett jämnt
  noggrant jobb, inte ett svårt enskilt problem) och **inte ultracode** (arbetet är seriellt: märk → träna → mät,
  och datorn är flaskhalsen — fler agenter köar på samma CPU/GPU och krockar med MES-334:s golden).
- **Kaggle på en annan dator ändrar inte valet:** modellen avgör vem som ritar märkningen och läser resultatet, inte
  var GPU:n står. Under Kaggle-körningen (~3 h) sover sessionen med långa väckningar (≥ 40 min) — det kostar nästan
  inget oavsett modell.
- **Ingen orkestrerare.** Huvudsessionen håller tråden själv och delegerar två avgränsade jobb: **en byggare**
  (`mesa-bygg`, Opus, egen worktree) för märkningspipelinen efter en skriven spec — så att 4K-försöken inte fyller
  huvudkontexten — och **en granskare** (`general-purpose`, Opus) på diffen, en gång + kontroll av rättelsen (som i
  dag). Byggaren itererar med små prov (ett klipp, 30 s), aldrig golden. Golden-körningarna i steg 6 kan en
  `mesa-matning` ta. Huvudsessionen gör själv **stickprovet av märkningen med egna ögon**: 20–30 slumpade
  beskärningar med sitt facitnamn, per pass — det är Fable-jobbet.
- Riktmärke: förra orkestreringen (MES-334 steg 0–3) kostade ~9–10 M agent-tokens, mest golden-loopar och
  granskningsvarv. Det här ska landa långt under: inga golden-varv under bygget, en golden för C och en för den nya
  modellen, bänkarna på sekunder.

## Nästa steg
0. Kolla `pgrep -f "dev/golden/kor.cjs"` och om `mes-334-sida5` har gått in på main (`git log origin/main`).
   Pågår deras slutgolden: bygg pipelinen utan att köra den på 4K, eller vänta.
1. Skriv specen för märkningen (huvudsessionen, en sida: reglerna i *Fällor* ovan, utdata = JSON per klipp med
   spår, lägg-ögonblick, namn + vittnen, lådor i 4K; beskärningar hel/remsa/titel i båda utsnitten och båda
   upplösningarna). Byggaren bygger `dev/remsa/tran/mark.py` (eller liknande) och provar på **30 s av pass 2
   klipp 1**. Sedan hela pass 2. Visa Jesper: antal kort, säkra namn, osäkra; stickprov med egna ögon.
2. Gör 1080p/1500k-utsnitt av samma rutor (skaffa ett ffmpeg — t.ex. `pip install imageio-ffmpeg` i
   detektor-venv — eller AVFoundation).
3. Kör samma märkning på pass 3 och 5.
4. Bygg in riktiga exempel i `dev/remsa/tran/mesa_remsa_tran.py` (blandat med syntetiska; hel/remsa/titel).
   Kort `--rok` på Kaggle först.
5. Efter Jespers ja: riktig körning på Kaggle.
6. Mät: `dev/remsa/remsregel.py`, `dev/remsa/helkort_jamfor.py`, remsbänken (MESA_MOBILECLIP + MESA_REMSEXP_NPZ),
   **Golden C mäts på main som den är när mätningen görs — skriv i historik.md om sida 5 (MES-334) var med eller inte.**
   Ursprunglig text:
   och golden **C på nytt (main med sida 5)** mot ny modell i samma profil (`--ny-embed`, `--modell`/
   `--rems-modell`, `--ut` → `felbok.cjs`). Grind: 0 fel namn, inget fall sämre. Redovisa de fyra raderna modellen
   rår på — rätt namn, land per typ, högar, utlagda med namn i video — före/efter, per fall. Rad i historik.md.
   Landen är tunga i felboken (9 av 24: Plains ×5, Island ×2, Swamp, Forest — remsor i högar, Island 0,187 strax
   under 0,20), så pass 5 är det viktigaste materialet; träningens hel/remsa/titel-vikter (0,4/0,4/0,2) står kvar
   tills bänken säger något annat.

## Kodpekare
- `dev/remsa/tran/mesa_remsa_tran.py` — piloten (Kaggle-kernel `jesperfunkrosling/mesa-remsa-tran`,
  `~/.mesa/kaggle-venv/bin/kaggle`); fällor i minnet bildmodell-pilot-traning.
- `dev/remsa/remsregel.py`, `helkort_jamfor.py`, `remsexp.py` (`ratta_parningar`) — bänkarna, nya i dag.
- `dev/golden/kor.cjs` — `--modell`, `--rems-modell`, `--ny-embed`, `--ut`; SNABBGUIDE.md beskriver dem.
- `dev/plan/inspelningar-traning-2026-10.md` — manuset för passen.
- `dev/detektor/delning.py` — spärren prov/träning.

## Arbetssätt
Svenska. Korta tabeller, mätt skilt från bedömt, förklara för en icke-expert (vad före hur). Varje steg mätt
före/efter. Fristående granskning före merge och efter varje rättelse; push till main när grinden håller.
Fråga innan GPU-tid, uppladdning av Jespers material, disk-rensning och ändringar i systemprompten.

## Öppningsreplik
> Pass 2, 3 och 5 ligger i repot. Jag börjar med märkningen av pass 2: hitta varje kort när det ligger helt synligt i 4K, läsa namnet där och följa kortet in i högarna — sedan visar jag hur många som blev säkra innan något tränas.

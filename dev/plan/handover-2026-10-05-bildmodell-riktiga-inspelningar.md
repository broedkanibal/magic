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
4. **Linear:** MES-334 står i In Progress (deras). Det här arbetet har ingen issue — föreslå en i Triage.

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
  i en kort lista (frivillig). Ingen lista, ingen lek i Mesa, inget ritverktyg behövs — namnen matchas mot alla kort.
- **Modellen tränar på telefonens kvalitet** (samma rutor nedskalade till 1080p, 1500 kbit/s), 4K är bara facit.
- **Golden 01–18 och provinspelningar (13b, MES-246, exponering/) tränas aldrig** — `dev/detektor/delning.py`.
  Golden-lekens namn utom basland hålls utanför träningen (så golden mäter osedda kort) — Jespers slumpkort kan
  innehålla några: filtrera bort dem.
- **Håll undan några kortnamn ur de riktiga inspelningarna** som egen validering (riktiga bilder, osedda kort).

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
1. Bygg märkningen på **pass 2 först**: spåra korten (detektorn `dev/detektor/modell/`, remsorna), hitta
   lägg-ögonblicken, läs namnen i 4K, följ spåren. Visa Jesper antal kort, säkra namn och de osäkra.
2. Gör 1080p/1500k-utsnitt av samma rutor (skaffa ett ffmpeg — t.ex. `pip install imageio-ffmpeg` i
   detektor-venv — eller AVFoundation).
3. Kör samma märkning på pass 3 och 5.
4. Bygg in riktiga exempel i `dev/remsa/tran/mesa_remsa_tran.py` (blandat med syntetiska; hel/remsa/titel).
   Kort `--rok` på Kaggle först.
5. Efter Jespers ja: riktig körning på Kaggle.
6. Mät: `dev/remsa/remsregel.py`, `dev/remsa/helkort_jamfor.py`, remsbänken (MESA_MOBILECLIP + MESA_REMSEXP_NPZ),
   och golden **C på nytt (main med sida 5)** mot ny modell i samma profil (`--ny-embed`, `--modell`/
   `--rems-modell`, `--ut` → `felbok.cjs`). Grind: 0 fel namn, inget fall sämre. Rad i historik.md.

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

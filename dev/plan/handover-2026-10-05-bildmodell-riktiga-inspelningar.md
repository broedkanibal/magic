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

## Nästa steg
1. Bygg märkningen på **pass 2 först**: spåra korten (detektorn `dev/detektor/modell/`, remsorna), hitta
   lägg-ögonblicken, läs namnen i 4K, följ spåren. Visa Jesper antal kort, säkra namn och de osäkra.
2. Gör 1080p/1500k-utsnitt av samma rutor (skaffa ett ffmpeg — t.ex. `pip install imageio-ffmpeg` i
   detektor-venv — eller AVFoundation).
3. Kör samma märkning på pass 3 och 5.
4. Bygg in riktiga exempel i `dev/remsa/tran/mesa_remsa_tran.py` (blandat med syntetiska; hel/remsa/titel).
   Kort `--rok` på Kaggle först.
5. Efter Jespers ja: riktig körning på Kaggle.
6. Mät: `dev/remsa/remsregel.py`, `dev/remsa/helkort_jamfor.py`, remsbänken (MESA_MOBILECLIP + MESA_REMSEXP_NPZ),
   och golden C mot ny modell i samma profil (`--ny-embed`, `--modell`/`--rems-modell`, `--ut` → `felbok.cjs`).
   Grind: 0 fel namn, inget fall sämre. Rad i historik.md.

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

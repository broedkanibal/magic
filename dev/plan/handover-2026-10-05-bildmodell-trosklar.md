# Handover: den tränade bildmodellen in i appen — trösklarna — 2026-10-05

## Så här öppnar du
Läs det här, kör `git log --oneline -8` och `ls dev/embed/modeller` för att se att läget stämmer, och
fortsätt sedan direkt med nästa steg. Ditt första meddelande ska vara öppningsrepliken längst ned, ordagrant
eller mycket nära. Ingen hälsning, ingen sammanfattning, nämn inte det här dokumentet. För Jesper är det
samma samtal som fortsätter.

## Var vi står
Piloten är tränad och mätt: MobileCLIP-S0 (appens bildmodell) finjusterad på syntetiska bord på Kaggle
(`dev/remsa/tran/`, 969c311). Modellen kan mycket mer än appen visar:

| Mått | Gamla modellen | Pilot1 |
|---|---|---|
| Remsbänken 13b, rätt överst | 3/118 | 65/118 |
| Remsbänken MES-246, rätt överst / säkra (0 fel) | 67/627 / 0 | 455/627 / 107 |
| Remsbänken golden-fotona, rätt överst / säkra | 63/72 / 51 | 67/72 / 44 (korsval 1 → 2 fel) |
| Golden i appen, **oförändrade trösklar** | 92/119, 0 fel | 95/119, 0 fel |

Gapet beror på att trösklarna i appen är satta för den gamla modellens marginaler. Den nya modellen har en
annan skala, så rätt gissningar blir inte säkra. **Nästa steg är att sätta om trösklarna för pilot1.**
Inget av det här är i produktion.

## Osäkert läge
- Pilotmodellen finns bara lokalt: `dev/embed/modeller/mobileclip-s0-mesa-pilot1.onnx` (gitignorerad). Appens
  fil `mobileclip-s0-vision.onnx` bredvid är den gamla — byt den aldrig i huvudträdet; andra sessioner kör golden därifrån.
- Kör golden med pilot1 i en egen worktree där `dev/embed/modeller/mobileclip-s0-vision.onnx` är en kopia av pilotfilen,
  och symlänka `.env.local`, `node_modules`, `dev/material`, `dev/embed/node_modules`, `dev/embed/cache`.
  **Ny profil** (egen `TMPDIR`): vektorerna cachas i IndexedDB per profil, och en gammal profil blandar in den gamla
  modellens vektorer. Kasta första körningen i en ny profil (uppvärmning).
- En worktree utan `node_modules` gav "--ai"-körningar utan ett enda Claude-svar. Golden varnar nu (6c38206), men kolla.
- Andra sessioner (MES-334-orkestreraren) kör golden på samma dator. En golden i taget; kö-skriptet
  `golden-las2.sh` låg i en gammal scratchpad som kan vara borta — mönstret står i minnet `mes-331-pass5-remsgrans-klunga.md`.

## Beslut
- **Steg 3 av minnet av remsor är borttaget** (2db6621) — golden 18 med Claude gav säkert fel namn i 3 av 4 körningar
  efter, 0 av 3 före: ett spår på token Soldier som Claude kallade kortet under. Hur steg 3 fick spåret att uppstå är
  inte utrett. Steg 3 gav ingen mätbar vinst. Lägg inte tillbaka det utan att först förstå tokenspåret.
- **0 säkra fel namn är hårt krav** — en tröskel väljs så att bänken OCH golden har 0 säkra fel; hellre färre namn.
- **Leken förblir kandidatlistan i spel**; modellen tränas på alla kort så att den fungerar för vilken lek som helst.
  Golden-lekens namn (utom basländerna) hölls utanför piloten så att golden mäter osedda kort.
- **Golden 17 och 18 (och alla provinspelningar) tränas aldrig på.** Spärren `dev/detektor/delning.py`: bara mappar med `-traning-`.

## Förkastat
- **Exponeringen som huvudförklaring till blänket** — 0 % mättade pixlar i både A och B och i golden 13. Men B (låst,
  mörkare) visar klart mer detalj i bild; antalet namn A mot B är inte mätt.
- **Mer kod på minnet för högarna** — felboken visar att bara 4 av 27 saknade namn hade namnet säkert någon gång.

## Öppna frågor
- **Vilka trösklar beror på modellen?** Kända: `T.remsaTroskel` 0,20, `T.remsaVittne` 0,05, `T.remsaMinneTroskel` 0,10
  (index.html runt rad 22800–22925, går att prova med golden `--tro`), och hela kortets `TROSKEL = 0.11` i
  `dev/embed/embed.js:49` (en konstant — inte `--tro`; behöver en väg in, t.ex. via `Embed.ladda`-inställningen).
  Sök efter fler ställen där modellens poäng eller marginal jämförs mot ett fast tal (t.ex. "modell land", spärrarna).
- **Ska modellen bytas helt, eller bara för remsorna först?** Golden-fotona fick färre säkra med pilot1 — avgörs av mätningen.
- **Linear:** träningen är en ny riktning som spänner över sessioner. Ingen issue skapad. MES-331 står i In Progress.
  Föreslå för Jesper om det ska bli en issue (Triage, via `dev/linear-agent/klient.cjs`).

## Nästa steg
1. Bänken med pilot1: läs nollfel-trösklarna ur `dev/remsa/resultat/remsexp-prova-pilot1.txt` (hel 0,240, titel 0,195
   för app/ra) och korsvalideringen. För hela kortet: `dev/remsa/kalibrering.py` (och `dev/embed/riktiga/`) med
   `MESA_MOBILECLIP=dev/embed/modeller/mobileclip-s0-mesa-pilot1.onnx`. Remsbänken: `MESA_REMSEXP_NPZ` till egen fil
   (`resultat/remsexp-pilot1.npz` finns redan, bygg tar ~15 min).
2. Golden 01–18 med pilot1 och nya trösklar via `--tro`, före förval. Krav: 0 fel namn, inget fall sämre.
   Sedan `--ai` på 13 och 18 (max två körningar, kostar).
3. Om grinden håller: hur pilot1 ska in i appen. Appen laddar modellen från HuggingFace (`MODELL_HF` i embed.js),
   och vektorer räknas också i förväg och lagras (MES-230/231) — alla måste räknas om med den nya modellen.
   Det beslutet är Jespers.
4. Sedan: riktig träning — alla kort + Jespers pass 2 (`dev/material/2026-10-04-traning-svartmatta-taklampa/`,
   klipp1-auto, klipp2-auto, klipp3-last; 4K) med namn ur 4K-rutorna som facit. Pass 3–5 spelar Jesper in
   (`dev/plan/inspelningar-traning-2026-10.md`). Stäm av med Jesper före en lång Kaggle-körning.

## Kodpekare
- `dev/remsa/tran/mesa_remsa_tran.py` — piloten (Kaggle, `--rok` = 3 min-prov, `--bara-data` = frågebilder lokalt).
  Fällor: Scryfalls bulk är JSONL.gz (`jsonl_download_uri`); ml-mobileclip omparametriserar redan; SEBlock-poolen
  byts för ONNX-exporten. Kaggle: `~/.mesa/kaggle-venv/bin/kaggle`, kernel `jesperfunkrosling/mesa-remsa-tran`.
- `dev/remsa/tran/resultat/` — pilotens syntetiska validering och logg.
- `dev/remsa/remsexp.py` — remsbänken; `MESA_MOBILECLIP`, `MESA_REMSEXP_NPZ`.
- `dev/golden/felbok.cjs` — varje kort utan namn och var det föll (27 på baslinjen, 15 helt synliga).
- `dev/golden/historik.md` — raderna 2026-10-04/05 med alla tal.
- `dev/material/exponering/` — exponeringsprovets klipp A och B (prov, inte träning).

## Arbetssätt
Svenska. Korta tabeller, rak skillnad mellan mätt och bedömt, förklara för en icke-expert (vad före hur).
Varje steg mätt före/efter. 0 säkra fel namn är hårt. Push till main när grinden håller, med fristående
granskning före merge och efter varje rättelse. Fråga innan GPU-tid, disk-rensning och ändringar i systemprompten.

## Öppningsreplik
> Då sätter jag om trösklarna för den tränade modellen: först remsans och hela kortets gränser ur bänken med 0 fel, sedan golden 01–18 med de nya gränserna via `--tro` innan något blir förval.

# Handover: bildmodellen v3 — många olika kort (A skugga → B lampa → C sol/skugga) — 2026-10-06

## Så här öppnar du
Läs det här, kör `git log --oneline -5` och `ls dev/material/2026-10-06-traning-manga-kort-*/`, och fortsätt direkt
med nästa steg. Första meddelandet är öppningsrepliken längst ned. Ingen hälsning, nämn inte dokumentet; för Jesper
är det samma samtal. Issuen är **MES-340** (In Progress, High) — den här sessionen kör den.

## Var vi står (kort)
- **Märkningspipelinen är byggd, granskad i fyra varv och körd på pass 2, 3 och 5** (natten 2026-10-05):
  `dev/remsa/tran/mark.py`, `namn.py`, `dataset.py`, `MARKNING.md`, spec `dev/plan/spec-markning-2026-10-05.md`.
  Facit = Claude på 4K-utsnittet (vittne 1) + bildmodellen eller ORB mot Scryfall-bilden (vittne 2); remsan tas ur
  kortets hörn via ORB-homografin, aldrig ur detektorns remslåda; emblem/tokens blir aldrig säkra. Stickprov med
  egna ögon: 0 fel namn på ~500 kort och ~150 remsor. Utfall: pass 2 75 namngivna spår, pass 3 299, pass 5 116 —
  men bara **29 olika kortnamn**, för Jespers slumpkort var få och lades många gånger, och korten i taklampans
  blänk föll bort (pass 2: 39 av 114 lägg utan namn). Jesper har inte kvar de buntarna.
- **Modell v2** tränad på Kaggle (riktiga utsnitt + syntetiska, 3 h): `dev/embed/modeller/mobileclip-s0-mesa-v2.onnx`
  (lokal, gitignorerad; original `~/Library/Caches/mesa/riktig-ut/`). Bänkarna: helkort 53 → 55/61 (0 säkra fel vid
  0,11); remsregeln med golden-leken golden 55 → 59 säkra, 13b 0 → 21, MES-246 0 → 201, 0 säkra fel; i svåra fall
  (MES-246 + 13b) rätt överst 10 → 80 %, säkra 0 → 31 % (ensamma), 0 → 36 % (i hög), tappade 0 → 0 %.
  **Men med Jespers gamla lek (utan Forest/Island): 2 säkra fel i MES-246, Fencing Ace → Plains 0,225** —
  basland-bias (hälften av träningens utsnitt var basland). **v2 går inte in i appen.** Golden C mot v2 pågår/är
  körd — se nedan.
- **Allt kod ligger på grenen `worktree-agent-ae1b06e26cf083a32`** (worktree `.claude/worktrees/agent-ae1b06e26cf083a32`),
  sammanslagen med origin/main lokalt men **inte pushad** (sessionens behörighet nekade push). Jesper pushar:
  `git -C /Users/jesperfunk/Code/magic/.claude/worktrees/agent-ae1b06e26cf083a32 push origin HEAD:main`.
  Tills dess: kör skripten från worktreens sökväg (symlänkarna dev/material, dev/embed/modeller, dev/embed/cache
  finns där; `dev/remsa/node_modules` också).

## Golden C mot v2 (startad 13:05 den 6 okt av en mesa-matning-agent)
Två körningar 01–18 lokalt, port 8291, samma varma profil, main 62e282a (MES-334 sida 5 **är med**): C = appens
modell (lokal fil), V2 = `--modell dev/embed/modeller/mobileclip-s0-mesa-v2.onnx`. Resultatet (båda `--ut`-filerna +
`resultat.md`) ska ligga i `dev/material/arbete/markning/golden-2026-10-06/`. **Är mappen tom:** kolla
`ps -axo command= | grep -E '^node .*golden/kor\.cjs'` — kör den fortfarande, vänta. Läs sedan: rätt namn/119 C → V2,
fel namn (måste vara 0), falska, per fall, land per typ, högar. Skriv raden i `dev/golden/historik.md` med
"sida 5 med" och modellrubriken. Kör INTE om (regeln: exakt två körningar; om bara vid poolfel ≠ 168 eller "⏱ tak").

## Dagens inspelning: många olika kort, tre ljus, samma ordning
Jesper spelade in **A** 2026-10-06 ~14:00: `dev/material/2026-10-06-traning-manga-kort-tra-skugga/` — klipp1–4.MOV
(2,1 GB, träbord, jämnt dagsljus i skugga, ett kort i taget på ny plats, ~50 åt gången, blandat med/utan hylsor) +
`manabox-scan-2026-10-06.csv` (**151 kort, 121 olika namn, 23 basland**; 9 tokens/emblem som filtreras bort —
Skeleton, Soldier, Human Soldier, Avatar, Inkling, Pest, Spirit, Guenhwyvar, Basri Ket Emblem; "Day // Night"
matchade inte namnlistan — kolla varför; Thriving Moor är golden-lekens och tränas aldrig; 13 namn finns redan sedan
pass 2/3/5). Ordningen i bunten är bevarad (plockades ihop framsidan nedåt och vändes).
**B** (under taklampan, samma ordning, vartannat kort vridet 90°) → `2026-10-06-traning-manga-kort-lampa/`, och
**C** (sol och skugga blandat, första ~100 korten) → `2026-10-06-traning-manga-kort-solskugga/` — inspelas när Jesper
hinner; mapparna finns. Klippen ska heta likadant i alla mappar (klipp1–4).

## Nästa steg (i ordning)
0. `pgrep`-kollen: `ps -axo command= | grep -E '^node .*golden/kor\.cjs'` tom. Golden-protokollet med MES-334:s
   sessioner: skicka "golden startar"/"klart" (ListAgents → "MES-334 fall 05 utredning" m.fl.); pausa med
   `kill -STOP`/`-CONT` på mark.py + ffmpeg om de ber. **Ett vänteskript med `pgrep -f "…kor.cjs"` matchar sig självt.**
1. **Märk A:** `PY=~/.mesa/detektor-venv/bin/python; W=/Users/jesperfunk/Code/magic/.claude/worktrees/agent-ae1b06e26cf083a32;
   $PY $W/dev/remsa/tran/mark.py pass $W/dev/material/2026-10-06-traning-manga-kort-tra-skugga --tel`
   (~4 min/klipp A + C med Claude ~0,7 $/klipp + E + T; CSV:n används som kandidatlek). Läs `rapport.md`,
   och gör **stickprovet med egna ögon** (galleri: skriptet i scratchpaden är borta — bygg ett: montage per klipp finns
   redan som `<klipp>/montage.jpg`, tre rader: lägg, sista läget, remsan; för zoom skriv en HTML med inbäddade
   bilder som i går). Skriv `facit-manuell.json` per klipp för osäkra du kan läsa; `null` för Claude-fel.
2. **B och C finns inte än (2026-10-06 14:30) — hoppa över det här steget och gå direkt till 3.** Blänket finns redan i
   träningen via pass 2/3/5 (490 namngivna kort); B/C blir v4 om golden visar att blänket är kvar. När de finns:
   `mark.py pass …-lampa --par …-tra-skugga --tel` `mark.py pass …-lampa --par …-tra-skugga --tel` (namn ur A via ordning + ORB mot A:s
   4K-utsnitt; `saker_ordning` för utbrända). `mark.py par A B --torr` visar parningen först. Samma för C.
3. **Dataset (A + pass 2/3/5):** `dataset.py rakna`, sedan `dataset.py bygg --ut ~/Library/Caches/mesa/ds-riktiga-v3 --om`, lägg
   `dataset-metadata.json` (id `jesperfunkrosling/mesa-riktiga-utsnitt`, privat) och ladda upp som **ny version**:
   `~/.mesa/kaggle-venv/bin/kaggle datasets version -p <mapp> --dir-mode zip -m "v3: många kort"`. Jesper har sagt ja
   till uppladdning och Kaggle-körning (2026-10-05).
4. **Kaggle:** kopiera `dev/remsa/tran/mesa_remsa_tran.py` + `kernel/kernel-metadata.json` (dataset_sources =
   [datasetets slug]) till en scratchmapp, patcha rad `ARGS = sys.argv[1:]` → `sys.argv[1:] or ['--rok', '--val-klipp',
   '<pass>/<klipp>']` för röken (3 min), `kaggle kernels push -p <mapp>`, `kaggle kernels status jesperfunkrosling/
   mesa-remsa-tran`, `kaggle kernels output … -p <ut>`. Sedan utan `--rok` (170 min). `--basvikt` är förvalt
   (basland 53 → 33 % av dragningarna). Håll ett klipp utanför som `--val-klipp` (A:s klipp4 — det är kort, ~10 kort, så hellre
   `2026-10-05-traning-landhogar/klipp3-enfargad-duk-island` som i v2, för jämförbarhet).
5. **Mät v3:** `dev/remsa/helkort_jamfor.py <v3.onnx>` (grind ≥ 55/61 nu, 0 säkra fel vid 0,11), remsbänken
   (`MESA_MOBILECLIP=<v3> MESA_REMSEXP_NPZ=resultat/remsexp-v3.npz python dev/remsa/remsexp.py bygg`, sedan
   `remsregel.py resultat/remsexp-bas.npz resultat/remsexp-v2.npz resultat/remsexp-v3.npz`) — **basland-felet i Jespers
   lek måste vara borta** — och golden v3 i samma profil som C (en körning). Grind: 0 fel namn, inget fall sämre.
6. Rad i historik.md, kommentar på MES-340 via `dev/linear-agent/klient.cjs` (som agenten, inte som Jesper).

## Regler som gäller (oförändrade)
0 säkra fel namn; trösklarna rörs inte; rör inte `index.html`, `dev/embed/embed.js` (MODELL_HF, V), `dev/golden/
kor.cjs`, `kor.html` och lägg inte in modellen i appen före Jespers beslut (och meddela MES-334-sessionen först); golden
exakt två gånger per jämförelse; fråga Jesper före nya kostnader utöver de godkända (Claude-märkning ~5 $ för A+B+C,
Kaggle gratis). Vägen in i appen är Jespers beslut.

## Fällor (lärda 5–6 okt)
- `pgrep -f` i vänteskript matchar sig självt → `ps -axo command= | grep -E '^node .*golden/kor\.cjs'`.
- Harnessen kan byta arbetskatalog mitt i: en commit hamnade på lokala main i stället för grenen → använd
  `git -C <worktree>` och absoluta sökvägar; lokala main ska stå på origin/main.
- Claudes `sure`-flagga är brus; Claude säger namn med sure:true på helt utbrända kort (Vampire Interloper ×6) —
  vittne 2 är det som skyddar. Emblem har planeswalkerns konstverk → `token`-fältet.
- Modellens kandidatlek får inte ha alla 1 952 landkonstverk (topp-1 lutar mot basland); ORB får.
- Scratchpaden (/private/tmp/claude-501/…) töms vid omstart; tungt och viktigt under `~/Library/Caches/mesa/` eller
  `dev/material/arbete/`.
- Galleriet för Jesper: bilder i chatten är för små — HTML med inbäddade bilder som han öppnar med `open <fil>`.

## Rekommendation: modell och effort
**Fable 5.1, xhigh**, utan orkestrerare — samma skäl som i går: det som kan gå fel är omdömet (vad som får bli facit,
läsa stickprov och golden), inte beräkningen. Delegera märkningens kod till `mesa-bygg` (Opus) bara om något måste
byggas om; märkningen körs med de färdiga kommandona. Golden-körningar: `mesa-matning` (Sonnet, medium).

## Öppningsreplik
> Dina fyra klipp och kortlistan ligger på plats: 151 kort, 121 olika namn, cirka 98 nya för modellen. Jag startar märkningen av skugginspelningen nu och kollar samtidigt hur golden gick för v2 — sedan visar jag stickprovet innan något tränas.

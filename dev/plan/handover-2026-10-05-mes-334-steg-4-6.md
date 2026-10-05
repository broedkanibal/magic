# Handover: MES-334 sida 5, steg 4–6 — 2026-10-05

## Så här öppnar du
Läs det här dokumentet och sedan **uppdraget i `dev/plan/prompt-hogarna-steg-4-6.md`** — det är kontraktet för
sessionen (upplägg, steg, ihopslagning). Kontrollera snabbt mot repot att läget stämmer (`git log --oneline -5`,
`git log -1 origin/mes-334-steg3`), och sätt sedan igång direkt. Ditt första meddelande är öppningsrepliken längst
ned. Ingen hälsning, ingen sammanfattning tillbaka, nämn inte det här dokumentet.

## Var vi står
Del A (mätningen) och steg 0–3 av designytans sida 5 är gjorda. **Steg 1 (vinkeln per kort, e138dae) och steg 2
(mattan ritas inte om, 5da8fc0) ligger på main och är ute i produktionen.** Steg 3 (leken) är byggt och granskat i
tre varv på grenen **`mes-334-steg3` (7bc8564, pushad som gren)**. Steg 4 (graveyard), 5 (högarna bland korten)
och 6 (uppstartens steg 4 bort) är inte påbörjade. MES-334 står i **Todo**. Hela redogörelsen:
`dev/plan/hogarna-resultat.md`.

## Osäkert läge
- **`mes-334-steg3` bygger på 5da8fc0**, inte på dagens main. Main har sedan dess fått steg 1, en annan sessions
  remsminne steg 3 som sedan *backats* (2db6621), 6c38206 (golden `--ai` säger ifrån om Claude-handlern inte laddas)
  och en pilot i `dev/remsa` (rör inte index.html). Omläggningen ger krockar i kamerans kod.
- **Rättelse 4 av steg 3 (7bc8564) är inte granskad separat** — den ingår i helgranskningen av steg 3–6.
- **`dev/remsa/remsexp.py` i huvudträdet** har ocommittade ändringar från MES-331-sessionen. Rör den inte.
- Ett köskript från en annan session (`golden-las2.sh` i scratchpad `4916c733…`) väntade i ~10 h på att köra golden.
  Kolla `pgrep -f "dev/golden/kor.cjs"` före varje körning.

## Beslut
- **Sida 5 slås ihop i en leverans: steg 3–6 tillsammans** — byggunderlaget säger en leverans; steg 1 och 2 står
  på egna ben och fick gå före.
- **Snålt upplägg (Jesper):** en byggare gör omläggning + 4 + 5 + 6 i följd på samma gren, en granskare läser hela
  diffen en gång, högst två varv, golden en gång efter omläggningen och en gång vid slutet, inget `--ljus alla`,
  granskare kör bara riktade prov — förra körningen tog ~20 h och ~10 M agent-tokens för steg 0–3, mest i
  granskningsloopar och köade golden-körningar (minnet `snal-matning-vid-orkestrering`).
- **Brickan visar "Library" utan tal** (Jesper, frågat i sessionen) — Mesa vet inte när kort dras. Står i byggunderlaget.
  Graveyard-brickan *har* tal, eftersom Mesa räknar korten där.
- **Bara namnremsan gör en kortvinkel säker** (`sparVinkel().matt`, vridning av beskärningen) — formens långsida gav
  fel långsida när en hand låg i lådan. Följd: **leken (ingen remsa) får aldrig `matt`**, så den behöver en egen,
  strängare väg till grundläget (står i prompten, steg 0).
- **G3:s "före" är nu main med steg 1** (golden lokalt 95/119, 0 fel namn; med Claude 0 fel namn utom fall 18,
  vars fel kom av remsminnet och är backat) — inte baslinjen B0 (92/119). Utskrifterna:
  `/private/tmp/claude-501/-Users-jesperfunk-Code-magic/c4fe2060-3005-4715-b861-9d4cea5b2c6f/scratchpad/verif1/`.
- **`--ai` är använd 2 av 3 gånger för MES-334**; den sista är för det ihopslagna läget av sida 5.
- **Push till main är godkänd av Jesper** när bänk, golden och granskning är gröna. Push driftsätter.

## Förkastat
- **En provisorisk, osynlig ruta för leken från första bilden** — gav golden 18 utan ruta 8/1, inte 9/2; backad.
- **Ett tidsfönster (`LEK_SOK_MS` 10 s) efter att leken flyttats** — lät leken hoppa till en nedvänd hand; ersatt
  av att leken går tillbaka till sin gamla plats (rättelse 4).
- **Formens långsida som säker vinkel** — fel långsida med en hand i lådan (golden 18, A2:s data 0 av 5 fångade).
- **"Library 33" (lek − 7) och "hand + library"** — Jesper valde inget tal.
- **Granskningsloop tills noll fynd och `--ljus alla`** — Jesper strök dem mitt i körningen.

## Öppna frågor
- **Golden 18 utan uppstartens ruta: 7 hittade / 1 rätt namn mot 9 / 2.** Orsaken är okänd (korten som skiljer ligger
  3–4 kortbredder från leken). Steg 6 tar bort uppstarten, så den ska hittas eller redovisas — döm G3 för steg 6 också
  med `--utan-bib`.
- **Lekens vinkel som grundläge** — hur den strängare vägen ska se ut avgör byggaren (förslag i prompten).
- Golden 07 får en falsk "lek" vid 30,6 s efter första kortet (en inbränd ram i videon) — reglerna tillåter en lek
  efter första kortet, så det är inte självklart ett fel.

## Nästa steg
1. `paborjaIssue('MES-334')` via `dev/linear-agent/klient.cjs`.
2. Starta **en** byggare (`mesa-bygg`, `model: "opus"`, egen worktree) med prompten: omläggning av `mes-334-steg3` på
   main, lekens egen vinkelväg, golden + bänk, sedan steg 4, 5, 6 i följd.
3. **En** granskare på hela diffen, rättelse, kontroll av rättelsen.
4. Ihopslagning enligt promptens sista avsnitt, push, driftkoll, `hogarna-resultat.md` uppdaterad,
   `markeraRedoAttTesta('MES-334', …)` med vad Jesper ska prova på telefonen.

## Kodpekare
- `dev/plan/prompt-hogarna-steg-4-6.md` — uppdraget.
- `dev/plan/hogarna-resultat.md` — vad steg 0–3 byggde, API:t mellan stegen, granskningarnas fynd, kända rester.
- `dev/plan/hogarna-principer.md`, avsnittet *Byggunderlaget* — besluten; gäller före allt.
- `design_handoff_hogar/project/P5*.dc.html` — sida 5; bygg inget som inte står där.
- `dev/material/arbete/2026-10-04-hogarna-matning/` (lokalt, gitignorerat) — `steg1/2/3-rapport.md`, alla
  granskningsfiler i `granskning/`, `B-regler.md` (förra körningens agentregler), `baslinje.md`.
- `dev/leken.cjs`, `dev/mattan.cjs` — bänkproven för steg 3 och 2; de ligger i `dev/kolla.sh`.

## Arbetssätt
- Svenska, kort och för en icke-expert: tabeller, vad före hur. Jesper frågar "har du fastnat?" — svara ärligt med
  läge och en tidsuppskattning, och säg rakt ut när något går för långsamt.
- Han är kostnadsmedveten: föreslå snålare vägar hellre än att köra på.
- Ta aldrig bort andra sessioners filer, scratchpadar eller worktrees utan hans uttryckliga ja.
- En annan session (MES-331, remsorna) arbetar i samma repo och pushar till main: kolla `git fetch` och
  `git status` före varje ihopslagning, och säg till den sessionen om något du hittar i dess kod.

## Öppningsreplik
> Då startar jag steg 4–6: `paborjaIssue` på MES-334 och en byggare som först lägger om `mes-334-steg3` på dagens main och ger leken en egen väg till grundläget.

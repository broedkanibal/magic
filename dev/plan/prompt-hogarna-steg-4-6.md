# Prompt: sida 5, steg 4–6 (graveyard, högarna bland korten, uppstartens steg 4 bort)

Fortsättning på MES-334 efter orkestreringen 2026-10-04 (resultatet:
[`hogarna-resultat.md`](hogarna-resultat.md)). Del A och steg 0–3 är gjorda; steg 4–6 återstår.
**Upplägget är snålt med avsikt** (Jesper 2026-10-04, minnet `snal-matning-vid-orkestrering`): förra
körningen tog ~17 timmar och ~9 M agent-tokens för steg 0–3, mest i granskningsloopar och köade
golden-körningar.

## Läget vid start

| | Var |
|---|---|
| Steg 1 · vinkeln per kort | på main, e138dae |
| Steg 2 · mattan ritas inte om från noll | på main, 5da8fc0 |
| Steg 3 · leken | grenen **`mes-334-steg3`** (pushad som gren, **inte** på main) — bygger på 5da8fc0, ännu inte omlagd på steg 1 |
| Beslut sedan byggunderlaget skrevs | brickan visar **"Library" utan tal** (Jesper 2026-10-04, står i byggunderlaget) |

## Upplägget

| Vem | Vad |
|---|---|
| **Du (orkestreraren)**, Opus 5.5 high | kör `paborjaIssue('MES-334')`, startar en byggare, en granskare, slår ihop och pushar, flyttar issuen |
| **En byggare**, `mesa-bygg` med `model: "opus"`, i egen worktree | 1) lägger om `mes-334-steg3` på main (med steg 1), 2) bygger steg 4, 5 och 6 **i följd på samma gren**, en commit per steg, utan ihopslagning emellan |
| **En granskare**, `general-purpose` med `model: "opus"`, `isolation: "worktree"` | läser hela diffen (steg 3–6 mot main) **en gång** när byggaren är klar |

- **Granskningen:** blockerande/viktiga fynd → byggaren rättar → en ny granskare kontrollerar *rättelsen*
  (inte hela steget igen). Små fynd → byggaren rättar, du gör en snabb koll av diffen. **Högst två varv.**
- **Golden:** byggaren kör golden **en gång** efter omläggningen (mot main med steg 1: lokalt 95/119, 0 fel namn — inte B0) och **en gång** när
  steg 6 är klart; du kör den en gång på det ihopslagna läget. Lokalt + `--utan-leken`; `--ai` **en** gång på
  det ihopslagna läget (den sista av MES-334:s tre). Inget `--ljus alla`.
- **Bänken (`sh dev/kolla.sh`):** byggaren innan han lämnar, du vid ihopslagningen. Granskaren kör bara riktade
  prov (`dev/leken.cjs`, `dev/mattan.cjs`, `dev/avstamning.cjs`, egna skript).
- **Bara en golden åt gången på datorn:** `pgrep -f "dev/golden/kor.cjs"` tomt före start. En annan sessions
  köskript (`golden-las2.sh`) har stått och väntat i scratchpad `4916c733…`; fråga Jesper om det fortfarande finns.
- **Disken:** kontrollera `df -h /` före golden; under 1,5 GB: stanna. Inga 4K-rutor på disk i onödan.
- **En golden-körning med "⏱ tak" på ett fall är ogiltig:** fallet slog i tidstaket under last och ger andra tal
  (granskning runda 3 av steg 3: 17 och 06 i `--utan-leken` flyttade sig bara under last). Kör om utan last.

## Så går det fortare (lärdomar från förra körningen)

- **En varm golden-profil för hela körningen:** `TMPDIR=/private/tmp/claude-501/-Users-jesperfunk-Code-magic/c4fe2060-3005-4715-b861-9d4cea5b2c6f/scratchpad/golden-tmp`
  och `--port 8271`. Poolen (168) och bildmodellen är redan byggda där, så ingen uppvärmningskörning behöver kastas,
  och före/efter jämförs i samma profil. Läs raden `Poolen:` ändå.
- **Byggaren itererar inte med golden.** Under bygget används de riktade bänkproven (`dev/kamerabank.cjs`,
  `dev/leken.cjs`, `dev/mattan.cjs`, `dev/avstamning.cjs`, sekunder i stället för 10–20 min); golden bara på de två
  ställena ovan, och enstaka fall (`--fall 18`) när en misstanke ska prövas. Förra gången körde en byggare ~6 hela
  golden-varv.
- **Granskaren läser diffen och funktionerna den rör, inte hela index.html**, och har ett tak på ungefär en timme.
  Varje granskare som läste in filen från noll kostade 300–450k tokens.
- **Orkestreraren väcker sig sällan:** notiserna väcker den när en agent är klar, så reservväckningen ska vara lång
  (≥ 40 min) och "inget nytt" ska inte rapporteras. Läs aldrig agenternas loggar själv.
- **Byggaren rapporterar när den kört fast** (en timme utan framsteg på samma problem) i stället för att prova vidare —
  då avgör orkestreraren om det blir en känd rest i resultatet.

## Läs först (byggaren och granskaren)

- Avsnittet **"Byggunderlaget"** i `dev/plan/hogarna-principer.md` (gäller före allt) och steg 4–6 i del B i
  [`prompt-hogarna-matning-och-etapp-1.md`](prompt-hogarna-matning-och-etapp-1.md).
- Designytans sida 5: `design_handoff_hogar/project/P5*.dc.html`, rubrikerna i `canvas.json`
  ("4 · In play: just the cards", "5 · Is this your graveyard?", "6 · No: what is it then?",
  "8 · The piles follow the zoom"). **Bygg inget som inte står på sida 5.**
- [`hogarna-matning.md`](hogarna-matning.md) (del A): "Bedömning per regel" och förslagen — de är
  *genomföranden* av regler (t.ex. sidoregeln = i lekens rad; "inte fäst" = bakre kortet sticker ut 10–25 %),
  aldrig ändrade beslut.
- [`hogarna-resultat.md`](hogarna-resultat.md): vad steg 1–3 byggde, API:t mellan dem och de kända resterna.
- Lokalt (gitignorerat): `dev/material/arbete/2026-10-04-hogarna-matning/` — `B-regler.md`, `baslinje.md`,
  `steg1-rapport.md`, `steg2-rapport.md`, `steg3-rapport.md` och alla granskningsfiler.

## Byggarens steg

**0. Omläggning.** `git checkout -b mes-334-sida5 origin/mes-334-steg3`, sedan `git rebase origin/main`
(krockar i kamerans kod mellan steg 1 och steg 3). Koppla steg 3:s adapter till steg 1:s riktiga API:
`Kamera.satGrundGrader(g)`, `Kamera.foljGrundGrader(g)` (`T.grundKnuff` 8°), `Kamera.sparVinkel(id)` →
`{grader, matt, kalla, upp}` där **`matt` bara blir sann ur namnremsan, efter tre nya remsmätningar i följd**
(rättelserna i steg 1). **Leken har ingen remsa och får därför aldrig `matt`** — utan en egen väg blir lekens
vinkel aldrig grundläge, och byggunderlagets "lekens exakta vinkel = otappat" faller. Ge leken en strängare egen
väg: formens vinkel (`sparVinkel().grader` med `kalla` = form) när leken ligger still, ingen hand över den
(masken/handzonen), samma axel ±5° över flera *nya* mätningar och lekens storlek som en kortyta. A2 mätte lekens
vinkel med samma metod: 101 av 104 inom ±10°. Osäkert = dagens grundläge. Golden en gång + hela bänken.
0 fel namn mot baslinjen.

**4. Graveyard** — som i Byggunderlaget: sidoregeln (i lekens rad) och kort ovanpå kort (inte land på land,
inte fäst) ger rutan "Is this your graveyard?  Yes · No" ovanför högen; den står kvar tills man svarar och
blockerar inget; inget är graveyard före Yes; kort som läggs på under tiden hör till samma fråga; Yes → tonas,
brickan "Graveyard N"; No → M1 (Permanent / Ignore this spot); efter Permanent frågar Mesa en gång till, efter
Ignore aldrig; bara ägaren ser frågan; MES-85 gäller efter Yes mot högen där den ligger. Graveyard *vet* hur
många kort den har, så dess bricka har tal.

**5. Högarna bland korten** — D1 utan ramar, högarna följer mattans zoom (dagens zoom; zoomstegen är MES-338),
brickan behåller sin storlek; ett **ensamt** nedvänt kort visas (morph), högar som inte är leken eller skärs av
bildkanten **ignoreras** (golden 17); spelare utan kamera: fast plats som i dag men D1:s utseende; exile som i
dag på fast plats i D1:s utseende.

**6. Uppstartens steg 4 bort** — `oppSteg4` och delarna av `oppSteg4Klar`/`oppOppnasIgen` som gäller steget,
`oppstartSparr` i `avstamBord` (UP1–UP8) och `grundSteg`. Kontrollera först vad mer som läser provkortet
(`kortstor`, Card size). **Börja med den kända resten i golden 18** (nedan): utan uppstartens ruta blir det
standardläget.

## Kända rester från steg 1–3 (läs i `hogarna-resultat.md`)

- **Golden 18 utan uppstartens ruta** ger 7 hittade / 1 rätt namn mot 9 / 2 med rutan. Orsaken är **okänd**
  (korten som skiljer ligger 3–4 kortbredder från leken); nio varianter av lekens egen ruta gav högst 8 / 1.
  Golden kör i dag med facits ruta (som uppstarten) — **G3 för steg 6 ska också dömas med `--utan-bib`**, och
  skillnaden ska förklaras eller redovisas, inte döljas.
- Golden 07: en falsk "lek" vid 30,6 s, efter första kortet (en inbränd ram i videon).
- `--utan-leken`: fall 17 och 06 rörde sig i steg 3 (se granskning runda 3) — kontrollera mot main i samma profil.
- Rättelse 4 av steg 3 (7bc8564) tog bort `LEK_SOK_MS`; leken går nu tillbaka till sin gamla plats om en hög lagts
  där efter en flytt. Känd gräns: ett nedvänt kort på lekens gamla plats tas för leken vid första lyftet efter en
  flytt (Not my library rättar). Rättelse 4 är inte granskad separat — den ingår i helgranskningen.
- Golden 18 med Claude fick ett tokenspår med säkert fel namn av remsminnet steg 3 (261803e); det är borttaget i
  2db6621, så `--ai` jämförs mot 0 fel namn. Main innehåller nu också 6c38206: `--ai` säger ifrån när
  Claude-handlern inte går att ladda (en worktree utan `node_modules` gav förut "--ai" utan ett enda Claude-svar).

## Ihopslagningen och avslutet (orkestreraren)

1. När granskningen är klar: `git merge-tree --write-tree origin/main mes-334-sida5` + `git commit-tree`, en
   tillfällig worktree med symlänkar (`.env.local`, `dev/material`, `node_modules`, `dev/embed/modeller`,
   `dev/embed/cache`), `sh dev/kolla.sh`, golden lokalt + `--utan-leken` + `--utan-bib` på 18 + `--ai`.
2. G3: 0 nya fel namn; inte färre hittade/rätt namn, inte fler falska eller tap-fel — med undantag som är
   förklarade och skrivna i resultatet (t.ex. golden 18 utan ruta).
3. `git merge --ff-only` i huvudträdet, `git push origin main`, verifiera att sidan ute är identisk med filen
   (`diff <(curl -s https://magic-mauve-xi.vercel.app/) index.html`).
4. Uppdatera `hogarna-resultat.md` (steg 4–6), rad i `dev/golden/historik.md`, kommentar på MES-334 (för en
   icke-expert) och `markeraRedoAttTesta('MES-334', vad)` med exakt vad Jesper ska prova på telefonen: hela sida 5
   från tomt bord (lägg leken, första kortet, tap mot en sned lek, graveyard-frågan Yes/No/Permanent/Ignore,
   Picked up och glidningen, sleeves-färgen, en motståndares vy).

Systemprompten i `api/identify.js` rörs inte. Linear skrivs via `dev/linear-agent/klient.cjs` (text via fil).

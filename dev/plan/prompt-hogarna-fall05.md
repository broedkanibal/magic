# Prompt: MES-334, fall 05 med Claude och sedan ihopslagningen av sida 5

Sida 5 (steg 3–6 och tre rättelser) är byggd, granskad och grön i bänken och i lokal golden, på grenen
**`mes-334-sida5`** (6002cd0, pushad). Den stoppades av **ett säkert fel namn i golden 05 med Claude**, som
main inte ger. Läs först [`hogarna-resultat.md`](hogarna-resultat.md), avsnittet *Där det stannade*.

## Upplägget

En session, utan orkestrerare. Kör `paborjaIssue('MES-334')` först. Utredningen rör 0 fel namn, så ta
`mesa-bygg-tung` som agent, eller gör den själv på Fable 5.1. Följ *Mätbudgeten* i `dev/plan/orkestrering.md`.

## Steg

1. **Pröva misstanke 2 i koden först, utan golden.** Prövas helbildens namn (`tillampaHelbild`) mot lekens antal
   (`lekTak`/dubblettregeln)? I felkörningarna blir spår 1 säkert "Scourge of the Undercity" fast spår 6 redan är
   säkert Scourge ur remsan. JSON per körning finns i scratchpaden `efd1c35f-…/scratchpad/bisekt/` och `…/f05/`
   (`spar[].varfor`, `spar[].ai`, `helbild`). Mät sedan vad steg 3 ändrar mellan 208ca99 och ad4b5b2 som kan
   påverka helbilden i 05 (misstanke 1: tidpunkten).
2. **Rättelsen** på `mes-334-sida5`, med ett bänkfall i `dev/kamerabank.cjs` (helbilden ger inte ett andra
   säkert namn som leken bara har ett av, om det är orsaken).
3. **Fall 05 med Claude.** Claude svarar olika från gång till gång, så en enda ren körning bevisar ingenting:
   den felande koden gav fel i ~4 av 10 körningar.
   - **Rättelsen är en fast regel som bänken bevisar**, till exempel att helbildens svar aldrig kan ge ett andra
     säkert namn som leken bara har ett av: tre körningar räcker.
   - **Rättelsen ändrar bara sannolikheten**, till exempel tidpunkten: sex körningar på rättelsen och tre på main,
     om växlande. Är felet kvar är chansen bara ~5 % att sex körningar i rad blir rena. Main är kontrollen.
   
   Jespers ja till de extra `--ai`-körningarna gäller fall 05. Krav: 0 fel. Dessutom 18 med Claude en gång. Ändras helbildens väg på
   main också: bänken + golden lokalt en gång.
4. **En granskare** läser bara rättelsen (~30 min).
5. **Ihopslagningen:** `git merge-tree --write-tree origin/main mes-334-sida5` + `commit-tree`, en tillfällig
   worktree med symlänkar, `sh dev/kolla.sh`, `--ai` på 01–17 och 18 (två satser). Krav: 0 fel namn, inte färre
   rätt. Sedan `git merge --ff-only`, push, `diff <(curl -s https://magic-mauve-xi.vercel.app/) index.html`.
6. **Avslutet:** `hogarna-resultat.md` och en rad i `dev/golden/historik.md`. Ändra rubriken i
   `hogarna-telefonprov.md` ("är ute"). Kör `markeraRedoAttTesta('MES-334', …)` med provlistan därifrån.

## Samordning

- **Före rättelsen och före ihopslagningen:** `git fetch` och
  `git diff --stat 36ebf2a origin/main -- index.html dev/embed dev/golden`. Har main fått kod där sedan
  36ebf2a (t.ex. bildmodellen från MES-340): lägg om grenen och kör fall 05 och bänken igen innan något annat.
  MES-340 är ombedd att inte röra index.html, `dev/embed/embed.js` eller `dev/golden/kor.*` och att inte lägga
  in den tränade modellen i appen förrän sida 5 är ute, eller att fråga först.

- En annan session (MES-340, bildmodellen) kör tunga 4K-jobb. Skicka **"golden startar"** före varje golden och
  **"klart"** efter, via `ListAgents` + `SendMessage`.
- En pausad process syns fortfarande i `pgrep`: vänta på att lasten är under 6, inte på att processen försvinner.
- Den varma golden-profilen är `TMPDIR=/private/tmp/claude-501/-Users-jesperfunk-Code-magic/c4fe2060-3005-4715-b861-9d4cea5b2c6f/scratchpad/golden-tmp`,
  med `--port 8271` (pool 168).

**Fastnar det:** skriv läget i `hogarna-resultat.md` och lägg MES-334 i Todo.

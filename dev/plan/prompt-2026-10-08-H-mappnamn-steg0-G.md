# Prompt H, 2026-10-08: nya mappnamn, Parti 21/9 genom kameran med dagens telefon, och Prompt G

Klistra in i en ny session (Opus 5.5, xhigh).

> Gör prompt H enligt `dev/plan/prompt-2026-10-08-H-mappnamn-steg0-G.md` (står också i sin helhet nedan).

## Läs först

`CLAUDE.md`, `dev/measurements/MAP.md`, `dev/plan/prompt-2026-10-07-G-landhogar.md` och minnena
`flera-sessioner-samma-arbetstrad`, `worktree-saknar-env-local`, `orkestrering-lardomar-2026-09-25` och
`kontroller-som-ljuger`. Bygg i en **egen worktree på `origin/main`**, med `dev/material`, `.env.local` och
`node_modules` symlänkade. Rör inte huvudträdet utöver det som står i del 1.

## Del 0: vänta in Prompt F

Starta inget förrän alla tre gäller:

1. `ListAgents`: sessionen **"Prompt F golden material"** är idle eller borta. Har den varit idle mindre än 10 min, fråga
   den med `SendMessage` om den är klar med `dev/uppspelaren/` och `dev/golden/`, och vänta på svaret.
2. `ps`: ingen `dev/golden/kor.cjs`, `dev/kolla.sh`, `dev/spegelfacit/kor.cjs` eller `dev/uppspelaren/kor.cjs` körs.
3. Fråga **"Spegelmattan orkestrerare"** (`SendMessage`) om någon av dess agenter har ocommittat arbete i
   `dev/spegelfacit/` eller `dev/uppspelaren/`. Vänta på svar, eller 15 min utan svar.

Vänta med `Monitor` och en until-loop, eller `SendMessage` med `notify_when_idle`. Inga sleep-loopar.

## Del 1: gjord 2026-10-08

Huvudträdets opushade commits (`356969d`, `437d93d`, `d07371e`, `727ecad`, `7bf6800`, `9dc20dc`, `9a8e10b`,
`c68474d`) är pushade till origin (`2744ca4..0e2a345`) av sessionen "Claude skill från kartan". Krocken mellan `356969d`
och `041e8ee` löste git själv: baslinjen har `041e8ee`:s tal och id:t `parti-kedjan`, och
`node dev/uppspelaren/kor.cjs --jamfor` kördes efteråt. Kontrollera bara att `git log origin/main` har `0e2a345`.

## Del 2: nya mappnamn

Jespers beslut 2026-10-08: namnen i mätkartan ska vara namnen i koden, och namnen är på engelska (*Event test*, *Mat test*,
*Deck golden*, *Latency*, *Component tests*; skillen heter `/measurements`). Kartan och skillen är redan omdöpta.

| Nu | Blir |
|---|---|
| `dev/spegelfacit/` | `dev/eventtest/` |
| `dev/uppspelaren/` | `dev/mattest/` |

`dev/lekgolden/` byter **inte** namn, eftersom den nämns i `index.html` och `api/identify.js`. I kartan heter den
*Deck golden*.

1. `git mv` båda mapparna i **en** commit, så att git ser namnbyten och öppna grenar kan slås ihop.
2. Lägg en **symlänk** från varje gammalt namn till det nya (`dev/spegelfacit -> eventtest`,
   `dev/uppspelaren -> mattest`), committad, så att gamla kommandon, grenar och promptfiler fortsätter fungera.
   Skriv i LÄS-MIG att symlänken tas bort när inga öppna grenar använder det gamla namnet.
3. Rätta sökvägarna i allt som **körs eller används framåt**: skripten i båda mapparna (sökvägar, profilnamn i
   texter, `__dirname`-bygge), `dev/kolla.sh`, `dev/avstamning.cjs`, `dev/detektor/delning.json`,
   `dev/golden/SNABBGUIDE.md`, `dev/golden/inspelningar/LÄS-MIG.md`, båda LÄS-MIG, `dev/measurements/MAP.md`
   (tabellen *Namnen*: ta bort "blir …" i kolumnen Mapp när mapparna har flyttat; "Hette förut" behåller de gamla namnen),
   `.claude/agents/*.md`, `.claude/skills/*/SKILL.md`, `dev/plan/orkestrering.md`,
   och `dev/plan/prompt-2026-10-07-G-landhogar.md`. `dev/measurements/show.cjs` behöver inte röras, eftersom `MAPPAR` redan tar
   den första mapp som finns, nytt namn först. Hitta resten med
   `grep -rn "spegelfacit\|uppspelaren" --exclude-dir=node_modules --exclude-dir=material --exclude-dir=.claude/worktrees`.
4. **Rör inte** `index.html` och `api/`, där symlänken håller kommentarerna giltiga. Rör inte heller historik:
   raderna i `dev/golden/historik.md`, gamla `dev/plan/`-filer (handover, natt, resultat, gamla prompter) eller
   `dev/spegelfacit/resultat/*.md`.
5. Rätta minnena i `~/.claude/projects/-Users-jesperfunk-Code-magic/memory/` som nämner de gamla sökvägarna, men
   bara sökvägen, inte innehållet.
6. **Prova:** `sh dev/kolla.sh` ska bli helt grönt. `node dev/mattest/kor.cjs --jamfor` ska säga att inget är
   sämre. `node dev/uppspelaren/kor.cjs --fall g09` ska fungera genom symlänken. `node --check` på varje `.cjs` i
   `dev/eventtest/`. Golden behövs inte, eftersom ingen kamerakod ändras.
7. Låt en **fristående granskare** (Fable 5.1) läsa diffen före push: missade sökvägar, ändrad historik, och om något
   i `index.html` eller `api/` rördes. Gör samma granskning efter varje rättelse.
8. `git push origin HEAD:main`. Säg sedan till "Spegelmattan orkestrerare", "Claude skill från kartan" och sessionen
   "Sammanfattning av senaste mätningar" (`SendMessage`) att mapparna har nya namn.
9. Huvudträdet: lokala `main` ska hänga med origin. Där ligger ocommittade ändringar från en annan session
   (namnbytet `.claude/skills/laget` → `overview`, `CLAUDE.md`, agenterna m.fl.). De är inte dina: rör dem inte,
   stasha dem inte. Gör så här, i huvudträdet:
   - `git fetch origin` och `git rev-list --left-right --count main...origin/main`. Står det `0 N` (main ligger bara
     efter) och ingen fil i `git diff --name-only main origin/main` finns bland de ändrade filerna i `git status`:
     kör `git merge --ff-only origin/main`. Den flyttar main framåt och lämnar de andras ändringar orörda.
   - Ligger main också **före** origin, eller överlappar filerna: rör inget, och säg till Jesper vilka filer det gäller.

## Del 3: Prompt G:s steg 0, Parti 21/9 genom kameran med dagens telefon

Gör steg 0 i `dev/plan/prompt-2026-10-07-G-landhogar.md`, med de nya sökvägarna:
`node dev/eventtest/kor.cjs --pass 2026-09-21-mes-238-parti-4k15-20min --video kamera-180-540.mp4 --facit
dev/mattest/underlag/2026-09-21-handelser.tsv --fran 180` och sedan `node dev/mattest/frys-kedja.cjs`.
Kolla `ps` först: steg 0 får inte köras samtidigt med golden, `kolla.sh` eller en annan kedja.

Jämför den gamla och den nya loggen som prompt G säger: saknade kort, och de sju landfallen ett och ett. Den nya
loggen och baslinjen blir **en egen commit** med en tabell före och efter. Säg till "Spegelmattan orkestrerare" och
MES-345-sessionen innan push, eftersom det ändrar måttstocken. Skriv i prompt G:s fil att steg 0 är gjort (commit).

## Del 4: resten av Prompt G (MES-347)

Gör prompt G från steg 1, men bara om **MES-347 står i Todo**. Kör `kontrolleraInnanStart`, och `paborjaIssue` om
den är fri. Står den i Backlog eller någon annanstans: stanna och fråga Jesper. Allt som prompt G säger om worktree,
granskning, mätning och Linear gäller.

## Slut

Berätta för Jesper, i tabeller och kort:
- vad som pushades (commits)
- vad som sades till vilka sessioner
- Parti 21/9 före och efter
- MES-347:s läge

Tar sessionen slut innan MES-347 är klar: flytta tillbaka issuen till Todo med en kommentar om vad som är gjort och
vad som återstår, enligt CLAUDE.md.

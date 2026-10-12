# Prompt: MES-369 — kortet vid bildkanten

Klistra in i en ny session (Opus, high — det är telefonens kod och golden behövs).

---

Bygg MES-369 i Mesa: ett kort som redan ligger på mattan får inte försvinna till handen bara för att
kamerans ruta för det når bildens kant. Läs hela issuen MES-369 först (Linear-agentens klient:
`require('/Users/jesperfunk/Code/magic/dev/linear-agent/klient.cjs')`) — den har tidslinjen, den
troliga kedjan i koden och facit. Läs CLAUDE.md och `dev/plan/spegelmattan-principer.md`.

Kör `agent.kontrolleraInnanStart('MES-369')` och sedan `agent.paborjaIssue('MES-369')`. Bygg i en egen
worktree; symlänka `.env.local`, `dev/material`, `dev/diagnos`, `dev/videos`, `dev/bilder`,
`node_modules`, `dev/embed/modeller` och `dev/embed/cache` från `/Users/jesperfunk/Code/magic/`.

**Kort om problemet:** i Jespers parti 2026-10-11 (bordsloggen
`/Users/jesperfunk/Code/magic/dev/diagnos/pass-2026-10-11/pass-2026-10-11-2006.json`) växte rutan för
ett okänt kort (spår 28, mattan visade Expel) plötsligt uppåt förbi bildens överkant vid s 650,8. Spåret
gick från `okand` till `ny`, blev "avskuret" enligt MES-359-regeln (`avskuren(t)` i index.html),
försvann ur rapporten, och fasen stod i `'kant'` i 9 minuter. Datorn håller kortet högst 60 s
(`KANT_MAX`, `kantHaller` i `avstamBord`) eftersom telefonen inte säger var kantobjektet ligger.

**Gör i den här ordningen:**

1. **Del 1 — telefonen:** ta reda på varför spåret gick `okand → ny` och varför `helSedd` inte skyddade
   det. Ett spår som setts helt och legat stilla (med eller utan namn, också `okand`) ska stå kvar i
   rapporten när rutan plötsligt når kanten; MES-359-regeln gäller nya kort som kommer in över kanten.
   Prov i `dev/kamerabank.cjs` som faller på main och går efter: stilla kort vars ruta växer förbi
   kanten står kvar; ett nytt kort över kanten väntar fortfarande (MES-359:s prov håller).
2. **Del 2 — platsen:** telefonen skickar kantobjektets ruta (x/y/w/h, vilken kant) med `'kant'` eller
   det avskurna spåret med en flagga i rapporten. Datorn (`kantHaller`) håller just det kort vars
   senaste läge ligger där, utan tak så länge objektet ligger kvar; `KANT_MAX` bara när platsen saknas.
   Prov i `dev/avstamning.cjs`: kant på kortets plats i 9 min → kvar; kant någon annanstans + ett kort
   lyfts → till handen; KA1–KA4 håller. Loggen (`loggaBord`) ska bära kantens ruta.
3. **Prov:** riktade bänkar medan du bygger (sekunder). Sedan golden alla fall före och efter i samma
   varma profil, via kö-skriptet (aldrig en egen vänteloop):
   `TMPDIR=<varm profil> sh dev/golden/ko.sh <rot> <ut-mapp> <namn> <port>` — natten 2026-10-12
   användes `TMPDIR=/private/tmp/claude-501/-Users-jesperfunk-Code-magic/e4a618fc-60bc-45b1-87b5-f16275e99c14/scratchpad/tmp`
   och port 8293 (`lsof` först). Kör inga bänkar medan golden går. Sist `sh dev/kolla.sh` (har tak per
   steg). Uppspelningen: `node dev/eventtest/jamfor.cjs --logg <bordsloggen> --lek
   /Users/jesperfunk/Code/magic/dev/diagnos/natt-2026-10-12/lek-2026-10-11-antagen.txt` — den spelar
   upp telefonens rapporter, så del 1 syns i kamerabänken, inte där.
4. **Fristående granskning** (en agent som läser diffen krav för krav), högst två varv.
5. **Håller det** (0 säkra fel namn, inte fler falska, inte färre rätt namn, bänken grön): slå ihop,
   pusha till main, rad i `dev/golden/historik.md`, kommentar på MES-369 med före/efter i en tabell
   (för en icke-expert: vad före hur), och `agent.markeraRedoAttTesta('MES-369', …)` med vad Jesper ska
   prova: lägg ett kort nära bildens överkant och låt handen eller ärmen komma in över det — kortet ska
   stå kvar på mattan; ta upp ett annat kort under tiden — det ska gå till handen.
   Håller det inte: pusha grenen som gren, skriv varför på issuen, flytta tillbaka den till Todo.

**Regler:** ingen ny väg till Claude, ingen regel som kräver Claudes svar, systemprompten i
`api/identify.js` orörd. Match the camera och vinkelgränserna för tap (20°/55°) orörda. Städa
worktree och gren efter pushen. Varje väntan på något i bakgrunden ska ha ett tak.

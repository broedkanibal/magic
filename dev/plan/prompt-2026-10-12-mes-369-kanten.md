# Prompt: MES-369 — kortet vid bildkanten

Klistra in i en ny session (Opus, high — det är telefonens kod och golden behövs).

Ändrad 2026-10-12 efter Jespers beslut: telefonen tappar inte kortet, och datorn har ingen klocka. Den första
versionen (kantens ruta + `KANT_MAX` som reserv) gäller inte längre.

---

Bygg MES-369 i Mesa: ett kort som redan ligger på mattan får inte försvinna till handen bara för att
kamerans ruta för det når bildens kant. Läs hela issuen MES-369 först (Linear-agentens klient:
`require('/Users/jesperfunk/Code/magic/dev/linear-agent/klient.cjs')`) — den har tidslinjen, den
troliga kedjan i koden, facit och **Jespers beslut 2026-10-12** (avsnittet *Lösningen*). Läs CLAUDE.md och
`dev/plan/spegelmattan-principer.md` (principerna 9 och 10: ett kort lämnar bordet när platsen syns tom;
osäkert betyder orört).

Kör `agent.kontrolleraInnanStart('MES-369')` och sedan `agent.paborjaIssue('MES-369')`. Bygg i en egen
worktree; symlänka `.env.local`, `dev/material`, `dev/diagnos`, `dev/videos`, `dev/bilder`,
`node_modules`, `dev/embed/modeller` och `dev/embed/cache` från `/Users/jesperfunk/Code/magic/`.

**Kort om problemet:** i Jespers parti 2026-10-11 (bordsloggen
`/Users/jesperfunk/Code/magic/dev/diagnos/pass-2026-10-11/pass-2026-10-11-2006.json`) växte rutan för
ett okänt kort (spår 28, mattan visade Expel) plötsligt uppåt förbi bildens överkant vid s 650,8. Spåret
gick från `okand` till `ny`, blev "avskuret" enligt MES-359-regeln (`avskuren(t)` i index.html),
filtrerades ur rapporten (`cb.bord(spar.filter(t => !avskuren(t)) …)`), och fasen stod i `'kant'` i 9
minuter. Datorn höll kortet i 60 s (`KANT_MAX`, `kantHaller` i `avstamBord`) och flyttade det sedan till
handen — utan att spelaren gjort något. Det är det som ska bort: **inget kort flyttas av en klocka.**

**Lösningen (Jespers beslut):** telefonen slutar aldrig rapportera ett kort som redan ligger på mattan.
Når dess ruta kanten skickas det kvar i rapporten med en flagga (`avskuren: true`). Datorn ser då att
kortet finns kvar och behöver inte gissa. Kortet går till handen bara när spåret faktiskt dör, enligt
samma regler som vid varje annat lyft.

**Gör i den här ordningen:**

1. **Del 1 — telefonen tappar inte kortet:**
   - Ta reda på varför spår 28 gick `okand → ny` och varför `helSedd` inte skyddade det (troligen nollades
     spåret när det gick till `ny`). Rätta det: ett spår som setts helt och legat stilla (namn eller ej,
     `okand` medräknat) ska inte räknas som ett nytt kort när rutan plötsligt växer mot kanten.
   - Ett spår som **redan stått i bordsrapporten** och sedan blir avskuret skickas kvar i `cb.bord` med
     `avskuren: true`. Ett spår som aldrig rapporterats (ett nytt kort som kommer in över kanten) filtreras
     som i dag — MES-359 gäller oförändrat för nya kort, också läsningen (`identifiera`, spek) som väntar
     tills kortet syns helt.
   - Prov i `dev/kamerabank.cjs` som faller på main och går efter: ett stilla kort (med namn, utan namn och
     `okand`) vars ruta en stund växer förbi kanten står kvar i rapporten (med flaggan medan rutan är vid
     kanten); ett nytt kort över kanten står inte i rapporten förrän det syns helt (MES-359:s prov håller).

2. **Del 2 — datorn, ingen klocka:**
   - En rad i rapporten med `avskuren: true` betyder att kortet ligger kvar: det är levande (inte borta,
     inte till handen), och dess ruta används inte till att flytta, vrida, byta namn eller skapa ett nytt
     kort (osäkert = orört). Dör spåret går kortet vidare enligt de vanliga reglerna (handzonen, tom plats).
   - Ta bort `KANT_MAX` och kantens timer (`frister.push(kantSedan + KANT_MAX)`). `kantHaller` blir bara
     reserven för en telefon som kör en äldre version utan flaggan: den håller som i dag bara kortet vars
     spår dog strax innan kanten började, men utan tak — så länge fasen är `'kant'`. När fasen slutar gäller
     de vanliga reglerna.
   - `loggaBord` ska bära flaggan, så att uppspelningen och nästa felsökning ser den.
   - Prov i `dev/avstamning.cjs`: avskuret spår i 9 min → kortet kvar, orört; avskuret spår som sedan dör
     och platsen syns tom → till handen; ett annat kort lyfts medan ett avskuret spår ligger kvar → det
     kortet till handen; `'kant'` utan flagga (äldre telefon) i 9 min → kortet kvar, ingen flytt efter
     60 s. KA1, KA2 och KA4 håller; KA3:s del om taket skrivs om till att kortet ligger kvar (den andra
     delen — ett kort som lyfts medan kanten står går till handen — håller).

3. **Prov:** riktade bänkar medan du bygger (sekunder). Sedan golden alla fall före och efter i samma
   varma profil, via kö-skriptet (aldrig en egen vänteloop):
   `TMPDIR=<varm profil> sh dev/golden/ko.sh <rot> <ut-mapp> <namn> <port>` — natten 2026-10-12
   användes `TMPDIR=/private/tmp/claude-501/-Users-jesperfunk-Code-magic/e4a618fc-60bc-45b1-87b5-f16275e99c14/scratchpad/tmp`
   och port 8293 (`lsof` först). Kör inga bänkar medan golden går. Sist `sh dev/kolla.sh` (har tak per
   steg). Uppspelningen: `node dev/eventtest/jamfor.cjs --logg <bordsloggen> --lek
   /Users/jesperfunk/Code/magic/dev/diagnos/natt-2026-10-12/lek-2026-10-11-antagen.txt` — den spelar
   upp telefonens gamla rapporter (utan flagga), så där ska Expel nu ligga kvar genom reserven (inte gå
   till handen vid s 715). Del 1 syns i kamerabänken, inte där.

4. **Fristående granskning** (en agent som läser diffen krav för krav), högst två varv.

5. **Håller det** (0 säkra fel namn, inte fler falska, inte färre rätt namn, bänken grön): slå ihop,
   pusha till main, rad i `dev/golden/historik.md`, kommentar på MES-369 med före/efter i en tabell
   (för en icke-expert: vad före hur), och `agent.markeraRedoAttTesta('MES-369', …)` med vad Jesper ska
   prova: lägg ett kort nära bildens överkant och låt handen eller ärmen komma in över det en stund (gärna
   mer än en minut) — kortet ska stå kvar på mattan; ta upp ett annat kort under tiden — det ska gå till
   handen; ta sedan upp kortet vid kanten — det ska gå till handen.
   Håller det inte: pusha grenen som gren, skriv varför på issuen, flytta tillbaka den till Todo.

**Regler:** ingen ny väg till Claude, ingen regel som kräver Claudes svar, systemprompten i
`api/identify.js` orörd. Match the camera och vinkelgränserna för tap (20°/55°) orörda. Städa
worktree och gren efter pushen. Varje väntan på något i bakgrunden ska ha ett tak.

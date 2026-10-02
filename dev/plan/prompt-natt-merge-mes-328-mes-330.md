# Prompt: nattens grenar in, MES-328 avgjord, MES-330 byggd — i en session

**Modell och effort:** Fable 5.1 (`claude-fable-5-1`), effort **xhigh**. Huvudarbetsträdet
`/Users/jesperfunk/Code/magic`. Räkna med en lång session: del A ~1 h, del C flera timmar
med golden. Kopiera allt under strecket.

---

Tre delar i ordning, allt autonomt: (A) slå ihop nattens tre grenar med migrationerna i rätt
ordning och driftsätt, (B) avgör MES-328 enligt Jespers beslut, (C) bygg MES-330 enligt
`dev/plan/prompt-namn-ur-remsan.md`. Jesper har redan sagt ja till allt nedan: pusha och
driftsätt utan att fråga, men mät och kontrollera varje steg. Det som ändå kräver honom står
sist under *Stanna och fråga*.

LÄS FÖRST
- CLAUDE.md (Linear-reglerna, systemprompten rörs inte), minnena
  `flera-sessioner-samma-arbetstrad`, `linear-status-vid-arbetsstart`, `kontroller-som-ljuger`.
- `dev/plan/handover-2026-10-02-mes-305.md`, `-mes-316.md`, `-mes-328.md` — i sin helhet.
  De säger exakt vad varje gren innehåller, vad som är oklart och i vilken ordning
  migration och merge ska ske.
- Issuerna MES-305, MES-316, MES-328 i Linear (beskrivning + nattens kommentarer).
- Kontrollera med `git status`, `git log origin/main..HEAD`, `git worktree list` och
  `ListAgents` att ingen annan session skriver i index.html eller i grenarna.

DEL A — nattens grenar in, en i taget, i den här ordningen
Grenarna: `mes-305-dold-information` (worktree `.claude/worktrees/wf_bccb9343-ae9-2`),
`mes-316-identify-inloggning-tak` (`…-1`), `mes-328-remsans-namn` (`…-3`). Ingen är
pushad eller ihopslagen. För var och en: `git merge-tree --write-tree origin/main <gren>`
först; krockar något, lös det på grenen och säg vad det var.

1. **MES-305 (dold information).** Kör migrationen
   `supabase/migrations/20261002000000_mes305_dold_information.sql` mot produktionens
   Supabase-projekt (MCP `apply_migration`; kolla `list_migrations` före och efter). Sedan
   merge till main, push, och kontrollera produktionen
   (`diff <(curl -s https://magic-mauve-xi.vercel.app/) index.html`). Prova det
   överlämningen kallar *Nästa steg 2* (den privata kanalen `kam:<user_id>` med ett inloggat
   konto, lokalt mot `vercel dev`/attrappen) så långt det går utan telefon; säg vad som är
   provat och vad som inte är det. Flytta inte issuen: den står i Redo att testas för
   Jespers prov på riktigt.
2. **MES-316 (inloggning + tak).** Rätta först granskarens kvarvarande medel-fynd på
   grenen (överlämningen, *Osäkert läge*): går JWKS inte att hämta och cachen är tom ska
   vakten svara 503 `inloggning-nere` (tillfälligt), inte 401, och ingen 30-sekundersspärr
   medan cachen är tom; nytt fall i `dev/identify-vakt.cjs`. Kör `node dev/identify-vakt.cjs`
   (35 OK före) och `sh dev/kolla.sh` (626 OK). Kör migrationen
   `supabase/migrations/20261002100000_claude_fragor.sql`. Kontrollera Vercel-variablerna i
   Production (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; sätt
   `SUPABASE_JWT_SECRET` bara om värdet går att läsa säkert — annars säg att reservvägen
   via `/auth/v1/user` gäller). Merge, push, produktionskontroll, och
   `curl -s -X POST https://magic-mauve-xi.vercel.app/api/identify` ska ge 401
   `{kod: inloggning}`. Golden `--ai --fall 01,03` (port 8239, attrappen går utanför
   inloggningen) ska ge samma namn som baslinjen. Issuen står kvar i Redo att testas.
3. **MES-328 (remsans namn).** Gör överlämningens *Nästa steg 1* (texträttelserna i
   `dev/remsa/RESULTAT.md`, `tabell.py --kontrollera` före och efter) på grenen, merge
   (bara `dev/remsa/*` ändras), push. Mätdata (3,9 MB resultat-JSON) får ligga i repot som
   de är committade — säg det i chatten som ett beslut Jesper kan ändra.

Efter varje merge: `git log origin/main..HEAD` ska vara tomt och produktionen ska visa
koden. Lämna aldrig ocommittat i huvudträdet. Worktrees och grenar får stå kvar.

DEL B — MES-328 avgjord
Jespers beslut: **riktningen håller — geometri → tröskel → blänkmätning, före träning.**
Skriv en kommentar på MES-328 (via `dev/linear-agent/klient.cjs`, text via fil): beslutet,
att grenen är ihopslagen, att remsan i appen byggs i MES-330, att träning (steg 3–4)
återöppnas bara om blänkprovet fäller antagandet, och att blänkinspelningen (samma bord som
MES-246, telefonens egen exponering, en gång utan fickor) fortfarande är Jespers att göra.
Flytta MES-328 till Done (NO-GO för träning nu) med `uppdateraIssue` och lagets
completed-status. Uppdatera minnet `mes-328-remsans-namn`.

DEL C — MES-330
Läs `dev/plan/prompt-namn-ur-remsan.md` och gör allt under dess streck, i den ordning det
står, med dess mål, regler och mätningar. Nattens grenar är nu ihopslagna, så avsnittet
*Nattens arbete* där gäller som "redan inne"; MES-328:s riktning är ja. Kör
`agent.paborjaIssue` på MES-330 när del C börjar (den står i Triage, det är Jespers
beslut att den ska göras nu).

STANNA OCH FRÅGA — bara här
- En migration som inte går att köra, eller som Supabase-projektet redan har i annan form.
- En konflikt i index.html mellan två grenar som inte går att lösa utan att välja bort
  något.
- Vercel-variabler som saknas och vars värden du inte kan läsa.
- Golden `--ai --fall 01,03` som blir sämre efter MES-316.
- Allt som `prompt-namn-ur-remsan.md` listar under sina egna regler.
Tar sessionen slut mitt i: kommentera läget på issuen du har i In Progress och flytta
den till Todo; de andra står kvar i sina kolumner.

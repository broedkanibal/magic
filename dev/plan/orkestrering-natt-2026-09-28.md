# Nattpasset 2026-09-28: orkestreraren för lekfotot

Du är orkestrerare för Mesa. Följ `dev/plan/orkestrering.md` (reglerna, hur en gren slås ihop, hur du håller din egen kontext liten) och `CLAUDE.md`. Jesper sover. Arbeta så att han på morgonen har **färdiga, ihopslagna och pushade** issues, inte många halvfärdiga.

**Uppdraget:** bygg lekfotot efter designen på **sida M** i designytan "Mesa Deck Photo Flow E", https://claude.ai/artifact/ByMF4eC4Gwtt4AWU2uucDx. Parent-issuen är **MES-320**, delarna MES-321–324. Jesper godkände sidan som byggunderlag 2026-09-27.

**Rätt före mycket.** Hellre en våg helt klar, granskad och pushad än två halvt. Är du osäker på om något håller: slå inte ihop, skriv varför.

Du körs med `/loop` och väcks om och om igen med den här filen. **Varje gång du vaknar:** läs `dev/plan/natt-2026-09-28-logg.md` (skapa den första gången) för att se var du är, och fortsätt därifrån. Skriv en rad i loggen efter varje steg: tid (`date`), vad, resultat.

## Innan första vågen

1. Kolla att MES-321–324 ligger i **Todo**. Agenter plockar bara ur Todo. Ligger en kvar i Triage: bygg den inte, skriv det i loggen och i morgonrapporten, och fortsätt med de andra (en våg vars issue saknas hoppas över, och vågor som beror på den också).
2. `ListAgents` och `git log origin/main -5`: kör en annan session i lekens sida eller telefonvyn i `index.html`? Skicka ett meddelande innan du rör deras område.
3. `sh dev/kolla.sh` på `origin/main`: grönt utgångsläge. Är det rött före natten: skriv det, och stanna.

## Tillåtet utan att fråga (Jesper 2026-09-27: "kör vidare autonomt till allt är committat och pushas")

- Slå ihop med main och pusha när **alla grindar** nedan är gröna. Main driftsätts till produktion vid push.
- Lekfotots golden med riktig Claude: högst tre körningar utan cache per issue (~1,40 USD per körning).
- Linear: `paborjaIssue` när en agent börjar; **Done** när arbetet är på main och inget återstår att prova på telefon; `markeraRedoAttTesta(issueId, vad)` när det är på main men Jesper ska prova på riktig telefon; tillbaka till **Todo** med en kommentar om vad som finns kvar och vilken gren, om det inte blir klart i natt.

## Grindarna, före varje sammanslagning

1. `git diff --stat origin/main` och `git branch -r --contains <gren>` (är arbetet redan ute?).
2. `sh dev/kolla.sh` grön.
3. `node dev/lekgolden/kor.cjs` före (på `origin/main`) och efter (på grenen), samma dator: **0 fel namn** rakt in i leken, inget set med färre rätt kort, inget set med fler kort än facit. Läs `dev/lekgolden/SNABBGUIDE.md`.
4. Rör diffen kamerans kod i spel (`kamIdentifiera`, `detektera`, avstämningen): då också kameragolden enligt `dev/plan/orkestrering.md`. Lekfotot ska inte behöva det.
5. **En fristående granskare** (en ny agent, inte byggaren) läser diffen mot issuen och sida M och letar fel: kort som räknas dubbelt eller försvinner, Undo som inte återställer, copy som inte stämmer med sida M. Fynden skickas tillbaka till samma byggagent med `SendMessage`. Granskningen hittade nya fel i två av två fall 2026-09-25.

## Stanna bara för det som verkligen är Jespers

- **Systemprompten i `api/identify.js`**: rörs aldrig. Föreslå och stanna på den issuen.
- Ett **designval som sida M inte svarar på**: välj det som ligger närmast sida M:s mönster, skriv valet i commit-meddelandet och på issuen, och gå vidare. Bara om det inte går att bygga utan hans val: `markeraBehoverJesper(issueId, varfor)` (kolumnen Behöver dig) och nästa issue.
- Ett konto eller en kostnad utöver lekfotots golden.
- En ändring som inte går att få till 0 fel namn.

**Vänta aldrig på ett svar.** Skriv det i morgonrapporten och gå vidare.

## Vågorna

Högst **två agenter åt gången**, i egna worktrees. Nästa våg startar först när den förra är ihopslagen eller avskriven. Slå ihop **en gren i taget**.

| Våg | Issue | Agent | Sida M | Kodområde i `index.html` |
|---|---|---|---|---|
| 1 | **MES-321** telefonen | `mesa-bygg` | rad 2, 3A, 3C, 3D, I10 | telefonvyn (`telfoto*`, `#vyLekfoto`) |
| 1 | **MES-322** datorn medan man fotar | `mesa-bygg` | rad 1, 4, N6, J9, J10 | lekens sida (`ritaPanel`, `ritaTel`, `telRita`, `ritaYta`) |
| 2 | **MES-323** slutet | `mesa-bygg` | rad 5, 6 | lekens sida (panelen efter Finish, Check names) + uppstartens klar-knapp |
| 3 | **MES-324** samma kort i två foton | `mesa-bygg-tung` | rad 3B, LR1 | läsningen i `telfotoLas` + Check names |

**Våg 1, samordningen:** båda läser resultatet av ett foto. MES-321 äger formatet på lekkanalen. Be MES-321:s agent skriva formatet (fälten per foto och per kort) i sin första rapport, och skicka det vidare till MES-322:s agent. Slå ihop MES-321 först.

## Varje byggagent får

- Issuen (läs den och kommentarerna i Linear), `CLAUDE.md`, och sida M: läs artboardsen med Artifact-verktyget (`action: read`, `url` ovan, `path: project/M-<kod>.dc.html`; `project/canvas.json` visar vilken rad varje artboard står på). De grå lapparna på sidan är en del av underlaget.
- I en ny worktree: symlänka `.env.local` och `dev/material` från huvudträdet, annars får lekfotots golden "0 namn".
- Rapport på högst 20 rader: vad som byggts, grindarnas siffror före och efter, vad som inte gick att prova utan telefon.

## Häng dig inte

- Agenterna körs i bakgrunden. Starta dem och vänta på notisen. Innan du väntar: `ScheduleWakeup` 1200–1800 s som reserv.
- **Tidstak per agent: 3 timmar.** Har den inte levererat: stoppa den, skriv vad som finns på grenen, issuen tillbaka till Todo, gå vidare.
- **Lekfotots golden:** en körning åt gången på datorn (`pgrep -f lekgolden`), en minuts lucka mellan två körningar. Tidstak 30 min; över: döda, kör om en gång, sedan "ej mätt" och gå vidare.
- **Samma fel två gånger** (samma test fäller, samma merge krockar): sluta försöka, skriv upp det, gå vidare.
- **Din kontext:** låt agenterna läsa filer och köra mätningar. Läs inte loggar själv. Blir sessionen tung: skriv loggen så att nästa väckning kan fortsätta.

## När allt är gjort, eller passet tar slut

Skriv `dev/plan/natt-2026-09-28-resultat.md` för en icke-expert: rubriker och tabeller, vad före hur.

| Avsnitt | Innehåll |
|---|---|
| Kort sagt | vad som är ute i produktionen, vad som stannade och varför |
| Per issue | commit, grindarnas siffror före → efter, kolumn i Linear |
| Att prova på telefonen | exakt vad Jesper ska göra, i vilken ordning, per issue |
| Val du gjorde själv | designval som sida M inte svarade på, och varför |

Committa rapporten och loggen, pusha, och verifiera med `/driftkoll`-kommandona att produktionen är identisk med main. Kommentera MES-320 med en sammanfattning och länk till rapporten. Avsluta loopen (`ScheduleWakeup` med `stop: true`).

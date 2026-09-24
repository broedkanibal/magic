# Nattpasset 2026-09-25: orkestreraren

Du är orkestrerare för Mesa. Följ `dev/plan/orkestrering.md` (reglerna, grindarna, hur en gren slås ihop, hur du håller din egen kontext liten) och `CLAUDE.md`. Jesper sover. Arbeta så att han på morgonen har **färdiga, ihopslagna och mätta** issues, inte många halvfärdiga.

**Rätt före mycket (Jesper 2026-09-25).** Passet körs på **max** effort. Det
är viktigare att det som slås ihop är rätt än att alla vågor hinns med.
Vågorna 3 och 4 är en bonus, inte ett mål. Hellre en våg helt klar, mätt och
förklarad än två halvt. Är du osäker på om en mätning håller: mät en gång
till, eller låt bli att slå ihop och skriv varför. Genvägar som sparar tid på
bekostnad av mätningen (hoppa över `--ljus alla` eller `--utan-leken` där
issuen kräver dem, eller slå ihop på en körning som hängde) är inte tillåtna.

Max förbrukar mer, och passet kan nå användningsgränsen. Därför ska loggen
alltid vara aktuell: nästa väckning, eller en ny session i morgon, ska kunna
fortsätta exakt där det stannade.

Du körs med `/loop` och väcks om och om igen med den här filen. **Varje gång du vaknar:** läs `dev/plan/natt-2026-09-25-logg.md` (skapa den första gången) för att se var du är, och fortsätt därifrån. Skriv en rad i loggen efter varje steg: tid, vad, resultat.

## Tillåtet utan att fråga

- Committa och pusha till main när grindarna är gröna (godkänt 2026-09-20: bänken grön, golden inte sämre, alltså 0 fel namn, inte fler falska och inte färre rätt namn).
- Golden med Claude (`--ai`): högst tre körningar per issue.
- Flytta issues i Linear: `paborjaIssue` när en agent startar, Done när arbetet är på main, tillbaka till Todo med en kommentar om vad som återstår om det inte blir klart i natt.

## Stanna bara för det som verkligen är Jespers beslut

Allt annat bestämmer du själv enligt reglerna. Välj det försiktigaste alternativet som håller grindarna, skriv varför i commit-meddelandet och i Linear, och gå vidare.

Jespers beslut är bara:
- systemprompten i `api/identify.js`
- något som kräver telefonen, en inspelning eller hans uppställning
- ett designval
- ett konto eller en kostnad (t.ex. GPU i MES-288 steg 2)
- en ändring som inte går att få till 0 fel namn

Då: `agent.markeraBehoverJesper(issueId, varfor)`, flytta issuen till Provas, skriv det i morgonrapporten och **gå vidare med nästa issue**. Vänta aldrig på ett svar.

## Häng dig inte

- **Agenterna körs i bakgrunden.** Starta dem och vänta på notisen, inte med sleep. Innan du lägger dig för att vänta: schemalägg en väckning (`ScheduleWakeup`, 1200–1800 s) som reserv.
- **Tidstak per agent: 3 timmar.** Har en agent inte levererat då: stoppa den, skriv i loggen och i Linear vad som finns på grenen, flytta issuen till Todo och gå vidare.
- **Golden:** kör en syntaxkoll av `index.html` först (ett syntaxfel hänger `kor.cjs` i 20 min). Kolla `pgrep -f kor.cjs` före start, använd en egen port och kör i bakgrunden. Tidstak: 30 min för en vanlig körning, 45 min för `--ljus alla`. Över taket: döda processen, kör om en gång, och markera sedan issuen som ej mätt och gå vidare. En körning som "svarar ingenting" är hängd, inte långsam (MES-270).
- **Samma fel två gånger** (samma test fäller, samma merge krockar): sluta försöka, skriv upp det och gå vidare.
- **Din kontext:** låt agenterna läsa filer och köra mätningar och ta bara emot deras slutsatser. Blir sessionen tung: skriv loggen, så att nästa väckning kan fortsätta därifrån.

## Ordningen

Högst **två agenter åt gången**, i egna worktrees. Nästa våg startar först när den förra är ihopslagen.

**Steg 0 (först, ensamt): Jespers ritade facit.** Facit för golden 03, 04, 05, 06, 13, 14 och 15 ligger ocommittat i arbetsträdet (rita-kontroll: 0 avvikelser i 7 källor; `ruta.upp` = h för 03, 05 och 06; library och `bib` i 13).
1. `mesa-matning` kör golden **före** på HEAD:s facit, i en egen worktree, och **efter** med det ritade facit, på samma port och profil.
2. Committa facit, den nya baslinjen och en rad i `dev/golden/historik.md` i en egen commit, och pusha.
3. Totalen ska ändras: fler synliga kort, och tap och plats mäts nu i de ritade fallen. Förklara skillnaden per fall.
4. Kommentera MES-286: fotona är klara, videorna återstår.

**Vågorna:**

| Våg | Agent 1 | Agent 2 |
|---|---|---|
| 1 | MES-232 lärda foton (`mesa-bygg-tung`) | MES-293 tydlig tap och fryst skala (`mesa-bygg`) |
| 2 | MES-291 nedtoningen (`mesa-bygg`) | MES-289 lekfotot (`mesa-bygg`) |
| 3 | MES-294 regel 1 (`mesa-bygg`) | MES-287 räta ut i stället för ORB (`mesa-bygg-tung`) |
| 4 | MES-295 vinkeln per plats (`mesa-bygg`) | MES-288 steg 0, färdiga detektorer mot det ritade facit (`mesa-bygg-tung`) |

MES-291, 293, 294 och 295 rör alla `avstamBord`: aldrig två av dem samtidigt.

Varje issue beskriver sin mätning i Linear. Läs den innan agenten startas och ge agenten den.

**Före varje sammanslagning:** kör `git fetch`, `git log` och `ListAgents`. Andra sessioner committar till main; i går kväll krockade två sessioner i `dev/golden/rita.html`. Har main flyttat sig: rebasa och mät om innan du slår ihop.

## Morgonrapporten

Skriv den löpande i `dev/plan/natt-2026-09-25-resultat.md`, och committa och pusha den efter varje våg. Innehåll:
- Klart och ihopslaget: issue, commit och siffrorna före och efter.
- Inte klart: var det stannade, och vilken gren som finns.
- Väntar på Jesper: exakt vad som behövs, och vilken issue.
- Ändringar i golden-baslinjen, och varför.

Läget ska också synas i Linear, utan att Jesper behöver läsa chatten.

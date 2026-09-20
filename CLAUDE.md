# Mesa — instruktioner för Claude

## Systemprompten ändras bara på uttrycklig begäran

Systemprompten — instruktionerna som skickas till Claude i `api/identify.js`,
alltså texten under `system:` och instruktionerna i frågan, till exempel under
`mode === 'kamera'` — ändras **bara** när Jesper uttryckligen ber om en ändring
i systemprompten. Inte som en del av en annan fix, inte som en förbättring på
vägen, och inte för att ett golden-fall blev bättre av det.

**Varför:** varje ändring i systemprompten ska kunna spåras mot en AI-eval, så
att det syns om just den ändringen gav en regression.

Ser en ändring i systemprompten ut att behövas: föreslå den och fråga.

När en ändring är beställd:

1. Kör `node dev/golden/kor.cjs --ai` före ändringen, med samma modell.
2. Ändra bara systemprompten i den commiten, och höj `PANE_PROMPT_V` i
   `api/identify.js`.
3. Kör samma kommando efter. Raden `metod:` visar `systemprompt vNN`, och
   `OBS:` säger att baslinjen gjordes med en annan version.
4. Skriv resultatet i `dev/golden/historik.md` och spara baslinjen
   (`--ai --spara`) först när ändringen ska behållas.

Hur golden setet och AI-evalen körs: `dev/golden/SNABBGUIDE.md`.

## Linear: skriv som "Claude AI agent", inte som Jesper

Skapar, ändrar eller tar bort du (Claude Code) en Linear-issue, eller lägger
en kommentar, på eget initiativ — inte för att Jesper bad om just den
skrivningen i chatten — använd `dev/linear-agent/klient.cjs` i stället för
den vanliga Linear-MCP-kopplingen. MCP-kopplingen autentiserar som Jespers
eget konto, så allt den skriver syns som honom. Se
`dev/linear-agent/SNABBGUIDE.md`. Kräver att `node
dev/linear-agent/installera.cjs` körts en gång (görs av Jesper).

**Börjar du faktiskt jobba på en issue** (inte bara skapar den) — kör
`agent.paborjaIssue(issueId)` direkt. Den flyttar issuen till lagets
"started"-status (In Progress), sätter agenten som delegate och Jesper som
assignee, i ett anrop. En issue som Claude Code jobbar på ska aldrig stå kvar
i Backlog eller Todo.

### Saknas issuen, skapa den automatiskt

Ber Jesper om något i chatten som inte redan finns som en Linear-issue —
skapa automatiskt en eller flera relevanta issues kopplade till det du ska
jobba med, utan att fråga om lov först. Sök igenom laget om du är osäker på
om det redan finns en matchande issue innan du skapar en ny. Följer du direkt
upp med arbetet: kör `paborjaIssue` på den (kolumn In Progress, se ovan och
kollen i nästa avsnitt). Etikett och projekt sätts enligt reglerna nedan.

Berätta alltid i chatten vilka issues du skapat — id, titel och länk — så
att Jesper ser dem utan att behöva leta i Linear.

### Innan en issue plockas upp ur Todo

Dubbelkolla två saker **innan** `paborjaIssue` körs:

1. **Är den blockad?** Kör `agent.kontrolleraInnanStart(issueId)` och läs
   `blockerare` — issues som enligt Linears relationer blockerar den här och
   inte är klara. Läs också issuens beskrivning och kommentarer: ett beroende
   kan stå i text utan att vara en relation ("kräver att X finns", "väntar på
   Jesper", ett konto eller en nyckel som saknas).
2. **Krockar den med något som byggs just nu?** Samma anrop ger `pagaende`
   — lagets övriga issues i In Progress. Rör de samma filer, samma vy eller
   samma del av kedjan som den här? Kolla också `git status` och `git log`
   efter främmande, ocommittade ändringar: en annan Claude-session kan jobba
   i samma arbetsträd.

**Blockad** → flytta den till kolumnen **Blocked** med
`agent.blockeraIssue(issueId, orsak, { blockeradAv: ['MES-NN'] })`. Den
kommenterar vad issuen är blockad av (`orsak` — skriv konkret vad som
måste hända först) och lägger in relationen när blockeraren är en issue.
Börja inte på den; säg till Jesper i chatten.

**Krock** → börja inte. Säg vilken issue det krockar med och varför, och
fråga Jesper om ordningen. En krock är inte en blockering — issuen stannar i
Todo.

Blockeringen släpper när blockeraren är klar: flytta då tillbaka issuen till
Todo innan den plockas upp, och gör kollen igen.

### Behöver issuen Jesper: etiketten "Needs Jesper"

Kan en issue inte gå vidare utan något bara Jesper kan göra — ett prov på
telefonen, en inspelning, ett designval, ett konto — kör
`agent.markeraBehoverJesper(issueId, varfor)`. Den lägger etiketten
**Needs Jesper** och en kommentar som säger konkret vad som behövs. Sedan
stannar arbetet på den issuen; gå vidare med något annat. När Jesper gjort
sitt: `agent.slappBehoverJesper(issueId)` innan arbetet tas upp igen.

Etiketten är hur Jesper ser i Linear var han är flaskhalsen, utan att läsa
chatten. Lägg den aldrig på för ett beslut du kan ta själv enligt
reglerna här.

### Agenterna i `.claude/agents/`

`mesa-matning` (Sonnet, mäter utan kod), `mesa-bygg` (Opus, vanligt bygge)
och `mesa-bygg-tung` (Fable, detektorn, läsningen, spärren mot fel namn,
samtidighet). Effort ärvs från sessionen som startar dem — kör
orkestrerande sessioner på xhigh eller ultracode. Agenterna slår aldrig
ihop med main och pushar aldrig; det gör orkestreraren efter bänk och
golden. Planen för orkestreringen: `dev/plan/orkestrering.md`.

### Etikett och kolumn när en issue skapas

Gäller varje issue Claude Code skapar, via agent-klienten eller MCP-kopplingen.

**Etikett — alltid en typ-etikett som matchar innehållet:**

| Etikett | När |
|---|---|
| `Bug` | något som ska fungera men inte gör det |
| `Feature` | ny förmåga eller ny vy som inte fanns |
| `Improvement` | något som redan finns blir bättre (UX, prestanda, träffsäkerhet) |
| `Research` | utreda, mäta eller prova innan något byggs |
| `Administrative` | inte kod: konton, tjänster, dokumentation, processer |

`Bug`, `Feature` och `Improvement` ligger i gruppen Development — välj en av
dem, inte flera. `Release`-etiketterna (`Alpha`, `Enhanced Alpha`,
`Open Beta`) sätts bara när Jesper sagt vilken release det gäller, eller när
issuen hör till ett projekt som redan har en; gissa inte. Passar ingen
etikett: fråga hellre än att skapa en ny.

**Kolumn — var issuen hamnar:**

| Situation | Status |
|---|---|
| Jesper säger i chatten att något ska göras | **Todo** |
| Claude Code påbörjar arbetet direkt | **In Progress** (`paborjaIssue`) |
| Claude Code noterar något på eget initiativ, som ingen bett om | Backlog |

### In Progress betyder en sak: en session kör den nu

Det här är regeln som gör kolumnerna sanna. **In Progress = en levande
session har issuen just nu.** Inget annat.

Tar sessionen slut utan att issuen är klar — **flytta tillbaka den till
Todo** och kommentera vad som gjorts och vad som återstår. Ligger det en
gren kvar: skriv vilken, och att den inte är ihopslagen. En issue som står
i In Progress utan session är osynligt övergiven, och det var precis det
som gjorde kolumnen oläsbar (38 issues, 22 av dem orörda i flera dagar,
mätt 2026-09-20).

De andra kolumnerna finns för att In Progress ska slippa betyda dem:

| Kolumn | Betyder | Vem släpper den vidare |
|---|---|---|
| **Provas** | koden är på **main**, men det sista provet återstår — riktig telefon, ett riktigt spel, eller ett designval | Jesper |
| **Blocked** | väntar på en annan issue; ingen ska plocka upp den | den som stänger blockeraren |
| **Todo** | i kön, ingen session | vem som helst |

`blockeraIssue(issueId, orsak, { blockeradAv })` flyttar till **Blocked**.
Är det Jesper som behövs — inte en annan issue — hör den till **Provas**
plus etiketten `Needs Jesper`.

**Priority är köordningen, inte hur viktigt något känns:**

| Priority | Betyder |
|---|---|
| **High** | näst på tur — plockas när något blir ledigt |
| **Medium** | i kön, men senare |
| Low / ingen | inte bedömd |

Ordningen kommer ur `dev/plan/orkestrering.md`. Den filen är **regelboken**
— kodområden, vad som inte får köras parallellt, hur en gren slås ihop —
inte en egen kö. Två köer som inte stämmer överens är värre än ingen.

**Projekt — fyra, och de tar slut:**

| Projekt | Klart när |
|---|---|
| **Spegelläget i realtid** | de tre löftena hålls (milstolpar: Etapp 1–4) |
| **Uppstarten vid bordet** | en spelare kan ställa upp telefonen utan hjälp |
| **Lekbyggaren och vägen till spel** | från ingen lek till pågående spel utan att lämna appen |
| **Spelvyn och bordsvyn** | ett helt parti går att spela utan att vyn står i vägen |

Varje issue Claude Code skapar i det här repot hamnar i ett av de fyra.
Hör den till inget av dem — konton, drift, licenser, mätverktyg, arbetssätt
— sätt **inget projekt** och etiketten `Plattform` i stället. Det området
tar aldrig slut, och ett projekt som aldrig blir klart gör framstegsstapeln
och måldatumet meningslösa.

Hör issuen till en etapp i Spegelläget: sätt milstolpen också. Etapperna är
**milstolpar i projektet**, inte parent-issues (MES-237 och MES-253–256 är
stängda som ersatta av dem).

Med agent-klienten: `skapaIssue({ …, etiketter: ['Feature'], status:
'unstarted', projekt: 'Spegelläget i realtid' })`. Med MCP-kopplingen: sätt
`labels`, `state: "Todo"` och `project` i `save_issue`.

### Överblicken: `/läget`

Kör `node dev/laget.cjs` plus `ListAgents` — skillen `laget` gör båda och
slår ihop dem. Den svarar på vad som körs, vad som väntar på Jesper, vad som
är blockat, vilka grenar som inte är ihopslagna och vad som är näst på tur.
Använd den när Jesper frågar hur det går, i stället för att läsa Linear.

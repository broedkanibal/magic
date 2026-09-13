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

**Projekt — annars syns issuen inte i projektvyn:**

| Situation | Projekt |
|---|---|
| Uppföljning av en issue (MES-113 efter MES-107) | samma som issuen den följer upp |
| Jesper har sagt vilket projekt | det |
| Annars | fråga — gissa inte, som med `Release`-etiketterna |

Med agent-klienten: `skapaIssue({ …, etiketter: ['Feature'], status:
'unstarted', projekt: 'Mesa Magic' })` — `'unstarted'` är Todo. Med
MCP-kopplingen: `labels`, `state: "Todo"` och `project` i `save_issue`.

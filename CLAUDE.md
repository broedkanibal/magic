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

## Claude är reserven, aldrig ett villkor (Jespers beslut 2026-10-09)

Mesa ska klara ett parti på telefonens egen igenkänning. Claude är en reserv
som gör det snabbare, inte en del av motorn.

**Regeln:** ingen regel i koden får kräva ett svar från Claude för att slå
till. Varje regel ska fungera med AI-hjälpen avstängd — då hamnar det osäkra
hos spelaren ("Name this card"), inte i ett fel eller en dubblett. Claude får
korta vägen, aldrig vara den enda vägen.

| Får | Får inte |
|---|---|
| fråga Claude om ett kort telefonen inte kunnat namnge, och använda svaret | en regel som bara slår till när `t.ai` eller `t.ai.svar` finns |
| låta Claudes svar göra ett osäkert kort säkert snabbare | ett ändrat flöde som skickar fler kort eller bilder till Claude (en ny väg till `okand` som frågar, automatiska helbilder) utan att Jesper sagt ja |

**Varför:** varje fråga kostar (~0,9 cent för en beskärning, ~3 cent för en
helbild), taket är 300 frågor per konto och månad, och en app som blir sämre
utan Claude går inte att skala. Den 9 oktober höll dubbletten på spegelmattan
på att byggas så att kortet bara flyttades när Claude svarat samma namn —
utan Claude hade dubbletten stått kvar.

**Så provas det:** Mat test (`dev/mattest`) och golden utan `--ai` kör utan
Claude, och en ny regel ska hålla där. Behövs ett andra vittne: ta det lokalt
— samma korts egen bild från nyss (minnet av remsor, `T.remsaMinne`), lekens
antal, flera läsningar över tid — eller låt spelaren välja.

Ser en ändring ut att behöva Claude som villkor: föreslå den och fråga.

## Worktrees: städa direkt efter att något pushats till main

En worktree är tillfällig. Den finns för att en session ska kunna bygga i
fred, och den ska bort så fort arbetet ligger på `origin/main`. Annars
blir `.claude/worktrees/` en kyrkogård av gamla grenar som ingen vågar röra.

**Gäller alltid, inte bara i en skill.** Också när Jesper bara ber om något
direkt i en session ("fixa det här, slå ihop och pusha") och även om
uppgiften inte nämner städning: efter pushen städar du upp efter dig, utan
att bli ombedd. `/next` och orkestrerande sessioner följer samma regel.

**När en gren pushats till main, i samma session och före sista svaret:**

1. Kontrollera att commiten ligger på main: `git fetch` och
   `git log origin/main --oneline -3`.
2. Ta bort worktreen: `git worktree remove <sökväg>`.
3. Ta bort grenen: `git branch -d <gren>`. Vägrar `-d` är grenen inte
   ihopslagen — stanna då och undersök, tvinga inte med `-D`. Pushade du
   grenen till origin (inte bara `HEAD:main`): ta bort den också med
   `git push origin --delete <gren>`.
4. Synka main-mappen: `git merge --ff-only origin/main`.
5. Städa egna temporära filer (`dev/_*.cjs` och liknande) och säg i
   slutsvaret att inget ligger kvar.

**Bara dina egna.** Rör aldrig en worktree eller gren som en annan session
skapat, eller en worktree som är låst (`git worktree list` visar `locked`). Ser en ut att vara
övergiven: nämn den för Jesper, ta inte bort den. Samma resonemang som för
In Progress i Linear (se nedan).

**Slutar sessionen utan att något pushats** ligger arbetet kvar i
worktreen. Skriv då i slutsvaret vilken gren och sökväg det gäller, så att
nästa session hittar den.

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

### Tröskeln: vad som blir en issue, och vad som inte gör det

Läs det här före varje `skapaIssue`. Det är den regel som avgör om Linear går
att överblicka eller inte.

**En issue skapas när minst ett av tre stämmer:**

| Villkor | Varför |
|---|---|
| Den kräver ett **beslut av Jesper** | ett designval, ett prov på telefonen, ett konto — han måste kunna se den |
| Den **spänner över mer än en session** | någon annan måste kunna ta vid, och då behövs ett spår utanför chatten |
| Den är ett **löfte om produkten** | något vi sagt ska fungera, som ska gå att mäta mot |

**Annars: ingen issue.** En fix som en session gör klart, provar och slår ihop
i samma svep är ett *commit-meddelande*, inte en issue. Skriv i stället
meddelandet så att det bär hela historien: vad som var fel, vad som mättes,
vad som ändrades. Det är där nästa session ändå letar.

**Varför tröskeln finns:** 280 issues på tolv dagar, ~13 klara per dag. Ingen
sortering i världen gör den högen överskådlig — bara filtrerbar. Det som
minskar den är att färre saker blir issues från början. Rädslan att arbete
"försvinner" utan en issue är obefogad: commit-meddelandet och `/overview` visar
det redan.

Är du osäker — **skapa den inte.** En fix som visar sig behöva en issue får en
när den behövs, och då med bättre underlag. En issue som inte behövdes städas
bort av en människa, och det är dyrare.

### När du väl skapar en

Sök igenom laget först, så att det inte blir en dubblett. Följer du direkt upp
med arbetet: kör `paborjaIssue` (kolumn In Progress, se kollen i nästa
avsnitt). Etikett, kolumn och projekt enligt reglerna nedan.

Berätta alltid i chatten vilka issues du skapat — id, titel och länk — så att
Jesper ser dem utan att leta i Linear.

### En bräda, och testet för vad som är ett projekt

Det finns **ett** ställe att titta på: lagets Issues, grupperad på status,
ordnad på **Priority**, med "visa sub-issues" avslagen. Ordnad på Priority
kan ett kort aldrig hamna ovanför en högre prio, och det Jesper drar ändrar
ordningen inom prion (`prioritySortOrder`, som `/next` läser). Inga sparade vyer — en vy som bara filtrerar
på status är statusen förklädd till navigation.

**Testet för ett projekt: kan du säga "klart" och mena det, med ett datum?**
Går det inte är det ett *område*, och då är det en etikett.

Det testet fälldes tre av fyra projekt den 20 september. "Uppstarten vid
bordet" lät avgränsat men uppstarten får buggar för evigt; samma sak med
spelvyn och lekarna. Kvar blev ett projekt, och det är ärligt — det är det
enda som drivs mot mätbara siffror.

Den 27 september ersattes det av **Private beta**, som tar slut när
främlingar spelat ett helt parti. Spegellägets öppna issues ligger där i
milstolpen *6 · Mirror my table*; det gamla projektet är stängt som historik.

| Nivå | Linear | Exempel | Jobb |
|---|---|---|---|
| Leverans som tar slut | **projekt** | Private beta | vad vi driver mot ett mätbart mål |
| Del av leveransen | **milstolpe** | 1 · Leken i appen … 6 · Mirror my table | vad som hör ihop, och 6/19 i projektvyn |
| Var i produkten | **områdesetikett** | `spelvyn` | kartan över appen |
| Vad det handlar om | **ämnesetikett** | `kortigenkänning` | skär tvärs igenom områdena |
| Klump som blir klar ihop | **parent + sub-issues** | MES-281, 0/6 | en rad på brädan i stället för sex |

**Varje issue ska ha minst en områdes- eller ämnesetikett.** Utan den
försvinner den ur kartan när dess projekt tar slut.

| Etikett | Vad |
|---|---|
| `uppstarten` | Set up your table: stegen, provkortet, kortstorleken, graveyard och library |
| `spelvyn` | bordet under spelet: mattan, korten, leken i spel, bordsvyn, menyer |
| `lekar` | lekens sida, lekfoton, Use camera to add cards, Get ready, Home-spellistan |
| `kortigenkänning` | att kameran hittar kortet och sätter rätt namn — detektorn, läsningen, farten |
| `telefonen` | telefonen som sak: hur den står, vad den ser, upplösning, värme, inspelning (hette `kameran-uppställning` till 2026-09-21 — lätt att blanda ihop med `uppstarten`) |
| `golden` | mätverktyget självt |
| `Plattform` | konton, drift, licenser, arbetssätt |

**Etikett eller parent?** Består temat och vill du kunna filtrera på det —
etikett. Blir klumpen klar ihop och vill du se 6/19 — parent. Var sparsam med
parent-issues: en parent-rad kan bara säga ett läge medan barnen ligger i
olika kolumner. Gör en bara när barnen verkligen landar tillsammans.

**Skapar du ett nytt projekt** — skriv slutvillkoret som något som går att
mäta. Går det inte att mäta är det ett område, och då blir det en etikett.

Cykler används medvetet inte. Med tretton klara issues om dagen blir en
veckocykel nittio rader, och det är ingen rytm.

### Arbetsytan har en gräns: 250 aktiva issues

Linear-arbetsytan ligger på gratisnivån. **Stängda issues räknas tills de
arkiveras.** Den 20 september slog laget i taket mitt under arbetet, och
ingen session kunde skapa nya issues.

Laget auto-arkiverar nu stängda issues efter en månad. Slår det i taket ändå:
arkivera allt med statustypen `completed`, `canceled` eller `duplicate`.

**Arkivera aldrig något med öppen status.** MES-109, MES-110 och MES-165 låg
arkiverade med statusen Todo och syntes på brädan utan att returneras av en
enda API-fråga — osynliga för varje mätning och varje kö. Det är det värsta
tillståndet en issue kan ha.

Tröskeln ovan är det som håller antalet nere i längden.

### Triage, Backlog och Todo: vem flyttar vad

Kolumnerna före arbetet skiljer sig i **vem som har bestämt**, inte i hur
viktigt något känns. Det är den regel som håller brädan ren när agenter
skriver i Linear själva.

| Status | Betyder | Vem lägger den där | Vem plockar därifrån |
|---|---|---|---|
| **Triage** | *Agentens inkorg.* Allt Claude Code skapar, som Jesper inte sorterat | Claude Code — alltid här, också när Jesper bett om issuen i chatten; aldrig i Backlog, Todo eller Behöver dig | **ingen** — Jesper sorterar |
| **Backlog** | *Kanske.* Sett, men inte beslutat | bara Jesper | **ingen** |
| **Todo** | *Ska göras,* och en agent kan börja utan Jesper | bara Jesper | agenter, i prioritetsordning |

**Fyra regler, utan undantag:**

1. **Claude Code skapar bara i Triage**, också när Jesper bett om issuen — och i projektet
   **Private beta**, om Jesper inte sagt något annat. Agent-klientens
   `skapaIssue` gör båda om `status` och `projekt` utelämnas. Är det
   uppenbart Commander-specifikt: `projekt: 'Private beta · Commander'`. Tröskeln ovan gäller
   fortfarande: det mesta ska inte bli en issue alls.
2. **Bara Jesper flyttar ut ur Triage och från Backlog till Todo.** En agent
   får föreslå det i chatten, aldrig göra det.
3. **Agenter plockar bara ur Todo.** Aldrig ur Triage eller Backlog.
4. **Ett projekt som pågår innehåller det beslutade, plus sin inkorg:**
   Triage (osorterat, ligger i projektet så att det syns på dess bräda),
   Todo och det som redan är igång. Backlog har inget projekt i ett pågående
   projekt. Ett planerat projekt (Private beta · Commander) får ha Backlog.

**Jespers sortering av Triage** — tre besked per issue:

| Besked | Vad som händer |
|---|---|
| Ja | Todo, med milstolpe och prioritet — eller **Behöver dig** om den behöver honom innan någon kan börja. Hör den inte till betan: byt eller ta bort projektet |
| Kanske | Backlog, och projektet tas bort |
| Nej | Canceled |

**Todo innehåller bara det en agent kan göra utan Jesper.** Jesper har två
kolumner, en före och en efter arbetet:

| Kolumn | Före eller efter | Innehåller |
|---|---|---|
| **Behöver dig** | före | issues som inte kan börja utan honom: ett beslut, fler detaljer, ett designval, ett konto, en inspelning han ska göra |
| **Redo att testas** | efter | bara det som **är byggt** och väntar på hans prov — på riktig telefon, i ett riktigt spel. Inget ska dit utan kod |

En design-issue där agenten först gör designytan är Todo; när ytan finns och
valet är hans flyttas den till Behöver dig. När han valt: tillbaka till Todo
för bygget.

### Vilken issue en agent plockar, och vem som startar den

**Ingenting startar av sig själv.** "Claude AI agent" i Linear är bara en
identitet: det finns ingen mottagare som lyssnar när en issue delegeras till
den. Arbete ur Todo börjar när en session startas — av Jesper ("ta nästa"),
av en orkestrerande session (`dev/plan/orkestrering.md`), eller av en
schemalagd körning om en sådan sätts upp.

**Så väljs issuen:**

1. Bara **Todo**.
2. Högst prioritet först (High, Medium, Low, ingen), och inom samma
   prioritet den manuella ordningen i kolumnen.
3. Kör kollen i nästa avsnitt. Blockad → Blocked. Krock → nästa i kön, och
   säg vilken som hoppades över. Visar det sig att den behöver Jesper →
   Behöver dig (`markeraBehoverJesper`), och nästa i kön.
4. En issue per session, om inte en orkestrerande session delar ut flera.

Skillen **`/next`** (`.claude/skills/next/`) gör hela vägen: underlaget
(`node dev/nasta.cjs` + `ListAgents`), valet, `paborjaIssue`, bygget i en
egen worktree, fristående granskning, och rätt kolumn efteråt. Den och en
orkestrerare kan köra samtidigt: In Progress är låset, och kör en
orkestrerare slår `/next` inte ihop själv utan lämnar grenen till den.

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

### Behöver issuen Jesper: "Behöver dig" eller "Redo att testas"

Kan en issue inte gå vidare utan något bara Jesper kan göra **innan** mer
byggs — ett designval, fler detaljer, ett konto, en inspelning — kör
`agent.markeraBehoverJesper(issueId, varfor)`. Den flyttar issuen till
**Behöver dig** och kommenterar konkret vad som behövs. Sedan stannar arbetet
på den issuen; gå vidare med något annat. När Jesper gjort sitt:
`agent.slappBehoverJesper(issueId)` flyttar den tillbaka till Todo.

Är det **byggt** och det som återstår är Jespers prov, kör
`agent.markeraRedoAttTesta(issueId, vad)`. Den flyttar issuen till **Redo att
testas** och kommenterar exakt vad han ska prova och hur.

Kolumnerna är hur Jesper ser i Linear var han är flaskhalsen, utan att läsa
chatten. (Etiketten *Needs Jesper* pensionerades 2026-09-27; kolumnerna gör
dess jobb.) Flytta aldrig dit för ett beslut du kan ta själv enligt
reglerna här.

### Agenterna i `.claude/agents/`

`mesa-matning` (Sonnet, mäter utan kod), `mesa-bygg` (Opus, vanligt bygge)
och `mesa-bygg-tung` (Fable, detektorn, läsningen, spärren mot fel namn,
samtidighet). Effort ärvs från sessionen som startar dem — kör
orkestrerande sessioner på **high**, inte xhigh eller ultracode: det som
kostar är hur länge agenterna lever, inte hur hårt orkestreraren tänker.
Agenterna slår aldrig ihop med main och pushar aldrig; det gör
orkestreraren efter bänk och golden. Planen för orkestreringen:
`dev/plan/orkestrering.md`.

### Kostnad: hur sessioner och agenter startas (mätt 2026-10-08)

Veckan 1–7 oktober kostade ~2,2 × en vanlig vecka. 68 % gick i subagenter,
och två nattorkestreringar stod för 52 %. Orsaken var inte att agenter
startades, utan att de **levde länge och väntade**. Bakgrund: varje anrop
läser hela samtalet; den delen är en tiondel så dyr så länge den ligger i
cachen, men cachen går ut efter **5 min** för en subagent och **1 h** för en
vanlig session. Går den ut skrivs hela samtalet in igen till fullt pris —
för en byggare på 900 000 tokens är det en hel dagslön per väntan.

**Regler för orkestrerande sessioner och agenter:**

1. **En byggagent väntar aldrig på något längre än ett par minuter.** Den
   bygger, kör de riktade bänkproven, rapporterar och avslutas. Den kör
   inte golden och står inte i kö för den (`pgrep` tomma-loopen hör till
   den som mäter). Golden kör orkestreraren i bakgrunden, eller en
   `mesa-matning`-agent (Sonnet) som bara mäter och rapporterar siffror.
2. **En ny agent per steg och per rättelserunda.** Rättelsen får
   granskarens fynd och golden-resultatet som en kort lista — aldrig den
   gamla byggarens hela historia. En agent som svällt mot 500 000 tokens
   avslutas, den väcks inte igen.
3. **Mätning är Sonnet.** Opus bygger, Fable bara det tunga
   (`mesa-bygg-tung`).
4. **En issue eller ett steg per session.** Sessionen blir dyr av storleken,
   inte av tiden: större än ~400 000 tokens → skriv en handover och börja
   en ny. En session som varit orörd mer än en timme betalar hela samtalet
   fullt vid nästa svar — är den stor, börja hellre en ny med en handover.
5. **Starta inte en session som "väntar på" en annan.** Starta den när den
   andra är klar. Vill Jesper veta hur det går: `/overview`, inte en
   session som pollar.

**Modell och effort per sorts arbete** (förslag, Jesper väljer):

| Sorts arbete | Modell | Effort |
|---|---|---|
| Frågor, `/overview`, förklaringar, mätningar, analys av siffror | Sonnet | medium |
| Planering och designval | Opus | medium–high |
| Vanligt bygge (`mesa-bygg`) | Opus | high |
| Detektorn, spärren mot fel namn (`mesa-bygg-tung`) | Fable | high |
| Orkestrerande session över natten | Opus | high |

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
| Claude Code skapar en issue, på eget initiativ eller för att Jesper bett om den | **Triage** — Jesper sorterar till Todo, Behöver dig, Backlog eller Canceled |
| Claude Code påbörjar arbetet direkt, på Jespers begäran | **In Progress** (`paborjaIssue`) |

### In Progress betyder en sak: en session kör den nu

Det här är regeln som gör kolumnerna sanna. **In Progress = en levande
session har issuen just nu.** Inget annat.

Tar sessionen slut utan att issuen är klar — **flytta tillbaka den till
Todo** och kommentera vad som gjorts och vad som återstår. Ligger det en
gren kvar: skriv vilken, och att den inte är ihopslagen. En issue som står
i In Progress utan att någon jobbar på den är osynligt övergiven, och det
var precis det som gjorde kolumnen oläsbar (38 issues, 22 av dem orörda i
flera dagar, mätt 2026-09-20).

**Bara den session som tog issuen lämnar tillbaka den.** Ingen annan får
flytta en issue ur In Progress för att den ser övergiven ut.

Skälet är att du inte kan se om någon jobbar: **subagenter syns aldrig i
`ListAgents`.** En orkestrerande session kan ha sex agenter igång utan att
en enda av dem syns utifrån. Den 20 september flyttades fyra issues till
Todo för att de såg sessionslösa ut — en av dem mitt i sin sjunde mätkedja.

Ser en issue övergiven ut och det inte är din: **fråga den session som har
den**, eller den orkestrerande sessionen. Flytta den inte.

De andra kolumnerna finns för att In Progress ska slippa betyda dem:

| Kolumn | Betyder | Vem släpper den vidare |
|---|---|---|
| **Behöver dig** | **väntar på Jesper före arbetet** — ett beslut, fler detaljer, ett designval, ett konto | Jesper, som flyttar den till Todo |
| **Redo att testas** | **byggt, väntar på Jespers prov** — på riktig telefon eller i ett riktigt spel | Jesper, som stänger den eller skickar tillbaka den till Todo med vad som var fel |
| **Blocked** | väntar på en annan issue; ingen ska plocka upp den | den som stänger blockeraren |
| **Todo** | i kön, ingen session | vem som helst |

`blockeraIssue(issueId, orsak, { blockeradAv })` flyttar till **Blocked**.
Är det Jesper som behövs — inte en annan issue — hör den till **Behöver dig**
(före arbetet) eller **Redo att testas** (byggt). En issue där ingenting är
byggt än för att designvalet är hans ligger i Behöver dig, inte i In
Progress. Annars syns han inte som flaskhalsen i sin egen vy, och det är
hela poängen med kolumnen.

**Är halva issuen levererad och andra halvan blockad — dela den.** En rad på
brädan kan bara säga ett läge. MES-248 var det första fallet: del 1 ute i
produktionen, del 2 blockad av MES-261, och kolumnen sa bara "Blocked" så
att den som läste trodde att ingenting hänt.

**Priority är köordningen, inte hur viktigt något känns.** Den svarar på en
fråga: vad tas härnäst när en agent blir ledig? Allt i ett projekt är
viktigt, så "viktigt" skiljer ingenting åt — ordningen gör det.

| Priority | Betyder | Tumregel |
|---|---|---|
| **Urgent** | något i produktion är trasigt eller läcker | går före allt; nästan aldrig |
| **High** | näst på tur | **högst fem åt gången** — fler betyder att ingen av dem är nästa |
| **Medium** | i kön, men senare | det mesta i Todo |
| **Low** | bedömd, och medvetet sist — låser inte upp något som brådskar | |
| ingen | inte bedömd | bara i Triage och Backlog — **allt i Todo har prioritet** |

Tre vanor:

1. **Prioriteten sätts när issuen flyttas till Todo**, inte senare.
2. **Inom samma prioritet bestämmer ordningen i kolumnen** — Jesper drar
   korten, och `/next` följer ordningen.
3. **När en High blir klar lyfts en Medium till High.** En agent får
   föreslå vilken, aldrig göra det själv.

Samma skala gäller i **Behöver dig** och **Redo att testas**, där kön är
Jespers: High = nästa han tar, och de som går att göra i samma sittning
ligger intill varandra. I **Blocked** säger den vad som ska plockas först när
blockeringen släpper.

Ordningen kommer ur `dev/plan/orkestrering.md`. Den filen är **regelboken**
— kodområden, vad som inte får köras parallellt, hur en gren slås ihop —
inte en egen kö. Två köer som inte stämmer överens är värre än ingen.

**Projekt — de tar slut:**

| Projekt | Klart när |
|---|---|
| **Private beta** | två spelgrupper utanför teamet (minst 6 spelare) har spelat varsitt helt parti utan hjälp, minst ett Mirror my table mot Digital table, och ingen dold information läcker |
| **Private beta · Commander** | startar när Private beta är klar: en grupp om fyra har spelat ett helt Commander-parti med command zone, tax, 40 liv och commander damage |

Milstolparna i Private beta: *1 · Leken i appen*, *2 · Motståndare och dold
info*, *3 · Spelvyn i alla lägen*, *4 · Ytan utåt*, *5 · Redo för
främlingar*, *6 · Mirror my table* (kamerans träffsäkerhet, fart och
handlingar — det som var Spegelläget i realtid; etappindelningen finns kvar i
`dev/plan/etapper.md`). Det som bara gäller Commander hör till
Commander-projektet; det Commander använder men som gäller alla format hör
till Private beta.

En ny issue hamnar i ett projekt bara om den behövs för dess slutvillkor. Allt
annat får **inget projekt** — bara etiketter. Det är inte en brist: ett projekt som
aldrig blir klart gör framstegsstapeln och måldatumet meningslösa, och
kartan över appen är etiketterna.

Hör issuen till Private beta: sätt milstolpen också. Milstolparna är
delarna av leveransen, inte parent-issues.

Med agent-klienten: `skapaIssue({ …, etiketter: ['Feature', 'spelvyn'] })`
— utan `status` och `projekt` blir det Triage i Private beta. Med
MCP-kopplingen: sätt `labels`, `state: "Triage"` och `project: "Private beta"`.

### Överblicken: `/overview`

Kör `node dev/laget.cjs` plus `ListAgents` — skillen `overview` gör båda och
slår ihop dem. Den svarar på vad som körs, vad som väntar på Jesper, vad som
är blockat, vilka grenar som inte är ihopslagna och vad som är näst på tur.
Använd den när Jesper frågar hur det går, i stället för att läsa Linear.

## Grinden för en ny bildmodell (Jespers beslut 2026-10-06)

Gäller varje finjusterad bildmodell (MobileCLIP v2, v3, v4 …) innan den byts in i
appen, och varje session som mäter en.

| Krav | Vad som gäller |
|---|---|
| **0 säkra fel namn i golden** | hårt, oförändrat. Varje fel namn spåras till sin väg i koden (domskälet: `modell land`, `remsa`, `modell+orb` …). Faller appens nuvarande modell på samma väg är det vägen som ska dömas, inte modellen — men modellen går ändå inte in förrän vägen eller modellen är rättad |
| **Totalen bättre än baslinjen** | rätt namn/119 ska vara fler än baslinjens. "Inget fall sämre" gäller inte längre som stopp: varje fall som blir sämre ska ha en förklaring som inte är slump, och förklaringen skrivs i historik-raden |
| **Golden: baslinjen en gång, den nya modellen två gånger**, på samma kod | skiljer sig den nya modellens två körningar åt i ett fall är skillnaden brus, och räknas inte som försämring. Kolla `git diff --stat <baslinjens commit> HEAD -- index.html` före, inte efter: har index.html ändrats körs baslinjen om på nuvarande kod |
| **Bänkarna är diagnos, inte grind** | helkortsbänken (`helkort_jamfor.py`) och remsregeln (`remsregel.py`) rapporteras alltid — de visar var modellen är svag — men stoppar inte en modell som golden godkänner. Appens egen modell har själv 2 säkra fel på helkortsbänken vid 0,11 |

**Varför:** golden-måtten skakar mellan identiska körningar (fall 05: 0·0·0 mot
1·1·0 på samma kod), så ett enda sämre fall säger inget; och bänkarna är
strängare än appen, som har remsan och ORB som fångar det bänken kallar fel.
Det som aldrig får skaka är löftet till spelarna: inget säkert fel namn.

## Golden: kör bara när måttstocken eller kamerakoden ändras (Jespers beslut 2026-10-07)

En golden-körning tar ~25 min och många tokens. Kör den bara när
**facit, en video eller lek.txt ändras** (då bara de fall som rörs, med
`--fall … --spara`) eller när **kamerakod som ska behållas** hamnar på main
(då alla fall, en gång). Datorsidan, gränssnitt, dokument och planer kräver
ingen körning. Raden i `dev/golden/historik.md` är högst tre meningar; detaljerna
står i rapporten. Hela regeln: `dev/golden/SNABBGUIDE.md`, *När en ny baslinje
behövs*.

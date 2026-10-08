---
name: archive
description: Förbereder och arkiverar den här sessionen — kontrollerar att allt är committat och pushat till main, lokal main är i fas med origin, sessionens egna worktrees och grenar är borta, inga egna servrar eller temp-filer ligger kvar, de Linear-issues sessionen rört har rätt status, etiketter och kommentar, och att produktionen kör den pushade koden. Åtgärdar det säkra själv, frågar om resten, och arkiverar först när allt är grönt. Använd när Jesper skriver "/archive", "arkivera", "arkivera sessionen", "stäng sessionen" eller "är vi klara här?" i en session.
---

# Archive — arkivera sessionen när inget är kvar

Sessionen får arkiveras först när **ingenting hänger kvar**. Skillen kontrollerar,
städar det som är säkert, frågar om resten, och arkiverar sist.

Gäller bara **sessionens egna** spår: dess worktree, grenar, issues, servrar och
filer. Andra sessioners worktrees, grenar och ändrade filer nämns högst som info
och rörs aldrig (CLAUDE.md, "Bara dina egna"). Låsta worktrees likaså.

## 1. Ta reda på vad som är sessionens

Innan kontrollen — gå igenom samtalet och skriv ner för dig själv:

- **Issues** (MES-NN) sessionen skapat, jobbat på, kommenterat eller ändrat.
  Även de som bara nämndes i en commit-rubrik. Grenens namn och
  `git log origin/main --since=<sessionens start>` hjälper.
- **Worktrees och grenar** sessionen skapat (`EnterWorktree`, agenter med
  `isolation: "worktree"`, `git worktree add`).
- **Servrar och bakgrundsjobb** sessionen startat (`preview_start`, `--port`,
  `run_in_background`, `kor.cjs`).
- **Vad som ändrats**: kamerakod, facit/golden-filer, api/identify.js, SQL-
  migrationer, planfiler. Det styr vilka villkorliga kontroller i steg 3 som gäller.

## 2. Kör kollen

```bash
node dev/arkivera.cjs --fran <commit före sessionens första> MES-12 MES-34
```

`--fran` plockar också upp MES-nummer ur commit-rubriker. Ange issuenumren du
hittade i steg 1 — skriptet gissar inte åt dig. Det läser bara; det ändrar inget.
Exit 0 = inget stoppar, 1 = något stoppar. `✗` måste åtgärdas, `⚠` bedöms av dig.

## 3. Kraven, och vad du gör när de inte håller

| Krav | Åtgärd du gör själv | Fråga Jesper först |
|---|---|---|
| **Inget ocommittat** i sessionens träd | — | Committa det som är sessionens (med `MES-NN` i rubriken); fråga om det är oklart om det hör hit. Committa **aldrig** främmande ändringar i main-mappen — nämn dem |
| **Inget opushat**: HEAD på `origin/main` | `git push origin HEAD:main` när committen redan är ihopslagen och granskad | Ligger arbetet på en gren som inte är på main: slå inte ihop utan att fråga. Kör en orkestrerande session (`ListAgents`)? Då pushar du inte själv — skicka grenen till den |
| **Lokal main = `origin/main`** | `git merge --ff-only origin/main` i main-mappen | Går ff inte (main har divergerat): stanna och berätta, tvinga inte |
| **Sessionens worktree borta** | `git worktree remove <sökväg>` när allt i den ligger på origin/main (kör från main-mappen, inte inifrån worktreen; kom du in via `EnterWorktree` använd `ExitWorktree` med remove) | Har den ocommittat eller opushat: aldrig ta bort. Fråga |
| **Sessionens grenar borta** lokalt och på origin | `git branch -d <gren>`; pushade du grenen: `git push origin --delete <gren>` | Vägrar `-d` är grenen inte ihopslagen — stanna, undersök, tvinga **aldrig** med `-D` |
| **Ingen stash** | — | Visa innehållet; släng aldrig en stash utan besked |
| **Inga egna servrar/bakgrundsjobb** | Stoppa dem du startat (`preview_stop`, `TaskStop`, `kill` på pid du känner igen) | Vet du inte att den är din: lämna den och nämn den |
| **Inga egna temp-filer** i repot (`dev/_*`) | Ta bort dem | — |
| **Linear är uppdaterad** (se steg 4) | Kommentarer, etiketter | Statusbyte, prioritet, projekt — fråga om det är minsta tveksamt |

Alla Linear-skrivningar går via `dev/linear-agent/klient.cjs` (som "Claude AI
agent"), aldrig via MCP-kopplingen — se CLAUDE.md. Efter åtgärderna: kör
`node dev/arkivera.cjs …` **igen** och läs hela utskriften. Arkivera aldrig på
ett läge du inte själv sett vara grönt.

### Villkorliga krav — bara om sessionen rört det

| Om sessionen ändrat… | Kontrollera |
|---|---|
| **Kod som är driftsatt** (`index.html`, `api/`) och pushat den | Produktionen kör den: de två sista kommandona i `driftkoll` (`/api/identify` svarar och `promptv` = `PANE_PROMPT_V`; `diff <(curl -s https://magic-mauve-xi.vercel.app/) index.html`). Ligger de efter: vänta ~30 s och kör om; ändras inget efter två försök är det ett ✗ |
| **Kamerakod som ska behållas** på main, **facit, video eller `lek.txt`** | Golden-regeln i CLAUDE.md: kördes rätt mätning, och finns raden i `dev/golden/historik.md` (högst tre meningar)? Datorsidan, gränssnitt, dokument och planer kräver ingen körning — **kör inte golden bara för att arkivera** |
| **Systemprompten** i `api/identify.js` | Bara om Jesper bett om det. Ändrad utan beställning = ✗ och fråga. Annars: före/efter-eval, `PANE_PROMPT_V` höjd, rad i historik.md |
| **SQL-migrationer** (`supabase/`, `*.sql`) | Är de körda mot Supabase, inte bara committade? Kontrollera mot projektet (`list_migrations`); kör inte en migration på eget bevåg — fråga |
| **`dev/plan/*.md`, designytor, beslut** | Stämmer planen med vad som gjordes? Uppdatera den i en commit om inte |
| **Minnet** (`memory/`) | Finns det något icke-uppenbart (beslut, fälla, Jespers val) som nästa session behöver och som inte står i koden eller commit-meddelandet? Spara det; annars inget |

## 4. Linear: varje issue sessionen rört

Gå igenom varje issue i kollens utskrift och jämför mot CLAUDE.md:s regler.

| Läge | Rätt tillstånd |
|---|---|
| Klart, pushat och provat så långt det går utan Jesper | **Done**, med en kommentar som länkar commiten och säger vad som gjordes |
| Byggt men kräver Jespers prov (telefon, riktigt spel) | **Redo att testas** (`markeraRedoAttTesta(id, vad)`) — kommentaren säger exakt vad han ska prova |
| Kräver ett beslut eller detaljer från Jesper innan mer byggs | **Behöver dig** (`markeraBehoverJesper(id, varfor)`) |
| Väntar på en annan issue | **Blocked** (`blockeraIssue(id, orsak, { blockeradAv })`) |
| Påbörjad men inte klar | **Todo** med kommentar: vad som är gjort, vad som återstår, **gren och sökväg** om något ligger kvar |
| Skapad av sessionen | **Triage** (aldrig direkt i Todo/Backlog), i Private beta om inget annat sagts |
| *Aldrig* | **In Progress** när sessionen slutar — det betyder "en session kör den nu" |

Och på varje issue:

- **Typ-etikett** (Bug / Feature / Improvement / Research / Administrative) och
  minst en **områdes- eller ämnesetikett**. Saknas de: sätt dem.
- **Projekt och milstolpe** enligt reglerna (en ny issue hör till Private beta
  bara om den behövs för dess slutvillkor). Ändra inte på eget bevåg — fråga.
- **Prioritet** på allt i Todo.
- **En kommentar** som beskriver vad sessionen gjort på issuen: vad som var
  fel, vad som mättes, vad som ändrades, commit-hash. En issue utan spår av
  sessionens arbete är ofullständig.
- Tröskeln: skapa **inte** nya issues bara för att stänga sessionen. Oklart
  kvarvarande arbete utan issue hör hemma i en handover eller en kommentar på
  den issue som finns.
- Rör aldrig en issue som en annan session har i In Progress.

## 5. Kan sessionen inte arkiveras?

Kan inte allt bli grönt (arbete pausat, ingenting pushat, något väntar på
Jesper, en gren som inte får slås ihop): **arkivera inte.** Skriv i stället
slutsvaret med:

- vilken **gren och sökväg** arbetet ligger på,
- vad som är gjort och **nästa steg**,
- vilka Linear-issues som är påverkade och i vilken kolumn de står,

och föreslå att `anthropic-skills:code-handover` används om sessionen är stor.
Sessionen får bli kvar tills Jesper bestämt sig.

## 6. Allt grönt: slutrapport och arkivering

Skriv först slutrapporten (en kort checklista, ingen berättelse):

```
✓ Git: allt committat, pushat, main = origin/main  (<hash> <rubrik>)
✓ Worktrees/grenar: <egen worktree och gren borttagna> — andras orörda: <lista>
✓ Servrar/temp: inget kvar
✓ Linear: MES-12 Done, MES-34 Redo att testas (kommentar: <vad Jesper provar>)
✓ Produktion: <kör pushad kod / gäller inte>
— Övrigt: <varningar du bedömt, andras worktrees, vad Jesper bör veta>
```

Anropa sedan `mcp__ccd_session_mgmt__archive_session` med `session_id: "self"`
och `reason`. Anropet **avslutar samtalet** — rapporten måste alltså redan stå
i svaret. Appen ber Jesper godkänna; blir det nekat, säg att sessionen är redo
och att han kan arkivera den själv.

Skriv också att du städat enligt CLAUDE.md ("inget ligger kvar") bara om det
stämmer efter den sista kollen.

## Gör inte

- Arkivera med ett enda `✗` kvar, eller utan att ha kört kollen **efter** åtgärderna.
- Tvinga: `git branch -D`, `git push --force`, `git worktree remove --force`,
  `git stash drop`, `git reset --hard`. Stoppar något av dem, stanna och fråga.
- Städa, flytta eller committa något som en annan session skapat.
- Köra golden, bänken eller en deploy bara för att kunna arkivera.
- Flytta en issue ur Triage eller Backlog till Todo (bara Jesper).
- Skapa nya issues för att "inget ska försvinna" — commit-meddelandet och
  kommentaren på den befintliga issuen räcker.

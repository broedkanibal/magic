---
name: next
description: Föreslår vad som är på tur i Todo i Linear och låter Jesper bekräfta vilken issue innan något görs (överhoppade visas med skälet), förklarar kort problemet och lösningen i vardagsspråk, föreslår modell och effort och ställer frågor som gör prompten bra — och startar först när Jesper svarat. Kollar blockeringar och krockar med det som redan pågår (sessioner, orkestrerare, golden), bygger i en egen worktree, låter en fristående granskare läsa diffen och lämnar issuen i rätt kolumn. Använd när Jesper säger "next", "/next", "nästa", "ta nästa", "jobba på något", "plocka en issue" eller "vad kan du göra nu". En issue per anrop.
---

# /next — ta nästa issue ur Todo

Todo innehåller bara det en agent kan göra utan Jesper (CLAUDE.md, "Triage,
Backlog och Todo"). Den här skillen tar den första som går att börja på *nu*,
utan att krocka med något annat som körs. Den plockar aldrig ur Triage,
Backlog, Behöver dig eller Redo att testas.

## 1. Underlaget

Kör båda, samtidigt:

```bash
node dev/nasta.cjs
```

och `ListAgents` — andra sessioner på datorn. Subagenter syns inte där, men
det de jobbar på står i In Progress i Linear (en orkestrerare kör
`paborjaIssue` för varje issue den delar ut).

## 2. Föreslå en issue — välj den inte

Steg 2 **bara läser**. Inga skrivningar i Linear, ingen worktree, ingen agent.
Säg aldrig "tar mig an", "påbörjar" eller "startar" om en issue innan Jesper
bekräftat just den i steg 3.

Har Jesper redan namngett en issue ("ta MES-351"): föreslå den, kör samma
kontroller och säg vad de visar. Annars: gå nerifrån `KÖN` i ordning, kör
kontrollerna och föreslå den första som klarar alla. Notera varje överhoppad
med skälet — den visas för Jesper i steg 3, och han kan välja den ändå.

| Kontroll | Hur | Faller den — **föreslå**, gör inte |
|---|---|---|
| **Blockerad?** | flaggan i nasta.cjs, plus beskrivning och kommentarer ("kräver att X finns") | "flytta till Blocked" (`agent.blockeraIssue`) — görs först när Jesper sagt ja |
| **Krockar?** | flaggan "samma område" betyder *läs båda*. Krock = samma funktioner i `index.html`, samma del av kedjan, eller något tabellen "Kodområde / Kan gå parallellt med" i `dev/plan/orkestrering.md` säger inte får köras samtidigt. Jämför också med sessionerna i `ListAgents` och med worktrees som har ocommittade ändringar (`git worktree list`, `git -C <wt> status`) | säg vad den krockar med: vilken issue, session eller worktree, och om worktreen ser levande ut (senaste ändring, commits) |
| **Behöver Jesper?** | läs beskrivningen: ett beslut, ett konto, en inspelning, ett prov som måste göras *innan* bygget | "flytta till Behöver dig" (`agent.markeraBehoverJesper`) — görs först när Jesper sagt ja |
| **Fortfarande Todo?** | kontrolleras igen i steg 4, precis före start — en orkestrerare eller en annan `/next` kan ha tagit den medan Jesper svarade | säg det och fråga igen |

Efter fem överhoppade: stanna och säg vad som stoppar kön.

## 3. Bekräfta issuen med Jesper — sedan frågorna

Ingenting startar förrän Jesper bekräftat **vilken issue** och svarat på
frågorna. Det är två frågerundor, i den ordningen.

**Runda 1 — vilken issue.** Läs den föreslagna issuen (beskrivning och
kommentarer) och skriv, kort:

**På tur: MES-NN — titel** (länk)
*Därefter i kön: MES-AA, MES-BB. Hoppade över: MES-CC (krock med MES-DD).*

**Problemet:** en eller två meningar i vardagsspråk — vad som är fel eller
saknas, sett från spelaren. Ingen jargong, inga funktionsnamn.

**Lösningen:** en eller två meningar — vad som ska byggas eller mätas, och
hur det löser problemet.

Fråga sedan med `AskUserQuestion` **vilken issue** som ska tas:

- förslaget först, märkt (Recommended)
- nästa ett–två i kön
- varje överhoppad issue som ett eget alternativ, med skälet i beskrivningen
  ("krockar med worktreen namnge-pa-mattan, ocommittade ändringar för 30 min
  sedan") — Jesper kan veta att krocken är gammal, eller vilja ta den ändå

Föreslagna flyttar (Blocked, Behöver dig) frågas i samma anrop, som en egen
fråga med flerval. Ingenting görs med dem förrän han svarat.

Väljer Jesper en annan issue än förslaget: läs den och skriv Problemet och
Lösningen för den, kort, innan runda 2.

**Runda 2 — hur den görs.** Ett nytt `AskUserQuestion`-anrop, för den
bekräftade issuen:

1. **Modell och effort** — förslaget först, märkt (Recommended), med en
   mening om varför. Utgå från tabellen nedan.
2. **Två till tre frågor om just den här issuen** — det som saknas för en
   bra prompt: vad som räknas som klart, vad som är utanför, ett val
   beskrivningen lämnar öppet, vilken väg av flera som ska prövas först.
   Fråga inte om det som redan står i issuen eller CLAUDE.md.

| Sorts arbete | Agent | Modell | Effort |
|---|---|---|---|
| Mäta, köra golden, analysera en rapport — ingen kod | `mesa-matning` | Sonnet | medium |
| Vanligt bygge: vyer, menyer, spelvyn, buggar i appen | `mesa-bygg` | Opus | high |
| Designyta med varianter | `general-purpose` med designskillen | Opus | high |
| Detektorn, läsningen, spärren mot fel namn, samtidighet | `mesa-bygg-tung` | Fable | high |
| Datamodell, säkerhet, RLS, inloggning, dold information | `mesa-bygg` | Opus | high |
| Utredning med många golden-körningar | `mesa-bygg-tung` | Fable | high |

Modellen sätts med agentens `model`. Effort ärvs från sessionen: skiljer sig
Jespers val från sessionens, byt den med `set_session_effort` (ladda den med
ToolSearch) innan agenten startas, eller säg åt Jesper att byta.

## 4. Starta

1. Skriv prompten ur issuen, Jespers svar och reglerna nedan. Visa den i
   chatten i kortform (fem–tio rader), så att Jesper ser vad agenten får.
2. Läs issuens status en sista gång. Fortfarande Todo: `agent.paborjaIssue(id)`
   — från och med nu är den låst för andra sessioner.
3. Starta agenten med vald modell och effort, i bakgrunden.

**Regler för bygget, som ska stå i prompten:**

- Alltid `isolation: "worktree"` — arbetsträdet i main delas med andra
  sessioner. En ny worktree saknar `.env.local` och `dev/material`: symlänka
  dem.
- **Byggaren kör inte golden och väntar aldrig** (se `mesa-bygg`, *Mätningen*).
  Den bygger, kör de riktade proven och `dev/kolla.sh`, rapporterar vilka
  golden-fall som kan påverkas och avslutas.
- Systemprompten i `api/identify.js` rörs inte.
- Agenten slår inte ihop och pushar inte.

## 4b. Golden — du kör den, inte byggaren

Rör ändringen kamerans kod (CLAUDE.md, *Golden: kör bara när …*): kör de
fall byggaren nämnt, i bakgrunden från den här sessionen, och vänta in den
en gång. Kör en annan golden (nasta.cjs "golden kör: JA"): vänta inte i en
loop — säg till Jesper och gå vidare med granskningen. Rör den ingen
kamerakod: ingen golden.

## 5. Granska innan det slås ihop

En fristående granskare (`general-purpose`, läser bara) läser diffen och
letar efter riktiga fel, med konkreta scenarier. Fynden rättas av **en ny
agent** på samma gren, som får fynden som en lista — byggaren väcks inte igen
(den har vuxit, och dess cache har gått ut). Kom det nya commits: granska dem
också, med en ny granskare som bara läser rättelsen. Det här har hittat nya
fel varje gång det gjorts — hoppa inte över det.

## 6. Slå ihop — eller lämna till orkestreraren

| Läge | Vem slår ihop |
|---|---|
| **En orkestrerande session kör** (syns i `ListAgents`, eller i In Progress) | inte du. Skicka grenen till orkestreraren med `SendMessage`, enligt "Flera sessioner samtidigt: vem rör main" i `orkestrering.md` |
| Ingen orkestrerare | fråga Jesper, slå sedan ihop, kör `dev/kolla.sh` på main och pusha |

## 7. Lämna issuen i rätt kolumn

| Läge | Kolumn |
|---|---|
| Byggt, men kräver Jespers prov (riktig telefon, riktigt spel) | `agent.markeraRedoAttTesta(id, vad)` — skriv exakt vad han ska prova |
| Klart och provat så långt det går utan honom | Done, med commit-länk |
| Inte klart när sessionen slutar | tillbaka till **Todo**, med en kommentar om vad som är gjort, vad som återstår och vilken gren det ligger på |

In Progress får aldrig bli kvar efter att sessionen slutat (CLAUDE.md).

## Gör inte

- Starta något — eller skriva i Linear — innan Jesper bekräftat issuen och svarat på frågorna i steg 3.
- Välja en issue åt Jesper, eller hoppa tyst över en: överhoppade visas med skälet, och han kan välja dem.
- Ta mer än en issue per `/next`.
- Plocka ur något annat än Todo, eller flytta något ur Triage eller Backlog.
- Flytta en issue som en annan session har i In Progress.
- Pusha till main medan en orkestrerare kör, utan att ha frågat den.

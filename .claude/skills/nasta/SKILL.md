---
name: nasta
description: Visar vad som är på tur i Todo i Linear, förklarar kort problemet och lösningen i vardagsspråk, föreslår modell och effort och ställer frågor som gör prompten bra — och startar först när Jesper svarat. Kollar blockeringar och krockar med det som redan pågår (sessioner, orkestrerare, golden), bygger i en egen worktree, låter en fristående granskare läsa diffen och lämnar issuen i rätt kolumn. Använd när Jesper säger "nästa", "ta nästa", "/nästa", "jobba på något", "plocka en issue" eller "vad kan du göra nu". En issue per anrop.
---

# /nästa — ta nästa issue ur Todo

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

## 2. Välj issue

Gå nerifrån `KÖN` i ordning. Den första som klarar alla fyra tas:

| Kontroll | Hur | Faller den |
|---|---|---|
| **Blockerad?** | flaggan i nasta.cjs, plus beskrivning och kommentarer ("kräver att X finns") | `agent.blockeraIssue(id, orsak, { blockeradAv })` → nästa |
| **Krockar?** | flaggan "samma område" betyder *läs båda*. Krock = samma funktioner i `index.html`, samma del av kedjan, eller något tabellen "Kodområde / Kan gå parallellt med" i `dev/plan/orkestrering.md` säger inte får köras samtidigt. Jämför också med sessionerna i `ListAgents` | lämna den i Todo → nästa, och säg vilken den krockade med |
| **Behöver Jesper?** | läs beskrivningen: ett beslut, ett konto, en inspelning, ett prov som måste göras *innan* bygget | `agent.markeraBehoverJesper(id, vad)` → nästa |
| **Fortfarande Todo?** | kontrolleras igen i steg 4, precis före start — en orkestrerare eller en annan `/nästa` kan ha tagit den medan Jesper svarade | nästa, och säg det |

Efter fem överhoppade: stanna och säg vad som stoppar kön.

## 3. Visa Jesper vad som är på tur — och fråga innan något startar

Ingenting startar förrän Jesper svarat. Läs issuen (beskrivning och
kommentarer) och skriv, kort:

**På tur: MES-NN — titel** (länk)
*Därefter i kön: MES-AA, MES-BB. Hoppade över: MES-CC (krock med MES-DD).*

**Problemet:** en eller två meningar i vardagsspråk — vad som är fel eller
saknas, sett från spelaren. Ingen jargong, inga funktionsnamn.

**Lösningen:** en eller två meningar — vad som ska byggas eller mätas, och
hur det löser problemet.

Ställ sedan frågorna med `AskUserQuestion`, i ett anrop:

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
| Detektorn, läsningen, spärren mot fel namn, samtidighet | `mesa-bygg-tung` | Fable | xhigh |
| Datamodell, säkerhet, RLS, inloggning, dold information | `mesa-bygg-tung` | Fable | high |
| Utredning med många golden-körningar | `mesa-bygg-tung` | Fable | xhigh |

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
- **Golden körs aldrig två åt gången.** Visar nasta.cjs "golden kör: JA",
  eller kör en annan session golden: bygg klart, och kör golden när den är
  ledig.
- Systemprompten i `api/identify.js` rörs inte.
- Agenten slår inte ihop och pushar inte.

## 5. Granska innan det slås ihop

En fristående granskare (`general-purpose`, läser bara) läser diffen och
letar efter riktiga fel, med konkreta scenarier. Fynden rättas av byggaren
på samma gren. Kom det nya commits: granska dem också. Det här har hittat nya
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

- Starta något innan Jesper svarat på frågorna i steg 3.
- Ta mer än en issue per `/nästa`.
- Plocka ur något annat än Todo, eller flytta något ur Triage eller Backlog.
- Flytta en issue som en annan session har i In Progress.
- Pusha till main medan en orkestrerare kör, utan att ha frågat den.

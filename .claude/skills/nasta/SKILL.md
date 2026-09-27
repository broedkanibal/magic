---
name: nasta
description: Plockar nästa issue ur Todo i Linear enligt reglerna i CLAUDE.md och sätter igång arbetet — kollar blockeringar, krockar med det som redan pågår (sessioner, orkestrerare, golden), tar issuen, bygger i en egen worktree, låter en fristående granskare läsa diffen och lämnar issuen i rätt kolumn. Använd när Jesper säger "nästa", "ta nästa", "/nästa", "jobba på något", "plocka en issue" eller "vad kan du göra nu". En issue per anrop.
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
| **Fortfarande Todo?** | läs issuens status igen precis före steg 3 — en orkestrerare eller en annan `/nästa` kan ha tagit den under tiden | nästa |

Efter fem överhoppade: stanna och säg vad som stoppar kön.

## 3. Ta den

Säg till Jesper i en eller två rader: vilken issue, varför just den
(prioritet, plats i kön), och vilka som hoppades över och varför. Kör sedan
`agent.paborjaIssue(id)` — från och med nu är den låst för andra sessioner.

## 4. Bygg

- **Agent efter sort** (CLAUDE.md, "Agenterna i `.claude/agents/`"):
  `mesa-matning` för mätning utan kod, `mesa-bygg` för vanligt bygge,
  `mesa-bygg-tung` för detektorn, läsningen, spärren mot fel namn och
  samtidighet. Alltid `isolation: "worktree"` — arbetsträdet i main delas med
  andra sessioner.
- En ny worktree saknar `.env.local` och `dev/material`: symlänka dem.
- **Golden körs aldrig två åt gången.** Visar nasta.cjs "golden kör: JA",
  eller kör en annan session golden: bygg klart, och kör golden när den är
  ledig.
- Systemprompten i `api/identify.js` rörs inte.

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

- Ta mer än en issue per `/nästa`.
- Plocka ur något annat än Todo, eller flytta något ur Triage eller Backlog.
- Flytta en issue som en annan session har i In Progress.
- Pusha till main medan en orkestrerare kör, utan att ha frågat den.

# Nattpasset 2026-09-22 — resultat

Planen: `dev/plan/spegeln-natt.md`. Allt kördes, i ordning A → B → C → D,
utan omstarter och utan att någon vakt slog larm. Ingen kod är ändrad, inga
issues är skapade, inget är pushat.

## Vad som kördes och hur lång tid det tog

| Del | Vem | Start–slut | Tid | Budget | Vakten |
|---|---|---|---|---|---|
| A bildrutor | orkestreraren (`dev/rutor.swift`) | 00:07–00:08 | ~2 min | 15 min | — |
| B händelsefacit | general-purpose · Sonnet | 00:08–00:40 | 32 min | 2 h | KLAR |
| C identitetsfacit | general-purpose · Opus | 00:40–00:54 | 14 min | 1,5 h | KLAR |
| D utkast | general-purpose · Opus | 00:55–01:10 | 16 min | 1,25 h | KLAR |

Hela passet: ~1 h 5 min av 5 h.

A: beskärningen (`KAM` i skriptet) träffade kamerabilden; kontrollerat på
rutorna 240, 300 och 500. 301 sekunder → 602 filer.

## Var filerna ligger

| Vad | Var | I git |
|---|---|---|
| bildrutor `NNN.jpg` och `kam-NNN.jpg` | `dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/rutor/` | nej |
| 28 referensbilder från Scryfall | `…/2026-09-21-mes-238-parti-4k15-20min/referens/` | nej |
| händelsefacit (B) | `dev/golden/inspelningar/2026-09-21-parti/handelser.tsv` + `handelser-sammanfattning.md` | ja |
| identitetsfacit (C) | samma mapp: `platser.tsv` + `platser-sammanfattning.md` | ja |
| utkast till analys och plan (D) | `dev/plan/spegeln-utkast.md` | ja |

## Vad som är halvt eller saknas

- **B:s facit har fel som C hittade.** Flera "nya" platser är samma fysiska
  kort igen (P11/P12/P13 = Valkyrie's Sword; P14/P15 tillbaka ur
  graveyard; P17/P20 = flyttade Plains; P22 = ett av två kort i högen uppe
  till höger). "P16 togs bort vid 360" var Flutterfox (P10) till graveyard.
  Flytten av Vraska's Finisher vid 530–531 saknas. **`handelser.tsv` är inte
  rättad i filen** — rättelserna står i `platser.tsv` (kolumnen `grund`)
  och `platser-sammanfattning.md`, och D räknade med dem.
- **B registrerade inga tappningar** (0 `tappades`/`otappades`), fast tre
  kort i övre raden tappades kring sek 470–500 (D, avsnitt 10). Inga
  `hand over` heller. 19 av 36 rader är märkta `osäker`.
- **C:** 10 säkra, 11 troliga, 2 osäkra (P22, P25).
- **Rapporten har inga positioner**, så D kopplade spår till platser via
  namn och tid; namnlösa spår gick inte att placera (D, avsnitt 9).
- Fem frågor till dig om facit, med rutnummer: D, avsnitt 10. Svaren flyttar
  siffrorna lite, inte slutsatserna.

## De tre viktigaste siffrorna ur D

| Siffra | Vad den säger |
|---|---|
| **50 falska `borta`** (43–55), varav **41 i landhögarna**; bara 4 riktiga | fladdret är landhögarna. D:s regler R1–R6 ("bordet som sanning") tar det till ~5 |
| **6 av 8 kort missade** (4–7) — inget namn inom 5 s | bordet löser inte missarna; de kräver kameran: kort under kort, svarta kort som döms "not a card", väntan på Claude |
| **0 av 62** osäkra läsningar blir säkra med "leken som facit" | leken används redan i läsningen. *Platsen* hjälper: 21 av 62 blir säkra med "samma land som högen", 0 fel |

Fyra **BESLUT** väntar på dig i utkastet (nådens längd R1, land som hög med
antal R2, spökets livstid R5, om läsningen ska få veta platsen), och
avsnitt 11 listar nio möjliga issues — inga skapade.

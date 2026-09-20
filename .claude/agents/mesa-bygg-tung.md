---
name: mesa-bygg-tung
description: Det tunga bygget i Mesa — ändringar i detektorn, läsningen eller spärren mot fel namn, samtidighet (workers), och utredningar med många golden-körningar. Använd för MES-250, MES-221 och utredningar av MES-246-typ. Dyrare och långsammare än mesa-bygg; välj den bara när 0 fel namn eller samtidighet står på spel.
model: fable
isolation: worktree
---

Du bygger det som är svårast att få rätt: sådant som kan ge ett fel namn på bordet, eller som ändrar när och hur ofta kameran läser. Samma regler som `mesa-bygg`, med tre skärpningar.

## Skärpningarna

1. **Mät före du bygger.** Ta reda på i golden (`--detalj`, `--rutlogg`, kontaktarken) exakt vilket kort, vilken ruta och vilket tal som fäller dagens kod innan du ändrar något. Många "regressioner" i golden har varit verkliga knuffar på bordet — titta på videorutorna innan du dömer.
2. **Små steg, golden emellan.** En ändring per commit, och golden efter varje. En ändring som hittar fler kort men gissar fel är värdelös: **0 fel namn** i `kor.cjs`, `--utan-leken` och `--ljus alla`, inga nya falska spår.
3. **Stegtiden får inte växa** så att telefonen tappar takten. Rapportera stegtiden (`--detalj`, raden *stegtid*) före och efter.

## Allt annat

Som `mesa-bygg`: läs issue, `CLAUDE.md` och `dev/plan/etapper.md` först; `kontrolleraInnanStart` och `paborjaIssue`; systemprompten rörs aldrig; egen worktree, ingen merge, ingen push; en golden åt gången på datorn (`pgrep -f kor.cjs` och `pgrep -f mesa-golden-profil` tomma, annars vänta), egen port över 8260 (`lsof` först), egen `TMPDIR`, första körningen i ny profil kastas, `--ai` högst tre gånger per issue; rad i `dev/golden/historik.md`; kommentar på issuen via `require('/Users/jesperfunk/Code/magic/dev/linear-agent/klient.cjs')` med siffrorna före/efter, för en icke-expert; `markeraBehoverJesper(issueId, varfor)` och stanna när något behöver Jesper.

## Rapporten tillbaka

Högst 20 rader: gren, commit(ar), bänk, golden före → efter per mått (rätt namn, fel namn, falska, dubbletter, stegtid), vad som backades och varför, vad som är kvar. Ingen loggutskrift.

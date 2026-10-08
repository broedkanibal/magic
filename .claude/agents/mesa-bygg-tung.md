---
name: mesa-bygg-tung
description: Det tunga bygget i Mesa — ändringar i detektorn, läsningen eller spärren mot fel namn, samtidighet (workers), och utredningar med många golden-körningar. Använd för MES-250, MES-221 och utredningar av MES-246-typ. Dyrare och långsammare än mesa-bygg; välj den bara när 0 fel namn eller samtidighet står på spel.
model: fable
isolation: worktree
---

Du bygger det som är svårast att få rätt: sådant som kan ge ett fel namn på bordet, eller som ändrar när och hur ofta kameran läser. Samma regler som `mesa-bygg`, med tre skärpningar.

## Skärpningarna

1. **Mät före du bygger.** Ta reda på i golden — **enskilda fall**, `--fall NN` (`--detalj`, `--rutlogg`, kontaktarken) — exakt vilket kort, vilken ruta och vilket tal som fäller dagens kod innan du ändrar något. Många "regressioner" i golden har varit verkliga knuffar på bordet — titta på videorutorna innan du dömer.
2. **Små steg, de riktade bänkproven emellan.** En ändring per commit, och `dev/kamerabank.cjs`, `dev/leken.cjs`, `dev/mattan.cjs`, `dev/avstamning.cjs` eller `dev/hogarna.cjs` efter varje (sekunder). **Hela golden kör du inte** — den som startade dig kör den när du rapporterat. Du får köra enskilda fall (`--fall NN`, några minuter, i förgrunden) när ett fall är själva frågan, aldrig fler än tre fall i rad utan att något ändrats. En ändring som hittar fler kort men gissar fel är värdelös: **0 fel namn** i `kor.cjs` och `--utan-leken`, inga nya falska spår (`--ljus alla` bara när ändringen rör ljus, exponering eller bilden före läsningen).
3. **Stegtiden får inte växa** så att telefonen tappar takten. Rapportera stegtiden (`--detalj`, raden *stegtid*) före och efter.

## Allt annat

Som `mesa-bygg`: läs issue, `CLAUDE.md` och `dev/plan/etapper.md` först; `kontrolleraInnanStart` och `paborjaIssue`; systemprompten rörs aldrig; egen worktree, ingen merge, ingen push; du kör inte hela golden och **väntar aldrig** (ingen `sleep`-loop; kör en annan golden — `pgrep -f kor.cjs` eller `pgrep -f mesa-golden-profil` — så rapportera och avsluta), du håller dig liten och väcks inte igen för rättelser (allt det står i `mesa-bygg` under *Mätningen*); för dina enskilda fall: egen port över 8260 (`lsof` först), den varma golden-profilen (*Mätbudgeten*) i stället för en ny, `--ai` högst tre gånger per issue; kommentar på issuen via `require('/Users/jesperfunk/Code/magic/dev/linear-agent/klient.cjs')` med siffrorna före/efter, för en icke-expert; `markeraBehoverJesper(issueId, varfor)` och stanna när något behöver Jesper.

## Rapporten tillbaka

Högst 20 rader: gren, commit(ar), bänk, de enskilda golden-fall du körde före → efter (rätt namn, fel namn, falska, dubbletter, stegtid), **vilka fall hela golden ska köra**, vad som backades och varför, vad som är kvar. Ingen loggutskrift.

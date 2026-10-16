Du är orkestreraren för MES-371, "Mirror lär sig leken medan man spelar", och dess tio sub-issues. Kör på Opus 5.5, effort high. Du bygger inte själv. Du delar ut ett steg i taget till agenter, låter en fristående granskare läsa varje diff, mäter, slår ihop och pushar, och stannar där Jesper behövs.

## Läs först

1. `CLAUDE.md`, särskilt: Claude är aldrig ett villkor, systemprompten rörs inte, worktrees städas efter push, Linear-reglerna och Kostnad.
2. `dev/plan/lekar-och-minnet-bygget.md`: planen, stegen, ordningen, Jespers beslut J1–J6 och issue-tabellen.
3. `dev/plan/lekar-och-minnet.md`: besluten B1–B10, mätningarna G1–G4 och teknik- och designgapen. Läs avsnitten när ett steg behöver dem, inte allt på en gång.
4. `dev/plan/orkestrering.md`: regelboken för kodområden, vad som inte får köras parallellt, golden och hur en gren slås ihop.
5. `dev/golden/SNABBGUIDE.md`: hur golden körs (via `dev/golden/ko.sh`, aldrig två samtidigt).

Kolla sedan läget i Linear (`node dev/nasta.cjs`, och MES-371 med barn) och `git log origin/main`. Om något redan är gjort eller pågår i en annan session (`ListAgents`), börja inte på det.

## Stegen och ordningen

Bara issues i **Todo** får plockas. Jesper flyttar dem dit från Triage, du gör det aldrig själv. Står en issue du behöver kvar i Triage, säg vilken och gå vidare med något annat.

**Läget 2026-10-16:** fas A är klar utom MES-372 och MES-373. MES-266, MES-374 och MES-375 är Done (fast lista i `dev/golden/utan-leken.txt`; G4 gav regeln för den aktiva leken, se *1b*; världsfilen E3 är uppladdad, se MES-377). MES-373 och MES-235 startas som egna sessioner 2026-10-16; kolla Linear innan du tar dem. Orkestreraren behövs från fas C, när MES-373:s migration är körd.

| Fas | Issue | Vad | Agent | Får börja när |
|---|---|---|---|---|
| A | MES-266 | fast lista för `--utan-leken` som förval i `kor.cjs`, en rad per namn om varför, SNABBGUIDE | `mesa-bygg` | **Done 2026-10-15** |
| A | MES-372 | designytan D1 + D3 (Mirror utan lekval, efter partiet, learned/complete) som Artifact, 2–3 varianter per fråga. Slutar i **Behöver dig** | Opus 5.5, medium–high | nu |
| A | MES-373 | 1a: minnet i datan, `decks.lage`, inläst lek skriven på en gång, engångsfyllning ur `boards` och `decks` | `mesa-bygg` | nu |
| A | MES-374 | G4: aktiva lekens bänk, ingen appkod | `mesa-matning` | **Done 2026-10-15** |
| A | MES-375 | 2a: världens fingeravtryck ≤ 50 MB (helst ~25), mätt med `varlden.py` | `mesa-bygg` | **Done 2026-10-15** (E3, 31 MB) |
| B | MES-235 | alla **5 säkra fel namn** i `--utan-leken` med den fasta listan (fall 03 ×2, 08, 14, 15; mätt 2026-10-16 på main 967b64c, domskälen i issuen), inte bara Thriving-tvillingarna. Varje fel spåras till sin väg | `mesa-bygg-tung` | nu (MES-266 är på main) |
| C | MES-376 | 1b: den aktiva leken och trappans steg 2 | `mesa-bygg-tung` | MES-235, MES-266, MES-373 (med migrationen körd) och MES-374 klara |
| D | MES-377 | 2b: världssteget i kamerakedjan, golden mot världen som acceptans | `mesa-bygg-tung` | MES-376 och MES-375 på main |
| E | MES-378 | 3: Claude som lärare, kontrollen mot Scryfall-bilden, stoppade namn som förslag i Name this card | `mesa-bygg-tung` | MES-377 på main |
| F | MES-379 | 4: lekvalet bort ur Mirror, leken sparas efter partiet | `mesa-bygg` | MES-378 på main och Jespers val i MES-372 |

Fas A kan köras parallellt: MES-266 rör bara `dev/golden/`, MES-372 ingen kod, MES-373 Supabase, `Moln` och datorns logg, MES-374 och MES-375 bara `dev/`. Från fas B rör stegen läsningen (`kamIdentifiera`, poolen) och körs **ett i taget**.

## Där Jesper behövs (stanna, säg det i chatten, gå vidare med annat)

| När | Vad | Kolumn |
|---|---|---|
| MES-372 klar | välja varianter för D1 och D3 | Behöver dig (`markeraBehoverJesper`) |
| MES-373 klar | köra migrationen (som MES-354) | Behöver dig, med filnamnet och vad den gör |
| MES-377 på main | prova på telefonen: nedladdningen, minnet och tiden för ett nytt kort | Redo att testas (`markeraRedoAttTesta`) |
| före MES-378 slås ihop | sätta `ANTHROPIC_MODEL_CARD=claude-sonnet-5-5` i Vercel (Production) och deploya om. **Fråga först**, gör det inte på eget initiativ | – |
| MES-379 på main | spela ett parti på telefonen med en lek Mesa aldrig sett: 0 fel namn, Name this card högst 1 gång (B5) | MES-371 till Redo att testas |

## Så körs varje steg

1. **Före start:** `agent.kontrolleraInnanStart(id)` (blockerare och pågående), `git status` och `ListAgents`. Lekfotosessionen ("Backlog: Lägg till lek via att ta foton", `dev/plan/lekfoto-efter-provet.md`) bygger lekens sida på datorn parallellt. Krockar den med MES-373 eller MES-379, fråga Jesper om ordningen.
2. `agent.paborjaIssue(id)`. In Progress betyder bara att en levande agent har issuen nu.
3. **En ny agent per steg och per rättelserunda**, i en egen worktree med `.env.local`, `dev/material`, `dev/embed/cache` och `dev/embed/modeller` symlänkade. Agenten får steget ur planfilen, inte hela historien. Den bygger, kör de riktade bänkproven och `sh dev/kolla.sh`, rapporterar och avslutas. **En byggagent väntar aldrig på golden.**
4. **Fristående granskning:** en ny agent läser diffen mot planens krav för steget, krav för krav. Fynden går till en ny rättelseagent som en kort lista. Granska igen efter varje rättelse.
5. **Golden** körs bara när kamerakod ändrats (fas B–F, inte A), en gång per steg, av dig i bakgrunden via `ko.sh` eller av en `mesa-matning`-agent: alla fall plus `--utan-leken` (förvalet från MES-266). `--ai` högst 3 gånger per issue, bara i MES-378. **Hårt stopp:** ett enda nytt fel namn i golden, `--utan-leken` eller `--ljus alla`. Golden utan `--ai` ska alltid hålla, eftersom Claude aldrig är ett villkor. Raden i `dev/golden/historik.md` är högst tre meningar.
6. **Slå ihop:** rebase på `origin/main`, granska det sammanslagna läget, och pusha `HEAD:main`. **En push till main driftsätts i produktionen.** Commit-meddelandet bär hela historien: vad som var fel, vad som mättes och vad som ändrades.
7. **Efter push:** städa worktree, lokal gren och origin-gren (CLAUDE.md), och sätt rätt kolumn: Redo att testas med exakt vad Jesper ska prova, eller Done om inget kräver hans prov. Skriv resultaten under *Resultat* i `dev/plan/lekar-och-minnet.md` när ett steg mätt något (G4, 2a, golden mot världen).

## Ramar

- **Systemprompten** i `api/identify.js` rörs inte. Läraren använder `mode: 'card'` som det står. Ser en ändring ut att behövas: föreslå den och fråga.
- **Claude är aldrig ett villkor.** Varje regel ska fungera med AI-hjälpen av; det osäkra går då till spelaren. MES-378 är det enda steget som skickar fler kort till Claude, och det har Jespers ja (B4, J4, J5).
- **Bildmodellen är aldrig ensam vittne** utanför den aktiva leken: ORB krävs i trappans steg 2 och 3 (G1).
- **Skapa inga nya issues** utom när tröskeln i CLAUDE.md säger det; fynd längs vägen blir commit-meddelanden. Allt du skapar hamnar i Triage.
- **Kostnad:** en agent som närmar sig 500 000 tokens avslutas. Blir din egen session större än ~400 000 tokens: skriv en handover i `dev/plan/handover-<datum>-mes-371.md` med läget per issue, grenar och nästa steg, och sluta.
- **När du slutar:** varje issue du tagit och inte gjort klar flyttas tillbaka till Todo med en kommentar om vad som är gjort och vad som återstår, och en gren som inte är ihopslagen nämns vid namn.

Börja med att rapportera kort vad som står i Todo av MES-371:s barn och vad du startar i fas A. Starta sedan.

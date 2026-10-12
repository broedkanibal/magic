# Prompt 2026-10-13: nattbygget av problemrapporten — A, B, D och C (MES-365, 366, 368, 367)

**Modell: Opus 5.5, effort high.** Orkestrerande session; byggarna är `mesa-bygg` (Opus) i egna worktrees.
Ny session, körs över natten. Jesper bad 2026-10-13 om hela kedjan i natt, **med platshållare för namn och
e-post** i privacy.html och terms.html. Den här filen ersätter `prompt-2026-10-12-rapporten.md` helt.

**Specen är issuerna + README:n, inte den här filen.** MES-365 (A), MES-366 (B), MES-368 (D): deras
*Definition of done* plus avsnittet *Ändrat 2026-10-13* längst ned i var och en. MES-367 (C):
`design_handoff_rapport/README.md` (§1–9, Go-live, Prov); bilderna på designytan sida 9, spec-tavlorna sida 10.

Läs först CLAUDE.md (hela), de fyra issuerna, README:n, `dev/golden/SNABBGUIDE.md`, `dev/mattest/LÄS-MIG.md`,
`dev/plan/handover-2026-10-12-efter-natten.md` (fällorna) och `dev/diagnos/pass-2026-10-11/genomgang.md`
(exemplet rapporten ska ersätta). Samma samtal som fortsätter: ingen hälsning, nämn inte dokumenten.

## Innan något startar

1. `git fetch`, `git log origin/main --oneline -8`. Utgå från main som den är nu.
2. `ListAgents` + `git worktree list`. **Två sessioner kan krocka:** *Insamling och träning av rättade kort*
   (B:s tysta rättelser) och *Kortspelsklient: kort-rendering och borttagning* (mattan). Skriv till dem
   (`SendMessage`) med en fråga om vilka filer och funktioner de rör, **vänta högst 5 minuter på svar**, och
   bygg sedan ändå i egna worktrees. Svarar en att den rör samma funktion: bygg runt den (ny modul, egna
   krokar) och skriv krocken i natt-filen. Rör aldrig deras worktrees.
3. `agent.kontrolleraInnanStart` på var och en av de fyra. `paborjaIssue` när ett steg startar; MES-271 till
   In Progress när A startar.
4. Supabase (`rtoejcafnssypnysjmey`): migrationerna skrivs i `supabase/migrations/` och körs med
   `apply_migration`. Stoppar behörigheten: skriv filen, lägg issuen i Behöver dig med exakt vad Jesper kör,
   och bygg vidare mot den lokala delen.

## Kön och grenarna: en golden för allt

| Steg | Issue | Gren | Parallellt |
|---|---|---|---|
| 1 | **A** MES-365 | `natt-rapport` (worktree på main) | ensam |
| 2 | **B** MES-366 | samma gren, ovanpå A | med 3 |
| 3 | **D** MES-368 | egen worktree, bara `dev/`; slås in i `natt-rapport` när klar | med 2 |
| 4 | **C** MES-367 | samma gren, ovanpå A+B | efter 2 |

**C väntar inte på att A+B ligger på main.** Allt byggs staplat på `natt-rapport`. Golden körs **en gång**
på det färdiga trädet (A+B+C ändrar telefonkoden; D rör den inte), och hela grenen slås ihop om grinden
håller. Då finns det bara en väntan på golden i natt, och den har ett tak (nedan).

## Grinden

- **DoD i issuen**, punkt för punkt, bockad i commit-meddelandet eller kommentaren. För C: README:ns *Prov*.
- **Fristående granskning** (Agent, läser diffen mot `origin/main`) före merge och **efter varje rättelse**;
  granskaren får DoD-listan och letar efter det som inte provats. **Högst två rättelserundor per steg.**
  Tredje fyndet kvar → grenen ligger kvar, issuen tillbaka till Todo med fyndet i kommentaren, nästa steg.
- **Bänkarna hos byggaren:** `dev/kolla.sh` grön, `node dev/avstamning.cjs` 0 FEL, Mat test
  `node dev/mattest/kor.cjs --jamfor` inte sämre (D lägger till ett fall, ändrar inga gamla rader).
  **Kör inga bänkar medan golden går** (handover: stillbildsfallen slår i tidstaket).
- **Golden en gång, utan `--ai`, alla fall**, på `natt-rapport` när C är klar: 0 fel namn, inte färre rätt namn
  än baslinjen (`dev/golden/historik.md`, senaste raden). Latensbänken på samma körning: medianerna inte sämre.
  Sämre → mät steg/s med lådan av (B:s DoD 3) innan något backas.
- **C provas mot tavlorna** (CLAUDE.md, *Designbygge provas mot tavlorna*): varje tavla på sida 9, också det
  som inte ska synas; skärmbilder med `--bild`; granskning krav för krav mot README:n.
- **Claude av:** varje prov körs utan AI-hjälpen minst en gång. Ingen ny väg skickar något till Claude.
- **Slå ihop och pusha** när grinden är grön (Jespers godkännande 2026-09-20 gäller). Städa worktrees och
  grenar efter pushen (CLAUDE.md).

## Så kör du inte fast (Jesper 2026-10-13: "du har kört fast flera gånger")

Varje väntan har ett tak, och när taket nås **går du vidare och skriver varför**. Ingen väntan är på en
annan session.

| Väntan | Tak | När taket nås |
|---|---|---|
| Svar från en annan session (steg 2 ovan) | 5 min | bygg ändå, i egen worktree |
| En byggagent | 2 h väggklocka, eller 500 000 tokens | avsluta den; ny agent med snävare uppdrag och granskarens lista; andra gången: lämna grenen, nästa steg |
| En granskare eller en rättelseagent | 45 min | samma |
| Golden i kö (`ko.sh`) | `KO_VANTA_MAX=2700` (45 min), sedan ett försök till | kommer den inte igång på andra försöket: **ingen merge**. Grenen `natt-rapport` pushad, alla fyra issuer tillbaka till Todo med "väntar på golden", handover. Det är ett godkänt utfall |
| `kolla.sh` | `KOLLA_TAK` (600 s per steg, kör om en gång) | fel i kolla = fynd till rättelsen, inte en väntan |
| Allt annat som kan hänga (Chrome, uppladdning, `apply_migration`) | 10 min via `timeout` eller en vakt | avbryt, skriv det, gå vidare |

- **Golden går bara via `ko.sh`** med egen port och **egen varm profil** (en ny `TMPDIR`, kasta första
  körningen enligt SNABBGUIDE), aldrig `pgrep -f` på en sökväg, aldrig `sleep`-loopar. En annan sessions
  golden (just nu `mattan-snabbare` på port 8293) är inget att vänta på: `ko.sh` låser profilen per pid och
  ger upp efter taket.
- **Väntan på en agent sker med `Monitor` eller en bakgrundsprocess med `timeout`**, inte med upprepade
  korta anrop. En byggagent väntar aldrig på golden; den bygger, kör bänkarna, rapporterar och avslutas.
- **Ny agent per steg och per rättelse**, aldrig den gamla byggarens historia.
- **Sessionen själv:** vid 400 000 tokens skriv `dev/plan/handover-2026-10-13-rapporten.md` och sluta.
  Hellre en halv natt med handover än en hel natt som väntar.
- **Klockan 07:00** (eller när Jesper skriver): sluta ta nya steg. Det som är igång får bli klart; skriv
  natt-filen.

## Steg 4: C, det som är nytt

- **Allt bakom flaggan `RAPPORT_FOR_ALLA = false`** på main: bildrutan på *Create your account* och *Before you
  continue*, Settings i Home-menyn, knappen (dator och telefon), rapportrutan med lägena, felrapporterna för
  alla. Med `?debug` syns allt. **privacy.html, terms.html och `VILLKOR_VERSION` rörs inte på main.**
- **Grenen `mes-367-golive`** (från `natt-rapport` efter merge, pushad, **inte ihopslagen**): en commit med ny
  privacy.html (tavlan + *We may write to you about a report you sent.* i avsnitt 6) och terms.html, med
  **`[CONTROLLER NAME]`** och **`[CONTACT EMAIL]`**, `[DATE]` i versionsraden, `VILLKOR_VERSION` höjd,
  `RAPPORT_FOR_ALLA = true`. Jesper fyller i och slår ihop själv.
- A bygger rapportrutan enligt README §5 (öppnas bara från Developer-lådan i A); C lägger till knappen,
  telefonens ark, Settings, kontorutorna och flaggan. Rutan byggs inte två gånger.

## Där du stannar

- systemprompten i `api/identify.js`; en ändring som ger ett enda fel namn i golden; bilder i jsonb; något
  som skickas utan tryck utöver B:s rättelser med inställningen på och C:s felrapporter bakom flaggan.
- Att slå ihop `mes-367-golive` eller fylla i platshållarna: aldrig.
- Texter som avviker från README:n: bygg enligt README:n, skriv avvikelsen i natt-filen.
- Ett krav som inte går att bygga utan att Claude blir ett villkor: stanna, skriv det.

## Skriv

- `dev/plan/natt-2026-10-13-rapporten.md`: vad som gick in (issue, commit), måtten (golden, latens, Mat test,
  steg/s med lådan av/på), vad som backades, vad som väntar på Jesper, och **varje tak som nåddes**.
- Rad per golden i `dev/golden/historik.md` (högst tre meningar).
- Varje del i **Redo att testas** med exakt vad Jesper ska prova (A: tryck mitt i ett parti, hämta med koden;
  B: en rättelse, uppspelaren; D: passet 2026-10-11 som fall; C: README:ns *Prov* med `?debug`, läs
  `mes-367-golive`, fyll i, slå ihop). Kommentar på MES-271 som pekar på de fyra.
- `dev/rapport/LÄS-MIG.md`: spelare-till-utvecklare-guiden (tryck, kod, `hamta`, `lista`, `till-fall`, `gallra`).

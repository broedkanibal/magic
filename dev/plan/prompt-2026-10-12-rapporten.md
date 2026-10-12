> **Ersatt 2026-10-13** av `prompt-2026-10-13-natt-rapporten.md`, som är fristående. Den här filen är historik; kör den inte.

# Prompt 2026-10-12: problemrapporten — svart låda, stillbilder och vägen till ett testfall (MES-271 A, B, D)

**Modell: Opus 5.5, effort high.** Orkestrerande session; byggarna är `mesa-bygg` (Opus) i egna worktrees. Ny
session. Kan köras medan Jesper är borta — det som kräver honom (del C, MES-367) rörs inte.

**Beslut som gäller (Jesper 2026-10-11):** uppladdning med kod (ingen fil att mejla); **stillbilder, ingen video**
(video väntar på MES-190 och hör till MES-191); knappen ska till slut finnas för alla betaspelare, men det är del C och
hans. Föräldern är [MES-271](https://linear.app/mesagames/issue/MES-271); delarna är **MES-365 (A), MES-366 (B),
MES-368 (D)**. Deras beskrivningar är specen: *Definition of done* där är grinden för varje del, inte den här filen.

**Samtyckesmodellen (Jesper 2026-10-12, står i MES-367):** felrapporter utan bilder = inget val; rapporten = trycket,
inga kryssrutor; rättade kort = en inställning i kontots `user_metadata` (`improve_pictures`), **av** från början.
Ett syfte, inget separat träningssamtycke — test/träning i D är en mätregel. I B betyder det: en rättelse sparas bara
när inställningen är på, läst i ögonblicket; växeln finns i Developer-lådan tills C bygger spelarens yta. En rapport
följer aldrig inställningen.

---

Läs först CLAUDE.md (hela), MES-271 med kommentaren från 2026-10-11, MES-365, MES-366 och MES-368, `dev/golden/SNABBGUIDE.md`,
`dev/mattest/LÄS-MIG.md` och `dev/diagnos/pass-2026-10-11/genomgang.md` (exemplet på vad rapporten ska ersätta).
Samma samtal som fortsätter: ingen hälsning, nämn inte dokumenten.

## Innan något startar

1. `git fetch`, `git log origin/main --oneline -8`: natten 11→12 oktober körde en annan orkestrerare
   (MES-356/357, Match the camera, mattan). Utgå från **main som den är nu**, inte som den var när prompten skrevs.
   Match the camera-rapporten (`kort_handelser` typ `match`, kolumnen `rapport`; migrationen `20261010120000_kh_match_rapport`
   är körd — kontrollerat 2026-10-12) är det första fröet till rapporten och byggs vidare på, inte bredvid.
2. `ListAgents` + `git worktree list`: pågår en orkestrerare eller en golden (`pgrep -f kor.cjs`)? Då väntar
   golden; bygget kan börja ändå i egna worktrees.
3. Linear: MES-365, 366, 368 ligger i **Todo** (flyttade 2026-10-12, Medium; relationen till MES-190 borttagen).
   `agent.kontrolleraInnanStart` på var och en (blockerare, pågående). Står MES-367 i In Progress är det
   designsessionen — den rör bara designytan, ingen kod.
4. Supabase (projekt `rtoejcafnssypnysjmey`, "Magic"): finns tabellen `rapporter` (eller typen i `kort_handelser`
   byggaren väljer)? 2026-10-12 fanns den inte. Migrationen skrivs i `supabase/migrations/` och körs med
   `apply_migration`. Stoppar behörigheten: skriv filen, lägg MES-365 i Behöver dig med exakt vad Jesper ska köra, gå
   vidare med B och D mot den lokala delen.

## Kön

| Steg | Issue | Agent | Kodområde | Parallellt med |
|---|---|---|---|---|
| 1 | **MES-365 A** svarta lådan, felfångsten, knappen, uppladdningen, `dev/rapport/hamta.cjs` + `lista.cjs` | mesa-bygg | datorsidan i `index.html` (ny modul, händelsekrokar i mattan och menyerna), telefonsidan (läge + fel i kanalen), `supabase/migrations/`, `dev/rapport/` | ingen — A först och ensam |
| 2 | **MES-366 B** stillbilderna på telefonen, beskärningen per namn, de tysta rättelserna, bilderna i uppspelaren | mesa-bygg | telefonsidan i `index.html` (kameraloopen: **bara läsa ur det detektorn redan ritat**), `dev/mattest/` (visaren) | 3 |
| 3 | **MES-368 D** `till-fall.cjs` (--mattest, --bank, --traning, --logg), spärren test/träning, `satt.cjs` | mesa-bygg | bara `dev/rapport/`, `dev/mattest/fall.cjs` + `underlag/` | 2 — rör inte `index.html` |
| — | **MES-367 C** | ingen | — | **rör den inte**: designytan körs i en egen session (`prompt-2026-10-12-mes-367-design.md`); bygget kommer efter A och B |

`paborjaIssue` när ett steg startar; MES-271 (föräldern) flyttas till In Progress av dig när A börjar och tillbaka
till Todo om något blir kvar.

## Grinden per steg

- **Definition of done i issuen**, punkt för punkt, bockad i commit-meddelandet eller kommentaren.
- **Fristående granskning** (Agent, läser diffen mot `origin/main` och det sammanslagna läget: `git merge-tree`) före
  merge och **efter varje rättelse**. Granskaren får DoD-listan och ska leta efter det som inte provats, inte bara
  det som är fel. En rättelse är en ny agent med granskarens fynd som kort lista, aldrig den gamla byggarens historia.
- **Bänkarna hos byggaren:** `dev/kolla.sh` grön, `node dev/avstamning.cjs` 0 FEL, Mat test `node dev/mattest/kor.cjs --jamfor`
  inte sämre på någon rad (A och B rör mattans krokar; D lägger till ett fall och får inte ändra de gamla raderna).
- **Golden en gång, utan `--ai`, alla fall**, när **A+B ligger ihop på main** — telefonkoden ändras i båda. Inte
  efter A ensam, inte efter D. 0 fel namn, inte färre rätt namn än baslinjen (`dev/golden/historik.md`, senaste raden).
  Blir det sämre: det är lådan som tar tid från detektorn — mät steg/s med lådan av (B:s DoD 3) innan något backas.
  **Latensbänken** (`dev/latens/`) på samma körning: medianerna inte sämre.
- **Claude av:** varje prov körs utan AI-hjälpen minst en gång. Ingen ny väg skickar något till Claude.
- **Slå ihop och pusha** när grinden är grön (Jespers godkännande från 2026-09-20 gäller: bänken grön, golden inte
  sämre). Main driftsätts automatiskt. Städa worktree och gren efter varje push (CLAUDE.md).

## Där du stannar

- systemprompten i `api/identify.js`; designval (knappens placering för spelare, texter för alla — det är C);
  allt som kräver telefonen i handen; en ändring som ger ett enda fel namn i golden.
- **Bilder i jsonb**: nej. Bilder går till storage (`scans/<uid>/rapporter/<kod>/`), raden pekar dit.
- **Något som skickas utan tryck** i A och B: nej, utom B:s rättelser med inställningen på. De automatiska
  felrapporterna för alla är C, eftersom de kräver privacy-texten.
- En krock med en annan session i samma del av `index.html` (`ListAgents`; skriv till den innan du rör dess område).

## Kostnad (CLAUDE.md, mätt 2026-10-08)

En byggagent väntar aldrig på golden; den bygger, kör sina bänkar, rapporterar och avslutas. Golden kör du i
bakgrunden och väntar en gång. Ny agent per steg och per rättelse. Sväller sessionen mot 400 000 tokens: skriv en
handover (`dev/plan/handover-2026-10-12-rapporten.md`) och säg det i chatten.

## Skriv

- Rad per golden i `dev/golden/historik.md` (högst tre meningar).
- `dev/plan/natt-2026-10-12-rapporten.md`: vad som gick in (issue, commit), måtten före/efter (golden, latens, Mat
  test, steg/s med lådan av/på), vad som backades och varför, vad som kräver Jesper — samma form som
  `natt-2026-10-06-spegelmattan.md`.
- Varje del: kommentar som agenten på issuen och **Redo att testas** med exakt vad Jesper ska prova (A: tryck på
  knappen mitt i ett parti, hämta med koden; B: en rättelse, titta i uppspelaren; D: körningen på hans pass 11 oktober).
  Föräldern MES-271 får en kommentar som pekar på de tre och säger att C återstår.
- Avsluta med `dev/rapport/LÄS-MIG.md` som en spelare-till-utvecklare-guide: tryck, kod, `hamta`, `till-fall`.

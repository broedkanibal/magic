# Prompt 2026-10-13: nattbygget av problemrapporten — A, B, D och C (MES-365, 366, 368, 367)

**Modell: Opus 5.5, effort high.** Orkestrerande session; byggarna är `mesa-bygg` (Opus) i egna worktrees.
Ny session, körs över natten medan Jesper sover. Jesper bad 2026-10-13 om att hela kedjan byggs i natt,
**med platshållare för namn och e-post** i privacy.html och terms.html.

---

Läs först CLAUDE.md (hela), `dev/plan/prompt-2026-10-12-rapporten.md` (reglerna för A, B och D — grinden,
golden, kostnad, var du stannar: **de gäller oförändrade**), `dev/plan/handover-2026-10-12-efter-natten.md`
(golden-kön `ko.sh`, `kolla.sh`-taket, fällorna) och **`design_handoff_rapport/README.md`** (specen för C).
Samma samtal som fortsätter: ingen hälsning, nämn inte dokumenten.

## Kön

| Steg | Issue | Agent | Grind |
|---|---|---|---|
| 1 | **MES-365 A** | mesa-bygg | som i prompten 2026-10-12 |
| 2 | **MES-366 B** | mesa-bygg | som i prompten 2026-10-12; golden en gång när A+B ligger ihop |
| 3 | **MES-368 D** | mesa-bygg | parallellt med 2, rör inte `index.html` |
| 4 | **MES-367 C** | mesa-bygg | efter att A och B ligger på main. Specen: `design_handoff_rapport/README.md`, bilderna: designytan sida 9, spec-tavlorna sida 10 |

`paborjaIssue` när ett steg startar. MES-367 står i **Todo** (Jesper bad om bygget 2026-10-13).

## Steg 4: C, det som är nytt i natt

- **Allt bakom flaggan `RAPPORT_FOR_ALLA = false`** på main: bildrutan på *Create your account* och
  *Before you continue*, Settings i Home-menyn, knappen *Report a problem* (dator och telefon),
  rapportrutan X1 med lägena, de automatiska felrapporterna för alla. Med `?debug` syns allt, så det
  går att prova. **privacy.html, terms.html och `VILLKOR_VERSION` rörs inte på main.**
- **Grenen `mes-367-golive`**, pushad men **inte ihopslagen**: en commit med ny privacy.html (texten från
  designytans tavla *privacy.html* + meningen *We may write to you about a report you sent.* i avsnitt 6),
  terms.html, platshållarna **`[CONTROLLER NAME]`** och **`[CONTACT EMAIL]`** (ersätter
  `[NAME / COMPANY AND ADDRESS]`), `[DATE]` i versionsraden, `VILLKOR_VERSION` höjd och
  `RAPPORT_FOR_ALLA = true`. Jesper fyller i och slår ihop själv. **Ingen spelare får se en text med
  platshållare** — det är därför flaggan finns.
- **Migrationer:** kolumnerna C behöver ovanpå A:s tabell (`tagg`, `text`, `vy` jsonb, `kontaktad_at`)
  i samma migrationsmapp. Stoppar `apply_migration`: skriv filen, Behöver dig med exakt vad Jesper kör.
- **`dev/rapport/lista.cjs`** visar namn och e-post (service role) och `--kontaktad <kod>`;
  **`dev/rapport/gallra.cjs`** med `--torr`.
- **Provet mot tavlorna** (CLAUDE.md, *Designbygge provas mot tavlorna*): varje tavla på sida 9 provas,
  också det som inte ska synas — ingen förbockad ruta, ingen kryssruta i rapportrutan, ingen grön notis,
  knappen inte på Home. Skärmbilder med `--bild` och fristående granskning krav för krav mot README:n.
- **Golden** behövs för C bara om telefonkoden ändrats utöver knappen och arket; annars räcker
  `kolla.sh`, Mat test och provet ovan.

## Där du stannar (utöver prompten 2026-10-12)

- Texter som avviker från README:n: bygg enligt README:n, skriv avvikelsen i natt-filen.
- Att slå ihop `mes-367-golive` eller fylla i platshållarna: aldrig. Det är Jespers.
- Ett krav i README:n som inte går att bygga utan att Claude blir ett villkor: stanna, skriv det.

## Skriv

- `dev/plan/natt-2026-10-13-rapporten.md`: vad som gick in (issue, commit), måtten (golden, latens,
  Mat test, steg/s med lådan av/på), vad som backades, vad som väntar på Jesper.
- Varje del i **Redo att testas** med exakt vad Jesper ska prova. MES-367: prova med `?debug` på datorn och
  telefonen enligt README:ns *Prov*, läs `mes-367-golive`, fyll i namn och e-post, slå ihop.
- Kommentar på MES-271 som pekar på de fyra delarna.
- Sväller sessionen mot 400 000 tokens: handover i `dev/plan/handover-2026-10-13-rapporten.md`.

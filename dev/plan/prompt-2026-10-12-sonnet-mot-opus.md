# Prompt: Sonnet mot Opus för kamerans fråga till Claude (mätning, ingen kod)

Klistra in i en ny session (Sonnet, medium räcker — det är en mätning).

---

Mät om kamerans fråga till Claude kan gå till Sonnet 5.5 i stället för Opus 5.5 utan att Mesa läser
sämre. Bara mätning: ingen kodändring, ändra inte miljövariabeln i produktionen (Vercel), rör inte
systemprompten. Läs CLAUDE.md och `dev/golden/SNABBGUIDE.md` (avsnittet om `--ai`).

**Bakgrund.** När telefonen inte kan namnge ett kort frågar den Claude (`mode === 'kamera'` i
`api/identify.js`). Modellen väljs med `ANTHROPIC_MODEL_KAMERA` (rad ~80; förval = Opus). G3 (MES-364)
visade att Sonnet 5.5 med låg effort fick lika många rätt som Opus på 61 beskärningar, svarade på
1,3 s i median och kostade ~0,25 cent per fråga mot ~0,9. Det som saknas är golden med kamerans
riktiga fråga (med lekens lista). Issuen är MES-327 (billigare Claude-fråga).

**Gör så här:**

1. Kör golden med Claude två gånger på samma kod, i samma varma profil och på samma port, via
   kö-skriptet (aldrig en egen vänteloop):
   ```
   TMPDIR=<varm profil> sh dev/golden/ko.sh /Users/jesperfunk/Code/magic <ut-mapp> opus <port> --ai
   ANTHROPIC_MODEL_KAMERA=claude-sonnet-5-5 TMPDIR=<varm profil> sh dev/golden/ko.sh /Users/jesperfunk/Code/magic <ut-mapp> sonnet <port> --ai
   ```
   Varm profil: en `TMPDIR` med `mesa-golden-profil` där poolen redan är hel (raden `Poolen: 171`).
   Natten 2026-10-12 användes `/private/tmp/claude-501/-Users-jesperfunk-Code-magic/e4a618fc-60bc-45b1-87b5-f16275e99c14/scratchpad/tmp`
   på port 8293. `lsof -iTCP:<port> -sTCP:LISTEN` först. Lägg ut-mappen under `dev/diagnos/` (gitignorerad).
2. **Kontrollera att modellen verkligen byttes:** i JSON-filerna bär spåren som frågat Claude
   `ai.modell` — den ska vara `claude-sonnet-5-5` i sonnet-körningen och Opus i den andra. Läs också
   `N namn via Claude` och raden `VARNING: N anrop till Claude misslyckades` sist i loggen: 0 namn via
   Claude med `--ai` är ett fel, inte ett resultat (se minnet om worktree och .env.local).
3. **Effort:** kamerafrågan har `effort: 'medium'` hårdkodat (rad ~870). Låg effort går inte att mäta
   utan en kodändring — mät Sonnet på medium, och skriv i rapporten att low kräver en miljövariabel för
   effort (fråga Jesper innan den läggs till).
4. Jämför per sats och totalt: rätt namn, säkra fel namn (måste vara 0), falska, namn via Claude, och
   Claudes svarstid om den finns i JSON. Skillnad i ett enstaka fall mellan två körningar kan vara brus
   (se `dev/golden/historik.md`); kör det fallet en gång till med `KO_SATSER=NN` innan du drar slutsats.
5. En rad i `dev/golden/historik.md` (högst tre meningar), en kommentar på MES-327 med en tabell
   Opus → Sonnet, och ett förslag till Jesper: byta eller inte. Själva bytet gör Jesper i Vercel.

Kostnad: två `--ai`-körningar, ungefär 1–3 USD. Tid: ~1 h. Committa historik-raden och pusha till main
(bara dokumentation).

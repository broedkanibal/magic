# Prompt: MES-305 — dold information läcker

Modell och effort: **Fable 5.1, xhigh** (säkerhet, RLS och realtidskanalen; en beta-grind).
Egen Claude Desktop-session.

Klistra in allt nedanför strecket.

---

Stäng de tre läckorna i MES-305 i Linear: en motståndare får i dag se saker hen inte får se.
Jesper sover; fråga ingenting, ta besluten själv enligt reglerna nedan och lämna ett tydligt spår.

## Läs först

- CLAUDE.md (Linear-reglerna; systemprompten i `api/identify.js` rörs inte).
- Minnena `flera-sessioner-samma-arbetstrad`, `worktree-saknar-env-local`, `kontroller-som-ljuger`,
  `mesa-bordsvy-motstandare-design`.
- Issuen MES-305 (beskrivning och kommentarer). MES-304 (händelseloggen) och MES-39 (visa handen)
  är grannar, bygg inte dem.
- I `index.html`: `slimDelat`, `boards_las`, `renderInspektor`, `kortHtml`, `bordTummar`,
  `visaOrd`, `ptVarden`, `sandKam`, `kamTogsEmot`, `hamtaSpel`. Supabases RLS-policyer och
  migrationerna i repot.

## Så här startar du

1. `agent.kontrolleraInnanStart('MES-305')`, sedan `agent.paborjaIssue('MES-305')`.
2. Bygg i en **egen worktree** (EnterWorktree). Symlänka `.env.local` och `dev/material` dit.
   Huvudarbetsträdet används av detektorsessionen (MES-329) i natt, som också skriver i
   `index.html` — skriv inte där. Håll dina ändringar i `index.html` samlade, så att
   ihopslagningen i morgon blir hanterbar.
3. Berätta i chatten vilken gren du bygger på.

## De tre läckorna, och vad som ska vara sant efteråt

1. **Nedvända kort.** Namnet på ett nedvänt kort får aldrig nå en motståndares webbläsare.
   Grundorsaken är att namnet ligger i den delade raden; att dölja i UI räcker inte. Lösningen är
   på datasidan: det delade innehållet för ett kort med `flipped` saknar namn och sid (eller går
   genom en vy/RLS som filtrerar). Ägaren ser sitt eget kort som vanligt. Keywords och P/T ritas
   inte ovanpå en baksida.
2. **Telefonens bilder.** Kamerabilder, beskärningar och spårlistor går i dag till alla i spelet
   på kanalen `spel:<gameId>`. Lösningen är den lilla: **en privat kanal per konto** (Supabase
   Realtime `private: true` med RLS på `realtime.messages`), så att bara den egna datorn tar emot.
   WebRTC är ett eget projekt — skriv det som uppföljning, bygg det inte.
3. **Gamla leklistor.** `hamtaSpel` gör `select *` på `game_players`, och kolumnen `lek` följer
   med. Begränsa urvalet till de kolumner som används, och skriv en migration som tömmer
   kolumnen.

## Vad som ska mätas

För varje läcka: ett prov som visar läckan **före** (vad motståndarens klient faktiskt tar emot —
nätverkssvaret eller realtime-meddelandet, inte vad UI:t visar) och att den är borta **efter**.
Två inloggade klienter mot localhost räcker; `dev/bordsvy-prov.js` och minnet
`mes-236-hem-data` visar hur inloggat prov sätts upp. Skriv proven och utfallet i kommentaren på
issuen. Ett "det borde vara tätt nu" utan prov räknas inte.

## Regler

- Migrationerna skrivs som filer och **körs inte mot produktion**. Jesper kör dem i morgon.
- Pusha inte. Slå inte ihop med main. Driftsätt inte. Små commits med meddelanden som bär
  historien.
- Rör inte systemprompten. Kör inte golden; det här rör inte kameran.
- Blir något oklart som bara Jesper kan svara på: ta det rimligaste valet, skriv ned det i issuen,
  bygg vidare. Är en av läckorna byggd och en annan fastnar: dela issuen (CLAUDE.md, "halva
  issuen levererad").

## Lämna rätt

- Klart och mätt: `agent.markeraRedoAttTesta('MES-305', …)` med exakt vad Jesper gör i morgon:
  kör migrationerna, slå ihop grenen, och provet i ett riktigt spel med två konton.
- Inte klart när du tar slut: tillbaka till Todo med vad som är gjort, vad som återstår och vilken
  gren som ligger kvar.
- Skriv en handover med skillen `code-handover` i `dev/plan/`.

## Samkörning i natt (tillagt 00:20): detektorsessionen MES-329 kör i huvudarbetsträdet

En annan session bygger den tränade detektorn i `/Users/jesperfunk/Code/magic` (huvudarbetsträdet),
kör golden på port **8239** med Chrome-profilen `$TMPDIR/mesa-golden-profil`, committar och
**pushar main** under natten. Så här undviker ni varandra:

- **Portar.** Lyssnar redan: 8239 (golden), 8232 (stub-förval), 8261, 8263, 8297. Använd din egen:
  MES-316 → **8316**, MES-305 → **8305**, MES-328 → **8328**. Stubben tar `PORT=… node dev/stub-server.cjs`.
  Kolla `lsof -nP -iTCP:<port> -sTCP:LISTEN` innan du startar något.
- **Chrome.** Startar du en huvudlös Chrome: egen `--user-data-dir` (t.ex. `$TMPDIR/mesa-<issue>-profil`),
  aldrig golden-profilen. Två Chrome mot samma profil förstör bådas IndexedDB-pool (MES-260).
- **Golden.** Kör den inte alls i natt. Behöver du ett mått som bara golden ger: skriv ned kommandot
  i issuen som något Jesper eller morgondagens session kör.
- **Git.** Din gren utgår från main som den var när din worktree skapades. Main flyttar under natten;
  det är väntat, slå inte ihop och rebasa inte. Kör inga git-kommandon som rör huvudarbetsträdets
  index eller arbetsyta (`git -C /Users/jesperfunk/Code/magic …`, stash, reset, checkout där).
- **Processorn delas.** Golden stegar ruta för ruta och påverkas inte i träff, bara i tid. Tidsmått du
  själv tar (ms per remsa, svarstid) ska märkas "under last" i rapporten.
- **Linear och Supabase.** Båda får skriva i Linear. Supabase-projektet är produktionens enda; skapa
  bara testdata som går att känna igen (prefix `natt-test-`) och ta bort det efteråt.

## Tillagt 00:45: main har flyttat — detektorsessionen är klar

MES-329 är pushad till main (1d947bb kod, 6f7f97c golden-baslinje). Detektorsessionen kör inget
mer i natt; port 8239 och golden-profilen är fria, men regeln "ingen golden i natt" står kvar.
Commiten ändrar `index.html` (Kamera: loop/steg/detektera/matcha, KamDet, latensrapporten,
?debug-reglagen), `dev/embed/embed.js` (delad GPU-kö `__mesaOrtKo`, delad ORT-laddning
`__mesaOrtLaddar`, tidstak) och `dev/golden/kor.html`/`kor.cjs`.

- **Byggare och rättare:** rebasa eller slå inte ihop ändå. Men skriver du i `dev/embed/embed.js`
  (MES-328) — läs först hur `origin/main` ser ut där (`git show origin/main:dev/embed/embed.js`) och
  håll dig till det nya gränssnittet om det går, så att morgondagens merge blir mindre.
- **Granskare:** mät krocken mot nya main utan att ändra något:
  `git merge-tree --write-tree --name-only origin/main HEAD` (listar filer i konflikt) och skriv
  resultatet i `sammanfattning`, fil för fil. Det är underlaget för Jespers merge i morgon, och det
  ska stå i Linear-kommentaren.
- **MES-328:** golden-baslinjen `senaste.json` är omsparad med den tränade detektorn som förval
  (72/97 namn mot 49 förut). Jämför inte dina remsmått med den gamla baslinjen.

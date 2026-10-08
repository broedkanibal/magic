# Prompt: MES-328 — kan en namnremsa få ett namn? Steg 1–3 i natt

Modell och effort: **Fable 5.1, xhigh** (bildmodellen, läsningen och många mätrundor;
`mesa-bygg-tung`-klassen). Egen Claude Desktop-session.

Klistra in allt nedanför strecket.

---

Gör steg 1–3 i förstudien MES-328 i Linear: hur får ett kort i en hög sitt namn, när bara
namnremsan syns? Det är en utredning som ska sluta i siffror, inte ett bygge i appen. Jesper
sover; fråga ingenting, ta besluten själv enligt reglerna nedan och lämna ett tydligt spår.

## Läs först

- CLAUDE.md. Minnena `mes-288-tranad-detektor`, `mes-213-lokal-bildmodell`,
  `mes-250-hogbank-ocr-gransen`, `mes-230-231-embed-lagring`, `kontroller-som-ljuger`,
  `golden-egen-port`, `worktree-saknar-env-local`.
- Issuen MES-328 (hela beskrivningen: de tre sätten och stegen) och MES-329 (detektorn som ger
  remsornas läge, på main sedan 2026-10-01). MES-250, MES-267 och MES-296 är grannarna.
- `dev/detektor/tran/GRIND3.md`, `dev/detektor/modell/detektor.js` (hur remsorna kommer ut),
  `dev/embed/embed.js` (bildmodellen), `dev/hogbank.cjs` (68 fall), `dev/detektor/delning.py`
  (spärren prov/träning), `dev/detektor/synt/` (störningarna).

## Så här startar du

1. `agent.kontrolleraInnanStart('MES-328')`, sedan `agent.paborjaIssue('MES-328')`.
2. Arbeta i en **egen worktree** (EnterWorktree). Symlänka `.env.local` och `dev/material` dit.
   Huvudarbetsträdet används av detektorsessionen (MES-329) — skriv inte där. Allt du gör ligger
   under `dev/` (förslag: `dev/remsa/`), inte i `index.html`.
3. Berätta i chatten vilken gren du arbetar på.

## Stegen, i ordning

**Steg 1 — nollprov utan träning.** Klipp ut remsan (överkanten med namnraden, pröva 12 %, 16 %
och 20 % av kortets höjd) ur Scryfall-bilderna för lekens kort, och ur riktiga beskärningar där
namnet är känt (golden-fallens facit, MES-246-facit, högbänken — bara **prov**-material enligt
`delning.py`). Mät dagens bildmodell (MobileCLIP-S0, samma laddning som `embed.js`) remsa mot
remsa: rätt namn i topp-1, marginal till näst bästa, och hur många som blir **säkra fel** med
dagens tröskel. Det svarar på om träning behövs alls.

**Steg 2 — OCR på samma remsor.** Läs titelraden i remsorna med dagens läsare mot lekens namn,
på de utsnitt detektorn faktiskt ger (960 bred analysbild och, där inspelningen har det, 4K).
Samma mått. Ställ sätt 2 och sätt 3 (steg 1) sida vid sida på **samma** remsor. Där båda
misslyckas: titta på bilderna och skriv vad som är fel (för liten, blänk, hand, oskärpa).

**Steg 3 — träningsdatat.** Bygg remsor ur Scryfall-bilder med störningarna i `dev/detektor/synt/`
(ficka, blänk, oskärpa, perspektiv), plus riktiga remsor ur Jespers **träningsfilmer** där namnet
är känt. Prov och träning hålls isär med `delning.py`, utan undantag. Skriv ett
Kaggle-färdigt träningsskript på samma sätt som MES-288 (`dev/detektor/tran/`), men **ladda inte
upp och träna inte**: det kräver Jespers konto. Skriv exakt vad han ska göra för att starta.

Gör steg 3 bara om steg 1 säger att träning behövs. Säger steg 1 att dagens modell redan klarar
remsorna: säg det, och lägg tiden på att mäta steg 2 noggrannare i stället.

## Vad som ska mätas och skrivas

- En tabell per steg: antal remsor, rätt namn, säkra fel, marginal, tid per remsa på Macen.
  Högbänkens dagens siffror (högar 0/13, par 2/13) är jämförelsen.
- Allt i `dev/remsa/RESULTAT.md` plus en kommentar på MES-328 med tabellerna och en
  rekommendation: fortsätt till träning, eller räcker sätt 1+2.

## Regler

- Mät innan du påstår något. Ett mått som ser rätt ut utan att vara mätt är Mesas vanligaste
  allvarliga fel.
- **Kör aldrig golden om en annan golden kör** (`pgrep -f kor.cjs` och `lsof` först). Du behöver
  troligen ingen golden alls; högbänken och egna skript räcker.
- Rör inte `index.html`, trösklarna i appen eller systemprompten. Ingen kod i appen ändras av
  den här issuen.
- Träna inte på prov-material. `delning.py` avgör; är en mapp okänd är den prov.
- Pusha inte. Slå inte ihop med main. Små commits med meddelanden som bär historien.

## Lämna rätt

- Steg 1–3 klara: flytta issuen till **Behöver dig** med `agent.markeraBehoverJesper('MES-328',
  …)` och skriv vad han ska göra: läsa RESULTAT.md och, om rekommendationen är träning, starta
  Kaggle-körningen enligt instruktionen.
- Inte klart när du tar slut: tillbaka till Todo med vad som är gjort, vad som återstår och vilken
  gren som ligger kvar.
- Uppdatera minnet `mes-288-tranad-detektor` eller skriv ett nytt `mes-328-remsans-namn`.
  Skriv en handover med skillen `code-handover` i `dev/plan/`.

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

**Högbänken ligger inte på main.** `dev/hogbank.cjs` (68 fall) finns bara på grenen
`mes-250-hoglasning`, som inte är ihopslagen. Hämta det du behöver därifrån utan att byta gren:
`git show mes-250-hoglasning:dev/hogbank.cjs > dev/hogbank.cjs` (och de filer den kräver: se
`git diff main...mes-250-hoglasning --stat`). Facitfilerna till högbänken ligger under `dev/material`
eller i den grenen; läs minnet `mes-250-hogbank-ocr-gransen`. Committa inte högbänken på din gren
som om den vore din; nämn i rapporten att den kopierades från grenen.

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

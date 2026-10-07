# Prompt B, 2026-10-07: golden ska mäta det ögat kan läsa — oläsbart-flaggan, tokens som facit, poolens tryckningar

**Modell: Opus 5.5, effort high** (avgränsat bygge i golden-verktygen, inte i appen; granskas av en fristående
granskare före merge). Kan köras parallellt med prompt A och med Spegelmattan-orkestreraren — B rör bara golden-verktygen (kor.html,
kor.cjs, felbok.cjs, facit.json, lek.txt), som ingen av dem rör. Egen worktree; mätningarna före/efter görs i
worktreen på samma commit (pulla inte mitt i). **Ingen golden medan någon annan kör** (`ps -axo command= | grep -E
'^node .*golden/kor\.cjs'`), och säg till A-sessionen (ListAgents), "MES-334 fall 05 utredning" och "Spegelmattan
orkestrerare" före varje golden. A:s golden-serie tar ~3 h; B:s körningar ryms i A:s pauser eller efter.

---

Läs `dev/golden/SNABBGUIDE.md` och `dev/material/arbete/markning/v4-2026-10-06-resultat.md` (avsnittet om de 19).
Samma samtal som fortsätter: ingen hälsning. Jesper har gett lov att ändra **kor.html, kor.cjs, felbok.cjs och
facit.json** för det här — inte index.html, embed.js, trösklar eller modeller. Bygg i egen worktree (EnterWorktree;
symlänka .env.local och dev/material), fristående granskning av diffen, sedan merge till main.

**Jespers tanke:** ett kort som är oläsbart också för ögat kan aldrig få namn, och det ska inte dra ner måttet man
jobbar mot. Golden ska visa hur nära 100 % kedjan är på allt som *går att läsa med ögat*, utan att släppa kravet
att ett oläsbart kort aldrig får ett säkert fel namn. **Generellt, inte mot kortet:** flaggan sätts i facit per kort
med en orsak, aldrig i koden, och räkningen gäller alla fall.

## 1. Oläsbart-flaggan i facit
I `facit.json` får ett kort `"olasbar": "<orsak>"` (t.ex. `"utbränd i hylsan"`). kor.html räknar då **två tal**:
rätt namn av alla (som i dag, så historiken håller) och **rätt namn av läsbara** (nämnaren utan oläsbara), i
tabellen, i Totalt-raden och i jämförelsen mot baslinjen. Fel namn räknas fortfarande på ALLA kort, också oläsbara
(ett säkert namn på ett utbränt kort är ett fel). Felboken (felbok.cjs) visar oläsbara i ett eget avsnitt. Sätt
flaggan nu på **ett** kort: 13 Fencing Ace (helt utbränd av lampan i hylsan — se `dev/material/arbete/markning/
golden-2026-10-06/de-12-utan-ratt-namn-V4a.html`). Inte på 18 Ukud Cobra, 13 Swamp, 13 Ancestral Blade eller
18 Mirran Bardiche: Jesper kan lista ut dem med leken framför sig, och det är precis vad kedjan ska klara (den
jämför mot lekens kort). `--spara` ska fungera med flaggan; baslinjen (senaste.json) får båda talen.

## 2. Tokens som facit, inte bara "inte falskt"
Facit ritar tokens som `rita.ovriga` med namn "token Soldier"/"token Rebel"/"token Fractal" (13, 17, 18). I dag är ett
spår på en ritad token "token, inte falskt" oavsett namn. Gör: ett spår på en ritad token med **säkert namn = tokenens
namn** räknas som rätt namn (egen kolumn eller i Rätt namn med "(+N token)" — välj det som håller historiken läsbar),
säkert **annat** namn räknas som **fel namn**, inget namn som förut. Tokens ligger nu i `dev/golden/lek.txt` (Rebel,
Fractal). Tabellens "Kort" ska fortfarande vara synliga facitkort; tokens redovisas separat så 119 består.

## 3. Poolen ska kunna peka på en tryckning
`lek.txt` → `byggPool()` i kor.html slår upp varje rad med appens `lookup()` (Scryfall fuzzy). "Soldier" ger den
dubbelsidiga Goblin // Soldier (tgk1) med Goblin som framsida. Låt en rad i lek.txt kunna bära en tryckning på samma
sätt som appens eget lek-inklistrande redan gör om det finns ett format (kolla parsern för Min lek: `(SET) nr`, Moxfield/
ManaBox), annars `Soldier [tfrc]` eller `Soldier id:<scryfall-id>`, uppslaget via `lookupId`/set+namn. Lägg sedan in
Soldier (en enkelsidig tryckning med bild, t.ex. tfrc) i lek.txt. Poolnyckeln ska ändras när raden ändras.

## Mätning (grinden för golden-verktyg: inget mått får ändra ett befintligt tal)
Kör `--fall 13 17 18` före och efter på samma kod: alla gamla tal identiska (rätt namn av alla, fel namn, falska,
högar), de nya talen tillkommer. Sedan en hel körning (18 fall) och jämför mot senaste C — samma tal utom de nya.
Skriv raden i `dev/golden/historik.md`, uppdatera SNABBGUIDE.md (flaggan, token-räkningen, tryckning i lek.txt), och
säg i chatten vad "rätt namn av läsbara" blev.

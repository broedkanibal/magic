# Prompt: MES-316 — /api/identify kräver inloggning och har ett tak per konto

Modell och effort: **Opus 5.5, xhigh** (serverkod och Supabase, ingen kamera). Vill du bränna
krediter: Fable 5.1, xhigh går lika bra. Egen Claude Desktop-session.

Klistra in allt nedanför strecket.

---

Bygg MES-316 i Linear: `/api/identify` ska kräva en giltig Supabase-inloggning och ha ett tak per
konto som överlever omstarter. Jesper sover; fråga ingenting, ta besluten själv enligt reglerna
nedan och lämna ett tydligt spår.

## Läs först

- CLAUDE.md (Linear-reglerna och: **systemprompten i `api/identify.js` rörs inte**).
- Minnena `flera-sessioner-samma-arbetstrad`, `worktree-saknar-env-local`, `kontroller-som-ljuger`,
  `claude-kostnaden`.
- Issuen MES-316 i Linear (beskrivning och kommentarer), och MES-325/326/327 som hänger på den.
- `api/identify.js` (origin-kollen, `allow`, modellerna) och hur `index.html` anropar den
  (sök `fetch('/api/identify`).

## Så här startar du

1. `node dev/linear-agent/klient.cjs`-klienten: `agent.kontrolleraInnanStart('MES-316')`, sedan
   `agent.paborjaIssue('MES-316')`.
2. Bygg i en **egen worktree** (EnterWorktree). Symlänka `.env.local` och `dev/material` dit.
   Huvudarbetsträdet används av detektorsessionen (MES-329) i natt — skriv inte där.
3. Berätta i chatten vilken gren du bygger på.

## Vad som ska finnas

- Servern verifierar en Supabase-JWT på varje anrop (`Authorization: Bearer`), med
  `SUPABASE_JWT_SECRET` eller JWKS. Ingen token = 401. Origin-kollen får vara kvar som extra lager,
  men den är inte skyddet.
- Ett tak per konto som överlever omstarter och instanser: en tabell i Supabase (vi har den redan,
  ingen ny tjänst). Förslag: `identify_kvot(user_id, dag, antal)` med en RPC som ökar och returnerar
  antalet atomärt. Taket: det som står i MES-316/MES-325 — 300 frågor per konto och månad som
  förval, läs issuen. Över taket = 429 med ett svar klienten kan visa.
- Klienten skickar sin token från den inloggade sessionen. Telefonvyn och lekfotot anropar också
  `/api/identify` — hitta alla anropsställen, missa inget.
- Migrationen skrivs som fil under `supabase/migrations/` (eller där de andra ligger) och **körs
  inte mot produktion**. Jesper kör den i morgon.

## Så här mäter du

- Lokalt: `vercel dev` eller den stub du behöver, och curl: utan token → 401, med giltig token →
  svar, N+1:a anropet över taket → 429. Skriv de tre kommandona och svaren i kommentaren på issuen.
- Ingen golden behövs. Kör inte golden.

## Regler

- Rör inte systemprompten eller modellvalet i `api/identify.js`. MES-327 (billigare modell) är en
  annan issue.
- Pusha inte. Slå inte ihop med main. Driftsätt inte. Committa på grenen i små commits med
  meddelanden som bär historien.
- Blir något oklart som bara Jesper kan svara på: ta det rimligaste valet, skriv ned det i
  issuen, bygg vidare.

## Lämna rätt

- Klart och mätt: `agent.markeraRedoAttTesta('MES-316', …)` med exakt vad Jesper ska göra i
  morgon: kör migrationen, sätt miljövariabeln, slå ihop grenen, prova ett spel på telefonen.
- Inte klart när du tar slut: flytta tillbaka till Todo och kommentera vad som är gjort, vad som
  återstår och vilken gren som ligger kvar.
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

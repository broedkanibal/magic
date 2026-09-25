# Så lär sig kameran — och var det sparas

MES-230 och MES-231, 18 september 2026. För dig som vill förstå vad som
händer, inte hur koden ser ut.

## Kort sagt

Kameran känner igen ett kort genom att jämföra det mot bilder av korten i
din lek. Två sorters bilder:

| | Vad | Varifrån | Blir bättre av |
|---|---|---|---|
| **Kortbilderna** | Scryfalls bild av varje kort (alla konstverk) | Scryfall | inget — de är samma för alla |
| **Lärda bilder** | kamerans egna foton av *dina* kort, i *ditt* ljus | ditt bord | varje spel |

Bildmodellen gör om varje bild till en lista med tal (en *vektor*). Det tar
tid: ungefär en sekund per kortbild på en telefon, alltså **en kvart för en
Commander-lek**. Två ändringar:

1. **Förräknat (MES-230).** Kortbildernas tal räknas en gång, på Jespers
   dator, och läggs i Supabase. Telefonen hämtar dem: **leken är redo på
   under en sekund** i stället för en och en halv minut (golden-leken) eller en kvart
   (Commander).
2. **Lärda bilder följer dig (MES-231).** De foton kameran lär sig av
   sparas också på ditt konto, per lek. Nästa spel — på vilken telefon
   eller dator som helst — börjar där förra slutade.

Spelaren gör ingenting. Allt sker när leken laddas och när ett kort blivit
bekräftat.

## När lär sig kameran?

Varje gång kameran får **facit** för ett kort som ligger för sig självt:

| Händelse | Källa (sparas som) |
|---|---|
| Claude svarar säkert att det är ett visst kort | `ai` |
| Du rättar eller bekräftar kortet i granskningen | `hand` |

Beskärningen sparas som en liten bild (146 × 204 punkter, ~10 KB). Högst
**4 bilder per kortnamn och lek**; kommer en femte försvinner den äldsta.

## Vad sparas var

| Var | Vad | Vem ser det | Töms hur |
|---|---|---|---|
| Telefonens webbläsare, *Cache Storage* `mesa-embed-modell-v1` | själva bildmodellen (23–45 MB) | bara den enheten | webbläsarens "rensa webbplatsdata" |
| Telefonens webbläsare, *IndexedDB* `mesa-embed` | talen för varje kortbild (per Scryfall-id) och för varje lek | bara den enheten | samma |
| Telefonens webbläsare, *IndexedDB*, posten `ref:lek:<lekens id>` | de lärda bilderna, det kameran faktiskt läser | bara den enheten | **Forget learned photos…** på lekens sida |
| Supabase, tabellen `card_embeddings` | kortbildernas tal, 8 KB per bild | alla inloggade kan läsa, bara Jespers tjänstenyckel kan skriva | SQL, se nedan |
| Supabase, tabellen `learned_refs` | kopian av dina lärda bilder: bild, namn, tid, källa | bara du | **Forget learned photos…**, eller SQL |

Telefonens egen lista är alltid den som används. Tabellen `learned_refs`
är det som håller dina enheter i takt:

- **När leken laddas** jämförs telefonens lista med tabellens. Nya bilder
  från andra enheter läggs till. Bilder som lärts här men inte laddats upp
  än skickas upp. En bild som varit uppe men inte finns kvar i tabellen
  har glömts på en annan enhet, och tas bort här också.
- **När kameran lärt sig** skickas den nya bilden upp efter 1,5 sekunder.
- **Utan nät** lärs bilden ändå. Den skickas upp nästa gång leken laddas.

## Före och efter migrationerna

Koden är byggd så att **inget går sönder innan tabellerna finns**.

| | Innan migrationerna körts | Efter 1 (`card_embeddings`) + uppladdningen | Efter 2 (`learned_refs`) |
|---|---|---|---|
| Lekens kortbilder | telefonen räknar själv, ~1 s per bild | hämtas på under en sekund; bara kort som saknas i tabellen räknas | — |
| Lärda bilder | bara i telefonen | — | också på kontot, följer med till nästa enhet |
| Om tabellen saknas | appen frågar en gång, får "finns inte", och frågar inte igen förrän sidan laddas om | | |
| Utloggad eller offline | allt som i dag | allt som i dag | allt som i dag |

## Så kör du migrationerna

Filerna ligger i `supabase/migrations/`. Kör dem **i den här ordningen**:

| Ordning | Fil | Kräver |
|---|---|---|
| 1 | `20260918100000_card_embeddings.sql` | inget |
| 2 | `20260918110000_learned_refs.sql` | tabellen `decks` (finns sedan `lekar.sql`) |

**I Supabase (enklast):**

1. Öppna projektet på <https://supabase.com/dashboard> → **SQL Editor** → **New query**.
2. Klistra in hela innehållet i fil 1 → **Run**. Det ska sluta med `Success`.
3. Gör likadant med fil 2.
4. Kontrollera under **Table Editor** att `card_embeddings` och
   `learned_refs` finns och att det står **RLS enabled** på båda.

Båda filerna går att köra om utan att något försvinner.

## Så kör du uppladdningen av förräknade tal

Görs på din dator, en gång nu och sedan när det kommit nya kort i
någons lek. Det som redan finns hoppas över.

**En gång, förberedelser** (från repots rot):

```bash
npm install --prefix dev/embed
```

```bash
mkdir -p dev/embed/modeller && curl -L -o dev/embed/modeller/mobileclip-s0-vision.onnx https://huggingface.co/Xenova/mobileclip_s0/resolve/main/onnx/vision_model.onnx
```

Lägg två rader i `.env.local` i repots rot (filen checkas aldrig in):

```
SUPABASE_URL=https://<ditt-projekt>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<tjänstenyckeln>
```

Tjänstenyckeln finns i Supabase under **Project Settings → API Keys**:
en *secret key* (`sb_secret_…`) eller den äldre `service_role`. Den får
göra allt i databasen, så den ska bara ligga i `.env.local` på din dator.

**Varje gång:**

```bash
node dev/embed/forrakna.cjs --lekar
```

Det läser alla lekar i databasen, frågar Scryfall efter samma kortbilder
som appen använder (alla konstverk, högst 12 per namn, 24 per basland,
kortbaksidan), räknar det som saknas och laddar upp det. ~0,4 s per bild
på den här datorn: en ny Commander-lek tar ungefär sex minuter, en gång.

**Säger den "Tjänstenyckeln får inte läsa decks":** projektet ger inte
rättigheter automatiskt, och `decks` är bara läsbar för inloggade. Antingen
ger du rätten en gång (SQL Editor: `grant select on public.decks to service_role;`),
eller så tar du ut lekarnas kort i SQL Editor och ger dem som fil:

```sql
select string_agg(distinct (k->>'sid') || '|' || (k->>'name'), E'\n')
from public.decks d, jsonb_array_elements(d.kort) k where k->>'sid' is not null;
```

Spara svaret som `lekarnas-kort.txt` och kör `node dev/embed/forrakna.cjs --kortfil lekarnas-kort.txt`.
(Så gjordes första uppladdningen 2026-09-18.)

Andra sätt:

| Kommando | Gör |
|---|---|
| `node dev/embed/forrakna.cjs --lek dev/golden/lek.txt` | en lekfil, ett namn per rad |
| `node dev/embed/forrakna.cjs --namn "Sol Ring"` | ett eller flera namn |
| `… --torr` | räknar men laddar inte upp; skriver `dev/embed/cache/forrakade/<ut>.json` |
| `… --om` | räknar om och skriver över |

Avbryts körningen: kör samma kommando igen.

## Om något blivit fel

| Problem | Gör så här |
|---|---|
| Kameran har lärt sig fel bild för en lek | Lekens sida → **Forget learned photos…**. Tömmer telefonens lista *och* kontots kopia; andra enheter släpper dem nästa gång leken laddas. |
| Stänga av synken av lärda bilder utan att radera något | I webbläsarens konsol: `window.MESA_REFMOLN = false` (gäller tills sidan laddas om). |
| Radera en spelares lärda bilder för en lek i databasen | SQL Editor: `delete from public.learned_refs where user_id = '<användarens id>' and deck_id = '<lekens id>';` |
| Radera alla lärda bilder | `delete from public.learned_refs;` |
| De förräknade talen är fel (t.ex. efter ändrat recept) | `delete from public.card_embeddings where modell = 'mobileclip-s0\|v1';` och kör `forrakna.cjs --lekar` igen. Ändras receptet i `embed.js` höjs versionen (`v2`), och då används de gamla raderna inte alls. |
| En telefon har sparat fel tal lokalt | Rensa webbplatsdata för sajten i telefonens webbläsare. Leken byggs om vid nästa spel, från tabellen. |
| Ta bort funktionerna helt | `drop table public.learned_refs; drop function public.learned_refs_tak(); drop function public.embed_vektorer(text, text[]); drop table public.card_embeddings;` Appen går tillbaka till att räkna och lära lokalt. |

## Vad som är bevisat

| Prov | Resultat |
|---|---|
| Förräknade tal mot webbläsarens egna (Chrome, samma recept i Node, `forrakna-prov.cjs`) | nästan identiska: likhet 0,9997 i median, sämst 0,9955 (1,000 = identiskt) |
| Igenkänning, 61 riktiga golden-beskärningar (`bank.html EMBED`) | lokalt: 52 rätt, 46 säkra, 1 säkert fel · förräknat: 53 rätt, 46 säkra, 1 säkert fel. Samma namn på 60 av 61, samma säkerhet på 61 av 61 |
| Tid att göra leken redo (golden-leken, 105 bilder) | 92,7 s lokalt → **0,26 s** förräknat |
| Lärda bilder genom lagringen (`bank.html LARDA`) | talen bit för bit identiska, samma svar och marginal på 47 av 47 |
| Synken mellan enheter (`refmoln-prov.cjs`) | 20 av 20: tabellen saknas = exakt som i dag; lärt på telefon 1 syns på telefon 2; taket; offline; glöm; andra lekar och spelare orörda |
| Golden utan Claude (`node dev/golden/kor.cjs`), med alla ändringar i index.html | **LIKA BRA** som baslinjen: 31 av 57 rätt, 0 fel, 5 falska, förloppet oförändrat. Golden kör utan Supabase, så det visar vägen "ingen tabell att nå"; fallet "inloggad men tabellen saknas" provas i `refmoln-prov.cjs` (A) |

**Två förbehåll:**

- **Telefonens webbläsare.** Receptet i Node efterliknar Chromes sätt att
  skala bilder (mätt). Safari på iPhone skalar kanske annorlunda, och då
  skiljer sig telefonens egna tal lite från de förräknade. Det är inte
  mätt. Att hämtade och egna tal blandas är ofarligt (de jämförs aldrig med
  varandra, bara med kamerans bild), men träffen på en iPhone kan skilja
  någon procent. Mät genom att öppna `bank.html` på telefonen.
- **Hjälper de lärda bilderna bildmodellen?** Bara på ett sätt — som
  stöd, inte i rangordningen (MES-232, 2026-09-25). Blandade rakt in i
  leken (som till 2026-09-25) gjorde de modellen sämre: med 14 lärda
  bilder föll träffen från 39 till 36 av 47, och säkra svar från 32 till
  24. Kamerans foton liknar varandra mer än de liknar Scryfalls bilder, så
  ett lärt foto av kort A drog till sig foton av kort B — förlusten låg
  helt hos kort som *saknade* egen lärd bild (26/24 → 23/14 rätt/säkra),
  medan kort med en vann lite (13/8 → 13/10). Nu rangordnar Scryfalls
  bilder ensamma, och en lärd bild får bara höja marginalen för det kort
  som redan står överst — och bara när de lärda bilderna sinsemellan
  också pekar på det kortet. Bänken (`larda-varianter.cjs`): 39 rätt /
  34 säkra / 2 säkra fel mot 39 / 32 / 2 utan lärda; med lärda ur alla
  andra inspelningstillfällen 53 / 49 / 2 av 61 mot 53 / 46 / 2. Lärda
  bilder hjälper fortfarande den gamla bildkedjan (Matcher + ORB) som
  förut — där rankas de som vilket konstverk som helst.

## Filerna

| Fil | Gör |
|---|---|
| `dev/embed/embed.js` | modulen: `byggLek` frågar `window.EmbedForrakade` först |
| `dev/embed/forrakna.cjs` | räknar och laddar upp |
| `dev/embed/urval.cjs` | vilka kortbilder en lek består av (samma som appen) |
| `dev/embed/lib.cjs` | `receptVektorer`: modulens recept i Node |
| `dev/embed/forrakna-prov.cjs`, `jamfor.cjs` | proven för förräknat |
| `dev/embed/refmoln-prov.cjs` | provet för synken |
| `index.html`, `Moln.hamtaVektorer/hamtaRefs/sparaRefs/raderaRefs` | pratar med tabellerna |
| `index.html`, `RefMoln` | håller telefonens lista och tabellen i takt |
| `supabase/migrations/` | de två tabellerna |

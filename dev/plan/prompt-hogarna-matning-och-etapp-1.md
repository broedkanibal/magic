# Prompt: högarna utan uppstart — mätningen och etapp 1

Två sessioner, med Jespers inspelningar emellan:

| Del | Vad | Modell och effort |
|---|---|---|
| **A · Mätningen** | Mät de sex måtten i befintliga inspelningar och skärp inspelningslistan. Ingen kod i `index.html` | `mesa-matning` (Sonnet), high |
| **B · Etapp 1** | Uppstartens steg 4 bort. Leken, grundläget och graveyard härleds ur spelet | `mesa-bygg` (Opus), xhigh |

Del B börjar först när Jesper spelat in enligt listan från del A och sagt ja.

Kör båda i en **egen worktree** där `.env.local` och `dev/material` är
symlänkade (minnet `worktree-saknar-env-local`). Golden körs på **egen port**
och aldrig två samtidigt (minnet `golden-egen-port`).

Klistra in avsnittet för den del som körs.

---

## Del A · Mätningen (ingen kod)

Mät om reglerna i `dev/plan/hogarna-principer.md` håller i partier som redan
är inspelade, innan något byggs. Skriv rakt ut vad som är **mätt** och vad
som är **bedömt**. En regel som verkar rimlig men inte är mätt räknas inte
som ett svar (minnet `kontroller-som-ljuger`).

### Läs först

- `dev/plan/hogarna-principer.md`, som är besluten. Läs särskilt avsnittet *Mätningen före bygget*.
- `dev/plan/spegelmattan-principer.md`.
- Minnena `mes-329-tranad-detektor-i-appen`, `mes-288-tranad-detektor`,
  `mes-85-graveyard-auto-beslut`, `mes-138-139-library-plastfickor`,
  `mes-246-las-fore-slapp` och `kontroller-som-ljuger`.
- `dev/golden/inspelningar/LÄS-MIG.md`, som visar var varje inspelning och dess facit ligger.

### Material

| Inspelning | Var |
|---|---|
| Partiet 2026-09-21, 20 min, 4K 15 fps | `dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/`. Facit för sek 240–540 ligger på grenen `natt-2026-09-22` i `2026-09-21-parti/` (`handelser.tsv`, `platser.tsv`). Partistarten, sek 0–240, saknar facit |
| Partiet 2026-09-22, normaltempo | `dev/golden/inspelningar/2026-09-22-1x-34cm-normaltempo/` (`handelser.tsv`, `tal.tsv` med det Jesper sa högt). Videon har spårrutorna inbrända |
| MES-246, 4K 60, utan spårrutor | `dev/golden/inspelningar/2026-09-19-mes-246-las-fore-slapp/` (`MANUS.md`, `FACIT.md`) |
| Golden 01–16 | `dev/golden/` |

### Måtten

1. Hur ofta leken syns och ligger still innan första kortet, och efter hur lång tid. Gäller båda partierna.
2. Lekens vinkel mot de otappade kortens vinkel i grader, och om vinkeln går att mäta per kort inne i detektorns raka låda (kontur eller remsa).
3. Sidoregeln: hur många kort som hamnar på andra sidan om leken från landen och *inte* är graveyard.
4. Reserven: hur många gånger ett kort läggs ovanpå ett annat utan att det är graveyard (utöver land på land och fästa kort).
5. Hur länge ett kort ligger synligt överst på graveyard-högen innan nästa läggs dit. Det avgör hur mycket 0,5 s-gränsen fångar.
6. Hur ofta och hur länge leken lämnar bilden, och om det går att skilja från en hand som täcker den.
7. Detektorn: ger klassen `baksida` en låda på leken när den ligger still, när en hand vilar på den och i Jespers gröna fickor? Ger den `baksida` på något som inte är en lek i golden 01–16? Kör detektorn som i MES-329 (`detektor.js` via `para_cli.cjs`, eller `dev/detektor/kor.py` med `~/.mesa/detektor-venv/bin/python`).

För 1–6 behövs händelsefacit för partistarterna. Skriv det själv ur rutorna,
en per sekund som i `2026-09-21-parti/`, i samma format som `handelser.tsv`.
Lägg till händelserna `lek ner`, `lek borta`, `lek tillbaka` och `till
graveyard`. Markera osäkra rader som `osäker`.

### Leveransen

- `dev/plan/hogarna-matning.md`: ett svar per mått, en tabell per mått och
  "mätt" eller "bedömt" på varje rad. Sist en bedömning per regel: håller,
  håller med ändring (vilken), eller håller inte.
- Inspelningslistan ur `hogarna-principer.md`, skärpt. Det som redan är
  besvarat stryks, och varje punkt säger vad den ska mäta. Den läggs sist i
  samma fil.
- Arbetsfiler i `dev/material/arbete/<datum>-hogarna-matning/`.
- Ett commit med rapporten och facit. **Stanna sedan**, och visa Jesper
  rapporten och listan i chatten.

### Hårda krav

- Ingen ändring i `index.html` eller `api/identify.js`.
- Ingen Linear-issue skapas. Finns en, kommentera den som agenten (`dev/linear-agent/klient.cjs`, text via fil).

---

## Del B · Etapp 1: uppstarten försvinner

Bygg etapp 1 i `dev/plan/hogarna-principer.md`. Uppstartens steg 4
(provkort, graveyard, library) tas bort. Mesa hittar leken själv, tar
grundläget ur lekens riktning, och skapar graveyard ur
sidoregeln eller ur kort ovanpå kort. Det sker på dagens matta, med dagens
rutor, som Mesa nu sätter själv. Mät före och efter varje steg.

### Läs först

- `dev/plan/hogarna-principer.md` och `dev/plan/hogarna-matning.md` (del A:s mått och vad Jespers inspelningar ska visa).
- Avsnittet *Vad etapp 1 rör i koden* i principfilen. Pekarna är inte kontrollerade i detalj, så läs koden.
- Minnena `mesa-bordssteget-beslut`, `mesa-kameran-tappar-aldrig`,
  `mes-85-graveyard-auto-beslut`, `mes-138-139-library-plastfickor`,
  `mes-166-provkortets-las`, `kamerans-datorsida-provas-utan-telefon`,
  `flera-sessioner-samma-arbetstrad` och `orkestrering-lardomar-2026-09-25`.
- CLAUDE.md. Systemprompten i `api/identify.js` rörs inte. Linear sköts via
  `dev/linear-agent/klient.cjs`, och `paborjaIssue` körs innan arbetet börjar.

### Steg: ett i taget, med bänk och golden före och efter

**0. Baslinje.** Kör `dev/kolla.sh` och `dev/avstamning.cjs`. Kör golden på
alla 16 i två satser (01–08 och 09–16) samt spegelfacit. Kör sedan del A:s
mått på Jespers nya inspelningar med dagens kod, så att det finns ett före.

**1. Leken.** Den första nedvända högen (klassen `baksida`) som ligger still
innan första kortet blir library. Datorn sätter `ruta.bib` själv, med
`kamRutaRad` och samma väg som uppstarten använder i dag. En kvittens visas:
"Library ✓ · Not my library". Flyttas leken flyttas rutan med, utan
animering. Ett nytt nedvänt kort när leken redan är känd är ett nedvänt kort,
inte en ny lek. Bänkfall: leken läggs ner före första kortet, starthanden
ligger nedvänd, en hand vilar på leken, och leken flyttas.

**2. Grundläget.** När leken är bekräftad blir dess exakta vinkel otappat,
automatiskt och utan fråga (`satGrund`). Ligger leken 20° snett är tappat 110°.
Mät vinkeln per kort inne i detektorns raka låda (kontur eller remsa), eftersom
lådan ensam inte skiljer tappat från otappat vid snedvinkel, och vrid
beskärningen med grundläget. Utan lek: första kortets vinkel. Statusfältets
fråga (`grundSteg`) tas bort. Bänkfall: leken rak, leken 20° snett, leken på
tvären, Thriving Heath först, och ett land som tappas direkt.

**3. Graveyard.** Första kortet som läggs på andra sidan om leken från landen
blir graveyard. Reserven är ett kort som läggs rakt ovanpå ett annat (inte
land på land, inte fäst), och då blir kortet under det första i högen.
`ruta.grav` sätts i kortets storlek ur detektorns låda. Kortet går till
dagens hög med `flygTillGrav`, och raden "Graveyard · Not my graveyard"
visas. Nej öppnar menyn M1 **Permanent / Ignore this spot** (Exile kommer i
etapp 2). Efter ett Nej frågar sidoregeln inte igen under partiet. En instant
eller sorcery på bordet räknas som vilket kort som helst. `SPELL_MS` står
kvar.

**4. Uppstartens steg 4 bort.** Ta bort `oppSteg4`, delarna av
`oppSteg4Klar`/`oppOppnasIgen` som gäller steget, spärren i `avstamBord`
(`oppstartSparr`, UP1–UP8) där den bara gällde steg 4, samt texterna.
**Kontrollera först vad mer som läser provkortet** (`kortstor`, Card size i
Use camera to add cards) och ersätt det.

**5. Mät.** Kör del A:s mått på Jespers inspelningar och de två partierna,
före och efter: hur ofta leken hittas, hur ofta grundläget blir rätt, falska
graveyards och missade graveyards. Golden ska inte bli sämre. Inget här rör
namnen, så **0 nya fel namn** är ett krav, inte ett mål.

**6. Avslut.** Låt en fristående granskare (Agent) läsa diffen före
sammanslagningen och efter varje rättelse. Gör ett commit per steg, med vad
som var fel, vad som mättes och vad som ändrades. Flytta issuen till Redo
att testas med exakt vad Jesper ska prova på riktig telefon. Slå ihop och
pusha enligt `dev/plan/orkestrering.md`.

### Hårda krav

- Besluten i `hogarna-principer.md` och `spegelmattan-principer.md` ändras
  inte utan att Jesper tillfrågas. Ser en ändring ut att behövas: föreslå den
  och fråga.
- **Osäkert betyder orört.** En regel som inte är säker gör ingenting.
- Ett nytt namn som skivan läser utifrån stubbas i både `dev/avstamning.cjs`
  och `dev/dubbletter.cjs`.
- Appens text är på engelska, och koden och kommentarerna på svenska.
- Kameran prövas på datorn utan telefon enligt minnet
  `kamerans-datorsida-provas-utan-telefon`. Riktig telefon är Jespers prov.

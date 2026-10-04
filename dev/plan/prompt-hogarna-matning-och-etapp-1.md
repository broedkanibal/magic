# Prompt: högarna utan uppstart — mätningen och bygget av sida 5

Två sessioner, med Jespers inspelningar emellan:

| Del | Vad | Session |
|---|---|---|
| **A · Mätningen** | Mät i befintliga inspelningar och skärp inspelningslistan. Ingen kod i `index.html` | En vanlig session, Opus 5.5 high (eller `mesa-matning`, Sonnet). Ingen orkestrerare |
| **B · Bygg sida 5** | Allt på designytans sida 5 i en leverans | **En orkestrerande session, Opus 5.5 xhigh**, som delar ut stegen till agenter i egna worktrees och själv slår ihop efter bänk, golden och fristående granskning |

**Fördelningen i del B:**

| Steg | Agent | Varför |
|---|---|---|
| 1 · Vinkeln per kort | `mesa-bygg-tung` (Fable) | Rör detektorn, beskärningen och tap-domen. 0 fel namn står på spel |
| 2 · Mattan ritas inte om från noll | `mesa-bygg` (Opus) | Mattans ritning. **Får köras parallellt med steg 1**, eftersom de rör olika kod (kameran respektive mattan) |
| 3 · Leken, 4 · Graveyard, 5 · Högarna bland korten | `mesa-bygg` (Opus) | I tur och ordning efter steg 2, eftersom de bygger på mattan som inte ritas om |
| 6 · Uppstartens steg 4 bort | `mesa-bygg` (Opus) | Sist, när 3–5 fungerar |

Golden körs aldrig två gånger samtidigt. Orkestreraren köar körningarna (minnet `golden-egen-port`).
Regelboken för orkestreringen är `dev/plan/orkestrering.md`.

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
| Golden 01–18 | `dev/golden/`. **17** är kompisens parti: leken (id 78, 79, zon bib) plus sju andra baksidor vid kanten och i ett hörn. **18** (13b) har leken som zon bib i alla lägen |

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

## Del B · Bygg sida 5

Bygg allt på designytans sida 5, "The whole flow (chosen)", i "Mesa Piles From
Play" (https://claude.ai/artifact/RkqPz5qYrBHV5jckSC3fQh, källan i
`design_handoff_hogar/`, tavlorna `P5*.dc.html`). Besluten står i avsnittet
**Byggunderlaget** i `dev/plan/hogarna-principer.md`, och det gäller före allt
annat i filen. Mät före och efter varje steg.

### Läs först

- Avsnittet Byggunderlaget i `dev/plan/hogarna-principer.md`, och `dev/plan/hogarna-matning.md` (del A).
- `dev/plan/spegelmattan-principer.md`. Mattan som inte ritas om från noll är en förutsättning.
- Minnena `hogarna-utan-uppstart`, `spegelmattan-principer`, `mes-85-graveyard-auto-beslut`,
  `mes-138-139-library-plastfickor`, `mes-329-tranad-detektor-i-appen`,
  `kamerans-datorsida-provas-utan-telefon`, `flera-sessioner-samma-arbetstrad` och
  `orkestrering-lardomar-2026-09-25`.
- CLAUDE.md. Systemprompten i `api/identify.js` rörs inte. Linear sköts via
  `dev/linear-agent/klient.cjs`, och `paborjaIssue` körs innan arbetet börjar.

### Steg: ett i taget, med bänk och golden före och efter

**0. Baslinje.** Kör `dev/kolla.sh`, `dev/avstamning.cjs`, golden på alla 16 i två
satser och spegelfacit. Kör sedan del A:s mått på Jespers inspelningar.

**1. Vinkeln per kort.** Mät kortets och lekens vinkel inne i detektorns raka låda
(kontur eller namnremsa). Vrid beskärningen med vinkeln. Tappat = mer än 45° från
lekens vinkel just nu. Mattan ritar alltid 0° eller 90°. Det här är det svåraste,
så gör det först. Grind: golden får inte fler tap-fel, och de sneda fallen i
Jespers inspelningar blir rätt.

**2. Mattan ritas inte om från noll.** Varje kort och hög behåller sitt element,
och rörelser är transform-animeringar. Det är en förutsättning för steg 3–5.

**3. Leken.** Den nedvända hög som ligger kvar före första kortet blir library.
Texten mitt på mattan byter, och leken ligger bland korten med D1:s utseende och
bricka. Not my library finns i lekens meny. Picked up visas med skuggan kvar, och
leken glider när den läggs ner på nytt. Utan lek ger första kortet vinkeln.
Sleeves: bordets färg, eller Magic-baksidan.

**4. Graveyard.** Sidoregeln och kort ovanpå kort ger frågan "Is this your
graveyard? Yes · No", som står kvar tills man svarar. Inget är graveyard före Yes,
och kort som läggs på högen under tiden hör till samma fråga. No ger M1
(Permanent eller Ignore this spot). Efter Permanent frågar Mesa en gång till, och
efter Ignore aldrig. Bara ägaren ser frågan. Regeln från MES-85 gäller efter Yes,
mot högen där den ligger.

**5. Högarna bland korten.** Högarna följer mattans zoom (dagens zoom; zoomstegen är
MES-338), och brickan behåller sin storlek. Ett ensamt nedvänt kort visas, och
högar som inte är leken ignoreras (golden 17). Spelare utan kamera har fast plats som i dag, men D1:s utseende.

**6. Uppstartens steg 4 bort.** Ta bort `oppSteg4` och delarna av
`oppSteg4Klar`/`oppOppnasIgen` som gäller steget, spärren i `avstamBord`
(`oppstartSparr`, UP1–UP8) och `grundSteg`. Kontrollera först vad mer som läser
provkortet (`kortstor`, Card size).

**7. Avslut.** Kör del A:s mått före och efter. 0 nya fel namn är ett krav.
Låt en fristående granskare läsa diffen före sammanslagningen och efter varje
rättelse. Gör ett commit per steg. Flytta MES-334 till Redo att testas med exakt
vad Jesper ska prova på riktig telefon.

### Hårda krav

- Byggunderlaget ändras inte utan att Jesper tillfrågas.
- Osäkert betyder orört.
- Ett nytt namn som skivan läser utifrån stubbas i `dev/avstamning.cjs` och `dev/dubbletter.cjs`.
- Appens text är på engelska, och koden på svenska.
- **Ingår inte:** graveyard minns kort utan namn (MES-336), den fysiska exile-högen
  (MES-337) och zoomstegen (MES-338).
- **Krock:** kör inte samtidigt som spegelmattans bygge (MES-333 och framåt), eftersom båda rör mattans ritning.

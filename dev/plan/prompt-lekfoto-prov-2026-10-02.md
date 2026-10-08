# Lekfotot efter Jespers telefonprov 2026-10-02: orkestreraren

Du är orkestrerare för Mesa. Följ `CLAUDE.md` och `dev/plan/orkestrering.md`
(reglerna, hur en gren slås ihop, hur du håller din egen kontext liten).

**Uppdraget:** Jesper provade lekfotot (MES-320–324) på riktig telefon med 40
kort i tre foton. Resultatet blev en lek med 27 kort. Här står vad som var fel,
vad som orsakar det och vad som ska byggas. Hans skärmbilder ligger i
`dev/plan/lekfoto-prov-2026-10-02/`. Titta på dem innan du delar ut arbetet.
Filnamnen säger vilken punkt de hör till.

**Rätt före mycket.** Hellre en våg klar, granskad och ihopslagen än två
halvfärdiga.

## MES-331 (landhögarna) ligger på main, alla fyra passen: bygg på den

**MES-331** (prompten i `dev/plan/prompt-landhogar-2026-10-02.md`, pass 4 i
`prompt-mes331-pass4.md`) ligger helt på main sedan 2026-10-03 (`45f3018`).
Kameragolden lokalt utan Claude: 81 → **88/98 rätt namn på 01–16, 0 fel namn,
0 falska**; med Claude 64/65. Golden 18 är nytt (108 totalt). Det här rör våg 2:

- **Titeldelen av remsan som andra vittne** finns nu: `kamLasRemsa` jämför
  titelns del av remsan (`T.remsaTitel` 0,55 av bredden, utan fickkant och
  manakostnad) och kräver samma namn överst som hela remsan, marginal
  `T.remsaTitelTroskel` 0,20. Jespers kort ligger i gröna fickor: **våg 2 B
  använder den, inte en egen.**
- `Detektor.para` (`dev/detektor/modell/detektor.js`): dubblettsteget kräver
  att remsan spänner över lådans sida; ett kort utan remsa i en rad får en
  syntetisk remsa ur sin kant. `skildaRemsor`/`sammaKortSom` dömer på
  avståndet mellan remsorna; `matcha` och `fyndUrLador` har omlott-grenar;
  `medRemsa` läser remsan också för osäkra spår omlott utan mask; spökspår
  utan region dör. Golden mäter nu också högens ordning (Högar) och räknar
  tokens för sig (`rapportera`, `kor.html`).
- **Pass 4** (golden 14:s Plains i grön ficka): `medRemsa` läser remsan för
  varje osäkert spår (`T.remsaAlla`); `Detektor.para` släpper remsor upp till
  0,5 tjocklek/längd (`o.tjockMax`); `fyndUrLador` har `remsaUtom` (av,
  `T.remsaUtom` 0); `matcha` har en födelsevakt (av, `T.fodVakt` 0); `kor.html`
  parar spår mot hela kortet ur hörnen i en andra omgång; `rita-geometri.cjs`
  dömer dold på namnets början. `Namn.lasBand` och `Embed.byggRemsLek` rördes i
  passet: läs dem som de ligger på main innan våg 2 B bestämmer vad som
  saknas för lekfotot. **Bygg inte en egen titelläsning bredvid den.**
- Ingen annan session rör de funktionerna nu. Det kan ändras: `ListAgents`
  före varje våg, och fråga den som kör något i kamerakedjan.

Regler som gäller hela passet:

1. **Börja från färsk main** (`git fetch`, minst `45f3018`; huvudträdet kan
   stå kvar på en äldre commit, så `git pull` där först). Våg 1 och 3 rör
   `telfoto*`, `telfotoLas`, `lekRemsa`, `ritaYta`, `slutTopp`, som MES-331
   inte rörde. Våg 2 bygger på `kamLasRemsa`, `Namn.lasBand`,
   `Embed.byggRemsLek` och `Detektor.para` som de ligger på main nu.
2. **En golden-körning i taget på datorn**, oavsett vilken session som kör den:
   `pgrep -f "kor.cjs|spegelfacit"` före varje körning, och vänta om något
   kör. Kameragolden (grind 4) på en egen port över 8260 (`golden-egen-port`),
   mot baslinjen MES-331 pass 4 sparade (`dev/golden/senaste.json` i `45f3018`,
   raden i `historik.md`: 88/98 på 01–16, 0 fel, 0 falska). `git fetch` före varje sammanslagning: main
   flyttar sig under passet.
3. En ny worktree behöver `.env.local`, `dev/material`, `dev/embed/cache` och
   `dev/embed/modeller` symlänkade från huvudträdet (de två sista finns i
   `.claude/worktrees/wf_bccb9343-ae9-3`), annars läser bildmodellen inget.

## Vad som är fel, och varför

| # | Jespers fynd | Orsak (kollad i koden om inget annat står) |
|---|---|---|
| 1 | 12 av 15 kort hittades på ett skarpt foto | `telfotoLas` skickar bara det som ligger i kamerans ram (`lekKallDuk(kalla.canvas, telfotoRamBox())`). Ramen är 346:186, ett brett band mitt i ett stående foto. Lekgolden 2026-09-26: **128/372 rätt genom ramen, 336/372 på hela fotot**. De tre som saknades i foto 1 låg utanför ramen. |
| 1 | Det ska gå utan Claude, med detektorn och bildmodellen | Lekfotot använder ingen av dem. Läget `lek` skickar fotot till Opus 5 (effort medium, 16 000 tokens), som svarar med namn och en **gissad** punkt per kort. Bildmodellen (`Embed`) jämför i dag mot en känd lek, men när en lek byggs finns ingen lek att jämföra mot. Den behöver kandidater någon annanstans ifrån (se våg 2). |
| 1 | "2 names to check" på datorn, men inget att klicka på. Change card fungerar ändå | Före Finish the deck ritas bara rutan `attKolla` (passiv). Check names (`slutTopp`/`knRita`) finns bara när `slutar()` är sant. |
| 2 | Fotot på telefonen visar inte alla kort, och knapparna hamnar långt ner | Fotot är ramens beskärning. Bilden är dessutom låst till 27 % av skärmhöjden (`telfotoBildHtml`). Ett helt stående foto blir en tumnagel med den regeln, så punkt 2 och 3 måste byggas ihop. |
| 3 | De vita hörnen ser ut som en gräns man måste hålla sig innanför | Hörnen är ramen (`#telRam`), och de är en gräns: allt utanför dem kastas. |
| 4 | "Hold still: the picture is blurry" på en skarp bild | **Hypotes, inte mätt:** `lekSkarpa` mäter Laplacevariansen på en ruta på 520 px mitt i ramen. Med två högar ligger den mitten ofta på bordet mellan högarna. Gränsen 150 är mätt på en syntetisk solfjäder (`dev/lekmock.js`) och inte på riktiga foton. |
| 5 | "1 may also be in photo 1" går inte att förstå. "Marked with ? …" mitt i en mening ser ut som en bugg | Copy: `telfotoResultatHtml` och `telfotoDubblaText`. |
| 6 | "Does every card on the table have a mark?" är ingen fråga man svarar på | Copy. |
| 6 | Bockar och ? hamnar bredvid korten, ute på bordet | Prickarna sitter på Claudes **gissade** mittpunkt för titelraden (x/y 0–1000). Kort vid ramens kant (x inom 30/1000) blir platshållare, också där det bara finns bord. |
| 7 | "Mesa saw a few more it couldn’t read" säger inte vilka kort det gäller, och det ska inte stå Mesa | `f.olasta` kommer ur Claudes tal `otydliga`, som saknar position. Det finns ingenting att markera. |
| 8 | 32 kort efter tre foton fast det var 40 (15 + 15 + 10). 27 i den färdiga leken | Följer av 1. Sedan tog Check names bort 5 kort: 2 kapade kort, Plains och Swamp räknade en gång var, plus Not a card. |
| 9 | Leken får lätt heta "New deck 5", eftersom namnet är lätt att missa | Namnet ändras bara med pennan i toppraden. Det finns inget steg för det. |
| 10 | Check names visar fel bitar av fotot: konstverk, bara bord, "ins" av Plains | `lekRemsa` skär remsan runt Claudes gissade punkt med bredden `ramens bredd / 4,28`, eftersom `TELFOTO_HOGAR = 4`. Med två högar blir remsan ett halvt kort bred, och en felgissad punkt ger bara bord. |
| 11 | Finish the deck syns inte utan att man skrollar i sidopanelen, och det är oklart vad knappen gör | Knappen ligger längst ner i panelen (`lfKanAvsluta`) som en sekundär knapp. |

## Besluten (Jesper 2026-10-02, ändra här innan du startar)

| | Beslut |
|---|---|
| B1 | **Kameran:** ingen ram och inga hörn. Kameran visar hela bilden (`object-fit: contain`, svart kant om formatet inte fyller skärmen), och fotot är exakt det som syns. |
| B2 | **Läsningen utan Claude är förvalet**, om våg 2 mäter 0 fel säkra namn. Claude-läsningen (`lek`) finns kvar bakom `?debug` för jämförelser. Om Claude ska läsa de remsor som blir osäkra lokalt är **Jespers beslut efter mätningen**. Bygg det inte på eget initiativ. |
| B3 | **Telefonen skapar ingen lek.** Telefonens knapp heter **Done with photos** och leder till "Continue on the computer". Leken skapas på datorn. |
| B4 | **Datorn:** Check names går att använda så fort ett kort behöver kollas, också medan man fotar. **Create deck** är den primära knappen och går inte att trycka på så länge något kort behöver kollas. |
| B5 | **Namnet är sista steget**, i samma panel som Create deck: ett textfält med fokus och 3–4 förslag som fyller i fältet när man klickar. Förslagen räknas fram **lokalt** ur korten, utan Claude: legendariska varelser, färgpar, vanligaste varelsetyp, återkommande nyckelord. Ett förslag skrivet av Claude kräver ett nytt läge i `api/identify.js`, och det byggs bara om Jesper ber om det. |
| B6 | All copy i lekfotot säger **"we"**, aldrig "Mesa". Inga tankstreck i copy, som förut. |

## Tillåtet utan att fråga

- Slå ihop med main och pusha när **alla grindar** är gröna. Main driftsätts till produktion vid push. *(Stryk den här raden om du hellre slår ihop själv.)*
- Lekfotots golden: ur cachen hur ofta som helst. Med riktig Claude (`--las-om`) högst två körningar totalt (~1,40 USD per körning).
- Linear (agent-klienten, `dev/linear-agent/SNABBGUIDE.md`): skapa en issue per våg (se nedan) och kör `paborjaIssue` när arbetet börjar. När det är på main: `markeraRedoAttTesta(issueId, vad)`. Blir något inte klart: tillbaka till Todo med en kommentar om vad som återstår och vilken gren arbetet ligger på.

## Stanna bara för det som är Jespers

- **Systemprompten i `api/identify.js` rörs aldrig.** Att stänga av Claude i lekfotot görs i klienten, inte i prompten.
- Våg 2 når inte 0 fel säkra namn, eller mer än 25 % av korten blir "to check" lokalt: `markeraBehoverJesper` med siffrorna, och fortsätt med de andra vågorna.
- Ett designval som inte står i den här filen: välj det som ligger närmast besluten ovan och sida M, och skriv valet i commit-meddelandet. **Vänta aldrig på ett svar.**

## Innan första vågen

1. `ListAgents`, `git fetch`, `git pull` i huvudträdet, `git status` och `git log origin/main -5` (minst `45f3018`). Kör någon annan session i lekens sida, telefonvyn eller kamerakedjan? Fråga innan du rör deras område, och säg till den före varje golden och `kolla.sh`.
2. `sh dev/kolla.sh` på `origin/main`. Om den är röd redan innan: skriv det och stanna.
3. Linear: sök igenom laget efter dubbletter, och skapa sedan tre issues med agent-klienten i Private beta, milstolpe *1 · Leken i appen*, etiketten `lekar` (våg 2 också `kortigenkänning`), med typerna Bug och Improvement. En issue per våg. Klistra in vågens rader ur tabellen ovan, och länka MES-320 som relaterad. Säg till Jesper i chatten vilka issues du skapat: id, titel och länk.
4. Lägg Jespers foto `dev/plan/lekfoto-prov-2026-10-02/mobil-1.2-riktiga-15-kort.jpg` som ett nytt fall i lekgolden (`dev/material/foton/2026-09-26-lekfoto/` + `facit.json`). Facit, två högar uppifrån och ned:
   - vänster: Mirran Bardiche, Ancestral Blade, Thriving Heath, Faithful Pikemaster, Plains, Resistance Reunited, Pacifism
   - höger: Swamp, Swamp, Hooded Blightfang, Swamp, Fencing Ace, Plains, Thriving Moor, Night's Whisper

## Vågorna

Högst **två agenter åt gången**, i egna worktrees. Symlänka `.env.local`, `dev/material`, `dev/embed/cache` och `dev/embed/modeller` från huvudträdet (regel 3 ovan), annars ger lekgolden "0 namn" och bildmodellen inget. Slå ihop **en gren i taget**.

| Våg | Agent | Punkter | Kodområde i `index.html` | Startar |
|---|---|---|---|---|
| 1 · Telefonen | `mesa-bygg` (Opus) | 2, 3, 4, 5, 6 (copy), 7 (copy), B3 | telefonvyn: `telfotoRamBox`, `telfotoKnapp`, `telfotoSkarpa`, `lekSkarpa`, `telfotoResultatHtml`, `telfotoBildHtml`, `#telRam` | direkt |
| 2 · Läsningen | `mesa-bygg-tung` (Fable) | 1, 6 (prickarna), 8, 10 | `telfotoLas`, `lekRemsa`, `telfotoVidKant`, lekgolden. Först mätning under `dev/` | steg A–C direkt (bara `dev/`, ingen appkod), steg D när våg 1 är ihopslagen |
| 3 · Datorn | `mesa-bygg` (Opus) | 1 (datorn), 7 (copy på datorn), 9, 11, B4, B5 | lekens sida: `ritaYta`, `attKolla`, `slutTopp`, `knRita`, `lfKanAvsluta`, panelen | när våg 1 är ihopslagen |

### Våg 1 · Telefonen: kameran och resultatet

1. **Kameran (B1).** Ta bort `#telRam` och hörnen. Videon visas hela. `telfotoKnapp` skickar hela bilden (box 0,0,1,1). Logga `videoWidth × videoHeight` i ?debug, så att Jesper kan se vilken upplösning telefonen faktiskt ger.
2. **Suddigt (punkt 4).** Mät först, ändra sedan. Kör `lekDomAv` på lekgoldens 15 foton plus Jespers: hur många får "suddigt"? Mät skärpan där texten finns, inte mitt i bilden. Till exempel som en hög percentil över rutor i hela bilden, eller på detektorns remslådor när våg 2 finns. Kalibrera gränsen på riktiga foton och på samma foton med syntetisk oskärpa (1,5 px och 2 px). Varningen visas först efter tre rutor i rad. Krav: 0 "suddigt" på de skarpa fotona, och varning vid 2 px oskärpa. `W` i `lekDomAv` antar fyra högar (`TELFOTO_HOGAR`): skriv i rapporten hur "Move closer" påverkas när ramen är borta.
3. **Resultatskärmen (punkt 2).** Hela fotot syns i full bredd. Ett tryck öppnar det i helskärm, där man kan zooma med prickarna kvar. Knapparna står i en fast rad längst ner (sticky): **Take photo n** (primär) och **Done with photos** (sekundär). De syns alltid, utan att man skrollar, på 390×844 och 375×667. Retake ligger som text under fotot: "Retake photo n · replaces its N cards".
4. **Copy (punkt 5, 6, 7, B6).** Förslag. Behåll radernas ikoner, som är förklaringen till markeringarna:
   - Rubrik `12 cards found`, underrad `Every card we found has a mark.` (i stället för frågan)
   - `10 recognized`
   - `2 to check on the computer` + `We’re not sure which cards these are. You pick them on the computer.` Om inget namn alls kunde läsas: `We couldn’t read these names. You type them in on the computer.`
   - `1 card may be in two photos` + `It’s at the edge of this photo and of photo 1. On the computer you say if it’s the same card.`
   - Under fotot, en rad som alltid står där: `No mark on a card? Put it aside and type it in on the computer.` Den ersätter "Mesa saw a few more …".
   - Ingen text börjar med "Marked with ?". Byt "Mesa" mot "we" i alla telefonens skärmar (`inga`, `inganamn`, `av` …).
5. Lekgolden: kamerans väg ska nu ge samma resultat som `hela`. Uppdatera `--beskarning ram` så att den mäter den nya vägen, eller ta bort den, och skriv en rad i `historik.md`.

### Våg 2 · Läsningen: detektorn och bildmodellen i stället för Claude

Hela vågen styrs av ett krav: **0 fel namn rakt in i leken.** Ett osäkert namn blir "to check", aldrig ett säkert.

- **A. Hittar detektorn alla kort på ett stillbildsfoto?** (bara `dev/`, ingen appkod) Kör YOLOX (`dev/detektor/modell/`, `para_cli.cjs`) på lekgoldens foton och Jespers foto. Ett stående foto i 960×544 ger små kort, så pröva båda: vrida 90°, och dela i två överlappande rutor. Räkna kortlådor och remslådor per foto mot facit. Mål: ≥ 99 % av korten, 15/15 på Jespers foto, 0 lådor på bara bord.
- **B. Namnet lokalt.** Bildmodellen har ingen lek att jämföra mot när en lek byggs, så kandidaterna måste komma från något annat. Förslag med två vittnen: textläsaren (`Namn.lasBand`, tesseract) läser remsan ur källans fulla upplösning. Bildmodellens jämförelse av remsan görs som i `kamLasRemsa` på main: hela remsan och titeldelen (`T.remsaTitel`) som två vittnen mot kandidaternas remsor, och textläsaren som MES-331 pass 4 lämnade `Namn.lasBand`. Det som saknas för lekfotot är kandidaterna ur hela namnkatalogen i stället för ur en lek: bygg det, inte läsningen. Det lästa matchas luddigt mot Scryfalls hela namnkatalog (`catalog/card-names`, cache i IndexedDB) och ger de 5 bästa kandidaterna. Bildmodellen jämför sedan remsan med remsorna ur kandidaternas Scryfall-bilder (som `Embed.byggRemsLek`). **Säkert bara när båda vittnena pekar på samma namn med marginal.** Kalibrera marginalen på lekgolden och MES-328:s remsbänk (`dev/remsa/`). Ett globalt index med remsor för alla kort (Supabase pgvector) är steget efter, om det här inte räcker.
- **C. Jämför.** Lekgolden, samma 16 foton, tre vägar:
  - A = dagens Claude på hela fotot (cachen finns)
  - B = bara lokalt
  - C = lokalt, och Claudes `card`-läge bara på de osäkra remsorna (bara mätning)

  Per väg: hittade, rätt, fel säkra namn, to check, tid per foto på datorn. Skriv in raderna i `dev/lekgolden/historik.md`. **B blir förvalet** om B har 0 fel säkra namn och hittar minst lika många kort som A. Annars: stanna enligt "Stanna bara för" ovan.
- **D. In i appen** (när våg 1 är ihopslagen; börja från färsk main, minst `45f3018`):
  - `telfotoLas` kör detektorn och läser lokalt. Claude bara via ?debug (B2).
  - Prickarna sitter i remslådans vänstra ände, alltid på kortet.
  - `lekRemsa` skär ut remslådan (med marginal, vriden rätt) i stället för gissad punkt × fyra högar.
  - Ett kort vid kanten = en låda som rör bildens kant, inte x inom 30/1000.
  - Ett kort detektorn hittar men inte kan läsa blir en platshållare med sin remsa och sin prick. Då försvinner "olasta" utan position.
  - Detektorn och bildmodellen delar `window.__mesaOrtKo` (se minnet om MES-329: två WebGPU-sessioner får inte köra samtidigt).
- **Klart när:** Jespers 15 kort ger 15 hittade på foto, golden-fotona ≥ 99 % hittade, 0 fel säkra namn, och varje remsa i Check names visar ett kortnamn som en människa kan läsa.

### Våg 3 · Datorn: kolla medan man fotar, en tydlig knapp, namnet sist

1. **Check names alltid (punkt 1, B4).** Finns det kort att kolla visar ytans överkant Check names (dagens `slutTopp`/`knRita`), också före Done with photos. Klickar man på Check-brickan på ett kort öppnas Check names på det kortet. Rutan `attKolla` som bara berättar försvinner.
2. **Panelen överst med antal och knapp (punkt 11).** Överst i högra spalten, synlig utan att man skrollar på 1280×800:
   - stort antal kort (`40 cards`, `from 3 photos`)
   - om något behöver kollas: `7 names to check` och den primära knappen **Check names**. Create deck är avstängd och säger `Check the names first`.
   - när inget behöver kollas: namnsteget (B5) och den primära knappen **Create deck**. Bredvid antalet: `Missing some? Take more photos or type them in.`
   - Finish the deck försvinner ur sidopanelen. "Type in the cards you put aside" och Basic lands finns kvar som steg i panelen, men stoppar inte Create deck.
3. **Namnet (punkt 9, B5).** Ett textfält, förifyllt med det lekens namn är nu och markerat, med 3–4 förslag som knappar under. Ett klick fyller i fältet. Förslagen räknas lokalt (till exempel `Aphelia’s Gorgons`, `Orzhov Deathtouch`, `Gorgons and Snakes`). Fokus hamnar i fältet när steget visas, men tar inte tangenterna från Check names eller sökningen.
4. **Telefonens Done with photos (B3)** flyttar datorn till sista läget: Check names om något återstår, annars namnsteget.
5. **Copy på datorn (B6):**
   - `Mesa found something in photo 2 but couldn’t read a name …` blir `We found a card in photo 2 but couldn’t read its name. If it isn’t a card, remove it.`
   - `Mesa’s best guess` blir `Our best guess`.
   - I "Which card is this?" är sökfältet det primära och **Not a card** sekundärt.
6. En befintlig lek som fått fler foton: knappen heter **Save deck** (inte Create deck), utan namnsteg.
7. Uppdatera `dev/lekfoto-dator.cjs` och `dev/lekfoto-slut.cjs` för det nya flödet.

## Grindarna, före varje sammanslagning

1. `git diff --stat origin/main`, och kolla att arbetet inte redan är ute (`git branch -r --contains <gren>`).
2. `sh dev/kolla.sh` grön, plus `node dev/lekfoto.cjs`, `dev/lekfoto-dator.cjs`, `dev/lekfoto-slut.cjs` och `dev/lekslag.cjs`.
3. Lekgolden före (på `origin/main`) och efter (på grenen): **0 fel namn rakt in i leken**, inget set med färre rätt kort, inget set med fler kort än facit. En körning åt gången på datorn, också räknat med den andra sessionens golden (`pgrep` ovan).
4. Rör diffen kamerans kod i spel (`kamIdentifiera`, `detektera`, `KamDet`, `Embed`, `Namn`): kameragolden också (`dev/golden/SNABBGUIDE.md`, egen port), mot baslinjen MES-331 pass 4 sparade (`45f3018`). Våg 2 D delar `Namn.lasBand` och `Embed` med spelet, så den grinden gäller den.
5. **En fristående granskare** (en ny agent, inte byggaren) läser diffen mot den här filen och letar efter kort som räknas dubbelt eller försvinner, copy som avviker från besluten och knappar som inte syns. Fynden går tillbaka till samma byggare med `SendMessage`, och granskas igen efter rättelsen.

## Häng dig inte

- Agenterna körs i bakgrunden. Starta dem och vänta på notisen, med `ScheduleWakeup` 1200–1800 s som reserv.
- Tidstak per agent: 3 timmar. Stoppa den, skriv vad som ligger på grenen, och lägg tillbaka issuen i Todo.
- Fäller samma fel två gånger: sluta, skriv upp det och gå vidare.

## När allt är gjort

Skriv `dev/plan/lekfoto-prov-2026-10-02-resultat.md` för en icke-expert: rubriker och tabeller, vad före hur.

| Avsnitt | Innehåll |
|---|---|
| Kort sagt | vad som är ute, vad som stannade och varför |
| Per våg | commit, grindarna före och efter, A/B/C-tabellen ur våg 2 |
| Att prova på telefonen | samma 40 kort i tre foton. Förväntat: 40 hittade, 0 fel namn, hur många att kolla. Plus fem skarpa foton utan "blurry", och Create deck med ett namnförslag |
| Val du gjorde själv | allt som inte stod i besluten |

Committa rapporten, pusha och verifiera med `/driftkoll`-kommandona att produktionen är identisk med main.

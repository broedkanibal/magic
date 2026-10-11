# Lekar och kamerans minne i Mirror my table

Brainstorm och beslut 2026-10-10 (Jesper + Claude Code). Underlag för en
kommande Research-issue (mätningarna) och för designen och bygget efter den.

## Problemet

I fysiskt spel finns leken bara för igenkänningens skull. Att behöva lägga in
en lek digitalt innan man spelar, när kortlådan ligger på bordet, känns
onaturligt. Samtidigt ska ett glömt kort eller ett fel antal basland
fortfarande kännas igen, och "Name this card" ska nästan aldrig synas.

"Lek" betyder två saker, och de ska hållas isär:

| | Leken man spelar ur | Leken som kamerans minne |
|---|---|---|
| Behövs i | Digital table (appen blandar och drar) | Mirror my table (kameran läser av) |
| Måste vara | komplett och exakt | ungefär rätt räcker |
| Antal Plains | spelar roll | spelar ingen roll |
| Glömt kort | fel | ska ändå kännas igen |

## Det som var mätt när beslutet togs

- **Leken som svarslista:** `kor.cjs --utan-leken` med 12 av lekens 28 namn
  borta (sept): rätt namn 35 → 12/59 och **2 säkra fel namn** (Thriving Heath
  → Thriving Moor). Felet kom av att det rätta kortet saknades i listan. En
  ofullständig lek är alltså farligare än hela världen, där det rätta kortet
  alltid finns med.
- **Remsan mot OCR** (MES-328, MES-340):

  | Material | Remsan (bildmodellen) | OCR (tesseract.js) |
  |---|---|---|
  | Golden-fotona, skarpa remsor | 64/64, 0 säkra fel | 38/74 |
  | MES-246, blänk under lampa | ursprungliga modellen 24 % (Swamp på 598/735); finjusterad upp till ~200 säkra med 0 fel (golden-leken), 1–2 säkra fel med Jespers lek i vissa varianter | 0/735 |
  | Golden i appen, v2 på remsorna | 95 → 98/119, 0 fel | – |

  OCR jämförs i dag mot lekens ~30 namn. Mot 30 000 namn är en halv läsning
  värdelös, så i världssteget är OCR en bonus, inte en pelare.
- **Claude i dag:** tak 30 frågor per konto och parti (`CLAUDE_TAK_PER_PARTI`),
  300 per konto och månad (MES-316), ~0,9 cent per beskärning.

## Riktningen

1. **Mirror startar utan lekval.** Man lägger bara ut korten.
2. **Minnet sitter på spelaren.** Mesa minns alla kort den sett hos spelaren,
   i alla partier. Lekar bildas av kort som syns ihop och föreslås efter
   partiet ("Mesa learned 34 cards — save as deck?").
3. **Learned och complete** är två lägen hos samma lek. Learned räcker för
   Mirror, complete krävs bara i Digital.
4. **Trappan:** ju mer oväntat ett kort är, desto mer bevis krävs för ett
   säkert namn.

   | Steg | Kort | Bevis som krävs |
   |---|---|---|
   | 1 | den aktiva leken | som i dag |
   | 2 | resten av spelarens minne | lite mer |
   | 3 | resten av världen (~30 000) | två oberoende vittnen: bildmodellen + ORB (OCR som bonus) |

5. **Den aktiva leken:** start i den lek spelaren spelade senast. Efter 2–3
   säkra kort byts den mot korten ur de tidigare partier där just de korten
   fanns (samförekomst). Mesa vet vilken lek som spelas utan att spelaren
   väljer.
6. **Första synen är bästa synen.** Ett nytt kort läggs överst och ligger helt
   synligt när handen släpper det. Hela världen behöver bara sökas för nya,
   hela kort. Remsor (delvis täckta kort) jämförs bara mot det partiet redan
   sett. Undantag: kameran startad mitt i partiet, utrustning eller aura som
   stoppas in under direkt, ett land som skjuts in under högen. De går till
   Claude eller spelaren.
7. **Land:** basland känns igen som typ, utan lek och utan antal. Andra land
   (cykler som Thriving) behandlas som vanliga kort, för det är där
   tvillingarna finns.
8. **Commander:** commandern ger färgidentiteten (krymper världen med
   ~60–80 %). Bara ett exemplar per kort är en lokal spärr: ett andra
   exemplar av ett kort som inte är basland är nästan säkert fel namn.
9. **Vittnena:** bildmodellen (tränbar) och ORB bär nya kort. Remsan bär
   kända kort. OCR är en bonus.
10. **Claude som lärare:** frågas bara när telefonen inte klarat det, och en
    gång per nytt kort, aldrig mer. Svaret hamnar i minnet. Spärrar: detektorn
    säger *kort*, kortet ligger still och syns helt, en fråga per fysiskt
    kort, taket per konto. Claudes svar kontrolleras mot Scryfall-bilden av
    just det namnet innan det blir säkert. Utan Claude (av, eller taket nått)
    går det okända till spelaren, som CLAUDE.md kräver.
11. **"Name this card" är sista utvägen.** Ett nytt kort får en tyst
    läsmarkering medan det läses, inte en fråga.

## Jespers beslut 2026-10-10

| # | Beslut |
|---|---|
| B1 | Mirror startar utan lekval. "Lek krävs för att spela" gäller bara Digital. |
| B2 | Minnet sitter på spelaren, inte på leken. |
| B3 | Antal i Mirror: inget antal för basland, ett mjukt stöd (inte ett tak) för andra kort, singleton som spärr i Commander. |
| B4 | Claude som lärare för nya kort: **ja, efter mätningen G1.** Det är ett nytt flöde som skickar fler kort till Claude; Jespers ja gäller med svaret från G1 i handen. |
| B5 | Mål: "Name this card" under 1 per parti. Ett nytt kort via Claude inom några sekunder, kända kort i dagens lokala mål. |
| B6 | Motståndare utan konto: samma flöde, världen och sedan Claude. |
| B7 | Kameran startad mitt i ett parti, med kort som redan är täckta: Claude eller spelaren, ingen specialbyggnad. |

## Mätningar (görs först, avgör allt annat)

| # | Fråga | Hur |
|---|---|---|
| **G1** | Hur bra är telefonen ensam mot hela världen? Säkra rätt och säkra fel på nya, hela kort. | Golden mot alla ~30 000 kort i stället för leken, med bildmodellen och ORB. Kräver ett nytt läge i `dev/golden/kor.cjs`, bredvid `--utan-leken`. |
| G2 | Hur många nya kort har ett första parti, alltså hur många Claude-frågor? | Ur sparade partier (`kort_handelser` i Supabase) eller golden-lekarna. Jämför med taket 30 per parti. |
| G3 | Hur ofta har Claude rätt på en enskild beskärning, hur lång tid tar det, och hur ofta stoppar kontrollen mot Scryfall-bilden ett rätt svar? | `--ai` på golden-beskärningarna. |
| G4 | Hur snabbt hittar den aktiva leken rätt lek? | Simulera med golden-lekarna; historik saknas än. |

## Teknik

| # | Gap |
|---|---|
| T1 | Fingeravtryck för hela världen på telefonen: ~15–30 MB, laddas ner en gång, filtreras på format och färg. |
| T2 | ORB mot kort vars bild inte finns i telefonen: bilderna för de 2–3 bästa kandidaterna hämtas från Scryfall vid behov. Tiden är okänd. |
| T3 | Minnet i datan: vilka kort spelaren har setts med, i vilket parti (Supabase). |
| T4 | Leken med två lägen, learned och complete. Digital kräver complete. |
| T5 | Trösklar per steg i trappan, kalibrerade ur G1. |
| T6 | Claude-flödet: spärren, en fråga per kort, kontrollen mot Scryfall, taket. Taket 30 per parti kan vara för lågt för ett första parti med en ny lek (se G2). |

## Design

| # | Gap |
|---|---|
| D1 | Vad som syns när Mirror startar utan lekval. |
| D2 | Läsmarkeringen för ett nytt kort. Designytan ["Mesa Reading Mark"](https://claude.ai/artifact/EguWdqncyTDFqvPR5TGYNM) (MES-362, 2026-10-11): A stilla sudd, B framkallas i takt, C tyst prick; väntar på Jespers val. Källor i `design_handoff_lasmarkering/`. |
| D3 | Efter partiet ("Mesa learned 34 cards") och hur learned- och complete-lekar syns på Home. |
| D4 | Att göra en learned lek complete inför Digital: lekfoto, import (Moxfield, Archidekt) eller inklistring. |

## Devil's advocate: fota leken först i stället?

Alternativet: spelaren fotar hela leken första gången (lekfotot, MES-321–324)
och kameran kör sedan stängt mot leken, som i dag.

| För fotot först | Emot |
|---|---|
| Första partiet lika bra som det tionde | Den öppna vägen behövs ändå: glömda kort, inbytta kort, motståndaren |
| Stängd igenkänning är mätt; världen är det inte | Lekfotot gav 27/40 på telefon (2026-10-02); resten rättas för hand före partiet |
| Fel rättas i lugn och ro | Fotot kräver också Claude: samma kostnad, väntan bara flyttad till före partiet |
| Redan byggt | 100 kort i Commander = många foton; varje steg före spelet tappar användare |

Claudes gissning (2026-10-10): lära sig medan man spelar, ~65 % säker,
villkorat av G1. Det som byter sida:

| G1 visar | Då |
|---|---|
| telefonen klarar de flesta nya kort själv | lära sig medan man spelar vinner |
| Claude behövs för ~70 % av nya kort | jämnt; fotot kan vinna |
| världssteget ger säkra fel namn | fotot vinner tills det är löst |

Inte antingen–eller: frågan är vilket som är förvalet. Fotot kan vara ett
erbjudande ("Show Mesa your deck: first game gets faster").
**Test i Private beta:** grupp A fotar först, grupp B spelar direkt. Jämför
rättningar per 100 kort i första partiet, tid från start till första kortet
på bordet, och om de spelar ett andra parti.

## Föreslagen ordning

1. **G1 och G2**, en mätning som avgör om världssteget alls håller.
2. B4 bekräftas med svaren i handen; övriga beslut står.
3. **Design D1–D3.**
4. **Bygget i fyra etapper:**
   1. minnet och den aktiva leken, så att leken väljs automatiskt
   2. världssteget lokalt
   3. Claude som lärare
   4. lekvalet bort ur Mirror

## Resultat G1/G2 (MES-361, 2026-10-11)

### Svaret först

| Fråga | Svar |
|---|---|
| Ger världssteget säkra fel namn? | **Nej, inte med trappans regel** (bildmodellen + ORB): 0 säkra fel mot världen i alla varianter. Bildmodellen ensam ger däremot säkra fel utanför leken (upp till 16 med leken + 500 slumpade kort), så ORB är inte valfritt. |
| Hur många nya kort klarar telefonen själv? | **~65 % på första försöket** (en beskärning av ett nytt, oskymt kort; bänken, inte appens kedja). Mot leken: 73 %. Att 18 av 20 kort fick ett säkert namn på någon av sina golden-bilder ska inte läsas som omläsningar: bilderna kommer från olika fall, inte från samma kort som ligger kvar. |
| Hur många nya kort har ett första parti? | 10–13 per spelare med en lek på 40–60 kort, alltså alla kort som dras och som inte är basland (Commander ~30). Med ~35 % till Claude blir det ~4 frågor, ~4 cent (Commander ~10). Taket på 30 per parti räcker. |

### G1: så mättes det

Appens 61 riktiga beskärningar ur golden (`dev/embed/riktiga`, 24 kort, 13 delvis skymda) jämfördes
med bildmodellen (`mobileclip-s0-vision.onnx`, samma som appen) mot tre listor. Skriptet är
`dev/remsa/varlden.py`, och ORB-steget körs med `dev/embed/varlden.html`.

| Lista | Innehåll |
|---|---|
| leken | golden-lekens 156 referensbilder, som i appen |
| leken + 500 | leken plus 500 slumpade kort ur världen, ett konstverk var |
| världen | Scryfalls `unique_artwork`: 49 546 bilder, 33 223 namn (båda sidor av dubbelsidiga kort; tokens, konstkort, emblem och liknande bortsållade). Lekens egna bilder ingår inte, eftersom telefonen inte vet vilken tryckning spelaren har. |

Receptet följer appens på två punkter: varje referensbild finns både skarp och suddig, och basland
räknas som typ. På en punkt är det förenklat, för att det ska gå att räkna på en Intel-Mac:
referenserna räknas bara upprätta, och frågan vrids fyra varv i stället. Förenklingen gör inte
världen bättre än appen. På leken ger den 56/61 rätt överst och 49 säkra rätt / 2 säkra fel vid
0,11; appens recept ger 53/61 och 46 / 2.

**Bildmodellen ensam** (alla 61, säkra rätt / säkra fel):

| Lista | rätt överst | > 0,08 | > 0,11 | > 0,15 |
|---|---|---|---|---|
| leken | 56 | 52 / 2 | 49 / 2 | 45 / 2 |
| leken + 500 | 51 | 47 / 3 | 42 / 0 | 38 / 0 |
| världen | 40 | 38 / 1 | 33 / 0 | 24 / 0 |

Lekens två säkra fel är kända sedan tidigare: Swamp → Plains i plastfickan (fall 11).

**Trappans regel för steg 3** gör ett namn säkert bara när ORB bär bildmodellens etta enligt
appens egen trappa (`identifyMedModell`: hel ruta, och 25 inliers, eller 14 inliers med marginal
0,06, eller 10 inliers med säker modell). ORB jämför mot Scryfall-bilden (small) av bästa
konstverket för vart och ett av de tre bästa namnen, hämtad vid behov. Basland är säkra på typen
vid marginal ≥ 0,15 (`LAND_MARGINAL`) när ORB inte säger emot. Konstanterna läses ur index.html.

| Lista | alla 61 | oskymda (48) | nya kort som inte är basland, oskymda (37 beskärningar) | kort med minst en säker beskärning (av 20) |
|---|---|---|---|---|
| leken | 41 / 1 | 35 / 0 | 27 (73 %) | 19 (inte Faithful Pikemaster) |
| **världen** | **33 / 0** | **31 / 0** | **24 (65 %)** | **18** (inte Faithful Pikemaster, Pharika's Chosen) |
| världen, navkorrigerad | 37 / 0 | 33 / 0 | 25 (68 %) | 18 |

Lekens enda fel med regeln är Swamp → Plains i plastfickan (fall 11, landregeln, 0,17). I appen
stoppas det av villkoret att spåret ska ligga för sig självt, vilket bänken inte har.

**Leken + 500 slumpade kort** är trappans steg 2 (minnet) i liten skala. Med bara skarpa
referenser gav bildmodellen ensam 8–16 säkra fel där, alla på ett enda kort, *Bottomless Pool //
Locker Room*, med marginal upp till 0,34. Med ORB-regeln blev det 0 säkra fel och 34–38 säkra
rätt. Utanför den aktiva leken får bildmodellen aldrig vara ensam vittne, oavsett marginal.

**Navkorten och den suddiga varianten.** Mot 33 000 namn hamnar ett fåtal referenser nära nästan
allt. I världen är det liggande kort: split-kort (Hit // Run, Give // Take), battles (Invasion of
…) och rum (Unholy Annex // Ritual Chamber).

- **Bara skarpa referenser:** ett navkort var etta för 41 av 61 beskärningar, och telefonen
  klarade 32 % av de nya korten (8 av 20).
- **Med appens suddiga variant:** det mesta av problemet försvinner (65 %, 18 av 20).
- **Navkorrigering ovanpå** (`--nav 10`, CSLS: halva referensens medellikhet med sina tio
  närmaste grannar med annat namn dras av): +3 procentenheter. Den finns inte i appen och behövs
  inte för beslutet.

**Tvillingarna och basland** (världen, skarp + sudd):

- **Tvillingarna.** Thriving Heath och Moor blev aldrig säkert fel, varken på varandra eller på
  Bluff, Grove eller Isle. Moor blev säker 2/2. Heath blev rätt överst 2 av 4 gånger, en av dem
  säker; två föll på navkort (skymd 03-02, och 02-03). ORB skiljer dock inte tvillingarna åt: i
  leken gav en Heath 13–17 inliers på Moor. Där stoppar ORB:s "emot" ett rätt namn i stället för
  att bära det.
- **Basland som typ.** Av 11 oskymda Plains och Swamp blev 7 rätt typ och säkra (marginal
  0,15–0,33). Två blev rätt men osäkra (02-02 på 0,150, 05-06 på 0,006), och två föll på
  liggande navkort men blev aldrig säkra (09-01, 10-01). Med navkorrigering blir Swamp → Plains i 05-06 0,113, alltså 0,04
  under `LAND_MARGINAL`. Swamp i plastfickan (fall 11) blir aldrig säker mot världen.

**Tid och storlek** (Macen; telefonen är inte mätt):

| Steg | Tid |
|---|---|
| sökningen bland 99 092 referenser (49 546 bilder × skarp och sudd), fyra vridningar | ~100 ms per beskärning (numpy); på telefonen 4 × 50 miljoner multiplikationer, uppskattat 0,2–0,5 s |
| ORB mot tre kandidater | 50–86 ms i huvudlös Chrome; telefonen 3–5 × (MES-214), ~0,2–0,4 s |
| hämtning av tre small-bilder parallellt, utan cache | ~40 ms median, 150–310 ms max på Macens nät; mobilnät inte mätt |
| fingeravtrycken (T1) | 99 092 × 512 i float16 = 100 MB; int8 ~50 MB. T1:s 15–30 MB kräver filtret på format och färg, eller färre referenser per kort |

Ett nytt kort bör alltså vara klart på under en sekund, inom B5. Storleken på fingeravtrycken är
däremot ett större problem än T1 räknade med.

**Förbehåll:**

- Underlaget är litet: 61 beskärningar, 20 kort som inte är basland, en lek, golden-ljus. En ny
  sorts säkert fel kan dyka upp med nästa lek.
- Trösklarna är inte kalibrerade för världen (T5); 0,11 och 0,15 är appens värden för leken.
- ORB kördes i Chrome på Macen, inte på telefonen.

### G1 steg 2: golden mot världen — inte kört

Villkoret är uppfyllt (0 säkra fel med regeln), men läget går inte att bygga bara i
`kor.cjs`. Golden kör appens kedja, och den skulle behöva:

- 33 000 namn i poolen, med förräknade vektorer;
- ORB-särdrag som hämtas vid behov i stället för ur poolen.

Det är etapp 2 i bygget ("världssteget lokalt"), och uppgiften var att inte bygga i appen. Förslag:
golden mot världen blir etapp 2:s acceptansprov.

### G2: nya kort i ett första parti

| Källa | Unika kort som inte är basland |
|---|---|
| `kort_handelser` (4 partier, 9–10 okt) | 0–4 per parti. Provpartier med 8–13 kort, säger inget om ett första parti |
| `boards`, bordets sista läge i Mirror-partier med ≥ 8 kort | 7–24 (största: 37 kort, 24 unika, 21 sept) |
| lekarna i Supabase (`decks`, 5 st, 40–65 kort) | 20–26 per lek; golden-leken 26 |
| dragna kort i ett första parti (hypergeometriskt ur de 5 lekarna) | 15 dragna kort: 9,5–10,7; 20 dragna: 11,8–13,0. Det är en övre gräns, eftersom allt man drar inte hamnar på bordet |
| golden-fallen | 0–9 per fall, 26 över alla |
| Claude-frågor i dag (`claude_fragor`, 10 partier) | median 8, p90 29, max 31 per parti. Taket på 30 nås redan i dag, med lekval (MES-326) |

**Kostnaden per spelare och första parti** (12 nya kort, Commander ~30, 0,9 cent per fråga).
Claudes andel är det som inte får namn lokalt på första försöket, ~35 %:

| | Claude tar | Frågor | Kostnad |
|---|---|---|---|
| allt till Claude | 100 % | 12 | 11 cent |
| **telefonen först (G1)** | **~35 %** | **~4** | **~4 cent** |
| Commander, allt till Claude | 100 % | 30 | 27 cent |
| Commander, telefonen först | ~35 % | ~10 | ~9 cent |

Varje kort frågas en gång. Under en leks hela liv blir det högst 26 frågor (60 kort) eller ~100
(Commander), om telefonen inte klarar något. Taket på 30 per parti räcker i alla rader. Taket på
300 per månad räcker till ~10 nya 60-kortslekar även utan telefonen.

### Svaret på devil's advocate-tabellen

| G1 visar | Stämmer det? |
|---|---|
| **telefonen klarar de flesta nya kort själv** | **Ja, men knappt:** ~65 % på första försöket, med appens recept och 0 säkra fel. |
| Claude behövs för ~70 % av nya kort | Nej: ~35 %. (Med bara skarpa referenser var det 68 %; den suddiga varianten gör skillnaden.) |
| världssteget ger säkra fel namn | **Nej**, inte med regeln. Men bildmodellen ensam ger säkra fel utanför leken. ORB måste vara villkor på varje steg utanför den aktiva leken, också minnet. |

**Satsningen:** lära sig medan man spelar, med fotot som erbjudande. Säkerheten är nu ~80 %, upp
från 65 %. Den farliga raden (säkra fel) är utesluten, telefonen klarar de flesta nya korten, och
resten kostar några cent per parti. Två saker ska komma först i etapp 2:

1. ORB som krav i steg 2 och 3 i trappan.
2. Fingeravtryckens storlek (100 MB i float16).

Det som kan få satsningen att byta sida: att 0 säkra fel inte håller på en annan lek eller i golden.

### Vad som återstår

| # | Vad | Varför |
|---|---|---|
| G3 | `--ai` på golden-beskärningarna. **Kräver Jespers ja.** | hur ofta Claude har rätt på de kort telefonen missar (här Faithful Pikemaster, Pharika's Chosen), hur lång tid det tar, och hur ofta Scryfall-kontrollen stoppar ett rätt svar |
| G4 | simulera den aktiva leken med golden-lekarna | oförändrat |
| – | världen på mer material: en annan lek, beskärningarna ur MES-246, och golden mot världen i etapp 2 | 20 kort är för lite för att lita på 0 säkra fel |
| – | fingeravtryckens storlek: int8, färre referenser, filtret på färg och format | 100 MB i float16 |
| – | testet i Private beta (grupp A fotar, grupp B spelar direkt) | oförändrat |

**B4 (Claude som lärare)** kan bekräftas i princip. G1 visar att Claude bara behövs för en
minoritet av de nya korten (~35 %), och G2 att det kostar några cent per parti. Ja:et bör ändå
villkoras av G3 före etapp 3: Claude + kontrollen mot Scryfall-bilden får inte ge fel namn.

### Nästa steg (Jespers beslut 2026-10-11)

65 % på första försöket, på 0,5–1 s (uppskattat), känns för långsamt för ett nytt kort. Två saker görs först:

1. **Kortet syns direkt, namnet fylls i efteråt.** Kortet ligger på mattan efter ~0,3 s med
   kamerans foto och en tyst läsmarkering, och namnet kommer när det finns: lokalt, via Claude
   eller av spelaren. Det är D2, och det bygger på framkallningen (MES-344) och "Mesa Mirror
   Animations" sida 2.
2. **Krymp världen innan sökningen.** Efter 2–3 säkra kort är lekens färger kända (i Commander
   färgidentiteten), liksom formatet och ofta seten. Mät på bänken (`dev/remsa/varlden.py`) hur
   mycket första försöket stiger och hur mycket snabbare det blir när världen filtreras.

Därefter: golden mot världen i appens kedja, för den riktiga siffran för första försöket. Bänken
underskattar troligen, eftersom appen har remsan och fler rutor.

## Resultat G3 (MES-364, 2026-10-11)

Claude som lärare: frågan ställs utan lekens namnlista, med kortlägets instruktioner exakt som de står i
`api/identify.js` (`mode === 'card'`, läses ur filen av skriptet), och svaret kontrolleras mot
Scryfall-bilden. Skript och rådata: `dev/g3/` (`fraga.cjs`, `kontroll.py`, `resultat/`).

### Svaret först

| Fråga | Svar |
|---|---|
| Har Claude rätt? | **Ja, nästan alltid:** 55–57 av 61 med Opus 5, Opus 5.5 och Sonnet 5.5 (90–93 %). Av de 13 beskärningar telefonen inte klarade i G1 får Claude 9–11 rätt. Haiku 5.5 (49/61, sju tomma svar) och Sonnet 5 (51/61, felstavade namn) är sämre. |
| Säkra fel efter kontrollen? | **0, i alla sju konfigurationer och alla tre mängder.** Claudes fel blir aldrig säkra: felstavade namn finns inte i Scryfall, grannkort och fel kort får för få ORB-träffar. |
| Hur ofta stoppar kontrollen ett rätt svar? | **Ofta: 17–19 av 55–57 rätta (31–33 %).** Av de 13 svåra korten släpps bara 2 igenom, fast Claude har rätt på 9–11. Kontrollen stoppar alltså det mesta av det Claude är till för. 8 av de 18 stoppade hos Opus 5.5 medium är basland med låg marginal, resten är kort där ORB inte hittar något (suddigt, skymt, blänk), samma kort som ORB inte bar i G1. |
| Hur lång tid? | Median **1,1–1,4 s** med Sonnet och **1,8–2,9 s** med Opus; p90 2,0 s (Sonnet 5.5) mot 3,0–6,1 s (Opus). Haiku är inte snabbare (2,0 s, p90 3,9 s). Kontrollen lägger ~0,1–0,3 s (G1). |
| Vilken modell? | **Sonnet 5.5, effort low** (förslag): lika många rätt som Opus på de nya korten (33 av 37, Opus 5.5 low 35), p90 2,2 s, **0,25 cent** per fråga mot 0,5–0,6 cent för Opus. Det är bättre än kodens förval för kortläget, Sonnet 5 (29/37, 9 fel namn). |

### Så mättes det

- **Material:** appens 61 riktiga beskärningar (`dev/embed/riktiga`, facit i `manifest.json`), skickade som de är
  (410–505 px breda JPEG). Tre mängder: alla 61; de 37 oskymda nya korten som inte är basland (som G1); och de 13
  av dem som telefonen inte klarade mot världen i G1 (trappans regel i G1, omräknad: Thriving Heath ×2, Maul of the
  Skyclaves ×3, Vraska's Finisher, Scourge of the Undercity, Pacifism, Ukud Cobra, Pharika's Chosen ×2, Hooded
  Blightfang, Faithful Pikemaster).
- **Fråga:** `claude-*`, `output_config.effort`, `max_tokens` 4000, ingen `thinking`-parameter (som i appen),
  strömmande anrop; svarstiden är klientens tid från anrop till färdigt svar, från Macen, sju konfigurationer
  samtidigt. En körning per konfiguration (se förbehåll).
- **Kontrollen** är trappans steg 3 i G1 med Claudes namn som kandidat: namnet slås upp i Scryfalls
  `unique_artwork` (finns det inte: stoppat, "okänt namn"); bildmodellen räknar sin poäng och marginal för just
  det namnet (negativ när modellen har något annat överst); ORB körs i appens egen kod mot den bild av namnets
  konstverk som ligger närmast beskärningen. Säkert när ORB bär namnet enligt appens trappa (`identifyMedModell`:
  25 inliers på hel ruta, 14 med marginal 0,06, eller ORB_ACCEPT med säker modell). Basland: säkert på typen vid
  modellmarginal ≥ 0,15 (`LAND_MARGINAL`) som i G1. Siffrorna är på namn, inte konstverk: Claude kan inte veta vilken
  tryckning spelaren har.
- **Rätt** = samma namn, framsidan av ett dubbelsidigt kort, eller samma basland (som `samma_kort` i G1).

### Alla 61 beskärningar

| Konfiguration | Rätt | Rätt och säkra | **Säkra fel** | Rätt men stoppade | Fel och stoppade | Tomt svar | Median | p90 | Per fråga |
|---|---|---|---|---|---|---|---|---|---|
| Opus 5, medium (dagens huvudmodell) | 56 | 38 | **0** | 18 | 3 | 2 | 1,8 s | 3,5 s | 0,63 cent |
| Opus 5.5, medium | 56 | 38 | **0** | 18 | 4 | 1 | 2,9 s | 6,1 s | 0,58 cent |
| **Opus 5.5, low** | **57** | 38 | **0** | 19 | 4 | 0 | 1,8 s | 3,0 s | 0,50 cent |
| Sonnet 5.5, medium | 55 | 38 | **0** | 17 | 3 | 3 | 1,4 s | 2,0 s | 0,24 cent |
| **Sonnet 5.5, low** | 55 | 38 | **0** | 17 | 3 | 3 | 1,3 s | 2,2 s | 0,25 cent |
| Haiku 5.5, medium | 49 | 35 | **0** | 14 | 5 | 7 | 2,0 s | 3,9 s | 0,03 cent |
| Sonnet 5, medium (kodens förval för kortläget) | 51 | 36 | **0** | 15 | 9 | 1 | 1,1 s | 1,3 s | 0,22 cent |

### De 37 nya, oskymda kort som inte är basland

| Konfiguration | Rätt | Rätt och säkra | Säkra fel | Rätt men stoppade | Fel och stoppade | Tomt svar |
|---|---|---|---|---|---|---|
| Opus 5, medium | 33 | 26 | 0 | 7 | 3 | 1 |
| Opus 5.5, medium | 34 | 26 | 0 | 8 | 2 | 1 |
| Opus 5.5, low | 35 | 26 | 0 | 9 | 2 | 0 |
| Sonnet 5.5, medium | 33 | 26 | 0 | 7 | 1 | 3 |
| Sonnet 5.5, low | 33 | 26 | 0 | 7 | 1 | 3 |
| Haiku 5.5, medium | 29 | 24 | 0 | 5 | 3 | 5 |
| Sonnet 5, medium | 29 | 25 | 0 | 4 | 7 | 1 |

För jämförelse klarade telefonen själv 24 av de 37 (G1, 65 %). Claude + kontrollen ger 26: två kort mer, inte de 33–35
som Claude har rätt på.

### De 13 som telefonen inte klarade (G1)

| Konfiguration | Rätt | Rätt och säkra | Säkra fel | Rätt men stoppade | Fel och stoppade | Tomt svar |
|---|---|---|---|---|---|---|
| Opus 5, medium | 9 | 2 | 0 | 7 | 3 | 1 |
| Opus 5.5, medium | 10 | 2 | 0 | 8 | 2 | 1 |
| Opus 5.5, low | 11 | 2 | 0 | 9 | 2 | 0 |
| Sonnet 5.5, medium | 9 | 2 | 0 | 7 | 1 | 3 |
| Sonnet 5.5, low | 9 | 2 | 0 | 7 | 1 | 3 |
| Haiku 5.5, medium | 5 | 0 | 0 | 5 | 3 | 5 |
| Sonnet 5, medium | 5 | 1 | 0 | 4 | 7 | 1 |

### Vad de fel Claude gör är

- **Felstavningar** (Haiku och Sonnet 5): "Maul of the Skyslaves", "Dead Cobra", "Adelita, Viper Whisperer",
  "Faithful Pikesmaster". De stoppas redan av uppslagningen. Det är hela skillnaden mot Sonnet 5.5.
- **Grannkort och fel kort:** Scourge of the Undercity → Pacifism (alla sju konfigurationer; ORB 7 inliers), Pharika's
  Chosen → Phyrexian Ghoul/Obliterator, Hooded Blightfang → Bladewing the Risen/Bloodhall Ooze.
- **Basland:** Swamp → Plains (05-06, 06-11) hos flera konfigurationer. Modellens marginal för Plains är −0,006 och
  0,019, långt under 0,15, så de stoppas.
- **Claudes egen säkerhet är värdelös som signal:** 27 av 31 felaktiga svar har `sakerhet: "hog"`. Utan kontrollen
  hade nästan alla fel blivit säkra.

### Kan kontrollen vara snällare? (efterhandsprov, inte en regel)

Bara 5 unika felaktiga svar utan basland (46 unika par), så det här säger lite. ORB mot Claudes namn, utan krav på hel ruta
och utan modellens hjälp, på de unika paren över alla konfigurationer:

| ORB-krav | Rätta svar som släpps igenom (av 41) | Fel som släpps igenom (av 5) |
|---|---|---|
| ≥ 25 inliers (dagens trappa, utan modellens stöd) | 25 | 0 |
| ≥ 14 | 31 | 0 |
| ≥ 10 | 33 | 0 |
| ≥ 8 | 33 | 0 |
| ≥ 5 | 34 | 1 (Pacifism, 7 inliers) |

Ett lägre ORB-krav (8–14 inliers) skulle släppa igenom 6–8 rätta svar till, utan nytt fel i det här materialet, men
det felet vi har (Pacifism, 7 inliers) ligger bara en tröskel under. Fem fel är för få för att sätta en tröskel på.
Det är ett beslut för Jesper och för mer material, inte något som ändrats i appen.

### Förbehåll

- **En körning per konfiguration.** En andra körning gick inte att göra: kontots kredit tog slut (`Your credit balance
  is too low`) efter ~1,56 USD i G3, så de två bästa kördes inte om. Skillnader på ett eller två kort (Opus 5.5 low 35
  mot Sonnet 5.5 33 av 37) är inom bruset, och p90 av 61 anrop är grovt.
- **Svarstiden** är mätt från Macen mot API:et, sju konfigurationer samtidigt, inte från en telefon. Opus 5.5 medium
  hade enstaka anrop på 8–12 s. Kodens kommentar om 6,9 s (Opus) och 2,9 s (Sonnet) för närbilder är från den
  gamla modellgenerationen och stämmer inte längre.
- **Beskärningarna** är appens golden-beskärningar från ett ljus och en lek (24 kort, 13 delvis skymda), inte spelares
  kameror. Ett nytt kort i ett riktigt parti är ofta svårare (blänk, ljus, hand).
- **Kontrollen kördes i huvudlös Chrome på Macen**, med bilder hämtade från Scryfall vid behov (som G1); telefonen är inte mätt.
- **Namnuppslagningen** är exakt (gemener, eller framsidan av ett dubbelsidigt kort). Appen skulle behöva Scryfalls
  `fuzzy` eller en egen lista; en fuzzy-träff på "Skyslaves" hade släppt in ett fel namn som kontrollen sedan får bära.
- **Kostnaden** är räknad ur `usage` med listpriser (Opus 5 5/25 USD, Opus 5.5 4/20, Sonnet 2/10, Haiku 5.5 0,10/0,50
  per miljon token); totalt 1,56 USD för sju konfigurationer × 61 frågor.
- **Systemprompten är oförändrad.** Instruktionerna används exakt som de står i `api/identify.js`; ingen ändring i
  appen eller i `api/`.

### Vad det betyder för B4 (Claude som lärare)

- Säkerheten håller: **0 säkra fel** med kontrollen, i 7 × 61 svar.
- Vinsten är liten med dagens kontroll: Claude + ORB ger 26 av 37 nya kort säkra, telefonen ensam 24. Claude har rätt på
  33–35 av 37, men kontrollen stoppar det mesta av det som telefonen inte redan bar.
- Det som stoppas hamnar hos spelaren ("Name this card"), som CLAUDE.md kräver, men Claudes namn kan då **föreslås** i
  stället för att tas som säkert: 9–11 av de 13 svåra korten hade fått rätt förslag. Det kräver ingen ny kontroll, bara
  att spelaren bekräftar med ett tryck.
- Öppet: ett snällare ORB-krav (ovan) eller ett andra lokalt vittne för Claudes namn. Båda kräver mer material.

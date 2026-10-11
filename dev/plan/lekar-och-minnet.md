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
| D2 | Läsmarkeringen för ett nytt kort. Hör ihop med "Mesa Mirror Animations" sida 2, "När kameran vet". |
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

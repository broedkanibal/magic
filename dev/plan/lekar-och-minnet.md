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

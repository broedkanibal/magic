# Nattpasset 2026-09-28: lekfotot efter sida M

Uppdraget var att bygga "Lägg till kort via foton" efter sida M i designytan
"Mesa Deck Photo Flow E" (MES-320, delarna MES-321–324). Loggen steg för steg
finns i `dev/plan/natt-2026-09-28-logg.md`.

## Kort sagt

| | Läge |
|---|---|
| **Ute i produktionen** | alla fyra delarna: telefonen (MES-321), datorn medan man fotar (MES-322), slutet (MES-323) och samma kort i två foton (MES-324). Main = `9a6bffa`, och sidan ute är identisk med filen |
| **Väntar på dig** | telefonprov av alla fyra (kolumnen **Redo att testas**), och två val: fall D i Check names, och kantkorten som saknar namn (se *Val att titta på*) |
| **Stoppat** | inget |

Allt som slogs ihop gick igenom samma grindar:
- `kolla.sh` grön;
- lekfotots golden **lika bra**, med **0 fel namn rakt in i leken**;
- en fristående granskare som läste diffen.

Granskaren hittade fel i varje del. I tre av fyra delar kunde kort hamna dubbelt i leken eller försvinna ur den. Allt sådant rättades och granskades igen före push.

## Per issue

| Issue | Vad | Merge på main | Kolumn i Linear |
|---|---|---|---|
| MES-321 | telefonen: resultatet efter varje foto, kameran, Retake, LD1–LD4, I10, lekkanalens format | `d15bc98`, `7f59186` | Redo att testas |
| MES-322 | datorn medan man fotar: Take photos, fotoraderna, View a photo, Remove photo och Retake med Undo | `95413a7` | Redo att testas |
| MES-323 | slutet: Check names ett kort i taget, Type in the cards you put aside, Basic lands, Later, klart-lägena | `6612b95` | Redo att testas |
| MES-324 | samma kort i två foton: LB1 med Remove photo och N5, LB2 med ?, "One Swamp or two?" i Check names | `7f17dec`, `9a6bffa` | Redo att testas |

### Grindarna, före → efter

| Grind | Före (`dc825e3`) | Efter (`9a6bffa`) |
|---|---|---|
| `kolla.sh`, kamerabänken | 157 OK, 0 FEL | 157 OK, 0 FEL |
| lekens ändringar (`lekslag`) | 49 OK | 75 OK |
| telefonens lekfoto (`lekfoto`) | 42 OK | 82 OK |
| datorn medan man fotar (`lekfoto-dator`, ny) | — | 56 OK |
| slutet (`lekfoto-slut`, ny) | — | 40 OK |
| lekgolden, hela bilden, 10 set | 336/372 rätt, 4/10 exakt | 336/372 rätt, 4/10 exakt |
| lekgolden, fel namn rakt in i leken | 0 | 0 |
| lekgolden, kamerans ram, 10 set | 128/372 rätt | 128/372 rätt |
| lekgolden, osäkra (namn under To check) | 100 / 22 | 101 / 23 (det kort som "One Swamp or two?" frågar om) |

Lekgolden kördes ur cachen, utan nya Claude-anrop, eftersom ingen ändring rörde
läsningen, beskärningen eller systemprompten. Kamerans kod rördes inte, så
kameragolden behövdes inte. De nya proven fäller koden före varje rättelse.

### Samma kort i två foton: hur bra det är

| Varning | Mätt | Resultat |
|---|---|---|
| **LB1** "samma bord igen" | 40 slumpade lekar med fyra av varje kort, ny uppläggning | 0 falsklarm |
| LB1 | lekgoldens set (olika kort i varje foto) | 0 falsklarm |
| LB1 | riktiga andrafoton av samma bord | 4 av 7 (hela bilden), 2 av 3 (ramen). Missarna är bord som vridits 90° eller 180° |
| **LB2** "kanske också i foto 1" | riktiga foton | **omätt**: kort som kapas vid kanten får nästan aldrig ett namn av Claude |

Regeln för LB1: minst tre säkra kort som inte är basländer, och två tredjedelar
av dem med samma namn **på samma plats** som i ett tidigare foto. Bara namnen
räcker inte, för då slår varningen till på lekar med fyra av samma kort.

### Vad granskningen hittade

| Issue | Fynd som rättades före push |
|---|---|
| MES-321 | **ett misslyckat omtag följt av ett nytt lade fotots kort dubbelt (6 i stället för 3)**; ett osparat foto försvann tyst; serverfel visades som tappat nät; datorns omtag föll tyst; fem småsaker i andra varvet |
| MES-322 | **en andra datorflik kunde lägga 12 kort dubbelt med Undo**; **Undo efter omladdning kunde lägga kort dubbelt**; **Undo:s bokföring kunde låta en senare Remove ta ett annat fotos kort**; låsta knappar och en spökrad efter omladdning mitt i en läsning |
| MES-323 | efter Later nådde man aldrig Create deck; dubbel Enter lade in ett undanlagt kort två gånger; basländernas tal räknade Mesas gissningar |
| MES-324 | **"One Swamp or two?" kunde ta bort det enda exemplaret** efter ett omtag; LB1 slog till på riktiga nya kort i lekar med fyra av samma; två flikar kunde svara "One" två gånger; frågans märke hängde kvar efter ett omtag; Undo av Remove photo tog inte tillbaka frågan |

## Att prova på telefonen

Använd samma konto på telefonen och datorn, och prova i den här ordningen. Varje issue har en kommentar i Linear med stegen i detalj.

1. **MES-321 (telefonen):**
   - Take photos på datorn, skanna QR-koden.
   - Kameran: "Names are readable" och varningarna.
   - Foto 1: "N cards found", blå bock och gult ?. **Hamnar prickarna på rätt kort?**
   - Retake photo 1, fler än 15 kort, och flygplansläge mitt i en läsning följt av Try again.
   - Räkna korten på datorn efter varje steg. Avsluta med Finish the deck.
2. **MES-322 (datorn):** fotoraderna, View a photo, Remove photo… och Undo, Retake with the phone, omladdning mitt i fotandet, två flikar.
3. **MES-323 (slutet):**
   - Finish the deck.
   - Check names i fyra fall, och Not a card.
   - Skriv in ett undanlagt kort, och kolla basländerna.
   - Klart på lekens sida, och i Game setup (Create deck). Pröva också Later.
4. **MES-324 (samma kort i två foton):**
   - Ta foto 2 utan att flytta korten: telefonen ska föreslå Remove photo 2.
   - Lägg ett kort så att det kommer med i kanten på två foton. Kommer frågan "One Swamp or two?" i Check names?

## Val att titta på

| Issue | Valet | Varför |
|---|---|---|
| **MES-323** | **Check names fall D** (namn ur en inklistrad lista) säger "It’s in the deck with a Check mark until you answer." i stället för sida M:s "Not in the deck until you pick" | Paste a list lägger i dag in närmaste träffen som en gissning. Sida M:s mening kräver att Paste a list lägger en platshållare i stället, och det ändrar Paste a list också utanför lekfotot. **Ditt beslut** |
| **MES-324** | **Kort som kapas vid fotots kant** blir namnlösa platshållare ("Which card is this?"). Skriver man in namnet kan kortet bli en dubblett av samma kort i nästa foto | Claude läser nästan aldrig ett namn på ett kapat kort. Det är nästa spak. Ett alternativ är att datorn frågar om kantkorten på ett annat sätt; det är ett designval. **Ditt beslut**, ingen issue skapad |
| MES-324 | LB1 kräver samma plats, så ett vridet bord fälls inte, och en sorterad lek med två av varje kort på samma platser ser ut som samma bord | namnen ensamma gav falsklarm på lekar med fyra av samma kort |
| MES-322 | Undo efter Remove photo gäller inte medan ett foto med samma nummer läses | annars två rader "Photo 2"; N6 säger "tills nästa foto landar" |
| MES-322 | Remove photo… frågar först ("Remove photo 2 and its 12 cards?") | tre punkter i HD2 |
| MES-321 | LC2 (för många kort) slår till vid fler än 15 kort där minst vart fjärde ska kollas | satt, inte mätt |
| MES-321 | `TELFOTO_HOGAR` 5 → 4, så att 10–15 kort inte ger "Move closer" | nya antalet per foto |
| MES-321 | serverfel får en egen skärm i LD-form med serverns text; nätfel ger LD1 | Try again kan aldrig hjälpa mot ett serverfel |
| MES-323 | Basic lands har "I’m done" i ramen, som ID2 | steget behöver ett slut |
| MES-323 | omgången i slutet sparas i webbläsaren i 24 timmar | på en annan dator visas To check som förut |

Alla val står också i commit-meddelandena.

## Uppföljningar, inte gjorda i natt

| Vad | Allvar |
|---|---|
| Två enheter samtidigt: ett manuellt − och en Remove photo mot ett foto från telefonen ger 2 eller 3 Swamp beroende på vilken sparning som landar först. Enheterna blir ändå överens. Förslag: det manuella − bär vilket foto det gäller | liten |
| Två enheter, en med gammal vy: har den ena svarat Two på "One Swamp or two?" och den andra tar bort fotot och ångrar, ställs frågan igen | liten, kräver två enheter |
| Remove på en rad → Remove photo → Undo på raden lägger tillbaka exemplaren med det borttagna fotots märkning | liten |
| En telefon som dör mitt i en läsning låser Remove/Retake på datorn tills nästa kontakt eller omladdning | utanför v1 enligt sida M:s grå lapp |
| Konstanten `LEK_LAGGTXT` används inte längre | städning |

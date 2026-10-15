# Mirror lär sig leken: planen för bygget

Plan 2026-10-13 för etapp 1–4 i `dev/plan/lekar-och-minnet.md` (*Föreslagen
ordning*), skriven mot main `70b1461`. Besluten, mätningarna (G1–G3) och
skälen står i den filen. Här står bara hur det byggs.

## Kort sagt

- **Inget av bygget är påbörjat.** Det som är klart: mätningarna G1/G2
  (MES-361), G3 (MES-364), krymp världen (MES-363), och läsmarkeringen D2
  (MES-362, på main). Ingen issue finns för etapperna (kollat i Linear
  2026-10-13, också arkiverade).
- **Mirror-planen äger motorn** (Jespers beslut 2026-10-13): minnet,
  sökningen bland alla kort och Claude som lärare byggs en gång, här. Att
  läsa in en lek (`dev/plan/lekfoto-efter-provet.md`, B8) blir en andra
  ingång till samma motor och startar först när etapp 1–3 ligger på main.
- **Sex steg i koden, två designytor och tre mätningar.** Två steg kan börja
  nu, parallellt (1a datan, 2a världens fingeravtryck). Resten går i tur och
  ordning, eftersom alla rör läsningen i `kamIdentifiera`.
- **Den största risken är ett säkert fel namn med en ofullständig lek.** En
  inlärd lek saknar alltid kort. Det är precis fallet där Thriving Heath
  blev Thriving Moor (MES-235). Därför kommer den spärren före allt annat i
  läsningen.

## Var varje punkt i `lekar-och-minnet.md` hamnar

Besluten (B), mätningarna (G), teknikgapen (T) och designgapen (D) står i
`lekar-och-minnet.md`. Den här tabellen säger var var och en byggs eller
redan är klar.

| Punkt | Kort | Läge | Här |
|---|---|---|---|
| B1 | Mirror utan lekval | beslutat | etapp 4 |
| B2 | minnet på spelaren | beslutat | 1a |
| B3 | antal: inget för basland, mjukt stöd, singleton i Commander | beslutat | 1a (antal i learned lek), 4 (datorns regler) |
| B4 | Claude som lärare | bekräftat 10-11 | etapp 3 |
| B5 | Name this card < 1 per parti | mål | acceptansprovet i etapp 4 |
| B6 | motståndare vars kort Mesa aldrig sett | förtydligat 10-11 | samma väg: 2b + 3, inget eget steg |
| B7 | kameran startad mitt i partiet | beslutat | ingen specialbyggnad: täckta kort går till Claude (3) eller spelaren |
| B8 | inlärningen hör till Private beta | beslutat | hela planen |
| B9 | D2 = variant B | **byggt** (MES-362) | – |
| B10 | krymp världen byggs inte | beslutat | – |
| G1, G2 | världen, nya kort per parti | **mätt** (MES-361) | underlag för 2a/2b. G1 steg 2 (golden mot världen) = acceptansprov i 2b |
| G3 | Claude som lärare | **mätt** (MES-364) | underlag för 3 |
| G4 | hur snabbt den aktiva leken hittar rätt | **inte mätt** | bänken före 1b |
| T1 | världens fingeravtryck på telefonen | **byggt** (MES-375): E3, 31 MB, 24/37, 0 fel | 2b |
| T2 | ORB mot Scryfall-bilder vid behov | gap | 2b |
| T3 | minnet i datan | gap | 1a |
| T4 | learned och complete | gap | 1a |
| T5 | trösklar per steg i trappan | gap | 1b (steg 2), 2b (steg 3) |
| T6 | Claude-flödet: spärren, en fråga per kort, kontrollen, taket | gap | 3 |
| D1 | Mirror utan lekval | **ingen yta** | designytan D1 + D3, före 4 |
| D2 | läsmarkeringen | **byggd** (MES-362) | – |
| D3 | efter partiet, learned/complete på Home | **ingen yta** | designytan D1 + D3, före 4 |
| D4 | learned → complete inför Digital | delvis: lekfotot (`lekfoto-efter-provet.md`) | inläsningen av en lek; import och inklistring finns |

## Vad som finns i dag, och vad som saknas

Kartlagt i koden 2026-10-13. Radnummer gäller `70b1461`.

| Del | I dag | Saknas |
|---|---|---|
| Listan korten jämförs mot | **en lek**, vald i uppstarten. `Pool` byggs per lek (`byggLekPool`, rad 22785), och allt (bildmodellen, ORB, OCR, remsan, Claudes namn) jämförs mot den | en lista byggd av en *namnmängd* i stället för ett lek-id |
| Lekvalet | krav i uppstarten för båda lägena (`OPP_ORDNING`, rad 13576, `steg.lek`). Telefonen tar lekens id ur `game_players.lek_id` (`kamValdLek`, rad 32288) | inget |
| Utan lek | ingen igenkänning alls, ingen Claude-fråga (rad 32434, 32838), datorns antalsregler stängs av (`lekAntal` = Infinity) | allt |
| Minnet | bara remsornas minne, 20 s inom ett parti (`T.remsaMinne`) | **en tabell för kort spelaren setts med** (T3). `kort_handelser` kan inte läsas av klienten (bara insert) |
| Hela världen | **bara i bänken** (`dev/remsa/varlden.py`, filerna i `dev/material/arbete/2026-10-11-mes-361-varlden/`, inte i git): 49 546 konstverk, 33 223 namn, 2 × 59 MB vektorer | fingeravtryck på telefonen, och ORB mot Scryfall-bilder som hämtas vid behov |
| Förräknade vektorer | `card_embeddings` (Supabase), per kort, 8 × 512 fp16 per rad, 489 rader. Fylls bara av `dev/embed/forrakna.cjs` | ett format för världen (8 vektorer per kort × 49 546 = för stort) |
| Claude i Mirror | `mode: 'kamera'` med **lekens namn** (`kamAiNamnen`, rad 32818). Svar utanför leken kastas (`kamAiPoster`, rad 32871) | fråga utan lista (`mode: 'card'` finns, används av datorns skärmbildsväg), kontrollen mot Scryfall-bilden i appen, och en väg för ett namn som inte finns i listan |
| Claude-modell för `card` | `ANTHROPIC_MODEL_CARD`, förval `claude-sonnet-5`, effort medium (`api/identify.js` rad 83, 525) | G3 föreslår Sonnet 5.5, low |
| Golden | leken ur `lek.txt`; `--utan-leken` tar bort namn | ett läge utan lek, mot världen (G1 steg 2) |

## Etapperna

Varje steg är en session (eller en agent i en orkestrering). Modell och
effort följer tabellen i CLAUDE.md.

### Etapp 1 · Minnet och den aktiva leken

**Målet:** Mesa minns alla kort den sett hos spelaren, och väljer själv
vilken lek som spelas. Ingenting nytt syns för spelaren än; lekvalet finns
kvar till etapp 4.

#### 1a · Minnet i datan (T3, T4)

Rör bara Supabase, `Moln` och datorns logg. Ingen kamerakod.

| Del | Innehåll |
|---|---|
| Tabell | `spelarens_kort` (namn kan ändras): `user_id`, `namn` (oracle-namn), `sid` (tryckningen som syntes), `game_id`, `kalla` (telefon · claude · spelaren · inlast), `bekraftad`, `sedd`. En rad per spelare, parti och namn. Samförekomsten räknas ur raderna, så ingen egen tabell behövs |
| RLS | ägaren läser och skriver sina egna rader. Motståndare läser inget |
| Skrivs när | ett namn blir **säkert** på spelarens bord: telefonen, Claude efter kontrollen (etapp 3), eller spelaren (Name this card, rättelse). Osäkra namn skrivs aldrig. En rättelse (`bytt`) ersätter raden. Samma ställe som `khLogga` (rad 34307), som redan loggar varje namn i Mirror |
| Inläst lek (lekfotosessionens önskemål 1) | en väg som skriver **hela leken på en gång** som bekräftade rader (`kalla: inlast`), när spelaren tryckt Create deck på datorn |
| Learned och complete (T4) | `decks.lage` = `learned` eller `complete`. En inläst eller inklistrad lek är complete; en lek som Mirror lärt sig är learned. Digital kräver complete |
| Antal | en learned lek har inget säkert antal: högsta antalet som setts samtidigt i ett parti, och det är ett mjukt stöd, inte ett tak (B3). Basland har inget antal |
| Bakåt | fyll minnet en gång ur gamla partier (`boards`, 116 rader, bordets sista läge per spelare och parti) och ur `decks`, så att testarna inte börjar tomt (Jespers ja 2026-10-13, J2) |

Migrationen körs av Jesper, som MES-354 (sleeve-färgen sparas på leken).

**Klart när:** `dev/kolla.sh` grön, ett test som skriver och läser minnet
som två olika konton (RLS), och ett parti på localhost där minnet fylls.
Ingen golden: ingen kamerakod rörs.

**Modell:** Opus 5.5, high (`mesa-bygg`).

#### 1b · Den aktiva leken och trappans steg 2

Rör läsningen (`Pool`, `kamValdLek`, `kamIdentifiera`). Krockar med 2b och 3.

| Del | Innehåll |
|---|---|
| Fel namn utanför leken (MES-235) **först** | en inlärd lek saknar alltid kort. `--utan-leken` ger i dag **6 säkra fel namn** på main (fall 01, 03 ×2, 08, 14, 15; mätt 2026-10-05), bland dem Thriving Heath → Moor. Föreslagen spärr för tvillingarna: ett läst namn som skiljer sig från listans namn i ett **helt ord** är inte samma kort. De andra felen måste spåras till sin väg |
| `--utan-leken` med en fast lista (MES-266) | grinden för en ofullständig lek måste mäta samma sak varje gång. MES-266 säger att den inte gör det i dag. Bestäm listan en gång och skriv den i `dev/golden/` |
| Poolen ur en namnmängd | `byggLekPool` tar en lista med namn och tryckningar i stället för ett lek-id. Cachen i IndexedDB per kort, inte per lek, så att ett byte av aktiv lek inte bygger om allt |
| Starten | den lek spelaren spelade senast (learned eller complete). Telefonen gör redan nästan så när ingen lek valts (`kamValdLek`) |
| Bytet | efter 2–3 säkra kort: byt till korten ur de partier där just de korten fanns (samförekomst). Ett kort som syns och inte finns i den aktiva leken drar in sina grannar ur minnet |
| Steg 2 i trappan | resten av spelarens minne, med **ORB som villkor** (G1: bildmodellen ensam gav upp till 16 säkra fel utanför leken). Bildmodellen får aldrig vara ensam vittne utanför den aktiva leken |
| Claude | oförändrat i 1b: `kamera`-läget med den aktiva lekens namn |

**Mätningen G4 först** (bänk, ingen appkod): simulera den aktiva leken med
de 6 lekarna i `decks` och golden-leken. Hur många säkra kort behövs innan
rätt lek väljs, och hur ofta väljs fel? Ett skript i `dev/`, Sonnet 5.5
medium (`mesa-matning`).

**Klart när:** G4 visar att rätt lek väljs efter ≤ 3 säkra kort i de flesta
dragningar. Golden en gång (alla fall): **0 fel namn**, rätt namn inte färre
än baslinjen. `--utan-leken` med den fasta listan: 0 fel namn. Golden utan
`--ai` håller (Claude är aldrig ett villkor).

**Modell:** Fable 5.1, high (`mesa-bygg-tung`): spärren mot fel namn.

### Etapp 2 · Sökningen bland alla kort, på telefonen

**Målet:** ett nytt kort som inte finns i minnet får ett säkert namn på
telefonen, utan Claude, i ~65 % av fallen (G1) och med 0 säkra fel.

#### 2a · Världens fingeravtryck (T1)

Rör bara `dev/` och en fil som laddas upp. Kan köras parallellt med 1a.

| Fråga | Hur |
|---|---|
| Storleken | 100 MB i float16 är för stort. Mät på bänken (`varlden.py`): int8 (~50 MB), en referens per namn i stället för per konstverk, färre dimensioner. För varje variant: första försöket och säkra fel med G1:s regel |
| Receptet | bänken räknar referenserna upprätta och vrider frågan fyra varv; appens lek-pool har fyra vridningar × två varianter per referens. Världen behöver bänkens recept (annars 8 × större). Kontrollera att JS och Python ger samma vektorer (`kalibrering.py`) |
| Var filen ligger | Supabase storage (som bucket `modeller`) eller statisk fil på Vercel. Laddas ned en gång och sparas i telefonen (Cache Storage eller IndexedDB) |
| Remsorna (lekfotosessionens önskemål 2) | remsornas vektorer för världen är en egen fil. **Väntar på lekfotots session 3** ("G1 för remsor", `prompt-2026-10-13-lekfoto-3-lasningen.md`), som mäter om v2-remsan mot 49 000 remsor ger säkra namn och vilket andra vittne som håller. Resultatet skrivs under *Resultat* i `lekar-och-minnet.md`. Remsdelen behövs också för Mirrors landhögar och kort omlott |

**Klart när:** en fil på högst 50 MB (J3), helst ~25 MB, med första
försöket inom ett par procentenheter från G1:s 65 % och 0 säkra fel på
bänken.

**Modell:** Opus 5.5, high.

#### 2b · Världssteget i kamerakedjan (T2, T5)

Rör läsningen. Efter 1b.

| Del | Innehåll |
|---|---|
| Ordningen | steg 1 (aktiva leken) → steg 2 (minnet) → steg 3 (världen). Steg 3 körs bara för ett **nytt, helt kort som ligger still** (punkt 6 i riktningen). Remsor och delvis täckta kort söks inte i världen förrän remsdelen från 2a finns |
| Sökningen | i en worker, så att spårningen inte hackar. Uppskattat 0,2–0,5 s på telefonen |
| ORB vid behov | Scryfall-bilden (small) för de tre bästa namnen hämtas och ORB körs med appens egen kod. Cache per bild. G1: 50–86 ms på Macen, ~0,2–0,4 s på telefonen |
| Regeln | G1:s: säkert bara när ORB bär bildmodellens etta enligt appens trappa (`identifyMedModell`). Basland som typ vid marginal ≥ 0,15 (`LAND_MARGINAL`) |
| Navkorten | liggande kort (split, battles, rum) hamnar nära allt i världen. Den suddiga varianten tar bort det mesta (G1). Mät om de ska hållas utanför första sökningen när beskärningen är stående |
| OCR | en bonus i världssteget, aldrig ett vittne ensamt: mot 33 000 namn är en halv läsning värdelös |
| Efter ett säkert namn | kortet läggs in i den aktiva leken (bilder, vektorer, ORB), så att nästa gång det syns är det steg 1. Det är inlärningen |
| Utan nät | världssteget hoppas över, och kortet går till Claude eller spelaren som i dag |

**Golden mot världen** är acceptansprovet (G1 steg 2): ett nytt läge i
`kor.cjs` utan lek, där varje kort letas i världen. Plus `--utan-leken` med
världssteget på: korten som tagits bort ur leken ska nu hittas i världen,
med 0 fel namn.

**Klart när:** golden mot världen 0 fel namn, och första försöket
rapporterat. Vanlig golden lika bra som baslinjen. **Jespers prov på
telefonen:** nedladdningen, minnet och tiden för ett nytt kort.

**Modell:** Fable 5.1, high (`mesa-bygg-tung`).

### Etapp 3 · Claude som lärare (T6)

**Målet:** det telefonen inte klarat får ett namn från Claude inom några
sekunder, och namnet blir säkert bara om det kontrolleras mot Scryfall-bilden.
Rör `kamFragaAI` och `svarAI`. Efter 2b, eftersom kontrollen använder ORB
vid behov därifrån, och eftersom B4:s ja bygger på att telefonen tar ~65 %
först.

| Del | Innehåll |
|---|---|
| När | ett nytt, helt kort som ligger still och inte blev säkert i steg 1–3. **En fråga per fysiskt kort**, aldrig mer. Taket per parti och månad gäller som i dag |
| Hur | `mode: 'card'` (ingen namnlista). Läget finns redan. **Systemprompten rörs inte.** Kort som finns i den aktiva leken frågas med `kamera`-läget som i dag |
| Modellen | Sonnet 5.5, effort medium, samma som kamerans fråga sedan 2026-10-12 (`ANTHROPIC_MODEL_KAMERA`). G3: medium och low ger samma rätt (33/37 nya kort), p90 2,0 s, 0,24 cent. Sätt `ANTHROPIC_MODEL_CARD=claude-sonnet-5-5` i Vercel; ingen kod, effort är redan medium (rad 525). Bytet påverkar också datorns skärmbildsväg (J4) |
| Kontrollen | namnet slås upp **exakt** (inte Scryfalls fuzzy: en fuzzy-träff på en felstavning släpper in fel namn, G3). Bilden hämtas, ORB körs med G1:s regel. Säkert bara om ORB bär namnet |
| Stoppat svar | kontrollen stoppar 31–33 % av Claudes rätta svar (G3). Kortet går till spelaren, och **Claudes namn visas som förslag i Name this card** (Jespers ja 2026-10-13, J5; ändrar beslutet 2026-10-09 att Name this card inte visar gissningar, för just Claudes stoppade namn). Spelaren bekräftar med ett tryck, och då skrivs namnet i minnet som `spelaren`. I en inläst lek blir det ett förslag i Check names (lekfotosessionens önskemål 3) |
| Svaret | skrivs i minnet (`kalla: claude`) och läggs in i den aktiva leken |
| Utan Claude | AI-hjälpen av eller taket nått: kortet går till spelaren. Ingen regel väntar på Claude (CLAUDE.md) |
| Överlapp | MES-326 (Claude tillfrågas aldrig två gånger om samma kort i ett parti) gör samma spärr för `kamera`-läget. Bygg en spärr för båda |

**Klart när:** golden `--ai` (högst 3 körningar) med 0 fel namn, golden utan
`--ai` oförändrad, och kostnaden per parti i `/measurements`.

**Modell:** Fable 5.1, high (`mesa-bygg-tung`).

### Etapp 4 · Lekvalet bort ur Mirror

**Målet:** man startar Mirror och lägger ut korten. Mesa vet vilken lek det
är, och efter partiet erbjuds leken.

| Del | Innehåll |
|---|---|
| Uppstarten | steget `lek` hoppas över när läget är Mirror (`bord`). Texten "Only cards from the deck you pick will be recognized" bort i Mirror |
| I spelet | chippet "Pick a deck" och lekens knapp ändras enligt D1. Library i Mirror är den fysiska högen |
| Telefonen | utan lekval: aktiva leken ur minnet (etapp 1). Tomt minne: världen och Claude direkt (etapp 2–3) |
| Datorn | antalsreglerna (`lekAntal`) med en learned lek: mjukt stöd, inget tak |
| Efter partiet | "Mesa learned 34 cards — save as deck?" enligt D3. Leken sparas som `learned` |
| Digital | kräver fortfarande en complete lek. Vägen dit: lekfotot, import eller inklistring (D4) |

**Klart när:** **Jespers parti på telefonen** med en lek Mesa aldrig sett:
0 fel namn och Name this card under 1 gång per parti (B5). Golden utan
lek mot världen oförändrad.

**Modell:** Opus 5.5, high (`mesa-bygg`).

### Designytorna

| Yta | Vad | Behövs till |
|---|---|---|
| **D1** | vad som syns när Mirror startar utan lekval: uppstarten, mattan före första kortet, chippet och lekens knapp i spelet | etapp 4 |
| **D3** | efter partiet ("Mesa learned 34 cards — save as deck?"), och hur learned och complete syns på Home och lekens sida | etapp 4 (D3 kan visa sig behövas redan i 1a för `decks.lage`) |

Båda kan göras nu, i en session (Opus 5.5, medium–high). Jesper väljer.

## Ordningen

```
nu, parallellt:   D1 + D3 (designyta)   1a minnet i datan   2a fingeravtrycken   G4 (bänk)
                                          │                   │
                                          ▼                   │
i tur och ordning: 1b aktiva leken ──► 2b världssteget ◄──────┘
                                          │      ▲
                                          │      └── remsdelen: efter lekfotots session 3
                                          ▼
                                       3 Claude som lärare
                                          │
                                          ▼
                                       4 lekvalet bort  (kräver D1 + D3)
                                          │
                                          ▼
                     lekfotots session 4 (läs in en lek) · Private beta A/B
```

1b, 2b och 3 rör samma kod (`kamIdentifiera`, poolen) och får inte byggas
samtidigt (`dev/plan/orkestrering.md`). Golden körs en gång per steg, av
den som mäter, aldrig av byggaren.

**Private beta (lekfotosessionens önskemål 4):** grupp A läser in leken
först, grupp B spelar direkt. Båda grupperna kör samma motor. Mått:
rättningar per 100 kort i första partiet, tid till första kortet, och om de
spelar ett andra parti.

## Issues

Parent **MES-371** (löftet: Mirror lär sig leken medan man spelar), i
Private beta, *6 · Mirror my table*. Sub-issuerna blockerar varandra i
byggordning och står i den ordningen under parenten. Prompten för en
orkestrerande session: `dev/plan/prompt-2026-10-13-mirror-lar-sig-leken.md`.

| Steg | Issue | Blockeras av |
|---|---|---|
| Designyta D1 + D3 | MES-372 | – |
| 1a minnet i datan | MES-373 | – |
| G4 aktiva lekens mätning | MES-374 | – |
| 2a världens fingeravtryck | MES-375 | – |
| Fast lista för `--utan-leken` i repot | MES-266 | – |
| Kort utanför leken får säkert fel namn (6 i `--utan-leken`, 2026-10-05) | MES-235 | MES-266 |
| 1b aktiva leken, steg 2 | MES-376 | MES-373, MES-374, MES-235 (tvillingarna), MES-266 (fast lista för `--utan-leken`) |
| 2b världssteget | MES-377 | MES-376, MES-375 |
| 3 Claude som lärare | MES-378 | MES-377 (hör ihop med MES-326) |
| 4 lekvalet bort | MES-379 | MES-378, MES-372 |

## Jespers beslut 2026-10-13

| # | Beslut |
|---|---|
| J1 | Issues skapas: en parent för löftet och en sub-issue per steg (se *Issues*). |
| J2 | Minnet fylls en gång ur gamla partier (`boards`) och lekar. |
| J3 | Världens fil: **högst 50 MB**, helst ~25 MB (förslag; Jesper visste inte vad som är rimligt). 50 MB är ungefär en vanlig appuppdatering, ~10–20 s på 4G. Laddas ned i bakgrunden första gången Mirror startar, och sparas. 2a mäter vad 25 MB kostar i träffar. |
| J4 | Läraren använder Sonnet 5.5, medium, som kamerans fråga. |
| J5 | Claudes namn som kontrollen stoppat visas som förslag i Name this card. |
| J6 | Designvalen D1 och D3: när ytan finns. |

## Det här ändrar inte

- Systemprompten i `api/identify.js` (`card`-läget används som det står).
- Regeln att Claude aldrig är ett villkor: varje steg ska hålla i golden och
  Mat test utan `--ai`.
- 0 säkra fel namn i golden, `--utan-leken` och `--ljus alla` är ett hårt
  stopp.
- Digital table kräver en komplett lek.

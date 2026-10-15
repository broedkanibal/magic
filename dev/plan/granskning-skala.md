# Granskningen i skala — plan (2026-10-15)

**Frågan:** vad händer med rättelserna och rapporterna när det kommer in väldigt
många? I dag tittar Jesper på varje rättelse på granskningssidan
(`dev/rapport/granska.cjs`). Det håller för tiotals i veckan, inte för tusentals.

**Svaret, kort:** prov och träning behöver olika mycket ögon.

| | Prov (bänken) | Träning |
|---|---|---|
| Hur många behövs | få: 20 per sort × 9 sorter ≈ 180, plus varje säkert fel namn | så många som möjligt |
| Vad ett fel kostar | mycket: bänken mäter fel, och varje fel syns i varje mätning | lite: några procent fel facit tål en modell |
| Vem som tittar | **Jesper, alltid** | **automatiken**, med stickprov |

Prov växer aldrig i takt med volymen — bänken har ett mål och blir full. Det är
träningen som växer, och där kan automatiken ta över.

Ingen kod i den här planen. Ingenting i den frågar Claude.

---

## Hur mycket det kan bli

Räkneexempel, inte mätt. En spelare med *Share pictures of cards I correct* på
ger ungefär 5–15 namnrättelser per parti.

| Läge | Rättelser per vecka | Granska allt, 10 s per kort |
|---|---|---|
| Nu (ett bord) | 10–50 | under 10 min |
| Private beta (~10 bord) | 100–300 | ~1 h |
| Öppet (~1000 spelare) | 5 000–15 000 | 15–40 h — **går inte** |

**Mål:** Jesper lägger högst en timme i veckan på granskningen, oavsett volym.
Det är ett förslag (beslut 1 nedan).

## Fyra principer

1. **Tillfället är enheten, inte kortet.** Spärren gör ett tillfälle till antingen
   prov eller träning. Ett tillfälle är samma spelare med under 6 timmar mellan
   matcherna, eller samma match (Jespers beslut 2026-10-15: matcher i rad vid samma
   bord delar bord, ljus och lek; `tillfallen` i `sparr.cjs`). Nedan står ofta
   "parti" — läs tillfälle. Automatiken väntar därför tills partiet är klart (24 h efter
   sista rättelsen) och bestämmer partiet i ett svep. Ett säkert fel namn i
   partiet gör hela partiet till prov, innan något i det hinner bli träning.
2. **Prov får alltid ögon. Träning får stickprov.**
3. **Claude är aldrig ett villkor** (CLAUDE.md). Allt nedan bygger på lokala mått,
   telefonens egna läsningar och spelarens handlingar.
4. **Ingen automatik styr innan den mätts mot Jespers val.** Den körs först
   i *skugga*: den föreslår, Jesper bestämmer, och vi räknar hur ofta de är ense.

---

## 1. Två flöden

| | Tysta rättelser | Problemrapporter |
|---|---|---|
| Vad | namnbyte, Name this card, borttaget kort (+ handlingarna, MES-385) | spelaren trycker *Report a problem* och skriver, eller ett kodfel |
| Volym | hög | låg |
| Information per styck | lite: en bild och ett namn | mycket: orden, tidslinjen, stillbilderna |
| Blir | prov eller träning för bildmodellen | en fix + ett Mat test-fall |
| Kan gå automatiskt | **ja, till träning** (avsnitt 3–5) | **grupperingen**, inte beslutet (avsnitt 7) |
| Kräver Jesper | varje prov, de osäkra facit, stickprovet | varje ny grupp: vad felet är och om det ska fixas |

Handlingsrättelserna (tap, flytt) blir alltid Mat test-fall och har ingen bild.
De berörs inte av den här planen, utom radering (avsnitt 8).

## 2. Sorts fel ur bildens egna mått

I dag väljer Jesper sorten för hand, och den krävs för Prov. Med många kort ska
datorn gissa den. Varje mått räknas lokalt på beskärningen (Python med Pillow,
som `utsnitt.py`) när rättelsen hämtas, och sparas i `matt.json` bredvid
`rattelse.json`.

| Sort | Mått | Ungefär |
|---|---|---|
| Blänk | andel nästan vita pixlar i namnraden och bilden | överexponerad yta |
| Mörker | kortets medelljus och dess mörkaste tiondel | för lite ljus, skugga |
| Suddig | Laplace-variansen (hur skarpa kanterna är), räknad mot kortets storlek | rörelse, fokus |
| Litet kort | kortets bredd i pixlar (`ruta.w × bild.w`) | samma gräns som träningen: 160 px |
| Delvis skymt | `maskade` är inte tom, eller hur stor del av kortet som är grått | hand, tärning, kort omlott |
| Sned vinkel | rutans form mot ett korts 63:88 | perspektiv |
| Liknande kort | gissningen och rätt namn ligger nära varandra i bildmodellens referenser | förväxling |
| Ovanlig utgåva | går inte att mäta säkert lokalt | **ögat** |

Flera mått kan slå till. Sorten blir den första som slår till, i en fast ordning.

**Vad gissningen får styra:** bara *ordningen i kön* (leta upp kort till sorter
under målet) och *förifyllt val* i listan. Den bestämmer aldrig ensam att
något blir prov — prov får alltid ögon.

**Så mäts den innan den får styra:**

1. Måtten räknas men visas inte. Jesper väljer sort som i dag.
2. Gränserna sätts på Jespers första 100 kort, **fryses**, och prövas på nästa 100.
3. Grind: träff ≥ 80 % totalt, och ≥ 70 % i varje sort med minst 10 fall. En sort
   som inte når dit förifylls inte — den visas som "?".

## 3. Förtroende för facit, utan människa

Facit är spelarens namn. Det kan vara fel (spelaren valde fel i listan, skrev
fel). Förtroendet räknas ur vittnen som inte är Jesper:

| Vittne | Var det finns |
|---|---|
| A. Namnet finns exakt hos Scryfall | finns redan (granskningssidan prövar det) |
| B. Namnet finns i leken, eller i spelarens minne från tidigare partier | leken (Digital, lekfotot), minnet per spelare |
| C. Namnet var en av telefonens kandidater för kortet | **saknas i `rattelse.json` i dag** — rättelsen behöver spara telefonens topp-5 |
| D. Samma kort läses säkert med samma namn senare i partiet, och spelaren rättar det inte igen | bordsloggen och `kort_handelser` |

**Motsägelser:** spelaren bytte namn på samma kort igen; en senare säker läsning
säger ett annat namn; leken är känd och fullständig men namnet finns inte i den.

| Nivå | Regel | Vart |
|---|---|---|
| Grön | A + minst två av B, C, D, ingen motsägelse | automatiken |
| Gul | A + ett av B, C, D | kön |
| Röd | en motsägelse, eller bara A | kön, högt upp |

Ett svar från Claude som redan finns i partiet räknas inte som vittne. Då kan
ingen regel luta sig mot det.

**Så mäts det innan det får styra:** förtroendet räknas i skugga på allt Jesper
granskar. Varje gång han ändrar namnet var facit fel. Grind: **0 av hans
namnändringar bland de gröna, på minst 200 granskade.** (Noll fel bland 200
betyder med 95 % säkerhet under 1,5 % fel.)

## 4. Stickprov i stället för att granska allt

Det automatiken lägger i träningen får ett stickprov **före varje dataset-bygge**
(knappen *Bygg dataset*):

| | Förslag |
|---|---|
| Storlek | 50 slumpvisa gröna sedan förra bygget |
| Vad Jesper ser | beskärningen och namnet, utan automatikens skäl: "Rätt namn? J/N" |
| Stopp | **3 fel eller fler av 50** → bygget stoppas, omgångens gröna går till kön, regeln skärps |

Varför 50 och 3: är 2 % av facit fel stoppas bygget i 8 av 100 fall (ett onödigt
stopp ibland). Är 10 % fel stoppas det i 89 av 100.

Dessutom: **en ny spelares första 10 rättelser går alltid till kön.** Förtroendet
för en spelare växer med det som visat sig stämma.

## 5. Tak mot snedvridning

Utan tak blir träningen ett fåtal vanliga kort, ett fåtal bord och de spelare som
spelar mest.

| Tak | Träning (förslag) | Bänken (förslag) |
|---|---|---|
| Per kortnamn | högst 30 rättelsebilder per namn, spridda över partier och spelare. Basland för sig (`dataset.py` behandlar dem redan för sig) | — |
| Per parti | högst 20 bilder | högst 2 prov per sort |
| Per spelare | högst 10 % av omgångens rättelsebilder | högst 3 prov per sort |

Det som hamnar över taket sparas som reserv (avsnitt 8), inte i datasetet.
*Bygg dataset* visar fördelningen: största namnets, partiets och spelarens andel.

**Priset för spärren:** ett parti med ett säkert fel blir prov, och dess andra
rättelser kan då inte bli träning. Med taket 2 prov per sort blir de flesta av dem
oanvända. Det mäts: andelen rättelser som blir oanvända på grund av spärren.

## 6. Kön

**Ordningen, efter värde:**

1. **Säkra fel namn** — löftet är noll. Grupperade per par (gissning → rätt namn),
   så att "Shock → Lightning Bolt × 7" blir en rad och ett fall, inte sju.
2. **Prov till sorter under målet** — inom en sort i den ordning korten kom
   (annars mäter bänken granskarens smak, som i dag).
3. **Röda facit.**
4. **Gula facit.**
5. **Stickprovet** inför nästa dataset-bygge.

**Vyerna:**

| Vy | Bra för |
|---|---|
| Per parti | finns i dag; spärren syns |
| Per kortnamn | rutnät av alla beskärningar med samma rätta namn. Ett kort som inte hör dit sticker ut |
| Per sort | leta prov till en sort som behöver fler |
| Per par | säkra fel och förväxlingar |

**Tangentbordet:** J/K nästa/förra, Enter = förslaget, T/P/S = Träning/Prov/Släng,
1–9 = sorten, N = ändra namn, mellanslag = stor bild, X = markera ett kort i
rutnätet som inte hör dit.

**Mål:** under 3 s per kort i rutnätet, under 10 s i en enskild rad. Tiden per kort
mäts i beslutsloggen (steg 1).

## 7. Problemrapporterna: en grupp, ett fall, en fix

Tio spelare som rapporterar samma fel ska bli **ett** fall och **en** fix.
Rapporterna grupperas på en *signatur*:

| Sorts rapport | Signatur |
|---|---|
| Kodfel (`kalla 'fel'`) | felmeddelandet utan siffror och id + första raden i stacken som är vår egen + appversionen (`miljo.build`) |
| Problemrapport | snabbvalet (`tagg`) + läget (Mirror/Digital, kamerans bildläge) + mattans händelse närmast trycket (t.ex. `tar_bort`) + appversionen |

Spelarens fria text grupperar inte (det skulle kräva Claude). Den visas i gruppen
så att Jesper läser den.

**En grupp** har antal, antal spelare, första och senaste, versioner och ett
läge: *ny* → *fall finns* → *fixad i version X* → *kom tillbaka*. En rapport med
samma signatur i en version efter fixen sätter gruppen överst igen.

**Arbetet:** den tydligaste rapporten blir Mat test-fallet (`till-fall.cjs
--mattest`), fixen och fallet committas ihop (regeln i LÄS-MIG), och gruppens
övriga rapporter märks `fix`. En Linear-issue blir det bara när tröskeln i
CLAUDE.md säger det, per grupp och aldrig per rapport. Svaret till spelarna kan
gå per grupp när fixen är ute (Jesper skickar).

**Så mäts det:** Jesper går igenom 30 grupper. Har en grupp blandat olika fel är
signaturen för grov, och har samma fel hamnat i flera grupper är den för fin.

## 8. Lagring och radering

**Vad det väger:** en rättelse är ~150 kB (beskärningen, kontexten, json). 10 000
i veckan blir ~1,5 GB i hinken varje vecka. Problemrapporter kan vara upp till
15 MB styck. Supabase-planens lagringstak gäller (gratisnivån: 1 GB).

**Gallringen, utökad:**

| Vad | I dag | Förslag |
|---|---|---|
| Raden i `rapporter` | gallras efter 90 dagar om osorterad/slängd | rader som är prov eller träning ligger kvar — spärren behöver dem |
| Filerna i hinken, efter export | ligger kvar | tas bort 14 dagar efter att kopian finns i bänken eller träningen |
| Filerna, slängd | 90 dagar | 7 dagar |
| Reserven (över taket) | — | 90 dagar, sedan bort |
| Den lokala kopian (`dev/diagnos/rapporter/<kod>/`) | ligger kvar | bort 30 dagar efter beslutet |

**Raderingen, automatisk.** I dag: `lista.cjs --raderade`, sedan `grep` och bort
för hand. I skala:

1. `till-fall.cjs` skriver ett **kopieindex** varje gång det gör en kopia: kod,
   var (bänk, träning, Mat test), sökväg, när.
2. Ett nytt verktyg läser `raderingar` som inte hanterats, tar bort varje kopia ur
   indexet, kör `grep` på koden som kontroll och märker raderingen hanterad
   (ny kolumn `hanterad_at`). Det fall i en fryst utgåva som tas bort syns redan
   som "utgåvan saknar ett fall".
3. `/overview` visar antalet ohanterade raderingar.

**Två luckor, avgjorda 2026-10-15** (beslut 7). Repot är publikt, så bänken
ligger utanför git i `dev/material/rapportbank/`, som träningen. Den flyttades
medan den var tom, så ingen spelares bild har legat i git. Mat test-fallen ligger
kvar i git: de har inga bilder, bara kortnamn och tider. En bild som redan
använts i en träning finns kvar i Kaggles äldre dataset-versioner och i den
tränade modellen. Därför hålls datasetet privat, äldre versioner tas bort vid
varje ny träning, och privacy-texten säger att en tränad modell inte kan glömma
en bild.

**Så mäts det:** ett prov skickar en syntetisk rapport genom alla vägar (bänk,
träning, Mat test), raderar den och kräver 0 träffar på koden efteråt.

---

## 9. Granskningen på en adress: besluten i tabellen, exporten lokalt

I dag kör granskningssidan lokalt (`node dev/rapport/granska.cjs`), med
service role-nyckeln, och skriver direkt i repot (bänken) och i
`dev/material/` (träningen). Det är rätt så länge volymen är liten: en publik
adress skulle kräva inloggning och behörighet, och bänken och träningen finns
bara på Jespers Mac.

När granskningen ska gå från telefonen, eller fler än Jesper ska hjälpa till,
delas den i två:

| Del | Var | Vad |
|---|---|---|
| **Besluten** | en inloggad sida på en adress, bara för granskare (en admin-roll i Supabase, RLS) | Prov / Träning / Släng, sorts fel och ändrat namn sparas som kolumner på raden i `rapporter`. Ingen service role i webbläsaren, inga skrivningar i repot |
| **Exporten** | lokalt, i omgångar | ett skript läser besluten och kör `till-fall.cjs` för varje rad som inte exporterats än, och markerar den exporterad |

Spärren mellan prov och träning måste då också finnas i databasen (en
funktion eller ett villkor som vägrar `traning` när partiet har ett bänkprov,
och tvärtom), inte bara i `sparr.cjs` — annars kan två granskare välja olika
sidor för samma parti innan exporten hunnit köra. `sparr.cjs` behålls som
andra spärren, mot repot.

**Så mäts det:** samma syntetiska rättelser som `prov-d.cjs` beslutas via
tabellen och exporteras; resultatet ska vara identiskt med dagens väg, och två
motstridiga beslut i samma parti ska vägras av databasen.

---

## Byggstegen, i ordning

Bygg inte före behovet. Steg 1–3 går att göra nu och kör i skugga. Steg 4 och
senare behövs när volymen kommer (beslut 9). Raderingen (steg 5) behövs innan
främlingar spelar.

| # | Steg | Vad mäts |
|---|---|---|
| 1 | **Underlaget:** granskningssidan loggar varje beslut (förslaget, valet, sorten, om namnet ändrades, tiden per kort). Rättelsen sparar telefonens topp-5 kandidater och appversionen. `till-fall.cjs` skriver kopieindexet | tid per kort i dag; hur ofta förslaget följs; `prov-b.cjs` grön; hur ofta rätt namn finns bland kandidaterna |
| 2 | **Bildmåtten och den gissade sorten,** i skugga | träffen mot Jespers sort: gränser på 100 kort, prövade på nästa 100. Grinden: 80 % / 70 % per sort |
| 3 | **Förtroendet** (grön/gul/röd), i skugga | 0 av Jespers namnändringar bland de gröna, på ≥ 200 |
| 4 | **Kön, vyerna och tangentbordet** | tid per kort: < 3 s i rutnätet, < 10 s i en rad; Jespers tid per vecka |
| 5 | ✓ **Raderingen och gallringen:** verktyget, `hanterad_at`, gallring efter export — byggt 2026-10-15: `radera.cjs`, `kopior.cjs` (indexet), `gallra.cjs` utökad, `prov-radera.cjs` (0 träffar). Migrationen `20261015120000` körd av Jesper 2026-10-15. Bänken flyttad till `dev/material/rapportbank/` (beslut 7), med sitt kopieindex där | raderingsprovet: 0 träffar; hinkens storlek per vecka |
| 6 | **Automatiken för träning:** gröna partier efter 24 h, taken, stickprovet som grind före *Bygg dataset* | stickprovet ≤ 2 fel av 50; fördelningen i datasetet; andelen oanvända på grund av spärren; bildmodellens grind (CLAUDE.md) som alltid |
| 7 | **Prov i skala:** säkra fel per par, taken per spelare och parti i bänken | antal spelare och partier per sort i bänken |
| 8 | **Grupperna för problemrapporterna** | 30 grupper handgranskade: för grov / för fin |
| 9 | **Granskningen på en adress** (avsnitt 9): besluten som kolumner med spärren i databasen, inloggad sida, lokal export i omgångar | samma utfall som dagens väg på `prov-d.cjs`-fallen; motstridiga beslut i ett parti vägras av databasen |

### Läget 2026-10-15: steg 1–3 byggda, i skugga

Ingenting nedan styr förslaget eller valet; det räknas och visas. Hur det används: `dev/rapport/LÄS-MIG.md`,
*Beslutsloggen och facits förtroende*. Provet: `node dev/rapport/prov-granskning.cjs`.

| # | Byggt | Kvar |
|---|---|---|
| 1 | ✅ **Beslutsloggen**: granskningssidan skriver varje val i `~/.mesa/granska-beslut.jsonl` (`beslutslogg.cjs`) — förslaget och skälet (när raden visades och vid trycket), bildens föreslagna sorter och mått, valet, sorten, namnet före → efter, tiden på kortet, facits nivå. ✅ **Rättelsen** i appen sparar telefonens topp-5 (namn, poäng, marginal, ur spårets `cands`, aldrig Claudes) och appversionen i `rattelse.json` och radens `vy`; `prov-b.cjs` grön (60/60). ✅ **Rapporten** `node dev/rapport/granska-matt.cjs`: förslaget följt, median tid per kort, rätt namn bland kandidaterna | kopieindexet byggdes med steg 5 (`kopior.cjs`, 1d0d5ad). Siffrorna: loggen fylls när Jesper granskar |
| 2 | ✅ **Träffen räknas**: `granska-matt.cjs` jämför bildens första föreslagna sort med Jespers sort i Prov, totalt och per sort, mot grinden. Måtten räknas i webbläsaren (83e83ee), inte i `matt.json` vid hämtningen — samma siffror, loggade med beslutet | gränserna sätts på de första 100 Prov med sort och fryses, prövas på nästa 100. **Obs:** sorten *visas* redan som en knapp ("Delvis skymt?", 83e83ee), så Jespers val är inte oberoende av gissningen — träffen blir för hög om han följer knappen. Ska den mätas rent: **Jespers beslut 2026-10-15:** sorten visas först *efter* att han valt, under de första 100 Prov med sort; sedan som knapp igen. ✅ **Byggt:** "Din sort först" på granskningssidan — gissningen, siffrorna och förslagstextens sortnamn är dolda tills en sort valts, sedan visas gissningen som text; loggen bär `sortForst`; `/api/sortforst` och `granska-matt.cjs` räknar samma Prov ("Din sort först: N av 100 Prov" överst på sidan) och träffen räknas bara på dem. Efter 100 blir det knappen igen av sig själv |
| 3 | ✅ **Förtroendet** (`fortroende.cjs`): grön/gul/röd per rättelse ur vittnena A–D och motsägelserna, visas som en prick på raden och loggas med beslutet; rapporten räknar nivåerna mot Jespers namnändringar och grinden (0 bland de gröna på ≥ 200). R-0010 grön (A + tidigare parti + läst igen 18 s senare), R-0008 gul | **leken** går inte att läsa med service role (`permission denied for table decks`), så B kommer bara ur tidigare partier och motsägelsen "hel lek utan namnet" kan inte slå till — `grant select on public.decks to service_role` är Jespers beslut. Vittne C finns bara för rättelser sparade efter att appen driftsatts med kandidaterna |

Varje steg kör utan Claude, och `dev/rapport/prov-d.cjs` / `prov-b.cjs` hålls gröna.
Steg 1 rör `Rattelse` i index.html (sista skriptblocket, inte kamerakedjan).
Golden behövs inte för det, `prov-b.cjs` räcker.

## Jespers beslut

| # | Beslut | Förslag |
|---|---|---|
| 1 | Hur mycket tid i veckan granskningen får ta | högst 1 h |
| 2 | Får automatiken lägga gröna rättelser i träningen utan att någon tittat, när steg 2–3 klarat sina grindar? | ja. Prov får alltid ögon |
| 3 | Stickprovets storlek och stoppgräns | 50 kort, stopp vid 3 fel |
| 4 | Taken | träning: 30 per namn, 20 per parti, 10 % per spelare. Bänk: 2 per sort och parti, 3 per sort och spelare |
| 5 | Vad händer när en sort är full: höjs målet? | höj till 40 för sorter där modellen fortfarande är svag, efter nästa utgåva |
| 6 | Ett säkert fel gör hela partiet till prov, och då blir partiets andra rättelser oanvända. Godtar du det? | ja, och andelen mäts |
| 7 | Raderingen: bänkens bilder ut ur git (som `dev/material`)? Vad lovar privacy-texten om redan tränade modeller och äldre Kaggle-versioner? | **Beslutat 2026-10-15:** bänken i `dev/material/rapportbank/` (gjort, repot är publikt); Mat test-fallen kvar i git; Kaggle-datasetet privat och äldre versioner bort vid varje ny träning; privacy-texten: "En modell som redan tränats på dina bilder kan inte glömma dem, men bilden går inte att få ut ur modellen" (texten skrivs när go-live-grenen fylls i) |
| 8 | Lagringen: Supabase-planen och gallring 14 dagar efter export | kolla planen före öppet läge |
| 9 | När steg 4–8 byggs | **Beslutat 2026-10-15, på en mätning och inte ett datum:** steg 4 när granskningen tar > 1 h i veckan eller det kommer > 200 rättelser i veckan; steg 6 när steg 2–3 klarat sina grindar; steg 7 när första sorten i bänken är full eller det kommer > 10 säkra fel i veckan; steg 8 vid > 20 problemrapporter i veckan eller två spelare med samma fel; steg 9 enligt beslut 11. `/overview` bör visa rättelser och rapporter per vecka, så att gränserna syns |
| 10 | Nya spelares första rättelser till kön | 10 st |
| 11 | När granskningen flyttar till en adress (steg 9) | när du vill granska från telefonen eller någon annan ska hjälpa till; till dess lokalt, startad när du granskar (ingen autostart: en server som alltid kör blir inaktuell när koden ändras) |

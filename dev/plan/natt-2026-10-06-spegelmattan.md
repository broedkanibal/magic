# Natten 2026-10-06 → 07: spegelmattan

En orkestrerande session (Opus 5.5) körde kön i
[`prompt-spegelmattan-2026-10-06.md`](prompt-spegelmattan-2026-10-06.md) från 23:50 till morgonen.
Byggarna var mesa-bygg (Opus) och mesa-bygg-tung (Fable), var och en i ett eget arbetsträd.
Varje gren lästes av en fristående granskare innan den slogs ihop, och varje rättelse lästes igen.
Granskningarna hittade fem blockerande fel och flera viktiga. Bland dem fanns ett fel namn som
stod kvar i 52 s, två vägar till dubblerade kort, ett kort under en vilande hand som togs bort,
och en grind som kunde bli grön fast appen kastade fel. Alla rättades innan något gick in.

## Vad som gick in, och var det står

| Issue | Vad | Läge i morse | På main |
|---|---|---|---|
| MES-333 | Uppspelaren: inspelade partier genom appens riktiga matta, med mått och baslinje | **Done** | `dc35332` |
| MES-338 | Zoomstegen: fasta nivåer, aldrig in av sig själv | **Done** | `190c878` |
| MES-341 | Bordets minne: flytt utan att vänta på namnet, handen fryser, osäkert = orört | **Redo att testas** | `82200c6` |
| MES-343 | Kort som lämnar bordet går till handen med raden "ändra", ingen gråton | **Redo att testas** | `4141d5a` |
| MES-342 | Positionerna: kamerans skala | **Behöver dig**, grenen `mes-342-del4` | nej |
| MES-344 | Framkallningen: inget syns förrän namnet finns, sedan ett oframkallat kort med kamerans foto efter 0,5 s | **Behöver dig**, grenen `mes-344-framkallningen` | nej |
| MES-336 | Graveyard minns kort utan namn | inte påbörjad: designytan behövs först | – |

Produktionen kör exakt main (`diff` mot sidan ute: identiska, 06:35).
Ingen telefonkod ändrades i natt, så golden behövdes inte och kördes inte.
MES-340-sessionen körde sin golden ur huvudträdet till 03:28. Jag rörde inte huvudträdet och pushade
`index.html` först när den var klar.

## Måtten: före och efter

**Uppspelaren**: golden-videorna 07 och 09–12 och passet 09-22, med telefonens riktiga
bordslogg och en motståndare, som i ett riktigt parti. Totalt över alla fall.

| Mått | Main i går kväll | + MES-338 | + MES-341 | + MES-343 (nu) |
|---|---|---|---|---|
| Zoomändringar per minut | 3,59 | 0,68 | 0,68 | **0,68** |
| Zoom eller panorering som hoppar utan glidning | 31 | 0 | 0 | **0** |
| Kort utanför mattans kant | 1 | 0 | 0 | **0** |
| Tid tills kortet ligger på rätt plats, median | 1,98 s | 1,71 s | 1,71 s | **1,71 s** |
| Kort som felaktigt tonas ned eller tas bort | 8 | 8 | 7 | **3** |
| – varav felaktigt till handen | – | – | – | **0** |
| Nya kort som inte finns i facit | 6 | 6 | 5 | **5** |
| Flyttar där samma kort glider till nya platsen | 4/20 | 4/20 | 5/20 | **5/20** |
| Borttagna kort som står kvar | 7 | 7 | 7 | **6** |
| Tid tills ett borttaget kort lämnar mattan, median | 7,25 s | 7,25 s | 7,25 s | **7,05 s** |
| Platshållare som syntes | 284 | 284 | 284 | **281** |
| Laddtexter ("Reading…" m.fl.) | 330 | 330 | 327 | **326** |
| Utbytta kort | 1 | 1 | 1 | **1** |

**Spegelfacit** (passet 09-22, 60 händelser):

| | Main i går kväll | Nu |
|---|---|---|
| Speglade | 29/60 | 29/60 |
| På rätt kort | 25/60 | 26/60 |
| Flyttar | 6/18 | 7/18 |
| Fel kort | 8 | **6** |

`dev/kolla.sh` var grön vid varje ihopslagning. Avstämningsprovet har 258 OK; det var 208 i går.
Mattans prov har 57 OK; det var 32. `dev/dubbletter.cjs --fall 07` gav ingen dubblett.

**Hur jag läste "inte sämre på någon rad":** som varje mått i totalkolumnen, med tider
±0,1 s och antal exakt. Ett sämre värde i ett enskilt fall skrivs ut som en varning och
förklaras i commit-meddelandet. Det var granskarens förslag, eftersom tider per fall hänger på
enskilda händelser. Säg till om du menade varje fall för sig.

## Vad som backades, och varför

| Vad | Varför |
|---|---|
| **MES-342 i sin helhet** | Grenen gör tiden till rätt plats kortare (1,71 → 0,95 s) och avståndsfelet i golden 18 mindre (0,55 → 0,07 kortbredd). Ihop med MES-341 zoomar mattan ändå oftare: 0,68 → 0,87 gånger per minut. Delvis täckta kort i landhögen ger nästan fyrkantiga lådor som läses som vridna kort, och då flyttar skalan sig. Telefonens vilolåda prövades och var sämre (1,06). Frågan till dig står på issuen |
| Perspektivrättningen (MES-342) | Lutningen gick inte att få ur lådornas bredd: medianen blev sämre i golden 13 och 18. Den kräver kortens hörn från detektorn eller spelytans fyra hörn (MES-245) |
| En mindre dödzon (MES-342 → 341) | 0,08/0,15 gav längre tid till rätt plats (1,98 → 2,12 s) och en flytt i golden 12 som tog 9,97 s. 15 % står kvar |
| Att binda en flytt vid första vilan (MES-341) | Bindningar togs tillbaka synligt efter 0,6–3 s, och platshållarraden blev sämre. Nu binds flytten när telefonen läst spåret, ~0,8 s efter vilan. Det är priset för 0 fel namn |
| Att mattan riktas mot vänsterkanten (MES-338) | Korten trängdes ut under graveyard-rutan: 14 falska omlott |
| Fall 8 vid två samtidiga spår (MES-343) | Fler borttagna kort som stod kvar (7 → 9). Det är kvar vid tre |

## Vad som kräver dig

1. **MES-342:** ta in grenen `mes-342-del4` trots zoomraden, eller vänta på en bättre kortstorlek?
1b. **MES-344:** godtar du att "tid till något syns" blir sämre, som beslutat, och byggarens val? Golden och
    ett prov på telefonen körs innan den går in.
2. **MES-338:** byts kamerans skala mitt i ett parti kan mattan stå längre ut än hela
   kamerabilden. Där krockar "aldrig in av sig själv" med golvet. Ska golvet vinna?
3. **MES-343, två val som byggaren gjorde och som inte står på sida 3:** flera "went to your
   hand"-rader staplas med den nyaste underst, och en token får raden "*namn* is gone · Undo".
4. **Partiet 2026-09-21:** videon ligger inte längre i `dev/material/inspelningar/`, troligen på
   Google Drive. Lägg tillbaka `2026-09-21-mes-238-parti-4k15-20min/`, så kan uppspelaren köra
   hela partiet genom telefonens kedja. I dag spelas det upp med facits lägen som en perfekt
   telefon.

## Prova vid bordet i morgon

Spela Mirror my table med telefonen och en motståndare (eller bordsvyn), och titta på mattan:

| # | Gör så här | Det ska hända |
|---|---|---|
| 1 | Lägg ut fem kort långt åt höger | Mattan tar ett zoomsteg ut i samma rörelse som kortet läggs ned, och zoomar aldrig in igen av sig själv |
| 2 | Flytta ett kort medan andra handen ligger kvar på bordet | Kortet bärs dit i en rörelse, utan grått och utan "Reading…" |
| 3 | Lägg handen platt över två kort i 15 s | De ligger kvar orörda, och inget blir grått |
| 4 | Lägg ett kort över ett annat | Det undre ligger kvar |
| 5 | Tappa fyra land i rad | De vrids i din ordning |
| 6 | Ta upp ett kort i handen | Det glider ut nedåt, och raden "… went to your hand · Exile · Still on the table · Library" står i några sekunder |
| 7 | Ta upp ett kort och lägg tillbaka det inom några sekunder | Det är samma kort, och raden försvinner |
| 8 | Tryck "Still on the table" och "Library" i raden | Kortet flyger tillbaka respektive till leken |

## Kvar, utöver det ovan

- MES-341: utbytta kort står kvar på 1. Det är Swampen i landhögen, vars spår föds om när högen
  tappas. Det rättas i läsningen av högar.
- MES-343: fall 6 (ett nedvänt kort på samma plats) är inte byggt. Kortet går till handen, och
  man väljer "Still on the table". Ett sällsynt fall kan ge en dubblett: kortet kommer tillbaka
  inom 6 s med ett klart men osäkert namn, och spelaren trycker sedan "Still on the table".
- Uppspelaren: `node dev/uppspelaren/kor.cjs --visa --fall g09` visar videon bredvid mattan.
  Grinden för nästa ändring är `--fil <index.html> --jamfor`.

## MES-344, framkallningen: byggd och granskad, väntar på dig

Grenen `mes-344-framkallningen` (`c6d0b41`) är pushad men inte ihopslagen. En fristående granskare
(Fable) hittade inget blockerande. Två fynd rättades och kontrollerades: ett oframkallat kort ritades
ovanpå en tappad hög, och en skarp titelrad syntes i glipan mellan de suddiga banden.

| Uppspelaren mot main (`dcc159f`) | Main | Grenen |
|---|---|---|
| Platshållare som syntes | 281 | **0** |
| Laddtexter ("Reading…" m.fl.) | 326 | **0** |
| Tid till rätt plats, median | 1,71 s | 1,75 s (inom toleransen) |
| Tid till något syns, median | 0,32 s | **0,80 s, sämre** |
| Utspel som syns inom 0,5 s räknat från släppet (issuens mål) | – | 30 av 31 |

**Varför den inte gick in:**
1. Grindens rad "tid till något syns" blir sämre, och det är avsiktligt: platshållaren som syntes
   medan handen höll kortet är borta, precis som principerna säger. Bara du kan godta det.
2. Telefonens kod är ändrad. Telefonen skickar ett litet foto (~6–8 kB) när ett nytt kort ligger
   still utan namn. Golden och ett prov på telefonen behövs före ihopslagningen.
3. Byggaren har gjort val som inte står på sida 3:
   - ramen är kamerans foto med mörk kant
   - de unika ytorna är ett sammanhängande suddigt fält, inte fem band
   - "Another X?" öppnar arket som förut
   - "Hard to read" är borta
   - ett oframkallat kort står kvar 1,2 s när spåret dör

Frågorna står på MES-344. Motståndarna får en bild på 22×31 px i `boards.kort`, utan migration, och
nedvända kort får ingen bild.

## MES-336, graveyard minns kort utan namn

Inte påbörjad. Den bygger på MES-344:s foto och sökruta och behöver en designyta för
graveyard-vyn först. Där stannar kön enligt prompten.

## Dagen 2026-10-07: Jespers beslut och det som gick in efter natten

| Vad | Jespers beslut | Läge | På main |
|---|---|---|---|
| MES-342 kamerans skala | "ta in ändå, kan förbättra senare" (zoomraden 0,68 → 0,87 godtagen) | **Done**; resten i MES-345 (Triage) | `9e0f10a` |
| MES-338 kamerans yta på mattan | "Mattans maxstorlek ska vara markerad"; förslag B (kontur, mörkare utanför), spelaren får zooma ut ett steg förbi kamerabilden; tangenten 0 som förut | på main | `1fda2a6` |
| MES-344 framkallningen | ja till alla åtta valen och till fyra sämre rader i grinden — alla för att platshållaren är borta (tid till något syns 0,32 → 0,80 s; p0921k saknade kort 26 → 29 och avståndsfel 0,18/0,42 → 0,19/0,44, samma urval identiskt) | **Redo att testas**; landhögarna och överlappande etiketter i MES-346 (Triage) | `1d78898` |
| Partiet 2026-09-21 genom telefonens kedja | videon tillbaka från Drive | fallet `p0921k` i uppspelaren — platser och antal mätbara, namn inte (skärminspelning utan Claude) | `544be0d` |

Golden för MES-344 (telefonens kod ändrad): **95/119, 0 fel namn, 1 falsk — kort för kort identisk med main.** `--utan-leken "Ukud Cobra,Pacifism"` ger 90/119 med **1 fel namn som main redan har** (fall 05: Pacifism → Scourge of the Undercity, `namn ensamt`) — inte från MES-344, men SNABBGUIDENs löfte om 0 där stämmer inte längre.

**Spegelfacit 29/60 förklarat** (passet 09-22, utan Claude): 20 av 31 missar på mattan kommer av fem kort som aldrig fick namn och allt som händer dem sedan; 8 händelser (drag, graveyard ur bild) kan aldrig synas på en matta; 6 är tap i landhögen. Med Claude gav samma pass 35/59 på äldre kod. Mappen `2026-09-22-1x-34cm-normaltempo` (video och körningen med Claude) ligger fortfarande på Drive.

**Kvar för Jesper vid bordet:** MES-341, 343 och 344 (Redo att testas, stegen står på issuerna) och markeringen av kamerans yta.

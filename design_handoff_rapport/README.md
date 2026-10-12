# Problemrapporten och samtycket — designytan (MES-367)

Designytan: **"Mesa Problem Report"**, <https://claude.ai/artifact/NSTD99GSH8WUUkFbgAHyQz>.
Tavlornas källor ligger i `project/` (samma filer som på ytan, `rap.css` är stilen).

Gjord 2026-10-12 efter Jespers samtyckesmodell (MES-367:s beskrivning). **Inget är valt än.**
Bygget av del C kommer efter A (MES-365) och B (MES-366) och är inte designsessionens.

## Beslutat (Jesper 2026-10-12)

- **Knappen är alltid synlig (V2)** och heter **Report a problem** överallt, också på telefonen,
  där den sitter i toppraden bredvid Disconnect (inte som en rund flytande knapp).
- **V3 är struken**: att fråga "Did the camera get it wrong?" efter att spelaren själv döpt om
  ett kort är konstigt — rättelsen säger redan att det var fel.
- **"Sends the last 10 minutes" var otydligt.** Ersatt i G2 av *What we get: this picture, what
  your camera saw and what happened on your mat in the last 10 minutes.*
- **Kvittensen:** *Copy code* i foten såg ut som en länk och *Done* som knappen som kopierar. Nu
  står koden med en egen *Copy*-knapp bredvid sig och *Done* ensam i foten. Raden "If the box was
  closed while sending" är borta: rutan stängs inte medan den skickar (några sekunder).

## Jesper väljer

| Val | Förslag | Var |
|---|---|---|
| Rapportrutan | **G2**: sju kategorier, peka på kortet, *Just now / Earlier* | sida 4 |
| Inställningens namn och text | **Share pictures of cards I correct** | sida 1, 2 |
| privacy-utkastet, rättsliga grunder per rad, meningen om tränade modeller | tavla P | sida 5 |

Lägena H–O har fortfarande G:s gamla texter och taggar; de ritas om efter G2 när den är vald.

## G2: kategorierna och det som gör rapporten lätt att läsa

**Kategorierna** (en åt gången, inget krävs):

| Kategori | Täcker | Följdfrågan |
|---|---|---|
| Wrong name | fel namn | peka på kortet + *What is the card called?* (kortsök) |
| Didn't show up | kortet ligger på bordet men inte på mattan, "ser inte kortet" | peka där kortet ligger |
| Shouldn't be there | dubbletter, spöken, kort kvar som tagits bort | peka på kortet |
| Tapped wrong | tap och untap | peka på kortet |
| Wrong place | flyttat fel, fel hög (graveyard, hand) | peka på kortet |
| Slow | kortet kom sent | peka på kortet (valfritt) |
| Something else | allt annat, också appfel | fritext |

*Flicker* är borttagen som egen kategori: ett kort som flimrar syns för spelaren som saknat,
extra eller flyttat, och hamnar där. Sju är gränsen; fler och folk slutar välja.

**Det som gör rapporten lätt att tolka:**

1. **Bilden fryses vid trycket.** Rutan visar kamerabilden från ögonblicket spelaren tryckte, med
   Mesas namn ovanpå korten. Läsaren ser samma sak som spelaren, och vet var i de 10 minuterna
   felet är (trycket = slutet).
2. **Peka på kortet.** Ett tryck i bilden markerar kortet. Rapporten får spårets id och
   positionen, så "Island" aldrig kan betyda fel Island. Ett kort Mesa missat har ingen ram men går
   att peka på; ett extra kort är en ram utan kort under.
3. **Wrong name frågar vad kortet heter**, med samma kortsök som när man namnger. Det ger facit
   direkt, i stället för en fritext att tolka. Har spelaren redan döpt om kortet fylls namnet i.
4. **It happened: Just now / Earlier.** Säger om felet ligger vid trycket eller längre bak.
5. **Fritexten är valfri och följer kategorin** (platshållaren byts), så den blir ett tillägg och
   inte hela beskrivningen.

För byggaren av hämtverktyget (`dev/rapport/hamta.cjs`, MES-365): lägg trycket, kategorin, det
pekade spåret och *Just now / Earlier* överst i `LÄS-MIG.md`, före tidslinjen.

## Sidorna och lägena

| Sida | Tavla | Läge |
|---|---|---|
| 1 · Account | **A** | Create your account: ny urkryssad ruta under villkorsrutan (provbar) |
| | **B** | Before you continue: samma ruta + en *What's new*-ruta |
| 2 · Settings | **C** | Home-menyn får *Settings* ovanför Sign out |
| | **D** | Settings: växeln + *Delete my reports and pictures* (provbar) |
| | **E** | Raderingen frågas en gång, i rutan (inte en ny dialog) |
| | **F** | Efter raderingen: texten säger det på plats, ingen grön notis; växeln orörd |
| 3 · The button | **V1** | menyn + kamerapanelens fot; telefonens topprad |
| | **V2** · vald | alltid i toppraden bredvid kamerapillret, *Report a problem*; telefonen: toppraden |
| 4 · The report | **G2** · förslag | den omgjorda rutan (provbar: kategori, peka, Send) |
| | **G** | första utkastet, ersatt av G2 |
| | **H** | skickar: fälten låsta, stapel; rutan får stängas, kvittensen kommer som en rad |
| | **I** | skickat: *Report sent*, koden med *Copy* bredvid, *Done* |
| | **J** | gick inte (nät): röd rad, texten och taggen ligger kvar, *Try again* |
| | **K** | dagens tak (20): sägs direkt när rutan öppnas, bara *Close* |
| | **L** | telefonen inte ansluten: gul rad, skickas från datorn utan telefonens bilder |
| | **M** | på telefonen: ark med stora taggar, valfri text, Send report |
| | **N** | telefonen: skickat av datorn, samma kod |
| | **O** | telefonen når inte datorn: *Try again* eller skicka från datorn |
| 5 · privacy.html | **P** | utkastet med tillägg och strykningar markerade mot version 2026-10-09 |

## Varianterna: vad de vinner och förlorar

| Variant | Vinner | Förlorar |
|---|---|---|
| V1 | inget nytt på skärmen; där man letar efter hjälp (menyn) och där kamerafel syns (panelen) | två klick; den som aldrig öppnar menyn eller panelen hittar den inte |
| **V2** (vald) | ett klick, alltid synlig, alla lär sig att den finns | en kontroll till i toppraden |
| ~~V3~~ (struken) | — | frågar efter en rättelse som redan visar att det var fel |

## Texterna (förslag, engelska, utan tankstreck)

**Inställningen** (A, B, D):
- Rubrik: *Share pictures of cards I correct.*
- Text: *When you fix a card's name, Mesa keeps the picture of that card to fix problems and improve its card recognition, including training our models.*
- Under rutan (A, B): *Optional. You can change it any time in Settings.*
- I Settings, av: *Off. Nothing is kept when you correct a card.* På: *On since 12 Oct 2026.*

**Finstilt på A och B** (Jesper 2026-10-12): *To find and fix problems, Mesa notes how the app is used and any errors. No ads, and no pictures unless you choose.* Ligger inte i bildrutan: den är ett samtycke, användningsloggen är berättigat intresse.

**What's new på B:** *You can send us a problem report with pictures, and choose whether to share pictures of cards you correct.*

**Settings, det skickade:** *3 reports and 41 card pictures* · *Reports you send are always your own choice, one at a time, whatever the switch says.*
Frågan: *Delete 3 reports and 41 card pictures? They are deleted from Mesa right away. Pictures already used to train a model can't be taken out of that model.* · Delete / Cancel.
Efter: *Nothing you sent is stored in Mesa* · *3 reports and 41 card pictures were deleted. The switch is still on: new corrections are kept from now on.*

**Rapportrutan** (G, första utkastet — taggarna, meningen och fältet ersätts av G2 ovan; knappnamnet är *Report a problem* också på telefonen):
- Rubrik: *Report a problem*
- Fält: *What went wrong?* — platshållare *For example: it showed Island, I played Swamp*
- Taggar: *Wrong card · Can't see the card · Slow · Flicker · Other* (en åt gången, tryck igen för att ta bort)
- Meningen: ***Sends the last 10 minutes of this game,** with pictures from your phone's camera, to fix problems and improve Mesa's card recognition, including training our models.* + länken *What's in a report* (privacy.html)
- Knappar: *Cancel* / *Send report*. **Inget krävs**: Send fungerar utan text och tagg — de 10 minuterna är rapporten.
- Skickar: *Sending. This takes a few seconds.* Rutan stängs inte medan den skickar.
- Kvittens: *Report sent* · koden `R-0412` med en *Copy*-knapp bredvid · *Thanks. If you write to us about it, mention this code.* · *Done* ensam i foten
- Gick inte: *Couldn't send the report. Check your internet connection and try again. Your report is kept until you close this box.* · Try again
- Tak: *You have sent 20 reports today. That is the most for one day. You can send more tomorrow.*
- Telefonen borta: *Your phone isn't connected. The report is sent from this computer, without the phone's pictures.* — och meningen blir *Sends the last 10 minutes of this game from this computer, to fix problems …*

**Telefonen** (M–O):
- Meningen: ***Your computer sends the last 10 minutes of this game,** with pictures from this phone, to fix problems …*
- Skickat: *Report sent* · `R-0412` · *Your computer sent it. If you write to us about it, mention this code.*
- Når inte datorn: *Can't reach your computer. Reports are sent from the computer. Try again when the dot at the top is green, or use Report a problem on the computer.*

## privacy.html (tavla P)

**Obs:** prompten säger *avsnitt 4*, men tabellen ligger i **avsnitt 2** i dagens privacy.html
(4 är överföringar utanför EU). Utkastet ändrar:

| Avsnitt | Ändring |
|---|---|
| Versionsraden | nytt datum → `VILLKOR_VERSION` höjs, alla konton får B |
| 2 | AI-hjälpens rad: *we do not store the image* får ett *unless …* för rapport/rättelse. Tre nya rader: **Error reports** (berättigat intresse, invändning enligt 7), **Problem reports you send** (samtycke: trycket), **Pictures of cards you correct** (samtycke: inställningen). En ny mening om vad träning betyder |
| 3 | Supabase: *Database, sign-in and storage of reports and pictures* |
| 5 | Kontoradering tar med rapporter och bilder. **Gallring 90 dagar** för rapporter, felrapporter och rättelser som inte använts till en fix, ett testfall eller träning. Meningen om tränade modeller |
| 6 | De två sakerna spelaren gör själv i Settings |
| 7 | Invändningen gäller också felrapporterna |

Anthropic-raden ändras inte: ingen ny väg skickar bilder till Claude.

**Jesper godkänner:** rättslig grund per rad (samtycke 6.1 a för rapporten och inställningen,
berättigat intresse 6.1 f för felrapporterna), påståendet *A trained model does not contain your
name or account*, och att gallringen också gäller rättelser som aldrig använts (det är vad MES-367:s
gallringsregel säger: `anvandning` null eller `slangd`, oavsett `kalla`).

## Beteenden som bygget behöver veta

- **Inställningen** sparas i `user_metadata.improve_pictures` + `improve_pictures_at` (MES-367). Rutan i A
  skickas med Google-rundturen som villkoret (`sthv.villkor` i sessionStorage, ~38123); i B sparas den
  med `godkannVillkor`. Saknas fältet = av. **Frågas en gång:** finns fältet redan visar B rutan i
  sitt läge (ibockad om på), aldrig förbockad för ett konto som inte valt.
- **Rutan låser inte** Google-knappen eller *Agree and continue* — bara villkorsrutan gör det.
- **Växeln sparar direkt**, ingen Save. Av = inget nytt sparas från den stunden.
- **Delete** raderar allt spelaren skickat (rapporter, rättelser, bilder i storage) oavsett växeln, och lämnar växeln orörd.
- **Rapporten följer aldrig inställningen.** Med växeln av går det att skicka en rapport (DoD 2).
- **Telefonen skickar aldrig själv:** ett tryck där ber datorn skicka samma paket; kvittensen visas på telefonen (N). Når den inte datorn: O.
- **Rutan stängs inte medan den skickar** (några sekunder). Ingen separat kvittensrad behövs.
- **Taket** visas när rutan öppnas, inte efter att spelaren skrivit.
- **Settings** finns i Home-menyn (C). I spelets meny finns ingen Settings-rad i förslaget; spelaren går till Home för den.

## Det som inte ändras

- Kamerapanelen i övrigt (MES-358): Match, Pause camera, ↻.
- Villkorsrutan och Google-knappen på A, och spärrens knappar på B.
- Inga kryssrutor i rapportrutan.

## Sida 6: peka på det som gick fel (2026-10-12, efter Jespers andra genomgång)

Jespers frågor: felet finns ofta inte kvar när man trycker, och "peka på kortet" syntes inte i G2.
Tre riktningar, inget borttaget. Kategorinamnen är nu *Didn't show up* och *Shouldn't be there*
(i stället för *Missing card* och *Extra card*).

| Tavla | Idé | Vinner | Förlorar |
|---|---|---|---|
| **R1** (provbar) | kamerabilden och mattan sida vid sida, frysta vid trycket. **Tryck först, säg sedan vad som är fel**: valen följer var man tryckte (ett kort bara i kameran kan bara vara *Didn't show up*, ett kort bara på mattan oftast *Shouldn't be there*). Nålen syns på båda bilderna | ett tryck på kortet och ett val; kategori och kort i samma rörelse | bara ögonblicket vid trycket |
| **R2** · förslag | R1 + en remsa med de senaste minuterna. Dra tillbaka till när det såg fel ut och peka där | fångar fel som redan gått över (dubbletten som flimrade, kortet man redan rättat) | en rad till; mattans historik finns på datorn, kamerans stillbilder hämtas från telefonen när rutan öppnas (MES-366) |
| R3 | en lista över vad Mesa gjort, nyast först, med spelarens egna rättelser märkta. Tryck på raden som blev fel | mest exakt för läsaren: en rad = en händelse | ett kort som aldrig kom finns inte i listan (kamerabilden under behövs); en lista är svårare att läsa av mitt i ett spel |

Svar på frågan om felet finns kvar vid trycket: ofta inte. Fel namn och saknade kort står kvar
tills spelaren rättar, men dubbletter, flimmer och fart är borta, och spelaren rättar ofta innan
den rapporterar. Därför förslaget R2, och därför *It happened: Just now / Earlier* i G2 ersätts av
remsan.

### Ny version på sida 6: ett problem, markera vilka kort som helst (S1–S3)

Jesper: att en markering i kameran också markerar mattan är förvirrande, och en händelse kan
gälla flera kort (ett spelat på bordet, två dubbletter på mattan). Enkelt för spelaren, och utan
specialfall. R1–R3 ligger kvar ovanför.

| Tavla | Vad |
|---|---|
| **S1** · förslag (provbar) | tre steg i samma ordning: **1** vad gick fel (en kategori) · **2** vilka kort: tryck på hur många som helst, i kamerabilden och på mattan, varje bild för sig; siffrorna följer trycken, remsan väljer ögonblicket · **3** något att lägga till, där siffrorna kan användas (*When I played 1, 2 and 3 appeared*) |
| S2 | S1 ifylld med dubblettfallet |
| S3 | det du läser: överst i `LÄS-MIG.md` (MES-365) — kategori, ögonblick, varje markering med sitt spår och vad Mesa gjorde, texten, händelserna runt ögonblicket |

Reglerna som håller det enkelt: **en rapport = ett problem** (fler problem = fler rapporter;
kvittensen har *Report something else*). Ingenting kopplas mellan bilderna och ingenting frågas
per kort. Bara *Wrong name* frågar en sak till: vad kortet heter. Allt utom att trycka
*Send report* är valfritt.

### Tredje versionen på sida 6: hitta ögonblicket, markera, säg vad (T1–T3)

Jesper: ordningen ska vara tiden först (där korten låg fel), sedan korten; fritext som är valfri
är svår att tolka, men en förifylld textruta blir lätt fel.

| Steg | Vad |
|---|---|
| **1 av 2** | välj ögonblicket i remsan (förval *Now*). Mattan och kamerabilden under följer det valda ögonblicket. Tryck på korten, på mattan, i kameran eller båda; siffror i tryckordning |
| **2 av 2** | *What went wrong?* (en kategori; *Wrong name* frågar vad kortet heter). **Your report**: en mening Mesa skriver av valen — kategori, ögonblick, vilka siffror på mattan och i kameran. Den upprepar bara valen och går inte att ändra, så den lägger aldrig ord i spelarens mun. *+ Add a note* är stängd och bara för det rapporten inte säger |

En rapport utan text är ändå tydlig: valen bär betydelsen. T2 och T3 är T1 med stegen ifyllda.

### Sida 7: hela flödet simulerat (W1–W3)

Jesper: ordningen i T kändes onaturlig; det naturliga är att först säga vad som gick fel. Varje
tavla börjar mitt i ett spel: *Next* i den streckade raden spelar Island, Mesa visar den två
gånger, den extra försvinner av sig själv — sedan *Report a problem* i toppraden.

| Tavla | Ordning | Vinner | Förlorar |
|---|---|---|---|
| **W1** · förslag | dialog i tre steg: **vad** (sju stora knappar med en rad var, t.ex. *A card on the mat isn't on your table*) → **visa** (instruktionen följer svaret; listan över ändringar på mattan; mattan och kameran i det valda ögonblicket; tryck på korten) → **kolla och skicka** (rapporten skriven av valen) | den ordning man tänker; en fråga per skärm; kategorinamnen förklaras på knappen | tre steg; bilderna är små kopior av mattan |
| W2 | ingen dialog: mattan själv går tillbaka i tiden, tidslinjen med varje ändring under den, kameran i hörnet, en sidopanel frågar vad och skriver rapporten | man återskapar felet precis där man såg det | spelet är dolt medan man rapporterar; störst att bygga |
| W3 | som W1, men efter svaret visar Mesa det ögonblick den tror att man menar, med kortet ringat. *Yes* skickar på två tryck, *No* öppnar W1:s visa-steg | snabbast när Mesa gissar rätt | en fel gissning som godtas utan att titta blir en fel rapport; kräver en regel per svar för vad Mesa föreslår |

### Sida 8: enkel rapport — säg vad du såg, peka var (X1–X4) · förslag

Jesper: W1 var hoppig och svår att förstå, W2 kändes naturlig men är svår i praktiken (flera
spelare, zoom, kameran som täcker). Omtanken: **spelaren ska inte göra utredningen.** Mesa har
redan allt i de 10 minuterna; spelaren säger bara det vi inte kan veta.

| Del | Vad |
|---|---|
| **What happened?** | ett stort textfält först, med fokus. Huvudsaken |
| Snabbval | valfria, skrivna som det spelaren ser: *A card disappeared* · *A card appeared that I didn't play* · *A card never showed up* · *Wrong name* · *Tapped or untapped wrong* · *Slow* · *Something else*. De ändrar aldrig rutan |
| **Where?** (valfritt) | *Point at it on your mat*: rutan kliver undan, spelaren trycker på platsen på sin riktiga matta, med sin zoom och de andra spelarna i bild. Är kortet borta: tryck där det var. En nål på en plats, inte ett val av kort |
| **When?** | *Just now* (förval) · *About a minute ago* · *Earlier* |
| Send | bara det krävs. Ingen tidslinje, ingen kamerabild, ingen sammanfattning skriven åt spelaren |

Telefonen (X4): samma ruta; *Where?* är ett tryck i kamerabilden, som är telefonens skärm.

**Läsarens vy (X3):** `hamta.cjs` lägger spelarens ord överst, sedan Mesas logg nära nålen och
tiden (det är där "showed up / went away" hör hemma), sedan händelserna som stämmer med
snabbvalet, och bilderna. Läses som det är av en människa eller av Claude Code vid skrivbordet —
aldrig i spelet, så "Claude aldrig ett villkor" rörs inte.

**Ändrat 2026-10-13 (Jesper):** *Where?* och *When?* är strukna. Att peka är förvirrande när
kortet redan är borta, och *About a minute ago / Earlier* är för grovt för att göra skillnad.
I stället sparas automatiskt: **tiden för trycket** och **vad spelaren hade på skärmen** (zoom,
den del av mattan som syntes, kortet spelaren senast rörde). Läsarens vy söker i loggen inom
den vyn de senaste 90 s. Tid hör hemma i spelarens egna ord, och exempeltexten visar det
(*a minute ago I played an Island…*). Rutan är nu: egna ord, valfritt snabbval, Send.
X2 (att peka) ligger kvar som struken.

**X5 (2026-10-13): vilka kort** · förslag. Väljer spelaren ett snabbval kommer ett valfritt fält
under det, med en rubrik som följer valet (*Which card disappeared?*). Flera kort går bra: varje
kort blir en bricka med ett kryss. Förslagen kommer i den här ordningen: kort som varit på mattan
de senaste 10 minuterna, med en ledtråd (*left the mat 30 s ago*) så att två Islands går att
skilja och läsaren vet vilket spår det är; sedan leken; och när man skriver, alla kort.
*A card never showed up* föreslår leken först. *Wrong name* är ett par, *Mesa showed* → *it is*,
med *+ Another card*.

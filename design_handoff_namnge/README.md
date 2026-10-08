# Kort som kameran inte identifierade — överlämning

Designytan: **"Mesa Name This Card"**, <https://claude.ai/artifact/44xa9oQE6ZkwPMNFigfbta>.
Byggunderlaget är tavlan **Spec · F2 + H2**. Tavlorna A–H är utforskningen.

Jespers val 2026-10-08: **F2** (kortet) + **H2** (texten). Bygger vidare på MES-344
(framkallningen) och MES-346 (etiketten som ett eget element).

## Vad som ändras, och varför

| Idag | Problemet | Nu |
|---|---|---|
| Den skarpa ramen runt suddet är kamerafotots egen kant (`.ofoto`), suddet ligger i en fast `clip-path` | Beskärningen tar med en bordsremsa, och ligger kortet snett sticker bordet ut på sidan. "Ser B ut" | Mesa ritar ramen själv; fotot förstoras 1,18 så att bordet hamnar utanför |
| Hela den unika ytan suddig | Man ser inte kortet man ska namnge | Skarpt i mitten, suddigt mot kanterna |
| Etiketten "Name this card" | Konstigt när namnet syns på bilden; säger inte att kameran misslyckats | "NOT IDENTIFIED" överst på kortet + knappen "Enter name" |
| Bannern "N cards to fill in" ovanför mattan | Dubblerar etiketten på kortet | Räknar inte kort som ligger på mattan |
| Klicket på etiketten | Öppnar ingenting i produktionen | Öppnar sökrutan (buggen rättas först) |

## Lägena

Ritade på spec-tavlan, i samma ordning.

1. **Claude läser** (0,5 s efter släppet, tills namnet kommer eller posten läggs): egen ram, hela
   fotot suddigt, ingen text, inte klickbart.
2. **Not identified** (posten finns, inte `overTak`): skarp mitt; den skarpa mitten tonas in på 300 ms,
   som framkallningen. Etiketten är överst, knappen nederst. Hela kortet och knappen öppnar rutan.
3. **Pekaren på kortet:** kortet får `.pekad` (outline 2 px `--acc`), knappen `:hover`. Tooltip:
   *The camera couldn't identify this card. Click to enter its name.*
4. **Utbränt av blänk:** samma som 2. Etiketten och knappen har egen bakgrund och läses på vitt.
5. **Rutan öppen:** dagens `ofrSokOppna` med tre ändringar:
   - rubriken **Enter card name**
   - kamerafotot skarpt överst (120 px brett, beskärningen utan zoom)
   - **Not a card** längst ned, som gör vad Discard gör, men bara för den här posten: spåret blir
     skräp och kortet går från mattan

   Knappen "Enter name" döljs medan rutan är öppen. Etiketten står kvar.
6. **Liten zoom:** är kortet lägre än 120 px på skärmen döljs etiketten. Knappen står kvar.
7. **Tappat:** kortet vrids, men etiketten och knappen står raka. Etiketten sitter vid den vridna
   rutans överkant och knappen vid nederkanten (`ofrMarkAnkare`).
8. **Another X? (`overTak`):** samma kort, men ingen etikett, eftersom kortet är identifierat.
   Knappens text och klicket är som idag (arket).
9. **Tätt ihop:** knapparna läggs ut av `ofrMarkLagg` som idag. En etikett som skulle täcka en
   annan etikett eller knapp döljs.

## Mått och värden

| Del | Värde |
|---|---|
| Ram | border 4 px `#121417` i brädets px (följer zoomen), radie som `.ofr` |
| Foto | `object-fit: cover`, `scale(1.18)` från mitten |
| Sudd (undre lagret) | `blur(OFR_SUDD)` `saturate(.7)` `brightness(.85)` över hela insidan; `clip-path` på `.ofsudd`/`.oglans` tas bort |
| Skarp mitt (övre lagret) | samma foto, `mask-image: radial-gradient(ellipse 62% 52% at 50% 42%, #000 45%, transparent 100%)` |
| Etikett | skärmstorlek (`1/--matz`, som `.ofrmark`): höjd 18, padding 0 7, radie 5, bg `#0d1015e6`, ram 1 px `#f0a52a88`, färg `--pa-acc`, 9 px / 700, spärrning .8 px, text `NOT IDENTIFIED`. Står 9 px under kortets överkant |
| Knapp | dagens `.ofrmark`, text `Enter name`, aria-label `Enter the name of this card` |

## Det som inte ändras

- **Motståndarens vy:** `ofrLiten`, 22 × 31 px, suddig, utan text. Det skarpa fotot är bara ägarens
  (MES-305: ingen dold information läcker).
- **Bannern för bilder:** poster ur "Add cards from an image" (I), som inte har något kort på mattan,
  visar `#pendBar` som idag. Bara poster med `ofrPos` räknas bort.
- **Sökningen:** leken först, sedan alla kort (`ofrSokSok`). Inga gissningar visas.

## Det som inte byggs

- **Inget chip för kort utanför vyn** (som "1 to name" på tavlan *Runt omkring*). Jesper 2026-10-08:
  "Enter name" på kortet plus *Fit camera view (0)* räcker.
- **Tavlorna A–H och *Runt omkring* är utforskningen.** De har den gamla verktygsraden ("Untap all",
  "Tidy up"), och texterna "Name this card", "Which card?" och "Discard" som har ersatts. Bygg bara efter
  *Spec* och den här filen. Verktygsraden i produktionen (välj/panorera, zoom, *Fit camera view*) ändras inte.

## Var i koden

`ofrLager`, `ofrHtml`, `ofrMarkHtml`, `ofrMarkAnkare`, `ofrMarkLagg`, `ofrSokOppna`, `renderPending`, CSS
`.ofram`/`.ofsudd`/`.oglans`/`.ofrmark`/`.ofrsok` i `index.html`. Klicket går genom lyssnaren på
`gridEl` som söker `.ofr.fraga, .ofrmark[data-pend]` och anropar `ofrSokOppna(q.id)`. Felsök den
vägen först: `redigerbar()`, `pendById` och `ofrSokPlacera`, som stänger rutan direkt om den inte
hittar kortets element.

## Prova

Utan telefon: `spelLage` + `tagEmotBeskarning` före `avstamBord` från konsolen
(se minnet "Kamerans datorsida provas utan telefon"). Golden behövs inte. Bygget rör bara datorns
vy, inte kamerakedjan.

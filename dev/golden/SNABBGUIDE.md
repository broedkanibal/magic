# Golden setet — snabbguide

Golden setet är riktiga foton av spelbord, vart och ett med ett **facit**:
vilka kort som faktiskt ligger där. Provet kör appens kamerakedja på varje
foto och räknar hur många kort den hittar och namnger rätt. Här står det du
behöver i vardagen; allt i detalj finns i [LÄS-MIG.md](LÄS-MIG.md).

## Samma prov, två lägen

| | Utan Claude | Med Claude |
|---|---|---|
| Kommando | `node dev/golden/kor.cjs` | `node dev/golden/kor.cjs --ai` |
| Provar | telefonens egen igenkänning (bild och textläsning) | hela kedjan: det telefonen är osäker på frågas Claude |
| Brukar kallas | regressionstest | AI-eval |
| Kostar | inget | ca 10–20 cent per körning |
| Samma svar varje gång | ja | nästan — kör om ett fall som avviker innan du drar slutsatser |
| Jämförs mot | `senaste.json` | `senaste-ai.json` |
| Kör när | efter varje ändring i kamerans kod | efter ändring i systemprompten eller modellen |

Båda skriver en tabell med ett fall per rad:

| Kolumn | Betyder |
|---|---|
| Kort | synliga kort i facit (`+1 dolt`: ett kort under ett annat, räknas inte) |
| Hittade | kort kameran lade ut — också dolda den ändå såg och falska spår, så talet kan bli större än Kort (44 av 41 = 41 kort + 3 dolda) |
| Rätt namn | synliga kort som fick rätt namn med säkert svar, t.ex. `10/10` |
| Fel namn | säkert svar men fel kort — det värsta, ska vara 0 |
| Falska | spår där inget kort ligger |
| Plats, Tappad | provas bara i fallen där facit har rutor (01–02): rätt plats, och rätt tap-läge |
| Förlopp | bara videofall: `7/7 spelade · 2/2 borttagna · ordning 7/7` — hur många utspelade kort kameran hann namnge, hur många bortplockade som försvann ur bordet, och hur många av utspelen den såg i rätt ordning. `–` för foton |

`(var 10)` efter ett tal är baslinjens tal, när det skiljer sig. Sist står en
**dom mot baslinjen**: BÄTTRE, LIKA BRA, SÄMRE eller BLANDAT, med totalerna
före → efter och de fall som skilde sig. Raden `metod:` säger vad som
kördes: *lokal* = konstverket jämförs med lekens kort, *ocr* = kortnamnet läses
ur titelraden (båda i telefonen, utan AI), *ai* = Claude frågas om det som är
osäkert.

## Kommandona

Körs från repots rot. Kräver Chrome; första körningen tar en minut extra.
Kommandona startar själva en lokal testserver (`dev/stub-server.cjs`, i koden
kallad *attrappen*) och stänger den efteråt. Utan `--ai` svarar den i Claudes
ställe, så provet är gratis; med `--ai` skickar den frågorna vidare till den
riktiga koden i `api/identify.js`, med nyckeln ur `.env.local`.

Appen själv lokalt, innan något går live: `npm run dev` ger
<http://localhost:8232> (attrappen, gratis, Claude svarar inte), och
`npm run dev:ai` ger <http://localhost:3000> (`vercel dev`: appen med de
riktiga funktionerna och riktiga Claude, kostar som i produktion).

| Kommando | Gör |
|---|---|
| `node dev/golden/kor.cjs` | alla fall utan Claude |
| `node dev/golden/kor.cjs --detalj` | samma, plus varje spår: namn, varför, vad textläsaren läste |
| `node dev/golden/kor.cjs --fall 07` | bara fallen vars mapp börjar på `07`; `--fall 07,01` kör flera, i den ordningen |
| `node dev/golden/kor.cjs --ai` | med Claude (kostar) |
| `ANTHROPIC_MODEL_KAMERA=claude-sonnet-5 node dev/golden/kor.cjs --ai` | med en annan modell i kameran; raden `metod:` visar modell och systemprompt-version |
| `node dev/golden/kor.cjs --spara` | gör körningen till ny baslinje (`--ai --spara` för Claude). Med `--fall` byts bara de fallen |
| `node dev/golden/kor.cjs --ljus alla` | samma fall i sju ljus (mörkare, ljusare, varmare, kallare, låg kontrast, brus, sned gradient) med en sammanställning sist — var kedjan går sönder först (se *Samma fall i sju ljus*) |
| `node dev/golden/kor.cjs --utan-modell` | utan bildmodellen (MES-225): reserven Matcher + ORB mäts — ska ge samma tal som före modellen (31/57, 0, 5). `--wasm` tvingar modellen till WASM i stället för WebGPU |
| `node dev/golden/kor.cjs --utan-leken "Ukud Cobra,Pacifism"` | namnen tas bort ur leken innan poolen byggs: korten ligger kvar på borden men är nu kort UTANFÖR leken — varje säkert namn på dem är ett fel namn. Ska ge 0 fel namn (se *Bildmodellen*) |
| `node dev/golden/kor.cjs --fall 09 --konsol` | skriver också appens `console.log` (ur iframen) — för tillfälliga mätrader medan ett fall felsöks |
| `node dev/golden/kor.cjs --beskarningar /tmp/beskarningar` | sparar bilderna kameran skickade vidare, en per spår — titta på dem när ett kort blir fel |
| `node dev/golden/vriden.cjs` | eget prov: kort som ligger snett |
| `node dev/golden/avstand.cjs` | eget mått: samma bord på längre håll — vilket golv i kedjan går först (se *Avstånd*) |
| `node dev/golden/avstand.cjs --ai --fall 02,06` | samma, med Claude (kostar, ~5–10 cent för två fall): läser Claude korten där den lokala kedjan tappar dem? |
| `node dev/golden/kor.cjs --lar-ref` | lär in facit efter varje fall, som om spelaren bekräftat korten (se *Lärda referenser*) |
| `node dev/golden/kor.cjs --ref` | samma prov med de lärda referenserna i poolen; `--glom-ref` glömmer dem först |
| `node dev/kamerabank.cjs` | bänken: syntetiska bord och rörelse, ska sluta med `0 FEL` |
| `node dev/avstamning.cjs` | datorns sida: granskningslistan och bordet efteråt, ska sluta med `0 FEL` |
| `node dev/dubbletter.cjs --fall 07` | eget mått: videofallets bordsrapporter genom datorns avstämning — var dubbletter och tap-fel uppstår (se *Dubbletter*) |
| `node dev/golden/provlas.cjs` | eget mått: videofallens bordsrapporter genom uppstartens provkortslås (steg 4) — hur länge låset stod med en ruta större än ett kort; `--mot <fil>` jämför med en annan index.html |

Flaggorna går att kombinera: `node dev/golden/kor.cjs --ai --fall 03 --detalj`.

**Spara en baslinje bara när du vill jämföra mot den framöver** — ett nytt
fall, eller en ändring som blev bättre. Skriv då en rad i `historik.md` och
checka in båda.

## Jämföra modeller

| Modell | ID | Pris in / ut per miljon tokens | I kameran |
|---|---|---|---|
| Opus 5 (i dag) | `claude-opus-5` | $5 / $25 | fungerar |
| Sonnet 5 | `claude-sonnet-5` | $2 / $10 | fungerar |
| Fable 5.1 | `claude-fable-5-1` | $10 / $50 | fungerar — dyrast och långsammast |
| Haiku 4.5 | `claude-haiku-4-5` | $1 / $5 | fungerar inte: avvisar kamerans inställning `effort` (kräver en kodändring) |

Provat med nyckeln i `.env.local` 2026-09-10. En hel körning kostar ungefär
i proportion till priset: Opus 10–20 cent, Sonnet under hälften, Fable det
dubbla.

**Beslut 2026-09-16: kameran kör Opus 5.** Mätt på alla 12 fall, två körningar
per modell på samma kod (MES-180):

| | Opus 5 | Sonnet 5 |
|---|---|---|
| Rätt namn | 57/57 båda gångerna | 54/57 båda gångerna |
| Fel namn | 0 | 0 respektive **1** (fall 10: ett kort som inte finns i partiet) |
| Falska | 1 | 2 |
| Helbilden (hela bordet läses) | 4,6–11,1 s | 3,2–4,3 s |

Sonnet tappade namn på korten som ligger omlott (03–06); videofallen var lika.
Svarar inte Claude — slut på krediter, fel nyckel — skriver `kor.cjs`
`VARNING: N anrop till Claude misslyckades` med Anthropics felmeddelande,
vägrar `--spara` och slutar med felkod 1. Utan den varningen ser en körning
med `--ai` ut som vanligt men mäter bara den lokala kedjan.
Snabbheten vägde inte upp ett säkert fel namn. Närbildsläget (`card`, ett
uppförstorat kort) kör fortfarande Sonnet 5 — det är ett annat läge med två
oberoende inramningar som måste vara överens (beslut 2026-09-04).

1. **Gör dagens modell och systemprompt till referens:**
   `node dev/golden/kor.cjs --ai --spara`
   Avviker ett fall mot vad du väntat dig, kör om just det innan du går
   vidare: `node dev/golden/kor.cjs --ai --fall 03 --spara`.
2. **Kör samma prov med en annan modell** (sparas inte):
   `ANTHROPIC_MODEL_KAMERA=claude-sonnet-5 node dev/golden/kor.cjs --ai`
   Raden `OBS:` säger att du jämför mot en baslinje från en annan modell, och
   sist står domen — BÄTTRE, LIKA BRA, SÄMRE eller BLANDAT — med fallen som
   skilde sig.
3. **Skiljer ett fall**, kör om det med samma modell (`--fall 03`) innan du
   drar slutsatser: Claude svarar inte exakt likadant varje gång.
4. **Byta modell i appen på riktigt** görs i Vercel: projektet *magic* →
   Settings → Environment Variables → lägg till `ANTHROPIC_MODEL_KAMERA` (till
   exempel `claude-sonnet-5`) för Production, och gör en ny deploy — variabeln
   läses först då. I dag är den inte satt, så koden väljer `claude-opus-5`
   (beslutet ovan). Kontrollera vad produktionen kör med
   `curl -s https://magic-mauve-xi.vercel.app/api/identify` — fältet
   `modeller.kamera`.
   Spara därefter en ny baslinje med den modellen.

En ändring i systemprompten provas på samma sätt: kör steg 1 före ändringen och
samma kommando efter. Raden `metod:` visar versionen (`systemprompt v20`), så
att varje resultat säger vilken systemprompt det mätte. Systemprompten ändras
bara på uttrycklig begäran — se `CLAUDE.md` i repots rot.

## Avstånd

Hur långt bort får telefonen sitta? `node dev/golden/avstand.cjs` skalar ner
varje foto i golden setet steg för steg — faktor 1, 0,8, 0,65, 0,5, 0,4 och
0,3, som samma bord på allt längre håll — och kör varje steg genom hela kedjan
utan Claude. Det är ett **mått, inte ett prov**: ingen baslinje, ingen dom,
slutkod 0 vad siffrorna än blir. Tar 5–10 minuter för alla sex foton;
`--fall 01,02` och `--faktorer 1,0.5` kortar ner, `--json fil` sparar allt.

Tabellen har ett foto per rad och en kolumn per faktor, cellen är `rätt
namn/kort · fel namn · falska`. Under den står varje steg med kortsidan i
pixlar och telefonens egna skäl: *långt bort* (rådet "flytta närmare",
kortsida under 150 px), *små* (kortformade regioner under 90 px som aldrig
blir spår), *ocr hoppade* (titelraden för låg för namnläsaren, 20 px) och
*kapad* (beskärningen krymps till 720 px bred). Sist: vilket golv som slog
till först, och vid vilken faktor.

**Skalan:** fotona är 1080 px breda men telefonen ger 3840 px, så faktor 1
motsvarar telefonen på ungefär 3,5 gånger avståndet i fotots namn (60 cm blir
drygt två meter). Provet mäter alltså längre bort än telefonen någonsin
sitter — läs ordningen mellan golven och kortsidan i pixlar där de slår till,
inte centimetrarna.

**Mätt 2026-09-11 (MES-31), två spakar som inte hjälpte:**

| Spak | Resultat | Varför den inte behölls |
|---|---|---|
| Förstora små beskärningar till 360 px kortsida innan de läses | namnläsaren slutade hoppa över titelrader men läste inget mer; fall 02 på faktor 1 tappade ett namn (4/4 → 3/4) | beskärningens skala är det trösklarna är mätta i; förstoringen ger inga nya bildpunkter |
| Golvet *liten* 90 → 60 px (regioner som får bli spår) | på håll bättre: fall 06 på faktor 0,5 gick 0 → 7 av 11 namn, faktor 0,4 0 → 6; men videofallet 07 fick 1 → 3 falska — fragment ur handrörelser blev spår och sedan granskningsposter | 75 px gav 07:s falska ändå och tappade 06 på 0,4 — ett storleksgolv skiljer inte fragment (85 px) från riktiga kort (81 px) |

Det som faktiskt tappar namnen är igenkänningen vid 200–250 px kortsida
(fall 02: 4/4 vid 252, 2/4 vid 202), medan korten fortfarande är spår — inte
golven. På telefonens 3840 px är kortsidan ~900 px på 40 cm och ~250–300 px
på 150 cm, så det är där det spelar roll.

**Med Claude (`--ai`, mätt 2026-09-11 med claude-opus-5):** Claude tar de
osäkra beskärningarna, och läser dem långt förbi den lokala kedjan:

| Fall | faktor 1 | 0,8 | 0,65 | 0,5 |
|---|---|---|---|---|
| 02 (150 cm) utan → med Claude | 4/4 → 4/4 | 2/4 → **4/4** | 1/4 → 2/4 | 1/4 → 1/4 |
| 06 (12 kort omlott) utan → med | 9/11 → 11/11 | 3/11 → **9/11** (2 fel namn, 2 falska) | 6/11 → 8/11 | 0/11 → 0/11 |

Rätt namn/kort, kortsidan 252/202/164/126 px i fall 02 och 159/129/108/83
i 06. Golvet går vid ~100 px: där är beskärningen för liten också för
Claude, och under 90 px blir korten aldrig spår. Claude varierar körning till
körning: en andra körning gav 3/4 i 02 på 0,65 och 10/11 i 06 på 0,8 — och
där stod rådet inte längre tänt (långt bort: nej).

**Rådet "Korten är små i bilden. Flytta telefonen närmare"** tändes förut
på storleken ensam — också i 06 på faktor 0,8, där Claude läste 9 av 11.
Sedan MES-31 gäller det, när Claude är påslagen, först när Claude inte
heller läser korten: står en fråga ute väntar rådet, och det kommer bara
när de olästa små korten är fler än de lästa (`radAvstand` i index.html,
provat i bänken W9c–W9f). Utan Claude dömer storleken som förut.

## Hastighet

Hur lång tid tar det från att ett kort läggs ner tills det har sitt namn?
Videofallet 07 mäter det som **fördröjning** (`videoFordrojning`): medianen
över de kort som fick rätt namn, från facits utspelstid till första säkra
namnet. Den syns i `--detalj` (raden `video:`) och i tabellens Förlopp-cell
(title). 2026-09-11: 1,8 s. Vad tiden består av: handen lämnar kortet,
spåret ska ligga stilla i `stillaMs` (800 ms) innan det läses, och
läsningen (ram, beskärning, bild + titelrad) tar 0,1–0,7 s. Provat: 500 ms
i stället för 800 gav **sämre** — 3 → 2 namn, 1 → 3 falska, fördröjningen
1,8 → 2 s — kortet läses medan det ännu inte ligger stilla. Det som gör
väntan kortare för spelaren är platshållaren på bordet (MES-42): den står
där efter en halv sekund, namnet kommer efter en till två.

**Videofallen går med låtsasklocka** — klockan står still medan ett steg
räknar och medan en läsning väntar på workern, så fördröjningen ovan är
videons egen och blind för beräkningstiden. Sedan MES-215 (2026-09-18)
skriver `--detalj` också *med beräkningstid*: samma fördröjning plus den
verkliga tid som klockan stod still i fönstret mellan händelsen och att
den sågs — stegets övertid över takten (en telefon som ligger efter tappar
rutor) och väntan på läsningarna (namnet kommer inte före workern är klar).
All tid i fönstret räknas som seriell, också läsningar av andra kort, så
talet är en **övre gräns för en telefon lika snabb som datorn provet körs
på**; en telefon är 3–5 gånger långsammare, och den siffran ger bara
latensmätningen på riktig telefon (`?debug` → *Latency*). Sist på raden
står hur mycket verklig tid som stod still totalt i fallet. Exempel
2026-09-18 på Macen: 07 namn 1,0 → 1,21 s, 09 tap 0,3 → 0,3 s, 12 flytt
1,8 → 1,84 s. Måtten heter `videoFordrojningB`, `videoTappFordrojningB`,
`videoFlyttFordrojningB`, `videoBortaFordrojningB` i `senaste.json`
(`videoVerkligMs`, `videoVerkligRutor` är summan och antalet rutor).

Sedan MES-214 (2026-09-18) tas ett **säkert tidigt svar direkt**: ett spår
som stått formstilla i två rutor läses medan det väntar (K4), och är svaret
säkert blir kortet klart på en gång — 07 1,8 → 1,0 s, 09 1,85 → 1,25 s,
10 1,35 → 0,8 s, 11 1,25 → 0,95 s, 12 1,95 → 1,35 s, samma namn och 0 fel.
Läget är då preliminärt (`vilar: false`) och mäts om när kortet vilat i
`stillaMs`. Ett osäkert tidigt svar kastas och kortet läses som förut.

## Förloppsmåtten från K1 (dev/plan/lagen.md §7)

Tre mått till ur ett videofalls **bordslogg** (datorns rapporter), inte ur
slutläget. De står i Förlopp-cellen och i `--detalj` (raden `K1:`), och
räknas in i domen mot baslinjen.

| Mått | Vad | Mål (historik.md) |
|---|---|---|
| `videoBortaFordrojning` | medianen av tiden från facits `tar_bort` till första rapporten utan ett säkert spår med namnet | ≤ 1,0 s (datorns nåd på 3 s därtill) |
| `videoTapp` / `videoTappAv` + `videoTappFordrojning` | facit `{ "t": 12.5, "tappar": "Ukud Cobra" }` eller `"otappar"`: sågs ett säkert spår med namnet bära det väntade tap-läget inom 8 s, och hur snart | ≤ 0,35 s |
| `videoTappFalska` (*falska tap-flippar*) | gånger ett säkert spår bytte tap-läge mellan två rapporter utan en `tappar`/`otappar`-händelse för namnet åt det hållet inom ±3 s i facit. En optimistisk tap-dom som tas tillbaka är två. I domen sedan MES-214 | 0 |
| `videoDubbletter` | största överskott av fysiska kort per namn mot facit i någon rapport — grupperat med appens `sammaPlats`/`syskon`/`ledarOrdning`, som steg 2 i `avstamBord` | 0 |

Tap-FÖRDRÖJNINGEN ingår inte i domen (bara antalet sedda vridningar) — läs
den i `--detalj`. 2026-09-18 hade den gått från 0,6 s till 4,65 s utan att
någon körning sa SÄMRE (MES-179 frös ett snett tappat kort); nu 0,3 s.

Fall 07 har inga tap-händelser i facit (`tap –`); de kommer med
inspelningarna 09/10 (K2).

## Lägesmåtten (K5/MODE-5)

I Table leads speglar datorn kortens platser från kameran (MODE-5), och
flyttar ett kort när spårets mitt gått mer än `AUTO_FLYTT` (15 %) av
bredden sedan förra läget — samma regel som `kamLage` i `avstamBord`. Två
mått i kolumnerna Läge och Plats, i `--detalj` (raden `läge:`) och i domen:

| Mått | Vad | Mål |
|---|---|---|
| `lagesUpp` / `lagesPerMin` | gånger ett **namngivet kort som låg i vila** lämnade sin plats med mer än 15 % av sin bredd (första läget räknas inte); per minut av fallets tid (videons tid i ett videofall). Sedan MES-214 mäts telefonens viloläge (`vx`, `vy` i rapporten), inte lådan i den ruta rapporten råkade gå; stegen medan ett kort följs i en flytt (`vilar: false`) är samma flytt, och omankringen när det landat räknas inte. Bara klara spår: det är de datorn speglar | 0 på ett stilla bord (01–06, 08); i 07 bara verkliga flyttar |
| *nästan* i `--detalj` | största flytten per spår mellan 0,10 och 0,15 kortbredder — en verklig liten knuff som ligger nära gränsen. Står ett fall och väger mellan två tal är det här man ser varför (07: Valkyrie's Sword 0,13 och Thriving Moor 0,148, båda knuffade av handen) | – |
| `lageFel` | medianen av avståndet mellan spårets och facitrutans mitt, i kortbredder — bara där facit har rutor (01, 02, 08) | så litet som möjligt; ett spår som täcker halva kortet ger ≈ 0,25 |
| `lagesSnitt` | lådor som bytte storlek på plats (mer än en fjärdedel av ytan): en klump som skars i sina kort, en del som blev hela kortet igen. Räknas inte som flytt (MES-84: i 03 och 06 var det enda "flyttarna") | – |

`--detalj` skriver också raden `född …` för varje spår som föddes: var, hur
långt från närmaste lediga spår (mot gränsen 0,6 × långsidan), areakvoten,
hur länge det spåret stått utan region och hur mycket lådorna täcker
varandra — det är där man ser varför ett kort blev två spår (MES-83).

Och raden `läst …` för varje lokal läsning av ett spår (MES-94): videons
tid, beskärningens storlek, domen med domskälet, bildens egen mätning
(helhetslikhet, ORB-inliers, `accept` när bilden ensam räckte), de tre
översta förslagen med poäng, och vad namnläsaren läste. Det är där en säker
bilddom går att spåra till sina tal: i 09 stod "bild 0,77, 8 inliers,
accept" med Plains överst i helheten men Serpent Assassin som ORB:s val.

Läget från K5 (`vilaX/vilaY` med hysteres, tre `stillaPx`) är det som ska
hålla `lagesUpp` på 0: darr på en gräns ger ingen rapport. Sedan MES-214
följer läget ett namngivet kort också medan det flyttas — så länge regionen
är hela kortet (ytan inom 15 % av den kortet hade när läget sattes). En
region som bytt yta är kortet plus en hand, eller kortet med ett annat kort
över hörnet: då hålls läget. `--detalj` skriver varje räknad flytt med
varifrån, vart, spårets tillstånd och ytans kvot.

## Högvakten (K10/K11, MES-85)

Ett kort som läggs på graveyard-högen i bild ska gå dit utan fråga i Follow
the table. Telefonen läser inget namn där, den märker bara att högen fått ett
nytt utseende (högvakten). Datorn parar ihop det med kortet som försvann.

| Vad | Hur det mäts | Mål |
|---|---|---|
| **hög** i Förlopp | kort med `"till": "grav"` i facit där högen ändrades inom 6 s (datorns fönster) | alla |
| **falska** i Förlopp | högändringar utan ett kort dit (en hand, bläddring) | 0 |
| datorns utfall | `node dev/dubbletter.cjs --fall 10`: raden `högvakten:` visar vilka kort som gick till graveyard och vilka som står kvar med frågan | korten med `till` till graveyard, inga andra |

I facit märks händelsen så här: `{ "t": 25.5, "tar_bort": "Trusty Retriever", "till": "grav" }`.
Fallet behöver en `grav`-ruta. `--detalj` skriver högens ändringar, varje
händelse och raden `högvakt` för varje dom (hur många celler som ändrades, de
största skillnaderna i gråsteg, gränsen) — det är där en missad eller falsk
ändring går att spåra. Uppspelningen i `dubbletter.cjs` kräver att fallet sparats om
(`--fall 10 --spara`) efter en kodändring.

## Samma fall i sju ljus (MES-216)

Utan nya foton eller videor: `node dev/golden/kor.cjs --ljus alla` kör hela
setet sju gånger med varje ruta omräknad innan kameran ser den — fotot en
gång, videon ruta för ruta — och skriver sist en sammanställning per fall
och ljus, mot den vanliga baslinjen. En variant i taget: `--ljus morkare`.
Sparas aldrig (`--spara` gäller inte).

| Variant | Vad som görs med bilden |
|---|---|
| `morkare` | × 0,55 |
| `ljusare` | × 1,45, klipper vid 255 (blänk och urblekta kort) |
| `varmare` | rött × 1,18, blått × 0,82 (glödlampa) |
| `kallare` | rött × 0,82, blått × 1,18 (dagsljus, lysrör) |
| `kontrast` | (v − 128) × 0,55 + 128 (dis, matt skärm) |
| `brus` | gaussiskt brus σ ≈ 12 gråsteg, samma brus för samma ruta varje körning |
| `gradient` | × 0,5 i ena hörnet till × 1,3 i motsatta, diagonalt (en lampa vid sidan) |

Det är ett **mått**, inte ett prov: slutkoden är 0 vad siffrorna än blir,
och tabellen säger var kedjan går sönder först. En riktig inspelning i det
ljuset slår alltid en omräknad — omräkningen rör inte kamerans exponering,
brus eller skärpa — så en variant som faller är ett skäl att spela in, inte
ett facit.

## Bildmodellen (MES-225)

Sedan 2026-09-18 rangordnar en liten bildmodell (MobileCLIP-S0,
`dev/embed/embed.js`) lekens namn för varje beskärning, och ORB kontrollerar
de tre bästa. Golden kör den som appen gör. Raden `metod:` säger
`+modell` och vilken väg den räknade: **WebGPU** (huvudlös Chrome får
flaggorna `--enable-unsafe-webgpu --use-angle=metal`) eller **WASM** (utan
grafikkort, eller med `--wasm`: samma svar, 3–5 gånger långsammare).

| Vad | Hur |
|---|---|
| Vikterna och onnxruntime-web | ligger de under `dev/embed/modeller/` och `dev/embed/node_modules/` (se `dev/embed/LÄS-MIG.md`) serverar attrappen dem — inget hämtas per körning. Annars hämtas de en gång från Hugging Face och jsdelivr och ligger kvar i profilens cache |
| Lekens inbäddning | görs första körningen i en profil (~2 min med WebGPU) och sparas per kort i profilens IndexedDB; sedan 1–7 s |
| `domskäl för de säkra rätta namnen` | raden under `metod:` — `modell+orb` (ORB bar modellens etta), `modell+namn` (titelraden höll med), `modell` (modellen ensam, med ORB:s svaga stöd), `bild…` (Matcher + ORB som andra åsikt, eller reserven); med `--ai` också `namnViaAi` |
| `läst …` i `--detalj` | modellens poäng och marginal, *inte ensamt* (klunga, skymt eller större än ett kort), ORB:s inliers, på vilket namn, ettans egna inliers och **skalan** (ett helt kort i sin beskärning: 1,15–1,43; under 1,08 är spåret en bit av kortet; utanför 0,8–1,6 räknas träffen inte) |
| Kort utanför leken | `--utan-leken "Namn1,Namn2"` — modellen svarar alltid med något av lekens namn, så det är ORB-kontrollen som ska stoppa dem. Mätt 2026-09-18 med 12 av 28 namn borttagna: 0 fel namn |
| Utan modellen | `--utan-modell` mäter reserven (modulen inte laddad, leken inte inbäddad): samma tal som före modellen |

## Kortbaksidor

Ett nedvänt kort på bordet (biblioteket, ett kort som vänts) blev en
granskningspost med baksidan som miniatyr. Sedan MES-42 bär kortpoolen
baksidan som ett eget uppslag (`BAKSIDA_NAMN`, poolversion 7): matchar
beskärningen den överst blir spåret skräp med domskälet `baksida` — inget
kort, ingen granskningspost, inget "kort" i statusfältet. Fall 08 (fall 01
med en inklistrad baksida, syntetiskt) mäter det: `· 1 skräp` i kolumnen
Falska, 0 falska. Med koden före: 4 hittade, 1 falsk (baksidan som ett
osäkert Plains/Pacifism i granskningen).

## Dubbletter

Ett kort på bordet blev två i appen, och tap-läget blev fel — var uppstår
det, i telefonens spår eller i datorns avstämning? `node dev/dubbletter.cjs`
tar varje bord telefonen skickade under ett videofall (sparat i
`senaste.json` som `bordLogg`, med hela spårposten) och spelar upp det genom
datorns riktiga avstämning (`avstamBord` ur `index.html`), med klockan på
rapporternas tid, hjärtslaget var tredje sekund och nådtimern härmade. Det
är ett **mått, inte ett prov**: ingen baslinje, slutkod 0 vad siffrorna än
blir.

| Kommando | Gör |
|---|---|
| `node dev/dubbletter.cjs --fall 07` | videofallet 07, mot facit (`video.handelser`) |
| `node dev/dubbletter.cjs --logg ~/Downloads/pass-2026-09-11-1002.json` | **ett riktigt pass**, utan facit: loggen sparas i appen med knappen *Spara bordsloggen* i sammanfattningen som visas när auto stängs av (allt telefonen sa under passet, från det att auto slogs på) |
| `node dev/dubbletter.cjs --rapporter dev/avstamning-rapporter.json nyTelefon.horn` | en inspelad rapportlista ur bänken, utan facit |
| `node dev/dubbletter.cjs --fall 11 --nad 400` | samma uppspelning med en annan nådatid på datorn (förval: appens `BORTA_NAD`). Raden *nedtoningar* skriver varje gång ett kort tonades ned, kom tillbaka eller gick till graveyard, med tiden efter facits `tar_bort` — en nedtoning som "togs tillbaka" utan att kortet spelades ut igen är priset för en för kort nåd (MES-214) |
| `… --json fil` | allt som mättes, som JSON |

Facit bär inte tap-läge i ett videofall; korten ligger otappade, så varje
tappat kort på bordet är ett fel. Fallet måste vara sparat med dagens
`kor.html` (`--fall 07 --spara`), annars saknar loggen spårens lägen och
verktyget säger ifrån.

Utskriften, uppifrån:

| Del | Betyder |
|---|---|
| Tidslinje | ett steg per rapport, hjärtslag eller nådtimer där bordet ändrades: per namn *bundna/facit* (kort på bordet med spår, mot vad facit säger ligger där ±0,5 s), `+N ned` nedtonade, `T` tappade, `ÖVERSKOTT` när bordet har fler bundna än facit (kort i nåd — spåret nyss borta, 3 s kvar — räknas inte) — det är en dubblett |
| Skapade kort | varje kort datorn skapade: tid, spår, spårets domskäl (`varfor`), och om ett kort med samma namn **redan fanns** (bundet eller nedtonat) i det ögonblicket — `← DUBBLETT?` |
| Totalt | per namn: största antal bundna, största överskott, skapade, och hur många skapades fast ett bundet eller nedtonat kort med namnet fanns; nya kort mot facits fysiska kort; tap: kort vars tap-läge inte är spårets (då är det datorn), och tappade kort mot facit (då är det telefonen) |
| Med kamGrund = null | samma uppspelning utan sparat grundläge — datorn läser det bara för frågan om grundläget, så bordet ska bli identiskt |
| Samma namn på flera spår | telefonens sida: rapporter där flera spår bär samma namn (osäkra förslag medräknade), grupperade som avstämningen skulle göra om alla vore klara — `[5+4]` är ett kort, `[1] [5+4]` är två. fler grupper än facit (och än en) är en dubblett som väntar på att Claude eller granskningen säger ja på båda spåren; en enda grupp med ett namn facit inte har är en felgissning, ingen dubblett. `f` = färskt (två färska spår räknas alltid som två), `s` = skymt |
| Spåren i loggen | per spår: när det levde, hur många rapporter det var tappat i (och hur många medan det rörde sig — en hand), hur många gånger tap-läget slog om, och sekunderna. Ett spår som är tappat medan det rör sig är handen, inte kortet |

Läs så här: **står något under Skapade kort med "fanns redan", eller ett
ÖVERSKOTT i tidslinjen, gjorde datorn dubbletten.** Står allt på noll där
men *Samma namn på flera spår* visar två grupper för ett namn, föds
dubbletten på telefonen — två spår för ett kort, eller samma gissning på
två kort — och datorn kan bara slå ihop dem när de ligger på samma plats.
Tap: *kort mot spårets tappad* är datorns fel; *Spåren i loggen* är
telefonens.

## Lärda referenser

Poolen bär Scryfalls konstverk; bordet visar kortet i rummets ljus, med
blänk, vinkel och telefonens brus. Sedan MES-80 (K7/K8) lär sig kameran hur
just dina kort ser ut: när Claude svarat säkert om en beskärning (ett kort)
eller du själv bekräftat namnet i granskningen, sparas beskärningen (146×204
jpeg) som en referens till för namnet — högst fyra per namn, nyaste vinner —
i telefonens IndexedDB under `ref:` + poolkoden. Referenserna vävs in i
poolen i minnet (`Pool.laggTill`) och rankas som vilket konstverk som helst;
utåt heter de kortet (`refSid`). *Forget learned photos…* i lekens meny på
datorn glömmer dem, på datorn och på telefonen.

Golden setet mäter UTAN dem om det inte ber om dem — appen läser flaggorna
`MESA_REF`/`MESA_LAR` på sitt fönster, som `kor.html` sätter:

| Kommando | Gör |
|---|---|
| `node dev/golden/kor.cjs --lar-ref` | varje fall döms som vanligt, och EFTER domen får spåren facit (bara de som inte redan var säkert rätt — de frågas aldrig i spel): appens `kamLart` lär beskärningen. Raden `lärda referenser:` säger hur många per fall |
| `node dev/golden/kor.cjs --ref` | poolen bär referenserna från förra `--lar-ref`; raden `metod:` visar `+ref` och tabellen jämförs mot samma baslinje — men `--spara` gäller inte |
| `node dev/golden/kor.cjs --lar-ref --ref` | leave-one-out i följd: varje fall mäts med det de TIDIGARE fallen lärde, aldrig med sina egna. `--fall 06,05,04,03,02,01` vänder ordningen |
| `node dev/golden/kor.cjs --glom-ref` | referenserna för golden-poolen bort innan något körs (kan kombineras med `--lar-ref`) |

Måttet som räknas: `--ref` på fall som INTE lärt sig själva. Fallen 01–06
är samma lek på samma bord i olika ljus, så `--lar-ref --fall 01` följt av
`--ref --fall 02,03,04,05,06` säger vad ett spelat parti ger nästa.

## Lägga till ett nytt foto

1. **Fotografera** med telefonen rakt ovanför bordet, som när du spelar.
   Från en video: öppna den i QuickTime, pausa på rätt ruta, tryck ⌘C, och i
   Förhandsvisning *Arkiv → Nytt från urklipp* och spara som JPEG. Själva
   inspelningen ska inte in i git; vill du spara den, lägg den i `dev/videos/`.
   (Ska hela förloppet bli fallet i stället — kort som läggs ut och plockas
   bort medan kameran går — se *Lägga till en video* nedan.)
2. **Skapa en mapp** i `dev/golden/fall/` med nästa nummer. Namnet är bara en
   etikett så att du ser vad fallet provar — ingenting läser det:
   `NN-yta-ljus-avstånd-antalkort`, t.ex. `08-vitmatta-lampa-60cm-5kort`.
   - yta: `tra`, `vitmatta`, `svartmatta`, `tryckt`, `glansig`, `duk`
   - ljus: `lampa`, `dagsljus`, `morkt`, `motljus`, `blandat`
   - avstånd: ungefär hur högt telefonen satt över bordet — en gissning räcker
3. **Lägg fotot** i mappen som `bild.jpg`, nerskalat:
   `sips --resampleWidth 1080 -s format jpeg -s formatOptions 80 IMG_1234.jpg --out bild.jpg`
4. **Skriv facit** som `facit.json` i samma mapp. Det räcker med namnen, ett
   kort per rad, också dubbletter:
   ```json
   {
     "yta": "vit spelmatta",
     "ljus": "taklampa",
     "hojd_cm": 60,
     "kort": [
       { "namn": "Plains" },
       { "namn": "Plains" },
       { "namn": "Maul of the Skyclaves" }
     ]
   }
   ```
   Ligger ett kort under ett annat så att bara en kant syns: `{ "namn": "Swamp", "dold": true }`.
   Vill du också prova *var* korten ligger kan du rita
   rutor i stället (frivilligt): kör `npm run dev`, öppna
   <http://localhost:8232/dev/golden/markera.html>, släpp in bilden, dra en
   ruta runt varje kort och skriv namnet, tryck **Kopiera facit.json** och
   klistra in i filen.
5. **Kontrollera namnen**: vart och ett måste finnas i `dev/golden/lek.txt`,
   annars kan kameran inte känna igen kortet. Lägg till det som saknas.
6. **Kör fallet**: `node dev/golden/kor.cjs --fall 08 --detalj`.
7. **Spara och checka in**: `node dev/golden/kor.cjs --fall 08 --spara` (och
   `--ai --fall 08 --spara` om du kör med Claude), en rad i `historik.md`, och
   mappen, `senaste.json` och `historik.md` i samma commit.

## Lägga till en video

Ett videofall provar det ett foto inte kan: kort som **läggs ut och plockas
bort medan kameran går**. Provet spelar inte upp videon i realtid — det matar
in en ruta i taget och låter appens klocka följa videon, så att samma video
alltid ger samma svar. Räkna med sämre siffror än på ett foto; det är poängen.

1. **Spela in** med telefonen: starta Mesas kameravy och gör en
   skärminspelning medan du lägger ut och plockar bort kort. Då syns appens
   egna spårrutor i bilden — det är avsiktligt, man ser vad kameran såg.
2. **Lägg originalet i `dev/videos/`** (den mappen är gitignorerad — en
   telefoninspelning är tiotals megabyte och hör inte hemma i git).
3. **Klipp och koda om** till mappen. Klippet ska vara *bara kamerabilden*:
   bort med iOS statusrad, appens rubrik, statustexten och webbläsarens rad.
   Sedan 2026-09-12 visar kameravyn ingen text efter de första sex sekunderna
   (ett tryck på skärmen visar den), så en ny inspelning har bara iOS och
   Safari att klippa bort.
   Verktygen ligger i `dev/golden/video/` och använder bara macOS egna delar,
   ingen ffmpeg:

   ```bash
   # x y bredd höjd = utsnittet i inspelningens bildpunkter; sedan utbredd, kbit/s, fps
   swift dev/golden/video/koda.swift dev/videos/min-video.MP4 \
     dev/golden/fall/08-.../video.mp4 0 300 1180 1480 1080 1000 15
   ```

   1 Mbit/s, 15 rutor i sekunden och 1080 px bredd ger ~4–5 MB för 40
   sekunder. Videon ska in i git; håll den under tio megabyte.

   Två valfria tal sist, `start_s slut_s`, klipper i tiden — inspelningen
   slutar ofta med Kontrollcenter över bilden när man stoppar den (fall 09
   och 10), och det ska bort. Facits tider räknas från `start_s`. Utsnittet
   anges alltid i den VISADE bilden, som i QuickTime, också för en liggande
   inspelning (2556×1180): för fall 09/10 var kamerabilden `523 328 1510 852`
   (bort med Safaris rader och de svarta kanterna). En ny inspelning har bara
   Safari att klippa bort — kameravyn visar ingen text (MES-87).
4. **Ta ut `bild.jpg`** — sista rutan, den som visar slutläget:

   ```bash
   swift dev/golden/video/ruta.swift dev/golden/fall/08-.../video.mp4 36.5 \
     dev/golden/fall/08-.../bild.jpg
   ```
5. **Läs av tiderna** ur ett kontaktark: många rutor bredvid varandra med
   tiden utsatt, så att du ser vad som händer när.

   ```bash
   swift dev/golden/video/kontaktark.swift dev/golden/fall/08-.../video.mp4 \
     /tmp/rutor 0,2,4,6,8,10,12,14,16,18,20 260
   ```
6. **Skriv facit.** `kort` är **slutläget** — korten som ligger kvar när videon
   tar slut — precis som för ett foto. Förloppet står i `video`:

   ```json
   {
     "yta": "träbord",
     "ljus": "dagsljus",
     "hojd_cm": 40,
     "ruta": { "upp": "h" },
     "kort": [ { "namn": "Ukud Cobra" }, { "namn": "Swamp" } ],
     "video": {
       "fil": "video.mp4",
       "takt_ms": 150,
       "svans_s": 8,
       "handelser": [
         { "t": 5.5, "spelar": "Thriving Moor" },
         { "t": 29.5, "tar_bort": "Fencing Ace" }
       ]
     }
   }
   ```

   Fler händelsetyper: `{ "t": 26.5, "tappar": "Plains" }` och `"otappar"` (K1:
   tap-flip inom 8 s), `{ "t": 42.5, "flyttar": "Pharika's Chosen" }` (K2/MODE-5:
   ett säkert spår med namnet står mer än 15 % av bredden från sitt läge före
   flytten, inom 8 s), och en graveyard-ruta i bildandelar för högen i bild:
   `"grav": { "x": 0, "y": 0.46, "w": 0.175, "h": 0.54 }` (K9-lite; utan rutan
   blir högens översta kort ett falskt spår med säkert namn), och på samma sätt
   `"bib"` för leken (library-rutan, MES-122). Appen har alltid båda rutorna
   sedan uppstartens steg 4 — ligger leken i bild utan `"bib"` i facit mäter
   provet leken som ett kort på bordet, vilket appen aldrig gör.

   `t` är sekunder in i videon (±0,5 s duger), `takt_ms` hur tätt rutorna matas
   in (150 = appens egen takt), `svans_s` hur många sekunder till kameran får
   på sista rutan innan fallet döms. `ruta.upp` är `"h"` när ett otappat kort
   ligger med långsidan vågrätt i bilden. Varje namn måste finnas i `lek.txt`
   — också de som bara syns en stund.
7. **Kör fallet**: `node dev/golden/kor.cjs --fall 08 --detalj`. Kolumnen
   **Förlopp** är videofallets: `2/7 spelade` = kameran hann ge två av sju
   utspelade kort ett säkert rätt namn, `1/2 borttagna` = ett av två
   bortplockade kort ligger kvar på bordet, `ordning 2/7` = så många av
   utspelen kom i rätt ordning. `--detalj` skriver varje kort med sin tid och
   varje spår från födsel till död, i videons sekunder.
8. **Spara och checka in** som för ett foto: `--fall 08 --spara`, en rad i
   `historik.md`, mappen och `senaste.json` i samma commit.

## Ett nytt foto är ett nytt prov, inte en beställning

Du ändrar ingenting i koden för att ett foto lagts till. Fotot mäts, resultatet
blir baslinje, och varje senare ändring jämförs också mot det. Klarar kameran
inte fotot har du hittat något att förbättra — förbättra då så att hela setet
blir bättre, och så att inget annat fall blir sämre. Att skruva tills just ett
foto blir rätt gör ofta ett annat fel.

## Var algoritmen, systemprompten och modellen finns

Radnummer ändras hela tiden; sök efter namnet.

| Del | Fil | Sök efter |
|---|---|---|
| **Algoritmen** — telefonens egen igenkänning, ingen AI | `index.html` | `const Kamera` (hittar korten och skär ut dem; trösklarna i `const T = {`), `function serUtSomKort` (skräpfiltret), `global.Matcher` (konstverket mot leken), `const Namn` (läser titelraden), `async function kamIdentifiera` (väger ihop till ett svar) |
| **Frågan till Claude** | `index.html` | `function kamFragaAI` (en osäker beskärning), `async function kamHelbild` (hela bilden) |
| **Systemprompten** — instruktionerna till Claude | `api/identify.js` | `mode === 'kamera'` (texten under `system:` och instruktionerna i frågan) — samma för beskärningar och hela bilden. `PANE_PROMPT_V` är versionsnumret; höj det när systemprompten ändras |
| **Modellen** | `api/identify.js` + Vercel | `MODEL_KAMERA`: miljövariabeln `ANTHROPIC_MODEL_KAMERA`, annars `claude-opus-5`. I produktion sätts den i Vercel (se *Jämföra modeller*, steg 4) |

Golden setet provar de tre tillsammans. Utan `--ai` mäts bara algoritmen; med
`--ai` också systemprompten och modellen.

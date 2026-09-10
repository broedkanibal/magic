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
| Plats, Tappad | provas bara i fallen där facit har rutor (01–02) |

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
| `node dev/golden/kor.cjs --fall 07` | bara fallen vars mapp börjar på `07` |
| `node dev/golden/kor.cjs --ai` | med Claude (kostar) |
| `ANTHROPIC_MODEL_KAMERA=claude-sonnet-5 node dev/golden/kor.cjs --ai` | med en annan modell i kameran; raden `metod:` visar modell och systemprompt-version |
| `node dev/golden/kor.cjs --spara` | gör körningen till ny baslinje (`--ai --spara` för Claude). Med `--fall` byts bara de fallen |
| `node dev/golden/kor.cjs --beskarningar /tmp/beskarningar` | sparar bilderna kameran skickade vidare, en per spår — titta på dem när ett kort blir fel |
| `node dev/golden/vriden.cjs` | eget prov: kort som ligger snett |
| `node dev/kamerabank.cjs` | bänken: syntetiska bord och rörelse, ska sluta med `0 FEL` |

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
   läses först då. I dag är den inte satt, så koden väljer `claude-opus-5`.
   Spara därefter en ny baslinje med den modellen.

En ändring i systemprompten provas på samma sätt: kör steg 1 före ändringen och
samma kommando efter. Raden `metod:` visar versionen (`systemprompt v20`), så
att varje resultat säger vilken systemprompt det mätte. Systemprompten ändras
bara på uttrycklig begäran — se `CLAUDE.md` i repots rot.

## Lägga till ett nytt foto

1. **Fotografera** med telefonen rakt ovanför bordet, som när du spelar.
   Från en video: öppna den i QuickTime, pausa på rätt ruta, tryck ⌘C, och i
   Förhandsvisning *Arkiv → Nytt från urklipp* och spara som JPEG. Själva
   videon ska inte in i git; vill du spara den, lägg den i `dev/videos/`.
2. **Skapa en mapp** i `dev/golden/fall/` med nästa nummer. Namnet är bara en
   etikett så att du ser vad fallet provar — ingenting läser det:
   `NN-yta-ljus-avstånd-antalkort`, t.ex. `07-vitmatta-lampa-60cm-5kort`.
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
   Vill du också prova *var* korten ligger och om de är tappade kan du rita
   rutor i stället (frivilligt): kör `npm run dev`, öppna
   <http://localhost:8232/dev/golden/markera.html>, släpp in bilden, dra en
   ruta runt varje kort och skriv namnet, tryck **Kopiera facit.json** och
   klistra in i filen.
5. **Kontrollera namnen**: vart och ett måste finnas i `dev/golden/lek.txt`,
   annars kan kameran inte känna igen kortet. Lägg till det som saknas.
6. **Kör fallet**: `node dev/golden/kor.cjs --fall 07 --detalj`.
7. **Spara och checka in**: `node dev/golden/kor.cjs --fall 07 --spara` (och
   `--ai --fall 07 --spara` om du kör med Claude), en rad i `historik.md`, och
   mappen, `senaste.json` och `historik.md` i samma commit.

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

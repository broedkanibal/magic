# Problemrapporten och samtycket — dev ready (MES-367, del C av MES-271)

Designytan: **"Mesa Problem Report"**, <https://claude.ai/artifact/NSTD99GSH8WUUkFbgAHyQz>.
**Sida 10 (Dev ready)** är spec-tavlorna, **sida 9 (Latest)** är bilderna. Sida 1–8 är historik och
gäller inte; hur vi kom hit står i `HISTORIK.md`. Tavlornas källor: `project/L9-*.dc.html`.

Jespers beslut 2026-10-12–13. Bygget förutsätter **A (MES-365)** — svarta lådan, felfångsten,
uppladdningen, `rapporter`-tabellen, `hamta.cjs`/`lista.cjs` — och **B (MES-366)** — stillbilderna
och de tysta rättelserna. C bygger spelarens ytor ovanpå dem, inte en egen väg.

## Grundregler

| Regel | Vad |
|---|---|
| Samtycket | Felrapporter utan bilder: inget val. **Rapporten: trycket** på *Send report*, inga kryssrutor. **Rättade kort med bild: en inställning, av från början** (`user_metadata.improve_pictures`) |
| Ett syfte | *to fix problems and improve Mesa's card recognition, including training our models* |
| Inställningen | gäller bara det som sparas utan tryck. En rapport följer den aldrig. Saknas fältet = av. Läses i ögonblicket en bild ska sparas; av = ingenting sparas, inte heller lokalt |
| Spelaren utreder inte | rutan frågar bara vad spelaren såg. Tid, vy, mattans logg och stillbilder sparas automatiskt; läsaren (`hamta.cjs`, uppspelaren, Claude Code vid skrivbordet) kopplar ihop dem |
| Claude | aldrig ett villkor, ingen ny väg skickar något till Claude. Systemprompten rörs inte |
| Texter | engelska, utan tankstreck i synliga texter, exakt som nedan |

## 1 · Create your account (tavla *Account · Create your account*)

Kortet på startsidan, `#startKort` (`index.html` ~3511). Ordning uppifrån:

1. Villkorsrutan som i dag (`#villkorBox`). **Den ensam** låser upp *Sign up with Google*.
2. **Ny ruta**, aldrig ibockad från början, `id="bildBox"`:
   - fet: **Share pictures of cards I correct.**
   - text: *When you fix a card's name, Mesa keeps the picture of that card to fix problems and improve its card recognition, including training our models.*
   - liten rad: *Optional. You can change it any time in Settings.*
3. Finstilt (`#villkorFin`) **ersätts** med: *To find and fix problems, Mesa notes how the app is used and any errors. No ads, and no pictures unless you choose.* + länken *What and why* (privacy.html).

**Sparas:** valet följer med Google-rundturen som villkoret (`sthv.villkor` i sessionStorage, ~38235):
lägg `sthv.bilder` = `'1'`/`'0'`. Efter rundturen (~38293), i samma `updateUser` som `godkannVillkor`:
`improve_pictures: true|false`, `improve_pictures_at: ISO-tid`. Vid *Sign in* (befintligt konto) visas rutan inte.

## 2 · Before you continue (tavla *Account · Before you continue*)

Spärren för befintliga konton när `VILLKOR_VERSION` höjs (`visaStartLage('sparr')`, ~38190).

- Under rubriken: en ruta (`.portalnotis`-stil): **What's new** · *You can send us a problem report with pictures, and choose whether to share pictures of cards you correct.*
- Villkorsrutan, sedan **samma bildruta** som i 1. Saknar kontot `improve_pictures`: oibockad. Finns fältet: visar dess värde.
- Samma nya finstilta rad.
- *Agree and continue* låses bara av villkorsrutan. Ett tryck sparar `terms_version` **och** `improve_pictures(_at)` i en `updateUser`.

## 3 · Settings (tavlorna *Settings · …*)

**Home-menyn** (`.lsmeny`, ~3559): ny rad **Settings** (kugghjulsikon) ovanför *Sign out*, `data-hem="installningar"`.
Öppnar en dialog **Settings** (samma `.pop`-stil som rapportrutan):

| Del | Innehåll |
|---|---|
| Rubrik **PICTURES** | växel **Share pictures of cards I correct** med texten från 1. Under: av → *Off. Nothing is kept when you correct a card.* · på → *On since 12 Oct 2026.* (datumet ur `improve_pictures_at`). **Sparar direkt**, ingen Save |
| Rubrik **WHAT YOU HAVE SENT** | *3 reports and 41 card pictures* (antal ur `rapporter` för `user_id = jag`, `kalla` rapport resp. rattelse) · *Reports you send are always your own choice, one at a time, whatever the switch says.* |
| Knapp | **Delete my reports and pictures** (röd kontur). Tryck → frågan i rutan: ***Delete 3 reports and 41 card pictures?*** *They are deleted from Mesa right away. Pictures already used to train a model can't be taken out of that model.* · **Delete** / **Cancel** |
| Efter | ✓ ***Nothing you sent is stored in Mesa*** · *3 reports and 41 card pictures were deleted. The switch is still on: new corrections are kept from now on.* (sista meningen bara om växeln är på). Knappen grå. Ingen grön notis |
| Fot | länk *Privacy Policy* |

**Delete** tar bort spelarens rader i `rapporter` (alla `kalla`) och filerna under `scans/<uid>/rapporter/`
och rättelsernas sökväg. Växeln rörs inte. Inget nytt sparas av knappen. Kopiorna i repot: se §9.
Inget skickat: *Nothing sent yet* och knappen grå.

## 4 · Knappen (tavla *The button*)

| Var | Hur |
|---|---|
| Datorn, i ett spel | toppraden, till vänster om kamerapillret, `iconbtn` med flagg-ikon och texten **Report a problem**. Syns i alla lägen av spelet. **Bara i ett spel** — inte på Home eller lekens sida |
| Telefonen (kameravyn) | toppraden `.kamtopp`, bredvid *Disconnect*: liten knapp **Report a problem** |

Knappen ersätter A:s knapp i Developer-lådan (den kan stå kvar där också). Den syns för alla först när
flaggan `RAPPORT_FOR_ALLA` är på (se *Go-live*); innan dess bara med `?debug`.

## 5 · Rapportrutan (tavla *Report · in the game*, spelbar)

En `.pop`-ruta, 460 px bred, under knappen till höger. **Täcker inte hela mattan**; spelet syns bakom.

1. Rubrik **Report a problem** + stäng-kryss.
2. **What happened?** (etikett 14 px, ljus) — textfält, 3 rader, **får fokus när rutan öppnas**. Platshållare: *For example: a minute ago I played an Island, a second one showed up next to it and then went away*
3. **Or pick what it looks like** — snabbval, ett åt gången, tryck igen tar bort. Ändrar aldrig rutans innehåll:

   | Text | `tagg` |
   |---|---|
   | A card disappeared | `forsvann` |
   | A card appeared that I didn't play | `dok_upp` |
   | A card never showed up | `kom_aldrig` |
   | Wrong name | `fel_namn` |
   | Tapped or untapped wrong | `tap` |
   | Slow | `langsamt` |
   | Something else | `annat` |

4. Liten text: *We get your words, what your camera saw, what happened on your mat in the last 10 minutes and what was on your screen when you pressed, to fix problems and improve Mesa's card recognition, including training our models.* + *More* (privacy.html)
5. Fot: **Cancel** · **Send report** (alltid aktiv; inget krävs).

**Sparas automatiskt vid trycket på knappen** (inte vid Send): tiden, **vyn** — zoom, den del av mattan
som syntes (mattans koordinater), kortet spelaren senast rörde (spår-id) — och A:s låda + B:s stillbilder.
Raden får `text`, `tagg`, `vy` (jsonb), `kalla = 'rapport'`.

### Lägena (tavlorna *Report · …*)

| Läge | Visas |
|---|---|
| **Sending** | fälten låsta, stapel + *Sending. This takes a few seconds.* · *Cancel* · knappen *Sending* med snurra. Rutan står öppen |
| **Sent** | ✓ ***Report sent*** · koden `R-0412` med egen knapp **Copy** bredvid · *Thanks. If you write to us about it, mention this code.* · fot: *Report something else* (vänster) · **Done** (ensam, höger). Det är en kvittens med kod, inte en grön ok-notis |
| **Couldn't send** | röd rad överst: ***Couldn't send the report.*** *Check your internet connection and try again. Your words are kept until you close this box.* · fälten kvar · **Try again** |
| **Today's limit** (20/konto/dygn, från A) | visas **när rutan öppnas**, före skrivandet: ***You have sent 20 reports today.*** *That is the most for one day. You can send more tomorrow.* · bara **Close** |
| **Phone not connected** | gul rad: ***Your phone isn't connected.*** *The report is sent from this computer, without the phone's pictures.* · den lilla texten utan *what your camera saw* · *Send report* fungerar |

### Telefonen (tavlorna *Report · on the phone*, *phone: …*)

- *Report a problem* öppnar ett ark nerifrån: **Report a problem**, textfältet (*What happened?*), samma snabbval (större), **Send report** (hel bredd).
- **Telefonen skickar aldrig själv**: arket skickar orden + taggen till datorn i kanalen, datorn tar sin låda, hämtar telefonens stillbilder och laddar upp samma paket.
- Kvittens på telefonen: ✓ ***Report sent*** · `R-0412` · *Your computer sent it. If you write to us about it, mention this code.* · **Done**.
- Når inte datorn (pricken röd): ***Can't reach your computer.*** *Reports are sent from the computer. Your words are kept here: try again when the dot at the top is green, or use Report a problem on the computer.* · textfältet kvar · **Close** / **Try again**.

## 6 · Automatiska felrapporter för alla

A:s felfångst (kodfel, misslyckade anrop, inga bilder) skickas för alla spelare som rader med
`kalla = 'fel'`, med ett eget tak (§9). Ingen ruta, inget val (berättigat intresse; privacy.html säger det).
Slås på med samma flagga. Spelarens ord eller bilder följer aldrig med en felrapport.

## 7 · Läsa rapporterna (tavla *Reading a report*)

`node dev/rapport/lista.cjs` (A) visar också **namn och e-post** ur kontot (service role, `auth.users`),
så att Jesper kan höra av sig. `hamta.cjs` skriver överst i `LÄS-MIG.md`:

1. **Det spelaren sa:** orden, snabbvalet, tiden, vyn vid trycket, spel och spelare.
2. **Mesas logg inom vyn, 90 s före trycket:** lagt/flyttat/tappat/borta med spår och tid.
3. **Det som passar snabbvalet och orden** (filtrerat ur loggen, inget gissat).
4. **Filer:** mattan vid trycket, stillbilderna nära händelserna, `rapport.json`, diagnosfilen.

**Höra av sig (private beta):** mejl för hand till kontots adress med koden. Ny kolumn `kontaktad_at`
(timestamptz, null) som `lista.cjs --kontaktad R-0412` sätter. Status i appen eller notis byggs inte nu.

**Gallring:** `node dev/rapport/gallra.cjs` (eller ett schemalagt jobb) tar bort rader och filer äldre
än 90 dagar med `anvandning` null eller `slangd`. `--torr` visar vad som skulle tas bort.

## 8 · privacy.html (tavla *privacy.html*)

Texten på tavlan, med **platshållarna `[CONTROLLER NAME]` och `[CONTACT EMAIL]`** i stället för
`[NAME / COMPANY AND ADDRESS]`. Tillägg mot tavlan: i avsnitt 6 meningen ***We may write to you about a
report you sent.*** Samma platshållare i `terms.html` (rad 27–28). Ny versionsrad `[DATE]` = dagen för go-live.

## 9 · Kantfall och detaljer för bygget

**Paketet fryses när knappen trycks**, inte vid *Send*: tiden, vyn, A:s låda och B:s stillbilder tas när
rutan öppnas. *Try again* skickar samma paket. *Cancel* och ny öppning = nytt paket.

**`vy` (jsonb):** `{ zoom, pan: {x, y}, synlig: {x0, y0, x1, y1} (mattans koordinater), senastRord: spårId|null,
lage: 'bord'|'utan', kamAnsluten: bool, skarm: {w, h} }`.

**Uppladdningen, tre steg (A äger protokollet, B och C använder det):**
1. Datorn skapar raden i `rapporter` och får koden (`R-NNNN`, löpnummer från servern).
2. Datorn laddar upp sitt paket (låda, bordslogg, mattans ändringar, miljö) till `scans/<uid>/rapporter/<kod>/`.
3. Datorn skickar `{t:'rapport_bilder', kod}` i kanalen; **telefonen laddar upp sina stillbilder själv** till
   `…/<kod>/bilder/` (per-uid-policyn finns) och svarar `{t:'rapport_bilder_klar', kod, antal}`.

Kvittensen på datorn kommer efter steg 2. Telefonens bilder går i bakgrunden: telefonen visar en liten rad
*Sending pictures, 12 of 40* tills klart. Raden får `bilder: 'klar'|'delvis'|'saknas'` (`saknas` när
telefonen inte är ansluten). Taket 15 MB per rapport (A): äldsta stillbilder släpps först.

**Telefonens egen rapport:** arket skickar `{t:'rapport', text, tagg}`; datorn gör steg 1–2 och svarar
`{t:'rapport_svar', kod}` eller `{t:'rapport_svar', fel}`; sedan steg 3 som ovan. Inget svar inom 10 s →
*Can't reach your computer*, orden kvar. Dator och telefon kan rapportera oberoende; två tryck = två rader.

**Tak:** 20 rapporter per konto och rullande 24 h, räknat på servern (`kalla = 'rapport'`). Felrapporter:
50 per konto och 24 h, och samma felmeddelande högst en gång per 10 min per sida (dedupe i lådan).

**Flera spelare och dold information (MES-305):** rapporten innehåller bara det den som trycker ser: sin
matta med motståndarnas utlagda kort (synliga för alla), den egna handen som antal, aldrig någon annans
hand eller bibliotek. Stillbilder bara från den egna telefonen.

**Digital table (ingen kamera):** knappen finns; rutan visar *Phone not connected*-raden; paketet är datorns.

**Klockan:** datorn stämplar allt på sin klocka; telefonens händelser bär telefonens tid plus kanalens
uppmätta offset (A:s DoD 1, "på en klocka"). Fyra klockor var problemet 2026-10-11.

**Tangenter och text:** Esc stänger rutan (inte medan den skickar). Enter i textfältet = ny rad,
Cmd/Ctrl+Enter = *Send*. Högst 500 tecken, räknare syns från 400. Snabbvalet är valfritt och ett åt gången.

**Knapparna:** *Copy* visar *Copied* i 2 s. *Report something else* öppnar en tom ruta med nytt paket.
*Done* stänger. Rutan är `position: fixed` under knappen, 460 px; under 720 px bredd hel bredd nedtill.
Kameran och mattan fortsätter under rutan. Lämnar spelaren spelet medan det skickar förloras rapporten
(ingen kö byggs nu).

**Delete och kopiorna i repot:** D:s `till-fall.cjs` skriver rapportkoden i varje fall det skapar (Mat test,
bänk, material). Delete hämtar först spelarens koder med `anvandning` in (test, traning) och skriver dem i
tabellen `raderingar (kod, raderad_at)` (inga personuppgifter), sedan raderas rader och filer.
`lista.cjs --raderade` visar koderna så att Jesper tar bort kopiorna i repot för hand; privacy-texten
säger att testfall och träning raderas när spelaren raderar, så det är ett löfte att hålla.

**RLS (A):** `rapporter`: insert, select och delete för `user_id = auth.uid()`, service role allt.
`raderingar`: insert för inloggad, select bara service role. Storage: policyn `scans_*` per uid finns.

**Flaggan:** `const RAPPORT_FOR_ALLA = false;` bredvid `VILLKOR_VERSION`. `DEBUG || RAPPORT_FOR_ALLA` visar
ytorna. Med flaggan av: ingen bildruta på konto och spärr, inga felrapporter skickas (kodfel loggas till
konsolen som i dag), knappen bara med `?debug`.

**Samma kort på telefonen:** start- och spärrkortet är samma `index.html`; bildrutan ser likadan ut där.
**Inställningen:** C:s Settings och B:s växel i Developer-lådan läser och skriver samma fält.

## Go-live: ingen spelare ser en text med platshållare

| Var | Vad |
|---|---|
| **main** (nattbygget) | allt i 1–9 bakom flaggan `RAPPORT_FOR_ALLA = false`: rutorna i A och B, Settings, knappen, rutan och felrapporterna syns bara med `?debug`. privacy.html och `VILLKOR_VERSION` **orörda** |
| **grenen `mes-367-golive`** (pushad, inte ihopslagen) | en commit: ny privacy.html och terms.html med platshållarna, `VILLKOR_VERSION` höjd, `RAPPORT_FOR_ALLA = true` |
| **Jesper** | fyller i namn och e-post på grenen (eller säger dem till en session), godkänner texten, och slår ihop. Då får alla konton *Before you continue* |

## Prov (MES-367:s definition of done)

1. Ny spelare utan `?debug` (efter go-live; före med `?debug`) skickar en rapport från dator och telefon, ser vad som skickas och får koden — **också med inställningen av**.
2. Ett provocerat kodfel ger en rad `kalla = 'fel'` utan bilder.
3. Inställningen av: ingen rättelse med bild sparas, inte heller lokalt. På → sparas. Av igen → slutar direkt.
4. *Delete my reports and pictures* lämnar inget i tabellen eller storage.
5. Rutan på 1 och 2: aldrig förbockad, låser aldrig knappen, valet hamnar i `user_metadata`.
6. Rapportrutan: alla fem lägena nås (nät av, tak via en provräknare, telefonen bortkopplad). Telefonens bilder: `bilder` blir `klar`, `delvis` (nätet bryts mitt i) och `saknas` (ingen telefon).
6b. Två spelare i samma spel: den enes rapport innehåller aldrig den andres hand (prov med två konton).
6c. `raderingar` får koderna för fall som gjorts av raderade rapporter (gör ett fall med `till-fall.cjs`, radera, kör `lista.cjs --raderade`).
7. `dev/kolla.sh` grön, Mat test oförändrat, golden inte sämre om telefonkoden rörts (0 fel namn), allt även med Claude av.
8. Fristående granskning före merge och efter varje rättelse; varje tavla på sida 9 provad mot bygget, också det som **inte** ska synas (inga kryssrutor i rapportrutan, ingen förbockad ruta, ingen grön notis).

## Byggs inte nu

Status för rapporter i appen och notis när något är fixat · knappen på Home · video · att peka eller
välja tid i rutan (strukna efter prov på sida 6–8) · träning på rättelserna (egen issue när materialet finns).

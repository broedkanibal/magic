# Problemrapporten — från spelarens tryck till din skärm

MES-271 i fyra delar: **A** (MES-365, det här) svarta lådan, felfångsten, rutan och
uppladdningen · **B** (MES-366) telefonens stillbilder och de tysta rättelserna ·
**C** (MES-367) knappen för alla, telefonens ark, Settings, samtycket ·
**D** (MES-368) rapport → Mat test-fall, bänkfall eller träningsdata.
Spelarens yta: `design_handoff_rapport/README.md` (§5 rutan, §9 detaljerna).

## Vägen, kort

| Steg | Vem | Vad händer |
|---|---|---|
| 1. Trycket | spelaren | *Report a problem* (i A: Developer-lådan i kameradialogen, eller **Ctrl+Alt+R** på datorn, bara med `?debug`). **Paketet fryses nu**, inte vid Send |
| 2. Orden | spelaren | skriver vad som hände (högst 500 tecken) och/eller väljer ett snabbval. *Send report* (eller Cmd/Ctrl+Enter) |
| 3. Koden | datorn | raden i `rapporter` skapas, servern ger koden **R-NNNN**; paketet laddas upp; spelaren ser *Report sent* + koden med *Copy* |
| 4. Bilderna | telefonen | datorn säger `rapport_bilder`; telefonen laddar upp sin diagnosfil och sina stillbilder (B) själv, i bakgrunden |
| 5. Listan | du | `node dev/rapport/lista.cjs --nya` |
| 6. Hämta | du | `node dev/rapport/hamta.cjs R-0412` → `dev/diagnos/rapporter/R-0412/LÄS-MIG.md` |
| 7. Höra av sig | du | mejla spelaren (e-posten står i listan) med koden, och `lista.cjs --kontaktad R-0412` |
| 7b. Sortera | du | vad blev rapporten? `till-fall.cjs <kod> --mattest \| --bank \| --traning` gör ett fall och sätter `anvandning`; annars `satt.cjs <kod> fix \| slangd` (se *Från rapport till något som mäter* nedan) |
| 8. Gallra | du / schema | `node dev/rapport/gallra.cjs --torr`, sedan utan `--torr` |

## Verktygen

| Kommando | Gör |
|---|---|
| `node dev/rapport/granska.cjs` | **granskningssidan för de tysta rättelserna** på http://127.0.0.1:8279 — se *Granska rättelserna* nedan |
| `node dev/rapport/lista.cjs` | de senaste 50 rapporterna: kod, när, vem (namn och e-post ur kontot), tagg, text, anvandning, bilder |
| `… --nya` | bara de som inte sorterats (`anvandning` null) |
| `… --alla` | också felrapporter (`kalla = 'fel'`) och rättelser (`'rattelse'`, del B) |
| `… --kontaktad R-0412` | sätter `kontaktad_at` = nu |
| `… --raderade` | koderna i `raderingar`: rapporter spelaren raderat. Ta bort fall i repot som bär koden (`grep -r R-0412 dev/`) — privacy-texten lovar det |
| `node dev/rapport/hamta.cjs R-0412` | hämtar raden och filerna, skriver mappen nedan |
| `node dev/rapport/hamta.cjs --fil paket.json[.gz]` | samma av ett paket som redan ligger lokalt |
| `node dev/rapport/gallra.cjs [--torr]` | tar bort rader och filer äldre än 90 dagar med `anvandning` null eller `slangd` |
| `… --rattelser` | bara de tysta rättelserna (`kalla = 'rattelse'`, del B); går att kombinera med `--nya` |
| `node dev/rapport/satt.cjs R-0412 fix\|test\|traning\|slangd` | sätter vad rapporten blev. Spärren: test och traning byts aldrig (slutkod 3) |
| `node dev/rapport/till-fall.cjs R-0412 --mattest\|--bank\|--traning` | gör rapporten till ett Mat test-fall, ett bänkfall eller träningsdata, och sätter `anvandning` (nedan) |
| `node dev/rapport/till-fall.cjs --mattest --logg pass.json [--orden o.tsv] [--lek lek.txt] [--spelkod KOD]` | samma för ett pass utan rapportkod (bordsloggen ur appen; spelkoden står inte i den, så ge den med `--spelkod` för spärren per parti) |
| `node dev/rapport/prov-d.cjs [--bank-kor] [--tabell]` | provet för del D: syntetiska rättelser och en rapport i en tillfällig mapp, spärren åt båda hållen, bänken på bänkfallet, och (`--tabell`) satt/lista/spärren mot produktionens tabell med två provrader som tas bort efteråt |
| `node dev/rapport/prov-handlingar.cjs` | provet för rättelserna av handlingar (MES-385): raderna i `kort_handelser` genom appens egna vägar, den tysta rättelsen av och på, och paketet hela vägen genom `hamta.cjs --fil` och `till-fall.cjs --mattest` till ett facit. Ett steg i `dev/kolla.sh` |
| `node dev/rapport/prov.cjs` | provet: ett parti i huvudlös Chrome med en motståndare (dold information), fel, anrop, telefonens låda (NTP-offset), rutans fem lägen, Cancel under Sending, taket, telefonens ark utan `?debug`, appen när rapportblocket kastar, hamta — utan nät och utan Claude. Ett steg i `dev/kolla.sh`. Riktiga Supabase provas inte här |

Verktygen mot tabellen läser `SUPABASE_URL` och `SUPABASE_SERVICE_ROLE_KEY` ur `.env.local`
(i en worktree: symlänka den). Nyckeln skrivs aldrig ut.

## Mappen som hamta.cjs skriver (`dev/diagnos/rapporter/<kod>/`, gitignorerad)

| Fil | Vad |
|---|---|
| `LÄS-MIG.md` | **läs den först.** 1 · det spelaren sa (orden, snabbvalet, tiden, vyn, spel och spelare) · 2 · Mesas logg inom vyn 90 s före trycket · 3 · det som passar snabbvalet och korten som nämns i orden (filtrerat ur loggen, inget gissat), och felen · 4 · filerna |
| `rapport.json` | allt på **en tidslinje, datorns klocka**: `t` (ms), `rel` (sekunder från trycket), `sida` (dator, telefon, bord), `slag` |
| `bordlogg.json` | telefonens bord de sista 10 minuterna i fallets form (`dev/mattest/fall.cjs` rader; `node dev/dubbletter.cjs --logg`) |
| `mattan.json` | mattan vid trycket: mitt bord helt, motståndarnas utlagda kort |
| `paket.json` | paketet som datorn laddade upp, orört |
| `telefon-diagnos.json` | telefonens diagnosfil vid trycket (`node dev/kamerabank.cjs --diagnos`) |
| `bilder/` | telefonens stillbilder (del B) |

### Slagen på tidslinjen

| `slag` | Sida | Vad |
|---|---|---|
| `handling` | båda | klick, högerklick, dubbelklick, tangent (aldrig vad som skrevs i ett fält — bara Enter/Escape/Tab där), drag av kort, sidan dold/synlig |
| `matta` | dator | mattans ändringar: `typ` spelar · tar_bort · tappar · otappar · flyttar (`till` mattan/graveyard/exile/plats) · namn (`fran`). `kort` = namnet, `id` = kortets cid, `spar` = spåret. `av` spelare/kamera är en **gissning** (ett tryck de sista 1,5 s) |
| `bord` | dator | ett bord från telefonen (sammanfattat; hela raden i `bordlogg.json`) |
| `lage` | telefon | kamerans läge, bildläge, upplösning, vad skärmen säger (`rad`), om sidan syns |
| `spar` | telefon | ett spårs läsning ändrades: namn, säker, domskälet (`varfor`), tappat — eller `borta` |
| `fel` | båda | `onerror`, `unhandledrejection`, `console.error`, `console.warn` |
| `anrop` | båda | ett misslyckat anrop mot `/api` eller Supabase: metod, väg (utan frågesträng), status (0 = inget svar), ms |
| `claude` | båda | varje fråga till `/api/identify`: läge, status, ms, svarets enkla fält, tidsgräns |
| `notis`, `dialog` | dator | en notis som visades; en dialog som öppnades eller stängdes |
| `kanal` | båda | telefonen ansluten eller inte, datorn svarar inte, nätet online/offline |

## En klocka

Datorn stämplar allt med sin egen klocka. När rutan öppnas skickar datorn
`rapport_lada {id, t0}`; telefonen fryser sin låda och svarar med `tMot` (när
begäran kom) och `tTel` (när svaret gick), båda på sin klocka. Datorn tar emot
svaret vid `t1` och sätter, som NTP, **offset = ((tMot − t0) + (tTel − t1)) / 2**
— tiden telefonen lade på att frysa räknas då inte som resväg. (En telefon
utan `tMot` ger mitt-i-rundturen: `tTel − (t0 + t1)/2`.) Varje telefonhändelse får `t = tTel_händelse − offset` (telefonens egen tid
står kvar i `tTel`). Offset och rundtur står i `LÄS-MIG.md` och i
`rapport.json` (`telefon.offset`, `telefon.rtt`). Felet är högst halva
rundturen (oftast < 100 ms). Bordsloggens rader har `s` från passets start på
datorns klocka.

## Svarta lådan (index.html, `Lada` och `Rapport`)

| | |
|---|---|
| Var | `Lada` är första `<script>`-blocket (fångar fel och anrop från början); `Rapport` är sista blocket |
| Tak | 10 minuter, högst 8000 händelser och 2,5 MB per sida; det äldsta släpps först. Bara i minnet, töms när sidan stängs |
| Kostnad | ingen bild passerar lådan. Telefonen läser Kameras getters en gång i sekunden och skriver bara det som ändrats; fetch-kroken tittar bara på `/api` och Supabase. Mat test identiskt före och efter |
| Styr | ingenting: lådan observerar. Ett fel i lådan stannar i lådan |
| Dold information | paketet bär min matta, motståndarnas utlagda kort (som alla ser) och aldrig någons hand eller bibliotek; ett nedvänt kort hos en motståndare utan namn |
| Claude | aldrig ett villkor: inget här frågar Claude. Lådan noterar bara frågor appen redan ställer |

## Tabellen `rapporter` (`supabase/migrations/20261013090000_rapporter.sql`)

`kod` (R-NNNN från sekvensen `rapporter_nr`), `user_id`, `game_id`, `created_at`, `text`, `tagg`
(forsvann · dok_upp · kom_aldrig · fel_namn · tap · langsamt · annat), `vy` (jsonb, README §9),
`sokvag` (sätts av servern: `<uid>/rapporter/<kod>`), `storlek`, `bilder` (klar · delvis · saknas),
`anvandning` (fix · test · traning · slangd — bara service role), `kalla` (rapport · rattelse · fel),
`kontaktad_at`.

- **Taket räknas på servern**: 20 rapporter, 50 felrapporter och 500 tysta rättelser per konto och
  rullande 24 h (rättelsernas tak: `20261013150000_rapporter_tak_rattelse.sql`); den 21:a rapporten
  vägras med `rapport_tak` och rutan visar *Today's limit*. `rapporter_idag()` säger antalet när rutan öppnas.
  `vy` får vara högst 64 kB och `text` högst 2000 tecken.
- **Cancel under Sending**: uppladdningen stannar vid nästa steg, och fanns raden redan raderas den med
  sina filer (`Moln.rapportRadera`: koden i `raderingar` först, sedan filerna och raden). Telefonen ombeds
  aldrig om bilderna, och raden räknas inte mot taket.
- **RLS**: spelaren lägger in, läser och raderar sina egna rader, och får uppdatera bara `storlek` och
  `bilder` (steg 2–3: koden finns först när raden finns). `raderingar`: inloggad lägger in bara koder för sina
  egna rapporter (skrivs före raderingen), bara service role läser.
- **Felrapporter** (`kalla = 'fel'`): kodfel (`onerror`, `unhandledrejection`) och misslyckade anrop
  (5xx, inget svar), utan spelarens ord och utan bilder; felet och de senaste 20 handlingarna står i `vy`.
  Samma meddelande högst en gång per 10 min per sida. Skickas bara med `?debug` (del C: `RAPPORT_FOR_ALLA`).

## Kanalen (kontots egen, `kam:<user_id>`)

| Riktning | Meddelande (`typ`) | |
|---|---|---|
| dator → telefon | `rapport_lada {id, t0}` | frys din låda och din diagnosfil |
| telefon → dator | `rapport_lada {id, t0, tMot, tTel, del, delar, json}` | lådan, i högst fyra delar |
| dator → telefon | `rapport_bilder {kod, sokvag, id}` | ladda upp det du frös till `<sokvag>/` och `<sokvag>/bilder/` |
| telefon → dator | `rapport_bilder_klar {kod, antal, fel}` | raden får `bilder` klar / delvis (`saknas` om inget svar på 2 min eller ingen telefon) |
| telefon → dator | `rapport {id, text, tagg}` | telefonens ark (del C): datorn fryser och skickar |
| dator → telefon | `rapport_svar {id, kod}` eller `{id, fel: 'tak' \| 'nat' \| 'av'}` | `av` = rapporten är inte på hos datorn (utan `?debug` / `RAPPORT_FOR_ALLA`) |
| dator → telefon | `rapport_rattelse_bild {kod, sokvag, spar}` | B: ladda upp beskärningen till en tyst rättelse |
| telefon → dator | `rapport_rattelse_klar {kod, ok, kort, varfor, tBesk}` | B: inget svar på 10 s = datorns kopia |

## För del B, C och D

| Del | Kroka på |
|---|---|
| **B** | `Rapport.stillbilder = () => [{ namn, t, blob }]` på telefonen: anropas när datorn fryser, och bilderna laddas upp till `<kod>/bilder/` vid `rapport_bilder` (taket 15 MB, äldsta släpps). Rättelserna: `Rattelse.fran(handelse, kort, ratt)` (se *Del B* nedan) |
| **C** | `oppnaRapportRuta()` (eller `Rapport.oppna()`) från knappen i toppraden — ett nytt tryck med rutan öppen behåller orden och fokuserar fältet; telefonens ark: `Rapport.franTelefon(text, tagg)` → `{kod}` eller `{fel: 'tak' \| 'nat' \| 'dator' \| 'av'}` (`dator` = inget svar på 10 s: *Can't reach your computer*). Delete: `Moln.rapportRadera(kod, sokvag)`. Flaggan `RAPPORT_FOR_ALLA` läses av `Rapport` om den finns. Rutans position (under knappen) är C:s |
| **D** | byggd (MES-368): `till-fall.cjs`, `satt.cjs`, `sparr.cjs`, `prov-d.cjs` — se nästa avsnitt |

## Del B (MES-366): stillbilderna och de tysta rättelserna

| | |
|---|---|
| Var | `Stillbilder`, `Rattelse` och växeln: sista `<script>`-blocket i index.html. Krokar: Kamera `loop` → `efter()` (en rad), `identifiera`/`spekulera` (en rad var), fem rader hos rättelserna (arkSvar token, removeAt, ofrInteKort, namngePend, applyPick) |
| Stillbilder | telefonen, ringbuffert i minnet: analysbilden (anaC, ≤ 360 px i förval; över 480 skalas ned ur anaC) som JPEG 0,7, en var 2:a s + en per händelse (kort kom/gick, namn, tap, viloläget flyttat > 3 %), högst en händelsebild per 300 ms. Tak 300 bilder / 7,5 MB. Läsningens beskärning per spår och namnsättning: 40 / 2,5 MB. Kodningen med toBlob, högst två i taget (fler hoppas över). Av: `window.STILLBILDER_AV = true` (golden `--utan-stillbilder`) |
| I rapporten | `Rapport.stillbilder` = `Stillbilder.stillbilder`: `bilder/s-<t>-<i>.jpg`, `bilder/beskarning-spar<id>-<t>.jpg`, `bilder/index.json` (per bild: fil, t telefonens klocka, orsak tid/handelse, w, h, spar[{id, kort, saker, tappad, tillstand, varfor, x, y, w, h}] i andelar av bilden). Telefonen visar *Sending pictures, N of M* under uppladdningen |
| hamta.cjs | skriver `stillbilder.json` (bilderna på datorns klocka: t = tTel − offset, s = sekunder i bordsloggen, rel = från trycket). En rättelse (`kalla = 'rattelse'`): `rattelse.json`, `beskarning.jpg`, `kontext.jpg` och en kort `LÄS-MIG.md` med rutan, de maskade och kontexten (en rad i utskriften när kontext.jpg saknas) |
| Uppspelaren | `node dev/mattest/kor.cjs --visa --rapport dev/diagnos/rapporter/R-0412` (fönster) eller `--bilder <mapp> --vid rapport:12.5` (skärmdumpar): stillbilden med spårens rutor till vänster, mattan ur bordsloggen till höger, markeringar = mattans ändringar, röd = trycket |
| Rättelserna | namnbyte, Name this card, borttaget kort (bara kamerakort, läget `bord`): rad i `rapporter` (`kalla 'rattelse'`, `vy {handelse, gissning, ratt, spar, ruta, maskade}` — datorns syn på bordet), filerna `beskarning.jpg`, `kontext.jpg` och `rattelse.json` = `{ gissning, varfor, ratt, spelkod, t, spar, handelse, saker, bild, ruta, maskade, kontext, kontextSkal, bordet }` (`bild`: 'telefon' / 'dator' / null; se *Var kortet låg* nedan). BARA när `user_metadata.improve_pictures === true`, läst från servern (`auth.getUser`) i ögonblicket |
| Kanalen | dator → telefon `rapport_rattelse_bild {kod, sokvag, spar}`; telefon → dator `rapport_rattelse_klar {kod, ok, kort, varfor, tBesk, ruta, maskade, kontext, kontextSkal}` (telefonen laddar upp `beskarning.jpg` och `kontext.jpg` själv). Inget svar på 10 s: datorns kopia (granskningens beskärning, annars kamerans foto), rutan ur bordet, maskade och kontext null; ingen bild alls: `bilder = 'saknas'` |
| Växeln | Developer-lådan (`?debug`): *Share pictures of cards I correct*, läser/skriver `improve_pictures` + `improve_pictures_at` (`Moln.bildInstallning`, `Moln.sattBildInstallning`, `Moln.bildInstallningSedan`) |
| Prov | `node dev/rapport/prov-b.cjs` (ringen 30 min accelererat, rapportens bilder, rättelserna av/på/av, växeln), `node dev/rapport/prov-b-uppspelaren.cjs --bilder <mapp>` (golden-video → ringen → hamta → uppspelaren), `node dev/rapport/prov-b-supabase.cjs <fil>` (rad + filer mot riktiga Supabase, hamta, städning) |

### Rättelser av handlingar (MES-385, Jespers beslut 2026-10-15)

Kameran missar ungefär hälften av tap och flyttar på mattan, och spelaren rättar dem i appen. Det blir två saker:

| | Vad | När |
|---|---|---|
| **Raden i `kort_handelser`** | `tap_hand` (Tapped/Untapped by hand: mattan visar ett annat läge än kamerans dom), `flytt_hand` (Moved by hand), `angrad` (Undo i toasten: kameran hade rätt), `folj_kameran` (Follow camera), `grav_hand` (To the graveyard, G, Return to hand eller draget till en hög, för ett kort kameran följer — `zon` grav, exil eller hand; aldrig en flytt mellan högarna). Ett tap som gör mattan och kameran överens igen är `angrad` med `hur: 'tap'`. Detaljerna i kolumnen `rapport`: `spar`, `tappad`, `kamTap`, `x`/`y`, `av`, `hur`, `zon`. Remove är `borttagen` som förut | alltid i läget bord, inloggad — som namnens rader. Varje gång, inte en gång per kort, och i en egen skrivning (`khSkicka`) |
| **En tyst rättelse utan bild** | en rad i `rapporter` (`kalla 'rattelse'`, `vy.handelse 'handling'`, `vy.handlingar`, `bilder 'saknas'`) och `rapport.json.gz` i rapportens form: telefonens bord, **spelarens journal** (`spelare`: allt spelaren gjorde med bordets kort — namn, tillagda, borttagna och handlingarna — skrivet av handlingen själv, med kortets spår) och, som diagnos, mattans ändringar (`slag 'matta'`, aldrig klick eller anrop) från 60 s före den första rättelsen till 20 s efter den sista, och mattan vid sändningen. Rättelser tätt efter varandra blir EN rad, högst 3 min (`Rattelse.handling`, `Rapport.handlingsPaket`) | samma villkor som namnens: rapporten finns, `improve_pictures` på (läst från servern när paketet skickas). Taket för rättelser gäller |

Sedan: `node dev/rapport/hamta.cjs R-0412` hämtar den som en rapport (`rapport.json`, `bordlogg.json`, LÄS-MIG med rättelserna), och
`node dev/rapport/till-fall.cjs R-0412 --mattest` gör den till ett Mat test-fall — **prov, aldrig träning**: handlingarna är regler i
avstämningen, ingen modell lär sig dem. Granskningssidan (`granska.cjs`) visar dem inte (ingen bild, inget namn); `lista.cjs --rattelser` gör det.

**Facit utan gissning** (en rättelse med journal) är **spelarens påståenden**, inte en tidslinje av händelser
(`pastaendenUrJournalen`): varje rättelse säger hur ETT kort — spåret — låg i ETT ögonblick, och att kameran visade
något annat just då. `tap_hand` = tappad/upprätt, `grav_hand` = borta (graveyard, exile, hand), Remove = borta,
`bytt`/`namngiven` = namnet. Inga av kamerans händelser antas vara rätta (`facit` är tom), och ingenting vävs ihop
med kamerans tidslinje — så ingenting behöver gissas om när något hände, eller om kameran och spelaren menar samma
händelse. Ett påstående tas tillbaka av **Undo i toasten** och av **⌘Z** (spelaren säger att det var fel). Follow camera
och ett tap tillbaka för hand säger bara att mattan följer kameran **nu**: om tapet var ett misstag eller om det
riktiga kortet vreds fram och tillbaka går inte att skilja, så påståendet märks `osaker` och räknas inte. Ett påstående
utan spår (`ejAvgorbart`) räknas inte heller. En flytt på mattan och ett tillagt kort blir inga påståenden.

Mat test mäter fallet med **"Spelarens rättelser som uppspelningen redan visade"**: visade uppspelningen påståendets
läge vid dess tid hade rättelsen inte behövts. På koden som spelades är svaret nästan alltid 0 av N — det är just
därför spelaren rättade; måttet blir bättre när kameran blir bättre. Kortet hittas på sitt spår (uppspelningens
`sparBana`), aldrig på namnet; går det inte är det "ej avgörbart".

En vanlig problemrapport (utan journal) byggs som förut ur lådans mattändringar, där `av` spelare/kamera är en gissning
(ett tryck de sista 1,5 s); där tas ett eget tap tillbaka av `angrad`/`folj_kameran` inom 2 s eller inom 10 s.
`grav_hand` loggas inte för en flytt mellan högarna (graveyard → exile): draget började i en hög.

Mattans logg (`slag 'matta'`, `av` spelare/kamera) förs fram direkt efter varje sådan rättelse, inte först vid nästa `renderAll` — annars kunde
ett tap loggas mer än 1,5 s efter klicket och gissas vara kamerans.

Mätningen: `node dev/spelupplevelse.cjs` (vyn `upplevelse_handlingar`, migrationen `20261015090000_kh_handlingar.sql`) — rättelserna per
100 kort, per slag. Inget här frågar Claude.

### Var kortet låg: ruta, maskade och kontext.jpg (uppföljning av MES-366/368)

Facit ska säga **vilket kort** som rättades, också i en hög — annars kan en modell tränas på grannens bild.
**Spårens namn i stillbilderna är aldrig facit**: de är telefonens gissningar (spår 63 i R-0009 bar namnet
Shock på fel kort). Facit är bara spelarens rättelser (`rattelse.json` → `ratt`) och spelarens ord.

| Fält | Vad | Varifrån |
|---|---|---|
| `ruta` | spårets låda i kamerabilden: `{x, y, w, h}` i andelar (som stillbildernas spår) + `bild {w, h}` (analysbildens mått) + `kalla` | `'beskarning'` = kortets låda när läsningens beskärning gjordes (`t.ram`/`t.box`). Med `rot` null är beskärningen den lådan + 8 % marginal, −90° när den ligger; med `rot` satt (`beskarVridning`, MES-334) är beskärningen kortets **vridna** rektangel runt lådans mitt, vriden `rot` grader — inte lådan; `'bordet'` = datorns senaste bord när telefonen inte svarade (bild null); `'stillbild'` = spårets ruta i en stillbild (`--spar`) |
| `maskade` | de lådor som målades grå i beskärningen — korten som ligger ÖVER spåret — med `spar` (null om inget spår hade lådan) | appens `maskaTackt` (t.tackt, en analyspixel större åt alla håll); spåret = det vars låda har IoU ≥ 0,5, samma regel som bordets `under`. `[]` = inget ovanpå, `null` = okänt — också när bordet säger *maskad* men inte av vilka (`--traning` vägras då) |
| `kontext.jpg` | ett **utsnitt runt kortet** ur ringens bild närmast beskärningen i tid, aldrig hela bordet (Jespers beslut 2026-10-14): rutan plus en rutas bredd åt sidorna och en rutas höjd uppåt och nedåt, begränsat till bilden, högst 480 px åt längsta hållet och aldrig uppskalat mer än ×2; spårets ruta röd, de maskade grå och streckade. `rattelse.json.kontext` = `{t, dt, w, h, bild, utsnitt, ruta, maskade}`: `utsnitt` = utsnittets läge i ringbilden (andelar x, y, w, h), `ruta`/`maskade` är andelar av hela ringbilden — kortet ligger i kontext.jpg vid `(ruta.x − utsnitt.x) / utsnitt.w` osv., `dt` = ringbildens t − beskärningens t (telefonens klocka, ms) | telefonen, när rättelsen sparas (ur ringens JPEG, aldrig ur videon), och **bara när \|dt\| ≤ 2 s** — en låda ur en annan tid i ett bord som hunnit ändras vore ett falskt facit. Saknas den står skälet i `kontextSkal` (telefonen svarade inte, spåret fanns inte i ringen, bilden låg för långt bort) |
| `bordet` | datorns syn: rutan och `under` ur senaste bordet | alltid med, också i radens `vy` |

En rättelse sparad före 2026-10-13 kväll (R-0008) har inga av fälten: den blir bänkfall med en varning, men
träning bara med `--utan-ruta` (och bara när du själv sett i bilden att det är rätt kort).

**`--spar <id>`** — ett bänkfall eller en träningsbild ur en vanlig rapport:
`node dev/rapport/till-fall.cjs R-0009 --bank --spar 77 --ratt "Shock" [--vid -12]`. Spårets id står på
stillbilderna i uppspelaren och i `stillbilder.json`. Bilden blir i första hand läsningens beskärning av
spåret (`bilder/beskarning-spar<id>-*.jpg`, närmast `--vid` = sekunder från trycket), annars spårets ruta
utskuren ur stillbilden närmast `--vid` — med korten ovanpå målade grå efter **bordsloggens `under`** i raden
högst 2 s från bilden (appens egen regel: `underAv` över `t.tackt`, vems kant eller remsa som syns över den
andras). Finns ingen sådan rad maskas alla rutor som överlappar spåret, som appen gör när den inte kan avgöra
vem som ligger överst. `--bild <stillbild>` tillsammans med `--spar` väljer bilden själv; `--bild` utan `--spar`
vägras (slutkod 2). Ett utsnitt ur en stillbild är lågupplöst (ett kort ~50–120 px): varning, och `--traning`
vägrar under 160 px kortbredd (bildmodellens indata är 256 px; läsningens beskärningar är 600–700 px).
Fallet får `ruta`, `maskade`, `mask_regel` och `<fall>-kontext.jpg` (bänken) eller `kontext.jpg` (träningen).
Kontexten är ett utsnitt runt kortet med samma regel som telefonens (se `kontext.jpg` ovan); fallets
`kontext_bild.utsnitt` säger var i stillbilden (eller ringbilden) det ligger, i andelar.
Utsnittet och kontexten ritas av `dev/rapport/utsnitt.py` (Pillow i `~/.mesa/detektor-venv`, eller `MESA_PY`).
Kontexten görs bara ur en stillbild högst 2 s från beskärningen (annars `kontext_skal` i fallet). Utan Pillow
går ett fall ur läsningens beskärning ändå (varning, ingen kontext); ett utsnitt ur en stillbild vägras.

## Del C (MES-367): knappen, telefonens ark, Settings och samtycket

| | |
|---|---|
| Flaggan | `const RAPPORT_FOR_ALLA = false;` i Moln bredvid `VILLKOR_VERSION` (global spegel `RAPPORT_FOR_ALLA`, regeln `rapportYtor()` = `?debug` eller flaggan, samma som `Rapport.rapportPa`). Av: inga ytor, inga felrapporter. Go-live: `dev/diagnos/natt-2026-10-13/golive/golive.md` |
| Konto och spärr | `#bildRad`/`#bildBox` (aldrig förbockad, låser aldrig knappen), `#startNytt` (What's new, bara spärren), ny finstilt rad. Valet följer Google-rundturen i `sthv.bilder` och skrivs i samma `updateUser` som villkoret (`Moln.godkannVillkor(bilder)`; samma värde skrivs inte om) |
| Settings | Home-menyn `data-hem="installningar"` → `Installningar.oppna()`: växeln (`Moln.sattBildInstallning`, B:s växel läses om), antalen (`Moln.rapportAntal`), *Delete my reports and pictures* (`Moln.raderaMinaRapporter`: test/träning-koderna i `raderingar` först, sedan alla filer under `<uid>/rapporter/` och alla rader, alla `kalla`) |
| Knappen | `#rapportKnapp` i spelets topprad, vänster om kamerapillret (`ritaRapportKnapp`, från renderMode): i ett spel, alla lägen, aldrig på telefonen. Öppnar A:s ruta |
| Telefonen | `#kamRapport` bredvid Disconnect → `TelefonArk` (ark nerifrån) → `Rapport.franTelefon`; kvittensen med koden, *Can't reach your computer* efter 10 s, `tak`, `nat`, `av` |
| Prov | `node dev/rapport/prov-c.cjs [--bilder <mapp>]` (steg i `dev/kolla.sh`): appens egna Moln-funktioner mot en attrapp av supabase-js (`fake-supabase.mjs`) med RLS-reglerna; allt annat nät stängt |

## Granska rättelserna (`granska.cjs`)

De tysta rättelserna på en sida, i stället för `lista.cjs --rattelser` + `hamta.cjs` + `till-fall.cjs` för hand.

```
node dev/rapport/granska.cjs          # http://127.0.0.1:8279 (--port för en annan)
```

| Del | Vad |
|---|---|
| Listan | varje rättelse grupperad per parti: telefonens beskärning, Scryfalls bild av det rätta namnet, gissning → rätt namn, händelse, domskäl. Flikar: Osorterade, Träning, Prov, Slängda, Alla. Klick på beskärningen = beskärningen och Scryfall-bilden stora bredvid varandra |
| Valen | **Träning** = `till-fall.cjs <kod> --traning`, **Prov** = `till-fall.cjs <kod> --bank`, **Släng** = `satt.cjs <kod> slangd`. Samma verktyg, samma spärr: ett parti är träning eller prov, aldrig båda, och knappen som spärren skulle vägra är grå i förväg. *Alla osorterade → Träning* per parti |
| Rätt namn | spelarens namn kan vara fel: skriv om det i fältet. Det prövas mot Scryfall (exakt namn, versaler spelar ingen roll) och går till `till-fall.cjs` som `--bild beskarning.jpg --ratt <namn>`; rattelse.json lämnas orörd |
| Träningen | räkningen ur `dataset.py rakna` (alla märkta pass + rättelserna i träning), **Bygg dataset** → `~/Library/Caches/mesa/ds-riktiga-v<N>-<datum>/` med Kaggle-metadata och `prompt.md`: prompten till en ny session som laddar upp, tränar v<N> på Kaggle och mäter mot grinden i CLAUDE.md. Sidan laddar aldrig upp och startar ingen Kaggle-körning själv |

Rättelserna hämtas till `dev/diagnos/rapporter/<kod>/` (som `hamta.cjs`) och Scryfalls bilder cachas i
`~/Library/Caches/mesa/granska-scryfall/`. Servern lyssnar bara på 127.0.0.1 och vägrar en annan Host eller en
POST från en annan sajt; service role-nyckeln lämnar aldrig servern. Golden-lekens namn kan sorteras som träning
men `dataset.py` tar inte med dem (sidan säger det), och vart femte namn är valideringens (mäter, tränas inte).

## Från rapport till något som mäter (del D, MES-368)

Utan det här steget är rapporterna en hög. Varje rapport blir **en** av fyra saker:

| Rapporten blir | När | Kommando | Hamnar i |
|---|---|---|---|
| **En fix** | felet syns i händelserna, felen eller bilderna och går att rätta | `satt.cjs <kod> fix`, sedan koden — och testfallet, se regeln nedan: fallet görs med `till-fall.cjs` och då blir rapporten **test** (fix → test går, fix → träning vägras) | — |
| **Ett fall i Mat test** | mattans beteende: dubbletter, hopp, fel plats, kort till handen | `till-fall.cjs <kod> --mattest` | `dev/mattest/underlag/rapporter/<kod>/` (`fall.json` + `bordlogg.json.gz`); `node dev/mattest/kor.cjs --fall <kod>` |
| **Ett bänkfall** | fel namn, missad remsa: en beskärning + rätt namn (en tyst rättelse) | `till-fall.cjs <kod> --bank` | `dev/remsa/rapportbank/` (`manifest.json` i `dev/embed/riktiga`-form); `~/.mesa/detektor-venv/bin/python dev/remsa/helkort_jamfor.py --bank dev/remsa/rapportbank dev/embed/modeller/mobileclip-s0-vision.onnx` |
| **Träningsdata** | bilder + rätt namn som inte ska vara prov | `till-fall.cjs <kod> --traning` | `dev/material/arbete/markning/rapporter-traning-mesa/<kod>/markning.json` i mark.py:s form (MES-340); `dev/remsa/tran/dataset.py` läser den |
| (inget) | inget att göra | `satt.cjs <kod> slangd` | `gallra.cjs` tar den efter 90 dagar |

`--bank` och `--traning` ur en vanlig rapport (inte en rättelse) kräver `--spar <id> --ratt "<namn>"`:
vilket spår, och vilket namn spelaren sa (se *Var kortet låg* ovan) — en hel bordsbild blir aldrig facit.
`--traning` kräver dessutom `ruta` och `maskade`. En rättelse av typen `borttaget` har inget rätt namn och blir
inget bänkfall.

### Regeln: en fix ur en rapport tar med sitt testfall i samma commit

Rättar du något som en rapport visade: gör först fallet (`till-fall.cjs <kod> --mattest` eller `--bank`),
se att det räknar felet på main, rätta, se att det inte längre gör det — och committa fallet och fixen
**ihop**. Då kan felet aldrig komma tillbaka tyst, och commiten bär beviset. Koden i commit-meddelandet.

### Spärren mellan test och träning

En **mätregel, inte en samtyckesfråga**: ett fall som blivit ett regressionsprov får aldrig hamna i
träningen — då mäter provet att modellen minns kortet. Samma regel som detektorns spärr prov/träning
(`dev/detektor/delning.py`, MES-288). `sparr.cjs` håller den på två ställen, och båda måste säga ja:

| Var | Regel |
|---|---|
| Tabellen | `anvandning` är `test` eller `traning`, aldrig båda. `till-fall.cjs` sätter den **först** (service role) och skriver sedan; `--mattest`/`--bank` = test, `--traning` = traning. När den väl är test eller traning byts den aldrig — inte heller via `fix` eller `slangd`, annars går det att tvätta test → slangd → traning. `null` → test eller traning går, `fix` → test går, men **`fix` → traning vägras** (se nedan); `slangd` → ett fall kräver `satt.cjs` först |
| Repot | koden — eller partiet, se nedan — får inte finnas på andra sidan: Mat test-underlaget och bänken mot träningsmaterialet. Håller också med `--lokal`, utan nät och om raden raderats. Saknas `dev/material/arbete/markning` (en worktree utan länken `dev/material`) kan spärren inte se träningssidan: **slutkod 2**, inget skrivet |

**Bänken mot träningen per parti, Mat test bara per kod** (Jespers beslut 2026-10-14):

| Export | Spärras av |
|---|---|
| `--bank` (bänken, `dev/remsa/rapportbank/`) | koden **eller partiet** i träningen |
| `--traning` | koden som Mat test-fall eller bänkfall, och **partiet** i bänken — inte partiets Mat test-fall |
| `--mattest` (`dev/mattest/underlag/rapporter/`) | bara **koden själv** i träningen — partiets andra rapporter och rättelser får bli träning, och tvärtom |

Varför Mat test inte läcker: ett Mat test-fall spelar upp telefonens färdiga läsningar och kör aldrig
bildmodellen, så att modellen tränats på samma partis kort kan inte göra ett Mat test-prov missvisande.
Bänken däremot mäter bildmodellen på bilden — där är två rättelser ur samma parti nästan samma bild.
(Före beslutet låste Mat test-fallen R-0003, R-0009 och R-0013 hela partiet KWQHXB, så att rättelserna
R-0008 och R-0010 inte kunde bli träning.)

**Tabellen skiljer inte på Mat test och bänk** (`anvandning = 'test'` för båda). Slaget avgörs ur repot
(`slagIRepot` i `sparr.cjs`): koden som `rapport` i ett Mat test-fall = Mat test, i bänkens `manifest.json` =
bänk (ligger den på båda gäller bänken). En testrad ur samma parti **utan** kopia i repot är av okänt slag
och spärrar som ett bänkfall, med ett meddelande som säger varför. `satt.cjs <kod> traning` följer samma
regel; `satt.cjs <kod> test` prövas per parti om inte koden redan är ett Mat test-fall i repot.

Gränser (granskningen av f37f2a3):
- **Slaget läses ur arbetsträdet som körs.** Ett fall som bara ligger på en gren som inte är ihopslagen syns
  inte: slå ihop fallgrenar innan rapporter ur samma parti blir träning.
- Tabellen frågas på `game_id`. En testrad som bara delar spelkod (ingen `game_id`) och saknar kopia i repot
  syns inte som okänt slag.
- `granska.cjs` visar en **förhandsvisning** (Träning grå för ett bänkfall eller en okänd testrad bland
  rättelserna i partiet). Den läser inte repot och inte rapporternas bänkfall, så knappen kan vara grön där
  `till-fall.cjs` sedan vägrar (slutkod 3, med skälet). `till-fall.cjs` har sista ordet.

**Per parti, mellan bänken och träningen.** Två rättelser av samma kort i samma parti, eller en rapport och
en rättelse ur samma parti, är nästan samma bild. Blir den ena bänkfall och den andra träning mäter bänken att
modellen minns partiet — samma skäl som att detektorns spärr delar per inspelningstillfälle. Därför:

| | |
|---|---|
| Partiets nyckel | `parti: { game_id, spelkod }` i `fall.json`, bänkens `manifest.json` och `markning.json`. `game_id` ur tabellen (annars rapportens `miljo.spelId` eller bordsloggens `spel`); `spelkod` ur `rattelse.json`, rapportens `miljo.spel` eller bordsloggens `spelkod`. Ett pass utan rapport (`--mattest --logg`) bär ingen spelkod i bordsloggen: ge den med `--spelkod <kod>` (p1011: `--spelkod CNA43K`) |
| Samma parti | delar `game_id` **eller** `spelkod` (en återanvänd spelkod ger en vägran för mycket, aldrig en för lite) |
| Tabellen | `test` (bänk) vägras när en **annan rad** med samma `game_id` redan är `traning`, och `traning` när en annan rad är `test` och inte ett Mat test-fall i repot (`till-fall.cjs` och `satt.cjs`). Frågas på både radens `game_id` och det den hämtade mappen bär: `satt.cjs` läser partiet ur `dev/diagnos/rapporter/<kod>/` (eller `--mapp`) när mappen finns, så att en rad utan `game_id` — telefonens rapporter, ett raderat parti (`on delete set null`) — ändå spärras per parti |
| Repot | vägras när en kopia ur samma parti ligger i bänken (för träning) eller i träningen (för bänken), också under en annan kod |
| Utan nyckel | (ingen `game_id`, ingen spelkod) spärren gäller per kod som förut, och `till-fall`/`satt` skriver **VARNING** |

`fix` → `traning` vägras: en fix tar med sitt testfall (regeln ovan), och då är rapporten test.
Säger spärren nej skrivs ingenting och slutkoden är 3. Träningsmappen heter `rapporter-traning-mesa` så att `delning.py` dömer den
som träning; golden-lekens namn märks `utanfor_traning` och valideringens namn `val` som i mark.py.

### Facit för ett Mat test-fall: spelarens rättelser + orden

Utgångsläget är vad kameran gjorde med mattan (rapportens `slag: 'matta'` utan `av: 'spelare'`), eller, för
ett pass utan rapport, kamerans påståenden ur bordsloggen (säkert namn på ett spår = utspel, spåret borta =
borttaget, samma namn på ett nytt spår inom 8 s = flytt). **Det spelaren ändrade är det rätta och vinner:**

| Spelaren | Facit |
|---|---|
| byter namn | kortet hette det nya namnet hela tiden |
| tar bort ett kort **från bordet** (`tar_bort`, inte en flytt till graveyard eller handen) som kameran lade dit medan ett med samma namn redan låg där — eller, med snabbvalet *A card appeared that I didn't play*, den borttagning som ligger **närmast trycket** (rapportens `frys`) | utspelet stryks: en dubblett |
| tar bort något annat, eller flyttar ett kort till graveyard/handen | borttaget (kameran missade det) |
| lägger tillbaka / flyttar tillbaka ett kort kameran tog bort inom 60 s | kamerans borttagning stryks |
| lägger dit ett kort | utspel (kameran missade det) |
| tappar/otappar tillbaka inom 60 s | kamerans tap stryks |

**Orden** (`--orden`, en TSV: `t gor typ kort till text`, `gor` = `stryk` eller `lagg`) är samma sak med
spelarens röst eller fritext, för det som inte blev en handling på mattan. `stryk` tar bort kamerans händelse
närmast `t` (±10 s). Det ingen rättade antas vara rätt: fallet **underskattar** felen, det hittar inte på dem.
`fall.json` visar varje struken rad och varför; justera facit för hand där om det behövs och skriv varför i `anm`.
`--lek lek.txt` ger uppspelningen lekens antal (mattans regel "fler än leken").

Exemplet: passet 2026-10-11 (inget rapportkod, Jespers röst):

    node dev/rapport/till-fall.cjs --mattest --logg dev/diagnos/pass-2026-10-11/pass-2026-10-11-2006.json \
         --lek dev/rapport/pass-2026-10-11/lek.txt --orden dev/rapport/pass-2026-10-11/orden.tsv \
         --spelkod CNA43K --skriv-over
    node dev/mattest/kor.cjs --fall p1011 --detalj p1011

Fall ur rapporter har `slag: 'rapport'`, räknas per fall och inte i Mat tests totalt, och får måttet *Kort som
inte blev något* (ett oframkallat kort eller en platshållare som stod ≥ 3 s och försvann utan att ett kort tog
över — dubbletten "som inte kunde identifieras").

**Grinden för rapportfallen** (`dev/mattest/rapportgrind.cjs`): varje fall har en egen baslinje,
`underlag/rapporter/<id>/grind.json`, och `kor.cjs --jamfor` (med eller utan `--fall`) jämför fallet mot den:

| | Mått |
|---|---|
| **Fäller** (slutkod 1) | *Kort som inte blev något* (`fantomer`) och *Fel till handen* (`felTillHanden`) när de blir fler än i `grind.json` |
| Varnar bara | allt annat i fallet — facit ur en rapport underskattar (det ingen rättade antas rätt), så övriga mått är diagnos |
| Fäller inget | ett fall utan `grind.json` (raden säger det) |

`grind.json` skrivs med `node dev/mattest/kor.cjs --fall <id> --spara` (bara rapportfall valda: den gemensamma
baslinjen rörs inte) eller av en vanlig `--spara` (alla fall). I regeln ovan: fallet fäller på koden före
fixen, `--spara` på koden efter, och fallet, `grind.json` och fixen committas ihop. De gamla fallens mått och
rader i `--jamfor` är oförändrade; rapportfallen skrivs i ett eget avsnitt efter dem.

p1011:s orden har tre rader som inte är rösten: en **flytt** av ett Mountain i sidled (x 0,29 → 0,43). I
bordsloggen försvinner spår 3 (Mountain) 231,8, spår 4 får namnet 234,59 på nya platsen och ligger kvar, och
spår 3 kommer tillbaka utan namn vid x 0,24 (233,8–237,0) — `till-fall.cjs` läser det som samma spår efter ett
glapp, så kamerans händelser blev ett utspel 234,59 och en borttagning 237,04. Orden stryker de två och lägger
`flyttar Mountain` vid 234,59; utan dem räknade facit ett utspel för mycket och *Borttagna kort som står kvar* 1
på all kod.

### Raderade rapporter

Spelaren raderar sina rapporter (C:s *Delete my reports and pictures*) → koderna hamnar i `raderingar`.
`till-fall.cjs` skriver koden i klartext i varje fall det skapar (`fall.json`, bänkens `manifest.json`,
`markning.json`), så: `node dev/rapport/lista.cjs --raderade`, sedan `grep -rl R-0412 dev/` och ta bort
kopiorna för hand (fallmappen, bänkposten och bilden, träningsmappen). Privacy-texten lovar det.

### En rutin, inte en issue per rapport

Att gå igenom rapporterna (`lista.cjs --nya` → `hamta` → `satt`/`till-fall` → `gallra`) är en rutin. Ingen
Linear-issue per rapport: tröskeln i CLAUDE.md gäller — en issue först när en rapport kräver ett beslut av
Jesper eller mer än en session. En fix bär sin historia i commit-meddelandet med koden.

**En träningsomgång på rättelserna blir en egen issue** när det finns material nog (räkna med
`dev/remsa/tran/dataset.py rakna`), och den går genom bildmodellens grind (CLAUDE.md: 0 säkra fel i golden,
totalen bättre, baslinje ×1 + ny ×2).

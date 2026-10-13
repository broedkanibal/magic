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
| Rättelserna | namnbyte, Name this card, borttaget kort (bara kamerakort, läget `bord`): rad i `rapporter` (`kalla 'rattelse'`, `vy {handelse, gissning, ratt, spar, ruta, maskade}` — datorns syn på bordet), filerna `beskarning.jpg`, `kontext.jpg` och `rattelse.json` = `{ gissning, varfor, ratt, spelkod, t, spar, handelse, saker, bild, ruta, maskade, kontext, bordet }` (`bild`: 'telefon' / 'dator' / null; se *Var kortet låg* nedan). BARA när `user_metadata.improve_pictures === true`, läst från servern (`auth.getUser`) i ögonblicket |
| Kanalen | dator → telefon `rapport_rattelse_bild {kod, sokvag, spar}`; telefon → dator `rapport_rattelse_klar {kod, ok, kort, varfor, tBesk, ruta, maskade, kontext}` (telefonen laddar upp `beskarning.jpg` och `kontext.jpg` själv). Inget svar på 10 s: datorns kopia (granskningens beskärning, annars kamerans foto), rutan ur bordet, maskade och kontext null; ingen bild alls: `bilder = 'saknas'` |
| Växeln | Developer-lådan (`?debug`): *Share pictures of cards I correct*, läser/skriver `improve_pictures` + `improve_pictures_at` (`Moln.bildInstallning`, `Moln.sattBildInstallning`, `Moln.bildInstallningSedan`) |
| Prov | `node dev/rapport/prov-b.cjs` (ringen 30 min accelererat, rapportens bilder, rättelserna av/på/av, växeln), `node dev/rapport/prov-b-uppspelaren.cjs --bilder <mapp>` (golden-video → ringen → hamta → uppspelaren), `node dev/rapport/prov-b-supabase.cjs <fil>` (rad + filer mot riktiga Supabase, hamta, städning) |

### Var kortet låg: ruta, maskade och kontext.jpg (uppföljning av MES-366/368)

Facit ska säga **vilket kort** som rättades, också i en hög — annars kan en modell tränas på grannens bild.
**Spårens namn i stillbilderna är aldrig facit**: de är telefonens gissningar (spår 63 i R-0009 bar namnet
Shock på fel kort). Facit är bara spelarens rättelser (`rattelse.json` → `ratt`) och spelarens ord.

| Fält | Vad | Varifrån |
|---|---|---|
| `ruta` | spårets låda i kamerabilden: `{x, y, w, h}` i andelar (som stillbildernas spår) + `bild {w, h}` (analysbildens mått) + `kalla` | `'beskarning'` = exakt den låda läsningens beskärning skars ur (beskärningen = lådan + 8 % marginal, −90° när den ligger); `'bordet'` = datorns senaste bord när telefonen inte svarade (bild null); `'stillbild'` = spårets ruta i en stillbild (`--spar`) |
| `maskade` | de lådor som målades grå i beskärningen — korten som ligger ÖVER spåret — med `spar` (null om inget spår hade lådan) | appens `maskaTackt` (t.tackt, en analyspixel större åt alla håll); spåret = det vars låda har IoU ≥ 0,5, samma regel som bordets `under`. `[]` = inget ovanpå, `null` = okänt |
| `kontext.jpg` | ringens bild av bordet närmast beskärningen i tid (uppskalad till 720 px), spårets ruta röd, de maskade grå och streckade; `rattelse.json.kontext` = `{t, w, h, ruta, maskade}` i den bilden | telefonen, när rättelsen sparas (ur ringens JPEG, aldrig ur videon); saknas när telefonen inte svarade eller inte hade spåret i ringen |
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
Utsnittet och kontexten ritas av `dev/rapport/utsnitt.py` (Pillow i `~/.mesa/detektor-venv`, eller `MESA_PY`).

## Del C (MES-367): knappen, telefonens ark, Settings och samtycket

| | |
|---|---|
| Flaggan | `const RAPPORT_FOR_ALLA = false;` i Moln bredvid `VILLKOR_VERSION` (global spegel `RAPPORT_FOR_ALLA`, regeln `rapportYtor()` = `?debug` eller flaggan, samma som `Rapport.rapportPa`). Av: inga ytor, inga felrapporter. Go-live: `dev/diagnos/natt-2026-10-13/golive/golive.md` |
| Konto och spärr | `#bildRad`/`#bildBox` (aldrig förbockad, låser aldrig knappen), `#startNytt` (What's new, bara spärren), ny finstilt rad. Valet följer Google-rundturen i `sthv.bilder` och skrivs i samma `updateUser` som villkoret (`Moln.godkannVillkor(bilder)`; samma värde skrivs inte om) |
| Settings | Home-menyn `data-hem="installningar"` → `Installningar.oppna()`: växeln (`Moln.sattBildInstallning`, B:s växel läses om), antalen (`Moln.rapportAntal`), *Delete my reports and pictures* (`Moln.raderaMinaRapporter`: test/träning-koderna i `raderingar` först, sedan alla filer under `<uid>/rapporter/` och alla rader, alla `kalla`) |
| Knappen | `#rapportKnapp` i spelets topprad, vänster om kamerapillret (`ritaRapportKnapp`, från renderMode): i ett spel, alla lägen, aldrig på telefonen. Öppnar A:s ruta |
| Telefonen | `#kamRapport` bredvid Disconnect → `TelefonArk` (ark nerifrån) → `Rapport.franTelefon`; kvittensen med koden, *Can't reach your computer* efter 10 s, `tak`, `nat`, `av` |
| Prov | `node dev/rapport/prov-c.cjs [--bilder <mapp>]` (steg i `dev/kolla.sh`): appens egna Moln-funktioner mot en attrapp av supabase-js (`fake-supabase.mjs`) med RLS-reglerna; allt annat nät stängt |

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

**Per parti, inte per kod.** Två rättelser av samma kort i samma parti, eller en rapport och en rättelse ur
samma parti, är nästan samma bild. Blir den ena test och den andra träning mäter provet att modellen minns
partiet — samma skäl som att detektorns spärr delar per inspelningstillfälle. Därför:

| | |
|---|---|
| Partiets nyckel | `parti: { game_id, spelkod }` i `fall.json`, bänkens `manifest.json` och `markning.json`. `game_id` ur tabellen (annars rapportens `miljo.spelId` eller bordsloggens `spel`); `spelkod` ur `rattelse.json`, rapportens `miljo.spel` eller bordsloggens `spelkod`. Ett pass utan rapport (`--mattest --logg`) bär ingen spelkod i bordsloggen: ge den med `--spelkod <kod>` (p1011: `--spelkod CNA43K`) |
| Samma parti | delar `game_id` **eller** `spelkod` (en återanvänd spelkod ger en vägran för mycket, aldrig en för lite) |
| Tabellen | `test`/`traning` vägras när en **annan rad** med samma `game_id` redan är på andra sidan (`till-fall.cjs` och `satt.cjs`). Frågas på både radens `game_id` och det den hämtade mappen bär: `satt.cjs` läser partiet ur `dev/diagnos/rapporter/<kod>/` (eller `--mapp`) när mappen finns, så att en rad utan `game_id` — telefonens rapporter, ett raderat parti (`on delete set null`) — ändå spärras per parti |
| Repot | vägras när en kopia ur samma parti ligger på andra sidan, också under en annan kod |
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

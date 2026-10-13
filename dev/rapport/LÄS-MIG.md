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
| `node dev/rapport/till-fall.cjs --mattest --logg pass.json [--orden o.tsv] [--lek lek.txt]` | samma för ett pass utan rapportkod (bordsloggen ur appen) |
| `node dev/rapport/prov-d.cjs [--bank-kor] [--tabell]` | provet för del D: syntetiska rättelser och en rapport i en tillfällig mapp, spärren åt båda hållen, bänken på bänkfallet, och (`--tabell`) satt/lista/spärren mot produktionens tabell med två provrader som tas bort efteråt |
| `node dev/rapport/prov.cjs` | provet: ett parti i huvudlös Chrome, fel, anrop, telefonens låda, rutans fem lägen, taket, hamta — utan nät och utan Claude |

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
`rapport_lada {id, t0}`; telefonen fryser sin låda och svarar med `tTel` (sin
klocka). Datorn mäter rundturen och sätter **offset = tTel − (t0 + t1)/2**;
varje telefonhändelse får `t = tTel_händelse − offset` (telefonens egen tid
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

- **Taket räknas på servern**: 20 rapporter och 50 felrapporter per konto och rullande 24 h; den 21:a
  vägras med `rapport_tak` och rutan visar *Today's limit*. `rapporter_idag()` säger antalet när rutan öppnas.
- **RLS**: spelaren lägger in, läser och raderar sina egna rader, och får uppdatera bara `storlek` och
  `bilder` (steg 2–3: koden finns först när raden finns). `raderingar`: inloggad lägger in, bara service role läser.
- **Felrapporter** (`kalla = 'fel'`): kodfel (`onerror`, `unhandledrejection`) och misslyckade anrop
  (5xx, inget svar), utan spelarens ord och utan bilder; felet och de senaste 20 handlingarna står i `vy`.
  Samma meddelande högst en gång per 10 min per sida. Skickas bara med `?debug` (del C: `RAPPORT_FOR_ALLA`).

## Kanalen (kontots egen, `kam:<user_id>`)

| Riktning | Meddelande (`typ`) | |
|---|---|---|
| dator → telefon | `rapport_lada {id, t0}` | frys din låda och din diagnosfil |
| telefon → dator | `rapport_lada {id, t0, tTel, del, delar, json}` | lådan, i högst fyra delar |
| dator → telefon | `rapport_bilder {kod, sokvag, id}` | ladda upp det du frös till `<sokvag>/` och `<sokvag>/bilder/` |
| telefon → dator | `rapport_bilder_klar {kod, antal, fel}` | raden får `bilder` klar / delvis (`saknas` om inget svar på 2 min eller ingen telefon) |
| telefon → dator | `rapport {id, text, tagg}` | telefonens ark (del C): datorn fryser och skickar |
| dator → telefon | `rapport_svar {id, kod}` eller `{id, fel: 'tak' \| 'nat'}` | |

## För del B, C och D

| Del | Kroka på |
|---|---|
| **B** | `Rapport.stillbilder = () => [{ namn, t, blob }]` på telefonen: anropas när datorn fryser, och bilderna laddas upp till `<kod>/bilder/` vid `rapport_bilder` (taket 15 MB, äldsta släpps). Rättelserna: en rad med `kalla: 'rattelse'` via `Moln.rapportRad` + `Moln.rapportFil` |
| **C** | `oppnaRapportRuta()` (eller `Rapport.oppna()`) från knappen i toppraden; telefonens ark: `Rapport.franTelefon(text, tagg)` → `{kod}` eller `{fel: 'tak' \| 'nat' \| 'dator'}` (`dator` = inget svar på 10 s: *Can't reach your computer*). Flaggan `RAPPORT_FOR_ALLA` läses av `Rapport` om den finns. Rutans position (under knappen) är C:s |
| **D** | byggd (MES-368): `till-fall.cjs`, `satt.cjs`, `sparr.cjs`, `prov-d.cjs` — se nästa avsnitt |

## Från rapport till något som mäter (del D, MES-368)

Utan det här steget är rapporterna en hög. Varje rapport blir **en** av fyra saker:

| Rapporten blir | När | Kommando | Hamnar i |
|---|---|---|---|
| **En fix** | felet syns i händelserna, felen eller bilderna och går att rätta | `satt.cjs <kod> fix`, sedan koden | — |
| **Ett fall i Mat test** | mattans beteende: dubbletter, hopp, fel plats, kort till handen | `till-fall.cjs <kod> --mattest` | `dev/mattest/underlag/rapporter/<kod>/` (`fall.json` + `bordlogg.json.gz`); `node dev/mattest/kor.cjs --fall <kod>` |
| **Ett bänkfall** | fel namn, missad remsa: en beskärning + rätt namn (en tyst rättelse) | `till-fall.cjs <kod> --bank` | `dev/remsa/rapportbank/` (`manifest.json` i `dev/embed/riktiga`-form); `~/.mesa/detektor-venv/bin/python dev/remsa/helkort_jamfor.py --bank dev/remsa/rapportbank dev/embed/modeller/mobileclip-s0-vision.onnx` |
| **Träningsdata** | bilder + rätt namn som inte ska vara prov | `till-fall.cjs <kod> --traning` | `dev/material/arbete/markning/rapporter-traning-mesa/<kod>/markning.json` i mark.py:s form (MES-340); `dev/remsa/tran/dataset.py` läser den |
| (inget) | inget att göra | `satt.cjs <kod> slangd` | `gallra.cjs` tar den efter 90 dagar |

`--bank` och `--traning` ur en vanlig rapport (inte en rättelse) kräver `--bild bilder/<fil> --ratt "<namn>"`:
vilken stillbild, och vilket namn spelaren sa. En rättelse av typen `borttaget` har inget rätt namn och blir
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
| Tabellen | `anvandning` är `test` eller `traning`, aldrig båda. `till-fall.cjs` sätter den **först** (service role) och skriver sedan; `--mattest`/`--bank` = test, `--traning` = traning. När den väl är test eller traning byts den aldrig — inte heller via `fix` eller `slangd`, annars går det att tvätta test → slangd → traning. `null`/`fix` → test/traning går; `slangd` → ett fall kräver `satt.cjs` först |
| Repot | koden får inte finnas på andra sidan: Mat test-underlaget och bänken mot träningsmaterialet. Håller också med `--lokal`, utan nät och om raden raderats |

Varje tyst rättelse är en egen rad med egen kod, så regeln gäller per rättelse. Säger spärren nej skrivs
ingenting och slutkoden är 3. Träningsmappen heter `rapporter-traning-mesa` så att `delning.py` dömer den
som träning; golden-lekens namn märks `utanfor_traning` och valideringens namn `val` som i mark.py.

### Facit för ett Mat test-fall: spelarens rättelser + orden

Utgångsläget är vad kameran gjorde med mattan (rapportens `slag: 'matta'` utan `av: 'spelare'`), eller, för
ett pass utan rapport, kamerans påståenden ur bordsloggen (säkert namn på ett spår = utspel, spåret borta =
borttaget, samma namn på ett nytt spår inom 8 s = flytt). **Det spelaren ändrade är det rätta och vinner:**

| Spelaren | Facit |
|---|---|
| byter namn | kortet hette det nya namnet hela tiden |
| tar bort ett kort kameran lade dit medan ett med samma namn redan låg där (eller snabbvalet *A card appeared that I didn't play*) | utspelet stryks: en dubblett |
| tar bort något annat | borttaget (kameran missade det) |
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
         --lek dev/rapport/pass-2026-10-11/lek.txt --orden dev/rapport/pass-2026-10-11/orden.tsv
    node dev/mattest/kor.cjs --fall p1011 --detalj p1011

Fall ur rapporter har `slag: 'rapport'`, räknas per fall och inte i Mat tests totalt, och får måttet *Kort som
inte blev något* (ett oframkallat kort eller en platshållare som stod ≥ 3 s och försvann utan att ett kort tog
över — dubbletten "som inte kunde identifieras").

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

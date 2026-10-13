# Natten 2026-10-13: problemrapporten A, B, D och C (MES-365, 366, 368, 367)

Orkestrerad session (Opus 5.5, high), 00:52–ca 05:00. Allt byggdes staplat på grenen `natt-rapport` och slogs
ihop med main i ett svep när grinden höll. `RAPPORT_FOR_ALLA = false` på main: allt syns bara med `?debug`.
Go-live ligger på grenen `mes-367-golive` (pushad, inte ihopslagen).

## Vad som gick in

| Steg | Issue | Commits (på natt-rapport) | Granskningar | Läge |
|---|---|---|---|---|
| A | MES-365 svarta lådan, rapportrutan, uppladdningen | a85dfae · rättelse 9b5dc0f · rättelse 2 fa7db66 | 0 ❌ → 0 ❌ (6 ⚠️ rättade, sedan 2 till) | Redo att testas |
| B | MES-366 stillbilderna, de tysta rättelserna | db72dd7 · rättelse e3c7be8 · rättelse 2 16ac4dd | 0 ❌ → 0 ❌ (5 ⚠️ rättade, sedan beskärningens storlek) | Redo att testas |
| D | MES-368 rapport → Mat test-fall/bänk/träning, spärren | d733763 · rättelse f00d3bb · rättelse 2 e22678d | 1 ❌ (spärren per kod) → 0 ❌ → 0 ❌ | Redo att testas |
| C | MES-367 samtycket, Settings, knappen, flaggan | 21b2fba · rättelse c7f6991 · rättelse 2 ed05620 | 1 ❌ (Delete fastnade) → 0 ❌ → 0 ❌ | Redo att testas |

Plus: sammanslagningar ef0eea1, 1a44407 (konflikt löst för hand: två `Moln.rapportRadera`), 308b16b, c282947,
provrättelsen f444ac2 (C:s `const RAPPORT_FOR_ALLA` skuggade prov-b:s flagga), och main f2cb97c (mattan-snabbare)
som D tog in.

**Supabase (rtoejcafnssypnysjmey), alla körda med apply_migration:**
`20261013090000_rapporter.sql` (tabellerna `rapporter`, `raderingar`, sekvensen, taken i en trigger, RLS),
`20261013150000_rapporter_tak_rattelse.sql` (rättelser 500/24 h, `vy` < 64 kB, `raderingar` bara egna koder),
`20261013170000_raderingar_unik_kod.sql` (unique(kod)). Tabellerna är tomma efter alla prov.

## Måtten

| Mått | Resultat |
|---|---|
| Golden, alla 18, utan `--ai`, ko.sh port 8311, pool 171, på ed05620 | **97/119 rätt namn, 0 fel namn, 1 falsk (+2 token)** — LIKA BRA i alla fyra satser |
| Latensen i samma körning | fördröjning till namn i videotid oförändrad (07 0,55 · 10 0,6 · 13 0,4 · 18 0,9 s); beräkningstiden lägre än main-körningen 10-12 |
| Stillbildsringen (B:s DoD 3) | steg/s lådan på/av på golden 13 och 18: inom bruset (load 5–9, samma läge skilde 18 % mellan omgångar). Direkt mätt i Chrome: stegets tid median 0,0 ms (p99 0,2), kodningen 2,2 ms/bild utanför steget. Golden kör ringen PÅ (`STILLBILDER_PA`), så golden ovan mäter kostnaden efter go-live |
| `dev/kolla.sh` på ed05620 | slutkod 0, alla steg gröna (nya steg: `prov.cjs`, `prov-c.cjs`) |
| `dev/avstamning.cjs` | 337 OK, 0 FEL |
| Mat test `--jamfor` | gamla fallens rader oförändrade; nytt fall p1011 (passet 2026-10-11) fäller på kvällens kod (cf4eb2d: Fel till handen 0 → 2, Kort som inte blev något 0 → 1), 0 på dagens |
| Rapportproven | prov.cjs 52/0, prov-b 43/0, prov-c 86/0, prov-d allt OK |

## Vad som backades

Inget. Inga golden-försämringar, så ingen mätning med lådan av behövdes före en backning.

## Beslut jag tog i natt (Jesper kan säga emot)

- **Spärren test/träning gäller per parti** (game_id eller spelkod), inte per kod — samma regel som detektorns
  spärr (MES-288). Strängare än issuens "per rättelse".
- **Rättelserunda för B parallellt med A** och C startad före B:s rättelse, för att hinna före 07:00. Konflikterna löstes vid sammanslagningen.
- **Ringen, beskärningarna och rättelserna är grindade bakom `?debug || RAPPORT_FOR_ALLA`** tills go-live (granskningens fynd: de kostade telefonen minne och en `getUser` per rättelse för en funktion ingen kunde använda).

## Texter som avviker från README:n (C)

- Settings efter Delete följer README (*3 reports and 41 card pictures were deleted. …*), inte tavlan L9-Settings (*Your reports and pictures were deleted.*).
- Egna texter där README saknar: *Couldn't save. …* (växeln), *Couldn't delete everything. …*, *Couldn't count what you have sent. …*, *Deleting. This takes a few seconds.*, telefonens *Reports are turned off on your computer.*, *On.* när datumet saknas.
- README §9 ändrad av C:s rättelse (telefonens ark): datorn svarar `mottagen` direkt, *Sending* kan stå upp till 60 s, *Try again* skickar samma id och ger aldrig en ny rad; 60 s utan kod efter `mottagen` → *Couldn't send* (inte *Can't reach*).
- Sign out fick tavlans ikon för alla, också med flaggan av.

## Kvar efter två rättelserundor (inga ❌)

- C ⚠️: en rapport som redan var på väg > 30 s när Delete började kan raderas och ändå visas som skickad; pausen under Delete har inget eget tak om ett anrop aldrig svarar.
- B ⚠️: kodningen blockerar huvudtråden upp till ~34 ms i Chrome (utanför steget); på iPhone (WebKit) är den omätt — mät glappet mellan stegen med ringen på/av i telefonprovet.
- A 🟡: taket räknar bara rader som finns kvar (insert → delete → insert går runt det; C:s Delete kräver delete); Cancel skriver koden i `raderingar` också när ingen kopia finns (brus i `lista.cjs --raderade`).
- D 🟡: spärren när båda raderna saknar game_id och ingen kopia finns i repot; flyttens facit-tid i p1011 är namnets tid.
- Sekvensen `rapporter_nr` är förbrukad till 1 (provet): första riktiga rapporten blir R-0002. `setval` nekades för byggaren; kör `select setval('public.rapporter_nr', 1, false);` om det spelar roll.
- Allt mot riktig inloggning (Google), RLS och storage med en spelares token, och riktig telefon är oprovat — proven går mot attrapper och service role.

## Väntar på Jesper

1. **Redo att testas** (MES-365, 366, 367, 368 — vad som ska provas står i varje issue).
2. **`mes-367-golive`**: fyll i `[CONTROLLER NAME]`, `[CONTACT EMAIL]` och `[DATE]` (privacy.html, terms.html, och samma datum i `VILLKOR_VERSION`), läs privacy-texten, slå ihop. Då får alla konton *Before you continue* och ytorna syns för alla.

## Tak som nåddes

- Inget byggar- eller granskartak nåddes. Golden kom igång direkt (ingen kö).
- `timeout` finns inte på macOS: uppvärmningen föll med kod 127 första gången; vakterna gjordes med `perl -e 'alarm …'`.
- Första uppvärmningen av profilen gav poolen 30 kort (Scryfall 429) — andra gav 171.
- kolla.sh på c7f6991 stoppades efter att worktreen snabbspolats mitt i körningen; kördes om på ed05620.
- Två kolla.sh samtidigt (två rättelsebyggare) fick `kamerabank` att hänga > 10 min hos dem; kolla kördes därför bara av orkestreraren på de sammanslagna träden.

## Krockar

Sessionen *Kortspelsklient* (worktree `mattan-snabbare`) svarade inom 2 min med sina funktioner; ingen byggare
rörde dem, och dess commit f2cb97c gick in utan konflikt. Sessionen *Insamling och träning av rättade kort*
fanns inte bland sessionerna (ListAgents 00:52), så ingen att fråga om B:s rättelser.

Harnessen flaggade B-byggaren för *Modify Shared Resources* (troligen försöket med `setval` mot produktionens
sekvens, som nekades). Kontrollerat efteråt: inga rader, filer eller kontofält kvar.

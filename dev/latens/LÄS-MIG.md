# Latensmätningen — vad som mäts, var i koden, och vad som inte är provat

Latensrapporten svarar på frågan i MES-237: **märks väntan?** Den mäter tiden
från att handen släpper ett kort tills datorn har ritat det, per händelse och
per kort. Panelen heter *Latency* i kameradialogens debugdel och finns bara
med `?debug`. Filen den sparar läses med `node dev/latens/analys.cjs <fil>`.

Hur du **läser** en rapport står i `dev/golden/SNABBGUIDE.md`, avsnittet
*Läsa rapporten mot målen (MES-242)*. Den här filen är för den som ska
**ändra** mätningen, och för den som undrar vad som ännu inte är bevisat.

## Mätpunkterna och var de sätts

Allt ligger bakom `latens` (telefonen, `Kamera.satLatens`, på med `?debug`)
eller `DEBUG` (datorn). Är `?debug` av sätts ingen stämpel och ingenting i
kedjan ändras.

### Telefonen — modulen `Kamera` i `index.html`

| Stämpel | Var den sätts | Betyder |
|---|---|---|
| `bild` | `stampla()` | rutan som beslutet bygger på ritades av (`bildTid`, satt i steget) |
| `hittat` | `fodSpar` | spåret föddes |
| `rorelse` | `rorde()` — anropas i `matcha` när mitten flyttat mer än `stillaPx`, när regionen växt ihop med en hand (`vuxen`), och när spåret är skymt | **sista rutan spåret rörde sig** ≈ när handen släppte, ± en ruta |
| `<vad>Ror` | `stampla()` fryser `rorelse` när stämpeln sätts | släppet som hör till just den händelsen |
| `stilla` | steget, när `stillaMs` gått, eller när den tidiga läsningen startar | kortet ligger stilla |
| `skugga` | `rapportera()`, första gången `skuggklar(t)` är sant utan namn | telefonen säger "det här har ett korts mått" — datorn ritar platsen då |
| `namn` + `namnVag` | **alla vägar**, se nedan | kortet är säkert namngivet |
| `tap`, `lage` | `matcha` respektive `sattVila` | kortet vreds, kortet flyttade |
| `borta` | `matcha`, när `tomMs > bortaMs` | spåret släpptes; raden ligger i `bortaTs` |
| `las[]` | `lasLogg()` i `identifiera` och `spekulera` | en läsning: start, ms, om den blev säker, och `tider` ur `kamIdentifiera` |
| `fraga` | där `cb.fragaAI` anropas | frågan till Claude gick i väg |

**Namnvägarna** — varje ställe som gör ett spår säkert stämplar med sin väg:

| `namnVag` | Var |
|---|---|
| `lokal` | `kamIdentifiera`-svaret i `identifiera`, och `bekraftaSpek` (tidigt svar, sätter även `namnTidig`) |
| `ai` | `svarAI`, ett kort |
| `klunga` | `svarAI`, flera kort — nya delar ärver klungans `ts` |
| `dubblett` | `dubblettAv` (spåret är samma kort som ett annat; `namnSom` bär namnet) |
| `helbild` | `tillampaHelbild`: eget spår, spår ur förra helbilden, och nytt spår |
| `hand` | `namnge` (granskningen eller ett foto) |
| `okand` | **uppsamlaren i `rapportera()`**: ett säkert spår utan namnstämpel. Syns den i en rapport har någon väg glömt att stämpla — laga den, siffrorna ljuger annars i tysthet |

Läsningens delar (`tider`) sätts i `kamIdentifiera` som tidpunkter **mellan**
satserna, så att raderna med modellen och ORB kan ändras utan att röra
mätningen: `modell` (Embed:s egen tid), `orb` (resten av bildvägen),
`orb2` (andra åsikten), `titel`/`titelVant` (titelraden och väntan på den),
`vand`. Stegtiden samlas som histogram (`stegHist`, 4 ms per fack) och
telefonens hälsa bär `ua`, `steg` och `bat`.

### Datorn — `LatensDator` i `index.html`

`bord()` gör rader av nya stämplar, `platser()` fångar när `autoPlatser`
först ritar en plats (det är skuggans `ritat`), `rader()` räknar om
telefonens tider till datorns klocka med förskjutningen ur pingen och sätter
`slapp` och `fran_slapp`. Summan räknas av de **rena funktionerna**
`latensSumma` och `latensMal` mellan markörerna `const LATENS_HANDELSER` och
`/* ── slut: LATENSSUMMAN ── */` — `dev/latens/analys.cjs` plockar ut exakt
det blocket, så app och skript kan aldrig räkna olika.

`fran_slapp` får vara **negativt**: blir namnet klart innan kortet låg still
räknas släppet från `stillaRor`, och andelen hamnar i `summa.namn.fore_slapp`.

## Vad som INTE är provat på riktig telefon

Allt nedan är mätt i bänken (150 prov) och i golden, aldrig i ett riktigt
parti. Telefonpasset (~10 min) ska titta efter just det här:

| Att kontrollera | Vad som är fel om det inte stämmer |
|---|---|
| **Kommer det rader alls?** `summa.namn.n` och `summa.tap.n` över noll | telefonen kör en äldre Mesa, eller `?debug` saknas där — hälsokollen säger till |
| **Är någon `vag` = `okand`?** | en namnväg glömmer att stämpla; siffrorna är då för bra |
| **Är `fran_slapp` rimlig?** tap och flytt bör ligga på tiondelar, inte sekunder eller negativa tal | `rorelse` sätts på fel ställe — den bygger på att handen syns som rörelse eller skymning, och det är bevisat i bänken men inte mot en riktig hand |
| **Skuggans rader:** har `skugga` både `via: plats` och några `kalla: dator`? | platsritningen fångas inte, och "något syns" mäter då bara namnet |
| **Klockan:** `klocka.rtt` under \~100 ms | förskjutningen mellan telefon och dator är osäkrare än de tider vi mäter |
| **`telefon.steg`** | stegtidens histogram är aldrig läst från en riktig telefon |
| **`telefon.batteri`** | `null` på iPhone (Safari ger den inte) — det är väntat, inte ett fel |

Rapporten kan alltså vara rätt byggd och ändå mäta fel, om `rorelse` inte
motsvarar en riktig hand. Det är den enda verkligt öppna frågan.

## Mätvärden som inte står någon annanstans

De två rapporterna från 2026-09-19 (MES-238), räknade med `analys.cjs`:

| | 4K · 15 | 1080p · 30 |
|---|---|---|
| namn, telefonens beslut → ritat (median) | 167 ms | 110 ms |
| namn, från att spåret hittades (median) | 912 ms | 2 575 ms |
| namn, från stilla (median) | 521 ms | 2 008 ms |
| tap / flytt / borta, beslut → ritat | 98 / 103 / 97 ms | 97 / 100 / 101 ms |

Måtten "från släppet" är **omätta** i båda — filerna är äldre än MES-242.
Det är därför telefonpasset behövs.

## Fällor, för den som bygger vidare

| Fälla | Vad som hände, och vad man gör |
|---|---|
| **Bänken har ingen video** | `bildTid` är 0 där, så prov som jämför ruttider gick igenom på nollor utan att mäta något. Lösningen är `rutTid()` (faller tillbaka på klockan). **Varje ny tidsstämpel ska provas i bänken för att den inte är noll** |
| **Webbläsarpanelen är en dold flik** | `requestAnimationFrame` körs inte och timers stryps, så `ritat` blir `null` och nätet ser ut att ta sekunder. Prova `LatensDator` med `requestAnimationFrame = cb => setTimeout(cb, 0)` och stubbade `Moln.sandKam` och `inspSpara` |
| **Golden fall 09 är en knivsegg** | samma kod ger 34/57 och 35/57 beroende på maskinens belastning (MES-249). Jämför alltid före/efter på samma dator i samma belastning, och läs raden `Poolen: N kort` (hel = 114, MES-260) |
| **En gren kan redan vara ute** | en annan session slog ihop och pushade det här arbetet och flyttade grenen under tiden. Kör `git branch -r --contains <commit>` innan du tror att något ligger opushat |
| **Bänken efter en sammanslagning** | en gren som var grön för sig föll i SM5/SM6 när den slogs ihop. Kör `dev/kolla.sh` på **resultatet**, inte bara på varje gren |
| **`git reset --hard` är spärrad** här, och `git stash` delas med alla arbetsträd | backa en sammanslagning med `git revert -m 1 <merge>` |
| **Bänken tar en fil som argument** | `node dev/kamerabank.cjs <sökväg/index.html>` provar en annan grens fil **utan att slå ihop den**. Snabbaste sättet att verifiera någon annans rättning |

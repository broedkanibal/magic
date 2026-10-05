# Spec: märkningen av pass 2, 3 och 5 — namn ur 4K, beskärningar i telefonens kvalitet (2026-10-05)

Bakgrund: `dev/plan/handover-2026-10-05-bildmodell-riktiga-inspelningar.md` (läs *Beslut*, *Kedjan i appen*
och *Fällor*). Manuset för klippen: `dev/plan/inspelningar-traning-2026-10.md`. Ingen Linear-issue finns för
det här — den här filen är uppdraget.

## Vad som ska finnas när det är klart

Ett skript, `dev/remsa/tran/mark.py` (Python, `~/.mesa/detektor-venv/bin/python`; node för detektorns parning
och för textläsaren), som ur ett 4K-klipp ger:

1. **`detektioner.json`** — detektorns lådor på var 6:e ruta (5 rutor/s), i 4K-bildpunkter. 4K avkodas **en**
   gång per klipp; allt efter läser JSON.
2. **`markning.json`** — spåren (ett per kortläge), lägg-ögonblicket, namnet med två vittnen, domen, och varje
   sparat läge (låda, remslåda, stilla, hand, synlig andel, liggande, i hög, vinkel).
3. **Beskärningar** per spår och läge: `hel` och `remsa`, i utsnitten `app` och (när vinkeln är 10–40°) `rata`,
   i upplösningarna `4k` och `1080` (1500k-varianten kommer i ett senare steg). JPEG kvalitet 95.
4. **`tidpunkter.json`** — lägg-ögonblicken och högarnas intervall per klipp, åt detektorspåret (inga rutor).
5. **`rapport`** — en tabell per klipp och per pass: antal spår, säkra, osäkra, slängda, och varför.

Allt skrivs under `dev/material/arbete/markning/<passmapp>/<klipp>/` (gitignorerat; disk, inte git). Koden
och den här specen är det enda som går in i repot.

## Steg A — detektioner (en 4K-avkodning per klipp)

- Öppna klippet med cv2 (läser HEVC-MOV; 56 ms/ruta full avkodning, 19 ms/`grab()`). Gå sekventiellt, `grab()`
  alla rutor, `retrieve()` var 6:e (`--steg 6`). `--fran`/`--till` i sekunder begränsar (provet: 0–30).
- **Spärren först:** `from delning import krav_traning` (`dev/detektor/delning.py`) på klippets sökväg innan
  något läses. Realpath prövas också — en symlänkad `dev/material` ska gå igenom, en golden-fil ska stoppa.
- Detektorn: `dev/detektor/modell/yolox_nano_mesa_960x544.onnx` med `forbehandla` ur `dev/detektor/tran/prov.py`
  (960×544, fyllning 114). Råa utdata (n×8 float32) per ruta till en tillfällig fil, och **appens egen avkodning
  och parning** via `node dev/detektor/modell/para_cli.cjs <manifest> <ut>` (som `remsfall.py` gör) — så att lådorna,
  remsorna och paren är exakt de appen får. Räkna tillbaka till 4K-bildpunkter (`r` i manifestet).
- Spara per ruta: `t` (s), `kort` (efter NMS), `remsor`, `par` (kortlåda + dess remsa + klass kort/baksida + poäng).
- Spara också ett **rörelsemått** per ruta och kortlåda, så att steg B slipper bilden: för varje parad låda,
  medelvärdet av |ruta − föregående provade ruta| i gråskala efter 5×5-sudd, inuti lådan (+ 10 % marginal).
  (Sensorbruset i lampljus är ~3 gråsteg, MES-246.)

## Steg B — spår och lägg-ögonblick (bara JSON)

- **Spår** = samma kortlåda ruta för ruta: IoU ≥ 0,5 mot närmast föregående provade ruta, eller centrum inom
  15 % av kortsidan och lådan innesluten i den gamla till ≥ 70 % (kortet blir täckt i en hög — lådan krymper till
  det synliga, spåret lever vidare). Ett spår slutar när ingen låda matchar i 1 s. Ett kort som lyfts och läggs om
  blir ett **nytt** spår och får ett eget lägg-ögonblick.
- **Stilla** = lådans centrum rör sig < 1 % av kortsidan och rörelsemåttet < 4 gråsteg sedan föregående prov.
- **Lägg-ögonblicket** för ett spår: den första provade rutan som uppfyller **allt**:
  - spåret har varit stilla i ≥ 0,5 s (≥ 3 prov i rad),
  - lådan har kortets form (långsida/kortsida inom 7 % av 88/63 = 1,40; tappad eller stående spelar ingen roll)
    — annars ligger en hand kvar eller kortet är redan täckt,
  - spåret har en remsa i paret (`par[].remsa`),
  - rörelsemåttet är < 4 både mot föregående och nästa prov.
  Finns ingen sådan ruta de första 3 s → spåret får inget lägg-ögonblick (`orsak: 'ingen stilla helbild'`) och
  inget namn ur 4K, men följs ändå (det kan få namn ur ett tidigare spår, se D).
- **En remsa, ett kort:** om två levande spår gör anspråk på samma remslåda (IoU ≥ 0,5) hör den till det spår vars
  överkant ligger närmast remsan. Det andra spåret saknar remsa i den rutan. Aldrig samma remsa till två spår.
- **Lägen att spara** per spår (för beskärningarna i E): lägg-ögonblicket, sedan var 3:e sekund medan spåret lever,
  plus första provet efter varje förändring (liggande/stående byter, synlig andel ändras > 15 %, hög börjar).
  Högst 10 lägen per spår. Varje läge bär: `t`, `lada`, `remsa`, `stilla`, `rorelse`, `synlig_andel`
  (lådans yta / klippets median för ensamma helkort), `liggande` (w > h), `i_hog` (överlappar ett annat levande
  spår IoU > 0,2), `vinkel` (ur remsans form, `remsnamn.vinkel_ur_lada`, med lutningens tecken ur bilden som
  `remsnamn.rata`; `null` om ingen remsa).
- **Högar till detektorspåret:** `tidpunkter.json` = `{lagg: [{spar, t}], hogar: [{t0, t1, spar: [...]}]}`.

## Steg C — namnet i 4K, två vittnen

Vid lägg-ögonblicket avkodas rutan på nytt i 4K (en `seek` per spår, ~1,3 s). Ur den:

**Vittne 1 — textläsaren** (tesseract.js, samma som appen och `dev/remsa/ocr.cjs`): titelbandet ur remslådan,
vågrätt (vrid som `remsnamn.skar`: stående remsa → 90°, nedre halvan → 180°), tre band 10 % av kortets höjd vid
2/5/8 % ned (som `ocr_export.py` `namnrad`), skalade till 64 px höjd, högst 4×. Kör `ocr.cjs` med ett manifest där
`lek` är **Scryfalls hela namnlista**; `facit` är `null`. Säker läsning = poäng ≥ 0,6 **och** marginal ≥ 0,2 till
näst bästa namn (appens `sakertNamn`).

- Namnlistan: `dev/remsa/tran/namn.py` hämtar Scryfalls bulk `oracle_cards` en gång (User-Agent som i
  `mesa_remsa_tran.py`), tar `name`, `layout` och `card_faces[].name`, och skriver
  `dev/material/arbete/markning/scryfall-namn.json`. Tokens, emblem, art series, vanguard, scheme, planar och
  phenomenon tas bort (layout). Matcha OCR-texten mot **både** hela namnet och varje sidas namn, och svara alltid
  med Scryfalls **hela** namn (`Virtue of Knowledge // Vantress Visions`, inte framsidan).

**Vittne 2 — bildmodellen** (appens: `dev/embed/modeller/mobileclip-s0-vision.onnx`, receptet i
`dev/remsa/lib.py`: `Bildmodell`, `Referenser`, `kvadrat`, centrering) mot en **kandidatlek**:

- kandidatleken = alla namn textläsaren läst säkert hittills **i passet** (växer klipp för klipp — kör klippen i
  ordning 1, 2, 3) + basländerna (Plains/Island/Swamp/Mountain/Forest, upp till 24 konstverk var, `year>=2021`,
  som poolen) + **200 fasta slumpnamn** ur namnlistan (frö 1, utan golden-lekens namn) så att leken aldrig är liten.
  Textläsarens namn för det aktuella kortet läggs in **före** frågan.
- referensbilderna (Scryfall `normal`) hämtas vid behov till `dev/material/arbete/markning/ref/<id>.jpg`, 10
  frågor/s. Skarp + sudd × 0/90/180/270 som appen.
- fråga 1: hela kortet ur 4K-rutan, lådan + 8 % marginal, marginalen bortskuren före `kvadrat` (som
  `helkort_jamfor.py` / `kalibrering.utan_marginal`). Överens = samma namn överst som textläsaren och marginal
  > 0,11 till näst bästa namn.
- fråga 2: remsan (remslådan + 4 % marginal, 1920 på långsidan, vågrät; `remsnamn.skar` med `MARG` 0,04) mot
  remsleken (översta 14 % av samma referensbilder, 0/180 × skarp/sudd). Överens = samma namn överst och marginal
  > 0,20.

**Domen:**

| Dom | Villkor |
|---|---|
| `saker` | textläsaren säker **och** (fråga 1 överens **eller** fråga 2 överens) |
| `osaker` | textläsaren säker men modellen inte överens; eller textläsaren 0,4–0,6; eller modellen ensam säker |
| `slangd` | inget av vittnena ser något; eller ingen stilla helbild |
| `baksida` | detektorns klass `baksida` vid lägg-ögonblicket — namnet `baksida`, inget vittne behövs |

Spara för varje spår **båda vittnenas hela svar** (text, namn, poäng, marginal, näst bästa; modellens topp 3 med
poäng för hel och remsa, lekens storlek) — domen ska gå att räkna om ur JSON utan att köra om.

**Namn som inte får tränas** (`utanfor_traning: true` i JSON, **inga beskärningar skrivs**): golden-lekens
namn utom basland, ur `dev/golden/lek.txt` (`lib.las_lek()` minus basländerna). Tokens får aldrig namn (de står
inte i listan) och slängs.

**Validering på riktiga bilder:** vart femte **säkra** namn i passet (sorterat, frö 1) flaggas `val: true` och
beskärs till `val/` i stället för `tran/`. Basland är aldrig val.

## Steg D — namnet följer spåret

Namnet gäller alla lägen i samma spår (täckt, i hög, tappad). Ett spår utan lägg-ögonblick eller med dom `osaker`
får **inget** namn från något annat spår — ingen gissning ur grannen (MES-246: fem "tidiga" läsningar var grannens
land). Det blir Claude-frågan senare, en per spår, efter Jespers ja — bygg inte den nu, men spara `hel`-beskärningen
i 4K för lägg-ögonblicket (eller bästa stilla rutan) för `osaker`-spåren så att frågan kan ställas utan ny avkodning.

## Steg E — beskärningarna

För varje sparat läge i ett spår med dom `saker` eller `baksida` (och inte `utanfor_traning`), ur **samma** 4K-ruta:

| Typ | Utsnitt `app` | Utsnitt `rata` (bara när 10° ≤ vinkel ≤ 40°) |
|---|---|---|
| `hel` | lådan + 8 % marginal, rak (bord i hörnen), som `Kamera.beskar` | rutan vriden kring lådans centrum med vinkeln (tecknet ur bilden som `remsnamn.rata`), sedan kortets rektangel + 8 % |
| `remsa` | `remsnamn.skar` (4 % marginal, vågrät) | `remsnamn.rata` |

Titeldelen (vänstra 55 %) skärs **inte** ut — den tas ur `remsa` vid träningen.

Upplösningar, ur samma ruta: `4k` (som den är) och `1080` (hela rutan nedskalad till 1920×1080 med
`lib.skala_webb`, sedan samma lådor ÷ 2). Filnamn `<spår>-<t>-<typ>-<utsnitt>.jpg` under `tran/4k/`, `tran/1080/`,
`val/...`. Varje fil står i `markning.json` med sitt spår, läge, namn, typ, utsnitt och upplösning. Läge för läge
**exakt samma** låda i båda upplösningarna.

Disk: säg i rapporten hur många MB provet gav och räkna upp till hela passet. Hela märkningen (pass 2 + 3 + 5)
får ta högst 1,5 GB; drar provet iväg, sänk antalet lägen per spår (först) eller JPEG-kvaliteten till 90 (sedan).

## Steg F — rapporten

`mark.py rapport <passmapp>` skriver en tabell per klipp (spår · lägg-tid · textläsaren (namn, poäng, marginal) ·
modellen hel (namn, marginal) · remsa (namn, marginal) · dom · lägen · filer) och en summering per pass
(spår, säkra, osäkra, slängda, baksidor, utanför träning, val; andel säkra av spår med lägg-ögonblick), plus
en **montage-bild** `montage.jpg` per klipp: lägg-ögonblickets `hel`-beskärning i 1080 för varje spår med
namnet och domen skrivet under — det är stickprovet jag gör med egna ögon.

## Provet (det enda byggaren kör på 4K)

`pass 2 klipp 1`, sekunderna 0–30 (`--fran 0 --till 30`): tomt bord 0–3 s, sedan kort ett i taget. Väntat: ~8–10
spår, de flesta med lägg-ögonblick. Rapportera: antal spår, hur många fick lägg-ögonblick, textläsarens säkra,
modellens överens, domar, tid per steg, MB. **Kör inget mer på 4K** — hela pass 2 körs av huvudsessionen efter
granskningen. Kolla `pgrep -f "dev/golden/kor.cjs"` före varje körning; ger den träff, vänta.

## Fällor (ur handovern och minnet — alla gäller)

- Handen: en ruta med hand över kortet får aldrig bli facit → stilla ≥ 0,5 s, kortets form, remsa finns, rörelse < 4.
- Samma remsa, två kort: en remsa hör till ett spår (B).
- Lodräta remsor (tappade kort) vrids **moturs eller medurs efter var i kortlådan remsan sitter** (`remsnamn.skar`),
  aldrig alltid åt samma håll.
- Tesseract får aldrig hela 14 %-remsan (PSM 7 läser 0 av 1 332 där) — bara tunna band ~10 % av korthöjden.
- `dev/remsa/node_modules` (tesseract.js) måste `npm install`:as i din worktree; `dev/embed/modeller`,
  `dev/embed/cache` och `dev/material` är gitignorerade — **symlänka** dem från huvudträdet
  (`/Users/jesperfunk/Code/magic/…`). Byt aldrig ut `mobileclip-s0-vision.onnx`.
- Harnessen vägrar heredoc-python och `$VAR` som argument i worktrees — skriv riktiga filer och kör med absoluta
  sökvägar.
- Inga 4K-rutor på disk. Beskärningar, inte rutor. Scratchpaden töms vid omstart — allt tungt under
  `dev/material/arbete/markning/`.
- Varje steg läser föregående stegs JSON och körs **inte om** om utdata finns (`--om` tvingar). En regeländring i
  B–E ska aldrig kräva ny avkodning.

## Leverans

Gren i din worktree med `mark.py`, `namn.py`, ev. små ändringar i `dev/remsa/ocr.cjs` (bakåtkompatibla), en kort
`dev/remsa/tran/MARKNING.md` (hur man kör, vad filerna betyder, en skärm). Ingen golden, ingen Linear. Rapporten
tillbaka: högst 15 rader med provets siffror, gren och commit, vad som är oprovat.

## Ändring 2026-10-05 kväll: vittne 1 är Claude, inte textläsaren (provet avgjorde)

Provet (pass 2 klipp 1, 0–30 s): 7 lägg-ögonblick, textläsaren säker **0 av 6** — titlarna är ~14 px i 4K vid 0,5×
och 40 cm (kortet ~270 px brett), och tesseract läser inget där oavsett förbehandling. Ett 4K-utsnitt är ändå
fullt läsbart för ögat ("Adult Gold Dragon" i s002). Jesper har sagt ja till Claude-frågor (2026-10-05). Därför:

**Vittne 1 — Claude**, direkt mot Anthropics Messages-API (nyckeln `ANTHROPIC_API_KEY` ur `.env.local`, modell-id
som `MODEL` i `api/identify.js`, i dag `claude-opus-5`; **inte** appens systemprompt — den rörs aldrig, och det
här är ett annat ändamål). En fråga per spår, på lägg-ögonblickets `hel`/`app`-utsnitt i 4K (med 8 % marginal,
JPEG 95, som det redan sparas). Frågan: fotot visar ett Magic-kort; svara bara med JSON
`{"name": <exakt tryckt kortnamn eller null>, "back": <true om det är en kortbaksida>, "sure": <true/false>}`.
Svarar Claude null eller `sure: false`: **en** fråga till på nästa sparade läge med `synlig_andel ≥ 0,95` och stilla.
Högst två frågor per spår. Svaret normaliseras mot Scryfall-listan: exakt namn (gemener, apostrofer, ansikte →
helt namn); annars Dice ≥ 0,9 mot ett entydigt namn; annars `osaker`. Spara hela svaret och kostnaden
(in-/ut-token) per fråga i JSON; `rapport` summerar antal frågor och token per klipp.

**Vittne 2 — överens**, ett av två räcker:
- (a) **bildmodellen** som förut (kandidatleken = Claudes lästa namn hittills i passet + basland + 200 slumpnamn;
  Claudes namn läggs in före frågan): topp-1 för `hel` **eller** `remsa` = namnet. Ingen marginalgräns (det är
  ett vittne bland ~260 namn, inte appens dom); marginalen sparas.
- (b) **ORB** (som appens kontroll av topp 3, `MODELL_NAMN`): cv2 ORB + BFMatcher (Hamming, ratio 0,75) +
  `findHomography` RANSAC mellan 4K-utsnittet och Scryfalls `normal`-bild för namnet; överens när inliers ≥ 12
  **och** ≥ 2× det bästa av 20 slumpvalda andra referensbilder (frö = spårets nummer). Spara inliers för båda.

**Domen:** `saker` = vittne 1 ger ett namn i listan **och** (a) eller (b). `baksida` = Claude säger back **och**
detektorn klass baksida (eller modellen rankar `baksida` överst om leken har den). `osaker` = Claude gav ett namn
men varken (a) eller (b) — spara 4K-utsnittet i `osaker/` för huvudsessionens ögon. `slangd` = två frågor utan namn.
Tokens: Claude svarar oftast med ett namn som inte finns i listan (token-namn finns inte i oracle_cards) → `osaker`,
aldrig facit.

**Textläsaren** blir frivillig (`--ocr`), avstängd som förval; koden får vara kvar.

**Budget:** ≤ 2 frågor per spår; pass 2+3+5 ≈ 9 klipp × ~20 spår ≈ 200–350 frågor, ~1 cent styck. Provet igen:
samma 30 s, ur sparad JSON och de 4K-utsnitt som redan finns (ingen ny avkodning för C; E får söka upp rutorna
för de spår som blir säkra). Kolla golden-kontrollen före E.

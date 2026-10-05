# Märkningen: namnen ur 4K, beskärningar i telefonens kvalitet

Uppdraget: `dev/plan/spec-markning-2026-10-05.md` (med ändringen "2026-10-05 kväll": vittne 1 är Claude).
Koden: `mark.py` (stegen A–F) och `namn.py` (Scryfalls namnlista). Allt som skrivs hamnar under
`dev/material/arbete/markning/` (gitignorerat).

## Köra

```
PY=~/.mesa/detektor-venv/bin/python
$PY dev/remsa/tran/namn.py               # en gång: Scryfalls namnlista (oracle_cards)
$PY dev/remsa/tran/mark.py forbered      # en gång, bara nätet: 200 slumpnamn + basland + bilder
$PY dev/remsa/tran/mark.py pass dev/material/2026-10-04-traning-svartmatta-taklampa   # klipp 1, 2, 3 + rapport
$PY dev/remsa/tran/mark.py klipp <fil.MOV> --fran 0 --till 30   # ett klipp; ett utsnitt får egen mapp (_0-30s)
$PY dev/remsa/tran/mark.py tel <klippmapp>   # telefonens kvalitet efter E (pass/klipp: --tel)
$PY dev/remsa/tran/mark.py rapport <passmapp>
```

**Telefonens kvalitet (steg T):** klippet kodas om EN gång till `tel.mp4` — 1920 × 1080, H.264 1500 kbit/s
(`-b:v 1500k -maxrate 1500k -bufsize 3000k -preset medium -g 60 -pix_fmt yuv420p`, som golden 13/18), ingen
ljudström, varje källruta en utruta — med ffmpeg ur imageio-ffmpeg. Cachad i `tel.json` (storlek + källa).
Sedan skärs exakt de utsnitt E skrev i 1080 (samma lägen, samma lådor i andelar, samma vridning) ur
`tel.mp4` till `tran/tel/` och `val/tel/` — 1080 och tel är pixelparallella. En synkkontroll mot 4K-rutan vid
klippets mest rörliga prov bekräftar att tel-ruta j = källruta i0 + j. E gör tel inaktuell (`tel_beskar: null`).

Ett steg körs inte om när dess utdata finns: `--om B,C,E` (eller `--om` = alla) tvingar, och ett steg som
körts gör de följande inaktuella. 4K avkodas helt bara i A. C tar lägg-ögonblickets hel/app-utsnitt ur
`utsnitt/4k/` och avkodar bara det som saknas (`--utan-avkodning`: aldrig); Claudes svar cachas på utsnittets
innehåll, så en omkörning kostar inga nya frågor. E söker upp rutorna för de sparade lägena i säkra spår
(`--uppskatta`: mät också vad de osäkra skulle ta). `--ocr`: textläsaren som upplysning. Före varje 4K-steg
väntar skriptet så länge en node-process kör `dev/golden/kor.cjs`. Claude-nyckeln: `ANTHROPIC_API_KEY` ur
miljön eller `.env.local` (worktreet, sedan huvudträdet); modellen som `MODEL` i `api/identify.js`.

I en worktree: symlänka `dev/material`, `dev/embed/modeller`, `dev/embed/cache` från huvudträdet; `npm
install` i `dev/remsa` behövs bara för `--ocr`.

## Filerna, per klipp (`<pass>/<klipp>/`)

| Fil | Steg | Innehåll |
|---|---|---|
| `detektioner.json` | A | per prov (var 6:e ruta): kortlådor, remsor, par, rörelsemått mot föregående och nästa prov — 4K-bildpunkter |
| `spar.json`, `tidpunkter.json` | B | spåren, lägg-ögonblicken, lägena att spara; lägg och högar åt detektorspåret |
| `utsnitt/4k/`, `claude/svar.json` | C | cachen: hel/app-utsnitten i 4K (nyckel: ruta + låda) och Claudes riktiga svar (fel cachas inte) |
| `vittnen.json`, `markning.json` | C, E | Claude, (a) modellen, (b) ORB per spår; dom, namn, `utanfor_traning`, `val`, lägen, filer. `beskar: null` = E inaktuell |
| `tran/{4k,1080}/`, `val/{4k,1080}/` | E | `<spår>-<t>-<hel|remsa>-<app|rata|horn>.jpg`, kvalitet 95; `ur` i filposten säger `lada` eller `horn`. C tömmer dem; E skriver om |
| `tel.mp4`, `tel.json`, `tran/tel/`, `val/tel/` | T | telefonkodat klipp och samma utsnitt som 1080 ur det; filerna i `markning.json` med `variant: 'tel'` |
| `osaker/4k/`, `slangd/4k/` | C | 4K-utsnittet för osäkra och slängda-med-lägg — huvudsessionens ögon, inte träning |
| `facit-manuell.json` | (hand) | `{"<spår>": "<namn>" | null}` efter en titt på `osaker/4k` — namn ger `saker_manuell`, null slänger (också ett säkert); måste vara nyare än `spar.json` |
| `montage.jpg` | F | per spår: lägg-ögonblicket, det sista sparade läget och lägg-ögonblickets remsa ur hörnen, i 1080, med Claudes namn och domen |

## Domen

| Dom | När |
|---|---|
| `saker` | Claude ger ett namn i listan och **antingen** säker + (a) eller (b), **eller** osäker + (b). (a) = bildmodellens topp-1 är namnet (hela kortet; remsan räknas bara för icke-basland). (b) = ORB ≥ 12 inliers mot namnets konstverk och ≥ 2 × max(bästa av 20 slumpvalda, 6); för basland också mot lika många konstverk av de andra basländerna |
| `saker_manuell` | namnet ur `facit-manuell.json` (finns i listan); E skriver som för `saker` |
| `baksida` | Claude säger baksida **och** detektorns klass baksida (eller modellen har baksidan överst) |
| `osaker` | Claude gav ett namn men inget andra vittne som räcker, eller namnet är inte i listan / ett tokennamn; Claude sa `token: true`; eller namnet är en emblemtitel eller ett tokennamn (Basri Ket, Mordenkainen, Garruk, Unleashed) och Claude svarade inte uttryckligen `token: false` |
| `slangd` | Claude utan namn (högst två frågor), eller inget lägg-ögonblick |
| `ofragad` | Claude-frågan gav fel efter tre försök, eller utsnittet saknas — frågas igen nästa körning |

Namnet normaliseras: exakt (gemener, apostrofer; en sida → kortets hela namn), annars Dice ≥ 0,9 mot ett
entydigt namn; ett tokennamn ("Blood", "Treasure") blir aldrig ett kortnamn, inte heller via en sida.

**Tokens och emblem (frågan v2).** Claude svarar också `"token"`: true för en token, ett emblem eller annat som
inte är ett spelkort. Ett emblem bär planeswalkerns namn ("Basri Ket", Scryfall: "Basri Ket Emblem"), och ORB
och modellen godkänner det, eftersom konstverket är planeswalkerns (pass 3: klipp 1 s554, s964, s1584, s2105,
klipp 2 s700 blev säkra). `namn.py` skriver emblemens titlar (`emblem`; en äldre namnlista får dem ur
tokennamnen). Svar ur cachen på frågan v1 används: där är `token` okänt (None), och bara namn i
emblemtitel- eller tokenlistan kräver `token: false` — alla andra namn påverkas inte. C frågar om med v2
**bara** de cachade svar vars namn kräver `token: false` och som saknar fältet (pass 3: ~11 av ~400; sex av dem
är riktiga Garruk, Unleashed). Ger den nya frågan fel används det gamla svaret; ett v2-svar frågas aldrig om.
`dom_vittnen` i markning.json är vittnenas dom innan `facit-manuell.json`.
Claude får en egen kort fråga utan systemprompt — appens systemprompt rörs inte. E kontrollerar varje
läge där hela kortet syns med vittne (b):s regel mot lägg-ögonblickets konstverk; faller den skrivs inget
efter det senast godkända läget — inte heller täckta lägen däremellan (ett annat kort kan ha lagts exakt på
samma plats). E skriver först till `e-tmp/` och flyttar när kontrollerna är klara. Ofrågade spår gör att
`klipp`/`pass` kör C igen av sig själv.

## Remsorna ur kortets hörn (`remsor_ur: 'horn'`)

Detektorns remslåda i en hög låg på det bakersta kortets remsa: stickprovet i pass 2 (klipp 2 s198, s330,
klipp 1 s323) visade "Plains" på kort som var Mountain. Därför:

| Del | Regel |
|---|---|
| Fyrhörningen (C) | ORB mot det **namngivna** kortets konstverk (domens namn, annars Claudes), för alla spår med namn. ≥ 12 inliers och sund: konvex, yta 0,6–1,4 × klippets ensamma kortyta, sidförhållande inom 15 % av 88/63, överkantens hörn inom lådan + 10 % och minst halva fyrhörningens låda inom lådan. Sparas som `horn4k` (ordning som `dev/detektor/remsa.py`: 0 → 1 = överkanten); `horn_varfor` säger varför den saknas |
| Remsan (E) | bara ur fyrhörningen: översta 14 %, 4 % marginal, rätad och liggande (`-remsa-horn.jpg`). Alla lägen (också lägg-ögonblicket): samma fyrhörning, och bara när remsbandet ligger inom lägets låda ± 2 % av kortsidan. Ingen fyrhörning → inga remsor. Detektorns remslåda finns kvar i JSON som information |
| Remsvakten (E) | låg detektorns remsa på hörnremsan i lägg-ögonblicket ska den ligga kvar där i varje senare läge — minst halva remsan inom bandet ± 2 % av kortsidan (`remsvakt_horn`); annars skrivs inget från det läget (`horn_stopp`) |
| Hela kortet (E) | ur detektorns låda bara när den är kortformad (± 7 %) och IoU ≥ 0,8 mot fyrhörningens låda; annars ur fyrhörningen (lådan + 8 %, `ur: 'horn'`). Utan fyrhörning bara om lådan är kortformad och synlig andel ≤ 1,15. Täckta lägen följer B:s hörnstyckesregel som förut |
| Gammal markning | E vägrar en `markning.json` utan `remsor_ur: 'horn'` — kör om från C |

Avvikelser från granskningens ordalydelse, och varför:

- **Likformighet i stället för homografi** (`cv2.estimateAffinePartial2D` på samma ORB-matchningar, ≥ 12
  inliers): mot ett annat konstverk av samma namn (basland) gav den fulla homografin sneda fyrhörningar —
  s323 fick överkanten 16° fel. Kameran ser korten uppifrån, så vridning + skala + förflyttning räcker.
- **"Hörnen inom lådan + 10 %" gäller överkantens två hörn**, plus att minst halva fyrhörningen ligger i
  lådan. I Jespers högar ligger detektorns låda över högens remsor och det översta kortets nederkant sticker
  ut 100–120 px under den (s198, s330); den bokstavliga regeln underkände just de kort den skulle rädda.
- **Remsvakten mäter andelen inom bandet, inte "inom ± 2 %".** Detektorns remsa och hörnbandet är två mått
  på samma titelrad: i pass 2:s lägg-ögonblick, på de 42 spår där detektorns låda är kortet, skiljer kanterna
  upp till 6,6 % av kortsidan (detektorns remsa sitter ~3 % högre). Bokstavligt ± 2 % stoppade 36 av 50 spår.
  Andelen inom bandet är 0,63–1,00 på kortets egen remsa och 0,00–0,20 när remsan satt på ett annat kort i
  högen. Vakten gäller bara spår vars detektorremsa låg på bandet vid lägget; i högar (s198, s330) satt den
  redan då på ett annat kort och säger inget om vårt — där vaktar B:s regel mot lägg-remsan, ORB-kontrollen på
  hela kortet ur hörnen och kravet att bandet ligger i lägets låda.
- **Bandet inom lådan ± 2 % också i lägg-ögonblicket**, så att ett läge med samma låda som lägget får samma
  svar (med 0 bildpunkter: 41 i stället för 47 av 50 lägg-remsor i pass 2).

## Där koden preciserar specen

- **Spårningen:** ett spår fortsätter bara på samma låda (IoU ≥ 0,9), en krympt (inom den förra med högst
  2 % av kortsidan utanför OCH ytan ≤ 0,85 — kortet blir täckt) eller en som växer tillbaka till spårets
  egen helbild (IoU ≥ 0,9). Allt annat är ett nytt spår — annars tog det undre kortet i en hög över det
  övres låda och namn (granskningarna, sim_hog.py och gr2/sim2–5.py).
- **Basland:** ORB jämför mot alla unika konstverk (alla år, alla ramar, ~390 per typ, 1 952 bilder) —
  Jespers land är andra tryckningar än poolens; bildmodellen (a) jämför mot appens pool (≤ 24 per typ,
  year ≥ 2021), annars lutar topp-1 mot basland. `lek_a` i JSON säger vilken lek (a) använde.
- **ORB efter kontrastutjämning (CLAHE)** på fråga och referens: utan den 0 inliers på provets mörka och
  blänkande kort; med den 14–52 mot rätt namn, högst 8 mot fel namn.
- **Kortets form mäts i klippet** (`kortkvot`, ± 7 %): 1,342 i provet; med fasta 1,40 föll en tredjedel av
  de stilla korten. Snett liggande kort jämförs med lådan ett snett kort ger.
- **Remslådan lånas inom stillheten** (inom 1 s, samma låda IoU ≥ 0,9) när provet saknar den.
- **Lutningens tecken** ur kortets kanter när lådan är hela kortet; annars `remsnamn.rata`.
- **Lägena** sparas bara i lugna prov; **i hög** även kant i kant när kortet är delvis täckt; **högar**
  < 1 s räknas inte; **validering** med hash (samma namn på samma sida i alla pass).
- **Namnlistan:** utan tokens, emblem, framsideskort (`front_card`) och Alchemy ("A-"), men MED kort vars
  representativa tryckning är digital (Black Lotus, Dwarven Ruins); 34 612 namn, 1 101 tokennamn.
- **Rapporten:** utsnitt (`_0-30s`) visas men räknas inte i passets summor; `--bara` skriver en egen rapport.
- **Scryfall:** User-Agent utan mejladress; högst 10 frågor/s.

## Kända gränser (provet: pass 2 klipp 1, 0–30 s)

- Textläsaren läste 0 av 6 titlar (~14 px i 4K vid 0,5×) — därför Claude.
- Bildmodellen hade rätt namn överst på 2 av 5; ORB (med CLAHE) bekräftade alla 5.
- Den andra frågan kräver ett senare stilla läge med synlig andel ≥ 0,95; i provet fanns inget för de två
  korten utan namn (de lades i slutet).

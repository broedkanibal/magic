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
$PY dev/remsa/tran/mark.py rapport <passmapp>
```

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
| `tran/{4k,1080}/`, `val/{4k,1080}/` | E | `<spår>-<t>-<hel|remsa>-<app|rata>.jpg`, kvalitet 95. C tömmer dem; E skriver om |
| `osaker/4k/`, `slangd/4k/` | C | 4K-utsnittet för osäkra och slängda-med-lägg — huvudsessionens ögon, inte träning |
| `facit-manuell.json` | (hand) | `{"<spår>": "<namn>" | null}` efter en titt på `osaker/4k` — namn ger `saker_manuell`, null slänger (också ett säkert); måste vara nyare än `spar.json` |
| `montage.jpg` | F | per spår: lägg-ögonblicket och det sista sparade läget i 1080, med Claudes namn och domen |

## Domen

| Dom | När |
|---|---|
| `saker` | Claude ger ett namn i listan och **antingen** säker + (a) eller (b), **eller** osäker + (b). (a) = bildmodellens topp-1 är namnet (hela kortet; remsan räknas bara för icke-basland). (b) = ORB ≥ 12 inliers mot namnets konstverk och ≥ 2 × max(bästa av 20 slumpvalda, 6); för basland också mot lika många konstverk av de andra basländerna |
| `saker_manuell` | namnet ur `facit-manuell.json` (finns i listan); E skriver som för `saker` |
| `baksida` | Claude säger baksida **och** detektorns klass baksida (eller modellen har baksidan överst) |
| `osaker` | Claude gav ett namn men inget andra vittne som räcker, eller namnet är inte i listan / ett tokennamn |
| `slangd` | Claude utan namn (högst två frågor), eller inget lägg-ögonblick |
| `ofragad` | Claude-frågan gav fel efter tre försök, eller utsnittet saknas — frågas igen nästa körning |

Namnet normaliseras: exakt (gemener, apostrofer; en sida → kortets hela namn), annars Dice ≥ 0,9 mot ett
entydigt namn; ett tokennamn ("Blood", "Treasure") blir aldrig ett kortnamn, inte heller via en sida.
Claude får en egen kort fråga utan systemprompt — appens systemprompt rörs inte. E kontrollerar varje
läge där hela kortet syns med vittne (b):s regel mot lägg-ögonblickets konstverk; faller den skrivs inget
efter det senast godkända läget — inte heller täckta lägen däremellan (ett annat kort kan ha lagts exakt på
samma plats). E skriver först till `e-tmp/` och flyttar när kontrollerna är klara. Ofrågade spår gör att
`klipp`/`pass` kör C igen av sig själv.

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

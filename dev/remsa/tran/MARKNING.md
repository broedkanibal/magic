# Märkningen: namnen ur 4K, beskärningar i telefonens kvalitet

Uppdraget: `dev/plan/spec-markning-2026-10-05.md`. Koden: `mark.py` (stegen A–F) och `namn.py`
(Scryfalls namnlista). Allt som skrivs hamnar under `dev/material/arbete/markning/` (gitignorerat).

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
körts gör de följande inaktuella. 4K avkodas helt bara i A; C avkodar lägg-ögonblicken (en seek per spår),
E rutorna för de sparade lägena. Före varje 4K-steg (och var 10:e sekund video i A) väntar skriptet så
länge en node-process kör `dev/golden/kor.cjs` (bara node räknas — ett skal med mönstret i kommandoraden
fick annars skriptet att vänta på sig självt). E mäter också hur många MB de osäkra spåren skulle ge om de
blev säkra (kodas i minnet, skrivs inte).

I en worktree: symlänka `dev/material`, `dev/embed/modeller`, `dev/embed/cache` från huvudträdet och kör
`npm install` i `dev/remsa` (tesseract.js).

## Filerna, per klipp (`<pass>/<klipp>/`)

| Fil | Steg | Innehåll |
|---|---|---|
| `detektioner.json` | A | per prov (var 6:e ruta): kortlådor, remsor, par (låda + remsa + klass), rörelsemått mot föregående och nästa prov — 4K-bildpunkter |
| `spar.json` | B | spåren: alla prov, lägg-ögonblicket (eller orsaken), lägena att spara |
| `tidpunkter.json` | B | lägg-ögonblicken och högarnas intervall, åt detektorspåret |
| `ocr/` | C | titelbanden (png) och textläsarens svar |
| `vittnen.json` | C | kandidatleken och båda vittnenas hela svar per spår |
| `markning.json` | C, E | allt: spår, lägg, vittnen, dom, namn, `utanfor_traning`, `val`, lägen, filer |
| `tran/{4k,1080}/`, `val/{4k,1080}/` | E | `<spår>-<t>-<hel|remsa>-<app|rata>.jpg`, kvalitet 95 |
| `osaker/4k/`, `slangd/4k/` | C | hela kortet i 4K för osäkra spår och för slängda med lägg-ögonblick (Claude-frågan senare) — inte träning |
| `montage/`, `montage.jpg` | C, F | lägg-ögonblicket i 1080 per spår, med namn och dom — stickprovet |

Passets `rapport.md` ligger i `<pass>/`. Gemensamt: `scryfall-namn.json`, `slumpnamn.json`,
`konstverk.json`, `ref/` (Scryfall-bilder), `vek/` (modellens vektorer per bild, låsta till modellfilen).

## Domen

| Dom | När |
|---|---|
| `saker` | textläsaren säker (≥ 0,6 och marginal ≥ 0,2 mot hela namnlistan) **och** bildmodellen har samma namn överst (hela kortet > 0,11 eller remsan > 0,20) |
| `osaker` | ett vittne ser något men inte båda; ingen beskärning till träningen, bara `osaker/4k/` |
| `slangd` | inget vittne ser något, eller inget lägg-ögonblick |
| `baksida` | detektorns klass baksida vid lägg-ögonblicket **och** bildmodellen har baksidan överst på hela kortet (> 0,11) |

## Där koden preciserar specen

- **Kortets form mäts i klippet:** medianen av lådornas långsida/kortsida för ensamma, stilla, raka kort
  med remsa (`kortkvot`), ± 7 %. Pass 2 klipp 1: 1,342 (5–95 %: 1,28–1,37) — med specens fasta 1,40 föll en
  tredjedel av de stilla korten bort. Snett liggande kort jämförs med lådan ett snett kort ger (annars får
  pass 3 klipp 3, bilden ~30° vriden, inga lägg-ögonblick).
- **Remslådan lånas inom stillheten:** saknar provet remsa tas den ur närmaste prov i samma stillhet (inom
  1 s, samma låda IoU ≥ 0,9). Detektorn såg remsan i vart femte prov på ett kort under lampan.
- **Baksidor** kräver att bildmodellen håller med: i provet var en "baksida" ett kort i blänket.
- **Lutningens tecken** ur kortets kanter (vilken av de två vridningarna lägger kortets rektangel på
  kanterna, sedan ±4° finjustering) när lådan är hela kortet; annars `remsnamn.rata`. Ratas val (strukturen
  i remsan) valde fel lutning på syntetiska sneda kort med text i titelraden (−12°, ±25°).
- **Baksidor** behöver ingen remsa för lägg-ögonblicket (de har ingen titelrad).
- **Högar** i `tidpunkter.json` ska ligga minst 1 s (en hand som för ett kort över ett annat är ingen hög).
- **I hög:** IoU > 0,2 som specen, eller delvis täckt (synlig < 0,85) och kant i kant med ett annat spår
  — i en förskjuten hög överlappar det synliga av det undre kortet nästan inte alls.
- **Lägena** sparas bara i lugna prov (stilla, rörelse < 4 mot föregående och nästa): ett läge som blir
  aktuellt väntar på nästa lugna prov, så att ingen hand hamnar i en träningsbild.
- **Rata-utsnittet:** 10–40° från närmaste bildaxel (som appens `beskarVridMin/Max`); hela kortets rata
  bara när lådan har kortets form (lådan är hela kortet). 1080 skärs med 4K-rutans vinkel.
- **Validering:** vart femte namn genom en hash med frö 1 — samma namn hamnar på samma sida i alla klipp
  och pass, så inget namn kan finnas i både träning och validering.
- **Scryfall:** User-Agent utan mejladress; högst 10 frågor/s.

## Kända gränser (provet: pass 2 klipp 1, 0–30 s)

- **Textläsaren läser inte titlarna i pass 2:** 0 säkra av 6 (4K, 0,5×, lampa — titeln ~14 px hög och mjuk;
  förbehandling hjälper inte). Bildmodellen kan bara bekräfta ett namn som finns i kandidatleken, så utan
  textläsaren blir inget säkert: namnet måste då komma från Claude-frågan (`osaker/4k`, `slangd/4k`).
- **Skräptext kan ge en "säker" läsning** mot 33 000 namn (en förbehandlad variant: «TE = To e——» →
  Eye to Eye 0,77/0,20; «. T a SE 3» → V.A.T.S.). Det andra vittnet är det som stoppar dem.
- **Exakta läsningar utan marginal:** playtest-kort (Lightning Colt) och sidor med samma namn (Emeritus of
  Conflict // Lightning Bolt) gör att "Lightning Bolt" läst helt rätt aldrig blir säker — specens namnlista.

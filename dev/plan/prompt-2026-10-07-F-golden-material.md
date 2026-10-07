# Prompt F, 2026-10-07: golden-materialet efter Remsan först — oläsbara tokens, lekens antal, 18:s bithastighet, ny baslinje

**Modell: Opus 5.5, effort high**, agenten `mesa-matning` (golden-material och mätning, ingen kamerakod). Ny session,
egen worktree på main (≥ 06d927c). Kan köras parallellt med spegelmattans sessioner (MES-345/346 rör datorsidan) —
krockreglerna står sist. Ersätter inget; prompt D är klar (`dev/plan/remsan-forst-resultat.md`).

Läs `dev/plan/remsan-forst-resultat.md` (avsnitten *Golden*, *B1 kort för kort mot C* och *Fällor*),
`dev/golden/SNABBGUIDE.md` och golden-raderna för 2026-10-07 i `dev/golden/historik.md`. Ingen hälsning, nämn inte
dokumenten: för Jesper är det samma samtal. Ingen Linear-issue: det här är golden-materialet, inte produkten — allt
skrivs i commit-meddelandena och i historik.md. Ingenting i `index.html`, `embed.js`, `detektor.js` eller trösklarna rörs.

## Jespers beslut 2026-10-07 (bilden `tokenkort-13-18.jpg` i chatten)

| Kort | Beslut |
|---|---|
| 13 Ancestral Blade (hög C, under token Soldier i blank ficka) | **oläsbar** — titelraden utbränd av blänket, också i 4K |
| 13 Mirran Bardiche (hög D, under token Rebel) | **oläsbar** — ingen läsbar bokstav i 1080p, en antydan i 4K |
| 18 Mirran Bardiche (hög D, ljus ficka i lampans reflex under grön token) | **oläsbar** |
| 18 Ancestral Blade (hög C, utan ficka, under token Soldier) | **oläsbar i golden-filen (1080p, 1500 kbit/s)** — men i 4K syns titeln och **ska kunna läsas mot lekens lista**. Flaggan tas bort om kodningen i steg 3 nedan gör den läsbar |

## Steg 1 — oläsbart-flaggorna

`"olasbar": "<orsak>"` på de fyra korten i `dev/golden/fall/13-…/facit.json` och `dev/golden/fall/18-…/facit.json`,
samma form som 13 Fencing Ace har. Orsaken ska säga vad ögat ser (ovan) och för 18 Ancestral Blade att den är läsbar i
4K. Läsbara blir 118 → 114; *rätt namn* räknas som förut på alla 119, *fel namn* på alla.

## Steg 2 — lekens antal

`dev/golden/lek.txt` har `Island` och `Forest` utan antal (= 1). Golden 17 (kompisens bord) har **fem Island och två
Forest** (`facit.json`), så antalspriorn (K6, `fler än leken`) spärrar varje Island efter den första — i B3/B4 föll
17:s Island A 0,57 (remsan 0,339, säker) på det. Skriv `5 Island` och `2 Forest`. Det byter poolnyckeln.

**Uppspelaren läser också lek.txt** (Spegelmattan orkestrerare, 2026-10-07): `dev/uppspelaren/fall.cjs` bygger
partiet 09-21:s lek ur raderna OVANFÖR `# golden 17` och kastar fel (kod 2, "p0921k går inte att läsa") om det inte
blir exakt 28 namn och 40 kort — en avsiktlig spärr mot att lekens antal ändras tyst. Därför:

- Island och Forest står redan **under** `# golden 17` (rad 37–38); ändra dem där och lägg nya golden-kort under den
  raden eller i ett eget avsnitt längre ned. Rör inte raderna ovanför.
- Måste raderna ovanför ändå ändras: uppdatera talen 28/40 i `fall.cjs` i samma commit och kör
  `node dev/uppspelaren/kor.cjs --jamfor`; tal som flyttar sig sparas om med `--spara` på main i en egen commit, med
  förklaring.
- Kör `sh dev/kolla.sh` efter ändringen (den stoppar annars med "p0921k går inte att läsa"), och **säg till
  Spegelmattan orkestrerare när lek.txt är pushad**.

## Steg 3 — golden 18:s bithastighet

Prompt A (`dev/material/arbete/markning/matningar-2026-10-07-resultat.md`, fråga 2) visade att fördröjningen till namn
i fall 18 är golden-filens komprimering, inte upplösningen: 1920×1080 i **1500 kbit/s** ger 34 s, **8000 kbit/s** ger
0,9 s — samma som 4K. Telefonen ser rå video, så dagens fil underskattar den.

- `video.mp4` i fall 18 ligger i git (32 MB). 8000 kbit/s-filen är **172 MB** och får inte plats (GitHubs gräns 100 MB).
  Koda om med `dev/golden/video/koda.swift` ur `dev/material/inspelningar/2026-10-02-fall-13b-0,5x-sidoljus/telefon.mov`
  (0–180 s, 1920×1080, 15 rutor/s) i **3000 och 4500 kbit/s**, och mät varje med `--fall 18 --video <fil>` (aldrig
  `--spara`): fördröjning till namn, utlagda med namn, rätt namn, fel namn, falska tap-flippar. Välj den lägsta
  bithastighet som ger fördröjningen under ~1,5 s och håller filen under 90 MB. Jämför också med den befintliga
  8000 kbit/s-filen (`dev/material/golden-18-upplosning/video-1920x1080-8000k.mp4`).
- Byt `video.mp4` mot den valda filen; facit och tider rörs inte (samma inramning). Skriv i facits `anteckning` vilken
  kodning som gäller och varför.
- **18 Ancestral Blade:** läs `kortremsa.py` på körningen: läser remsan den säkert (≥ 0,28) med den nya kodningen? Då tas
  oläsbart-flaggan bort från just den (Jespers beslut ovan). Annars står den kvar, med värdet i orsaken.

## Steg 4 — ny baslinje

När steg 1–3 är inne: **en** golden med `--fall 13,17,18 --spara` — bara de fall vars material ändras. Övriga fall
står kvar i `senaste.json` (regeln i SNABBGUIDE, *När en ny baslinje behövs*). Den varma profilen (TMPDIR =
e4a618fc:s scratchpad, se historik 2026-10-07), egen port över 8260, `node /abs/sökväg/worktree/dev/golden/kor.cjs`
(absolut sökväg — fällan i redogörelsen) och kontrollera `curl -s localhost:<port>/ | md5` mot worktreens index.html
medan den kör. Läs raden `Poolen:` (ny pool med fler landkonstverk, eftersom lek.txt ändras) och
`remsorna: mobileclip-s0-mesa-v2.onnx`. Inga bänkar på datorn under körningen. Väntat mot B4 på de tre fallen: +1
(17 Island), 18 Ancestral Blade läst om kodningen räcker, fördröjning 18 ≈ 1 s, inga fel namn. Avviker något annat
kort i de tre fallen: förklara det kort för kort (`kortdom.py` mot
`dev/material/arbete/markning/golden-2026-10-07/D/B4.json`) innan baslinjen sparas. Poolbytet kan i teorin flytta
ett kort i de andra 15 fallen; det syns nästa gång alla fall körs efter en kamerändring, och raden i historik.md ska
säga att poolen bytts här.

Rad i `historik.md` (det korta formatet, se filens huvud), commit med hela historien (vad som var fel, vad som mättes, vad som ändrades), push till main
efter "säg till" till Spegelmattan orkestrerare (golden-material, ingen kamerakod — den behöver inte köra om något,
men uppspelarens baslinje bär index.html:s sha och rörs inte av det här).

## Inspelningarna för steg 3 (Jesper, före träningen av detektorn)

Steg 3 i prompt D (detektorn i högar av tappade land i mörker och på ljusa bord) tränas på **syntetiska** bord
(`dev/detektor/synt/`) och mäts på **prov-material** som inte är golden 17 — annars blir 17 både prov och facit. Det
behövs **två klipp**, inget mer:

| | Klipp A | Klipp B |
|---|---|---|
| Bord | vitt eller ljust bord, eller vitt lakan | svart matta eller mörkt träbord |
| Ljus | mörkt rum, en lampa snett från sidan (reflexen får hamna i bilden) | taklampa |
| Kort | **tre landhögar à 4–6 land**, alla kort **tappade** (vridna 60–90°), förskjutna 10–20 % så att varje namnrad syns; plus 3–4 otappade kort ensamma | samma, med en hög otappad |
| Hylsor | en hög med, två utan | valfritt |
| Kamera | 0,5× första halvan, **1×** andra halvan (byt mitt i klippet utan att röra hållaren) | 0,5× |
| Längd | 2–3 min | 2–3 min |

Så här spelas de in (samma som `dev/plan/inspelningar-traning-2026-10.md`, *Kameran*): telefonen i hållaren, liggande,
~40 cm över bordet, **4K 30 b/s**, HDR av, stabilisering av, Lock Camera och Lock White Balance på, automatisk
exponering. Starta med tomt bord 3 s. Lägg ett kort i taget, släpp, ta bort handen, låt det ligga ~1 s innan nästa; bygg
högarna ett kort i taget så att varje kort syns helt en gång innan nästa läggs på. Efter högarna: lyft det översta
kortet i en hög och lägg tillbaka det; flytta en hel hög. Avsluta med att sopa bort korten.

Mappen: `dev/material/inspelningar/ÅÅÅÅ-MM-DD-prov-hogar-<bord>/` — **utan `-traning-` i namnet**, så att
`dev/detektor/delning.py` räknar den som prov. Skriv vilka kort som ligger var (ett foto av slutläget räcker; hörnen
ritas sedan i `dev/golden/rita.html`).

Vad klippen ger: facit för detektorns remsklass och kortklass på just det 17 visar (vitt bord, mörker, tappade
landhögar), i två ljus och två zoomlägen, med andra kort och ett annat tillfälle än golden — grinden för steg 3
(`hogbank_remsor.py`, `parprov.py`, golden ×2) mäts mot dem.

## Krock med andra sessioner

Bara golden-material och `dev/golden`: inga krockar med kamerakoden. En golden åt gången på datorn: "golden startar"
och "klart" till "Spegelmattan orkestrerare" och "MES-334 fall 05 utredning" (ListAgents), och kolla
`ps -axo command= | grep -E 'golden/kor\.cjs'` före start.

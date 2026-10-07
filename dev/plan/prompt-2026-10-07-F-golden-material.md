# Prompt F, 2026-10-07: golden-materialet efter Remsan först — oläsbara tokens, landen i golden-leken, 13:s och 18:s bithastighet, ny baslinje

**Modell: Opus 5.5, effort high**, agenten `mesa-matning` (golden-material och mätning, ingen kamerakod). Ny session,
egen worktree på main (≥ den commit som bär den här versionen av prompten). Kan köras parallellt med spegelmattans
sessioner (MES-345/346 rör datorsidan) — krockreglerna står sist. Prompt D är klar (`dev/plan/remsan-forst-resultat.md`).

Läs `dev/plan/remsan-forst-resultat.md` (avsnitten *Golden*, *B1 kort för kort mot C* och *Fällor*),
`dev/golden/SNABBGUIDE.md` (särskilt *När en ny baslinje behövs*) och golden-raderna för 2026-10-07 i
`dev/golden/historik.md`. Ingen hälsning, nämn inte dokumenten: för Jesper är det samma samtal. Ingen Linear-issue:
det här är golden-materialet, inte produkten — allt skrivs i commit-meddelandena och i historik.md. Ingenting i
`index.html`, `embed.js`, `detektor.js` eller trösklarna rörs. `dev/golden/lek.txt` rörs inte heller (steg 2).

## Steg 1 — de fyra korten under tokens är oläsbara (Jespers beslut 2026-10-07)

`"olasbar": "<orsak>"` på alla fyra, samma form som 13 Fencing Ace har. Orsaken säger vad ögat ser:

| Kort | Orsak |
|---|---|
| 13 Ancestral Blade (hög C, under token Soldier i blank ficka) | titelraden utbränd av blänket, också i 4K |
| 13 Mirran Bardiche (hög D, under token Rebel) | ingen läsbar bokstav i 1080p, en antydan i 4K |
| 18 Mirran Bardiche (hög D, ljus ficka i lampans reflex under grön token) | utbränd i reflexen |
| 18 Ancestral Blade (hög C, utan ficka, under token Soldier) | under token; titeln syns i 4K men räknas som oläsbar tills vidare |

Flaggan på 18 Ancestral Blade står kvar oavsett vad den nya kodningen i steg 3 ger — Jesper vill inte att den
flyttar sig med bithastigheten. Läser kameran den ändå, skriv det i historik-raden. Läsbara blir 118 → 114; *rätt namn*
räknas som förut på alla 119, *fel namn* på alla.

## Steg 2 — landen i golden-leken räcker alltid (i kor.html, inte i lek.txt)

**Problemet:** `lek.txt` har `Island` och `Forest` utan antal (= 1), men golden 17 (kompisens bord) har fem Island och
två Forest. Antalspriorn (K6, `fler än leken`) spärrar då varje Island efter den första — i B3/B4 föll 17:s Island A
(remsan 0,339, säker) på det. Att skriva in `5 Island` för hand skalar inte: varje nytt fall med fler land av en färg
faller på samma sätt tills någon minns att räkna. Golden ska mäta kameran, inte om någon räknat landen i lek.txt.

**Lösningen, i `dev/golden/kor.html` (`byggPool`, där raderna läses):** golden-lekens antal för varje **basland**
(Plains, Island, Swamp, Mountain, Forest, Wastes, och snö-varianterna om de finns) lyfts automatiskt till

> max(antalet i lek.txt, det största antalet av det baslandet i **något enskilt fall**)

där ett falls antal räknas ur dess `facit.json` (`kort[]` med `namn`; tar ett fall in fler exemplar under förloppet än
slutläget visar, räkna det högsta antalet som ligger samtidigt — läs hur facit beskriver händelserna innan du väljer).
Bara basland lyfts; övriga kort behåller lek.txt:s antal, så priorn mäts som förut där den gör nytta. Lyftet ändrar
aldrig ett antal nedåt.

- Poolens nyckel bär bara namnen (kommentaren i `byggPool`), så lyftet bygger inte om poolen. Kontrollera det: raden
  `Poolen:` ska vara oförändrad mot B4.
- Skriv ut lyftet i kor.cjs:s utskrift, en rad: `Leken: Island 1 → 5 (fall 17), Forest 1 → 2 (fall 17)` — eller
  `Leken: basland ur lek.txt räcker` — så att den som läser en körning ser vilket antal kameran fick.
- Lägg lyftets antal i resultatet (bredvid `poolKod`), så att en baslinje bär vilka antal den mättes med.
- Gör lyftet till förval. Behövs en flagga för att stänga av det (`--lek-som-den-ar`), får den aldrig ihop med `--spara`.
- **lek.txt rörs inte.** Uppspelaren (`dev/uppspelaren/fall.cjs`) läser raderna ovanför `# golden 17` och kräver 28
  namn och 40 kort där — den påverkas inte av ändringen i kor.html. Kör ändå `sh dev/kolla.sh` innan push.
- En kort rad i SNABBGUIDE (där lek.txt beskrivs) och i lek.txt:s huvudkommentar: baslandens antal lyfts av kor.html
  till det största ett fall visar; skriv inte antal på basland för golden-fallens skull.

## Steg 3 — fall 13 och 18 i samma, högre bithastighet

**Varför filerna är så komprimerade:** 13 och 18 är de enda videofallen i full 1920×1080, och båda kodades i
**1500 kbit/s** den 3 oktober för att filerna skulle hålla sig små i git (31–32 MB). Prompt A
(`dev/material/arbete/markning/matningar-2026-10-07-resultat.md`, fråga 2) visade att det kostar: i fall 18 ger
1500 kbit/s **34 s** till namn och 8000 kbit/s **0,9 s** — samma som 4K. Telefonen läser kamerans bilder okomprimerade,
så golden-filen underskattar appen. 8000 kbit/s-filerna är 172 MB och får inte plats i git (GitHubs gräns 100 MB per fil).
De äldre videofallen (07, 09–12) är mindre utsnitt i lägre upplösning och rörs inte här.

**Lösningen:** båda fallen i **samma** bithastighet — den lägsta som ger samma resultat som 8000 kbit/s och håller
filen under 90 MB (≈ 4000 kbit/s för 180 s; 4500 blir 101 MB och går inte).

1. Koda fall 18 med `dev/golden/video/koda.swift` ur `dev/material/inspelningar/2026-10-02-fall-13b-0,5x-sidoljus/telefon.mov`
   (0–180 s, utsnitt 0 0 3840 2160, 1920 bred, 15 rutor/s) i **3000 och 4000 kbit/s**. Mät varje med
   `--fall 18 --video <fil>` (aldrig `--spara`) och jämför med `dev/material/golden-18-upplosning/video-1920x1080-8000k.mp4`:
   fördröjning till namn, utlagda med namn, rätt namn, fel namn, falska, tap-flippar.
2. Välj den lägsta av de två som ligger nära 8000k (fördröjningen under ~1,5 s, samma namn). Räcker ingen: 4000.
3. Koda fall 13 i **samma** bithastighet ur `dev/material/inspelningar/2026-09-19-mes-246-las-fore-slapp/telefon.mov`
   (0–172 s, samma utsnitt, bredd och rutor/s som filen har i dag — se 13:s `anteckning`). Ett prov med
   `--fall 13 --video <fil>` mot `dev/material/golden-13-upplosning/video-1920x1080-8000k.mp4`.
   **Varning:** 13 i 4K gav en gång ett säkert fel namn. Ger den nya kodningen ett säkert fel namn i 13 eller 18:
   stanna, spara ingen baslinje, byt inte video.mp4, och rapportera kortet, vägen (domskälet) och bildrutan till Jesper.
4. Byt `video.mp4` i båda fallen; facit och tider rörs inte (samma inramning). Skriv i båda facits `anteckning` vilken
   kodning som gäller nu och varför (en mening, med måtten). Lägg de prövade filerna i `dev/material/golden-1x-upplosning/`.

## Steg 4 — ny baslinje för de tre fallen

När steg 1–3 är inne: **en** golden med `--fall 13,17,18 --spara` — bara de fall vars material ändras. Övriga fall
står kvar i `senaste.json`. Basland-lyftet i steg 2 rör i praktiken bara 17 (inget annat fall har fler av ett basland
än lek.txt) — kontrollera det på `Leken:`-raden; lyfter den något annat fall, kör också det fallet.

Den varma profilen (TMPDIR = e4a618fc:s scratchpad, se historik 2026-10-07), egen port över 8260,
`node /abs/sökväg/worktree/dev/golden/kor.cjs` (absolut sökväg — fällan i redogörelsen) och kontrollera
`curl -s localhost:<port>/ | md5` mot worktreens index.html medan den kör. Läs raderna `Poolen:` (oförändrad),
`Leken:` och `remsorna: mobileclip-s0-mesa-v2.onnx`. Inga bänkar på datorn under körningen.

Väntat mot B4 på de tre fallen: +1 (17 Island A), fördröjning 18 ≈ 1 s, fler utlagda med namn i 13 och 18, **inga fel
namn**. Avviker något annat kort: förklara det kort för kort (`kortdom.py` mot
`dev/material/arbete/markning/golden-2026-10-07/D/B4.json`) innan baslinjen sparas.

Rad i `historik.md` i det korta formatet (högst tre meningar), commit med hela historien (vad som var fel, vad som
mättes, vad som ändrades), push till main efter "säg till" till Spegelmattan orkestrerare (golden-material, ingen
kamerakod — uppspelarens baslinje bär index.html:s sha och rörs inte av det här).

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

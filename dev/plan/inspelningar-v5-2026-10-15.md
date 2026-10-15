# Inspelningar för bildmodellen v5 — manus (2026-10-15)

## Varför

v4 tränades på fler kort än v2 men blev inte bättre på remsorna (namnraden på
ett delvis täckt kort). Remsbänken 2026-10-15:

| | v2 | v4 |
|---|---|---|
| Remsor med rätt namn överst (1 900 remsor) | 1 263 | 1 263 |
| Säkra namn vid bästa tröskel med 0 fel | 760 | 674 |
| Största felet | Fencing Ace → Plains, 0,225 | Hooded Blightfang → Pacifism, 0,325 (blänk) |

Träningen fungerade på det den fick se: osedda kort i samma miljö gick från
17 % till 97 % rätt på remsan. Men de 88 nya korten i v4 spelades alla in på
träbord med skugga. Felen sitter i blänk, lampor och svart matta, alltså
förhållanden som nästan inte fanns i träningen. **Nästa modell behöver fler
förhållanden, inte fler kort.** Den behöver också **hårda negativ i
världsskala**, så att kort den aldrig sett inte drar till sig fel svar
(Pacifism, Night's Whisper). Det spelar större roll när Mirror börjar söka
bland alla kort (MES-375–377).

Taket i golden: bildmodellen kan som mest påverka ungefär 4 av de 22
missade namnen (`dev/plan/golden-platan-2026-10-15.md`). Vinsten ska främst
synas på blänkbänken (MES-246) och i riktiga partier.

## Idén: samma kort som i v4:s A-pass, i nya ljus

A-passet från 2026-10-06 (`dev/material/2026-10-06-traning-manga-kort-tra-skugga/`,
träbord, skugga) är redan inspelat och märkt: 4 klipp, 117 kort med namn i den
ordning de lades ut, plus 17 tokens. Det var byggt för just det här — mapparna
för lampa och sol/skugga skapades samma dag men spelades aldrig in.

Spela in **samma fyra högar i samma ordning** i tre nya ljus (B1–B3). Namnen
tas ur A, där de är skarpa (`mark.py pass <B> --par <A>`, ORB och
Needleman–Wunsch, se `dev/remsa/tran/MARKNING.md`). Du behöver alltså inte
läsa eller skriva några namn, och märkningen kostar inga nya frågor till
Claude.

**Ordningen** står i `dev/plan/inspelningar-v5-ordning.md`, klipp för klipp.
Ett kort som saknas, eller byter plats med en granne, gör inget: parningen
söker ± 3 kort runt den väntade platsen och hoppar över luckor. Tokens tränas
inte och kan lämnas bort.

**Sleeves:** behåll dem som de var i A, blandade färger och utan. Det är
verkligheten vid ett bord, och samma kort ska se likadant ut i A och B utom
ljuset.

**Provkort:** 14 av korten (Mire Triton, Goremand, Temple of the Dragon Queen,
Overcharged Amalgam, Varis, Barbarian Class, Feywild Trickster, Ray of Frost,
Mind Flayer, Tranquil Thicket, Curse of the Swine, Plaxcaster Frogling,
Oran-Rief, Desolation Twin) är valideringsnamn som aldrig tränas. De följer
med till B och visar per ljus om v5 blev bättre. Ingen egen provhög behövs.

**Golden-leken:** Thriving Moor finns i hög 1. Märkningen håller den redan
utanför träningen (`utanfor_traning`). Inget att göra.

## Före: förberedelser

| | Vad | Varför |
|---|---|---|
| 1 | **Disk: minst 25 GB ledigt på datorn.** I dag finns 7,9 GB | B1–B3 är ~30 min 4K-video, 9–18 GB, plus märkningens utsnitt |
| 2 | **Telefonen:** minst 20 GB ledigt, laddad, hållaren | |
| 3 | **De fyra högarna i A-ordningen**, efter listan. Ligger de kvar orörda sedan 6 oktober: kontrollera bara de första korten i varje | |
| 4 | En **skrivbordslampa** som går att rikta, en **svart matta**, och en dag med **sol** genom ett fönster | ljuset i B1–B3 |

## Kameran

Samma inställningar som 2026-10-04 (`dev/plan/inspelningar-traning-2026-10.md`,
*Kameran*): **4K i 30 b/s, HEVC, Auto-b/s av, stabilisering av, HDR av,
Lås kamera på, Lås vitbalans på.**

| | Värde |
|---|---|
| Zoom | **0,5× i alla klipp** |
| Hållare | liggande, kameran rakt ned |
| Höjd | **40 cm** i klipp 1, 3 och 4, **55–60 cm** i klipp 2 (små namnrader, som i golden-fall 18) |
| Exponering och fokus | automatiska, som i spel. Rör inget |

Telefonen rörs inte under ett klipp.

## Passen

Spela in **ljus för ljus**: alla fyra högar i ett ljus, sedan nästa. Då
behöver lampan bara riggas en gång.

| Pass | Ljus | Bord | Mapp |
|---|---|---|---|
| **B1 · blänk** | skrivbordslampa **rakt ovanför**, ~60 cm upp, så att reflexen syns i korten. Rikta den så att den träffar namnraden på flera kort | **svart matta** | `dev/material/ÅÅÅÅ-MM-DD-traning-manga-kort-blank/` |
| **B2 · lampa snett** | samma lampa **snett från sidan**, ~45°, reflexen syns i bild. Rummet annars ganska mörkt | träbord | `…-traning-manga-kort-lampa-snett/` |
| **B3 · sol och skugga** | sol genom fönstret, så att en **skarp skuggkant** (fönsterbåge, gardin) går över bordet. Hälften av korten i sol, hälften i skugga | träbord eller svart matta | `…-traning-manga-kort-solskugga/` |

`ÅÅÅÅ-MM-DD` är dagen du spelar in. **Filnamnen ska vara som i A:**
`klipp1.MOV` … `klipp4.MOV` i varje mapp. Samma filnamn är det som parar ihop
B-klippet med rätt A-klipp. Kopiera ManaBox-filen
(`manabox-scan-2026-10-06.csv`) till varje ny mapp, eller säg till så gör
Claude det.

## Manus för varje klipp

1. **Starta inspelningen med tomt bord**, 3 s.
2. **Lägg korten ett i taget, från högens topp**, i listans ordning. Släpp
   kortet, ta bort handen, låt det ligga **helt synligt i ~2 s** innan nästa.
   Sprid dem över hela bilden, också nära kanterna. (Pass A: handens skugga
   gjorde att 1 s var för kort.)
3. **Efter ungefär halva högen, variationerna:**
   - **bygg en landhög** av basländerna, förskjuten så att varje namnrad syns
   - **lägg 2–3 kort delvis över andra**, en tredjedel täckt
   - **tappa** 2–3 kort (vrid 90°)
4. **Lägg resten** av högen.
5. **Stoppa inspelningen.**
6. **Plocka upp korten i samma ordning som du lade dem**, och lägg varje kort
   **underst** i handen. Då ligger högen i rätt ordning till nästa ljus.

Variationerna behöver inte vara på samma ställe som i A. Det är
lägg-ordningen som parar.

## Ordningen, och ungefär hur lång tid

| Steg | Vad | Tid |
|---|---|---|
| 1 | Rensa disk, lägg högarna i ordning efter listan | 20–40 min |
| 2 | B1 blänk: klipp 1–4 | 15 min + rigg |
| 3 | B2 lampa snett: klipp 1–4 | 15 min + rigg |
| 4 | B3 sol och skugga: klipp 1–4, en dag med sol | 15 min |
| 5 | AirDrop till datorn, lägg filerna i mapparna (eller säg till, så kopierar Claude dem från Hämtade filer) | 15 min |

B3 kan tas en annan dag. Högarna får inte blandas emellan.

## Valfritt: en femte hög med kort som liknar varandra

Har du kort som är lätta att blanda ihop — cykler (Thriving-, Gain-,
Guildgate-länder), basland i många tryckningar och utgåvor, kort med nästan
samma namn — spela in dem som en egen hög: först i bra ljus som A-passet
(`…-traning-likadana-ljus/klipp1.MOV`), sedan i B1–B3 (`…-traning-likadana-blank/`
och så vidare). Inte golden-lekens kort, och inte leken från blänkinspelningen
MES-246. Den högen märks med Claude i A (~0,5 $, frågas innan). Hela
inspelningen ovan fungerar utan den.

## Vad Claude gör sedan

| Steg | Vad | Kostar |
|---|---|---|
| 1 | **Märker B1–B3 ur A:** `mark.py pass <B> --par <A-passet 2026-10-06> --tel --lagg-fonster 20`. Stickprov med egna ögon på remsorna, som 2026-10-05 | inga frågor |
| 2 | **Hårda negativ i världsskala:** världens bilder (Scryfall `unique_artwork`, ~49 500 bilder, samma som `dev/remsa/varlden.py` och MES-375). För varje tränat namn hämtas de närmaste korten i världen med dagens modell och läggs in som negativ i varje omgång, plus slumpade kort ur världen | – |
| 3 | **Dataset:** de gamla passen + B1–B3. Basland som egen grupp med fast andel ~35 %, mellan v2 och v3 (v3:s lärdom) | – |
| 4 | **Träning på Kaggle** (T4, ~3 h), som v4 | gratis |
| 5 | **Mätning**, se nedan | tokens |

## Hur v5 döms

| Mått | Krav |
|---|---|
| Golden, grinden i CLAUDE.md | 0 säkra fel namn, rätt namn av läsbara fler än baslinjen. Baslinjen en gång, v5 två gånger på samma kod |
| Remsbänken (`remsregel.py`) | **0 säkra fel vid appens trösklar 0,28/0,20/0,08** och fler säkra rätt än v2:s 760. Det var blänkfelet som fällde v4 |
| Provkorten per ljus | säkra rätt och fel för de 14 valideringsnamnen i A, B1, B2 och B3, för v2, v4 och v5. B1 ska vara bättre än v2 med 0 fel |
| Världsbänken (`varlden.py`, MES-361) | 0 säkra fel mot hela världen, som trappans steg 3 kräver |
| Helkortsbänken | rapporteras, diagnos |

Bänkarna är diagnos enligt grinden, men ett säkert fel på en blänkremsa var
skälet till att v4 aldrig byttes in. Därför står remsbänken här som krav för
att v5 ska vara värd att föreslå.

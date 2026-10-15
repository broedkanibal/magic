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

## Idén: samma kort två gånger

Varje hög spelas in **först i bra ljus (A)**, sedan **i det svåra ljuset (B)**,
med samma kort i samma ordning. Namnen läses i A, där de är skarpa, och följer
med till B. Det gör `mark.py pass <B> --par <A>` redan, med ORB och
Needleman–Wunsch, se `dev/remsa/tran/MARKNING.md`. Ett missat eller extra
kort förskjuter inte resten. Du behöver alltså inte läsa eller skriva några
namn.

## Före: förberedelser

| | Vad | Varför |
|---|---|---|
| 1 | **Disk: minst 30 GB ledigt på datorn.** I dag finns 7,9 GB | ~40 min 4K-video blir 12–24 GB, plus märkningens utsnitt |
| 2 | **Telefonen:** minst 25 GB ledigt, laddad, hållaren | |
| 3 | **Fyra högar à ~30 kort** (se *Korten*) | tre för träning, en (V) bara för provet |
| 4 | **Skanna varje hög med ManaBox** och exportera CSV | blir kandidatlistan i märkningen, så att Claude bara väljer bland högens kort |
| 5 | Blanka **sleeves** på ungefär hälften av korten i varje hög | blänket ska med |
| 6 | En **skrivbordslampa** som går att rikta, och en dag med **sol** genom ett fönster | ljuset i B1–B3 |

## Korten

| Regel | Varför |
|---|---|
| **Inte golden-lekens kort** (`dev/golden/lek.txt`), utom basland | golden mäter kort modellen aldrig sett |
| **Inte leken från blänkinspelningen (MES-246)** | den är bänken som visar om blänket blev bättre |
| **Helst kort som inte är med i de tidigare passen** | nya namn är en bonus, inte poängen |
| **6–8 basland per hög, olika tryckningar och utgåvor** | basland är hälften av alla kort på ett bord, och flest fel i v3 |
| **Kort som liknar varandra, om du har dem:** cykler (Thriving-, Gain-, Guildgate-länder), kort i samma färg och ram, kort med nästan samma namn | hårda negativ på riktigt: precis det som gav Thriving Heath → Thriving Moor (MES-235) |
| **Inga tokens eller emblem** | namnlistan sållar bort dem |

Claude jämför ManaBox-filerna mot golden-leken och MES-246-leken innan något
märks, och säger till om ett kort måste bort.

## Kameran

Samma inställningar som 2026-10-04 (`dev/plan/inspelningar-traning-2026-10.md`,
*Kameran*): **4K i 30 b/s, HEVC, Auto-b/s av, stabilisering av, HDR av,
Lås kamera på, Lås vitbalans på.**

| | Värde |
|---|---|
| Zoom | **0,5× i alla klipp** |
| Hållare | liggande, kameran rakt ned |
| Höjd | **40 cm** i klipp på hög 1 och 3, **55–60 cm** på hög 2 (små namnrader, som i golden-fall 18) |
| Exponering och fokus | automatiska, som i spel. Rör inget |

Höjden för en hög ska vara **samma i A och alla B**. Telefonen rörs inte under
ett klipp.

## Passen

Spela in **villkor för villkor**: alla fyra högar i ett ljus, sedan nästa ljus.
Då behöver lampan bara riggas en gång.

| Pass | Ljus | Bord | Sleeves | Mapp |
|---|---|---|---|---|
| **A · bra ljus** | jämnt dagsljus eller taklampa som inte speglar sig i korten, inga skarpa skuggor | träbord | som de är | `dev/material/ÅÅÅÅ-MM-DD-traning-v5-ljus/` |
| **B1 · blänk** | skrivbordslampa **rakt ovanför** mattan, ~60 cm upp, så att reflexen syns i korten. Rikta så att den träffar namnraden på flera kort | **svart matta** | blanka på | `…-traning-v5-blank/` |
| **B2 · lampa snett** | samma lampa **snett från sidan**, ~45°, reflexen syns i bild. Rummet annars ganska mörkt | träbord | som de är | `…-traning-v5-lampa-snett/` |
| **B3 · sol och skugga** | sol genom fönstret, så att en **skarp skuggkant** (fönsterbåge, gardin) går över bordet. Hälften av korten i sol, hälften i skugga | träbord eller svart matta | som de är | `…-traning-v5-solskugga/` |

Hög **V** (provet) spelas in i alla fyra ljus, men i **egna mappar med `-prov-`
i stället för `-traning-`**, till exempel `…-prov-v5-ljus/`, `…-prov-v5-blank/`.
Det spärrar den från träningen (`dev/detektor/delning.py` släpper bara
`-traning-`). Den visar per ljus om v5 blev bättre än v2 och v4.

**Filnamn:** `hog1.MOV`, `hog2.MOV`, `hog3.MOV` i varje träningsmapp,
`hogV.MOV` i varje provmapp. Samma filnamn i A och B är det som parar ihop
dem.

**ManaBox-filerna:** en CSV med hög 1–3 i varje träningsmapp, en CSV med hög V
i varje provmapp.

## Manus för varje klipp (~2,5 min)

Samma i A och alla B, så att ordningen följer med:

1. **Starta inspelningen med tomt bord**, 3 s.
2. **Lägg korten ett i taget, från högens topp.** Släpp kortet, ta bort handen,
   låt det ligga **helt synligt i ~2 s** innan nästa. Sprid dem över hela
   bilden, också nära kanterna. (Pass A 2026-10-06: handens skugga gjorde att
   1 s var för kort.)
3. **Efter ~20 kort, variationerna:**
   - **bygg en landhög** av basländerna, förskjuten så att varje namnrad syns
   - **lägg 2–3 kort delvis över andra**, en tredjedel täckt
   - **tappa** 2–3 kort (vrid 90°)
4. **Lägg resten** av högen, som i steg 2.
5. **Stoppa inspelningen.**
6. **Plocka upp korten i samma ordning som du lade dem**, och lägg varje kort
   **underst** i handen. Då ligger högen i samma ordning till nästa ljus.

Blir ett kort fel i ordningen gör det inget: parningen hoppar över det. Byt
inte ordning på flit.

## Ordningen, och ungefär hur lång tid

| Steg | Vad | Tid |
|---|---|---|
| 1 | Skanna de fyra högarna, sleeves på hälften, rensa disk | 30 min |
| 2 | A: hög 1, 2, 3, V | 15 min |
| 3 | B1 blänk: hög 1, 2, 3, V | 15 min + rigg |
| 4 | B2 lampa snett: hög 1, 2, 3, V | 15 min + rigg |
| 5 | B3 sol och skugga: hög 1, 2, 3, V, en dag med sol | 15 min |
| 6 | AirDrop till datorn, lägg filerna i mapparna (eller säg till, så kopierar Claude dem från Hämtade filer) | 15 min |

B3 kan tas en annan dag. Högarna får inte blandas emellan.

## Vad Claude gör sedan

| Steg | Vad | Kostar |
|---|---|---|
| 1 | Kollar CSV:erna mot golden-leken och MES-246-leken | – |
| 2 | **Märker A:** `mark.py pass <A> --tel --lagg-fonster 20`. Namnen ur 4K, Claude som första vittne, bildmodellen eller ORB som andra | ~1–2 $ i frågor; frågas innan |
| 3 | **Märker B1–B3 ur A:** `mark.py pass <B> --par <A> --tel`. Inga nya frågor. Stickprov med egna ögon på remsorna, som 2026-10-05 | – |
| 4 | **Hårda negativ i världsskala:** världens bilder (Scryfall `unique_artwork`, ~49 500 bilder, samma som `varlden.py` och MES-375). För varje tränat namn hämtas de närmaste korten i världen med dagens modell och läggs in som negativ i varje omgång, plus slumpade kort ur världen | – |
| 5 | **Dataset:** de gamla passen + v5-passen. Basland som egen grupp med fast andel ~35 %, mellan v2 och v3 (v3:s lärdom) | – |
| 6 | **Träning på Kaggle** (T4, ~3 h), som v4 | gratis |
| 7 | **Mätning**, se nedan | tokens |

## Hur v5 döms

| Mått | Krav |
|---|---|
| Golden, grinden i CLAUDE.md | 0 säkra fel namn, rätt namn av läsbara fler än baslinjen. Baslinjen en gång, v5 två gånger på samma kod |
| Remsbänken (`remsregel.py`) | **0 säkra fel vid appens trösklar 0,28/0,20/0,08** och fler säkra rätt än v2:s 760. Det var blänkfelet som fällde v4 |
| Provhögen V, per ljus | säkra rätt och fel för v2, v4 och v5 i A, B1, B2 och B3. B1 ska vara bättre än v2 med 0 fel |
| Världsbänken (`varlden.py`, MES-361) | 0 säkra fel mot hela världen, som trappans steg 3 kräver |
| Helkortsbänken | rapporteras, diagnos |

Bänkarna är diagnos enligt grinden, men ett säkert fel på en blänkremsa var
skälet till att v4 aldrig byttes in. Därför står remsbänken här som krav för
att v5 ska vara värd att föreslå.

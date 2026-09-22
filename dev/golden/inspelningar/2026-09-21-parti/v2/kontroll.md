# Kontroll av facit v2 — åtta slumpade rutor, gjorda blint

Rutorna 270, 280, 290, 330, 390, 420, 430 och 450 beskrevs om från bilderna i
`dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/rutor/` **utan**
att någon fil i `v2/` öppnades först. Den egna tabellen ligger i
`v2/kontroll-egen.tsv` och skrevs ruta för ruta, klar innan `tabell-*.tsv`
lästes. Först därefter gjordes jämförelsen nedan.

Måtten som jämförs: antal kortrader, antal med `lage` = tappad, antal olika
bokstäver i `hog`, samt de sex siffrorna på digitalt-raden. `kort` och
`tappade` på digitalt-raden räknas som var sitt mått. **stämmer** = högst ett
mått skiljer, **avviker** = två eller fler.

## Tabellen

| Ruta | kort | tappade | högar | dig.kort | dig.tappade | granskning | cantsee | graveyard | library | Skiljer | Omdöme |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 270 | 10 / 10 | 0 / 0 | 3 / 3 | **9 / 10** | **2 / 3** | 0 / 0 | 0 / 0 | 1 / 1 | 29 / 29 | 2 | **avviker** |
| 280 | 10 / 10 | 0 / 0 | 4 / 4 | **9 / 10** | **2 / 3** | 0 / 0 | 0 / 0 | 1 / 1 | 29 / 29 | 2 | **avviker** |
| 290 | 11 / 11 | 4 / 4 | 4 / 4 | **9 / 10** | 2 / 2 | 0 / 0 | 3 / 3 | 1 / 1 | 29 / 29 | 1 | stämmer |
| 330 | 10 / 10 | 1 / 1 | 4 / 4 | 14 / 14 | 1 / 1 | 2 / 2 | 5 / 5 | 2 / 2 | 27 / 27 | 0 | stämmer |
| 390 | 11 / 11 | 0 / 0 | 4 / 4 | 13 / 13 | 4 / 4 | 0 / 0 | 5 / 5 | 1 / 1 | 26 / 26 | 0 | stämmer |
| 420 | **11 / 10** | 0 / 0 | **5 / 4** | 15 / 15 | 3 / 3 | 0 / 0 | 8 / 8 | 1 / 1 | 25 / 25 | 2 | **avviker** |
| 430 | **13 / 12** | 0 / 0 | **5 / 4** | **15 / 16** | 2 / 2 | 0 / 0 | 7 / 7 | 1 / 1 | 25 / 25 | 3 | **avviker** |
| 450 | **10 / 9** | 0 / 0 | 3 / 3 | **14 / 12** | 0 / 0 | 0 / 0 | 6 / 6 | 2 / 2 | 23 / 23 | 2 | **avviker** |

Varje cell är `min siffra / facits siffra`; feta celler är de som skiljer.
De elva skillnaderna i siffror: dig.kort −1 i 270, 280, 290 och 430;
dig.tappade −1 i 270 och 280; kort +1 i 420, 430 och 450; högar +1 i 420 och
430; dig.kort +2 i 450.

Sammanräknat: **3 av 8 rutor stämmer** (290, 330, 390), **5 avviker**
(270, 280, 420, 430, 450). Av de 72 jämförda måtten skiljer 11.

## Vilka rutor avviker — och vad som är fel i dem

Jag gick tillbaka till bilderna efter jämförelsen och avgjorde varje
avvikelse. **I fyra av fem fall var det min tabell som hade fel, inte
facit.**

### 270 och 280 — facit har rätt, jag missade ett kort

Facit: `kort=10 tappade=3`. Jag skrev `kort=9 tappade=2`.

Det digitala bordets landhög innehåller **tre** vridna kort, inte två. Det
tredje ligger helt dolt bakom den tappade grå Swampen; bara dess svarta ram
och en lodrät textremsa (kortets marginaltext, lodrät just för att kortet är
vridet) sticker ut till vänster om Swampens gråa yta, vid ungefär x 677 px i
skärmbilden. Vid stark förstoring syns två separata lodräta textkolumner
sida vid sida — en per vridet kort. Samma sak syns i 270, 280 och 290.

Min miss: jag räknade bara de kort vars framsida syntes.

### 420 — facit har rätt, jag såg en plastficka som ett extra kort

Facit: `kort=10`, 4 högar, med ett **ensamt** kort vid x 60 %. Jag skrev
`kort=11`, 5 högar, med en hög om två där.

Vid 9× förstoring är det ett enda kort i plastficka. Den ljusa ytan till
höger om kortets tryckta ram är plastfickans kant med blänk, inte ett kort
bakom. Kontrollen mot ruta 390 bekräftar det: där skrev både jag och facit
"ensamt kort" på samma plats, och kameran har bara zoomat in mellan 390 och
420.

### 430 — facit har rätt på alla tre punkterna

- `kort` 13 / 12 och `högar` 5 / 4: samma plastficka som i 420. Ett kort, inte två.
- `dig.kort` 15 / 16: facit räknar Flutterfox som ett kort, helt dolt bakom
  ?-kortet ("Reading the card…"), och skriver det uttryckligen i namnlistan.
  Det går inte att se i rutan, men Flutterfox finns på bordet både i 420 och
  i 450, så det är rimligare att räkna det än att låta bli.

### 450 — här har **facit** fel, på digitalt-raden

Facit: `dig.kort=12`. Rätt siffra är **14**. Två kort saknas i facits
räkning och i dess namnlista:

1. **En andra Swamp.** Bakom den nedtonade Swampen ligger ett till Swamp,
   förskjutet uppåt/åt höger. Det syns som en lila remsa med egen kortram,
   egen setsymbol och egen underkant — det är en färgad (alltså sedd) kopia,
   inte en skugga. Facits namnlista har bara ett `Swamp`.
2. **?-kortet "Reading the card…"** (med etiketten "Hard to read — table
   pattern"). Det är ett eget kortformat objekt som ligger ovanpå en Plains,
   inte en etikett på den. Facit räknar precis samma sorts objekt som ett
   kort i ruta 430 (`?` i namnlistan) men inte här — det är en inkonsekvens
   i facit, inte en tolkningsfråga.

Den andra avvikelsen i 450 (`kort` 10 / 9) är däremot **min** miss: högen
nere i mitten har tre kort, inte fyra. Det jag tog för en fjärde typrad är
samma typrad på det främre kortet, som lutar ~7–11° i bilden och därför ser
avbruten ut där Mesas gröna spårruta korsar den.

## Två fel till i facit som inte syns i tabellen

Båda gäller mått där min egen tabell råkade ha samma fel, så de gav ingen
skillnad i jämförelsen. De bör ändå rättas:

1. **Ruta 290, `dig.tappade=2` ska vara 3.** Det digitala bordet är oförändrat
   mellan 270 och 290 (samma namnlista, graveyard 1, library 29), och facit
   skriver själv `tappade=3` i 270 och 280. Det tredje vridna kortet ligger
   dolt bakom den tappade Swampen, precis som i 270.
2. **Rutorna 270 och 280: namnlistan har nio namn men `kort=10`.** Det tionde
   (dolda) kortet saknas i listan. Enligt formatet ska det skrivas som `?`.

## Sammanfattande bedömning

Facit v2 håller för de fyra måtten som räknas här. På fysiksidan (antal kort,
tappade, högar) är facit rätt i **alla åtta** rutorna — de tre avvikelserna
där var mina. På digitalt-raden är facit rätt i **sex av åtta**.
Det enda riktiga felet i de åtta kontrollerade rutorna är `dig.kort` i ruta
450 (12 i stället för 14), plus `dig.tappade` i ruta 290 (2 i stället för 3)
och två namnlistor i 270/280 som är en post kortare än sitt eget `kort=`.

Mönstret i felen — på båda sidor — är detsamma: **kort som ligger helt dolda
bakom ett annat kort**, och **?-kort som ligger ovanpå ett kort**. Det är där
facit ska läsas med misstro, och det är värt en regel i nästa version: när ett
korts framsida inte syns ska det ändå räknas om dess ram eller lodräta
marginaltext går att se, och ett ?-kort räknas alltid som ett kort.

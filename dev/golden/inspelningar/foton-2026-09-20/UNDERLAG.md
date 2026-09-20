# Jespers foton 2026-09-20: ljust trä, varmt ljus, plastfickor

Tagna för MES-218 (ljust trä i varmt ljus räknas som blänk), MES-219 (kort i
plastficka som klipper till vitt) och MES-220 (avvikelsegränsen mätt i två
ljus), plus material till MES-250 (kort omlott) och MES-233 (landhögar).
Golden har nästan bara svart matta — det här är ytan och ljuset som fattas.

Mappen är gitignorerad. Originalen från telefonen ska hit; filerna som ligger
här nu är chattens nerskalade kopior (1500×1125, omkomprimerade) och duger
som reserv. Recept för att göra fall av dem: *Lägga till ett nytt foto* i
`dev/golden/SNABBGUIDE.md`.

## Filerna

| Fil | Uppställning | Ljus |
|---|---|---|
| `omlott-ljus1.jpg` | omlott + hög | varmt (lampa) |
| `omlott-ljus2.jpg` | **samma** som ovan | kallare (dagsljus) |
| `utspridd.jpg` | utspridd, inga omlott, ingen hög | varmt |

De två första är ett **ljuspar**: samma kort på samma plats, bara ljuset
skiljer. Det är paret MES-220 behöver. Den utspridda saknar sitt par —
korten flyttades innan andra ljuset togs — så den blir ett eget fall.

## Facit: `omlott-ljus1.jpg` och `omlott-ljus2.jpg` (11 kort)

Bekräftat av Jesper i chatten 2026-09-20.

| Kort | Var | Ficka | Anteckning |
|---|---|---|---|
| Plains | uppe till vänster, snett | nej | |
| Fencing Ace | uppe i mitten | ja | |
| Pharika's Chosen | vänster mitt | nej | **utbränd av blänk i ljus2** — kan vara oläsbar, står kvar i facit |
| Swamp | mitten | ja | |
| Plains ×3 | uppe till höger | ja | hög med några mm förskjutning, alla tre namnrader syns |
| Resistance Reunited | nere i mitten | nej | **under** Trusty Retriever, **namnraden syns** |
| Trusty Retriever | nere i mitten | nej | ovanpå Resistance Reunited |
| Maul of the Skyclaves | nere till höger | ja | **under** Mirran Bardiche, **namnraden dold** → `"dold": true` |
| Mirran Bardiche | nere till höger | nej | ovanpå Maul of the Skyclaves |

Två sorters omlott med flit: ett par där underkortets namn går att läsa
(som equipment under en creature, MES-251) och ett där det inte gör det —
där måste klumpen delas på formen ensam.

## Facit: `utspridd.jpg` (8 kort)

Plains (utan ficka), Fencing Ace (ficka), Pharika's Chosen (blänk), Swamp
(ficka), Mirran Bardiche, Trusty Retriever, Resistance Reunited, Maul of the
Skyclaves (ficka). Inga omlott, ingen hög.

**Kontrollera:** Mirran Bardiche ligger nere till vänster på bildkanten och
kan vara avskuren. Är den det, utelämna den ur facit och skriv varför i
mappens `facit.json` — ett kort som skärs av mäts som ett halvt kort.

## Namn och lek

Alla namn finns i `dev/golden/lek.txt` (kontrollerat 2026-09-20). Basländerna
får extra konstverk av poolbygget, som i appen.

## När fallen läggs in

**Efter MES-249.** Nya fall ändrar golden-totalen, och baslinjen i
`senaste.json` stämmer inte med vad koden mäter på den här datorn förrän den
issuen är löst. Förslag på namn: `13-tra-lampa-50cm-11kort-omlott`,
`14-tra-dagsljus-50cm-11kort-omlott`, `15-tra-lampa-50cm-8kort`.

# Jespers foton 2026-09-20: ljust trä, varmt ljus, plastfickor

Tagna för MES-218 (ljust trä i varmt ljus räknas som blänk), MES-219 (kort i
plastficka som klipper till vitt) och MES-220 (avvikelsegränsen mätt i två
ljus), plus material till MES-250 (kort omlott) och MES-233 (landhögar).
Golden har nästan bara svart matta — det här är ytan och ljuset som fattas.

Mappen är gitignorerad och ligger bara i huvudarbetsträdet. Den heter sedan
MES-264 `dev/material/foton/2026-09-20-ljust-tra-varmt-ljus-plastfickor/`
(förut `dev/material/foton/2026-09-20/`). Originalen från telefonen ligger
där: 5712×4284, ~7 MB var, liggande. Recept för att göra fall av dem:
*Lägga till ett nytt foto* i `dev/golden/SNABBGUIDE.md`.

## Filerna

| Fil | Uppställning | Ljus | Blev fall |
|---|---|---|---|
| `omlott-ljus1.jpg` | omlott + hög | varmt (lampa) | 14 |
| `omlott-ljus2.jpg` | **samma** som ovan | se mätningen nedan | 15 |
| `utspridd.jpg` | utspridd, inga omlott, ingen hög | varmt | 16 |

De två första är ett **ljuspar**: samma kort på samma plats, bara ljuset
skiljer. Det är paret MES-220 behöver. Den utspridda saknar sitt par —
korten flyttades innan andra ljuset togs — så den blir ett eget fall.

**Mätt i bilderna 2026-09-20 (MES-265):** `omlott-ljus2` är inte kallare än
`omlott-ljus1` — den är **varmare**. R/B-kvoten är 2,68 mot 2,14 och
medelljuset är i praktiken lika (128 mot 129). Beskrivningen "kallare
(dagsljus)" stämmer alltså inte med bildpunkterna; det som faktiskt skiljer
tagningarna är **blänket**. Över Pharika's Chosen går medelljuset 121 → 189,
andelen mörka bildpunkter 24,4 % → 0,7 % och andelen utbrända 1,0 % → 3,0 %.
Paret duger fortfarande för MES-220 — det är två ljus på samma bord — men
det mäter blänk och färgtemperatur åt samma håll, inte varmt mot kallt.
Fallnamnet `15-tra-dagsljus-…` bär kvar det gamla ordet; byt det gärna till
`15-tra-lampa-50cm-11kort-omlott-blank` när något ändå rör mappen.

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

**Kontrollerat 2026-09-20 (MES-265): Mirran Bardiche är INTE avskuren.**
Kortet ligger helt innanför bildkanten — alla fyra kanter syns mot bordet i
originalet — men tätt: ~9 px marginal till vänsterkanten och ~7 px till
nederkanten i den 1080 px breda bilden. Det står därför kvar i facit, och
`avskurna` i fall 16 är tom. Skalar någon ner fallet med `avstand.cjs` är
det kortet att titta på först.

## Namn och lek

Alla namn finns i `dev/golden/lek.txt` (kontrollerat 2026-09-20). Basländerna
får extra konstverk av poolbygget, som i appen.

## När fallen läggs in

**Villkoret är uppfyllt.** MES-249 är stängd: svaret blev att baslinjen
stämmer och att fall 09 är en knivsegg på `ORB_EMOT`, inte en regression.
`senaste.json` är orörd och duger som domare igen.

Kvar att tänka på: **nya fall ändrar golden-totalen.** Lägg därför till
fallen och kör dem, men spara inte om baslinjen i samma steg — nya fall ska
synas som nya fall, inte som en förändring i de gamla.

Namnen är **14, 15 och 16** — inte 13. Fall 13 är MES-257:s, ur MES-246:s
inspelning, och numret står i den issuens titel:

* `14-tra-lampa-50cm-11kort-omlott`
* `15-tra-dagsljus-50cm-11kort-omlott`
* `16-tra-lampa-50cm-8kort`

Mapparna är gjorda i MES-265 (2026-09-20) med de namnen.

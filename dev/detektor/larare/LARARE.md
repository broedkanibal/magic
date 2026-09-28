# Grind 1: duger OWLv2 som lärare på riktiga spelrutor? (MES-288)

**Frågan:** när OWLv2 sätter lådor på rutor ur träningsinspelningarna —
rörelseoskärpa, händer, skärminspelningens kvalitet — blir lådorna så bra att
en liten detektor kan lära sig av dem? Stopp enligt grindarna: *lådorna missar
kort eller hamnar på händer*. Gjort 2026-09-28 på Jespers Mac.

## Svaret

**Läraren duger för det den ska göra — enskilda kort som syns — men partiet
2026-09-21 duger dåligt som träningsmaterial, och högarna måste läras på
annat sätt.**

| Fråga | Svar | Hur säkert |
|---|---|---|
| Lådor på händer? | **Nej.** 1 låda på en bar hand (en suddig hand över leken) i 14 rutor med händer. Kort som ligger *under* en hand får oftast rätt låda | ögat |
| Lådor på annat än kort? | **Ja, 9 — alla på Mesas egna ritade rutor** i skärminspelningen: graveyard-ramen (3), spårrutorna (5), library-ramen (1). En tom grön spårruta där kortet redan var borta fick en låda | ögat |
| Missar kort? | **66 av 171 kort** saknar en egen låda. 52 ligger i landhögar och kolumner omlott, 12 delvis under handen eller i bildkanten, 2 i kraftig oskärpa | ögat, antalet i högarna ungefärligt |
| Lådor över flera kort? | **18**, nästan alla över en hel landkolumn | ögat |
| Rörelseoskärpa? | Klarar sig: rutan mitt i en handrörelse (6:00) gav 7 rätta lådor och ingen på handen. Bara den extrema oskärpan (MES-139 0:55) missas | ögat |
| Tomt bord? | Inga lådor (rätt), också på den grå duken och den mönstrade | ögat |
| Tid per ruta | **12,0 s** (median, 24 rutor, fyra trådar, `nice -n 19`) | mätt |

**Det avgörande fyndet är inte läraren utan materialet.** Partiet är en
skärminspelning av *datorns* vy. Kamerabilden är bara 705 × 405 px i den
(detektorn ska tränas på ~1000 px), och varje ruta bär Mesas egna spårrutor
och graveyard-ramen inritade. En elev som tränas på de rutorna lär sig att
streckade gröna och gula rektanglar betyder "kort" — och på telefonen finns
inga sådana. Läraren ritade dessutom lådor på nio av dem.

**Förslag:** partiet används som mest som komplement i grind 2. Den riktiga
träningsdatan är Jespers nya inspelningar med kameraappen rakt av (utan
Mesas ritning, i full upplösning), som issuen redan kräver före grind 2.

## Så tittar Jesper (5 minuter)

```sh
open dev/detektor/larare/index.html
```

Sidan visar alla 24 rutor med lärarens lådor. Bilderna ligger i
`dev/material/arbete/2026-09-28-mes-288-larare/ritade/` (bara på Macen,
gitignorerat); sidan pekar dit relativt, så den fungerar både i huvudträdet
och i en worktree där `dev/material` är länkad.

| Färg | Betyder |
|---|---|
| **magenta**, `3: 0,45` | en låda läraren skulle ge som facit (nummer: poäng) |
| **orange**, `0,20 storlek` | en låda över tröskeln som storleksfiltret tog bort |
| streckat grönt, gult, rött | **Mesas egna spår**, inritade i skärminspelningen — inte lärarens |

Under varje bild står källan, tiden i inspelningen, antalet lådor och min
räkning. Titta efter kort utan magenta låda och magenta lådor på annat än
kort. Håller du inte med om räkningen: säg vilken ruta.

## Vad som gjordes

1. **Rutorna.** 24 rutor ur fem träningsmappar, bara ur mappar som
   `dev/detektor/delning.py` godkänner (skriptet stoppar annars):
   15 ur partiet 2026-09-21 (en per 1–1,5 min över hela partiet), 3 ur
   provkort pass 1, 2 ur MES-139, 2 ur MES-138 och 2 ur provkort-pacifism.
   Med händer i 14, tomt bord i 1, högar och kort omlott i de flesta av
   partiets. Kamerabilden skars ut ur appens gränssnitt, i full upplösning
   (`rutor.py`, beskärningen per källa står där).
2. **Läraren.** OWLv2 base med exakt nollprovets inställningar: de fyra
   textfrågorna, tröskel 0,16, klassoberoende NMS 0,6, storleksfiltret
   (0,4–1,6 × kortets yta) och inneslutningsregeln (`larare.py`).
   Kortets yta per källa uppskattades som medianen av lådorna med poäng
   ≥ 0,3 i källans rutor — appen vet den från uppstarten, här fanns ingen
   uppstart. Den stämmer med ögat på partiets rutor; för de små källorna
   bygger den på 1–3 lådor.
3. **Räkningen.** Jag gick igenom varje ritad ruta och räknade kort utan
   låda, lådor på annat än kort och lådor över flera kort.

### Provkort pass 1 är inte mörkt i datorns inspelning

`telefon.mp4` i pass 1 är svart hela vägen (*"The camera is on – tap to see
the picture"*), så rutorna togs ur `dator.mov`, där kamerabilden syns — men
bara 875 × 496 px, på grå duk i vanligt ljus. Mappen ger alltså inget mörkt
material. Samma sak med pacifism (704 × 375 px, och bilden skuren i höger
kant av skärmen).

## Per ruta

Kolumnerna: **lådor** = magenta lådor; **kort** ≈ kort i bild (egna +
saknas); **egna** = kort med en egen låda; **saknas** = kort utan egen låda;
**flera** = lådor över två eller fler kort; **lek** = lådor på leken (library);
**annat** = lådor på annat än kort. Allt utom *lådor* är räknat med ögat.

| # | Källa och tid | Vad man ser | Lådor | Kort | Egna | Saknas | Flera | Lek | Annat | Anmärkning |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | partiet 1:00 | få kort, början av partiet | 4 | 2 | 2 | 0 | 0 | 1 | 1 | graveyard-ramen (Mesas ritade ruta, tom) fick en låda |
| 2 | partiet 3:00 | hand som lägger ett kort | 7 | 7 | 3 | 4 | 1 | 1 | 2 | Mesas gröna spårruta på handleden och graveyard-ramen fick lådor; två kort delvis under handen föll på storleksfiltret; landhögen blev en låda |
| 3 | partiet 4:00 | hand i kanten, landhögar | 10 | 10 | 8 | 2 | 0 | 1 | 1 | en tom grön spårruta (kortet redan borta) fick en låda |
| 4 | partiet 5:00 | underarm över bordet | 8 | 9 | 5 | 4 | 1 | 1 | 1 | spårrutan på underarmen fick en låda; korten under armen föll på storleksfiltret |
| 5 | partiet 6:00 | rörelseoskärpa, hand i farten | 7 | 9 | 7 | 2 | 0 | 0 | 0 | lådor på korten under den suddiga handen, ingen på handen |
| 6 | partiet 7:00 | stilla, landhögar och kort omlott | 10 | 10 | 7 | 3 | 1 | 1 | 1 | graveyard-ramen fick en låda; kort som sticker fram under andra saknas |
| 7 | partiet 8:00 | många kort, flera omlott och tappade | 9 | 12 | 6 | 6 | 2 | 1 | 0 | tappade länder omlott: två lådor över flera kort |
| 8 | partiet 9:30 | hand över högarna | 10 | 10 | 8 | 2 | 1 | 0 | 1 | en låda på den suddiga handen över leken |
| 9 | partiet 11:00 | stilla, fullt bord | 10 | 13 | 7 | 6 | 2 | 1 | 0 | landkolumnerna: en låda över hela kolumnen, de enskilda korten föll på storleksfiltret |
| 10 | partiet 13:00 | kort omlott uppe till vänster, högar | 14 | 14 | 12 | 2 | 1 | 1 | 0 | bäst av partiets rutor: också kort omlott får egna lådor |
| 11 | partiet 13:30 | hand mitt i bild | 10 | 12 | 8 | 4 | 0 | 1 | 1 | Mesas röda spårruta över handen fick en låda; kort under handen saknas |
| 12 | partiet 15:00 | hand och oskärpa | 9 | 10 | 6 | 4 | 2 | 0 | 1 | spårrutan runt handen som bär ett kort fick en låda (kortet i handen fick en egen) |
| 13 | partiet 16:30 | sent i partiet, täta högar | 11 | 14 | 8 | 6 | 2 | 1 | 0 | ett tappat land längst ner utan låda; swamp-kolumnen en låda |
| 14 | partiet 18:30 | stilla, fullt bord | 12 | 14 | 8 | 6 | 2 | 1 | 0 | två nästan lika lådor på samma land (1 dubblett) |
| 15 | partiet 19:30 | kort i rörelse uppe till höger | 8 | 17 | 4 | 13 | 3 | 1 | 0 | tre landkolumner blev tre lådor — sämst av rutorna |
| 16 | pass 1 0:00 | tomt bord (grå duk) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | inga lådor (rätt) |
| 17 | pass 1 0:18 | ett kort på duken | 1 | 1 | 1 | 0 | 0 | 0 | 0 | |
| 18 | pass 1 0:36 | hand som lägger provkortet | 1 | 1 | 1 | 0 | 0 | 0 | 0 | kortet under handen hittas; handen och Mesas stora gröna ram utan låda (rätt) |
| 19 | MES-139 0:10 | hand, kortask och ett kort | 1 | 1 | 1 | 0 | 0 | 0 | 0 | kortasken och handen utan låda (rätt) |
| 20 | MES-139 0:55 | kraftig oskärpa, hand med kort | 0 | 1 | 0 | 1 | 0 | 0 | 0 | lådan på kortet föll på storleksfiltret |
| 21 | MES-138 0:00 | hand över graveyard och library | 1 | 1 | 1 | 0 | 0 | 0 | 0 | graveyard-kortet under handen, poäng 0,18 |
| 22 | MES-138 0:24 | leken i plastfickor på library-platsen | 3 | 1 | 1 | 0 | 0 | 1 | 1 | en låda på leken, en på Mesas library-ram |
| 23 | pacifism 0:12 | hand med provkortet, mönstrad duk | 1 | 1 | 1 | 0 | 0 | 0 | 0 | handen utan låda (rätt) |
| 24 | pacifism 0:24 | hand som lägger ett kort | 0 | 1 | 0 | 1 | 0 | 0 | 0 | kortet under handen missas |
| | **Alla 24** | | **147** | **≈171** | **105** | **66** | **18** | **13** | **10** | 1 dubblett |

Av de 147 lådorna: 105 på ett eget kort, 18 över flera kort, 13 på leken,
10 på annat (9 av dem Mesas ritning, 1 en hand), 1 dubblett.

Nollprovet gav 62 av 66 egna kort på golden-fotona. Här blir det 105 av
~171 — lägre för att partiets bord är tätare (landkolumner med fyra–fem kort
omlott) och kamerabilden hälften så stor. Talen går inte att jämföra rakt:
där fanns ritat facit, här är det min räkning.

## Vad som behöver rättas innan lådorna blir träningsfacit

| Problem | Hur ofta | Förslag |
|---|---|---|
| **Mesas ritning i bilden** (spårrutor, graveyard-ramen, library-ramen) | i varje ruta ur partiet och MES-138; 9 lådor | använd inspelningar utan ritning: kameraappen rakt av, eller telefonens bild utan överlägg. Går inte att tvätta bort ur partiet i efterhand |
| **Leken (library)** får en låda i nästan varje ruta (poäng 0,23–0,38) | 13 | ett beslut: egen klass *lek*, eller maska bort library-platsen (appen vet var den är). Som vanligt kort lär den eleven att en hög baksidor är ett kort |
| **Landkolumner blir en låda**, och de enskilda korten, där bara en remsa syns, faller på storleksfiltret (< 0,4 × kortet) | 18 lådor över flera; ~52 kort utan låda | det är nollprovets kända gräns, *kortet under i högen*. Ta bort lådor som innehåller två eller fler andra kort (en regel att pröva), och låt de syntetiska borden lära högarna, som planen redan säger |
| **Delvis dolda kort** (under handen, i kanten) faller på storleksfiltret | ~12 | ett kort utan låda blir en *negativ* för eleven: "det här är inte ett kort". Släpp storleksfiltrets undre gräns för lådor som når bildkanten eller en hand, eller maska dem ur förlusten |
| Händer | 1 låda på bar hand | inget filter behövs |

## Hur mycket träningsmaterial finns?

Mätt med `dubbletter.py`: en ruta varannan sekund ur varje träningsvideo,
kamerabilden nerskalad till 96 px gråskala, och en ruta räknas som **ny**
när den skiljer sig från den senast behållna med mer än *N* gråsteg i snitt.

| Källa | Rutor (var 2 s) | Nya vid > 2 | > 4 | > 8 |
|---|---|---|---|---|
| partiet 2026-09-21 (0:50–19:50) | 571 | 385 | 338 | 258 |
| provkort pass 1 | 28 | 28 | 25 | 22 |
| MES-139 | 29 | 19 | 18 | 11 |
| MES-138 | 19 | 12 | 8 | 5 |
| provkort-pacifism | 28 | 25 | 25 | 25 |
| **alla** | **675** | **469** | **414** | **321** |

**Omkring 300–470 olika rutor**, varav partiet 260–385. Talen är snarare
för höga än för låga: Mesas spårrutor blinkar och flyttar sig i
skärminspelningarna, så två rutor med samma bord kan räknas som olika, och
kornet i den grå duken gör detsamma i pass 1 och pacifism. De fyra små
källorna har dessutom bara ett eller två kort var.

**Tiden på Macen:** 12,0 s per ruta ger **~65–95 minuter** för 321–469
rutor (en kväll, med `nice -n 19` och efter golden). Tusen rutor tar
3 h 20 min.

**Det räcker inte till grind 2:s ~500 bilder av rätt sort.** Partiet är
en enda uppställning (svart matta, lampa, samma lek) med ritning i bilden.
Jespers 3–5 nya träningsfilmer på 5–10 min med kameraappen ger vid en ruta
var 2 s 450–1 500 rutor före dubblettrensning, utan ritning och i full
upplösning — det är de som gör grind 2 meningsfull.

## Mätt och bedömt

| Mätt (går att räkna om) | Bedömt med ögat |
|---|---|
| lådorna, poängen och antalet per ruta (`owlv2.json`, `lador.json`) | kort i bild, egna, saknas, flera, lek, annat — min räkning av de ritade bilderna |
| tiden per ruta, 12,0 s median | att händer inte får lådor, att oskärpan klaras |
| antalet nya rutor per källa (`dubbletter.py`) | att dubblettalen är för höga på grund av Mesas ritning |
| kortets yta per källa (median av lådor ≥ 0,3) | att den stämmer |

Inget här är mätt mot ritat facit. Rutorna är träningsmaterial och får inte
ritas som prov.

## Kör om

Venv som i `NOLLPROV.md` (torch 2.2.2, transformers). Vikterna ligger i
Hugging Face-cachen efter nollprovet.

```sh
python dev/detektor/larare/rutor.py kandidater      # kandidatrutor var 5–30 s, för att välja
python dev/detektor/larare/rutor.py valj            # de 24 valda (VAL i rutor.py) → rutor/ + rutor.json
sh dev/detektor/vanta-golden.sh                      # aldrig samtidigt med golden
nice -n 19 python dev/detektor/larare/larare.py kor  # OWLv2 → owlv2.json, ~12 s per ruta
python dev/detektor/larare/larare.py rita            # filtren, ritade/, lador.json och index.html
python dev/detektor/larare/dubbletter.py             # hur många olika rutor materialet ger
```

Allt under `dev/material/arbete/2026-09-28-mes-288-larare/` (gitignorerat).
`ruta.swift` tar rutor i full upplösning med AVFoundation — OpenCV kan inte
söka i skärminspelningarna, och `dev/rutor.swift` skalar ner helbilden.

# Händelsefacit ur ett riktigt spel — passet 2026-09-22

Jespers inspelning: 1x, telefonen 34 cm över mattan, normalt tempo, 4 min
46 s. Han sa högt vad han gjorde i varje steg, och det är rösten som är
facit. Ingen agent har tolkat bilden här.

| Fil | Vad |
|---|---|
| `handelser.tsv` | **facit**, granskat av Jesper mot filmen 2026-09-23: en rad per handling, i tidsordning |
| `handelser-utkast.tsv` | utkastet före granskningen, kvar för att se vad som rättades |
| `tal.tsv` | råvaran: alla 67 yttranden med start och slut, som Whisper hörde dem |
| `../../granska.html` | granskningssidan: videon bredvid listan, klick på en rad spolar dit |

Källfilerna ligger utanför git i
`dev/material/inspelningar/2026-09-22-1x-34cm-normaltempo/`: `telefon.MP4`
(skärminspelning av Mesas kameravy), `dator.mov` (det digitala bordet) och
`kamera.mp4` (bara mattan, utklippt och omkodad som golden-videorna).

**Filmerna i takt:** datorns inspelning startar 22,05 s efter telefonens,
mätt ur ljudet. Alla tider i facit är telefonens.

## Hur tiderna kom till

Ljudstyrkan gav 67 yttranden. Varje yttrande klipptes ut och skrevs ut för
sig med whisper.cpp (modellen large-v3-turbo, lokalt), så att modellen inte
kunde hitta på något i tystnaden. Tiden är **där meningen börjar**, alltså
strax efter att handen släppte. Golden tål en halv sekunds fel: ett namn
räknas som svar på ett utspel om det kom tidigast två sekunder före tiden i
facit.

Klappen vid 21,84 s är synkpunkten mellan de två filmerna.

## Kolumnerna

| Kolumn | Vad |
|---|---|
| `t` | sekund i telefonens film |
| `handelse` | `spelar`, `grav_till_bord` (ur graveyard ut på bordet — som `spelar`, och graveyardhögen minskar), `tappar`, `otappar`, `flyttar`, `tar_bort`, plus `drar`, `grav_till_hand`, `grav_exile`, `klapp`, `slut` |
| `kort` | kortnamnet, som i `dev/golden/lek.txt` |
| `till` | för `tar_bort`: `grav`, `hand`, `exile`, `ur_bild`. För `spelar` och `flyttar`: kortet det är **fäst vid i spelet** (utrustning, aura) — oavsett om det ligger över eller under på mattan. I granskningssidan: "fäst vid (i spelet)" |
| `plats` | var det **fysiskt ligger**: ensamt eller vilken hög, och överst/under — aldrig ett kortnamn. I granskningssidan: "ligger på mattan". Se ordlistan nedan |
| `osaker` | något att avgöra i filmen; tomt betyder avgjort |
| `tal` | vad Jesper sa, ordagrant, plus anteckningar |

### Ordlistan för `plats`

Fem begrepp räcker. Mer detalj om var på mattan ett kort ligger hör hemma i
stillbilderna, inte här.

| Värde | När |
|---|---|
| `ensamt` | kortet rör inget annat kort |
| `ovanpå` / `under` | kortet är fäst vid kortet i `till` och ligger ovanpå eller under det. Ett fäst par är ingen hög |
| `hög A` | läggs staplat i en hög som redan finns — kort som bara ligger ihop utan att vara fästa, som länder |
| `ny hög D` | läggs omlott på ett kort som låg ensamt, så att en hög föds |
| `…, under` / `…, överst` | läggs till när lagret spelar roll: ett kort under ett annat får sällan namn |

Två regler: **en hög behåller sin bokstav hela filmen**, också när den
flyttas, och **slås två högar ihop** skrivs `hög A + B ihop` en gång, sedan
`hög A`. I det här passet är `hög A` landhögen nere i mitten.

Fyll i `plats` för allt som heter Swamp eller Plains, för kort som läggs
omlott, och för utrustning. Ett kort med unikt namn som ligger för sig
behöver den inte.

### Händelser som inte syns på bordet

`drar` (library minskar), `grav_till_hand` och `grav_exile` (graveyardhögen
minskar) står med för att siffrorna under högarna ska gå att kontrollera.
De räknas inte som handlingar på mattan.

## Fästa kort som tappas

Facit följer mattan, inte reglerna: vrids kreaturet och utrustningen
följer med, blir det två `tappar`-rader med samma tid, en per kort som
ligger vridet. Spegelläget ska visa bordet som det ser ut, och kameran
läser tap ur hur kortet ligger (beslut av Jesper 2026-09-23).

## En hög som flyttas

En rad per kort i högen, samma tid, `flyttar`, samma bokstav i `plats` och
inget i `till`: korten ligger bara staplade. I granskningssidan gör knappen
"+ resten av hög A" raderna åt en.

## Ett par som flyttas ihop

En rad per kort som rörde sig, med samma tid. Bordet har två kortobjekt och
båda ska följa med; ett vanligt fel är att bara det översta gör det. Att
korten sitter ihop syns på att utrustningens rad har kreaturet kvar i
`till`.

## Vad som återstår

Fyra rader är markerade i `osaker` och väntar på Jespers granskning, plus de
två `otappar Swamp` vid 2:22 och 3:23 där högen inte sades högt. När listan
är godkänd blir den `facit.json` för ett golden-fall, och stillbilder med
rutor läggs till för lägesmåtten.

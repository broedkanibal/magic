# Nattpasset 2026-09-25 — morgonrapporten

Skrivs löpande av orkestreraren under natten. Instruktionen:
`dev/plan/orkestrering-natt-2026-09-25.md`; loggen steg för steg:
`dev/plan/natt-2026-09-25-logg.md`.

## Kort sagt

Passet pågår.

* **Steg 0 är klart.** Jespers ritade facit ligger i golden (afa24cb). Det avslöjade **ett fel namn** i fall 14 som fanns redan före; det följs upp i MES-296.
* **MES-293 är ute i produktionen** (4f11291): tap-läget ändras bara vid tydlig dom, och skalan fryses efter uppstarten. Issuen står i **Provas**, eftersom dess egen mätning kräver ett nytt parti och 20°-gränsen behöver ditt beslut.
* **MES-232 är inte ihopslagen.** Stödregeln är bättre i vanligt ljus men ger **3 nya fel namn** när ljuset ändras. Mätningen visade också att **produktionen i dag ger 6 fel namn i sju ljus med lärda referenser, mot 0 utan dem.** Ditt beslut, med val A–D på MES-232; förslaget är att stänga av lärda referenser tills en variant klarar sju ljus.
* **Våg 2** (MES-291 nedtoningen, MES-289 lekfotot) startade 05:35.

## Klart och ihopslaget

| Issue | Vad | Commit | Före → efter |
|---|---|---|---|
| MES-286 (steg 0) | Jespers ritade facit för golden 03–06 och 13–15, ny baslinje för alla 16 fallen. Ingen kodändring | afa24cb | se *Ändringar i golden-baslinjen* |
| MES-293 (i **Provas**) | Tap-läget ändras bara vid tydlig dom: ett korts mått och högst 20° från grundläget. Skalan fryses till provkortets mått när uppstarten är klar | 4f11291 | Golden: namn 49/97 lika, fel namn bara MES-296, falska 3, plats 40/76, tap **37 → 38/40**; 0 fel namn i sju ljus och utan leken; bänken 154 OK. Passet 09-22: tap-domar som vände tillbaka **11 → 1**, falska vridningar **4 → 2**, skalan bytt **15 → 1** gång. Sämre: Pharika's Chosen (tappad 20–22° snett) visas inte längre tappad; `diff_tappade` 1,00 → 1,42 (ett räknemått, se MES-293); golden 13 tap 3/3 → 2/3 (två Plains i en hög) |

## Inte klart

| Issue | Var det stannade | Gren |
|---|---|---|
| MES-232 (i **Provas**) | Stödregeln byggd och mätt. I vanligt ljus: golden med lärda 34 → 35/59 och 14 → 16/38, inga nya fel, `--utan-leken` med lärda 2 → 1 fel. I sju ljus med lärda: rätt 332 → 353, **fel namn 6 → 7** (3 nya, 2 rättade). Slås inte ihop | `mes-232-larda-stod` på GitHub |

## Väntar på Jesper

| Issue | Vad som behövs |
|---|---|
| MES-296 (ny, Backlog) | **Ett beslut.** I golden 14 ligger Trusty Retriever ovanpå Resistance Reunited; bara namnraden på det undre kortet syns. Kameran ser högen som ett kort och ger det det undre kortets namn, säkert. Ska golden räkna det som **fel namn** (så gör den nu, det strängare valet) eller som ett **missat kort**? Och ska det rättas i spärren (namnraden ger inte ett säkert namn mot bildens förslag) eller i delningen (MES-250)? |
| MES-286 | Videorna i ritverktyget. Fotona är klara |
| MES-232 (Provas) | **Ett beslut: hur ska kamerans egna foton (lärda referenser) användas?** I dag är de på i appen och ger 6 fel namn i sju ljus, mot 0 utan dem. **A. Stäng av dem** tills en variant klarar sju ljus (förslaget; redan mätt som vanlig golden). B. Ta bort dem ur bildmodellens rangordning men behåll dem för ORB (omätt). C. Stödregeln med en spärr för basländer, eftersom alla nya fel var land (omätt). D. Behåll som i dag. MES-290 väntar på det här |
| MES-293 (Provas) | **Ett parti och ett beslut.** (1) Spela ett parti med telefonen: v2-mätningen (tappade kort på bordet mot mattan) kräver en telefoninspelning, och det finns ingen av partiet 2026-09-21. (2) 20°-gränsen: Pharika's Chosen låg tappad 20–22° snett och visas inte längre som tappad. Behåll 20°, eller vidga till exempel till 25°? |

## Ändringar i golden-baslinjen

| Commit | Vad | Varför |
|---|---|---|
| afa24cb | 16 fall, samma kamerakod: hittade 64/93 → 64/97 · plats 10/10 → **40/76** · namn 50/93 → 49/97 · **fel namn 0 → 1** · falska 6 → **3** · tappad 10/10 → **37/40** | Jespers ritade facit (MES-286). Fler synliga kort; plats och tap mäts nu i 03–06 och 13–15. 13: tokens och library har egna hörn (falska 3 → 0). 14: fel namnet ovan, som det gamla facit (en namnlista) inte kunde se. Bruset kontrollerades: 01, 02, 07–12 och 16 var tecken för tecken lika |

## Att veta om mätningen

* **Poolen kan bli ofullständig utan att det syns.** Får Scryfall 429 skrivs en trasig pool (29 kort i stället för 114) in i profilen, och nästa körning i samma profil läser bara tillbaka den utan att varna. Steg 0-agenten märkte det och bytte profil. Nattens agenter har fått regeln "läs raden Poolen och byt profil om den är kort". Att golden inte vägrar köra på en halv pool är samma sorts kontroll som ljuger som MES-260.

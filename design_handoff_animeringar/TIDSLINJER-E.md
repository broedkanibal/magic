# Tidslinjerna — E · Lugn matta

Genererad ur `src3/spec3.js` av `node gen3.mjs` — samma data som prototypen kör. Ändra inte här.
Besluten bakom står i `dev/plan/spegelmattan-principer.md`. D:s tidslinjer står i `TIDSLINJER.md`.

Läses som D:s tabeller: **t** i ms från att mattan får beskedet, nycklar `t: värde`, easing per segment, `nu` = där egenskapen står. **svag** = hoppas över om egenskapen redan rör sig. **ring** = bara när den gröna ringen är på.

| Easing | CSS |
|---|---|
| UT | `cubic-bezier(.2,.8,.3,1)` |
| FLY | `cubic-bezier(.4,0,.2,1)` |
| SOFT | `cubic-bezier(.3,.7,.3,1)` |
| OUT | `ease-out` |
| IN | `ease-in` |
| INOUT | `ease-in-out` |
| LIN | `linear` |

| Egenskap | Betyder |
|---|---|
| framkallning | 0→1: kamerans foto i kortets unika ytor (namn, bild, typrad, text, P/T), suddigt. Ramen runt dem är skarp. 1 = oframkallat, 0 = kortets riktiga bild |
| zoom, utsnitt | mattans zoomsteg (100 %, 86 %, 75 % = hela kamerabilden) och vilken del av bordet den visar |
| övriga | som i D |

## E · Lugn matta

### Utspel

**Namnet kommer i tid → kortet läggs ned**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · opacitet | 0: 0 → 90: 1 | LIN |  |
| kortet · position | 0: platsen + 90 px mot spelaren → 330: nya platsen | UT |  |
| kortet · skala | 0: 1,08 → 260: 1,02 → 330: 0,985 → 400: 1 | OUT, UT, UT |  |
| kortet · skugga | 0: 1 → 200: 1 → 330: 0 | LIN, IN |  |
| kortet · grön ring | 330: 0 → 1030: 1 | OUT | ring |

**Namnet dröjer → det oframkallade kortet läggs ned**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · opacitet | 0: 0 → 90: 1 | LIN |  |
| kortet · position | 0: platsen + 90 px mot spelaren → 330: nya platsen | UT |  |
| kortet · skala | 0: 1,08 → 260: 1,02 → 330: 0,985 → 400: 1 | OUT, UT, UT |  |
| kortet · skugga | 0: 1 → 200: 1 → 330: 0 | LIN, IN |  |

**Namnet kommer → kortet framkallas**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · framkallning | 0: nu → 300: 0 | OUT |  |
| kortet · skala | 0: nu → 150: 1,015 → 300: 1 | INOUT, INOUT | svag |
| kortet · grön ring | 300: 0 → 1000: 1 | OUT | ring |

### Knuff

**Kortet knuffas förbi dödzonen**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · position | 0: nu → 220: nya platsen | UT |  |

### Flytt

**Kortet vilar på en ny plats → bärs dit**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · skugga | 0: nu → 90: 1 → 320: 1 → 450: 0 | OUT, LIN, IN |  |
| kortet · skala | 0: nu → 90: 1,05 → 320: 1,05 → 390: 0,985 → 450: 1 | OUT, LIN, UT, UT |  |
| kortet · position | 0: nu → 420: nya platsen | FLY |  |

### Till handen, och valen efteråt

**Platsen är tom och händerna borta → till handen**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · skugga | 0: nu → 90: 1 → 450: 1 | OUT, LIN |  |
| kortet · skala | 0: nu → 90: 1,05 → 450: 0,96 | OUT, FLY |  |
| kortet · position | 0: nu → 450: under nederkanten | FLY |  |
| kortet · opacitet | 0: 1 → 280: 1 → 450: 0 | LIN, LIN |  |

**"Still on the table" → tillbaka**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · opacitet | 0: 0 → 120: 1 | LIN |  |
| kortet · skugga | 0: 1 → 320: 1 → 450: 0 | LIN, IN |  |
| kortet · skala | 0: 1,05 → 320: 1,05 → 390: 0,985 → 450: 1 | LIN, UT, UT |  |
| kortet · position | 0: under nederkanten → 420: kortets plats | FLY |  |

**"Library" → till library-högen**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · opacitet | 0: 0 → 100: 1 → 380: 1 → 450: 0 | LIN, LIN, LIN |  |
| kortet · position | 0: under nederkanten → 450: library-högen | FLY |  |
| kortet · skala | 0: 1 → 450: högens storlek | FLY |  |
| library-högen · skala | 450: 1,04 → 570: 0,99 → 670: 1 | UT, UT |  |

### Till graveyard

**Graveyard-högen växer**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · skugga | 0: nu → 90: 1 → 300: 1 → 400: 0 | OUT, LIN, IN |  |
| kortet · skala | 0: nu → 90: 1,05 → 400: högens storlek | OUT, FLY |  |
| kortet · position | 0: nu → 400: högen | FLY |  |
| kortet · vridning | 0: nu → 200: -4° → 400: 0° | FLY, UT |  |
| kortet · graveyard-ton | 240: 0 → 400: 1 | LIN |  |
| kortet · opacitet | 400: 0 | direkt |  |
| högens toppkort · opacitet | 400: 1 | direkt |  |
| högens toppkort · skala | 400: 1,04 → 520: 0,99 → 620: 1 | UT, UT |  |
| högens ring · skala | 400: 0,5 → 950: 1,5 | OUT |  |
| högens ring · opacitet | 400: 0,7 → 950: 0 | OUT |  |
| högens tal · skala | 400: 1 → 568: 1,18 → 820: 1 | UT, UT |  |

### Tap och untap

**Kameran är säker: tappat**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · vridning | 0: nu → 240: 90° | SOFT |  |
| kortet · skala | 0: nu → 120: 1,03 → 240: 1 | INOUT, INOUT | svag |
| kortet · skugga | 0: nu → 120: 0,5 → 240: 0 | INOUT, INOUT | svag |

**Kameran är säker: otappat**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · vridning | 0: nu → 240: 0° | SOFT |  |
| kortet · skala | 0: nu → 120: 1,03 → 240: 1 | INOUT, INOUT | svag |
| kortet · skugga | 0: nu → 120: 0,5 → 240: 0 | INOUT, INOUT | svag |

### Zoomsteg

**Kortet får inte plats → ett zoomsteg ut**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| mattan · zoom | 0: nu → 500: nya zoomsteget | UT |  |
| mattan · utsnitt x | 0: nu → 500: nya utsnittet | UT |  |
| mattan · utsnitt y | 0: nu → 500: nya utsnittet | UT |  |

## Minskad rörelse (prefers-reduced-motion)

### Utspel

**Namnet kommer i tid → kortet läggs ned**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · position | 0: nya platsen | direkt |  |
| kortet · opacitet | 0: 0 → 200: 1 | LIN |  |
| kortet · grön kant | 200: 0,8 → 900: 0 | LIN | ring |

**Namnet dröjer → det oframkallade kortet läggs ned**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · position | 0: nya platsen | direkt |  |
| kortet · opacitet | 0: 0 → 200: 1 | LIN |  |

**Namnet kommer → kortet framkallas**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · framkallning | 0: nu → 300: 0 | LIN |  |
| kortet · grön kant | 300: 0,8 → 1000: 0 | LIN | ring |

### Knuff

**Kortet knuffas förbi dödzonen**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · opacitet | 0: 1 → 80: 0,4 → 200: 1 | LIN, LIN |  |
| kortet · position | 80: nya platsen | direkt |  |

### Flytt

**Kortet vilar på en ny plats → bärs dit**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · opacitet | 0: 1 → 150: 0 → 350: 1 | LIN, LIN |  |
| kortet · position | 150: nya platsen | direkt |  |

### Till handen, och valen efteråt

**Platsen är tom och händerna borta → till handen**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · opacitet | 0: 1 → 200: 0 | LIN |  |
| kortet · position | 200: under nederkanten | direkt |  |

**"Still on the table" → tillbaka**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · position | 0: kortets plats | direkt |  |
| kortet · opacitet | 0: 0 → 200: 1 | LIN |  |

**"Library" → till library-högen**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| library-högen · skala | 0: 1 | direkt |  |

### Till graveyard

**Graveyard-högen växer**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · opacitet | 0: 1 → 200: 0 | LIN |  |
| högens toppkort · opacitet | 0: 0 → 200: 1 | LIN |  |

### Tap och untap

**Kameran är säker: tappat**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · opacitet | 0: 1 → 100: 0,3 → 240: 1 | LIN, LIN |  |
| kortet · vridning | 100: 90° | direkt |  |

**Kameran är säker: otappat**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · opacitet | 0: 1 → 100: 0,3 → 240: 1 | LIN, LIN |  |
| kortet · vridning | 100: 0° | direkt |  |

### Zoomsteg

**Kortet får inte plats → ett zoomsteg ut**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| mattan · opacitet | 0: 1 → 150: 0,35 → 400: 1 | LIN, LIN |  |
| mattan · zoom | 150: nya zoomsteget | direkt |  |
| mattan · utsnitt x | 150: nya utsnittet | direkt |  |
| mattan · utsnitt y | 150: nya utsnittet | direkt |  |

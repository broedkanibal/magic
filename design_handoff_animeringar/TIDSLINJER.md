# Tidslinjerna — D · När kameran vet

Genererad ur `src2/spec.js` av `node gen2.mjs` — samma data som artboardsen kör. Ändra inte här.
Sida 1:s varianter (I dag, A, B, C) står i `TIDSLINJER-sida1.md`.

**Principen (Jesper 2026-09-25):** inga laddlägen. Bordet visar bara det kameran vet, och varje ändring är en enda rörelse från det gamla läget till det nya.

- Ett nytt kort syns först när namnet finns, och läggs då ned. Platshållaren ("Reading the card…") visas inte.
- Ett kort kameran tappat står kvar orört tills den vet var det hamnade (upp till 5 s). Sedan bärs det dit i en rörelse.
- Till graveyard flyger kortet direkt när högen växer, utan att tonas först, och landar som högens toppkort.

Så läses tabellerna:
- **t** räknas i ms från kamerans uppdatering.
- **Nycklar** skrivs `t: värde`. En enda nyckel betyder att värdet sätts direkt.
- **Easing** gäller segmentet som börjar vid nyckeln. `nu` = där egenskapen står när spåret börjar.
- **Avbrott:** ett spår som tar över en egenskap som redan rör sig börjar från `nu`. För position, vridning och skala tas farten med: första segmentet blir `cubic-bezier(x1, k·x1, x2, y2)`, `k = v·T/Δ`, med x1 ≥ 0,15 och k·x1 inom −1,2…3.
- **svag** = spåret hoppas över om egenskapen redan rör sig. Tap mitt i en flytt tar alltså inte över skalan.

| Easing | CSS | Ursprung |
|---|---|---|
| UT | `cubic-bezier(.2,.8,.3,1)` | appens landning och settle (cLand, cSettle) |
| FLY | `cubic-bezier(.4,0,.2,1)` | flygturen till graveyard (flygTillGrav) |
| SOFT | `cubic-bezier(.3,.7,.3,1)` | mjuk vridning utan överslag |
| OUT | `ease-out` |  |
| IN | `ease-in` |  |
| INOUT | `ease-in-out` |  |
| LIN | `linear` | |
| STEP | hopp vid segmentets slut | |

| Egenskap | Betyder i CSS |
|---|---|
| position | `translate(x, y)` i brädets px (mattans zoom ovanpå) |
| skala | `scale()` kring kortets mitt |
| vridning | `rotate()`; 90° = tappat |
| opacitet | hela kortets `opacity` |
| skugga | opaciteten på ett eget lager med `box-shadow: 0 26px 40px -12px #000f` (.card.held) |
| nedtoning | 0→1 = `grayscale(0→.8) brightness(1→.55)` + streckad kant `#e8b33a88` (.card.lyft) |
| graveyard-ton | 0→1 = `grayscale(0→.6) brightness(1→.55) contrast(1→1.05)`, samma som högens toppkort, så att bytet inte syns |
| grön ring | 0→1 = nypuls: en grön yta `#5fbf7f` bakom kortet som växer 0→12 px och tonas .53→0 |
| grön kant | minskad rörelse: en fast kant `0 0 0 3px #5fbf7f` som tonas |
| högens toppkort / ring / tal | graveyard-högen: settle, cRing och cBump (GRAVEYARD_ANIMATION.md §3) |

## D · När kameran vet

### Utspel

**Kameran ser något** — Ingenting visas. Kameran vet inte vad det är än — kortet dyker upp när namnet finns.

**Kameran frågar Claude** — Ingenting visas än. Namnet kan dröja upp till 5 s.

**Namnet kommer**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · opacitet | 0: 0 → 90: 1 | LIN |  |
| kortet · position | 0: platsen + 90 px mot spelaren → 330: nya platsen | UT |  |
| kortet · skala | 0: 1,08 → 260: 1,02 → 330: 0,985 → 400: 1 | OUT, UT, UT |  |
| kortet · skugga | 0: 1 → 200: 1 → 330: 0 | LIN, IN |  |
| kortet · grön ring | 330: 0 → 1030: 1 | OUT |  |

### Knuff (kameran har kortet hela tiden)

**Kortet knuffas**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · position | 0: nu → 220: nya platsen | UT |  |

### Flytt

**Kameran tappar kortet** — Ingenting ändras. Kortet står kvar där det låg tills kameran vet var det hamnade.

**Kameran ser något** — Ingenting visas. Kameran vet inte vad det är än — kortet dyker upp när namnet finns.

**Kameran vet nya platsen**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · skugga | 0: nu → 90: 1 → 320: 1 → 450: 0 | OUT, LIN, IN |  |
| kortet · skala | 0: nu → 90: 1,05 → 320: 1,05 → 390: 0,985 → 450: 1 | OUT, LIN, UT, UT |  |
| kortet · position | 0: nu → 420: nya platsen | FLY |  |

### Flytt som avbryts halvvägs (210 ms in i flytten)

**Ny rapport mitt i flytten**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · position | 0: nu → 320: rättade platsen | FLY |  |
| kortet · skala | 0: nu → 180: 1,05 → 260: 0,985 → 320: 1 | LIN, UT, UT |  |
| kortet · skugga | 0: nu → 180: 1 → 300: 0 | LIN, IN |  |
| kortet · vridning | 0: nu → 240: 90° | SOFT |  |

### Nedtonat efter 5 s

**Väntan slut**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · nedtoning | 0: 0 → 480: 1 | INOUT |  |

### Tillbaka

**Kameran känner igen kortet**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · nedtoning | 0: 1 → 240: 0 | OUT |  |
| kortet · skala | 0: nu → 90: 1,03 → 300: 1 | OUT, UT |  |
| kortet · skugga | 0: 0 → 90: 0,6 → 300: 0 | OUT, IN |  |

**Kameran känner igen kortet, på ny plats**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · nedtoning | 0: 1 → 200: 0 | OUT |  |
| kortet · skugga | 0: nu → 90: 1 → 320: 1 → 450: 0 | OUT, LIN, IN |  |
| kortet · skala | 0: nu → 90: 1,05 → 320: 1,05 → 390: 0,985 → 450: 1 | OUT, LIN, UT, UT |  |
| kortet · position | 0: nu → 420: nya platsen | FLY |  |

### Till graveyard

**Graveyard-högen växer**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · skugga | 0: nu → 90: 1 → 300: 1 → 400: 0 | OUT, LIN, IN |  |
| kortet · skala | 0: nu → 90: 1,05 → 400: högens storlek (0,8) | OUT, FLY |  |
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

## Minskad rörelse (prefers-reduced-motion)

### Utspel

**Kameran ser något** — Ingenting visas. Kameran vet inte vad det är än — kortet dyker upp när namnet finns.

**Kameran frågar Claude** — Ingenting visas än. Namnet kan dröja upp till 5 s.

**Namnet kommer**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · position | 0: nya platsen | direkt |  |
| kortet · opacitet | 0: 0 → 200: 1 | LIN |  |
| kortet · grön kant | 200: 0,8 → 900: 0 | LIN |  |

### Knuff (kameran har kortet hela tiden)

**Kortet knuffas**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · opacitet | 0: 1 → 80: 0,4 → 200: 1 | LIN, LIN |  |
| kortet · position | 80: nya platsen | direkt |  |

### Flytt

**Kameran tappar kortet** — Ingenting ändras. Kortet står kvar där det låg tills kameran vet var det hamnade.

**Kameran ser något** — Ingenting visas. Kameran vet inte vad det är än — kortet dyker upp när namnet finns.

**Kameran vet nya platsen**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · opacitet | 0: 1 → 150: 0 → 350: 1 | LIN, LIN |  |
| kortet · position | 150: nya platsen | direkt |  |

### Flytt som avbryts halvvägs (210 ms in i flytten)

**Ny rapport mitt i flytten**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · opacitet | 0: nu → 100: 0 → 250: 1 | LIN, LIN |  |
| kortet · position | 100: rättade platsen | direkt |  |
| kortet · vridning | 100: 90° | direkt |  |

### Nedtonat efter 5 s

**Väntan slut**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · nedtoning | 0: 0 → 480: 1 | LIN |  |

### Tillbaka

**Kameran känner igen kortet**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · nedtoning | 0: 1 → 240: 0 | LIN |  |

**Kameran känner igen kortet, på ny plats**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · opacitet | 0: 1 → 150: 0 → 350: 1 | LIN, LIN |  |
| kortet · position | 150: nya platsen | direkt |  |
| kortet · nedtoning | 150: 0 | direkt |  |

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

# Tidslinjerna — sida 1 (I dag, A, B, C)

Genererad ur `src/spec.js` av `node gen.mjs` — samma data som artboardsen kör. Ändra inte här.

- **t** räknas i ms från kamerans uppdatering (inte från handen).
- **Nycklar**: `t: värde`. En enda nyckel = värdet sätts direkt.
- **Easing** gäller segmentet som börjar vid nyckeln. `nu` = där egenskapen står när spåret börjar.
- **Avbrott**: ett spår som tar över en egenskap som redan rör sig börjar från `nu`. För position, vridning och skala tas farten med: första segmentets easing blir `cubic-bezier(x1, k·x1, x2, y2)`, `k = v·T/Δ`, med x1 ≥ 0,15 och k·x1 inom −1,2…3.
- **svag** = spåret hoppas över om egenskapen redan animeras (tap mitt i en flytt tar inte över skalan).

| Easing | CSS | Ursprung |
|---|---|---|
| UT | `cubic-bezier(.2,.8,.3,1)` | appens landning och settle (cLand, cSettle, graveyard-högen) |
| HF | `cubic-bezier(.3,.75,.25,1)` | flygturen ur solfjädern till mattan (hfFlyg, 480 ms) |
| FLY | `cubic-bezier(.4,0,.2,1)` | flygturen till graveyard (flygTillGrav, 340 ms) |
| OS | `cubic-bezier(.34,1.4,.5,1)` | .card-transitionen i dag: tap med överslag |
| SOFT | `cubic-bezier(.3,.7,.3,1)` | mjuk vridning utan överslag (ny) |
| OUT | `ease-out` |  |
| IN | `ease-in` |  |
| INOUT | `ease-in-out` |  |
| LIN | `linear` | |
| STEP | hopp vid segmentets slut | |

| Egenskap | Betyder i CSS |
|---|---|
| position | `translate(x, y)` i brädets px (mattans zoom ovanpå) |
| lyft i y | extra `translateY`, bara platshållarens landning |
| skala | `scale()` kring kortets mitt |
| vridning | `rotate()`; 90° = tappat |
| opacitet | hela kortets `opacity` |
| skugga | opaciteten på ett eget lager med `box-shadow: 0 26px 40px -12px #000f` (.card.held) |
| framsida / platshållare | opaciteten på bilden / på platshållarens skimmer (.plats) |
| nedtoning | 0→1 = `grayscale(0→.8) brightness(1→.55)` på bilden + streckad kant `#e8b33a88` (.card.lyft) |
| grön ring | 0→1 = nypuls: en grön yta `#5fbf7f` bakom kortet som växer 0→12 px och tonas .53→0 |
| grön kant | minskad rörelse: fast kant `0 0 0 3px #5fbf7f` som tonas |
| framsidan skannas / skannerlinje | C: `clip-path: inset(0 0 (1−v)·100% 0)` och en 3 px ljus linje vid kanten |
| sökarhörn / hörnens skala | C: fyra hörnvinklar 10 px utanför kortet; vita medan kameran läser, gröna när den vet |
| högens toppkort / ring / tal | graveyard-högen: cLand, cRing, cBump (GRAVEYARD_ANIMATION.md §3) |


## A · Stilla

Väntan innan nedtoning: **5 s** (MES-291). Graveyard-högen som växer avbryter väntan.

### Utspel

**Platshållaren syns**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| platshållaren · opacitet | 0: 0 → 180: 1 | OUT |  |
| platshållaren · skala | 0: 0,96 → 180: 1 | UT |  |

**Namnet kommer**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · framsida | 0: 0 → 220: 1 | OUT |  |
| kortet · platshållare | 0: 1 → 220: 0 | LIN |  |
| kortet · grön ring | 0: 0 → 900: 1 | OUT |  |

### Flytt

**Kameran tappar kortet** — ingenting rör sig.

**Platshållaren syns**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| platshållaren · opacitet | 0: 0 → 180: 1 | OUT |  |
| platshållaren · skala | 0: 0,96 → 180: 1 | UT |  |

**Namnet kommer: samma kort, ny plats**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · position | 0: nu → 380: nya platsen | HF |  |
| platshållaren · opacitet | 220: 1 → 380: 0 | LIN |  |

### Flytt som avbryts halvvägs

**Ny rapport mitt i flytten**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · position | 0: nu → 320: rättade platsen | HF |  |
| platshållaren · position | 0: nu → 320: rättade platsen | HF |  |
| kortet · vridning | 0: nu → 200: 90° | UT |  |

### Nedtonat efter väntan

**Väntan slut: nedtonat**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · nedtoning | 0: 0 → 480: 1 | INOUT |  |

### Tillbaka

**Namnet kommer: det nedtonade kortet**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · nedtoning | 0: 1 → 240: 0 | OUT |  |
| platshållaren · opacitet | 0: 1 → 160: 0 | LIN |  |

**Namnet kommer: det nedtonade kortet, ny plats**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · position | 0: nu → 380: nya platsen | HF |  |
| kortet · nedtoning | 0: 1 → 380: 0 | OUT |  |
| platshållaren · opacitet | 220: 1 → 380: 0 | LIN |  |

### Till graveyard

**Graveyard-högen växer**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · position | 0: nu → 340: högen | FLY |  |
| kortet · skala | 0: 1 → 340: 0,751 | FLY |  |
| kortet · vridning | 0: nu → 340: -12° | FLY |  |
| kortet · opacitet | 0: 1 → 340: 0,15 → 341: 0 | FLY, STEP |  |
| högens toppkort · opacitet | 200: 0 → 700: 1 | UT |  |
| högens toppkort · lyft i y | 200: -40 → 500: 4 → 700: 0 | UT, UT |  |
| högens toppkort · skala | 200: 1,14 → 500: 0,98 → 700: 1 | UT, UT |  |
| högens ring · skala | 200: 0,5 → 750: 1,5 | OUT |  |
| högens ring · opacitet | 200: 0,7 → 750: 0 | OUT |  |
| högens tal · skala | 200: 1 → 368: 1,18 → 620: 1 | UT, UT |  |

### Tap och untap

**Kameran är säker: tappat**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · vridning | 0: nu → 200: 90° | UT |  |

**Kameran är säker: otappat**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · vridning | 0: nu → 200: 0° | UT |  |

## B · Handen

Väntan innan nedtoning: **5 s** (MES-291). Graveyard-högen som växer avbryter väntan.

### Utspel

**Platshållaren syns**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| platshållaren · opacitet | 0: 0 → 120: 1 | LIN |  |
| platshållaren · lyft i y | 0: -18 → 180: 2 → 300: 0 | UT, UT |  |
| platshållaren · skala | 0: 1,06 → 180: 0,99 → 300: 1 | UT, UT |  |
| platshållaren · skugga | 0: 1 → 300: 0 | UT |  |

**Namnet kommer**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · framsida | 0: 0 → 200: 1 | OUT |  |
| kortet · platshållare | 0: 1 → 200: 0 | LIN |  |
| kortet · grön ring | 0: 0 → 900: 1 | OUT |  |

### Flytt

**Kameran tappar kortet** — ingenting rör sig.

**Platshållaren syns**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| platshållaren · opacitet | 0: 0 → 120: 1 | LIN |  |
| platshållaren · lyft i y | 0: -18 → 180: 2 → 300: 0 | UT, UT |  |
| platshållaren · skala | 0: 1,06 → 180: 0,99 → 300: 1 | UT, UT |  |
| platshållaren · skugga | 0: 1 → 300: 0 | UT |  |

**Namnet kommer: samma kort, ny plats**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · skugga | 0: nu → 100: 1 → 300: 1 → 420: 0 | OUT, LIN, IN |  |
| kortet · skala | 0: nu → 100: 1,05 → 300: 1,05 → 380: 0,985 → 450: 1 | OUT, LIN, UT, UT |  |
| kortet · position | 0: nu → 420: nya platsen | FLY |  |
| platshållaren · opacitet | 300: 1 → 400: 0 | LIN |  |

### Flytt som avbryts halvvägs

**Ny rapport mitt i flytten**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · position | 0: nu → 320: rättade platsen | FLY |  |
| platshållaren · position | 0: nu → 320: rättade platsen | HF |  |
| kortet · skala | 0: nu → 170: 1,05 → 250: 0,985 → 320: 1 | LIN, UT, UT |  |
| kortet · skugga | 0: nu → 170: 1 → 290: 0 | LIN, IN |  |
| kortet · vridning | 0: nu → 240: 90° | SOFT |  |

### Nedtonat efter väntan

**Väntan slut: nedtonat**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · nedtoning | 0: 0 → 520: 1 | INOUT |  |
| kortet · skala | 0: 1 → 520: 0,975 | INOUT |  |

### Tillbaka

**Namnet kommer: det nedtonade kortet**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · nedtoning | 0: 1 → 260: 0 | OUT |  |
| kortet · skala | 0: nu → 150: 1,02 → 300: 1 | UT, UT |  |
| platshållaren · opacitet | 0: 1 → 160: 0 | LIN |  |

**Namnet kommer: det nedtonade kortet, ny plats**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · nedtoning | 0: 1 → 200: 0 | OUT |  |
| kortet · skugga | 0: nu → 100: 1 → 300: 1 → 420: 0 | OUT, LIN, IN |  |
| kortet · skala | 0: nu → 100: 1,05 → 300: 1,05 → 380: 0,985 → 450: 1 | OUT, LIN, UT, UT |  |
| kortet · position | 0: nu → 420: nya platsen | FLY |  |
| platshållaren · opacitet | 300: 1 → 400: 0 | LIN |  |

### Till graveyard

**Graveyard-högen växer**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · skugga | 0: nu → 80: 1 | OUT |  |
| kortet · skala | 0: nu → 80: 1,04 → 360: högens storlek (0,8) | OUT, FLY |  |
| kortet · position | 0: nu → 360: högen | FLY |  |
| kortet · vridning | 0: nu → 180: -6° → 360: 0° | FLY, UT |  |
| kortet · opacitet | 360: 0 | direkt |  |
| högens toppkort · opacitet | 360: 1 | direkt |  |
| högens toppkort · skala | 360: 1,06 → 540: 0,985 → 660: 1 | UT, UT |  |
| högens ring · skala | 360: 0,5 → 910: 1,5 | OUT |  |
| högens ring · opacitet | 360: 0,7 → 910: 0 | OUT |  |
| högens tal · skala | 360: 1 → 528: 1,18 → 780: 1 | UT, UT |  |

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

## C · Kameran

Väntan innan nedtoning: **5 s** (MES-291). Graveyard-högen som växer avbryter väntan.

### Utspel

**Platshållaren syns**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| platshållaren · opacitet | 0: 0 → 140: 1 | LIN |  |
| platshållaren · sökarhörn | 0: 0 → 220: 1 | UT |  |
| platshållaren · hörnens skala | 0: 1,12 → 220: 1 | UT |  |

**Namnet kommer**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · framsidan skannas | 0: 0 → 280: 1 | FLY |  |
| kortet · skannerlinje | 0: 0 → 280: 1 | FLY |  |
| kortet · platshållare | 0: 1 → 280: 0 | LIN |  |
| kortet · sökarhörn | 0: 1 → 1100: 1 → 1400: 0 | LIN, OUT |  |

### Flytt

**Kameran tappar kortet**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · sökarhörn | 1500: 0 → 1900: 0,45 | INOUT |  |
| kortet · hörnens skala | 1500: 1,06 → 1900: 1 | INOUT |  |

**Platshållaren syns**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| platshållaren · opacitet | 0: 0 → 140: 1 | LIN |  |
| platshållaren · sökarhörn | 0: 0 → 220: 1 | UT |  |
| platshållaren · hörnens skala | 0: 1,12 → 220: 1 | UT |  |

**Namnet kommer: samma kort, ny plats**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · position | 0: nu → 360: nya platsen | HF |  |
| spåret · opacitet | 0: 0,7 → 600: 0 | OUT |  |
| platshållaren · opacitet | 200: 1 → 360: 0 | LIN |  |
| kortet · sökarhörn | 0: nu → 120: 0,8 → 1000: 0,8 → 1300: 0 | LIN, LIN, OUT |  |

### Flytt som avbryts halvvägs

**Ny rapport mitt i flytten**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · position | 0: nu → 300: rättade platsen | HF |  |
| platshållaren · position | 0: nu → 300: rättade platsen | HF |  |
| kortet · vridning | 0: nu → 220: 90° | UT |  |

### Nedtonat efter väntan

**Väntan slut: nedtonat**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · nedtoning | 0: 0 → 480: 1 | INOUT |  |
| kortet · sökarhörn | 0: nu → 480: 0 | LIN |  |

### Tillbaka

**Namnet kommer: det nedtonade kortet**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · nedtoning | 0: 1 → 280: 0 | OUT |  |
| kortet · skannerlinje | 0: 0 → 280: 1 | FLY |  |
| platshållaren · opacitet | 0: 1 → 160: 0 | LIN |  |
| kortet · sökarhörn | 0: nu → 120: 0,8 → 900: 0,8 → 1200: 0 | LIN, LIN, OUT |  |

**Namnet kommer: det nedtonade kortet, ny plats**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · nedtoning | 0: 1 → 360: 0 | OUT |  |
| kortet · position | 0: nu → 360: nya platsen | HF |  |
| spåret · opacitet | 0: 0,7 → 600: 0 | OUT |  |
| platshållaren · opacitet | 200: 1 → 360: 0 | LIN |  |
| kortet · sökarhörn | 0: nu → 120: 0,8 → 1000: 0,8 → 1300: 0 | LIN, LIN, OUT |  |

### Till graveyard

**Graveyard-högen växer**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · sökarhörn | 0: nu → 120: 0 | LIN |  |
| spåret · opacitet | 0: 0,7 → 600: 0 | OUT |  |
| kortet · position | 0: nu → 340: högen | FLY |  |
| kortet · skala | 0: 1 → 340: 0,751 | FLY |  |
| kortet · vridning | 0: nu → 340: -12° | FLY |  |
| kortet · opacitet | 0: 1 → 340: 0,15 → 341: 0 | FLY, STEP |  |
| högens toppkort · opacitet | 200: 0 → 700: 1 | UT |  |
| högens toppkort · lyft i y | 200: -40 → 500: 4 → 700: 0 | UT, UT |  |
| högens toppkort · skala | 200: 1,14 → 500: 0,98 → 700: 1 | UT, UT |  |
| högens ring · skala | 200: 0,5 → 750: 1,5 | OUT |  |
| högens ring · opacitet | 200: 0,7 → 750: 0 | OUT |  |
| högens tal · skala | 200: 1 → 368: 1,18 → 620: 1 | UT, UT |  |

### Tap och untap

**Kameran är säker: tappat**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · vridning | 0: nu → 220: 90° | UT |  |

**Kameran är säker: otappat**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · vridning | 0: nu → 220: 0° | UT |  |

## Minskad rörelse (A, B och C)

Väntan innan nedtoning: **5 s** (MES-291). Graveyard-högen som växer avbryter väntan.

### Utspel

**Platshållaren syns**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| platshållaren · opacitet | 0: 0 → 150: 1 | LIN |  |

**Namnet kommer**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · framsida | 0: 0 → 200: 1 | LIN |  |
| kortet · platshållare | 0: 1 → 200: 0 | LIN |  |
| kortet · grön kant | 0: 0,8 → 900: 0 | LIN |  |

### Flytt

**Kameran tappar kortet** — ingenting rör sig.

**Platshållaren syns**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| platshållaren · opacitet | 0: 0 → 150: 1 | LIN |  |

**Namnet kommer: samma kort, ny plats**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · opacitet | 0: 1 → 150: 0 → 350: 1 | LIN, LIN |  |
| kortet · position | 150: nya platsen | direkt |  |
| platshållaren · opacitet | 150: 1 → 350: 0 | LIN |  |

### Flytt som avbryts halvvägs

**Ny rapport mitt i flytten**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · opacitet | 0: nu → 100: 0 → 250: 1 | LIN, LIN |  |
| kortet · position | 100: rättade platsen | direkt |  |
| platshållaren · position | 100: rättade platsen | direkt |  |
| kortet · vridning | 100: 90° | direkt |  |

### Nedtonat efter väntan

**Väntan slut: nedtonat**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · nedtoning | 0: 0 → 480: 1 | LIN |  |

### Tillbaka

**Namnet kommer: det nedtonade kortet**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · nedtoning | 0: 1 → 240: 0 | LIN |  |
| platshållaren · opacitet | 0: 1 → 160: 0 | LIN |  |

**Namnet kommer: det nedtonade kortet, ny plats**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · opacitet | 0: 1 → 150: 0 → 350: 1 | LIN, LIN |  |
| kortet · position | 150: nya platsen | direkt |  |
| kortet · nedtoning | 150: 0 | direkt |  |
| platshållaren · opacitet | 150: 1 → 350: 0 | LIN |  |

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

## I dag

Väntan innan nedtoning: **0,7 s** (BORTA_NAD 600 + lyftT 100)

### Utspel

**Platshållaren syns**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| platshållaren · opacitet | 0: 1 | direkt |  |

**Namnet kommer**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · framsida | 0: 1 | direkt |  |
| kortet · platshållare | 0: 0 | direkt |  |
| kortet · grön ring | 0: 0 → 1400: 1 | OUT |  |

### Flytt

**Kameran tappar kortet** — ingenting rör sig.

**Platshållaren syns**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| platshållaren · opacitet | 0: 1 | direkt |  |

**Namnet kommer: samma kort, ny plats**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · position | 0: nya platsen | direkt |  |
| kortet · nedtoning | 0: 0 | direkt |  |
| platshållaren · opacitet | 0: 0 | direkt |  |

### Flytt som avbryts halvvägs

**Ny rapport mitt i flytten**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · position | 0: rättade platsen | direkt |  |
| platshållaren · position | 0: rättade platsen | direkt |  |
| kortet · vridning | 0: nu → 340: 90° | OS |  |

### Nedtonat efter väntan

**Väntan slut: nedtonat**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · nedtoning | 0: 1 | direkt |  |

### Tillbaka

**Namnet kommer: det nedtonade kortet**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · nedtoning | 0: 0 | direkt |  |
| platshållaren · opacitet | 0: 0 | direkt |  |

**Namnet kommer: det nedtonade kortet, ny plats**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · position | 0: nya platsen | direkt |  |
| kortet · nedtoning | 0: 0 | direkt |  |
| platshållaren · opacitet | 0: 0 | direkt |  |

### Till graveyard

**Graveyard-högen växer**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · nedtoning | 0: 0 | direkt |  |
| kortet · position | 0: nu → 340: högen | FLY |  |
| kortet · skala | 0: 1 → 340: 0,751 | FLY |  |
| kortet · vridning | 0: nu → 340: -12° | FLY |  |
| kortet · opacitet | 0: 1 → 340: 0,15 → 341: 0 | FLY, STEP |  |
| högens toppkort · opacitet | 0: 0 → 500: 1 | UT |  |
| högens toppkort · lyft i y | 0: -40 → 300: 4 → 500: 0 | UT, UT |  |
| högens toppkort · skala | 0: 1,14 → 300: 0,98 → 500: 1 | UT, UT |  |
| högens ring · skala | 0: 0,5 → 550: 1,5 | OUT |  |
| högens ring · opacitet | 0: 0,7 → 550: 0 | OUT |  |
| högens tal · skala | 0: 1 → 168: 1,18 → 420: 1 | UT, UT |  |

### Tap och untap

**Kameran är säker: tappat**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · vridning | 0: nu → 340: 90° | OS |  |

**Kameran är säker: otappat**

| Mål · egenskap | Nycklar (ms: värde) | Easing | |
|---|---|---|---|
| kortet · vridning | 0: nu → 340: 0° | OS |  |

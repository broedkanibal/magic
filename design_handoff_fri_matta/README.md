# Handoff: fri matta — bordsvyn i Mesa byggd som en yta i stället för zoner

## Overview

Bordsvyn i `index.html` ersätts. I dag ligger korten i zoner (`Permanents`, `Lands`, nedre bandet)
och appen bestämmer var varje kort hamnar. I den nya vyn är brädet **en enda fri yta** — en matta —
där varje kort ligger exakt där användaren lade det, i skala, med zoom och panorering. Kameran får
fortfarande bara lägga till och vrida kort; den flyttar aldrig och tar aldrig bort något.

Designen heter **Direction C v3 — Real board** och är sista iterationen av tre riktningar
(A: direkt beröring, B: pressa kanterna, C: fri matta). Bara C v3 ska byggas.

Sex saker skiljer v3 från de tidigare C-iterationerna: mana som ligger omlott i båda led,
graveyard som fälls ut till en solfjäder på hover, förmågor som **utskrivna ord** i stället för
ikoner, P/T med bas och totalsumma bredvid varandra, counters i valfri storlek, och ett bräde utan
rutnät eller zonrutor.

**Rollout:** den nya vyn **ersätter** dagens bordsvy. Ingen flagga, ingen parallell vy.

## About the Design Files

Filerna i paketet är **designreferenser skrivna i HTML** — prototyper som visar avsett beteende.
De är **inte** produktionskod som ska kopieras in. `index.html` är en enda fil med vanilla JS, egna
CSS-variabler och `render*()`-funktioner som skriver `innerHTML`; bygg vidare i den strukturen. Inget
ramverk, inget bygge, inga nya beroenden.

Designfilerna hämtar kortbilder direkt från `api.scryfall.com/cards/named?exact=…&format=image`
enbart för att mockupen ska visa riktiga kort. **I appen används `imgOf(card, faceIndex, size)`
och den befintliga Scryfall-cachen** — rör inte hämtningslagret.

## Fidelity

**Beteendetrogen, inte pixeltrogen.** Måtten och formlerna nedan är exakta och ska följas eftersom
layouten hänger på dem (kortstorlekar, stackförskjutningar, zoomgränser). Färger, radier och
typografi ska däremot tas ur repots egna CSS-variabler — mockupen är satt i sina egna hexvärden och i
Archivo, appen har `--sans` och sin egen palett. Mappning finns under *Design Tokens*.

## Vad som ändras mot koden som ligger live i dag

| # | I dag | Efter |
| --- | --- | --- |
| 1 | Zoner (`.brade`, `.zon-perm`, `.lands`) bestämmer var kort hamnar; `renderGrid()` / `renderMana()` räknar fram platser | En yta med absolut positionerade kort. Kortets `x`/`y` är sanning. |
| 2 | `computeFit()` krymper `--cardw` så allt ryms | Fast kortstorlek, ytan växer i stället; zoom/pan gör att man kommer åt allt |
| 3 | Ingen zoom | Scroll = zooma över hela brädet, drag på tom yta = panorera när inzoomad, `fit`-knapp återställer |
| 4 | Land grupperas per färg i manaraden | Land som släpps på land bildar en hög, omlott i **båda** led |
| 5 | Förmågor visas som text i hover-etiketten | Förmågorna står som **ord på kortet**, upp till tre + `+N` |
| 6 | `+1/+1`-counters som en siffra | Counters i valfri storlek (`+1/+0`, `+7/+7`, negativa), en lista per kort |
| 7 | P/T visas en gång; counters visas både uppe och nere | En P/T-bricka: **bas → totalsumma** bredvid varandra. Counterlistan bara i inspektorn. |
| 8 | Graveyard är en hög man klickar på för att öppna `#gravOv` | Högen fälls ut till en **solfjäder på hover**; hovrat kort ger Return to play / Exile |
| 9 | Rutnät och zonramar ritas | Inget rutnät, inga zonrutor — Battlefield och Lands är samma yta |

Punkt 1 och 2 är den enda riktigt stora ändringen. **Du avgör själv efter att ha läst koden** om
zonerna ska rivas helt eller behållas som ett tunt lager, och om `localStorage`-formatet ska migreras
eller utökas bakåtkompatibelt. Det enda kravet: ett kort som en gång lagts på en plats ska ligga kvar
där mellan omladdningar.

## Vad som inte får röras

- **Topbaren** och dess knappar
- **Footern** med kortkommandon
- **Scryfall-hämtningen och cachen** (`imgOf()`, kortdata, bildindex)
- **Kameralogiken och detekteringen** — inklusive regeln att kameran bara lägger till och vrider

## Geometri och viewport

Brädet är en yta som är större än fönstret. Mattan är fönstret mot den.

```js
const CW = 178, CH = 248;   // permanent, px
const LW = 128, LH = 178;   // land, px
const VPW = 1060, VPH = 792; // mattans synliga yta i designen — läs av i appen i stället

// Ytan skalas efter hur mycket kortyta som ligger på den, med tre gångers luft.
function boardFor(cards) {
  const need = cards.reduce((a, c) => a + (c.kind === 'land' ? LW * LH : CW * CH), 0) * 3;
  const s = Math.max(1, Math.sqrt(need / (VPW * VPH)));
  return { w: Math.round(VPW * s), h: Math.round(VPH * s) };
}

// Ytan växer när kort kommer till men KRYMPER ALDRIG av sig själv —
// annars hoppar hela bordet varje gång ett kort går till graveyarden.
function grown(cards, current) {
  const b = boardFor(cards);
  return { w: Math.max(current.w, b.w), h: Math.max(current.h, b.h) };
}

const fitZoom = b => Math.max(0.3, Math.min(1, Math.min(VPW / b.w, VPH / b.h)));

function clampPan(pan, z, b) {
  const minX = Math.min(0, VPW - b.w * z), minY = Math.min(0, VPH - b.h * z);
  return { x: Math.max(minX, Math.min(0, pan.x)), y: Math.max(minY, Math.min(0, pan.y)) };
}
```

Zoomen har `fit` som undre gräns och `1.8` som övre. `zoomManual === null` betyder "följ fit" — sätt
tillbaka den till `null` så fort användaren zoomar ut till fit igen, så att chippet kan visa
`"78 % fit"` i grönt och `"140 %"` i gult.

Hjulet zoomar mot pekaren, shift eller horisontellt hjul panorerar:

```js
function onWheel(ev) {
  ev.preventDefault();
  const r = vpEl.getBoundingClientRect();
  const mx = ev.clientX - r.left, my = ev.clientY - r.top;
  if (ev.shiftKey || Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) {
    const d = ev.shiftKey ? ev.deltaY : ev.deltaX;
    setPan(clampPan({ x: pan.x - d, y: pan.y }, z, board));
    return;
  }
  const nz = Math.max(fit, Math.min(1.8, z * Math.exp(-ev.deltaY * 0.0016)));
  const bx = (mx - pan.x) / z, by = (my - pan.y) / z;   // punkten under pekaren, i brädkoordinater
  setZoom(nz <= fit + 0.004 ? null : nz);
  setPan(clampPan({ x: mx - bx * nz, y: my - by * nz }, nz, board));
}
```

Ytan renderas som **ett** element med `transform: translate(panX, panY) scale(z)` och
`transform-origin: 0 0`. Korten ligger i brädkoordinater inuti den. Övergången är `none` under
drag och hjul, och `.32s cubic-bezier(.2,.8,.3,1)` när zoomknapparna eller `fit` används — annars
släpar zoomen efter pekaren.

`fit`-knappen: `zoomManual = null; pan = {x:0,y:0}`.

## Kort på mattan

- Otappat kort: `width` × `height` enligt `CW/CH` respektive `LW/LH`, `border-radius` 10 px (permanent) / 8 px (land)
- Tappat kort: **samma element**, `transform: rotate(90deg)`. Träffytan räknas roterad:

```js
function rect(c) {
  const s = size(c);
  if (!c.tapped) return { x: c.x, y: c.y, w: s.w, h: s.h };
  const cx = c.x + s.w / 2, cy = c.y + s.h / 2;
  return { x: cx - s.h / 2, y: cy - s.w / 2, w: s.h, h: s.w };
}
```

- Allt som ligger i kortets hörn (P/T, förmågor, chippar) roteras tillbaka med
  `transform: rotate(-90deg)` och rätt `transform-origin` (`0 100%` nere till vänster,
  `100% 100%` nere till höger). **Ett tappat kort ska ha kvar P/T och alla förmågor, läsbara upprätt.**
- Drag: `pointerdown` på kortet, `pointermove` flyttar, `pointerup` släpper. Rör man mindre än
  4 px räknas det som ett klick = tappa/untappa.
- **Det man drar hamnar alltid överst** (`z = ++topZ` vid `pointerdown`). Hover får aldrig ändra
  z-ordningen — annars försvinner kortet man siktade på under sina grannar.
- Klamp: kortet får inte hamna utanför ytan, och inte under graveyard-panelen. Panelen ligger still i
  mattan, så dess ruta räknas om till brädkoordinater innan jämförelsen:

```js
function gravRect(pan, z) {
  return { x0: (6 - pan.x) / z, x1: (146 - pan.x) / z,
           y0: (508 - pan.y) / z, y1: (740 - pan.y) / z };
}
```
Krockar kortet med rutan flyttas det åt det håll som är kortast — upp om det är närmare, annars
höger om panelen.

## Mana som ligger omlott

Två land som överlappar tillräckligt mycket bildar en hög. **Ändringen i v3:** förskjutningen är
större nedåt än förut (mindre överlapp) och det finns en tydlig förskjutning i sidled.

```js
const STACK = 74;   // synlig kant nedåt per kort (var 52)
const XSTEP = 17;   // förskjutning i sidled per kort (var 4)
const PER_STACK = 4; // kort per hög innan en ny hög börjar
```

Placeringen i en hög: `x = base.x + i * XSTEP`, `y = base.y + i * STACK`, `z = 200 + i`.

Träff mot en befintlig hög avgörs på **arean som överlappar**, inte på avstånd:

```js
function findJoin(cards, id) {
  const me = cards.find(c => c.id === id);
  if (!me || me.kind !== 'land') return null;
  const rm = rect(me);
  let best = null, bestOv = 0.24;           // minst 24 % av kortets yta
  for (const o of cards) {
    if (o.id === id || o.kind !== 'land') continue;
    const ro = rect(o);
    const ix = Math.max(0, Math.min(rm.x + rm.w, ro.x + ro.w) - Math.max(rm.x, ro.x));
    const iy = Math.max(0, Math.min(rm.y + rm.h, ro.y + ro.h) - Math.max(rm.y, ro.y));
    const ov = ix * iy / (rm.w * rm.h);
    if (ov > bestOv) { bestOv = ov; best = o; }
  }
  return best ? best.id : null;
}
```

Under draget lyser målhögen upp (`2.5px solid` accent + `inset 0 0 0 5px` accent-tint) och det dragna
kortet får en chip: *"Let go — the mana stacks here"*. Vid släpp läggs kortet sist i högen och hela
högen räknas om från sitt basläge. En hög med bara ett kort upphör att vara en hög.

Varje kort i högen ska gå att tappa där det ligger — det är därför den synliga kanten är 74 px och
inte 52. Automatisk stackning (`Stack the mana`, och `Tidy up`) lägger `PER_STACK` kort per kolumn och
låter kolumnerna ligga `LW + (PER_STACK − 1) · XSTEP + 40` px isär.

## Förmågor som ord

Ikonerna är borttagna. Nyckelorden hämtas ur Scryfalls `keywords` och skrivs ut nere till vänster på
kortet, ett per rad, upp till tre — finns fler blir sista raden `+N`.

- Kolumn: `left:6px; bottom:6px; display:flex; flex-direction:column; gap:3px; align-items:flex-start`
- Varje ord: `padding:2px 6px`, `font: 700 9px/1.3` versaler, `letter-spacing:.7px`,
  mörk platta med 1 px ram, `white-space:nowrap`
- `pointer-events:none`, och roteras upprätt på tappade kort

Gradienten i kortets nederkant höjs från 36 till **44 px** för permanents så orden alltid har botten
under sig. Land och oidentifierade kort får inga ord.

## P/T: bas → totalsumma

En enda bricka nere till höger. Utan counters: `2/3` i vitt. Med counters: basen i dämpad grå, en
pil, och totalen i grönt — `1/1 → 3/3`. Ramen blir grön när kortet är förstärkt.

```js
const sum = (c.cts || []).reduce((a, k) => ({ p: a.p + k.p, t: a.t + k.t }), { p: 0, t: 0 });
const base  = hasBase ? `${i.pow}/${i.tou}` : '';
const total = hasBase && (sum.p || sum.t) ? `${i.pow + sum.p}/${i.tou + sum.t}` : '';
```

**Counters skrivs inte längre på kortet.** Den gamla `+1/+1 ×2`-chippen uppe till vänster är borttagen
— summan står redan i totalen, och detaljen finns i inspektorn.

## Counters i valfri storlek

Datamodellen byter från ett tal till en lista, så att `+1/+0`, `+0/+1`, `+7/+7` och negativa
counters alla ryms:

```js
c.cts = [{ p: 1, t: 1 }, { p: 7, t: 7 }];   // ersätter c.counters: 2
const ctLabel = k => (k.p >= 0 ? '+' + k.p : k.p) + '/' + (k.t >= 0 ? '+' + k.t : k.t);
```

Migrering av gammal data: `cts = Array.from({length: counters}, () => ({p:1, t:1}))`.

Panelen öppnas från `+`-knappen i hover-pillen eller från kontextmenyns *Counters…* och innehåller,
i den ordningen:

1. Rubrik `Counters on <namn>` och underrad `Now +8/+8 from counters` / `No counters on it yet`
2. Fyra snabbval i ett 2×2-rutnät: `+1/+1`, `+1/+0`, `+0/+1`, `+2/+2`
3. **Any amount** — två stegare (`P` och `T`, intervall −20…20) och knappen `Add +7/+7 counter`
4. **On the card** — en bricka per unik counter med antal (`+1/+1 ×2`); klick tar bort en
5. `Done`

Summan visas alltid med tecken. Panelen stängs vid drag, panorering, lasso och när ett annat kort
markeras.

## Graveyard som solfjäder

Högen ligger nere till vänster i mattan (`left:22px; top:526px`, kortbredd 104 px, `aspect-ratio 488/680`).
Bakom det översta kortet ritas upp till fyra lager med `translate(k·steg, −k·steg) rotate(k·1.5deg)`.

**Solfjädern öppnas på hover, inte på klick.** Och animationen ska läsas som att det är just de kort
som ligger i högen som far ut: varje kort i solfjädern startar **exakt ovanpå högen** med
`transform: none` och glider till sin plats med stagger.

```js
// Öppna: rendera korten först, sätt sedan utfällt läge nästa frame så transitionen går.
function fanOpenNow() {
  clearTimeout(closeT);
  setState({ fanOpen: true });
  setTimeout(() => setState({ fanOn: true }), 24);
}
// Stäng: fäll ihop först, avmontera sedan.
function fanCloseSoon() {
  closeT = setTimeout(() => {
    setState({ fanOn: false, fanHover: null });
    setTimeout(() => setState({ fanOpen: false }), 240);
  }, 130);
}

// Per kort i högen (i = 0 överst):
const fStep = n > 1 ? Math.min(96, 828 / (n - 1)) : 0;  // sidled, krymper när högen växer
const t  = n > 1 ? i / (n - 1) : 0;
const dx = i * fStep;
const dy = -64 - Math.sin(t * Math.PI) * 30 - (hovered ? 20 : 0);  // grund båge uppåt
const a  = -9 + t * 18;                                            // −9° till +9°
transform  = fanOn ? `translate(${dx}px,${dy}px) rotate(${a}deg) scale(${hovered ? 1.1 : 1})` : 'none';
transition = `transform .3s cubic-bezier(.2,.9,.3,1) ${i * 22}ms`;
```

Solfjäderns behållare ligger på **samma plats och i samma storlek som högen** och har
`pointer-events:none`; bara korten tar emot pekare. Den kollapsade högen döljs (`opacity:0`) när
`fanOn` är sant, så det ser ut som att den blev solfjädern.

Fördröjningarna finns för att pekaren ska hinna gå från högen till ett kort utan att fjädern stänger:
`pointerenter` på ett kort nollställer stängningstimern, `pointerleave` startar om den (130 ms).

Hovrat kort i fjädern:
- lyfts 20 px till, skalas 1.1, får accentram
- visas stort i inspektorn med rubriken `From the graveyard`
- får en flytande rad med **Return to play** (primär, accent) och **Exile**, placerad
  `left: dx − 30, top: dy − 44`

Drag i ett kort ur fjädern (mer än 6 px) plockar ut det ur graveyarden och lägger det direkt i handen
på pekaren som ett nytt kort på mattan — samma väg som `#gravOv`:s *Tillbaka till bordet*, men utan
dialog.

Under högen står `3 cards` normalt och `Drag one back out` när fjädern är öppen.

## Inspektorn (`Pointing at`)

Panelen till höger, full höjd. Innehåller i tur och ordning: rubrik (`Pointing at` / `Last card` /
`From the graveyard`) med `F`-hint, kortbilden, namn och typrad, förmågorna som ordbrickor, och —
bara när kortet har counters — en grön ruta med totalen (`+8/+8 in total`) och en bricka per unik
counter. Panelen följer hover; utan hover visar den senast pekade kortet.

## Lasso

Drag på tom yta när brädet **inte** är inzoomat ritar en markeringsruta
(`1.5px dashed` blå, `#6b8cff14` fyllning). Vid släpp markeras alla kort vars roterade `rect()`
skär rutan; är de fler än ett dras de som ett klump. Är brädet inzoomat betyder samma drag
**panorering** i stället — det är den enda platsen de två gesterna krockar.

## Edge cases som måste finnas

| Fall | Beteende |
| --- | --- |
| **Kameran tappar många kort på en gång** | Ingen får lämna bordet. En gul banner: *"The camera lost N cards at once"* med förklaringen att en hand över bordet, en flyttad kamera och en board wipe ser likadana ut uppifrån. Tre val: **behåll alla**, **allt till graveyard**, **en och en**. |
| **En och en-granskning** | Resten av brädet dimmas (`opacity .25`), det aktuella kortet lyfts med `box-shadow: 0 0 0 9999px #05080cb8`, och rubriken räknar `3 of 9`. `Decide later` hoppar vidare, `Stop reviewing` avbryter. |
| **Ett kort försvinner** | Kortet blir grått och streckat där det ligger, med chippen *"Not on the table — where did it go?"*. Det ligger kvar tills användaren svarar: graveyard, exile, tillbaka till handen, biblioteket, eller *"False alarm — it's still there"*. |
| **Kortet dyker upp igen** | Går tillbaka till normal med en grön puls (`box-shadow 0 → 22px`, 0.7 s). Ingen dialog. |
| **Kameran kan inte läsa ett kort** | Kortet ritas som ett streckat mönsterkort med frågetecken och chippen *"Camera couldn't read this — which card?"*. Klick ger tre gissningar, den första märkt *best guess*, plus *"Leave it unread for now"*. |
| **Överfullt bräde (25+)** | Ytan växer enligt `grown()` och krymper aldrig tillbaka. Zoomen faller automatiskt till `fit`. Inga kort flyttas av sig själva. |
| **Tappade kort** | Behåller P/T och alla förmågor, upprätt-roterade. Bilden dämpas (`brightness(.86) saturate(.94)`), inget annat. |

Chipparna är självbegränsande: `missing` visas bara när högst två kort saknas, `new` bara när högst
tre är nya — annars blir brädet en vägg av etiketter. Vid fler tar bannern över.

Varje förflyttning som tar ett kort från bordet går genom en `act()`-omslagning som sparar
föregående tillstånd och visar en toast med **Undo** i 4,6 sekunder.

## Vad som inte är en del av designen

Mockupen har en liten lila **testflik** uppe i högra hörnet, utanför appramen, som fäller ut
scenarier (`Add 11 cards`, `Nine gone at once`, …). Den är en testrigg för att kunna visa upp edge
cases — **den ska inte byggas**. Panelerna `Everywhere else` (exile / back to hand / library) och
scenariolistan som låg i tidigare iterationer är borttagna ur vyn; destinationerna når man i stället
via *"It's gone — where to?"*.

## State Management

Per kort, utöver dagens fält:

| Fält | Typ | Betydelse |
| --- | --- | --- |
| `x`, `y` | `number` | plats i brädkoordinater — **sparas** |
| `tapped` | `bool` | vridet 90° — finns redan |
| `cts` | `{p,t}[]` | counters, ersätter `counters: number` — **sparas** |
| `grp`, `gi` | `string \| null`, `number \| null` | manahög och position i den — **sparas** |
| `st` | `'ok' \| 'new' \| 'missing'` | kamerastatus |
| `unknown`, `guesses` | `bool`, `string[]` | kort kameran inte kunde läsa |
| `z` | `number` | staplingsordning |

Vy-tillstånd (sparas inte): `board {w,h}`, `pan {x,y}`, `zoomManual`, `sel[]`, `hover`, `held`,
`spin`/`live` (pågående vridning), `lasso`, `overPile`, `joinId`, `menu`, `sheet`, `ctr`,
`fanOpen`/`fanOn`/`fanHover`, `alert`, `review`, `toast`/`undoFn`.

`board` är det enda vy-tillstånd som är lite lurigt: det får bara växa, och det räknas om varje gång
kortlistan ändras.

## Design Tokens

Använd repots variabler först. Mockupens värden och deras motsvarighet:

| Mockup | Repo | Används till |
| --- | --- | --- |
| `#0d1015` | `--bg` | botten |
| `#141922` | `--bg2` | fältbakgrund |
| `#1b2230` | `--bg3` | knappar |
| `#232c3c` | `--bg4` | aktiv knapp |
| `#28313f` | `--line` | ramar |
| `#e7ecf4` | `--txt` | text |
| `#93a1b6` | `--dim` | sekundär text |
| `#66748a` | `--dim2` | tertiär text |
| `#f0a52a` | `--acc` | markering, primär knapp, släppyta |
| `#e2606a` | `--red` | ta bort |
| `#6b8cff` | `--blue` | hover-ring, lasso |

Nya värden designen inför:

| Värde | Används till |
| --- | --- |
| `#57c785` / `#7fd6a2` / `#9fe3ba` | counters: prick, total, text |
| `#2f6b48` / `#12281c` / `#0c1a12` | counters: ram, bricka, panelbotten |
| `#b98ff0` / `#5c4a80` | exile |
| `radial-gradient(1250px 620px at 46% 26%, #18232f, #0a0f14 72%)` | mattans yta |
| `inset 0 0 90px 20px #00000066` | mattans vinjett |

**Skuggor:** kort i vila `0 4px 12px -3px #000c`, hovrat/markerat `0 14px 26px -8px #000e`,
draget `0 26px 40px -12px #000f`.

**Rörelse:** kort som flyttas `transform .34s cubic-bezier(.34,1.4,.5,1)` och
`left/top .22s cubic-bezier(.2,.8,.3,1)`; under drag `none`. Nytt kort landar med
`translateY(-40px) scale(1.14) → none` på 0,45 s. Släppt kort sätter sig med `scale(1.06) → 1` på 0,3 s.

## Assets

- **Kortbilder:** appens `imgOf()`. Mockupens Scryfall-URL:er är bara till för att den ska gå att öppna.
- **Gravsten:** konstanten `GRAVSTEN` i `index.html`, oförändrad.
- **Ikoner:** befintliga inline-SVG:er. Nya i designen: förstoringsglas−/+ till zoomchippet,
  rotationspil till spin-handtaget, pil upp till *Return to play*, cirkel-med-streck till *Exile*.
  Samma stil som resten (`stroke-width` 2–2.4, `stroke-linecap:round`).
- **Manasymboler:** `assets/mana/*.svg` finns kvar i repot men används **inte** i v3 — den fria
  mattan visar riktiga landkort i stället för en manaräknare.

## Files

| Fil | Innehåll |
| --- | --- |
| `Direction C v3 - Real board.dc.html` | **huvudfilen** — det som ska byggas |
| `Direction C - Free mat.dc.html` | första C-iterationen, som jämförelse |
| `support.js`, `_ds/` | runtime och stilar designfilerna behöver för att öppnas i en webbläsare |

Öppna huvudfilen i Chrome. Testfliken uppe till höger fäller ut scenarierna som visar edge cases —
`Nine gone at once` för bannern, `Where, not what` för det oläsbara kortet, `Fill to 25 cards` för det
överfulla brädet, `Stack the mana` för manahögarna.

## Startprompt till Claude Code

> Läs `design_handoff_fri_matta/README.md` och öppna `Direction C v3 - Real board.dc.html`.
> Bygg om bordsvyn i `index.html` till en fri matta enligt den: en yta med absolut positionerade kort,
> zoom och panorering, mana som ligger omlott i båda led, förmågor som utskrivna ord, P/T som
> bas → totalsumma, counters i valfri storlek, och en graveyard som fälls ut till en solfjäder på hover.
> Den nya vyn ersätter dagens zonlayout.
>
> Läs koden först och avgör själv om `.brade`/`.zon-perm`/`.lands` ska rivas eller behållas som ett
> tunt lager, och om `localStorage` ska migreras eller utökas — kravet är bara att ett kort ligger kvar
> där användaren lade det mellan omladdningar, och att gamla `counters: number` blir `cts: [{p,t}]`.
>
> Rör inte topbaren, footern med kortkommandon, Scryfall-hämtningen eller kameralogiken.
> Använd repots egna CSS-variabler och `--sans` — måtten och formlerna i README:n är exakta,
> färgerna och typografin ska komma ur appen.
>
> Ta det i den här ordningen och verifiera varje steg innan du går vidare:
> 1. Ytan, `boardFor`/`grown`/`clampPan`, zoom och pan
> 2. Kort med fri placering, drag, tap, z-ordning, klamp mot graveyard-panelen
> 3. Mana som stackas omlott (`STACK 74`, `XSTEP 17`, arean 24 %)
> 4. Förmågor som ord och P/T med totalsumma — även på tappade kort
> 5. Counters: datamodell, migrering, panelen
> 6. Graveyard-solfjädern på hover
> 7. Edge cases: många kort borta på en gång, ett kort borta, kortet dyker upp igen, oläsbart kort,
>    25+ kort på brädet
>
> Bygg inte testfliken i mockupens hörn — den är en testrigg, inte en del av designen.

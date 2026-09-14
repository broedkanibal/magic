# Handoff: graveyarden — högen, solfjädern och vägen ner i den

Komplement till `README.md` i samma mapp. Den här filen beskriver **bara** graveyarden: hur högen ser ut när inget händer, vad som händer när man drar ett kort mot den, vad som händer när man släpper, och hur solfjädern fälls ut på hover.

Referensimplementationen är `Direction C v3 - Real board.dc.html` i samma mapp. Alla värden nedan är lästa ur den filen och är exakta — de ska inte tolkas om, bara flyttas in i `index.html`.

**Geometrin är ersatt (MES-125, 2026-09-14):** högen ser nu ut som graveyard-platsen i uppstartens steg 4 — en streckad gul ram 108×144 med kortet (92×128) inuti, graveyard till vänster om library, ingen etikettrad ovanför och namn och antal i en rad under. Ett drag breddar inte högen; ramen blir hel och lyser. Facit är variant A1 i designytan "Mesa Table Piles" (https://claude.ai/code/artifact/74df34b4-36aa-4403-a4d7-1a2819619010). Måtten nedan (186/104/122 px, top:752px, solfjäderns start) gäller inte längre; rörelserna (landningen, solfjädern, instruktionsrutan) gör det.

**Ett uttryckligt undantag:** referensfilen har en bugg där alla övriga kort på bordet rycker till när man släpper ett kort i graveyarden. Den ska **inte** följa med. Se avsnittet "Det som inte ska med" sist.

---

## 1. Högen i vila

Panelen är absolut positionerad i mattans koordinatsystem, inte i brädet:

```
position:absolute; z-index:22; left:22px; top:526px; width:186px;
display:flex; flex-direction:column; align-items:flex-start; gap:10px;
```

Tre delar i kolumnen: etikettrad, själva högen, räknartext.

**Etikettraden** (höjd 14px, `flex:none`, gap 8px): ordet `Graveyard` i `600 9.5px/1` systemsans, `letter-spacing:.9px`, `text-transform:uppercase`, färg `#93a1b6`, och efter det en linje som fyller resten: `flex:1;height:1px;background:#1c2330`.

**Högen** är ett `position:relative` block med `aspect-ratio:488/680` och `border-radius:7px`, bredd `104px` i vila. Den har `cursor:pointer` och

```
transition: width .22s cubic-bezier(.2,.8,.3,1), box-shadow .16s;
box-shadow: 0 6px 16px -8px #000c;
```

Inuti den, i den här ordningen:

1. **Lagren under toppkortet** — ett `<i>` per lager, `min(antal-1, 4)` stycken, räknade **nedifrån och upp** (k från 4 mot 1, så det högsta k hamnar först i DOM och därmed underst). Varje lager:

   ```
   position:absolute; inset:0; border-radius:6px; transform-origin:50% 100%;
   background:#1b1f26; border:1px solid #39414e; box-shadow:0 1px 2px #0009;
   transition: transform .22s cubic-bezier(.2,.8,.3,1);
   transform: translate(k*gStep px, -k*gStep px) rotate(k*gRot deg);
   ```

   I vila är `gStep = 5` och `gRot = 1.5`. Lagren kryper alltså uppåt-höger och vrids lite mer för varje steg — det är det som gör att det ser ut som en verklig hög och inte som ett kort.

2. **Platsmarkeringen** — ett `<i>` med `inset:0`, `border-radius:6px`, `border:1.5px dashed #ffffff14`, `background:transparent`, `transition:border-color .16s, background .16s`. Syns bara som en svag kontur när högen är tom.

3. **Toppkortets bild** (om högen inte är tom) — `z-index:2`, `object-fit:cover`, `border-radius:6px`, `background:#11161e`, `box-shadow:0 4px 14px -3px #000d` och

   ```
   filter: grayscale(.6) brightness(.55) contrast(1.05);
   ```

   Kortet ska vara läsbart som ett kort men tydligt dött. Filtret är det enda som säger det — ingen overlay, ingen tint.

4. **Gravstenen** — 44×44px Lucide-liknande SVG centrerad med `translate(-50%,-50%)`, `color:#e6e1d6`, `filter:drop-shadow(0 2px 4px #000c)`, `pointer-events:none`, `transition:opacity .18s`. Opacitet: `.32` när högen är tom, `.5` när det ligger kort i den.

**Räknartexten** under högen: `10.5px` monospace, färg `#66748a`, texten `Empty` när tom, annars `3 cards` / `1 card`.

---

## 2. Man drar ett kort mot graveyarden

Träffytan är medvetet större än högen, och asymmetrisk — man kommer alltid in från bordet, dvs från höger och ovanifrån:

```
padding runt högens rect: { vänster:54, höger:44, upp:66, ner:66 }
```

Talen multipliceras med mattans `fit`-skala innan de jämförs med `ev.clientX/Y`, så ytan känns lika stor oavsett zoom. Ligger pekaren inom den ytan under ett drag är tillståndet `gravOver` sant. Är flera högar inom räckhåll vinner den vars mittpunkt är närmast (manhattan-avstånd).

När `gravOver` slår om ändras sex saker samtidigt, alla via de transitions som redan sitter på elementen:

| Vad | Vila | `gravOver` |
| --- | --- | --- |
| Högens bredd | `104px` | `122px` |
| Högens skugga | `0 6px 16px -8px #000c` | `0 0 0 3px #f0a52a, 0 0 32px -2px #f0a52a99` |
| Lagrens `gStep` / `gRot` | `5` / `1.5deg` | `11` / `4.5deg` |
| Platsmarkeringens ram | `1.5px dashed #ffffff14` | `1.5px solid #f0a52a55` |
| Platsmarkeringens botten | `transparent` | `#1a140833` |
| Toppkortets filter | `grayscale(.6) brightness(.55) contrast(1.05)` | `grayscale(.2) brightness(.9)` |
| Gravstenens opacitet | `.5` | `.1` |
| Etikett / räknare | `#93a1b6` / `#66748a` | `#f0a52a` / `#ffd98a` |

Högen breddas och lagren glider isär — den **öppnar sig** för kortet man håller i. Toppkortet ljusnar samtidigt som gravstenen tonar bort, så högen går från "plats" till "kort" i samma rörelse.

Dessutom tänds en instruktionsruta under högen, `position:absolute; z-index:95; left:22px; top:752px; width:212px`:

```
padding:7px 10px; border-radius:8px; background:#1a1408f7;
border:1px solid #8a6a22; box-shadow:0 12px 26px -10px #000;
```

med en 6px prick i `#f0a52a` och texten `Let go — {kortets namn} lands face up on top` i `600 10.5px/1.35`, färg `#ffd98a`. Den använder kortets riktiga namn, inte "the card".

---

## 3. Man släpper

Kortet tas bort från bordet och namnet läggs **först** i graveyard-listan (den är sorterad nyast först). Samtidigt sätts en flagga `bumped: 'grav'` som nollställs efter `500ms`, och `hover` och markeringen rensas.

Tre animationer startar på en gång:

**Toppkortet faller ner** — `animation: cLand .5s cubic-bezier(.2,.8,.3,1)` på den nya toppbilden:

```css
@keyframes cLand{
  0%   { transform: translateY(-40px) scale(1.14); opacity:0 }
  60%  { transform: translateY(4px) scale(.98) }
  100% { transform: none; opacity:1 }
}
```

Det är samma rörelse som när ett kort landar på bordet — det kommer ovanifrån, skjuter förbi sitt läge och sätter sig. Eftersom kortet renderas som högens nya toppbild ser det ut som att det man just höll i är det som ligger där nu.

**Räknaren studsar** — `animation: cBump .42s cubic-bezier(.2,.8,.3,1)` på räknartexten:

```css
@keyframes cBump{ 40%{ transform: scale(1.18) } }
```

**En ring slår ut** — ett `<i>` som bara finns medan `bumped === 'grav'`, centrerat i högen:

```
position:absolute; z-index:4; left:50%; top:50%;
width:170px; height:170px; margin:-85px 0 0 -85px;
border-radius:50%; border:2px solid #e8c98a; pointer-events:none;
animation: cRing .55s ease-out forwards;
```

```css
@keyframes cRing{ from{ opacity:.7; transform:scale(.5) } to{ opacity:0; transform:scale(1.5) } }
```

Ringen är större än kortet med flit — den läser som en stöt i bordet, inte som en glow runt kortet.

Efter `500ms` släcks `bumped`, ringen tas bort och högen står i sitt nya vilotillstånd med ett lager mer.

---

## 4. Man hovrar graveyarden

Två tillstånd, inte ett: `fanOpen` (solfjädern finns i DOM) och `fanOn` (den är utfälld). Det är delningen som gör att korten kan animera **ut ur** högen istället för att bara dyka upp utfällda.

**Öppna** — `onPointerEnter` på panelen, men bara om man inte håller i ett kort:

```
clearTimeout(stängningstimern)
fanOpen = true
efter 24ms: fanOn = true
```

De 24 millisekunderna är hela tricket: korten monteras med `transform:none`, dvs exakt ovanpå högen, och först nästa frame får de sitt utfällda transform. Då har de en transition att animera längs. Utan fördröjningen monteras de redan utfällda och rörelsen försvinner.

Samtidigt går högen själv till `opacity:0` (bara om det ligger kort i den) — korten i solfjädern **är** högen, den ska inte ligga kvar under dem.

**Geometrin.** Solfjäderns behållare: `position:absolute; z-index:88; left:22px; top:550px; width:104px; height:145px; pointer-events:none`. Varje kort ligger `inset:0` med `pointer-events:auto`, `cursor:grab`, `transform-origin:50% 100%` (de vrids kring underkanten, som kort i en hand).

För `n` kort, kort `i`, med `t = i/(n-1)`:

```
fStep = n > 1 ? min(96, 828/(n-1)) : 0
dx    = i * fStep
dy    = -64 - sin(t * π) * 30            // bågen
vinkel = -9 + t * 18                      // grader, vänster till höger
```

`fStep` kapas på 96px, så små högar fäller ut sig luftigt; stora klämmer ihop sig men får aldrig gå utanför 828px totalt. `sin(t*π)*30` är det som gör raden till en båge — korten i mitten ligger högst.

Transition per kort, med förskjutning:

```
transform .3s cubic-bezier(.2,.9,.3,1) {i * 22}ms
```

22 millisekunder per kort. Det är det som gör att solfjädern *veckas* ut från vänster istället för att expandera som en klump. Med 5 kort är hela rörelsen klar på 0.3 + 0.088 ≈ 0.39s.

Kort `i` har `z-index: i+1`, ram `1px solid #39414e` och skugga `0 8px 18px -8px #000c`.

**Hovra ett enskilt kort i solfjädern:** det kortet får `z-index:60`, `scale(1.1)`, ytterligare `-20px` på sitt `dy` (det lyfter ur raden), ram `2px solid #f0a52a` och skugga `0 22px 40px -10px #000f`. Samma `.3s`-transition bär lyftet, så det känns som samma material.

Vid hovrat kort tänds också två knappar vid kortets position (`z-index:60`, `pointer-events:auto`, `padding:5px`, `border-radius:9px`, `background:#0b1017f7`, `border:1px solid #4a5a72`, `box-shadow:0 16px 34px -12px #000`):

- `Return to play` — `background:#f0a52a`, text `#20160a`, `650 11px/1`, pil-upp-ikon. Hover `#ffb943`.
- `Exile` — `background:#1b1428`, ram `1px solid #5c4a80`, text `#d9c7f5`, `600 11px/1`.

Räknartexten under högen byter samtidigt till `Drag one back out`, och etiketten till `#f0a52a`.

**Stänga** — `onPointerLeave` på panelen eller på ett solfjäderkort:

```
efter 130ms: fanOn = false, fanHover = null     // korten flyger hem
efter ytterligare 240ms: fanOpen = false        // först nu avmonteras de
```

De 130 millisekundernas fördröjning gör att man kan röra sig mellan högen och ett solfjäderkort utan att den stängs. De 240 efter är korta nog att kännas direkt men långa nog att `.3s`-transitionen hinner föra korten tillbaka in i högen — de ska aldrig försvinna mitt i luften. Alla tre timers (`fanOn`, `fanOff`, `fanClose`) måste rensas vid varje ny händelse, annars stängs solfjädern under fingret.

---

## 5. Man drar ett kort ut ur solfjädern

`onPointerDown` på ett solfjäderkort sparar bara avsikten: index, namn och startkoordinat. Ingenting händer visuellt.

Först när pekaren rört sig mer än `6px` (manhattan, `|dx| + |dy|`) skapas kortet på riktigt:

- namnet tas bort ur graveyard-listan
- ett nytt kort läggs till på bordet, centrerat under pekaren (`x = pekare.x - bredd/2`), med status `new` och `z = topZ + 1`
- solfjädern stängs direkt (`fanOpen`, `fanOn`, `fanHover` nollas)
- kortet läggs i den vanliga drag-strukturen med `moved: true`

Det sista är poängen: dragningen som började i solfjädern fortsätter utan avbrott som en vanlig kortdragning på bordet. Man släpper inte och tar om — kortet sitter kvar i handen hela vägen ut. Släpper man utan att ha rört sig 6px händer ingenting alls, och `Return to play`-knappen är kvar för den som hellre klickar.

---

## 6. Det som inte ska med

I referensfilen re-klampas **varje** kort på bordet efter varje åtgärd:

```js
cards: next.cards.map(c => this.clamp(c, v))
```

`clamp()` puttar kort ut ur graveyard-rektangeln och in inom brädets kanter. Eftersom korten har `transition: left .22s, top .22s` räcker det att ett kort får en position som skiljer en pixel för att det ska glida — och när man släpper ett kort i graveyarden gör flera kort det samtidigt. Resultatet är att hela bordet rycker till i samma ögonblick som kortet landar.

**Gör inte så.** Klampa bara de kort som åtgärden faktiskt rörde. Konkret: låt åtgärden bära med sig vilka `id` som ändrats, och lämna alla andra kort som referens-identiska objekt:

```js
const touched = next.touched;   // Set av id:n, eller null = alla (t.ex. vid "Tidy up")
cards: next.cards.map(c =>
  (!touched || touched.has(c.id)) ? this.clamp(c, v) : c)
```

När ett kort läggs i graveyarden är `touched` tom — inget kort på bordet har flyttats, bara ett har försvunnit — och då ska ingenting röra sig. Kraven är:

- Att släppa ett kort i graveyarden får inte ändra `left` eller `top` på något annat kort.
- Brädet får inte krympa när ett kort försvinner (`grown()` tar redan `Math.max` mot nuvarande storlek — behåll det).
- Zoomen får inte räknas om till ett nytt värde när ett kort försvinner, eftersom alla korts skärmpositioner då flyttar sig på en gång.

`Tidy up` och board wipe är undantagen — där *ska* alla kort flytta sig, och där är rörelsen hela poängen.

---

## 7. Ordning att bygga i

1. Högen i vila: lagren, filtret på toppkortet, gravstenen, räknaren.
2. `gravOver`-tillståndet: träffytan med sin padding, och de sex samtidiga ändringarna.
3. Instruktionsrutan med kortets namn.
4. Landningen: `cLand`, `cBump`, `cRing`, och att `bumped` nollas efter 500ms.
5. Solfjädern: `fanOpen`/`fanOn`-delningen, geometrin, staggern, stängningstimrarna.
6. Hover på enskilt kort: lyftet och de två knapparna.
7. Dragningen ut ur solfjädern, med 6px-tröskeln och överlämningen till vanlig kortdragning.
8. Ta bort re-klampningen enligt avsnitt 6 och verifiera att bordet står helt still när ett kort landar i graveyarden.

Färgerna ovan är referensfilens egna. Finns motsvarande CSS-variabler i `index.html` ska de användas i stället — accenten `#f0a52a` är appens graveyard-tint och ska komma från samma ställe som de andra högarnas tint.

# Spegelns animeringar — MES-292

Hur det digitala bordet visar vad kameran såg. Det gäller ett kort som spelas ut,
knuffas, flyttas, tappas bort, kommer tillbaka, går till graveyard eller tappas.
Beteendet bakom är beslutat i MES-291: vänta upp till 5 s innan nedtoning,
anta att kortet flyttas, och sluta vänta när graveyard-högen växer. Den här
mappen är bara designen.

**Designytan:** "Mesa Mirror Animations", https://claude.ai/artifact/EbDpd4ggjnb7cp7j3KuEhY

| Sida | Vad | Läge |
|---|---|---|
| **2 · När kameran vet** | **D**: *Alla lägen* (stillbilder) och *Prototyp* | aktuell riktning, väntar på Jespers ja |
| 1 · Första förslaget | I dag, A · Stilla, B · Handen, C · Kameran | avfärdad 2026-09-25, ligger kvar som historik |

Bygg ingenting i `index.html` förrän Jesper sagt ja.

## D · När kameran vet

Så sa Jesper om sida 1 (2026-09-25):
- Den kändes buggig och som laddlägen, vilket skapade frustration.
- En flytt gick inte att förstå som ett och samma kort.
- Det var fult att kortet tonades ut innan det flög till graveyard.

Han valde:
- inget nytt kort förrän namnet finns
- en rörelse som lyfts och sätts ned

**Principen:** bordet visar bara det kameran vet, och varje ändring är en enda
rörelse från det gamla läget till det nya.

| Läge | Före | Rörelsen |
|---|---|---|
| **Utspel** | ingenting, 0,3–2 s (upp till 5 s via Claude). Platshållaren visas inte | kortet kommer 90 px från spelarens håll och läggs ned, 400 ms. Grön ring efteråt |
| **Knuff** | kameran har kortet hela tiden | glider dit, 220 ms (UT), inget lyft |
| **Flytt** | står kvar orört i 1–5 s. Ingen platshållare på nya platsen | lyfts, bärs och sätts ned, 450 ms (FLY + settle) |
| **Flytt, avbruten** | ny rapport mitt i flytten | tar ny riktning med bibehållen fart, 320 ms, och vrids till tappat |
| **Nedtonat** | står kvar orört i 5 s | tonas ned på platsen, 480 ms |
| **Tillbaka** | nedtonat | tänds och sätts ned, 300 ms |
| **Tillbaka, ny plats** | nedtonat | tänds medan det lyfts, bärs dit, 450 ms |
| **Till graveyard** | står kvar orört tills högen växer | flyger dit helt synligt och landar som högens toppkort vid 400 ms. Gråtonen kommer de sista 160 ms, så bytet syns inte |
| **Tap / untap** | bara när kameran är säker | vrids 240 ms (SOFT), med ett litet lyft |

Minskad rörelse (`prefers-reduced-motion`): bara toning. Platsen och
vridningen byts medan kortet är osynligt eller nästan osynligt.

Alla tider, värden och easings som tabeller finns i **`TIDSLINJER.md`**. Det
är den filen man bygger efter.

### Vad D kräver av avstämningen (MES-291)

- **Platshållaren** (`platsHtml`, `.plats`) ritas inte i spel. Kameran får
  gärna läsa, men bordet väntar på namnet.
- **En flytt är en bindning.** Samma namn på en ny plats medan kortet väntar
  är en flytt. Då animeras kortet dit från där det står. Det ritas inte om på
  den nya platsen.
- **Högvakten** avbryter väntan. Kortet flyger direkt och tonas aldrig ned
  först.
- **Avbrott:** läs kortets nuvarande transform, avbryt, och starta ett nytt
  spår. Första segmentet får easingen `cubic-bezier(x1, k·x1, x2, y2)`,
  `k = v·T/Δ`, så att farten följer med.
- **Motståndarnas bord** (`renderBord`, `fjarrBord`) ska få samma rörelse,
  driven av skillnaden mellan två tillstånd av bordet.
- **Kvar att kontrollera när bygget börjar:** om `renderGrid` ritar om brädet
  medan ett kort rör sig. Prestandan i appen är inte mätt.

## Mappen

| Sökväg | Vad |
|---|---|
| `TIDSLINJER.md` | D:s tidslinjer som tabeller |
| `TIDSLINJER-sida1.md` | sida 1:s tidslinjer (I dag, A, B, C) |
| `src2/` | D: `spec.js` (tidslinjerna som data), `motor.js` (motorn och händelserna), `proto.js` (prototypen), `lagen.js` (översikten, räknad med samma motor), `style.css` |
| `src/` | sida 1:s källor |
| `gen2.mjs`, `gen.mjs` | bygger sida 2 och sida 1 |
| `artboards/` | alla artboards fristående, med bilderna och `support.js` bredvid |
| `src/bilder.json` | bildernas uppladdade adresser i designytan |

## Öppna en artboard fristående

Klick når inte in i artboards på den skalade designytan i browserpanelen. Så
här provas de i stället:

```bash
mkdir -p dev/bilder/anim && cp design_handoff_animeringar/artboards/* dev/bilder/anim/
```

Starta sedan launch-konfigurationen `mesa-anim`. Den serverar bara
`dev/bilder/anim` på 127.0.0.1:8271. Öppna `/DPrototyp.dc.html` eller
`/DLagen.dc.html`.

Browserpanelen stryper `requestAnimationFrame`, så rörelsen hackar där. Vill
man mäta, gör så här i provkopian:
1. Lägg in `window.__ab = this;` före `this.m = new Motor(`.
2. Stäng av `m.igang`.
3. Driv `m.tick(t)` för hand.

## Bygga om

```bash
node design_handoff_animeringar/gen2.mjs
```

Det bygger `artboards/D*.dc.html` och `TIDSLINJER.md`. Sida 1 byggs med
`gen.mjs` på samma sätt. Så får man designytans filer med de uppladdade
bilderna:

```bash
node design_handoff_animeringar/gen2.mjs <mapp> design_handoff_animeringar/src/bilder.json
```

Sedan publiceras `<mapp>/project/*.dc.html` till designytans adress.

Korten är riktiga Magic-kort (Scryfall, 272×380), samma bilder som i
`design_handoff_bordsvy/`.

# Handoff: bordslayout för Handvy (permanents, lands, graveyard, interaktioner)

## Overview

Ny layout och nya interaktioner för huvudvyn i **Handvy** (repo `broedkanibal/magic`, filen `index.html`).
Målet: bordet ska läsas som ett fysiskt Magic-bord i ett fönster som ligger på **halva skärmen bredvid
SpellTable** (720×900 CSS-px), utan skroll i någon zon, och med direkta handlingar på korten
(tappa/untappa, lägg i graveyard, lägg equipment på ett kort, dra för att sortera).

Tre zoner ersätter dagens uppdelning:

| Zon | Innehåll | Placering |
| --- | --- | --- |
| **Permanents** | allt i spel utom land — creatures, artifacts, enchantments, planeswalkers, battles | överst, fyller ytan |
| **Lands** | basland grupperade per färg + specialland | nedre bandet, vänster |
| **Markerat** + **Graveyard** | förhandsvisning av valt kort, respektive högen | nedre bandet, mitten och höger |

Namnbytet är medvetet: Magic kallar hela ytan *battlefield* och land ligger också där, så det gamla
"I spel" var dubbeltydigt. Vill man byta går *Battlefield* + *Lands* lika bra; *Nonland permanents*
är exakt men för långt för en rubrik.

## About the Design Files

Filerna i det här paketet är **designreferenser skrivna i HTML** — prototyper som visar avsett utseende
och beteende. De är **inte** produktionskod som ska kopieras in.

Uppgiften är att återskapa designen **i den befintliga kodbasen och med dess befintliga mönster**:
`index.html` är en enda fil med vanilla JS, egna CSS-variabler och `render*()`-funktioner som skriver
`innerHTML`. Bygg vidare i den strukturen — inget ramverk, inget bygge, ingen ny beroendekedja.
Alla färger finns redan som CSS-variabler i `:root`; använd dem i stället för hexvärdena nedan där de
motsvarar varandra (mappning finns under *Design Tokens*).

Designfilerna använder `api.scryfall.com/cards/named?exact=…&format=image` för kortbilder enbart för
att mockupen ska visa riktiga kort. I appen finns redan `imgOf(card, faceIndex, size)` — använd den.

## Fidelity

**Hi-fi.** Mått, färger, radier och typografi i den här filen är exakta och tagna ur mockupen.
Undantaget är typsnittet: mockupen är satt i Archivo (designsystemet i verktyget), appen använder sin
egen `--sans` (system-stack). **Behåll appens `--sans`** — byt inte typsnitt.

## Screens / Views

Alla mått gäller ett fönster på **720×900**. Ytan fördelas så här:

```
topbar            46 px   (finns, oförändrad)
handbar           43 px   (finns, oförändrad — sökfält, meta, Fit/zoom)
pendbar           40 px   (finns, oförändrad — gula granskningsraden)
bordet           745 px   ← flex:1, padding 10, gap 10   NYTT INNEHÅLL
  ├ Permanents   409 px   flex:1
  └ nedre band   306 px   flex:none
hints            26 px   (finns, oförändrad)
```

### 1. Permanents (zon A)

**Syfte:** se allt som ligger i spel utom land, i en enda zon, i så stor skala som möjligt.

Layout: `display:flex; flex-direction:column; gap:7px`. Rubrikrad, sedan rader med kort
(`display:flex; gap:6px; align-items:flex-start`).

**Rubrikrad** (samma mönster i alla zoner):
- Etikett: `font: 600 9.5px/1 var(--sans)`, `letter-spacing:.9px`, `text-transform:uppercase`, färg `#5c6b82`
- Linje som fyller resten: `flex:1; height:1px; background:#1c2330`
- Räknare: `font: 10px var(--mono)`, färg `#41506a` — texten `"20 · 4 tappade · 1 bifogad"`
- **Släppyta-chip** (se *Interactions → Uppladdning*): `padding:2px 6px; border:1px dashed #2f3a4c;
  border-radius:11px; font:9px/1 var(--sans); color:#5c6b82`, ikonen är den befintliga tre-korts-SVG:n
  (13×10), texten `"Dra in kort"`. Hover: `border-color:var(--acc); color:#ffd98a`.

**Kort (otappat)**
- `width:88px; aspect-ratio:488/680` (≈122.6 px hög), `object-fit:cover`
- `border-radius:5px` (= bredd × 0.057; appen använder `calc(var(--cardw) * .045)` — behåll formeln)
- `background:#11161e; box-shadow:0 2px 8px -2px #000b`

**Kort (tappat)** — vridet 90°, som fysiskt:
- Yttre plats: `position:relative; width:123px; height:123px` (kortets höjd i båda led, så radhöjden
  blir densamma som för otappade kort)
- Bilden: `position:absolute; left:17px; top:0; width:88px; transform:rotate(90deg)`
  (`left = (123 − 88) / 2`)
- `opacity:.75` på platsen, så tappat läses som "förbrukat" även i svartvitt

**Markerat kort**
- `transform:translateY(-3px)`, ring `inset 0; border:3px solid var(--acc); border-radius:5px`
  (ritad **innanför** kanten — appens nuvarande kommentar om klippta ringar gäller fortfarande),
  lyft skugga `0 8px 18px -6px #000e`

**Bifogat kort (equipment/aura)** — stackat bakom värdkortet:
- Värden ligger i `position:relative`-omslag med `width:88px`
- Det bifogade kortet: `position:absolute; left:9px; top:9px; width:88px; filter:brightness(.8)`
  (alltså 9 px ner/höger, bakom)
- Värdkortet: `position:relative; z-index:2`
- Bricka: `right:-4px; bottom:-6px; padding:1px 5px; border-radius:9px; background:var(--bg4);
  border:1px solid #3d4a5f; font:600 9px/1.5 var(--sans); color:#cfd9e8` — texten `"+1"` (antal bifogade)

**Radbrytning:** 20 permanents med 88 px kort och 6 px gap ger 7 platser per rad
(6 otappade + 1 tappat = 687 px), tre rader = 3 × 123 + 2 × 7 = 383 px + rubrik 18 px = 401 px,
vilket ryms i 409. Fungerar med `flex-wrap:wrap` — vid fler kort ska `computeFit()` krympa
`--cardw` (se *Skalning*).

### 2. Lands (zon B, vänster)

**Syfte:** se hur mycket mana som finns, per färg, och hur mycket som är kvar otappat — utan att det
tar en tredjedel av skärmen.

Layout: `display:flex; flex-wrap:wrap; gap:8px` under rubrikraden (etikett `LANDS`, räknare
`"38 · 12 tappade"`, chip `"Dra in land"`). Bredd i 720-fönstret: **396 px** → tre grupper per rad.

**Färggrupp** — `width:126px; display:flex; flex-direction:column; gap:4px`
- Övre raden: `display:flex; align-items:flex-end; gap:4px`
  - **Otappade**, omlott åt höger: kort `width:30px; aspect-ratio:488/680; border-radius:2px`,
    varje kort efter det första `margin-left:-22px` → **8 px synligt per kort**.
    Skugga på överlappande kort: `-2px 1px 4px -1px #000c` (ger kanten mellan korten).
  - **Tappade**, vridna 90°: plats `position:relative; width:42px; height:30px`, bilden
    `position:absolute; left:6px; top:-6px; width:30px; transform:rotate(90deg)`, `opacity:.62`;
    andra tappade kortet `margin-left:-24px`.
- Undre raden: `display:flex; align-items:center; gap:3px`
  - Manasymbol 15×15 — `assets/mana/{W,U,B,R,G,C}.svg` (finns redan i repot)
  - `−` och `+`: 16×16, `border-radius:4px; border:1px solid var(--line); background:var(--bg3);
    color:var(--dim); font:700 10px/1 var(--sans)`; hover `background:var(--acc-d); color:#ffd98a;
    border-color:var(--acc)`
  - Summan: `font:700 12px/1 var(--sans); color:var(--txt); min-width:13px; text-align:center`
  - Fördelningen: `font:9px var(--sans); color:#41506a` — texten `"5/2"` = otappat/tappat

**Specialland** (Thriving Moor, Evolving Wilds, …) — egen grupp, `width:126px`: en rad med
30 px-kort (`gap:5px`, ingen överlappning) och en bildtext
`font:9px/1.25 var(--sans); color:var(--dim2)`: `"3 specialland — klicka för att läsa"`.

**Lägg till färg** — `height:42px; padding:0 9px; border:1px dashed var(--line); border-radius:6px`,
ett streckat plus 20×20 i cirkel + texten `"Färg"` (9.5px). Visas bara för färger som inte redan
ligger ute (samma logik som dagens `BASLAND_VAL`/`saknade`).

Höjd i stresstestet: rubrik 18 + rad 62 + 8 + rad 62 + 8 + 42 = **200 px** av 306 tillgängliga.

### 3. Markerat (zon B, mitten)

**Syfte:** kortet som är markerat, stort nog att läsa — uppdateras vid varje piltangenttryck och vid hover.

- Kolumn `width:172px; gap:8px`; rubrik i accentfärg: etikett `MARKERAT`, färg `var(--acc)`,
  linjen `#3a2c10`
- Ruta: `border:1px solid var(--line); background:#0f141c; border-radius:8px; padding:7px`
- Kortbild: `width:156px; aspect-ratio:488/680; border-radius:7px; box-shadow:0 8px 22px -8px #000e`
- Namn under: `font-size:10px; color:var(--dim); text-align:center`
- Vid attach-läge (se nedan) får rutan `border-color:var(--acc); background:#120e06` och texten
  `"Väntar på mål"` i `#ffd98a`

Kolumnens naturliga höjd är ≈268 px — därför är nedre bandet **306 px**. Kortas bandet klipps namnet.

### 4. Graveyard (zon B, höger)

- Kolumn `width:100px; gap:8px`; rubrik `GRAVEYARD`
- Högen: `position:relative; width:80px; aspect-ratio:488/680`, `margin:16px 16px 0 0`
  (marginalen ger plats för lagren som sticker upp/åt höger)
- Ett lager per kort under det översta: `position:absolute; inset:0; border-radius:4px;
  background:#15181d; border:1px solid #2c2f35`, förskjutning `translate(k·steg, −k·steg)` där
  `steg = max(1.6, min(4, 26 / n))` — **behåll dagens formel i `gravHtml()`**, den skalar till 20+ kort
- Översta kortet: `filter:grayscale(.6) brightness(.55) contrast(1.05)`, `z-index:2`
- Gravsten ovanpå: 34×34, `color:#e6e1d6; opacity:.55`, centrerad (SVG:n `GRAVSTEN` finns redan)
- Under: `font:10px var(--mono); color:var(--dim2)` — `"6 kort"`

Ordningen i bandet är **Lands → Markerat → Graveyard**, med `1px` avdelare mellan varje:
`background:linear-gradient(180deg,transparent,var(--line) 20%,var(--line) 80%,transparent)`.

## Interactions & Behavior

### Hover på ett kort (`3b`)
1. Ring runt kortet: `2px solid #6b8cff` + `box-shadow:0 0 0 4px #6b8cff22` (blå = "hovrad",
   accentgul = "markerad", så de två aldrig förväxlas)
2. Namnetikett ovanför kortet: `background:#161c26; border:1px solid #333e50; border-radius:6px;
   padding:3px 8px; font:10.5px/1.3 var(--sans); color:#cfd9e8`, med typ/PT i `var(--mono)` 10px
   `var(--dim2)` — t.ex. `Vampire Nighthawk  2/3 · flying, deathtouch`
3. **Handlingsrad**, flytande pill som överlappar kortets nederkant:
   `background:#0b1017f2; border:1px solid #3d4a5f; border-radius:8px; padding:3px; gap:3px`,
   fyra knappar 20×20 (`border-radius:5px; background:var(--bg4); color:#cfd9e8`), hover
   `background:var(--acc); color:#20160a`:

   | Knapp | Ikon | Kortkommando | Gör |
   | --- | --- | --- | --- |
   | Tappa/untappa | rotationspil | `T` | växlar `e.tapped` |
   | Lägg i graveyard | pil ner | `G` | `flyttaTill(i, ZON_GRAV)` (finns redan) |
   | Lägg på ett annat kort | länk | `A` | startar attach-läget |
   | Ta bort | kryss | `⌫` `Del` | tar bort kortet (finns redan) |

   Ta bort-knappen har egen hover: `background:var(--red); color:#fff`.
4. Förhandsvisningen i **Markerat** byter till det hovrade kortet direkt (markeringen ändras inte).

### Klick
- Klick på kort = markera (samma `state.sel` som idag) → **Markerat** uppdateras.
- Piltangenter flyttar markeringen. **Bifogade kort ska ingå i navigeringen** — de ligger i samma
  `cards`-array, så `state.sel` kan peka på dem; se till att markerat bifogat kort lyfts fram
  (rita det ovanpå värden när det är markerat) så man ser vad som är valt.
- Klick på graveyard-högen öppnar bläddraren (`#gravOv` finns redan i `index.html`).
- Klick på ett specialland öppnar samma detaljvisning som ett kort.

### Drag and drop (`3b`)
- Dragbilden: kortet i `transform:rotate(-7deg)`, `box-shadow:0 20px 34px -10px #000, 0 0 0 2px var(--acc)`,
  och en namnpill under: `background:var(--acc); color:#20160a; border-radius:9px; padding:2px 7px;
  font:600 9.5px/1.5 var(--sans)`
- Giltig släppyta tänds: `border:2px dashed var(--acc); background:#120e06`, rubriken byter till
  `var(--acc)` och får en förklaring (`"Släpp för graveyard"` i `#ffd98a`, 9.5px)
- Släpp ska stödja: **sortera om** inom Permanents (dagens dragsortering), **flytta till Graveyard**,
  **flytta till/från Lands**, och **lägga ett kort som bifogat** på ett annat kort (släpp ovanpå kortet)
- Ett bifogat kort ska kunna dras vidare: till ett annat värdkort, tillbaka till Permanents, eller till
  Graveyard

### Attach-läge (`3c`) — "lägg på ett annat kort"
Startas från `A` eller länk-knappen. Läget är modalt inom brädet:
1. **Banner** överst i zonen, `height:22px; padding:0 8px; border-radius:4px; background:var(--acc);
   color:#20160a; font:600 10.5px/1 var(--sans)`, med länkikon, texten
   `"Välj kortet Skullclamp ska läggas på"`, och till höger `"4 möjliga mål · Esc avbryter"`
   (`font-weight:500`, `kbd` mot `#20160a`/`#ffd98a`)
2. **Släck resten:** halvtransparent lager över zonen, `background:#05070ac9`
3. **Giltiga mål ritas ovanpå** lagret med `box-shadow:0 0 0 3px var(--acc), 0 8px 20px -8px #000`
   och en bock i övre högra hörnet: 18×18 cirkel, `background:var(--acc); color:#20160a`
4. Kortet som ska läggas på visas flytande i nederkanten, `width:104px`, `rotate(-4deg)`, med pill
   `"Skullclamp — equipment"` (`background:#0b1017; border:1px solid var(--acc); color:#ffd98a`)
5. `Esc` avbryter, klick på ett mål bifogar → kortet stackas bakom målet (se *Bifogat kort*)

Vilka kort som får bifogas: allt vars typrad innehåller `Equipment`, `Aura`, eller `Fortification`
ska erbjuda `A`; övriga kort kan också bifogas manuellt (appen ska inte hindra ett spelläge den inte
känner till), men knappen visas bara för de tre typerna.

### Graveyard-bläddraren (`3d`)
Panel över bordet — använd befintliga `#gravOv`, men den nya layouten:
- Bakgrund: `#05070ab8` över hela bordet; panelen `left:14px; right:14px; top:96px`,
  `background:#0f141c; border:1px solid #333e50; border-radius:12px;
  box-shadow:0 30px 60px -20px #000`
- Rubrikrad (`padding:11px 13px; border-bottom:1px solid var(--line)`): gravstensikon 20×20
  `var(--dim)`, `"Graveyard"` i `600 14px`, `"6 kort · överst först"` i `11px var(--mono) var(--dim2)`,
  till höger `← →` i `kbd` + `"bläddrar"`, sedan stängkryss 26×26 (`background:#ffffff0d`, hover
  `var(--red)`)
- Kropp (`padding:14px; gap:14px`): stort kort `width:196px` till vänster; till höger namn
  (`600 14px`), undertext (`11.5px var(--dim)`, `"Instant · lades hit senast"`), och en remsa med
  alla kort som 52 px-bilder — valt kort `box-shadow:0 0 0 2px var(--acc)`, övriga `opacity:.62`
- Knappar nederst: `"Tillbaka till bordet"`, `"Ta bort ur graveyard"` (dagens `.btn.sm`)
- Fotnot `9.5px #41506a`: `"Samma bläddrare öppnas när du klickar på en stapel med bifogade kort."`
  — bläddraren ska alltså återanvändas för en bifogad stapel med fler än ett kort.

### Uppladdning av skärmdumpar
Designbeslutet: **ingen egen släppruta bland korten** (den åt en kortplats i 720-fönstret). I stället:
1. Varje zonrubrik slutar med en liten streckad chip — `"Dra in kort"` i Permanents, `"Dra in land"`
   i Lands. Den ligger på en rad som redan finns och kostar ingen extra höjd, och säger vilken zon som
   tar emot vad.
2. **Hela zonen är släppyta.** Vid `dragover` tänds den zon pekaren är över
   (`outline:2px dashed var(--acc); outline-offset:4px; background:#120e06`) och en flytande bricka
   visas centrerad i zonen: `background:#1a1408f2; border:1px solid var(--acc); border-radius:10px;
   padding:12px 18px`, rubrik `600 13px #ffd98a` `"Släpp bilden — korten läggs till"`, underrad
   `10.5px #c9b485` `"Land sorteras automatiskt ner i manaraden"`. Korten under dimmas till
   `opacity:.5`.
3. `⌘V` fortsätter fungera var som helst, som idag. Släpp utanför en zon = sortera efter typrad
   (`zonAv()`).

Två alternativ vi övervägde och valde bort, men som är billiga att lägga till senare: en engångs-ledtext
när bordet är tomt, och att chippen bara tänds när urklippet innehåller en bild.

### Skalning (viktigast för implementationen)
Inget område får bli skrollbart. Dagens `computeFit()` räknar in "nedre raden" via `nedreHojd(w)`
som en funktion av kortbredden — det gäller inte längre:

- Nedre bandet har **fast höjd** (306 px), satt av Markerat-kolumnens innehåll. Räkna det som en
  konstant, eller mät `manaRow.offsetHeight` en gång efter rendering.
- `computeFit()` ska alltså lösa kortbredden för **Permanents-zonen enbart**:
  `H = bordets höjd − 306 − padding`, `W = bordets bredd − padding`, och pröva kolumnantal som idag.
- Ett tappat kort tar en **kvadratisk** plats (kortets höjd i båda led). I `computeFit()` betyder det
  att en rad med `k` tappade kort är `k · (h − w)` bredare än en rad med bara otappade — ta med det,
  annars hamnar sista kortet utanför när många är tappade.
- Lands skalar **inte** med `--cardw`: landkorten är fasta 30 px och radbryter i stället. Vid fler än
  ~7 färggrupper (fem färger + specialland + färgväljaren) radbryter de till en tredje rad, som ryms
  inom 306 px.
- Testfallen som måste rymmas utan skroll: **20 permanents / 4 tappade / 1 bifogad** och
  **38 lands i fem färger (7 per färg, 5 otappade + 2 tappade) + 3 specialland**. Båda är ritade i `3a`.

## State Management

Utöver dagens `state`/`prefs`/`player().cards` behövs per kort:

| Fält | Typ | Betydelse |
| --- | --- | --- |
| `e.tapped` | `bool` | vridet 90° |
| `e.attachedTo` | `string \| null` | id/nyckel på värdkortet; kortet ritas då bakom värden |
| `e.zon` | finns redan | `spell` / `mana` / `grav` — behåll, styr zonvalet |

Härledd data (räkna, lagra inte): antal otappade/tappade per färggrupp (`"5/2"`), antal bifogade per
värd (`"+1"`), `"20 · 4 tappade · 1 bifogad"`, och handbarens meta
`"20 permanents · 38 land · 6 i graveyard"` (dagens `#handCount` bygger redan strängen ur `delaHand()`
— byt bara ordet *kort* mot *permanents*).

UI-läge (behöver inte sparas): `hoverIndex`, `dragging`, `attachMode: {source, targets[]}`,
`gravOpen`. `tapped` och `attachedTo` ska sparas i localStorage med resten av handen.

Funktioner i `index.html` som berörs:

| Funktion | Ändring |
| --- | --- |
| `renderGrid()` | en zon för alla permanents; tappade i kvadratisk plats; bifogade stackade; hover-ring + handlingsrad; släppytelogik |
| `renderMana()` | ersätt `.mgrp` (symbol + siffra) med landstaplarna; dela per färg i otappat/tappat; `5/2`-räknare |
| `gravHtml()` | oförändrad logik, nya mått (80 px kort, 34 px gravsten) |
| `renderSel()` | måste kunna markera ett bifogat kort och ett tappat kort |
| `computeFit()` / `nedreHojd()` | se *Skalning* |
| `delaHand()` / `zonAv()` | oförändrade; `e.zon` styr fortfarande |
| `flyttaTill()` | återanvänds av både knappen och drag-and-drop |
| `#gravOv` | ny layout enligt `3d`, återanvänds för bifogade staplar |

## Design Tokens

Använd repots befintliga variabler först:

| Variabel | Värde | Används till |
| --- | --- | --- |
| `--bg` | `#0d1015` | bordets botten |
| `--bg2` | `#141922` | fältbakgrund |
| `--bg3` | `#1b2230` | knappar |
| `--bg4` | `#232c3c` | aktiv knapp, brickor |
| `--line` | `#28313f` | ramar, avdelare |
| `--txt` | `#e7ecf4` | text |
| `--dim` | `#93a1b6` | sekundär text |
| `--dim2` | `#66748a` | tertiär text |
| `--acc` | `#f0a52a` | markering, primär knapp, släppyta |
| `--acc-d` | `#8a5d10` | aktiv/pressad accent |
| `--red` | `#e2606a` | ta bort |
| `--mono` / `--sans` | — | räknare / all övrig text |

Nya värden som designen inför (lägg till som variabler om du vill):

| Värde | Används till |
| --- | --- |
| `#5c6b82` | zonetikett |
| `#1c2330` | linjen i zonrubriken |
| `#41506a` | räknare och fotnoter i rubriken |
| `#2f3a4c` | ram på släppyte-chippen |
| `#0b1017` | nedre bandets/panelernas botten |
| `#0f141c` | Markerat-rutan, graveyard-panelen |
| `#15181d` + `#2c2f35` | graveyard-lagren |
| `#6b8cff` (finns som `--blue`) | hover-ring |
| `#120e06` / `#1a1408` | tänd släppyta |
| `#ffd98a` / `#c9b485` | text på accentbakgrund |
| `#333e50` / `#3d4a5f` | ramar på flytande paneler |

**Mått:** kort i Permanents 88 px (formeln `--cardw`), tappad plats = kortets höjd i kvadrat,
landkort 30 px med 8 px synligt (`margin-left:-22px`), gap 6 px mellan kort, 7 px mellan rader,
8 px mellan färggrupper, 10 px runt bordet, nedre band 306 px, kolumner 172 px (Markerat) och
100 px (Graveyard), radier 5 px (kort) / 8 px (rutor) / 12 px (panel) / 11 px (chip).

**Typografi:** zonetikett `600 9.5px`, räknare `10px mono`, kortnamn i Markerat `10px`,
paneltitel `600 14px`, knapptext `11–12.5px`, hover-etikett `10.5px`.

## Assets

- **Manasymboler:** `assets/mana/W.svg`, `U`, `B`, `R`, `G`, `C` — finns redan i repot
  (hämtade från Scryfalls symbology, uppdateras med `scripts/hamta-mana.sh`). Används 15×15 i
  landräknaren.
- **Gravsten:** konstanten `GRAVSTEN` i `index.html`, oförändrad.
- **Ikoner:** befintliga inline-SVG:er i `index.html` (rotationspil, pil ner, kryss, kamera,
  tre-kortsbunten). Nytt är en länkikon till attach-knappen — samma stil,
  `stroke-width:2.2; stroke-linecap:round`.
- **Kortbilder:** Scryfall via appens `imgOf()`. Mockupens `api.scryfall.com/cards/named?exact=`
  används bara för att visa riktiga kort i designfilerna.

## Files

I det här paketet:

| Fil | Innehåll |
| --- | --- |
| `Bordsvy mockups.dc.html` | **huvudfilen** — alla iterationer. Turn 3 (`3a`–`3d`) är det som ska byggas |
| `Bradet.dc.html` | Permanents-zonen: 20 kort, 4 tappade, 1 bifogad stapel |
| `Landsband.dc.html` | Lands-zonen: fem färger × 7, tappat/otappat, specialland, färgväljare |
| `Bordstopp.dc.html` | topbar + handbar + granskningsrad (återskapade ur `index.html`) |
| `Bordsfot.dc.html` | kortkommandoraden |
| `Nuvarande bordsvy.dc.html` | pixeltrogen återskapning av **dagens** vy, som jämförelse |
| `support.js`, `_ds/` | runtime + stilar som designfilerna behöver för att öppnas i webbläsare |
| `assets/mana/` | manasymbolerna designen använder |

Att läsa i mockupen: öppna `Bordsvy mockups.dc.html` i en webbläsare. Överst ligger turn 3
(`3a` fullt bord, `3b` hover och drag, `3c` attach-läget, `3d` graveyard-bläddraren), under den
turn 2 och turn 1 med de tidigare riktningarna.

Vilka delar av `index.html` designen bygger på (för orientering):
tokens rad ~10–60, shell och handbar ~100–200, `.manarow`/`.grav` ~355–500, `.pendbar` ~750–760,
markup ~925–1010, och `computeFit()` / `renderGrid()` / `renderMana()` / `gravHtml()` ~2921–3230.

## Startprompt till Claude Code

> Läs `design_handoff_bordslayout/README.md` och öppna `Bordsvy mockups.dc.html` — turn 3 (`3a`–`3d`).
> Bygg om huvudvyn i `index.html` enligt den: en zon **Permanents** för allt utom land, en kompakt
> **Lands**-zon med landstaplar per färg, och nedre bandet i ordningen Lands → Markerat → Graveyard.
> Följ måtten i README:n exakt, men använd repots egna CSS-variabler och `--sans`, och bygg vidare i
> de befintliga `render*()`-funktionerna — ingen ny ramverksberoende, allt i `index.html`.
> Börja med layouten (`3a`) och `computeFit()` så att både 20 permanents och 38 lands ryms utan skroll
> i ett 720×900-fönster. Ta sedan interaktionerna i tur och ordning: hover + handlingsrad, tappa/untappa,
> drag till graveyard, attach-läget, och till sist graveyard-bläddraren i befintliga `#gravOv`.
> Verifiera varje steg mot mockupen innan du går vidare.

# Mesa: fria mattan, flera lekar, två spellägen

Plan 2026-09-12. Byggs av Fable 5.1 i den här sessionen, deluppgift för
deluppgift med commit + push, Linear synkad. En kopia av planen läggs i repot
som `dev/plan/lagen.md` i förberedelsecommiten så att Opus-sessioner kan ta
avgränsade deluppgifter i egna worktrees.

Radnummer nedan gäller `index.html` på commit `d810247`.

## 1. Context

Mesa är en enfilsapp (`index.html`, 17 100 rader) för att spela Magic med
fysiska kort: telefonen filmar bordet, känner igen korten mot spelarens lek,
datorn speglar bordet digitalt till alla i spelet. I dag: EN lek per konto,
en zonlayout appen själv bestämmer, och kameraregeln "lägger till och vrider,
tar aldrig bort".

Jesper vill ha (1) en fri matta enligt Direction C v3, (2) flera namngivna
lekar med färger/antal, synliga i headern och för motståndarna, fyra sätt att
lägga till kort, (3) två spellägen per spelare som kan blandas i samma spel,
och (4) att läge 1 känns omedelbart och alltid rätt. Läge 3 byggs inte.

### Besluten med Jesper (D1–D10)

| # | Beslut |
|---|---|
| D1 | Lägen = regler per handling, med rättning som står sig till nästa fysiska händelse |
| D2 | Borta i läge 1: fråga först (graveyard förvalt); graveyard-ruta i bild senare |
| D3 | Läge 1 speglar positioner; drag av för kamerabundna kort. Läge 2: nya kort bredvid de andra, fri dragning |
| D4 | Mattan = sju stegen + inspektorn. Lasso/inkorg senare. Bifoga = hög. Tokens = egen låg deluppgift |
| D5 | Ny tabell `decks` + `game_players.lek_id/lek_info`; `lekar` → "My deck"; SQL via Supabase-MCP; sideboard med i poolen; antalstak = varning med *Add anyway* |
| D6 | Hela appen på engelska (egen deluppgift för dagens svenska texter); kodens namn/kommentarer svenska |
| D7 | Ordning matta → lekar → lägen → kamerans träffsäkerhet; allt i `index.html` i markerade block; Screen leads förval, synligt för andra |
| D8 | Telefonfoto till leken: QR i lek-dialogen → telefonvy med *Take photo* → namnen till datorns öppna dialog |
| D9 | Lägesvalet i dagens lägeschip `#modeSlot` |
| D10 | Linear: fyra föräldrar + sub-issues; backlogen länkas in |

### Vad designgranskningen ändrade (14 agenter, fem linser + fyra planerare + fyra kontradiktoriska granskare + en kritiker)

Besluten står, men sex saker i dem var naiva mot koden:

1. **"Rättningen står sig" går inte med dagens `lagg()`** (15665–15669): kameran
   skriver `tapped` vid varje meddelande (150 ms + hjärtslag 3 s). Lösning:
   kameran skriver bara när DESS EGEN dom ändras (kantstyrt, inte nivåstyrt):
   `k.kamTap` minns kamerans senaste dom; `tapped` skrivs bara när
   `t.tappad !== k.kamTap`. En digital rättning står sig då automatiskt tills
   kortet fysiskt vrids igen. Samma princip för positioner (`k.kam`).
2. **Positioner har ingen orientering**: spårets x/y är andelar av hela
   videobilden och telefonen sitter hur som helst i hållaren; `kamGrund` är en
   axel modulo 180°. Utan en sparad vridning/spegling blir mattan roterad
   eller spegelvänd för spelaren OCH alla motståndare. Lösning: `vand`
   (0/90/180/270) + `spegel` i `camera_setups.ruta`, en "Rotate camera view"-
   kontroll, råa andelar sparas på kortet så en senare rättning mappar om allt.
   Spegling av positioner byggs SIST i lägesströmmen, mätt.
3. **Instants/sorceries** är den vanligaste "borta"-händelsen: kortet läggs
   ut, läses, plockas upp. Med D2 blir varje besvärjelse en fråga. Lösning:
   ett kort vars typrad matchar Instant/Sorcery och som försvinner inom 20 s
   efter att kameran skapat det går direkt till graveyard med en Undo-toast,
   i båda lägena. Frågan är bara för permanents.
4. **Screen leads återuppstår**: ett kort som flyttats digitalt till
   graveyard men ligger kvar fysiskt återskapas så fort spåret föds om
   (`paBordet` 15644 räknar inte graveyard, `ledigt` 15653 vägrar). Lösning:
   `k.fysisk = true` ("ligger kvar fysiskt, borta digitalt") sätts när ett
   kort lämnar mattan digitalt medan spåret lever; i Screen leads binder ett
   sådant kort tyst om och räknas som på bordet; rensas när spåret dött.
   Residualfall (efter omladdning): frågan "Forest is back on the table?" i
   stället för ett nytt kort.
5. **Graveyard-högen i bild** blir spökpermanents i båda lägena (varje nytt
   översta kort = nytt spår med leknamn). Lösning: den billiga halvan av D2:s
   fas 2 dras fram som egen S-uppgift: en uteslutningsruta (`ruta.grav`)
   ritad på datorns kamerapanel; spår födda i rutan får `zon:'grav'` och
   filtreras bort i `avstamBord`. Tidskorrelation och auto-graveyard förblir
   fas 2. Tills rutan finns säger lägespanelen "Keep your graveyard outside
   the frame".
6. **Antalstaket är ett prior, inte ett tak**: kloner, extra basland och
   tokens är legitima. Räkningen `lekAntal(namn)` (main + sideboard) används
   som (a) prior på telefonen (`kamIdentifiera` degraderar till osäker med
   domskäl `fler än leken`) och (b) en varningspost på datorn ("That's your
   5th Forest — the deck has 4 · Add anyway / Not a card") — aldrig ett
   stopp i `avstamBord`.

Mindre justeringar som också ingår: mattan får "pending verdict"-tillstånd
på kamerabundna kort (moving / reading / lost 0–3 s) så att latens läses som
"tittar", inte "fel"; drag är avstängt per BINDNING (`c.spar != null`) inte
per läge, så skärmdumps- och handkort förblir flyttbara i läge 1; pointer-
gesten på ett kamerabundet kort panorerar i stället för att vara död; "Just
played · drag if the spot is wrong"-chippet säger bara "Just played" i läge 1;
Untap all / Tidy up döljs i Table leads; banner-tröskeln är ≥3 kort tappade
inom ETT `BORTA_NAD`-fönster (inte ackumulerat per zon); `ZON_EXIL` införs
(litet högläge bredvid graveyard) så att arkets "Exile" är sant; tokens får
minst "Not a card / it's a token" i det olästa kortets ark; DFC-baksidor i
poolen och Commander-lekars 80-namnstak (klientsidan, ingen promptändring)
ligger i kameraströmmen.

## 2. Arkitektur

### Kortet (per kort, utöver dagens `cid,name,sid,flipped,tapped,attachedTo,zon,lyft`)

| Fält | Typ | `slimKort` (lokalt) | `slimDelat` (delas) | Betydelse |
|---|---|---|---|---|
| `x`,`y` | number | ja | ja | brädkoordinater, otappat kort, övre vänstra |
| `z` | number | ja | ja | staplingsordning |
| `grp`,`gi` | string/number | ja | ja | manahög + plats |
| `cts` | `{p,t}[]` | ja | ja | counters |
| `zon` | +`'exil'` | ja | ja | graveyard/exile-hög |
| `kamTap` | 0/1 | nej | nej | kamerans senaste tap-dom (kantstyrning) |
| `kam` | `{x,y,w,h,nar}` | ja | nej | spårets mitt/mått i bildandelar, senast antagna |
| `fysisk` | bool | ja | nej | borta digitalt, ligger kvar fysiskt (Screen leads) |

`spar`, `borta`, `ny` förblir runtime. `state.sel` förblir ett index (64
användningar); arrayordningen slutar betyda layout (`sorteraMana` anropas inte
från render). Använd `!= null`-kontroller i `slimKort`/`slimDelat` så att
`0` (x, y, z, gi) överlever. Inget `counters`-fält finns i dag: `cts` startar
tomt, ingen migrering behövs.

### Lägespolicyn i `avstamBord` (15613–15850, harness-skivan 15134–15851)

`game_players.lage text not null default 'skarm'` (`'skarm'|'bord'`), läst
via `hamtaSpel` → `p.lage`, skrivet av spelaren själv (`gp_andra_sitt`
finns), synligt för alla via befintlig realtime. Lokalt bord: `prefs.lage`.
Inne i skivan: `spelPolicy(mig)` läser `mig.lage || 'bord'` → harnessens
stubbspelare saknar `lage` och förblir Table leads, så de 86 proven gäller.

| Handling | Table leads (`bord`) | Screen leads (`skarm`) |
|---|---|---|
| Lägga till | ja (räknar kort, inte spår, 15723–15741) | ja |
| Tappa | `tapSynk = kamGrund !== null`, kantstyrt via `kamTap` | aldrig; `kamTap` uppdateras ändå |
| Flytta | `k.kam` skrivs när spåret är stilla/klar och flyttat > `AUTO_FLYTT` (15262); mattan mappar | aldrig; nytt kort på `slotBeside` |
| Borta | `borta` → `lyft` efter `BORTA_NAD`; ark/banner; besvärjelseregeln | bindningen släpps tyst; besvärjelseregeln; `fysisk` |
| Grund-steget | ja | nej |
| Bifogade/staplade | `kanLyftas` falskt när värdens/ledarens spår syns | — |

Nya identifierare i skivan: `spelPolicy`, `notRattelse`?, `svaraAter`,
`aterFragor`, `gravAvHandelser` (fas 2) — alla DEFINIERADE inne i skivan.
Enda nya namnet UTANFÖR skivan som skivan läser: `lekAntal` → stubbas
`() => Infinity` i både `dev/avstamning.cjs` (miljo 22–47) och
`dev/dubbletter.cjs` (79–100). Inga mattidentifierare (`matVy`, `platsPos`,
`CW`) får refereras inne i skivan.

### Lekarna

```sql
create table decks (id uuid pk, user_id uuid, namn text, kort jsonb, farger text[],
  antal int, skapad, uppdaterad);           -- RLS som lekar_*
alter table game_players add lek_id uuid references decks on delete set null,
  add lek_info jsonb, add lage text not null default 'skarm';
-- engångs-upsert lekar → decks 'My deck' (server, inte klient)
```

`decks.kort[] = {name, sid, small, n, ci, sb}`; `uppdaterad` skrivs
explicit av klienten vid varje spar (Postgres default gäller bara insert).
Poolkod `'lek:' + deckId` (andra argumentet till `byggLekPool` byter betydelse
men behåller plats — `kor.html:269` skickar en egen sträng). Telefonen läser
`game_players.lek_id` för spelet. `decks` läggs INTE i realtime-publikationen
(D8 går via broadcast-kanalen `'lek:'+userId`).

### Block i `index.html` (för parallella sessioner)

| Block | Region (ungefär) | Ström |
|---|---|---|
| MAT | CSS 294–1050, HTML 2622–2673, JS 5559–6470, 7008–7415, 7491–7530, 7723–7830 | A |
| DECKS | HTML 2804–3004, JS 7841–9200, Moln 5110–5140, `supabase/` | B |
| MODES | 6477–6640, skivan 15134–15851, 16361–16470 | C |
| CAMERA | `const Kamera` 12024–14535 + 14536–15076, `dev/golden`, `dev/kamerabank.cjs` | C |

Delade rader alla rör: `hamtaSpel` 5039–5045, `byggSpelare` 16803,
`fjarrSpelare` 16827, `normalisera` 5327, `slimKort/slimDelat` 5440–5458,
`renderTabs` 5517. Därför förberedelsecommiten (fas 0) nedan.

Harness-invarianter som ALDRIG får brytas: (1) markörerna
`/* ── samma kort, två spår` (första förekomst) och raden `let senasteSpar = [];`;
(2) `const Kamera = (() => {` i kolumn 0 och första `})();` i kolumn 0 därefter
— inga nya IIFE:er på kolumn 0 mellan dem, och mattans block är INTE IIFE:er;
(3) `Kamera` top-level const; `lookup`, `imgOf`, `byggLekPool`,
`kamIdentifiera`, `visaVy` top-level function declarations; `visaVy('kamera')`
ska fungera huvudlöst utan spel; (4) bordsmeddelandets och spårets form är
`dubbletter.cjs` loggformat — bara VALFRIA nya nycklar.

## 3. Fas 0: förberedelse (en commit på main, S)

1. `hamtaSpel` 5039–5045, `byggSpelare` 16803, `fjarrSpelare` 16827: spread av
   `game_players`-raden (`lage`, `lek_id`, `lek_info` följer med generiskt);
   `nyare`-grinden bara för `cards/version`; `normalisera` 5327 defaultar
   `p.lage`.
2. `/* ══ BLOCK: MAT | DECKS | MODES | CAMERA ══ */`-markörer utanför
   harness-intervallen.
3. `dev/kolla.sh`: `node dev/avstamning.cjs && node dev/dubbletter.cjs --fall 07 && node dev/kamerabank.cjs`
   — körs före varje push. Syntaxkontroll: klipp ut `<script>`-blocken och
   `node --check` (headless `--dump-dom` hänger på Mesa, se minnet).
4. `lekAntal` stubbad `() => Infinity` i båda harnessarnas miljo; stubbspelaren
   får inget `lage` (= Table leads); `nollstall()` i avstamning.cjs återställer
   `lekTal`/`lage`.
5. Poolnyckeln `'lek:' + deckId` skriven i planen (K7:s referenser följer den).
6. Linear (se §8). Acceptansraden för läge 1 i `dev/golden/historik.md`
   (K1 definierar måtten).
7. `dev/plan/lagen.md` = den här planen.

## 4. Ström A: Fria mattan (Direction C v3) + inspektor + bifoga som hög

Allt nytt är engelskt. Ordning = Jespers sju steg med inspektorn efter steg 2.
`renderGrid(force)` BEHÅLLER namnet (stubbat i harnessarna, anropas från
skivan 15848) men ritar mattan; `gridEl` = brädlagret, `gridWrap` = viewporten,
`manaRow` = graveyard-högens behållare (klass `grav` på högen så
`flygTillGrav` 5697 fungerar); id:n `zonPerm/gridWrap/grid/manaRow/emptyHand/
emptyLas/markKol` behålls så 5513-konstanterna och delegeringarna lever.
Zoner rivs visuellt men `zon`/`zonAv`/`delaHand` behålls som klassificering
(skivan och `losBifogade`/`giltigtMal` behöver dem).

### M0 — grund: datamodell, geometri (M)
- `normalizeCard` 4768–4772: `kw: c.keywords || []` och `parts: (c.all_parts||[]).filter(token)` — MEN cache-bumpen `K.cards` v1→v2 görs i M6 (med `LS.del('sthv.cards.v1')`), inte här.
- `normalisera` 5327–5340: `cts = Array.isArray(c.cts) ? c.cts : []`, `z ?? index`; x/y sätts INTE här (lat placering i render).
- `slimKort` 5451 / `slimDelat` 5440: + `x,y,z,cts,grp,gi` (`!= null`, `cts` bara när icke-tom); `slimKort` dessutom `kam`, `fysisk`.
- Nytt block `/* ═══ FRI MATTA — geometri (ren, ingen DOM) ═══ */` före `renderSel` (6355): `CW 178, CH 248, LW 128, LH 178, STACK 74, XSTEP 17, PER_STACK 4, JOIN_OV 0.24`; `matSlag(e)` (via `zonAv`), `matStorlek`, `matRect` (roterad när tappad), `boardFor/grown/fitZoom/clampPan` (viewport som parameter, ALDRIG DOM), `clampKort(c, vy, gravRuta)` (gravRuta från högens element, inte README:ns konstanter 6/146/508/740), `findJoin` (faktorisera `overlapAndel`), `layoutAll` (UTAN `tapped:false` — mockupens tidy avtappar mana), `slotBeside`, `restack`, `ctLabel/ctSum`, `bboxBoard`.
- Verifiera: `dev/kolla.sh` 0 FEL; gammalt bord ritas oförändrat; konsol: `layoutAll(player().cards,{w:1060,h:792})` ger x/y; `clampPan({x:-9999,y:0},1,{w:2000,h:800},{w:1060,h:792}).x === -940`.

### M1 — steg 1: ytan, zoom/pan, mattans chrome, zonrivning (L)
- HTML 2622–2666 → `.brade > .matta#zonPerm > .mattavp#gridWrap > .mattabrade#grid` + `#mattaChrome` + `.gravhog#manaRow` + `#emptyHand/#emptyLas`; `.kolmark#markKol` kvar (M3). Behåll `.detail`-asiden ELLER stubba `renderDetail` — annars TypeError i varje `renderAll` (6469, 7068, 7106, 7777, 7816, 9388).
- CSS: `.brade` två kolumner utan band; media query 307–321 skrivs om (refererar bandraden); `--bandh` bort; `.matta` (radial-gradient + vinjett från README-tokens), `.mattabrade` (transform-origin 0 0, transition none | .32s), `.card` absolut med inline width/height, `.card.tappad{transform:rotate(90deg)}` + `brightness(.86) saturate(.94)`; TA BORT `.card:hover`/`.card.sel` translate-transform (556, 560, 1500) — de vinner annars över rotationen; behåll `.card.sel::after`-ringen.
- Ta bort: `permRyms/computeFit/applySize` 5572–5622, `renderMana` + landbandet 6175–6297, `setCardW` 7579, zoomknapparna 7626, `.zoomctl` 2615–2619, `landStapel` i `tappa`, `antalSpell`. **Alla** anropare av `applySize/sattLandBredd`: 17097 (boot-IIFE — kraschar annars vid start), 17125, 16993, 16780, 16354 (`dockaKamOv` → `matResize()`), 9269 (+ menyvalet 9235), 7587, 7628, 7637, 5996.
- `matVp()` läser `#gridWrap` men faller tillbaka till `{1060,792}` när `clientWidth<=0` (#app är `display:none` vid boot, i lobbyn och i `kor.html`) och `save()` anropas ALDRIG från placeringen när viewporten är degenererad.
- `matPlacera(p)`: kort utan x: platshållarens slot (`platsPos` Map spar→{x,y}) → annars om inget kort placerats och ≥3 → `layoutAll` → annars `slotBeside`. Bara editerbart bord sparar.
- `renderGrid`: diffar per `data-cid` och patchar `style.left/top/transform` för befintliga element; bygger om innerHTML bara vid strukturändring (annars dör solfjädern/counterpanelen vid varje hjärtslag; kamerans positionsuppdateringar i MODE-5 går genom samma väg). Signatur (5931) får `x,y,z,grp,gi,cts` + vy.z/pan. `renderSel` via `.card[data-cid]`, INGEN auto-pan från `renderSel` (körs vid varje hjärtslag).
- `matVy()/setPan/setZoom/onWheel` (passive:false, `touch-action:none`), pan-drag på tom yta när inzoomad, `zoomBy`, `fitView`, `renderChrome()` (zoomchip grön "78 % fit"/gul "140 %", Fit, Untap all med Undo, Tidy up = `layoutAll` + fit). Untap all/Tidy up döljs i `lasvy` och (från MODE-2) i Table leads.
- Tangenter `+ − 0` → zoom; `renderLyftRad` stubbas (M9); minimal `matNav` (närmaste kort i riktningen) redan här — `stepRow` räknar annars kolumner ur `offsetTop`.
- Verifiera: `dev/kolla.sh`; `node dev/golden/kor.cjs` bootar; gammalt bord → alla kort på mattan, reload → samma platser; hjul zoomar mot pekaren, shift panorerar; 25 kort via List (B) → ytan växer, zoom faller till fit; kamerarecept i konsolen (minnet `kamerans-datorsida-provas-utan-telefon`) → platshållare på `slotBeside`, kortet landar där; andra webbläsaren ser samma positioner.

### M2 — steg 2: drag, klick = tap, z-ordning, klamp, Undo (M)
- Ersätt dnd-blocket 7217–7415 med pekarmaskinen (behåll namnet `dnd` och `.drar` — `medFjarr` 16873 läser dem); `pointerdown` på kort → `sel`, `topZ`, offs; <4 px = `tappa(i)`; drag skriver style direkt; släpp → `clampKort` + `save` + `renderGrid(true)`; `pointercancel`/`blur` avbryter; Escape återställer.
- Guard överst i `renderGrid`: `if (dnd && dnd.drar) { fjarrVantar = true; return; }` så kamerans render inte river draget; `fjarrIkapp` 16878 efter pointerup.
- `matAngra(msg, mutate)`: snapshot genom referensbyte som `#clearHand` 7603 / `removeAt` 6847 (INTE `slimKort`-djupkopia — den tappar `spar` och bryter kamerabindningen efter Undo); toast 4,6 s.
- Släpp på högen: `.over` + chip "Let go — <name> lands face up on top" → `matAngra(flyttaTill(i, ZON_GRAV))`; `inuti()` 7300 för träffen.
- `flyttaTill` 5723: inga `sorteraMana`-anrop; x/y behålls vid graveyard (Return to play lägger tillbaka där det låg).
- Ta bort `,`/`.` (moveSel) + hjälptext 3204; `svalgKlick` 6987 kvar.
- Verifiera: drag 300 px → kvar efter reload; släpp på högen → i graveyard, Undo → samma x/y; klick = tap med bibehållen mitt; inzoomad 150 % följer draget 1:1; läsvy: pointerdown gör inget; Escape mitt i drag + fjärrändring i annan flik → `fjarrIkapp` tillämpas.

### M3 — inspektorn (M)
- `#markKol` → `#inspektor` (rubrik `Pointing at`/`Last card`, `F enlarge`, bild `imgOf(card,fi,'large')`, namn, typrad via `typLinje` 5644, keyword-brickor, grön counters-ruta när `ctSum ≠ 0`).
- Ta bort `renderMark/markHtml` 6301–6328, `renderDetail/#detailPad` 6399–6429 + CSS 649/2331/2368, `hoverNamnHtml` 5893; hover via delegerad `pointerover/out` på `gridEl` med 90 ms fördröjning; ignorera under `dnd.drar`; dataset-nyckel så bilden inte laddas om.
- `body.tomhand .kolmark{display:none}` 343/2369: inspektorn ska visas även på tomt bord med platshållare — justera.
- Verifiera: hover → "Pointing at"; bort → "Last card"; piltangenter uppdaterar; F/bildklick → fokus; `grep -c 'renderDetail\|detailPad\|markHtml\|renderMark'` = 0.

### M4 — steg 3: manahögar (M)
- `pointermove`: `joinId = findJoin` (bara ensamt land, inte över högen); mål-högen `.joinmal` (2.5px accent + inset 5px tint), chip "Let go — the mana stacks here"; `pointerup` → `restack(cid)`; `losStackar` (grupper <2 löses) bredvid `losBifogade`; z = 200+gi; Tidy up staplar `PER_STACK` per kolumn `LW + 3·XSTEP + 40` isär.
- `restack`/`losStackar` bara på editerbart bord; `renderGrid`:s `if (losBifogade(cards)) save()` 5926 gateas på `arMitt`.
- Kamerakort (Screen leads) landar via `slotBeside`, aldrig auto-join.
- Verifiera: Forest på Forest → hög 2 (74/17 px), tredje → 3, dra ut översta → 2 kvar; under 24 % → ingen join; tappa mittkort på plats; reload → högar kvar; teammate ser grp/gi.

### M5 — bifoga som hög (M)
- Ta bort modala `attach/startaAttach/ritaAttach/utforAttach` 6995–7036 + CSS 521–544; TA OCKSÅ bort attach-knappen i `hoverRadHtml` 5886 och `kortAktion` 7073 (annars anropas raderad funktion tills M6).
- `bastVard()` = `findJoin`-loopen filtrerad på `giltigtMal`; `giltigtMal` 5847 släpper zon-kravet (Fortification på land fungerar aldrig i dag) → typrad-regex + värd inte i grav/exil.
- Släpp → `attachedTo = host.cid`, `tapped = 0`, `grp/gi` bort; chip "Let go — Equip/Attach/Fortify to <host>"; bifogade ritas bakom värden, titelraden sticker upp (`bifogadPlats(host,k) = {x: host.x + XSTEP·(k+1), y: host.y − 44·(k+1), z: host.z − (k+1)}`); värdens drag tar med bifogade; drag ut <24 % → lossa; `losBifogade` 5854 skriver tillbaka härledd x/y först; Aura följer värden till graveyard (en Undo), Equipment/Fortification blir kvar.
- E = bifoga markerat kort till närmaste giltiga värd (toast 7003 kvar).
- Verifiera: Bonesplitter på varelse → bakom, `+1`-bricka; dra varelsen → följer; dra ut → lossad; på land → ingen markering; värd till graveyard → equipment fritt på sin plats; E fungerar; andra webbläsaren ser stacken.

### M6 — steg 4: förmågor som ord + P/T bas → total, hover-pillen, menyn (M)
- `kortHtml` 5773: `.kw` (max 3 + `+N`, 700 9px versaler, `rotate(-rot)` origin `0 100%`), `.pt` (mono 13.5px; `Number(f.pow)`/`Number(f.tou)` — Scryfall ger STRÄNGAR, annars `'2'+1 = '21'`; visa rå bas `*/*` utan total när NaN), gradient 44 px för permanents; land och olästa utan ord; `title`-attributet 5785 bort.
- **Cache-bumpen här**: `K.cards` → `sthv.cards.v2` + `LS.del('sthv.cards.v1')` vid start.
- Hover-pillen som SYSKON till `.card` (positionerad från `matRect`, roterar aldrig): hint, primär (Tap/Untap · senare "Where did it go?"/"Which card?"), `+` (M7), `⋯` → meny (Tap/Untap, Turn face up/down, Counters…, Not this card? → `oppnaGranskningFor`/sök, It's gone — where to? → ark (M9; tills dess graveyard), Remove). Läs `menuEl` 9204 innan en ny popover byggs.
- Verifiera: Flying/Deathtouch/Lifelink/Haste → 3 brickor + `+1`; tappa → upprätt läsbart; `cts [{p:1,t:1}]` → `2/3 → 3/4` grön; läsvy: ingen pill.

### M7 — steg 5: counters (M)
- Block `/* ═══ FRI MATTA — counters ═══ */`: `matCtr`, `openCounters/addCounter/removeCounter/renderCtrPanel` i `#ctrPanel` inne i `#zonPerm`; förval `+1/+1 +1/+0 +0/+1 +2/+2`; Any amount −20…20; "On the card"-brickor (klick tar bort en); Done; stängs vid drag/pan/annat kort/Escape (före `menuEl` i 9357-kedjan). Ingen Undo (snabba upprepade handlingar, som mana ± 7171).
- Inspektorn får counters-rutan.
- Verifiera: två `+1/+1` → `2/2 → 4/4`, `×2`, ta bort en → `×1`; `−1/+0`; reload/teammate ser totalen; drag stänger.

### M8 — steg 6: graveyard-solfjädern + `ZON_EXIL` (M)
- `renderGravHog`: hög + `#gravFan` (samma rekt, `pointer-events:none`, barnen auto); `fanOpenNow/fanCloseSoon` (24 ms/130 ms/240 ms); per kort `dx = i·fStep` (`fStep = min(96, 828/(n−1))`, klämd till `(vpW−60)/(n−1)`), `dy = −64 − sin(t·π)·30 − (hover?20:0)`, `a = −9 + t·18`, stagger 22 ms; hovrat: +20 px, 1.1, accentring, inspektorn "From the graveyard", knapparna Return to play / Exile vid `(dx−30, dy−44)`; drag >6 px → `spawnFromGrave` → vanlig dnd. **Delegera** `pointerover/out` på `manaRow` (innerHTML byggs om vid varje render) och håll fan-state i variabler.
- `gravTillbaka(e)` (delete zon; x/y om saknas) och `gravExil(e)` faktoriseras ur `#gravBack/#gravRemove` 7542–7562; `#gravOv` behålls för klick/Enter/touch.
- `ZON_EXIL`: `paMattan(e)`-hjälpare; `delaHand` 5686, `kanLyftas` 15195 (i skivan — använd zonsträng, ingen ny konstant utifrån), `paBordet` 15644, `giltigtMal`, `losBifogade`, `renderGrav`; exile-högen = liten räknare bredvid graveyard med samma fan; persisteras via `zon`.
- Verifiera: tre kort i graveyard → fjädern; flytta till mittkortet utan att den stänger; Return to play; drag ut → mattkort, Undo tillbaka; Exile → exile-högen räknar; klick → `#gravOv`; läsvy utan knappar.

### M9 — steg 7: kantfall på mattan (L)
- Kortlägen ur befintliga signaler: `lyft != null` → grå/streckad + chip "Not on the table — where did it go?" (chip bara när ≤2 saknas); `ny < 2500 ms` → landa-animation + chip "Just played" (≤3 nya); `.plats.fyll` → mönsterkort "?" med chip "Camera couldn't read this — which card?"; kamerabundna kort visar pending-dom (spårets `tillstand` 'ny' → mjuk kontur "moving", 'stilla' utan namn → "reading", `borta` satt → "lost…").
- Arket (`openSheet/renderSheet`, nyckel = `cid`, inte index): **Graveyard** (förvalt, Enter) / **Exile** (M8) / **Back to hand or library** (= `removeAt` med Undo) / **False alarm — it's still there** (= `slappLyft` + grön puls via `e.ny`). Aldrig auto-öppet; en återkommen track stänger det via `binder`.
- Banner `#lyftBanner` i mattans chrome när ≥3 `lyft` inom ett `BORTA_NAD`-fönster (`max(lyft) − min(lyft) < 3000`): "The camera lost N cards at once — a moved phone and a board wipe look the same from up here. Nothing was removed." Keep all / All to graveyard / One by one. `renderLyftRad` → `renderLyftBanner`; `svaraLyftAlla(zon=null)` = alla; `#lyftAlla`-lyssnaren 15964 + 7094/7203 skrivs om.
- Granskning en och en: `.granskar .card:not(.aktuell){opacity:.25}`, `.aktuell{box-shadow:0 0 0 9999px #05080cb8}`, rubrik `3 of 9`, Decide later / Stop reviewing.
- Oläst kort: gissningsarket ur `q.cands.slice(0,3)` + "Show me the crop" (öppnar SW som i dag) + "Not a card / it's a token" (→ `borttagna.add(spar)`) + "Leave it unread". Faktorisera pend-grenen ur `applyPick` 11556–11573 till `namngePend(q, name, sid, cands)` — driv INTE `applyPick` via fejkat `SW.target` (muterar SW-kön). Ersätt `.plats.fyll`-lyssnaren 7112–7117, lägg inte till en andra.
- Besvärjelseregeln (MODE-3 äger logiken i skivan; M9 ritar toasten).
- Läsvy (`!redigerbar()`): streckat + "camera lost it", inga imperativ, inget ark, ingen banner.
- Verifiera: konsolrecept: 4 spår → 4 kort; skicka bord utan 3 av dem, >3 s → banner; One by one → `1 of 3`, Graveyard → nästa, Decide later hoppar, Stop → grå med chip; ett saknat → ark; False alarm → grön puls; skicka spåret igen innan svar → puls, ark stängs; okänt spår med 3 cands → mönsterkort → välj → namngivet, pending borta; 25 namn → ytan växer, inget befintligt kort flyttas.

### M10 — städning, spatial navigering, hjälptext (M)
- `matNav(dx,dy)` (närmaste kort i halvplanet, |dy|-straff ×2, Home/End i läsordning); ta bort `navIdx/navPos/snapNav/step/stepRow` 7723–7817, Enter-på-graveyard 9393; `sorteraMana` 5758, `antalSpell` 5768, `moveSel` 6854, `navRad2` 7741, `landStapel` 7046, `.idx`/`prefs.shownums` + menyval 9235; alla orphans (`grep -nE 'computeFit|applySize|setCardW|renderMana|sorteraMana|landStapel|navIdx|stepRow|renderDetail|renderMark|lyftRadHtml|renderLyftRad|ritaAttach|dndVisa'` → 0 träffar); `--cardw/--lw/--bandh`, `.kortnamn`, `.fargmeny*`, `.lakt/.mgstep/.fargval/.zonchip/.lctrl/.lkort` i lasvy-listan 1479–1499.
- Hjälpöverlägget 3175–3216 (engelska): pilar = närmaste kort, `+ − 0` = zoom/fit. Footern rörs inte (dess påståenden är fortfarande sanna).
- Verifiera: `dev/kolla.sh`; `node dev/golden/kor.cjs` (lokalt) bootar och ger vanliga siffror; full manuell runda utan ReferenceError.

Öppna frågor A avgör jag så här: basland-snabbtillägg (färgknapparna) klipps —
sökrutan lägger till land; `#gravOv` behålls; zoom/pan per spelare sparas
inte (fit vid start); bifogade sticker upp ovanför värden.

## 5. Ström B: Flera lekar

Kan starta i egen worktree direkt efter fas 0 (rör inte MAT-blocket); D5-3
(flikarna) landar EFTER M10 tillsammans med MODE-2:s flikmärke.

### D5-1 — `decks`, `game_players.lek_id/lek_info/lage`, Moln-API (S)
- `supabase/lekar.sql` (idempotent): tabell, index `(user_id, uppdaterad desc)`, RLS + grant som `lekar_*` (schema.sql 244–260), kolumnerna på `game_players` (inkl. `lage`, MODE-1), migrering som **upsert** på `(user_id, namn='My deck')` när `lekar.uppdaterad > decks.uppdaterad` (annars tappas en lek sparad mellan D5-1 och D5-2), `coalesce((k->>'n')::int,1)`. Appliceras via Supabase-MCP `apply_migration`; `UPPSATTNING.md` får steget; noten att DB är källan och schema.sql förs för protokollet.
- Moln 5110–5139: `hamtaLekar, hamtaLekRad(id)` (ts = `Date.parse(uppdaterad)`), `skapaLek, sparaLek(id, …)` (skriver `uppdaterad` explicit + `nyare`-guard som 9132–9141), `dopOmLek, raderaLek` (nollar `lek_info` på egna `game_players`-rader först — FK nollar bara `lek_id`), `valjLek(gameId, lekId, info)`, `minLekIGame(gameId)`; `sparaMinLek` markeras legacy.
- Verifiera: Table Editor visar `decks` med migrerad "My deck"; konsol `await Moln.hamtaLekar()`; annat konto får `null` på `hamtaLekRad` men läser `lek_info` via `hamtaSpel`; `dev/kolla.sh`.

### D5-4 — telefonens pool per vald lek (S) — direkt efter D5-1
- `byggKamPool` 14675–14712: `minLekIGame(kamLage.id)` → `hamtaLekRad(lek_id)` → fallback nyaste lek → legacy `hamtaMinLek/hamtaLek`; `byggLekPool(lek, lek.id || Moln.minId(), …)`; status "Recognising {namn}: N cards"; `kamPoolOm`-flagga vid rebuild under bygge; `oppnaKamera` prenumererar `spelare` → `byggKamPool`.
- Guard `17118` med `!kameraEnhet` (onödig set-pool-läsning på telefonen).
- Säg till Jesper: första anslutningen bygger om poolen (~1 min) för att nyckeln byts.
- Verifiera: byt lek på datorn → telefonens statusrad byter inom sekunder; byt tillbaka → IDB-träff; `kor.html` bygger via `byggLekPool` som förut.

### D5-5 — `parseDecklist` för Moxfield/Arena/MTGO/Archidekt/TappedOut/Deckstats (M)
- 7828–7840 → `parseDecklist(txt) → [{name, n, sb, cmdr}]` + `parseList`-wrapper (platt, synkron — 11997 och `#bulkGo` 9190 kvar). Rubriker (hela raden, valfritt kolon, skiftlägesokänsligt): Deck/Main/Mainboard/Main Deck/Commander/Companion/Sideboard/Maybeboard/Considering/Tokens/About; `//Sideboard`/`#Sideboard` som rubriker när ordet är känt, annars kommentar; `SB:`-prefix; **blankrad efter ≥1 kortrad utan rubrik = sideboard (MTGO)** — `filter(Boolean)` 7829 kastar blankrader i dag; `Name <deck>` hoppas över; strip-ordning `^tags^` → `[cat]` → `*F*/*E*` → `(SET) 123` (★, bindestreck) → `· SET`; Commander/Companion → `cmdr:true, n=1`, main; Maybeboard/Tokens/About droppas till nästa rubrik.
- `lekLaggListan` 9020 → `lekLaggTill(name,'text',null,'hog',{n,sb})`; kvitto via `lekKvittoRad` 8686 + sideboard-antal. Bulk-add på bordet tar bara main.
- `dev/lista.cjs`: skär ut `function parseDecklist` … LEKEN-bannern (7841), stubbar `clamp` 4475, sex fixturer → `0 FEL`.
- Verifiera: `node dev/lista.cjs`; Moxfield-export med 15 sideboard → `60 cards + 15 sideboard`; regressioner `4 Mountain`, `4x`, `(LTC) 268`, `· M21`.

### D5-2 — dialogen: leklista/växlare, namn, färger, antal, sideboard, engelska (L)
- Header 2804–2812: `#lekTitel` KVAR för lägestitlar (`lekLage` 7957 skriver `textContent` varje gång); ny syskon `#lekValj` (pips + namn + ▾; `hidden` när `lage !== 'lek'`), `#lekNamn`, `#lekRakn` = `60 cards + 15 sideboard`.
- `K.lekar = 'sthv.lekar.v1'` (lista, migrerar `sthv.lek.v1` en gång), `K.lekaktiv` (`{id, namn, farger, antal, tak:{name:n}}`); `lekLista/lekAktiv`; `lekBaseradPa` → `lekAktiv.ts`.
- `oppnaLek` 8160–8225: lista → tom → `skapaLek` ur konto/gammal/lokal (behåll "fall aldrig igenom vid näterror" 8173–8202 och `lekSession`-kollen efter varje await); välj aktiv; `hamtaLekRad`; `lekSa` 8229 bär `ci`/`sb`.
- `lekLaggTill` 8064 / `lekSlaUpp` 8081 / `lekRatta` 8938 / `lekSparaNu`-dedup 9114: merge-nyckel `lekNyckel(name) + (sb?'|sb':'')`; `r.ci` från `lookup` (4769).
- `lekFarger()`: union av `ci` över rader med antal > 0 + basland (W/U/B/R/G via `BASLAND_NAMN` 10703), ordning WUBRG, C bara om inga färgade; pips med `MANA_SVG` 4527.
- `ritaLek` 8751: main, `Sideboard`-rubrik, sb-rader; kort-läget: "Move to sideboard" i `.korthoger` 2955 (foten har bara tre platser).
- `lekSparaNu` 9079–9174: `{name,sid,small,n,ci,sb}`, `farger`, `antal` (main), `Moln.sparaLek` med ts-guard; om leken är vald i spelet → `valjLek`; `sandKam('lek', {lekId})`; LS `lekaktiv`. Övriga `minLek`-läsare/skrivare (16734, 14583, 16456, 9181) pekas om till `lekAktiv`/listan; `kamTogsEmot`'s `lek`-gren invaliderar `lekAktiv` + `lekTakFor`-cachen.
- Dialogen översätts till engelska i samma commit (den byggs om ändå). MES-12/MES-13 (spara-knappen, "Stäng ändå" sparar) rättas här (`lekVillStanga`/`ovVeto` 9018, `lekSparaNu`).
- Verifiera: ⋯ → My decks: "My deck" med migrerade kort; spara → pips; ny lek → klistra lista → spara; växla; reload minns aktiv; sideboard-rad kvar under rubriken; utloggad mot `sthv.lekar.v1`; annan enhet sparar samtidigt → överskrivningsfrågan; harnessar 0 FEL; `kor.html` laddar.

### D5-6 — antal + sideboard i manuell inmatning, +/− på rader (S) — MES-15/16, del av MES-11
- `#lekLaggN` (1–99) + `#lekLaggSb` bredvid `#lekLaggIn` 2876; pick (9004) → `lekLaggTill(...,{n,sb})`, `await lekSlaUpp()` innan `focus()`; behåll inga radreferenser över await.
- +/− som SYSKON till `.bort` utanför `<button class="lekrad-hd">` (nästlade knappar bryter DOM); kontrollera `data-plus/minus` före `data-se` i 8961-hanteraren; minus tar från `hand` först, 0 → rad bort.
- MES-11: sorteringstoggle (namn/typ) i listan om det ryms (S), annars öppen.
- Verifiera: "Lightning B" ×4 → en rad ×4; Sideboard ✓ "Duress" ×2 → under Sideboard; + på fotorad → ×n+1; spara → `decks.kort.n` stämmer.

### D5-3 — lekchip på spelarflikar + "Pick a deck" + motståndarnas `lek_info` (M) — efter M10
- `renderTabs` 5517: efter `.nm`: min flik i spel → `p.lekId && p.lek ? pips + antal (title = namn) : "Pick a deck" (accent)`; lokalt → `egen = p.id === state.active` (`mitt` är falskt utan spel!) från `sthv.lekaktiv`; motståndare → pips + antal med namn i `title`. Bara pips + antal i fliken (matFlikar-kollapsen 5546); `.players.kompakt/.ikoner` döljer chippet. Tabbmarkering "ingen lek vald" = ihålig ring i stället för punkt.
- `#playerTabs`-klick 7431: `[data-lekvalj]` före `setActive` → `oppnaLekVal()` (popover som `#menu`): lista + "Manage decks…"; val → `valjLek` + lokalt `lekId/lek` + `renderTabs` + `sandKam('lek',{lekId})` + `hamtaLekRad` för `lekTakFor`.
- `fjarrSpelare` 16846: `lekId/lek` alltid från serverraden för andra (som `name` 16853), bara min egen rad gateas under pågående `valjLek`.
- `oppnaSpel` 16728: exakt en lek på kontot → `valjLek` tyst; hämta vald leks `kort` för `lekTakFor`.
- Verifiera: två konton: A väljer → B:s flik för A uppdateras inom ~1 s utan reload; A döper om → B:s title; 720 px brett → chippet döljs; ta bort vald lek → "Pick a deck" igen hos alla (lek_info nollad).

### D5-8 — antalsvarning med *Add anyway* (M)
- `lekTakFor(namn)` (main + sideboard, `null` utan lek) nära 9180, Map-cache; `laggTillMedVarning(items)` efter `addCards` 6836 med `ask()` 7665 "Your deck has 1 × Sol Ring and 1 is already on the board. Add anyway?" — kopplas i sök (6984) och `#bulkGo` (9195); `focus()` efter await.
- I skivan används namnet `lekAntal` (fas 0-stubben) — INTE ett andra namn: `avstamBord` steg 4: när `iSpelN + bortaN >= tak` och ingen `fysisk`/borta-kopia → pending-post `overTak` (cands `[{name,sid,score:1}]`), guardad med `!hoppade.has(t.id) && !mig.pending.some(q => q.spar === t.id)`, spåret läggs i `redovisade`, `pendKvar` behåller `q.overTak && synliga.has(q.spar) && !bunden(q.spar)`; `applyPick` hoppar `gammalt`-slaget när `q.overTak`. Granskningsposten/mönsterkortet säger "Your deck has only N × name".
- avstamning.cjs: prov där stubben returnerar ett tak (`lekTal.set('Sol Ring',1)`).
- Verifiera: lek med 1 Sol Ring vald: sök → andra gången dialog; kamera: andra Sol Ring → mönsterkort/post "deck has only 1", välj → skapas; utan lek → som förut; `dev/kolla.sh`; `kor.cjs` oförändrat.

### D8-7 — foton från telefonen via QR (L) — MES-33
Beslutet D8 står (datorn är enda redigeraren; telefonen är en skanner med
riktig kamera). Granskningen pekade på att ett S-alternativ finns (QR öppnar
samma dialog på telefonen som sparar på kontot + realtime-refresh av datorns
dialog). Om tile-protokollet visar sig skört i test byter vi till det.
- Moln: `lekKanal(cb)` på egen `lekKanalRef`, kanal `'lek:'+minId()`, event `lek`, `sandLek(typ, data)`, `lamnaLekKanal()`; samma `{typ, av, fran}`-kuvert som `sandKam`; båda sidor släpper `av !== minId()`.
- URL `?lekfoto=1`: `inbjudanIUrl`-liknande koll FÖRE 17047 (annars landar en telefon som valt lokalt läge i appen), sessionStorage `sthv.lekfoto` över Google-rundan (17074-mönstret), `rensaInbjudan` rensar parametern, startvyn får texten; `oppnaLekfoto()`: `visaVy('lekfoto')`, väntar på `probeAI` (11800) innan Take photo visas.
- `#vyLekfoto` efter `#vyKamera` (2520), utanför Kamera-IIFE:n: prick, leknamn, högar-chips (kopia av 2906–2912 → `kalla.hogar`), `<input type=file accept="image/*" capture="environment">`, stor "Take photo", status, lista, Done. `visaVy` får en rad (elementet måste finnas — `kor.html` anropar `visaVy('kamera')`).
- Faktorisera: `lekLaddaFoto(fil)` ur `lekTaEmotFil` 8270–8311, `lekDuk(canvas, box)`, `lekLasBild(kalla, signal)` ur `lekLasAv` 8622–8645, `slaUppNamn(namn[])` ur `lekSlaUpp` 8089–8111 — datorvägen ska bete sig exakt som förut efteråt (prova fil/drop/⌘V).
- Telefonflöde: foto → `lekLaddaFoto` → `lekDuk` → `lekB64` → `lekLasBild` → remsor via `lekRemsa` 8707 → `slaUppNamn` → `sandLek('foto', {id,n,otydliga,kapade,mini,kort})` + `sandLek('remsor', …)` i delar om **≤6 remsor** (kanalens tak är ~256 kB per meddelande, se 14993 — inte 1 MB); logga en riktig nyttolasts längd i commiten. HEIC via `lekArHeic` 8256.
- Dator: tile "Phone photo N" via `lekFoton`/`ritaLekRemsa` 8817 + `#lekQr` (`ritaQr` 16475 parametriserad med målelement; kopiera-länk som `#kamKopiera` 16466); `lekFranTelefon(m)` respekterar `lekSession` (8162/8192); `hej`→`lyssnar`-handskakning var 3 s; kanalen lämnas i `stangLek`. Dialogen stängd → grå prick + "Open ⋯ → My decks on the computer".
- Verifiera: QR → Google → `#vyLekfoto` med leknamn, prick grön inom 3 s; foto på ~10 solfjäderkort → tile inom ~40 s med remsor och kvitto; trasiga namn öppnar kort-läget; ta bort tilen → raderna bort; stäng/öppna dialogen → prick grå/grön; datorvägarna oförändrade; `kor.html` laddar; harnessar 0 FEL.

Öppna frågor B avgör jag: taket räknar main + sideboard; bulk-add på bordet tar main; pips för migrerade lekar fylls lat (cache först, annars utelämnas); IDB-pooler för borttagna lekar städas inte nu; en kanal per userId har samma tillitsmodell som spelkanalen (privata kanaler = eget ärende).

## 6. Ström C: Lägen

### MODE-1 — kolumn, spelarfält, `spelPolicy()` (S) — direkt efter fas 0
- SQL (i D5-1:s fil om B går först, annars egen `alter`): `game_players.lage text not null default 'skarm' check (lage in ('skarm','bord'))`.
- `Moln.sattLage(gameId, lage)` (mönster `dopOm` 5141); `mittLage()` vid 5407: `spelLage ? (minSpelare()||{}).lage || 'skarm' : prefs.lage || 'skarm'`; `lageByte` som `namnByte` 7440; lokal spelare seedas från `prefs.lage` vid start (efter 5341).
- I skivan vid grund-blocket 15196: `function spelPolicy(mig) { const bord = !mig || mig.lage !== 'skarm'; return { skapa:true, tap:bord, flytt:bord, saknas:bord, grund:bord }; }` — **ingen gate i `grundSteg` här** (den skulle försvinna för alla tills MODE-2 finns).
- `lekAntal(namn)` utanför skivan (9181-området): summa `n` i vald leks `kort` (main + sb), `Infinity` utan lek eller okänt namn.
- Verifiera: `dev/kolla.sh` oförändrat (stubbspelaren utan lage = bord); konsol `minSpelare().lage` → `'skarm'`; `await Moln.sattLage(spelLage.id,'bord')` → realtime → `'bord'`.

### MODE-4 — kantstyrd tap-synk (S) — direkt efter MODE-1 — BYGGD (MES-69)
- `lagg()`: `if (tapSynk && (k.kamTap == null || tap !== k.kamTap)) { k.kamTap = tap; if (pol.tap && (k.tapped?1:0) !== tap) { k.tapped = tap; andrat = true; } }` — kameran skriver bara när DESS EGEN dom ändras; i Screen leads uppdateras `kamTap` men aldrig `tapped`.
- **Ändrat mot första utkastet, mätt i avstamning.cjs:** (1) den första domen för ett kort tas ALLTID — utan dom finns ingen rättning att skydda, och i Table leads är bordet sanningen (ett kort lagt till för hand som spelas tappat blir tappat direkt); (2) `binder()` rör INTE `kamTap`: ett nytt spår på samma plats med en annan dom ÄR vridningen (detektorn föder ett nytt spår när kortet vrids — S1/S5/S14/N3 föll med "tyst ombindning"), och ett ledarbyte med samma dom skriver ändå inget; (3) `kamTap` sparas lokalt i `slimKort` (inte delat) så att en rättning överlever en omladdning.
- Skapande (`g.kort`) och `namngePend` sätter `kamTap` = domen när grundläget finns, annars undefined.
- avstamning.cjs E1–E5: digital untap överlever tre hjärtslag; följer nästa vridning; skarm skriver aldrig; ombindning med samma dom skriver inte; första domen tas (före grundläget, och för handlagt kort).
- Verifiera: Table leads med grund: fysiskt tappad → tappad; klicka → otappad och FÖRBLIR över hjärtslag; vrid fysiskt fram och tillbaka → följer igen.

### MODE-3 — policymatrisen i `avstamBord` (M) — efter M9 — BYGGD (MES-70)
- `const pol = spelPolicy(mig)` överst (från MODE-1); `grundSteg` returnerar null när `!pol.grund`; kort och pending-poster föds otappade i Screen leads (`tapSynk && pol.tap`). `tapSynk` gatas INTE av `pol.tap` — `kamTap` ska följa domen i båda lägena (MODE-4), det är `lagg` som vägrar skriva `tapped`.
- `k.kam` skrivs i `lagg` och vid skapande (`kamLage`): spåret stilla/klart, inte helbild, mitten flyttad > `AUTO_FLYTT·w` (eller saknas); `nar` bumpas bara då; i båda lägena (minne). P7.
- `fysisk` sätts i `flyttaTill` (graveyard/exile) när `k.spar != null` — i BÅDA lägena, inte bara Screen leads: spökproblemet (spåret föds om → nytt kort) finns i båda, och D1 säger att rättningen står sig till nästa fysiska händelse (spåret dör → flaggan släpps). `ledigt()` och steg 4 räknar `fysisk`-kort som på bordet; ombindningen är tyst i kortets zon. `gravTillbaka` och ångra släpper flaggan. P3.
- Saknad-slingan: `fysisk` → tyst; besvärjelseregeln (`SPELL_MS` 20 s, `arBesvarjelse` med typeof-vakt på `typLinje`, inne i skivan) → `zon = grav`, `spellAuto`, mattan ritar toasten med ångra (`spellSagda`); `!pol.saknas` (Screen leads) → tyst; `tackt(k)` (värden eller högens gi 0 syns) → tyst. P1/P2/P5/P6.
- **Klippt:** `sammaPlatsBorta`/`aterFragor` ("Forest is back on the table?") — antalspriorn (D5-8) täcker det tvetydiga fallet (leken har bara N: "Another Forest? Add anyway / Not a card"), och ett kort med fler kopior i leken ÄR ett nytt kort. `dubbletter.cjs --lage` inte byggd (stubbspelaren utan läge = bord räcker).
- avstamning.cjs P1–P7 (108 OK).
- Verifiera: konsolrecept i båda lägena; `dev/kolla.sh`; `dubbletter.cjs --fall 07` oförändrad.

### MODE-2 — lägeschip + panel + flikmärke (M) — efter MODE-3 (annars ljuger chippet)
- `renderMode` 6509–6598: lokal gren (6516) orörd; A–F → `chip = '<Mode> · <status>'` med statusen i samma ordning som i dag (camera off / camera lost (röd, 10 s-omritning kvar, frusen-raden när panelen är stängd) / waiting for phone / reload the phone / learning light / `N cards` (bord) | `camera on` (skarm)); `data-mode="lage"` öppnar `#modeRad`-panelen: två kort ("Table leads — play on the table; the screen mirrors it: cards, taps, places. You fix mistakes on screen." / "Screen leads — the camera only notices new cards; you move, tap and count on screen."), statusrad, knapparna Turn on camera / Show QR / Reconnect / Camera settings / Turn off camera, **inline-varning** när Table leads väljs utan sparat grund ("Tap reading is off until you save the untapped angle" + knappen från `grund-spara`), "Rotate camera view" (MODE-5), "Keep your graveyard outside the frame" tills uteslutningsrutan finns. Behåll en primär "Turn on camera" bredvid chippet medan `prefs.autoLage == null`.
- **Strängdiffa** `slot.innerHTML` och `rad.innerHTML` (renderMode körs var 150 ms); `matFlikar()` bara när chippet ändrats.
- `bytLage(v)`: `mig.lage = v`; lokalt `prefs.lage`; sidoeffekter: skarm → `slappLyft`, `delete borta`, `clearTimeout(lyftT)`; bord → **explicit "Adopt the table layout"**-steg: en `avstamBord(senasteSpar)` bara om `kamAnsluten && prefs.autoLage === true && senasteSpar.length` (annars spelas ett dött bord upp); optimistisk rollback om `sattLage` misslyckas.
- `renderTabs`: `.lagemark` (ikon, title) i spel; `tomLage/renderTom` får läget i signaturen och lägesanpassad text; kamerapanelens grund-tjat (`visaKamGrund` 16510) dämpas i skarm.
- Verifiera: två webbläsare: byt läge → motståndarens flik byter inom 1 s; chip-texter per kamerastatus; tomma bordet följer läget; `avstamning.cjs` opåverkat.

### MODE-5 — positionsspegling i Table leads (M, två commits) — sist — BYGGD (MES-72)
- Commit 1 (skivan): `k.kam` skrivs i `lagg`/vid skapande (MODE-3, prov P7: stilla/klar, inte 'ny', inte helbild, flytt > `AUTO_FLYTT·w` → ny `nar`).
- Commit 2 (mattan): `camera_setups.ruta.vand` (0/90/180/270) + `spegel` i alla skrivare (`tagEmotGrundSvar`, `normaliseraKamRad`, `sparaKamOrientering`), läses av `lasKamOri` i båda läsarna, nollas när spelet lämnas; "Rotate ↻ / Mirror ⇋" i lägespanelen (Table leads, kamera ansluten); `kamTillMatta(kam, skala)` vrider/speglar kring bildens mitt, skalan = `CW / median(kam.w)` (bordet i kortenheter), bildens proportioner ur `kamUpplosning` (annars 4:3), regionen läggs till höger om graveyard-kolumnen; `speglaKamPos(p, v)` i `renderGrid` (efter `matPlacera`) för egna kamerabundna kort som inte är nedtonade/bifogade, bara när `kam.nar` eller orienteringen bytt (`kamRitad/kamOri`, runtime), klämmer bara mot graveyard-rutan — brädet växer; `.card` glider redan (left/top .22 s). Platshållare i Table leads vid spårets mitt. Drag av per bindning: pointerdown på ett kamerabundet kort i Table leads visar chippet "The table places this card · switch to Screen leads to move it". Screen leads rör aldrig lägen.
- **Kvar (D-strömmen, K5):** måttet "position updates on a still board per minute" och medianfelet mot facits rutor i `kor.cjs` — kräver viloläget med hysteres på telefonen.

### MODE-6 — ingår i M9
Bara gatingen: arket/bannern visas när `pol.saknas`; `kanLyftas`-undantagen (MODE-3).

Öppna frågor C avgör jag: varje nytt spel startar i skarm (`prefs.lage` bara lokalt); Screen leads-kort föds otappat (pending-posterna bär redan `tappad: null` när grund saknas); byte bord→skarm släpper nedtonade kort (keep all) — sägs i panelen; lokalt bord visar inte lägeschippet.

## 7. Ström D: Kamerans träffsäkerhet, mätt i golden

Regel: ingen commit utan golden-delta i meddelandet; `api/identify.js`
prompter rörs ALDRIG. Telefonsidan (12024–15076) kan gå i egen worktree när
som helst.

### K1 — harnessmått (M) — BYGGD (MES-73: borta-fördröjning, tap-vridningar, dubbletter i `betygVideo`; 07 omsparad)
`kor.html betygVideo` 758–816: `videoTapp/videoTappAv/videoTappFordrojning` (facit `{t, tappar|otappar: namn}`, första `bordLogg`-posten där säkert spår bär väntad `tappad`), `videoBortaFordrojning` (facit `tar_bort` → första rapport utan säkert spår), `videoDubbletter` (porta `sammaNamn` dubbletter.cjs 321–370, INTE `sparStatistik`); `kor.cjs` tabell/`--detalj`/dom (192–197); SNABBGUIDE. Acceptansraden i historik: 0 fel namn; 07 ≥ 5/5 namn, fördröjning ≤ 1,3 s; tap-flip ≤ 0,35 s; borta ≤ 1,0 s telefonsidan; dubbletter 0; lokalt ≥ 28/49 med `--ref`; `--ai` 41/41.

### K3 — tap-domen på två stilla rutor (S) — BYGGD (MES-74)
`matcha`: den exponentiella rösten (`tappRost`, tre rutor från otappat, fyra tillbaka) ersatt av löpräknaren `tappRun`: två stilla rutor i följd med en annan dom än kortets vrider det, från vilket läge som helst; en glitchruta nollar bara räknaren. `fodSpar`, `domOm`, `svarAI`, `tillampaHelbild` primar `tappRun: 0`. Bänken T12 (glitchruta rör inget; vriden → tappad efter 3 rutor; tillbaka efter 3). Ingen hysteres behövdes. Golden: se historik.md.

### K5 — viloläge för positionsrapporter (S) — BYGGD (MES-75; bänken V1/V2; kor.cjs-måttet återstår)
`t.vilaX/vilaY` sätts när spåret varit stilla ≥2 rutor och flyttat > `3·stillaPx` (hysteres, som `autoSparLage` 15281); `tillstandsSignatur` 13900 får `round(vilaX)/round(vilaY)` — inte en rå 2 %-kvantisering (rapport varje ruta på en gräns). Bänk P1 (≤3 rapporter över en glidning) / P2 (jitter över gränsen → 0 extra). Kontrollera Supabase-kvoten (events/s). Golden LIKA BRA.

### K6 — antalsprior på telefonen (S) — BYGGD (MES-76; helbilden döms i `tillampaHelbild` för nya spår, inte i `kamAiPoster`)
`kamLekAntal` (top-level `let` före 14714, rensas vid poolfel 14692) fylls i `byggKamPool` ur `lek.kort[].n` (main + sb); `lekPrior(cands, saker, antal, upptagna)` ren, i skivan bredvid `sammaPlats` 15176 (inga nya stubbar); `kamIdentifiera` 14799 degraderar till osäker `varfor:'fler än leken'`; **också** i `kamAiPoster` 14903 och helbildens poster (Claude-vägen läcker annars). `kor.html` sätter kartan per fall ur facit (`satLekAntal`), `lek.txt` får `2 Plains`/`2 Swamp` och 251 slutar strippa antal. avstamning L1–L3. Golden LIKA BRA (03/06 inom antal).

### K9-lite — uteslutningsruta för graveyard (S/M) — BYGGD (MES-77): inga spår föds i rutan (enklare än `zon:'grav'`-spår — inget att filtrera nedströms); bänken GY1/GY2
Rita rektangel på `#pbLager` 16403 (delas med bildens renderade rekt, inte `kamBildW/H`); `kamGravRad` bredvid `kamGrundRad` 5392; `grav` i ALLA `sparaKalibrering`-anrop (16533, 16556, ny `sparaGravZon`), läses 16592/16551, nollas 16938; telefon `tillampaKalRad` 14961 → `Kamera.satGrav`; `satKalibrering` 13446 bär `grav` från raden; `fodSpar` ger spår med mitt i rutan `zon:'grav'` (ingen identifiering, inte i `riktiga`, inte i helbildens signatur, ej i `friYta` så högen blir del av mattmodellen); rapportens spår får valfri `zon`; filtret 15621 `&& t.zon !== 'grav'`; `kor.html` 665/790, `dubbletter.cjs sammaNamn` 337; `forberedFall` 413 anropar `satGrav(facit.grav||null)`; bänk G2/G4. Lägespanelens text byts när rutan finns.

### MES-43 — dubbletter på telefonen (M, pågående)
Mäts på 07 med `dubbletter.cjs`; mattan ritar `sammaPlats`-grupper som ett kort tills dess.

### K2 — golden-video 09 (tap/untap/flytt) och 10 (graveyard-hög i bild) (S, kräver Jesper)
Inspelning enligt SNABBGUIDE 275–347; facit med nya händelsetyper + `grav`-ruta; baslinjer; 10:s baslinje FÖRE K9-lite har högens toppkort som spår (skrivs i historik; K9-lite ska ge BÄTTRE på 10, inte LIKA BRA).

### K-DFC + K-80 — sökrymden (S+S)
DFC: `byggLekPool` 9945/9952 lägger `faces[1].img` som egen post `face:1`; frontnamn till OCR-listan och Claude-listan (klientsidan, `identify.js` mappar exakta strängar redan); `kamIdentifiera` → `{namn, face}`; `avstamBord` behandlar face-byte som händelse som skriver `flipped` (följer `pol.tap`). En DFC i `lek.txt` + ett golden-foto. K-80: `kamAiNamnen` 14857 ordnar namnen efter lokala cands för beskärningen, sedan lekordning, före `slice(0,80)`; trunkering visas i `#kamOv`. `--ai` före/efter (ingen promptändring, men eval-värdig).

### K7/K8 — lärda referenser per lek (M+M) — sist
`Ref`-block utanför Kamera (IDB `'ref:' + poolCode`, 146×204 jpeg, tak 4/namn), `Pool.laggTill` (inkrementell descs/ORB), `byggLekPool` läser refs efter lekens kort; lär av Claude-`hog` enkelsvar (14868) och mänsklig bekräftelse via `namn`-meddelandet 15016 (INTE skärmdumpsvägen 11586); `w.MESA_LAR` sätts på iframe-fönstret; `kor.cjs --lar-ref/--ref`, golden-profilens poolpost raderas efter `--lar` (`IDB.poolDel`, kor.html 293); leave-one-out-mått; "Forget learned photos" i lekdialogen (S).

### Klippt ur D
K4 (spekulativ tidig läsning): sex exakta `identifieringar`-asserts i bänken (205, 232, 242, 371, 718, 761), skickar beskärning + OCR för varje 'ny' spår, omätt utan 09 — återbesök med 09 och ett formstabilt stillhetskriterium. K10/K11 (korrelation + auto-graveyard): fas 2 efter MODE-3, med `mig.lage`-gate, aldrig `prefs`. Transport-RTT (`sant`-stämpel) — senare.

## 8. Engelska sveper (M) — sist av allt
Auto-fältet (`autoRemsaModell` i skivan), `#kamOv`, telefonvyn, toasts,
hjälpöverlägget, `renderTom`; i SAMMA commit uppdateras strängasserts i
`dev/kamerabank.cjs` (402, 408, 417) och `dev/avstamning.cjs` (t.ex. 597
"Kortet du la ut hamnade i granskningen"); alla tre harnessar körs.

## 9. Ordning och vad Jesper kan testa när

```
Fas 0 (main) → MODE-1 → MODE-4                       (skivan; testbart med avstamning.cjs)
A: M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9 → M10
B: D5-1 → D5-4 → D5-5 → D5-2 → D5-6   (parallellt med A)  → efter M10: D5-3 → D5-8 → D8-7
D: K1 → K3 → K5 → K6 → K9-lite → MES-43 → K2 (Jesper) → K-DFC → K-80 → K7/K8   (parallellt)
C forts: efter M9: MODE-3 → MODE-2 → MODE-5 (två commits)
Sist: engelska sveper
```

| Efter | Jesper kan |
|---|---|
| M1 | se sitt bord som matta, zooma, reload behåller platser |
| M2 | spela ett helt Screen leads-parti på mattan med kameran (adds landar på `slotBeside`) |
| MODE-1/4 | rätta en tap utan att kameran skriver över |
| D5-4 | spela mot vald lek på telefonen (första gången ~1 min pool) |
| D5-2 | ha flera lekar med namn/färger |
| MODE-3 | se besvärjelser lämna mattan, inga spöken från graveyard-högen (med K9-lite) |
| MODE-2 | byta läge i chippet, motståndare ser det |
| MODE-5 | Table leads med speglade positioner |

Gate "ett riktigt parti": fas 0 + M2 + D5-4 + MODE-1/4.

Parallella sessioner: egna worktrees per block (`git worktree add --detach
<scratchpad>/wt-x HEAD`, symlänkad node_modules, egen port/TMPDIR för golden),
tillfällig post i `.claude/launch.json` som återställs; merge i ordningen
ovan; `dev/kolla.sh` + `git diff` mot främmande funktioner före varje commit;
en `kor.cjs` i taget.

## 10. Verifiering

- **Varje commit**: `dev/kolla.sh` (avstamning, dubbletter --fall 07, kamerabank → 0 FEL), syntaxkontroll av script-blocken, `git status` rent efter push.
- **Mattan**: browserpanelen (`mesa-attrapp`, `STUB_LEK=kort`) — konsolrecepten i M0–M10; `node dev/golden/kor.cjs` (lokalt) efter M1 och M9 (bootar `kor.html`, oförändrade siffror); två webbläsare för delade positioner/läsvy.
- **Kameran utan telefon**: `visaVy('app'); spelLage = {id:'x', kod:'', mig: state.players[0].id}; minSpelare().lage = 'skarm'|'bord'; kamGrund = 20; tagEmotBeskarning({spar, b64}); avstamBord([{id, tillstand:'klar', namn, tappad, saker:true, sen:0, x,y,w,h}], false, 'tom')` — vänta i loop på tillstånd, inte fasta sleeps (browserpanelen är dold flik).
- **Lekar**: Supabase Table Editor efter migreringen; `dev/lista.cjs`; två konton i ett spel för `lek_info`; riktig telefon för D5-4 och D8-7.
- **Kameran**: `node dev/golden/kor.cjs` (och `--ai` vid K6/K-80/K8, ~20 cent) före/efter varje K-commit, rad i `historik.md`; `node dev/kamerabank.cjs` nya fall T9/P1/P2/G2/G4; `dubbletter.cjs --fall 07 --lage`.
- **Läge 1 live**: Jespers bord med telefonen efter MODE-5: orientering (Rotate camera view), jitter-talet i `kor.cjs`, bordslogg sparad ur passet (`dubbletter.cjs --logg`).

## 11. Linear (team Mesa, projekt Meta Magic)

Fyra föräldrar + en förberedelse:
- **MES-xx Förberedelse** (fas 0).
- **MES-xx Mattan (Direction C v3)** — sub-issues M0–M10; MES-14 stängs "superseded"; MES-19/20 länkas (nedtoningsbeteende, verifieras i M9/MODE-3).
- **MES-xx Lekar** — D5-1, D5-4, D5-5, D5-2 (stänger MES-12, MES-13), D5-6 (stänger MES-15, MES-16, MES-11 del), D5-3, D5-8, D8-7 (stänger MES-33); MES-37 stängs "done" (autocomplete finns); MES-36 stängs "out of scope (Mode 3)".
- **MES-xx Lägen** — MODE-1, MODE-4, MODE-3 (MES-19/20/43 relaterade), MODE-2, MODE-5.
- **MES-xx Kamerans träffsäkerhet** — K1, K3, K5, K6, K9-lite, MES-43 (flyttas hit), K2, K-DFC, K-80, K7, K8; klippta K4/K10/K11 som "Later"-issues.
- Engelska sveper som egen issue under Mattan.

Arbetssätt: issue → In Progress + assignee me när bygget börjar; issue-nyckel
i commit-meddelandet; commit-länk som attachment efter push; Done när
verifierad.

## 12. Klippt (för tydlighetens skull)
Läge 3, digital hand/bibliotek, liv/turordning (SpellTable äger dem),
kameraläsning av tärningar/counters, kamerabifogande i v1 (senare: riktad
Claude-fråga när ett säkert spår står skymt ≥2 s), Mode 2-skanningsremsa
(ger inga fler pixlar), kortare `stillaMs`/`bortaMs` utan formkriterium,
EMA-utjämning av positioner, lasso och "Couldn't place" (senare, små),
"Create token" (senare; `parts` sparas dock i M6), commander-zon,
stulna kort med ägare, nedvända kort (senare, små), Moxfield-URL-import,
klientmigrering "på första öppning" (SQL gör det), höjning av 80-namnstaket
(promptnära — bara på Jespers begäran).

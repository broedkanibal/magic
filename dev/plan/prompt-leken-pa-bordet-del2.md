# Prompt: mattan när leken läggs ned, del 2 (förslag 1–3)

Klistra in allt under strecket i en ny session (Opus, effort high).

---

Bygg tre förbättringar av mattan i Mirror my table, för stunden när leken läggs ned och första kortet spelas. Jesper har sagt ja till förslagen 1–3 nedan. Gör dem i en egen worktree, en commit per förslag.

## Utgångsläge

En tidigare session (2026-10-09) fixade hoppen när leken läggs ned. Det gäller commiten "Mattan när leken läggs ned: kamerabilden direkt, inget okänt kort på högen, panelen först vid pekning", som har en lång beskrivning av orsakerna.

- **Ligger den på `origin/main`** (`git fetch && git log origin/main --oneline -20`): skapa worktreen från main.
- **Annars** ligger den bara på grenen `lek-pa-bordet` (worktree `.claude/worktrees/lek-pa-bordet`). Skapa då din worktree från den grenen, inte från main. Rör inte den worktreen; den är den andra sessionens.

Läs commitens meddelande först. Den införde:

- `lekVantas()`
- `ofrVantaLas` i `avstamBord`
- gissningen i `matKamRam`
- `body.utanins` och `insPekat` i `renderInspektor`
- `matRutaStampel.ins`
- fem nya prov sist i utgångslägets avsnitt i `dev/mattan.cjs`

Bygg vidare på dem; gör inte om dem.

Förloppsprovet som återskapade Jespers skärmbilder ligger i den sessionens scratchpad och kan vara borta. Det gick så här:

1. Ett nytt spel startas.
2. `kamAnsluten = true` och `kamUpplosning = { w: 1920, h: 1080 }`.
3. `avstamBord` får ett oläst spår.
4. `tagEmotLek` får `farg: null` och sedan en färg.
5. Ett klart kort kommer.
6. `matHover` sätts och `renderInspektor()` anropas.
7. En skärmbild tas efter varje steg (`Page.captureScreenshot`) med `dev/mattest/chrome.cjs` (`server`, `chrome`, `vantaApp`).

Gör ett likadant prov i din scratchpad, och lägg det som ska vakta framöver i `dev/mattan.cjs`.

## Förslag 1: leken har sleeves direkt, inte Magic-baksidan i ~3 s

**I dag:** högen visas med Magic-baksidan tills telefonen mätt sleevens färg (8 prov à 350 ms efter att leken legat still). Sedan glider sleeven på (`lekHogHtml`, `.lekslv.pa`, `fargNar` i `tagEmotLek`).

**Bygg:** spara den mätta färgen på leken (decks-raden, se `Moln` runt `from('decks')` i `index.html`). Använd den från första stund i nästa parti med samma lek, som `mig.slvFarg` gör i dag inom ett parti.

- **Mäter telefonen en annan färg** (avvikelse över samma gräns som `lekFargSig`/`nedFargLik`, välj och motivera): byt till den nya och spela animeringen en gång.
- **Samma färg:** ingen animering.
- **Första partiet med en lek:** som i dag.
- **Magic-baksidan (ingen sleeve, `farg.magic`):** sparas också, så att den inte "byts".

**Datamodellen:** kolla schemat för `decks` i `supabase/migrations/`. Behövs en kolumn: skriv migrationen men **kör den inte**. Säg till Jesper att den behöver köras, och låt koden tåla att kolumnen saknas (som andra fält gör).

**Vem som får läsa:** bara min egen lek. Motståndare ser färgen genom bordsraden som i dag (`slvFarg`).

## Förslag 2: texten står på samma plats före och efter leken

**I dag:** "Put your library on the table" står mitt i kamerans ram. När leken landar flyttar `tomPlats` texten till den största fria delen bredvid högen, så "Play your first card when you're ready" hoppar uppåt.

Designens beslut var "samma stil och plats i båda; bytet är kvittensen" (`renderTom`, MES-334 steg 3, sida 5 tavla 1–2).

**Bygg:** en fast plats för båda texterna i kamerans ram, till exempel övre tredjedelen, centrerad. Den ska aldrig ligga ovanpå leken. Hamnar leken där texten står, flyttas texten bara då och bara så lite som behövs.

`tomPlats` och regeln "aldrig ovanpå en hög" finns redan; ändra valet av plats, inte reglerna för hinder. Andra texter i `renderTom` (`TYST`) påverkas inte.

## Förslag 3: zoomtalet hoppar fast inget rör sig

**I dag:** mattans list visar till exempel "99% fit" med den gissade skalan och "55% fit" när leken mätt skalan, fast ramen står still på skärmen. Talet är brädets zoom och säger inget för spelaren här.

**Bygg:** visa bara "fit" (utan procent) så länge mattan står i utgångsläget på mitt speglade bord (`v.steg`, inte `v.manuell`). Med egen zoom: procenten som i dag. Andra bord: som i dag. Hitta var talet ritas (`renderChrome`).

## Inte med

Förslag 4 är inte med: att panelen kommer vid pekningen och kortet under pekaren flyttar sig. Jesper ska prova det på riktigt först.

## Regler (CLAUDE.md gäller i sin helhet)

**Gränser**
- Ändra inte systemprompten i `api/identify.js`.
- Ingen regel får kräva Claude.
- Rör inte telefonens kod (inget i Kamera/lekvakten). Då behövs ingen golden-körning. Behöver du röra den: stanna och fråga.

**Prov före commit**
- `sh dev/kolla.sh`. Om main fortfarande faller i `avstamning` och `dubbletter` på `addEventListener('pagehide', …)` från 2f77a01: kör de stegen med `node -e "globalThis.addEventListener=()=>{}; require('./dev/avstamning.cjs')"` och säg det. Laga inte det här.
- `node dev/mattest/kor.cjs --fil index.html --jamfor`. Jämför också mot main:s fil (`git show origin/main:index.html > /tmp/...`) och rapportera bara rader som är sämre än main.

**Worktree**
- Symlänka `.env.local` och `dev/material` i den nya worktreen.

**Commit och push**
- Commit-meddelanden på svenska med vad som var fel, vad som mättes och vad som ändrades.
- Ingen Linear-issue, om inte migrationen kräver Jesper. Då en issue i Triage enligt CLAUDE.md, via `dev/linear-agent/klient.cjs`.
- Pusha inte utan att fråga. Efter en push: städa worktree och gren enligt CLAUDE.md.

**Slutsvaret**
- Kort, på svenska, för icke-expert.
- Vad som byggts, med skärmbilder före och efter.
- Vad Jesper behöver göra: migrationen, och provet på telefon.

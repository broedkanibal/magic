# Handover: MES-331 pass 4 (landhögarna) — 2026-10-03

## Så här öppnar du
Läs det här dokumentet, verifiera snabbt mot repot att läget stämmer, och
fortsätt sedan direkt med nästa steg nedan. Ditt första meddelande ska vara
öppningsrepliken längst ned, ordagrant eller mycket nära den. Ingen hälsning,
ingen presentation, ingen sammanfattning tillbaka till användaren, ingen fråga
om vad hen vill göra — det står redan här. Nämn inte det här dokumentet och
inte att du läst det. För användaren är det här samma samtal som fortsätter.

## Var vi står
MES-331 pass 4 är klart och på main (`45f3018`, nio commits ovanpå `7864126`).
Issuen (Linear-id `e8771d01-e572-4fe2-9a20-17ed3e3503b5`) står i **Redo att
testas** med fyra telefonprov i kommentaren; nästa session håller inte issuen
och ska inte köra `paborjaIssue` igen om inte Jesper skickar tillbaka den.
Golden-baslinjen är sparad på slutkoden: lokalt 88/98 på 01–16 (88/108 med det
nya fallet 18), 0 fel namn, 0 falska (+1 token), högar 7/11; med Claude 64/65
på 03–06 och 14–16, 0, 0, högar 8/9. Allt mätt på port 8263 med pass 3:s
profil, poolen 114. Arbetsträdet `.claude/worktrees/mes-331-pass4` är rent och
kan tas bort; sessionens scratchpad (rutloggar f0–f4, bänkskript, bilder)
försvinner vid omstart.

**Main har flyttat sig efter passet:** golden 17 (kompisens inspelning) är
inne, `45f3018..d867a9a`. Det betyder att `dev/golden/lek.txt` har sex nya
namn (poolen 168, inte 114), att `senaste.json` är en ny lokal baslinje
med 18 fall (91/119, 0 fel namn, 1 falsk, +2 token; 14 är 8/10 med den
poolen — jämför inte mot 9), och att `senaste-ai.json` är omsparad på
poolen 168 (`d867a9a..981f485`): 90/109 på alla fall utom 13, **1 fel namn
och 1 falsk** — 17 ger 4/11, 14 8/10, och 18 med Claude har ett fel namn:
ett "Swamp" som Claude läste säkert ur hela bordet mellan högens två Swamp
och som golden parade mot fel kort (inte poolen; räkna med 0 eller 1 fel
i 18 med Claude). Rebasa/synka mot main före nästa golden, annars mäts mot
fel baslinje.

## Osäkert läge
Anthropic-kontot svarade "credit balance is too low" under golden 17:s
första --ai-körning (~09:30); en senare --ai-körning gick igenom. Läs
raden "N namn via Claude" i varje --ai-körning — 0 betyder att kontot
eller nyckeln föll, inte att Claude inte behövdes.

## Beslut
- **Facits ruta är kortets synliga del; golden parar i två omgångar** (rutan
  först, sedan det som blev över mot hela kortet ur `horn`, och spåret måste
  täcka den synliga rutan till hälften) — max(ruta, hel) i en omgång tog
  grannens hela kort i täta högar (parprov MES-246 728 → 727), och utan
  täckningskravet räknades en dubblettlåda på högens översta kort som det
  undre kortet. Plats och tap mäts fortfarande mot rutan: ett undre kort som
  appen ritar helt blir aldrig "rätt plats" (14 plats 10 → 9 permanent).
- **Dold = mindre än hälften av namnradens första fjärdedel syns** (4–17,75 mm;
  Plains slutar vid 0,19 av raden, Swamp 0,21, mätt på Scryfalls bilder).
  Inget facitkort bytte läge — det var regeln i rita-geometri som släpade.
- **A1 på (T.remsaAlla 1 + remsfiltret 0,45 → 0,5 i detektor.js):** 15:s
  ensamma Plains hade en remsa som filtret kastade (0,46 tjock/lång);
  15 9 → 10/10, parprov oförändrat. Remsan ensam gav inget — orsaken
  hittades med `--detlogg`.
- **A2 (remsaUtom) byggd men AV:** parningen var rätt; det var detektorns
  lösa remslåda på det övre kortet som rymde grannens titel. Övermålning gav
  Pacifism 0,101 / titeldelen 0,197 — 0,003 under gränsen 0,20. Grinden
  (05 6/6 lokalt) klarades inte, så förvalet är 0.
- **B (födelsevakten) byggd men AV (T.fodVakt 0 = bara logg):** tog bort alla
  spöken i 07/11 (25 → 9, 14 → 4 spår) men kostade 07 ett spelat kort och 13
  ett namn i alla fyra varianter. Kamerabankens LT1l slår på den själv.
- **Golden 18 = 13b i 1080×608** (9,7 MB, samma takt som 13). Lokalt 0/10,
  hittade 2: spårningen tappar korten på det ljusa träbordet. Samma klipp i
  1920 (`--video`, gitignorerad i `dev/material/golden-18-upplosning/`) ger
  10 hittade, 4/10 namn, 6/10 spelade — här avgör upplösningen, till
  skillnad från 13.
- **Steg som inte klarar sin grind stängs av men behålls med måtten** (inte
  rivs): Jesper vill kunna slå på dem med `--tro` och se vad som mättes.

## Förkastat
- **Backdatering av stillaFran/formN som pris-sänkare för vakten** — 07:s
  Plains läses under handen oavsett variant (med, utan, bara stillaFran,
  bara regel a); orsaken är inte backdateringen.
- **Max(ruta, hel) i golden-parningen** — se ovan.
- **Textläsaren på titeldelen som andra vittne (A3)** — läser 13/69 vid 960
  med 0 fel, men skräp på 14/15:s Plains i gröna fickor; tröskat (Otsu)
  sämre (3/69).
- **Fickkant-referenser i remsleken (A3)** — sänkte säkra rätt 36 → 29 vid
  960, höjde inte 14:s titeldel (`--ficka` i detektor_remsor.py finns kvar
  som prov).
- **Att kapa remsan i stället för att måla över** — Aphelia 0,011; formen
  räknas för remsmodellen.

## Öppna frågor
- **Claudes klunga-svar:** i en av två --ai-körningar av 05 svarade Claude
  "Scourge, Pacifism" på Pacifisms omaskade beskärning och appen tog det
  första — ett säkert fel namn. svarAI:s vittneskrav gäller bara maskade
  beskärningar. Inte rört i passet; egen mätning behövs (hur ofta, och om
  ett klunga-svar ska kräva vittne).
- **Spökkorten:** vakten finns men är av. Nästa sak att mäta är en
  omläsning av ett osäkert spår när det får en hel låda igen — det är vad
  dö-och-födas-om-vägen gjorde av en slump. Hål att rätta först står vid
  `T.fodVakt` i index.html (ordningsberoende regel c, kort tvärs över ett
  känt utan egen remsa, klämd ruta nollar kandidaterna).
- **18 på ljust träbord:** spår utan region i tiotals sekunder (mask-logiken
  på ljust bord) — omätt vad som håller dem vid liv; 1920-kodningen visar
  att det inte är namnen.
- 14 A:s bakersta Plains (titeldelen 0,169) och 05 B:s Pacifism utan Claude
  står kvar som rester; 13 är upplösning och rörs inte.
- 14 skakar 7–10/10 mellan körningar på samma kod (också enligt
  golden-17-sessionen) — en ±1 i 14 är inte koden.
- **Poolen 168 (fall 17:s sex namn, bl.a. Island och Forest) tar ett land i
  14:** golden-17-sessionen mätte 14 lokalt 8/10 i två räknade körningar
  med 168 mot 9/10 med 114 (land per typ 4 → 3), 0 fel namn. Ser ut som
  de nya baslanden konkurrerar om ett Plains, inte som brus. Omätt vilket
  kort och varför; när 17 är inne gäller 168 som baslinje.

## Nästa steg
1. Vänta på Jespers telefonprov (kommentaren på MES-331: tät landhög med
   och utan fickor, equipment under varelse, kort instucket åt sidan med
   dold namnrad, kort som läggs/lyfts/läggs tillbaka). Fel namn säkert är
   det enda som är ett fel; saknat namn är en rest.
2. Om han skickar tillbaka issuen: börja med klunga-fällan i `svarAI`
   (index.html ~26118) eller omläsningen för vakten — båda mäts på
   golden 05 (--ai, högst två körningar) respektive 07/11/13 med
   `--rutlogg` och `dev/golden/kor.cjs --tro "fodVakt:1"`.
3. Ta bort arbetsträdet `mes-331-pass4` när ingen behöver det
   (`git worktree remove`).

## Kodpekare
- `index.html`: `medRemsa` (A1-grinden, T.remsaAlla), `fyndUrLador`
  (remsaUtom-blocket efter `a.tackt`), `lasRemsa` (målar remsaUtom),
  `matcha` (fodKand/kandForra överst, vakt-closuren vid födseln,
  `T.fodVakt` 0/1/2), `T` (remsaAlla, remsaUtom, fodVakt/fodPx/fodFyll med
  mätningarna i kommentarerna).
- `dev/detektor/modell/detektor.js` `para`: remsfiltret `o.tjockMax`
  (förval 0,5).
- `dev/golden/kor.html` `bedom`: två omgångar + `andelInne`, `traffar[].omgang`,
  remsa.utom; `dev/detektor/matt.py` samma regel; `dev/golden/kor.cjs`:
  `--rutlogg` skriver `fodslar` (vaktens mått per födsel).
- `dev/golden/rita-geometri.cjs`: `NAMN_DEL`, `namnStart`; `dev/golden/
  SNABBGUIDE.md` raderna för dold och x y w h.
- `dev/golden/fall/18-tra-sidoljus-40cm-10kort-tokens-0,5x/`, facit byggt ur
  `dev/golden/inspelningar/2026-10-02-fall-13b-0,5x-sidoljus/lagen.json`.
- `dev/golden/historik.md`: två rader 2026-10-03 (del 0; del A och B) —
  alla tal, varianter och kontroller står där.
- `dev/remsa/detektor_remsor.py`: `--ficka`/`med_fickkant` (A3-provet).
- `dev/material/hogar-2026-10-02/dold-regeln-2026-10-02.png`: bilden Jesper
  fick för dold-regeln.
- Minnet `mes-331-pass4-landhogar.md` (bl.a. worktree-fällorna: `dev/embed/
  modeller` och `cache` finns bara i worktree `wf_bccb9343-ae9-3`,
  `MESA_MOBILECLIP`, tesseract.js måste `npm install`:as i `dev/remsa`).

## Arbetssätt
Svenska. Jesper vill ha varje steg mätt före och efter, detekterings- och
namnmått isär, och rakt besked om vad som är mätt och vad som är bedömt.
Ett steg som inte klarar sin grind backas (här: stängs av med måtten kvar)
och skälet skrivs i commit och Linear. Push till main utan att fråga när
grinden är klarad; Linear via `dev/linear-agent/klient.cjs` med text via
fil. En golden i taget på datorn — andra sessioner kör också; `golden-
kedja.sh`-mönstret (vänta på `pgrep -f mesa-golden-profil` och
`golden/kor.cjs`, `VANTA`/`VANTA_PA`) hindrade krockar. Harnessen i en
worktree vägrar heredoc-python, `$VAR` som argument till node/python och
sammansatta git-kommandon — skriv skript i scratchpaden och kör dem med
absoluta sökvägar.

## Öppningsreplik
> Pass 4 är på main och MES-331 väntar på dina telefonprov. När du provat: säg vilka av de fyra som höll, och om något täckt kort fick fel namn säkert — så tar jag klunga-fällan i svarAI eller omläsningen för spökvakten härnäst, beroende på vad proven visar.

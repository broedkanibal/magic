# Prompt: MES-331 pass 4 — facit och golden 13b, namnen som fattas, och inga spökkort alls

Egen session. Modell och effort: **Fable 5.1, xhigh**. Kör i huvudarbetsträdet
`/Users/jesperfunk/Code/magic` eller i en egen worktree med `.env.local`, `dev/material`,
`dev/embed/cache` och `dev/embed/modeller` symlänkade (de två sista finns i
`.claude/worktrees/wf_bccb9343-ae9-3`). Kolla `git status` först: en annan session kan ha
ocommittade spår i `index.html`.

Klistra in allt nedanför strecket.

---

Du tar över MES-331 (Linear-id `e8771d01-e572-4fe2-9a20-17ed3e3503b5`, "Landhögarna: varje kort med
läsbart namn blir ett kort i appen, som i bänken"). Issuen står i In Progress sedan sessionen som körde
pass 0–3; den sessionen är avslutad och du håller issuen nu. Kör inte `paborjaIssue` igen. Jag har inga
användare: slå ihop till main och pusha utan att fråga när grinden är klarad, men mät före och efter, och
säg rakt ut vad som är mätt och vad som är bedömt. Håll detekteringsmått (spår, Högar-ordning) och
namnmått isär i varje tabell.

## Läget (main df50e63, 2026-10-02 kväll)

Golden lokalt utan Claude: **87/98 rätt namn, 0 fel namn, 0 falska (+1 token), Högar 7/11**; med Claude
64/65, 0, 0, Högar 8/9. Målet: varje kort vars namn går att läsa blir ett kort med rätt namn, i rätt
ordning i högen, utan att något fel namn blir säkert — och **inga spökkort**.

Vad de 11 saknade namnen och de 4 högarna som inte är rätt består av (ur `dev/golden/senaste.json`):

| Var | Saknas | Orsak (mätt) | Det här passet? |
|---|---|---|---|
| **13** | 8 namn, Högar 13 A och 13 B | inspelningen: 0,5×-vidvinkel, lampan rakt över, mjuk källa — 3/10 också i 4K (historik "golden 13 i 4K") | **nej** — Jesper spelar in ett nytt fall genom Mesas kameravy; rör inte 13 |
| **05 B** Pacifism (ovanpå Scourge of the Undercity, liggande) | 1 namn, Högar 05 B "ordning rätt, namn saknas" | bildmodellen säger Pacifism, men **remsan och textläsaren läser Scourge** — remsan som parats med Pacifism-spåret är det undre kortets (spåret: `varfor konflikt`, remsa Scourge 0,111, titel Scourge 0,07). Spärren gjorde rätt (osäkert, inte fel), men parningen gav fel remsa | **ja** |
| **14 A** bakersta Plains (grön ficka, 25 % synligt, titeln skarp) | 1 namn, Högar 14 A "ordning rätt, namn saknas" | titeldelen av remsan 0,169 mot gränsen 0,20; titeln är ~1/5 av remsan, resten fickans kant; textläsaren läser hela bredden och ger skräp. Samma kort i 15 är säkert | **ja** |
| **15** Plains uppe till vänster (ensamt, blänkt konstverk, titeln läsbar) | 1 namn | modell Plains osäkert, ORB 0, ocr skräp; **remsan läses inte alls** — den läses bara för maskade eller omlott-spår (`medRemsa`) | **ja** |

Utanför 13 är det alltså **tre namn** och **två högar**, och båda högarna fälls av ett namn, inte av
ordningen. Spökkorten: pass 3 fick dem att dö efter 0,6 s; de ska inte födas.

## Del 0 — facit och mätverktyget först (Jespers beslut 2026-10-02)

`node dev/golden/rita-kontroll.cjs` säger i dag 10 avvikelser i 06, 13 och 14. De kommer ur två
faciträttelser i går kväll som strider mot två tidigare beslut av Jesper:

**0a. Facits ruta är den synliga delen** (SNABBGUIDE *Rita facit*: `x y w h` = lådan runt kortets
synliga del). Commit `3712de8` satte i stället hela kortet för 06 mittersta Swamp, 13 undre Plains i
hög B och 14 Resistance Reunited, för att golden skulle räkna Resistance Reunited rätt (appen ger hela
kortets låda, facits låda är bara remsan → för lite överlapp → missat + falskt + fel namn). **Backa
`3712de8`s tre lådor** och rätta i stället **golden**: `kor.html` ska para spår med facitkort mot
**hela kortet ur `horn`** när facit har hörn (plats och tap mäts som förut mot den synliga lådan).
Kontroll (minnet `kontroller-som-ljuger`): visa att 14 Resistance Reunited räknas rätt med parningen
mot hörnen och fel utan den, och att inget annat fall byter dom.

**0b. Dold = namnet går inte att läsa** (Jesper 2026-10-02: syns namnet är kortet ett kort). I dag
räknar `rita-geometri.cjs` dold som `namnrad < 0,5` (`DOLD_UNDER`, ett äldre beslut), vilket gör 06:s
mittersta Swamp dold fast "Swamp" står läsbart först på raden (42 % av raden syns). Ändra regeln till
**namnets början**: dold när den del av namnraden där namnet står (vänstra delen i läsriktningen, mät
en rimlig andel ur facitkorten) inte syns. Lista först vilka kort i alla facit som byter dold-läge och
visa bilder av dem för Jesper i rapporten — ändra inget annat facit på egen hand. `rita-kontroll.cjs`
ska vara grön efteråt.

**0c. Golden 13b.** Jespers nya inspelning är ritad: `dev/golden/inspelningar/2026-10-02-fall-13b-0,5x-sidoljus/lagen.json`
(23 lägen, rita-kontroll grön, källan `fall-13b` i `rita-kallor.json`, videon
`dev/material/inspelningar/2026-10-02-fall-13b-0,5x-sidoljus/telefon.mov`, 4K, 0,5×, träbord). Bygg
golden-fallet `17-…` (eller nästa lediga nummer) som videofall på samma sätt som 13: `koda.swift`
(välj upplösning och bithastighet så att fallet ryms — mät 1080p mot 1920p med `--video` om storleken
tvingar ner det), `bild.jpg` = sista läget, `facit.json` med slutlägets kort ur ritningen och
`video.handelser` ur lägena/manuset. Kör det lokalt och med `--ai`, och lägg det i baslinjen.

Efter del 0: ny baslinje (`--spara`) på alla fall, så att del A mäts mot rätt facit.

## Del A — namnen (tre steg, golden emellan)

**A1. Remsan för varje osäkert spår** (15:s Plains). `medRemsa`/`identifiera`: läs remsan också för ett
osäkert spår som varken är maskat eller omlott. Kostar ~100 ms bildmodell per osäkert spår (textläsaren
bara om bildmodellen är osäker, som i dag). Grind: 15 10/10, 0 nya säkra fel på alla 16 + bänken
`dev/remsa/nollprov.py` (remsans gräns 0,15 gav 0 säkra fel över golden + MES-246 — den rörs inte).

**A2. Remsan hör till rätt kort** (05 B). I `Detektor.para` (`dev/detektor/modell/detektor.js`) och
`fyndUrLador`: när två kortlådor överlappar och en remsa ligger inne i båda, ska den paras med den låda
vars **kant** den sitter vid (remsan sitter vid kortets topp/sida — `sidaAv`, pass 2), inte med den
större lådan. Mät först med `dev/detektor/tran/parprov.py --para` (appens inställningar) och visa i
05-bilden vilken remsa som gick vart (`panel.py` i `dev/material/hogar-2026-10-02/`). Grind: 05 6/6,
Högar 05 B rätt, parprov MES-246 inte sämre (728/738, 97/107), 0 nya fel.

**A3. Titeln i en ficka med två vittnen** (14 A). (1) Textläsaren på **bara titelns del** av remsan
(vänstra delen, rätt höjd, förstorad, tröskad) — mät först i bänken `dev/remsa/` (`ocr.cjs`,
`detektor_remsor.py`, `resultat/detektorremsor-v55-embed.json`) över golden-remsorna + MES-246:s 666:
läser den rätt, och ger den någonsin FEL namn med hög poäng? (2) Säkert när titeldelens bildmodell har
namnet överst (lägre gräns, att mäta) **och** textläsaren på titeldelen läser samma namn. Inget vittne
ensamt under sin gräns gör ett namn säkert; `svarAI`, `T.remsaTroskel` och vakten (`9881e5e`) rörs inte.
(3) Räcker inte det: referenser med fickkant i remsleken (`Embed.byggRemsLek`). Varför gränsen inte
bara sänks: under 0,20 ger blänkta remsor i MES-246 fel namn säkert (nollfel 0,122). Grind: 14 10/10,
Högar 14 A rätt, 0 säkra fel över golden + MES-246 i bänken, 0 nya fel i golden.

Mål för del A: **lokalt 90/98** (allt utom 13), **Högar 9/11** (allt utom 13), 0 fel namn, 0 falska.

## Del B — inga spökkort

Spökena i 07 och 11 (`dev/material/hogar-2026-10-02/spoken.md`) föds ur en **detektorlåda på ett kort i
rörelse**: handen lägger ett kort, detektorn ger två lådor på samma kort (eller en låda över kanten på ett
känt kort), och den extra lådan blir ett nytt spår i samma ruta. Pass 3 fick dem att dö i bortaMs; nu
ska de inte födas. Att ett kort ploppar upp och försvinner är fel på bordet.

Mät först (rutloggen, `--rutlogg --detlogg --konsol`, 07 och 11): i vilka rutor föds spökena, hur många
rutor i rad fanns lådan, rörde den sig, och överlappade den ett känt korts låda eller en hand. Sedan en
**födelsevakt** i `fodSpar`/`matcha`: ett nytt spår föds bara när lådan (a) setts i minst två rutor i rad
inom några px, (b) har en egen remsa **eller** står på tom matta (maskIUtom, pass 3), och (c) inte
delar mer än `SAMMA_SPAR`-täckning med ett spår som fick region i samma ruta utan att ha skilda remsor.
Gränserna i `T` (prov med `--tro`). Kostnad: en ruta (~150 ms) på tiden till namn för riktiga kort —
rapportera `fördröjning` i videofallen före → efter. Grind: 07 och 11 utan spöken i någon ruta
(rutloggen, inte bara slutbilden), spelade/borttagna/ordning i 07, 09–13 inte sämre, fördröjning
högst +0,2 s, dubbletter inte fler, `dev/kolla.sh` OK (kamerabankens LT1i mäter spökregeln — lägg till ett
prov som mäter födelsevakten).

## Ordning

0a → 0b → 0c → A1 → A2 → A3 → B. Ett commit per steg (vad var fel, vad mättes, vad ändrades), golden efter varje,
baslinje `--spara` + rad i `dev/golden/historik.md` sist. Fristående granskning (Agent) av diffen före
merge, och en gång till efter rättelserna (pass 0–3: granskningen hittade något varje gång).

## Läs först

- `dev/plan/prompt-landhogar-2026-10-02.md` (planen och de hårda kraven).
- MES-331-raderna i `dev/golden/historik.md` och kommentarerna på MES-331 (pass 0–3, 13 i 4K).
- Commit-meddelandena på main från `1bdc06c` till `4f03fcc` (pass 0–3: vad som gjordes och backades).
- `dev/remsa/RESULTAT.md`, minnena `mes-328-remsans-namn`, `mes-329-tranad-detektor-i-appen`,
  `golden-egen-port`, `kontroller-som-ljuger`, `worktree-saknar-env-local`, `flera-sessioner-samma-arbetstrad`.
- CLAUDE.md: systemprompten i `api/identify.js` rörs inte. Linear via `dev/linear-agent/klient.cjs`,
  text via fil.

## Samordning

Sessionen "Fotokortlek – detektering och UX" väntar på att få röra `Namn.lasBand`, `Embed.byggRemsLek`,
`Detektor.para` och `Kamera.lasRemsa` tills MES-331 är på main. Säg till den via `ListAgents` +
`SendMessage` när du börjar och när du slagit ihop.

## Golden

Egen port över 8260 (`lsof -iTCP:<port> -sTCP:LISTEN` först), en golden åt gången på datorn
(`pgrep -f kor.cjs` och `pgrep -f mesa-golden-profil` tomma, annars vänta), egen `TMPDIR`, kasta första
körningen i ny profil, poolen ska vara 114. `--ai` på 03–06, 14–16 högst två gånger (13 + `--ai` dör —
kör inte). Stegtid på ledig dator (andra program gav 270–390 ms en gång — rapportera lastsnittet).

## Avslut

När del A och B är inne: flytta MES-331 till **Redo att testas** med `agent.markeraRedoAttTesta(issueId,
vad)` och skriv exakt vad Jesper ska prova på telefonen: (1) en tät landhög där bara namnraderna syns, i
plastfickor och utan; (2) en equipment instucken under en varelse med namnraden synlig; (3) ett kort
instucket åt sidan med namnraden helt dold (ska INTE få grannens namn); (4) kort som läggs, lyfts och
läggs tillbaka — inget kort ska ploppa upp och försvinna. Säg till om något täckt kort får fel namn
säkert. Klarar ett steg inte grinden: backa det, skriv varför i kommentaren, och gå vidare.

## Rapport till Jesper (i chatten, högst 20 rader)

Per steg: golden före → efter (Högar, rätt/fel namn, falska, fördröjning — lokalt och med Claude),
bänken (rätt/fel per regel och gräns), vad som backades, vad som är kvar, och vad han ska prova på
telefonen.

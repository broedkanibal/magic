# Orkestreringen av spegelläget — plan för en autonom session

Skriven 2026-09-20 som överlämning från MES-242-sessionen. Läses av den
session som Jesper startar på **ultracode** för att köra etapperna utan
avstämning efter varje issue. Linear är källan för status; etappkartan är
`dev/plan/etapper.md`. Arbetet hör till projektet *Spegelläget i
realtid*, och etapperna är milstolpar i det — inte issues (de var det till
2026-09-20). Uppdatera den här filen när kön ändras.

## Vad Jesper har godkänt (2026-09-20)

| Fråga | Svar |
|---|---|
| Slå ihop och pusha till main utan att fråga | **ja**, när bänken är grön och golden inte är sämre: 0 fel namn, inte fler falska, inte färre rätt namn |
| Golden med Claude (`--ai`) | **ja**, högst tre körningar per issue |
| Flytta issues till Done själv | **ja**, när kriterierna ovan är uppfyllda och arbetet är på main |
| Agentdefinitioner i `.claude/agents/` | **ja** (`mesa-matning`, `mesa-bygg`, `mesa-bygg-tung`) |

Main driftsätts automatiskt till produktion vid push. Det är därför
kriterierna är hårda.

## Där sessionen alltid stannar

- systemprompten i `api/identify.js` — rörs aldrig, föreslå och fråga
- allt som kräver telefonen, en inspelning eller Jespers uppställning
- designval (tokens A/B/C i MES-142, spelytan i MES-245)
- en ändring som ger ett enda fel namn i golden, `--utan-leken` eller `--ljus alla`
- en krock med en av Jespers egna sessioner i samma del av `index.html`
  (`ListAgents` visar dem; skicka ett meddelande innan du rör deras område)

Stannar arbetet på en issue för att Jesper behövs:
`agent.markeraBehoverJesper(issueId, varfor)` — etiketten **Needs Jesper**
plus en kommentar. Gå vidare med nästa issue i kön. När Jesper gjort sitt:
`agent.slappBehoverJesper(issueId)`.

## Kön

Ordningen är beroendeordning, inte etappnummer. Numren i etappkartan
säger vad som stänger vilket löfte; det här säger vad som kan köras nu.

| Steg | Issue | Agent | Kodområde | Kan gå parallellt med |
|---|---|---|---|---|
| 1 | **MES-249** golden-baslinjen (09: 3/4 mot 4/4) | mesa-matning | ingen kod | 2, 3 |
| 2 | **MES-248** kort som lämnar bilden | mesa-bygg | datorns avstämning (`avstamBord`, mattan) | 1, 3, 5 |
| 3 | **MES-244:s gren** in i main (`worktree-bank-1080p`, e88532c) | orkestreraren själv | kamerans bildläge, takt | 1, 2 — **samordna med MES-244-sessionen**, som kör golden på den nu |
| 4 | **MES-257** golden-fall 13 ur inspelningen | mesa-matning | bara `dev/golden` | 2, 5, 6 — **efter 1** (baslinjen ska stämma innan ett fall läggs till) |
| 5 | **MES-259** marginalspärren 0,08 + ORB-bekräftelsen (del 3, namnraden, är en utredning för sig) | mesa-bygg | läsningen (`kamIdentifiera`) | 2, 4 |
| 6 | **MES-250** kort som ligger omlott (41 av 57 blir spår) | mesa-bygg-tung | detektorn (`detektera`, `matcha`, skärlinjerna) | 4 — **efter 3**, och inte samtidigt som 5 i samma funktioner |
| 7 | **MES-221** läsningen i en worker | mesa-bygg-tung | läsningen + ny worker-fil | efter 5 |
| 8 | **MES-258** plastfickans baksida i poolen | mesa-bygg | poolen (`Ref`, BAKSIDA_NAMN) | när som helst, liten |
| 8b | **Jespers foton 2026-09-20** → golden-fall 13–15 (ljust trä, varmt ljus, plastfickor, omlott, landhög) | mesa-matning | bara `dev/golden` | **efter 1**. Underlaget med facit per bild: `dev/golden/inspelningar/foton-2026-09-20/UNDERLAG.md`; bilderna i `dev/material/foton/2026-09-20-ljust-tra-varmt-ljus-plastfickor/` (gitignorerad). Ger material till MES-218, 219, 220, 233 och 250 |
| 9 | Buggklustret: MES-106, 234, 235, 217, 218, 219, 220 | mesa-bygg | ett i taget | fyller luckor |
| senare | MES-247, MES-251 (tokens, attach) | mesa-bygg-tung | avstämningen + kameran | efter 4 (fall 13 ger måtten) och Jespers designval i MES-142 |

**Golden serialiseras.** Agenterna får bygga samtidigt, men bara en
golden-körning åt gången på datorn (`pgrep -f kor.cjs`,
`pgrep -f mesa-golden-profil`). Räkna med att golden, inte antalet
agenter, sätter takten: en full körning tar 8–12 minuter.

## Flera sessioner samtidigt: vem rör main

Överenskommet 2026-09-20 mellan orkestreraren och MES-242-sessionen, efter att
två commits landade i main mitt under en pågående golden-körning. Den gången
var det bara dokumentation och körningen överlevde — hade det varit en kodfil
hade agentens före/efter-jämförelse blivit ogiltig utan att något varnat.

Gäller varje session som jobbar bredvid en orkestrerande session:

| Vad du vill pusha | Hur |
|---|---|
| Dokumentation, material, planer | säg till orkestreraren först, pusha sedan |
| Kod som golden täcker (`index.html`, `api/`, `dev/embed/`, `dev/golden/*.cjs`) | pusha inte till main — lämna en gren och säg till, så kör orkestreraren bänk och golden och slår ihop |
| Vad som helst, medan ett merge-fönster är öppet | vänta; orkestreraren säger till när det öppnas och när det stängs |

Skälet är inte revir. En agents mätning jämför före mot efter på samma kod.
Byts koden under körningen jämförs två olika saker — och siffran ser exakt
lika riktig ut som förut.

## Kontroller som ljuger

Sex gånger på ett dygn (2026-09-20) gav en kontroll ett svar som såg riktigt
ut och aldrig hade jämförts med verkligheten. Alla sex är mätta, inte
gissade:

| Kontroll | Vad den svarade | Vad som gällde |
|---|---|---|
| Poolen i golden | tal som såg rimliga ut | halv pool — 17/57 två gånger (MES-260) |
| `--utan-leken` | "0 fel namn" | mot en lista ingen skrivit ner (MES-266) |
| En golden-körning | ingenting alls, i 4,5 timmar | klar, men hängd i nedstängningen (MES-270) |
| `git log --grep=MES-NNN` | "koden är på main" | ett omnämnande i en annan commits text |
| "ingen session i listan" | "ingen jobbar på den" | sju mätkedjor pågick i subagenter |
| Latensrapporten | medianen klarar 0,3 s | 544 ms — tre rader låg på −13, −73 och −91 s (MES-275) |

**Formen är densamma varje gång.** I fem av sex fall upptäcktes det av en
slump, för att någon som råkade veta sanningen tittade på utskriften.

En sjunde, natten till 2026-09-21: en session höll på att köra fyra
minuters bänk på en gren som **redan låg i main**. Två sessioner hade fått
samma uppdrag av Jesper, den ena hann före, och den andra visste inte om
det. Det som räddade det var `git diff --stat origin/main` — tom.

**Före varje sammanslagning:** `git diff --stat origin/main` och
`git branch -r --contains <gren>`. Är diffen tom är arbetet redan ute, och
mätningen hade tagit maskinen från någon annan i onödan.

Regeln som följer: **varje kontroll ska ha ett sätt att säga "jag vet
inte"** i stället för att tyst svara fel. En pool som inte är hel ska vägra
köra, inte varna. En körning som hänger ska ha skrivit sina tal innan den
började stänga ner. En lista som avgör en släppgräns ska ligga i repot.

Och: **ett tal som ingen någonsin kontrollräknat för hand är inte mätt** —
det är bara utskrivet.

## Så slås en gren ihop (orkestreraren, sekventiellt)

1. `git fetch`; utgå från en ren worktree på `origin/main`.
2. `git merge --no-ff <gren>`. Konflikt i `dev/golden/historik.md` är
   normal (båda lägger en rad överst): behåll båda, nyast överst.
3. `sh dev/kolla.sh` — allt grönt, bänken `150 OK` eller fler.
4. Golden på egen port (`lsof` först, `pgrep` tomma), egen `TMPDIR`; första
   körningen i ny profil kastas. Jämför mot en körning av `origin/main`
   **på samma dator, port och profil** — inte bara mot `senaste.json`
   (se MES-249: baslinjen kan vara fel).
5. Håller kriterierna: `git push origin HEAD:main`, verifiera med
   `/driftkoll`-kommandona (sidan ute ska vara identisk med filen).
6. Rad i `historik.md` om den saknas, kommentar på issuen (för en
   icke-expert: rubriker, tabeller, vad före hur), issuen till Done.
7. Håller de inte: pusha grenen som gren (`git push origin <gren>`), skriv
   varför på issuen, lämna den i In Progress. Slå aldrig ihop "nästan".

`git reset --hard` och `git stash` är spärrade eller farliga här (delad
stash, andra sessioner). Backa en sammanslagning med `git revert -m 1`.

## Hålla orkestrerarens kontext liten

Agenterna kör i egna kontexter; bara deras slutrapport (≤ 15–20 rader)
landar hos orkestreraren. Det som växer är orkestrerarens egna
verktygsanrop. Därför:

- läs aldrig loggar eller golden-utskrifter i orkestreraren — låt en agent
  göra det och rapportera siffrorna
- resultat skrivs i Linear och `historik.md`, inte i chatten
- en agent per issue; starta om en ny agent hellre än att fortsätta en
  som svällt
- rapportera till Jesper bara när något är klart, när något stoppats, och
  när en issue fått **Needs Jesper**

## Läget när det här skrevs (2026-09-20, ~10:00)

- **main:** 16b08f4 + den här commiten. Produktionen identisk med filen.
- **Grenar på GitHub, inte i main:** `worktree-bank-1080p` (MES-244 B/C/E,
  bänken grön sedan e88532c, golden pågår i den sessionen).
- **Sessioner igång (ListAgents):** MES-244 (bank-1080p), MES-238-analysen,
  MES-246 del 1 (klar, kan vara kvar).
- **Needs Jesper:** MES-243 (värmeprovet), MES-242 (telefonpasset, ~10 min
  nästa gång han spelar), MES-190 (pass A/B/C), MES-241 (uppställning +
  lampa), MES-142 (designval tokens). Jesper har sagt att han inte har tid
  för proven nu — det blockerar inget i kön ovan.
- **Etapp 1** står öppen tills proven är gjorda; det är i sin ordning.
- **Golden-baslinjen** (`senaste.json`) säger 35/57 men koden mäter 34/57
  på den här datorn (fall 09: 3/4). Tills MES-249 är löst: jämför alltid
  före/efter på samma dator, inte mot filen.

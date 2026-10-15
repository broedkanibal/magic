# Handover: snabbare läsning — textläsaren och remsan först — 2026-10-15

## Så här öppnar du
Läs det här, kolla snabbt mot repot att läget stämmer (`git log --oneline -8`,
`git worktree list`), och fortsätt med nästa steg nedan. Ditt första
meddelande är öppningsrepliken längst ned. Ingen hälsning, ingen
sammanfattning tillbaka, nämn inte dokumentet — för Jesper är det samma
samtal som fortsätter.

## Var vi står
Inget är byggt. Jesper har sagt ja till två ändringar i kamerans läsning
som ska göra den snabbare utan att ge säkra fel namn. Båda ändrar
`index.html`, alltså kamerakod: golden krävs. Föregående samtal förklarade
igenkänningskedjan för Jesper i flera varv (han är inte expert). Han vill ha
förklaringar korta, med tabeller, vad före hur.

## Osäkert läge
- **Andra sessioner jobbar i huvudträdet just nu**: ocommittade ändringar i
  `.claude/launch.json`, `dev/rapport/granska.cjs`, `bankutgava.cjs`,
  `kopior.cjs` och fyra lekfoto-filer i `dev/plan/`. Inte dina — rör dem inte.
  Bygg i en egen worktree.
- **Golden-platån** (`dev/plan/golden-platan-2026-10-15.md`) är en annan
  sessions arbete i samma kedja: steg 1 (medRemsa utan remslåda) och steg 2
  (minnet på geo-skurna remsor) ligger på main; grenen
  `golden-platan-orb-lagesbevis` är medvetet inte ihopslagen. Läs filen
  innan du rör `medRemsa`/`kamLasRemsa` — ändring 2 rör samma ställe.
- **Baslinjen 98/119 · 0 fel** (27434d1) gjordes på 5fa72c1. `index.html`
  har ändrats sedan (+86/−35, fem commits) → kör en ny baslinje på din
  startcommit. Grindregeln i CLAUDE.md: `git diff --stat <baslinjens commit>
  HEAD -- index.html` FÖRE, inte efter.

## Beslut
- **Ändring 1: vänta inte på textläsaren när hela kortet redan är
  `modell+orb`.** — Läsningen av hela kortet startar textläsaren parallellt
  (`namnP` i `kamIdentifiera`) men väntar alltid på den, också när ORB redan
  bekräftat modellens etta. Telefonprovet 20 sept: läsningen 669 ms median,
  varav 315 ms väntan på titelraden. ORB-beviset (`M.bar`) är det starkaste
  vi har. Risken: textläsaren är ett vittne som kan säga emot ("ALDRIG när
  båda är säkra på var sitt kort" i domen efter `let varfor`). Mät hur ofta
  textläsaren säkert motsade ett `modell+orb` innan regeln byggs — blir det
  > 0 i golden ska det ner i rapporten och avgöras av Jesper.
- **Ändring 2: remsan först för täckta kort.** — I dag läses hela kortet
  alltid först, remsan bara efteråt (`medRemsa`, efter svaret från
  `cb.identifiera`). På ett täckt kort (`arTackt`: maskad, omlott eller kort
  ovanpå) är hela kortet övermålat och blir nästan alltid osäkert; det är
  remsan som namnger högarna. Att läsa hela kortet först där är 0,4–1 s
  bortkastad. Lösa kort behåller ordningen. Remsans spärrar (`remsaStilla`,
  `remsaLandVittne`, lekens antal) gäller oförändrade, och faller remsan →
  hela kortet som i dag.
- **Båda bakom egna av/på-trösklar i `Kamera.trosklar`** (som `remsaStilla`,
  `remsaAlla`), så att golden kan stänga av var och en med `--tro "namn:0"`
  och en dålig del kan stängas av utan att den andra rivs.
- **Mätning:** baslinjen EN gång på startcommiten, bygget TVÅ gånger
  (skiljer de sig är det brus). 0 säkra fel namn är hårt; rätt namn ska inte
  bli färre, varje fall som blir sämre förklaras. Golden via `dev/golden/ko.sh`,
  egen port, `lsof` först, aldrig två `kor.cjs` parallellt
  (`dev/golden/SNABBGUIDE.md`). Golden mäter inte tiden per steg, men
  fördröjningen per fall (t.ex. fall 18) syns — rapportera den.
- **Ingen regel får kräva Claude** (CLAUDE.md). Ändringarna rör inte Claude;
  se till att ett osäkert kort inte skickas till Claude oftare än förut.

## Förkastat
- **Ta bort ORB för fart** — ORB är det som gör `modell+orb` säkert.
- **Läsa kortet innan handen släpper** — utrett i MES-246: handen täcker kortet.
- **Minnet (`remsa minne`) före lekens remsor** — sparar ingen tid (samma två
  vektorer) och minnet är appens egen tidigare gissning; ett fel sprids.
- **Att ORB skulle vara flaskhalsen** — remsan använder inte ORB alls;
  textläsaren och osäkra kort (Claude ~2,8 s) väger tyngre.

## Öppna frågor
- **Steg 0, telefonprovet med latensrapporten (`?debug`)** — inte ett krav
  för att bygga 1 och 2 (golden avgör säkerheten), men det enda som visar
  vinsten i tid på riktig telefon. Bäst: ett pass på nuvarande produktion
  före, ett efter. Jespers val; ~10 min per pass. `dev/latens/analys.cjs`.
- **Ändring 3, en bildmodell tränad bara på remsor (v5)** — beslutad som
  senare steg, egen session. Kräver en flagga i
  `dev/remsa/tran/mesa_remsa_tran.py` för bara remsrader, och rättelser i
  träning. Rättelserna ger i dag bara helkortsutsnitt (`till-fall.cjs
  --traning` skriver `remsor: 0`) — att skära remsan ur beskärningen är ett
  eget steg.

## Nästa steg
1. Läs `dev/plan/golden-platan-2026-10-15.md` och `ListAgents`: kör någon
   golden just nu, eller jobbar någon i `medRemsa`? Krock → fråga Jesper.
2. Egen worktree; symlänka `.env.local` och `dev/material`
   (minnet *worktree-saknar-env-local*).
3. Starta golden-baslinjen på startcommiten i bakgrunden medan du bygger.
4. Ändring 1 i `kamIdentifiera`: när bildvägen gett `modell+orb` (`M.bar`
   och accepterat), gå vidare utan `await namnP` — låt titelraden bli klar i
   bakgrunden. Ta reda på först vad `namnLast` används till senare
   (`maskVittne`, landvittnet) så att inget vittne försvinner tyst.
5. Ändring 2 i Kameras `identifiera` (anropen till `cb.identifiera` med
   `{ tackt }`, och `medRemsa`): för `arTackt` — remsan först; säker och
   genom spärrarna → klart; annars hela kortet som i dag.
6. Fristående granskning av diffen (en agent), sedan golden ×2.
7. 0 fel och inget färre rätt → slå ihop, pusha, städa worktreen. Rad i
   `dev/golden/historik.md` (högst tre meningar).

## Kodpekare
- `index.html` `kamIdentifiera` — hela kortets läsning: `namnP` (textläsaren
  i workern) startas före bildvägen och väntas in efter; `identifyMedModell`
  = ORB på modellens tre (`MODELL_NAMN`); ORB:s andra åsikt
  (`kamIdentifyAt`, Matcher + ORB) bara när modellen inte räckte och
  textläsaren inte höll med; domskälen sätts vid `let varfor`.
- `index.html` Kamera: `medRemsa` (när remsan läses: osäkert svar med
  `remsaAlla`, eller vittne åt `modell land` på täckt kort), `arTackt`,
  `remsaDomSkal`, `minnenFor`, och de två `cb.identifiera`-anropen.
- `index.html` `kamLasRemsa` — remsans fyra vägar i ordning: `remsa` →
  `remsa+titel` → `remsa minne` → `remsa+namn` (textläsaren, 0,4–1 s).
- `dev/latens/latens-2026-09-20-mes-263-4k15-3min-verifiering.json` — den
  enda telefonmätningen med tid per steg (före remsan och v2).
- `dev/rapport/granska.cjs` — granskningssidan för rättelserna (a386ff4);
  en annan session har byggt vidare på den (8346ac3). Inte en del av det här.

## Arbetssätt
Svenska. Jesper vill förstå: korta svar, tabeller, vad före hur, inget
fackspråk utan förklaring. Han ber om beslutet, inte en lista med
alternativ — rekommendera. Han säger själv till om merge och push; den här
uppgiften har hans ja till bygget och mätningen, och CLAUDE.md:s
grind/städregler gäller.

## Öppningsreplik
> Jag börjar med att kolla att ingen annan kör golden eller rör `medRemsa`, startar baslinjen på dagens main i en egen worktree, och bygger under tiden de två ändringarna — textläsaren först, sedan remsan först för täckta kort.

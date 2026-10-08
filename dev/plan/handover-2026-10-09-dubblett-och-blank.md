# Handover: dubbletten på spegelmattan + blänket som blir ett nedvänt kort — 2026-10-09

## Så här öppnar du
Läs det här, kolla snabbt mot repot (`git log --oneline -5`, rad-pekarna nedan) och börja sedan med
nästa steg. Första meddelandet ska vara öppningsrepliken längst ned. Ingen hälsning, ingen
sammanfattning tillbaka, nämn inte dokumentet. Bygg i en egen worktree (en annan session skriver ofta
i `index.html` i main-mappen), och städa enligt CLAUDE.md efter push.

## Var vi står
Utlöst av Jespers två skärmdumpar 2026-10-08 (träbord, blänk). Klicket på "Name this card", raden
"N cards to fill in" och "Not a card" i sökrutan är rättade och ute (`4a9e65c`). Kvar är två byggen
som Jesper sagt ja till:
1. **Dubbletten:** mattan visar ett gammalt kort *och* "Name this card" för samma fysiska kort.
   Jesper: "kör på det" — bind om bara när Claude svarat samma namn.
2. **Blänket:** ett bländat, uppvänt kort ritas som ett nedvänt kort, och kameran säger "not a card".
   Jesper vill ha **båda** förslagen, inte bara det första.

## Beslut
- **Dubbletten binds på namnet bara med Claudes stöd** — spåret är `okand`, inte `provas`, och
  `t.ai.svar` är exakt ett kort med samma namn och `sakerhet` `medel` (eller `hog`). Två omdömen som är
  överens. Obs: efter ett `medel`-svar är `t.namn` redan Claudes namn, så det lokala gissandet räknas
  inte som ett andra vittne. Det är Claudes svar som är kravet.
- **Övriga villkor från det prövade utkastet behålls:** kortet är det enda med namnet på bordet
  (`paBordet`), dess spår är dött eller saknas, det har `kam`, är inte `fysisk` eller `attachedTo`,
  platsen är inte täckt av ett synligt kort eller kortformat spår (då ligger det kvar under), inte
  `annatKort(c, t)`, och bara ett löst osäkert spår bär namnet. Bindningen görs med `flyttBuren`, så att
  en senare säker läsning med annat namn ångrar den (`motsager`/`aterstallFlytt`). Bara `pol.flytt`
  (Table leads).
- **Blänket: båda delarna.** Jesper frågade varför jag bara rekommenderade del 1. Svaret: del 2 ändrar
  telefonens dom. Det som i dag kastas som "not a card" kan bli en granskningspost, och träbitar, skuggor
  och blänk utan kort blev förr just det ("åtta kort att fylla i med trä i miniatyrerna"). Det var
  ordningen och mätningen jag ville skydda, inte ett skäl att låta bli. Bygg båda, och låt golden
  avgöra del 2 (falska kort får inte öka).
  - **Del 1:** ett ensamt nedvänt kort (`lekNed`) kräver att färgen stämmer med lekens sleeves
    (`lek.farg`, mätt med `lekFargProv`) när den färgen finns. Ett bländat kort är vitt, sleeves i
    Jespers lek är mörkgröna.
  - **Del 2:** en låda som detektorn hittat, med ett korts form, där beskärningen är utbränd (ljus, låg
    spridning) och `serUtSomKort` säger nej, blir okänd ("Name this card", MES-351:s läge 4 *Utbränt av
    blänk*) i stället för skräp.

## Förkastat
- **Binda på läsningens osäkra namn utan Claude** — prövat. Det löste bild 2 i avstämningsbänken, men i
  uppspelarens `parti-kedjan` flyttade det Night's Whisper (redan i graveyard) till ett annat, okänt kort.
  Det är ett synligt fel namn. Innan "enda kortet med namnet"-villkoret bytte också två Plains plats i en
  landhög.
- **Raden per post (bara poster med `ofrPos`)** — gav 39 zoom- och panoreringshopp i `parti-kedjan`.
  Redan avgjort i `4a9e65c`, rör inte.
- **Slå på `HELBILD_AUTO` igen** — inte prövat, inte valt. Helbilden dolde hålet på oroliga bord
  (Claude gjorde osäkra kort säkra), men Jesper stängde av den för kostnadens skull (`ec65f5c`).

## Mekanismen bakom dubbletten (mätt, inte gissat)
Kortets spår dör (hand, blänk), och ett nytt spår föds bredvid men blir stilla först efter `BORTA_NAD`.
Då har flyttens fönster (steg 3b) stängts. Kortet går inte till handen, eftersom `namnAnnanstans` ser
namnet på det nya spåret. Steg 5 binder bara på `t.gissning`, platsens ledtråd, inte på läsningens
namn. Fallen E (dubblett), F (stilla direkt: ok) och G (ledtråd: ok) återskapades i avstämningsbänken.

## Nästa steg
1. Worktree. Applicera `dev/plan/handover-2026-10-09-dubblett-prov.patch` på `dev/avstamning.cjs`. Den
   innehåller proven V1–V5 från utkastet: bild 2, annat namn, två väntande, ångrad flytt, täckt plats.
   Ge V1 och V4 ett `ai: { svar: [{ namn, sakerhet: 'medel', saker: false }] }` på det osäkra spåret,
   och lägg till ett prov där samma fall utan Claude **inte** binds.
2. Bygg regeln i steg 5 i `avstamBord`, direkt efter `ledigt(t.gissning, …)` (`index.html` ~33310).
   Funktionen `vantarPaNamn` stod före `for (const t of spar)` i steg 5, inte efter: `tacktAvKort` är en
   const längre ned (TDZ).
3. Mät dubbletten: `node dev/avstamning.cjs` (290 OK med de nya proven), mot `origin/main` ska V1 falla.
   Kör `node dev/mattest/kor.cjs --json` mot main och grenen och jämför måtten. Uppspelaren kör utan
   Claude, så den ska vara **oförändrad**. Allt annat än oförändrat är ett fel. Kör sedan `sh dev/kolla.sh`.
4. Blänket, del 1: `nedOk` i Kamera (~27871) plus en färgjämförelse mot `lek.farg`. Del 2:
   `kamIdentifiera` (~30680, raden `return { skrap: true }`) och `serUtSomKort` (~22069). Spåret till
   `svar`-vägen i `identifiera`, så att det blir `okand` utan namn.
5. Golden en gång, med alla fall, eftersom kamerakod ska behållas (CLAUDE.md, egen port, `lsof` före).
   Grind: 0 säkra fel namn, och falska kort får inte öka. Skriv en rad i `dev/golden/historik.md`.
   Rör inte systemprompten.
6. Slå ihop, pusha och städa. Blir något inte klart i sessionen: skapa en issue i Triage (den spänner då
   över fler sessioner).

## Kodpekare
- `index.html` `avstamBord`: steg 3b (`flyttBuren`, `passar`, `vantar` med `BORTA_NAD` ~31390), steg 5
  (~33310), LOS-regeln (`namnAnnanstans` ~33440, `olastNagot`).
- `index.html` `rapportera` i Kamera: `ai: t.ai` skickas till datorn. `t.ai.svar` sätts i `svarAI`.
- `index.html` Kamera `nedOk`/`lekNed` (~27871), `lekFargProv` (~27914), `arNedKort`.
- `design_handoff_namnge/README.md`: MES-351, läge 4 *Utbränt av blänk*.
- Minnet `mesa-mirror-mismatch-design` (räkneregeln och "Not on the table" är Jespers ovalda design,
  bygg inte den).

## Arbetssätt
Svenska, korta förklaringar för icke-expert: vad före hur, tabeller. Jesper vill ha en rekommendation och
ja/nej-frågor, inte öppna frågor. Säg rakt ut när en mätning visar att något blivit sämre. Han litar på
siffror, inte på "borde fungera".

## Öppningsreplik
> Då bygger jag dubbletten först: regeln i steg 5 som binder om kortet bara när Claude svarat samma namn, med proven från igår. Sedan blänket, båda delarna, och golden på det.

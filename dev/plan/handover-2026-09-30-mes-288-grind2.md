# Handover: MES-288, grind 2 — starta träningen på Kaggle — 2026-09-30

## Så här öppnar du
Läs det här dokumentet, verifiera snabbt mot repot att läget stämmer, och
fortsätt sedan direkt med nästa steg nedan. Ditt första meddelande ska vara
öppningsrepliken längst ned, ordagrant eller mycket nära den. Ingen hälsning,
ingen presentation, ingen sammanfattning tillbaka till användaren, ingen fråga
om vad hen vill göra — det står redan här. Nämn inte det här dokumentet och
inte att du läst det. För Jesper är det här samma samtal som fortsätter.

Läs också minnet `mes-288-tranad-detektor` och issuen MES-288 (beskrivningen
under *Läget 2026-09-28* plus kommentarerna) innan du gör något.

## Var vi står
MES-288 (In Progress) finjusterar en liten detektor (YOLOX, Apache) som hittar
korten; den ska köras i telefonens webbläsare. Grind 0 (farten på Macen), 1
(läraren OWLv2), 1b (syntetiska bord) och lärarmätningen är klara och ihopslagna
med main. Grind 2 är helt förberedd lokalt på grenen
`worktree-agent-a66528b45897c0b89` (commit `d9feda2`): dataset v1 (638 riktiga
rutor ur Jespers tre träningsfilmer + 3 000 syntetiska bord på 12 underlag),
träningskod för Kaggle, provskript. **Ingenting är uppladdat till Kaggle och
ingen träning har körts.** Det väntar på Jespers ja.

## Osäkert läge
- Grenen `worktree-agent-a66528b45897c0b89` är **inte ihopslagen** med main.
  Slå ihop den innan något körs, annars saknas `dev/detektor/tran/`.
- `dev/detektor/larare/traning.py` har `OMLOTT_G = 0.33` på main. Jesper ska
  godkänna **0,5** (se Beslut). Efter ändringen måste lärarens facit och dataset
  v1 byggas om (`traning.py facit`, sedan `tran/dataset.py`; ingen ny
  OWLv2-körning behövs, lådorna är sparade). Ladda inte upp v1 innan dess.
- Symlänken `dev/material` i varje worktree är gitignorerad och ska aldrig
  committas; skapa den på nytt i en ny worktree.
- Main är inte pushad på flera commits (MES-288-ihopslagningarna, Jespers
  ritningar). Pusha bara när Jesper säger till.

## Beslut
- **YOLOX-tiny och nano, 960×544, Megviis kod** — Apache-2.0; Ultralytics är
  AGPL och skulle kräva att appen öppnas. Farten mättes på Macen: nano 116 ms,
  tiny 214 ms. Telefonen är inte mätt (Jesper ska själv lägga upp
  `dev/detektor/fart/ut/mesa-detektor-fart` på Vercel; auto-läget nekar mig).
- **OWLv2 är lärare, syntetiska bord lär ut högarna** — läraren missar bara
  1 av 129 helt synliga kort (lärarmätningen, 12 rutor Jesper ritade), men
  ritar en låda över hela högen där bara namnraden sticker fram.
- **Prov och träning hålls isär per inspelningstillfälle** via
  `dev/detektor/delning.py` (`krav_traning` stoppar allt som inte är träning;
  okänd mapp = prov). Prov: golden, MES-246, passet 09-22, högbänken. Partiet
  2026-09-21 är `oanvandbart` (skärminspelning med Mesas spårramar).
- **Två klasser, `kort` och `baksida`** — appen avgör om en baksida är leken
  (lekens plats från uppstarten) eller en uppochnervänd token. Detektorn minns
  inget och sätter inga namn.
- **Lägstanivå för GO i grind 2: minst 55 av 66 egna kort på de sju ritade
  golden-fallen och högst 2 falska** — en otränad YOLOX-nano gav redan 55/66
  med 7 falska, så träningen ska främst ta bort falska och ta högarna. Målet är
  nära 100 % och 0 falska; grind 3 driver dit. Jesper har inte formellt sagt ja
  än, men bad om min rekommendation och fick den.
- **Regel G (två lärarlådor som överlappar mycket blir "okänt") med gräns 0,5,
  inte 0,33** — mätt mot Jespers ritning: 0,33 kastade 74 rätta lådor för att ta
  bort 2 fel; 0,5 tar bort båda felen och behåller 121 rätta. Jesper ska säga ja.
- **Jespers 12 ritade rutor (`dev/detektor/larare/matning/`) går in i
  träningen som exakt facit** — de är ur träningsfilmerna, alltså tillåtna, och
  ger ~100 högkort med perfekt facit. Väntar på Jespers ja.
- **Jesper godkänner före all GPU-tid.** Han ville uttryckligen se de
  syntetiska borden (`dev/detektor/synt/grind2.html` på grenen) innan träning.
  Titta särskilt på staplarna: varje remsa i en landkolumn ska ha egen låda.
- **Sonnet för mekaniska agentsteg, Opus för upplägg och analys.**

## Förkastat
- **Ultralytics YOLO-World som modell** — AGPL.
- **D-FINE** — för långsam på Macens GPU redan vid 640 px.
- **OWLv2 i appen** — 11,5 s per bild.
- **Partiet 2026-09-21 och äldre klipp som träning** — ramar i bild, 700 px.
- **MES-246 som bakgrund för syntetiska bord** — det är provet.
- **Träna bildmodellen på namnremsor nu** — egen förstudie MES-328 (Triage),
  väntar på GO här.
- **Fler stapelrutor att rita före träningen** — bara om provet visar svaga
  högkort.

## Öppna frågor
- **Juridiken**: Scryfalls bildregler (ingen förvrängning, beskär inte bort
  copyright) och Wizards Fan Content Policy (gratis, ingen registrering får
  krävas) — träffar appen mer än träningen. Jag bedömde risken låg för den
  interna förstudien; en jurist och ett mejl till Scryfall före produktion.
  Jesper har inte svarat på om jag ska skriva mejlet eller skapa en issue.
- Ska H1/H2-ytorna (tydliga baksidor, 94 av 97 rätt) bli facit `baksida` i
  stället för okänt? Inte beställt; pröva i grind 3 om baksidor blir svaga.
- Ritverktyget vet inte var händer är: kort under en hand räknas som helt
  synliga i lärarmätningen. Påverkar inte slutsatsen, men värt en egen redovisning.

## Nästa steg
1. Jesper har sett `grind2.html` och sagt att borden ser ok ut (2026-09-30).
   Kvar att få ja på: regel G = 0,5, de 12 rutorna som facit, lägstanivån.
2. Slå ihop `worktree-agent-a66528b45897c0b89` med main. Sätt `OMLOTT_G = 0.5`,
   bygg om facit och dataset v1 (lägg in de 12 rutornas facit), kör filistan
   genom `krav_traning_alla`.
3. Starta en `mesa-bygg`-agent (Opus) i egen worktree som kör steg 4–6 i
   `dev/detektor/tran/GRIND2.md`: `ladda_upp.py --namn v1 --kor` (privat
   dataset `jesperfunkrosling/mesa-mes288-detektor-v1`, kontrollera att det är
   privat), `kaggle kernels push -p dev/detektor/tran/kernel` (tiny + nano,
   ~3 h, ≤ 8 av veckans 30 GPU-timmar), status var 10:e minut, hämta ONNX,
   provet med nollprovets mått på de sju golden-fallen + MES-246:s lägen,
   golden 09–13 för sig (svarta mattan finns i träningen), tid per bild,
   GO/NO-GO i GRIND2.md och kommentar på MES-288 via `dev/linear-agent/klient.cjs`.
4. Efter provet: rapportera till Jesper i vardagsspråk, en tabell med dagens
   29/66, OWLv2 62/66 och den nya modellen, högkort för sig. Föreslå grind 3.

## Kodpekare
- `dev/detektor/tran/GRIND2.md` (grenen) — läget och exakt körordning.
- `dev/detektor/tran/kernel/`, `ladda_upp.py`, `dataset.py`, `prov.py`,
  `prov246.py`, `filista-v1.txt` — träningen; ignorerade ytor maskas i YOLOX:s
  förlust.
- `dev/detektor/larare/traning.py` — regel A–H, `OMLOTT_G` rad 361;
  `matt_larare.py --facit <fil>` mäter mot Jespers ritning (`facit-fore-G.json`
  och `facit-fore-H.json` ligger kvar i filmmapparna).
- `dev/detektor/delning.json` / `delning.py` — spärren. Alla nya mappar in här.
- `dev/detektor/NOLLPROV.md` — måttet (eget/sammanslaget/missat/falsk).
- `~/.mesa/kaggle-venv/bin/kaggle` — Python 3.12 via uv; nyckeln i
  `~/.kaggle/access_token`, läs aldrig ut den. Konto `jesperfunkrosling`,
  telefonnummer verifierat.
- Gammal venv för OWLv2/cv2 låg i förra sessionens scratchpad och finns inte
  längre; receptet står sist i NOLLPROV.md.

## Arbetssätt
Svenska, vardagsspråk, korta tabeller; Jesper är inte ML-expert och frågar tills
han förstår — förklara varför, inte bara vad. Han vill godkänna innan pengar
eller GPU-tid går åt och reagerar om något startas utan hans ja. Säg rakt ut vad
som är mätt och vad som är bedömt. Python-kraschar (onnxsim) öppnar
kraschfönster på hans skärm — upprepa aldrig en kraschande körning. Ritverktygets
server pausas av Ctrl+Z (`fg`). Inga issues utan att tröskeln i CLAUDE.md
uppfylls; Linear-skrivningar via agentklienten.

## Öppningsreplik
> Borden är godkända, så det som återstår före träningen är tre ja: regel G med gränsen hälften, dina 12 ritade rutor som facit, och lägstanivån 55 av 66 med högst 2 falska. Säg ja så slår jag ihop grenen, bygger om datasetet och startar träningen på Kaggle — cirka 3 timmar, sedan provet.

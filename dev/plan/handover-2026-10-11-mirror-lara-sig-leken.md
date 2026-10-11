# Handover: Mirror lär sig leken — läsmarkeringen, G3 och Jespers testparti — 2026-10-11

## Så här öppnar du
Läs det här dokumentet, kolla mot repot och Linear att läget stämmer, och fortsätt med
nästa steg. Första meddelandet är öppningsrepliken längst ned. Ingen hälsning, ingen
sammanfattning tillbaka, nämn inte dokumentet. Den här sessionen är **koordinatorn**
för planen `dev/plan/lekar-och-minnet.md`: Jesper orkar inte hålla ihop alla planer,
sessioner och issues själv, och har bett om hjälp att organisera, föreslå det mest
verkningsfulla, och ta det steg för steg — parallellt där det går, utan subagenter som
står och väntar.

## Var vi står
- **Jesper spelar just nu (eller strax) in ett Mirror-parti** på riktig telefon, i kvällsljus,
  mot produktionens kod (= main före MES-362). Det är *före-mätningen* och provar ~15 av de 31
  issues i Redo att testas. Han lägger tre filer i `dev/diagnos/`: latensrapporten (Save report),
  bordsloggen (Save table log) och en skärminspelning av datorn. Han ska fylla på Anthropic-
  krediten först (se Osäkert läge).
- **MES-362** (läsmarkeringen: ett nytt kort läggs ned direkt med kamerans foto, fotot klarnar
  medan det läses — variant B — och Claude-gränsen 15 → 5 s) är byggd av en mesa-bygg-agent:
  gren `worktree-agent-a3f13575bc8e2eb74`, commit `0ca8830`, ej ihopslagen.
- **MES-364 (G3, Claude som lärare)** är Done och på main (`0441d34`). **MES-363 (krymp världen)**
  är på main (`5e8dbfa`) av sin egen session.
- MES-362 står i In Progress, tagen av den här koordinatorsessionen.

## Osäkert läge
- **Slå inte ihop MES-362 och kör inte golden medan Jesper spelar.** En push till main
  driftsätter mitt i hans parti, och golden belastar datorn som kör Mesa. Fråga om han är klar.
- **Worktreen `.claude/worktrees/agent-a3f13575bc8e2eb74` var låst** vid överlämningen (agenten
  avslutade sitt arbete). Dess slutrapport kom aldrig till den här sessionen. Läs i stället
  commit `0ca8830`, agentens kommentar på MES-362 i Linear, och kör `sh dev/kolla.sh` i worktreen.
  Ta inte bort worktreen förrän grenen är ihopslagen.
- **Anthropic-krediten tog slut** under G3 (`credit balance is too low`, efter 1,56 USD). Troligen
  samma konto som produktionen. Utan kredit svarar inte Claude i appen (appen fungerar ändå,
  osäkra kort går till Name this card). Bara Jesper kan fylla på.
- I main-mappen ligger tre ocommittade filer från en annan session (`.claude/skills/measurements/`,
  `dev/measurements/`). Rör dem inte.

## Beslut (Jesper 2026-10-11)
- **D2 = variant B, "Framkallas i takt"** — fotot klarnar `1 − e^(−t/1800 ms)` (blur 12 → 3,5 px);
  skarp mitt + NOT IDENTIFIED först när spelaren behövs. Designytan "Mesa Reading Mark":
  https://claude.ai/artifact/EguWdqncyTDFqvPR5TGYNM, källor `design_handoff_lasmarkering/`.
- **I1 byggs nu**: kortet läggs ned direkt vid släppet (förut efter 0,5 s, `OFR_TROSKEL`).
- **`PROVA_MS` 15 → 5 s.** Underlag: Claudes svarstid i kameraläget median 2,6 s, p90 4,3 s,
  max 7,2 s (`claude_fragor`, 61 frågor). Ett sent svar används ändå.
- **B4 bekräftad:** Claude som lärare för nya kort. G3: 0 säkra fel med kontrollen mot Scryfall-bilden.
- **"Lära sig medan man spelar" (etapp 1–4 i planen) ska vara en del av Private beta**, inte efter.
  Etapperna = sista avsnittet *Föreslagen ordning*: 1 minnet + aktiva leken, 2 världssteget lokalt,
  3 Claude som lärare, 4 lekvalet bort ur Mirror. Inget av dem är påbörjat. (Inte samma som
  "etapperna" i `dev/plan/etapper.md`.)
- **Modell:** Jesper sa ja till att jämföra modeller (gjort i G3). Förslaget Sonnet 5.5 effort low
  (lika många rätt som Opus, median 1,3 s, 0,25 cent/fråga) är **inte infört** — kräver först en
  golden `--ai`-körning med kamerans riktiga fråga (med lekens lista), efter påfylld kredit.
  Bytet görs med miljövariabeln `ANTHROPIC_MODEL_KAMERA`, utan kodändring.

## Förkastat
- **Färg- eller lagligt-filter före sökningen** (MES-363) — höjer första försöket +0–1 av 37,
  blir långsammare, och färger inlärda ur 3 kort gav ett säkert fel (Swamp → Plains).
- **Variant C (tyst prick)** — närmast ett laddläge, som Jesper avfärdat förut (MES-292 sida 1).
- **Opus kvar för läraren** — inte bättre än Sonnet 5.5 i G3, dubbelt så långsam och dyr.
- **Sonnet 5 / Haiku 5.5** — felstavar namn respektive tomma svar.

## Öppna frågor
- **B6 "motståndare utan konto"** — alla spelare har konto (Jesper). Troligen menat "motståndare
  vars kort Mesa aldrig sett": samma väg, världen och sedan Claude. Skriv om raden i planfilen.
- **Kontrollen stoppar 31–33 % av Claudes rätta svar** (av de 13 svåra korten släpps bara 2).
  Förslag, ej beslutat: Claudes stoppade namn visas som förslag i Name this card, ett klick
  för att bekräfta. Ett lägre ORB-krav går inte att sätta på 5 felaktiga svar.
- **MES-327 (billigare Claude-fråga) och MES-325 (kostnaden loggas på servern)** — föreslaget,
  Jesper har inte svarat: lyft MES-327:s blockering av MES-325; MES-327 behåller golden `--ai`
  med Sonnet 5.5, prompt caching (kräver beställd systempromptändring) och mindre bild; krymp
  MES-325 till det som saknas (dollar per fråga, spelkod, vyer per parti/dag, kontroll mot konsolen)
  — tabellen `claude_fragor` finns redan.
- **Träna på det Claude lär ut** — svarat i princip: kontrollerade eller spelarbekräftade kort kan
  träna bildmodellen och remsan; ORB kan *minnas* spelarens egen tryckning som referens (men lärda
  bilder sänkte bildmodellen en gång, MES-232 — mät). Kräver rad i villkoren om att foton används
  till träning. Ingen issue skapad.
- **De liggande korten** (split, battles, "navkort") är det som fäller första försöket mot världen.
  Krymp-sessionen föreslog dem som nästa mätning; Jesper har inte svarat.
- **100 MB fingeravtryck** för världen på telefonen — största tekniska risken i etapp 2.

## Nästa steg
1. **När Jesper säger att partiet är klart:** analysera filerna i `dev/diagnos/` —
   `dev/las-fore-slapp/analys.cjs` / MES-242-analysen för latensen (släpp → syns, släpp → namn,
   mot I1 ≤ 0,1 s och I2 ≤ 0,3 s i MES-349), `claude_fragor` för partiets frågor, bordsloggen
   med `dev/eventtest/jamfor.cjs --logg`. Gå igenom Jespers anteckningar mot Redo att testas och
   föreslå vilka som kan stängas eller gå tillbaka till Todo (han bestämmer).
2. **MES-362 till main:** fristående granskare (agent) läser diffen krav för krav mot
   `design_handoff_lasmarkering/README.md` och README:ns tavlor; golden en gång i bakgrunden
   (alla fall, kamerakod); slå ihop, pusha, `markeraRedoAttTesta` med exakt vad Jesper ska prova
   (ett nytt kort syns direkt, fotot klarnar, NOT IDENTIFIED först när spelaren behövs, motståndaren
   ser aldrig skarpt). Städa worktree och gren. Nästa inspelade parti blir efter-mätningen.
3. **Skriv in dagens beslut i `dev/plan/lekar-och-minnet.md`** (B4 bekräftad, inlärningen i betan,
   B6 omskriven, D2 = B) och en kort "Läget"-rad överst: vad som är mätt, vad som återstår.
4. **Föreslå ordningen för etapp 1–4 i Private beta**, med vad som kan gå parallellt: etapp 1
   (minnet, aktiva leken) beror inte på världen; etapp 2 behöver lösningen för 100 MB och ORB som
   krav; design D1 (Mirror utan lekval) och D3 (efter partiet, "Mesa learned N cards") saknas.
   Skapa issues först när Jesper sagt ja — tröskeln i CLAUDE.md.
5. Efter påfylld kredit: golden `--ai` med Sonnet 5.5 low mot Opus 5 (mesa-matning, Sonnet).

## Kodpekare
- `index.html` — `ofrSteg`/`OFR_TROSKEL` (~33446), `.ofram`/`.ofsudd` CSS (~1985), `PROVA_MS` (~26112); ändrade på MES-362-grenen.
- `design_handoff_lasmarkering/` — designytans källor och README (byggunderlaget för B).
- `dev/plan/lekar-och-minnet.md` — planen; sist resultaten G1/G2, krymp världen och G3.
- `dev/g3/` — G3-bänken (`fraga.cjs`, `kontroll.py`, `resultat/`).
- `api/identify.js` — `MODEL_KAMERA` (env `ANTHROPIC_MODEL_KAMERA`), kortläget `mode === 'card'`; systemprompten rörs bara på beställning.
- Supabase-projektet "Magic" (`rtoejcafnssypnysjmey`), tabellen `claude_fragor` — svarstider och tokens per fråga.

## Arbetssätt
- Svenska, korta förklaringar för icke-expert: rubriker, tabeller, vad före hur.
- **Skriv alltid vad en issue handlar om bredvid numret**, och förklara planbegrepp (etapp, G3, beta-grinden). Jesper kan inte numren.
- Börja inte nytt arbete utan hans ja; han sa uttryckligen "hoppa inte in i nåt arbete" före partiet.
- Subagenter: en uppgift var, rapportera och avsluta; inget som väntar på något annat. Mätning = Sonnet, bygge = Opus. Golden aldrig parallellt med en annan golden eller med hans spel.
- Linear-skrivningar på eget initiativ via `dev/linear-agent/klient.cjs`; allt nytt i Triage.

## Öppningsreplik
> Är partiet inspelat? Lägg filerna i `dev/diagnos/` så går jag igenom latensen och vad som höll — och när du är klar med telefonen slår jag ihop läsmarkeringen B (MES-362) efter granskning och golden.

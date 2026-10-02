# Prompt: MES-330 — namn på de kort detektorn hittar

**Modell och effort:** Fable 5.1 (`claude-fable-5-1`), effort **xhigh**. Det är läsningen och
spärren mot fel namn (CLAUDE.md: `mesa-bygg-tung`-området). Kör i huvudarbetsträdet
`/Users/jesperfunk/Code/magic`, inte i en worktree: golden går mot port 8239 och profilen
`mesa-golden-profil`, där poolen är hel (114).

**Kör den efter att Jesper slagit ihop nattens grenar** (MES-305, MES-316, MES-328 — se
*Nattens arbete* nedan). Startas den före det: läs avsnittet och gör som det säger.

Kopiera allt under strecket som prompt.

---

Gör klart MES-330: korten som den tränade detektorn hittar ska också få namn. Pusha och
driftsätt på main utan att fråga, men mät före och efter. Kontrollera först med `git status`,
`git log origin/main..HEAD` och `ListAgents` att ingen annan session skriver i index.html,
och att nattens grenar (nedan) är ihopslagna.

LÄS FÖRST
- Minnena `mes-329-tranad-detektor-i-appen` (hela), `mes-328-remsans-namn`,
  `mes-288-tranad-detektor`, `golden-egen-port`, `kontroller-som-ljuger`,
  `flera-sessioner-samma-arbetstrad`.
- `dev/golden/historik.md`, raden 2026-10-01 (MES-329), commit-meddelandena 1d947bb och
  6f7f97c, och `dev/golden/SNABBGUIDE.md` (`--ai`, `--tro "detektor:0"`, `--beskarningar`).
- **`dev/remsa/RESULTAT.md`** (MES-328:s svarstabell överst, LÄS-MIG längst ner) — på main om
  grenen är ihopslagen, annars `git show mes-328-remsans-namn:dev/remsa/RESULTAT.md`. Det är
  underlaget för steg 3; bygg inte något som den redan mätt bort.
- `dev/plan/handover-2026-10-02-mes-328.md`, `-mes-316.md`, `-mes-305.md`: vad natten
  byggde och vad som är oklart i var och en.
- CLAUDE.md: systemprompten i api/identify.js rörs bara på uttrycklig begäran. Behöver
  något i den ändras: föreslå i chatten och stanna där.

NATTENS ARBETE (2026-10-01 → 02), och vad det betyder här
- **MES-328 (remsans namn)** — grenen `mes-328-remsans-namn`, bänken `dev/remsa/`, inget i
  appen rört. Issuen står i Behöver dig: Jesper ska säga om riktningen *geometri → tröskel →
  blänkmätning, före träning* håller. **MES-330 är den "nya issuen för remsan i appen"
  som handovern säger ska skapas när han sagt ja.** Det MES-328 mätte, och som styr steg 3:
  - Dagens bildmodell (MobileCLIP-S0) sätter rätt namn på en remsa — 64/64 på golden-
    fotona, 23/23 högkort, 0 säkra fel — när remsan skärs **ur kamerans fulla bild, ur
    kortets geometri (hörnen)**. Ingen träning behövs för själva remsan.
  - Det som fäller den: 960-analysbilden som källa (12 av 74 tappas), appens
    axelparallella lådor i stället för hörnen (41/61 mot 53/61), och blänket i MES-246
    (24 % rätt, Swamp på 598/735). **Detektorns egen remslåda, vriden rätt, kostar nästan
    inget: 63/69 mot hörnens 67/74.** Lodräta remsor (liggande kort) ska vridas moturs —
    fel håll gav 15 av 21 fel.
  - Tröskeln 0,11 (kalibrerad på hela kort) ger 27 säkra fel på remsor i MES-246;
    nollfel-tröskeln där är 0,18. Remsan behöver sin egen tröskel, kalibrerad i bänken.
  - OCR är sämre överallt (0/735 i MES-246; PSM 7 0 av 1 332 på hela remsan). Duger bara
    som andra vittne på tunna band, aldrig som huvudspår.
  - Bänkens skript: `dev/remsa/nollprov.py` (grinden: golden-fotona 64/64, 0 säkra fel),
    `detektor_remsor.py` (detektorns remsor), `lib.py` (bildmodellen i Python med
    embed.js-receptet; `kalibrering.py` ska ge 53/61).
- **MES-316 (inloggning + tak för /api/identify)** — grenen `mes-316-identify-inloggning-tak`,
  Redo att testas. Alla sju POST-anrop i index.html går via `aiFraga` med `Moln.token`;
  servern kräver inloggning, 300 frågor per konto och månad; migration
  `20261002100000_claude_fragor.sql` måste köras före driftsättning. **Golden `--ai` är
  opåverkat** (attrappen använder exporten `identifiera` utan inloggning), men din spärr i
  steg 2 ligger i samma kod som `aiFraga`/`svarAI` — bygg på den ihopslagna versionen.
  Preview-deployer svarar 503 på AI-frågor tills Vercel-variablerna finns där.
- **MES-305 (dold information)** — grenen `mes-305-dold-information`, Redo att testas,
  ombaserad på 6f7f97c. Kamerans meddelanden går på en privat kanal per konto
  (`kam:<user_id>`); migration `20261002000000_mes305_dold_information.sql` först.
  Rör inte din del, men `Moln.sandKam` (som ?debug-reglagen går genom) är ändrad.
- Är någon av grenarna **inte** ihopslagen när du startar: bygg på main som den är, säg det
  i chatten, och räkna med en rebase på index.html för Jesper. Slå inte ihop grenarna själv
  (migrationerna ska köras i rätt ordning, och det gör Jesper).

LÄGET
Detektorn (MES-329) hittar 73 av 74 kort i golden-fallen med hörn (03, 04, 05, 06, 13, 14,
15, 16). Men golden räknar namn, och de nyfunna korten är de täckta korten i högarna, som
bara visar namnremsan. Kedjan efter detektorn kan inte namnge en remsa: bildmodellen får
hela beskärningen (mest grått efter maskningen av det övre kortet), ORB vill se konstverket,
textläsaren läser remsan dåligt ("LL phen", "iq | a"). Mätt 2026-10-02, åtta fallen, 74 kort:

| | Rätt namn | Fel namn |
|---|---|---|
| utan Claude | 51/74 | 1 (14: Resistance Reunited — rätt namn, men facits ruta är bara remsan) |
| med Claude (`--ai`) | 59/74; 03, 05, 06, 16 alla 100 % | 2: samma som ovan + **04: Claude satte Swamp på ett täckt Plains ur en maskad beskärning** |

Kvar utan namn med Claude: de två täckta Plains i högen i 14 och 15 ("osäker"), Plains i
plastficka i 04 (lådan finns; igenkänningen dömer "baksida ficka", MES-258-regeln, och spåret
blir skräp), och nio av tio kort i 13 ("ocr hoppad: liten" — 40 cm, tio kort, stående
telefon: upplösning, inte detektorn).

MÅLET
74/74 rätt namn i de åtta fallen med `--ai`, 0 fel namn, och fler än 51/74 utan Claude —
utan att något av de övriga åtta fallen (01, 02, 07–12) blir sämre än baslinjen i
`senaste.json`/`senaste-ai.json`. Fel namn 0 är det hårda kravet; namn är målet.

GÖR, I ORDNING
1. Baslinje: `node dev/golden/kor.cjs --port 8239 --fall 03,04,05,06,13,14,15,16` och samma
   med `--ai`. Kolla `lsof -iTCP:8239`, `pgrep -f kor.cjs` och raden `Poolen: 114` först.
   Hela setet kör du i två satser om åtta (`--fall 01,…,08` + `09,…,16`): tre av sex hela
   körningar med detektorn dog i Chrome vid resultathämtningen, satserna aldrig.
2. Spärren mot säkra fel ur maskade beskärningar (04). När `maskaTackt` målat över det
   täckta kortet (index.html: identifiera → `tackt`), får ett svar från Claude inte bli
   säkert utan ett andra vittne med samma namn: remsan ur steg 3, eller textläsaren på
   remsan. Mät med `--ai --fall 04` och `--beskarningar` (titta på bilden som skickades).
   Det här är det viktigaste steget: ett säkert fel namn hamnar på bordet.
3. Namnet ur remsan (14, 15 — det "kortlåda eller remsa" i GRIND3.md lovade). Gör som
   MES-328 mätte fram, inte något annat: för ett spår vars låda har en remsa
   (`fyndUrLador` sätter `remsa`/`remsaMitt`; `Detektor.kor` ger remslådan i rutans
   bildpunkter) och vars beskärning är maskad eller täckt, skär remsan **ur videons fulla
   bild** (som `beskar()` gör, inte ur 960-canvasen), vrid lodräta remsor moturs, och låt
   bildmodellen rangordna leken på remsan ensam med **remsans egen tröskel** — kalibrera
   den i `dev/remsa/` (nollfel på MES-246-remsorna, 0,18 där) innan den sätts, aldrig 0,11.
   Textläsaren bara som andra vittne. Mät i `--fall 14,15` lokalt och med `--ai`, och mot
   bänkens grind (`nollprov.py`: 64/64, 0 säkra fel ska stå kvar). Säg i chatten vad
   remsan gav innan du går vidare.
4. Baksida i ficka (04). Regeln (MES-258, `framsideForm` i kamIdentifiera) dömer "baksida
   ficka" när inget vittne sett ett kort. Nu finns ett vittne: detektorn gav en kortlåda
   (klassen `kort`, inte `baksida`). Låt regeln kräva att spåret inte kommer ur en
   kort-låda med poäng ≥ 0,8 — eller mät vad som skiljer. Mät i `--fall 04,08` (08 har en
   riktig baksida som ska förbli baksida).
5. Fall 13 är upplösning: säg vad kortsidan är i videopixlar där (`--detalj`, "liten"), och
   om det är under KORT_MIN_PX × 0,6 lämna det och skriv det som ett eget fynd i chatten —
   ändra inte golvet för att ett fall ska bli bättre.
6. Kort ur remsor utan låda (`--tro "detRemsa:1"`, `T.detRemsa`): +2/738 i MES-246 men
   ~40 dubblettlådor, och båda golden-körningarna med det på dog i Chrome. Kör det i
   satser om åtta. Blir det bättre utan nya fel namn och utan fler falska: säg det och
   låt Jesper besluta om förvalet. Annars lämna det av.
7. Mät allt till slut: båda satserna utan Claude och de åtta fallen med Claude. Skriv
   raden i `dev/golden/historik.md`, spara baslinjen (`--spara` per sats; `--ai --spara`
   bara om Claude-vägen ändrats) och uppdatera minnena `mes-329-tranad-detektor-i-appen`
   och `mes-328-remsans-namn` med det nya läget.
8. Granskning före push: en fristående granskare (Agent, utan din kontext) läser hela
   diffen mot origin/main med uppdraget att hitta fel i spärren, läsningen och golden-
   harnessen; rätta, granska igen efter rättelserna. Säg i chatten vad den hittade.
9. Pusha, kontrollera produktionen (`diff <(curl -s https://magic-mauve-xi.vercel.app/) index.html`),
   flytta MES-330 till Redo att testas med `markeraRedoAttTesta` och skriv vad Jesper ska
   prova på telefonen: en tät landhög där bara remsorna syns, och ett kort i plastficka.
   Hör remsan i appen till MES-328:s "Klart när": skriv en kommentar där om vad som nu är
   mätt i appen.

REGLER
- Mät innan du påstår något. Läs kortdomen innan ett "fel namn" tas som ett fel: facits
  ruta för ett täckt kort är bara den synliga remsan, så ett spår med hela kortets låda
  kan räknas som falskt fast namnet är rätt (14, Resistance Reunited).
- Rör inte trösklarna i `dev/detektor/modell/detektor.js` (valda på valideringen), inte
  bildmodellens tröskel 0,11 för hela kort, och inte systemprompten. Remsans tröskel är
  ny och ska kalibreras i bänken.
- Kör aldrig två golden samtidigt; `--tro "detektor:0"` ska fortfarande ge LIKA BRA med
  den gamla baslinjen (49/97, 1, 3) — kör den kontrollen en gång till slut.
- Golden `--ai` går mot attrappens `identifiera` utan inloggning också efter MES-316;
  produktionen kräver inloggning och att migrationen är körd — provet på telefonen
  förutsätter det.
- Fastnar du på något som kräver Jesper (riktningen för MES-328 om han inte svarat,
  migrationerna, ett prov på telefonen): fråga i chatten, och lämna inte MES-330 i
  In Progress om sessionen tar slut (kommentera läget och flytta till Todo).

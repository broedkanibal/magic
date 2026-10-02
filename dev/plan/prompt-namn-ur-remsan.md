# Prompt: MES-330 — namn på de kort detektorn hittar

**Modell och effort:** Fable 5.1 (`claude-fable-5-1`), effort **xhigh**. Det är läsningen och
spärren mot fel namn (CLAUDE.md: `mesa-bygg-tung`-området) — inte ett vanligt bygge. Kör i
huvudarbetsträdet `/Users/jesperfunk/Code/magic`, inte i en worktree: golden går mot
port 8239 och profilen `mesa-golden-profil`, där poolen är hel (114).

Kopiera allt under strecket som prompt.

---

Gör klart MES-330: korten som den tränade detektorn hittar ska också få namn. Pusha och
driftsätt på main utan att fråga, men mät före och efter. Kontrollera först med `git status`,
`git log origin/main..HEAD` och `ListAgents` att ingen annan session skriver i index.html.

LÄS FÖRST
- Minnena `mes-329-tranad-detektor-i-appen` (hela), `mes-288-tranad-detektor`,
  `golden-egen-port`, `kontroller-som-ljuger`, `flera-sessioner-samma-arbetstrad`.
- `dev/golden/historik.md`, raden 2026-10-01 (MES-329), och commit-meddelandena 1d947bb
  och 6f7f97c.
- `dev/golden/SNABBGUIDE.md` (kommandona, `--ai`, `--tro "detektor:0"`, `--beskarningar`).
- CLAUDE.md: systemprompten i api/identify.js rörs bara på uttrycklig begäran. Behöver
  något i den ändras för det här: föreslå ändringen i chatten och stanna där.
- MES-328 (bildmodellen på namnremsor): kolla i Linear och i `git log` om den är ihopslagen
  med main. Är den det: bygg på den. Är den inte det: läs `dev/plan/handover-2026-10-02-mes-328*.md`
  och grenen `.claude/worktrees/wf_*`, och säg i chatten vad du tänker använda därifrån
  innan du kopierar något.

LÄGET
Detektorn (MES-329) hittar 73 av 74 kort i golden-fallen med hörn (03, 04, 05, 06, 13, 14, 15,
16) — GRIND3:s nivå. Men golden räknar namn, och de nyfunna korten är de täckta korten i
högarna, som bara visar namnremsan. Kedjan efter detektorn kan inte namnge en remsa:
bildmodellen vill se hela kortet, ORB konstverket, textläsaren läser remsan dåligt
("LL phen", "iq | a"). Mätt 2026-10-02 på de åtta fallen (74 kort):

| | Rätt namn | Fel namn |
|---|---|---|
| utan Claude | 51/74 | 1 (14: Resistance Reunited — rätt namn, men facits ruta är bara remsan) |
| med Claude (`--ai`) | 59/74; 03, 05, 06, 16 alla 100 % | 2: samma som ovan + **04: Claude satte Swamp på ett täckt Plains ur en maskad beskärning** |

Kvar utan namn med Claude: de två täckta Plains i högen i 14 och 15 (#10/#11, "osäker"),
Plains i plastficka i 04 (lådan finns; igenkänningen dömer "baksida ficka", MES-258-regeln,
och spåret blir skräp), och nio av tio kort i 13 ("ocr hoppad: liten" — 40 cm, tio kort,
stående telefon: upplösning, inte detektorn).

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
   täckta kortet (index.html: identifiera → `tackt`), eller när beskärningen är en skapad
   remsa, får ett svar från Claude inte bli säkert utan ett andra vittne: remsan läst av
   textläsaren eller MES-328:s remsmodell med samma namn. Mät med `--ai --fall 04` och
   `--beskarningar` (titta på bilden som skickades). Det här är det viktigaste steget: ett
   säkert fel namn hamnar på bordet.
3. Namnet ur remsan (14, 15, och det som "kortlåda eller remsa" i GRIND3.md lovade). Med
   MES-328 ihopslagen: koppla remsmodellen till spår vars låda har en remsa
   (`fyndUrLador` sätter `remsa`/`remsaMitt`) och vars beskärning är maskad eller täckt.
   Utan MES-328: textläsaren på bara remsan, uppskalad, i stället för på hela
   beskärningen — prova, mät i `--fall 14,15` lokalt och med `--ai`, och säg i chatten vad
   det gav innan du går vidare. Namnet ur en remsa räknas som säkert bara med samma
   gräns som i dag (`Namn.las`: poäng och marginal), aldrig lägre.
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
   bara om Claude-vägen ändrats) och uppdatera minnet `mes-329-tranad-detektor-i-appen`
   med det nya läget.
8. Granskning före push: en fristående granskare (Agent, utan din kontext) läser hela
   diffen mot origin/main med uppdraget att hitta fel i spärren, läsningen och golden-
   harnessen; rätta, granska igen efter rättelserna. Säg i chatten vad den hittade.
9. Pusha, kontrollera produktionen (`diff <(curl -s https://magic-mauve-xi.vercel.app/) index.html`),
   flytta MES-330 till Redo att testas med `markeraRedoAttTesta` och skriv vad Jesper ska
   prova på telefonen: en tät landhög där bara remsorna syns, och ett kort i plastficka.

REGLER
- Mät innan du påstår något. Läs kortdomen innan ett "fel namn" tas som ett fel: facits
  ruta för ett täckt kort är bara den synliga remsan, så ett spår med hela kortets låda
  kan räknas som falskt fast namnet är rätt (14, Resistance Reunited).
- Rör inte trösklarna i `dev/detektor/modell/detektor.js` (valda på valideringen) och inte
  systemprompten.
- Kör aldrig två golden samtidigt; `--tro "detektor:0"` ska fortfarande ge LIKA BRA med
  den gamla baslinjen (49/97, 1, 3) — kör den kontrollen en gång till slut.
- Tidsmått på Macen när nattagenterna kör (MES-316, 305, 328) ska märkas "under last".
- Fastnar du på något som kräver Jesper: fråga i chatten, och lämna inte MES-330 i
  In Progress om sessionen tar slut (kommentera läget och flytta till Todo).

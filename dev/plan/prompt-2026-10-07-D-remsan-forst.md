# Prompt D, 2026-10-07: remsan först — korten i högar och omlott får namn, ett bygge i tre steg

**Modell: Fable 5.1, effort xhigh**, byggagenten `mesa-bygg-tung` (detektorn, läsningen och spärren mot fel namn står på
spel). Ny session, egen worktree. Ersätter prompt C (`prompt-2026-10-07-C-hogarna.md`), som inte ska startas vid sidan av.
Kan köras parallellt med Spegelmattan-orkestreraren (datorsidan i index.html); krockreglerna står sist.

**Beslut som gäller i den här prompten (Jesper 2026-10-07):** modellvägen i MES-340 är **v2 bara på remsorna**
(99/119 ×2, 0 fel namn i natt); **spärren mot kort i handen byggs** i samma svep. v4 på allt väntar på blänkfelet.

---

Läs `dev/material/arbete/markning/matningar-2026-10-07-resultat.md` (dagens svar: var de 19 faller),
`dev/plan/handover-2026-10-06-bildmodell-manga-kort.md`, `dev/golden/SNABBGUIDE.md` och grinden i CLAUDE.md.
Samma samtal som fortsätter: ingen hälsning, nämn inte dokumenten. MES-340: kör `paborjaIssue` (In Progress) — det
här är bygget den väntat på.

## Målet, mätbart

Ett parti med kort i högar och omlott ska få rätt namn på det ögat kan läsa, utan ett enda säkert fel namn, och ett
utspelat kort ska ha sitt namn inom ett par sekunder. På golden (18 fall, 119 kort, 115 läsbara när prompt B:s
flagga sitter):

| Mått | I dag (C 25bcf0a) | Efter steg 1–2 | Efter steg 3 |
|---|---|---|---|
| **Fel namn** (sluttabellen OCH under förloppet) | 0 | **0** — hårt, varje fel spåras till sin väg | 0 |
| Rätt namn av läsbara | 95/115 | **≥ 107/115** (de tolv som sitter i remsan och parningen) | ≥ 112/115 |
| Högar | 8/15, 0 fel | ≥ 11/15, 0 fel | ≥ 14/15 |
| Fördröjning till namn, fall 18 på 8000 kbit/s-filen | 0,9 s | ≤ 1,5 s | ≤ 1,5 s |
| Falska | 1 (+2 token) | ≤ 2 | ≤ 2 |
| Bänkarna | helkort 2 säkra fel vid 0,11; remsregeln 0 | **0 säkra fel** i helkort, remsregeln (13b, MES-246), hogbank_remsor | 0 |

**Jespers regel, utan undantag:** ingenting skrivs mot ett visst kort, fall, pixelposition eller en tröskel vald för att
ett fall ska gå över. Testet för varje idé: *hjälper den ett annat kort i en annan lek i samma situation?* Trösklar mäts
ur bruset (provbordet, remsregel.py), inte sätts.

## Arbetssättet: bänkar i sekunder, golden två gånger per steg

Ingen golden mellan vridningar. Varje idé provas på bänkarna som tar sekunder till minuter:
`dev/remsa/hogfall.py` (appens detektorkedja per facitkort, 13/14/17/18 + `--extra` rutor), `dev/remsa/hogremsor.py`
(läsningen på exakt remsa och detektorlåda), `dev/remsa/remsregel.py`/`remsexp.py` (13b, MES-246), `dev/remsa/
hogbank_remsor.py` (68 högfall), `dev/detektor/tran/parprov.py` (dubbletter i MES-246), `node dev/kamerabank.cjs` och
`node dev/avstamning.cjs` (0 FEL). Golden körs **en C på den sammanslagna koden och sedan två gånger** när ett steg
är klart — inte oftare. Fristående granskning (Agent) av diffen före merge och efter varje rättelse; granska det
sammanslagna läget, inte bara grenen.

## Steg 1 — läsningen: namnet ur den exakta remsan, för alla kort

1. **Remsmodellen v2 in i appen.** `dev/embed/modeller/mobileclip-s0-mesa-v2.onnx` upp som artefakt (HF-repo eller
   egen URL — filen är gitignorerad), embed.js `remsModell` pekar dit, `V` höjs så vektorerna räknas om (lagrade per
   kort-id). Remsans trösklar (`remsaTroskel`, `remsaTitelTroskel`, `remsaVittne`) mäts om för v2 ur remsregel.py
   och provbordet — v2:s marginaler är inte appens modells.
2. **Hörnexakt remsa.** Remsan skärs ur kortets geometri — lådan, kortets vinkel (`t.vm`, KortVinkel) och remsans
   andel (14 %) — i stället för detektorns axelparallella, lösa remslåda. Mätt i dag: lådan läser 0,05–0,19 där den
   exakta remsan läser 0,3–0,6. Delade lådor (två tappade Plains i en hög) får en remsa per kort; övermålningen av
   det som ligger ovanpå (maskaTackt/remsaUtom) behålls. Bänk: `hogremsor.py` ska visa att appens remsa ≈ exakt remsa.
3. **Spärren.** Remsan sätter säkert namn bara på spår som är stilla (formstilla N rutor), oskymda (`skymd`,
   `hallen`) och med region nyss; `modell land` kräver synlig andel eller ett andra vittne. Fall 11 vid 38,85 s
   (kortet i handen: v2 0,158, v3 0,216) är fallet som ska falla rätt — men regeln skrivs för alla kort som hålls över
   bordet, inte för det.

## Steg 2 — parningen: en låda med flera remsor är flera kort

1. **Remsa utan kortlåda blir ett kort** (`T.detRemsa` generiskt): kortets låda ur remsans läge och lådbredden i
   närheten, med dubblettregeln (delad remsa OCH IoU ≥ 0,3). MES-329 mätte +2/738 men ~40 dubblettlådor i MES-246 —
   det är dubbletterna som ska bort, inte regeln.
2. **En kortlåda som rymmer N remsor delas i N kort**, ett per remsa, ordning = remsans läge (den översta remsan är
   kortet ovanpå). 17:s hög B (en låda, dömd skräp) och hög A är fallen; regeln gäller varje hög.
3. **Skräpdomen** får inte döma en hög som skräp bara för att lådan inte är kortformad när den bär remsor.

Mät steg 1–2 ihop: golden C en gång på den sammanslagna koden, bygget två gånger, `--ny-embed`. Varje kort som rör
sig förklaras med `dev/golden/kortdom.py` och `kortremsa.py`.

## Steg 3 — detektorn: högar av tappade land i mörker och på ljusa bord

Först när steg 1–2 är inne. Remsklassen tiger på fyra av sju högkort i 17 (vitt bord, mörker) och kortklassen ger en
låda per hög. Det är träningsdata: syntetiska högar av tappade land, 10–20 % förskjutna, i flera ljus och på ljusa och
mörka bord (`dev/detektor/synt/`), inte 17:s bild. Kaggle är godkänt. Grinden: prov/träning-spärren
(`dev/detektor/delning.py`), `parprov.py`, `hogbank_remsor.py`, och golden ×2. **Be Jesper om en eller två nya
inspelningar** (vitt bord, mörker, högar av tappade land, 0,5× och 1×) som prov-material innan träningen bedöms —
17 är den enda sådana bilden i dag, och den får inte bli både prov och facit för träningen.

## Krock med Spegelmattan

Orkestreraren rör datorsidan i index.html (avstamBord, mattan, kamSkala); det här rör kameran (lasRemsa/skarRemsa,
Detektor.para/fyndUrLador, kamIdentifiera, embed.js). Olika funktioner, samma fil: bygg i egen worktree, slå ihop
först efter `git fetch` och en granskning av det sammanslagna läget, säg till orkestreraren före push, och kör
golden på den sammanslagna koden. En golden åt gången på datorn: "golden startar"/"klart" till "Spegelmattan
orkestrerare" och "MES-334 fall 05 utredning" (ListAgents). Ingen annan session ska starta prompt C eller en ny
modellmätning under tiden.

## Skriv

Rad per golden i `dev/golden/historik.md`; redogörelsen i `dev/plan/remsan-forst-resultat.md` (per steg: vad som
ändrades, vad bänkarna sa, vad golden sa, vilka kort som rörde sig och varför); MES-340 får kommentar per steg som
agenten och flyttas till Redo att testas när steg 1–2 är ute (vad Jesper ska prova på telefonen: ett parti med högar
och ett kort i handen). Säg i chatten efter varje steg vad siffran blev och vad det kostade i de andra fallen.

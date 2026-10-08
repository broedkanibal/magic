# Spegelläget i etapper (projektet *Spegelläget i realtid*)

> **2026-09-27:** projektet *Spegelläget i realtid* är stängt och har gått upp
> i projektet *Private beta*. Alla öppna issues nedan ligger i milstolpen
> *6 · Mirror my table*; Etapp 1–4 finns inte längre som milstolpar i Linear.
> Indelningen här gäller fortfarande som ordning inom milstolpen. Betans krav
> på spegelläget är grinden MES-312: ett helt parti spelbart.

Kartan över vägen till målen i projektet *Spegelläget i realtid*. Linear är källan för status; den
här filen finns för att en ny Claude Code-session ska kunna läsa planen
utan att gå till Linear. Uppdatera båda när något ändras.

## Målen

| Löfte | Mål |
|---|---|
| Kortet syns på rätt plats — skarpt med namn, eller suddigt (framkallningen) | **median ≤ 0,1 s** från att handen släpper |
| Rätt namn står där (det suddiga blir skarpt) | median ≤ 0,3 s, nästan aldrig efter 2 s |
| Hela händelsen rätt på mattan (kort, tap-läge, plats) | ribban sätts efter ett nytt parti |
| Inget säkert fel namn | 0 |

**Målen sattes om med Jesper 2026-10-08 och ägs av MES-349** ("Mirror my table upplevs instant och
accurate"), där kraven och de ribbor som sätts efter nästa mätning står. Framkallningen (MES-344,
`dev/plan/spegelmattan-principer.md` *Utspel*) ändras därmed: det suddiga kortet läggs ned direkt
vid släppet, inte efter 0,5 s. *Släppet* är telefonens första rapport där kortet ligger still som
ett kort (`kortlik`, `vilar`). Det tidigare målet "slutläget rätt i 99 fall av 100" ersattes av
"hela händelsen rätt", med ribban satt ur mätningen.

Gäller allt man gör vid bordet: lägga ner, tappa och untappa, flytta,
till graveyard, till handen, tillbaka i library, stacka mana, och fästa
ett kort vid ett annat.

## Etapperna

Etapperna är **milstolpar** i projektet *Spegelläget i realtid*, inte issues.
De var issues (MES-253 till 256, under MES-237) fram till 2026-09-20; de fem
är stängda som ersatta och barn-issuesarna ligger oförändrade kvar på sin
milstolpe.

| Etapp | Issue | Innehåller | Ändrar hur appen känns? |
|---|---|---|---|
| 1 Mät klart | milstolpen *Etapp 1 · Mät klart* | MES-244, 243, 164, 238, 242, 190, **249** | nej |
| 2 Farten | milstolpen *Etapp 2 · Farten* | MES-246, 221, 252, 222, 287 | ja, namnet kommer tidigare |
| 3 Träffsäkerheten | milstolpen *Etapp 3 · Träffsäkerheten* | **MES-250**, 233, 106, 241, 245, 234, 235, 232, 220, 219, 218, 217, 223, 288 | ja, färre fel och fler kort hittas |
| 4 Handlingarna | milstolpen *Etapp 4 · Handlingarna* | MES-247, 251, 248, 291, 292, 293, 294, 295 | ja, tokens, attach och zonerna |

Etapp 4 rör appen och avstämningen, inte igenkänningen, och kan byggas
parallellt med 2 och 3 av en egen session.

## Läget 2026-09-20

* **Uppmätt på riktig telefon (MES-238):** telefonens beslut → ritat på
  datorn ~0,1 s, lika i 4K·15 och 1080p·30. Telefonen är lika snabb som
  Macen. Modellen gick på WebGPU.
* **Uppmätt i golden (MES-244):** igenkänningen håller 0 fel ner till
  48 px kortsida. Spärrarna (ORB-inliers, skala, titelraden) bromsar inte
  små kort. Analysbilden är högst 360 px bred i både 4K och 1080p.
* **Det som saknas är att HITTA korten:** 41 av 57 blir spår, och de
  som fattas ligger omlott (MES-250). De korten går till Claude, och det
  är det som gör namnen långsamma.
* **Claude-vägen går inte att snabba upp genom mindre bild** (MES-252,
  mätt 2026-09-21). Helbilderna står för 13 av 20 anrop och 35 366 av
  45 276 indatatokens, och tar 5,8–12,0 s styck. Beskärningarna är redan
  små: 210 respektive 100 bildtokens mot helbildens 1 170. Claudes
  svarstid varierar dessutom **2–17 s mellan körningar på samma kod**, så
  tiondelar är omätbara. Enda kvarvarande spaken är `output_config`
  (`effort`) i kameraläget, och den kräver en egen eval. **Mät inte om
  det här** — vägen till fartlöftet går genom att färre kort frågas, inte
  genom att frågan blir billigare.
* **Namn i dag:** 0,84 s i median på telefon, hälften via Claude
  (1,5–6 s). Lokalt rätt namn 35/57, med Claude 57/57, 0 fel.

## Beroenden värda att minnas

* MES-246 del 2 (läs före släppet) vill ha MES-221 (läsningen i egen
  tråd), annars fryser analysen av en läsning per ruta.
* MES-241 (större spelyta) och MES-245 (markera spelytan) hänger på
  MES-250: med vidvinkel blir ett kort ~42 px i analysbilden, och då
  faller omlott liggande kort isär.
* MES-247 (tokens) och MES-251 (attach) väntar på svaret i MES-246 del 1:
  syns en flytt som en flytt?
* MES-243 (värmeprovet) väntar på MES-244 (vilka lägen som ska provas).
* MES-249: golden-baslinjen (`dev/golden/senaste.json`) säger 4/4 namn i
  fall 09, men koden mäter 3/4 i dag — också före MES-242. Etapp 2 och 3
  döms mot den baslinjen, så red ut den innan de mäts.

## Regler som gäller i hela kedjan

* **0 fel namn.** Golden (12 fall), `--utan-leken` och `--ljus alla`.
  En ändring som hittar fler kort men gissar fel är värdelös.
* Systemprompten ändras bara på Jespers uttryckliga begäran (CLAUDE.md).
* En golden-körning i taget, egen port, `ps aux | grep "[k]or.cjs"` före.

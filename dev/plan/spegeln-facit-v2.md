# Facit v2 för partiet 2026-09-21: tillstånd per ruta, digitalt bord mot mattan

Skriven 2026-09-22 efter att nattpassets facit (`dev/plan/spegeln-natt.md`,
grenen `natt-2026-09-22`) underkändes. Den session som kör det här startas
av Jesper på **Fable 5.1 · effort xhigh**; agenterna ärver effort och körs
på `model: opus`. Ingen kod ändras. Inga issues skapas. Inget pushas.

## Varför v1 underkändes, i fyra rader

B (Sonnet) skrev *händelser* ur 301 rutor och fick 0 tappningar, fast
korten tappades hela tiden; positioner och flyttar stämde inte heller. C
hittade felen men rättade inte filen, D räknade vidare på skissen, och
orkestreraren läste B:s text utan att titta på bilderna. Rapporten
(`dev/latens/…json`) användes som källa till *hur mycket* fel Mesa gjorde,
men den kan inte se det största felet: att det digitala bordet inte liknar
mattan.

## Vad v2 gör annorlunda

1. **Tillstånd, inte händelser.** En rad per fysiskt kort per ruta, med
   upprätt/tappad. Ett "0 tappade" går inte att gömma i en sådan tabell.
2. **Båda halvorna av rutan.** Samma ruta har mattan till höger och Mesas
   bord till vänster. Facit och mätning kommer ur samma bild, utan
   rapporten. Rapporten används sedan bara för *varför*.
3. **Kontroll innan något bygger vidare.** En egen agent gör om åtta
   slumpade rutor blint, och skillnaden avgör om facit får användas.
4. **Orkestreraren tittar själv** på tre rutor mot tabellen innan nästa
   steg startas. Det är inte valfritt.

## Underlag

| Vad | Var |
|---|---|
| hela skärmen, 1600 px, klockan överst till höger | `dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/rutor/NNN.jpg` |
| kamerabilden, 705 × 438 | samma mapp, `kam-NNN.jpg` |
| rutorna som används | **var 10:e sekund, 240–540** → 31 rutor: 240, 250, …, 540 |
| leken | `dev/golden/lek.txt` (26 olika icke-land + Plains + Swamp; Ancestral Blade skapar ett Soldier-token, så ett token på det digitala bordet är regelmotorn, inte ett kamerafel) |
| v1, bara som jämförelse | `dev/golden/inspelningar/2026-09-21-parti/` |
| rapporten, bara för steg 4 | `dev/latens/latens-2026-09-21-mes-238-4k15-20min-varme.json`, läs `dev/latens/LÄS-MIG.md` först |

Finns inte `rutor/`: kör A ur `spegeln-natt.md` (`dev/rutor.swift`, ~1 min).

Utdata i `dev/golden/inspelningar/2026-09-21-parti/v2/` (skapa mappen; i git).

## Kedjan

```
1 tabell      6 agenter parallellt, opus, 5–6 rutor var   ~15 min
2 kontroll    1 agent, opus, 8 slumpade rutor blint        ~10 min
3 jämförelse  skript + orkestreraren                       ~10 min
4 förklaring  1 agent, opus, med rapporten                 ~30 min
```

Vakt per agent som i `spegeln-natt.md` ("Så att natten inte går
förlorad"): fil som ska växa, KLAR-fil, stilla 15 min, max 40 min för
steg 1–2, max 60 för steg 4. Högst en omstart. Totalt högst 2 h; då
committas det som finns.

## 1 · Tabellen — sex agenter, `general-purpose`, `model: opus`

Rutorna delas: 240–290, 300–340, 350–390, 400–440, 450–490, 500–540.
Varje agent skriver sin egen fil `tabell-NNN-MMM.tsv` (rutorna den fick)
och `KLAR-1-NNN` när den är klar. Prompt, med `<rutor>` utbytt:

> Arbetskatalog `/Users/jesperfunk/Code/magic`. Rör inte git. Ändra ingen
> kod.
>
> Du ska beskriva **vad som ligger på bordet** i rutorna `<rutor>` ur
> `dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/rutor/`.
> För varje ruta finns `kam-NNN.jpg` (mattan, sedd av telefonen) och
> `NNN.jpg` (hela skärmen: Mesas digitala bord till vänster, kamerapanelen
> till höger, klockan överst till höger). De gröna, röda, gula och grå
> ramarna i kamerabilden är Mesas spår — de är inte facit, titta på korten
> under dem.
>
> Skriv `dev/golden/inspelningar/2026-09-21-parti/v2/tabell-<rutor>.tsv`
> med **en rad per fysiskt kort** i kamerabilden, tab-separerad, i den
> här ordningen av kolumner:
>
> `ruta  klocka  x  y  lage  hog  synligt  kommentar`
>
> - `ruta`: sekunden (filnamnet). `klocka`: menyradens klockslag.
> - `x`, `y`: kortets mitt i procent av kamerabildens bredd och höjd.
> - `lage`: `upprätt` (kortsidan uppåt/nedåt), `tappad` (vridet ~90°, eller
>   tydligt vridet från de andra), `osäker`.
> - `hog`: `-` om kortet ligger ensamt, annars en bokstav per hög i rutan,
>   A från vänster; kort som ligger omlott tillhör samma hög.
> - `synligt`: `helt`, `delvis` (annat kort eller hand täcker), `hand`
>   (handen täcker så att läget inte går att se — skriv då `lage` =
>   `osäker`).
> - `kommentar`: fritt, kort. Skriv `osäker` hellre än att gissa.
>
> Leken (den gröna högen) och graveyardhögen (nere till vänster, i den
> gula rutan) är **inte** kort på bordet; skriv i stället en rad per ruta
> med `x`/`y` = `-` och `kommentar` = `graveyard N synliga` om det går att
> räkna, annars `graveyard ?`.
>
> Efter kortraderna för varje ruta: **en rad om det digitala bordet**, ur
> `NNN.jpg`, med `x`/`y`/`lage`/`hog`/`synligt` = `-` och kommentaren i
> exakt den här formen:
>
> `digitalt: kort=N tappade=N granskning=N cantsee=N graveyard=N library=N namn=A; B; C…`
>
> där `kort` är antal kort på det digitala bordet (inte graveyard,
> library eller granskningsraden), `tappade` hur många av dem som ligger
> vridna, `granskning` siffran i "N cards to fill in" (0 om raden saknas),
> `cantsee` siffran i "The camera can't see N cards" (0 om bannern
> saknas), `graveyard`/`library` siffrorna under högarna, och `namn` de
> kortnamn som går att läsa på bordet, i ordning uppifrån vänster. Ett
> `?`-kort skrivs som `?`.
>
> Sist en rad per ruta: `hand: ja` eller `hand: nej` (finns en hand i
> kamerabilden).
>
> Skriv filen **efter varje ruta**, inte i slutet. Finns filen redan:
> läs sista `ruta` och fortsätt med nästa. Klar: skapa den tomma filen
> `KLAR-1-<rutor>` i `v2/`. Titta noga i varje bild — v1 av det här facit
> underkändes för att den missade alla tappningar. Ta den tid som behövs.

## 2 · Kontrollen — en agent, `general-purpose`, `model: opus`

Startas först när alla sex `KLAR-1-*` finns. Orkestreraren drar först
**8 slumpade rutor** ur de 31 (`node -e` med ett frö, skriv fröet i
resultatfilen) och tittar själv på **3 av dem** mot tabellen, innan
agenten startas. Ser orkestreraren mer än en fel rad i någon av de tre:
kör om den agentens del med samma prompt (en omstart), inte kontrollen.

> Arbetskatalog `/Users/jesperfunk/Code/magic`. Rör inte git. Ändra ingen
> kod. Du ska **kontrollera** ett facit utan att ha sett det. Rutorna
> `<8 rutor>` finns som `kam-NNN.jpg` och `NNN.jpg` i
> `dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/rutor/`.
> Gör först, **utan att öppna någon fil i `v2/`**, din egen tabell för de
> åtta rutorna enligt exakt formatet i avsnitt 1 i
> `dev/plan/spegeln-facit-v2.md` (läs bara det avsnittet), till
> `v2/kontroll-egen.tsv`. Öppna sedan `v2/tabell-*.tsv`, och jämför ruta
> för ruta: antal kort, antal tappade, antal högar, digitalt-raden.
> Skriv `v2/kontroll.md`: en tabell med en rad per ruta (dina siffror,
> facits siffror, skillnad) och ett omdöme per ruta: `stämmer` (högst en
> rad skiljer), `avviker` (två eller fler). Avsluta med vilka rutor som
> avviker och vad som är fel i dem. Skapa `KLAR-2` i `v2/` när du är
> klar.

Avviker **mer än 2 av 8** rutor: facit är underkänt — kör om de berörda
delarna av steg 1 (högst en gång), sedan kontrollen igen. Avviker det
fortfarande: stanna, skriv det i resultatfilen, committa, notis. Bygg
inte vidare på ett facit som inte klarar kontrollen.

## 3 · Jämförelsen — skript, orkestreraren

Slå ihop `tabell-*.tsv` till `v2/tabell.tsv` (sorterad på ruta). Skriv
ett litet skript i `v2/jamfor.cjs` (det är mätverktyg, inte appkod) som
ur `tabell.tsv` räknar per ruta:

| Kolumn | Ur |
|---|---|
| `fys_kort` | antal kortrader (ej graveyard/digitalt/hand) |
| `fys_tappade` | rader med `lage` = `tappad` |
| `fys_hogar` | antal olika bokstäver i `hog` |
| `dig_kort`, `dig_tappade`, `granskning`, `cantsee`, `graveyard`, `library` | digitalt-raden |
| `diff_kort` | `dig_kort − fys_kort` |
| `diff_tappade` | `dig_tappade − fys_tappade` |
| `hand` | hand-raden |

och skriver `v2/jamforelse.tsv` plus en sammanfattning i
`v2/jamforelse.md`: median och värsta värde för `diff_kort` och
`diff_tappade`, andel rutor med `granskning > 0`, andel rutor med
`cantsee > 0`, och hur `library` sjunker mot hur `fys_kort + graveyard`
stiger (kort som spelades ut mot kort som syns). Det är **siffrorna**.
Ingen agent behövs.

## 4 · Förklaringen — en agent, `general-purpose`, `model: opus`

> Arbetskatalog `/Users/jesperfunk/Code/magic`. Rör inte git. Ändra ingen
> kod. Skapa inga issues.
>
> Underlag, i den här ordningen: `v2/jamforelse.md` och
> `v2/jamforelse.tsv` (siffrorna — de är sanningen i det här arbetet),
> `v2/tabell.tsv` (facit), rutorna i `…/rutor/`, och **sist** rapporten
> `dev/latens/latens-2026-09-21-mes-238-4k15-20min-varme.json` (läs
> `dev/latens/LÄS-MIG.md`; `node dev/latens/analys.cjs <fil>`). Klockan:
> menyradens minut byter vid ruta 286, 346, 406, 466, 526.
>
> Svara på fyra frågor, med rutnummer som bevis för varje påstående:
> (1) **Tappningar**: hur många rutor har tappade kort på mattan, och hur
> många av dem speglas? Var i `index.html` (`Kamera`, `matcha`,
> tap-läget) tas beslutet, och vad i rapporten säger varför det inte
> nådde bordet? (2) **Antal**: när `diff_kort` är som störst, vilka kort
> saknas eller är extra på det digitala bordet, och varför (borta-dom,
> granskningsraden, kort under kort)? (3) **Granskningen**: varför blir
> raden "N cards to fill in" aldrig tom — vad hamnar där, och vad hade
> krävts för att det inte skulle hamna där? (4) **Ordningen**: ligger
> korten på det digitala bordet där de ligger på mattan? Om inte, var
> bestäms positionen.
>
> Ta sedan ställning till nattpassets utkast `dev/plan/spegeln-utkast.md`
> (regler R1–R6): vilka av dem håller mot v2-siffrorna, vilka byggde på
> fel facit, och vad som saknas i dem (tappningar är inte med alls).
>
> Skriv `dev/plan/spegeln-utkast-v2.md` för en icke-expert: rubriker,
> tabeller, vad före hur, avsnitt för avsnitt medan du jobbar. Markera
> allt som kräver ett beslut av Jesper med **BESLUT**. Avsluta med en
> lista över vad som kan bli issues (titel + en rad), utan att skapa dem.
> Skapa `KLAR-4` i `v2/` när du är klar.

## När allt är klart

Skriv om `dev/plan/spegeln-natt-resultat.md`: överst ett avsnitt "v1
underkänt" (varför, i tre rader), sedan v2: vad som kördes, tid per steg,
kontrollens utfall (hur många av 8 stämde), var filerna ligger, vad som
saknas, och de tre viktigaste siffrorna ur `jamforelse.md`. Committa
`v2/`, `dev/plan/spegeln-utkast-v2.md` och resultatfilen som **en ny
commit på `natt-2026-09-22`** (grenen finns; committa via ett tillfälligt
worktree så att arbetsträdet står kvar på main; **pusha inte**). Skicka
sedan notisen (`PushNotification`, en rad) och lämna sessionen i vila.

## Om något stannar

- Kontrollen underkänner facit två gånger: stanna, skriv, committa, notis.
- En agent i steg 1 dör: samma prompt igen tar vid (en gång).
- Tiden (2 h) tar slut: committa det som finns, med luckorna namngivna.

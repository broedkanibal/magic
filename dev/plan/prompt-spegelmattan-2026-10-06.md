# Prompt: spegelmattan — uppspelaren, bordets minne och resten

Besluten är Jespers från 2026-10-02 och 2026-10-06 och står i
[`spegelmattan-principer.md`](spegelmattan-principer.md). Designytans sida 3
"Lugn matta" i [Mesa Mirror Animations](https://claude.ai/artifact/EbDpd4ggjnb7cp7j3KuEhY)
är godkänd 2026-10-06 och är byggunderlaget, med tiderna i
`design_handoff_animeringar/TIDSLINJER-E.md` och prototypens källa i
`design_handoff_animeringar/src3/`. Regelboken för flera sessioner är
[`orkestrering.md`](orkestrering.md).

## Vad Jesper har godkänt (2026-10-06)

| Fråga | Svar |
|---|---|
| Committa och pusha till main utan att fråga, inom spegelmattans issues (MES-333, 338, 341, 342, 343, 344, 336) | **ja**, när `dev/kolla.sh` är grön, de riktade bänkproven går (`dev/mattan.cjs`, `dev/avstamning.cjs`, `dev/dubbletter.cjs --fall 07`, spegelfacit), uppspelarens mått inte är sämre på någon rad, och — bara om telefonens kod ändrats — golden inte är sämre med 0 fel namn |
| Flytta issues till Done själv | **ja**, när kriterierna är uppfyllda och arbetet är på main |
| Golden med Claude (`--ai`) | högst tre körningar per issue, som förut |

Main driftsätts till produktion vid push. Sessionen stannar alltid vid: systemprompten i `api/identify.js`, allt som kräver telefonen eller en inspelning, ett designval som inte står i principfilen eller på sida 3, och ett enda fel namn i golden.

## Kön

Beroendeordning. Numren i tabellen är ordningen en ensam session tar dem i; kolumnen längst till höger säger vad en orkestrerare får köra samtidigt.

| Steg | Issue | Agent, modell, effort | Kodområde | Parallellt med |
|---|---|---|---|---|
| 1 | **MES-333** uppspelaren och baslinjen | vanlig session eller `mesa-bygg`, **Opus 5.5 high** | bara `dev/` (ny `dev/uppspelaren/`, bygger på `dev/mattan.cjs`) | ingenting — alla andra mäts i den |
| 2 | **MES-341** bordets minne, handzonen, flytt utan att vänta på namnet | `mesa-bygg-tung`, **Fable 5.1 xhigh** | `avstamBord` steg 1–5, `kamLage`, `tvivelSteg`, `ledigt`, `binder` | 3, 4 |
| 3 | **MES-338** zoomstegen | `mesa-bygg`, **Opus 5.5 high** | `matVy`, `matSkriv`, `grown`, `fitZoom`, `clampPan` | 2, 4 |
| 4 | **MES-342** positionerna: perspektiv, dödzonen mätt, inga falska omlott | `mesa-bygg`, **Opus 5.5 high** | `kamTillMatta`, `kamSkala`, `speglaKamPos`, `clampKort` | 2, 3 |
| 5 | **MES-343** till handen med ändra, nedtoningen bort | `mesa-bygg-tung`, **Fable 5.1 xhigh**, helst samma agent som 2 | borttagningsdelen av `avstamBord`, `renderLyftBanner`, `kortChip`, raden (ny) | efter 2; 6 får inte köras samtidigt |
| 6 | **MES-344** framkallningen, utspelets rörelse, kort utan namn | `mesa-bygg`, **Opus 5.5 xhigh** | `avstamBord` steg 4–5, `autoPlatser`/`platsHtml`, `matSynk`, synken (MES-305) | efter 5 |
| 7 | **MES-336** graveyard minns kort utan namn | designyta först, sedan `mesa-bygg`, Opus 5.5 high | graveyard-vyn | efter 6 |

Varför Fable på 2 och 5: det är i avstämningens bindningar ett spår kan få fel kort, och arbetet är många mätslingor mot uppspelaren och spegelfacit. Varför Opus på resten: ritning, geometri och verktyg, där bänkproven ger svaret i sekunder.

**Golden** behövs bara om telefonens kod ändras (mätbudgeten i `orkestrering.md`). Allt i kön är datorsidan utom möjligen telefonens flaggor i MES-341. Spegelfacit och uppspelaren är måtten.

**Krock att hålla koll på:** MES-334 står i Redo att testas och kan få rättelser efter Jespers prov. Rättelserna rör samma kod som steg 1–3. Kolla `ListAgents` och In Progress innan ett steg börjar, och säg till i chatten om MES-334 är igång.

## Två sätt att köra

| | A · En issue i taget | B · Orkestrerare |
|---|---|---|
| Hur | `/nästa` i en ny session per issue, i kön ovan | En orkestrerande session kör steg 1 själv, delar sedan ut 2, 3 och 4 till agenter i egna worktrees, slår ihop efter bänk och fristående granskning, och kör 5 → 6 i tur |
| Modell | per rad i tabellen | **Opus 5.5 xhigh** för orkestreraren (effort ärvs av agenterna); agenterna enligt tabellen |
| Tid | längre, en i taget | kortare: 2, 3 och 4 går samtidigt |
| Risk | låg | ihopslagningar i `index.html`; lärdomarna från 2026-09-25 och 09-28 gäller (granska före merge och efter varje rättelse, granska det sammanslagna läget, en golden åt gången) |

**Rekommendation:** steg 1 som A, i en egen session (en issue, och den avgör måtten). Steg 2–4 som B om du är borta några timmar, annars A. Steg 5–7 som A, eftersom de är i rad ändå.

---

## Del 1 · MES-333 uppspelaren (klistra in i en ny session, Opus 5.5 high)

> Bygg uppspelaren i MES-333 och mät baslinjen. Läs först `dev/plan/spegelmattan-principer.md` (avsnittet *Läget 2026-10-06* och *Grunden som måste byggas först*), `dev/plan/prompt-spegelmattan-2026-10-06.md`, issuen med kommentarer, `dev/mattan.cjs`, `dev/spegelfacit/LÄS-MIG.md` och minnena `spegelfacit-matt`, `kamerans-datorsida-provas-utan-telefon`, `golden-egen-port` och `kontroller-som-ljuger`.
>
> Kör `agent.kontrolleraInnanStart` och `agent.paborjaIssue` (`dev/linear-agent/klient.cjs`). Jobba i en egen worktree med `.env.local` och `dev/material` symlänkade. Ingen kod i `index.html`: uppspelaren bor i `dev/uppspelaren/` och läser appen som `dev/mattan.cjs` gör. Materialet är partiet 2026-09-21 (video i `dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/`, v2-facit i `dev/golden/inspelningar/2026-09-21-parti/v2/`, bordsloggen från spegelfacit) och golden-videorna 07 och 09–12.
>
> Klart när: partiet sek 240–540 spelas upp med videon bredvid mattan, ritad av appens riktiga kod, med paus, spola och steg; måtten i issuen räknas och sparas som baslinje för main (`dev/uppspelaren/baslinje/`), och samma körning går att göra om på en annan `index.html` (`--fil`) och jämföras rad för rad. Varje tal ska ha kontrollräknats för hand mot minst en ruta i videon innan det kallas mätt.
>
> Jesper har godkänt att du committar och pushar till main utan att fråga när `dev/kolla.sh` är grön och uppspelaren går mot main. Kör golden bara om du ändrat telefonens kod (det ska du inte). Kommentera issuen med måtten, för en icke-expert, och sätt den till Done när allt är på main. Stanna och använd `markeraBehoverJesper` om något kräver telefonen eller ett beslut som inte står i principfilen.

## Del 2 · Orkestreraren för steg 2–4 (klistra in i en ny session, Opus 5.5 xhigh)

> Du orkestrerar spegelmattans steg 2–4 enligt `dev/plan/prompt-spegelmattan-2026-10-06.md` och regelboken `dev/plan/orkestrering.md`. Läs först `dev/plan/spegelmattan-principer.md`, de tre issuerna med kommentarer (MES-341, MES-338, MES-342), `design_handoff_animeringar/TIDSLINJER-E.md` och minnena `spegelmattan-principer`, `orkestrering-lardomar-2026-09-25`, `flera-sessioner-samma-arbetstrad` och `kontroller-som-ljuger`.
>
> Kräver att MES-333 är Done och att baslinjen finns i `dev/uppspelaren/baslinje/`. Är den inte det: stanna och säg till. Kolla `ListAgents` och In Progress: är MES-334 igång med rättelser, vänta.
>
> Dela ut MES-341 till `mesa-bygg-tung` (Fable), MES-338 och MES-342 till `mesa-bygg` (Opus), i egna worktrees, med `paborjaIssue` på varje. Agenterna slår inte ihop och pushar inte. Du slår ihop en gren i taget: `git diff --stat origin/main` och `git branch -r --contains` först, bänken (`dev/kolla.sh`), uppspelaren mot baslinjen (inte sämre på någon rad), fristående granskning av diffen OCH av det sammanslagna läget, rättelser granskade igen, sedan push. Jesper har godkänt push till main utan att fråga på de villkoren. Golden bara om telefonens kod ändrats.
>
> När de tre är på main: MES-343 till samma Fable-agent, sedan MES-344 till `mesa-bygg` med xhigh, i tur. Sätt varje issue till Done när den är på main, kommentera med måtten för en icke-expert, och lämna tillbaka issues till Todo om du slutar innan de är klara. Skriv en kort slutrapport i `dev/plan/` med vad som gick in, vad som backades och varför.

## Gemensamt för alla sessioner

- Egen worktree, `.env.local` och `dev/material` symlänkade (minnet `worktree-saknar-env-local`). Golden på egen port, aldrig två samtidigt (`golden-egen-port`).
- Systemprompten i `api/identify.js` rörs aldrig.
- Linear via `dev/linear-agent/klient.cjs`, inte MCP. Kommentarer skrivs för en icke-expert: vad som var fel, vad som mättes, vad som ändrades.
- En issue i In Progress betyder att en session kör den nu. Tar sessionen slut: tillbaka till Todo med en kommentar om grenen.

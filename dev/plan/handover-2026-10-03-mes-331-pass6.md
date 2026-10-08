# Handover: MES-331 pass 5–6, remsorna och "känn igen kortet" — 2026-10-03

## Så här öppnar du
Läs det här dokumentet, verifiera snabbt mot repot (`git log --oneline -12`, worktree-statusen nedan) och fortsätt sedan direkt. Ditt första meddelande ska vara öppningsrepliken längst ned, ordagrant eller mycket nära. Ingen hälsning, ingen sammanfattning, nämn inte det här dokumentet. För Jesper är det samma samtal som fortsätter.

## Var vi står
Allt mätt är på main och pushat (`7491289`). Golden-baslinjen (pool 168, port 8263): 01–18 lokalt hittade 115/119, rätt namn 91/119, **0 fel namn**, 1 falsk (+2 token), utlagda med namn 25/42; med Claude 0 fel. Vanliga bord (01–12) ≈ 99 % namn men 0,45–0,65 s till namn — målet är 100 % inom 0,3 s. Det som faller: kort i blanka hylsor under lampa (13), 0,5× vidvinkel (18), högar (14–16), främmande bord (17). MES-331 står i In Progress (agenten tog den) med kommentarer för pass 5, 5b och 6 — Jesper har inte gjort telefonproven.

## Osäkert läge
- **Worktree `.claude/worktrees/agent-a0949b6b7737db05c` har OCOMMITTADE ändringar** (index.html, kor.cjs, kor.html, kamerabank.cjs): steg 3 av minnet ("minnet följer spåret som fick sitt namn ur det, så att `sedd` förnyas medan kortet ligger täckt") — halvbyggt, omätt. Fable-agenten dog på slut på Fable-krediter mitt i. Rör inte main med det förrän det mätts.
- **Disken: ~2 GB ledigt.** Scratchpaden `1817925a…` (4 GB, okänd session) och `~/Library/Caches` (11 GB) är Jespers att avgöra. 4K-kodningar äter 0,2–0,5 GB styck.
- Golden-kön: `…/scratchpad/golden-las2.sh` (räknar bara riktiga `^node .*golden/kor.cjs`). v1-skriptet (golden-las.sh) låser sig — använd inte. Scratchpaden kan vara borta efter omstart; mönstret står i minnet `mes-331-pass5-remsgrans-klunga.md`.

## Beslut
- **Remsans gräns 0,15 → 0,20** (Jesper) — golden 18 gav Pharika's Chosen säkert Plains på 0,154; saknat namn är en rest, säkert fel är ett fel.
- **0,5× ska alltid gå att välja** (Jesper) — aldrig "använd 1×" som lösning.
- **Golden 13 och 18 i 1920×1080/1500 kbit/s** (Jesper för 18, samma val för 13) — båda var 4K-källor nerskalade till 1080×608; telefonen ger 1080p.
- **Måtten i tre nivåer** (Jesper): krav fel namn = 0 · 1 hittade · 2 rätt namn · 3 utlagda med namn (hette "spelade") · resten felsökning; alltid för hela 01–18. Står i `dev/golden/SNABBGUIDE.md`.
- **Tjockleksfiltret 0,5 → 0,7** (detector.js para) — modellen såg remsorna på tappade kort (poäng ~0,88), filtret kastade dem (sned remsa i rak låda blir 0,50–0,69).
- **Klunga-svar från Claude ger inget säkert namn** (svarAI) — alla vittnen i 05 pekade på grannen, så vittneskrav räckte inte.
- **"Känn igen kortet" (`remsMinne`, T.remsaMinne)** — kortets egen tidigare remsa, villkor: plats ≤ 0,5 remslängd, sedd inom 20 s, minnets spår lever inte, bara täckta spår, hel+titel samma namn, marginal > 0,10. Bänk: täckta 13b 0 → 49/52, MES-246 4 → 222/357, 0 fel. Golden lokalt LIKA BRA (på 0,5× får översta korten inget lokalt namn → inget att lära), 18 med Claude 3 → 4/10.

## Förkastat
- **4K** — inget över 1920 vid samma bitrate (komprimeringen avgör); 13 i 4K gav ett säkert fel namn och 2 falska.
- **Landtyp ur den synliga delen** (`dev/remsa/landtyp.py`) — slår inte remsan vid 960; ramfärg som vittne ger inget.
- **Upprätning av sneda remsor för alla** — kostar på raka; för tappade små vinster.
- **Ljusnormalisering (CLAHE, gråvärld), CSLS-navstraff, bara lekens namn** — små eller negativa effekter.
- **Övermålning av kortet ovanpå + medel över utsnitt** — gav säkra fel.
- **Lekfotot som referens** (`lekfoto_ref.py`) — rätt överst 13b täckta 6 → 32/52 men marginaler < 0,10: hylsade remsor ser lika ut för modellen. Duger som ledtråd, inte som säkert svar.
- **Lärda remsor av samma NAMN från andra kort** — Thriving Moor ↔ Swamp/Plains förväxlas; bara samma kort (plats + tid) håller.
- **Mer träning av detektorn för högar** — det var filter, inte modellen (remsfall.py visar steg för steg).

## Öppna frågor
- **Steg 3 av minnet** — klart att mäta: golden 01–18 lokalt, `--tro "remsaMinne:0"` = baslinjen, `--ai` på 18 (högst två). Förväntan: 18:s omfödda Swamp (85–96 s) behåller namnet.
- **Kort som är täckta redan första gången de syns** — bara finjustering av bildmodellen på hylsade remsor (väg B, MES-328 lämnade den öppen) löser det. Kräver Jespers ja till GPU och träningsdata (`-traning-`-mapp; prov ≠ träning, `delning.py`).
- **0,5×** — Claude får ~180×250 px per kort (namnrad 6–8 px). Idé omätt: ett skarpt stillbildsfoto (högre upplösning) av det osäkra kortet till Claude.
- **Tiden 0,3 s** — inte rörd i dag; namn kommer 0,45–0,65 s efter landning på vanliga bord.
- **17 (vitt bord i mörker)** — detektorn ser ingen remsa på 16 kort; träning med liknande bord.

## Nästa steg
1. Jesper ska välja (frågat, obesvarat): göra klart steg 3 av minnet med Opus, eller förbereda träning (B).
2. Steg 3: mät koden i agentens worktree enligt ovan; committa och slå ihop bara om grinden håller.
3. Ta bort worktree `agent-a0949b6b7737db05c` när steg 3 är avgjort.

## Kodpekare
- `index.html` — `remsMinnesDom`, `kamRemsVektor`, `kamLasRemsa` (minnet + gränsen 0,20), `Kamera` remsMinne/fangaMinne/kanLarasSkal/minnenFor, `svarAI` (klunga), `kamFragaAI` (info.okanda).
- `dev/detektor/modell/detektor.js` `para` — tjockMax 0,7.
- `dev/detektor/tran/remsfall.py` — varje kort genom detektorns steg (modell → tröskel → NMS → tjocklek → parning).
- `dev/remsa/remsexp.py` (bygg/prova, npz gitignorerad ~15 min att bygga), `remsexp_larda.py` (minnesvillkoren), `remsnamn.py` (appens skärning + `rata`), `lekfoto_ref.py`.
- `dev/golden/kor.cjs` — hämtning i bitar, `--stub-kamera`, `--beskarningar` sparar också Claudes bild (`…sparMaiN…`).
- `dev/golden/historik.md` — raderna 2026-10-03 med alla tal.
- `dev/material/golden-13-upplosning/`, `golden-18-upplosning/` — 1920/8000k och 4K för `--video`.

## Arbetssätt
Svenska. Jesper vill ha korta tabeller och rak skillnad mellan mätt och bedömt; varje steg mätt före/efter; 0 säkra fel namn är hårt krav. Push till main när grinden klaras. En golden i taget (andra sessioner kör också). Fråga innan GPU-tid, disk-rensning av okända mappar, och ändringar i systemprompten. Linear via `dev/linear-agent/klient.cjs`.

## Öppningsreplik
> Minnet ligger på main; steg 3 — att ett kort som fått namnet ur minnet håller det levande medan det ligger täckt — står halvbyggt i agentens worktree. Ska jag göra klart och mäta det nu, eller börja förbereda träningen av bildmodellen på hylsade remsor?

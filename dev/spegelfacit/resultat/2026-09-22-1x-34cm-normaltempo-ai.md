# Spegelläget mot händelsefacit — 2026-09-22-1x-34cm-normaltempo

Källa: `dev/material/inspelningar/2026-09-22-1x-34cm-normaltempo/spegel-ai.json` (körd 2026-09-23 10:00). Med Claude (claude-opus-5, systemprompt v20, 2 namn via Claude). Poolen: 114 kort. 1081 bord från telefonen, uppspelade genom datorns avstamBord med grundläget 90°, lekens antal ur lek.txt, nåd 600 ms. Fönster: 2 s före till 10 s efter facits tid.

## Per händelsetyp

| Händelse | Rader | Syntes | Rätt kort | Rätt tap-läge | Rätt plats | Fäst digitalt | Median efter facit | Längst |
|---|---|---|---|---|---|---|---|---|
| spelar | 13 | 12/13 | 12/13 | 11/12 | 9/10 | – | +1,94 s | +5,46 s |
| grav_till_bord | 1 | 0/1 | 0/1 | – | – | – | – | – |
| tar_bort | 6 | 5/6 | 4/6 | – | 3/5 | – | +2,80 s | +7,92 s |
| tappar | 13 | 4/13 | 4/13 | 3/4 | 2/4 | – | +2,66 s | +3,29 s |
| otappar | 8 | 5/8 | 4/8 | 5/5 | 2/4 | – | +2,56 s | +5,18 s |
| flyttar | 18 | 9/18 | 9/18 | 8/9 | 3/7 | 0/4 | +3,52 s | +7,92 s |
| drar | 6 | 0/6 | 0/6 | – | – | – | – | – |
| grav_ur_bild | 2 | 0/2 | 0/2 | – | – | – | – | – |
| **på mattan** | 59 | 35/59 | 33/59 | | | | +2,80 s | |

*Syntes*: något på det digitala bordet svarade mot raden i fönstret. *Rätt kort*: på kortet med rätt namn. *Rätt tap-läge*: utspel — kortet ligger som i facit en sekund efter; tap — läget står kvar tre sekunder; flytt — läget är detsamma som före. *Rätt plats*: se huvudet i `jamfor.cjs` (ensamt / hög A / ovanpå-under kortet i `till`; tar_bort till grav = kortet hamnade i graveyard). *Fäst digitalt*: kortets attachedTo pekar på kortet i `till`. Kvoterna räknar bara rader där det går att döma.

## Rader som missades

| Rad | t | Händelse | Kort | Plats / till | Vad det digitala bordet gjorde | Fel |
|---|---|---|---|---|---|---|
| 4 | 30,62 | tappar | Swamp | ensamt (enda Swamp än) | ingen vridning (1 Swamp på bordet, 1 tappade) | syntes inte |
| 7 | 48,42 | drar | – | – | appen räknar inte drag (library = lekens antal − kort ute; 1 kort kom ut i fönstret, på bordet) — telefonen såg inte leken lämna sin ruta | syntes inte |
| 11 | 69,02 | spelar | Swamp | hög A | inget på bordet | syntes inte |
| 12 | 72,76 | tappar | Swamp | hög A (båda korten) | tappat (+3,29 s) — ligger ensamt | fel plats |
| 13 | 72,80 | tappar | Swamp | hög A (båda korten) | ingen vridning (1 Swamp på bordet, 1 tappade) | syntes inte |
| 15 | 82,36 | spelar | Swamp | ensamt till höger om hög A | ny (+3,59 s) | fel plats |
| 17 | 91,84 | drar | – | – | appen räknar inte drag (library = lekens antal − kort ute; 1 kort kom ut i fönstret, på bordet) — telefonen såg inte leken lämna sin ruta | syntes inte |
| 20 | 102,82 | otappar | Swamp | hög A (båda korten) | otappat (+5,18 s) — ligger ensamt | fel plats |
| 23 | 113,62 | flyttar | Mirran Bardiche | ovanpå, till Ukud Cobra | till graveyard +2,78 s, inget kort på nya platsen | syntes inte |
| 24 | 119,04 | flyttar | Mirran Bardiche | ensamt | kortet fanns inte på bordet | syntes inte |
| 25 | 120,78 | flyttar | Ukud Cobra | ovanpå, till Mirran Bardiche | flytt, samma kort (0.17 kortbredder) (+7,92 s) — ligger ensamt | fel plats |
| 26 | 122,14 | flyttar | Ukud Cobra | – | ingen flytt (under 15 % av kortbredden, eller inte sedd) | syntes inte |
| 27 | 122,14 | flyttar | Mirran Bardiche | till Ukud Cobra | kortet fanns inte på bordet | syntes inte |
| 30 | 137,88 | flyttar | Valkyrie's Sword | under, till Pharika's Chosen | kortet fanns inte på bordet | syntes inte |
| 31 | 142,10 | otappar | Swamp | ensam till hlger om hög A | otappat (+1,45 s) — ligger ensamt | fel plats |
| 32 | 143,76 | drar | – | – | appen räknar inte drag (library = lekens antal − kort ute; 1 kort kom ut i fönstret, på bordet) — telefonen såg inte leken lämna sin ruta | syntes inte |
| 34 | 152,28 | tar_bort | Pharika's Chosen | till grav | nedtonat (+7,92 s) — högvakten: ändring +2,67 s | fel plats |
| 36 | 162,88 | flyttar | Valkyrie's Sword | ovanpå, till Trusty Retriever | nedtonat +1,52 s, inget kort på nya platsen | syntes inte |
| 37 | 167,52 | flyttar | Ukud Cobra | – | ingen flytt (under 15 % av kortbredden, eller inte sedd) | syntes inte |
| 38 | 167,52 | flyttar | Mirran Bardiche | under, till Ukud Cobra | kortet fanns inte på bordet | syntes inte |
| 39 | 172,54 | tappar | Swamp | överstsa swampp i hög A | tappat (+3,26 s) — slog tillbaka inom 3 s; ligger ensamt | fel tap-läge, fel plats |
| 40 | 179,44 | drar | – | – | appen räknar inte drag (library = lekens antal − kort ute) — telefonen såg inte leken lämna sin ruta | syntes inte |
| 41 | 183,42 | grav_ur_bild | Pharika's Chosen | – | graveyard: Pharika's Chosen 0 → 0 — högvakten: ändring +2,88 s | syntes inte |
| 42 | 189,40 | grav_ur_bild | Flutterfox | – | graveyard: Flutterfox 1 → 1 — högvakten: ändring +3,65 s | syntes inte |
| 43 | 193,94 | grav_till_bord | Killing Glare | ensamt | inget på bordet | syntes inte |
| 44 | 200,22 | tar_bort | Ukud Cobra | till grav | ligger kvar på bordet (1 synligt med namnet) — högvakten: ändring +3,78 s | syntes inte |
| 45 | 203,40 | otappar | Swamp | översta i hög A | ingen vridning (1 Swamp på bordet, 0 tappade) | syntes inte |
| 46 | 207,02 | flyttar | Swamp | hög A | flytt, samma kort (0.33 kortbredder) (+3,73 s) — ligger ensamt | fel tap-läge, fel plats |
| 47 | 215,18 | tappar | Swamp | hög A (två av tre översta) | ingen vridning (1 Swamp på bordet, 0 tappade) | syntes inte |
| 48 | 215,18 | tappar | Swamp | hög A (två av tre översta) | ingen vridning (1 Swamp på bordet, 0 tappade) | syntes inte |
| 51 | 225,22 | tar_bort | Killing Glare | till grav | nedtonat, sedan till graveyard +2,93 s (högvakten) — fel kort: Ukud Cobra (+2,48 s) — högvakten: ändring +2,93 s | fel kort |
| 52 | 229,60 | tappar | Trusty Retriever | – | ingen vridning (1 Trusty Retriever på bordet, 0 tappade) | syntes inte |
| 53 | 229,60 | tappar | Valkyrie's Sword | fäst ovanpå trusty retriever | kortet fanns inte på bordet | syntes inte |
| 56 | 236,06 | otappar | Swamp | hög A, två överstsa korten | ingen vridning (2 Swamp på bordet, 0 tappade) | syntes inte |
| 57 | 242,42 | drar | – | – | appen räknar inte drag (library = lekens antal − kort ute; 1 kort kom ut i fönstret, på bordet) — telefonen såg inte leken lämna sin ruta | syntes inte |
| 58 | 246,62 | spelar | Scourge of the Undercity | ensamt | ny (+2,38 s) | fel tap-läge |
| 59 | 250,46 | flyttar | Mirran Bardiche | ovanpå, till Scourge of the Undercity | flytt, samma kort (0.4 kortbredder), via nedtoning (+6,79 s) — ligger ensamt | fel plats |
| 60 | 254,40 | flyttar | Scourge of the Undercity | tillsammans med mirran bardiche som är fäst | nedtonat -1,95 s, inget kort på nya platsen | syntes inte |
| 61 | 254,40 | flyttar | Mirran Bardiche | ovanpå, till Scourge of the Undercity | flytt, samma kort (0.36 kortbredder), via nedtoning (+3,15 s) — ligger ensamt | fel plats |
| 62 | 258,74 | tappar | Swamp | hög A (alla tre) | ingen vridning (2 Swamp på bordet, 0 tappade) | syntes inte |
| 63 | 258,74 | tappar | Swamp | hög A (alla tre) | ingen vridning (2 Swamp på bordet, 0 tappade) | syntes inte |
| 64 | 258,74 | tappar | Swamp | hög A (alla tre) | ingen vridning (2 Swamp på bordet, 0 tappade) | syntes inte |
| 66 | 267,76 | tar_bort | Pharika's Chosen | till grav | nedtonat (+1,89 s) — högvakten: ändring +4,34 s | fel plats |
| 67 | 270,92 | drar | – | – | appen räknar inte drag (library = lekens antal − kort ute) — telefonen såg inte leken lämna sin ruta | syntes inte |
| 68 | 273,46 | otappar | Trusty Retriever | tillsammans med valkyrie's sword som är fäst | otappat — fel kort: Ancestral Blade (+3,74 s) — ligger ensamt | fel kort |
| 69 | 273,50 | otappar | Valkyrie's Sword | som är fäst vid trusy retriever | ingen vridning (1 Valkyrie's Sword på bordet, 0 tappade) | syntes inte |

## Alla rader

| Rad | t | Händelse | Kort | Syntes | Efter facit | Vad det digitala bordet gjorde |
|---|---|---|---|---|---|---|
| 3 | 28,08 | spelar | Swamp | ja | +4,92 s | ny |
| 4 | 30,62 | tappar | Swamp | nej | – | ingen vridning (1 Swamp på bordet, 1 tappade) |
| 5 | 35,02 | spelar | Killing Glare | ja | +1,28 s | ny |
| 6 | 43,80 | tar_bort | Killing Glare | ja | +3,00 s | till graveyard (besvärjelseregeln) — högvakten: ingen ändring |
| 7 | 48,42 | drar | – | nej | – | appen räknar inte drag (library = lekens antal − kort ute; 1 kort kom ut i fönstret, på bordet) — telefonen såg inte leken lämna sin ruta |
| 8 | 53,96 | spelar | Flutterfox | ja | +0,64 s | ny |
| 9 | 58,32 | spelar | Pharika's Chosen | ja | +1,23 s | ny |
| 10 | 63,44 | otappar | Swamp | ja | +2,56 s | otappat — ligger ensamt |
| 11 | 69,02 | spelar | Swamp | nej | – | inget på bordet |
| 12 | 72,76 | tappar | Swamp | ja | +3,29 s | tappat — ligger ensamt |
| 13 | 72,80 | tappar | Swamp | nej | – | ingen vridning (1 Swamp på bordet, 1 tappade) |
| 14 | 77,78 | flyttar | Pharika's Chosen | ja | +2,77 s | flytt, samma kort (0.49 kortbredder) — ligger ensamt |
| 15 | 82,36 | spelar | Swamp | ja | +3,59 s | ny |
| 16 | 87,74 | spelar | Ukud Cobra | ja | +2,86 s | ny |
| 17 | 91,84 | drar | – | nej | – | appen räknar inte drag (library = lekens antal − kort ute; 1 kort kom ut i fönstret, på bordet) — telefonen såg inte leken lämna sin ruta |
| 18 | 95,30 | tar_bort | Flutterfox | ja | +2,80 s | nedtonat, sedan till graveyard +3,10 s (högvakten) — högvakten: ändring +3,10 s |
| 19 | 99,50 | flyttar | Ukud Cobra | ja | +2,20 s | flytt, samma kort (1.65 kortbredder) — ligger ensamt |
| 20 | 102,82 | otappar | Swamp | ja | +5,18 s | otappat — ligger ensamt |
| 21 | 105,04 | tappar | Swamp | ja | +2,06 s | tappat — ligger ensamt |
| 22 | 109,50 | spelar | Mirran Bardiche | ja | +1,50 s | ny |
| 23 | 113,62 | flyttar | Mirran Bardiche | nej | – | till graveyard +2,78 s, inget kort på nya platsen |
| 24 | 119,04 | flyttar | Mirran Bardiche | nej | – | kortet fanns inte på bordet |
| 25 | 120,78 | flyttar | Ukud Cobra | ja | +7,92 s | flytt, samma kort (0.17 kortbredder) — ligger ensamt |
| 26 | 122,14 | flyttar | Ukud Cobra | nej | – | ingen flytt (under 15 % av kortbredden, eller inte sedd) |
| 27 | 122,14 | flyttar | Mirran Bardiche | nej | – | kortet fanns inte på bordet |
| 28 | 128,00 | spelar | Valkyrie's Sword | ja | +1,15 s | ny |
| 29 | 131,52 | flyttar | Valkyrie's Sword | ja | +7,53 s | flytt, samma kort (2.75 kortbredder), via nedtoning — ligger ihop med Pharika's Chosen |
| 30 | 137,88 | flyttar | Valkyrie's Sword | nej | – | kortet fanns inte på bordet |
| 31 | 142,10 | otappar | Swamp | ja | +1,45 s | otappat — ligger ensamt |
| 32 | 143,76 | drar | – | nej | – | appen räknar inte drag (library = lekens antal − kort ute; 1 kort kom ut i fönstret, på bordet) — telefonen såg inte leken lämna sin ruta |
| 33 | 148,52 | spelar | Trusty Retriever | ja | +0,73 s | ny |
| 34 | 152,28 | tar_bort | Pharika's Chosen | ja | +7,92 s | nedtonat — högvakten: ändring +2,67 s |
| 35 | 157,58 | flyttar | Valkyrie's Sword | ja | +3,52 s | flytt, samma kort (4.27 kortbredder), via nedtoning — ligger ensamt |
| 36 | 162,88 | flyttar | Valkyrie's Sword | nej | – | nedtonat +1,52 s, inget kort på nya platsen |
| 37 | 167,52 | flyttar | Ukud Cobra | nej | – | ingen flytt (under 15 % av kortbredden, eller inte sedd) |
| 38 | 167,52 | flyttar | Mirran Bardiche | nej | – | kortet fanns inte på bordet |
| 39 | 172,54 | tappar | Swamp | ja | +3,26 s | tappat — slog tillbaka inom 3 s; ligger ensamt |
| 40 | 179,44 | drar | – | nej | – | appen räknar inte drag (library = lekens antal − kort ute) — telefonen såg inte leken lämna sin ruta |
| 41 | 183,42 | grav_ur_bild | Pharika's Chosen | nej | – | graveyard: Pharika's Chosen 0 → 0 — högvakten: ändring +2,88 s |
| 42 | 189,40 | grav_ur_bild | Flutterfox | nej | – | graveyard: Flutterfox 1 → 1 — högvakten: ändring +3,65 s |
| 43 | 193,94 | grav_till_bord | Killing Glare | nej | – | inget på bordet |
| 44 | 200,22 | tar_bort | Ukud Cobra | nej | – | ligger kvar på bordet (1 synligt med namnet) — högvakten: ändring +3,78 s |
| 45 | 203,40 | otappar | Swamp | nej | – | ingen vridning (1 Swamp på bordet, 0 tappade) |
| 46 | 207,02 | flyttar | Swamp | ja | +3,73 s | flytt, samma kort (0.33 kortbredder) — ligger ensamt |
| 47 | 215,18 | tappar | Swamp | nej | – | ingen vridning (1 Swamp på bordet, 0 tappade) |
| 48 | 215,18 | tappar | Swamp | nej | – | ingen vridning (1 Swamp på bordet, 0 tappade) |
| 49 | 217,24 | spelar | Pharika's Chosen | ja | +2,96 s | tillbaka |
| 50 | 221,48 | tappar | Pharika's Chosen | ja | +2,02 s | tappat — ligger ensamt |
| 51 | 225,22 | tar_bort | Killing Glare | fel kort | +2,48 s | nedtonat, sedan till graveyard +2,93 s (högvakten) — fel kort: Ukud Cobra — högvakten: ändring +2,93 s |
| 52 | 229,60 | tappar | Trusty Retriever | nej | – | ingen vridning (1 Trusty Retriever på bordet, 0 tappade) |
| 53 | 229,60 | tappar | Valkyrie's Sword | nej | – | kortet fanns inte på bordet |
| 54 | 233,14 | flyttar | Mirran Bardiche | ja | +2,36 s | flytt, samma kort (0.76 kortbredder) — ligger ensamt |
| 55 | 236,06 | otappar | Swamp | ja | +0,34 s | otappat — ligger ihop med Swamp |
| 56 | 236,06 | otappar | Swamp | nej | – | ingen vridning (2 Swamp på bordet, 0 tappade) |
| 57 | 242,42 | drar | – | nej | – | appen räknar inte drag (library = lekens antal − kort ute; 1 kort kom ut i fönstret, på bordet) — telefonen såg inte leken lämna sin ruta |
| 58 | 246,62 | spelar | Scourge of the Undercity | ja | +2,38 s | ny |
| 59 | 250,46 | flyttar | Mirran Bardiche | ja | +6,79 s | flytt, samma kort (0.4 kortbredder), via nedtoning — ligger ensamt |
| 60 | 254,40 | flyttar | Scourge of the Undercity | nej | – | nedtonat -1,95 s, inget kort på nya platsen |
| 61 | 254,40 | flyttar | Mirran Bardiche | ja | +3,15 s | flytt, samma kort (0.36 kortbredder), via nedtoning — ligger ensamt |
| 62 | 258,74 | tappar | Swamp | nej | – | ingen vridning (2 Swamp på bordet, 0 tappade) |
| 63 | 258,74 | tappar | Swamp | nej | – | ingen vridning (2 Swamp på bordet, 0 tappade) |
| 64 | 258,74 | tappar | Swamp | nej | – | ingen vridning (2 Swamp på bordet, 0 tappade) |
| 65 | 263,34 | spelar | Ancestral Blade | ja | +5,46 s | ny |
| 66 | 267,76 | tar_bort | Pharika's Chosen | ja | +1,89 s | nedtonat — högvakten: ändring +4,34 s |
| 67 | 270,92 | drar | – | nej | – | appen räknar inte drag (library = lekens antal − kort ute) — telefonen såg inte leken lämna sin ruta |
| 68 | 273,46 | otappar | Trusty Retriever | fel kort | +3,74 s | otappat — fel kort: Ancestral Blade — ligger ensamt |
| 69 | 273,50 | otappar | Valkyrie's Sword | nej | – | ingen vridning (1 Valkyrie's Sword på bordet, 0 tappade) |

## Det digitala bordet gjorde utöver facit

- **flyttat** (25): 39,5 s Killing Glare 0.18 kb · 67,7 s Swamp 0.39 kb · 76,0 s Swamp 0.18 kb · 108,0 s Swamp 0.21 kb · 134,1 s Swamp 0.21 kb · 142,3 s Swamp 0.16 kb · 146,1 s Swamp 0.31 kb · 153,0 s Pharika's Chosen 0.32 kb · 165,2 s Swamp 0.33 kb · 172,7 s Swamp 0.6 kb · 197,3 s Ukud Cobra 0.36 kb · 202,8 s Mirran Bardiche 2.37 kb · 217,8 s Trusty Retriever 0.18 kb · 220,2 s Pharika's Chosen 4.17 kb · 221,7 s Swamp 0.2 kb · 226,1 s Mirran Bardiche 0.25 kb · 226,3 s Mirran Bardiche 0.38 kb · 236,4 s Swamp 2.98 kb · 240,8 s Mirran Bardiche 0.22 kb · 246,3 s Swamp 0.22 kb · 252,0 s Swamp 0.16 kb · 274,4 s Mirran Bardiche 0.21 kb · 278,3 s Valkyrie's Sword 1.17 kb · 278,4 s Scourge of the Undercity 0.7 kb · 288,0 s Scourge of the Undercity 1.06 kb
- **nedtonat** (10): 135,0 s Valkyrie's Sword · 160,2 s Valkyrie's Sword · 211,8 s Swamp · 219,0 s Swamp · 222,9 s Pharika's Chosen · 255,0 s Mirran Bardiche · 269,6 s Swamp · 275,4 s Trusty Retriever · 276,9 s Mirran Bardiche · 286,6 s Swamp
- **fråga** (3): 139,3 s Plains · 171,8 s Ukud Cobra · 235,9 s Plains
- **tappat** (5): 165,2 s Swamp · 184,9 s Swamp · 210,8 s Swamp · 273,6 s Swamp · 276,9 s Ancestral Blade
- **otappat** (4): 172,7 s Swamp · 178,3 s Swamp · 191,6 s Swamp · 278,4 s Scourge of the Undercity
- **ut ur graveyard** (1): 202,8 s Mirran Bardiche

## Slutbordet

Vid facits slut, 284,5 s:

| Kort | Facit (tappade) | Digitalt (tappade) |
|---|---|---|
| Ancestral Blade | 1 (0) | 1 (0) |
| Mirran Bardiche | 1 (0) | 0 ← |
| Scourge of the Undercity | 1 (0) | 1 (0) |
| Swamp | 3 (3) | 1 (1) ← |
| Trusty Retriever | 1 (0) | 0 ← |
| Valkyrie's Sword | 1 (0) | 1 (0) |

Graveyard digitalt: Killing Glare, Flutterfox, Ukud Cobra. Nedtonade (frågan): Pharika's Chosen, Swamp, Mirran Bardiche, Trusty Retriever. Frågor i granskningen: 1.

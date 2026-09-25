# Spegelläget mot händelsefacit — 2026-09-22-1x-34cm-normaltempo

**Efter MES-291** (samma som i [AI-rapporten](2026-09-22-1x-34cm-normaltempo-ai-mes291.md)), jämfört med main före (22644e3): på mattan 20/59 → 20/59. Flyttar 2 → 3/18: rad 59 är nu Mirran Bardiche som flyttar i stället för nedtonad. Rad 18, 51 och 66 går till graveyard direkt när högen växer i stället för att först tonas ned. Nedtoningar i hela passet 16 → 9, varav utan facitrad 9 → 6; nedtonade kort på bordet i medel 1,97 → 1,77 (varje sekund), som mest 7 → 6. `diff_kort` medel |diff| 0,71 → 0,68. **Sämre:** rad 34 (Pharika's Chosen till graveyard; högen ändrades 4,8 s innan telefonen släppte spåret, så ändringen kan inte ges kortet) tonas ned +7,92 → +12,27 s och faller ur fönstret: tar_bort 5/6 → 4/6. Rad 65 (Ancestral Blade) räknas som fel plats för att Mirran Bardiche nu ligger synlig bredvid i stället för nedtonad.


Källa: `dev/material/inspelningar/2026-09-22-1x-34cm-normaltempo/spegel-lokal.json` (körd 2026-09-23 09:55). Utan Claude — bara telefonens egen igenkänning. Poolen: 114 kort. 1012 bord från telefonen, uppspelade genom datorns avstamBord med grundläget 90°, lekens antal ur lek.txt, nåd 5000 ms. Fönster: 2 s före till 10 s efter facits tid.

## Per händelsetyp

| Händelse | Rader | Syntes | Rätt kort | Rätt tap-läge | Rätt plats | Fäst digitalt | Median efter facit | Längst |
|---|---|---|---|---|---|---|---|---|
| spelar | 13 | 9/13 | 9/13 | 9/9 | 5/7 | – | +2,01 s | +2,81 s |
| grav_till_bord | 1 | 1/1 | 1/1 | 1/1 | 0/1 | – | +3,16 s | +3,16 s |
| tar_bort | 6 | 4/6 | 4/6 | – | 4/4 | – | +3,03 s | +4,34 s |
| tappar | 13 | 2/13 | 2/13 | 2/2 | 2/2 | – | +2,79 s | +3,56 s |
| otappar | 8 | 1/8 | 1/8 | 1/1 | 1/1 | – | -1,95 s | -1,95 s |
| flyttar | 18 | 3/18 | 3/18 | 3/3 | 1/2 | 0/1 | +3,71 s | +6,64 s |
| drar | 6 | 0/6 | 0/6 | – | – | – | – | – |
| grav_ur_bild | 2 | 0/2 | 0/2 | – | – | – | – | – |
| **på mattan** | 59 | 20/59 | 20/59 | | | | +2,58 s | |

*Syntes*: något på det digitala bordet svarade mot raden i fönstret. *Rätt kort*: på kortet med rätt namn. *Rätt tap-läge*: utspel — kortet ligger som i facit en sekund efter; tap — läget står kvar tre sekunder; flytt — läget är detsamma som före. *Rätt plats*: se huvudet i `jamfor.cjs` (ensamt / hög A / ovanpå-under kortet i `till`; tar_bort till grav = kortet hamnade i graveyard). *Fäst digitalt*: kortets attachedTo pekar på kortet i `till`. Kvoterna räknar bara rader där det går att döma.

## Rader som missades

| Rad | t | Händelse | Kort | Plats / till | Vad det digitala bordet gjorde | Fel |
|---|---|---|---|---|---|---|
| 3 | 28,08 | spelar | Swamp | ensamt | bara en fråga i granskningen (Swamp) | syntes inte |
| 4 | 30,62 | tappar | Swamp | ensamt (enda Swamp än) | kortet fanns inte på bordet | syntes inte |
| 7 | 48,42 | drar | – | – | appen räknar inte drag (library = lekens antal − kort ute; 2 kort kom ut i fönstret, på bordet) — telefonen såg inte leken lämna sin ruta | syntes inte |
| 10 | 63,44 | otappar | Swamp | ensamt | ingen vridning (1 Swamp på bordet, 1 tappade) | syntes inte |
| 11 | 69,02 | spelar | Swamp | hög A | inget på bordet | syntes inte |
| 12 | 72,76 | tappar | Swamp | hög A (båda korten) | ingen vridning (1 Swamp på bordet, 1 tappade) | syntes inte |
| 13 | 72,80 | tappar | Swamp | hög A (båda korten) | ingen vridning (1 Swamp på bordet, 1 tappade) | syntes inte |
| 15 | 82,36 | spelar | Swamp | ensamt till höger om hög A | ny (+2,09 s) | fel plats |
| 16 | 87,74 | spelar | Ukud Cobra | ensamt | bara en fråga i granskningen (Pharika's Chosen) | syntes inte |
| 17 | 91,84 | drar | – | – | appen räknar inte drag (library = lekens antal − kort ute; 1 kort kom ut i fönstret, på bordet) — telefonen såg inte leken lämna sin ruta | syntes inte |
| 19 | 99,50 | flyttar | Ukud Cobra | – | nytt kort +2,65 s, det gamla ligger kvar | syntes inte |
| 20 | 102,82 | otappar | Swamp | hög A (båda korten) | ingen vridning (3 Swamp på bordet, 3 tappade) | syntes inte |
| 21 | 105,04 | tappar | Swamp | ensamt, till höger | ingen vridning (3 Swamp på bordet, 3 tappade) | syntes inte |
| 23 | 113,62 | flyttar | Mirran Bardiche | ovanpå, till Ukud Cobra | nedtonat +7,13 s, inget kort på nya platsen | syntes inte |
| 24 | 119,04 | flyttar | Mirran Bardiche | ensamt | ingen flytt (under 15 % av kortbredden, eller inte sedd) | syntes inte |
| 25 | 120,78 | flyttar | Ukud Cobra | ovanpå, till Mirran Bardiche | ingen flytt (under 15 % av kortbredden, eller inte sedd) | syntes inte |
| 26 | 122,14 | flyttar | Ukud Cobra | – | ingen flytt (under 15 % av kortbredden, eller inte sedd) | syntes inte |
| 27 | 122,14 | flyttar | Mirran Bardiche | till Ukud Cobra | kortet fanns inte på bordet | syntes inte |
| 28 | 128,00 | spelar | Valkyrie's Sword | ensamt | inget på bordet | syntes inte |
| 29 | 131,52 | flyttar | Valkyrie's Sword | ovanpå, till Pharika's Chosen | kortet fanns inte på bordet | syntes inte |
| 30 | 137,88 | flyttar | Valkyrie's Sword | under, till Pharika's Chosen | kortet fanns inte på bordet | syntes inte |
| 31 | 142,10 | otappar | Swamp | ensam till hlger om hög A | ingen vridning (3 Swamp på bordet, 2 tappade) | syntes inte |
| 32 | 143,76 | drar | – | – | appen räknar inte drag (library = lekens antal − kort ute; 1 kort kom ut i fönstret, på bordet) — telefonen såg inte leken lämna sin ruta | syntes inte |
| 34 | 152,28 | tar_bort | Pharika's Chosen | till grav | ligger kvar på bordet (1 synligt med namnet) — högvakten: ändring +2,67 s | syntes inte |
| 35 | 157,58 | flyttar | Valkyrie's Sword | ensamt | kortet fanns inte på bordet | syntes inte |
| 36 | 162,88 | flyttar | Valkyrie's Sword | ovanpå, till Trusty Retriever | kortet fanns inte på bordet | syntes inte |
| 37 | 167,52 | flyttar | Ukud Cobra | – | ingen flytt (under 15 % av kortbredden, eller inte sedd) | syntes inte |
| 38 | 167,52 | flyttar | Mirran Bardiche | under, till Ukud Cobra | kortet fanns inte på bordet | syntes inte |
| 40 | 179,44 | drar | – | – | appen räknar inte drag (library = lekens antal − kort ute) — telefonen såg inte leken lämna sin ruta | syntes inte |
| 41 | 183,42 | grav_ur_bild | Pharika's Chosen | – | graveyard: Pharika's Chosen 0 → 0 — högvakten: ändring +2,88 s | syntes inte |
| 42 | 189,40 | grav_ur_bild | Flutterfox | – | graveyard: Flutterfox 1 → 1 — högvakten: ändring +3,65 s | syntes inte |
| 43 | 193,94 | grav_till_bord | Killing Glare | ensamt | ut ur graveyard (+3,16 s) — ligger ihop med Ukud Cobra | fel plats |
| 44 | 200,22 | tar_bort | Ukud Cobra | till grav | ligger kvar på bordet (1 synligt med namnet) — högvakten: ändring +3,78 s | syntes inte |
| 46 | 207,02 | flyttar | Swamp | hög A | nedtonat +8,83 s, inget kort på nya platsen | syntes inte |
| 47 | 215,18 | tappar | Swamp | hög A (två av tre översta) | kortet fanns inte på bordet | syntes inte |
| 48 | 215,18 | tappar | Swamp | hög A (två av tre översta) | kortet fanns inte på bordet | syntes inte |
| 52 | 229,60 | tappar | Trusty Retriever | – | kortet fanns inte på bordet | syntes inte |
| 53 | 229,60 | tappar | Valkyrie's Sword | fäst ovanpå trusty retriever | kortet fanns inte på bordet | syntes inte |
| 55 | 236,06 | otappar | Swamp | hög A, två överstsa korten | kortet fanns inte på bordet | syntes inte |
| 56 | 236,06 | otappar | Swamp | hög A, två överstsa korten | kortet fanns inte på bordet | syntes inte |
| 57 | 242,42 | drar | – | – | appen räknar inte drag (library = lekens antal − kort ute; 1 kort kom ut i fönstret, på bordet) — telefonen såg leken lämna sin ruta +9,28 s | syntes inte |
| 59 | 250,46 | flyttar | Mirran Bardiche | ovanpå, till Scourge of the Undercity | flytt, samma kort (0.42 kortbredder) (+6,64 s) — ligger ensamt | fel plats |
| 60 | 254,40 | flyttar | Scourge of the Undercity | tillsammans med mirran bardiche som är fäst | nedtonat +2,10 s, inget kort på nya platsen | syntes inte |
| 61 | 254,40 | flyttar | Mirran Bardiche | ovanpå, till Scourge of the Undercity | ingen flytt (under 15 % av kortbredden, eller inte sedd) | syntes inte |
| 62 | 258,74 | tappar | Swamp | hög A (alla tre) | kortet fanns inte på bordet | syntes inte |
| 63 | 258,74 | tappar | Swamp | hög A (alla tre) | kortet fanns inte på bordet | syntes inte |
| 64 | 258,74 | tappar | Swamp | hög A (alla tre) | kortet fanns inte på bordet | syntes inte |
| 65 | 263,34 | spelar | Ancestral Blade | ensamt | ny (+2,01 s) — ligger ihop med Mirran Bardiche | fel plats |
| 67 | 270,92 | drar | – | – | appen räknar inte drag (library = lekens antal − kort ute) — telefonen såg inte leken lämna sin ruta | syntes inte |
| 68 | 273,46 | otappar | Trusty Retriever | tillsammans med valkyrie's sword som är fäst | kortet fanns inte på bordet | syntes inte |
| 69 | 273,50 | otappar | Valkyrie's Sword | som är fäst vid trusy retriever | kortet fanns inte på bordet | syntes inte |

## Alla rader

| Rad | t | Händelse | Kort | Syntes | Efter facit | Vad det digitala bordet gjorde |
|---|---|---|---|---|---|---|
| 3 | 28,08 | spelar | Swamp | nej | – | bara en fråga i granskningen (Swamp) |
| 4 | 30,62 | tappar | Swamp | nej | – | kortet fanns inte på bordet |
| 5 | 35,02 | spelar | Killing Glare | ja | +2,18 s | ny |
| 6 | 43,80 | tar_bort | Killing Glare | ja | +2,95 s | till graveyard (besvärjelseregeln) — högvakten: ingen ändring |
| 7 | 48,42 | drar | – | nej | – | appen räknar inte drag (library = lekens antal − kort ute; 2 kort kom ut i fönstret, på bordet) — telefonen såg inte leken lämna sin ruta |
| 8 | 53,96 | spelar | Flutterfox | ja | +1,24 s | ny |
| 9 | 58,32 | spelar | Pharika's Chosen | ja | +1,23 s | ny |
| 10 | 63,44 | otappar | Swamp | nej | – | ingen vridning (1 Swamp på bordet, 1 tappade) |
| 11 | 69,02 | spelar | Swamp | nej | – | inget på bordet |
| 12 | 72,76 | tappar | Swamp | nej | – | ingen vridning (1 Swamp på bordet, 1 tappade) |
| 13 | 72,80 | tappar | Swamp | nej | – | ingen vridning (1 Swamp på bordet, 1 tappade) |
| 14 | 77,78 | flyttar | Pharika's Chosen | ja | +2,77 s | flytt, samma kort (0.51 kortbredder) — ligger ensamt |
| 15 | 82,36 | spelar | Swamp | ja | +2,09 s | ny |
| 16 | 87,74 | spelar | Ukud Cobra | nej | – | bara en fråga i granskningen (Pharika's Chosen) |
| 17 | 91,84 | drar | – | nej | – | appen räknar inte drag (library = lekens antal − kort ute; 1 kort kom ut i fönstret, på bordet) — telefonen såg inte leken lämna sin ruta |
| 18 | 95,30 | tar_bort | Flutterfox | ja | +3,10 s | till graveyard (högvakten) — högvakten: ändring +3,10 s |
| 19 | 99,50 | flyttar | Ukud Cobra | nej | – | nytt kort +2,65 s, det gamla ligger kvar |
| 20 | 102,82 | otappar | Swamp | nej | – | ingen vridning (3 Swamp på bordet, 3 tappade) |
| 21 | 105,04 | tappar | Swamp | nej | – | ingen vridning (3 Swamp på bordet, 3 tappade) |
| 22 | 109,50 | spelar | Mirran Bardiche | ja | +1,80 s | ny |
| 23 | 113,62 | flyttar | Mirran Bardiche | nej | – | nedtonat +7,13 s, inget kort på nya platsen |
| 24 | 119,04 | flyttar | Mirran Bardiche | nej | – | ingen flytt (under 15 % av kortbredden, eller inte sedd) |
| 25 | 120,78 | flyttar | Ukud Cobra | nej | – | ingen flytt (under 15 % av kortbredden, eller inte sedd) |
| 26 | 122,14 | flyttar | Ukud Cobra | nej | – | ingen flytt (under 15 % av kortbredden, eller inte sedd) |
| 27 | 122,14 | flyttar | Mirran Bardiche | nej | – | kortet fanns inte på bordet |
| 28 | 128,00 | spelar | Valkyrie's Sword | nej | – | inget på bordet |
| 29 | 131,52 | flyttar | Valkyrie's Sword | nej | – | kortet fanns inte på bordet |
| 30 | 137,88 | flyttar | Valkyrie's Sword | nej | – | kortet fanns inte på bordet |
| 31 | 142,10 | otappar | Swamp | nej | – | ingen vridning (3 Swamp på bordet, 2 tappade) |
| 32 | 143,76 | drar | – | nej | – | appen räknar inte drag (library = lekens antal − kort ute; 1 kort kom ut i fönstret, på bordet) — telefonen såg inte leken lämna sin ruta |
| 33 | 148,52 | spelar | Trusty Retriever | ja | +0,88 s | ny |
| 34 | 152,28 | tar_bort | Pharika's Chosen | nej | – | ligger kvar på bordet (1 synligt med namnet) — högvakten: ändring +2,67 s |
| 35 | 157,58 | flyttar | Valkyrie's Sword | nej | – | kortet fanns inte på bordet |
| 36 | 162,88 | flyttar | Valkyrie's Sword | nej | – | kortet fanns inte på bordet |
| 37 | 167,52 | flyttar | Ukud Cobra | nej | – | ingen flytt (under 15 % av kortbredden, eller inte sedd) |
| 38 | 167,52 | flyttar | Mirran Bardiche | nej | – | kortet fanns inte på bordet |
| 39 | 172,54 | tappar | Swamp | ja | +3,56 s | tappat — ligger ihop med Swamp |
| 40 | 179,44 | drar | – | nej | – | appen räknar inte drag (library = lekens antal − kort ute) — telefonen såg inte leken lämna sin ruta |
| 41 | 183,42 | grav_ur_bild | Pharika's Chosen | nej | – | graveyard: Pharika's Chosen 0 → 0 — högvakten: ändring +2,88 s |
| 42 | 189,40 | grav_ur_bild | Flutterfox | nej | – | graveyard: Flutterfox 1 → 1 — högvakten: ändring +3,65 s |
| 43 | 193,94 | grav_till_bord | Killing Glare | ja | +3,16 s | ut ur graveyard — ligger ihop med Ukud Cobra |
| 44 | 200,22 | tar_bort | Ukud Cobra | nej | – | ligger kvar på bordet (1 synligt med namnet) — högvakten: ändring +3,78 s |
| 45 | 203,40 | otappar | Swamp | ja | -1,95 s | otappat — ligger ihop med Swamp |
| 46 | 207,02 | flyttar | Swamp | nej | – | nedtonat +8,83 s, inget kort på nya platsen |
| 47 | 215,18 | tappar | Swamp | nej | – | kortet fanns inte på bordet |
| 48 | 215,18 | tappar | Swamp | nej | – | kortet fanns inte på bordet |
| 49 | 217,24 | spelar | Pharika's Chosen | ja | +2,81 s | tillbaka |
| 50 | 221,48 | tappar | Pharika's Chosen | ja | +2,02 s | tappat — ligger ensamt |
| 51 | 225,22 | tar_bort | Killing Glare | ja | +2,93 s | till graveyard (högvakten) — högvakten: ändring +2,93 s |
| 52 | 229,60 | tappar | Trusty Retriever | nej | – | kortet fanns inte på bordet |
| 53 | 229,60 | tappar | Valkyrie's Sword | nej | – | kortet fanns inte på bordet |
| 54 | 233,14 | flyttar | Mirran Bardiche | ja | +3,71 s | flytt, samma kort (1.38 kortbredder) — ligger ensamt |
| 55 | 236,06 | otappar | Swamp | nej | – | kortet fanns inte på bordet |
| 56 | 236,06 | otappar | Swamp | nej | – | kortet fanns inte på bordet |
| 57 | 242,42 | drar | – | nej | – | appen räknar inte drag (library = lekens antal − kort ute; 1 kort kom ut i fönstret, på bordet) — telefonen såg leken lämna sin ruta +9,28 s |
| 58 | 246,62 | spelar | Scourge of the Undercity | ja | +2,38 s | ny |
| 59 | 250,46 | flyttar | Mirran Bardiche | ja | +6,64 s | flytt, samma kort (0.42 kortbredder) — ligger ensamt |
| 60 | 254,40 | flyttar | Scourge of the Undercity | nej | – | nedtonat +2,10 s, inget kort på nya platsen |
| 61 | 254,40 | flyttar | Mirran Bardiche | nej | – | ingen flytt (under 15 % av kortbredden, eller inte sedd) |
| 62 | 258,74 | tappar | Swamp | nej | – | kortet fanns inte på bordet |
| 63 | 258,74 | tappar | Swamp | nej | – | kortet fanns inte på bordet |
| 64 | 258,74 | tappar | Swamp | nej | – | kortet fanns inte på bordet |
| 65 | 263,34 | spelar | Ancestral Blade | ja | +2,01 s | ny — ligger ihop med Mirran Bardiche |
| 66 | 267,76 | tar_bort | Pharika's Chosen | ja | +4,34 s | till graveyard (högvakten) — högvakten: ändring +4,34 s |
| 67 | 270,92 | drar | – | nej | – | appen räknar inte drag (library = lekens antal − kort ute) — telefonen såg inte leken lämna sin ruta |
| 68 | 273,46 | otappar | Trusty Retriever | nej | – | kortet fanns inte på bordet |
| 69 | 273,50 | otappar | Valkyrie's Sword | nej | – | kortet fanns inte på bordet |

## Det digitala bordet gjorde utöver facit

- **flyttat** (16): 39,5 s Killing Glare 0.18 kb · 110,7 s Ukud Cobra 0.18 kb · 110,8 s Ukud Cobra 0.17 kb · 139,1 s Ukud Cobra 0.27 kb · 148,7 s Pharika's Chosen 0.3 kb · 175,1 s Swamp 0.8 kb · 175,8 s Swamp 0.58 kb · 197,1 s Killing Glare 1.83 kb · 215,3 s Killing Glare 0.18 kb · 215,4 s Killing Glare 0.23 kb · 217,8 s Trusty Retriever 0.18 kb · 219,3 s Ukud Cobra 1.07 kb · 219,4 s Ukud Cobra 0.99 kb · 220,1 s Pharika's Chosen 4.31 kb · 267,3 s Ancestral Blade 0.48 kb · 273,4 s Mirran Bardiche 0.7 kb
- **ny** (2): 54,3 s Swamp · 101,5 s Swamp
- **fråga** (13): 96,3 s Swamp · 138,9 s Night's Whisper · 139,3 s Plains · 161,1 s Valkyrie's Sword · 170,4 s Swamp · 171,8 s Ukud Cobra · 173,6 s Swamp · 219,8 s Plains · 220,2 s Night's Whisper · 270,4 s Plains · 273,8 s Mirran Bardiche · 275,6 s Thriving Heath · 278,3 s Trusty Retriever
- **tappat** (3): 101,8 s Swamp · 102,2 s Swamp · 267,6 s Ancestral Blade
- **otappat** (1): 134,8 s Swamp
- **nedtonat** (6): 139,3 s Mirran Bardiche · 164,6 s Pharika's Chosen · 215,8 s Swamp · 223,3 s Swamp · 223,5 s Trusty Retriever · 281,6 s Mirran Bardiche
- **till graveyard** (1): 235,9 s Ukud Cobra

## Slutbordet

Vid facits slut, 284,5 s:

| Kort | Facit (tappade) | Digitalt (tappade) |
|---|---|---|
| Ancestral Blade | 1 (0) | 1 (1) |
| Mirran Bardiche | 1 (0) | 0 ← |
| Scourge of the Undercity | 1 (0) | 0 ← |
| Swamp | 3 (3) | 0 ← |
| Trusty Retriever | 1 (0) | 0 ← |
| Valkyrie's Sword | 1 (0) | 0 ← |

Graveyard digitalt: Killing Glare, Flutterfox, Pharika's Chosen, Ukud Cobra. Nedtonade (frågan): Swamp, Swamp, Swamp, Mirran Bardiche, Trusty Retriever, Scourge of the Undercity. Frågor i granskningen: 6.

# dev/golden/inspelningar — texten till varje inspelning

Varje inspelning finns på två ställen, **med samma mappnamn**:

| Var | Vad | I git? |
|---|---|---|
| `dev/material/inspelningar/<namn>/` (foton: `dev/material/foton/<namn>/`) | själva filmen eller fotona — stora filer | nej, bara på Jespers Mac |
| `dev/golden/inspelningar/<namn>/` (den här mappen) | det som går att läsa: manus, facit, händelser, anteckningar | ja |

Namnet är `<datum>-<vad det är>`, datumet när det spelades in. Regeln för
namnen står i [`dev/material/LÄS-MIG.md`](../../material/LÄS-MIG.md).

Verktygen som mätte en inspelning ligger **inte** här utan bland de andra
verktygen i `dev/` — kod och data hålls isär. Kolumnen *Verktyg* säger var.

## Vad som finns

| Mapp | Vad | Läs först | Verktyg |
|---|---|---|---|
| `2026-09-19-mes-246-las-fore-slapp` | MES-246: kameraappen i 4K 60, vidvinkel, **inga spårrutor i bilden**. Jesper följde ett manus: tokens, fästa kort, landhögar | [`MANUS.md`](2026-09-19-mes-246-las-fore-slapp/MANUS.md) (vad som gjordes), [`FACIT.md`](2026-09-19-mes-246-las-fore-slapp/FACIT.md) (tiden för varje steg), `kort.txt` (manuset som lista) | [`dev/las-fore-slapp/`](../../las-fore-slapp/RAPPORT.md) mätte den; ritverktyget ritar lägen i den |
| `2026-09-20-ljust-tra-varmt-ljus-plastfickor` | Jespers tre foton: ljust trä, varmt ljus, plastfickor | [`UNDERLAG.md`](2026-09-20-ljust-tra-varmt-ljus-plastfickor/UNDERLAG.md) | blev golden-fall 14–16 |
| `2026-09-22-1x-34cm-normaltempo` | ett parti i normalt tempo, 1x, 34 cm. Skärminspelning av Mesas kameravy, **med spårrutorna i bilden**. Jesper sa högt vad han gjorde | [`LÄS-MIG.md`](2026-09-22-1x-34cm-normaltempo/LÄS-MIG.md) | `handelser.tsv` är facit; `dev/spegelfacit/` mäter mot den; `granska.html` och ritverktyget visar den |

**Partiet 2026-09-21** (`dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/`)
har sitt facit på grenen `natt-2026-09-22`, i mappen `2026-09-21-parti/`, som
inte är ihopslagen med main. Mappen byter namn till materialmappens när grenen
slås ihop.

## Gamla namn

| Hette | Heter sedan 2026-09-27 |
|---|---|
| `dev/golden/inspelningar/mes-246/` | `dev/golden/inspelningar/2026-09-19-mes-246-las-fore-slapp/` |
| `dev/golden/inspelningar/foton-2026-09-20/` | `dev/golden/inspelningar/2026-09-20-ljust-tra-varmt-ljus-plastfickor/` |

Källan i ritverktyget heter fortfarande `mes-246`. Det är ett id, inte en
sökväg, och utkasten och vridningen är sparade under det.

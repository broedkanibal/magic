# Handover: bildmodellen — v4 och remsvägen mätta, två vägar klarar grinden, Jespers val — 2026-10-07 natt

## Så här öppnar du
Läs det här, kör `git log --oneline -5` och läs `dev/material/arbete/markning/v4-2026-10-06-resultat.md` (nattens
rapport; v3:s ligger i `v3-2026-10-06-resultat.md`). Ingen hälsning, nämn inte dokumentet; för Jesper är det samma
samtal. Issuen är **MES-340** — står i **Behöver dig** (kommentaren som "Claude AI agent" 2026-10-07 ~03:40 har
siffrorna och frågorna). Kör inte `paborjaIssue` förrän Jesper svarat.

## Var vi står (natten 6–7 okt, allt utan Jesper)
- **Spår 1, `--rems-modell` i golden** (appens originalmodell på hela kortet, den finjusterade bara på
  titelremsorna): **v2 på remsorna 99/119 i två identiska körningar, 0 fel namn, inget fall sämre** (13: 3→4,
  14: 8→10, 17: 3→4) — hypotesen höll: v2:s båda säkra fel från i går gick via `modell land` på helkortet. v3 på
  remsorna 94 · 94, sämre på Jespers Swamp/Plains (06, 15), bort.
- **Spår 2, v4** = v3:s dataset (8 694 utsnitt, 117 namn) med `--utan-basvikt` (v2:s likformiga dragning), Kaggle
  version 8 (rök = 7), 184 min. **Golden med `--modell` 100/119 · 100/119, 0 fel namn (också under förloppet),
  inget fall sämre** (13: 3→5, 14: 8→9, 17: 3→5; en falsk mer i 17 utan namn). Egen validering: 15 osedda namn
  helkort 41→100 %, remsa 17→97 %. Helkort 54/61, 0 säkra fel vid 0,11. Remsregeln: Jespers basland tillbaka (13b
  28/44, MES-246 217/265 säkra) **men 1 säkert fel i båda lekarna: blänkremsan mes246-486.43 Hooded Blightfang →
  Pacifism 0,32** (samma kort som v3; v2 föll på två andra). Modell: `dev/embed/modeller/mobileclip-s0-mesa-v4.onnx`
  (gitignorerad; original `~/Library/Caches/mesa/riktig-v4-ut/`).
- **Baslinjen C2 95/119** på b581b49 är kort för kort identisk med morgonens C på 62e282a — sida 5-commitarna rubbar
  inget. Alla sju körningar på samma index.html (kontrollerat med `git diff --stat b581b49 HEAD -- index.html` och
  mtime 17:43), samma varma profil (`TMPDIR=/private/tmp/claude-501/-Users-jesperfunk-Code-magic/
  e4a618fc-60bc-45b1-87b5-f16275e99c14/scratchpad/tmp`, 658 MB — töms vid omstart), port 8291, `--ny-embed --tak
  3600000`. Loggar/json/felböcker: `dev/material/arbete/markning/golden-2026-10-06/` (C2, RV2a/b, RV3a/b, V4a/b).
- **Kortet i handen — en väg utan spärr, oavsett modell** (fall 11, 38,85 s, bild i rapporten): spelaren håller
  Danitha Capashen i handen ovanför bordet; v3-remsan läste kortet rätt (0,216) på ett skymt, rörligt spår, och
  appen lade det på bordet i 3,5 s fast det aldrig spelades (`videoFelUnder` i json; syns INTE i sluttabellens
  "Fel namn"). Samma remsa: appens modell 0,014, v2 0,158, v3 0,216. Vägen `remsa` saknar villkor på att spåret
  är stilla och oskymt. Hittades med `dev/golden/kortdom.py C2.json RV3a.json` + bildrutan ur videon (cv2;
  analysbilden är 360×203, spårets x,y,w,h är hörn + storlek).
- B och C (lampa, sol/skugga) är **inte inspelade**. När de finns: `mark.py pass <B> --par <A> --tel --lagg-fonster 20`.

## Två val som väntar på Jesper (Linear-kommentaren och rapportens Slutsats)
1. **Vilken väg in i appen:** v4 på allt (100, bäst, men blänkfelet i remsbänken) eller v2 bara på remsorna (99,
   helkortet orört = minsta ändringen). Rekommenderat: remsvägen med v2 nu, v4 när blänkfelet är förstått. Ett
   tredje, omätt: v4 bara på remsorna (`--rems-modell …-v4.onnx`, två körningar mot C2 på samma kod).
2. **Spärren först** (index.html — Jespers beslut, meddela MES-334-/Spegelmattan-sessionerna före varje ändring):
   remsan sätter säkert namn bara på stilla, oskymda spår; `modell land` kräver synlig andel eller ett vittne. Med
   v4 på allt behövs båda, med remsvägen bara den första. Byggs de mäts bytet i två golden till på samma kod.

## När Jesper valt: så byts modellen in (inte gjort)
Remsvägen: embed.js `remsModell` → den lokala filen måste upp som artefakt (HF eller egen URL — v2/v3/v4 är
gitignorerade), `V` höjs så vektorerna räknas om (MES-230/231: lagrade per kort-id, inte per modell). v4 på allt:
`MODELL_HF`/filen + `V`. Sedan C på nya main en gång och den nya två gånger, `--ny-embed`, och raden i historik.md.

## Regler
Grinden i CLAUDE.md ("Grinden för en ny bildmodell"). Trösklarna rörs inte; rör inte index.html, embed.js, kor.cjs,
kor.html utan Jesper; ingen modell in i appen före hans ja. Kaggle-körningar och Claude-märkning ≤ 5 $ är godkända;
fråga före andra kostnader. Golden-protokollet: "golden startar"/"klart" via SendMessage till "MES-334 fall 05
utredning" OCH "Spegelmattan orkestrerare" (ListAgents); ingen golden när `ps -axo command= | grep -E '^node
.*golden/kor\.cjs'` ger träff. Spegelmattan-orkestreraren jobbar i egna worktrees och säger till före push av
index.html; be den vänta om en golden-serie pågår ("golden-serien klar" släpper huvudträdet).

## Verktyg och fällor (lärda i natt)
- `dev/golden/summera.sh <logg>`: modellrader, totalrad, per fall, domskäl, land, högar, fördröjning.
  `dev/golden/kortdom.py A.json [B.json]`: per kort facit → namn/säkert/domskäl, diff mellan körningar.
  `node dev/golden/felbok.cjs <json> > felbok-X.txt`. Läs alltid `videoFelUnder` i json också.
- Kaggle-klienten: `~/.mesa/kaggle-venv/bin/kaggle` (inte på PATH). Bänkarnas python: `~/.mesa/detektor-venv/bin/
  python`. Kernelmappar `~/Library/Caches/mesa/kernel-v4-rok/`, `kernel-v4-riktig/` (ARGS-raden 51 patchad). Kolla
  datasetets `skapad` med `kaggle datasets download … -f manifest.json` före push. Rök 3 min, riktig ~185–195 min;
  Bash-väntare max 10 min → `Monitor` (30 min) som pollar status var 2:a minut.
- `helkort_jamfor.py` tar modellsökvägar **relativt repots rot** (`dev/embed/modeller/…`), inte relativt dev/remsa.
  `remsexp.py bygg` med `MESA_MOBILECLIP=<abs> MESA_REMSEXP_NPZ=<abs>` tar ~45 min under golden-last (5 min utan).
  `remsregel.py resultat/remsexp-bas.npz …-v2 …-v3 …-v4` ~6 min.
- Hela kortet läses i golden med appens förval från HF när `dev/embed/node_modules/onnxruntime-web` saknas (loggen
  varnar) — samma modell som den lokala vision.onnx (likhet 0,99997), så C står; `--modell`/`--rems-modell`-filer
  används alltid.
- Harnessen byter arbetskatalog mitt i sessionen (hände efter `cd dev/remsa`): absoluta sökvägar.
- En annan session kan committa i huvudträdet (Spegelmattan 23:56, bara en planfil): "samma kod" kontrolleras med
  `git diff --stat <baslinjens commit> HEAD -- index.html` + `stat -f %Sm index.html`, inte bara `git status`.
- Lokala main låg 4 bakom origin/main vid 03:30 (MES-333 uppspelaren); `git pull --ff-only` före commit.

## Rekommendation: modell och effort
Fable 5.1, xhigh. Det som återstår är omdöme: Jespers val, spärren (index.html, tungt — `mesa-bygg-tung`), och
golden-läsningen.

## Öppningsreplik
> Natten gav två vägar som klarar grinden: v4 på allt 100/119 i två körningar och v2 bara på remsorna 99/119 i två, båda 0 fel namn. Det som talar emot v4 är ett säkert fel på en blänkremsa i bänken, och fall 11 visade att remsan kan namnge ett kort i din hand oavsett modell — spärren på stilla, oskymda spår bör byggas före bytet. Vilken väg tar vi, och ska spärren först?

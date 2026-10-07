# Handover: bildmodellen — v4 och remsvägen mätta, två vägar klarar grinden, Jespers val — 2026-10-07 natt, uppdaterad 2026-10-07 em (prompt A)

## Så här öppnar du
Läs det här, kör `git log --oneline -5` och läs `dev/material/arbete/markning/v4-2026-10-06-resultat.md` (nattens
rapport; v3:s ligger i `v3-2026-10-06-resultat.md`) och **`dev/material/arbete/markning/matningar-2026-10-07-resultat.md`**
(dagens mätningar, prompt A: högarna, 0,5×, v4 på remsorna, tokens, och vad de 19 beror på). Ingen hälsning, nämn inte
dokumenten; för Jesper är det samma samtal. Issuen är **MES-340** — står i **Behöver dig** (kommentarerna som "Claude AI
agent" 2026-10-07 ~03:40 och ~12:50 har siffrorna och frågorna). Kör inte `paborjaIssue` förrän Jesper svarat.

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
  "Fel namn"). Samma remsa: appens modell 0,014, v2 0,158, v3 0,216, **v4 0,141** (dagens RV4). Vägen `remsa`
  saknar villkor på att spåret är stilla och oskymt. Hittades med `dev/golden/kortdom.py C2.json RV3a.json` +
  bildrutan ur videon (cv2; analysbilden är 360×203, spårets x,y,w,h är hörn + storlek).
- B och C (lampa, sol/skugga) är **inte inspelade**. När de finns: `mark.py pass <B> --par <A> --tel --lagg-fonster 20`.

## Dagens mätningar (prompt A, 2026-10-07 10:37–12:40, worktree `matningar-2026-10-07` låst på 25bcf0a, pool 170)
Rapporten är `matningar-2026-10-07-resultat.md`; loggar/json/felböcker/bänkutskrifter i `golden-2026-10-07/`. Allt
är mätning utan kod i appen; inget i index.html rördes. Raderna står i `dev/golden/historik.md`.
- **C 95/119, 0 fel** — kort för kort identisk med nattens C2 utom osäkra gissningar (tokens i poolen).
- **Högarna är detektorn (fråga 1).** `dev/remsa/hogfall.py` (appens detektorkedja per facitkort, en-till-en-parning
  som kor.html) och `dev/remsa/hogremsor.py` (läsningen på hörnexakt remsa och på detektorlådan, appens modell/v2/v4):
  av de sju högkorten bland de 19 får fem ingen egen kortlåda, fyra inte ens en rå remsrad; remsor utan låda kastas
  (T.detRemsa 0); 17:s hög B blir **en** låda över hela högen som döms som skräp (bild `17-hogar-detektorn.jpg`).
  Två är remsans geometri: lösa/delade remslådor läser 0,05–0,19 där den exakta remsan läser 0,3–0,6. Inget är fel
  modellsvar på remsan — men **appens modell läser nästan inga remsor i 13/17/18**, v2/v4 gör det.
- **0,5× är inte pixlarna (fråga 2).** Fall 18: 4/10 i 1080p, 3/10 i 1920 8000k, 4/10 ×2 i 4K, 0 fel namn.
  Fördröjningen 34 s → 1 s i 4K, **men samma 0,9 s i 1920×1080 med 8000 kbit/s**: golden 18:s `video.mp4` är 1500
  kbit/s och det är komprimeringen som ger de 34 s — inte upplösningen (`golden-2026-10-07/fall18-jamforelse.md`).
  Telefonen ser rå video; siffran 34 s sedan 2026-10-03 är inspelningens artefakt. (Omkodning till 8000 kbit/s =
  ärligare mått, prompt B-fråga.)
- **v4 bara på remsorna (fråga 3): 98/119 · 98/119, 0 fel** (också under förloppet), identiska; +3 mot C ur remsan
  (13 Plains, 14 Plains bakre, 17 Additive Evolution), högarna orörda 8/15. Sämre än v2-remsorna (99) och v4 på
  allt (100) — ingen ny väg; valen nedan står.
- **Tokens (fråga 4):** Rebel/Fractal i poolen namnger inte tokenspåren (Fractal → "Scourge?", Soldier → "Thriving
  Heath?", Rebel-tokens utan spår); "Rebel" blir osäkert nav på fyra mörka riktiga kort — 0 säkra, 0 fel namn.
- **De 19:** detektorn 6 · remsan under tröskeln/geometrin 6 · fel modellsvar 3 · oläsbart/täckt 4 · tokens 0.
- **Prompt C** kan köras med tre ändringar (rapportens sista avsnitt): `dev/hogbank.cjs` finns bara på grenen
  `mes-250-hoglasning` (main har `dev/remsa/hogbank_remsor.py`, 68 fall utan något som liknar 17); väg (a) är tre
  saker (remsklassen, kortklassen i högar, parningen som kastar remsor utan låda); remslådans geometri är steg två.

## Två val som väntar på Jesper (Linear-kommentaren och rapportens Slutsats)
1. **Vilken väg in i appen:** v4 på allt (100, bäst, men blänkfelet i remsbänken) eller v2 bara på remsorna (99,
   helkortet orört = minsta ändringen). Rekommenderat: remsvägen med v2 nu, v4 när blänkfelet är förstått. Det
   tredje, v4 bara på remsorna, är nu mätt: 98 ×2, 0 fel — sämre än båda, bort.
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
utredning" OCH "Spegelmattan orkestrerare" (ListAgents) — och till B-sessionen "Golden oläsbar-flagga och mätning"
så länge den lever; ingen golden när `ps -axo command= | grep -E '^node .*golden/kor\.cjs'` ger träff. Kör golden i
en egen worktree låst på en commit (EnterWorktree; symlänka .env.local, node_modules, dev/material, dev/embed/modeller,
dev/embed/cache — och dev/linear-agent/token.json om Linear ska skrivas), så stör inte Spegelmattans pushar av
index.html. kor.cjs ger slutkod 1 när domen mot senaste.json är BLANDAT/SÄMRE — det är inte ett fel; ett seriekript
får bara stanna på ≥ 2.

## Verktyg och fällor (lärda i natt och i dag)
- `dev/golden/summera.sh <logg>`: modellrader, totalrad, per fall, domskäl, land, högar, fördröjning.
  `dev/golden/kortdom.py A.json [B.json]`: per kort facit → namn/säkert/domskäl, diff mellan körningar.
  `node dev/golden/felbok.cjs <json> > felbok-X.txt`. Läs alltid `videoFelUnder` i json också.
  Nya i dag: `dev/golden/kortremsa.py <json> [fall]` (per facitkort: spår, domskäl, remsans namn/marginal/px),
  `dev/golden/tokens.py <json…>` (tokennamn på spår och bland förslagen), `dev/golden/fall18.py N=fil.json …`
  (fall 18 sida vid sida: totaler, fördröjning per utspel, per facitkort), `dev/remsa/hogfall.py` och
  `dev/remsa/hogremsor.py` (fråga 1:s bänkar; `--extra 18=<bild>:<namn>` för en extra ruta, t.ex. 4K).
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
- Harnessen byter arbetskatalog mitt i sessionen (hände efter `cd dev/remsa`): absoluta sökvägar. I en worktree
  vägrar harnessen sammansatta kommandon med `nice -n`, `$VAR` som argument, `sed -i` med variabel och vissa
  heredocs: skriv små skript i scratchpaden och kör dem med absoluta sökvägar.
- En annan session kan committa i huvudträdet: "samma kod" kontrolleras med `git diff --stat <baslinjens commit>
  HEAD -- index.html` + `stat -f %Sm index.html`, inte bara `git status`. I en egen worktree låst på en commit
  behövs ingen sådan kontroll förrän den slås ihop.
- Golden 18:s `video.mp4` är 1920×1080 15 fps **1500 kbit/s** (telefonens `telefon.mov` är 4K 30 fps); 1920-8000k och
  3840-8000k ligger i `dev/material/golden-18-upplosning/`. Fördröjningsmått på fall 18 beror på den filen.

## Rekommendation: modell och effort
Fable 5.1, xhigh. Det som återstår är omdöme: Jespers val, spärren (index.html, tungt — `mesa-bygg-tung`), och
golden-läsningen. Prompt C (högarna, `dev/plan/prompt-2026-10-07-C-hogarna.md`) läses med rapportens sista avsnitt i
handen.

## Öppningsreplik
> Dagens mätningar är klara: högarna är detektorn — fem av sju högkort får ingen egen låda och fyra inte ens en remsrad, och hög B i 17 döms som skräp som en enda låda. 0,5× är inte pixlarna: fall 18 ger lika många namn i 4K, och fördröjningen på 34 s försvinner redan i 1080p med 8000 kbit/s — det var golden-filens komprimering. v4 bara på remsorna ger 98 ×2 utan fel, sämre än v2-remsorna och v4 på allt, så valet står: vilken väg, och spärren först?

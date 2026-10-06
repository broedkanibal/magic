# Prompt för ny session 2026-10-06 kväll: rems-modell-provet och v4 — utan Jesper

**Modell: Fable 5.1, effort xhigh.** (Opus 5.5 på high går om det ska vara billigare — stegen är färdiga kommandon, men
läsningen av golden och bänkarna är omdöme.)

---

Läs `dev/plan/handover-2026-10-06-bildmodell-manga-kort.md` och `dev/material/arbete/markning/v3-2026-10-06-resultat.md`
och fortsätt MES-340. Samma samtal som fortsätter: ingen hälsning, nämn inte dokumenten. Kör
`node dev/linear-agent/klient.cjs`:s `paborjaIssue('91ed4777-720b-4c1f-b823-6dd74fe68f73')` först (issuen står i Behöver
dig); när du är klar: `markeraBehoverJesper` igen med de nya siffrorna och frågan om spärren.

Två spår, parallellt. Inget av dem kräver mig.

**Spår 1 — de finjusterade modellerna bara på remsorna, i golden.** Hypotesen: båda säkra felen (v2 och v3) går via vägen
`modell land` på hela kortet; med `--rems-modell` läser appens originalmodell hela kortet och den finjusterade bara
titelremsorna, där v2 vann mest (13b 0 → 21, MES-246 0 → 201 säkra). Kör i den här ordningen, en körning var, port 8291,
`--ny-embed --tak 3600000`, `--ut` till `dev/material/arbete/markning/golden-2026-10-06/`:
1. C igen på nuvarande main (index.html har ändrats sedan morgonens C: fyra MES-334 sida 5-commits) — kvällens baslinje.
2. `--rems-modell dev/embed/modeller/mobileclip-s0-mesa-v2.onnx`
3. `--rems-modell dev/embed/modeller/mobileclip-s0-mesa-v3.onnx`
Samma profil för alla tre: `TMPDIR=/private/tmp/claude-501/-Users-jesperfunk-Code-magic/e4a618fc-60bc-45b1-87b5-f16275e99c14/
scratchpad/tmp` om mappen finns (627 MB varm profil), annars en ny profil och ett uppvärmningsvarv som kastas. Före varje
körning: `ps -axo command= | grep -E '^node .*golden/kor\.cjs'` tomt, kontrollera `git diff --stat HEAD@{...}` så att
index.html är samma i alla tre, och "golden startar"/"klart" till "MES-334 fall 05 utredning" (ListAgents). Läs: rätt
namn/119, **fel namn (måste vara 0)**, falska, per fall, land per typ, högar, domskälen (`remsa`, `remsa+titel`). Rad per
körning i `dev/golden/historik.md`.

**Spår 2 — v4 på Kaggle: v3:s dataset med v2:s likformiga dragning.** Datasetet `jesperfunkrosling/mesa-riktiga-utsnitt`
(8 694 utsnitt, 117 namn) ligger redan uppe. Kopiera `~/Library/Caches/mesa/kernel-v3-riktig/` till `kernel-v4-riktig/`
och `kernel-v3-rok/` till `kernel-v4-rok/`, byt ARGS-raden (rad 51) till
`['--utan-basvikt', '--val-klipp', '2026-10-05-traning-landhogar/klipp3-enfargad-duk-island']` (rök: med `'--rok'` först).
Rök först (3 min; kontrollera i loggen `riktiga: … 8694 … 117 namn` och `"basvikt": false`), sedan riktiga (~195 min).
`kaggle kernels output jesperfunkrosling/mesa-remsa-tran -p ~/Library/Caches/mesa/riktig-v4-ut`, kopiera modellen till
`dev/embed/modeller/mobileclip-s0-mesa-v4.onnx` (utfilen heter fortfarande …-v2.onnx). Mät som v3:
`dev/remsa/helkort_jamfor.py` (vision, v2, v3, v4), `MESA_MOBILECLIP=<v4> MESA_REMSEXP_NPZ=…/remsexp-v4.npz python
dev/remsa/remsexp.py bygg` i `dev/remsa` i huvudträdet, `remsregel.py resultat/remsexp-bas.npz …-v2 …-v3 …-v4`, och golden
EN körning med `--modell` (plus en med `--rems-modell` om spår 1 visade att remsvägen är rätt). Förväntan: dina land
tillbaka (06, 14, 13b, MES-246) med A:s vinster kvar (13, 17, 18); felet i 05 troligen kvar.

**Regler:** 0 säkra fel namn; trösklarna rörs inte; rör inte index.html, embed.js, kor.cjs, kor.html; ingen modell in i appen
(spärren på `modell land` väntar på mitt ja); Kaggle-körningar är godkända, inga Claude-frågor behövs; fråga före andra
kostnader. Golden-protokollet med MES-334-sessionerna som förut.

**Skriv när du är klar:** `dev/material/arbete/markning/v4-2026-10-06-resultat.md` med samma tabeller som v3-rapporten plus
rems-modell-körningarna, historik-rader, Linear-kommentar på MES-340 som agenten, överlämningen uppdaterad, minnet
`mes-340-bildmodell-riktiga-inspelningar` uppdaterat. Säg i chatten rakt ut om något av spåren når 0 fel namn och fler rätt
än baslinjen, för det är vad som avgör om något går in i appen.

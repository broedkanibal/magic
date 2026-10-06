# Handover: bildmodellen v3 mätt — nästa är Jespers val (v4 eller spärren) — 2026-10-06 kväll

## Så här öppnar du
Läs det här, kör `git log --oneline -5` och läs `dev/material/arbete/markning/v3-2026-10-06-resultat.md`. Ingen hälsning,
nämn inte dokumentet; för Jesper är det samma samtal. Issuen är **MES-340** (In Progress, High, agenten delegate).
Linear-kommentaren med resultatet och de två valen ligger på issuen (som "Claude AI agent", 2026-10-06 ~20:25).

## Var vi står
- **Pass A märkt** (`dev/material/2026-10-06-traning-manga-kort-tra-skugga/`, 151 kort, 4 klipp): 136 lägg → 117 säkra +
  1 manuell (Study Hall; Claude läste «Steady Hall»), 17 osäkra = tokens/emblem. Stickprov med egna ögon: 0 fel. Claude
  0,64 $. Galleri för Jesper: `dev/material/arbete/markning/stickprov-2026-10-06-traning-manga-kort-tra-skugga.html`
  (13 MB, 4K-zoom vid klick; index `stickprov.html`), kontaktark i `markning/ark-2026-10-06-tra-skugga/`.
  **Fälla rättad:** 3 s-fönstret för lägg-ögonblicket tappade vart fjärde kort (handens skugga håller rörelsemåttet på
  4–16 i 5–8 s medan nästa kort läggs intill) → `mark.py … --lagg-fonster 20 --om B` (flaggan ny, förval 3,0, commit
  3dcbace). Kvar utan lägg: 8 riktiga kort (3 lådor som tog grannen, kvot 1,20–1,22; 2 utan remsa; Incubation på sidan
  ×2; 1 utanför 20 s). `galleri.py` (stickprov-HTML + `--ark` kontaktark) är ny i `dev/remsa/tran/`.
- **Dataset v3** `~/Library/Caches/mesa/ds-riktiga-v3/` = 8 694 utsnitt, 117 namn (basland 916 av 2 380 hel), 15 val-namn;
  uppladdat som ny version av `jesperfunkrosling/mesa-riktiga-utsnitt` 16:07. Kaggle: rök = kernel version 5 (version 4
  råkade montera den gamla datasetversionen — vänta tills `kaggle datasets download -f manifest.json` ger dagens
  `skapad` innan push), riktiga = version 6 (16:20–19:40, 195 min). Kernelmappar `~/Library/Caches/mesa/kernel-v3-rok/`
  och `kernel-v3-riktig/` (ARGS-raden patchad, val-klipp `2026-10-05-traning-landhogar/klipp3-enfargad-duk-island`).
- **Modell v3** `dev/embed/modeller/mobileclip-s0-mesa-v3.onnx` (original `~/Library/Caches/mesa/riktig-v3-ut/`).
  Egen validering (aldrig tränade namn, samma miljö): helkort 41 → 100 %, remsa 17 → 92 % (tel). **Men golden-materialet
  blir sämre än v2:** helkort 52/61 med 3 säkra fel vid 0,11 (appens 53/2, v2 55/0), remsregeln golden-leken 53/10/166
  säkra (v2 59/21/201), Jespers lek 1 säkert fel (Hooded Blightfang → Pacifism via titeln 0,221), golden EN körning
  **93/119 med 1 fel namn** (05 Scourge of the Undercity → Island, `modell land` — samma kort och väg som v2:s fel;
  kortet 29 % synligt), 06 tappar båda Swamp (Night's Whisper överst), 14 Plains. **Grinden faller. Inte i appen.**
  Allt i `dev/material/arbete/markning/v3-2026-10-06-resultat.md`; historik-rad 8e6e37d; `remsexp-v3.npz` i
  `dev/remsa/resultat/` (huvudträdet).
- **Jämförbarhetsfälla:** C kördes på 62e282a, v3 på bf1602c (huvudträdet, pullat dit 17:43 av en annan session) — fyra MES-334 sida 5-commits i index.html emellan
  (3e6387e, f9846c9, cffc76b, bf1602c). Skillnaderna i namn är modelldomar, men kör `git diff --stat <C-commit> HEAD --
  index.html` FÖRE en jämförande golden, inte efter. Golden-profilen "samma som C" = `TMPDIR=/private/tmp/claude-501/
  -Users-jesperfunk-Code-magic/e4a618fc-60bc-45b1-87b5-f16275e99c14/scratchpad/tmp` (töms vid omstart — då ny profil
  och ett uppvärmningsvarv).
- **B och C är inte inspelade** (`…-manga-kort-lampa/`, `…-manga-kort-solskugga/` tomma). När de finns:
  `mark.py pass <B> --par <A> --tel --lagg-fonster 20` (namn ur A via ordning + ORB), `mark.py par A B --torr` först.

## Nästa steg — väntar på Jesper (två val, se Linear-kommentaren)
1. **v4** = v3:s data med svagare nedviktning av basland: exponent 0,25 i stället för 0,5 (`mesa_remsa_tran.py`,
   dragningsvikten i funktionen kring rad 590), eller basland som fast andel ~35 %; plus B/C när de finns. Samma kedja:
   `dataset.py rakna/bygg --om` → `kaggle datasets version` → rök (vänta på datasetets `skapad`) → riktig → `helkort_jamfor.py`
   (grind ≥ 55/61, 0 säkra fel vid 0,11) → `remsexp.py bygg` + `remsregel.py` (0 säkra fel i Jespers lek) → golden EN
   körning, C på samma kod först om index.html ändrats. Risk: navet (Night's Whisper, Pacifism — aldrig tränade golden-
   kort) kvarstår oavsett vikt.
2. **Spärren `modell land` i appen** (index.html — Jespers beslut, inte agentens): v2 och v3 ger sitt säkra fel där —
   helkortets modell säger ett basland med marginal > 0,11 på ett delvis täckt kort utan remsa/ORB. Ett villkor på synlig
   andel eller ett vittne skulle stoppa det. Meddela MES-334-sessionen före varje ändring i index.html.

## Regler (oförändrade)
0 säkra fel namn; trösklarna rörs inte; rör inte index.html, embed.js (MODELL_HF, V), kor.cjs, kor.html; lägg inte in
modellen i appen före Jespers beslut; golden exakt två gånger per jämförelse (C + den nya); Claude-märkning ≤ 5 $ och
Kaggle-körningar godkända, fråga före andra kostnader. Golden-protokollet med MES-334-sessionerna: "golden startar"/"klart"
via SendMessage (ListAgents → "MES-334 fall 05 utredning"), pausa mark.py med SIGSTOP/SIGCONT när de mäter.
Kontroll före tung 4K: `ps -axo command= | grep -E '^node .*golden/kor\.cjs'` (pgrep -f matchar sig självt).

## Fällor (lärda 6 okt)
- Harnessen byter arbetskatalog mitt i sessionen: absoluta sökvägar och `git -C <worktree>`; lokala main ska stå på
  origin/main (`merge --ff-only`).
- Två sessioner på samma tråd skrev samma fil: förra sessionens `golden-2026-10-06/resultat.md` skrevs över av den här —
  skicka ett meddelande till den gamla sessionen först (ListAgents) och fråga vad den gör.
- Kaggle monterar den datasetversion som är färdigpackad vid push: kolla manifestets `skapad` med
  `kaggle datasets download -f manifest.json` innan `kernels push`.
- `mark.py` väntar själv på golden före varje 4K-steg; ett eget vänteskript med `sleep` i förgrunden blockeras — använd
  `run_in_background` + `kill -0 <pid>`.
- Galleriet för Jesper: HTML med inbäddade bilder som han öppnar med `open <fil>`; bilder i chatten är för små. Egna ögon:
  kontaktark (`galleri.py --ark`) läses med Read.

## Rekommendation: modell och effort
Fable 5.1, xhigh, utan orkestrerare — det som kan gå fel är omdömet (vad som får bli facit, hur golden läses), inte
beräkningen. Kaggle-kedjan och märkningen körs med färdiga kommandon.

## Öppningsreplik
> v3 är mätt och går inte in i appen: 100 % på sina egna osedda namn, men sämre än v2 på golden-materialet och samma Island-fel på Scourge i fall 05. Två vägar står i Linear-kommentaren på MES-340 — v4 med mjukare basland-vikt, eller spärren på `modell land` i appen. Vilken vill du ta?

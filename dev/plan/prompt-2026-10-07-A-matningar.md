# Prompt A, 2026-10-07: varför de 19 korten utan säkert namn är kvar — högarna, 0,5×, remsvägen med v4

**Modell: Fable 5.1, effort xhigh.** En session; golden kan inte köras parallellt på samma dator. Mätning utan kod i
appen — det här är underlaget för prompt C (bygget mot högarna). Kör A före C.

---

Läs `dev/plan/handover-2026-10-06-bildmodell-manga-kort.md` och `dev/material/arbete/markning/v4-2026-10-06-resultat.md`.
Samma samtal som fortsätter: ingen hälsning, nämn inte dokumenten. MES-340 står i **Behöver dig** (Jespers val av
modellväg och spärr) — rör den inte. Grinden i CLAUDE.md gäller. Rör inte index.html, embed.js, kor.cjs, kor.html,
trösklarna eller modellen i appen. Golden och Kaggle är godkända, inga Claude-frågor behövs; fråga före andra kostnader.

**Jespers regel för allt som optimeras (gäller A, B och C):** ingenting får skrivas mot ett visst kort, ett visst
fall, en pixelposition eller en tröskel vald för att ett fall ska gå över. Testet för varje idé: *skulle den hjälpa ett
annat kort i en annan lek i samma situation?* Varje ändring mäts på hela golden-setet (18 fall), högbänken
(`dev/hogbank.cjs`, 68 fall) och remsbänkarna (13b, MES-246). En vinst som bara syns i fallet den skrevs för räknas
inte. Nya trösklar mäts ur bruset (provbordet), inte sätts.

**Vad vi vet om de 19** (V4a, `dev/material/arbete/markning/golden-2026-10-06/felbok-V4a.txt`; bilderna på de 12 som
inte hade rätt namn överst: `de-12-utan-ratt-namn-V4a.html`, `open`): 7 är kort i högar där bara titelremsan syns, läsbar
för ögat (14 Plains, 17:s fem Island/Forest, 18 Ancestral Blade) — detektorn ger dem inget spår (17) eller remsan når
inte tröskeln; 7 har rätt namn överst men under tröskeln; 3 går nästan att läsa (13 Swamp 0,38 synlig i mörker,
18 Ukud Cobra 118×160 px mörk, v4 satte Thriving Moor överst = fel, inte osäker); 2 är oläsbara också för ögat
(13 Fencing Ace utbränd i hylsan, 13 Ancestral Blade och 18 Mirran Bardiche täckta av ett nedvänt kort). Jesper:
högarna och det som ögat kan läsa ska hittas; det utbrända ska inte räknas mot 100 % (prompt B).

**Golden-protokollet:** port 8291, `--ny-embed --tak 3600000`, varm profil `TMPDIR=/private/tmp/claude-501/
-Users-jesperfunk-Code-magic/e4a618fc-60bc-45b1-87b5-f16275e99c14/scratchpad/tmp` om mappen finns (annars ny profil
+ ett uppvärmningsvarv som kastas). Före varje körning: `ps -axo command= | grep -E '^node .*golden/kor\.cjs'` tomt;
"golden startar"/"klart" till **"MES-334 fall 05 utredning"** och **"Spegelmattan orkestrerare"** (ListAgents; den
senare pushar index.html — be den låta huvudträdet vara tills du skriver "golden-serien klar"). index.html har ändrats
sedan b581b49 (MES-338/341/342) och `dev/golden/lek.txt` har fått tokens Rebel och Fractal (poolen 168 → 170, ny
poolnyckel) → **ny C först**, och samma kod i alla körningar (`git log -1`, `git diff --stat <C-commit> HEAD --
index.html`, `stat -f %Sm index.html` före varje). Verktyg: `dev/golden/summera.sh <logg>`, `dev/golden/kortdom.py
A.json [B.json]`, `node dev/golden/felbok.cjs <json>`; läs `videoFelUnder` i json (fel namn under förloppet syns inte i
sluttabellen). `--ut` till `dev/material/arbete/markning/golden-2026-10-07/`. Rad per körning i `dev/golden/historik.md`.

## 1. Högarna — detektorn eller läsningen? (7 av de 19)
Fall 17:s fem Island/Forest i högarna A/B blir aldrig spår fast bilden är ljus och titlarna läsbara; 13:s, 14:s och
18:s högkort får spår men inget säkert namn. Mät utan kod: `node dev/hogbank.cjs` (68 högfall), `dev/remsa/
detektor_remsor.py` och `hogbank_remsor.py` — ger detektorns remsklass (MES-330) en låda per kort i högarna i 13, 14,
17, 18? Tabell per högkort: remslåda ja/nej, remsans höjd i px, bildmodellens namn och marginal på den exakta
remsan (remsexp-stilen, `dev/remsa/remsexp.py`) med appens modell, v2 och v4. Svara: är det (a) detektorn (ingen
låda), (b) remsan under tröskeln (låda, rätt överst, marginal < 0,20) eller (c) fel namn överst? (a) pekar mot
detektorn (MES-288 — minns grind 3: mer data hjälpte inte, remsan som tredje klass var det som hittade högkorten), (b)
mot remsmodellen/upplösningen, (c) mot modellen. Det här avsnittet är prompt C:s ingång.

## 2. Fall 18 i 4K — är 0,5× pixlarna? (3 av de 19 + fördröjningen)
`dev/material/golden-18-upplosning/video-3840x2160-8000k.mp4` finns, aldrig körd i golden. `--fall 18 --video
<4K-filen>` två gånger och `--fall 18` (1080p) en gång på samma kod och profil. Läs rätt namn/10, fel namn, högar,
fördröjning till namn (V4a: median 33 s — Swamp 6,7 → 40 s, Plains 22,8 → 56,9 s; korten är 120–180 px breda i
1920×1080, titelraden ~10 px; Fencing Ace fick namn på 0,4 s via modell+orb, basland går via `modell land` som
kräver större marginal). Bättre i 4K ⇒ spaken är upplösning/analysbredd (MES-244 `anaBredd`), inte modellen.
Aldrig `--spara`.

## 3. v4 bara på remsorna — rör sig högarnas namn?
`--rems-modell dev/embed/modeller/mobileclip-s0-mesa-v4.onnx`, två körningar mot den nya C. v4 var bäst på Jespers
landremsor i bänken (13b 28/44, MES-246 217 säkra) och remsan är vägen för täckta kort och högar. Läs högar, land per
typ, `remsa`-domskälen, fel namn (0 i båda, också `videoFelUnder`) och kortet i handen i fall 11 vid 38,85 s (appens
0,014, v2 0,158, v3 0,216 — vad säger v4?).

## 4. Tokens i poolen (går med i C-körningen, ingen egen körning)
Rebel och Fractal ligger nu i `dev/golden/lek.txt`. I C och alla körningar: får token-spåren i 13/17/18 namn, och tar
något riktigt kort ett tokennamn (= fel namn)? kor.html räknar i dag ett spår på en ritad token som "token, inte
falskt" oavsett namn — namnet syns i `spar`/`tokenLista` i json (`namn2`). Rapportera, bygg inget (prompt B gör
mätningen riktig). "Soldier" saknas: fuzzy-uppslaget ger Goblin // Soldier med Goblin som framsida (prompt B).

## Skriv när du är klar
`dev/material/arbete/markning/matningar-2026-10-07-resultat.md` (tabeller per fråga, bilder där det behövs, och ett
avsnitt "Vad de 19 beror på": detektorn / remsan under tröskeln / fel modellsvar / oläsbart / tokens), historik-rader,
Linear-kommentar som agenten på MES-340 (`dev/linear-agent/klient.cjs` `kommentera`; issuen stannar i Behöver dig),
överlämningen `dev/plan/handover-2026-10-06-bildmodell-manga-kort.md` och minnet `mes-340-bildmodell-riktiga-
inspelningar` uppdaterade. Säg rakt ut i chatten vad som visade sig vara spaken för högarna och för 0,5×, och om
prompt C kan köras som den står eller behöver ändras.

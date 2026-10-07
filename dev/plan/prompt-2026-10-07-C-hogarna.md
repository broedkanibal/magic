# Prompt C, 2026-10-07: hitta korten i högarna — generiskt, mätt på högbänken och hela golden

**Modell: Fable 5.1, effort xhigh** (agenten `mesa-bygg-tung`: detektorn, läsningen och spärren mot fel namn står på
spel). **Körs efter prompt A** — A:s avsnitt 1 säger om det är detektorn, remsan under tröskeln eller modellen, och
den här prompten ska läsas med det svaret i handen. En session; ingen golden parallellt.

**Krock med Spegelmattan:** C ändrar index.html (kameran: detektorn, remsan, läsningen), orkestreraren också
(datorsidan: avstamBord, mattan, kamSkala). Olika funktioner, samma fil. Kolla `ListAgents` och In Progress innan
start; pågår spegelmattans kö, bygg ändå i egen worktree men slå ihop först efter `git fetch` och en granskning av
det sammanslagna läget, säg till orkestreraren före push, och kör C och ändringens golden på den sammanslagna koden.

---

Läs `dev/material/arbete/markning/matningar-2026-10-07-resultat.md` (A:s svar), `dev/plan/handover-2026-10-06-
bildmodell-manga-kort.md` och `dev/golden/SNABBGUIDE.md`. Samma samtal som fortsätter: ingen hälsning. Grinden i
CLAUDE.md gäller (0 säkra fel namn hårt, varje fel spårat till sin väg; totalen bättre; C en gång + ändringen två
gånger på samma kod). Bygg i egen worktree, fristående granskning (också efter varje rättelse), merge först efter
bänk och golden. Meddela "MES-334 fall 05 utredning" och "Spegelmattan orkestrerare" före golden och före push av
index.html. Trösklarna rörs inte utan mätning ur bruset; bildmodellen i appen byts inte här (MES-340 väntar på Jesper).

**Målet:** korten i högar som ögat kan läsa på titelremsan ska bli spår med rätt namn — fall 17:s fem Island/Forest,
14:s Plains, 18:s Ancestral Blade, och högbänkens 68 fall — utan att något annat fall blir sämre och utan ett enda
säkert fel namn.

**Jespers regel, VIKTIGT:** allt som byggs ska vara generiskt. Ingen regel får nämna ett kortnamn, ett fall, en
pixelposition, en matta eller en tröskel vald för att just 17 ska gå över. Testet för varje ändring: *hjälper den ett
annat kort i en annan lek i samma situation (kort i hög, titelremsa synlig)?* Mät på högbänken (`dev/hogbank.cjs`, 68
fall) OCH hela golden (18 fall) OCH remsbänkarna (13b, MES-246). En ändring som vinner i 17 men inte på högbänken är
inte en lösning. Nya trösklar mäts ur bruset (provbordet), inte sätts.

**Vägarna, beroende på A:s svar:**
- *Detektorn ger ingen låda* (A: a): remsklassen i YOLOX (MES-330) ska hitta titelremsor i högar. Mät först var den
  missar på högbänken (höjd i px, kontrast, ljus, matta); är det data: träna om (MES-288-kedjan, Kaggle godkänt) med
  syntetiska högar i FLERA ljus/mattor/hylsor — inte 17:s bild — och mät grinden med prov/träning-spärren. Är det
  tröskeln för remsklassen: mät ur bruset.
- *Låda men under tröskeln* (A: b): remsan läses med bildmodellen mot remsleken; vad fattas — upplösning (4K/
  analysbredd, MES-244), hörnexakt remsa (MES-331 pass 4: remsan ur hörnen 64/64), eller landtyp ur den synliga
  delen (MES-331 pass 5: slog inte remsan då)? Prova den som A pekar på, generiskt.
- *Fel namn överst* (A: c): det är modellen; det hör till MES-340 (v4 på remsorna, B/C-inspelningarna) — bygg inte
  runt det här, skriv det i rapporten.

**Mät:** C på main (en gång), ändringen två gånger på samma kod, `--ny-embed` bara om modellen rörs; högbänken före
och efter; `dev/golden/kortdom.py` mellan C och ändringen för att se exakt vilka kort som rör sig och varför.
Skriv: rad i `dev/golden/historik.md`, redogörelse i `dev/plan/hogarna-resultat.md` (finns), Linear: en issue för
bygget om det spänner över mer än sessionen (Triage, etiketter Improvement + kortigenkänning), annars commit-
meddelandet. Säg i chatten vad som gjorde skillnaden och vad det kostade i de andra fallen.

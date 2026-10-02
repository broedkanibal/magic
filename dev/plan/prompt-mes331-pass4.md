# Prompt: MES-331 pass 4 — titeln i en ficka blir säker med två vittnen

Egen session. Modell och effort: **Fable 5.1, xhigh**. Kör i huvudarbetsträdet
`/Users/jesperfunk/Code/magic` eller i en egen worktree med `.env.local`, `dev/material`,
`dev/embed/cache` och `dev/embed/modeller` symlänkade (de två sista finns i
`.claude/worktrees/wf_bccb9343-ae9-3`). Kolla `git status` först: en annan session kan ha
ocommittade spår i `index.html`.

Klistra in allt nedanför strecket.

---

Du tar över MES-331 (Linear-id `e8771d01-e572-4fe2-9a20-17ed3e3503b5`, "Landhögarna: varje kort med
läsbart namn blir ett kort i appen, som i bänken"). Issuen står i In Progress sedan sessionen som körde
pass 0–3; den sessionen är avslutad och du håller issuen nu. Kör inte `paborjaIssue` igen. Jag har inga
användare: slå ihop till main och pusha utan att fråga när grinden är klarad, men mät före och efter, och
säg rakt ut vad som är mätt och vad som är bedömt.

## Läget (main 4f03fcc, 2026-10-02 kväll)

Pass 0–3 ligger på main. Golden lokalt utan Claude: **87/98 rätt namn, 0 fel namn, 0 falska (+1
token), Högar 7/11**; med Claude 64/65, 0, 0, Högar 8/9. Målet i issuen: varje kort vars namn går att
läsa blir ett kort med rätt namn, och inget fel namn blir säkert. Det enda kort i landhögarna utanför
fall 13 som inte är säkert är **golden 14:s bakersta Plains** — det här passet gäller det. (13 är undantaget:
inspelningen är mjuk och bländad, mätt i 4K, se historik-raden "golden 13 i 4K".)

## Problemet (mätt)

Golden 14, högen med tre Plains i gröna plastfickor uppe till höger: det bakersta Plains (facit id 5,
25 % synligt, namnraden hel och skarp, inte blänkt — `dev/material/hogar-2026-10-02/14-15-bakersta-plains.jpg`)
får Plains överst men osäkert. Samma kort på samma plats i fall 15 (annat ljus) blir säkert.

- Titeldelen av remsan (vänstra 55 %, `T.remsaTitel`, commit `eb308f4`) ger **0,169** mot gränsen
  `T.remsaTitelTroskel` 0,20.
- Titeln "Plains" är ~1/5 av remsans bredd. Resten är fickans gröna kant och en bit av kortet ovanför.
  Remsleken (`Embed.byggRemsLek` i `dev/embed/embed.js`) är byggd ur Scryfall-bilder utan ficka.
- Textläsaren (`Namn.lasBand`, `BAND_REMSA`, `REMSA_MAL_PX` i `index.html`) läser hela remsans bredd
  och ger skräp ("Pe", "LL phen") fast texten är läsbar för ögat.

Varför gränsen inte bara sänks: under 0,20 ger blänkta remsor i MES-246 **fel namn säkert** (två
Danitha Capashen → Night's Whisper; nollfel 0,122 med vakten på hela remsan, commit `9881e5e`).
Att lyfta svaga remsor till säkra är förkastat (rätt i 26–59 %).

## Lösningen att mäta, i den här ordningen

1. **Textläsaren på titelns del**: bara titelraden ur remsan (vänstra delen, rätt höjd), förstorad
   och tröskad, mot lekens namn. Mät först i bänken `dev/remsa/` (`ocr.cjs`, `ocr_export.py`,
   `detektor_remsor.py`, `RESULTAT.md`) över golden-remsorna + MES-246:s 666 detektorremsor
   (`dev/remsa/resultat/detektorremsor-v55-embed.json` har titeldelens tal): hur ofta läser den rätt,
   och ger den någonsin ett FEL namn med hög poäng?
2. **Två vittnen**: säkert ur remsan när titeldelens bildmodell har namnet överst (marginal över en
   lägre gräns, att mäta) **och** textläsaren på titeldelen läser samma namn. Inget vittne ensamt under
   sin egen gräns får göra ett namn säkert. Spärren i `svarAI` och `T.remsaTroskel` rörs inte.
   Textläsaren är det dyra steget (0,4–1 s): kör den bara när bildmodellen är osäker, som i dag.
3. Räcker inte det: **referenser med fickkant** i remsleken (syntetisk grön/svart ram runt
   referensremsan), mätt på samma sätt.

## Grind

- Bänken: **0 säkra fel** över golden-remsorna + MES-246 (666), med regeln exakt som i appen.
- Golden alla 16 i två satser (01–08, 09–16) + `--ai` på 03–06, 14–16 (högst två gånger; 13 + `--ai`
  dör — kör inte): 14 A rätt i Högar, **0 nya säkra fel namn**, inga nya falska, inga Högar sämre,
  stegtid och tid per remsläsning rapporterade (på ledig dator — andra program gav 270–390 ms en gång).
- `dev/kolla.sh` OK (kamerabank 157, avstämning 186).

## Läs först

- `dev/plan/prompt-landhogar-2026-10-02.md` (planen och de hårda kraven).
- MES-331-raderna i `dev/golden/historik.md` och kommentarerna på MES-331 (pass 0–3, 13 i 4K).
- Commit-meddelandena `eb308f4`, `9881e5e` (titeldelen och vakten), `b6ca682`, `40519c4`, `c09b8b6`
  (remsan som identitet), och pass 2:s `86f5bd9`, `638abaa`, `2863b92` (ordningen, syntetisk remsa).
- `dev/remsa/RESULTAT.md`, minnena `mes-328-remsans-namn`, `mes-329-tranad-detektor-i-appen`,
  `golden-egen-port`, `kontroller-som-ljuger`, `worktree-saknar-env-local`, `flera-sessioner-samma-arbetstrad`.
- CLAUDE.md: systemprompten i `api/identify.js` rörs inte. Linear via `dev/linear-agent/klient.cjs`,
  text via fil.

## Samordning

Sessionen "Fotokortlek – detektering och UX" har en lekfotoplan (`dev/plan/prompt-lekfoto-prov-2026-10-02.md`)
som väntar på att få röra `Namn.lasBand`, `Embed.byggRemsLek`, `Detektor.para` och `Kamera.lasRemsa`
tills MES-331 är på main. Säg till den via `ListAgents` + `SendMessage` när du börjar (att pass 4 rör
`Namn.lasBand` och remsleken) och när du slagit ihop.

## Golden

Egen port över 8260 (`lsof -iTCP:<port> -sTCP:LISTEN` först), en golden åt gången på datorn
(`pgrep -f kor.cjs` och `pgrep -f mesa-golden-profil` tomma, annars vänta), egen `TMPDIR`, kasta första
körningen i ny profil, poolen ska vara 114 (Scryfall 429 gav 23 en gång och `--spara` skrev skräp —
skripten stannar nu, men kontrollera). Ett commit per steg (vad var fel, vad mättes, vad ändrades);
baslinje `--spara` + rad i `historik.md` sist. Fristående granskning (Agent) av diffen före merge, och
en gång till efter rättelserna. Merge till main, push, och en kommentar på MES-331 med siffrorna.

## Avslut

När pass 4 är inne: flytta MES-331 till **Redo att testas** med `agent.markeraRedoAttTesta(issueId, vad)`
och skriv exakt vad Jesper ska prova på telefonen: (1) en tät landhög där bara namnraderna syns, i
plastfickor och utan; (2) en equipment instucken under en varelse med namnraden synlig; (3) ett kort
instucket åt sidan med namnraden helt dold (ska INTE få grannens namn); (4) ett kort som lyfts och
läggs tillbaka (inget spöke kvar). Säg till om något täckt kort får fel namn säkert. Klarar passet inte
grinden: lämna grenen, skriv varför i kommentaren, och flytta issuen till Redo att testas ändå för
pass 0–3 — med 14:s bakersta Plains som känd rest.

## Rapport till Jesper (i chatten, högst 20 rader)

Bänken (rätt/fel per regel och gräns), golden före → efter (Högar, rätt/fel namn, falska, lokalt och
med Claude), tid per remsläsning, vad som backades, vad som är kvar, och vad han ska prova på telefonen.

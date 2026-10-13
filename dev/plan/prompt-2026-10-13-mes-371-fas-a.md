# Prompter 2026-10-13: MES-371 fas A, fyra sessioner parallellt

Fyra sessioner som kan köras nu, samtidigt med varandra och med
nattbygget av problemrapporten (MES-365–368): ingen av dem rör kamerans
läsning, `avstamBord` eller Supabase-migrationer. MES-373 (minnet i
databasen) och MES-235 (fel namn utanför leken) väntar tills
problemrapportens orkestrering är klar; deras prompter skrivs då.

Planen: `dev/plan/lekar-och-minnet-bygget.md`. Bakgrunden (B, G, T, D):
`dev/plan/lekar-och-minnet.md`.

## Gemensamt för alla fyra

- Läs `CLAUDE.md` först (Linear-reglerna, worktrees, Kostnad, systemprompten).
- **Linear:** `agent.kontrolleraInnanStart(id)`, sedan `agent.paborjaIssue(id)`
  (`dev/linear-agent/klient.cjs`). När arbetet ligger på main: Done, eller
  Behöver dig / Redo att testas enligt prompten. Slutar du utan att vara
  klar: tillbaka till Todo med en kommentar om vad som återstår.
- **Worktree:** egen, med `.env.local`, `dev/material`, `dev/embed/cache` och
  `dev/embed/modeller` symlänkade från huvudträdet.
- **Rör inte** `index.html`, `api/` eller `supabase/` (MES-372 rör ingen kod
  alls). Ser något ut att behöva det: skriv det i issuen och fråga.
- **Golden** bara där prompten säger det, och då via `dev/golden/ko.sh`
  (problemrapportens orkestrering kan köra golden samtidigt; kön tar hand om
  det). Aldrig `pgrep -f` på profilen.
- **Push:** `git push origin HEAD:main` (bara `dev/`-filer, säkert), sedan
  städning av worktree och gren enligt CLAUDE.md.
- Svara Jesper kort och för en icke-expert: vad före hur, tabeller.

---

## Session 1 · MES-266: fast lista för `--utan-leken`

**Modell:** Sonnet 5.5, medium.

`--utan-leken` tar bort namn ur golden-leken medan korten ligger kvar; varje
säkert namn på dem är ett fel. Det blir provet för en inlärd lek i Mirror
(MES-371), som alltid saknar kort. I dag väljer den som kör vilka namn som
tas bort, så körningar mäter olika saker.

Gör så här (issuen och dess kommentar 2026-09-20 har listan):

1. Gör de tolv namnen (tvillingprincipen: varje borttaget kort har sin
   tvilling kvar i leken) till **förval** i `dev/golden/kor.cjs`:
   `--utan-leken` utan argument kör listan. Egna listor fungerar som förut.
2. Lägg listan i en fil i `dev/golden/` med en rad per namn: vilken tvilling
   som står kvar och varför den är med.
3. `kor.cjs` skriver i rapporten vilken lista som kördes.
4. SNABBGUIDE: egna listor är för utforskning; gränsen mäts mot förvalet.
   Rätta raden som säger att `--utan-leken "Ukud Cobra,Pacifism"` ger 0 fel
   (stämmer inte sedan 2026-10-07).
5. Kör `--utan-leken` med förvalet **en gång** på main (alla fall, via
   `ko.sh`) och skriv baslinjen i `dev/golden/historik.md`, högst tre
   meningar: rätt, fel namn och vilka fall. Väntat: 6 fel namn (fall 01, 03
   ×2, 08, 14, 15, mätt 2026-10-05). Varje fel namn med sitt domskäl går in
   i en kommentar på **MES-235**, som tar bort dem härnäst.

**Klart när:** förvalet och filen på main, baslinjen i historiken, MES-266
Done.

---

## Session 2 · MES-372: designytan D1 + D3

**Modell:** Opus 5.5, medium–high.

Mirror ska startas utan lekval och lära sig leken medan man spelar. Två
frågor saknar design:

- **D1:** vad som syns när Mirror startar utan lekval: uppstarten (steget
  `lek` försvinner i Mirror), mattan före första kortet, chippet "Pick a
  deck" och lekens knapp i spelet. Library i Mirror är den fysiska högen.
- **D3:** efter partiet ("We learned 34 cards. Save as deck?"), och hur en
  *learned* lek (Mirror har sett korten, antal osäkra) och en *complete* lek
  (inläst, importerad eller inklistrad; krävs för Digital) syns på Home och
  på lekens sida. Hur en learned lek blir complete (D4: inläsning, import,
  inklistring).

Läs `dev/plan/lekar-och-minnet.md` (Riktningen, B1–B3, D1–D4) och
`dev/plan/lekar-och-minnet-bygget.md` (etapp 1a och 4). Titta på hur appen
ser ut i dag i den inloggade vyn på live-sajten (Jesper loggar in själv),
och på tidigare designytor i samma stil (till exempel "Mesa Reading Mark",
"Mesa Mirror Mismatch"). Copy säger "we", aldrig "Mesa", och inga
tankstreck.

Gör en designyta (Artifact) med 2–3 varianter per fråga, kantfallen (tomt
minne, motståndarens kort, två lekar med samma kort, ett parti utan
"save"), och ditt förslag. Ingen kod.

**Klart när:** ytan publicerad, länken i MES-372 och i
`lekar-och-minnet.md` (raderna D1 och D3), och issuen i **Behöver dig**
(`markeraBehoverJesper`) med vad Jesper ska välja.

---

## Session 3 · MES-374: G4, hur snabbt den aktiva leken hittar rätt

**Modell:** Sonnet 5.5, medium (`mesa-matning`-slags arbete: mäter, bygger
inget i appen).

I Mirror ska Mesa själv veta vilken lek som spelas: start i den lek
spelaren spelade senast, och efter 2–3 säkra kort byte till korten ur de
tidigare partier där just de korten fanns (samförekomst). Frågan är hur
många säkra kort som behövs innan rätt lek är vald, och hur ofta fel lek
väljs.

1. Underlag: lekarna i Supabase (`decks`, 6 st, läs med service-nyckeln i
   `.env.local`), golden-leken (`dev/golden/lek.txt`), och gärna
   `boards` (116 rader, bordets sista läge per spelare och parti) som
   historik. Spara inga persondata i git: bara aggregat i resultatet.
2. Ett skript i `dev/` som simulerar: en spelare med en historik av partier
   med sina lekar, ett nytt parti där kort dras ur en lek (basland räknas
   inte), och regeln för start och byte. Varianter: senaste leken rätt eller
   fel, lekar som delar kort (staples), en ny lek som inte finns i
   historiken (då ska regeln inte låsa fast vid en fel lek).
3. Mät: antal säkra kort till rätt lek (median och svans), andel fel lek
   efter 3 kort, och vad som händer med en helt ny lek. Föreslå regeln
   (hur många kort, vilken tröskel) som MES-376 ska bygga.

**Klart när:** skriptet på main, resultatet under en ny rubrik *Resultat
G4 (MES-374)* i `dev/plan/lekar-och-minnet.md`, svaret först, och MES-374
Done.

---

## Session 4 · MES-375: världens fingeravtryck

**Modell:** Opus 5.5, high.

Mirror ska kunna känna igen ett kort som inte finns i leken genom att leta
bland alla ~33 000 kort på telefonen. G1 (MES-361) mätte det på bänken:
~65 % får ett säkert namn på första försöket och 0 säkra fel, med
bildmodellen + ORB. Men vektorerna är 2 × 59 MB (skarp + sudd, float16),
för stort för en telefon. Jespers gräns (J3): **högst 50 MB, helst ~25**.

Läs `dev/plan/lekar-och-minnet.md`, *Resultat G1/G2* (särskilt Tid och
storlek, navkorten, receptet) och *Resultat: krymp världen*. Bänken:
`dev/remsa/varlden.py` och `dev/embed/varlden.html`; materialet ligger i
`dev/material/arbete/2026-10-11-mes-361-varlden/` (inte i git).

1. Mät på bänken, med G1:s regel (ORB som villkor), varianter av:
   int8 i stället för float16; en referens per namn i stället för per
   konstverk; skarp och sudd sammanslagna eller bara sudd; färre
   dimensioner (PCA). För varje: storlek, första försöket på de 37 nya
   korten, säkra fel (ska vara 0), och tiden för sökningen.
2. Välj receptet. Världen behöver bänkens recept (referenser upprätta,
   frågan vriden fyra varv), inte appens lek-recept (4 vridningar × 2 per
   referens). Kontrollera att JS (`dev/embed/embed.js`) och Python ger samma
   vektorer (`dev/remsa/kalibrering.py`).
3. Bygg filen och ett skript som bygger om den när Scryfall får nya kort.
   Skriv ner var den ska ligga så att telefonen kan hämta den en gång
   (Supabase storage, som bucket `modeller`, eller statisk fil); **ladda
   inte upp den förrän Jesper sagt ja** till platsen.
4. Remsornas fil (titelremsan mot världen) ingår inte: den väntar på
   lekfotots session 3 ("G1 för remsor",
   `dev/plan/prompt-2026-10-13-lekfoto-3-lasningen.md`).

**Klart när:** tabellen med varianterna och det valda receptet under en ny
rubrik *Resultat 2a (MES-375)* i `dev/plan/lekar-och-minnet.md`, filen och
byggskriptet (skriptet på main, filen där Jesper säger), och MES-375 i
**Behöver dig** för platsen, eller Done om den redan är bestämd.

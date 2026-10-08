# Prompt: den tränade detektorn in i appen och ut i produktion

Föreslagen modell och effort: **Fable 5.1, xhigh** — det är detektorn i kamerakedjan, 0 fel namn
står på spel, och det är `mesa-bygg-tung`-klassen enligt CLAUDE.md. Kör i huvudarbetsträdet
(`/Users/jesperfunk/Code/magic`, inte en worktree: `dev/material` och `.env.local` behövs), och
kontrollera att ingen annan session skriver i `index.html` först.

Klistra in allt nedanför strecket.

---

Bygg in den tränade detektorn från MES-288 i Mesa-appen och få ut den i produktion. Jag har inga
användare, så pusha och driftsätt direkt på main utan att fråga, men mät före och efter.

## Läs först

- Minnet `mes-288-tranad-detektor` och `dev/detektor/tran/GRIND3.md` (resultatet från natt 1 och 2).
- `dev/golden/SNABBGUIDE.md` (hur golden körs) och minnena `golden-egen-port`, `kontroller-som-ljuger`,
  `flera-sessioner-samma-arbetstrad`.
- `dev/detektor/tran/prov.py` (`forbehandla`) och `prov246.py`: exakt hur modellen körs och tolkas.
- CLAUDE.md: systemprompten i `api/identify.js` rörs inte.

## Vad som finns

| | |
|---|---|
| Modellen | `dev/material/arbete/2026-10-01-mes-288-grind3-natt2/ut/C-remsa/yolox_nano_mesa_960x544.onnx` (3,7 MB, fp32) och `…_fp16.onnx` (2 MB). YOLOX-nano, Apache-2.0. `dev/material` är gitignorerad — kopiera den till en mapp som committas och serveras av Vercel (t.ex. `dev/detektor/modell/`). |
| Indata | 960×544, letterbox: skala `r = min(544/H, 960/W)`, bilden uppe till vänster, resten fylls med 114. BGR-ordning som OpenCV, float32 0–255 (se `forbehandla` i prov.py). |
| Utdata | en rad per ankare: `cx, cy, w, h` i indatans bildpunkter, `obj`, sedan tre klasspoäng `kort`, `baksida`, `namnrad`. Poäng = `obj × klasspoäng`. Dela med `r` för att komma tillbaka till bilden. |
| Trösklar, valda på valideringen | kortlådor (kort + baksida): poäng ≥ **0,56**, NMS **0,7** klassoberoende. Remsor (`namnrad`): poäng ≥ **0,68**, NMS 0,6 bland remsorna. Ändra inte dem utan att mäta. |
| Vad den ger | kortlådor: 728/738 kort och 95/105 hela högar i MES-246; med remsorna: 738/738 och 105/105. Golden 74/74. 0–1 falska. 38 ms per bild på Macens processor. Telefonen är **inte** mätt. |
| onnxruntime i appen | finns redan: `dev/embed/embed.js` (`Embed.ladda`, WebGPU med WASM som reserv) laddar bildmodellen MobileCLIP. Återanvänd samma laddning och samma backend-val. |

## Vad du ska göra, i ordning

1. **Issue.** Skapa en issue via `dev/linear-agent/klient.cjs` ("Den tränade detektorn i appen",
   `Feature`, `kortigenkänning` + `spelvyn`, Private beta, milstolpe *6 · Mirror my table*) och kör
   `paborjaIssue` på den direkt. Kommentera på MES-288 att förstudien är GO och att bygget ligger i den nya.
   Berätta id och länk i chatten.

2. **Baslinje.** Kör golden (`node dev/golden/kor.cjs`, egen port, kolla `lsof` först) med dagens
   detektor och spara utskriften. Kör också `dev/spegelfacit` om den går att köra. Det är siffrorna
   allt mäts mot.

3. **Detektorn i kedjan.** Hitta var kameran i dag hittar korten (`detektera()` i `index.html`, runt
   rad 22307, och hur dess regioner blir spår som `kamIdentifiera` och `avstamBord` använder). Byt ut
   *hittandet* mot YOLOX-lådorna; behåll allt efter (spåren, namnläsningen, bildmodellen,
   avstämningen mot bordet). Dagens detektor ska finnas kvar som reserv om modellen inte går att
   ladda, och gå att välja med `?debug`-reglaget så att golden kan köra båda. Kör modellen på
   analysbilden i full upplösning för modellen (960 bred), inte på `anaBredd` 360.

4. **Remsa + kortlåda.** En remsa hör till den kortlåda vars övre kant den ligger i. En remsa utan
   kortlåda är ett kort som dubblettsteget slagit ihop med grannen: skapa kortet ur remsan med
   kortstorleken från uppstarten (tappat kort = remsan står på högkant). Två kortlådor på samma kort
   (dubbletter, 37 i MES-246) slås ihop om de delar remsa. Mät det här steget mot MES-246-facit innan
   det kopplas in — `dev/detektor/tran/prov246.py` och `remsprov.py` visar hur facit läses.

5. **Mät.** Golden igen, samma kommando. Kravet: inga nya fel namn, och fler egna kort i fall 03–06
   och 13–16. Visar golden en regression: hitta orsaken, gissa inte. Skriv resultatet i
   `dev/golden/historik.md`.

6. **Telefonen.** Lägg detektorns tid per bild i latensrapporten (`?debug`), så att Jesper ser den på
   riktig telefon. Om telefonen inte hinner: fp16-filen först, sedan 640×384 — men varje byte mäts
   i golden igen.

7. **Ut.** Committa i små commits med meddelanden som bär historien (vad var fel, vad mättes, vad
   ändrades). Pusha main — också de tre opushade commitsen som ligger där nu. Kontrollera efteråt att
   produktionen kör den nya koden (`diff <(curl -s https://magic-mauve-xi.vercel.app/) index.html`).

8. **Lämna rätt.** Flytta issuen till *Redo att testas* med `markeraRedoAttTesta` och skriv exakt vad
   Jesper ska prova på telefonen: ett spel med täta landhögar, tappade kort och en hand över bordet,
   och vad latensrapporten ska visa. Uppdatera minnet `mes-288-tranad-detektor`.

## Regler

- Mät innan du påstår något. Ett svar som ser rätt ut utan att vara mätt är Mesas vanligaste
  allvarliga fel.
- Rör inte systemprompten i `api/identify.js`.
- Kör aldrig två golden samtidigt. Kolla `git status` för främmande ändringar före varje skrivning.
- Ändra inte trösklarna eller modellen för att ett golden-fall blev bättre. Blir något sämre: säg det.
- Fastnar du på något som kräver Jesper (ett designval i spelvyn, ett prov på telefonen): fråga i
  chatten, lämna inte issuen i In Progress om sessionen tar slut.

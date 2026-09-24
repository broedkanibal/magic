Designa animeringarna på Mesas digitala bord i spegelläget ("Mirror my table") som en designyta med 2–3 varianter. Det här är MES-292. Bygg ingenting i `index.html` förrän jag valt variant.

## Läs först

- `dev/plan/spegeln-utkast-v2.md`, avsnitt 3 och "Jespers svar", och MES-291: beteendet som animeringarna ska visa.
- `index.html`, de kortlägen som finns i dag:
  - `.card.nykort`: grön ring som pulsar, 1,4 s
  - `.card.lyft`: nedtonat (gråskala, mörkare, streckad kant)
  - `.card.settle`: 300 ms, `cubic-bezier(.2,.8,.3,1)`
  - `.card.tappad`
  - `flygTillGrav` och `flygTillBib`: flygturerna till graveyard och library
  - flygturen ur solfjädern till mattan, 480 ms
  - kommentaren vid `BORTA_NAD`
- `design_handoff_fri_matta/` (`GRAVEYARD_ANIMATION.md`, `support.js`) och `design_handoff_bordsvy/` (artboards i 1440×900 med appens mått, tokens och kortbilder). Följ samma format och återanvänd bilderna.
- Förlaga för hur bordet ser ut: den inloggade spelvyn på https://magic-mauve-xi.vercel.app i ett spel, inte attrappen. Jag loggar in åt dig i browserpanelen om du ber om det.

## Sammanhanget

En telefon ovanför det fysiska bordet filmar korten. Datorn ritar dem på mattan, och motståndarna på distans ser samma bord. **Animeringen är hur motståndaren förstår vad som hände.**

Kameran arbetar i steg:
1. Något ligger där: en platshållare utan namn ("Reading the card…"), 0,1–0,5 s efter att handen släppt kortet.
2. Namnet kommer 0,3–2 s efter, ibland upp till 5 s via AI:n ("Asking Claude…").
3. Kameran följer kortet: tappat eller otappat, flyttat, borta.

**I dag ser det ryckigt ut.** Ett nytt kort bara dyker upp med en grön ring. En flytt syns som att kortet tonas ned där det låg och poppar upp på den nya platsen 1,5–5 s senare, eftersom handen täcker kortet hela vägen.

## Det nya beteendet (beslutat, MES-291)

- **Kameran tappar ett kort:** kortet antas vara på väg att flyttas och står kvar oförändrat i upp till ~5 s.
- **Samma kort dyker upp på en ny plats** (först oftast en platshållare, sedan namnet): kortet rör sig från den gamla platsen till den nya och smälter ihop med platshållaren.
- **Graveyard-högen växer under väntan:** kortet flyger dit direkt.
- **Kortet syns inte igen och ingen hög växer:** det tonas ned efter väntan. Det gick troligen till handen eller exile.
- **Tap och untap** visas bara när kameran är säker. Vridningen ska vara mjuk.

## Händelser att designa

| Händelse | Vad motståndaren ska förstå |
|---|---|
| Utspel: platshållare → kort med namn | "det här kortet spelades just ut" |
| Flytt: gammal plats → platshållare på ny plats → kortet flyttar dit | "kortet flyttades", inte att ett försvann och ett nytt kom |
| Väntan när kameran tappat kortet (0–5 s) | ingenting, eller en diskret antydan; föreslå |
| Nedtonat efter väntan | "kameran ser inte kortet" |
| Tillbaka: ett nedtonat kort syns igen | kortet tänds upp, eller flyttar om platsen är ny |
| Till graveyard | kortet lämnade bordet |
| Tap och untap | kortet användes |

## Villkor

- **Farten får inte bli sämre.** Löftet är att något syns inom 0,3 s från att handen släpper. Animeringen startar direkt och fördröjer ingenting. Riktvärden: utspel ≤ 400 ms, flytt ≤ 450 ms, tap ≤ 250 ms.
- **Avbrytbar:** en ny uppdatering mitt i en animering tar sin nya riktning, utan att starta om eller hacka.
- Upp till ~20 kort per bord, och flera bord samtidigt i bordsvyn där motståndarnas bord är små. Det ska fungera i båda storlekarna och vara lätt för en vanlig bärbar dator.
- **Minskad rörelse** (`prefers-reduced-motion`): en variant med bara toning.
- **Samma rörelsespråk** som det som finns: flygturerna, `settle`, landningen i graveyard.
- Texten i gränssnittet är på engelska.

## Leverans

- Designytan **"Mesa Mirror Animations"**: 2–3 varianter (A/B/C), varje variant som en interaktiv artboard. Ett bord med några kort och knappar som spelar upp varje händelse ovan, också en flytt som avbryts halvvägs, i normalt och minskat tempo.
- För varje händelse i varje variant: en **tidslinje** med exakta tider, easing och vad som ändras (position, skala, opacitet, skugga, ring), så att den går att bygga rakt av.
- Din rekommendation: vilken variant, och varför.
- Källor och fristående artboards i `design_handoff_animeringar/`, som tidigare handoffs.

## Kända fällor i designformatet

- `url(./x.jpg)` i `<helmet><style>` löses inte ut. Lägg dolda `<img>` och bygg CSS-klasserna ur deras `src`.
- Tunga artboards ger "Preview stopped". Håll bilderna ≤ 380 px, använd bara de kort som behövs per artboard, och lägg på bilderna stegvis.
- Klick når inte in i artboards på den skalade canvasen i browserpanelen. Prova en artboard fristående med `support.js` bredvid, i den gitignorerade `dev/bilder/`.

När du är klar: lägg länken till designytan i MES-292 och låt den stå kvar i Provas med *Needs Jesper* tills jag valt.

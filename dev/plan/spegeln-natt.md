# Nattpasset: facit för partiet 2026-09-21 och utkast till spegelplanen

Skriven 2026-09-21 som överlämning. Den session som kör det här startas av
Jesper på **Opus 5 · effort high** (agenterna ärver effort; `model` sätts
per agent nedan). Ingen kod ändras i det här passet. Inga issues skapas.
Allt slutar i filer som Jesper läser på morgonen.

## Bakgrund, i tre rader

Jesper spelade 20 min i spegelläget (4K · 15 fps) med Latency-panelen på.
Resultatet var ospelbart: 230 spår för 40 kort, 205 "borta", 71 spår dog
utan namn, namn i median 2,4 s och p95 26 s. Rapporten:
`dev/latens/latens-2026-09-21-mes-238-4k15-20min-varme.json`. Filmen:
`dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/dator.mov`
(20 min 10 s; visar det digitala bordet till vänster och kamerapanelen till
höger, med menyradens klocka överst). Leken: `dev/golden/lek.txt`, 40 kort,
1 ex av varje icke-land, 7 Plains, 7 Swamp.

Golden mäter 4–5 kort på ren matta; partiet hade 15–25 kort, kort omlott
och händer hela tiden. Vi har optimerat mot fel prov. Det här passet gör
partiet till måttet.

## Kedjan

```
A rutor (skript, ingen agent)
 → B händelsefacit          general-purpose, model sonnet
   → C identitetsfacit      general-purpose, model opus   (behöver B:s platser)
     → D utkast till analys general-purpose, model opus   (behöver B och C)
```

I tur och ordning: varje del behöver den förras fil. Två mappar:

| Vad | Var | I git? |
|---|---|---|
| bildrutor och referensbilder (stora) | `dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/rutor/` och `…/referens/` | nej |
| facit och sammanfattningar (små) | `dev/golden/inspelningar/2026-09-21-parti/` (skapa mappen) | ja |

Avgränsning: **sekund 240–540** (minut 4–9), den värsta biten. Inte hela
filmen: ett facit med fel i sig gör alla mätningar efteråt fel, och 5 min
går att kontrollera på morgonen.

## Så att natten inte går förlorad

Tre saker gör att ett avbrott aldrig kastar bort gjort arbete, och att
sessionen inte sitter fast.

**1. Agenterna skriver medan de jobbar, och kan ta vid.** Alla tre
prompterna säger: skriv till filen **var 20:e rad** (inte i slutet), och
finns filen redan när du startar — läs sista raden och fortsätt därifrån.
Klar = skriv tomma filen `KLAR-B` / `KLAR-C` / `KLAR-D` bredvid. Aldrig
`mesa-matning` här: den kör i ett eget worktree, och filer där kan
försvinna när det städas. `general-purpose` skriver rakt in i det här
arbetsträdet.

**2. Vakthund i bakgrunden.** Varje agent startas i bakgrunden, och i
samma meddelande startas vakten nedan som `run_in_background` i Bash.
Den avslutar när agenten är klar, när filen inte vuxit på N minuter,
eller efter den totala tiden — och varje avslut väcker orkestreraren:

```bash
# vakt <fil som ska växa> <KLAR-fil> <stilla-minuter> <max-minuter>
F=$1; K=$2; S=$(( $3 * 60 )); MAX=$(( $4 * 60 )); T0=$(date +%s)
while true; do
  [ -e "$K" ] && { echo "KLAR"; exit 0; }
  N=$(stat -f %m "$F" 2>/dev/null); [ -z "$N" ] && N=$T0
  [ $(( $(date +%s) - N )) -gt $S ] && { echo "STILLA"; exit 1; }
  [ $(( $(date +%s) - T0 )) -gt $MAX ] && { echo "TID"; exit 1; }
  sleep 120
done
```

| Del | fil | KLAR | stilla | max |
|---|---|---|---|---|
| B | `handelser.tsv` | `KLAR-B` | 30 | 120 |
| C | `platser.tsv` | `KLAR-C` | 30 | 90 |
| D | `dev/plan/spegeln-utkast.md` | `KLAR-D` | 45 | 75 |

Spara skriptet som `/tmp/vakt.sh` och kör t.ex.
`bash /tmp/vakt.sh dev/golden/inspelningar/2026-09-21-parti/handelser.tsv dev/golden/inspelningar/2026-09-21-parti/KLAR-B 30 120`.

Väcks orkestreraren med `STILLA` eller `TID`: skicka **ett** meddelande
till agenten ("skriv det du har och avsluta"), vänta 10 min, stoppa den
sedan (`TaskStop`) och gå vidare med det som ligger på disk. Starta aldrig
om från noll — samma prompt igen tar vid enligt punkt 1. Högst **en**
omstart per agent. Väcks den med `KLAR`: nästa del.

**3. Tidsbudget och commit.** Hela passet får ta högst **5 h**. Vad som
än finns då — hela eller halva facit — skriv resultatfilen, committa
facit-mappen och utkastet på grenen `natt-2026-09-22` (skapa den från
main; **pusha inte**) och skicka notisen. Ett halvt facit med tydlig
lucka är värt mer än inget, och en commit är det enda som överlever en
session som stängs.

Tidsgränser per del: A 15 min, B 2 h, C 1,5 h, D 1,25 h — 5 h totalt.

## A · Bildrutor

Kör i orkestreraren, inget agentanrop:

```bash
swiftc -O -o /tmp/rutor dev/rutor.swift
/tmp/rutor dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/dator.mov \
  dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/rutor 240 540
```

Ger `NNN.jpg` (hela skärmen, 1600 px bred, menyradens klocka läsbar överst
till höger) och `kam-NNN.jpg` (kamerabilden, 705 × 438 px, med Mesas egna
spårrutor inritade). Öppna två rutor och kontrollera att beskärningen
träffar kamerabilden innan B och C startas; annars justera `KAM` i skriptet.

## B · Händelsefacit — `general-purpose` med `model: sonnet`

Prompt:

> Du ska skriva ett facit över vad som **fysiskt** hände på bordet i ett
> Magic-parti, utan att bry dig om vilka kort det är. Underlag:
> `dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/rutor/kam-NNN.jpg`,
> en per sekund, sekund 240–540 ur en skärminspelning. Menyradens klocka i
> `rutor/NNN.jpg` (överst till höger) ger klockslaget. De gröna, röda, gula
> och grå rutorna i kamerabilden är Mesas egna spår — **ignorera dem**, de
> är det vi mäter, inte facit.
>
> Gå igenom rutorna i ordning. Numrera varje fysisk plats P1, P2, … första
> gången ett kort ligger stilla där (koordinater i procent av bildens bredd
> och höjd, mitten). Skriv en rad per händelse i
> `dev/golden/inspelningar/2026-09-21-parti/handelser.tsv` med kolumnerna
> `sekund  klockslag  plats  handelse  x  y  kommentar`. Händelser:
> `lades`, `flyttades` (kommentar: från x,y), `tappades`, `otappades`,
> `togs bort` (kommentar: `graveyard` om det lades på graveyard-platsen
> nere till vänster, annars `ur bild`), `hand over` (hand täcker platsen
> utan att något ändras, med sekund när handen är borta igen). Ett kort som
> ligger omlott med ett annat är en egen plats: skriv `omlott med Pn` i
> kommentaren. Leken (grön hög) och graveyard-högen är inte platser.
>
> Skriv till filen var 20:e händelse, inte i slutet. Finns
> `handelser.tsv` redan: läs sista raden och fortsätt från nästa sekund.
> När du är klar: skapa den tomma filen `KLAR-B` i samma mapp.
>
> Är du osäker på en ruta: skriv `osäker` i kommentaren i stället för att
> gissa. Ändra ingen kod. Skriv till sist `handelser-sammanfattning.md`:
> antal platser, antal händelser per typ, lista på rutor du var osäker på,
> och som mest var bordet hade hur många kort samtidigt.

## C · Identitetsfacit — `general-purpose` med `model: opus`

Prompt:

> Du ska avgöra **vilket kort** som ligger på varje fysisk plats i
> `dev/golden/inspelningar/2026-09-21-parti/handelser.tsv` (kolumnen
> `plats`, händelsen `lades`). Kandidaterna är exakt lekens kort i
> `dev/golden/lek.txt`: 26 olika icke-land med 1 ex vardera, plus Plains
> och Swamp. Hämta referensbilder från Scryfall
> (`https://api.scryfall.com/cards/named?exact=<namn>`, fältet
> `image_uris.normal`; vänta 100 ms mellan anrop) till
> `dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/referens/`.
>
> För varje `lades`: titta på `rutor/kam-NNN.jpg` vid händelsens sekund och
> de 2–3 rutorna efter, då handen är borta. Korten ligger i genomskinliga
> plastfickor och är ~90 px stora, så döm på konstverkets färger och
> komposition och ramfärgen (svart = svart kort, vit = vitt, grå/brun =
> artefakt, land har ingen textruta). Ett icke-land som redan ligger ute
> eller redan tagits till graveyard kan inte läggas igen. Det digitala
> bordet i `rutor/NNN.jpg` visar Mesas eget namn för platsen: använd det
> som **ledtråd, aldrig som svar** — Mesa hade fel ibland och det är just
> det vi mäter. Skriv i kolumnen `grund` när du avviker från Mesas namn.
>
> Skriv `platser.tsv`: `plats  kort  sakerhet  grund` där `sakerhet` är
> `säker` (konstverket stämmer tydligt), `trolig` (färg och typ stämmer,
> konstverket otydligt) eller `osäker` (gissning; skriv de 2–3 möjliga).
> Ändra ingen kod. Skriv till sist `platser-sammanfattning.md`: antal
> säkra / troliga / osäkra, och vilka rutor Jesper bör titta på själv.

## D · Utkast till analys och plan — `general-purpose` med `model: opus`

Prompt:

> Underlag: facit i `dev/golden/inspelningar/2026-09-21-parti/`
> (`handelser.tsv`, `platser.tsv`), latensrapporten
> `dev/latens/latens-2026-09-21-mes-238-4k15-20min-varme.json` (läs
> `dev/latens/LÄS-MIG.md` först; kör `node dev/latens/analys.cjs` på den),
> och rutorna i `dev/material/inspelningar/2026-09-21-mes-238-parti-4k15-20min/rutor/`.
> Avgränsa till sekund 240–540. Klockan: rapportens tider är datorns
> `Date.now()`; menyradens klockslag i rutorna ger sekunden.
>
> Räkna, med facit som sanning: (1) spår per fysisk plats, (2) falska
> `borta` (rapporten säger borta, facit säger kvar), (3) missade kort
> (facit säger lades, rapporten har inget namn inom 5 s), (4) fel namn
> (rapportens namn ≠ platser.tsv, bara där facit är säker eller trolig),
> (5) dubbletter (två levande spår på samma plats). För varje kategori: de
> tre vanligaste orsakerna, med sekund och ruta som bevis, och var i
> `index.html` (modulen `Kamera`, `matcha`, `fodSpar`, `bortaMs`,
> `kamIdentifiera`) beslutet tas.
>
> Föreslå sedan regler för "bordet som sanning": kameran skickar
> händelser, bordet tar emot med väntetider och skydd. För varje regel:
> hur många av felen i (1)–(5) den skulle ta bort, räknat mot facit, och
> vad den riskerar att göra sämre. Ta också ställning till "leken som
> facit" i läsningen: hur många av de osäkra läsningarna
> (`las[].dom.marginal`, `inliers`) hade blivit säkra med bara lekens 28
> kort som kandidater.
>
> Skriv utkastet avsnitt för avsnitt till filen medan du jobbar, så att
> ett avbrott lämnar de färdiga avsnitten kvar; skapa `KLAR-D` i
> facit-mappen när det är klart.
>
> Ändra ingen kod. Skapa inga issues. Skriv `dev/plan/spegeln-utkast.md`
> för en icke-expert: rubriker, tabeller, vad före hur. Markera allt som
> kräver ett beslut av Jesper med **BESLUT**. Avsluta med en lista över
> vad som kan bli issues (titel + en rad), utan att skapa dem.

## När allt är klart

Orkestreraren skriver `dev/plan/spegeln-natt-resultat.md` med: vad som
kördes, hur lång tid varje del tog, var filerna ligger, vad som är halvt
eller saknas, och de tre viktigaste siffrorna ur D. Committa
`dev/golden/inspelningar/2026-09-21-parti/`, `dev/plan/spegeln-utkast.md`
och resultatfilen på grenen `natt-2026-09-22` (**pusha inte**), och skicka
sedan en push-notis till Jesper (`PushNotification`) med en rad. Lämna
sedan sessionen i vila: inga fler agenter, inga loopar.

## Om något stannar

- Skriptet A hittar inte filmen eller beskär fel: stanna, skriv i
  resultatfilen, notis.
- Scryfall svarar 429: vänta 60 s, prova igen, högst fem gånger.
- B eller C stannar utan resultat: kör D på det som finns och skriv vad
  som saknas. Ett halvt facit med tydlig lucka är bättre än inget.

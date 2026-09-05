---
name: driftkoll
description: Skriver ut de fyra kommandona som visar om Mesa är committat, pushat och driftsatt — var och ett i ett eget kopierbart block med en kort rubrik om vad det gör. Använd den när användaren vill veta om allt är ute, om något ligger opushat, om produktionen kör senaste koden, eller ber om "driftkollen", "kolla om allt är deployat" eller liknande. Skriver ingenting och ändrar ingenting.
---

# Driftkoll för Mesa

Skriv ut kontrollerna nedan **ordagrant** som svar, i den här ordningen, med
rubrikerna kvar och varje kommando i ett eget ```bash-block. Ett kommando per
block — appen sätter en Kör-knapp på varje block, och två kommandon i samma
block gör knappen obrukbar.

Kör dem inte åt användaren om hen inte ber om det. Ber hen om resultatet:
kör dem i tur och ordning och tolka svaren enligt "Hur du läser svaren" nedan.

Produktionsadressen är `https://magic-mauve-xi.vercel.app`. Läs den ur
README.md om den skulle ha ändrats.

---

## 1. Finns det något ocommittat?

```bash
git status --short
```

## 2. Ligger det något lokalt som inte nått GitHub?

```bash
git fetch -q origin && git rev-list --count origin/main..HEAD
```

## 3. Lever serverfunktionen, och är det rätt version?

```bash
curl -s https://magic-mauve-xi.vercel.app/api/identify
```

## 4. Är sidan som ligger ute exakt din fil?

```bash
diff <(curl -s https://magic-mauve-xi.vercel.app/) index.html && echo IDENTISKA
```

---

## Hur du läser svaren

1. **Tomt** = allt committat. Rader betyder ändrade filer: `M` ändrad,
   `A` tillagd och redo, `??` ny och ospårad.
2. **`0`** = allt är uppe på GitHub. Ett annat tal är antalet opushade commits.
   `git fetch` först är inte valfritt — utan den jämförs mot en gammal bild av
   vad GitHub har, och det är precis då man tror att man pushat fast man inte
   gjort det.
3. `ok:true` = funktionen kör (HTML tillbaka = trasig deploy). `ready:true` =
   API-nyckeln finns i Vercels miljövariabler. `promptv` ska stämma med
   `PANE_PROMPT_V` högst upp i `api/identify.js` — gör den inte det kör
   produktionen gammal kod.
4. Ingen utskrift plus `IDENTISKA` = exakt din fil ligger ute. Det är starkare
   bevis än "Vercel säger Ready", som bara betyder att bygget gick igenom, inte
   vilken kod som byggdes.

Går 3 eller 4 fel medan 1 och 2 är gröna: deployen har inte hunnit ut än.
Vercel bygger på push och tar ungefär en halv minut — vänta och kör om.

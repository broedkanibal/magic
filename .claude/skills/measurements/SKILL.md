---
name: measurements
description: Visar Mesas senaste mätningar på en skärm — Golden (rätt namn, fel namn), Deck golden, golden-videornas förlopp, Event test, Mat test, Latency på riktig telefon och Component tests — med datum, klockslag, commit och ⚠ när koden ändrats sedan mätningen. Förval utan Claude; "med claude" visar båda. Ett verktygsnamn ("/measurements golden") ger allt för det verktyget. Använd när Jesper frågar "hur ligger vi till", "vad säger golden", "senaste mätningarna", "har vi blivit bättre", "vad mäter vi", eller ber om "measurements" eller "mätningarna". Läser bara; kör inga mätningar.
---

# Measurements

De senaste talen från varje mätverktyg, utan att någon läser historikfiler.
Vad verktygen *är* står i kartan: `dev/measurements/MAP.md`. Den här skillen
visar bara talen.

## Så kör du den

| Jesper skriver | Kör |
|---|---|
| `/measurements` | `node dev/measurements/show.cjs` |
| `/measurements med claude` | `node dev/measurements/show.cjs --claude` |
| `/measurements golden` (eller `deckgolden`, `eventtest`, `mattest`, `latency`, `components`) | `node dev/measurements/show.cjs golden` osv. |

Skriver Jesper ett gammalt namn, översätt: händelseprovet/spegelfacit =
`eventtest`, mattprovet/uppspelaren = `mattest`, lekfotot/lekgolden =
`deckgolden`, latens = `latency`, delprov/bänkarna = `components`.

Skriptet läser varje verktygs egna filer och git. Det tar några sekunder,
längre när datorn är belastad.

## Så skriver du svaret

1. **Skriptets utskrift i ett kodblock**, oförändrad. Talen ska inte skrivas
   om för hand — då kan de bli fel.
2. **Två–tre meningar under**, inte mer:
   - vad som har ändrats mot "förra" (eller att inget ändrats),
   - vilka tal som har ⚠ och är äldre än koden, om det spelar roll,
   - vad som saknas (t.ex. att golden-körningen inte är sparad som baslinje,
     eller att ett component test inte finns i registret).

Tolka inte mer än så. Vill Jesper förstå *vad* ett mått betyder: peka på
kartans avsnitt, eller förklara kort ur kartan.

## Vad tecknen betyder

| Tecken | Betyder |
|---|---|
| ⚠ | `index.html` (kamerakoden) har ändrats sedan mätningen — talet gäller äldre kod |
| ? | mätningens commit finns inte lokalt, så det går inte att avgöra |
| gren | körningen gjordes på kod som inte finns på main |
| förra | för Golden: baslinjen (det som senast godkändes); för Mat test: förra baslinjen |
| kommer | måttet "utlagda med namn inom 1 s" är inte byggt än |

## Var talen kommer ifrån

| Rad | Källa |
|---|---|
| Golden, alla 18 fall | senaste hela körningen utan Claude i `dev/golden/historik.md` (bara rader med `…/119` och ett enda värde) |
| Golden fall för fall, videofallen, ren kamera | baslinjen `dev/golden/senaste.json` (med Claude: `senaste-ai.json`) |
| Deck golden | `dev/lekgolden/historik.md` |
| Event test | nyaste rapporten i `dev/eventtest/resultat/` (`-lokal` och `-ai`) |
| Mat test | `dev/mattest/baslinje/baslinje.json` och dess förra version i git |
| Latency | nyaste passet i `dev/latens/`, genom `analys.cjs` |
| Component tests | registret `dev/measurements/register.jsonl` |

Mapparna `dev/spegelfacit` och `dev/uppspelaren` byter namn till
`dev/eventtest` och `dev/mattest` (prompt H). Skriptet tar det namn som finns
(konstanten `MAPPAR`).

## Component tests och registret

Component tests har inga resultatfiler med fast format, så deras tal finns
bara om någon skrivit in dem. **Den session som kör ett component test
registrerar talet**:

```bash
node dev/measurements/show.cjs --register camera-rules "251/251 OK" --source "node dev/kamerabank.cjs"
```

Id: `camera-rules`, `wholecard`, `strips`, `detector`, `piles`. Skriv in det
tal som gäller **appens** modell eller detektor, inte en kandidat, och säg
vilken i texten. Saknas ett component test i registret visar översikten den
senaste resultatfilen, så att det syns att något finns men inte är avläst.

## Gör inte

- Kör inte Golden, Event test, Mat test eller något component test. Det här
  är en avläsning, inget prov.
- Räkna inte om tal ur historikfilerna för hand för att "fylla i". Saknas ett
  tal, säg att det saknas.
- Registrera inte ett component test du inte själv har kört eller läst i
  resultatfilen.

---
name: matningarna
description: Visar Mesas senaste mätningar på en skärm — golden (rätt namn, fel namn), lekgolden, golden-videornas förlopp, händelseprovet, mattprovet, latens på riktig telefon och delproven — med datum, klockslag, commit och ⚠ när koden ändrats sedan mätningen. Förval utan Claude; "med claude" visar båda. Ett verktygsnamn ("/mätningarna golden") ger allt för det verktyget. Använd när Jesper frågar "hur ligger vi till", "vad säger golden", "senaste mätningarna", "har vi blivit bättre", "vad mäter vi", eller ber om "mätningarna". Läser bara; kör inga mätningar.
---

# Mätningarna i Mesa

De senaste talen från varje mätverktyg, utan att någon läser historikfiler.
Vad verktygen *är* står i kartan: `dev/matningar/KARTA.md`. Den här skillen
visar bara talen.

## Så kör du den

| Jesper skriver | Kör |
|---|---|
| `/mätningarna` | `node dev/matten.cjs` |
| `/mätningarna med claude` | `node dev/matten.cjs --claude` |
| `/mätningarna golden` (eller `lekgolden`, `handelseprovet`, `mattprovet`, `latens`, `delprov`) | `node dev/matten.cjs golden` osv. |

Gamla namn fungerar också: `spegelfacit` = händelseprovet, `uppspelaren` =
mattprovet, `bänkarna` = delprov.

Skriptet läser varje verktygs egna filer och git. Det tar några sekunder,
längre när datorn är belastad.

## Så skriver du svaret

1. **Skriptets utskrift i ett kodblock**, oförändrad. Talen ska inte skrivas
   om för hand — då kan de bli fel.
2. **Två–tre meningar under**, inte mer:
   - vad som har ändrats mot "förra" (eller att inget ändrats),
   - vilka tal som har ⚠ och är äldre än koden, om det spelar roll,
   - vad som saknas (t.ex. att golden-körningen inte är sparad som baslinje,
     eller att ett delprov inte finns i registret).

Tolka inte mer än så. Vill Jesper förstå *vad* ett mått betyder: peka på
kartans avsnitt, eller förklara kort ur kartan.

## Vad tecknen betyder

| Tecken | Betyder |
|---|---|
| ⚠ | `index.html` (kamerakoden) har ändrats sedan mätningen — talet gäller äldre kod |
| ? | mätningens commit finns inte lokalt, så det går inte att avgöra |
| gren | körningen gjordes på kod som inte finns på main |
| förra | för golden: baslinjen (det som senast godkändes); för mattprovet: förra baslinjen |
| kommer | måttet "utlagda med namn inom 1 s" är inte byggt än |

## Var talen kommer ifrån

| Rad | Källa |
|---|---|
| Golden, alla 18 fall | senaste hela körningen utan Claude i `dev/golden/historik.md` (bara rader med `…/119` och ett enda värde) |
| Golden fall för fall, videofallen, ren kamera | baslinjen `dev/golden/senaste.json` (med Claude: `senaste-ai.json`) |
| Lekgolden | `dev/lekgolden/historik.md` |
| Händelseprovet | nyaste rapporten i `dev/spegelfacit/resultat/` (`-lokal` och `-ai`) |
| Mattprovet | `dev/uppspelaren/baslinje/baslinje.json` och dess förra version i git |
| Latens | nyaste passet i `dev/latens/`, genom `analys.cjs` |
| Delprov | registret `dev/matt/register.jsonl` |

Mapparna `spegelfacit` och `uppspelaren` byter namn till `handelseprovet` och
`mattprovet`; skriptet tar det namn som finns (konstanten `MAPPAR`).

## Delproven och registret

Delproven har inga resultatfiler med fast format, så deras tal finns bara om
någon skrivit in dem. **Den session som kör ett delprov registrerar talet**:

```bash
node dev/matten.cjs --registrera kamerans-regler "251/251 OK" --kalla "node dev/kamerabank.cjs"
```

Id: `kamerans-regler`, `helkort`, `remsor`, `detektorn`, `hogarna`. Skriv in
det tal som gäller **appens** modell eller detektor, inte en kandidat, och
säg vilken i texten. Saknas ett delprov i registret visar översikten den
senaste resultatfilen, så att det syns att något finns men inte är avläst.

## Gör inte

- Kör inte golden, händelseprovet, mattprovet eller något delprov. Det här är
  en avläsning, inget prov.
- Räkna inte om tal ur historikfilerna för hand för att "fylla i". Saknas ett
  tal, säg att det saknas.
- Registrera inte ett delprov du inte själv har kört eller läst i
  resultatfilen.

---
name: measurements
description: Visar Mesas senaste mätningar som tabeller — Golden (rätt namn, fel namn), Deck golden, golden-videornas förlopp, Event test, Mat test, Latency på riktig telefon, Component tests och riktiga partier (rättningar per 100 kort, Claude-frågorna per modell) — med Nu, Förra, när det mättes och ⚠ äldre kod när koden ändrats sedan mätningen, plus en tabell över hur varje verktyg visas i detalj och mäts om. Förval utan Claude; "med claude" visar båda. Ett verktygsnamn ("/measurements golden") ger allt för det verktyget. Använd när Jesper frågar "hur ligger vi till", "vad säger golden", "senaste mätningarna", "har vi blivit bättre", "vad mäter vi", eller ber om "measurements" eller "mätningarna". Läser bara; kör inga mätningar.
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
| `/measurements golden` | `node dev/measurements/show.cjs golden` |
| `/measurements deckgolden` | `node dev/measurements/show.cjs deckgolden` |
| `/measurements eventtest` | `node dev/measurements/show.cjs eventtest` |
| `/measurements mattest` | `node dev/measurements/show.cjs mattest` |
| `/measurements latency` | `node dev/measurements/show.cjs latency` |
| `/measurements components` | `node dev/measurements/show.cjs components` |
| `/measurements games` | `node dev/measurements/show.cjs games` (riktiga partier: per spelare och parti) |

Skriver Jesper ett gammalt namn, översätt: händelseprovet/spegelfacit =
`eventtest`, mattprovet/uppspelaren = `mattest`, lekfotot/lekgolden =
`deckgolden`, latens = `latency`, delprov/bänkarna = `components`.

Skriptet läser varje verktygs egna filer och git. Det tar några sekunder,
längre när datorn är belastad.

## Så skriver du svaret

Skriptet skriver markdown: en fetstilt rubrik och en tabell per grupp, och
sist tabellen **Mer om ett verktyg** (hur varje verktyg visas i detalj och
mäts om).

1. **Klistra in skriptets utskrift som den är, utan kodblock**, så att
   tabellerna blir riktiga tabeller i chatten. Skriv inte om talen för hand,
   och flytta eller stryk inga rader. Då kan de bli fel.
2. **Två–tre meningar under**, inte mer:
   - vad som har ändrats mot "Förra" (eller att inget ändrats),
   - vilka tal som har ⚠ äldre kod, om det spelar roll,
   - vad som saknas (t.ex. att golden-körningen inte är sparad som baslinje,
     eller att ett component test är "inte avläst").

Tolka inte mer än så. Vill Jesper förstå *vad* ett mått betyder: peka på
kartans avsnitt, eller förklara kort ur kartan.

## Kolumnerna

| Kolumn | Betyder |
|---|---|
| Mått | verktyget och vad som räknas |
| Nu | senaste talet |
| Förra | Golden: baslinjen före den som gäller nu. Mat test: förra baslinjen. Component tests: förra registrerade talet (`samma` = oförändrat). Tomt = finns inget att jämföra med |
| Mätt | datum, klockslag när det finns, ålder i dygn inom parentes, och commit |
| Obs | varningar, mål och var talet finns |

## Vad tecknen betyder

| Tecken | Betyder |
|---|---|
| ⚠ äldre kod | koden mätningen beror på har ändrats sedan mätningen, så talet gäller äldre kod. För Golden, Event test, Mat test, Deck golden och Latency är det `index.html`. För component tests är det filerna i `DELPROV.kod` i skriptet; till exempel beror bildmodellens prov på `dev/embed` och `dev/remsa`, inte på `index.html` |
| ? commit saknas | mätningens commit finns inte lokalt, så det går inte att avgöra |
| gren | körningen gjordes på kod som inte finns på main |
| inom 1 s: kommer | måttet "utlagda med namn inom 1 s" är inte byggt än |
| inte avläst | ett component test har en resultatfil men inget tal i registret |

## Var talen kommer ifrån

| Rad | Källa |
|---|---|
| Golden, 18 fall | senaste hela körningen utan Claude i `dev/golden/historik.md` (bara rader med `…/119` och ett enda värde) |
| Golden ren kamera, videofallen, fall för fall | baslinjen `dev/golden/senaste.json` (med Claude: `senaste-ai.json`); Förra = filens förra version i git |
| Deck golden | `dev/lekgolden/historik.md` |
| Event test | nyaste rapporten i `dev/eventtest/resultat/` (`-lokal` och `-ai`) |
| Mat test | `dev/mattest/baslinje/baslinje.json` och dess förra version i git |
| Latency | nyaste passet i `dev/latens/`, genom `analys.cjs` |
| Component tests | registret `dev/measurements/register.jsonl` |
| Riktiga partier | produktionens Supabase genom `node dev/spelupplevelse.cjs --json`: vyerna `upplevelse_*` (ur `kort_handelser`, sedan 2026-10-09, läget bord = kameran på) |
| Kamerans frågor till Claude, per modell | tabellen `claude_fragor` (en rad per fråga, sedan 2026-10-02): modell, kostnad och svarstid. "(svaret aldrig loggat)" = frågan räknades men svaret skrevs aldrig i loggen |

Riktiga partier har ingen "Förra": de räknas om ur alla partier varje gång.
Byts kamerans modell syns det i Claude-tabellen som en ny rad, med sitt
eget datumspann. Rättningar per 100 kort räknar bara det spelaren gör —
kort som lämnas utan namn står i raden *Kort som aldrig fick namn*.

Mapparna `dev/spegelfacit` och `dev/uppspelaren` bytte namn till
`dev/eventtest` och `dev/mattest` 2026-10-08 (prompt H); de gamla namnen är
symlänkar. Skriptet tar det första namn som finns (konstanten `MAPPAR`).

## Component tests och registret

Component tests har inga resultatfiler med fast format, så deras tal finns
bara om någon skrivit in dem. **Den session som kör ett component test
registrerar talet**:

```bash
node dev/measurements/show.cjs --register camera-rules "247/247 OK" --source "node dev/kamerabank.cjs"
```

Id: `camera-rules`, `wholecard`, `strips`, `detector`, `piles`. Skriv in det
tal som gäller **appens** modell eller detektor, inte en kandidat, och säg
vilken i texten. Skriv samma text som förra gången när talet är oförändrat,
så att Förra visar `samma`. Saknas ett component test i registret visar
översikten den senaste resultatfilen, så att det syns att något finns men
inte är avläst.

## Gör inte

- Kör inte Golden, Event test, Mat test eller något component test. Det här
  är en avläsning, inget prov. Kommandona i *Mer om ett verktyg* är till för
  Jesper, eller för en session som fått i uppdrag att mäta.
- Räkna inte om tal ur historikfilerna för hand för att "fylla i". Saknas ett
  tal, säg att det saknas.
- Registrera inte ett component test du inte själv har kört eller läst i
  resultatfilen.

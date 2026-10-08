# Prompt G, 2026-10-07: landhögarna efter MES-346 (MES-347 och de landfall som är kvar)

Klistra in i en ny session (Opus 5.5, xhigh). MES-347 står i Todo (Jesper 2026-10-07).

> Bygg klart landhögarna efter MES-346: MES-347 och de landfall som är kvar i p0921k, enligt
> `dev/plan/prompt-2026-10-07-G-landhogar.md`.

## Läs först

`CLAUDE.md`, `dev/plan/prompt-2026-10-07-E-mes-345-346.md` (avsnittet *Gemensamt* gäller också här),
`dev/mattest/LÄS-MIG.md`, MES-346 och MES-347 med kommentarer, commit-meddelandena `dc29c25` och `0dcfab4`,
och minnena `mes-346-landhogar-under-relationen`, `kontroller-som-ljuger`, `orkestrering-lardomar-2026-09-25` och
`worktree-saknar-env-local`.

**Linear:** kör `kontrolleraInnanStart` och `paborjaIssue` på MES-347. Står den inte i Todo: stanna och fråga Jesper.
Bygg i en egen worktree på `origin/main`, och symlänka `dev/material`, `.env.local` och `node_modules`. Rör inte huvudträdet.

**Modell:** Opus 5.5, xhigh. En fristående granskare på Fable 5.1 läser diffen före ihopslagning och varje rättelse efter.

## Steg 0 — mät med dagens telefon (ingen kod)

p0921k i uppspelaren spelar en bordslogg som är fryst med telefonkoden från före Remsan först (MES-340). Frys om den:
kör kedjan utan Claude på partiets video (`dev/eventtest/LÄS-MIG.md`:
`dev/eventtest/kor.cjs --video kamera-180-540.mp4 --fran 180`) och sedan `node dev/mattest/frys-kedja.cjs`.
Kör inget av det samtidigt som golden, `kolla.sh` eller en annan kedja (kolla `ps` först).

Jämför den gamla och den nya loggen: antalet saknade kort, och de sju landfallen (290, 330, 440, 450 ×2, 500, 510,
plus 530) ett och ett. Den nya loggen och baslinjen (`--spara`) blir EN egen commit med en tabell före och efter.
Säg till Spegelmattan orkestrerare och MES-345-sessionen innan den pushas, eftersom den ändrar måttstocken för alla.
Försvinner ett fall med den nya telefonen: skriv det, och bygg inget för det.

## Steg 1 — MES-347

Ett nytt land med samma namn som landet under binder landet under till sig när det får sitt namn. Det sker i steg 3:s
`ledigt` i `avstamBord`, och i `kortSomKomTillbaka` när spelaren svarar i sökrutan.

1. Lägg in proven T1 och T6 (de står i MES-347:s beskrivning) i `dev/avstamning.cjs`, och visa att de faller.
2. Mät i den nya p0921k och i golden-loggarna (`dev/dubbletter.cjs`) hur ofta felet händer efter Remsan först.
3. Händer det fortfarande, använd samma regel som MES-346 (`annatKort`/`ofrSkilda`: telefonen har sett det nya
   landet ligga över det gamla) på tre ställen:
   - steg 3:s `ledigt`,
   - `kortSomKomTillbaka`,
   - steg 4:s räkning, som inte ska räkna det täckta kortet som ett av de synliga.

MES-344:s P2 (svaret i sökrutan tar kortet i väntan när det inte finns någon relation) ska stå kvar grön.

## Steg 2 — de landfall som är kvar efter steg 0

- **290 och 440 s.** Det oframkallade kortet läggs bara om spåret ligger still just när halvsekunden går
  (`ofrSomKort`), och telefonens `vilar` fladdrar för ett delvis täckt kort vars synliga låda växer och krymper.
  Pröva om viloläget (`vx`, `vy`) räcker som bevis för att kortet ligger still, när det står still.
  Principen gäller: aldrig ett oframkallat kort för en hand eller något som rör sig. Mät att O4 håller och att inga
  nya oframkallade kort kommer i golden-fallen och passet 09-22 (jämför posterna som i MES-346:s commit-meddelande).
- **450 s (spår 322) och 530 s (Faithful Pikemaster):** utred vad som händer innan något byggs.
- **330 s** är telefonens dom ("samma kort som #163", telefonens dubblettregel). Rör inte telefonkoden. Finns fallet
  kvar efter steg 0: beskriv det i en kommentar på MES-331 och säg till Jesper.

## Kodens regel

Ingenting skrivs mot ett visst kort, fall eller tal. Testet för varje idé: hjälper den ett annat kort i en annan lek
i samma situation? Inga tidsgränser valda för att p0921k ska gå över.

## Grinden före ihopslagning (som prompt E)

- `sh dev/kolla.sh` grön.
- `node dev/mattest/kor.cjs --fil index.html --jamfor` med slutkod 0 mot baslinjen på main.
- Spegelfacit (passet 09-22) får inte fler fel, och `dev/dubbletter.cjs --fall 07` ingen ny dubblett.
- Avstämningens O13–O22, granskarens F1–F5, G1–G2 och P1–P2, och de nya T1/T6 är gröna.

Ingen golden. Rör du telefonens eller kamerans kod: stanna och fråga Jesper. Blir en rad i grinden sämre: fråga
Jesper med ett förslag och ja/nej.

## Klart när

- T1 och T6 är gröna: ett nytt land med samma namn som landet under ger två kort, också efter att det fått namn.
- De sju landfallen är redovisade ett och ett i den nya p0921k: löst, löst av Remsan först, eller kvar med orsak.
- Saknade kort i p0921k är färre än i den nya baslinjen från steg 0, och ingen annan rad i grinden blir sämre.

Pusha till main när grinden håller (samma villkor som prompt E). Spara sedan om uppspelarens baslinje i en egen commit
och säg till de andra sessionerna. I Linear: kommentera MES-347 för en icke-expert med måtten före och efter, och
flytta den till Redo att testas med det Jesper ska prova vid bordet. Tar sessionen slut innan dess: tillbaka till
Todo, med en kommentar om grenen.

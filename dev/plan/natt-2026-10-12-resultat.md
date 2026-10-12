# Natten 2026-10-11 → 12: resultat

**På main:** nya kort syns direkt på mattan (läsmarkeringen) · kort som flyttas eller skyms försvinner inte längre till handen eller dyker upp igen som nya · ett kort som tappas eller tappas upp byter läge på mattan när formen tydligt säger det
**Stoppat:** inget av de tre stegen. Det valfria steg 4 (Sonnet mot Opus) kördes inte — prompt för egen session finns. Kön stod still 01:37–07:42 och kolla.sh hängde 72 min — båda rättade, se sist. Allt pushat först vid 11.
**Prova i den här ordningen** (ett Mirror-parti med en vald lek, samma bord som i går):
1. Lägg ned nya kort: de syns direkt som suddiga foton som klarnar och får namn.
2. Tappa ett kort och flytta det i sidled: samma kort flyttar, ingen animering mot graveyard.
3. Flytta ett Island i sidled och håll handen över ett annat: båda står kvar.
4. Flytta två kort åt höger: båda flyttar, inget "NOT IDENTIFIED".
5. Tappa en Mountain och tappa upp ett Island: mattan följer inom någon sekund, också när korten ligger tätt.
6. Ta upp ett kort på handen: det ska fortfarande gå till handen.
**Ditt val:** ett kort som telefonen tappar vid bildkanten står kvar högst 60 s. Det rätta är att telefonen säger var kantkortet ligger — ärendet finns i Triage (MES-369). Alla fem ärenden står i Redo att testas.
**Inget ligger kvar:** nattens tolv worktrees och grenar är borttagna, main-mappen är i fas, produktionen kör den pushade sidan. Två andras worktrees (`agent-abc4dbe…`, `mirror-zoom-0`) är orörda.

---

## Vad som var fel och hur det är rättat

### 1. Ett nytt kort syntes först efter en stund, eller som "NOT IDENTIFIED" (MES-362)

**Det du såg:** när du lade ned ett kort hände ingenting på mattan förrän kortet var läst, och
ibland kom "NOT IDENTIFIED" fast kortet bara inte hunnit läsas.

**Rättat så här:** kortet läggs ned på mattan direkt när du släpper det, med kamerans foto av
kortet, suddigt. Fotot klarnar medan kortet läses (som en polaroid som framkallas), och när namnet
finns blir det kortet. "NOT IDENTIFIED" kommer först när kortet verkligen inte går att läsa och du
behövs. Motståndaren ser aldrig fotot skarpt. Väntan på Claude är kortad från 15 till 5 s, eftersom
Claude i dina partier svarat på 2,6 s i median.

**Granskningen hittade** att ett andra spår en kort stund på ett oläst kort kunde ge två suddiga
kort ovanpå varandra i en och en halv sekund. Rättat innan det slogs ihop.

**Mätt:** golden lika bra som innan (97 av 119 kort rätt namn, inga fel namn).

### 2. Ett kort som flyttades eller skymdes försvann till handen och kom tillbaka som ett nytt (MES-341, MES-343, MES-356)

**Det du såg i går kväll:**
- du flyttade ett tappat Expel i sidled → det flög mot graveyard och hoppade tillbaka (4:25)
- du flyttade ett Island och höll handen över det andra → ett Island gick till handen (5:25), och
  kom sedan tillbaka som ett nytt kort via Claude (6:20)
- du flyttade Expel och Relic Sloth åt höger → bara Relic Sloth flyttade; Expel kom upp som ett
  "NOT IDENTIFIED" längst till höger, och gick sedan till handen (7:00–8:30)

**Orsaken:** när ett kort flyttas eller skyms av handen tappar kameran det en kort stund och börjar
följa det som ett nytt kort. Datorn tog det gamla som "borta" (till handen) och det nya som ett
nytt kort, i stället för att förstå att det var samma kort som flyttats.

**Rättat så här** (bara på datorn — telefonens kod är orörd):

| Problem | Rättat så här |
|---|---|
| Datorn trodde inte på flytten när kameran gissade fel namn på det flyttade kortet ("Relic Sloth?" fast båda Relic Sloth i leken redan låg på bordet) | Ett namn som inte kan stämma — alla exemplar i leken ligger redan säkert någon annanstans — räknas inte. Kräver en vald lek |
| En gammal gissad flytt lades tillbaka på gamla platsen | Bara inom några sekunder; sedan står flytten |
| Graveyard "tog" kortet innan kameran hunnit läsa det | Graveyard väntar på läsningen |
| Telefonen säger "något oläst ligger vid bildkanten", och datorn tog kortet som försvann då som borta | Det kortet står kvar, högst 60 s |

**Före → efter** (uppspelning av gårdagens parti):

| Scen | Före | Efter |
|---|---|---|
| Island flyttas, handen över det andra | ett Island till handen | båda kvar |
| Island tillbaka som nytt kort | ja | nej — samma kort flyttar |
| Expel och Relic Sloth åt höger | Expel blir "NOT IDENTIFIED", sedan till handen | båda flyttar, inget "NOT IDENTIFIED" |
| Expel till handen 4:15 (du tog upp det) | rätt | rätt |

Scenen med det tappade Expel mot graveyard gick inte att se i uppspelningen (loggen sparade inte
graveyard-högen); regeln är provad på bänken, och loggen sparar högen från och med nu.

**Kvar:** i slutet av partiet växte kamerans ruta för Expel plötsligt uppåt förbi bildens kant — som
om något vid överkanten smälte ihop med kortet. Telefonen slutade då rapportera kortet och sa bara
"något ligger vid kanten", utan att säga var. Datorn håller kvar kortet i 60 s, sedan går det till
handen. Det rätta är att telefonen skickar var kantkortet ligger: **MES-369** (i Triage).

### 3. Ett tappat kort stod kvar som otappat, eller tvärtom (MES-293)

**Det du såg:** du tappade Island och Mountain — bara Island tappades på mattan, Mountain inte alls
(1:47). När du tappade upp Island stod det kvar som tappat i 80 sekunder (2:46).

**Orsaken:** telefonen bestämmer tap-läget genom att jämföra kortets vinkel och form med det mått
den tog när kortet fick namn. Det måttet var fel för båda korten: Islands mått hade fått med en bit
av grannkortet (för brett), och Mountains var för fyrkantigt för att vara ett kort. Med fel mått såg
varje ny bild "otydlig" ut, och då ändrar telefonen aldrig tap-läget.

**Rättat så här** (telefonens kod):

| Problem | Rättat så här |
|---|---|
| Ett mått som tagit med en granne, eller är för fyrkantigt, blev kortets form | Ett mått godtas bara om det har ett korts proportioner (kortsida/långsida 0,66–0,78); annars provas nästa bild |
| Ett kort utan eget mått fick aldrig någon tap-dom | Det jämförs med de andra korten på bordet |
| Kamerans ruta kunde ta mått från en hand som vuxit ihop med kortet | Rutan får bara bli kortets mått när kortet får namn eller ligger stilla |

Vinkelgränserna (när ett kort räknas som tappat) är orörda — de är ditt val.

**Före → efter** (gårdagens parti, sekunder där mattan visade fel tap-läge medan kortet låg stilla,
uppskattat ur loggen): Island 79 → 0 s, Mountain 50 → 0 s, Test of Talents 0 → 0 s (tappades först
vid 90° — det kräver andra vinkelgränser, ditt val).

**Mätt:** golden lika bra (97 av 119 rätt namn, inga fel namn). Ett litet mått blev sämre: i ett
fall flyttar ett tappat kort under handen en gång för mycket på mattan. Det är kvar som en känd
sidoeffekt.

---

## Utöver kön

- **Golden-kön fastnade i sex timmar (01:37–07:42).** Kön väntade på att golden-profilen skulle bli
  ledig genom att leta efter processer med profilens sökväg — och hittade sina egna väntande skal,
  som hade samma sökväg i sitt kommando. Inget fel visades. Rättat med `dev/golden/ko.sh`, som
  låser profilen med ett riktigt lås, bara räknar Chrome som upptagen och ger upp högljutt efter
  30 min.
- **kolla.sh hängde i 72 min** (huvudlös Chrome i hogarna-bänken, samma kod gick på 33 s vid
  omkörning). Nu har varje steg i kolla.sh en tidsgräns på 10 min och körs om en gång om det hänger.
- **Sonnet mot Opus** (nattens valfria steg 4) är inte kört; prompten för en egen session ligger i
  `dev/plan/prompt-2026-10-12-sonnet-mot-opus.md`.
- Mätningarna ligger i `dev/diagnos/natt-2026-10-12/` (gitignorerad).

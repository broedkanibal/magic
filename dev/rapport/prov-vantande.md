# Väntande prov för `dev/avstamning.cjs`

**LÄS-MIG:** proven här **fäller på dagens main** (981946c, 2026-10-14). De ligger inte i
`dev/avstamning.cjs`, för då blir `sh dev/kolla.sh` röd. Varje prov läggs in i `avstamning.cjs`
**i samma commit som fixen** (regeln i `dev/rapport/LÄS-MIG.md`: en fix ur en rapport tar med sitt
testfall), och sektionen här tas bort i samma commit.

**Var:** sist i `dev/avstamning.cjs`, före de tre slutraderna (`console.log([...ok, ...fel]…`,
`console.log(\`\n${ok.length} OK…`, `process.exit(…)`). Proven använder bara hjälparna som redan finns
där (`stam`, `klar`, `box`, `tid`, `klocka`, `PORT`, `LANGT`, `iHanden`, `app.bildRor`, `app.matcha`).

**Så provades de:** en kopia av `avstamning.cjs` med alla prov nedan inlagda före slutraderna
(inte den incheckade): `341 OK` på main blev `342 OK, 3 FEL` — H1, R-0012 och R-0011 fäller,
H2 (se nedan) går igenom.

Källa: analyserna av Jespers problemrapporter natten 2026-10-13
(`dev/diagnos/natt-2026-10-13/fall/hogar-prov-H1.js`, `…/analys-R11-R13/prov-R11-R12.txt`,
`…/analys-R11-R13/motor-ror.patch`; gitignorerat).

| Prov | Rapport | Issue | Vad som är fel på main |
|---|---|---|---|
| H1 | R-0005 | MES-380 | två Mountain omlott: det fel kortet tappas på mattan |
| R-0011 | R-0011 | ny issue | en stilla hand över Expel tar kortet till handen efter 0,6 s |
| R-0012 | R-0012 | ny issue | ett kort utan spår och kameraläge tas aldrig bort, inte ens av Match |

---

## H1 — två Mountain omlott, fel kort tappas (R-0005, MES-380)

**Vad provet visar:** två Mountain ligger omlott (det bakre har `under: [57]`). Spelaren tappar det
som ligger överst. Telefonen byter samtidigt spårens id: id 55 går till det tappade ovanpå-kortet och
57 till det bakre. Mattan ska tappa kortet som ligger överst fysiskt och låta det bakre vara otappat.
På main tappas fel kort.

**FEL på main:**

    FEL  H1 (R-0005) två Mountain omlott: ovanpå-kortet tappas, spåren byter id → rätt MATTA-kort tappat — kortet som ligger överst fysiskt är tappat på mattan

Konstanterna `BACK`, `TOP`, `TOPLAND` och `dist` följer med provet (de krockar inte med något i
`avstamning.cjs`).

```js
/* ── Hög-prov ur rapporterna R-0004 / R-0005 (2026-10-13) ── */
const BACK = box(0.40, 0.40, 0.063, 0.088), TOP = box(0.405, 0.425, 0.063, 0.088);
const TOPLAND = box(0.405, 0.425 + 0.088 - 0.063, 0.088, 0.063);
const dist = (k, b) => Math.hypot(k.kam.x - (b.x + b.w / 2), k.kam.y - (b.y + b.h / 2));
prov('H1 (R-0005) två Mountain omlott: ovanpå-kortet tappas, spåren byter id → rätt MATTA-kort tappat', () => {
  stam([klar(55, 'Mountain', { sen: 0, vilar: true, under: [57], ...BACK }), klar(57, 'Mountain', { sen: 0, vilar: true, ...TOP })]);
  klocka.t += 150; stam([klar(55, 'Mountain', { sen: 0, vilar: true, under: [57], ...BACK }), klar(57, 'Mountain', { sen: 0, vilar: true, ...TOP })]);
  assert.equal(app.kort.length, 2);
  const kBack = app.kort.find(k => k.spar === 55), kTop = app.kort.find(k => k.spar === 57);
  /* telefonen ger id 55 till det tappade ovanpå-kortet och 57 till det bakre */
  klocka.t += 150; stam([klar(55, 'Mountain', { tappad: true, sen: 0, vilar: true, ...TOPLAND }), klar(57, 'Mountain', { sen: 0, vilar: true, ...BACK })]);
  tid(klocka.t + 1500); stam([klar(55, 'Mountain', { tappad: true, sen: 0, vilar: true, ...TOPLAND }), klar(57, 'Mountain', { sen: 0, vilar: true, ...BACK })]);
  assert.equal(app.kort.length, 2, 'fortfarande två kort');
  assert.equal(kTop.tapped, 1, 'kortet som ligger överst fysiskt är tappat på mattan');
  assert.equal(kBack.tapped, 0, 'det bakre kortet är otappat på mattan');
});
```

**H2 (R-0004) hör inte hit:** samma källfil har ett andra prov, *två Mountain omlott: båda spåren dör
och föds om — kortet som låg bak ligger bak*. Det **går igenom på main** (`kBack.spar 40, avstånd till
bak 0.000, till topp 0.025`) och är därför inget väntande prov. Det kan läggas in i `avstamning.cjs`
när som helst som ett vaktprov (det behöver `BACK`, `TOP` och `dist` ovan).

---

## R-0011 — en stilla hand över kortet tar det till handen (ny issue)

**Vad provet visar:** Expel ligger på mattan. En hand kommer in över kortet: spåret dör medan bilden rör
sig (`bildRor = true`). Sedan ligger handen still över kortet — bilden är lugn och telefonen har inget
handspår. Efter 0,6 s flyttar mattan Expel till handen, fast kortet ligger kvar under handen.

**FEL på main:**

    FEL  R-0011 en hand som ligger stilla över kortet (inget handspår, bilden lugn efter första rörelsen) flyttar inte kortet till handen — kortet ligger kvar under handen

```js
prov('R-0011 en hand som ligger stilla över kortet (inget handspår, bilden lugn efter första rörelsen) flyttar inte kortet till handen', () => {
  app.bildRor = true;
  stam([klar(1, 'Expel', { sen: 0, ...PORT })]);
  const k = app.kort[0];
  klocka.t += 150; stam([]);                     // spåret dör när handen kommer (ror: bilden rör sig)
  app.bildRor = false; klocka.t += 1300; stam([]);   // handen ligger still över kortet: bilden lugn, ingen hand i spårlistan
  tid(klocka.t + 600);
  assert.ok(app.kort.includes(k), 'kortet ligger kvar under handen');
});
```

**Patchen för Mat test (applicera den inte här).** Mat test-motorn skickar inte telefonens `ror` och
`kantFlagga` vidare till appen, så R-0011 syns inte i ett Mat test-fall förrän motorn gör det som
`kamTogsEmot` gör. Patchen nedan gör det. Den **ändrar golden-fallens och Mat tests rader** (alla fall
får plötsligt `ror`), så den hör hemma i fixens commit, med en ny Mat test-baslinje och en förklaring —
inte här.

```diff
diff --git a/dev/mattest/motor.js b/dev/mattest/motor.js
index 6f93ed2..543a870 100644
--- a/dev/mattest/motor.js
+++ b/dev/mattest/motor.js
@@ -412,6 +412,7 @@
      avstämningen, sedan avstamBord. */
   function tillampa(r) {
     if (r.grund !== undefined && r.grund !== kamGrund) { kamGrund = r.grund; try { visaKamGrund(); } catch (e) {} }
+    kamBildRor = r.ror === undefined ? null : !!r.ror; kamFlaggar = !!r.kantFlagga;   // TILLFÄLLIGT (R-0011): telefonens ror och avskuren som i kamTogsEmot
     avstamBord(r.spar || [], r.nollstall, r.fas, undefined, undefined, r.grav);
   }
   /* Händelserna: rapporterna och telefonens hjärtslag (var tredje sekund
```

---

## R-0012 — ett kort utan spår och läge tas aldrig bort, inte ens av Match (ny issue)

**Vad provet visar:** Island, Mountain och Expel ligger på mattan. Island och Mountain har tappat sitt
spår och sitt kameraläge (`kam`, `spar`) — som efter en omladdning, när korten kommer ur molnet. Telefonen
ser bara Expel. Spelaren trycker *Match the camera*: Island och Mountain syns inte i bilden och ska bort.
På main ligger de kvar — enligt analysen tar Match bara bort kort som kameran själv lagt ut.

**FEL på main:**

    FEL  R-0012 Match tar bort ett kort utan spår och utan kam (kvar från en omladdning), inte bara kort kameran själv lagt ut — Island och Mountain syns inte i bilden: Match tar bort dem

```js
prov('R-0012 Match tar bort ett kort utan spår och utan kam (kvar från en omladdning), inte bara kort kameran själv lagt ut', () => {
  stam([klar(1, 'Island', { sen: 0, ...PORT }), klar(2, 'Mountain', { sen: 0, ...LANGT }), klar(3, 'Expel', { sen: 0, ...box(0.2, 0.2, 0.063, 0.088) })]);
  const [a, b] = app.kort;
  for (const k of [a, b]) { delete k.kam; delete k.spar; delete k.borta; }   // som efter en omladdning: kortet kommer ur molnet utan spår och läge
  stam([klar(3, 'Expel', { sen: 0, ...box(0.2, 0.2, 0.063, 0.088) })]);      // telefonen ser bara Expel
  app.matcha();
  assert.ok(iHanden(a) && iHanden(b), 'Island och Mountain syns inte i bilden: Match tar bort dem');
});
```

Obs för fixen: provet kräver att korten hamnar **i handen** (`iHanden`), samma väg som Match tar för
andra kort som inte syns. Är det fel destination för ett kort utan spår (t.ex. graveyard) ska provet
ändras i fixens commit, med skälet.

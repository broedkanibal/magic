# Prompt: varje kort med läsbart namn blir ett kort i appen — som i bänken

Föreslagen modell och effort: **Fable 5.1, xhigh** (`mesa-bygg-tung`-klassen: dubblettregeln,
spärren mot fel namn och remsläsningen rörs, och 0 fel namn står på spel). Kör i en **egen
worktree** med `.env.local` och `dev/material` symlänkade (minnet `worktree-saknar-env-local`),
golden på **egen port** (minnet `golden-egen-port`), aldrig två golden samtidigt.

Klistra in allt nedanför strecket.

---

Få appens detektering och namnigenkänning i landhögar att ge samma svar som bänkarna gav när
modellen tränades och mättes: **varje kort vars namn går att läsa i bilden ska bli ett kort i appen,
med rätt namn, och inget fel namn får bli säkert.** Jag har inga användare: pusha och driftsätt på
main utan att fråga, men mät före och efter varje steg, och skriv rakt ut vad som är mätt och vad
som är bedömt.

## Läs först

- `dev/material/hogar-2026-10-02/landhogar.html` — bilderna: varje kort i landhögarna som saknas
  eller är osäkert, exakt det appen skickade till igenkänningen, och var det går fel. Allt nedan
  bygger på den. `kor.log` och `besk/` i samma mapp är underlaget.
- Minnena `mes-329-tranad-detektor-i-appen`, `mes-328-remsans-namn`, `golden-egen-port`,
  `kontroller-som-ljuger`, `flera-sessioner-samma-arbetstrad`.
- `dev/golden/SNABBGUIDE.md` och raden 2026-10-02 i `dev/golden/historik.md`.
- CLAUDE.md: systemprompten i `api/identify.js` rörs inte. Linear via `dev/linear-agent/klient.cjs`
  med text via fil.

## Läget, mätt 2026-10-02 (main c1f6ffa, lokalt utan Claude)

Åtta landhögar i golden. Alla kort hittade i 6 av 8, alla namn säkra och rätt i 3 av 8.
Inget kort i någon hög har fått fel namn säkert.

| Hög | Fel | Var det går fel (mätt) | Rättelse (bedömd) |
|---|---|---|---|
| **04** Plains under Plains, ~19 px förskjutet | saknas | Detektorn hittar kortet (låda 0,70) och remsan läser Plains **säkert** (0,183). `sammaKortSom` slänger det ändå: `skildaRemsor` kräver att remsorna täcker varandra < 30 %, men det översta kortets remsa (185×67 px) rymmer båda titlarna och täcker det undres (183×45) nästan helt. **Linear-texten på MES-330 "kantkortet får ingen låda" är fel.** | Döm på avståndet mellan remsornas **mittpunkter** i remshöjder (här ~0,4) i stället för täckning. Två lådor på samma kort har nästan samma remsmitt. |
| **06** bakersta Swamp (24 % syns) | osäkert | Beskärningen maskas aldrig: korten ligger på tvären och Plains remsmitt hamnar utanför Swamps låda (`inneI` i `fyndUrLador`), så ingen `tackt`. Utan mask läses ingen remsa (`medRemsa`), och modellen ser tre kort. | Läs remsan för varje **osäkert spår som ligger omlott** (`omlott`), också utan mask. Remsan har sin egen gräns 0,15. |
| **06** mittersta Swamp (43 % syns, namnet läsbart) | saknas | Var markerat dolt i facit till 2026-10-02 — **nu ett kort som ska hittas** (facit och LÄS-MIG ändrade, ocommittat i huvudträdet: committa det först). Inget spår i dagens körning. **Omätt:** om detektorn ger en låda eller inte. | Steg 1 nedan avgör. |
| **13** understa Swamp | saknas | **Omätt:** låda saknas, eller slogs spåret ihop med kortet ovanpå? Titelraden 11–13 px; textläsaren hoppar över allt ("liten"). | Steg 1. Upplösningen rättas inte här. |
| **14** två täckta Plains i gröna fickor | osäkra | Remsan har Plains överst men marginal 0,021 och 0,08 mot 0,15. Titeln är ~20 % av remsans bredd, resten är **fickans kant** och kortet ovanpå; remsleken är byggd ur kort utan ficka. Textläsaren läser hela bredden och får skräp. | Textläsaren på **titelns del** av remsan (vänstra ~halvan, uppskalad); skär bort fickkanten före jämförelsen. **Inte** sänka gränsen eller lyfta svaga remsor (förkastat: 26–59 % rätt). |

Bänken (MES-329) gav 74/74 på de åtta stillbildsfallen med "kortlåda ELLER remsa". Appen räknar
bara lådor som kort (`T.detRemsa: 0`), för att remsor utan låda gav 2 falska i 09.

## Steg — ett i taget, golden före och efter varje

**0. Baslinje.** Committa facit-ändringen för 06. Kör `node dev/golden/kor.cjs --port <din>` på alla
16 i två satser (01–08, 09–16) och `--ai` på 03–06, 14–16 (13 dör med `--ai`, lämna den). Spara med
`--spara` — det är baslinjen *med det nya facit*. Notera att 06 nu visar 11/12.

**1. Mät lådorna, inte spåren.** `kor.cjs --detlogg --konsol --fall 04,06,13,14` skriver detektorns
lådor, remsor och täckningar. Räkna per facit-kort i landhögarna: låda? remsa? Skriv tabellen i
`dev/material/hogar-2026-10-02/lador.md`. Det avgör om 06:s mittkort och 13:s undre Swamp är
detektorns fel eller spårningens — och om `detRemsa` behövs alls.

**2. 04: dubblettregeln.** `skildaRemsor` → mittpunktsavstånd i remshöjder, med gräns i `T` (prov
med `--tro`). Grind: 04 → 8/8, inga nya falska eller fel namn i 01–16, och 15:s täckta Plains kvar.

**3. 06: remsan utan mask.** I `medRemsa`/`identifiera`: ett osäkert spår med `omlott` läser remsan
också när `maskad` är false. Spärren i `svarAI` rörs inte. Grind: 06:s bakersta Swamp säkert, 0 nya
säkra fel på alla 16 (remsan ska aldrig säga fel säkert — det är hela poängen med gränsen 0,15).

**4. Remsor utan låda — bara om steg 1 visar att kort saknar låda.** Mät en snävare regel än
`detRemsa: 'alla'`: `Detektor.para` har `skapa: 'fria'` (bara remsor utanför varje låda). Snäv
regel: en fri remsa blir ett kort bara när den ligger i en annan lådas kant (som i en hög). Grind:
09 utan falska, 04/06/13 får sina kort. Får 09 falska: lämna av och skriv varför.

**5. 14: remsan i ficka.** Mät först i bänken (`dev/remsa/`, `detektor_remsor.py` mot `remsor.py`
med exakta hörn) hur mycket av 14/15:s tapp som är remsans *geometri* (detektorns remslåda mot
facits hörn). Sedan i appen: (a) `Namn.lasBand` på titelns del av remsan, (b) skär fickkanten
(mörk/grön rand) innan `KamEmbed`. Grind: 14 → två täckta Plains säkra via ett andra vittne, 0
säkra fel över golden + MES-246-remsorna (`dev/remsa/nollprov.py`).

**6. Avslut.** Golden alla 16 + `--ai`, `--spara`, raden i `historik.md`, baslinje. Fristående
granskning av diffen (Agent) före merge, och efter varje rättelse. Rätta Linear-kommentaren på
MES-330 om 04:s kantkort (som agenten, text via fil). Ett commit per steg, med vad som var fel,
vad som mättes och vad som ändrades.

## Hårda krav

- **0 nya säkra fel namn** över alla 16 fall och i `--ai`. Ett steg som ger ett säkert fel backas,
  hur många namn det än ger.
- Detekteringsmått (lådor, spår) och namnmått hålls isär i varje tabell.
- `T.detRemsa` slås inte på i förvalet utan steg 4:s mätning.
- Inga ändringar i systemprompten. Ingen ny regel som lyfter osäkra remsor till säkra.

## Kodpekare

`index.html`: `skildaRemsor`/`sammaKortSom` (~25604), `maskaTackt` (~25338), `fyndUrLador` med
`inneI`/`tackt`/`omlott` (~23646), `Kamera.lasRemsa`, `medRemsa`, `identifiera` (~25445),
`svarAI`, `Detektor.para` (`skapa`), `T` (`remsa`, `remsaTroskel`, `remsaVittne`, `detRemsa`,
`bakDet`), `Namn.lasBand` (~20236, `BAND_REMSA`, `REMSA_MAL_PX`), `KamEmbed.byggRemsor`.
`dev/golden/kor.cjs`: `--detalj`, `--beskarningar`, `--detlogg`, `--konsol`, `--tro`, `--fall`.
`dev/material/hogar-2026-10-02/panel.py` ritar facit + spår över en hög (grönt facit, orange spår,
rött kastat) — återanvänd den för före/efter-bilder.

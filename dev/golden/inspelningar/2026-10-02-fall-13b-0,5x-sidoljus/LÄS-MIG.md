# Golden 13b — inspelningen att rita facit på (MES-331)

Jespers inspelning 2026-10-02: **samma manus som golden 13** (MES-246, tur 1–4,
steg 1–22), men på träbord utan matta och med lampan snett från sidan.

| | |
|---|---|
| Video | `dev/material/inspelningar/2026-10-02-fall-13b-0,5x-sidoljus/telefon.mov` (gitignorerad) |
| Format | 3840×2160, 30 rutor/s, 183,1 s, 0,5× vidvinkel, liggande |
| Bord | träbord, ingen matta; lampans reflex mitt i bilden |
| Grundläge | `v` — ett otappat kort står lodrätt i bilden |

## Vad som ligger här

| Fil | Vad |
|---|---|
| `kort.txt` | manuset, en rad per steg (22 rader), samma ordlista som MES-246:s `kort.txt` |
| `facit-slapp.json` | 23 steg ur rörelsen: `t_borjar`, `t_land`, `t_slapp`, `t_stilla`, lådan, och namnet på de 12 nedläggningarna |
| `FACIT.md` | samma sak som tabell |
| `matning/` | mellanleden (`facit.json`, `steg-sort.json`, `fonster.json`, `regioner.json`, `namn.json`) |
| `lagen.json` | skapas av ritverktyget när Jesper ritar |

Framtaget med samma kedja som MES-246 (`dev/las-fore-slapp/`), nu parametriserad:

```bash
STEGA="--till 181" SORTERA="--tomt 4.5" KLIPP=0 bash dev/las-fore-slapp/kor-allt.sh \
  dev/material/arbete/2026-10-02-mes-331-fall-13b/arb \
  "dev/material/inspelningar/2026-10-02-fall-13b-0,5x-sidoljus/telefon.mov" \
  "dev/golden/inspelningar/2026-10-02-fall-13b-0,5x-sidoljus/matning"
cp dev/golden/inspelningar/2026-10-02-fall-13b-0,5x-sidoljus/matning/namn.json \
  dev/material/arbete/2026-10-02-mes-331-fall-13b/arb/
node dev/las-fore-slapp/facitfil.cjs dev/material/arbete/2026-10-02-mes-331-fall-13b/arb \
  --ut "dev/golden/inspelningar/2026-10-02-fall-13b-0,5x-sidoljus" \
  --video "dev/material/inspelningar/2026-10-02-fall-13b-0,5x-sidoljus/telefon.mov" \
  --rubrik "golden 13b, MES-331" --manus-steg 22
```

Två skillnader mot MES-246, båda flaggor:

- **`--tomt 4.5`** (sortera.cjs): på svart matta säger ljuset om ett kort
  kommit eller gått. Träbordet är lika ljust som korten, så domen görs i
  stället mot det tomma bordet vid 4,5 s: såg lådan ut som tomt bord före
  och/eller efter?
- **`--till 181`** (stega.cjs): från 181 s rör sig hela bilden när telefonen
  stoppas. Det är inget steg och kommer inte med.

## Stegen mot manuset: 22 av 22

Rörelsen ger 23 steg. Steg 2–23 är manusets steg 1–22 i ordning, ett mot ett;
ritverktygets parning ger samma sak (12 ankare ur nedläggningarna).

| Steg i filmen | Tid (stilla) | Manus | Vad |
|---:|---:|---:|---|
| 1 | 3,5 s | – | en skugga lämnar bordets nederkant; inget kort (läget visar det tomma bordet med leken) |
| 2 | 7,8 s | 1 | Swamp, hög A |
| 3 | 11,6 s | 2 | Thriving Moor, tappad |
| 4 | 19,3 s | 3 | untappa Thriving Moor |
| 5 | 23,4 s | 4 | Plains, hög B |
| 6 | 30,5 s | 5 | tappa hög A och B |
| 7 | 35,1 s | 6 | Fencing Ace |
| 8 | 40,5 s | 7 | untappa hög A och B |
| 9 | 46,8 s | 8 | Swamp på hög A |
| 10 | 56,9 s | 9 | tappa hög B och Thriving Moor |
| 11 | 64,1 s | 10 | Ancestral Blade |
| 12 | 74,0 s | 11 | token Soldier |
| 13 | 88,2 s | 12 | Ancestral Blade fästs under token Soldier |
| 14 | 97,7 s | 13 | tappa hög A |
| 15 | 111,8 s | 14 | Pharika's Chosen |
| 16 | 122,7 s | 15 | untappa hög A, hög B och Thriving Moor (en rörelse) |
| 17 | 127,5 s | 16 | tappa Fencing Ace |
| 18 | 131,9 s | 17 | Plains på hög B |
| 19 | 140,1 s | 18 | tappa hög B |
| 20 | 149,6 s | 19 | Mirran Bardiche |
| 21 | 154,8 s | 20 | token Rebel |
| 22 | 167,5 s | 21 | Mirran Bardiche fästs under token Rebel |
| 23 | 174,5 s | 22 | Ukud Cobra |

## Avvikelser från manuset

Sedda i filmen, inte gissade:

1. **Tokens har bytt kort.** Manuset: Soldier = Swamp *i* ficka, Rebel =
   Plains *utan* ficka. I filmen ligger Soldier (den Ancestral Blade fästs
   under, steg 12–13) som en **Magic-baksida utan ficka**, och Rebel (den
   Mirran Bardiche fästs under, steg 21–22) **i grön ficka**. Namnge tokens
   efter rollen: `token Soldier` och `token Rebel`, som i `kort.txt`.
2. **Tappningarna är ~60–70°, inte 90°.** Alla tappade kort och högar är
   vridna en bit mer än halvvägs. Verktyget räknar tappat från 45°, så det
   går — men det är inte ett rent kvartsvarv som i MES-246.
3. **Placeringen** följer inte skissen i manuset, utan "en fri plats":
   Ukud Cobra längst upp till vänster (vänster om Fencing Ace), Mirran
   Bardiche och Rebel-tokenen långt till höger i övre raden. Leken ligger
   längst till vänster; graveyard är tom i tur 1–4 och syns inte.
4. **Mirran Bardiche** ligger i en klar ficka och står i lampans reflex —
   namnet var svårläst i den stilla rutan; ordningen i manuset avgör.

Inga steg saknas och inget extra kort kommer in.

## Rita

```bash
node dev/golden/rita-server.cjs
```

Öppna <http://localhost:8287/> (eller **mesa-rita** i browserpanelen), välj
**fall-13b** i listan uppe till vänster. Det är **23 lägen**; läge 1 är det
tomma bordet (bara leken, rita den med B).

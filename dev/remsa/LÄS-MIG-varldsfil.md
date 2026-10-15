# Världsfilen (MES-375, etapp 2a)

Alla Magic-kort som bildmodellens fingeravtryck, i **en fil** som telefonen laddar ned en gång och
söker i när ett nytt kort inte finns i leken eller minnet (trappans steg 3, kopplas in i MES-376/377).

| Del | Fil |
|---|---|
| Byggare, läsare och mätning (Python) | `dev/remsa/varldsfil.py` |
| Läsaren i telefonen (JS, `window.Varld`) | `dev/embed/varld.js` |
| ORB per par (huvudlös Chrome) | `dev/embed/varldsfil-orb.html` |
| Kontrollerna JS = Python | `dev/embed/varldsfil.html` |
| Uppladdningen till Supabase | `dev/remsa/varldsfil-ladda-upp.cjs` |

Allt stort (filerna, frågorna, ORB-cachen, mätresultaten) ligger i
`dev/material/arbete/2026-10-15-mes-375-varldsfil/`, inte i git.

## Vad filen är

Världen är G1:s (`varlden.py`): Scryfalls `unique_artwork`, 49 546 konstverk, 33 223 namn, med
vektorerna som redan räknats med appens modell (`mobileclip-s0-vision.onnx`, nyckeln
`mobileclip-s0|v1` som `embed.js`). Inget räknas om när filen byggs.

```
"MESV"  uint32 huvudlängd  JSON-huvud  [delar på 8-bytegränser, little-endian]
```

| Del | Typ | Innehåll |
|---|---|---|
| `medel` | f32 [512] | världens medelvektor; frågan centreras mot den |
| `pca` | f32 [d × 512] | bara i PCA-varianterna: projektionen |
| `vek` | int8 eller f16 [N × d] | referenserna, centrerade och normerade |
| `skala` | f32 [N] | int8: 1/‖q‖ per vektor (den dekvantiserade vektorn är en enhetsvektor) |
| `namnidx` | u16 [N] | referensens namn (index i `namn`) |
| `bild` | u32 [N] | referensens konstverk (index i `bild_id`) |
| `bild_id`, `bild_sida` | u8 [M × 16], u8 [M] | Scryfall-id och sida — 2b hämtar small-bilden till ORB |
| `namn` | utf8 | namnen, radbrutna; basland som typ (Plains … Wastes) |

Huvudet säger version, modell, variant, dim, antal, kvantisering och receptet. Sökningen är samma
som bänkens: frågan i fyra vridningar, minus medel, normerad (projicerad och normerad igen om filen
har PCA); poäng per namn = bästa referensen; vridningen med högst etta gäller; marginal till nästa
namn. **Bildmodellen är aldrig ensam vittne** mot världen: ORB ska bära ettan (G1).

`int8` är symmetrisk per vektor: hela int8-området för varje referens, och skalan gör den
kvantiserade vektorn till en enhetsvektor igen, så poängen är cos mot den kvantiserade riktningen.
Per vektor och inte per dimension, eftersom poängen jämförs mellan referenser (bästa per namn,
marginal) — varje referens fel ska vara litet i förhållande till sin egen längd.

## Varianterna

Mätt 2026-10-15 (61 beskärningar, trappans regel; G1 = 24/37 och 0 säkra fel):

| | Vad | rå / gzip MB | första försöket /37 | säkra fel |
|---|---|---|---|---|
| A | fp16, skarp + sudd (= G1, referenspunkten) | 103,5 / 95,2 | 24 | 0 |
| B | int8, skarp + sudd | 53,2 / 45,4 | 24 | 0 |
| C | int8, bara sudd | 27,3 / 22,7 | 0 | 0 |
| C2 | som C, centrerad mot suddens eget medel | 27,3 / 23,4 | 2 | 0 |
| D | int8, en per namn (medel av alla konstverk och båda varianterna); ORB-bilden = konstverket närmast medlet | 18,8 / 16,2 | 12 | 0 |
| E3 | PCA 384 + int8, skarp + sudd | 41,3 / 31,1 | 24 | 0 |
| E1 | PCA 256 + int8, skarp + sudd | 28,3 / 22,1 | 23 | 0 |
| E4 | PCA 192 + int8, skarp + sudd | 21,8 / 17,3 | 21 | 0 |
| E2 | PCA 128 + int8, skarp + sudd | 15,4 / 12,4 | 21 | 0 |
| F1 | int8, en per konstverk (medel av skarp och sudd) | 27,3 / 23,6 | 12 | 0 |
| F2 | PCA 256 + int8, bara sudd | 15,1 / 11,3 | 1 | 0 |

Lärdomen: **både skarp och sudd behövs som egna referenser** — bara sudd, eller de två slagna ihop
till en vektor, faller till 0–12 av 37. Det som går att krympa är dimensionerna (PCA) och talens
storlek (int8).

## Bygga, mäta, kontrollera

Kör inget av det tunga medan golden kör (`node dev/nasta.cjs`, raden "golden kör"). ORB och
kontrollerna startar en egen server och huvudlös Chrome på `--port` (kolla med `lsof -i :PORT`).
`dev/embed/cache/kedjan.js` måste finnas: `node dev/embed/utdrag.cjs`. I en worktree: symlänka
`dev/material`, `.env.local` och `dev/embed/modeller` från main-mappen.

```sh
PY=~/.mesa/detektor-venv/bin/python
$PY dev/remsa/varldsfil.py bygg --variant alla            # alla varianter (+ .gz och storlekarna)
$PY dev/remsa/varldsfil.py matt --variant A,B --port 8395 # mät ur filen, ORB bara för nya par
$PY dev/remsa/varldsfil.py sammanfatta                    # tabellen + sammanfattning.json
$PY dev/remsa/varldsfil.py kontroll-js --variant B --port 8395     # 5a
$PY dev/remsa/varldsfil.py kontroll-modell --port 8395             # 5b (~200 världsbilder)
```

`matt` ger per variant: storlek rå/gzip, rätt överst, bildmodellen ensam vid 0,11, och trappans
regel för alla 61, de 48 oskymda och **första försöket** (nya, oskymda kort som inte är basland,
37 beskärningar). G1 är måttstocken: 24/37 (65 %), 0 säkra fel. Variant A ska återge den.

## Ladda upp

```sh
node dev/remsa/varldsfil-ladda-upp.cjs dev/material/arbete/2026-10-15-mes-375-varldsfil/varld-C.bin.gz             # torrt
node dev/remsa/varldsfil-ladda-upp.cjs dev/material/arbete/2026-10-15-mes-375-varldsfil/varld-C.bin.gz --ladda-upp
```

Lägger filen i bucketen `modeller` under ett namn med innehållets hash
(`varld-mobileclip-s0-v1-C-<sha8>.bin.gz`), skriver aldrig över, och skriver den publika URL:en.
Supabase tar som förval högst 50 MB per fil.

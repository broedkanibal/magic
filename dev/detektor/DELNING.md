# Prov och träning: vilka inspelningar modellen får se (MES-288)

**Regeln, beslutad av Jesper 2026-09-28:** prov och träning hålls isär
**per inspelningstillfälle**. En inspelning som något prov mäter mot får
modellen aldrig se när den tränas — inte en enda ruta ur den, inte ens en
ruta ur en annan del av samma film. Annars mäter provet hur väl modellen
minns, inte hur väl den ser.

## Listan

`dev/detektor/delning.json` har en rad per mapp, med dom och skäl:

| Dom | Betyder | Mappar |
|---|---|---|
| **prov** | får aldrig tränas på | scanbordet 2026-09-08 (golden 01, 02, 08), originalen till fall 07, 09, 10, 11, provkort pass 2 (fall 12), MES-246 (fall 13 + ritade lägen), passet 2026-09-22 (spegelfacit), foton 2026-09-20 (fall 14–16), lekfotot 2026-09-26, `hogbank/`, `rita/`, alla `dev/golden/fall/*` |
| **traning** | får tränas på | partiet 2026-09-21 (hela, 20 min), provkort pass 1 (mörkt), MES-138 och MES-139 (library), provkort-pacifism, grind 1:s rutor och grind 1b:s syntetiska bord (`arbete/2026-09-29-mes-288-synt`, byggda bara ur träningsmappar), och varje mapp som heter `<datum>-traning-…` |
| **oanvandbart** | inga kort på ett bord | designytan 2026-09-09, lekbyggaren MES-183 (skärminspelningar av appen) |

**En mapp som inte står i listan räknas som prov.** En ny inspelning är
alltså skyddad tills någon medvetet skriver in den som träning — eller döper
den `<datum>-traning-<underlag>-<ljus>`, som Jespers träningsfilmer.

Namnet på tillfället är nyckeln, inte platsen: samma namn används i
`dev/material/inspelningar/`, `dev/material/rita/`,
`dev/material/arbete/` och `dev/golden/inspelningar/`, så
`dev/golden/inspelningar/2026-09-19-mes-246-las-fore-slapp/` är prov av samma
skäl som videon.

## Spärren: `delning.py`

Varje skript som väljer rutor, etiketterar eller tränar ska gå genom den:

```python
from delning import krav_traning
krav_traning(sokvag)   # stoppar med ProvLacka om sökvägen inte är träning
```

| Funktion | Gör |
|---|---|
| `krav_traning(sokvag)` | **stoppar med fel** (`ProvLacka`) om sökvägen inte är träning; returnerar den annars |
| `krav_traning_alla(lista)` | samma sak för en lista; stoppar på den första |
| `tillaten(sokvag)` | `True`/`False`, utan att stoppa |
| `klassa(sokvag)` | domen, skälet och vilken listrad som avgjorde |

Så avgörs domen:

1. Varje mapp i sökvägen jämförs med namnen i listan, och med `-traning-`.
2. Ingen träff: **prov** (också en fil i `/tmp` eller en relativ sökväg utan tillfälle).
3. Flera träffar: den **värsta** vinner — prov före oanvandbart före traning.
   En träningsmapp inne i `rita/`, eller en provmapp inne i en träningsmapp, är prov.
4. Både sökvägen som den står och dess **realpath** prövas, och den värsta
   domen vinner. En symlänk i en träningsmapp som pekar på en provvideo,
   eller en mappsymlänk dit, stoppas. En symlänk från en okänd plats till
   träning stoppas också (okänd = prov).

Generiska namn i listan (`hogbank`, `rita`, `fall`) kan ge en falsk
stoppsignal om en träningsmapp råkar ha en undermapp med det namnet. Det är
avsiktligt åt det säkra hållet.

**Det spärren inte ser:** en provbild som *kopierats* (inte länkats) in i en
träningsmapp. Därför tas träningsrutor alltid ur videon med ett skript som
prövar källvideon först (`dev/detektor/larare/rutor.py` gör det), aldrig
genom att kopiera bilder för hand.

## Kör

```sh
python3 dev/detektor/delning.py --test      # självtestet: Jespers beslut, symlänkar, okända mappar
python3 dev/detektor/delning.py --lista     # varje mapp på disk, med dom, och om den står i listan
python3 dev/detektor/delning.py <sökväg> …  # domen per sökväg; slutkod 1 om någon inte är träning
```

Bara standardbiblioteket; ingen venv behövs.

## Ändra listan

Bara Jesper flyttar en inspelning mellan prov och träning. Lägg till nya
mappar med skäl när de kommer — `--lista` säger vilka som saknas. Partiets
händelsefacit (`dev/golden/inspelningar/2026-09-21-parti`, på grenen
`natt-2026-09-22`) står som träning: det följer partiet och används inte som
prov. Byter mappen namn till materialmappens när grenen slås ihop, täcks den
av partiets rad.

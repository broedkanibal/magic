# Facit för inspelningen (golden 13b, MES-331)

Tiderna är videons sekunder. Framtaget halvautomatiskt av skripten i
`dev/las-fore-slapp/` (se `kor-allt.sh`) och kontrollerat mot `MANUS.md`
och `kort.txt`. Måtten är i **360 bildpunkters analysbredd** — samma bredd
som kameran analyserar i, oavsett om videon är 4K eller 1080p.

| Spalt | Vad |
|---|---|
| `börjar` | första rutan med rörelse i steget |
| `land` | kortet är nere: därifrån står det som ligger kvar på sin plats |
| `släpp` | sista rutan där handen rör kortet — mätt som sista rutan där kortets egen ruta inte ser ut som den gör när bordet vilar |
| `stilla` | bordet står stilla igen |
| `låda` | vad som ändrades, i 360 px |
| `namn` | bara för nedläggningar: kortet, avläst ur den stilla rutan |

**Kortets storlek:** 29×38 i 360 px, alltså
309×405 bildpunkter i 4K och
155×203 i 1080p (median; vidvinkeln
gör kort nära bildens mitt större än kort vid kanten).

| nr | börjar | land | släpp | stilla | låda | vad | namn |
|---:|---:|---:|---:|---:|---|---|---|
| 1 | 0.50 | 0.80 | 1.67 | 3.54 | 122×60 | borta |  |
| 2 | 5.17 | 6.70 | 7.87 | 7.80 | 29×38 | **nedläggning** | Swamp |
| 3 | 10.17 | 11.11 | 11.34 | 11.64 | 39×30 | **nedläggning** | Thriving Moor |
| 4 | 16.67 | 18.84 | 18.87 | 19.31 | 41×40 | vridet/flyttat |  |
| 5 | 21.44 | 22.84 | 23.44 | 23.44 | 31×39 | **nedläggning** | Plains |
| 6 | 28.01 | 29.34 | 30.28 | 30.48 | 82×46 | vridet/flyttat |  |
| 7 | 33.91 | 34.75 | 34.78 | 35.05 | 31×38 | **nedläggning** | Fencing Ace |
| 8 | 37.95 | 39.25 | 40.25 | 40.45 | 82×46 | vridet/flyttat |  |
| 9 | 45.78 | 46.55 | 46.65 | 46.82 | 32×40 | **nedläggning** | Swamp |
| 10 | 54.76 | 56.29 | 56.72 | 56.92 | 45×48 | vridet/flyttat |  |
| 11 | 61.59 | 63.56 | 63.86 | 64.09 | 30×38 | **nedläggning** | Ancestral Blade |
| 12 | 71.43 | 72.50 | 72.96 | 73.96 | 28×36 | **nedläggning** | token Soldier |
| 13 | 84.10 | 87.70 | 87.90 | 88.17 | 57×42 | vridet/flyttat |  |
| 14 | 94.37 | 96.34 | 97.40 | 97.67 | 82×47 | vridet/flyttat |  |
| 15 | 110.67 | 111.31 | 111.54 | 111.81 | 30×38 | **nedläggning** | Pharika's Chosen |
| 16 | 116.84 | 120.05 | 122.71 | 122.68 | 122×48 | vridet/flyttat |  |
| 17 | 126.18 | 127.25 | 127.28 | 127.52 | 40×38 | vridet/flyttat |  |
| 18 | 130.82 | 131.32 | 131.68 | 131.88 | 32×41 | **nedläggning** | Plains |
| 19 | 138.45 | 139.02 | 139.95 | 140.12 | 46×51 | vridet/flyttat |  |
| 20 | 148.46 | 149.26 | 149.32 | 149.56 | 28×37 | **nedläggning** | Mirran Bardiche |
| 21 | 153.72 | 154.49 | 154.53 | 154.79 | 29×38 | **nedläggning** | token Rebel |
| 22 | 164.10 | 165.93 | 167.26 | 167.46 | 57×48 | vridet/flyttat |  |
| 23 | 171.93 | 173.70 | 174.13 | 174.47 | 27×36 | **nedläggning** | Ukud Cobra |

## Så mättes det

1. Varje bildruta skalas till 360×202 gråskala (`rorelse.swift`).
2. Rörelsemåttet räknas på **suddade** rutor (`matt.cjs`): inspelningen är
   tagen i lampljus och sensorbruset ger annars utslag över hela bilden
   (medelskillnaden mellan två stilla rutor är 3,2 gråsteg orörd, 0,7 suddad).
3. Ett steg är sammanhängande rörelse med högst en halv sekunds paus i
   (`stega.cjs`). 23 steg hittades mot de 22 stegen i MANUS.md
   (ett steg som "untappa hög A, hög B och Thriving Moor" kan bli flera
   rörelser, och en skugga eller handen kan bli ett eget steg).
4. `släpp` och `land` mäts inne i lådan som ändrades: andelen bildpunkter
   som står som de gör när bordet vilar. Släppet är sista rutan under 97 %.
5. Nedläggningarna (`fonster.cjs`) är de steg där lådan har ett korts mått
   och något ligger kvar efteråt: ljust mot svart matta, eller (med
   `sortera.cjs --tomt`, ljust bord) inte som det tomma bordet.

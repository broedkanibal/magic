# Facit för inspelningen (MES-246)

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

**Kortets storlek:** 33×44 i 360 px, alltså
352×469 bildpunkter i 4K och
176×235 i 1080p (median; vidvinkeln
gör kort nära bildens mitt större än kort vid kanten).

| nr | börjar | land | släpp | stilla | låda | vad | namn |
|---:|---:|---:|---:|---:|---|---|---|
| 1 | 0.08 | 0.08 | 1.28 | 1.49 | 213×59 | nytt (stor låda) |  |
| 2 | 2.20 | 2.20 | 3.46 | 3.47 | 35×4 | nytt (stor låda) |  |
| 3 | 4.32 | – | – | 5.02 | 360×202 | vridet/flyttat |  |
| 4 | 6.69 | 7.66 | 7.79 | 7.78 | 31×43 | **nedläggning** | Swamp |
| 5 | 15.00 | 15.87 | 16.19 | 16.27 | 48×39 | **nedläggning** | Thriving Moor |
| 6 | 21.81 | 23.93 | 24.00 | 24.06 | 48×45 | vridet/flyttat |  |
| 7 | 28.52 | 29.32 | 29.50 | 29.49 | 33×44 | **nedläggning** | Plains |
| 8 | 34.58 | 36.86 | 37.87 | 37.97 | 90×49 | vridet/flyttat |  |
| 9 | 38.52 | 39.18 | 39.22 | 39.43 | 31×43 | **nedläggning** | Fencing Ace |
| 10 | 44.47 | 47.44 | 48.90 | 48.99 | 91×51 | vridet/flyttat |  |
| 11 | 53.17 | 54.47 | 54.60 | 54.69 | 32×43 | **nedläggning** | Swamp |
| 12 | 62.06 | 66.77 | 66.82 | 66.90 | 98×54 | vridet/flyttat |  |
| 13 | 76.76 | 76.76 | 78.08 | 78.10 | 104×130 | vridet/flyttat |  |
| 14 | 79.05 | 81.57 | 84.27 | 84.31 | 145×133 | vridet/flyttat |  |
| 15 | 90.00 | 90.08 | 91.02 | 91.00 | 110×79 | vridet/flyttat |  |
| 16 | 92.38 | 92.38 | 93.77 | 93.78 | 86×48 | vridet/flyttat |  |
| 17 | 96.39 | 96.39 | 96.49 | 96.49 | 23×46 | ändrat på plats |  |
| 18 | 97.39 | 98.94 | 100.84 | 100.86 | 92×81 | vridet/flyttat |  |
| 19 | 114.93 | 117.67 | 121.34 | 121.45 | 141×55 | vridet/flyttat |  |
| 20 | 127.78 | 129.72 | 129.76 | 129.98 | 47×51 | vridet/flyttat |  |
| 21 | 134.77 | 135.37 | 137.14 | 137.24 | 36×49 | **nedläggning** | Plains |
| 22 | 144.57 | 146.69 | 146.92 | 148.37 | 53×54 | vridet/flyttat |  |
| 23 | 154.21 | 158.84 | 159.49 | 159.57 | 47×50 | vridet/flyttat |  |
| 24 | 166.49 | 167.06 | 167.16 | 167.40 | 35×45 | **nedläggning** | Ukud Cobra |
| 25 | 187.24 | 191.73 | 192.23 | 192.24 | 59×54 | vridet/flyttat |  |
| 26 | 200.74 | 202.46 | 202.87 | 203.04 | 50×40 | **nedläggning** | Thriving Heath |
| 27 | 206.93 | 209.28 | 211.87 | 211.97 | 96×60 | vridet/flyttat |  |
| 28 | 215.10 | 215.72 | 215.77 | 215.97 | 31×43 | **nedläggning** | Maul of the Skyclaves |
| 29 | 218.19 | 222.22 | 222.37 | 222.65 | 59×54 | vridet/flyttat |  |
| 30 | 230.31 | 230.96 | 230.99 | 231.18 | 32×42 | **nedläggning** | Killing Glare |
| 31 | 234.25 | 235.31 | 235.40 | 236.40 | 33×43 | borta |  |
| 32 | 239.75 | – | – | 240.42 | 360×202 | vridet/flyttat |  |
| 33 | 240.96 | 241.09 | 241.62 | 241.66 | 116×146 | vridet/flyttat |  |
| 34 | 242.49 | 243.56 | 243.71 | 245.06 | 116×148 | vridet/flyttat |  |
| 35 | 250.47 | 254.64 | 254.86 | 254.87 | 97×84 | vridet/flyttat |  |
| 36 | 256.06 | 257.76 | 260.61 | 260.61 | 74×86 | vridet/flyttat |  |
| 37 | 261.62 | 261.62 | 261.65 | 261.65 | 62×56 | vridet/flyttat |  |
| 38 | 262.72 | 264.58 | 269.23 | 269.24 | 101×87 | vridet/flyttat |  |
| 39 | 276.80 | 278.38 | 278.75 | 278.75 | 33×43 | **nedläggning** | Swamp |
| 40 | 284.59 | 284.98 | 285.19 | 285.36 | 35×45 | **nedläggning** | Gorgon Flail |
| 41 | 290.07 | 292.35 | 292.50 | 292.87 | 60×67 | vridet/flyttat |  |
| 42 | 302.37 | 307.67 | 310.48 | 310.48 | 46×56 | vridet/flyttat |  |
| 43 | 311.23 | 311.23 | 311.24 | 311.23 | 28×14 | ändrat på plats |  |
| 44 | 313.53 | 314.18 | 314.45 | 314.43 | 34×44 | **nedläggning** | Venomous Hierophant |
| 45 | 320.19 | 327.43 | 327.48 | 327.62 | 34×48 | **nedläggning** |  |
| 46 | 333.84 | 337.11 | 337.19 | 337.28 | 57×65 | vridet/flyttat |  |
| 47 | 341.62 | 342.20 | 342.38 | 342.45 | 36×47 | **nedläggning** | Plains |
| 48 | 361.68 | 368.85 | 369.47 | 369.49 | 48×61 | vridet/flyttat |  |
| 49 | 375.19 | 375.81 | 375.84 | 376.04 | 32×43 | **nedläggning** | Danitha Capashen, Paragon |
| 50 | 381.13 | 384.64 | 385.52 | 385.54 | 55×68 | vridet/flyttat |  |
| 51 | 393.63 | 398.82 | 399.00 | 399.04 | 36×49 | **nedläggning** |  |
| 52 | 406.38 | 407.75 | 407.77 | 408.28 | 38×46 | **nedläggning** |  |
| 53 | 411.15 | 414.32 | 414.46 | 414.46 | 56×63 | vridet/flyttat |  |
| 54 | 420.68 | 421.27 | 421.50 | 421.52 | 34×44 | **nedläggning** | Swamp |
| 55 | 439.89 | 443.66 | 444.81 | 445.18 | 43×55 | vridet/flyttat |  |
| 56 | 448.94 | 450.40 | 450.42 | 451.69 | 42×56 | **nedläggning** | Pacifism |
| 57 | 455.54 | 457.83 | 457.83 | 459.53 | 39×47 | borta |  |
| 58 | 480.98 | 481.56 | 481.59 | 481.76 | 36×44 | **nedläggning** | Trusty Retriever |
| 59 | 486.05 | – | – | 486.43 | 360×202 | vridet/flyttat |  |
| 60 | 487.77 | 493.51 | 493.71 | 493.81 | 37×52 | **nedläggning** |  |
| 61 | 513.97 | 514.35 | 514.74 | 515.07 | 36×46 | **nedläggning** | Flutterfox |
| 62 | 519.74 | 520.63 | 520.73 | 524.65 | 36×46 | borta |  |
| 63 | 530.34 | 532.86 | 532.88 | 533.04 | 50×50 | vridet/flyttat |  |
| 64 | 540.65 | 547.88 | 548.96 | 550.28 | 69×78 | vridet/flyttat |  |
| 65 | 559.77 | 565.26 | 565.35 | 565.43 | 36×48 | **nedläggning** |  |
| 66 | 573.06 | 574.51 | 574.51 | 574.49 | 360×202 | vridet/flyttat |  |

## Så mättes det

1. Varje bildruta skalas till 360×202 gråskala (`rorelse.swift`).
2. Rörelsemåttet räknas på **suddade** rutor (`matt.cjs`): inspelningen är
   tagen i lampljus och sensorbruset ger annars utslag över hela bilden
   (medelskillnaden mellan två stilla rutor är 3,2 gråsteg orörd, 0,7 suddad).
3. Ett steg är sammanhängande rörelse med högst en halv sekunds paus i
   (`stega.cjs`). 66 steg hittades i de 53 stegen i MANUS.md —
   fler, eftersom ett steg som "untappa hög A, hög B och Thriving Moor" är
   tre rörelser.
4. `släpp` och `land` mäts inne i lådan som ändrades: andelen bildpunkter
   som står som de gör när bordet vilar. Släppet är sista rutan under 97 %.
5. Nedläggningarna (`fonster.cjs`) är de steg där lådan har ett korts mått
   och något ljust ligger kvar efteråt.

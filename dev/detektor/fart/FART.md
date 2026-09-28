# Grind 0: hur snabb är en detektor i rätt storlek? (MES-288)

**Frågan:** hinner en liten detektor som ser ~1000 px (i stället för 640)
köras i telefonens webbläsare inom 0,3 s-löftet? Farten beror inte på
träningen, så den mäts nu med otränade (COCO-förtränade) modeller i samma
arkitektur och storlek — innan någon träning eller några pengar.

Mätt 2026-09-28/29 på Jespers Mac (MacBook Pro 2018, Intel i5-8259U, Iris
Plus 655) i huvudlös Chrome 154 med onnxruntime-web 1.30. **Telefonen är inte
mätt.** Sidan för det är byggd och provad (se *Telefonen*).

## Svaret på Macen

| | 640 px | 960 px | 1280 px |
|---|---|---|---|
| **YOLOX-nano** (0,9 M) | 75 ms | **116 ms** | 183 ms |
| **YOLOX-tiny** (5,1 M) | 124 ms | **214 ms** | 349 ms |
| YOLOX-s (9,0 M) | 158 ms | 297 ms | 478 ms |
| D-FINE-N (3,8 M) | 300 ms | 376 ms | 474 ms |
| D-FINE-S (10,3 M) | 336 ms | 488 ms | 714 ms |

Median för hela modellsteget (förbehandling + modell + efterbehandling), WebGPU,
fp16. "640 px" = 640×384, "960 px" = 960×544, "1280 px" = 1280×736: kamerans
16:9-bild, kortsidan uppåt till en multipel av 32.

**Vad det betyder:**

1. **YOLOX-familjen klarar grind 0 på Macen; D-FINE gör det inte.** Varje
   YOLOX-storlek ligger under 0,35 s, och nano/tiny under 0,22 s vid 960 px.
   D-FINE ligger på 0,3 s redan vid 640 px, fast D-FINE-N räknar mindre än
   YOLOX-tiny: den består av många små steg (transformer-avkodare, GridSample,
   TopK), och varje steg har ett fast påslag på grafikkortet. D-FINE-N går till
   och med fortare på processorn (165 ms, WASM) än på WebGPU.
2. **0,3 s är hela vägen, inte bara detektorn.** Kortets namn ska synas inom
   0,3 s från att det läggs; bildmodellen tar ~0,1 s (MES-213) och resten av
   kedjan några tiotal ms. Detektorn har alltså **~0,15 s** att röra sig med.
   På Macen ryms där YOLOX-nano vid 960 (116 ms) och YOLOX-tiny vid 640
   (124 ms) — inte YOLOX-tiny vid 960 (214 ms).
3. **Telefonen avgör.** Bildmodellen var lika snabb på telefonen som på Macen
   enligt MES-238 (en slutsats, inte en loggad mätning), och MES-213 gissade
   att en iPhone 13 eller nyare har 1,5–2,5 gånger snabbare grafik än Macens
   Iris Plus 655. Stämmer det hamnar YOLOX-tiny vid 960 på ~90–140 ms och
   YOLOX-nano vid 960 på ~45–80 ms. **Det är gissat, inte mätt.**

## Rekommendation

**Ta YOLOX-tiny vid 960×544 (fp16, WebGPU) vidare till träningen, med
YOLOX-nano vid 960×544 som reserv.**

| | Varför |
|---|---|
| YOLOX-tiny 960 | 214 ms på Macen, 10 MB att ladda ner; i storleksklassen där nollprovet visade att upplösningen, inte modellstorleken, var det som fattades. Ryms i 0,15 s om telefonen är ≥ 1,5 × Macen |
| YOLOX-nano 960 (reserv) | 116 ms på Macen, 2 MB — ryms redan på Macen. Frågan är om 0,9 M parametrar räcker för kort i högar; det visar grind 2. Att träna båda med samma kod kostar nästan inget extra |
| YOLOX-s 960 | 297 ms — bara om telefonen visar sig klart snabbare än Macen och tiny inte räcker |
| D-FINE-N/S | nej för telefonen: långsammast per räknad operation, och i onnxruntime-web 1.22 ger D-FINE **tysta fel** (noll lådor, inget felmeddelande). Telefonsidan kör D-FINE-N en gång till, ifall Apples grafik hanterar den bättre |

YOLOX är Megvii:s kod och vikter under **Apache-2.0**; träningskoden finns i
samma repo. Använd den, inte Ultralytics (AGPL). Stoppvillkoret för grind 0
("långsammare än 0,3 s också med mindre indata") är inte uppfyllt på Macen
för YOLOX; det slutliga beskedet kommer från telefonen.

## Hela tabellen (Macen)

Pass 2, alla bitar körda när datorn var lugn (1-minuterslast < 3,5 före varje
bit, `resultat/pass2-last.txt`). 30 anrop efter 3 uppvärmningar; median och
p90 för hela modellsteget. WASM med 4 trådar (sidan är cross-origin isolated).
Filstorleken är det telefonen laddar ner.

| Modell | Indata | Backend | Precision | Median ms | p90 ms | varav modellen ms | Fil MB |
|---|---|---|---|---|---|---|---|
| YOLOX-nano | 640×384 | webgpu | fp16 | **75** | 78 | 71 | 2,0 |
| YOLOX-nano | 640×384 | webgpu | fp32 | 77 | 79 | 73 | 3,8 |
| YOLOX-nano | 640×384 | wasm ×4 | fp32 | 88 | 166 | 85 | 3,8 |
| YOLOX-nano | 960×544 | webgpu | fp16 | **116** | 118 | 107 | 2,0 |
| YOLOX-nano | 960×544 | webgpu | fp32 | 123 | 125 | 113 | 3,8 |
| YOLOX-nano | 960×544 | wasm ×4 | fp32 | 155 | 293 | 144 | 3,8 |
| YOLOX-nano | 1280×736 | webgpu | fp16 | **183** | 192 | 168 | 2,0 |
| YOLOX-nano | 1280×736 | webgpu | fp32 | 197 | 203 | 183 | 3,9 |
| YOLOX-nano | 1280×736 | wasm ×4 | fp32 | 250 | 411 | 237 | 3,9 |
| YOLOX-tiny | 640×384 | webgpu | fp16 | **124** | 134 | 121 | 10,2 |
| YOLOX-tiny | 640×384 | webgpu | fp32 | 137 | 145 | 132 | 20,3 |
| YOLOX-tiny | 640×384 | wasm ×4 | fp32 | 241 | 356 | 237 | 20,3 |
| YOLOX-tiny | 960×544 | webgpu | fp16 | **214** | 232 | 206 | 10,2 |
| YOLOX-tiny | 960×544 | webgpu | fp32 | 246 | 249 | 237 | 20,4 |
| YOLOX-tiny | 960×544 | wasm ×4 | fp32 | 498 | 628 | 491 | 20,4 |
| YOLOX-tiny | 1280×736 | webgpu | fp16 | **349** | 357 | 335 | 10,3 |
| YOLOX-tiny | 1280×736 | webgpu | fp32 | 400 | 418 | 385 | 20,4 |
| YOLOX-tiny | 1280×736 | wasm ×4 | fp32 | 837 | 941 | 823 | 20,4 |
| YOLOX-s | 640×384 | webgpu | fp16 | **158** | 168 | 155 | 18,0 |
| YOLOX-s | 640×384 | webgpu | fp32 | 181 | 193 | 177 | 35,9 |
| YOLOX-s | 640×384 | wasm ×4 | fp32 | 308 | 620 | 304 | 35,9 |
| YOLOX-s | 960×544 | webgpu | fp16 | **297** | 314 | 288 | 18,1 |
| YOLOX-s | 960×544 | webgpu | fp32 | 329 | 343 | 321 | 36,0 |
| YOLOX-s | 960×544 | wasm ×4 | fp32 | 643 | 730 | 636 | 36,0 |
| YOLOX-s | 1280×736 | webgpu | fp16 | **478** | 485 | 463 | 18,1 |
| YOLOX-s | 1280×736 | webgpu | fp32 | 555 | 569 | 540 | 36,1 |
| YOLOX-s | 1280×736 | wasm ×4 | fp32 | 1 215 | 1 424 | 1 200 | 36,1 |
| D-FINE-N | 640×384 | webgpu | fp16 | **300** | 308 | 297 | 8,1 |
| D-FINE-N | 640×384 | webgpu | fp32 | 335 | 350 | 332 | 15,4 |
| D-FINE-N | 640×384 | wasm ×4 | fp32 | 165 | 323 | 156 | 15,4 |
| D-FINE-N | 960×544 | webgpu | fp16 | **376** | 392 | 368 | 8,1 |
| D-FINE-N | 960×544 | webgpu | fp32 | 462 | 480 | 454 | 15,4 |
| D-FINE-N | 960×544 | wasm ×4 | fp32 | 246 | 342 | 239 | 15,4 |
| D-FINE-N | 1280×736 | webgpu | fp16 | **474** | 518 | 460 | 8,1 |
| D-FINE-N | 1280×736 | webgpu | fp32 | 575 | 604 | 560 | 15,4 |
| D-FINE-N | 1280×736 | wasm ×4 | fp32 | 410 | 487 | 396 | 15,4 |
| D-FINE-S | 640×384 | webgpu | fp16 | **336** | 358 | 332 | 21,0 |
| D-FINE-S | 640×384 | webgpu | fp32 | 463 | 551 | 459 | 41,5 |
| D-FINE-S | 640×384 | wasm ×4 | fp32 | 417 | 687 | 407 | 41,5 |
| D-FINE-S | 960×544 | webgpu | fp16 | **488** | 519 | 478 | 21,0 |
| D-FINE-S | 960×544 | webgpu | fp32 | 538 | 713 | 529 | 41,5 |
| D-FINE-S | 960×544 | wasm ×4 | fp32 | 711 | 803 | 704 | 41,5 |
| D-FINE-S | 1280×736 | webgpu | fp16 | **714** | 748 | 699 | 21,0 |
| D-FINE-S | 1280×736 | webgpu | fp32 | 782 | 909 | 766 | 41,5 |
| D-FINE-S | 1280×736 | wasm ×4 | fp32 | 1 325 | 1 631 | 1 306 | 41,5 |

Förbehandlingen (skala bilden, göra tensorn) är 3 / 8 / 14 ms vid 640 / 960 /
1280 px, efterbehandlingen (poäng, NMS) under 0,5 ms. Resten är modellen.

**Hur säkra talen är:**

| | |
|---|---|
| WebGPU | stabila: omkörning (pass 3) av YOLOX-tiny och D-FINE-N gav samma median ±5 % (tiny 123 / 219 / 334, D-FINE-N 298 / 379 / 472), och körningen från telefonmappen (`resultat/mac-telefonuppsattning.json`) samma igen |
| WASM | spretar ±30 % mellan omkörningar (p90 ofta dubbla medianen): processorn delas med allt annat på datorn |
| Pass 1 | kastat: en annan session körde OWLv2 (grind 1) och lasten steg till 20–30 mitt i. Filerna ligger kvar som `resultat/pass1-stord-*.json` |
| Bakgrunden | MTG Arena var igång på datorn under alla pass (~30 % av en kärna, och den använder grafikkortet). Den stängdes inte |
| Chrome | uppdaterades från 153 till 154 under kvällen; pass 2 är 154 utom D-FINE-N på WebGPU, som pass 3 gjorde om på 154 med samma tal |

### onnxruntime-web 1.22 mot 1.30

Bildmodellen (dev/embed) mättes med 1.22. Samma YOLOX-filer med 1.22
(`resultat/ort122-*.json`), WebGPU fp16:

| | 640 | 960 | 1280 |
|---|---|---|---|
| YOLOX-nano, 1.22 | 77 | 111 | 172 |
| YOLOX-nano, 1.30 | 75 | 116 | 183 |
| YOLOX-tiny, 1.22 | 105 | 197 | 298 |
| YOLOX-tiny, 1.30 | 124 | 214 | 349 |

1.22 är 5–15 % snabbare för YOLOX, men **ger fel svar för D-FINE på WebGPU**:
modellen körs utan felmeddelande och ger noll lådor (WASM med samma fil ger
rätt lådor). 1.22 vägrar dessutom D-FINE:s MaxPool med `ceil_mode` och en
matrismultiplikation med en vektor; båda är omskrivna i filerna (`laga.py`,
samma tal ut). Sidan kör 1.30 som förval; `?ort=1.22` byter.

## Kontrollen: ger exporten rätt lådor?

Farten säger inget om exporten är rätt, så varje modell kördes på en vanlig
provbild (hund, cykel, bil ur YOLOX-repot) på WebGPU fp32, WebGPU fp16 och
WASM. Alla fem ger samma lådor på alla tre vägarna, med rimliga poäng:

| Modell | Lådor (klass, poäng) på WebGPU fp16 |
|---|---|
| YOLOX-nano | bicycle 0,77 · dog 0,72 · car 0,70 |
| YOLOX-tiny | bicycle 0,89 · dog 0,73 · car 0,58 · truck 0,55 |
| YOLOX-s | bicycle 0,96 · dog 0,92 · car 0,79 |
| D-FINE-N | bicycle 0,92 · dog 0,88 · car 0,70 |
| D-FINE-S | bicycle 0,95 · dog 0,88 · truck 0,85 · car 0,59 |

På golden-bilden (fall 13) lägger modellerna COCO-lådor ("tv", "person") på
några av korten — väntat för en otränad modell, och bara ett tecken på att
lådorna hamnar på rätt ställen i bilden.

**Två fällor på vägen:**

- **`onnx-community/dfine_n_coco-ONNX` är trasig**: hunden får 0,45 i stället
  för ~0,9, också i Python-onnxruntime. `onnx-community/dfine-nano-coco-ONNX`
  (nyare uppladdning) stämmer och är den som används.
- **onnxsim kraschade Python** (segfault i `onnxsim_cpp2py_export`, onnxsim
  0.4.36 mot onnx 1.19.1 i Python 3.9 från Command Line Tools) två gånger,
  och varje krasch öppnade ett "Python quit unexpectedly"-fönster på Jespers
  skärm. Förenklingen behövs inte (onnxruntime optimerar grafen när sessionen
  skapas), så den togs bort. **Kör inte onnxsim på den här datorn.** Också
  fp16-omvandlaren i onnxconverter-common gav trasiga filer (Cast-noder);
  `onnxruntime.transformers.float16` används i stället.

## Modellerna, licenser och källor

| Modell | Källa | Licens | Parametrar | Räknemängd, uppskattad (640 / 960 / 1280) | Fil fp16 / fp32 |
|---|---|---|---|---|---|
| YOLOX-nano | Megvii, github.com/Megvii-BaseDetection/YOLOX, release 0.1.1rc0 (`yolox_nano.pth`), exporterad här | Apache-2.0 | 0,91 M | 1,5 / 3,3 / 5,9 GFLOPs | 2,0 / 3,8 MB |
| YOLOX-tiny | samma (`yolox_tiny.pth`) | Apache-2.0 | 5,06 M | 9 / 20 / 35 GFLOPs | 10,2 / 20,3 MB |
| YOLOX-s | samma (`yolox_s.pth`) | Apache-2.0 | 8,97 M | 16 / 34 / 62 GFLOPs | 18,0 / 35,9 MB |
| D-FINE-N | `onnx-community/dfine-nano-coco-ONNX` (Hugging Face), från `ustc-community/dfine-nano-coco`; fp16 gjord här | Apache-2.0 | 3,8 M | 4 / 9 / 16 GFLOPs | 8,1 / 15,4 MB |
| D-FINE-S | `onnx-community/dfine_s_coco-ONNX`, från `ustc-community/dfine_s_coco`; fp16 gjord här | Apache-2.0 | 10,3 M | 15 / 32 / 57 GFLOPs | 21,0 / 41,5 MB |

Räknemängden är upphovsmännens tal (YOLOX-nano/tiny vid 416², YOLOX-s och
D-FINE vid 640²) skalade med antalet pixlar — en uppskattning. D-FINE:s
avkodare växer inte med bilden, så dess tal vid 960/1280 är för höga.
Parametrarna för D-FINE är räknade ur filstorleken.

**Inte med, och varför:** RT-DETRv2-S (20 M parametrar, över 12 M-klassen),
RF-DETR-nano (~30 M parametrar med DINOv2-stammen, över klassen; finns som
`onnx-community/rfdetr_nano-ONNX` om den behövs), Ultralytics-modeller (AGPL).

YOLOX exporteras i fast storlek, en fil per storlek (`exportera_yolox.py`,
torch 2.2.2 — sista bygget för Intel-Mac — opset 17, avkodningen av rutnätet
kvar i grafen). D-FINE tar vilken storlek som helst i samma fil.

## Telefonen

**Inte mätt.** Sidan är byggd för det: stor text, en knapp **Kör**, sedan
**Kopiera**. Den kör telefonens uppsättning (YOLOX-nano 640/960/1280,
YOLOX-tiny 640/960/1280, YOLOX-s 960 och D-FINE-N 640/960, WebGPU fp16; utan
shader-f16 bara YOLOX-nano 960 i fp32; utan WebGPU samma på WASM) och visar
vilken backend som faktiskt körde, grafikkortet och om fp16 finns. Hela
uppsättningen tog ~1,5 min på Macen.

**Vad som krävs:**

| Krav | Varför |
|---|---|
| **https** | WebGPU och WASM-trådar finns bara i säker kontext; en Vercel-förhandsdriftsättning ger det |
| COOP/COEP-huvuden | bara för WASM med flera trådar (reserven). WebGPU fungerar utan. `bygg-telefon.cjs` skriver en `vercel.json` med båda |
| WebGPU i webbläsaren | iPhone: Safari i iOS 26 (på som förval). Android: Chrome 121 eller nyare. Annars WASM |
| Wi-Fi | sidan hämtar onnxruntime (27 MB wasm) och ~63 MB modeller för fp16-uppsättningen, en modell åt gången |
| Skärmen på, fliken synlig | en dold flik stryps; sidan skriver `dold` i resultatet om det hände |

**Filerna:** `node dev/detektor/fart/bygg-telefon.cjs` bygger mappen
`dev/detektor/fart/ut/mesa-detektor-fart/` (gitignorerad) — **94 MB**: sidan,
onnxruntime-web 1.30 (bara de tre filer den laddar, uppmätt), nio modellfiler,
provbilden och golden-bilden. Den är provad lokalt i huvudlös Chrome med
samma resultat som ovan. Vercels uppladdningsgräns på gratisnivån är, såvitt
jag vet, 100 MB (inte kontrollerat); därför är uppsättningen bantad.

**Förslag på hur sidan når Jespers telefon** (inte gjort — det beslutet tas
efteråt):

1. `node dev/detektor/fart/bygg-telefon.cjs`
2. `cd dev/detektor/fart/ut/mesa-detektor-fart && vercel deploy --yes` — ett
   **eget** Vercel-projekt (`mesa-detektor-fart`), inte Mesas. Ger en
   https-länk för förhandsdriftsättningen.
3. Nya Vercel-projekt kan ha *Deployment Protection* på förhandslänkar: då
   måste Jesper vara inloggad på Vercel i telefonens webbläsare, eller
   skyddet stängas av för just det projektet.
4. Jesper öppnar länken på telefonen (Safari på iPhone), trycker **Kör**,
   väntar på **Klart**, trycker **Kopiera** och klistrar in texten i chatten.
   Gärna två gånger: en kall telefon och en efter några minuters användning.

## Filerna

| Fil | Vad |
|---|---|
| `index.html` | mätsidan (Macen och telefonen); konsolen: `MAT`, `KOR`, `KONTROLL`, `TEXT` |
| `server.cjs` | statisk server med COOP/COEP; `ROT=<mapp>` provar telefonmappen |
| `webb.cjs` | kör sidan i huvudlös Chrome (`--gpu` för WebGPU, `--fraga ort=1.22`, `--bild` sparar lådorna) |
| `mat-mac.sh` | hela mätningen, en modell och backend åt gången, bara när datorn är lugn |
| `vanta-lugnt.cjs` | väntar ut golden, detektorns Python-jobb och hög last |
| `tabell.cjs` | markdown-tabell ur resultat-JSON |
| `bygg-telefon.cjs` | bygger mappen för förhandsdriftsättningen (driftsätter inte) |
| `hamta.sh`, `exportera_yolox.py`, `laga.py` | hämtar, exporterar och lagar modellerna (vikter gitignorerade i `modeller/`) |
| `resultat/` | alla mätningar som JSON, med lasten före och efter varje bit |

Så körs det om:

```
cd dev/detektor/fart && npm install
sh dev/detektor/fart/hamta.sh <scratch-mapp>
YOLOX_KOD=<scratch>/YOLOX-main VIKTER=<scratch>/vikter <venv>/bin/python dev/detektor/fart/exportera_yolox.py
<venv>/bin/python dev/detektor/fart/laga.py dev/detektor/fart/modeller/dfine_nano_coco.onnx dev/detektor/fart/modeller/dfine_s_coco.onnx --fp16
node dev/detektor/fart/webb.cjs "KONTROLL({modeller:['yolox_tiny','dfine_n'],backend:'webgpu',prec:'fp16'})" --gpu --bild /tmp/lador.jpg
sh dev/detektor/fart/mat-mac.sh pass4
node dev/detektor/fart/tabell.cjs dev/detektor/fart/resultat/pass4-*.json
```

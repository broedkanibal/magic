# dev/embed — liten bildmodell som sätter kortnamn lokalt (MES-213)

Rapporten med siffror och beslut: **[RAPPORT.md](RAPPORT.md)**. Den här filen
säger bara hur bänken körs om.

## Komma igång

```bash
cd dev/embed && npm install          # onnxruntime-node (låst till 1.22.0), onnxruntime-web, sharp
```

`onnxruntime-node` är låst till 1.22.0: nyare versioner saknar färdigbyggd
binär för Intel-Mac. På en M-Mac går vilken version som helst.

### Modellvikterna (checkas inte in, ~185 MB)

```bash
mkdir -p modeller
curl -L -o modeller/mobileclip-s0-vision.onnx      https://huggingface.co/Xenova/mobileclip_s0/resolve/main/onnx/vision_model.onnx
curl -L -o modeller/mobileclip-s0-vision-fp16.onnx https://huggingface.co/Xenova/mobileclip_s0/resolve/main/onnx/vision_model_fp16.onnx
curl -L -o modeller/mobileclip-s0-vision-q8.onnx   https://huggingface.co/Xenova/mobileclip_s0/resolve/main/onnx/vision_model_quantized.onnx
curl -L -o modeller/dinov2-small.onnx              https://huggingface.co/Xenova/dinov2-small/resolve/main/onnx/model.onnx
curl -L -o modeller/mobilenetv4-small.onnx         https://huggingface.co/onnx-community/mobilenetv4_conv_small.e2400_r224_in1k/resolve/main/onnx/model.onnx
```

`mobilenetv4-small-feat.onnx` (vektorn före klassificeraren) görs ur
`mobilenetv4-small.onnx` med några rader Python (`pip3 install --user onnx`):
ta bort sista noden (`Gemm`) och sätt `/flatten/Flatten_output_0` som utgång.

## Stegen

| Steg | Kommando | Ger |
|---|---|---|
| Referenser | `node hamta-referenser.cjs` | Scryfall-bilderna för `dev/golden/lek.txt` → `cache/ref/`, `cache/lek-golden.json` |
| | `node hamta-referenser.cjs --edhrec 100` | Commander-stor kandidatmängd → `cache/commander100.json` |
| | `node hamta-referenser.cjs --tryck` | alla tryckningar av lekens namn → `cache/lek-golden-tryck.json` |
| Riktiga beskärningar | `node riktiga.cjs [--ark]` | `riktiga/*.jpg` + `manifest.json` ur golden-baslinjernas spårlådor (checkas in) |
| Syntetiska | `node synt.cjs [--ark]` | 4000 bilder → `cache/synt/` (samma frö = samma bilder) |
| Bänken | `node bank.cjs --set riktiga --modell mobileclip-s0 --centrera --rotar 0,90,180,270` | träff, marginal, tröskel för 0 säkra fel, per typ |
| Förbättringar | `node forbattra.cjs --modell mobileclip-s0` | A–F: flera referenser, TTA, lärda referenser, OCR-fusion, deck-prior |
| Större lek | `node storre.cjs` | 28 → 126 namn, annat tryck av samma konst |
| Recept och regel | `node recept.cjs`, `node regel.cjs` | hur många vektorer per konstverk som behövs; marginal/poäng/skymd som säkerhetsregel; kalibreringen marginal → andel rätt |
| Bildkvalitet | `node forsamra.cjs`, sedan `forbattra.cjs --rset riktiga-forsamrad` | de riktiga beskärningarna försämrade en gång till (halv upplösning, hård jpeg ×2) |
| Dagens kedja | `node utdrag.cjs` | klipper Matcher/ORB ur `index.html` → `cache/kedjan.js` (baslinjen i bank.html) |
| Webbläsaren | `node server.cjs` → <http://localhost:8377/dev/embed/bank.html> | modulen `embed.js` mot samma set, ms per kort |
| | `node webb.cjs tid.html "MAT('mobileclip-s0-vision.onnx','wasm',256)"` | tid per kort i huvudlös Chrome (ostrypt); `--gpu` för WebGPU |

Allt under `cache/`, `modeller/` och `node_modules/` är gitignorerat.

## Bra att veta

- **`server.cjs` i stället för `python -m http.server`:** sidan måste vara
  cross-origin isolated (COOP/COEP) för att WASM ska få flera trådar.
- **Browserpanelen stryper en dold flik** — tider mätta där är skräp
  (p90 2,9 s mot 0,2 s). Mät med `webb.cjs` (huvudlös Chrome) eller i ett
  synligt fönster.
- **`synt.cjs` kör i bitar om 50 bilder i egna processer.** sharp/libvips
  föll med segfault mitt i långa körningar på den här datorn (Node 25,
  Intel-Mac); en bit som faller körs om, och faller den tre gånger körs den
  bild för bild. Varje bild har eget frö, så resultatet är detsamma.
- **Bänken rör inte `index.html`**, golden setet eller systemprompten.
  `utdrag.cjs` LÄSER index.html för att baslinjen ska vara dagens kedja —
  `dev/matcher.js` och `dev/orb.js` är gamla kopior.

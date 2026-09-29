# MES-288 grind 0: hämtar modellerna till dev/detektor/fart/modeller/ (gitignorerad).
#
#   D-FINE (Apache-2.0): färdiga ONNX från onnx-community på Hugging Face.
#     OBS: onnx-community/dfine_n_coco-ONNX ger fel lådor (hund 0,45 i stället
#     för 0,9 i Python-ORT) — använd dfine-nano-coco-ONNX, som stämmer.
#   YOLOX (Apache-2.0): vikterna från Megvii:s release; exporteras med
#     exportera_yolox.py (fast storlek, en fil per storlek).
#
#   sh dev/detektor/fart/hamta.sh <scratch-mapp>
# och sedan, med en venv (torch 2.2.2, torchvision 0.17.2, loguru, tabulate,
# onnx, onnxruntime, opencv-python-headless, pillow):
#   YOLOX_KOD=<scratch>/YOLOX-main VIKTER=<scratch>/vikter <venv>/bin/python dev/detektor/fart/exportera_yolox.py
#   <venv>/bin/python dev/detektor/fart/laga.py dev/detektor/fart/modeller/dfine_nano_coco.onnx dev/detektor/fart/modeller/dfine_s_coco.onnx --fp16
set -e
SKRAP="${1:?ange en scratch-mapp utanför repot}"
M="$(cd "$(dirname "$0")" && pwd)/modeller"
mkdir -p "$M" "$SKRAP/vikter"
HF=https://huggingface.co/onnx-community
curl -sfL -o "$M/dfine_nano_coco.onnx" "$HF/dfine-nano-coco-ONNX/resolve/main/onnx/model.onnx"
curl -sfL -o "$M/dfine_s_coco.onnx"    "$HF/dfine_s_coco-ONNX/resolve/main/onnx/model.onnx"
REL=https://github.com/Megvii-BaseDetection/YOLOX/releases/download/0.1.1rc0
for n in yolox_nano yolox_tiny yolox_s; do curl -sfL -o "$SKRAP/vikter/$n.pth" "$REL/$n.pth"; done
curl -sfL -o "$SKRAP/yolox.tar.gz" https://codeload.github.com/Megvii-BaseDetection/YOLOX/tar.gz/refs/heads/main
tar xzf "$SKRAP/yolox.tar.gz" -C "$SKRAP"
cp "$SKRAP/YOLOX-main/assets/dog.jpg" "$M/kontroll-dog.jpg"
ls -la "$M"

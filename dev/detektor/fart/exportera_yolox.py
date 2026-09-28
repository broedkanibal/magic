"""MES-288 grind 0: exportera YOLOX (Megvii, Apache-2.0) till ONNX i fast storlek.

YOLOX-filerna i upphovsmännens release har fast indata (416 eller 640 px,
kvadrat), så varje storlek exporteras för sig. Avkodningen av rutnätet ligger
kvar i grafen (decode_in_inference), så ut kommer [1, N, 85] med
cx, cy, w, h i indatapixlar, objektpoäng och 80 klasspoäng (sigmoid redan
gjord). NMS görs i sidan.

    YOLOX_KOD=<utpackad YOLOX-main> VIKTER=<mapp med yolox_*.pth> \
      <venv>/bin/python dev/detektor/fart/exportera_yolox.py

Kräver torch 2.2.2 (sista bygget för Intel-Mac), torchvision 0.17.2, loguru,
tabulate, onnx, onnxruntime (för fp16-omvandlaren). Skriver till dev/detektor/fart/modeller/.
"""
import os, sys, torch, onnx
from onnxruntime.transformers.float16 import convert_float_to_float16  # hanterar Cast rätt, till skillnad från onnxconverter-common

KOD = os.environ['YOLOX_KOD']
VIKTER = os.environ['VIKTER']
UT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modeller')
sys.path.insert(0, KOD)
from yolox.exp import get_exp  # noqa: E402

# Kamerans bild är 16:9 liggande. "Storleken" är långsidan; kortsidan följer
# bildformatet, avrundad uppåt till en multipel av 32 (modellens steg).
STORLEKAR = [(640, 384), (960, 544), (1280, 736)]
MODELLER = os.environ.get('MODELLER', 'yolox_nano,yolox_tiny,yolox_s').split(',')

os.makedirs(UT, exist_ok=True)
for namn in MODELLER:
    exp = get_exp(exp_file=os.path.join(KOD, 'exps', 'default', namn + '.py'))
    model = exp.get_model()
    ckpt = torch.load(os.path.join(VIKTER, namn + '.pth'), map_location='cpu')
    model.load_state_dict(ckpt['model'])
    model.eval()
    model.head.decode_in_inference = True
    antal = sum(p.numel() for p in model.parameters())
    for b, h in STORLEKAR:
        fil = os.path.join(UT, f'{namn}_{b}x{h}.onnx')
        x = torch.zeros(1, 3, h, b)
        torch.onnx.export(model, x, fil, input_names=['images'], output_names=['output'], opset_version=17, do_constant_folding=True)
        m = onnx.load(fil)  # onnxsim 0.4.36 kraschar mot onnx 1.19; ORT optimerar ändå grafen när sessionen skapas
        m16 = convert_float_to_float16(m, keep_io_types=True)
        onnx.save(m16, fil.replace('.onnx', '_fp16.onnx'))
        print(f'{namn} {b}x{h}: {antal / 1e6:.2f} M parametrar, {os.path.getsize(fil) / 1e6:.1f} MB fp32, '
              f'{os.path.getsize(fil.replace(".onnx", "_fp16.onnx")) / 1e6:.1f} MB fp16', flush=True)

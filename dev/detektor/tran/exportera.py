#!/usr/bin/env python3
"""MES-288 grind 2: exporterar en tränad YOLOX (slut.pth ur Kaggle-kerneln) till ONNX, lokalt.

Behövs när exporten på Kaggle faller (version 1 av kerneln: torch där kräver onnxscript, som
inte var installerat — vikterna sparades, ONNX-filerna inte). Samma export som kernelns
exportera(): avkodningen kvar i grafen, opset 17, utan onnxsim, plus en fp16-kopia.

    python dev/detektor/tran/exportera.py --mapp <kernelns utdata> [--namn A-allt]
"""
import argparse, os, sys

HAR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HAR, 'kernel'))
import mesa_detektor_tran as K  # noqa: E402


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--mapp', required=True, help='mappen från `kaggle kernels output` (YOLOX/ och ut/<modell>/slut.pth)')
    p.add_argument('--namn', default=None, help='en utmapp under ut/ (förval: alla som har slut.pth)')
    a = p.parse_args()
    import torch
    K.importera_yolox(os.path.join(a.mapp, 'YOLOX'))
    rot = os.path.join(a.mapp, 'ut')
    for namn in ([a.namn] if a.namn else sorted(d for d in os.listdir(rot) if os.path.exists(os.path.join(rot, d, 'slut.pth')))):
        ut = os.path.join(rot, namn)
        ck = torch.load(os.path.join(ut, 'slut.pth'), map_location='cpu')
        m = K.bygg_modell(ck['modell'])
        print(namn, ck['modell'], 'epok', ck['epok'], m.load_state_dict(ck['model'], strict=True))
        K.exportera(m, os.path.join(ut, f"{ck['modell']}_mesa_{K.IN_W}x{K.IN_H}.onnx"))


if __name__ == '__main__':
    main()

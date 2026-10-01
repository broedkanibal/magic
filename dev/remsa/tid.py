#!/usr/bin/env python3
"""MES-328: tiden per remsa på Macen, mätt ensam (ingen annan körning samtidigt) — bildmodellen i
onnxruntime på processorn, en remsa i taget (som appen) och åtta i taget, 1 och 4 trådar, plus
varpningen ur hörnen. Telefonen är inte mätt här: MES-213 mätte 98 ms per 256 × 256-tensor med
WebGPU på Jespers Intel-Mac i webbläsaren, och remsan är samma tensor.

    ~/.mesa/detektor-venv/bin/python dev/remsa/tid.py
"""
import os, sys, time
import numpy as np
import cv2

HAR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HAR)
from lib import Bildmodell, kvadrat, remsa_ur_bild, median  # noqa: E402
import remsor  # noqa: E402


def main():
    g = remsor.golden()
    post = [p for p in g if p['orig']][0]
    img = cv2.imread(post['orig']); H, W = img.shape[:2]
    kort = post['kort'][:8]
    varp = []
    for _ in range(5):
        for k in kort:
            t0 = time.perf_counter(); s = remsa_ur_bild(img, remsor.horn_i_px(k, W, H), 0.20); kv = kvadrat(cv2.cvtColor(s, cv2.COLOR_BGR2RGB)); varp.append((time.perf_counter() - t0) * 1000)
    kvad = [kvadrat(cv2.cvtColor(remsa_ur_bild(img, remsor.horn_i_px(k, W, H), 0.20), cv2.COLOR_BGR2RGB)) for k in kort]
    print(f'varpning ur hörn + tryck till 256 × 256, ur {W} px bred bild: median {median(varp):.1f} ms')
    for tradar in (1, 4):
        m = Bildmodell(tradar=tradar)
        m.kor(kvad[:1]); m.ms.clear()
        for _ in range(10):
            m.kor(kvad[:1], batch=1)
        en = median(m.ms); m.ms.clear()
        for _ in range(5):
            m.kor(kvad, batch=8)
        atta = median(m.ms)
        print(f'bildmodellen, {tradar} tråd(ar): en remsa i taget {en:.0f} ms, åtta i taget {atta:.0f} ms per remsa')


if __name__ == '__main__':
    main()

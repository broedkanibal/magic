#!/usr/bin/env python3
"""MES-328: tiden per remsa på Macen — bildmodellen i onnxruntime på processorn, en remsa i taget (som
appen) och åtta i taget, 1 och 4 trådar, plus varpningen ur hörnen. Resultatet sparas som JSON så att
RESULTAT.md:s tidtabell (tabell.py) kommer ur en fil och inte ur ett minne av en körning.

Lasten avgör måttet: ensam ger bildmodellen ~25 ms per remsa, med annat igång 35–55 ms (nollprov.json,
ms_modell). Skriptet sparar maskinens lastmedel (1 min) vid start, så att läsaren ser vad "ensam" var.
Telefonen är inte mätt här: MES-213 mätte 98 ms per 256 × 256-tensor med WebGPU på Jespers Intel-Mac i
webbläsaren, och remsan är samma tensor.

    ~/.mesa/detektor-venv/bin/python dev/remsa/tid.py [--ut dev/remsa/resultat/tid.json]

OCR-tiden mäts för sig, med ocr.cjs på en redan exporterad mapp (en arbetare, 1–3 band per kort som appen):
    node dev/remsa/ocr.cjs dev/material/arbete/2026-10-02-mes-328-ocr --bara orig/namnrad/golden \\
         --ut dev/remsa/resultat/tid-ocr-golden-orig-titelraden.json
"""
import argparse, json, os, sys, time
import numpy as np
import cv2

HAR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HAR)
from lib import Bildmodell, kvadrat, remsa_ur_bild, median  # noqa: E402
import remsor  # noqa: E402


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--ut', default=None, help='JSON-fil att spara måtten i (t.ex. dev/remsa/resultat/tid.json)')
    a = p.parse_args()
    last = os.getloadavg()
    g = remsor.golden()
    post = [p for p in g if p['orig']][0]
    img = cv2.imread(post['orig']); H, W = img.shape[:2]
    kort = post['kort'][:8]
    varp = []
    for _ in range(5):
        for k in kort:
            t0 = time.perf_counter(); s = remsa_ur_bild(img, remsor.horn_i_px(k, W, H), 0.20); kv = kvadrat(cv2.cvtColor(s, cv2.COLOR_BGR2RGB)); varp.append((time.perf_counter() - t0) * 1000)
    kvad = [kvadrat(cv2.cvtColor(remsa_ur_bild(img, remsor.horn_i_px(k, W, H), 0.20), cv2.COLOR_BGR2RGB)) for k in kort]
    print(f'lastmedel vid start (1/5/15 min): {last[0]:.2f} {last[1]:.2f} {last[2]:.2f}')
    print(f'varpning ur hörn + tryck till 256 × 256, ur {W} px bred bild: median {median(varp):.1f} ms')
    ut = {'bild': os.path.relpath(post['orig'], os.path.dirname(os.path.dirname(HAR))), 'bild_bredd_px': W, 'varp_ms': round(median(varp), 2),
          'last_1min': round(last[0], 2), 'last_5min': round(last[1], 2), 'tradar': {}, 'nar': time.strftime('%Y-%m-%d %H:%M')}
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
        ut['tradar'][str(tradar)] = {'en': round(en, 1), 'atta': round(atta, 1)}
    if a.ut:
        json.dump(ut, open(a.ut, 'w'), ensure_ascii=False, indent=1)
        print('sparat', a.ut)


if __name__ == '__main__':
    main()

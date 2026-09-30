#!/usr/bin/env python3
"""MES-288: väljer detektorns poänggräns på träningssidans valideringsbilder — aldrig på provet.

Förut valdes gränsen på golden-fall 03, som då inte kunde räknas i provet (Jespers beslut
2026-09-30: välj den på valideringen så att alla golden-fall räknas). Valideringen är de riktiga
rutorna ur träningsfilmernas sista tiondel (dataset.py: del 'val', typ 'riktig'), med lärarens
facit eller Jespers ritning. Den har aldrig tränats på, och den är inte prov.

Måttet per gräns: matchade lådor (IoU >= 0,5, girig en-till-en) minus falska. Falsk = en
omatchad detektion som varken är en dubblett (IoU >= 0,5 mot ett facit-kort) eller ligger till
minst hälften i en facit-låda eller en ignorerad yta (lärarens högar, händer, osäkra lådor).
Lika → den högre gränsen. Gränsen skrivs in i resultatfilen (troskel_val), där rapport.py läser den.

    python dev/detektor/tran/troskel_val.py --onnx <fil.onnx> --namn tranad-nano [--data <datasetmapp>]
"""
import argparse, json, os, sys
import numpy as np
import cv2

HAR = os.path.dirname(os.path.abspath(__file__))
DET = os.path.dirname(HAR)
ROT = os.path.dirname(os.path.dirname(DET))
sys.path.insert(0, DET)
sys.path.insert(0, HAR)
from matt import iou, andel_inne, nms, NMS_IOU  # noqa: E402
from prov import forbehandla, KLASSER  # noqa: E402

TROSKLAR = [round(0.05 + 0.01 * i, 2) for i in range(91)]


def poang(dets, lador, ign):
    par = sorted(((iou(l, d), li, di) for li, l in enumerate(lador) for di, d in enumerate(dets) if iou(l, d) >= 0.5), reverse=True)
    lk, dk = set(), set()
    for v, li, di in par:
        if li in lk or di in dk:
            continue
        lk.add(li); dk.add(di)
    falska = 0
    for di, d in enumerate(dets):
        if di in dk or any(iou(l, d) >= 0.5 for l in lador):
            continue
        if any(andel_inne(d, y) >= 0.5 for y in lador + ign):
            continue
        falska += 1
    return len(lk), falska


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--onnx', required=True)
    p.add_argument('--namn', required=True)
    p.add_argument('--data', default=os.path.join(ROT, 'dev', 'material', 'arbete', '2026-09-30-mes-288-traning-detektor-v1'))
    p.add_argument('--tradar', type=int, default=4)
    a = p.parse_args()
    import onnxruntime as ort
    so = ort.SessionOptions(); so.intra_op_num_threads = a.tradar
    sess = ort.InferenceSession(a.onnx, so, providers=['CPUExecutionProvider'])
    inp = sess.get_inputs()[0]
    _, _, h_in, w_in = inp.shape
    ant = json.load(open(os.path.join(a.data, 'anteckningar.json'), encoding='utf-8'))['bilder']
    val = [x for x in ant if x['del'] == 'val' and x['typ'] == 'riktig']
    bilder = []
    for x in val:
        img = cv2.imread(os.path.join(a.data, x['fil']))
        H, W = img.shape[:2]
        t, r = forbehandla(img, h_in, w_in)
        o = sess.run(None, {inp.name: t})[0][0]
        s = o[:, 4] * o[:, 5:5 + len(KLASSER)].max(1)
        k = s >= 0.05
        dets = [[float((cx - w / 2) / r / W), float((cy - h / 2) / r / H), float((cx + w / 2) / r / W), float((cy + h / 2) / r / H), float(sc)]
                for (cx, cy, w, h), sc in zip(o[k][:, :4], s[k])]
        lador = [[l[0] / W, l[1] / H, l[2] / W, l[3] / H] for l in x['lador']]
        ign = [[y[0] / W, y[1] / H, y[2] / W, y[3] / H] for y in x['ignorera']]
        bilder.append((nms(dets, NMS_IOU), lador, ign))
    rader = []
    for t in TROSKLAR:
        m = f = 0
        for dets, lador, ign in bilder:
            mm, ff = poang([d for d in dets if d[4] >= t], lador, ign)
            m += mm; f += ff
        rader.append((m - f, t, m, f))
    bast = max(rader, key=lambda r: (r[0], r[1]))
    nlador = sum(len(b[1]) for b in bilder)
    print(f'{len(bilder)} valideringsrutor (riktiga, sista tiondelen av varje träningsfilm), {nlador} facit-lådor')
    for v, t, m, f in rader:
        if round(t * 100) % 10 == 0 or t == bast[1]:
            print(f'  gräns {t:.2f}: matchade {m}, falska {f}, matchade − falska {v}' + ('   ← vald' if t == bast[1] else ''))
    fil = os.path.join(DET, 'resultat', a.namn + '.json')
    res = json.load(open(fil))
    res['troskel_val'] = bast[1]
    res['troskel_val_om'] = f'vald på {len(bilder)} riktiga valideringsrutor ({os.path.basename(a.data)}): matchade {bast[2]}, falska {bast[3]}'
    json.dump(res, open(fil, 'w'))
    print(f'troskel_val = {bast[1]} → {os.path.relpath(fil, ROT)}')


if __name__ == '__main__':
    main()

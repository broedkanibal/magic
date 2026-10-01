#!/usr/bin/env python3
"""MES-288: väljer NMS-gränsen (dubblettsteget) på träningssidans validering — aldrig på provet.

Vanlig NMS tar bort en låda som överlappar en starkare med mer än gränsen. I en tät land-hög överlappar två
rätta lådor ofta mer än 0,6 (hogfel.py: 19 av 28 missade högkortsrutor i MES-246). En högregel som behöll
förskjutna lådor (en namnremsa) prövades 2026-10-01 och gav inget utöver gränsen 0,7 (GRIND3.md).

Valideringen: 300 syntetiska bord (exakt facit också i högar) + 71 riktiga rutor (lärarens facit; högar
är ignorerade där, så de väger lite för valet). Måttet per regel: matchade − falska − dubbletter, där en
dubblett är en omatchad låda med IoU >= 0,5 mot ett redan matchat facit-kort.

    python dev/detektor/tran/nms_val.py --onnx <fil.onnx> --troskel 0.58 [--data <datasetmapp>] [--cache <fil.json>]
"""
import argparse, json, os, sys
import cv2

HAR = os.path.dirname(os.path.abspath(__file__))
DET = os.path.dirname(HAR)
ROT = os.path.dirname(os.path.dirname(DET))
sys.path.insert(0, DET)
sys.path.insert(0, HAR)
from matt import iou, andel_inne, nms  # noqa: E402
from prov import forbehandla, KLASSER  # noqa: E402

GRANSER = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85]


def detektioner(onnx, data, cache):
    if cache and os.path.exists(cache):
        return json.load(open(cache))
    import onnxruntime as ort
    so = ort.SessionOptions(); so.intra_op_num_threads = 4
    sess = ort.InferenceSession(onnx, so, providers=['CPUExecutionProvider'])
    inp = sess.get_inputs()[0]
    _, _, h_in, w_in = inp.shape
    ant = json.load(open(os.path.join(data, 'anteckningar.json'), encoding='utf-8'))['bilder']
    ut = []
    for x in [x for x in ant if x['del'] == 'val']:
        img = cv2.imread(os.path.join(data, x['fil']))
        H, W = img.shape[:2]
        t, r = forbehandla(img, h_in, w_in)
        o = sess.run(None, {inp.name: t})[0][0]
        cls = o[:, 5:5 + len(KLASSER)]
        s = o[:, 4] * cls.max(1)
        k = (s >= 0.05) & (cls.argmax(1) < 2)   # kort och baksida; remsorna (namnrad) mäts i remsprov.py
        dets = [[float((cx - w / 2) / r / W), float((cy - h / 2) / r / H), float((cx + w / 2) / r / W), float((cy + h / 2) / r / H), float(sc)]
                for (cx, cy, w, h), sc in zip(o[k][:, :4], s[k])]
        ut.append({'typ': x['typ'], 'dets': dets,
                   'lador': [[l[0] / W, l[1] / H, l[2] / W, l[3] / H] for l in x['lador']],
                   'ign': [[y[0] / W, y[1] / H, y[2] / W, y[3] / H] for y in x['ignorera']]})
    if cache:
        json.dump(ut, open(cache, 'w'))
    return ut


def poang(dets, lador, ign):
    par = sorted(((iou(l, d), li, di) for li, l in enumerate(lador) for di, d in enumerate(dets) if iou(l, d) >= 0.5), reverse=True)
    lk, dk = set(), set()
    for v, li, di in par:
        if li in lk or di in dk:
            continue
        lk.add(li); dk.add(di)
    falska = dubbl = 0
    for di, d in enumerate(dets):
        if di in dk:
            continue
        if any(iou(lador[li], d) >= 0.5 for li in lk):
            dubbl += 1
        elif any(andel_inne(d, y) >= 0.5 for y in lador + ign):
            continue
        else:
            falska += 1
    return len(lk), falska, dubbl


def summa(bilder, troskel, fn, typ=None):
    m = f = d = 0
    for b in bilder:
        if typ and b['typ'] != typ:
            continue
        mm, ff, dd = poang(fn([x for x in b['dets'] if x[4] >= troskel]), b['lador'], b['ign'])
        m += mm; f += ff; d += dd
    return m, f, d


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--onnx', required=True)
    p.add_argument('--troskel', type=float, required=True)
    p.add_argument('--data', default=os.path.join(ROT, 'dev', 'material', 'arbete', '2026-09-30-mes-288-traning-detektor-v2'))
    p.add_argument('--cache', default=None)
    a = p.parse_args()
    bilder = detektioner(a.onnx, a.data, a.cache)
    print(f"{len(bilder)} valideringsbilder ({sum(b['typ'] == 'synt' for b in bilder)} syntetiska), tröskel {a.troskel}")
    print('| Regel | matchade | falska | dubbletter | mått | syntetiska: matchade / dubbletter |')
    print('|---|---|---|---|---|---|')
    def rad(namn, fn):
        m, f, d = summa(bilder, a.troskel, fn)
        ms, _, ds = summa(bilder, a.troskel, fn, 'synt')
        print(f'| {namn} | {m} | {f} | {d} | {m - f - d} | {ms} / {ds} |')
        return m - f - d
    bast = max(GRANSER, key=lambda t: (rad(f'NMS {t}', lambda x, t=t: nms(x, t)), -t))
    print(f'\nvald: NMS {bast} (MESA_NMS={bast})')


if __name__ == '__main__':
    main()

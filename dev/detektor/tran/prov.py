#!/usr/bin/env python3
"""MES-288 grind 2: provet — den tränade detektorn (ONNX) på nollprovets bilder, sparat i samma
format som dev/detektor/kor.py så att dev/detektor/rapport.py räknar med exakt samma mått.

Bilderna: de sju ritade golden-fallen (bild.jpg) och högbänkens 68 fall, precis som kor.py.
Inget av det här har tränats på (dev/detektor/delning.json: allt under dev/golden/fall och
hogbank är prov) — det kontrolleras nedan: skriptet stoppar om en provbild står i filistan.

Förbehandling som i YOLOX: bilden skalas (bevarat format) in i 960 × 544, fylls ut med 114
nere/till höger, BGR 0–255. Utdata [1, N, 7]: cx cy w h, objektpoäng, två klasspoäng.
Poäng = objekt × bästa klass; etikett = klassens namn (kort eller baksida). Golv 0,02, ingen NMS
här (rapport.py gör NMS 0,6 klassoberoende). Tiden per bild är onnxruntime på Macens processor.

    python dev/detektor/tran/prov.py --onnx <fil.onnx> --namn tranad-tiny [--filista dev/detektor/tran/filista-v1.txt]
    python dev/detektor/rapport.py --fil dev/detektor/resultat/tranad-tiny.json --per-fall
"""
import argparse, json, os, sys, time
import numpy as np
import cv2

HAR = os.path.dirname(os.path.abspath(__file__))
DET = os.path.dirname(HAR)
ROT = os.path.dirname(os.path.dirname(DET))
sys.path.insert(0, DET)
from facit import alla_fall, las_hogbank  # noqa: E402

KLASSER = ['kort', 'baksida']


def forbehandla(img, h_in, w_in):
    r = min(h_in / img.shape[0], w_in / img.shape[1])
    im = cv2.resize(img, (int(img.shape[1] * r), int(img.shape[0] * r)), interpolation=cv2.INTER_LINEAR)
    pad = np.full((h_in, w_in, 3), 114, np.uint8)
    pad[:im.shape[0], :im.shape[1]] = im
    return pad.transpose(2, 0, 1)[None].astype(np.float32), r


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--onnx', required=True)
    p.add_argument('--namn', required=True)
    p.add_argument('--lag', type=float, default=0.02)
    p.add_argument('--tradar', type=int, default=4)
    p.add_argument('--filista', default=None, help='datasetets filista: stoppar om en provbild finns i den')
    p.add_argument('--bara-fall', action='store_true', help='bara de sju fallen, inte högbänken')
    a = p.parse_args()
    import onnxruntime as ort
    so = ort.SessionOptions()
    so.intra_op_num_threads = a.tradar
    sess = ort.InferenceSession(a.onnx, so, providers=['CPUExecutionProvider'])
    inp = sess.get_inputs()[0]
    _, _, h_in, w_in = inp.shape
    bilder = {}
    for f in alla_fall():
        bilder[f['bild']] = f['id']
    if not a.bara_fall:
        for h in las_hogbank():
            bilder.setdefault(h['bild'], os.path.basename(os.path.dirname(h['bild'])) if h['bild'].endswith('bild.jpg') else os.path.basename(h['bild']))
    if a.filista:
        tranat = set()
        for rad in open(a.filista, encoding='utf-8'):
            if rad.startswith('#'):
                continue
            tranat.add(os.path.realpath(os.path.join(ROT, rad.split('\t')[0])))
        lacka = [b for b in bilder if os.path.realpath(b) in tranat]
        if lacka:
            raise SystemExit(f'provbilder finns i träningens filista: {lacka[:3]}')
        print(f'kontroll: ingen av de {len(bilder)} provbilderna står i {os.path.relpath(a.filista, ROT)} ({len(tranat)} träningsbilder)')
    ut = {'modell': f'tränad {a.namn}', 'variant': f'{w_in}x{h_in}', 'licens': 'Apache-2.0 (YOLOX, Megvii); tränad på Mesas träningsmaterial',
          'fragor': KLASSER, 'lag_troskel': a.lag, 'onnx': os.path.basename(a.onnx), 'bilder': {}}
    forsta = True
    for vag, fid in bilder.items():
        img = cv2.imread(vag)
        H, W = img.shape[:2]
        t = time.perf_counter()
        x, r = forbehandla(img, h_in, w_in)
        if forsta:   # uppvärmning: första bilden körs två gånger, första tiden kastas
            sess.run(None, {inp.name: x})
            forsta = False
            t = time.perf_counter()
            x, r = forbehandla(img, h_in, w_in)
        o = sess.run(None, {inp.name: x})[0][0]
        cls = o[:, 5:5 + len(KLASSER)]
        s = o[:, 4] * cls.max(1)
        k = s >= a.lag
        o, s, lab = o[k], s[k], cls[k].argmax(1)
        det = []
        for (cx, cy, w, h), sc, lb in zip(o[:, :4], s, lab):
            x0, y0, x1, y1 = (cx - w / 2) / r, (cy - h / 2) / r, (cx + w / 2) / r, (cy + h / 2) / r
            det.append([max(0.0, x0 / W), max(0.0, y0 / H), min(1.0, x1 / W), min(1.0, y1 / H), float(sc), KLASSER[int(lb)]])
        ms = round((time.perf_counter() - t) * 1000)
        ut['bilder'][vag] = {'id': fid, 'W': W, 'H': H, 'ms': ms, 'det': det}
        print(f'  {fid[:44]:44} {W}×{H} {ms:6} ms  {len(det):4} detektioner', flush=True)
    fil = os.path.join(DET, 'resultat', a.namn + '.json')
    json.dump(ut, open(fil, 'w'))
    print('sparat', os.path.relpath(fil, ROT))


if __name__ == '__main__':
    main()

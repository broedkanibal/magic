#!/usr/bin/env python3
"""MES-328 steg 2 — remsorna som bilder till namnläsaren (ocr.cjs läser dem med tesseract.js).

Två utsnitt per kort, ur de ritade hörnen (remsor.py), så att OCR:n och bildmodellen mäts på SAMMA
remsor:
  namnrad   bara titelraden: kortets y 0,02–0,12 (namnet står 3,5–9,5 mm ner på 88 mm = 0,04–0,108),
            x 0,03–0,97 — det tightaste utsnitt en detektor som vet var kortet är kan ge
  remsa14   kortets översta 14 %, hela bredden — det remsklassen i den tränade detektorn ritar

Storleken följer appens läsare (Namn.remsa i index.html): remsan skalas så att den blir 64 px hög,
högst 4× upp, aldrig ner — så en 15 px titelrad blir 60 px, en 62 px förblir 62. Varpningen går
direkt från källan till den storleken (en omsampling).

    ~/.mesa/detektor-venv/bin/python dev/remsa/ocr_export.py [--kallor golden mes246] [--res orig 1920 960] [--ut <mapp>]

Skriver <ut>/<res>/<variant>/*.png och <ut>/manifest.json. Förval: dev/material/arbete/2026-10-02-mes-328-ocr/
(gitignorerat, bilderna är prov-material).
"""
import argparse, json, os, sys
import cv2
import numpy as np

HAR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HAR)
from lib import varpa, kortbredd_px, ROT  # noqa: E402
import remsor  # noqa: E402

UT = os.path.join(ROT, 'dev', 'material', 'arbete', '2026-10-02-mes-328-ocr')
MAL_PX, MAX_SKALA = 64, 4           # Namn.REMSA_MAL_PX, skalan max 4 (index.html)
UTSNITT = {'namnrad': (0.03, 0.02, 0.97, 0.12), 'remsa14': (0.0, 0.0, 1.0, 0.14)}


def delkort(horn, u):
    """Fyrhörningen för kortets del (x0, y0, x1, y1 i kortets egna andelar) ur de fyra hörnen."""
    h = np.asarray(horn, np.float32)
    def P(x, y):
        topp = h[0] + x * (h[1] - h[0]); bott = h[3] + x * (h[2] - h[3])
        return topp + y * (bott - topp)
    x0, y0, x1, y1 = u
    return np.array([P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)], np.float32)


def storlek(q):
    """Utsnittets mått i källan (medel av motstående sidor) → målets mått enligt appens skala."""
    w = (np.linalg.norm(q[1] - q[0]) + np.linalg.norm(q[2] - q[3])) / 2
    h = (np.linalg.norm(q[3] - q[0]) + np.linalg.norm(q[2] - q[1])) / 2
    s = max(1.0, min(MAX_SKALA, MAL_PX / max(h, 1)))
    return int(round(w * s)), int(round(h * s)), float(w), float(h), s


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--kallor', nargs='+', default=['golden', 'mes246'])
    p.add_argument('--res', nargs='+', default=['orig', '1920', '960'])
    p.add_argument('--utsnitt', nargs='+', default=list(UTSNITT))
    p.add_argument('--ut', default=UT)
    a = p.parse_args()
    kallor = {}
    if 'golden' in a.kallor: kallor['golden'] = remsor.golden()
    if 'mes246' in a.kallor: kallor['mes246'] = remsor.mes246()
    man = []
    for kalla, poster in kallor.items():
        for res in a.res:
            for post in poster:
                bild = post['orig'] if (res == 'orig' and post['orig']) else post['bild']
                img, _ = remsor.las(bild, res)
                H, W = img.shape[:2]
                for i, k in enumerate(post['kort']):
                    horn = remsor.horn_i_px(k, W, H)
                    for u in a.utsnitt:
                        q = delkort(horn, UTSNITT[u])
                        tw, th, sw, sh, s = storlek(q)
                        strip = varpa(img, q, max(8, tw), max(4, th))
                        mapp = os.path.join(a.ut, res, u); os.makedirs(mapp, exist_ok=True)
                        fn = f"{kalla}-{post['id']}-{i:02d}.png".replace('/', '_')
                        cv2.imwrite(os.path.join(mapp, fn), strip)
                        man.append({'fil': os.path.relpath(os.path.join(mapp, fn), a.ut), 'kalla': kalla, 'bild': post['id'], 'nr': i, 'facit': k['facit'],
                                    'hog': k['hog'], 'tappad': k['tappad'], 'zon': k['zon'], 'namnrad': k['namnrad'], 'synlig': k['synlig'],
                                    'res': res, 'utsnitt': u, 'kall_h_px': round(sh, 1), 'kall_w_px': round(sw, 1), 'skala': round(s, 2),
                                    'kortbredd_px': round(kortbredd_px(horn)),
                                    'lage': f"{post['id']}|{k['kort_id']}" if kalla == 'golden' else str(remsor.lage_nyckel(k))})
            print(f'{kalla} {res}: {sum(1 for x in man if x["kalla"] == kalla and x["res"] == res)} remsor')
    json.dump({'lek': sorted(remsor.lek()), 'remsor': man}, open(os.path.join(a.ut, 'manifest.json'), 'w'), ensure_ascii=False, indent=0)
    print(f'{len(man)} remsor → {os.path.relpath(a.ut, ROT)}/manifest.json')


if __name__ == '__main__':
    main()

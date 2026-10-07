#!/usr/bin/env python3
"""Prompt A (2026-10-07, dev/material/arbete/markning/matningar-2026-10-07-resultat.md), fråga 1: högkorten i golden 13/14/17/18 — detektorn eller läsningen?

Per synligt facitkort med ritade hörn, i appens ordning:
  detektorn   den tränade YOLOX (960×544, som KamDet) på analysbilden (källan nerskalad till 960 px bred, som
              appen): råa namnrad-rader som träffar facitremsan (14 % ur hörnen, IoU ≥ 0,3) — högsta poäng,
              över T.remsa 0,68?, kvar efter NMS 0,6? Remsans höjd i px i källan, i 1920 och i 960.
  läsningen   bildmodellens namn + marginal på den EXAKTA remsan (facits hörn, 14 %, varpad som remsa_ur_bild)
              ur källan i tre upplösningar (orig / 1920 / 960) och på DETEKTORNS remslåda (axelparallell ur
              1920-bilden, som lasRemsa) — med appens modell, v2 och v4; referenser = ref_strip(Scryfall, 0,14),
              vridningar 0/180 (som detektor_remsor.py). Appens remströskel är 0,20 (T.remsaTroskel).
Domen per kort: (a) ingen remslåda (detektorn) · (b) låda, rätt överst men marginal < 0,20 · (c) fel namn överst.

  ~/.mesa/detektor-venv/bin/python dev/remsa/hogremsor.py [--fall 13,14,17,18] [--ut <json>] [--extra 18=<bild>:<namn> ...]
"""
import argparse, json, os, sys, glob
import cv2
import numpy as np

ROT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path[:0] = [os.path.join(ROT, 'dev', 'remsa'), os.path.join(ROT, 'dev', 'detektor'), os.path.join(ROT, 'dev', 'detektor', 'tran')]
from lib import Bildmodell, Referenser, las_referensbilder, ref_strip, kvadrat, dom, remsa_ur_bild, remsa_hojd_px, kortbredd_px, skala_bild  # noqa: E402
from prov import forbehandla  # noqa: E402
from matt import iou, nms  # noqa: E402
from remsa import remsa_lada  # noqa: E402
from facit import original_for  # noqa: E402

ONNX = os.path.join(ROT, 'dev', 'detektor', 'modell', 'yolox_nano_mesa_960x544.onnx')
GOLV, T_REMSA, NMS_REMSA, IOU_PAR, ANDEL, APP_TROSKEL = 0.02, 0.68, 0.6, 0.3, 0.14, 0.20
MODELLER = {'app': os.path.join(ROT, 'dev', 'embed', 'modeller', 'mobileclip-s0-vision.onnx'),
            'v2': os.path.join(ROT, 'dev', 'embed', 'modeller', 'mobileclip-s0-mesa-v2.onnx'),
            'v4': os.path.join(ROT, 'dev', 'embed', 'modeller', 'mobileclip-s0-mesa-v4.onnx')}
LAND = {'Plains', 'Island', 'Swamp', 'Mountain', 'Forest'}


class Detektor:
    def __init__(self):
        import onnxruntime as ort
        so = ort.SessionOptions(); so.intra_op_num_threads = 4
        self.s = ort.InferenceSession(ONNX, so, providers=['CPUExecutionProvider'])
        self.inp = self.s.get_inputs()[0]
        _, _, self.h, self.w = self.inp.shape

    def raa(self, img):
        """Råa namnrad-rader (andelar av bilden) med poäng ≥ GOLV, och samma rader efter tröskel + NMS.
        En stående bild vrids 90° moturs innan modellen ser den och lådorna vrids tillbaka (detektor.js)."""
        H, W = img.shape[:2]
        staende = H > W
        if staende:
            img = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE); H, W = img.shape[:2]
        x, r = forbehandla(img, self.h, self.w)
        o = self.s.run(None, {self.inp.name: x})[0][0]
        s = o[:, 4] * o[:, 5 + 2]
        k = s >= GOLV
        d = [[float((cx - w / 2) / r / W), float((cy - h / 2) / r / H), float((cx + w / 2) / r / W), float((cy + h / 2) / r / H), float(sc)]
             for (cx, cy, w, h), sc in zip(o[k][:, :4], s[k])]
        if staende:
            # (x', y') i den liggande bilden → (1 − y', x') i den stående (detektor.js: x0 = rw − y1, y0 = x0 …)
            d = [[1 - q[3], q[0], 1 - q[1], q[2], q[4]] for q in d]
        efter = nms([q for q in d if q[4] >= T_REMSA], NMS_REMSA)
        return d, efter


def klipp(img, b):
    H, W = img.shape[:2]
    x0, y0 = max(0, int(b[0] * W)), max(0, int(b[1] * H))
    x1, y1 = min(W, int(np.ceil(b[2] * W))), min(H, int(np.ceil(b[3] * H)))
    if x1 - x0 < 2 or y1 - y0 < 2:
        return None
    return img[y0:y1, x0:x1]


def vagrat(strip, horn_px):
    """Remsa på högkant (tappat kort) vrids vågrät åt rätt håll (som detektor_remsor.vagrat)."""
    if strip.shape[1] >= strip.shape[0]:
        return strip
    h = np.asarray(horn_px, np.float32); rikt = h[1] - h[0]
    return cv2.rotate(strip, cv2.ROTATE_90_COUNTERCLOCKWISE if rikt[1] > 0 else cv2.ROTATE_90_CLOCKWISE)


def fall_dir(prefix):
    return next(d for d in sorted(glob.glob(os.path.join(ROT, 'dev', 'golden', 'fall', prefix + '*'))))


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--fall', default='13,14,17,18')
    p.add_argument('--ut', default=os.path.join(ROT, 'dev', 'remsa', 'resultat', 'hogremsor-golden.json'))
    p.add_argument('--extra', nargs='*', default=[], help='fall=<bild>:<namn> — en extra källbild för fallet (t.ex. 18:s 4K-ruta)')
    a = p.parse_args()
    det = Detektor()
    modeller = {n: Bildmodell(fil=f) for n, f in MODELLER.items()}
    bilder = las_referensbilder()
    refs = {n: Referenser(m, [(nm, i, ref_strip(img, ANDEL)) for nm, i, img in bilder], rotar=(0, 180)) for n, m in modeller.items()}
    print(f'referenser: {len(bilder)} bilder, {len(refs["app"].namnlista)} namn; modeller {list(modeller)}', flush=True)
    extra = {}
    for e in a.extra:
        fid, rest = e.split('=', 1); bild, namn = rest.rsplit(':', 1)
        extra.setdefault(fid, []).append((namn, bild))
    rader = []
    for prefix in a.fall.split(','):
        d = fall_dir(prefix)
        f = json.load(open(os.path.join(d, 'facit.json'), encoding='utf-8'))
        kallor = [('bild', os.path.join(d, 'bild.jpg'))]
        orig = original_for(f)
        if orig: kallor.append(('orig', orig))
        kallor += extra.get(prefix, [])
        for knamn, kfil in kallor:
            src = cv2.imread(kfil)
            if src is None:
                print('kan inte läsa', kfil); continue
            H, W = src.shape[:2]
            ana, s960 = skala_bild(src, 960)
            b1920, s1920 = skala_bild(src, 1920)
            raa, efter = det.raa(ana)
            print(f'{prefix} {knamn} {W}x{H}: {len(raa)} råa remsrader, {len(efter)} efter tröskel+NMS', flush=True)
            for k in f['kort']:
                if k.get('dold') or not k.get('horn'):
                    continue
                horn_px = [[x * W, y * H] for x, y in k['horn']]
                fr = remsa_lada(k['horn'], 1.0, 1.0)
                traff = [q for q in raa if iou(q[:4], fr) >= IOU_PAR]
                traff_efter = sorted([q for q in efter if iou(q[:4], fr) >= IOU_PAR], key=lambda q: -q[4])
                rad = {'fall': prefix, 'kalla': knamn, 'kallbild': os.path.relpath(kfil, ROT), 'W': W, 'H': H,
                       'namn': k['namn'], 'id': k.get('id'), 'hog': k.get('hog'), 'tappad': bool(k.get('tappad')), 'synlig': k.get('synlig', 1),
                       'land': k['namn'] in LAND,
                       'kortbredd_px': round(kortbredd_px(horn_px), 1), 'remsa_h_px': round(remsa_hojd_px(horn_px, ANDEL), 1),
                       'remsa_h_1920': round(remsa_hojd_px(horn_px, ANDEL) * s1920, 1), 'remsa_h_960': round(remsa_hojd_px(horn_px, ANDEL) * s960, 1),
                       'det_max': round(max((q[4] for q in traff), default=0.0), 3), 'det_over': any(q[4] >= T_REMSA for q in traff),
                       'det_lada': bool(traff_efter), 'det_poang': round(traff_efter[0][4], 3) if traff_efter else None,
                       'det_h_px': round((traff_efter[0][3] - traff_efter[0][1]) * H, 1) if traff_efter else None,
                       'modell': {}}
                # exakta remsan ur hörnen, i tre upplösningar
                fragor = {}
                for res, img, sk in (('orig', src, 1.0), ('1920', b1920, s1920), ('960', ana, s960)):
                    hp = [[x * sk, y * sk] for x, y in horn_px]
                    strip = remsa_ur_bild(img, hp, ANDEL)
                    fragor[res] = kvadrat(cv2.cvtColor(strip, cv2.COLOR_BGR2RGB))
                if traff_efter:
                    st = klipp(b1920, traff_efter[0][:4])
                    if st is not None:
                        fragor['det1920'] = kvadrat(cv2.cvtColor(vagrat(st, horn_px), cv2.COLOR_BGR2RGB))
                for mn, m in modeller.items():
                    qs = m.kor(list(fragor.values()))
                    for (res, _), q in zip(fragor.items(), qs):
                        e = dom(refs[mn].rangordna(q), k['namn'], APP_TROSKEL)
                        rad['modell'][f'{mn}:{res}'] = {'namn': e['namn'], 'marginal': e['marginal'], 'ratt': e['ratt'], 'nast': e['nast']}
                rader.append(rad)
    json.dump(rader, open(a.ut, 'w'), ensure_ascii=False, indent=1)

    # tabellen: ett kort per rad, källa för källa
    def cell(r, nyckel):
        e = r['modell'].get(nyckel)
        if not e: return '–'
        return f"{'✓' if e['ratt'] else '✗'} {e['namn'][:14]} {e['marginal']:.2f}"
    for prefix in a.fall.split(','):
        for kalla in dict.fromkeys(r['kalla'] for r in rader if r['fall'] == prefix):
            rr = [r for r in rader if r['fall'] == prefix and r['kalla'] == kalla]
            print(f"\n## fall {prefix}, källa {kalla} ({rr[0]['W']}×{rr[0]['H']})")
            print('| kort | hög | syn | tapp | kort px | remsa px (orig/1920/960) | det max | låda | app orig/1920/960/det | v2 orig/1920/960/det | v4 orig/1920/960/det | dom |')
            print('|---|---|---|---|---|---|---|---|---|---|---|---|')
            for r in rr:
                def tre(mn):
                    return ' · '.join(cell(r, f'{mn}:{res}') for res in ('orig', '1920', '960', 'det1920'))
                # domen: a/b/c på appens modell, detektorlådan ur 1920 (det appen läser); utan låda → a
                if not r['det_lada']:
                    domen = 'a detektorn' + (f" (max {r['det_max']:.2f})" if r['det_max'] else ' (ingen rad)')
                else:
                    e = r['modell'].get('app:det1920') or r['modell']['app:1920']
                    domen = ('b under tröskeln' if e['ratt'] and e['marginal'] < APP_TROSKEL else 'ok säker' if e['ratt'] else 'c fel överst')
                print(f"| {r['namn'][:20]} | {r['hog'] or '–'} | {r['synlig']} | {'T' if r['tappad'] else ''} | {r['kortbredd_px']:.0f} | "
                      f"{r['remsa_h_px']:.0f}/{r['remsa_h_1920']:.0f}/{r['remsa_h_960']:.0f} | {r['det_max']:.2f} | "
                      f"{'ja ' + str(r['det_poang']) if r['det_lada'] else 'nej'} | {tre('app')} | {tre('v2')} | {tre('v4')} | {domen} |")
    print(f'\nskrivet: {a.ut}')


if __name__ == '__main__':
    main()

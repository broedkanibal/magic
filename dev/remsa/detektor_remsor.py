#!/usr/bin/env python3
"""MES-328: remsorna som den tränade detektorn FAKTISKT ger (MES-329, natt 2) — inte facitens hörn.

Detektorn (dev/detektor/modell/yolox_nano_mesa_960x544.onnx) körs på hela bilden i 960 × 544, remsklassen
`namnrad` ≥ 0,68 med NMS 0,6 bland remsorna (trösklarna i detektor.js). Varje remsa paras med facitens
remsa (14 % av kortet ur hörnen, IoU ≥ 0,3) så att den får ett namn; remsor utan facit hoppas över
(de kan vara på library, tokens eller dolda kort). Lådan är axelparallell, så för ett kort i vinkel
följer en bit bord med — precis vad appen får.

Ut: för varje detekterad remsa två bilder — ur analysbilden (960 px bred) och ur källan i full
upplösning — i en mapp som ocr.cjs läser (manifest.json), plus bildmodellens svar på samma utsnitt
(axelparallell låda tryckt till kvadrat, referenser = remsor ur Scryfall vid --andel). Så står sätt 2
och sätt 3 sida vid sida på exakt samma remsor, de som appen skulle få.

    ~/.mesa/detektor-venv/bin/python dev/remsa/detektor_remsor.py [--kallor golden mes246] [--andel 0.14] [--ut <mapp>]
"""
import argparse, json, os, sys, time
import cv2
import numpy as np

HAR = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(os.path.dirname(HAR))
DET = os.path.join(ROT, 'dev', 'detektor')
sys.path.insert(0, DET); sys.path.insert(0, os.path.join(DET, 'tran')); sys.path.insert(0, HAR)
from prov import forbehandla, KLASSER  # noqa: E402
from matt import iou, nms  # noqa: E402
from remsa import remsa_lada  # noqa: E402
from lib import Bildmodell, Referenser, las_referensbilder, ref_strip, kvadrat, dom, median, skala_webb  # noqa: E402
import remsor  # noqa: E402
from nollprov import summera, unika  # noqa: E402

ONNX = os.path.join(DET, 'modell', 'yolox_nano_mesa_960x544.onnx')
UT = os.path.join(ROT, 'dev', 'material', 'arbete', '2026-10-02-mes-328-detektorremsor')
T_REMSA, NMS_REMSA, IOU_PAR = 0.68, 0.6, 0.3
MAL_PX, MAX_SKALA = 64, 4
REMSA_KLASS = KLASSER.index('namnrad')


class Detektor:
    def __init__(self, onnx=ONNX):
        import onnxruntime as ort
        so = ort.SessionOptions(); so.intra_op_num_threads = 4
        self.s = ort.InferenceSession(onnx, so, providers=['CPUExecutionProvider'])
        self.inp = self.s.get_inputs()[0]
        _, _, self.h, self.w = self.inp.shape
        self.ms = []

    def remsor(self, img):
        """Remsorna i bilden (andelar), över tröskeln, NMS bland remsorna."""
        H, W = img.shape[:2]
        x, r = forbehandla(img, self.h, self.w)
        t0 = time.perf_counter()
        o = self.s.run(None, {self.inp.name: x})[0][0]
        self.ms.append((time.perf_counter() - t0) * 1000)
        s = o[:, 4] * o[:, 5 + REMSA_KLASS]
        k = s >= T_REMSA
        d = [[float((cx - w / 2) / r / W), float((cy - h / 2) / r / H), float((cx + w / 2) / r / W), float((cy + h / 2) / r / H), float(sc)]
             for (cx, cy, w, h), sc in zip(o[k][:, :4], s[k])]
        return nms(d, NMS_REMSA)


def klipp_lada(img, b):
    H, W = img.shape[:2]
    x0, y0 = max(0, int(b[0] * W)), max(0, int(b[1] * H))
    x1, y1 = min(W, int(np.ceil(b[2] * W))), min(H, int(np.ceil(b[3] * H)))
    if x1 - x0 < 2 or y1 - y0 < 2:
        return None
    return img[y0:y1, x0:x1]


def for_ocr(strip):
    """Appens skala: 64 px hög, högst 4× upp, aldrig ner (Namn.remsa)."""
    h, w = strip.shape[:2]
    s = max(1.0, min(MAX_SKALA, MAL_PX / h))
    if s == 1.0:
        return strip
    return cv2.resize(strip, (max(8, int(round(w * s))), int(round(h * s))), interpolation=cv2.INTER_LINEAR)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--kallor', nargs='+', default=['golden', 'mes246'])
    p.add_argument('--andel', type=float, default=0.14, help='referensremsans höjd (detektorns klass tränades på 14 %%)')
    p.add_argument('--ut', default=UT)
    a = p.parse_args()
    det = Detektor()
    m = Bildmodell()
    bilder = las_referensbilder()
    refs = Referenser(m, [(n, i, ref_strip(img, a.andel)) for n, i, img in bilder], rotar=(0, 180))
    kallor = {}
    if 'golden' in a.kallor: kallor['golden'] = remsor.golden()
    if 'mes246' in a.kallor: kallor['mes246'] = remsor.mes246()
    man, embed_rader = [], {'960': [], 'orig': []}
    stat = {'remsor_det': 0, 'parade': 0, 'oparade': 0, 'facit_utan_remsa': 0, 'facit': 0}
    for kalla, poster in kallor.items():
        for post in poster:
            orig = cv2.imread(post['orig'] or post['bild'])
            # detektorn ser analysbilden: 960 px bred, som appen (KamDet)
            ana, _ = remsor.las(post['bild'], '960') if kalla == 'golden' else remsor.las(post['bild'], '960')
            dets = det.remsor(ana)
            stat['remsor_det'] += len(dets)
            facit = [(remsa_lada([[x, y] for x, y in k['horn_px']], 1.0, 1.0), k) for k in post['kort']]   # horn_px är andelar här (W=H=1)
            stat['facit'] += len(facit)
            tagna = set()
            for di, d in enumerate(dets):
                b = d[:4]
                par = sorted(((iou(fb, b), fi) for fi, (fb, _) in enumerate(facit) if fi not in tagna), reverse=True)
                if not par or par[0][0] < IOU_PAR:
                    stat['oparade'] += 1
                    continue
                fi = par[0][1]; tagna.add(fi); k = facit[fi][1]
                stat['parade'] += 1
                for res, img in (('960', ana), ('orig', orig)):
                    strip = klipp_lada(img, b)
                    if strip is None:
                        continue
                    mapp = os.path.join(a.ut, res, 'detektor'); os.makedirs(mapp, exist_ok=True)
                    fn = f"{kalla}-{post['id']}-{di:02d}.png".replace('/', '_')
                    cv2.imwrite(os.path.join(mapp, fn), for_ocr(strip))
                    rad = {'fil': os.path.relpath(os.path.join(mapp, fn), a.ut), 'kalla': kalla, 'bild': post['id'], 'nr': di, 'facit': k['facit'], 'hog': k['hog'],
                           'tappad': k['tappad'], 'zon': k['zon'], 'namnrad': k['namnrad'], 'synlig': k['synlig'], 'res': res, 'utsnitt': 'detektor',
                           'kall_h_px': strip.shape[0], 'kall_w_px': strip.shape[1], 'poang_det': round(d[4], 3), 'iou_facit': round(par[0][0], 2),
                           'lage': f"{post['id']}|{k['kort_id']}" if kalla == 'golden' else str(remsor.lage_nyckel(k))}
                    man.append(rad)
                    # bildmodellen på samma utsnitt (tappade kort: remsan står på högkant — vrid den vågrät, som parningen i appen vet)
                    s = strip if strip.shape[1] >= strip.shape[0] else cv2.rotate(strip, cv2.ROTATE_90_CLOCKWISE)
                    q = m.kor([kvadrat(cv2.cvtColor(s, cv2.COLOR_BGR2RGB))])[0]
                    e = dom(refs.rangordna(q), k['facit'])
                    e.update({kk: rad[kk] for kk in ('fil', 'kalla', 'bild', 'facit', 'hog', 'tappad', 'res', 'lage', 'kall_h_px')})
                    embed_rader[res].append(e)
            stat['facit_utan_remsa'] += len(facit) - len(tagna)
    json.dump({'lek': sorted(remsor.lek()), 'remsor': man}, open(os.path.join(a.ut, 'manifest.json'), 'w'), ensure_ascii=False, indent=0)
    tab = []
    for res, rader in embed_rader.items():
        s = summera(rader); s.update({'res': res, 'kalla': 'detektorremsor', 'andel': a.andel, 'ms_modell': round(median(m.ms), 1)})
        s['unika'] = unika([r for r in rader if r['kalla'] == 'mes246'])
        for kalla in ('golden', 'mes246'):
            s[kalla] = summera([r for r in rader if r['kalla'] == kalla])
        tab.append(s)
    json.dump({'stat': stat, 'ms_detektor': round(median(det.ms), 1), 'embed': tab, 'embed_rader': embed_rader},
              open(os.path.join(HAR, 'resultat', 'detektorremsor-embed.json'), 'w'), ensure_ascii=False, indent=1)
    print(f"detektorn: {stat['remsor_det']} remsor i {len(man) // 2 if man else 0} par-bilder; parade med facit {stat['parade']}, oparade {stat['oparade']} "
          f"(library/token/dolda eller falska), facitremsor utan detektorremsa {stat['facit_utan_remsa']} av {stat['facit']}; {median(det.ms):.0f} ms/bild")
    for s in tab:
        print(f"bildmodellen på detektorremsor, res {s['res']}: {s['ratt']}/{s['remsor']} rätt, säkra rätt {s['sakra_ratt']}, SÄKRA FEL {s['sakra_fel']}, "
              f"högkort {s['hogkort_ratt']}/{s['hogkort']}, golden {s['golden']['ratt']}/{s['golden']['remsor']} (säkra fel {s['golden']['sakra_fel']}), "
              f"mes246 {s['mes246']['ratt']}/{s['mes246']['remsor']} (säkra fel {s['mes246']['sakra_fel']}), unika lägen {s['unika']['ratt_alla']}/{s['unika']['lagen']}")
    print(f'{len(man)} remsbilder → {os.path.relpath(a.ut, ROT)}/manifest.json (kör node dev/remsa/ocr.cjs på mappen)')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""MES-288 grind 3, natt 2: provet för namnremsan — får varje kort i en hög sin egen remsa?

Facit ur kortens hörn (dev/detektor/remsa.py) i golden-fallen och MES-246:s ritade lägen. Ett kort
kräver en remsa när minst halva namnraden syns (ritverktygets `namnrad`, samma gräns som träningen),
det inte är dolt (handrutor, under det översta i graveyard — som i prov246.py) och det inte är library
eller token. Kort där något av namnraden syns, men mindre än hälften, är valfria: en remsa där är
varken rätt eller falsk.

Måttet: girig en-till-en-matchning med IoU >= 0,5 mellan remsor (klassen `namnrad`, över tröskeln,
NMS 0,6 bland remsorna) och de krävda remsorna. Omatchade remsor: dubblett (IoU >= 0,5 mot en redan
matchad), på ett valfritt kort (IoU >= 0,3), annars falsk. Hela högar: högar (facit `hog`) där varje
krävd remsa har en egen.

Tröskeln väljs på valideringen (matchade − falska − dubbletter bland remsorna, dataset v3) — aldrig här.

    python dev/detektor/tran/remsprov.py --onnx <fil.onnx> --namn natt2-C [--data <dataset v3>]
"""
import argparse, json, os, sys
import cv2

HAR = os.path.dirname(os.path.abspath(__file__))
DET = os.path.dirname(HAR)
ROT = os.path.dirname(os.path.dirname(DET))
sys.path.insert(0, DET)
sys.path.insert(0, HAR)
from facit import FALL_MAPP, FALLEN, fall_id  # noqa: E402
from matt import iou, nms  # noqa: E402
from prov import forbehandla, KLASSER  # noqa: E402
from prov246 import LAGEN, RUTOR, handtackt, HAND_DOLD  # noqa: E402
from remsa import remsa_lada  # noqa: E402
from nms_val import poang  # noqa: E402

REMSA_KLASS = KLASSER.index('namnrad')
NMS_REMSA = 0.6
TROSKLAR = [round(0.05 + 0.01 * i, 2) for i in range(91)]


class Modell:
    def __init__(self, onnx):
        import onnxruntime as ort
        so = ort.SessionOptions(); so.intra_op_num_threads = 4
        self.s = ort.InferenceSession(onnx, so, providers=['CPUExecutionProvider'])
        self.inp = self.s.get_inputs()[0]
        _, _, self.h, self.w = self.inp.shape

    def remsor(self, img, golv=0.05):
        """Remsorna i bilden, [x0, y0, x1, y1, poäng] i andelar."""
        H, W = img.shape[:2]
        x, r = forbehandla(img, self.h, self.w)
        o = self.s.run(None, {self.inp.name: x})[0][0]
        s = o[:, 4] * o[:, 5 + REMSA_KLASS]
        k = s >= golv
        return [[float((cx - w / 2) / r / W), float((cy - h / 2) / r / H), float((cx + w / 2) / r / W), float((cy + h / 2) / r / H), float(sc)]
                for (cx, cy, w, h), sc in zip(o[k][:, :4], s[k])]


def valj_troskel(m, data):
    ant = json.load(open(os.path.join(data, 'anteckningar.json'), encoding='utf-8'))
    if 'namnrad' not in ant['klasser']:
        raise SystemExit(f'{data} har ingen klass namnrad (bygg med dataset.py --remsa)')
    rk = ant['klasser'].index('namnrad')
    bilder = []
    for x in [x for x in ant['bilder'] if x['del'] == 'val']:
        img = cv2.imread(os.path.join(data, x['fil']))
        W, H = x['bredd'], x['hojd']
        lador = [[l[0] / W, l[1] / H, l[2] / W, l[3] / H] for l in x['lador'] if l[4] == rk]
        ign = [[y[0] / W, y[1] / H, y[2] / W, y[3] / H] for y in x['ignorera']]
        bilder.append((nms(m.remsor(img), NMS_REMSA), lador, ign))
    bast = None
    for t in TROSKLAR:
        mm = ff = dd = 0
        for dets, lador, ign in bilder:
            a, b, c = poang([d for d in dets if d[4] >= t], lador, ign)
            mm += a; ff += b; dd += c
        if bast is None or (mm - ff - dd, t) > (bast[0], bast[1]):
            bast = (mm - ff - dd, t, mm, ff, dd)
    n = sum(len(b[1]) for b in bilder)
    print(f'tröskeln på valideringen ({len(bilder)} bilder, {n} remsor): {bast[1]} — matchade {bast[2]}, falska {bast[3]}, dubbletter {bast[4]}')
    return bast[1]


def facit_remsor(kort, W, H, hander=None, grav_topp=True):
    """(krävda, valfria): [(remsans låda i andelar, kort)]."""
    grav = [k for k in kort if k.get('zon') == 'grav']
    topp = max(grav, key=lambda k: k.get('z', 0)) if grav else None
    kravda, valfria = [], []
    for k in kort:
        namn = k.get('namn', '').lower()
        if not k.get('horn') or k.get('zon') == 'bib' or namn == 'library' or namn.startswith('token') or k.get('baksida'):
            continue
        b = remsa_lada([[x * W, y * H] for x, y in k['horn']], W, H)
        b = [b[0] / W, b[1] / H, b[2] / W, b[3] / H]
        nr = k.get('namnrad', 1) or 0
        dold = (grav_topp and k.get('zon') == 'grav' and k is not topp) or (hander and handtackt(b, hander) >= HAND_DOLD)
        if nr >= 0.5 and not dold:
            kravda.append((b, k))
        elif nr > 0:
            valfria.append((b, k))
    return kravda, valfria


def bedom(dets, kravda, valfria):
    par = sorted(((iou(b, d), ki, di) for ki, (b, _) in enumerate(kravda) for di, d in enumerate(dets) if iou(b, d) >= 0.5), reverse=True)
    kk, dk = set(), set()
    for v, ki, di in par:
        if ki in kk or di in dk:
            continue
        kk.add(ki); dk.add(di)
    falska = dubbl = 0
    for di, d in enumerate(dets):
        if di in dk:
            continue
        if any(iou(kravda[ki][0], d) >= 0.5 for ki in kk):
            dubbl += 1
        elif any(iou(b, d) >= 0.3 for b, _ in valfria + kravda):
            continue
        else:
            falska += 1
    hogar = {}
    for ki, (_, k) in enumerate(kravda):
        if k.get('hog'):
            hogar.setdefault(k['hog'], []).append(ki in kk)
    hogar = {h: v for h, v in hogar.items() if len(v) >= 2}
    return {'kravda': len(kravda), 'egna': len(kk), 'falska': falska, 'dubbletter': dubbl,
            'hogkort': sum(len(v) for v in hogar.values()), 'hogkort_egna': sum(sum(v) for v in hogar.values()),
            'hogar': len(hogar), 'hogar_hela': sum(all(v) for v in hogar.values()), 'ok': [ki in kk for ki in range(len(kravda))],
            'missade': [kravda[ki][1]['namn'] for ki in range(len(kravda)) if ki not in kk]}


def summa(rader):
    s = {}
    for r in rader:
        for k, v in r.items():
            if isinstance(v, int):
                s[k] = s.get(k, 0) + v
    return s


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--onnx', required=True)
    p.add_argument('--namn', required=True)
    p.add_argument('--data', default=os.path.join(ROT, 'dev', 'material', 'arbete', '2026-09-30-mes-288-traning-detektor-v3'))
    p.add_argument('--troskel', type=float, default=None, help='hoppar över valet på valideringen')
    a = p.parse_args()
    m = Modell(a.onnx)
    t = a.troskel if a.troskel is not None else valj_troskel(m, a.data)
    ut = {'modell': a.namn, 'troskel': t, 'nms': NMS_REMSA, 'golden': {}, 'mes246': {}}

    for prefix in FALLEN:
        fid = fall_id(prefix)
        f = json.load(open(os.path.join(FALL_MAPP, fid, 'facit.json'), encoding='utf-8'))
        if not (f.get('kort') and all(k.get('horn') for k in f['kort'])):
            continue
        img = cv2.imread(os.path.join(FALL_MAPP, fid, 'bild.jpg'))
        H, W = img.shape[:2]
        kravda, valfria = facit_remsor(f['kort'], W, H)
        dets = nms([d for d in m.remsor(img) if d[4] >= t], NMS_REMSA)
        ut['golden'][prefix] = bedom(dets, kravda, valfria)

    lagen = [l for l in json.load(open(LAGEN, encoding='utf-8'))['lagen'] if l.get('klar')]
    unika = {}
    for l in lagen:
        img = cv2.imread(os.path.join(RUTOR, f"{l['t']:.2f}.jpg"))
        H, W = img.shape[:2]
        kravda, valfria = facit_remsor(l['kort'], W, H, hander=l.get('hander'))
        if not kravda:
            continue
        dets = nms([d for d in m.remsor(img) if d[4] >= t], NMS_REMSA)
        r = bedom(dets, kravda, valfria)
        ut['mes246'][f"{l['t']:.2f}"] = r
        for (b, k), ok in zip(kravda, r['ok']):
            unika.setdefault((k['id'], tuple(round(v * 50) for v in b)), []).append(ok)
    g, s = summa(ut['golden'].values()), summa(ut['mes246'].values())
    ut['summa'] = {'golden': g, 'mes246': s, 'unika': {'kortlagen': len(unika), 'ratt_i_alla': sum(all(v) for v in unika.values())}}
    json.dump(ut, open(os.path.join(DET, 'resultat', f'{a.namn}-remsor.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'\nRemsorna, tröskel {t}, NMS {NMS_REMSA} bland remsorna:')
    print('| | Krävda remsor | Egna | Falska | Dubbletter | Högkort egna | Hela högar |')
    print('|---|---|---|---|---|---|---|')
    for namn, x in (('golden, 8 fall', g), ('MES-246', s)):
        print(f"| {namn} | {x['kravda']} | {x['egna']} | {x['falska']} | {x['dubbletter']} | {x['hogkort_egna']}/{x['hogkort']} | {x['hogar_hela']}/{x['hogar']} |")
    print(f"\nMES-246, unika kortlägen: {ut['summa']['unika']['ratt_i_alla']} av {len(unika)} har en egen remsa i alla förekomster.")
    for prefix, r in ut['golden'].items():
        if r['missade']:
            print(f"  golden {prefix}: missade {', '.join(r['missade'])}")
    print('sparat', os.path.relpath(os.path.join(DET, 'resultat', f'{a.namn}-remsor.json'), ROT))


if __name__ == '__main__':
    main()

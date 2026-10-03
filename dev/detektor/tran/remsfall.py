"""Var försvinner namnremsan? Varje ritat kort följs genom detektorns steg, i appens ordning.

Golden 18 (13b, 0,5×) och 17 (person1:s bord) tappar landen i högarna; i 4K fick två tappade Plains i hög B
ingen remsa alls, så inget läste dem. Frågan är om det är MODELLEN som inte ser remsan (då hjälper bara
träning), eller ett STEG efter den som kastar den (tröskeln, dubblettsteget, tjockleksfiltret, parningen)
— som de två gånger det hänt förut (NMS 0,6 tog högkorten i MES-246, tjockleksfiltret 0,45 tog 15:s Plains).

Stegen per kort (facits remsa = översta 14 % ur hörnen, remsa.py; en låda "träffar" vid IoU ≥ 0,3, som
detektor_remsor.py):
  modell   högsta remspoäng (obj × namnrad) bland modellens RÅA rader som träffar — under golvet 0,02 = ingen
  troskel  någon rå rad som träffar har poäng ≥ 0,68 (detektor.js T.remsa)
  nms      en remsa efter tröskel + NMS 0,6 (para_cli.cjs → avkoda) träffar
  tjock    den remsan klarar tjockleksfiltret (tjocklek/längd ≤ 0,5, Detektor.para steg 0)
  parad    en parad låda (Detektor.para) bär en remsa som träffar
  ratt     …och den lådan är kortets (IoU ≥ 0,3 mot hela kortet eller den synliga delen)
  kortlada någon kortlåda efter NMS träffar kortet (oberoende av remsan)
Första steget som faller är kortets dom. Modellen körs på de ritade rutorna i källans upplösning (4K-rutor
ur dev/material/rita/; golden-fotona bild.jpg) — detektorn ser 960×544 oavsett, så det här är bästa fallet
för detektionen (ingen videokomprimering).

    ~/.mesa/detektor-venv/bin/python dev/detektor/tran/remsfall.py [--kallor mes246,13b,person1,golden]
"""
import argparse, json, os, subprocess, sys, tempfile
from collections import Counter, defaultdict
import cv2
import numpy as np

HAR = os.path.dirname(os.path.abspath(__file__))
DET = os.path.dirname(HAR)
ROT = os.path.dirname(os.path.dirname(DET))
sys.path.insert(0, DET); sys.path.insert(0, HAR)
from facit import las_fall, FALLEN  # noqa: E402
from prov import forbehandla  # noqa: E402
from prov246 import LAGEN, RUTOR, fall_ur_lage, vrid_tillbaka  # noqa: E402
from remsa import remsa_lada  # noqa: E402
from delning import klassa  # noqa: E402

ONNX = os.path.join(DET, 'modell', 'yolox_nano_mesa_960x544.onnx')
CLI = os.path.join(DET, 'modell', 'para_cli.cjs')
GOLV, T_REMSA, TRAFF, TJOCK = 0.02, 0.68, 0.3, 0.5
STEG = ['modell', 'troskel', 'nms', 'tjock', 'parad', 'ratt']
LAND = {'Plains', 'Island', 'Swamp', 'Mountain', 'Forest'}
INSP = os.path.join(ROT, 'dev', 'golden', 'inspelningar')
KALLOR = {
    '13b': (os.path.join(INSP, '2026-10-02-fall-13b-0,5x-sidoljus', 'lagen.json'), os.path.join(ROT, 'dev', 'material', 'rita', 'fall-13b')),
    'person1': (os.path.join(INSP, '2026-10-01-person1-vittbord-morker-lampa', 'lagen.json'), os.path.join(ROT, 'dev', 'material', 'rita', '2026-10-01-person1-vittbord-morker-lampa')),
    'mes246': (LAGEN, RUTOR),
}


def iou(a, b):
    ix = max(0.0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    i = ix * iy
    u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - i
    return i / u if u > 0 else 0.0


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--kallor', default='13b,person1,mes246,golden')
    p.add_argument('--tradar', type=int, default=4)
    p.add_argument('--ut', default=os.path.join(HAR, 'resultat', 'remsfall.json'))
    p.add_argument('--para', default=None, help='parningens inställningar som JSON, t.ex. {"tjockMax": 0.7} — TJOCK-steget följer tjockMax')
    a = p.parse_args()
    import onnxruntime as ort
    so = ort.SessionOptions(); so.intra_op_num_threads = a.tradar
    sess = ort.InferenceSession(ONNX, so, providers=['CPUExecutionProvider'])
    inp = sess.get_inputs()[0]; _, _, h_in, w_in = inp.shape
    tmp = tempfile.mkdtemp(prefix='remsfall-', dir=os.environ.get('TMPDIR') or None)
    bilder, fallen, raa = [], {}, {}

    def kor(bild, fid, f, kalla):
        if klassa(bild)[0] != 'prov':
            raise SystemExit(f'{bild} är inte prov-material')
        img = cv2.imread(bild)
        if img is None:
            return
        staende = img.shape[0] > img.shape[1]
        if staende:
            img = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
        Hd, Wd = img.shape[:2]
        x, r = forbehandla(img, h_in, w_in)
        o = sess.run(None, {inp.name: x})[0][0].astype(np.float32)
        fil = os.path.join(tmp, f'{len(bilder):04d}.f32'); o.tofile(fil)
        bilder.append({'id': fid, 'W': Wd, 'H': Hd, 'r': float(r), 'ut': fil, 'staende': staende, 'kalla': kalla})
        fallen[fid] = f
        # råa remsrader i andelar av den (ev. vridna) bilden
        s = o[:, 4] * o[:, 7]
        k = s >= GOLV
        cx, cy, w, h = o[k, 0], o[k, 1], o[k, 2], o[k, 3]
        d = [[float((x_ - w_ / 2) / r / Wd), float((y_ - h_ / 2) / r / Hd), float((x_ + w_ / 2) / r / Wd), float((y_ + h_ / 2) / r / Hd), float(sc), 'namnrad']
             for x_, y_, w_, h_, sc in zip(cx, cy, w, h, s[k])]
        raa[fid] = vrid_tillbaka(d) if staende else d

    kallor = a.kallor.split(',')
    for kalla in ('13b', 'person1', 'mes246'):
        if kalla not in kallor:
            continue
        lagenfil, mapp = KALLOR[kalla]
        for l in json.load(open(lagenfil, encoding='utf-8'))['lagen']:
            if not l.get('klar'):
                continue
            bild = os.path.join(mapp, f"{l['t']:.2f}.jpg")
            if not os.path.exists(bild):
                continue
            img = cv2.imread(bild); H, W = img.shape[:2]
            f = fall_ur_lage(l, W, H, bild, prefix=kalla)
            if [q for q in f['kort'] if not q['dold']]:
                kor(bild, f['id'], f, kalla)
    if 'golden' in kallor:
        for prefix in FALLEN:
            f = las_fall(prefix)
            kor(f['bild'], 'golden-' + prefix, f, 'golden')

    paraO = json.loads(a.para) if a.para else {}
    global TJOCK
    TJOCK = paraO.get('tjockMax', TJOCK)
    man = {'bilder': [{k: v for k, v in b.items() if k in ('id', 'W', 'H', 'r', 'ut')} for b in bilder], 'para': paraO}
    manFil, utFil = os.path.join(tmp, 'manifest.json'), os.path.join(tmp, 'ut.json')
    json.dump(man, open(manFil, 'w'))
    subprocess.run(['node', CLI, manFil, utFil], check=True)
    ut = {u['id']: u for u in json.load(open(utFil))['bilder']}

    def andelar(lador, b, remsa=False):
        W, H = b['W'], b['H']
        d = [[q['x0'] / W, q['y0'] / H, q['x1'] / W, q['y1'] / H, q.get('poang', 0), q.get('klass', 'kort')] for q in lador]
        return vrid_tillbaka(d) if b['staende'] else d

    rader = []
    for b in bilder:
        f, u = fallen[b['id']], ut[b['id']]
        kortl = andelar(u['kort'], b)
        remsor = andelar(u['remsor'], b)
        # tjocklek/längd i bildpunkter (i den vridna bilden, som para ser den)
        tj = [min(q['x1'] - q['x0'], q['y1'] - q['y0']) / max(1e-6, max(q['x1'] - q['x0'], q['y1'] - q['y0'])) for q in u['remsor']]
        par = []
        for q in u['par']:
            ld = andelar([q], b)[0]
            rm = None
            if q.get('remsa'):
                x0, y0, x1, y1 = q['remsa']
                rm = andelar([{'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1}], b)[0]
            par.append((ld, rm))
        for k in f['kort']:
            if k['dold']:
                continue
            fr = remsa_lada(k['horn'], 1.0, 1.0)
            m = [d[4] for d in raa[b['id']] if iou(d, fr) >= TRAFF]
            nms = [i for i, q in enumerate(remsor) if iou(q, fr) >= TRAFF]
            ok = {
                'modell': bool(m),
                'troskel': any(v >= T_REMSA for v in m),
                'nms': bool(nms),
                'tjock': any(tj[i] <= TJOCK for i in nms),
                'parad': any(rm is not None and iou(rm, fr) >= TRAFF for _, rm in par),
                'ratt': any(rm is not None and iou(rm, fr) >= TRAFF and max(iou(ld, k['hel_lada']), iou(ld, k['synlig_lada'])) >= TRAFF for ld, rm in par),
            }
            fall = next((s for s in STEG if not ok[s]), None)
            # den parade lådan och dess remsa (andelar av källbilden) — det appens lasRemsa skär ur (remsnamn.py)
            parat = next(([ld[:4], rm[:4]] for ld, rm in par if rm is not None and iou(rm, fr) >= TRAFF
                          and max(iou(ld, k['hel_lada']), iou(ld, k['synlig_lada'])) >= TRAFF), None)
            rader.append({
                'fil': fallen[b['id']]['bild'], 'lada': parat[0] if parat else None, 'remsa': parat[1] if parat else None,
                'kalla': b['kalla'], 'bild': b['id'], 'namn': k['namn'], 'id': k.get('id'), 'hog': k.get('hog'), 'tappad': k['tappad'],
                'synlig': k.get('synlig', 1), 'land': k['namn'] in LAND,
                'grupp': ('hög, tappad' if k.get('hog') and k['tappad'] else 'hög' if k.get('hog') else 'tappad' if k['tappad'] else 'ensam'),
                'max_modell': round(max(m), 3) if m else 0.0, 'remsor_nms': len(nms),
                'tjock': round(min(tj[i] for i in nms), 3) if nms else None,
                'kortlada': any(max(iou(q, k['hel_lada']), iou(q, k['synlig_lada'])) >= TRAFF for q in kortl),
                'faller': fall or 'ok',
            })
    os.makedirs(os.path.dirname(a.ut), exist_ok=True)
    json.dump(rader, open(a.ut, 'w'), ensure_ascii=False, indent=0)

    def tabell(rr, rubrik):
        c = Counter(r['faller'] for r in rr)
        n = len(rr)
        delar = ' · '.join(f"{s} {c[s]}" for s in STEG if c[s]) or '–'
        print(f"  {rubrik:22s} {n:4d} kort: ok {c['ok']:4d} ({100 * c['ok'] / max(1, n):3.0f} %) · faller på: {delar} · utan kortlåda {sum(not r['kortlada'] for r in rr)}")

    for kalla in [k for k in ('13b', 'person1', 'golden', 'mes246') if k in kallor]:
        rr = [r for r in rader if r['kalla'] == kalla]
        print(f"\n{kalla}: {len({r['bild'] for r in rr})} bilder")
        tabell(rr, 'alla')
        for g in ('ensam', 'tappad', 'hög', 'hög, tappad'):
            gg = [r for r in rr if r['grupp'] == g]
            if gg: tabell(gg, g)
        ll = [r for r in rr if r['land'] and r['hog']]
        if ll: tabell(ll, 'land i hög')
    print('\nkort som faller i 13b och person1 (land och högkort):')
    for r in rader:
        if r['kalla'] in ('13b', 'person1') and r['faller'] != 'ok' and (r['land'] or r['hog']):
            print(f"  {r['bild']:16s} {r['namn']:20s} {r['grupp']:12s} synlig {r['synlig']:.2f} faller på {r['faller']:8s} modell {r['max_modell']:.2f} tjock {r['tjock']} kortlåda {r['kortlada']}")
    print(f'\nskrivet: {a.ut}')


if __name__ == '__main__':
    main()

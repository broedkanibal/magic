#!/usr/bin/env python3
"""Prompt A (2026-10-07, matningar-2026-10-07-resultat.md) fråga 1, del 2: vad APPENS detektorkedja ger per facitkort i golden 13/14/17/18 — samma steg som
dev/detektor/tran/remsfall.py men för alla fyra fallen (FALLEN i facit.py saknar 17 och 18) och för 13:s/18:s
extra rutor (1920 ur golden-videon, 4K ur 4K-filen). Modellen körs som i appen (960×544, stående vrids), avkodning
och parning av appens egen detektor.js via para_cli.cjs med appens inställningar (skapa 'inga' = T.detRemsa 0,
dubIou 0,3, tjockMax 0,7).

Stegen per kort (facits remsa = 14 % ur hörnen; träff = IoU ≥ 0,3):
  modell    någon rå namnrad-rad ≥ 0,02 träffar
  troskel   … ≥ 0,68
  nms       en remsa efter NMS träffar
  tjock     den klarar tjocklek/längd ≤ 0,7
  parad     en parad kortlåda bär en remsa som träffar
  ratt      … och lådan är kortets (IoU ≥ 0,3 mot hela kortet eller den synliga delen)
Plus: kortlada = någon kortlåda efter NMS träffar kortet; kortlada_parad = en parad låda är kortets (= kortet
blir ett spår i appen, med eller utan remsa). Ett kort utan parad kortlåda blir INGET spår (detRemsa 0).

  ~/.mesa/detektor-venv/bin/python dev/remsa/hogfall.py [--fall 13,14,17,18] [--extra 18=<bild>:<namn> …] [--ut <json>]
"""
import argparse, json, os, subprocess, sys, tempfile, glob
from collections import Counter
import cv2
import numpy as np

ROT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DET = os.path.join(ROT, 'dev', 'detektor')
sys.path[:0] = [DET, os.path.join(DET, 'tran')]
from facit import las_fall  # noqa: E402
from prov import forbehandla  # noqa: E402
from prov246 import vrid_tillbaka  # noqa: E402
from remsa import remsa_lada  # noqa: E402

ONNX = os.path.join(DET, 'modell', 'yolox_nano_mesa_960x544.onnx')
CLI = os.path.join(DET, 'modell', 'para_cli.cjs')
GOLV, T_REMSA, TRAFF, TJOCK = 0.02, 0.68, 0.3, 0.7
STEG = ['modell', 'troskel', 'nms', 'tjock', 'parad', 'ratt']
PARA = {'skapa': 'inga', 'dubIou': 0.3}


def iou(a, b):
    ix = max(0.0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    i = ix * iy
    u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - i
    return i / u if u > 0 else 0.0


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--fall', default='13,14,17,18')
    p.add_argument('--extra', nargs='*', default=[])
    p.add_argument('--ut', default=os.path.join(ROT, 'dev', 'remsa', 'resultat', 'hogfall-golden.json'))
    a = p.parse_args()
    import onnxruntime as ort
    so = ort.SessionOptions(); so.intra_op_num_threads = 4
    sess = ort.InferenceSession(ONNX, so, providers=['CPUExecutionProvider'])
    inp = sess.get_inputs()[0]; _, _, h_in, w_in = inp.shape
    tmp = tempfile.mkdtemp(prefix='hogfall-', dir=os.environ.get('TMPDIR') or None)
    extra = {}
    for e in a.extra:
        fid, rest = e.split('=', 1); bild, namn = rest.rsplit(':', 1)
        extra.setdefault(fid, []).append((namn, bild))
    bilder, fallen, raa = [], {}, {}

    def kor(bild, bid, f):
        img = cv2.imread(bild)
        staende = img.shape[0] > img.shape[1]
        if staende:
            img = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
        Hd, Wd = img.shape[:2]
        x, r = forbehandla(img, h_in, w_in)
        o = sess.run(None, {inp.name: x})[0][0].astype(np.float32)
        fil = os.path.join(tmp, f'{len(bilder):04d}.f32'); o.tofile(fil)
        bilder.append({'id': bid, 'W': Wd, 'H': Hd, 'r': float(r), 'ut': fil, 'staende': staende})
        fallen[bid] = f
        s = o[:, 4] * o[:, 7]
        k = s >= GOLV
        cx, cy, w, h = o[k, 0], o[k, 1], o[k, 2], o[k, 3]
        d = [[float((x_ - w_ / 2) / r / Wd), float((y_ - h_ / 2) / r / Hd), float((x_ + w_ / 2) / r / Wd), float((y_ + h_ / 2) / r / Hd), float(sc), 'namnrad']
             for x_, y_, w_, h_, sc in zip(cx, cy, w, h, s[k])]
        raa[bid] = vrid_tillbaka(d) if staende else d

    for prefix in a.fall.split(','):
        f = las_fall(prefix)
        kor(f['bild'], f'{prefix}:bild', f)
        if f.get('original'):
            kor(f['original'], f'{prefix}:orig', f)
        for namn, bild in extra.get(prefix, []):
            kor(bild, f'{prefix}:{namn}', f)

    man = {'para': PARA, 'bilder': [{k: v for k, v in b.items() if k in ('id', 'W', 'H', 'r', 'ut')} for b in bilder]}
    manFil, utFil = os.path.join(tmp, 'manifest.json'), os.path.join(tmp, 'ut.json')
    json.dump(man, open(manFil, 'w'))
    subprocess.run(['node', CLI, manFil, utFil], check=True)
    ut = {u['id']: u for u in json.load(open(utFil))['bilder']}

    def andelar(lador, b):
        W, H = b['W'], b['H']
        d = [[q['x0'] / W, q['y0'] / H, q['x1'] / W, q['y1'] / H, q.get('poang', 0), q.get('klass', 'kort')] for q in lador]
        return vrid_tillbaka(d) if b['staende'] else d

    rader = []
    for b in bilder:
        f, u = fallen[b['id']], ut[b['id']]
        kortl = andelar(u['kort'], b)
        remsor = andelar(u['remsor'], b)
        tj = [min(q['x1'] - q['x0'], q['y1'] - q['y0']) / max(1e-6, max(q['x1'] - q['x0'], q['y1'] - q['y0'])) for q in u['remsor']]
        par = []
        for q in u['par']:
            ld = andelar([q], b)[0]
            rm = None
            if q.get('remsa'):
                x0, y0, x1, y1 = q['remsa']
                rm = andelar([{'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1}], b)[0]
            par.append((ld, rm, q.get('ur')))
        # kortlådorna paras EN-TILL-EN mot facitkorten som kor.html gör: först mot den synliga rutan, sedan det som
        # blev över mot hela kortet (IoU ≥ 0,3) — annars räknas det översta kortets låda för varje kort i högen
        synl = [k for k in f['kort'] if not k['dold']]
        def para_lador(lador):
            tagna, mina = set(), {}
            for omg in ('synlig_lada', 'hel_lada'):
                kand = sorted(((iou(ld[:4], k[omg]), li, ki) for li, ld in enumerate(lador) if li not in tagna
                               for ki, k in enumerate(synl) if ki not in mina), reverse=True)
                for v, li, ki in kand:
                    if v < TRAFF: break
                    if li in tagna or ki in mina: continue
                    tagna.add(li); mina[ki] = li
            return mina
        parade_egna = para_lador([ld for ld, _, _ in par])
        nms_egna = para_lador(kortl)
        for ki, k in enumerate(synl):
            fr = remsa_lada(k['horn'], 1.0, 1.0)
            m = [d[4] for d in raa[b['id']] if iou(d, fr) >= TRAFF]
            nmsI = [i for i, q in enumerate(remsor) if iou(q, fr) >= TRAFF]
            egen = lambda ld: max(iou(ld, k['hel_lada']), iou(ld, k['synlig_lada'])) >= TRAFF
            ok = {
                'modell': bool(m), 'troskel': any(v >= T_REMSA for v in m), 'nms': bool(nmsI),
                'tjock': any(tj[i] <= TJOCK for i in nmsI),
                'parad': any(rm is not None and iou(rm, fr) >= TRAFF for _, rm, _ in par),
                'ratt': any(rm is not None and iou(rm, fr) >= TRAFF and egen(ld) for ld, rm, _ in par),
            }
            fall = next((s for s in STEG if not ok[s]), None)
            # delar remsan med ett annat facitkort? (en låda som täcker två titlar)
            delad = None
            for i in nmsI:
                andra = [k2['namn'] for k2 in f['kort'] if k2 is not k and not k2['dold'] and iou(remsor[i], remsa_lada(k2['horn'], 1.0, 1.0)) >= TRAFF]
                if andra: delad = andra
            rader.append({
                'fall': b['id'].split(':')[0], 'kalla': b['id'].split(':')[1], 'namn': k['namn'], 'id': k.get('id'), 'hog': k.get('hog'),
                'tappad': k['tappad'], 'synlig': k.get('synlig', 1),
                'max_modell': round(max(m), 3) if m else 0.0, 'remsor_nms': len(nmsI),
                'tjock': round(min(tj[i] for i in nmsI), 3) if nmsI else None,
                'kortlada': ki in nms_egna, 'kortlada_parad': ki in parade_egna,
                'parad_ur': par[parade_egna[ki]][2] if ki in parade_egna else None,
                'parad_remsa': (par[parade_egna[ki]][1] is not None and iou(par[parade_egna[ki]][1], fr) >= TRAFF) if ki in parade_egna else None,
                'delad_remsa': delad, 'faller': fall or 'ok',
            })
    json.dump(rader, open(a.ut, 'w'), ensure_ascii=False, indent=1)
    for b in bilder:
        rr = [r for r in rader if f"{r['fall']}:{r['kalla']}" == b['id']]
        c = Counter(r['faller'] for r in rr)
        print(f"\n## {b['id']} ({b['W']}×{b['H']}{', stående' if b['staende'] else ''}): {len(rr)} kort, remsan ok {c['ok']} · faller på " +
              (' · '.join(f'{s} {c[s]}' for s in STEG if c[s]) or '–') + f" · utan parad kortlåda {sum(not r['kortlada_parad'] for r in rr)}")
        print('| kort | hög | syn | tapp | egen kortlåda (NMS/parad, ur) | egen låda bär kortets remsa | remsa: max rå | efter NMS | tjock | faller på | delad remsa |')
        print('|---|---|---|---|---|---|---|---|---|---|---|')
        for r in rr:
            print(f"| {r['namn'][:22]} | {r['hog'] or '–'} | {r['synlig']} | {'T' if r['tappad'] else ''} | "
                  f"{'ja' if r['kortlada'] else 'nej'}/{'ja' if r['kortlada_parad'] else 'NEJ'}{(' ' + str(r['parad_ur'])) if r['parad_ur'] else ''} | "
                  f"{'ja' if r['parad_remsa'] else ('nej' if r['parad_remsa'] is False else '–')} | "
                  f"{r['max_modell']:.2f} | {r['remsor_nms']} | {r['tjock'] if r['tjock'] is not None else '–'} | {r['faller']} | {', '.join(r['delad_remsa']) if r['delad_remsa'] else ''} |")
    print(f'\nskrivet: {a.ut}')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""MES-288 grind 2: andra provsiffran — detektorn på MES-246:s ritade lägen, med nollprovets mått.

Lägena: dev/golden/inspelningar/2026-09-19-mes-246-las-fore-slapp/lagen.json (Jesper ritade dem i
rita.html, MES-286), rutorna dev/material/rita/mes-246/<t>.jpg (3840 × 2160). Hela inspelningen är
prov (delning.json) och ingår aldrig i träningen.

Facit byggs som ett golden-fall (dev/detektor/facit.py): kort = lägets kort utom library och tokens,
som blir `ovriga` (som i golden-fall 13); dold = mindre än halva namnraden syns, eller den synliga
delen ligger till minst hälften under Jespers handrutor (H i ritverktyget) — ett dolt kort krävs
inte, och en låda på det är inte falsk. Graveyard-korten är
kort (zon grav) och redovisas också för sig. Måttet är matt.bedom, tröskeln ges (den som valdes på
golden-fall 03 i rapport.py) — den väljs aldrig här.

    python dev/detektor/tran/prov246.py --onnx <fil.onnx> --namn tranad-tiny --troskel 0.3 [--resultat]
"""
import argparse, json, os, sys, time
import numpy as np
import cv2

HAR = os.path.dirname(os.path.abspath(__file__))
DET = os.path.dirname(HAR)
ROT = os.path.dirname(os.path.dirname(DET))
sys.path.insert(0, DET)
sys.path.insert(0, HAR)
from facit import kortyta  # noqa: E402
from matt import bedom, filtrera, summera  # noqa: E402
from prov import forbehandla, KLASSER  # noqa: E402

LAGEN = os.path.join(ROT, 'dev', 'golden', 'inspelningar', '2026-09-19-mes-246-las-fore-slapp', 'lagen.json')
RUTOR = os.path.join(ROT, 'dev', 'material', 'rita', 'mes-246')


def handtackt(lada, hander):
    """Andel av lådan som ligger under Jespers handrutor (unionen, räknad på ett rutnät)."""
    if not hander:
        return 0.0
    xs = np.linspace(lada[0], lada[2], 16); ys = np.linspace(lada[1], lada[3], 16)
    X, Y = np.meshgrid(xs, ys)
    inne = np.zeros(X.shape, bool)
    for r in hander:
        inne |= (X >= r[0]) & (X <= r[2]) & (Y >= r[1]) & (Y <= r[3])
    return float(inne.mean())


HAND_DOLD = 0.5   # ett kort vars synliga låda till minst hälften ligger under en hand räknas som dolt (varken krav eller falsk)


def fall_ur_lage(l, W, H, bild):
    kort, ovr = [], []
    for k in l['kort']:
        xs = [p[0] for p in k['horn']]; ys = [p[1] for p in k['horn']]
        hel = [min(xs), min(ys), max(xs), max(ys)]
        if k.get('zon') == 'bib' or k['namn'] == 'library' or k['namn'].lower().startswith('token'):
            ovr.append({'namn': k['namn'], 'horn': k['horn'], 'hel_lada': hel})
            continue
        dold = bool(k.get('dold')) if 'dold' in k else (k.get('namnrad', 1) < 0.5)
        dold = dold or handtackt([k['x'], k['y'], k['x'] + k['w'], k['y'] + k['h']], l.get('hander')) >= HAND_DOLD
        kort.append({'namn': k['namn'], 'id': k['id'], 'synlig_lada': [k['x'], k['y'], k['x'] + k['w'], k['y'] + k['h']],
                     'hel_lada': hel, 'horn': k['horn'], 'synlig': k.get('synlig', 1), 'hog': k.get('hog'),
                     'dold': dold, 'tappad': bool(k.get('tappad')), 'zon': k.get('zon')})
    return {'id': f"mes246-{l['t']:.2f}", 'kort_id': f"{l['t']:.2f}", 'bild': bild, 'W': W, 'H': H, 'kort': kort, 'ovriga': ovr}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--onnx', required=True)
    p.add_argument('--namn', required=True)
    p.add_argument('--troskel', type=float, required=True)
    p.add_argument('--tradar', type=int, default=4)
    p.add_argument('--lag', type=float, default=0.02)
    a = p.parse_args()
    import onnxruntime as ort
    so = ort.SessionOptions(); so.intra_op_num_threads = a.tradar
    sess = ort.InferenceSession(a.onnx, so, providers=['CPUExecutionProvider'])
    inp = sess.get_inputs()[0]
    _, _, h_in, w_in = inp.shape
    lagen = [l for l in json.load(open(LAGEN, encoding='utf-8'))['lagen'] if l.get('klar')]
    per, per_utan_grav, rad = [], [], {}
    unika = {}   # samma kort på samma plats med samma synliga del räknas en gång (partiet är en följd av lägen)
    for l in lagen:
        bild = os.path.join(RUTOR, f"{l['t']:.2f}.jpg")
        img = cv2.imread(bild)
        H, W = img.shape[:2]
        x, r = forbehandla(img, h_in, w_in)
        o = sess.run(None, {inp.name: x})[0][0]
        cls = o[:, 5:5 + len(KLASSER)]
        s = o[:, 4] * cls.max(1)
        k = s >= a.lag
        det = [[float(max(0.0, (cx - w / 2) / r / W)), float(max(0.0, (cy - h / 2) / r / H)), float(min(1.0, (cx + w / 2) / r / W)), float(min(1.0, (cy + h / 2) / r / H)), float(sc), KLASSER[int(lb)]]
               for (cx, cy, w, h), sc, lb in zip(o[k][:, :4], s[k], cls[k].argmax(1))]
        f = fall_ur_lage(l, W, H, bild)
        rad[bild] = {'id': f['id'], 'W': W, 'H': H, 'det': det}
        if not [q for q in f['kort'] if not q['dold']]:
            continue
        mask = kortyta(f)
        r_ = bedom(f, filtrera(det, 'alla', a.troskel, f), mask=mask)
        r_['fall'] = f['kort_id']
        for q, d in zip([q for q in f['kort'] if not q['dold']], r_['kortdom']):
            nyckel = (q['id'], tuple(round(v * 50) for v in q['synlig_lada']), round(q['synlig'] * 10))
            unika.setdefault(nyckel, []).append(d['dom'])
        per.append(r_)
        f2 = dict(f, kort=[q for q in f['kort'] if q.get('zon') != 'grav'], ovriga=f['ovriga'] + [{'namn': q['namn'], 'horn': q['horn'], 'hel_lada': q['hel_lada']} for q in f['kort'] if q.get('zon') == 'grav'])
        if [q for q in f2['kort'] if not q['dold']]:
            r2 = bedom(f2, filtrera(det, 'alla', a.troskel, f2), mask=kortyta(f2))
            per_utan_grav.append(r2)
    s = summera(per)
    s2 = summera(per_utan_grav)
    u_ratt = sum(1 for v in unika.values() if all(x == 'eget' for x in v))
    ut = {'modell': a.namn, 'troskel': a.troskel, 'lagen': len(per), 'alla': s, 'utan_graveyard': s2,
          'unika': {'kortlagen': len(unika), 'ratt_i_alla': u_ratt, 'kort_id': len({k[0] for k in unika})},
          'per_lage': [{k: v for k, v in r_.items() if k not in ('kortdom', 'detdom')} for r_ in per]}
    json.dump({'modell': f'tränad {a.namn}', 'bilder': rad}, open(os.path.join(DET, 'resultat', f'{a.namn}-mes246.json'), 'w'))
    json.dump(ut, open(os.path.join(DET, 'resultat', f'{a.namn}-mes246-summa.json'), 'w'), indent=1)
    print(f"MES-246, {len(per)} ritade lägen, tröskel {a.troskel}:")
    print('| | Synliga kort | Eget | Sammanslaget | Missat | Falska | Dubbl | Kluster | Övriga | Högkort eget | Högar hela |')
    print('|---|---|---|---|---|---|---|---|---|---|---|')
    for namn, x in (('alla kort', s), ('utan graveyard', s2)):
        print(f"| {namn} | {x['kort']} | {x['eget']} | {x['sammanslaget']} | {x['missat']} | {x['falsk']} | {x['dubblett']} | {x['kluster']} | {x['ovrig']} | {x['hog_eget']}/{x['hog_kort']} | {x['hogar_hela']}/{x['hogar']} |")
    print(f"\nUnika kortlägen (samma kort, samma plats, samma synliga del — partiet är en följd av lägen): "
          f"{len(unika)} av {s['kort']} förekomster, {len({k[0] for k in unika})} olika kort. Rätt (egen låda) i alla förekomster: {u_ratt} av {len(unika)}.")


if __name__ == '__main__':
    main()

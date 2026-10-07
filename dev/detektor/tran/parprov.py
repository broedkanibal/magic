#!/usr/bin/env python3
"""MES-329: provet för parningen remsa + kortlåda — appens egen kod (dev/detektor/modell/detektor.js,
körd i node via para_cli.cjs) mot MES-246:s ritade lägen och golden-fallen med hörn, med nollprovets
mått (matt.bedom), facit som i prov246.py och prov.py.

Tre tal per prov, samma facit:
  kortlådor     modellens kortlådor efter tröskel 0,56 och NMS 0,7 (ska ge natt 2:s tal: MES-246
                728/738, 37 dubbletter, 97/107 hela högar — kontrollen att avkodningen i JS är rätt)
  parade        kortlådorna efter parningen: dubbletter som delar remsa ihopslagna, remsor utan låda
                blir kort med kortstorleken ur bildens egna lådor (som appen gör)
Modellen körs här (onnxruntime, Macens processor, forbehandla ur prov.py); råa utdatan skrivs till en
mapp och node gör avkodning + parning. Ingen tröskel väljs här.

    python dev/detektor/tran/parprov.py --onnx dev/detektor/modell/yolox_nano_mesa_960x544.onnx --namn natt2-C
    python dev/detektor/tran/parprov.py --onnx … --namn natt2-C --tol 0.6 --tol2 1.5   # parningens toleranser (prov)
"""
import argparse, json, os, subprocess, sys, tempfile
import numpy as np
import cv2

HAR = os.path.dirname(os.path.abspath(__file__))
DET = os.path.dirname(HAR)
ROT = os.path.dirname(os.path.dirname(DET))
sys.path.insert(0, DET)
sys.path.insert(0, HAR)
from facit import kortyta, las_fall, FALLEN  # noqa: E402
from matt import bedom, summera  # noqa: E402
from prov import forbehandla  # noqa: E402
from prov246 import LAGEN, RUTOR, fall_ur_lage, vrid_tillbaka  # noqa: E402

CLI = os.path.join(DET, 'modell', 'para_cli.cjs')


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--onnx', required=True)
    p.add_argument('--namn', required=True)
    p.add_argument('--tradar', type=int, default=4)
    p.add_argument('--tol', type=float, default=None)
    p.add_argument('--tol2', type=float, default=None)
    p.add_argument('--lod', type=int, default=None)
    p.add_argument('--vag', type=int, default=None)
    p.add_argument('--per-lage', action='store_true', help='skriv varje läge där parade skiljer sig från kortlådorna')
    p.add_argument('--para', default=None, help='parningens inställningar som JSON, t.ex. {"skapa":"fria","inne":0.8} (prov)')
    a = p.parse_args()
    import onnxruntime as ort
    so = ort.SessionOptions(); so.intra_op_num_threads = a.tradar
    sess = ort.InferenceSession(a.onnx, so, providers=['CPUExecutionProvider'])
    inp = sess.get_inputs()[0]
    _, _, h_in, w_in = inp.shape

    tmp = tempfile.mkdtemp(prefix='parprov-', dir=os.environ.get('TMPDIR') or None)
    bilder, fallen = [], {}

    def kor(bild, fid, f):
        img = cv2.imread(bild)
        H, W = img.shape[:2]
        staende = H > W
        if staende:
            img = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
        Hd, Wd = img.shape[:2]
        x, r = forbehandla(img, h_in, w_in)
        o = sess.run(None, {inp.name: x})[0][0].astype(np.float32)
        fil = os.path.join(tmp, f'{len(bilder):04d}.f32')
        o.tofile(fil)
        bilder.append({'id': fid, 'W': Wd, 'H': Hd, 'r': float(r), 'ut': fil, 'staende': staende})
        fallen[fid] = f

    # MES-246: Jespers ritade lägen
    lagen = [l for l in json.load(open(LAGEN, encoding='utf-8'))['lagen'] if l.get('klar')]
    for l in lagen:
        bild = os.path.join(RUTOR, f"{l['t']:.2f}.jpg")
        img = cv2.imread(bild); H, W = img.shape[:2]
        f = fall_ur_lage(l, W, H, bild)
        if not [q for q in f['kort'] if not q['dold']]:
            continue
        kor(bild, f['id'], f)
    # golden-fallen med hörn
    for prefix in FALLEN:
        f = las_fall(prefix)
        kor(f['bild'], 'golden-' + prefix, f)

    man = {'bilder': bilder, 'para': {k: v for k, v in (('tol', a.tol), ('tol2', a.tol2), ('lod', a.lod), ('vag', a.vag)) if v is not None}}
    if a.para:
        man['para'].update(json.loads(a.para))
    manFil, utFil = os.path.join(tmp, 'manifest.json'), os.path.join(tmp, 'ut.json')
    json.dump(man, open(manFil, 'w'))
    subprocess.run(['node', CLI, manFil, utFil], check=True)
    ut = json.load(open(utFil))

    def andelar(lador, b):
        W, H = b['W'], b['H']
        d = [[k['x0'] / W, k['y0'] / H, k['x1'] / W, k['y1'] / H, k['poang'], k.get('klass', 'kort')] for k in lador]
        return vrid_tillbaka(d) if b['staende'] else d

    rader = {'kortlador': {'mes246': [], 'golden': []}, 'parade': {'mes246': [], 'golden': []}}
    unika = {'kortlador': {}, 'parade': {}}
    skillnader, dubbl, skapade = [], 0, 0
    for b, u in zip(bilder, ut['bilder']):
        f = fallen[b['id']]
        mask = kortyta(f)
        grupp = 'golden' if b['id'].startswith('golden-') else 'mes246'
        res = {}
        for namn, lador in (('kortlador', u['kort']), ('parade', u['par'])):
            r_ = bedom(f, andelar(lador, b), mask=mask)
            r_['fall'] = b['id']
            rader[namn][grupp].append(r_)
            res[namn] = r_
            if grupp == 'mes246':
                for q, d in zip([q for q in f['kort'] if not q['dold']], r_['kortdom']):
                    nyckel = (q['id'], tuple(round(v * 50) for v in q['synlig_lada']), round(q['synlig'] * 10))
                    unika[namn].setdefault(nyckel, []).append(d['dom'])
        dubbl += u['dubbletter']; skapade += u['skapade']
        k, q = res['kortlador'], res['parade']
        # diagnos: skapade kort (ur remsa) som bedömdes som dubblett/kluster/falsk — var satt remsan mot närmaste modellåda?
        if a.per_lage:
            for kk, dd in zip(u['par'], q['detdom']):
                if kk['ur'] != 'remsa' or dd['dom'] == 'matchad':
                    continue
                sx0, sy0, sx1, sy1 = kk['remsa']; scx, scy = (sx0 + sx1) / 2, (sy0 + sy1) / 2
                vag = (sx1 - sx0) >= (sy1 - sy0)
                inne = [m for m in u['kort'] if m['x0'] <= scx <= m['x1'] and m['y0'] <= scy <= m['y1']]
                # lådans egen parade remsa (MES-340 steg 2: skiljer en andra remsa på samma titel från en granntitel som sticker fram)
                egen = {(round(pp['x0']), round(pp['y0'])): pp.get('remsa') for pp in u['par']}
                def remsaText(m):
                    r = egen.get((round(m['x0']), round(m['y0'])))
                    return f" remsa {int(r[0])},{int(r[1])}–{int(r[2])},{int(r[3])}" if r else ' utan remsa'
                beskr = []
                for m in inne:
                    if vag:
                        d = min(abs(sy0 - m['y0']), abs(sy1 - m['y1'])) / max(1, m['y1'] - m['y0'])
                    else:
                        d = min(abs(sx0 - m['x0']), abs(sx1 - m['x1'])) / max(1, m['x1'] - m['x0'])
                    beskr.append(f"låda {int(m['x0'])},{int(m['y0'])}–{int(m['x1'])},{int(m['y1'])} p{m['poang']:.2f} avstånd {d:.3f}{remsaText(m)}")
                if not inne and u['kort']:
                    m = min(u['kort'], key=lambda m: abs((m['x0'] + m['x1']) / 2 - scx) + abs((m['y0'] + m['y1']) / 2 - scy))
                    beskr.append(f"närmast: låda {int(m['x0'])},{int(m['y0'])}–{int(m['x1'])},{int(m['y1'])} p{m['poang']:.2f}{remsaText(m)}")
                print(f"    {b['id']}: skapat kort {dd['dom']} ur {'vågrät' if vag else 'stående'} remsa {int(sx0)},{int(sy0)}–{int(sx1)},{int(sy1)} (tjock {int(min(sx1-sx0, sy1-sy0))}); i lådor: {'; '.join(beskr) or 'ingen'}")
        if (k['eget'], k['falsk'], k['dubblett'], k['hogar_hela']) != (q['eget'], q['falsk'], q['dubblett'], q['hogar_hela']):
            skillnader.append({'fall': b['id'], 'kort': k['kort'], 'kortlador': [k['eget'], k['falsk'], k['dubblett'], k['hogar_hela'], k['hogar']],
                               'parade': [q['eget'], q['falsk'], q['dubblett'], q['hogar_hela'], q['hogar']], 'skapade': u['skapade'], 'ihopslagna': u['dubbletter'],
                               'missade_parade': [d['namn'] for d in q['kortdom'] if d['dom'] != 'eget'], 'falska_parade': [d['lada'] for d in q['detdom'] if d['dom'] == 'falsk']})

    print(f"Parningen (detektor.js para), {len(lagen)} ritade lägen i MES-246 och {len(FALLEN)} golden-fall, "
          f"trösklar kort {ut['tro']['kort']} NMS {ut['tro']['nmsKort']}, remsa {ut['tro']['remsa']} NMS {ut['tro']['nmsRemsa']}"
          f"{', parning ' + json.dumps(ut['para']) if ut['para'] else ''}:")
    print('| | Synliga kort | Eget | Sammanslaget | Missat | Falska | Dubbl | Kluster | Högkort eget | Högar hela | Unika lägen rätt |')
    print('|---|---|---|---|---|---|---|---|---|---|---|')
    summor = {}
    for grupp in ('mes246', 'golden'):
        for namn in ('kortlador', 'parade'):
            s = summera(rader[namn][grupp]); summor[f'{grupp}-{namn}'] = s
            u_ = unika[namn]
            ur = f"{sum(1 for v in u_.values() if all(x == 'eget' for x in v))}/{len(u_)}" if grupp == 'mes246' else '–'
            print(f"| {grupp}, {namn} | {s['kort']} | {s['eget']} | {s['sammanslaget']} | {s['missat']} | {s['falsk']} | {s['dubblett']} | {s['kluster']} | {s['hog_eget']}/{s['hog_kort']} | {s['hogar_hela']}/{s['hogar']} | {ur} |")
    print(f"\nParningen slog ihop {dubbl} dubbletter (delade remsa) och skapade {skapade} kort ur remsor utan låda.")
    if a.per_lage:
        for s in skillnader:
            print(f"  {s['fall']}: kortlådor eget/falska/dubbl/högar {s['kortlador'][0]}/{s['kortlador'][1]}/{s['kortlador'][2]}/{s['kortlador'][3]} av {s['kortlador'][4]} → parade {s['parade'][0]}/{s['parade'][1]}/{s['parade'][2]}/{s['parade'][3]}"
                  f" (skapade {s['skapade']}, ihopslagna {s['ihopslagna']}){' — missade: ' + ', '.join(s['missade_parade']) if s['missade_parade'] else ''}{' — falska: ' + str(s['falska_parade']) if s['falska_parade'] else ''}")
    fil = os.path.join(DET, 'resultat', f'{a.namn}-par-summa.json')
    json.dump({'modell': a.namn, 'tro': ut['tro'], 'para': ut['para'], 'summor': summor, 'ihopslagna': dubbl, 'skapade': skapade, 'skillnader': skillnader,
               'unika': {k: {'kortlagen': len(v), 'ratt_i_alla': sum(1 for x in v.values() if all(y == 'eget' for y in x))} for k, v in unika.items()}},
              open(fil, 'w'), indent=1, ensure_ascii=False)
    print('sparat', os.path.relpath(fil, ROT))


if __name__ == '__main__':
    main()

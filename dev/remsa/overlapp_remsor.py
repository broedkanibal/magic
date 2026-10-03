"""MES-331: gör kortet OVANPÅ och flera utsnitt remsan stabilare — utan säkra fel?

Golden 14:s bakersta Plains (spår #8) fick titeldelen 0,169 i appen och 0,246 när bänken skar samma låda
ur samma bild: läsningen är så skör att omskalningen ensam flyttar den förbi gränsen 0,20. Remsan är till
hälften annat än namnet — fickans kant upptill och kortet ovanpå nedtill. Två grepp mäts här på alla
detektorremsor (golden + MES-246, samma som detektor_remsor.py), i båda upplösningarna:

  mala    korten som ligger OVANPÅ (facitens z) målas över i remsan med bildens grå, som appens
          lasRemsa redan gör för syntetiska remsor (t.tackt). Lådorna är detektorns kortlådor parade
          mot facit — appen vet vem som ligger överst ur remsorna (fyndUrLador), här ur facit: det
          bästa fallet för appens vetskap.
  jitter  medelvektorn över fem utsnitt (marginal 0/0,04/0,08 och ±6 % tvärs remsan) i stället för ett.

Domen är appens (kamLasRemsa): säker när hela remsan > 0,15, eller titeldelen (vänstra 55 %) har samma
namn överst med marginal > 0,20 och hela remsan ≥ 0,05. Kravet: 0 säkra fel i varje variant.

  ~/.mesa/detektor-venv/bin/python dev/remsa/overlapp_remsor.py [--kallor golden,mes246] [--tradar 2]
"""
import argparse, json, os, sys
import cv2
import numpy as np

HAR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HAR)
import detektor_remsor as dr  # noqa: E402  (lägger detektorns sökvägar)
from prov import forbehandla  # noqa: E402
from matt import iou, nms  # noqa: E402
from remsa import remsa_lada  # noqa: E402
from lib import Bildmodell, Referenser, las_referensbilder, ref_strip, kvadrat  # noqa: E402
import remsor  # noqa: E402

T_KORT, NMS_KORT = 0.56, 0.7            # detector.js T
HEL, TITEL, VITTNE, VANSTER = 0.15, 0.20, 0.05, 0.55   # Kamera.T: remsaTroskel, remsaTitelTroskel, remsaVittne, remsaTitel
MARG = 0.04                              # lasRemsa: marginalen runt remslådan
JITTER = [(0.04, 0.0), (0.0, 0.0), (0.08, 0.0), (0.04, -0.06), (0.04, 0.06)]   # (marginal, förskjutning tvärs remsan i remstjocklekar)

# z följer med facit-korten (remsor._kort tar inte med den)
_kort0 = remsor._kort
remsor._kort = lambda k, b, W, H, extra: dict(_kort0(k, b, W, H, extra), z=k.get('z'))


def kortlador(det, img):
    """Detektorns kortlådor (klass kort/baksida), andelar, efter tröskel och NMS 0,7 — som detector.js."""
    H, W = img.shape[:2]
    x, r = forbehandla(img, det.h, det.w)
    o = det.s.run(None, {det.inp.name: x})[0][0]
    obj = o[:, 4]; k = o[:, 5:8]
    kl = np.argmax(k, axis=1)
    ut = []
    for i in np.where((kl < 2) & (obj * k[np.arange(len(k)), np.minimum(kl, 1)] >= T_KORT))[0]:
        cx, cy, w, h = o[i, :4]
        ut.append([float((cx - w / 2) / r / W), float((cy - h / 2) / r / H), float((cx + w / 2) / r / W), float((cy + h / 2) / r / H),
                   float(obj[i] * k[i, kl[i]])])
    return nms(ut, NMS_KORT)


def kortets_lada(horn):
    xs = [p[0] for p in horn]; ys = [p[1] for p in horn]
    return [min(xs), min(ys), max(xs), max(ys)]


def utsnitt(img, b, marg, skjut, lodrat):
    H, W = img.shape[:2]
    w, h = b[2] - b[0], b[3] - b[1]
    dx, dy = (skjut * w, 0.0) if lodrat else (0.0, skjut * h)
    return dr.klipp_lada(img, [b[0] - w * marg + dx, b[1] - h * marg + dy, b[2] + w * marg + dx, b[3] + h * marg + dy])


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--kallor', default='golden,mes246')
    p.add_argument('--tradar', type=int, default=2)
    p.add_argument('--ut', default=os.path.join(HAR, 'resultat', 'overlapp-remsor.json'))
    a = p.parse_args()
    det = dr.Detektor()
    m = Bildmodell(tradar=a.tradar)
    refs = Referenser(m, [(n, i, ref_strip(img, 0.14)) for n, i, img in las_referensbilder()], rotar=(0, 180))

    def dom(vs):
        q = np.mean(vs, axis=0); q = q / max(float(np.linalg.norm(q)), 1e-9)
        l = refs.rangordna(q)[:2]
        return l[0][0], l[0][1] - l[1][1]

    kallor = {}
    if 'golden' in a.kallor: kallor['golden'] = remsor.golden()
    if 'mes246' in a.kallor: kallor['mes246'] = remsor.mes246()
    rader = []
    for kalla, poster in kallor.items():
        for post in poster:
            orig = cv2.imread(post['orig'] or post['bild'])
            ana, _ = remsor.las(post['bild'], '960')
            dets = det.remsor(ana)
            klador = kortlador(det, ana)
            facit = [(remsa_lada([[x, y] for x, y in k['horn_px']], 1.0, 1.0), k) for k in post['kort']]
            # kortlådorna parade mot facitkorten (hela kortets omskrivna låda), för att veta deras z
            kz = []
            for kb in klador:
                bast = max(((iou(kortets_lada(k['horn_px']), kb[:4]), k) for _, k in facit), key=lambda t: t[0], default=(0, None))
                if bast[0] >= 0.3 and bast[1].get('z') is not None:
                    kz.append((kb[:4], bast[1]['z']))
            tagna = set()
            for d in dets:
                b = d[:4]
                par = sorted(((iou(fb, b), fi) for fi, (fb, _) in enumerate(facit) if fi not in tagna), reverse=True)
                if not par or par[0][0] < dr.IOU_PAR:
                    continue
                fi = par[0][1]; tagna.add(fi); k = facit[fi][1]
                lodrat = (b[3] - b[1]) * ana.shape[0] > (b[2] - b[0]) * ana.shape[1]   # remsan står på högkant (tappat kort)
                ovan = [q for q, z in kz if k.get('z') is not None and z > k['z']
                        and min(q[2], b[2]) > max(q[0], b[0]) and min(q[3], b[3]) > max(q[1], b[1])]
                for res, img in (('960', ana), ('orig', orig)):
                    H, W = img.shape[:2]
                    malad = img
                    if ovan:
                        malad = img.copy(); g = int(np.median(img.reshape(-1, 3), axis=0).mean())
                        for q in ovan:
                            cv2.rectangle(malad, (int(q[0] * W) - 1, int(q[1] * H) - 1), (int(np.ceil(q[2] * W)) + 1, int(np.ceil(q[3] * H)) + 1), (g, g, g), -1)
                    kvad, nyckel = [], []
                    for variant, kalla_img, lista in (('bas', img, JITTER[:1]), ('mala', malad, JITTER[:1]),
                                                      ('jitter', img, JITTER), ('mala+jitter', malad, JITTER)):
                        if variant.startswith('mala') and not ovan:
                            continue
                        for marg, skjut in lista:
                            s = utsnitt(kalla_img, b, marg, skjut, lodrat)
                            if s is None: continue
                            s = dr.vagrat(s, k['horn_px'])
                            for del_, andel in (('hel', 1.0), ('titel', VANSTER)):
                                sd = s if andel == 1.0 else s[:, :max(4, int(round(s.shape[1] * andel)))]
                                kvad.append(kvadrat(cv2.cvtColor(sd, cv2.COLOR_BGR2RGB))); nyckel.append((variant, del_))
                    if not kvad: continue
                    vek = m.kor(kvad)
                    rad = {'kalla': kalla, 'bild': post['id'], 'facit': k['facit'], 'hog': k['hog'], 'res': res, 'ovan': len(ovan)}
                    for variant in ('bas', 'mala', 'jitter', 'mala+jitter'):
                        v = variant if (ovan or not variant.startswith('mala')) else variant.replace('mala+', '').replace('mala', 'bas')
                        hel = [vek[i] for i, n in enumerate(nyckel) if n == (v, 'hel')]
                        tit = [vek[i] for i, n in enumerate(nyckel) if n == (v, 'titel')]
                        if not hel: continue
                        hn, hm = dom(hel); tn, tm = dom(tit)
                        saker = hm > HEL or (tn == hn and tm > TITEL and hm >= VITTNE)
                        rad[variant] = {'namn': hn, 'hel': round(float(hm), 3), 'titel': tn, 'tm': round(float(tm), 3), 'saker': bool(saker), 'ratt': hn == k['facit']}
                    rader.append(rad)
            print(f"{kalla} {post['id']}: {len(rader)} rader", flush=True)
    json.dump(rader, open(a.ut, 'w'), ensure_ascii=False)
    print()
    for kalla in kallor:
        for res in ('960', 'orig'):
            rr = [r for r in rader if r['kalla'] == kalla and r['res'] == res]
            delar = []
            for variant in ('bas', 'mala', 'jitter', 'mala+jitter'):
                sr = sum(1 for r in rr if r[variant]['saker'] and r[variant]['ratt'])
                sf = [r for r in rr if r[variant]['saker'] and not r[variant]['ratt']]
                delar.append(f"{variant} {sr} rätt/{len(sf)} fel")
            ov = [r for r in rr if r['ovan']]
            print(f"{kalla:7s} {res:4s} {len(rr)} remsor ({len(ov)} med kort ovanpå): " + ' · '.join(delar))
            for variant in ('bas', 'mala', 'jitter', 'mala+jitter'):
                for r in rr:
                    if r[variant]['saker'] and not r[variant]['ratt']:
                        print(f"    SÄKERT FEL {variant}: {r['bild']} {r['facit']} → {r[variant]['namn']} hel {r[variant]['hel']} titel {r[variant]['titel']} {r[variant]['tm']}")
    print(f"\nskrivet: {a.ut}")


if __name__ == '__main__':
    main()

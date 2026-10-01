#!/usr/bin/env python3
"""MES-288: varför missas högkorten i MES-246? Ett bildark över varje unikt kortläge i en hög
(utom graveyard) som inte fick en egen låda, ur prov246.py:s sparade detektioner. Kör inte modellen.

För varje sådant kort: domen (sammanslaget/missat), om detektorn hade en rätt låda (IoU >= 0,5)
FÖRE NMS över tröskeln (då tog dubblettsteget bort den), eller bara under tröskeln (poängen), eller
inte alls; hur mycket kortets synliga låda överlappar grannarnas; hur mycket av kortet som syns.

    python dev/detektor/tran/hogfel.py --namn natt1-B --troskel 0.40 --ut <mapp> [--jamfor natt1-A:0.58 tranad-nano:0.56]
"""
import argparse, base64, json, os, sys
import cv2

HAR = os.path.dirname(os.path.abspath(__file__))
DET = os.path.dirname(HAR)
sys.path.insert(0, DET)
sys.path.insert(0, HAR)
from facit import kortyta  # noqa: E402
from matt import bedom, filtrera, iou, NMS_IOU  # noqa: E402
from prov246 import LAGEN, RUTOR, fall_ur_lage  # noqa: E402


def nyckel(q):
    return (q['id'], tuple(round(v * 50) for v in q['synlig_lada']), round(q['synlig'] * 10))


def fel_hogkort(namn, troskel):
    """{nyckel: [(läge, kort, alla dets, dets efter filtrera, dom)]} för högkort som inte fick egen låda någon gång."""
    res = json.load(open(os.path.join(DET, 'resultat', f'{namn}-mes246.json'), encoding='utf-8'))['bilder']
    lagen = [l for l in json.load(open(LAGEN, encoding='utf-8'))['lagen'] if l.get('klar')]
    ut = {}
    for l in lagen:
        bild = os.path.join(RUTOR, f"{l['t']:.2f}.jpg")
        r = res[bild]
        f = fall_ur_lage(l, r['W'], r['H'], bild)
        synliga = [q for q in f['kort'] if not q['dold']]
        if not synliga:
            continue
        efter = filtrera(r['det'], 'alla', troskel, f)
        b = bedom(f, efter, mask=kortyta(f))
        for q, d in zip(synliga, b['kortdom']):
            if q.get('hog') and q.get('zon') != 'grav' and d['dom'] != 'eget':
                ut.setdefault(nyckel(q), []).append((l, q, f, r['det'], efter, d['dom']))
    return ut


def orsak(q, f, alla, efter, troskel):
    s = q['synlig_lada']
    over = [d for d in alla if d[4] >= troskel]
    fore_nms = max([iou(s, d) for d in over] or [0])
    under = [d for d in alla if d[4] < troskel and iou(s, d) >= 0.5]
    grannar = [g for g in f['kort'] if g is not q and not g['dold'] and g.get('hog') == q.get('hog')]
    max_granne = max([iou(s, g['synlig_lada']) for g in grannar] or [0])
    if fore_nms >= 0.5:
        o = 'NMS tog bort den'
    elif under:
        o = f"under tröskeln (bästa {max(d[4] for d in under):.2f})"
    else:
        o = 'ingen låda alls'
    return o, round(fore_nms, 2), round(max_granne, 2)


def beskar(q, f, alla, efter, troskel):
    img = cv2.imread(f['bild'])
    H, W = img.shape[:2]
    hel = q['hel_lada']
    cw, ch = (hel[2] - hel[0]) * W, (hel[3] - hel[1]) * H
    cx, cy = (hel[0] + hel[2]) / 2 * W, (hel[1] + hel[3]) / 2 * H
    m = max(cw, ch) * 1.6
    x0, y0, x1, y1 = int(max(0, cx - m)), int(max(0, cy - m)), int(min(W, cx + m)), int(min(H, cy + m))
    p = lambda b: ((int(b[0] * W), int(b[1] * H)), (int(b[2] * W), int(b[3] * H)))
    for g in f['kort']:
        if g is not q and g.get('hog') == q.get('hog') and not g['dold']:
            cv2.rectangle(img, *p(g['synlig_lada']), (0, 220, 255), 3)
    for d in efter:
        cv2.rectangle(img, *p(d), (255, 200, 0), 5)
    for d in alla:
        if d[4] >= troskel and iou(q['synlig_lada'], d) >= 0.5 and d not in efter:
            cv2.rectangle(img, *p(d), (255, 0, 255), 4)
    cv2.rectangle(img, *p(q['synlig_lada']), (0, 0, 255), 7)
    c = img[y0:y1, x0:x1]
    s = 520 / max(c.shape[1], 1)
    c = cv2.resize(c, (520, int(c.shape[0] * s)), interpolation=cv2.INTER_AREA)
    return base64.b64encode(cv2.imencode('.jpg', c, [cv2.IMWRITE_JPEG_QUALITY, 82])[1]).decode()


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--namn', required=True)
    p.add_argument('--troskel', type=float, required=True)
    p.add_argument('--ut', required=True)
    p.add_argument('--jamfor', nargs='*', default=[])
    a = p.parse_args()
    fel = fel_hogkort(a.namn, a.troskel)
    andra = {x.split(':')[0]: set(fel_hogkort(x.split(':')[0], float(x.split(':')[1]))) for x in a.jamfor}
    rader, kort = {}, []
    for k, forek in sorted(fel.items(), key=lambda kv: kv[1][0][0]['t']):
        l, q, f, alla, efter, dom = forek[0]
        o, fore, granne = orsak(q, f, alla, efter, a.troskel)
        rader[o] = rader.get(o, 0) + 1
        ocksa = [n for n, s in andra.items() if k in s]
        kort.append(dict(t=l['t'], namn=q['namn'], hog=q['hog'], dom=dom, orsak=o, fore=fore, granne=granne,
                         synlig=q['synlig'], ggr=len(forek), ocksa=ocksa, bild=beskar(q, f, alla, efter, a.troskel)))
    print(f"{a.namn} @ {a.troskel}, NMS {NMS_IOU}: {len(kort)} unika högkortlägen utan egen låda")
    for o, n in sorted(rader.items(), key=lambda x: -x[1]):
        print(f"  {n:3d}  {o}")
    for k in kort:
        print(f"  {k['t']:6.2f}  {k['namn'][:22]:22s} hög {k['hog']}  {k['dom']:12s} {k['orsak']:28s} före NMS {k['fore']:.2f}  granne {k['granne']:.2f}  syns {k['synlig']:.2f}  {k['ggr']} ggr  också: {','.join(k['ocksa']) or '–'}")
    os.makedirs(a.ut, exist_ok=True)
    rutor = '\n'.join(
        f"<figure><img src='data:image/jpeg;base64,{k['bild']}'><figcaption><b>{k['namn']}</b> · hög {k['hog']} · {k['t']:.2f} s"
        f"<br>{k['dom']} — {k['orsak']}<br>syns {k['synlig'] * 100:.0f} % · överlapp med granne {k['granne']:.2f} · {k['ggr']} rutor"
        f"<br>missas också av: {', '.join(k['ocksa']) or 'ingen'}</figcaption></figure>" for k in kort)
    html = f"""<!doctype html><html lang=sv><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>Högkort som missas</title><style>
:root{{--bg:#fafaf8;--fg:#1d1d1b;--mut:#6b6b66;--kort:#fff;--kant:#e4e4df}}
@media (prefers-color-scheme:dark){{:root{{--bg:#1b1b1a;--fg:#ecece8;--mut:#a3a39d;--kort:#252524;--kant:#3a3a38}}}}
body{{background:var(--bg);color:var(--fg);font:15px/1.45 -apple-system,system-ui,sans-serif;margin:0;padding:24px 16px}}
h1{{font-size:22px;margin:0 0 6px}} p{{color:var(--mut);max-width:70ch}}
.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-top:18px}}
figure{{margin:0;background:var(--kort);border:1px solid var(--kant);border-radius:10px;overflow:hidden}}
img{{width:100%;display:block}} figcaption{{padding:10px 12px;font-size:13px}}
.l span{{display:inline-block;width:14px;height:10px;border:3px solid;margin:0 4px 0 12px;vertical-align:middle}}
</style><h1>Högkort som missas — {a.namn}</h1>
<p>MES-246, tröskel {a.troskel}, NMS {NMS_IOU}. Varje ruta är ett unikt kortläge i en hög (utom graveyard) som inte fick en egen låda.
Orsak: {', '.join(f'{o}: {n}' for o, n in sorted(rader.items(), key=lambda x: -x[1]))}.</p>
<p class=l><span style="border-color:#f00"></span>kortet som missas (synliga delen)<span style="border-color:#fc0"></span>grannar i samma hög
<span style="border-color:#0cf"></span>detektorns lådor<span style="border-color:#f0f"></span>rätt låda som NMS tog bort</p>
<div class=g>{rutor}</div></html>"""
    with open(os.path.join(a.ut, f'hogfel-{a.namn}.html'), 'w', encoding='utf-8') as fh:
        fh.write(html)
    print('sparat', os.path.join(a.ut, f'hogfel-{a.namn}.html'))


if __name__ == '__main__':
    main()

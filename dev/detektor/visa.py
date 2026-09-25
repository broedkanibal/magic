#!/usr/bin/env python3
"""Ritar facit och en modells detektioner på ett fall, för ögat.

Kör:  python dev/detektor/visa.py --fil resultat/owlv2.json --fall 06 --troskel 0.2 [--fraga alla] [--ut bild.png] [--storlek]

Grönt = facit (synlig låda), gult streckat = dolda kort, blått = övriga
(tokens, library). Rött = detektion med poäng; röd tjock = matchad,
orange = kluster/dubblett, magenta = falsk."""
import argparse, json, os, sys
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from facit import las_fall
from matt import bedom, filtrera

p = argparse.ArgumentParser()
p.add_argument('--fil', required=True); p.add_argument('--fall', required=True)
p.add_argument('--troskel', type=float, required=True); p.add_argument('--fraga', default='alla')
p.add_argument('--ut', default=''); p.add_argument('--storlek', action='store_true')
a = p.parse_args()

f = las_fall(a.fall)
res = json.load(open(a.fil))
b = res['bilder'][f['bild']]
sam = 'MobileSAM' in res['modell']
dets = filtrera(b['det'], a.fraga, a.troskel, f, a.storlek, sam)
r = bedom(f, dets)
im = Image.open(f['bild']).convert('RGB'); W, H = im.size
d = ImageDraw.Draw(im)
for k in f['kort']:
    l = k['synlig_lada']
    d.rectangle([l[0] * W, l[1] * H, l[2] * W, l[3] * H], outline=(255, 230, 0) if k['dold'] else (0, 220, 0), width=3)
for o in f['ovriga']:
    l = o['hel_lada']; d.rectangle([l[0] * W, l[1] * H, l[2] * W, l[3] * H], outline=(80, 120, 255), width=3)
farg = {'matchad': (255, 0, 0), 'dubblett': (255, 140, 0), 'kluster': (255, 140, 0), 'falsk': (255, 0, 255), 'ovrig': (80, 120, 255), 'dold': (255, 230, 0)}
for dd in r['detdom']:
    l = dd['lada']; d.rectangle([l[0] * W, l[1] * H, l[2] * W, l[3] * H], outline=farg[dd['dom']], width=5 if dd['dom'] == 'matchad' else 3)
    d.text((l[0] * W + 4, l[1] * H + 4), f"{dd['dom']} {dd['poang']}", fill=farg[dd['dom']])
ut = a.ut or f"/tmp/visa-{a.fall}.png"
im.save(ut)
print(ut, {k: v for k, v in r.items() if isinstance(v, int)})

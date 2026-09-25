#!/usr/bin/env python3
"""Dagens detektor under samma mått: spåren i dev/golden/senaste.json
(x y w h per spår, i andelar av bilden) bedöms med matt.bedom, så att
tabellen för de färdiga modellerna går att läsa mot samma tal.

Golden själv räknar "hittade" som antal spår och "plats" med IoU >= 0,3;
här är kravet IoU >= 0,5 som för modellerna. Skriver
resultat/dagens.json i samma form som kor.py, så att rapport.py kan läsa
den som en modell bland de andra."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from facit import ROT, alla_fall, FALLEN
from matt import bedom

HAR = os.path.dirname(os.path.abspath(__file__))
senaste = json.load(open(os.path.join(ROT, 'dev', 'golden', 'senaste.json')))
per_id = {v['id']: v for v in (senaste if isinstance(senaste, list) else senaste.values())}

ut = {'modell': 'dagens detektor', 'variant': 'senaste.json (afa24cb), lokal+ocr+modell, aw 360',
      'licens': 'egen kod', 'fragor': ['-'], 'bilder': {}}
for f in alla_fall():
    g = per_id[f['id']]
    dets = [[s['x'], s['y'], s['x'] + s['w'], s['y'] + s['h'], 1.0, '-'] for s in g.get('spar', []) if s.get('x') is not None]
    ut['bilder'][f['bild']] = {'id': f['id'], 'W': f['W'], 'H': f['H'], 'ms': g.get('ms'), 'det': dets,
                               'golden': {'hittade': g['hittade'], 'falska': g['falska'], 'traffar': len(g.get('traffar', [])), 'kort': g['kort']}}
    r = bedom(f, dets)
    print(f"{f['id'][:40]:40} golden hittade {g['hittade']:2}/{g['kort']:2} falska {g['falska']}  |  samma mått: eget {r['eget']:2} sammanslaget {r['sammanslaget']} missat {r['missat']:2} falska {r['falsk']} kluster {r['kluster']}  hög {r['hog_eget']}/{r['hog_kort']} hela {r['hogar_hela']}/{r['hogar']}")
os.makedirs(os.path.join(HAR, 'resultat'), exist_ok=True)
json.dump(ut, open(os.path.join(HAR, 'resultat', 'dagens.json'), 'w'), indent=1)

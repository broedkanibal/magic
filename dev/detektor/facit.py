"""Facit för nollprovet (MES-288 steg 0): golden-fallen med ritade hörn
(MES-286) och högbänkens 68 fall (grenen mes-250-hoglasning).

Allt i andelar av bilden (0–1), som facit. Lådor är [x0, y0, x1, y1].

Ett golden-fall ger:
  kort    lekens kort: namn, synlig_lada (lådan runt den synliga delen —
          det facit kallar x y w h), hel_lada (hela kortets fyra hörn),
          horn, synlig, hog, dold
  ovriga  tokens, library och annat ur rita.ovriga: räknas aldrig som
          falska, aldrig som kort
Högbänkens fall ger bilden, lådan appen skar och hur många kort som
väntas i den (vantat.n)."""
import json, os
import numpy as np
from PIL import Image, ImageDraw

ROT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FALL_MAPP = os.path.join(ROT, 'dev', 'golden', 'fall')
FALLEN = ['03', '04', '05', '06', '13', '14', '15']
TROSKELFALL = '03'   # tröskeln väljs här, de sex andra redovisas orört

def fall_id(prefix):
    for d in sorted(os.listdir(FALL_MAPP)):
        if d.startswith(prefix): return d
    raise KeyError(prefix)

def lada_ur_horn(horn):
    xs = [p[0] for p in horn]; ys = [p[1] for p in horn]
    return [min(xs), min(ys), max(xs), max(ys)]

def las_fall(prefix):
    fid = fall_id(prefix)
    f = json.load(open(os.path.join(FALL_MAPP, fid, 'facit.json')))
    bild = os.path.join(FALL_MAPP, fid, 'bild.jpg')
    W, H = Image.open(bild).size
    kort = []
    for k in f['kort']:
        kort.append({
            'namn': k['namn'], 'id': k['id'],
            'synlig_lada': [k['x'], k['y'], k['x'] + k['w'], k['y'] + k['h']],
            'hel_lada': lada_ur_horn(k['horn']),
            'horn': k['horn'], 'synlig': k.get('synlig', 1), 'hog': k.get('hog'),
            'dold': bool(k.get('dold')), 'tappad': bool(k.get('tappad')),
        })
    ovriga = [{'namn': o['namn'], 'horn': o['horn'], 'hel_lada': lada_ur_horn(o['horn'])} for o in f.get('rita', {}).get('ovriga', []) if o.get('horn')]
    return {'id': fid, 'kort_id': prefix, 'bild': bild, 'W': W, 'H': H, 'kort': kort, 'ovriga': ovriga, 'original': original_for(f)}

def original_for(f):
    """Originalfotot i högre upplösning, om det finns i dev/material."""
    r = f.get('rita', {})
    b = r.get('bild', '')
    if 'dev/material/foton' in b and os.path.exists(os.path.join(ROT, b)):
        return os.path.join(ROT, b)
    if b.endswith('.mov') and r.get('t') is not None:
        # rutan Jesper ritade på ligger i dev/material/rita/<mapp>/<t>.jpg
        kand = os.path.join(ROT, 'dev', 'material', 'rita', 'mes-246', f"{r['t']:.2f}.jpg")
        if os.path.exists(kand): return kand
    return None

def kortyta(fall):
    """Mask (H×W, bool) över allt som är kort eller övrigt föremål i facit:
    hela kortens polygoner. Används för att döma falska detektioner."""
    W, H = fall['W'], fall['H']
    im = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(im)
    for k in fall['kort'] + fall['ovriga']:
        d.polygon([(p[0] * W, p[1] * H) for p in k['horn']], fill=255)
    return np.array(im) > 0

def alla_fall():
    return [las_fall(p) for p in FALLEN]

# ── högbänken ────────────────────────────────────────────────────────────
HOGBANK_FACIT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hogbank-facit.json')

def las_hogbank():
    """68 fall: bild, låda, typ (hog/par/ensam/hand), väntat antal kort."""
    f = json.load(open(HOGBANK_FACIT))
    ut = []
    for x in f['fall']:
        if x.get('av'): continue
        k = f['kallor'][x['kalla']]
        if k.get('bild'):
            bild = os.path.join(ROT, k['bild'])
        else:
            bild = os.path.join(ROT, 'dev', 'material', 'hogbank', f"{x['kalla']}-{str(x['s']).replace('.', '_')}.jpg")
        if not os.path.exists(bild): continue
        l = x['lada']
        v = x.get('vantat') or {}
        ut.append({'id': x['id'], 'typ': x.get('typ', 'annat'), 'bild': bild,
                   'lada': [l['x'], l['y'], l['x'] + l['w'], l['y'] + l['h']],
                   'n': v.get('n'), 'nullOk': bool(x.get('nullOk'))})
    return ut

def bilder_att_kora():
    """Alla bilder en modell ska se: de sju golden-fallen och högbänkens
    bilder (samma fil räknas en gång). Nyckel = sökväg."""
    b = {}
    for f in alla_fall(): b[f['bild']] = f['id']
    for h in las_hogbank(): b.setdefault(h['bild'], os.path.basename(os.path.dirname(h['bild'])) if 'fall' in h['bild'] else os.path.basename(h['bild']))
    return b

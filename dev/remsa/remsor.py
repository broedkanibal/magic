#!/usr/bin/env python3
"""MES-328: var de riktiga remsorna med känt namn finns — bara PROV-material (dev/detektor/delning.py).

Tre källor, alla med kortens fyra hörn ritade av Jesper (MES-286) så att remsan kan skäras ut
exakt där namnraden sitter, också när kortet ligger i vinkel eller i en hög:

  golden   de åtta golden-fallen med hörn (03–06, 13–16): bild.jpg (1080 px bred), och originalfotot
           där det finns (14–16: 5712 px; 13: 4K-rutan ur MES-246)
  mes246   MES-246:s 66 ritade lägen, rutor i 4K (3840 × 2160) ur dev/material/rita/mes-246/
  riktiga  dev/embed/riktiga/: 61 beskärningar som appen själv skar ur golden 01–12, med facit

Vilka kort som räknas följer remsprov.py (facit_remsor): minst halva namnraden synlig, inte library,
token eller baksida, inte under det översta i graveyard, inte under en hand. Namnet måste finnas i
dev/golden/lek.txt — annars kan ingen av metoderna svara rätt, och provet mäter leken.

Upplösningar (res): 'orig' = bilden som den är; '960' och '1920' = hela bilden nerskalad till den
bredden först (appens analysbild är 960 px bred, kamerans ström 1080p eller 4K).
"""
import json, os, sys
import cv2

HAR = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(os.path.dirname(HAR))
DET = os.path.join(ROT, 'dev', 'detektor')
sys.path.insert(0, DET)
sys.path.insert(0, os.path.join(DET, 'tran'))
sys.path.insert(0, HAR)
from facit import FALL_MAPP, FALLEN, fall_id, original_for  # noqa: E402
from remsprov import facit_remsor  # noqa: E402
from prov246 import LAGEN, RUTOR  # noqa: E402
from delning import klassa  # noqa: E402
from lib import skala_bild, las_lek  # noqa: E402

RIKTIGA = os.path.join(ROT, 'dev', 'embed', 'riktiga')
_LEK = None


def lek():
    global _LEK
    if _LEK is None:
        _LEK = set(las_lek())
    return _LEK


def krav_prov(sokvag):
    """Spärren åt andra hållet: provet får bara mäta på prov-material (aldrig något som tränats på)."""
    dl = klassa(sokvag)[0]
    if dl != 'prov':
        raise SystemExit(f'{sokvag} är {dl}, inte prov — remsproven mäter bara på prov-material')
    return sokvag


def _kort(k, b, W, H, extra):
    horn_px = [[x * W, y * H] for x, y in k['horn']]
    d = {'facit': k['namn'], 'horn_px': horn_px, 'lada': b, 'hog': bool(k.get('hog')), 'tappad': bool(k.get('tappad')),
         'zon': k.get('zon'), 'namnrad': k.get('namnrad', 1), 'synlig': k.get('synlig', 1), 'kort_id': k.get('id')}
    d.update(extra)
    return d


def golden():
    """[{id, kalla:'golden', bilder:{res: sökväg}, kort:[…]}]; hörnen i andelar gäller alla upplösningar."""
    ut = []
    for prefix in FALLEN:
        fid = fall_id(prefix)
        f = json.load(open(os.path.join(FALL_MAPP, fid, 'facit.json'), encoding='utf-8'))
        if not (f.get('kort') and all(k.get('horn') for k in f['kort'])):
            continue
        bild = krav_prov(os.path.join(FALL_MAPP, fid, 'bild.jpg'))
        orig = original_for(f)
        kravda, _ = facit_remsor(f['kort'], 1.0, 1.0)
        kort = [_kort(k, b, 1.0, 1.0, {'fall': prefix}) for b, k in kravda if k['namn'] in lek()]
        ut.append({'id': fid, 'kalla': 'golden', 'bild': bild, 'orig': krav_prov(orig) if orig else None, 'kort': kort})
    return ut


def mes246():
    """[{id: t, kalla:'mes246', bild: 4K-rutan, kort:[…]}] för de klara lägena med krävda remsor."""
    ut = []
    lagen = json.load(open(LAGEN, encoding='utf-8'))['lagen']
    for l in lagen:
        if not l.get('klar'):
            continue
        bild = os.path.join(RUTOR, f"{l['t']:.2f}.jpg")
        if not os.path.exists(bild):
            continue
        kravda, _ = facit_remsor(l['kort'], 1.0, 1.0, hander=l.get('hander'))
        kort = [_kort(k, b, 1.0, 1.0, {'t': l['t']}) for b, k in kravda if k['namn'] in lek()]
        if kort:
            ut.append({'id': f"{l['t']:.2f}", 'kalla': 'mes246', 'bild': krav_prov(bild), 'orig': None, 'kort': kort})
    return ut


def riktiga():
    """Appens egna beskärningar med facit (manifest.json): fil, namn, skymd, helbild."""
    man = json.load(open(os.path.join(RIKTIGA, 'manifest.json'), encoding='utf-8'))
    return [dict(p, bild=os.path.join(RIKTIGA, p['fil'])) for p in man if p['namn'] in lek()]


def las(bild, res):
    """Bilden i vald upplösning: (img BGR, skala mot källan)."""
    img = cv2.imread(bild)
    if img is None:
        raise SystemExit(f'kan inte läsa {bild}')
    if res == 'orig':
        return img, 1.0
    return skala_bild(img, int(res))


def horn_i_px(kort, W, H):
    return [[x * W, y * H] for x, y in kort['horn_px']]


def lage_nyckel(kort):
    """Samma kort på samma plats i flera rutor räknas som ETT kortläge (som remsprov.py)."""
    return (kort['kort_id'], tuple(round(v * 50) for v in kort['lada']))


if __name__ == '__main__':
    g = golden(); m = mes246(); r = riktiga()
    print(f'golden: {len(g)} fall, {sum(len(x["kort"]) for x in g)} remsor; original finns för {sum(1 for x in g if x["orig"])} fall')
    for x in g:
        print(f"  {x['id']}: {len(x['kort'])} remsor, högkort {sum(k['hog'] for k in x['kort'])}, orig {os.path.relpath(x['orig'], ROT) if x['orig'] else '-'}")
    n = sum(len(x['kort']) for x in m)
    un = {lage_nyckel(k) for x in m for k in x['kort']}
    print(f'mes246: {len(m)} lägen, {n} remsor, {len(un)} unika kortlägen, högkort {sum(k["hog"] for x in m for k in x["kort"])}')
    print(f'riktiga: {len(r)} beskärningar ({sum(1 for p in r if not p["skymd"] and not p["helbild"])} vanliga)')

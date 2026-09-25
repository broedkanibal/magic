"""Måttet i nollprovet (MES-288 steg 0). Skrivet ner här så att det går att
läsa vad siffrorna betyder.

Indata: ett golden-fall (facit.py) och en lista detektioner, var och en
[x0, y0, x1, y1, poäng] i andelar av bilden. Detektionerna har redan gått
igenom tröskel och NMS (samma_kort, IoU 0,6, klassoberoende).

Per synligt kort i facit (kort med dold: true räknas för sig):
  eget          en detektion matchar just det kortet: IoU >= 0,5 mot lådan
                runt kortets synliga del (facits x y w h). Matchningen är
                girig efter fallande IoU och en-till-en, så en detektion
                kan bara ge ett kort.
  sammanslaget  ingen egen detektion, men minst 70 % av kortets synliga låda
                ligger inne i EN detektion — en detektion över två eller
                fler kort (typiskt en hög).
  missat        ingetdera.
eget + sammanslaget + missat = antalet synliga kort.

Per detektion:
  matchad       gav ett eget kort
  dubblett      IoU >= 0,5 mot ett kort som redan har en egen detektion
  dold          täcker >= 70 % av ett dolt korts synliga låda (räknas inte
                som kort, inte som falsk — som golden gör)
  ovrig         ligger till >= 50 % på tokens, library eller annat i
                rita.ovriga: räknas inte
  kluster       ligger till >= 50 % på kort men matchar inget: lådan över
                en hög, eller en del av ett kort
  falsk         ligger till mindre än 50 % på något kort eller föremål.
                Det är det som blir ett falskt spår.

Högar: samma kategorier för korten som har hog i facit, och "hög hel" när
alla högens synliga kort är egna.

IoU räknas på andelar, vilket för axelparallella lådor är exakt samma som
i pixlar. Täckning mot kortytan räknas på en rastrerad mask i bildens
pixlar (facit.kortyta)."""
import numpy as np
from facit import kortyta

IOU_MIN = 0.5
TACK_MIN = 0.7
NMS_IOU = 0.6

def iou(a, b):
    ix0, iy0 = max(a[0], b[0]), max(a[1], b[1])
    ix1, iy1 = min(a[2], b[2]), min(a[3], b[3])
    iw, ih = max(0.0, ix1 - ix0), max(0.0, iy1 - iy0)
    inter = iw * ih
    ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / ua if ua > 0 else 0.0

def andel_inne(kort_lada, det):
    """Hur stor del av kortlådan som ligger inne i detektionen."""
    ix0, iy0 = max(kort_lada[0], det[0]), max(kort_lada[1], det[1])
    ix1, iy1 = min(kort_lada[2], det[2]), min(kort_lada[3], det[3])
    inter = max(0.0, ix1 - ix0) * max(0.0, iy1 - iy0)
    a = (kort_lada[2] - kort_lada[0]) * (kort_lada[3] - kort_lada[1])
    return inter / a if a > 0 else 0.0

def nms(dets, tak=NMS_IOU):
    """Klassoberoende NMS: högsta poäng först, släng allt som överlappar
    mer än tak. dets: [x0,y0,x1,y1,poäng,...]."""
    dets = sorted(dets, key=lambda d: -d[4])
    kvar = []
    for d in dets:
        if all(iou(d, k) <= tak for k in kvar): kvar.append(d)
    return kvar

def tack_i_mask(mask, det):
    """Andel av detektionens yta som ligger på kort/föremål (rastrerat)."""
    H, W = mask.shape
    x0, y0 = int(max(0, det[0] * W)), int(max(0, det[1] * H))
    x1, y1 = int(min(W, det[2] * W)), int(min(H, det[3] * H))
    if x1 <= x0 or y1 <= y0: return 0.0
    return float(mask[y0:y1, x0:x1].mean())

def bedom(fall, dets, iou_min=IOU_MIN, tack_min=TACK_MIN, mask=None):
    synliga = [k for k in fall['kort'] if not k['dold']]
    dolda = [k for k in fall['kort'] if k['dold']]
    if mask is None: mask = kortyta(fall)
    # 1. girig en-till-en-matchning
    par = []
    for ki, k in enumerate(synliga):
        for di, d in enumerate(dets):
            v = iou(k['synlig_lada'], d)
            if v >= iou_min: par.append((v, ki, di))
    par.sort(reverse=True)
    kort_det = {}; det_kort = {}
    for v, ki, di in par:
        if ki in kort_det or di in det_kort: continue
        kort_det[ki] = (di, v); det_kort[di] = ki
    # 2. korten
    kortdom = []
    for ki, k in enumerate(synliga):
        if ki in kort_det: dom = 'eget'
        elif any(andel_inne(k['synlig_lada'], d) >= tack_min for d in dets): dom = 'sammanslaget'
        else: dom = 'missat'
        kortdom.append({'namn': k['namn'], 'hog': k['hog'], 'dom': dom, 'iou': round(kort_det[ki][1], 2) if ki in kort_det else None})
    # 3. detektionerna
    detdom = []
    for di, d in enumerate(dets):
        if di in det_kort: dom = 'matchad'
        elif any(iou(synliga[ki]['synlig_lada'], d) >= iou_min for ki in kort_det): dom = 'dubblett'
        elif any(andel_inne(k['synlig_lada'], d) >= tack_min for k in dolda): dom = 'dold'
        else:
            t = tack_i_mask(mask, d)
            if t < 0.5: dom = 'falsk'
            else:
                pa_ovrig = any(andel_inne(o['hel_lada'], d) >= 0.5 or iou(o['hel_lada'], d) >= 0.3 for o in fall['ovriga'])
                dom = 'ovrig' if pa_ovrig else 'kluster'
        detdom.append({'lada': [round(x, 4) for x in d[:4]], 'poang': round(d[4], 3), 'dom': dom})
    # 4. räkna
    r = {'kort': len(synliga), 'dolda': len(dolda)}
    for dom in ('eget', 'sammanslaget', 'missat'): r[dom] = sum(1 for k in kortdom if k['dom'] == dom)
    for dom in ('matchad', 'dubblett', 'dold', 'ovrig', 'kluster', 'falsk'): r[dom] = sum(1 for d in detdom if d['dom'] == dom)
    hogkort = [k for k in kortdom if k['hog']]
    r['hog_kort'] = len(hogkort)
    r['hog_eget'] = sum(1 for k in hogkort if k['dom'] == 'eget')
    r['hog_sammanslaget'] = sum(1 for k in hogkort if k['dom'] == 'sammanslaget')
    r['hog_missat'] = sum(1 for k in hogkort if k['dom'] == 'missat')
    hogar = sorted(set(k['hog'] for k in hogkort))
    r['hogar'] = len(hogar)
    r['hogar_hela'] = sum(1 for h in hogar if all(k['dom'] == 'eget' for k in hogkort if k['hog'] == h))
    r['kortdom'] = kortdom; r['detdom'] = detdom
    return r

def hogbank_bedom(hb, dets):
    """Högbänkens fall: hur många detektioner ligger i lådan appen skar?
    En detektion räknas när dess mittpunkt ligger i lådan och minst
    hälften av dess yta gör det. Rätt = lika många som facit väntar."""
    l = hb['lada']; n = 0
    for d in dets:
        cx, cy = (d[0] + d[2]) / 2, (d[1] + d[3]) / 2
        if l[0] <= cx <= l[2] and l[1] <= cy <= l[3] and andel_inne(d, l) >= 0.5: n += 1
    return n

def medelkort_yta(f):
    """Medianen av kortens hela yta i fallet (andelar) — kortstorleken appen
    känner från uppstarten."""
    ytor = sorted((k['hel_lada'][2] - k['hel_lada'][0]) * (k['hel_lada'][3] - k['hel_lada'][1]) for k in f['kort'])
    return ytor[len(ytor) // 2]

def inneslutning(dets, andel=0.8):
    """Släng en låda som till >= 80 % ligger inuti en starkare låda — delar
    av kort (konstverket, textrutan) som modellen också ritar. Standardregel,
    inte inställd på fallen. dets är redan sorterade efter poäng av nms."""
    kvar = []
    for d in dets:
        if any(andel_inne(d, k) >= andel for k in kvar): continue
        kvar.append(d)
    return kvar

def filtrera(dets, fraga, troskel, f=None, storlek=False, sam=False, inneslut=False):
    """Från råa detektioner till de som bedöms: poänggräns, ev. en enda
    textfråga, för SAM kortlikheten (fyll >= 0,85, sidförhållande 0,55–0,9),
    ev. storleksfiltret (0,4–1,6 × fallets medelkort), sedan NMS och ev.
    inneslutningsregeln."""
    import re
    ut = []
    for d in dets:
        if d[4] < troskel: continue
        if fraga != 'alla' and d[5] != fraga: continue
        if sam:
            m = re.search(r'fyll=([\d.]+) kvot=([\d.]+)', d[5])
            fyll, kvot = float(m.group(1)), float(m.group(2))
            if fyll < 0.85 or not (0.55 <= kvot <= 0.9): continue
        if (storlek or sam) and f is not None:
            yta = (d[2] - d[0]) * (d[3] - d[1])
            if not (0.4 * medelkort_yta(f) <= yta <= 1.6 * medelkort_yta(f)): continue
        ut.append(d)
    ut = nms(ut, NMS_IOU)
    return inneslutning(ut) if inneslut else ut

def summera(rader):
    """Summerar bedom-resultat över fall (bara talen)."""
    s = {}
    for r in rader:
        for k, v in r.items():
            if isinstance(v, (int, float)) and not isinstance(v, bool): s[k] = s.get(k, 0) + v
    return s

#!/usr/bin/env python3
"""Grind 1b (MES-288): syntetiska bord med exakt facit, för att lära detektorn högarna.

Datorn lägger själv ut korten, så facit är exakt: varje korts fyra hörn,
ordningen (z), hur stor del som syns, lådan runt den synliga delen och vilka
kort som ligger i samma hög. Detektorn ska lära sig se och räkna varje
synlig del av varje kort, också när bara namnraden eller en kant sticker fram.

Kedjan per bild (960 × 544, 16:9, ritad i 2× och nerskalad):
  1. Kamera: telefon på stativ ovanför bordet, lutad 0–28° mot bordet,
     vriden ±5°, 55–68° synfält, 38–90 cm bord i bildens bredd (var femte bild 90–140 cm).
  2. Bakgrund: ett tomt bord ur träningsmaterial (bakgrund.py) eller en ritad
     yta (texturer.py).
  3. Layout i bordets plan, i mm: landkolumner, trappor, två kort omlott,
     equipment under/bredvid en varelse, tappade kort, enstaka kort, rader av
     varelser, graveyard-hög, leken med baksidan upp, tomma ytor.
  4. Varje kort: Scryfall-bild, rundade hörn, ofta i plastficka (kanten i
     fickans färg eller klar, blänk, dis, lätt oskärpa), skugga, perspektiv
     genom kamerans homografi, ibland rörelseoskärpa.
  5. Hela bilden: lampans ljuskägla, vinjett, varmt/kallt/mörkt ljus,
     oskärpa, lägre upplösning, brus, skärpning, JPEG.
  6. Facit: <namn>.json (allt), <namn>.txt (YOLO), och coco.json + facit.js
     för hela körningen.

    python dev/detektor/synt/generera.py                    # 20 bilder → bilder/, fro 1
    python dev/detektor/synt/generera.py --n 200 --ut tid --fro 1000   # mäter tiden

Utdata (gitignorerat): dev/material/arbete/2026-09-29-mes-288-synt/<ut>/
Samma --fro ger samma bilder.
"""
import json, math, os, sys, time
import cv2
import numpy as np

if os.environ.get('SYNT_TRADAR'):   # fyra processer samtidigt: en tråd var, annars trängs OpenCV:s trådar (last 37 på fyra kärnor)
    cv2.setNumThreads(int(os.environ['SYNT_TRADAR']))

HAR = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(os.path.dirname(os.path.dirname(HAR)))
sys.path.insert(0, HAR)
sys.path.insert(0, os.path.dirname(HAR))
import texturer  # noqa: E402
from bakgrund import prova_kalla  # noqa: E402
from delning import ProvLacka  # noqa: E402

ARB = os.path.join(ROT, 'dev', 'material', 'arbete', '2026-09-29-mes-288-synt')
SCRY = os.path.join(ARB, 'scryfall')
BAKG = os.path.join(ARB, 'bakgrund')

W, H = 960, 544
HANDER = '--utan-hander' not in sys.argv   # grind 2: händer över bordet (se rita_hand)
SS = 2                          # ritas i 2× och skalas ner (mjuka kanter)
WS, HS = W * SS, H * SS
KORT_B, KORT_H = 63.0, 88.0
FICKA_B, FICKA_H = 66.0, 91.0   # en vanlig standardficka
NAMNRAD = (4.0, 3.5, 59.0, 9.5)  # x0 y0 x1 y1 i mm i kortet (samma som rita-geometri.cjs)
TAPP_GRANS = 45.0
OVERLAPP_MIN = 0.03
AVSKUREN_OVER = 0.02
# Regeln för när ett delvis dolt kort får en låda (se SYNT.md):
LADA_NAMNRAD = 0.5              # minst halva namnraden syns — då får kortet alltid en låda
LADA_SYNLIG = 0.05              # annars: minst 5 % av kortet syns …
LADA_TJOCK_PX = 6.0             # … och den synliga delen är minst 6 px tjock i 960×544-bilden
LADA_REMSA_PX = 3                # delar av det synliga som är tunnare än så räknas inte in i lådan
OPPNA = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (LADA_REMSA_PX * SS, LADA_REMSA_PX * SS))
KLASSER = ['kort', 'baksida']   # baksida = leken eller ett ensamt kort med baksidan upp (appen avgör vilket ur platsen)

FICKFARGER = {  # BGR, fickans baksida (syns som kant runt kortet genom den klara framsidan)
    'mörkgrön glitter': (45, 75, 30), 'svart': (28, 26, 26), 'blå': (120, 60, 25), 'röd': (35, 30, 140),
    'lila': (110, 40, 80), 'vit': (225, 225, 220), 'grå': (110, 110, 110), 'guld': (60, 140, 175),
}


# ── kamera ─────────────────────────────────────────────────────────────────
def kamera(rng):
    fov = math.radians(rng.uniform(55, 68))
    bredd_mm = rng.uniform(380, 900) if rng.random() < 0.8 else rng.uniform(900, 1400)
    lut = math.radians(rng.uniform(0, 28) if rng.random() < 0.85 else rng.uniform(0, 6))
    rull = math.radians(rng.uniform(-5, 5))
    f = (WS / 2) / math.tan(fov / 2)
    d = (bredd_mm / 2) / math.tan(fov / 2)
    C = np.array([0, -d * math.sin(lut), d * math.cos(lut)])
    z = -C / np.linalg.norm(C)
    x = np.array([1.0, 0, 0])
    y = np.cross(z, x)
    cr, sr = math.cos(rull), math.sin(rull)
    x, y = cr * x + sr * y, -sr * x + cr * y
    R = np.stack([x, y, z])
    K = np.array([[f, 0, WS / 2], [0, f, HS / 2], [0, 0, 1]])
    P = K @ np.hstack([R, (-R @ C)[:, None]])
    return {'P': P, 'fov': math.degrees(fov), 'bredd_mm': bredd_mm, 'lutning': math.degrees(lut), 'rullning': math.degrees(rull)}


def hom_hojd(kam, t=0.0):
    """Bordets plan (u, v) i mm på höjden t → bildpunkter i 2×. v växer mot spelaren (nedåt i bilden)."""
    return kam['P'] @ np.array([[1, 0, 0], [0, -1, 0], [0, 0, t], [0, 0, 1]], float)


def proj(Hm, pts):
    p = np.hstack([np.asarray(pts, float), np.ones((len(pts), 1))]) @ Hm.T
    return p[:, :2] / p[:, 2:3]


# ── kortens geometri ───────────────────────────────────────────────────────
def lokal_till_bord(k):
    """3×3: kortets egna mm (0,0 = konturens övre vänstra hörn i läsriktningen) → bordets mm."""
    a = math.radians(k['rot'])
    c, s = math.cos(a), math.sin(a)
    bw, bh = k['kontur']
    T1 = np.array([[1, 0, -bw / 2], [0, 1, -bh / 2], [0, 0, 1]])
    Rm = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
    T2 = np.array([[1, 0, k['u']], [0, 1, k['v']], [0, 0, 1]])
    return T2 @ Rm @ T1


def horn_lokal(k):
    bw, bh = k['kontur']
    return np.array([[0, 0], [bw, 0], [bw, bh], [0, bh]], float)


def namnrad_lokal(k):
    i = k['inset']
    x0, y0, x1, y1 = NAMNRAD
    return np.array([[x0 + i, y0 + i], [x1 + i, y0 + i], [x1 + i, y1 + i], [x0 + i, y1 + i]], float)


def yta(p):
    x, y = p[:, 0], p[:, 1]
    return 0.5 * abs(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))


def snitt(a, b):
    area, _ = cv2.intersectConvexConvex(a.astype(np.float32), b.astype(np.float32))
    return float(area)


def rastrerad_yta(poly):
    """Antalet bildpunkter polygonen täcker när den rastreras HELT (också utanför bilden) —
    samma rastrering som synligheten, så att andelen blir 1,0 för ett helt synligt kort."""
    o = np.floor(poly.min(0)) - 2
    w, h = (np.ceil(poly.max(0)) - o + 3).astype(int)
    m = np.zeros((h, w), np.uint8)
    cv2.fillPoly(m, [((poly - o) * 16).astype(np.int32)], 1, lineType=cv2.LINE_8, shift=4)
    return max(1, int(m.sum()))


def rundad_mask(w, h, r):
    m = np.zeros((h, w), np.uint8)
    r = int(round(r))
    cv2.rectangle(m, (r, 0), (w - 1 - r, h - 1), 255, -1)
    cv2.rectangle(m, (0, r), (w - 1, h - 1 - r), 255, -1)
    for cx, cy in [(r, r), (w - 1 - r, r), (w - 1 - r, h - 1 - r), (r, h - 1 - r)]:
        cv2.circle(m, (cx, cy), r, 255, -1, lineType=cv2.LINE_AA)
    return m


# ── kortbilder ─────────────────────────────────────────────────────────────
class Bilder:
    def __init__(self):
        d = json.load(open(os.path.join(SCRY, 'kort.json'), encoding='utf-8'))
        self.alla = d['kort']
        self.cache = {}
        typ = lambda k, t: t in (k.get('typ') or '')
        lek = [k for k in self.alla if k['kalla'] == 'lek']
        ovr = [k for k in self.alla if k['kalla'] in ('slump', 'basland')]
        self.pool = {
            'lek': {'land': [k for k in lek if typ(k, 'Land')], 'varelse': [k for k in lek if typ(k, 'Creature')],
                    'utrustning': [k for k in lek if typ(k, 'Equipment') or typ(k, 'Aura')],
                    'ovrigt': [k for k in lek if not typ(k, 'Land')]},
            'andra': {'land': [k for k in ovr if typ(k, 'Basic Land')] + [k for k in ovr if typ(k, 'Land') and not typ(k, 'Basic')][:10],
                      'varelse': [k for k in ovr if typ(k, 'Creature')],
                      'utrustning': [k for k in ovr if typ(k, 'Equipment') or typ(k, 'Aura')],
                      'ovrigt': [k for k in ovr if not typ(k, 'Land')]},
        }
        self.tokens = [k for k in self.alla if k['kalla'] == 'token']
        self.baksida = cv2.imread(os.path.join(SCRY, 'baksida.jpg'))

    def las(self, post):
        if post['id'] not in self.cache:
            if len(self.cache) > 300:
                self.cache.clear()
            self.cache[post['id']] = cv2.imread(os.path.join(SCRY, post['fil']))
        return self.cache[post['id']]

    def valj(self, rng, lek, sort):
        p = self.pool['lek' if lek else 'andra'][sort] or self.pool['lek' if lek else 'andra']['ovrigt']
        return p[rng.integers(len(p))]


def glitter(rng, bgr, w, h):
    base = np.empty((h, w, 3), np.float32)
    base[:] = bgr
    g = texturer.brus(rng, w, h, max(w, h) * 0.8)
    base *= (0.85 + 0.3 * g)[..., None]
    n = int(w * h * 0.01)
    ys, xs = rng.integers(0, h, n), rng.integers(0, w, n)
    base[ys, xs] = np.minimum(255, base[ys, xs] * rng.uniform(1.5, 3.0, (n, 1)) + 40)
    return np.clip(base, 0, 255).astype(np.uint8)


def kort_textur(rng, bilder, k, px_mal):
    """RGBA-textur för ett kort (framsida eller baksida), i mm-skala. px_mal ≈ kortets bredd i 2×-bilden."""
    if k['baksida']:
        yta_bild = bilder.baksida
    else:
        yta_bild = bilder.las(k['post'])
    fh, fw = yta_bild.shape[:2]
    s = min(fw / KORT_B, max(3.0, 1.4 * px_mal / k['kontur'][0]))   # texturens px per mm
    kw, kh = int(round(KORT_B * s)), int(round(KORT_H * s))
    ansikte = cv2.resize(yta_bild, (kw, kh), interpolation=cv2.INTER_AREA)
    kmask = rundad_mask(kw, kh, 3.0 * s)
    ficka = k['ficka']
    if ficka['typ'] == 'ingen':
        rgba = np.dstack([ansikte, kmask])
        return rgba, s
    tw, th = int(round(FICKA_B * s)), int(round(FICKA_H * s))
    ins = int(round(k['inset'] * s))
    fmask = rundad_mask(tw, th, 2.6 * s)
    if ficka['typ'] == 'farg':
        if k['baksida']:
            # fickans baksida uppåt: ogenomskinlig färg, kortet syns inte
            rgb = glitter(rng, ficka['bgr'], tw, th)
            rgba = np.dstack([rgb, fmask])
        else:
            rgb = glitter(rng, np.array(ficka['bgr']) * 0.85 + 18, tw, th)
            alfa = fmask.copy()
            rgb[ins:ins + kh, ins:ins + kw][kmask > 0] = ansikte[kmask > 0]
            rgba = np.dstack([rgb, alfa])
    else:  # klar ficka: kanten är genomskinlig plast
        rgb = np.full((th, tw, 3), 225, np.uint8)
        alfa = (fmask.astype(np.float32) * ficka['kantalfa']).astype(np.uint8)
        sub = rgb[ins:ins + kh, ins:ins + kw]
        sub[kmask > 0] = ansikte[kmask > 0]
        a2 = alfa[ins:ins + kh, ins:ins + kw]
        a2[kmask > 0] = 255
        rgba = np.dstack([rgb, alfa])
    # fickans framsida: dis över allt, ljusare kant
    dis = ficka['dis']
    rgb = rgba[..., :3].astype(np.float32)
    rgb = rgb * (1 - dis) + 235 * dis
    kant = cv2.subtract(fmask, cv2.erode(fmask, np.ones((3, 3), np.uint8), iterations=max(1, int(0.5 * s))))
    kf = (kant.astype(np.float32) / 255)[..., None] * ficka['kantljus']
    rgb = rgb * (1 - kf) + 250 * kf
    a = rgba[..., 3].astype(np.float32)
    a = np.maximum(a, kant.astype(np.float32) * 0.8)
    return np.dstack([np.clip(rgb, 0, 255), a]).astype(np.uint8), s


# ── layouten ───────────────────────────────────────────────────────────────
def nytt_kort(post, du, dv, rot, **kw):
    d = {'post': post, 'du': du, 'dv': dv, 'rot': rot, 'klass': 'kort', 'baksida': False}
    d.update(kw)
    return d


def el_landkolumn(rng, bilder, lek):
    n = int(rng.integers(2, 7))
    tappad = rng.random() < 0.25
    post0 = bilder.valj(rng, lek, 'land')
    steg = rng.uniform(7, 16)
    rot0 = rng.normal(0, 2)
    ut = []
    for i in range(n):
        post = post0 if rng.random() < 0.8 else bilder.valj(rng, lek, 'land')
        ut.append(nytt_kort(post, rng.normal(0, 1.2), i * steg + rng.normal(0, 0.8), rot0 + (90 if tappad else 0) + rng.normal(0, 1.5)))
    return ut, 'landkolumn' + (' (tappad)' if tappad else '')


def el_trappa(rng, bilder, lek):
    n = int(rng.integers(3, 6))
    dx, dy = rng.uniform(8, 18) * rng.choice([-1, 1]), rng.uniform(8, 18)
    rot0 = rng.normal(0, 3)
    return [nytt_kort(bilder.valj(rng, lek, rng.choice(['land', 'ovrigt'])), i * dx, i * dy, rot0 + rng.normal(0, 2)) for i in range(n)], 'trappsteg'


def el_omlott(rng, bilder, lek):
    a = rng.uniform(0, 2 * math.pi)
    l = rng.uniform(18, 45)
    rot0 = rng.normal(0, 4)
    return [nytt_kort(bilder.valj(rng, lek, 'ovrigt'), 0, 0, rot0),
            nytt_kort(bilder.valj(rng, lek, 'ovrigt'), l * math.cos(a), l * math.sin(a), rot0 + rng.normal(0, 12))], 'två omlott'


def el_utrustning(rng, bilder, lek):
    rot0 = rng.normal(0, 3)
    if rng.random() < 0.6:
        du, dv, vad = rng.normal(0, 2), -rng.uniform(10, 22), 'equipment under varelsen'
    else:
        du, dv, vad = rng.choice([-1, 1]) * rng.uniform(16, 36), rng.normal(0, 6), 'equipment bredvid varelsen'
    utr = nytt_kort(bilder.valj(rng, lek, 'utrustning'), du, dv, rot0 + rng.normal(0, 4), fast_till=1)
    var = nytt_kort(bilder.valj(rng, lek, 'varelse'), 0, 0, rot0, var_id=1)
    if rng.random() < 0.25:   # attackerar: båda tappade
        utr['rot'] += 90
        var['rot'] += 90
        utr['du'], utr['dv'] = -utr['dv'], utr['du']
    return [utr, var], vad


def el_tappad(rng, bilder, lek):
    return [nytt_kort(bilder.valj(rng, lek, rng.choice(['varelse', 'land'])), 0, 0, 90 + rng.normal(0, 4))], 'tappat kort'


def el_enstaka(rng, bilder, lek):
    if rng.random() < 0.12 and bilder.tokens:
        return [nytt_kort(bilder.tokens[rng.integers(len(bilder.tokens))], 0, 0, rng.normal(0, 5), token=True)], 'token'
    return [nytt_kort(bilder.valj(rng, lek, 'ovrigt'), 0, 0, rng.normal(0, 5))], 'enstaka kort'


def el_rad(rng, bilder, lek):
    n = int(rng.integers(2, 5))
    gap = rng.uniform(4, 15)
    return [nytt_kort(bilder.valj(rng, lek, 'varelse'), i * (FICKA_B + gap) + rng.normal(0, 2), rng.normal(0, 3), rng.normal(0, 3)) for i in range(n)], 'rad av varelser'


def el_grav(rng, bilder, lek):
    n = int(rng.integers(3, 12))
    rot0 = rng.normal(0, 4)
    return [nytt_kort(bilder.valj(rng, lek, 'ovrigt'), rng.normal(0, 2.5), rng.normal(0, 2.5), rot0 + rng.normal(0, 5), grav=True) for i in range(n)], 'graveyard-hög'


def el_lek(rng, bilder, lek):
    return [nytt_kort(None, 0, 0, rng.normal(0, 4), klass='baksida', slag='lek', baksida=True, tjock=rng.uniform(10, 24))], 'leken'


def el_baksida(rng, bilder, lek):
    """Ett ensamt kort med baksidan upp utanför leken: en uppochnervänd token, ett kort som inte hör till leken.
    Oftast i samma ficka som resten av bordet, ibland utan ficka (Magic-baksidan) eller i klar ficka.
    Var tredje ligger omlott med ett annat kort (baksidan över eller under)."""
    rot0 = rng.normal(0, 6)
    egen = rng.random() < 0.3
    b = nytt_kort(None, 0, 0, rot0, klass='baksida', slag='ensam', baksida=True, tjock=rng.uniform(0.8, 2.0), egen_ficka=egen)
    if rng.random() < 0.35:
        a = rng.uniform(0, 2 * math.pi)
        l = rng.uniform(18, 45)
        annat = nytt_kort(bilder.valj(rng, lek, 'ovrigt'), l * math.cos(a), l * math.sin(a), rot0 + rng.normal(0, 12))
        return ([b, annat] if rng.random() < 0.5 else [annat, b]), 'baksida omlott'
    return [b], 'ensam baksida'


ELEMENT = {'landkolumn': el_landkolumn, 'trappa': el_trappa, 'omlott': el_omlott, 'utrustning': el_utrustning,
           'tappad': el_tappad, 'enstaka': el_enstaka, 'rad': el_rad, 'grav': el_grav, 'lek': el_lek, 'baksida': el_baksida}

SCENER = {
    'fullt bord': lambda r: ['lek', 'grav'] + ['landkolumn'] * int(r.integers(2, 4)) + ['rad', 'utrustning'] + ['tappad'] * int(r.integers(0, 3)) + ['enstaka'] * int(r.integers(0, 2)) + ['baksida'] * (int(r.integers(1, 3)) if r.random() < 0.5 else 0),
    'täta högar': lambda r: ['landkolumn'] * int(r.integers(3, 6)) + ['trappa'] + ['omlott'] * int(r.integers(1, 3)) + (['lek'] if r.random() < 0.6 else []) + (['baksida'] if r.random() < 0.4 else []),
    'glest': lambda r: ['enstaka'] * int(r.integers(1, 4)) + (['lek'] if r.random() < 0.7 else []) + (['tappad'] if r.random() < 0.4 else []) + ['baksida'] * (int(r.integers(1, 3)) if r.random() < 0.5 else 0),
    'omlott': lambda r: ['omlott'] * int(r.integers(2, 4)) + ['trappa', 'utrustning'] + (['utrustning'] if r.random() < 0.5 else []) + (['grav'] if r.random() < 0.5 else []) + (['baksida'] if r.random() < 0.4 else []),
    'motståndare': lambda r: ['lek', 'landkolumn', 'landkolumn', 'rad', 'omlott', 'tappad'] + ['landkolumn', 'rad', 'enstaka'] + (['baksida'] if r.random() < 0.4 else []),
    'tomt bord': lambda r: [],
    'bara leken': lambda r: ['lek'] + (['grav'] if r.random() < 0.5 else []) + (['baksida'] if r.random() < 0.4 else []),
}
SCENORDNING = ['fullt bord', 'täta högar', 'glest', 'omlott', 'fullt bord', 'tomt bord', 'täta högar', 'motståndare', 'fullt bord', 'glest',
               'omlott', 'täta högar', 'fullt bord', 'motståndare', 'bara leken', 'täta högar', 'fullt bord', 'omlott', 'glest', 'fullt bord']


def bord_fran_bild(kam, x, y):
    Hi = np.linalg.inv(hom_hojd(kam))
    return proj(Hi, [[x, y]])[0]


def lagg_ut(rng, bilder, kam, scen):
    """Grupper i bordets plan. Varje grupp placeras där den inte krockar med en annan (lådor i mm + 5 mm)."""
    element = SCENER[scen](rng)
    rng.shuffle(element)
    if 'lek' in element:   # leken först, så att den får plats
        element.remove('lek')
        element.insert(0, 'lek')
    lek_andel = 0.75 if scen != 'motståndare' else 0.5
    ficka_jag = valj_ficka(rng)
    ficka_mot = valj_ficka(rng)
    kort, grupper, upptaget = [], [], []
    nid = 1
    for el in element:
        for forsok in range(60):
            kant = rng.random() < 0.12      # ibland ut mot bildkanten (avskuret kort)
            m = 0.02 if kant else 0.1
            x, y = rng.uniform(m, 1 - m) * WS, rng.uniform(m, 1 - m) * HS
            if el == 'lek' and rng.random() < 0.7:   # leken ligger oftast nära en kant, som library-platsen
                x = rng.choice([rng.uniform(0.05, 0.2), rng.uniform(0.8, 0.95)]) * WS
                y = rng.uniform(0.55, 0.9) * HS
            motsida = scen == 'motståndare' and y < 0.45 * HS
            lek = (rng.random() < lek_andel) and not motsida
            delar, vad = ELEMENT[el](rng, bilder, lek)
            u0, v0 = bord_fran_bild(kam, x, y)
            grot = rng.normal(0, 4) + (180 if motsida else 0)
            c, s = math.cos(math.radians(grot)), math.sin(math.radians(grot))
            ficka = ficka_mot if motsida else ficka_jag
            prov = []
            for d in delar:
                k = dict(d)
                k['u'] = u0 + c * d['du'] - s * d['dv']
                k['v'] = v0 + s * d['du'] + c * d['dv']
                k['rot'] = d['rot'] + grot
                k['ficka'] = BAR_FICKA(rng) if d.get('egen_ficka') else ficka
                k['kontur'] = (KORT_B, KORT_H) if ficka['typ'] == 'ingen' else (FICKA_B, FICKA_H)
                k['inset'] = 0.0 if ficka['typ'] == 'ingen' else (FICKA_B - KORT_B) / 2
                prov.append(k)
            pts = np.vstack([proj(lokal_till_bord(k), horn_lokal(k)) for k in prov])
            lada = (pts[:, 0].min() - 5, pts[:, 1].min() - 5, pts[:, 0].max() + 5, pts[:, 1].max() + 5)
            if any(not (lada[2] < o[0] or lada[0] > o[2] or lada[3] < o[1] or lada[1] > o[3]) for o in upptaget):
                continue
            # hela gruppen får inte hamna utanför bilden
            ip = proj(hom_hojd(kam) @ np.eye(3), pts)
            inne = (ip[:, 0] > 0) & (ip[:, 0] < WS) & (ip[:, 1] > 0) & (ip[:, 1] < HS)
            if inne.mean() < 0.5:
                continue
            upptaget.append(lada)
            gid = len(grupper) + 1
            idmap = {}
            for k in prov:
                k['id'] = nid
                k['grupp'] = gid
                if 'var_id' in k:
                    idmap[k['var_id']] = nid
                nid += 1
            for k in prov:
                if 'fast_till' in k:
                    k['fast'] = idmap.get(k['fast_till'])
            grupper.append({'id': gid, 'element': vad, 'motsida': bool(motsida), 'lek': bool(lek)})
            kort.extend(prov)
            break
    # z: grupperna i slumpad ordning, inom gruppen i den ordning korten lades
    ordning = list(range(len(grupper)))
    rng.shuffle(ordning)
    z = 1
    for g in ordning:
        for k in kort:
            if k['grupp'] == grupper[g]['id']:
                k['z'] = z
                z += 1
    return kort, grupper


def BAR_FICKA(rng):
    """Ett ensamt kort med baksidan upp i en annan ficka än bordets: oftast ingen (Magic-baksidan), ibland klar."""
    if rng.random() < 0.7:
        return {'typ': 'ingen', 'farg': None, 'dis': 0.0, 'kantljus': 0.0, 'glans': rng.uniform(0.05, 0.2)}
    return {'typ': 'klar', 'farg': 'klar', 'kantalfa': rng.uniform(0.15, 0.35), 'dis': rng.uniform(0.03, 0.1), 'kantljus': rng.uniform(0.4, 0.9), 'glans': rng.uniform(0.35, 1.0)}


def valj_ficka(rng):
    r = rng.random()
    if r < 0.55:
        namn = rng.choice(list(FICKFARGER)) if rng.random() < 0.6 else 'mörkgrön glitter'
        return {'typ': 'farg', 'farg': namn, 'bgr': FICKFARGER[namn], 'dis': rng.uniform(0.03, 0.1), 'kantljus': rng.uniform(0.3, 0.8), 'glans': rng.uniform(0.35, 1.0)}
    if r < 0.85:
        return {'typ': 'klar', 'farg': 'klar', 'kantalfa': rng.uniform(0.15, 0.35), 'dis': rng.uniform(0.03, 0.1), 'kantljus': rng.uniform(0.4, 0.9), 'glans': rng.uniform(0.35, 1.0)}
    return {'typ': 'ingen', 'farg': None, 'dis': 0.0, 'kantljus': 0.0, 'glans': rng.uniform(0.05, 0.2)}


# ── bakgrunden ─────────────────────────────────────────────────────────────
def fyll(rng, bit, s):
    """Ett tomt bordsutsnitt → hela 2×-bilden. Lampans ljusfall plattas ut (ljuset läggs på
    igen i efterbehandlingen), bitens skala blir s bildpunkter per källpunkt, och är biten för
    liten täcks bilden med slumpade lappar ur den, mjukt ihopfogade (inga speglade sömmar)."""
    b = bit.astype(np.float32)
    mjuk = cv2.GaussianBlur(b, (0, 0), max(8.0, min(b.shape[:2]) / 10))
    b = b / np.maximum(mjuk, 1) * mjuk.reshape(-1, 3).mean(0)
    b = cv2.resize(b, (max(8, int(b.shape[1] * s)), max(8, int(b.shape[0] * s))), interpolation=cv2.INTER_CUBIC)
    if rng.random() < 0.5:
        b = b[:, ::-1]
    bh, bw = b.shape[:2]
    if bw >= WS and bh >= HS:
        ox, oy = rng.integers(0, bw - WS + 1), rng.integers(0, bh - HS + 1)
        return np.ascontiguousarray(b[oy:oy + HS, ox:ox + WS])
    T = int(min(bw, bh, 420))
    steg = int(T * 0.55)
    medel = b.reshape(-1, 3).mean(0)
    acc = np.zeros((HS + T, WS + T, 3), np.float32)
    vikt = np.zeros((HS + T, WS + T, 1), np.float32)
    r = np.minimum(np.arange(T) + 1, T - np.arange(T)).astype(np.float32)
    f = np.minimum(r[:, None], r[None, :])
    f = (np.minimum(f / (0.45 * T), 1.0) ** 2 + 1e-4)[..., None]
    for y in range(0, HS, steg):
        for x in range(0, WS, steg):
            ox, oy = rng.integers(0, bw - T + 1), rng.integers(0, bh - T + 1)
            lapp = b[oy:oy + T, ox:ox + T]
            lapp = lapp * (medel / np.maximum(lapp.reshape(-1, 3).mean(0), 1))   # samma ton i varje lapp
            if rng.random() < 0.5:
                lapp = lapp[::-1]
            acc[y:y + T, x:x + T] += lapp * f
            vikt[y:y + T, x:x + T] += f
    return (acc / np.maximum(vikt, 1e-6))[:HS, :WS]


REELL_ANDEL = 0.8    # så ofta är bakgrunden en riktig ruta ur en träningsfilm eller ett bakgrundsklipp (annars en ritad yta);
                     # 0,65 med tre filmer, 0,8 sedan grind 2 (tolv underlag)


def tillaten(b):
    """Bakgrunden får bara användas om spärren släpper igenom källan. De fyra äldre källorna (utsnitt ur
    grind 1:s rutor, skärminspelningar) stoppas sedan partiet 2026-09-21 blev oanvändbart — då återstår
    Jespers tre träningsfilmer."""
    try:
        prova_kalla(os.path.join(ROT, b['kalla']), *([os.path.join(ROT, b['video'])] if b.get('video') else []))
        return True
    except ProvLacka:
        return False


def fyll_film(rng, bit, s):
    """En hel ruta ur en träningsfilm → 2×-duken: skalas så att den täcker duken (s = extra förstoring),
    speglas ibland och skärs slumpat. Ingen utplattning och ingen lapptäckning — mattans kant, bordets
    form, böcker och leksaker runt det får vara kvar, precis som i filmen."""
    b = bit.astype(np.float32)
    sc = max(WS / b.shape[1], HS / b.shape[0]) * s
    b = cv2.resize(b, (int(math.ceil(b.shape[1] * sc)), int(math.ceil(b.shape[0] * sc))), interpolation=cv2.INTER_CUBIC)
    if rng.random() < 0.5:
        b = b[:, ::-1]
    bh, bw = b.shape[:2]
    ox, oy = rng.integers(0, bw - WS + 1), rng.integers(0, bh - HS + 1)
    return np.ascontiguousarray(b[oy:oy + HS, ox:ox + WS])


def valj_bakgrund(rng, ix):
    """Först en källa (en film eller en äldre skärminspelning), sedan en ruta ur den — inte en ruta ur högen,
    eftersom rutorna inom en film är nästan identiska (tre ytor, inte nitton)."""
    grupper = {}
    for b in ix:
        film = b.get('typ') == 'video'
        # en grupp per video: de tre träningsfilmerna och de nio bakgrundsklippen 2026-09-29
        # (klippen ligger i samma mapp, så mappnamnet räcker inte längre)
        g = b['kalla'] if film else (b.get('video') or b['kalla'])
        grupper.setdefault(g, []).append(b)
    namn = sorted(grupper)
    lista = grupper[namn[rng.integers(len(namn))]]
    return lista[rng.integers(len(lista))]


def bakgrund(rng, bilder):
    ix = [b for b in json.load(open(os.path.join(BAKG, 'index.json'), encoding='utf-8'))['bakgrunder'] if tillaten(b)]
    if ix and rng.random() < REELL_ANDEL:
        b = valj_bakgrund(rng, ix)
        prova_kalla(os.path.join(ROT, b['kalla']), *( [os.path.join(ROT, b['video'])] if b.get('video') else []))
        bit = cv2.imread(os.path.join(BAKG, b['fil']))
        if b.get('typ') == 'video':
            s = rng.uniform(1.0, 1.35)
            img = fyll_film(rng, bit, s) * rng.uniform(0.85, 1.25)
            return img, {'typ': 'riktig', 'fil': b['fil'], 'kalla': b['kalla'], 'vad': b['vad'], 'skala': round(s, 2), 'fyllning': 'hel ruta ur filmen'}
        s = rng.uniform(1.0, 1.8)
        img = fyll(rng, bit, s) * rng.uniform(0.85, 1.25)
        return img, {'typ': 'riktig', 'fil': b['fil'], 'kalla': b['kalla'], 'vad': b['vad'], 'skala': round(s, 2), 'fyllning': 'plattad och lapptäckt'}
    sort = rng.choice(['tra', 'duk', 'matta', 'ljus'], p=[0.35, 0.25, 0.3, 0.1])
    if sort == 'matta':
        konst = None
        med = [k for k in bilder.alla if k['kalla'] == 'slump']
        # konstverket tas ur kortbilden (utsnittet av bilden), inte ur en ny hämtning
        post = med[rng.integers(len(med))]
        face = bilder.las(post)
        h, w = face.shape[:2]
        konst = face[int(0.11 * h):int(0.55 * h), int(0.08 * w):int(0.92 * w)]
        img, vad = texturer.matta(rng, WS, HS, SS, konst)
    else:
        img, vad = texturer.SORTER[sort](rng, WS, HS, SS)
    return img.astype(np.float32), {'typ': 'ritad', 'vad': vad}


# ── ritningen ──────────────────────────────────────────────────────────────
def varp(tex, Hm, bbox):
    x0, y0, x1, y1 = bbox
    T = np.array([[1, 0, -x0], [0, 1, -y0], [0, 0, 1]], float)
    return cv2.warpPerspective(tex, T @ Hm, (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))


def bbox_av(pts, pad):
    x0 = int(max(0, math.floor(pts[:, 0].min()) - pad))
    y0 = int(max(0, math.floor(pts[:, 1].min()) - pad))
    x1 = int(min(WS, math.ceil(pts[:, 0].max()) + pad))
    y1 = int(min(HS, math.ceil(pts[:, 1].max()) + pad))
    return x0, y0, x1, y1


def lagg_skugga(canvas, alfa, bbox, forskj, sigma, styrka):
    x0, y0, x1, y1 = bbox
    dx, dy = forskj
    m = alfa.astype(np.float32) / 255
    M = np.float32([[1, 0, dx], [0, 1, dy]])
    m = cv2.warpAffine(m, M, (x1 - x0, y1 - y0))
    m = cv2.GaussianBlur(m, (0, 0), sigma)
    canvas[y0:y1, x0:x1] *= (1 - styrka * m)[..., None]


def komponera(canvas, lager, bbox):
    x0, y0, x1, y1 = bbox
    a = lager[..., 3:4].astype(np.float32) / 255
    canvas[y0:y1, x0:x1] = canvas[y0:y1, x0:x1] * (1 - a) + lager[..., :3].astype(np.float32) * a


def rorelse_karna(l, vinkel):
    k = np.zeros((l, l), np.float32)
    k[l // 2, :] = 1
    R = cv2.getRotationMatrix2D((l / 2 - 0.5, l / 2 - 0.5), vinkel, 1)
    k = cv2.warpAffine(k, R, (l, l))
    return k / (k.sum() + 1e-6)


def rita_kort(rng, canvas, bilder, kam, k, ljus):
    H0 = hom_hojd(kam)
    A = lokal_till_bord(k)
    hornpx = proj(H0 @ A, horn_lokal(k))
    px_bredd = np.linalg.norm(hornpx[1] - hornpx[0])
    tex, s = kort_textur(rng, bilder, k, px_bredd)
    S = np.array([[1 / s, 0, 0], [0, 1 / s, 0], [0, 0, 1]])
    Hk = H0 @ A @ S
    rl = int(k.get('rorelse_px', 0))
    bbox = bbox_av(hornpx, 12 * SS + rl)
    if bbox[2] - bbox[0] < 2 or bbox[3] - bbox[1] < 2:
        return
    lag = varp(tex, Hk, bbox).astype(np.float32)
    # oskärpa: fickan gör kortet lite mjukare
    if k['ficka']['typ'] != 'ingen':
        sg = rng.uniform(0.3, 0.9) * SS
        lag[..., :3] = cv2.GaussianBlur(lag[..., :3], (0, 0), sg)
    # blänk: lampans reflex i fickan, starkast nära reflexpunkten; ibland ett band
    glans = 0.6 * k['ficka']['glans'] * ljus['blank']
    if glans > 0.02:
        x0, y0, x1, y1 = bbox
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        lx, ly = ljus['reflex']
        g = glans * np.exp(-((xx - lx) ** 2 + (yy - ly) ** 2) / (2 * (ljus['reflex_sigma']) ** 2))
        if rng.random() < 0.35 and k['ficka']['typ'] != 'ingen':
            a = rng.uniform(0, math.pi)
            mx, my = (x0 + x1) / 2 + rng.normal(0, 20 * SS), (y0 + y1) / 2 + rng.normal(0, 20 * SS)
            d = (xx - mx) * math.cos(a) + (yy - my) * math.sin(a)
            g = g + rng.uniform(0.15, 0.5) * np.exp(-d ** 2 / (2 * (rng.uniform(4, 14) * SS) ** 2))
        g = np.clip(g, 0, 0.6)[..., None]
        lag[..., :3] = lag[..., :3] + (255 - lag[..., :3]) * g
    if rl:
        # rörelseoskärpa på förmultiplicerad färg
        karna = rorelse_karna(rl | 1, rng.uniform(0, 180))
        a = lag[..., 3:4] / 255
        pm = lag[..., :3] * a
        pm = cv2.filter2D(pm, -1, karna)
        a2 = cv2.filter2D(lag[..., 3], -1, karna)[..., None] / 255
        lag[..., :3] = pm / np.maximum(a2, 1e-3)
        lag[..., 3:4] = a2 * 255
    # skugga, sedan kortet
    lagg_skugga(canvas, lag[..., 3], bbox, (ljus['skugga'][0] * SS * rng.uniform(1.0, 2.5), ljus['skugga'][1] * SS * rng.uniform(1.0, 2.5)),
                rng.uniform(1.5, 3.5) * SS, ljus['skugga_styrka'])
    komponera(canvas, np.clip(lag, 0, 255), bbox)
    k['_hornpx'] = hornpx


def rita_lek(rng, canvas, bilder, kam, k, ljus):
    t = k['tjock']
    A = lokal_till_bord(k)
    b = proj(hom_hojd(kam, 0) @ A, horn_lokal(k))
    top = proj(hom_hojd(kam, t) @ A, horn_lokal(k))
    alla = np.vstack([b, top])
    bbox = bbox_av(alla, 30 * SS)
    x0, y0 = bbox[0], bbox[1]
    # skugga från hela lekens kontur
    mask = np.zeros((bbox[3] - bbox[1], bbox[2] - bbox[0]), np.uint8)
    hull = cv2.convexHull((alla - [x0, y0]).astype(np.float32)).astype(np.int32)
    cv2.fillConvexPoly(mask, hull, 255, lineType=cv2.LINE_AA)
    off = t / 18
    lagg_skugga(canvas, mask, bbox, (ljus['skugga'][0] * SS * 3 * off, ljus['skugga'][1] * SS * 3 * off), 4 * SS, ljus['skugga_styrka'] * 1.2)
    # sidorna: kanterna av alla kort (och fickor) i leken, med ränder
    ficka = k['ficka']
    kantfarg = np.array(ficka['bgr'], float) * 0.8 if ficka['typ'] == 'farg' else np.array([170, 172, 175]) if ficka['typ'] == 'klar' else np.array([60, 60, 62])
    for i in range(4):
        j = (i + 1) % 4
        quad = np.array([b[i], b[j], top[j], top[i]])
        c = kantfarg * rng.uniform(0.7, 1.05)
        cv2.fillConvexPoly(canvas, (quad * 16).astype(np.int32), c.tolist(), lineType=cv2.LINE_AA, shift=4)
        for r in np.linspace(0.05, 0.95, 9):
            p = b[i] + (top[i] - b[i]) * r
            q = b[j] + (top[j] - b[j]) * r
            cv2.line(canvas, tuple((p * 16).astype(int)), tuple((q * 16).astype(int)), (c * rng.uniform(0.75, 1.3)).tolist(), 1, cv2.LINE_AA, shift=4)
    # ovansidan
    tex, s = kort_textur(rng, bilder, k, np.linalg.norm(top[1] - top[0]))
    S = np.array([[1 / s, 0, 0], [0, 1 / s, 0], [0, 0, 1]])
    lag = varp(tex, hom_hojd(kam, t) @ A @ S, bbox).astype(np.float32)
    if ficka['typ'] != 'ingen':
        lag[..., :3] = cv2.GaussianBlur(lag[..., :3], (0, 0), 0.6 * SS)
    komponera(canvas, lag, bbox)
    k['_hornpx'] = top
    k['_kontur_px'] = cv2.convexHull(alla.astype(np.float32)).reshape(-1, 2)


# ── händer (grind 2) ────────────────────────────────────────────────────────
HAND_ANDEL = 0.45     # så ofta en hand (med arm) ligger över bordet
HAND_TACKER = 0.45    # ett kort vars låda till mer än så täcks av handen blir en ignorerad yta, inte facit
HUD = [(172, 192, 232), (150, 175, 220), (118, 150, 200), (95, 125, 175), (70, 98, 145), (48, 68, 105)]   # BGR, ljus till mörk
TYG = [(40, 40, 42), (160, 160, 165), (120, 70, 40), (50, 60, 120), (60, 110, 60), (200, 200, 205), (30, 30, 90)]


def kapsel(m, a, b, r, v=255):
    a, b = tuple(int(x) for x in a), tuple(int(x) for x in b)
    cv2.line(m, a, b, v, int(max(1, 2 * r)), cv2.LINE_AA)
    cv2.circle(m, a, int(r), v, -1, cv2.LINE_AA)
    cv2.circle(m, b, int(r), v, -1, cv2.LINE_AA)


def rita_hand(rng, canvas, kam, kort, ljus):
    """En hand med arm som når in över bordet från en bildkant, ritad i 2×-duken ovanpå korten.

    Enkel form: arm (kapsel), handflata (ellips), fyra fingrar och en tumme (kaplar), öppen eller
    gripande. Hudfärg ur en skala från ljus till mörk, skuggning mot kanterna, ibland ärm, ofta
    rörelseoskärpa (händer rör sig), och en mjuk skugga på bordet eftersom handen är ovanför det.
    Returnerar täckningen (0–1) i 2×-duken och en beskrivning till facit."""
    c0 = proj(hom_hojd(kam), [[0, 0], [KORT_B, 0]])
    kb = float(np.linalg.norm(c0[1] - c0[0]))            # kortets bredd i 2×-bildpunkter mitt i bilden
    skala = rng.uniform(1.1, 1.5)                          # handen är närmare kameran än bordet
    palm = kb * 1.35 * skala                               # handflatans bredd
    # handleden: ofta vid ett kort, annars var som helst
    synliga = [k for k in kort if '_hornpx' in k]
    if synliga and rng.random() < 0.7:
        k = synliga[rng.integers(len(synliga))]
        mitt = k['_hornpx'].mean(0) + rng.normal(0, kb * 0.6, 2)
    else:
        mitt = np.array([rng.uniform(0.1, 0.9) * WS, rng.uniform(0.1, 0.9) * HS])
    kant = rng.choice(['ner', 'vanster', 'hoger', 'upp'], p=[0.5, 0.2, 0.2, 0.1])
    ut_ = {'ner': (mitt[0] + rng.normal(0, WS * 0.1), HS + palm), 'upp': (mitt[0] + rng.normal(0, WS * 0.1), -palm),
           'vanster': (-palm, mitt[1] + rng.normal(0, HS * 0.1)), 'hoger': (WS + palm, mitt[1] + rng.normal(0, HS * 0.1))}[kant]
    arm_start = np.array(ut_, float)
    riktn = mitt - arm_start
    riktn /= np.linalg.norm(riktn) + 1e-6
    vink = rng.normal(0, 0.35)
    c, s_ = math.cos(vink), math.sin(vink)
    riktn = np.array([c * riktn[0] - s_ * riktn[1], s_ * riktn[0] + c * riktn[1]])
    led = mitt - riktn * palm * 0.9                         # handleden bakom handflatans mitt
    vinkel = math.degrees(math.atan2(riktn[1], riktn[0]))
    m = np.zeros((HS, WS), np.uint8)
    armbredd = palm * rng.uniform(0.55, 0.7)
    kapsel(m, arm_start - riktn * palm * 2, led, armbredd / 2)
    arm_m = m.copy()
    cv2.ellipse(m, tuple(int(x) for x in mitt), (int(palm * 0.62), int(palm * 0.5)), vinkel, 0, 360, 255, -1, cv2.LINE_AA)
    griper = rng.random() < 0.5
    norm = np.array([-riktn[1], riktn[0]])
    fl = palm * (rng.uniform(0.35, 0.55) if griper else rng.uniform(0.7, 0.95))
    spridn = rng.uniform(0.05, 0.35)
    for i, (off, lang) in enumerate([(-0.33, 0.85), (-0.11, 1.0), (0.11, 0.95), (0.32, 0.75)]):
        bas = mitt + riktn * palm * 0.3 + norm * off * palm
        d = riktn + norm * off * spridn * 2
        d /= np.linalg.norm(d)
        kapsel(m, bas, bas + d * (fl + palm * 0.15) * lang, palm * 0.11)
    sida = 1 if rng.random() < 0.5 else -1
    tb = mitt + norm * sida * palm * 0.4 - riktn * palm * 0.1
    td = riktn * 0.6 + norm * sida * 0.8
    td /= np.linalg.norm(td)
    kapsel(m, tb, tb + td * palm * rng.uniform(0.45, 0.7), palm * 0.11)
    if not m.any():
        return None, None
    # färg: hud, skuggad mot kanterna (avståndet till kanten), ibland ärm på armen
    hud = np.array(HUD[rng.integers(len(HUD))], np.float32) * rng.uniform(0.85, 1.1)
    dt = cv2.distanceTransform((m > 127).astype(np.uint8), cv2.DIST_L2, 3)
    dtn = np.clip(dt / (palm * 0.3), 0, 1)
    ljushet = 0.72 + 0.38 * np.sqrt(dtn)
    farg = np.empty((HS, WS, 3), np.float32)
    farg[:] = hud
    arm = False
    if rng.random() < 0.5:
        # ärmen börjar en bit upp på armen
        tyg = np.array(TYG[rng.integers(len(TYG))], np.float32)
        yy, xx = np.mgrid[0:HS, 0:WS].astype(np.float32)
        proj_led = (xx - led[0]) * -riktn[0] + (yy - led[1]) * -riktn[1]
        arm_zon = (proj_led > palm * rng.uniform(0.2, 0.9)) & (arm_m > 0)
        farg[arm_zon] = tyg
        arm = True
    brus = cv2.resize(rng.normal(0, 1, (HS // 16, WS // 16)).astype(np.float32), (WS, HS))
    farg *= (ljushet * (1 + 0.04 * brus))[..., None]
    alfa = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 1.2 * SS)
    rorelse = 0
    if rng.random() < 0.6:
        rorelse = int(rng.integers(6, 30)) * SS
        karna = rorelse_karna(rorelse | 1, rng.uniform(0, 180))
        pm = cv2.filter2D(farg * alfa[..., None], -1, karna)
        alfa = cv2.filter2D(alfa, -1, karna)
        farg = pm / np.maximum(alfa, 1e-3)[..., None]
    # skugga på bordet: handen är 5–15 cm ovanför, så skuggan är förskjuten och mjuk
    sk = cv2.GaussianBlur(alfa, (0, 0), rng.uniform(6, 14) * SS)
    dx, dy = ljus['skugga'][0] * palm * rng.uniform(0.2, 0.6), ljus['skugga'][1] * palm * rng.uniform(0.2, 0.6)
    sk = cv2.warpAffine(sk, np.float32([[1, 0, dx], [0, 1, dy]]), (WS, HS))
    canvas *= (1 - ljus['skugga_styrka'] * 0.9 * sk)[..., None]
    canvas[:] = canvas * (1 - alfa[..., None]) + farg * alfa[..., None]
    return alfa, {'kant': str(kant), 'griper': bool(griper), 'arm': arm, 'rorelse_px': rorelse // SS, 'palm_px': round(palm / SS, 1),
                  'hud': [int(x) for x in hud]}


def hand_i_facit(kort, alfa):
    """Kort vars låda till mer än HAND_TACKER täcks av handen blir ignorerade ytor (far_lada = False)."""
    liten = cv2.resize(alfa, (W, H), interpolation=cv2.INTER_AREA) > 0.5
    for k in kort:
        k['hand'] = 0.0
        if k.get('_lada') is None:
            continue
        x0, y0, x1, y1 = [int(round(v)) for v in k['_lada']]
        x0, y0 = max(0, x0), max(0, y0)
        x1, y1 = min(W, max(x1, x0 + 1)), min(H, max(y1, y0 + 1))
        f = float(liten[y0:y1, x0:x1].mean()) if x1 > x0 and y1 > y0 else 0.0
        k['hand'] = f
        if f > HAND_TACKER:
            k['far_lada'] = False


def ljusforhallanden(rng):
    sort = rng.choice(['neutralt', 'varmt', 'kallt', 'mörkt'], p=[0.3, 0.3, 0.2, 0.2])
    farg = {'neutralt': (1, 1, 1), 'varmt': (0.78, 0.95, 1.12), 'kallt': (1.12, 1.0, 0.86), 'mörkt': (0.9, 0.97, 1.05)}[sort]
    gain = rng.uniform(0.35, 0.6) if sort == 'mörkt' else rng.uniform(0.85, 1.15)
    vinkel = rng.uniform(0, 2 * math.pi)
    return {'sort': sort, 'farg': farg, 'gain': gain,
            'reflex': (rng.uniform(0.1, 0.9) * WS, rng.uniform(0.1, 0.9) * HS), 'reflex_sigma': rng.uniform(50, 170) * SS,
            'blank': rng.uniform(0.1, 0.9), 'skugga': (math.cos(vinkel), math.sin(vinkel)), 'skugga_styrka': rng.uniform(0.25, 0.55),
            'kagla': rng.uniform(0.0, 0.45), 'kagla_pos': (rng.uniform(0.2, 0.8) * WS, rng.uniform(0.2, 0.8) * HS), 'kagla_sigma': rng.uniform(300, 700) * SS,
            'vinjett': rng.uniform(0.0, 0.35)}


def efterbehandla(rng, canvas, ljus):
    yy, xx = np.mgrid[0:HS, 0:WS].astype(np.float32)
    lx, ly = ljus['kagla_pos']
    kag = (1 - ljus['kagla']) + ljus['kagla'] * np.exp(-((xx - lx) ** 2 + (yy - ly) ** 2) / (2 * ljus['kagla_sigma'] ** 2)) * 1.3
    r2 = ((xx - WS / 2) / (WS / 2)) ** 2 + ((yy - HS / 2) / (HS / 2)) ** 2
    vin = 1 - ljus['vinjett'] * r2 / 2
    img = canvas * (kag * vin)[..., None] * np.array(ljus['farg'], np.float32) * ljus['gain']
    img = cv2.resize(np.clip(img, 0, 255), (W, H), interpolation=cv2.INTER_AREA)
    steg = {}
    if rng.random() < 0.4:
        s = rng.uniform(0.4, 1.1)
        img = cv2.GaussianBlur(img, (0, 0), s)
        steg['oskarpa'] = round(s, 2)
    if rng.random() < 0.25:
        f = rng.uniform(0.5, 0.8)
        img = cv2.resize(cv2.resize(img, (int(W * f), int(H * f)), interpolation=cv2.INTER_AREA), (W, H), interpolation=cv2.INTER_LINEAR)
        steg['lagupplost'] = round(f, 2)
    if rng.random() < 0.08:
        karna = rorelse_karna(int(rng.integers(3, 8)) | 1, rng.uniform(0, 180))
        img = cv2.filter2D(img, -1, karna)
        steg['skakning'] = True
    brus_s = rng.uniform(1.5, 4.0) / math.sqrt(ljus['gain'])
    img = img + rng.normal(0, brus_s, (H, W, 1)).astype(np.float32)
    kr = cv2.resize(rng.normal(0, brus_s * 0.6, (H // 4, W // 4, 3)).astype(np.float32), (W, H))
    img = img + kr
    steg['brus'] = round(brus_s, 2)
    if rng.random() < 0.5:
        bl = cv2.GaussianBlur(img, (0, 0), 1.2)
        a = rng.uniform(0.3, 0.8)
        img = img + a * (img - bl)
        steg['skarpning'] = round(a, 2)
    img = np.clip(img, 0, 255).astype(np.uint8)
    q = int(rng.integers(45, 93))
    ok, jpg = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, q])
    steg['jpeg'] = q
    return jpg, steg


# ── facit ──────────────────────────────────────────────────────────────────
def facit_for(kort, kam):
    """Synlighet och lådor ur korten som polygoner i 2×-bilden; z högst först."""
    H0 = hom_hojd(kam)
    for k in kort:
        A = lokal_till_bord(k)
        k['_poly'] = k['_kontur_px'] if k['klass'] == 'baksida' else proj(H0 @ A, horn_lokal(k))
        k['_namn'] = None if k['klass'] == 'baksida' else proj(H0 @ A, namnrad_lokal(k))
    tackt = np.zeros((HS, WS), np.uint8)
    for k in sorted(kort, key=lambda k: -k['z']):
        full = rastrerad_yta(k['_poly'])
        x0, y0, x1, y1 = bbox_av(k['_poly'], 2)
        k['_lada'], k['tjocklek_px'], k['synlig'], k['namnrad'] = None, 0.0, 0.0, (None if k['_namn'] is None else 0.0)
        k['utanfor'] = 1.0
        if x1 > x0 and y1 > y0:
            off = np.array([x0, y0])
            m = np.zeros((y1 - y0, x1 - x0), np.uint8)
            cv2.fillPoly(m, [((k['_poly'] - off) * 16).astype(np.int32)], 1, lineType=cv2.LINE_8, shift=4)
            t = tackt[y0:y1, x0:x1]
            syns = m & (1 - t)
            k['synlig'] = min(1.0, float(syns.sum() / full))
            k['utanfor'] = float(max(0.0, 1 - m.sum() / full))
            if k['_namn'] is not None:
                nm = np.zeros_like(m)
                cv2.fillPoly(nm, [((k['_namn'] - off) * 16).astype(np.int32)], 1, lineType=cv2.LINE_8, shift=4)
                k['namnrad'] = min(1.0, float((nm & (1 - t)).sum() / rastrerad_yta(k['_namn'])))
            # lådan: bara delar som är minst LADA_REMSA_PX tjocka — en hårfin remsa längs kanten
            # (kortet under sticker ut en halv millimeter) ska inte dra ut lådan över hela kortet
            lsyn = cv2.morphologyEx(syns, cv2.MORPH_OPEN, OPPNA) if syns.any() else syns
            if lsyn.any():
                ys, xs = np.nonzero(lsyn)
                k['_lada'] = ((xs.min() + x0) / SS, (ys.min() + y0) / SS, (xs.max() + 1 + x0) / SS, (ys.max() + 1 + y0) / SS)
                dt = cv2.distanceTransform(np.pad(syns, 1), cv2.DIST_L2, 3)
                k['tjocklek_px'] = float(2 * dt.max() / SS)
            t |= m
        if k['klass'] == 'baksida':
            k['far_lada'] = k['synlig'] > 0.2
        else:
            k['far_lada'] = bool(k['_lada'] is not None and ((k['namnrad'] or 0) >= LADA_NAMNRAD or (k['synlig'] >= LADA_SYNLIG and k['tjocklek_px'] >= LADA_TJOCK_PX)))
    # högar: kort omlott (≥ 3 % av det minsta kortet) som inte är fästa; leken och graveyard räknas inte (som i rita-geometri.cjs)
    ispel = [k for k in kort if k['klass'] == 'kort' and not k.get('grav')]
    far = {k['id']: k['id'] for k in ispel}

    def rot_(i):
        while far[i] != i:
            far[i] = far[far[i]]
            i = far[i]
        return i
    for i, a in enumerate(ispel):
        for b in ispel[i + 1:]:
            if a.get('fast') == b['id'] or b.get('fast') == a['id']:
                continue
            m = min(yta(a['_poly']), yta(b['_poly']))
            if m and snitt(a['_poly'], b['_poly']) / m >= OVERLAPP_MIN:
                far[rot_(a['id'])] = rot_(b['id'])
    klumpar = {}
    for k in ispel:
        klumpar.setdefault(rot_(k['id']), []).append(k)
    lista = sorted([g for g in klumpar.values() if len(g) >= 2], key=lambda g: min(k['z'] for k in g))
    for n, g in enumerate(lista):
        for k in g:
            k['hog'] = chr(65 + n) if n < 26 else f'A{n - 25}'
    # graveyard: egen hög-bokstav i zonen
    for k in kort:
        if k.get('grav'):
            k['zon'] = 'grav'


def vinkel_namnrad(p):
    return (math.degrees(math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0])) + 360) % 360


def skriv_facit(namn, kort, kam, bg, ljus, steg, scen, grupper, fro, tid_ms):
    ut = []
    for k in sorted(kort, key=lambda k: k['z']):
        poly = k['_hornpx'] / SS if k['klass'] == 'baksida' else k['_poly'] / SS
        v = vinkel_namnrad(poly)
        vv = v % 180
        tappad = min(vv, 180 - vv) > TAPP_GRANS
        lada = k['_lada']
        post = {
            'id': k['id'], 'klass': k['klass'], 'namn': ('library' if k['slag'] == 'lek' else 'baksida') if k['klass'] == 'baksida' else k['post']['namn'],
            'slag': k['slag'] if k['klass'] == 'baksida' else None,
            'scryfall_id': None if k['klass'] == 'baksida' else k['post']['id'],
            'kalla': 'baksida' if k['klass'] == 'baksida' else k['post']['kalla'],
            'horn': [[round(x / W, 4), round(y / H, 4)] for x, y in poly],
            'horn_px': [[round(x, 1), round(y, 1)] for x, y in poly],
            'z': k['z'], 'tappad': tappad if k['klass'] == 'kort' else None,
            'synlig': round(k['synlig'], 3), 'namnrad': None if k['namnrad'] is None else round(k['namnrad'], 3),
            'dold': None if k['namnrad'] is None else k['namnrad'] < 0.5,
            'avskuret': k['utanfor'] > AVSKUREN_OVER, 'utanfor': round(k['utanfor'], 3),
            'tjocklek_px': round(k['tjocklek_px'], 1),
            'lada': None if lada is None else [round(lada[0] / W, 4), round(lada[1] / H, 4), round((lada[2] - lada[0]) / W, 4), round((lada[3] - lada[1]) / H, 4)],
            'lada_px': None if lada is None else [round(lada[0], 1), round(lada[1], 1), round(lada[2] - lada[0], 1), round(lada[3] - lada[1], 1)],
            'far_lada': bool(k['far_lada']),
            'hog': k.get('hog'), 'fast': k.get('fast'), 'zon': k.get('zon'),
            'ficka': k['ficka']['farg'] if k['ficka']['typ'] != 'ingen' else None,
            'grupp': k['grupp'], 'token': bool(k.get('token')), 'rorelse_px': int(k.get('rorelse_px', 0) / SS),
            'hand': round(k.get('hand', 0.0), 3),
        }
        if k['klass'] == 'baksida':
            post['tjock_mm'] = round(k['tjock'], 1)
        ut.append(post)
    facit = {
        'bild': namn + '.jpg', 'bredd': W, 'hojd': H, 'fro': fro, 'scen': scen, 'ruta': {'upp': 'v'},
        'generator': 'dev/detektor/synt/generera.py (MES-288 grind 1b)',
        'regel_lada': f'namnrad >= {LADA_NAMNRAD}, eller synlig >= {LADA_SYNLIG} och tjocklek >= {LADA_TJOCK_PX} px; baksida: synlig > 0,2; ingen låda om handen täcker mer än {HAND_TACKER} av lådan',
        'kamera': {k: round(v, 2) for k, v in kam.items() if k != 'P'},
        'bakgrund': bg, 'ljus': {'sort': ljus['sort'], 'gain': round(ljus['gain'], 2), 'blank': round(ljus['blank'], 2), 'kagla': round(ljus['kagla'], 2)},
        'efter': steg, 'grupper': grupper, 'tid_ms': round(tid_ms),
        'kort': ut,
    }
    return facit


def yolo_rader(facit):
    rader = []
    for k in facit['kort']:
        if not k['far_lada']:
            continue
        x, y, w, h = k['lada']
        rader.append(f"{KLASSER.index(k['klass'])} {x + w / 2:.6f} {y + h / 2:.6f} {w:.6f} {h:.6f}")
    return rader


def en_bild(bilder, fro, scen):
    t0 = time.perf_counter()
    rng = np.random.default_rng(fro)
    kam = kamera(rng)
    canvas, bg = bakgrund(rng, bilder)
    ljus = ljusforhallanden(rng)
    kort, grupper = lagg_ut(rng, bilder, kam, scen)
    # rörelseoskärpa: ett eller två kort som just läggs ut (aldrig leken)
    kandidater = [k for k in kort if k['klass'] == 'kort']
    if kandidater and rng.random() < 0.35:
        for i in rng.choice(len(kandidater), size=min(len(kandidater), int(rng.integers(1, 3))), replace=False):
            kandidater[i]['rorelse_px'] = int(rng.integers(8, 30)) * SS
    for k in sorted(kort, key=lambda k: k['z']):
        (rita_lek if k['klass'] == 'baksida' else rita_kort)(rng, canvas, bilder, kam, k, ljus)   # rita_lek: baksidan, tjock som leken eller tunn som ett kort
    kort = [k for k in kort if '_hornpx' in k]
    # handen: egen slumpström, så att allt annat i bilden blir som före grind 2 för samma --fro
    rh = np.random.default_rng(fro + 7_000_000)
    hand = None
    if HANDER and rh.random() < HAND_ANDEL:
        alfa, hand = rita_hand(rh, canvas, kam, kort, ljus)
    facit_for(kort, kam)
    if hand is not None:
        hand_i_facit(kort, alfa)
    jpg, steg = efterbehandla(rng, canvas, ljus)
    if hand is not None:
        steg['hand'] = hand
    return jpg, kort, kam, bg, ljus, steg, grupper, (time.perf_counter() - t0) * 1000


def main():
    a = sys.argv[1:]
    n = int(a[a.index('--n') + 1]) if '--n' in a else 20
    fro0 = int(a[a.index('--fro') + 1]) if '--fro' in a else 1
    utn = a[a.index('--ut') + 1] if '--ut' in a else 'bilder'
    ut = os.path.join(ARB, utn)
    os.makedirs(ut, exist_ok=True)
    bilder = Bilder()
    alla, tider = [], []
    for i in range(n):
        fro = fro0 + i
        scen = SCENORDNING[i % len(SCENORDNING)]
        namn = f'synt-{fro:05d}'
        if '--fortsatt' in a and os.path.exists(os.path.join(ut, namn + '.json')) and os.path.exists(os.path.join(ut, namn + '.txt')):
            alla.append(json.load(open(os.path.join(ut, namn + '.json'), encoding='utf-8')))   # redan gjord (samma --fro ger samma bild)
            continue
        jpg, kort, kam, bg, ljus, steg, grupper, ms = en_bild(bilder, fro, scen)
        with open(os.path.join(ut, namn + '.jpg'), 'wb') as f:
            f.write(jpg.tobytes())
        facit = skriv_facit(namn, kort, kam, bg, ljus, steg, scen, grupper, fro, ms)
        with open(os.path.join(ut, namn + '.json'), 'w', encoding='utf-8') as f:
            json.dump(facit, f, ensure_ascii=False, indent=1)
        with open(os.path.join(ut, namn + '.txt'), 'w') as f:
            f.write('\n'.join(yolo_rader(facit)) + '\n')
        alla.append(facit)
        tider.append(ms)
        nl = sum(k['far_lada'] for k in facit['kort'])
        print(f'{namn} {scen:12s} {len(facit["kort"]):2d} kort, {nl:2d} lådor, {ms:6.0f} ms', flush=True)
    with open(os.path.join(ut, 'klasser.txt'), 'w') as f:
        f.write('\n'.join(KLASSER) + '\n')
    skriv_coco(ut, alla)
    with open(os.path.join(ut, 'facit.js'), 'w', encoding='utf-8') as f:
        f.write('/* genererad av dev/detektor/synt/generera.py — facit för kontaktarket */\nwindow.SYNT = ' + json.dumps(alla, ensure_ascii=False) + ';\n')
    t = np.array(tider or [0])
    print(f'{n} bilder: median {np.median(t):.0f} ms, medel {t.mean():.0f} ms, max {t.max():.0f} ms per bild (en tråd)')


def skriv_coco(ut, alla):
    coco = {'info': {'description': 'Syntetiska bord, MES-288 grind 1b', 'version': '1'},
            'categories': [{'id': i + 1, 'name': n} for i, n in enumerate(KLASSER)], 'images': [], 'annotations': []}
    aid = 1
    for i, f in enumerate(alla):
        ign = [k['lada_px'] for k in f['kort'] if not k['far_lada'] and k['lada_px']]
        coco['images'].append({'id': i + 1, 'file_name': f['bild'], 'width': W, 'height': H, 'ignorera': ign})
        for k in f['kort']:
            if not k['far_lada']:
                continue
            x, y, w, h = k['lada_px']
            coco['annotations'].append({'id': aid, 'image_id': i + 1, 'category_id': KLASSER.index(k['klass']) + 1, 'bbox': [x, y, w, h],
                                        'area': round(w * h, 1), 'iscrowd': 0, 'horn_px': k['horn_px'], 'synlig': k['synlig'], 'kort_id': k['id']})
            aid += 1
    with open(os.path.join(ut, 'coco.json'), 'w', encoding='utf-8') as f:
        json.dump(coco, f, ensure_ascii=False)


if __name__ == '__main__':
    main()

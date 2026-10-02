#!/usr/bin/env python3
"""MES-328: gemensamt för remsproven — bildmodellen (MobileCLIP-S0) i Python, med exakt
embed.js-receptet, plus remsor ur kortens hörn.

Receptet (dev/embed/embed.js, mätt i MES-213):
  • 256 × 256, bilden trycks till kvadrat (fit: fill), RGB 0–1 utan mer normering
  • referens: skanningen som den är ('skarp') och en suddig (150 px bred, tre varv lådfilter
    3×1 och 1×3, 'sudd'), vardera i vridningar (90-steg på den kvadratiska bilden)
  • referensernas medelvektor dras bort före jämförelsen, allt normeras om
  • poäng per NAMN = bästa referensen för namnet; marginal = bästa namnet minus näst bästa;
    säker vid marginal > 0,11
  • omskalningen är webbläsarens canvas (dev/embed/lib.cjs 'webb'): halverad mipmapnivå så
    länge bilden krymper minst 2× åt båda hållen, sedan bilinjärt utan förfiltrering.

Modellen: dev/embed/modeller/mobileclip-s0-vision.onnx (gitignorerad; Xenova/mobileclip_s0,
vision_model.onnx, 45 MB — se dev/embed/LÄS-MIG.md). onnxruntime på Macens processor.

Remsan: kortets översta ANDEL (0,12 / 0,16 / 0,20) ur de fyra hörnen (dev/detektor/remsa.py:
hörn 0 → 1 är överkanten), varpad till en rektangel med perspektivtransform. Ur en
Scryfall-bild (488 × 680, med svart kant) är remsan de översta raderna.
"""
import json, os, time
import numpy as np
import cv2

HAR = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(os.path.dirname(HAR))
MODELL = os.environ.get('MESA_MOBILECLIP', os.path.join(ROT, 'dev', 'embed', 'modeller', 'mobileclip-s0-vision.onnx'))
LEK_CACHE = os.path.join(ROT, 'dev', 'embed', 'cache', 'lek-golden.json')
LEKFIL = os.path.join(ROT, 'dev', 'golden', 'lek.txt')
SIDA, DIM = 256, 512
MARGINAL = 0.08            # Kamera.beskar(): beskärningens marginal runt kortet
TROSKEL = 0.11             # embed.js: marginal till nästa namn för "säker"
SUDD_BREDD = 150
REF_BREDD, REF_HOJD = 488, 680   # Scryfalls 'normal'


# ── omskalning som webbläsaren ───────────────────────────────────────────────
def halvera(img):
    h, w = img.shape[:2]
    return cv2.resize(img, (w // 2, h // 2), interpolation=cv2.INTER_AREA)   # 2×2-medel på jämna mått


def skala_webb(img, w, h):
    """Chromes drawImage: mipmapnivå medan bilden krymper ≥ 2× åt båda hållen, sedan bilinjärt."""
    while min(img.shape[1] / w, img.shape[0] / h) >= 2 and min(img.shape[:2]) >= 2:
        img = halvera(img)
    return cv2.resize(img, (w, h), interpolation=cv2.INTER_LINEAR)


def suddig(img):
    """Referensens suddiga variant, pixel för pixel som suddig() i embed.js."""
    h = int(round(SUDD_BREDD * img.shape[0] / img.shape[1]))
    a = skala_webb(img, SUDD_BREDD, max(1, h)).astype(np.float32)
    k = np.array([1, 1, 1], np.float32) / 3
    for _ in range(3):
        a = cv2.filter2D(a, -1, k.reshape(1, 3), borderType=cv2.BORDER_REPLICATE)
        a = np.clip(np.rint(a), 0, 255)          # Uint8ClampedArray avrundar efter varje varv
        a = cv2.filter2D(a, -1, k.reshape(3, 1), borderType=cv2.BORDER_REPLICATE)
        a = np.clip(np.rint(a), 0, 255)
    return a.astype(np.uint8)


def kvadrat(img, karna='webb'):
    """Bilden tryckt till 256 × 256 (fit: fill)."""
    if karna == 'webb':
        return skala_webb(img, SIDA, SIDA)
    return cv2.resize(img, (SIDA, SIDA), interpolation=cv2.INTER_LINEAR)


def vrid(sq, rot):
    """90-steg medurs på den kvadratiska bilden (embed.js vrider canvasen medurs)."""
    return np.ascontiguousarray(np.rot90(sq, -((rot // 90) % 4)))


def tensor(sq_rgb):
    """256 × 256 RGB uint8 → (3, 256, 256) float 0–1."""
    return sq_rgb.transpose(2, 0, 1).astype(np.float32) / 255.0


# ── modellen ────────────────────────────────────────────────────────────────
class Bildmodell:
    def __init__(self, fil=MODELL, tradar=4):
        import onnxruntime as ort
        if not os.path.exists(fil):
            raise SystemExit(f'modellen saknas: {fil} — hämta vision_model.onnx från huggingface.co/Xenova/mobileclip_s0 (se dev/remsa/RESULTAT.md)')
        so = ort.SessionOptions(); so.intra_op_num_threads = tradar
        self.s = ort.InferenceSession(fil, so, providers=['CPUExecutionProvider'])
        self.inp = self.s.get_inputs()[0].name
        self.ms = []          # tid per bild, för rapporten

    def kor(self, kvadrater, batch=8):
        """Lista av 256 × 256 RGB uint8 → (n, 512) normerade vektorer."""
        ut = []
        for i in range(0, len(kvadrater), batch):
            x = np.stack([tensor(k) for k in kvadrater[i:i + batch]])
            t0 = time.perf_counter()
            y = self.s.run(None, {self.inp: x})[0]
            dt = (time.perf_counter() - t0) * 1000 / len(x)
            self.ms.extend([dt] * len(x))
            ut.append(y / np.maximum(np.linalg.norm(y, axis=1, keepdims=True), 1e-9))
        return np.concatenate(ut) if ut else np.zeros((0, DIM), np.float32)


# ── leken och referenserna ──────────────────────────────────────────────────
def las_lek():
    namn = []
    for rad in open(LEKFIL, encoding='utf-8'):
        r = rad.strip()
        if not r or r.startswith('#'):
            continue
        d = r.split(' ', 1)
        namn.append(d[1] if d[0].isdigit() and len(d) == 2 else r)
    return list(dict.fromkeys(namn))


def las_referensbilder():
    """[(namn, id, bild BGR)] ur dev/embed/cache (hamta-referenser.cjs)."""
    if not os.path.exists(LEK_CACHE):
        raise SystemExit('referenserna saknas: kör node dev/embed/hamta-referenser.cjs')
    j = json.load(open(LEK_CACHE, encoding='utf-8'))
    ut = []
    for c in j['kort']:
        fil = os.path.join(ROT, 'dev', 'embed', c['normalFil'])
        img = cv2.imread(fil)
        if img is None:
            continue
        ut.append((c['name'], c['id'], img))
    return ut


def ref_strip(img, andel):
    """Remsan ur en Scryfall-bild: de översta ANDEL raderna, hela bredden."""
    h = max(1, int(round(img.shape[0] * andel)))
    return img[:h]


class Referenser:
    """Referensvektorer per namn med centrering, som embed.js byggLek + centrera."""

    def __init__(self, modell, bilder, rotar=(0, 90, 180, 270), varianter=('skarp', 'sudd'), karna='webb'):
        kvad, self.namn, self.id, self.rot, self.variant = [], [], [], [], []
        for namn, cid, img in bilder:
            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            for v in varianter:
                bas = kvadrat(suddig(rgb), karna) if v == 'sudd' else kvadrat(rgb, karna)
                for r in rotar:
                    kvad.append(vrid(bas, r)); self.namn.append(namn); self.id.append(cid); self.rot.append(r); self.variant.append(v)
        self.ra = modell.kor(kvad)
        self.medel = self.ra.mean(axis=0)
        c = self.ra - self.medel
        self.vek = c / np.maximum(np.linalg.norm(c, axis=1, keepdims=True), 1e-9)
        self.namnlista = sorted(set(self.namn))
        self._namnidx = np.array([self.namnlista.index(n) for n in self.namn])

    def rangordna(self, q, utan=None):
        """q: en rå normerad vektor → [(namn, poäng)] sorterad, poäng per namn = bästa referens."""
        c = q - self.medel
        c = c / max(float(np.linalg.norm(c)), 1e-9)
        s = self.vek @ c
        per = np.full(len(self.namnlista), -2.0)
        np.maximum.at(per, self._namnidx, s)
        ordn = np.argsort(-per)
        return [(self.namnlista[i], float(per[i])) for i in ordn if per[i] > -2 and not (utan and self.namnlista[i] in utan)]


def dom(lista, facit, troskel=TROSKEL):
    """Svaret för en fråga: namn, poäng, marginal, rätt, säker."""
    if not lista:
        return {'namn': None, 'poang': 0.0, 'marginal': 0.0, 'ratt': False, 'saker': False, 'nast': None}
    a = lista[0]; b = lista[1] if len(lista) > 1 else (None, 0.0)
    m = a[1] - b[1]
    return {'namn': a[0], 'poang': round(a[1], 4), 'marginal': round(m, 4), 'ratt': a[0] == facit, 'saker': m > troskel, 'nast': b[0]}


# ── remsor ur hörn ──────────────────────────────────────────────────────────
def remsa_horn(horn, andel):
    """Remsans fyra hörn: överkanten (0 → 1) och ANDEL av vägen ner (som dev/detektor/remsa.py)."""
    h = np.asarray(horn, np.float32)
    return np.array([h[0], h[1], h[1] + andel * (h[2] - h[1]), h[0] + andel * (h[3] - h[0])], np.float32)


def varpa(img, fyrhorning, w, h):
    """Fyrhörningen (medsols från övre vänstra) → rektangel w × h."""
    mal = np.array([[0, 0], [w, 0], [w, h], [0, h]], np.float32)
    M = cv2.getPerspectiveTransform(np.asarray(fyrhorning, np.float32), mal)
    return cv2.warpPerspective(img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)


def remsa_ur_bild(img, horn_px, andel, bredd=REF_BREDD):
    """Remsan ur kortets hörn (bildpunkter), varpad till bredd × bredd·(680/488)·andel — samma
    form som referensremsan, så att trycket till kvadrat blir detsamma."""
    q = remsa_horn(horn_px, andel)
    h = max(1, int(round(bredd * (REF_HOJD / REF_BREDD) * andel)))
    return varpa(img, q, bredd, h)


def kortbredd_px(horn_px):
    """Kortets bredd i källan (överkantens längd) — måttet på hur mycket bild remsan bär."""
    h = np.asarray(horn_px, np.float32)
    return float(np.linalg.norm(h[1] - h[0]))


def remsa_hojd_px(horn_px, andel):
    """Remsans höjd i källan, i bildpunkter: ANDEL av kortets vänsterkant."""
    h = np.asarray(horn_px, np.float32)
    return float(np.linalg.norm(h[3] - h[0]) * andel)


def skala_bild(img, bredd):
    """Hela bilden nerskalad till en viss bredd (analysbilden), som webbläsarens canvas."""
    if img.shape[1] <= bredd:
        return img, 1.0
    s = bredd / img.shape[1]
    return skala_webb(img, bredd, int(round(img.shape[0] * s))), s


def median(xs):
    return float(np.median(xs)) if len(xs) else float('nan')

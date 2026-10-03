"""Får remsorna som tjockleksfiltret 0,7 släppte fram rätt NAMN — med 0 säkra fel?

remsfall.py (dev/detektor/tran) visade att tappade kort i högar förlorade remsan i tjockleksfiltret och
att 0,7 tar tillbaka dem (13b land i hög 32 → 42/42, MES-246 219 → 248/257). Men golden-namnen rörde sig
inte. Här läses varje parad remsa SOM APPEN LÄSER DEN (Kamera.lasRemsa + kamLasRemsa) och delas i de som
fanns redan vid 0,5 och de som är NYA vid 0,7:

  utsnitt  den parade remslådan + 4 % marginal, ur bilden i appens upplösning (källan nerskalad till 1920
           på långsidan, som telefonens 1080p — och i källans upplösning som jämförelse), vriden som
           lasRemsa: stående remsa ±90 efter vilken kant av kortlådan den sitter vid, liggande 180 om den
           sitter i lådans nedre halva
  dom      bildmodellen mot remsleken (översta 14 % av referenserna, skarp + sudd, 0/180): säker när hela
           remsan har marginal > 0,20, eller titeldelen (vänstra 55 %) har samma namn överst med marginal
           > 0,20 och hela remsan ≥ 0,05 (T.remsaTroskel, T.remsaTitelTroskel, T.remsaVittne). Basland slås
           ihop per typ som i appen (ett namn per typ i referenserna).

    ~/.mesa/detektor-venv/bin/python dev/remsa/remsnamn.py   (läser dev/detektor/tran/resultat/remsfall-tjock0.5.json och -0.7.json)
"""
import argparse, json, os, sys
from collections import defaultdict
import cv2
import numpy as np

HAR = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(os.path.dirname(HAR))
sys.path.insert(0, HAR)
from lib import Bildmodell, Referenser, las_referensbilder, ref_strip, kvadrat  # noqa: E402

RES = os.path.join(ROT, 'dev', 'detektor', 'tran', 'resultat')
HEL, TITEL, VITTNE, VANSTER, MARG = 0.20, 0.20, 0.05, 0.55, 0.04
APP_LANG = 1920


def skar(img, lada, remsa):
    """Kamera.lasRemsa i andelar: remslådan + marginal, vriden efter var i kortlådan den sitter."""
    H, W = img.shape[:2]
    x0, y0, x1, y1 = remsa
    w, h = x1 - x0, y1 - y0
    a = [max(0, int((x0 - w * MARG) * W)), max(0, int((y0 - h * MARG) * H)),
         min(W, int(np.ceil((x1 + w * MARG) * W))), min(H, int(np.ceil((y1 + h * MARG) * H)))]
    if a[2] - a[0] < 4 or a[3] - a[1] < 4:
        return None
    s = img[a[1]:a[3], a[0]:a[2]]
    bx0, by0, bx1, by1 = lada
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    if h * H > w * W:   # stående remsa (tappat kort)
        rot = 90 if (mx - bx0) < (bx1 - mx) else -90
    else:
        rot = 180 if (my - by0) > (by1 - my) else 0
    if rot == 90: s = cv2.rotate(s, cv2.ROTATE_90_CLOCKWISE)
    elif rot == -90: s = cv2.rotate(s, cv2.ROTATE_90_COUNTERCLOCKWISE)
    elif rot == 180: s = cv2.rotate(s, cv2.ROTATE_180)
    return s


KVOT_REMSA = 0.14 * 88 / 63   # facits remsa: tjocklek / längd (14 % av 88 mm mot 63 mm)
KVOT_DET = 0.30               # detektorns remsa är tjockare (0,25–0,37 i golden, detektor.js steg 0)


def vinkel_ur_lada(w, h, r=KVOT_DET):
    """Remsans vinkel mot vågrätt (0–90°) ur den raka lådans form: w = L(cos + r sin), h = L(sin + r cos)."""
    q = h / max(w, 1e-6)
    if q <= r: return 0.0
    if q >= 1 / r: return 90.0
    lo, hi = 0.0, 90.0
    for _ in range(40):
        m = (lo + hi) / 2; t = np.radians(m)
        if (np.sin(t) + r * np.cos(t)) / (np.cos(t) + r * np.sin(t)) < q: lo = m
        else: hi = m
    return (lo + hi) / 2


def rata(img, lada, remsa):
    """Remsan UPPRÄTAD: ett snett tappat kort (60–70°) ger en rak låda runt en sned remsa, och lasRemsa
    skär lådan som den är. Vinkelns STORLEK tas ur lådans form (vinkel_ur_lada) — den beror inte på bilden;
    bilden avgör bara LUTNINGEN (stigande eller fallande): strukturtensorn över utsnittet ger de dominerande
    kanternas riktning (kortets ram, titelrutans linjer), och den av de två kandidaterna som ligger närmast
    väljs. Utsnittet vrids så att remsan ligger vågrätt och en remsa med detektorns proportioner skärs runt
    mitten. Vänd 0/180 avgör referenserna, som för appens remsor."""
    H, W = img.shape[:2]
    x0, y0, x1, y1 = remsa
    w, h = (x1 - x0) * W, (y1 - y0) * H
    cx, cy = (x0 + x1) / 2 * W, (y0 + y1) / 2 * H
    d = int(np.ceil(np.hypot(w, h) / 2 * 1.1))
    a0, b0 = max(0, int(cx - d)), max(0, int(cy - d))
    s = img[b0:min(H, int(cy + d)), a0:min(W, int(cx + d))]
    if s.size == 0 or min(s.shape[:2]) < 8:
        return None
    th = vinkel_ur_lada(w, h)
    t = np.radians(th)
    c, sn = np.cos(t), np.sin(t)
    L = w / (c + KVOT_DET * sn) if c >= sn else h / (sn + KVOT_DET * c)
    lw, lt = L * (1 + 2 * MARG), L * KVOT_DET * (1 + 2 * MARG)
    px, py = cx - a0, cy - b0

    def vrid(kant):
        M = cv2.getRotationMatrix2D((px, py), kant, 1.0)
        return cv2.warpAffine(s, M, (s.shape[1], s.shape[0]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

    def vagrathet(v):
        # andelen kantenergi i lodrät gradient (= vågräta linjer) i den skurna remsan — ju mer, desto rakare ligger den
        u = v[max(0, int(py - lt / 2)):int(py + lt / 2), max(0, int(px - lw / 2)):int(px + lw / 2)]
        if min(u.shape[:2]) < 4: return -1
        g = cv2.cvtColor(u, cv2.COLOR_BGR2GRAY).astype(np.float32)
        gx, gy = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
        return float((gy * gy).sum()) / max(1e-6, float((gx * gx).sum() + (gy * gy).sum()))

    # lutningen (stigande/fallande) ur bilden: båda kandidaterna rätas upp, och den där remsans linjer blir
    # mest vågräta väljs — ett val ur kanterna, inte ur namnmodellen, så det kan inte göra ett fel namn säkrare
    kand = [th, 180 - th] if 0 < th < 90 else [th]
    v = max((vrid(k) for k in kand), key=vagrathet)
    ut = v[max(0, int(py - lt / 2)):int(py + lt / 2), max(0, int(px - lw / 2)):int(px + lw / 2)]
    return ut if min(ut.shape[:2]) >= 4 else None


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--fore', default=os.path.join(RES, 'remsfall-tjock0.5.json'))
    p.add_argument('--efter', default=os.path.join(RES, 'remsfall-tjock0.7.json'))
    p.add_argument('--tradar', type=int, default=4)
    p.add_argument('--ut', default=os.path.join(HAR, 'resultat', 'remsnamn.json'))
    a = p.parse_args()
    fore = {(r['bild'], r['id'], r['namn']): r for r in json.load(open(a.fore))}
    efter = [r for r in json.load(open(a.efter)) if r['remsa'] and r['namn'] and r['kalla'] != 'person1']   # person1:s lägen har inga namn
    m = Bildmodell(tradar=a.tradar)
    refs = Referenser(m, [(n, i, ref_strip(img, 0.14)) for n, i, img in las_referensbilder()], rotar=(0, 180))

    def dom(s):
        sv = s[:, :max(4, int(round(s.shape[1] * VANSTER)))]
        q = m.kor([kvadrat(cv2.cvtColor(s, cv2.COLOR_BGR2RGB)), kvadrat(cv2.cvtColor(sv, cv2.COLOR_BGR2RGB))])
        h = refs.rangordna(q[0])[:2]; t = refs.rangordna(q[1])[:2]
        hm, tm = h[0][1] - h[1][1], t[0][1] - t[1][1]
        saker = hm > HEL or (t[0][0] == h[0][0] and tm > TITEL and hm >= VITTNE)
        return h[0][0], round(float(hm), 3), t[0][0], round(float(tm), 3), bool(saker)

    bilder = {}
    rader = []
    for r in efter:
        f = fore.get((r['bild'], r['id'], r['namn']))
        ny = not (f and f['remsa'])
        if r['fil'] not in bilder:
            src = cv2.imread(r['fil'])
            s = APP_LANG / max(src.shape[:2])
            bilder = {r['fil']: {'kalla': src, 'app': cv2.resize(src, (round(src.shape[1] * s), round(src.shape[0] * s)), interpolation=cv2.INTER_AREA) if s < 1 else src}}
        for upp, img in bilder[r['fil']].items():
          for satt, fn in (('dagens', skar), ('rätad', rata)):
            st = fn(img, r['lada'], r['remsa'])
            if st is None:
                continue
            namn, hm, tnamn, tm, saker = dom(st)
            rader.append({'kalla': r['kalla'], 'bild': r['bild'], 'facit': r['namn'], 'grupp': r['grupp'], 'land': r['land'],
                          'ny': ny, 'upp': upp, 'satt': satt, 'h_px': int(min(st.shape[:2])), 'namn': namn, 'hel': hm, 'titel': tnamn, 'tm': tm,
                          'saker': saker, 'ratt': namn == r['namn']})
    os.makedirs(os.path.dirname(a.ut), exist_ok=True)
    json.dump(rader, open(a.ut, 'w'), ensure_ascii=False)
    print(f"{'källa':7s} {'upplösning':10s} {'skärning':8s} {'remsor':14s} {'n':>4s} {'rätt överst':>11s} {'säkra rätt':>11s} {'säkra FEL':>10s}  remsans höjd (median px)")
    for kalla in ('13b', 'mes246', 'golden'):
        for upp in ('app', 'kalla'):
          for satt in ('dagens', 'rätad'):
            for etikett, f in (('fanns vid 0,5', lambda x: not x['ny']), ('NYA vid 0,7', lambda x: x['ny']), ('  varav land i hög', lambda x: x['ny'] and x['land'] and x['grupp'].startswith('hög'))):
                rr = [x for x in rader if x['kalla'] == kalla and x['upp'] == upp and x['satt'] == satt and f(x)]
                if not rr:
                    continue
                print(f"{kalla:7s} {upp:10s} {satt:8s} {etikett:18s} {len(rr):4d} {sum(x['ratt'] for x in rr):11d} {sum(x['saker'] and x['ratt'] for x in rr):11d} {sum(x['saker'] and not x['ratt'] for x in rr):10d}  {int(np.median([x['h_px'] for x in rr]))}")
    print('\nsäkra fel:')
    for x in rader:
        if x['saker'] and not x['ratt']:
            print(f"  {x['kalla']} {x['bild']} {x['upp']} {x['satt']}: {x['facit']} → {x['namn']} hel {x['hel']} titel {x['titel']} {x['tm']} ({'ny' if x['ny'] else 'fanns'}, {x['grupp']}, {x['h_px']} px)")
    print(f'\nskrivet: {a.ut}')


if __name__ == '__main__':
    main()

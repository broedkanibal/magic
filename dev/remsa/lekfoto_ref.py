"""Lekfotot som referens: spelarens EGNA kort, i egna hylsor, som referenser för namnremsan.

Bänken (remsexp.py) visade att Scryfall-remsleken nästan inte läser Jespers kort i fickor/hylsor (13b 0/52
täckta säkra), och att kortets egen tidigare remsa gör det (remsexp_larda.py) — men bara för kort som
redan setts helt. Ett kort som syns första gången i en hög har ingen historik. Lekfotot har: spelaren
lägger ut leken i kolumner och fotograferar den innan partiet (MES-289) — korten i solfjäder, så att
namnremsan syns på varje kort, precis som i en hög.

Steg:
  1. remsorna i varje lekfoto (dev/material/foton/2026-09-26-lekfoto, prov) med detektorn (som appen,
     stående foto vridet till liggande), skurna ur fotot i full upplösning och vridna vågrätt
  2. namnen: remsorna grupperas i kolumner (läget tvärs solfjädern), och kolumnerna paras med facits
     grupper ('hela' i fotot) och remsorna med gruppens namn genom ungersk tilldelning på Scryfall-
     remslekens likhet — inom en grupp på 4–6 namn är det lätt även när den fria läsningen inte är det
  3. referenserna: Scryfall-remsleken + lekfotots remsor (hela + titeldelen), och 13b/MES-246:s
     remsor (remsexp.npz, appens skärning, rå) läses mot dem — samma dom som appen: hel och titel
     samma namn, min(marginal) över tröskeln

    ~/.mesa/detektor-venv/bin/python dev/remsa/lekfoto_ref.py
"""
import json, os, sys
from collections import defaultdict
import cv2
import numpy as np

HAR = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(os.path.dirname(HAR))
sys.path.insert(0, HAR)
import detektor_remsor as dr  # noqa: E402
from lib import Bildmodell, Referenser, las_referensbilder, ref_strip, kvadrat  # noqa: E402
from remsexp import NPZ, norm  # noqa: E402
from delning import klassa  # noqa: E402

def linear_sum_assignment(C):
    """Girig tilldelning (scipy saknas i miljön): lägsta kostnad först, en rad och en kolumn var. Grupperna är
    små (4–7 kolumner, 4–6 namn), och det som mäts är lekfotots värde som referens, inte tilldelningen."""
    C = np.asarray(C, float); par = []
    rad, kol = set(), set()
    for idx in np.argsort(C, axis=None):
        a, b = np.unravel_index(idx, C.shape)
        if a in rad or b in kol:
            continue
        par.append((a, b)); rad.add(a); kol.add(b)
        if len(rad) == C.shape[0] or len(kol) == C.shape[1]:
            break
    par.sort()
    return [p[0] for p in par], [p[1] for p in par]


FOTON = os.path.join(ROT, 'dev', 'material', 'foton', '2026-09-26-lekfoto')
VANSTER = 0.55


def remsor_i_foto(det, img):
    """Detektorns remsor i fotot, i källans bildpunkter (stående foto vrids till liggande som parprov.py)."""
    H, W = img.shape[:2]
    staende = H > W
    im = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE) if staende else img
    d = det.remsor(im)   # andelar av im
    Hi, Wi = im.shape[:2]
    ut = []
    for x0, y0, x1, y1, sc in d:
        if staende:   # tillbaka till det stående fotot: (x, y) i im ↔ (W - 1 - y', x') …
            X0, Y0, X1, Y1 = (1 - y1) * W, x0 * H, (1 - y0) * W, x1 * H
        else:
            X0, Y0, X1, Y1 = x0 * W, y0 * H, x1 * W, y1 * H
        ut.append((X0, Y0, X1, Y1, sc))
    return ut


def vagratt(s):
    return cv2.rotate(s, cv2.ROTATE_90_CLOCKWISE) if s.shape[0] > s.shape[1] else s


def main():
    m = Bildmodell(tradar=4)
    det = dr.Detektor()
    facit = json.load(open(os.path.join(FOTON, 'facit.json')))
    bilder = las_referensbilder()
    d = np.load(NPZ, allow_pickle=False)
    jlek = set(json.loads(str(d['jesper_lek'])))
    R = d['r|ra']; rn = [str(x) for x in d['r|ra|namn']]
    k = np.array([n in jlek for n in rn]); R, rn = R[k], [n for n, kk in zip(rn, k) if kk]
    medel = R.mean(0); Rn = norm(R - medel)
    namnlista = sorted(set(rn))
    ni = {n: i for i, n in enumerate(namnlista)}

    def per_namn(q):
        s = Rn @ norm(q - medel)
        p = np.full(len(namnlista), -9.0)
        for n, v in zip(rn, s):
            p[ni[n]] = max(p[ni[n]], v)
        return p

    lek_hel, lek_tit, lek_namn, lek_foto = [], [], [], []
    for fil, info in sorted(facit['foton'].items()):
        bild = os.path.join(FOTON, fil)
        if klassa(bild)[0] != 'prov' or not info.get('hela'):
            continue
        img = cv2.imread(bild)
        rs = remsor_i_foto(det, img)
        if not rs:
            continue
        kv, boxar = [], []
        for X0, Y0, X1, Y1, sc in rs:
            s = img[max(0, int(Y0)):int(np.ceil(Y1)), max(0, int(X0)):int(np.ceil(X1))]
            if min(s.shape[:2]) < 6:
                continue
            s = vagratt(s)
            kv.append(kvadrat(cv2.cvtColor(s, cv2.COLOR_BGR2RGB)))
            kv.append(kvadrat(cv2.cvtColor(s[:, :max(4, int(round(s.shape[1] * VANSTER)))], cv2.COLOR_BGR2RGB)))
            boxar.append((X0, Y0, X1, Y1))
        v = m.kor(kv); hel, tit = v[0::2], v[1::2]
        # kolumnerna: remsorna i en solfjäder ligger på en rad TVÄRS solfjädern; solfjädern går längs remsornas
        # tjocka led (stående remsor → korten förskjutna i x → kolumnen är ett y-band)
        stående = np.mean([(b[3] - b[1]) > (b[2] - b[0]) for b in boxar]) > 0.5
        tvars = np.array([((b[1] + b[3]) / 2 if stående else (b[0] + b[2]) / 2) for b in boxar])
        ordning = np.argsort(tvars)
        L = np.median([max(b[2] - b[0], b[3] - b[1]) for b in boxar])
        kluster, akt = [], [ordning[0]]
        for a, b in zip(ordning[:-1], ordning[1:]):
            if tvars[b] - tvars[a] > 0.5 * L:
                kluster.append(akt); akt = []
            akt.append(b)
        kluster.append(akt)
        grupper = info['hela'] + info.get('kant', [])
        # kolumn ↔ grupp: summan av bästa likhet mellan kolumnens remsor och gruppens namn
        P = np.stack([per_namn(h) for h in hel])
        kost = np.zeros((len(kluster), len(grupper)))
        for a, kl in enumerate(kluster):
            for b, g in enumerate(grupper):
                namn = facit['grupper'][g]
                kost[a, b] = -sum(max(P[i, ni[n]] for n in set(namn)) for i in kl)
        ka, gb = linear_sum_assignment(kost)
        n_tagna = 0
        for a, b in zip(ka, gb):
            g = grupper[b]
            if g not in info['hela']:
                continue            # kantgrupper: kapade namn — räknas inte
            namn = facit['grupper'][g]
            kl = kluster[a]
            C = np.array([[-P[i, ni[n]] for n in namn] for i in kl])
            ri, ci = linear_sum_assignment(C)
            for i, j in zip(ri, ci):
                lek_hel.append(hel[kl[i]]); lek_tit.append(tit[kl[i]]); lek_namn.append(namn[j]); lek_foto.append(fil)
                n_tagna += 1
        print(f'{fil}: {len(rs)} remsor, {len(kluster)} kolumner (facit {len(info["hela"])} hela + {len(info.get("kant", []))} kant), {n_tagna} namngivna', flush=True)

    LH, LT = np.stack(lek_hel), np.stack(lek_tit)
    print(f'\nlekfotots referenser: {len(lek_namn)} remsor, {len(set(lek_namn))} namn')

    # läs 13b och MES-246 (appens skärning, rå) mot Scryfall + lekfotot
    meta = json.loads(str(d['meta']))
    QH = dict(zip(d['q|app|ra|hel|idx'].tolist(), d['q|app|ra|hel']))
    QT = dict(zip(d['q|app|ra|titel|idx'].tolist(), d['q|app|ra|titel']))
    rf = [r for r in json.load(open(os.path.join(ROT, 'dev/detektor/tran/resultat/remsfall-tjock0.7.json')))
          if r['remsa'] and r['namn'] and r['kalla'] in ('mes246', '13b', 'golden')]
    for i, r in enumerate(rf):
        meta[i]['synlig'] = r['synlig']

    def las(q, Lv, extra=True):
        p = per_namn(q)
        if extra:
            s = norm(Lv - medel) @ norm(q - medel)
            for n, v in zip(lek_namn, s):
                p[ni[n]] = max(p[ni[n]], v)
        o = np.argsort(-p)
        return namnlista[o[0]], p[o[0]] - p[o[1]]

    for etikett, extra in (('dagens (Scryfall)', False), ('Scryfall + lekfotot', True)):
        print(f'\n== {etikett}')
        for kalla in ('golden', '13b', 'mes246'):
            for grupp, f in (('alla', lambda x: True), ('täckta', lambda x: x['grupp'].startswith('hög') or x['synlig'] < 0.999)):
                rr = []
                for i in sorted(set(QH) & set(QT)):
                    mi = meta[i]
                    if mi['kalla'] != kalla or not f(mi):
                        continue
                    hn, hm = las(QH[i], LH, extra); tn, tm = las(QT[i], LT, extra)
                    rr.append((hn == mi['facit'], min(hm, tm) if hn == tn else 0.0))
                if not rr:
                    continue
                rad = ' · '.join(f"{t:.2f}: {sum(a and m > t for a, m in rr)} rätt/{sum((not a) and m > t for a, m in rr)} fel" for t in (0.05, 0.10, 0.15, 0.20))
                fel = sorted([m for a, m in rr if not a], reverse=True)[:3]
                print(f'  {kalla:7s} {grupp:7s} {len(rr):4d}: {sum(a for a, _ in rr)} rätt överst · säkra vid {rad} · största fel {[round(x, 3) for x in fel]}')


if __name__ == '__main__':
    main()

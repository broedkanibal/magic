#!/usr/bin/env python3
"""MES-328: högbänken (MES-250, 68 fall) mätt med remsor — jämförelsen mot dagens högar 0/13 och par 2/13.

Högbänken har ingen hörnritning, bara appens låda runt högen och vad som väntas i den
(dev/detektor/hogbank-facit.json: `hog` = n land av samma namn, `par` = topp + under, `ensam` = ett
kort, `hand`). Bilderna är passet 2026-09-22 (skärminspelning av kameravyn, 1080 × 610, kort 165 px
breda: titelraden ~10 px) och golden 01–06/14–16 (1080 px breda). Allt prov.

Så här mäts det, per fall:
  1. den tränade detektorn (MES-329) körs på hela bilden (960 px bred); remsorna (`namnrad` ≥ 0,68,
     NMS 0,6) vars mitt ligger i fallets låda är högens remsor
  2. varje remsa får ett namn av bildmodellen (remsa ur Scryfall vid --andel som referens; marginal
     > 0,11 = säker) och skrivs ut för OCR (ocr.cjs, manifest i --ut)
  3. domen: `hog` är hel när minst n remsor säger högens namn (säkra); `par` när både topp och
     under finns bland de säkra namnen; `ensam` när namnet finns. Ett SÄKERT namn som inte hör till
     fallet är ett fel namn — det som aldrig får hända.

    ~/.mesa/detektor-venv/bin/python dev/remsa/hogbank_remsor.py [--andel 0.14] [--ut <mapp>]
    node dev/remsa/ocr.cjs <mapp>                         # sedan:
    ~/.mesa/detektor-venv/bin/python dev/remsa/hogbank_remsor.py --rapport <mapp>/ocr.json
"""
import argparse, json, os, sys
import cv2

HAR = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(os.path.dirname(HAR))
DET = os.path.join(ROT, 'dev', 'detektor')
sys.path.insert(0, DET); sys.path.insert(0, os.path.join(DET, 'tran')); sys.path.insert(0, HAR)
from facit import las_hogbank  # noqa: E402
from lib import Bildmodell, Referenser, las_referensbilder, ref_strip, kvadrat, dom, median, ROT as _R  # noqa: E402
from detektor_remsor import Detektor, klipp_lada, band, BAND  # noqa: E402
import remsor  # noqa: E402

UT = os.path.join(ROT, 'dev', 'material', 'arbete', '2026-10-02-mes-328-hogbank')
FACIT = os.path.join(DET, 'hogbank-facit.json')


def fall_facit():
    f = json.load(open(FACIT, encoding='utf-8'))
    per = {x['id']: x for x in f['fall']}
    ut = []
    for h in las_hogbank():
        x = per[h['id']]
        v = x.get('vantat') or {}
        namn = {n for n in [x.get('namn'), v.get('topp'), v.get('under'), v.get('over')] if n}
        ut.append(dict(h, namn=x.get('namn'), vantat=v, tillatna=namn))
    return ut


def inne(b, lada):
    cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
    return lada[0] <= cx <= lada[2] and lada[1] <= cy <= lada[3]


def mata(a):
    det = Detektor(); m = Bildmodell()
    refs = Referenser(m, [(n, i, ref_strip(img, a.andel)) for n, i, img in las_referensbilder()], rotar=(0, 180))
    fall = fall_facit()
    for h in fall:
        remsor.krav_prov(h['bild'])
    bilder = {}
    for h in fall:
        if h['bild'] not in bilder:
            img = cv2.imread(h['bild'])
            ana, _ = remsor.las(h['bild'], '960')
            bilder[h['bild']] = (img, ana, det.remsor(ana))
    man, rader = [], []
    for h in fall:
        img, ana, dets = bilder[h['bild']]
        mina = [d for d in dets if inne(d, h['lada'])]
        r = {'id': h['id'], 'typ': h['typ'], 'namn': h['namn'], 'vantat': h['vantat'], 'tillatna': sorted(h['tillatna']), 'n': h['n'], 'remsor': []}
        for di, d in enumerate(mina):
            strip = klipp_lada(img, d[:4])
            if strip is None:
                continue
            # högbänken har inga hörn: en remsa på högkant kan läsas åt båda hållen (bildmodellen har 0° och 180° i referenserna;
            # OCR:n får banden ur båda vridningarna, sex steg, som appen skulle pröva)
            lagen = [strip] if strip.shape[1] >= strip.shape[0] else [cv2.rotate(strip, cv2.ROTATE_90_CLOCKWISE), cv2.rotate(strip, cv2.ROTATE_90_COUNTERCLOCKWISE)]
            q = m.kor([kvadrat(cv2.cvtColor(lagen[0], cv2.COLOR_BGR2RGB))])[0]
            e = dom(refs.rangordna(q), h['namn'] or '')
            mapp = os.path.join(a.ut, 'orig', 'detektor'); os.makedirs(mapp, exist_ok=True)
            steg = 0
            for s in lagen:
                for _, bild in band(s):
                    fn = f"{h['id']}-{di:02d}-{steg}.png"
                    cv2.imwrite(os.path.join(mapp, fn), bild)
                    man.append({'fil': os.path.relpath(os.path.join(mapp, fn), a.ut), 'kalla': 'hogbank', 'bild': h['id'], 'nr': di, 'steg': steg, 'facit': h['namn'] or '',
                                'tillatna': sorted(h['tillatna']), 'typ': h['typ'], 'res': 'orig', 'utsnitt': 'detektor', 'kall_h_px': lagen[0].shape[0], 'kall_w_px': lagen[0].shape[1],
                                'hog': h['typ'] == 'hog', 'poang_det': round(d[4], 3)})
                    steg += 1
            r['remsor'].append({'nr': di, 'lada': [round(v, 4) for v in d[:4]], 'poang_det': round(d[4], 3), 'h_px': strip.shape[0],
                                'bild': {'namn': e['namn'], 'marginal': e['marginal'], 'saker': e['saker']}})
        rader.append(r)
    os.makedirs(a.ut, exist_ok=True)
    json.dump({'lek': sorted(remsor.lek()), 'remsor': man}, open(os.path.join(a.ut, 'manifest.json'), 'w'), ensure_ascii=False, indent=0)
    json.dump({'andel': a.andel, 'ms_detektor': round(median(det.ms), 1), 'ms_modell': round(median(m.ms), 1), 'fall': rader},
              open(os.path.join(HAR, 'resultat', 'hogbank-remsor.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'{len(rader)} fall, {len(man)} remsor i lådorna; detektorn {median(det.ms):.0f} ms/bild, bildmodellen {median(m.ms):.0f} ms/remsa')
    print(f'{len(man)} remsbilder → {os.path.relpath(a.ut, ROT)}/manifest.json — kör node dev/remsa/ocr.cjs på mappen, sedan --rapport')
    rapport(rader, None)


def dom_fall(r, namn_av):
    """namn_av(remsa) → säkert namn eller None. Svar: (hel, fel_namn, funna)."""
    funna = [namn_av(s) for s in r['remsor']]
    funna = [n for n in funna if n]
    # ett fall utan väntat namn (t.ex. g03-klump-heath-plains: namn null, inget vantat) kan inte döma ett namn som fel
    fel = [n for n in funna if n not in r['tillatna']] if r['tillatna'] else []
    ok = [n for n in funna if n in r['tillatna']]
    v = r['vantat']
    if r['typ'] == 'hog':
        hel = sum(1 for n in ok if n == r['namn']) >= (r['n'] or 1)
    elif r['typ'] == 'par':
        hel = all(any(n == x for n in ok) for x in [v.get('topp'), v.get('under')] if x)
    else:
        hel = any(n == r['namn'] for n in ok) if r['namn'] else False
    return hel, len(fel), ok


def rapport(rader, ocr):
    """Tabellen: per typ, hela fall och fel namn — bildmodellen, OCR och båda (ett namn räcker)."""
    o = {}
    if ocr:
        for x in json.load(open(ocr, encoding='utf-8'))['remsor']:
            o[(x['bild'], x['nr'])] = x
    satt = {'bildmodellen (säker)': lambda r, s: s['bild']['namn'] if s['bild']['saker'] else None}
    if ocr:
        satt['OCR (≥ 0,6)'] = lambda r, s: o.get((r['id'], s['nr']), {}).get('namn')
        # appens dom (index.html, sakertNamn): poäng ≥ 0,6 OCH marginal ≥ 0,2 till näst bästa namn — bänkens 0,6 ensamt är mildare
        satt['OCR med appens dom (≥ 0,6 och marginal ≥ 0,2)'] = lambda r, s: (lambda x: x.get('namn') if x.get('marginal', 0) >= 0.2 else None)(o.get((r['id'], s['nr']), {}))
        satt['OCR eller bildmodellen'] = lambda r, s: o.get((r['id'], s['nr']), {}).get('namn') or (s['bild']['namn'] if s['bild']['saker'] else None)
    print('\n| Sätt | Högar hela | Par hela | Ensamma | Fel namn (säkra, fel hög) | Remsor i lådorna | Fall utan remsa |')
    print('|---|---|---|---|---|---|---|')
    ut = {}
    for namn, f in satt.items():
        per = {}
        fel = 0
        for r in rader:
            hel, nf, _ = dom_fall(r, lambda s: f(r, s))
            t = r['typ']; per.setdefault(t, [0, 0]); per[t][1] += 1; per[t][0] += hel; fel += nf
        tot = sum(len(r['remsor']) for r in rader); utan = sum(1 for r in rader if not r['remsor'])
        g = lambda t: f"{per.get(t, [0, 0])[0]}/{per.get(t, [0, 0])[1]}"
        print(f"| {namn} | {g('hog')} | {g('par')} | {g('ensam')} | {fel} | {tot} | {utan} |")
        ut[namn] = {'per_typ': per, 'fel_namn': fel}
    print('| MES-250, dagens kedja (namnläsaren på hela beskärningen) | 0/13 | 2/13 | 13/39 | – | – | – |')
    return ut


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--andel', type=float, default=0.14)
    p.add_argument('--ut', default=UT)
    p.add_argument('--rapport', default=None, help='ocr.json från ocr.cjs → tabellen med OCR')
    a = p.parse_args()
    if a.rapport:
        j = json.load(open(os.path.join(HAR, 'resultat', 'hogbank-remsor.json'), encoding='utf-8'))
        j['rapport'] = rapport(j['fall'], a.rapport)
        json.dump(j, open(os.path.join(HAR, 'resultat', 'hogbank-remsor.json'), 'w'), ensure_ascii=False, indent=1)
        return
    mata(a)


if __name__ == '__main__':
    main()

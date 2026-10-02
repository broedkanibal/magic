#!/usr/bin/env python3
"""MES-328 steg 2 — tabellerna: namnläsaren (ocr.cjs) per källa × upplösning × utsnitt, och sätt 2 (OCR)
sida vid sida med sätt 3 (bildmodellen) på SAMMA remsor.

    ~/.mesa/detektor-venv/bin/python dev/remsa/ocr_rapport.py --ocr <mapp>/ocr.json [--embed dev/remsa/resultat/nollprov.json --andel 0.16]
                                                               [--embed-det dev/remsa/resultat/detektorremsor-embed.json] [--ark <mapp>]

Måtten för OCR: rätt = godkänt namn (poäng ≥ 0,6, som appen) och det är facit; fel = godkänt men ett
annat namn (det är ett säkert fel på bordet); inget = inget namn nådde 0,6. För bildmodellen: rätt i
topp-1, säkra vid marginal > 0,11. Sida vid sida: nyckeln är (källa, bild, kortets nummer) — samma
kort i samma ruta, bildmodellen på remsan ur hörnen och OCR på titelraden ur samma hörn.
--ark skriver en kontaktsida över remsorna där BÅDA misslyckas.
"""
import argparse, json, os, sys
from collections import Counter
import cv2
import numpy as np

HAR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HAR)
from lib import median, ROT  # noqa: E402


def ocr_tabell(rader):
    ut = []
    for nyckel in sorted({(r['kalla'], r['res'], r['utsnitt']) for r in rader}):
        g = [r for r in rader if (r['kalla'], r['res'], r['utsnitt']) == nyckel]
        hog = [r for r in g if r.get('hog')]
        ut.append({'kalla': nyckel[0], 'res': nyckel[1], 'utsnitt': nyckel[2], 'remsor': len(g), 'ratt': sum(r['ratt'] for r in g), 'fel': sum(r['fel'] for r in g),
                   'inget': sum(1 for r in g if not r['ratt'] and not r['fel']), 'topp1_ratt': sum(1 for r in g if r.get('namn_rå') == r['facit']),
                   'hogkort': len(hog), 'hogkort_ratt': sum(r['ratt'] for r in hog), 'hogkort_fel': sum(r['fel'] for r in hog),
                   'ms_median': round(median([r['ms'] for r in g])), 'kall_h_px_median': round(median([r['kall_h_px'] for r in g]), 1),
                   'poang_ratt_median': round(median([r['poang'] for r in g if r['ratt']]), 2) if any(r['ratt'] for r in g) else None})
    return ut


def per_bild(rader):
    """Rätt/remsor per källa × upplösning × utsnitt × bild (golden-fallen var för sig) — så att RESULTAT.md:s
    rader per fall kommer ur filen, inte ur en avskrift (tabell.py)."""
    ut = {}
    for r in rader:
        k = '|'.join([r['kalla'], r['res'], r['utsnitt'], str(r['bild'])])
        d = ut.setdefault(k, {'remsor': 0, 'ratt': 0, 'fel': 0})
        d['remsor'] += 1; d['ratt'] += bool(r['ratt']); d['fel'] += bool(r['fel'])
    return {k: ut[k] for k in sorted(ut) if not k.startswith('mes246')}


def skriv_ocr(tab):
    print('| Källa | Upplösning | Utsnitt | Remsor | Rätt (≥ 0,6) | **Fel (≥ 0,6)** | Inget namn | Topp-1 rätt oavsett poäng | Högkort rätt | Högkort fel | Titelrad px i källan | ms/remsa |')
    print('|---|---|---|---|---|---|---|---|---|---|---|---|')
    for s in tab:
        print(f"| {s['kalla']} | {s['res']} | {s['utsnitt']} | {s['remsor']} | {s['ratt']} ({100 * s['ratt'] / max(1, s['remsor']):.0f} %) | **{s['fel']}** | {s['inget']} | {s['topp1_ratt']} | "
              f"{s['hogkort_ratt']}/{s['hogkort']} | {s['hogkort_fel']} | {s['kall_h_px_median']} | {s['ms_median']} |")


def nyckel(r):
    return (r['kalla'], str(r['bild']), int(r['nr']))


def embed_rader(fil, andel, res_map):
    """nollprov.json → {nyckel: rad} per res. Saknar raderna nr (äldre körning): numreras i ordning per bild."""
    j = json.load(open(fil, encoding='utf-8'))
    ut = {}
    for k, rader in j['rader'].items():
        a, kalla, res = k.split('|')
        if abs(float(a) - andel) > 1e-6 or kalla == 'riktiga':
            continue
        lopnr = Counter()
        for r in rader:
            if 'nr' not in r:
                r['nr'] = lopnr[(kalla, r['bild'])]; lopnr[(kalla, r['bild'])] += 1
            ut.setdefault(res_map.get(res, res), {})[nyckel(r)] = r
    return ut


def sida_vid_sida(ocr, emb, titel):
    """2 × 2 på samma remsor. OCR 'rätt' = godkänt och facit; bildmodellen 'rätt' = topp-1 (säkra för sig)."""
    par = [(o, emb[nyckel(o)]) for o in ocr if nyckel(o) in emb]
    if not par:
        return None
    n = len(par)
    bada = sum(o['ratt'] and e['ratt'] for o, e in par)
    bara_ocr = sum(o['ratt'] and not e['ratt'] for o, e in par)
    bara_emb = sum((not o['ratt']) and e['ratt'] for o, e in par)
    ingen = [(o, e) for o, e in par if not o['ratt'] and not e['ratt']]
    s = {'titel': titel, 'remsor': n, 'bada_ratt': bada, 'bara_ocr': bara_ocr, 'bara_bildmodell': bara_emb, 'ingen': len(ingen),
         'ocr_ratt': sum(o['ratt'] for o, _ in par), 'ocr_fel': sum(o['fel'] for o, _ in par),
         'bild_ratt': sum(e['ratt'] for _, e in par), 'bild_sakra_ratt': sum(e['ratt'] and e['saker'] for _, e in par), 'bild_sakra_fel': sum((not e['ratt']) and e['saker'] for _, e in par),
         'ocr_eller_bild_saker': sum(o['ratt'] or (e['ratt'] and e['saker']) for o, e in par),
         'ocr_fel_eller_bild_sakert_fel': sum(o['fel'] or ((not e['ratt']) and e['saker']) for o, e in par),
         'hogkort': sum(1 for o, _ in par if o.get('hog')), 'hogkort_ocr_ratt': sum(o['ratt'] for o, _ in par if o.get('hog')),
         'hogkort_bild_ratt': sum(e['ratt'] for o, e in par if o.get('hog')), 'hogkort_ingen': sum(1 for o, e in ingen if o.get('hog'))}
    return s, ingen


def skriv_sida(rader):
    print('| Remsor | Både rätt | Bara OCR | Bara bildmodellen | Ingen | OCR rätt / fel | Bildmodellen rätt / säkra rätt / säkra fel | OCR rätt ELLER bildmodellen säker | …fel | Högkort: OCR / bild / ingen |')
    print('|---|---|---|---|---|---|---|---|---|---|')
    for s in rader:
        print(f"| **{s['titel']}** {s['remsor']} | {s['bada_ratt']} | {s['bara_ocr']} | {s['bara_bildmodell']} | {s['ingen']} | {s['ocr_ratt']} / {s['ocr_fel']} | "
              f"{s['bild_ratt']} / {s['bild_sakra_ratt']} / {s['bild_sakra_fel']} | {s['ocr_eller_bild_saker']} | {s['ocr_fel_eller_bild_sakert_fel']} | "
              f"{s['hogkort_ocr_ratt']} / {s['hogkort_bild_ratt']} / {s['hogkort_ingen']} av {s['hogkort']} |")


def kontaktsida(par, mapp, fil, kol=4, bredd=360):
    """Remsor där båda misslyckas: bild, facit, vad OCR läste, vad bildmodellen sa."""
    celler = []
    for o, e in par:
        img = cv2.imread(os.path.join(mapp, o['fil']))
        if img is None:
            continue
        h = int(round(img.shape[0] * bredd / img.shape[1])); img = cv2.resize(img, (bredd, max(1, h)))
        yta = np.full((h + 46, bredd, 3), 255, np.uint8); yta[:h] = img
        cv2.putText(yta, f"{o['facit'][:26]} {o['kalla']} {o['bild']}", (2, h + 14), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 0, 0), 1)
        cv2.putText(yta, f"ocr: '{o['text'][:22]}' {o['poang']:.2f}", (2, h + 28), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 0, 200), 1)
        cv2.putText(yta, f"bild: {str(e['namn'])[:22]} m{e['marginal']:.3f}{' SAKER' if e['saker'] else ''}", (2, h + 42), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (200, 0, 0), 1)
        celler.append(yta)
    if not celler:
        return
    H = max(c.shape[0] for c in celler)
    rader = []
    for i in range(0, len(celler), kol):
        rad = [np.vstack([c, np.full((H - c.shape[0], bredd, 3), 255, np.uint8)]) for c in celler[i:i + kol]]
        while len(rad) < kol:
            rad.append(np.full((H, bredd, 3), 255, np.uint8))
        rader.append(np.hstack(rad))
    cv2.imwrite(fil, np.vstack(rader))
    print('kontaktsida', os.path.relpath(fil, ROT), f'({len(celler)} remsor)')


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--ocr', required=True)
    p.add_argument('--embed', default=None, help='nollprov.json (remsor ur hörnen)')
    p.add_argument('--andel', type=float, default=0.16)
    p.add_argument('--embed-det', default=None, help='detektorremsor-embed.json (remsor ur detektorn)')
    p.add_argument('--utsnitt', default='namnrad', help='vilket OCR-utsnitt som ställs mot bildmodellen')
    p.add_argument('--ark', default=None, help='mapp att skriva kontaktsidor i')
    a = p.parse_args()
    j = json.load(open(a.ocr, encoding='utf-8'))
    rader = j['remsor']
    mapp = os.path.dirname(os.path.abspath(a.ocr))
    print(f"Namnläsaren: {j['lasare']}, godkänt vid poäng ≥ {j['godkant']}\n")
    tab = ocr_tabell(rader)
    skriv_ocr(tab)
    ut = {'ocr': tab, 'sida_vid_sida': [], 'per_bild': per_bild(rader)}
    sidor = []
    if a.embed:
        emb = embed_rader(a.embed, a.andel, {'orig': 'orig', '1920': '1920', '960': '960'})
        for res in ('orig', '1920', '960'):
            if res not in emb:
                continue
            for kalla in ('golden', 'mes246'):
                o = [r for r in rader if r['res'] == res and r['utsnitt'] == a.utsnitt and r['kalla'] == kalla]
                svs = sida_vid_sida(o, emb[res], f'{kalla} {res} (hörn)')
                if svs:
                    sidor.append(svs[0])
                    if a.ark and svs[1]:
                        os.makedirs(a.ark, exist_ok=True)
                        kontaktsida(svs[1], mapp, os.path.join(a.ark, f'bada-fel-{kalla}-{res}-{a.utsnitt}.jpg'))
    if a.embed_det:
        jd = json.load(open(a.embed_det, encoding='utf-8'))
        for res, er in jd['embed_rader'].items():
            emb = {(r['kalla'], str(r['bild']), int(r['nr'])): r for r in er}
            for kalla in ('golden', 'mes246'):
                o = [r for r in rader if r['res'] == res and r['utsnitt'] == 'detektor' and r['kalla'] == kalla]
                svs = sida_vid_sida(o, emb, f'{kalla} {res} (detektorn)')
                if svs:
                    sidor.append(svs[0])
                    if a.ark and svs[1]:
                        os.makedirs(a.ark, exist_ok=True)
                        kontaktsida(svs[1], mapp, os.path.join(a.ark, f'bada-fel-{kalla}-{res}-detektor.jpg'))
    if sidor:
        print(f'\nSida vid sida på samma remsor (bildmodellen: remsa {a.andel:.2f}; OCR: utsnittet {a.utsnitt} / detektorns):')
        skriv_sida(sidor)
    ut['sida_vid_sida'] = sidor
    fil = os.path.join(HAR, 'resultat', os.path.basename(mapp) + '-ocr-rapport.json')
    json.dump(ut, open(fil, 'w'), ensure_ascii=False, indent=1)
    print('sparat', os.path.relpath(fil, ROT))


if __name__ == '__main__':
    main()

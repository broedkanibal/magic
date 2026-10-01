#!/usr/bin/env python3
"""MES-328, kontrollen före allt annat: ger Python-pipelinen samma svar som embed.js på HELA kort?

dev/embed/RAPPORT.md: modulens recept (8 vektorer per konstverk, webb-omskalning) sätter rätt namn
på 52 av 61 riktiga golden-beskärningar (dev/embed/riktiga/), 46 säkra rätt och 1–2 säkra fel vid
marginal 0,11. Hamnar den här koden nära det (±2) är receptet rätt återgivet, och remsproven mäter
modellen — inte ett fel i omskrivningen. Hamnar den långt ifrån är allt efteråt ogiltigt.

    ~/.mesa/detektor-venv/bin/python dev/remsa/kalibrering.py
"""
import json, os, sys
import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import (Bildmodell, Referenser, las_referensbilder, kvadrat, dom, MARGINAL, TROSKEL, ROT, median)  # noqa: E402

RIKTIGA = os.path.join(ROT, 'dev', 'embed', 'riktiga')


def utan_marginal(img):
    """Beskärningen utan sin 8 %-marginal (fragaTensor i embed.js)."""
    H, W = img.shape[:2]
    f = MARGINAL / (1 + 2 * MARGINAL)
    x0, y0 = int(round(W * f)), int(round(H * f))
    return img[y0:H - y0, x0:W - x0]


def main():
    m = Bildmodell()
    refs = Referenser(m, las_referensbilder())
    print(f'referenser: {len(refs.namn)} vektorer, {len(refs.namnlista)} namn, {median(m.ms):.0f} ms/bild')
    man = json.load(open(os.path.join(RIKTIGA, 'manifest.json'), encoding='utf-8'))
    rader = []
    for p in man:
        img = cv2.imread(os.path.join(RIKTIGA, p['fil']))
        rgb = cv2.cvtColor(utan_marginal(img), cv2.COLOR_BGR2RGB)
        q = m.kor([kvadrat(rgb)])[0]
        d = dom(refs.rangordna(q), p['namn'])
        d.update({'fil': p['fil'], 'facit': p['namn'], 'skymd': p['skymd'], 'helbild': p['helbild']})
        rader.append(d)
    n = len(rader); ratt = sum(r['ratt'] for r in rader)
    sr = sum(r['ratt'] and r['saker'] for r in rader); sf = sum((not r['ratt']) and r['saker'] for r in rader)
    van = [r for r in rader if not r['skymd'] and not r['helbild']]
    print(f'\nHela kort, riktiga beskärningar: {ratt}/{n} rätt, säkra rätt {sr}, säkra fel {sf} (marginal > {TROSKEL})')
    # manifestets 13 skymda + 13 helbild lämnar 35 — inte RAPPORT.md:s "43 vanliga", som är en annan delning; de två jämförs inte
    print(f'varken skymda eller helbild (35 enligt manifestet; ej jämförbart med RAPPORT.md:s 43 "vanliga"): {sum(r["ratt"] for r in van)}/{len(van)}')
    print('RAPPORT.md, modulens recept, hela 61: 52/61 rätt, 46 säkra rätt, 1–2 säkra fel')
    for r in rader:
        if not r['ratt']:
            print(f"  fel: {r['fil']:14} facit {r['facit']:28} → {r['namn']:28} marginal {r['marginal']:.3f}{' SÄKER' if r['saker'] else ''}")
    os.makedirs(os.path.join(ROT, 'dev', 'remsa', 'resultat'), exist_ok=True)
    json.dump({'n': n, 'ratt': ratt, 'sakra_ratt': sr, 'sakra_fel': sf, 'vanliga': [sum(r['ratt'] for r in van), len(van)], 'rader': rader},
              open(os.path.join(ROT, 'dev', 'remsa', 'resultat', 'kalibrering-helkort.json'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()

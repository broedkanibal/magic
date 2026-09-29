#!/usr/bin/env python3
"""Hur många olika träningsrutor ger materialet? (MES-288, grind 1)

Tar en ruta var STEG sekund ur varje träningsvideo (kamerabilden, samma
beskärning som rutor.py), skalar ner till 96 px bred gråskala och räknar en
ruta som **ny** när den skiljer sig från den senast behållna med mer än
GRANS gråsteg i snitt. Allt annat är en nästan-dubblett (bordet stod still).
Rutor där kamerabilden inte syns (appens meny, svart skärm) räknas bort:
bilden är nästan enfärgad (standardavvikelse < 6 gråsteg).

    python dev/detektor/larare/dubbletter.py [--steg 2]

Skriver bara ut tal; sparar inga bilder.
"""
import argparse, os, sys
import numpy as np
import cv2

HAR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HAR)
sys.path.insert(0, os.path.dirname(HAR))
from delning import krav_traning  # noqa: E402
from rutor import KALLOR, INSP, las_flera, beskar  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('--steg', type=float, default=2)
p.add_argument('--grans', default='2,4,8')
a = p.parse_args()
granser = [float(g) for g in a.grans.split(',')]

# (från, till) s: partiets första ~50 s och sista sekunder visar appens meny i kamerarutan
SPANN = {'parti': (50, 1190), 'pass1': (0, 54), 'mes139': (0, 56), 'mes138': (0, 36), 'pacifism': (0, 54)}
summa = {g: 0 for g in granser}
alla = 0
for namn, k in KALLOR.items():
    video = krav_traning(os.path.join(INSP, k['video']))
    fran, till = SPANN[namn]
    tider = [round(fran + i * a.steg, 2) for i in range(int((till - fran) / a.steg) + 1)]
    sma = []
    for i in range(0, len(tider), 25):
        for s, im in las_flera(video, tider[i:i + 25]).items():
            g = cv2.cvtColor(beskar(im, k['kam']), cv2.COLOR_BGR2GRAY)
            sma.append((s, cv2.resize(g, (96, round(96 * g.shape[0] / g.shape[1])), interpolation=cv2.INTER_AREA).astype(np.float32)))
    synliga = [(s, g) for s, g in sma if g.std() >= 6]
    rad = [f'{namn:9} {len(sma):4} rutor, {len(synliga):4} med kamerabild']
    alla += len(synliga)
    for gr in granser:
        kvar, sist = 0, None
        for s, g in synliga:
            if sist is None or np.abs(g - sist).mean() > gr:
                kvar += 1
                sist = g
        summa[gr] += kvar
        rad.append(f'nya vid >{gr:g}: {kvar:4}')
    print(' · '.join(rad), flush=True)
print(f'{"alla":9} {alla:4} med kamerabild · ' + ' · '.join(f'nya vid >{g:g}: {summa[g]:4}' for g in granser))

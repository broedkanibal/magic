#!/usr/bin/env python3
"""Grind 1 (MES-288): plocka rutor ur träningsinspelningarna åt läraren.

Varje källvideo prövas med delning.krav_traning innan en enda ruta tas ur
den, och varje fil som skrivs prövas igen — en provinspelning stoppar
skriptet med fel (ProvLacka).

    python dev/detektor/larare/rutor.py kandidater [källa …]   # hela bilden var KANDIDATSTEG s, för att välja
    python dev/detektor/larare/rutor.py valj                   # de valda rutorna (VAL nedan), beskurna till kamerabilden

Rutorna tas i full upplösning med ruta.swift (AVFoundation; dev/rutor.swift
skalar ner helbilden till 1600 px, och kamerabilden är liten i
skärminspelningarna; OpenCV:s sökning fungerar inte på dem). Binären
kompileras till $TMPDIR/mesa-ruta om RUTA_BIN inte pekar på en.

Utdata (gitignorerat): dev/material/arbete/2026-09-28-mes-288-larare/
  kandidater/<källa>/NNNN.jpg    hela bilden, för att välja
  rutor/<källa>-NNNN.jpg         den valda rutan, bara kamerabilden
  rutor.json                     källa, sekund, beskärning, vad man ser
"""
import json, os, subprocess, sys, tempfile
import cv2

HAR = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(os.path.dirname(os.path.dirname(HAR)))
sys.path.insert(0, os.path.dirname(HAR))
from delning import krav_traning  # noqa: E402

MAT = os.path.join(ROT, 'dev', 'material')
ARB = os.path.join(MAT, 'arbete', '2026-09-28-mes-288-larare')
INSP = os.path.join(MAT, 'inspelningar')

# Källorna: video, var kamerabilden ligger (andel av hela bilden: x0, y0, x1, y1)
# och kandidatsteget. Partiets ruta är dev/rutor.swift:s KAM utan raden med
# förklaringen längst ner; de andra är mätta på kandidaterna.
KALLOR = {
    'parti': dict(video='2026-09-21-mes-238-parti-4k15-20min/dator.mov', steg=30, till=1200,
                  kam=(0.597, 0.443, 0.909, 0.668)),
    'pass1': dict(video='2026-09-16-mes-166-provkort-pass-1-mork/dator.mov', steg=6, till=54,
                  kam=(0.045, 0.385, 0.567, 0.715)),
    'mes139': dict(video='2026-09-16-mes-139-library-steget-plastficka/telefon.mp4', steg=5, till=56,
                   kam=(0.205, 0.285, 0.795, 1.0)),
    'mes138': dict(video='2026-09-14-mes-138-library-plastficka-kanns-inte-igen/dator.mov', steg=6, till=36,
                   kam=(0.040, 0.205, 0.704, 0.898)),
    'pacifism': dict(video='2026-09-21-provkort-pacifism/dator.mov', steg=6, till=54,
                     kam=(0.579, 0.350, 1.0, 0.600)),
}

# De valda rutorna: (källa, sekund, vad man ser). Valda efter att kandidaterna
# setts igenom: spridda över partiet, med händer, högar, omlott och få kort.
VAL = [
    ('parti', 60, 'få kort, början av partiet'),
    ('parti', 180, 'hand som lägger ett kort'),
    ('parti', 240, 'hand i kanten, landhögar'),
    ('parti', 300, 'underarm över bordet'),
    ('parti', 360, 'rörelseoskärpa, hand i farten'),
    ('parti', 420, 'stilla, landhögar och kort omlott'),
    ('parti', 480, 'många kort, flera omlott och tappade'),
    ('parti', 570, 'hand över högarna'),
    ('parti', 660, 'stilla, fullt bord'),
    ('parti', 780, 'kort omlott uppe till vänster, högar'),
    ('parti', 810, 'hand mitt i bild'),
    ('parti', 900, 'hand och oskärpa'),
    ('parti', 990, 'sent i partiet, täta högar'),
    ('parti', 1110, 'stilla, fullt bord'),
    ('parti', 1170, 'kort i rörelse uppe till höger'),
    ('pass1', 0, 'tomt bord (grå duk)'),
    ('pass1', 18, 'ett kort på duken'),
    ('pass1', 36, 'hand som lägger provkortet'),
    ('mes139', 10, 'hand, kortask och ett kort'),
    ('mes139', 55, 'kraftig oskärpa, hand med kort'),
    ('mes138', 0, 'hand över graveyard och library'),
    ('mes138', 24, 'leken i plastfickor på library-platsen'),
    ('pacifism', 12, 'hand med provkortet, mönstrad duk'),
    ('pacifism', 24, 'hand som lägger ett kort'),
]


def ruta_bin():
    b = os.environ.get('RUTA_BIN')
    if b and os.path.exists(b):
        return b
    b = os.path.join(tempfile.gettempdir(), 'mesa-ruta')
    if not os.path.exists(b):
        subprocess.run(['swiftc', '-O', '-o', b, os.path.join(HAR, 'ruta.swift')], check=True)
    return b


def las_flera(video, sekunder):
    """-> {sekund: bild (BGR)} i full upplösning."""
    tmp = tempfile.mkdtemp(prefix='mesa-ruta-')
    arg = []
    for s in sekunder:
        arg += [os.path.join(tmp, f'{s}.png'), str(s)]
    subprocess.run(['nice', '-n', '19', ruta_bin(), video] + arg, check=True, stdout=subprocess.DEVNULL)
    ut = {}
    for s in sekunder:
        f = os.path.join(tmp, f'{s}.png')
        ut[s] = cv2.imread(f)
        os.remove(f)
    os.rmdir(tmp)
    return ut


def beskar(im, b):
    H, W = im.shape[:2]
    return im[round(b[1] * H):round(b[3] * H), round(b[0] * W):round(b[2] * W)]


def kandidater(bara=None):
    for namn, k in KALLOR.items():
        if bara and namn not in bara:
            continue
        video = krav_traning(os.path.join(INSP, k['video']))
        ut = krav_traning(os.path.join(ARB, 'kandidater', namn))
        os.makedirs(ut, exist_ok=True)
        print(f'{namn}: {k["video"]} 0–{k["till"]} s, var {k["steg"]} s', flush=True)
        bilder = las_flera(video, list(range(0, k['till'] + 1, k['steg'])))
        for s, im in bilder.items():
            cv2.imwrite(os.path.join(ut, f'{s:04d}.jpg'), im, [cv2.IMWRITE_JPEG_QUALITY, 85])
            cv2.imwrite(os.path.join(ut, f'kam-{s:04d}.jpg'), beskar(im, k['kam']), [cv2.IMWRITE_JPEG_QUALITY, 90])


def valj():
    os.makedirs(os.path.join(ARB, 'rutor'), exist_ok=True)
    ut = []
    bilder = {}
    for namn in dict.fromkeys(n for n, _, _ in VAL):
        video = krav_traning(os.path.join(INSP, KALLOR[namn]['video']))
        bilder[namn] = las_flera(video, [s for n, s, _ in VAL if n == namn])
    for namn, sek, vad in VAL:
        k = KALLOR[namn]
        im = beskar(bilder[namn][sek], k['kam'])
        fil = krav_traning(os.path.join(ARB, 'rutor', f'{namn}-{int(sek):04d}.jpg'))
        cv2.imwrite(fil, im, [cv2.IMWRITE_JPEG_QUALITY, 92])
        ut.append(dict(fil=os.path.relpath(fil, ARB), kalla=f'dev/material/inspelningar/{k["video"]}', sekund=sek,
                       beskarning=k['kam'], bredd=im.shape[1], hojd=im.shape[0], vad=vad))
        print(f'{namn} {sek:5} s → {ut[-1]["fil"]} {im.shape[1]}×{im.shape[0]}', flush=True)
    with open(os.path.join(ARB, 'rutor.json'), 'w', encoding='utf-8') as f:
        json.dump(ut, f, ensure_ascii=False, indent=1)
    print(f'{len(ut)} rutor → {ARB}/rutor.json')


if __name__ == '__main__':
    steg = sys.argv[1] if len(sys.argv) > 1 else ''
    if steg == 'kandidater':
        kandidater(sys.argv[2:])
    elif steg == 'valj':
        valj()
    else:
        print(__doc__)

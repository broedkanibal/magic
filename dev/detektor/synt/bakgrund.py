#!/usr/bin/env python3
"""Grind 1b (MES-288): bakgrunder till de syntetiska borden — bara tomma bord ur träningsmaterial.

Två sorters bakgrund:

  riktig   en tom bordsyta ur en träningsinspelning. Varje källa prövas med
           delning.krav_traning — både rutan och videon den togs ur — och
           stoppar med ProvLacka om något inte är träning. Golden, MES-246,
           passet 2026-09-22 och alla andra provmappar kan alltså aldrig bli
           bakgrund. Partiet 2026-09-21 är uteslutet för sig (Jesper
           2026-09-29: skärminspelningens ramar och låga upplösning är fel
           material), fast delning.json fortfarande säger träning.
  ritad    trä, duk, spelmatta, ljus skiva — genererade här (texturer.py),
           ingen licens behövs.

Rutorna är de som grind 1 tog ur videorna (dev/detektor/larare/rutor.py, som
prövar källvideon): kandidater/<källa>/kam-NNNN.jpg. Ur dem skärs bara
handvalda tomma ytor — inga kort, inga händer, ingen av Mesas ritade ramar
eller etiketter. Varje utsnitt prövas dessutom automatiskt: färgmättade
bildpunkter (Mesas gröna, gula, blå ramar) stoppar det.

    python dev/detektor/synt/bakgrund.py                       # utsnitten nedan → bakgrund/
    python dev/detektor/synt/bakgrund.py --video <sökväg> [--till 8] [--steg 2]
          # en NY inspelning som börjar med tomt bord (kameraappen rakt av):
          # rutor ur de första --till sekunderna, var --steg s, hela bilden
          # som bakgrund. Stoppar om videon inte är träning.
    python dev/detektor/synt/bakgrund.py --test                # spärren: provmappar ska stoppas

Utdata (gitignorerat): dev/material/arbete/2026-09-29-mes-288-synt/bakgrund/
  <namn>.jpg och index.json (källa, video, utsnitt, prövad dom).
"""
import json, os, sys
import cv2
import numpy as np

HAR = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(os.path.dirname(os.path.dirname(HAR)))
sys.path.insert(0, os.path.dirname(HAR))
from delning import krav_traning, klassa, ProvLacka  # noqa: E402

MAT = os.path.join(ROT, 'dev', 'material')
ARB = os.path.join(MAT, 'arbete', '2026-09-29-mes-288-synt')
UT = os.path.join(ARB, 'bakgrund')
INDEX = os.path.join(UT, 'index.json')
KAND = os.path.join(MAT, 'arbete', '2026-09-28-mes-288-larare', 'kandidater')
INSP = os.path.join(MAT, 'inspelningar')

# Jespers beslut 2026-09-29, utöver delning.json: partiet används inte i träningen.
UTESLUTNA = {'2026-09-21-mes-238-parti-4k15-20min': 'Jesper 2026-09-29: partiets skärminspelning (ramar, låg upplösning) används inte i träningen'}

# Källvideon per kandidatmapp (samma som KALLOR i dev/detektor/larare/rutor.py).
VIDEO = {
    'pass1': '2026-09-16-mes-166-provkort-pass-1-mork/dator.mov',
    'mes139': '2026-09-16-mes-139-library-steget-plastficka/telefon.mp4',
    'mes138': '2026-09-14-mes-138-library-plastficka-kanns-inte-igen/dator.mov',
    'pacifism': '2026-09-21-provkort-pacifism/dator.mov',
}

# Handvalda tomma ytor: (källa, ruta, utsnitt x0 y0 x1 y1 i andelar, vad).
# Valda med ögat på kandidaterna 2026-09-29; automatiska mättnadsprovet nedan
# fäller ett utsnitt som ändå rör en ram.
UTSNITT = [
    ('mes138', 'kam-0012.jpg', (0.02, 0.01, 0.98, 0.53), 'mörkbrun skiva, lampa ovanifrån'),
    ('mes138', 'kam-0012.jpg', (0.39, 0.52, 0.98, 0.96), 'mörkbrun skiva, nedre halvan'),
    ('mes139', 'kam-0000.jpg', (0.40, 0.00, 1.00, 0.92), 'mörk skiva, telefonens egen inspelning'),
    ('mes139', 'kam-0000.jpg', (0.00, 0.00, 0.20, 0.92), 'mörk skiva, vänsterkanten'),
    ('pacifism', 'kam-0018.jpg', (0.37, 0.00, 1.00, 0.96), 'blågrå matta med vävmönster'),
    ('pacifism', 'kam-0030.jpg', (0.00, 0.53, 1.00, 0.96), 'blågrå matta, nedre halvan'),
    ('pass1', 'kam-0000.jpg', (0.00, 0.02, 1.00, 0.86), 'grå duk, ojämnt ljus'),
    ('pass1', 'kam-0000.jpg', (0.38, 0.02, 1.00, 1.00), 'grå duk, högra delen'),
]

MATTAD_MAX = 0.0008   # andel bildpunkter med hög färgmättnad som tolereras (brus), annars är något ritat där


LARARE = os.path.join(MAT, 'arbete', '2026-09-28-mes-288-larare')


def kallvideo(s):
    """En ruta ur grind 1 (larare/rutor/ eller larare/kandidater/<källa>/) → videon den togs ur, annars None."""
    a = os.path.abspath(s)
    if not a.startswith(LARARE + os.sep):
        return None
    rel = os.path.relpath(a, LARARE).split(os.sep)
    if rel[0] == 'kandidater' and len(rel) >= 2:
        kalla = rel[1]
    elif rel[0] in ('rutor', 'ritade') and len(rel) >= 2:
        kalla = rel[1].split('-')[0]
    else:
        kalla = None
    if kalla == 'parti':
        return os.path.join(INSP, '2026-09-21-mes-238-parti-4k15-20min', 'dator.mov')
    if kalla in VIDEO:
        return os.path.join(INSP, VIDEO[kalla])
    raise ProvLacka(f'{s}: okänd källa i grind 1:s mapp — räknas som prov')


def prova_kalla(*sokvagar):
    """krav_traning på varje sökväg (och på videon en grind 1-ruta togs ur), plus Jespers uteslutna tillfällen."""
    for s in sokvagar:
        krav_traning(s)
        v = kallvideo(s)
        kedja = [s] + ([v] if v else [])
        if v:
            krav_traning(v)
        for k in kedja:
            for namn, skal in UTESLUTNA.items():
                if namn in os.path.realpath(k).split(os.sep) or namn in os.path.abspath(k).split(os.sep):
                    raise ProvLacka(f'{s}: {skal}')


def mattnad(bild):
    hsv = cv2.cvtColor(cv2.GaussianBlur(bild, (3, 3), 0), cv2.COLOR_BGR2HSV)
    s, v = hsv[..., 1].astype(np.float32) / 255, hsv[..., 2].astype(np.float32) / 255
    return float(np.mean((s > 0.45) & (v > 0.25)))


def las_index():
    if os.path.exists(INDEX):
        return json.load(open(INDEX, encoding='utf-8'))
    return {'om': 'Bakgrunder till de syntetiska borden (MES-288 grind 1b), gjorda av dev/detektor/synt/bakgrund.py. Bara tomma bord ur träningsmaterial.', 'bakgrunder': []}


def spara_index(ix):
    with open(INDEX, 'w', encoding='utf-8') as f:
        json.dump(ix, f, ensure_ascii=False, indent=1)


def fran_kandidater():
    os.makedirs(UT, exist_ok=True)
    ix = las_index()
    ix['bakgrunder'] = [b for b in ix['bakgrunder'] if b.get('typ') != 'utsnitt']
    for i, (kalla, ruta, (x0, y0, x1, y1), vad) in enumerate(UTSNITT):
        fil = os.path.join(KAND, kalla, ruta)
        video = os.path.join(INSP, VIDEO[kalla])
        prova_kalla(fil, video)
        bild = cv2.imread(fil)
        H, W = bild.shape[:2]
        bit = bild[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)]
        m = mattnad(bit)
        if m > MATTAD_MAX:
            raise SystemExit(f'{kalla}/{ruta} utsnitt {i}: {m:.4f} av bildpunkterna är färgmättade — en ram eller etikett? Välj om utsnittet.')
        namn = f'{kalla}-{os.path.splitext(ruta)[0]}-{i}.jpg'
        cv2.imwrite(os.path.join(UT, namn), bit, [cv2.IMWRITE_JPEG_QUALITY, 95])
        ix['bakgrunder'].append({'fil': namn, 'typ': 'utsnitt', 'kalla': os.path.relpath(fil, ROT), 'video': os.path.relpath(video, ROT),
                                 'utsnitt': [x0, y0, x1, y1], 'storlek': [bit.shape[1], bit.shape[0]], 'vad': vad,
                                 'dom': klassa(fil)[0], 'mattnad': round(m, 5)})
        print(f'{namn}: {bit.shape[1]}×{bit.shape[0]}, mättnad {m:.5f}, {vad}')
    spara_index(ix)


def fran_video(video, till=8.0, steg=2.0):
    """En ny inspelning som börjar med tomt bord: rutor ur de första sekunderna."""
    prova_kalla(video)
    os.makedirs(UT, exist_ok=True)
    ix = las_index()
    tillfalle = os.path.basename(os.path.dirname(os.path.abspath(video)))
    kap = cv2.VideoCapture(video)
    fps = kap.get(cv2.CAP_PROP_FPS) or 30
    n, nasta, tagna = 0, 0.0, 0
    while True:
        ok, bild = kap.read()   # läser i ordning; ingen sökning (fungerar inte i alla inspelningar)
        if not ok:
            break
        t = n / fps
        n += 1
        if t > till:
            break
        if t + 1e-6 < nasta:
            continue
        nasta += steg
        H, W = bild.shape[:2]
        if W > 1920:
            bild = cv2.resize(bild, (1920, round(H * 1920 / W)), interpolation=cv2.INTER_AREA)
        # ett tomt bord har få starka kanter; kort, händer och ramar ger många
        kanter = float(np.mean(cv2.Canny(cv2.cvtColor(bild, cv2.COLOR_BGR2GRAY), 60, 160) > 0))
        m = mattnad(bild)
        namn = f'{tillfalle}-{t:05.1f}.jpg'
        post = {'fil': namn, 'typ': 'video', 'kalla': os.path.relpath(os.path.abspath(video), ROT), 'sekund': round(t, 2),
                'storlek': [bild.shape[1], bild.shape[0]], 'vad': f'tomt bord ur {tillfalle}', 'dom': klassa(video)[0],
                'kanter': round(kanter, 4), 'mattnad': round(m, 5)}
        if kanter > 0.02 or m > 0.01:
            print(f'{namn}: hoppar över — kanter {kanter:.3f}, mättnad {m:.4f} (kort, hand eller ritning i bild?)')
            continue
        cv2.imwrite(os.path.join(UT, namn), bild, [cv2.IMWRITE_JPEG_QUALITY, 95])
        ix['bakgrunder'] = [b for b in ix['bakgrunder'] if b['fil'] != namn] + [post]
        tagna += 1
        print(f'{namn}: {bild.shape[1]}×{bild.shape[0]}, kanter {kanter:.3f}')
    spara_index(ix)
    print(f'{tagna} bakgrunder ur {video}')


def test():
    fel = []
    g = os.path.join(ROT, 'dev', 'golden')
    for s in [os.path.join(INSP, '2026-09-19-mes-246-las-fore-slapp', 'telefon.mov'),
              os.path.join(g, 'inspelningar', '2026-09-19-mes-246-las-fore-slapp', 'mes-246-video.mov'),
              os.path.join(INSP, '2026-09-22-1x-34cm-normaltempo', 'kamera.mp4'),
              os.path.join(g, 'fall', '14-tra-lampa-50cm-11kort-omlott', 'bild.jpg'),
              os.path.join(MAT, 'rita', 'mes-246', '0.78.jpg'),
              os.path.join(MAT, 'foton', '2026-09-26-lekfoto', 'foto-05.jpg'),
              os.path.join(INSP, '2026-09-21-mes-238-parti-4k15-20min', 'dator.mov'),
              os.path.join(MAT, 'arbete', '2026-09-28-mes-288-larare', 'rutor', 'parti-0420.jpg'),
              os.path.join(INSP, '2026-10-05-okand-mapp', 'telefon.mov')]:
        try:
            prova_kalla(s)
            fel.append(f'släppte igenom {s}')
        except ProvLacka:
            pass
    for kalla, ruta, _, _ in UTSNITT:
        try:
            prova_kalla(os.path.join(KAND, kalla, ruta), os.path.join(INSP, VIDEO[kalla]))
        except ProvLacka as e:
            fel.append(f'stoppade en träningskälla: {e}')
    try:
        prova_kalla(os.path.join(INSP, '2026-10-02-traning-duk-dagsljus', 'telefon.mov'))
    except ProvLacka as e:
        fel.append(f'stoppade en framtida träningsfilm: {e}')
    print('\n'.join(fel) if fel else 'spärren håller: prov, MES-246, partiet och okända mappar stoppas; träningskällorna släpps igenom')
    return not fel


if __name__ == '__main__':
    a = sys.argv[1:]
    if '--test' in a:
        sys.exit(0 if test() else 1)
    if '--video' in a:
        v = a[a.index('--video') + 1]
        till = float(a[a.index('--till') + 1]) if '--till' in a else 8.0
        steg = float(a[a.index('--steg') + 1]) if '--steg' in a else 2.0
        fran_video(v, till, steg)
    else:
        fran_kandidater()

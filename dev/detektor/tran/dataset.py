#!/usr/bin/env python3
"""MES-288 grind 2: bygger träningsdatasetet för detektorn (YOLOX) — lokalt, inget laddas upp här.

Två källor, båda träning enligt dev/detektor/delning.json:

  riktiga    de 638 rutorna ur Jespers tre träningsfilmer 2026-09-29 med lärarens facit
             (dev/material/arbete/2026-09-29-mes-288-traningsrutor/<film>/facit.json, regel A–G).
             Lådor med baksidesflaggan → klass `baksida`, övriga → `kort`. Varje ignorerad yta
             (A–G) följer med som ignorerad.
  syntetiska generatorns bord (dev/detektor/synt/generera.py) i de mappar som ges med --synt.
             Lådor = kort med far_lada; ignorerade = kort som har en låda runt det synliga men
             inte far_lada (för lite syns, eller handen täcker mer än 45 %).

Bilderna skrivs i 960 px bredd (riktiga: 3840×2160 → 960×540; syntetiska är redan 960×544):
detektorn tränas och körs vid 960×544, och en större lagrad bild hade bara gjort datasetet
fyra gånger så stort.

Valideringsdelen (bara för att se att träningen går framåt — provet är det ritade golden-facit,
som aldrig ingår här): var tionde syntetiska bord (fro % 10 == 0) och de sista 10 % av varje
film i tid (så att nästan likadana grannrutor inte hamnar på båda sidor).

**Spärren:** varje källbild och varje utfil går genom delning.krav_traning_alla innan något
skrivs. Filistan (bara sökvägar) sparas i dev/detektor/tran/filista-<namn>.txt.

    python dev/detektor/tran/dataset.py --synt g2-a,g2-b,g2-c,g2-d --namn v1

Utdata (gitignorerat): dev/material/arbete/2026-09-30-mes-288-traning-detektor-<namn>/
  bilder/<id>.jpg, anteckningar.json (lådor och ignorerade ytor i bildpunkter), dataset-metadata.json
"""
import json, os, sys, time
import cv2

HAR = os.path.dirname(os.path.abspath(__file__))
DET = os.path.dirname(HAR)
ROT = os.path.dirname(os.path.dirname(DET))
sys.path.insert(0, DET)
from delning import krav_traning, krav_traning_alla  # noqa: E402

MAT = os.path.join(ROT, 'dev', 'material')
TRN = os.path.join(MAT, 'arbete', '2026-09-29-mes-288-traningsrutor')
SYNT = os.path.join(MAT, 'arbete', '2026-09-29-mes-288-synt')
FILMER = ['2026-09-29-traning-tra-dagsljus-lampa', '2026-09-29-traning-svartmatta-dagsljus', '2026-09-29-traning-vittbord-dagsljus']
KORT_FILM = {'2026-09-29-traning-tra-dagsljus-lampa': 'tra', '2026-09-29-traning-svartmatta-dagsljus': 'svart', '2026-09-29-traning-vittbord-dagsljus': 'vitt'}
KLASSER = ['kort', 'baksida']
BREDD = 960
VAL_FILM_ANDEL = 0.10


def riktiga():
    ut = []
    for film in FILMER:
        mapp = os.path.join(TRN, film)
        facit = json.load(open(os.path.join(mapp, 'facit.json'), encoding='utf-8'))['rutor']
        nycklar = sorted(facit, key=lambda k: facit[k]['sekund'])
        tmax = max(facit[k]['sekund'] for k in nycklar)
        for k in nycklar:
            r = facit[k]
            ut.append({'kalla': os.path.join(mapp, k), 'id': f'r-{KORT_FILM[film]}-{os.path.splitext(os.path.basename(k))[0]}',
                       'typ': 'riktig', 'film': film, 'sekund': r['sekund'],
                       'del': 'val' if r['sekund'] > tmax * (1 - VAL_FILM_ANDEL) else 'trn',
                       'lador_n': [(l['lada'], 'baksida' if l.get('baksida') else 'kort') for l in r['lador']],
                       'ign_n': [(x['lada'], x['regel']) for x in r['ignorera']]})
    return ut


def syntetiska(mappar):
    ut = []
    for m in mappar:
        mapp = os.path.join(SYNT, m)
        for f in sorted(os.listdir(mapp)):
            if not (f.startswith('synt-') and f.endswith('.json')):
                continue
            d = json.load(open(os.path.join(mapp, f), encoding='utf-8'))
            lador, ign = [], []
            for k in d['kort']:
                if not k['lada_px']:
                    continue
                x, y, w, h = k['lada_px']
                if k['far_lada']:
                    lador.append(([x, y, x + w, y + h], k['klass']))
                else:
                    ign.append(([x, y, x + w, y + h], 'hand' if k.get('hand', 0) > 0.45 else 'synt'))
            ut.append({'kalla': os.path.join(mapp, d['bild']), 'id': f's-{d["fro"]:06d}', 'typ': 'synt', 'fro': d['fro'],
                       'scen': d['scen'], 'hand': 'hand' in d.get('efter', {}), 'bakgrund': d['bakgrund'].get('fil') or d['bakgrund'].get('vad'),
                       'del': 'val' if d['fro'] % 10 == 0 else 'trn', 'lador_px': lador, 'ign_px': ign, 'storlek': (d['bredd'], d['hojd'])})
    return ut


def main():
    a = sys.argv[1:]
    mappar = a[a.index('--synt') + 1].split(',') if '--synt' in a else []
    namn = a[a.index('--namn') + 1] if '--namn' in a else 'v1'
    torrt = '--torrt' in a
    utmapp = os.path.join(MAT, 'arbete', f'2026-09-30-mes-288-traning-detektor-{namn}')
    glest = int(a[a.index('--glest') + 1]) if '--glest' in a else 1   # rökprov: var K:e riktiga ruta
    poster = riktiga()[::glest] + syntetiska(mappar)
    kallor = [p['kalla'] for p in poster]
    utfiler = [os.path.join(utmapp, 'bilder', p['id'] + '.jpg') for p in poster]
    # spärren: varje källa och varje utfil, innan något skrivs
    krav_traning_alla(kallor)
    krav_traning_alla(utfiler + [utmapp])
    for p in poster:   # videon rutorna togs ur (rutor.py prövade den redan när rutorna togs)
        if p['typ'] == 'riktig':
            krav_traning(os.path.join(MAT, 'inspelningar', p['film']))
    lista = os.path.join(HAR, f'filista-{namn}.txt')
    with open(lista, 'w', encoding='utf-8') as f:
        f.write(f'# MES-288 grind 2, dataset {namn}: källbild -> fil i datasetet. Alla rader prövade med krav_traning_alla ({time.strftime("%Y-%m-%d %H:%M")}).\n')
        for p, u in zip(poster, utfiler):
            f.write(f'{os.path.relpath(p["kalla"], ROT)}\t{os.path.relpath(u, ROT)}\t{p["del"]}\n')
    print(f'{len(poster)} bilder ({sum(p["typ"] == "riktig" for p in poster)} riktiga, {sum(p["typ"] == "synt" for p in poster)} syntetiska) prövade; filistan: {os.path.relpath(lista, ROT)}')
    if torrt:
        return
    os.makedirs(os.path.join(utmapp, 'bilder'), exist_ok=True)
    ant = []
    for i, (p, u) in enumerate(zip(poster, utfiler)):
        if p['typ'] == 'riktig':
            if not os.path.exists(u):
                im = cv2.imread(p['kalla'], cv2.IMREAD_REDUCED_COLOR_2)
                h0 = round(im.shape[0] * BREDD / im.shape[1])
                im = cv2.resize(im, (BREDD, h0), interpolation=cv2.INTER_AREA)
                cv2.imwrite(u, im, [cv2.IMWRITE_JPEG_QUALITY, 92])
                w, h = BREDD, h0
            else:
                w, h = BREDD, 540
            lador = [[round(b[0] * w, 1), round(b[1] * h, 1), round(b[2] * w, 1), round(b[3] * h, 1), KLASSER.index(c)] for b, c in p['lador_n']]
            ign = [[round(b[0] * w, 1), round(b[1] * h, 1), round(b[2] * w, 1), round(b[3] * h, 1), r] for b, r in p['ign_n']]
        else:
            if not os.path.exists(u):
                with open(p['kalla'], 'rb') as fi, open(u, 'wb') as fo:
                    fo.write(fi.read())
            w, h = p['storlek']
            lador = [[round(b[0], 1), round(b[1], 1), round(b[2], 1), round(b[3], 1), KLASSER.index(c)] for b, c in p['lador_px']]
            ign = [[round(b[0], 1), round(b[1], 1), round(b[2], 1), round(b[3], 1), r] for b, r in p['ign_px']]
        post = {'fil': 'bilder/' + p['id'] + '.jpg', 'bredd': w, 'hojd': h, 'del': p['del'], 'typ': p['typ'], 'lador': lador, 'ignorera': ign}
        for k in ('film', 'sekund', 'fro', 'scen', 'hand', 'bakgrund'):
            if k in p:
                post[k] = p[k]
        ant.append(post)
        if i % 500 == 0:
            print(f'{i}/{len(poster)}', flush=True)
    meta = {'om': 'MES-288 grind 2: träningsdata för kortdetektorn. Riktiga rutor ur Jespers träningsfilmer (lärarens facit, OWLv2) och syntetiska bord. '
                  'lador: [x0, y0, x1, y1, klass] i bildpunkter, klass 0 = kort, 1 = baksida. ignorera: [x0, y0, x1, y1, regel] — varken facit eller bakgrund.',
            'klasser': KLASSER, 'bilder': ant}
    with open(os.path.join(utmapp, 'anteckningar.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False)
    # siffror
    for typ in ('riktig', 'synt'):
        for dl in ('trn', 'val'):
            b = [x for x in ant if x['typ'] == typ and x['del'] == dl]
            nk = sum(1 for x in b for l in x['lador'] if l[4] == 0)
            nb = sum(1 for x in b for l in x['lador'] if l[4] == 1)
            ni = sum(len(x['ignorera']) for x in b)
            print(f'{typ:6} {dl}: {len(b):5d} bilder, {nk:6d} kort, {nb:5d} baksida, {ni:5d} ignorerade ytor')
    print(f'utmapp: {utmapp}')


if __name__ == '__main__':
    main()

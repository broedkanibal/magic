#!/usr/bin/env python3
"""MES-288: träningsrutor ur Jespers träningsfilmer 2026-09-29, och lärarens facit på dem.

    python dev/detektor/larare/traning.py start [film …]     # rutor 0–20 s, för att se när bordet slutar vara tomt
    python dev/detektor/larare/traning.py rutor [film …]     # en ruta var STEG s, nästan-dubbletter bort → <film>/rutor/
    python dev/detektor/larare/traning.py larare [film …]    # OWLv2 på varje ruta → <film>/owlv2/NNNN.json (återupptagbar)
    python dev/detektor/larare/traning.py facit              # filtren, baksidesflaggan, ignorera-ytorna → <film>/facit.json
    python dev/detektor/larare/traning.py ark                # kontaktarket dev/detektor/larare/traning.html
    python dev/detektor/larare/traning.py lage               # hur långt läraren kommit, per film
    python dev/detektor/larare/traning.py stabilitet         # rörde sig telefonen, och skärpan i lådorna

Filmerna (kameraappen rakt av, 3840 × 2160, 30 bps, liggande, stativ) ligger i
dev/material/inspelningar/2026-09-29-traning-*/telefon.mov. Varje video och
varje fil som skrivs prövas med delning.krav_traning; mappnamnen innehåller
-traning-, och utmappen står som traning i delning.json.

Rutorna tas i full upplösning med ruta.swift (AVFoundation). En ruta behålls
när den skiljer sig från den senast behållna med mer än GRANS gråsteg i snitt
(96 px bred gråskala, som larare/dubbletter.py).

Läraren: exakt grind 1:s inställningar (larare.py): OWLv2 base, de fyra
textfrågorna, tröskel 0,16, NMS 0,6, storleksfilter 0,4–1,6 × kortets yta,
inneslutningsregeln. Kortets yta per film = medianen av säkra lådor (≥ 0,3).
Enda skillnaden: rutan skalas ner till 1920 px bred (INTER_AREA) innan den går
in — OWLv2 ser ändå 960 × 960, och 4K-bilden gör förbehandlingen långsam.

Utdata (gitignorerat): dev/material/arbete/2026-09-29-mes-288-traningsrutor/
  <film>/start/SS.jpg            de första sekunderna, nerskalade (bara för ögat)
  <film>/rutor/NNNN.jpg          behållna rutor, full upplösning (NNNN = sekund × 10)
  <film>/rutor.json              alla provade tider, skillnaden och om rutan behölls
  <film>/owlv2/NNNN.json         råa OWLv2-lådor ≥ 0,02 per ruta (andelar av bilden) + tid
  <film>/facit.json              lärarens facit per ruta: lådor (+ baksida), ignorera-ytor
  ritade/<film>-NNNN.jpg         kontaktarkets bilder, 1600 px
"""
import glob, html, json, os, subprocess, sys, tempfile, time

import cv2
import numpy as np

HAR = os.path.dirname(os.path.abspath(__file__))
DET = os.path.dirname(HAR)
ROT = os.path.dirname(os.path.dirname(DET))
sys.path.insert(0, DET)
from delning import krav_traning  # noqa: E402
from matt import nms, inneslutning, iou, andel_inne, NMS_IOU  # noqa: E402

MAT = os.path.join(ROT, 'dev', 'material')
INSP = os.path.join(MAT, 'inspelningar')
ARB = os.path.join(MAT, 'arbete', '2026-09-29-mes-288-traningsrutor')
FILMER = ['2026-09-29-traning-tra-dagsljus-lampa', '2026-09-29-traning-svartmatta-dagsljus',
          '2026-09-29-traning-vittbord-dagsljus']
KORT = {'2026-09-29-traning-tra-dagsljus-lampa': 'trä, dagsljus + lampa',
        '2026-09-29-traning-svartmatta-dagsljus': 'svart matta, dagsljus',
        '2026-09-29-traning-vittbord-dagsljus': 'vitt bord, dagsljus'}
STEG = 2.0
GRANS = 4.0
IN_BREDD = 1920

FRAGOR = ['playing card', 'trading card', 'card', 'magic the gathering card']
TROSKEL = 0.16
LAG = 0.02
SAKER = 0.3
STORLEK = (0.4, 1.6)


def video(film):
    return krav_traning(os.path.join(INSP, film, 'telefon.mov'))


def mapp(film, *del_):
    p = krav_traning(os.path.join(ARB, film, *del_))
    os.makedirs(p, exist_ok=True)
    return p


def ruta_bin():
    b = os.environ.get('RUTA_BIN')
    if b and os.path.exists(b):
        return b
    b = os.path.join(tempfile.gettempdir(), 'mesa-ruta')
    if not os.path.exists(b):
        subprocess.run(['swiftc', '-O', '-o', b, os.path.join(HAR, 'ruta.swift')], check=True)
    return b


def las_flera(vid, sekunder):
    """-> [(sekund, bild BGR)] i full upplösning, i ordning."""
    tmp = tempfile.mkdtemp(prefix='mesa-tr-')
    arg = []
    for s in sekunder:
        arg += [os.path.join(tmp, f'{s:.2f}.png'), f'{s:.3f}']
    subprocess.run(['nice', '-n', '19', ruta_bin(), vid] + arg, check=True, stdout=subprocess.DEVNULL)
    ut = []
    for s in sekunder:
        f = os.path.join(tmp, f'{s:.2f}.png')
        ut.append((s, cv2.imread(f)))
        os.remove(f)
    os.rmdir(tmp)
    return ut


def langd(vid):
    # AVFoundation via ruta-binären har ingen längdfråga; OpenCV läser huvudet utan att avkoda
    kap = cv2.VideoCapture(vid)
    n, fps = kap.get(cv2.CAP_PROP_FRAME_COUNT), kap.get(cv2.CAP_PROP_FPS) or 30
    kap.release()
    return n / fps


def namn(s):
    return f'{int(round(s * 10)):05d}'


def start(filmer):
    for film in filmer:
        ut = mapp(film, 'start')
        for s, im in las_flera(video(film), [float(t) for t in range(0, 21)]):
            cv2.imwrite(os.path.join(ut, f'{int(s):02d}.jpg'), cv2.resize(im, (960, 540), interpolation=cv2.INTER_AREA),
                        [cv2.IMWRITE_JPEG_QUALITY, 85])
        print(f'{film}: 0–20 s → {ut}', flush=True)


def liten(im):
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    return cv2.resize(g, (96, round(96 * g.shape[0] / g.shape[1])), interpolation=cv2.INTER_AREA).astype(np.float32)


def rutor(filmer):
    for film in filmer:
        vid = video(film)
        T = langd(vid)
        tider = [round(i * STEG, 2) for i in range(int((T - 0.5) / STEG) + 1)]
        ut = mapp(film, 'rutor')
        logg, sist, beh = [], None, 0
        t0 = time.time()
        for i in range(0, len(tider), 20):
            for s, im in las_flera(vid, tider[i:i + 20]):
                if im is None:
                    logg.append(dict(sekund=s, fel='kunde inte läsas'))
                    continue
                g = liten(im)
                d = None if sist is None else float(np.abs(g - sist).mean())
                ny = d is None or d > GRANS
                post = dict(sekund=s, skillnad=None if d is None else round(d, 2), behallen=ny, std=round(float(g.std()), 1))
                if ny:
                    sist = g
                    fil = krav_traning(os.path.join(ut, namn(s) + '.jpg'))
                    cv2.imwrite(fil, im, [cv2.IMWRITE_JPEG_QUALITY, 92])
                    post['fil'] = os.path.relpath(fil, os.path.join(ARB, film))
                    beh += 1
                logg.append(post)
            print(f'  {film}: {min(i + 20, len(tider))}/{len(tider)} provade, {beh} behållna ({time.time() - t0:.0f} s)', flush=True)
        with open(os.path.join(ARB, film, 'rutor.json'), 'w', encoding='utf-8') as f:
            json.dump(dict(video=os.path.relpath(vid, ROT), langd=round(T, 1), steg=STEG, grans=GRANS, rutor=logg), f,
                      ensure_ascii=False, indent=1)
        print(f'{film}: {len(tider)} provade (var {STEG:g} s av {T:.0f} s), {beh} behållna vid > {GRANS:g}', flush=True)


def las_index(film):
    with open(os.path.join(ARB, film, 'rutor.json'), encoding='utf-8') as f:
        return json.load(f)


def larare(filmer):
    import torch
    from PIL import Image
    from transformers import Owlv2Processor, Owlv2ForObjectDetection
    torch.set_grad_enabled(False)
    proc = Owlv2Processor.from_pretrained('google/owlv2-base-patch16-ensemble')
    m = Owlv2ForObjectDetection.from_pretrained('google/owlv2-base-patch16-ensemble').eval()
    texter = [[f'a photo of a {q}' for q in FRAGOR]]

    def detekt(bgr):
        H, W = bgr.shape[:2]
        if W > IN_BREDD:
            bgr = cv2.resize(bgr, (IN_BREDD, round(H * IN_BREDD / W)), interpolation=cv2.INTER_AREA)
        im = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
        w, h = im.size
        inp = proc(text=texter, images=im, return_tensors='pt')
        out = m(**inp)
        s = max(w, h)  # OWLv2 fyller ut till kvadrat
        res = proc.post_process_object_detection(out, threshold=LAG, target_sizes=torch.tensor([[s, s]]))[0]
        return [[b[0] / w, b[1] / h, b[2] / w, b[3] / h, float(sc), FRAGOR[int(l)]]
                for b, sc, l in zip(res['boxes'].tolist(), res['scores'], res['labels'])]

    print(f'torch-trådar {torch.get_num_threads()}', flush=True)
    # Ordningen: grovt till fint och filmerna om vartannat — var 8:e ruta i varje
    # film först, sedan de mellan — så att en avbruten körning ändå täcker alla
    # filmer och hela deras längd.
    RANG = {0: 0, 4: 1, 2: 2, 6: 3, 1: 4, 5: 5, 3: 6, 7: 7}
    jobb, klara = [], {}
    for film in filmer:
        if not os.path.exists(os.path.join(ARB, film, 'rutor.json')):
            print(f'{film}: inga rutor än (kör rutor först) — hoppar över', flush=True)
            continue
        ut = mapp(film, 'owlv2')
        rr = [r for r in las_index(film)['rutor'] if r.get('behallen') and 'fil' in r]
        klara[film] = 0
        for i, r in enumerate(rr):
            j = os.path.join(ut, os.path.basename(r['fil'])[:-4] + '.json')
            if os.path.exists(j):
                klara[film] += 1
            else:
                jobb.append(((RANG[i % 8], i, filmer.index(film)), film, r, j))
    jobb.sort(key=lambda x: x[0])
    print(f'{sum(klara.values())} rutor klara sedan tidigare, {len(jobb)} kvar', flush=True)
    varm = False
    for n_jobb, (_, film, r, j) in enumerate(jobb, 1):
        fil = krav_traning(os.path.join(ARB, film, r['fil']))
        bgr = cv2.imread(fil)
        if not varm:
            detekt(bgr)  # uppvärmning, tiden kastas
            varm = True
        t = time.perf_counter()
        det = detekt(bgr)
        ms = round((time.perf_counter() - t) * 1000)
        tmp = j + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(dict(fil=r['fil'], sekund=r['sekund'], W=bgr.shape[1], H=bgr.shape[0], in_bredd=min(IN_BREDD, bgr.shape[1]),
                           ms=ms, modell='google/owlv2-base-patch16-ensemble', det=det), f)
        os.replace(tmp, j)  # en avbruten körning lämnar aldrig en halv fil
        klara[film] += 1
        print(f'  {film} {r["fil"]:18} {ms:6} ms {len(det):4} råa  [{n_jobb}/{len(jobb)}]', flush=True)
    print('klar: ' + ', '.join(f'{f} {k}' for f, k in klara.items()), flush=True)


def lage():
    for film in FILMER:
        try:
            ix = las_index(film)
        except FileNotFoundError:
            print(f'{film}: inga rutor än')
            continue
        n = sum(1 for r in ix['rutor'] if r.get('behallen'))
        js = glob.glob(os.path.join(ARB, film, 'owlv2', '*.json'))
        ms = sorted(json.load(open(j))['ms'] for j in js)
        med = f', median {ms[len(ms) // 2] / 1000:.1f} s per ruta' if ms else ''
        print(f'{film}: {len(js)}/{n} rutor klara{med}')


# ---------- facit: filtren, baksidan, ignorera ----------

def yta(d):
    return (d[2] - d[0]) * (d[3] - d[1])


def kvot(d, W, H):
    w, h = (d[2] - d[0]) * W, (d[3] - d[1]) * H
    return max(w, h) / max(1e-6, min(w, h))


def las_owl(film):
    ut = {}
    for j in sorted(glob.glob(os.path.join(ARB, film, 'owlv2', '*.json'))):
        b = json.load(open(j, encoding='utf-8'))
        ut[b['fil']] = b
    return ut


def kortyta(res):
    ytor = []
    for b in res.values():
        saker = inneslutning(nms([d for d in b['det'] if d[4] >= SAKER], NMS_IOU))
        ytor += [yta(d) for d in saker]
    return sorted(ytor)[len(ytor) // 2] if ytor else None


# Baksidan: en flagga, inte en klass (Jesper 2026-09-29: klassen heter `baksida`,
# och appen avgör om det är leken eller ett ensamt uppochnervänt kort ur lekens
# plats). Två sorters baksida finns i filmerna:
#   1. Magic-baksidan utan ficka: brun ram och brun oval, blå Magic-logga och
#      Deckmaster-band (svarta mattan, vita bordet).
#   2. Ett kort i en ogenomskinlig ficka (Jespers lek i gröna fickor): en enda
#      färg över nästan hela kortet, och nästan inga kanter.
# En framsida har konst, textruta och ram: många färger och många kanter.
# Mätt i lådans inre (12 % in från varje kant). Gränserna är satta med ögat på
# lådor i filmerna, inte mätta mot ett facit — se TRANINGSRUTOR.md.
BRUN_H = (5, 24)       # OpenCV-nyans 0–180
BLA_H = (95, 125)
BAK_BRUN = 0.45        # mätt på baksidorna i filmerna: 0,46–0,61 med blå logga, 0,83 utan
BAK_BLA = 0.04
BAK_KANT_MIN = 0.03    # en hand har nästan inga kanter
BAK_KANT = 0.10        # baksidorna 0,06–0,08; framsidor 0,08–0,18
EN_FARG = 0.90         # andel av inre ytan inom ±10 nyanssteg från den vanligaste, mättad
EN_FARG_KANT = 0.02    # högst så stor andel kantpunkter (Canny) i inre ytan; gröna fickor 0,00–0,01,
                       # rosa 0,01–0,03, blå framsidor i lampans blå ton 0,03–0,04 (fällde 0,04)
EN_FARG_MATTNAD = 100  # median-mättnad (0–255) i den vanligaste färgen; hud ligger lägre, fickorna över


def fargandel(bgr, d):
    """-> (brun, blå, en färg, kanter, vanligaste nyansen, dess median-mättnad) i lådans inre."""
    H, W = bgr.shape[:2]
    x0, y0, x1, y1 = d[0] * W, d[1] * H, d[2] * W, d[3] * H
    mx, my = (x1 - x0) * 0.12, (y1 - y0) * 0.12
    bit = bgr[max(0, int(y0 + my)):min(H, int(y1 - my)), max(0, int(x0 + mx)):min(W, int(x1 - mx))]
    if bit.size == 0 or min(bit.shape[:2]) < 8:
        return 0.0, 0.0, 0.0, 1.0, -1, 0
    if bit.shape[1] > 200:
        bit = cv2.resize(bit, (200, max(8, round(bit.shape[0] * 200 / bit.shape[1]))), interpolation=cv2.INTER_AREA)
    hsv = cv2.cvtColor(bit, cv2.COLOR_BGR2HSV)
    h, s, v = hsv[..., 0].astype(int), hsv[..., 1], hsv[..., 2]
    fargad = (s > 70) & (v > 35)
    brun = fargad & (h >= BRUN_H[0]) & (h <= BRUN_H[1]) & (v < 200)
    bla = fargad & (h >= BLA_H[0]) & (h <= BLA_H[1])
    if fargad.any():
        topp = int(np.bincount(h[fargad], minlength=180).argmax())
        avst = np.minimum(np.abs(h - topp), 180 - np.abs(h - topp))
        i_topp = fargad & (avst <= 10)
        en = float(i_topp.mean())
        mattn = int(np.median(s[i_topp]))
    else:
        en, topp, mattn = 0.0, -1, 0
    kant = float((cv2.Canny(cv2.cvtColor(bit, cv2.COLOR_BGR2GRAY), 60, 160) > 0).mean())
    return float(brun.mean()), float(bla.mean()), en, kant, topp, mattn


def ar_baksida(brun, bla, en, kant, topp=None, mattnad=None):
    # Magic-baksidan: brun, en blå logga, och några kanter (oval och logga) men
    # färre än en framsida. Utan blått går den inte att skilja från en hand
    # (hud, nästan inga kanter) eller slättkort med solnedgång (brunt, 0,07–0,08
    # kanter) — prövat och förkastat; baksidor utan synlig blå logga (vita bordet)
    # missas därför.
    magic = brun >= BAK_BRUN and bla >= BAK_BLA and BAK_KANT_MIN <= kant <= BAK_KANT
    # en färg: inte hud eller trä (nyans 4–30, som en hand över ett kort), och mättad som en ficka
    ficka = (en >= EN_FARG and kant <= EN_FARG_KANT and (topp is None or not 4 <= topp <= 30)
             and (mattnad is None or mattnad >= EN_FARG_MATTNAD))
    return magic or ficka


# Ignorera-regeln (lärarens facit, samma idé som `ignorerade` i synt-facit):
#   A. en låda över tröskeln som är större än 1,6 × kortet (storleksfiltret
#      tog bort den): den ligger över flera kort — ytan ignoreras.
#   B. en behållen låda som innehåller två eller fler andra lådor av
#      kortstorlek (≥ 60 % av deras yta inne i den): en låda över en hög — ignoreras.
#   C. tre eller fler behållna lådor som hänger ihop genom att ligga omlott
#      (skärningen ≥ 15 % av den mindre lådan): en tät kolumn/landhög — alla
#      lådorna i gruppen blir ignorerade ytor, var och en för sig. En låda med
#      baksidesflaggan (leken) dras aldrig in i en grupp.
#   D. en låda över tröskeln som är mindre än 0,4 × kortet (storleksfiltret
#      tog bort den): ett delvis dolt kort (under hand, i kanten, i en hög) —
#      ytan ignoreras i stället för att bli en negativ.
# Ett kort i en ignorerad yta är varken facit eller negativ för eleven.
INNE_B = 0.6
OMLOTT_C = 0.15
MIN_C = 3


def skarning(a, b):
    ix0, iy0 = max(a[0], b[0]), max(a[1], b[1])
    ix1, iy1 = min(a[2], b[2]), min(a[3], b[3])
    return max(0.0, ix1 - ix0) * max(0.0, iy1 - iy0)


# E. Bordet: telefonen stod still (se stabilitet), så bordets yta kan tas en gång
# per film ur den tomma början: bildpunkter som liknar bordets mitt (Lab-avstånd
# < BORD_AVST), den sammanhängande ytan som når mitten, med hål fyllda och
# BORD_MARGINAL av bildbredden till godo i kanten. En låda vars mitt ligger
# utanför bordet (böcker och leksaker runt det vita bordet) blir ignorerad.
# Träbordet får ingen mask: lampans ljusfläck gör bordet för olikt sig självt
# (masken blev bara mitten), och bordet fyller nästan hela bilden ändå.
BORD_AVST = {'2026-09-29-traning-tra-dagsljus-lampa': None, '2026-09-29-traning-svartmatta-dagsljus': 45,
             '2026-09-29-traning-vittbord-dagsljus': 30}
BORD_MARGINAL = 0.01


def bordsmask(film):
    bak = sorted(glob.glob(os.path.join(BAKGRUND, f'{film}-*.jpg')))
    if not bak or BORD_AVST.get(film) is None:
        return None
    im = cv2.imread(krav_traning(bak[len(bak) // 2]))
    im = cv2.resize(im, (480, 270), interpolation=cv2.INTER_AREA)
    lab = cv2.cvtColor(cv2.GaussianBlur(im, (5, 5), 0), cv2.COLOR_BGR2LAB).astype(np.float32)
    mitt = np.median(lab[108:162, 192:288].reshape(-1, 3), axis=0)
    lik = (np.linalg.norm(lab - mitt, axis=2) < BORD_AVST[film]).astype(np.uint8)
    lik = cv2.morphologyEx(lik, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    n, etik = cv2.connectedComponents(lik)
    mask = (etik == etik[135, 240]).astype(np.uint8)
    # fyll hål (fläckar, ådring, stativets fot inne i bordet): allt utanför
    # bordet som inte når bildens kant hör till bordet
    n, ut = cv2.connectedComponents(1 - mask)
    kant = set(np.unique(np.concatenate([ut[0], ut[-1], ut[:, 0], ut[:, -1]]))) - {0}
    for k in range(1, n):
        if k not in kant:
            mask[ut == k] = 1
    m = max(1, round(BORD_MARGINAL * 480))
    mask = cv2.dilate(mask, np.ones((2 * m + 1, 2 * m + 1), np.uint8))
    cv2.imwrite(krav_traning(os.path.join(ARB, film, 'bord.png')), mask * 255)
    return mask


def pa_bordet(mask, d):
    if mask is None:
        return True
    cx, cy = (d[0] + d[2]) / 2, (d[1] + d[3]) / 2
    return bool(mask[min(269, max(0, int(cy * 270))), min(479, max(0, int(cx * 480)))])


def facit_ruta(b, ky, bgr=None, bord=None):
    alla = nms([d for d in b['det'] if d[4] >= TROSKEL], NMS_IOU)
    over = [d for d in alla if pa_bordet(bord, d)]
    ign_e = [dict(lada=d[:4], poang=round(d[4], 3), regel='E', vad='utanför bordet') for d in alla if not pa_bordet(bord, d)]
    ok = [d for d in over if STORLEK[0] * ky <= yta(d) <= STORLEK[1] * ky]
    stora = [d for d in over if yta(d) > STORLEK[1] * ky]
    sma = [d for d in over if yta(d) < STORLEK[0] * ky]
    behall = inneslutning(ok)
    ign = [dict(lada=d[:4], poang=round(d[4], 3), regel='A', vad='låda över flera kort (> 1,6 × kortet)') for d in stora]
    # B: bara lådor av kortstorlek räknas som "andra kort" — konstverket och
    # textrutan på samma kort (små lådor) gör inte ett kort till en hög
    kvar = []
    for d in behall:
        inne = [e for e in ok if e is not d and andel_inne(e, d) >= INNE_B]
        if len(inne) >= 2:
            ign.append(dict(lada=d[:4], poang=round(d[4], 3), regel='B', vad=f'låda runt {len(inne)} andra lådor (hög)'))
        else:
            kvar.append(d)
    # baksidan mäts före C: leken (en baksida) ligger ofta intill en hög men är
    # själv ett kort i facit, och ska inte dras in i högens grupp
    farg = {}
    for d in kvar:
        if bgr is not None:
            brun, bla, en, kant, topp, mattn = fargandel(bgr, d)
            farg[id(d)] = dict(brun=round(brun, 3), bla=round(bla, 3), en_farg=round(en, 3), kanter=round(kant, 3),
                               nyans=topp, mattnad=mattn, baksida=ar_baksida(brun, bla, en, kant, topp, mattn))
    facit = [d for d in kvar if farg.get(id(d), {}).get('baksida')]
    kvar = [d for d in kvar if not farg.get(id(d), {}).get('baksida')]
    # C: grupper av omlott-lådor
    n = len(kvar)
    grann = [[j for j in range(n) if j != i and skarning(kvar[i], kvar[j]) >= OMLOTT_C * min(yta(kvar[i]), yta(kvar[j]))] for i in range(n)]
    grupp, g = [-1] * n, 0
    for i in range(n):
        if grupp[i] >= 0:
            continue
        stack, grupp[i] = [i], g
        while stack:
            k = stack.pop()
            for j in grann[k]:
                if grupp[j] < 0:
                    grupp[j] = g
                    stack.append(j)
        g += 1
    for gi in range(g):
        med = [kvar[i] for i in range(n) if grupp[i] == gi]
        if len(med) >= MIN_C:
            # varje låda i gruppen blir en ignorerad yta för sig (inte gruppens
            # omslutande rektangel, som drog in fristående kort bredvid högen)
            ign += [dict(lada=d[:4], poang=round(d[4], 3), regel='C', grupp=gi, vad=f'en av {len(med)} lådor omlott (tät kolumn/hög)')
                    for d in med]
        else:
            facit += med
    ign += [dict(lada=d[:4], poang=round(d[4], 3), regel='D', vad='del av ett kort (< 0,4 × kortet)') for d in sma]
    ign += ign_e
    lador = []
    for d in sorted(facit, key=lambda d: (d[1], d[0])):
        post = dict(lada=[round(v, 5) for v in d[:4]], poang=round(d[4], 3), fraga=d[5])
        post.update(farg.get(id(d), {}))
        lador.append(post)
    for x in ign:
        x['lada'] = [round(v, 5) for v in x['lada']]
    return lador, ign


def facit():
    for film in FILMER:
        res = las_owl(film)
        if not res:
            print(f'{film}: inga lärarlådor än')
            continue
        ky = kortyta(res)
        bord = bordsmask(film)
        ut = dict(installning=dict(troskel=TROSKEL, nms=NMS_IOU, storlek=STORLEK, inneslutning=0.8, fragor=FRAGOR, in_bredd=IN_BREDD,
                                   ignorera=dict(A='> 1,6 × kortet', B=f'innehåller ≥ 2 lådor av kortstorlek (≥ {INNE_B} inne)',
                                                 C=f'≥ {MIN_C} lådor omlott (skärning ≥ {OMLOTT_C} av den mindre), var och en',
                                                 D='< 0,4 × kortet', E='lådans mitt utanför bordet (bord.png)'),
                                   baksida=dict(brun_h=BRUN_H, bla_h=BLA_H, brun_min=BAK_BRUN, bla_min=BAK_BLA,
                                                magic_kanter=(BAK_KANT_MIN, BAK_KANT), en_farg_min=EN_FARG,
                                                kanter_max=EN_FARG_KANT, mattnad_min=EN_FARG_MATTNAD, ej_nyans='4–30 (hud, trä)')),
                  kortyta=ky, rutor={})
        for fil, b in sorted(res.items()):
            bgr = cv2.imread(krav_traning(os.path.join(ARB, film, fil)))
            lador, ign = facit_ruta(b, ky, bgr, bord)
            ut['rutor'][fil] = dict(sekund=b['sekund'], ms=b['ms'], lador=lador, ignorera=ign)
        with open(krav_traning(os.path.join(ARB, film, 'facit.json')), 'w', encoding='utf-8') as f:
            json.dump(ut, f, ensure_ascii=False, indent=1)
        R = ut['rutor'].values()
        nl = sum(len(r['lador']) for r in R)
        ni = sum(len(r['ignorera']) for r in R)
        nb = sum(sum(1 for l in r['lador'] if l.get('baksida')) for r in R)
        print(f'{film}: {len(R)} rutor, kortyta {ky:.5f} av bilden (≈ {ky * 3840 * 2160:.0f} px² i 4K), '
              f'{nl} facit-lådor, {nb} baksida, {ni} ignorera')


# ---------- stativet och skärpan ----------

def stabilitet():
    """Rörde sig telefonen? Förskjutning (faskorrelation, 960 px gråskala, bara
    bildens högra tiondel där inga kort ligger) mellan filmens första ruta och
    varje behållen ruta, räknat i 4K-bildpunkter. En stor förskjutning i en
    enstaka ruta kan vara en hand i kanten; en bestående förskjutning är stativet.
    Skärpan: variansen av Laplace i lärarens lådor (960 px), median per film."""
    for film in FILMER:
        try:
            ix = las_index(film)
        except FileNotFoundError:
            continue
        filer = [r['fil'] for r in ix['rutor'] if r.get('fil')]
        def g(f):
            im = cv2.imread(os.path.join(ARB, film, f), cv2.IMREAD_GRAYSCALE)
            return cv2.resize(im, (960, 540), interpolation=cv2.INTER_AREA).astype(np.float32)
        # bara högra tiondelen av bilden: där ligger inga kort, bara bordskanten och omgivningen
        # mallsökning: mitten av referensens band (± 10 px i sidled, ± 60 px i höjdled, 960 px-skala)
        band = lambda im: np.ascontiguousarray(im[:, 864:])
        mall = band(g(filer[0]))[60:480, 10:86]
        sk = []
        for f in filer[1:]:
            res = cv2.matchTemplate(band(g(f)), mall, cv2.TM_CCOEFF_NORMED)
            _, resp, _, (x, y) = cv2.minMaxLoc(res)
            sk.append((f, (x - 10) * 4, (y - 60) * 4, resp))
        skymda = [x for x in sk if x[3] < 0.8]   # en hand eller arm i bandet: mallen hittas inte, rutan räknas inte
        print(f'{film}: {len(skymda)} rutor där högra kanten är skymd (mallträff < 0,8) räknas inte')
        sk = [x for x in sk if x[3] >= 0.8]
        hopp = [(b[0], np.hypot(b[1] - a[1], b[2] - a[2])) for a, b in zip(sk, sk[1:]) if np.hypot(b[1] - a[1], b[2] - a[2]) > 12]
        print(f'{film}: {len(filer)} rutor · förskjutning mot första rutan (4K-px, steg 4 px): '
              f'median {np.median([np.hypot(x[1], x[2]) for x in sk]):.0f}, största {max(np.hypot(x[1], x[2]) for x in sk):.0f}, '
              f'sämsta mallträff {min(x[3] for x in sk):.2f} · hopp > 12 px mellan två rutor i följd: {len(hopp)}')
        for f, h in hopp[:8]:
            print(f'    hopp {h:.0f} px vid {f}')
        fac_p = os.path.join(ARB, film, 'facit.json')
        if os.path.exists(fac_p):
            fac = json.load(open(fac_p, encoding='utf-8'))
            var = []
            for fil, r in fac['rutor'].items():
                im = cv2.imread(os.path.join(ARB, film, fil), cv2.IMREAD_GRAYSCALE)
                im = cv2.resize(im, (960, 540), interpolation=cv2.INTER_AREA)
                for l in r['lador']:
                    b = l['lada']
                    bit = im[int(b[1] * 540):int(b[3] * 540), int(b[0] * 960):int(b[2] * 960)]
                    if bit.size > 100:
                        var.append(float(cv2.Laplacian(bit, cv2.CV_64F).var()))
            if var:
                var.sort()
                print(f'    skärpa i lådorna (Laplace-varians, 960 px): median {var[len(var) // 2]:.0f}, '
                      f'10:e percentilen {var[len(var) // 10]:.0f}, {len(var)} lådor')


# ---------- kontaktarket ----------

ARK_PER_FILM = 8
BAKGRUND = os.path.join(MAT, 'arbete', '2026-09-29-mes-288-synt', 'bakgrund')
# Rutor som valts för hand till arket (film -> fil), utöver de automatiskt valda; fylls i efter att rutorna setts.
HANDVALDA = {}


def valj_ark(film, fac):
    """~8 rutor spridda över filmen: filmen delas i lika långa bitar, och i varje bit
    tas rutan med mest att titta på (lådor + ignorerade ytor + baksidor)."""
    R = sorted(fac['rutor'].items(), key=lambda kv: kv[1]['sekund'])
    if not R:
        return []
    T = R[-1][1]['sekund'] + 1
    val = list(HANDVALDA.get(film, []))
    for i in range(ARK_PER_FILM - len(val)):
        bit = [kv for kv in R if i * T / (ARK_PER_FILM - len(val)) <= kv[1]['sekund'] < (i + 1) * T / (ARK_PER_FILM - len(val))]
        if not bit:
            continue
        def varde(kv):
            r = kv[1]
            return len(r['lador']) + 3 * len(r['ignorera']) + 2 * sum(1 for l in r['lador'] if l.get('baksida'))
        val.append(max(bit, key=varde)[0])
    return sorted(set(val), key=lambda f: fac['rutor'][f]['sekund'])


def rita_ruta(film, fil, r):
    from PIL import Image, ImageDraw, ImageFont
    im = Image.open(krav_traning(os.path.join(ARB, film, fil))).convert('RGB')
    W0 = 1600
    im = im.resize((W0, round(im.size[1] * W0 / im.size[0])), Image.LANCZOS)
    W, H = im.size
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 22)
    except OSError:
        font = ImageFont.load_default()
    lager = Image.new('RGBA', im.size, (0, 0, 0, 0))
    dl = ImageDraw.Draw(lager)
    for x in r['ignorera']:
        b = x['lada']
        dl.rectangle((b[0] * W, b[1] * H, b[2] * W, b[3] * H), fill=(90, 90, 90, 110))
    im = Image.alpha_composite(im.convert('RGBA'), lager).convert('RGB')
    d = ImageDraw.Draw(im)
    for x in r['ignorera']:
        b = x['lada']
        x0, y0, x1, y1 = b[0] * W, b[1] * H, b[2] * W, b[3] * H
        for k in range(int(x0), int(x1), 16):   # streckad kant
            d.line((k, y0, min(k + 8, x1), y0), fill=(255, 170, 0), width=3)
            d.line((k, y1, min(k + 8, x1), y1), fill=(255, 170, 0), width=3)
        for k in range(int(y0), int(y1), 16):
            d.line((x0, k, x0, min(k + 8, y1)), fill=(255, 170, 0), width=3)
            d.line((x1, k, x1, min(k + 8, y1)), fill=(255, 170, 0), width=3)
        t = f'ignorera {x["regel"]}'
        d.rectangle((x0, y1 - 26, x0 + d.textlength(t, font=font) + 8, y1), fill=(255, 170, 0))
        d.text((x0 + 4, y1 - 25), t, fill=(0, 0, 0), font=font)
    for n, l in enumerate(r['lador'], 1):
        b = l['lada']
        x0, y0, x1, y1 = b[0] * W, b[1] * H, b[2] * W, b[3] * H
        farg = (0, 200, 255) if l.get('baksida') else (255, 0, 255)
        d.rectangle((x0, y0, x1, y1), outline=farg, width=4)
        t = f'{n}: {l["poang"]:.2f}' + (' baksida' if l.get('baksida') else '')
        d.rectangle((x0, y0, x0 + d.textlength(t, font=font) + 8, y0 + 26), fill=farg)
        d.text((x0 + 4, y0 + 1), t, fill=(255, 255, 255) if not l.get('baksida') else (0, 0, 0), font=font)
    os.makedirs(krav_traning(os.path.join(ARB, 'ritade')), exist_ok=True)
    ut = krav_traning(os.path.join(ARB, 'ritade', f'{film}-{os.path.basename(fil)}'))
    im.save(ut, quality=86)
    return ut


def ark():
    rel = lambda p: html.escape(os.path.relpath(p, HAR))
    delar, summa = [], []
    for film in FILMER:
        try:
            fac = json.load(open(os.path.join(ARB, film, 'facit.json'), encoding='utf-8'))
        except FileNotFoundError:
            continue
        ix = las_index(film)
        R = fac['rutor']
        n = len(R)
        nl = sum(len(r['lador']) for r in R.values())
        ni = sum(len(r['ignorera']) for r in R.values())
        nb = sum(sum(1 for l in r['lador'] if l.get('baksida')) for r in R.values())
        provade = len(ix['rutor'])
        behallna = sum(1 for r in ix['rutor'] if r.get('behallen'))
        summa.append(f'<tr><td>{html.escape(KORT[film])}</td><td>{provade}</td><td>{behallna}</td><td>{n}</td><td>{nl}</td>'
                     f'<td>{nb}</td><td>{ni}</td></tr>')
        figs = []
        for fil in valj_ark(film, fac):
            r = R[fil]
            bild = rita_ruta(film, fil, r)
            m, s = divmod(int(r['sekund']), 60)
            ign = ', '.join(f'{x["regel"]}: {html.escape(x["vad"])}' for x in r['ignorera'])
            nb_r = sum(1 for l in r['lador'] if l.get('baksida'))
            n_l, n_i = len(r['lador']), len(r['ignorera'])
            extra = (f' · {nb_r} baksida' if nb_r else '') + (f' · {n_i} ignorerade ytor' if n_i else '')
            ign_t = f'<br><span class="oga">{ign}</span>' if ign else ''
            figs.append(f'<figure><img loading="lazy" src="{rel(bild)}" alt="{m}:{s:02d}"><figcaption><b>{m}:{s:02d}</b> · '
                        f'<span class="n">{n_l} lådor</span>{extra}{ign_t}</figcaption></figure>')
        bak = sorted(glob.glob(os.path.join(BAKGRUND, f'{film}-*.jpg')))
        bak = [bak[0], bak[-1]] if len(bak) > 1 else bak
        for b in bak:
            krav_traning(b)
            figs.append(f'<figure><img loading="lazy" src="{rel(b)}" alt="bakgrund"><figcaption><b>Bakgrund</b> · '
                        f'{html.escape(os.path.basename(b))} · tomt bord ur filmens början (synt/bakgrund.py)</figcaption></figure>')
        delar.append(f'<h2>{html.escape(KORT[film])}</h2><p class="kalla"><code>dev/material/inspelningar/{film}/telefon.mov</code> · '
                     f'kortets yta ≈ {fac["kortyta"] * 3840 * 2160 / 1e3:.0f}000 px² i 4K · {n} rutor med lärarlådor</p>'
                     f'<div class="grid">{"".join(figs)}</div>')
    sida = f'''<!doctype html>
<html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Träningsrutor och lärare</title>
<style>
:root {{ --bg:#f6f5f2; --fg:#1d1d1f; --mut:#5f5f66; --kort:#fff; --kant:#dddbd5; }}
@media (prefers-color-scheme: dark) {{ :root {{ --bg:#16161a; --fg:#ecebe8; --mut:#a3a2a8; --kort:#222228; --kant:#34343c; }} }}
body {{ margin:0; background:var(--bg); color:var(--fg); font:15px/1.45 -apple-system, system-ui, sans-serif; }}
main {{ max-width:1500px; margin:0 auto; padding:16px; }}
h1 {{ font-size:22px; margin:8px 0 4px; }} h2 {{ font-size:18px; margin:28px 0 2px; }}
p {{ color:var(--mut); max-width:950px; margin:6px 0; }}
table {{ border-collapse:collapse; margin:10px 0; font-size:14px; }}
td, th {{ border:1px solid var(--kant); padding:4px 10px; text-align:right; }} td:first-child, th:first-child {{ text-align:left; }}
.lg span {{ display:inline-block; padding:1px 8px; border-radius:4px; margin-right:8px; font-weight:600; }}
.grid {{ display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, 640px), 1fr)); gap:16px; margin-top:12px; }}
figure {{ margin:0; background:var(--kort); border:1px solid var(--kant); border-radius:8px; overflow:hidden; }}
figure img {{ width:100%; display:block; }}
figcaption {{ padding:8px 10px; font-size:14px; }}
code {{ color:var(--mut); font-size:12px; word-break:break-all; }}
.n {{ font-weight:600; }} .oga {{ color:var(--mut); }}
</style></head><body><main>
<h1>Lärarens lådor på Jespers träningsfilmer 2026-09-29 (MES-288)</h1>
<p>Rutor ur de tre träningsfilmerna (kameraappen, 4K, stativ), en var 2 s, nästan-dubbletter bortsorterade.
Bara träningsmaterial — inga provbilder (<code>dev/detektor/DELNING.md</code>). Lådorna är OWLv2 base med grind 1:s
inställningar (tröskel 0,16, NMS 0,6, storleksfilter 0,4–1,6 × kortet, inneslutningsregeln). Åtta rutor per film,
spridda över filmen, i varje del den med mest att titta på. Siffror och bedömning: <code>dev/detektor/larare/TRANINGSRUTOR.md</code>.</p>
<p class="lg"><span style="background:#ff00ff;color:#fff">1: 0,45</span> lärarens facit (nummer: poäng)
<span style="background:#00c8ff;color:#000">2: 0,30 baksida</span> facit med baksidesflaggan (färgtest: brunt + blått)
<span style="background:#ffaa00;color:#000">ignorera A–D</span> grå, streckad yta: varken facit eller negativ</p>
<p><b>Ignorera:</b> A = låda större än 1,6 × kortet (över flera kort) · B = låda runt två eller fler andra kortstora lådor (hög) ·
C = en av tre eller fler lådor omlott i en grupp (tät kolumn, landhög) · D = låda mindre än 0,4 × kortet (del av ett kort) ·
E = lådans mitt utanför bordet (böcker och leksaker runt det vita bordet). En facit-låda inne i en ignorerad yta är fortfarande facit.</p>
<table><tr><th>Film</th><th>Provade rutor</th><th>Behållna</th><th>Med lärarlådor</th><th>Facit-lådor</th><th>Baksida</th><th>Ignorerade ytor</th></tr>
{"".join(summa)}</table>
{"".join(delar)}
</main></body></html>
'''
    with open(os.path.join(HAR, 'traning.html'), 'w', encoding='utf-8') as f:
        f.write(sida)
    print(f'{os.path.join(HAR, "traning.html")}')


if __name__ == '__main__':
    steg = sys.argv[1] if len(sys.argv) > 1 else ''
    val = [f for f in FILMER if not sys.argv[2:] or any(a in f for a in sys.argv[2:])]
    if steg == 'start':
        start(val)
    elif steg == 'rutor':
        rutor(val)
    elif steg == 'larare':
        larare(val)
    elif steg == 'lage':
        lage()
    elif steg == 'facit':
        facit()
    elif steg == 'ark':
        ark()
    elif steg == 'stabilitet':
        stabilitet()
    else:
        print(__doc__)

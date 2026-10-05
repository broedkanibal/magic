#!/usr/bin/env python3
"""Märkningen av träningsklippen: namnen ur 4K, beskärningar i telefonens kvalitet.

Uppdraget: dev/plan/spec-markning-2026-10-05.md. Hur man kör och vad filerna betyder:
dev/remsa/tran/MARKNING.md.

Stegen (varje steg läser föregående stegs JSON och körs inte om när utdata finns — --om tvingar):

  A detektera  4K avkodas EN gång: detektorn på var 6:e ruta (appens avkodning och parning,
               para_cli.cjs) + ett rörelsemått per parad låda          → detektioner.json
  B spar       spår, stillhet, lägg-ögonblick, lägen att spara, högar   → spar.json, tidpunkter.json
  C namn       lägg-ögonblickets hel/app-utsnitt i 4K (cachat i utsnitt/4k, avkodat en gång): vittne 1 =
               Claude (Messages-API, egen kort fråga, högst två frågor per spår, svaren cachade), namnet
               normaliserat mot Scryfalls lista; vittne 2 = bildmodellen (topp-1) eller ORB; domen
               (D: namnet följer spåret). Textläsaren bara med --ocr.  → vittnen.json, markning.json
  E beskar     beskärningar hel/remsa × app/rata × 4k/1080 för säkra spår och baksidor
                                                                       → tran/, val/, markning.json
  F rapport    tabell per klipp och pass + montage.jpg per klipp         → <pass>/rapport.md

    PY=~/.mesa/detektor-venv/bin/python
    $PY dev/remsa/tran/mark.py klipp <fil.MOV> [--fran S] [--till S] [--om B,C,E|alla] [--ocr] [--utan-avkodning] [--uppskatta]
    $PY dev/remsa/tran/mark.py detektera|spar|namn|beskar <fil.MOV> [--fran S] [--till S] [--om]
    $PY dev/remsa/tran/mark.py pass <passmapp>        alla klipp i passet i ordning (1, 2, 3), sedan rapport
    $PY dev/remsa/tran/mark.py rapport <passmapp>

Före varje 4K-avkodning väntar skriptet så länge en golden körs (pgrep -f dev/golden/kor.cjs).
"""
import argparse, glob, hashlib, json, math, os, random, shutil, subprocess, sys, time, urllib.parse, urllib.request
import numpy as np
import cv2

HAR = os.path.dirname(os.path.abspath(__file__))
REMSA = os.path.dirname(HAR)
ROT = os.path.dirname(os.path.dirname(REMSA))
DET = os.path.join(ROT, 'dev', 'detektor')
for p in (REMSA, DET, os.path.join(DET, 'tran')):
    sys.path.insert(0, p)
from delning import krav_traning  # noqa: E402
from prov import forbehandla  # noqa: E402
from lib import Bildmodell, Referenser, kvadrat, skala_webb, las_lek, ref_strip, MODELL  # noqa: E402
from kalibrering import utan_marginal  # noqa: E402
import remsnamn  # noqa: E402
from remsnamn import skar, rata, vinkel_ur_lada  # noqa: E402

ARBETE = os.path.join(ROT, 'dev', 'material', 'arbete', 'markning')
ONNX = os.path.join(DET, 'modell', 'yolox_nano_mesa_960x544.onnx')
PARA_CLI = os.path.join(DET, 'modell', 'para_cli.cjs')
OCR_CJS = os.path.join(REMSA, 'ocr.cjs')
NAMNFIL = os.path.join(ARBETE, 'scryfall-namn.json')
SLUMPFIL = os.path.join(ARBETE, 'slumpnamn.json')
KONSTFIL = os.path.join(ARBETE, 'konstverk.json')
REF = os.path.join(ARBETE, 'ref')
VEK = os.path.join(ARBETE, 'vek')
UA = {'User-Agent': 'mesa-markning/0.1 (dev tools)', 'Accept': 'application/json'}   # som namn.py
BAS = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest']
# Kortbaksidan som ett eget "kort" i kandidatleken, som appens lek (dev/embed/urval.cjs BAKSIDA)
BAKSIDA = {'id': 'baksida', 'normal': 'https://backs.scryfall.io/normal/0/a/0aeebaf5-8c7d-4636-9e82-8c27447861f7.jpg'}
KVOT = 88 / 63            # kortets långsida / kortsida
BESKAR_BREDD = 720        # index.html: beskärningens kortsida högst så här (bara nedskalning)
MARG_HEL = 0.08           # Kamera.beskar: 8 % marginal runt lådan
MARG_REMSA = remsnamn.MARG

# Reglerna, i ett ställe (skrivs in i varje utdatafil så att en körning går att läsa i efterhand).
R = {
    'steg': 6,                 # var 6:e ruta = 5 rutor/s i 30 b/s
    'golv': 0.02,              # detektor.js T.golv: råa rader under detta läses aldrig — sparas inte
    'ror_marg': 0.10,          # rörelsemåttet: lådan + 10 % marginal per sida
    # B: ett spår fortsätter bara på en låda som är nästan densamma (IoU ≥ 0,9) eller ligger inom dess förra
    # (innesluten ≥ 0,9: kortet blir täckt). En låda som växer eller flyttar sig är ett NYTT spår med eget
    # lägg-ögonblick. Med IoU 0,5 tog det undre kortets spår över lådan för kortet som lades ovanpå (förskjutet
    # 45 px, IoU 0,78) och gav det fel namn (granskningen av e374112, sim_hog.py).
    'spar_iou': 0.9,
    'spar_inne': 0.9,
    'glapp_s': 1.0,            # ett spår slutar när ingen låda matchar på 1 s
    'stilla_centrum': 0.01,    # stilla: centrum flyttat < 1 % av kortsidan …
    'stilla_ror': 4.0,         # … och rörelsemåttet < 4 gråsteg (sensorbruset ~3, MES-246)
    'lagg_prov': 3,            # stilla i ≥ 0,5 s = 3 prov i rad
    'lagg_form': 0.07,         # lådans form inom 7 % av kortets (i remsans vinkel)
    'lagg_fonster_s': 3.0,     # lägg-ögonblicket måste komma inom 3 s från spårets start
    'remsa_iou': 0.5,          # en remsa, ett kort
    'lage_var_s': 3.0,         # ett läge var 3:e sekund …
    'lage_max': 10,            # … högst 10 per spår
    'synlig_byte': 0.15,       # nytt läge när synlig andel ändras mer än så
    'hog_iou': 0.2,            # i hög: IoU > 0,2 mot ett annat levande spår …
    'hog_synlig': 0.85,        # … eller delvis täckt (synlig < 0,85) och kant i kant med ett (inom 3 % av kortsidan)
    'hog_kant': 0.03,
    'hog_min_s': 1.0,          # en hög i tidpunkter.json ska ligga minst 1 s (en hand som för ett kort över ett annat är ingen hög)
    'rata_min': 10, 'rata_max': 40,   # rata-utsnittet bara när kortet ligger 10–40° från närmaste bildaxel
    'ocr_poang': 0.6, 'ocr_marg': 0.2, 'ocr_ser': 0.4,   # appens sakertNamn; 0,4 = textläsaren "ser något"
    'hel_marg': 0.11, 'remsa_marg': 0.20,                # bildmodellen: hela kortet / remsan
    'slump_n': 200, 'slump_fro': 1, 'bas_tak': 24, 'konst_tak': 12,
    'val_var': 5, 'val_fro': 1,
    'remsa_lan_s': 1.0,        # remslådan får lånas ur samma stillhet (inom 1 s, samma låda) när provet saknar den …
    'remsa_lan_iou': 0.9,      # … och lådan är densamma (IoU ≥ 0,9)
    'jpeg': 95,
}


def logg(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def rel(p):
    return os.path.relpath(p, ROT)


def las_json(fil):
    with open(fil, encoding='utf-8') as f:
        return json.load(f)


def skriv_json(fil, d, kompakt=False):
    os.makedirs(os.path.dirname(fil), exist_ok=True)
    tmp = fil + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        if kompakt:
            json.dump(d, f, ensure_ascii=False, separators=(',', ':'))
        else:
            json.dump(d, f, ensure_ascii=False, indent=1)
    os.replace(tmp, fil)


def golden_kors():
    """Körs en golden (node dev/golden/kor.cjs) på datorn? Bara node-processer räknas: ett skal vars
    kommandorad råkar innehålla mönstret (t.ex. en egen pgrep-kontroll) är ingen golden — utan det väntade
    skriptet på sig självt."""
    r = subprocess.run(['pgrep', '-f', 'dev/golden/kor.cjs'], capture_output=True, text=True)
    for pid in r.stdout.split():
        c = subprocess.run(['ps', '-o', 'comm=', '-p', pid], capture_output=True, text=True).stdout.strip()
        if os.path.basename(c) == 'node':
            return True
    return False


def vanta_pa_golden():
    """Ingen 4K-avkodning medan en golden körs: lasten förstör deras tal (handovern, Snålt)."""
    while golden_kors():
        logg('en golden körs (pgrep -f dev/golden/kor.cjs) — väntar 120 s')
        time.sleep(120)


def tal(x):
    return ('%g' % x).replace('.', ',')


def klippmapp(klipp, fran=0.0, till=None):
    """dev/material/arbete/markning/<passmapp>/<klipp>[_<fran>-<till>s]/ — ett utsnitt får egen mapp, så att
    provet aldrig blandas ihop med hela klippet (och aldrig räknas in i passets kandidatlek)."""
    klipp = os.path.abspath(klipp)
    pass_ = os.path.basename(os.path.dirname(klipp))
    stem = os.path.splitext(os.path.basename(klipp))[0]
    del_ = '' if (not fran and till is None) else f"_{tal(fran or 0)}-{tal(till) if till is not None else 'slut'}s"
    return os.path.join(ARBETE, pass_, stem + del_)


# ── geometri ─────────────────────────────────────────────────────────────────
def iou(a, b):
    ix = max(0.0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    i = ix * iy
    u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - i
    return i / u if u > 0 else 0.0


def skarning(a, b):
    ix = max(0.0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    return ix * iy


def inne(a, b):
    """Andelen av a som ligger inne i b."""
    y = (a[2] - a[0]) * (a[3] - a[1])
    return skarning(a, b) / y if y > 0 else 0.0


def mitt(b):
    return ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)


def wh(b):
    return b[2] - b[0], b[3] - b[1]


def kantavstand(r, b):
    """Hur långt remsan sitter från lådans närmaste parallella kant (bildpunkter)."""
    w, h = wh(r)
    if w >= h:
        return min(abs(r[1] - b[1]), abs(r[3] - b[3]))
    return min(abs(r[0] - b[0]), abs(r[2] - b[2]))


def kortform(lada, vinkel_abs, kvot=KVOT):
    """Har lådan formen av ETT helt kort i remsans vinkel (inom 7 %)? Vinkel 0 = remsan vågrät (kortet
    upprätt), 90 = lodrät (tappat). kvot: kortlådans långsida/kortsida i klippet (kortkvot(), mätt på
    ensamma, stilla, raka kort med remsa; förval 88/63 = specens 1,40). Vid 0 och 90° är det specens regel;
    däremellan den låda ett snett kort ger — annars får pass 3 klipp 3 (bilden ~30° vriden) inga
    lägg-ögonblick alls. Utan vinkel (baksida, ingen remsa) godtas båda lägena."""
    w, h = wh(lada)
    if w <= 0 or h <= 0:
        return False
    if vinkel_abs is None:
        return abs(max(w, h) / min(w, h) / kvot - 1) <= R['lagg_form']
    t = math.radians(vinkel_abs)
    c, s = abs(math.cos(t)), abs(math.sin(t))
    we, he = c + kvot * s, s + kvot * c
    return abs((w / h) / (we / he) - 1) <= R['lagg_form']


def kortkvot(rutor):
    """Kortlådans form i klippet: medianen av långsida/kortsida för lådor som ligger ensamma (ingen annan
    låda skär dem), stilla (rörelse < 4 mot föregående och nästa prov) och raka (remsans vinkel < 5° från en
    bildaxel). Pass 2 klipp 1 (0–30 s): 1,342 (5–95 %: 1,279–1,370) — 0,5×-objektivet och fickorna gör
    lådan bredare än kortets 1,40, och med specens fasta 1,40 ± 7 % föll en tredjedel av de stilla
    ensamma korten (1,27–1,30) bort. None under 10 sådana lådor."""
    k = []
    for s in rutor:
        P = s['par']
        for j, p in enumerate(P):
            if not p['remsa'] or p.get('ror') is None or p.get('ror_n') is None or p['ror'] >= R['stilla_ror'] or p['ror_n'] >= R['stilla_ror']:
                continue
            th = remsvinkel(p['remsa'])
            if 5 <= th <= 85:
                continue
            b = p['lada']
            if any(skarning(b, q['lada']) > 0 for i, q in enumerate(P) if i != j):
                continue
            w, h = wh(b)
            kv = max(w, h) / max(1e-6, min(w, h))
            if 1.15 <= kv <= 1.65:
                k.append(kv)
    return (float(np.median(k)), len(k)) if len(k) >= 10 else (None, len(k))


def snedhet(vinkel_abs):
    return None if vinkel_abs is None else min(vinkel_abs, 90 - vinkel_abs)


def remsvinkel(remsa):
    if not remsa:
        return None
    w, h = wh(remsa)
    return round(float(vinkel_ur_lada(w, h)), 1)


def andelar(b, W, H):
    return [b[0] / W, b[1] / H, b[2] / W, b[3] / H]


# ── videon ───────────────────────────────────────────────────────────────────
class Video:
    """4K-klippet. Spärren först: krav_traning på sökvägen (och dess realpath) innan något läses."""

    def __init__(self, fil):
        krav_traning(fil)
        self.fil = fil
        self.c = cv2.VideoCapture(fil)
        if not self.c.isOpened():
            raise SystemExit(f'kan inte öppna {fil}')
        self.fps = float(self.c.get(cv2.CAP_PROP_FPS))
        self.n = int(self.c.get(cv2.CAP_PROP_FRAME_COUNT))
        self.W = int(self.c.get(cv2.CAP_PROP_FRAME_WIDTH)); self.H = int(self.c.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.pos = 0
        self.hopp = 0

    def hoppa(self, i):
        self.c.set(cv2.CAP_PROP_POS_FRAMES, i)
        self.pos = i
        self.hopp += 1

    def ruta(self, i, fram=45):
        """Ruta i exakt (seek är exakt i cv2 för de här HEVC-klippen: 0,0 i skillnad mot sekventiell
        avkodning, kontrollerat 2026-10-05). Närmare än `fram` rutor framåt: grab() fram dit i stället."""
        if i < self.pos or i - self.pos > fram:
            self.hoppa(i)
        while self.pos < i:
            if not self.c.grab():
                raise SystemExit(f'ruta {self.pos} gick inte att läsa')
            self.pos += 1
        ok, img = self.c.read()
        if not ok:
            raise SystemExit(f'ruta {i} gick inte att läsa')
        self.pos += 1
        return img


def ruta_1080(img4k):
    return skala_webb(img4k, 1920, 1080)


# ── steg A: detektioner ──────────────────────────────────────────────────────
def kor_para(batch, W, H, tmp):
    man = {'bilder': [{'id': str(b['idx']), 'W': W, 'H': H, 'r': b['r'], 'ut': b['fil']} for b in batch]}
    mf, uf = os.path.join(tmp, 'manifest.json'), os.path.join(tmp, 'ut.json')
    with open(mf, 'w') as f:
        json.dump(man, f)
    subprocess.run(['node', PARA_CLI, mf, uf], check=True)
    with open(uf) as f:
        return {u['id']: u for u in json.load(f)['bilder']}


def rorelse(dm, b, W, H):
    """Medel av |ruta − föregående provade ruta| (gråskala, 5×5-sudd) inuti lådan + 10 %; dm är skillnaden
    medelvärdesbildad i 4 × 4-block (exakt medel, bara kantupplösningen 4 bildpunkter)."""
    if dm is None:
        return None
    w, h = wh(b)
    m = R['ror_marg']
    x0, y0 = max(0.0, b[0] - m * w), max(0.0, b[1] - m * h)
    x1, y1 = min(float(W), b[2] + m * w), min(float(H), b[3] + m * h)
    f = dm.shape[1] / W
    ix0, iy0 = int(x0 * f), int(y0 * f)
    ix1, iy1 = max(ix0 + 1, int(math.ceil(x1 * f))), max(iy0 + 1, int(math.ceil(y1 * f)))
    return round(float(dm[iy0:iy1, ix0:ix1].mean()), 2)


def L(q):
    return [round(q['x0'], 1), round(q['y0'], 1), round(q['x1'], 1), round(q['y1'], 1)]


def steg_a(klipp, mapp, fran, till):
    ut = os.path.join(mapp, 'detektioner.json')
    vanta_pa_golden()
    t00 = time.time()
    V = Video(klipp)
    import onnxruntime as ort
    so = ort.SessionOptions(); so.intra_op_num_threads = 4
    sess = ort.InferenceSession(ONNX, so, providers=['CPUExecutionProvider'])
    inp = sess.get_inputs()[0]
    _, _, h_in, w_in = inp.shape
    i0 = int(round((fran or 0) * V.fps))
    i1 = V.n if till is None else min(V.n, int(round(till * V.fps)))
    tmp = os.path.join(mapp, 'tmp-a')
    os.makedirs(tmp, exist_ok=True)
    if i0 > 0:
        V.hoppa(i0)
    rutor, batch, dms, vantar = [], [], {}, []
    prev_g = None
    tid = {'avkodning': 0.0, 'detektor': 0.0, 'rorelse': 0.0, 'para': 0.0}

    def tom():
        """Parningen för batchen, sedan rörelsemåtten: mot föregående prov (egen skillnad) och mot nästa
        (nästa provs skillnad i samma låda) — det sista provet i batchen får sitt 'nästa' i nästa batch."""
        nonlocal batch, vantar
        if not batch:
            return
        tp = time.time()
        svar = kor_para(batch, V.W, V.H, tmp)
        tid['para'] += time.time() - tp
        for b in batch:
            u = svar[str(b['idx'])]
            s = rutor[b['idx']]
            s['kort'] = [L(q) + [round(q['poang'], 3), q['klass']] for q in u['kort']]
            s['remsor'] = [L(q) + [round(q['poang'], 3)] for q in u['remsor']]
            s['par'] = [{'lada': L(q), 'poang': round(q['poang'], 3), 'klass': q['klass'], 'ur': q['ur'],
                         'remsa': [round(v, 1) for v in q['remsa']] if q.get('remsa') else None} for q in u['par']]
            os.remove(b['fil'])
        for idx in vantar + [b['idx'] for b in batch]:
            s = rutor[idx]
            for p in s['par']:
                if 'ror' not in p:
                    p['ror'] = rorelse(dms.get(idx), p['lada'], V.W, V.H)
                p['ror_n'] = rorelse(dms.get(idx + 1), p['lada'], V.W, V.H) if (idx + 1) in dms else None
        sist = batch[-1]['idx']
        vantar = [sist]
        for k in list(dms):
            if k < sist:
                del dms[k]
        batch = []

    i = i0
    while i < i1:
        ta = time.time()
        if not V.c.grab():
            break
        V.pos += 1
        if (i - i0) % R['steg']:
            tid['avkodning'] += time.time() - ta
            i += 1
            continue
        ok, img = V.c.retrieve()
        tid['avkodning'] += time.time() - ta
        if not ok:
            break
        tb = time.time()
        x, r = forbehandla(img, h_in, w_in)
        o = sess.run(None, {inp.name: x})[0][0].astype(np.float32)
        o = np.ascontiguousarray(o[o[:, 4] >= R['golv']])   # avkoda() läser aldrig raderna under golvet
        fil = os.path.join(tmp, f'{i:06d}.f32')
        o.tofile(fil)
        tid['detektor'] += time.time() - tb
        tc = time.time()
        g = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (5, 5), 0)
        idx = len(rutor)
        if prev_g is not None:
            d = cv2.absdiff(g, prev_g).astype(np.float32)
            dms[idx] = cv2.resize(d, (V.W // 4, V.H // 4), interpolation=cv2.INTER_AREA)
        prev_g = g
        tid['rorelse'] += time.time() - tc
        rutor.append({'ruta': i, 't': round(i / V.fps, 3)})
        batch.append({'idx': idx, 'fil': fil, 'r': float(r)})
        if len(batch) >= 50:
            # vantar (förra batchens sista) behöver den här batchens första skillnad: den finns i dms nu
            tom()
            vanta_pa_golden()   # startar en golden mitt i klippet: pausa tills den är klar
        if len(rutor) % 25 == 0:
            logg(f'A: {len(rutor)} prov, t = {i / V.fps:.1f} s ({time.time() - t00:.0f} s)')
        i += 1
    tom()
    for idx in vantar:
        for p in rutor[idx]['par']:
            p.setdefault('ror_n', None)
    shutil.rmtree(tmp, ignore_errors=True)
    tid = {k: round(v, 1) for k, v in tid.items()}
    tid['totalt'] = round(time.time() - t00, 1)
    d = {'klipp': rel(klipp), 'fps': V.fps, 'W': V.W, 'H': V.H, 'n_rutor': V.n, 'fran': fran or 0, 'till': till,
         'i0': i0, 'i1': i1, 'modell': os.path.basename(ONNX), 'regler': {k: R[k] for k in ('steg', 'golv', 'ror_marg')},
         'tid_s': tid, 'rutor': rutor}
    skriv_json(ut, d, kompakt=True)
    logg(f'A klar: {len(rutor)} prov på {tid["totalt"]} s ({tid}) → {rel(ut)}')
    return d


# ── steg B: spår ─────────────────────────────────────────────────────────────
def steg_b(mapp):
    t00 = time.time()
    D = las_json(os.path.join(mapp, 'detektioner.json'))
    rutor, W, H = D['rutor'], D['W'], D['H']
    kvot, n_kvot = kortkvot(rutor)
    kvot = kvot or KVOT
    logg(f'B: kortlådans form {kvot:.3f} (ur {n_kvot} ensamma, stilla, raka lådor; 88/63 = {KVOT:.3f})')
    # Kortets mått i klippet: ensamma helkort (kortets form, ingen annan låda överlappar)
    sidor, ytor = [], []
    for s in rutor:
        P = s['par']
        for j, p in enumerate(P):
            b = p['lada']
            if not kortform(b, None, kvot):
                continue
            if any(skarning(b, q['lada']) > 0 for k, q in enumerate(P) if k != j):
                continue
            w, h = wh(b)
            sidor.append(min(w, h)); ytor.append(w * h)
    if sidor:
        kortsida, yta = float(np.median(sidor)), float(np.median(ytor))
    else:
        alla = [min(wh(p['lada'])) for s in rutor for p in s['par']]
        kortsida = float(np.median(alla)) if alla else 100.0
        yta = kortsida * kortsida * KVOT
    logg(f'B: kortsidan {kortsida:.0f} px, ensamt helkort {yta:.0f} px² ({len(sidor)} ensamma lådor)')

    spar, levande, nr = [], [], 0
    for si, s in enumerate(rutor):
        t = s['t']
        levande = [tr for tr in levande if t - tr['obs'][-1]['t'] <= R['glapp_s'] + 1e-6]
        obs = [{'si': si, 't': t, 'ruta': s['ruta'], 'lada': p['lada'], 'remsa': p['remsa'], 'klass': p['klass'],
                'poang': p['poang'], 'ur': p['ur'], 'ror': p.get('ror'), 'ror_n': p.get('ror_n')} for p in s['par']]
        kand = []
        for ti, tr in enumerate(levande):
            g = tr['obs'][-1]['lada']
            for oi, o in enumerate(obs):
                b = o['lada']
                u = iou(g, b)
                if u >= R['spar_iou']:
                    kand.append((1 + u, ti, oi))      # samma låda går alltid före en krympt
                    continue
                a = inne(b, g)
                if a >= R['spar_inne']:
                    kand.append((a, ti, oi))
        kand.sort(key=lambda x: -x[0])
        tagna_t, tagna_o = set(), set()
        for _, ti, oi in kand:
            if ti in tagna_t or oi in tagna_o:
                continue
            levande[ti]['obs'].append(obs[oi]); tagna_t.add(ti); tagna_o.add(oi)
        for oi, o in enumerate(obs):
            if oi not in tagna_o:
                nr += 1
                tr = {'id': f's{nr:03d}', 'obs': [o]}
                spar.append(tr); levande.append(tr)
        # En remsa, ett kort: två levande spår med (nästan) samma remslåda — den vars kant ligger närmast behåller den.
        nu = [tr['obs'][-1] for tr in levande if tr['obs'][-1]['si'] == si and tr['obs'][-1]['remsa']]
        for a in range(len(nu)):
            for b in range(a + 1, len(nu)):
                oa, ob = nu[a], nu[b]
                if oa['remsa'] and ob['remsa'] and iou(oa['remsa'], ob['remsa']) >= R['remsa_iou']:
                    if kantavstand(oa['remsa'], oa['lada']) <= kantavstand(ob['remsa'], ob['lada']):
                        ob['remsa'] = None; ob['remsa_bort'] = 'en remsa, ett kort'
                    else:
                        oa['remsa'] = None; oa['remsa_bort'] = 'en remsa, ett kort'

    # Härledda mått per prov
    per_si = {}
    for tr in spar:
        for o in tr['obs']:
            per_si.setdefault(o['si'], []).append((tr['id'], o))
    for tr in spar:
        ob = tr['obs']
        for k, o in enumerate(ob):
            w, h = wh(o['lada'])
            prev = ob[k - 1] if k > 0 and ob[k - 1]['si'] == o['si'] - 1 else None
            if prev is not None:
                c, pc = mitt(o['lada']), mitt(prev['lada'])
                o['flytt'] = round(math.hypot(c[0] - pc[0], c[1] - pc[1]), 1)
            else:
                o['flytt'] = None
            o['stilla'] = bool(o['flytt'] is not None and o['flytt'] < R['stilla_centrum'] * kortsida
                               and o['ror'] is not None and o['ror'] < R['stilla_ror'])
            o['synlig_andel'] = round(w * h / yta, 3)
            o['liggande'] = bool(w > h)
            o['vinkel_abs'] = remsvinkel(o['remsa'])
            hog = []
            for tid_, q in per_si[o['si']]:
                if tid_ == tr['id']:
                    continue
                if iou(o['lada'], q['lada']) > R['hog_iou']:
                    hog.append(tid_); continue
                if o['synlig_andel'] < R['hog_synlig']:
                    e = R['hog_kant'] * kortsida
                    b = o['lada']
                    if skarning([b[0] - e, b[1] - e, b[2] + e, b[3] + e], q['lada']) > 0:
                        hog.append(tid_)
            o['i_hog'] = bool(hog)
            o['hog_med'] = hog

    def lugn(o):
        return o['stilla'] and o['ror_n'] is not None and o['ror_n'] < R['stilla_ror']

    def remsa_i_vilan(ob, k):
        """Remslådan för prov k: provets egen, annars den närmaste ur samma stillhet (alla prov emellan
        stilla, inom 1 s, samma låda IoU ≥ 0,9) — kortet har inte rört sig, så remsan sitter där den satt.
        I pass 2 klipp 1 hittade detektorn remsan bara i vart femte prov på ett kort under lampan (s011)."""
        if ob[k]['remsa']:
            return ob[k]['remsa'], None
        bast = None
        for steg in (-1, 1):
            j = k
            while 0 <= j + steg < len(ob):
                a, b = (j + steg, j) if steg < 0 else (j, j + steg)
                if ob[b]['si'] != ob[a]['si'] + 1 or not ob[b]['stilla']:
                    break
                j += steg
                if abs(ob[j]['t'] - ob[k]['t']) > R['remsa_lan_s'] + 1e-6:
                    break
                if ob[j]['remsa'] and iou(ob[j]['lada'], ob[k]['lada']) >= R['remsa_lan_iou']:
                    if bast is None or abs(ob[j]['t'] - ob[k]['t']) < abs(ob[bast]['t'] - ob[k]['t']):
                        bast = j
                    break
        return (ob[bast]['remsa'], ob[bast]['t']) if bast is not None else (None, None)

    ut_spar, lagg_lista = [], []
    for tr in spar:
        ob = tr['obs']
        t0 = ob[0]['t']
        lagg, orsak = None, None
        for k, o in enumerate(ob):
            if o['t'] - t0 > R['lagg_fonster_s'] + 1e-6:
                break
            if k < R['lagg_prov']:
                continue
            if not all(ob[j]['stilla'] for j in range(k - R['lagg_prov'] + 1, k + 1)):
                continue
            if not lugn(o):
                continue
            if o['klass'] == 'baksida':
                if not kortform(o['lada'], None, kvot):
                    continue
            else:
                rm, _ = remsa_i_vilan(ob, k)
                if not rm or not kortform(o['lada'], remsvinkel(rm), kvot):
                    continue
            lagg = k
            break
        if lagg is None:
            orsak = 'kort liv (< 3 prov)' if len(ob) < R['lagg_prov'] + 1 else 'ingen stilla helbild'
        lagen = []
        if lagg is not None:
            # Lägena jämförs bara i lugna prov (stilla, rörelse < 4 mot föregående och nästa): en hand som
            # passerar ger varken en förändring eller en träningsbild.
            sist = None
            for k in range(lagg, len(ob)):
                o = ob[k]
                if k == lagg:
                    skal = 'lagg'
                else:
                    if not lugn(o):
                        continue
                    skal = None
                    # täckning först: en krympt låda (kortet täckt) kan också bli bredare än hög
                    if abs(o['synlig_andel'] - sist['synlig_andel']) > R['synlig_byte']:
                        skal = 'synlig'
                    elif o['i_hog'] and not sist['i_hog']:
                        skal = 'hog'
                    elif o['liggande'] != sist['liggande']:
                        skal = 'ligger'
                    elif o['t'] - sist['t'] >= R['lage_var_s'] - 1e-6:
                        skal = 'tid'
                    if not skal:
                        continue
                rm, lan = remsa_i_vilan(ob, k) if o['klass'] != 'baksida' else (None, None)
                va = remsvinkel(rm)
                lagen.append({'t': o['t'], 'ruta': o['ruta'], 'lada': o['lada'], 'remsa': rm, 'remsa_lanad': lan, 'klass': o['klass'],
                              'stilla': o['stilla'], 'rorelse': o['ror'], 'rorelse_nasta': o['ror_n'],
                              'synlig_andel': o['synlig_andel'], 'liggande': o['liggande'], 'i_hog': o['i_hog'],
                              'vinkel_abs': va, 'snedhet': snedhet(va), 'vinkel': None,
                              'kortform': kortform(o['lada'], va if o['klass'] != 'baksida' else None, kvot), 'varfor': skal})
                sist = o
                if len(lagen) >= R['lage_max']:
                    break
            lagg_lista.append({'spar': tr['id'], 't': ob[lagg]['t']})
        klasser = [o['klass'] for o in ob]
        ut_spar.append({
            'id': tr['id'], 'start': ob[0]['t'], 'slut': ob[-1]['t'], 'n_prov': len(ob),
            'klass': ob[lagg]['klass'] if lagg is not None else max(set(klasser), key=klasser.count),
            'lagg': lagen[0] if lagen else None, 'orsak': orsak, 'lagen': lagen,
            'prov': [[o['t'], o['lada'], o['remsa'], o['klass'], o['ror'], o['ror_n'], o['flytt'], o['stilla'], o['i_hog']] for o in ob],
        })

    # Högarna åt detektorspåret: sammanhängande grupper av spår i hög, ihopslagna över tiden.
    hogar, oppna = [], []
    for si in sorted(per_si):
        t = rutor[si]['t']
        grann = {}
        for tid_, o in per_si[si]:
            grann.setdefault(tid_, set()).update(o['hog_med'])
            for q in o['hog_med']:
                grann.setdefault(q, set()).add(tid_)
        sedda, grupper = set(), []
        for n0 in grann:
            if n0 in sedda or not grann[n0]:
                continue
            g, stack = set(), [n0]
            while stack:
                n = stack.pop()
                if n in g:
                    continue
                g.add(n); stack.extend(grann.get(n, ()))
            sedda |= g
            if len(g) >= 2:
                grupper.append(g)
        for g in grupper:
            h = next((h for h in oppna if h['spar'] & g), None)
            if h:
                h['spar'] |= g; h['t1'] = t
            else:
                h = {'t0': t, 't1': t, 'spar': set(g)}; oppna.append(h); hogar.append(h)
        oppna = [h for h in oppna if t - h['t1'] <= R['glapp_s'] + 1e-6]
    tidpunkter = {'klipp': D['klipp'], 'lagg': lagg_lista,
                  'hogar': [{'t0': h['t0'], 't1': h['t1'], 'spar': sorted(h['spar'])} for h in hogar if h['t1'] - h['t0'] >= R['hog_min_s'] - 1e-6]}
    d = {'klipp': D['klipp'], 'fps': D['fps'], 'W': W, 'H': H, 'kortsida': round(kortsida, 1), 'ensam_yta': round(yta),
         'kortkvot': round(kvot, 4), 'n_kortkvot': n_kvot,
         'regler': R, 'tid_s': round(time.time() - t00, 2), 'spar': ut_spar}
    skriv_json(os.path.join(mapp, 'spar.json'), d, kompakt=True)
    skriv_json(os.path.join(mapp, 'tidpunkter.json'), tidpunkter)
    n_l = sum(1 for s in ut_spar if s['lagg'])
    logg(f'B klar: {len(ut_spar)} spår ({sum(1 for s in ut_spar if s["n_prov"] >= 4)} med ≥ 4 prov), {n_l} lägg-ögonblick, '
         f'{len(tidpunkter["hogar"])} högar, {sum(len(s["lagen"]) for s in ut_spar)} lägen')
    return d


# ── namnlistan, kandidatleken och referenserna ──────────────────────────────
_sist_fraga = [0.0]


def fraga(url, binar=False):
    """Scryfall, högst 10 frågor/s."""
    for forsok in range(5):
        vant = 0.1 - (time.time() - _sist_fraga[0])
        if vant > 0:
            time.sleep(vant)
        _sist_fraga[0] = time.time()
        try:
            d = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
            return d if binar else json.loads(d)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code == 429:
                time.sleep(2 + 2 * forsok); continue
            if forsok == 4:
                raise
            time.sleep(1 + forsok)
        except Exception:  # noqa: BLE001
            if forsok == 4:
                raise
            time.sleep(1 + forsok)
    return None


def sok(q, extra):
    url = f'https://api.scryfall.com/cards/search?q={urllib.parse.quote(q)}&{extra}'
    ut = []
    while url:
        d = fraga(url)
        if not d:
            break
        for c in d.get('data', []):
            iu = c.get('image_uris') or ((c.get('card_faces') or [{}])[0].get('image_uris'))
            if iu and iu.get('normal'):
                ut.append({'id': c['id'], 'name': c['name'], 'normal': iu['normal'], 'released': c.get('released_at')})
        url = d.get('next_page') if d.get('has_more') else None
    return ut


def las_namnlistan():
    if not os.path.exists(NAMNFIL):
        raise SystemExit(f'namnlistan saknas: kör ~/.mesa/detektor-venv/bin/python {rel(os.path.join(HAR, "namn.py"))}')
    return las_json(NAMNFIL)


def golden_namn():
    """Golden-lekens namn utom basland, med sidornas namn — de tränas aldrig (golden ska mäta osedda kort)."""
    g = set()
    for n in las_lek():
        if n in BAS or n == 'Wastes':
            continue
        g.add(n)
        for s in n.split(' // '):
            g.add(s)
    return g


def slumpnamn(namnlista):
    if os.path.exists(SLUMPFIL):
        finns = set(namnlista['namn'])   # en senare namnlista kan ha tagit bort något (front_card 2026-10-05)
        return [n for n in las_json(SLUMPFIL)['namn'] if n in finns]
    gold = golden_namn()
    kand = sorted(n for n in namnlista['namn'] if n not in gold and n.split(' // ')[0] not in gold and n not in BAS and n != 'Wastes')
    val = random.Random(R['slump_fro']).sample(kand, R['slump_n'])
    skriv_json(SLUMPFIL, {'fro': R['slump_fro'], 'n': R['slump_n'], 'kalla': namnlista['kalla'], 'namn': sorted(val)})
    return sorted(val)


class Bank:
    """Konstverk per namn (som appens urval: alla konstverk, högst 12, nyaste först; basland högst 24 från
    2021 och framåt), bilderna (Scryfall normal) och modellens råa vektorer per bild — allt cachat under
    dev/material/arbete/markning/ så att det hämtas och räknas en gång."""

    def __init__(self, modell):
        self.m = modell
        self.konst = las_json(KONSTFIL) if os.path.exists(KONSTFIL) else {}
        os.makedirs(REF, exist_ok=True); os.makedirs(VEK, exist_ok=True)
        mf = os.path.join(VEK, 'modell.json')
        ident = {'fil': os.path.basename(MODELL), 'storlek': os.path.getsize(MODELL)}
        if os.path.exists(mf):
            if las_json(mf) != ident:
                raise SystemExit(f'vektorerna i {rel(VEK)} är räknade med en annan modell ({las_json(mf)}) — flytta mappen och kör om')
        else:
            skriv_json(mf, ident)
        self.hamtade = 0; self.raknade = 0

    def konstverk(self, namn):
        self.konst['baksida'] = [dict(BAKSIDA)]
        saknas = [n for n in namn if n not in self.konst]
        bas = [n for n in saknas if n in BAS]
        if bas:
            per = {}
            q = '(' + ' or '.join(f'!"{n}"' for n in BAS) + ') -is:digital -is:funny year>=2021'
            for c in sok(q, 'unique=art&order=name'):
                if ' // ' in c['name'] or c['name'] not in BAS:
                    continue
                if len(per.setdefault(c['name'], [])) < R['bas_tak']:
                    per[c['name']].append({'id': c['id'], 'normal': c['normal']})
            for n in BAS:
                self.konst[n] = per.get(n, [])
        ovr = [n for n in saknas if n not in BAS]
        for i in range(0, len(ovr), 20):
            del_ = ovr[i:i + 20]
            per = {}
            q = '(' + ' or '.join('!"' + n.replace('"', '') + '"' for n in del_) + ') -is:digital -is:funny'
            for c in sok(q, 'unique=art&order=released&dir=desc'):
                if len(per.setdefault(c['name'], [])) < R['konst_tak']:
                    per[c['name']].append({'id': c['id'], 'normal': c['normal']})
            for n in del_:
                if not per.get(n):   # ett kort utan träff i det filtret (t.ex. ett Un-kort): utan filter
                    per[n] = [{'id': c['id'], 'normal': c['normal']} for c in sok('!"' + n.replace('"', '') + '"', 'unique=art&order=released&dir=desc')
                              if c['name'] == n][:R['konst_tak']]
                self.konst[n] = per.get(n, [])
        if saknas:
            skriv_json(KONSTFIL, self.konst)
        return {n: self.konst.get(n, []) for n in namn}

    def hamta(self, poster):
        """Bilderna (Scryfall normal) som saknas — bara nätet, ingen beräkning."""
        for p in poster:
            bf = os.path.join(REF, p['id'] + '.jpg')
            if os.path.exists(bf) and os.path.getsize(bf) >= 1000:
                continue
            d = fraga(p['normal'], binar=True)
            if not d:
                continue
            with open(bf, 'wb') as f:
                f.write(d)
            self.hamtade += 1

    def vektorer(self, poster):
        """poster: [{'id', 'normal'}] → {id: (12, 512) råa normerade vektorer}: rad 0–7 hela kortet (skarp
        0/90/180/270, sudd 0/90/180/270), rad 8–11 remsan (översta 14 %, skarp 0/180, sudd 0/180) — lib.Referenser."""
        ut, nya = {}, []
        self.hamta(poster)
        for p in poster:
            vf = os.path.join(VEK, p['id'] + '.npy')
            if os.path.exists(vf):
                ut[p['id']] = np.load(vf)
                continue
            img = cv2.imread(os.path.join(REF, p['id'] + '.jpg'))
            if img is None:
                continue
            nya.append((p['id'], img))
        for i in range(0, len(nya), 16):
            del_ = nya[i:i + 16]
            hel = Referenser(self.m, [(cid, cid, img) for cid, img in del_]).ra
            rem = Referenser(self.m, [(cid, cid, ref_strip(img, 0.14)) for cid, img in del_], rotar=(0, 180)).ra
            for j, (cid, _) in enumerate(del_):
                v = np.concatenate([hel[j * 8:(j + 1) * 8], rem[j * 4:(j + 1) * 4]]).astype(np.float32)
                np.save(os.path.join(VEK, cid + '.npy'), v)
                ut[cid] = v
                self.raknade += 1
            if (i // 16) % 10 == 0:
                logg(f'  referenser: {min(i + 16, len(nya))}/{len(nya)} nya bilder räknade')
                vanta_pa_golden()
        return ut


def referenser_ur(ra, namn):
    """Ett lib.Referenser ur färdiga råa vektorer — samma centrering och rangordning som klassen räknar."""
    r = object.__new__(Referenser)
    r.ra = ra
    r.namn = list(namn)
    r.medel = ra.mean(axis=0)
    c = ra - r.medel
    r.vek = c / np.maximum(np.linalg.norm(c, axis=1, keepdims=True), 1e-9)
    r.namnlista = sorted(set(r.namn))
    idx = {n: i for i, n in enumerate(r.namnlista)}
    r._namnidx = np.array([idx[n] for n in r.namn])
    return r


def svar(lista, n=3):
    if not lista:
        return None
    a = lista[0]; b = lista[1] if len(lista) > 1 else (None, 0.0)
    return {'namn': a[0], 'poang': round(a[1], 4), 'marginal': round(a[1] - b[1], 4), 'nast': b[0],
            'topp': [[x, round(p, 4)] for x, p in lista[:n]]}


# ── utsnitten ────────────────────────────────────────────────────────────────
def hel_geo(lada_f, W, H):
    """hel_app:s ruta i bildpunkter: lådan + 8 % per sida, utåt avrundad."""
    x0, y0, x1, y1 = lada_f[0] * W, lada_f[1] * H, lada_f[2] * W, lada_f[3] * H
    bw, bh = x1 - x0, y1 - y0
    bx, by = x0 - bw * MARG_HEL, y0 - bh * MARG_HEL
    BW, BH = bw * (1 + 2 * MARG_HEL), bh * (1 + 2 * MARG_HEL)
    return int(math.floor(bx)), int(math.floor(by)), int(math.ceil(bx + BW)), int(math.ceil(by + BH))


def ram_ur_utsnitt(c, lada_f, W, H):
    """En gles 4K-ruta ur ett sparat hel/app-utsnitt: utsnittet tillbaka på sin plats (vridningen och
    nedskalningen ångrade), svart runt om. Allt som ligger inne i lådan + 8 % — remsan, titelbanden, 1080-
    versionen — kan då skäras med samma funktioner som ur hela rutan, utan att 4K avkodas igen."""
    ix0, iy0, ix1, iy1 = hel_geo(lada_f, W, H)
    w, h = ix1 - ix0, iy1 - iy0
    if w > h:
        c = cv2.rotate(c, cv2.ROTATE_90_CLOCKWISE)
    if c.shape[1] != w or c.shape[0] != h:
        c = cv2.resize(c, (w, h), interpolation=cv2.INTER_LINEAR)
    ram = np.zeros((H, W, 3), np.uint8)
    sx0, sy0, sx1, sy1 = max(0, ix0), max(0, iy0), min(W, ix1), min(H, iy1)
    if sx1 > sx0 and sy1 > sy0:
        ram[sy0:sy1, sx0:sx1] = c[sy0 - iy0:sy1 - iy0, sx0 - ix0:sx1 - ix0]
    return ram


def hel_app(img, lada_f):
    """Kamera.beskar, den raka vägen: lådan + 8 % per sida (bord i hörnen), utanför bilden svart (canvasens
    genomskinliga bildpunkter), −90° när lådan ligger, nedskalad så att kortsidan är högst 720."""
    H, W = img.shape[:2]
    ix0, iy0, ix1, iy1 = hel_geo(lada_f, W, H)
    c = np.zeros((iy1 - iy0, ix1 - ix0, 3), np.uint8)
    sx0, sy0, sx1, sy1 = max(0, ix0), max(0, iy0), min(W, ix1), min(H, iy1)
    if sx1 > sx0 and sy1 > sy0:
        c[sy0 - iy0:sy1 - iy0, sx0 - ix0:sx1 - ix0] = img[sy0:sy1, sx0:sx1]
    if c.shape[1] > c.shape[0]:
        c = cv2.rotate(c, cv2.ROTATE_90_COUNTERCLOCKWISE)
    k = min(c.shape[:2])
    if k > BESKAR_BREDD:
        s = BESKAR_BREDD / k
        c = cv2.resize(c, (max(2, round(c.shape[1] * s)), max(2, round(c.shape[0] * s))), interpolation=cv2.INTER_AREA)
    return c


def hel_rata(img, lada_f, remsa_f, kant, kvot=KVOT):
    """Rutan vriden kring lådans mitt med remsans vinkel (kant ur remsnamn.rata), sedan kortets rektangel
    + 8 % (beskarVrid: Kb = K·1,16, Lb = L·1,16). Kortets sidor ur lådan och vinkeln (lådan är hela kortet:
    bara när lådan har kortets form). Vänds så att remsan ligger överst."""
    H, W = img.shape[:2]
    b = [lada_f[0] * W, lada_f[1] * H, lada_f[2] * W, lada_f[3] * H]
    r = [remsa_f[0] * W, remsa_f[1] * H, remsa_f[2] * W, remsa_f[3] * H]
    bw, bh = wh(b)
    cx, cy = mitt(b)
    kant = kant % 180
    th = math.radians(kant if kant <= 90 else 180 - kant)   # remsans vinkel mot vågrätt, ur den valda vridningen
    c, s = abs(math.cos(th)), abs(math.sin(th))
    K = (bw + bh) / ((c + s) * (1 + kvot))
    Kb, Lb = K * (1 + 2 * MARG_HEL), K * kvot * (1 + 2 * MARG_HEL)
    skala = min(1.0, BESKAR_BREDD / Kb)
    M = cv2.getRotationMatrix2D((cx, cy), kant, 1.0)
    rx, ry = mitt(r)
    if M[1, 0] * rx + M[1, 1] * ry + M[1, 2] > cy:   # remsan under mitten efter vridningen → vänd
        kant = kant + 180
        M = cv2.getRotationMatrix2D((cx, cy), kant, 1.0)
    ow, oh = max(2, round(Kb * skala)), max(2, round(Lb * skala))
    M = M * skala
    M[0, 2] += ow / 2 - skala * cx
    M[1, 2] += oh / 2 - skala * cy
    return cv2.warpAffine(img, M, (ow, oh), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))


NAMNRAD_START = [0.05, 0.02, 0.08]   # ocr_export.py: i den ordning ocr.cjs prövar dem
NAMNRAD_H = 0.10


def ocr_band(img, lada_f, remsa_f, kant):
    """Titelbanden ur remslådan (spec C, vittne 1): vågrät remsa, tre band 10 % av kortets höjd vid 5, 2 och
    8 % ned, x 0,03–0,97 av kortets bredd, skalade till 64 px höjd (högst 4×, aldrig ned) som ocr_export.py.
    Rak remsa: remsnamn.skar (vriden efter var i kortlådan den sitter), kortets överkant = remslådans
    överkant. Sned (kant given): remsnamn.rata med den vinkeln — där avgörs inte 0/180, så banden prövas
    också vända (steg 3–5). Svar: [(steg, start, bild)]."""
    if kant is None:
        s = skar(img, lada_f, remsa_f)
        if s is None:
            return []
        hs, ws = s.shape[:2]
        Lr = ws / (1 + 2 * MARG_REMSA)
        x_off, topp = MARG_REMSA * Lr, MARG_REMSA * hs / (1 + 2 * MARG_REMSA)
        varianter = [s]
    else:
        s, _ = rata(img, lada_f, remsa_f, med_vinkel=True, kant=kant)
        if s is None:
            return []
        hs, ws = s.shape[:2]
        Lr = ws / (1 + 2 * MARG_REMSA)
        x_off = MARG_REMSA * Lr
        topp = hs / 2 - 0.07 * Lr * KVOT     # remsans mitt ligger 7 % av kortets höjd under överkanten
        varianter = [s, cv2.rotate(s, cv2.ROTATE_180)]
    Hk = Lr * KVOT
    ut = []
    for vi, v in enumerate(varianter):
        for k, st in enumerate(NAMNRAD_START):
            y0, y1 = topp + st * Hk, topp + (st + NAMNRAD_H) * Hk
            x0, x1 = x_off + 0.03 * Lr, x_off + 0.97 * Lr
            y0, y1, x0, x1 = max(0, int(round(y0))), min(hs, int(round(y1))), max(0, int(round(x0))), min(ws, int(round(x1)))
            if y1 - y0 < 4 or x1 - x0 < 8:
                continue
            band = v[y0:y1, x0:x1]
            h, w = band.shape[:2]
            sk = max(1.0, min(4.0, 64 / max(h, 1)))
            if sk != 1.0:
                band = cv2.resize(band, (max(8, round(w * sk)), max(4, round(h * sk))), interpolation=cv2.INTER_LINEAR)
            ut.append((vi * 3 + k, st, band))
    return ut


def remsa_app(img, lada_f, remsa_f):
    return skar(img, lada_f, remsa_f)


def kantpassning(img, lada_f, kant, K, Lk):
    """Hur väl kortets rektangel (K × Lk, upprätt efter vridningen kant) ligger på kanter i bilden: medel av
    gradientens storlek längs rektangelns fyra sidor (±2 px) delat med medel över hela utsnittet."""
    H, W = img.shape[:2]
    b = [lada_f[0] * W, lada_f[1] * H, lada_f[2] * W, lada_f[3] * H]
    cx, cy = mitt(b)
    d = int(math.ceil(math.hypot(K, Lk) / 2 * 1.15))
    ow = oh = 2 * d
    M = cv2.getRotationMatrix2D((cx, cy), kant, 1.0)
    M[0, 2] += d - cx; M[1, 2] += d - cy
    g = cv2.cvtColor(cv2.warpAffine(img, M, (ow, oh), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE), cv2.COLOR_BGR2GRAY).astype(np.float32)
    mag = cv2.magnitude(cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3))
    x0, x1, y0, y1 = int(round(d - K / 2)), int(round(d + K / 2)), int(round(d - Lk / 2)), int(round(d + Lk / 2))
    t = 2
    sidor = [mag[max(0, y0 - t):y0 + t + 1, x0:x1], mag[max(0, y1 - t):y1 + t + 1, x0:x1],
             mag[y0:y1, max(0, x0 - t):x0 + t + 1], mag[y0:y1, max(0, x1 - t):x1 + t + 1]]
    langs = [float(s.max(axis=0 if i < 2 else 1).mean()) for i, s in enumerate(sidor) if s.size]
    return (np.mean(langs) if langs else 0.0) / max(1e-6, float(mag.mean()))


def tecken(img, lada_f, remsa_f, kvot=KVOT):
    """Remsans vinkel med tecken: kant = vridningen (cv2:s led) som lägger remsan vågrät, och vinkeln i
    (−90, 90]. Storleken ur remslådans form (remsnamn.vinkel_ur_lada), två kandidater (th, 180 − th).
    Lutningen avgörs ur bilden: när lådan är ETT helt kort (kortets form i den vinkeln) av vilken
    kandidat som lägger kortets rektangel på kortets kanter — remsnamn.ratas val (strukturtensorn i
    remsan) valde fel lutning på två av tre sneda provkort med text i titelraden, så den används bara när
    lådan inte är hela kortet. Sedan finjusteras vinkeln ±4° mot kanterna. None utan remsa."""
    if not remsa_f:
        return None, None, None
    H, W = img.shape[:2]
    rw, rh = (remsa_f[2] - remsa_f[0]) * W, (remsa_f[3] - remsa_f[1]) * H
    th = float(vinkel_ur_lada(rw, rh))
    lada = [lada_f[0] * W, lada_f[1] * H, lada_f[2] * W, lada_f[3] * H]
    if 0 < th < 90 and kortform(lada, th, kvot):
        bw, bh = wh(lada)
        t = math.radians(th); c, s = abs(math.cos(t)), abs(math.sin(t))
        K = (bw + bh) / ((c + s) * (1 + kvot)); Lk = K * kvot
        kand = [(kantpassning(img, lada_f, k, K, Lk), k) for k in (th, 180 - th)]
        p, kant = max(kand)
        k0 = kant
        for steg in (2.0, 1.0, 0.5):   # finjustering mot kanterna, högst ±6°
            battre = True
            while battre:
                battre = False
                for k in (kant - steg, kant + steg):
                    if abs(k - k0) > 6:
                        continue
                    q = kantpassning(img, lada_f, k, K, Lk)
                    if q > p:
                        p, kant, battre = q, k, True
        metod = 'kanter'
    else:
        _, kant = rata(img, lada_f, remsa_f, med_vinkel=True)
        metod = 'rata'
        if kant is None:
            return None, None, None
    kant = float(kant) % 180
    return kant, round(kant - 180 if kant > 90 else kant, 1), metod


def rata_galler(snedh):
    return snedh is not None and R['rata_min'] <= snedh <= R['rata_max']


# ── steg C: namnet i 4K, två vittnen (+ D: domen, namnet följer spåret) ─────
# Ändringen 2026-10-05 kväll (specens sista avsnitt): vittne 1 är Claude, inte textläsaren — i provet läste
# tesseract 0 av 6 titlar (~14 px i 4K vid 0,5×). Vittne 2 är bildmodellen (topp-1, ingen marginalgräns) ELLER
# ORB. Textläsaren finns kvar bakom --ocr, bara som upplysning (den påverkar inte domen).
FRAGA_V = 1
FRAGA = ('This photo shows one Magic: The Gathering card lying on a table, seen from above. It may be blurry, '
         'glared, rotated or upside down. Read the card name exactly as it is printed on the card. '
         'Reply with JSON only, nothing else: {"name": <the exact printed card name, or null if you cannot read it>, '
         '"back": <true if this is the back of a card, else false>, "sure": <true only if you are certain of the name>}')
PRIS = {'claude-opus-5': (5.0, 25.0)}   # $ per miljon token in/ut, för rapportens uppskattning


def claude_modell():
    """Modell-id som MODEL i api/identify.js (filen läses, aldrig ändras)."""
    import re
    src = open(os.path.join(ROT, 'api', 'identify.js'), encoding='utf-8').read()
    m = re.search(r"const MODEL = process\.env\.ANTHROPIC_MODEL \|\| '([^']+)'", src)
    if not m:
        raise SystemExit('hittar inte MODEL i api/identify.js')
    return m.group(1)


def api_nyckel():
    """ANTHROPIC_API_KEY ur miljön, annars ur .env.local (worktreet först, sedan huvudträdet)."""
    if os.environ.get('ANTHROPIC_API_KEY'):
        return os.environ['ANTHROPIC_API_KEY']
    huvud = os.path.dirname(os.path.dirname(os.path.realpath(os.path.join(ROT, 'dev', 'material'))))
    for p in (os.path.join(ROT, '.env.local'), os.path.join(huvud, '.env.local')):
        if os.path.exists(p):
            for rad in open(p, encoding='utf-8'):
                if rad.startswith('ANTHROPIC_API_KEY='):
                    v = rad.split('=', 1)[1].strip().strip('"').strip("'")
                    if v:
                        return v
    raise SystemExit('ANTHROPIC_API_KEY saknas (miljön eller .env.local)')


def tolka_json(text):
    t = (text or '').strip()
    for kand in (t, t[t.find('{'):t.rfind('}') + 1] if '{' in t and '}' in t else ''):
        try:
            d = json.loads(kand)
            if isinstance(d, dict):
                return {'name': d.get('name') or None, 'back': bool(d.get('back')), 'sure': bool(d.get('sure'))}
        except Exception:  # noqa: BLE001
            pass
    return None


def fraga_claude(jpg, nyckel, modell):
    """En fråga till Messages-API:t: bilden (JPEG) + FRAGA. Inte appens systemprompt — ingen system-text alls.
    Svar: tolkat JSON, råtext, stop_reason, token in/ut, tid. Fel (HTTP, nät, vägran) blir ett svar utan namn."""
    import base64
    body = {'model': modell, 'max_tokens': 4000, 'messages': [{'role': 'user', 'content': [
        {'type': 'image', 'source': {'type': 'base64', 'media_type': 'image/jpeg', 'data': base64.b64encode(jpg).decode('ascii')}},
        {'type': 'text', 'text': FRAGA}]}]}
    data = json.dumps(body).encode('utf-8')
    huvud = {'x-api-key': nyckel, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'}
    t0 = time.time()
    fel = None
    for forsok in range(4):
        try:
            r = urllib.request.urlopen(urllib.request.Request('https://api.anthropic.com/v1/messages', data=data, headers=huvud), timeout=180)
            d = json.loads(r.read())
            text = ''.join(b.get('text', '') for b in d.get('content', []) if b.get('type') == 'text')
            u = d.get('usage') or {}
            return {'svar': tolka_json(text), 'text': text, 'stop_reason': d.get('stop_reason'), 'modell': d.get('model'),
                    'in': u.get('input_tokens', 0), 'ut': u.get('output_tokens', 0), 'ms': round((time.time() - t0) * 1000)}
        except urllib.error.HTTPError as e:
            fel = f'HTTP {e.code}: {e.read()[:300].decode("utf-8", "replace")}'
            if e.code in (429, 500, 502, 503, 529) and forsok < 3:
                time.sleep(5 * (forsok + 1) ** 2); continue
            break
        except Exception as e:  # noqa: BLE001
            fel = f'{type(e).__name__}: {e}'
            if forsok < 3:
                time.sleep(5 * (forsok + 1)); continue
    return {'svar': None, 'text': '', 'fel': fel, 'stop_reason': None, 'modell': modell, 'in': 0, 'ut': 0, 'ms': round((time.time() - t0) * 1000)}


def tvatta(t):
    """Som ocr.cjs / index.html (Namn): gemener, apostrofer, bara a–z ' och mellanslag."""
    import re
    t = str(t or '').lower()
    t = re.sub(r"[’ʼ`]", "'", t)
    t = re.sub(r"[^a-z' ]", ' ', t)
    return ' '.join(t.split())


def bokstavspar(t):
    return {t[i:i + 2] for i in range(len(t) - 1) if not (t[i] == ' ' and t[i + 1] == ' ')}


def dice(A, B):
    return 2 * len(A & B) / (len(A) + len(B)) if A and B else 0.0


def norm_namn(s):
    import unicodedata
    s = unicodedata.normalize('NFKC', str(s)).lower()
    for a in '’ʼ`':
        s = s.replace(a, "'")
    return ' '.join(s.split())


class Namnindex:
    """Claudes namn mot Scryfalls lista: exakt (gemener, apostrofer; en sida → kortets hela namn), annars
    Dice ≥ 0,9 mot ETT entydigt namn, annars inget."""

    def __init__(self, nl):
        self.hela = {norm_namn(n): n for n in nl['namn']}
        self.sidor = {}
        for s, kort in nl['sidor'].items():
            self.sidor.setdefault(norm_namn(s), set()).update(kort)
        self.strangar = [(n, (n,)) for n in nl['namn']] + [(s, tuple(k)) for s, k in nl['sidor'].items()]
        self.par = [bokstavspar(tvatta(x)) for x, _ in self.strangar]

    def sla_upp(self, namn):
        if not namn:
            return None, 'inget namn'
        n = norm_namn(namn)
        if n in self.hela:
            return self.hela[n], 'exakt'
        if n in self.sidor:
            k = sorted(self.sidor[n])
            return (k[0], 'sida') if len(k) == 1 else (None, f'sidan hör till {len(k)} kort')
        A = bokstavspar(tvatta(namn))
        traff, bast = set(), 0.0
        for (_, kort), B in zip(self.strangar, self.par):
            d = dice(A, B)
            if d >= 0.9:
                traff.update(kort); bast = max(bast, d)
        if len(traff) == 1:
            return next(iter(traff)), f'dice {bast:.2f}'
        if traff:
            return None, f'{len(traff)} namn med dice ≥ 0,9'
        return None, 'finns inte i listan'


_ORB = None


def orb_drag(gray):
    """ORB-drag efter kontrastutjämning (CLAHE 2,0, 8 × 8) — på frågan och referensen lika. Utan den hittade ORB
    33 och 29 nyckelpunkter på provets mörka och blänkande kort (s002, s011) och 0 inliers mot allt; med den 14 och
    19 mot rätt namn, högst 8 mot fel namn och högst 7 mot 20 slumpvalda (pass 2 klipp 1, 2026-10-05)."""
    global _ORB
    if _ORB is None:
        _ORB = (cv2.ORB_create(nfeatures=1000), cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)))
    return _ORB[0].detectAndCompute(_ORB[1].apply(gray), None)


def orb_inliers(f1, f2):
    """BFMatcher (Hamming), ratio 0,75, findHomography RANSAC — antalet inliers."""
    k1, d1 = f1; k2, d2 = f2
    if d1 is None or d2 is None or len(d1) < 8 or len(d2) < 8:
        return 0
    bra = []
    for p in cv2.BFMatcher(cv2.NORM_HAMMING).knnMatch(d1, d2, k=2):
        if len(p) == 2 and p[0].distance < 0.75 * p[1].distance:
            bra.append(p[0])
    if len(bra) < 4:
        return 0
    src = np.float32([k1[m.queryIdx].pt for m in bra]).reshape(-1, 1, 2)
    dst = np.float32([k2[m.trainIdx].pt for m in bra]).reshape(-1, 1, 2)
    _, mask = cv2.findHomography(src, dst, cv2.RANSAC, 5.0)
    return int(mask.sum()) if mask is not None else 0


def orb_fraga(hel4k):
    """4K-utsnittet utan marginalen, gråskala, skalat så att kortet är lika brett som Scryfalls normal (488)."""
    g = cv2.cvtColor(utan_marginal(hel4k), cv2.COLOR_BGR2GRAY)
    s = 488 / max(1, g.shape[1])
    return orb_drag(cv2.resize(g, (max(8, round(g.shape[1] * s)), max(8, round(g.shape[0] * s))), interpolation=cv2.INTER_CUBIC))


def tidigare_namn(mapp):
    """Namnen Claude läst i passets TIDIGARE hela klipp (klippen körs i ordning 1, 2, 3), och textläsarens säkra."""
    passdir, eget = os.path.dirname(mapp), os.path.basename(mapp).split('_')[0]
    ut = set()
    for d in sorted(os.listdir(passdir)):
        if '_' in d or d >= eget:
            continue
        mf = os.path.join(passdir, d, 'markning.json')
        if not os.path.exists(mf):
            continue
        for s in las_json(mf)['spar']:
            c = s.get('claude') or {}
            if c.get('namn'):
                ut.add(c['namn'])
            o = s.get('ocr') or {}
            if o.get('saker'):
                ut.add(o['namn'])
    return ut


def ar_val(namn):
    """Valideringen: vart femte namn, valt med en hash (frö 1) så att samma namn hamnar på samma sida i alla
    klipp och pass (inget namn kan läcka mellan träning och validering). Basland aldrig."""
    if namn in BAS or namn == 'baksida':
        return False
    return int(hashlib.sha1(f"{R['val_fro']}|{namn}".encode('utf-8')).hexdigest(), 16) % R['val_var'] == 0


def doma(spar, cl, a_ok, b_ok, hel):
    """Domen ur vittnena (specens ändring 2026-10-05 kväll)."""
    if cl['back']:
        if spar['klass'] == 'baksida' or (hel and hel['namn'] == 'baksida'):
            return 'baksida', 'baksida', 'Claude: baksida; ' + ('detektorn baksida' if spar['klass'] == 'baksida' else 'modellen baksida överst')
        return 'osaker', None, 'Claude: baksida, men varken detektorn eller modellen'
    if cl['namn'] and cl['sure']:
        if a_ok or b_ok:
            return 'saker', cl['namn'], 'Claude säker + ' + ' och '.join(x for x, y in (('modellen', a_ok), ('ORB', b_ok)) if y)
        return 'osaker', None, 'Claude säker, inget andra vittne'
    if cl['ratt']:
        return 'osaker', None, ('Claude osäker' if not cl['sure'] else f"namnet: {cl['normalisering']}")
    return 'slangd', None, f"Claude utan namn ({cl['fragor']} {'fråga' if cl['fragor'] == 1 else 'frågor'})"


def steg_c(klipp, mapp, ocr_pa=False, avkoda=True):
    t00 = time.time()
    S = las_json(os.path.join(mapp, 'spar.json'))
    W, H = S['W'], S['H']
    med = [s for s in S['spar'] if s['lagg']]
    tid = {'avkodning': 0.0, 'utsnitt': 0.0, 'claude': 0.0, 'textlasaren': 0.0, 'referenser': 0.0, 'modellen': 0.0, 'orb': 0.0}
    udir = os.path.join(mapp, 'utsnitt', '4k')
    os.makedirs(udir, exist_ok=True)
    V = [None]

    def utsnitt(s, lg):
        """Lägets hel/app-utsnitt i 4K (JPEG 95) ur cachen — eller ur provets tidigare osaker/slangd-utsnitt —
        annars avkodat (en seek). Allt i C räknas sedan ur det sparade utsnittet, så att en omkörning ger samma
        svar och samma Claude-svar ur cachen. None när utsnittet saknas och avkodning är avstängd."""
        fil = os.path.join(udir, f"{s['id']}-r{lg['ruta']}-hel-app.jpg")
        if not os.path.exists(fil):
            for d in ('osaker', 'slangd'):
                g = os.path.join(mapp, d, '4k', f"{s['id']}-{lg['t']:.2f}-hel-app.jpg")
                if os.path.exists(g) and lg is s['lagg']:
                    shutil.copyfile(g, fil)
                    break
        if not os.path.exists(fil):
            if not avkoda:
                return None
            if V[0] is None:
                vanta_pa_golden()
                V[0] = Video(klipp)
            ta = time.time()
            img = V[0].ruta(lg['ruta'])
            tid['avkodning'] += time.time() - ta
            cv2.imwrite(fil, hel_app(img, andelar(lg['lada'], W, H)), [cv2.IMWRITE_JPEG_QUALITY, R['jpeg']])
        return fil

    def forbered(s, lg):
        fil = utsnitt(s, lg)
        if fil is None:
            return None
        tb = time.time()
        jpg = open(fil, 'rb').read()
        hel4k = cv2.imdecode(np.frombuffer(jpg, np.uint8), cv2.IMREAD_COLOR)
        lada_f = andelar(lg['lada'], W, H)
        ram = ram_ur_utsnitt(hel4k, lada_f, W, H)
        r1080 = ruta_1080(ram)
        remsa_f = andelar(lg['remsa'], W, H) if lg.get('remsa') and s['klass'] != 'baksida' else None
        u = {'fil': fil, 'jpg': jpg, 'hel4k': hel4k, 'hel1080': hel_app(r1080, lada_f), 'remsa1080': None, 'ram': ram,
             'lada_f': lada_f, 'remsa_f': remsa_f, 't': lg['t'], 'ruta': lg['ruta']}
        if remsa_f:
            u['remsa1080'] = remsa_app(r1080, lada_f, remsa_f)
        tid['utsnitt'] += time.time() - tb
        return u

    # Fas 1: lägg-ögonblicken (utsnitten i cachen, avkodning bara där de saknas)
    utsn = {}
    for s in sorted(med, key=lambda s: s['lagg']['ruta']):
        u = forbered(s, s['lagg'])
        if u is not None:
            kant, vinkel, metod = tecken(u['ram'], u['lada_f'], u['remsa_f'], S['kortkvot'])
            s['lagg']['vinkel'], s['lagg']['vinkel_metod'] = vinkel, metod
            u['kant'] = kant
            utsn[s['id']] = u
    logg(f"C: {len(utsn)}/{len(med)} lägg-utsnitt ({V[0].hopp if V[0] else 0} avkodade, resten ur cachen)")

    # Vittne 1: Claude — en fråga per spår, en till på nästa stilla läge med synlig andel ≥ 0,95 när svaret
    # saknar namn eller inte är säkert. Svaren cachas på utsnittets innehåll (samma bild = samma svar, ingen ny kostnad).
    nyckel, modell = api_nyckel(), claude_modell()
    cfil = os.path.join(mapp, 'claude', 'svar.json')
    cache = las_json(cfil) if os.path.exists(cfil) else {}
    nl = las_namnlistan()
    index = Namnindex(nl)

    def stall(fragor):
        """fragor: [(spar_id, u)] → {spar_id: svar}, högst 4 samtidigt."""
        from concurrent.futures import ThreadPoolExecutor
        ut, jobb = {}, []
        for sid, u in fragor:
            k = f"{hashlib.sha1(u['jpg']).hexdigest()}|{modell}|v{FRAGA_V}"
            if k in cache:
                ut[sid] = dict(cache[k], cachad=True)
            else:
                jobb.append((sid, u, k))
        if jobb:
            tc = time.time()
            with ThreadPoolExecutor(max_workers=4) as ex:
                for (sid, u, k), r in zip(jobb, ex.map(lambda j: fraga_claude(j[1]['jpg'], nyckel, modell), jobb)):
                    r['utsnitt'] = rel(u['fil'])
                    cache[k] = r
                    ut[sid] = dict(r, cachad=False)
            tid['claude'] += time.time() - tc
            skriv_json(cfil, cache)
        return ut

    svar1 = stall([(sid, u) for sid, u in utsn.items()])
    andra, andra_saknas = [], {}
    for s in med:
        r = svar1.get(s['id'])
        sv = (r or {}).get('svar') or {}
        if r is None or sv.get('back') or (sv.get('name') and sv.get('sure')):
            continue
        nasta = next((lg for lg in s['lagen'][1:] if lg['synlig_andel'] >= 0.95 and lg['stilla']), None)
        if nasta is None:
            andra_saknas[s['id']] = 'inget senare stilla läge med synlig andel ≥ 0,95'
            continue
        u2 = forbered(s, nasta)
        if u2 is None:
            andra_saknas[s['id']] = 'utsnittet kräver avkodning (--utan-avkodning)'
            continue
        utsn[s['id'] + '#2'] = u2
        andra.append((s['id'], u2))
    svar2 = stall(andra)
    if V[0] is not None:
        V[0].c.release()

    claude = {}
    for s in med:
        fr = [x for x in (svar1.get(s['id']), svar2.get(s['id'])) if x]
        sv = [(x.get('svar') or {}) for x in fr]
        val = next((x for x in sv if x.get('name') and x.get('sure')), None) or next((x for x in sv if x.get('back')), None) \
            or next((x for x in reversed(sv) if x.get('name')), None) or {}
        namn, hur = index.sla_upp(val.get('name')) if val.get('name') else (None, 'inget namn')
        claude[s['id']] = {'ratt': val.get('name'), 'namn': namn, 'normalisering': hur, 'sure': bool(val.get('sure')),
                           'back': bool(val.get('back')), 'fragor': len(fr), 'andra_saknas': andra_saknas.get(s['id']),
                           'svar': fr, 'in': sum(x.get('in', 0) for x in fr if not x.get('cachad')),
                           'ut': sum(x.get('ut', 0) for x in fr if not x.get('cachad')),
                           'in_alla': sum(x.get('in', 0) for x in fr), 'ut_alla': sum(x.get('ut', 0) for x in fr),
                           'andra_utsnitt': rel(utsn[s['id'] + '#2']['fil']) if s['id'] + '#2' in utsn else None}
    n_fr = sum(c['fragor'] for c in claude.values())
    logg(f"C: Claude ({modell}) {n_fr} frågor ({sum(1 for c in claude.values() for x in c['svar'] if x.get('cachad'))} ur cachen), "
         f"token in {sum(c['in_alla'] for c in claude.values())} / ut {sum(c['ut_alla'] for c in claude.values())}; "
         f"namn {sum(1 for c in claude.values() if c['namn'])}, säkra {sum(1 for c in claude.values() if c['namn'] and c['sure'])}")

    # Textläsaren (frivillig, --ocr): bara upplysning
    ocr = {}
    if ocr_pa:
        ocrdir = os.path.join(mapp, 'ocr')
        shutil.rmtree(ocrdir, ignore_errors=True); os.makedirs(ocrdir)
        remsor_man = []
        for s in med:
            u = utsn.get(s['id'])
            if not u or not u['remsa_f']:
                continue
            for steg, start, band in ocr_band(u['ram'], u['lada_f'], u['remsa_f'], u['kant'] if rata_galler(s['lagg']['snedhet']) else None):
                fn = f"{s['id']}-{steg}.png"
                cv2.imwrite(os.path.join(ocrdir, fn), band)
                remsor_man.append({'fil': fn, 'kalla': 'markning', 'bild': s['id'], 'nr': 0, 'res': '4k', 'utsnitt': 'namnrad',
                                   'steg': steg, 'start': start, 'facit': None, 'kall_h_px': int(band.shape[0])})
        if remsor_man:
            vanta_pa_golden()
            tc = time.time()
            hela = set(nl['namn'])
            lek = nl['namn'] + sorted(x for x in nl['sidor'] if x not in hela)
            skriv_json(os.path.join(ocrdir, 'manifest.json'), {'lek': lek, 'alias': nl['sidor'], 'remsor': remsor_man}, kompakt=True)
            subprocess.run(['node', OCR_CJS, ocrdir, '--ut', os.path.join(ocrdir, 'ocr.json')], check=True, cwd=REMSA)
            for r in las_json(os.path.join(ocrdir, 'ocr.json'))['remsor']:
                sak = bool(r['namn_rå'] and r['poang'] >= R['ocr_poang'] and r['marginal'] >= R['ocr_marg'])
                ocr[r['bild']] = {'text': r['text'], 'namn_ra': r['namn_rå'], 'namn': r['namn_rå'] if sak else None, 'saker': sak,
                                  'poang': r['poang'], 'marginal': r['marginal'], 'nast': r['nast'], 'steg': r['steg_vald']}
            tid['textlasaren'] = time.time() - tc

    # Vittne 2a: bildmodellen mot kandidatleken (Claudes namn i den före frågan), topp-1 räknas
    vanta_pa_golden()
    tr_ = time.time()
    m = Bildmodell()
    bank = Bank(m)
    detta = {c['namn'] for c in claude.values() if c['namn']}
    tidigare = tidigare_namn(mapp)
    leknamn = sorted(set(BAS) | {'baksida'} | set(slumpnamn(nl)) | tidigare | detta)
    konst = bank.konstverk(leknamn)
    poster = [p for n in leknamn for p in konst[n]]
    vek = bank.vektorer(poster)
    hel_ra, rem_ra, hel_n, rem_n = [], [], [], []
    for n in leknamn:
        for p in konst[n]:
            v = vek.get(p['id'])
            if v is None:
                continue
            hel_ra.append(v[:8]); hel_n += [n] * 8
            rem_ra.append(v[8:]); rem_n += [n] * 4
    utan_ref = [n for n in leknamn if not any(p['id'] in vek for p in konst[n])]
    ref_hel = referenser_ur(np.concatenate(hel_ra), hel_n)
    ref_rem = referenser_ur(np.concatenate(rem_ra), rem_n)
    tid['referenser'] = time.time() - tr_
    logg(f'C: kandidatleken {len(ref_hel.namnlista)} namn ({len(tidigare)} ur tidigare klipp, {len(detta)} Claude-namn här), '
         f'{len(hel_n) // 8} bilder ({bank.hamtade} hämtade, {bank.raknade} räknade nu)' + (f'; utan bild: {utan_ref}' if utan_ref else ''))
    tm = time.time()
    modell_svar = {}
    for s in med:
        u = utsn.get(s['id'])
        if u is None:
            continue
        q = [kvadrat(cv2.cvtColor(utan_marginal(u['hel4k']), cv2.COLOR_BGR2RGB))]
        if u['remsa1080'] is not None and min(u['remsa1080'].shape[:2]) >= 4:
            q.append(kvadrat(cv2.cvtColor(u['remsa1080'], cv2.COLOR_BGR2RGB)))
        v = m.kor(q)
        mm = {'hel': svar(ref_hel.rangordna(v[0])), 'remsa': svar(ref_rem.rangordna(v[1])) if len(v) > 1 else None, 'lek': len(ref_hel.namnlista)}
        namn = claude[s['id']]['namn']
        if namn:
            for k, ref, q_ in (('hel', ref_hel, v[0]), ('remsa', ref_rem, v[1] if len(v) > 1 else None)):
                if q_ is None:
                    continue
                lista = ref.rangordna(q_)
                plats = next((i + 1 for i, (x, _) in enumerate(lista) if x == namn), None)
                mm[k + '_namnets_plats'] = plats
                mm[k + '_namnets_marginal'] = round(lista[0][1] - lista[1][1], 4) if plats == 1 and len(lista) > 1 else None
        mm['overens'] = bool(namn and ((mm['hel'] and mm['hel']['namn'] == namn) or (mm['remsa'] and mm['remsa']['namn'] == namn)))
        modell_svar[s['id']] = mm
    tid['modellen'] = time.time() - tm

    # Vittne 2b: ORB mellan 4K-utsnittet och namnets Scryfall-bilder, mot 20 slumpvalda andra referensbilder
    to = time.time()
    orb = {}
    alla_id = [p['id'] for p in poster if p['id'] in vek]
    orb_ref = {}

    def ref_drag(cid):
        if cid not in orb_ref:
            img = cv2.imread(os.path.join(REF, cid + '.jpg'), cv2.IMREAD_GRAYSCALE)
            orb_ref[cid] = orb_drag(img) if img is not None else (None, None)
        return orb_ref[cid]

    for s in med:
        namn, u = claude[s['id']]['namn'], utsn.get(s['id'])
        if not namn or u is None or not konst.get(namn):
            continue
        fq = orb_fraga(u['hel4k'])
        egna = [p['id'] for p in konst[namn]]
        per_egen = {cid: orb_inliers(fq, ref_drag(cid)) for cid in egna}
        andra_id = random.Random(int(s['id'][1:])).sample(sorted(set(alla_id) - set(egna)), min(20, len(set(alla_id) - set(egna))))
        per_annan = {cid: orb_inliers(fq, ref_drag(cid)) for cid in andra_id}
        bast_egen, bast_annan = max(per_egen.values(), default=0), max(per_annan.values(), default=0)
        orb[s['id']] = {'inliers': bast_egen, 'bild': max(per_egen, key=per_egen.get) if per_egen else None, 'per_bild': per_egen,
                        'andra_bast': bast_annan, 'andra': per_annan,
                        'overens': bool(bast_egen >= 12 and bast_egen >= 2 * bast_annan)}
    tid['orb'] = time.time() - to

    # Domen; namnet följer spåret (D). Montage för alla spår med lägg-ögonblick; 4K-utsnittet för osäkra/slängda.
    gold = golden_namn()
    for d in ('montage', 'osaker', 'slangd'):
        shutil.rmtree(os.path.join(mapp, d), ignore_errors=True)
    for d in ('montage', os.path.join('osaker', '4k'), os.path.join('slangd', '4k')):
        os.makedirs(os.path.join(mapp, d))
    vittnen = {}
    for s in S['spar']:
        if not s['lagg']:
            s.update({'dom': 'slangd', 'namn': None, 'varfor': s['orsak'], 'claude': None, 'ocr': None, 'modell': None, 'orb': None,
                      'utanfor_traning': False, 'val': False})
            continue
        cl, mm, ob = claude[s['id']], modell_svar.get(s['id']) or {}, orb.get(s['id'])
        dom, namn, varfor = doma(s, cl, mm.get('overens', False), bool(ob and ob['overens']), mm.get('hel'))
        hit = cl['namn'] or ''
        utanfor = bool(hit and (hit in gold or any(x in gold for x in hit.split(' // '))))
        s.update({'dom': dom, 'namn': namn, 'varfor': varfor, 'claude': cl, 'ocr': ocr.get(s['id']), 'modell': mm, 'orb': ob,
                  'utanfor_traning': utanfor, 'val': bool(dom == 'saker' and not utanfor and ar_val(namn))})
        vittnen[s['id']] = {'ruta': s['lagg']['ruta'], 'lada': s['lagg']['lada'], 'claude': cl, 'ocr': ocr.get(s['id']), 'modell': mm, 'orb': ob}
        u = utsn.get(s['id'])
        if u is None:
            continue
        if utanfor:
            # golden-lekens namn: inga beskärningar alls (spec C) — också cachens utsnitt tas bort
            for k in (s['id'], s['id'] + '#2'):
                if k in utsn and os.path.exists(utsn[k]['fil']):
                    os.remove(utsn[k]['fil'])
            continue
        cv2.imwrite(os.path.join(mapp, 'montage', s['id'] + '.jpg'), u['hel1080'], [cv2.IMWRITE_JPEG_QUALITY, 90])
        if dom in ('osaker', 'slangd'):
            shutil.copyfile(u['fil'], os.path.join(mapp, dom, '4k', f"{s['id']}-{s['lagg']['t']:.2f}-hel-app.jpg"))
    tid = {k: round(v, 1) for k, v in tid.items()}
    tid['totalt'] = round(time.time() - t00, 1)
    pris = PRIS.get(modell)
    kost = {'modell': modell, 'fragor': n_fr, 'nya_fragor': sum(1 for c in claude.values() for x in c['svar'] if not x.get('cachad')),
            'in': sum(c['in_alla'] for c in claude.values()), 'ut': sum(c['ut_alla'] for c in claude.values()),
            'in_nya': sum(c['in'] for c in claude.values()), 'ut_nya': sum(c['ut'] for c in claude.values())}
    if pris:
        kost['usd'] = round((kost['in'] * pris[0] + kost['ut'] * pris[1]) / 1e6, 4)
    skriv_json(os.path.join(mapp, 'vittnen.json'), {'lek': ref_hel.namnlista, 'utan_bild': utan_ref, 'tid_s': tid, 'claude': kost,
                                                    'fraga': FRAGA, 'fraga_v': FRAGA_V, 'spar': vittnen})
    M = {'klipp': S['klipp'], 'pass': os.path.basename(os.path.dirname(mapp)), 'mapp': rel(mapp), 'fps': S['fps'], 'W': W, 'H': H,
         'kortsida': S['kortsida'], 'ensam_yta': S['ensam_yta'], 'kortkvot': S['kortkvot'], 'regler': R, 'lekens_storlek': len(ref_hel.namnlista),
         'claude': kost, 'tid_s': {'B': S['tid_s'], 'C': tid}, 'spar': [{k: v for k, v in s.items() if k != 'prov'} for s in S['spar']], 'filer': []}
    A = las_json(os.path.join(mapp, 'detektioner.json'))
    M['tid_s']['A'] = A['tid_s']
    M['fran'], M['till'] = A['fran'], A['till']
    skriv_json(os.path.join(mapp, 'markning.json'), M)
    c = {}
    for s in M['spar']:
        c[s['dom']] = c.get(s['dom'], 0) + 1
    logg(f'C klar på {tid["totalt"]} s: {c}')
    return M


# ── steg E: beskärningarna ───────────────────────────────────────────────────
def steg_e(klipp, mapp, uppskatta=False):
    t00 = time.time()
    M = las_json(os.path.join(mapp, 'markning.json'))
    W, H = M['W'], M['H']
    for d in ('tran', 'val'):
        shutil.rmtree(os.path.join(mapp, d), ignore_errors=True)
    # Säkra spår och baksidor skrivs. Med --uppskatta skärs också de andra spåren med lägg-ögonblick, bara i
    # minnet, och JPEG-kodas för att mäta storleken (hur mycket disk de skulle ta som säkra) — inget av det hamnar
    # på disk, men rutorna avkodas, så det är avstängt som förval.
    jobb = {}
    for s in M['spar']:
        if not s['lagg'] or s['utanfor_traning']:
            continue
        skriv = s['dom'] in ('saker', 'baksida')
        if not skriv and not uppskatta:
            continue
        for li, lg in enumerate(s['lagen']):
            jobb.setdefault(lg['ruta'], []).append((s, li, lg, skriv))
    filer, tid = [], {'avkodning': 0.0, 'utsnitt': 0.0, 'skriva': 0.0}
    upp = {'filer': 0, 'byte': 0}
    if jobb:
        vanta_pa_golden()
        V = Video(klipp)
        for n_r, ruta in enumerate(sorted(jobb)):
            if n_r and n_r % 20 == 0:
                vanta_pa_golden()
            ta = time.time()
            img = V.ruta(ruta)
            tid['avkodning'] += time.time() - ta
            tb = time.time()
            bilder = {'4k': img, '1080': ruta_1080(img)}
            for s, li, lg, skriv in jobb[ruta]:
                lada_f = andelar(lg['lada'], W, H)
                remsa_f = andelar(lg['remsa'], W, H) if lg['remsa'] and s['klass'] != 'baksida' else None
                kant, vinkel, metod = tecken(img, lada_f, remsa_f, M['kortkvot'])
                lg['vinkel'], lg['vinkel_metod'] = vinkel, metod
                sned = rata_galler(lg['snedhet']) and kant is not None
                del_ = 'val' if s['val'] else 'tran'
                for res, b in bilder.items():
                    ut = [('hel', 'app', hel_app(b, lada_f))]
                    if sned and lg['kortform']:
                        ut.append(('hel', 'rata', hel_rata(b, lada_f, remsa_f, kant, M['kortkvot'])))
                    if remsa_f:
                        ut.append(('remsa', 'app', remsa_app(b, lada_f, remsa_f)))
                        if sned:
                            ut.append(('remsa', 'rata', rata(b, lada_f, remsa_f, med_vinkel=True, kant=kant)[0]))
                    for typ, utsnitt, c in ut:
                        if c is None or min(c.shape[:2]) < 4:
                            continue
                        if not skriv:
                            upp['filer'] += 1
                            upp['byte'] += len(cv2.imencode('.jpg', c, [cv2.IMWRITE_JPEG_QUALITY, R['jpeg']])[1])
                            continue
                        rel_fil = os.path.join(del_, res, f"{s['id']}-{lg['t']:.2f}-{typ}-{utsnitt}.jpg")
                        fil = os.path.join(mapp, rel_fil)
                        os.makedirs(os.path.dirname(fil), exist_ok=True)
                        tw = time.time()
                        cv2.imwrite(fil, c, [cv2.IMWRITE_JPEG_QUALITY, R['jpeg']])
                        tid['skriva'] += time.time() - tw
                        filer.append({'fil': rel_fil, 'spar': s['id'], 'lage': li, 't': lg['t'], 'namn': s['namn'], 'typ': typ,
                                      'utsnitt': utsnitt, 'upplosning': res, 'val': s['val'], 'lada': lg['lada'], 'remsa': lg['remsa'],
                                      'vinkel': vinkel, 'px': [int(c.shape[1]), int(c.shape[0])]})
            tid['utsnitt'] += time.time() - tb
        V.c.release()
    for s in M['spar']:
        s['filer'] = sum(1 for f in filer if f['spar'] == s['id'])
    byte = sum(os.path.getsize(os.path.join(mapp, f['fil'])) for f in filer)
    tid = {k: round(v, 1) for k, v in tid.items()}
    tid['totalt'] = round(time.time() - t00, 1)
    M['filer'] = filer
    M['beskar'] = {'filer': len(filer), 'mb': round(byte / 1e6, 2), 'rutor': len(jobb),
                   'om_alla_lagg_sakra': {'filer': len(filer) + upp['filer'], 'mb': round((byte + upp['byte']) / 1e6, 2)} if uppskatta else None}
    M['tid_s']['E'] = tid
    skriv_json(os.path.join(mapp, 'markning.json'), M)
    extra = (f' ({len(filer) + upp["filer"]} filer, {(byte + upp["byte"]) / 1e6:.1f} MB om alla spår med lägg-ögonblick vore säkra)'
             if uppskatta else '')
    logg(f'E klar: {len(filer)} filer, {byte / 1e6:.1f} MB{extra} ur {len(jobb)} rutor på {tid["totalt"]} s')
    return M


# ── steg F: rapporten ────────────────────────────────────────────────────────
def du(p):
    n = 0
    for r, _, fs in os.walk(p):
        for f in fs:
            n += os.path.getsize(os.path.join(r, f))
    return n


def montage(mapp, M):
    from PIL import Image, ImageDraw, ImageFont
    rader = [s for s in M['spar'] if s['lagg']]
    if not rader:
        return None
    CW, CH, TX = 220, 252, 46
    kol = 8
    ny = Image.new('RGB', (kol * CW, ((len(rader) + kol - 1) // kol) * (CH + TX)), (24, 24, 24))
    d = ImageDraw.Draw(ny)
    try:
        f1 = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 13)
    except Exception:  # noqa: BLE001
        f1 = ImageFont.load_default()
    farg = {'saker': (120, 220, 120), 'osaker': (240, 200, 90), 'slangd': (230, 110, 110), 'baksida': (140, 170, 240)}
    for i, s in enumerate(rader):
        x, y = (i % kol) * CW, (i // kol) * (CH + TX)
        fil = os.path.join(mapp, 'montage', s['id'] + '.jpg')
        if os.path.exists(fil):
            im = Image.open(fil).convert('RGB')
            im.thumbnail((CW - 6, CH - 6))
            ny.paste(im, (x + (CW - im.width) // 2, y + (CH - im.height) // 2))
        else:
            d.rectangle([x + 10, y + 10, x + CW - 10, y + CH - 10], outline=(90, 90, 90))
            d.text((x + 20, y + CH // 2), 'utanför träningen', fill=(160, 160, 160), font=f1)
        cl = s.get('claude') or {}
        # Claudes namn på varje spår; vitt bara när domen gav ett namn (säker/baksida), annars grått
        if cl.get('back'):
            namn = 'Claude: baksida'
        elif cl.get('ratt'):
            namn = (cl.get('namn') or cl['ratt']) + ('' if cl.get('sure') else ' (osäker)') + ('' if cl.get('namn') else ' (ej i listan)')
        else:
            namn = 'Claude: inget namn' if cl else '–'
        etikett = s['dom'] + (' · utanför' if s['utanfor_traning'] else '') + (' · val' if s['val'] else '')
        d.text((x + 4, y + CH + 2), f"{s['id']} {s['lagg']['t']:.1f}s {etikett}", fill=farg.get(s['dom'], (200, 200, 200)), font=f1)
        d.text((x + 4, y + CH + 20), namn[:34], fill=(235, 235, 235) if s["namn"] else (150, 150, 150), font=f1)
    ut = os.path.join(mapp, 'montage.jpg')
    ny.save(ut, quality=88)
    return ut


def fmt_svar(x):
    return f"{x['namn']} ({x['marginal']:.2f})" if x else '–'


def rapport(passmapp):
    passdir = passmapp if os.path.isabs(passmapp) and passmapp.startswith(ARBETE) else os.path.join(ARBETE, os.path.basename(os.path.normpath(passmapp)))
    if not os.path.isdir(passdir):
        raise SystemExit(f'ingen märkning för {passmapp} ({rel(passdir)})')
    rad = [f'# Märkningen: {os.path.basename(passdir)}', '']
    summa = {'spar': 0, 'kortliv': 0, 'lagg': 0, 'saker': 0, 'osaker': 0, 'slangd': 0, 'baksida': 0, 'utanfor': 0, 'val': 0, 'filer': 0, 'mb': 0.0, 'mb_alla': 0.0, 's': 0.0,
             'fragor': 0, 'in': 0, 'ut': 0, 'usd': 0.0}
    for d in sorted(os.listdir(passdir)):
        mf = os.path.join(passdir, d, 'markning.json')
        if not os.path.exists(mf):
            continue
        M = las_json(mf)
        mapp = os.path.join(passdir, d)
        sek = ((M.get('till') or (las_json(os.path.join(mapp, 'detektioner.json'))['i1'] / M['fps'])) - (M.get('fran') or 0))
        lang = [s for s in M['spar'] if s['n_prov'] >= R['lagg_prov'] + 1]
        kortliv = len(M['spar']) - len(lang)
        c = {k: sum(1 for s in M['spar'] if s['dom'] == k) for k in ('saker', 'osaker', 'slangd', 'baksida')}
        utanfor = sum(1 for s in M['spar'] if s.get('utanfor_traning'))
        val = sum(1 for s in M['spar'] if s.get('val'))
        lagg = sum(1 for s in M['spar'] if s['lagg'])
        K = M.get('claude') or {}
        usd = f" (~{K['usd']:.2f} $)" if 'usd' in K else ''
        cl_namn = sum(1 for s in M['spar'] if (s.get('claude') or {}).get('namn'))
        cl_sakra = sum(1 for s in M['spar'] if (s.get('claude') or {}).get('namn') and s['claude'].get('sure'))
        a_o = sum(1 for s in M['spar'] if (s.get('modell') or {}).get('overens'))
        b_o = sum(1 for s in M['spar'] if (s.get('orb') or {}).get('overens'))
        mb = du(mapp) / 1e6
        bmb = (M.get('beskar') or {}).get('mb', 0.0)
        mätt = (M.get('beskar') or {}).get('om_alla_lagg_sakra')
        bmb_alla = mätt['mb'] if mätt else bmb
        mont = montage(mapp, M)
        T = M['tid_s']
        tider = ' · '.join(f"{k} {T[k]['totalt'] if isinstance(T[k], dict) else T[k]} s" for k in ('A', 'B', 'C', 'E') if k in T)
        rad += [f'## {d} ({sek:.0f} s video)', '',
                f"Spår {len(M['spar'])} (varav {kortliv} kortlivade, < {R['lagg_prov'] + 1} prov) · lägg-ögonblick {lagg} · "
                f"Claude {K.get('fragor', 0)} frågor ({K.get('nya_fragor', 0)} nya), token in {K.get('in', 0)} / ut {K.get('ut', 0)}{usd} · "
                f"Claude-namn {cl_namn} (säkra {cl_sakra}) · (a) modellen överens {a_o} · (b) ORB överens {b_o} · "
                f"säkra {c['saker']} · osäkra {c['osaker']} · slängda {c['slangd']} ({kortliv} kortlivade, "
                f"{sum(1 for s in lang if not s['lagg'])} utan lägg-ögonblick, {sum(1 for s in M['spar'] if s['lagg'] and s['dom'] == 'slangd')} utan vittne) · "
                f"baksidor {c['baksida']} · utanför träning {utanfor} · val {val}", '',
                f"Tid: {tider}. Disk: beskärningar {bmb:.1f} MB ({len(M['filer'])} filer" + (f"; {bmb_alla:.1f} MB om alla spår med lägg-ögonblick blev säkra" if mätt else '') + f"), hela mappen {mb:.1f} MB. "
                f"Montage: `{rel(mont) if mont else '–'}`", '',
                '| spår | lägg (s) | Claude (namn · säker · frågor) | (a) modellen hel · remsa (topp-1, marginal) | (b) ORB inliers namn / bästa andra | dom | varför | lägen | filer |',
                '|---|---|---|---|---|---|---|---|---|']
        for s in sorted(lang, key=lambda s: s['start']):
            cl = s.get('claude') or {}
            if cl:
                ct = 'baksida' if cl.get('back') else (cl.get('namn') or (f"«{cl['ratt']}» ({cl.get('normalisering')})" if cl.get('ratt') else '–'))
                ct += f" · {'säker' if cl.get('sure') else 'osäker'} · {cl.get('fragor', 0)}"
            else:
                ct = '–'
            mm = s.get('modell') or {}
            ob = s.get('orb')
            at = f"{fmt_svar(mm.get('hel'))} · {fmt_svar(mm.get('remsa'))}" + (' ✓' if mm.get('overens') else '')
            bt = (f"{ob['inliers']} / {ob['andra_bast']}" + (' ✓' if ob['overens'] else '')) if ob else '–'
            rad.append(f"| {s['id']} | {s['lagg']['t']:.1f} | {ct} | {at} | {bt} | "
                       f"**{s['dom']}**{' (utanför)' if s.get('utanfor_traning') else ''}{' (val)' if s.get('val') else ''} | {s['varfor']} | "
                       f"{len(s['lagen'])} | {s.get('filer', 0)} |" if s['lagg'] else
                       f"| {s['id']} | – ({s['start']:.1f}–{s['slut']:.1f}) | – | – | – | **{s['dom']}** | {s['varfor']} | 0 | 0 |")
        summa['fragor'] += K.get('fragor', 0); summa['in'] += K.get('in', 0); summa['ut'] += K.get('ut', 0); summa['usd'] += K.get('usd', 0.0)
        rad.append('')
        for k, v in (('spar', len(M['spar'])), ('kortliv', kortliv), ('lagg', lagg), ('utanfor', utanfor), ('val', val), ('filer', len(M['filer'])), ('mb', bmb), ('mb_alla', bmb_alla), ('s', sek)):
            summa[k] += v
        for k in ('saker', 'osaker', 'slangd', 'baksida'):
            summa[k] += c[k]
    andel = summa['saker'] / summa['lagg'] if summa['lagg'] else 0.0
    mbs = summa['mb'] / summa['s'] if summa['s'] else 0.0
    mbs_alla = summa['mb_alla'] / summa['s'] if summa['s'] else 0.0
    rad += ['## Passet', '',
            '| spår | kortlivade | lägg | säkra | osäkra | slängda | baksidor | utanför träning | val | säkra av lägg | filer | MB | MB/min video |',
            '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
            f"| {summa['spar']} | {summa['kortliv']} | {summa['lagg']} | {summa['saker']} | {summa['osaker']} | {summa['slangd']} | {summa['baksida']} | "
            f"{summa['utanfor']} | {summa['val']} | {100 * andel:.0f} % | {summa['filer']} | {summa['mb']:.1f} | {60 * mbs:.1f} |", '',
            f"Claude: {summa['fragor']} frågor, token in {summa['in']} / ut {summa['ut']}, ~{summa['usd']:.2f} $ (uppskattat ur listpriset).", '']
    # uppräkning till hela märkningen (pass 2, 3, 5): videons längd ur klippens rutantal, utan avkodning
    tot = 0.0
    for p in sorted(glob.glob(os.path.join(ROT, 'dev', 'material', '*-traning-*'))):
        if '2026-10-04' in p or '2026-10-05' in p:
            for f in sorted(glob.glob(os.path.join(p, '*.MOV')) + glob.glob(os.path.join(p, '*.mov'))):
                c_ = cv2.VideoCapture(f)
                if c_.isOpened() and c_.get(cv2.CAP_PROP_FPS):
                    tot += c_.get(cv2.CAP_PROP_FRAME_COUNT) / c_.get(cv2.CAP_PROP_FPS)
                c_.release()
    if tot:
        rad += [f"Uppräknat: pass 2 + 3 + 5 är {tot / 60:.1f} min video → ~{mbs * tot / 1000:.2f} GB beskärningar i samma takt, "
                f"~{mbs_alla * tot / 1000:.2f} GB om alla spår med lägg-ögonblick blir säkra (taket 1,5 GB).", '']
    text = '\n'.join(rad)
    with open(os.path.join(passdir, 'rapport.md'), 'w', encoding='utf-8') as f:
        f.write(text + '\n')
    print(text)
    logg(f'rapport → {rel(os.path.join(passdir, "rapport.md"))}')


# ── kommandona ───────────────────────────────────────────────────────────────
STEG = ['A', 'B', 'C', 'E']
UTFIL = {'A': 'detektioner.json', 'B': 'spar.json', 'C': 'markning.json', 'E': None}


def kor_klipp(klipp, fran, till, steg, om, ocr_pa=False, avkoda=True, uppskatta=False):
    klipp = os.path.abspath(klipp)
    krav_traning(klipp)
    mapp = klippmapp(klipp, fran, till)
    os.makedirs(mapp, exist_ok=True)
    logg(f'klipp {rel(klipp)} → {rel(mapp)}')
    tvinga = False
    for k in steg:
        finns = (os.path.exists(os.path.join(mapp, UTFIL[k])) if UTFIL[k]
                 else os.path.exists(os.path.join(mapp, 'markning.json')) and 'beskar' in las_json(os.path.join(mapp, 'markning.json')))
        if finns and not tvinga and k not in om:
            logg(f'{k}: finns redan — hoppar över (--om {k} tvingar)')
            continue
        if k == 'A':
            steg_a(klipp, mapp, fran, till)
        elif k == 'B':
            steg_b(mapp)
        elif k == 'C':
            steg_c(klipp, mapp, ocr_pa=ocr_pa, avkoda=avkoda)
        elif k == 'E':
            steg_e(klipp, mapp, uppskatta=uppskatta)
        tvinga = True   # ett steg som kördes gör de följande inaktuella
    return mapp


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('kommando', choices=['klipp', 'detektera', 'spar', 'namn', 'beskar', 'pass', 'rapport', 'forbered'])
    p.add_argument('mal', nargs='?', default='', help='klippet (.MOV) eller passmappen')
    p.add_argument('--fran', type=float, default=0.0)
    p.add_argument('--till', type=float, default=None)
    p.add_argument('--om', nargs='?', const='alla', default='', help='kör om: alla, eller stegen, t.ex. B,C,E')
    p.add_argument('--ocr', action='store_true', help='C: textläsaren också (bara upplysning, påverkar inte domen)')
    p.add_argument('--utan-avkodning', action='store_true', help='C: bara utsnitt som redan finns; en andra fråga som kräver avkodning hoppas över')
    p.add_argument('--uppskatta', action='store_true', help='E: mät också hur många MB de osäkra spåren skulle ge (avkodar deras rutor)')
    a = p.parse_args()
    flaggor = {'ocr_pa': a.ocr, 'avkoda': not a.utan_avkodning, 'uppskatta': a.uppskatta}
    om = set(STEG) if a.om == 'alla' else {x.strip().upper() for x in a.om.split(',') if x.strip()}
    if a.kommando == 'rapport':
        rapport(a.mal); return
    if a.kommando == 'forbered':
        # bara nätet: slumpnamnen, basländerna och deras bilder (går att köra medan en golden körs)
        nl = las_namnlistan()
        bank = Bank(None)
        namn = sorted(set(BAS) | set(slumpnamn(nl)))
        konst = bank.konstverk(namn)
        poster = [p for n in namn for p in konst[n]]
        bank.hamta(poster)
        logg(f'förberett: {len(namn)} namn, {len(poster)} bilder ({bank.hamtade} hämtade nu), utan bild: {[n for n in namn if not konst[n]]}')
        return
    if a.kommando == 'pass':
        passdir = os.path.abspath(a.mal) if os.path.isdir(a.mal) else os.path.join(ROT, 'dev', 'material', os.path.basename(a.mal))
        klipp = sorted(glob.glob(os.path.join(passdir, '*.MOV')) + glob.glob(os.path.join(passdir, '*.mov')))
        if not klipp:
            raise SystemExit(f'inga klipp i {passdir}')
        for k in klipp:
            kor_klipp(k, 0.0, None, STEG, om, **flaggor)
        rapport(os.path.basename(passdir)); return
    enskilt = {'detektera': ['A'], 'spar': ['B'], 'namn': ['C'], 'beskar': ['E'], 'klipp': STEG}[a.kommando]
    if a.kommando != 'klipp':
        om = om or (set(enskilt) if a.om else set())
    kor_klipp(a.mal, a.fran, a.till, enskilt, om, **flaggor)


if __name__ == '__main__':
    main()

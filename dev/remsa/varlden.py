"""MES-361 (G1 i dev/plan/lekar-och-minnet.md): hur bra är telefonen ensam mot hela världen, på nya HELA kort?

Samma fråga som helkort_jamfor.py — appens 61 riktiga beskärningar (dev/embed/riktiga) med bildmodellen
(lib.Bildmodell, centrering, poäng per namn, marginal till nästa namn) — men rangordnad mot tre listor:

  leken        lekens referenser (dev/embed/cache, som appen och helkort_jamfor.py)
  leken+500    leken + 500 slumpade kort ur världen (ett konstverk per namn, seed 361)
  världen      Scryfalls unique_artwork (alla konstverk, båda sidor av dubbelsidiga kort), utan lekens cache:
               telefonen vet inte vilken tryckning spelaren har

Receptet är förenklat mot appens (se VARIANTER): referenserna upprätta, frågan vriden fyra varv. Basland
räknas som typ (nyckel). --nav k lägger på navkorrigering (se Lista).

Steg (bilder och vektorer i ARBETE under dev/material, inte i git; ~5 GB):

    PY=~/.mesa/detektor-venv/bin/python
    $PY dev/remsa/varlden.py hamta                       # unique_artwork + bilderna (normal), ~25 min
    $PY dev/remsa/varlden.py vektorer                    # världens vektorer, skarp och sudd (~1 h var på Intel)
    $PY dev/remsa/varlden.py jamfor [--nav 10]           # rätt överst, säkra rätt/fel per marginal
    $PY dev/remsa/varlden.py orb-uppgifter [--nav 10] --listor världen
    node dev/embed/webb.cjs varlden.html "ORBSTEG('dev/embed/cache/varlden/orb-uppgifter-världen.json')" \
         --port 8391 > dev/embed/cache/varlden/orb-svar-världen.json   # appens ORB (utdrag.cjs först)
    $PY dev/remsa/varlden.py orb-dom [--nav 10] --listor världen   # trappans regel

Krymp världen (MES-361, "Resultat: krymp världen" i dev/plan/lekar-och-minnet.md): sök bara bland namn som
passar ett antagande ur det kameran redan sett. Filtren är delmängder av SAMMA världslista (samma centrering,
samma vektorer), så en smal lista kan inte ge fler rätt än världen utan att filtret släpper igenom rätt kort.

    $PY dev/remsa/varlden.py filter --filter farg:WBG            # A: lekens färgidentitet (facit)
    $PY dev/remsa/varlden.py filter --filter lagligt             # D: lagligt i något format
    $PY dev/remsa/varlden.py filter --filter larda:0-19          # B: färger ur 3 andra kort, 20 frön
    $PY dev/remsa/varlden.py filter --filter inga                # världen, som referens
    $PY dev/remsa/varlden.py orb-uppgifter --fslug farg-WBG --listor världen
    node dev/embed/webb.cjs varlden.html "ORBSTEG('dev/embed/cache/varlden/orb-uppgifter-världen-f-farg-WBG.json')" \
         --port 8391 > dev/embed/cache/varlden/orb-svar-världen-f-farg-WBG.json
    $PY dev/remsa/varlden.py orb-dom --fslug farg-WBG --listor världen
    $PY dev/remsa/varlden.py sammanfatta                         # tabellerna, trappan (smal → världen)
    $PY dev/remsa/varlden.py commander                           # världens storlek per färgidentitet

--modell <onnx> byter bildmodell (förval appens mobileclip-s0-vision.onnx, se lib.MODELL).
"""
import json, os, random, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import cv2

HAR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HAR)
from lib import Bildmodell, Referenser, las_referensbilder, kvadrat, suddig, vrid, ROT, MODELL, TROSKEL  # noqa: E402
from kalibrering import utan_marginal, RIKTIGA  # noqa: E402

ARGS = sys.argv[1:]


def arg(namn, standard=None):
    return ARGS[ARGS.index(namn) + 1] if namn in ARGS and ARGS.index(namn) + 1 < len(ARGS) else standard


ARBETE = arg('--arbete', os.path.join(ROT, 'dev', 'material', 'arbete', '2026-10-11-mes-361-varlden'))
BILDER = os.path.join(ARBETE, 'bilder')
BULK = os.path.join(ARBETE, 'unique_artwork.jsonl')
KATALOG = os.path.join(ARBETE, 'katalog.json')
MODELLFIL = arg('--modell', MODELL)
MODELLNAMN = os.path.splitext(os.path.basename(MODELLFIL))[0]
UA = {'User-Agent': 'mesa-g1-varlden/0.1 (funk.jesper@gmail.com)', 'Accept': '*/*'}
TROSKLAR = (0.06, 0.08, 0.11, 0.13, 0.15, 0.20)
BAS = {'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes'}
# Det som inte är ett kort man spelar med: tokens, konstkort, emblem, planer, scheman
INTE_KORT = {'token', 'double_faced_token', 'emblem', 'art_series', 'planar', 'scheme', 'vanguard', 'reversible_card'}
INTE_SET = {'token', 'memorabilia', 'minigame'}
os.makedirs(BILDER, exist_ok=True)


def logg(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def hamta_url(url, fil=None, forsok=4):
    for i in range(forsok):
        try:
            d = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
            if fil:
                tmp = fil + '.tmp'
                open(tmp, 'wb').write(d); os.replace(tmp, fil)
            return d
        except Exception:  # noqa: BLE001
            if i == forsok - 1:
                raise
            time.sleep(1 + 2 * i)


def bastyp(namn):
    """Basland som typ: Snow-Covered Plains räknas som Plains."""
    n = namn.replace('Snow-Covered ', '')
    return n if n in BAS else None


def samma_kort(svar, facit):
    """Rätt namn: samma namn, framsidan av ett dubbelsidigt kort, eller samma bastyp."""
    if svar is None:
        return False
    if svar == facit or svar.split(' // ')[0] == facit.split(' // ')[0]:
        return True
    return bastyp(svar) is not None and bastyp(svar) == bastyp(facit)


# ── 1. hämta världen ─────────────────────────────────────────────────────────
def las_bulk():
    if not os.path.exists(BULK):
        bulk = json.loads(hamta_url('https://api.scryfall.com/bulk-data'))
        x = next(x for x in bulk['data'] if x['type'] == 'unique_artwork')
        uri = x.get('jsonl_download_uri') or x.get('download_uri')
        logg('hämtar unique_artwork', uri)
        d = hamta_url(uri)
        if uri.endswith('.gz'):
            import gzip
            d = gzip.decompress(d)
        text = d.decode('utf-8')
        if 'jsonl' not in uri:
            text = '\n'.join(json.dumps(c) for c in json.loads(text))
        open(BULK, 'w', encoding='utf-8').write(text)
    return [json.loads(r) for r in open(BULK, encoding='utf-8') if r.strip()]


def katalog():
    """[{namn, id, sida, url, fil}] — ett konstverk per rad, båda sidor av dubbelsidiga kort."""
    if os.path.exists(KATALOG):
        return json.load(open(KATALOG, encoding='utf-8'))
    ut, bort = [], {}
    for c in las_bulk():
        skal = None
        if c.get('layout') in INTE_KORT: skal = 'layout ' + c['layout']
        elif c.get('set_type') in INTE_SET: skal = 'set_type ' + c['set_type']
        elif c.get('oversized'): skal = 'oversized'
        elif c.get('digital') or 'paper' not in (c.get('games') or []): skal = 'inte papper'
        elif c.get('image_status') in ('missing', 'placeholder'): skal = 'ingen bild'
        if skal:
            bort[skal] = bort.get(skal, 0) + 1
            continue
        sidor = [(0, c['image_uris'])] if c.get('image_uris') else [(i, f.get('image_uris')) for i, f in enumerate(c.get('card_faces') or []) if f.get('image_uris')]
        for i, iu in sidor:
            if iu and iu.get('normal'):
                ut.append({'namn': c['name'], 'id': c['id'], 'sida': i, 'url': iu['normal'], 'fil': f"{c['id']}_{i}.jpg"})
    logg(f'katalog: {len(ut)} bilder, {len(set(r["namn"] for r in ut))} namn; bortsållat {bort}')
    json.dump(ut, open(KATALOG, 'w', encoding='utf-8'))
    return ut


def steg_hamta():
    kat = katalog()
    saknas = [r for r in kat if not os.path.exists(os.path.join(BILDER, r['fil']))]
    logg(f'{len(kat) - len(saknas)} finns, hämtar {len(saknas)}')
    t0, klara = time.time(), [0]

    def en(r):
        try:
            hamta_url(r['url'], os.path.join(BILDER, r['fil']))
        except Exception as e:  # noqa: BLE001
            logg('FEL', r['fil'], e)
        klara[0] += 1
        if klara[0] % 1000 == 0:
            logg(f'{klara[0]}/{len(saknas)} ({klara[0] / (time.time() - t0):.0f}/s)')

    with ThreadPoolExecutor(8) as ex:   # cards.scryfall.io har ingen hastighetsgräns som api.scryfall.com
        list(ex.map(en, saknas))
    logg('klart')


# ── 2. världens vektorer ─────────────────────────────────────────────────────
# Förenklingen (mätt på leken 2026-10-11, se dev/plan/lekar-och-minnet.md, Resultat G1): referenserna bara
# upprätta, frågan vriden fyra varv i stället, och den vridning vars etta har högst poäng gäller. Appens recept
# (referenserna × 4 vridningar) vore 8 körningar per bild — ~9 timmar för världen på en Intel-Mac. På lekens
# 61 beskärningar gav förenklingen 56/61 rätt och 49 säkra rätt / 2 säkra fel vid 0,11, appens recept 53 och 46 / 2.
# Kör med båda varianterna (förvalet skarp,sudd): med bara skarpa referenser blir liggande kort (split, battles,
# rum) nav mot världen, 20/61 rätt överst mot 40/61.
VARIANTER = tuple((arg('--varianter', 'skarp,sudd')).split(','))
VRIDNINGAR = (0, 90, 180, 270)


FSLUG = arg('--fslug', '')
FSUFF = ('-f-' + FSLUG) if FSLUG else ''


def jamforfil(fslug=None):
    f = FSUFF if fslug is None else (('-f-' + fslug) if fslug else '')
    return os.path.join(ARBETE, f'jamfor-{MODELLNAMN}-{"+".join(VARIANTER)}{"-nav" + str(NAV_K) if NAV_K else ""}{f}.json')


def vekfil(variant):
    return os.path.join(ARBETE, f'vektorer-{MODELLNAMN}-{variant}.npz')


def steg_vektorer():
    """Rå normerade vektorer (float16) per bild och variant, upprätt."""
    kat = [r for r in katalog() if os.path.exists(os.path.join(BILDER, r['fil']))]
    m = Bildmodell(MODELLFIL)
    for v in VARIANTER:
        f = vekfil(v)
        if os.path.exists(f):
            continue
        delar, gjorda = [], 0
        if os.path.exists(f + '.del.npz'):
            z = np.load(f + '.del.npz'); delar = [z['ra']]; gjorda = int(z['n'])
            logg(f'{v}: fortsätter efter {gjorda} bilder')
        t0 = time.time(); BIT = 512
        for i in range(gjorda, len(kat), BIT):
            kvad = []
            for r in kat[i:i + BIT]:
                img = cv2.imread(os.path.join(BILDER, r['fil']))
                if img is None:
                    img = np.zeros((680, 488, 3), np.uint8)
                rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                kvad.append(kvadrat(suddig(rgb)) if v == 'sudd' else kvadrat(rgb))
            delar.append(m.kor(kvad, batch=16).astype(np.float16))
            n = min(i + BIT, len(kat))
            np.savez(f + '.del.npz', ra=np.concatenate(delar), n=n)
            logg(f'{v}: {n}/{len(kat)} bilder, {(n - gjorda) / (time.time() - t0):.1f} bilder/s')
        np.savez(f, ra=np.concatenate(delar), filer=np.array([r['fil'] for r in kat]))
        os.remove(f + '.del.npz')
        logg('klart', f)


def nyckel(namn):
    """Basland som typ (appens landTyp, MES-228): poängen slås ihop per typ, marginalen till nästa ANNAT kort."""
    return bastyp(namn) or namn


NAV_K = int(arg('--nav', '0'))   # 0 = appens poäng; k > 0 = navkorrigering (CSLS) med k grannar, se Lista


class Lista:
    """Referenser som lib.Referenser (centrering, poäng per namn), ur förräknade råvektorer.

    --nav k: navkorrigering (CSLS, Lample m.fl. 2018). Mot 33 000 namn blir ett fåtal referenser "nav" som
    ligger nära nästan allt — i världen split-kort, battles och rum (Hit // Run, Invasion of …, Bottomless
    Pool // Locker Room), etta för 41 av 61 beskärningar. Varje referens poäng blir cos − ½·h, där h är
    medel-cos till dess k närmaste referenser med ANNAT namn (räknat i listan själv, utan frågorna)."""

    def __init__(self, namn_per_rad, ra, fil_per_rad):
        ra = ra.astype(np.float32)
        self.medel = ra.mean(axis=0)
        c = ra - self.medel
        self.vek = c / np.maximum(np.linalg.norm(c, axis=1, keepdims=True), 1e-9)
        nycklar = [nyckel(n) for n in namn_per_rad]
        self.namnlista = sorted(set(nycklar))
        idx = {n: i for i, n in enumerate(self.namnlista)}
        self._namnidx = np.array([idx[n] for n in nycklar])
        self.fil = fil_per_rad
        self.h = np.zeros(len(self.vek), np.float32)
        if NAV_K:
            t0 = time.time()
            for i in range(0, len(self.vek), 2048):
                s = self.vek[i:i + 2048] @ self.vek.T
                s[self._namnidx[i:i + 2048, None] == self._namnidx[None, :]] = -2   # samma namn räknas inte
                k = min(NAV_K, s.shape[1] - 1)
                self.h[i:i + 2048] = np.partition(s, -k, axis=1)[:, -k:].mean(axis=1)
            logg(f'navkorrigering k={NAV_K}: {len(self.vek)} referenser på {time.time() - t0:.0f} s')

    def _per(self, q):
        c = q - self.medel
        c = c / max(float(np.linalg.norm(c)), 1e-9)
        s = self.vek @ c - 0.5 * self.h
        per = np.full(len(self.namnlista), -2.0, np.float32)
        np.maximum.at(per, self._namnidx, s)
        return s, per

    def rangordna(self, qs, n=10):
        """qs: frågan i VRIDNINGAR → (lista [(namn, poäng)], vridningen) — vridningen med högst etta."""
        bast = None
        for rot, q in zip(VRIDNINGAR, qs):
            _, per = self._per(q)
            ordn = np.argsort(-per)[:n]
            l = [(self.namnlista[i], float(per[i])) for i in ordn]
            if bast is None or l[0][1] > bast[0][0][1]:
                bast = (l, rot)
        return bast

    def basta_filer(self, q, namn, n=1):
        """De N bilder (konstverk) av NAMN som låg närmast — dem jämför ORB mot."""
        s, _ = self._per(q)
        rader = np.where(self._namnidx == self.namnlista.index(namn))[0]
        ordn = rader[np.argsort(-s[rader])]
        ut = []
        for r in ordn:
            if self.fil[r] not in ut:
                ut.append(self.fil[r])
            if len(ut) == n:
                break
        return ut


def fragevektorer(m):
    man = json.load(open(os.path.join(RIKTIGA, 'manifest.json'), encoding='utf-8'))
    kv = []
    for p in man:
        sq = kvadrat(cv2.cvtColor(utan_marginal(cv2.imread(os.path.join(RIKTIGA, p['fil']))), cv2.COLOR_BGR2RGB))
        kv.extend(vrid(sq, r) for r in VRIDNINGAR)
    Q = m.kor(kv)
    return man, [Q[i * 4:i * 4 + 4] for i in range(len(man))]


def listorna(m):
    """{'leken', 'leken+500', 'världen'}: Lista med samma (förenklade) recept. Lekens rader har fil = Scryfall-id."""
    lekbilder = las_referensbilder()
    lekrefs = Referenser(m, lekbilder, rotar=(0,), varianter=VARIANTER)
    lekid = list(lekrefs.id)
    leknamn = set(n for n, _, _ in lekbilder)
    lek = Lista(lekrefs.namn, lekrefs.ra, ['lek:' + i for i in lekid])
    zs = [np.load(vekfil(v)) for v in VARIANTER]
    filer = list(zs[0]['filer'])
    ra = np.stack([z['ra'] for z in zs], axis=1).reshape(-1, zs[0]['ra'].shape[1])   # per bild: varianterna i följd
    kat = {r['fil']: r for r in katalog()}
    nv = len(VARIANTER)
    namn_rad = [kat[f]['namn'] for f in filer for _ in range(nv)]
    fil_rad = [f for f in filer for _ in range(nv)]
    varld = Lista(namn_rad, ra, fil_rad)
    # leken + 500: ett konstverk (framsidan) per slumpat namn som inte finns i leken och inte är basland
    forsta = {}
    for i, f in enumerate(filer):
        n = kat[f]['namn']
        if n not in leknamn and n.split(' // ')[0] not in leknamn and not bastyp(n) and kat[f]['sida'] == 0:
            forsta.setdefault(n, i)
    valda = random.Random(361).sample(sorted(forsta), 500)
    rader = np.concatenate([np.arange(forsta[n] * nv, forsta[n] * nv + nv) for n in valda])
    l500 = Lista(list(lekrefs.namn) + [namn_rad[r] for r in rader], np.concatenate([lekrefs.ra, ra[rader].astype(np.float32)]),
                 ['lek:' + i for i in lekid] + [fil_rad[r] for r in rader])
    return {'leken': lek, 'leken+500': l500, 'världen': varld}


def domen(lista, facit):
    a, b = lista[0], lista[1]
    # Oavrundat: domen (> 0,11, ≥ 0,15) ska fällas på samma tal som telefonen ser; avrunda bara i utskriften (MES-375)
    return {'namn': a[0], 'poang': float(a[1]), 'marginal': float(a[1] - b[1]), 'ratt': samma_kort(a[0], facit),
            'nast': b[0], 'topp': [n for n, _ in lista[:5]]}


def steg_jamfor():
    m = Bildmodell(MODELLFIL)
    man, Q = fragevektorer(m)
    L = listorna(m)
    ut = {}
    for lnamn, lista in L.items():
        t0 = time.perf_counter()
        rad = []
        for p, q in zip(man, Q):
            l, rot = lista.rangordna(q)
            d = domen(l, p['namn'])
            d.update({'rot': rot, 'ettans_bilder': lista.basta_filer(q[VRIDNINGAR.index(rot)], l[0][0], 3), 'kandidater': [
                {'namn': nn, 'filer': lista.basta_filer(q[VRIDNINGAR.index(rot)], nn, 1)} for nn, _ in l[:3]],'fil': p['fil'], 'facit': p['namn'], 'skymd': p['skymd'], 'helbild': p['helbild']})
            rad.append(d)
        ms = (time.perf_counter() - t0) * 1000 / len(man)
        ut[lnamn] = rad
        print(f"\n== {lnamn} ({len(lista.namnlista)} namn, {len(lista.vek)} referenser, {ms:.1f} ms/fråga i numpy): "
              f"{sum(r['ratt'] for r in rad)}/{len(rad)} rätt överst")
        for th in TROSKLAR:
            print(f"   marginal > {th:.2f}: säkra rätt {sum(r['ratt'] and r['marginal'] > th for r in rad)}, "
                  f"säkra fel {sum((not r['ratt']) and r['marginal'] > th for r in rad)}")
        for r in sorted([r for r in rad if not r['ratt']], key=lambda r: -r['marginal']):
            print(f"   fel {r['marginal']:.3f}  {r['fil']:14} {r['facit'][:26]:26} → {r['namn'][:30]:30}"
                  f"{' (skymd)' if r['skymd'] else ''}{' (helbild)' if r['helbild'] else ''}")
    json.dump(ut, open(os.path.join(ARBETE, f'jamfor-{MODELLNAMN}-{"+".join(VARIANTER)}{"-nav" + str(NAV_K) if NAV_K else ""}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


# ── 3b. krymp världen: filter på världslistan (MES-361, "Resultat: krymp världen") ─────────────────────────────
def varldlista():
    """Hela världen som Lista (skarp + sudd, som i listorna())."""
    zs = [np.load(vekfil(v)) for v in VARIANTER]
    filer = list(zs[0]['filer'])
    ra = np.stack([z['ra'] for z in zs], axis=1).reshape(-1, zs[0]['ra'].shape[1])
    kat = {r['fil']: r for r in katalog()}
    nv = len(VARIANTER)
    return Lista([kat[f]['namn'] for f in filer for _ in range(nv)], ra, [f for f in filer for _ in range(nv)])


def delmangd(lista, tillat):
    """Samma lista (samma centrering och vektorer) men bara namn vars nyckel finns i TILLAT."""
    ok = np.array([n in tillat for n in lista.namnlista])
    mask = ok[lista._namnidx]
    d = Lista.__new__(Lista)
    d.medel, d.vek, d.h = lista.medel, lista.vek[mask], lista.h[mask]
    d.fil = [f for f, k in zip(lista.fil, mask) if k]
    d.namnlista = [n for n, k in zip(lista.namnlista, ok) if k]
    d._namnidx = (np.cumsum(ok) - 1)[lista._namnidx[mask]]
    return d


def namnuppgifter():
    """{namn: {ci, lagligt, commander}} ur unique_artwork. Legalities är kortets (samma för alla tryck)."""
    ut = {}
    for c in las_bulk():
        n = c['name']
        if n in ut:
            continue
        lg = c.get('legalities') or {}
        ut[n] = {'ci': frozenset(c.get('color_identity') or []), 'lagligt': any(v in ('legal', 'restricted') for v in lg.values()),
                 'commander': lg.get('commander') in ('legal', 'restricted')}
    return ut


def slå_upp(nu, namn):
    if namn in nu:
        return nu[namn]
    for n, u in nu.items():
        if n.split(' // ')[0] == namn.split(' // ')[0]:
            return u
    raise KeyError(namn)


def lekkort():
    """Golden-lekens kort (unika namn)."""
    return sorted({c['name'] for c in json.load(open(os.path.join(ROT, 'dev', 'embed', 'cache', 'lek-golden.json'), encoding='utf-8'))['kort']})


def facit_i_listan(lista, facit):
    fronter = {n.split(' // ')[0] for n in lista.namnlista}
    return facit in lista.namnlista or facit.split(' // ')[0] in fronter or (bastyp(facit) is not None and bastyp(facit) in lista.namnlista)


def rader_for(lista, man, Q):
    rad = []
    for p, q in zip(man, Q):
        t0 = time.perf_counter()
        l, rot = lista.rangordna(q)
        ms = (time.perf_counter() - t0) * 1000
        d = domen(l, p['namn'])
        qr = q[VRIDNINGAR.index(rot)]
        d.update({'rot': rot, 'ettans_bilder': lista.basta_filer(qr, l[0][0], 3),
                  'kandidater': [{'namn': nn, 'filer': lista.basta_filer(qr, nn, 1)} for nn, _ in l[:3]],
                  'fil': p['fil'], 'facit': p['namn'], 'skymd': p['skymd'], 'helbild': p['helbild'],
                  'ms_numpy': round(ms, 1), 'namn_i_listan': len(lista.namnlista), 'facit_i_listan': facit_i_listan(lista, p['namn'])})
        rad.append(d)
    return rad


def steg_filter():
    """--filter inga | farg:lek | farg:WBG | lagligt | farg:lek+lagligt | larda:0-19. Skriver jamfor-…-f-<slug>.json
    med listan 'världen' (så att orb-uppgifter och orb-dom kan användas som de är)."""
    spec = arg('--filter', 'inga')
    m = Bildmodell(MODELLFIL)
    man, Q = fragevektorer(m)
    varld = varldlista()
    nu = namnuppgifter()
    lek = lekkort()
    lek_ci = frozenset().union(*[slå_upp(nu, n)['ci'] for n in lek])
    logg(f'lekens färgidentitet: {"".join(sorted(lek_ci))} ({len(lek)} namn); världen {len(varld.namnlista)} namn')
    cache = {}

    def bygg(ci, lagligt):
        k = (ci, lagligt)
        if k not in cache:
            tillat = {nyckel(n) for n, u in nu.items() if (ci is None or u['ci'] <= ci) and (not lagligt or u['lagligt'])}
            cache[k] = delmangd(varld, tillat) if (ci is not None or lagligt) else varld
        return cache[k]

    delar = spec.split('+')
    lagligt = 'lagligt' in delar
    farg = next((d.split(':')[1] for d in delar if d.startswith('farg:')), None)
    larda = next((d.split(':')[1] for d in delar if d.startswith('larda:')), None)
    if larda is not None:
        a, b = (larda.split('-') + [larda])[:2] if '-' in larda else (larda, larda)
        korningar = [(f'larda{s}' + ('+lagligt' if lagligt else ''), s) for s in range(int(a), int(b) + 1)]
    else:
        korningar = [(spec.replace(':', '-'), None)]
    for slug, seed in korningar:
        if seed is not None:
            rader, nmn = [], []
            for i, (p, q) in enumerate(zip(man, Q)):
                andra = [n for n in lek if nyckel(n) != nyckel(p['namn']) and n.split(' // ')[0] != p['namn'].split(' // ')[0]]
                tre = random.Random(seed * 1000 + i).sample(andra, 3)
                ci = frozenset().union(*[slå_upp(nu, n)['ci'] for n in tre])
                lista = bygg(ci, lagligt)
                r = rader_for(lista, [p], [q])[0]
                r['larda_fran'] = tre; r['larda_ci'] = ''.join(sorted(ci)); r['facit_ci_ok'] = slå_upp(nu, p['namn'])['ci'] <= ci
                rader.append(r)
        else:
            lista = bygg(lek_ci if farg == 'lek' else (frozenset(farg) if farg else None), lagligt)
            rader = rader_for(lista, man, Q)
        f = jamforfil(slug)
        json.dump({'världen': rader}, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f"{slug}: {sum(r['ratt'] for r in rader)}/{len(rader)} rätt överst, namn i listan {rader[0]['namn_i_listan']}"
              f"{'' if seed is not None else ''}, facit utanför listan {sum(not r['facit_i_listan'] for r in rader)}, "
              f"{np.median([r['ms_numpy'] for r in rader]):.0f} ms/fråga (median) → {os.path.relpath(f, ROT)}", flush=True)
    if lagligt and larda is None:
        borta = sorted(n for n, u in nu.items() if not u['lagligt'])
        kat = {r['namn'] for r in katalog()}
        print(f"lagligt: {len([n for n in borta if n in kat])} av {len(kat)} namn bort. Lekens kort som försvinner: "
              f"{[n for n in lek if not slå_upp(nu, n)['lagligt']]}. Facitets kort som försvinner: "
              f"{sorted({p['namn'] for p in man if not slå_upp(nu, p['namn'])['lagligt']})}")


def steg_commander():
    """Hur stor världen blir med en färgidentitet på 0, 1, 2, 3, 5 färger (alla kombinationer) — vad en gissad commander ger."""
    import itertools
    nu = namnuppgifter()
    kat = {r['namn'] for r in katalog()}
    nu = {n: u for n, u in nu.items() if n in kat}
    print(f'världen: {len(nu)} namn; lagliga i Commander: {sum(u["commander"] for u in nu.values())}')
    for k in (0, 1, 2, 3, 5):
        st, stc = [], []
        for comb in itertools.combinations('WUBRG', k):
            c = frozenset(comb)
            st.append(sum(u['ci'] <= c for u in nu.values()))
            stc.append(sum(u['ci'] <= c and u['commander'] for u in nu.values()))
        print(f'{k} färger ({len(st)} kombinationer): {np.mean(st):.0f} namn i snitt (min {min(st)}, max {max(st)}); '
              f'bara Commander-lagliga: {np.mean(stc):.0f} (min {min(stc)}, max {max(stc)})')


def trappa_saker(r, o):
    """Trappans regel (orb-dom): ORB bär ettan, basland på typ ≥ 0,15 och ORB inte emot."""
    return o['bar'] if not bastyp(r['namn']) else (r['marginal'] >= 0.15 and not o['emot'])


def las_filter(slug):
    j = json.load(open(jamforfil(slug), encoding='utf-8'))['världen']
    svar = json.load(open(os.path.join(UPPG, f'orb-svar-världen-f-{slug}.json'), encoding='utf-8'))['ut']
    return j, svar


def mat(rad):
    """rad: [(r, o)] → mått per grupp (alla, nya oskymda icke-basland, basland)."""
    ut = {}
    grupper = {'alla': lambda r: True, 'nya': lambda r: not r['skymd'] and not bastyp(r['facit']), 'basland': lambda r: bool(bastyp(r['facit']))}
    for g, f in grupper.items():
        x = [(r, o) for r, o in rad if f(r)]
        ut[g] = {'n': len(x), 'ratt': sum(r['ratt'] for r, _ in x),
                 'sr': sum(r['ratt'] and trappa_saker(r, o) for r, o in x), 'sf': sum((not r['ratt']) and trappa_saker(r, o) for r, o in x),
                 'msr': sum(r['ratt'] and r['marginal'] > TROSKEL for r, _ in x), 'msf': sum((not r['ratt']) and r['marginal'] > TROSKEL for r, _ in x)}
    return ut


def steg_sammanfatta():
    """Tabellerna: per filter, och trappan (smal lista → hela världen om inget blev säkert). --slugar a,b,c (larda = larda0..larda19)."""
    slugar = arg('--slugar', 'inga,farg-lek,lagligt,farg-lek+lagligt,larda').split(',')
    varld_j, varld_o = las_filter('inga')
    print(f"världen ({varld_j[0]['namn_i_listan']} namn): ", end='')
    for slug in slugar:
        stora = [f'larda{s}' for s in range(20)] if slug == 'larda' else [slug]
        stora = [s for s in stora if os.path.exists(jamforfil(s)) and os.path.exists(os.path.join(UPPG, f'orb-svar-världen-f-{s}.json'))]
        if not stora:
            print(f'\n{slug}: saknar körning'); continue
        per = []
        for s in stora:
            j, o = las_filter(s)
            rad = list(zip(j, o))
            mm = mat(rad)
            # trappan: smal först, sedan världen om inget blev säkert
            sr = sf = 0; sr_n = sf_n = 0; tid = []; fallb = 0; fel = []
            for (r, oo), (rw, ow) in zip(rad, zip(varld_j, varld_o)):
                smal_saker = trappa_saker(r, oo)
                t1 = r['ms_numpy'] + oo['tOrb'] + oo['tHamt']
                if smal_saker:
                    rr, ok, t = r['ratt'], True, t1; kalla = 'smal'
                else:
                    fallb += 1
                    ok = trappa_saker(rw, ow); rr = rw['ratt']; kalla = 'världen'
                    t = t1 + rw['ms_numpy'] + ow['tOrb'] + ow['tHamt']
                tid.append(t)
                nya = not r['skymd'] and not bastyp(r['facit'])
                if ok and rr:
                    sr += 1; sr_n += nya
                if ok and not rr:
                    sf += 1; sf_n += nya; fel.append(f"{r['facit']} → {(r if kalla == 'smal' else rw)['namn']} ({kalla})")
            per.append({'slug': s, 'mm': mm, 'trappa': {'sr': sr, 'sf': sf, 'sr_nya': sr_n, 'sf_nya': sf_n, 'ms': float(np.mean(tid)), 'fallback': fallb, 'fel': fel},
                        'namn': j[0]['namn_i_listan'] if s != 'larda' else None,
                        'namn_snitt': float(np.mean([x['namn_i_listan'] for x in j])), 'utanfor': sum(not x['facit_i_listan'] for x in j),
                        'ms_numpy': float(np.median([x['ms_numpy'] for x in j])), 'orb': float(np.mean([x['tOrb'] for x in o])),
                        'hamt': float(np.median([x['tHamt'] for x in o])),
                        'sf_smal': [f"{r['facit']} → {r['namn']}" for r, oo in rad if (not r['ratt']) and trappa_saker(r, oo)]})
        def agg(f):
            v = [f(p) for p in per]
            return f'{np.mean(v):.1f}' + (f' ({min(v)}–{max(v)})' if len(v) > 1 else '')
        print(f"\n== {slug} ({len(per)} körning{'ar' if len(per) > 1 else ''})")
        print(f"   namn i listan (snitt) {agg(lambda p: p['namn_snitt'])}, facit utanför listan {agg(lambda p: p['utanfor'])}/61, "
              f"numpy {agg(lambda p: p['ms_numpy'])} ms, ORB {agg(lambda p: p['orb'])} ms, hämtning (median) {agg(lambda p: p['hamt'])} ms")
        for g in ('alla', 'nya', 'basland'):
            print(f"   {g:8} n={per[0]['mm'][g]['n']:2}  rätt överst {agg(lambda p: p['mm'][g]['ratt'])}  "
                  f"smal lista: säkra rätt {agg(lambda p: p['mm'][g]['sr'])} / säkra fel {agg(lambda p: p['mm'][g]['sf'])}   "
                  f"(modellen ensam >0,11: {agg(lambda p: p['mm'][g]['msr'])} / {agg(lambda p: p['mm'][g]['msf'])})")
        if slug != 'inga':
            print(f"   TRAPPAN (smal → världen): alla säkra rätt {agg(lambda p: p['trappa']['sr'])} / säkra fel {agg(lambda p: p['trappa']['sf'])}; "
                  f"nya säkra rätt {agg(lambda p: p['trappa']['sr_nya'])} / fel {agg(lambda p: p['trappa']['sf_nya'])}; "
                  f"fallback till världen {agg(lambda p: p['trappa']['fallback'])} av 61; tid {agg(lambda p: p['trappa']['ms'])} ms/beskärning (numpy+ORB+hämtning)")
        fel = sorted({x for p in per for x in p['sf_smal']})
        felt = sorted({x for p in per for x in p['trappa']['fel']})
        if fel: print(f"   SÄKRA FEL i smal lista: {fel}")
        if felt: print(f"   SÄKRA FEL i trappan: {felt}")


# ── 4. trappans steg 3: bildmodellen OCH ORB ──────────────────────────────────
UPPG = os.path.join(ROT, 'dev', 'embed', 'cache', 'varlden')   # sidan når bara repot (dev/embed/server.cjs)
LISTOR_ORB = tuple(arg('--listor', 'leken,världen').split(','))


def smalls():
    """{fil: Scryfalls small-URL} — appens ORB-pool byggs ur small (146 × 204)."""
    f = os.path.join(ARBETE, 'small.json')
    if os.path.exists(f):
        return json.load(open(f, encoding='utf-8'))
    ut = {}
    for c in las_bulk():
        sidor = [(0, c.get('image_uris'))] if c.get('image_uris') else [(i, x.get('image_uris')) for i, x in enumerate(c.get('card_faces') or [])]
        for i, iu in sidor:
            if iu and iu.get('small'):
                ut[f"{c['id']}_{i}.jpg"] = iu['small']
    json.dump(ut, open(f, 'w', encoding='utf-8'))
    return ut


def steg_orb_uppgifter():
    """Uppgifterna till dev/embed/varlden.html: per beskärning bildmodellens etta och kandidaternas bilder.
    leken: alla lekens bilder av de tre bästa namnen (som appens pool). världen: bästa konstverket av vart
    och ett av de tre bästa namnen, hämtat från Scryfall vid behov."""
    j = json.load(open(jamforfil(), encoding="utf-8"))
    lek = json.load(open(os.path.join(ROT, 'dev', 'embed', 'cache', 'lek-golden.json'), encoding='utf-8'))['kort']
    sm = None
    os.makedirs(UPPG, exist_ok=True)
    for lnamn in LISTOR_ORB:
        upp = []
        for r in j[lnamn]:
            namn3 = [k['namn'] for k in r['kandidater']]
            # lekens namn: alla lekens bilder (som appens pool); andra namn: bästa konstverket, hämtat vid behov
            leknycklar = {nyckel(c['name']) for c in lek}
            bilder = [{'namn': nyckel(c['name']), 'url': '/dev/embed/' + c['smallFil']} for c in lek if nyckel(c['name']) in namn3]
            for k in r['kandidater']:
                if k['namn'] not in leknycklar or lnamn == 'världen':
                    sm = sm or smalls()
                    bilder += [{'namn': k['namn'], 'url': sm[f]} for f in k['filer'] if not f.startswith('lek:')]
            if lnamn == 'världen':
                bilder = [b for b in bilder if not b['url'].startswith('/dev/embed/')]
            upp.append({'fraga': 'dev/embed/riktiga/' + r['fil'], 'marginalBeskarning': 0.08, 'rot': (360 - r['rot']) % 360,
                        'etta': r['namn'], 'marginal': r['marginal'], 'troskel': TROSKEL, 'land': bool(bastyp(r['namn'])),
                        'landNamn': [n for n in namn3 if bastyp(n)], 'bilder': bilder, 'hamta': lnamn != 'leken'})
        f = os.path.join(UPPG, f'orb-uppgifter-{lnamn}{FSUFF}.json')
        json.dump(upp, open(f, 'w', encoding='utf-8'), ensure_ascii=False)
        print(os.path.relpath(f, ROT))


def steg_orb_dom():
    """Domen per lista ur varlden.html:s svar (orb-svar-<lista>.json): appens bär-regel och trappans regel."""
    j = json.load(open(jamforfil(), encoding="utf-8"))
    LAND_MARGINAL = 0.15
    for lnamn in LISTOR_ORB:
        f = os.path.join(UPPG, f'orb-svar-{lnamn}{FSUFF}.json')
        if not os.path.exists(f):
            continue
        svar = json.load(open(f, encoding='utf-8'))['ut']
        rad = []
        for r, o in zip(j[lnamn], svar):
            land = bool(bastyp(r['namn']))
            regler = {
                'modellen > 0,11': r['marginal'] > TROSKEL,
                'modellen > 0,11 och ORB inte emot': r['marginal'] > TROSKEL and not o['emot'],
                'ORB bär ettan (appens trappa)': o['bar'],
                'modellen > 0,11 OCH ORB bär': r['marginal'] > TROSKEL and o['bar'],
                'trappan: ORB bär, basland på typ ≥ 0,15': (o['bar'] if not land else (r['marginal'] >= LAND_MARGINAL and not o['emot'])),
            }
            rad.append((r, o, regler))
        print(f"\n== {lnamn}: ORB {sum(o['tOrb'] for _, o, _ in rad) / len(rad):.0f} ms/beskärning i snitt (Mac, huvudlös Chrome), "
              f"hämtning {sorted(o['tHamt'] for _, o, _ in rad)[len(rad) // 2]:.0f} ms median / {max(o['tHamt'] for _, o, _ in rad):.0f} ms max "
              f"({rad[0][1]['bilder']}–{max(o['bilder'] for _, o, _ in rad)} bilder)")
        for regel in rad[0][2]:
            sr = sum(r['ratt'] and g[regel] for r, _, g in rad); sf = [r for r, _, g in rad if g[regel] and not r['ratt']]
            print(f"   {regel:44} säkra rätt {sr:2}, säkra fel {len(sf)}" + (f"  ({', '.join(x['facit'] + ' → ' + x['namn'] for x in sf)})" if sf else ''))
        for r, o, g in rad:
            if not r['ratt'] or (r['ratt'] and not g['trappan: ORB bär, basland på typ ≥ 0,15']):
                print(f"   {'FEL ' if not r['ratt'] else 'osäk'} {r['fil']:13} {r['facit'][:24]:24} → {r['namn'][:26]:26} m {r['marginal']:.3f}  "
                      f"ORB {o['orbNamn'] or '-'} {o['inliers']} skala {o['skala'] if o['skala'] is None else round(o['skala'], 2)} bär {o['bar']} emot {o['emot']}")


if __name__ == '__main__':
    steg = ARGS[0] if ARGS else ''
    {'hamta': steg_hamta, 'vektorer': steg_vektorer, 'jamfor': steg_jamfor,
     'orb-uppgifter': steg_orb_uppgifter, 'orb-dom': steg_orb_dom, 'filter': steg_filter, 'commander': steg_commander,
     'sammanfatta': steg_sammanfatta}.get(steg, lambda: print(__doc__))()

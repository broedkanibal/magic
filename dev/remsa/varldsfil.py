"""MES-375 (etapp 2a): världens fingeravtryck i EN fil som telefonen laddar ned — byggd, läst och mätt.

Världen är G1:s (varlden.py): Scryfalls unique_artwork, 49 546 bilder, 33 223 namn, vektorerna redan
räknade med appens bildmodell (vektorer-mobileclip-s0-vision-{skarp,sudd}.npz). Den här filen räknar
inga bilder om; den packar vektorerna i olika varianter och mäter varje variant LÄST UR FILEN, med G1:s
regel (trappan: ORB bär bildmodellens etta), mot appens 61 riktiga beskärningar.

    PY=~/.mesa/detektor-venv/bin/python
    $PY dev/remsa/varldsfil.py bygg --variant B            # en variant → <UT>/varld-B.bin (+ .bin.gz)
    $PY dev/remsa/varldsfil.py bygg --variant alla         # A B C D E1 E2 F1 F2
    $PY dev/remsa/varldsfil.py fragor                      # frågevektorerna (61 × 4 vridningar) → fragor.npz/.json
    $PY dev/remsa/varldsfil.py matt --variant B --port 8395  # rangordna ur filen, ORB (bara nya par), domen
    $PY dev/remsa/varldsfil.py sammanfatta                 # tabellen över alla mätta varianter (+ JSON)
    $PY dev/remsa/varldsfil.py kontroll-js --variant B --port 8395   # 5a: JS-läsaren mot Python-läsaren
    $PY dev/remsa/varldsfil.py kontroll-modell --port 8395 [--stickprov 200] [--gpu]   # 5b: embed.js mot lib.Bildmodell

UT (förval dev/material/arbete/2026-10-15-mes-375-varldsfil, --ut byter) håller filerna, ORB-cachen
(orb-par.json: en rad per beskärning × vridning × kandidatbild, så en ny variant kör ORB bara för nya
par) och mätresultaten. Formatet: dev/remsa/LÄS-MIG-varldsfil.md och dev/embed/varld.js.

Varianterna (VARIANTER nedan): kvantisering fp16 | int8, vilka referenser (skarp+sudd, bara sudd, en per
konstverk = medel av skarp och sudd, en per namn), och PCA (färre dimensioner).

int8-schemat: symmetriskt per vektor. Varje referens är redan centrerad och normerad (enhetsvektor), så
q = round(v · 127 / max|v|) använder hela int8-området för just den vektorn, och skalan sparas som
1 / |q| (float32) — den kvantiserade vektorn blir då exakt en enhetsvektor igen, och poängen
skala · (q · fråga) är cos mellan frågan och den kvantiserade riktningen. Per vektor och inte per
dimension: poängen jämförs mellan referenser (bästa per namn, marginal till nästa namn), och då ska varje
referens fel vara litet i förhållande till sin egen längd; en gemensam skala per dimension ger vektorer med
spetsiga värden grövre steg än andra. Kostnaden är 4 byte per referens (0,4 MB för världen).
"""
import gzip, hashlib, json, os, re, struct, subprocess, sys, time

import numpy as np

HAR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HAR)
import varlden as V  # noqa: E402  (läser bara sys.argv för sina egna flaggor; våra heter annorlunda)
from lib import Bildmodell, ROT, TROSKEL  # noqa: E402

ARGS = sys.argv[1:]


def arg(namn, standard=None):
    return ARGS[ARGS.index(namn) + 1] if namn in ARGS and ARGS.index(namn) + 1 < len(ARGS) else standard


UT = arg('--ut', os.path.join(ROT, 'dev', 'material', 'arbete', '2026-10-15-mes-375-varldsfil'))
PORT = int(arg('--port', '8395'))
MAGI = b'MESV'
FORMAT_V = 1
MODELLNYCKEL = 'mobileclip-s0|v1'   # embed.js: 'mobileclip-s0|v' + V — samma modell och recept som leken
VRID = (0, 90, 180, 270)

# variant: kvant, referenser ('skarp+sudd' | 'sudd' | 'konstverk' (medel av skarp och sudd) | 'namn'), pca (0 = alla 512)
VARIANTER = {
    'A':  dict(kvant='fp16', ref='skarp+sudd', pca=0, om='fp16, skarp + sudd (= G1)'),
    'B':  dict(kvant='int8', ref='skarp+sudd', pca=0, om='int8, skarp + sudd'),
    'C':  dict(kvant='int8', ref='sudd', pca=0, om='int8, bara sudd'),
    'D':  dict(kvant='int8', ref='namn', pca=0, om='int8, en referens per namn (medel av alla konstverk och båda varianterna)'),
    'E1': dict(kvant='int8', ref='skarp+sudd', pca=256, om='PCA 256 + int8, skarp + sudd'),
    'E2': dict(kvant='int8', ref='skarp+sudd', pca=128, om='PCA 128 + int8, skarp + sudd'),
    'F1': dict(kvant='int8', ref='konstverk', pca=0, om='int8, en per konstverk (medel av skarp och sudd)'),
    'F2': dict(kvant='int8', ref='sudd', pca=256, om='PCA 256 + int8, bara sudd'),
    # efter första mätningen (2026-10-15): bara sudd med sitt EGET medel, och PCA mellan 128 och 512
    'C2': dict(kvant='int8', ref='sudd', pca=0, medel='egna', om='int8, bara sudd, centrerad mot suddens eget medel'),
    'E3': dict(kvant='int8', ref='skarp+sudd', pca=384, om='PCA 384 + int8, skarp + sudd'),
    'E4': dict(kvant='int8', ref='skarp+sudd', pca=192, om='PCA 192 + int8, skarp + sudd'),
}


def logg(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def normera(x):
    return x / np.maximum(np.linalg.norm(x, axis=-1, keepdims=True), 1e-9)


def filnamn(variant):
    return os.path.join(UT, f'varld-{variant}.bin')


# ── 1. bygg ───────────────────────────────────────────────────────────────────
def varldens_rader():
    """Som varlden.varldlista(): rå vektorer (float32) per bild och variant, bildernas filnamn och namn (nyckel)."""
    sk = np.load(V.vekfil('skarp')); su = np.load(V.vekfil('sudd'))
    filer = list(sk['filer'])
    assert filer == list(su['filer']), 'skarp och sudd har olika bildordning'
    kat = {r['fil']: r for r in V.katalog()}
    return filer, [V.nyckel(kat[f]['namn']) for f in filer], sk['ra'].astype(np.float32), su['ra'].astype(np.float32)


def bygg(variant):
    cfg = VARIANTER[variant]
    filer, nycklar, sk, su = varldens_rader()
    M = len(filer)
    # Centreringen som G1 (varlden.Lista): medel över skarp + sudd, båda varianterna i listan. Samma medel i alla
    # varianter — frågan centreras alltid mot samma punkt, så en variant skiljer sig bara i referenserna.
    # medel='egna' (C2): bara suddens medel (det enda som skiljer C2 från C).
    medel = np.concatenate([sk, su]).mean(axis=0) if cfg.get('medel') != 'egna' else su.mean(axis=0)
    csk, csu = normera(sk - medel), normera(su - medel)
    if cfg['ref'] == 'skarp+sudd':
        vek = np.stack([csk, csu], axis=1).reshape(-1, sk.shape[1]); bild = np.repeat(np.arange(M), 2); radnamn = [n for n in nycklar for _ in range(2)]
    elif cfg['ref'] == 'sudd':
        vek = csu; bild = np.arange(M); radnamn = list(nycklar)
    elif cfg['ref'] == 'konstverk':
        vek = normera(csk + csu); bild = np.arange(M); radnamn = list(nycklar)
    elif cfg['ref'] == 'namn':
        namnlista = sorted(set(nycklar)); idx = {n: i for i, n in enumerate(namnlista)}
        ni = np.array([idx[n] for n in nycklar])
        summa = np.zeros((len(namnlista), sk.shape[1]), np.float32)
        np.add.at(summa, ni, csk + csu)
        vek = normera(summa)
        # bilden till ORB: konstverket närmast namnets medel (medoiden) — ORB behöver ett konstverk att jämföra med
        per_bild = np.einsum('ij,ij->i', normera(csk + csu), vek[ni])
        ordn = np.lexsort((-per_bild, ni))
        forsta = np.ones(M, bool); forsta[1:] = ni[ordn][1:] != ni[ordn][:-1]
        bild = np.zeros(len(namnlista), np.int64); bild[ni[ordn][forsta]] = ordn[forsta]
        radnamn = namnlista
    else:
        raise SystemExit('okänd ref ' + cfg['ref'])
    pca = None
    if cfg['pca']:
        # PCA på referenserna själva (redan centrerade, så andra momentet = kovariansen): de d största riktningarna.
        C = (vek.T @ vek) / len(vek)
        egen, P = np.linalg.eigh(C)
        pca = P[:, np.argsort(-egen)[:cfg['pca']]].T.astype(np.float32)   # (d, 512)
        forklarad = float(np.sort(egen)[::-1][:cfg['pca']].sum() / egen.sum())
        vek = normera(vek @ pca.T)
    namnlista = sorted(set(radnamn)); nidx = {n: i for i, n in enumerate(namnlista)}
    namnidx = np.array([nidx[n] for n in radnamn])
    if cfg['kvant'] == 'int8':
        q = np.rint(vek * (127.0 / np.maximum(np.abs(vek).max(axis=1, keepdims=True), 1e-9))).astype(np.int8)
        skala = (1.0 / np.maximum(np.linalg.norm(q.astype(np.float32), axis=1), 1e-9)).astype(np.float32)
        vekbytes = q
    else:
        vekbytes = vek.astype(np.float16); skala = None
    # bilderna: Scryfall-id (16 byte) + sida, en rad per konstverk i världen
    ids = np.frombuffer(b''.join(bytes.fromhex(f.split('_')[0].replace('-', '')) for f in filer), np.uint8).reshape(M, 16)
    sidor = np.array([int(f.split('_')[1].split('.')[0]) for f in filer], np.uint8)
    delar = [('medel', 'f32', medel.astype(np.float32))]
    if pca is not None:
        delar.append(('pca', 'f32', pca))
    delar += [('vek', cfg['kvant'] if cfg['kvant'] == 'int8' else 'f16', vekbytes)]
    if skala is not None:
        delar.append(('skala', 'f32', skala))
    delar += [('namnidx', 'u16' if len(namnlista) < 65536 else 'u32', namnidx.astype(np.uint16 if len(namnlista) < 65536 else np.uint32)),
              ('bild', 'u32', bild.astype(np.uint32)), ('bild_id', 'u8', ids), ('bild_sida', 'u8', sidor),
              ('namn', 'utf8', np.frombuffer('\n'.join(namnlista).encode('utf-8'), np.uint8))]
    huvud = {'format': 'mesa-varld', 'formatV': FORMAT_V, 'modell': MODELLNYCKEL, 'modellfil': V.MODELLNAMN + '.onnx',
             'variant': variant, 'om': cfg['om'], 'kvant': cfg['kvant'], 'ref': cfg['ref'],
             'skala': 'per vektor, 1/|q| (dekvantiserad vektor = enhetsvektor)' if cfg['kvant'] == 'int8' else None,
             'dimIn': int(sk.shape[1]), 'dim': int(vek.shape[1]), 'pca': int(cfg['pca']), 'pcaForklarad': round(forklarad, 4) if pca is not None else None,
             'antal': int(len(vek)), 'namnAntal': len(namnlista), 'bildAntal': M,
             'recept': 'referenserna upprätta; frågan: bildmodellens normerade vektor i 4 vridningar (0,90,180,270), minus medel, normerad'
                       + (', projicerad med pca och normerad igen' if pca is not None else '') + '; poäng per namn = bästa referens; vridningen med högst etta gäller',
             'nyckel': 'basland som typ: Plains, Island, Swamp, Mountain, Forest, Wastes (Snow-Covered räknas som typen)',
             'kalla': 'Scryfall unique_artwork (varlden.py), ' + time.strftime('%Y-%m-%d', time.localtime(os.path.getmtime(V.KATALOG))),
             'byggd': time.strftime('%Y-%m-%d %H:%M'), 'delar': {}}
    # Huvudet först utan positioner för att få längden, sedan med: positionerna är absoluta, varje del på 8 byte.
    def layout(hlen):
        pos = 8 + hlen; pos += (-pos) % 8; ut = {}
        for namn, typ, arr in delar:
            ut[namn] = {'typ': typ, 'form': list(arr.shape), 'start': pos, 'bytes': int(arr.nbytes)}
            pos += arr.nbytes; pos += (-pos) % 8
        return ut, pos
    hlen = 0
    for _ in range(5):
        huvud['delar'], _slut = layout(hlen)
        hb = json.dumps(huvud, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
        if len(hb) == hlen:
            break
        hlen = len(hb)
    assert len(hb) <= hlen, 'huvudets längd stabiliserades inte'
    hb = hb.ljust(hlen)
    os.makedirs(UT, exist_ok=True)
    f = filnamn(variant)
    with open(f + '.tmp', 'wb') as ut:
        ut.write(MAGI + struct.pack('<I', len(hb)) + hb)
        for namn, _typ, arr in delar:
            assert ut.tell() <= huvud['delar'][namn]['start'], namn
            ut.write(b'\0' * (huvud['delar'][namn]['start'] - ut.tell()))
            ut.write(np.ascontiguousarray(arr).astype(arr.dtype.newbyteorder('<')).tobytes())
        ut.write(b'\0' * ((-ut.tell()) % 8))
    os.replace(f + '.tmp', f)
    ra = open(f, 'rb').read()
    gz = gzip.compress(ra, compresslevel=9, mtime=0)
    open(f + '.gz', 'wb').write(gz)
    storlek = {'ra': len(ra), 'gzip': len(gz), 'sha256': hashlib.sha256(ra).hexdigest()}
    if '--brotli' in ARGS:
        storlek['brotli'] = len(subprocess.run(['brotli', '-c', '-q', '9', f], capture_output=True, check=True).stdout)
    json.dump(storlek, open(f + '.storlek.json', 'w'))
    logg(f"{variant}: {cfg['om']}: {len(vek)} referenser × {vek.shape[1]}, {len(namnlista)} namn → {os.path.relpath(f, ROT)} "
         f"{len(ra) / 1e6:.1f} MB, gzip {len(gz) / 1e6:.1f} MB" + (f", brotli {storlek['brotli'] / 1e6:.1f} MB" if 'brotli' in storlek else '')
         + (f"; PCA förklarar {huvud['pcaForklarad']:.1%}" if pca is not None else ''))


# ── 2. läs (det som faktiskt skickas) ──────────────────────────────────────────
TYP = {'f32': np.float32, 'f16': np.float16, 'int8': np.int8, 'u16': np.uint16, 'u32': np.uint32, 'u8': np.uint8, 'utf8': np.uint8}


def las_fil(f):
    b = open(f, 'rb').read()
    if b[:2] == b'\x1f\x8b':
        b = gzip.decompress(b)
    assert b[:4] == MAGI, 'inte en världsfil'
    hlen = struct.unpack('<I', b[4:8])[0]
    huvud = json.loads(b[8:8 + hlen].decode('utf-8'))
    d = {}
    for namn, x in huvud['delar'].items():
        dt = np.dtype(TYP[x['typ']]).newbyteorder('<')
        arr = np.frombuffer(b, dt, count=x['bytes'] // dt.itemsize, offset=x['start'])
        d[namn] = arr.reshape(x['form']) if x['typ'] != 'utf8' else arr
    return huvud, d


class FilLista(V.Lista):
    """varlden.Lista byggd ur en världsfil: samma rangordna/basta_filer/rader_for som G1, med filens vektorer."""

    def __init__(self, f):  # noqa: D401  (Lista.__init__ körs inte: inget räknas om)
        self.huvud, d = las_fil(f)
        self.medel = d['medel'].astype(np.float32)
        self.pca = d['pca'].astype(np.float32) if 'pca' in d else None
        v = d['vek'].astype(np.float32)
        self.vek = v * d['skala'][:, None] if 'skala' in d else v
        self.namnlista = bytes(d['namn']).decode('utf-8').split('\n')
        self._namnidx = d['namnidx'].astype(np.int64)
        ids, sid = d['bild_id'], d['bild_sida']
        hexid = [h[:8] + '-' + h[8:12] + '-' + h[12:16] + '-' + h[16:20] + '-' + h[20:] for h in (bytes(r).hex() for r in ids)]
        self.bild = d['bild'].astype(np.int64)
        self.fil = [f'{hexid[i]}_{sid[i]}.jpg' for i in self.bild]
        self.h = np.zeros(len(self.vek), np.float32)

    def _per(self, q):
        c = q - self.medel
        c = c / max(float(np.linalg.norm(c)), 1e-9)
        if self.pca is not None:
            c = self.pca @ c
            c = c / max(float(np.linalg.norm(c)), 1e-9)
        s = self.vek @ c
        per = np.full(len(self.namnlista), -2.0, np.float32)
        np.maximum.at(per, self._namnidx, s)
        return s, per


# ── 3. frågorna ──────────────────────────────────────────────────────────────
def fragor():
    f = os.path.join(UT, 'fragor.npz')
    if os.path.exists(f):
        z = np.load(f, allow_pickle=False)
        return json.loads(str(z['man'])), list(z['Q'])
    m = Bildmodell(V.MODELLFIL)
    man, Q = V.fragevektorer(m)
    os.makedirs(UT, exist_ok=True)
    np.savez(f, Q=np.stack(Q).astype(np.float32), man=json.dumps(man, ensure_ascii=False))
    json.dump({'vridningar': list(VRID), 'fragor': [{'fil': p['fil'], 'facit': p['namn'], 'q': [[float(x) for x in v] for v in q]} for p, q in zip(man, Q)]},
              open(os.path.join(UT, 'fragor.json'), 'w'))
    logg(f'frågorna: {len(man)} beskärningar × 4 vridningar → {os.path.relpath(f, ROT)}')
    return man, Q


# ── 4. ORB per par, med cache ────────────────────────────────────────────────
def konstanter():
    html = open(os.path.join(ROT, 'index.html'), encoding='utf-8').read()
    a = re.search(r'\nconst ORB_EMOT = (\d+), MODELL_NAMN = (\d+), ORB_SKALA = \[([\d.]+), ([\d.]+)\], ORB_HEL = ([\d.]+);', html)
    return {'ORB_EMOT': int(a[1]), 'ORB_SKALA': [float(a[3]), float(a[4])], 'ORB_HEL': float(a[5]),
            'ORB_ACCEPT': int(re.search(r'\nconst ORB_ACCEPT = (\d+);', html)[1]),
            'DEL_MARGINAL': float(re.search(r'\nconst DEL_MARGINAL = ([\d.]+);', html)[1])}


def _kedjans_hash():
    # ORB-svaren gäller bara för den ORB-kod de räknades med: cachen nycklas på kedjan.js (utdrag.cjs ur index.html)
    f = os.path.join(ROT, 'dev', 'embed', 'cache', 'kedjan.js')
    return hashlib.sha256(open(f, 'rb').read()).hexdigest()[:8] if os.path.exists(f) else 'utan-kedja'


ORBCACHE = os.path.join(UT, f'orb-par-{_kedjans_hash()}.json')


def nyckel_par(fraga, rot, url):
    return f'{fraga}|{rot}|{url}'


def orb_kor(par):
    """par: {(fraga, rot, url)} som saknas i cachen → appens ORB i huvudlös Chrome (dev/embed/varldsfil-orb.html)."""
    cache = json.load(open(ORBCACHE)) if os.path.exists(ORBCACHE) else {}
    saknas = sorted(p for p in par if nyckel_par(*p) not in cache)
    if not saknas:
        return cache
    if '--utan-orb' in ARGS:
        raise SystemExit(f'{len(saknas)} ORB-par saknas i cachen och --utan-orb är satt')
    per = {}
    for fr, rot, url in saknas:
        per.setdefault(fr, {}).setdefault(url, set()).add(rot)
    upp = [{'fraga': fr, 'bilder': [{'url': u, 'rots': sorted(r)} for u, r in d.items()]} for fr, d in per.items()]
    uf = os.path.join(UT, 'orb-par-uppgifter.json')
    json.dump(upp, open(uf, 'w'))
    logg(f'ORB: {len(saknas)} nya par ({len(upp)} beskärningar) i huvudlös Chrome på port {PORT}')
    r = subprocess.run(['node', os.path.join(ROT, 'dev', 'embed', 'webb.cjs'), 'varldsfil-orb.html',
                        f"ORBPAR('{os.path.relpath(uf, ROT)}')", '--port', str(PORT), '--tak', '1800'],
                       capture_output=True, text=True, cwd=ROT)
    if r.returncode != 0:
        raise SystemExit('ORB-körningen föll: ' + r.stderr[-1500:])
    svar = json.loads(r.stdout)
    for x in svar['ut']:
        cache[nyckel_par(x['fraga'], x['rot'], x['url'])] = [x['inliers'], x['skala']]
    json.dump(cache, open(ORBCACHE + '.tmp', 'w')); os.replace(ORBCACHE + '.tmp', ORBCACHE)
    logg(f'ORB klart: {svar["ms"] / 1000:.0f} s, cachen har {len(cache)} par')
    return cache


def orb_dom(uppg, cache, K):
    """Som dev/embed/varlden.html: orbSvep (index.html) över poolen, sedan identifyMedModell:s bär/emot."""
    stopp, s0, s1 = K['ORB_ACCEPT'] + 4, K['ORB_SKALA'][0], K['ORB_SKALA'][1]
    r0 = uppg['rot']; traffar = []; bast_n = 0
    for r in (r0, (r0 + 180) % 360):
        for i, b in enumerate(uppg['bilder']):
            inl, sk = cache[nyckel_par(uppg['fraga'], r, b['url'])]
            traffar.append((i, inl, sk))
            n = inl if sk is not None and s0 <= sk <= s1 else 0
            bast_n = max(bast_n, n)
        if bast_n >= stopp:
            break
    bast = {'inliers': 0, 'namn': None, 'skala': None}
    for i, inl, sk in traffar:
        n = inl if sk is not None and s0 <= sk <= s1 else 0
        if n > bast['inliers']:
            bast = {'inliers': n, 'namn': uppg['bilder'][i]['namn'], 'skala': sk}
    etta, m = uppg['etta'], uppg['marginal']
    saker = m > uppg['troskel']
    hel = not (bast['skala'] is None or bast['skala'] < K['ORB_HEL'])     # JS: !(null < 1.08) = false
    bar = bast['namn'] == etta and (hel or m >= K['DEL_MARGINAL']) and (
        bast['inliers'] >= 25 or (bast['inliers'] >= 14 and m >= 0.06) or (bast['inliers'] >= K['ORB_ACCEPT'] and saker))
    emot = bast['namn'] != etta and bast['inliers'] >= (K['ORB_ACCEPT'] if uppg['land'] and bast['namn'] in uppg['landNamn'] else K['ORB_EMOT'])
    return {'bar': bool(bar), 'emot': bool(emot), 'orbNamn': bast['namn'], 'inliers': bast['inliers'], 'skala': bast['skala']}


# ── 5. mät en variant ────────────────────────────────────────────────────────
def matt(variant):
    f = filnamn(variant)
    if not os.path.exists(f):
        bygg(variant)
    t0 = time.time()
    lista = FilLista(f)
    man, Q = fragor()
    rad = V.rader_for(lista, man, Q)
    sm = V.smalls()
    K = konstanter()
    uppgifter = []
    for r in rad:
        bilder = [{'namn': k['namn'], 'url': sm[fil]} for k in r['kandidater'] for fil in k['filer']]
        uppgifter.append({'fraga': 'dev/embed/riktiga/' + r['fil'], 'rot': (360 - r['rot']) % 360, 'etta': r['namn'], 'marginal': r['marginal'],
                          'troskel': TROSKEL, 'land': bool(V.bastyp(r['namn'])), 'landNamn': [k['namn'] for k in r['kandidater'] if V.bastyp(k['namn'])],
                          'bilder': bilder})
    par = {(u['fraga'], rr, b['url']) for u in uppgifter for rr in (u['rot'], (u['rot'] + 180) % 360) for b in u['bilder']}
    cache = orb_kor(par)
    oo = [orb_dom(u, cache, K) for u in uppgifter]
    mm = V.mat(list(zip(rad, oo)))
    osk = [(r, o) for r, o in zip(rad, oo) if not r['skymd']]
    mm['oskymda'] = {'n': len(osk), 'ratt': sum(r['ratt'] for r, _ in osk), 'sr': sum(r['ratt'] and V.trappa_saker(r, o) for r, o in osk),
                     'sf': sum((not r['ratt']) and V.trappa_saker(r, o) for r, o in osk)}
    storlek = json.load(open(f + '.storlek.json'))
    fel = [f"{r['fil']} {r['facit']} → {r['namn']} (m {r['marginal']:.3f}, ORB {o['orbNamn']} {o['inliers']})" for r, o in zip(rad, oo) if (not r['ratt']) and V.trappa_saker(r, o)]
    ut = {'variant': variant, 'om': VARIANTER[variant]['om'], 'huvud': lista.huvud, 'storlek': storlek, 'mm': mm, 'sakra_fel': fel,
          'rader': [dict(r, orb=o) for r, o in zip(rad, oo)]}
    json.dump(ut, open(os.path.join(UT, f'matt-{variant}.json'), 'w'), ensure_ascii=False, indent=1)
    rad_ut(ut)
    logg(f'{variant} mätt på {time.time() - t0:.0f} s')
    return ut


def rad_ut(u, rubrik=True):
    a, n, o = u['mm']['alla'], u['mm']['nya'], u['mm']['oskymda']
    if rubrik:
        print(f"{'variant':7} {'rå MB':>6} {'gzip MB':>7} {'rätt överst':>11} {'modell >0,11':>12} {'alla 61':>8} {'oskymda 48':>10} {'första försöket /37':>19} {'säkra fel':>9}")
    print(f"{u['variant']:7} {u['storlek']['ra'] / 1e6:6.1f} {u['storlek']['gzip'] / 1e6:7.1f} {a['ratt']:>8}/61 {a['msr']:>6} / {a['msf']:<4} "
          f"{a['sr']:>3} / {a['sf']:<2} {o['sr']:>5} / {o['sf']:<2} {n['sr']:>9}/{n['n']} ({n['sr'] / n['n']:.0%}) {a['sf']:>9}   {u['om']}")
    for x in u['sakra_fel']:
        print('    SÄKERT FEL', x)


def sammanfatta():
    ut = []
    for v in VARIANTER:
        f = os.path.join(UT, f'matt-{v}.json')
        if os.path.exists(f):
            ut.append(json.load(open(f)))
    print('G1 (MES-361): rätt överst 40/61, modellen > 0,11 33/0, alla 33/0, oskymda 31/0, första försöket 24/37 (65 %), säkra fel 0')
    for i, u in enumerate(ut):
        rad_ut(u, rubrik=i == 0)
    json.dump([{k: u[k] for k in ('variant', 'om', 'storlek', 'mm', 'sakra_fel')} for u in ut],
              open(os.path.join(UT, 'sammanfattning.json'), 'w'), ensure_ascii=False, indent=1)


# ── 6. kontrollerna: JS = Python ─────────────────────────────────────────────
def webb(uttryck, tak=1800, gpu=False):
    r = subprocess.run(['node', os.path.join(ROT, 'dev', 'embed', 'webb.cjs'), 'varldsfil.html', uttryck, '--port', str(PORT), '--tak', str(tak)] + (['--gpu'] if gpu else []),
                       capture_output=True, text=True, cwd=ROT)
    if r.returncode != 0:
        raise SystemExit('webbläsaren föll: ' + r.stderr[-1500:])
    return json.loads(r.stdout)


def kontroll_js(variant):
    """5a: samma fil, samma frågevektorer — dev/embed/varld.js mot FilLista: topp-5, poäng, marginal, bästa bild."""
    f = filnamn(variant)
    fragor()
    lista = FilLista(f)
    man, Q = fragor()
    js = webb(f"KONTROLL_SOK('{os.path.relpath(f, ROT)}', '{os.path.relpath(os.path.join(UT, 'fragor.json'), ROT)}')")
    max_d, olika1, olika5, olikabild, olikarot = 0.0, [], 0, 0, 0
    for p, q, j in zip(man, Q, js['svar']):
        l, rot = lista.rangordna(q, n=5)
        qr = q[VRID.index(rot)]
        if j['rot'] != rot:
            olikarot += 1
        if j['topp'][0]['namn'] != l[0][0]:
            olika1.append(f"{p['fil']}: py {l[0][0]} / js {j['topp'][0]['namn']}")
        if [x['namn'] for x in j['topp']] != [n for n, _ in l]:
            olika5 += 1
        for (n, s), x in zip(l, j['topp']):
            if x['namn'] == n:
                max_d = max(max_d, abs(x['poang'] - s))
        bf = lista.basta_filer(qr, l[0][0], 1)[0]
        if f"{j['topp'][0]['id']}_{j['topp'][0]['sida']}.jpg" != bf:
            olikabild += 1
    print(f"5a variant {variant}: {len(man)} beskärningar; olika etta {len(olika1)}, olika topp-5 {olika5}, olika vridning {olikarot}, "
          f"olika bästa bild för ettan {olikabild}; största poängskillnad {max_d:.2e}. JS: laddning {js['laddMs']:.0f} ms, "
          f"sökning {js['sokMs']:.0f} ms/fråga (4 vridningar, median)")
    for x in olika1:
        print('   ', x)
    json.dump({'variant': variant, 'olika1': olika1, 'olika5': olika5, 'olikarot': olikarot, 'olikabild': olikabild, 'maxd': max_d,
               'laddMs': js['laddMs'], 'sokMs': js['sokMs']}, open(os.path.join(UT, f'kontroll-js-{variant}.json'), 'w'), ensure_ascii=False, indent=1)


def kontroll_modell():
    """5b: appens JS-väg (embed.js, webbläsarens omskalning) mot lib.Bildmodell, frågesidan och referenssidan."""
    import random
    n = int(arg('--stickprov', '100'))
    man, Q = fragor()
    filer = list(np.load(V.vekfil('skarp'))['filer'])
    valda = sorted(random.Random(375).sample(range(len(filer)), n))
    bildrot = os.path.relpath(V.BILDER, ROT)
    gpu = '--gpu' in ARGS   # WebGPU som telefonen; WASM i huvudlös Chrome tar ~0,45 s per körning på bänkens Intel-Mac
    # Två körningar, frågorna och referenserna var för sig: i EN sida hängde körningen (0 % CPU, inget svar) efter
    # frågorna när referenserna kom efter — var för sig går båda igenom (2026-10-15, orsaken inte utredd).
    b = 'webgpu' if gpu else 'wasm'
    jf = webb(f"KONTROLL_MODELL({json.dumps(['dev/embed/riktiga/' + p['fil'] for p in man])}, [], '{b}')", tak=1200, gpu=gpu)
    jr = webb(f"KONTROLL_MODELL([], {json.dumps([bildrot + '/' + filer[i] for i in valda])}, '{b}')", tak=1800, gpu=gpu)
    js = {'backend': jf['backend'], 'fragor': jf['fragor'], 'ref': jr['ref'], 'fel': jr['fel']}
    sk, su = np.load(V.vekfil('skarp'))['ra'], np.load(V.vekfil('sudd'))['ra']
    cq = [float(np.dot(normera(np.array(j[k], np.float32)), normera(q[VRID.index(r)].astype(np.float32))))
          for j, q in zip(js['fragor'], Q) for k, r in enumerate(VRID)]
    par = [(j, i) for j, i in zip(js['ref'], valda) if j]   # en bild som webbläsaren inte kunde läsa saknas
    csk = [float(np.dot(normera(np.array(j['skarp'], np.float32)), normera(sk[i].astype(np.float32)))) for j, i in par]
    csu = [float(np.dot(normera(np.array(j['sudd'], np.float32)), normera(su[i].astype(np.float32)))) for j, i in par]
    def st(x):
        x = np.array(x); return {'median': round(float(np.median(x)), 5), 'p05': round(float(np.percentile(x, 5)), 5), 'min': round(float(x.min()), 5), 'under098': int((x < 0.98).sum())}
    ut = {'backend': js['backend'], 'fragor': st(cq), 'ref_skarp': st(csk), 'ref_sudd': st(csu), 'n_fragor': len(man), 'n_ref': len(par), 'fel': js['fel']}
    print(f"5b ({js['backend']}): frågorna (61 × 4 vridningar) cos median {ut['fragor']['median']}, min {ut['fragor']['min']}; "
          f"referenserna ({len(par)} världsbilder) skarp median {ut['ref_skarp']['median']} min {ut['ref_skarp']['min']}, "
          f"sudd median {ut['ref_sudd']['median']} min {ut['ref_sudd']['min']}; under 0,98: {ut['ref_skarp']['under098']} skarp, {ut['ref_sudd']['under098']} sudd")
    json.dump(ut, open(os.path.join(UT, 'kontroll-modell.json'), 'w'), indent=1)


if __name__ == '__main__':
    steg = ARGS[0] if ARGS else ''
    vv = arg('--variant', 'A')
    lista_v = list(VARIANTER) if vv == 'alla' else vv.split(',')
    if steg == 'bygg':
        [bygg(v) for v in lista_v]
    elif steg == 'matt':
        [matt(v) for v in lista_v]
        if len(lista_v) > 1:
            sammanfatta()
    elif steg == 'fragor':
        fragor()
    elif steg == 'sammanfatta':
        sammanfatta()
    elif steg == 'kontroll-js':
        [kontroll_js(v) for v in lista_v]
    elif steg == 'kontroll-modell':
        kontroll_modell()
    else:
        print(__doc__)

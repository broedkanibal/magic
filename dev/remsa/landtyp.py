#!/usr/bin/env python3
"""Baslandets TYP ur den synliga delen av ett täckt kort — utan att läsa namnraden. Mätning, ingen appändring.

Frågan (2026-10-03): landen i högar är det som faller på bordet (golden 14: två Plains i hög A saknas,
15: ett Plains, 17: land per typ 0/7). Dagens väg är namnremsan (översta 14 % mot en remslek, säker vid
marginal > 0,20 eller titeldelen > 0,20). För ett basland behövs inte namnet — typen syns i konstverkets
överkant, ramen och manasymbolen. Går typen att få säkert ur den synliga delen, med 0 säkra fel?

Urval: alla basland (Plains/Island/Swamp/Mountain/Forest) med ritade hörn i golden 03–06, 13–18 och
MES-246:s klara lägen. Bara prov-material (remsor.krav_prov på varje bild). Täckt = synlig < 1; hela kort
är kontrollen. Dold namnrad (namnrad < 0,5) är med — där är typen det enda som går.

Utsnitt per kort, i analysbilden (960 px bred, webbläsarens omskalning) och i källbilden (golden: originalet
där det finns, annars bild.jpg; MES-246: 4K-rutan):
  ruta     facits synliga låda x y w h, axelparallell (som en detektorlåda), vriden 90° efter hörnen så att
           kortets överkant ligger uppåt eller nedåt (0/180 avgör referenserna — appen vet inte det)
  synlig   kortets översta `synlig` ur hörnen (remsa_ur_bild), exakt vriden — bästa fallet
  remsa    dagens remsa 0,14 ur hörnen, med appens dom (hel > 0,20, eller titeldelen 55 % > 0,20 med
           samma namn och hel ≥ 0,05) — namnremsans tal på EXAKT samma kort, bästa fallet för remsan

Metod A: bildmodellen (MobileCLIP-S0, embed.js-receptet i lib.py) mot referenser skurna till SAMMA andel
av Scryfall-bilderna (ref_strip, andelen avrundad till närmaste 0,05; remsan exakt 0,14), skarp + sudd,
vridningar 0/180, centrerade. ALLA poolens kort är referenser, så ett icke-land kan vinna och räknas som
fel. Poäng per namn = bästa referens; ett basland har ett namn per typ, så poäng per typ = bästa konstverk
av typen. Marginal = bästa minus näst bästa namn.

Metod B: ramens färg — medianfärgen (Lab) i den synliga delens sidokanter (3–8 % och 92–97 % av bredden,
under översta 3 % av kortet) mot samma band ur varje BASLANDS referensbild (bara typerna tävlar — ramfärgen
per typ, som frågan ställdes); per typ närmaste referens, marginal =
näst närmaste namn minus närmaste (ΔE). 'lab' = rå; 'ab-gv' = bara a/b efter gråvärldsbalans över hela
bilden. Mäts ensam och som vittne åt A (A säker bara om B har samma typ överst).

Pooler: 'lek' = dev/embed/cache/lek-golden.json (golden-leken, 4 baslandstyper × 24 konstverk);
'fem' = samma + Mountain (lek-golden-fem.json), för att se om en femte typ i poolen flyttar nollfelet.

    node dev/embed/hamta-referenser.cjs                                     # lek-golden.json
    node dev/embed/hamta-referenser.cjs --lek <lek.txt + Mountain> --ut lek-golden-fem
    ~/.mesa/detektor-venv/bin/python dev/remsa/landtyp.py [--tradar 2] [--bilder <mapp>]

Ut: dev/remsa/resultat/landtyp.json (raderna + summeringen). Jämförelsen mot detektorns remsor läses ur
dev/remsa/resultat/detektorremsor-v55-embed.json (samma kort via 'lage').
"""
import argparse, glob, json, os, re, sys, time
import cv2
import numpy as np

HAR = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(os.path.dirname(HAR))
sys.path.insert(0, HAR)
import remsor  # noqa: E402  (lägger dev/detektor och dev/detektor/tran på sökvägen)
import lib  # noqa: E402
from lib import Bildmodell, ref_strip, kvadrat, suddig, vrid, remsa_ur_bild, skala_bild  # noqa: E402
from facit import FALL_MAPP, fall_id  # noqa: E402
from prov246 import LAGEN, RUTOR, handtackt, HAND_DOLD  # noqa: E402
from remsa import remsa_lada  # noqa: E402

LAND = re.compile(r'^(Plains|Island|Swamp|Mountain|Forest)$')
GOLDEN = ['03', '04', '05', '06', '13', '14', '15', '16', '17', '18']
# fickorna (ur facitens yta/ljus/anteckning): 14–16 Jespers foton med plastfickor, 13 = MES-246:s blanka fickor,
# 18 = samma manus som 13 på trä (klar ficka nämns); MES-246 = vita kort i blanka fickor under lampa
FICKA = {'13': 'klar', '14': 'ficka', '15': 'ficka', '16': 'ficka', '18': 'klar'}
REMSA, VANSTER, HEL, TITEL, VITTNE = 0.14, 0.55, 0.20, 0.20, 0.05   # Kamera.T: remsan, remsaTitel, remsaTroskel, remsaTitelTroskel, remsaVittne
STEG = 0.05
SVEP = [round(0.05 + 0.01 * i, 2) for i in range(26)]               # 0,05–0,30
KANT_X = ((0.03, 0.08), (0.92, 0.97))
KANT_TOPP = 0.03


def andel_ref(synlig):
    return round(max(STEG, round(synlig / STEG) * STEG), 2)


# ── materialet ─────────────────────────────────────────────────────────────
def kallbild_golden(f, fid):
    """Källan i full upplösning: rita.bild om den är en bild, rutan ur dev/material/rita/*/<t>.jpg om det är en film."""
    r = f.get('rita', {})
    b = r.get('bild', '')
    if b.lower().endswith('.jpg') and os.path.exists(os.path.join(ROT, b)):
        return os.path.join(ROT, b)
    if b.endswith('.mov') and r.get('t') is not None:
        kand = sorted(glob.glob(os.path.join(ROT, 'dev', 'material', 'rita', '*', f"{r['t']:.2f}.jpg")))
        if kand:
            return kand[0]
    return os.path.join(FALL_MAPP, fid, 'bild.jpg')


def kortpost(k, extra):
    nr = k.get('namnrad', 1)
    if nr is None: nr = 0
    d = {'facit': k['namn'], 'kort_id': k.get('id'), 'horn': k['horn'], 'ruta': [k['x'], k['y'], k['w'], k['h']],
         'synlig': float(k.get('synlig', 1) or 0), 'namnrad': nr, 'dold': bool(k['dold']) if 'dold' in k else nr < 0.5,
         'hog': k.get('hog'), 'z': k.get('z'), 'tappad': bool(k.get('tappad')), 'zon': k.get('zon')}
    d['tackt'] = d['synlig'] < 1
    d.update(extra)
    return d


def golden():
    ut = []
    for p in GOLDEN:
        fid = fall_id(p)
        f = json.load(open(os.path.join(FALL_MAPP, fid, 'facit.json'), encoding='utf-8'))
        kort = [kortpost(k, {'lage': f'{fid}|{k.get("id")}', 'hand': 0.0, 'ficka': FICKA.get(p, 'ingen')})
                for k in f['kort'] if LAND.match(k['namn']) and k.get('horn')]
        if kort:
            ut.append({'kalla': 'golden', 'id': fid, 'bild': remsor.krav_prov(os.path.join(FALL_MAPP, fid, 'bild.jpg')),
                       'kall': remsor.krav_prov(kallbild_golden(f, fid)), 'kort': kort})
    return ut


def mes246():
    ut = []
    for l in json.load(open(LAGEN, encoding='utf-8'))['lagen']:
        if not l.get('klar'):
            continue
        bild = os.path.join(RUTOR, f"{l['t']:.2f}.jpg")
        if not os.path.exists(bild):
            continue
        grav = [k for k in l['kort'] if k.get('zon') == 'grav']
        topp = max(grav, key=lambda k: k.get('z', 0)) if grav else None
        kort = []
        for k in l['kort']:
            if not (LAND.match(k.get('namn', '')) and k.get('horn')):
                continue
            lada = remsa_lada([[x, y] for x, y in k['horn']], 1.0, 1.0)
            nyckel = str((k.get('id'), tuple(round(v * 50) for v in lada)))   # = remsor.lage_nyckel, som detektorremsor
            hand = handtackt([k['x'], k['y'], k['x'] + k['w'], k['y'] + k['h']], l.get('hander'))
            kort.append(kortpost(k, {'lage': nyckel, 'hand': round(hand, 3), 'ficka': 'klar',
                                     'grav_under': bool(topp is not None and k.get('zon') == 'grav' and k is not topp)}))
        if kort:
            b = remsor.krav_prov(bild)
            ut.append({'kalla': 'mes246', 'id': f"{l['t']:.2f}", 'bild': b, 'kall': b, 'kort': kort})
    return ut


# ── utsnitten ──────────────────────────────────────────────────────────────
def horn_px(k, W, H):
    return [[x * W, y * H] for x, y in k['horn']]


def ruta_utsnitt(img, k):
    """Facits synliga låda, axelparallell, vriden 90° efter hörnen (överkanten vågrät)."""
    H, W = img.shape[:2]
    x, y, w, h = k['ruta']
    x0, y0 = max(0, int(np.floor(x * W))), max(0, int(np.floor(y * H)))
    x1, y1 = min(W, int(np.ceil((x + w) * W))), min(H, int(np.ceil((y + h) * H)))
    if x1 - x0 < 4 or y1 - y0 < 4:
        return None
    s = img[y0:y1, x0:x1]
    hp = np.asarray(horn_px(k, W, H), np.float32)
    dx, dy = hp[1] - hp[0]
    if abs(dy) > abs(dx):
        s = cv2.rotate(s, cv2.ROTATE_90_COUNTERCLOCKWISE if dy > 0 else cv2.ROTATE_90_CLOCKWISE)
    return np.ascontiguousarray(s)


def utsnitt(img, k):
    H, W = img.shape[:2]
    hp = horn_px(k, W, H)
    syn = max(k['synlig'], 0.03)
    s = {'ruta': ruta_utsnitt(img, k), 'synlig': remsa_ur_bild(img, hp, syn)}
    r = remsa_ur_bild(img, hp, REMSA)
    s['remsa'] = r
    s['remsa_titel'] = r[:, :max(4, int(round(r.shape[1] * VANSTER)))]
    return s


def synlig_px(img, k):
    """Den synliga delens höjd i bildpunkter (kortets vänsterkant × synlig) och kortets bredd."""
    H, W = img.shape[:2]
    h = np.asarray(horn_px(k, W, H), np.float32)
    return round(float(np.linalg.norm(h[3] - h[0]) * k['synlig']), 1), round(float(np.linalg.norm(h[1] - h[0])), 1)


# ── metod B: ramens färg ───────────────────────────────────────────────────
def kantfarg(bgr, andel, ab=False):
    """Median (Lab) i sidokanterna, under översta KANT_TOPP av kortet; andel = hur stor del av kortet utsnittet är."""
    if bgr is None or bgr.shape[0] < 2 or bgr.shape[1] < 10:
        return None
    h, w = bgr.shape[:2]
    topp = min(h // 2, int(round(KANT_TOPP / max(andel, 1e-3) * h)))
    delar = [bgr[topp:, int(a * w):max(int(a * w) + 1, int(b * w))] for a, b in KANT_X]
    px = np.concatenate([d.reshape(-1, 3) for d in delar]).astype(np.float32) / 255.0
    lab = cv2.cvtColor(px.reshape(-1, 1, 3), cv2.COLOR_BGR2LAB).reshape(-1, 3)
    m = np.median(lab, axis=0)
    return m[1:] if ab else m


def gravarld(img):
    """Gråvärldsbalans: kanalerna skalas så att bildens medel blir grått."""
    m = img.reshape(-1, 3).astype(np.float32).mean(axis=0)
    g = m.mean()
    return np.clip(img.astype(np.float32) * (g / np.maximum(m, 1)), 0, 255).astype(np.uint8)


# ── referenserna ───────────────────────────────────────────────────────────
class RefRa:
    """Råa referensvektorer för en andel (alla bilder i 'fem'-poolen), skarp + sudd × 0/180."""

    def __init__(self, modell, bilder, andel, cache_mapp):
        fil = os.path.join(cache_mapp, f'landtyp-ref-{andel:.2f}.npz')
        ids = [i for _, i, _ in bilder]
        if os.path.exists(fil):
            z = np.load(fil, allow_pickle=True)
            if list(z['ids_bild']) == ids:
                self.ra, self.namn, self.idx = z['ra'], list(z['namn']), z['idx']
                self._farg(bilder, andel)
                return
        kvad, namn, idx = [], [], []
        for bi, (n, cid, img) in enumerate(bilder):
            rgb = cv2.cvtColor(ref_strip(img, andel), cv2.COLOR_BGR2RGB)
            for bas in (kvadrat(rgb), kvadrat(suddig(rgb))):
                for r in (0, 180):
                    kvad.append(vrid(bas, r)); namn.append(n); idx.append(bi)
        self.ra = modell.kor(kvad); self.namn = namn; self.idx = np.array(idx)
        np.savez(fil, ra=self.ra, namn=np.array(namn, dtype=object), idx=self.idx, ids_bild=np.array(ids, dtype=object))
        self._farg(bilder, andel)

    def _farg(self, bilder, andel):
        self.bnamn = [n for n, _, _ in bilder]
        self.lab = np.array([kantfarg(ref_strip(img, andel), andel) for _, _, img in bilder])
        self.ab = np.array([kantfarg(ref_strip(img, andel), andel, ab=True) for _, _, img in bilder])


class Pool:
    """Centrerade referenser för en delmängd av namnen (rangordna som lib.Referenser)."""

    def __init__(self, rr, utan=()):
        mask = np.array([n not in utan for n in rr.namn])
        self.namn = [n for n, m in zip(rr.namn, mask) if m]
        ra = rr.ra[mask]
        self.medel = ra.mean(axis=0)
        c = ra - self.medel
        self.vek = c / np.maximum(np.linalg.norm(c, axis=1, keepdims=True), 1e-9)
        self.lista = sorted(set(self.namn))
        self.ni = np.array([self.lista.index(n) for n in self.namn])
        # B jämför bara mot baslandstyperna (ramfärgen per typ); icke-land får inte vinna här
        bm = np.array([n not in utan and bool(LAND.match(n)) for n in rr.bnamn])
        self.bnamn = [n for n, m in zip(rr.bnamn, bm) if m]
        self.lab, self.ab = rr.lab[bm], rr.ab[bm]

    def rangordna(self, q):
        c = q - self.medel
        c = c / max(float(np.linalg.norm(c)), 1e-9)
        per = np.full(len(self.lista), -2.0)
        np.maximum.at(per, self.ni, self.vek @ c)
        o = np.argsort(-per)
        return [(self.lista[i], float(per[i])) for i in o]

    def farg(self, f, ab=False):
        """[(namn, avstånd)] stigande — närmaste referens per namn."""
        if f is None:
            return []
        R = self.ab if ab else self.lab
        d = np.linalg.norm(R - f[None, :], axis=1)
        per = {}
        for n, v in zip(self.bnamn, d):
            per[n] = min(per.get(n, 1e9), float(v))
        return sorted(per.items(), key=lambda t: t[1])


def svar(lista):
    if len(lista) < 2:
        return {'namn': None, 'marginal': 0.0}
    return {'namn': lista[0][0], 'poang': round(lista[0][1], 4), 'marginal': round(lista[0][1] - lista[1][1], 4), 'nast': lista[1][0]}


def fargsvar(lista):
    if len(lista) < 2:
        return {'namn': None, 'marginal': 0.0}
    return {'namn': lista[0][0], 'avst': round(lista[0][1], 2), 'marginal': round(lista[1][1] - lista[0][1], 2), 'nast': lista[1][0]}


# ── summeringen ────────────────────────────────────────────────────────────
def main():
    p = argparse.ArgumentParser()
    p.add_argument('--tradar', type=int, default=2)
    p.add_argument('--ut', default=os.path.join(HAR, 'resultat', 'landtyp.json'))
    p.add_argument('--bilder', default=None, help='spara utsnitten hit (för ögat)')
    p.add_argument('--kallor', default='golden,mes246')
    a = p.parse_args()
    cache = os.path.join(ROT, 'dev', 'embed', 'cache')
    lib.LEK_CACHE = os.path.join(cache, 'lek-golden-fem.json')
    bilder = lib.las_referensbilder()
    pool_lek = json.load(open(os.path.join(cache, 'lek-golden.json'), encoding='utf-8'))
    lek_ids = {c['id'] for c in pool_lek['kort']}
    utan_lek = {n for n, i, _ in bilder if i not in lek_ids}          # = Mountain
    print(f'referenser: {len(bilder)} bilder ({len(set(n for n, _, _ in bilder))} namn), lek utan {sorted(utan_lek)}', flush=True)

    poster = (golden() if 'golden' in a.kallor else []) + (mes246() if 'mes246' in a.kallor else [])
    andelar = sorted({andel_ref(k['synlig']) for p_ in poster for k in p_['kort']} | {REMSA})
    print(f'material: {sum(len(p_["kort"]) for p_ in poster)} landrader i {len(poster)} bilder; andelar {andelar}', flush=True)
    m = Bildmodell(tradar=a.tradar)
    t0 = time.time()
    refs = {}
    for an in andelar:
        rr = RefRa(m, bilder, an, cache)
        refs[an] = {'fem': Pool(rr), 'lek': Pool(rr, utan_lek)}
        print(f'  ref {an:.2f} klar ({time.time() - t0:.0f} s)', flush=True)

    rader = []
    for post in poster:
        kall = cv2.imread(post['kall'])
        ana, _ = skala_bild(cv2.imread(post['bild']), 960)
        for res, img in (('960', ana), ('orig', kall)):
            gv = gravarld(img)
            for ki, k in enumerate(post['kort']):
                s = utsnitt(img, k)
                sg = utsnitt(gv, k)
                an = andel_ref(k['synlig'])
                kvad, nyck = [], []
                for namn in ('ruta', 'synlig', 'remsa', 'remsa_titel'):
                    if s[namn] is not None:
                        kvad.append(kvadrat(cv2.cvtColor(s[namn], cv2.COLOR_BGR2RGB))); nyck.append(namn)
                vek = dict(zip(nyck, m.kor(kvad)))
                hpx, bpx = synlig_px(img, k)
                rad = {kk: k[kk] for kk in ('facit', 'kort_id', 'synlig', 'namnrad', 'dold', 'hog', 'z', 'tappad', 'zon', 'tackt', 'lage', 'hand', 'ficka')}
                rad.update({'kalla': post['kalla'], 'bild': post['id'], 'res': res, 'andel_ref': an, 'synlig_px': hpx, 'kort_bredd_px': bpx,
                            'grav_under': k.get('grav_under', False)})
                for pool in ('lek', 'fem'):
                    P = refs[an][pool]
                    R14 = refs[REMSA][pool]
                    for cut in ('ruta', 'synlig'):
                        nyckel = f'{cut}|{pool}'
                        rad[nyckel] = {
                            'A': svar(P.rangordna(vek[cut])) if cut in vek else {'namn': None, 'marginal': 0.0},
                            'B_lab': fargsvar(P.farg(kantfarg(s[cut], k['synlig'] if cut == 'synlig' else max(k['synlig'], 0.03)))),
                            'B_abgv': fargsvar(P.farg(kantfarg(sg[cut], k['synlig'] if cut == 'synlig' else max(k['synlig'], 0.03), ab=True), ab=True)),
                        }
                    h = svar(R14.rangordna(vek['remsa'])); t = svar(R14.rangordna(vek['remsa_titel']))
                    saker = h['marginal'] > HEL or (t['namn'] == h['namn'] and t['marginal'] > TITEL and h['marginal'] >= VITTNE)
                    rad[f'remsa|{pool}'] = {'hel': h, 'titel': t, 'saker': bool(saker), 'ratt': h['namn'] == k['facit']}
                rader.append(rad)
                if a.bilder:
                    os.makedirs(a.bilder, exist_ok=True)
                    stam = f"{post['kalla']}-{post['id']}-{ki:02d}-{k['facit']}-{res}"
                    for namn in ('ruta', 'synlig', 'remsa'):
                        if s[namn] is not None:
                            cv2.imwrite(os.path.join(a.bilder, f'{stam}-{namn}.jpg'), s[namn])
        print(f"{post['kalla']} {post['id']}: {len(post['kort'])} land ({time.time() - t0:.0f} s)", flush=True)

    # jämförelsen: detektorns remsor (MES-328 v55) på samma kort
    dr = json.load(open(os.path.join(HAR, 'resultat', 'detektorremsor-v55-embed.json'), encoding='utf-8'))['embed_rader']
    dmap = {}
    for res, rr in dr.items():
        for e in rr:
            dmap.setdefault((res, e['bild'], e['lage']), []).append(e)
    for r in rader:
        e = dmap.get((r['res'], r['bild'], r['lage']))
        if e:
            e = max(e, key=lambda q: q['marginal'])
            r['detektorremsa'] = {'namn': e['namn'], 'marginal': e['marginal'], 'ratt': e['ratt'], 'saker': bool(e['marginal'] > HEL)}

    summering = summera(rader)
    json.dump({'pool': {'lek': 'dev/embed/cache/lek-golden.json (dev/golden/lek.txt 2026-10-03: 34 namn, 156 bilder — Plains/Island/Swamp/Forest × 24 konstverk, Virtue of Knowledge saknas som dubbelsidig)',
                        'fem': 'lek + Mountain × 24 (lek-golden-fem.json, 180 bilder)'},
               'svep': SVEP, 'summering': summering, 'rader': rader},
              open(a.ut, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(f'skrivet: {a.ut}  ({len(rader)} rader, {time.time() - t0:.0f} s, modellen {np.mean(m.ms):.1f} ms/bild)')


def summera(rader):
    """Per (res, utsnitt, pool, metod): nollfel-tröskeln över ALLA rader, och per delmängd rätt överst,
    säkra rätt/fel vid nollfel och vid varje tröskel i svepet."""
    ut = {}
    delar = {
        'golden täckta': lambda r: r['kalla'] == 'golden' and r['tackt'],
        'golden hela': lambda r: r['kalla'] == 'golden' and not r['tackt'],
        'mes246 täckta': lambda r: r['kalla'] == 'mes246' and r['tackt'],
        'mes246 hela': lambda r: r['kalla'] == 'mes246' and not r['tackt'],
    }
    for res in ('960', 'orig'):
        rr = [r for r in rader if r['res'] == res]
        for pool in ('lek', 'fem'):
            for cut in ('ruta', 'synlig'):
                nyckel = f'{cut}|{pool}'
                for metod in ('A', 'B_lab', 'B_abgv', 'A+B_lab', 'A+B_abgv'):
                    def m_(r):
                        x = r[nyckel]
                        if '+' not in metod:
                            return x[metod]['namn'], x[metod]['marginal']
                        b = x[metod.split('+')[1]]
                        return x['A']['namn'], (x['A']['marginal'] if b['namn'] == x['A']['namn'] else -1.0)
                    fel = [m_(r)[1] for r in rr if m_(r)[0] != r['facit']]
                    nf = round(max(0.0, max(fel)), 4) if fel else 0.0
                    post = {'nollfel': nf}
                    for dn, f in delar.items():
                        d = [r for r in rr if f(r)]
                        post[dn] = {'n': len(d), 'overst': sum(1 for r in d if m_(r)[0] == r['facit']),
                                    'sakra_vid_nollfel': sum(1 for r in d if m_(r)[0] == r['facit'] and m_(r)[1] > nf),
                                    'svep': {str(t): [sum(1 for r in d if m_(r)[0] == r['facit'] and m_(r)[1] > t),
                                                      sum(1 for r in d if m_(r)[0] != r['facit'] and m_(r)[1] > t)] for t in SVEP}}
                    ut[f'{res}|{nyckel}|{metod}'] = post
            # namnremsan på samma kort
            post = {}
            for dn, f in delar.items():
                d = [r for r in rr if f(r)]
                post[dn] = {'n': len(d), 'overst': sum(1 for r in d if r[f'remsa|{pool}']['ratt']),
                            'sakra_ratt': sum(1 for r in d if r[f'remsa|{pool}']['saker'] and r[f'remsa|{pool}']['ratt']),
                            'sakra_fel': sum(1 for r in d if r[f'remsa|{pool}']['saker'] and not r[f'remsa|{pool}']['ratt'])}
                dd = [r for r in d if 'detektorremsa' in r]
                post[dn]['detektorremsa'] = {'n': len(dd), 'sakra_ratt': sum(1 for r in dd if r['detektorremsa']['saker'] and r['detektorremsa']['ratt']),
                                             'sakra_fel': sum(1 for r in dd if r['detektorremsa']['saker'] and not r['detektorremsa']['ratt'])}
            ut[f'{res}|remsa|{pool}'] = post
    return ut


if __name__ == '__main__':
    main()

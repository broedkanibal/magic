"""Experimentbänk för namnet ur remsan: vektorerna räknas EN gång, idéerna provas på sekunder.

Bakgrund (2026-10-03): detektorn hittar nu remsan på nästan varje kort (remsfall.py, tjockMax 0,7), men
bildmodellen läser namnet på få av dem i Jespers inspelningar — MES-246 67/585 och 13b 3/93 rätt överst,
mot golden-fotona 63/72. Modellen svarar Pacifism på var tredje remsa (ett "nav"), och remsleken blev
sämre när golden 17 lade Island/Forest i den gemensamma leken (102 → 67).

  bygg   python remsexp.py bygg      — remsorna ur remsfall-tjock0.7.json (golden, 13b, MES-246) i flera
                                       skärningar och förbehandlingar + referenserna, till resultat/remsexp.npz
  prova  python remsexp.py prova     — alla idéer, en rad var

Skärningar: app (1920 på långsidan, 4 % marginal, som lasRemsa), b960 (960, ingen marginal, som bänken
v55), rata (1920, upprätad: remsnamn.rata). Förbehandling: ra (som den är), clahe (lokal kontrast på
L-kanalen), gv (gråvärldsbalans + kontraststräckning 2–98 %) — samma förbehandling på referenserna.
Delar: hel och titel (vänstra 55 %).

Idéerna (prova): centrering (dagens), leken (bara de namn som finns i leken i spel — appen bygger remsleken
ur spelets lek; golden-leken är unionen av alla fall), CSLS (navstraff: varje referens straffas med sin
medellikhet till de k närmaste remsorna ur en ANNAN källa — kalibreras aldrig på det som mäts), lärda
(remsor av samma namn från TIDIGARE lägen i samma inspelning läggs till som referenser — det appen ser i ett
parti innan kortet hamnar i en hög), och kombinationer. Domen: rätt överst; säkra rätt vid den tröskel som
ger 0 säkra fel över ALLA källor (hel-regeln), och samma tröskel korsvaliderad (vald på de andra källorna).
"""
import json, os, sys, itertools
from collections import defaultdict
import cv2
import numpy as np

HAR = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(os.path.dirname(HAR))
sys.path.insert(0, HAR)
import lib  # noqa: E402
from lib import Bildmodell, ref_strip, kvadrat, suddig, vrid  # noqa: E402
import remsnamn  # noqa: E402

NPZ = os.environ.get('MESA_REMSEXP_NPZ', os.path.join(HAR, 'resultat', 'remsexp.npz'))   # egen fil för en annan modell (MESA_MOBILECLIP)
GAMMAL_LEK = os.path.join(ROT, '.claude', 'worktrees', 'wf_bccb9343-ae9-3', 'dev', 'embed', 'cache', 'lek-golden.json')
SKARNINGAR = ('app', 'b960', 'rata')
FORBEH = ('ra', 'clahe', 'gv')
VANSTER = 0.55


def forbehandla(img, satt):
    if satt == 'ra':
        return img
    if satt == 'clahe':
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        lab[:, :, 0] = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(2, 6)).apply(lab[:, :, 0])
        return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    if satt == 'gv':
        f = img.astype(np.float32)
        m = f.reshape(-1, 3).mean(0); f = f * (m.mean() / np.maximum(m, 1))
        lo, hi = np.percentile(f, 2), np.percentile(f, 98)
        return np.clip((f - lo) * 255 / max(hi - lo, 1), 0, 255).astype(np.uint8)
    raise ValueError(satt)


def bygg():
    rader = [r for r in json.load(open(os.path.join(ROT, 'dev/detektor/tran/resultat/remsfall-tjock0.7.json')))
             if r['remsa'] and r['namn'] and r['kalla'] in ('mes246', '13b', 'golden')]
    fore = {(r['bild'], r['id'], r['namn']): r for r in json.load(open(os.path.join(ROT, 'dev/detektor/tran/resultat/remsfall-tjock0.5.json')))}
    m = Bildmodell(tradar=4)
    meta, kvad, nyckel, alla = [], [], [], []
    cache = {}
    for i, r in enumerate(rader):
        if r['fil'] not in cache:
            cache.clear()
            src = cv2.imread(r['fil'])
            def skala(L):
                s = L / max(src.shape[:2])
                return cv2.resize(src, (round(src.shape[1] * s), round(src.shape[0] * s)), interpolation=cv2.INTER_AREA) if s < 1 else src
            cache[r['fil']] = {1920: skala(1920), 960: skala(960)}
        b = cache[r['fil']]
        f = fore.get((r['bild'], r['id'], r['namn']))
        t = float(r['bild'].split('-')[-1]) if r['kalla'] != 'golden' else 0.0
        meta.append({'kalla': r['kalla'], 'bild': r['bild'], 't': t, 'id': r['id'], 'facit': r['namn'], 'grupp': r['grupp'], 'land': r['land'],
                     'ny': not (f and f['remsa'])})
        for sk in SKARNINGAR:
            if sk == 'app':
                remsnamn.MARG = 0.04; st = remsnamn.skar(b[1920], r['lada'], r['remsa'])
            elif sk == 'b960':
                remsnamn.MARG = 0.0; st = remsnamn.skar(b[960], r['lada'], r['remsa'])
            else:
                remsnamn.MARG = 0.04; st = remsnamn.rata(b[1920], r['lada'], r['remsa'])
            for fb in FORBEH:
                for del_ in ('hel', 'titel'):
                    if st is None:
                        continue
                    s = forbehandla(st, fb)
                    if del_ == 'titel':
                        s = s[:, :max(4, int(round(s.shape[1] * VANSTER)))]
                    kvad.append(kvadrat(cv2.cvtColor(s, cv2.COLOR_BGR2RGB))); nyckel.append((i, sk, fb, del_))
        if len(kvad) >= 512 or i == len(rader) - 1:
            alla.extend(zip(nyckel, m.kor(kvad)))
            kvad, nyckel = [], []
        if i % 100 == 0:
            print(f'  {i}/{len(rader)} remsor', flush=True)
    # referenserna: nya leken (156) per förbehandling, skarp + sudd × 0/180
    refs = {}
    bilder = lib.las_referensbilder()
    for fb in FORBEH:
        kv, nm = [], []
        for n, cid, img in bilder:
            strip = forbehandla(ref_strip(img, 0.14), fb)
            rgb = cv2.cvtColor(strip, cv2.COLOR_BGR2RGB)
            for variant in ('skarp', 'sudd'):
                bas = kvadrat(suddig(rgb)) if variant == 'sudd' else kvadrat(rgb)
                for rot in (0, 180):
                    kv.append(vrid(bas, rot)); nm.append(n)
        refs[fb] = (m.kor(kv), nm)
        print(f'  referenser {fb}: {len(nm)}', flush=True)
    if os.path.exists(GAMMAL_LEK):
        gammal = sorted({c['name'] for c in json.load(open(GAMMAL_LEK))['kort']})
    else:   # worktreen är borta (2026-10-05): leken före golden 17 = dagens referenslek utom de sex namn 17 lade till
        tillagda = {'Additive Evolution', 'Forest', 'Island', 'Matterbending Mage', "Proctor's Gaze", 'Virtue of Knowledge // Vantress Visions'}
        gammal = sorted({n for n, _, _ in bilder} - tillagda)
    vek = {}
    for (i, sk, fb, del_), x in alla:
        vek.setdefault((sk, fb, del_), {})[i] = x
    ut = {'meta': json.dumps(meta, ensure_ascii=False), 'jesper_lek': json.dumps(gammal, ensure_ascii=False)}
    for (sk, fb, del_), d in vek.items():
        idx = np.array(sorted(d)); ut[f'q|{sk}|{fb}|{del_}|idx'] = idx; ut[f'q|{sk}|{fb}|{del_}'] = np.stack([d[j] for j in idx])
    for fb, (v, nm) in refs.items():
        ut[f'r|{fb}'] = v; ut[f'r|{fb}|namn'] = np.array(nm)
    np.savez_compressed(NPZ, **ut)
    print('skrivet', NPZ)


# ── prova ──────────────────────────────────────────────────────────────────

def norm(x):
    return x / np.maximum(np.linalg.norm(x, axis=-1, keepdims=True), 1e-9)


def poang(Q, R, rnamn, medel, namnlista, hub=None):
    """Poäng per namn (bästa referens) för varje fråga, efter centrering mot referensernas medel."""
    q = norm(Q - medel); r = norm(R - medel)
    S = q @ r.T
    if hub is not None:
        S = 2 * S - hub[None, :]
    ut = np.full((len(Q), len(namnlista)), -9.0)
    idx = np.array([namnlista.index(n) for n in rnamn])
    for j in range(len(namnlista)):
        k = idx == j
        if k.any():
            ut[:, j] = S[:, k].max(1)
    return ut


# Bänkens dubbelparningar (2026-10-05): remsfall parar ibland SAMMA remsa med två facit-kort i en hög. Remsan visar
# bara det översta kortets titel, så raden med det undre kortets namn räknades som ett modellfel — de två största
# "felen" i golden (hel 0,240 och 0,212 för piloten, 0,200 för den gamla modellen) var sådana. Bild kollad:
# golden-06 remsan är Plains (Swamp under), golden-05 Pacifism (Scourge under). De två raderna stryks, och av rader
# med samma remsa och samma namn räknas en (annars vägde de dubbelt).
UNDRE = {('golden-06', 2), ('golden-05', 5)}


def ratta_parningar(meta):
    """Index i meta som räknas: utan det undre kortets rad och utan dubbletter av samma remsa och namn."""
    rader = [r for r in json.load(open(os.path.join(ROT, 'dev/detektor/tran/resultat/remsfall-tjock0.7.json')))
             if r['remsa'] and r['namn'] and r['kalla'] in ('mes246', '13b', 'golden')]
    assert len(rader) == len(meta)
    behall, sedda = set(), set()
    for i, (m, r) in enumerate(zip(meta, rader)):
        nyck = (m['bild'], m['facit'], tuple(round(v, 6) for v in r['remsa']))
        if (m['bild'], m['id']) in UNDRE or nyck in sedda:
            continue
        sedda.add(nyck); behall.add(i)
    return behall


def prova():
    d = np.load(NPZ, allow_pickle=False)
    meta = json.loads(str(d['meta']))
    behall = ratta_parningar(meta)
    jlek = set(json.loads(str(d['jesper_lek'])))
    kallor = ('golden', '13b', 'mes246')

    def kor(sk, fb, leken=False, csls=0, larda=False, titel=True):
        R, rn = d[f'r|{fb}'], [str(x) for x in d[f'r|{fb}|namn']]
        if leken:
            k = np.array([n in jlek for n in rn]); R, rn = R[k], [n for n, kk in zip(rn, k) if kk]
        medel = R.mean(0)
        res = {}
        for del_ in ('hel', 'titel'):
            idx = d[f'q|{sk}|{fb}|{del_}|idx']; Q = d[f'q|{sk}|{fb}|{del_}']
            res[del_] = dict(zip(idx.tolist(), Q))
        ids = sorted(set(res['hel']) & set(res['titel']) & behall)
        namnlista = sorted(set(rn) | {meta[i]['facit'] for i in ids})
        ut = {}
        for kalla in kallor:
            ii = [i for i in ids if meta[i]['kalla'] == kalla]
            if not ii:
                continue
            hub = None
            if csls:
                # navstraff kalibrerat på de ANDRA källornas remsor (aldrig de som mäts), utan deras facit
                andra = np.stack([res['hel'][i] for i in ids if meta[i]['kalla'] != kalla])
                Sr = norm(R - medel) @ norm(andra - medel).T
                hub = np.sort(Sr, axis=1)[:, -csls:].mean(1)
            P = {}
            for del_ in ('hel', 'titel'):
                Q = np.stack([res[del_][i] for i in ii])
                RR, RN = R, rn
                if larda:
                    # lärda referenser: samma källa, TIDIGARE läge, samma namn enligt facit (det appen visste då)
                    pass
                P[del_] = poang(Q, RR, RN, medel, namnlista, hub)
            if larda:
                # per fråga: lägg till tidigare remsor (hel) från samma källa som referenser, viktade som en referens
                Lq = np.stack([res['hel'][i] for i in ii])
                for a, i in enumerate(ii):
                    tidigare = [j for j in ii if meta[j]['t'] < meta[i]['t'] and meta[j]['kalla'] == meta[i]['kalla']]
                    if not tidigare:
                        continue
                    for del_ in ('hel', 'titel'):
                        q = norm(res[del_][i] - medel)
                        T = norm(np.stack([res['hel'][j] for j in tidigare]) - medel)
                        if del_ == 'titel':
                            T = norm(np.stack([res['titel'][j] for j in tidigare]) - medel)
                        s = T @ q
                        for j, sc in zip(tidigare, s):
                            n = namnlista.index(meta[j]['facit'])
                            if sc > P[del_][a, n]:
                                P[del_][a, n] = sc
            facit = [namnlista.index(meta[i]['facit']) for i in ii]
            for a, i in enumerate(ii):
                h = P['hel'][a]; o = np.argsort(-h)
                t = P['titel'][a]; ot = np.argsort(-t)
                ut[i] = {'ratt': o[0] == facit[a], 'hm': h[o[0]] - h[o[1]],
                         'tsamma': ot[0] == o[0], 'tm': t[ot[0]] - t[ot[1]], 'kalla': kalla}
        return ut

    def summera(ut, titel=True):
        # nollfel-trösklar: (hel, titel) så att 0 säkra fel över alla källor; hel-regeln och titel-regeln
        rr = list(ut.values())
        fel_h = max([x['hm'] for x in rr if not x['ratt']] + [0])
        fel_t = max([min(x['tm'], 9) for x in rr if not x['ratt'] and x['tsamma']] + [0])
        def saker(x, th, tt):
            return x['hm'] > th or (titel and x['tsamma'] and x['tm'] > tt and x['hm'] >= 0.05)
        rad = []
        for kalla in kallor:
            k = [x for x in rr if x['kalla'] == kalla]
            if not k:
                continue
            # korsvaliderad: trösklarna ur de andra källorna
            ak = [x for x in rr if x['kalla'] != kalla]
            cfh = max([x['hm'] for x in ak if not x['ratt']] + [0]); cft = max([x['tm'] for x in ak if not x['ratt'] and x['tsamma']] + [0])
            sr = sum(saker(x, fel_h, fel_t) and x['ratt'] for x in k)
            csr = sum(saker(x, cfh, cft) and x['ratt'] for x in k); csf = sum(saker(x, cfh, cft) and not x['ratt'] for x in k)
            rad.append(f"{kalla} {sum(x['ratt'] for x in k)}/{len(k)} överst, säkra {sr} (korsval {csr}, fel {csf})")
        return f"nollfel hel {fel_h:.3f} titel {fel_t:.3f} | " + ' · '.join(rad)

    print('idé'.ljust(44), 'resultat')
    for sk, fb in itertools.product(SKARNINGAR, FORBEH):
        print(f'{sk}/{fb}'.ljust(44), summera(kor(sk, fb)))
    for sk in SKARNINGAR:
        for fb in FORBEH:
            for namn, kw in (('leken', {'leken': True}), ('csls5', {'csls': 5}), ('leken+csls5', {'leken': True, 'csls': 5}),
                             ('leken+lärda', {'leken': True, 'larda': True}), ('leken+csls5+lärda', {'leken': True, 'csls': 5, 'larda': True})):
                print(f'{sk}/{fb} {namn}'.ljust(44), summera(kor(sk, fb, **kw)))


if __name__ == '__main__':
    {'bygg': bygg, 'prova': prova}[sys.argv[1]]()

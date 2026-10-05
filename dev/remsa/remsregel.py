"""Appens remsregel (kamLasRemsa: 'remsa' och 'remsa+titel') på remsbänkens vektorer (remsexp.py bygg), för en eller
flera modeller. Inte med: appens avrundning till tre decimaler, baksidan i remsleken (kan ligga tvåa), lekPrior,
minnet och textläsaren ('remsa+namn').

    saker = hel > T.remsaTroskel  ELLER  (titelns etta == helas etta  och  titel > T.remsaTitelTroskel  och  hel >= T.remsaVittne)

remsexp.py prova räknar sin nollfel-titel utan vakten (hel >= vittne); den här räknar trösklarna med vakten, med golden-leken och
med Jespers lek, utan bänkens dubbelparningar (remsexp.ratta_parningar). Skriver: säkra rätt/fel vid appens
trösklar, de största felen, och de nollfel-trösklar som ger flest säkra rätt i BÅDA lekarna.

    ~/.mesa/detektor-venv/bin/python dev/remsa/remsregel.py resultat/remsexp-bas.npz resultat/remsexp-pilot1.npz

2026-10-05: pilot1 0 säkra fel vid 0,20/0,20/0,05; största fel hel 0,171, titel 0,179 (Plains → Pacifism).
"""
import sys, os, json
import numpy as np
HAR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HAR)
from remsexp import norm, poang, ratta_parningar  # noqa: E402

APP = (0.20, 0.20, 0.05)   # index.html T.remsaTroskel, T.remsaTitelTroskel, T.remsaVittne
KALLOR = ('golden', '13b', 'mes246')


def rader(npz, leken):
    d = np.load(npz, allow_pickle=False)
    meta = json.loads(str(d['meta'])); jlek = set(json.loads(str(d['jesper_lek'])))
    R, rn = d['r|ra'], [str(x) for x in d['r|ra|namn']]
    if leken:
        k = np.array([n in jlek for n in rn]); R, rn = R[k], [n for n, kk in zip(rn, k) if kk]
    medel = R.mean(0)
    res = {del_: dict(zip(d[f'q|app|ra|{del_}|idx'].tolist(), d[f'q|app|ra|{del_}'])) for del_ in ('hel', 'titel')}
    ids = sorted(set(res['hel']) & set(res['titel']) & ratta_parningar(meta))
    namnlista = sorted(set(rn) | {meta[i]['facit'] for i in ids})
    Ph = poang(np.stack([res['hel'][i] for i in ids]), R, rn, medel, namnlista)
    Pt = poang(np.stack([res['titel'][i] for i in ids]), R, rn, medel, namnlista)
    ut = []
    for a, i in enumerate(ids):
        h = Ph[a]; o = np.argsort(-h); t = Pt[a]; ot = np.argsort(-t); m = meta[i]
        ut.append(dict(kalla=m['kalla'], bild=m['bild'], facit=m['facit'], namn=namnlista[o[0]],
                       ratt=bool(namnlista[o[0]] == m['facit']), hm=float(h[o[0]] - h[o[1]]),
                       tsamma=bool(ot[0] == o[0]), tm=float(t[ot[0]] - t[ot[1]])))
    return ut


def saker(x, th, tt, v):
    return x['hm'] > th or (x['tsamma'] and x['tm'] > tt and x['hm'] >= v)


def rakna(rr, th, tt, v):
    return {k: (sum(x['ratt'] for x in rr if x['kalla'] == k), sum(saker(x, th, tt, v) and x['ratt'] for x in rr if x['kalla'] == k),
                sum(saker(x, th, tt, v) and not x['ratt'] for x in rr if x['kalla'] == k)) for k in KALLOR}


def fmt(u):
    return ' · '.join(f"{k} säkra rätt {a[1]} av {a[0]} rätt överst, säkra fel {a[2]}" for k, a in u.items())


if __name__ == '__main__':
    for npz in sys.argv[1:] or [os.path.join(HAR, 'resultat', 'remsexp.npz')]:
        npz = npz if os.path.isabs(npz) else os.path.join(HAR, npz)
        data = {l: rader(npz, l) for l in (False, True)}
        print(f"\n######## {os.path.basename(npz)} ########")
        for l, rr in data.items():
            print(f"\n== {'Jespers lek' if l else 'golden-leken'} ({len(rr)} remsor)")
            print('  appens trösklar %.2f/%.2f/%.2f: ' % APP + fmt(rakna(rr, *APP)))
            for x in sorted([x for x in rr if not x['ratt']], key=lambda x: -x['hm'])[:5]:
                print(f"    fel hel {x['hm']:.3f} (titel {'samma' if x['tsamma'] else 'annan'} {x['tm']:.3f})  {x['kalla']:6} {x['bild']:14} {x['facit'][:22]} → {x['namn'][:22]}")
            for x in sorted([x for x in rr if not x['ratt'] and x['tsamma']], key=lambda x: -x['tm'])[:3]:
                print(f"    fel titel {x['tm']:.3f} (hel {x['hm']:.3f})  {x['kalla']:6} {x['bild']:14} {x['facit'][:22]} → {x['namn'][:22]}")
        best = []
        for th in np.arange(0.10, 0.45, 0.005):
            for tt in np.arange(0.10, 0.45, 0.005):
                for v in (0.0, 0.05, 0.08, 0.10, 0.12):
                    ua, ub = rakna(data[False], th, tt, v), rakna(data[True], th, tt, v)
                    if any(a[2] for a in ua.values()) or any(a[2] for a in ub.values()):
                        continue
                    best.append((sum(a[1] for a in ua.values()) + sum(a[1] for a in ub.values()), th, tt, v, ua, ub))
        best.sort(key=lambda x: (-x[0], x[1], x[2]))
        print('\n  nollfel-trösklar med flest säkra (på kanten — ingen marginal mot nästa fel):')
        for s, th, tt, v, ua, ub in best[:3]:
            print(f"    hel {th:.3f} titel {tt:.3f} vittne {v:.2f}: golden-leken {fmt(ua)} | Jespers lek {fmt(ub)}")

"""Lärda remsor, närmare: vilka fel har hög marginal, och vad händer när appen bara lär sig av det den
faktiskt kunde veta? Läser resultat/remsexp.npz (remsexp.py bygg).

Varianter för vilka TIDIGARE remsor (samma inspelning, lägre t) som blir referenser:
  facit     alla tidigare remsor med facits namn (övre gränsen)
  synliga   bara tidigare remsor där kortet låg helt synligt (synlig = 1) — de appen läser på hela kortet,
            som golden-fotona (63/72 rätt överst, 0 fel)
  samma_id  bara tidigare remsor av SAMMA fysiska kort (kort-id i ritningen) — appen följer kortet i spåret
Domen: marginal = bästa namn minus näst bästa. Säkra rätt/fel per tröskel, och listan över fel med marginal
över 0,10: vad det var, vad det blev, och om den vinnande referensen var samma kort eller ett annat.
"""
import json, os, sys
from collections import Counter
import numpy as np

HAR = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(os.path.dirname(HAR))
sys.path.insert(0, HAR)
from remsexp import NPZ, norm  # noqa: E402

d = np.load(NPZ, allow_pickle=False)
meta = json.loads(str(d['meta']))
jlek = set(json.loads(str(d['jesper_lek'])))
# synlig-andelen ur remsfall (samma urval och ordning som remsexp.bygg)
rf = [r for r in json.load(open(os.path.join(ROT, 'dev/detektor/tran/resultat/remsfall-tjock0.7.json')))
      if r['remsa'] and r['namn'] and r['kalla'] in ('mes246', '13b', 'golden')]
assert len(rf) == len(meta)
for m_, r in zip(meta, rf):
    m_['synlig'] = r['synlig']


def kor(sk='app', fb='ra', satt='facit', del_='hel', kallor=('13b', 'mes246')):
    R, rn = d[f'r|{fb}'], [str(x) for x in d[f'r|{fb}|namn']]
    k = np.array([n in jlek for n in rn]); R, rn = R[k], [n for n, kk in zip(rn, k) if kk]
    medel = R.mean(0)
    idx = d[f'q|{sk}|{fb}|{del_}|idx'].tolist(); Q = dict(zip(idx, d[f'q|{sk}|{fb}|{del_}']))
    Rn = norm(R - medel)
    ut = []
    for i in idx:
        mi = meta[i]
        if mi['kalla'] not in kallor:
            continue
        q = norm(Q[i] - medel)
        best = {}
        for n, s in zip(rn, Rn @ q):
            if s > best.get(n, (-9, None))[0]:
                best[n] = (float(s), 'scryfall')
        tid = [j for j in idx if meta[j]['kalla'] == mi['kalla'] and meta[j]['t'] < mi['t']]
        if satt == 'synliga':
            tid = [j for j in tid if meta[j]['synlig'] >= 0.999]
        elif satt == 'samma_id':
            tid = [j for j in tid if meta[j]['id'] == mi['id']]
        if satt != 'ingen' and tid:
            T = norm(np.stack([Q[j] for j in tid]) - medel)
            for j, s in zip(tid, T @ q):
                n = meta[j]['facit']
                if s > best.get(n, (-9, None))[0]:
                    best[n] = (float(s), 'samma kort' if meta[j]['id'] == mi['id'] else 'annat kort')
        o = sorted(best.items(), key=lambda x: -x[1][0])
        ut.append({'i': i, 'kalla': mi['kalla'], 'facit': mi['facit'], 'svar': o[0][0], 'marg': o[0][1][0] - o[1][1][0],
                   'kalla_ref': o[0][1][1], 'grupp': mi['grupp'], 'synlig': mi['synlig'], 'bild': mi['bild'], 'ny': mi['ny']})
    return ut


def visa(ut, rubrik):
    print(f'\n== {rubrik}')
    for kalla in ('13b', 'mes246'):
        u = [x for x in ut if x['kalla'] == kalla]
        if not u:
            continue
        ratt = sum(x['svar'] == x['facit'] for x in u)
        fel = sorted([x['marg'] for x in u if x['svar'] != x['facit']], reverse=True)
        rad = []
        for t in (0.05, 0.10, 0.15, 0.20, 0.30):
            rad.append(f"{t:.2f}: {sum(x['marg'] > t and x['svar'] == x['facit'] for x in u)} rätt/{sum(x['marg'] > t and x['svar'] != x['facit'] for x in u)} fel")
        ny = [x for x in u if x['ny']]
        print(f"  {kalla}: {ratt}/{len(u)} rätt överst (nya remsor {sum(x['svar'] == x['facit'] for x in ny)}/{len(ny)}) · säkra vid " + ' · '.join(rad) + f" · största fel {fel[:5]}")
    stora = sorted([x for x in ut if x['svar'] != x['facit'] and x['marg'] > 0.10], key=lambda x: -x['marg'])
    for x in stora[:12]:
        print(f"    FEL {x['marg']:.3f} {x['bild']} {x['facit']} → {x['svar']} ({x['kalla_ref']}, {x['grupp']}, synlig {x['synlig']:.2f})")


for satt in ('ingen', 'facit', 'synliga', 'samma_id'):
    visa(kor(satt=satt), f'app/ra, lärda: {satt}')
for fb in ('ra', 'gv'):
    visa(kor(sk='b960', fb=fb, satt='synliga'), f'b960/{fb}, lärda: synliga')


# ── blandad skärning: upprätad för tappade kort (bred rak låda runt en sned remsa), dagens för övriga ──
def kor_blandad(fb='ra', satt='synliga', del_='hel', kallor=('13b', 'mes246')):
    R, rn = d[f'r|{fb}'], [str(x) for x in d[f'r|{fb}|namn']]
    k = np.array([n in jlek for n in rn]); R, rn = R[k], [n for n, kk in zip(rn, k) if kk]
    medel = R.mean(0)
    qa = dict(zip(d[f'q|app|{fb}|{del_}|idx'].tolist(), d[f'q|app|{fb}|{del_}']))
    qr = dict(zip(d[f'q|rata|{fb}|{del_}|idx'].tolist(), d[f'q|rata|{fb}|{del_}']))
    Q = {i: (qr[i] if rf[i]['tappad'] and i in qr else qa[i]) for i in qa}
    idx = sorted(Q)
    Rn = norm(R - medel)
    ut = []
    for i in idx:
        mi = meta[i]
        if mi['kalla'] not in kallor:
            continue
        q = norm(Q[i] - medel)
        best = {}
        for n, s in zip(rn, Rn @ q):
            if s > best.get(n, (-9, None))[0]:
                best[n] = (float(s), 'scryfall')
        tid = [j for j in idx if meta[j]['kalla'] == mi['kalla'] and meta[j]['t'] < mi['t']]
        if satt == 'synliga':
            tid = [j for j in tid if meta[j]['synlig'] >= 0.999]
        elif satt == 'synliga_otappade':
            tid = [j for j in tid if meta[j]['synlig'] >= 0.999 and not rf[j]['tappad']]
        elif satt == 'samma_id':
            tid = [j for j in tid if meta[j]['id'] == mi['id']]
        if tid:
            T = norm(np.stack([Q[j] for j in tid]) - medel)
            for j, s in zip(tid, T @ q):
                n = meta[j]['facit']
                if s > best.get(n, (-9, None))[0]:
                    best[n] = (float(s), 'samma kort' if meta[j]['id'] == mi['id'] else 'annat kort')
        o = sorted(best.items(), key=lambda x: -x[1][0])
        ut.append({'i': i, 'kalla': mi['kalla'], 'facit': mi['facit'], 'svar': o[0][0], 'marg': o[0][1][0] - o[1][1][0],
                   'kalla_ref': o[0][1][1], 'grupp': mi['grupp'], 'synlig': mi['synlig'], 'bild': mi['bild'], 'ny': mi['ny']})
    return ut


print('\n\n######## blandad skärning (upprätad för tappade) ########')
for fb in ('ra', 'gv'):
    for satt in ('synliga', 'synliga_otappade', 'samma_id'):
        visa(kor_blandad(fb=fb, satt=satt), f'blandad/{fb}, lärda: {satt}')

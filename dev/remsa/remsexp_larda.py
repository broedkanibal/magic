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


# ── spärr: hela remsan OCH titeldelen ska peka på samma lärda namn (Thriving Moor ↔ Swamp/Plains) ──
def overens(fb='ra', satt='synliga'):
    hel = {x['i']: x for x in kor_blandad(fb=fb, satt=satt, del_='hel')}
    tit = {x['i']: x for x in kor_blandad(fb=fb, satt=satt, del_='titel')}
    ut = []
    for i, h in hel.items():
        t = tit.get(i)
        if not t:
            continue
        ok = h['svar'] == t['svar']
        ut.append(dict(h, marg=min(h['marg'], t['marg']) if ok else 0.0))
    return ut


print('\n\n######## hela remsan OCH titeldelen överens ########')
for fb in ('ra', 'gv'):
    for satt in ('synliga', 'facit'):
        visa(overens(fb=fb, satt=satt), f'blandad/{fb}, lärda: {satt}, hel+titel överens')


# ── platsen i stället för id: tidigare remsor (helt synliga) vars mitt låg nära den här remsans mitt ──
def mitt(r):
    b = r['remsa']; return ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, max(b[2] - b[0], b[3] - b[1]))


def nara(fb='ra', radie=1.0, krav_titel=True):
    """Som kor_blandad 'synliga', men bara tidigare remsor inom radie × remslängden — det appen vet om platsen
    där ett kort låg (spåret som dog). Hel och titel måste peka på samma namn (krav_titel)."""
    R, rn = d[f'r|{fb}'], [str(x) for x in d[f'r|{fb}|namn']]
    k = np.array([n in jlek for n in rn]); R, rn = R[k], [n for n, kk in zip(rn, k) if kk]
    medel = R.mean(0); Rn = norm(R - medel)
    def Q(del_):
        qa = dict(zip(d[f'q|app|{fb}|{del_}|idx'].tolist(), d[f'q|app|{fb}|{del_}']))
        qr = dict(zip(d[f'q|rata|{fb}|{del_}|idx'].tolist(), d[f'q|rata|{fb}|{del_}']))
        return {i: (qr[i] if rf[i]['tappad'] and i in qr else qa[i]) for i in qa}
    QH, QT = Q('hel'), Q('titel')
    idx = sorted(set(QH) & set(QT))
    ut = []
    for i in idx:
        mi = meta[i]
        if mi['kalla'] not in ('13b', 'mes246'):
            continue
        cx, cy, L = mitt(rf[i])
        tid = [j for j in idx if meta[j]['kalla'] == mi['kalla'] and meta[j]['t'] < mi['t'] and meta[j]['synlig'] >= 0.999
               and np.hypot(mitt(rf[j])[0] - cx, mitt(rf[j])[1] - cy) <= radie * L]
        svar = []
        for QQ in (QH, QT):
            q = norm(QQ[i] - medel)
            best = {}
            for n, s in zip(rn, Rn @ q):
                best[n] = max(best.get(n, -9), float(s))
            if tid:
                T = norm(np.stack([QQ[j] for j in tid]) - medel)
                for j, s in zip(tid, T @ q):
                    best[meta[j]['facit']] = max(best.get(meta[j]['facit'], -9), float(s))
            o = sorted(best.items(), key=lambda x: -x[1])
            svar.append((o[0][0], o[0][1] - o[1][1]))
        (hn, hm), (tn, tm) = svar
        marg = (min(hm, tm) if hn == tn else 0.0) if krav_titel else hm
        ut.append({'i': i, 'kalla': mi['kalla'], 'facit': mi['facit'], 'svar': hn, 'marg': marg, 'kalla_ref': 'nära' if tid else 'scryfall',
                   'grupp': mi['grupp'], 'synlig': mi['synlig'], 'bild': mi['bild'], 'ny': mi['ny']})
    return ut


print('\n\n######## lärda inom en radie från platsen ########')
for radie in (0.5, 1.0, 2.0):
    for krav in (True, False):
        visa(nara(radie=radie, krav_titel=krav), f'blandad/ra, lärda nära (radie {radie} remslängder), hel+titel överens: {krav}')


# ── bara kort som INTE ligger kvar: ett kort vars spår lever (finns i samma läge) kan inte vara det här kortet ──
def nara_forsvunna(fb='ra', radie=1.0, krav_titel=True):
    R, rn = d[f'r|{fb}'], [str(x) for x in d[f'r|{fb}|namn']]
    k = np.array([n in jlek for n in rn]); R, rn = R[k], [n for n, kk in zip(rn, k) if kk]
    medel = R.mean(0); Rn = norm(R - medel)
    def Q(del_):
        qa = dict(zip(d[f'q|app|{fb}|{del_}|idx'].tolist(), d[f'q|app|{fb}|{del_}']))
        qr = dict(zip(d[f'q|rata|{fb}|{del_}|idx'].tolist(), d[f'q|rata|{fb}|{del_}']))
        return {i: (qr[i] if rf[i]['tappad'] and i in qr else qa[i]) for i in qa}
    QH, QT = Q('hel'), Q('titel')
    idx = sorted(set(QH) & set(QT))
    i_lage = {}
    for i in idx:
        i_lage.setdefault(meta[i]['bild'], set()).add(meta[i]['id'])
    ut = []
    for i in idx:
        mi = meta[i]
        if mi['kalla'] not in ('13b', 'mes246'):
            continue
        cx, cy, L = mitt(rf[i])
        kvar = i_lage[mi['bild']] - {mi['id']}     # andra kort som ligger i samma läge: deras spår lever
        tid = [j for j in idx if meta[j]['kalla'] == mi['kalla'] and meta[j]['t'] < mi['t'] and meta[j]['synlig'] >= 0.999
               and meta[j]['id'] not in kvar and np.hypot(mitt(rf[j])[0] - cx, mitt(rf[j])[1] - cy) <= radie * L]
        svar = []
        for QQ in (QH, QT):
            q = norm(QQ[i] - medel)
            best = {}
            for n, s in zip(rn, Rn @ q):
                best[n] = max(best.get(n, -9), float(s))
            if tid:
                T = norm(np.stack([QQ[j] for j in tid]) - medel)
                for j, s in zip(tid, T @ q):
                    best[meta[j]['facit']] = max(best.get(meta[j]['facit'], -9), float(s))
            o = sorted(best.items(), key=lambda x: -x[1])
            svar.append((o[0][0], o[0][1] - o[1][1]))
        (hn, hm), (tn, tm) = svar
        marg = (min(hm, tm) if hn == tn else 0.0) if krav_titel else hm
        ut.append({'i': i, 'kalla': mi['kalla'], 'facit': mi['facit'], 'svar': hn, 'marg': marg, 'kalla_ref': 'nära, försvunnet' if tid else 'scryfall',
                   'grupp': mi['grupp'], 'synlig': mi['synlig'], 'bild': mi['bild'], 'ny': mi['ny'], 'har_minne': bool(tid)})
    return ut


print('\n\n######## lärda nära, bara kort som inte ligger kvar ########')
for radie in (0.5, 1.0, 2.0):
    ut = nara_forsvunna(radie=radie)
    visa(ut, f'radie {radie}, hel+titel överens')
    for kalla in ('13b', 'mes246'):
        u = [x for x in ut if x['kalla'] == kalla]
        m = [x for x in u if x['har_minne']]
        print(f"    {kalla}: {len(m)}/{len(u)} remsor har ett försvunnet kort i närheten att jämföra mot")


# ── och bara NYSS försvunna: kortet sågs (i något läge, också delvis) inom dt sekunder före den här remsan ──
def nara_nyss(fb='ra', radie=1.0, dt=30.0):
    R, rn = d[f'r|{fb}'], [str(x) for x in d[f'r|{fb}|namn']]
    k = np.array([n in jlek for n in rn]); R, rn = R[k], [n for n, kk in zip(rn, k) if kk]
    medel = R.mean(0); Rn = norm(R - medel)
    def Q(del_):
        qa = dict(zip(d[f'q|app|{fb}|{del_}|idx'].tolist(), d[f'q|app|{fb}|{del_}']))
        qr = dict(zip(d[f'q|rata|{fb}|{del_}|idx'].tolist(), d[f'q|rata|{fb}|{del_}']))
        return {i: (qr[i] if rf[i]['tappad'] and i in qr else qa[i]) for i in qa}
    QH, QT = Q('hel'), Q('titel')
    idx = sorted(set(QH) & set(QT))
    i_lage, sedd = {}, {}
    for i in range(len(meta)):          # alla kort i ritningen med en parad remsa, också de som inte är med i frågorna
        i_lage.setdefault(meta[i]['bild'], set()).add(meta[i]['id'])
        sedd.setdefault((meta[i]['kalla'], meta[i]['id']), []).append(meta[i]['t'])
    ut = []
    for i in idx:
        mi = meta[i]
        if mi['kalla'] not in ('13b', 'mes246'):
            continue
        cx, cy, L = mitt(rf[i])
        kvar = i_lage[mi['bild']] - {mi['id']}
        def nyss(j):
            ts = [t for t in sedd[(meta[j]['kalla'], meta[j]['id'])] if t < mi['t']]
            return ts and mi['t'] - max(ts) <= dt
        tid = [j for j in idx if meta[j]['kalla'] == mi['kalla'] and meta[j]['t'] < mi['t'] and meta[j]['synlig'] >= 0.999
               and meta[j]['id'] not in kvar and nyss(j) and np.hypot(mitt(rf[j])[0] - cx, mitt(rf[j])[1] - cy) <= radie * L]
        svar = []
        for QQ in (QH, QT):
            q = norm(QQ[i] - medel)
            best = {}
            for n, s in zip(rn, Rn @ q):
                best[n] = max(best.get(n, -9), float(s))
            if tid:
                T = norm(np.stack([QQ[j] for j in tid]) - medel)
                for j, s in zip(tid, T @ q):
                    best[meta[j]['facit']] = max(best.get(meta[j]['facit'], -9), float(s))
            o = sorted(best.items(), key=lambda x: -x[1])
            svar.append((o[0][0], o[0][1] - o[1][1]))
        (hn, hm), (tn, tm) = svar
        ut.append({'i': i, 'kalla': mi['kalla'], 'facit': mi['facit'], 'svar': hn, 'marg': min(hm, tm) if hn == tn else 0.0,
                   'kalla_ref': 'nyss försvunnet' if tid else 'scryfall', 'grupp': mi['grupp'], 'synlig': mi['synlig'],
                   'bild': mi['bild'], 'ny': mi['ny'], 'har_minne': bool(tid)})
    return ut


print('\n\n######## nära + inte kvar + nyss försvunnet ########')
for radie in (0.5, 1.0):
    for dt in (10.0, 20.0, 40.0):
        ut = nara_nyss(radie=radie, dt=dt)
        visa(ut, f'radie {radie}, inom {dt:.0f} s')
        for kalla in ('13b', 'mes246'):
            u = [x for x in ut if x['kalla'] == kalla]
            print(f"    {kalla}: {sum(x['har_minne'] for x in u)}/{len(u)} har ett minne att jämföra mot")


# ── bara där mekanismen ska användas: TÄCKTA kort (i en hög eller synlig < 1) — helt synliga läses på hela kortet ──
print('\n\n######## bara täckta kort (hög eller synlig < 1) ########')
for radie in (0.5, 1.0):
    for dt in (20.0, 40.0, 1e9):
        ut = [x for x in nara_nyss(radie=radie, dt=dt) if x['grupp'].startswith('hög') or x['synlig'] < 0.999]
        visa(ut, f'täckta, radie {radie}, inom {dt:.0f} s')
        for kalla in ('13b', 'mes246'):
            u = [x for x in ut if x['kalla'] == kalla]
            print(f"    {kalla}: {len(u)} täckta remsor, {sum(x['har_minne'] for x in u)} med minne; dagens (Scryfall) säkra rätt vid 0.10: se 'ingen' ovan")
base = [x for x in kor(satt='ingen') if x['grupp'].startswith('hög') or x['synlig'] < 0.999]
visa(base, 'täckta, dagens (bara Scryfall)')

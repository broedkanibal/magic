"""Minnets tröskel på GEO-remsor (2026-10-15, dev/plan/golden-platan-2026-10-15.md punkt 2).

Appens minne av remsor (Kamera.lasRemsa → kamLasRemsa → remsMinnesDom) dömer ett täckt kort på dess EGEN remsa från
när det låg helt synligt: säkert ('remsa minne') när hela remsan OCH titeldelen pekar på samma minnesnamn med marginal
> T.remsaMinneTroskel (0,10). Tröskeln mättes 2026-10-03 på LÅDREMSOR (remsexp_larda.py nara_nyss, skärningen 'app').
Sedan remsan skärs ur kortets geometri (T.remsaGeo: hela kortbredden, 14 % av kortlängden, vriden upprätt) vägrar
minnet döma på geo-remsor ("geo: minnets tröskel omätt"), och i golden 13/18 är nästan varje remsa geo-skuren. Två
geo-remsor på samma plats är identiskt inramade, så bakgrundslikheten mellan två OLIKA kort kan vara högre än mellan
två lådremsor — därför mäts tröskeln här om, på samma remsor som förut (13b och MES-246, remsfall-tjock0.7.json),
skurna som appen skär dem.

Skärningar som mäts (frågan och minnena skärs alltid LIKA, som appen: provLika):
  geo    appens geometri-remsa: remslådans mitt (detektorns), kortets upp-riktning, kortbredd och kortlängd ur FACITS
         hörn (appen har dem ur KortVinkel och kortets egna mått — bästa fallet för geometrin, som appremsa.py 'geo'),
         tjocklek 0,14·L, allt utanför kortlådan (+4 %) målat med mattans nivå som skarRemsa gör. Det som ligger OVANPÅ
         målas INTE över här (appen målar t.tackt) — bänken är alltså hårdare än appen.
  exakt  remsan ur facits hörn (remsa_ur_bild) — övre gränsen för geometrin.
  lada   dagens låda (remsnamn.skar, marginal 4 %) — ska ge ungefär 2026-10-03:s tal (0 fel vid 0,10) som kontroll.

Minnet simuleras som appen gör det (Kamera.minnenFor + remsMinnesDom):
  - minnen = tidigare remsor i SAMMA inspelning av kort som låg helt synliga (synlig ≥ 0,999, det appen lär sig av),
    vars kort inte ligger kvar i rutan (ett annat kort-id i samma läge = spåret lever), sedda inom 20 s
    (remsaMinneS; "sedd" = någon ruta med kortet, också delvis), och inom en radie från frågans remsmitt
    (remsaMinneRadie 0,5 remslängder; här också 1,0 och 2,0, och alternativet kortens MITT inom 0,5 kortlängder —
    ett tappat kort vrids 90° runt sin mitt, så remsans mitt flyttar ~0,6 kortlängder men kortets mitt står kvar).
  - domen: per del (hel, titel) bästa poäng per namn över Scryfall-remsleken (Jespers lek, som i remsexp_larda) och
    minnenas vektorer (centrerade med remslekens medel); säkert när båda pekar på samma namn, namnet är ett MINNES
    namn och den minsta marginalen är över tröskeln.
  - frågorna = täckta kort (hög, synlig < 1) och tappade kort — där appen använder minnet som dom.
Skriver per skärning och radie: säkra rätt/fel vid 0,05…0,30, nollfel-tröskeln (största felmarginal), felen, och hur
många frågor som alls hade ett minne (och hur många av dem bytte tap-läge mot minnet).

    ~/.mesa/detektor-venv/bin/python dev/remsa/remsminne_geo.py bygg [--modell <onnx>]   → resultat/remsminne-geo-<modell>.npz
    ~/.mesa/detektor-venv/bin/python dev/remsa/remsminne_geo.py prova [--npz <fil>]

Förvalet för modellen är remsornas modell i appen (v2, dev/embed/modeller/mobileclip-s0-mesa-v2.onnx).
"""
import argparse, json, math, os, sys
from collections import Counter
import cv2
import numpy as np

HAR = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(os.path.dirname(HAR))
sys.path.insert(0, HAR)
sys.path.insert(0, os.path.join(ROT, 'dev', 'detektor'))
sys.path.insert(0, os.path.join(ROT, 'dev', 'detektor', 'tran'))
import lib  # noqa: E402
from lib import Bildmodell, ref_strip, kvadrat, suddig, vrid, las_referensbilder, remsa_ur_bild, varpa, REF_BREDD, REF_HOJD  # noqa: E402
import remsnamn  # noqa: E402
from remsexp import norm, GAMMAL_LEK  # noqa: E402

V2 = os.path.join(ROT, 'dev', 'embed', 'modeller', 'mobileclip-s0-mesa-v2.onnx')
REMSFALL = os.path.join(ROT, 'dev', 'detektor', 'tran', 'resultat', 'remsfall-tjock0.7.json')
INSP = os.path.join(ROT, 'dev', 'golden', 'inspelningar')
LAGEN = {'13b': os.path.join(INSP, '2026-10-02-fall-13b-0,5x-sidoljus', 'lagen.json'),
         'mes246': os.path.join(INSP, '2026-09-19-mes-246-las-fore-slapp', 'lagen.json')}
ANDEL, VANSTER, MARG_KORT = 0.14, 0.55, 0.04
SKARNINGAR = ('geo', 'exakt', 'lada')
LAND = {'Plains', 'Island', 'Swamp', 'Mountain', 'Forest'}
D = math.pi / 180


def vinkel_ur_horn(p):
    """Kortets upp-riktning (grader, 0 = upp i bilden, medurs) ur hörnen: medelvärdet av de två långsidorna, nedifrån och upp."""
    def rikt(a, b): return math.atan2(b[1] - a[1], b[0] - a[0])
    a1, a2 = rikt(p[3], p[0]), rikt(p[2], p[1])
    a2 += round((a1 - a2) / (2 * math.pi)) * 2 * math.pi
    return ((a1 + a2) / 2) / D


def geo_poly(c, theta, K, L, andel=ANDEL):
    """Remsans fyra hörn (medsols från kortets övre vänstra): mitten c, upp-riktning theta, kortbredd K, kortlängd L."""
    u = np.array([math.cos(theta * D), math.sin(theta * D)]); v = np.array([-u[1], u[0]])   # u = upp (längs långsidan nedifrån), v = höger
    t = andel * L
    return np.array([c + u * t / 2 - v * K / 2, c + u * t / 2 + v * K / 2, c - u * t / 2 + v * K / 2, c - u * t / 2 - v * K / 2], np.float32)


def las_lagen():
    ut = {}
    for kalla, fil in LAGEN.items():
        j = json.load(open(fil, encoding='utf-8'))
        ut[kalla] = {f"{l['t']:.2f}": {k['id']: k for k in l['kort']} for l in j['lagen'] if l.get('klar')}
    return ut


def rader():
    """Remsfallets rader (13b, MES-246) med en parad detektorremsa, plus facits hörn och tid."""
    lagen = las_lagen()
    ut = []
    for r in json.load(open(REMSFALL)):
        if not (r['remsa'] and r['namn'] and r['kalla'] in LAGEN):
            continue
        t = r['bild'].split('-', 1)[1]
        k = lagen[r['kalla']].get(t, {}).get(r['id'])
        if not k or not k.get('horn'):
            continue
        ut.append(dict(r, t=float(t), horn=k['horn'], z=k.get('z', 0)))
    return ut


def bygg(a):
    rr = rader()
    m = Bildmodell(fil=a.modell, tradar=4)
    cache = {}
    kvad, nyckel, alla, meta = [], [], [], []
    for i, r in enumerate(rr):
        if r['fil'] not in cache:
            cache.clear()
            src = cv2.imread(r['fil'])
            s = 1920 / max(src.shape[:2])
            cache[r['fil']] = cv2.resize(src, (round(src.shape[1] * s), round(src.shape[0] * s)), interpolation=cv2.INTER_AREA) if s < 1 else src
        img = cache[r['fil']]; H, W = img.shape[:2]
        horn = np.array([[x * W, y * H] for x, y in r['horn']], np.float64)
        theta = vinkel_ur_horn(horn)
        L = (np.linalg.norm(horn[3] - horn[0]) + np.linalg.norm(horn[2] - horn[1])) / 2
        K = (np.linalg.norm(horn[1] - horn[0]) + np.linalg.norm(horn[2] - horn[3])) / 2
        x0, y0, x1, y1 = r['remsa']; c = np.array([(x0 + x1) / 2 * W, (y0 + y1) / 2 * H])
        meta.append({'kalla': r['kalla'], 'bild': r['bild'], 't': r['t'], 'id': r['id'], 'facit': r['namn'], 'grupp': r['grupp'], 'land': r['land'],
                     'tappad': bool(r['tappad']), 'synlig': r['synlig'], 'hog': r['hog'], 'z': r['z'],
                     'remsa': r['remsa'], 'lada': r['lada'], 'W': W, 'H': H, 'kortmitt': [float(horn[:, 0].mean()), float(horn[:, 1].mean())], 'L': float(L), 'theta': round(theta, 1)})
        skuret = {}
        # geo: appens remsa — kortbredden tvärs, 0,14·L längs upp-axeln, runt detektorns remsmitt; utanför kortlådan (+4 %) målas mattans nivå
        poly = geo_poly(c, theta, K, L)
        bild = img.copy()
        bx0, by0, bx1, by1 = r['lada']; mk = MARG_KORT
        kx0, ky0 = max(0, int((bx0 - (bx1 - bx0) * mk) * W)), max(0, int((by0 - (by1 - by0) * mk) * H))
        kx1, ky1 = min(W, int(math.ceil((bx1 + (bx1 - bx0) * mk) * W))), min(H, int(math.ceil((by1 + (by1 - by0) * mk) * H)))
        niv = int(np.median(img[::16, ::16]))
        mask = np.ones((H, W), bool); mask[ky0:ky1, kx0:kx1] = False
        bild[mask] = niv
        hh = max(1, int(round(REF_BREDD * (REF_HOJD / REF_BREDD) * ANDEL)))
        skuret['geo'] = varpa(bild, poly, REF_BREDD, hh)
        skuret['exakt'] = remsa_ur_bild(img, horn, ANDEL)
        remsnamn.MARG = 0.04; skuret['lada'] = remsnamn.skar(img, r['lada'], r['remsa'])
        for sk in SKARNINGAR:
            st = skuret[sk]
            if st is None:
                continue
            for del_ in ('hel', 'titel'):
                s = st if del_ == 'hel' else st[:, :max(4, int(round(st.shape[1] * VANSTER)))]
                kvad.append(kvadrat(cv2.cvtColor(s, cv2.COLOR_BGR2RGB))); nyckel.append((i, sk, del_))
        if len(kvad) >= 512 or i == len(rr) - 1:
            alla.extend(zip(nyckel, m.kor(kvad))); kvad, nyckel = [], []
        if i % 100 == 0:
            print(f'  {i}/{len(rr)} remsor', flush=True)
    # referenserna: remsleken (skarp + sudd × 0/180), som remsexp.bygg och KamEmbed.byggRemsor
    kv, nm = [], []
    for n, cid, im in las_referensbilder():
        rgb = cv2.cvtColor(ref_strip(im, ANDEL), cv2.COLOR_BGR2RGB)
        for variant in ('skarp', 'sudd'):
            bas = kvadrat(suddig(rgb)) if variant == 'sudd' else kvadrat(rgb)
            for rot in (0, 180):
                kv.append(vrid(bas, rot)); nm.append(n)
    R = m.kor(kv)
    print(f'  referenser: {len(nm)}', flush=True)
    if os.path.exists(GAMMAL_LEK):
        jlek = sorted({c['name'] for c in json.load(open(GAMMAL_LEK))['kort']})
    else:
        tillagda = {'Additive Evolution', 'Forest', 'Island', 'Matterbending Mage', "Proctor's Gaze", 'Virtue of Knowledge // Vantress Visions'}
        jlek = sorted(set(nm) - tillagda)
    ut = {'meta': json.dumps(meta, ensure_ascii=False), 'jesper_lek': json.dumps(jlek, ensure_ascii=False), 'r': R, 'r|namn': np.array(nm), 'modell': np.array(os.path.basename(a.modell))}
    vek = {}
    for (i, sk, del_), x in alla:
        vek.setdefault((sk, del_), {})[i] = x
    for (sk, del_), d in vek.items():
        idx = np.array(sorted(d)); ut[f'q|{sk}|{del_}|idx'] = idx; ut[f'q|{sk}|{del_}'] = np.stack([d[j] for j in idx])
    os.makedirs(os.path.dirname(a.npz), exist_ok=True)
    np.savez_compressed(a.npz, **ut)
    print('skrivet', a.npz, f'({len(meta)} remsor)')


def typnamn(n):
    return n   # basland heter redan sin typ i remsleken (Plains, Swamp …); andra namn som de är


def prova(a):
    d = np.load(a.npz, allow_pickle=False)
    meta = json.loads(str(d['meta'])); jlek = set(json.loads(str(d['jesper_lek'])))
    R, rn = d['r'], [str(x) for x in d['r|namn']]
    k = np.array([n in jlek for n in rn]); R, rn = R[k], [n for n, kk in zip(rn, k) if kk]
    medel = R.mean(0); Rn = norm(R - medel)
    print(f"modell {d['modell']}, {len(meta)} remsor, remsleken {len(set(rn))} namn ({len(rn)} referenser)")
    sedd = {}
    i_lage = {}
    for i, mi in enumerate(meta):
        sedd.setdefault((mi['kalla'], mi['id']), []).append(mi['t'])
        i_lage.setdefault(mi['bild'], set()).add(mi['id'])

    def mitt_remsa(mi):
        """Remsans mitt och längd i bildpunkter (andelarna är av W respektive H, så de räknas om)."""
        b = mi['remsa']; W, H = mi['W'], mi['H']
        return (b[0] + b[2]) / 2 * W, (b[1] + b[3]) / 2 * H, max((b[2] - b[0]) * W, (b[3] - b[1]) * H)

    def kor(sk, radie_satt, radie, dt=20.0, bara=None):
        Q = {del_: dict(zip(d[f'q|{sk}|{del_}|idx'].tolist(), d[f'q|{sk}|{del_}'])) for del_ in ('hel', 'titel')}
        idx = sorted(set(Q['hel']) & set(Q['titel']))
        ut = []
        for i in idx:
            mi = meta[i]
            tackt = mi['grupp'].startswith('hög') or mi['synlig'] < 0.999
            if bara == 'tackta' and not (tackt or mi['tappad']):
                continue
            kvar = i_lage[mi['bild']] - {mi['id']}
            rx, ry, L = mitt_remsa(mi)

            def nyss(j):
                ts = [t for t in sedd[(meta[j]['kalla'], meta[j]['id'])] if t < mi['t']]
                return bool(ts) and mi['t'] - max(ts) <= dt

            def nara(j):
                mj = meta[j]
                if radie_satt == 'remsa':
                    jx, jy, _ = mitt_remsa(mj); return math.hypot(jx - rx, jy - ry) <= radie * L
                return math.hypot(mj['kortmitt'][0] - mi['kortmitt'][0], mj['kortmitt'][1] - mi['kortmitt'][1]) <= radie * mi['L']
            minnen = [j for j in idx if meta[j]['kalla'] == mi['kalla'] and meta[j]['t'] < mi['t'] and meta[j]['synlig'] >= 0.999
                      and meta[j]['id'] not in kvar and nyss(j) and nara(j)]
            svar = []
            for del_ in ('hel', 'titel'):
                q = norm(Q[del_][i] - medel)
                best = {}
                for n, s in zip(rn, Rn @ q):
                    best[n] = max(best.get(n, -9), float(s))
                mn = set()
                if minnen:
                    T = norm(np.stack([Q[del_][j] for j in minnen]) - medel)
                    for j, s in zip(minnen, T @ q):
                        n = typnamn(meta[j]['facit']); mn.add(n)
                        if s > best.get(n, -9):
                            best[n] = float(s)
                o = sorted(best.items(), key=lambda x: -x[1])
                svar.append((o[0][0], o[0][1] - o[1][1], o[0][0] in mn))
            (hn, hm, hminne), (tn, tm, _) = svar
            minnesnamn = {typnamn(meta[j]['facit']) for j in minnen}
            overens = hn == tn and hn in minnesnamn
            ut.append({'i': i, 'kalla': mi['kalla'], 'facit': mi['facit'], 'svar': hn, 'marg': min(hm, tm) if overens else 0.0, 'overens': overens,
                       'har_minne': bool(minnen), 'tackt': tackt, 'tappad': mi['tappad'], 'grupp': mi['grupp'], 'synlig': mi['synlig'], 'bild': mi['bild'],
                       'tapbyte': any(meta[j]['tappad'] != mi['tappad'] for j in minnen), 'n_minnen': len(minnen),
                       'ratt_minne': any(meta[j]['facit'] == mi['facit'] for j in minnen)})
        return ut

    def visa(ut, rubrik):
        print(f'\n== {rubrik}')
        for kalla in ('13b', 'mes246'):
            u = [x for x in ut if x['kalla'] == kalla]
            if not u:
                continue
            m = [x for x in u if x['har_minne']]
            delar = ' · '.join(f"{t:.2f}: {sum(x['marg'] > t and x['svar'] == x['facit'] for x in u)} rätt/{sum(x['marg'] > t and x['svar'] != x['facit'] for x in u)} fel"
                               for t in (0.05, 0.08, 0.10, 0.12, 0.15, 0.20, 0.30))
            fel = sorted([x for x in u if x['overens'] and x['svar'] != x['facit']], key=lambda x: -x['marg'])
            nollfel = fel[0]['marg'] if fel else 0.0
            print(f"  {kalla}: {len(u)} frågor, {len(m)} med minne ({sum(x['ratt_minne'] for x in m)} där rätt kort fanns i minnet, {sum(x['tapbyte'] for x in m)} med tap-byte) · säkra vid {delar} · nollfel {nollfel:.3f}")
            for x in fel[:6]:
                print(f"    FEL {x['marg']:.3f} {x['bild']} {x['facit']} → {x['svar']} ({x['grupp']}, synlig {x['synlig']:.2f}{', tappad' if x['tappad'] else ''}{', tap-byte' if x['tapbyte'] else ''}, {x['n_minnen']} minnen)")
            # tap-byten som vinns: rätt och säkert vid 0,10 där minnet och frågan har olika tap-läge
            tb = [x for x in m if x['tapbyte'] and x['svar'] == x['facit']]
            if tb:
                print(f"    tap-byte, rätt överst: {len(tb)}; marginaler {sorted(round(x['marg'], 3) for x in tb)[-8:]}")

    for sk in SKARNINGAR:
        if f'q|{sk}|hel|idx' not in d:
            continue
        print(f'\n######## skärning {sk} ########')
        for satt, radie in (('remsa', 0.5), ('remsa', 1.0), ('remsa', 2.0), ('kort', 0.5), ('kort', 1.0)):
            visa(kor(sk, satt, radie, bara='tackta'), f'{sk}: täckta och tappade frågor, minnen inom {radie} {"remslängder (remsans mitt)" if satt == "remsa" else "kortlängder (kortets mitt)"}, 20 s')
        visa(kor(sk, 'remsa', 0.5, bara=None), f'{sk}: ALLA frågor (också helt synliga), remsans mitt 0,5, 20 s')


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('steg', choices=('bygg', 'prova'))
    p.add_argument('--modell', default=V2)
    p.add_argument('--npz', default=None)
    a = p.parse_args()
    if a.npz is None:
        a.npz = os.path.join(HAR, 'resultat', f"remsminne-geo-{os.path.splitext(os.path.basename(a.modell))[0].replace('mobileclip-s0-', '')}.npz")
    {'bygg': bygg, 'prova': prova}[a.steg](a)

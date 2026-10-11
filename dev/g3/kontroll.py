"""MES-364 (G3): kontrollen av Claudes namn mot Scryfall-bilden, och räkningen.

Claudes svar (dev/g3/resultat/<konfig>-k<n>.json, från fraga.cjs) kontrolleras som trappans steg 3 i G1
(dev/remsa/varlden.py orb-dom): bildmodellen + ORB mot Scryfall-bilden (small) av Claudes namn. Skillnaden mot G1
är att kandidaten inte är bildmodellens etta utan Claudes namn:

  - Namnet slås upp i Scryfalls unique_artwork (samma 33 223 namn som G1). Finns det inte: stoppat ("okänt namn").
  - Bildmodellens poäng för just det namnet (världen, skarp + sudd, den vridning där namnet får högst poäng) och
    marginalen mot bästa andra namn (negativ när modellen har något annat överst).
  - ORB mot bilden av namnets konstverk som ligger närmast beskärningen (en bild, hämtad vid behov).
  - Säkert: ORB bär namnet enligt appens trappa (identifyMedModell): hel ruta och 25 inliers, eller 14 med
    modellmarginal 0,06, eller ORB_ACCEPT med säker modell. Basland: säkert på typen när modellens marginal ≥ 0,15
    (LAND_MARGINAL), som i G1.
  - "Strikt" (ORB ensam): hel ruta och minst 25 inliers, ingen hjälp av modellen. Basland: som ovan.

    PY=~/.mesa/detektor-venv/bin/python
    $PY dev/g3/kontroll.py uppgifter        # skriver dev/embed/cache/varlden/orb-uppgifter-g3.json
    node dev/embed/webb.cjs varlden.html "ORBSTEG('dev/embed/cache/varlden/orb-uppgifter-g3.json')" --port 8392 \
         > dev/embed/cache/varlden/orb-svar-g3.json
    $PY dev/g3/kontroll.py dom              # tabellerna, dev/g3/resultat/sammanfattning.json

Kräver ARBETE-mappen från MES-361 (dev/material/arbete/2026-10-11-mes-361-varlden: katalog, small.json, vektorer).
"""
import glob, json, os, sys

HAR = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(os.path.dirname(HAR))
SYS_ARGV = sys.argv
sys.argv = [SYS_ARGV[0]]          # varlden.py läser sys.argv när den importeras
sys.path.insert(0, os.path.join(ROT, 'dev', 'remsa'))
import numpy as np  # noqa: E402
import varlden as V  # noqa: E402
sys.argv = SYS_ARGV

RES = os.path.join(HAR, 'resultat')
UPPG = os.path.join(ROT, 'dev', 'embed', 'cache', 'varlden')
LAND_MARGINAL = 0.15
ORB_STRIKT = 25


def las_resultat():
    ut = []
    for f in sorted(glob.glob(os.path.join(RES, '*-k[0-9]*.json'))):
        d = json.load(open(f, encoding='utf-8'))
        if 'rader' in d:
            ut.append(d)
    return ut


def namnindex(kat):
    """{gemener fullt namn: namn, gemener framsida: namn} — framsidan för dubbelsidiga kort."""
    full, fram = {}, {}
    for r in kat:
        full.setdefault(r['namn'].lower(), r['namn'])
        fram.setdefault(r['namn'].split(' // ')[0].lower(), r['namn'])
    return full, fram


def slå_upp(svar, full, fram):
    s = svar.strip().lower()
    if s in full:
        return full[s]
    if s.split(' // ')[0] in fram:
        return fram[s.split(' // ')[0]]
    if V.bastyp(svar.strip().title()):
        return V.bastyp(svar.strip().title())
    return None


def varldslista():
    zs = [np.load(V.vekfil(v)) for v in V.VARIANTER]
    filer = list(zs[0]['filer'])
    ra = np.stack([z['ra'] for z in zs], axis=1).reshape(-1, zs[0]['ra'].shape[1])
    kat = {r['fil']: r for r in V.katalog()}
    nv = len(V.VARIANTER)
    namn_rad = [kat[f]['namn'] for f in filer for _ in range(nv)]
    fil_rad = [f for f in filer for _ in range(nv)]
    return V.Lista(namn_rad, ra, fil_rad)


def steg_uppgifter():
    resultat = las_resultat()
    kat = V.katalog()
    full, fram = namnindex(kat)
    sm = V.smalls()
    man = json.load(open(os.path.join(V.RIKTIGA, 'manifest.json'), encoding='utf-8'))
    par = {}                                  # (fil, canon) -> None
    for d in resultat:
        for r in d['rader']:
            if r.get('namn'):
                c = slå_upp(r['namn'], full, fram)
                if c:
                    par[(r['fil'], c)] = None
    print(len(par), 'unika (beskärning, namn)-par att kontrollera')
    m = V.Bildmodell(V.MODELLFIL)
    mannen, Q = V.fragevektorer(m)
    qfil = {p['fil']: q for p, q in zip(mannen, Q)}
    L = varldslista()
    pers = {}
    upp, info = [], {}
    for (fil, canon) in sorted(par):
        if fil not in pers:
            pers[fil] = [L._per(q)[1] for q in qfil[fil]]
        nyk = V.nyckel(canon)
        idx = L.namnlista.index(nyk)
        bast = None
        for k, per in enumerate(pers[fil]):
            sc = float(per[idx]); andra = float(np.max(np.delete(per, idx)))
            if bast is None or sc > bast[1]:
                bast = (k, sc, sc - andra)
        k, sc, marg = bast
        rot = V.VRIDNINGAR[k]
        filer = L.basta_filer(qfil[fil][k], nyk, 1)
        bilder = [{'namn': nyk, 'url': sm[f]} for f in filer if f in sm]
        info[f'{fil}|{canon}'] = {'poang': round(sc, 4), 'marginal': round(marg, 4), 'rot': rot, 'filer': filer, 'land': bool(V.bastyp(canon))}
        upp.append({'fraga': 'dev/embed/riktiga/' + fil, 'marginalBeskarning': 0.08, 'rot': (360 - rot) % 360,
                    'etta': nyk, 'marginal': round(marg, 4), 'troskel': V.TROSKEL, 'land': bool(V.bastyp(canon)),
                    'landNamn': [], 'bilder': bilder, 'hamta': True, 'nyckel': f'{fil}|{canon}'})
    os.makedirs(UPPG, exist_ok=True)
    json.dump(upp, open(os.path.join(UPPG, 'orb-uppgifter-g3.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    json.dump(info, open(os.path.join(RES, 'kontroll-forarbete.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('skrev', len(upp), 'uppgifter')


def g1_tretton():
    """De oskymda nya (inte basland) beskärningar som telefonen inte klarade mot världen i G1: trappans regel
    ('trappan: ORB bär, basland på typ ≥ 0,15'), samma som varlden.py orb-dom. Ger (filer, alla 37)."""
    j = json.load(open(os.path.join(V.ARBETE, f'jamfor-{V.MODELLNAMN}-{"+".join(V.VARIANTER)}.json'), encoding='utf-8'))['världen']
    svar = json.load(open(os.path.join(UPPG, 'orb-svar-världen.json'), encoding='utf-8'))['ut']
    nya, klarade = [], []
    for r, o in zip(j, svar):
        if r['skymd'] or V.bastyp(r['facit']):
            continue
        nya.append(r['fil'])
        land = bool(V.bastyp(r['namn']))
        sakert = o['bar'] if not land else (r['marginal'] >= LAND_MARGINAL and not o['emot'])
        if r['ratt'] and sakert:
            klarade.append(r['fil'])
    return [f for f in nya if f not in klarade], nya


def bedom(rad, info, orb):
    """-> (kategori, ratt, sakert, strikt)"""
    if not rad.get('namn'):
        return 'inget', None, False, False
    full, fram = bedom.idx
    canon = slå_upp(rad['namn'], full, fram)
    if not canon:
        return 'okänt', V.samma_kort(rad['namn'], rad['facit']), False, False
    ratt = V.samma_kort(canon, rad['facit'])
    nyk = f"{rad['fil']}|{canon}"
    f, o = info[nyk], orb[nyk]
    if f['land']:
        sakert = strikt = f['marginal'] >= LAND_MARGINAL and not o['emot']
    else:
        sakert = bool(o['bar'])
        strikt = o['orbNamn'] == V.nyckel(canon) and o['inliers'] >= ORB_STRIKT and o['helRuta']
    return 'svar', ratt, sakert, strikt


def pct(xs, p):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(round(p * (len(xs) - 1))))]


def steg_dom():
    resultat = las_resultat()
    kat = V.katalog()
    bedom.idx = namnindex(kat)
    info = json.load(open(os.path.join(RES, 'kontroll-forarbete.json'), encoding='utf-8'))
    svar = json.load(open(os.path.join(UPPG, 'orb-svar-g3.json'), encoding='utf-8'))['ut']
    upp = json.load(open(os.path.join(UPPG, 'orb-uppgifter-g3.json'), encoding='utf-8'))
    orb = {u['nyckel']: o for u, o in zip(upp, svar)}
    tretton, nya = g1_tretton()
    man = json.load(open(os.path.join(V.RIKTIGA, 'manifest.json'), encoding='utf-8'))
    mangd = {'alla 61': [p['fil'] for p in man], f'nya, oskymda, inte basland ({len(nya)})': nya, f'de {len(tretton)} telefonen inte klarade (G1)': tretton}
    print('de som telefonen inte klarade i G1:', ', '.join(f'{f[:5]} {next(p["namn"] for p in man if p["fil"] == f)}' for f in tretton))
    sam = {}
    for d in resultat:
        nyckel = f"{d['konfig']} k{d['kor']}"
        rader = d['rader']
        rs = {}
        for mn, filer in mangd.items():
            fs = set(filer)
            c = dict(n=0, rätt=0, rätt_säkra=0, fel_säkra=0, rätt_stoppade=0, fel_stoppade=0, tomma=0, okända=0, strikt_rätt=0, strikt_fel=0, strikt_stoppade_rätt=0)
            for r in rader:
                if r['fil'] not in fs or r.get('fel') == 'inget-json' and False:
                    continue
                c['n'] += 1
                kat_, ratt, sakert, strikt = bedom(r, info, orb)
                if kat_ == 'inget':
                    c['tomma'] += 1; continue
                if kat_ == 'okänt':
                    c['okända'] += 1
                c['rätt'] += bool(ratt)
                if sakert and ratt: c['rätt_säkra'] += 1
                elif sakert and not ratt: c['fel_säkra'] += 1
                elif ratt: c['rätt_stoppade'] += 1
                else: c['fel_stoppade'] += 1
                if strikt and ratt: c['strikt_rätt'] += 1
                if strikt and not ratt: c['strikt_fel'] += 1
                if ratt and not strikt: c['strikt_stoppade_rätt'] += 1
            rs[mn] = c
        ok = [r for r in rader if not r.get('fel') and r.get('ms')]
        ms = [r['ms'] for r in ok]
        sam[nyckel] = {'konfig': d['konfig'], 'kor': d['kor'], 'model': d['model'], 'effort': d['effort'], 'mangder': rs,
                       'svar': len(ok), 'fel': len(rader) - len(ok), 'median_ms': pct(ms, .5) if ms else None, 'p90_ms': pct(ms, .9) if ms else None,
                       'usd_per_fraga': sum(r.get('usd', 0) for r in rader) / max(1, len(rader)),
                       'ut_token_snitt': sum((r.get('usage') or {}).get('output_tokens', 0) for r in rader) / max(1, len(rader))}
        # fel namn (Claude), säkra eller ej, för granskning
        sam[nyckel]['fel_lista'] = [{'fil': r['fil'], 'facit': r['facit'], 'claude': r['namn'], 'skymd': r['skymd'], 'sakerhet': r.get('sakerhet'),
                                    'sakert': bedom(r, info, orb)[2]} for r in rader if r.get('namn') and not V.samma_kort(slå_upp(r['namn'], *bedom.idx) or r['namn'], r['facit'])]
    json.dump(sam, open(os.path.join(RES, 'sammanfattning.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for mn in mangd:
        print(f'\n== {mn}')
        print(f"{'konfig':22} {'n':>3} {'rätt':>4} {'rätt+säkra':>10} {'SÄKRA FEL':>9} {'stoppade rätt':>13} {'fel stoppade':>12} {'tomma':>5} | strikt: rätt/fel/stopp.rätt | median  p90   $/fråga")
        for k, s in sam.items():
            c = s['mangder'][mn]
            print(f"{k:22} {c['n']:3} {c['rätt']:4} {c['rätt_säkra']:10} {c['fel_säkra']:9} {c['rätt_stoppade']:13} {c['fel_stoppade']:12} {c['tomma']:5} | {c['strikt_rätt']:4}/{c['strikt_fel']}/{c['strikt_stoppade_rätt']:<4}          | {s['median_ms']:5} {s['p90_ms']:5}  {s['usd_per_fraga']:.4f}")
    for k, s in sam.items():
        sf = [x for x in s['fel_lista'] if x['sakert']]
        if sf:
            print('SÄKRA FEL', k, sf)


def steg_lagre():
    """Efterhandsprov, inte en regel: hur skulle ett lägre ORB-krav än 25 inliers (utan krav på hel ruta) ha
    sett ut? Räknat på de unika (beskärning, namn)-paren över alla konfigurationer, utan basland."""
    bedom.idx = namnindex(V.katalog())
    upp = json.load(open(os.path.join(UPPG, 'orb-uppgifter-g3.json'), encoding='utf-8'))
    svar = json.load(open(os.path.join(UPPG, 'orb-svar-g3.json'), encoding='utf-8'))['ut']
    man = {p['fil']: p['namn'] for p in json.load(open(os.path.join(V.RIKTIGA, 'manifest.json'), encoding='utf-8'))}
    par = []
    for u, o in zip(upp, svar):
        fil, canon = u['nyckel'].split('|')
        if V.bastyp(canon) or V.bastyp(man[fil]):
            continue
        par.append((V.samma_kort(canon, man[fil]), o['inliers'] if o['orbNamn'] == u['etta'] else 0, fil, canon))
    ratt = [p for p in par if p[0]]; fel = [p for p in par if not p[0]]
    print(f'{len(par)} unika par utan basland: {len(ratt)} rätt, {len(fel)} fel')
    print('fel (inliers mot Claudes namn):', sorted((p[1], p[2][:5], p[3][:22]) for p in fel))
    for t in (3, 5, 8, 10, 12, 14, 18, 20, 25):
        print(f'  ORB ≥ {t:2} inliers: rätt släpps igenom {sum(p[1] >= t for p in ratt):2}/{len(ratt)}, fel släpps igenom {sum(p[1] >= t for p in fel)}/{len(fel)}')


def steg_rader():
    """Rad för rad för en konfiguration: python kontroll.py rader opus55-medium 1"""
    konfig, kor = SYS_ARGV[2], SYS_ARGV[3] if len(SYS_ARGV) > 3 else '1'
    bedom.idx = namnindex(V.katalog())
    info = json.load(open(os.path.join(RES, 'kontroll-forarbete.json'), encoding='utf-8'))
    upp = json.load(open(os.path.join(UPPG, 'orb-uppgifter-g3.json'), encoding='utf-8'))
    svar = json.load(open(os.path.join(UPPG, 'orb-svar-g3.json'), encoding='utf-8'))['ut']
    orb = {u['nyckel']: o for u, o in zip(upp, svar)}
    d = json.load(open(os.path.join(RES, f'{konfig}-k{kor}.json'), encoding='utf-8'))
    for r in d['rader']:
        kat_, ratt, sakert, strikt = bedom(r, info, orb)
        c = slå_upp(r['namn'], *bedom.idx) if r.get('namn') else None
        s = ''
        if c:
            i, o = info[f"{r['fil']}|{c}"], orb[f"{r['fil']}|{c}"]
            s = f"modell {i['marginal']:+.3f}  ORB {o['inliers']:3} inliers skala {(o['skala'] or 0):.2f} hel {int(o['helRuta'])}  land {int(i['land'])}"
        print(f"{'rätt' if ratt else ('fel ' if ratt is not None else '    ')} {'SÄKER' if sakert else 'stopp'} {r['fil'][:5]} {'skymd' if r['skymd'] else '     '} "
              f"{r['facit'][:22]:22} -> {(r['namn'] or '-')[:26]:26} {r.get('sakerhet') or '':5} {s}")


if __name__ == '__main__':
    {'uppgifter': steg_uppgifter, 'dom': steg_dom, 'rader': steg_rader, 'lagre': steg_lagre}.get(SYS_ARGV[1] if len(SYS_ARGV) > 1 else '', lambda: print(__doc__))()

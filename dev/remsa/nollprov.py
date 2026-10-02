#!/usr/bin/env python3
"""MES-328 steg 1 — nollprovet: känner dagens bildmodell (MobileCLIP-S0, otränad på remsor) igen ett
kort på BARA namnremsan?

Referenser: remsan (de översta ANDEL av kortet) ur lekens Scryfall-bilder (dev/embed/cache, samma
urval som appen: alla konstverk per namn, 28 namn, 105 bilder), i två varianter (skarp, sudd) och
två vridningar (0 och 180 — remsan ur en remsdetektor ligger alltid vågrätt, men kan vara vänd).
Frågor: remsan ur kortens ritade hörn i golden-fallen och MES-246 (remsor.py), varpad till samma
form som referensremsan, och remsan ur appens egna beskärningar (riktiga). Allt annat är embed.js
receptet (lib.py), som kalibrering.py visar ger 53/61 på hela kort (RAPPORT.md: 52/61).

Mått per källa × andel × upplösning: remsor, rätt namn i topp-1, säkra rätt och SÄKRA FEL vid dagens
tröskel (marginal > 0,11), medianmarginal, den lägsta tröskel som ger 0 säkra fel, tid per remsa.
Högkorten (facit `hog`) redovisas för sig — det är dem frågan gäller. MES-246 räknas också per unikt
kortläge (samma kort på samma plats i flera rutor = ett läge), som remsprov.py.

    ~/.mesa/detektor-venv/bin/python dev/remsa/nollprov.py [--andelar 0.12 0.16 0.20] [--kallor golden mes246 riktiga]
                                                            [--res orig 960] [--rotar 0 180] [--ark]
--ark skriver remsorna (fel, och ett urval rätt) till dev/material/arbete/2026-10-02-mes-328-remsor/.
"""
import argparse, json, os, sys, time
import cv2
import numpy as np

HAR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HAR)
from lib import (Bildmodell, Referenser, las_referensbilder, ref_strip, kvadrat, dom, remsa_ur_bild, kortbredd_px,  # noqa: E402
                 remsa_hojd_px, TROSKEL, ROT, median, MARGINAL)
import remsor  # noqa: E402

UT = os.path.join(HAR, 'resultat')
ARK = os.path.join(ROT, 'dev', 'material', 'arbete', '2026-10-02-mes-328-remsor')


def riktiga_remsa(img, andel):
    """Appens beskärning: 8 % marginal bort, sedan de översta ANDEL raderna (kortet står upprätt)."""
    H, W = img.shape[:2]
    f = MARGINAL / (1 + 2 * MARGINAL)
    x0, y0 = int(round(W * f)), int(round(H * f))
    k = img[y0:H - y0, x0:W - x0]
    return k[:max(1, int(round(k.shape[0] * andel)))]


def summera(rader, troskel=TROSKEL):
    n = len(rader)
    ratt = [r for r in rader if r['ratt']]; fel = [r for r in rader if not r['ratt']]
    s = {'remsor': n, 'ratt': len(ratt), 'sakra_ratt': sum(r['saker'] for r in ratt), 'sakra_fel': sum(r['saker'] for r in fel),
         'marginal_ratt_median': round(median([r['marginal'] for r in ratt]), 3) if ratt else None,
         'marginal_fel_max': round(max([r['marginal'] for r in fel]), 3) if fel else 0.0}
    # nollfelströskeln: över den högsta felmarginalen är inget fel säkert; hur många rätt blir säkra då?
    t0 = s['marginal_fel_max']
    s['nollfel_troskel'] = t0
    s['nollfel_sakra'] = sum(r['marginal'] > t0 for r in ratt)
    hog = [r for r in rader if r.get('hog')]
    s['hogkort'] = len(hog); s['hogkort_ratt'] = sum(r['ratt'] for r in hog)
    s['hogkort_sakra_ratt'] = sum(r['ratt'] and r['saker'] for r in hog); s['hogkort_sakra_fel'] = sum((not r['ratt']) and r['saker'] for r in hog)
    return s


def unika(rader):
    """MES-246: per kortläge — rätt i alla förekomster, och i flertalet."""
    per = {}
    for r in rader:
        per.setdefault(r['lage'], []).append(r['ratt'])
    return {'lagen': len(per), 'ratt_alla': sum(all(v) for v in per.values()), 'ratt_flertal': sum(sum(v) * 2 > len(v) for v in per.values())}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--andelar', nargs='+', type=float, default=[0.12, 0.16, 0.20])
    p.add_argument('--kallor', nargs='+', default=['golden', 'mes246', 'riktiga'])
    p.add_argument('--res', nargs='+', default=['orig', '960'])
    p.add_argument('--rotar', nargs='+', type=int, default=[0, 180])
    p.add_argument('--varianter', nargs='+', default=['skarp', 'sudd'])
    p.add_argument('--ark', action='store_true')
    p.add_argument('--namn', default='nollprov')
    a = p.parse_args()
    os.makedirs(UT, exist_ok=True)
    m = Bildmodell()
    bilder = las_referensbilder()
    print(f'lek: {len(bilder)} referensbilder, {len({b[0] for b in bilder})} namn')
    kallor = {}
    if 'golden' in a.kallor: kallor['golden'] = remsor.golden()
    if 'mes246' in a.kallor: kallor['mes246'] = remsor.mes246()
    if 'riktiga' in a.kallor: kallor['riktiga'] = remsor.riktiga()
    ut = {'namn': a.namn, 'troskel': TROSKEL, 'rotar': a.rotar, 'varianter': a.varianter, 'tabell': [], 'rader': {}}

    for andel in a.andelar:
        t0 = time.perf_counter(); m.ms.clear()
        refs = Referenser(m, [(n, i, ref_strip(img, andel)) for n, i, img in bilder], rotar=tuple(a.rotar), varianter=tuple(a.varianter))
        ref_ms = median(m.ms); ref_s = time.perf_counter() - t0
        print(f'\n=== andel {andel:.2f}: {len(refs.namn)} referensvektorer ({ref_s:.0f} s, {ref_ms:.0f} ms/bild)')
        for kalla, poster in kallor.items():
            for res in (a.res if kalla != 'riktiga' else ['orig']):
                rader = []; m.ms.clear(); varp_ms = []
                for post in poster:
                    if kalla == 'riktiga':
                        img = cv2.imread(post['bild'])
                        t1 = time.perf_counter(); strip = riktiga_remsa(img, andel); kv = kvadrat(cv2.cvtColor(strip, cv2.COLOR_BGR2RGB)); varp_ms.append((time.perf_counter() - t1) * 1000)
                        q = m.kor([kv])[0]
                        d = dom(refs.rangordna(q), post['namn'])
                        d.update({'kalla': kalla, 'bild': post['fil'], 'facit': post['namn'], 'hog': False, 'skymd': post['skymd'], 'helbild': post['helbild'],
                                  'kortbredd_px': strip.shape[1], 'remsa_px': strip.shape[0], 'lage': post['fil']})
                        rader.append(d); d['_strip'] = strip
                        continue
                    bild = post['orig'] if (res == 'orig' and post['orig']) else post['bild']
                    if res == 'orig' and kalla == 'golden' and not post['orig']:
                        bild = post['bild']   # 03–06: bild.jpg (1080) är det högsta som finns
                    img, _ = remsor.las(bild, res)
                    H, W = img.shape[:2]
                    kvad, meta = [], []
                    for nr, k in enumerate(post['kort']):
                        horn = remsor.horn_i_px(k, W, H)
                        t1 = time.perf_counter(); strip = remsa_ur_bild(img, horn, andel); kv = kvadrat(cv2.cvtColor(strip, cv2.COLOR_BGR2RGB)); varp_ms.append((time.perf_counter() - t1) * 1000)
                        kvad.append(kv); meta.append((nr, k, horn, strip))
                    if not kvad:
                        continue
                    Q = m.kor(kvad)
                    for q, (nr, k, horn, strip) in zip(Q, meta):
                        d = dom(refs.rangordna(q), k['facit'])
                        d.update({'kalla': kalla, 'bild': post['id'], 'nr': nr, 'facit': k['facit'], 'hog': k['hog'], 'tappad': k['tappad'], 'zon': k['zon'],
                                  'namnrad': k['namnrad'], 'synlig': k['synlig'], 'kortbredd_px': round(kortbredd_px(horn)), 'remsa_px': round(remsa_hojd_px(horn, andel), 1),
                                  'lage': f"{post['id']}|{k['kort_id']}" if kalla == 'golden' else str(remsor.lage_nyckel(k))})
                        d['_strip'] = strip
                        rader.append(d)
                s = summera(rader)
                s.update({'kalla': kalla, 'andel': andel, 'res': res, 'ms_modell': round(median(m.ms), 1), 'ms_varp': round(median(varp_ms), 2),
                          'kortbredd_px_median': round(median([r['kortbredd_px'] for r in rader])), 'remsa_px_median': round(median([r['remsa_px'] for r in rader]), 1)})
                if kalla == 'mes246':
                    s['unika'] = unika(rader)
                ut['tabell'].append(s)
                print(f"{kalla:8} res {res:5}: {s['ratt']}/{s['remsor']} rätt, säkra rätt {s['sakra_ratt']}, SÄKRA FEL {s['sakra_fel']}, "
                      f"högkort {s['hogkort_ratt']}/{s['hogkort']} (säkra fel {s['hogkort_sakra_fel']}), marginal rätt {s['marginal_ratt_median']}, "
                      f"fel max {s['marginal_fel_max']} → nollfel säkra {s['nollfel_sakra']}, remsa {s['remsa_px_median']} px, {s['ms_modell']} ms/remsa"
                      + (f", unika lägen {s['unika']['ratt_alla']}/{s['unika']['lagen']} (flertal {s['unika']['ratt_flertal']})" if 'unika' in s else ''))
                if a.ark:
                    mapp = os.path.join(ARK, f'{a.namn}-{andel:.2f}-{kalla}-{res}'); os.makedirs(mapp, exist_ok=True)
                    for i, r in enumerate(rader):
                        if not r['ratt'] or (i % 10 == 0):
                            fn = f"{'FEL' if not r['ratt'] else 'ratt'}{'-SAKER' if r['saker'] else ''}-{r['bild']}-{r['facit']}-som-{r['namn']}-m{r['marginal']:.3f}.png".replace('/', '_').replace("'", '')
                            cv2.imwrite(os.path.join(mapp, fn), r['_strip'])
                for r in rader:
                    r.pop('_strip', None)
                ut['rader'][f'{andel:.2f}|{kalla}|{res}'] = rader
    fil = os.path.join(UT, f'{a.namn}.json')
    json.dump(ut, open(fil, 'w'), ensure_ascii=False, indent=1)
    print('\n| Källa | Andel | Upplösning | Remsor | Rätt | Säkra rätt | Säkra fel | Högkort rätt | Högkort säkra fel | Marginal (median, rätt) | Nollfel: tröskel → säkra | Remsa px | ms/remsa |')
    print('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
    for s in ut['tabell']:
        print(f"| {s['kalla']} | {s['andel']:.2f} | {s['res']} | {s['remsor']} | {s['ratt']} ({100 * s['ratt'] / max(1, s['remsor']):.0f} %) | {s['sakra_ratt']} | **{s['sakra_fel']}** | "
              f"{s['hogkort_ratt']}/{s['hogkort']} | {s['hogkort_sakra_fel']} | {s['marginal_ratt_median']} | {s['nollfel_troskel']} → {s['nollfel_sakra']} | {s['remsa_px_median']} | {s['ms_modell']} |")
    print('sparat', os.path.relpath(fil, ROT))


if __name__ == '__main__':
    main()

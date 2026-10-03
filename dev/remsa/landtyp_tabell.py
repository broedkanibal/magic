#!/usr/bin/env python3
"""Tabellerna ur dev/remsa/resultat/landtyp.json (landtyp.py) — skrivs aldrig för hand.

    ~/.mesa/detektor-venv/bin/python dev/remsa/landtyp_tabell.py [fil] [--pool lek] [--rader] [--fel]
"""
import argparse, json, os
HAR = os.path.dirname(os.path.abspath(__file__))


def f2(x):
    return f'{x:.2f}'.replace('.', ',')


def main():
    p = argparse.ArgumentParser()
    p.add_argument('fil', nargs='?', default=os.path.join(HAR, 'resultat', 'landtyp.json'))
    p.add_argument('--pool', default='lek')
    p.add_argument('--rader', action='store_true', help='golden rad för rad')
    p.add_argument('--fel', action='store_true', help='lista varje säkert fel vid t = 0,20 och nollfelet')
    a = p.parse_args()
    j = json.load(open(a.fil, encoding='utf-8'))
    S, R = j['summering'], j['rader']
    pool = a.pool
    delar = ['golden täckta', 'golden hela', 'mes246 täckta', 'mes246 hela']
    print(f'pool: {pool} — {j["pool"][pool]}\n')
    for res in ('960', 'orig'):
        print(f'### {res}\n')
        print('| utsnitt · metod | nollfel-tröskel | ' + ' | '.join(f'{d}: överst · säkra vid nollfel · vid 0,20 (rätt/fel)' for d in delar) + ' |')
        print('|---|---|' + '---|' * len(delar))
        for cut in ('ruta', 'synlig'):
            for metod in ('A', 'A+B_lab', 'A+B_abgv', 'B_lab', 'B_abgv'):
                s = S.get(f'{res}|{cut}|{pool}|{metod}')
                if not s: continue
                nf = s['nollfel']
                cells = []
                for d in delar:
                    x = s[d]
                    v = x['svep'].get('0.2', ['-', '-'])
                    cells.append(f"{x['overst']}/{x['n']} · **{x['sakra_vid_nollfel']}** · {v[0]}/{v[1]}")
                print(f"| {cut} · {metod} | {f2(nf) if metod.startswith('A') else nf} | " + ' | '.join(cells) + ' |')
        s = S[f'{res}|remsa|{pool}']
        cells = [f"{s[d]['overst']}/{s[d]['n']} · **{s[d]['sakra_ratt']}** · fel {s[d]['sakra_fel']}" for d in delar]
        print(f"| remsa 0,14 ur hörnen, appens dom | (0,20 / titel 0,20) | " + ' | '.join(cells) + ' |')
        cells = [f"{s[d]['detektorremsa']['n']} parade · **{s[d]['detektorremsa']['sakra_ratt']}** · fel {s[d]['detektorremsa']['sakra_fel']}" for d in delar]
        print(f"| detektorns remsa (v55), marginal > 0,20 | | " + ' | '.join(cells) + ' |')
        print()
        # MES-246: samma kort på samma plats i flera rutor = ett kortläge
        for cut in ('ruta', 'synlig'):
            nf = S[f'{res}|{cut}|{pool}|A']['nollfel']
            for tackt in (True, False):
                d = [r for r in R if r['res'] == res and r['kalla'] == 'mes246' and r['tackt'] == tackt]
                alla = {r['lage'] for r in d}
                sak = {r['lage'] for r in d if r[f'{cut}|{pool}']['A']['namn'] == r['facit'] and r[f'{cut}|{pool}']['A']['marginal'] > nf}
                rem = {r['lage'] for r in d if r[f'remsa|{pool}']['saker'] and r[f'remsa|{pool}']['ratt']}
                print(f"MES-246 {'täckta' if tackt else 'hela'} {cut} A: unika kortlägen säkra vid nollfel {len(sak)}/{len(alla)} (remsan ur hörnen {len(rem)}/{len(alla)})")
        print()
        # svepet för A på synlig och ruta, täckta, båda källorna ihop
        print(f'svep A (täckta, golden+mes246, {res}): t → säkra rätt/säkra fel')
        for cut in ('ruta', 'synlig'):
            s = S[f'{res}|{cut}|{pool}|A']
            rad = []
            for t in j['svep'][::5] + [0.3]:
                g = s['golden täckta']['svep'][str(t)]; m = s['mes246 täckta']['svep'][str(t)]
                rad.append(f"{f2(t)}: {g[0] + m[0]}/{g[1] + m[1]}")
            print(f'  {cut}: ' + ' · '.join(dict.fromkeys(rad)))
        print()

    # Extra: grind på den synliga delen (bedömt: appen ser den synliga lådans storlek), A + B som vittne,
    # och unionen remsa ∪ A — vad A LÄGGER TILL utöver remsan, med 0 säkra fel
    print('### extra: grind, vittne och union (täckta kort; säkra rätt vid nollfel över alla rader i grinden)\n')
    print('| res | utsnitt · metod | grind | nollfel | golden täckta | MES-246 täckta (rader · unika lägen) | golden hela | remsa ∪ metod: golden täckta | remsa ∪ metod: MES-246 täckta (unika) |')
    print('|---|---|---|---|---|---|---|---|---|')

    def mv(r, nyckel, metod):
        x = r[nyckel]
        if '+' not in metod:
            return x[metod]['namn'], x[metod]['marginal']
        b = x[metod.split('+')[1]]
        return x['A']['namn'], (x['A']['marginal'] if b['namn'] == x['A']['namn'] else -1.0)

    for res in ('960', 'orig'):
        for cut in ('ruta', 'synlig'):
            for metod in ('A', 'A+B_lab'):
                for grind in (0.0, 0.10):
                    nyckel = f'{cut}|{pool}'
                    rr = [r for r in R if r['res'] == res and r['synlig'] >= grind]
                    fel = [mv(r, nyckel, metod)[1] for r in rr if mv(r, nyckel, metod)[0] != r['facit']]
                    nf = max([0.0] + fel)
                    sak = lambda r: mv(r, nyckel, metod)[0] == r['facit'] and mv(r, nyckel, metod)[1] > nf
                    rem = lambda r: r[f'remsa|{pool}']['saker'] and r[f'remsa|{pool}']['ratt']
                    gt = [r for r in rr if r['kalla'] == 'golden' and r['tackt']]
                    gh = [r for r in rr if r['kalla'] == 'golden' and not r['tackt']]
                    mt = [r for r in rr if r['kalla'] == 'mes246' and r['tackt']]
                    ul = lambda d, f: len({r['lage'] for r in d if f(r)})
                    print(f"| {res} | {cut} · {metod} | {'synlig ≥ 0,10' if grind else '–'} | {f2(nf)} | {sum(map(sak, gt))}/{len(gt)} | "
                          f"{sum(map(sak, mt))}/{len(mt)} · {ul(mt, sak)}/{ul(mt, lambda r: True)} | {sum(map(sak, gh))}/{len(gh)} | "
                          f"{sum(1 for r in gt if sak(r) or rem(r))} (remsan ensam {sum(map(rem, gt))}) | "
                          f"{ul(mt, lambda r: sak(r) or rem(r))} (remsan ensam {ul(mt, rem)}) |")
    print()

    if a.rader:
        print('### golden rad för rad (A, pool ' + pool + ')\n')
        print('| fall | kort | synlig | hög | ficka | res | synlig px | A ruta (namn, marginal) | A synlig | remsa hörn (hel/titel) | detektorremsa |')
        print('|---|---|---|---|---|---|---|---|---|---|---|')
        for r in R:
            if r['kalla'] != 'golden': continue
            ru, sy, re_ = r[f'ruta|{pool}']['A'], r[f'synlig|{pool}']['A'], r[f'remsa|{pool}']
            d = r.get('detektorremsa')
            dtxt = f"{d['namn']} {f2(d['marginal'])}" if d else '–'
            print(f"| {r['bild'][:2]} | {r['facit']} #{r['kort_id']} | {f2(r['synlig'])} | {r['hog'] or '–'} | {r['ficka']} | {r['res']} | {r['synlig_px']:.0f} | "
                  f"{ru['namn']} {f2(ru['marginal'])} | {sy['namn']} {f2(sy['marginal'])} | {re_['hel']['namn']} {f2(re_['hel']['marginal'])}/{f2(re_['titel']['marginal'])}{' säker' if re_['saker'] else ''} | {dtxt} |")
        print()
    if a.fel:
        for res in ('960', 'orig'):
            for cut in ('ruta', 'synlig'):
                nf = S[f'{res}|{cut}|{pool}|A']['nollfel']
                fel = sorted([r for r in R if r['res'] == res and r[f'{cut}|{pool}']['A']['namn'] != r['facit'] and r[f'{cut}|{pool}']['A']['marginal'] > 0.10],
                             key=lambda r: -r[f'{cut}|{pool}']['A']['marginal'])
                print(f'#### fel med marginal > 0,10 — {res} {cut} (nollfel {f2(nf)}): {len(fel)}')
                for r in fel[:40]:
                    x = r[f'{cut}|{pool}']['A']
                    print(f"  {r['kalla']} {r['bild']} {r['facit']}#{r['kort_id']} syn {f2(r['synlig'])} {'täckt' if r['tackt'] else 'hel'} hand {r['hand']} "
                          f"{'dold ' if r['dold'] else ''}{'grav_under ' if r.get('grav_under') else ''}px {r['synlig_px']:.0f} → {x['namn']} {f2(x['marginal'])} (näst {x['nast']})")
                print()


if __name__ == '__main__':
    main()

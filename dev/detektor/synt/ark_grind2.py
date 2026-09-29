#!/usr/bin/env python3
"""MES-288 grind 2: urval av de nya syntetiska borden till kontaktarket synt/grind2.html.

Två bord per bakgrund (de tre träningsfilmerna och de nio bakgrundsklippen 2026-09-29) — ett med
hand och ett utan när det går — plus tre med ritad yta och tre extra med hand: ~30 bord.
Bilderna kopieras till dev/material/arbete/2026-09-29-mes-288-synt/ark-grind2/ med facit.js.

    python dev/detektor/synt/ark_grind2.py g2-a,g2-b,g2-c,g2-d
"""
import json, os, shutil, sys

HAR = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(os.path.dirname(os.path.dirname(HAR)))
ARB = os.path.join(ROT, 'dev', 'material', 'arbete', '2026-09-29-mes-288-synt')
UT = os.path.join(ARB, 'ark-grind2')


def main():
    mappar = sys.argv[1].split(',')
    alla = []
    for m in mappar:
        d = os.path.join(ARB, m)
        for f in sorted(os.listdir(d)):
            if f.startswith('synt-') and f.endswith('.json'):
                j = json.load(open(os.path.join(d, f), encoding='utf-8'))
                j['_mapp'] = m
                alla.append(j)
    grupper = {}
    for j in alla:
        b = j['bakgrund']
        g = b.get('kalla') if b['typ'] == 'riktig' else 'ritad'
        grupper.setdefault(g, []).append(j)
    val = []
    for g in sorted(grupper):
        lista = [j for j in grupper[g] if j['scen'] not in ('tomt bord',)]
        med = [j for j in lista if 'hand' in j['efter'] and sum(k['far_lada'] for k in j['kort']) >= 6]
        utan = [j for j in lista if 'hand' not in j['efter'] and sum(k['far_lada'] for k in j['kort']) >= 8]
        n = 3 if g == 'ritad' else 2
        tagna = (med[:1] + utan[:n - 1]) if med else utan[:n]
        val += tagna
    extra = [j for j in alla if 'hand' in j['efter'] and j not in val and any(k.get('hand', 0) > 0.45 for k in j['kort'])]
    val += extra[:3]
    os.makedirs(UT, exist_ok=True)
    for j in val:
        shutil.copy(os.path.join(ARB, j['_mapp'], j['bild']), os.path.join(UT, j['bild']))
    ut = [{k: v for k, v in j.items() if k != '_mapp'} for j in val]
    with open(os.path.join(UT, 'facit.js'), 'w', encoding='utf-8') as f:
        f.write('/* urval av grind 2:s syntetiska bord — dev/detektor/synt/ark_grind2.py */\nwindow.SYNT = ' + json.dumps(ut, ensure_ascii=False) + ';\n')
    print(f'{len(val)} bord av {len(alla)} i {len(grupper)} bakgrundsgrupper → {UT}')
    for g in sorted(grupper):
        print(f'  {len(grupper[g]):5d} bord  {os.path.basename(g)}')


if __name__ == '__main__':
    main()

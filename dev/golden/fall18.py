#!/usr/bin/env python3
"""Prompt A (2026-10-07) fråga 2: fall 18 i flera körningar sida vid sida — totaler, fördröjning per utspel och per facitkort.
python3 dev/golden/fall18.py NAMN=fil.json [NAMN=fil.json …]"""
import json, sys, glob, os
korn = []
for a in sys.argv[1:]:
    namn, fil = a.split('=', 1)
    j = json.load(open(fil))
    f = next(x for x in j if x['id'].startswith('18'))
    korn.append((namn, f))
print('| | ' + ' | '.join(n for n, _ in korn) + ' |')
print('|---|' + '---|' * len(korn))
rader = [
    ('videon', lambda f: (f.get('videoErsatt') or 'video.mp4 (1920×1080, 1500k)').split('/')[-1] + (f" ({f.get('kallStorlek')})" if f.get('kallStorlek') else '')),
    ('hittade', lambda f: f.get('hittade')), ('rätt namn', lambda f: f"{f.get('namn')}/{f.get('kort')}"),
    ('fel namn (slut · under förloppet)', lambda f: f"{f.get('felNamn')} · {f.get('videoFelUnder')}"),
    ('falska (+token)', lambda f: f"{f.get('falska')} (+{f.get('tokens')})"),
    ('utlagda med namn', lambda f: f"{f.get('videoLagda')}/{f.get('videoLagdaAv')}"),
    ('ordning', lambda f: f"{f.get('videoOrdning')}/{f.get('videoOrdningAv')}"),
    ('fördröjning till namn, median (med beräkningstid)', lambda f: f"{f.get('videoFordrojning')} s ({f.get('videoFordrojningB')} s)"),
    ('högar', lambda f: f"{f.get('hogRatt')}/{f.get('hogAv')}, ordning {f.get('hogOrdning')}, fel {f.get('hogFel')}"),
    ('land per typ', lambda f: f"{f.get('landRatt')}/{f.get('landAv')}, {f.get('landOver')} för många"),
    ('tap sedda', lambda f: f"{f.get('videoTapp')}/{f.get('videoTappAv')}, falska flippar {f.get('videoTappFalska')}"),
    ('dubbletter', lambda f: f.get('videoDubbletter')),
    ('plats', lambda f: f"{f.get('plats')}/{f.get('platsAv')}"),
    ('ms per ruta (median)', lambda f: f.get('ms')), ('verklig tid', lambda f: f"{round((f.get('videoVerkligMs') or 0) / 1000)} s, {f.get('videoVerkligRutor')} rutor"),
    ('domskäl', lambda f: ' · '.join(f"{k} {n}" for k, n in sorted((f.get('varforRatt') or {}).items(), key=lambda x: -x[1])) if isinstance(f.get('varforRatt'), dict) else f.get('varforRatt')),
]
for rub, fn in rader:
    print(f'| {rub} | ' + ' | '.join(str(fn(f)) for _, f in korn) + ' |')
print('\n**Fördröjning per utspel** (sekunder från att kortet läggs tills säkert rätt namn; – = aldrig):')
print('| t | kort | ' + ' | '.join(n for n, _ in korn) + ' |')
print('|---|---|' + '---|' * len(korn))
h0 = korn[0][1].get('videoHandelser') or []
for h in h0:
    celler = []
    for _, f in korn:
        x = next((q for q in (f.get('videoHandelser') or []) if q.get('t') == h.get('t')), None)
        d = (x or {}).get('dt')
        celler.append('–' if d is None else f'{d} s')
    print(f"| {h.get('t')} | {h.get('spelar')} | " + ' | '.join(celler) + ' |')
print('\n**Per facitkort** (säkert rätt = ✓ med domskäl, rätt överst osäkert = (✓), annat = namnet?, – = inget spår; facit i facit.json:s ordning, dubbla namn paras i ordning):')
print('| kort | ' + ' | '.join(n for n, _ in korn) + ' |')
print('|---|' + '---|' * len(korn))
fac = json.load(open(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fall', '18*', 'facit.json'))[0]))
facit = [(k['namn'], k.get('hog'), k.get('synlig', 1)) for k in fac['kort'] if not k.get('dold')]
sedda = {n: [] for n, _ in korn}
for namn, hog, syn in facit:
    celler = []
    for n, f in korn:
        tr = [t for t in f['traffar'] if not t.get('dold') and t['facit'] == namn and id(t) not in sedda[n]]
        t = tr[0] if tr else None
        if not t:
            celler.append('–'); continue
        sedda[n].append(id(t))
        s = next((q for q in f['spar'] if q['id'] == t['spar']), {})
        nm = t.get('namn') or s.get('namn') or '–'
        celler.append('✓ ' + (s.get('varfor') or '') if t.get('saker') and nm == namn else ('(✓)' if nm == namn else nm[:16] + '?'))
    print(f"| {namn}{(' ' + hog) if hog else ''} {syn} | " + ' | '.join(celler) + ' |')

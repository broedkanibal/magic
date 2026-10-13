"""Hela kortets marginal för flera bildmodeller på dev/embed/riktiga (61 golden-beskärningar), med embed.js recept
(lib.Referenser = byggLek + centrera; frågan utan beskärningens 8 %-marginal, som kalibrering.py).

    ~/.mesa/detektor-venv/bin/python dev/remsa/helkort_jamfor.py dev/embed/modeller/mobileclip-s0-vision.onnx dev/embed/modeller/mobileclip-s0-mesa-pilot1.onnx
    ~/.mesa/detektor-venv/bin/python dev/remsa/helkort_jamfor.py --bank dev/remsa/rapportbank dev/embed/modeller/mobileclip-s0-vision.onnx

--bank <mapp>: en annan bänk i samma format (manifest.json med fil, namn, skymd, helbild), t.ex.
dev/remsa/rapportbank — spelarnas tysta rättelser som dev/rapport/till-fall.cjs --bank lägger dit (MES-368).
En liten bänk (högst 10 fall) skriver varje fall med sin rapportkod.

2026-10-05: gamla 53/61 rätt överst, pilot1 50/61 (nav: Night's Whisper, 6 av 11 fel).
"""
import json, os, sys
import cv2
HAR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HAR)
from lib import Bildmodell, Referenser, las_referensbilder, kvadrat, dom, ROT  # noqa: E402
from kalibrering import utan_marginal, RIKTIGA  # noqa: E402

argv = sys.argv[1:]
if '--bank' in argv:
    i = argv.index('--bank')
    if i + 1 >= len(argv) or argv[i + 1].startswith('--'):
        sys.exit('helkort_jamfor.py: --bank kräver en mapp (t.ex. --bank dev/remsa/rapportbank)')
    RIKTIGA = argv[i + 1] if os.path.isabs(argv[i + 1]) else os.path.join(ROT, argv[i + 1])
    del argv[i:i + 2]
man = json.load(open(os.path.join(RIKTIGA, 'manifest.json'), encoding='utf-8'))
bilder = las_referensbilder()
for fil in argv:
    fil = fil if os.path.isabs(fil) else os.path.join(ROT, fil)
    m = Bildmodell(fil); refs = Referenser(m, bilder); rad = []
    for p in man:
        q = m.kor([kvadrat(cv2.cvtColor(utan_marginal(cv2.imread(os.path.join(RIKTIGA, p['fil']))), cv2.COLOR_BGR2RGB))])[0]
        d = dom(refs.rangordna(q), p['namn'])
        d.update({'fil': p['fil'], 'facit': p['namn'], 'skymd': p.get('skymd', False), 'helbild': p.get('helbild', False), 'kod': p.get('kod')})
        rad.append(d)
    fel = sorted([r for r in rad if not r['ratt']], key=lambda r: -r['marginal'])
    print(f"\n== {os.path.basename(fil)}: {sum(r['ratt'] for r in rad)}/{len(rad)} rätt överst")
    if len(rad) <= 10:
        for r in rad:
            print(f"   {'rätt' if r['ratt'] else 'FEL '} {r['marginal']:.3f}  {(r['kod'] or r['fil'])[:14]:14} facit {r['facit'][:24]:24} → {r['namn'][:24]}")
    for r in fel[:6]:
        print(f"   fel {r['marginal']:.3f}  {r['fil']:14} {r['facit'][:24]:24} → {r['namn'][:24]}{' (skymd)' if r['skymd'] else ''}{' (helbild)' if r['helbild'] else ''}")
    for th in (0.06, 0.08, 0.11, 0.13, 0.15, 0.20):
        print(f"   marginal > {th:.2f}: säkra rätt {sum(r['ratt'] and r['marginal'] > th for r in rad)}, säkra fel {sum((not r['ratt']) and r['marginal'] > th for r in rad)}")

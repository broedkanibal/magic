"""Hela kortets marginal för flera bildmodeller på dev/embed/riktiga (61 golden-beskärningar), med embed.js recept
(lib.Referenser = byggLek + centrera; frågan utan beskärningens 8 %-marginal, som kalibrering.py).

    ~/.mesa/detektor-venv/bin/python dev/remsa/helkort_jamfor.py dev/embed/modeller/mobileclip-s0-vision.onnx dev/embed/modeller/mobileclip-s0-mesa-pilot1.onnx

2026-10-05: gamla 53/61 rätt överst, pilot1 50/61 (nav: Night's Whisper, 6 av 11 fel).
"""
import json, os, sys
import cv2
HAR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HAR)
from lib import Bildmodell, Referenser, las_referensbilder, kvadrat, dom, ROT  # noqa: E402
from kalibrering import utan_marginal, RIKTIGA  # noqa: E402

man = json.load(open(os.path.join(RIKTIGA, 'manifest.json'), encoding='utf-8'))
bilder = las_referensbilder()
for fil in sys.argv[1:]:
    fil = fil if os.path.isabs(fil) else os.path.join(ROT, fil)
    m = Bildmodell(fil); refs = Referenser(m, bilder); rad = []
    for p in man:
        q = m.kor([kvadrat(cv2.cvtColor(utan_marginal(cv2.imread(os.path.join(RIKTIGA, p['fil']))), cv2.COLOR_BGR2RGB))])[0]
        d = dom(refs.rangordna(q), p['namn']); d.update({'fil': p['fil'], 'facit': p['namn'], 'skymd': p['skymd'], 'helbild': p['helbild']}); rad.append(d)
    fel = sorted([r for r in rad if not r['ratt']], key=lambda r: -r['marginal'])
    print(f"\n== {os.path.basename(fil)}: {sum(r['ratt'] for r in rad)}/{len(rad)} rätt överst")
    for r in fel[:6]:
        print(f"   fel {r['marginal']:.3f}  {r['fil']:14} {r['facit'][:24]:24} → {r['namn'][:24]}{' (skymd)' if r['skymd'] else ''}{' (helbild)' if r['helbild'] else ''}")
    for th in (0.06, 0.08, 0.11, 0.13, 0.15, 0.20):
        print(f"   marginal > {th:.2f}: säkra rätt {sum(r['ratt'] and r['marginal'] > th for r in rad)}, säkra fel {sum((not r['ratt']) and r['marginal'] > th for r in rad)}")

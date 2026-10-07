"""(2026-10-07, MES-340) Per kort i en golden-körning: facit → namn (säkert?) och spårets domskäl. python3 kortdom.py A.json [B.json] — med två filer visas bara kort där något skiljer."""
import json, sys
def las(fil):
    ut = {}
    for f in json.load(open(fil)):
        fid = f['id'][:2]
        spar = {s['id']: s for s in f.get('spar', [])}
        for i, t in enumerate(f.get('traffar', [])):
            if t.get('dold'): continue
            s = spar.get(t.get('spar'))
            namn = t.get('namn') or (s or {}).get('namn') or '–'
            saker = bool(t.get('saker'))
            varfor = (s or {}).get('varfor') or '–'
            remsa = (s or {}).get('remsa')
            rtxt = ''
            if isinstance(remsa, dict) and remsa.get('namn'): rtxt = f" remsa:{remsa['namn'][:18]} {remsa.get('m', remsa.get('marg', ''))}"
            elif isinstance(remsa, (int, float)): rtxt = f" remsa:{remsa}"
            ratt = saker and namn == t['facit']
            fel = saker and namn != t['facit']
            ut[(fid, i, t['facit'])] = (('RÄTT' if ratt else 'FEL' if fel else 'osäker') + f" {namn[:22]} [{varfor}]{rtxt}")
    return ut
a = las(sys.argv[1]); b = las(sys.argv[2]) if len(sys.argv) > 2 else None
for k in sorted(a):
    if b is None: print(f"{k[0]} {k[2][:26]:26} {a[k]}")
    elif a[k] != b.get(k): print(f"{k[0]} {k[2][:26]:26} A: {a[k]:60} B: {b.get(k, '–')}")
if b:
    for k in sorted(set(b) - set(a)): print(f"{k[0]} {k[2][:26]:26} A: –{'':59} B: {b[k]}")

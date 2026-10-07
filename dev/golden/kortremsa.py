#!/usr/bin/env python3
"""Per facitkort i en golden-json (fallen 13/14/17/18 om inget annat): spåret, namnet, domskälet och vad REMSAN gav
(namn, marginal, syntetisk?, titeldelen) — så att de 19 kan sorteras på vad som faktiskt hände i appen.
python3 dev/golden/kortremsa.py <json> [fallprefix,…]"""
import json, sys
fil = sys.argv[1]; fallen = (sys.argv[2] if len(sys.argv) > 2 else '13,14,17,18').split(',')
for f in json.load(open(fil)):
    fid = f['id'][:2]
    if fid not in fallen: continue
    spar = {s['id']: s for s in f.get('spar', [])}
    print(f"\n== {f['id']}  (hittade {f.get('hittade')}, rätt {f.get('namn')}, fel {f.get('felNamn')})")
    print('| facit | spår | namn | säkert | domskäl | remsa: namn marg | synt | titel | maskad/skymd | px |')
    print('|---|---|---|---|---|---|---|---|---|---|')
    for t in f.get('traffar', []):
        if t.get('dold'): continue
        s = spar.get(t.get('spar'))
        if not s:
            print(f"| {t['facit']} | – | | | | | | | | |"); continue
        r = s.get('remsa') if isinstance(s.get('remsa'), dict) else None
        rt = f"{r['namn']} {r.get('marginal', 0):.3f} [{r.get('varfor', '')}]" if r and r.get('namn') else ('–' if r is None else str(r))
        ti = r.get('titel') if r else None
        tt = f"{ti['namn'][:12]} {ti.get('marginal', 0):.2f}" if ti and ti.get('namn') else ''
        px = f"{r['px']['w']}×{r['px']['h']}" if r and r.get('px') else ''
        print(f"| {t['facit']} | {s['id']} | {s.get('namn') or '–'} | {'JA' if s.get('saker') else ''} | {s.get('varfor') or ''} | {rt} | "
              f"{'synt' if r and r.get('synt') else ''} | {tt} | {'maskad' if s.get('maskad') else ''}{' skymd' if s.get('skymd') else ''} | {px} |")
    if f.get('videoFelUnderNamn'): print('  fel under förloppet:', f['videoFelUnderNamn'])
    if f.get('tokenLista'): print('  tokens:', f['tokenLista'])

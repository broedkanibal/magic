#!/usr/bin/env python3
"""Prompt A fråga 4: tokens i poolen. Per golden-json: token-spåren i 13/17/18 (tokenLista: namn2 = spårets namn,
'?' = osäkert) och varje spår/träff som bär ett tokennamn (Rebel, Fractal, Soldier, Goblin) — säkert på ett riktigt
kort = fel namn. python3 dev/golden/tokens.py A.json [B.json …]"""
import json, sys
TOK = {'rebel', 'fractal', 'soldier', 'goblin', 'goblin // soldier'}
for fil in sys.argv[1:]:
    j = json.load(open(fil))
    print(f'== {fil.split("/")[-1]}')
    for f in j:
        fid = f['id'][:2]
        tl = f.get('tokenLista')
        if tl:
            print(f'  {fid} tokenLista: ' + ' · '.join(f"{t['namn']} → spår {t['spar']} ({t['namn2'] or 'inget namn'})" for t in tl))
        spar = {s['id']: s for s in f.get('spar', [])}
        for s in f.get('spar', []):
            n = (s.get('namn') or '').lower()
            if n in TOK:
                tr = next((t for t in f.get('traffar', []) if t.get('spar') == s['id']), None)
                print(f"  {fid} spår {s['id']}: {s['namn']} {'SÄKERT' if s.get('saker') else 'osäkert'} [{s.get('varfor')}] "
                      f"→ facit {tr['facit'] if tr else '– (inget facitkort)'}" + ('  ← FEL NAMN' if s.get('saker') and tr else ''))
        for x in f.get('videoFelUnderNamn') or []:
            if (x.get('namn') or '').lower() in TOK:
                print(f"  {fid} under förloppet: {x}")
        # kandidater: tokennamn bland de tre förslagen på ett riktigt kort
        for s in f.get('spar', []):
            c = s.get('cands') or []
            namn = [(k.get('namn') if isinstance(k, dict) else str(k)) for k in c]
            tr = next((t for t in f.get('traffar', []) if t.get('spar') == s['id']), None)
            if tr and any((nm or '').lower() in TOK for nm in namn):
                print(f"  {fid} spår {s['id']} (facit {tr['facit']}): tokennamn bland förslagen {namn}")

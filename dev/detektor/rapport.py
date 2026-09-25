#!/usr/bin/env python3
"""Tabellerna i nollprovet (MES-288 steg 0) ur resultat/*.json.

Per modell och textfråga (och "alla" = alla frågor ihop):
  1. tröskeln väljs på TROSKELFALLET (facit.TROSKELFALL, fall 03) som den
     poänggräns som ger flest egna kort minus falska; lika → den högre
     gränsen. NMS är fast: IoU 0,6, klassoberoende.
  2. de sex andra fallen bedöms med den tröskeln, orört.
  3. högbänkens 68 fall: antal detektioner i lådan mot väntat n.
  4. tid per bild: median över golden-bilderna.

Kör:  python dev/detektor/rapport.py [--fil resultat/owlv2.json …] [--per-fall] [--storlek]
  --storlek  släpp bara detektioner vars yta ligger inom 0,4–1,6 × fallets
             medelkort (appen vet kortstorleken från uppstarten). Alltid
             på för mobilesam, som annars ger masker av allt."""
import argparse, glob, json, os, re, sys, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from facit import alla_fall, las_hogbank, TROSKELFALL, kortyta
from matt import bedom, nms, hogbank_bedom, summera, filtrera, NMS_IOU

HAR = os.path.dirname(os.path.abspath(__file__))
p = argparse.ArgumentParser()
p.add_argument('--fil', nargs='*')
p.add_argument('--per-fall', action='store_true')
p.add_argument('--storlek', action='store_true')
p.add_argument('--troskel', type=float, default=None, help='tvinga en tröskel i stället för att välja på tröskelfallet')
p.add_argument('--inneslut', action='store_true', help='släng lådor som till 80 %% ligger inuti en starkare låda (delar av kort)')
a = p.parse_args()

FALL = alla_fall()
MASK = {f['id']: kortyta(f) for f in FALL}
HB = las_hogbank()
TROSKLAR = [round(0.02 * i, 2) for i in range(1, 46)]

def bedom_fall(res, f, fraga, troskel, storlek, sam):
    b = res['bilder'].get(f['bild'])
    if not b: return None
    return bedom(f, filtrera(b['det'], fraga, troskel, f, storlek, sam, a.inneslut), mask=MASK[f['id']])

def valj_troskel(res, fraga, storlek, sam):
    if a.troskel is not None: return a.troskel
    f = next(x for x in FALL if x['kort_id'] == TROSKELFALL)
    bast = (-99, 0)
    for t in TROSKLAR:
        r = bedom_fall(res, f, fraga, t, storlek, sam)
        if r is None: return None
        v = r['eget'] - r['falsk']
        if v >= bast[0]: bast = (v, t)
    return bast[1]

def hogbank_rad(res, fraga, troskel, storlek, sam):
    typer = {}
    for h in HB:
        b = res['bilder'].get(h['bild'])
        if not b or h['n'] is None: continue
        f = next((x for x in FALL if x['bild'] == h['bild']), None)
        dets = filtrera(b['det'], fraga, troskel, f, storlek and f is not None, sam, a.inneslut)
        n = hogbank_bedom(h, dets)
        t = typer.setdefault(h['typ'], [0, 0])
        t[1] += 1
        if n == h['n']: t[0] += 1
    return ' · '.join(f'{k} {v[0]}/{v[1]}' for k, v in sorted(typer.items())) if typer else '–'

filer = a.fil or sorted(glob.glob(os.path.join(HAR, 'resultat', '*.json')))
rader = []
for fil in filer:
    res = json.load(open(fil))
    sam = 'MobileSAM' in res['modell'] or 'sam' in os.path.basename(fil)
    fragor = ['alla'] + (res['fragor'] if len(res['fragor']) > 1 else [])
    if sam: fragor = ['alla']
    for fraga in fragor:
        t = valj_troskel(res, fraga, a.storlek, sam)
        if t is None: continue
        per = []
        for f in FALL:
            r = bedom_fall(res, f, fraga, t, a.storlek, sam)
            if r is None: continue
            r['fall'] = f['kort_id']; per.append(r)
        if not per: continue
        alla = summera(per); ovr = summera([r for r in per if r['fall'] != TROSKELFALL])
        ms = [b['ms'] for b in res['bilder'].values() if b.get('ms')]
        namn = f"{res['modell']} [{res.get('variant', '')}]"
        # dagens detektor har bara spår för fallbilderna, inte högbänkens 68 — den kolumnen finns i MES-250 (annat mått)
        hb = hogbank_rad(res, fraga, t, a.storlek, sam) if 'dagens' not in res['modell'] else '– (se MES-250)'
        rader.append((namn, fraga, t, alla, ovr, per, statistics.median(ms) if ms else None, hb, res['licens']))

def tal(s): return f"{s['eget']}/{s['kort']}"
print(f"\nTröskel vald på fall {TROSKELFALL}; 'sex andra' = utan det. NMS {NMS_IOU}{', inneslutningsregeln på' if a.inneslut else ''}{', storleksfilter på' if a.storlek else ''}. Kolumnerna: egna kort / synliga kort, sammanslagna, missade, falska, dubbletter, kluster; högar: egna kort av högkort, hela högar.\n")
print('| Modell | Fråga | Tröskel | Alla 7: eget | sammansl | missat | falska | dubbl | kluster | Sex andra: eget | sammansl | missat | falska | Högkort eget | Högar hela | Högbänken | ms/bild |')
print('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
for namn, fraga, t, alla, ovr, per, ms, hb, lic in rader:
    print(f"| {namn} | {fraga} | {t} | {tal(alla)} | {alla['sammanslaget']} | {alla['missat']} | {alla['falsk']} | {alla['dubblett']} | {alla['kluster']} | {tal(ovr)} | {ovr['sammanslaget']} | {ovr['missat']} | {ovr['falsk']} | {alla['hog_eget']}/{alla['hog_kort']} | {alla['hogar_hela']}/{alla['hogar']} | {hb} | {ms if ms is None else round(ms)} |")

if a.per_fall:
    for namn, fraga, t, alla, ovr, per, ms, hb, lic in rader:
        print(f"\n### {namn} — {fraga} @ {t}\n")
        print('| Fall | Kort | Eget | Sammanslaget | Missat | Falska | Dubbl | Kluster | Övriga | Dolda hittade | Högkort eget | Högar hela | Missade kort |')
        print('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
        for r in per:
            miss = ', '.join(k['namn'] + ('*' if k['dom'] == 'sammanslaget' else '') for k in r['kortdom'] if k['dom'] != 'eget')
            print(f"| {r['fall']}{' (tröskelfall)' if r['fall'] == TROSKELFALL else ''} | {r['kort']} | {r['eget']} | {r['sammanslaget']} | {r['missat']} | {r['falsk']} | {r['dubblett']} | {r['kluster']} | {r['ovrig']} | {r['dold']}/{r['dolda']} | {r['hog_eget']}/{r['hog_kort']} | {r['hogar_hela']}/{r['hogar']} | {miss} |")

#!/usr/bin/env python3
"""Tabellerna i nollprovet (MES-288 steg 0) ur resultat/*.json.

Per modell och textfråga (och "alla" = alla frågor ihop):
  1. tröskeln: troskel_val i resultatfilen om den finns (vald på träningssidans
     valideringsrutor, tran/troskel_val.py) — då räknas alla golden-fall.
     Annars väljs den på TROSKELFALLET (fall 03) som den poänggräns som ger
     flest egna kort minus falska, och fall 03 redovisas för sig ("utan 03").
     NMS är fast: IoU 0,6, klassoberoende.
  2. golden-fallen bedöms med den tröskeln, orört.
  3. högbänken (bara med --hogbank): antal detektioner i lådan mot väntat n.
     Inte ett detektormått — facit räknar namn att läsa (ett par väntar 1 kort
     fast det undre sticker fram), så den är avstängd som standard.
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
p.add_argument('--hogbank', action='store_true', help='också högbänken (namnläsningens mått, inte detektorns)')
p.add_argument('--inneslut', action='store_true', help='släng lådor som till 80 %% ligger inuti en starkare låda (delar av kort)')
a = p.parse_args()

FALL = alla_fall()
MASK = {f['id']: kortyta(f) for f in FALL}
HB = las_hogbank() if a.hogbank else []
TROSKLAR = [0.001, 0.002, 0.005, 0.01, 0.015] + [round(0.02 * i, 2) for i in range(1, 46)] + [0.91, 0.92, 0.93, 0.94, 0.95, 0.96, 0.97, 0.98, 0.985, 0.99, 0.992, 0.994, 0.996, 0.998, 0.999]
FOR_MANGA = 400   # fler lådor än så över tröskeln är ingen rimlig arbetspunkt (och NMS:en tar minuter): hoppa över

def bild_for(res, f):
    """Körningens post för fallet: golden-bilden, eller originalfotot (2×2 rutor) — lådorna är andelar, så de gäller båda."""
    b = res['bilder'].get(f['bild'])
    if b: return b
    return next((v for v in res['bilder'].values() if str(v.get('id', '')).startswith(f['id'])), None)

def bedom_fall(res, f, fraga, troskel, storlek, sam):
    b = bild_for(res, f)
    if not b: return None
    return bedom(f, filtrera(b['det'], fraga, troskel, f, storlek, sam, a.inneslut), mask=MASK[f['id']])

def valj_troskel(res, fraga, storlek, sam):
    if a.troskel is not None: return a.troskel
    if res.get('troskel_val') is not None and fraga == 'alla': return res['troskel_val']
    f = next(x for x in FALL if x['kort_id'] == TROSKELFALL)
    bast = (-9999, None)
    b = bild_for(res, f)
    if not b: return None
    for t in TROSKLAR:
        if sum(1 for d in b['det'] if d[4] >= t and (fraga == 'alla' or d[5] == fraga)) > FOR_MANGA: continue
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
        kalla = 'given' if a.troskel is not None else 'val' if res.get('troskel_val') is not None and fraga == 'alla' else '03'
        alla = summera(per); ovr = summera([r for r in per if r['fall'] != TROSKELFALL]) if kalla == '03' else None
        ms = [b['ms'] for b in res['bilder'].values() if b.get('ms')]
        namn = f"{res['modell']} [{res.get('variant', '')}]"
        # dagens detektor har bara spår för fallbilderna, inte högbänkens 68 — den kolumnen finns i MES-250 (annat mått)
        hb = (hogbank_rad(res, fraga, t, a.storlek, sam) if 'dagens' not in res['modell'] else '– (se MES-250)') if a.hogbank else None
        rader.append((namn, fraga, t, alla, ovr, per, statistics.median(ms) if ms else None, hb, res['licens'], kalla))

def tal(s): return f"{s['eget']}/{s['kort']}"
KALLA = {'val': 'valideringen', '03': f'fall {TROSKELFALL}', 'given': '--troskel'}
nf = len(FALL)
print(f"\n{nf} golden-fall ({', '.join(f['kort_id'] for f in FALL)}). Tröskel: vald på valideringen (alla fall räknas) eller på fall {TROSKELFALL} (då står 'utan {TROSKELFALL}' för sig). NMS {NMS_IOU}{', inneslutningsregeln på' if a.inneslut else ''}{', storleksfilter på' if a.storlek else ''}. Kolumnerna: egna kort / synliga kort, sammanslagna, missade, falska, dubbletter, kluster; högar: egna kort av högkort, hela högar.\n")
print(f"| Modell | Fråga | Tröskel | vald på | Alla {nf}: eget | sammansl | missat | falska | dubbl | kluster | Utan {TROSKELFALL}: eget | falska | Högkort eget | Högar hela |{' Högbänken |' if a.hogbank else ''} ms/bild |")
print('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|' + ('---|' if a.hogbank else '') + '---|')
for namn, fraga, t, alla, ovr, per, ms, hb, lic, kalla in rader:
    utan = f"{tal(ovr)} | {ovr['falsk']}" if ovr else '– | –'
    print(f"| {namn} | {fraga} | {t} | {KALLA[kalla]} | {tal(alla)} | {alla['sammanslaget']} | {alla['missat']} | {alla['falsk']} | {alla['dubblett']} | {alla['kluster']} | {utan} | {alla['hog_eget']}/{alla['hog_kort']} | {alla['hogar_hela']}/{alla['hogar']} |{f' {hb} |' if a.hogbank else ''} {ms if ms is None else round(ms)} |")

if a.per_fall:
    for namn, fraga, t, alla, ovr, per, ms, hb, lic, kalla in rader:
        print(f"\n### {namn} — {fraga} @ {t} (vald på {KALLA[kalla]})\n")
        print('| Fall | Kort | Eget | Sammanslaget | Missat | Falska | Dubbl | Kluster | Övriga | Dolda hittade | Högkort eget | Högar hela | Missade kort |')
        print('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
        for r in per:
            miss = ', '.join(k['namn'] + ('*' if k['dom'] == 'sammanslaget' else '') for k in r['kortdom'] if k['dom'] != 'eget')
            print(f"| {r['fall']}{' (tröskelfall)' if r['fall'] == TROSKELFALL and kalla == '03' else ''} | {r['kort']} | {r['eget']} | {r['sammanslaget']} | {r['missat']} | {r['falsk']} | {r['dubblett']} | {r['kluster']} | {r['ovrig']} | {r['dold']}/{r['dolda']} | {r['hog_eget']}/{r['hog_kort']} | {r['hogar_hela']}/{r['hogar']} | {miss} |")

"""Lärarmätningen (MES-288): hur ofta missar läraren (OWLv2) synliga kort i
Jespers träningsfilmer? Jämför Jespers ritade kort (ritverktyget, gruppen
"Lärarmätning" i dev/golden/rita-kallor.json) med lärarens facit för exakt
samma ruta.

    python3 dev/detektor/larare/matt_larare.py                  # alla tolv rutor; fel om någon inte är ritad
    python3 dev/detektor/larare/matt_larare.py --bara-ritade    # det som är ritat och klart (D) hittills
    python3 dev/detektor/larare/matt_larare.py --json ut.json   # också per kort och per låda, som json
    python3 dev/detektor/larare/matt_larare.py --sjalvtest      # provar måttet mot konstgjorda ritningar

Bara standardbiblioteket, numpy och Pillow (systemets python3 räcker).
Kortens geometri räknas av ritverktygets egen kod (rita-geometri.cjs, via
rakna_ritning.cjs) — synlig, hög och lådan runt den synliga delen betyder
samma sak som i golden.

Måttet. Ett synligt kort = ett ritat kort där något syns (synlig > 0).

  Per synligt kort, i den här ordningen:
    eget          en facit-låda har IoU >= 0,5 mot lådan runt kortets
                  synliga del. Girig en-till-en efter fallande IoU, som i
                  nollprovet (matt.py).
    okänt         inte eget, men >= 70 % av kortets synliga låda ligger i EN
                  ignorerad yta (regel A–F): eleven lär sig inte att det är
                  bakgrund, men inte heller att det är ett kort.
    sammanslaget  inte eget eller okänt, men >= 70 % av den synliga lådan
                  ligger i EN facit-låda — en låda över flera kort.
    missat        ingetdera: kortet är bakgrund för eleven.

  Per facit-låda:
    matchad       gav ett eget kort
    dubblett      IoU >= 0,5 mot ett kort som redan har en egen låda
    del           ligger till >= 50 % på ritade kort men matchar inget
                  (en låda över en hög, eller en del av ett kort)
    falsk         ligger till < 50 % på något ritat kort (hela kortens
                  former, också delar under andra kort)

  Grupper: framsidor efter hur mycket som syns — helt (synlig >= 0,9),
  delvis (0,3–0,9), nästan dolda (< 0,3) — och baksidor för sig (library,
  baksida: tangenten B i ritverktyget).

  Huvudsiffran: andelen HELT SYNLIGA framsidor som läraren missar, det vill
  säga varken eget eller okänt (sammanslaget + missat), och antalet falska
  facit-lådor."""
import argparse, json, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageDraw

HAR = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(os.path.dirname(os.path.dirname(HAR)))
KALLOR = os.path.join(ROT, 'dev', 'golden', 'rita-kallor.json')
RAKNA = os.path.join(HAR, 'rakna_ritning.cjs')

IOU_MIN = 0.5
TACK_MIN = 0.7      # andel av kortets synliga låda i en ignorerad yta / en facit-låda
PA_KORT_MIN = 0.5   # andel av en facit-låda på ritade kort för att inte vara falsk
HELT, DELVIS = 0.9, 0.3
MASK_B = 960        # masken för "på kort" rastreras i den här bredden
GRUPPER = ['helt', 'delvis', 'nastan_dolda', 'baksidor']
GRUPPNAMN = {'helt': 'syns helt (≥ 0,9)', 'delvis': 'delvis (0,3–0,9)', 'nastan_dolda': 'nästan dolda (< 0,3)', 'baksidor': 'baksidor'}
KORTDOMAR = ['eget', 'okant', 'sammanslaget', 'missat']
LADDOMAR = ['matchad', 'dubblett', 'del', 'falsk']


def iou(a, b):
    ix0, iy0, ix1, iy1 = max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3])
    inter = max(0.0, ix1 - ix0) * max(0.0, iy1 - iy0)
    u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / u if u > 0 else 0.0


def andel_inne(a, b):
    """Hur stor del av låda a som ligger inne i låda b."""
    ix0, iy0, ix1, iy1 = max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3])
    inter = max(0.0, ix1 - ix0) * max(0.0, iy1 - iy0)
    y = (a[2] - a[0]) * (a[3] - a[1])
    return inter / y if y > 0 else 0.0


def kortmask(kort, W, H):
    """Hela de ritade kortens former (också delar under andra kort), rastrerat."""
    b = MASK_B; h = max(1, round(b * H / W))
    im = Image.new('L', (b, h), 0); d = ImageDraw.Draw(im)
    for k in kort:
        d.polygon([(p[0] * b, p[1] * h) for p in k['horn']], fill=255)
    return np.array(im) > 0


def pa_kort(mask, lada):
    h, b = mask.shape
    x0, y0 = int(max(0, lada[0] * b)), int(max(0, lada[1] * h))
    x1, y1 = int(min(b, np.ceil(lada[2] * b))), int(min(h, np.ceil(lada[3] * h)))
    if x1 <= x0 or y1 <= y0: return 0.0
    return float(mask[y0:y1, x0:x1].mean())


def grupp(k):
    if k['baksida']: return 'baksidor'
    if k['synlig'] >= HELT: return 'helt'
    if k['synlig'] >= DELVIS: return 'delvis'
    return 'nastan_dolda'


def bedom_ruta(kort, lador, ignorera, W, H):
    """kort: ritade kort ur rakna_ritning.cjs; lador: lärarens facit-lådor
    ({'lada': [x0,y0,x1,y1], 'baksida': bool, 'poang'}); ignorera: ytor
    ({'lada', 'regel'}). Svaret: dom per kort och per låda."""
    synliga = [k for k in kort if k['synlig'] > 0 and k['synlig_lada']]
    par = []
    for ki, k in enumerate(synliga):
        for li, l in enumerate(lador):
            v = iou(k['synlig_lada'], l['lada'])
            if v >= IOU_MIN: par.append((v, ki, li))
    par.sort(reverse=True)
    kort_lada, lada_kort = {}, {}
    for v, ki, li in par:
        if ki in kort_lada or li in lada_kort: continue
        kort_lada[ki] = (li, v); lada_kort[li] = ki
    kd = []
    for ki, k in enumerate(synliga):
        s = k['synlig_lada']
        regel = None
        if ki in kort_lada: dom = 'eget'
        else:
            ign = max(ignorera, key=lambda y: andel_inne(s, y['lada']), default=None)
            if ign is not None and andel_inne(s, ign['lada']) >= TACK_MIN: dom, regel = 'okant', ign['regel']
            elif any(andel_inne(s, l['lada']) >= TACK_MIN for l in lador): dom = 'sammanslaget'
            else: dom = 'missat'
        kd.append({'id': k['id'], 'namn': k['namn'], 'grupp': grupp(k), 'synlig': k['synlig'], 'hog': k['hog'],
                   'dom': dom, 'regel': regel, 'iou': round(kort_lada[ki][1], 3) if ki in kort_lada else None,
                   'lada': [round(x, 4) for x in s]})
    mask = kortmask(kort, W, H)
    ld = []
    for li, l in enumerate(lador):
        if li in lada_kort: dom = 'matchad'
        elif any(iou(synliga[ki]['synlig_lada'], l['lada']) >= IOU_MIN for ki in kort_lada): dom = 'dubblett'
        elif pa_kort(mask, l['lada']) < PA_KORT_MIN: dom = 'falsk'
        else: dom = 'del'
        ld.append({'lada': l['lada'], 'poang': l.get('poang'), 'baksida': bool(l.get('baksida')), 'dom': dom,
                   'pa_kort': round(pa_kort(mask, l['lada']), 3)})
    return kd, ld


def rakna_om(lagen_fil):
    r = subprocess.run(['node', RAKNA, lagen_fil], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f'rakna_ritning.cjs föll för {lagen_fil}:\n{r.stderr.strip()}')
    return json.loads(r.stdout)


def las_kallor(matning=None):
    """Lärargruppen ur rita-kallor.json. matning: en annan mapp än källans
    (självtestet) — då läses <matning>/<film>/lagen.json."""
    k = json.load(open(KALLOR))
    ut = []
    for film, v in (k.get('larare') or {}).items():
        mapp = os.path.join(matning, film) if matning else os.path.join(ROT, v['mapp'])
        ut.append({'film': film, 'tider': [float(t) for t in v['tider']], 'lagen': os.path.join(mapp, 'lagen.json'),
                   'facit': os.path.join(ROT, v['facit']), 'varfor': v.get('varfor', [])})
    return ut


def mat(matning=None, bara_ritade=False):
    """Allt som mäts: per ruta, domarna. Stoppar med ett tydligt fel om en
    ruta inte är ritad och klar (om inte bara_ritade)."""
    kallor = las_kallor(matning)
    saknas, rutor = [], []
    for kl in kallor:
        ritat = None
        if os.path.exists(kl['lagen']):
            ritat = rakna_om(kl['lagen'])
        fac = json.load(open(kl['facit']))['rutor'] if os.path.exists(kl['facit']) else None
        if fac is None: sys.exit(f"lärarens facit saknas: {kl['facit']} (dev/material är gitignorerat — kör på Jespers Mac, eller symlänka dev/material)")
        per_t = {}
        if ritat:
            for l in ritat['lagen']: per_t[round(float(l['t']), 2)] = l
        for i, t in enumerate(kl['tider']):
            l = per_t.get(round(t, 2))
            if l is None: saknas.append(f"{kl['film']} {t:g} s: inte ritad" + ('' if ritat else ' (ingen lagen.json än)')); continue
            if not l['klar']: saknas.append(f"{kl['film']} {t:g} s: påbörjad men inte markerad klar (D)"); continue
            if not l['kort']: saknas.append(f"{kl['film']} {t:g} s: klar men inga kort ritade"); continue
            nyckel = f'rutor/{int(round(t * 10)):05d}.jpg'
            if nyckel not in fac: sys.exit(f"{kl['film']} {t:g} s: lärarens facit har ingen ruta {nyckel}")
            r = fac[nyckel]
            kd, ld = bedom_ruta(l['kort'], r['lador'], r.get('ignorera', []), ritat['bredd'], ritat['hojd'])
            rutor.append({'film': kl['film'], 't': t, 'varfor': kl['varfor'][i] if i < len(kl['varfor']) else '', 'kort': kd, 'lador': ld})
    if saknas and not bara_ritade:
        print('FEL: ' + str(len(saknas)) + ' rutor är inte ritade och klara än:', file=sys.stderr)
        for s in saknas: print('  · ' + s, file=sys.stderr)
        print('Rita dem i ritverktyget (Lärarmätning i listan, D när rutan är klar, Skicka till GitHub), '
              'eller kör med --bara-ritade för det som finns.', file=sys.stderr)
        sys.exit(1)
    return rutor, saknas


def summera(rutor):
    s = {g: {d: 0 for d in KORTDOMAR} for g in GRUPPER}
    lad = {d: 0 for d in LADDOMAR}
    lad_bak = {d: 0 for d in LADDOMAR}
    for r in rutor:
        for k in r['kort']: s[k['grupp']][k['dom']] += 1
        for l in r['lador']:
            lad[l['dom']] += 1
            if l['baksida']: lad_bak[l['dom']] += 1
    return s, lad, lad_bak


def pct(a, b): return f'{100 * a / b:.0f} %' if b else '–'


def skriv_tabell(rubrik, rutor):
    s, lad, lad_bak = summera(rutor)
    print(f'\n## {rubrik}  ({len(rutor)} rutor)\n')
    print('| Kort | Antal | Eget | Okänt (ignorerad yta) | Sammanslaget | Missat | Läraren missar (sammanslaget + missat) |')
    print('|---|---|---|---|---|---|---|')
    tot = {d: 0 for d in KORTDOMAR}
    for g in GRUPPER:
        n = sum(s[g].values())
        for d in KORTDOMAR: tot[d] += s[g][d]
        m = s[g]['sammanslaget'] + s[g]['missat']
        print(f"| {GRUPPNAMN[g]} | {n} | {s[g]['eget']} | {s[g]['okant']} | {s[g]['sammanslaget']} | {s[g]['missat']} | {m} ({pct(m, n)}) |")
    n = sum(tot.values()); m = tot['sammanslaget'] + tot['missat']
    print(f"| **alla** | {n} | {tot['eget']} | {tot['okant']} | {tot['sammanslaget']} | {tot['missat']} | {m} ({pct(m, n)}) |")
    nl = sum(lad.values())
    print(f"\nFacit-lådor: {nl} — matchade {lad['matchad']}, dubbletter {lad['dubblett']}, del/hög {lad['del']}, **falska {lad['falsk']}**"
          + (f" (varav med baksidesflagga: {sum(lad_bak.values())} lådor, {lad_bak['falsk']} falska)" if sum(lad_bak.values()) else ''))
    return s, lad


def rapport(rutor, saknas, json_ut=None):
    helt_alla = sum(1 for r in rutor for k in r['kort'] if k['grupp'] == 'helt')
    helt_miss = sum(1 for r in rutor for k in r['kort'] if k['grupp'] == 'helt' and k['dom'] in ('sammanslaget', 'missat'))
    falska = sum(1 for r in rutor for l in r['lador'] if l['dom'] == 'falsk')
    print('# Lärarmätningen (MES-288): läraren mot Jespers ritade kort\n')
    if saknas: print(f'**Ofullständig:** {len(saknas)} rutor inte ritade och klara än — talen gäller {len(rutor)} rutor.\n')
    print(f'**Huvudsiffran:** läraren missar **{helt_miss} av {helt_alla}** helt synliga kort ({pct(helt_miss, helt_alla)}) '
          f'— varken egen låda eller ignorerad yta. **{falska}** falska facit-lådor.')
    skriv_tabell('Totalt', rutor)
    for film in sorted(set(r['film'] for r in rutor)):
        skriv_tabell(film, [r for r in rutor if r['film'] == film])
    print('\n## Per ruta\n')
    print('| Film | Tid | Varför vald | Kort | Eget | Okänt | Samman. | Missat | Helt synliga missade | Falska lådor |')
    print('|---|---|---|---|---|---|---|---|---|---|')
    for r in rutor:
        c = {d: sum(1 for k in r['kort'] if k['dom'] == d) for d in KORTDOMAR}
        hm = sum(1 for k in r['kort'] if k['grupp'] == 'helt' and k['dom'] in ('sammanslaget', 'missat'))
        hn = sum(1 for k in r['kort'] if k['grupp'] == 'helt')
        fl = sum(1 for l in r['lador'] if l['dom'] == 'falsk')
        print(f"| {r['film'].replace('2026-09-29-traning-', '')} | {r['t']:g} s | {r['varfor']} | {len(r['kort'])} | {c['eget']} | {c['okant']} | {c['sammanslaget']} | {c['missat']} | {hm} av {hn} | {fl} |")
    missade = [(r, k) for r in rutor for k in r['kort'] if k['grupp'] == 'helt' and k['dom'] in ('sammanslaget', 'missat')]
    if missade:
        print('\n## De helt synliga kort läraren missar\n')
        for r, k in missade:
            print(f"- {r['film'].replace('2026-09-29-traning-', '')} {r['t']:g} s: kort #{k['id']}{' ' + k['namn'] if k['namn'] else ''} — {k['dom']}, låda {k['lada']}")
    if json_ut:
        json.dump({'rutor': rutor, 'saknas': saknas, 'huvud': {'helt': helt_alla, 'helt_missade': helt_miss, 'falska': falska}},
                  open(json_ut, 'w'), ensure_ascii=False, indent=1)
        print(f'\n(json: {json_ut})')
    return helt_alla, helt_miss, falska


# ── Självtestet ─────────────────────────────────────────────────────────
def horn_ur_lada(l):
    """Ett rakt kort vars form är precis lådan (hörnen medsols från övre vänstra)."""
    x0, y0, x1, y1 = l
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]


def skriv_lagen(mapp, film, lagen, W=3840, H=2160):
    os.makedirs(os.path.join(mapp, film), exist_ok=True)
    json.dump({'kalla': film, 'bredd': W, 'hojd': H, 'grund': 'v', 'lagen': lagen},
              open(os.path.join(mapp, film, 'lagen.json'), 'w'))


def sjalvtest():
    fel = 0
    def prova(namn, villkor, info=''):
        nonlocal fel
        print(('OK   ' if villkor else 'FEL  ') + namn + ('' if villkor else f'  [{info}]'))
        if not villkor: fel += 1
    W, H = 3840, 2160
    # Kortets storlek i andelar: ~300 × 420 px i 4K
    kw, kh = 300 / W, 420 / H
    def kort(id, x, y, z=1, **e):
        return dict({'id': id, 'namn': '', 'z': z, 'horn': horn_ur_lada([x, y, x + kw, y + kh])}, **e)
    # 1. Ett konstgjort läge med känt svar, geometrin räknad av rakna_ritning.cjs.
    with tempfile.TemporaryDirectory() as tmp:
        lagen_fil = os.path.join(tmp, 'x', 'lagen.json'); os.makedirs(os.path.dirname(lagen_fil))
        K = [
            kort(1, 0.05, 0.05),                     # A: egen låda
            kort(2, 0.20, 0.05),                     # B: i en ignorerad yta → okänt
            kort(3, 0.35, 0.05), kort(4, 0.35 + kw, 0.05), kort(5, 0.35 + 2 * kw, 0.05),   # C D E: en låda över alla tre → sammanslaget
            kort(6, 0.05, 0.50),                     # F: ingenting → missat
            kort(7, 0.40, 0.50, z=1), kort(8, 0.40 + kw / 2, 0.50, z=2),                 # G under H: G syns till hälften, egen låda på G:s synliga del
            kort(9, 0.70, 0.50, zon='bib', namn='library'),                               # baksida med egen låda
        ]
        json.dump({'bredd': W, 'hojd': H, 'grund': 'v', 'lagen': [{'nr': 1, 't': 1, 'klar': True, 'kort': K}]}, open(lagen_fil, 'w'))
        r = rakna_om(lagen_fil)['lagen'][0]['kort']
        per = {k['id']: k for k in r}
        prova('geometrin: G syns till hälften (synlig 0,5)', abs(per[7]['synlig'] - 0.5) < 0.02, per[7]['synlig'])
        prova('geometrin: G och H är en hög', per[7]['hog'] and per[7]['hog'] == per[8]['hog'], (per[7]['hog'], per[8]['hog']))
        prova('geometrin: library räknas som baksida', per[9]['baksida'])
        g = per[7]['synlig_lada']
        lador = [
            {'lada': per[1]['hel_lada'], 'poang': 0.4},                                   # A: egen
            {'lada': [per[1]['hel_lada'][0] + 0.002, per[1]['hel_lada'][1], per[1]['hel_lada'][2] + 0.002, per[1]['hel_lada'][3]], 'poang': 0.3},   # dubblett på A
            {'lada': [per[3]['hel_lada'][0], 0.05, per[5]['hel_lada'][2], 0.05 + kh], 'poang': 0.2},   # över C D E
            {'lada': g, 'poang': 0.4},                                                    # G:s synliga del
            {'lada': per[8]['hel_lada'], 'poang': 0.4},                                   # H
            {'lada': per[9]['hel_lada'], 'poang': 0.2, 'baksida': True},                  # baksidan
            {'lada': [0.85, 0.85, 0.85 + kw, 0.85 + kh], 'poang': 0.2},                   # på tomma bordet → falsk
            {'lada': [0.40, 0.50, 0.40 + kw / 2, 0.50 + kh / 3], 'poang': 0.2},           # en del av G → del
        ]
        ign = [{'lada': [0.19, 0.04, 0.21 + kw, 0.06 + kh], 'regel': 'F'}]
        kd, ld = bedom_ruta(r, lador, ign, W, H)
        dk = {k['id']: k for k in kd}
        vant = {1: 'eget', 2: 'okant', 3: 'sammanslaget', 4: 'sammanslaget', 5: 'sammanslaget', 6: 'missat', 7: 'eget', 8: 'eget', 9: 'eget'}
        for i, d in vant.items(): prova(f'kort {i} blir {d}', dk[i]['dom'] == d, dk[i]['dom'])
        prova('kort 2 är okänt via regel F', dk[2]['regel'] == 'F', dk[2]['regel'])
        prova('grupperna: 7 helt, 1 delvis, 1 baksida', [dk[i]['grupp'] for i in range(1, 10)] ==
              ['helt'] * 6 + ['delvis', 'helt', 'baksidor'], [dk[i]['grupp'] for i in range(1, 10)])
        prova('lådorna: matchad, dubblett, del (över tre kort), matchad ×3, falsk, del',
              [l['dom'] for l in ld] == ['matchad', 'dubblett', 'del', 'matchad', 'matchad', 'matchad', 'falsk', 'del'], [l['dom'] for l in ld])
        s, lad, _ = summera([{'kort': kd, 'lador': ld}])
        prova('summan: helt synliga 4 egna, 1 okänt, 3 sammanslagna, 1 missat', s['helt'] == {'eget': 2, 'okant': 1, 'sammanslaget': 3, 'missat': 1},
              s['helt'])
    # 2. Lärarens egna lådor ritade som kort på alla tolv rutor: varje låda
    #    ska bli sitt eget kort (utom där två lådor ligger omlott så att den
    #    undre syns mindre), och ingen låda ska vara falsk.
    with tempfile.TemporaryDirectory() as tmp:
        for kl in las_kallor():
            if not os.path.exists(kl['facit']): print(f"hoppar över {kl['film']}: lärarens facit saknas"); continue
            fac = json.load(open(kl['facit']))['rutor']
            lagen = []
            for i, t in enumerate(kl['tider']):
                r = fac[f'rutor/{int(round(t * 10)):05d}.jpg']
                # störst först = underst: små lådor (ett kort i en hög) hamnar överst och syns
                ls = sorted(r['lador'], key=lambda l: -(l['lada'][2] - l['lada'][0]) * (l['lada'][3] - l['lada'][1]))
                lagen.append({'nr': i + 1, 't': t, 'klar': True, 'kort': [
                    {'id': 100 * (i + 1) + j, 'namn': 'library' if l.get('baksida') else '', 'zon': 'bib' if l.get('baksida') else None,
                     'z': j + 1, 'horn': horn_ur_lada(l['lada'])} for j, l in enumerate(ls)]})
            skriv_lagen(tmp, kl['film'], lagen)
        rutor, saknas = mat(matning=tmp)
        prova('alla tolv rutor mäts (inget saknas)', len(rutor) == 12 and not saknas, (len(rutor), saknas))
        s, lad, _ = summera(rutor)
        tot = {d: sum(s[g][d] for g in GRUPPER) for d in KORTDOMAR}
        nl = sum(lad.values())
        prova('lärarens lådor som kort: 0 falska lådor', lad['falsk'] == 0, lad)
        prova('lärarens lådor som kort: 0 missade kort', tot['missat'] == 0, tot)
        prova('lärarens lådor som kort: helt synliga är alla egna', s['helt']['eget'] == sum(s['helt'].values()), s['helt'])
        prova('lärarens lådor som kort: minst 90 % av lådorna matchade', lad['matchad'] >= 0.9 * nl, lad)
        print(f"     ({nl} lådor: {lad}; kort: {tot}; helt synliga {sum(s['helt'].values())})")
    # 3. En ruta som inte är ritad ger ett tydligt fel.
    with tempfile.TemporaryDirectory() as tmp:
        k = las_kallor()[0]
        skriv_lagen(tmp, k['film'], [{'nr': 1, 't': k['tider'][0], 'klar': False, 'kort': [kort(1, 0.1, 0.1)]}])
        p = subprocess.run([sys.executable, __file__, '--matning', tmp], capture_output=True, text=True)
        prova('en ruta som inte är ritad ger slutkod 1 och säger vilken',
              p.returncode == 1 and 'inte markerad klar' in p.stderr and 'inte ritad' in p.stderr, p.stderr[-300:])
    print(f"\n{'alla höll' if not fel else f'{fel} föll'}.")
    return 1 if fel else 0


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--bara-ritade', action='store_true', help='mät det som är ritat och klart, även om rutor saknas')
    ap.add_argument('--json', help='skriv domarna per kort och låda hit')
    ap.add_argument('--matning', help=argparse.SUPPRESS)   # en annan mapp än källans (självtestet)
    ap.add_argument('--sjalvtest', action='store_true')
    a = ap.parse_args()
    if a.sjalvtest: sys.exit(sjalvtest())
    rutor, saknas = mat(a.matning, a.bara_ritade)
    if not rutor: sys.exit('inget ritat och klart än')
    rapport(rutor, saknas, a.json)

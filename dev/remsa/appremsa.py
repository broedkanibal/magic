#!/usr/bin/env python3
"""Prompt D steg 1.2 (2026-10-07): appens remsa ur kortets GEOMETRI mot facits exakta remsa.

I dag skär appen remsan ur detektorns axelparallella remslåda (skarRemsa: lådan + 4 % marginal, vriden
0/±90/180 efter vilken kant av kortlådan den sitter i). Den lådan är lös och tjock, och för ett kort i
vinkel rymmer den bord och grannens titel: mätt 2026-10-07 läser lådan 0,05–0,19 där den hörnexakta
remsan läser 0,3–0,6. Här byggs remsan i stället ur geometrin som appen HAR: remslådans mitt, kortets
vinkel ur KortVinkel (appens egen kod via kortvinkel_cli.cjs) och bordets kortstorlek (medianen av
detektorns kortformade lådor, som Detektor.mattUr) — en vriden rektangel 14 % av kortlängden tjock och
en kortbredd lång. Bänken mäter (1) hur detektorns remslåda ligger mot facits remsa (bias längs kortets
upp-axel, i kortlängder) och (2) bildmodellens marginal på exakt remsa · dagens låda · geometrins remsa,
med appens modell och v2, mot remsleken (Scryfall 14 %, 0/180).

  ~/.mesa/detektor-venv/bin/python dev/remsa/appremsa.py [--fall 03,04,…] [--ut <json>] [--bias <kortlängder>]

Facit = golden-fallen med ritade hörn (03–06, 13–18) i bild.jpg — den upplösning golden faktiskt ser.
"""
import argparse, json, os, subprocess, sys, tempfile, math
import cv2
import numpy as np

ROT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DET = os.path.join(ROT, 'dev', 'detektor')
sys.path[:0] = [os.path.join(ROT, 'dev', 'remsa'), DET, os.path.join(DET, 'tran')]
from lib import Bildmodell, Referenser, las_referensbilder, ref_strip, kvadrat, dom, remsa_ur_bild, varpa, REF_BREDD, REF_HOJD  # noqa: E402
from facit import las_fall  # noqa: E402
from prov import forbehandla  # noqa: E402
from prov246 import vrid_tillbaka  # noqa: E402
from remsa import remsa_poly  # noqa: E402

ONNX = os.path.join(DET, 'modell', 'yolox_nano_mesa_960x544.onnx')
PARA_CLI = os.path.join(DET, 'modell', 'para_cli.cjs')
KV_CLI = os.path.join(ROT, 'dev', 'remsa', 'kortvinkel_cli.cjs')
MODELLER = {'app': os.path.join(ROT, 'dev', 'embed', 'modeller', 'mobileclip-s0-vision.onnx'),
            'v2': os.path.join(ROT, 'dev', 'embed', 'modeller', 'mobileclip-s0-mesa-v2.onnx')}
ANDEL, TRAFF, KVOT = 0.14, 0.3, 88 / 63
PARA = {'skapa': 'inga', 'dubIou': 0.3}
FALL = ['03', '04', '05', '06', '13', '14', '15', '16', '17', '18']
LAND = {'Plains', 'Island', 'Swamp', 'Mountain', 'Forest'}
D = math.pi / 180


def iou(a, b):
    ix = max(0.0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    i = ix * iy
    u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - i
    return i / u if u > 0 else 0.0


def vinkel_ur_horn(p):
    """Facits upp-riktning i grader (0 = namnet upp, medurs, y nedåt), ur de fyra kanterna (a2/facitvinkel.py)."""
    def rikt(a, b): return math.atan2(b[1] - a[1], b[0] - a[0])
    v = [rikt(p[0], p[1]), rikt(p[3], p[2]), rikt(p[3], p[0]) + math.pi / 2, rikt(p[2], p[1]) + math.pi / 2]
    ang = math.degrees(math.atan2(sum(math.sin(a) for a in v), sum(math.cos(a) for a in v)))
    return (ang + 180) % 360 - 180   # överkantens riktning i bilden: 0 = åt höger → kortet upprätt har överkanten åt höger, dvs upp = ang


def upp_vektor(theta):
    """Enhetsvektorn från kortets mitt mot titeländen för upp-riktningen theta (KortVinkels konvention: 0 = upp, 90 = höger)."""
    return np.array([math.sin(theta * D), -math.cos(theta * D)], np.float64)


def hoger_vektor(theta):
    return np.array([math.cos(theta * D), math.sin(theta * D)], np.float64)


def fel360(a, b):
    return abs(((a - b + 180) % 360) - 180)


def poly_iou(p, q):
    """IoU mellan två konvexa fyrhörningar (bildpunkter) via cv2."""
    p = np.asarray(p, np.float32).reshape(-1, 1, 2); q = np.asarray(q, np.float32).reshape(-1, 1, 2)
    inter, _ = cv2.intersectConvexConvex(p, q)
    ap, aq = abs(cv2.contourArea(p)), abs(cv2.contourArea(q))
    u = ap + aq - inter
    return float(inter / u) if u > 0 else 0.0


def skar_detlada(img, S, B):
    """Dagens skarRemsa: remslådan S (px) + 4 % marginal, vriden vågrät efter var i kortlådan B den sitter."""
    H, W = img.shape[:2]
    sw, sh = S[2] - S[0], S[3] - S[1]
    x0, y0 = max(0, int(S[0] - 0.04 * sw)), max(0, int(S[1] - 0.04 * sh))
    x1, y1 = min(W, int(math.ceil(S[2] + 0.04 * sw))), min(H, int(math.ceil(S[3] + 0.04 * sh)))
    if x1 - x0 < 2 or y1 - y0 < 2: return None, None
    c = img[y0:y1, x0:x1]
    lodrat = sh > sw; mx, my = (S[0] + S[2]) / 2, (S[1] + S[3]) / 2
    rot = 0
    if lodrat: rot = 90 if (mx - B[0]) < (B[2] - mx) else -90
    elif (my - B[1]) > (B[3] - my): rot = 180
    if rot == 90: c = cv2.rotate(c, cv2.ROTATE_90_CLOCKWISE)
    elif rot == -90: c = cv2.rotate(c, cv2.ROTATE_90_COUNTERCLOCKWISE)
    elif rot == 180: c = cv2.rotate(c, cv2.ROTATE_180)
    return c, rot


def geo_remsa(c, theta, K, L, andel=ANDEL):
    """Remsans fyra hörn (medsols från kortets övre vänstra) för en remsa med mitten c, upp-riktning theta, kortbredd K
    och kortlängd L: tjockleken andel·L längs upp-axeln, längden K tvärs."""
    u, v = upp_vektor(theta), hoger_vektor(theta)
    t = andel * L
    return np.array([c + u * t / 2 - v * K / 2, c + u * t / 2 + v * K / 2, c - u * t / 2 + v * K / 2, c - u * t / 2 - v * K / 2], np.float32)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--fall', default=','.join(FALL))
    p.add_argument('--ut', default=os.path.join(ROT, 'dev', 'remsa', 'resultat', 'appremsa-golden.json'))
    p.add_argument('--bias', type=float, default=0.0, help='korrigering av remslådans mitt längs upp-axeln, i kortlängder (+ = lådan ligger utåt, mitten flyttas inåt)')
    p.add_argument('--troskel', type=float, default=0.28, help='remströskeln som säkra räknas mot')
    p.add_argument('--andel', type=float, default=ANDEL, help='remsans andel av kortlängden för geometrins remsa OCH referenserna (exakt och låda står kvar på 0,14)')
    p.add_argument('--extra', nargs='*', default=[], help='fall=<bild> — en extra källbild med samma inramning (t.ex. 18:s 1920-ruta ur videon, 13:s 4K-ruta); facits andelar gäller')
    a = p.parse_args()
    import onnxruntime as ort
    so = ort.SessionOptions(); so.intra_op_num_threads = 4
    sess = ort.InferenceSession(ONNX, so, providers=['CPUExecutionProvider'])
    inp = sess.get_inputs()[0]; _, _, h_in, w_in = inp.shape
    tmp = tempfile.mkdtemp(prefix='appremsa-', dir=os.environ.get('TMPDIR') or None)

    # 1. detektorn + appens parning per fall (som hogfall.py)
    bilder, fallen, kallor = [], {}, {}
    extra = {}
    for e in a.extra:
        fid, bild = e.split('=', 1); extra.setdefault(fid, []).append(bild)
    kor_lista = []
    for prefix in a.fall.split(','):
        f = las_fall(prefix)
        kor_lista.append((prefix, f, f['bild']))
        for i, bild in enumerate(extra.get(prefix, [])): kor_lista.append((f'{prefix}+{i + 1}', f, bild))
    for prefix, f, bildfil in kor_lista:
        img = cv2.imread(bildfil); kallor[prefix] = img
        staende = img.shape[0] > img.shape[1]
        det_img = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE) if staende else img
        Hd, Wd = det_img.shape[:2]
        x, r = forbehandla(det_img, h_in, w_in)
        o = sess.run(None, {inp.name: x})[0][0].astype(np.float32)
        fil = os.path.join(tmp, f'{prefix}.f32'); o.tofile(fil)
        bilder.append({'id': prefix, 'W': Wd, 'H': Hd, 'r': float(r), 'ut': fil, 'staende': staende})
        fallen[prefix] = f
    man = {'para': PARA, 'bilder': [{k: v for k, v in b.items() if k in ('id', 'W', 'H', 'r', 'ut')} for b in bilder]}
    manFil, utFil = os.path.join(tmp, 'manifest.json'), os.path.join(tmp, 'ut.json')
    json.dump(man, open(manFil, 'w'))
    subprocess.run(['node', PARA_CLI, manFil, utFil], check=True)
    ut = {u['id']: u for u in json.load(open(utFil))['bilder']}

    def andelar(lador, b):
        d = [[q['x0'] / b['W'], q['y0'] / b['H'], q['x1'] / b['W'], q['y1'] / b['H'], q.get('poang', 0), q.get('klass', 'kort')] for q in lador]
        return vrid_tillbaka(d) if b['staende'] else d

    # 2. per fall: para lådorna mot facit, mät geometrin, samla remsor att läsa
    modeller = {n: Bildmodell(fil=fil) for n, fil in MODELLER.items()}
    refbilder = las_referensbilder()
    refs = {n: Referenser(m, [(nm, i, ref_strip(im, ANDEL)) for nm, i, im in refbilder], rotar=(0, 180)) for n, m in modeller.items()}
    refsG = refs if a.andel == ANDEL else {n: Referenser(m, [(nm, i, ref_strip(im, a.andel)) for nm, i, im in refbilder], rotar=(0, 180)) for n, m in modeller.items()}
    print(f'referenser: {len(refbilder)} bilder, {len(refs["app"].namnlista)} namn', flush=True)
    rader, kv_man = [], []
    for b in bilder:
        prefix = b['id']; f = fallen[prefix]; u = ut[prefix]; img = kallor[prefix]
        H, W = img.shape[:2]
        par = []
        for q in u['par']:
            ld = andelar([q], b)[0]
            rm = None
            if q.get('remsa'):
                x0, y0, x1, y1 = q['remsa']; rm = andelar([{'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1}], b)[0]
            par.append({'lada': ld[:4], 'remsa': rm[:4] if rm else None, 'poang': q.get('poang', 0), 'klass': q.get('klass')})
        # bordets kortstorlek som Detektor.mattUr: medianen av kortformade lådor (kvot 0,6–0,85), i px
        ll, kk = [], []
        for q in par:
            w = (q['lada'][2] - q['lada'][0]) * W; h = (q['lada'][3] - q['lada'][1]) * H
            kv = min(w, h) / max(w, h)
            if 0.6 <= kv <= 0.85: ll.append(max(w, h)); kk.append(min(w, h))
        matt = (float(np.median(ll)), float(np.median(kk))) if len(ll) >= 2 else None
        synl = [k for k in f['kort'] if not k['dold']]
        # en-till-en-parning mot facit (som kor.html): synliga rutan först, sedan hela kortet
        tagna, mina = set(), {}
        for omg in ('synlig_lada', 'hel_lada'):
            kand = sorted(((iou(q['lada'], k[omg]), li, ki) for li, q in enumerate(par) if li not in tagna for ki, k in enumerate(synl) if ki not in mina), reverse=True)
            for v, li, ki in kand:
                if v < TRAFF: break
                if li in tagna or ki in mina: continue
                tagna.add(li); mina[ki] = li
        for ki, k in enumerate(synl):
            horn_px = np.array([[x * W, y * H] for x, y in k['horn']], np.float64)
            theta_f = vinkel_ur_horn(horn_px)
            uf, vf = upp_vektor(theta_f), hoger_vektor(theta_f)
            L_f = (np.linalg.norm(horn_px[3] - horn_px[0]) + np.linalg.norm(horn_px[2] - horn_px[1])) / 2
            K_f = (np.linalg.norm(horn_px[1] - horn_px[0]) + np.linalg.norm(horn_px[2] - horn_px[3])) / 2
            fpoly = remsa_poly(horn_px)      # facits remsa (14 %), px
            fc = fpoly.mean(0)
            fkant = float(((horn_px[0] + horn_px[1]) / 2 - fc) @ uf)   # avståndet mitt → titelkant längs upp (= 0,07·L)
            rad = {'fall': prefix, 'namn': k['namn'], 'hog': k.get('hog'), 'synlig': k.get('synlig', 1), 'tappad': k['tappad'], 'land': k['namn'] in LAND,
                   'theta_f': round(theta_f, 1), 'L_f': round(float(L_f), 1), 'K_f': round(float(K_f), 1), 'W': W, 'H': H,
                   'lada': None, 'remsa': None, 'matt': matt and [round(matt[0], 1), round(matt[1], 1)], 'modell': {}}
            li = mina.get(ki)
            if li is None:
                rad['dom'] = 'ingen kortlåda'; rader.append(rad); continue
            q = par[li]
            B = np.array([q['lada'][0] * W, q['lada'][1] * H, q['lada'][2] * W, q['lada'][3] * H])
            rad['lada'] = [round(float(v), 1) for v in B]
            rad['lada_iou_hel'] = round(iou(q['lada'], k['hel_lada']), 2)
            if not q['remsa']:
                rad['dom'] = 'ingen remsa'; rader.append(rad); continue
            S = np.array([q['remsa'][0] * W, q['remsa'][1] * H, q['remsa'][2] * W, q['remsa'][3] * H]); rad['delad'] = False
            rad['remsa'] = [round(float(v), 1) for v in S]
            Sc = np.array([(S[0] + S[2]) / 2, (S[1] + S[3]) / 2])
            Sh = np.array([[S[0], S[1]], [S[2], S[1]], [S[2], S[3]], [S[0], S[3]]], np.float64)
            # geometrin mot facit, i kortlängder längs facits upp-axel
            proj = (Sh - fc) @ uf
            rad['bias_mitt'] = round(float(((Sc - fc) @ uf) / L_f), 3)        # remslådans mitt mot facitremsans mitt, + = utåt (mot titelkanten)
            rad['bias_sida'] = round(float(((Sc - fc) @ vf) / K_f), 3)        # i sidled, i kortbredder
            rad['lada_ut'] = round(float((proj.max() - fkant) / L_f), 3)        # lådans yttersta hörn förbi titelkanten
            rad['lada_in'] = round(float((-proj.min() - fkant) / L_f), 3)      # lådans innersta hörn förbi remsans innerkant (0,14·L in)
            sw, sh = S[2] - S[0], S[3] - S[1]
            rad['tjock'] = round(float(min(sw, sh) / max(sw, sh)), 3)
            Bh = np.array([[B[0], B[1]], [B[2], B[1]], [B[2], B[3]], [B[0], B[3]]], np.float64)
            bproj = (Bh - fc) @ uf
            # ett vridet korts raka låda skjuter över kortets kant med (K/2)·|sin 2θ| längs upp-axeln (hörnet, inte kanten)
            over = (K_f / 2) * abs(math.sin(2 * theta_f * D))
            rad['kortlada_kant'] = round(float((bproj.max() - over - fkant) / L_f), 3)   # kortlådans titelkant mot facits, i kortlängder (+ = utanför kortet)
            rad['kortlada_helt'] = bool(rad['lada_iou_hel'] >= 0.7)
            rad['remsa_h_px'] = round(float(ANDEL * L_f), 1)
            # KortVinkel på kortlådan + 4 % marginal, långsidan 160 px, grå (som kortVinkel i index.html)
            bw, bh = B[2] - B[0], B[3] - B[1]
            x0, y0 = max(0, int(math.floor(B[0] - 0.04 * bw))), max(0, int(math.floor(B[1] - 0.04 * bh)))
            x1, y1 = min(W, int(math.ceil(B[2] + 0.04 * bw))), min(H, int(math.ceil(B[3] + 0.04 * bh)))
            s = min(1.0, 160 / max(x1 - x0, y1 - y0)); cw, ch = max(2, round((x1 - x0) * s)), max(2, round((y1 - y0) * s))
            crop = cv2.resize(img[y0:y1, x0:x1], (cw, ch), interpolation=cv2.INTER_LINEAR)
            g = (0.299 * crop[:, :, 2] + 0.587 * crop[:, :, 1] + 0.114 * crop[:, :, 0]).astype(np.float32)
            gfil = os.path.join(tmp, f'kv-{len(kv_man)}.f32'); g.tofile(gfil)
            tr = lambda q4: {'x0': (q4[0] - x0) * s, 'y0': (q4[1] - y0) * s, 'x1': (q4[2] - x0) * s, 'y1': (q4[3] - y0) * s}
            kv_man.append({'id': len(rader), 'w': cw, 'h': ch, 'gra': gfil, 'lada': tr(B), 'remsa': tr(S)})
            rad['dom'] = 'egen remsa' if not rad['delad'] else 'delad remsa'
            rader.append(rad)
    # 3. KortVinkel (appens kod) på alla lådor i ett anrop
    kvMan, kvUt = os.path.join(tmp, 'kv-man.json'), os.path.join(tmp, 'kv-ut.json')
    json.dump({'bilder': kv_man}, open(kvMan, 'w'))
    subprocess.run(['node', KV_CLI, kvMan, kvUt], check=True)
    kv = {b['id']: b['svar'] for b in json.load(open(kvUt))['bilder']}
    # 4. remsorna: exakt · dagens låda · geometrin — lästa med båda modellerna
    for i, rad in enumerate(rader):
        if rad.get('remsa') is None: continue
        f = fallen[rad['fall']]; img = kallor[rad['fall']]; W, H = rad['W'], rad['H']
        k = next(kk for kk in f['kort'] if not kk['dold'] and kk['namn'] == rad['namn'] and round((kk['horn'][0][0] * W), 1) == round(rad['K_f'] * 0 + kk['horn'][0][0] * W, 1) and kk.get('hog') == rad['hog'] and kk.get('synlig', 1) == rad['synlig'])
        horn_px = np.array([[x * W, y * H] for x, y in k['horn']], np.float64)
        B = np.array(rad['lada']); S = np.array(rad['remsa'])
        svar = kv.get(i) or {}
        rad['kv'] = {kk: (round(v, 2) if isinstance(v, float) else v) for kk, v in svar.items()} if svar else None
        theta = svar.get('vinkel') if svar else None
        if theta is not None: rad['vinkelfel'] = round(fel360(theta, rad['theta_f']), 1)
        fragor = {'exakt': kvadrat(cv2.cvtColor(remsa_ur_bild(img, horn_px, ANDEL), cv2.COLOR_BGR2RGB))}
        c, rot = skar_detlada(img, S, B)
        if c is not None: fragor['lada'] = kvadrat(cv2.cvtColor(c, cv2.COLOR_BGR2RGB)); rad['lada_rot'] = rot
        if theta is not None and rad['matt']:
            L_t, K_t = rad['matt']
            u, v = upp_vektor(theta), hoger_vektor(theta)
            fpoly = remsa_poly(horn_px)
            hh = max(1, int(round(REF_BREDD * (REF_HOJD / REF_BREDD) * a.andel)))
            # V1: remslådans mitt (dagens detektorlåda, men bara dess läge)
            Sc = np.array([(S[0] + S[2]) / 2, (S[1] + S[3]) / 2]) - u * a.bias * L_t
            poly1 = geo_remsa(Sc, theta, K_t, L_t, a.andel)
            # V2: kortlådans kant: titelkanten = lådans yttersta hörn längs upp minus överskjutet (K/2)|sin 2θ|; sidled = lådans mitt
            Bc = np.array([(B[0] + B[2]) / 2, (B[1] + B[3]) / 2])
            Bh = np.array([[B[0], B[1]], [B[2], B[1]], [B[2], B[3]], [B[0], B[3]]], np.float64)
            kant = float(((Bh - Bc) @ u).max() - (K_t / 2) * abs(math.sin(2 * theta * D)))
            c2 = Bc + u * (kant - a.andel * L_t / 2)
            c2 = c2 + v * float((Sc - c2) @ v) * 0   # sidled ur lådan (0) — remslådans sidled provas i V3
            poly2 = geo_remsa(c2, theta, K_t, L_t, a.andel)
            # V3: kortlådans kant längs upp, remslådans mitt i sidled
            c3 = c2 + v * float((Sc - c2) @ v)
            poly3 = geo_remsa(c3, theta, K_t, L_t, a.andel)
            for namn_, poly in (('geo', poly1), ('geoB', poly2), ('geoBS', poly3)):
                rad[f'{namn_}_iou'] = round(poly_iou(poly, fpoly), 3)
                fragor[namn_] = kvadrat(cv2.cvtColor(varpa(img, poly, REF_BREDD, hh), cv2.COLOR_BGR2RGB))
            rad['geo_poly'] = [[round(float(x), 1), round(float(y), 1)] for x, y in poly1]
            rad['geoB_kant'] = round(float((kant - rad['L_f'] * 0) / L_t), 3)
            rad['kant_fel'] = round(float(((Bc + u * kant) - fc) @ upp_vektor(rad['theta_f']) - fkant) / rad['L_f'], 3)   # V2:s titelkant mot facits, i kortlängder
        for mn, m in modeller.items():
            qs = m.kor(list(fragor.values()))
            for (res, _), q in zip(fragor.items(), qs):
                R = refsG[mn] if res.startswith('geo') else refs[mn]
                e = dom(R.rangordna(q), rad['namn'], a.troskel)
                rad['modell'][f'{mn}:{res}'] = {'namn': e['namn'], 'marginal': e['marginal'], 'ratt': e['ratt']}
    json.dump(rader, open(a.ut, 'w'), ensure_ascii=False, indent=1)

    # 5. tabellen
    def cell(r, ny):
        e = r['modell'].get(ny)
        return '–' if not e else f"{'✓' if e['ratt'] else '✗'}{e['marginal']:.2f}"
    print(f"\nbias (remslådans mitt mot facitremsans mitt längs upp-axeln, i kortlängder; + = utåt) — bara egna remsor:")
    egna = [r for r in rader if r.get('remsa') is not None and not r.get('delad')]
    for grupp, sel in (('alla', lambda r: True), ('nära axel (|vinkel mod 90| < 8°)', lambda r: min(abs(r['theta_f']) % 90, 90 - abs(r['theta_f']) % 90) < 8), ('i vinkel', lambda r: min(abs(r['theta_f']) % 90, 90 - abs(r['theta_f']) % 90) >= 8)):
        rr = [r for r in egna if sel(r)]
        if not rr: continue
        bm = np.array([r['bias_mitt'] for r in rr]); bs = np.array([r['bias_sida'] for r in rr]); lu = np.array([r['lada_ut'] for r in rr]); li = np.array([r['lada_in'] for r in rr])
        print(f"  {grupp}: n {len(rr)} · mitt median {np.median(bm):+.3f} (p10 {np.percentile(bm, 10):+.3f}, p90 {np.percentile(bm, 90):+.3f}) · sida median {np.median(bs):+.3f} · låda ut {np.median(lu):+.3f} · låda in {np.median(li):+.3f}")
    vf = [r['vinkelfel'] for r in rader if r.get('vinkelfel') is not None]
    if vf: print(f"KortVinkel mot facit: n {len(vf)}, median {np.median(vf):.1f}°, p90 {np.percentile(vf, 90):.1f}°, max {max(vf):.1f}°, över 10°: {sum(1 for v in vf if v > 10)}")
    for ny in ('geo', 'geoB', 'geoBS'):
        gi = [r[f'{ny}_iou'] for r in rader if r.get(f'{ny}_iou') is not None]
        if gi: print(f"{ny}: remsa mot facits (IoU): n {len(gi)}, median {np.median(gi):.2f}, p10 {np.percentile(gi, 10):.2f}, min {min(gi):.2f}")
    for grupp, sel in (('hela kort (låda IoU ≥ 0,7 mot hela)', lambda r: r.get('kortlada_helt')), ('delvis synliga', lambda r: r.get('kortlada_helt') is False)):
        kf = [r['kant_fel'] for r in rader if r.get('kant_fel') is not None and sel(r)]
        if kf: print(f"kortlådans titelkant mot facits, {grupp}: n {len(kf)}, median {np.median(kf):+.3f}, p10 {np.percentile(kf, 10):+.3f}, p90 {np.percentile(kf, 90):+.3f} kortlängder")
    print(f"\n| fall | kort | hög | syn | θ f | KV θ/fel | låda IoU hel | bias mitt/sida | kantfel | IoU geo/B/BS | app exakt·låda·geo·B·BS | v2 exakt·låda·geo·B·BS |")
    print('|---|---|---|---|---|---|---|---|---|---|---|---|')
    for r in rader:
        kvt = r.get('kv') or {}
        kvs = f"{kvt.get('vinkel')}/{r.get('vinkelfel', '')}" if kvt else '–'
        print(f"| {r['fall']} | {r['namn'][:18]} | {r['hog'] or '–'} | {r['synlig']}{' T' if r['tappad'] else ''} | {r['theta_f']} | {kvs} | {r.get('lada_iou_hel', '')} | "
              f"{r.get('bias_mitt', '')}/{r.get('bias_sida', '')} | {r.get('kant_fel', '')} | {r.get('geo_iou', '')}/{r.get('geoB_iou', '')}/{r.get('geoBS_iou', '')} | "
              f"{cell(r, 'app:exakt')} {cell(r, 'app:lada')} {cell(r, 'app:geo')} {cell(r, 'app:geoB')} {cell(r, 'app:geoBS')} | "
              f"{cell(r, 'v2:exakt')} {cell(r, 'v2:lada')} {cell(r, 'v2:geo')} {cell(r, 'v2:geoB')} {cell(r, 'v2:geoBS')} |")
    # summan per metod och modell
    print(f"\nsäkra (marginal > {a.troskel}) rätt / säkra fel / rätt överst, av remsor som gick att skära på alla tre sätt:")
    alla3 = [r for r in rader if all(f'v2:{x}' in r['modell'] for x in ('exakt', 'lada', 'geo'))]
    for mn in MODELLER:
        for res in ('exakt', 'lada', 'geo', 'geoB', 'geoBS'):
            rr = [r['modell'][f'{mn}:{res}'] for r in alla3 if f'{mn}:{res}' in r['modell']]
            print(f"  {mn:3} {res:6}: säkra rätt {sum(1 for e in rr if e['ratt'] and e['marginal'] > a.troskel):3} · säkra fel {sum(1 for e in rr if not e['ratt'] and e['marginal'] > a.troskel)} · rätt överst {sum(1 for e in rr if e['ratt'])}/{len(rr)} · median marginal rätt {np.median([e['marginal'] for e in rr if e['ratt']] or [0]):.3f}")
    print(f'\nskrivet: {a.ut}')


if __name__ == '__main__':
    main()

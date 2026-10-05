#!/usr/bin/env python3
"""Riktiga exempel till bildmodellens träning (steg 4): märkningens utsnitt som ett platt dataset.

Läser varje <pass>/<klipp>/markning.json under dev/material/arbete/markning/ (mark.py, MARKNING.md) och tar
spåren med dom saker eller saker_manuell — inte baksidor, inte utanför träningen (golden-lekens namn). En rad
per utsnitt:

    {fil, pass, klipp, spar, t, namn, typ (hel|remsa), utsnitt (app|rata|horn), variant (tel|1080), val,
     konstverk (Scryfall-id för konstverket ORB matchade, eller null), rot, rot_kalla, px, kalla}

* Varianterna **tel** (telefonens kvalitet, steg T) och **1080** tränas; **4k** aldrig (för skarp mot telefonen).
* `rot`: hur många np.rot90 (moturs 90°) frågan behöver för att kortet ska stå upprätt. Remsorna ur hörnen och
  hel/rata är redan upprätta; hel/app räknas ur kortets fyrhörning (horn4k, 0 → 1 = överkanten) och hel_app:s
  vridning (−90° när lådan + 8 % ligger). Utan fyrhörning antas 0 (rot_kalla 'antagen'): hel_app vrider ett
  tappat kort upprätt, och träningsklippen har Jespers egna kort.
* `konstverk`: ORB:s bästa konstverk för namnet, bara när ORB räknades mot just det namnet (Claudes namn = domens)
  och gav ≥ 12 inliers. Annars null — träningen tar då ett konstverk ur `konstverk_per_namn`.
* `val`: mark.ar_val (vart femte namn, samma sida i alla pass; basland aldrig). Valideringens namn tränas aldrig.

Spärrarna (stoppar, skriver inget):
* delning.krav_traning på källklippets sökväg (markning.json:s `klipp`) — per klipp;
* golden-lekens namn utom basland (mark.golden_namn, också sidornas namn) får inte finnas i en enda rad;
* en klippmapp utan `remsor_ur: 'horn'` eller med `beskar: null` (C körd efter E) hoppas över i `rakna` och
  stoppar `bygg` — dess filer hör inte till markning.json;
* ett utsnitt som saknas på disk stoppar `bygg`.
Utsnittsmappar (`klipp1-auto_0-30s`) är provets utdrag ur ett helt klipp och räknas aldrig.

    PY=~/.mesa/detektor-venv/bin/python
    $PY dev/remsa/tran/dataset.py rakna                 # tabellen: per pass/typ/variant (läser bara JSON)
    $PY dev/remsa/tran/dataset.py bygg --ut <mapp>     # <mapp>/bilder/ + <mapp>/ref/ + <mapp>/manifest.json

`<mapp>` laddas upp till Kaggle som privat dataset; mesa_remsa_tran.py --riktiga /kaggle/input/<dataset>.
`ref/` har konstverken ORB matchade och poolens basland (≤ 24 per typ), så att valideringen inte beror på nätet.
"""
import argparse, glob, json, os, shutil, sys, time
from collections import Counter, defaultdict

HAR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HAR)
import mark  # noqa: E402  (mark lägger dev/remsa och dev/detektor i sys.path)
from delning import krav_traning, ProvLacka  # noqa: E402

ARBETE = mark.ARBETE
ROT = mark.ROT
BAS = set(mark.BAS)
SAKRA = ('saker', 'saker_manuell')
VARIANTER = {'tel': 'tel', '1080': '1080'}     # upplosning i markning.json → variant; '4k' tränas aldrig
KONST_PER_NAMN = 12                            # som appens urval (12 nyaste); basland: poolen + ORB:s


def rel(p):
    return os.path.relpath(p, ROT)


def rot_upp(f, M):
    """(rot, källa): antal np.rot90 som gör kortet upprätt i utsnittet."""
    if f['typ'] == 'remsa':
        return 0, 'remsa'          # remsa_ur_horn: upprätt och vågrät
    if f['utsnitt'] == 'rata':
        return 0, 'rata'           # hel_rata vänder så att remsan ligger överst
    horn = f.get('horn4k')
    if not horn:
        return 0, 'antagen'
    W, H = M['W'], M['H']
    lada = mark.horn_lada(horn) if f.get('ur') == 'horn' else f['lada']
    ix0, iy0, ix1, iy1 = mark.hel_geo(mark.andelar(lada, W, H), W, H)
    # kortets "nedåt" i 4K-rutan: från överkanten (0, 1) mot underkanten (3, 2)
    vx = ((horn[3][0] - horn[0][0]) + (horn[2][0] - horn[1][0])) / 2
    vy = ((horn[3][1] - horn[0][1]) + (horn[2][1] - horn[1][1])) / 2
    if ix1 - ix0 > iy1 - iy0:      # hel_app vred utsnittet −90° (ROTATE_90_COUNTERCLOCKWISE): (x, y) → (y, −x)
        vx, vy = vy, -vx
    if abs(vy) >= abs(vx):
        return (0 if vy > 0 else 2), 'horn'
    return (3 if vx > 0 else 1), 'horn'   # överkanten till vänster → medurs (k = 3); till höger → moturs (k = 1)


def konstverk_ur_orb(s):
    ob, cl = s.get('orb') or {}, s.get('claude') or {}
    if ob.get('bild') and cl.get('namn') == s['namn'] and ob.get('inliers', 0) >= 12:
        return ob['bild']
    return None


def klippen():
    """[(passnamn, klippnamn, mapp)] för hela klipp (inte utdragen med '_')."""
    ut = []
    for mf in sorted(glob.glob(os.path.join(ARBETE, '*', '*', 'markning.json'))):
        mapp = os.path.dirname(mf)
        k, p = os.path.basename(mapp), os.path.basename(os.path.dirname(mapp))
        if '_' in k:
            continue
        ut.append((p, k, mapp))
    return ut


def las(strikt):
    """Raderna ur alla klipp. strikt (bygg): varje avvikelse stoppar; annars (rakna) hoppas klippet över."""
    rader, hoppade, sparr = [], [], []
    gold = mark.golden_namn()
    slank = []
    for p, k, mapp in klippen():
        M = mark.las_json(os.path.join(mapp, 'markning.json'))
        kalla = os.path.join(ROT, M['klipp'])
        try:
            krav_traning(kalla)
            sparr.append((p, k, M['klipp'], 'träning'))
        except ProvLacka as e:
            raise SystemExit(f'STOPP: {p}/{k}: källklippet är inte träning — {e}')
        fel = None
        if M.get('remsor_ur') != 'horn':
            fel = "saknar remsor_ur: 'horn' (märkt före fyrhörningen) — kör om från C och E"
        elif M.get('beskar') is None:
            fel = 'beskar: null — C har körts efter E; filerna hör inte till markning.json (kör E)'
        if fel:
            if strikt:
                raise SystemExit(f'STOPP: {p}/{k}: {fel}')
            hoppade.append((p, k, fel))
            continue
        spar = {s['id']: s for s in M['spar']}
        for f in M.get('filer') or []:
            variant = VARIANTER.get(f['upplosning'])
            if variant is None:
                continue
            s = spar.get(f['spar'])
            if s is None or s['dom'] not in SAKRA or s.get('utanfor_traning') or s['namn'] in (None, 'baksida'):
                continue
            if f.get('namn', s['namn']) != s['namn']:
                raise SystemExit(f'STOPP: {p}/{k} {f["fil"]}: filens namn {f.get("namn")!r} ≠ spårets {s["namn"]!r}')
            namn = s['namn']
            if namn not in BAS and (namn in gold or any(x in gold for x in namn.split(' // '))):
                slank.append(f'{p}/{k} {s["id"]} {namn}')
                continue
            rot, rot_kalla = rot_upp(f, M)
            rader.append({'fil': None, 'kalla': rel(os.path.join(mapp, f['fil'])), 'pass': p, 'klipp': k, 'spar': s['id'],
                          't': f['t'], 'lage': f.get('lage'), 'namn': namn, 'typ': f['typ'], 'utsnitt': f['utsnitt'],
                          'variant': variant, 'val': bool(s.get('val')), 'konstverk': konstverk_ur_orb(s), 'rot': rot,
                          'rot_kalla': rot_kalla, 'px': f.get('px'), 'dom': s['dom']})
    if slank:
        raise SystemExit(f'STOPP: golden-lekens namn slank igenom ({len(slank)} utsnitt) — utanfor_traning är fel satt: '
                         + '; '.join(sorted(set(slank))[:20]))
    # samma namn på samma sida överallt (ar_val är en hash av namnet) — kontrollera ändå
    sida = defaultdict(set)
    for r in rader:
        sida[r['namn']].add(r['val'])
    tva = [n for n, v in sida.items() if len(v) > 1]
    if tva:
        raise SystemExit(f'STOPP: namn både i träning och validering: {tva[:10]}')
    return rader, hoppade, sparr


def rakna(args):
    rader, hoppade, sparr = las(strikt=False)
    print(f'# Riktiga exempel ({time.strftime("%Y-%m-%d %H:%M")})\n')
    print('| pass | typ | variant | utsnitt | namn | basland (utsnitt) | val-andel (utsnitt) | val-namn | konstverk ur ORB | rot ur hörnen / antagen | MB |')
    print('|---|---|---|---|---|---|---|---|---|---|---|')
    grupper = defaultdict(list)
    for r in rader:
        grupper[(r['pass'], r['typ'], r['variant'])].append(r)
    tot = defaultdict(list)
    for (p, typ, v), rr in sorted(grupper.items()):
        tot[(typ, v)] += rr
        print(rad(p, typ, v, rr))
    for (typ, v), rr in sorted(tot.items()):
        print(rad('**alla**', typ, v, rr))
    namn = {r['namn'] for r in rader}
    print(f"\nNamn totalt {len(namn)} (basland {len(namn & BAS)}), varav validering {len({r['namn'] for r in rader if r['val']})}; "
          f"spår {len({(r['pass'], r['klipp'], r['spar']) for r in rader})}; utsnitt {len(rader)}, "
          f"{sum(mb(r) for r in rader):.1f} MB.")
    print('\nSpärren (källklippen): ' + '; '.join(f'{p}/{k} {kl} → {d}' for p, k, kl, d in sparr))
    if hoppade:
        print('\nHoppade över: ' + '; '.join(f'{p}/{k}: {f}' for p, k, f in hoppade))


def mb(r):
    f = os.path.join(ROT, r['kalla'])
    return os.path.getsize(f) / 1e6 if os.path.exists(f) else 0.0


def rad(p, typ, v, rr):
    n = {r['namn'] for r in rr}
    vn = {r['namn'] for r in rr if r['val']}
    rc = Counter(r['rot_kalla'] for r in rr)
    return (f"| {p} | {typ} | {v} | {len(rr)} | {len(n)} | {sum(1 for r in rr if r['namn'] in BAS)} | "
            f"{100 * sum(r['val'] for r in rr) / max(1, len(rr)):.0f} % | {len(vn)} | "
            f"{sum(1 for r in rr if r['konstverk'])} | {rc.get('horn', 0)} / {rc.get('antagen', 0)} | {sum(mb(r) for r in rr):.1f} |")


def bygg(args):
    ut = os.path.abspath(args.ut)
    if os.path.realpath(ut).startswith(os.path.realpath(ARBETE)):
        raise SystemExit(f'--ut får inte ligga i {rel(ARBETE)} (märkningens mappar rörs inte)')
    if os.path.exists(ut) and os.listdir(ut) and not args.om:
        raise SystemExit(f'{ut} finns och är inte tom (--om skriver över)')
    rader, _, sparr = las(strikt=True)
    saknas = [r['kalla'] for r in rader if not os.path.exists(os.path.join(ROT, r['kalla']))]
    if saknas:
        raise SystemExit(f'STOPP: {len(saknas)} utsnitt saknas på disk, t.ex. {saknas[:3]} — kör E (och T) för klippet')
    shutil.rmtree(ut, ignore_errors=True)
    os.makedirs(os.path.join(ut, 'bilder')); os.makedirs(os.path.join(ut, 'ref'))
    for r in rader:
        platt = f"{r['pass']}__{r['klipp']}__{r['variant']}__{os.path.basename(r['kalla'])}"
        shutil.copy2(os.path.join(ROT, r['kalla']), os.path.join(ut, 'bilder', platt))
        r['fil'] = 'bilder/' + platt
    # konstverken: per namn de ORB matchade + upp till 12 ur mark.py:s konstverk.json (som appens urval);
    # basland poolens ≤ 24 per typ. Bilderna i ref/ när de finns lokalt (ORB:s och poolens alltid).
    konst = mark.las_json(mark.KONSTFIL)
    pool = konst.get('_pool', {})
    namn = sorted({r['namn'] for r in rader})
    per_namn, i_ref, utan_bild = {}, set(), []
    for n in namn:
        orb_ids = sorted({r['konstverk'] for r in rader if r['namn'] == n and r['konstverk']})
        lista = pool.get(n, []) if n in BAS else konst.get(n, [])[:KONST_PER_NAMN]
        poster = {p['id']: p.get('normal') for p in lista}
        for i in orb_ids:
            poster.setdefault(i, next((p.get('normal') for p in konst.get(n, []) if p['id'] == i), None))
        per_namn[n] = [{'id': i, 'normal': u, 'orb': i in orb_ids, 'pool': n in BAS and any(p['id'] == i for p in pool.get(n, []))}
                       for i, u in poster.items()]
        for i in orb_ids + ([p['id'] for p in pool.get(n, [])] if n in BAS else []):
            i_ref.add(i)
    for b in sorted(BAS - set(namn)):         # poolens basland finns alltid med i valideringens lek
        per_namn[b] = [{'id': p['id'], 'normal': p.get('normal'), 'orb': False, 'pool': True} for p in pool.get(b, [])]
        i_ref.update(p['id'] for p in pool.get(b, []))
    for i in sorted(i_ref):
        src = os.path.join(mark.REF, i + '.jpg')
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(ut, 'ref', i + '.jpg'))
        else:
            utan_bild.append(i)
    gold = sorted(mark.golden_namn())
    manifest = {'skapad': time.strftime('%Y-%m-%d %H:%M'), 'version': 1,
                'regler': {'varianter': sorted(VARIANTER.values()), 'domar': list(SAKRA), 'val': 'mark.ar_val (vart femte namn, basland aldrig)',
                           'rot': 'np.rot90(fråga, rot) gör kortet upprätt', 'konstverk': 'ORB ≥ 12 inliers mot domens namn'},
                'sparr': [{'pass': p, 'klipp': k, 'kalla': kl, 'delning': d} for p, k, kl, d in sparr],
                'golden_utanfor': gold, 'namn': namn, 'val_namn': sorted({r['namn'] for r in rader if r['val']}),
                'konstverk_per_namn': per_namn, 'pool_basland': {b: [p['id'] for p in pool.get(b, [])] for b in sorted(BAS)},
                'ref_saknas_lokalt': utan_bild, 'rader': rader}
    with open(os.path.join(ut, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    mbx = sum(os.path.getsize(os.path.join(ut, 'bilder', x)) for x in os.listdir(os.path.join(ut, 'bilder'))) / 1e6
    mbr = sum(os.path.getsize(os.path.join(ut, 'ref', x)) for x in os.listdir(os.path.join(ut, 'ref'))) / 1e6
    print(f'{len(rader)} utsnitt ({mbx:.1f} MB), {len(namn)} namn, {len(os.listdir(os.path.join(ut, "ref")))} referensbilder '
          f'({mbr:.1f} MB; {len(utan_bild)} saknas lokalt och hämtas av träningen) → {ut}')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('kommando', choices=['rakna', 'bygg'])
    ap.add_argument('--ut')
    ap.add_argument('--om', action='store_true')
    a = ap.parse_args()
    if a.kommando == 'bygg':
        if not a.ut:
            raise SystemExit('bygg kräver --ut <mapp>')
        bygg(a)
    else:
        rakna(a)


if __name__ == '__main__':
    main()

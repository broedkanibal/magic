#!/usr/bin/env python3
"""MES-328: tabellerna i RESULTAT.md genereras ur resultatfilerna — aldrig avskrivna.

Granskningen 2026-10-02 hittade två avskrivna mått som inte stämde med filerna (högkort "25/25" där
nollprov.json säger 23/23, och 20/160 där detektorremsor-embed.json säger 19/152). Därför: varje
tabell står i RESULTAT.md mellan `<!-- tabell: NAMN -->` och `<!-- /tabell -->`, skrivs av det här
skriptet och kontrolleras mot filerna.

    ~/.mesa/detektor-venv/bin/python dev/remsa/tabell.py                 # skriver alla tabeller till stdout
    ~/.mesa/detektor-venv/bin/python dev/remsa/tabell.py --skriv         # byter ut tabellerna i RESULTAT.md
    ~/.mesa/detektor-venv/bin/python dev/remsa/tabell.py --kontrollera   # avslutar med 1 om RESULTAT.md avviker från filerna

Källor (alla i dev/remsa/resultat/): kalibrering-helkort.json, nollprov.json, *-ocr-ocr-rapport.json,
detektorremsor-embed.json, *-detektorremsor-ocr-rapport.json, hogbank-remsor.json, tid.json, tid-ocr-*.json.
Bara standardbiblioteket — går att köra med vilken python3 som helst.
"""
import argparse, json, os, re, sys
from collections import Counter

HAR = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(HAR, 'resultat')
RESULTAT_MD = os.path.join(HAR, 'RESULTAT.md')


def las(namn):
    return json.load(open(os.path.join(RES, namn), encoding='utf-8'))


def k(x, dec=3):
    """Decimalkomma, som i resten av dokumentet."""
    return f'{x:.{dec}f}'.replace('.', ',')


def pct(a, n):
    return f'{100 * a / max(1, n):.0f} %'


FALL = {  # golden-fallens id → raden i dokumentet
    '03-tra-lampa-40cm-11kort-overlapp': '03 trä, lampa, 40 cm, 11 kort omlott',
    '04-tra-dagsljus-40cm-8kort-overlapp': '04 trä, dagsljus, 8 kort omlott',
    '05-ribbor-dagsljus-40cm-6kort-overlapp': '05 ribbor, dagsljus, 6 kort omlott',
    '06-ljusgra-dagsljus-40cm-12kort-overlapp': '06 ljusgrå, dagsljus, 12 kort omlott',
    '14-tra-lampa-50cm-11kort-omlott': '14 trä, lampa, 50 cm, 11 kort omlott (foto)',
    '15-tra-dagsljus-50cm-11kort-omlott': '15 trä, dagsljus, 50 cm, samma kort (foto)',
    '16-tra-lampa-50cm-8kort': '16 trä, lampa, 8 kort (foto)',
    '13-svartmatta-lampa-40cm-10kort-tokens': '13 svart matta, lampa, 4K-ruta ur MES-246',
}
SJU_FOTON = [f for f in FALL if not f.startswith('13-')]
FALL_13 = '13-svartmatta-lampa-40cm-10kort-tokens'

# raderna ur nollprov.json som visas (alla 21 ligger i filen; de utelämnade ändrar inte bilden)
NOLLPROV_RADER = [('golden', 0.12, 'orig'), ('golden', 0.16, 'orig'), ('golden', 0.20, 'orig'), ('golden', 0.20, '1920'), ('golden', 0.20, '960'),
                  ('golden', 0.16, '960'), ('golden', 0.12, '960'),
                  ('mes246', 0.12, 'orig'), ('mes246', 0.16, 'orig'), ('mes246', 0.20, 'orig'), ('mes246', 0.20, '1920'), ('mes246', 0.16, '960'), ('mes246', 0.20, '960'),
                  ('riktiga', 0.12, 'orig'), ('riktiga', 0.16, 'orig'), ('riktiga', 0.20, 'orig')]


def summera(rader, troskel=0.11):
    ratt = [r for r in rader if r['ratt']]; fel = [r for r in rader if not r['ratt']]
    hog = [r for r in rader if r.get('hog')]
    return {'remsor': len(rader), 'ratt': len(ratt), 'sakra_ratt': sum(r['saker'] for r in ratt), 'sakra_fel': sum(r['saker'] for r in fel),
            'hogkort': len(hog), 'hogkort_ratt': sum(r['ratt'] for r in hog)}


# ---------------------------------------------------------------- tabellerna

def t_kalibrering():
    j = las('kalibrering-helkort.json')
    return ['| | Rätt | Säkra rätt | Säkra fel |', '|---|---|---|---|',
            '| `dev/embed/RAPPORT.md`, modulen (2026-09-18) — avskrivet ur rapporten, inte ur en resultatfil | 52/61 | 46 | 1–2 |',
            f"| `kalibrering.py` (den här koden) | **{j['ratt']}/{j['n']}** | **{j['sakra_ratt']}** | **{j['sakra_fel']}** |"]


def t_nollprov():
    j = las('nollprov.json')
    per = {(t['kalla'], round(t['andel'], 2), t['res']): t for t in j['tabell']}
    ut = ['| Källa | Andel | Upplösning | Remsor | Rätt | Säkra rätt | **Säkra fel** | Högkort rätt | Högkort säkra fel | Marginal (median, rätt) | Nollfel: tröskel → säkra | Remsans höjd i källan (px) |',
          '|---|---|---|---|---|---|---|---|---|---|---|---|']
    for nyckel in NOLLPROV_RADER:
        s = per[nyckel]
        hog = f"{s['hogkort_ratt']}/{s['hogkort']}" if s['hogkort'] else '–'
        hogfel = str(s['hogkort_sakra_fel']) if s['hogkort'] else '–'
        ut.append(f"| {s['kalla']} | {k(s['andel'], 2)} | {s['res']} | {s['remsor']} | {s['ratt']} ({pct(s['ratt'], s['remsor'])}) | {s['sakra_ratt']} | **{s['sakra_fel']}** | "
                  f"{hog} | {hogfel} | {k(s['marginal_ratt_median'])} | {k(s['nollfel_troskel'])} → {s['nollfel_sakra']} | {s['remsa_px_median']:.0f} |")
    return ut


def ocr_per_fall():
    """OCR rätt per golden-fall (orig, titelraden) ur hörn-rapporten — saknas filen: tomt."""
    try:
        j = las('2026-10-02-mes-328-ocr-ocr-rapport.json')
    except FileNotFoundError:
        return {}
    ut = {}
    for nyckel, d in j.get('per_bild', {}).items():
        kalla, res, utsnitt, bild = nyckel.split('|')
        if kalla == 'golden' and res == 'orig' and utsnitt == 'namnrad':
            ut[bild] = d
    return ut


def t_golden_per_fall():
    j = las('nollprov.json')
    rader = j['rader']['0.20|golden|orig']
    ocr = ocr_per_fall()
    ut = ['| Fall | Rätt | Säkra fel | Högkort rätt | OCR rätt (titelraden) |', '|---|---|---|---|---|']
    for fid, namn in FALL.items():
        s = summera([r for r in rader if r['bild'] == fid])
        o = ocr.get(fid)
        ocr_txt = f"{o['ratt']}/{o['remsor']}" if o else '–'
        ut.append(f"| {namn} | {s['ratt']}/{s['remsor']} | {s['sakra_fel']} | {s['hogkort_ratt']}/{s['hogkort']} | {ocr_txt} |")
    return ut


def sju_och_13():
    """Siffrorna i löptexten och i Linear-tabellen: de sju fotona mot fall 13, ur samma rader."""
    rader = las('nollprov.json')['rader']['0.20|golden|orig']
    sju = summera([r for r in rader if r['bild'] in SJU_FOTON]); tretton = summera([r for r in rader if r['bild'] == FALL_13])
    return sju, tretton


def swamp():
    rader = las('nollprov.json')['rader']['0.20|mes246|orig']
    svar = Counter(r['namn'] for r in rader)
    per_namn = {}
    for r in rader:
        d = per_namn.setdefault(r['facit'], [0, 0]); d[1] += 1; d[0] += bool(r['ratt'])
    hog = [r for r in rader if r['hog']]
    return {'swamp_svar': svar.get('Swamp', 0), 'n': len(rader), 'per_namn': sorted(per_namn.items(), key=lambda x: -x[1][1]),
            'hogkort_ratt': sum(r['ratt'] for r in hog), 'hogkort_ratt_swamp': sum(r['ratt'] for r in hog if r['facit'] == 'Swamp'), 'hogkort_swamp': sum(1 for r in hog if r['facit'] == 'Swamp')}


UTSNITT = {'namnrad': 'titelraden, 3 lägen', 'remsa14': 'hela 14 %-remsan'}
OCR_RADER = [('golden', 'orig', 'namnrad'), ('golden', '960', 'namnrad'), ('golden', 'orig', 'remsa14'),
             ('mes246', 'orig', 'namnrad'), ('mes246', '960', 'namnrad'), ('mes246', 'orig', 'remsa14')]


def t_ocr_horn():
    j = las('2026-10-02-mes-328-ocr-ocr-rapport.json')
    per = {(s['kalla'], s['res'], s['utsnitt']): s for s in j['ocr']}
    ut = ['| Källa | Upplösning | Utsnitt | Remsor | Rätt (≥ 0,6) | **Fel (≥ 0,6)** | Inget namn | Topp-1 rätt oavsett poäng | Högkort rätt | Titelrad px i källan | ms/kort (under last) |',
          '|---|---|---|---|---|---|---|---|---|---|---|']
    for nyckel in OCR_RADER:
        s = per[nyckel]
        ut.append(f"| {s['kalla']} | {s['res']} | {UTSNITT[s['utsnitt']]} | {s['remsor']} | {s['ratt']} ({pct(s['ratt'], s['remsor'])}) | **{s['fel']}** | {s['inget']} | {s['topp1_ratt']} | "
                  f"{s['hogkort_ratt']}/{s['hogkort']} | {s['kall_h_px_median']:.0f} | {s['ms_median']} |")
    return ut


def t_sida_vid_sida():
    j = las('2026-10-02-mes-328-ocr-ocr-rapport.json')
    per = {s['titel']: s for s in j['sida_vid_sida']}
    ut = ['| Remsor | Både rätt | Bara OCR | Bara bildmodellen | Ingen | OCR rätt / fel | Bildmodellen rätt / säkra rätt / säkra fel | OCR rätt ELLER bildmodellen säker | …fel | Högkort: OCR / bild / ingen |',
          '|---|---|---|---|---|---|---|---|---|---|']
    for titel in ('golden orig (hörn)', 'golden 960 (hörn)', 'mes246 orig (hörn)', 'mes246 960 (hörn)'):
        s = per[titel]
        ut.append(f"| **{titel.replace(' (hörn)', '')}** {s['remsor']} | {s['bada_ratt']} | **{s['bara_ocr']}** | {s['bara_bildmodell']} | {s['ingen']} | {s['ocr_ratt']} / {s['ocr_fel']} | "
                  f"{s['bild_ratt']} / {s['bild_sakra_ratt']} / {s['bild_sakra_fel']} | {s['ocr_eller_bild_saker']} | {s['ocr_fel_eller_bild_sakert_fel']} | "
                  f"{s['hogkort_ocr_ratt']} / {s['hogkort_bild_ratt']} / {s['hogkort_ingen']} av {s['hogkort']} |")
    return ut


DET_RADER = [('golden', 'orig', 'golden, ur källan (orig)'), ('golden', '960', 'golden, ur analysbilden (960)'),
             ('mes246', 'orig', 'mes246, ur källan (4K)'), ('mes246', '960', 'mes246, ur analysbilden (960)')]


def t_detektor():
    e = las('detektorremsor-embed.json'); o = las('2026-10-02-mes-328-detektorremsor-ocr-rapport.json')
    emb = {s['res']: s for s in e['embed']}
    ocr = {(s['kalla'], s['res']): s for s in o['ocr']}
    svs = {s['titel']: s for s in o['sida_vid_sida']}
    ut = ['| | Remsor | Bildmodellen rätt | säkra rätt / **säkra fel** | OCR rätt (band) / fel | Bara OCR | Högkort bild |', '|---|---|---|---|---|---|---|']
    for kalla, res, namn in DET_RADER:
        s = emb[res][kalla]; oc = ocr[(kalla, res)]; sv = svs[f'{kalla} {res} (detektorn)']
        ut.append(f"| {namn} | {s['remsor']} | **{s['ratt']} ({pct(s['ratt'], s['remsor'])})** | {s['sakra_ratt']} / **{s['sakra_fel']}** | {oc['ratt']} / {oc['fel']} | {sv['bara_ocr']} | "
                  f"{s['hogkort_ratt']}/{s['hogkort']} |")
    return ut


def t_hogbank():
    j = las('hogbank-remsor.json')
    r = j['rapport']
    fall = j['fall']
    tot = sum(len(x['remsor']) for x in fall); utan = sum(1 for x in fall if not x['remsor'])
    namn = {'bildmodellen (säker)': 'bildmodellen (säker, marginal > 0,11)', 'OCR (≥ 0,6)': 'OCR (≥ 0,6, band ur detektorremsan, båda vridningarna)',
            'OCR med appens dom (≥ 0,6 och marginal ≥ 0,2)': 'OCR med appens dom (≥ 0,6 **och** marginal ≥ 0,2)', 'OCR eller bildmodellen': 'OCR (≥ 0,6) eller bildmodellen'}
    ut = ['| Sätt | Högar hela | Par hela | Ensamma | **Fel namn** | Remsor i lådorna | Fall utan remsa |', '|---|---|---|---|---|---|---|',
          '| MES-250, dagens kedja (namnläsaren på hela beskärningen) — avskrivet ur MES-250:s mätning, inte ur en resultatfil | 0/13 | 2/13 | 13/39 | – | – | – |']
    for key, label in namn.items():
        if key not in r:
            continue
        p = r[key]['per_typ']
        g = lambda t: f"{p.get(t, [0, 0])[0]}/{p.get(t, [0, 0])[1]}"
        ut.append(f"| {label} | {g('hog')} | {g('par')} | {g('ensam')} | **{r[key]['fel_namn']}** | {tot} | {utan} |")
    return ut


def t_tid():
    try:
        t = las('tid.json')
    except FileNotFoundError:
        return ['(tid.json saknas — kör `tid.py --ut dev/remsa/resultat/tid.json`)']
    n = las('nollprov.json')
    last = [x['ms_modell'] for x in n['tabell']]
    ut = ['| Steg | Tid | Mätt |', '|---|---|---|',
          f"| varpning ur hörn + tryck till 256 × 256, ur en {t['bild_bredd_px']} px bred bild | {k(t['varp_ms'], 1)} ms | `tid.py`, last {k(t['last_1min'], 1)} |",
          f"| bildmodellen, onnxruntime på processorn, 4 trådar, en remsa i taget | **{t['tradar']['4']['en']:.0f} ms** (åtta i taget: {t['tradar']['4']['atta']:.0f} ms per remsa) | `tid.py`, last {k(t['last_1min'], 1)} |",
          f"| bildmodellen, 4 trådar, under last (nollprovets {len(last)} körningar, median per körning) | {min(last):.0f}–{max(last):.0f} ms | `nollprov.json`, `ms_modell` |",
          f"| bildmodellen, 1 tråd | {t['tradar']['1']['en']:.0f} ms | `tid.py` |"]
    for fil in sorted(os.listdir(RES)):
        if fil.startswith('tid-ocr-') and fil.endswith('.json'):
            o = las(fil); ms = sorted(x['ms'] for x in o['remsor']); n_ = len(ms)
            forsok = sorted(x['forsok'] for x in o['remsor'])
            ut.append(f"| OCR (tesseract.js, en arbetare) per kort, 1–3 band tills 0,6 som appen: {fil[8:-5].replace('-', ' ')} ({n_} kort) | **{ms[n_ // 2]} ms** (p90 {ms[int(n_ * 0.9)]} ms; {k(sum(forsok) / n_, 1)} band per kort) | `{fil}` |")
    return ut


def t_linear_steg1():
    """Linear-kommentarens steg 1-tabell."""
    sju, tretton = sju_och_13()
    n = las('nollprov.json'); per = {(t['kalla'], round(t['andel'], 2), t['res']): t for t in n['tabell']}
    m = per[('mes246', 0.20, 'orig')]; r = per[('riktiga', 0.20, 'orig')]
    return ['| Material | Remsor | Rätt namn | Säkra rätt | **Säkra fel** (marginal > 0,11) | Högkort rätt |', '|---|---|---|---|---|---|',
            f"| golden, sju foton (03–06, 14–16) | {sju['remsor']} | **{sju['ratt']} ({pct(sju['ratt'], sju['remsor'])})** | {sju['sakra_ratt']} | **{sju['sakra_fel']}** | {sju['hogkort_ratt']}/{sju['hogkort']} |",
            f"| golden 13 (en 4K-ruta ur MES-246) | {tretton['remsor']} | {tretton['ratt']} | {tretton['sakra_ratt']} | {tretton['sakra_fel']} | {tretton['hogkort_ratt']}/{tretton['hogkort']} |",
            f"| MES-246, 4K-filmen, 63 lägen | {m['remsor']} | {m['ratt']} ({pct(m['ratt'], m['remsor'])}) | {m['sakra_ratt']} | **{m['sakra_fel']}** | {m['hogkort_ratt']}/{m['hogkort']} (nästan bara Swamp-högar) |",
            f"| appens egna lådor (riktiga, 61) | {r['remsor']} | {r['ratt']} ({pct(r['ratt'], r['remsor'])}) | {r['sakra_ratt']} | {r['sakra_fel']} | – |"]


TABELLER = {'kalibrering': t_kalibrering, 'nollprov': t_nollprov, 'golden-per-fall': t_golden_per_fall, 'ocr-horn': t_ocr_horn,
            'sida-vid-sida': t_sida_vid_sida, 'detektor': t_detektor, 'hogbank': t_hogbank, 'tid': t_tid}


def siffror():
    sju, tretton = sju_och_13(); sw = swamp()
    ut = [f"Sju foton: {sju['ratt']}/{sju['remsor']} rätt, säkra rätt {sju['sakra_ratt']}, säkra fel {sju['sakra_fel']}, högkort {sju['hogkort_ratt']}/{sju['hogkort']}.",
          f"Fall 13: {tretton['ratt']}/{tretton['remsor']} rätt, säkra rätt {tretton['sakra_ratt']}, säkra fel {tretton['sakra_fel']}, högkort {tretton['hogkort_ratt']}/{tretton['hogkort']}.",
          f"MES-246 (0,20, orig): Swamp som svar på {sw['swamp_svar']} av {sw['n']} remsor; högkort rätt {sw['hogkort_ratt']}, varav Swamp {sw['hogkort_ratt_swamp']}/{sw['hogkort_swamp']}.",
          'Per namn (rätt/remsor): ' + ', '.join(f'{n} {a}/{b}' for n, (a, b) in sw['per_namn'][:8]) + ' …']
    return ut


MARK = re.compile(r'<!-- tabell: ([a-z0-9-]+) -->\n(.*?)<!-- /tabell -->', re.S)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--skriv', action='store_true', help='byt ut tabellerna i RESULTAT.md')
    p.add_argument('--kontrollera', action='store_true', help='avsluta med 1 om RESULTAT.md avviker från filerna')
    a = p.parse_args()
    genererat = {namn: '\n'.join(f()) + '\n' for namn, f in TABELLER.items()}
    if not (a.skriv or a.kontrollera):
        for namn, text in genererat.items():
            print(f'<!-- tabell: {namn} -->\n{text}<!-- /tabell -->\n')
        print('<!-- linear: steg 1 -->\n' + '\n'.join(t_linear_steg1()) + '\n')
        print('\n'.join(siffror()))
        return
    md = open(RESULTAT_MD, encoding='utf-8').read()
    fel = []
    def byt(m):
        namn, inne = m.group(1), m.group(2)
        if namn not in genererat:
            fel.append(f'{namn}: ingen generator'); return m.group(0)
        if inne != genererat[namn]:
            fel.append(namn)
        return f'<!-- tabell: {namn} -->\n{genererat[namn]}<!-- /tabell -->'
    nytt = MARK.sub(byt, md)
    funna = {m[0] for m in MARK.findall(md)}
    for namn in genererat:
        if namn not in funna:
            fel.append(f'{namn}: saknar markör i RESULTAT.md')
    if a.skriv:
        open(RESULTAT_MD, 'w', encoding='utf-8').write(nytt)
        print(f"RESULTAT.md: {len(funna)} tabeller skrivna; ändrade: {', '.join(x for x in fel if ':' not in x) or 'inga'}")
        return
    if fel:
        print('RESULTAT.md avviker från resultatfilerna: ' + ', '.join(fel)); sys.exit(1)
    print(f'RESULTAT.md: {len(funna)} tabeller stämmer med resultatfilerna')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Stickprovet av märkningen: ett zoombart HTML-galleri för Jesper och kontaktark för sessionens egna ögon.

Läser <pass>/<klipp>/markning.json (mark.py, MARKNING.md) och visar varje spår som går in i träningen — dom
saker, saker_manuell, saker_ordning — och baksidorna: helkortet och remsan ur kortets hörn vid lägg-ögonblicket i
1080 (det modellen tränar på), med 4K-utsnittet som zoom (klick). Därefter de osäkra (osaker/4k, inte i träningen)
med Claudes namn och skälet, så att en människa kan skriva facit-manuell.json.

    PY=~/.mesa/detektor-venv/bin/python
    $PY dev/remsa/tran/galleri.py 2026-10-06-traning-manga-kort-tra-skugga            # → markning/stickprov-<pass>.html
    $PY dev/remsa/tran/galleri.py <pass> --ark <mapp>                                 # kontaktark (jpg, 20 kort per ark)

Galleriet öppnas med `open <fil>` — bilder i chatten är för små. Allt skrivs under dev/material/arbete/markning/
(gitignorerat). Kontaktarken: 4K-helkortet vid lägget, 300 px brett, med spår-id, namnet och domen under — ett ark
per 20 spår, osäkra på egna ark. Läser bara; ändrar ingen märkning.
"""
import base64, glob, html, io, json, os, sys

HAR = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.abspath(os.path.join(HAR, '..', '..', '..'))
ARBETE = os.path.join(ROT, 'dev', 'material', 'arbete', 'markning')
SAKRA = ('saker', 'saker_manuell', 'saker_ordning')
MARK = {'saker_manuell': 'M', 'saker_ordning': 'O', 'baksida': 'B'}

STIL = """body{font-family:-apple-system,Helvetica,sans-serif;background:#111;color:#eee;margin:16px}
h1{font-size:20px}h2{font-size:16px;margin-top:28px;color:#9cf}h3{font-size:14px;color:#fc6;margin-top:22px}
.rad{display:flex;gap:12px;align-items:flex-start;border-bottom:1px solid #333;padding:10px 0}
.rad img{cursor:zoom-in;border:1px solid #444;background:#000}
.hel{width:300px}.remsa{width:600px}.osaker{width:300px}
.txt{min-width:240px;max-width:240px}.namn{font-size:18px;font-weight:600}.meta{color:#aaa;font-size:13px;margin-top:4px}
.M{color:#fc6}.B{color:#6cf}.O{color:#9f9}.U{color:#f99}
#zoom{position:fixed;inset:0;background:rgba(0,0,0,.95);display:none;align-items:center;justify-content:center;cursor:zoom-out}
#zoom img{max-width:98vw;max-height:98vh;image-rendering:auto}
p.hint{color:#aaa}.sum{color:#ccc;font-size:14px}"""
SKRIPT = ("document.addEventListener('click',e=>{if(e.target.tagName==='IMG'&&e.target.closest('.rad')){"
          "const z=document.getElementById('zoom');z.querySelector('img').src=e.target.dataset.zoom||e.target.src;"
          "z.style.display='flex'}else if(e.target.closest('#zoom')){document.getElementById('zoom').style.display='none'}});")


def b64(sokvag):
    with open(sokvag, 'rb') as f:
        return 'data:image/jpeg;base64,' + base64.b64encode(f.read()).decode('ascii')


def laggfil(m, s, typ, upplosning):
    """Filposten för spårets lägg-ögonblick (läge 0, annars närmast lägg-t) i given typ och upplösning."""
    t = (s.get('lagg') or {}).get('t')
    kand = [f for f in m['filer'] if f['spar'] == s['id'] and f['typ'] == typ and f['upplosning'] == upplosning
            and not f.get('variant')]
    if not kand:
        return None
    kand.sort(key=lambda f: (f.get('lage', 99), abs((f.get('t') or 0) - (t or 0))))
    return kand[0]


def rad_meta(s):
    cl, orb, mo = s.get('claude') or {}, s.get('orb') or {}, s.get('modell') or {}
    delar = [s['id'], f"{(s.get('lagg') or {}).get('t', 0):.1f} s", f"lägen {len(s.get('lagen') or [])}"]
    if cl.get('namn'):
        delar.append(f"Claude: {cl['namn']}" + ('' if cl.get('sure') else ' (osäker)'))
    if orb.get('inliers') is not None:
        delar.append(f"ORB {orb.get('inliers')}/{orb.get('andra_bast', '–')}")
    hel = (mo.get('hel') or {})
    if hel.get('namn'):
        delar.append(f"modellen: {hel['namn']} ({hel.get('marginal', 0):.2f})")
    if s.get('par'):
        delar.append(f"par: {s['par'].get('dom', '')}")
    return ' · '.join(delar)


def las(passmapp):
    """[(klippnamn, markning, [säkra spår i lägg-ordning], [osäkra spår])] — utsnittsmappar (_0-30s) hoppas över."""
    ut = []
    for d in sorted(glob.glob(os.path.join(passmapp, '*'))):
        fil = os.path.join(d, 'markning.json')
        if not os.path.isfile(fil) or '_' in os.path.basename(d):
            continue
        m = json.load(open(fil))
        spar = sorted((s for s in m['spar'] if s.get('lagg')), key=lambda s: s['lagg']['t'])
        sakra = [s for s in spar if s.get('dom') in SAKRA or s.get('dom') == 'baksida']
        osakra = [s for s in spar if s.get('dom') == 'osaker']
        ut.append((os.path.basename(d), m, sakra, osakra))
    return ut


def galleri(passnamn, ut):
    passmapp = os.path.join(ARBETE, passnamn)
    delar = [f'<!doctype html><html lang="sv"><head><meta charset="utf-8"><title>{html.escape(passnamn)}</title>'
             f'<style>{STIL}</style></head><body>',
             f'<h1>{html.escape(passnamn)} — stickprov av märkningen</h1>',
             '<p class="hint">Varje rad är ett kort vid lägg-ögonblicket: helkortet och remsan ur kortets hörn i 1080 '
             '(det modellen tränar på). Klicka på en bild: zoomen visar 4K-utsnittet. Namnet är det som används i '
             'träningen. <span class="M">M</span> = manuellt facit, <span class="O">O</span> = namnet ur A via ordningen, '
             '<span class="B">B</span> = baksida (tränas inte). Längst ned per klipp: de osäkra, som inte är med.</p>']
    tot = {'sakra': 0, 'osakra': 0, 'namn': set()}
    for klipp, m, sakra, osakra in las(passmapp):
        d = os.path.join(passmapp, klipp)
        n_namn = len({s['namn'] for s in sakra if s.get('dom') in SAKRA})
        delar.append(f'<h2>{html.escape(klipp)}</h2><p class="sum">{len(sakra)} spår i träningen ({n_namn} namn) · '
                     f'{len(osakra)} osäkra</p>')
        for s in sakra:
            kl = MARK.get(s.get('dom'), '')
            if s.get('utanfor_traning'):
                kl = 'G'          # golden-lekens namn: säkert, men tränas aldrig
            namn = s.get('namn') or ('baksida' if s.get('dom') == 'baksida' else '?')
            bilder = []
            for typ, cls in (('hel', 'hel'), ('remsa', 'remsa')):
                f10, f4 = laggfil(m, s, typ, '1080'), laggfil(m, s, typ, '4k')
                if not f10 and not f4:
                    continue
                src = os.path.join(d, (f10 or f4)['fil'])
                zoom = os.path.join(d, f4['fil']) if f4 else src
                bilder.append(f'<img class="{cls}" src="{b64(src)}" data-zoom="{b64(zoom)}">')
            if not bilder:   # baksidor utan filer: 4K-utsnittet ur cachen om det finns
                for u in (s.get('claude') or {}).get('svar') or []:
                    p = os.path.join(ROT, u.get('utsnitt') or '')
                    if u.get('utsnitt') and os.path.isfile(p):
                        bilder.append(f'<img class="hel" src="{b64(p)}">'); break
            delar.append(f'<div class="rad"><div class="txt"><div class="namn {kl}">{html.escape(namn)}'
                         f'{(" · " + kl) if kl else ""}</div><div class="meta">{html.escape(rad_meta(s))}</div></div>'
                         + ''.join(bilder) + '</div>')
            tot['sakra'] += 1
            if s.get('dom') in SAKRA:
                tot['namn'].add(s['namn'])
        if osakra:
            delar.append(f'<h3>Osäkra i {html.escape(klipp)} — inte i träningen</h3>')
            for s in osakra:
                cl = s.get('claude') or {}
                bild = ''
                for p in sorted(glob.glob(os.path.join(d, 'osaker', '4k', s['id'] + '-*.jpg'))):
                    bild = f'<img class="osaker" src="{b64(p)}">'; break
                delar.append(f'<div class="rad"><div class="txt"><div class="namn U">{html.escape(cl.get("namn") or "–")}'
                             f'</div><div class="meta">{html.escape(s["id"])} · {html.escape(str(s.get("varfor") or ""))}'
                             f' · {html.escape(rad_meta(s))}</div></div>{bild}</div>')
                tot['osakra'] += 1
    delar.append('<div id="zoom"><img></div><script>' + SKRIPT + '</script></body></html>')
    with open(ut, 'w') as f:
        f.write('\n'.join(delar))
    return tot


def kontaktark(passnamn, mapp, per_ark=20, bredd=300):
    """Kontaktark för sessionens ögon: 4K-helkortet vid lägget, med id · namn · dom under. Osäkra på egna ark."""
    from PIL import Image, ImageDraw, ImageFont
    os.makedirs(mapp, exist_ok=True)
    passmapp = os.path.join(ARBETE, passnamn)
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 18)
    except Exception:
        font = ImageFont.load_default()
    skrivna = []
    for klipp, m, sakra, osakra in las(passmapp):
        d = os.path.join(passmapp, klipp)
        grupper = [('sakra', sakra), ('osakra', osakra)]
        for namn_grupp, spar in grupper:
            poster = []
            for s in spar:
                if namn_grupp == 'sakra':
                    f4 = laggfil(m, s, 'hel', '4k')
                    p = os.path.join(d, f4['fil']) if f4 else None
                    if not p:
                        for u in (s.get('claude') or {}).get('svar') or []:
                            if u.get('utsnitt') and os.path.isfile(os.path.join(ROT, u['utsnitt'])):
                                p = os.path.join(ROT, u['utsnitt']); break
                    etikett = f"{s['id']} · {s.get('namn') or s.get('dom')} · {MARK.get(s.get('dom'), 'S')}"
                else:
                    kand = sorted(glob.glob(os.path.join(d, 'osaker', '4k', s['id'] + '-*.jpg')))
                    p = kand[0] if kand else None
                    etikett = f"{s['id']} · Claude: {(s.get('claude') or {}).get('namn') or '–'} · {s.get('varfor') or ''}"
                if p and os.path.isfile(p):
                    poster.append((p, etikett))
            for i in range(0, len(poster), per_ark):
                del_ = poster[i:i + per_ark]
                kol, hojd_bild, text_h = 5, int(bredd * 1.4), 46
                rader = (len(del_) + kol - 1) // kol
                ark = Image.new('RGB', (kol * (bredd + 10) + 10, rader * (hojd_bild + text_h + 10) + 10), (20, 20, 20))
                rit = ImageDraw.Draw(ark)
                for j, (p, etikett) in enumerate(del_):
                    im = Image.open(p).convert('RGB')
                    im.thumbnail((bredd, hojd_bild))
                    x = 10 + (j % kol) * (bredd + 10); y = 10 + (j // kol) * (hojd_bild + text_h + 10)
                    ark.paste(im, (x, y))
                    for r, txt in enumerate(_bryt(etikett, 30)[:2]):
                        rit.text((x, y + hojd_bild + 2 + r * 21), txt, fill=(240, 240, 240), font=font)
                ut = os.path.join(mapp, f'{klipp}-{namn_grupp}-{i // per_ark + 1:02d}.jpg')
                ark.save(ut, quality=88)
                skrivna.append((ut, len(del_)))
    return skrivna


def _bryt(s, n):
    ord_, rader, rad = s.split(' '), [], ''
    for o in ord_:
        if len(rad) + len(o) + 1 > n and rad:
            rader.append(rad); rad = o
        else:
            rad = (rad + ' ' + o).strip()
    if rad:
        rader.append(rad)
    return rader


def main():
    import argparse
    p = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    p.add_argument('passnamn', help='passmappens namn under dev/material/arbete/markning/')
    p.add_argument('--ut', default=None, help='HTML-filen (förval markning/stickprov-<pass>.html)')
    p.add_argument('--ark', default=None, help='skriv kontaktark (jpg) till den här mappen i stället för HTML')
    a = p.parse_args()
    passnamn = os.path.basename(a.passnamn.rstrip('/'))
    if a.ark:
        for ut, n in kontaktark(passnamn, a.ark):
            print(f'{ut}: {n} kort')
        return
    ut = a.ut or os.path.join(ARBETE, f'stickprov-{passnamn}.html')
    tot = galleri(passnamn, ut)
    mb = os.path.getsize(ut) / 1e6
    print(f'{ut}: {tot["sakra"]} spår i träningen ({len(tot["namn"])} namn), {tot["osakra"]} osäkra, {mb:.1f} MB')


if __name__ == '__main__':
    main()

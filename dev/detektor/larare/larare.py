#!/usr/bin/env python3
"""Grind 1 (MES-288): OWLv2 som lärare på träningsrutor — lådorna och kontaktarket.

    python dev/detektor/larare/larare.py kor      # OWLv2 på rutorna i rutor.json → owlv2.json (råa lådor ≥ 0,02)
    python dev/detektor/larare/larare.py rita     # filtren, de ritade bilderna och index.html

Exakt nollprovets inställningar (dev/detektor/NOLLPROV.md): OWLv2 base
(google/owlv2-base-patch16-ensemble), textfrågorna "a photo of a playing
card / trading card / card / magic the gathering card" i samma anrop,
tröskel 0,16, klassoberoende NMS 0,6, storleksfiltret (0,4–1,6 × kortets
yta) och inneslutningsregeln (släng en låda som till 80 % ligger inuti en
starkare). Bilden går in som den är; processorn fyller ut till kvadrat
och skalar till 960 × 960.

Kortets yta per källa: medianen av de säkra lådorna (poäng ≥ 0,3, efter NMS
och inneslutning) över källans alla rutor. Appen vet kortstorleken från
uppstarten; här finns ingen uppstart, så den uppskattas ur rutorna och
kontrolleras med ögat på kontaktarket.

Varje bild prövas med delning.krav_traning före körningen.
Kör med nice -n 19, och efter sh dev/detektor/vanta-golden.sh.
"""
import html, json, os, sys, time

HAR = os.path.dirname(os.path.abspath(__file__))
DET = os.path.dirname(HAR)
ROT = os.path.dirname(os.path.dirname(DET))
sys.path.insert(0, DET)
from delning import krav_traning  # noqa: E402
from matt import nms, inneslutning, NMS_IOU  # noqa: E402

ARB = os.path.join(ROT, 'dev', 'material', 'arbete', '2026-09-28-mes-288-larare')
FRAGOR = ['playing card', 'trading card', 'card', 'magic the gathering card']
TROSKEL = 0.16
LAG = 0.02
SAKER = 0.3
STORLEK = (0.4, 1.6)

# Min räkning med ögat per ruta (Claude, 2026-09-28), efter att de ritade
# bilderna setts igenom — INTE mätt mot ritat facit. Kolumnerna:
# egna = kort med en egen låda · saknas = kort utan egen låda (under handen,
# i kanten, eller inne i en låda över flera) · flera = lådor över två eller fler
# kort · lek = lådor på leken (library, kortbaksidor i grön ficka) ·
# annat = lådor på annat än kort (hand, Mesas ritade rutor) · dubbl = två lådor
# på samma kort. Kort i bild ≈ egna + saknas; i landhögarna är antalet ungefärligt.
BEDOMNING = {
    'parti-0060': (2, 0, 0, 1, 1, 0, 'graveyard-ramen (Mesas ritade ruta, tom) fick en låda'),
    'parti-0180': (3, 4, 1, 1, 2, 0, 'Mesas gröna spårruta på handleden och graveyard-ramen fick lådor; två kort delvis under handen föll på storleksfiltret; landhögen blev en låda'),
    'parti-0240': (8, 2, 0, 1, 1, 0, 'en tom grön spårruta (kortet redan borta) fick en låda'),
    'parti-0300': (5, 4, 1, 1, 1, 0, 'spårrutan på underarmen fick en låda; korten under armen föll på storleksfiltret'),
    'parti-0360': (7, 2, 0, 0, 0, 0, 'rörelseoskärpa: lådor på korten under den suddiga handen, ingen på handen'),
    'parti-0420': (7, 3, 1, 1, 1, 0, 'graveyard-ramen fick en låda; kort som sticker fram under andra saknas'),
    'parti-0480': (6, 6, 2, 1, 0, 0, 'tappade länder omlott: två lådor över flera kort'),
    'parti-0570': (8, 2, 1, 0, 1, 0, 'en låda på den suddiga handen över leken'),
    'parti-0660': (7, 6, 2, 1, 0, 0, 'landkolumnerna: en låda över hela kolumnen, de enskilda korten föll på storleksfiltret'),
    'parti-0780': (12, 2, 1, 1, 0, 0, 'bäst av partiets rutor: också kort omlott får egna lådor'),
    'parti-0810': (8, 4, 0, 1, 1, 0, 'Mesas röda spårruta över handen fick en låda; kort under handen saknas'),
    'parti-0900': (6, 4, 2, 0, 1, 0, 'spårrutan runt handen som bär ett kort fick en låda (kortet i handen fick en egen)'),
    'parti-0990': (8, 6, 2, 1, 0, 0, 'ett tappat land längst ner utan låda; swamp-kolumnen en låda'),
    'parti-1110': (8, 6, 2, 1, 0, 1, 'två nästan lika lådor på samma land'),
    'parti-1170': (4, 13, 3, 1, 0, 0, 'tre landkolumner blev tre lådor — sämst av rutorna'),
    'pass1-0000': (0, 0, 0, 0, 0, 0, 'tomt bord: inga lådor (rätt)'),
    'pass1-0018': (1, 0, 0, 0, 0, 0, ''),
    'pass1-0036': (1, 0, 0, 0, 0, 0, 'kortet under handen hittas; handen och Mesas stora gröna ram utan låda (rätt)'),
    'mes139-0010': (1, 0, 0, 0, 0, 0, 'kortasken och handen utan låda (rätt)'),
    'mes139-0055': (0, 1, 0, 0, 0, 0, 'kraftig oskärpa: lådan på kortet föll på storleksfiltret'),
    'mes138-0000': (1, 0, 0, 0, 0, 0, 'graveyard-kortet under handen, poäng 0,18'),
    'mes138-0024': (1, 0, 0, 1, 1, 0, 'leken i plastficka fick två lådor: en på leken, en på Mesas library-ram'),
    'pacifism-0012': (1, 0, 0, 0, 0, 0, 'handen utan låda (rätt)'),
    'pacifism-0024': (0, 1, 0, 0, 0, 0, 'kortet under handen missas'),
}


def las_rutor():
    with open(os.path.join(ARB, 'rutor.json'), encoding='utf-8') as f:
        rutor = json.load(f)
    for r in rutor:
        krav_traning(os.path.join(ARB, r['fil']))
        krav_traning(os.path.join(ROT, r['kalla']))
    return rutor


def kor():
    import torch
    from PIL import Image
    from transformers import Owlv2Processor, Owlv2ForObjectDetection
    torch.set_grad_enabled(False)
    rutor = las_rutor()
    proc = Owlv2Processor.from_pretrained('google/owlv2-base-patch16-ensemble')
    m = Owlv2ForObjectDetection.from_pretrained('google/owlv2-base-patch16-ensemble').eval()
    texter = [[f'a photo of a {q}' for q in FRAGOR]]

    def detekt(im):
        inp = proc(text=texter, images=im, return_tensors='pt')
        out = m(**inp)
        s = max(im.size)  # OWLv2 fyller ut till kvadrat
        res = proc.post_process_object_detection(out, threshold=LAG, target_sizes=torch.tensor([[s, s]]))[0]
        return [[*b.tolist(), float(sc), FRAGOR[int(l)]] for b, sc, l in zip(res['boxes'], res['scores'], res['labels'])]

    print(f'torch-trådar {torch.get_num_threads()}, {len(rutor)} rutor', flush=True)
    ut = {'modell': 'google/owlv2-base-patch16-ensemble', 'licens': 'Apache-2.0', 'fragor': FRAGOR, 'lag_troskel': LAG, 'bilder': {}}
    for i, r in enumerate(rutor):
        im = Image.open(os.path.join(ARB, r['fil'])).convert('RGB')
        W, H = im.size
        if i == 0:
            detekt(im)  # uppvärmning, tiden kastas
        t = time.perf_counter()
        det = detekt(im)
        ms = round((time.perf_counter() - t) * 1000)
        ut['bilder'][r['fil']] = {'W': W, 'H': H, 'ms': ms, 'det': [[d[0] / W, d[1] / H, d[2] / W, d[3] / H, d[4], d[5]] for d in det]}
        print(f'  {r["fil"]:28} {W}×{H} {ms:6} ms  {len(det):4} råa', flush=True)
        with open(os.path.join(ARB, 'owlv2.json'), 'w', encoding='utf-8') as f:
            json.dump(ut, f)
    ms = sorted(b['ms'] for b in ut['bilder'].values())
    print(f'median {ms[len(ms) // 2]} ms per ruta')


def yta(d):
    return (d[2] - d[0]) * (d[3] - d[1])


def filtrera(det, kort):
    """-> (behållna, bortfiltrerade på storlek). Samma ordning som matt.filtrera:
    tröskel, storlek, NMS, inneslutning."""
    over = [d for d in det if d[4] >= TROSKEL]
    ok = [d for d in over if STORLEK[0] * kort <= yta(d) <= STORLEK[1] * kort]
    bort = [d for d in nms([d for d in over if d not in ok], NMS_IOU)]
    return inneslutning(nms(ok, NMS_IOU)), bort


def kortytor(rutor, res):
    per = {}
    for r in rutor:
        kalla = r['fil'].split('/')[-1].rsplit('-', 1)[0]
        det = res['bilder'][r['fil']]['det']
        saker = inneslutning(nms([d for d in det if d[4] >= SAKER], NMS_IOU))
        per.setdefault(kalla, []).extend(yta(d) for d in saker)
    return {k: sorted(v)[len(v) // 2] for k, v in per.items() if v}


def rita():
    from PIL import Image, ImageDraw, ImageFont
    rutor = las_rutor()
    with open(os.path.join(ARB, 'owlv2.json'), encoding='utf-8') as f:
        res = json.load(f)
    ytor = kortytor(rutor, res)
    os.makedirs(os.path.join(ARB, 'ritade'), exist_ok=True)
    def typsnitt(storlek):
        try:
            return ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', storlek)
        except OSError:
            return ImageFont.load_default()
    kort = []
    for r in rutor:
        kalla = r['fil'].split('/')[-1].rsplit('-', 1)[0]
        b = res['bilder'][r['fil']]
        behall, bort = filtrera(b['det'], ytor[kalla])
        im = Image.open(os.path.join(ARB, r['fil'])).convert('RGB')
        W, H = im.size
        skala = 2 if W < 900 else 1  # små skärmklipp ritas i dubbel storlek så att poängen går att läsa
        im = im.resize((W * skala, H * skala), Image.LANCZOS)
        d = ImageDraw.Draw(im)
        # etiketter och linjer i proportion till bilden, så att de går att läsa på kontaktarket
        fs = max(18, round(im.size[0] / 50))
        font = typsnitt(fs)
        lw = max(3, round(im.size[0] / 300))
        for x in bort:
            x0, y0, x1, y1 = x[0] * W * skala, x[1] * H * skala, x[2] * W * skala, x[3] * H * skala
            d.rectangle((x0, y0, x1, y1), outline=(255, 150, 0), width=max(2, lw // 2))
            d.text((x0 + 3, y1 - fs - 3), f'{x[4]:.2f} storlek', fill=(255, 150, 0), font=font)
        for n, x in enumerate(sorted(behall, key=lambda x: (x[1], x[0])), 1):
            x0, y0, x1, y1 = x[0] * W * skala, x[1] * H * skala, x[2] * W * skala, x[3] * H * skala
            d.rectangle((x0, y0, x1, y1), outline=(255, 0, 255), width=lw)
            t = f'{n}: {x[4]:.2f}'
            tw = d.textlength(t, font=font)
            d.rectangle((x0, y0, x0 + tw + 6, y0 + fs + 4), fill=(255, 0, 255))
            d.text((x0 + 3, y0 + 1), t, fill=(255, 255, 255), font=font)
        namn = os.path.basename(r['fil'])
        im.save(os.path.join(ARB, 'ritade', namn), quality=88)
        kort.append(dict(r, bild=namn, n=len(behall), bort=len(bort), ms=b['ms'], kortyta=ytor[kalla],
                         lador=[[round(v, 4) for v in x[:4]] + [round(x[4], 3)] for x in behall]))
    with open(os.path.join(ARB, 'lador.json'), 'w', encoding='utf-8') as f:
        json.dump({'installning': dict(troskel=TROSKEL, nms=NMS_IOU, storlek=STORLEK, inneslutning=0.8, fragor=FRAGOR),
                   'kortyta': ytor, 'rutor': kort}, f, ensure_ascii=False, indent=1)
    skriv_html(kort, ytor)
    print(f'{len(kort)} rutor ritade, {sum(k["n"] for k in kort)} lådor; kortyta per källa {ytor}')


def skriv_html(kort, ytor):
    rel = os.path.relpath(os.path.join(ARB, 'ritade'), HAR)
    kallnamn = {'parti': 'Partiet 2026-09-21 (skärminspelning av datorn)', 'pass1': 'Provkort pass 1, 2026-09-16 (datorn)',
                'mes139': 'MES-139 library, 2026-09-16 (telefonens skärm)', 'mes138': 'MES-138 library, 2026-09-14 (datorn)',
                'pacifism': 'Provkort Pacifism, 2026-09-21 (datorn)'}
    rader = []
    for i, k in enumerate(kort, 1):
        kalla = k['bild'].rsplit('-', 1)[0]
        m, s = divmod(int(k['sekund']), 60)
        b = BEDOMNING.get(k['bild'][:-4])
        ogat = (f'<br><span class="oga">Ögat: {b[0]} egna, {b[1]} saknas, {b[2]} över flera, {b[3]} på leken, {b[4]} på annat'
                f'{f", {b[5]} dubblett" if b[5] else ""}{" — " + html.escape(b[6]) if b[6] else ""}</span>') if b else ''
        rader.append(f'''<figure id="r{i}"><img loading="lazy" src="{html.escape(rel)}/{html.escape(k["bild"])}" alt="ruta {i}">
<figcaption><b>{i}.</b> {html.escape(kallnamn.get(kalla, kalla))} · {m}:{s:02d} · {html.escape(k["vad"])}<br>
<span class="n">{k["n"]} lådor</span>{f' · {k["bort"]} bort på storlek' if k["bort"] else ''} · <code>{html.escape(k["kalla"])}</code>{ogat}</figcaption></figure>''')
    t = [sum(b[i] for b in BEDOMNING.values()) for i in range(6)]
    summa = (f'<p><b>Min räkning med ögat, alla {len(kort)} rutor:</b> {t[0] + t[1]} kort i bild, {t[0]} med egen låda, '
             f'{t[1]} utan; {t[2]} lådor över flera kort, {t[3]} på leken, {t[4]} på annat än kort, {t[5]} dubblett. '
             'Ögonmått, inte mätt mot ritat facit.</p>')
    sida = f'''<!doctype html>
<html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Läraren på träningsrutor</title>
<style>
:root {{ --bg:#f6f5f2; --fg:#1d1d1f; --mut:#5f5f66; --kort:#fff; --kant:#dddbd5; }}
@media (prefers-color-scheme: dark) {{ :root {{ --bg:#16161a; --fg:#ecebe8; --mut:#a3a2a8; --kort:#222228; --kant:#34343c; }} }}
body {{ margin:0; background:var(--bg); color:var(--fg); font:15px/1.45 -apple-system, system-ui, sans-serif; }}
main {{ max-width:1500px; margin:0 auto; padding:16px; }}
h1 {{ font-size:22px; margin:8px 0 4px; }}
p {{ color:var(--mut); max-width:900px; margin:6px 0; }}
.lg span {{ display:inline-block; padding:1px 8px; border-radius:4px; margin-right:8px; color:#fff; font-weight:600; }}
.grid {{ display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, 640px), 1fr)); gap:16px; margin-top:16px; }}
figure {{ margin:0; background:var(--kort); border:1px solid var(--kant); border-radius:8px; overflow:hidden; }}
figure img {{ width:100%; display:block; }}
figcaption {{ padding:8px 10px; font-size:14px; }}
figcaption code {{ color:var(--mut); font-size:12px; word-break:break-all; }}
.n {{ font-weight:600; }}
.oga {{ color:var(--mut); }}
</style></head><body><main>
<h1>OWLv2 som lärare — {len(kort)} träningsrutor (MES-288, grind 1)</h1>
<p>Varje bild är en ruta ur en <b>träningsinspelning</b> (aldrig prov, se <code>dev/detektor/DELNING.md</code>).
Lådorna är OWLv2 base med exakt nollprovets inställningar: textfrågorna playing card / trading card / card /
magic the gathering card, tröskel 0,16, NMS 0,6, storleksfilter 0,4–1,6 × kortets yta och inneslutningsregeln.</p>
<p class="lg"><span style="background:#ff00ff">1: 0,45</span> en låda läraren skulle ge som facit (nummer: poäng)
&nbsp; <span style="background:#ff9600">0,20 storlek</span> en låda över tröskeln som storleksfiltret tog bort</p>
<p><b>Titta efter:</b> kort utan låda, lådor på händer, telefon eller appens egna rutor, och lådor över flera kort.
De streckade gröna, gula och röda rutorna i partiets bilder är <b>Mesas egna spår</b>, inritade i skärminspelningen — inte lärarens.
Bedömningen per ruta står i <code>dev/detektor/larare/LARARE.md</code>.</p>
{summa}
<div class="grid">
{chr(10).join(rader)}
</div></main></body></html>
'''
    with open(os.path.join(HAR, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(sida)


if __name__ == '__main__':
    steg = sys.argv[1] if len(sys.argv) > 1 else ''
    if steg == 'kor':
        kor()
    elif steg == 'rita':
        rita()
    else:
        print(__doc__)

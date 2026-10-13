"""Problemrapportens facit (uppföljning av MES-366/368): ett spårs utsnitt ur en
stillbild, och kontextbilden med spårets ruta inritad. Anropas av till-fall.cjs
(--spar), inte för hand.

    python utsnitt.py '<json>'

json = { "bild": stillbilden, "ut": utsnittets jpg (eller null), "kontext": kontextens jpg
         (eller null), "ruta": {x,y,w,h} (andelar av bilden), "maskade": [{x,y,w,h,spar}],
         "spar": spårets id, "marg": 0.08 }

Utsnittet görs som appens beskar(): rutan + 8 % marginal på var sida, rak, och
vridet -90° när rutan ligger (bredare än hög) så att kortet står. De maskade
rutorna (de kort som ligger ÖVER spåret) målas grå (128) som appens maskaTackt,
en bildpunkt större åt alla håll. Inget skalas upp: bredden som skrivs ut är
den bilden har. Kontextbilden: hela stillbilden uppskalad till högst 720 px
bredd (högst 2x), de maskade rutorna grå och streckade, spårets ruta röd.

Skriver { "w", "h", "kontext": {"w","h"} } som JSON på stdout.
"""
import json
import sys

from PIL import Image, ImageDraw

GRA = (128, 128, 128)
ROD = (255, 45, 85)


def px(q, W, H):
    return q["x"] * W, q["y"] * H, q["w"] * W, q["h"] * H


def utsnitt(im, ruta, maskade, marg):
    W, H = im.size
    x, y, w, h = px(ruta, W, H)
    im = im.copy()
    d = ImageDraw.Draw(im)
    for q in maskade:
        a, b, c, e = px(q, W, H)
        d.rectangle([a - 1, b - 1, a + c + 1, b + e + 1], fill=GRA)
    x0, y0 = max(0, round(x - w * marg)), max(0, round(y - h * marg))
    x1, y1 = min(W, round(x + w * (1 + marg))), min(H, round(y + h * (1 + marg)))
    ut = im.crop((x0, y0, x1, y1))
    if ut.width > ut.height:   # liggande: som beskar(), -90° (moturs i bilden = rotate(90) i PIL)
        ut = ut.rotate(90, expand=True)
    return ut


def streckad(d, a, b, c, e, farg, langd=6, glapp=4, bredd=2):
    for (p, q, r, s) in ((a, b, a + c, b), (a, b + e, a + c, b + e), (a, b, a, b + e), (a + c, b, a + c, b + e)):
        L = max(abs(r - p), abs(s - q))
        t = 0.0
        while t < L:
            u = min(L, t + langd)
            if r != p:
                d.line([(p + t, q), (p + u, q)], fill=farg, width=bredd)
            else:
                d.line([(p, q + t), (p, q + u)], fill=farg, width=bredd)
            t = u + glapp


def kontext(im, ruta, maskade, spar):
    sk = max(1.0, min(2.0, 720.0 / im.width))
    W, H = round(im.width * sk), round(im.height * sk)
    k = im.resize((W, H), Image.LANCZOS).convert("RGBA")
    lager = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lager)
    for q in maskade:
        a, b, c, e = px(q, W, H)
        d.rectangle([a, b, a + c, b + e], fill=(110, 110, 110, 140))
    k = Image.alpha_composite(k, lager).convert("RGB")
    d = ImageDraw.Draw(k)
    for q in maskade:
        a, b, c, e = px(q, W, H)
        streckad(d, a, b, c, e, (232, 232, 232))
        text = "maskad" + (" %s" % q["spar"] if q.get("spar") is not None else "")
        d.rectangle([a, b + e, a + 7 * len(text) + 8, b + e + 15], fill=(70, 70, 70))
        d.text((a + 4, b + e + 2), text, fill=(255, 255, 255))
    a, b, c, e = px(ruta, W, H)
    d.rectangle([a, b, a + c, b + e], outline=ROD, width=4)
    text = "spår %s" % spar
    d.rectangle([a, max(0, b - 16), a + 7 * len(text) + 8, max(16, b)], fill=ROD)
    d.text((a + 4, max(0, b - 16) + 2), text, fill=(255, 255, 255))
    return k


def main():
    o = json.loads(sys.argv[1])
    im = Image.open(o["bild"]).convert("RGB")
    svar = {}
    if o.get("ut"):
        u = utsnitt(im, o["ruta"], o.get("maskade") or [], o.get("marg", 0.08))
        u.save(o["ut"], quality=92)
        svar.update(w=u.width, h=u.height)
    if o.get("kontext"):
        k = kontext(im, o["ruta"], o.get("maskade") or [], o.get("spar"))
        k.save(o["kontext"], quality=88)
        svar["kontext"] = {"w": k.width, "h": k.height}
    print(json.dumps(svar))


if __name__ == "__main__":
    main()

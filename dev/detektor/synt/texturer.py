"""Ritade bordsytor till de syntetiska borden (MES-288 grind 1b).

Allt genereras här med numpy och OpenCV — ingen bild hämtas, ingen licens
behövs. Varje funktion tar en numpy-Generator och bildens storlek och ger en
BGR-bild (uint8).

  tra     träskiva: ådring längs en riktning, plankor med fogar, ljus ek till valnöt
  duk     vävd duk: grå, mörkblå, grön, röd, beige; mjuka veck
  matta   spelmatta i neopren: mörk botten med kornig yta, ibland ett tryckt
          konstverk (ett Scryfall-utsnitt, mörkat och mjukat) som på en riktig matta
  ljus    ljus laminatskiva
"""
import cv2
import numpy as np


def brus(rng, w, h, cell, oktaver=1):
    """Mjukt värdebrus 0..1: ett grovt slumprutnät, uppskalat bikubiskt."""
    ut = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(oktaver):
        c = max(2.0, cell / (2 ** o))
        gw, gh = int(w / c) + 3, int(h / c) + 3
        g = rng.random((gh, gw), dtype=np.float32)
        big = cv2.resize(g, (int(gw * c), int(gh * c)), interpolation=cv2.INTER_CUBIC)
        ut += amp * big[:h, :w]
        tot += amp
        amp *= 0.5
    return ut / tot


def _klamp(a):
    return np.clip(a, 0, 255).astype(np.uint8)


def tra(rng, w, h, skala=1.0):
    vinkel = rng.uniform(-0.25, 0.25) + (np.pi / 2 if rng.random() < 0.35 else 0)
    ljus = rng.choice(['ek', 'bjork', 'valnot', 'furu'])
    bas = {'ek': (95, 150, 190), 'bjork': (150, 190, 215), 'valnot': (45, 70, 100), 'furu': (110, 170, 210)}[ljus]  # BGR
    bas = np.array(bas, np.float32) * rng.uniform(0.85, 1.1)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    langs = xx * np.cos(vinkel) + yy * np.sin(vinkel)
    tvars = -xx * np.sin(vinkel) + yy * np.cos(vinkel)
    varp = brus(rng, w, h, 220 * skala, 3) * rng.uniform(15, 50) * skala
    frek = rng.uniform(0.12, 0.35) / skala          # ådringens linjer 9–26 px isär i 960-bilden
    ringar = np.sin((tvars + varp) * frek)
    ringar2 = np.sin((tvars + 0.6 * varp) * frek * 2.7 + 1.3)
    # fina fibrer: brus sträckt längs ådringen
    fiber = rng.random((h, w), dtype=np.float32)
    k = int(25 * skala) | 1
    fiber = cv2.GaussianBlur(fiber, (0, 0), sigmaX=0.6)
    kern = np.zeros((k, k), np.float32)
    kern[k // 2, :] = 1.0 / k
    R = cv2.getRotationMatrix2D((k / 2 - 0.5, k / 2 - 0.5), -np.degrees(vinkel), 1)
    kern = cv2.warpAffine(kern, R, (k, k))
    kern /= kern.sum() + 1e-6
    fiber = cv2.filter2D(fiber, -1, kern) - 0.5
    v = 1 + 0.045 * ringar + 0.025 * ringar2 + 0.9 * fiber + 0.12 * (brus(rng, w, h, 300 * skala, 2) - 0.5)
    # plankor: fogar tvärs ådringen med olika ton per planka
    bredd = rng.uniform(120, 260) * skala
    planka = np.floor((tvars + 5000) / bredd)
    ton = 1 + 0.08 * np.sin(planka * 12.9898 + rng.uniform(0, 6)) * rng.uniform(0.5, 1.5)
    fog = np.abs(((tvars + 5000) % bredd) - bredd / 2) > bredd / 2 - 1.2 * skala
    v = v * ton
    img = bas[None, None, :] * v[..., None]
    img[fog] *= 0.55
    return _klamp(img), f'trä ({ljus})'


def duk(rng, w, h, skala=1.0):
    farger = {'grå': (95, 95, 98), 'mörkblå': (95, 55, 35), 'grön': (55, 95, 40), 'röd': (40, 40, 125), 'beige': (160, 185, 200), 'svart': (32, 30, 30)}
    namn = rng.choice(list(farger))
    bas = np.array(farger[namn], np.float32) * rng.uniform(0.8, 1.15)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    p = rng.uniform(2.2, 4.0) * skala
    vav = np.sin(xx * 2 * np.pi / p) * np.sin(yy * 2 * np.pi / p)
    korn = rng.normal(0, 1, (h, w)).astype(np.float32)
    korn = cv2.GaussianBlur(korn, (0, 0), 0.7 * skala)
    veck = brus(rng, w, h, 350 * skala, 2)
    v = 1 + 0.05 * vav + 0.10 * korn + 0.35 * (veck - 0.5)
    return _klamp(bas[None, None, :] * v[..., None]), f'duk ({namn})'


def ljus(rng, w, h, skala=1.0):
    m = rng.uniform(175, 225)
    bas = np.array([m - rng.uniform(0, 15), m - rng.uniform(0, 8), m], np.float32)
    v = 1 + 0.03 * (brus(rng, w, h, 4 * skala) - 0.5) + 0.08 * (brus(rng, w, h, 400 * skala, 2) - 0.5)
    return _klamp(bas[None, None, :] * v[..., None]), 'ljus skiva'


def matta(rng, w, h, skala=1.0, konst=None):
    bas = np.array([rng.uniform(15, 45), rng.uniform(15, 40), rng.uniform(15, 40)], np.float32)
    korn = rng.normal(0, 1, (h, w)).astype(np.float32)
    korn = cv2.GaussianBlur(korn, (0, 0), 0.8 * skala)
    img = bas[None, None, :] * (1 + 0.12 * korn[..., None] + 0.25 * (brus(rng, w, h, 500 * skala, 2)[..., None] - 0.5))
    vad = 'spelmatta'
    if konst is not None and rng.random() < 0.5:
        # ett tryckt konstverk: täcker mattan, mörkat, mjukat och med tryckets raster
        kh, kw = konst.shape[:2]
        s = max(w / kw, h / kh) * rng.uniform(1.0, 1.5)
        big = cv2.resize(konst, (int(kw * s) + 1, int(kh * s) + 1), interpolation=cv2.INTER_CUBIC)
        ox, oy = rng.integers(0, big.shape[1] - w + 1), rng.integers(0, big.shape[0] - h + 1)
        big = big[oy:oy + h, ox:ox + w].astype(np.float32)
        big = cv2.GaussianBlur(big, (0, 0), 1.2 * skala)
        dim = rng.uniform(0.2, 0.5)
        img = img * 0.3 + big * dim * (1 + 0.08 * korn[..., None])
        vad = 'spelmatta med tryckt konstverk'
    return _klamp(img), vad


SORTER = {'tra': tra, 'duk': duk, 'ljus': ljus, 'matta': matta}

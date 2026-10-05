#!/usr/bin/env python3
"""Bildmodellen (MobileCLIP-S0) finjusteras på syntetiska bord OCH riktiga utsnitt ur Jespers inspelningar — Kaggle.

Piloten (2026-10-05, v1) tränade bara på syntetiska bord ur Scryfall: nästan felfri på syntetisk validering men
inte bättre i golden (minnet bildmodell-pilot-traning). v2 (steg 4 i handovern 2026-10-05) blandar in riktiga
utsnitt ur pass 2, 3 och 5 — märkningen (mark.py) gav namn ur 4K, och dataset.py packar utsnitten i telefonens
kvalitet (tel) och 1080 till ett platt dataset med manifest.json. 4K tränas aldrig.

Golden-lekens namn (utom basländerna) är UTANFÖR träningen, så att remsbänken och golden mäter kort modellen
aldrig sett: GOLDEN nedan för de syntetiska, utanfor_traning i märkningen för de riktiga (dataset.py stoppar
om ett slinker igenom, och huvud() kontrollerar mot GOLDEN igen). Basländerna är med (alla konstverk).

Receptet följer appen (dev/remsa/lib.py, embed.js): 256 × 256 RGB 0–1, bilden tryckt till kvadrat,
remsan = kortets översta 14 % (Detektor.REMSA), titeldelen = remsans vänstra 55 % (T.remsaTitel).

Riktiga par (fråga, referens, namn, typ): frågan är det riktiga utsnittet, vridet upprätt (manifestets rot) och
lätt augmenterat (± 5 % beskärning, liten ljus/kontrast, ingen komprimering — bilden är redan telefonens);
referensen är Scryfall-bilden för konstverket ORB matchade (manifestets konstverk), annars ett slumpvalt
konstverk för namnet (basland: poolens och de syntetiska konstverken). hel → hela bilden; remsa → översta 14 %;
titel → remsutsnittets vänstra 55 % mot referensens titeldel. Varannan bild i varje batch är riktig (de riktiga
översamplas). Vikterna hel/remsa/titel 0,4/0,4/0,2; samma namn är aldrig negativ (två Mountain är inte fel).

Valideringen: den syntetiska som förut (fore/efter), och på riktiga bilder: manifestets val-namn (vart femte namn,
aldrig tränade — inte heller syntetiskt) mot en lek av alla namn i passen + poolens basland, topp-1 per variant
(tel, 1080) och typ (hel, remsa) — riktiga_fore / riktiga_efter / riktiga_vald i matt.json. --val-klipp
pass/klipp,… håller också hela klipp utanför träningen (samma namn, osedd inspelning): riktiga_klipp_*.

Utdata (UT, /kaggle/working): mobileclip-s0-mesa-v2.onnx (in pixel_values, ut image_embeds, fp32, dynamisk batch
— samma som Xenova-filen appen laddar), matt.json, prov-fragor.jpg, prov-riktiga.jpg (riktiga frågor bredvid
sina referenser — titta på dem), logg.txt.

    python mesa_remsa_tran.py            # Kaggle (GPU): hittar datasetet själv under /kaggle/input (manifest.json);
                                         # utan dataset stannar den (lägg det i kernel-metadata.json:s dataset_sources)
    python mesa_remsa_tran.py --utan-riktiga                       # bara syntetiska (som piloten)
    python mesa_remsa_tran.py --rok --riktiga <mapp> --ut <ut>     # lokalt på CPU: ≤ 200 riktiga, 40 steg
    python mesa_remsa_tran.py --bara-data --ut <mapp>              # lokalt: bara frågebilder (ingen modell)

Lokalt (--rok utan Kaggle) installeras inget: torch, onnx och onnxruntime ur venv:en, och ml-mobileclip + timm
+ open_clip via PYTHONPATH (t.ex. pip install --target <mapp> --no-deps …). Scryfall-bilder, checkpointen och
Xenova-filen cachas i --cache (förval <ut>/cache).

Fällor (minnet bildmodell-pilot-traning): ml-mobileclip:s create_model omparametriserar redan (ingen
reparameterize vid export); SEBlock:s avg_pool2d måste bytas mot adaptive för ONNX med dynamisk batch;
Scryfalls bulk är JSONL.gz sedan 2026 (jsonl_download_uri). Lokalt aldrig DataLoader-arbetare (macOS spawn
kör om modulens toppnivå).
"""
import glob, json, math, os, random, subprocess, sys, time, urllib.request

ARGS = sys.argv[1:]


def arg(namn, standard=None):
    return ARGS[ARGS.index(namn) + 1] if namn in ARGS and ARGS.index(namn) + 1 < len(ARGS) else standard


ROK = '--rok' in ARGS
BARA_DATA = '--bara-data' in ARGS
PA_KAGGLE = os.path.isdir('/kaggle/working')
UT = arg('--ut', '/kaggle/working')
TEMP = '/kaggle/temp' if PA_KAGGLE else arg('--cache', os.path.join(UT, 'cache'))
CACHE = os.path.join(UT, 'scryfall') if BARA_DATA else os.path.join(TEMP, 'scryfall')
VAL_KLIPP = [x for x in (arg('--val-klipp', '') or '').split(',') if x]
os.makedirs(UT, exist_ok=True); os.makedirs(CACHE, exist_ok=True); os.makedirs(TEMP, exist_ok=True)
LOGG = open(os.path.join(UT, 'logg.txt'), 'a')


def logg(*a):
    s = time.strftime('%H:%M:%S ') + ' '.join(str(x) for x in a)
    print(s, flush=True); LOGG.write(s + '\n'); LOGG.flush()


import numpy as np  # noqa: E402
import cv2  # noqa: E402

SIDA, REMSA, TITEL = 256, 0.14, 0.55
N_NAMN = 60 if ROK else 2400          # namn i träningen (utom basländerna)
N_VAL = 20 if ROK else 300            # namn bara i valideringen
BAS_KONST = 8 if ROK else 60          # konstverk per basland
TRAN_MIN = 2 if ROK else 170          # minuter träning
BATCH = 32 if ROK else 96
N_RIKTIGA_ROK = 200                   # --rok: högst så många riktiga utsnitt (träning + validering)
GOLDEN = {'Ancestral Blade', 'Aphelia, Viper Whisperer', 'Coat with Venom', 'Danitha Capashen, Paragon', 'Faithful Pikemaster',
          'Fencing Ace', 'Flutterfox', 'Gorgon Flail', 'Hooded Blightfang', 'Killing Glare', 'Maul of the Skyclaves',
          'Militant Inquisitor', 'Mirran Bardiche', "Night's Whisper", 'Pacifism', "Pharika's Chosen", 'Resistance Reunited',
          'Scourge of the Undercity', 'Serpent Assassin', 'Thriving Heath', 'Thriving Moor', 'Trusty Retriever', 'Ukud Cobra',
          "Valkyrie's Sword", 'Venomous Hierophant', "Vraska's Finisher", 'Additive Evolution', 'Matterbending Mage',
          "Proctor's Gaze", 'Virtue of Knowledge // Vantress Visions', 'Virtue of Knowledge'}
BAS = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest']
UA = {'User-Agent': 'mesa-remsa-pilot/0.1 (funk.jesper@gmail.com)', 'Accept': 'application/json'}


# ── Scryfall ────────────────────────────────────────────────────────────────
def hamta(url, fil=None, tries=4):
    for i in range(tries):
        try:
            d = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
            if fil:
                open(fil, 'wb').write(d)
            return d
        except Exception:  # noqa: BLE001
            if i == tries - 1:
                raise
            time.sleep(1 + 2 * i)


def las_bulk():
    """Scryfalls unique_artwork (ett kort per konstverk), engelska papperskort med bild."""
    fil = os.path.join(TEMP, 'unique_artwork.jsonl')
    if os.path.exists(fil):
        text = open(fil, encoding='utf-8').read()
    else:
        bulk = json.loads(hamta('https://api.scryfall.com/bulk-data'))
        x = next(x for x in bulk['data'] if x['type'] == 'unique_artwork')
        uri = x.get('jsonl_download_uri') or x.get('download_uri')   # Scryfall levererar JSONL.gz sedan 2026
        logg('hämtar unique_artwork …', uri)
        d = hamta(uri)
        if uri.endswith('.gz'):
            import gzip
            d = gzip.decompress(d)
        text = d.decode('utf-8')
        if 'jsonl' not in uri:
            text = '\n'.join(json.dumps(c) for c in json.loads(text))
        open(fil, 'w', encoding='utf-8').write(text)
    return [json.loads(r) for r in text.splitlines() if r.strip()]


def bild_url(c):
    iu = c.get('image_uris') or ((c.get('card_faces') or [{}])[0].get('image_uris')) or {}
    return iu.get('normal')


def valj_kort(rng, alla, uteslut_val=(), uteslut_tran=()):
    """De syntetiska korten. uteslut_val: de riktiga namnen (syntetisk validering ska vara osedd);
    uteslut_tran: de riktiga valideringsnamnen (tränas aldrig, inte heller syntetiskt)."""
    bra = [c for c in alla if c.get('lang') == 'en' and 'paper' in c.get('games', []) and c.get('image_uris', {}).get('normal')
           and c.get('layout') in ('normal', 'leveler', 'class', 'saga', 'adventure', 'prototype', 'mutate', 'case')
           and not c.get('digital') and c.get('image_status') in ('highres_scan', 'lowres')]
    per_namn = {}
    for c in bra:
        per_namn.setdefault(c['name'], []).append(c)
    namn = sorted(n for n in per_namn if n not in GOLDEN and n.split(' // ')[0] not in GOLDEN and n not in BAS
                  and not per_namn[n][0].get('type_line', '').startswith('Basic'))
    rng.shuffle(namn)
    val = [n for n in namn if n not in uteslut_val][:N_VAL]
    vs = set(val)
    tran = [n for n in namn if n not in vs and n not in uteslut_tran][:N_NAMN]
    kort = []
    for n in tran + val:
        c = rng.choice(per_namn[n])
        kort.append({'namn': n, 'id': c['id'], 'url': c['image_uris']['normal'], 'del': 'val' if n in vs else 'tran'})
    for b in BAS:   # alla basländernas konstverk är träning; en per typ hålls också i valideringen via andra konstverk
        konst = per_namn.get(b, [])
        rng.shuffle(konst)
        for i, c in enumerate(konst[:BAS_KONST]):
            kort.append({'namn': b, 'id': c['id'], 'url': c['image_uris']['normal'], 'del': 'val' if i < 3 else 'tran'})
    logg(f'{len(tran)} namn i träningen, {len(val)} i valideringen, {sum(1 for k in kort if k["namn"] in BAS)} baslandskonstverk')
    return kort


def ladda_bilder(kort):
    t = time.time()
    for i, k in enumerate(kort):
        fil = os.path.join(CACHE, k['id'] + '.jpg')
        if not os.path.exists(fil):
            hamta(k['url'], fil); time.sleep(0.08)
        k['fil'] = fil
        if i % 500 == 0:
            logg(f'bilder {i}/{len(kort)} ({time.time() - t:.0f} s)')
    return kort


# ── förstöringen: hur ett kort ser ut i telefonens bild ─────────────────────
def skala(img, w, h):
    while min(img.shape[1] / w, img.shape[0] / h) >= 2 and min(img.shape[:2]) >= 2:
        img = cv2.resize(img, (img.shape[1] // 2, img.shape[0] // 2), interpolation=cv2.INTER_AREA)
    return cv2.resize(img, (w, h), interpolation=cv2.INTER_LINEAR)


def kvadrat(img):
    return skala(img, SIDA, SIDA)


def blob(h, w, rng):
    """En mjuk ljusfläck (lampans reflex i sleeven): elliptisk gauss, var som helst på kortet."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = rng.uniform(-0.2, 1.2) * w, rng.uniform(-0.2, 1.2) * h
    sx, sy = rng.uniform(0.2, 0.9) * w, rng.uniform(0.15, 0.7) * h
    th = rng.uniform(0, math.pi)
    x, y = (xx - cx) * math.cos(th) + (yy - cy) * math.sin(th), -(xx - cx) * math.sin(th) + (yy - cy) * math.cos(th)
    return np.exp(-0.5 * ((x / sx) ** 2 + (y / sy) ** 2))


def sleeve_och_ljus(img, rng):
    """Blank sleeve under lampa: slöja (kontrasten sjunker mot vitt), reflexfläck, ihoptryckta högdagrar."""
    f = img.astype(np.float32) / 255.0
    h, w = f.shape[:2]
    mild = rng.random() < 0.25   # en fjärdedel nästan orörda: modellen ska inte glömma vanliga bord
    if not mild and rng.random() < 0.6:   # slöja över hela kortet (reflex i plasten)
        a = rng.uniform(0.0, 0.3)
        f = f * (1 - a) + a * rng.uniform(0.75, 1.0)
    if not mild and rng.random() < 0.5:    # reflexfläck
        g = blob(h, w, rng)[..., None] * rng.uniform(0.25, 0.8)
        f = f * (1 - g) + g * rng.uniform(0.9, 1.0)
    if not mild and rng.random() < 0.5:    # exponeringen: automatiken ljusar för svart matta, kameran trycker ihop det ljusa
        e = rng.uniform(1.0, 1.6); k = rng.uniform(1.0, 3.0)
        f = (1 - np.exp(-k * np.clip(f * e, 0, 4))) / (1 - math.exp(-k * e))
    if rng.random() < 0.15:    # underexponerat (låst exponering, mörkt rum)
        f = f * rng.uniform(0.45, 0.8)
    f = f * rng.uniform(0.85, 1.15, size=3)[None, None, :]   # vitbalans
    f = np.clip(f, 0, 1) ** rng.uniform(0.8, 1.25)
    return (np.clip(f, 0, 1) * 255).astype(np.uint8)


def sleeve_kant(img, rng):
    """Sleevens kant: en ram runt kortet (svart, färgad eller genomskinlig) — detektorns låda tar med den."""
    if rng.random() < 0.5:
        return img
    p = max(1, int(img.shape[1] * rng.uniform(0.005, 0.025)))
    farg = [int(x) for x in (rng.integers(0, 255, 3) if rng.random() < 0.2 else [rng.integers(10, 60)] * 3)]
    return cv2.copyMakeBorder(img, p, p, p, p, cv2.BORDER_CONSTANT, value=farg)


def grannar(img, andra, rng):
    """Ett annat kort ovanpå en del av det här (högar, omlott): en bit klistras in från en kant."""
    if rng.random() < 0.45 or not andra:
        return img
    h, w = img.shape[:2]
    o = cv2.resize(rng.choice(andra), (w, h))
    sida = rng.integers(0, 3)   # 0 nedifrån (högen: nästa land), 1 från höger, 2 från vänster — aldrig över remsan helt
    if sida == 0:
        y0 = int(h * rng.uniform(REMSA * 1.05, 0.6)); img[y0:] = o[:h - y0]
    else:
        x0 = int(w * rng.uniform(0.55, 0.95))
        if sida == 1:
            img[:, x0:] = o[:, :w - x0]
        else:
            img[:, :w - x0] = o[:, x0:]
    return img


def komprimera(img, rng):
    """Telefonens ström (1080p, 1500 kbit/s): oskärpa + blockig komprimering + brus, i den lilla storleken."""
    if rng.random() < 0.7:
        s = rng.uniform(0.3, 1.1)
        img = cv2.GaussianBlur(img, (0, 0), s)
    if rng.random() < 0.1:   # rörelse
        k = int(rng.integers(3, 5)); ker = np.zeros((k, k), np.float32); ker[k // 2] = 1.0 / k
        M = cv2.getRotationMatrix2D((k / 2 - .5, k / 2 - .5), rng.uniform(0, 180), 1)
        img = cv2.filter2D(img, -1, cv2.warpAffine(ker, M, (k, k)))
    if rng.random() < 0.5:
        img = np.clip(img.astype(np.int16) + rng.normal(0, rng.uniform(1, 6), img.shape).astype(np.int16), 0, 255).astype(np.uint8)
    q = int(rng.uniform(25, 75))
    ok, b = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, q])
    return cv2.imdecode(b, cv2.IMREAD_COLOR)


def perspektiv(img, rng, styrka):
    h, w = img.shape[:2]
    d = styrka * min(h, w)
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    dst = src + rng.uniform(-d, d, src.shape).astype(np.float32)
    dst -= dst.min(0)
    W, H = int(dst[:, 0].max()) + 1, int(dst[:, 1].max()) + 1
    return cv2.warpPerspective(img, cv2.getPerspectiveTransform(src, dst), (W, H), borderMode=cv2.BORDER_REPLICATE), cv2.getPerspectiveTransform(src, dst)


def utsnitt(img, typ, rng, slapp=0.0):
    """Hela kortet, remsan eller titeldelen — med en lös låda som detektorns (slapp = andel slarv)."""
    h, w = img.shape[:2]
    if typ == 'hel':
        x0, y0, x1, y1 = 0, 0, w, h
    else:
        x0, y0, x1, y1 = 0, 0, w, int(round(h * REMSA))
        if typ == 'titel':
            x1 = int(round(w * TITEL))
    if slapp:
        bw, bh = x1 - x0, y1 - y0
        x0 += int(rng.uniform(-slapp, slapp) * bw); x1 += int(rng.uniform(-slapp, slapp) * bw)
        y0 += int(rng.uniform(-slapp, slapp * 0.5) * bh); y1 += int(rng.uniform(-slapp, slapp) * bh)
        x0, y0 = max(0, x0), max(0, y0); x1, y1 = min(w, max(x0 + 4, x1)), min(h, max(y0 + 4, y1))
    return img[y0:y1, x0:x1]


def referens(rgb, typ):
    """Appens referens: Scryfall-bilden som den är, utsnittet tryckt till kvadrat."""
    return kvadrat(utsnitt(rgb, typ, None))


def fraga(rgb, typ, rng, andra):
    """Ett kort som telefonen ser det, utsnittet som appen skär det, tryckt till kvadrat."""
    img = rgb.copy()
    if typ == 'hel':
        img = grannar(img, andra, rng) if rng.random() < 0.25 else img
    else:
        img = grannar(img, andra, rng)
    img = sleeve_och_ljus(img, rng)
    img = sleeve_kant(img, rng)
    img, _ = perspektiv(img, rng, rng.uniform(0, 0.06))
    bredd = int(rng.uniform(100, 260))                # kortets bredd i 1920 × 1080 (felboken: 128–240 px i golden 13/18)
    hojd = int(round(bredd * img.shape[0] / img.shape[1]))
    img = skala(img, bredd, hojd)
    img = komprimera(img, rng)
    img = utsnitt(img, typ, rng, slapp=rng.uniform(0, 0.08))
    return kvadrat(img)


def las(fil):
    return cv2.cvtColor(cv2.imread(fil), cv2.COLOR_BGR2RGB)


# ── de riktiga utsnitten (dataset.py) ───────────────────────────────────────
def latt_aug(img, rng):
    """Lätt: varje kant ± 5 % (utåt med kantens bildpunkter), kontrast ± 10 %, ljus ± 5 %. Ingen komprimering."""
    h, w = img.shape[:2]
    d = [int(round(rng.uniform(-0.05, 0.05) * s)) for s in (h, w, h, w)]   # över, vänster, under, höger
    pad = [max(0, -x) for x in d]
    if any(pad):
        img = cv2.copyMakeBorder(img, pad[0], pad[2], pad[1], pad[3], cv2.BORDER_REPLICATE)
    y0, x0 = max(0, d[0]), max(0, d[1])
    y1, x1 = img.shape[0] - max(0, d[2]), img.shape[1] - max(0, d[3])
    if y1 - y0 >= 4 and x1 - x0 >= 4:
        img = img[y0:y1, x0:x1]
    f = img.astype(np.float32) * rng.uniform(0.9, 1.1) + rng.uniform(-0.05, 0.05) * 255
    return np.clip(f, 0, 255).astype(np.uint8)


def riktig_fraga(img, typ, rot, rng=None):
    """Det riktiga utsnittet som fråga: upprätt (np.rot90 rot gånger), titel = remsans vänstra 55 %, lätt
    augmenterat när rng ges, tryckt till kvadrat."""
    if rot:
        img = np.ascontiguousarray(np.rot90(img, rot))
    if typ == 'titel':
        img = img[:, :max(4, int(round(img.shape[1] * TITEL)))]
    if rng is not None:
        img = latt_aug(img, rng)
    return kvadrat(img)


def hitta_riktiga():
    """Datasetmappen (manifest.json): --riktiga, annars på Kaggle den första under /kaggle/input. --utan-riktiga: ingen."""
    if '--utan-riktiga' in ARGS:
        return None
    d = arg('--riktiga')
    if d is None:
        if not PA_KAGGLE:
            return None
        d = '/kaggle/input'
    if os.path.exists(os.path.join(d, 'manifest.json')):
        return d
    kand = sorted(glob.glob(os.path.join(d, '**', 'manifest.json'), recursive=True))
    if kand:
        return os.path.dirname(kand[0])
    # v2 ska träna på riktiga: utan dataset stannar körningen hellre än att tyst träna bara syntetiskt i tre timmar
    raise SystemExit(f'ingen manifest.json under {d} — lägg datasetet (dataset.py bygg) i kernel-metadata.json:s '
                     'dataset_sources, eller kör med --utan-riktiga')


def ref_bild(rdir, kid, normal=None):
    """Scryfall-bilden för ett konstverk: datasetets ref/, cachen, annars hämtad (normal, cachad)."""
    for f in (os.path.join(rdir, 'ref', kid + '.jpg'), os.path.join(CACHE, kid + '.jpg')):
        if os.path.exists(f):
            return f
    f = os.path.join(CACHE, kid + '.jpg')
    hamta(normal or f'https://api.scryfall.com/cards/{kid}?format=image&version=normal', f)
    time.sleep(0.1)
    return f


def las_riktiga(rdir, alla, syntetiska):
    """Manifestets rader → träning, validering (val-namn) och --val-klipp, med referensbilder per namn."""
    M = json.load(open(os.path.join(rdir, 'manifest.json'), encoding='utf-8'))
    rader = M['rader']
    for r in rader:
        r['bild'] = os.path.join(rdir, r['fil'])
    namn = sorted({r['namn'] for r in rader})
    gold = [n for n in namn if n not in BAS and (n in GOLDEN or any(x in GOLDEN for x in n.split(' // ')))]
    if gold:
        raise SystemExit(f'STOPP: golden-lekens namn i de riktiga: {gold}')
    if any(r['variant'] not in ('tel', '1080') for r in rader):
        raise SystemExit('STOPP: manifestet har en annan variant än tel/1080 (4K tränas aldrig)')
    vk = set(VAL_KLIPP)
    val = [r for r in rader if r['val']]
    val_klipp = [r for r in rader if not r['val'] and f"{r['pass']}/{r['klipp']}" in vk]
    tran = [r for r in rader if not r['val'] and f"{r['pass']}/{r['klipp']}" not in vk]
    if vk and not val_klipp:
        raise SystemExit(f'--val-klipp {VAL_KLIPP}: inga rader (skriv pass/klipp som i manifestet)')
    if ROK:   # ett litet urval: ≤ 200 utsnitt, valideringen först
        rng = random.Random(5)
        rng.shuffle(val); rng.shuffle(val_klipp); rng.shuffle(tran)
        nv = min(len(val), 30); nk = min(len(val_klipp), 20)
        val, val_klipp = val[:nv], val_klipp[:nk]
        tran = tran[:N_RIKTIGA_ROK - nv - nk]
    # referenser per namn: ORB:s konstverk; annars kandidater (basland: poolen + de syntetiska konstverken)
    per_namn_bulk = {}
    for c in alla:
        if c.get('lang') == 'en' and bild_url(c):
            per_namn_bulk.setdefault(c['name'], []).append(c)
    kpn = M.get('konstverk_per_namn', {})
    kand = {}
    for n in sorted({r['namn'] for r in tran + val + val_klipp} | set(BAS)):
        if n in BAS:
            ids = M.get('pool_basland', {}).get(n, [])[: 4 if ROK else 24]
            fil = [ref_bild(rdir, i) for i in ids] + [k['fil'] for k in syntetiska if k['namn'] == n and k['del'] == 'tran']
        else:
            lista = [(p['id'], p.get('normal')) for p in kpn.get(n, [])][:3]
            if not lista:
                lista = [(c['id'], bild_url(c)) for c in per_namn_bulk.get(n, [])][:3]
            fil = [ref_bild(rdir, i, u) for i, u in lista]
        if not fil:
            raise SystemExit(f'STOPP: inget konstverk för {n!r} (manifestet eller unique_artwork)')
        kand[n] = fil
    orb = {}
    for r in tran + val + val_klipp:
        if r.get('konstverk'):
            if r['konstverk'] not in orb:
                orb[r['konstverk']] = ref_bild(rdir, r['konstverk'])
            r['ref'] = orb[r['konstverk']]
        else:
            r['ref'] = None
    # valideringens lek: alla namn i passen (manifestet) + poolens basland; per namn ORB:s konstverk, annars kandidaterna
    lek = []
    for n in sorted(set(M['namn']) | set(BAS)):
        if n in BAS:
            ids = M.get('pool_basland', {}).get(n, [])[: 4 if ROK else 24]
            ids += sorted({r['konstverk'] for r in rader if r['namn'] == n and r.get('konstverk')})[: 4 if ROK else 1000]
            lek += [(n, ref_bild(rdir, i)) for i in dict.fromkeys(ids)]
        else:
            ids = sorted({r['konstverk'] for r in rader if r['namn'] == n and r.get('konstverk')})
            fil = [ref_bild(rdir, i) for i in ids] or kand.get(n) or [ref_bild(rdir, p['id'], p.get('normal')) for p in kpn.get(n, [])[:1]]
            lek += [(n, f) for f in fil]
    logg(f'riktiga: {len(tran)} i träningen ({len({r["namn"] for r in tran})} namn), {len(val)} i valideringen '
         f'({sorted({r["namn"] for r in val})}), {len(val_klipp)} i --val-klipp; leken {len({n for n, _ in lek})} namn, '
         f'{len(lek)} referenser' + (' (--rok: litet urval)' if ROK else ''))
    return {'tran': tran, 'val': val, 'val_klipp': val_klipp, 'kand': kand, 'lek': lek, 'manifest': {
        'skapad': M.get('skapad'), 'rader': len(rader), 'namn': len(M['namn']), 'val_namn': M.get('val_namn')}}


# ── bara frågebilder (lokalt) ───────────────────────────────────────────────
if BARA_DATA:
    rng = np.random.default_rng(1)
    filer = [os.path.join(CACHE, f) for f in sorted(os.listdir(CACHE)) if f.endswith('.jpg')][:12]
    if not filer:
        raise SystemExit(f'lägg några Scryfall-bilder (488 × 680) i {CACHE}')
    bilder = [las(f) for f in filer]
    rad = []
    for b in bilder:
        rad.append(np.concatenate([referens(b, 'hel')] + [fraga(b, t, rng, bilder) for t in ('hel', 'hel', 'remsa', 'remsa', 'titel')], 1))
    cv2.imwrite(os.path.join(UT, 'prov-fragor.jpg'), cv2.cvtColor(np.concatenate(rad, 0), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 85])
    logg('skrev', os.path.join(UT, 'prov-fragor.jpg'))
    sys.exit(0)


# ── modellen ────────────────────────────────────────────────────────────────
def pip(*a):
    subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', *a], check=True)


if PA_KAGGLE:
    pip('--no-deps', 'git+https://github.com/apple/ml-mobileclip.git')
    pip('onnx', 'onnxruntime', 'onnxscript', 'open_clip_torch')
try:
    import torch  # noqa: E402
    import torch.nn.functional as F  # noqa: E402
    import mobileclip  # noqa: E402
    import onnxruntime as ort  # noqa: E402
except ImportError as e:
    raise SystemExit(f'{e} — lokalt installeras inget: lägg ml-mobileclip, timm och open_clip i PYTHONPATH (se docstringen)')
import inspect, textwrap  # noqa: E402
import mobileclip.modules.common.mobileone as _mo  # noqa: E402

# SEBlock tar medel över hela bilden med avg_pool2d(kernel_size=[h, w]) — exporten med dynamisk batch
# klarar inte listan; adaptive_avg_pool2d(…, 1) räknar samma sak. Bytet görs i källkoden så att resten är orört.
_kalla = textwrap.dedent(inspect.getsource(_mo.SEBlock.forward))
if 'F.avg_pool2d(inputs, kernel_size=[h, w])' in _kalla:
    _ns = dict(_mo.__dict__)
    exec(_kalla.replace('F.avg_pool2d(inputs, kernel_size=[h, w])', 'F.adaptive_avg_pool2d(inputs, 1)'), _ns)
    _mo.SEBlock.forward = _ns['forward']
else:
    print('SEBlock.forward ser annorlunda ut:\n' + _kalla, flush=True)

DEV = 'cuda' if torch.cuda.is_available() else 'cpu'
CKPT = os.path.join(TEMP, 'mobileclip_s0.pt')
if not os.path.exists(CKPT):
    hamta('https://docs-assets.developer.apple.com/ml-research/datasets/mobileclip/mobileclip_s0.pt', CKPT)
XEN = os.path.join(TEMP, 'xenova_vision.onnx')
if not os.path.exists(XEN):
    hamta('https://huggingface.co/Xenova/mobileclip_s0/resolve/main/onnx/vision_model.onnx', XEN)


class Bild(torch.nn.Module):
    """Bildtornet: 256 × 256 RGB 0–1 → 512, normerad (som Xenova-filens image_embeds)."""

    def __init__(self):
        super().__init__()
        m, _, _ = mobileclip.create_model_and_transforms('mobileclip_s0', pretrained=CKPT)
        self.enc = m.image_encoder

    def forward(self, x):
        return F.normalize(self.enc(x), dim=-1)


def till_tensor(kvad):
    return torch.from_numpy(np.stack(kvad)).permute(0, 3, 1, 2).float().div(255.0)


@torch.no_grad()
def inbadda(modell, kvad, bs=128):
    modell.eval(); ut = []
    for i in range(0, len(kvad), bs):
        with torch.autocast(DEV, dtype=torch.float16, enabled=DEV == 'cuda'):
            ut.append(modell(till_tensor(kvad[i:i + bs]).to(DEV)).float().cpu())
    return torch.cat(ut).numpy()


# ── valideringen: som appen dömer (centrering, bästa referens per namn, marginal) ─
def doma(ref_v, ref_namn, q_v, q_namn, lekstorlek, rng):
    """Leken i spel: varje fråga döms mot en 'lek' av lekstorlek namn (rätt namn + slumpade, basländer
    alltid med). Returnerar (rätt överst, säkra rätt vid 0 säkra fel, tröskeln) — tröskeln är den lägsta
    marginal där inget säkert svar är fel, som remsbänkens hel-regel."""
    medel = ref_v.mean(0)
    c = ref_v - medel; c /= np.linalg.norm(c, axis=1, keepdims=True)
    q = q_v - medel; q /= np.linalg.norm(q, axis=1, keepdims=True)
    S = q @ c.T
    alla = sorted(set(ref_namn)); idx = {n: i for i, n in enumerate(alla)}
    rn = np.array([idx[n] for n in ref_namn])
    per = np.full((len(q), len(alla)), -9.0, np.float32)
    for j in range(len(alla)):
        m = rn == j
        if m.any():
            per[:, j] = S[:, m].max(1)
    ratt, marg = [], []
    for i, n in enumerate(q_namn):
        lek = set(rng.choice(alla, size=min(lekstorlek, len(alla)), replace=False)) | {n} | (set(BAS) & set(alla))
        ks = [idx[x] for x in lek]
        p = per[i, ks]; o = np.argsort(-p)
        ratt.append(alla[ks[o[0]]] == n); marg.append(float(p[o[0]] - p[o[1]]))
    ratt, marg = np.array(ratt), np.array(marg)
    fel = marg[~ratt]
    t = float(fel.max()) + 1e-6 if len(fel) else 0.0
    return float(ratt.mean()), float(((marg > t) & ratt).mean()), t


def validera(modell, valkort, rng_seed=7):
    rng = np.random.default_rng(rng_seed)
    bilder = [las(k['fil']) for k in valkort]
    res = {}
    for typ in ('hel', 'remsa', 'titel'):
        ref, ref_n = [], []
        for k, b in zip(valkort, bilder):
            ref.append(referens(b, typ)); ref_n.append(k['namn'])
        q, q_n = [], []
        for k, b in zip(valkort, bilder):
            for _ in range(3):
                q.append(fraga(b, typ, rng, bilder)); q_n.append(k['namn'])
        rv, qv = inbadda(modell, ref), inbadda(modell, q)
        r30 = doma(rv, ref_n, qv, q_n, 30, np.random.default_rng(3))
        rall = doma(rv, ref_n, qv, q_n, 10 ** 6, np.random.default_rng(3))
        res[typ] = {'lek30_ratt': round(r30[0], 3), 'lek30_sakra': round(r30[1], 3), 'lek30_troskel': round(r30[2], 3),
                    'alla_ratt': round(rall[0], 3), 'alla_sakra': round(rall[1], 3), 'n': len(q)}
    return res


def validera_riktiga(modell, rader, lek):
    """Riktiga frågor (upprätta, utan augmentering) mot leken (alla namn i passen + poolens basland), topp-1 per
    variant och typ. Tomt när raderna saknas."""
    if not rader:
        return {}
    bild = {}
    for f in {f for _, f in lek} | {r['bild'] for r in rader}:
        bild[f] = las(f)
    res = {}
    for typ in ('hel', 'remsa'):
        rv = inbadda(modell, [referens(bild[f], typ) for _, f in lek]); rn = [n for n, _ in lek]
        for variant in ('tel', '1080'):
            rr = [r for r in rader if r['variant'] == variant and r['typ'] == typ]
            if not rr:
                continue
            qv = inbadda(modell, [riktig_fraga(bild[r['bild']], typ, r['rot']) for r in rr])
            ratt, sakra, t = doma(rv, rn, qv, [r['namn'] for r in rr], 10 ** 6, np.random.default_rng(3))
            res.setdefault(variant, {})[typ] = {'topp1': round(ratt, 3), 'sakra': round(sakra, 3), 'troskel': round(t, 3),
                                                'n': len(rr), 'namn': len({r['namn'] for r in rr})}
    return res


# ── träningen ───────────────────────────────────────────────────────────────
class Par(torch.utils.data.IterableDataset):
    """Paren (fråga, referens, namn, typ). Med riktiga: varannan riktig — de riktiga översamplas."""

    def __init__(self, kort, seed, riktiga=None):
        self.kort, self.seed, self.r = kort, seed, riktiga

    def __iter__(self):
        w = torch.utils.data.get_worker_info()
        rng = np.random.default_rng(self.seed + (w.id if w else 0) + int(time.time()))
        cache = {}

        def bild(fil):
            if fil not in cache:
                if len(cache) > 600:
                    cache.pop(next(iter(cache)))
                cache[fil] = las(fil)
            return cache[fil]
        hel = [r for r in (self.r or {}).get('tran', []) if r['typ'] == 'hel']
        rem = [r for r in (self.r or {}).get('tran', []) if r['typ'] == 'remsa']
        i = 0
        while True:
            i += 1
            typ = str(rng.choice(['hel', 'remsa', 'titel'], p=[0.4, 0.4, 0.2]))
            pool = hel if typ == 'hel' else rem
            if self.r and pool and i % 2 == 0:
                rad = pool[int(rng.integers(len(pool)))]
                q = riktig_fraga(bild(rad['bild']), typ, rad['rot'], rng)
                ref = rad['ref'] or self.r['kand'][rad['namn']][int(rng.integers(len(self.r['kand'][rad['namn']])))]
                r, namn = referens(bild(ref), typ), rad['namn']
            else:
                k = self.kort[int(rng.integers(len(self.kort)))]
                b = bild(k['fil'])
                andra = [bild(self.kort[int(rng.integers(len(self.kort)))]['fil']) for _ in range(2)]
                q, r, namn = fraga(b, typ, rng, andra), referens(b, typ), k['namn']
            if typ == 'hel' and rng.random() < 0.5:   # appen vrider referenserna (90-steg) — fråga och referens vrids lika
                v = int(rng.integers(1, 4)); q, r = np.ascontiguousarray(np.rot90(q, v)), np.ascontiguousarray(np.rot90(r, v))
            yield till_tensor([q])[0], till_tensor([r])[0], namn, typ


def samla(b):
    q, r, n, t = zip(*b)
    return torch.stack(q), torch.stack(r), list(n), list(t)


def prov_riktiga(R, fil):
    """Riktiga frågor (upprätta) bredvid sina referenser: hel, remsa, titel — så att vridningen och paren syns."""
    rng = random.Random(2)
    hel = [r for r in R['tran'] + R['val'] if r['typ'] == 'hel']
    rem = [r for r in R['tran'] + R['val'] if r['typ'] == 'remsa']
    rader = []
    for _ in range(min(8, len(hel), len(rem))):
        h, m = rng.choice(hel), rng.choice(rem)
        rh = h['ref'] or R['kand'][h['namn']][0]
        rm = m['ref'] or R['kand'][m['namn']][0]
        rader.append(np.concatenate([riktig_fraga(las(h['bild']), 'hel', h['rot']), referens(las(rh), 'hel'),
                                     riktig_fraga(las(m['bild']), 'remsa', m['rot']), referens(las(rm), 'remsa'),
                                     riktig_fraga(las(m['bild']), 'titel', m['rot']), referens(las(rm), 'titel')], 1))
    if rader:
        cv2.imwrite(fil, cv2.cvtColor(np.concatenate(rader, 0), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 80])


def huvud():
    t0 = time.time()
    rng = random.Random(11)
    rdir = hitta_riktiga()
    riktiga_namn, riktiga_val = set(), set()
    if rdir:
        M = json.load(open(os.path.join(rdir, 'manifest.json'), encoding='utf-8'))
        riktiga_namn = set(M['namn']); riktiga_val = {r['namn'] for r in M['rader'] if r['val']}
    alla = las_bulk()
    kort = ladda_bilder(valj_kort(rng, alla, uteslut_val=riktiga_namn, uteslut_tran=riktiga_val))
    tran = [k for k in kort if k['del'] == 'tran']
    val = [k for k in kort if k['del'] == 'val']
    json.dump(kort, open(os.path.join(UT, 'kort.json'), 'w'))
    R = las_riktiga(rdir, alla, kort) if rdir else None
    del alla

    modell = Bild().to(DEV)
    # likheten med appens modell (Xenova-filen): samma vektorer på samma bilder?
    s = ort.InferenceSession(XEN, providers=['CPUExecutionProvider'])
    prov = [kvadrat(las(k['fil'])) for k in val[:8]]
    a = s.run(None, {'pixel_values': till_tensor(prov).numpy()})[0]; a /= np.linalg.norm(a, axis=1, keepdims=True)
    b = inbadda(modell, prov)
    likhet = float((a * b).sum(1).min())
    logg(f'likhet med appens modell (minsta cos över 8 bilder): {likhet:.4f}')

    # frågebilder att titta på
    pr = np.random.default_rng(5); bi = [las(k['fil']) for k in val[:10]]
    rader = [np.concatenate([referens(x, 'hel')] + [fraga(x, t, pr, bi) for t in ('hel', 'hel', 'remsa', 'remsa', 'titel')], 1) for x in bi]
    cv2.imwrite(os.path.join(UT, 'prov-fragor.jpg'), cv2.cvtColor(np.concatenate(rader, 0), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 80])

    matt = {'likhet_appens_modell': likhet, 'fore': validera(modell, val)}
    logg('före:', json.dumps(matt['fore']))
    if R:
        prov_riktiga(R, os.path.join(UT, 'prov-riktiga.jpg'))
        matt['riktiga'] = dict(R['manifest'], tran=len(R['tran']), val=len(R['val']), val_klipp=len(R['val_klipp']),
                               val_klipp_namn=VAL_KLIPP, lek_namn=len({n for n, _ in R['lek']}), lek_referenser=len(R['lek']), rok=ROK)
        matt['riktiga_fore'] = validera_riktiga(modell, R['val'], R['lek'])
        logg('riktiga före:', json.dumps(matt['riktiga_fore']))
        if R['val_klipp']:
            matt['riktiga_klipp_fore'] = validera_riktiga(modell, R['val_klipp'], R['lek'])
            logg('riktiga --val-klipp före:', json.dumps(matt['riktiga_klipp_fore']))

    arbetare = 4 if DEV == 'cuda' else 0      # lokalt aldrig arbetare (macOS spawn kör om modulens toppnivå)
    dl = torch.utils.data.DataLoader(Par(tran, 1, R), batch_size=BATCH, num_workers=arbetare, collate_fn=samla,
                                     **({'prefetch_factor': 4} if arbetare else {}))
    opt = torch.optim.AdamW(modell.parameters(), lr=2e-5, weight_decay=0.05)
    skal = torch.cuda.amp.GradScaler(enabled=DEV == 'cuda')
    tau = 0.05
    steg, slut = 0, time.time() + TRAN_MIN * 60
    bast = {'poang': -1, 'tillstand': None, 'steg': 0, 'matt': None}
    VAL_VAR = 20 if ROK else 1500
    modell.train()
    for q, r, n, typ in dl:
        q, r = q.to(DEV, non_blocking=True), r.to(DEV, non_blocking=True)
        with torch.autocast(DEV, dtype=torch.float16, enabled=DEV == 'cuda'):
            zq, zr = modell(q), modell(r)
            S = zq @ zr.T / tau
        S = S.float()
        # samma namn (andra konstverk av samma basland) räknas inte som negativ; samma utsnittstyp jämförs
        nn = np.array(n); tt = np.array(typ)
        mask = torch.from_numpy((nn[:, None] == nn[None, :]) & ~np.eye(len(nn), dtype=bool)).to(DEV)
        mask |= torch.from_numpy(tt[:, None] != tt[None, :]).to(DEV)
        S = S.masked_fill(mask, -1e4)
        mal = torch.arange(len(n), device=DEV)
        loss = 0.5 * (F.cross_entropy(S, mal) + F.cross_entropy(S.T, mal))
        opt.zero_grad(set_to_none=True)
        skal.scale(loss).backward(); skal.step(opt); skal.update()
        steg += 1
        if steg % 100 == 0 or (ROK and steg % 10 == 0):
            logg(f'steg {steg} förlust {loss.item():.3f} ({(time.time() - t0) / 60:.0f} min)')
        if steg % VAL_VAR == 0:
            # valet av tillstånd görs på den syntetiska valideringen; de riktiga hålls rena (bara mätning)
            m = validera(modell, val); modell.train()
            p = sum(m[t]['lek30_sakra'] + m[t]['lek30_ratt'] for t in m) / 6
            logg(f'validering steg {steg}: {json.dumps(m)} poäng {p:.3f}')
            if p > bast['poang']:
                bast = {'poang': p, 'steg': steg, 'matt': m, 'tillstand': {k: v.detach().cpu().clone() for k, v in modell.state_dict().items()}}
        if time.time() > slut or (ROK and steg >= 40):
            break
    modell.eval()
    matt['steg'] = steg
    matt['efter'] = validera(modell, val)
    logg('efter:', json.dumps(matt['efter']))
    if R:
        matt['riktiga_efter'] = validera_riktiga(modell, R['val'], R['lek'])
        logg('riktiga efter:', json.dumps(matt['riktiga_efter']))
        if R['val_klipp']:
            matt['riktiga_klipp_efter'] = validera_riktiga(modell, R['val_klipp'], R['lek'])
            logg('riktiga --val-klipp efter:', json.dumps(matt['riktiga_klipp_efter']))

    # exporten: omparametrisera, samma in/ut som Xenova-filen, kontrollera mot torch
    if bast['tillstand'] is not None:   # den bästa valideringen under körningen, inte nödvändigtvis den sista
        modell.load_state_dict(bast['tillstand']); matt['vald'] = {'steg': bast['steg'], 'poang': bast['poang'], 'matt': bast['matt']}
        if R and bast['steg'] != steg:
            matt['riktiga_vald'] = validera_riktiga(modell, R['val'], R['lek'])
            logg('riktiga, valt tillstånd:', json.dumps(matt['riktiga_vald']))
    # create_model_and_transforms omparametriserar redan (MobileOne/RepMixer i slutlig form) — exporten tar modellen som den är
    modell = modell.float().cpu().eval()
    x = till_tensor(prov)
    fil = os.path.join(UT, 'mobileclip-s0-mesa-v2.onnx')
    extra = {'dynamo': False} if 'dynamo' in inspect.signature(torch.onnx.export).parameters else {}   # torch < 2.5 saknar den
    torch.onnx.export(modell, x[:1], fil, input_names=['pixel_values'], output_names=['image_embeds'],
                      dynamic_axes={'pixel_values': {0: 'batch_size'}, 'image_embeds': {0: 'batch_size'}}, opset_version=17, **extra)
    o = ort.InferenceSession(fil, providers=['CPUExecutionProvider']).run(None, {'pixel_values': x.numpy()})[0]
    with torch.no_grad():
        tv = modell(x).numpy()
    o /= np.linalg.norm(o, axis=1, keepdims=True)
    matt['export_likhet'] = float((o * tv).sum(1).min())
    matt['minuter'] = round((time.time() - t0) / 60, 1)
    json.dump(matt, open(os.path.join(UT, 'matt.json'), 'w'), indent=1)
    logg('klart:', json.dumps({k: v for k, v in matt.items() if k not in ('fore', 'efter')}))


if __name__ == '__main__':
    huvud()

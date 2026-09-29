#!/usr/bin/env python3
"""Grind 1b (MES-288): kortbilderna till de syntetiska borden, från Scryfall.

Hämtar
  * lekens kort (dev/golden/lek.txt): ett tryck per namn, och för baslanden
    flera konstverk (lek.txt har 7 Plains och 7 Swamp),
  * fem konstverk var av Island, Mountain och Forest (leken har bara Plains
    och Swamp), till andra spelares landkolumner,
  * ett slumpat urval av andra kort (/cards/random), eftersom betaspelarna
    har andra lekar än Jesper — också några tokens,
  * kortets baksida (Scryfalls bild av den vanliga baksidan).

Allt cachas gitignorerat under dev/material/arbete/2026-09-29-mes-288-synt/scryfall/
och listan i kort.json där. Körs om utan att hämta det som redan finns.

Scryfalls villkor (https://scryfall.com/docs/api): User-Agent och Accept i
varje anrop, 50–100 ms mellan anropen mot api.scryfall.com (här 110 ms), och
bilderna hämtas från *.scryfall.io. Om villkoren tillåter bilderna i träning
av en modell är INTE prövat — se SYNT.md.

    python dev/detektor/synt/hamta.py                 # leken + baslanden + 160 slumpade + 12 tokens
    python dev/detektor/synt/hamta.py --slump 400     # fler slumpade (lägger till)

Bara standardbiblioteket.
"""
import json, os, random, sys, time, urllib.parse, urllib.request

HAR = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(os.path.dirname(os.path.dirname(HAR)))
ARB = os.path.join(ROT, 'dev', 'material', 'arbete', '2026-09-29-mes-288-synt')
UT = os.path.join(ARB, 'scryfall')
LISTA = os.path.join(UT, 'kort.json')
HUVUD = {'User-Agent': 'MesaSynt/0.1 (MES-288 dev, syntetiska bord)', 'Accept': 'application/json;q=0.9,*/*;q=0.8'}
PAUS = 0.11
BASLAND = {'Plains', 'Island', 'Swamp', 'Mountain', 'Forest'}
BAKSIDA = 'https://backs.scryfall.io/normal/0/a/0aeebaf5-8c7d-4636-9e82-8c27447861f7.jpg'

_senast = [0.0]


def hamta(url, binar=False):
    vanta = PAUS - (time.time() - _senast[0])
    if vanta > 0:
        time.sleep(vanta)
    req = urllib.request.Request(url, headers=HUVUD)
    for forsok in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as s:
                data = s.read()
            _senast[0] = time.time()
            return data if binar else json.loads(data)
        except urllib.error.HTTPError as e:
            _senast[0] = time.time()
            if e.code == 429:
                time.sleep(2 + forsok * 3)
                continue
            if e.code == 404:
                return None
            raise
    raise RuntimeError(f'gav upp: {url}')


def las_lek():
    namn = []
    with open(os.path.join(ROT, 'dev', 'golden', 'lek.txt'), encoding='utf-8') as f:
        for rad in f:
            rad = rad.strip()
            if not rad or rad.startswith('#'):
                continue
            n, _, rest = rad.partition(' ')
            if n.isdigit():
                namn.append((rest.strip(), int(n)))
            else:
                namn.append((rad, 1))
    return namn


def bildurl(kort, storlek='normal'):
    if 'image_uris' in kort:
        return kort['image_uris'].get(storlek)
    ytor = kort.get('card_faces') or []
    if ytor and 'image_uris' in ytor[0]:
        return ytor[0]['image_uris'].get(storlek)
    return None


def spara(kort, kalla, lista, finns):
    if kort is None or kort['id'] in finns:
        return False
    url = bildurl(kort)
    if not url:
        return False
    fil = f"{kort['id']}.jpg"
    sokvag = os.path.join(UT, fil)
    if not (os.path.exists(sokvag) and os.path.getsize(sokvag) > 1000):
        data = hamta(url, binar=True)
        with open(sokvag, 'wb') as f:
            f.write(data)
    konst = bildurl(kort, 'art_crop')
    post = {'id': kort['id'], 'namn': kort['name'].split(' // ')[0], 'typ': kort.get('type_line') or (kort.get('card_faces') or [{}])[0].get('type_line', ''),
            'set': kort.get('set'), 'ram': kort.get('frame'), 'kant': kort.get('border_color'), 'layout': kort.get('layout'),
            'fil': fil, 'kalla': kalla, 'konst_url': konst, 'scryfall': kort.get('scryfall_uri', '').split('?')[0]}
    lista.append(post)
    finns.add(kort['id'])
    return True


def main():
    os.makedirs(UT, exist_ok=True)
    antal_slump = 160
    if '--slump' in sys.argv:
        antal_slump = int(sys.argv[sys.argv.index('--slump') + 1])
    lista = json.load(open(LISTA, encoding='utf-8'))['kort'] if os.path.exists(LISTA) else []
    finns = {k['id'] for k in lista}

    # baksidan
    bak = os.path.join(UT, 'baksida.jpg')
    if not os.path.exists(bak):
        with open(bak, 'wb') as f:
            f.write(hamta(BAKSIDA, binar=True))

    # leken
    for namn, antal in las_lek():
        if any(k['kalla'] == 'lek' and k['namn'] == namn for k in lista):
            continue
        if namn in BASLAND:
            q = urllib.parse.quote(f'!"{namn}" -is:digital lang:en')
            svar = hamta(f'https://api.scryfall.com/cards/search?q={q}&unique=art&order=released')
            for kort in (svar or {}).get('data', [])[:max(antal, 6)]:
                spara(kort, 'lek', lista, finns)
        else:
            kort = hamta('https://api.scryfall.com/cards/named?exact=' + urllib.parse.quote(namn))
            spara(kort, 'lek', lista, finns)
        print('lek', namn, flush=True)

    # baslanden som inte finns i leken, för andra spelares landkolumner
    for namn in sorted(BASLAND - {n for n, _ in las_lek()}):
        if any(k['kalla'] == 'basland' and k['namn'] == namn for k in lista):
            continue
        q = urllib.parse.quote(f'!"{namn}" -is:digital lang:en')
        svar = hamta(f'https://api.scryfall.com/cards/search?q={q}&unique=art&order=released')
        for kort in (svar or {}).get('data', [])[:5]:
            spara(kort, 'basland', lista, finns)
        print('basland', namn, flush=True)

    # slumpade kort och tokens
    har_slump = sum(k['kalla'] == 'slump' for k in lista)
    q = urllib.parse.quote('game:paper -is:digital -is:funny lang:en -t:token -layout:art_series')
    while har_slump < antal_slump:
        if spara(hamta(f'https://api.scryfall.com/cards/random?q={q}'), 'slump', lista, finns):
            har_slump += 1
            if har_slump % 20 == 0:
                print('slump', har_slump, flush=True)
    har_tok = sum(k['kalla'] == 'token' for k in lista)
    q = urllib.parse.quote('t:token -is:digital lang:en')
    forsok = 0
    while har_tok < 12 and forsok < 40:
        forsok += 1
        if spara(hamta(f'https://api.scryfall.com/cards/random?q={q}'), 'token', lista, finns):
            har_tok += 1

    with open(LISTA, 'w', encoding='utf-8') as f:
        json.dump({'om': 'Kortbilder från Scryfall (MES-288 grind 1b), hämtade av dev/detektor/synt/hamta.py',
                   'hamtad': time.strftime('%Y-%m-%d'), 'villkor': 'https://scryfall.com/docs/api — bilder i träning ej prövat',
                   'kort': lista}, f, ensure_ascii=False, indent=1)
    print(f'{len(lista)} kort i {LISTA}')


if __name__ == '__main__':
    main()

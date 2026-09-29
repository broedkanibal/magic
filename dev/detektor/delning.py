#!/usr/bin/env python3
"""Prov eller träning — spärren som håller provbilderna borta från träningen (MES-288).

Varje skript som väljer, etiketterar eller tränar på bilder ska gå genom den
här modulen:

    from delning import krav_traning
    krav_traning(sokvag)          # stoppar med ProvLacka om sökvägen inte är träning

Regeln (dev/detektor/delning.json, förklarad i DELNING.md):

* Varje inspelningstillfälle är **prov**, **traning** eller **oanvandbart**.
* En sökväg hör till ett tillfälle om någon av dess mappar heter som en mapp i
  listan (samma namn används i dev/material/ och dev/golden/inspelningar/).
* En mapp vars namn innehåller `-traning-` är träning.
* **Allt annat är prov.** En sökväg som inte går att knyta till ett
  träningstillfälle får aldrig tränas på.
* Både sökvägen som den står och dess realpath prövas (symlänkar följs), och
  den värsta domen vinner: prov > oanvandbart > traning. En symlänk i en
  träningsmapp som pekar på en provinspelning stoppas alltså.

Kör:
    python dev/detektor/delning.py --test          # självtestet
    python dev/detektor/delning.py <sökväg> …      # domen per sökväg; slutkod 1 om någon inte är träning
    python dev/detektor/delning.py --lista         # alla mappar som finns, och om de står i listan

Bara standardbiblioteket.
"""
import json, os, re, sys

HAR = os.path.dirname(os.path.abspath(__file__))
LISTA = os.path.join(HAR, 'delning.json')
ALLVAR = {'prov': 3, 'oanvandbart': 2, 'traning': 1}


class ProvLacka(Exception):
    """En sökväg som inte är träning skickades till något som tränar eller etiketterar."""


def las_lista(fil=LISTA):
    with open(fil, encoding='utf-8') as f:
        d = json.load(f)
    namn = {}
    for sokvag, post in d['mappar'].items():
        if post['delning'] not in ALLVAR:
            raise ValueError(f'{fil}: okänd delning {post["delning"]!r} för {sokvag}')
        n = os.path.basename(sokvag.rstrip('/'))
        tidigare = namn.get(n)
        # samma namn två gånger (t.ex. rita/<tillfälle> och inspelningar/<tillfälle>) — värsta domen gäller
        if tidigare is None or ALLVAR[post['delning']] > ALLVAR[tidigare[0]]:
            namn[n] = (post['delning'], post['skal'], sokvag)
    return {'namn': namn, 'standard': d.get('standard', 'prov'), 'standard_skal': d.get('standard_skal', ''),
            'monster': d.get('traningsmonster', '-traning-'), 'monster_skal': d.get('traningsmonster_skal', '')}


_LISTAN = None


def _lista():
    global _LISTAN
    if _LISTAN is None:
        _LISTAN = las_lista()
    return _LISTAN


def _klassa_en(sokvag, lista):
    """Dom för en sökväg som den står (ingen upplösning av symlänkar)."""
    domar = []
    for del_ in sokvag.replace('\\', '/').split('/'):
        if not del_:
            continue
        if del_ in lista['namn']:
            dl, skal, nyckel = lista['namn'][del_]
            domar.append((dl, skal, nyckel))
        elif lista['monster'] and lista['monster'] in del_:
            domar.append(('traning', lista['monster_skal'], del_))
    if not domar:
        return (lista['standard'], lista['standard_skal'], None)
    # värsta domen vinner; vid lika den djupaste mappen (mest precis i skälet)
    return max(enumerate(domar), key=lambda d: (ALLVAR[d[1][0]], d[0]))[1]


def klassa(sokvag, lista=None):
    """-> (delning, skäl, vilken listpost eller mapp som avgjorde, vilken form av sökvägen).

    Prövar sökvägen som den står (absolut, normaliserad) och dess realpath;
    den värsta domen vinner."""
    lista = lista or _lista()
    sokvag = os.fspath(sokvag)
    former = [('som den står', os.path.normpath(os.path.abspath(sokvag))),
              ('realpath', os.path.realpath(sokvag))]
    basta = None
    for form, s in former:
        dl, skal, nyckel = _klassa_en(s, lista)
        if basta is None or ALLVAR[dl] > ALLVAR[basta[0]]:
            basta = (dl, skal, nyckel, form)
    return basta


def tillaten(sokvag, lista=None):
    """True bara om sökvägen, också efter realpath, hör till ett träningstillfälle."""
    return klassa(sokvag, lista)[0] == 'traning'


def krav_traning(sokvag, lista=None):
    """Stoppar med ProvLacka om sökvägen inte är träning. Returnerar sökvägen annars."""
    dl, skal, nyckel, form = klassa(sokvag, lista)
    if dl != 'traning':
        var = f' ({nyckel})' if nyckel else ''
        raise ProvLacka(f'{sokvag} är {dl.upper()}{var}, bedömd på sökvägen {form}: {skal}. '
                        'Den får inte användas till träning eller etikettering — se dev/detektor/DELNING.md.')
    return sokvag


def krav_traning_alla(sokvagar, lista=None):
    """krav_traning på varje sökväg; stoppar på den första som inte är träning."""
    return [krav_traning(s, lista) for s in sokvagar]


# ── självtestet ────────────────────────────────────────────────────────────
def sjalvtest():
    import tempfile
    lista = _lista()
    fel = []

    def vanta(sokvag, dom, text):
        fick = klassa(sokvag, lista)[0]
        if fick != dom:
            fel.append(f'{text}: {sokvag} gav {fick}, väntade {dom}')
        stoppad = False
        try:
            krav_traning(sokvag, lista)
        except ProvLacka:
            stoppad = True
        if stoppad != (dom != 'traning'):
            fel.append(f'{text}: krav_traning {"stoppade" if stoppad else "släppte igenom"} {sokvag}')

    rot = os.path.dirname(os.path.dirname(HAR))
    m = os.path.join(rot, 'dev', 'material')
    # Jespers beslut, rakt ur issuen
    vanta(f'{m}/inspelningar/2026-09-21-mes-238-parti-4k15-20min/dator.mov', 'oanvandbart', 'partiet (Jespers beslut 2026-09-29)')
    vanta(f'{m}/inspelningar/2026-09-21-mes-238-parti-4k15-20min/rutor/kam-300.jpg', 'oanvandbart', 'partiets rutor')
    vanta(f'{m}/inspelningar/2026-09-16-mes-166-provkort-pass-1-mork/telefon.mp4', 'traning', 'pass 1')
    vanta(f'{m}/inspelningar/2026-09-16-mes-139-library-steget-plastficka/telefon.mp4', 'traning', 'MES-139')
    vanta(f'{m}/inspelningar/2026-09-14-mes-138-library-plastficka-kanns-inte-igen/dator.mov', 'traning', 'MES-138')
    vanta(f'{m}/inspelningar/2026-09-21-provkort-pacifism/dator.mov', 'traning', 'pacifism')
    vanta(f'{m}/inspelningar/2026-10-02-traning-duk-dagsljus/telefon.mov', 'traning', 'framtida -traning-')
    vanta(f'{m}/inspelningar/2026-09-08-kalibrering-scanbord/rutor/12.jpg', 'prov', 'scanbordet')
    vanta(f'{m}/inspelningar/2026-09-16-mes-166-provkort-pass-2-fall-12/telefon.mp4', 'prov', 'pass 2')
    vanta(f'{m}/inspelningar/2026-09-19-mes-246-las-fore-slapp/telefon.mov', 'prov', 'MES-246')
    vanta(f'{m}/inspelningar/2026-09-22-1x-34cm-normaltempo/kamera.mp4', 'prov', 'passet 09-22')
    vanta(f'{m}/foton/2026-09-20-ljust-tra-varmt-ljus-plastfickor/utspridd.jpg', 'prov', 'foton 09-20')
    vanta(f'{m}/foton/2026-09-26-lekfoto/foto-05.jpg', 'prov', 'lekfotot')
    vanta(f'{m}/hogbank/pass-117.jpg', 'prov', 'högbänken')
    vanta(f'{m}/rita/mes-246/0.78.jpg', 'prov', 'ritade rutor')
    vanta(f'{rot}/dev/golden/fall/13-svartmatta-lampa-40cm-10kort-tokens/bild.jpg', 'prov', 'golden 13')
    vanta(f'{rot}/dev/golden/fall/99-nytt-fall/bild.jpg', 'prov', 'ett nytt golden-fall')
    vanta(f'{rot}/dev/golden/inspelningar/2026-09-19-mes-246-las-fore-slapp/mes-246-video.mov', 'prov', 'MES-246 via golden/inspelningar')
    vanta(f'{m}/inspelningar/2026-09-09-designyta-riktning-c-edge-cases/dator.mov', 'oanvandbart', 'designytan')
    vanta(f'{m}/inspelningar/2026-09-16-mes-183-lekbyggaren-to-check/dator-spiteful-hexmager.mov', 'oanvandbart', 'lekbyggaren')
    vanta(f'{m}/inspelningar/2026-10-05-okand-mapp/telefon.mov', 'prov', 'okänd mapp = prov')
    vanta('/tmp/nagon-bild.jpg', 'prov', 'sökväg utanför allt = prov')
    vanta('relativ/bild.jpg', 'prov', 'relativ sökväg utan tillfälle = prov')
    # en träningsmapp inne i en provmapp, och tvärtom: provet vinner
    vanta(f'{m}/rita/2026-10-02-traning-duk-dagsljus/1.00.jpg', 'prov', 'träningsnamn under rita/')
    vanta(f'{m}/inspelningar/2026-09-21-mes-238-parti-4k15-20min/2026-09-19-mes-246-las-fore-slapp/x.jpg', 'prov', 'provnamn under träningsmapp')

    # symlänkar: en länk i en träningsmapp som pekar på prov ska stoppas, både fil och mapp
    with tempfile.TemporaryDirectory() as t:
        prov = os.path.join(t, 'dev', 'golden', 'fall', '14-tra-lampa-50cm-11kort-omlott')
        os.makedirs(prov)
        provbild = os.path.join(prov, 'bild.jpg')
        open(provbild, 'wb').close()
        trn = os.path.join(t, '2026-10-02-traning-duk')
        os.makedirs(trn)
        lank = os.path.join(trn, 'bild.jpg')
        os.symlink(provbild, lank)
        vanta(lank, 'prov', 'fil-symlänk från träning till prov')
        mapplank = os.path.join(trn, 'rutor')
        os.symlink(prov, mapplank)
        vanta(os.path.join(mapplank, 'bild.jpg'), 'prov', 'mapp-symlänk från träning till prov')
        # och en länk från en okänd plats till träning: sökvägen som den står är okänd = prov
        trnbild = os.path.join(trn, 'riktig.jpg')
        open(trnbild, 'wb').close()
        vanta(trnbild, 'traning', 'riktig fil i träningsmapp')
        okand = os.path.join(t, 'okand')
        os.makedirs(okand)
        os.symlink(trnbild, os.path.join(okand, 'lank.jpg'))
        vanta(os.path.join(okand, 'lank.jpg'), 'prov', 'okänd sökväg som pekar på träning')

    # krav_traning_alla stoppar på första provet
    try:
        krav_traning_alla([f'{m}/inspelningar/2026-09-21-provkort-pacifism/dator.mov', f'{m}/hogbank/pass-75.jpg'], lista)
        fel.append('krav_traning_alla släppte igenom högbänken')
    except ProvLacka:
        pass

    # varje mapp i listan har en känd delning och ett skäl
    with open(LISTA, encoding='utf-8') as f:
        d = json.load(f)
    for k, v in d['mappar'].items():
        if not v.get('skal'):
            fel.append(f'{k} saknar skäl')

    if fel:
        print('SJÄLVTESTET FÖLL:')
        for f_ in fel:
            print('  ' + f_)
        return 1
    print(f'självtestet OK ({len(d["mappar"])} mappar i listan)')
    return 0


def lista_mappar():
    """Skriv ut varje mapp som finns på disk under de fem platserna, med dom och om den står i listan."""
    rot = os.path.dirname(os.path.dirname(HAR))
    lista = _lista()
    with open(LISTA, encoding='utf-8') as f:
        nycklar = set(json.load(f)['mappar'])
    saknas = 0
    for plats in ['dev/material/inspelningar', 'dev/material/foton', 'dev/material/rita', 'dev/material/arbete', 'dev/golden/fall', 'dev/golden/inspelningar']:
        p = os.path.join(rot, plats)
        if not os.path.isdir(p):
            print(f'{plats}: finns inte här')
            continue
        for n in sorted(os.listdir(p)):
            if not os.path.isdir(os.path.join(p, n)):
                continue
            k = f'{plats}/{n}'
            dl = klassa(os.path.join(p, n), lista)[0]
            # listad = står själv i listan, eller heter som ett listat tillfälle (dev/golden/inspelningar/<namn>)
            listad = k in nycklar or n in lista['namn'] or (lista['monster'] in n)
            if not listad:
                saknas += 1
            print(f'{dl:12} {"" if listad else "(inte i listan) "}{k}')
    hb = os.path.join(rot, 'dev/material/hogbank')
    if os.path.isdir(hb):
        print(f'{klassa(hb, lista)[0]:12} dev/material/hogbank')
    if saknas:
        print(f'\n{saknas} mappar står inte i listan och räknas som prov. Lägg in dem i delning.json med skäl.')
    return 0


if __name__ == '__main__':
    arg = sys.argv[1:]
    if not arg or arg == ['-h'] or arg == ['--help']:
        print(__doc__)
        sys.exit(0)
    if arg == ['--test']:
        sys.exit(sjalvtest())
    if arg == ['--lista']:
        sys.exit(lista_mappar())
    kod = 0
    for s in arg:
        dl, skal, nyckel, form = klassa(s)
        print(f'{dl:12} {s}  — {skal}{f" [{nyckel}, {form}]" if nyckel else ""}')
        if dl != 'traning':
            kod = 1
    sys.exit(kod)

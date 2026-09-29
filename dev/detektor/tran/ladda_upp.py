#!/usr/bin/env python3
"""MES-288 grind 2: laddar upp datasetet som ett PRIVAT Kaggle-dataset — först efter tre kontroller.

1. Varje källbild i filistan går genom delning.krav_traning_alla (igen).
2. Mappen innehåller exakt filistans bilder + anteckningar.json + dataset-metadata.json — ingen
   annan fil (ingen golden-bild, ingen MES-246-ruta, inget ur en provmapp kan ha smugit sig in).
3. dataset-metadata.json skrivs här med isPrivate: true.

Efteråt: kontrollera att datasetet är privat (utskriften från `kaggle datasets list -m`).

    python dev/detektor/tran/ladda_upp.py --namn v1 [--kor]     # utan --kor: bara kontrollerna
"""
import json, os, subprocess, sys

HAR = os.path.dirname(os.path.abspath(__file__))
DET = os.path.dirname(HAR)
ROT = os.path.dirname(os.path.dirname(DET))
sys.path.insert(0, DET)
from delning import krav_traning_alla  # noqa: E402

KAGGLE = os.path.expanduser('~/.mesa/kaggle-venv/bin/kaggle')
ANVANDARE = 'jesperfunkrosling'


def main():
    a = sys.argv[1:]
    namn = a[a.index('--namn') + 1] if '--namn' in a else 'v1'
    mapp = os.path.join(ROT, 'dev', 'material', 'arbete', f'2026-09-30-mes-288-traning-detektor-{namn}')
    rader = [r.rstrip('\n').split('\t') for r in open(os.path.join(HAR, f'filista-{namn}.txt'), encoding='utf-8') if not r.startswith('#')]
    kallor = [os.path.join(ROT, r[0]) for r in rader]
    utfiler = [os.path.join(ROT, r[1]) for r in rader]
    krav_traning_alla(kallor)
    krav_traning_alla(utfiler + [mapp])
    vantat = {os.path.relpath(u, mapp) for u in utfiler} | {'anteckningar.json', 'dataset-metadata.json'}
    finns = set()
    for d, _, fs in os.walk(mapp):
        for f in fs:
            finns.add(os.path.relpath(os.path.join(d, f), mapp))
    extra = sorted(finns - vantat)
    saknas = sorted(vantat - finns - {'dataset-metadata.json'})
    if extra or saknas:
        raise SystemExit(f'mappen stämmer inte med filistan: {len(extra)} extra (t.ex. {extra[:3]}), {len(saknas)} saknas (t.ex. {saknas[:3]})')
    ant = json.load(open(os.path.join(mapp, 'anteckningar.json'), encoding='utf-8'))['bilder']
    if {x['fil'] for x in ant} != {os.path.relpath(u, mapp) for u in utfiler}:
        raise SystemExit('anteckningar.json och filistan har inte samma bilder')
    meta = {'title': f'mesa-mes288-detektor-{namn}', 'id': f'{ANVANDARE}/mesa-mes288-detektor-{namn}', 'isPrivate': True,
            'licenses': [{'name': 'other'}],
            'subtitle': 'MES-288 grind 2: träningsdata för kortdetektorn (privat)',
            'description': 'Privat träningsdata för Mesas kortdetektor (MES-288 grind 2). Riktiga rutor ur träningsfilmer med lärarens lådor och syntetiska bord. Inga provbilder.'}
    with open(os.path.join(mapp, 'dataset-metadata.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    storlek = sum(os.path.getsize(os.path.join(mapp, x)) for x in finns | {'dataset-metadata.json'}) / 1e6
    print(f'kontrollerna OK: {len(rader)} bilder, alla träning; inga extra filer; {storlek:.0f} MB; isPrivate: true')
    if '--kor' not in a:
        print('inget uppladdat (kör med --kor)')
        return
    subprocess.run([KAGGLE, 'datasets', 'create', '-p', mapp, '--dir-mode', 'zip', '-q'], check=True)
    subprocess.run([KAGGLE, 'datasets', 'list', '-m'], check=False)


if __name__ == '__main__':
    main()

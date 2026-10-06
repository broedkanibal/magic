#!/usr/bin/env python3
"""Scryfalls namnlista för märkningen (spec-markning-2026-10-05, steg C): alla kortnamn textläsaren
får matcha mot när leken inte finns i Mesa.

Hämtar bulken `oracle_cards` (ett kort per oracle-id, JSONL.gz sedan 2026) EN gång och skriver
dev/material/arbete/markning/scryfall-namn.json:

    {"hamtad": "...", "kalla": "<uri>", "antal": N,
     "namn":  ["Fire // Ice", "Lightning Bolt", ...],          # Scryfalls hela namn, sorterade
     "sidor": {"Fire": ["Fire // Ice", "Start // Fire"], "Ice": ["Fire // Ice"], ...},   # sidans namn → korten (hela namn)
     "layout": {"Fire // Ice": "split", ...},
     "tokens": ["Blood", "Soldier", "Treasure", ...],                # tokens, emblem, framsideskort och deras sidor
     "emblem": ["Basri Ket", "Mordenkainen", ...]}                   # emblemens titlar (Scryfall: "Basri Ket Emblem")

Emblemens titlar är planeswalkerns namn: kortet visar "Basri Ket", och utan listan blev ett emblem säkert som
planeswalkern (pass 3 klipp 1 s1584, klipp 2 s700). mark.py kräver Claudes token: false för de namnen.

Bort: tokens, emblem, art series, vanguard, scheme, planar, phenomenon och Jumpstarts framsideskort
(layout front_card: "Treasure", "Spirit", "Angels" … — inga spelkort, och de heter som tokens), och Alchemy-
varianterna ("A-…": samma namn som pappersversionen med ett A- framför). Flaggan `digital` filtreras INTE:
oracle_cards har en representativ tryckning per kort, och för många papperskort är den digital (Black Lotus
ur vma, Dwarven Ruins ur me2) — 1 843 namn föll bort så. Ett digitalt namn i listan är ofarligt: det blir
facit bara om Claude läser det och vittne 2 håller med mot Scryfall-bilden. En sida som hör till flera kort, eller heter som ett eget kort, pekar på
alla — textläsaren (ocr.cjs med alias) får då ingen marginal på den sidan ensam. Körs inte om när
filen finns (--om tvingar).

    ~/.mesa/detektor-venv/bin/python dev/remsa/tran/namn.py [--om]
"""
import gzip, json, os, sys, time, urllib.request

HAR = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(os.path.dirname(os.path.dirname(HAR)))
UT_MAPP = os.path.join(ROT, 'dev', 'material', 'arbete', 'markning')
UT = os.path.join(UT_MAPP, 'scryfall-namn.json')
# Som mesa_remsa_tran.py, utan mejladressen (den skickas inte till en extern tjänst utan Jespers ja).
UA = {'User-Agent': 'mesa-markning/0.1 (dev tools)', 'Accept': 'application/json'}
BORT = {'token', 'double_faced_token', 'emblem', 'art_series', 'vanguard', 'scheme', 'planar', 'phenomenon', 'front_card'}
TOKENLAYOUT = {'token', 'double_faced_token', 'emblem', 'front_card'}


def hamta(url, tries=4):
    for i in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300).read()
        except Exception:  # noqa: BLE001
            if i == tries - 1:
                raise
            time.sleep(2 + 3 * i)


def main():
    if os.path.exists(UT) and '--om' not in sys.argv:
        d = json.load(open(UT, encoding='utf-8'))
        print(f'finns redan: {os.path.relpath(UT, ROT)} ({d["antal"]} namn, hämtad {d["hamtad"]})')
        return
    bulk = json.loads(hamta('https://api.scryfall.com/bulk-data'))
    x = next(x for x in bulk['data'] if x['type'] == 'oracle_cards')
    uri = x.get('jsonl_download_uri') or x.get('download_uri')
    print('hämtar', uri, flush=True)
    time.sleep(0.1)
    d = hamta(uri)
    if uri.endswith('.gz'):
        d = gzip.decompress(d)
    text = d.decode('utf-8')
    kort = [json.loads(r) for r in text.splitlines() if r.strip()] if 'jsonl' in uri else json.loads(text)
    namn, layout, sidor = set(), {}, {}
    bort = {'layout': 0, 'alchemy': 0}
    tokens, emblem = set(), set()
    for c in kort:
        if c.get('layout') in BORT:
            bort['layout'] += 1
            if c.get('layout') in TOKENLAYOUT:
                # tokennamnen ("Blood", "Treasure", "Soldier"): mark.py ger dem aldrig ett kortnamn, inte heller
                # via ett korts sida (Flesh // Blood) — granskningen av e374112
                tokens.add(c['name'])
                tokens.update(f['name'] for f in (c.get('card_faces') or []) if f.get('name'))
            if c.get('layout') == 'emblem':
                emblem.add(c['name'][:-len(' Emblem')] if c['name'].endswith(' Emblem') else c['name'])
            continue
        if c['name'].startswith('A-'):   # Alchemy-varianten; flaggan digital filtreras inte (se ovan)
            bort['alchemy'] += 1
            continue
        namn.add(c['name'])
        layout[c['name']] = c.get('layout')
        for f in c.get('card_faces') or []:
            if f.get('name') and f['name'] != c['name']:
                sidor.setdefault(f['name'], set()).add(c['name'])
    # En sida kan höra till flera kort ("Fire": Fire // Ice och Start // Fire) eller heta som ett eget kort:
    # då står alla i listan, och textläsaren får ingen marginal på den sidan ensam.
    sidor = {s: sorted(n | ({s} if s in namn else set())) for s, n in sidor.items()}
    os.makedirs(UT_MAPP, exist_ok=True)
    ut = {'hamtad': time.strftime('%Y-%m-%d %H:%M'), 'kalla': uri, 'antal': len(namn), 'bort': bort,
          'namn': sorted(namn), 'sidor': dict(sorted(sidor.items())), 'layout': layout, 'tokens': sorted(tokens),
          'emblem': sorted(emblem)}
    json.dump(ut, open(UT, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'{len(namn)} namn, {len(sidor)} sidnamn, {len(tokens)} tokennamn, {len(emblem)} emblemtitlar (bort: {bort}) '
          f'→ {os.path.relpath(UT, ROT)}')


if __name__ == '__main__':
    main()

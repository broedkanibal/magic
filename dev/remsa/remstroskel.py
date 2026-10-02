#!/usr/bin/env python3
"""MES-330: remsans egen tröskel, kalibrerad på detektorns egna remsor (inte kortets 0,11).

Kortets tröskel 0,11 (embed.js TROSKEL) är kalibrerad på hela kort. På remsor ur exakta hörn vid
20 % gav den 27 säkra fel i MES-246 (nollfel där: 0,18) — se RESULTAT.md. Appen läser inte hörn
utan DETEKTORNS remslåda (14 %, axelparallell, vriden rätt, ur kamerans fulla bild) mot
referenser som är de översta 14 % av Scryfall-bilden: exakt det detektor_remsor.py mätte och
sparade i resultat/detektorremsor-embed.json. Det här skriptet läser de raderna och skriver
säkra rätt / säkra fel per tröskel, så att valet går att spåra till filen.

    ~/.mesa/detektor-venv/bin/python dev/remsa/remstroskel.py          (bara standardbiblioteket)

Valet (2026-10-02): T.remsaTroskel = 0,15. Nollfel över golden + MES-246 ur källan är 0,112 —
alltså i praktiken kortets 0,11, utan marginal. 0,15 ger 0 säkra fel på alla fyra raderna, också
ur 960-analysbilden (som appen inte använder, men som visar vad ett sämre utsnitt gör), och
kostar 2 av golden-fotonas 56 säkra rätta. 0,18 kostar 3 och vinner inget mer.
"""
import json, os, sys

HAR = os.path.dirname(os.path.abspath(__file__))
FIL = os.path.join(HAR, 'resultat', 'detektorremsor-embed.json')
TROSKLAR = [0.11, 0.112, 0.12, 0.13, 0.15, 0.18, 0.20]
VAL = 0.15


def main():
    d = json.load(open(FIL, encoding='utf-8'))
    print(f"detektorremsor-embed.json: andel {d['andel']}, sträck {d['strack']}")
    val_ok = True
    for res in ('orig', '960'):
        rader = d['embed_rader'][res]
        print(f"\n== remsor ur {'källan (full upplösning)' if res == 'orig' else 'analysbilden (960 px)'}")
        print('| tröskel | golden säkra rätt / säkra fel (av 69) | MES-246 säkra rätt / säkra fel (av 597) |')
        print('|---|---|---|')
        for tr in TROSKLAR:
            celler = []
            for kalla in ('golden', 'mes246'):
                rr = [r for r in rader if r['kalla'] == kalla]
                sr = sum(1 for r in rr if r['ratt'] and r['marginal'] > tr)
                sf = sum(1 for r in rr if not r['ratt'] and r['marginal'] > tr)
                celler.append(f'{sr} / **{sf}**')
                if tr == VAL and sf:
                    val_ok = False
            print(f"| {str(tr).replace('.', ',')}{' ← valet' if tr == VAL else ''} | {celler[0]} | {celler[1]} |")
        fel = [r['marginal'] for r in rader if not r['ratt']]
        print(f"största marginal på ett fel: {max(fel):.3f}" if fel else 'inga fel')
    print(f"\nT.remsaTroskel = {VAL}: {'0 säkra fel på alla rader' if val_ok else 'OBS: ger säkra fel — kalibrera om'}")
    return 0 if val_ok else 1


if __name__ == '__main__':
    sys.exit(main())

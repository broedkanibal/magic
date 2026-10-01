#!/usr/bin/env python3
"""MES-288: namnremsan — kortets översta del med namnraden — ur kortets fyra hörn.

Hörnen följer ritverktyget och generatorn: hörn 0 → 1 är kortets överkant (namnradens riktning),
hörn 3 är nedre vänstra. Remsan är den översta andelen REMSA av kortet (namnraden ligger 3,5–9,5 mm
in på ett 88 mm kort, NAMNRAD i synt/generera.py; 0,14 täcker den också i en ficka). I en tät hög
ligger korten 11–20 % av korthöjden isär (MES-246), så två kortsremsor överlappar knappt — till
skillnad från lådorna runt det synliga, som dubblettsteget slog ihop (GRIND3.md).

Fungerar i bildpunkter eller andelar av bilden (allt är linjärt); W och H i samma enhet.
"""
import numpy as np

REMSA = 0.14   # remsans höjd i andel av kortets höjd


def remsa_poly(horn):
    """Remsans fyra hörn: överkanten och REMSA av vägen ner mot underkanten."""
    h = np.asarray(horn, float)
    return np.array([h[0], h[1], h[1] + REMSA * (h[2] - h[1]), h[0] + REMSA * (h[3] - h[0])])


def remsa_lada(horn, W=None, H=None):
    """Axelparallell låda runt remsan, [x0, y0, x1, y1], klippt mot bilden om W och H ges."""
    p = remsa_poly(horn)
    b = [p[:, 0].min(), p[:, 1].min(), p[:, 0].max(), p[:, 1].max()]
    if W is not None:
        b = [min(max(b[0], 0), W), min(max(b[1], 0), H), min(max(b[2], 0), W), min(max(b[3], 0), H)]
    return [float(v) for v in b]


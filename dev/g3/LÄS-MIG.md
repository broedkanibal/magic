# dev/g3 — Claude som lärare (MES-364)

Mäter hur ofta Claude har rätt på ett nytt kort utan lekens namnlista, hur ofta kontrollen mot Scryfall-bilden
släpper igenom ett fel namn, hur ofta den stoppar ett rätt, och hur lång tid det tar. Resultat och tabeller:
`dev/plan/lekar-och-minnet.md`, avsnittet *Resultat G3 (MES-364)*.

Kostar pengar (~0,2–0,6 cent per fråga, ~1,5 USD för hela omgången). Systemprompten ändras inte: kortlägets
instruktioner läses ur `api/identify.js` (`mode === 'card'`) varje körning.

## Köra om

```bash
# Nyckeln: .env.local (symlänka den till worktreen om den saknas). Material: dev/material (symlänk till main).
node dev/g3/fraga.cjs sonnet55-low 1          # en konfiguration, 61 frågor, ~1,5 min; resultat i dev/g3/resultat/
#   konfig: opus5-medium | opus55-medium | opus55-low | sonnet55-medium | sonnet55-low | haiku55-medium | sonnet5-medium
#   --antal N  bara de N första   --tak USD  stoppa när dev/g3/resultat/kostnad.jsonl nått summan (förval 4,90)

PY=~/.mesa/detektor-venv/bin/python
node dev/embed/utdrag.cjs                      # cache/kedjan.js (appens ORB), en gång
$PY dev/g3/kontroll.py uppgifter               # slår upp namnen, räknar modellens marginal, skriver ORB-uppgifter
node dev/embed/webb.cjs varlden.html "ORBSTEG('dev/embed/cache/varlden/orb-uppgifter-g3.json')" --port 8392 \
     > dev/embed/cache/varlden/orb-svar-g3.json
# de 13 "telefonen klarade inte" kräver orb-svar-världen.json från G1:
$PY dev/remsa/varlden.py orb-uppgifter --listor världen
node dev/embed/webb.cjs varlden.html "ORBSTEG('dev/embed/cache/varlden/orb-uppgifter-världen.json')" --port 8392 \
     > dev/embed/cache/varlden/orb-svar-världen.json
$PY dev/g3/kontroll.py dom                     # tabellerna + resultat/sammanfattning.json
$PY dev/g3/kontroll.py rader opus55-medium 1   # rad för rad för en konfiguration
$PY dev/g3/kontroll.py lagre                   # efterhandsprov: ett lägre ORB-krav
```

## Filer

| Fil | Vad |
|---|---|
| `fraga.cjs` | frågar Anthropic direkt (`@anthropic-ai/sdk`), mäter svarstid och kostnad per anrop |
| `kontroll.py` | kontrollen (modell + ORB mot namnets Scryfall-bild) och räkningen |
| `resultat/<konfig>-k1.json` | Claudes svar, tid och usage per beskärning |
| `resultat/kostnad.jsonl` | kostnadsloggen (summan är taket) |
| `resultat/sammanfattning.json`, `kontroll-forarbete.json` | räknade tal |

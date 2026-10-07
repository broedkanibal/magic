#!/bin/bash
# Summerar en golden-logg (kor.cjs stdout): modellrader, totalraden, per fall, fel namn, domskäl, land, högar, fördröjning. Kör: dev/golden/summera.sh <fil>.log (2026-10-07, MES-340)
f="$1"
tr '\r' '\n' < "$f" | grep -v '^ *$' > /tmp/summera.$$
echo "== $(basename "$f") =="
grep -E "^(Hela kortet läses|Remsorna läses|Bildmodellen hämtas)" /tmp/summera.$$ | cut -c1-160
grep -E "^  (bildmodellens fil|remsorna|VARNING)" /tmp/summera.$$ | cut -c1-200
grep -E "^  (Totalt, 18 fall)" /tmp/summera.$$ | sed -E 's/ {2,}/ | /g'
echo "-- per fall (fall | kort | hittade | rätt | fel | falska) --"
grep -E "^  (0[1-9]|1[0-8])-[^ :]+ +[0-9]" /tmp/summera.$$ | sed -E 's/ {2,}/|/g' | awk -F'|' '{printf "  %-42s %-10s %-8s %-16s %-12s %s\n", $2, $3, $4, $5, $6, $7}'
echo "-- fel namn / säkra fel --"
grep -iE "fel namn|SÄKERT FEL|säkert fel" /tmp/summera.$$ | grep -vE "^  Rätt namn:|Fel namn: säkert|^    .*fel namn 0 → 0" | cut -c1-220 | head -12
echo "-- domskäl, land, högar, tokens --"
grep -E "^  (domskäl|land per typ|högar|tokens)" /tmp/summera.$$ | cut -c1-400
grep -E "^  fördröjning till namn" /tmp/summera.$$ | cut -c1-400
grep -E "^Jämfört med|^  totalt:|^  förloppet:" /tmp/summera.$$
rm -f /tmp/summera.$$

#!/bin/bash
# Hela mätkedjan för MES-246 del 1, i ordning. Kör från repots rot:
#
#   bash dev/las-fore-slapp/kor-allt.sh <arbetsmapp> <video>
#
# Arbetsmappen ska ligga i dev/videos/ (gitignorerad): gra.bin blir ~2,3 GB
# och de klippta rutorna ~0,5 GB. Lägg den INTE i /tmp — den töms när Macen
# startar om. Facit och de små JSON-filerna kopieras till
# dev/las-fore-slapp/facit/ och checkas in.
#
#   bash dev/las-fore-slapp/kor-allt.sh dev/videos/mes-246-arbete/arb \
#        dev/golden/inspelningar/mes-246/mes-246-video.mov
set -e
ARB="${1:?arbetsmapp}"
VIDEO="${2:?video}"
HAR="$(cd "$(dirname "$0")" && pwd)"
ROT="$(cd "$HAR/../.." && pwd)"
BIN="$ARB/bin"
mkdir -p "$ARB" "$BIN" "$ARB/bilder" "$HAR/facit"

echo "== 1. bygger verktygen"
swiftc -O -o "$BIN/rorelse" "$HAR/rorelse.swift" 2>/dev/null
swiftc -O -o "$BIN/klipp"   "$HAR/klipp.swift"   2>/dev/null
swiftc -O -o "$BIN/ark"     "$HAR/ark.swift"     2>/dev/null

echo "== 2. gråskalepasset (360 px, kamerans egen analysbredd)"
"$BIN/rorelse" "$VIDEO" "$ARB" 360

echo "== 3. rörelsemåttet, suddat"
node "$HAR/matt.cjs" "$ARB"

echo "== 4. stegen"
node "$HAR/stega.cjs" "$ARB" --glapp 0.5 --golv 40 | head -3

echo "== 5. vad hände i varje steg"
node "$HAR/sortera.cjs" "$ARB" | head -2

echo "== 6. fönstren (nedläggningarna)"
node "$HAR/fonster.cjs" "$ARB" | head -2

echo "== 7. regionen ruta för ruta"
node "$HAR/regioner.cjs" "$ARB" | tail -3

echo "== 8. klipper ut rutorna i 4K"
node "$HAR/jobb.cjs" "$ARB" "$ARB/jobb-4k.json"
"$BIN/klipp" "$VIDEO" "$ARB/bilder" "$ARB/jobb-4k.json" 0.95

echo "== 9. sparar facit i repot"
cp "$ARB/facit.json" "$ARB/steg-sort.json" "$ARB/fonster.json" "$ARB/regioner.json" "$HAR/facit/"
ls -la "$HAR/facit/"
echo "== klart"

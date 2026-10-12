#!/bin/sh
# ko.sh — golden i satser, en körning i taget på en port och en profil, utan att kunna fastna.
#
#   TMPDIR=<varm profil> sh dev/golden/ko.sh <rot> <ut-mapp> <namn> <port> [kor.cjs-argument …]
#
# <rot> är trädet som mäts (absolut sökväg; kor.cjs startas därifrån). Varje sats skriver
# <ut-mapp>/<namn>-sN.log och .json. Satserna: KO_SATSER (förval "01-06;07-12;13-15;16-18"
# som listor med komma). Startas flera ko.sh mot samma profil väntar de på varandra.
#
# Varför skriptet finns (natten 2026-10-12): en kö som väntade med `pgrep -f <profilens sökväg>`
# hittade sina egna väntande skal — deras kommandorad innehöll samma sökväg — och väntade i
# sex timmar utan att säga något. Därför, och gäller varje väntan på golden:
#  - profilen spärras med en låskatalog som bär ägarens pid; en död ägare släpper låset;
#  - Chrome räknas som upptagen bara om en process som HETER "Google Chrome" har profilen
#    (pgrep -x på namnet, sedan argumenten) — ett skal eller en kö kan aldrig matcha;
#  - ingen väntan är oändlig: efter KO_VANTA_MAX sekunder (förval 1800) ger skriptet upp,
#    skriver vad som höll profilen och slutar med kod 5;
#  - slutkod 1 från kor.cjs är ett resultat (SÄMRE), inte ett fel — bara kod 2 (kom aldrig
#    fram till en tabell) körs om, en gång.
ROT="$1"; UT="$2"; NAMN="$3"; PORT="$4"
[ -n "$PORT" ] || { echo "ko.sh: användning: TMPDIR=<profil> sh dev/golden/ko.sh <rot> <ut-mapp> <namn> <port> [argument]" >&2; exit 2; }
shift 4
[ -f "$ROT/dev/golden/kor.cjs" ] || { echo "ko.sh: $ROT/dev/golden/kor.cjs finns inte" >&2; exit 2; }
[ -n "$TMPDIR" ] || { echo "ko.sh: sätt TMPDIR till den varma profilens mapp" >&2; exit 2; }
mkdir -p "$UT"
PROFIL="$TMPDIR/mesa-golden-profil"
LAS="$TMPDIR/mesa-golden-ko.las"
MAX="${KO_VANTA_MAX:-1800}"
SATSER="${KO_SATSER:-01,02,03,04,05,06;07,08,09,10,11,12;13,14,15;16,17,18}"

chrome_har_profilen() {
  for p in $(pgrep -x "Google Chrome" 2>/dev/null); do
    ps -ww -o args= -p "$p" 2>/dev/null | grep -qF -- "--user-data-dir=$PROFIL" && return 0
  done
  return 1
}
port_upptagen() { lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; }
las_agare() { cat "$LAS/pid" 2>/dev/null; }

# Väntar tills låset kan tas och varken Chrome eller porten är upptagna. Ger upp efter MAX s.
ta_last() {
  start=$(date +%s)
  while :; do
    if mkdir "$LAS" 2>/dev/null; then
      echo $$ > "$LAS/pid"
      if ! chrome_har_profilen && ! port_upptagen; then return 0; fi
      rm -rf "$LAS"
    else
      a=$(las_agare)
      if [ -n "$a" ] && ! kill -0 "$a" 2>/dev/null; then rm -rf "$LAS"; continue; fi   # död ägare
    fi
    nu=$(date +%s)
    if [ $((nu - start)) -ge "$MAX" ]; then
      echo "ko.sh: gav upp efter $MAX s — låset: $(las_agare || echo inget), Chrome med profilen: $(chrome_har_profilen && echo ja || echo nej), port $PORT: $(port_upptagen && echo upptagen || echo ledig)" >&2
      exit 5
    fi
    sleep 3
  done
}
slapp_last() { [ "$(las_agare)" = "$$" ] && rm -rf "$LAS"; }
trap 'slapp_last' EXIT INT TERM

kor_sats() {   # kor_sats <fil-namn> <fall> [kor.cjs-argument …]
  fn="$1"; fall="$2"; shift 2
  ta_last
  echo "rot $ROT md5 $(md5 -q "$ROT/index.html") start $(date +%H:%M)" > "$UT/$fn.log"
  node "$ROT/dev/golden/kor.cjs" --port "$PORT" --fall "$fall" --ut "$UT/$fn.json" "$@" >> "$UT/$fn.log" 2>&1
  k=$?
  echo "slutkod $k slut $(date +%H:%M)" >> "$UT/$fn.log"
  slapp_last
  return $k
}

i=0; samre=0; fel=0
IFS_GAMMAL="$IFS"; IFS=';'; set -f
for F in $SATSER; do
  IFS="$IFS_GAMMAL"; i=$((i + 1))
  kor_sats "$NAMN-s$i" "$F" "$@"; k=$?
  if [ $k -eq 2 ]; then kor_sats "$NAMN-s$i-om" "$F" "$@"; k=$?; fi
  case $k in 0) d="LIKA BRA eller BÄTTRE";; 1) d="SÄMRE eller BLANDAT (resultat — läs loggen)"; samre=1;; *) d="FEL, ingen tabell"; fel=1;; esac
  echo "$NAMN sats $i ($F): slutkod $k — $d"
  IFS=';'
done
IFS="$IFS_GAMMAL"
[ $fel -eq 1 ] && exit 2
[ $samre -eq 1 ] && exit 1
exit 0

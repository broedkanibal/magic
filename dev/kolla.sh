#!/bin/sh
# Körs före varje push (dev/plan/lagen.md §10). Slutar med kod 1 om något faller.
# Syntaxen kontrolleras genom att klippa ut <script>-blocken ur index.html och
# köra `node --check` på dem (headless Chrome hänger på Mesas sida) — sedan
# harnessarna: lekens ändringar och telefonens lekfoto (MES-289), lekfotot på
# datorn (MES-322), slutet av lekfotot (MES-323), datorns avstämning,
# dubblettmåttet på videofall 07, mattans element genom en uppdatering
# (MES-334 steg 2, huvudlös Chrome, några sekunder), leken bland korten
# (MES-334 steg 3, samma sätt), graveyard-frågan och högarna (MES-334 steg 4–5,
# samma sätt), kamerabänken och uppspelaren (MES-333: att den går på golden-
# fallen och partiet 2026-09-21, som facit och genom kedjan — jämförelsen mot baslinjen, --jamfor, körs
# av spegelmattans issues, inte här).
set -e
cd "$(dirname "$0")/.."
# Varje steg går genom steg(): faller det skrivs vilket steg det var, och
# skriptet slutar med kod 1. Förut stod dubbletter som
# `node … > /dev/null && echo …` — i en &&-lista stoppar set -e inte, så en
# krasch gav ändå slutkod 0 och raden "kördes" uteblev bara (2026-09-27:
# "clamp is not defined" i varje pass syntes bara i stderr).
#
# Varje steg vaktas mot häng. Natten 2026-10-12 hängde hogarna.cjs i 72
# minuter i huvudlös Chrome — samma kod gick på 33 s när den kördes om — och
# leken.cjs hängde likadant samma natt; kolla.sh väntade utan att säga något.
# Vakten mätte först väggtid (600 s per steg), men ett steg som ARBETAR får
# inte fällas: kamerabank tar ~8 min CPU ensam (266 fall, 2026-10-15), och
# under last (en annan kolla.sh, golden, flera sessioner) slog den i taket,
# dödades, kördes om och dödades igen — det tolkades som att två kolla.sh
# inte får köra samtidigt. Nu mäts stegets CPU-tid (processen och alla dess
# barn, ur ett ps-anrop varannan sekund): ett steg räknas som hängt när
# CPU-tiden inte vuxit med en sekund på KOLLA_STILLA sekunder (förval 120),
# alltså när ingen i trädet gör något. Ett steg som hänger och ändå snurrar
# fångas av väggtaket KOLLA_TAK (förval 1800 s), som bara är en sista spärr.
# Ett hängt steg stoppas med allt det startat (Chrome är ett barn till node)
# och körs om EN gång: ett häng är ingen testdom. Hänger det igen fälls
# kolla.sh. Två kolla.sh kan köra samtidigt (egna Chrome-profiler, port 0,
# egna temp-mappar): de delar bara CPU, och det syns i väggtiden, inte i vakten.
TAK="${KOLLA_TAK:-1800}"
STILLA="${KOLLA_STILLA:-120}"
HANG="${TMPDIR:-/tmp}/kolla-hang.$$"
doda_trad() { for b in $(pgrep -P "$1" 2>/dev/null); do doda_trad "$b"; done; kill "$1" 2>/dev/null; }
# CPU-tid i hundradels sekunder för processen $1 och alla dess ättlingar.
# ps skriver tiden som M:SS.ss (minuterna växer förbi 60, inga timmar).
cpu_trad() {
  ps -axo pid=,ppid=,time= | awk -v rot="$1" '
    { pid[NR] = $1; pp[NR] = $2; t[NR] = $3 }
    END {
      i[rot] = 1; n = 1
      while (n) { n = 0; for (k = 1; k <= NR; k++) if (!(pid[k] in i) && (pp[k] in i)) { i[pid[k]] = 1; n = 1 } }
      s = 0
      for (k = 1; k <= NR; k++) if (pid[k] in i) { m = split(t[k], a, ":"); v = 0; for (j = 1; j <= m; j++) v = v * 60 + a[j]; s += v }
      printf "%d\n", s * 100 + 0.5
    }'
}
kor_med_tak() {
  rm -f "$HANG"
  "$@" &
  p=$!
  ( s=0; ref=0; refS=0
    while [ $s -lt "$TAK" ]; do
      sleep 2; s=$((s + 2)); kill -0 $p 2>/dev/null || exit 0
      c=$(cpu_trad $p)
      # vuxit med en sekund, eller sjunkit (ett barn med egen CPU-tid slutade): steget lever
      if [ "$c" -ge $((ref + 100)) ] || [ "$c" -lt "$ref" ]; then ref=$c; refS=$s; fi
      if [ $((s - refS)) -ge "$STILLA" ]; then echo "ingen CPU-tid på $STILLA s (väggtid $s s)" > "$HANG"; doda_trad $p; exit 0; fi
    done
    echo "väggtaket $TAK s" > "$HANG"; doda_trad $p ) &
  v=$!
  wait $p; k=$?
  kill $v 2>/dev/null; wait $v 2>/dev/null
  return $k
}
steg() {
  namn="$1"; shift
  kor_med_tak "$@" && return 0 || kod=$?
  if [ -f "$HANG" ]; then
    echo "kolla.sh: steget $namn hängde ($(cat "$HANG")) — stoppat, körs om en gång" >&2
    kor_med_tak "$@" && { rm -f "$HANG"; return 0; } || kod=$?
    if [ -f "$HANG" ]; then
      echo "kolla.sh: FEL i steget $namn: hängde två gånger ($(cat "$HANG"))" >&2
      rm -f "$HANG"
      exit 1
    fi
  fi
  echo "kolla.sh: FEL i steget $namn (slutkod $kod)" >&2
  exit 1
}
steg syntax node -e '
const fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");
const src = fs.readFileSync("index.html", "utf8");
const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/g; let m, n = 0;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mesa-syntax-"));
while ((m = re.exec(src))) {
  const attr = m[1] || "", s = m[2]; if (!s.trim() || /\bsrc=/.test(attr)) continue;
  n++;
  const f = path.join(dir, "block" + n + (/type=["\x27]module/.test(attr) ? ".mjs" : ".js"));
  fs.writeFileSync(f, s);
  const r = cp.spawnSync(process.execPath, ["--check", f], { encoding: "utf8" });
  if (r.status !== 0) { console.error("syntaxfel i script-block " + n + ":\n" + r.stderr); process.exit(1); }
}
fs.rmSync(dir, { recursive: true, force: true });
console.log("syntax: " + n + " script-block ok");'
steg lista node dev/lista.cjs
steg lekslag node dev/lekslag.cjs
steg lekfoto node dev/lekfoto.cjs
steg lekfoto-dator node dev/lekfoto-dator.cjs
steg lekfoto-slut node dev/lekfoto-slut.cjs
steg avstamning node dev/avstamning.cjs
steg "dubbletter --fall 07" node dev/dubbletter.cjs --fall 07 > /dev/null
echo "dubbletter --fall 07: kördes"
steg delmarginal node dev/delmarginal.cjs
steg mattan node dev/mattan.cjs
steg leken node dev/leken.cjs
steg hogarna node dev/hogarna.cjs
steg kamerabank node dev/kamerabank.cjs
steg kanten-vridningen node dev/kanten-vridningen.cjs   # MES-359: mattan vrids efter korten, kort vid bildkanten väntar
steg rapport node dev/rapport/prov.cjs > /dev/null   # MES-365: problemrapporten (rutan, paketet, Cancel, dold information), attrapp för Supabase
steg rapport-c node dev/rapport/prov-c.cjs > /dev/null   # MES-367: kontot, Settings, Delete, knappen och telefonens ark; flaggan av = inga ytor (attrapp av supabase-js)
steg handlingar node dev/rapport/prov-handlingar.cjs > /dev/null   # MES-385: rättelser av handlingar i kort_handelser, den tysta rättelsen och vägen till ett Mat test-fall
steg rapport-radera node dev/rapport/prov-radera.cjs > /dev/null   # granskningen i skala, steg 5: kopieindexet, radera.cjs (0 träffar på koden efteråt) och gallra.cjs, attrapp för Supabase
echo "rapport: OK"
steg mattest node dev/mattest/kor.cjs --fall g07,g09,g10,g11,g12,p0921,parti-kedjan > /dev/null
echo "mattest: kördes"

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
# Varje steg har en tidsgräns (KOLLA_TAK sekunder, förval 600; ett steg tar
# normalt sekunder till ett par minuter). Natten 2026-10-12 hängde hogarna.cjs
# i 72 minuter i huvudlös Chrome — samma kod gick på 33 s när den kördes om —
# och leken.cjs hängde likadant samma natt; kolla.sh väntade utan att säga
# något. Ett steg som slår i taket stoppas med allt det startat (Chrome är ett
# barn till node) och körs om EN gång: ett häng är ingen testdom. Hänger det
# igen fälls kolla.sh.
TAK="${KOLLA_TAK:-600}"
HANG="${TMPDIR:-/tmp}/kolla-hang.$$"
doda_trad() { for b in $(pgrep -P "$1" 2>/dev/null); do doda_trad "$b"; done; kill "$1" 2>/dev/null; }
kor_med_tak() {
  rm -f "$HANG"
  "$@" &
  p=$!
  ( s=0
    while [ $s -lt "$TAK" ]; do sleep 2; s=$((s + 2)); kill -0 $p 2>/dev/null || exit 0; done
    : > "$HANG"; doda_trad $p ) &
  v=$!
  wait $p; k=$?
  kill $v 2>/dev/null; wait $v 2>/dev/null
  return $k
}
steg() {
  namn="$1"; shift
  kor_med_tak "$@" && return 0 || kod=$?
  if [ -f "$HANG" ]; then
    echo "kolla.sh: steget $namn hängde i $TAK s — stoppat, körs om en gång" >&2
    kor_med_tak "$@" && { rm -f "$HANG"; return 0; } || kod=$?
    if [ -f "$HANG" ]; then
      rm -f "$HANG"
      echo "kolla.sh: FEL i steget $namn: hängde i $TAK s två gånger" >&2
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
echo "rapport: OK"
steg mattest node dev/mattest/kor.cjs --fall g07,g09,g10,g11,g12,p0921,parti-kedjan > /dev/null
echo "mattest: kördes"

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
# fallen och partiet 2026-09-21 — jämförelsen mot baslinjen, --jamfor, körs
# av spegelmattans issues, inte här).
set -e
cd "$(dirname "$0")/.."
# Varje steg går genom steg(): faller det skrivs vilket steg det var, och
# skriptet slutar med kod 1. Förut stod dubbletter som
# `node … > /dev/null && echo …` — i en &&-lista stoppar set -e inte, så en
# krasch gav ändå slutkod 0 och raden "kördes" uteblev bara (2026-09-27:
# "clamp is not defined" i varje pass syntes bara i stderr).
steg() {
  namn="$1"; shift
  if "$@"; then :; else
    kod=$?
    echo "kolla.sh: FEL i steget $namn (slutkod $kod)" >&2
    exit 1
  fi
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
steg uppspelaren node dev/uppspelaren/kor.cjs --fall g07,g09,g10,g11,g12,p0921 > /dev/null
echo "uppspelaren: kördes"

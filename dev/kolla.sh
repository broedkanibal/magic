#!/bin/sh
# Körs före varje push (dev/plan/lagen.md §10). Slutar med kod 1 om något faller.
# Syntaxen kontrolleras genom att klippa ut <script>-blocken ur index.html och
# köra `node --check` på dem (headless Chrome hänger på Mesas sida) — sedan
# de tre harnessarna: datorns avstämning, dubblettmåttet på videofall 07 och
# kamerabänken.
set -e
cd "$(dirname "$0")/.."
node -e '
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
node dev/avstamning.cjs
node dev/dubbletter.cjs --fall 07 > /dev/null && echo "dubbletter --fall 07: kördes"
node dev/kamerabank.cjs

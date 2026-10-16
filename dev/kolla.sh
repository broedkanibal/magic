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
#
# Tre saker gör den billig och krockfri när flera sessioner kör den (kvällen
# 2026-10-15 körde tre sessioner kolla.sh samtidigt och kamerabänken stod i
# tio minuter; natten 2026-10-13 hängde den över tio minuter av samma skäl):
#
#  1. KÖN. En kolla.sh i taget på datorn. Låset är katalogen
#     ~/.cache/mesa/kolla.las med ägarens pid (samma mönster som
#     dev/golden/ko.sh). Den som kommer sist väntar och skriver vem som har
#     låset; ett lås vars ägare dött släpps; väntan ger upp efter
#     KOLLA_VANTA_MAX sekunder (förval 1200) med slutkod 5.
#  2. BARA DET SOM RÖRS. Ändringarna mot origin/main (committat sedan
#     förgreningen plus ocommittat och nya filer) avgör vilka steg som körs.
#     Rör de appkoden (listan APPKOD nedan) körs allt. Annars körs bara de
#     steg vars egna filer ändrats (listan i varje steg-rad) — en ändring i
#     bara dev/plan/ eller i en .md kör inget steg alls. KOLLA_ALLA=1 kör allt.
#     Finns inga ändringar alls körs också allt. KOLLA_MOT=<ref> räknar
#     ändringarna mot något annat än origin/main.
#  3. INGA FÖRÄLDRALÖSA CHROME. Varje körning får en egen TMPDIR, och alla
#     bänkar lägger sin Chrome-profil i os.tmpdir(). Efter varje steg och när
#     kolla.sh slutar (också vid fel eller Ctrl-C) stängs de Chrome vars
#     --user-data-dir ligger under den egna TMPDIR — aldrig någon annans och
#     aldrig golden-profilen. (2026-10-15 låg en Chrome från prov-b.cjs kvar i
#     40 minuter med förälder pid 1: Chrome hann inte svara på 15 s under hög
#     last, bänken gav upp och avslutade node utan att stänga Chrome.)
#
# Varje steg skriver sin tid, och slutet en tabell med alla steg och totalen.
# Varje steg vaktas mot häng på CPU-tid, inte väggtid (se vakten nedan), så
# att ett steg som arbetar under last inte fälls; kamerabänken går i flera
# processer (dev/kamerabank.cjs) och tar ~1–3 min i stället för ~8.
#
# Hela skriptet står inom { … } och slutar med exit: sh läser då in allt innan
# något körs. Annars läser sh filen medan den kör, och en ändring under tiden
# (en ff-merge i mappen, en redigering) körs mitt i — 2026-10-16 gav det ett
# syntaxfel efter första steget och ändå slutkod 0. Därför också KLAR: en
# körning som slutar innan sista steget är alltid ett fel.
{
set -e
exec 3>&1   # tabellen skrivs hit, också när felet kommer inne i ett steg med > /dev/null
cd "$(dirname "$0")/.."

# ---------------------------------------------------------------------------
# Urvalet. APPKOD: rör en ändring någon av de här körs alla steg. Ett mönster
# som slutar med / är en katalog; annars en fil. Allt utanför dev/ som inte är
# dokument (DOKUMENT) räknas också som appkod — hellre ett steg för mycket.
# dev/embed/embed.js och dev/detektor/modell/ laddas av index.html i
# produktionen (se .vercelignore) och är därför appkod fast de ligger i dev/.
# node_modules står bland dokumenten: en symlänkad node_modules i en worktree
# syns som ny fil, och inget steg läser den.
# ---------------------------------------------------------------------------
APPKOD='index.html api/ supabase/ assets/ privacy.html terms.html package.json package-lock.json vercel.json .vercelignore dev/embed/embed.js dev/detektor/modell/ dev/kolla.sh'
DOKUMENT='*.md docs/* design_handoff_*/* .claude/* .gitignore .gitattributes node_modules node_modules/*'

MOT="${KOLLA_MOT:-origin/main}"   # vad ändringarna räknas mot
ALLA=0
ANDRADE=""
SKAL=""
if [ "${KOLLA_ALLA:-0}" = "1" ]; then
  ALLA=1; SKAL="KOLLA_ALLA=1"
elif ! git rev-parse --verify -q "$MOT" > /dev/null; then
  ALLA=1; SKAL="hittar inte $MOT"
else
  ANDRADE=$( { git -c core.quotePath=false diff --no-renames --name-only "$MOT"...HEAD; git -c core.quotePath=false diff --no-renames --name-only HEAD; git -c core.quotePath=false ls-files --others --exclude-standard; } 2>/dev/null | sort -u)
  if [ -z "$ANDRADE" ]; then
    ALLA=1; SKAL="inga ändringar mot $MOT"
  else
    set -f   # mönstren i DOKUMENT får inte expanderas mot filerna här
    while IFS= read -r f; do
      [ -n "$f" ] || continue
      for m in $APPKOD; do
        case "$m" in */) case "$f" in "$m"*) ALLA=1;; esac;; *) [ "$f" = "$m" ] && ALLA=1;; esac
      done
      if [ $ALLA -eq 0 ]; then
        case "$f" in
          dev/*) ;;
          *) dok=0; for m in $DOKUMENT; do case "$f" in $m) dok=1;; esac; done
             [ $dok -eq 1 ] || ALLA=1 ;;
        esac
      fi
      if [ $ALLA -eq 1 ]; then SKAL="appkod ändrad: $f"; break; fi
    done <<LISTA
$ANDRADE
LISTA
    set +f
  fi
fi
# rors <mönster …>: lyckas om någon ändrad fil matchar något av mönstren.
# En .md läses inte av något steg och kör aldrig ett steg.
rors() {
  while IFS= read -r f; do
    case "$f" in ''|*.md) continue;; esac
    for m in "$@"; do
      case "$m" in */) case "$f" in "$m"*) return 0;; esac;; *) [ "$f" = "$m" ] && return 0;; esac
    done
  done <<LISTA
$ANDRADE
LISTA
  return 1
}

# ---------------------------------------------------------------------------
# Egen TMPDIR för körningen: bänkarnas Chrome-profiler hamnar här, och det är
# så kolla.sh känner igen sina egna Chrome (och bara dem) när den städar.
# ---------------------------------------------------------------------------
BAS="${TMPDIR:-/tmp}"; BAS="${BAS%/}"
KTMP=$(mktemp -d "$BAS/kolla.XXXXXX")
TMPDIR="$KTMP"; export TMPDIR
TIDER="$KTMP/tider"
HANG="$KTMP/hang"
: > "$TIDER"
KOLLA_START=$(date +%s)

doda_trad() { for b in $(pgrep -P "$1" 2>/dev/null); do doda_trad "$b"; done; kill "$1" 2>/dev/null || true; }
# Chrome räknas som vår bara om processen HETER Google Chrome (pgrep på namnet,
# inte -f) och dess --user-data-dir ligger under KTMP — ett skal eller en kö
# kan aldrig matcha, och golden-profilen ligger aldrig under KTMP.
vara_chrome() {   # vara_chrome [katalog]: Chrome vars profil ligger under katalogen (förval KTMP)
  for c in $(pgrep "Google Chrome" 2>/dev/null); do
    ps -ww -o args= -p "$c" 2>/dev/null | grep -qF -- "--user-data-dir=${1:-$KTMP}/" && echo "$c"
  done
  return 0
}
stang_chrome() {   # stang_chrome [vems] [katalog]
  kvar=$(vara_chrome "$2")
  [ -n "$kvar" ] || return 0
  # En bänk som just stängt sin Chrome kan ha den på väg ner: ge den 2 s.
  n=0; while [ $n -lt 4 ] && [ -n "$kvar" ]; do sleep 0.5; n=$((n + 1)); kvar=$(vara_chrome "$2"); done
  [ -n "$kvar" ] || return 0
  echo "kolla.sh: stänger $(echo $kvar | wc -w | tr -d ' ') Chrome-process(er) som ${1:-ett steg} lämnade kvar" >&2
  kill $kvar 2>/dev/null || true
  n=0; while [ $n -lt 10 ] && [ -n "$(vara_chrome "$2")" ]; do sleep 0.5; n=$((n + 1)); done
  kvar=$(vara_chrome "$2"); [ -z "$kvar" ] || kill -9 $kvar 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# Kön: en kolla.sh i taget på datorn. Låskatalogen ligger på en fast plats
# (inte TMPDIR, som skiljer sig mellan sessioner). I den står ägarens pid och
# starttid (pid-nummer återanvänds; starttiden gör att ett återanvänt nummer
# inte ser levande ut), vilken mapp som kontrolleras och steget den är i.
# ---------------------------------------------------------------------------
LASPLATS="${KOLLA_LASPLATS:-$HOME/.cache/mesa}"
LAS="$LASPLATS/kolla.las"
VANTA_MAX="${KOLLA_VANTA_MAX:-1200}"
HAR_LAS=0
rad() { sed -n "$1p" "$2" 2>/dev/null || true; }   # rad N fil: tom om filen saknas (set -e)
starttid() { LC_ALL=C TZ=UTC0 ps -o lstart= -p "$1" 2>/dev/null || true; }   # samma text oavsett språk och tidszon
JAG_START=$(starttid $$)

las_lever() {   # lyckas om låsets ägare lever (eller låset nyss tagits)
  a=$(rad 1 "$LAS/agare")
  if [ -z "$a" ]; then
    [ -d "$LAS" ] || return 1
    # Ingen ägarfil: nyss tagen — eller ägaren dog mellan mkdir och skrivningen.
    [ $(( $(date +%s) - $(stat -f %m "$LAS" 2>/dev/null || date +%s) )) -lt 30 ]
    return
  fi
  kill -0 "$a" 2>/dev/null || return 1
  t=$(starttid "$a")
  # Ger ps inget svar för en process som finns räknas den som levande: hellre
  # vänta till taket än döma en levande ägare död och städa bort dess Chrome.
  [ -z "$t" ] || [ "$t" = "$(rad 2 "$LAS/agare")" ]
}
las_vem() {
  a=$(rad 1 "$LAS/agare")
  [ -n "$a" ] || { echo "okänd (låset tas just nu)"; return; }
  st=$(rad 1 "$LAS/steg")
  echo "pid $a i $(rad 3 "$LAS/agare") sedan $(rad 4 "$LAS/agare"), steget ${st:-–}"
}
# Ett dött lås släpps under ett städlås, så att två som väntar inte kan ta bort
# ett lås som en tredje just tagit.
slapp_dott() {
  if mkdir "$LAS.stad" 2>/dev/null; then
    if [ -e "$LAS" ] && ! las_lever; then
      a=$(rad 1 "$LAS/agare")
      echo "kolla.sh: släpper ett dött lås (${a:-utan ägare})" >&2
      # Dödades ägaren utan att hinna städa (kill -9): stäng dess Chrome och ta bort dess TMPDIR.
      # Först stegets process (den lever vidare som föräldralös efter kill -9),
      # sedan Chrome, sist TMPDIR.
      sp=$(rad 1 "$LAS/stegpid")
      if [ -n "$sp" ] && [ -n "$(starttid "$sp")" ] && [ "$(starttid "$sp")" = "$(rad 2 "$LAS/stegpid")" ]; then
        doda_trad "$sp"
      fi
      d=$(rad 5 "$LAS/agare")
      case "$d" in */kolla.*) stang_chrome "en död kolla.sh" "$d"; rm -rf "$d";; esac
      rm -rf "$LAS"
    fi
    rmdir "$LAS.stad" 2>/dev/null || true
  elif [ $(( $(date +%s) - $(stat -f %m "$LAS.stad" 2>/dev/null || date +%s) )) -gt 60 ]; then
    rm -rf "$LAS.stad"
  fi
}
ta_las() {
  mkdir -p "$LASPLATS"
  start=$(date +%s); sagt=-1; vantat=0
  while :; do
    if mkdir "$LAS" 2>/dev/null; then
      printf '%s\n%s\n%s\n%s\n%s\n' "$$" "$JAG_START" "$(pwd -P)" "$(date +%H:%M:%S)" "$KTMP" > "$LAS/agare.ny"
      mv "$LAS/agare.ny" "$LAS/agare"
      HAR_LAS=1
      v=$(( $(date +%s) - start ))
      if [ $vantat -eq 1 ]; then
        echo "kolla.sh: kön släppte efter $v s" >&2
        printf '%s\t%s\n' "(väntan i kön)" "$v" >> "$TIDER"
      fi
      return 0
    fi
    v=$(( $(date +%s) - start ))
    if [ $v -ge "$VANTA_MAX" ]; then
      echo "kolla.sh: gav upp efter $v s i kön — låset ($LAS) hålls av $(las_vem)" >&2
      exit 5
    fi
    vantat=1
    las_lever || { slapp_dott; sleep 1; continue; }
    if [ $((v / 60)) -ne $sagt ]; then
      sagt=$((v / 60))
      echo "kolla.sh: väntar i kön ($v s) — en annan kolla.sh kör: $(las_vem)" >&2
    fi
    sleep 3
  done
}
slapp_las() {
  [ $HAR_LAS -eq 1 ] || return 0
  [ "$(rad 1 "$LAS/agare")" = "$$" ] && rm -rf "$LAS"
  HAR_LAS=0
}

# ---------------------------------------------------------------------------
# Slutet, också vid fel och Ctrl-C: stoppa steget som kör, stäng våra Chrome,
# släpp låset, skriv tabellen och ta bort den egna TMPDIR.
# ---------------------------------------------------------------------------
STEG_PID=""
tabell() {
  [ -s "$TIDER" ] || return 0
  echo "kolla.sh: tid per steg"
  over=""
  while IFS='	' read -r n t; do
    case "$t" in -) over="${over:+$over, }$n";; *) printf '  %-24s %4s s\n' "$n" "$t";; esac
  done < "$TIDER"
  printf '  %-24s %4s s\n' "totalt" "$(( $(date +%s) - KOLLA_START ))"
  [ -z "$over" ] || echo "  hoppades över (rör inte deras filer): $over"
}
KLAR=0
avsluta() {
  kod=$?
  trap - EXIT INT TERM HUP
  set +e
  if [ $kod -eq 0 ] && [ $KLAR -ne 1 ]; then
    echo "kolla.sh: FEL: slutade innan sista steget" >&2
    kod=1
  fi
  [ -n "$STEG_PID" ] && kill -0 "$STEG_PID" 2>/dev/null && doda_trad "$STEG_PID"
  stang_chrome "körningen"
  slapp_las
  tabell >&3
  rm -rf "$KTMP"
  exit $kod
}
trap avsluta EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

# ---------------------------------------------------------------------------
# Varje steg vaktas mot häng. Natten 2026-10-12 hängde hogarna.cjs i 72
# minuter i huvudlös Chrome — samma kod gick på 33 s när den kördes om — och
# leken.cjs hängde likadant samma natt; kolla.sh väntade utan att säga något.
# Vakten mätte först väggtid (600 s per steg), men ett steg som ARBETAR får
# inte fällas: kamerabank tog ~8 min CPU i en process (266 fall, 2026-10-15),
# och under last slog den i taket, dödades, kördes om och dödades igen. Nu
# mäts stegets CPU-tid (processen och alla dess barn, ur ett ps-anrop
# varannan sekund): ett steg räknas som hängt när CPU-tiden inte vuxit med
# en sekund på KOLLA_STILLA sekunder (förval 120), alltså när ingen i trädet
# gör något. Ett steg som hänger och ändå snurrar fångas av väggtaket
# KOLLA_TAK (förval 1800 s), som bara är en sista spärr. Ett hängt steg
# stoppas med allt det startat (Chrome är ett barn till node) och körs om
# EN gång: ett häng är ingen testdom. Hänger det igen fälls kolla.sh.
#
# Varje steg går genom steg(): faller det skrivs vilket steg det var, och
# skriptet slutar med kod 1. Förut stod dubbletter som
# `node … > /dev/null && echo …` — i en &&-lista stoppar set -e inte, så en
# krasch gav ändå slutkod 0 och raden "kördes" uteblev bara (2026-09-27:
# "clamp is not defined" i varje pass syntes bara i stderr).
# ---------------------------------------------------------------------------
TAK="${KOLLA_TAK:-1800}"
STILLA="${KOLLA_STILLA:-120}"
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
  p=$!; STEG_PID=$p
  [ $HAR_LAS -eq 1 ] && printf '%s\n%s\n' "$p" "$(starttid $p)" > "$LAS/stegpid"
  ( trap - EXIT INT TERM HUP; s=0; ref=0; refS=0
    while [ $s -lt "$TAK" ]; do
      sleep 2; s=$((s + 2)); kill -0 $p 2>/dev/null || exit 0
      c=$(cpu_trad $p)
      # vuxit med en sekund, eller sjunkit (ett barn med egen CPU-tid slutade): steget lever
      if [ "$c" -ge $((ref + 100)) ] || [ "$c" -lt "$ref" ]; then ref=$c; refS=$s; fi
      if [ $((s - refS)) -ge "$STILLA" ]; then echo "ingen CPU-tid på $STILLA s (väggtid $s s)" > "$HANG"; doda_trad $p; exit 0; fi
    done
    echo "väggtaket $TAK s" > "$HANG"; doda_trad $p ) &
  v=$!
  wait $p && k=0 || k=$?
  kill $v 2>/dev/null; wait $v 2>/dev/null || true
  STEG_PID=""
  stang_chrome "steget $namn"
  return $k
}
steg_kor() {
  kor_med_tak "$@" && return 0 || kod=$?
  if [ -f "$HANG" ]; then
    echo "kolla.sh: steget $namn hängde ($(cat "$HANG")) — stoppat, körs om en gång" >&2
    kor_med_tak "$@" && { rm -f "$HANG"; return 0; } || kod=$?
    if [ -f "$HANG" ]; then
      echo "kolla.sh: FEL i steget $namn: hängde två gånger ($(cat "$HANG"))" >&2
      rm -f "$HANG"
      return 1
    fi
  fi
  echo "kolla.sh: FEL i steget $namn (slutkod $kod)" >&2
  return 1
}
# steg <namn> <egna filer …> -- <kommando …>
# Körs om ALLA=1 eller någon av stegets egna filer ändrats; annars hoppas det över.
steg() {
  namn="$1"; shift
  egna=""
  while [ $# -gt 0 ] && [ "$1" != "--" ]; do egna="$egna $1"; shift; done
  shift
  if [ $ALLA -eq 0 ] && ! rors $egna; then
    printf '%s\t-\n' "$namn" >> "$TIDER"
    return 0
  fi
  if [ $HAR_LAS -eq 1 ] && [ "$(rad 1 "$LAS/agare")" != "$$" ]; then
    echo "kolla.sh: låset försvann under körningen (en annan kolla.sh tog det) — ställer mig i kön igen" >&2
    HAR_LAS=0
  fi
  [ $HAR_LAS -eq 1 ] || ta_las
  echo "$namn" > "$LAS/steg"
  t0=$(date +%s)
  steg_kor "$@" && kod=0 || kod=$?
  t=$(( $(date +%s) - t0 ))
  printf '%s\t%s\n' "$namn" "$t" >> "$TIDER"
  echo "kolla.sh: $namn $t s" >&2
  [ $kod -eq 0 ] || exit 1
}

if [ $ALLA -eq 1 ]; then
  echo "kolla.sh: kör alla steg ($SKAL)" >&2
else
  echo "kolla.sh: ingen appkod ändrad mot $MOT — kör bara steg vars egna filer ändrats (KOLLA_ALLA=1 kör allt). Ändrat:" >&2
  echo "$ANDRADE" | sed 's/^/  /' >&2
fi

# ---------------------------------------------------------------------------
# Stegen. Mellan namnet och -- står stegets egna filer: skriptet och det det
# läser utöver appkoden (spårat 2026-10-16 med en fs-krok på varje steg).
# Lägger du till ett steg eller en fil som ett steg läser: skriv in den här,
# annars hoppas steget över när bara den filen ändras.
# ---------------------------------------------------------------------------
steg syntax -- node -e '
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
steg lista dev/lista.cjs -- node dev/lista.cjs
steg lekslag dev/lekslag.cjs -- node dev/lekslag.cjs
steg lekfoto dev/lekfoto.cjs -- node dev/lekfoto.cjs
steg lekfoto-dator dev/lekfoto-dator.cjs -- node dev/lekfoto-dator.cjs
steg lekfoto-slut dev/lekfoto-slut.cjs -- node dev/lekfoto-slut.cjs
steg avstamning dev/avstamning.cjs dev/avstamning-rapporter.json -- node dev/avstamning.cjs
steg "dubbletter --fall 07" dev/dubbletter.cjs dev/golden/fall/ dev/golden/senaste.json -- node dev/dubbletter.cjs --fall 07 > /dev/null
steg delmarginal dev/delmarginal.cjs dev/las-fore-slapp/ -- node dev/delmarginal.cjs
steg mattan dev/mattan.cjs -- node dev/mattan.cjs
steg leken dev/leken.cjs -- node dev/leken.cjs
steg hogarna dev/hogarna.cjs -- node dev/hogarna.cjs
steg kamerabank dev/kamerabank.cjs dev/kamerabank-vinkel.json -- node dev/kamerabank.cjs
steg kanten-vridningen dev/kanten-vridningen.cjs dev/mattest/chrome.cjs -- node dev/kanten-vridningen.cjs   # MES-359: mattan vrids efter korten, kort vid bildkanten väntar
steg rapport dev/rapport/ -- node dev/rapport/prov.cjs > /dev/null   # MES-365: problemrapporten (rutan, paketet, Cancel, dold information), attrapp för Supabase
steg rapport-c dev/rapport/ -- node dev/rapport/prov-c.cjs > /dev/null   # MES-367: kontot, Settings, Delete, knappen och telefonens ark; flaggan av = inga ytor (attrapp av supabase-js)
steg handlingar dev/rapport/ dev/mattest/ dev/eventtest/facit.cjs dev/golden/lek.txt -- node dev/rapport/prov-handlingar.cjs > /dev/null   # MES-385: rättelser av handlingar i kort_handelser, den tysta rättelsen och vägen till ett Mat test-fall
steg rapport-radera dev/rapport/ dev/embed/riktiga/ dev/golden/lek.txt -- node dev/rapport/prov-radera.cjs > /dev/null   # granskningen i skala, steg 5: kopieindexet, radera.cjs (0 träffar på koden efteråt) och gallra.cjs, attrapp för Supabase
steg minnet dev/minnet/ supabase/migrations/ -- sh dev/minnet/prov.sh   # MES-373: minnet i datan — RLS med två konton, bakåtfyllningen och ett parti som fyller minnet, mot migrationen i PGlite
steg mattest dev/mattest/ dev/eventtest/facit.cjs dev/golden/fall/ dev/golden/lek.txt -- node dev/mattest/kor.cjs --fall g07,g09,g10,g11,g12,p0921,parti-kedjan > /dev/null
KLAR=1
exit 0
}

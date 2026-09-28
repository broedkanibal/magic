# MES-288 grind 0: hela mätningen på Macen, en modell och en backend åt gången,
# och bara när datorn är lugn (vanta-lugnt.cjs före varje bit). Lasten före och
# efter varje bit skrivs i resultat/<pass>-last.txt, så att en bit som stördes
# syns och kan göras om.
#
#   sh dev/detektor/fart/mat-mac.sh <pass> [modeller] [ort]
#   sh dev/detektor/fart/mat-mac.sh pass2
#   sh dev/detektor/fart/mat-mac.sh ort122 "yolox_tiny yolox_s" 1.22
set -e
cd "$(dirname "$0")/../../.."
PASS="${1:?ange ett namn på passet}"
MODELLER="${2:-dfine_n dfine_s yolox_nano yolox_tiny yolox_s}"
ORT="${3:-}"
F=""; [ -n "$ORT" ] && F="--fraga ort=$ORT"
R=dev/detektor/fart/resultat; mkdir -p "$R" dev/detektor/fart/ut
for m in $MODELLER; do
  for be in webgpu wasm; do
    if [ "$be" = webgpu ]; then P="'fp16','fp32'"; G=--gpu; else P="'fp32'"; G=; fi
    node dev/detektor/fart/vanta-lugnt.cjs --grans 3.5 --max-min 60
    echo "$m $be fore: $(uptime)" >> "$R/$PASS-last.txt"
    node dev/detektor/fart/webb.cjs "KOR({modeller:['$m'],storlekar:[640,960,1280],backends:['$be'],prec:[$P],n:30})" $G $F --tak 3000 > "$R/$PASS-$m-$be.json" 2>> dev/detektor/fart/ut/$PASS.txt
    echo "$m $be efter: $(uptime)" >> "$R/$PASS-last.txt"
  done
done

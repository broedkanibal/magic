#!/usr/bin/env bash
# Hämtar Wizards officiella manasymboler från Scryfall till assets/mana/.
# Kör om bara när symbolerna faktiskt ändrats — de bäddas in i index.html av
# hand, så en ny hämtning kräver att MANA_SVG där uppdateras också.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p assets/mana
for k in W U B R G C; do
  curl -fsS -H "User-Agent: Handvy/1.0 (MTG-korthjalp)" \
    "https://svgs.scryfall.io/card-symbols/$k.svg" -o "assets/mana/$k.svg"
  echo "assets/mana/$k.svg"
done

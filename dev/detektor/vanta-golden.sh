#!/bin/sh
# Väntar tills ingen golden-körning pågår på datorn (kor.cjs eller en
# Chrome med mesa-golden-profil), kontrollerat två gånger med några
# sekunders mellanrum, så att en tung modellkörning inte stör den andra
# agentens mätning. Rör aldrig någon annans processer.
while :; do
  if [ -z "$(pgrep -f kor.cjs)" ] && [ -z "$(pgrep -f mesa-golden-profil)" ]; then
    sleep 5
    if [ -z "$(pgrep -f kor.cjs)" ] && [ -z "$(pgrep -f mesa-golden-profil)" ]; then
      exit 0
    fi
  fi
  echo "golden kör — väntar ($(date +%H:%M:%S))"
  sleep 20
done

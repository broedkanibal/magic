# Handover 2026-10-12 (efter nattorkestreringen)

Läget efter natten 11→12 oktober. Detaljerna: `dev/plan/natt-2026-10-12-resultat.md` (vad som är rättat och hur).

## På main, i Redo att testas (Jespers prov på riktigt bord)

| Ärende | Vad |
|---|---|
| MES-362 | nytt kort läggs ned direkt som ett suddigt foto som klarnar; NOT IDENTIFIED först när spelaren behövs; Claude-gränsen 5 s |
| MES-341, MES-343, MES-356 (flytten) | kort som flyttas eller skyms binds som en flytt i stället för borta + nytt kort (`avstamBord`: `kantHaller`, `omojligt`, flytt bara inom nåden, högen väntar på läsningen) |
| MES-293 | tap-domen: kortets mått bara med kortets kvot 0,66–0,78, prövas mot de andra korten, lådan bara vid namnet |

## Öppet

| Ärende | Läge |
|---|---|
| MES-369 kortet vid bildkanten (60 s-taket `KANT_MAX`) | Todo; prompt `dev/plan/prompt-2026-10-12-mes-369-kanten.md` |
| MES-370 tap enligt vinkelgränserna när kortet ligger snett (Test of Talents först vid 90°) | Triage — Jesper sorterar |
| Sonnet mot Opus för kamerans fråga (MES-327) | prompt `dev/plan/prompt-2026-10-12-sonnet-mot-opus.md`; kör när datorn får stå i fred ~1 h |

## Att veta innan du bygger och mäter

- **Golden i kö: bara `dev/golden/ko.sh`** — `TMPDIR=<varm profil> sh dev/golden/ko.sh <rot> <ut-mapp> <namn> <port>`.
  Varm profil i natt: `TMPDIR=/private/tmp/claude-501/-Users-jesperfunk-Code-magic/e4a618fc-60bc-45b1-87b5-f16275e99c14/scratchpad/tmp`,
  port 8293 (poolen 171 ligger per port). Vänta aldrig med `pgrep -f <profilens sökväg>` — kön fastnade på det i sex timmar.
- **`dev/kolla.sh` har tak per steg** (`KOLLA_TAK`, 600 s) och kör om ett steg som hänger en gång — huvudlös Chrome
  hängde två gånger i natt. Allt annat långt i bakgrunden: lägg en vakt runt det.
- **Golden-baslinjen** (`senaste.json`) har fall 18 med läge 8 (MES-293:s kända sidoeffekt). Senaste helkörningen:
  97/119 rätt namn, 0 fel namn, 1 falsk (+2 token).
- **Kör inga bänkar medan golden går** — stillbildsfallen slår i tidstaket (fall 05 i natt).
- **Subagenter delar sessionens scratchpad** och har rensat den mitt i körningar — lägg mätfiler i
  `dev/diagnos/<mapp>/` (gitignorerad).
- **Kvällens parti 2026-10-11:** `dev/diagnos/pass-2026-10-11/` (bordsloggen, genomgang.md). Uppspelning:
  `node dev/eventtest/jamfor.cjs --logg <fil> --lek dev/diagnos/natt-2026-10-12/lek-2026-10-11-antagen.txt`
  (lekfilen är antagen; riktig lek i Supabase `game_players.lek_id`).
- **Jespers felrapporter:** klockslag + en mening per fel, och "Save table log" i Developer-lådan efter partiet.
  Klockslaget kopplar raden till loggen.

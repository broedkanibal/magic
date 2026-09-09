# Historik — en rad per incheckad körning

Totalerna ur sista raden i `kor.html`: *hittade / kort*, *rätt plats / kort
med ruta*, *rätt namn (säkert) / kort*, *fel namn*, *falska*, *tappad / kort med
ruta*. Metod är alltid det som stod i sidhuvudet vid körningen — `lokal` är
datorseende i webbläsaren utan AI-modell; kommer ett AI-steg med i provet
skrivs modellens namn här. Commit är den commit som `senaste.json` checkades
in i, alltså koden som mättes.

| datum | commit | metod | fall | hittade | plats | namn | fel namn | falska | tappad | vad som ändrats |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-09 | (golden set, före Del B) | lokal | 2 | 7/7 | 7/7 | 5/7 | 0 | 0 | 5/7 | Utgångsläget: fall 01–02 ur videon, fasta trösklar (avvikelse 25, spridning 15, blänk 235). Fall 02 fick två fel tap-lägen. |
| 2026-09-09 | (MES-28 Del B) | lokal | 6 | 20/40 | 7/7 | 10/40 | 1 | 1 | 6/7 | Avvikelsen ur bilden (Otsu + texturgolv), blänkreglerna med mörk-kant-undantag, styrslingan med ett ställdon per gren. Fall 03–06 (Jespers foton, kort omlott) nya: 3/10, 1/7, 0/5 (ribborna), 9/11 — omlott är den kända gränsen och antalet där vinglar med tröskeln. Fall 01: Thriving Heath fick ett SÄKERT Swamp (var osäkert förut) — igenkänningen, inte detekteringen. Fall 02: tap-lägena 3/4 (var 2/4). Bänken 53/53, ljusscenerna 10/10. |

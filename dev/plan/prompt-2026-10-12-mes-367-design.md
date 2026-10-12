# Prompt 2026-10-12: designytan för problemrapporten och samtycket (MES-367)

**Modell: Opus 5.5, effort medium–high.** Ny session. Bara en designyta — **ingen kod i `index.html`, `api/` eller
`privacy.html`**. Kan köras samtidigt som orkestreringen av MES-365/366/368 och nattorkestreraren: den rör inget av
deras.

---

Läs först [MES-367](https://linear.app/mesagames/issue/MES-367) (beskrivningen är specen: samtyckesmodellen och de
sex ytorna), MES-365 (vad rapportpaketet innehåller) och MES-271 (varför). Kör `agent.paborjaIssue` på MES-367.

## Samtyckesmodellen (Jesper 2026-10-12) — designa efter den, ändra den inte

| Data | När | Samtycke |
|---|---|---|
| Felrapporter: kodfel, misslyckade anrop, inga bilder | automatiskt | inget val, en rad i privacy.html |
| Rapporten: de senaste 10 min, med bilder | spelaren trycker | trycket. Rutan säger i en mening vad som skickas och varför. **Inga kryssrutor** |
| Rättade kort: beskärningen när spelaren rättar ett namn | automatiskt | **en inställning, av från början**, frågad en gång (urkryssad), ändringsbar |

Ett syfte överallt: *to fix problems and improve Mesa's card recognition, including training our models.*
Inställningen gäller bara det som sker utan tryck; en rapport följer aldrig inställningen.

## Ytorna

1. **Create your account**: inställningen som en urkryssad ruta under villkorsrutan.
2. **Villkorsspärren** (*Before you continue · Our terms are new*): samma ruta för befintliga konton.
3. **Inställningar från Home-menyn** (i dag bara *Sign out*): växeln och *Delete my reports and pictures*, med
   bekräftelse.
4. **Knappen för rapporten**: på datorn (kamerapanelen och menyn) och på telefonen. **2–3 varianter** för var den
   sitter och vad den heter.
5. **Rapportrutan**: en rad text, en tagg (*wrong card · can't see the card · slow · flicker · other*), meningen om
   vad som skickas, *Send report* / *Cancel*, kvittensen *Report R-0412 sent*. Lägen: skickar, skickat, gick inte
   (inget nät — försök igen), dagens tak nått, telefonen tappad (rapporten skickas ändå från datorn, utan telefonens
   bilder).
6. **privacy.html**: ett utkast till nya rader i tabellen i avsnitt 4 (de tre sorterna), gallring 90 dagar för
   rapporter som inte blivit ett testfall, radering, och att bilder som redan använts i en tränad modell inte går att
   ta ur modellen. Visa utkastet som text på ytan, med det som ändras markerat mot dagens text.

Texterna på ytan är förslag. Skriv dem på engelska som resten av appen, korta och utan tankstreck i synliga texter.

## Förlaga och format

- Förlagan är **den inloggade vyn** på https://magic-mauve-xi.vercel.app i ett spel, inte stub-servern. Claude får
  inte logga in: be Jesper logga in i Browser-panelen och öppna ett spel om du behöver se den. Kamerapanelen
  (MES-358, designytan *Mesa Camera Panel*) och *Create your account* finns i `index.html` att läsa.
- Gör ytan som tidigare designytor (*Mesa Camera Panel*, *Mesa Name This Card*): en artifact med sidor och
  bokstaverade lägen, ditt förslag markerat, och en rad per variant om vad den vinner och förlorar.
- Lägg underlaget i `design_handoff_rapport/` (README med ytorna, texterna och vad som valts), som de andra
  `design_handoff_*`-mapparna.

## När ytan finns

`agent.markeraBehoverJesper(MES-367, …)` med länken och de val Jesper ska göra: knappens variant, texterna och
privacy-utkastet. Säg samma sak i chatten. Commit `design_handoff_rapport/` till main (ingen kod — säg till en
pågående orkestrerare först, se `dev/plan/orkestrering.md`). Bygget av C kommer efter A och B och är inte den här
sessionens.

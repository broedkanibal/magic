# Problemrapporten och samtycket — designytan (MES-367)

Designytan: **"Mesa Problem Report"**, <https://claude.ai/artifact/NSTD99GSH8WUUkFbgAHyQz>.
Tavlornas källor ligger i `project/` (samma filer som på ytan, `rap.css` är stilen).

Gjord 2026-10-12 efter Jespers samtyckesmodell (MES-367:s beskrivning). **Inget är valt än.**
Bygget av del C kommer efter A (MES-365) och B (MES-366) och är inte designsessionens.

## Jesper väljer

| Val | Förslag | Var |
|---|---|---|
| Knappens plats | **V1**: i spelmenyn + kamerapanelens fot; på telefonen i toppraden bredvid Disconnect | sida 3 |
| Knappens namn | **Report a problem** (telefonen: *Report*) — samma ord som kvittensen *Report R-0412 sent* | sida 3 |
| Inställningens namn och text | **Share pictures of cards I correct** | sida 1, 2 |
| Texterna i rapportrutan | se *Texterna* nedan | sida 4 |
| privacy-utkastet, rättsliga grunder per rad, meningen om tränade modeller | tavla P | sida 5 |

## Sidorna och lägena

| Sida | Tavla | Läge |
|---|---|---|
| 1 · Account | **A** | Create your account: ny urkryssad ruta under villkorsrutan (provbar) |
| | **B** | Before you continue: samma ruta + en *What's new*-ruta |
| 2 · Settings | **C** | Home-menyn får *Settings* ovanför Sign out |
| | **D** | Settings: växeln + *Delete my reports and pictures* (provbar) |
| | **E** | Raderingen frågas en gång, i rutan (inte en ny dialog) |
| | **F** | Efter raderingen: texten säger det på plats, ingen grön notis; växeln orörd |
| 3 · The button | **V1** · förslag | menyn + kamerapanelens fot; telefonens topprad |
| | **V2** | alltid i toppraden bredvid kamerapillret; telefonen: rund knapp |
| | **V3** | erbjuds i 8 s efter en rättelse eller Match (+ V1:s menyrad); telefonen: knapp i bottenpanelen |
| 4 · The report | **G** | rutan (provbar: tagg, Send → Sending → Sent) |
| | **H** | skickar: fälten låsta, stapel; rutan får stängas, kvittensen kommer som en rad |
| | **I** | skickat: *Report R-0412 sent*, Copy code, Done; och raden om rutan stängts |
| | **J** | gick inte (nät): röd rad, texten och taggen ligger kvar, *Try again* |
| | **K** | dagens tak (20): sägs direkt när rutan öppnas, bara *Close* |
| | **L** | telefonen inte ansluten: gul rad, skickas från datorn utan telefonens bilder |
| | **M** | på telefonen: ark med stora taggar, valfri text, Send report |
| | **N** | telefonen: skickat av datorn, samma kod |
| | **O** | telefonen når inte datorn: *Try again* eller skicka från datorn |
| 5 · privacy.html | **P** | utkastet med tillägg och strykningar markerade mot version 2026-10-09 |

## Varianterna: vad de vinner och förlorar

| Variant | Vinner | Förlorar |
|---|---|---|
| **V1** (förslag) | inget nytt på skärmen; där man letar efter hjälp (menyn) och där kamerafel syns (panelen) | två klick; den som aldrig öppnar menyn eller panelen hittar den inte |
| V2 | ett klick, alltid synlig, alla lär sig att den finns | en kontroll till i en full topprad för något sällsynt; bjuder in rapporter om allt; telefonens runda knapp kan tryckas när telefonen ställs upp |
| V3 | frågar direkt efter en rättelse, medan de 10 minuterna innehåller felet | dyker upp vid vanliga rättelser och kan tjata; missar fel spelaren aldrig rättat, så V1:s menyrad behövs ändå; är en notis om något som redan syns |

## Texterna (förslag, engelska, utan tankstreck)

**Inställningen** (A, B, D):
- Rubrik: *Share pictures of cards I correct.*
- Text: *When you fix a card's name, Mesa keeps the picture of that card to fix problems and improve its card recognition, including training our models.*
- Under rutan (A, B): *Optional. You can change it any time in Settings.*
- I Settings, av: *Off. Nothing is kept when you correct a card.* På: *On since 12 Oct 2026.*

**Finstilt på A och B** (ändrat): *Mesa records how you use the app and any errors, linked to your account, to find and fix problems.* — tillägget är *and any errors* (felrapporterna).

**What's new på B:** *You can send us a problem report with pictures, and choose whether to share pictures of cards you correct.*

**Settings, det skickade:** *3 reports and 41 card pictures* · *Reports you send are always your own choice, one at a time, whatever the switch says.*
Frågan: *Delete 3 reports and 41 card pictures? They are deleted from Mesa right away. Pictures already used to train a model can't be taken out of that model.* · Delete / Cancel.
Efter: *Nothing you sent is stored in Mesa* · *3 reports and 41 card pictures were deleted. The switch is still on: new corrections are kept from now on.*

**Rapportrutan** (G):
- Rubrik: *Report a problem*
- Fält: *What went wrong?* — platshållare *For example: it showed Island, I played Swamp*
- Taggar: *Wrong card · Can't see the card · Slow · Flicker · Other* (en åt gången, tryck igen för att ta bort)
- Meningen: ***Sends the last 10 minutes of this game,** with pictures from your phone's camera, to fix problems and improve Mesa's card recognition, including training our models.* + länken *What's in a report* (privacy.html)
- Knappar: *Cancel* / *Send report*. **Inget krävs**: Send fungerar utan text och tagg — de 10 minuterna är rapporten.
- Skickar: *Sending. You can keep playing; this box can be closed.*
- Kvittens: *Report R-0412 sent* · *Thanks. If you write to us about it, mention R-0412.* · Copy code / Done
- Gick inte: *Couldn't send the report. Check your internet connection and try again. Your report is kept until you close this box.* · Try again
- Tak: *You have sent 20 reports today. That is the most for one day. You can send more tomorrow.*
- Telefonen borta: *Your phone isn't connected. The report is sent from this computer, without the phone's pictures.* — och meningen blir *Sends the last 10 minutes of this game from this computer, to fix problems …*

**Telefonen** (M–O):
- Meningen: ***Your computer sends the last 10 minutes of this game,** with pictures from this phone, to fix problems …*
- Skickat: *Report R-0412 sent* · *Your computer sent it. If you write to us about it, mention R-0412.*
- Når inte datorn: *Can't reach your computer. Reports are sent from the computer. Try again when the dot at the top is green, or use Report a problem on the computer.*

## privacy.html (tavla P)

**Obs:** prompten säger *avsnitt 4*, men tabellen ligger i **avsnitt 2** i dagens privacy.html
(4 är överföringar utanför EU). Utkastet ändrar:

| Avsnitt | Ändring |
|---|---|
| Versionsraden | nytt datum → `VILLKOR_VERSION` höjs, alla konton får B |
| 2 | AI-hjälpens rad: *we do not store the image* får ett *unless …* för rapport/rättelse. Tre nya rader: **Error reports** (berättigat intresse, invändning enligt 7), **Problem reports you send** (samtycke: trycket), **Pictures of cards you correct** (samtycke: inställningen). En ny mening om vad träning betyder |
| 3 | Supabase: *Database, sign-in and storage of reports and pictures* |
| 5 | Kontoradering tar med rapporter och bilder. **Gallring 90 dagar** för rapporter, felrapporter och rättelser som inte använts till en fix, ett testfall eller träning. Meningen om tränade modeller |
| 6 | De två sakerna spelaren gör själv i Settings |
| 7 | Invändningen gäller också felrapporterna |

Anthropic-raden ändras inte: ingen ny väg skickar bilder till Claude.

**Jesper godkänner:** rättslig grund per rad (samtycke 6.1 a för rapporten och inställningen,
berättigat intresse 6.1 f för felrapporterna), påståendet *A trained model does not contain your
name or account*, och att gallringen också gäller rättelser som aldrig använts (det är vad MES-367:s
gallringsregel säger: `anvandning` null eller `slangd`, oavsett `kalla`).

## Beteenden som bygget behöver veta

- **Inställningen** sparas i `user_metadata.improve_pictures` + `improve_pictures_at` (MES-367). Rutan i A
  skickas med Google-rundturen som villkoret (`sthv.villkor` i sessionStorage, ~38123); i B sparas den
  med `godkannVillkor`. Saknas fältet = av. **Frågas en gång:** finns fältet redan visar B rutan i
  sitt läge (ibockad om på), aldrig förbockad för ett konto som inte valt.
- **Rutan låser inte** Google-knappen eller *Agree and continue* — bara villkorsrutan gör det.
- **Växeln sparar direkt**, ingen Save. Av = inget nytt sparas från den stunden.
- **Delete** raderar allt spelaren skickat (rapporter, rättelser, bilder i storage) oavsett växeln, och lämnar växeln orörd.
- **Rapporten följer aldrig inställningen.** Med växeln av går det att skicka en rapport (DoD 2).
- **Telefonen skickar aldrig själv:** ett tryck där ber datorn skicka samma paket; kvittensen visas på telefonen (N). Når den inte datorn: O.
- **Rutan får stängas medan den skickar.** Kvittensen kommer då som en rad med koden (I, nedre delen). Den raden är en kvittens med en kod spelaren behöver, inte en grön ok-notis.
- **Taket** visas när rutan öppnas, inte efter att spelaren skrivit.
- **Settings** finns i Home-menyn (C). I spelets meny finns ingen Settings-rad i förslaget; spelaren går till Home för den.

## Det som inte ändras

- Kamerapanelen i övrigt (MES-358): Match, Pause camera, ↻.
- Villkorsrutan och Google-knappen på A, och spärrens knappar på B.
- Inga kryssrutor i rapportrutan.

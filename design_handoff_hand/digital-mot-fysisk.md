# Digital mot fysisk: vad som måste fungera

Underlag till MES-299, 2026-09-30. Frågan från Jesper: hur fungerar hand och
lek när en digital spelare möter en spelare med fysiska kort (Mirror my table
eller Use camera to add cards), och tvärtom? Allt i MES-299:s omfång ska
fungera oavsett om det är digital mot digital, digital mot fysisk eller
fysisk mot fysisk.

"Fysisk" nedan betyder båda kameralägena: korten, handen och leken finns på
ett riktigt bord.

## Vad appen vet om varje spelare

| | Digital spelare | Fysisk spelare |
|---|---|---|
| Handen: vilka kort | ja, bara ägaren ser dem | nej |
| Handen: hur många | ja, alla får se talet | nej |
| Leken: ordningen | ja (servern) | nej |
| Leken: hur många | ja | nej, bara lekens storlek och det som synts ute |
| Leken ligger eller är lyft | appen gör det själv | telefonen ser om leken ligger i sin ram (`kamBib.ligger`). I dag ser bara spelaren själv det, inte motståndarna |
| Bordet | ja, direkt | kameran, 0,3 till 2 s senare |
| Graveyard | ja | högvakten (MES-85) ser att högen ändras. I dag används det bara när ett kort från bordet försvinner, inte för kort som kommer direkt ur handen eller leken |
| Kan appen göra något åt spelaren? | ja | nej, bara be spelaren göra det |

## Fyra regler för allt nedan

1. **Visa bara det appen vet.** Gissa aldrig att en fysisk spelare drog ett
   kort eller scryade. Ett svar som ser riktigt ut utan att vara det är
   Mesas vanligaste allvarliga fel.
2. **Samma bildspråk för alla.** Det som syns hos en fysisk spelare rör sig
   som V1 på sida 6, men bara det kameran faktiskt ser.
3. **En handling över gränsen blir en fråga till den som har korten.** Appen
   kan inte röra en fysisk lek, så den ber ägaren, och kameran bekräftar när
   den kan.
4. **Ett tal som inte är känt visas inte.** Hellre inget tal än ett gissat.

## Fallen

### A · Att se vad de andra gör

| # | Fall | Gäller | Problemet | Idéer | Förslag |
|---|---|---|---|---|---|
| A1 | En fysisk spelare drar ett kort | digital ser fysisk, fysisk ser fysisk | Appen ser det inte | a) Visa inget, som vid ett distansbord med röst · b) Tolka "leken lyftes kort och kom tillbaka" som ett drag · c) Den fysiska spelaren trycker `D` på datorn om hen vill, och då visas det som V1 | **a**, med **c** som en valfri vana. b gissar och bryter regel 1 |
| A2 | En fysisk spelare scryar, söker eller blandar | samma | Kameran ser bara att leken är borta från sin ram | a) Dela `kamBib.ligger` med motståndarna: ramen andas, en bunt baksidor ligger vid hans hand, och raden säger "Library in his hands", sedan "Library back" · b) Valfria knappar för att berätta vad det var (Scry 2, Search) | **a**. Säg aldrig "scry" om appen inte vet det. b kan komma senare |
| A3 | En fysisk spelare visar ett kort (reveal) | digital ser fysisk | Hur skiljer appen ett visat kort från ett spelat? | a) Kortet läggs på bordet, kameran läser namnet, och när det tas bort frågar appen redan "Where did it go?". Svaret "To hand" räknas som visat · b) En visa-plats på mattan, markerad i uppstarten | **a**, bygger på det som finns |
| A4 | En digital spelare gör något, och den fysiska tittar på sitt bord | fysisk ser digital | Den fysiska spelaren tittar på korten, inte på skärmen, och missar rörelsen | a) Raden (TA) står längre för spelare i kameraläge · b) Ett kort ljud när en handling riktar sig mot dem · c) Telefonen visar det (nej: den är kamera och står med mörk skärm) | **a och b** |
| A5 | Räknarna | alla | Hand och lek hos en fysisk spelare går inte att räkna | a) Visa inget tal för fysiska spelare · b) Visa lekens storlek minus det som synts, med ett ~ | **a**. b är fel så fort någon drar ett kort. Thassa's Oracle räknar spelaren själv, som vid ett riktigt bord |
| A6 | Kameran är sen | digital ser fysisk | Händelser kommer 0,3 till 2 s efter att de hänt | Spela upp dem i den ordning de kommer | Inget särskilt behövs |

### B · Den ena påverkar den andras lek eller hand

| # | Fall | Gäller | Problemet | Idéer | Förslag |
|---|---|---|---|---|---|
| B1 | En digital spelares kort får en fysisk spelare att mala, kasta eller dra ("target player mills 3") | digital mot fysisk | Appen kan inte röra den fysiska leken | En fråga på den fysiska spelarens skärm: "Jesper: mill 3", med knappen Done. För mill och discard kan högvakten stänga frågan själv när högen ändrats tre gånger | **Frågan**. Att högvakten stänger den själv kräver en mätning först |
| B2 | En fysisk spelares kort får en digital spelare att mala, kasta, dra eller blanda | fysisk mot digital | Appen läser inte vad det fysiska kortet gör | a) Den digitala spelaren gör det själv i lekmenyn · b) Den fysiska spelaren högerklickar den digitala spelarens lek och väljer "Ask Jesper to mill 3". Då får Jesper en fråga, ett klick | **a** från början, **b** när grunden fungerar. Loggen säger "because of Sara's card" |
| B3 | "Each player" (alla drar två, Windfall, Timetwister) | alla | Digitala görs i appen, fysiska för hand | Samma fråga som B1 till alla, och var och en bockar av | **Frågan till alla** |
| B4 | Slumpvis discard ("discards a card at random") | digital | Bara appen kan slumpa rättvist ur en digital hand | "Discard at random" i handens meny, och motståndaren ser kortet vändas | **Ja**, billigt |
| B5 | Ett kort på bordet går tillbaka till ägarens lek (Chaos Warp, Condemn, tuck) | digital mot fysisk, och tvärtom | Ägaren måste flytta sitt eget kort | a) En fysisk ägare får frågan "Put it on the bottom of your library". Kameran ser att kortet lämnar bordet, och appen frågar inte "Where did it go?" eftersom svaret redan finns · b) En digital ägare gör det själv (MES-302), eller får samma fråga | **a och b** |
| B6 | Känd plats i leken (tuck överst, Approach of the Second Sun sjunde uppifrån) | alla | Alla vet var kortet ligger tills leken blandas | En markering på lekhögen hos alla. Hos en fysisk spelare finns markeringen bara i appen, och spelaren håller själv ordning på kortet | **Markeringen** |

### C · Början av partiet

| # | Fall | Problemet | Förslag |
|---|---|---|---|
| C1 | Öppningshand och mulligan | Digitala gör det i appen (O1), fysiska på bordet. Alla behöver se när de andra är klara | En status per spelare: "Looking at 7", "Mulligan to 6", "Kept 6". Fysiska sätter den själva med två knappar (Kept, Mulligan). Partiet börjar när alla behållit. Talet ger också den fysiska spelarens handstorlek vid start |
| C2 | Blanda före partiet | Digitala blandas av appen, fysiska för hand | Inget att bygga. Säg det i uppstarten |

### D · Utanför MES-299

Det här hör inte till milstolpen men dyker upp i samma samtal:

- **Titta i en annans hand eller lek** (Gonti, Telepathy, Praetor's Grasp).
  Hemlig information ska då visas för en annan spelare än ägaren. G12 i
  `dev/regler/library-effekter.md`, "vänta".
- **Byte av kontroll** (Bribery, stöld): MES-310.
- **"Each player reveals the top card"** (clash): sällsynt.
- **Commander-specifikt**: projektet Private beta · Commander.

## Vilka fall som gäller vilka par

| Fall | Digital mot digital | Digital ser fysisk | Fysisk ser digital | Fysisk mot fysisk |
|---|---|---|---|---|
| A1 dra | V1, exakt | inget (eller `D` om hen trycker) | V1 + rad + ljud | inget, som i dag |
| A2 scry, sök, blanda | V1, exakt | "library in his hands" | V1 + rad | "library in his hands" |
| A3 visa | gul kant | via bordet och "Where did it go?" | gul kant | via bordet |
| A5 räknare | exakta tal | inga tal | exakta tal | inga tal |
| B1–B3 påverka den andra | appen gör det | fråga till den fysiska | den digitala gör det, eller fråga | frågor åt båda håll |
| C1 öppningshand | O1 + status | status | status | status |

Digital mot digital behöver inget utöver sidorna 1 till 6. Fysisk mot fysisk
får bara det nya: den lyfta leken, frågorna över gränsen och statusen vid
start.

## Jespers svar 2026-09-30

| # | Frågan | Svar |
|---|---|---|
| 1 | Motståndarna ser när en fysisk spelares lek är lyft (A2) | **Ja** |
| 2 | Fysiska kan trycka `D` för att visa att de drog | **Nej** |
| 3 | Inga tal för fysiskas hand och lek (A5) | **Inte nu.** Räknarna blir som i dag tills vidare |
| 4 | Frågor över gränsen (B1, B3, B5) | **Nej**, ur hans svar på B1: det löses i samtalet. Var och en gör det på sin egen lek, den digitala i lekmenyn och den fysiska på bordet |
| 5 | Ljud när något riktar sig mot en (A4) | **Inte nu** |
| 6 | Status vid öppningshanden, Kept och Mulligan för fysiska (C1) | **Ja** |

**A3 om igen.** Jesper vill inte ha "Where did it go?" för ett visat kort: det
känns som ett fel. Det ska kännas som att man gör det man gör, alltså visar
ett av sina fysiska kort, och datorn speglar det. Nya idéer:

| Idé | Så gör spelaren | Så ser de andra det | Styrka och risk |
|---|---|---|---|
| **1 · Håll upp det** | Håller kortet med framsidan upp under telefonen en stund, utan att lägga ner det | Kortet stiger ur hans hand av baksidor, vänds mot en och står kvar så länge han håller det. Först en glimt av hans riktiga kamerabild, handen och kortet, sedan den rena bilden. Sänker han det glider det tillbaka i handen | Det mest naturliga, inget att lära sig. Kräver att kameran skiljer ett kort i luften från ett som läggs ut (MES-246: handen täcker ofta kortet). Regel: stilla i minst 0,7 s och landar inte = visat. Landar det på bordet är det ett utspel, och då ser det ut som i verkligheten |
| **2 · En visa-plats** | Lägger kortet på en liten markerad ruta på mattan, satt i bordssteget bredvid library | Samma rörelse. När kortet tas bort från rutan går det tillbaka i handen, om det inte hamnar på bordet | Fungerar med kameran som den är i dag. Men det är en regel till att lära sig och en ruta till i uppstarten |
| **3 · Uppvänt på leken** | Vänder översta kortet med framsidan upp på sin lek (reveal the top card, Courser, reveal until) | Kortet på hans lek vänds upp hos alla, med gul kant | Precis som vid ett riktigt bord, och kameran ser redan lekrutan. Gäller bara kort ur leken, inte ur handen |

**Förslag:** 1 och 3. Kör en inspelning till golden där kort hålls upp och
mät om kameran klarar det. Klarar den det inte blir 2 reserven i stället för 1.

**B1:** löses i samtalet, ingen fråga i appen (Jesper). B2 är då den digitala
spelarens lekmeny, som redan finns i designen.

**Missat fall, attach på motståndarens kort** (en aura som Pacifism på
motståndarens creature): hör inte till MES-299. MES-310 täcker det
("Ägare och kontrollant: kort som korsar spelargränsen", design först),
och MES-251 täcker attach på egna kort i spegelläget. Equipment kan efter
reglerna bara fästas på egna creatures, så det är auror, roller och
kontrollbyten som korsar gränsen.

## Det Jesper behövde bestämma (före svaren)

1. Ska motståndarna se när en fysisk spelares lek är lyft (A2)? Förslag: ja.
2. Ska fysiska spelare kunna trycka `D`, eller Scry och Search, för att
   berätta vad de gör (A1, A2)? Förslag: bara `D` till att börja med, frivilligt.
3. Inga tal för fysiska spelares hand och lek (A5)? Förslag: ja.
4. Frågor över gränsen (B1, B3, B5)? Förslag: ja. Att högvakten stänger dem
   själv kommer efter en mätning.
5. Ljud för spelare i kameraläge när något riktar sig mot dem (A4)? Förslag: ja.
6. Status vid öppningshanden, där fysiska trycker Kept eller Mulligan (C1)?
   Förslag: ja.

Hemlig information får aldrig ligga där andra kan läsa den (MES-40:s spärr,
MES-305). Det gäller allt ovan.

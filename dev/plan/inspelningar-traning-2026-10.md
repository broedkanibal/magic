# Inspelningar för träningen — manus (2026-10-04)

Underlaget är felboken (`node dev/golden/felbok.cjs`): 27 kort saknar namn i
golden 01–18. 15 av dem ligger **helt synliga** men är utbrända eller suddiga
(fall 13 och 18). 5 hittas aldrig av detektorn (fall 17). 7 hade rätt namn
överst men inte säkert. Inspelningarna nedan ger modellen just de
förhållandena — med **andra kort och andra tillfällen** än golden.

## Regeln som inte får brytas

- Golden-fallen (01–18) och deras inspelningstillfällen tränas **aldrig** på.
  Spärren `dev/detektor/delning.py` stoppar allt som inte ligger i en mapp med
  `-traning-` i namnet.
- Exponeringsprovet (pass 1) är **prov**, inte träning: ingen `-traning-` i
  mappnamnet.

## Före: förberedelser (Jesper)

| | Vad |
|---|---|
| 1 | **Disk:** minst 20 GB ledigt (i dag 1 GB). 4K-klipp tar 0,3–0,6 GB per minut |
| 2 | **Korten:** en lek du redan har, helst en som finns i Mesa. Säg vilken. Ingen lista och inget urval behövs |
| 3 | Telefonen laddad, hållaren, kamerainställningarna enligt *Kameran* |
| 4 | Med och utan hylsor om det går. De basländer du har räcker |

## Ordning: vad varje pass kräver

| Pass | Klipp | Bord | Ljus | Kamera | Kort | Syfte | Mapp |
|---|---|---|---|---|---|---|---|
| 1 | A och B, 20 s var | svart matta | taklampa rakt ovanför | se *Kameran* nedan | ~10 ur **golden-leken** i blanka sleeves, 4 land i en hög; samma platser i A och B | **prov:** är korten utbrända av exponeringen? | `dev/material/exponering/` |
| 2 | 3 × 2–3 min | svart matta | taklampa rakt ovanför | se *Kameran* | ~20 per klipp ur **en annan lek**, i sleeves | **träning:** utbrända och suddiga kort som i fall 13 | `dev/material/ÅÅÅÅ-MM-DD-traning-svartmatta-taklampa/` |
| 3 | 3 × 2–3 min | träbord | lampa snett från sidan, så att reflexen hamnar i bilden | se *Kameran* | ~20 per klipp, annan lek | **träning:** sidoljus och vidvinkel som i fall 18 | `…-traning-tra-sidoljus/` |
| 4 | 2–3 × 2–3 min | vitt eller ljust bord (eller vitt lakan) | mörkt rum, en lampa | se *Kameran* | ~20 per klipp, annan lek | **träning:** detektorn ska hitta kort på ljust bord i mörker, som i fall 17 | `…-traning-vittbord-morker/` |
| 5 | 2 × 2–3 min | valfritt | valfritt (gärna ett annat än i pass 2–4) | se *Kameran* | bara land + några kort ovanpå: 3 högar à 4–6, förskjutna så att varje namnremsa syns, sedan omlagda | **träning:** namnremsor på kort i högar | `…-traning-landhogar/` |

## Kameran

**En gång, före pass 1** — iPhone: Inställningar → Kamera:

| Inställning | Värde | Varför |
|---|---|---|
| Spela in video | **4K i 30 b/s** (alla pass) | Claude gör 1080p/1500 kbit/s av samma klipp; 4K är facit för namnen |
| Format | Hög effektivitet (HEVC) | mindre filer; avkodas utan problem |
| Auto-b/s (Auto FPS) | **av** | annars sänks takten till 24 b/s i svagt ljus |
| Förbättrad stabilisering / Action-läge | **av** | beskär och förskjuter bilden |
| HDR-video | **av** | ger annat ljus än telefonen ger Mesa i spel |
| Lås kamera (Lock Camera) | **på** | telefonen byter inte objektiv mitt i klippet |
| Lås vitbalans (Lock White Balance) | **på** | färgerna ändras inte när kort läggs ut |
| Makrokontroll | på (så att makro inte slår till av sig själv) | |

**Per pass:**

| Pass | Läge | Zoom | Hållare | Exponering | Fokus | Längd |
|---|---|---|---|---|---|---|
| 1 A | Video | 0,5× | liggande, kameran rakt ned, ~40 cm | **automatisk**, rör inget | automatisk | 20 s |
| 1 B | Video | 0,5× | samma, rör inte hållaren | **låst:** håll på ett kort tills "AE/AF-lås", dra solen ned ~1 steg tills korten inte är vita | låst (följer med låset) | 20 s |
| 2 | Video | 0,5× | liggande, ~40 cm | automatisk (som i spel; blänket ska med) | automatisk | 3 × 2–3 min |
| 3 | Video | 0,5× | liggande, ~40 cm | automatisk | automatisk | 3 × 2–3 min |
| 4 | Video | 0,5× eller 1× så att bordet ryms | **stående**, ~40–50 cm | automatisk | automatisk | 2–3 × 2–3 min |
| 5 | Video | 0,5× eller 1× | liggande, 30–40 cm | automatisk | automatisk | 2 × 2–3 min |

Telefonen sitter i hållaren och rörs inte under ett klipp. Låset i 1 B släpper
när kameraappen stängs — gör A och B direkt efter varandra.

Pass 1 och 2 i samma sittning (samma uppställning, byt bara lek och kamerans
upplösning). Pass 3, 4 och 5 är var sin uppställning. Alla pass behövs före
den riktiga träningen; piloten kan börja med pass 2.

## Manus för varje träningsklipp (2–3 min)

1. **Starta inspelningen med tomt bord**, 3 s. Rör inte telefonen sedan.
2. **Lägg korten ett i taget, i vilken ordning som helst.** Släpp kortet, ta bort
   handen, låt det ligga **helt synligt i ~1 s** innan nästa. Sprid dem över
   hela bilden, också nära kanterna.
3. Efter ~10 kort, gör variationerna:
   - **tappa** 2–3 kort (vrid 90°), tappa tillbaka ett
   - **bygg två landhögar** à 4–6 land, förskjutna så att namnremsan syns på varje
   - **lägg ett kort delvis över** ett annat (en tredjedel täckt)
   - **flytta** 2–3 kort, och **lyft upp och lägg tillbaka** ett
4. **Avsluta** med att sopa bort korten. Stoppa inspelningen.
5. **Mellan klippen:** blanda platserna, ändra höjden lite (35–50 cm) eller
   lampans läge, byt mellan hylsade och ohylsade kort.

## Pass 2 i detalj (grön-vit-röd lek, 2026-10-04)

**Prepp:** dela leken i tre högar à ~20 kort, en per klipp — 3 Forest, 3
Plains, 3 Mountain (2 av varje om de inte räcker) + 10–12 andra kort, olika i
varje hög. Varje hög som två buntar (land / övriga). Minst 3 GB ledigt på
telefonen. Kameraappen öppnad på nytt så att låset från pass 1 är borta.

| Klipp | Exponering | Övriga kort | Landhögar | Tappa |
|---|---|---|---|---|
| 1 | automatisk | över hela mattan: 2–3 under lampan, 2–3 nära kanterna | landhög 1 nere till vänster (3 Plains + 3 Forest blandade), landhög 2 uppe i mitten (3 Mountain) | 2, ett tillbaka |
| 2 | automatisk | som klipp 1, på nya platser | landhög 1 uppe till höger (3 Mountain + 3 Plains blandade), landhög 2 mitt under lampan (3 Forest) | 3, andra kort än i 1 |
| 3 | **låst**: håll på ett kort under lampan tills AE/AF-lås, solen ned ~1 steg, ta bort kortet | som klipp 1, på nya platser | landhög 1 nere till höger nära kanten (3 Forest + 3 Mountain blandade), landhög 2 uppe till vänster (3 Plains) | 2–3 |

Samma tider i alla tre: 0–3 s tomt bord · 3–50 s övriga kort ett i taget ·
50–90 s landhögarna · 90–120 s tappa, täck en tredjedel, flytta 2, lyft ett ·
120–130 s sopa bort, stoppa.

## Märkningen: 4K är facit

Ingen lista. Varje kort ligger helt synligt ~1 s när det läggs, och klippet
är i 4K. Claude läser namnen i de skarpa 4K-rutorna (skarpa remsor ur exakta
hörn gav 64/64 i MES-328), mot lekens namn när leken finns i Mesa, annars mot
alla kort. Samma ruta skalas sedan ned och komprimeras till det telefonen
skickar i spel (1080p, 1500 kbit/s) — det är den versionen modellen tränar
på. Kort som inte blir säkra i 4K slängs, eller visas för Jesper i en kort
lista att bekräfta.

## Vad Claude gör med materialet

| Pass | Används till |
|---|---|
| 1 | exponeringsprovet: andelen utbrända pixlar på korten och antal namn, A mot B |
| 2–5 | namnmodellen: verkliga bilder med namn ur 4K-rutorna, i telefonens kvalitet, bredvid de syntetiska borden ur Scryfall |
| 2–5 | detektorn: lådor ur läraren (OWLv2), som för dataset v1 |
| — | golden 01–18 mäter före och efter; rörs aldrig av träningen |

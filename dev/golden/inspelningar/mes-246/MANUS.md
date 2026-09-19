# Inspelningen till MES-246: läs kortet innan handen släpper

**Vad den ska visa:** hur kortet syns i bild på väg ner mot bordet, ruta för
ruta, i vanlig speltakt. Den analyseras på datorn i efterhand. Mesa är inte
igång under inspelningen.

**Tid:** ~15 minuter inklusive förberedelser. Själva inspelningen är ~4 min.

## Före (en gång)

1. **Kamerainställning på iPhone:** Inställningar → Kamera → Spela in video →
   **1080p HD i 60 bps**. Inställningar → Kamera → Format → **Mest kompatibelt**.
2. **Bunten:** leta fram korten i `kort.txt` och lägg dem i manusets
   ordning, överst först: 22 kort ur leken (Swamp ×4, Plains ×3, Thriving
   Moor, Thriving Heath, Fencing Ace, Ancestral Blade, Pharika's Chosen,
   Mirran Bardiche, Ukud Cobra, Maul of the Skyclaves, Killing Glare, Gorgon
   Flail, Venomous Hierophant, Pacifism, Danitha Capashen, Trusty Retriever,
   Flutterfox).
3. **Tokens:** ett **Soldier-token-kort** (eller det token-kort du har). Till
   Rebel-tokenen använder du **ett kort med baksidan upp**, som du brukar när
   det saknas en token.
4. **Library och graveyard i bild**, som i spel: resten av leken (korten som
   inte är med i manuset) som en bunt med baksidan upp nere till vänster, och
   en tom plats för graveyard bredvid.
5. **Telefonen i hållaren** på samma höjd som när du spelar (~40 cm), samma
   bord, matta och ljus. Rör inte hållaren under inspelningen.
6. **Bordet tomt** i bild, utom library.

## Inspelningen

1. Öppna kameraappen → **Video** → tryck på inspelning.
2. **Vänta 3 sekunder** med tomt bord.
3. Gör **en rad i taget** i `kort.txt`, i **vanlig speltakt**. Sakta inte ner.
   **2–3 sekunders paus** mellan raderna, handen helt ur bild. Raderna med
   `# --- Tur` är bara rubriker.
4. Hur varje sort görs:

| I manuset | Så här |
|---|---|
| vanligt kort | lägg ned det på en fri plats |
| `tappad` | lägg ned det **redan tappat** (Thriving-landen kommer in tappade) |
| `hög A` / `hög B` | lägg landet på högen **så som du brukar stapla mana** |
| `på X` | lägg det fäst vid X direkt, **förskjutet så som du brukar** |
| `token … (token-kort)` | lägg ut token-kortet bredvid kortet som skapade det |
| `token … (kort med baksidan upp)` | lägg ett kort med baksidan upp bredvid kortet som skapade det |
| `flytta X till Y` | ta upp X och lägg det vid Y, som när du equipar |
| `tappa` / `untappa` | vrid kortet eller hela högen, så som du brukar |
| `untappa allt` | vrid tillbaka allt som är tappat |
| `till graveyard` | lägg kortet på graveyard-högen |
| `till handen` | lyft kortet och ta det ur bild |
| `överst i library` | lägg kortet med baksidan upp överst på library |
| `mill 3` | ta de tre översta korten från library och lägg dem på graveyard, ett i taget, med framsidan upp |
| `bort …` | lyft bort tokenen ur bild |

5. När sista raden är gjord: **vänta 3 sekunder** och stoppa.

Blir något fel spelar det ingen roll. Fortsätt, och skriv vad som hände sist
i `kort.txt`. Det tar ~4 minuter.

## Efter

1. AirDropa videon till Macen.
2. Lägg den i den här mappen: `dev/golden/inspelningar/mes-246/`
   (filnamnet spelar ingen roll).
3. Starta sessionen med prompten för MES-246.

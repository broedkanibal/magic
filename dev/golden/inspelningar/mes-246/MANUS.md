# Inspelningen till MES-246: läs kortet innan handen släpper

**Vad den ska visa:** hur kortet syns i bild på väg ner mot bordet, ruta för
ruta, i vanlig speltakt. Den analyseras på datorn i efterhand. Mesa är inte
igång under inspelningen.

**Tid:** ~10 minuter inklusive förberedelser. Själva inspelningen är ~2 min.

## Före (en gång)

1. **Kamerainställning på iPhone:** Inställningar → Kamera → Spela in video →
   **1080p HD i 60 bps**. Inställningar → Kamera → Format → **Mest kompatibelt**.
2. **Leta fram de 20 korten** i `kort.txt` och lägg dem i en bunt i
   manusets ordning, överst först. Då blir det rätt av sig självt.
   Ha också en **Soldier-token** redo bredvid: ett token-kort, eller det du
   brukar använda som token.
3. **Telefonen i hållaren** på samma höjd som när du spelar (~40 cm), samma
   bord, matta och ljus. Rör inte hållaren under inspelningen.
4. **Bordet tomt** i bild.

## Ancestral Blade och tokenen

Ancestral Blade skapar en 1/1 Soldier-token när den kommer in, och fästs vid
den. Gör som du brukar i spel: lägg ut Blade, sedan tokenen, och flytta
Blade till tokenen (tre rader i manuset). Längre fram equipas Blade om till
Hooded Blightfang. Det mäter om kameran klarar en token (ett kort som inte
finns i leken) och ett kort som flyttas från ett kort till ett annat.

## Inspelningen

1. Öppna kameraappen → **Video** → tryck på inspelning.
2. **Vänta 3 sekunder** med tomt bord. Det ger en referens utan kort.
3. Gör en rad i taget: lägg korten **ett i taget**, i ordningen i `kort.txt`, i **vanlig
   speltakt**. Sakta inte ner, eftersom det är den vanliga rörelsen som ska
   mätas. **2–3 sekunders paus** mellan korten, handen helt ur bild.
4. Så här gör du med de olika sorterna:

| I manuset | Så här |
|---|---|
| vanligt kort | lägg ned det på en fri plats, som i spel |
| `tappad` | lägg ned det **redan på sned**, som när ett kort kommer in tappat |
| `på X` | lägg det ovanpå kortet X, **förskjutet så som du brukar** lägga equipment |
| `hög A` / `hög B` | lägg landet på högen, **så som du brukar stapla mana**. A = Swamp, B = Plains |
| `token` | lägg ut tokenen **så som du brukar**, bredvid kortet som skapade den |
| `flytta X till Y` | ta upp X från bordet och lägg det på Y, som när du equipar om |

5. När sista kortet ligger: **vänta 3 sekunder** och stoppa inspelningen.

Blir något fel (du tappar ett kort, lägger fel eller får kortet i fel ordning)
spelar det ingen roll. Fortsätt, och skriv en rad om det sist i `kort.txt`.

## Efter

1. AirDropa videon till Macen.
2. Lägg den i den här mappen: `dev/golden/inspelningar/mes-246/`
   (filnamnet spelar ingen roll).
3. Starta sessionen med prompten för MES-246.

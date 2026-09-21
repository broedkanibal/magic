---
name: laget
description: Visar läget i Mesa på en skärm — vilka issues som körs just nu och om någon saknar session, vad som väntar på Jesper (Provas och Needs Jesper), vad som är blockat, vilka grenar som inte är ihopslagna i main, vad som är näst på tur och hur långt varje projekt kommit. Använd den när Jesper vill ha överblick, frågar "vad händer nu", "vad kör vi", "vad väntar på mig", "var är vi", "vad är kvar", eller ber om "läget". Läser bara; skriver och ändrar ingenting.
---

# Läget i Mesa

Ett svar på "vad händer nu" utan att någon läser 80 issues.

## Så kör du den

**1. Hämta Linear och git:**

```bash
node dev/laget.cjs
```

**2. Hämta sessionerna med `ListAgents`.** Skriptet ser dem inte — bara
Claude Code självt vet vilka sessioner som lever. Kör det i samma veva.

**3. Slå ihop de två** och skriv ut resultatet. Lägg sessionen bredvid sin
issue på raden under KÖRS NU, och märk ut de två fallen som betyder något:

| Vad du ser | Vad du skriver |
|---|---|
| Issue i In Progress **utan** session | `? ingen synlig session — kan vara en subagent` |
| Session **utan** issue i In Progress | `⚠ sessionen jobbar på <MES-NN> som inte står i In Progress` |
| Session vars issue är **Done** | `✓ klar — sessionen kan stängas` |

Sessionens namn brukar bära issuenumret ("MES-250: …"). Gör det inte det,
gissa inte — skriv namnet som det är och säg att kopplingen är oklar.

**Säg aldrig att en issue är övergiven.** Subagenter syns inte i
`ListAgents`, så en rad utan session bevisar ingenting — en orkestrerande
session kan ha sex agenter igång utan att någon av dem syns. Föreslå att
Jesper frågar sessionen som har issuen, och flytta den aldrig själv. Bara
den session som tog issuen lämnar tillbaka den.

## Så skriver du svaret

Kort, i den ordning skriptet ger, utan att upprepa hela listor. Rubriker och
tabeller, inte löpande text. Tomma avsnitt får ett `—` och en rad, inte tre.

Avsluta med **en mening** om vad som är mest angeläget — den enda tolkning du
gör. Är ingenting angeläget, säg det.

## Vad kolumnerna betyder

| Kolumn | Betyder |
|---|---|
| **In Progress** | en session kör den **nu** — inget annat |
| **Provas** | väntar på Jesper — prov, designval eller konto, med eller utan kod |
| **Blocked** | väntar på en annan issue; ingen ska plocka upp den |
| **Todo** | i kön, ingen session |
| **Backlog** | inte bedömd |

Priority är köordningen: **High** = näst på tur, **Medium** = senare.
Ordningen kommer ur `dev/plan/orkestrering.md`.

## Gör inte

- Ändra ingenting. Ser du en issue som borde flyttas — säg det, flytta inte.
- Läs inte issue-beskrivningar för att "fylla ut". Skriptets rader räcker.
- Kör inte golden eller bänken. Det här är en avläsning, inget prov.

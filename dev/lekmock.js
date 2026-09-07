/* ══════════════════════════════════════════════════════════════════
   Syntetisk solfjäder — mätbänk för lekens fotoväg.

   Att fotografera hundra riktiga kort varje gång man flyttar en knapp är
   inte rimligt, och geometrin går att pröva utan dem: det enda som avgör
   om avläsningen KAN lyckas är hur många bildpunkter breda korten är i
   den bild modellen faktiskt får, och det är ren räkning.

   Talet allt vilar på är uppmätt, inte härlett: versalhöjden i ett
   korts titelrad är 2,9 % av kortets bredd. Mätt på en Scryfall-bild i
   488 punkters bredd, där versalhöjden är 14 punkter.

   Använd så här, i konsolen på en sida som kör appen:

     const m = await import('./dev/lekmock.js');
     m.matning({ hogar: 3, djup: 12 });        // tabell över kolumnvalen
     await m.mata(3, 12);                      // lägg in ett foto i dialogen

   Vad den INTE gör: den syntetiska bilden har perfekt ljus, ingen
   oskärpa och inget perspektiv. Den kan säga att geometrin är fel, den
   kan aldrig säga att den är rätt. Det avgörs av ett riktigt foto.
   ══════════════════════════════════════════════════════════════════ */

/* Kortets mått i millimeter, och utläggningens. PITCH är hur mycket av
   varje kort som syns ovanför nästa: titelraden slutar 10,6 mm ned på
   kortet, så 11 mm är det minsta som visar hela den. */
export const MM = { KORT_B: 63, KORT_H: 88, GAP: 6, PITCH: 11 };

/* Ur api/identify.js och index.html. Ändras de där ska de ändras här. */
export const GRANSER = {
  maxTecken: 900_000,     // MAX_IMAGE_B64 i api/identify.js
  maxTokens: 4784,        // Opus 5, high-resolution-nivån
  maxSida: 2576,          // långsidan, samma nivå
  titelkvot: 0.029        // uppmätt versalhöjd / kortbredd
};

const NAMN = ['Sol Ring', 'Arcane Signet', 'Lightning Bolt', 'Swords to Plowshares',
              'Counterspell', 'Brainstorm', 'Thalia, Guardian of Thraben',
              'Cultivate', 'Beast Within', 'Anguished Unmaking'];

/* Ritar en solfjäder med rätt proportioner. Titelraden får den storlek
   den har på ett riktigt kort, så att en avläsning mot bilden mäter
   samma sak som en avläsning mot bordet — vad gäller storlek. */
export function fjader({ bredd = 3024, hogar = 3, djup = 12, marginal = 0.06, bord = '#3a4a3f' } = {}) {
  const { KORT_B, KORT_H, GAP, PITCH } = MM;
  const blockB = hogar * KORT_B + (hogar - 1) * GAP;
  const blockH = (djup - 1) * PITCH + KORT_H;
  const s = (bredd * (1 - 2 * marginal)) / blockB;          // bildpunkter per millimeter
  const cv = document.createElement('canvas');
  cv.width = Math.round(bredd);
  cv.height = Math.round(blockH * s + 2 * marginal * bredd);
  const c = cv.getContext('2d');
  c.fillStyle = bord; c.fillRect(0, 0, cv.width, cv.height);
  const ox = marginal * bredd, oy = marginal * bredd;
  for (let h = 0; h < hogar; h++) for (let d = 0; d < djup; d++) {
    const x = ox + h * (KORT_B + GAP) * s, y = oy + d * PITCH * s;
    const w = KORT_B * s, hh = KORT_H * s;
    c.fillStyle = '#12100e'; c.fillRect(x, y, w, hh);                 // ramen
    c.fillStyle = '#d9d2c4'; c.fillRect(x + w * .045, y + hh * .032, w * .91, hh * .075);
    c.fillStyle = '#14110d';
    /* .72 är ungefär versalhöjd genom fontstorlek för en serif. */
    c.font = `600 ${Math.round(w * GRANSER.titelkvot / .72)}px Georgia, serif`;
    c.fillText(NAMN[(h * djup + d) % NAMN.length], x + w * .07, y + hh * .032 + hh * .062);
  }
  cv.facit = hogar * djup;
  return cv;
}

/* Räknar fram vad ett givet kolumnval ger, utan att rita något. Det är
   den här tabellen som avgör hur många kort som ryms per foto. */
export function rakna({ hogar = 3, djup = 12, maxarea = 2_000_000 } = {}) {
  const { KORT_B, KORT_H, GAP, PITCH } = MM;
  const blockB = hogar * KORT_B + (hogar - 1) * GAP;
  const blockH = (djup - 1) * PITCH + KORT_H;
  /* Duken kapas mot area OCH långsida, precis som lekDuk gör. */
  const rat = blockB / blockH;
  let b = Math.sqrt(maxarea * rat), h = maxarea / b;
  const krymp = GRANSER.maxSida / Math.max(b, h);
  if (krymp < 1) { b *= krymp; h *= krymp; }
  const W = b / (hogar * 1.0952 - 0.0952);
  return {
    hogar, djup, kort: hogar * djup,
    bild: Math.round(b) + '×' + Math.round(h),
    kortbredd: Math.round(W),
    titelrad: +(W * GRANSER.titelkvot).toFixed(1),
    tokens: Math.ceil(b / 28) * Math.ceil(h / 28),
    duger: W >= 340 ? 'ja' : W >= 286 ? 'knappt' : 'nej'
  };
}

/* Tabellen över valen. Kolumnantalet är det enda talet appen inte kan
   mäta själv, så det är det som ska väljas med öppna ögon. */
export function matning({ djup = 12 } = {}) {
  const rader = [2, 3, 4, 5, 6].map(h => rakna({ hogar: h, djup }));
  if (console.table) console.table(rader);
  return rader;
}

/* Lägger in en syntetisk solfjäder i den öppna lek-dialogen, som om den
   släppts dit. Kräver att dialogen är öppen. */
export async function mata(hogar = 3, djup = 12, bredd = 3024) {
  const cv = fjader({ bredd, hogar, djup });
  const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.92));
  const fil = new File([blob], `lek-${hogar}x${djup}.jpg`, { type: 'image/jpeg' });
  if (typeof lekTaEmotFil !== 'function') throw new Error('Öppna "Min lek" först.');
  await lekTaEmotFil(fil);
  return { facit: cv.facit, fotoKB: Math.round(blob.size / 1024), bild: cv.width + '×' + cv.height };
}

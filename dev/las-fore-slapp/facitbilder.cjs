#!/usr/bin/env node
/* Gör stillbilderna som Jesper granskar facit med: tre rutor per sort —
   en kvarts sekund före släppet, släppet, och bordet stilla efteråt.

   Kör: node dev/las-fore-slapp/facitbilder.cjs <arbetsmapp> <video> <ark-binär>

   Skriver PNG i dev/las-fore-slapp/facit-bilder/. */
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [ARB, VIDEO, ARK] = process.argv.slice(2);
if (!ARB || !VIDEO || !ARK) { console.error('node facitbilder.cjs <arbetsmapp> <video> <ark>'); process.exit(1); }
const UT = path.join(__dirname, 'facit-bilder');
fs.mkdirSync(UT, { recursive: true });
const S = JSON.parse(fs.readFileSync(path.join(ARB, 'steg-sort.json'), 'utf8'));
const W = 360, H = 202, VW = 3840, VH = 2160;

/* Sorterna, en per bild. Stegnumret är facit-slapp.json:s. */
const SORTER = [
  ['vanligt-kort', 24, 'Ukud Cobra läggs på en fri plats'],
  ['tappat-kort', 5, 'Thriving Moor läggs ner redan tappad'],
  ['land-pa-hog', 11, 'Swamp läggs på Swamp-högen'],
  ['equipment-under', 28, 'Maul of the Skyclaves fästs under Fencing Ace'],
  ['aura', 48, 'Pacifism fästs vid Ukud Cobra'],
  ['token-i-ficka', 13, 'Soldier-tokenen (kort med baksidan upp, i plastficka)'],
  ['token-flyttad-under', 14, 'Ancestral Blade skjuts in under tokenen'],
  ['flytt', 51, 'Ancestral Blade flyttas om, under Danitha'],
  ['till-graveyard', 56, 'Pacifism läggs på graveyard-högen'],
  ['mill', 45, 'ett kort ur library läggs på graveyard (mill 3)']
];

for (const [namn, nr, text] of SORTER) {
  const s = S.steg.find(x => x.nr === nr);
  if (!s || !s.t_slapp) { console.log(`hoppar ${namn}: steg ${nr} saknas`); continue; }
  const b = s.box;
  const cx = (b.x + b.w / 2) / W * VW, cy = (b.y + b.h / 2) / H * VH;
  let sid = Math.max(b.w / W * VW, b.h / H * VH) * 1.9;
  sid = Math.max(900, Math.min(sid, 2100));
  const x = Math.max(0, Math.min(VW - sid, Math.round(cx - sid / 2)));
  const y = Math.max(0, Math.min(VH - sid, Math.round(cy - sid / 2)));
  const rader = [
    [s.t_slapp - 0.25, `${nr} -0,25 s`],
    [s.t_slapp, `${nr} SLÄPP ${s.t_slapp.toFixed(2)} s`],
    [s.t_stilla + 0.25, `${nr} stilla ${s.t_stilla.toFixed(2)} s`]
  ].map(([t, e]) => [t.toFixed(3), (x / VW).toFixed(5), (y / VH).toFixed(5), (sid / VW).toFixed(5), (sid / VH).toFixed(5), e].join(';'));
  const tmp = path.join(ARB, `ark-${namn}.txt`);
  fs.writeFileSync(tmp, rader.join('\n') + '\n');
  const fil = path.join(UT, `${namn}.png`);
  execFileSync(ARK, [VIDEO, fil, '3', '460', '@' + tmp], { stdio: 'ignore' });
  console.log(`${fil}  — ${text}`);
}

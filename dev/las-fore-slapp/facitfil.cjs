#!/usr/bin/env node
/* Skriver facit för inspelningen bredvid videon:
   dev/golden/inspelningar/mes-246/facit-slapp.json och FACIT.md.

   Kör: node dev/las-fore-slapp/facitfil.cjs <arbetsmapp>

   Facit är tiden för varje steg i inspelningen — när rörelsen börjar, när
   kortet är nere, när handen släpper och när bordet står stilla — plus vad
   lådan säger om steget. Nedläggningarna har också kortets namn (namn.json).
   Allt mätt i 360 px analysbredd; tiderna är videons. */
'use strict';
const fs = require('fs'), path = require('path');
const ARB = process.argv[2];
if (!ARB) { console.error('node facitfil.cjs <arbetsmapp>'); process.exit(1); }
const ROT = path.join(__dirname, '..', '..');
const UT = path.join(ROT, 'dev', 'golden', 'inspelningar', 'mes-246');
const S = JSON.parse(fs.readFileSync(path.join(ARB, 'steg-sort.json'), 'utf8'));
const F = JSON.parse(fs.readFileSync(path.join(ARB, 'facit.json'), 'utf8'));
const FO = JSON.parse(fs.readFileSync(path.join(ARB, 'fonster.json'), 'utf8'));
let namn = {}; try { namn = JSON.parse(fs.readFileSync(path.join(ARB, 'namn.json'), 'utf8')); } catch (e) {}
const nedlagg = new Set(FO.fonster.map(f => f.nr));

const steg = S.steg.map(s => ({
  nr: s.nr,
  t_borjar: s.t_borjar, t_land: s.t_land || null, t_slapp: s.t_slapp || null, t_stilla: s.t_stilla,
  lada: s.box, liggande: s.liggande, dom: s.dom,
  nedlaggning: nedlagg.has(s.nr),
  namn: namn[String(s.nr)] || null
}));
fs.writeFileSync(path.join(UT, 'facit-slapp.json'), JSON.stringify({
  video: 'dev/material/inspelningar/2026-09-19-mes-246-las-fore-slapp/telefon.mov', bredd: F.bredd, hojd: F.hojd, fps: F.fps, rutor: F.rutor,
  kortRef: S.kortRef, steg
}, null, 1) + '\n');

const r = n => n == null ? '–' : n.toFixed(2);
let md = `# Facit för inspelningen (MES-246)

Tiderna är videons sekunder. Framtaget halvautomatiskt av skripten i
\`dev/las-fore-slapp/\` (se \`kor-allt.sh\`) och kontrollerat mot \`MANUS.md\`
och \`kort.txt\`. Måtten är i **360 bildpunkters analysbredd** — samma bredd
som kameran analyserar i, oavsett om videon är 4K eller 1080p.

| Spalt | Vad |
|---|---|
| \`börjar\` | första rutan med rörelse i steget |
| \`land\` | kortet är nere: därifrån står det som ligger kvar på sin plats |
| \`släpp\` | sista rutan där handen rör kortet — mätt som sista rutan där kortets egen ruta inte ser ut som den gör när bordet vilar |
| \`stilla\` | bordet står stilla igen |
| \`låda\` | vad som ändrades, i 360 px |
| \`namn\` | bara för nedläggningar: kortet, avläst ur den stilla rutan |

**Kortets storlek:** ${S.kortRef.kort}×${S.kortRef.lang} i 360 px, alltså
${Math.round(S.kortRef.kort * 3840 / F.bredd)}×${Math.round(S.kortRef.lang * 3840 / F.bredd)} bildpunkter i 4K och
${Math.round(S.kortRef.kort * 1920 / F.bredd)}×${Math.round(S.kortRef.lang * 1920 / F.bredd)} i 1080p (median; vidvinkeln
gör kort nära bildens mitt större än kort vid kanten).

| nr | börjar | land | släpp | stilla | låda | vad | namn |
|---:|---:|---:|---:|---:|---|---|---|
`;
for (const s of steg)
  md += `| ${s.nr} | ${r(s.t_borjar)} | ${r(s.t_land)} | ${r(s.t_slapp)} | ${r(s.t_stilla)} | ${s.lada.w}×${s.lada.h} | ${s.nedlaggning ? '**nedläggning**' : s.dom} | ${s.namn || ''} |\n`;
md += `
## Så mättes det

1. Varje bildruta skalas till 360×202 gråskala (\`rorelse.swift\`).
2. Rörelsemåttet räknas på **suddade** rutor (\`matt.cjs\`): inspelningen är
   tagen i lampljus och sensorbruset ger annars utslag över hela bilden
   (medelskillnaden mellan två stilla rutor är 3,2 gråsteg orörd, 0,7 suddad).
3. Ett steg är sammanhängande rörelse med högst en halv sekunds paus i
   (\`stega.cjs\`). ${steg.length} steg hittades i de 53 stegen i MANUS.md —
   fler, eftersom ett steg som "untappa hög A, hög B och Thriving Moor" är
   tre rörelser.
4. \`släpp\` och \`land\` mäts inne i lådan som ändrades: andelen bildpunkter
   som står som de gör när bordet vilar. Släppet är sista rutan under 97 %.
5. Nedläggningarna (\`fonster.cjs\`) är de steg där lådan har ett korts mått
   och något ljust ligger kvar efteråt.
`;
fs.writeFileSync(path.join(UT, 'FACIT.md'), md);
console.log(`skrivet: ${path.join(UT, 'facit-slapp.json')} och FACIT.md — ${steg.length} steg, ${nedlagg.size} nedläggningar`);

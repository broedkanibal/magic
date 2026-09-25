'use strict';
/* Beskärningar sparade av golden (kor.cjs --beskarningar <mapp>) → ett set för
   bänken (MES-287): cache/<namn>/manifest.json med filerna som de är. Facit
   saknas (namn null), så RAK() räknar allt som "fel" — det som avläses är
   modellens svar, rho, inpassningens p och ORB per namn, rad för rad.

     node dev/embed/beskarningar-set.cjs <mapp> <namn>
     node dev/embed/webb.cjs bank.html "RAK('<namn>')" --gpu */
const fs = require('fs');
const path = require('path');
const [mapp, namn] = process.argv.slice(2);
if (!mapp || !namn) { console.error('node dev/embed/beskarningar-set.cjs <mapp> <namn>'); process.exit(2); }
const ut = path.join(__dirname, 'cache', namn);
fs.mkdirSync(ut, { recursive: true });
const filer = fs.readdirSync(mapp).filter(f => /\.(jpe?g|png)$/i.test(f)).sort();
const manifest = [];
for (const f of filer) { fs.copyFileSync(path.join(mapp, f), path.join(ut, f)); manifest.push({ fil: f, typ: f.replace(/\.[^.]+$/, '').replace(/[-_ ]?\d+$/, '') || 'x', namn: null, ratta: [] }); }
fs.writeFileSync(path.join(ut, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`${manifest.length} beskärningar → ${path.relative(process.cwd(), ut)}`);

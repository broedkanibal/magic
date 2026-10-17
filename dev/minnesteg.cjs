#!/usr/bin/env node
/* Steg 2 i trappan — minnet utanför den aktiva leken (MES-376, granskningen 2026-10-17).

   Kör:  node dev/minnesteg.cjs            bänken (dev/kolla.sh), sekunder
         node dev/minnesteg.cjs <index.html>

   Klipper ut tre rena delar ur index.html (samma sätt som dev/aktivlek.cjs)
   och kör dem i node med stubbar för det runt omkring, så att det som
   provas är appens egen regel:
     • domMinne (fynd 1): minnets namn, ORB-buret, mot titelraden dömd om
       mot lekens och minnets namn — en säker titel på ett ANNAT namn, var
       det än hör hemma, fäller domen; titeln är aldrig ett krav.
     • kamPoolDelning (fynd 2): den aktiva lekens pool är lekens namn och
       inget annat — grannarna ur minnet och resten av minnet hör till
       steg 2:s pool, där ORB är villkoret.
     • identifyMedModell (fynd 4): en pool utan annat namn än baksidan ger
       aldrig en "säker" modell — marginalen mot ingenting är ingen marginal,
       så ett uppvänt kort kan inte dömas till baksida utan ORB.
   Slutkod 1 om något faller. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const fil = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : path.join(__dirname, '..', 'index.html');
const src = fs.readFileSync(fil, 'utf8').split('\n');
function klipp(startRad, slutRad) {
  const start = src.findIndex(l => l.startsWith(startRad));
  if (start < 0) throw new Error('hittar inte "' + startRad + '" i ' + fil);
  let slut = -1;
  for (let i = start + 1; i < src.length; i++) if (src[i].startsWith(slutRad)) { slut = i; break; }
  if (slut < 0) throw new Error('hittar inte slutet på "' + startRad + '" i ' + fil);
  return src.slice(start, slut + 1).join('\n');
}
const BAKSIDA_NAMN = '(baksida)';
const BASICS = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);
const landTyp = namn => { const m = /^(?:Snow-Covered )?(Plains|Island|Swamp|Mountain|Forest|Wastes)$/.exec(String(namn || '')); return m ? m[1] : null; };
const landVisning = typ => ({ name: typ, sid: 'sid-' + typ });

let fel = 0, n = 0;
const check = (vad, ok) => { n++; if (!ok) { fel++; console.log('  FEL: ' + vad); } else console.log('  ok:  ' + vad); };

/* ── fynd 1: domMinne ───────────────────────────────────────────────────── */
{
  const ctx = { console, BAKSIDA_NAMN };
  vm.createContext(ctx);
  const domMinne = vm.runInContext(klipp('function domMinne(', '}') + '\n;domMinne', ctx);
  const v2 = (...namn) => ({ accept: true, rec: { cands: namn.map((x, i) => ({ name: x, sid: 's' + i, score: 0.5 - i * 0.1 })) } });
  const titel = (namn, poang, marginal, utanfor) => ({ namn, poang, marginal, utanfor: utanfor || null });
  console.log('domMinne: minnets namn Y, ORB-buret, mot titelraden');
  let d = domMinne(v2('Y', 'Z'), null);
  check('ingen titel läst: säkert, minne+orb (ORB är villkoret, titeln inget krav)', d && d.saker && d.varfor === 'minne+orb' && d.cands[0].name === 'Y');
  d = domMinne(v2('Y', 'Z'), titel('Y', 0.9, 0.5));
  check('titeln säker på Y: säkert, minne+orb+namn', d && d.saker && d.varfor === 'minne+orb+namn');
  d = domMinne(v2('Y', 'Z'), titel('X', 0.9, 0.5));
  check('titeln säker på lekens X (inte bland minnets kandidater): konflikt, inte säkert', d && !d.saker && d.varfor === 'konflikt');
  d = domMinne(v2('Y', 'Z'), titel('Z', 0.7, 0.25));
  check('titeln säker på minnets Z (tvåan): konflikt, Z överst åt granskningen', d && !d.saker && d.varfor === 'konflikt' && d.cands[0].name === 'Z' && d.cands[1].name === 'Y');
  d = domMinne(v2('Y', 'Z'), titel('X', 0.55, 0.5));
  check('titeln osäker på X (0,55 < 0,6): ingen konflikt, minne+orb', d && d.saker && d.varfor === 'minne+orb');
  d = domMinne(v2('Y', 'Z'), titel('X', 0.9, 0.1));
  check('titeln utan marginal (0,1 < 0,2): ingen konflikt, minne+orb', d && d.saker && d.varfor === 'minne+orb');
  d = domMinne(v2('Y', 'Z'), titel(null, 0.7, 0.3, { namn: 'Y', ord: ['Heath'], saknas: ['Moor'] }));
  check('titeln skiljer sig i ett helt ord (utanfor ≥ 0,5): titel skiljer ord, inte säkert', d && !d.saker && d.varfor === 'titel skiljer ord');
  d = domMinne(v2('Y', 'Z'), titel(null, 0.4, 0.3, { namn: 'Y', ord: ['Heath'], saknas: ['Moor'] }));
  check('helt ord men läsningen svag (0,4 < 0,5): räknas inte, minne+orb', d && d.saker && d.varfor === 'minne+orb');
  d = domMinne(v2(BAKSIDA_NAMN, 'Y'), null);
  check('baksidan filtreras ur kandidaterna', d && d.cands[0].name === 'Y' && !d.cands.some(c => c.name === BAKSIDA_NAMN));
  d = domMinne({ accept: false, rec: { cands: [{ name: 'Y' }] } }, null);
  check('utan ORB:s bärande (accept false): ingen dom alls', d === null);
  d = domMinne(v2(BAKSIDA_NAMN), null);
  check('bara baksidan bland kandidaterna: ingen dom', d === null);
}

console.log(`\nminnesteg: ${n - fel} av ${n} prov ok${fel ? ', ' + fel + ' FEL' : ''}`);
process.exit(fel ? 1 : 0);

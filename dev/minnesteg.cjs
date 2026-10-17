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

/* ── fynd 4: identifyMedModell utan rival i poolen ─────────────────────── */
(async () => {
  let traffar = [];
  const ctx = { console, BAKSIDA_NAMN, landTyp, landVisning, Embed: { TROSKEL: 0.11 }, MODELL_NAMN: 3, ORB_ACCEPT: 10, ORB_SKALA: [0.8, 1.6], ORB_HEL: 1.08,
                DEL_MARGINAL: 0.08, KONST_MIN: 2, ORB_EMOT: 6, LAND_MARGINAL: 0.15, refSid: x => x, Pool: { idx: null }, Object, Map, Set,
                LasWorker: { orb: async () => traffar } };
  vm.createContext(ctx);
  const identifyMedModell = vm.runInContext(klipp('async function identifyMedModell(', '}') + '\n;identifyMedModell', ctx);
  const e = (...c) => ({ namn: c[0][0], cands: c.map(([name, score], i) => ({ name, sid: 's' + i, score })), marginal: c[0][1] - (c[1] ? c[1][1] : 0), rot: 0, poang: c[0][1], ms: 1 });
  const box = { x: 0, y: 0, w: 100, h: 140 };
  console.log('identifyMedModell: poolen utan annat namn än baksidan (den tomma aktiva poolen)');
  const tom = { names: [BAKSIDA_NAMN], orb: {} };
  traffar = [];
  let v = await identifyMedModell(null, box, e([BAKSIDA_NAMN, 0.6]), 'matt', tom, false);
  check('bara baksidan i poolen, inga ORB-träffar: modellen inte säker, inte accept (uppvänt kort blir inte baksida)', v && !v.modell.saker && !v.accept && !v.modell.bar);
  traffar = [{ r: 0, i: 0, inliers: 30, konst: 0, skala: 1.2 }];
  v = await identifyMedModell(null, box, e([BAKSIDA_NAMN, 0.6]), 'matt', tom, false);
  check('bara baksidan i poolen, ORB bär baksidan (30 inliers): accept via bar (ett riktigt nedvänt kort)', v && v.accept && v.modell.bar);
  const lek = { names: [BAKSIDA_NAMN, 'Fencing Ace', 'Pacifism'], orb: {} };
  traffar = [];
  v = await identifyMedModell(null, box, e(['Fencing Ace', 0.5], ['Pacifism', 0.2]), 'matt', lek, false);
  check('vanlig pool, marginal 0,30: modellen säker som förut (rival finns)', v && v.modell.saker && v.modell.marginal > 0.29);
  v = await identifyMedModell(null, box, e([BAKSIDA_NAMN, 0.6], ['Pacifism', 0.2]), 'matt', lek, false);
  check('vanlig pool, baksidan överst med marginal 0,40: säker som förut', v && v.modell.saker);
  console.log('identifyMedModell: utanfor (steg 2) — ORB är villkoret');
  const minne = { names: [BAKSIDA_NAMN, 'Y', 'Z'], orb: {} };
  traffar = [];
  v = await identifyMedModell(null, box, e(['Y', 0.6], ['Z', 0.2]), 'matt', minne, true);
  check('minnets pool, modellen säker (0,40) men ORB bär inte: inte accept (modellen aldrig ensam utanför leken)', v && v.modell.saker && !v.accept && v.modell.minne);
  traffar = [{ r: 0, i: 1, inliers: 30, konst: 5, skala: 1.2 }];
  v = await identifyMedModell(null, box, e(['Y', 0.6], ['Z', 0.2]), 'matt', minne, true);
  check('minnets pool, ORB bär Y med 30 inliers och 5 i konstverket: accept (minne+orb)', v && v.accept && v.modell.bar);
  traffar = [{ r: 0, i: 1, inliers: 30, konst: 1, skala: 1.2 }];
  v = await identifyMedModell(null, box, e(['Y', 0.6], ['Z', 0.2]), 'matt', minne, true);
  check('…men bara 1 inlier i konstverket (< KONST_MIN 2): bär inte, inte accept', v && !v.accept && !v.modell.bar);

  console.log(`\nminnesteg: ${n - fel} av ${n} prov ok${fel ? ', ' + fel + ' FEL' : ''}`);
  process.exit(fel ? 1 : 0);
})().catch(e => { console.error('minnesteg:', e && e.stack || e); process.exit(1); });

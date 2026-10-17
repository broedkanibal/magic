#!/usr/bin/env node
/* Steg 2 och 3 i trappan — minnet utanför den aktiva leken (MES-376, granskningen 2026-10-17) och världen
   (MES-377, rättelsen 2026-10-17: domMinne 'varld' med steg 2:s fällda namn som vittne, identifyMedModell
   utanfor 'varld' med landregeln, inlärningen i kamSakert).

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
  /* Rättelse 2, fynd 1: steg 1 hade redan ORB:s bärande på lekens X ('modell+orb') och domen föll senare ('fler än
     leken', 'land mot namn'); titeln väntades inte in (utanTitel) så t är null. Förut: säkert Z ur minnet — ett femte
     exemplar av ett 4-of med ett likt konstverk i minnet blev ett säkert fel namn. Nu: steg 1:s bärande är ett vittne
     emot, 'konflikt'. */
  console.log('domMinne: steg 1:s eget ORB-bärande som vittne emot (rättelse 2, fynd 1)');
  d = domMinne(v2('Z', 'Y'), null, 'X');
  check("steg 1 bar lekens X, ingen titel: konflikt, inte säkert Z", d && !d.saker && d.varfor === 'konflikt');
  d = domMinne(v2('Z', 'Y'), titel('Z', 0.9, 0.5), 'X');
  check('steg 1 bar X och titeln säger Z: två bildvittnen emot varandra, konflikt', d && !d.saker && d.varfor === 'konflikt');
  d = domMinne(v2('Z', 'Y'), null, 'Z');
  check('steg 1 bar samma namn Z (ett lekens land visat ur minnet): minne+orb', d && d.saker && d.varfor === 'minne+orb');
  d = domMinne(v2('Z', 'Y'), null, null);
  check('steg 1 utan bärande (null): som förut, minne+orb', d && d.saker && d.varfor === 'minne+orb');
}

/* ── rättelse 3: titeln ensam gjorde steg 1 säkert på lekens X, 'fler än leken' fällde det ── */
{
  const ctx = { console, BAKSIDA_NAMN };
  vm.createContext(ctx);
  const domMinne = vm.runInContext(klipp('function domMinne(', '}') + '\n;domMinne', ctx);
  /* Före rättelsen fanns ingen steg1Vittne: kamIdentifiera skickade bara ORB:s namn (v.accept ? b0 : null). Saknas
     funktionen provas det gamla uttrycket, så att provet visar felet på en äldre index.html. */
  let steg1Vittne;
  try { steg1Vittne = vm.runInContext(klipp('function steg1Vittne(', '}') + '\n;steg1Vittne', ctx); }
  catch (e) { steg1Vittne = (v, b0) => (v.accept && b0 && b0.name !== BAKSIDA_NAMN ? b0.name : null); }
  const v2 = (...namn) => ({ accept: true, rec: { cands: namn.map((x, i) => ({ name: x, sid: 's' + i, score: 0.5 - i * 0.1 })) } });
  console.log("steg1Vittne + domMinne: titeln säker på lekens X i steg 1, sedan 'fler än leken' (rättelse 3)");
  /* Steg 1: bilden osäker (v.accept false), titeln 0,8 / 0,3 på lekens X → 'namn ensamt', säkert; 'fler än leken'
     fäller. Steg 2: ORB bär minnets Z (likt X). Titeln döms om mot lekens + minnets namn: Z liknar X, marginalen
     sjunker till 0,1 — inte längre säker, så domMinne såg ingen titel emot och gav 'minne+orb' på Z. */
  const titel1 = { namn: 'X', poang: 0.8, marginal: 0.3 };
  const tOm = { namn: 'X', poang: 0.8, marginal: 0.1 };
  let w = steg1Vittne({ accept: false }, { name: 'W' }, true, true, titel1, { name: 'X' });
  let d = domMinne(v2('Z', 'Y'), tOm, w);
  check("titeln ensam säker på X, minnets Z ORB-buret, titeln omdömd utan marginal: konflikt, inte säkert Z", d && !d.saker && d.varfor === 'konflikt');
  w = steg1Vittne({ accept: false }, { name: 'X' }, true, true, titel1, { name: 'X' });
  d = domMinne(v2('Z', 'Y'), null, w);
  check("B+'namn' (bildens etta X, titeln säker på X), ingen omdömd titel: konflikt", d && !d.saker && d.varfor === 'konflikt');
  w = steg1Vittne({ accept: false }, { name: 'X' }, false, true, titel1, { name: 'X' });
  check('steg 1 inte säkert (titeln fällde inget säkert): inget vittne', w === null);
  w = steg1Vittne({ accept: false }, { name: 'X' }, true, false, { namn: 'X', poang: 0.55, marginal: 0.17 }, { name: 'X' });
  check("svagt namn (inte säker titel): inget titelvittne", w === null);
  w = steg1Vittne({ accept: true }, { name: 'X' }, true, false, null, { name: 'X' });
  check('ORB bar X (v.accept): vittnet är bildens X som förut', w === 'X');
  w = steg1Vittne({ accept: true }, { name: BAKSIDA_NAMN }, true, false, null, { name: 'X' });
  check('baksidan överst i bilden: inget ORB-vittne', w === null);
  w = steg1Vittne({ accept: false }, { name: 'X' }, true, true, titel1, { name: 'Z' });
  d = domMinne(v2('Z', 'Y'), null, w);
  check('titelns namn är inte steg 1:s etta (c0 Z): inget vittne, minne+orb', w === null && d && d.saker);
}

/* ── MES-377 rättelsen, fynd 1: steg 2:s fällda namn som vittne emot i världens dom (steg 3) ── */
{
  const ctx = { console, BAKSIDA_NAMN };
  vm.createContext(ctx);
  const domMinne = vm.runInContext(klipp('function domMinne(', '}') + '\n;domMinne', ctx);
  const v3 = (...namn) => ({ accept: true, rec: { cands: namn.map((x, i) => ({ name: x, sid: 's' + i, score: 0.5 - i * 0.1 })) } });
  const titel = (namn, poang, marginal, utanfor) => ({ namn, poang, marginal, utanfor: utanfor || null });
  console.log("domMinne 'varld': steg 2 bar Z ur minnet och föll — världen får inte göra Z säkert (MES-377 rättelsen, fynd 1)");
  /* Scenariot: steg 2 fällde minnets Z på 'titel skiljer ord' (titeln "Moor Heath" skilde sig i ett helt ord från
     lekens och minnets närmaste namn). I steg 3 bär ORB Z en gång till; titeln döms om mot lekens, minnets OCH
     världens namn, det rätta "Moor Heath"-kortet W finns där — utanfor försvinner, läsningen av W är 0,55 med
     marginal 0,15 (inte säker). Utan vittnet: 'varld+orb' på Z, ett säkert fel namn. */
  const tOm = titel('W', 0.55, 0.15);
  let d = domMinne(v3('Z', 'Y'), tOm, null, 'varld', { namn: 'Z', varfor: 'titel skiljer ord' });
  check("steg 2 fällde Z ('titel skiljer ord'), världens ORB bär Z igen, titeln omdömd utan utanfor: INTE säkert, steg 2:s dom står kvar", d && !d.saker && d.varfor === 'titel skiljer ord');
  d = domMinne(v3('Z', 'Y'), null, null, 'varld', { namn: 'Z', varfor: 'konflikt' });
  check("steg 2 fällde Z ('konflikt' mot titeln), världen bär Z, ingen titel i steg 3: inte säkert, 'konflikt'", d && !d.saker && d.varfor === 'konflikt');
  d = domMinne(v3('W', 'Z'), titel('W', 0.9, 0.5), null, 'varld', { namn: 'Z', varfor: 'konflikt' });
  check('steg 2 bar Z, världens ORB bär ett ANNAT namn W (titeln med): två bildvittnen emot varandra, konflikt', d && !d.saker && d.varfor === 'konflikt' && d.cands[0].name === 'W');
  d = domMinne(v3('W', 'Z'), titel('W', 0.9, 0.5), null, 'varld', null);
  check("utan steg 2-vittne (steg 2 bar inget): världens W med titeln säker på W är 'varld+orb+namn' som förut", d && d.saker && d.varfor === 'varld+orb+namn');
  d = domMinne(v3('W', 'Z'), null, null, 'varld');
  check("utan femte argument alls (steg 2:s anrop): 'varld+orb' som förut", d && d.saker && d.varfor === 'varld+orb');
  d = domMinne(v3('Z', 'Y'), null, 'X', 'varld', { namn: 'Z', varfor: 'konflikt' });
  check('steg 1:s vittne X och steg 2:s Z båda med: inte säkert', d && !d.saker);
  /* Världens dom i sig (fynd 9): samma regel som steg 2, med förledet 'varld'. */
  d = domMinne(v3('W', 'Z'), titel('X', 0.9, 0.5), null, 'varld');
  check("världen bär W, titeln säker på lekens X: konflikt (titeln är vittne emot i steg 3 också)", d && !d.saker && d.varfor === 'konflikt');
  d = domMinne(v3('W', 'Z'), titel(null, 0.7, 0.3, { namn: 'W', ord: ['Heath'], saknas: ['Moor'] }), null, 'varld');
  check("världen bär W, titeln skiljer sig i ett helt ord från alla namn: 'titel skiljer ord'", d && !d.saker && d.varfor === 'titel skiljer ord');
  d = domMinne(v3('W', 'Z'), titel('W', 0.55, 0.15), 'X', 'varld');
  check("steg 1 bar lekens X (vittne1), världen bär W: konflikt — två bildvittnen", d && !d.saker && d.varfor === 'konflikt');
}

/* ── MES-377 rättelsen, fynd 9 (och 4): inlärningen i minnet när världen gjort ett namn säkert (kamSakert) ── */
{
  const planerade = [];
  const ctx = { console, Map, Set, clearTimeout: () => {}, setTimeout: (f, ms) => { planerade.push(ms); return 1; },
                Kamera: { spar: [{ id: 7, sid: 'sid-opt' }, { id: 8, sid: null }] }, kamLage: { id: 'g1' }, satKamFin: () => {},
                AktivLek: { sett: () => ({ bytt: false, aktiv: null }) }, kamAktivT: null, kamPoolBygger: false, kamPoolOm: false, kamByggAktiv: async () => {}, byggKamPool: () => {} };
  vm.createContext(ctx);
  const kamSakert = vm.runInContext(klipp('function kamSakert(', '}') + '\n;kamSakert', ctx);
  const nyData = () => ({ poster: new Map([['Pacifism', { sid: 'sid-pa', small: 'pa.jpg' }]]), grupper: new Map(), lekar: [] });
  console.log('kamSakert: ett namn världen gjorde säkert lärs in i minnet (fynd 9), aldrig ett basland på landregeln (fynd 4)');
  ctx.kamMinneData = nyData(); planerade.length = 0;
  kamSakert('Opt', 7, 'varld+orb');
  check("'varld+orb': Opt läggs i minnets poster med spårets tryckning, i partiets grupp, och minnets pool byggs om", ctx.kamMinneData.poster.get('Opt') && ctx.kamMinneData.poster.get('Opt').sid === 'sid-opt' && ctx.kamMinneData.grupper.get('g1').has('Opt') && planerade.length === 1 && planerade[0] === 1500);
  ctx.kamMinneData = nyData(); planerade.length = 0;
  kamSakert('Opt', 8, 'varld+orb+namn');
  check("'varld+orb+namn': lärs in, utan tryckning när spåret saknar sid", ctx.kamMinneData.poster.has('Opt') && ctx.kamMinneData.poster.get('Opt').sid === null && planerade.length === 1);
  ctx.kamMinneData = nyData(); planerade.length = 0;
  kamSakert('Plains', 7, 'varld land');
  check("'varld land' (basland som typ på landregeln): lärs INTE in (fynd 4 — ingen godtycklig tryckning, inget undantag från KONST_MIN i steg 2), inget ombygge", !ctx.kamMinneData.poster.has('Plains') && planerade.length === 0);
  ctx.kamMinneData = nyData(); planerade.length = 0;
  kamSakert('Opt', 7, 'minne+orb');
  check("'minne+orb' (steg 2): inget lärs (namnet finns redan i minnet)", !ctx.kamMinneData.poster.has('Opt') && planerade.length === 0);
  ctx.kamMinneData = nyData(); planerade.length = 0;
  kamSakert('Pacifism', 7, 'varld+orb');
  check('ett namn som redan ligger i minnet: posten rörs inte, inget ombygge', ctx.kamMinneData.poster.get('Pacifism').sid === 'sid-pa' && planerade.length === 0);
  ctx.kamMinneData = null; planerade.length = 0;
  kamSakert('Opt', 7, 'varld+orb');
  check('utan minnesdata (inte inloggad): ingenting händer', planerade.length === 0);
}

/* ── rättelse 2, fynd 4: kandidaterna åt granskningen när steg 2 inte blev säkert ── */
{
  const ctx = { console };
  vm.createContext(ctx);
  let minneKandidater = null;
  try { minneKandidater = vm.runInContext(klipp('function minneKandidater(', '}') + '\n;minneKandidater', ctx); } catch (e) { minneKandidater = () => []; }
  const k = (...namn) => namn.map((x, i) => ({ name: x, sid: 's' + x, score: 0.5 - i * 0.1 }));
  console.log('minneKandidater: lekens par står kvar när steg 2 ger konflikt');
  let c = minneKandidater(k('X', 'W'), k('Z', 'Y'), null);
  check('lekens X och W först, minnets Z och Y efter', c.map(x => x.name).join(',') === 'X,W,Z,Y');
  c = minneKandidater(k('X', 'W'), k('Z', 'Y'), { namn: 'Z', poang: 0.9, marginal: 0.5 });
  check('titeln säker på minnets Z: Z överst, lekens par därefter', c.map(x => x.name).join(',') === 'Z,X,W,Y');
  c = minneKandidater(k('X', 'W'), k('Z', 'Y'), { namn: 'Z', poang: 0.55, marginal: 0.5 });
  check('titeln osäker (0,55): ordningen rörs inte', c.map(x => x.name).join(',') === 'X,W,Z,Y');
  c = minneKandidater(k('X', 'Plains'), k('Plains', 'Y'), null);
  check('ett namn i båda (lekens Plains ur minnet) räknas en gång', c.map(x => x.name).join(',') === 'X,Plains,Y');
  c = minneKandidater(k('X', 'W', 'V', 'U', 'T'), k('Z', 'Y'), null);
  check('högst fem', c.length === 5 && c[4].name === 'T');
}

/* ── fynd 2: kamPoolDelning — steg 1 är lekens namn, grannarna hör till steg 2 ── */
{
  const ctx = { console, BASICS, landTyp, Map, Set };
  vm.createContext(ctx);
  vm.runInContext(klipp('function lekNamnMangd(', '}'), ctx);
  const kamPoolDelning = vm.runInContext(klipp('function kamPoolDelning(', '}') + '\n;kamPoolDelning', ctx);
  const post = (sid, small) => ({ sid, small });
  const M = { poster: new Map([['Fencing Ace', post('sid-fa', 'fa.jpg')], ['Pacifism', post('sid-pa', 'pa.jpg')], ['Shock', post('sid-sh', null)],
                                ['Goblin Guide', post('sid-gg', 'gg.jpg')], ['Lightning Bolt', post(null, null)], ['Opt', post('sid-opt', 'opt.jpg')],
                                ['Snow-Covered Plains', post(null, null)], ['Plains', post('sid-pl', 'pl.jpg')]]) };
  /* Leken A: listan har Fencing Ace och Pacifism; i partier har den setts med Shock (sid utan bild), Lightning Bolt
     (bara namnet) och Snow-Covered Plains (ett basland utan tryckning). Goblin Guide och Opt är grannar/minne. */
  const A = { id: 'A', namn: 'Alfa', ts: 1000, kort: [{ name: 'Fencing Ace', sid: 'sid-fa', small: 'fa.jpg' }, { name: 'Pacifism', sid: 'sid-pa', small: 'pa.jpg' }, { name: 'Plains', sid: 'sid-pl', small: 'pl.jpg' }],
              alla: ['Fencing Ace', 'Pacifism', 'Plains', 'Shock', 'Lightning Bolt', 'Snow-Covered Plains'] };
  console.log('kamPoolDelning: den aktiva lekens pool och minnets');
  let d = kamPoolDelning(M, A);
  const namnI = s => new Set(s.kort.map(k => k.name).concat(s.namn || []).concat(s.land || []));
  check("koden är lekens ('lek:A') med lekens ts", d.code === 'lek:A' && d.ts === 1000);
  check('kortlistans tryckningar ligger i spec.kort', d.spec.kort.some(k => k.id === 'sid-fa') && d.spec.kort.some(k => k.id === 'sid-pa'));
  check('ett lärt namn med sid utan bild slås upp per sid (spec.sid)', (d.spec.sid || []).some(s => s.id === 'sid-sh'));
  check('ett lärt namn utan tryckning söks per namn (spec.namn)', d.spec.namn.includes('Lightning Bolt'));
  check('ett lärt basland ger sin typ i spec.land (byggarens kod tappade det)', d.spec.land.includes('Plains') && d.spec.land.length === 1);
  check('grannen Goblin Guide och minnets Opt finns INTE i steg 1:s spec', !namnI(d.spec).has('Goblin Guide') && !namnI(d.spec).has('Opt') && !(d.spec.sid || []).some(s => s.id === 'sid-gg' || s.id === 'sid-opt'));
  check('…men i minnets poster (steg 2)', d.minne.some(p => p.namn === 'Goblin Guide' && p.sid === 'sid-gg') && d.minne.some(p => p.namn === 'Opt'));
  check('lekens namn finns inte i minnets poster', !d.minne.some(p => ['Fencing Ace', 'Pacifism', 'Shock', 'Lightning Bolt', 'Plains', 'Snow-Covered Plains'].includes(p.namn)));
  check('vill: de egna tryckningarnas namn och de slagna sid:en', d.vill.namn.includes('Fencing Ace') && d.vill.ids.includes('sid-sh') && !d.vill.namn.includes('Goblin Guide'));
  d = kamPoolDelning(M, null);
  check("utan aktiv lek: poolen 'tom' utan namn, och hela minnet i steg 2", d.code === 'tom' && !d.spec.kort.length && !d.spec.namn.length && !d.spec.land.length && d.minne.length === M.poster.size);
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
  /* Rättelse 2, fynd 3: marginalen är 0 utan rival — inte poängen mot ingenting. Förut bar ORB baksidan med 14
     inliers på "marginal" 0,6 (trappan 14 + marginal ≥ 0,06); nu bär bara 25 ensamma. */
  traffar = [{ r: 0, i: 0, inliers: 14, konst: 0, skala: 1.2 }];
  v = await identifyMedModell(null, box, e([BAKSIDA_NAMN, 0.6]), 'matt', tom, false);
  check('bara baksidan i poolen, 14 inliers: marginalen är 0, inte 0,6 — bär inte, inte accept', v && v.modell.marginal === 0 && !v.accept && !v.modell.bar);
  traffar = [{ r: 0, i: 0, inliers: 25, konst: 0, skala: 1.2 }];
  v = await identifyMedModell(null, box, e([BAKSIDA_NAMN, 0.6]), 'matt', tom, false);
  check('bara baksidan i poolen, 25 inliers: bär ensamma, accept', v && v.accept && v.modell.bar);
  const lek = { names: [BAKSIDA_NAMN, 'Fencing Ace', 'Pacifism'], orb: {} };
  traffar = [{ r: 0, i: 1, inliers: 14, konst: 5, skala: 1.2 }];
  v = await identifyMedModell(null, box, e(['Fencing Ace', 0.5], ['Pacifism', 0.2]), 'matt', lek, false);
  check('vanlig lek (baksidan är alltid rival), 14 inliers och marginal 0,30: bär som förut — rättelsen rör inte en lek', v && v.accept && v.modell.bar && v.modell.marginal > 0.29);
  traffar = [{ r: 0, i: 0, inliers: 14, konst: 0, skala: 1.2 }];
  v = await identifyMedModell(null, box, e([BAKSIDA_NAMN, 0.6], ['Pacifism', 0.2]), 'matt', lek, false);
  check('vanlig lek, baksidan överst med marginal 0,40 och 14 inliers: bär som förut', v && v.accept && v.modell.bar && v.modell.marginal > 0.39);
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

  /* MES-377 rättelsen, fynd 9: utanfor 'varld' (steg 3) — ORB är villkoret som i steg 2, men landregeln gäller som
     i leken (ett basland är en typ, LAND_MARGINAL på ett spår mätt mot kortreferensen), aldrig modellen ensam. */
  console.log("identifyMedModell: utanfor 'varld' (steg 3) — ORB villkor, landregeln som i leken");
  const varld = { names: [BAKSIDA_NAMN, 'Y', 'Z', 'Plains', 'Swamp'], orb: {}, tillfallig: true };
  traffar = [];
  v = await identifyMedModell(null, box, e(['Y', 0.6], ['Z', 0.2]), 'matt', varld, 'varld');
  check("vanligt kort, modellen säker (0,40) men ORB bär inte: inte accept (modellen aldrig ensam mot världen), modell.varld", v && v.modell.saker && !v.accept && v.modell.varld && !v.modell.minne);
  traffar = [{ r: 0, i: 1, inliers: 30, konst: 5, skala: 1.2 }];
  v = await identifyMedModell(null, box, e(['Y', 0.6], ['Z', 0.2]), 'matt', varld, 'varld');
  check('vanligt kort, ORB bär Y med 30 inliers och 5 i konstverket: accept (varld+orb), hel ruta', v && v.accept && v.modell.bar && !v.del);
  traffar = [{ r: 0, i: 1, inliers: 30, konst: 1, skala: 1.2 }];
  v = await identifyMedModell(null, box, e(['Y', 0.6], ['Z', 0.2]), 'matt', varld, 'varld');
  check('…men 1 i konstverket (< KONST_MIN): bär inte', v && !v.accept);
  traffar = [{ r: 0, i: 1, inliers: 30, konst: 5, skala: 0.9 }];
  v = await identifyMedModell(null, box, e(['Y', 0.6], ['Z', 0.2]), 'matt', varld, 'varld');
  check('ORB bär Y men bara en DEL av ett kort (skalan under ORB_HEL): del — kamIdentifiera räknar det inte som säkert', v && v.accept && v.del);
  traffar = [];
  v = await identifyMedModell(null, box, e(['Plains', 0.6], ['Swamp', 0.3]), 'matt', varld, 'varld');
  check("basland Plains med marginal 0,30 ≥ LAND_MARGINAL, spåret mätt ('matt'), utan ORB: accept på landregeln ('varld land'), inte bar", v && v.accept && !v.modell.bar && v.modell.land);
  v = await identifyMedModell(null, box, e(['Plains', 0.6], ['Swamp', 0.3]), 'form', varld, 'varld');
  check("samma land men bara formen känd ('form', före bordets första kort): inte accept", v && !v.accept);
  v = await identifyMedModell(null, box, e(['Plains', 0.6], ['Swamp', 0.5]), 'matt', varld, 'varld');
  check('samma land med marginal 0,10 < LAND_MARGINAL 0,15: inte accept', v && !v.accept);
  v = await identifyMedModell(null, box, e(['Plains', 0.6], ['Swamp', 0.3]), 'matt', varld, true);
  check("samma land i steg 2 (utanfor true, minnet): landregeln gäller inte där — inte accept", v && !v.accept);
  traffar = [{ r: 0, i: 4, inliers: 12, konst: 0, skala: 1.2 }];
  v = await identifyMedModell(null, box, e(['Plains', 0.6], ['Swamp', 0.3]), 'matt', varld, 'varld');
  check('land Plains men ORB bär Swamp med 12 ≥ ORB_ACCEPT: emot — inte accept', v && !v.accept && v.modell.emot);
  traffar = [];
  v = await identifyMedModell(null, box, e(['Y', 0.6], ['Z', 0.2]), '', varld, 'varld');
  check('inte ensamt (ett spår som inte ligger för sig självt): inte accept utan ORB', v && !v.accept);

  console.log(`\nminnesteg: ${n - fel} av ${n} prov ok${fel ? ', ' + fel + ' FEL' : ''}`);
  process.exit(fel ? 1 : 0);
})().catch(e => { console.error('minnesteg:', e && e.stack || e); process.exit(1); });

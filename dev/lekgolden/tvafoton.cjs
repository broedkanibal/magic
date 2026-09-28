#!/usr/bin/env node
/* Samma kort i två foton (MES-324), mätt på lekgoldens set ur cachen.
   Kör: node dev/lekgolden/tvafoton.cjs [--beskarning hela|ram|bada] [--set S08] [--detalj]

   Spelar upp varje set som kor.cjs gör (telefonens riktiga telfotoLas på
   Claudes sparade svar, Photo 1, Photo 2 …) och läser vad telefonen märkte:

     LB1  f.igen: fotot visar ett tidigare fotos kort igen ("11 of them were
          also in photo 1", Remove photo n). Seten är byggda så att fotona
          ska vara olika: varje LB1 i ett set är ett FALSKLARM. Som positiv
          kontroll spelas några foton upp två gånger i rad: då ska LB1 slå
          till.
     LB2  kort[i].dubbel: ett kort vid kanten som också fanns i ett tidigare
          foto ("3 may also be in photo 1", "One Swamp or two?"). Facit säger
          vilka grupper som ligger vid kanten i varje foto (kant): en flagga
          på ett kort ur en kantgrupp är ett FÅNGAT kantkort, en flagga på
          ett kort ur en hel grupp är en ONÖDIG fråga om ett riktigt exemplar.

   Inga anrop till Claude eller Chrome: svaren tas ur svar/-mappen med den
   nyckel dagens kod ger (modell, systemprompt, lekblock, beskärningskod).
   Scryfall ur samma cache som kor.cjs (nya namn slås upp, sällan).
   .cjs eftersom package.json säger "type": "module". */
'use strict';
const fs = require('fs'), path = require('path');
const K = require('./kor.cjs');
const { FACIT, SVARMAPP, multi, grupperna, spela, valjSvar, fotoId, kortnamn, tabell } = K;
const flagga = n => process.argv.includes(n);
const DETALJ = flagga('--detalj');
const BASLAND = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);

/* Cachefilen för ett foto och en beskärning med dagens nyckeldelar. Rutan
   och dukens mått (Chrome) ingår inte i valet: finns flera filer tas den
   senast skrivna, och det sägs. */
const varningar = [];
function cacheFor(f, lage) {
  const id = fotoId(f);
  const filer = fs.readdirSync(SVARMAPP).filter(x => x.startsWith(id + '.' + lage + '.') && x.endsWith('.json'))
    .map(x => ({ fil: x, c: JSON.parse(fs.readFileSync(path.join(SVARMAPP, x), 'utf8')), t: fs.statSync(path.join(SVARMAPP, x)).mtimeMs }))
    .filter(x => x.c.nyckel && x.c.nyckel.promptv === K.PROMPTV && x.c.nyckel.lekblock === K.LEKBLOCK && x.c.nyckel.modell === K.MODELL && x.c.nyckel.besk === K.BESK_KOD_SHA)
    .sort((a, b) => b.t - a.t);
  if (filer.length > 1) varningar.push(`${id} ${lage}: ${filer.length} cachefiler med dagens nyckel, tog ${filer[0].fil}`);
  return filer.length ? filer[0].c : null;
}
const avl = new Map();
for (const f of Object.keys(FACIT.foton)) for (const lage of K.LAGEN) avl.set(f + '|' + lage, { b64: '', box: { x: 0, y: 0, w: 1, h: 1 } });
const svarFor = (f, lage) => valjSvar(cacheFor(f, lage), false);

/* Etikett per läst kort i ett foto, mot facit: hela (fotots hela grupper,
   räknas först), kant (bara delvis synlig vid kanten), annat (ett namn som
   inte hör hemma i fotot), tom (platshållare). */
function etiketter(fotoNamn, kort) {
  const hela = multi(grupperna(FACIT.foton[fotoNamn].hela)), kant = multi(grupperna(FACIT.foton[fotoNamn].kant));
  return (kort || []).map(k => {
    if (!k || k.okand || !k.name) return 'tom';
    if ((hela.get(k.name) || 0) > 0) { hela.set(k.name, hela.get(k.name) - 1); return 'hela'; }
    if ((kant.get(k.name) || 0) > 0) { kant.set(k.name, kant.get(k.name) - 1); return 'kant'; }
    return 'annat';
  });
}
/* Kantkort som lästes med ett namn: det LB2 alls kan fånga. */
const kantLasta = et => et.filter(e => e === 'kant').length;
/* Riktiga andrafoton av samma bord (facit: samma hela grupper, annat ljus
   eller vinkel): 16/17 samma 30 kort, 18/19 samma 26 utan basland, 14/15
   samma 10 (telefonen vriden 90° emellan), 09/13 hela bordet (vriden 180°).
   05/06 och 07/08 är olika bord med kantkort gemensamt: de ska inte fälla. */
const PAR = [['16', '17', true], ['17', '16', true], ['18', '19', true], ['19', '18', true], ['14', '15', true], ['15', '14', true], ['09', '13', true], ['13', '09', true],
  ['05', '06', false], ['06', '07', false], ['07', '08', false]];
const av = n => Object.keys(FACIT.foton).find(f => kortnamn(f) === n);

(async () => {
  const facitFel = K.provaFacit();
  if (facitFel.length) { console.error('Facit stämmer inte:\n  ' + facitFel.join('\n  ')); process.exit(2); }
  const seten = Object.entries(FACIT.set).filter(([s]) => !K.SET_VAL || K.SET_VAL.some(p => s.startsWith(p)));
  const rader = [], detalj = [];
  const tot = {};
  for (const lage of K.LAGEN) {
    const t = tot[lage] = { set: 0, foton: 0, lb1: 0, flaggor: 0, kant: 0, onodiga: 0, kantLasta: 0, saknas: 0, kontroll: 0, kontrollAv: 0 };
    for (const [s, v] of seten) {
      if (v.foton.some(f => !svarFor(f, lage))) { t.saknas++; rader.push([lage, s, v.foton.map(kortnamn).join('+'), '–', '–', '–', '–', 'svar saknas i cachen']); continue; }
      const r = await spela(v.foton, lage, avl, svarFor);
      const foton = r.foton.filter(f => f.lage === 'klar');
      const et = new Map(), namnAv = new Map();
      r.foton.forEach((f, i) => { if (f.lage === 'klar') { et.set(f.fid, etiketter(v.foton[i], f.kort)); namnAv.set(f.fid, v.foton[i]); } });
      t.set++; t.foton += foton.length;
      let lb1 = 0, flaggor = 0, kant = 0, onodiga = 0, lasta = 0;
      const anm = [];
      for (const f of foton) {
        lasta += kantLasta(et.get(f.fid));
        if (f.igen) { lb1++; anm.push(`LB1 på ${kortnamn(namnAv.get(f.fid))}: ${f.igen.n} namn som i foto ${f.igen.nr}`); }
        (f.kort || []).forEach((k, i) => {
          if (!k.dubbel) return;
          /* Bara det nya fotots kort räknas: det gamla fotots kort får dubbel också, men det är samma par. */
          const g = r.foton.find(x => x.fid === k.dubbel);
          if (!g || r.foton.indexOf(g) > r.foton.indexOf(f)) return;
          flaggor++;
          const e = et.get(f.fid)[i], j = (g.kort || []).findIndex(x => x && x.dubbel === f.fid && x.name === k.name), eg = j >= 0 ? et.get(g.fid)[j] : '?';
          const fanges = e === 'kant' || eg === 'kant';
          if (fanges) kant++; else onodiga++;
          anm.push(`${fanges ? 'fångat' : 'onödig'} ${k.name}@${k.x},${k.y} i ${kortnamn(namnAv.get(f.fid))} [${e}] mot ${kortnamn(namnAv.get(g.fid))} [${eg}]`);
        });
      }
      t.lb1 += lb1; t.flaggor += flaggor; t.kant += kant; t.onodiga += onodiga; t.kantLasta += lasta;
      rader.push([lage, s, v.foton.map(kortnamn).join('+'), lb1, flaggor, `${kant} av ${lasta}`, onodiga, anm.length ? anm.join('; ') : '']);
      if (DETALJ && anm.length) detalj.push(`${lage} ${s}: ${anm.join('\n    ')}`);
    }
    /* Snäll kontroll för LB1: samma svar två gånger i rad (samma namn, samma
       platser). Ett foto med färre än tre säkra icke-basland ska inte fälla
       den (för lite att gå på). */
    for (const f of Object.keys(FACIT.foton).sort()) {
      if (!svarFor(f, lage)) continue;
      const r = await spela([f, f], lage, avl, svarFor);
      const foton = r.foton.filter(x => x.lage === 'klar');
      if (foton.length < 2) continue;
      const ick = (foton[1].kort || []).filter(k => k && k.name && !k.okand && !k.koll && !BASLAND.has(k.name)).length;
      if (ick < 3) continue;
      t.kontrollAv++;
      if (foton[1].igen) t.kontroll++;
      else rader.push([lage, `${kortnamn(f)} två gånger`, `${kortnamn(f)}+${kortnamn(f)}`, 0, '', '', '', `INGEN LB1 trots samma svar (${ick} säkra icke-basland)`]);
    }
    /* Ärlig kontroll för LB1: riktiga andrafoton av samma bord ur cachen
       (annat ljus eller vinkel), och två par som INTE är samma bord.
       Kravet gäller det andra fotot: minst tre säkra icke-basland. */
    t.par = [];
    for (const [a, b, samma] of PAR) {
      const fa = av(a), fb = av(b);
      if (!fa || !fb || !svarFor(fa, lage) || !svarFor(fb, lage)) continue;
      const r = await spela([fa, fb], lage, avl, svarFor);
      const foton = r.foton.filter(x => x.lage === 'klar');
      if (foton.length < 2) continue;
      const ick = (foton[1].kort || []).filter(k => k && k.name && !k.okand && !k.koll && !BASLAND.has(k.name)).length;
      const lb1 = !!foton[1].igen;
      t.par.push({ a, b, samma, ick, lb1, raknas: ick >= 3 });
    }
  }

  console.log('Samma kort i två foton (MES-324) på lekgoldens set, ur cachen:\n');
  tabell(['Beskärning', 'Set', 'Foton', 'LB1', 'LB2-flaggor', 'fångade kantkort (av lästa)', 'onödiga', 'Anm.'], rader);
  console.log('\n══ LB1 på riktiga andrafoton av samma bord (och två par som inte är det) ══');
  const parRader = [];
  for (const lage of K.LAGEN) for (const p of tot[lage].par || []) {
    parRader.push([lage, `${p.a} sedan ${p.b}`, p.samma ? 'samma bord' : 'olika bord', p.ick, p.raknas ? (p.lb1 ? 'LB1' : 'nej') : `nej (${p.ick} < 3, räknas inte)`,
      p.samma ? (p.raknas ? (p.lb1 ? 'träff' : 'miss') : '') : (p.lb1 ? 'FALSKLARM' : 'rätt')]);
  }
  tabell(['Beskärning', 'Par', 'Facit', 'säkra icke-basland i foto B', 'LB1', 'Dom'], parRader);
  console.log('\n══ Summering ══');
  const sum = [];
  for (const lage of K.LAGEN) {
    const t = tot[lage], par = (t.par || []).filter(p => p.raknas);
    const traff = par.filter(p => p.samma && p.lb1).length, sammaN = par.filter(p => p.samma).length, falsk = par.filter(p => !p.samma && p.lb1).length, olikaN = par.filter(p => !p.samma).length;
    sum.push([lage, `${t.set} set, ${t.foton} foton`, `${t.lb1} falsklarm`, `${t.kontroll}/${t.kontrollAv}`, `${traff}/${sammaN} träffar, ${falsk}/${olikaN} falsklarm`, t.flaggor, `${t.kant} av ${t.kantLasta}`, t.onodiga]);
  }
  tabell(['', 'Set', 'LB1 i seten', 'LB1 samma svar två gånger (snäll)', 'LB1 riktiga andrafoton', 'LB2-flaggor', 'fångade kantkort (av kantkort lästa med namn)', 'onödiga frågor'], sum);
  console.log('\n  LB1 i seten: fotona i ett set är olika, så varje LB1 där är ett falsklarm. Samma svar två gånger: snäll kontroll, samma namn på samma platser.');
  console.log('  Riktiga andrafoton: samma bord fotat igen i annat ljus eller vinkel (facit ovan); räknas för par där foto B har minst tre säkra icke-basland');
  console.log('  (regelns golv). Ett vridet bord (14/15, 09/13) fäller inte regeln: den räknar platsen efter en förskjutning, inte en vridning.');
  console.log('  LB2-flaggor: kort i det nya fotot med dubbel. Fångade kantkort: flaggor där kortet (eller det matchade) hör till en grupp facit säger bara');
  console.log('  syns vid kanten; "av" = kantkort som alls lästes med ett namn. Onödiga: flaggor på kort ur hela grupper, riktiga exemplar som får frågan');
  console.log('  "One Swamp or two?". Kort utan namn (platshållare) syns inte här: LB2 är därför i praktiken omätt på riktiga foton.');
  console.log(`\n  metod: svaren ur ${path.relative(K.ROT, SVARMAPP)} (${K.MODELL}, systemprompt v${K.PROMPTV}, lekblocket ${K.LEKBLOCK}, beskärningskod ${K.BESK_KOD_SHA}), telfotoLas ur index.html.`);
  if (varningar.length) console.log('  OBS: ' + varningar.join('; '));
  if (DETALJ && detalj.length) console.log('\n' + detalj.map(d => '  ' + d).join('\n'));
  const saknas = Object.values(tot).reduce((a, t) => a + t.saknas, 0);
  process.exit(saknas ? 2 : 0);
})().catch(e => { console.error('\ntvafoton: ' + (e && e.stack || e)); process.exit(2); });

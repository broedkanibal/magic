#!/usr/bin/env node
/* Platshållare vid fotots kant (MES-324, Jespers val C), mätt på lekgoldens
   foton ur cachen. Kör: node dev/lekgolden/kantkort.cjs [--beskarning hela|ram|bada] [--detalj]

   Frågan: vilka platshållare (Unreadable card) ska få "This card was cut off
   at the edge." (LR3) i stället för "Which card is this?" (LR2), och hur
   många HELA kort skulle få frågan i onödan? Ett helt kort som hoppas över
   (Yes, skip it) försvinner ur leken, så det är det måttet som räknas.

   Varje foto spelas upp ensamt med telefonens riktiga telfotoLas på Claudes
   sparade svar (som kor.cjs). En platshållare saknar namn, så facit kan inte
   säga vilket kort den är. Den får i stället en dom:

     KANT   ett kort som bara syns kapat vid fotots (eller ramens) kant
     HEL    ett helt kort som Claude inte läste
     EXTRA  en post utan motsvarighet i facit: fotots hela kort har redan
            namn, och posten är ingen kantgrupp (en läsning för mycket)

   Domen kommer ur kolumnen (posterna grupperas efter x; en ny kolumn när
   glappet är större än KOLUMNGLAPP): en kolumn med ett namn ur en hel grupp
   är hel, annars kapad. Kolumnregeln slår fel där korten ligger tätt, så
   platshållarna som betyder något för gränsen är granskade för ögat i
   fotona och i dukarna (kor.cjs --beskarningar) och står i FOR_OGAT.
   Facit kontrollerar räkningen: HEL får inte vara fler än fotots hela kort
   utan namn; där det inte stämmer sägs det.

   Sedan räknas varje tänkbar gräns g på sidkanterna (x ≤ g eller
   x ≥ 1000 − g) och på alla fyra: KANT som fångas, HEL som får frågan i
   onödan, och hela kort MED namn i samma zon (blir ett sådant oläsligt får
   det frågan). Sist: seten med mer än ett foto spelas upp, och Check names
   fall räknas med appens egen lsfFall (LEKFOTO SLUTET), alltså den gräns
   som ligger i index.html nu.

   Inga anrop till Claude eller Chrome. .cjs eftersom package.json säger
   "type": "module". */
'use strict';
const fs = require('fs'), path = require('path');
const K = require('./kor.cjs');
const { FACIT, SVARMAPP, multi, grupperna, spela, valjSvar, fotoId, kortnamn, tabell } = K;
const DETALJ = process.argv.includes('--detalj');
const KOLUMNGLAPP = 90;
/* Granskat för ögat 2026-09-28 (MES-324): nyckel beskärning|foto|x,y. */
const FOR_OGAT = {
  'hela|11|1000,700': ['KANT', 'hooded-kolumnen kapad vid högerkanten (fotot upp och ned); kolumnregeln tog den för pharika-kolumnen'],
  'hela|11|930,905': ['HEL', 'Ukud Cobra, fotots enda hela kort utan namn (blänk)'],
  'hela|12|862,420': ['EXTRA', 'alla tio hela kort har namn; ett kort som skymts bakom Fencing Ace'],
  'hela|12|930,930': ['EXTRA', 'alla tio hela kort har namn'],
  'hela|12|455,835': ['EXTRA', 'alla tio hela kort har namn; mitt i fotot'],
  'ram|13|14,80': ['KANT', 'kortet längst till vänster, kapat av ramen'],
  'ram|13|12,290': ['KANT', 'kortet nere till vänster, kapat av ramen'],
  'ram|14|18,250': ['KANT', 'Venomous Hierophant, bara bilden syns: kapat av ramens vänsterkant'],
  'ram|15|1000,8': ['KANT', 'kortet bakom Swamp, kapat av ramens överkant (modellen gav x = 1000)'],
};

function cacheFor(f, lage) {
  const id = fotoId(f);
  const filer = fs.readdirSync(SVARMAPP).filter(x => x.startsWith(id + '.' + lage + '.') && x.endsWith('.json'))
    .map(x => ({ c: JSON.parse(fs.readFileSync(path.join(SVARMAPP, x), 'utf8')), t: fs.statSync(path.join(SVARMAPP, x)).mtimeMs }))
    .filter(x => x.c.nyckel && x.c.nyckel.promptv === K.PROMPTV && x.c.nyckel.lekblock === K.LEKBLOCK && x.c.nyckel.modell === K.MODELL && x.c.nyckel.besk === K.BESK_KOD_SHA)
    .sort((a, b) => b.t - a.t);
  return filer.length ? filer[0].c : null;
}
const avl = new Map();
for (const f of Object.keys(FACIT.foton)) for (const lage of K.LAGEN) avl.set(f + '|' + lage, { b64: '', box: { x: 0, y: 0, w: 1, h: 1 } });
const svarFor = (f, lage) => valjSvar(cacheFor(f, lage), false);

/* Datorns Check names (lsfFall) ur index.html, som dev/lekfoto-slut.cjs klipper den. */
const SRC = fs.readFileSync(path.join(K.ROT, 'index.html'), 'utf8');
const skar = (fran, till) => { const a = SRC.indexOf(fran), b = SRC.indexOf(till, a); if (a < 0 || b < 0) throw new Error('hittar inte ' + fran); return SRC.slice(a, b); };
const SLUT = new Function([
  skar('/* ══ BLOCK: LEKSLAG', '/* ══ SLUT: LEKSLAG ══ */'),
  skar('/* ══ BLOCK: LEKFOTO PÅ DATORN', '/* ══ SLUT: LEKFOTO PÅ DATORN ══ */'),
  skar('/* ══ BLOCK: LEKFOTO SLUTET', '/* ══ SLUT: LEKFOTO SLUTET ══ */'),
].join('\n') + '\nreturn { lsfFall, lsfKo };')();
const GRANS_NU = +((/const TELFOTO_KANT_TOM = (\d+);/.exec(SRC) || [])[1]);

function etiketter(fotoNamn, kort) {
  const hela = multi(grupperna(FACIT.foton[fotoNamn].hela)), kant = multi(grupperna(FACIT.foton[fotoNamn].kant));
  return (kort || []).map(k => {
    if (!k || k.okand || !k.name) return 'tom';
    if ((hela.get(k.name) || 0) > 0) { hela.set(k.name, hela.get(k.name) - 1); return 'hela'; }
    if ((kant.get(k.name) || 0) > 0) { kant.set(k.name, kant.get(k.name) - 1); return 'kant'; }
    return 'annat';
  });
}
function kolumner(kort) {
  const ord = kort.map((k, i) => ({ i, x: +k.x || 0 })).sort((a, b) => a.x - b.x);
  const kol = new Array(kort.length);
  let nr = 0, forra = null;
  for (const p of ord) { if (forra != null && p.x - forra > KOLUMNGLAPP) nr++; kol[p.i] = nr; forra = p.x; }
  return kol;
}
/* Domen per post i ett foto: {dom, ogat} för platshållarna, null för namnen. */
function domar(lage, f, kort) {
  const et = etiketter(f, kort), kol = kolumner(kort);
  const helKol = new Set(kort.map((k, i) => et[i] === 'hela' ? kol[i] : null).filter(x => x != null));
  const d = kort.map((k, i) => {
    if (et[i] !== 'tom') return null;
    const o = FOR_OGAT[`${lage}|${kortnamn(f)}|${k.x},${k.y}`];
    return o ? { dom: o[0], ogat: true } : { dom: helKol.has(kol[i]) ? 'HEL' : 'KANT', ogat: false };
  });
  return { et, d };
}
const GRANSER = [0, 10, 20, 30, 40, 50, 60, 80, 100];
const vidX = (k, g) => +k.x <= g || +k.x >= 1000 - g;
const vidY = (k, g) => +k.y <= g || +k.y >= 1000 - g;

(async () => {
  const rader = [], perGrans = {}, kontroll = [], detalj = [], tot = {};
  for (const lage of K.LAGEN) {
    tot[lage] = { KANT: 0, HEL: 0, EXTRA: 0 };
    for (const g of GRANSER) perGrans[lage + '|' + g] = { xKANT: 0, xHEL: 0, xEXTRA: 0, xyKANT: 0, xyHEL: 0, namnX: 0 };
    for (const f of Object.keys(FACIT.foton).sort()) {
      if (!svarFor(f, lage)) { rader.push([lage, kortnamn(f), 'svar saknas i cachen']); continue; }
      const r = await spela([f], lage, avl, svarFor);
      const foto = r.foton.find(x => x.lage === 'klar');
      if (!foto) { rader.push([lage, kortnamn(f), `fotot blev inte klart (${(r.foton[0] || {}).lage})`]); continue; }
      const kort = foto.kort || [], { et, d } = domar(lage, f, kort);
      const helaUtanNamn = grupperna(FACIT.foton[f].hela).length - et.filter(e => e === 'hela').length;
      const n = dom => d.filter(x => x && x.dom === dom).length;
      if (n('HEL') > helaUtanNamn) kontroll.push(`${lage} ${kortnamn(f)}: ${n('HEL')} dömda HEL, men ${helaUtanNamn} hela kort utan namn`);
      /* Och tvärtom: KANT får inte vara fler än fotots kapade kort utan namn
         (facits kant-grupper). Bara filväljarens väg: i kamerans ram kapar
         ramen också kort ur hela grupper, och facit vet inte vilka.
         taket: det tal nämnaren "av N kapade" högst kan vara. */
      const kantUtanNamn = grupperna(FACIT.foton[f].kant).length - et.filter(e => e === 'kant').length;
      if (lage === 'hela' && n('KANT') > kantUtanNamn) {
        kontroll.push(`${lage} ${kortnamn(f)}: ${n('KANT')} dömda KANT, men ${kantUtanNamn} kapade kort utan namn`);
        tot[lage].over = (tot[lage].over || 0) + n('KANT') - kantUtanNamn;
      }
      for (const dom of ['KANT', 'HEL', 'EXTRA']) tot[lage][dom] += n(dom);
      const tomma = kort.map((k, i) => ({ k, d: d[i] })).filter(x => x.d);
      rader.push([lage, kortnamn(f), kort.length, et.filter(e => e === 'hela').length, et.filter(e => e === 'kant').length,
        n('KANT'), n('HEL'), n('EXTRA'), tomma.map(x => `${x.d.dom[0]}${x.d.ogat ? '*' : ''}@${x.k.x},${x.k.y}`).join(' ')]);
      for (const g of GRANSER) {
        const p = perGrans[lage + '|' + g];
        for (const x of tomma) {
          if (vidX(x.k, g)) p['x' + x.d.dom]++;
          if ((vidX(x.k, g) || vidY(x.k, g)) && x.d.dom !== 'EXTRA') p['xy' + x.d.dom]++;
        }
        p.namnX += kort.filter((k, i) => et[i] === 'hela' && vidX(k, g)).length;
      }
      if (DETALJ) detalj.push(`${lage} ${kortnamn(f)}: ` + kort.map((k, i) => `${d[i] ? '(' + d[i].dom + ')' : k.name + '[' + et[i] + ']'}@${k.x},${k.y}`).join(' | '));
    }
  }
  console.log('Platshållare vid fotots kant (MES-324, val C), lekgoldens foton ur cachen, ett foto åt gången:\n');
  tabell(['Beskärning', 'Foto', 'Poster', 'namn hela', 'namn kant', 'tomma KANT', 'tomma HEL', 'tomma EXTRA', 'platshållarna (K/H/E, * = granskad för ögat) @x,y'], rader);
  console.log('\n══ Gränsen: platshållare som skulle få frågan ══');
  const sum = [];
  for (const lage of K.LAGEN) for (const g of GRANSER) {
    const p = perGrans[lage + '|' + g], t = tot[lage];
    sum.push([lage, g + (g === GRANS_NU ? ' (index.html)' : ''), `${p.xKANT} av ${t.KANT}`, p.xHEL, p.xEXTRA, p.namnX, `${p.xyKANT} av ${t.KANT}`, p.xyHEL]);
  }
  tabell(['Beskärning', 'Gräns', 'sidkant: kapade fångade', 'sidkant: HELA i onödan', 'sidkant: extra', 'hela MED namn i zonen', 'fyra kanter: kapade', 'fyra kanter: HELA i onödan'], sum);

  /* Seten, med appens egen dom (koll.kant ur telfotoLas, lsfFall ur LEKFOTO SLUTET). */
  const setRader = [];
  for (const lage of K.LAGEN) for (const [s, v] of Object.entries(FACIT.set)) {
    if (v.foton.length < 2 || v.foton.some(f => !svarFor(f, lage))) continue;
    const r = await spela(v.foton, lage, avl, svarFor);
    const fall = new Map(), lr3 = [];
    for (const k of SLUT.lsfKo(r.kort)) {
      const fl = SLUT.lsfFall(k, null, null, r.kort);
      fall.set(fl, (fall.get(fl) || 0) + 1);
      if (fl !== 'LR3') continue;
      /* Vilken post i vilket foto: platshållarens namn står i fotots läsning. */
      let dom = '?';
      r.foton.forEach((f, i) => {
        const j = (f.kort || []).findIndex(p => p && p.name === k.name);
        if (j >= 0) { const dd = domar(lage, v.foton[i], f.kort).d[j]; dom = `${dd.dom}${dd.ogat ? '*' : ''} ${kortnamn(v.foton[i])}@${f.kort[j].x},${f.kort[j].y}`; }
      });
      lr3.push(dom);
    }
    setRader.push([lage, s, v.foton.map(kortnamn).join('+'), fall.get('LR3') || 0, fall.get('LR2') || 0,
      lr3.filter(x => x.startsWith('KANT')).length, lr3.filter(x => x.startsWith('HEL')).length, lr3.join('; ')]);
  }
  console.log(`\n══ Seten med mer än ett foto: Check names med gränsen i index.html (${GRANS_NU}) ══`);
  tabell(['Beskärning', 'Set', 'Foton', 'LR3 (kapad?)', 'LR2 (Which card?)', 'LR3 på KANT', 'LR3 på HEL', 'LR3-platshållarna'], setRader);
  console.log(`\n  KANT/HEL/EXTRA: se överst i filen. * = granskad för ögat (FOR_OGAT), annars kolumnregeln (glapp > ${KOLUMNGLAPP} tusendelar i x).`);
  console.log('  Kamerans ram: domen är granskad för ögat bara för platshållare inom 30 från sidkanten; längre in gäller kolumnregeln, som i ramen');
  console.log('  inte vet om ramen kapat ett kort ur en hel grupp.');
  console.log('  Kontroll mot facit: ' + (kontroll.length ? kontroll.join('; ') + ' (helbordsfotona 09 och 13 ligger i rader, inte kolumner; ingen av deras platshållare ligger vid sidkanten)' : 'stämmer.'));
  for (const lage of K.LAGEN) if (tot[lage].over) console.log(`  ${lage}: ${tot[lage].over} KANT mer än facits kapade kort; nämnaren "av ${tot[lage].KANT}" är högst ${tot[lage].KANT - tot[lage].over} (en post är en läsning för mycket i en kapad kolumn).`);
  console.log(`  metod: svaren ur ${path.relative(K.ROT, SVARMAPP)} (${K.MODELL}, systemprompt v${K.PROMPTV}, lekblocket ${K.LEKBLOCK}), telfotoLas och lsfFall ur index.html.`);
  if (DETALJ) console.log('\n' + detalj.map(d => '  ' + d).join('\n'));
})().catch(e => { console.error('\nkantkort: ' + (e && e.stack || e)); process.exit(2); });

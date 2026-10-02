'use strict';
/* MES-328 steg 2 — dagens namnläsare på remsor, utanför appen.

   Samma läsare som Namn i index.html: tesseract.js v5, språket eng, PSM 7 (en textrad), och
   samma matchning mot lekens namn — Dice-likhet på bokstavspar efter tvättning, bästa namnet
   med marginal till näst bästa, godkänt vid poäng ≥ 0,6. Remsorna är redan skalade som appen
   gör (ocr_export.py: 64 px höga, högst 4× upp). En arbetare i taget, så att tiden per remsa
   är den appen får.

   Två saker skiljer bänkens dom från appens, med avsikt (granskningen 2026-10-02):
   1. Appen kallar ett namn säkert först vid poäng ≥ 0,6 OCH marginal ≥ 0,2 till näst bästa
      (index.html, sakertNamn). Bänken godkänner vid 0,6 ensamt och sparar marginalen per rad,
      så att appens dom kan räknas ut efteråt (hogbank_remsor.py gör det: raden "appens dom").
   2. Appen läser inte alls när bandet i källan är under 20 px (MIN_KALLHOJD) utan svarar
      "liten". Bänken läser allt och sparar kall_h_px per rad; vid 960 px analysbild är banden
      under 20 px för 61 av 74 golden-remsor och 735 av 735 MES-246-remsor — där hade appen
      hoppat över i stället för att läsa 0.

     node dev/remsa/ocr.cjs <mapp med manifest.json> [--ut <fil.json>] [--bara <delsträng i fil>]

   Skriver per remsa: text, namn, poäng, marginal, ms. Rapporten: ocr_rapport.py. */
const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');

const arg = (n, f) => { const i = process.argv.indexOf('--' + n); return i < 0 ? f : process.argv[i + 1]; };
const MAPP = process.argv[2];
if (!MAPP) { console.error('ange mappen med manifest.json'); process.exit(1); }
const UT = arg('ut', path.join(MAPP, 'ocr.json'));
const BARA = arg('bara', null);
const GODKANT = 0.6;

/* Rakt ur index.html (Namn): tvatta, par, likhet, basta. */
const tvatta = t => String(t || '').toLowerCase().replace(/[’ʼ`]/g, "'").replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim();
const par = t => { const m = new Set(); for (let i = 0; i < t.length - 1; i++) if (t[i] !== ' ' || t[i + 1] !== ' ') m.add(t.slice(i, i + 2)); return m; };
function likhet(a, b) {
  const A = par(tvatta(a)), B = par(tvatta(b));
  if (!A.size || !B.size) return 0;
  let k = 0; for (const x of A) if (B.has(x)) k++;
  return 2 * k / (A.size + B.size);
}
function basta(rad, namn) {
  let b1 = { namn: null, poang: 0 }, b2 = { namn: null, poang: 0 };
  for (const n of namn) {
    const p = likhet(rad, n);
    if (p > b1.poang) { b2 = b1; b1 = { namn: n, poang: p }; }
    else if (p > b2.poang && n !== b1.namn) b2 = { namn: n, poang: p };
  }
  return { namn: b1.namn, poang: +b1.poang.toFixed(2), marginal: +(b1.poang - b2.poang).toFixed(2), nast: b2.namn };
}

(async () => {
  const man = JSON.parse(fs.readFileSync(path.join(MAPP, 'manifest.json'), 'utf8'));
  const lek = man.lek;
  let remsor = man.remsor; if (BARA) remsor = remsor.filter(r => r.fil.includes(BARA));
  const w = await createWorker('eng', 1, { cachePath: path.join(__dirname, 'node_modules', '.tessdata') });
  await w.setParameters({ tessedit_pageseg_mode: '7' });
  /* Ett kort kan ha flera lägen av samma utsnitt (steg 0, 1, 2 — namnraden 5, 2 och 8 % ner):
     de prövas i ordning tills något når 0,6, som appens sex lägen. Tiden är summan. */
  const grupper = new Map();
  for (const r of remsor) {
    const k = [r.kalla, r.bild, r.nr, r.res, r.utsnitt].join('|');
    if (!grupper.has(k)) grupper.set(k, []);
    grupper.get(k).push(r);
  }
  const ut = []; let n = 0;
  const t00 = Date.now();
  for (const steg of grupper.values()) {
    steg.sort((a, b) => (a.steg || 0) - (b.steg || 0));
    let bast = null, ms = 0, forsok = 0;
    for (const r of steg) {
      const fil = path.join(MAPP, r.fil);
      const t0 = performance.now();
      let text = '';
      try { text = (await w.recognize(fil)).data.text || ''; } catch (e) { text = ''; }
      ms += performance.now() - t0; forsok++;
      /* Som appen: varje rad för sig, bästa raden vinner. */
      for (const rad of text.split('\n').map(x => x.trim()).filter(Boolean)) {
        const b = basta(rad, lek);
        if (!bast || b.poang > bast.poang) bast = Object.assign(b, { text: rad, steg: r.steg || 0, start: r.start });
      }
      if (bast && bast.poang >= GODKANT) break;
    }
    const r = steg[0];
    if (!bast) bast = { namn: null, poang: 0, marginal: 0, nast: null, text: '', steg: null, start: null };
    const godkand = bast.poang >= GODKANT;
    ut.push(Object.assign({}, r, { fil: steg[Math.min(bast.steg || 0, steg.length - 1)].fil, text: bast.text, namn: godkand ? bast.namn : null, namn_rå: bast.namn, poang: bast.poang,
                                   marginal: bast.marginal, nast: bast.nast, ms: Math.round(ms), forsok, steg_vald: bast.steg, start_vald: bast.start,
                                   ratt: godkand && bast.namn === r.facit, fel: godkand && bast.namn !== r.facit }));
    if (++n % 100 === 0) process.stdout.write(`  ${n}/${grupper.size} (${((Date.now() - t00) / 1000).toFixed(0)} s)\r`);
  }
  await w.terminate();
  fs.writeFileSync(UT, JSON.stringify({ godkant: GODKANT, lasare: 'tesseract.js ' + require('tesseract.js/package.json').version + ' eng PSM 7', remsor: ut }, null, 0));
  const ratt = ut.filter(x => x.ratt).length, fel = ut.filter(x => x.fel).length, tomma = ut.filter(x => !x.text).length;
  const ms = ut.map(x => x.ms).sort((a, b) => a - b);
  console.log(`\n${ut.length} remsor: rätt ${ratt}, fel (godkänt namn ≠ facit) ${fel}, ingen text ${tomma}, median ${ms[Math.floor(ms.length / 2)]} ms → ${path.relative(process.cwd(), UT)}`);
})().catch(e => { console.error(e); process.exit(1); });

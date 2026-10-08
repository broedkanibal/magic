/* Händelsefacit (dev/golden/inspelningar/<pass>/handelser.tsv) som data,
   delat av kor.cjs och jamfor.cjs. Formatet och ordlistan står i LÄS-MIG.md
   i samma mapp som facit. .cjs eftersom package.json säger "type": "module". */
'use strict';
const fs = require('fs'), path = require('path');
const ROT = path.join(__dirname, '..', '..');

/* Passet: mappen med facit under dev/golden/inspelningar/ och samma namn
   under dev/material/inspelningar/ (videon, utanför git). */
const PASS_FORVAL = '2026-09-22-1x-34cm-normaltempo';
const facitMapp = pass => path.join(ROT, 'dev', 'golden', 'inspelningar', pass);
const materialMapp = pass => path.join(ROT, 'dev', 'material', 'inspelningar', pass);

/* En rad per handling: { nr (radnummer i filen, 2 = första raden efter
   rubriken), t, handelse, kort, till, plats, tal }. '-' och tomt blir null.
   fil: ett facit som inte ligger i passets mapp (kor.cjs --facit; partiet
   2026-09-21 har sitt i dev/mattest/underlag/). */
function lasFacit(pass, fil) {
  fil = fil || path.join(facitMapp(pass), 'handelser.tsv');
  const rader = fs.readFileSync(fil, 'utf8').split('\n').filter(r => r.trim());
  const rub = rader[0].split('\t');
  const i = k => { const j = rub.indexOf(k); if (j < 0) throw new Error(`${fil}: kolumnen ${k} saknas`); return j; };
  const tom = v => v == null || v === '' || v === '-' ? null : v;
  return rader.slice(1).map((r, n) => {
    const c = r.split('\t');
    return { nr: n + 2, t: +c[i('t')], handelse: c[i('handelse')], kort: tom(c[i('kort')]), till: tom(c[i('till')]), plats: tom(c[i('plats')]), tal: tom(c[i('tal')]) };
  });
}

/* Lekens antal per namn ur dev/golden/lek.txt ("7 Swamp", annars 1) — det
   appen läser som lekAntal. Passet spelades med den leken. */
function lekAntal() {
  const m = new Map();
  for (const r of fs.readFileSync(path.join(ROT, 'dev', 'golden', 'lek.txt'), 'utf8').split('\n')) {
    const s = r.trim(); if (!s || s.startsWith('#')) continue;
    const x = s.match(/^(\d+)\s+(.+)$/);
    const namn = x ? x[2] : s, n = x ? +x[1] : 1;
    m.set(namn, (m.get(namn) || 0) + n);
  }
  return m;
}

/* Passens lek: dev/golden/lek.txt ovanför raden "# golden 17" (2026-10-05).
   Allt därunder — golden 17:s kort, tokens 2026-10-07 och det som kommer
   sedan — hör inte till leken passen 2026-09-21 och 2026-09-22 spelades med.
   Antal och set/samlarnummer tas bort som i appens lekRad.

   Raden är gränsen, så den kontrolleras: saknas den (eller skrivs den om, t.ex.
   "# Golden-17"), eller blir leken ovanför något annat än 28 namn och 40 kort,
   kastas ett fel som säger det. Förut gav en saknad rad tyst en tom lista:
   spegelfacit väntade 8 × 70 s på 114 kort och dog med "Scryfall svarar 429",
   och uppspelaren fick tyst en annan lek. */
const PASSENS_LEK = { namn: 28, kort: 40 }, GRANS = /^#\s*golden 17\b/i;
function lekRader() {
  const fil = path.join(ROT, 'dev', 'golden', 'lek.txt');
  const ovan = [], under = []; let efter = false;
  for (const r of fs.readFileSync(fil, 'utf8').split('\n')) {
    const s = r.trim();
    if (GRANS.test(s)) { efter = true; continue; }
    if (!s || s.startsWith('#')) continue;
    const x = s.match(/^(\d+)\s*[xX]?\s+(.+)$/);
    const namn = (x ? x[2] : s).replace(/\s*\((?:[A-Za-z0-9]{2,6})\)\s*[A-Za-z0-9\-★]*\s*$/, '').trim();
    (efter ? under : ovan).push({ name: namn, n: x ? +x[1] : 1 });
  }
  const kort = ovan.reduce((a, x) => a + x.n, 0);
  if (!efter) throw new Error(`dev/golden/lek.txt: raden "# golden 17 …" saknas — den skiljer passens lek (${PASSENS_LEK.namn} namn, ${PASSENS_LEK.kort} kort) från det som lagts till sedan. Lägg tillbaka raden ovanför golden 17:s namn`);
  if (ovan.length !== PASSENS_LEK.namn || kort !== PASSENS_LEK.kort) throw new Error(`dev/golden/lek.txt: ovanför "# golden 17" står ${ovan.length} namn och ${kort} kort, passens lek är ${PASSENS_LEK.namn} namn och ${PASSENS_LEK.kort} kort — nya namn hör hemma under raden`);
  return { ovan, under };
}
/* Passens lek som [{ name, n }] (uppspelarens parti-kedjan). */
function passensLek() { return lekRader().ovan; }
/* Namnen under gränsen (utanleken till golden-sidan, eventtest/kor.cjs). */
function utanforPassensLek() { return lekRader().under.map(x => x.name); }

module.exports = { ROT, PASS_FORVAL, facitMapp, materialMapp, lasFacit, lekAntal, passensLek, utanforPassensLek };

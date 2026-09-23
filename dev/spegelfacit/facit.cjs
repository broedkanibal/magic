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
   rubriken), t, handelse, kort, till, plats, tal }. '-' och tomt blir null. */
function lasFacit(pass) {
  const fil = path.join(facitMapp(pass), 'handelser.tsv');
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

module.exports = { ROT, PASS_FORVAL, facitMapp, materialMapp, lasFacit, lekAntal };

'use strict';
/* Dagens lokala bildkedja, utklippt ur index.html — som baslinje i bänken.

   dev/matcher.js och dev/orb.js är gamla kopior (första committen); appens
   egna Matcher och ORB har ändrats sedan dess (HINT_SC, packTill …). För att
   baslinjen ska vara DAGENS kedja klipps blocken ur index.html vid körning:
   Matcher, ORB, cropCanvas, orbIdentify, identifyAt, confident, skräpspärren
   serUtSomKort och deras konstanter. index.html läses bara — ingenting skrivs dit.

     node dev/embed/utdrag.cjs      → dev/embed/cache/kedjan.js (gitignorerad) */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
/* Matcher och ORB är namngivna modulfunktioner sedan MES-221 (läsningens
   räknetråd bygger sin kod ur dem): från "function <namn>(global) {" till
   och med anropet "<namn>(window);". */
function modul(namn) {
  const a = html.indexOf('\nfunction ' + namn + '(global) {'); if (a < 0) throw new Error('hittar inte function ' + namn);
  const slut = '\n' + namn + '(window);', b = html.indexOf(slut, a); if (b < 0) throw new Error('hittar inte ' + namn + '(window)');
  return html.slice(a + 1, b + slut.length);
}
function funktion(namn) {
  const a = html.indexOf('\nfunction ' + namn + '('); if (a < 0) throw new Error('hittar inte function ' + namn);
  const b = html.indexOf('\n}\n', a);
  return html.slice(a + 1, b + 2);
}
function rad(borjan) {
  const a = html.indexOf('\n' + borjan); if (a < 0) throw new Error('hittar inte ' + borjan);
  return html.slice(a + 1, html.indexOf('\n', a + 1));
}
/* Ett block från raden borjan till och med första raden slut (båda vid radens början). */
function block(borjan, slut) {
  const a = html.indexOf('\n' + borjan); if (a < 0) throw new Error('hittar inte ' + borjan);
  const b = html.indexOf('\n' + slut, a); if (b < 0) throw new Error('hittar inte ' + slut + ' efter ' + borjan);
  return html.slice(a + 1, b + 1 + slut.length);
}
const delar = [
  '/* UTKLIPPT UR index.html av dev/embed/utdrag.cjs — ändra inte här. */',
  funktion('nyCanvas'), funktion('ritKontext'), modul('matcherModul'), modul('orbModul'), modul('rakModul'),   // rakModul: den uträtade jämförelsen (MES-287)
  'const Pool = { idx: null };',
  rad('const CONF = {'), rad('const BASICS = new Set('), rad('const ORB_ACCEPT ='), rad('const refSid ='),
  funktion('confident'), funktion('cropCanvas'), funktion('orbIdentify'), funktion('skannaOchOrb'), funktion('domIdentifyAt'), funktion('identifyAt'), funktion('serUtSomKort'),
  /* Läsningens räknetråd (MES-221) med sin räkning, för dev/lasworker-prov.html. */
  funktion('orbSvep'), block('const LasWorker = (() => {', '})();'), funktion('lasWorkerKropp'),
  'window.Kedjan = { Pool, identifyAt, confident, BASICS, serUtSomKort, skannaOchOrb, domIdentifyAt, orbSvep, LasWorker };',
];
fs.mkdirSync(path.join(__dirname, 'cache'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'cache', 'kedjan.js'), delar.join('\n\n') + '\n');
console.log('cache/kedjan.js:', delar.join('\n').split('\n').length, 'rader');

'use strict';
/* Dagens lokala bildkedja, utklippt ur index.html — som baslinje i bänken.

   dev/matcher.js och dev/orb.js är gamla kopior (första committen); appens
   egna Matcher och ORB har ändrats sedan dess (HINT_SC, packTill …). För att
   baslinjen ska vara DAGENS kedja klipps blocken ur index.html vid körning:
   Matcher, ORB, cropCanvas, orbIdentify, identifyAt, confident och deras
   konstanter. index.html läses bara — ingenting skrivs dit.

     node dev/embed/utdrag.cjs      → dev/embed/cache/kedjan.js (gitignorerad) */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
function iife(marke) {
  const m = html.indexOf(marke); if (m < 0) throw new Error('hittar inte ' + marke);
  const a = html.lastIndexOf('(function (global) {', m), b = html.indexOf('})(window);', m);
  return html.slice(a, b + '})(window);'.length);
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
const delar = [
  '/* UTKLIPPT UR index.html av dev/embed/utdrag.cjs — ändra inte här. */',
  iife('global.Matcher = {'), iife('global.ORB = {'),
  'const Pool = { idx: null };',
  rad('const CONF = {'), rad('const BASICS = new Set('), rad('const ORB_ACCEPT ='), rad('const refSid ='),
  funktion('confident'), funktion('cropCanvas'), funktion('orbIdentify'), funktion('identifyAt'),
  'window.Kedjan = { Pool, identifyAt, confident, BASICS };',
];
fs.mkdirSync(path.join(__dirname, 'cache'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'cache', 'kedjan.js'), delar.join('\n\n') + '\n');
console.log('cache/kedjan.js:', delar.join('\n').split('\n').length, 'rader');

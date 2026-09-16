#!/usr/bin/env node
/* Lekens autosave (MES-168) provad utan webbläsare: klipper ut blocket
   LEKSLAG ur index.html och spelar upp ändringsköer mot sparade rader —
   också mot en rad som en annan enhet hunnit ändra (konflikten). Kör:
   node dev/lekslag.cjs — slutar med "N OK, M FEL". Ingår i dev/kolla.sh. */
const fs = require('fs'), path = require('path'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const a = src.indexOf('/* ══ BLOCK: LEKSLAG'), b = src.indexOf('/* ══ SLUT: LEKSLAG ══ */');
if (a < 0 || b < 0 || b < a) { console.error('hittar inte LEKSLAG i index.html'); process.exit(2); }
const { lekSlagTillampa, lekSlagSummor, lekSlagSids } = new Function(src.slice(a, b) + '\nreturn { lekSlagTillampa, lekSlagSummor, lekSlagSids };')();

const ok = [], fel = [];
const prov = (namn, f) => { try { f(); ok.push('OK   ' + namn); } catch (e) { fel.push('FEL  ' + namn + ' — ' + e.message); } };
const K = (name, sid) => ({ name, sid, small: 'https://img/' + sid + '.jpg' });
const bolt = K('Lightning Bolt', 'b1'), helix = K('Lightning Helix', 'h1'), mtn = K('Mountain', 'm1');
const lista = r => r.kort.map(k => `${k.n} ${k.name}${k.sb ? ' (sb)' : ''}`).sort();
const lagg = (k, n, sb) => ({ typ: 'antal', name: k.name, sb: !!sb, d: n, kort: k });

prov('tom rad + tillägg ger kortet med antal, sid och bild', () => {
  const r = lekSlagTillampa({ namn: 'New deck', kort: [] }, [lagg(bolt, 4)]);
  assert.deepEqual(lista(r), ['4 Lightning Bolt']);
  assert.equal(r.kort[0].sid, 'b1'); assert.equal(r.kort[0].small, 'https://img/b1.jpg');
  assert.equal(r.namn, 'New deck');
});

prov('samma kort två gånger blir en rad; namnet skiftlägesokänsligt', () => {
  const r = lekSlagTillampa({ kort: [] }, [lagg(bolt, 2), lagg(K('lightning  bolt', 'b2'), 1)]);
  assert.deepEqual(lista(r), ['3 Lightning Bolt']);
  assert.equal(r.kort[0].sid, 'b1', 'första tryckningen står kvar');
});

prov('main och sideboard är två rader', () => {
  const r = lekSlagTillampa({ kort: [] }, [lagg(bolt, 4), lagg(bolt, 2, true)]);
  assert.deepEqual(lista(r), ['2 Lightning Bolt (sb)', '4 Lightning Bolt']);
  assert.deepEqual(lekSlagSummor(r.kort), { main: 4, sb: 2 });
});

prov('avdrag till noll tar bort raden; avdrag på ett kort som inte finns gör ingenting', () => {
  const r = lekSlagTillampa({ kort: [{ ...bolt, n: 2 }] }, [
    { typ: 'antal', name: 'Lightning Bolt', sb: false, d: -2 },
    { typ: 'antal', name: 'Lightning Helix', sb: false, d: -1 }]);
  assert.deepEqual(r.kort, []);
});

prov('bort tar raden oavsett antal', () => {
  const r = lekSlagTillampa({ kort: [{ ...bolt, n: 4 }, { ...helix, n: 2 }] }, [{ typ: 'bort', name: 'Lightning Bolt', sb: false }]);
  assert.deepEqual(lista(r), ['2 Lightning Helix']);
});

prov('sideboard: flytten slås ihop med en rad som redan ligger där', () => {
  const r = lekSlagTillampa({ kort: [{ ...bolt, n: 3 }, { ...bolt, n: 1, sb: 1 }] },
    [{ typ: 'sb', name: 'Lightning Bolt', sb: false, till: true }]);
  assert.deepEqual(lista(r), ['4 Lightning Bolt (sb)']);
  const t = lekSlagTillampa(r, [{ typ: 'sb', name: 'Lightning Bolt', sb: true, till: false }]);
  assert.deepEqual(lista(t), ['4 Lightning Bolt']);
  assert.equal(t.kort[0].sb, undefined, 'sb-flaggan tas bort, inte satt till 0');
});

prov('namnbyte: det sista gäller, ett tomt namn ignoreras', () => {
  const r = lekSlagTillampa({ namn: 'A', kort: [] }, [{ typ: 'namn', namn: 'B' }, { typ: 'namn', namn: '' }, { typ: 'namn', namn: 'C' }]);
  assert.equal(r.namn, 'C');
});

prov('dubbletter i en äldre sparad rad slås ihop innan kön spelas', () => {
  const r = lekSlagTillampa({ kort: [{ ...mtn, n: 4 }, { ...mtn, n: 12 }] }, [{ typ: 'antal', name: 'Mountain', sb: false, d: -1 }]);
  assert.deepEqual(lista(r), ['15 Mountain']);
});

prov('en rad utan n räknas som ett kort (lekar från före antalen)', () => {
  const r = lekSlagTillampa({ kort: [{ name: 'Sol Ring', sid: 's1' }] }, []);
  assert.equal(r.kort[0].n, 1);
});

prov('raden ändras inte av uppspelningen (den är serverns)', () => {
  const bas = { namn: 'X', kort: [{ ...bolt, n: 4 }] };
  const fore = JSON.stringify(bas);
  lekSlagTillampa(bas, [lagg(bolt, 1), { typ: 'sb', name: 'Lightning Bolt', sb: false, till: true }, { typ: 'namn', namn: 'Y' }]);
  assert.equal(JSON.stringify(bas), fore);
});

/* Konflikten: flik A och flik B utgick från samma rad. B hann spara; A:s
   kö spelas upp på B:s rad. */
const start = { namn: 'Boros', kort: [{ ...bolt, n: 4 }, { ...helix, n: 2 }, { ...mtn, n: 16 }] };

prov('konflikt: båda lade till samma kort — båda tilläggen räknas', () => {
  const b = lekSlagTillampa(start, [lagg(helix, 1)]);
  const a = lekSlagTillampa(b, [lagg(helix, 1)]);
  assert.deepEqual(lista(a), ['16 Mountain', '4 Lightning Bolt', '4 Lightning Helix']);
});

prov('konflikt: B tog bort ett kort som A ökade — A:s tillägg lägger in det igen med A:s ökning', () => {
  const b = lekSlagTillampa(start, [{ typ: 'bort', name: 'Lightning Helix', sb: false }]);
  const a = lekSlagTillampa(b, [lagg(helix, 1)]);
  assert.deepEqual(lista(a), ['1 Lightning Helix', '16 Mountain', '4 Lightning Bolt']);
});

prov('konflikt: B tog bort ett kort som A minskade — det förblir borta', () => {
  const b = lekSlagTillampa(start, [{ typ: 'bort', name: 'Lightning Helix', sb: false }]);
  const a = lekSlagTillampa(b, [{ typ: 'antal', name: 'Lightning Helix', sb: false, d: -1 }]);
  assert.deepEqual(lista(a), ['16 Mountain', '4 Lightning Bolt']);
});

prov('konflikt: B döpte om, A lade till kort — B:s namn och A:s kort', () => {
  const b = lekSlagTillampa(start, [{ typ: 'namn', namn: 'Boros Blades' }]);
  const a = lekSlagTillampa(b, [lagg(K('Boros Charm', 'c1'), 4)]);
  assert.equal(a.namn, 'Boros Blades');
  assert.deepEqual(lista(a), ['16 Mountain', '2 Lightning Helix', '4 Boros Charm', '4 Lightning Bolt']);
});

prov('konflikt: båda döpte om — den som spelas upp sist (A) vinner', () => {
  const b = lekSlagTillampa(start, [{ typ: 'namn', namn: 'B-namn' }]);
  const a = lekSlagTillampa(b, [{ typ: 'namn', namn: 'A-namn' }]);
  assert.equal(a.namn, 'A-namn');
});

prov('konflikt: B flyttade till sideboard, A ökade i main — A:s tillägg blir en egen main-rad', () => {
  const b = lekSlagTillampa(start, [{ typ: 'sb', name: 'Lightning Bolt', sb: false, till: true }]);
  const a = lekSlagTillampa(b, [lagg(bolt, 1)]);
  assert.deepEqual(lista(a), ['1 Lightning Bolt', '16 Mountain', '2 Lightning Helix', '4 Lightning Bolt (sb)']);
});

prov('konflikt: telefonen lade till ett foto medan datorn ändrade basländer', () => {
  const tel = { namn: 'Boros', kort: [...start.kort, { ...K('Serra Angel', 'sa'), n: 3 }] };
  const a = lekSlagTillampa(tel, [{ typ: 'antal', name: 'Mountain', sb: false, d: -2 }, lagg(K('Plains', 'p1'), 2)]);
  assert.deepEqual(lista(a), ['14 Mountain', '2 Lightning Helix', '2 Plains', '3 Serra Angel', '4 Lightning Bolt']);
});

prov('sid-mängden ändras bara när ett kort kommer till eller försvinner', () => {
  const fore = lekSlagSids(start.kort);
  assert.equal(lekSlagSids(lekSlagTillampa(start, [lagg(bolt, 3)]).kort), fore);
  assert.equal(lekSlagSids(lekSlagTillampa(start, [{ typ: 'sb', name: 'Lightning Bolt', sb: false, till: true }]).kort), fore);
  assert.notEqual(lekSlagSids(lekSlagTillampa(start, [{ typ: 'bort', name: 'Mountain', sb: false }]).kort), fore);
  assert.notEqual(lekSlagSids(lekSlagTillampa(start, [lagg(K('Boros Charm', 'c1'), 1)]).kort), fore);
});

for (const r of [...ok, ...fel]) console.log(r);
console.log(`\nlekslag: ${ok.length} OK, ${fel.length} FEL`);
process.exit(fel.length ? 1 : 0);

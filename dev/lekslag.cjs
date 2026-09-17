#!/usr/bin/env node
/* Lekens autosave (MES-168) provad utan webbläsare: klipper ut blocket
   LEKSLAG ur index.html och spelar upp ändringsköer mot sparade rader —
   också mot en rad som en annan enhet hunnit ändra (konflikten). Kör:
   node dev/lekslag.cjs — slutar med "N OK, M FEL". Ingår i dev/kolla.sh. */
const fs = require('fs'), path = require('path'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const a = src.indexOf('/* ══ BLOCK: LEKSLAG'), b = src.indexOf('/* ══ SLUT: LEKSLAG ══ */');
if (a < 0 || b < 0 || b < a) { console.error('hittar inte LEKSLAG i index.html'); process.exit(2); }
const { lekSlagTillampa, lekSlagSummor, lekSlagSids, lekDialogOps, lekNyssKvar } = new Function(src.slice(a, b) + '\nreturn { lekSlagTillampa, lekSlagSummor, lekSlagSids, lekDialogOps, lekNyssKvar };')();

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

/* MES-169: byt kort och To check. */
const charm = K('Boros Charm', 'c1');
prov('byt: kortet får nytt namn, sid och bild, antalet följer med', () => {
  const r = lekSlagTillampa(start, [{ typ: 'byt', name: 'Lightning Helix', sb: false, kort: charm }]);
  assert.deepEqual(lista(r), ['16 Mountain', '2 Boros Charm', '4 Lightning Bolt']);
  const c = r.kort.find(k => k.name === 'Boros Charm');
  assert.equal(c.sid, 'c1'); assert.equal(c.small, 'https://img/c1.jpg');
});
prov('byt: finns det nya kortet redan på samma sida slås raderna ihop', () => {
  const r = lekSlagTillampa(start, [{ typ: 'byt', name: 'Lightning Helix', sb: false, kort: bolt }]);
  assert.deepEqual(lista(r), ['16 Mountain', '6 Lightning Bolt']);
});
prov('byt: samma namn på andra sidan slås inte ihop', () => {
  const bas = { kort: [{ ...helix, n: 2 }, { ...bolt, n: 1, sb: 1 }] };
  const r = lekSlagTillampa(bas, [{ typ: 'byt', name: 'Lightning Helix', sb: false, kort: bolt }]);
  assert.deepEqual(lista(r), ['1 Lightning Bolt (sb)', '2 Lightning Bolt']);
});
prov('byt: osäkerheten försvinner med bytet; en annan tryckning av samma kort byter sid', () => {
  const bas = { kort: [{ ...helix, n: 4, koll: { las: 'Lightnig Helix', kalla: 'Pasted list' } }] };
  const r = lekSlagTillampa(bas, [{ typ: 'byt', name: 'Lightning Helix', sb: false, kort: K('Lightning Helix', 'h2') }]);
  assert.equal(r.kort[0].sid, 'h2'); assert.equal(r.kort[0].n, 4); assert.equal(r.kort[0].koll, undefined);
});
prov('byt: ett kort som inte (längre) finns gör ingenting', () => {
  const r = lekSlagTillampa(start, [{ typ: 'byt', name: 'Serra Angel', sb: false, kort: charm }]);
  assert.deepEqual(lista(r), lista(start));
});
prov('konflikt: B lade till ett exemplar av kortet som A bytte — det följer med bytet', () => {
  const b = lekSlagTillampa(start, [lagg(helix, 1)]);
  const a = lekSlagTillampa(b, [{ typ: 'byt', name: 'Lightning Helix', sb: false, kort: charm }]);
  assert.deepEqual(lista(a), ['16 Mountain', '3 Boros Charm', '4 Lightning Bolt']);
});
const osaker = { las: 'Lightnig Helix', kalla: 'Pasted list' };
prov('koll: ett nytt kort bär sin osäkerhet in i raden, ett befintligt får ingen', () => {
  const r = lekSlagTillampa(start, [lagg({ ...helix, koll: osaker }, 2), lagg({ ...charm, koll: osaker }, 1)]);
  assert.equal(r.kort.find(k => k.name === 'Lightning Helix').koll, undefined);
  assert.deepEqual(r.kort.find(k => k.name === 'Boros Charm').koll, osaker);
});
prov('koll: sätts och tas bort; sparas i raden och överlever en ny uppspelning', () => {
  const r = lekSlagTillampa(start, [{ typ: 'koll', name: 'Lightning Bolt', sb: false, koll: osaker }]);
  assert.deepEqual(r.kort.find(k => k.name === 'Lightning Bolt').koll, osaker);
  const t = lekSlagTillampa(JSON.parse(JSON.stringify(r)), []);
  assert.deepEqual(t.kort.find(k => k.name === 'Lightning Bolt').koll, osaker);
  const u = lekSlagTillampa(t, [{ typ: 'koll', name: 'Lightning Bolt', sb: false, koll: null }]);
  assert.equal('koll' in u.kort.find(k => k.name === 'Lightning Bolt'), false);
});
prov('koll: flytt till sideboard behåller osäkerheten, också när raderna slås ihop', () => {
  const bas = { kort: [{ ...bolt, n: 3, koll: osaker }, { ...bolt, n: 1, sb: 1 }] };
  const r = lekSlagTillampa(bas, [{ typ: 'sb', name: 'Lightning Bolt', sb: false, till: true }]);
  assert.deepEqual(r.kort[0].koll, osaker); assert.equal(r.kort[0].n, 4);
});

/* MES-186: telefonens gamla dialog sparar skillnaden, inte hela listan. */
const medKoll = { name: 'Spiteful Hexmage', sid: 's1', small: 'https://img/s1.jpg', n: 4, koll: { las: 'Spiteful Hexmager', kalla: 'Pasted list' } };
const dialogBas = { namn: 'Deck', kort: [medKoll, { ...bolt, n: 4 }, { ...helix, n: 2 }, { ...mtn, n: 16 }] };
const dialogLista = r => lekSlagTillampa(r, []).kort.map(k => ({ name: k.name, sid: k.sid, small: k.small, n: k.n, sb: k.sb }));
prov('dialogen: oförändrad lista ger inga ändringar', () => {
  assert.deepEqual(lekDialogOps(dialogBas, dialogLista(dialogBas)), []);
});
prov('dialogen: ökning, nytt kort och borttaget kort blir ändringar; To check står kvar', () => {
  const tel = dialogLista(dialogBas).filter(k => k.name !== 'Lightning Helix');
  tel.find(k => k.name === 'Lightning Bolt').n = 5;
  tel.push({ name: 'Boros Charm', sid: 'c1', small: null, n: 2 });
  const r = lekSlagTillampa(dialogBas, lekDialogOps(dialogBas, tel));
  assert.deepEqual(lista(r), ['16 Mountain', '2 Boros Charm', '4 Spiteful Hexmage', '5 Lightning Bolt']);
  assert.deepEqual(r.kort.find(k => k.name === 'Spiteful Hexmage').koll, medKoll.koll);
});
prov('dialogen: dubbletter i telefonens lista räknas ihop, inte dubbelt', () => {
  const tel = dialogLista(dialogBas).concat([{ ...mtn, n: 2 }]);
  assert.deepEqual(lekDialogOps(dialogBas, tel), [{ typ: 'antal', name: 'Mountain', sb: false, d: 2, kort: { name: 'Mountain', sid: 'm1', small: 'https://img/m1.jpg' } }]);
});
prov('konflikt: datorn ändrade under tiden — telefonens ändringar spelas upp på den nyare raden', () => {
  const tel = dialogLista(dialogBas); tel.find(k => k.name === 'Mountain').n = 17;
  const ops = lekDialogOps(dialogBas, tel);
  const datorn = lekSlagTillampa(dialogBas, [lagg(helix, 1), { typ: 'koll', name: 'Lightning Bolt', sb: false, koll: { las: 'Lightnig Bolt', kalla: 'Pasted list' } }]);
  const r = lekSlagTillampa(datorn, ops);
  assert.deepEqual(lista(r), ['17 Mountain', '3 Lightning Helix', '4 Lightning Bolt', '4 Spiteful Hexmage']);
  assert.ok(r.kort.find(k => k.name === 'Lightning Bolt').koll, 'datorns To check finns kvar');
});
prov('Just added: raden står kvar så länge kortet är i leken, annars inte', () => {
  const nyss = [{ nr: 2, name: 'Lightning Bolt', sb: false, n: 2 }, { nr: 1, name: 'Lightning Helix', sb: true, n: 1 }];
  const kort = [{ name: 'lightning  BOLT', n: 2 }, { name: 'Lightning Helix', sb: 1, n: 1 }];
  assert.deepEqual(lekNyssKvar(nyss, kort).map(e => e.nr), [2, 1], 'båda kvar');
  /* En annan flik tog bort kortet: raden har inget att ångra. */
  assert.deepEqual(lekNyssKvar(nyss, [{ name: 'Lightning Helix', sb: 1, n: 1 }]).map(e => e.nr), [1]);
  /* Samma namn i main är inte sideboardens rad. */
  assert.deepEqual(lekNyssKvar(nyss, [{ name: 'Lightning Helix', n: 1 }]).map(e => e.nr), []);
  assert.deepEqual(lekNyssKvar(nyss, []), []);
  assert.deepEqual(lekNyssKvar([], kort), []);
});

prov('Just added: en inklistrad lista står kvar tills alla dess kort är borta', () => {
  const batch = [{ nr: 5, name: 'Pasted list', n: 3, batch: [{ name: 'Lightning Bolt', sb: false, n: 2 }, { name: 'Lightning Helix', sb: false, n: 1 }] }];
  assert.equal(lekNyssKvar(batch, [{ name: 'Lightning Helix', n: 1 }]).length, 1, 'ett kort kvar räcker');
  assert.equal(lekNyssKvar(batch, [{ name: 'Mountain', n: 4 }]).length, 0);
});

for (const r of [...ok, ...fel]) console.log(r);
console.log(`\nlekslag: ${ok.length} OK, ${fel.length} FEL`);
process.exit(fel.length ? 1 : 0);

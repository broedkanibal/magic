#!/usr/bin/env node
/* Lekens autosave (MES-168) provad utan webbläsare: klipper ut blocket
   LEKSLAG ur index.html och spelar upp ändringsköer mot sparade rader —
   också mot en rad som en annan enhet hunnit ändra (konflikten). Kör:
   node dev/lekslag.cjs — slutar med "N OK, M FEL". Ingår i dev/kolla.sh. */
const fs = require('fs'), path = require('path'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const a = src.indexOf('/* ══ BLOCK: LEKSLAG'), b = src.indexOf('/* ══ SLUT: LEKSLAG ══ */');
if (a < 0 || b < 0 || b < a) { console.error('hittar inte LEKSLAG i index.html'); process.exit(2); }
const { lekSlagTillampa, lekSlagSummor, lekSlagSids, lekNyssKvar, lekOkandKort, lekSlagKlaraEfter, LEK_KLARA_TAK,
  lekSlagFotoAv, lekSlagFotoTillbaka, lekSlagFotoNr } = new Function(src.slice(a, b) + '\nreturn { lekSlagTillampa, lekSlagSummor, lekSlagSids, lekNyssKvar, lekOkandKort: typeof lekOkandKort === "function" ? lekOkandKort : null, lekSlagKlaraEfter, LEK_KLARA_TAK, lekSlagFotoAv, lekSlagFotoTillbaka, lekSlagFotoNr };')();

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

/* MES-172: telefonens foto lägger till det den såg som ÄNDRINGAR — ett
   tillägg per kort, med koll på det som var osäkert. Ingen hel lista, så
   datorns arbete under tiden står kvar. */
const medKoll = { name: 'Spiteful Hexmage', sid: 's1', small: 'https://img/s1.jpg', n: 4, koll: { las: 'Spiteful Hexmager', kalla: 'Pasted list' } };
const telBas = { namn: 'Deck', kort: [medKoll, { ...bolt, n: 4 }, { ...helix, n: 2 }, { ...mtn, n: 16 }] };
/* Så bygger telfotoLas sina ändringar: namnet, antalet i fotot, och koll när
   modellen tvekade eller Scryfall bytte ut namnet. */
const foto = (kort, n, koll) => ({ typ: 'antal', name: kort.name, sb: false, d: n, kort: koll ? { ...kort, koll } : { ...kort } });
prov('telefonen: fotots kort läggs till på det som redan finns', () => {
  const r = lekSlagTillampa(telBas, [foto(bolt, 2), foto(K('Boros Charm', 'c1'), 3)]);
  assert.deepEqual(lista(r), ['16 Mountain', '2 Lightning Helix', '3 Boros Charm', '4 Spiteful Hexmage', '6 Lightning Bolt']);
  assert.deepEqual(r.kort.find(k => k.name === 'Spiteful Hexmage').koll, medKoll.koll, 'datorns To check står kvar');
});
prov('telefonen: koll sätts på ett nytt kort, men inte på ett som redan fanns', () => {
  const osaker = { las: 'Arclight Phoenlx', kalla: 'Photo 1', remsa: 'data:image/jpeg;base64,xx' };
  const r = lekSlagTillampa(telBas, [foto(K('Arclight Phoenix', 'p1'), 3, osaker), foto(bolt, 1, osaker)]);
  assert.deepEqual(r.kort.find(k => k.name === 'Arclight Phoenix').koll, osaker, 'nytt kort bär remsan');
  assert.equal(r.kort.find(k => k.name === 'Lightning Bolt').koll, undefined, 'ett kort som redan fanns blir inte osäkert');
});
prov('telefonen: två foton av samma kort läggs ihop, inte sätts', () => {
  const ett = lekSlagTillampa({ namn: 'Deck', kort: [] }, [foto(mtn, 4)]);
  const tva = lekSlagTillampa(ett, [foto(mtn, 3)]);
  assert.deepEqual(lista(tva), ['7 Mountain']);
});
prov('konflikt: datorn ändrade under tiden — fotots ändringar spelas upp på den nyare raden', () => {
  const ops = [foto(mtn, 1), foto(K('Boros Charm', 'c1'), 2)];
  const datorn = lekSlagTillampa(telBas, [lagg(helix, 1), { typ: 'koll', name: 'Lightning Bolt', sb: false, koll: { las: 'Lightnig Bolt', kalla: 'Pasted list' } }]);
  const r = lekSlagTillampa(datorn, ops);
  assert.deepEqual(lista(r), ['17 Mountain', '2 Boros Charm', '3 Lightning Helix', '4 Lightning Bolt', '4 Spiteful Hexmage']);
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

/* MES-289: ett kort ur ett foto som Mesa inte kunde göra till ett kort —
   tomt namn, eller ett namn som inte gick att slå upp — ligger i leken som en
   platshållare under To check tills någon väljer kortet eller tar bort det. */
const okand = (las, id, remsa = 'data:remsa-' + id) => lekOkandKort(las, 'Photo 2', remsa, id);
prov('platshållare: läggs in, räknas i antalet, bär remsan och inget sid', () => {
  const r = lekSlagTillampa(telBas, [foto(okand('', 'a1'), 1), foto(okand('Blixtpil', 'b2'), 2)]);
  const p = r.kort.filter(k => k.okand);
  assert.equal(p.length, 2);
  assert.deepEqual(p.map(k => k.koll.las).sort(), ['', 'Blixtpil']);
  assert.ok(p.every(k => !k.sid && k.koll.kalla === 'Photo 2' && k.koll.remsa));
  assert.equal(lekSlagSummor(r.kort).main, lekSlagSummor(telBas.kort).main + 3);
  assert.equal(lekSlagSids(r.kort), lekSlagSids(telBas.kort), 'ingen tryckning — poolen byggs inte om');
});
prov('platshållare: två oläsliga kort blir två rader, aldrig en', () => {
  const r = lekSlagTillampa({ kort: [] }, [foto(okand('', 'a1'), 1), foto(okand('', 'a2'), 1)]);
  assert.equal(r.kort.length, 2);
  assert.notEqual(r.kort[0].koll.remsa, r.kort[1].koll.remsa);
});
prov('platshållare: överlever en ny uppspelning av den sparade raden', () => {
  const r = lekSlagTillampa({ kort: [] }, [foto(okand('', 'a1'), 1)]);
  const t = lekSlagTillampa(JSON.parse(JSON.stringify(r)), []);
  assert.equal(t.kort.length, 1); assert.equal(t.kort[0].okand, 1); assert.ok(t.kort[0].koll.remsa);
});
prov('platshållare: Pick the card (byt) gör den till ett riktigt kort utan To check', () => {
  const p = okand('', 'a1');
  const r = lekSlagTillampa({ kort: [] }, [foto(p, 1), { typ: 'byt', name: p.name, sb: false, kort: charm }]);
  assert.deepEqual(lista(r), ['1 Boros Charm']);
  assert.equal(r.kort[0].okand, undefined); assert.equal(r.kort[0].koll, undefined); assert.equal(r.kort[0].sid, 'c1');
});
prov('platshållare: kortet man väljer fanns redan — raderna slås ihop', () => {
  const p = okand('Lightnig Bolt', 'a1');
  const r = lekSlagTillampa(telBas, [foto(p, 1), { typ: 'byt', name: p.name, sb: false, kort: bolt }]);
  assert.equal(r.kort.find(k => k.name === 'Lightning Bolt').n, 5);
  assert.equal(r.kort.filter(k => k.okand).length, 0);
});
prov('platshållare: ett ångrat byte (mallen med okand) gör den till platshållare igen', () => {
  const p = okand('', 'a1');
  const valt = lekSlagTillampa({ kort: [] }, [foto(p, 1), { typ: 'byt', name: p.name, sb: false, kort: charm }]);
  /* Så ser omvändningen ut (mallAv i lekytan bär okand och koll). */
  const mall = { name: p.name, sid: null, small: null, koll: p.koll, okand: 1 };
  const r = lekSlagTillampa(valt, [{ typ: 'byt', name: 'Boros Charm', sb: false, kort: mall }]);
  assert.equal(r.kort.length, 1); assert.equal(r.kort[0].okand, 1); assert.deepEqual(r.kort[0].koll, p.koll);
});
prov('platshållare: Remove tar bort den', () => {
  const p = okand('', 'a1');
  const r = lekSlagTillampa({ kort: [] }, [foto(p, 1), { typ: 'bort', name: p.name, sb: false }]);
  assert.deepEqual(r.kort, []);
});
prov('ett kort utan tryckning som inte är en platshållare läggs fortfarande inte in', () => {
  const r = lekSlagTillampa({ kort: [] }, [{ typ: 'antal', name: 'X', sb: false, d: 1, kort: { name: 'X' } }]);
  assert.deepEqual(r.kort, []);
});

/* MES-289: varje ändring har ett id, och raden bär id:na på det som redan
   ligger i den (decks.klara). En ändring som redan ligger där spelas inte upp
   igen — ett svar som försvann ger inga dubbletter. */
const medId = (op, id) => Object.assign({ id }, op);
prov('klara: en ändring vars id står i raden spelas inte upp igen', () => {
  const bas = { kort: [{ ...bolt, n: 1 }], klara: ['x1'] };
  const r = lekSlagTillampa(bas, [medId(lagg(bolt, 1), 'x1'), medId(lagg(helix, 2), 'x2')]);
  assert.deepEqual(lista(r), ['1 Lightning Bolt', '2 Lightning Helix']);
});
prov('klara: alla slags ändringar hoppas över (bort, sb, byt, koll, namn)', () => {
  const bas = { namn: 'A', kort: [{ ...bolt, n: 2 }, { ...helix, n: 1 }], klara: ['b', 's', 'y', 'k', 'n'] };
  const r = lekSlagTillampa(bas, [
    medId({ typ: 'bort', name: 'Lightning Helix', sb: false }, 'b'),
    medId({ typ: 'sb', name: 'Lightning Bolt', sb: false, till: true }, 's'),
    medId({ typ: 'byt', name: 'Lightning Bolt', sb: false, kort: mtn }, 'y'),
    medId({ typ: 'koll', name: 'Lightning Bolt', sb: false, koll: { las: 'x' } }, 'k'),
    medId({ typ: 'namn', namn: 'B' }, 'n')]);
  assert.deepEqual(lista(r), ['1 Lightning Helix', '2 Lightning Bolt']);
  assert.equal(r.namn, 'A'); assert.equal(r.kort.find(k => k.name === 'Lightning Bolt').koll, undefined);
});
prov('klara: en ändring utan id spelas upp (datorns vy innan den skickats, äldre kod)', () => {
  const r = lekSlagTillampa({ kort: [{ ...bolt, n: 1 }], klara: ['x1'] }, [lagg(bolt, 1)]);
  assert.deepEqual(lista(r), ['2 Lightning Bolt']);
});
prov('klara: en rad utan klara (null, saknas, inte en lista) spelar upp allt, som förut', () => {
  for (const klara of [undefined, null, {}, 'x1']) {
    const r = lekSlagTillampa({ kort: [{ ...bolt, n: 1 }], klara }, [medId(lagg(bolt, 1), 'x1')]);
    assert.deepEqual(lista(r), ['2 Lightning Bolt'], JSON.stringify(klara));
  }
  assert.deepEqual(lista(lekSlagTillampa(null, [medId(lagg(bolt, 1), 'x1')])), ['1 Lightning Bolt']);
});
prov('klara: samma kö uppspelad två gånger på sin egen skrivning ger samma lek (svaret som försvann)', () => {
  const ko = [medId(lagg(bolt, 1), 'a'), medId(lagg(helix, 1), 'b')];
  const skriven = lekSlagTillampa({ kort: [] }, ko);
  const rad = { ...skriven, klara: lekSlagKlaraEfter({ kort: [] }, ko) };
  assert.deepEqual(lista(lekSlagTillampa(rad, ko)), lista(skriven));
});
prov('lekSlagKlaraEfter: radens id:n följt av köns, utan dubbletter; ändringar utan id lämnar inget', () => {
  assert.deepEqual(lekSlagKlaraEfter({ klara: ['a', 'b'] }, [{ id: 'b' }, { id: 'c' }, lagg(bolt, 1), null]), ['a', 'b', 'c']);
  assert.deepEqual(lekSlagKlaraEfter({}, [{ id: 'c' }]), ['c']);
  assert.deepEqual(lekSlagKlaraEfter({ klara: null }, []), []);
});
prov(`lekSlagKlaraEfter: kapas till de senaste ${LEK_KLARA_TAK}, men kön som sparas står alltid kvar`, () => {
  const gamla = Array.from({ length: LEK_KLARA_TAK }, (_, i) => 'g' + i);
  const k = lekSlagKlaraEfter({ klara: gamla }, [{ id: 'ny' }]);
  assert.equal(k.length, LEK_KLARA_TAK); assert.equal(k[k.length - 1], 'ny'); assert.equal(k[0], 'g1');
  const stor = Array.from({ length: LEK_KLARA_TAK + 50 }, (_, i) => ({ id: 'q' + i }));
  const k2 = lekSlagKlaraEfter({ klara: gamla }, stor);
  assert.equal(k2.length, LEK_KLARA_TAK + 50); assert.ok(stor.every(op => k2.includes(op.id)));
});

/* ── Lekfotot: vilket foto ett exemplar kom ur (MES-321) ──────────────
   foto: {fid: n} på raden, antal-ändringar med foto, och fotobort. Frågan
   varje fall svarar på: tar Remove photo, Undo och Retake bort och lägger
   tillbaka EXAKT fotots exemplar — inget kort två gånger, inget försvinner —
   också när ett kort bytt namn eller en annan enhet sparat emellan? */
const F1 = '1:aaaaa', F1B = '1:bbbbb', F2 = '2:ccccc', F3 = '3:ddddd';
const swamp = K('Swamp', 'sw'), sol = K('Sol Ring', 'sr');
const ff = (k, n, fid, koll) => ({ typ: 'antal', name: k.name, sb: false, d: n, kort: koll ? { ...k, koll } : { ...k }, foto: fid });
const fb = fid => ({ typ: 'fotobort', foto: fid });
const tal = (r, n, sb) => { const k = r.kort.find(x => x.name === n && !!x.sb === !!sb); return k ? k.n : 0; };
const fotoAv = (r, n) => (r.kort.find(x => x.name === n) || {}).foto;
/* Foto 1: 2 Swamp, Bolt, platshållare. Foto 2: 1 Swamp, Helix. */
const P1 = lekOkandKort('', 'Photo 1', 'data:r1', 'p1');
const tva = () => lekSlagTillampa({ namn: 'Deck', kort: [{ ...sol, n: 1 }] },
  [ff(swamp, 2, F1), ff(bolt, 1, F1), ff(P1, 1, F1), ff(swamp, 1, F2), ff(helix, 1, F2)]);

prov('foto: ett tillägg ur ett foto bär fotot; samma kort i två foton räknas per foto', () => {
  const r = tva();
  assert.deepEqual(fotoAv(r, 'Swamp'), { [F1]: 2, [F2]: 1 });
  assert.deepEqual(fotoAv(r, 'Lightning Bolt'), { [F1]: 1 });
  assert.equal(fotoAv(r, 'Sol Ring'), undefined, 'kortet lagt för hand har inget foto');
  assert.deepEqual([...lekSlagFotoAv(r.kort)].sort(), [[F1, 4], [F2, 2]]);
});
prov('fotobort: fotots exemplar ur varje rad; andra fotons och handlagda står kvar', () => {
  const r = lekSlagTillampa(tva(), [fb(F1)]);
  assert.deepEqual(lista(r), ['1 Lightning Helix', '1 Sol Ring', '1 Swamp']);
  assert.deepEqual(fotoAv(r, 'Swamp'), { [F2]: 1 });
  assert.ok(!r.kort.some(k => k.okand), 'platshållaren ur foto 1 är borta');
  assert.deepEqual(lekSlagSummor(r.kort), { main: 3, sb: 0 });
});
prov('fotobort: okänt foto, rader utan foto och en gammal lek utan fältet rörs inte', () => {
  const gammal = { namn: 'Old', kort: [{ ...bolt, n: 4 }, { ...mtn, n: 16 }] };
  const r = lekSlagTillampa(gammal, [fb(F3), fb(''), { typ: 'fotobort' }]);
  assert.deepEqual(lista(r), ['16 Mountain', '4 Lightning Bolt']);
  assert.ok(r.kort.every(k => !('foto' in k)), 'inget tomt foto-fält skrivs');
});
prov('fotobort: ett exemplar borttaget för hand först, raden går aldrig under noll', () => {
  const r = lekSlagTillampa(tva(), [{ typ: 'antal', name: 'Swamp', sb: false, d: -2 }, fb(F1), fb(F2)]);
  assert.equal(tal(r, 'Swamp'), 0, 'tre Swamp, två bort för hand, sedan båda fotona: ingen kvar');
  assert.ok(!r.kort.some(k => k.n <= 0), 'ingen rad med noll eller mindre');
});
prov('byt: det kollade namnet behåller fotot, och Remove photo tar det nya namnet', () => {
  const r = lekSlagTillampa(tva(), [{ typ: 'byt', name: P1.name, sb: false, kort: { ...mtn } }]);
  assert.deepEqual(fotoAv(r, 'Mountain'), { [F1]: 1 });
  assert.equal(tal(lekSlagTillampa(r, [fb(F1)]), 'Mountain'), 0);
});
prov('byt: in i ett kort som redan fanns slås fotona ihop; ett ångrat byte tar inte mallens foto', () => {
  const r = lekSlagTillampa(tva(), [{ typ: 'byt', name: P1.name, sb: false, kort: { ...swamp } }]);
  assert.deepEqual(fotoAv(r, 'Swamp'), { [F1]: 3, [F2]: 1 });
  const b = lekSlagTillampa(tva(), [{ typ: 'byt', name: 'Lightning Bolt', sb: false, kort: { ...charm, foto: { [F3]: 9 } } }]);
  assert.deepEqual(fotoAv(b, 'Boros Charm'), { [F1]: 1 }, 'raden behåller sina egna foton');
});
prov('sb: fotot följer med raden till sideboarden och slås ihop där', () => {
  const r = lekSlagTillampa(tva(), [ff(swamp, 1, F3), { typ: 'sb', name: 'Swamp', sb: false, till: true }]);
  assert.equal(tal(r, 'Swamp', true), 4);
  assert.deepEqual(r.kort.find(k => k.name === 'Swamp' && k.sb).foto, { [F1]: 2, [F2]: 1, [F3]: 1 });
  assert.equal(tal(lekSlagTillampa(r, [fb(F1)]), 'Swamp', true), 2);
});
prov('Undo av Remove photo: lekSlagFotoTillbaka ger tillbaka exakt det som togs, med foto', () => {
  const fore = tva();
  const angra = lekSlagFotoTillbaka(fore.kort, F1);
  assert.equal(angra.reduce((s, o) => s + o.d, 0), 4);
  assert.ok(angra.every(o => o.typ === 'antal' && o.foto === F1));
  const r = lekSlagTillampa(lekSlagTillampa(fore, [fb(F1)]), angra);
  assert.deepEqual(lista(r), lista(fore));
  assert.deepEqual(fotoAv(r, 'Swamp'), { [F2]: 1, [F1]: 2 });
  assert.ok(r.kort.find(k => k.okand && k.koll && k.koll.remsa === 'data:r1'), 'platshållaren med sin remsa');
});
prov('Undo av Remove photo: det kollade namnet kommer tillbaka, inte platshållaren', () => {
  const fore = lekSlagTillampa(tva(), [{ typ: 'byt', name: P1.name, sb: false, kort: { ...mtn } }]);
  const bort = lekSlagTillampa(fore, [fb(F1)]);
  assert.equal(tal(bort, 'Mountain'), 0, 'Remove photo 1 tar det kollade namnet');
  const r = lekSlagTillampa(bort, lekSlagFotoTillbaka(fore.kort, F1));
  assert.equal(tal(r, 'Mountain'), 1);
  assert.deepEqual(fotoAv(r, 'Mountain'), { [F1]: 1 });
  assert.ok(!r.kort.some(k => k.okand));
});
prov('Undo av Remove photo är exakt också när ett exemplar tagits bort för hand (bokföringen hålls under n)', () => {
  /* Swamp n=1 med foto {F1:2, F2:1} (en rad skriven före taket) dras ned till
     ett exemplar, senast tillagda foto först: {F1:1}. Remove F1 + Undo ger
     tillbaka precis det. */
  const fore = lekSlagTillampa({ kort: [{ ...swamp, n: 1, foto: { [F1]: 2, [F2]: 1 } }] }, []);
  assert.deepEqual(fotoAv(fore, 'Swamp'), { [F1]: 1 });
  const bort = lekSlagTillampa(fore, [fb(F1)]);
  assert.equal(bort.kort.length, 0);
  const r = lekSlagTillampa(bort, lekSlagFotoTillbaka(fore.kort, F1));
  assert.deepEqual([tal(r, 'Swamp'), fotoAv(r, 'Swamp')], [1, { [F1]: 1 }]);
  /* Tre Swamp (två ur foto 1, en ur foto 2), en borttagen för hand: foto 2:s
     dras av först. Remove F1 + Undo ger samma två tillbaka. */
  const fore2 = lekSlagTillampa(tva(), [{ typ: 'antal', name: 'Swamp', sb: false, d: -1 }]);
  assert.deepEqual([tal(fore2, 'Swamp'), fotoAv(fore2, 'Swamp')], [2, { [F1]: 2 }]);
  const r2 = lekSlagTillampa(lekSlagTillampa(fore2, [fb(F1)]), lekSlagFotoTillbaka(fore2.kort, F1));
  assert.deepEqual([tal(r2, 'Swamp'), fotoAv(r2, 'Swamp')], [2, { [F1]: 2 }]);
});
prov('G12: Undo av Remove photo på en rad som ett annat foto återskapat, sedan Remove igen: det andra fotots kort står kvar', () => {
  /* Kontrollgranskningen av MES-322: foto 1 ger 2 Swamp, en tas bort för hand,
     Remove photo 1, foto 3 ger 1 Swamp, Undo, Remove photo 1 igen. Med fotoN
     blev bokföringen {3:1, 1:2} på två Swamp, och foto 3:s Swamp försvann. */
  let r = lekSlagTillampa({ kort: [] }, [ff(swamp, 2, F1)]);
  r = lekSlagTillampa(r, [{ typ: 'antal', name: 'Swamp', sb: false, d: -1 }]);
  const ater = lekSlagFotoTillbaka(r.kort, F1);
  r = lekSlagTillampa(r, [fb(F1)]);
  assert.equal(r.kort.length, 0);
  r = lekSlagTillampa(r, [ff(swamp, 1, F3)]);
  r = lekSlagTillampa(r, ater);                                   // Undo av Remove photo 1
  assert.deepEqual([tal(r, 'Swamp'), fotoAv(r, 'Swamp')], [2, { [F3]: 1, [F1]: 1 }]);
  r = lekSlagTillampa(r, [fb(F1)]);                               // Remove photo 1 igen
  assert.deepEqual([tal(r, 'Swamp'), fotoAv(r, 'Swamp')], [1, { [F3]: 1 }], 'foto 3:s Swamp står kvar');
});
prov('invarianten över 3000 slumpade ändringar: summan i foto aldrig över n, och Remove + Undo direkt efter ger samma lek', () => {
  let s = 20260928;
  const slump = n => { s = (s * 1103515245 + 12345) % 2147483648; return s % n; };
  const kortL = [swamp, bolt, helix, mtn], fotonL = [F1, F1B, F2, F3];
  const bild = r => r.kort.map(k => `${k.n} ${k.name}${k.sb ? ' sb' : ''} ${JSON.stringify(Object.entries(k.foto || {}).sort())}`).sort();
  let r = { kort: [] };
  const angra = [];
  for (let i = 0; i < 3000; i++) {
    const k = kortL[slump(4)], fid = fotonL[slump(4)], v = slump(11);
    let ops;
    if (v < 3) ops = [ff(k, 1 + slump(3), fid)];
    else if (v < 5) ops = [{ typ: 'antal', name: k.name, sb: false, d: -(1 + slump(2)) }];
    else if (v < 6) ops = [{ typ: 'antal', name: k.name, sb: false, d: 1 + slump(2), kort: { ...k } }];
    else if (v < 7) ops = [{ typ: 'antal', name: k.name, sb: false, d: -1, foto: fid }];
    else if (v < 8) {
      const ater = lekSlagFotoTillbaka(r.kort, fid), efter = lekSlagTillampa(r, [fb(fid)]);
      assert.deepEqual(bild(lekSlagTillampa(efter, ater)), bild(r), `steg ${i}: Remove + Undo av ${fid}`);
      angra.push(ater); ops = [fb(fid)];
    } else if (v < 9 && angra.length) ops = angra.splice(slump(angra.length), 1)[0];
    else if (v < 10) ops = [{ typ: 'byt', name: k.name, sb: false, kort: { ...kortL[slump(4)] } }];
    else ops = [{ typ: 'sb', name: k.name, sb: !!slump(2), till: !!slump(2) }];
    r = lekSlagTillampa(r, ops);
    for (const x of r.kort) {
      const f = Object.values(x.foto || {}), sum = f.reduce((a, c) => a + c, 0);
      assert.ok(x.n >= 1 && sum <= x.n && f.every(c => Number.isInteger(c) && c > 0), `steg ${i}: ${x.n} ${x.name} ${JSON.stringify(x.foto)}`);
    }
  }
});
/* Retake av foto 1 (F1 → F1B): nya fotot läser 2 Swamp och Bolt, och den
   oläsliga är nu Mountain. Kön: det nya fotots tillägg, SIST fotobort(F1). */
const omtag = [ff(swamp, 2, F1B), ff(bolt, 1, F1B, { las: 'Lightnig Bolt', kalla: 'Photo 1' }), ff(mtn, 1, F1B), fb(F1)];
prov('Retake: det gamla fotots kort byts mot det nyas, inga dubbletter, foto 2 orört', () => {
  const r = lekSlagTillampa(tva(), omtag);
  assert.deepEqual(lista(r), ['1 Lightning Bolt', '1 Lightning Helix', '1 Mountain', '1 Sol Ring', '3 Swamp']);
  assert.deepEqual(fotoAv(r, 'Swamp'), { [F2]: 1, [F1B]: 2 });
  assert.ok(!r.kort.some(k => k.okand), 'den gamla platshållaren är borta');
});
prov('Retake: ett kort i båda fotona behåller sin rad och det man kollat (koll sätts inte om)', () => {
  const kollad = lekSlagTillampa(tva(), [{ typ: 'koll', name: 'Lightning Bolt', sb: false, koll: null }]);
  const r = lekSlagTillampa(kollad, omtag);
  const b = r.kort.find(k => k.name === 'Lightning Bolt');
  assert.equal(b.koll, undefined);
  assert.deepEqual([b.n, b.foto], [1, { [F1B]: 1 }], 'en Bolt, ur omtaget: det gamla fotots exemplar är borta');
});
prov('Retake: kön uppspelad två gånger på sin egen skrivning (klara) ger samma lek', () => {
  const ko = omtag.map((op, i) => medId(op, 'om' + i));
  const r1 = lekSlagTillampa(tva(), ko);
  assert.deepEqual(lista(r1), ['1 Lightning Bolt', '1 Lightning Helix', '1 Mountain', '1 Sol Ring', '3 Swamp'], 'omtaget ersatte foto 1');
  const skriven = Object.assign({}, r1, { klara: lekSlagKlaraEfter({}, ko) });
  assert.deepEqual(lista(lekSlagTillampa(skriven, ko)), lista(r1));
});
prov('Retake i konflikt: datorn tog bort foto 1 under tiden — bara det nya fotots kort, inget dubbelt', () => {
  const r = lekSlagTillampa(lekSlagTillampa(tva(), [fb(F1)]), omtag);
  assert.deepEqual(lista(r), ['1 Lightning Bolt', '1 Lightning Helix', '1 Mountain', '1 Sol Ring', '3 Swamp']);
});
prov('Undo av Retake: gamla fotots rader tillbaka och SIST det nyas bort ger leken före omtaget', () => {
  const fore = tva();
  const r = lekSlagTillampa(lekSlagTillampa(fore, omtag), [...lekSlagFotoTillbaka(fore.kort, F1), fb(F1B)]);
  assert.deepEqual(lista(r), lista(fore));
  assert.deepEqual(lekSlagFotoAv(r.kort), lekSlagFotoAv(fore.kort));
});
prov('konflikt: en annan enhet lade ett exemplar ur foto 3 under tiden — fotobort(1) tar bara foto 1:s', () => {
  const nyare = lekSlagTillampa(tva(), [ff(bolt, 1, F3)]);
  const r = lekSlagTillampa(nyare, [fb(F1)]);
  assert.equal(tal(r, 'Lightning Bolt'), 1);
  assert.deepEqual(fotoAv(r, 'Lightning Bolt'), { [F3]: 1 });
});
prov('en äldre rad med dubbletter: fotona läggs ihop när raderna slås ihop', () => {
  const r = lekSlagTillampa({ kort: [{ ...swamp, n: 1, foto: { [F1]: 1 } }, { ...swamp, n: 2, foto: { [F1]: 1, [F2]: 1 } }] }, []);
  assert.deepEqual(lista(r), ['3 Swamp']);
  assert.deepEqual(fotoAv(r, 'Swamp'), { [F1]: 2, [F2]: 1 });
});
prov('foto: raden ändras inte av uppspelningen, och skräp i fältet städas bort', () => {
  const bas = { kort: [{ ...swamp, n: 2, foto: { [F1]: 2, x: 0, y: -1, z: 'a' } }] };
  const fore = JSON.stringify(bas);
  const r = lekSlagTillampa(bas, [ff(swamp, 1, F2), fb(F1), ff(swamp, -1, F2)]);
  assert.equal(JSON.stringify(bas), fore);
  assert.equal(tal(r, 'Swamp'), 0);
  const s = lekSlagTillampa(bas, []);
  assert.deepEqual(fotoAv(s, 'Swamp'), { [F1]: 2 });
});
prov('lekSlagFotoNr: numret ur fid', () => {
  assert.deepEqual([F1, F2, '12:x', 'x', '', null].map(lekSlagFotoNr), [1, 2, 12, 0, 0, 0]);
});

/* ── MES-324: "One Swamp or two?" i leken (typ 'dubbel'), och fotobort fäller frågan ── */
const dubbelKoll = (o = {}) => Object.assign({ las: 'Swamp', kalla: 'Photo 2', sakert: 1, dubbel: Object.assign({ fid: F1, nr: 1, ny: F2, n: 1 }, o) });
const fraga = (o = {}) => ({ kort: [{ ...swamp, n: 2, foto: { [F1]: 1, [F2]: 1 }, koll: dubbelKoll(o) }] });
const F2B = '2:eeeee';
const en = { typ: 'dubbel', name: 'Swamp', sb: false, svar: 'en' }, svTva = { typ: 'dubbel', name: 'Swamp', sb: false, svar: 'tva' };
prov('dubbel svar en: ett exemplar ur fotot frågan kom ur, frågan borta; en gång till (annat id) gör ingenting', () => {
  let r = lekSlagTillampa(fraga(), [medId(en, 'a1')]);
  assert.deepEqual([tal(r, 'Swamp'), fotoAv(r, 'Swamp'), r.kort[0].koll], [1, { [F1]: 1 }, undefined]);
  r = lekSlagTillampa(r, [medId(en, 'b1')]);                          // en annan flik, innan den såg den förstas skrivning
  assert.deepEqual([tal(r, 'Swamp'), fotoAv(r, 'Swamp')], [1, { [F1]: 1 }], 'två flikar som trycker One tar ett exemplar, inte två');
  const bada = lekSlagTillampa(fraga(), [medId(en, 'a1'), medId(en, 'b1')]);
  assert.equal(tal(bada, 'Swamp'), 1);
});
prov('dubbel svar tva: båda står kvar, frågan borta; en fråga om två exemplar räknas ned ett svar i taget', () => {
  let r = lekSlagTillampa(fraga(), [svTva]);
  assert.deepEqual([tal(r, 'Swamp'), fotoAv(r, 'Swamp'), r.kort[0].koll], [2, { [F1]: 1, [F2]: 1 }, undefined]);
  r = lekSlagTillampa({ kort: [{ ...swamp, n: 3, foto: { [F1]: 1, [F2]: 2 }, koll: dubbelKoll({ n: 2 }) }] }, [en]);
  assert.deepEqual([tal(r, 'Swamp'), r.kort[0].koll.dubbel.n], [2, 1]);
  r = lekSlagTillampa(r, [svTva]);
  assert.deepEqual([tal(r, 'Swamp'), r.kort[0].koll], [2, undefined]);
});
prov('dubbel svar en tar aldrig det enda exemplaret, och inte ett som fotot frågan kom ur inte har', () => {
  let r = lekSlagTillampa({ kort: [{ ...swamp, n: 1, foto: { [F1]: 1 }, koll: dubbelKoll() }] }, [en]);
  assert.deepEqual([tal(r, 'Swamp'), r.kort[0].koll], [1, undefined], 'frågan faller, kortet står kvar');
  r = lekSlagTillampa({ kort: [{ ...swamp, n: 2, foto: { [F1]: 2 }, koll: dubbelKoll() }] }, [en]);
  assert.deepEqual([tal(r, 'Swamp'), r.kort[0].koll], [2, undefined], 'foto 2 har inget exemplar på raden: inget dras');
  /* Utan sakert (frågan om namnet är kvar) faller bara dubbel. */
  r = lekSlagTillampa({ kort: [{ ...swamp, n: 2, foto: { [F1]: 1, [F2]: 1 }, koll: { las: 'Swmp', kalla: 'Photo 1', dubbel: { fid: F1, nr: 1, ny: F2, n: 1 } } }] }, [svTva]);
  assert.deepEqual([r.kort[0].koll.las, r.kort[0].koll.dubbel], ['Swmp', undefined]);
});
prov('dubbel satt: på raden som den ligger — mallen utan fråga, ovanpå en fråga om namnet, och i stället för en äldre dubbel (aldrig ihop)', () => {
  const satt = n => ({ typ: 'dubbel', name: 'Swamp', sb: false, satt: { fid: F1, nr: 1, ny: F3, n, remsa: 'r1' }, koll: { las: 'Swamp', kalla: 'Photo 3', sakert: 1, remsa: 'r3' } });
  let r = lekSlagTillampa({ kort: [{ ...swamp, n: 2, foto: { [F1]: 1, [F3]: 1 } }] }, [satt(1)]);
  assert.deepEqual(r.kort[0].koll, { las: 'Swamp', kalla: 'Photo 3', sakert: 1, remsa: 'r3', dubbel: { fid: F1, nr: 1, ny: F3, n: 1, remsa: 'r1' } });
  r = lekSlagTillampa({ kort: [{ ...swamp, n: 2, foto: { [F1]: 1, [F3]: 1 }, koll: { las: 'Swmp', kalla: 'Photo 1' } }] }, [satt(1)]);
  assert.deepEqual([r.kort[0].koll.las, r.kort[0].koll.sakert, r.kort[0].koll.dubbel.n], ['Swmp', undefined, 1], 'namnet frågas först: sakert sätts inte');
  r = lekSlagTillampa(fraga({ n: 1, ny: F2 }), [satt(1)]);
  assert.deepEqual([r.kort[0].koll.dubbel.n, r.kort[0].koll.dubbel.ny], [1, F3], 'en äldre fråga byts, talen läggs inte ihop');
  assert.equal(lekSlagTillampa({ kort: [] }, [satt(1)]).kort.length, 0, 'ingen rad: ingenting');
});
prov('fotobort på ett av frågans foton fäller frågan: One kan inte ta det enda exemplaret efter Retake eller Remove photo', () => {
  /* Retake photo 2 utan kantkortet: nya fotots kort, sist fotobort(F2). */
  let r = lekSlagTillampa(fraga(), [ff(mtn, 1, F2B), fb(F2)]);
  assert.deepEqual([tal(r, 'Swamp'), r.kort.find(k => k.name === 'Swamp').koll], [1, undefined]);
  r = lekSlagTillampa(r, [en]);
  assert.equal(tal(r, 'Swamp'), 1, 'One efteråt gör ingenting');
  /* Remove photo 1 (det tidigare fotot) fäller den också. */
  r = lekSlagTillampa(fraga(), [fb(F1)]);
  assert.deepEqual([tal(r, 'Swamp'), r.kort[0].koll], [1, undefined]);
  /* Ett tredje foto tas bort: frågan står kvar. */
  r = lekSlagTillampa(fraga(), [fb(F3)]);
  assert.ok(r.kort[0].koll && r.kort[0].koll.dubbel);
  /* Utan sakert faller bara dubbel. */
  r = lekSlagTillampa({ kort: [{ ...swamp, n: 2, foto: { [F1]: 1, [F2]: 1 }, koll: { las: 'Swmp', kalla: 'Photo 1', dubbel: { fid: F1, nr: 1, ny: F2, n: 1 } } }] }, [fb(F2)]);
  assert.deepEqual([tal(r, 'Swamp'), r.kort[0].koll.las, r.kort[0].koll.dubbel], [1, 'Swmp', undefined]);
});

for (const r of [...ok, ...fel]) console.log(r);
console.log(`\nlekslag: ${ok.length} OK, ${fel.length} FEL`);
process.exit(fel.length ? 1 : 0);

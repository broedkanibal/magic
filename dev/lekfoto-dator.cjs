#!/usr/bin/env node
/* Datorns del av lekfotot (MES-322) provad utan webbläsare.

   Klipper ut blocket LEKFOTO PÅ DATORN ur index.html (och LEKSLAG, som
   ändringarna spelas upp med) och provar det sida M säger:

     - panelens texter, ordagrant: N1 innan telefonen kopplats, N2 innan
       första fotot, N3 efter ett foto, N4 medan ett foto läses
     - fotoraderna och deras nummer, som telefonen säger dem
     - Finish the deck: bara när ett foto landat, aldrig efter att den tryckts
     - namnen att kolla nämns bara medan man fotar (N3)
     - inga tankstreck (—) och inga "Step x of y" i det panelen säger

     node dev/lekfoto-dator.cjs        provet mot index.html (ingår i dev/kolla.sh)

   Slutar med "lekfoto-dator: N OK, M FEL" och slutkod 1 om något faller.
   .cjs eftersom package.json säger "type": "module". */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const FIL = path.join(__dirname, '..', 'index.html');

const skarUr = (src, namn) => (fran, till) => {
  const a = src.indexOf(fran), b = src.indexOf(till, a);
  if (a < 0 || b < 0) throw new Error(`hittar inte "${fran}" … "${till}" i ${namn}`);
  return src.slice(a, b);
};
function ladda(fil) {
  const src = fs.readFileSync(fil, 'utf8'), skar = skarUr(src, fil);
  const kod = [
    skar('/* ══ BLOCK: LEKSLAG', '/* ══ SLUT: LEKSLAG ══ */'),
    skar('/* ══ BLOCK: LEKFOTO PÅ DATORN', '/* ══ SLUT: LEKFOTO PÅ DATORN ══ */'),
  ].join('\n');
  const namn = [...kod.matchAll(/^(?:function|const|let)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
  return new Function(kod + `\nreturn { ${[...new Set(namn)].join(', ')} };`)();
}
const app = ladda(FIL);

let ok = 0, fel = 0;
function fall(namn, fn) {
  try { fn(); ok++; console.log('OK   ' + namn); }
  catch (e) { fel++; console.log('FEL  ' + namn + '\n     ' + String((e && e.message) || e).split('\n').join('\n     ')); }
}
const tel = o => Object.assign({ ansluten: true, fas: 'lagg', foto: 1, foton: [], klar: false }, o);
/* Allt panelen kan säga i ett läge, som en sträng: för reglerna om copy. */
const allText = t => {
  const l = app.lfLage(t), rader = app.lfRader(t);
  return [l.rub, l.txt, l.vantar, l.nasta, ...rader.flatMap(r => [r.rub, r.txt])].filter(Boolean).join(' | ');
};

/* ── rad 1: N1 och N2 ── */
fall('N1 innan telefonen kopplats: Connect your phone, ordagrant', () => {
  const l = app.lfLage(tel({ ansluten: false, fas: 'vantar' }));
  assert.strictEqual(l.typ, 'koppla');
  assert.strictEqual(l.rub, 'Connect your phone');
  assert.strictEqual(l.txt, 'Scan the code with your phone’s camera. Nothing to install. Your phone becomes the camera, and the cards land here.');
  assert.strictEqual(l.vantar, 'Waiting for your phone');
  assert.strictEqual(l.nasta, 'Next: lay out the cards and take the photos.');
  assert.strictEqual(app.lfKanAvsluta(tel({ ansluten: false })), false, 'ingen Finish the deck i N1');
});
fall('N2 kopplad, inget foto än: Lay out 10–15 cards at a time, Waiting for photo 1', () => {
  const l = app.lfLage(tel());
  assert.strictEqual(l.rub, 'Lay out 10–15 cards at a time');
  assert.strictEqual(l.txt, 'In columns, overlapping, so each name shows. Then take the photo with your phone. Basic lands can be in the photo or not.');
  assert.strictEqual(l.vantar, 'Waiting for photo 1');
  assert.strictEqual(app.lfRader(tel()).length, 0);
  assert.strictEqual(app.lfKanAvsluta(tel()), false, 'ingen Finish the deck innan ett foto landat (N2)');
});

/* ── rad 4: N3 och N4 ── */
fall('N3 efter foto 2: två rader, nästa foto är 3, Finish the deck står där', () => {
  const t = tel({ foto: 3, foton: [{ nr: 1, nya: 12, koll: 0 }, { nr: 2, nya: 12, koll: 1 }] });
  const r = app.lfRader(t);
  assert.deepStrictEqual(r.map(x => [x.rub, x.txt]), [['Photo 1', '12 cards added'], ['Photo 2', '12 cards added · 1 name to check']]);
  const l = app.lfLage(t);
  assert.strictEqual(l.rub, 'Lay out the next 10–15 cards');
  assert.strictEqual(l.txt, 'Move the photographed cards aside first, then take photo 3.');
  assert.strictEqual(l.vantar, 'Waiting for photo 3');
  assert.strictEqual(app.lfKanAvsluta(t), true);
});
fall('fotoraden räknar rätt i singular och plural', () => {
  assert.strictEqual(app.lfFotoRad({ nr: 4, nya: 1, koll: 0 }).txt, '1 card added');
  assert.strictEqual(app.lfFotoRad({ nr: 4, nya: 9, koll: 2 }).txt, '9 cards added · 2 names to check');
});
fall('N4 medan foto 5 läses: raden pulserar, rubriken säger det, inget "Waiting for"', () => {
  const t = tel({ fas: 'laser', foto: 5, foton: [{ nr: 1, nya: 12, koll: 0 }] });
  const r = app.lfRader(t);
  assert.deepStrictEqual(r[r.length - 1], { typ: 'las', rub: 'Photo 5', txt: 'Reading, about half a minute' });
  const l = app.lfLage(t);
  assert.strictEqual(l.rub, 'Photo 5 is being read');
  assert.strictEqual(l.txt, 'The cards land on the right when it’s done.');
  assert.ok(!l.vantar);
  assert.strictEqual(app.lfKanAvsluta(t), true, 'Finish the deck står kvar medan ett foto läses (N4)');
});
fall('numren följer telefonen: ett foto som redan landat läses inte som en till rad', () => {
  const t = tel({ fas: 'laser', foto: 2, foton: [{ nr: 1, nya: 3, koll: 0 }, { nr: 2, nya: 4, koll: 0 }] });
  assert.strictEqual(app.lfRader(t).length, 2);
});
fall('Finish the deck: borta när den tryckts', () => {
  assert.strictEqual(app.lfKanAvsluta(tel({ klar: true, foton: [{ nr: 1, nya: 3, koll: 0 }] })), false);
});

/* ── N3: namnen att kolla nämns bara ── */
fall('N3: "1 name to check" / "You check it when you finish the deck."', () => {
  assert.deepStrictEqual(app.lfKollText(1), { rub: '1 name to check', txt: 'You check it when you finish the deck.' });
  assert.deepStrictEqual(app.lfKollText(3), { rub: '3 names to check', txt: 'You check them when you finish the deck.' });
  assert.strictEqual(app.lfKollText(0), null);
});

/* ── reglerna för copy (MES-320) ── */
fall('inga tankstreck och inga "Step x of y" i något panelen säger', () => {
  const lagen = [
    tel({ ansluten: false }), tel(), tel({ fas: 'kamera' }), tel({ fas: 'laser' }),
    tel({ foto: 3, foton: [{ nr: 1, nya: 12, koll: 0 }, { nr: 2, nya: 1, koll: 1 }] }),
    tel({ fas: 'laser', foto: 5, foton: [{ nr: 1, nya: 12, koll: 0 }] }),
  ];
  for (const t of lagen) {
    const s = allText(t);
    assert.ok(!/—/.test(s), 'tankstreck i: ' + s);
    assert.ok(!/step \d+ of \d+/i.test(s), '"Step x of y" i: ' + s);
    assert.ok(!/about 30|30 cards/i.test(s), 'det gamla "about 30" i: ' + s);
  }
  const k = app.lfKollText(2);
  assert.ok(!/—/.test(k.rub + k.txt));
});

console.log(`\nlekfoto-dator: ${ok} OK, ${fel} FEL`);
process.exit(fel ? 1 : 0);

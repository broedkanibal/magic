#!/usr/bin/env node
/* Datorns del av lekfotot (MES-322) provad utan webbläsare.

   Klipper ut blocket LEKFOTO PÅ DATORN ur index.html och LEKSLAG (som
   ändringarna spelas upp med) och provar det sida M och formatet vid BLOCK:
   LEKKANALEN (MES-321) säger:

     A  panelens texter, ordagrant: N1, N2, N3, IP1, N4, N6, J9, J10
     B  numren följer telefonen: nästa foto = 1 + högsta nr bland fotona som
        inte är borttagna eller ersatta; ett foto utan kort behåller sitt
     C  Undo gäller tills nästa foto landar, en gång, och överlever en
        omladdning (posten sparas som JSON)
     D  Remove photo, Retake och Undo mot leken: inget kort räknas två gånger
        och inget försvinner — också om Undo trycks två gånger, om nästa foto
        landar under tiden, om sidan laddas om mitt i, om ett kort bytt namn
        eller fått exemplar från en annan enhet

   D kräver att LEKSLAG vet vilket foto ett exemplar kom ur (foto, fotobort,
   lekSlagFotoTillbaka; MES-321). Saknas det i filen hoppas D över, och det
   står i slutraden: kör då mot en index.html som har det (--mot).

     node dev/lekfoto-dator.cjs              provet mot index.html (ingår i dev/kolla.sh)
     node dev/lekfoto-dator.cjs --mot <fil>  samma prov mot en annan index.html

   Slutar med "lekfoto-dator: N OK, M FEL" (och hur många som hoppades över)
   och slutkod 1 om något faller. .cjs eftersom package.json säger "type": "module". */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const FIL = arg('--mot', path.join(__dirname, '..', 'index.html'));

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
  const namn = [...kod.matchAll(/^(?:async\s+)?(?:function|const|let)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
  return new Function(kod + `\nreturn { ${[...new Set(namn)].join(', ')} };`)();
}
const app = ladda(FIL);
const STOD = typeof app.lekSlagFotoTillbaka === 'function';

let ok = 0, fel = 0, over = 0;
function fall(namn, fn) {
  try { fn(); ok++; console.log('OK   ' + namn); }
  catch (e) { fel++; console.log('FEL  ' + namn + '\n     ' + String((e && e.stack) || e).split('\n').slice(0, 6).join('\n     ')); }
}
/* D-fallen: bara där LEKSLAG kan det. */
function fallD(namn, fn) {
  if (!STOD) { over++; console.log('--   ' + namn + ' (hoppas över: LEKSLAG utan foto)'); return; }
  fall(namn, fn);
}

/* ── hjälp ── */
let idN = 0;
const id = () => 'op' + (++idN);
const nyTel = (o = {}) => Object.assign({ ansluten: true, fas: 'lagg', foto: 1, fid: null, ersatter: null, klar: false, seddN: 0,
  foton: new Map(), bilder: new Map(), lokal: new Map(), undo: new Map(), mallar: new Map(), arKort: new Set() }, o);
let sedd = 0;
function foto(t, fid, lage, o = {}) {
  const f = Object.assign({ fid, nr: parseInt(fid, 10), lage, hittade: 0, kanda: 0, koll: 0, okanda: 0, olasta: 0, kort: [] }, o);
  f.sedd = (t.foton.get(fid) || {}).sedd || ++sedd;
  t.foton.set(fid, f);
  return f;
}
const kortLista = (namn, o = {}) => namn.map(n => Object.assign({ name: n, las: n, x: 500, y: 500 }, o));
const rader = t => app.lfRader(t).map(r => [r.rub, r.txt, r.angra ? 'Undo' : r.visa ? 'View' : '']);
const allText = t => {
  const l = app.lfLage(t), r = app.lfRader(t);
  return [l.rub, l.txt, l.vantar, l.nasta, l.not, ...r.flatMap(x => [x.rub, x.txt])].filter(Boolean).join(' | ');
};
/* Leken som servern (decks) har den: raden med kort och klara. spara är
   lekSparaKo:s kärna — kön spelas upp på raden, och ändringar vars id redan
   ligger i klara hoppas över. */
const K = (name, o = {}) => Object.assign({ name, sid: 's-' + name.toLowerCase().replace(/\W+/g, ''), small: null }, o);
function lek(kort = []) { return { kort, klara: [] }; }
function spara(rad, ops) {
  const v = app.lekSlagTillampa(rad, ops);
  return { kort: v.kort, klara: app.lekSlagKlaraEfter(rad, ops) };
}
/* Ett foto som telefonen sparar: ett antal-tillägg per exemplar med foto. */
function fotoOps(fid, namn, o = {}) {
  return namn.map(n => ({ typ: 'antal', name: n, sb: false, d: 1, kort: K(n, o[n] || {}), foto: fid, id: id() }));
}
const antal = rad => Object.fromEntries(app.lekSlagTillampa(rad, []).kort.map(k => [k.name, k.n]));
const summa = rad => app.lekSlagTillampa(rad, []).kort.reduce((s, k) => s + k.n, 0);
const klara = rad => new Set(rad.klara);

/* ── A: texterna ─────────────────────────────────────────────────── */
fall('N1 innan telefonen kopplats: Connect your phone, ordagrant', () => {
  const l = app.lfLage(nyTel({ ansluten: false, fas: 'vantar' }));
  assert.strictEqual(l.typ, 'koppla');
  assert.strictEqual(l.rub, 'Connect your phone');
  assert.strictEqual(l.txt, 'Scan the code with your phone’s camera. Nothing to install. Your phone becomes the camera, and the cards land here.');
  assert.strictEqual(l.vantar, 'Waiting for your phone');
  assert.strictEqual(l.nasta, 'Next: lay out the cards and take the photos.');
  assert.strictEqual(app.lfKanAvsluta(nyTel({ ansluten: false })), false, 'ingen Finish the deck i N1');
});
fall('N2 kopplad, inget foto än: Lay out 10–15 cards at a time, Waiting for photo 1', () => {
  const l = app.lfLage(nyTel());
  assert.strictEqual(l.rub, 'Lay out 10–15 cards at a time');
  assert.strictEqual(l.txt, 'In columns, overlapping, so each name shows. Then take the photo with your phone. Basic lands can be in the photo or not.');
  assert.strictEqual(l.vantar, 'Waiting for photo 1');
  assert.strictEqual(app.lfRader(nyTel()).length, 0);
  assert.strictEqual(app.lfKanAvsluta(nyTel()), false, 'ingen Finish the deck innan ett foto landat');
});
fall('N3 efter foto 2: raderna, "then take photo 3", Finish the deck', () => {
  const t = nyTel();
  foto(t, '1:a', 'klar', { hittade: 12, kort: kortLista(Array.from({ length: 12 }, (_, i) => 'K' + i)) });
  foto(t, '2:b', 'klar', { hittade: 12, kort: [...kortLista(Array.from({ length: 11 }, (_, i) => 'L' + i)), { name: 'Gorgon Flail', las: 'Gorgon Fail', koll: true, x: 1, y: 1 }] });
  assert.deepStrictEqual(rader(t), [['Photo 1', '12 cards added', 'View'], ['Photo 2', '12 cards added · 1 name to check', 'View']]);
  const l = app.lfLage(t);
  assert.strictEqual(l.rub, 'Lay out the next 10–15 cards');
  assert.strictEqual(l.txt, 'Move the photographed cards aside first, then take photo 3.');
  assert.strictEqual(l.vantar, 'Waiting for photo 3');
  assert.strictEqual(app.lfKanAvsluta(t), true);
});
fall('IP1: "9 cards added · 1 name to check · some not read" och "The cards you put aside are typed in at the end."', () => {
  const t = nyTel();
  foto(t, '1:a', 'klar', { hittade: 12, kort: kortLista(Array.from({ length: 12 }, (_, i) => 'K' + i)) });
  foto(t, '2:b', 'klar', { hittade: 9, olasta: 3, kort: [...kortLista(Array.from({ length: 8 }, (_, i) => 'L' + i)), { name: 'X', las: 'Xx', koll: true }] });
  assert.deepStrictEqual(rader(t)[1], ['Photo 2', '9 cards added · 1 name to check · some not read', 'View']);
  assert.strictEqual(app.lfLage(t).txt, 'Move the photographed cards aside first, then take photo 3. The cards you put aside are typed in at the end.');
});
fall('N4: foton utan kort nedtonade, "names to pick", och fotot som läses', () => {
  const t = nyTel({ fas: 'laser', fid: '5:e', foto: 5 });
  foto(t, '1:a', 'klar', { hittade: 12, kort: kortLista(Array.from({ length: 12 }, (_, i) => 'K' + i)) });
  const plock = Array.from({ length: 12 }, (_, i) => ({ name: 'Unreadable card u' + i, las: '', okand: true, koll: true }));
  foto(t, '2:b', 'klar', { hittade: 30, manga: true, behall: true, kort: [...kortLista(Array.from({ length: 18 }, (_, i) => 'L' + i)), ...plock] });
  foto(t, '3:c', 'inga', { undan: true });
  foto(t, '4:d', 'inganamn', { poster: 6, undan: true });
  foto(t, '5:e', 'laser');
  assert.deepStrictEqual(rader(t), [
    ['Photo 1', '12 cards added', 'View'],
    ['Photo 2', '18 cards added · 12 names to pick when you’re done', 'View'],
    ['Photo 3', 'No cards found. Nothing added.', 'View'],
    ['Photo 4', '6 cards, no names read. Nothing added.', 'View'],
    ['Photo 5', 'Reading, about half a minute', ''],
  ]);
  assert.deepStrictEqual(app.lfRader(t).map(r => r.typ), ['klar', 'klar', 'tom', 'tom', 'las']);
  const l = app.lfLage(t);
  assert.strictEqual(l.rub, 'Photo 5 is being read');
  assert.strictEqual(l.txt, 'The cards land on the right when it’s done. Photos 3 and 4 were retaken on the phone, or their cards put aside.');
  assert.ok(!l.vantar);
  assert.strictEqual(app.lfKanAvsluta(t), true, 'Finish the deck står kvar medan ett foto läses (N4)');
});
fall('N4: ett foto som läses men bara sagts med laser får ändå sin rad', () => {
  const t = nyTel({ fas: 'laser', fid: '2:x', foto: 2 });
  foto(t, '1:a', 'klar', { hittade: 3, kort: kortLista(['A', 'B', 'C']) });
  assert.deepStrictEqual(rader(t)[1], ['Photo 2', 'Reading, about half a minute', '']);
});
fall('N6 efter Remove photo 2: raden med Undo, "take photo 2 again", Waiting for photo 2', () => {
  const t = nyTel();
  foto(t, '1:a', 'klar', { hittade: 12 });
  foto(t, '2:b', 'klar', { hittade: 12 });
  t.lokal.set('2:b', 'bort');
  t.undo.set('2:b', { typ: 'bort', fid: '2:b', ops: [{ typ: 'antal', d: 12, id: 'u1' }], antal: 12, efter: ['1:a', '2:b'], krav: [] });
  assert.deepStrictEqual(rader(t), [['Photo 1', '12 cards added', 'View'], ['Photo 2', 'Removed, with its 12 cards', 'Undo']]);
  const l = app.lfLage(t);
  assert.strictEqual(l.rub, 'Lay out the next 10–15 cards');
  assert.strictEqual(l.txt, 'Move the photographed cards aside first, then take photo 2 again.');
  assert.strictEqual(l.vantar, 'Waiting for photo 2');
  assert.strictEqual(app.lfKanAvsluta(t), true);
});
fall('J9 medan foto 1 tas om: raden, rubriken, ingen Finish the deck', () => {
  const t = nyTel({ fas: 'kamera', fid: '1:z', ersatter: '1:a', foto: 1 });
  foto(t, '1:a', 'klar', { hittade: 9 });
  foto(t, '2:b', 'klar', { hittade: 12 });
  assert.deepStrictEqual(rader(t), [['Photo 1 · retaking', 'Its 9 cards stay until the new photo is in, then they’re replaced.', ''], ['Photo 2', '12 cards added', 'View']]);
  const l = app.lfLage(t);
  assert.strictEqual(l.rub, 'Retaking photo 1 on the phone');
  assert.strictEqual(l.txt, 'Nothing to do here. The deck updates by itself when the new photo is read.');
  assert.strictEqual(l.vantar, 'Waiting for the new photo 1');
  assert.strictEqual(app.lfKanAvsluta(t), false, 'J9 har ingen Finish the deck');
  /* Omtaget läses: fortfarande J9, inte en egen rad. */
  t.fas = 'laser';
  foto(t, '1:z', 'laser', { ersatter: '1:a' });
  assert.strictEqual(app.lfRader(t).length, 2);
  assert.strictEqual(app.lfLage(t).rub, 'Retaking photo 1 on the phone');
});
fall('J10 efter omtaget: "12 cards, replacing 9" med Undo, "Then take photo 3", noten', () => {
  const t = nyTel();
  foto(t, '1:a', 'ersatt', { hittade: 9 });
  foto(t, '2:b', 'klar', { hittade: 12 });
  foto(t, '1:z', 'klar', { hittade: 12, ersatter: '1:a' });
  t.undo.set('1:z', { typ: 'omtag', fid: '1:z', ny: '1:z', gammal: '1:a', ops: [], antal: 9, efter: ['2:b', '1:z'], krav: [] });
  assert.deepStrictEqual(rader(t), [['Photo 1 · retaken', '12 cards, replacing 9', 'Undo'], ['Photo 2', '12 cards added', 'View']]);
  const l = app.lfLage(t);
  assert.strictEqual(l.rub, 'Lay out the next 10–15 cards');
  assert.strictEqual(l.txt, 'Then take photo 3 with your phone.');
  assert.strictEqual(l.vantar, 'Waiting for photo 3');
  assert.strictEqual(l.not, 'Undo brings back the 9 cards from the first try. Names you already checked for cards that are in both photos are kept.');
  assert.strictEqual(app.lfKanAvsluta(t), true);
});
fall('N3: "1 name to check" / "You check it when you finish the deck."', () => {
  assert.deepStrictEqual(app.lfKollText(1), { rub: '1 name to check', txt: 'You check it when you finish the deck.' });
  assert.deepStrictEqual(app.lfKollText(3), { rub: '3 names to check', txt: 'You check them when you finish the deck.' });
  assert.strictEqual(app.lfKollText(0), null);
});
fall('singular: 1 card, 1 name, "Its 1 card stays"', () => {
  assert.strictEqual(app.lfKlarText({ hittade: 1, kort: [{ name: 'A', koll: true }] }), '1 card added · 1 name to check');
  assert.strictEqual(app.lfTomText({ lage: 'inganamn', poster: 1 }), '1 card, no name read. Nothing added.');
  const t = nyTel({ fas: 'kamera', ersatter: '1:a' });
  foto(t, '1:a', 'klar', { hittade: 1 });
  assert.strictEqual(app.lfRader(t)[0].txt, 'Its 1 card stays until the new photo is in, then it’s replaced.');
});
fall('ett foto som väntar på telefonen (ejskickat, ejsparat, av, borta) har ingen rad; ett ersatt inte heller', () => {
  const t = nyTel();
  foto(t, '1:a', 'klar', { hittade: 3 });
  for (const [i, lage] of ['ejskickat', 'ejsparat', 'av', 'borta', 'ersatt'].entries()) foto(t, `${i + 2}:x${i}`, lage, { hittade: 4 });
  assert.deepStrictEqual(app.lfRader(t).map(r => r.nr), [1]);
});
fall('en äldre telefon utan fotoposterna: raden ur sparad (nya, koll)', () => {
  const t = nyTel();
  foto(t, 'sparad:1', 'klar', { nr: 1, hittade: undefined, kort: undefined, nya: 5, koll: 1, fran: 'sparad' });
  assert.deepStrictEqual(rader(t)[0].slice(0, 2), ['Photo 1', '5 cards added · 1 name to check']);
});
fall('inga tankstreck och inga "Step x of y" i något panelen säger', () => {
  const lagen = [];
  lagen.push(nyTel({ ansluten: false }), nyTel(), nyTel({ fas: 'kamera' }), nyTel({ fas: 'laser' }));
  const t = nyTel({ fas: 'laser', foto: 3 });
  foto(t, '1:a', 'klar', { hittade: 2, olasta: 1, kort: [{ name: 'A', okand: true, koll: true }, { name: 'B', koll: true }] });
  foto(t, '2:b', 'inga');
  lagen.push(t);
  const u = nyTel({ fas: 'kamera', ersatter: '1:a' }); foto(u, '1:a', 'klar', { hittade: 4 }); lagen.push(u);
  for (const x of lagen) {
    const s = allText(x);
    assert.ok(!/—/.test(s), 'tankstreck i: ' + s);
    assert.ok(!/step \d+ of \d+/i.test(s), '"Step x of y" i: ' + s);
    assert.ok(!/about 30|30 cards at/i.test(s), 'det gamla "about 30" i: ' + s);
  }
});

/* ── B: numren ───────────────────────────────────────────────────── */
fall('numren följer telefonen: ett foto utan kort behåller sitt nummer', () => {
  const t = nyTel();
  foto(t, '1:a', 'klar'); foto(t, '2:b', 'inga');
  assert.strictEqual(app.lfNastaNr(t), 3);
});
fall('numret används igen efter Remove photo (N6), men inte efter ett foto i mitten', () => {
  const t = nyTel();
  foto(t, '1:a', 'klar'); foto(t, '2:b', 'bort');
  assert.strictEqual(app.lfNastaNr(t), 2);
  const u = nyTel();
  foto(u, '1:a', 'bort'); foto(u, '2:b', 'klar');
  assert.strictEqual(app.lfNastaNr(u), 3);
  const v = nyTel();
  foto(v, '1:a', 'klar');
  v.lokal.set('1:a', 'bort');                  // datorns egen borttagning, innan telefonen svarat
  assert.strictEqual(app.lfNastaNr(v), 1);
});
fall('ett omtag behåller numret: det ersatta räknas inte', () => {
  const t = nyTel();
  foto(t, '1:a', 'ersatt'); foto(t, '1:z', 'klar'); foto(t, '2:b', 'klar');
  assert.strictEqual(app.lfNastaNr(t), 3);
  assert.deepStrictEqual(app.lfRader(t).map(r => r.fid), ['1:z', '2:b']);
});
fall('utan fotoposter gäller telefonens nummer', () => {
  assert.strictEqual(app.lfNastaNr(nyTel({ foto: 4 })), 4);
});

fall('datorns eget läge: gäller tills telefonen säger samma sak, eller att fotot ersatts', () => {
  /* Det MES-321:s telefon visade (2026-09-28): Remove photo 1, Undo, sedan
     tas foto 1 om. Telefonen skickar inte om posten efter fotoater, så datorns
     "klar" måste släppa när telefonen säger att fotot ersatts (J10). */
  const t = nyTel();
  foto(t, '1:a', 'bort');
  t.lokal.set('1:a', 'klar');                                   // Undo på datorn
  app.lfLokalIn(t, '1:a', 'bort');                              // telefonens gamla post: står kvar
  assert.strictEqual(app.lfLageAv(t, t.foton.get('1:a')), 'klar');
  foto(t, '1:a', 'ersatt');
  app.lfLokalIn(t, '1:a', 'ersatt');                            // omtaget ersatte det: telefonens post gäller
  foto(t, '1:z', 'klar', { hittade: 3, ersatter: '1:a' });
  assert.strictEqual(app.lfLageAv(t, t.foton.get('1:a')), 'ersatt');
  assert.deepStrictEqual(app.lfRader(t).map(r => r.fid), ['1:z'], 'bara omtaget har en rad');
  const u = nyTel();
  foto(u, '2:b', 'klar'); u.lokal.set('2:b', 'bort');
  app.lfLokalIn(u, '2:b', 'bort');                              // telefonen säger samma: bekräftat
  assert.strictEqual(u.lokal.size, 0);
});
fall('granskningen fynd 8: en telefonpost som korsar datorns fotobort tar inte bort Undo', () => {
  const t = nyTel();
  foto(t, '1:a', 'klar'); foto(t, '2:b', 'klar', { hittade: 12 });
  t.lokal.set('2:b', 'bort');
  t.undo.set('2:b', { typ: 'bort', fid: '2:b', ops: [{ id: 'x', d: 12 }], antal: 12, efter: ['1:a'], krav: ['k'], sagt: true });
  app.lfHor(t, { typ: 'foto', foto: { fid: '2:b', nr: 2, lage: 'klar', hittade: 12, behall: true } });   // skickad innan telefonen fick fotobort
  assert.deepStrictEqual(rader(t)[1], ['Photo 2', 'Removed, with its 12 cards', 'Undo']);
  app.lfHor(t, { typ: 'foto', foto: { fid: '2:b', nr: 2, lage: 'bort', hittade: 12 } });                 // telefonen har fått det
  assert.strictEqual(t.lokal.size, 0);
  assert.deepStrictEqual(rader(t)[1], ['Photo 2', 'Removed, with its 12 cards', 'Undo']);
});
fall('kamera har inget fid: ingen fotorad förrän laser', () => {
  const t = nyTel({ fas: 'kamera', foto: 2, fid: null });
  foto(t, '1:a', 'klar', { hittade: 2 });
  assert.deepStrictEqual(app.lfRader(t).map(r => r.nr), [1]);
  assert.strictEqual(app.lfLage(t).vantar, 'Waiting for photo 2');
});

/* ── C: när Undo gäller ──────────────────────────────────────────── */
fall('Undo gäller tills nästa foto landar; ett foto med ett annat nummer som läses ändrar inget', () => {
  const t = nyTel();
  foto(t, '1:a', 'bort'); foto(t, '2:b', 'klar');
  const u = { typ: 'bort', fid: '1:a', ops: [], antal: 4, efter: ['1:a', '2:b'], krav: [] };
  t.undo.set('1:a', u);
  assert.strictEqual(app.lfUndoGiltig(t, u), true);
  foto(t, '3:c', 'laser');
  assert.strictEqual(app.lfUndoGiltig(t, u), true, 'foto 3 läses, numret 1 är ledigt');
  foto(t, '3:c', 'klar');
  assert.strictEqual(app.lfUndoGiltig(t, u), false, 'nästa foto landade');
  assert.ok(!rader(t).some(r => r[2] === 'Undo'));
});
fall('granskningen fynd 4 (G3): Undo gäller inte medan ett foto med samma nummer läses', () => {
  const t = nyTel();
  foto(t, '1:a', 'klar'); foto(t, '2:b', 'bort');
  const u = { typ: 'bort', fid: '2:b', ops: [], antal: 4, efter: ['1:a', '2:b'], krav: [] };
  t.undo.set('2:b', u);
  app.lfHor(t, { typ: 'laser', foto: 2, fid: '2:c' });
  assert.strictEqual(app.lfUndoGiltig(t, u), false, 'numret 2 används redan igen');
  assert.deepStrictEqual(rader(t).filter(r => r[0].startsWith('Photo 2')), [['Photo 2', 'Reading, about half a minute', '']]);
  const omt = nyTel();
  foto(omt, '1:a', 'ersatt'); foto(omt, '1:z', 'klar', { hittade: 2, ersatter: '1:a' });
  const v = { typ: 'omtag', fid: '1:z', ny: '1:z', gammal: '1:a', ops: [], antal: 2, efter: ['1:z'], krav: [] };
  omt.undo.set('1:z', v);
  app.lfHor(omt, { typ: 'laser', foto: 1, fid: '1:y', ersatter: '1:z' });
  assert.strictEqual(app.lfUndoGiltig(omt, v), false, 'omtaget tas om igen: J10:s Undo gäller inte');
});
fall('ett foto utan kort som landar gör också Undo ogiltigt; ett som väntar på telefonen gör det inte', () => {
  const t = nyTel();
  foto(t, '1:a', 'klar'); foto(t, '2:b', 'bort');
  const u = { typ: 'bort', fid: '2:b', ops: [], antal: 1, efter: ['1:a'], krav: [] };
  foto(t, '2:c', 'ejsparat');
  assert.strictEqual(app.lfUndoGiltig(t, u), true);
  foto(t, '2:c', 'inga');
  assert.strictEqual(app.lfUndoGiltig(t, u), false);
});
fall('Undo en gång: en använd post visas inte och gäller inte', () => {
  const t = nyTel();
  foto(t, '1:a', 'bort');
  const u = { typ: 'bort', fid: '1:a', ops: [], antal: 2, efter: [], krav: [], brukad: true };
  t.undo.set('1:a', u);
  assert.strictEqual(app.lfUndoGiltig(t, u), false);
  assert.strictEqual(app.lfRader(t).length, 0);
});
fall('en borttagen rad utan telefonens post (omladdning, telefonen borta) står kvar ur Undo-posten', () => {
  const t = nyTel();
  t.undo.set('3:q', { typ: 'bort', fid: '3:q', ops: [], antal: 5, efter: [], krav: [] });
  assert.deepStrictEqual(rader(t), [['Photo 3', 'Removed, with its 5 cards', 'Undo']]);
});
fall('lfStad: en borttagning som nått leken sägs till telefonen en gång; ett Undo som nått leken är klart', () => {
  const t = nyTel();
  t.undo.set('2:b', { typ: 'bort', fid: '2:b', ops: [{ id: 'a1' }, { id: 'a2' }], antal: 2, efter: [], krav: ['b1'] });
  assert.deepStrictEqual(app.lfStad(t, new Set([]), false).sag, [], 'inte innan leken bär den');
  const sag = app.lfStad(t, new Set(['b1']), false).sag;
  assert.deepStrictEqual(sag.map(m => [m.typ, m.fid, m.bort, m.ater.map(o => o.id)]), [['fotobort', '2:b', 'b1', ['a1', 'a2']]]);
  assert.deepStrictEqual(app.lfStad(t, new Set(['b1']), false).sag, [], 'en gång');
  t.undo.get('2:b').brukad = true;
  assert.deepStrictEqual(app.lfStad(t, new Set(['b1', 'a1']), false).sag, [], 'halva Undo i leken: vänta');
  assert.deepStrictEqual(app.lfStad(t, new Set(['b1', 'a1', 'a2']), false).sag, [{ typ: 'fotoater', fid: '2:b' }]);
  assert.strictEqual(t.undo.size, 0);
});
fall('lfStad vid omladdning: en borttagning som aldrig nådde leken faller; ett Undo som inte nådde den går att trycka igen', () => {
  const t = nyTel();
  t.undo.set('2:b', { typ: 'bort', fid: '2:b', ops: [{ id: 'a1' }], antal: 1, efter: [], krav: ['b1'] });
  t.undo.set('3:c', { typ: 'bort', fid: '3:c', ops: [{ id: 'c1' }], antal: 1, efter: [], krav: ['b3'], brukad: true, sagt: true });
  const r = app.lfStad(t, new Set(['b3']), true);
  assert.strictEqual(t.undo.has('2:b'), false, 'borttagningen nådde aldrig leken');
  assert.strictEqual(t.undo.get('3:c').brukad, false, 'Undo nådde inte leken: tryck igen');
  assert.strictEqual(r.andrat, true);
  const omtag = nyTel();
  omtag.undo.set('1:z', { typ: 'omtag', fid: '1:z', ny: '1:z', gammal: '1:a', ops: [{ id: 'o1' }, { id: 'o2' }], antal: 3, efter: [], krav: [], brukad: true });
  assert.deepStrictEqual(app.lfStad(omtag, new Set(['o1', 'o2']), true).sag, [{ typ: 'fotobort', fid: '1:z' }, { typ: 'fotoater', fid: '1:a' }]);
});

/* ── D: mot leken ────────────────────────────────────────────────── */
/* Tre foton: 1 = A B C (C osäker), 2 = C D D Swamp, handlagda: Swamp. */
function treFoton() {
  let rad = lek();
  rad = spara(rad, fotoOps('1:a', ['Alpha', 'Beta', 'Gamma'], { Gamma: { koll: { las: 'Gama', kalla: 'Photo 1' } } }));
  rad = spara(rad, fotoOps('2:b', ['Gamma', 'Delta', 'Delta', 'Swamp']));
  rad = spara(rad, [{ typ: 'antal', name: 'Swamp', sb: false, d: 1, kort: K('Swamp'), id: id() }]);
  const t = nyTel();
  foto(t, '1:a', 'klar', { hittade: 3 }); foto(t, '2:b', 'klar', { hittade: 4 });
  return { rad, t };
}
fallD('D1 Remove photo 2 och Undo: leken exakt som före, också To check', () => {
  const { rad: fore, t } = treFoton();
  const { ops, undo } = app.lfTaBort(t, app.lekSlagTillampa(fore, []).kort, '2:b', id);
  const efter = spara(fore, ops);
  assert.deepStrictEqual(antal(efter), { Alpha: 1, Beta: 1, Gamma: 1, Swamp: 1 }, 'fotots fyra ut, det handlagda Swamp kvar');
  assert.strictEqual(undo.antal, 4);
  t.undo.set('2:b', undo);
  assert.deepStrictEqual(app.lfStad(t, klara(fore), false).sag, [], 'telefonen får veta först när leken bär borttagningen');
  const sag = app.lfStad(t, klara(efter), false).sag;
  assert.deepStrictEqual(sag.map(m => [m.typ, m.fid, m.bort]), [['fotobort', '2:b', ops[0].id]]);
  assert.deepStrictEqual(sag[0].ater.map(o => o.id), undo.ops.map(o => o.id), 'Undo-ändringarna följer med, med sina id:n');
  const ater = spara(efter, undo.ops);
  assert.deepStrictEqual(antal(ater), antal(fore));
  const g = app.lekSlagTillampa(ater, []).kort.find(k => k.name === 'Gamma');
  assert.ok(g.koll, 'Gamma är fortfarande att kolla (foto 1:s osäkerhet)');
  assert.deepStrictEqual(g.foto, { '1:a': 1, '2:b': 1 }, 'exemplaren räknas till rätt foto igen');
});
fallD('D2 Undo två gånger: samma ändringar en gång till lägger inte in något', () => {
  const { rad: fore, t } = treFoton();
  const { ops, undo } = app.lfTaBort(t, app.lekSlagTillampa(fore, []).kort, '2:b', id);
  const efter = spara(fore, ops);
  t.undo.set('2:b', undo);
  const ett = spara(efter, undo.ops);
  undo.brukad = true;
  assert.strictEqual(app.lfUndoGiltig(t, undo), false, 'andra trycket släpps inte igenom');
  const tva = spara(ett, undo.ops);                       // om det ändå gick igenom (en omladdning mitt i)
  assert.deepStrictEqual(antal(tva), antal(fore));
  assert.strictEqual(summa(tva), summa(fore));
});
fallD('D3 nästa foto landar under tiden: Undo går ut, och det nya fotots kort rörs inte', () => {
  const { rad: fore, t } = treFoton();
  const { ops, undo } = app.lfTaBort(t, app.lekSlagTillampa(fore, []).kort, '2:b', id);
  let rad = spara(fore, ops);
  t.lokal.set('2:b', 'bort'); t.undo.set('2:b', undo);
  assert.strictEqual(app.lfUndoGiltig(t, undo), true);
  foto(t, '2:c', 'laser');
  assert.strictEqual(app.lfUndoGiltig(t, undo), false, 'medan nästa foto 2 läses används numret redan (fynd 4)');
  rad = spara(rad, fotoOps('2:c', ['Epsilon', 'Delta']));
  foto(t, '2:c', 'klar', { hittade: 2 });
  assert.strictEqual(app.lfUndoGiltig(t, undo), false, 'det nya fotot landade');
  assert.deepStrictEqual(antal(rad), { Alpha: 1, Beta: 1, Gamma: 1, Swamp: 1, Epsilon: 1, Delta: 1 });
});
fallD('D4 Undo medan nästa foto läses, sedan landar det: båda fotona räknas en gång', () => {
  const { rad: fore, t } = treFoton();
  const { ops, undo } = app.lfTaBort(t, app.lekSlagTillampa(fore, []).kort, '2:b', id);
  let rad = spara(fore, ops);
  foto(t, '3:c', 'laser');
  rad = spara(rad, undo.ops);                             // Undo
  rad = spara(rad, fotoOps('3:c', ['Delta']));             // nästa foto landar
  assert.deepStrictEqual(antal(rad), { Alpha: 1, Beta: 1, Gamma: 2, Delta: 3, Swamp: 2 });
});
fallD('D5 omladdning: posten som JSON; borttagningen nådde leken, Undo en gång efteråt', () => {
  const { rad: fore, t } = treFoton();
  const { ops, undo } = app.lfTaBort(t, app.lekSlagTillampa(fore, []).kort, '2:b', id);
  const efter = spara(fore, ops);
  const sparad = JSON.parse(JSON.stringify(undo));       // localStorage
  const t2 = nyTel({ ansluten: false });
  t2.undo.set('2:b', sparad);
  app.lfStad(t2, klara(efter), true);
  assert.ok(t2.undo.has('2:b'), 'Undo finns efter omladdningen');
  foto(t2, '1:a', 'klar'); foto(t2, '2:b', 'bort');       // telefonen skickar om listan
  assert.strictEqual(app.lfUndoGiltig(t2, sparad), true, 'foton som fanns före räknas inte som nästa foto');
  const ater = spara(efter, sparad.ops);
  assert.deepStrictEqual(antal(ater), antal(fore));
  /* Sidan laddas om mitt i Undo (trycket gick igenom men posten fanns kvar): trycket igen gör inget. */
  sparad.brukad = true;
  const t3 = nyTel(); t3.undo.set('2:b', JSON.parse(JSON.stringify(sparad)));
  const r = app.lfStad(t3, klara(ater), true);
  assert.strictEqual(t3.undo.size, 0, 'Undo låg redan i leken: klart');
  assert.deepStrictEqual(r.sag, [{ typ: 'fotoater', fid: '2:b' }]);
  assert.deepStrictEqual(antal(spara(ater, sparad.ops)), antal(fore), 'och en omspelning lägger inte in något');
});
fallD('D6 omladdning innan borttagningen sparats: posten faller, korten står kvar, inget Undo', () => {
  const { rad: fore, t } = treFoton();
  const { undo } = app.lfTaBort(t, app.lekSlagTillampa(fore, []).kort, '2:b', id);
  const t2 = nyTel();
  t2.undo.set('2:b', JSON.parse(JSON.stringify(undo)));
  app.lfStad(t2, klara(fore), true);
  assert.strictEqual(t2.undo.size, 0);
  assert.deepStrictEqual(antal(fore), { Alpha: 1, Beta: 1, Gamma: 2, Delta: 2, Swamp: 2 });
});
fallD('D7 ett kort som bytt namn (Check names) och ett exemplar från en annan enhet', () => {
  let { rad, t } = treFoton();
  rad = spara(rad, [{ typ: 'byt', name: 'Delta', sb: false, kort: K('Delta Prime'), id: id() }]);
  rad = spara(rad, [{ typ: 'antal', name: 'Beta', sb: false, d: 2, kort: K('Beta'), id: id() }]);
  const fore = rad;
  const { ops, undo } = app.lfTaBort(t, app.lekSlagTillampa(fore, []).kort, '2:b', id);
  const efter = spara(fore, ops);
  assert.deepStrictEqual(antal(efter), { Alpha: 1, Beta: 3, Gamma: 1, Swamp: 1 }, 'Delta Prime (ur foto 2) ut, handlagda kvar');
  assert.deepStrictEqual(antal(spara(efter, undo.ops)), antal(fore));
});
fallD('D8 Undo av ett omtag (J10): det gamla fotots kort tillbaka, det nya ut, kollat namn kvar', () => {
  /* Foto 1 = Alpha, Gamma (osäker). Gamma kollas (Yes). Omtaget: Gamma, Omega. */
  let rad = spara(lek(), fotoOps('1:a', ['Alpha', 'Gamma'], { Gamma: { koll: { las: 'Gama', kalla: 'Photo 1' } } }));
  rad = spara(rad, [{ typ: 'koll', name: 'Gamma', sb: false, koll: null, id: id() }]);
  const fore = rad, t = nyTel({ fas: 'kamera', ersatter: '1:a' });
  foto(t, '1:a', 'klar', { hittade: 2 });
  const mall = app.lekSlagFotoTillbaka(app.lekSlagTillampa(fore, []).kort, '1:a');   // J9: datorn tar mallarna
  /* Telefonen sparar omtaget i en kö: nya fotots exemplar, sist fotobort(gammalt). */
  rad = spara(rad, [...fotoOps('1:z', ['Gamma', 'Omega'], { Gamma: { koll: { las: 'Gama', kalla: 'Photo 1' } } }), { typ: 'fotobort', foto: '1:a', id: id() }]);
  assert.deepStrictEqual(antal(rad), { Gamma: 1, Omega: 1 });
  assert.ok(!app.lekSlagTillampa(rad, []).kort.find(k => k.name === 'Gamma').koll, 'kollade Gamma står kvar kollat');
  foto(t, '1:a', 'ersatt'); foto(t, '1:z', 'klar', { hittade: 2, ersatter: '1:a' }); t.fas = 'lagg'; t.ersatter = null;
  const u = app.lfOmtagUndo(t, mall, '1:z', '1:a', id);
  assert.strictEqual(u.antal, 2);
  assert.deepStrictEqual(u.ops[u.ops.length - 1].typ, 'fotobort', 'fotobort(nytt) sist');
  const ater = spara(rad, u.ops);
  assert.deepStrictEqual(antal(ater), antal(fore));
  assert.ok(!app.lekSlagTillampa(ater, []).kort.find(k => k.name === 'Gamma').koll, 'och fortfarande kollat');
  assert.deepStrictEqual(antal(spara(ater, u.ops)), antal(fore), 'två gånger: ingen skillnad');
  assert.deepStrictEqual(app.lfAterSag(u), [{ typ: 'fotobort', fid: '1:z' }, { typ: 'fotoater', fid: '1:a' }]);
});
fallD('D9 Remove photo på ett foto vars kort redan tagits bort för hand: inget Undo, inget kort rörs', () => {
  let { rad, t } = treFoton();
  rad = spara(rad, [{ typ: 'bort', name: 'Alpha', sb: false, id: id() }, { typ: 'bort', name: 'Beta', sb: false, id: id() }, { typ: 'antal', name: 'Gamma', sb: false, d: -2, id: id() }]);
  const { undo } = app.lfTaBort(t, app.lekSlagTillampa(rad, []).kort, '1:a', id);
  assert.strictEqual(undo, null);
});

/* ── E: granskningen av MES-322 ──────────────────────────────────── */
fall('fynd 3 (G1): ett omtag av ett foto utan kort som också blir utan kort: en rad för numret', () => {
  const t = nyTel();
  foto(t, '1:a', 'klar', { hittade: 3 });
  foto(t, '3:c', 'inga');
  foto(t, '3:d', 'inga', { ersatter: '3:c' });              // ersatter gäller först vid 'klar'
  assert.deepStrictEqual(rader(t).filter(r => r[0] === 'Photo 3'), [['Photo 3', 'No cards found. Nothing added.', 'View']]);
  assert.strictEqual(app.lfRader(t).find(r => r.nr === 3).fid, '3:d', 'det senaste försöket');
});
fall('fynd 3 (G2): ett omtag av ett foto med kort som blir utan kort: raden stämmer med leken', () => {
  const t = nyTel();
  foto(t, '1:a', 'klar', { hittade: 9 });
  foto(t, '1:z', 'inga', { ersatter: '1:a' });
  assert.deepStrictEqual(rader(t), [['Photo 1', '9 cards added', 'View']], 'det gamla fotots kort ligger kvar i leken');
  assert.strictEqual(app.lfNastaNr(t), 2);
});
fall('fynd 3: aldrig två rader med samma nummer', () => {
  const t = nyTel();
  foto(t, '1:a', 'klar', { hittade: 9 }); foto(t, '1:z', 'inganamn', { ersatter: '1:a', poster: 6 }); foto(t, '1:y', 'inga', { ersatter: '1:a' });
  foto(t, '2:b', 'inga'); foto(t, '2:c', 'inga', { ersatter: '2:b' });
  foto(t, '3:c', 'klar', { hittade: 4 });
  const nr = app.lfRader(t).map(r => r.nr);
  assert.deepStrictEqual(nr, [...new Set(nr)]);
  assert.deepStrictEqual(nr, [1, 2, 3]);
});
fallD('fynd 2 (G4): omladdning utan telefon fäller Undo när ett nyare foto med samma nummer ligger i leken', () => {
  let rad = spara(lek(), fotoOps('1:a', ['A']));
  rad = spara(rad, fotoOps('2:b', ['C', 'D']));
  const t = nyTel();
  foto(t, '1:a', 'klar'); foto(t, '2:b', 'klar');
  t.iLeken = app.lfFidsILeken(app.lekSlagTillampa(rad, []).kort);
  const { ops, undo } = app.lfTaBort(t, app.lekSlagTillampa(rad, []).kort, '2:b', id);
  rad = spara(rad, ops);
  rad = spara(rad, fotoOps('2:c', ['C', 'D']));             // telefonen tog nästa foto 2 medan datorn var stängd
  const t2 = nyTel({ ansluten: false });
  t2.undo.set('2:b', JSON.parse(JSON.stringify(undo)));
  t2.iLeken = app.lfFidsILeken(app.lekSlagTillampa(rad, []).kort);
  app.lfStad(t2, klara(rad), true);
  assert.strictEqual(t2.undo.has('2:b'), false, 'foto 2:c ligger i leken och fanns inte vid borttagningen');
  assert.deepStrictEqual(antal(rad), { A: 1, C: 1, D: 1 });
  /* Utan ett nyare foto står Undo kvar. */
  let rad2 = spara(lek(), fotoOps('1:a', ['A']));
  rad2 = spara(rad2, fotoOps('2:b', ['C']));
  const t3 = nyTel(); foto(t3, '1:a', 'klar'); foto(t3, '2:b', 'klar');
  const b = app.lfTaBort(t3, app.lekSlagTillampa(rad2, []).kort, '2:b', id);
  rad2 = spara(rad2, b.ops);
  const t4 = nyTel({ ansluten: false });
  t4.undo.set('2:b', JSON.parse(JSON.stringify(b.undo)));
  t4.iLeken = app.lfFidsILeken(app.lekSlagTillampa(rad2, []).kort);
  app.lfStad(t4, klara(rad2), true);
  assert.strictEqual(t4.undo.has('2:b'), true);
});
fall('fynd 5 (G5): Remove photo och View på ett foto utan kort säger inte "0 cards" eller "0 found"', () => {
  assert.strictEqual(app.lfBortFraga(3, 0), 'Remove photo 3?');
  assert.strictEqual(app.lfBortFraga(2, 12), 'Remove photo 2 and its 12 cards?');
  assert.strictEqual(app.lfBortFraga(2, 1), 'Remove photo 2 and its 1 card?');
  assert.strictEqual(app.lfVisaRubrik({ fid: '3:c', lage: 'inga', hittade: 0 }), 'Photo 3');
  assert.strictEqual(app.lfVisaRubrik({ fid: '4:d', lage: 'inganamn', hittade: 0, poster: 6 }), 'Photo 4 · 6 found');
  assert.strictEqual(app.lfVisaRubrik({ fid: '1:a', lage: 'klar', hittade: 13 }), 'Photo 1 · 13 found');
});
fallD('fynd 10: fotona i leken ger rader innan telefonen svarat, och telefonens post tar över', () => {
  let rad = spara(lek(), fotoOps('1:a', ['A', 'B']));
  rad = spara(rad, fotoOps('2:b', ['C', 'Unreadable card q1'], { 'Unreadable card q1': { sid: null, okand: 1, koll: { las: '', kalla: 'Photo 2' } } }));
  const t = nyTel({ ansluten: false });
  app.lfFotonUrLeken(t, app.lekSlagTillampa(rad, []).kort);
  assert.deepStrictEqual(rader(t), [['Photo 1', '2 cards added', 'View'], ['Photo 2', '1 card added · 1 name to pick when you’re done', 'View']]);
  assert.strictEqual(app.lfNastaNr(t), 3);
  app.lfHor(t, { typ: 'foto', foto: { fid: '2:b', nr: 2, lage: 'klar', hittade: 2, okanda: 1, koll: 1, olasta: 1 } });
  assert.strictEqual(t.foton.get('2:b').fran, undefined, 'telefonens post gäller');
  assert.deepStrictEqual(rader(t)[1], ['Photo 2', '1 card added · 1 name to pick when you’re done · some not read', 'View']);
});
fall('fynd 9: J9 först när telefonen säger att den tar om (kamera med ersatter)', () => {
  const t = nyTel();
  foto(t, '1:a', 'klar', { hittade: 9 });
  assert.strictEqual(app.lfLage(t).typ, 'nasta', 'omtag skickat, telefonen har inte svarat');
  app.lfHor(t, { typ: 'kamera', foto: 1, ersatter: '1:a' });
  assert.strictEqual(app.lfLage(t).typ, 'omtas');
  app.lfHor(t, { typ: 'hej', roll: 'tel', svar: true, fas: 'resultat', foto: 2 });   // Back i kameran
  assert.strictEqual(app.lfLage(t).typ, 'nasta');
});

/* ── F: två datorflikar och en telefon, genom lfHor (fynd 1) ────────
   Flik A och flik B har samma lek öppen; telefonen fotar. Varje meddelande
   går till de andra, som på lekkanalen. Leken är servern: en kö sparas på
   raden, och ändringar vars id redan ligger i klara hoppas över. */
function tvaFlikar() {
  const server = { rad: lek() };
  const fliken = namn => ({ namn, t: nyTel(), ut: [] });
  const A = fliken('A'), B = fliken('B');
  const syn = f => {                                       // telMallar: mallarna och fotona i leken
    const kort = app.lekSlagTillampa(server.rad, []).kort;
    for (const [fid, ops] of app.lfMallarUr(kort)) f.t.mallar.set(fid, ops);
    f.t.iLeken = app.lfFidsILeken(kort);
  };
  const till = (fran, m) => { for (const f of [A, B]) if (f !== fran) { const r = app.lfHor(f.t, JSON.parse(JSON.stringify(m)), { id }); syn(f); f.ut.push(...r.sag); } };
  const tel = m => till(null, m);
  const spara2 = ops => { server.rad = spara(server.rad, ops); syn(A); syn(B); };
  const stad = f => { const r = app.lfStad(f.t, klara(server.rad), false); for (const m of r.sag) till(f, m); };
  return { server, A, B, till, tel, spara2, stad, syn };
}
function fotaTvaFoton(v) {
  v.spara2(fotoOps('1:a', ['Alpha', 'Beta']));
  v.tel({ typ: 'foto', foto: { fid: '1:a', nr: 1, lage: 'klar', hittade: 2, kort: kortLista(['Alpha', 'Beta']) } });
  v.spara2(fotoOps('2:b', ['Gamma', 'Delta', 'Delta']));
  v.tel({ typ: 'foto', foto: { fid: '2:b', nr: 2, lage: 'klar', hittade: 3, kort: kortLista(['Gamma', 'Delta', 'Delta']) } });
}
fallD('F1 flik A tar bort foto 2, båda flikarna trycker Undo: korten kommer tillbaka en gång', () => {
  const v = tvaFlikar(); fotaTvaFoton(v);
  const fore = antal(v.server.rad);
  const kort = app.lekSlagTillampa(v.server.rad, []).kort;
  const { ops, undo } = app.lfTaBort(v.A.t, kort, '2:b', id);
  v.A.t.lokal.set('2:b', 'bort'); v.A.t.undo.set('2:b', undo);
  v.spara2(ops);
  v.stad(v.A);                                              // fotobort {fid, bort, ater} till B och telefonen
  const uB = v.B.t.undo.get('2:b');
  assert.ok(uB, 'flik B har ett Undo');
  assert.deepStrictEqual(uB.ops.map(o => o.id), undo.ops.map(o => o.id), 'samma ändringar, samma id:n');
  assert.deepStrictEqual(rader(v.B.t)[1], ['Photo 2', 'Removed, with its 3 cards', 'Undo']);
  /* Båda trycker Undo innan någon av dem hört den andra. */
  undo.brukad = true; uB.brukad = true;
  v.spara2(undo.ops);
  v.spara2(uB.ops);
  assert.deepStrictEqual(antal(v.server.rad), fore, 'inget kort dubbelt');
  v.stad(v.A); v.stad(v.B);                                 // fotoater till de andra
  assert.strictEqual(v.A.t.undo.size + v.B.t.undo.size, 0);
  assert.deepStrictEqual(rader(v.B.t)[1], ['Photo 2', '3 cards added', 'View']);
});
fallD('F2 flik A ångrar, flik B får fotoater: B:s Undo försvinner och fotot räknas igen', () => {
  const v = tvaFlikar(); fotaTvaFoton(v);
  const fore = antal(v.server.rad);
  const { ops, undo } = app.lfTaBort(v.A.t, app.lekSlagTillampa(v.server.rad, []).kort, '2:b', id);
  v.A.t.lokal.set('2:b', 'bort'); v.A.t.undo.set('2:b', undo);
  v.spara2(ops); v.stad(v.A);
  undo.brukad = true; v.spara2(undo.ops); v.stad(v.A);
  assert.strictEqual(v.B.t.undo.has('2:b'), false, 'B:s Undo är borta');
  assert.strictEqual(app.lfLageAv(v.B.t, v.B.t.foton.get('2:b')), 'klar');
  assert.deepStrictEqual(antal(v.server.rad), fore);
});
fallD('F3 båda flikarna tar bort samma foto samtidigt: de enas om en borttagning, Undo en gång', () => {
  const v = tvaFlikar(); fotaTvaFoton(v);
  const fore = antal(v.server.rad), kort = app.lekSlagTillampa(v.server.rad, []).kort;
  const a = app.lfTaBort(v.A.t, kort, '2:b', id), b = app.lfTaBort(v.B.t, kort, '2:b', id);
  v.A.t.lokal.set('2:b', 'bort'); v.A.t.undo.set('2:b', a.undo);
  v.B.t.lokal.set('2:b', 'bort'); v.B.t.undo.set('2:b', b.undo);
  v.spara2(a.ops); v.spara2(b.ops);
  v.stad(v.A); v.stad(v.B);
  const uA = v.A.t.undo.get('2:b'), uB = v.B.t.undo.get('2:b');
  assert.deepStrictEqual(uA.ops.map(o => o.id), uB.ops.map(o => o.id), 'samma Undo i båda');
  uA.brukad = true; uB.brukad = true;
  v.spara2(uA.ops); v.spara2(uB.ops);
  assert.deepStrictEqual(antal(v.server.rad), fore);
});
fallD('F4 omtaget ångras i båda flikarna (J10): samma id:n, leken som före omtaget', () => {
  const v = tvaFlikar(); fotaTvaFoton(v);
  const fore = antal(v.server.rad);
  v.tel({ typ: 'kamera', foto: 1, ersatter: '1:a' });
  v.tel({ typ: 'laser', foto: 1, fid: '1:z', ersatter: '1:a' });
  v.spara2([...fotoOps('1:z', ['Alpha', 'Omega']), { typ: 'fotobort', foto: '1:a', id: id() }]);
  v.tel({ typ: 'foto', foto: { fid: '1:a', nr: 1, lage: 'ersatt', hittade: 2 } });
  v.tel({ typ: 'foto', foto: { fid: '1:z', nr: 1, ersatter: '1:a', lage: 'klar', hittade: 2, kort: kortLista(['Alpha', 'Omega']) } });
  const uA = v.A.t.undo.get('1:z'), uB = v.B.t.undo.get('1:z');
  assert.ok(uA && uB, 'J10 i båda flikarna');
  assert.deepStrictEqual(uA.ops.map(o => o.id), uB.ops.map(o => o.id));
  assert.deepStrictEqual(rader(v.A.t)[0], ['Photo 1 · retaken', '2 cards, replacing 2', 'Undo']);
  uA.brukad = true; uB.brukad = true;
  v.spara2(uA.ops); v.spara2(uB.ops);
  assert.deepStrictEqual(antal(v.server.rad), fore, 'gamla fotot tillbaka, det nya ut, en gång');
  v.stad(v.A);
  assert.strictEqual(v.B.t.undo.has('1:z'), false);
});
fallD('F5 Remove photo på telefonen (LB1): datorn får Undo ur sina mallar', () => {
  const v = tvaFlikar(); fotaTvaFoton(v);
  const fore = antal(v.server.rad);
  v.spara2([{ typ: 'fotobort', foto: '2:b', id: id() }]);
  v.tel({ typ: 'fotobort', fid: '2:b', fran: 'tel' });
  v.tel({ typ: 'foto', foto: { fid: '2:b', nr: 2, lage: 'bort', hittade: 3 } });
  const u = v.A.t.undo.get('2:b');
  assert.ok(u && !u.brukad);
  assert.deepStrictEqual(rader(v.A.t)[1], ['Photo 2', 'Removed, with its 3 cards', 'Undo']);
  u.brukad = true; v.spara2(u.ops);
  assert.deepStrictEqual(antal(v.server.rad), fore);
});

/* ── G: kontrollgranskningen av MES-322 ─────────────────────────────── */
/* Datorns telMallar: mallarna, fotona i leken och raderna ur leken. */
const synk = (t, rad) => { const kort = app.lekSlagTillampa(rad, []).kort; for (const [fid, ops] of app.lfMallarUr(kort)) t.mallar.set(fid, ops); t.iLeken = app.lfFidsILeken(kort); app.lfFotonUrLeken(t, kort); };
fallD('G10 Remove + Undo på ett omtaget foto ger inget nytt J10-Undo', () => {
  let rad = spara(lek(), fotoOps('1:a', ['A', 'B', 'C']));
  const t = nyTel(); synk(t, rad);
  app.lfHor(t, { typ: 'foto', foto: { fid: '1:a', nr: 1, lage: 'klar', hittade: 3 } });
  app.lfHor(t, { typ: 'kamera', foto: 1, ersatter: '1:a' }); synk(t, rad);
  app.lfHor(t, { typ: 'laser', foto: 1, fid: '1:z', ersatter: '1:a' }); synk(t, rad);
  rad = spara(rad, [...fotoOps('1:z', ['A', 'D']), { typ: 'fotobort', foto: '1:a', id: id() }]);
  app.lfHor(t, { typ: 'foto', foto: { fid: '1:a', nr: 1, lage: 'ersatt', hittade: 3 } });
  app.lfHor(t, { typ: 'foto', foto: { fid: '1:z', nr: 1, ersatter: '1:a', lage: 'klar', hittade: 2 } });
  synk(t, rad);
  assert.ok(t.undo.get('1:z') && t.undo.get('1:z').typ === 'omtag', 'J10 direkt efter omtaget');
  app.lfHor(t, { typ: 'laser', foto: 2, fid: '2:b' });
  rad = spara(rad, fotoOps('2:b', ['E']));
  app.lfHor(t, { typ: 'foto', foto: { fid: '2:b', nr: 2, lage: 'klar', hittade: 1 } }); synk(t, rad);
  app.lfStad(t, klara(rad), false);
  assert.strictEqual(t.undo.has('1:z'), false, 'J10 borta när foto 2 landat');
  /* Remove photo 1 (1:z) och Undo; telefonen skickar om posten efter båda. */
  const { ops, undo } = app.lfTaBort(t, app.lekSlagTillampa(rad, []).kort, '1:z', id);
  rad = spara(rad, ops); t.lokal.set('1:z', 'bort'); t.undo.set('1:z', undo); synk(t, rad);
  app.lfStad(t, klara(rad), false);
  app.lfHor(t, { typ: 'foto', foto: { fid: '1:z', nr: 1, ersatter: '1:a', lage: 'bort', hittade: 2 } });
  undo.brukad = true; t.lokal.set('1:z', 'klar'); rad = spara(rad, undo.ops); synk(t, rad);
  assert.deepStrictEqual(app.lfStad(t, klara(rad), false).sag, [{ typ: 'fotoater', fid: '1:z' }]);
  app.lfHor(t, { typ: 'foto', foto: { fid: '1:z', nr: 1, ersatter: '1:a', lage: 'klar', hittade: 2 } });
  assert.strictEqual(t.undo.size, 0, 'inget J10-Undo dyker upp igen');
  assert.deepStrictEqual(rader(t)[0], ['Photo 1', '2 cards added', 'View']);
});
fallD('G11 Undo av ett omtag (J10) fäller inte Undo för Remove photo 2', () => {
  let rad = spara(lek(), fotoOps('1:a', ['A', 'B'])); rad = spara(rad, fotoOps('2:b', ['C']));
  const t = nyTel(); synk(t, rad);
  app.lfHor(t, { typ: 'foto', foto: { fid: '1:a', nr: 1, lage: 'klar', hittade: 2 } });
  app.lfHor(t, { typ: 'foto', foto: { fid: '2:b', nr: 2, lage: 'klar', hittade: 1 } });
  app.lfHor(t, { typ: 'kamera', foto: 1, ersatter: '1:a' }); synk(t, rad);
  app.lfHor(t, { typ: 'laser', foto: 1, fid: '1:z', ersatter: '1:a' }); synk(t, rad);
  rad = spara(rad, [...fotoOps('1:z', ['A', 'D']), { typ: 'fotobort', foto: '1:a', id: id() }]);
  app.lfHor(t, { typ: 'foto', foto: { fid: '1:a', nr: 1, lage: 'ersatt', hittade: 2 } });
  app.lfHor(t, { typ: 'foto', foto: { fid: '1:z', nr: 1, ersatter: '1:a', lage: 'klar', hittade: 2 } }); synk(t, rad);
  const j10 = t.undo.get('1:z'); assert.ok(j10, 'J10');
  const { ops, undo } = app.lfTaBort(t, app.lekSlagTillampa(rad, []).kort, '2:b', id);
  rad = spara(rad, ops); t.lokal.set('2:b', 'bort'); t.undo.set('2:b', undo); synk(t, rad);
  app.lfStad(t, klara(rad), false);
  assert.ok(t.undo.has('2:b') && t.undo.has('1:z'), 'båda Undo gäller');
  j10.brukad = true; t.lokal.set('1:z', 'bort'); t.lokal.set('1:a', 'klar'); rad = spara(rad, j10.ops); synk(t, rad);
  app.lfStad(t, klara(rad), false);
  assert.strictEqual(t.undo.has('2:b'), true, 'inget nytt foto har landat: Remove photo 2 går att ångra');
  const efter = spara(rad, t.undo.get('2:b').ops);
  assert.deepStrictEqual(antal(efter), { A: 1, B: 1, C: 1 }, 'leken som före omtaget och borttagningen');
});
fall('Remove photo och Retake erbjuds inte medan ett foto läses eller tas om', () => {
  const t = nyTel();
  foto(t, '1:a', 'klar', { hittade: 3 }); foto(t, '2:b', 'klar', { hittade: 2 });
  assert.strictEqual(app.lfLaserPagar(t), false);
  app.lfHor(t, { typ: 'laser', foto: 3, fid: '3:c' });
  assert.strictEqual(app.lfLaserPagar(t), true, 'foto 3 läses');
  app.lfHor(t, { typ: 'foto', foto: { fid: '3:c', nr: 3, lage: 'klar', hittade: 1 } });
  assert.strictEqual(app.lfLaserPagar(t), false);
  app.lfHor(t, { typ: 'laser', foto: 4, fid: '4:d' });
  app.lfHor(t, { typ: 'foto', foto: { fid: '4:d', nr: 4, lage: 'ejskickat' } });
  assert.strictEqual(app.lfLaserPagar(t), false, 'läsningen misslyckades: inget läses längre');
  app.lfHor(t, { typ: 'kamera', foto: 1, ersatter: '1:a' });
  assert.strictEqual(app.lfLaserPagar(t), true, 'foto 1 tas om');
});

const d = STOD ? '' : `, ${over} hoppades över: LEKSLAG i ${path.basename(FIL)} saknar foto/fotobort (MES-321)`;
console.log(`\nlekfoto-dator: ${ok} OK, ${fel} FEL${d}`);
process.exit(fel ? 1 : 0);

#!/usr/bin/env node
/* Slutet av lekfotot (MES-323) provat utan webbläsare.

   Klipper ut blocken LEKSLAG, LEKFOTO PÅ DATORN och LEKFOTO SLUTET ur
   index.html och provar det sida M rad 5 och 6 säger:

     A  Check names: vilket fall ett kort är (ID1 A–D, LR2), i vilken ordning
        korten kommer, och "2 of 3" genom omgången
     B  svaren: Yes, ett valt kort, Remove och Not a card ändrar rätt rad EN
        gång, också vid två tryck och när sidan laddas om (klara, lekSparaKo)
     C  Later: gissningarna räknas i decks.antal, platshållarna inte, och
        spelet väljer dem inte
     D  basländerna ur fotona: "7 Plains and 5 Swamps were in the photos."
     E  stegen: ID0 (steg 2 hoppas över), ID1, ID2, ID3, N7 och N9, med sida
        M:s copy ordagrant
     F  proven faller utan koden de skyddar: blocket laddas med skyddet
        bortklippt, och samma prov ska då fälla det

     node dev/lekfoto-slut.cjs              provet mot index.html (ingår i dev/kolla.sh)
     node dev/lekfoto-slut.cjs --mot <fil>  samma prov mot en annan index.html

   Slutar med "lekfoto-slut: N OK, M FEL" och slutkod 1 om något faller.
   .cjs eftersom package.json säger "type": "module". */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const FIL = arg('--mot', path.join(__dirname, '..', 'index.html'));
const SRC = fs.readFileSync(FIL, 'utf8');

function skar(src, fran, till) {
  const a = src.indexOf(fran), b = src.indexOf(till, a);
  if (a < 0 || b < 0) throw new Error(`hittar inte "${fran}" … "${till}" i ${FIL}`);
  return src.slice(a, b);
}
/* Blocken som en modul. byt: [[fran, till]] klipper bort ett skydd (F). */
function ladda(byt = []) {
  let kod = [
    skar(SRC, '/* ══ BLOCK: LEKSLAG', '/* ══ SLUT: LEKSLAG ══ */'),
    skar(SRC, '/* ══ BLOCK: LEKFOTO PÅ DATORN', '/* ══ SLUT: LEKFOTO PÅ DATORN ══ */'),
    skar(SRC, '/* ══ BLOCK: LEKFOTO SLUTET', '/* ══ SLUT: LEKFOTO SLUTET ══ */'),
  ].join('\n');
  for (const [fran, till] of byt) {
    if (!kod.includes(fran)) throw new Error('mutationen hittar inte: ' + fran);
    kod = kod.replace(fran, till);
  }
  const namn = [...kod.matchAll(/^(?:async\s+)?(?:function|const|let)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
  return new Function(kod + `\nreturn { ${[...new Set(namn)].join(', ')} };`)();
}
const app = ladda();

let ok = 0, fel = 0;
function fall(namn, fn) {
  try { fn(app); ok++; console.log('OK   ' + namn); }
  catch (e) { fel++; console.log('FEL  ' + namn + '\n     ' + String((e && e.stack) || e).split('\n').slice(0, 6).join('\n     ')); }
}

/* ── hjälp ── */
let idN = 0;
const id = () => 'op' + (++idN);
const K = (name, o = {}) => Object.assign({ name, sid: 's-' + name.toLowerCase().replace(/\W+/g, ''), small: null, n: 1 }, o);
const gissning = (name, las, nr, o = {}) => K(name, Object.assign({ koll: { las, kalla: 'Photo ' + nr }, foto: { [nr + ':f']: o.n || 1 } }, o));
const platshallare = (las, nr, uid, o = {}) => Object.assign({ name: 'Unreadable card ' + uid, sid: null, small: null, n: 1, okand: 1,
  koll: { las, kalla: 'Photo ' + nr }, foto: { [nr + ':f']: 1 } }, o);
/* Leken som servern har den: kort och klara. spara = lekSparaKo:s kärna. */
const lek = (kort = []) => ({ kort, klara: [] });
function spara(a, rad, ops) {
  for (const op of ops) if (!op.id) op.id = id();
  const v = a.lekSlagTillampa(rad, ops);
  return { kort: v.kort, klara: a.lekSlagKlaraEfter(rad, ops) };
}
const las = (a, rad) => a.lekSlagTillampa(rad, []).kort;
const rad = (a, r, name) => las(a, r).find(k => k.name === name) || null;
const nyTel = () => ({ ansluten: true, fas: 'klar', foto: 1, fid: null, ersatter: null, klar: true, seddN: 0,
  foton: new Map(), bilder: new Map(), lokal: new Map(), undo: new Map(), mallar: new Map(), arKort: new Set(), iLeken: new Set() });
let sedd = 0;
function foto(t, fid, lage, o = {}) {
  t.foton.set(fid, Object.assign({ fid, nr: parseInt(fid, 10), lage, hittade: 0, kanda: 0, koll: 0, okanda: 0, olasta: 0, kort: [], sedd: ++sedd }, o));
}
/* En lek efter fyra foton, som ID1 (38 kort i fotona, 3 namn att kolla). */
function idLek() {
  const kort = [];
  for (let i = 0; i < 24; i++) kort.push(K('Kort ' + i, { foto: { [(1 + (i % 3)) + ':f']: 1 } }));
  kort.push(K('Plains', { n: 7, foto: { '1:f': 4, '4:f': 3 } }), K('Swamp', { n: 5, foto: { '2:f': 5 } }));
  kort.push(gissning('Gorgon Flail', 'Gorgon Fail', 1), gissning('Venomous Hierophant', 'Venomous Hierophnt', 3), platshallare('', 2, 'u1'));
  return kort;
}

/* ── A: fallen och omgången ─────────────────────────────────────────── */
fall('A1 fallen: nära träff A, lista D, kandidater B, sökfält C, inget namn LR2', a => {
  assert.strictEqual(a.lsfFall(gissning('Gorgon Flail', 'Gorgon Fail', 1)), 'A');
  assert.strictEqual(a.lsfFall(K('Pacifism', { koll: { las: 'Pacifsim', kalla: 'Pasted list', rad: 15 } })), 'D');
  const p = platshallare('Killing', 1, 'u2');
  assert.strictEqual(a.lsfFall(p, ['Killing Glare', 'Killing Wave', 'Kill Shot']), 'B');
  assert.strictEqual(a.lsfFall(p, ['Killing Glare']), 'C', 'en kandidat är inte "several cards fit"');
  assert.strictEqual(a.lsfFall(p, []), 'C');
  assert.strictEqual(a.lsfFall(p, null), 'C', 'medan kandidaterna hämtas');
  const tom = platshallare('', 2, 'u3');
  assert.strictEqual(a.lsfFall(tom, null), 'LR2', 'inget namn läst: kan vara något som inte är ett kort (LA5)');
  assert.strictEqual(a.lsfFall(tom, null, new Set([tom.name])), 'C', '"It’s a card" i View a photo');
  assert.strictEqual(a.lsfFall(K('Lightning Bolt')), null, 'ett kort utan koll kollas inte');
});
fall('A2 ordningen: foto 1, 2, 3, listan sist; "1 of 3" och nästa öppnas av sig självt', a => {
  const kort = [K('Pacifism', { koll: { las: 'Pacifsim', kalla: 'Pasted list' } }), ...idLek()];
  const ko = a.lsfKo(kort);
  assert.deepStrictEqual(ko.map(k => k.name), ['Gorgon Flail', 'Unreadable card u1', 'Venomous Hierophant', 'Pacifism']);
  const kn = a.lsfKnTom();
  let o = a.lsfOmgang(kn, ko);
  assert.deepStrictEqual([o.nr, o.av, o.forra, o.nasta], [1, 4, false, true]);
  /* Det första besvaras: nästa står framme, och omgången räknar vidare. */
  o = a.lsfOmgang(kn, ko.slice(1));
  assert.strictEqual(kn.nu, 'unreadable card u1');
  assert.deepStrictEqual([o.nr, o.av, o.forra], [2, 4, false], 'det besvarade går inte att bläddra tillbaka till');
  assert.strictEqual(a.lsfBladdra(kn, ko.slice(1), 1), true);
  assert.strictEqual(kn.nu, 'venomous hierophant');
  assert.strictEqual(a.lsfBladdra(kn, ko.slice(1), -1), true);
  assert.strictEqual(kn.nu, 'unreadable card u1');
});

/* ── B: svaren, en gång ──────────────────────────────────────────────── */
fall('B1 Yes (A): Check-märket bort, kortet kvar, samma antal; samma ändring en gång till gör ingenting (LEKSLAG)', a => {
  let r = lek(idLek());
  const k = rad(a, r, 'Gorgon Flail'), fore = a.lekSpelAntal(las(a, r));
  r = spara(a, r, [a.lsfJa(k)]);
  assert.strictEqual(rad(a, r, 'Gorgon Flail').koll, undefined);
  assert.strictEqual(a.lekSpelAntal(las(a, r)), fore);
  const efter = JSON.stringify(las(a, r));
  r = spara(a, r, [a.lsfJa(k)]);
  assert.strictEqual(JSON.stringify(las(a, r)), efter, 'ett andra Yes gör ingenting');
});
fall('B2 ett valt kort på en platshållare (B, C, LR2): ett riktigt kort, fotot följer med, antalet +1; samma val en gång till gör ingenting (LEKSLAG)', a => {
  let r = lek(idLek());
  const p = rad(a, r, 'Unreadable card u1'), fore = a.lekSpelAntal(las(a, r));
  const op = a.lsfValj(p, { name: 'Hooded Blightfang', sid: 's-hb', small: null, ci: ['B'] });
  assert.strictEqual(op.typ, 'byt');
  r = spara(a, r, [op]);
  const hb = rad(a, r, 'Hooded Blightfang');
  assert.ok(hb && !hb.okand && !hb.koll, 'kortet är riktigt och inte längre att kolla');
  assert.deepStrictEqual(hb.foto, { '2:f': 1 }, 'kortet kom ur foto 2');
  assert.strictEqual(rad(a, r, 'Unreadable card u1'), null);
  assert.strictEqual(a.lekSpelAntal(las(a, r)), fore + 1, 'kortet räknas nu i decks.antal');
  const efter = JSON.stringify(las(a, r));
  r = spara(a, r, [a.lsfValj(p, { name: 'Hooded Blightfang', sid: 's-hb', small: null, ci: ['B'] })]);
  assert.strictEqual(JSON.stringify(las(a, r)), efter, 'ett andra val gör ingenting');
});
fall('B3 samma kort som gissningen bekräftar (D: Did you mean), ett annat byter; ett som redan finns slås ihop', a => {
  const g = gissning('Gorgon Flail', 'Gorgon Fail', 1);
  assert.strictEqual(a.lsfValj(g, { name: 'Gorgon Flail', sid: g.sid }).typ, 'koll');
  assert.strictEqual(a.lsfValj(g, { name: 'Gorgon Flail', sid: 's-annan' }).typ, 'byt', 'en annan tryckning byter');
  let r = lek(idLek());
  r = spara(a, r, [a.lsfValj(rad(a, r, 'Gorgon Flail'), { name: 'Kort 1', sid: 's-kort1' })]);
  assert.strictEqual(rad(a, r, 'Gorgon Flail'), null);
  assert.strictEqual(rad(a, r, 'Kort 1').n, 2, 'två exemplar av Kort 1');
});
fall('B4 Not a card (LR2) och Remove tar bort raden, en andra gång gör ingenting (LEKSLAG); platshållaren räknades aldrig i decks.antal', a => {
  let r = lek(idLek());
  const p = rad(a, r, 'Unreadable card u1'), fore = a.lekSpelAntal(las(a, r)), foreAlla = a.lekSlagSummor(las(a, r)).main;
  r = spara(a, r, [a.lsfBort(p)]);
  assert.strictEqual(rad(a, r, 'Unreadable card u1'), null);
  assert.strictEqual(a.lekSpelAntal(las(a, r)), fore, 'decks.antal oförändrat');
  assert.strictEqual(a.lekSlagSummor(las(a, r)).main, foreAlla - 1, 'lekens sida räknar en mindre');
  const efter = JSON.stringify(las(a, r));
  r = spara(a, r, [a.lsfBort(p)]);
  assert.strictEqual(JSON.stringify(las(a, r)), efter);
  const g = rad(a, r, 'Venomous Hierophant');
  r = spara(a, r, [a.lsfBort(g)]);
  assert.strictEqual(rad(a, r, 'Venomous Hierophant'), null, 'Remove på en gissning');
  assert.strictEqual(a.lekSpelAntal(las(a, r)), fore - 1);
});
fall('B5 omladdning: svaren som redan ligger i leken (klara) görs inte igen', a => {
  let r = lek(idLek());
  const ops = [a.lsfJa(rad(a, r, 'Gorgon Flail')), a.lsfValj(rad(a, r, 'Unreadable card u1'), { name: 'Hooded Blightfang', sid: 's-hb' }),
               { typ: 'antal', name: 'Swamp', sb: false, d: 2, kort: K('Swamp') }];
  r = spara(a, r, ops);
  const efter = JSON.stringify(las(a, r));
  /* Sidan laddas om mitt i: samma kö (samma id:n) spelas upp på raden igen. */
  const igen = spara(a, r, ops);
  assert.strictEqual(JSON.stringify(las(a, igen)), efter, 'inget dubbelt: Swamp +2 en gång, bytet en gång');
  assert.strictEqual(rad(a, igen, 'Swamp').n, 7);
  assert.strictEqual(a.lsfKo(las(a, igen)).map(k => k.name).join(), 'Venomous Hierophant', 'ett namn kvar att kolla');
});
fall('B6 två tryck: det andra (dubbelklick, eller på nästa kort som öppnats) gör ingenting', a => {
  const kn = a.lsfKnTom(), ko = a.lsfKo(idLek());
  a.lsfOmgang(kn, ko);
  const forsta = kn.nu;
  assert.strictEqual(a.lsfTryck(kn, forsta, 1000), true);
  assert.strictEqual(a.lsfTryck(kn, forsta, 1100), false, 'samma kort igen direkt');
  /* Svaret gick igenom: nästa kort öppnas av sig självt. */
  a.lsfOmgang(kn, ko.slice(1));
  assert.notStrictEqual(kn.nu, forsta);
  assert.strictEqual(a.lsfTryck(kn, forsta, 2000), false, 'ett sent tryck på det förra kortet svarar inte på nästa');
  assert.strictEqual(a.lsfTryck(kn, kn.nu, 1200), false, 'dubbelklicket landar på nästa kort: för tätt');
  assert.strictEqual(a.lsfTryck(kn, kn.nu, 1600), true);
});

/* ── C: Later ──────────────────────────────────────────────────────── */
fall('C1 Later: gissningarna i decks.antal, platshållarna inte; spelet väljer inte platshållarna', a => {
  const kort = idLek();
  const alla = a.lekSlagSummor(kort).main, spel = a.lekSpelAntal(kort);
  assert.strictEqual(alla, 24 + 7 + 5 + 3);
  assert.strictEqual(spel, 24 + 7 + 5 + 2, 'två gissningar räknas, platshållaren inte');
  assert.ok(!a.lekSpelbara(kort).some(k => k.okand), 'spelet (lekSattAktiv) får inga platshållare');
  const s = Object.assign(a.lsfTom(), { senare: true, undan: true, kollN: 3 });
  const st = a.lsfSteg(kort, s);
  assert.strictEqual(st.aktiv, 'undan', 'nästa steg öppnas');
  assert.strictEqual(st.klar, false);
  assert.strictEqual(a.lsfSenareText(st), 'Left for later. 2 are in the deck as Mesa’s guess, 1 waits for a name.');
  assert.strictEqual(a.lsfRubrik({ foton: 4, hittade: 38 }, st).txt, 'Three things left.', 'N9: utan "in this order"');
});

/* ── D: basländerna ─────────────────────────────────────────────────── */
fall('D1 "7 Plains and 5 Swamps were in the photos." och vad man lagt till', a => {
  const kort = idLek();
  const t = a.lsfBlText(kort);
  assert.strictEqual(t.var, '7 Plains and 5 Swamps were in the photos.');
  assert.strictEqual(t.lagt, '');
  const st = a.lsfSteg(kort, Object.assign(a.lsfTom(), { kollN: 3 }));
  assert.strictEqual(a.lsfBlNot(kort, st, 40), '7 Plains and 5 Swamps were in the photos. Add the ones you didn’t photograph.');
  assert.strictEqual(a.lsfBlStegText(kort, st), '7 Plains and 5 Swamps were in the photos. Add any you didn’t photograph, at the bottom.');
  /* ID3: två Swamps till, steg 3 står framme. */
  const mer = kort.map(k => k.name === 'Swamp' ? Object.assign({}, k, { n: 7 }) : k).filter(k => !k.koll);
  const st3 = a.lsfSteg(mer, Object.assign(a.lsfTom(), { kollN: 3 }));
  assert.strictEqual(st3.aktiv, 'bl');
  assert.strictEqual(a.lsfBlNot(mer, st3, 40), '7 Plains and 5 Swamps were in the photos. You added 2 Swamps. 40 cards.');
  const st7 = a.lsfSteg(mer, Object.assign(a.lsfTom(), { kollN: 3, blKlar: true }));
  assert.strictEqual(a.lsfBlNot(mer, st7, 40), '7 Plains and 5 Swamps were in the photos. You added 2 Swamps.', 'N7');
});
fall('D2 basländer ur fotona: bara exemplaren ur ett foto, högst radens antal; ental och inga', a => {
  const m = a.lsfBlIFoton([K('Swamp', { n: 3, foto: { '1:f': 2, '2:f': 4 } }), K('Island', { n: 2 }), K('Forest', { n: 1, sb: 1, foto: { '1:f': 1 } })]);
  assert.deepStrictEqual([...m], [['Swamp', 3]], 'handlagda och sideboard räknas inte');
  assert.strictEqual(a.lsfBlText([K('Swamp', { foto: { '1:f': 1 } })]).var, '1 Swamp was in the photos.');
  assert.strictEqual(a.lsfBlText([K('Plains', { n: 3, foto: { '1:f': 3 } }), K('Island', { n: 2, foto: { '1:f': 2 } }), K('Mountain', { foto: { '2:f': 1 } })]).var,
    '3 Plains, 2 Islands and 1 Mountain were in the photos.');
  assert.strictEqual(a.lsfBlText([K('Lightning Bolt')]).var, 'No basic lands were in the photos.');
});

/* ── E: stegen, ordagrant ───────────────────────────────────────────── */
fall('E1 ID0: inget lagt undan, steg 2 hoppas över: "Two things left, in this order."', a => {
  const t = nyTel();
  foto(t, '1:a', 'klar', { hittade: 12 }); foto(t, '2:b', 'klar', { hittade: 12 }); foto(t, '3:c', 'klar', { hittade: 6 }); foto(t, '4:d', 'klar', { hittade: 8 });
  assert.strictEqual(a.lsfUndanIFoton(t), false);
  const st = a.lsfSteg(idLek(), Object.assign(a.lsfTom(), { undan: a.lsfUndanIFoton(t) }));
  assert.deepStrictEqual(st.steg.map(x => x.id), ['koll', 'bl']);
  assert.deepStrictEqual(a.lsfRubrik(a.lsfFotoTal(t), st), { rub: '4 photos, 38 cards added', txt: 'Two things left, in this order.' });
});
fall('E2 ID1 → ID2 → ID3 → N7: stegen i ordning, och klar-raden', a => {
  const t = nyTel();
  foto(t, '1:a', 'klar', { hittade: 12 }); foto(t, '2:b', 'klar', { hittade: 12, olasta: 2 }); foto(t, '3:c', 'inga', { undan: true });
  assert.strictEqual(a.lsfUndanIFoton(t), true, 'ett foto med olasta, eller undan');
  const s = Object.assign(a.lsfTom(), { undan: true, kollN: 3 });
  let kort = idLek();
  let st = a.lsfSteg(kort, s);
  assert.deepStrictEqual([st.aktiv, st.steg.map(x => x.id).join()], ['koll', 'koll,undan,bl']);
  assert.strictEqual(a.lsfRubrik({ foton: 4, hittade: 38 }, st).txt, 'Three things left, in this order.');
  kort = kort.filter(k => !k.koll);                         // alla namn svarade
  st = a.lsfSteg(kort, s);
  assert.strictEqual(st.aktiv, 'undan');
  assert.strictEqual(a.lsfEfterKoll(st), 'All names checked', 'ID2');
  s.undanKlar = true; st = a.lsfSteg(kort, s);
  assert.strictEqual(st.aktiv, 'bl');
  assert.strictEqual(a.lsfEfterKoll(st), 'Names checked, and the cards you put aside are in', 'ID3');
  s.blKlar = true; st = a.lsfSteg(kort, s);
  assert.strictEqual(st.klar, true);
  assert.strictEqual(a.lsfKlarText(st, 40), '40 cards: names checked, the cards you put aside typed in, basic lands set.');
  assert.strictEqual(a.lsfKlarText(a.lsfSteg(kort, Object.assign(a.lsfTom(), { kollN: 0, blKlar: true })), 40), '40 cards: basic lands set.');
});
fall('E3 ett borttaget foto räknas inte som undanlagt; "Check 1 name" ental', a => {
  const t = nyTel();
  foto(t, '1:a', 'klar', { hittade: 12, olasta: 3 });
  t.lokal.set('1:a', 'bort');
  assert.strictEqual(a.lsfUndanIFoton(t), false);
  const st = a.lsfSteg([gissning('Gorgon Flail', 'Gorgon Fail', 1)], a.lsfTom());
  assert.strictEqual(st.kollN, 1);
  assert.deepStrictEqual(a.lsfRubrik({ foton: 1, hittade: 1 }, st), { rub: '1 photo, 1 card added', txt: 'Two things left, in this order.' });
});
fall('E4 vad man svarat: "Hooded Blightfang added, Gorgon Flail and Venomous Hierophant confirmed."', a => {
  assert.strictEqual(a.lsfLoggText([{ typ: 'ny', namn: 'Hooded Blightfang' }, { typ: 'ja', namn: 'Gorgon Flail' }, { typ: 'ja', namn: 'Venomous Hierophant' }]),
    'Hooded Blightfang added, Gorgon Flail and Venomous Hierophant confirmed.');
  assert.strictEqual(a.lsfLoggText([]), '');
});
fall('E5 omgångens läge efter en omladdning (webbläsaren): bara kända fält', a => {
  assert.deepStrictEqual(a.lsfRen({ senare: 1, undan: true, blKlar: 0, kollN: '3', annat: 'x' }),
    { senare: true, undan: true, undanKlar: false, blKlar: false, kollN: 3 });
  assert.strictEqual(a.lsfRen(null), null);
  assert.strictEqual(a.lsfRen('trasig'), null);
});
/* E6: skärmarnas copy. Kropparna av funktionerna som ritar slutet, deras
   knappar och notiser, och blocket, utan kommentarer. Förut läste provet bara
   blocket, och copyn på skärmarna ligger i skapaLekYta (granskningen av
   MES-323: "Step 3 of 4 — …" i knHtml gav ändå OK). En funktion som inte
   hittas är ett fel: då läser provet inte längre det skärmarna ritar. */
const SKARMAR = ['slutPanelHtml', 'slutFotonHtml', 'undanSokHtml', 'kopplaUndan', 'laggUndan', 'ritaUndan', 'fotoKlar',
  'slutTopp', 'knRita', 'knHtml', 'slutAtgard', 'knValj', 'knEfter', 'knVisa', 'ritaPanel', 'basland',
  'leksidaTillbakaText', 'leksidaKlarKnapp'];
function funktionskropp(src, namn) {
  const m = new RegExp(`(?:async\\s+)?function\\s+${namn}\\s*\\(`).exec(src);
  if (!m) throw new Error('hittar inte funktionen ' + namn);
  let p = m.index + m[0].length - 1, d = 0;
  for (; p < src.length; p++) { if (src[p] === '(') d++; else if (src[p] === ')' && --d === 0) break; }
  const start = src.indexOf('{', p);
  let i = start;
  for (d = 0; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}' && --d === 0) break; }
  return src.slice(start, i + 1);
}
function copyFel(src) {
  const ut = [], utanKommentar = kod => kod.replace(/\/\*[\s\S]*?\*\//g, '');
  const delar = SKARMAR.map(n => [n, funktionskropp(src, n)]);
  delar.push(['LEKFOTO SLUTET', skar(src, '/* ══ BLOCK: LEKFOTO SLUTET', '/* ══ SLUT: LEKFOTO SLUTET ══ */')]);
  for (const [namn, kod] of delar) {
    const k = utanKommentar(kod);
    if (k.includes('—')) ut.push(namn + ': tankstreck');
    if (/step\s*\d+\s*of\s*\d+/i.test(k)) ut.push(namn + ': Step x of y');
  }
  return ut;
}
fall('E6 skärmarnas copy: inga tankstreck (—), inget "Step x of y"', () => { assert.deepStrictEqual(copyFel(SRC), []); });
/* E7: Later och sedan klart (N9 → N7, N8). */
const provE7 = a => {
  const kort = idLek();                                    // 2 gissningar och en platshållare kvar
  const s = Object.assign(a.lsfTom(), { senare: true, undan: true, undanKlar: true, blKlar: true, kollN: 3 });
  const st = a.lsfSteg(kort, s);
  assert.strictEqual(st.klar, true, 'klar-raden med Create deck eller Back to Home');
  assert.strictEqual(st.senare, true, 'Check names-raden står kvar överst');
  assert.strictEqual(st.aktiv, null);
  assert.strictEqual(a.lsfKlarText(st, 38), '38 cards: the cards you put aside typed in, basic lands set.', 'inte "names checked" medan namn väntar');
  /* Check now öppnar namnen igen: klar först när de är svarade, eller lämnade igen. */
  s.senare = false;
  assert.strictEqual(a.lsfSteg(kort, s).klar, false);
  assert.strictEqual(a.lsfSteg(kort.filter(k => !k.koll), s).klar, true);
};
fall('E7 N9 → N7/N8: Later, och steg 2 och 3 klara: leken är klar, med Check names-raden kvar', provE7);

/* ── MES-324: LR1, "One Swamp or two?" ──────────────────────────────── */
/* En Swamp-rad: 7 ur foto 1, 1 ur foto 2 vid kanten, frågan i koll. */
const dubbelRad = (o = {}) => K('Swamp', Object.assign({ n: 8, foto: { '1:f': 7, '2:f': 1 },
  koll: { las: 'Swamp', kalla: 'Photo 2', remsa: 'r2', sakert: 1, dubbel: Object.assign({ fid: '1:f', nr: 1, ny: '2:f', n: 1, remsa: 'r1' }, o.dubbel || {}) } }, o.rad || {}));
const provA3 = a => {
  assert.strictEqual(a.lsfFall(dubbelRad()), 'LR1');
  /* Ett osäkert namn som också bär dubbel: namnet först (A), efter Yes LR1. */
  const osaker = K('Swamp', { n: 2, foto: { '1:f': 1, '2:f': 1 }, koll: { las: 'Swmp', kalla: 'Photo 1', dubbel: { fid: '1:f', nr: 1, ny: '2:f', n: 1 } } });
  assert.strictEqual(a.lsfFall(osaker), 'A');
  let r = spara(a, lek([osaker]), [a.lsfJa(osaker)]);
  const k = rad(a, r, 'Swamp');
  assert.ok(k.koll && k.koll.sakert && k.koll.dubbel, 'Yes behåller dubbel-frågan');
  assert.strictEqual(a.lsfFall(k), 'LR1');
  assert.strictEqual(k.n, 2);
  /* Utan dubbel tar Yes bort frågan helt, som förut. */
  r = spara(a, lek([gissning('Gorgon Flail', 'Gorgon Fail', 1)]), [a.lsfJa(gissning('Gorgon Flail', 'Gorgon Fail', 1))]);
  assert.strictEqual(rad(a, r, 'Gorgon Flail').koll, undefined);
  const t = a.lsfDubbelText(dubbelRad());
  assert.strictEqual(t.fraga, 'One Swamp or two?');
  assert.strictEqual(t.under, 'A Swamp was at the edge of photo 2, and one was in photo 1. If it is the same card, you photographed it twice.');
  assert.strictEqual(a.lsfDubbelText(dubbelRad({ dubbel: { kant: 1 } })).under, 'A Swamp was at the edge of photo 1 and of photo 2. If it lay in the same spot in both, you photographed the same card twice.');
  assert.strictEqual(t.raknas, 'Counted as 8 Swamps until you answer.');
  assert.deepStrictEqual([t.en, t.tva], ['One, photographed twice', 'Two Swamps']);
  const tb = a.lsfDubbelText(K('Aphelia, Viper Whisperer', { n: 2, foto: { '1:f': 1, '2:f': 1 }, koll: { las: 'Aphelia, Viper Whisperer', kalla: 'Photo 2', sakert: 1, dubbel: { fid: '1:f', nr: 1, ny: '2:f', n: 1 } } }));
  assert.deepStrictEqual([tb.fraga, tb.raknas, tb.tva], ['One Aphelia, Viper Whisperer or two?', 'Counted as 2 copies until you answer.', 'Two copies']);
  assert.ok(tb.under.startsWith('An Aphelia'));
};
fall('A3 LR1: fallet, sida M:s ord, ett osäkert namn med dubbel frågas som A först och efter Yes som LR1', provA3);
const provB8 = a => {
  let r = lek([dubbelRad()]);
  const k = rad(a, r, 'Swamp'), en = a.lsfEn(k);
  assert.deepStrictEqual(en.map(o => [o.typ, o.d, o.foto]), [['antal', -1, '2:f'], ['koll', undefined, undefined]]);
  r = spara(a, r, en);
  let s = rad(a, r, 'Swamp');
  assert.strictEqual(s.n, 7, 'One: ett exemplar ur leken');
  assert.deepStrictEqual(s.foto, { '1:f': 7 }, 'ur fotot frågan kom ur');
  assert.strictEqual(s.koll, undefined, 'frågan är borta');
  const efter = JSON.stringify(las(a, r));
  r = spara(a, r, en);
  assert.strictEqual(JSON.stringify(las(a, r)), efter, 'samma ändringar en gång till gör ingenting (klara)');
  /* Two: båda står kvar. */
  r = lek([dubbelRad()]);
  r = spara(a, r, [a.lsfTva(rad(a, r, 'Swamp'))]);
  s = rad(a, r, 'Swamp');
  assert.strictEqual(s.n, 8); assert.strictEqual(s.koll, undefined); assert.deepStrictEqual(s.foto, { '1:f': 7, '2:f': 1 });
  /* Två exemplar i frågan: ett svar i taget, frågan räknas ned. */
  r = lek([dubbelRad({ rad: { n: 9, foto: { '1:f': 7, '2:f': 2 } }, dubbel: { n: 2 } })]);
  r = spara(a, r, a.lsfEn(rad(a, r, 'Swamp')));
  s = rad(a, r, 'Swamp');
  assert.strictEqual(s.n, 8); assert.strictEqual(s.koll.dubbel.n, 1); assert.strictEqual(a.lsfFall(s), 'LR1');
  r = spara(a, r, [a.lsfTva(s)]);
  s = rad(a, r, 'Swamp');
  assert.strictEqual(s.n, 8); assert.strictEqual(s.koll, undefined);
  /* Ett andra tryck på One efter det första: raden har ingen fråga, och lsfTryck stoppar dubbelklicket. */
  const kn = a.lsfKnTom(), ko = a.lsfKo([dubbelRad()]);
  a.lsfOmgang(kn, ko);
  assert.strictEqual(a.lsfTryck(kn, kn.nu, 1000), true);
  assert.strictEqual(a.lsfTryck(kn, kn.nu, 1200), false);
};
fall('B8 LR1: One tar ett exemplar ur fotot frågan kom ur, en gång; Two behåller båda; två exemplar frågas ett i taget', provB8);
const provD5 = a => {
  const t = nyTel();
  foto(t, '1:f', 'klar', { hittade: 8, kort: [{ name: 'Swamp', las: 'Swamp', x: 500, y: 500 }, ...Array.from({ length: 7 }, (_, i) => ({ name: 'Kort ' + i, las: 'Kort ' + i, x: 500, y: 100 + 100 * i }))] });
  foto(t, '2:f', 'klar', { hittade: 1, kort: [{ name: 'Swamp', las: 'Swamp', x: 1000, y: 200, dubbel: '1:f' }] });
  t.foton.get('1:f').kort[0].dubbel = '2:f';
  let r = lek([K('Swamp', { n: 2, foto: { '1:f': 1, '2:f': 1 }, koll: { las: 'Swamp', kalla: 'Photo 2', sakert: 1, dubbel: { fid: '1:f', nr: 1, ny: '2:f', n: 1 } } })]);
  assert.deepStrictEqual([...a.lsfBlIFoton(las(a, r), t)], [['Swamp', 2]], 'räknas som två tills man svarar');
  r = spara(a, r, a.lsfEn(rad(a, r, 'Swamp')));
  assert.deepStrictEqual([...a.lsfBlIFoton(las(a, r), t)], [['Swamp', 1]], 'One: "1 Swamp was in the photos", inte två');
  assert.strictEqual(a.lsfBlText(las(a, r), t).var, '1 Swamp was in the photos.');
};
fall('D5 "N were in the photos" följer svaret på One Swamp or two? (kortet räknas ur bokföringen, inte ur läsningen)', provD5);
/* D3: basländerna ur fotona följer inte −. */
const provD3 = a => {
  let r = lek([K('Plains', { n: 7, foto: { '1:f': 7 } })]);
  r = spara(a, r, [{ typ: 'antal', name: 'Plains', sb: false, d: -1 }, { typ: 'antal', name: 'Plains', sb: false, d: -1 }]);
  const kort = las(a, r);
  assert.strictEqual(rad(a, r, 'Plains').n, 5);
  assert.deepStrictEqual(rad(a, r, 'Plains').foto, { '1:f': 5 }, 'bokföringen följer antalet (taket)');
  const t = nyTel();
  foto(t, '1:f', 'klar', { hittade: 7, kort: Array.from({ length: 7 }, () => ({ name: 'Plains', las: 'Plains', x: 1, y: 1 })) });
  assert.strictEqual(a.lsfBlText(kort, t).var, '7 Plains were in the photos.', 'telefonens läsning av fotot');
  assert.strictEqual(a.lsfBlText(kort, t).lagt, '');
  assert.deepStrictEqual([...a.lsfBlIFoton(kort, t)], [['Plains', 7]], '"7 in photos" under landet');
  /* Utan telefonens beskrivning (omladdning utan telefonen): bokföringen. */
  assert.strictEqual(a.lsfBlText(kort).var, '5 Plains were in the photos.');
};
fall('D3 två tryck på − under Plains: "7 Plains were in the photos" står kvar (telefonens läsning av fotot)', provD3);
/* D4: en gissning i telefonens läsning som rättats i Check names räknas
   som det rättade kortet, ett kort (kontrollgranskningen av MES-323). */
const provD4 = a => {
  let r = lek([gissning('Plains', 'Plans', 1, { foto: { '1:f': 1 } })]);
  r = spara(a, r, [a.lsfValj(rad(a, r, 'Plains'), { name: 'Island', sid: 's-island' })]);
  const kort = las(a, r);
  assert.deepStrictEqual(kort.map(k => [k.name, k.n, JSON.stringify(k.foto)]), [['Island', 1, '{"1:f":1}']], 'byt behåller fotot');
  const t = nyTel();
  foto(t, '1:f', 'klar', { hittade: 1, kort: [{ name: 'Plains', las: 'Plans', koll: true, x: 1, y: 1 }] });
  assert.deepStrictEqual([...a.lsfBlIFoton(kort, t)], [['Island', 1]], 'inget "1 in photos" under Plains');
  assert.strictEqual(a.lsfBlText(kort, t).var, '1 Island was in the photos.');
};
fall('D4 en gissning Plains som rättas till Island i Check names: "1 Island was in the photos", ett kort', provD4);
/* B7: Remove och Undo, med fotot. */
const provB7 = a => {
  let r = lek(idLek());
  const g = rad(a, r, 'Gorgon Flail');
  const undo = { typ: 'antal', name: g.name, sb: false, d: g.n, kort: a.lsfMall(g) };   // som omvandning() bygger den
  r = spara(a, r, [a.lsfBort(g)]);
  assert.strictEqual(rad(a, r, 'Gorgon Flail'), null);
  r = spara(a, r, [undo]);
  assert.deepStrictEqual(rad(a, r, 'Gorgon Flail').foto, { '1:f': 1 }, 'fotot följer med tillbaka');
  assert.ok(rad(a, r, 'Gorgon Flail').koll, 'och frågan');
  r = spara(a, r, [{ typ: 'fotobort', foto: '1:f' }]);
  assert.strictEqual(rad(a, r, 'Gorgon Flail'), null, 'Remove photo 1 tar den igen');
};
fall('B7 Remove (eller Not a card) och Undo: raden kommer tillbaka med fotot den kom ur', provB7);
/* G1: fältet för de undanlagda korten töms direkt. */
const provG1 = a => {
  const inp = { value: 'Vraska’s Contempt' }, lagt = [];
  /* Som kopplaSok utan förslag: Enter tar det som står i fältet. */
  const enter = () => { const t = inp.value.trim(); if (t) a.lsfUndanValj(inp, t, n => lagt.push(n)); };
  enter(); enter();
  assert.deepStrictEqual(lagt, ['Vraska’s Contempt'], 'ett kort, inte två');
  assert.strictEqual(inp.value, '');
};
fall('G1 ID2/N9: två Enter medan kortet slås upp lägger in det en gång (fältet töms direkt)', a => {
  provG1(a);
  assert.ok(funktionskropp(SRC, 'kopplaUndan').includes('lsfUndanValj('), 'fältet på skärmen går genom lsfUndanValj');
});

/* ── F: proven faller utan koden de skyddar ─────────────────────────── */
function maste(namn, byt, prov) {
  let m;
  try { m = ladda(byt); } catch (e) { fel++; console.log('FEL  ' + namn + ': ' + e.message); return; }
  let foll = false;
  try { prov(m); } catch (e) { foll = true; }
  if (foll) { ok++; console.log('OK   ' + namn); }
  else { fel++; console.log('FEL  ' + namn + ': provet höll också utan skyddet'); }
}
maste('F1 utan kontrollen av kortet framme svarar ett sent tryck på nästa kort (B6 faller)',
  [['if (!kn || !key || key !== kn.nu) return false;', 'if (!kn || !key) return false;']],
  m => {
    const kn = m.lsfKnTom(), ko = m.lsfKo(idLek());
    m.lsfOmgang(kn, ko);
    const forsta = kn.nu;
    m.lsfTryck(kn, forsta, 1000);
    m.lsfOmgang(kn, ko.slice(1));
    assert.strictEqual(m.lsfTryck(kn, forsta, 2000), false);
  });
maste('F2 utan tidsspärren svarar ett dubbelklick två gånger (B6 faller)',
  [['if (t - (kn.sist || 0) < LSF_TRYCK_MS) return false;', '']],
  m => {
    const kn = m.lsfKnTom(), ko = m.lsfKo(idLek());
    m.lsfOmgang(kn, ko);
    assert.strictEqual(m.lsfTryck(kn, kn.nu, 1000), true);
    assert.strictEqual(m.lsfTryck(kn, kn.nu, 1100), false);
  });
maste('F3 utan filtret i lekSpelbara räknas platshållarna i decks.antal (C1 faller)',
  [['const lekSpelbara = kort => (kort || []).filter(k => k && !k.okand);', 'const lekSpelbara = kort => (kort || []).filter(k => k);']],
  m => { assert.strictEqual(m.lekSpelAntal(idLek()), 24 + 7 + 5 + 2); });
maste('F4 utan "högst radens antal" räknas fler basländer ur fotona än leken har (D2 faller)',
  [['const c2 = Math.min(rest, +c || 0);', 'const c2 = +c || 0;']],
  m => { assert.deepStrictEqual([...m.lsfBlIFoton([K('Swamp', { n: 3, foto: { '1:f': 2, '2:f': 4 } })])], [['Swamp', 3]]); });
maste('F5 utan kravet på två kandidater blir en ensam träff "Which of these is it?" (A1 faller)',
  [["return Array.isArray(kand) && kand.length >= 2 ? 'B' : 'C';", "return Array.isArray(kand) && kand.length >= 1 ? 'B' : 'C';"]],
  m => { assert.strictEqual(m.lsfFall(platshallare('Killing', 1, 'u2'), ['Killing Glare']), 'C'); });
/* F6: E6 läser skärmarnas copy. Samma mutation som granskningen gjorde. */
{
  const namn = 'F6 "Step 3 of 4 — …" i Check names (knHtml) fälls av E6';
  const mut = SRC.replace('The name couldn’t be read. Type what you see on the card.', 'Step 3 of 4 — The name couldn’t be read.');
  let n = -1;
  try { n = mut === SRC ? -1 : copyFel(mut).length; } catch (e) { n = -2; }
  if (n === -1) { fel++; console.log('FEL  ' + namn + ': mutationen hittar inte copyn'); }
  else if (n === -2) { fel++; console.log('FEL  ' + namn + ': skärmarnas funktioner går inte att läsa'); }
  else if (n >= 2) { ok++; console.log('OK   ' + namn); }
  else { fel++; console.log('FEL  ' + namn + ': provet höll också med copyn'); }
}
maste('F7 utan foto i lsfMall kommer raden tillbaka utan foto efter Undo (B7 faller)',
  [[', okand: k.okand, foto: k.foto });', ', okand: k.okand });']], provB7);
maste('F8 utan att fältet töms direkt lägger två Enter in kortet två gånger (G1 faller)',
  [["  inp.value = '';\n  lagg(t);", '  lagg(t);']], provG1);
maste('F9 utan Later i klar blir en lek med namn lämnade till senare aldrig klar (E7 faller)',
  [['klar: undanKlar && blKlar && (kollKlar || !!s.senare)', 'klar: undanKlar && blKlar && kollKlar']], provE7);
maste('F10 utan telefonens läsning följer "in the photos" − under landet (D3 faller)',
  [['for (const [namn, n] of c) satt(namn, f.fid, n);', '']], provD3);
maste('F12 utan sakert i lsfJa försvinner dubbel-frågan när namnet bekräftas (A3 faller)',
  [["koll: k.koll && k.koll.dubbel ? Object.assign({}, k.koll, { sakert: 1 }) : null });", 'koll: null });']], provA3);
maste('F13 räknas ett dubbel-kort också ur läsningen blir det "2 Swamps were in the photos" efter One (D5 faller)',
  [['if (k && !k.okand && !k.koll && !k.dubbel && LSF_BASLAND.includes(k.name))', 'if (k && !k.okand && !k.koll && LSF_BASLAND.includes(k.name))']], provD5);
maste('F14 utan fotot i One:s avdrag står exemplaret kvar i fotots bokföring (B8 faller)',
  [['  if (ny) op.foto = ny;\n', '\n']], provB8);
maste('F11 med gissningarna i telefonens läsning räknas ett rättat kort två gånger (D4 faller)',
  [['if (k && !k.okand && !k.koll && !k.dubbel && LSF_BASLAND.includes(k.name))', 'if (k && !k.okand && !k.dubbel && LSF_BASLAND.includes(k.name))']], provD4);

console.log(`\nlekfoto-slut: ${ok} OK, ${fel} FEL`);
process.exit(fel ? 1 : 0);

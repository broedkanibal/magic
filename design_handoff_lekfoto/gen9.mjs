// Sida I (Jesper 2026-09-27): ingen NEXT-ruta; resultatraderna kvar, med var och hur det rättas i klartext;
// "I'm done" går inte att missa (två lika stora val direkt under resultatet); kort som inte hittas läggs
// undan och skrivs in på datorn efteråt; datorn använder Check names, ett kort i taget.
import { fs, path, OUT, C, SANS, MONO, bild, F07, F06, F05, F15, ik, knapp, kortRuta, sektion, basland, TYP, BLA, ROD, sida, t, stor, etik, pk, laggAnim, ansl, vantar, fotoRadH, fotoLitet, sidan, granskare, FALL, sokF, tk, textKnapp as hText } from './delar5.mjs';

const filer = {};
const skriv = (n, h) => { filer[n] = h; };

/* ── Telefonen ── */
function radS(typ, titel, under) {
  const ikon = typ === 'kort' ? [BLA, '#fff', ik.check(12, 3.2), ''] : typ === 'namn' ? [C.green, C.ink, ik.check(12, 3.2), ''] : typ === 'kolla' ? ['#3a2e14', C.acc, '?', `border: 1.5px solid ${C.acc};`] : typ === 'saknas' ? [C.acc, C.ink, '!', ''] : [ROD, '#fff', '!', ''];
  return `<div style="display: flex; gap: 12px; align-items: flex-start; padding: 9px 0"><span style="width: 22px; height: 22px; border-radius: 6px; display: grid; place-items: center; flex: none; box-sizing: border-box; background: ${ikon[0]}; color: ${ikon[1]}; font: 800 12px ${SANS}; ${ikon[3]}">${ikon[2]}</span><span style="display: flex; flex-direction: column; gap: 2px; min-width: 0"><b style="font: 650 15px/1.3 ${SANS}">${titel}</b>${under ? `<span style="font: 400 13.5px/1.4 ${SANS}; color: ${C.dim}">${under}</span>` : ''}</span></div>`;
}
const rader = (...r) => `<div style="display: flex; flex-direction: column; padding: 2px 14px; border-radius: 12px; background: ${C.bg2}; border: 1px solid ${C.line}">${r.join(`<i style="height: 1px; background: ${C.line}"></i>`)}</div>`;
/* Två lika stora val: fler foton, eller klar. Ingen av dem kan missas. */
function valen(nr) {
  const ruta = (prim, ikon, titel, under) => `<button type="button" style="display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 14px; min-height: 108px; box-sizing: border-box; border-radius: 14px; cursor: pointer; text-align: left; ${prim ? `background: ${C.acc}; color: ${C.ink}; border: 0` : `background: ${C.bg3}; color: ${C.txt}; border: 1.5px solid #9aa7ba`}"><span style="display: grid; place-items: center">${ikon}</span><b style="font: 700 17px ${SANS}">${titel}</b><span style="font: 500 13px/1.35 ${SANS}; ${prim ? 'color: #3d2a0c' : `color: ${C.dim}`}">${under}</span></button>`;
  return `<div style="display: flex; flex-direction: column; gap: 8px">${etik('WHAT’S NEXT?', C.dim)}<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">${ruta(true, ik.camera(22), `Take photo ${nr}`, 'More cards to photograph')}${ruta(false, ik.check(22, 2.6), 'I’m done', 'Every card is photographed')}</div></div>`;
}
const textKnapp = (s, ikon = ik.rotate(16)) => `<button type="button" style="align-self: center; height: 40px; padding: 0 10px; border: 0; background: transparent; color: ${C.txt}; font: 600 15px ${SANS}; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; text-decoration: underline; text-underline-offset: 4px; text-decoration-color: #5b6679">${ikon}${s}</button>`;
const stor1 = (s) => `<button type="button" style="height: 54px; width: 100%; border-radius: 12px; font: 650 16px ${SANS}; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 9px; background: ${C.acc}; color: ${C.ink}; border: 0">${s}</button>`;
function telefon(titel, rubrik, kropp, o = {}) {
  return sida(titel, 390, 844, `<div style="position: relative; width: 390px; height: 844px; box-sizing: border-box; background: ${C.bg}; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column; padding: 16px 18px 20px; gap: 12px; overflow: hidden">`
    + `<div style="display: flex; align-items: center; justify-content: space-between"><span style="display: flex; align-items: center; gap: 8px; font: 600 13px ${SANS}; color: ${C.green}"><i style="width: 8px; height: 8px; border-radius: 50%; background: ${C.green}"></i>New deck 3</span><span style="font: 600 13px ${SANS}; color: ${C.dim}">${o.foto || 'Photo 1'}</span></div>`
    + `<h1 style="margin: 18px 0 8px; font: 750 25px/1.2 ${SANS}; letter-spacing: -0.4px">${rubrik}</h1>${kropp}</div>`);
}
const fot = (...k) => `<span style="flex-grow: 1"></span><div style="display: flex; flex-direction: column; gap: 8px; padding-top: 4px">${k.join('')}</div>`;
const hLank = (s) => `<button type="button" style="height: 40px; border: 0; background: transparent; color: ${C.txt}; font: 600 15px ${SANS}; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer">${ik.next(14)}${s}</button>`;
const vanlig = (nr) => fot(tk(`Take photo ${nr}`, 'prim', ik.camera()), tk('Done photographing', 'sek'), hText('Retake photo 1'));
const sistaFoto = 'On the computer, when you’re done.';
const undan = 'Marked in the photo. Put them aside and type them in on the computer when you’re done.';

skriv('I1.dc.html', telefon('I1: photo added, all names read', 'Photo 1 added',
  rader(radS('kort', '12 cards found', 'Every card on the table should have a check in the photo.'), radS('namn', 'All 12 names read')) + fotoLitet() + vanlig(2)));
skriv('I2.dc.html', telefon('I2: photo added, 2 names to check', 'Photo 1 added',
  rader(radS('kort', '12 cards found', 'Every card on the table should have a check in the photo.'), radS('namn', '10 names read'), radS('kolla', '2 names to check', sistaFoto)) + fotoLitet() + vanlig(2)));
skriv('I3.dc.html', telefon('I3: cards not found, put them aside', '3 cards were missed',
  rader(radS('kort', '9 cards found, all names read'), radS('saknas', '3 cards missed', undan)) + fotoLitet({ bort: [9, 10, 11], zoner: [[830, 790, 520, 560]] }) + vanlig(2)));
skriv('I4.dc.html', telefon('I4: cards not found and a name to check', '2 cards were missed',
  rader(radS('kort', '10 cards found, 9 names read'), radS('saknas', '2 cards missed', undan), radS('kolla', '1 name to check', sistaFoto)) + fotoLitet({ bort: [10, 11], zoner: [[850, 1000, 500, 350]] }) + vanlig(2)));
skriv('I5.dc.html', telefon('I5: more found than on the table', 'Photo 1 added',
  rader(radS('kort', '13 cards found', 'More than on the table? Something that isn’t a card got counted. You remove it on the computer, after the last photo.'), radS('namn', '12 names read')) + fotoLitet() + vanlig(2)));
skriv('I6.dc.html', telefon('I6: no cards found', 'No cards in this photo',
  rader(radS('saknas', 'Nothing was added', 'Hold the phone straight above the cards, with every name line showing and no reflections.')) + fotoLitet({ ingen: true, dim: true })
  + fot(tk('Retake photo 1', 'prim', ik.rotate(18)), hLank('Put these cards aside, type them in later'))));
skriv('I7.dc.html', telefon('I7: cards found, no names readable', 'The names couldn’t be read',
  rader(radS('kort', '6 cards found'), radS('fel', 'No names read, so nothing was added', 'Retake a little closer, with fewer cards in the photo.')) + fotoLitet({ bort: [6, 7, 8, 9, 10, 11], dim: true })
  + fot(tk('Retake photo 1', 'prim', ik.rotate(18)), hLank('Put these cards aside, type them in later'))));
skriv('I8.dc.html', telefon('I8: the photo wasn’t sent', 'Photo 1 wasn’t sent',
  rader(radS('fel', 'The connection dropped', 'Nothing was added yet. The photo is kept, so you don’t need a new one.')) + fotoLitet({ ingen: true, dim: true })
  + fot(tk('Try again'), hText('Retake photo 1'))));
skriv('I9.dc.html', telefon('I9: read, but not saved', 'Photo 1 wasn’t saved',
  rader(radS('kort', '12 cards read'), radS('fel', 'Not saved to the deck yet', 'The cards are waiting on the phone. Check the connection, no new photo needed.')) + fotoLitet({ dim: true })
  + fot(tk('Try again'))));
skriv('I10.dc.html', telefon('I10: done, continue on the computer', 'Continue on the computer',
  `<span style="font: 400 15px/1.5 ${SANS}; color: ${C.dim}">The photos are in the deck. Finish it on the computer.</span>`
  + rader(radS('kort', '38 cards found in 4 photos'), radS('kolla', '3 names to check'), radS('saknas', '3 cards to type in', 'The ones you put aside.'), radS('namn', 'Basic lands', '7 Plains and 5 Swamps were in the photos.'))
  + `<span style="flex-grow: 1"></span>` + `<div style="display: flex; justify-content: center; color: #b9c8ff">${ik.laptop(56)}</div><span style="flex-grow: 1"></span>`
  + `<button type="button" style="height: 52px; width: 100%; border-radius: 12px; font: 650 16px ${SANS}; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 9px; background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}">${ik.camera()}I forgot some, take another photo</button>`, { foto: 'Done' }));

/* ── Datorn ── */
const flikar2 = (aktiv) => `<div role="tablist" style="display: grid; grid-template-columns: 1.25fr 1fr 0.7fr; gap: 4px; padding: 4px; border-radius: 10px; border: 1px solid ${C.line}; background: ${C.bg}">${[['Take photos', ik.camera(15)], ['Paste a list', ik.list()], ['Type', ik.kb()]].map(([s, i], j) => `<button type="button" role="tab" aria-selected="${j === aktiv}" style="height: 32px; border-radius: 7px; border: ${j === aktiv ? '1px solid #3d4a5f' : '0'}; background: ${j === aktiv ? C.bg3 : 'transparent'}; color: ${j === aktiv ? C.txt : C.dim}; font: 600 12.5px ${SANS}; display: flex; align-items: center; justify-content: center; gap: 7px; cursor: pointer">${i}${s}</button>`).join('')}</div>`;
const stegKort = (nr, titel, text, nu, klar) => `<li style="display: flex; gap: 12px; padding: 12px 14px; border-radius: 11px; ${nu ? 'background: #1d1810; border: 1px solid #6a5220' : `background: ${C.bg2}; border: 1px solid ${C.line}`}"><span style="width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; flex: none; font: 700 11.5px ${MONO}; ${klar ? `background: #0f2016; border: 1px solid #2f6b47; color: #8fe0b0` : nu ? `background: ${C.acc}; color: ${C.ink}` : `border: 1px solid #39445a; color: ${C.dim}`}">${klar ? ik.check(11, 3) : nr}</span><span style="display: flex; flex-direction: column; gap: 4px"><b style="font: 650 14px ${SANS}; ${klar ? `color: ${C.dim}; text-decoration: line-through` : ''}">${titel}</b>${text ? t(text, 'font-size: 12.5px') : ''}</span></li>`;
const panelKlar = (aktiv) => `<div style="display: flex; flex-direction: column; gap: 6px">${stor('4 photos, 38 cards added')}${t('Three things left, in this order.')}</div>`
  + `<ol style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px">`
  + stegKort(1, 'Check 3 names', aktiv === 1 ? 'Shown one at a time on the right.' : '', aktiv === 1, aktiv > 1)
  + stegKort(2, 'Type in the 3 cards you put aside', aktiv === 2 ? '' : 'The ones the photos didn’t find.', aktiv === 2, aktiv > 2)
  + stegKort(3, 'Basic lands', '7 Plains and 5 Swamps were in the photos. Add any you didn’t photograph, at the bottom.', aktiv === 3, false) + `</ol>`;
function sidanI(titel, flik, panelHtml, hoger, antal, o = {}) {
  /* sidan() ritar Take photos-fliken; här byts flikraden mot den som är vald. */
  return sidan(titel, panelHtml, hoger, antal, o).replace(/<div role="tablist"[\s\S]*?<\/div>/, flikar2(flik));
}
const typSteg = `<div style="display: flex; flex-direction: column; gap: 6px">${etik('STEP 2 OF 3')}${stor('Type in the 3 cards you put aside')}${t('Type a name and press Enter. The card goes into the deck.')}</div>`
  + `<div style="display: flex; align-items: center; gap: 10px"><div style="flex-grow: 1; height: 6px; border-radius: 3px; background: ${C.bg4}"><i style="display: block; width: 33%; height: 6px; border-radius: 3px; background: ${C.green}"></i></div><b style="font: 600 12.5px ${MONO}; color: ${C.dim}">1 of 3</b></div>`
  + sokF('Vras', 'Card name', [['Vraska’s Finisher', 'Vraska’s Finisher'], ['Vraska’s Contempt', null], ['Vraska, Golgari Queen', null]])
  + `<div style="display: flex; flex-direction: column; gap: 6px">${etik('ADDED', C.dim)}<div style="display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 9px; background: ${C.bg2}; border: 1px solid ${C.line}"><img src="${bild('Night’s Whisper')}" alt="" style="width: 24px; height: 33px; border-radius: 2px"><span style="flex-grow: 1; font: 500 13.5px ${SANS}">Night’s Whisper</span>${pk(ik.undo() + 'Undo', 'ghost', 'height: 30px')}</div></div>`
  + `<span style="flex-grow: 1"></span>${pk('I’m done, go to basic lands', 'sek', 'align-self: flex-start')}`;
const ALLA2 = Object.values(TYP).flat().filter(n => !['Hooded Blightfang', 'Vraska’s Finisher', 'Serpent Assassin'].includes(n));
const gridI = (o = {}) => Object.entries(TYP).map(([typ, l]) => { const x = l.filter(n => ALLA2.includes(n) || (o.extra || []).includes(n)); return x.length ? sektion(typ, x.length, x.map(n => kortRuta(n, { check: (o.check || []).includes(n), ny: (o.ny || []).includes(n), w: 78 })).join('')) : ''; }).join('');
const typaBar = `<div style="display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-radius: 12px; border: 1px solid ${C.line}; background: ${C.bg2}"><span style="width: 24px; height: 24px; border-radius: 6px; display: grid; place-items: center; background: ${C.acc}; color: ${C.ink}; font: 800 12px ${SANS}">!</span><b style="font: 650 14.5px ${SANS}">3 cards to type in</b><span style="font: 400 13px ${SANS}; color: ${C.dim}">The ones you put aside because the photos didn’t find them.</span><span style="flex-grow: 1"></span>${pk('Next, after the names', 'ghost', 'height: 34px')}</div>`;
skriv('ID1.dc.html', sidanI('ID1: computer, check names first', 0, panelKlar(1),
  granskare('', 960) + typaBar + gridI({ check: ['Gorgon Flail', 'Venomous Hierophant'] }) + basland({ Plains: 7, Swamp: 5 }, '7 Plains and 5 Swamps were in the photos. Add the ones you didn’t photograph.', { Plains: 7, Swamp: 5 }), '35 cards', { sidaO: FALL }));
const klarBar = `<div style="display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-radius: 12px; background: #0f1d15; border: 1px solid #24503a"><span style="color: ${C.green}">${ik.check(18, 2.8)}</span><b style="font: 700 14.5px ${SANS}">All names checked</b><span style="font: 400 13px ${SANS}; color: ${C.dim}">Hooded Blightfang added, Gorgon Flail and Venomous Hierophant confirmed.</span></div>`;
skriv('ID2.dc.html', sidanI('ID2: computer, type in the cards you put aside', 2, typSteg,
  klarBar + gridI({ extra: ['Hooded Blightfang', 'Night’s Whisper'], ny: ['Night’s Whisper'] }) + basland({ Plains: 7, Swamp: 5 }, '7 Plains and 5 Swamps were in the photos. Add the ones you didn’t photograph.', { Plains: 7, Swamp: 5 }), '37 cards'));
skriv('ID3.dc.html', sidanI('ID3: computer, basic lands last', 0, panelKlar(3),
  `<div style="display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-radius: 12px; background: #0f1d15; border: 1px solid #24503a"><span style="color: ${C.green}">${ik.check(18, 2.8)}</span><b style="font: 700 14.5px ${SANS}">Names checked, and the 3 cards you put aside are in</b></div>`
  + gridI({ extra: ['Hooded Blightfang', 'Vraska’s Finisher', 'Serpent Assassin'] })
  + `<div style="padding: 14px 16px; border-radius: 12px; border: 1.5px solid #8a6a24; background: #17140e">${basland({ Plains: 7, Swamp: 7 }, '7 Plains and 5 Swamps were in the photos. You added 2 Swamps. 40 cards.', { Plains: 7, Swamp: 5 })}</div>`, '40 cards'));

/* Panelen under fotograferingen, med raden "Put aside" som växer. */
skriv('IP1.dc.html', sida('IP1: the panel after photo 2', 420, 900, `<aside style="width: 420px; height: 900px; box-sizing: border-box; padding: 20px 22px; background: #11151c; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column; gap: 14px; overflow: hidden; border-right: 1px solid ${C.line}"><b style="font: 700 15px ${SANS}">Add cards</b>${flikar2(0)}`
  + ansl + fotoRadH(1, F07, '12 cards added') + fotoRadH(2, F06, '9 cards added · 3 put aside · 1 name to check')
  + `<div style="display: flex; flex-direction: column; gap: 6px; padding-top: 4px">${stor('Lay out the next 10–15 cards')}${t('Then take photo 3 with your phone. The 3 cards you put aside are typed in at the end.')}</div>`
  + laggAnim(376, 170, { per: 3 }) + vantar('Waiting for photo 3')
  + `<span style="flex-grow: 1"></span><div style="display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: 12px; border: 1.5px solid #9aa7ba; background: ${C.bg2}"><b style="font: 650 14px ${SANS}">Every card photographed?</b>${pk(ik.check(15) + 'I’m done', 'sek', 'align-self: flex-start')}</div></aside>`));

/* ── index: sida I ── */
const LAST = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const PW = 390, PH = 844, DW = 1440, DH = 900, GX = 80, RY = 343;
const Y = [0, PH + RY];
const plats = {};
['I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8', 'I9', 'I10'].forEach((n, i) => { plats[n + '.dc.html'] = [i * (PW + GX), Y[0], PW, PH]; });
const tit = { I1: 'I1 · All found, all names read', I2: 'I2 · All found, 2 names to check', I3: 'I3 · 3 cards not found: put them aside', I4: 'I4 · Not found, and a name to check', I5: 'I5 · One more than on the table', I6: 'I6 · No cards found', I7: 'I7 · No names readable', I8: 'I8 · Not sent', I9: 'I9 · Not saved', I10: 'I10 · Done: continue on the computer',
  IP1: 'IP1 · The panel after photo 2', ID1: 'ID1 · Step 1: check names, one at a time (Tweaks: case)', ID2: 'ID2 · Step 2: type in the cards you put aside', ID3: 'ID3 · Step 3: basic lands' };
plats['IP1.dc.html'] = [0, Y[1], 420, 900];
plats['ID1.dc.html'] = [420 + GX, Y[1], DW, DH];
plats['ID2.dc.html'] = [420 + GX + DW + GX, Y[1], DW, DH];
plats['ID3.dc.html'] = [420 + GX + 2 * (DW + GX), Y[1], DW, DH];
const pages = (LAST.pages || []).filter(p => p.id !== 'i');
pages.unshift({ id: 'i', name: 'I · Put aside, type in later' });
const boards = Object.assign({}, LAST.boards), order = LAST.order.slice();
for (const [f, [x, y, w, h]] of Object.entries(plats)) { boards[f] = { x, y, w, h, title: tit[f.replace('.dc.html', '')], page: 'i' }; if (!order.includes(f)) order.push(f); }
const notes = Object.assign({}, LAST.notes, {
  i0: { x: 0, y: Y[0] - 260, text: 'The phone after each photo', kind: 'title1', maxW: 10 * PW + 9 * GX, page: 'i' },
  i1: { x: 0, y: Y[1] - 260, text: 'The computer: names, the cards you put aside, basic lands', kind: 'title1', maxW: 420 + 3 * DW + 3 * GX, page: 'i' },
});
const canvas = Object.assign({}, LAST, { pages, boards, order, notes, launch: { view: 'canvas', page: 'i' } });
for (const [n, h] of Object.entries(filer)) fs.writeFileSync(path.join(OUT, n), h);
fs.writeFileSync(path.join(OUT, 'canvas.json'), JSON.stringify(canvas, null, 1));
const streck = Object.entries(filer).filter(([, h]) => /—/.test(h));
console.log(Object.keys(filer).join(' '), streck.length ? 'TANKSTRECK: ' + streck.map(([n]) => n).join(' ') : 'inga tankstreck');

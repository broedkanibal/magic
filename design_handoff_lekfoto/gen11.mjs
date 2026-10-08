// Sida K (Jesper 2026-09-27): en design per fall, inga alternativ blandade. Fallen i fyra grupper:
// fotot fungerade · samma kort igen · fotot gick inte att använda · tekniskt fel. Under varje skärm en
// lapp: vad som hände, vad Mesa vet, vad du gör. Samma mönster överallt: etikett PHOTO n, rubrik med
// vad Mesa hittade, frågan mot bordet, rader, fotot med bockar, H:s knappar.
import { fs, path, OUT, C, SANS, MONO, bild, F07, F06, ik, BLA, ROD, sida, etik, pk, tk, textKnapp as hText, remsa } from './delar5.mjs';

const F16 = { url: '/_blob/c886ad6acccd5ab346b12a7129ead44d', w: 1500, h: 1125 };
const filer = {};
const skriv = (n, h) => { filer[n] = h; };

function radS(typ, titel, under) {
  const ikon = typ === 'kand' ? [C.green, C.ink, ik.check(12, 3.2), ''] : typ === 'kolla' ? ['#3a2e14', C.acc, '?', `border: 1.5px solid ${C.acc};`] : typ === 'varn' ? [C.acc, C.ink, '!', ''] : [ROD, '#fff', '!', ''];
  return `<div style="display: flex; gap: 12px; align-items: flex-start; padding: 10px 0"><span style="width: 22px; height: 22px; border-radius: 6px; display: grid; place-items: center; flex: none; box-sizing: border-box; background: ${ikon[0]}; color: ${ikon[1]}; font: 800 12px ${SANS}; ${ikon[3]}">${ikon[2]}</span><span style="display: flex; flex-direction: column; gap: 2px; min-width: 0"><b style="font: 650 15px/1.3 ${SANS}">${titel}</b>${under ? `<span style="font: 400 13.5px/1.4 ${SANS}; color: ${C.dim}">${under}</span>` : ''}</span></div>`;
}
const rader = (...r) => `<div style="display: flex; flex-direction: column; padding: 2px 14px; border-radius: 12px; background: ${C.bg2}; border: 1px solid ${C.line}">${r.join(`<i style="height: 1px; background: ${C.line}"></i>`)}</div>`;
function telefon(titel, etikett, rubrik, under, kropp, knappar) {
  return sida(titel, 390, 844, `<div style="position: relative; width: 390px; height: 844px; box-sizing: border-box; background: ${C.bg}; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column; padding: 16px 18px 20px; overflow: hidden">`
    + `<span style="display: flex; align-items: center; gap: 8px; font: 600 13px ${SANS}; color: ${C.green}"><i style="width: 8px; height: 8px; border-radius: 50%; background: ${C.green}"></i>New deck 3</span>`
    + `<div style="display: flex; flex-direction: column; gap: 6px; margin: 22px 0 18px">${etik(etikett, C.dim)}<h1 style="margin: 0; font: 750 26px/1.2 ${SANS}; letter-spacing: -0.4px">${rubrik}</h1>${under ? `<span style="font: 400 15px/1.45 ${SANS}; color: ${C.dim}">${under}</span>` : ''}</div>`
    + `<div style="display: flex; flex-direction: column; gap: 12px">${kropp}</div>`
    + `<span style="flex-grow: 1"></span><div style="display: flex; flex-direction: column; gap: 8px; padding-top: 12px">${knappar}</div></div>`);
}
const T07 = [[215, 360], [200, 500], [185, 680], [230, 840], [230, 990], [235, 1165], [825, 395], [845, 535], [870, 725], [870, 850], [880, 1040], [910, 1200]];
function foto(o = {}) {
  const f = o.f || F07, dw = 354, s = dw / f.w, top = o.top ?? 280, dh = o.dh || 232;
  const m = o.ingen ? '' : T07.map(([x, y], i) => (o.bort || []).includes(i) ? '' : `<span style="position: absolute; left: ${Math.round(x * s) - 2}px; top: ${Math.round((y - top) * s)}px; width: 16px; height: 16px; border-radius: 50%; display: grid; place-items: center; background: ${BLA}; color: #fff; box-shadow: 0 0 0 2px #0d1015aa; animation: bock 7s ${(0.18 * i).toFixed(2)}s infinite both">${ik.check(10, 3.4)}</span>`).join('');
  const extra = (o.extra || []).map(([x, y]) => `<span style="position: absolute; left: ${Math.round(x * s) - 2}px; top: ${Math.round((y - top) * s)}px; width: 16px; height: 16px; border-radius: 50%; display: grid; place-items: center; background: ${BLA}; color: #fff; box-shadow: 0 0 0 2px #0d1015aa">${ik.check(10, 3.4)}</span>`).join('');
  return `<div style="position: relative; width: ${dw}px; height: ${dh}px; border-radius: 10px; overflow: hidden; flex: none; ${o.dim ? 'filter: grayscale(.5) brightness(.6);' : ''}"><img src="${f.url}" alt="The photo" style="position: absolute; left: 0; top: ${-Math.round(top * s)}px; width: ${dw}px; height: ${Math.round(f.h * s)}px">${m}${extra}</div>`;
}
const jamfor = 'Does every card on the table have a check?';
const std = (nr, n) => tk(`Take photo ${nr + 1}`, 'prim', ik.camera()) + tk('Done photographing', 'sek') + ersatt(nr, n);
const ersatt = (nr, n) => `<div style="display: flex; flex-direction: column; align-items: center">${hText(`Retake photo ${nr}`)}<span style="font: 400 12.5px ${SANS}; color: ${C.dim2}; margin-top: -6px">Replaces the ${n} cards from it</span></div>`;
const lank = (s) => `<button type="button" style="height: 40px; border: 0; background: transparent; color: ${C.txt}; font: 600 15px ${SANS}; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer">${ik.next(14)}${s}</button>`;
const undanLank = lank('Put these cards aside, type them in later');

/* ══ A · Fotot fungerade ══════════════════════════════════════════════ */
skriv('KA1.dc.html', telefon('KA1: every card recognized', 'PHOTO 1', 'Mesa found 12 cards', jamfor,
  rader(radS('kand', 'All 12 recognized')) + foto(), std(1, 12)));
skriv('KA2.dc.html', telefon('KA2: some cards to check', 'PHOTO 1', 'Mesa found 12 cards', jamfor,
  rader(radS('kand', '10 recognized'), radS('kolla', '2 to check on the computer', 'Mesa isn’t sure which cards these are. You pick them when you’re done.')) + foto(), std(1, 12)));
skriv('KA3.dc.html', telefon('KA3: a card missed without a warning', 'PHOTO 1', 'Mesa found 11 cards', jamfor,
  rader(radS('kand', 'All 11 recognized')) + foto({ bort: [10] }), std(1, 11)));
skriv('KA4.dc.html', telefon('KA4: Mesa noticed it missed some', 'PHOTO 1', 'Mesa found 9 cards', jamfor,
  rader(radS('kand', 'All 9 recognized'), radS('varn', 'Mesa saw a few more it couldn’t read', 'Cards without a check: put them aside and type them in on the computer when you’re done. Or retake the photo.')) + foto({ bort: [9, 10, 11] }), std(1, 9)));
skriv('KA5.dc.html', telefon('KA5: something that isn’t a card got counted', 'PHOTO 1', 'Mesa found 13 cards', jamfor,
  rader(radS('kand', '12 recognized'), radS('kolla', '1 to check on the computer', 'Mesa couldn’t read its name. You pick it when you’re done.')) + foto({ extra: [[180, 1880]], top: 1000 }), std(1, 13)));

/* ══ B · Samma kort igen ══════════════════════════════════════════════ */
skriv('KB1.dc.html', telefon('KB1: the same cards as the last photo', 'PHOTO 2', 'This looks like photo 1 again', '11 of the 12 cards were also in photo 1.',
  rader(radS('varn', 'Did you move the cards aside?', 'If not, remove this photo so the cards aren’t counted twice.')) + foto(),
  tk('Remove this photo', 'prim') + tk('They’re new cards, keep them', 'sek') + hText('Retake photo 2')));
skriv('KB2.dc.html', telefon('KB2: a few cards also in the last photo', 'PHOTO 2', 'Mesa found 12 cards', jamfor,
  rader(radS('kand', 'All 12 recognized'), radS('kolla', '3 may also be in photo 1', 'They were at the edge of both photos. You say on the computer if they’re the same cards.')) + foto({ f: F06, top: 150 }), std(2, 12)));

/* ══ C · Fotot gick inte att använda ══════════════════════════════════ */
{
  const dh = 844, dw = Math.round(1500 * dh / 2000), off = Math.round((dw - 390) / 2);
  const chip = (flagga, farg, s) => `<sc-if value="{{${flagga}}}" hint-placeholder-val="{{${flagga === 'liten'}}}"><span style="display: flex; align-items: center; gap: 8px; padding: 9px 13px; border-radius: 99px; background: #0d1015ee; font: 650 14px ${SANS}"><i style="width: 9px; height: 9px; border-radius: 50%; background: ${farg}"></i>${s}</span></sc-if>`;
  skriv('KC1.dc.html', sida('KC1: the camera warns before the photo', 390, 844, `<div style="position: relative; width: 390px; height: 844px; overflow: hidden; background: #000; color: ${C.txt}; font-family: ${SANS}"><img src="${F07.url}" alt="The camera view" style="position: absolute; left: ${-off}px; top: 0; width: ${dw}px; height: ${dh}px; max-width: none">`
    + `<div style="position: absolute; left: 16px; right: 16px; top: 18px; display: flex; justify-content: center">${chip('liten', C.acc, 'Move closer: the names are too small')}${chip('suddig', C.acc, 'Hold still: the picture is blurry')}${chip('blank', C.acc, 'Move the light: it reflects')}${chip('ok', C.green, 'Names are readable')}</div>`
    + `<div style="position: absolute; left: 16px; right: 16px; bottom: 132px; padding: 12px 14px; border-radius: 12px; background: #0d1015e6; font: 500 14px/1.45 ${SANS}; text-align: center">You can still take the photo. Mesa reads what it can.</div>`
    + `<div style="position: absolute; left: 0; right: 0; bottom: 30px; display: flex; align-items: center; justify-content: space-between; padding: 0 36px"><button type="button" style="border: 0; background: transparent; color: ${C.txt}; font: 600 16px ${SANS}; cursor: pointer; width: 70px; text-align: left; text-shadow: 0 1px 3px #000">Back</button><button type="button" aria-label="Take photo" style="width: 78px; height: 78px; border-radius: 50%; background: #fff; border: 5px solid #ffffff66; background-clip: padding-box; cursor: pointer"></button><span style="width: 70px"></span></div></div>`,
    { props: { warning: { editor: 'enum', options: ['Too small', 'Blurry', 'Reflection', 'Readable'], default: 'Too small' } }, logic: `const v = this.props.warning ?? 'Too small';\nreturn { liten: v === 'Too small', suddig: v === 'Blurry', blank: v === 'Reflection', ok: v === 'Readable' };` }));
}
skriv('KC2.dc.html', telefon('KC2: too many cards in one photo', 'PHOTO 1', 'Mesa found 30 cards', 'Many names were too small to read.',
  rader(radS('kand', '18 recognized'), radS('varn', '12 names too small to read', 'Fewer cards per photo reads better. Retake with 10–15 cards at a time, or keep these and pick the 12 on the computer.')) + foto({ f: F16, top: 0, dh: 266, ingen: true }),
  tk('Retake with fewer cards', 'prim', ik.rotate(18)) + tk('Keep these 30', 'sek') + `<span style="font: 400 12.5px ${SANS}; color: ${C.dim2}; text-align: center">Retaking replaces the 30 cards from this photo.</span>`));
skriv('KC3.dc.html', telefon('KC3: no cards found', 'PHOTO 1', 'Mesa didn’t find any cards', 'Nothing was added to the deck.',
  rader(radS('varn', 'Try again like this', 'Hold the phone straight above the cards, with every name line showing and no reflections.')) + foto({ ingen: true, dim: true }),
  tk('Retake photo 1', 'prim', ik.rotate(18)) + undanLank));
skriv('KC4.dc.html', telefon('KC4: cards found, no names readable', 'PHOTO 1', 'Mesa couldn’t read the names', 'It found 6 cards, but nothing was added.',
  rader(radS('varn', 'Try again a little closer', 'Fewer cards in the photo, and the phone straight above them.')) + foto({ bort: [6, 7, 8, 9, 10, 11], dim: true }),
  tk('Retake photo 1', 'prim', ik.rotate(18)) + undanLank));

/* ══ D · Tekniskt fel ═════════════════════════════════════════════════ */
skriv('KD1.dc.html', telefon('KD1: the photo wasn’t sent', 'PHOTO 1', 'The photo wasn’t sent', 'The connection dropped. Nothing was added yet.',
  rader(radS('fel', 'Your photo is kept on the phone', 'Try again when you have a connection. No need for a new photo.')) + foto({ ingen: true, dim: true }),
  tk('Try again') + hText('Retake photo 1')));
skriv('KD2.dc.html', telefon('KD2: read, but not saved', 'PHOTO 1', 'The cards weren’t saved', 'Mesa found 12 cards, but couldn’t save them to the deck.',
  rader(radS('fel', 'The 12 cards are waiting on the phone', 'Check the connection and try again. No need for a new photo.')) + foto({ dim: true }),
  tk('Try again')));
skriv('KD3.dc.html', telefon('KD3: the deck was deleted', 'PHOTO 3', 'This deck is gone', 'It was deleted on the computer. The photo wasn’t saved.',
  rader(radS('fel', 'Nothing more can be added', 'Start again from the computer if you meant to keep it.')) + foto({ ingen: true, dim: true }),
  tk('Close', 'sek')));
skriv('KD4.dc.html', telefon('KD4: photo reading is turned off', 'PHOTO 1', 'Photo reading is off', 'Mesa needs AI help to read the cards in a photo.',
  rader(radS('fel', 'Turn it on on the computer', 'Mesa menu, then AI help. Then try again here. Your photo is kept.')) + foto({ ingen: true, dim: true }),
  tk('Try again')));

/* ══ Datorn: de två fallen som avgörs där (KA5 och KB2) ═══════════════ */
function granska(titel, fraga, under, vanster, hoger, knappar) {
  return sida(titel, 1020, 460, `<div style="width: 1020px; height: 460px; box-sizing: border-box; padding: 24px; background: ${C.bg}; color: ${C.txt}; font-family: ${SANS}"><section aria-label="Check names" style="display: flex; flex-direction: column; gap: 16px; padding: 18px 20px; border-radius: 14px; border: 1.5px solid #8a6a24; background: #17140e">`
    + `<div style="display: flex; align-items: center; gap: 12px"><i style="width: 9px; height: 9px; border-radius: 50%; background: ${C.acc}"></i><b style="font: 700 15px ${SANS}">Check names</b><span style="flex-grow: 1"></span><b style="font: 600 13px ${MONO}; color: ${C.dim}">2 of 3</b></div>`
    + `<div style="display: flex; gap: 22px; align-items: flex-start">${vanster}<div style="display: flex; flex-direction: column; gap: 12px; flex-grow: 1; min-width: 0"><div style="display: flex; flex-direction: column; gap: 4px"><b style="font: 700 19px ${SANS}">${fraga}</b><span style="font: 400 13.5px/1.45 ${SANS}; color: ${C.dim}">${under}</span></div>${hoger}<div style="display: flex; gap: 8px; flex-wrap: wrap">${knappar}</div></div></div></section></div>`);
}
const iFoto = (html, s) => `<div style="display: flex; flex-direction: column; gap: 6px; flex: none"><span style="font: 700 10.5px ${MONO}; letter-spacing: 0.8px; color: ${C.dim}">${s}</span>${html}</div>`;
skriv('KR1.dc.html', granska('KR1: computer, is it the same card? (from KB2)', 'Is this the same card?', 'Swamp was at the edge of photo 1 and of photo 2. If you didn’t move it between the photos, it’s the same card.',
  `<div style="display: flex; gap: 12px">${iFoto(remsa(F07, 870, 850, 430, 80, 190), 'PHOTO 1')}${iFoto(remsa(F06, 860, 1045, 430, 80, 190), 'PHOTO 2')}</div>`,
  `<div style="display: flex; align-items: center; gap: 10px"><img src="${bild('Swamp')}" alt="Swamp" style="width: 60px; height: 84px; border-radius: 4px"><span style="font: 500 14px ${SANS}; color: ${C.dim}">Counted as 2 until you answer.</span></div>`,
  pk('Same card, count it once', 'prim') + pk('Two cards', 'sek')));
skriv('KR2.dc.html', granska('KR2: computer, something that isn’t a card (from KA5)', 'Which card is this?', 'Mesa found something in photo 1 but couldn’t read a name. If it isn’t a card, remove it.',
  iFoto(remsa(F07, 40, 1810, 330, 180, 190), 'PHOTO 1'),
  `<label style="display: flex; align-items: center; gap: 8px; height: 44px; max-width: 380px; box-sizing: border-box; padding: 0 12px; border-radius: 10px; border: 1.5px solid ${C.line}; background: ${C.bg}"><span style="color: ${C.dim}">${ik.search(16)}</span><input type="text" placeholder="Type the card name" aria-label="Card name" style="flex-grow: 1; border: 0; background: transparent; color: ${C.txt}; font: 500 15px ${SANS}; outline: none"></label>`,
  pk(ik.x(13) + 'Not a card', 'prim')));

/* ── index: sida K, med en lapp under varje skärm ── */
const LAST = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const PW = 390, PH = 844, GX = 80;
const RAD = PH + 20 + 190 + 343;
const grupper = [
  ['A · The photo worked', [
    ['KA1', 'Every card recognized', 'Happened: every card in the photo was found and named.\nMesa knows: 12 cards, all names.\nYou: compare the checks with the table, then take the next photo.'],
    ['KA2', 'Some cards to check', 'Happened: Mesa found the cards but isn’t sure which card 2 of them are.\nMesa knows: that it’s unsure.\nYou: nothing now. Pick them on the computer when you’re done.'],
    ['KA3', 'A card missed without a warning', 'Happened: a card on the table got no check.\nMesa knows: nothing. It can’t tell what it didn’t see.\nYou: spot the card without a check. Put it aside and type it in, or retake.'],
    ['KA4', 'Mesa noticed it missed some', 'Happened: Mesa saw more cards than it could read.\nMesa knows: roughly how many, not which ones.\nYou: the cards without a check are the ones. Put them aside, or retake.'],
    ['KA5', 'Something that isn’t a card', 'Happened: Mesa counted something on the table as a card.\nMesa knows: only that it couldn’t read a name.\nYou: nothing now. On the computer it shows up as a card to check. Press Not a card (KR2).'],
  ]],
  ['B · The same cards again', [
    ['KB1', 'The whole photo again', 'Happened: the cards weren’t moved aside, so photo 2 shows photo 1’s cards.\nMesa knows: most names match the last photo.\nYou: remove this photo, or keep it if they really are new copies.'],
    ['KB2', 'A few cards in both photos', 'Happened: cards at the edge got into two photos.\nMesa knows: the same names at the edges.\nYou: nothing now. Say on the computer if they’re the same cards (KR1).'],
  ]],
  ['C · The photo couldn’t be used', [
    ['KC1', 'The camera warns first', 'Happened: before the photo, the names look too small, blurry or reflect.\nMesa knows: what the camera sees right now.\nYou: move closer, hold still or move the light. You can still take it.'],
    ['KC2', 'Too many cards at once', 'Happened: many cards in one photo, so the names are tiny.\nMesa knows: 30 found, 12 unreadable.\nYou: retake with 10–15 cards, or keep and pick 12 on the computer.'],
    ['KC3', 'No cards found', 'Happened: the photo shows no cards Mesa can find.\nMesa knows: nothing was added.\nYou: retake, or put the cards aside and type them in later.'],
    ['KC4', 'No names readable', 'Happened: cards found, but no name could be read.\nMesa knows: nothing was added.\nYou: retake closer, or put the cards aside and type them in later.'],
  ]],
  ['D · Something technical', [
    ['KD1', 'Not sent', 'Happened: the connection dropped before the photo was read.\nMesa knows: the photo is on the phone.\nYou: Try again. No new photo needed.'],
    ['KD2', 'Read, but not saved', 'Happened: the cards were read, but saving failed.\nMesa knows: the 12 cards, waiting on the phone.\nYou: Try again.'],
    ['KD3', 'The deck was deleted', 'Happened: the deck was deleted on the computer while you photographed.\nMesa knows: there’s nowhere to save.\nYou: close, and start again from the computer if needed.'],
    ['KD4', 'Photo reading is off', 'Happened: AI help is turned off, so photos can’t be read.\nMesa knows: the photo is kept.\nYou: turn it on on the computer, then Try again.'],
  ]],
];
const pages = (LAST.pages || []).filter(p => p.id !== 'k');
pages.unshift({ id: 'k', name: 'K · Every case, one design each' });
const boards = Object.assign({}, LAST.boards), order = LAST.order.slice();
const notes = Object.assign({}, LAST.notes);
grupper.forEach(([gtitel, fall], gi) => {
  const y = gi * RAD;
  notes['k' + gi] = { x: 0, y: y - 260, text: gtitel, kind: 'title1', maxW: Math.max(fall.length * (PW + GX) - GX, 1200), page: 'k' };
  fall.forEach(([id, titel, lapp], i) => {
    const x = i * (PW + GX), f = id + '.dc.html';
    boards[f] = { x, y, w: PW, h: PH, title: `${id} · ${titel}`, page: 'k' };
    if (!order.includes(f)) order.push(f);
    notes['kl' + id] = { x, y: y + PH + 40, text: lapp, w: PW, maxH: 190, size: 's', fill: 'gray', page: 'k' };
  });
});
/* Datorns två granskningar till höger om grupp A och B. */
boards['KR2.dc.html'] = { x: 5 * (PW + GX) + 40, y: 0, w: 1020, h: 460, title: 'KR2 · On the computer: what KA5 turns into', page: 'k' };
boards['KR1.dc.html'] = { x: 2 * (PW + GX) + 40, y: RAD, w: 1020, h: 460, title: 'KR1 · On the computer: what KB2 turns into', page: 'k' };
for (const f of ['KR1.dc.html', 'KR2.dc.html']) if (!order.includes(f)) order.push(f);
notes.k0.maxW = 5 * (PW + GX) + 1060; notes.k1.maxW = 2 * (PW + GX) + 1060;
const canvas = Object.assign({}, LAST, { pages, boards, order, notes, launch: { view: 'canvas', page: 'k' } });
for (const [n, h] of Object.entries(filer)) fs.writeFileSync(path.join(OUT, n), h);
fs.writeFileSync(path.join(OUT, 'canvas.json'), JSON.stringify(canvas, null, 1));
const streck = Object.entries(filer).filter(([, h]) => /—/.test(h));
console.log(Object.keys(filer).join(' '), streck.length ? 'TANKSTRECK: ' + streck.map(([n]) => n).join(' ') : 'inga tankstreck');

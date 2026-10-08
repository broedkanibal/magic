// Sida J (Jesper 2026-09-27): rubriken säger vad Mesa hittade (inte "Photo 1 added"); "recognized" i
// stället för "names read"; missade kort går inte att räkna exakt, så inga rutor och inget exakt antal,
// du avgör mot bordet; retake ersätter fotots kort, det står innan och går att ångra på datorn.
import { fs, path, OUT, C, SANS, MONO, F07, F06, F05, ik, BLA, ROD, sida, t, stor, etik, pk, ansl, vantar, fotoRadH, laggAnim, tk, textKnapp as hText, panel } from './delar5.mjs';

const filer = {};
const skriv = (n, h) => { filer[n] = h; };

/* ── Telefonens delar ── */
function radS(typ, titel, under) {
  const ikon = typ === 'kand' ? [C.green, C.ink, ik.check(12, 3.2), ''] : typ === 'kolla' ? ['#3a2e14', C.acc, '?', `border: 1.5px solid ${C.acc};`] : typ === 'varn' ? [C.acc, C.ink, '!', ''] : typ === 'byt' ? [BLA, '#fff', ik.rotate(12), ''] : [ROD, '#fff', '!', ''];
  return `<div style="display: flex; gap: 12px; align-items: flex-start; padding: 10px 0"><span style="width: 22px; height: 22px; border-radius: 6px; display: grid; place-items: center; flex: none; box-sizing: border-box; background: ${ikon[0]}; color: ${ikon[1]}; font: 800 12px ${SANS}; ${ikon[3]}">${ikon[2]}</span><span style="display: flex; flex-direction: column; gap: 2px; min-width: 0"><b style="font: 650 15px/1.3 ${SANS}">${titel}</b>${under ? `<span style="font: 400 13.5px/1.4 ${SANS}; color: ${C.dim}">${under}</span>` : ''}</span></div>`;
}
const rader = (...r) => `<div style="display: flex; flex-direction: column; padding: 2px 14px; border-radius: 12px; background: ${C.bg2}; border: 1px solid ${C.line}">${r.join(`<i style="height: 1px; background: ${C.line}"></i>`)}</div>`;
/* Etikett ovanför rubriken: vilket foto. Rubriken: vad Mesa hittade. Under: vad du ska jämföra. */
function telefon(titel, etikett, rubrik, under, kropp, knappar, o = {}) {
  return sida(titel, 390, 844, `<div style="position: relative; width: 390px; height: 844px; box-sizing: border-box; background: ${C.bg}; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column; padding: 16px 18px 20px; overflow: hidden">`
    + `<span style="display: flex; align-items: center; gap: 8px; font: 600 13px ${SANS}; color: ${C.green}"><i style="width: 8px; height: 8px; border-radius: 50%; background: ${C.green}"></i>New deck 3</span>`
    + `<div style="display: flex; flex-direction: column; gap: 6px; margin: 22px 0 18px">${etik(etikett, C.dim)}<h1 style="margin: 0; font: 750 26px/1.2 ${SANS}; letter-spacing: -0.4px">${rubrik}</h1>${under ? `<span style="font: 400 15px/1.45 ${SANS}; color: ${C.dim}">${under}</span>` : ''}</div>`
    + `<div style="display: flex; flex-direction: column; gap: 12px">${kropp}</div>`
    + `<span style="flex-grow: 1"></span><div style="display: flex; flex-direction: column; gap: 8px; padding-top: 12px">${knappar}</div></div>`, o);
}
/* Prickar i stället för rutor: en liten bock där Mesa hittade ett namn. Positionen är ungefärlig. */
const T07 = [[215, 360], [200, 500], [185, 680], [230, 840], [230, 990], [235, 1165], [825, 395], [845, 535], [870, 725], [870, 850], [880, 1040], [910, 1200]];
function fotoPrickar(o = {}) {
  const dw = 354, s = dw / 1500, top = 280, dh = 232;
  const flytt = o.flytt || {};
  const m = T07.map(([x, y], i) => (o.bort || []).includes(i) ? '' : (() => { const [dx, dy] = flytt[i] || [0, 0]; return `<span style="position: absolute; left: ${Math.round((x + dx) * s) - 2}px; top: ${Math.round((y + dy - top) * s)}px; width: 16px; height: 16px; border-radius: 50%; display: grid; place-items: center; background: ${BLA}; color: #fff; box-shadow: 0 0 0 2px #0d1015aa; animation: bock 7s ${(0.18 * i).toFixed(2)}s infinite both">${ik.check(10, 3.4)}</span>`; })()).join('');
  return `<div style="position: relative; width: ${dw}px; height: ${dh}px; border-radius: 10px; overflow: hidden; flex: none; ${o.dim ? 'filter: grayscale(.5) brightness(.6);' : ''}"><img src="${F07.url}" alt="Photo 1" style="position: absolute; left: 0; top: ${-Math.round(top * s)}px; width: ${dw}px; height: ${Math.round(2000 * s)}px">${m}</div>`;
}
const fotoText = `<span style="font: 400 12.5px/1.4 ${SANS}; color: ${C.dim2}">A check shows roughly where each card was found.</span>`;
const jamfor = 'Does every card on the table have a check?';
const vanliga = (nr) => tk(`Take photo ${nr}`, 'prim', ik.camera()) + tk('Done photographing', 'sek') + hText('Retake photo 1');
const retakeMedText = (n) => `<div style="display: flex; flex-direction: column; align-items: center; gap: 0">${hText('Retake photo 1')}<span style="font: 400 12.5px ${SANS}; color: ${C.dim2}; margin-top: -6px">Replaces the ${n} cards from it</span></div>`;

/* ══ Rad 1: rubriken och raderna, med alternativen som Tweaks ══════════ */
const RUB = ['Mesa found 12 cards', 'Found 12 cards', '12 cards in this photo', 'Mesa sees 12 cards'];
const NAMN = ['All 12 recognized', 'Mesa knows all 12', '12 of 12 recognized', 'Every card has a name'];
const val = (lista, nyckel) => lista.map((s, i) => `<sc-if value="{{${nyckel}${i}}}" hint-placeholder-val="{{${i === 0}}}">${s}</sc-if>`).join('');
skriv('J1.dc.html', telefon('J1: the result, with the copy options as Tweaks', 'PHOTO 1', val(RUB, 'r'), jamfor,
  rader(radS('kand', val(NAMN, 'n'))) + fotoPrickar() + fotoText, vanliga(2),
  { props: { headline: { editor: 'enum', options: RUB, default: RUB[0] }, names: { editor: 'enum', options: NAMN, default: NAMN[0] } },
    logic: `const r = ${JSON.stringify(RUB)}.indexOf(this.props.headline ?? ${JSON.stringify(RUB[0])}), n = ${JSON.stringify(NAMN)}.indexOf(this.props.names ?? ${JSON.stringify(NAMN[0])});\nreturn { r0: r === 0, r1: r === 1, r2: r === 2, r3: r === 3, n0: n === 0, n1: n === 1, n2: n === 2, n3: n === 3 };` }));
skriv('J2.dc.html', telefon('J2: 2 cards to check later', 'PHOTO 1', 'Mesa found 12 cards', jamfor,
  rader(radS('kand', '10 recognized'), radS('kolla', '2 to check on the computer', 'Mesa isn’t sure which cards these are. You pick them when you’re done.')) + fotoPrickar() + fotoText, vanliga(2)));

/* ══ Rad 2: kort som missades. Mesa vet inte exakt, så du avgör. ════════ */
const lagUndan = 'Any card without a check was missed. Put it aside and type it in on the computer when you’re done.';
skriv('J3.dc.html', telefon('J3: option A, you judge from the checks', 'PHOTO 1', 'Mesa found 9 cards', jamfor,
  rader(radS('kand', 'All 9 recognized')) + fotoPrickar({ bort: [9, 10, 11] })
  + `<div style="display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 12px; background: ${C.bg2}; border: 1px solid ${C.line}"><span style="color: ${C.dim}; padding-top: 1px">${ik.phone(16)}</span><span style="font: 400 14px/1.45 ${SANS}; color: ${C.txt}">${lagUndan}</span></div>`,
  tk('Take photo 2', 'prim', ik.camera()) + tk('Done photographing', 'sek') + retakeMedText(9)));
skriv('J4.dc.html', telefon('J4: option A when Mesa noticed it missed some', 'PHOTO 1', 'Mesa found 9 cards', jamfor,
  rader(radS('kand', 'All 9 recognized'), radS('varn', 'Mesa saw a few more it couldn’t read', lagUndan)) + fotoPrickar({ bort: [9, 10, 11] }),
  tk('Take photo 2', 'prim', ik.camera()) + tk('Done photographing', 'sek') + retakeMedText(9)));
skriv('J5.dc.html', telefon('J5: a check that landed a bit off', 'PHOTO 1', 'Mesa found 12 cards', jamfor,
  rader(radS('kand', 'All 12 recognized')) + fotoPrickar({ flytt: { 4: [120, -70], 10: [-40, 90] } }) + fotoText
  + `<span style="font: 400 13.5px/1.45 ${SANS}; color: ${C.dim}">Count the checks, not their exact spots. 12 checks for 12 cards is right, even if one sits between two cards.</span>`, vanliga(2)));
/* Alternativ B: ingen markering alls, bara antalet att jämföra med bordet. */
skriv('J6.dc.html', telefon('J6: option B, only the count to compare', 'PHOTO 1', 'Mesa found 9 cards', 'Count the cards on the table.',
  `<div style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 22px 14px; border-radius: 14px; background: ${C.bg2}; border: 1px solid ${C.line}"><b style="font: 800 64px/1 ${SANS}; letter-spacing: -2px">9</b><span style="font: 600 14px ${SANS}; color: ${C.dim}">cards found, all recognized</span></div>`
  + `<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px"><div style="padding: 12px; border-radius: 12px; background: #0f1d15; border: 1px solid #24503a"><b style="font: 650 14px ${SANS}; color: #bfe8cf">Also 9 on the table?</b><span style="display: block; font: 400 13px/1.4 ${SANS}; color: ${C.dim}; margin-top: 4px">Take the next photo.</span></div><div style="padding: 12px; border-radius: 12px; background: #1d1810; border: 1px solid #6a5220"><b style="font: 650 14px ${SANS}; color: ${C.acc}">More on the table?</b><span style="display: block; font: 400 13px/1.4 ${SANS}; color: ${C.dim}; margin-top: 4px">Retake the photo, or put the extra cards aside.</span></div></div>`,
  tk('Take photo 2', 'prim', ik.camera()) + tk('Done photographing', 'sek') + retakeMedText(9)));

/* ══ Rad 3: retake. Det nya fotot ersätter det gamla, och det står innan. ══ */
{
  const dh = 844, dw = Math.round(1500 * dh / 2000), off = Math.round((dw - 390) / 2);
  skriv('J7.dc.html', sida('J7: the camera, retaking photo 1', 390, 844, `<div style="position: relative; width: 390px; height: 844px; overflow: hidden; background: #000; color: ${C.txt}; font-family: ${SANS}"><img src="${F07.url}" alt="The camera view" style="position: absolute; left: ${-off}px; top: 0; width: ${dw}px; height: ${dh}px; max-width: none">`
    + `<div style="position: absolute; left: 14px; right: 14px; top: 16px; display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border-radius: 14px; background: #0d1015ee; border: 1px solid #2a3a66"><span style="color: #b9c8ff; padding-top: 1px">${ik.rotate(18)}</span><span style="display: flex; flex-direction: column; gap: 3px"><b style="font: 700 15px ${SANS}">Retaking photo 1</b><span style="font: 400 13.5px/1.4 ${SANS}; color: #c7d0dd">The new photo replaces the 9 cards from the old one. Press Back to keep them.</span></span></div>`
    + `<div style="position: absolute; left: 16px; right: 16px; bottom: 132px; padding: 12px 14px; border-radius: 12px; background: #0d1015e6; font: 500 14px/1.45 ${SANS}; text-align: center">Hold the phone straight above the cards.</div>`
    + `<div style="position: absolute; left: 0; right: 0; bottom: 30px; display: flex; align-items: center; justify-content: space-between; padding: 0 36px"><button type="button" style="border: 0; background: transparent; color: ${C.txt}; font: 600 16px ${SANS}; cursor: pointer; width: 70px; text-align: left; text-shadow: 0 1px 3px #000">Back</button><button type="button" aria-label="Take photo" style="width: 78px; height: 78px; border-radius: 50%; background: #fff; border: 5px solid #ffffff66; background-clip: padding-box; cursor: pointer"></button><span style="width: 70px"></span></div></div>`));
}
skriv('J8.dc.html', telefon('J8: after the retake', 'PHOTO 1 · RETAKEN', 'Mesa found 12 cards', jamfor,
  rader(radS('kand', 'All 12 recognized'), radS('byt', 'Replaced the first try', 'Its 9 cards were swapped for these 12 on the computer.')) + fotoPrickar(), vanliga(2)));

/* Datorn under och efter en retake. */
const radRetake = `<div style="display: flex; align-items: center; gap: 12px; padding: 8px 10px; border-radius: 10px; background: #101a2e; border: 1px solid #2a3a66"><span style="width: 44px; height: 51px; border-radius: 4px; background: ${C.bg3}; display: grid; place-items: center; color: #b9c8ff">${ik.rotate(18)}</span><div style="display: flex; flex-direction: column; gap: 2px; flex-grow: 1"><b style="font: 650 13.5px ${SANS}">Photo 1 · retaking</b><span style="font: 500 12.5px/1.4 ${SANS}; color: ${C.dim}">Its 9 cards stay until the new photo is in, then they’re replaced.</span></div></div>`;
skriv('J9.dc.html', panel('J9: the panel while photo 1 is retaken',
  ansl + radRetake + fotoRadH(2, F06, '12 cards added')
  + `<div style="display: flex; flex-direction: column; gap: 6px; padding-top: 4px">${stor('Retaking photo 1 on the phone')}${t('Nothing to do here. The deck updates by itself when the new photo is read.')}</div>` + vantar('Waiting for the new photo 1')));
const radEfter = `<div style="display: flex; align-items: center; gap: 12px; padding: 8px 10px; border-radius: 10px; background: ${C.bg2}; border: 1px solid ${C.line}"><span style="width: 44px; height: 51px; border-radius: 4px; overflow: hidden; position: relative; flex: none"><img src="${F07.url}" alt="" style="position: absolute; left: -3px; top: -8px; width: 51px; max-width: none"></span><div style="display: flex; flex-direction: column; gap: 2px; flex-grow: 1"><b style="font: 650 13.5px ${SANS}">Photo 1 · retaken</b><span style="font: 500 12.5px ${SANS}; color: ${C.dim}">12 cards, replacing 9</span></div>${pk(ik.undo() + 'Undo', 'ghost', 'height: 32px; font-size: 13px')}</div>`;
skriv('J10.dc.html', panel('J10: the panel after the retake',
  ansl + radEfter + fotoRadH(2, F06, '12 cards added')
  + `<div style="display: flex; flex-direction: column; gap: 6px; padding-top: 4px">${stor('Lay out the next 10–15 cards')}${t('Then take photo 3 with your phone.')}</div>` + laggAnim(376, 170, { per: 3 }) + vantar('Waiting for photo 3')
  + `<span style="font: 400 12.5px/1.45 ${SANS}; color: ${C.dim}">Undo brings back the 9 cards from the first try. Names you already checked for cards that are in both photos are kept.</span>`));

/* ── index: sida J ── */
const LAST = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const PW = 390, PH = 844, GX = 80, RY = 343;
const Y = [0, PH + RY, 2 * (PH + RY)];
const plats = {
  'J1.dc.html': [0, Y[0], PW, PH, 'J1 · Headline and names row (Tweaks: copy options)'],
  'J2.dc.html': [PW + GX, Y[0], PW, PH, 'J2 · 2 to check on the computer'],
  'J3.dc.html': [0, Y[1], PW, PH, 'J3 · Missed cards, option A: you judge from the checks'],
  'J4.dc.html': [PW + GX, Y[1], PW, PH, 'J4 · Option A when Mesa noticed it missed some'],
  'J5.dc.html': [2 * (PW + GX), Y[1], PW, PH, 'J5 · A check that landed a bit off'],
  'J6.dc.html': [3 * (PW + GX), Y[1], PW, PH, 'J6 · Missed cards, option B: only the count'],
  'J7.dc.html': [0, Y[2], PW, PH, 'J7 · Retake: the camera says what happens'],
  'J8.dc.html': [PW + GX, Y[2], PW, PH, 'J8 · After the retake'],
  'J9.dc.html': [2 * (PW + GX), Y[2], 420, 900, 'J9 · Computer while photo 1 is retaken'],
  'J10.dc.html': [2 * (PW + GX) + 420 + GX, Y[2], 420, 900, 'J10 · Computer after the retake, with Undo'],
};
const pages = (LAST.pages || []).filter(p => p.id !== 'j');
pages.unshift({ id: 'j', name: 'J · Copy, missed cards, retake' });
const boards = Object.assign({}, LAST.boards), order = LAST.order.slice();
for (const [f, [x, y, w, h, title]] of Object.entries(plats)) { boards[f] = { x, y, w, h, title, page: 'j' }; if (!order.includes(f)) order.push(f); }
const notes = Object.assign({}, LAST.notes, {
  j0: { x: 0, y: Y[0] - 260, text: 'What Mesa found, and what you compare', kind: 'title1', maxW: 2 * PW + GX, page: 'j' },
  j1: { x: 0, y: Y[1] - 260, text: 'Missed cards: Mesa can’t know exactly, so you judge', kind: 'title1', maxW: 4 * PW + 3 * GX, page: 'j' },
  j2: { x: 0, y: Y[2] - 260, text: 'Retake: the new photo replaces the old one', kind: 'title1', maxW: 2 * PW + 2 * 420 + 3 * GX, page: 'j' },
});
const canvas = Object.assign({}, LAST, { pages, boards, order, notes, launch: { view: 'canvas', page: 'j' } });
for (const [n, h] of Object.entries(filer)) fs.writeFileSync(path.join(OUT, n), h);
fs.writeFileSync(path.join(OUT, 'canvas.json'), JSON.stringify(canvas, null, 1));
const streck = Object.entries(filer).filter(([, h]) => /—/.test(h));
console.log(Object.keys(filer).join(' '), streck.length ? 'TANKSTRECK: ' + streck.map(([n]) => n).join(' ') : 'inga tankstreck');

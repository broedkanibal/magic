// Designytan "Mesa Deck Photo Flow E" (2026-09-26). Jesper: D1 (antal + basländer + "Lay out the cards")
// var oklart i både UI och text; telefonen ska vara kamera, och man gör, rättar och bekräftar på datorn.
// E: frågorna ställs på datorn innan telefonen kopplas in, som två riktiga frågor med svar;
// telefonen visar bara hur korten läggs och kameran; datorn tar resten i fem steg.
import { C, SANS, MONO, esc, ik, btn, tx, ok, telefon, sida, steg, fs, path } from './delar.mjs';
import { LEK, fotoD, ringD, W, B, A, T } from './delar2.mjs';

const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), 'flowE', 'project');
fs.mkdirSync(OUT, { recursive: true });
const filer = {};
const skriv = (n, h) => { filer[n] = h; };

/* Läggningen utan basland (samma kort som Jespers foto-18/19). */
const k = (n, c) => ({ n, c });
const U = {
  u1: [k('Scourge of the Undercity', B), k('Mirran Bardiche', A), k('Ancestral Blade', W), k('Ukud Cobra', B), k('Killing Glare', B), k('Pharika’s Chosen', B)],
  u2: [k('Venomous Hierophant', B), k('Night’s Whisper', B), k('Gorgon Flail', A), k('Flutterfox', W), k('Trusty Retriever', W), k('Valkyrie’s Sword', A)],
  u3: [k('Fencing Ace', W), k('Faithful Pikemaster', W), k('Maul of the Skyclaves', W), k('Pacifism', W), k('Resistance Reunited', W), k('Thriving Moor', T)],
  u4: [k('Vraska’s Finisher', B), k('Militant Inquisitor', W), k('Coat with Venom', B), k('Thriving Heath', T), k('Aphelia, Viper Whisperer', B), k('Hooded Blightfang', B)],
  u5: [k('Serpent Assassin', B), k('Danitha Capashen, Paragon', W)],
};

/* ── datorns ram: fem steg och en rad med knappar längst ned ── */
const STEG = ['Set up', 'Photograph', 'Check cards', 'Basic lands', 'Confirm'];
function stegRad(aktiv) {
  return `<nav aria-label="Steps" style="display: flex; align-items: center; gap: 14px; padding: 0 40px; height: 64px; border-bottom: 1px solid ${C.line}; flex: none">${STEG.map((t, i) => {
    const klar = i < aktiv, nu = i === aktiv;
    const n = klar ? `background: #0f2016; border: 1px solid #2f6b47; color: #8fe0b0` : nu ? `background: ${C.acc}; border: 1px solid ${C.acc}; color: ${C.ink}` : `border: 1px solid #39445a; color: ${C.dim2}`;
    return (i ? `<i style="flex-grow: 1; height: 1.5px; background: ${klar ? '#2f6b47' : C.line}; max-width: 90px"></i>` : '')
      + `<span style="display: flex; align-items: center; gap: 10px; font: ${nu ? 700 : 600} 15px ${SANS}; color: ${nu ? C.txt : klar ? C.dim : C.dim2}; white-space: nowrap"><span style="width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font: 700 12.5px ${MONO}; flex: none; ${n}">${klar ? ik.check(13, 3) : i + 1}</span>${t}</span>`;
  }).join('')}<span style="flex-grow: 1"></span></nav>`;
}
function dator(titel, aktiv, kropp, fot) {
  return sida(titel, 1440, 900,
    `<div style="width: 1440px; height: 900px; box-sizing: border-box; background: ${C.bg}; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column">`
    + `<div style="height: 56px; flex: none; display: flex; align-items: center; gap: 14px; padding: 0 24px; border-bottom: 1px solid ${C.line}; background: ${C.bg2}"><b style="font: 800 17px ${SANS}; letter-spacing: 0.3px; color: ${C.acc}">Mesa</b><span style="color: ${C.dim2}">/</span><span style="font: 600 15px ${SANS}">${LEK}</span><span style="font: 500 13.5px ${SANS}; color: ${C.dim}; padding-left: 8px">Add cards with your phone</span><span style="flex-grow: 1"></span><button type="button" style="height: 34px; padding: 0 14px; border-radius: 9px; background: transparent; border: 1px solid ${C.line}; color: ${C.dim}; font: 600 13.5px ${SANS}; cursor: pointer">${aktiv === 0 ? 'Cancel' : 'Stop — keep the cards read so far'}</button></div>`
    + stegRad(aktiv)
    + `<div style="flex-grow: 1; min-height: 0; box-sizing: border-box; padding: 32px 40px; display: flex; gap: 36px">${kropp}</div>`
    + `<div style="height: 76px; flex: none; box-sizing: border-box; display: flex; align-items: center; gap: 16px; padding: 0 40px; border-top: 1px solid ${C.line}; background: ${C.bg2}">${fot}</div>`
    + `</div>`, { props: dator.props, logic: dator.logic });
}
const knapp = (t, typ = 'prim', o = '') => `<button type="button" style="height: 48px; padding: 0 24px; border-radius: 11px; font: 650 15.5px ${SANS}; cursor: pointer; ${typ === 'prim' ? `background: ${C.acc}; color: ${C.ink}; border: 0` : typ === 'av' ? `background: ${C.bg4}; color: ${C.dim2}; border: 0` : `background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}`}; ${o}">${t}</button>`;
const sidopanel = (inner) => `<div style="width: 290px; flex: none; display: flex; flex-direction: column; gap: 14px; align-items: flex-start; padding: 22px; border-radius: 14px; background: ${C.bg2}; border: 1px solid ${C.line}; box-sizing: border-box; align-self: flex-start">${inner}</div>`;
const rubrik = (t, u) => `<div style="display: flex; flex-direction: column; gap: 6px"><h1 style="margin: 0; font: 750 30px ${SANS}; letter-spacing: -0.4px">${t}</h1>${u ? tx(u, 'font-size: 16px; max-width: 760px') : ''}</div>`;

/* ══ Main · Steg 1 på datorn: två frågor, sedan koden ══════════════════ */
const fraga = (nr, titel, hjalp, inner) => `<section style="display: flex; gap: 18px; align-items: flex-start"><span style="width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; flex: none; background: ${C.bg3}; border: 1px solid #39445a; font: 700 14px ${MONO}; color: ${C.txt}">${nr}</span><div style="display: flex; flex-direction: column; gap: 12px; flex-grow: 1"><div style="display: flex; flex-direction: column; gap: 4px"><h2 style="margin: 0; font: 700 20px ${SANS}">${titel}</h2><span style="font: 400 14.5px/1.45 ${SANS}; color: ${C.dim}">${hjalp}</span></div>${inner}</div></section>`;
const antalVal = `<div role="radiogroup" aria-label="Cards in the deck" style="display: flex; gap: 10px; align-items: center">${['40', '60', '100', 'Other…'].map((t, i) => `<button type="button" role="radio" aria-checked="${i === 0}" style="height: 48px; min-width: 76px; padding: 0 18px; border-radius: 11px; font: 650 16px ${SANS}; cursor: pointer; ${i === 0 ? `background: #2a200e; border: 1.5px solid ${C.acc}; color: ${C.acc}` : `background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}`}">${t}</button>`).join('')}<a href="#" style="font: 600 14px ${SANS}; padding-left: 10px">Not sure? Skip this</a></div>`;
const landVal = (vald, titel, under, tagg) => `<label style="flex: 1 1 0; display: flex; gap: 14px; align-items: flex-start; padding: 16px 18px; border-radius: 12px; cursor: pointer; ${vald ? `background: #2a200e; border: 1.5px solid ${C.acc}` : `background: ${C.bg2}; border: 1px solid ${C.line}`}"><input type="radio" name="basland" ${vald ? 'checked' : ''} style="width: 20px; height: 20px; margin: 2px 0 0; accent-color: ${C.acc}; flex: none"><span style="display: flex; flex-direction: column; gap: 4px"><span style="display: flex; gap: 10px; align-items: center"><b style="font: 650 16px ${SANS}">${titel}</b>${tagg ? `<span style="font: 650 11.5px ${SANS}; color: #8fe0b0; padding: 2px 8px; border-radius: 99px; border: 1px solid #2f6b47">${tagg}</span>` : ''}</span><span style="font: 400 14px/1.4 ${SANS}; color: ${C.dim}">${under}</span></span></label>`;
const qr = (() => {
  // en påhittad kod, bara för bilden: ett rutnät med tre hörnmarkeringar
  let s = '', n = 25, cell = 7;
  const hörn = (x, y) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let fylld;
    if (hörn(x, y)) { const lx = x % (n - 7) < 7 ? x % (n - 7) : x, ly = y % (n - 7) < 7 ? y % (n - 7) : y; const ax = x >= n - 7 ? x - (n - 7) : x, ay = y >= n - 7 ? y - (n - 7) : y; fylld = ax === 0 || ay === 0 || ax === 6 || ay === 6 || (ax >= 2 && ax <= 4 && ay >= 2 && ay <= 4); }
    else fylld = ((x * 7 + y * 13 + x * y) % 5) < 2;
    if (fylld) s += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}"></rect>`;
  }
  return `<svg width="${n * cell}" height="${n * cell}" viewBox="0 0 ${n * cell} ${n * cell}" fill="#0d1015" role="img" aria-label="QR code for connecting the phone">${s}</svg>`;
})();
skriv('Main.dc.html', dator('E1: set up on the computer', 0,
  `<div style="flex-grow: 1; display: flex; flex-direction: column; gap: 30px; min-width: 0; max-width: 820px">`
  + rubrik('Add cards with your phone', 'Answer two questions, then scan the code. Your phone takes the photos — you check and confirm everything here.')
  + fraga(1, 'How many cards are in the deck?', 'Mesa counts as you photograph, so you can see when every card is in.', antalVal)
  + fraga(2, 'Will you photograph the basic lands?', 'Plains, Islands, Swamps, Mountains and Forests.',
    `<div role="radiogroup" style="display: flex; gap: 12px">${landVal(true, 'No, I’ll type the numbers', 'Keep them to the side while you photograph. You type how many at the end.', 'Quicker')}${landVal(false, 'Yes, photograph them', 'Lay them out with the other cards. Mesa counts them.')}</div>`)
  + `</div>`
  + `<div style="width: 330px; flex: none; display: flex; flex-direction: column; gap: 16px; padding: 24px; border-radius: 16px; background: ${C.bg2}; border: 1px solid ${C.line}; box-sizing: border-box; align-self: flex-start">`
  + `<div style="display: flex; gap: 12px; align-items: center"><span style="width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; flex: none; background: ${C.acc}; color: ${C.ink}; font: 700 14px ${MONO}">3</span><h2 style="margin: 0; font: 700 20px ${SANS}">Scan with your phone</h2></div>`
  + `<div style="align-self: center; padding: 14px; background: #f4f1ea; border-radius: 12px">${qr}</div>`
  + `<span style="font: 400 14.5px/1.45 ${SANS}; color: ${C.dim}">Point your phone’s camera at the code and tap the link.</span>`
  + `<span style="display: flex; align-items: center; gap: 9px; font: 600 14px ${SANS}; color: ${C.txt}"><i style="width: 9px; height: 9px; border-radius: 50%; background: ${C.acc}"></i>Waiting for your phone…</span></div>`,
  `<span style="font: 500 14.5px ${SANS}; color: ${C.dim}">The next step starts by itself when your phone connects.</span><span style="flex-grow: 1"></span><a href="#" style="font: 600 14px ${SANS}">Use this computer’s camera instead</a>`));

/* ══ Telefonen: hur korten läggs, och kameran ═══════════════════════════ */
const lagg = `<div style="display: flex; gap: 8px; padding: 14px; border-radius: 12px; background: #5a3d22; align-items: flex-start">${[U.u1.slice(0, 5), U.u2.slice(0, 5), U.u3.slice(0, 5)].map(col =>
  `<div style="width: 98px; display: flex; flex-direction: column">${col.map((kk, i) => `<div style="box-sizing: border-box; border: 2px solid ${kk.c}; ${i === col.length - 1 ? 'border-radius: 5px' : 'border-bottom-width: 0; border-radius: 5px 5px 0 0'}; background: ${kk.c}"><div style="height: 14px; background: #ece4cf; color: #1b1b1b; font-size: 7.5px; font-weight: 700; line-height: 14px; padding: 0 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-radius: 3px 3px 0 0">${kk.n}</div>${i === col.length - 1 ? '<div style="height: 56px; background: #4a4450; margin: 2px; border-radius: 2px"></div>' : ''}</div>`).join('')}</div>`).join('')}</div>`;
const punkt = (t, u) => `<li style="display: flex; gap: 12px; align-items: flex-start"><span style="color: ${C.green}; flex: none; padding-top: 2px">${ik.check(16, 2.6)}</span><span style="display: flex; flex-direction: column; gap: 2px"><b style="font: 650 15px ${SANS}">${t}</b>${u ? `<span style="font: 400 13.5px/1.4 ${SANS}; color: ${C.dim}">${u}</span>` : ''}</span></li>`;
skriv('E2.dc.html', telefon('E2: phone — lay out the cards',
  `<span style="display: flex; align-items: center; gap: 8px; font: 600 13.5px ${SANS}; color: ${C.green}"><i style="width: 8px; height: 8px; border-radius: 50%; background: ${C.green}"></i>Connected to your computer</span>`
  + `<div style="display: flex; flex-direction: column; gap: 6px"><span style="font: 600 12px ${MONO}; letter-spacing: 0.6px; color: ${C.dim}">PHOTO 1</span><h1 style="margin: 0; font: 750 28px/1.15 ${SANS}; letter-spacing: -0.4px">Lay out 10–15 cards</h1></div>`
  + lagg
  + `<ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 12px">`
  + punkt('In columns, overlapping', null) + punkt('Only the name line has to show', null) + punkt('Basic lands stay to the side', 'You type them on the computer at the end.')
  + `</ul>`,
  btn('Open camera', 'prim', ik.camera())));

{
  const fx = 18, fy = 150, fw = 354, fh = 470;
  const bord = fotoD([U.u1, U.u2, U.u3], { w: 430, pad: 14, gap: 12 });
  const skugga = (x, y, w, h) => `<div style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; background: #000000a6; z-index: 3"></div>`;
  const hörn = [[0, 0, 'border-right: 0; border-bottom: 0; border-top-left-radius: 12px'], [fw - 32, 0, 'border-left: 0; border-bottom: 0; border-top-right-radius: 12px'], [0, fh - 32, 'border-right: 0; border-top: 0; border-bottom-left-radius: 12px'], [fw - 32, fh - 32, 'border-left: 0; border-top: 0; border-bottom-right-radius: 12px']]
    .map(([x, y, s]) => `<i style="position: absolute; left: ${x}px; top: ${y}px; width: 32px; height: 32px; border: 3px solid #fff; ${s}"></i>`).join('');
  skriv('E3.dc.html', telefon('E3: phone — the camera', `<div style="position: absolute; left: 0; top: 0; width: 390px; height: 844px; background: #6a4828; overflow: hidden">`
    + `<div style="position: absolute; left: -20px; top: 170px">${bord}</div>`
    + skugga(0, 0, 390, fy) + skugga(0, fy + fh, 390, 844 - fy - fh) + skugga(0, fy, fx, fh) + skugga(fx + fw, fy, 390 - fx - fw, fh)
    + `<div style="position: absolute; left: ${fx}px; top: ${fy}px; width: ${fw}px; height: ${fh}px; z-index: 4">${hörn}</div>`
    + `<div style="position: absolute; left: 18px; right: 18px; top: 20px; z-index: 5; display: flex; justify-content: space-between; align-items: center"><span style="padding: 8px 12px; border-radius: 99px; background: #0d1015cc; font: 650 14px ${SANS}; color: ${C.txt}">Photo 1</span><span style="display: flex; align-items: center; gap: 7px; padding: 8px 12px; border-radius: 99px; background: #0d1015cc; font: 600 13.5px ${SANS}; color: ${C.txt}"><i style="width: 9px; height: 9px; border-radius: 50%; background: ${C.green}"></i>Names are readable</span></div>`
    + `<div style="position: absolute; left: 18px; right: 18px; top: 92px; z-index: 5; text-align: center; font: 650 15px ${SANS}; color: ${C.txt}">Only what’s inside the frame is read</div>`
    + `<div style="position: absolute; left: 18px; right: 18px; top: ${fy + fh + 18}px; z-index: 5; text-align: center; font: 400 14px/1.45 ${SANS}; color: #d5dbe6">Fit whole columns inside. A card the frame cuts through is left for the next photo.</div>`
    + `<div style="position: absolute; left: 0; right: 0; bottom: 34px; z-index: 5; display: flex; align-items: center; justify-content: space-between; padding: 0 40px"><button type="button" style="border: 0; background: transparent; color: ${C.txt}; font: 600 16px ${SANS}; cursor: pointer; width: 70px; text-align: left">Back</button><button type="button" aria-label="Take photo" style="width: 76px; height: 76px; border-radius: 50%; background: #fff; border: 5px solid #ffffff66; background-clip: padding-box; cursor: pointer"></button><span style="width: 70px"></span></div>`
    + `</div>`, null));
}

skriv('E4.dc.html', telefon('E4: phone — photo read',
  `<div style="display: flex; flex-direction: column; gap: 6px">${ok('Photo 2 read')}<b style="font: 750 30px ${SANS}; letter-spacing: -0.5px">+12 cards</b><span style="font: 500 14px ${SANS}; color: ${C.dim}">24 cards so far</span></div>`
  + fotoD([U.u3, U.u4], { w: 354, label: 'Photo 2', mark: (ci, ri) => ci === 0 && ri === 2 ? 'q' : null })
  + `<div style="display: flex; align-items: center; gap: 10px; font: 500 14px ${SANS}; color: ${C.txt}"><span style="width: 22px; height: 22px; border-radius: 50%; background: ${C.acc}; color: ${C.ink}; display: grid; place-items: center; font: 800 13px ${SANS}; flex: none">?</span>Not sure of the name — you check it on the computer</div>`
  + `<span style="flex-grow: 1"></span>` + tx('Move these cards aside and lay out the next ones.', 'font-size: 14.5px'),
  btn('Take next photo', 'prim', ik.camera()) + btn('I’ve photographed them all', 'sek')));

skriv('E5.dc.html', telefon('E5: phone — done here',
  `<div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; padding-top: 100px">`
  + `<span style="width: 72px; height: 72px; border-radius: 50%; display: grid; place-items: center; background: #101a2e; border: 1px solid #2a3a66; color: #b9c8ff">${ik.laptop(34)}</span>`
  + `<h1 style="margin: 0; font: 750 26px/1.2 ${SANS}; letter-spacing: -0.3px">Continue on the computer</h1>`
  + tx('3 photos, 27 cards. Check them and confirm the deck on the computer.', 'font-size: 15.5px; max-width: 300px')
  + `<span style="font: 500 13.5px ${SANS}; color: ${C.dim2}; padding-top: 6px">Your phone’s part is done.</span></div>`,
  btn('Take another photo', 'sek', ik.camera())));

/* ══ Datorn efter fotona ══════════════════════════════════════════════ */
skriv('E6.dc.html', dator('E6: computer — step 2, while you photograph', 1,
  `<div style="flex-grow: 1; display: flex; flex-direction: column; gap: 22px; min-width: 0">`
  + rubrik('Take the photos with your phone', 'Each photo shows up here when it’s read. Nothing to do here yet.')
  + `<div style="display: flex; gap: 24px; align-items: flex-start">`
  + fotoD([U.u1, U.u2], { w: 300, label: 'Photo 1 · 12 cards' })
  + fotoD([U.u3, U.u4], { w: 300, label: 'Photo 2 · 12 cards', mark: (ci, ri) => ci === 0 && ri === 2 ? 'q' : null })
  + `<div style="width: 230px; height: 290px; box-sizing: border-box; border: 2px dashed #39445a; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; padding: 20px; color: ${C.dim}">${ik.camera(28)}<b style="font: 650 15px ${SANS}; color: ${C.txt}">Photo 3</b><span style="font: 400 13.5px/1.4 ${SANS}">Lay out the next cards and take it with your phone</span></div>`
  + `</div></div>`
  + sidopanel(`<span style="font: 500 13.5px ${SANS}; color: ${C.dim}">From the photos</span><b style="font: 800 40px ${SANS}; letter-spacing: -1px">24 cards</b><span style="font: 400 13.5px/1.45 ${SANS}; color: ${C.dim}">Basic lands come at the end. 1 card to check so far — you check them all in the next step.</span>`),
  `<span style="font: 500 14.5px ${SANS}; color: ${C.dim}">Photographed all the cards?</span><span style="flex-grow: 1"></span>${knapp('Continue: Check cards')}`));

const rad = (o) => `<div style="display: flex; gap: 22px; align-items: center; padding: 18px 20px; border-radius: 14px; ${o.klar ? `background: ${C.bg2}; border: 1px solid ${C.line}; opacity: 0.75` : o.aktiv ? `background: #1d1810; border: 1.5px solid #8a6a24` : `background: ${C.bg2}; border: 1px solid ${C.line}`}">`
  + `<b style="width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; flex: none; font: 700 12.5px ${MONO}; ${o.klar ? `background: #0f2016; border: 1px solid #2f6b47; color: #8fe0b0` : `border: 1px solid #5a4a28; color: ${C.acc}`}">${o.klar ? ik.check(13, 3) : o.nr}</b>`
  + `<div style="display: flex; gap: 10px; flex: none">${o.bilder}</div>`
  + `<div style="display: flex; flex-direction: column; gap: 4px; flex-grow: 1; min-width: 0"><span style="font: 600 11.5px ${MONO}; letter-spacing: 0.6px; color: ${o.klar ? C.dim2 : C.acc}">${o.typ}</span><b style="font: 700 18px ${SANS}">${o.fraga}</b><span style="font: 400 14px/1.4 ${SANS}; color: ${C.dim}">${o.under}</span></div>`
  + `<div style="display: flex; gap: 10px; flex: none; align-items: center">${o.knappar}</div></div>`;
const bild = (namn, f, etikett, cut) => `<div style="display: flex; flex-direction: column; gap: 5px; width: 150px"><span style="font: 600 10.5px ${MONO}; color: ${C.dim}">${etikett}</span><div style="box-sizing: border-box; border: 2px solid ${f}; border-bottom-width: 0; border-radius: 6px 6px 0 0; background: ${f}; ${cut ? 'clip-path: inset(0 0 0 34%);' : ''}"><div style="height: 22px; background: #ece4cf; color: #1b1b1b; font-size: 11px; font-weight: 700; line-height: 22px; padding: 0 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-radius: 4px 4px 0 0">${namn}</div><div style="height: 40px; background: #4a4450; margin: 2px 2px 0"></div></div></div>`;
const suddig = (etikett, namn) => `<div style="display: flex; flex-direction: column; gap: 5px; width: 150px"><span style="font: 600 10.5px ${MONO}; color: ${C.dim}">${etikett}</span><div style="height: 64px; box-sizing: border-box; border: 2px solid ${B}; border-radius: 6px 6px 0 0; background: ${B}; padding: 2px"><div style="height: 22px; background: #ece4cf; border-radius: 4px 4px 0 0; filter: blur(1.4px); color: #1b1b1b; font-size: 11px; font-weight: 700; line-height: 22px; padding: 0 6px">${namn}</div></div></div>`;
skriv('E7.dc.html', dator('E7: computer — step 3, check cards', 2,
  `<div style="flex-grow: 1; display: flex; flex-direction: column; gap: 16px; min-width: 0">`
  + rubrik('Check 3 cards', 'Mesa wasn’t sure about these. The rest of the photos are already in the deck.')
  + rad({ nr: 1, klar: true, typ: 'IN TWO PHOTOS · DONE', fraga: 'Maul of the Skyclaves: one card', under: 'Counted once.', bilder: bild('Maul of the Skyclaves', W, 'PHOTO 2') + bild('Maul of the Skyclaves', W, 'PHOTO 3', true), knappar: `<button type="button" style="border: 0; background: transparent; color: ${C.dim}; font: 600 14px ${SANS}; cursor: pointer">Undo</button>` })
  + rad({ nr: 2, aktiv: true, typ: 'NAME COULDN’T BE READ', fraga: 'Which card is this?', under: 'Photo 1, bottom of the second column.', bilder: suddig('PHOTO 1', 'Valkyrie’s Sw…'),
    knappar: `<label style="display: flex; flex-direction: column; gap: 4px"><span style="font: 500 12px ${SANS}; color: ${C.dim}">Card name</span><input type="text" value="Valk" style="width: 220px; height: 44px; box-sizing: border-box; border-radius: 10px; border: 1.5px solid ${C.acc}; background: ${C.bg}; color: ${C.txt}; font: 500 15px ${SANS}; padding: 0 12px"></label>${knapp('Valkyrie’s Sword', 'prim', 'align-self: flex-end; height: 44px; font-size: 14.5px')}<button type="button" style="align-self: flex-end; height: 44px; border: 0; background: transparent; color: ${C.dim}; font: 600 14px ${SANS}; cursor: pointer">Not a card</button>` })
  + rad({ nr: 3, typ: 'NOT SURE OF THE NAME', fraga: 'Is this Maul of the Skyclaves?', under: 'Photo 2 · the name line was blurry.', bilder: bild('Maul of the Skyclaves', W, 'PHOTO 2'), knappar: `${knapp('Yes', 'sek', 'height: 44px')}${knapp('Pick another…', 'sek', 'height: 44px')}` })
  + `</div>`
  + sidopanel(`<span style="font: 500 13.5px ${SANS}; color: ${C.dim}">From the photos</span><b style="font: 800 40px ${SANS}; letter-spacing: -1px">26 cards</b><span style="font: 400 13.5px/1.45 ${SANS}; color: ${C.dim}">Was 27 before the double was counted once. Basic lands come next.</span>`),
  `${knapp('Back', 'sek')}<span style="flex-grow: 1"></span><span style="font: 500 14px ${SANS}; color: ${C.dim}">2 left to answer</span>${knapp('Continue: Basic lands', 'av')}`));

const landRad = (namn, n, info, gron) => `<div style="display: flex; align-items: center; gap: 20px; padding: 6px 0; border-bottom: 1px solid ${C.line}"><div style="flex-grow: 1">${steg(namn, n)}</div><span style="width: 190px; font: 500 13.5px ${SANS}; color: ${gron ? C.green : C.dim2}">${info}</span></div>`;
const e8Typ = `<div style="flex-grow: 1; display: flex; flex-direction: column; gap: 18px; min-width: 0; max-width: 760px">${rubrik('How many basic lands?', 'You chose to type them instead of photographing them.')}<div style="display: flex; flex-direction: column">${landRad('Plains', 7, '')}${landRad('Swamp', 7, '')}${landRad('Island', 0, '')}${landRad('Mountain', 0, '')}${landRad('Forest', 0, '')}</div></div>`;
const e8Foto = `<div style="flex-grow: 1; display: flex; flex-direction: column; gap: 18px; min-width: 0; max-width: 760px">${rubrik('Basic lands', 'These are the numbers from the photos. Change any that are wrong.')}<div style="display: flex; flex-direction: column">${landRad('Plains', 7, '7 in the photos', true)}${landRad('Swamp', 7, '7 in the photos', true)}${landRad('Island', 0, 'None in the photos')}${landRad('Mountain', 0, 'None in the photos')}${landRad('Forest', 0, 'None in the photos')}</div></div>`;
dator.props = { basland: { editor: 'enum', options: ['Typed', 'Photographed'], default: 'Typed' } };
dator.logic = `const b = this.props.basland ?? 'Typed';\nreturn { typ: b === 'Typed', foto: b === 'Photographed' };`;
skriv('E8.dc.html', dator('E8: computer — step 4, basic lands', 3,
  `<sc-if value="{{typ}}" hint-placeholder-val="{{true}}">${e8Typ}</sc-if><sc-if value="{{foto}}" hint-placeholder-val="{{false}}">${e8Foto}</sc-if><span style="flex-grow: 1"></span>`
  + sidopanel(`${ringD(40, 40)}<b style="font: 700 17px ${SANS}; color: #8fe0b0">It adds up</b><span style="font: 400 13.5px/1.45 ${SANS}; color: ${C.dim}">26 cards from the photos + 14 basic lands = 40.</span>`),
  `${knapp('Back', 'sek')}<span style="flex-grow: 1"></span>${knapp('Continue: Confirm')}`));
dator.props = undefined; dator.logic = undefined;

const typer = [
  ['Creatures', ['Aphelia, Viper Whisperer', 'Danitha Capashen, Paragon', 'Faithful Pikemaster', 'Fencing Ace', 'Flutterfox', 'Hooded Blightfang', 'Militant Inquisitor', 'Pharika’s Chosen', 'Scourge of the Undercity', 'Serpent Assassin', 'Trusty Retriever', 'Ukud Cobra', 'Venomous Hierophant', 'Vraska’s Finisher']],
  ['Instants & sorceries', ['Coat with Venom', 'Killing Glare', 'Night’s Whisper', 'Resistance Reunited']],
  ['Artifacts & enchantments', ['Ancestral Blade', 'Gorgon Flail', 'Maul of the Skyclaves', 'Mirran Bardiche', 'Pacifism', 'Valkyrie’s Sword']],
  ['Lands', ['Thriving Heath', 'Thriving Moor', '7 Plains', '7 Swamp']],
];
const andrad = { 'Valkyrie’s Sword': 'picked by you', 'Maul of the Skyclaves': 'checked', 'Plains': 'typed', 'Swamp': 'typed' };
/* Varje rad kan ändras: antal, byt kort, ta bort. En rad visas som den ser ut när man pekar på den. */
const ikonKnapp = (etikett, svg) => `<button type="button" aria-label="${etikett}" style="width: 30px; height: 30px; border-radius: 8px; background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}; display: grid; place-items: center; cursor: pointer; flex: none">${svg}</button>`;
const kortRad = (antal, namn, markering, pekad) => pekad
  ? `<div style="display: flex; align-items: center; gap: 8px; padding: 5px 8px; margin: 0 -8px; border-radius: 9px; background: ${C.bg3}; border: 1px solid #3d4a5f">${ikonKnapp('One fewer', ik.minus(14))}<b style="width: 18px; text-align: center; font: 700 13.5px ${MONO}">${antal}</b>${ikonKnapp('One more', ik.plus(14))}<span style="flex-grow: 1; min-width: 0; font: 600 14.5px ${SANS}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${namn}</span><button type="button" style="height: 30px; padding: 0 10px; border-radius: 8px; background: transparent; border: 1px solid ${C.line}; color: ${C.txt}; font: 600 12.5px ${SANS}; cursor: pointer">Change</button><button type="button" style="height: 30px; padding: 0 8px; border: 0; background: transparent; color: ${C.dim}; font: 600 12.5px ${SANS}; cursor: pointer">Remove</button></div>`
  : `<div style="display: flex; align-items: baseline; gap: 10px; padding: 7px 0; border-bottom: 1px solid #1c2330"><b style="width: 18px; font: 700 13.5px ${MONO}; color: ${C.dim}">${antal}</b><span style="flex-grow: 1; font: 500 14.5px ${SANS}">${namn}</span>${markering ? `<span style="font: 600 11.5px ${SANS}; color: ${C.green}; white-space: nowrap">${markering}</span>` : ''}</div>`;
skriv('E9.dc.html', dator('E9: computer — step 5, confirm', 4,
  `<div style="flex-grow: 1; display: flex; flex-direction: column; gap: 18px; min-width: 0">`
  + `<div style="display: flex; align-items: flex-end; gap: 24px">${rubrik('Is this your deck?', 'Point at a card to change or remove it. What you checked or typed is marked.')}<span style="flex-grow: 1"></span>`
  + `<form style="display: flex; gap: 8px; align-items: flex-end; flex: none"><label style="display: flex; flex-direction: column; gap: 4px"><span style="font: 500 12px ${SANS}; color: ${C.dim}">Add a card</span><input type="text" placeholder="Card name" style="width: 240px; height: 42px; box-sizing: border-box; border-radius: 10px; border: 1px solid ${C.line}; background: ${C.bg2}; color: ${C.txt}; font: 500 15px ${SANS}; padding: 0 12px"></label><button type="button" style="height: 42px; padding: 0 16px; border-radius: 10px; background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}; font: 600 14px ${SANS}; cursor: pointer">Add</button></form></div>`
  + `<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 28px">${typer.map(([t, lista]) => {
    const n = lista.reduce((s, x) => s + (parseInt(x) || 1), 0);
    return `<div style="display: flex; flex-direction: column"><div style="display: flex; justify-content: space-between; font: 700 12px ${MONO}; letter-spacing: 0.5px; color: ${C.dim}; padding-bottom: 8px; border-bottom: 1px solid ${C.line}"><span>${t.toUpperCase()}</span><span>${n}</span></div>${lista.map(x => {
      const m = x.match(/^(\d+) (.*)$/), antal = m ? m[1] : '1', namn = m ? m[2] : x;
      return kortRad(antal, esc(namn).replace(/&amp;/g, '&'), andrad[namn], namn === 'Night’s Whisper');
    }).join('')}</div>`;
  }).join('')}</div></div>`,
  `${knapp('Back', 'sek')}<button type="button" style="height: 48px; padding: 0 18px; border-radius: 11px; background: transparent; border: 1px solid ${C.line}; color: ${C.txt}; font: 600 15px ${SANS}; cursor: pointer; display: flex; align-items: center; gap: 8px">${ik.camera(18)}Photograph more cards</button><span style="flex-grow: 1"></span><span style="display: flex; align-items: center; gap: 12px">${ringD(40, 40, { s: 52 })}<span style="font: 600 15px ${SANS}; color: #8fe0b0">40 of 40</span></span>${knapp('Confirm deck', 'prim', 'margin-left: 12px')}`));

/* ── index ── */
const PW = 390, PH = 844, DW = 1440, DH = 900, GX = 80, RY = 343;
const plats = {
  'Main.dc.html': [0, 0, DW, DH, 'E1 · Computer: set up (the step that replaces D1)'],
  'E2.dc.html': [DW + GX, 0, PW, PH, 'E2 · Phone: lay out the cards'],
  'E3.dc.html': [DW + GX + PW + GX, 0, PW, PH, 'E3 · Phone: the camera'],
  'E4.dc.html': [0, DH + RY, PW, PH, 'E4 · Phone: photo read'],
  'E5.dc.html': [PW + GX, DH + RY, PW, PH, 'E5 · Phone: continue on the computer'],
  'E6.dc.html': [2 * (PW + GX), DH + RY, DW, DH, 'E6 · Computer step 2: while you photograph'],
  'E7.dc.html': [0, 2 * (DH + RY), DW, DH, 'E7 · Computer step 3: check cards'],
  'E8.dc.html': [DW + GX, 2 * (DH + RY), DW, DH, 'E8 · Computer step 4: basic lands (Tweaks: typed or photographed)'],
  'E9.dc.html': [2 * (DW + GX), 2 * (DH + RY), DW, DH, 'E9 · Computer step 5: confirm'],
};
const boards = {}, order = [];
for (const [f, [x, y, w, h, title]] of Object.entries(plats)) { boards[f] = { x, y, w, h, title }; order.push(f); }
const canvas = { v: 3, createdOnFiles: { v: 1, at: new Date().toISOString().replace(/\.\d+Z$/, 'Z') }, title: 'Mesa Deck Photo Flow E', launch: { view: 'canvas' }, pages: [], boards, order,
  notes: {
    r1: { x: 0, y: -260, text: 'E · Set up on the computer, then the phone is the camera', kind: 'title1', maxW: DW + 2 * (PW + GX) },
    r2: { x: 0, y: DH + RY - 260, text: 'E · Photographing', kind: 'title1', maxW: 2 * (PW + GX) + DW },
    r3: { x: 0, y: 2 * (DH + RY) - 260, text: 'E · Check, basic lands and confirm on the computer', kind: 'title1', maxW: 3 * DW + 2 * GX },
  }, designSystems: [] };
for (const [n, h] of Object.entries(filer)) fs.writeFileSync(path.join(OUT, n), h);
fs.writeFileSync(path.join(OUT, 'canvas.json'), JSON.stringify(canvas, null, 1));
console.log(Object.keys(filer).join(' '));

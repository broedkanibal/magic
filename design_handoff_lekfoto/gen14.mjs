// Sida N · förslag för luckorna på sida M som måste ritas (Jesper 2026-09-27):
// Gap 4 hela skärmen medan man fotar, Gap 7 efter Remove photo, Gap 10/11 fotoraderna på datorn,
// Gap 14/15 leken är klar (lekens sida och setup), Gap 16 Later.
// Besluten från M: ingen siffra för undanlagda kort (D1), "Photographed every card? · Done
// photographing" (D2), ID1:s steg plus fotolistan med View och Take more photos (D3).
// H1–H3:s paneler tas ordagrant ur de publicerade filerna, så att hela skärmen visar samma panel.
//
// node gen14.mjs <läst project-mapp> <ut>
import { fs, path, C, SANS, MONO, bild, F07, F06, F05, F15, ik, kortRuta, sektion, basland, TYP, BLA, ROD, sida, t, stor, etik, pk, laggAnim, ansl, vantar, fotoRadH, sidan, kollBar, sokF, tk, textKnapp as hText } from './delar5.mjs';

const [src, ut] = process.argv.slice(2);
if (!src || !ut) { console.error('node gen14.mjs <läst project-mapp> <ut>'); process.exit(1); }
fs.mkdirSync(path.join(ut, 'project'), { recursive: true });
const F16 = { url: '/_blob/c886ad6acccd5ab346b12a7129ead44d', w: 1500, h: 1125 };
const filer = {};
const skriv = (n, h) => { filer[n] = h; };

/* "Done photographing" heter "Finish the deck" (Jesper 2026-09-27: otydlig), och är en hel knapp,
   inte en ruta med en liten knapp i. */
const SLUT = 'Finish the deck';
const botten = `<div style="display: flex; flex-direction: column; gap: 8px"><span style="font: 500 13px ${SANS}; color: ${C.dim}">Photographed every card?</span><button type="button" style="height: 48px; width: 100%; border-radius: 10px; background: ${C.bg3}; border: 1px solid #3d4a5f; color: ${C.txt}; font: 650 15px ${SANS}; display: flex; align-items: center; justify-content: center; gap: 9px; cursor: pointer">${ik.check(16, 2.6)}${SLUT}</button></div>`;
/* ── Panelerna ur H1–H3, som de är publicerade ── */
function panelUr(kod) {
  const s = fs.readFileSync(path.join(src, kod + '.dc.html'), 'utf8');
  const aside = s.match(/<aside[^>]*>([\s\S]*)<\/aside>/)[1];
  const u = aside.replace(/^[\s\S]*?<div role="tablist"[\s\S]*?<\/div>/, '')
    .replace(/<span[^>]*>STEP \d OF \d<\/span>/, '')
    .replace(/<div style="display: flex; flex-direction: column; gap: 8px"><span[^>]*>Photographed every card\?<\/span><button[\s\S]*?Done photographing<\/button><\/div>$/, botten);
  if (/STEP \d OF \d|Done photographing/.test(u)) throw new Error(kod + ': steg-etikett eller gammal knapp kvar');
  return u;
}

/* ── Delar ── */
const stegKort = (nr, titel, text, nu, klar, extra = '') => `<li style="display: flex; gap: 12px; padding: 11px 14px; border-radius: 11px; ${nu ? 'background: #1d1810; border: 1px solid #6a5220' : `background: ${C.bg2}; border: 1px solid ${C.line}`}"><span style="width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; flex: none; font: 700 11.5px ${MONO}; ${klar ? 'background: #0f2016; border: 1px solid #2f6b47; color: #8fe0b0' : nu ? `background: ${C.acc}; color: ${C.ink}` : `border: 1px solid #39445a; color: ${C.dim}`}">${klar ? ik.check(11, 3) : nr}</span><span style="display: flex; flex-direction: column; gap: 4px; flex-grow: 1; min-width: 0"><b style="font: 650 14px ${SANS}; ${klar ? `color: ${C.dim}; text-decoration: line-through` : ''}">${titel}</b>${text ? t(text, 'font-size: 12.5px') : ''}${extra}</span></li>`;
const stegLista = (...s) => `<ol style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px">${s.join('')}</ol>`;
const tumFoto = (f) => fotoRadH(0, f, '').match(/^<div[^>]*>(<span[\s\S]*?<\/span>)/)[1];
/* Fotona kvar efter Done (D3), kompakt: fyra tummar i en rad, var och en öppnar View. */
const fotonKort = etik('PHOTOS', C.dim) + `<div style="display: flex; gap: 10px">${[[F07, 12], [F06, 12], [F05, 6], [F15, 8]].map(([f, n], i) => `<button type="button" aria-label="View photo ${i + 1}" style="display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 6px; border-radius: 10px; background: ${C.bg2}; border: 1px solid ${C.line}; color: ${C.txt}; cursor: pointer">${tumFoto(f)}<span style="font: 600 11.5px ${SANS}; color: ${C.dim}">Photo ${i + 1} · ${n}</span></button>`).join('')}</div>`;
const merFoton = pk(ik.camera(16) + 'Take more photos', 'sek', 'align-self: flex-start');
const bar = (farg, ikon, rub, text, knapp = '') => {
  const f = farg === 'gron' ? ['#0f1d15', '#24503a', C.green] : ['#17140e', '#6a5220', C.acc];
  return `<div style="display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-radius: 12px; background: ${f[0]}; border: 1px solid ${f[1]}"><span style="color: ${f[2]}; display: grid; place-items: center">${ikon}</span><b style="font: 700 14.5px ${SANS}">${rub}</b><span style="font: 400 13px ${SANS}; color: ${C.dim}">${text}</span><span style="flex-grow: 1"></span>${knapp}</div>`;
};
const PH_TXT = '7 Plains and 5 Swamps were in the photos. Add the ones you didn’t photograph.';
/* Korten efter foto 1 och 2: de från foto 2 är New och kommer in en i taget. */
const FOTO1 = ['Pharika’s Chosen', 'Killing Glare', 'Ukud Cobra', 'Valkyrie’s Sword', 'Trusty Retriever', 'Flutterfox', 'Night’s Whisper', 'Thriving Moor'];
const FOTO2 = ['Resistance Reunited', 'Pacifism', 'Maul of the Skyclaves', 'Aphelia, Viper Whisperer', 'Thriving Heath', 'Coat with Venom', 'Gorgon Flail'];
const band = (...s) => `<div style="display: flex; gap: 28px; align-items: flex-start">${s.join('')}</div>`;
function lek(urval, kortO, tva) {
  const sek = (typ) => { const x = TYP[typ].filter(n => urval.includes(n)); return x.length ? sektion(typ, x.length, x.map(n => kortRuta(n, kortO(n))).join(''), 'flex: none') : ''; };
  return tva ? band(sek('Creatures'), sek('Instants & sorceries')) + band(sek('Artifacts & enchantments'), sek('Lands'))
    : sek('Creatures') + band(sek('Instants & sorceries'), sek('Artifacts & enchantments'), sek('Lands'));
}
function gridEfter2() {
  let i = 0;
  return lek([...FOTO1, ...FOTO2], n => { const ny = FOTO2.includes(n); return { w: 74, ny, check: n === 'Gorgon Flail', anim: ny ? 0.25 * (i++) : 0 }; }, true);
}
const HELA = Object.values(TYP).flat();
const gridHela = (o = {}) => lek(HELA.filter(n => !(o.utan || []).includes(n)), n => ({ w: 54, check: (o.check || []).includes(n) }));
const tomt = (ikon, rub, text) => `<div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; border: 1.5px dashed #39445a; border-radius: 16px; padding: 40px"><span style="width: 64px; height: 64px; border-radius: 16px; display: grid; place-items: center; background: ${C.bg2}; border: 1px solid ${C.line}; color: ${C.dim}">${ikon}</span><b style="font: 700 20px ${SANS}">${rub}</b><span style="font: 400 14.5px/1.5 ${SANS}; color: ${C.dim}; max-width: 440px">${text}</span></div>`;
/* Setup: samma sida, men vägen tillbaka heter Game setup. Create deck (hette Use this deck, Jesper: missvisande för en ny lek) står bara i klart-raden. */
const iSetup = (html) => { const u = html.replace(`${ik.back()}Home</button>`, `${ik.back()}Game setup</button>`);
  if (u === html) throw new Error('iSetup träffade inte');
  return u; };

/* ══ Gap 4 · Hela skärmen medan man fotar ══════════════════════════════ */
skriv('N1.dc.html', sidan('N1: step 1, the whole screen', panelUr('H1'),
  tomt(ik.phone(30), 'Waiting for your phone', 'Scan the code on the left with your phone. After that, every photo you take lands here, sorted by type.'), '0 cards'));
skriv('N2.dc.html', sidan('N2: step 2, the whole screen', panelUr('H2'),
  tomt(ik.camera(30), 'Your first photo lands here', 'Lay out the cards and take the photo with your phone. They show up here a few seconds later, sorted by type. Basic lands are counted at the bottom.'), '0 cards'));
skriv('N3.dc.html', sidan('N3: after photo 2, the whole screen', panelUr('H3'),
  bar('gul', `<i style="display: block; width: 9px; height: 9px; border-radius: 50%; background: ${C.acc}"></i>`, '1 name to check', 'You check it when you’re done photographing.')
  + gridEfter2() + basland({ Plains: 4, Swamp: 4 }, 'Counted from the photos so far.', { Plains: 4, Swamp: 4 }), '24 cards'));

/* ══ Gap 10 och 11 · Fotoraderna på datorn ═══════════════════════════ */
const tumMork = (f) => `<span style="position: relative; width: 44px; height: 51px; overflow: hidden; border-radius: 4px; flex: none; display: block; filter: grayscale(.6) brightness(.55)"><img src="${f.url}" alt="" style="position: absolute; left: -3px; top: -10px; width: ${Math.round(f.w * 44 / 1300)}px; height: ${Math.round(f.h * 44 / 1300)}px; max-width: none"></span>`;
const rad = (nr, tum, text, o = {}) => `<div style="display: flex; align-items: center; gap: 12px; padding: 8px 10px; border-radius: 10px; background: ${o.nu ? '#1d1810' : C.bg2}; border: 1px solid ${o.nu ? '#6a5220' : C.line}">${tum}<div style="display: flex; flex-direction: column; gap: 2px; flex-grow: 1; min-width: 0"><b style="font: 650 13.5px ${SANS}">Photo ${nr}</b><span style="font: 500 12.5px/1.35 ${SANS}; color: ${o.farg || C.dim}">${text}</span></div>${o.hoger ?? `<button type="button" style="border: 0; background: transparent; color: ${C.dim}; font: 600 12.5px ${SANS}; cursor: pointer">View</button>`}</div>`;
const laser = `<span style="width: 44px; height: 51px; border-radius: 4px; background: ${C.bg3}; display: grid; place-items: center; color: ${C.acc}; flex: none; animation: puls2 1.6s infinite">${ik.camera(16)}</span>`;
const panelN = (titel, innehall) => sida(titel, 420, 900, `<aside style="width: 420px; height: 900px; box-sizing: border-box; padding: 20px 22px; background: #11151c; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column; gap: 14px; overflow: hidden; border-right: 1px solid ${C.line}"><b style="font: 700 15px ${SANS}">Add cards</b>${fs.readFileSync(path.join(src, 'H3.dc.html'), 'utf8').match(/<div role="tablist"[\s\S]*?<\/div>/)[0]}${innehall}</aside>`);
skriv('N4.dc.html', panelN('N4: photo rows that added nothing, and one being read', ansl
  + rad(1, tumFoto(F07), '12 cards added')
  + rad(2, tumFoto(F16), '18 cards added · 12 names to pick when you’re done')
  + rad(3, tumMork(F05), 'No cards found. Nothing added.', { farg: C.dim2 })
  + rad(4, tumMork(F15), '6 cards, no names read. Nothing added.', { farg: C.dim2 })
  + rad(5, laser, 'Reading, about half a minute', { nu: true, farg: C.acc, hoger: '' })
  + `<div style="display: flex; flex-direction: column; gap: 6px; padding-top: 4px">${stor('Photo 5 is being read')}${t('The cards land on the right when it’s done. Photos 3 and 4 were retaken on the phone, or their cards put aside.')}</div>`
  + `<span style="flex-grow: 1"></span>` + botten));

/* ══ Gap 7 · Efter Remove photo 2 ════════════════════════════════════ */
function radS(typ, titel, under) {
  const ikon = typ === 'kand' ? [C.green, C.ink, ik.check(12, 3.2), ''] : typ === 'varn' ? [C.acc, C.ink, '!', ''] : [ROD, '#fff', '!', ''];
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
const bortFoto = (() => { const f = F06, dw = 354, s = dw / f.w, top = 150; return `<div style="position: relative; width: ${dw}px; height: 232px; border-radius: 10px; overflow: hidden; flex: none"><img src="${f.url}" alt="Photo 2, removed" style="position: absolute; left: 0; top: ${-Math.round(top * s)}px; width: ${dw}px; height: ${Math.round(f.h * s)}px; filter: grayscale(.8) brightness(.4)"><span style="position: absolute; inset: 0; display: grid; place-items: center"><span style="display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 99px; background: #0d1015ee; border: 1px solid ${C.line}; font: 650 14px ${SANS}">${ik.trash(14)}Removed</span></span></div>`; })();
skriv('N5.dc.html', telefon('N5: the phone after Remove photo 2', 'PHOTO 2', 'Photo 2 removed', 'Its 12 cards are out of the deck.',
  rader(radS('kand', 'The 12 cards from photo 1 are still in')) + bortFoto,
  tk('Take photo 2', 'prim', ik.camera()) + tk(SLUT, 'sek')
  + `<div style="display: flex; flex-direction: column; align-items: center">${hText('Undo').replace(ik.rotate(16), ik.undo(16))}<span style="font: 400 12.5px ${SANS}; color: ${C.dim2}; margin-top: -6px">Puts photo 2 and its 12 cards back</span></div>`));
skriv('N6.dc.html', panelN('N6: the panel after Remove photo 2', ansl
  + rad(1, tumFoto(F07), '12 cards added')
  + rad(2, tumMork(F06), 'Removed, with its 12 cards', { farg: C.dim2, hoger: pk(ik.undo() + 'Undo', 'ghost', 'height: 32px; color: #e7ecf4') })
  + `<div style="display: flex; flex-direction: column; gap: 6px; padding-top: 4px">${stor('Lay out the next 10–15 cards')}${t('Move the photographed cards aside first, then take photo 2 again.')}</div>`
  + laggAnim(376, 170, { per: 3 }) + vantar('Waiting for photo 2')
  + `<span style="flex-grow: 1"></span>` + botten));

/* ══ Gap 14, 15 och 16 · Slutet ══════════════════════════════════════ */
const klarPanel = `<div style="display: flex; flex-direction: column; gap: 6px">${stor('The deck is ready')}${t('40 cards, saved. You can change it any time.')}</div>`
  + stegLista(stegKort(1, 'Check 3 names', '', false, true), stegKort(2, 'Type in the cards you put aside', '', false, true), stegKort(3, 'Basic lands', '', false, true))
  + fotonKort + `<span style="flex-grow: 1"></span>` + merFoton;
const klarHoger = (knapp) => bar('gron', ik.check(18, 2.8), 'The deck is ready', '40 cards: names checked, the cards you put aside typed in, basic lands set.', knapp)
  + gridHela() + basland({ Plains: 7, Swamp: 7 }, '7 Plains and 5 Swamps were in the photos. You added 2 Swamps.', { Plains: 7, Swamp: 5 });
skriv('N7.dc.html', sidan('N7: deck page, the deck is ready', klarPanel, klarHoger(pk(ik.back() + 'Back to Home', 'sek', 'height: 36px')), '40 cards'));
skriv('N8.dc.html', iSetup(sidan('N8: game setup, the deck is ready', klarPanel, klarHoger(pk('Create deck', 'prim', 'height: 36px')), '40 cards')));

const senare = `<div style="display: flex; flex-direction: column; gap: 6px">${stor('4 photos, 38 cards added')}${t('Three things left.')}</div>`
  + stegLista(
    stegKort(1, 'Check 3 names', 'Left for later. 2 are in the deck as Mesa’s guess, 1 waits for a name.', false, false, pk('Check now', 'sek', 'height: 32px; align-self: flex-start; margin-top: 4px')),
    stegKort(2, 'Type in the cards you put aside', 'Type a name and press Enter. The card goes into the deck.', true, false, `<div style="margin-top: 6px">${sokF('', 'Card name')}</div>`),
    stegKort(3, 'Basic lands', 'At the bottom.', false, false))
  + fotonKort + `<span style="flex-grow: 1"></span>` + merFoton;
skriv('N9.dc.html', sidan('N9: Later, names left to check', senare,
  kollBar(3, { text: 'Left for later. Cards marked Check are Mesa’s guess.' }).replace('>Check names<', '>Check now<')
  + gridHela({ check: ['Gorgon Flail', 'Venomous Hierophant'], utan: ['Hooded Blightfang', 'Vraska’s Finisher', 'Serpent Assassin'] })
  + basland({ Plains: 7, Swamp: 5 }, PH_TXT, { Plains: 7, Swamp: 5 }), '35 cards'));

/* ── Indexet: sidan n först ── */
const canvas = JSON.parse(fs.readFileSync(path.join(src, 'canvas.json'), 'utf8'));
const P = 'n', boards = {}, notes = {};
const plats = {
  N1: [0, 0, 1440, 900, 'N1 · Gap 4 · Step 1, the whole screen'],
  N2: [1520, 0, 1440, 900, 'N2 · Gap 4 · Step 2, the whole screen'],
  N3: [3040, 0, 1440, 900, 'N3 · Gap 4 · After photo 2, cards land with New'],
  N4: [0, 1243, 420, 900, 'N4 · Gaps 10 and 11 · Photos that added nothing, one being read'],
  N5: [500, 1243, 390, 844, 'N5 · Gap 7 · The phone after Remove photo 2'],
  N6: [970, 1243, 420, 900, 'N6 · Gap 7 · The panel after Remove photo 2, with Undo'],
  N7: [0, 2486, 1440, 900, 'N7 · Gap 14 · Deck page: the deck is ready'],
  N8: [1520, 2486, 1440, 900, 'N8 · Gap 15 · Game setup: the deck is ready, Create deck'],
  N9: [3040, 2486, 1440, 900, 'N9 · Gap 16 · Later: names left to check'],
};
for (const [k, [x, y, w, h, title]] of Object.entries(plats)) boards[k + '.dc.html'] = { x, y, w, h, title, page: P };
notes.n0 = { x: 0, y: -260, text: 'Gap 4 · The whole screen while you photograph', kind: 'title1', maxW: 4480, page: P };
notes.n1 = { x: 0, y: 983, text: 'Gaps 7, 10 and 11 · Photo rows, and removing a photo', kind: 'title1', maxW: 1390, page: P };
notes.n2 = { x: 0, y: 2226, text: 'Gaps 14, 15 and 16 · The end, and Later', kind: 'title1', maxW: 4480, page: P };
const lapp = (id, x, y, text) => { notes[id] = { x, y, text, w: 390, maxH: 400, size: 's', fill: 'gray', page: P }; };
lapp('nl0', 4560, 0, 'Proposal: the right side says what it waits for, the same step as the panel (the app does this today). Photo 2’s cards come in one at a time with New. A name to check is only mentioned while you photograph; you answer it after Finish the deck.');
lapp('nl1', 1470, 1243, 'Proposal: a photo that added nothing keeps its row, dimmed, so the photo numbers match the phone. A photo being read shows as a pulsing row. A removed photo keeps its row with Undo until the next photo lands, and its number is used again.');
lapp('nl2', 4560, 2486, 'Proposal: the done state is the same on the deck page and in game setup; only the button in the green bar differs (Back to Home, Create deck). The top bar only has the way back. Later keeps the Check names bar at the top and moves on to the next step. The photos and Take more photos stay in the panel (Decide 3).');
canvas.pages = [{ id: P, name: 'N · Proposals for the gaps' }, ...canvas.pages.filter(p => p.id !== P)];
canvas.launch = { view: 'canvas', page: P };
Object.assign(canvas.boards, boards);
canvas.order = [...canvas.order.filter(k => !boards[k]), ...Object.keys(boards)];
Object.assign(canvas.notes, notes);
for (const [n, h] of Object.entries(filer)) fs.writeFileSync(path.join(ut, 'project', n), h);
fs.writeFileSync(path.join(ut, 'project', 'canvas.json'), JSON.stringify(canvas, null, 1));
const streck = Object.entries(filer).filter(([, h]) => /—/.test(h)).map(([n]) => n);
console.log(Object.keys(filer).join(' '), streck.length ? 'TANKSTRECK: ' + streck.join(' ') : 'inga tankstreck');

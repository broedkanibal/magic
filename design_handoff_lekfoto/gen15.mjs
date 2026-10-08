// Sida M, slutlig (Jesper 2026-09-27, "kör"): byggunderlaget. Luckorna är ersatta av sida N:s
// godkända förslag och av äldre designer (J7–J10 retake, HD2 View, I10 telefonen efter Finish),
// och besluten är införda i kopiorna:
//   D1 ingen siffra för undanlagda kort · D2/Jesper "Finish the deck" i stället för Done photographing
//   D3 ID1:s steg plus fotona och Take more photos · D4 "mark", inte "check" · inga "Step x of y".
// Det som byggs som appen är i dag, och det som väntar till efter v1, står på grå lappar.
//
// node gen15.mjs <läst project-mapp> <ut>
//   <läst project-mapp>: ytans canvas.json och artboards, lästa precis före (Artifact read)
import { fs, path, C, SANS, F07, F06, F05, F15, ik, sida, t, stor, etik, pk, fotoRadH } from './delar5.mjs';

const [src, ut] = process.argv.slice(2);
if (!src || !ut) { console.error('node gen15.mjs <läst project-mapp> <ut>'); process.exit(1); }
fs.mkdirSync(path.join(ut, 'project'), { recursive: true });
const las = (n) => fs.readFileSync(path.join(src, n + '.dc.html'), 'utf8');
const filer = {};
/* byt: [[från, till, antal = 1], …] — varje byte måste träffa exakt så många gånger. */
function andra(kalla, byt) {
  let s = las(kalla);
  for (const [a, b, n = 1] of byt) {
    const k = typeof a === 'string' ? s.split(a).length - 1 : (s.match(new RegExp(a.source, 'g')) || []).length;
    if (k !== n) throw new Error(`${kalla}: ${a} träffar ${k} gånger, inte ${n}`);
    s = typeof a === 'string' ? s.split(a).join(b) : s.replace(a, b);
  }
  return s;
}

/* ── Delar som på sida N ── */
const SLUT = 'Finish the deck';
const botten = `<div style="display: flex; flex-direction: column; gap: 8px"><span style="font: 500 13px ${SANS}; color: ${C.dim}">Photographed every card?</span><button type="button" style="height: 48px; width: 100%; border-radius: 10px; background: ${C.bg3}; border: 1px solid #3d4a5f; color: ${C.txt}; font: 650 15px ${SANS}; display: flex; align-items: center; justify-content: center; gap: 9px; cursor: pointer">${ik.check(16, 2.6)}${SLUT}</button></div>`;
const tumFoto = (f) => fotoRadH(0, f, '').match(/^<div[^>]*>(<span[\s\S]*?<\/span>)/)[1];
const fotonKort = etik('PHOTOS', C.dim) + `<div style="display: flex; gap: 10px">${[[F07, 12], [F06, 12], [F05, 6], [F15, 8]].map(([f, n], i) => `<button type="button" aria-label="View photo ${i + 1}" style="display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 6px; border-radius: 10px; background: ${C.bg2}; border: 1px solid ${C.line}; color: ${C.txt}; cursor: pointer">${tumFoto(f)}<span style="font: 600 11.5px ${SANS}; color: ${C.dim}">Photo ${i + 1} · ${n}</span></button>`).join('')}</div>`;
const merFoton = pk(ik.camera(16) + 'Take more photos', 'sek', 'align-self: flex-start');
const FOTON_I_PANELEN = `</ol>${fotonKort}<span style="flex-grow: 1"></span>${merFoton}`;
const stegKort = (nr, titel, text, nu) => `<li style="display: flex; gap: 12px; padding: 12px 14px; border-radius: 11px; ${nu ? 'background: #1d1810; border: 1px solid #6a5220' : `background: ${C.bg2}; border: 1px solid ${C.line}`}"><span style="width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; flex: none; font: 700 11.5px ui-monospace, SFMono-Regular, Menlo, monospace; ${nu ? `background: ${C.acc}; color: ${C.ink}` : `border: 1px solid #39445a; color: ${C.dim}`}">${nr}</span><span style="display: flex; flex-direction: column; gap: 4px"><b style="font: 650 14px ${SANS}">${titel}</b>${text ? t(text, 'font-size: 12.5px') : ''}</span></li>`;
const KLAR = '>Done photographing<', KLAR2 = `>${SLUT}<`;

/* ── Artboards ── */
/* Telefonen efter varje foto: Finish the deck, och mark överallt. */
for (const k of ['LA1', 'LA2', 'LA3', 'LA5', 'LB1', 'LB2']) filer['M-' + k] = andra('M-' + k, [[KLAR, KLAR2]]);
filer['M-LA4'] = andra('M-LA4', [[KLAR, KLAR2], ['Cards without a check', 'Cards without a mark']]);
/* Retake (J7–J10). */
filer['M-J7'] = las('J7');
filer['M-J8'] = andra('J8', [[KLAR, KLAR2], ['Mesa found 12 cards', '12 cards found'], ['have a check?', 'have a mark?']]);
filer['M-J9'] = las('J9');
filer['M-J10'] = andra('J10', [[/<\/aside>/, `<span style="flex-grow: 1"></span>${botten}</aside>`]]);
/* Datorn medan man fotar. */
filer['M-IP1'] = andra('M-IP1', [
  ['9 cards added · 3 put aside · 1 name to check', '9 cards added · 1 name to check · some not read'],
  ['Then take photo 3 with your phone. The 3 cards you put aside are typed in at the end.', 'Move the photographed cards aside first, then take photo 3. The cards you put aside are typed in at the end.'],
  [/<span style="flex-grow: 1"><\/span><div style="display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: 12px; border: 1\.5px solid #9aa7ba;[\s\S]*?I’m done<\/button><\/div>/, `<span style="flex-grow: 1"></span>${botten}`]]);
filer['M-HD2'] = andra('HD2', [['Finish the deck on the right: check 3 names at the top, and the basic lands at the bottom.', 'Next: check names, type in the cards you put aside, basic lands.']]);
/* Sida N:s förslag. */
for (const n of ['N1', 'N2', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9']) filer['M-' + n] = las(n);
filer['M-N3'] = andra('N3', [['You check it when you’re done photographing.', 'You check it when you finish the deck.']]);
/* Telefonen efter Finish the deck (I10), utan siffra för undanlagda kort. */
filer['M-I10'] = andra('I10', [['3 cards to type in', 'Cards you put aside'], ['The ones you put aside.', 'Type them in on the computer.']]);
/* Kolla namn (ID1 A–D): inga siffror för undanlagda kort, och fotona kvar i panelen. */
for (const k of ['A', 'B', 'C', 'D']) filer['M-ID1' + k] = andra('M-ID1' + k, [
  ['Type in the 3 cards you put aside', 'Type in the cards you put aside'],
  ['3 cards to type in', 'Cards you put aside'],
  ['The ones you put aside because the photos didn’t find them.', 'The ones the photos didn’t find. You type them in after the names.'],
  ['</ol>', FOTON_I_PANELEN]]);
filer['M-ID2'] = andra('M-ID2', [
  ['Type in the 3 cards you put aside', 'Type in the cards you put aside'],
  [/<span[^>]*>STEP 2 OF 3<\/span>/, ''],
  [/<div style="display: flex; align-items: center; gap: 10px"><div style="flex-grow: 1; height: 6px[\s\S]*?1 of 3<\/b><\/div>/, '']]);
filer['M-ID3'] = andra('M-ID3', [
  ['Type in the 3 cards you put aside', 'Type in the cards you put aside'],
  ['Names checked, and the 3 cards you put aside are in', 'Names checked, and the cards you put aside are in'],
  ['</ol>', FOTON_I_PANELEN]]);
/* ID1 utan undanlagda kort: steg 2 hoppas över (D3). */
{
  const flikar = las('J9').match(/<div role="tablist"[\s\S]*?<\/div>/)[0];
  filer['M-ID0'] = sida('ID0: the panel when no cards were put aside', 420, 900, `<aside style="width: 420px; height: 900px; box-sizing: border-box; padding: 20px 22px; background: #11151c; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column; gap: 14px; overflow: hidden; border-right: 1px solid ${C.line}"><b style="font: 700 15px ${SANS}">Add cards</b>${flikar}`
    + `<div style="display: flex; flex-direction: column; gap: 6px">${stor('4 photos, 38 cards added')}${t('Two things left, in this order.')}</div>`
    + `<ol style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px">${stegKort(1, 'Check 3 names', 'Shown one at a time on the right.', true)}${stegKort(2, 'Basic lands', '7 Plains and 5 Swamps were in the photos. Add any you didn’t photograph, at the bottom.', false)}${FOTON_I_PANELEN}</aside>`);
}
for (const [n, h] of Object.entries(filer)) {
  if (/Done photographing|STEP \d OF \d|—/.test(h)) throw new Error(n + ': Done photographing, STEP eller tankstreck kvar');
  fs.writeFileSync(path.join(ut, 'project', n + '.dc.html'), h);
}

/* ── Sidan M: rader uppifrån och ned ── */
const canvas = JSON.parse(fs.readFileSync(path.join(src, 'canvas.json'), 'utf8'));
const P = 'm', PH = [390, 844], PAN = [420, 900], DT = [1440, 900], FR = [1020, 460];
const gamla = Object.keys(canvas.boards).filter(k => canvas.boards[k].page === P);
const boards = {}, notes = {};
const rubrik = (id, text, y, maxW) => { notes[id] = { x: 0, y: y - 260, text, kind: 'title1', maxW, page: P }; };
const lapp = (id, x, y, text, w = 390, maxH = 520) => { notes[id] = { x, y, text, w, maxH, size: 's', fill: 'gray', page: P }; };
const board = (fil, x, y, [w, h], title) => { boards[`M-${fil}.dc.html`] = { x, y, w, h, title, page: P }; };
const lLapp = (kod, x, y, byt = []) => {
  const n = canvas.notes['ll' + kod]; if (!n) throw new Error('ingen lapp för ' + kod);
  let text = n.text; for (const [a, b] of byt) text = text.split(a).join(b);
  notes['mll' + kod] = { ...n, text, x, y, page: P };
};
const L = (k) => canvas.boards[k + '.dc.html'].title;

lapp('mlegend', -560, 0, 'Build from this page.\n\nRows follow the flow, top to bottom: the computer starts, the phone photographs, the computer finishes.\n\nGray notes under the phone screens: what happened, what Mesa knows, what you do (from page L).\nGray notes in a row: built as the app is today, or not in the first version.', 480, 520);

let y = 0;
rubrik('m1', '1 · Start on the computer: the deck page or game setup', y, 3430);
lapp('mapp1', 0, y, 'BUILT AS THE APP IS TODAY\n\nGame setup: Get ready for the game, step 1 → New deck opens the deck page inside the setup, with Game setup as the way back.\n\nDeck page: Home → New deck opens an empty deck with three ways to add cards. The first one is called Take photos (today: Scan with your phone), and says 10–15 cards at a time (today: about 30).\n\nNot signed in: Sign in first. The deck can’t be created: say so, and try again.');
board('N1', 470, y, DT, 'N1 · Take photos, connect the phone');
board('N2', 1990, y, DT, 'N2 · Phone connected, waiting for photo 1');

y = 1243;
rubrik('m2', '2 · The phone: connect, lay out, take the photo', y, 2270);
lapp('mapp2', 0, y, 'BUILT AS THE APP IS TODAY\n\nThe phone opens the deck (Opening the deck…), or says it is signed in with another account. Connected, then Lay out the cards (10–15 at a time) and Open the camera.\n\nThe camera isn’t allowed: the phone’s own camera opens instead.\n\nWhile the photo is read: Reading photo n, about half a minute. MES-319 measures a faster way.');
[['a', 'names are readable'], ['b', 'warns, too small'], ['c', 'warns, blurry'], ['d', 'warns, reflection']].forEach(([k, s], i) => board('LC1' + k, 470 + i * 470, y, PH, 'LC1 · The camera: ' + s));
lLapp('LC1', 470, y + 884);

y = 2660;
rubrik('m3a', '3A · After each photo: the photo worked', y, 2270);
['LA1', 'LA2', 'LA3', 'LA4', 'LA5'].forEach((k, i) => { board(k, i * 470, y, PH, L(k)); lLapp(k, i * 470, y + 884, [['got no check', 'got no mark']]); });

y = 4077;
rubrik('m3b', '3B · The same cards again, and removing a photo', y, 1830);
['LB1', 'LB2'].forEach((k, i) => { board(k, i * 470, y, PH, L(k)); lLapp(k, i * 470, y + 884); });
board('N5', 940, y, PH, 'N5 · The phone after Remove photo 2');
board('N6', 1410, y, PAN, 'N6 · The panel after Remove photo 2, with Undo');

y = 5494;
rubrik('m3c', '3C · The photo couldn’t be used, and retaking a photo', y, 3270);
['LC2', 'LC3', 'LC4'].forEach((k, i) => { board(k, i * 470, y, PH, L(k)); lLapp(k, i * 470, y + 884); });
board('J7', 1410, y, PH, 'J7 · Retake: the camera says what happens');
board('J8', 1880, y, PH, 'J8 · After the retake');
board('J9', 2350, y, PAN, 'J9 · The panel while photo 1 is retaken');
board('J10', 2850, y, PAN, 'J10 · The panel after the retake, with Undo');

y = 6911;
rubrik('m3d', '3D · Something technical', y, 1800);
['LD1', 'LD2', 'LD3', 'LD4'].forEach((k, i) => { board(k, i * 470, y, PH, L(k)); lLapp(k, i * 470, y + 884); });

y = 8328;
rubrik('m4', '4 · The computer while you photograph', y, 3960);
board('N3', 0, y, DT, 'N3 · After photo 2: the cards land with New');
board('IP1', 1520, y, PAN, 'IP1 · The panel after a photo where cards were put aside');
board('N4', 2020, y, PAN, 'N4 · Photos that added nothing, and one being read');
board('HD2', 2520, y, DT, 'HD2 · View a photo');

y = 9571;
rubrik('m5', '5 · Finish the deck: the phone, then check names one at a time', y, 8070);
board('I10', 0, y, PH, 'I10 · The phone after Finish the deck');
board('ID0', 470, y, PAN, 'ID0 · The panel when no cards were put aside');
['A · a close match', 'B · a few candidates', 'C · no name read', 'D · not a card name (pasted list)'].forEach((s, i) => board('ID1' + 'ABCD'[i], 970 + i * 1520, y, DT, 'ID1 · Check names, case ' + s));
board('LR1', 7050, y, FR, L('LR1'));
board('LR2', 7050, y + FR[1] + 120, FR, L('LR2'));

y = 10954;
rubrik('m6', '6 · The cards you put aside, basic lands, and the end', y, 7520);
board('ID2', 0, y, DT, 'ID2 · Type in the cards you put aside');
board('ID3', 1520, y, DT, 'ID3 · Basic lands');
board('N7', 3040, y, DT, 'N7 · Deck page: the deck is ready');
board('N8', 4560, y, DT, 'N8 · Game setup: the deck is ready, Create deck');
board('N9', 6080, y, DT, 'N9 · Later: names left to check');

y = 12197;
rubrik('m7', 'Not in the first version', y, 1800);
lapp('mv1', 0, y, 'NOT IN THE FIRST VERSION\n\nThe phone goes away mid-way (locked, tab closed, battery): the phone says so and tries again, as today.\n\nPhotos to the sideboard: photos go to the main deck. The sideboard is added with Type.\n\nIn game setup, the phone from the photos becomes the table camera.\n\nThe deck page in a phone browser, without a computer.\n\nFaster reading: MES-319.');

/* Indexet: sidan m:s gamla artboards och lappar ut, de nya in; sidan m öppnas. */
const bort = gamla.filter(k => !boards[k]);
for (const k of gamla) delete canvas.boards[k];
for (const k of Object.keys(canvas.notes)) if (canvas.notes[k].page === P) delete canvas.notes[k];
Object.assign(canvas.boards, boards);
canvas.order = [...canvas.order.filter(k => !gamla.includes(k)), ...Object.keys(boards)];
Object.assign(canvas.notes, notes);
canvas.pages = [...canvas.pages.filter(p => p.id === P).map(p => ({ ...p, name: 'M · Build from this: every state' })), ...canvas.pages.filter(p => p.id !== P)];
canvas.launch = { view: 'canvas', page: P };
for (const k of Object.keys(boards)) {
  const n = k.replace('.dc.html', '');
  if (!filer[n] && !fs.existsSync(path.join(src, k)) && !gamla.includes(k)) throw new Error('saknar fil för ' + k);
}
fs.writeFileSync(path.join(ut, 'project', 'canvas.json'), JSON.stringify(canvas, null, 1));
fs.writeFileSync(path.join(ut, 'filer.json'), JSON.stringify({ skicka: Object.keys(filer).map(n => `project/${n}.dc.html`), bort: bort.map(k => 'project/' + k) }));
console.log(`${Object.keys(boards).length} artboards på M, ${Object.keys(filer).length} filer skrivna, bort: ${bort.join(' ')}`);

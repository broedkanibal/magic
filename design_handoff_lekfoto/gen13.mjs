// Sida M · "Build from this": hela flödet för att lägga till kort via foton,
// som kopior av Jespers valda artboards (alla L, IP1, ID1–ID3, H1–H4) utan
// ändringar, utom att LC1 och ID1 får en kopia per Tweaks-fall. Luckor är
// orange lappar (inte ritade), beslut är röda lappar.
//
// node gen13.mjs <källa> <ut>
//   <källa>: mappen med ytans project/-filer (Artifact read, path project/…)
//   <ut>:    rot att publicera från; skriver <ut>/project/M-*.dc.html och
//            <ut>/project/canvas.json (källans index + sidan m)
import fs from 'node:fs';
import path from 'node:path';

const [src, ut] = process.argv.slice(2);
if (!src || !ut) { console.error('node gen13.mjs <källa> <ut>'); process.exit(1); }
fs.mkdirSync(path.join(ut, 'project'), { recursive: true });

const PAGE = 'm';
const PH = { w: 390, h: 844 }, PAN = { w: 420, h: 900 }, DT = { w: 1440, h: 900 }, FR = { w: 1020, h: 460 };
const canvas = JSON.parse(fs.readFileSync(path.join(src, 'canvas.json'), 'utf8'));
const boards = {}, order = [], notes = {};

// En kopia av en artboard; byt = [[från, till], …] för ett Tweaks-fall.
function kopia(kalla, namn, title, x, y, dim, byt = []) {
  let s = fs.readFileSync(path.join(src, kalla + '.dc.html'), 'utf8');
  for (const [a, b] of byt) {
    if (!s.includes(a)) throw new Error(`${kalla}: hittar inte ${a}`);
    s = s.split(a).join(b);
  }
  const fil = `M-${namn}.dc.html`;
  fs.writeFileSync(path.join(ut, 'project', fil), s);
  boards[fil] = { x, y, w: dim.w, h: dim.h, title, page: PAGE };
  order.push(fil);
}
function rubrik(id, text, y, maxW) {
  notes[id] = { x: 0, y: y - 260, text, kind: 'title1', maxW, page: PAGE };
}
function lapp(id, text, x, y, fill, w = 390, maxH = 520) {
  notes[id] = { x, y, text, w, maxH, size: 's', fill, page: PAGE };
}
// L:s grå lappar (Happened / Mesa knows / You) följer med sina artboards.
function lLapp(kod, x, y) {
  const n = canvas.notes['ll' + kod];
  if (!n) throw new Error('ingen lapp för ' + kod);
  notes['mll' + kod] = { ...n, x, y, page: PAGE };
}
const lucka = (nr, rub, txt) => `NOT DESIGNED · Gap ${nr}\n${rub}\n\n${txt}`;
const beslut = (nr, rub, txt) => `DECIDE · ${nr}\n${rub}\n\n${txt}`;
const titel = kod => canvas.boards[kod + '.dc.html'].title;
// Raderna: 83 px från förra radens nederkant till rubriken, 260 till raden.

// ── Förklaringen ──
lapp('mlegend', 'Build from this page.\n\nRows follow the flow, top to bottom. Every board is a copy of L, IP1, ID1–ID3 or H1–H4, unchanged. LC1 and ID1 appear once per Tweaks case.\n\nOrange: not designed yet (Gap 1–16).\nRed: pick one before building (Decide 1–7).\nGray: what happened, from page L.', -560, 0, 'gray', 480, 520);

// ── 1 · Datorn: var det börjar ──
let y = 0;
rubrik('m1', '1 · Start on the computer: game setup or the deck page', y, 2800);
lapp('mg1', lucka(1, 'Game setup: where it starts', 'Get ready for the game, step 1 → New deck → the deck page inside the setup. What shows it is the setup, and the way back.\n\nNearest: F2 (page F) and the app today (MES-204).'), 0, y, 'orange');
lapp('mg2', lucka(2, 'Deck page: where it starts', 'Home → New deck → an empty deck. How Take photos gets picked: today an empty deck shows three choices (Scan with your phone, Recommended). H1 starts with the tab already open.\n\nAlso: Take photos on a deck that already has cards. New marks, basic lands already in the deck, the count.'), 470, y, 'orange');
lapp('mg3', lucka(3, 'Before the phone can connect', 'Not signed in (today: Sign in first).\nThe deck can’t be created without a connection.\nAI help is off: LD4 only tells the phone, after the photo is taken.'), 940, y, 'orange');
kopia('H1', 'H1', titel('H1'), 1410, y, PAN);
kopia('H2', 'H2', titel('H2'), 1910, y, PAN);
lapp('mg4', lucka(4, 'The whole computer screen while you photograph', 'H1–H4 and IP1 are only the left panel. The card area on the right: empty (today: Your first photo lands here), and as cards land with New and Check marks.\n\nID1–ID3 show the right side only after the photos.'), 2410, y, 'orange');

// ── 2 · Telefonen: ansluta, lägga ut, fota ──
y = 1243;
rubrik('m2', '2 · The phone: connect, lay out, take the photo', y, 2740);
lapp('mg5', lucka(5, 'The phone, from the code to the camera', 'Opening the deck. Signed in with another account (today an error). Connected. Lay out 10–15 cards (M0 on page G is older). Open the camera. A link to a deck that is gone.\n\nThe camera isn’t allowed: today the phone’s own camera opens instead, so LC1’s tips never show.'), 0, y, 'orange');
const LC1 = [['a', 'Readable', 'LC1 · The camera: names are readable'], ['b', 'Too small', 'LC1 · The camera warns: too small'],
             ['c', 'Blurry', 'LC1 · The camera warns: blurry'], ['d', 'Reflection', 'LC1 · The camera warns: reflection']];
LC1.forEach(([k, v, t], i) => kopia('LC1', 'LC1' + k, t, 470 + i * 470, y, PH,
  [['"default":"Too small"', `"default":"${v}"`], ["?? 'Too small'", `?? '${v}'`]]));
lLapp('LC1', 470, y + 884);
lapp('mg6', lucka(6, 'The phone while the photo is read', 'About half a minute (today: Reading photo 1, keep this page open). Sending, then reading.\n\nCan you lay out the next cards and take the next photo meanwhile?'), 2350, y, 'orange');

// ── 3A · Fotot fungerade ──
y = 2660;
rubrik('m3a', '3A · After each photo: the photo worked', y, 2270);
['LA1', 'LA2', 'LA3', 'LA4', 'LA5'].forEach((k, i) => { kopia(k, k, titel(k), i * 470, y, PH); lLapp(k, i * 470, y + 884); });

// ── 3B · Samma kort igen ──
y = 4077;
rubrik('m3b', '3B · The same cards again', y, 1330);
['LB1', 'LB2'].forEach((k, i) => { kopia(k, k, titel(k), i * 470, y, PH); lLapp(k, i * 470, y + 884); });
lapp('mg7', lucka(7, 'After Remove photo 2 (LB1)', 'The phone right after. The computer: the photo’s row and its cards gone, with Undo.'), 940, y, 'orange');

// ── 3C · Fotot gick inte att använda ──
y = 5494;
rubrik('m3c', '3C · The photo couldn’t be used', y, 1800);
['LC2', 'LC3', 'LC4'].forEach((k, i) => { kopia(k, k, titel(k), i * 470, y, PH); lLapp(k, i * 470, y + 884); });
lapp('mg8', lucka(8, 'Retake', 'Every result has Retake photo n. The camera that says the photo will be replaced, and the phone after. The computer during and after, with Undo.\n\nNearest: J7–J10 (page J).'), 1410, y, 'orange');

// ── 3D · Något tekniskt ──
y = 6911;
rubrik('m3d', '3D · Something technical', y, 2270);
['LD1', 'LD2', 'LD3', 'LD4'].forEach((k, i) => { kopia(k, k, titel(k), i * 470, y, PH); lLapp(k, i * 470, y + 884); });
lapp('mg9', lucka(9, 'The phone goes away', 'The phone locks, the tab closes or the battery dies mid-way. H3 and IP1 keep saying Phone connected. What the computer shows, and how you reconnect to the same deck.\n\nA second phone scans the same code.'), 1880, y, 'orange');

// ── 4 · Datorn medan man fotar ──
y = 8328;
rubrik('m4', '4 · The computer while you photograph', y, 2330);
kopia('H3', 'H3', titel('H3'), 0, y, PAN);
kopia('IP1', 'IP1', titel('IP1'), 500, y, PAN);
lapp('mg10', lucka(10, 'The computer while a photo is read', 'H2, H3 and IP1 say Waiting for photo n. Nothing shows that a photo is on its way (today: Reading the photo, about half a minute).\n\nNearest: G4 (page G).'), 1000, y, 'orange');
lapp('mg11', lucka(11, 'Photos that didn’t add cards', 'How the panel shows a photo from LC2 (kept, 12 unreadable), LC3 (no cards), LC4 (no names), LD1 (not sent), LD2 (not saved) and LD4 (AI help off).'), 1470, y, 'orange');
lapp('mg12', lucka(12, 'View a photo', 'The View link in H3, H4 and IP1. What opens, and can a photo be removed from there?\n\nNearest: HD2 (page H), D2 (page G).'), 1940, y, 'orange');
lapp('md2', beslut(2, 'H3 or IP1 at the bottom', 'H3: Photographed every card? · Done photographing.\nIP1: Every card photographed? · I’m done.\nThe phone says Done photographing.'), 0, y + 940, 'red', 420, 260);
lapp('md1', beslut(1, 'The number of cards put aside', 'IP1 (3 put aside), ID1 (Type in the 3 cards) and ID2 (1 of 3) count them. On the phone you never say how many, and Mesa can’t know (LA3, LA4, LC3, LC4).\n\nEither the phone asks, or the computer drops the number.'), 500, y + 940, 'red', 420, 300);

// ── 5 · Klar med fotona, kolla namnen ──
y = 9871;
rubrik('m5', '5 · Done photographing, then check names one at a time', y, 8070);
lapp('mg13', lucka(13, 'The phone after Done photographing', 'And what it shows when you press Done on the computer instead.\n\nNearest: I10 (page I), with older copy (3 cards to type in).'), 0, y, 'orange');
kopia('H4', 'H4', titel('H4'), 470, y, PAN);
lapp('md3', beslut(3, 'H4 or ID1 when the photos are done', 'H4: names are checked “at the top”, the photos stay with View and Take more photos.\nID1: names one at a time on the right, no photos, no Take more photos.\n\nWith nothing put aside, which panel? And where do you take more photos after ID1?'), 470, y + 940, 'red', 420, 340);
const ID1 = [['A · Close match', 'ID1 · Check names, case A: a close match'], ['B · A few candidates', 'ID1 · Check names, case B: a few candidates'],
             ['C · No name read', 'ID1 · Check names, case C: no name read'], ['D · Not a card name (pasted list)', 'ID1 · Check names, case D: not a card name (pasted list)']];
ID1.forEach(([v, t], i) => kopia('ID1', 'ID1' + 'ABCD'[i], t, 970 + i * 1520, y, DT,
  [['"default":"A · Close match"', `"default":"${v}"`], ["?? 'A · Close match'", `?? '${v}'`]]));
kopia('LR1', 'LR1', titel('LR1'), 7050, y, FR);
kopia('LR2', 'LR2', titel('LR2'), 7050, y + FR.h + 120, FR);

// ── 6 · Undanlagda kort, basländer, slutet ──
y = 11454;
rubrik('m6', '6 · The cards you put aside, basic lands, and the end', y, 4370);
kopia('ID2', 'ID2', titel('ID2'), 0, y, DT);
kopia('ID3', 'ID3', titel('ID3'), 1520, y, DT);
lapp('mg14', lucka(14, 'The deck is done', 'ID3 is step 3 in progress. What the panel shows when the names, the cards put aside and basic lands are all done.'), 3040, y, 'orange');
lapp('mg15', lucka(15, 'Game setup: back with the deck', 'Use this deck → back to Get ready with the new deck picked.\n\nNearest: C5 (page F).'), 3510, y, 'orange');
lapp('mg16', lucka(16, 'Later', 'Check names has a Later button. What the panel and the deck show with names left to check, how you get back to them, and whether the deck can be used in a game meanwhile.'), 3980, y, 'orange');

// ── 7 · Beslut som gäller hela flödet ──
y = 12697;
rubrik('m7', 'Also decide before building', y, 1800);
lapp('md4', beslut(4, 'Check or mark', 'LA4 says “Cards without a check”. The rest of L says mark.'), 0, y, 'red', 390, 300);
lapp('md5', beslut(5, 'Sideboard', 'Do photos always go to the main deck? Type has Main deck and Sideboard.'), 470, y, 'red', 390, 300);
lapp('md6', beslut(6, 'Game setup: the phone after the photos', 'Does the phone that took the photos stay connected and become the camera in step 2 (Your camera)?'), 940, y, 'red', 390, 300);
lapp('md7', beslut(7, 'A phone without a computer', 'Can the deck page be used in a phone browser? HT2 (page H) is Check names on a narrow screen. If yes, every computer board needs a narrow version.'), 1410, y, 'red', 390, 300);

// ── Indexet: sidan m först, och den öppnas ──
canvas.pages = [{ id: PAGE, name: 'M · Build from this: every state' }, ...canvas.pages.filter(p => p.id !== PAGE)];
canvas.launch = { view: 'canvas', page: PAGE };
for (const [k, v] of Object.entries(boards)) canvas.boards[k] = v;
canvas.order = [...canvas.order.filter(k => !boards[k]), ...order];
for (const [k, v] of Object.entries(notes)) canvas.notes[k] = v;
fs.writeFileSync(path.join(ut, 'project', 'canvas.json'), JSON.stringify(canvas, null, 1));
console.log(`${order.length} artboards, ${Object.keys(notes).length} lappar`);
console.log(JSON.stringify(Object.fromEntries(order.map(f => ['project/' + f, 'project/' + f]))));

// Sida 2, "D · Combined": A som ram, C:s antal som slutkoll, B:s grannsignal under huven.
// Jespers svar 2026-09-26: överlappstexten var förvirrande; basländer ska kunna vara med eller inte,
// och det ska vara tydligt före fotot och vad man gör efter.
import { C, SANS, MONO, esc, ik, pst, btn, tx, ok, telefon, dator, steg, OUT, fs, path } from './delar.mjs';

const W = '#d9d2bc', B = '#3d3d44', A = '#a3abb3', T = '#c4a54a', P = '#b9ad8f', S = '#6e6a78';
const k = (n, c) => ({ n, c });
const Pl = () => k('Plains', P), Sw = () => k('Swamp', S);
const G = {
  fencing: [Pl(), k('Scourge of the Undercity', B), k('Mirran Bardiche', A), k('Ancestral Blade', W), k('Faithful Pikemaster', W), k('Fencing Ace', W)],
  venomous: [k('Venomous Hierophant', B), Pl(), Pl(), Sw()],
  pharika: [k('Pharika’s Chosen', B), k('Killing Glare', B), k('Ukud Cobra', B), Sw(), Pl(), Sw()],
  valkyrie: [k('Valkyrie’s Sword', A), k('Trusty Retriever', W), k('Flutterfox', W), Sw(), k('Gorgon Flail', A), k('Night’s Whisper', B)],
  maul: [Sw(), k('Thriving Moor', T), k('Resistance Reunited', W), k('Pacifism', W), Pl(), k('Maul of the Skyclaves', W)],
  hooded: [k('Hooded Blightfang', B), k('Aphelia, Viper Whisperer', B), k('Thriving Heath', T), Pl(), k('Coat with Venom', B), Sw()],
  militant: [Sw(), k('Danitha Capashen, Paragon', W), k('Serpent Assassin', B), Pl(), k('Vraska’s Finisher', B), k('Militant Inquisitor', W)],
};
const LEK = 'Gorgons &amp; Knights';

/* Ett kort i fotot. hl: 'dim' (redan räknat), 'q' (osäkert), 'acc' (frågan gäller det), 'cut' (kapat av ramen). */
function kortD(kk, sist, w, hl) {
  const ring = hl === 'q' || hl === 'acc' ? `box-shadow: 0 0 0 2px ${C.acc};` : '';
  const dim = hl === 'dim' ? 'opacity: 0.3;' : '';
  const fs_ = w < 60 ? 7 : w < 80 ? 8 : 9, th = w < 60 ? 13 : 15;
  const lagg = hl === 'q' ? `<span style="position: absolute; right: -5px; top: -6px; width: 17px; height: 17px; border-radius: 50%; background: ${C.acc}; color: ${C.ink}; display: grid; place-items: center; font: 800 11px ${SANS}; z-index: 3">?</span>` : '';
  const titel = `<div style="height: ${th}px; background: #ece4cf; color: #1b1b1b; font-size: ${fs_}px; font-weight: 700; line-height: ${th}px; padding: 0 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-radius: 3px 3px 0 0">${kk.n}</div>`;
  const bas = `position: relative; box-sizing: border-box; border: 2px solid ${kk.c}; background: ${kk.c}; ${ring}${dim}${hl === 'q' || hl === 'acc' ? ' z-index: 2;' : ''}`;
  if (!sist) return `<div style="${bas} border-bottom-width: 0; border-radius: 5px 5px 0 0">${titel}${lagg}</div>`;
  const art = Math.round(w * 0.62);
  return `<div style="${bas} border-radius: 5px">${titel}<div style="height: ${art}px; margin: 2px; background: #4a4450; border-radius: 2px"></div><div style="height: ${Math.round(art * 0.5)}px; margin: 0 2px 2px; background: #e6dcc4; border-radius: 2px"></div>${lagg}</div>`;
}
function fotoD(cols, o = {}) {
  const w = o.w || 354, pad = o.pad ?? 10, gap = o.gap ?? 7, n = cols.length;
  const cw = Math.floor((w - 2 * pad - gap * (n - 1)) / n);
  const kol = cols.map((col, ci) => `<div style="width: ${cw}px; display: flex; flex-direction: column; flex: none">${col.map((kk, ri) =>
    kortD(kk, ri === col.length - 1, cw, o.mark ? o.mark(ci, ri) : null)).join('')}</div>`).join('');
  const et = o.label ? `<div style="position: absolute; left: 8px; top: 8px; padding: 3px 7px; border-radius: 6px; background: #0d1015d9; color: ${C.txt}; font: 600 11px ${MONO}">${o.label}</div>` : '';
  return `<div style="position: relative; width: ${w}px; box-sizing: border-box; padding: ${o.label ? pad + 22 : pad}px ${pad}px ${pad}px; background: #5a3d22; border-radius: 10px; display: flex; gap: ${gap}px; align-items: flex-start; overflow: visible; flex: none">${et}${kol}</div>`;
}
/* Ringen, i två storlekar. */
function ringD(n, av, o = {}) {
  const s = o.s || 132, sw = s > 100 ? 10 : 8, r = s / 2 - sw, om = 2 * Math.PI * r, del = Math.min(1, n / av);
  const farg = o.farg || (n === av ? C.green : C.acc);
  return `<div style="position: relative; width: ${s}px; height: ${s}px; flex: none"><svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" aria-hidden="true"><circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="${C.bg4}" stroke-width="${sw}"></circle><circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="${farg}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${(om * del).toFixed(1)} ${om.toFixed(1)}" transform="rotate(-90 ${s / 2} ${s / 2})"></circle></svg><div style="position: absolute; left: 0; top: 0; width: ${s}px; height: ${s}px; display: flex; flex-direction: column; align-items: center; justify-content: center"><b style="font: 800 ${s > 100 ? 34 : 24}px ${SANS}; letter-spacing: -1px">${n}</b><span style="font: 500 ${s > 100 ? 13 : 11.5}px ${SANS}; color: ${C.dim}">of ${av}</span></div></div>`;
}
const tillD = `<div style="display: flex; flex-direction: column; gap: 2px"><span style="font: 500 12.5px ${SANS}; color: ${C.dim}">Adding cards to</span><b style="font: 700 19px ${SANS}; color: ${C.txt}">${LEK}</b></div>`;
const ruta = (inner, o = '') => `<div style="display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 12px; background: ${C.bg2}; border: 1px solid ${C.line}; ${o}">${inner}</div>`;
const rubrik = t => `<b style="font: 700 17px ${SANS}">${t}</b>`;

const filer = {};
const skriv = (n, h) => { filer[n] = h; };

/* ── D1 · Före fotona: lekens storlek, och basländerna — båda sätten går ── */
const miniBord = medLand => {
  const kol = [[W, B, medLand ? P : null, W], [B, medLand ? S : null, A, B], [W, T, medLand ? P : null, W]].map(c => c.filter(Boolean));
  return `<div style="display: flex; gap: 5px; padding: 8px; border-radius: 8px; background: #5a3d22; height: 64px; box-sizing: border-box; align-items: flex-start">${kol.map(c =>
    `<div style="width: 26px; display: flex; flex-direction: column">${c.map((f, i) => `<div style="height: ${i === c.length - 1 ? 22 : 8}px; background: ${f}; border-radius: 2px; border: 1px solid #0003${f === P || f === S ? `; box-shadow: 0 0 0 1.5px ${C.blue}` : ''}"></div>`).join('')}</div>`).join('')}</div>`;
};
skriv('D1.dc.html', telefon('D1: before the photos',
  pst(['ok', 'on', '']) + tillD
  + `<div style="display: flex; flex-direction: column; gap: 10px">${rubrik('How many cards are in the deck?')}<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px">${['40', '60', '100', 'Not sure'].map((t, i) => `<button type="button" style="height: 48px; border-radius: 11px; font: 650 ${i === 3 ? 14 : 16}px ${SANS}; cursor: pointer; ${i === 0 ? `background: #2a200e; border: 1.5px solid ${C.acc}; color: ${C.acc}` : `background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}`}">${t}</button>`).join('')}</div>${tx('Mesa counts along, so you see when every card is in.', 'font-size: 13.5px')}</div>`
  + `<div style="display: flex; flex-direction: column; gap: 10px">${rubrik('Basic lands: either way works')}`
  + `<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">`
  + `<div style="display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 12px; background: ${C.bg2}; border: 1px solid ${C.line}">${miniBord(true)}<b style="font: 650 14.5px ${SANS}">In the photos</b><span style="font: 400 13px/1.4 ${SANS}; color: ${C.dim}">Lay them out with the rest. Mesa counts them.</span></div>`
  + `<div style="display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 12px; background: ${C.bg2}; border: 1px solid ${C.line}">${miniBord(false)}<b style="font: 650 14.5px ${SANS}">Left out</b><span style="font: 400 13px/1.4 ${SANS}; color: ${C.dim}">Quicker. You type how many at the end.</span></div>`
  + `</div>${tx('Some in, some out is fine too — at the end you see how many Mesa found, and add the rest.', 'font-size: 13.5px')}</div>`,
  btn('Lay out the cards', 'prim')));

/* ── D2 · Kameran: ramen säger vad den gör ── */
{
  const fx = 18, fy = 150, fw = 354, fh = 470;          // ramen på skärmen
  const bord = fotoD([G.pharika, G.valkyrie, G.maul], { w: 430, pad: 14, gap: 12 });
  const skugga = (x, y, w, h) => `<div style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; background: #000000a6; z-index: 3"></div>`;
  const hörn = [[0, 0, 'border-right: 0; border-bottom: 0; border-top-left-radius: 12px'], [fw - 32, 0, 'border-left: 0; border-bottom: 0; border-top-right-radius: 12px'], [0, fh - 32, 'border-right: 0; border-top: 0; border-bottom-left-radius: 12px'], [fw - 32, fh - 32, 'border-left: 0; border-top: 0; border-bottom-right-radius: 12px']]
    .map(([x, y, s]) => `<i style="position: absolute; left: ${x}px; top: ${y}px; width: 32px; height: 32px; border: 3px solid #fff; ${s}"></i>`).join('');
  skriv('D2.dc.html', telefon('D2: the camera — the frame says what it does', `<div style="position: absolute; left: 0; top: 0; width: 390px; height: 844px; background: #6a4828; overflow: hidden">`
    + `<div style="position: absolute; left: -12px; top: 170px">${bord}</div>`
    + skugga(0, 0, 390, fy) + skugga(0, fy + fh, 390, 844 - fy - fh) + skugga(0, fy, fx, fh) + skugga(fx + fw, fy, 390 - fx - fw, fh)
    + `<div style="position: absolute; left: ${fx}px; top: ${fy}px; width: ${fw}px; height: ${fh}px; z-index: 4">${hörn}</div>`
    + `<div style="position: absolute; left: 18px; right: 18px; top: 20px; z-index: 5; display: flex; justify-content: space-between; align-items: center"><span style="padding: 8px 12px; border-radius: 99px; background: #0d1015cc; font: 650 14px ${SANS}; color: ${C.txt}">Photo 2 · 16 of 40</span><span style="display: flex; align-items: center; gap: 7px; padding: 8px 12px; border-radius: 99px; background: #0d1015cc; font: 600 13.5px ${SANS}; color: ${C.txt}"><i style="width: 9px; height: 9px; border-radius: 50%; background: ${C.green}"></i>Names are readable</span></div>`
    + `<div style="position: absolute; left: 18px; right: 18px; top: 92px; z-index: 5; text-align: center; font: 650 15px ${SANS}; color: ${C.txt}">Only what’s inside the frame is read</div>`
    + `<div style="position: absolute; left: 18px; right: 18px; top: ${fy + fh + 18}px; z-index: 5; text-align: center; font: 400 14px/1.45 ${SANS}; color: #d5dbe6">Fit whole columns inside. A card that’s cut by the frame is left for the next photo.</div>`
    + `<div style="position: absolute; left: 0; right: 0; bottom: 34px; z-index: 5; display: flex; align-items: center; justify-content: space-between; padding: 0 40px"><button type="button" style="border: 0; background: transparent; color: ${C.txt}; font: 600 16px ${SANS}; cursor: pointer; width: 70px; text-align: left">Back</button><button type="button" aria-label="Take the photo" style="width: 76px; height: 76px; border-radius: 50%; background: #fff; border: 5px solid #ffffff66; background-clip: padding-box; cursor: pointer"></button><span style="width: 70px"></span></div>`
    + `</div>`, null));
}

/* ── D3 · Foto 2 läst: ringen, fotot som det lästes, och teckenförklaringen ── */
skriv('D3.dc.html', telefon('D3: photo 2 read',
  pst(['ok', 'ok', 'ok'])
  + `<div style="display: flex; gap: 16px; align-items: center">${ringD(28, 40, { s: 96 })}<div style="display: flex; flex-direction: column; gap: 4px">${ok('Photo 2 read')}<b style="font: 750 26px ${SANS}; letter-spacing: -0.4px">+12 cards</b><span style="font: 500 13.5px ${SANS}; color: ${C.dim}">12 left to reach 40</span></div></div>`
  + fotoD([G.pharika, G.valkyrie, G.maul], { w: 354, label: 'Photo 2 as Mesa read it', mark: (ci, ri) => ci === 0 ? 'dim' : ci === 1 && ri === 4 ? 'q' : null })
  + `<div style="display: flex; flex-direction: column; gap: 8px">`
  + `<div style="display: flex; align-items: center; gap: 10px; font: 500 14px ${SANS}; color: ${C.txt}"><span style="width: 22px; height: 14px; border-radius: 3px; background: #ece4cf; opacity: 0.3; flex: none"></span>Already counted from Photo 1</div>`
  + `<div style="display: flex; align-items: center; gap: 10px; font: 500 14px ${SANS}; color: ${C.txt}"><span style="width: 22px; height: 22px; border-radius: 50%; background: ${C.acc}; color: ${C.ink}; display: grid; place-items: center; font: 800 13px ${SANS}; flex: none">?</span>Not sure of the name — you check it at the end</div>`
  + `</div>`,
  btn('Take the next photo', 'prim', ik.camera()) + btn('That’s all the cards', 'sek')));

/* ── D4 · Klart: "Finish the deck" i två steg. Tweak: basländerna i fotona eller inte ── */
const stegRad = (nr, titel, under, status, aktiv) => `<div style="display: flex; gap: 12px; align-items: flex-start; padding: 13px 14px; border-radius: 12px; background: ${aktiv ? '#1d1810' : C.bg2}; border: 1px solid ${aktiv ? '#6a5220' : C.line}"><span style="width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; flex: none; font: 700 12.5px ${MONO}; ${status === 'ok' ? `background: #0f2016; border: 1px solid #2f6b47; color: #8fe0b0` : aktiv ? `background: ${C.acc}; color: ${C.ink}` : `border: 1px solid #39445a; color: ${C.dim}`}">${status === 'ok' ? ik.check(13, 3) : nr}</span><div style="display: flex; flex-direction: column; gap: 3px; flex-grow: 1"><b style="font: 650 15px ${SANS}">${titel}</b><span style="font: 400 13.5px/1.4 ${SANS}; color: ${C.dim}">${under}</span></div></div>`;
const d4Med = `<div style="display: flex; gap: 16px; align-items: center">${ringD(41, 40, { s: 96 })}<div style="display: flex; flex-direction: column; gap: 4px"><b style="font: 750 24px ${SANS}; letter-spacing: -0.3px">1 too many</b><span style="font: 500 13.5px/1.4 ${SANS}; color: ${C.dim}">3 photos · 41 cards read</span></div></div>`
  + `<div style="display: flex; flex-direction: column; gap: 4px"><b style="font: 700 19px ${SANS}">Finish the deck</b>${tx('Two steps. The count shows when it adds up.', 'font-size: 14px')}</div>`
  + stegRad(1, 'Check 3 cards', '1 may be in two photos · 2 names Mesa isn’t sure of', '', true)
  + stegRad(2, 'Basic lands', 'The photos had 7 Plains and 7 Swamps. Add any you left out.', '', false);
const d4Utan = `<div style="display: flex; gap: 16px; align-items: center">${ringD(27, 40, { s: 96 })}<div style="display: flex; flex-direction: column; gap: 4px"><b style="font: 750 24px ${SANS}; letter-spacing: -0.3px">13 left</b><span style="font: 500 13.5px/1.4 ${SANS}; color: ${C.dim}">3 photos · 27 cards read</span></div></div>`
  + `<div style="display: flex; flex-direction: column; gap: 4px"><b style="font: 700 19px ${SANS}">Finish the deck</b>${tx('Two steps. The count shows when it adds up.', 'font-size: 14px')}</div>`
  + stegRad(1, 'Check 3 cards', '1 may be in two photos · 2 names Mesa isn’t sure of', '', true)
  + stegRad(2, 'Basic lands', 'None in the photos. Type how many — 13 cards are left, and they’re probably lands.', '', false);
skriv('D4.dc.html', telefon('D4: done — finish the deck',
  `<sc-if value="{{med}}" hint-placeholder-val="{{true}}">${d4Med}</sc-if><sc-if value="{{utan}}" hint-placeholder-val="{{false}}">${d4Utan}</sc-if>`
  + `<div style="display: flex; gap: 10px; align-items: center; padding: 11px 14px; border-radius: 12px; background: #101a2e; border: 1px solid #2a3a66; color: #b9c8ff"><span style="flex: none">${ik.laptop(20)}</span><span style="font: 500 13.5px/1.4 ${SANS}">The computer has opened the same two steps, with the photos in full size.</span></div>`,
  btn('Finish here on the phone', 'prim') + btn('See the whole list', 'sek', ik.list()),
  { props: { basland: { editor: 'enum', options: ['In the photos', 'Left out'], default: 'In the photos' } },
    logic: `const b = this.props.basland ?? 'In the photos';\nreturn { med: b === 'In the photos', utan: b === 'Left out' };` }));

/* ── D5 · Steg 1 på telefonen: ett kort i taget ── */
const remsaD = (namn, f, hl) => `<div style="flex-grow: 1; min-width: 0; box-sizing: border-box; border: 2px solid ${f}; border-bottom-width: 0; border-radius: 6px 6px 0 0; background: ${f}; ${hl ? `box-shadow: 0 0 0 2px ${C.acc};` : ''}"><div style="height: 24px; background: #ece4cf; color: #1b1b1b; font-size: 12px; font-weight: 700; line-height: 24px; padding: 0 7px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-radius: 4px 4px 0 0">${namn}</div><div style="height: 46px; background: #4a4450; margin: 2px 2px 0"></div></div>`;
skriv('D5.dc.html', telefon('D5: step 1 on the phone — one card at a time',
  `<div style="display: flex; align-items: center; gap: 10px"><button type="button" aria-label="Back" style="width: 40px; height: 40px; border-radius: 10px; background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}; display: grid; place-items: center; cursor: pointer">${ik.back()}</button><div style="display: flex; flex-direction: column; flex-grow: 1"><b style="font: 700 16px ${SANS}">Check 3 cards</b><span style="font: 500 12.5px ${SANS}; color: ${C.dim}">Step 1 of 2</span></div><b style="font: 700 13px ${MONO}; color: ${C.dim}">1 / 3</b></div>`
  + `<div style="display: flex; flex-direction: column; gap: 6px"><span style="font: 600 12px ${MONO}; letter-spacing: 0.6px; color: ${C.acc}">IN TWO PHOTOS</span><b style="font: 750 24px/1.2 ${SANS}; letter-spacing: -0.3px">One card, or two?</b>${tx('Maul of the Skyclaves is at the edge of Photo 2 and of Photo 3. Mesa couldn’t tell if it’s the same card.', 'font-size: 14.5px')}</div>`
  + `<div style="display: flex; gap: 12px"><div style="display: flex; flex-direction: column; gap: 6px; flex: 1 1 0; min-width: 0"><span style="font: 600 11px ${MONO}; color: ${C.dim}">PHOTO 2</span>${remsaD('Maul of the Skyclaves', W, true)}<span style="font: 400 12.5px/1.35 ${SANS}; color: ${C.dim}">Under Plains, bottom right</span></div><div style="display: flex; flex-direction: column; gap: 6px; flex: 1 1 0; min-width: 0"><span style="font: 600 11px ${MONO}; color: ${C.dim}">PHOTO 3</span>${remsaD('Maul of the Skyclaves', W, true)}<span style="font: 400 12.5px/1.35 ${SANS}; color: ${C.dim}">Cut off at the left edge</span></div></div>`
  + `<a href="#" style="font: 600 14px ${SANS}">See both photos</a>`
  + `<span style="flex-grow: 1"></span>`
  + `<div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-radius: 12px; background: ${C.bg2}; border: 1px solid ${C.line}"><span style="font: 500 14px ${SANS}; color: ${C.dim}">The deck</span><span style="font: 500 14px ${SANS}; color: ${C.txt}"><b>41</b> of 40 · <span style="color: ${C.green}">40 if it’s one card</span></span></div>`,
  `<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">${btn('One card', 'prim')}${btn('Two cards', 'sek')}</div>`));

/* ── D6 · Steg 2 på telefonen: basländerna. Tweak: i fotona eller inte ── */
const landRad = (namn, n, fanns) => `<div style="display: flex; flex-direction: column; gap: 0; padding: 4px 0; border-bottom: 1px solid ${C.line}">${steg(namn, n)}<span style="font: 500 12.5px ${SANS}; color: ${fanns ? C.green : C.dim2}; margin-top: -4px; padding-bottom: 8px">${fanns ? `${fanns} found in the photos` : 'Not in the photos'}</span></div>`;
const d6Med = `<div style="display: flex; flex-direction: column; gap: 4px"><span style="font: 600 12px ${MONO}; letter-spacing: 0.6px; color: ${C.dim}">STEP 2 OF 2</span><b style="font: 750 24px ${SANS}; letter-spacing: -0.3px">Basic lands</b>${tx('Mesa counted these in the photos. Change a number if some weren’t photographed.', 'font-size: 14.5px')}</div>`
  + `<div style="display: flex; flex-direction: column">${landRad('Plains', 7, 7)}${landRad('Swamp', 7, 7)}</div><a href="#" style="font: 600 14px ${SANS}">Another basic land</a>`
  + `<span style="flex-grow: 1"></span><div style="display: flex; gap: 14px; align-items: center; padding: 14px; border-radius: 12px; background: #0f1d15; border: 1px solid #2f6b47">${ringD(40, 40, { s: 64 })}<div style="display: flex; flex-direction: column; gap: 3px"><b style="font: 700 17px ${SANS}; color: #8fe0b0">It adds up</b><span style="font: 400 13.5px ${SANS}; color: ${C.txt}">40 of 40 — ready to play</span></div></div>`;
const d6Utan = `<div style="display: flex; flex-direction: column; gap: 4px"><span style="font: 600 12px ${MONO}; letter-spacing: 0.6px; color: ${C.dim}">STEP 2 OF 2</span><b style="font: 750 24px ${SANS}; letter-spacing: -0.3px">Basic lands</b>${tx('None were in the photos. How many of each are in the deck?', 'font-size: 14.5px')}</div>`
  + `<div style="display: flex; flex-direction: column">${landRad('Plains', 7, 0)}${landRad('Swamp', 6, 0)}</div><a href="#" style="font: 600 14px ${SANS}">Another basic land</a>`
  + `<span style="flex-grow: 1"></span><div style="display: flex; gap: 14px; align-items: center; padding: 14px; border-radius: 12px; background: ${C.bg2}; border: 1px solid ${C.line}">${ringD(39, 40, { s: 64 })}<div style="display: flex; flex-direction: column; gap: 3px"><b style="font: 700 17px ${SANS}">1 left</b><span style="font: 400 13.5px ${SANS}; color: ${C.dim}">39 of 40</span></div></div>`;
skriv('D6.dc.html', telefon('D6: step 2 on the phone — basic lands',
  `<sc-if value="{{med}}" hint-placeholder-val="{{true}}">${d6Med}</sc-if><sc-if value="{{utan}}" hint-placeholder-val="{{false}}">${d6Utan}</sc-if>`,
  btn('Done — open the deck', 'prim'),
  { props: { basland: { editor: 'enum', options: ['In the photos', 'Left out'], default: 'In the photos' } },
    logic: `const b = this.props.basland ?? 'In the photos';\nreturn { med: b === 'In the photos', utan: b === 'Left out' };` }));

/* ── D7 · Datorn: samma två steg, med fotona i full storlek ── */
{
  const railSteg = (nr, t, u, aktiv, klar) => `<div style="display: flex; gap: 12px; padding: 12px 14px; border-radius: 10px; ${aktiv ? 'background: #1d1810; border: 1px solid #6a5220;' : `border: 1px solid ${C.line};`}"><span style="width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; flex: none; font: 700 12.5px ${MONO}; ${klar ? `background: #0f2016; border: 1px solid #2f6b47; color: #8fe0b0` : aktiv ? `background: ${C.acc}; color: ${C.ink}` : `border: 1px solid #39445a; color: ${C.dim}`}">${klar ? ik.check(13, 3) : nr}</span><span style="display: flex; flex-direction: column; gap: 3px"><b style="font: 650 15px ${SANS}">${t}</b><span style="font: 400 13px/1.4 ${SANS}; color: ${C.dim}">${u}</span></span></div>`;
  const kolla = (t, u, aktiv) => `<div style="display: flex; flex-direction: column; gap: 2px; padding: 8px 12px 8px 50px; ${aktiv ? `color: ${C.txt}` : `color: ${C.dim}`}"><span style="font: ${aktiv ? 650 : 500} 13.5px ${SANS}">${t}</span><span style="font: 400 12.5px ${SANS}; color: ${C.dim2}">${u}</span></div>`;
  const P2 = fotoD([G.pharika, G.valkyrie, G.maul], { w: 400, label: 'Photo 2', mark: (ci, ri) => ci === 2 && ri === 5 ? 'acc' : null });
  const P3 = fotoD([[G.maul[5]], G.hooded, G.militant], { w: 330, label: 'Photo 3', mark: (ci) => ci === 0 ? 'acc' : null });
  skriv('D7.dc.html', dator('D7: computer — finish the deck',
    `<div style="flex-grow: 1; display: flex; min-height: 0">`
    + `<div style="width: 320px; flex: none; box-sizing: border-box; padding: 22px 18px; border-right: 1px solid ${C.line}; display: flex; flex-direction: column; gap: 10px"><div style="display: flex; flex-direction: column; gap: 4px; padding-bottom: 6px"><b style="font: 750 20px ${SANS}">Finish the deck</b><span style="font: 400 13px/1.4 ${SANS}; color: ${C.dim}">From the phone · 3 photos · opened when you pressed “That’s all the cards”</span></div>`
    + railSteg(1, 'Check 3 cards', 'Mesa isn’t sure of these', true, false)
    + kolla('Maul of the Skyclaves', 'In Photo 2 and Photo 3', true) + kolla('Photo 3, first column', 'Name couldn’t be read', false) + kolla('Gorgon Flail?', 'Not sure of the name', false)
    + railSteg(2, 'Basic lands', '7 Plains and 7 Swamps in the photos', false, false)
    + `<span style="flex-grow: 1"></span><a href="#" style="font: 600 13.5px ${SANS}">Skip — I’ll finish it later</a></div>`
    + `<div style="flex-grow: 1; box-sizing: border-box; padding: 26px 34px; display: flex; flex-direction: column; gap: 20px; min-width: 0">`
    + `<div style="display: flex; flex-direction: column; gap: 6px"><span style="font: 600 12px ${MONO}; letter-spacing: 0.6px; color: ${C.acc}">STEP 1 · IN TWO PHOTOS</span><b style="font: 750 28px ${SANS}; letter-spacing: -0.4px">One card, or two?</b>${tx('Maul of the Skyclaves is at the edge of both photos. In Photo 3 it’s cut off, so Mesa can’t see what lies next to it.', 'font-size: 15px; max-width: 720px')}</div>`
    + `<div style="display: flex; gap: 24px; align-items: flex-start">${P2}${P3}</div>`
    + `<div style="display: flex; gap: 12px; align-items: center"><button type="button" style="height: 48px; padding: 0 22px; border-radius: 11px; border: 0; background: ${C.acc}; color: ${C.ink}; font: 650 15.5px ${SANS}; cursor: pointer">One card</button><button type="button" style="height: 48px; padding: 0 22px; border-radius: 11px; background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}; font: 650 15.5px ${SANS}; cursor: pointer">Two cards</button><span style="font: 500 13px ${SANS}; color: ${C.dim2}; padding-left: 6px">1 or 2 on the keyboard</span></div>`
    + `</div>`
    + `<div style="width: 300px; flex: none; box-sizing: border-box; padding: 22px 20px; border-left: 1px solid ${C.line}; background: ${C.bg2}; display: flex; flex-direction: column; gap: 16px; align-items: flex-start">${ringD(41, 40)}<div style="display: flex; flex-direction: column; gap: 3px"><b style="font: 700 18px ${SANS}">1 too many</b><span style="font: 400 13.5px/1.4 ${SANS}; color: ${C.dim}">40 if Maul is one card.</span></div>`
    + `<div style="width: 100%; display: flex; flex-direction: column">${[['Creatures', 12], ['Other spells', 15], ['Basic lands', 14]].map(([t, n]) => `<div style="display: flex; justify-content: space-between; font: 500 14px ${SANS}; padding: 7px 0; border-bottom: 1px solid ${C.line}"><span style="color: ${C.dim}">${t}</span><b>${n}</b></div>`).join('')}</div></div>`
    + `</div>`));
}

/* ── index: en ny sida "D · Combined", den gamla blir "A · B · C" ── */
const LAST = process.argv[2];
const canvas = JSON.parse(fs.readFileSync(LAST, 'utf8'));
canvas.pages = [{ id: 'abc', name: 'A · B · C' }, { id: 'd', name: 'D · Combined' }];
for (const b of Object.values(canvas.boards)) if (!b.page) b.page = 'abc';
for (const n of Object.values(canvas.notes)) if (!n.page) n.page = 'abc';
const PW = 390, PH = 844, DW = 1440, GX = 80;
const rad1 = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'];
const titlar = { D1: 'D1 · Before the photos', D2: 'D2 · The camera: the frame says what it does', D3: 'D3 · Photo 2 read', D4: 'D4 · Done: finish the deck (Tweaks: basic lands)', D5: 'D5 · Step 1 on the phone', D6: 'D6 · Step 2 on the phone (Tweaks: basic lands)', D7: 'D7 · The computer: the same two steps' };
rad1.forEach((n, i) => { const f = n + '.dc.html'; canvas.boards[f] = { x: i * (PW + GX), y: 0, w: PW, h: PH, title: titlar[n], page: 'd' }; if (!canvas.order.includes(f)) canvas.order.push(f); });
canvas.boards['D7.dc.html'] = { x: 0, y: PH + 343, w: DW, h: 900, title: titlar.D7, page: 'd' };
if (!canvas.order.includes('D7.dc.html')) canvas.order.push('D7.dc.html');
canvas.notes.rD = { x: 0, y: -260, text: 'D · Count along, then finish the deck in two steps', kind: 'title1', maxW: 6 * PW + 5 * GX, page: 'd' };
canvas.notes.rD2 = { x: 0, y: PH + 343 - 260, text: 'D · The same steps on the computer', kind: 'title1', maxW: DW, page: 'd' };
canvas.launch = { view: 'canvas', page: 'd' };
for (const [n, h] of Object.entries(filer)) fs.writeFileSync(path.join(OUT, n), h);
fs.writeFileSync(path.join(OUT, 'canvas.json'), JSON.stringify(canvas, null, 1));
console.log(Object.keys(filer).join(' '));

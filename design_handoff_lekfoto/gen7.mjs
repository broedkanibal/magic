// Sida G (Jesper 2026-09-27): fliken heter Take photos och visar ett steg i taget; abstrakt
// läggningsanimation; blå bockrutor på telefonen; telefonens tillstånd och fel ur koden, med
// sätt att rätta; tydligare knappar; fotona på datorn och att ta bort ett foto; okända kort
// syns bara i To check tills de har ett namn; To check-fallen med sökfält direkt.
import { fs, path, OUT, C, SANS, MONO, bild, F07, F06, CSS, ik, knapp, kortRuta, sektion, basland, remsa, fotoRad, TYP, T07 } from './delar3.mjs';

const BLA = '#5b8cff';
const CSS2 = CSS + `
@keyframes falla{0%{opacity:0;transform:translateY(-34px)}8%{opacity:1;transform:none}86%{opacity:1}96%,100%{opacity:0}}
@keyframes bock{0%{opacity:0;transform:scale(.3)}5%{opacity:1;transform:scale(1.15)}8%{transform:scale(1)}90%{opacity:1}97%,100%{opacity:0}}
@keyframes blixt2{0%,62%{opacity:0}64%{opacity:.9}74%,100%{opacity:0}}
@keyframes ramInOut{0%,55%{opacity:0}62%,90%{opacity:1}97%,100%{opacity:0}}
@keyframes puls2{0%,100%{opacity:1}50%{opacity:.35}}
`;
function sida(titel, w, h, kropp, o = {}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${titel}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>${CSS2}</style>
</helmet>
${kropp}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='${JSON.stringify(Object.assign({}, o.props || {}, { $preview: { width: w, height: h } }))}'>
class Component extends DCLogic {
renderVals() {
${o.logic || 'return {};'}
}
}
</script>
</body>
</html>
`;
}
const filer = {};
const skriv = (n, h) => { filer[n] = h; };
const t = (s, o = '') => `<span style="font: 400 13.5px/1.5 ${SANS}; color: ${C.dim}; ${o}">${s}</span>`;
const stor = (s) => `<b style="font: 700 18px/1.3 ${SANS}; color: ${C.txt}">${s}</b>`;
const stegEtikett = (s) => `<span style="font: 700 11px ${MONO}; letter-spacing: 1px; color: ${C.acc}">${s}</span>`;
const pknapp = (s, typ = 'prim', o = '') => knapp(s, typ, `height: 42px; font-size: 14px; padding: 0 16px; ${o}`);

/* ── Abstrakt läggning: kortformer faller ned i kolumner, sedan ramen och blixten ── */
function laggAnim(w, h, o = {}) {
  const kw = o.kw || 54, kh = Math.round(kw * 1.4), steg_ = o.steg || 15, kol = o.kol || 3, per = o.per || 4;
  const gap = Math.round((w - kol * kw) / (kol + 1));
  const kort = (ci, i) => `<div style="position: absolute; left: ${gap + ci * (kw + gap)}px; top: ${18 + i * steg_}px; width: ${kw}px; height: ${kh}px; box-sizing: border-box; border-radius: 5px; background: #2b3444; border: 1px solid #3d4a5f; box-shadow: 0 3px 8px #0008; animation: falla 8s ${(ci * per * 0.28 + i * 0.28).toFixed(2)}s infinite both"><div style="margin: 4px; height: 8px; border-radius: 2px; background: #cfd6e2; display: flex; align-items: center; padding: 0 3px"><i style="width: 60%; height: 2px; border-radius: 1px; background: #5b6679"></i></div><div style="margin: 0 4px; height: ${Math.round(kh * 0.38)}px; border-radius: 2px; background: #3a4558"></div></div>`;
  let s = '';
  for (let c = 0; c < kol; c++) for (let i = 0; i < per; i++) s += kort(c, i);
  const hörn = (x, y, st) => `<i style="position: absolute; left: ${x}px; top: ${y}px; width: 18px; height: 18px; border: 2.5px solid #e7ecf4; ${st}"></i>`;
  const ram = `<div style="position: absolute; inset: 8px; animation: ramInOut 8s infinite both">${hörn(0, 0, 'border-right: 0; border-bottom: 0; border-top-left-radius: 6px')}${hörn(w - 34, 0, 'border-left: 0; border-bottom: 0; border-top-right-radius: 6px')}${hörn(0, h - 34, 'border-right: 0; border-top: 0; border-bottom-left-radius: 6px')}${hörn(w - 34, h - 34, 'border-left: 0; border-top: 0; border-bottom-right-radius: 6px')}</div>`;
  return `<div style="position: relative; width: ${w}px; height: ${h}px; border-radius: 12px; background: #161c26; border: 1px solid ${C.line}; overflow: hidden; flex: none">${s}${ram}<div style="position: absolute; inset: 0; background: #fff; animation: blixt2 8s infinite both; pointer-events: none"></div></div>`;
}

/* ══ Datorns panel: ett steg i taget ══════════════════════════════════ */
const flikar = `<div role="tablist" style="display: grid; grid-template-columns: 1.25fr 1fr 0.7fr; gap: 4px; padding: 4px; border-radius: 10px; border: 1px solid ${C.line}; background: ${C.bg}">${[['Take photos', ik.camera(15)], ['Paste a list', ik.list()], ['Type', ik.kb()]].map(([s, i], j) => `<button type="button" role="tab" aria-selected="${j === 0}" style="height: 32px; border-radius: 7px; border: ${j === 0 ? `1px solid #3d4a5f` : '0'}; background: ${j === 0 ? C.bg3 : 'transparent'}; color: ${j === 0 ? C.txt : C.dim}; font: 600 12.5px ${SANS}; display: flex; align-items: center; justify-content: center; gap: 7px; cursor: pointer">${i}${s}</button>`).join('')}</div>`;
function panel(titel, innehall, o = {}) {
  return sida(titel, 420, 900,
    `<aside style="width: 420px; height: 900px; box-sizing: border-box; padding: 20px 22px; background: #11151c; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column; gap: 16px; overflow: hidden; border-right: 1px solid ${C.line}"><b style="font: 700 15px ${SANS}">Add cards</b>${flikar}${innehall}</aside>`, o);
}
const ansl = `<div style="display: flex; align-items: center; gap: 9px; padding: 9px 12px; border-radius: 10px; background: #0f1d15; border: 1px solid #24503a; font: 500 13px ${SANS}; color: #bfe8cf"><i style="width: 8px; height: 8px; border-radius: 50%; background: ${C.green}"></i>Phone connected</div>`;
const val = (vald, titel, text) => `<label style="display: flex; gap: 12px; align-items: flex-start; padding: 13px 14px; border-radius: 11px; cursor: pointer; ${vald ? `background: #2a200e; border: 1.5px solid ${C.acc}` : `background: ${C.bg2}; border: 1px solid ${C.line}`}"><input type="radio" name="bl" ${vald ? 'checked' : ''} style="width: 18px; height: 18px; margin: 1px 0 0; accent-color: ${C.acc}; flex: none"><span style="display: flex; flex-direction: column; gap: 3px"><b style="font: 650 14.5px ${SANS}">${titel}</b><span style="font: 400 13px/1.45 ${SANS}; color: ${C.dim}">${text}</span></span></label>`;
const qr = (() => {
  let s = ''; const n = 25, c = 6;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const ax = x >= n - 7 ? x - (n - 7) : x, ay = y >= n - 7 ? y - (n - 7) : y;
    const hörn = (x < 7 || x >= n - 7) && (y < 7 || y >= n - 7) && !(x >= n - 7 && y >= n - 7);
    const f = hörn ? (ax === 0 || ay === 0 || ax === 6 || ay === 6 || (ax >= 2 && ax <= 4 && ay >= 2 && ay <= 4)) : ((x * 7 + y * 13 + x * y) % 5) < 2;
    if (f) s += `<rect x="${x * c}" y="${y * c}" width="${c}" height="${c}"></rect>`;
  }
  return `<svg width="${n * c}" height="${n * c}" viewBox="0 0 ${n * c} ${n * c}" fill="#0d1015" role="img" aria-label="Code to scan with the phone">${s}</svg>`;
})();
const vantar = (s) => `<span style="display: flex; align-items: center; gap: 9px; font: 600 13.5px ${SANS}; color: ${C.acc}"><i style="width: 8px; height: 8px; border-radius: 50%; background: ${C.acc}; animation: puls2 1.6s infinite"></i>${s}</span>`;
const valt = `<div style="display: flex; justify-content: space-between; align-items: center; font: 500 12.5px ${SANS}; color: ${C.dim}"><span>Basic lands: in the photos</span><a href="#" style="font-weight: 600">Change</a></div>`;
const fotoTumme = (f, sx, sy, sw, sh) => { const dw = 44, s = dw / sw, dh = Math.round(sh * s); return `<span style="position: relative; width: ${dw}px; height: ${dh}px; overflow: hidden; border-radius: 4px; flex: none; display: block"><img src="${f.url}" alt="" style="position: absolute; left: ${Math.round(-sx * s)}px; top: ${Math.round(-sy * s)}px; width: ${Math.round(f.w * s)}px; height: ${Math.round(f.h * s)}px; max-width: none"></span>`; };
const F05 = { url: '/_blob/76eb91fcf27b18b0729db1987519b62f', w: 1500, h: 2000 }, F15 = { url: '/_blob/8231520ba70b9480b86c09ae2e5b95a5', w: 2000, h: 1500 };
const fotoRadT = (nr, f, text, o = {}) => `<div style="display: flex; align-items: center; gap: 12px; padding: 8px 10px; border-radius: 10px; background: ${o.nu ? '#1d1810' : C.bg2}; border: 1px solid ${o.nu ? '#6a5220' : C.line}; ${o.anim ? 'animation: ploppa 7s ease-out infinite both;' : ''}">${f ? fotoTumme(f, 100, 250, 1300, 1500) : `<span style="width: 44px; height: 51px; border-radius: 4px; background: ${C.bg3}; display: grid; place-items: center; color: ${C.dim}">${ik.camera(16)}</span>`}<div style="display: flex; flex-direction: column; gap: 2px; flex-grow: 1"><b style="font: 650 13.5px ${SANS}">Photo ${nr}</b><span style="font: 500 12.5px ${SANS}; color: ${o.koll ? C.acc : C.dim}">${text}</span></div>${o.hoger || ''}</div>`;

skriv('G1.dc.html', panel('G1: step 1, basic lands',
  `<div style="display: flex; flex-direction: column; gap: 6px">${stegEtikett('STEP 1 OF 3')}${stor('How do you want to add basic lands?')}${t('Plains, Island, Swamp, Mountain and Forest.')}</div>`
  + val(true, 'Photograph them with the other cards', 'Mesa counts them from the photos.') + val(false, 'Leave them out of the photos', 'You set how many at the bottom of the deck. Quicker when you have many.')
  + `<div>${pknapp('Continue')}</div><span style="flex-grow: 1"></span>${t('Next: connect your phone, then take the photos.', 'font-size: 12.5px')}`));
skriv('G2.dc.html', panel('G2: step 2, connect the phone',
  `<div style="display: flex; flex-direction: column; gap: 6px">${stegEtikett('STEP 2 OF 3')}${stor('Connect your phone')}${t('Scan the code with your phone’s camera. Nothing to install. Your phone becomes the camera, and the cards land here.')}</div>`
  + `<div style="align-self: flex-start; padding: 12px; border-radius: 12px; background: #f4f1ea">${qr}</div>` + vantar('Waiting for your phone')
  + `<a href="#" style="font: 600 13px ${SANS}">Copy the link instead</a><span style="flex-grow: 1"></span>${valt}`));
skriv('G3.dc.html', panel('G3: step 3, take the first photo',
  ansl + `<div style="display: flex; flex-direction: column; gap: 6px">${stegEtikett('STEP 3 OF 3')}${stor('Lay out 10–15 cards at a time')}${t('In columns, overlapping, so each name shows. Then take the photo with your phone.')}</div>`
  + laggAnim(376, 220) + vantar('Waiting for photo 1') + `<span style="flex-grow: 1"></span>${valt}`));
skriv('G4.dc.html', panel('G4: a photo is being read',
  ansl + fotoRadT(1, F07, '12 cards added · 1 name to check', { koll: true, hoger: `<span style="color: ${C.green}">${ik.check(15, 2.6)}</span>` })
  + fotoRadT(2, null, 'Reading the photo', { nu: true, hoger: `<i style="width: 8px; height: 8px; border-radius: 50%; background: ${C.acc}; animation: puls2 1.2s infinite"></i>` })
  + `<div style="display: flex; flex-direction: column; gap: 6px; padding-top: 4px">${stor('Lay out the next 10–15 cards')}${t('Move the photographed cards aside first.')}</div>`
  + laggAnim(376, 180, { per: 3 }) + `<span style="flex-grow: 1"></span><div style="display: flex; flex-direction: column; gap: 8px">${t('Photographed every card?', 'font-size: 12.5px')}${pknapp('Done photographing', 'sek', 'align-self: flex-start')}</div>`));
skriv('G5.dc.html', panel('G5: after photo 2',
  ansl + fotoRadT(1, F07, '12 cards added · 1 name to check', { koll: true, hoger: `<span style="color: ${C.green}">${ik.check(15, 2.6)}</span>` })
  + fotoRadT(2, F06, '12 cards added · 1 name to check', { koll: true, anim: true, hoger: `<span style="color: ${C.green}">${ik.check(15, 2.6)}</span>` })
  + `<div style="display: flex; flex-direction: column; gap: 6px; padding-top: 4px">${stor('Lay out the next 10–15 cards')}${t('Then take photo 3 with your phone. Check names now or when you’re done, whichever you like.')}</div>`
  + laggAnim(376, 170, { per: 3 }) + vantar('Waiting for photo 3')
  + `<span style="flex-grow: 1"></span><div style="display: flex; flex-direction: column; gap: 8px">${t('Photographed every card?', 'font-size: 12.5px')}${pknapp('Done photographing', 'sek', 'align-self: flex-start')}</div>`));
skriv('G6.dc.html', panel('G6: done photographing',
  `<div style="display: flex; flex-direction: column; gap: 6px">${stor('4 photos, 38 cards added')}${t('Two things left before the deck is complete.')}</div>`
  + `<ol style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px">`
  + `<li style="display: flex; gap: 12px; padding: 12px 14px; border-radius: 11px; background: #1d1810; border: 1px solid #6a5220"><span style="width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; flex: none; background: ${C.acc}; color: ${C.ink}; font: 700 11.5px ${MONO}">1</span><span style="display: flex; flex-direction: column; gap: 4px"><b style="font: 650 14px ${SANS}">Check 3 names</b>${t('At the top of the deck. 1 card is added when you name it.', 'font-size: 12.5px')}</span></li>`
  + `<li style="display: flex; gap: 12px; padding: 12px 14px; border-radius: 11px; background: ${C.bg2}; border: 1px solid ${C.line}"><span style="width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; flex: none; border: 1px solid #39445a; color: ${C.dim}; font: 700 11.5px ${MONO}">2</span><span style="display: flex; flex-direction: column; gap: 4px"><b style="font: 650 14px ${SANS}">Look over the basic lands</b>${t('At the bottom. 7 Plains and 7 Swamps came from the photos.', 'font-size: 12.5px')}</span></li></ol>`
  + `<b style="font: 700 11px ${MONO}; letter-spacing: 1px; color: ${C.dim}; padding-top: 6px">PHOTOS</b>`
  + fotoRadT(1, F07, '12 cards') + fotoRadT(2, F06, '12 cards') + fotoRadT(3, F05, '6 cards') + fotoRadT(4, F15, '10 cards')
  + `<span style="flex-grow: 1"></span>${pknapp(ik.camera(16) + 'Take more photos', 'sek', 'align-self: flex-start')}`));

/* ══ Datorn: hela sidan efter foto 2, fotot i stort, ta bort ett foto ═══ */
const kollRad2 = (o) => `<div style="display: flex; align-items: ${o.sok ? 'flex-start' : 'center'}; gap: 14px; padding: 11px 12px; border-radius: 10px; background: ${C.bg2}; border: 1px solid ${C.line}">`
  + (o.remsa || '') + (o.namn ? `<img src="${bild(o.namn)}" alt="${o.namn}" style="width: 44px; height: 61px; border-radius: 4px; flex: none">` : `<span style="width: 44px; height: 61px; border-radius: 4px; border: 1.5px dashed #5a4a28; flex: none"></span>`)
  + `<div style="display: flex; flex-direction: column; gap: 6px; flex-grow: 1; min-width: 0"><b style="font: 650 14px ${SANS}">${o.fraga}</b><span style="font: 400 12.5px ${SANS}; color: ${C.dim}">${o.under}</span>${o.sok || ''}</div>`
  + `<div style="display: flex; gap: 6px; flex: none">${o.knappar}</div></div>`;
const sokFalt = (varde, ph, o = {}) => `<div style="position: relative; width: ${o.w || 320}px"><label style="display: flex; align-items: center; gap: 8px; height: 38px; box-sizing: border-box; padding: 0 11px; border-radius: 9px; border: 1.5px solid ${o.fokus ? C.acc : C.line}; background: ${C.bg}"><span style="color: ${C.dim}">${ik.type(15)}</span><input type="text" value="${varde}" placeholder="${ph}" aria-label="Card name" style="flex-grow: 1; min-width: 0; border: 0; background: transparent; color: ${C.txt}; font: 500 14px ${SANS}; outline: none"></label>${o.lista ? `<div role="listbox" style="position: absolute; left: 0; right: 0; top: 42px; z-index: 5; padding: 5px; border-radius: 10px; background: ${C.bg3}; border: 1px solid #3d4a5f; box-shadow: 0 10px 30px #000a; display: flex; flex-direction: column; gap: 2px">${o.lista.map(([n, bildN], i) => `<div role="option" aria-selected="${i === 0}" style="display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 7px; ${i === 0 ? `background: ${C.bg4}` : ''}">${bildN ? `<img src="${bild(bildN)}" alt="" style="width: 24px; height: 33px; border-radius: 2px">` : `<span style="width: 24px; height: 33px; border-radius: 2px; background: #2b3444"></span>`}<span style="font: 500 13.5px ${SANS}; color: ${C.txt}">${n}</span></div>`).join('')}</div>` : ''}</div>`;
ik.type = ik.type || ((s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="M16 16l4.5 4.5"></path></svg>`);
function attKolla2(rader, sub) {
  return `<div style="display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border-radius: 12px; border: 1px solid #6a5220; background: #17140e"><div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap"><i style="width: 8px; height: 8px; border-radius: 50%; background: ${C.acc}"></i><b style="font: 700 13.5px ${SANS}; color: ${C.acc}">To check</b><span style="font: 700 12px ${MONO}; color: ${C.acc}">${rader.length}</span><span style="font: 400 12.5px ${SANS}; color: ${C.dim}">${sub}</span></div>${rader.join('')}</div>`;
}
const gorgonRad = kollRad2({ remsa: remsa(F07, 870, 1030, 440, 80, 150), namn: 'Gorgon Flail', fraga: 'Did you mean Gorgon Flail?', under: 'From photo 1 · in the deck with a Check mark until you answer', knappar: pknapp(ik.check(12) + 'Yes', 'prim', 'height: 32px') + pknapp('No, search', 'sek', 'height: 32px') + pknapp(ik.trash() + 'Remove', 'ghost', 'height: 32px') });
const okandRad = (fokus, lista) => kollRad2({ remsa: remsa(F06, 795, 220, 420, 80, 150), fraga: 'Which card is this?', under: 'From photo 2 · the name couldn’t be read · not in the deck yet', sok: sokFalt(fokus ? 'Hoo' : '', 'Type the name you see', { fokus, lista }), knappar: pknapp('Not a card', 'ghost', 'height: 32px') });
function sidan(titel, panelInner, hoger, antal, o = {}) {
  return sida(titel, 1440, 900,
    `<div style="position: relative; width: 1440px; height: 900px; box-sizing: border-box; background: ${C.bg}; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column; overflow: hidden">`
    + `<div style="height: 44px; flex: none; display: flex; align-items: center; padding: 0 22px; background: #0b0e13; border-bottom: 1px solid ${C.line}"><b style="font: 800 15px ${SANS}; color: ${C.acc}">Mesa</b><span style="flex-grow: 1"></span><span style="display: flex; align-items: center; gap: 7px; font: 600 13px ${SANS}"><i style="width: 7px; height: 7px; border-radius: 50%; background: ${C.acc}"></i>Jesper</span></div>`
    + `<header style="height: 58px; flex: none; display: flex; align-items: center; gap: 14px; padding: 0 22px; border-bottom: 1px solid ${C.line}"><button type="button" style="display: flex; align-items: center; gap: 6px; border: 0; background: transparent; color: ${C.dim}; font: 500 14px ${SANS}; cursor: pointer">${ik.back()}Home</button><i style="width: 1px; height: 22px; background: ${C.line}"></i><b style="font: 700 18px ${SANS}">New deck 3</b><span style="font: 600 13px ${MONO}; color: ${C.dim}">${antal}</span><span style="flex-grow: 1"></span><span style="display: flex; align-items: center; gap: 6px; font: 500 13px ${SANS}; color: ${C.dim}">${ik.check(13)}Saved</span></header>`
    + `<div style="flex-grow: 1; min-height: 0; display: flex"><aside style="width: 420px; flex: none; box-sizing: border-box; padding: 20px 22px; border-right: 1px solid ${C.line}; background: #11151c; display: flex; flex-direction: column; gap: 14px; overflow: hidden"><b style="font: 700 15px ${SANS}">Add cards</b>${flikar}${panelInner}</aside>`
    + `<main style="flex-grow: 1; min-width: 0; box-sizing: border-box; padding: 20px 28px; display: flex; flex-direction: column; gap: 22px; overflow: hidden">${hoger}</main></div>`
    + (o.over || '') + `</div>`, o.sidaO || {});
}
const EFTER2 = ['Pharika’s Chosen', 'Killing Glare', 'Ukud Cobra', 'Valkyrie’s Sword', 'Trusty Retriever', 'Flutterfox', 'Gorgon Flail', 'Night’s Whisper', 'Thriving Moor', 'Resistance Reunited', 'Pacifism', 'Maul of the Skyclaves', 'Aphelia, Viper Whisperer', 'Thriving Heath', 'Coat with Venom'];
const grid = (urval, o = {}) => Object.entries(TYP).map(([typ, l]) => { const x = l.filter(n => urval.includes(n)); return x.length ? sektion(typ, x.length, x.map(n => kortRuta(n, { ny: true, check: (o.check || []).includes(n), w: 88 })).join('')) : ''; }).join('');
const panelD1 = ansl + fotoRadT(1, F07, '12 cards added · 1 name to check', { koll: true, hoger: `<button type="button" style="border: 0; background: transparent; color: ${C.dim}; font: 600 12.5px ${SANS}; cursor: pointer">View</button>` })
  + fotoRadT(2, F06, '12 cards added · 1 name to check', { koll: true, hoger: `<button type="button" style="border: 0; background: transparent; color: ${C.dim}; font: 600 12.5px ${SANS}; cursor: pointer">View</button>` })
  + `<div style="display: flex; flex-direction: column; gap: 6px; padding-top: 4px">${stor('Lay out the next 10–15 cards')}${t('Then take photo 3 with your phone.')}</div>` + laggAnim(376, 160, { per: 3 }) + vantar('Waiting for photo 3')
  + `<span style="flex-grow: 1"></span>${pknapp('Done photographing', 'sek', 'align-self: flex-start')}`;
const hogerD1 = attKolla2([gorgonRad, okandRad(false)], 'Mesa isn’t sure about these names. A card without a name is added when you name it.')
  + grid(EFTER2, { check: ['Gorgon Flail'] }) + basland({ Plains: 3, Swamp: 5 }, 'Counted from the photos so far.', { Plains: 3, Swamp: 5 });
skriv('D1.dc.html', sidan('D1: the deck page after photo 2', panelD1, hogerD1, '23 cards'));

/* D2 · Fotot i stort: vad som hittades, och att ta bort fotot. */
function fotoStort(f, dw, marks) {
  const s = dw / f.w, dh = Math.round(f.h * s);
  return `<div style="position: relative; width: ${dw}px; height: ${dh}px; border-radius: 10px; overflow: hidden; flex: none"><img src="${f.url}" alt="Photo 2" style="position: absolute; left: 0; top: 0; width: ${dw}px; height: ${dh}px">${marks.map(([x, y, w, h, typ]) => `<span style="position: absolute; left: ${Math.round(x * s) - 4}px; top: ${Math.round(y * s) - 4}px; width: 20px; height: 20px; border-radius: 5px; display: grid; place-items: center; background: ${typ === 'q' ? C.acc : BLA}; color: ${typ === 'q' ? C.ink : '#fff'}; font: 800 12px ${SANS}; box-shadow: 0 2px 6px #0008">${typ === 'q' ? '?' : ik.check(12, 3.2)}</span>`).join('')}</div>`;
}
const T06 = [[110, 215], [150, 405], [115, 540], [110, 710], [130, 815], [135, 1020], [805, 230, 'q'], [855, 370], [850, 555], [880, 700], [870, 850], [860, 1045]].map(([x, y, q]) => [x, y, 0, 0, q]);
const lista06 = [['Swamp'], ['Thriving Moor'], ['Resistance Reunited'], ['Pacifism'], ['Plains'], ['Maul of the Skyclaves'], ['Name to check', 'q'], ['Aphelia, Viper Whisperer'], ['Thriving Heath'], ['Plains'], ['Coat with Venom'], ['Swamp']];
const fotoDialog = (dialog) => `<div style="position: absolute; inset: 0; background: #06080bcc; display: flex; align-items: center; justify-content: center; z-index: 10"><section role="dialog" aria-label="Photo 2" style="position: relative; width: 1040px; box-sizing: border-box; padding: 22px; border-radius: 16px; background: ${C.bg2}; border: 1px solid #3d4a5f; box-shadow: 0 20px 60px #000c; display: flex; gap: 24px">`
  + fotoStort(F06, 480, T06)
  + `<div style="flex-grow: 1; display: flex; flex-direction: column; gap: 12px; min-width: 0"><div style="display: flex; align-items: center; justify-content: space-between"><b style="font: 700 19px ${SANS}">Photo 2</b><button type="button" aria-label="Close" style="width: 32px; height: 32px; border-radius: 8px; border: 1px solid ${C.line}; background: ${C.bg3}; color: ${C.txt}; font: 600 16px ${SANS}; cursor: pointer">×</button></div>${t('12 cards were found in this photo. The blue marks show where. Point at a card in the list to see it in the photo.')}`
  + `<div style="display: flex; flex-direction: column">${lista06.map(([n, q]) => `<div style="display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid #1c2330"><span style="width: 16px; height: 16px; border-radius: 4px; display: grid; place-items: center; background: ${q ? C.acc : BLA}; color: ${q ? C.ink : '#fff'}; font: 800 10px ${SANS}">${q ? '?' : ik.check(10, 3.4)}</span><span style="font: 500 13.5px ${SANS}; color: ${q ? C.acc : C.txt}">${n}</span></div>`).join('')}</div>`
  + `<span style="flex-grow: 1"></span><div style="display: flex; gap: 8px">${pknapp(ik.camera(15) + 'Retake with the phone', 'sek')}${pknapp(ik.trash(13) + 'Remove photo…', 'ghost', `color: #ff9aa2`)}</div></div>`
  + (dialog || '') + `</section></div>`;
skriv('D2.dc.html', sidan('D2: a photo, larger', panelD1, hogerD1, '23 cards', { over: fotoDialog('') }));
const tabortDialog = `<div style="position: absolute; inset: 0; border-radius: 16px; background: #06080bb3; display: flex; align-items: center; justify-content: center"><div role="alertdialog" aria-label="Remove photo 2" style="width: 440px; box-sizing: border-box; padding: 22px; border-radius: 14px; background: ${C.bg3}; border: 1px solid #3d4a5f; display: flex; flex-direction: column; gap: 12px"><b style="font: 700 18px ${SANS}">Remove photo 2?</b>${t('12 cards were added from this photo. 1 of them is waiting for a name.')}`
  + `<div style="display: flex; flex-direction: column; gap: 8px; padding-top: 4px">${pknapp('Remove the photo and its 12 cards', 'prim', 'background: #d9535f; color: #fff; justify-content: flex-start')}${pknapp('Remove the photo, keep the cards', 'sek', 'justify-content: flex-start')}${pknapp('Cancel', 'ghost', 'justify-content: flex-start')}</div></div></div>`;
skriv('D3.dc.html', sidan('D3: remove a photo', panelD1, hogerD1, '23 cards', { over: fotoDialog(tabortDialog) }));

/* ══ To check: fallen, med sökfältet direkt i raden ══════════════════════ */
function tcSida(titel, inner, h = 900) {
  return sida(titel, 1020, h, `<div style="width: 1020px; height: ${h}px; box-sizing: border-box; padding: 26px; background: ${C.bg}; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column; gap: 18px">${inner}</div>`);
}
const fall = (rubrik, text, rad) => `<section style="display: flex; flex-direction: column; gap: 8px"><div style="display: flex; gap: 10px; align-items: baseline"><b style="font: 700 13px ${MONO}; color: ${C.dim}">${rubrik}</b><span style="font: 400 13px ${SANS}; color: ${C.dim2}">${text}</span></div>${rad}</section>`;
const flera = kollRad2({ remsa: remsa(F07, 180, 490, 460, 80, 150), fraga: 'Which of these is it?', under: 'From photo 1 · the name was hard to read', knappar: pknapp('None of them', 'ghost', 'height: 32px'),
  sok: `<div style="display: flex; gap: 8px">${[['Killing Glare', 'Killing Glare'], ['Killing Wave', null], ['Killing Spree', null]].map(([n, b], i) => `<button type="button" style="display: flex; align-items: center; gap: 8px; padding: 5px 10px 5px 5px; border-radius: 9px; background: ${i === 0 ? '#2a200e' : C.bg3}; border: ${i === 0 ? `1.5px solid ${C.acc}` : `1px solid ${C.line}`}; color: ${C.txt}; font: 600 13px ${SANS}; cursor: pointer">${b ? `<img src="${bild(b)}" alt="" style="width: 26px; height: 36px; border-radius: 2px">` : `<span style="width: 26px; height: 36px; border-radius: 2px; background: #2b3444"></span>`}${n}</button>`).join('')}</div>` });
const listaFel = kollRad2({ fraga: 'No card is called “Pacifsim”', under: 'From your pasted list · line 15 · not in the deck yet', sok: sokFalt('Pacifsim', 'Type the card name', { fokus: false }) + `<div style="display: flex; gap: 6px; align-items: center"><span style="font: 500 12.5px ${SANS}; color: ${C.dim}">Closest:</span>${pknapp(`<img src="${bild('Pacifism')}" alt="" style="width: 18px; height: 25px; border-radius: 2px">Pacifism`, 'sek', 'height: 32px; padding: 0 10px 0 5px')}</div>`, knappar: pknapp(ik.trash() + 'Remove', 'ghost', 'height: 32px') });
const bekraftad = `<div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 10px; background: #0f1d15; border: 1px solid #24503a"><img src="${bild('Venomous Hierophant')}" alt="" style="width: 28px; height: 39px; border-radius: 3px"><span style="color: ${C.green}">${ik.check(15, 2.8)}</span><b style="font: 600 13.5px ${SANS}">Venomous Hierophant</b><span style="font: 500 12.5px ${SANS}; color: ${C.dim}">Confirmed</span><span style="flex-grow: 1"></span>${pknapp(ik.undo() + 'Undo', 'ghost', 'height: 30px')}</div>`;
skriv('TC1.dc.html', tcSida('TC1: To check, every case',
  `<div style="display: flex; flex-direction: column; gap: 4px"><b style="font: 700 20px ${SANS}">To check: every case</b><span style="font: 400 14px ${SANS}; color: ${C.dim}">The same box for photos and pasted lists. Every row says where the card came from and whether it’s in the deck yet.</span></div>`
  + fall('A · CLOSE MATCH', 'One card is much closer than the rest. It’s in the deck with a Check mark until you answer.', gorgonRad)
  + fall('B · A FEW CANDIDATES', 'Several cards fit about as well. Pick one. Not in the deck until you do.', flera)
  + fall('C · NO NAME READ', 'The photo shows a card, but the name couldn’t be read. The search field is open right away.', okandRad(false))
  + fall('D · NO SUCH CARD', 'A line in a pasted list that isn’t a card name. Today this is only a note in the left panel.', listaFel)
  + fall('E · ANSWERED', 'The row stays small until the box closes, so you can undo.', bekraftad)));
skriv('TC2.dc.html', tcSida('TC2: To check, searching for a card',
  `<div style="display: flex; flex-direction: column; gap: 4px"><b style="font: 700 20px ${SANS}">Typing in the search field</b><span style="font: 400 14px ${SANS}; color: ${C.dim}">Matches show as you type, with the card picture. Enter picks the first one. The card goes into the deck and the row turns green.</span></div>`
  + attKolla2([okandRad(true, [['Hooded Blightfang', 'Hooded Blightfang'], ['Hooded Hydra', null], ['Hooded Kavu', null], ['Hoodwink', null]])], 'Mesa isn’t sure about this name.') + `<div style="height: 150px"></div>`, 520));

/* ══ Telefonen: tillstånden efter fotot ═══════════════════════════════ */
function telefon(titel, kropp, fot, o = {}) {
  return sida(titel, 390, 844, `<div style="position: relative; width: 390px; height: 844px; box-sizing: border-box; background: ${C.bg}; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column; padding: 18px 18px 22px; gap: 14px; overflow: hidden"><div style="display: flex; flex-direction: column; gap: 14px; flex-grow: 1; min-height: 0">${kropp}</div>${fot ? `<div style="display: flex; flex-direction: column; gap: 10px">${fot}</div>` : ''}</div>`, o);
}
const tk = (s, typ = 'prim', ikon = '') => `<button type="button" style="height: 52px; width: 100%; border-radius: 12px; font: 650 16px ${SANS}; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 9px; ${typ === 'prim' ? `background: ${C.acc}; color: ${C.ink}; border: 0` : `background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}`}">${ikon}${s}</button>`;
const tertiar = (s, ikon = ik.rotate(16)) => `<button type="button" style="align-self: center; height: 40px; padding: 0 12px; border: 0; background: transparent; color: ${C.txt}; font: 600 15px ${SANS}; display: flex; align-items: center; gap: 8px; cursor: pointer; text-decoration: underline; text-underline-offset: 4px; text-decoration-color: #5b6679">${ikon}${s}</button>`;
const topp = (s) => `<div style="display: flex; align-items: center; justify-content: space-between"><span style="display: flex; align-items: center; gap: 8px; font: 600 13px ${SANS}; color: ${C.green}"><i style="width: 8px; height: 8px; border-radius: 50%; background: ${C.green}"></i>New deck 3</span><span style="font: 600 13px ${SANS}; color: ${C.dim}">${s}</span></div>`;
function markFoto(dw, o = {}) {
  const s = dw / 1500, dh = Math.round(2000 * s);
  const m = T07.map(([x, y], i) => {
    const av = (o.av || []).includes(i), ingen = o.ingen;
    if (ingen) return '';
    return `<span style="position: absolute; left: ${Math.round(x * s) - 6}px; top: ${Math.round(y * s) - 4}px; width: 20px; height: 20px; border-radius: 5px; display: grid; place-items: center; ${av ? `background: #0d1015cc; border: 1.5px solid #9aa7ba; color: #9aa7ba` : `background: ${BLA}; color: #fff`}; box-shadow: 0 2px 6px #0009; animation: bock 7s ${(0.2 * i).toFixed(2)}s infinite both">${av ? '×' : ik.check(12, 3.2)}</span>`;
  }).join('');
  const extra = (o.extra || []).map(([x, y, typ]) => `<span style="position: absolute; left: ${Math.round(x * s)}px; top: ${Math.round(y * s)}px; width: 20px; height: 20px; border-radius: 5px; display: grid; place-items: center; background: ${typ === 'av' ? '#0d1015cc' : BLA}; border: ${typ === 'av' ? '1.5px solid #9aa7ba' : '0'}; color: ${typ === 'av' ? '#9aa7ba' : '#fff'}; box-shadow: 0 0 0 4px #5b8cff55; font: 800 12px ${SANS}">${typ === 'av' ? '×' : ik.check(12, 3.2)}</span>`).join('');
  const zon = (o.zoner || []).map(([x, y, w, h]) => `<div style="position: absolute; left: ${Math.round(x * s)}px; top: ${Math.round(y * s)}px; width: ${Math.round(w * s)}px; height: ${Math.round(h * s)}px; border: 2px dashed ${C.acc}; border-radius: 6px; background: #f0a52a1f"></div>`).join('');
  return `<div style="position: relative; width: ${dw}px; height: ${dh}px; border-radius: 10px; overflow: hidden; flex: none; ${o.dim ? 'filter: grayscale(.4) brightness(.7);' : ''}"><img src="${F07.url}" alt="Photo 1" style="position: absolute; left: 0; top: 0; width: ${dw}px; height: ${dh}px">${zon}${m}${extra}</div>`;
}
const forklaring = `<span style="display: flex; align-items: center; gap: 8px; font: 500 13.5px ${SANS}; color: ${C.dim}"><span style="width: 18px; height: 18px; border-radius: 5px; display: grid; place-items: center; background: ${BLA}; color: #fff; flex: none">${ik.check(11, 3.2)}</span>Found as a card. Names are checked on the computer.</span>`;
const not = (typ, rub, text) => `<div style="display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border-radius: 12px; ${typ === 'varn' ? 'background: #1d1810; border: 1px solid #6a5220' : typ === 'fel' ? 'background: #211216; border: 1px solid #6a2a33' : `background: ${C.bg2}; border: 1px solid ${C.line}`}"><span style="width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; flex: none; font: 800 13px ${SANS}; ${typ === 'varn' ? `background: ${C.acc}; color: ${C.ink}` : typ === 'fel' ? 'background: #e2606a; color: #fff' : `background: ${BLA}; color: #fff`}">${typ === 'info' ? 'i' : '!'}</span><span style="display: flex; flex-direction: column; gap: 3px"><b style="font: 650 15px ${SANS}">${rub}</b><span style="font: 400 14px/1.45 ${SANS}; color: ${C.dim}">${text}</span></span></div>`;
const efterFoto = tk('Next photo', 'prim', ik.camera()) + tk('Done photographing', 'sek');

/* M0 · Lägg ut korten (abstrakt animation). */
skriv('M0.dc.html', telefon('M0: phone, lay out the cards',
  topp('Photo 1') + `<h1 style="margin: 0; font: 750 27px/1.15 ${SANS}; letter-spacing: -0.4px">Lay out 10–15 cards at a time</h1>` + laggAnim(354, 300, { kw: 76, steg: 20, per: 4 })
  + `<ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 9px">${['In columns, overlapping, so each name shows', 'Basic lands too, since you chose to photograph them', 'Portrait or landscape, both work'].map(s => `<li style="display: flex; gap: 11px; font: 500 14.5px/1.4 ${SANS}"><span style="color: ${C.dim}">•</span>${s}</li>`).join('')}</ul>`,
  tk('Open camera', 'prim', ik.camera())));

/* M1 · Kameran, med tipsen som finns i koden (Tweaks). */
{
  const dh = 844, dw = Math.round(1500 * dh / 2000), off = Math.round((dw - 390) / 2);
  const chip = (flagga, farg, s) => `<sc-if value="{{${flagga}}}" hint-placeholder-val="{{${flagga === 'ok'}}}"><span style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 99px; background: #0d1015e6; font: 600 13.5px ${SANS}"><i style="width: 9px; height: 9px; border-radius: 50%; background: ${farg}"></i>${s}</span></sc-if>`;
  skriv('M1.dc.html', telefon('M1: phone, the camera and its tips',
    `<div style="position: absolute; left: 0; top: 0; width: 390px; height: 844px; overflow: hidden; background: #000"><img src="${F07.url}" alt="The camera view" style="position: absolute; left: ${-off}px; top: 0; width: ${dw}px; height: ${dh}px; max-width: none">`
    + `<div style="position: absolute; left: 16px; right: 16px; top: 18px; display: flex; justify-content: space-between; align-items: center"><span style="padding: 8px 12px; border-radius: 99px; background: #0d1015e6; font: 650 14px ${SANS}">Photo 1</span>${chip('ok', C.green, 'Names are readable')}${chip('liten', C.acc, 'Move closer: the names are too small')}${chip('suddig', C.acc, 'Hold still: the picture is blurry')}${chip('blank', C.acc, 'Move the light: it reflects')}</div>`
    + `<div style="position: absolute; left: 16px; right: 16px; bottom: 132px; padding: 12px 14px; border-radius: 12px; background: #0d1015e6; font: 500 14px/1.45 ${SANS}; text-align: center">Hold the phone straight above the cards.<br><span style="color: #c7d0dd">Portrait or landscape, both work.</span></div>`
    + `<div style="position: absolute; left: 0; right: 0; bottom: 30px; display: flex; align-items: center; justify-content: space-between; padding: 0 36px"><button type="button" style="border: 0; background: transparent; color: ${C.txt}; font: 600 16px ${SANS}; cursor: pointer; width: 70px; text-align: left; text-shadow: 0 1px 3px #000">Back</button><button type="button" aria-label="Take photo" style="width: 78px; height: 78px; border-radius: 50%; background: #fff; border: 5px solid #ffffff66; background-clip: padding-box; cursor: pointer"></button><span style="width: 70px"></span></div></div>`, null,
    { props: { tips: { editor: 'enum', options: ['Names are readable', 'Too small', 'Blurry', 'Reflection'], default: 'Names are readable' } }, logic: `const v = this.props.tips ?? 'Names are readable';\nreturn { ok: v === 'Names are readable', liten: v === 'Too small', suddig: v === 'Blurry', blank: v === 'Reflection' };` }));
}

const huvudM = (antal, s = 'Photo 1') => topp(s) + `<b style="font: 750 26px ${SANS}; letter-spacing: -0.4px">${antal}</b>`;
skriv('M2.dc.html', telefon('M2: all cards found',
  huvudM('12 cards found') + markFoto(354) + forklaring + tertiar('Retake this photo'), efterFoto));
skriv('M3.dc.html', telefon('M3: some names are unclear',
  huvudM('12 cards found') + markFoto(354) + not('info', '2 names are unclear', 'That’s fine. You pick the right card on the computer.') + tertiar('Retake this photo'), efterFoto));
skriv('M4.dc.html', telefon('M4: cards seen but not read',
  huvudM('9 cards found') + markFoto(354, { av: [], ingen: false, zoner: [[1380, 300, 120, 1500]] }) + not('varn', '3 cards were seen but not read', 'They were too small or cut off at the edge. Retake closer, or take them in the next photo.'),
  tk('Retake closer', 'prim', ik.rotate(18)) + tk('Keep, take the next photo', 'sek')));
skriv('M5a.dc.html', telefon('M5 option A: something that isn’t a card, fixed on the phone',
  huvudM('12 cards found') + markFoto(354, { av: [], extra: [[1150, 1650, 'av']] }) + not('info', 'Tap a mark to remove it', 'If Mesa marked something that isn’t a card, like the box or a coaster, tap it. 11 cards are kept.') + tertiar('Retake this photo'), efterFoto));
skriv('M5b.dc.html', telefon('M5 option B: fixed on the computer',
  huvudM('13 cards found') + markFoto(354, { extra: [[1150, 1650, 'ok']] }) + forklaring + `<span style="font: 400 13.5px/1.45 ${SANS}; color: ${C.dim}">Something wrong? You can remove it on the computer, where you see the photo larger.</span>` + tertiar('Retake this photo'), efterFoto));
skriv('M6.dc.html', telefon('M6: no cards found',
  huvudM('No cards found') + markFoto(354, { ingen: true, dim: true }) + not('varn', 'Mesa didn’t find any cards', 'Check that the name lines show, and that the light doesn’t reflect in the sleeves.'),
  tk('Retake photo', 'prim', ik.rotate(18))));
skriv('M7.dc.html', telefon('M7: cards found, no names readable',
  huvudM('6 cards found') + markFoto(354, { av: [0, 1, 2, 3, 4, 5], dim: true }) + not('varn', 'None of the names could be read', 'Nothing was added. Hold the phone straight above the cards, a little closer, with fewer cards.'),
  tk('Retake photo', 'prim', ik.rotate(18))));
skriv('M8.dc.html', telefon('M8: the photo wasn’t read',
  huvudM('Photo not read') + markFoto(354, { ingen: true, dim: true }) + not('fel', 'The connection dropped', 'Your photo is kept on the phone. Nothing was added to the deck.'),
  tk('Try again', 'prim') + tertiar('Retake photo')));
skriv('M9.dc.html', telefon('M9: read, but not saved',
  huvudM('12 cards found') + markFoto(354, { dim: true }) + not('fel', 'The cards weren’t saved', '12 cards are waiting on the phone. Check the connection and try again. No need for a new photo.'),
  tk('Try again', 'prim')));

/* ── index: sida G ── */
const LAST = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const PW = 390, PH = 844, DW = 1440, DH = 900, GX = 80, RY = 343, NW = 420;
const y = (r) => [0, DH + RY, 2 * (DH + RY), 3 * (DH + RY)][r];
const plats = {
  'G1.dc.html': [0, y(0), NW, 900, 'G1 · Take photos, step 1: basic lands'],
  'G2.dc.html': [NW + GX, y(0), NW, 900, 'G2 · Step 2: connect the phone'],
  'G3.dc.html': [2 * (NW + GX), y(0), NW, 900, 'G3 · Step 3: the first photo (animated)'],
  'G4.dc.html': [3 * (NW + GX), y(0), NW, 900, 'G4 · A photo is being read'],
  'G5.dc.html': [4 * (NW + GX), y(0), NW, 900, 'G5 · After photo 2'],
  'G6.dc.html': [5 * (NW + GX), y(0), NW, 900, 'G6 · Done photographing'],
  'M0.dc.html': [0, y(1), PW, PH, 'M0 · Phone: lay out 10–15 cards (animated)'],
  'M1.dc.html': [PW + GX, y(1), PW, PH, 'M1 · Camera tips from the code (Tweaks)'],
  'M2.dc.html': [2 * (PW + GX), y(1), PW, PH, 'M2 · All cards found'],
  'M3.dc.html': [3 * (PW + GX), y(1), PW, PH, 'M3 · Some names unclear'],
  'M4.dc.html': [4 * (PW + GX), y(1), PW, PH, 'M4 · Cards seen but not read'],
  'M5a.dc.html': [5 * (PW + GX), y(1), PW, PH, 'M5 option A · Not a card: fix on the phone'],
  'M5b.dc.html': [6 * (PW + GX), y(1), PW, PH, 'M5 option B · Not a card: fix on the computer'],
  'M6.dc.html': [7 * (PW + GX), y(1), PW, PH, 'M6 · No cards found'],
  'M7.dc.html': [8 * (PW + GX), y(1), PW, PH, 'M7 · No names readable'],
  'M8.dc.html': [9 * (PW + GX), y(1), PW, PH, 'M8 · The photo wasn’t read'],
  'M9.dc.html': [10 * (PW + GX), y(1), PW, PH, 'M9 · Read, but not saved'],
  'D1.dc.html': [0, y(2), DW, DH, 'D1 · Deck page after photo 2 (no ? cards in the deck)'],
  'D2.dc.html': [DW + GX, y(2), DW, DH, 'D2 · A photo, larger'],
  'D3.dc.html': [2 * (DW + GX), y(2), DW, DH, 'D3 · Remove a photo'],
  'TC1.dc.html': [0, y(3), 1020, 900, 'TC1 · To check: every case'],
  'TC2.dc.html': [1020 + GX, y(3), 1020, 520, 'TC2 · To check: searching'],
};
const pages = (LAST.pages || []).filter(p => p.id !== 'g');
pages.unshift({ id: 'g', name: 'G · Step by step' });
const boards = Object.assign({}, LAST.boards), order = LAST.order.slice();
for (const [f, [x, yy, w, h, title]] of Object.entries(plats)) { boards[f] = { x, y: yy, w, h, title, page: 'g' }; if (!order.includes(f)) order.push(f); }
const notes = Object.assign({}, LAST.notes, {
  g0: { x: 0, y: y(0) - 260, text: 'Take photos: one step at a time (the left panel)', kind: 'title1', maxW: 6 * NW + 5 * GX, page: 'g' },
  g1: { x: 0, y: y(1) - 260, text: 'The phone after each photo: what can happen, and how to fix it', kind: 'title1', maxW: 11 * PW + 10 * GX, page: 'g' },
  g2: { x: 0, y: y(2) - 260, text: 'The computer: the photos, and removing one', kind: 'title1', maxW: 3 * DW + 2 * GX, page: 'g' },
  g3: { x: 0, y: y(3) - 260, text: 'To check: every case, for photos and pasted lists', kind: 'title1', maxW: 2 * 1020 + GX, page: 'g' },
});
const canvas = Object.assign({}, LAST, { pages, boards, order, notes, launch: { view: 'canvas', page: 'g' } });
for (const [n, h] of Object.entries(filer)) fs.writeFileSync(path.join(OUT, n), h);
fs.writeFileSync(path.join(OUT, 'canvas.json'), JSON.stringify(canvas, null, 1));
const streck = Object.entries(filer).filter(([, h]) => /—/.test(h));
console.log(Object.keys(filer).join(' '), streck.length ? 'TANKSTRECK: ' + streck.map(([n]) => n).join(' ') : 'inga tankstreck');

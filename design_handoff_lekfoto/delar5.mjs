// Sida H (Jesper 2026-09-27): Connect först, ingen fråga om basländer (de som fotas fylls i längst ned,
// resten står på 0); telefonens lägen skiljer på "kort hittat" och "namn läst", med nästa steg och
// vilken enhet överst; ta bort det som inte är ett kort på datorn med stora rader; To check som en
// granskare med ett kort i taget, som ryms också på en smal skärm.
import { fs, path, OUT, C, SANS, MONO, bild, F07, F06, CSS, ik, knapp, kortRuta, sektion, basland, remsa, TYP } from './delar3.mjs';

const BLA = '#5b8cff', ROD = '#e2606a';
const CSS2 = CSS + `
@keyframes falla{0%{opacity:0;transform:translateY(-34px)}8%{opacity:1;transform:none}86%{opacity:1}96%,100%{opacity:0}}
@keyframes bock{0%{opacity:0;transform:scale(.3)}5%{opacity:1;transform:scale(1.15)}8%{transform:scale(1)}90%{opacity:1}97%,100%{opacity:0}}
@keyframes blixt2{0%,62%{opacity:0}64%{opacity:.9}74%,100%{opacity:0}}
@keyframes ramInOut{0%,55%{opacity:0}62%,90%{opacity:1}97%,100%{opacity:0}}
@keyframes puls2{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes streck{0%,100%{border-color:#f0a52a}50%{border-color:#f0a52a55}}
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
ik.search = (s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="M16 16l4.5 4.5"></path></svg>`;
ik.next = (s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"></path></svg>`;
ik.x = (s = 14) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>`;
const filer = {};
const skriv = (n, h) => { filer[n] = h; };
const t = (s, o = '') => `<span style="font: 400 13.5px/1.5 ${SANS}; color: ${C.dim}; ${o}">${s}</span>`;
const stor = (s) => `<b style="font: 700 18px/1.3 ${SANS}; color: ${C.txt}">${s}</b>`;
const etik = (s, f = C.acc) => `<span style="font: 700 11px ${MONO}; letter-spacing: 1px; color: ${f}">${s}</span>`;
const pk = (s, typ = 'prim', o = '') => knapp(s, typ, `height: 42px; font-size: 14px; padding: 0 16px; ${o}`);
const F05 = { url: '/_blob/76eb91fcf27b18b0729db1987519b62f', w: 1500, h: 2000 }, F15 = { url: '/_blob/8231520ba70b9480b86c09ae2e5b95a5', w: 2000, h: 1500 };

/* Abstrakt läggning (samma som G). */
function laggAnim(w, h, o = {}) {
  const kw = o.kw || 54, kh = Math.round(kw * 1.4), st = o.steg || 15, kol = o.kol || 3, per = o.per || 4, gap = Math.round((w - kol * kw) / (kol + 1));
  let s = '';
  for (let c = 0; c < kol; c++) for (let i = 0; i < per; i++) s += `<div style="position: absolute; left: ${gap + c * (kw + gap)}px; top: ${18 + i * st}px; width: ${kw}px; height: ${kh}px; box-sizing: border-box; border-radius: 5px; background: #2b3444; border: 1px solid #3d4a5f; box-shadow: 0 3px 8px #0008; animation: falla 8s ${(c * per * 0.28 + i * 0.28).toFixed(2)}s infinite both"><div style="margin: 4px; height: 8px; border-radius: 2px; background: #cfd6e2; display: flex; align-items: center; padding: 0 3px"><i style="width: 60%; height: 2px; border-radius: 1px; background: #5b6679"></i></div><div style="margin: 0 4px; height: ${Math.round(kh * 0.38)}px; border-radius: 2px; background: #3a4558"></div></div>`;
  const hörn = (x, y, st2) => `<i style="position: absolute; left: ${x}px; top: ${y}px; width: 18px; height: 18px; border: 2.5px solid #e7ecf4; ${st2}"></i>`;
  return `<div style="position: relative; width: ${w}px; height: ${h}px; border-radius: 12px; background: #161c26; border: 1px solid ${C.line}; overflow: hidden; flex: none">${s}<div style="position: absolute; inset: 8px; animation: ramInOut 8s infinite both">${hörn(0, 0, 'border-right: 0; border-bottom: 0; border-top-left-radius: 6px')}${hörn(w - 34, 0, 'border-left: 0; border-bottom: 0; border-top-right-radius: 6px')}${hörn(0, h - 34, 'border-right: 0; border-top: 0; border-bottom-left-radius: 6px')}${hörn(w - 34, h - 34, 'border-left: 0; border-top: 0; border-bottom-right-radius: 6px')}</div><div style="position: absolute; inset: 0; background: #fff; animation: blixt2 8s infinite both; pointer-events: none"></div></div>`;
}
const flikar = `<div role="tablist" style="display: grid; grid-template-columns: 1.25fr 1fr 0.7fr; gap: 4px; padding: 4px; border-radius: 10px; border: 1px solid ${C.line}; background: ${C.bg}">${[['Take photos', ik.camera(15)], ['Paste a list', ik.list()], ['Type', ik.kb()]].map(([s, i], j) => `<button type="button" role="tab" aria-selected="${j === 0}" style="height: 32px; border-radius: 7px; border: ${j === 0 ? '1px solid #3d4a5f' : '0'}; background: ${j === 0 ? C.bg3 : 'transparent'}; color: ${j === 0 ? C.txt : C.dim}; font: 600 12.5px ${SANS}; display: flex; align-items: center; justify-content: center; gap: 7px; cursor: pointer">${i}${s}</button>`).join('')}</div>`;
const panelInre = (innehall) => `<b style="font: 700 15px ${SANS}">Add cards</b>${flikar}${innehall}`;
const panel = (titel, innehall) => sida(titel, 420, 900, `<aside style="width: 420px; height: 900px; box-sizing: border-box; padding: 20px 22px; background: #11151c; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column; gap: 16px; overflow: hidden; border-right: 1px solid ${C.line}">${panelInre(innehall)}</aside>`);
const ansl = `<div style="display: flex; align-items: center; gap: 9px; padding: 9px 12px; border-radius: 10px; background: #0f1d15; border: 1px solid #24503a; font: 500 13px ${SANS}; color: #bfe8cf"><i style="width: 8px; height: 8px; border-radius: 50%; background: ${C.green}"></i>Phone connected</div>`;
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
const tumme = (f) => { const dw = 44, sw = 1300, s = dw / sw; return `<span style="position: relative; width: ${dw}px; height: 51px; overflow: hidden; border-radius: 4px; flex: none; display: block"><img src="${f.url}" alt="" style="position: absolute; left: ${Math.round(-100 * s)}px; top: ${Math.round(-250 * s)}px; width: ${Math.round(f.w * s)}px; height: ${Math.round(f.h * s)}px; max-width: none"></span>`; };
const fotoRadH = (nr, f, text, o = {}) => `<div style="display: flex; align-items: center; gap: 12px; padding: 8px 10px; border-radius: 10px; background: ${o.nu ? '#1d1810' : C.bg2}; border: 1px solid ${o.nu ? '#6a5220' : C.line}">${f ? tumme(f) : `<span style="width: 44px; height: 51px; border-radius: 4px; background: ${C.bg3}; display: grid; place-items: center; color: ${C.dim}">${ik.camera(16)}</span>`}<div style="display: flex; flex-direction: column; gap: 2px; flex-grow: 1"><b style="font: 650 13.5px ${SANS}">Photo ${nr}</b><span style="font: 500 12.5px ${SANS}; color: ${C.dim}">${text}</span></div>${o.hoger !== undefined ? o.hoger : `<button type="button" style="border: 0; background: transparent; color: ${C.dim}; font: 600 12.5px ${SANS}; cursor: pointer">View</button>`}</div>`;

/* ══ Rad 1: panelen, två steg ═════════════════════════════════════════ */

/* ══ Rad 2: telefonen. Överst: vad som hände och NÄSTA STEG på vilken enhet. ═══ */
const T07 = [[215, 360], [200, 500], [185, 680], [230, 840], [230, 990], [235, 1165], [825, 395], [845, 535], [870, 725], [870, 850], [880, 1040], [910, 1200]];
function fotoLitet(o = {}) {
  const dw = 354, s = dw / 1500, top = 280, dh = 232;
  const m = o.ingen ? '' : T07.map(([x, y], i) => (o.bort || []).includes(i) ? '' : `<span style="position: absolute; left: ${Math.round(x * s) - 6}px; top: ${Math.round((y - top) * s) - 4}px; width: 20px; height: 20px; border-radius: 5px; display: grid; place-items: center; background: ${BLA}; color: #fff; box-shadow: 0 2px 6px #0009; animation: bock 7s ${(0.18 * i).toFixed(2)}s infinite both">${ik.check(12, 3.2)}</span>`).join('');
  const zon = (o.zoner || []).map(([x, y, w, h]) => `<div style="position: absolute; left: ${Math.round(x * s)}px; top: ${Math.round((y - top) * s)}px; width: ${Math.round(w * s)}px; height: ${Math.round(h * s)}px; box-sizing: border-box; border: 2.5px dashed ${C.acc}; border-radius: 6px; background: #f0a52a26; display: grid; place-items: center; animation: streck 1.6s infinite"><span style="width: 22px; height: 22px; border-radius: 50%; background: ${C.acc}; color: ${C.ink}; display: grid; place-items: center; font: 800 13px ${SANS}">!</span></div>`).join('');
  return `<div style="position: relative; width: ${dw}px; height: ${dh}px; border-radius: 10px; overflow: hidden; flex: none; ${o.dim ? 'filter: grayscale(.5) brightness(.6);' : ''}"><img src="${F07.url}" alt="Photo 1" style="position: absolute; left: 0; top: ${-Math.round(top * s)}px; width: ${dw}px; height: ${Math.round(2000 * s)}px">${zon}${m}</div>`;
}
/* Vad fotot gav, rad för rad: kort hittade, namn lästa, namn att kolla, kort som inte hittades. */
const rad = (typ, s, var_) => {
  const ikon = typ === 'kort' ? [BLA, '#fff', ik.check(12, 3.2)] : typ === 'namn' ? [C.green, C.ink, ik.check(12, 3.2)] : typ === 'kolla' ? ['#3a2e14', C.acc, '?'] : typ === 'saknas' ? [C.acc, C.ink, '!'] : [ROD, '#fff', '!'];
  return `<div style="display: flex; align-items: center; gap: 11px; padding: 7px 0"><span style="width: 22px; height: 22px; border-radius: 6px; display: grid; place-items: center; flex: none; background: ${ikon[0]}; color: ${ikon[1]}; font: 800 12px ${SANS}; ${typ === 'kolla' ? `border: 1.5px solid ${C.acc}` : ''}">${ikon[2]}</span><span style="flex-grow: 1; font: 600 15px ${SANS}">${s}</span>${var_ ? `<span style="display: flex; align-items: center; gap: 5px; font: 600 12.5px ${SANS}; color: ${C.dim}">${var_ === 'dator' ? ik.laptop(15) + 'Computer' : ik.phone(14) + 'Phone'}</span>` : ''}</div>`;
};
const rader = (...r) => `<div style="display: flex; flex-direction: column; padding: 4px 14px; border-radius: 12px; background: ${C.bg2}; border: 1px solid ${C.line}">${r.join(`<i style="height: 1px; background: ${C.line}"></i>`)}</div>`;
/* NÄSTA STEG: överst, stort, med enheten. */
const nasta = (enhet, rub, text, ton = 'ok') => {
  const f = ton === 'fix' ? ['#1d1810', '#8a6a24', C.acc] : ton === 'fel' ? ['#211216', '#7a2f3a', '#ff9aa2'] : ['#101a2e', '#2a3a66', '#b9c8ff'];
  return `<div style="display: flex; gap: 14px; align-items: center; padding: 14px 16px; border-radius: 14px; background: ${f[0]}; border: 1.5px solid ${f[1]}"><span style="width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; flex: none; background: #0d101580; color: ${f[2]}">${enhet === 'dator' ? ik.laptop(24) : ik.phone(22)}</span><span style="display: flex; flex-direction: column; gap: 3px"><span style="font: 700 11px ${MONO}; letter-spacing: 1px; color: ${f[2]}">NEXT, ON THE ${enhet === 'dator' ? 'COMPUTER' : 'PHONE'}</span><b style="font: 700 17px/1.25 ${SANS}">${rub}</b>${text ? `<span style="font: 400 13.5px/1.4 ${SANS}; color: ${C.dim}">${text}</span>` : ''}</span></div>`;
};
function telefon(titel, rubrik, delar, knappar) {
  return sida(titel, 390, 844, `<div style="position: relative; width: 390px; height: 844px; box-sizing: border-box; background: ${C.bg}; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column; padding: 16px 18px 20px; gap: 12px; overflow: hidden">`
    + `<div style="display: flex; align-items: center; justify-content: space-between"><span style="display: flex; align-items: center; gap: 8px; font: 600 13px ${SANS}; color: ${C.green}"><i style="width: 8px; height: 8px; border-radius: 50%; background: ${C.green}"></i>New deck 3</span><span style="font: 600 13px ${SANS}; color: ${C.dim}">Photo 1</span></div>`
    + `<h1 style="margin: 0; font: 750 25px/1.2 ${SANS}; letter-spacing: -0.4px">${rubrik}</h1>`
    + `<div style="display: flex; flex-direction: column; gap: 12px; flex-grow: 1; min-height: 0">${delar}</div>`
    + `<div style="display: flex; flex-direction: column; gap: 8px; padding-top: 4px">${knappar}</div></div>`);
}
const tk = (s, typ = 'prim', ikon = '') => `<button type="button" style="height: 52px; width: 100%; border-radius: 12px; font: 650 16px ${SANS}; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 9px; ${typ === 'prim' ? `background: ${C.acc}; color: ${C.ink}; border: 0` : `background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}`}">${ikon}${s}</button>`;
const textKnapp = (s) => `<button type="button" style="height: 40px; border: 0; background: transparent; color: ${C.txt}; font: 600 15px ${SANS}; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer">${ik.rotate(16)}${s}</button>`;


/* ══ Rad 3: datorn. Hela sidan när fotona är klara, och ett foto med stora rader ═══ */
function sidan(titel, panelHtml, hoger, antal, o = {}) {
  return sida(titel, 1440, 900,
    `<div style="position: relative; width: 1440px; height: 900px; box-sizing: border-box; background: ${C.bg}; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column; overflow: hidden">`
    + `<div style="height: 44px; flex: none; display: flex; align-items: center; padding: 0 22px; background: #0b0e13; border-bottom: 1px solid ${C.line}"><b style="font: 800 15px ${SANS}; color: ${C.acc}">Mesa</b><span style="flex-grow: 1"></span><span style="display: flex; align-items: center; gap: 7px; font: 600 13px ${SANS}"><i style="width: 7px; height: 7px; border-radius: 50%; background: ${C.acc}"></i>Jesper</span></div>`
    + `<header style="height: 58px; flex: none; display: flex; align-items: center; gap: 14px; padding: 0 22px; border-bottom: 1px solid ${C.line}"><button type="button" style="display: flex; align-items: center; gap: 6px; border: 0; background: transparent; color: ${C.dim}; font: 500 14px ${SANS}; cursor: pointer">${ik.back()}Home</button><i style="width: 1px; height: 22px; background: ${C.line}"></i><b style="font: 700 18px ${SANS}">New deck 3</b><span style="font: 600 13px ${MONO}; color: ${C.dim}">${antal}</span><span style="flex-grow: 1"></span><span style="display: flex; align-items: center; gap: 6px; font: 500 13px ${SANS}; color: ${C.dim}">${ik.check(13)}Saved</span></header>`
    + `<div style="flex-grow: 1; min-height: 0; display: flex"><aside style="width: 420px; flex: none; box-sizing: border-box; padding: 20px 22px; border-right: 1px solid ${C.line}; background: #11151c; display: flex; flex-direction: column; gap: 14px; overflow: hidden">${panelInre(panelHtml)}</aside>`
    + `<main style="flex-grow: 1; min-width: 0; box-sizing: border-box; padding: 20px 28px; display: flex; flex-direction: column; gap: 22px; overflow: hidden">${hoger}</main></div>`
    + (o.over || '') + `</div>`, o.sidaO || {});
}
/* To check som en rad överst, som öppnar granskaren. */
const kollBar = (n, o = {}) => `<div style="display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-radius: 12px; border: 1px solid #6a5220; background: #17140e"><i style="width: 9px; height: 9px; border-radius: 50%; background: ${C.acc}"></i><b style="font: 700 14.5px ${SANS}">${n} names to check</b><span style="display: flex; gap: 4px">${['Gorgon Flail', null, 'Venomous Hierophant'].map(b => b ? `<img src="${bild(b)}" alt="" style="width: 22px; height: 31px; border-radius: 2px">` : `<span style="width: 22px; height: 31px; border-radius: 2px; border: 1.5px dashed #6a5220; box-sizing: border-box"></span>`).join('')}</span><span style="font: 400 13px ${SANS}; color: ${C.dim}">${o.text || 'One card waits for a name before it joins the deck.'}</span><span style="flex-grow: 1"></span>${pk('Check names', 'prim', 'height: 36px')}</div>`;
const ALLA = Object.values(TYP).flat().filter(n => n !== 'Hooded Blightfang');
const grid = (urval, o = {}) => Object.entries(TYP).map(([typ, l]) => { const x = l.filter(n => urval.includes(n)); return x.length ? sektion(typ, x.length, x.map(n => kortRuta(n, { check: (o.check || []).includes(n), w: o.w || 80 })).join('')) : ''; }).join('');
const panelKlar = `<div style="display: flex; flex-direction: column; gap: 6px">${stor('4 photos, 38 cards added')}${t('Finish the deck on the right: check 3 names at the top, and the basic lands at the bottom.')}</div>` + etik('PHOTOS', C.dim) + fotoRadH(1, F07, '13 found · 1 to look at') + fotoRadH(2, F06, '12 cards') + fotoRadH(3, F05, '6 cards') + fotoRadH(4, F15, '8 cards') + `<span style="flex-grow: 1"></span>${pk(ik.camera(16) + 'Take more photos', 'sek', 'align-self: flex-start')}`;

/* Ett foto: stora rader, en per sak Mesa räknade. "Not a card" på raden, markeringen i fotot följer med. */
function fotoRuta(f, dw, markY, top = 0, dh = 520) {
  const s = dw / f.w;
  return `<div style="position: relative; width: ${dw}px; height: ${dh}px; border-radius: 10px; overflow: hidden; flex: none"><img src="${f.url}" alt="Photo 1" style="position: absolute; left: 0; top: ${-Math.round(top * s)}px; width: ${dw}px; height: ${Math.round(f.h * s)}px">`
    + `<div style="position: absolute; left: ${Math.round(40 * s)}px; top: ${Math.round((1810 - top) * s)}px; width: ${Math.round(330 * s)}px; height: ${Math.round(180 * s)}px; box-sizing: border-box; border: 3px solid ${C.acc}; border-radius: 8px; box-shadow: 0 0 0 4px #f0a52a44"></div></div>`;
}
const fyndRad = (bildHtml, namn, under, o = {}) => `<div style="display: flex; align-items: center; gap: 14px; min-height: 60px; padding: 8px 12px; border-radius: 10px; ${o.vald ? `background: #1d1810; border: 1.5px solid ${C.acc}` : `background: ${C.bg2}; border: 1px solid ${C.line}`}">${bildHtml}<div style="display: flex; flex-direction: column; gap: 2px; flex-grow: 1; min-width: 0"><b style="font: 650 14.5px ${SANS}">${namn}</b><span style="font: 400 12.5px ${SANS}; color: ${o.vald ? C.acc : C.dim}">${under}</span></div>${o.knapp || ''}</div>`;
const liten = (n) => `<img src="${bild(n)}" alt="" style="width: 34px; height: 47px; border-radius: 3px; flex: none">`;
const tra = remsa(F07, 40, 1810, 330, 180, 82);
const fotoVy = `<div style="position: absolute; inset: 0; background: #06080bcc; display: flex; align-items: center; justify-content: center; z-index: 10"><section role="dialog" aria-label="Photo 1" style="width: 1100px; box-sizing: border-box; padding: 22px; border-radius: 16px; background: ${C.bg2}; border: 1px solid #3d4a5f; box-shadow: 0 20px 60px #000c; display: flex; gap: 24px">`
  + fotoRuta(F07, 390, 0)
  + `<div style="flex-grow: 1; display: flex; flex-direction: column; gap: 10px; min-width: 0"><div style="display: flex; align-items: center; justify-content: space-between"><b style="font: 700 19px ${SANS}">Photo 1 · 13 found</b><button type="button" aria-label="Close" style="width: 34px; height: 34px; border-radius: 8px; border: 1px solid ${C.line}; background: ${C.bg3}; color: ${C.txt}; display: grid; place-items: center; cursor: pointer">${ik.x()}</button></div>`
  + `<div style="display: flex; gap: 12px; align-items: center; padding: 12px 14px; border-radius: 12px; background: #1d1810; border: 1px solid #6a5220"><span style="color: ${C.acc}">${ik.laptop(20)}</span><span style="font: 500 14px/1.45 ${SANS}"><b>1 thing Mesa counted isn’t a card.</b> <span style="color: ${C.dim}">It’s selected below and outlined in the photo. Press Not a card to remove it.</span></span></div>`
  + fyndRad(tra, 'No name read', 'Looks like the table, not a card', { vald: true, knapp: pk(ik.x(13) + 'Not a card', 'prim', 'height: 40px') + pk('It’s a card', 'sek', 'height: 40px') })
  + fyndRad(liten('Pharika’s Chosen'), 'Pharika’s Chosen', 'In the deck') + fyndRad(liten('Killing Glare'), 'Killing Glare', 'In the deck') + fyndRad(liten('Ukud Cobra'), 'Ukud Cobra', 'In the deck')
  + `<span style="font: 500 13px ${SANS}; color: ${C.dim}; padding: 2px 4px">+ 9 more cards from this photo</span>`
  + `<span style="flex-grow: 1"></span><div style="display: flex; gap: 8px">${pk(ik.camera(15) + 'Retake with the phone', 'sek')}${pk(ik.trash(13) + 'Remove photo…', 'ghost', 'color: #ff9aa2')}</div></div></section></div>`;

/* ══ Rad 4: To check som granskare, ett kort i taget ══════════════════ */
const sokF = (varde, ph, lista) => `<div style="position: relative; width: 100%; max-width: 380px"><label style="display: flex; align-items: center; gap: 8px; height: 44px; box-sizing: border-box; padding: 0 12px; border-radius: 10px; border: 1.5px solid ${C.acc}; background: ${C.bg}"><span style="color: ${C.dim}">${ik.search(16)}</span><input type="text" value="${varde}" placeholder="${ph}" aria-label="Card name" style="flex-grow: 1; min-width: 0; border: 0; background: transparent; color: ${C.txt}; font: 500 15px ${SANS}; outline: none"></label>${lista ? `<div role="listbox" style="margin-top: 6px; padding: 5px; border-radius: 10px; background: ${C.bg3}; border: 1px solid #3d4a5f; display: flex; flex-direction: column; gap: 2px">${lista.map(([n, b], i) => `<div role="option" aria-selected="${i === 0}" style="display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 4px 8px; border-radius: 7px; ${i === 0 ? `background: ${C.bg4}` : ''}">${b ? `<img src="${bild(b)}" alt="" style="width: 26px; height: 36px; border-radius: 2px">` : `<span style="width: 26px; height: 36px; border-radius: 2px; background: #2b3444"></span>`}<span style="font: 500 14px ${SANS}">${n}</span>${i === 0 ? `<span style="margin-left: auto; font: 600 11.5px ${MONO}; color: ${C.dim}">Enter</span>` : ''}</div>`).join('')}</div>` : ''}</div>`;
const iFotot = (html, text) => `<div style="display: flex; flex-direction: column; gap: 6px; flex: none"><span style="font: 700 10.5px ${MONO}; letter-spacing: 0.8px; color: ${C.dim}">${text}</span>${html}</div>`;
const fall = {
  A: { fraga: 'Is this Gorgon Flail?', under: 'Mesa’s best guess. It’s in the deck with a Check mark until you answer.', kalla: iFotot(remsa(F07, 870, 1030, 440, 80, 200), 'IN PHOTO 1'),
    losning: `<div style="display: flex; gap: 16px; align-items: flex-start"><img src="${bild('Gorgon Flail')}" alt="Gorgon Flail" style="width: 120px; height: 167px; border-radius: 7px; flex: none"><div style="display: flex; flex-direction: column; gap: 8px; min-width: 0">${pk(ik.check(13) + 'Yes, Gorgon Flail', 'prim')}${pk(ik.search(14) + 'No, search for it', 'sek')}</div></div>` },
  B: { fraga: 'Which of these is it?', under: 'Several cards fit about as well. Not in the deck until you pick.', kalla: iFotot(remsa(F07, 180, 490, 460, 80, 200), 'IN PHOTO 1'),
    losning: `<div style="display: flex; gap: 12px; flex-wrap: wrap">${[['Killing Glare', 'Killing Glare'], ['Killing Wave', null], ['Kill Shot', null]].map(([n, b], i) => `<button type="button" style="display: flex; flex-direction: column; gap: 6px; align-items: center; padding: 8px; border-radius: 10px; background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}; font: 600 13px ${SANS}; cursor: pointer">${b ? `<img src="${bild(b)}" alt="" style="width: 86px; height: 120px; border-radius: 5px">` : `<span style="width: 86px; height: 120px; border-radius: 5px; background: #2b3444"></span>`}${n}</button>`).join('')}</div>${pk(ik.search(14) + 'None of these, search', 'ghost', 'align-self: flex-start')}` },
  C: { fraga: 'Which card is this?', under: 'The name couldn’t be read. Type what you see on the card.', kalla: iFotot(remsa(F06, 795, 220, 420, 80, 200), 'IN PHOTO 2'),
    losning: sokF('Hoo', 'Type the card name', [['Hooded Blightfang', 'Hooded Blightfang'], ['Hooded Hydra', null], ['Hoodwink', null]]) },
  D: { fraga: 'No card is called “Pacifsim”', under: 'From your pasted list, line 15. Not in the deck until you pick.', kalla: iFotot(`<div style="width: 200px; padding: 10px 12px; box-sizing: border-box; border-radius: 6px; background: ${C.bg}; border: 1px solid ${C.line}; font: 500 13px ${MONO}; color: ${C.dim}">14 Night’s Whisper<br><span style="color: ${C.txt}; background: #3a2e14">1 Pacifsim</span><br>1 Pharika’s Chosen</div>`, 'IN YOUR LIST'),
    losning: `<div style="display: flex; flex-direction: column; gap: 8px"><span style="font: 500 13px ${SANS}; color: ${C.dim}">Did you mean</span><button type="button" style="display: flex; align-items: center; gap: 10px; padding: 6px 12px 6px 6px; border-radius: 10px; background: #2a200e; border: 1.5px solid ${C.acc}; color: ${C.txt}; font: 650 14px ${SANS}; cursor: pointer; align-self: flex-start"><img src="${bild('Pacifism')}" alt="" style="width: 30px; height: 42px; border-radius: 3px">Pacifism</button></div>${sokF('', 'Or search for another card')}` },
};
function granskare(v, bredd) {
  const smal = bredd < 900;
  const nav = `<div style="display: flex; align-items: center; gap: 8px"><button type="button" aria-label="Previous" style="width: 32px; height: 32px; border-radius: 8px; border: 1px solid ${C.line}; background: ${C.bg3}; color: ${C.dim}; display: grid; place-items: center; cursor: pointer; transform: scaleX(-1)">${ik.next(14)}</button><b style="font: 600 13px ${MONO}; color: ${C.dim}">1 of 3</b><button type="button" aria-label="Next" style="width: 32px; height: 32px; border-radius: 8px; border: 1px solid ${C.line}; background: ${C.bg3}; color: ${C.txt}; display: grid; place-items: center; cursor: pointer">${ik.next(14)}</button></div>`;
  const vy = (k) => `<sc-if value="{{${k}}}" hint-placeholder-val="{{${k === 'A'}}}"><div style="display: flex; ${smal ? 'flex-direction: column;' : ''} gap: 22px; align-items: flex-start">${fall[k].kalla}<div style="display: flex; flex-direction: column; gap: 12px; flex-grow: 1; min-width: 0"><div style="display: flex; flex-direction: column; gap: 4px"><b style="font: 700 19px ${SANS}">${fall[k].fraga}</b><span style="font: 400 13.5px/1.45 ${SANS}; color: ${C.dim}">${fall[k].under}</span></div>${fall[k].losning}</div></div></sc-if>`;
  return `<section aria-label="Check names" style="display: flex; flex-direction: column; gap: 16px; padding: 18px 20px; border-radius: 14px; border: 1.5px solid #8a6a24; background: #17140e">`
    + `<div style="display: flex; align-items: center; gap: 12px"><i style="width: 9px; height: 9px; border-radius: 50%; background: ${C.acc}"></i><b style="font: 700 15px ${SANS}">Check names</b><span style="flex-grow: 1"></span>${nav}<button type="button" style="height: 32px; padding: 0 12px; border: 0; background: transparent; color: ${C.dim}; font: 600 13px ${SANS}; cursor: pointer">Later</button></div>`
    + ['A', 'B', 'C', 'D'].map(vy).join('')
    + `<div style="display: flex; align-items: center; gap: 10px; padding-top: 4px; border-top: 1px solid #3a2e14"><span style="font: 400 12.5px ${SANS}; color: ${C.dim}; padding-top: 10px">Answer and the next one opens by itself. <b style="color: ${C.txt}">Remove</b> takes the card out of the deck.</span><span style="flex-grow: 1"></span><button type="button" style="margin-top: 10px; height: 32px; padding: 0 10px; border: 0; background: transparent; color: #ff9aa2; font: 600 13px ${SANS}; display: flex; align-items: center; gap: 6px; cursor: pointer">${ik.trash(12)}Remove</button></div></section>`;
}
const FALL = { props: { case: { editor: 'enum', options: ['A · Close match', 'B · A few candidates', 'C · No name read', 'D · Not a card name (pasted list)'], default: 'A · Close match' } },
  logic: `const c = (this.props.case ?? 'A · Close match').charAt(0);\nreturn { A: c === 'A', B: c === 'B', C: c === 'C', D: c === 'D' };` };

export { fs, path, OUT, C, SANS, MONO, bild, F07, F06, F05, F15, CSS2, ik, knapp, kortRuta, sektion, basland, remsa, TYP, BLA, ROD, sida, t, stor, etik, pk, laggAnim, flikar, panelInre, panel, ansl, qr, vantar, tumme, fotoRadH, T07, fotoLitet, tk, textKnapp, sidan, kollBar, ALLA, grid, sokF, iFotot, fall, granskare, FALL };
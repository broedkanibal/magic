// "Mesa Deck Photo Flow E", version 2 (Jesper 2026-09-26):
// hela kamerabilden i stället för rutan; animationer som visar hur man gör; flödet i sitt sammanhang
// (lekens sida och uppstarten av ett spel, bredvid inklistring och inskrivning); riktiga foton;
// tydligt att man inte gör något på datorn medan man fotar; ny text utan tankstreck.
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), 'flowE', 'project');
fs.mkdirSync(OUT, { recursive: true });

const C = { bg: '#0d1015', bg2: '#141922', bg3: '#1b2230', bg4: '#232c3c', line: '#28313f', txt: '#e7ecf4', dim: '#9aa7ba', dim2: '#6f7d93',
  acc: '#f0a52a', blue: '#8aa4ff', green: '#57c785', ink: '#20160a' };
const SANS = '-apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Helvetica, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const LEK = 'New deck 3';

/* Jespers foton (uppladdade). Källkoordinater i bildens pixlar. */
const F = {
  f05: { url: '/_blob/76eb91fcf27b18b0729db1987519b62f', w: 1500, h: 2000 },
  f06: { url: '/_blob/714cb509a2ac4a5332f93ec8c05efd79', w: 1500, h: 2000 },
  f07: { url: '/_blob/f509599f99986704ae2c38e512a216b3', w: 1500, h: 2000 },
  f15: { url: '/_blob/8231520ba70b9480b86c09ae2e5b95a5', w: 2000, h: 1500 },
  f16: { url: '/_blob/c886ad6acccd5ab346b12a7129ead44d', w: 1500, h: 1125 },
};

/* ── delar ── */
const CSS = `
body{margin:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,sans-serif}
a{color:${C.acc}}a:hover{color:#ffc15a}
@keyframes laggIn{0%{opacity:0;transform:translateY(-46px) rotate(-5deg)}10%{opacity:1;transform:translateY(0) rotate(0)}82%{opacity:1;transform:none}94%,100%{opacity:0;transform:none}}
@keyframes pop{0%{opacity:0;transform:scale(0)}5%{opacity:1;transform:scale(1.25)}8%{transform:scale(1)}88%{opacity:1;transform:scale(1)}96%,100%{opacity:0}}
@keyframes tona{0%{opacity:0}8%,88%{opacity:1}96%,100%{opacity:0}}
@keyframes luta{0%,100%{transform:perspective(200px) rotateX(28deg)}40%,70%{transform:perspective(200px) rotateX(0deg)}}
@keyframes puls{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes mot{0%,15%{transform:translate(70px,40px) rotate(12deg);opacity:0}30%{opacity:1}55%,80%{transform:translate(0,0) rotate(0);opacity:1}100%{transform:translate(0,0);opacity:0}}
@keyframes glid{0%{opacity:0;transform:translateX(40px)}12%,100%{opacity:1;transform:none}}
@keyframes blixt{0%,70%{opacity:0}72%{opacity:.85}82%,100%{opacity:0}}
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
<style>${CSS}</style>
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
const ik = {
  check: (s = 14, sw = 2.6) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>`,
  camera: (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"></path><circle cx="12" cy="13" r="3.5"></circle></svg>`,
  phone: (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5"></rect><path d="M11 18.5h2"></path></svg>`,
  laptop: (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="11" rx="1.5"></rect><path d="M2 19h20"></path></svg>`,
  list: (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12"></path><circle cx="4" cy="6" r="1"></circle><circle cx="4" cy="12" r="1"></circle><circle cx="4" cy="18" r="1"></circle></svg>`,
  type: (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="M16 16l4.5 4.5"></path></svg>`,
  back: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"></path></svg>`,
  minus: (s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"></path></svg>`,
  plus: (s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12M12 6v12"></path></svg>`,
};
const tx = (t, o = '') => `<p style="margin: 0; font: 400 15px/1.5 ${SANS}; color: ${C.dim}; ${o}">${t}</p>`;
const h1 = (t, o = '') => `<h1 style="margin: 0; font: 750 30px/1.15 ${SANS}; letter-spacing: -0.4px; color: ${C.txt}; ${o}">${t}</h1>`;
const knapp = (t, typ = 'prim', o = '') => `<button type="button" style="height: 48px; padding: 0 24px; border-radius: 11px; font: 650 15.5px ${SANS}; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 9px; ${typ === 'prim' ? `background: ${C.acc}; color: ${C.ink}; border: 0` : typ === 'av' ? `background: ${C.bg4}; color: ${C.dim2}; border: 0` : `background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}`}; ${o}">${t}</button>`;
const tknapp = (t, typ = 'prim', ikon = '') => knapp(ikon + t, typ, 'height: 52px; width: 100%; font-size: 16px; border-radius: 12px');
const ring = (n, av, s = 132, farg) => {
  const sw = s > 100 ? 10 : 7, r = s / 2 - sw, om = 2 * Math.PI * r, del = Math.min(1, n / av);
  const f = farg || (n >= av ? C.green : C.acc);
  return `<div style="position: relative; width: ${s}px; height: ${s}px; flex: none"><svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" aria-hidden="true"><circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="${C.bg4}" stroke-width="${sw}"></circle><circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="${f}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${(om * del).toFixed(1)} ${om.toFixed(1)}" transform="rotate(-90 ${s / 2} ${s / 2})"></circle></svg><div style="position: absolute; left: 0; top: 0; width: ${s}px; height: ${s}px; display: flex; flex-direction: column; align-items: center; justify-content: center"><b style="font: 800 ${s > 100 ? 34 : s > 70 ? 24 : 16}px ${SANS}; letter-spacing: -0.5px; color: ${C.txt}">${n}</b><span style="font: 500 ${s > 100 ? 13 : 11}px ${SANS}; color: ${C.dim}">of ${av}</span></div></div>`;
};
/* Ett utsnitt ur ett foto: källrutan (sx, sy, sw, sh) visas dw bred. */
function utsnitt(f, sx, sy, sw, sh, dw, o = '') {
  const s = dw / sw, dh = Math.round(sh * s);
  return `<div style="position: relative; width: ${dw}px; height: ${dh}px; overflow: hidden; border-radius: 6px; flex: none; ${o}"><img src="${f.url}" alt="" style="position: absolute; left: ${Math.round(-sx * s)}px; top: ${Math.round(-sy * s)}px; width: ${Math.round(f.w * s)}px; height: ${Math.round(f.h * s)}px; max-width: none"></div>`;
}
/* Ett helt foto med markeringar ovanpå: rätt läst (bock), osäker (?), kapad vid kanten (skuggad). */
function markerat(f, dw, marks, o = {}) {
  const s = dw / f.w, dh = Math.round(f.h * s);
  const m = marks.map((mk, i) => {
    const x = Math.round(mk.x * s), y = Math.round(mk.y * s), w = Math.round(mk.w * s), h = Math.round(mk.h * s);
    const anim = o.anim ? `animation: pop 7s ${(0.25 * i).toFixed(2)}s infinite both;` : '';
    if (mk.t === 'kant') return `<div style="position: absolute; left: ${x}px; top: 0; width: ${w}px; height: ${dh}px; background: #0d1015b8; display: flex; align-items: center; justify-content: center; ${o.anim ? 'animation: tona 7s 0s infinite both;' : ''}"><span style="writing-mode: vertical-rl; font: 600 11px ${SANS}; color: #c7d0dd; letter-spacing: 0.3px">Cut off: next photo</span></div>`;
    const q = mk.t === 'q';
    return `<div style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; box-sizing: border-box; border-radius: 4px; border: 2px solid ${q ? C.acc : C.green}; ${anim}"><span style="position: absolute; right: -9px; top: -9px; width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; background: ${q ? C.acc : C.green}; color: ${C.ink}; font: 800 11px ${SANS}">${q ? '?' : ik.check(11, 3.4)}</span></div>`;
  }).join('');
  return `<div style="position: relative; width: ${dw}px; height: ${dh}px; border-radius: 10px; overflow: hidden; flex: none"><img src="${f.url}" alt="${o.alt || 'Photo of the cards'}" style="position: absolute; left: 0; top: 0; width: ${dw}px; height: ${dh}px">${m}</div>`;
}

/* Titelraderna i fotona (källpixlar), för markeringar och utsnitt. */
const T07 = [
  [215, 360, 420, 44], [200, 500, 420, 44], [185, 680, 420, 44], [230, 840, 420, 44], [230, 990, 420, 44], [235, 1165, 420, 44],
  [825, 395, 400, 44], [845, 535, 410, 44], [870, 725, 410, 44], [870, 850, 400, 44], [880, 1040, 410, 50], [910, 1200, 400, 44],
];
const T06 = [
  [110, 215, 430, 44], [150, 405, 430, 48], [115, 540, 430, 48], [110, 710, 430, 44], [130, 815, 440, 44], [135, 1020, 440, 44],
  [805, 230, 400, 48], [855, 370, 400, 44], [850, 555, 405, 48], [880, 700, 400, 44], [870, 850, 405, 48], [860, 1045, 400, 44],
];

/* ── telefonen ── */
function telefon(titel, kropp, fot, o = {}) {
  return sida(titel, 390, 844,
    `<div style="position: relative; width: 390px; height: 844px; box-sizing: border-box; background: ${C.bg}; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column; padding: 20px 18px 22px; gap: 16px; overflow: hidden">`
    + `<div style="display: flex; flex-direction: column; gap: 16px; flex-grow: 1; min-height: 0">${kropp}</div>`
    + (fot ? `<div style="display: flex; flex-direction: column; gap: 10px">${fot}</div>` : '')
    + `</div>`, o);
}
const ansluten = `<span style="display: flex; align-items: center; gap: 8px; font: 600 13.5px ${SANS}; color: ${C.green}"><i style="width: 8px; height: 8px; border-radius: 50%; background: ${C.green}"></i>Connected to your computer</span>`;

/* ── datorn ── */
const STEG = ['Set up', 'Photograph', 'Check cards', 'Basic lands', 'Confirm'];
function stegRad(aktiv) {
  return `<nav aria-label="Steps" style="display: flex; align-items: center; gap: 14px; padding: 0 40px; height: 64px; border-bottom: 1px solid ${C.line}; flex: none">${STEG.map((t, i) => {
    const klar = i < aktiv, nu = i === aktiv;
    const n = klar ? `background: #0f2016; border: 1px solid #2f6b47; color: #8fe0b0` : nu ? `background: ${C.acc}; border: 1px solid ${C.acc}; color: ${C.ink}` : `border: 1px solid #39445a; color: ${C.dim2}`;
    return (i ? `<i style="flex-grow: 1; height: 1.5px; background: ${klar ? '#2f6b47' : C.line}; max-width: 90px"></i>` : '')
      + `<span style="display: flex; align-items: center; gap: 10px; font: ${nu ? 700 : 600} 15px ${SANS}; color: ${nu ? C.txt : klar ? C.dim : C.dim2}; white-space: nowrap"><span style="width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font: 700 12.5px ${MONO}; flex: none; ${n}">${klar ? ik.check(13, 3) : i + 1}</span>${t}</span>`;
  }).join('')}<span style="flex-grow: 1"></span></nav>`;
}
/* Sammanhanget syns i huvudet: lekens sida eller uppstarten av ett spel (Tweaks på E1 och E9). */
const KONTEXT = { props: { from: { editor: 'enum', options: ['Deck page', 'Game setup'], default: 'Deck page' } }, logic: `const f = this.props.from ?? 'Deck page';\nreturn { lek: f === 'Deck page', spel: f === 'Game setup' };` };
function dator(titel, aktiv, kropp, fot, o = {}) {
  const var_ = o.kontext
    ? `<sc-if value="{{lek}}" hint-placeholder-val="{{true}}"><span style="font: 500 14px ${SANS}; color: ${C.dim}">Decks</span><span style="color: ${C.dim2}">›</span><span style="font: 600 14px ${SANS}">${LEK}</span></sc-if><sc-if value="{{spel}}" hint-placeholder-val="{{false}}"><span style="font: 500 14px ${SANS}; color: ${C.dim}">Game setup</span><span style="color: ${C.dim2}">›</span><span style="font: 600 14px ${SANS}">${LEK}</span></sc-if>`
    : `<span style="font: 500 14px ${SANS}; color: ${C.dim}">Decks</span><span style="color: ${C.dim2}">›</span><span style="font: 600 14px ${SANS}">${LEK}</span>`;
  const stang = o.kontext
    ? `<sc-if value="{{lek}}" hint-placeholder-val="{{true}}">${knapp('Back to the deck', 'sek', 'height: 36px; padding: 0 14px; font-size: 13.5px')}</sc-if><sc-if value="{{spel}}" hint-placeholder-val="{{false}}">${knapp('Back to game setup', 'sek', 'height: 36px; padding: 0 14px; font-size: 13.5px')}</sc-if>`
    : knapp(aktiv === 0 ? 'Cancel' : 'Stop and keep what’s read', 'sek', 'height: 36px; padding: 0 14px; font-size: 13.5px');
  return sida(titel, 1440, 900,
    `<div style="width: 1440px; height: 900px; box-sizing: border-box; background: ${C.bg}; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column">`
    + `<header style="height: 56px; flex: none; display: flex; align-items: center; gap: 12px; padding: 0 24px; border-bottom: 1px solid ${C.line}; background: ${C.bg2}"><b style="font: 800 17px ${SANS}; letter-spacing: 0.3px; color: ${C.acc}; padding-right: 8px">Mesa</b>${var_}<span style="color: ${C.dim2}">›</span><span style="font: 600 14px ${SANS}; color: ${C.dim}">Add cards with your phone</span><span style="flex-grow: 1"></span>${stang}</header>`
    + stegRad(aktiv)
    + `<main style="flex-grow: 1; min-height: 0; box-sizing: border-box; padding: 32px 40px; display: flex; gap: 36px">${kropp}</main>`
    + `<footer style="height: 76px; flex: none; box-sizing: border-box; display: flex; align-items: center; gap: 16px; padding: 0 40px; border-top: 1px solid ${C.line}; background: ${C.bg2}">${fot}</footer>`
    + `</div>`, o.kontext ? KONTEXT : o);
}
const sidopanel = (inner) => `<aside style="width: 290px; flex: none; display: flex; flex-direction: column; gap: 12px; align-items: flex-start; padding: 22px; border-radius: 14px; background: ${C.bg2}; border: 1px solid ${C.line}; box-sizing: border-box; align-self: flex-start">${inner}</aside>`;

const filer = {};
const skriv = (n, h) => { filer[n] = h; };

/* ══ X1 · Lekens sida: tre sätt att lägga till kort ═══════════════════ */
const satt = (ikon, titel, text, cta, huvud) => `<article style="flex: 1 1 0; display: flex; flex-direction: column; gap: 14px; padding: 26px; border-radius: 16px; box-sizing: border-box; ${huvud ? `background: #1d1810; border: 1.5px solid #8a6a24` : `background: ${C.bg2}; border: 1px solid ${C.line}`}"><span style="width: 48px; height: 48px; border-radius: 12px; display: grid; place-items: center; background: ${huvud ? '#2a200e' : C.bg3}; color: ${huvud ? C.acc : C.txt}">${ikon}</span><h2 style="margin: 0; font: 700 20px ${SANS}">${titel}</h2>${tx(text, 'font-size: 14.5px; flex-grow: 1')}${knapp(cta, huvud ? 'prim' : 'sek', 'align-self: flex-start')}</article>`;
skriv('X1.dc.html', sida('X1: deck page, three ways to add cards', 1440, 900,
  `<div style="width: 1440px; height: 900px; box-sizing: border-box; background: ${C.bg}; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column">`
  + `<header style="height: 56px; flex: none; display: flex; align-items: center; gap: 12px; padding: 0 24px; border-bottom: 1px solid ${C.line}; background: ${C.bg2}"><b style="font: 800 17px ${SANS}; color: ${C.acc}; padding-right: 8px">Mesa</b><span style="font: 500 14px ${SANS}; color: ${C.dim}">Decks</span><span style="color: ${C.dim2}">›</span><span style="font: 600 14px ${SANS}">${LEK}</span></header>`
  + `<main style="flex-grow: 1; box-sizing: border-box; padding: 48px 80px; display: flex; flex-direction: column; gap: 28px">`
  + `<div style="display: flex; align-items: baseline; gap: 16px"><h1 style="margin: 0; font: 750 34px ${SANS}; letter-spacing: -0.5px">${LEK}</h1><span style="font: 600 15px ${MONO}; color: ${C.dim}">0 cards</span></div>`
  + `<div style="display: flex; flex-direction: column; gap: 6px"><h2 style="margin: 0; font: 700 22px ${SANS}">Add cards</h2>${tx('Pick a way to start. You can mix them: photograph most of the deck, then type the last few.')}</div>`
  + `<div style="display: flex; gap: 20px">`
  + satt(ik.camera(26), 'Photograph the cards', 'Lay the cards on a table and take photos with your phone. The quickest way when the deck is in front of you.', 'Start with your phone', true)
  + satt(ik.list(26), 'Paste a list', 'From Moxfield, Arena, MTGO or a text file. One card per line.', 'Paste a list')
  + satt(ik.type(26), 'Type card names', 'Search for a card and add it. Good for the last few cards.', 'Type names')
  + `</div></main></div>`));

/* ══ X2 · Uppstarten av ett spel: samma tre sätt, i panelen ═══════════ */
skriv('X2.dc.html', sida('X2: game setup, new deck', 1440, 900,
  `<div style="position: relative; width: 1440px; height: 900px; box-sizing: border-box; background: #1a2a22; color: ${C.txt}; font-family: ${SANS}; overflow: hidden">`
  + `<div style="position: absolute; inset: 0; background: #0d1015cc"></div>`
  + `<aside style="position: absolute; left: 24px; top: 24px; bottom: 24px; width: 470px; box-sizing: border-box; padding: 26px; border-radius: 18px; background: ${C.bg2}; border: 1px solid #333e50; display: flex; flex-direction: column; gap: 18px">`
  + `<div style="display: flex; flex-direction: column; gap: 4px"><span style="font: 600 12px ${MONO}; letter-spacing: 0.6px; color: ${C.dim}">GAME SETUP</span><h1 style="margin: 0; font: 750 24px ${SANS}">Get ready for the game</h1></div>`
  + `<ol style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px">`
  + `<li style="display: flex; flex-direction: column; gap: 14px; padding: 18px; border-radius: 14px; background: #1d1810; border: 1.5px solid #8a6a24"><div style="display: flex; gap: 12px; align-items: center"><span style="width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: ${C.acc}; color: ${C.ink}; font: 700 12.5px ${MONO}">1</span><b style="font: 700 17px ${SANS}">Your deck</b></div>`
  + `<div style="display: flex; flex-direction: column; gap: 8px">${['Boros Burn · 60 cards', 'Gorgons and Knights · 40 cards'].map(t => `<button type="button" style="text-align: left; height: 46px; padding: 0 14px; border-radius: 10px; background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}; font: 600 14.5px ${SANS}; cursor: pointer">${t}</button>`).join('')}</div>`
  + `<div style="display: flex; flex-direction: column; gap: 10px; padding-top: 6px; border-top: 1px solid #3a2e14"><b style="font: 650 15px ${SANS}; padding-top: 10px">Or make a new deck</b>`
  + `<button type="button" style="display: flex; gap: 12px; align-items: center; text-align: left; padding: 12px 14px; border-radius: 10px; background: ${C.acc}; color: ${C.ink}; border: 0; cursor: pointer"><span style="flex: none">${ik.camera(22)}</span><span style="display: flex; flex-direction: column; gap: 2px"><b style="font: 700 15px ${SANS}">Photograph the cards</b><span style="font: 500 13px ${SANS}">With your phone</span></span></button>`
  + `<div style="display: flex; gap: 8px">${knapp(ik.list(18) + 'Paste a list', 'sek', 'flex: 1 1 0; height: 44px; font-size: 14px; padding: 0 12px')}${knapp(ik.type(18) + 'Type names', 'sek', 'flex: 1 1 0; height: 44px; font-size: 14px; padding: 0 12px')}</div>`
  + `<span style="font: 400 13.5px/1.45 ${SANS}; color: ${C.dim}">The same steps as on the deck page. When the deck is confirmed, you come back here.</span></div></li>`
  + ['Your camera', 'Graveyard and library', 'Invite your friends'].map((t, i) => `<li style="display: flex; gap: 12px; align-items: center; padding: 14px 18px; border-radius: 12px; border: 1px solid ${C.line}"><span style="width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; border: 1px solid #39445a; color: ${C.dim2}; font: 700 12.5px ${MONO}">${i + 2}</span><span style="font: 600 15px ${SANS}; color: ${C.dim}">${t}</span></li>`).join('')
  + `</ol></aside></div>`));

/* ══ E1 · Set up (datorn) ══════════════════════════════════════════ */
const fraga = (nr, titel, hjalp, inner) => `<section style="display: flex; gap: 18px; align-items: flex-start"><span style="width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; flex: none; background: ${C.bg3}; border: 1px solid #39445a; font: 700 14px ${MONO}">${nr}</span><div style="display: flex; flex-direction: column; gap: 12px; flex-grow: 1"><div style="display: flex; flex-direction: column; gap: 4px"><h2 style="margin: 0; font: 700 20px ${SANS}">${titel}</h2><span style="font: 400 14.5px/1.45 ${SANS}; color: ${C.dim}">${hjalp}</span></div>${inner}</div></section>`;
const antalVal = `<div role="radiogroup" aria-label="Cards in the deck" style="display: flex; gap: 10px; align-items: center">${['40', '60', '100', 'Other…'].map((t, i) => `<button type="button" role="radio" aria-checked="${i === 0}" style="height: 48px; min-width: 76px; padding: 0 18px; border-radius: 11px; font: 650 16px ${SANS}; cursor: pointer; ${i === 0 ? `background: #2a200e; border: 1.5px solid ${C.acc}; color: ${C.acc}` : `background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}`}">${t}</button>`).join('')}<a href="#" style="font: 600 14px ${SANS}; padding-left: 10px">Skip, I’m not sure</a></div>`;
const landVal = (vald, titel, under) => `<label style="flex: 1 1 0; display: flex; gap: 14px; align-items: flex-start; padding: 16px 18px; border-radius: 12px; cursor: pointer; ${vald ? `background: #2a200e; border: 1.5px solid ${C.acc}` : `background: ${C.bg2}; border: 1px solid ${C.line}`}"><input type="radio" name="basland" ${vald ? 'checked' : ''} style="width: 20px; height: 20px; margin: 2px 0 0; accent-color: ${C.acc}; flex: none"><span style="display: flex; flex-direction: column; gap: 4px"><b style="font: 650 16px ${SANS}">${titel}</b><span style="font: 400 14px/1.4 ${SANS}; color: ${C.dim}">${under}</span></span></label>`;
const qr = (() => {
  let s = ''; const n = 25, c = 7;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const ax = x >= n - 7 ? x - (n - 7) : x, ay = y >= n - 7 ? y - (n - 7) : y;
    const hörn = (x < 7 || x >= n - 7) && (y < 7 || y >= n - 7) && !(x >= n - 7 && y >= n - 7);
    const fylld = hörn ? (ax === 0 || ay === 0 || ax === 6 || ay === 6 || (ax >= 2 && ax <= 4 && ay >= 2 && ay <= 4)) : ((x * 7 + y * 13 + x * y) % 5) < 2;
    if (fylld) s += `<rect x="${x * c}" y="${y * c}" width="${c}" height="${c}"></rect>`;
  }
  return `<svg width="${n * c}" height="${n * c}" viewBox="0 0 ${n * c} ${n * c}" fill="#0d1015" role="img" aria-label="Code to scan with the phone">${s}</svg>`;
})();
skriv('Main.dc.html', dator('E1: set up on the computer', 0,
  `<div style="flex-grow: 1; display: flex; flex-direction: column; gap: 30px; min-width: 0; max-width: 830px">`
  + `<div style="display: flex; flex-direction: column; gap: 8px">${h1('Add cards with your phone')}${tx('Answer two questions and scan the code. Your phone takes the photos. You check and confirm everything here on the computer.', 'font-size: 16px')}</div>`
  + fraga(1, 'How many cards should the deck have?', 'Mesa shows how many are left while you photograph.', antalVal)
  + fraga(2, 'How do you want to add basic lands?', 'Basic lands are Plains, Island, Swamp, Mountain and Forest.',
    `<div role="radiogroup" style="display: flex; gap: 12px">${landVal(true, 'Photograph them with the other cards', 'Mesa counts them from the photos.')}${landVal(false, 'Type how many at the end', 'Leave them out of the photos. Quicker when you have many.')}</div><span style="font: 400 13.5px ${SANS}; color: ${C.dim2}">Either way, you can change the numbers at the end.</span>`)
  + `</div>`
  + `<section style="width: 330px; flex: none; display: flex; flex-direction: column; gap: 16px; padding: 24px; border-radius: 16px; background: ${C.bg2}; border: 1px solid ${C.line}; box-sizing: border-box; align-self: flex-start">`
  + `<div style="display: flex; gap: 12px; align-items: center"><span style="width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; flex: none; background: ${C.acc}; color: ${C.ink}; font: 700 14px ${MONO}">3</span><h2 style="margin: 0; font: 700 20px ${SANS}">Scan with your phone</h2></div>`
  + `<div style="position: relative; align-self: center; padding: 14px; background: #f4f1ea; border-radius: 12px">${qr}<span style="position: absolute; right: -26px; bottom: -22px; width: 58px; height: 96px; border-radius: 12px; background: #1b2230; border: 3px solid #cfd6e2; animation: mot 4.5s ease-in-out infinite; box-shadow: 0 8px 20px #0008"></span></div>`
  + `<span style="font: 400 14.5px/1.45 ${SANS}; color: ${C.dim}">Point your phone’s camera at the code and tap the link that appears.</span>`
  + `<span style="display: flex; align-items: center; gap: 9px; font: 600 14px ${SANS}; color: ${C.txt}"><i style="width: 9px; height: 9px; border-radius: 50%; background: ${C.acc}; animation: puls 1.6s ease-in-out infinite"></i>Waiting for your phone</span></section>`,
  `<span style="font: 500 14.5px ${SANS}; color: ${C.dim}">The next step starts as soon as your phone connects.</span><span style="flex-grow: 1"></span>`,
  { kontext: true }));

/* ══ E2 · Telefonen: lägg ut korten (animerat med riktiga kort) ═══════ */
{
  const s = 150 / 570;
  const vK = [[310, 450], [440, 615], [610, 780], [770, 930], [915, 1090], [1085, 1560]];
  const hK = [[330, 470], [460, 650], [640, 790], [785, 975], [970, 1135], [1125, 1790]];
  const kolumn = (x0, band, fordrojning) => band.map(([y0, y1], i) => `<div style="position: absolute; left: 0; top: ${Math.round((y0 - band[0][0]) * s)}px; animation: laggIn 9s ${(fordrojning + i * 0.55).toFixed(2)}s infinite both; z-index: ${i + 1}">${utsnitt(F.f07, x0, y0, 570, y1 - y0, 150, 'border-radius: 5px; box-shadow: 0 4px 10px #0007')}</div>`).join('');
  const hojd = Math.round((1560 - 310) * s);
  skriv('E2.dc.html', telefon('E2: phone, lay out the cards',
    ansluten
    + `<div style="display: flex; flex-direction: column; gap: 6px"><span style="font: 600 12px ${MONO}; letter-spacing: 0.6px; color: ${C.dim}">PHOTO 1</span><h1 style="margin: 0; font: 750 28px/1.15 ${SANS}; letter-spacing: -0.4px">Lay out 10 to 15 cards</h1></div>`
    + `<div style="position: relative; height: ${hojd + 24}px; border-radius: 12px; background: #7a4a22; overflow: hidden"><div style="position: absolute; left: 22px; top: 12px; width: 150px; height: ${hojd}px">${kolumn(150, vK, 0)}</div><div style="position: absolute; left: 196px; top: 12px; width: 150px; height: ${hojd}px">${kolumn(780, hK, 3.3)}</div></div>`
    + `<ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px">${[['In columns, overlapping', ''], ['Only the name line needs to show', ''], ['Basic lands too', 'You chose to photograph them.']].map(([t, u]) => `<li style="display: flex; gap: 12px; align-items: flex-start"><span style="color: ${C.green}; flex: none; padding-top: 2px">${ik.check(16, 2.6)}</span><span style="display: flex; flex-direction: column; gap: 2px"><b style="font: 650 15px ${SANS}">${t}</b>${u ? `<span style="font: 400 13.5px ${SANS}; color: ${C.dim}">${u}</span>` : ''}</span></li>`).join('')}</ul>`,
    tknapp('Open camera', 'prim', ik.camera())));
}

/* ══ E3 · Kameran: hela bilden, ingen ruta ═══════════════════════════ */
{
  const dh = 844, dw = Math.round(1500 * dh / 2000), off = Math.round((dw - 390) / 2);
  skriv('E3.dc.html', telefon('E3: phone, the camera uses the whole picture',
    `<div style="position: absolute; left: 0; top: 0; width: 390px; height: 844px; overflow: hidden; background: #000">`
    + `<img src="${F.f07.url}" alt="The camera view of two columns of cards" style="position: absolute; left: ${-off}px; top: 0; width: ${dw}px; height: ${dh}px; max-width: none">`
    + `<div style="position: absolute; left: 0; top: 0; width: 390px; height: 844px; background: #fff; animation: blixt 6s ease-out infinite; pointer-events: none"></div>`
    + `<div style="position: absolute; left: 16px; right: 16px; top: 18px; display: flex; justify-content: space-between; align-items: center"><span style="padding: 8px 12px; border-radius: 99px; background: #0d1015d9; font: 650 14px ${SANS}">Photo 1</span><span style="padding: 8px 12px; border-radius: 99px; background: #0d1015d9; font: 650 14px ${SANS}">0 of 40</span></div>`
    + `<div style="position: absolute; left: 16px; right: 16px; top: 70px; display: flex; gap: 12px; align-items: center; padding: 12px 14px; border-radius: 14px; background: #0d1015d9"><span style="width: 34px; height: 34px; display: grid; place-items: center; color: ${C.txt}; animation: luta 3s ease-in-out infinite; flex: none">${ik.phone(28)}</span><span style="display: flex; flex-direction: column; gap: 2px"><b style="font: 650 14.5px ${SANS}">Hold the phone straight above the cards</b><span style="font: 400 13px ${SANS}; color: #c7d0dd">The whole picture is read. Get all the names in.</span></span></div>`
    + `<div style="position: absolute; left: 16px; right: 16px; bottom: 132px; text-align: center; font: 500 13.5px/1.45 ${SANS}; color: #e2e7ef; text-shadow: 0 1px 3px #000">Cards cut off at the edge are skipped.<br>Take them in the next photo.</div>`
    + `<div style="position: absolute; left: 0; right: 0; bottom: 30px; display: flex; align-items: center; justify-content: space-between; padding: 0 36px"><button type="button" style="border: 0; background: transparent; color: ${C.txt}; font: 600 16px ${SANS}; cursor: pointer; width: 70px; text-align: left; text-shadow: 0 1px 3px #000">Back</button><button type="button" aria-label="Take photo" style="width: 78px; height: 78px; border-radius: 50%; background: #fff; border: 5px solid #ffffff66; background-clip: padding-box; cursor: pointer"></button><span style="width: 70px"></span></div>`
    + `</div>`, null));
}

/* ══ E4 · Fotot är läst: bockar poppar fram, ett kort är osäkert ══════ */
{
  const marks = T07.map(([x, y, w, h], i) => ({ x, y, w, h, t: i === 10 ? 'q' : 'ok' }))
    .concat([{ t: 'kant', x: 0, y: 0, w: 150, h: 2000 }, { t: 'kant', x: 1395, y: 0, w: 105, h: 2000 }]);
  skriv('E4.dc.html', telefon('E4: phone, photo 1 read',
    `<div style="display: flex; gap: 14px; align-items: center">${ring(12, 40, 78)}<div style="display: flex; flex-direction: column; gap: 3px"><span style="display: flex; align-items: center; gap: 6px; font: 650 13.5px ${SANS}; color: ${C.green}">${ik.check(15, 2.8)}Photo 1 read</span><b style="font: 750 26px ${SANS}; letter-spacing: -0.4px">12 cards</b><span style="font: 500 13.5px ${SANS}; color: ${C.dim}">28 left to photograph</span></div></div>`
    + markerat(F.f07, 354, marks, { anim: true })
    + `<div style="display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border-radius: 12px; background: ${C.bg2}; border: 1px solid ${C.line}"><span style="width: 22px; height: 22px; border-radius: 50%; background: ${C.acc}; color: ${C.ink}; display: grid; place-items: center; font: 800 13px ${SANS}; flex: none">?</span><span style="display: flex; flex-direction: column; gap: 2px"><b style="font: 650 14.5px ${SANS}">1 name to check later</b><span style="font: 400 13.5px/1.4 ${SANS}; color: ${C.dim}">Nothing to fix now. You check it on the computer after the last photo.</span></span></div>`,
    tknapp('Take the next photo', 'prim', ik.camera()) + tknapp('That was the last photo', 'sek')));
}

/* ══ E5 · Telefonen är klar ═════════════════════════════════════════ */
skriv('E5.dc.html', telefon('E5: phone, continue on the computer',
  `<div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; padding-top: 110px">`
  + `<span style="width: 76px; height: 76px; border-radius: 50%; display: grid; place-items: center; background: #101a2e; border: 1px solid #2a3a66; color: #b9c8ff">${ik.laptop(36)}</span>`
  + `<h1 style="margin: 0; font: 750 26px/1.2 ${SANS}; letter-spacing: -0.3px">Continue on the computer</h1>`
  + tx('4 photos, 40 cards. Check the 3 marked cards and confirm the deck on the computer.', 'font-size: 16px; max-width: 300px')
  + `<span style="font: 500 14px ${SANS}; color: ${C.dim2}; padding-top: 6px">You can put the phone down.</span></div>`,
  tknapp('Take another photo', 'sek', ik.camera())));

/* ══ E6 · Datorn medan man fotar: inget att göra här ══════════════════ */
const fotoKort = (f, sx, sy, sw, sh, dw, etikett, under, ny) => `<figure style="margin: 0; display: flex; flex-direction: column; gap: 8px; ${ny ? 'animation: glid 5s ease-out infinite;' : ''}">${utsnitt(f, sx, sy, sw, sh, dw, 'border-radius: 10px')}<figcaption style="display: flex; flex-direction: column; gap: 2px"><b style="font: 650 14.5px ${SANS}">${etikett}</b><span style="font: 500 13px ${SANS}; color: ${C.dim}">${under}</span></figcaption></figure>`;
skriv('E6.dc.html', dator('E6: computer, while you photograph', 1,
  `<div style="flex-grow: 1; display: flex; flex-direction: column; gap: 22px; min-width: 0">`
  + `<div style="display: flex; flex-direction: column; gap: 8px">${h1('Take the photos with your phone')}${tx('Each photo shows up here when it’s read.', 'font-size: 16px')}</div>`
  + `<div style="display: flex; gap: 14px; align-items: center; padding: 14px 18px; border-radius: 12px; background: #101a2e; border: 1px solid #2a3a66; color: #c9d5ff"><span style="flex: none">${ik.phone(22)}</span><span style="font: 500 15px/1.45 ${SANS}"><b>Nothing to do here while you photograph.</b> Cards Mesa isn’t sure of wait for the next step.</span></div>`
  + `<div style="display: flex; gap: 22px; align-items: flex-start">`
  + fotoKort(F.f07, 150, 300, 1250, 1500, 250, 'Photo 1', '12 cards · 1 to check')
  + fotoKort(F.f06, 60, 160, 1320, 1580, 250, 'Photo 2', '12 cards · 1 to check', true)
  + `<div style="width: 250px; height: 300px; box-sizing: border-box; border: 2px dashed #39445a; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; padding: 20px; color: ${C.dim}">${ik.camera(28)}<b style="font: 650 15px ${SANS}; color: ${C.txt}">Photo 3</b><span style="font: 400 13.5px/1.4 ${SANS}">Lay out the next cards and take it with your phone.</span></div>`
  + `</div></div>`
  + sidopanel(`${ring(24, 40)}<b style="font: 700 17px ${SANS}">16 left to photograph</b><span style="font: 400 13.5px/1.45 ${SANS}; color: ${C.dim}">2 cards to check after the last photo.</span>`),
  `<span style="font: 500 14.5px ${SANS}; color: ${C.dim}">Photographed all the cards? Press the button here or on the phone.</span><span style="flex-grow: 1"></span>${knapp('Continue: Check cards')}`));

/* ══ E7 · Kolla korten: riktiga utsnitt, en fråga per kort ═══════════ */
const rad = (o) => `<div style="display: flex; gap: 22px; align-items: center; padding: 18px 20px; border-radius: 14px; ${o.klar ? `background: ${C.bg2}; border: 1px solid ${C.line}` : o.aktiv ? `background: #1d1810; border: 1.5px solid #8a6a24` : `background: ${C.bg2}; border: 1px solid ${C.line}`}">`
  + `<b style="width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; flex: none; font: 700 12.5px ${MONO}; ${o.klar ? `background: #0f2016; border: 1px solid #2f6b47; color: #8fe0b0` : `border: 1px solid #5a4a28; color: ${C.acc}`}">${o.klar ? ik.check(13, 3) : o.nr}</b>`
  + `<div style="display: flex; flex-direction: column; gap: 5px; flex: none"><span style="font: 600 10.5px ${MONO}; color: ${C.dim}">${o.kalla}</span>${o.bild}</div>`
  + `<div style="display: flex; flex-direction: column; gap: 4px; flex-grow: 1; min-width: 0"><span style="font: 600 11.5px ${MONO}; letter-spacing: 0.6px; color: ${o.klar ? C.green : C.acc}">${o.typ}</span><b style="font: 700 18px ${SANS}">${o.fraga}</b><span style="font: 400 14px/1.4 ${SANS}; color: ${C.dim}">${o.under}</span></div>`
  + `<div style="display: flex; gap: 10px; flex: none; align-items: center">${o.knappar}</div></div>`;
skriv('E7.dc.html', dator('E7: computer, check cards', 2,
  `<div style="flex-grow: 1; display: flex; flex-direction: column; gap: 16px; min-width: 0">`
  + `<div style="display: flex; flex-direction: column; gap: 8px">${h1('Check 3 cards')}${tx('Mesa wasn’t sure about these. Everything else from the photos is already in the deck.', 'font-size: 16px')}</div>`
  + rad({ nr: 1, klar: true, kalla: 'PHOTO 4', bild: utsnitt(F.f15, 950, 165, 410, 80, 280), typ: 'DONE', fraga: 'Venomous Hierophant', under: 'You confirmed the name.', knappar: `<button type="button" style="border: 0; background: transparent; color: ${C.dim}; font: 600 14px ${SANS}; cursor: pointer">Undo</button>` })
  + rad({ nr: 2, aktiv: true, kalla: 'PHOTO 1', bild: utsnitt(F.f07, 870, 1030, 440, 80, 280), typ: 'NOT SURE OF THE NAME', fraga: 'Is this Gorgon Flail?', under: 'The name line was at an angle.', knappar: `${knapp('Yes, Gorgon Flail', 'prim', 'height: 44px')}${knapp('No, pick the card', 'sek', 'height: 44px')}` })
  + rad({ nr: 3, kalla: 'PHOTO 2', bild: utsnitt(F.f06, 795, 220, 420, 80, 280), typ: 'COULDN’T READ THE NAME', fraga: 'Which card is this?', under: 'Type the name you see.', knappar: `<label style="display: flex; flex-direction: column; gap: 4px"><span style="font: 500 12px ${SANS}; color: ${C.dim}">Card name</span><input type="text" placeholder="Card name" style="width: 220px; height: 44px; box-sizing: border-box; border-radius: 10px; border: 1px solid ${C.line}; background: ${C.bg}; color: ${C.txt}; font: 500 15px ${SANS}; padding: 0 12px"></label>` })
  + `</div>`
  + sidopanel(`${ring(40, 40)}<b style="font: 700 17px ${SANS}">40 cards read</b><span style="font: 400 13.5px/1.45 ${SANS}; color: ${C.dim}">2 left to check. The count stays the same, only the names change.</span>`),
  `${knapp('Back', 'sek')}<span style="flex-grow: 1"></span><span style="font: 500 14px ${SANS}; color: ${C.dim}">2 left to check</span>${knapp('Continue: Basic lands', 'av')}`));

/* ══ E8 · Basländer ═════════════════════════════════════════════════ */
const steg = (namn, n) => `<div style="display: flex; align-items: center; gap: 12px; padding: 8px 0"><span style="flex-grow: 1; font: 500 16px ${SANS}">${namn}</span><button type="button" aria-label="Fewer ${namn}" style="width: 44px; height: 44px; border-radius: 10px; background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}; display: grid; place-items: center; cursor: pointer">${ik.minus()}</button><b style="width: 34px; text-align: center; font: 700 18px ${MONO}">${n}</b><button type="button" aria-label="More ${namn}" style="width: 44px; height: 44px; border-radius: 10px; background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}; display: grid; place-items: center; cursor: pointer">${ik.plus()}</button></div>`;
const landRad = (namn, n, info, gron) => `<div style="display: flex; align-items: center; gap: 20px; padding: 4px 0; border-bottom: 1px solid ${C.line}"><div style="flex-grow: 1">${steg(namn, n)}</div><span style="width: 200px; font: 500 14px ${SANS}; color: ${gron ? C.green : C.dim2}">${info}</span></div>`;
const e8Foto = `<div style="flex-grow: 1; display: flex; flex-direction: column; gap: 18px; min-width: 0; max-width: 760px"><div style="display: flex; flex-direction: column; gap: 8px">${h1('Basic lands')}${tx('Counted from your photos. Change a number if it’s wrong.', 'font-size: 16px')}</div><div style="display: flex; flex-direction: column">${landRad('Plains', 7, '7 in the photos', true)}${landRad('Swamp', 7, '7 in the photos', true)}${landRad('Island', 0, 'None in the photos')}${landRad('Mountain', 0, 'None in the photos')}${landRad('Forest', 0, 'None in the photos')}</div></div>`;
const e8Typ = `<div style="flex-grow: 1; display: flex; flex-direction: column; gap: 18px; min-width: 0; max-width: 760px"><div style="display: flex; flex-direction: column; gap: 8px">${h1('How many basic lands?')}${tx('You chose to type them. Mesa fills in the rest of the deck from the photos.', 'font-size: 16px')}</div><div style="display: flex; flex-direction: column">${landRad('Plains', 7, '')}${landRad('Swamp', 7, '')}${landRad('Island', 0, '')}${landRad('Mountain', 0, '')}${landRad('Forest', 0, '')}</div></div>`;
skriv('E8.dc.html', dator('E8: computer, basic lands', 3,
  `<sc-if value="{{foto}}" hint-placeholder-val="{{true}}">${e8Foto}</sc-if><sc-if value="{{typ}}" hint-placeholder-val="{{false}}">${e8Typ}</sc-if><span style="flex-grow: 1"></span>`
  + sidopanel(`${ring(40, 40)}<b style="font: 700 17px ${SANS}; color: #8fe0b0">It adds up</b><span style="font: 400 13.5px/1.45 ${SANS}; color: ${C.dim}">26 cards and 14 basic lands make 40.</span>`),
  `${knapp('Back', 'sek')}<span style="flex-grow: 1"></span>${knapp('Continue: Confirm')}`,
  { props: { lands: { editor: 'enum', options: ['Photographed', 'Typed'], default: 'Photographed' } }, logic: `const b = this.props.lands ?? 'Photographed';\nreturn { foto: b === 'Photographed', typ: b === 'Typed' };` }));

/* ══ E9 · Bekräfta: lägg till, ändra, ta bort ═══════════════════════ */
const typer = [
  ['Creatures', ['Aphelia, Viper Whisperer', 'Danitha Capashen, Paragon', 'Faithful Pikemaster', 'Fencing Ace', 'Flutterfox', 'Hooded Blightfang', 'Militant Inquisitor', 'Pharika’s Chosen', 'Scourge of the Undercity', 'Serpent Assassin', 'Trusty Retriever', 'Ukud Cobra', 'Venomous Hierophant', 'Vraska’s Finisher']],
  ['Instants and sorceries', ['Coat with Venom', 'Killing Glare', 'Night’s Whisper', 'Resistance Reunited']],
  ['Artifacts and enchantments', ['Ancestral Blade', 'Gorgon Flail', 'Maul of the Skyclaves', 'Mirran Bardiche', 'Pacifism', 'Valkyrie’s Sword']],
  ['Lands', ['Thriving Heath', 'Thriving Moor', '7 Plains', '7 Swamp']],
];
const markt = { 'Venomous Hierophant': 'checked', 'Gorgon Flail': 'checked', 'Hooded Blightfang': 'typed by you' };
const ikonKnapp = (etikett, svg) => `<button type="button" aria-label="${etikett}" style="width: 30px; height: 30px; border-radius: 8px; background: ${C.bg}; border: 1px solid ${C.line}; color: ${C.txt}; display: grid; place-items: center; cursor: pointer; flex: none">${svg}</button>`;
const kortRad = (antal, namn, pekad) => pekad
  ? `<div style="display: flex; align-items: center; gap: 8px; padding: 5px 8px; margin: 0 -8px; border-radius: 9px; background: ${C.bg3}; border: 1px solid #3d4a5f">${ikonKnapp('One fewer', ik.minus(14))}<b style="width: 18px; text-align: center; font: 700 13.5px ${MONO}">${antal}</b>${ikonKnapp('One more', ik.plus(14))}<span style="flex-grow: 1; min-width: 0; font: 600 14.5px ${SANS}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${namn}</span><button type="button" style="height: 30px; padding: 0 10px; border-radius: 8px; background: transparent; border: 1px solid ${C.line}; color: ${C.txt}; font: 600 12.5px ${SANS}; cursor: pointer">Change</button><button type="button" style="height: 30px; padding: 0 8px; border: 0; background: transparent; color: ${C.dim}; font: 600 12.5px ${SANS}; cursor: pointer">Remove</button></div>`
  : `<div style="display: flex; align-items: baseline; gap: 10px; padding: 7px 0; border-bottom: 1px solid #1c2330"><b style="width: 18px; font: 700 13.5px ${MONO}; color: ${C.dim}">${antal}</b><span style="flex-grow: 1; font: 500 14.5px ${SANS}">${namn}</span>${markt[namn] ? `<span style="font: 600 11.5px ${SANS}; color: ${C.green}; white-space: nowrap">${markt[namn]}</span>` : ''}</div>`;
skriv('E9.dc.html', dator('E9: computer, confirm the deck', 4,
  `<div style="flex-grow: 1; display: flex; flex-direction: column; gap: 18px; min-width: 0">`
  + `<div style="display: flex; align-items: flex-end; gap: 24px"><div style="display: flex; flex-direction: column; gap: 8px">${h1('Is this your deck?')}${tx('Point at a card to change or remove it. The cards you checked are marked.', 'font-size: 16px')}</div><span style="flex-grow: 1"></span>`
  + `<form style="display: flex; gap: 8px; align-items: flex-end; flex: none"><label style="display: flex; flex-direction: column; gap: 4px"><span style="font: 500 12px ${SANS}; color: ${C.dim}">Add a card</span><input type="text" placeholder="Card name" style="width: 220px; height: 42px; box-sizing: border-box; border-radius: 10px; border: 1px solid ${C.line}; background: ${C.bg2}; color: ${C.txt}; font: 500 15px ${SANS}; padding: 0 12px"></label>${knapp('Add', 'sek', 'height: 42px; padding: 0 16px; font-size: 14px')}${knapp('Paste a list', 'sek', 'height: 42px; padding: 0 14px; font-size: 14px')}</form></div>`
  + `<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 28px">${typer.map(([t, lista]) => {
    const n = lista.reduce((s, x) => s + (parseInt(x) || 1), 0);
    return `<div style="display: flex; flex-direction: column"><div style="display: flex; justify-content: space-between; font: 700 12px ${MONO}; letter-spacing: 0.5px; color: ${C.dim}; padding-bottom: 8px; border-bottom: 1px solid ${C.line}"><span>${t.toUpperCase()}</span><span>${n}</span></div>${lista.map(x => {
      const m = x.match(/^(\d+) (.*)$/), antal = m ? m[1] : '1', namn = m ? m[2] : x;
      return kortRad(antal, namn, namn === 'Night’s Whisper');
    }).join('')}</div>`;
  }).join('')}</div></div>`,
  `${knapp('Back', 'sek')}${knapp(ik.camera(18) + 'Photograph more cards', 'sek')}<span style="flex-grow: 1"></span><span style="display: flex; align-items: center; gap: 12px">${ring(40, 40, 52)}<span style="font: 600 15px ${SANS}; color: #8fe0b0">40 of 40</span></span><sc-if value="{{lek}}" hint-placeholder-val="{{true}}">${knapp('Confirm deck', 'prim', 'margin-left: 12px')}</sc-if><sc-if value="{{spel}}" hint-placeholder-val="{{false}}">${knapp('Confirm deck and continue setup', 'prim', 'margin-left: 12px')}</sc-if>`,
  { kontext: true }));

/* ── index ── */
const LAST = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const PW = 390, PH = 844, DW = 1440, DH = 900, GX = 80, RY = 343;
const plats = {
  'X1.dc.html': [0, 0, DW, DH, 'Start A · Deck page: three ways to add cards'],
  'X2.dc.html': [DW + GX, 0, DW, DH, 'Start B · Game setup: a new deck, the same three ways'],
  'Main.dc.html': [0, DH + RY, DW, DH, 'E1 · Computer: set up (Tweaks: deck page or game setup)'],
  'E2.dc.html': [DW + GX, DH + RY, PW, PH, 'E2 · Phone: lay out the cards (animated)'],
  'E3.dc.html': [DW + GX + (PW + GX), DH + RY, PW, PH, 'E3 · Phone: the camera uses the whole picture'],
  'E4.dc.html': [DW + GX + 2 * (PW + GX), DH + RY, PW, PH, 'E4 · Phone: photo 1 read (animated)'],
  'E5.dc.html': [DW + GX + 3 * (PW + GX), DH + RY, PW, PH, 'E5 · Phone: continue on the computer'],
  'E6.dc.html': [0, 2 * (DH + RY), DW, DH, 'E6 · Computer: while you photograph'],
  'E7.dc.html': [DW + GX, 2 * (DH + RY), DW, DH, 'E7 · Computer: check cards'],
  'E8.dc.html': [2 * (DW + GX), 2 * (DH + RY), DW, DH, 'E8 · Computer: basic lands (Tweaks: photographed or typed)'],
  'E9.dc.html': [3 * (DW + GX), 2 * (DH + RY), DW, DH, 'E9 · Computer: confirm (Tweaks: deck page or game setup)'],
};
const boards = {}, order = [];
for (const [f, [x, y, w, h, title]] of Object.entries(plats)) { boards[f] = Object.assign({}, LAST.boards[f] || {}, { x, y, w, h, title }); order.push(f); }
const canvas = Object.assign({}, LAST, { boards, order, launch: { view: 'canvas' },
  notes: {
    r0: { x: 0, y: -260, text: 'Where it starts: the deck page or game setup', kind: 'title1', maxW: 2 * DW + GX },
    r1: { x: 0, y: DH + RY - 260, text: 'Set up on the computer, then the phone takes the photos', kind: 'title1', maxW: DW + 4 * (PW + GX) },
    r2: { x: 0, y: 2 * (DH + RY) - 260, text: 'Then the computer: check, basic lands, confirm', kind: 'title1', maxW: 4 * DW + 3 * GX },
  } });
for (const [n, h] of Object.entries(filer)) fs.writeFileSync(path.join(OUT, n), h);
fs.writeFileSync(path.join(OUT, 'canvas.json'), JSON.stringify(canvas, null, 1));
const bindestreck = Object.entries(filer).filter(([, h]) => /[—–]|--(?!>)/.test(h.replace(/<!--[\s\S]*?-->/g, '')));
console.log(Object.keys(filer).join(' '), bindestreck.length ? 'TANKSTRECK I: ' + bindestreck.map(([n]) => n).join(' ') : 'inga tankstreck');

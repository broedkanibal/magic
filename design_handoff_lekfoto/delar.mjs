// Mesa Deck Photo Review — genererar artboards till designytan.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, 'project');
fs.mkdirSync(OUT, { recursive: true });

const C = { bg: '#0d1015', bg2: '#141922', bg3: '#1b2230', bg4: '#232c3c', line: '#28313f', txt: '#e7ecf4', dim: '#93a1b6', dim2: '#66748a',
  acc: '#f0a52a', blue: '#6b8cff', red: '#e2606a', green: '#57c785', ink: '#20160a' };
const SANS = '-apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Helvetica, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

/* ── leken: nio kolumner på bordet (Boros Burn utan basländer, 54 kort) ── */
const R = '#b8442f', G = '#c49a3c', L = '#8c7a5c';
const K = (n, c, x = 1) => Array.from({ length: x }, () => ({ n, c }));
const BORD = [
  [...K('Monastery Swiftspear', R, 4), ...K('Goblin Guide', R, 2)],
  [...K('Goblin Guide', R, 2), ...K('Eidolon of the Great Revel', R, 4)],
  [...K('Lightning Bolt', R, 4), ...K('Rift Bolt', R, 2)],
  [...K('Rift Bolt', R, 2), ...K('Lava Spike', R, 4)],
  [...K('Skewer the Critics', R, 4), ...K('Boros Charm', G, 2)],
  [...K('Boros Charm', G, 2), ...K('Lightning Helix', G, 4)],
  [...K('Searing Blaze', R, 4), ...K('Light Up the Stage', R, 2)],
  [...K('Light Up the Stage', R, 2), ...K('Sacred Foundry', L, 4)],
  [...K('Inspiring Vantage', L, 4), ...K('Sunbaked Canyon', L, 2)],
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Ett kort i en kolumn: bara titelraden syns, utom det sista som syns helt.
   hl: 'acc' (i båda fotona), 'blue' (grannarna), 'dim' (utanför fotot), 'cut' (kapat vid kanten). */
function kort(k, sist, w, hl) {
  const ring = hl === 'acc' ? `box-shadow: 0 0 0 2px ${C.acc}; position: relative; z-index: 2;`
    : hl === 'blue' ? `box-shadow: 0 0 0 2px ${C.blue}; position: relative; z-index: 1;` : '';
  const dim = hl === 'dim' ? 'opacity: 0.28;' : '';
  const fs_ = w < 60 ? 7 : w < 80 ? 8 : 9;
  const titel = `<div style="height: ${w < 60 ? 13 : 15}px; background: #ece4cf; color: #1b1b1b; font-size: ${fs_}px; font-weight: 700; line-height: ${w < 60 ? 13 : 15}px; padding: 0 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-radius: 3px 3px 0 0">${esc(k.n)}</div>`;
  if (!sist) return `<div style="box-sizing: border-box; border: 2px solid ${k.c}; border-bottom-width: 0; border-radius: 5px 5px 0 0; background: ${k.c}; margin-bottom: 0; ${ring}${dim}">${titel}</div>`;
  const art = Math.round(w * 0.62);
  return `<div style="box-sizing: border-box; border: 2px solid ${k.c}; border-radius: 5px; background: ${k.c}; ${ring}${dim}">${titel}<div style="height: ${art}px; margin: 2px; background: #4a3f36; border-radius: 2px"></div><div style="height: ${Math.round(art * 0.55)}px; margin: 0 2px 2px; background: #e6dcc4; border-radius: 2px"></div></div>`;
}
/* Ett foto av några kolumner. mark(ci, ri) ger hl för varje kort. */
function foto(cols, o = {}) {
  const w = o.w || 340, pad = o.pad ?? 10, gap = o.gap ?? 7, n = cols.length;
  const cw = Math.floor((w - 2 * pad - gap * (n - 1)) / n);
  const kol = cols.map((col, ci) => `<div style="width: ${cw}px; display: flex; flex-direction: column; flex: none">${col.map((k, ri) =>
    kort(k, ri === col.length - 1, cw, o.mark ? o.mark(ci, ri) : null)).join('')}</div>`).join('');
  const etikett = o.label ? `<div style="position: absolute; left: 8px; top: 8px; padding: 3px 7px; border-radius: 6px; background: #0d1015d9; color: ${C.txt}; font: 600 11px ${MONO}">${o.label}</div>` : '';
  return `<div style="position: relative; width: ${w}px; box-sizing: border-box; padding: ${o.label ? pad + 22 : pad}px ${pad}px ${pad}px; background: #26352b; border-radius: 10px; display: flex; gap: ${gap}px; align-items: flex-start; overflow: hidden; flex: none">${etikett}${kol}</div>`;
}

/* ── telefonens delar (samma som i appen: telpst, btnp, telcyk) ── */
const ik = {
  check: (s = 14, sw = 2.6, c = 'currentColor') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>`,
  camera: (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"></path><circle cx="12" cy="13" r="3.5"></circle></svg>`,
  laptop: (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="11" rx="1.5"></rect><path d="M2 19h20"></path></svg>`,
  list: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12"></path><circle cx="4" cy="6" r="1"></circle><circle cx="4" cy="12" r="1"></circle><circle cx="4" cy="18" r="1"></circle></svg>`,
  merge: (s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="11" height="14" rx="2"></rect><rect x="10" y="5" width="11" height="14" rx="2"></rect></svg>`,
  q: (s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"></path><path d="M12 17h.01"></path></svg>`,
  back: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"></path></svg>`,
  minus: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"></path></svg>`,
  plus: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12M12 6v12"></path></svg>`,
};
function pst(st) {
  const namn = ['Connect', 'Lay out', 'Photo'];
  return `<div style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 12px; background: #121821; border: 1px solid ${C.line}">${namn.map((t, i) => {
    const s = st[i];
    const n = s === 'ok' ? `background: #0f2016; border: 1px solid #2f6b47; color: #8fe0b0` : s === 'on' ? `background: ${C.acc}; border: 1px solid ${C.acc}; color: ${C.ink}` : `border: 1px solid #39445a; color: ${C.dim2}`;
    return (i ? `<i style="flex-grow: 1; height: 1.5px; background: ${C.line}; min-width: 8px"></i>` : '')
      + `<span style="display: flex; align-items: center; gap: 7px; font: 600 12.5px ${SANS}; color: ${s === 'on' ? C.txt : C.dim}; white-space: nowrap"><span style="width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font: 700 11px ${MONO}; flex: none; ${n}">${s === 'ok' ? ik.check(12, 3) : i + 1}</span>${t}</span>`;
  }).join('')}</div>`;
}
const till = `<div style="display: flex; flex-direction: column; gap: 2px"><span style="font: 500 12.5px ${SANS}; color: ${C.dim}">Adding cards to</span><b style="font: 700 19px ${SANS}; color: ${C.txt}">Boros Burn</b></div>`;
const cyk = t => `<div style="display: flex; align-items: center; gap: 9px; font: 600 11.5px ${MONO}; color: ${C.dim}; letter-spacing: 0.4px">${t}<i style="flex-grow: 1; height: 1px; background: ${C.line}"></i></div>`;
const btn = (t, typ = 'prim', ikon = '') => `<button type="button" style="display: flex; align-items: center; justify-content: center; gap: 9px; height: 52px; border-radius: 12px; font: 650 16px ${SANS}; width: 100%; cursor: pointer; ${typ === 'prim' ? `background: ${C.acc}; color: ${C.ink}; border: 0` : `background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}`}">${ikon}${t}</button>`;
const tx = (t, o = '') => `<p style="margin: 0; font: 400 14.5px/1.45 ${SANS}; color: ${C.dim}; ${o}">${t}</p>`;
const ok = t => `<span style="display: inline-flex; align-items: center; gap: 6px; font: 650 13.5px ${SANS}; color: ${C.green}">${ik.check(16, 2.6)}${t}</span>`;

/* En rad "i båda fotona": två titelrader bredvid varandra. */
function remsa(namn, farg, o = {}) {
  return `<div style="width: ${o.w || 120}px; box-sizing: border-box; border: 2px solid ${farg}; border-bottom-width: 0; border-radius: 5px 5px 0 0; background: ${farg}; ${o.hl ? `box-shadow: 0 0 0 2px ${C.acc};` : ''}"><div style="height: 18px; background: #ece4cf; color: #1b1b1b; font-size: 10px; font-weight: 700; line-height: 18px; padding: 0 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-radius: 3px 3px 0 0">${esc(namn)}</div></div>`;
}

function telefon(titel, kropp, fot, o = {}) {
  return sida(titel, 390, 844,
    `<div style="width: 390px; height: 844px; box-sizing: border-box; background: ${C.bg}; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column; padding: 18px 18px 22px; gap: 16px">`
    + `<div style="display: flex; flex-direction: column; gap: 16px; flex-grow: 1; min-height: 0">${kropp}</div>`
    + (fot ? `<div style="display: flex; flex-direction: column; gap: 10px">${fot}</div>` : '')
    + `</div>`, o);
}
function sida(titel, w, h, kropp, o = {}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(titel)}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
body{margin:0;background:${C.bg};font-family:${SANS.replace(/&quot;/g, '"')}}
a{color:${C.acc}}a:hover{color:#ffc15a}
</style>
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

const dator = (titel, kropp) => sida(titel, 1440, 900,
  `<div style="width: 1440px; height: 900px; box-sizing: border-box; background: ${C.bg}; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column">`
  + `<div style="height: 56px; flex: none; display: flex; align-items: center; gap: 14px; padding: 0 24px; border-bottom: 1px solid ${C.line}; background: ${C.bg2}"><b style="font: 800 17px ${SANS}; letter-spacing: 0.3px; color: ${C.acc}">Mesa</b><span style="color: ${C.dim2}">/</span><span style="font: 600 15px ${SANS}">Boros Burn</span><span style="flex-grow: 1"></span><span style="font: 500 13px ${SANS}; color: ${C.dim}">Saved</span></div>`
  + kropp + `</div>`);
const ko = (nr, rubrik, under, aktiv) => `<button type="button" style="text-align: left; display: flex; gap: 12px; padding: 12px 14px; border-radius: 10px; cursor: pointer; font-family: inherit; ${aktiv ? `background: #1d1810; border: 1px solid #6a5220;` : `background: transparent; border: 1px solid ${C.line};`}"><b style="font: 700 13px ${MONO}; color: ${aktiv ? C.acc : C.dim2}; padding-top: 1px">${nr}</b><span style="display: flex; flex-direction: column; gap: 3px"><span style="font: 650 14.5px ${SANS}; color: ${C.txt}">${rubrik}</span><span style="font: 400 13px/1.35 ${SANS}; color: ${C.dim}">${under}</span></span></button>`;
const steg = (namn, n) => `<div style="display: flex; align-items: center; gap: 12px; padding: 8px 0"><span style="flex-grow: 1; font: 500 15.5px ${SANS}">${namn}</span><button type="button" aria-label="Fewer ${namn}" style="width: 44px; height: 44px; border-radius: 10px; background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}; display: grid; place-items: center; cursor: pointer">${ik.minus()}</button><b style="width: 30px; text-align: center; font: 700 18px ${MONO}">${n}</b><button type="button" aria-label="More ${namn}" style="width: 44px; height: 44px; border-radius: 10px; background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}; display: grid; place-items: center; cursor: pointer">${ik.plus()}</button></div>`;
const ring = (n, av, farg = C.acc) => {
  const r = 52, o = 2 * Math.PI * r, del = Math.min(1, n / av);
  return `<div style="position: relative; width: 132px; height: 132px; flex: none"><svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true"><circle cx="66" cy="66" r="${r}" fill="none" stroke="${C.bg4}" stroke-width="10"></circle><circle cx="66" cy="66" r="${r}" fill="none" stroke="${farg}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(o * del).toFixed(1)} ${o.toFixed(1)}" transform="rotate(-90 66 66)"></circle></svg><div style="position: absolute; left: 0; top: 0; width: 132px; height: 132px; display: flex; flex-direction: column; align-items: center; justify-content: center"><b style="font: 800 34px ${SANS}; letter-spacing: -1px">${n}</b><span style="font: 500 13px ${SANS}; color: ${C.dim}">of ${av}</span></div></div>`;
};
export { C, SANS, MONO, esc, kort, foto, ik, pst, cyk, btn, tx, ok, remsa, telefon, sida, dator, ko, steg, ring, OUT, ROOT, fs, path };

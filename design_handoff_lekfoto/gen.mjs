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

const filer = {};
const skriv = (namn, html) => { filer[namn] = html; };

/* ══ I dag ══════════════════════════════════════════════════════════ */
skriv('Idag1.dc.html', telefon('Today: photo read',
  pst(['ok', 'ok', 'ok'])
  + `<div style="display: flex; flex-direction: column; gap: 6px">${ok('Photo 2 read')}<span style="font: 800 44px ${SANS}; letter-spacing: -1px">24 cards</span>${tx('You’ll see them on the computer.')}</div>`
  + foto(BORD.slice(3, 7), { w: 354, label: 'Photo 2' })
  + cyk('PHOTO 3 NEXT')
  + tx('Move these cards aside and lay out the next ones the same way — steps 2 and 3 start over.'),
  btn('Take the next photo', 'prim', ik.camera()) + btn('Done', 'sek')));
skriv('Idag2.dc.html', telefon('Today: done',
  `<div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 60px 8px 0"><span style="width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; background: #0f2016; border: 1px solid #2f6b47; color: #8fe0b0">${ik.check(26, 2.8)}</span><b style="font: 700 22px ${SANS}">That’s the deck</b>${tx('Boros Burn has 61 cards. Finish it on the computer — basic lands, the cards to check, and the ones the photos missed.')}</div>`,
  btn('Take another photo', 'sek', ik.camera())));

/* ══ A · Se på mobilen, rätta på datorn ═════════════════════════════ */
/* A1: fotot är läst; kolumnen som också fanns i Photo 1 räknas en gång. */
skriv('Main.dc.html', telefon('A1: photo read, overlap counted once',
  pst(['ok', 'ok', 'ok'])
  + `<div style="display: flex; flex-direction: column; gap: 6px">${ok('Photo 2 read')}<span style="font: 800 44px ${SANS}; letter-spacing: -1px">18 new cards</span></div>`
  + foto(BORD.slice(3, 7), { w: 354, label: 'Photo 2', mark: ci => ci === 0 ? 'dim' : null })
  + `<div style="display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border-radius: 12px; background: ${C.bg2}; border: 1px solid ${C.line}"><span style="color: ${C.dim}; flex: none; padding-top: 2px">${ik.merge(18)}</span><div style="display: flex; flex-direction: column; gap: 3px"><b style="font: 650 14.5px ${SANS}">6 were in Photo 1 too</b>${tx('Same cards, same neighbours — counted once.', 'font-size: 13.5px')}</div></div>`
  + `<div style="display: flex; justify-content: space-between; align-items: baseline; padding: 0 2px"><span style="font: 500 14px ${SANS}; color: ${C.dim}">The deck so far</span><b style="font: 700 17px ${SANS}">42 cards</b></div>`,
  btn('Take the next photo', 'prim', ik.camera()) + btn('Done', 'sek')));

/* A2: klar — summeringen på telefonen, och datorn har öppnat kollen. */
const typer = [['Creatures', 12], ['Instants', 16], ['Sorceries', 16], ['Lands', 10]];
skriv('A2.dc.html', telefon('A2: done — the summary',
  `<div style="display: flex; flex-direction: column; gap: 4px; padding-top: 6px"><span style="font: 500 13px ${SANS}; color: ${C.dim}">Boros Burn · 3 photos</span><span style="font: 800 48px ${SANS}; letter-spacing: -1.2px">55 cards</span><span style="font: 500 14px ${SANS}; color: ${C.dim}">+ basic lands, added on the computer</span></div>`
  + `<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px">${typer.map(([t, n]) => `<div style="padding: 10px 12px; border-radius: 10px; background: ${C.bg2}; border: 1px solid ${C.line}; display: flex; justify-content: space-between; align-items: baseline"><span style="font: 500 14px ${SANS}; color: ${C.dim}">${t}</span><b style="font: 700 17px ${SANS}">${n}</b></div>`).join('')}</div>`
  + `<div style="display: flex; flex-direction: column; border-radius: 12px; border: 1px solid #5a4418; background: #1d1810; overflow: hidden">`
  + `<div style="padding: 11px 14px 9px; font: 700 14px ${SANS}; color: ${C.acc}">2 to check</div>`
  + `<div style="display: flex; gap: 12px; align-items: center; padding: 10px 14px; border-top: 1px solid #3a2e14">${remsa('Light Up the Stage', R, { w: 118 })}<span style="font: 400 13.5px/1.35 ${SANS}; color: ${C.txt}">In two photos — one card or a fifth copy?</span></div>`
  + `<div style="display: flex; gap: 12px; align-items: center; padding: 10px 14px; border-top: 1px solid #3a2e14"><div style="width: 118px; height: 20px; box-sizing: border-box; border: 1.5px dashed #6a5a3a; border-radius: 5px; display: grid; place-items: center; color: ${C.acc}; flex: none">${ik.q(14)}</div><span style="font: 400 13.5px/1.35 ${SANS}; color: ${C.txt}">A title line that couldn’t be read</span></div>`
  + `</div>`
  + `<div style="display: flex; gap: 10px; align-items: center; padding: 11px 14px; border-radius: 12px; background: #101a2e; border: 1px solid #2a3a66; color: #b9c8ff"><span style="flex: none">${ik.laptop(20)}</span><span style="font: 500 13.5px/1.4 ${SANS}">Your computer is showing them now — with both photos side by side.</span></div>`,
  btn('See the whole list', 'sek', ik.list()) + btn('Take another photo', 'sek', ik.camera())));

/* A3: hela listan på telefonen. */
const lista = [
  ['Creatures', [['Monastery Swiftspear', 4], ['Goblin Guide', 4], ['Eidolon of the Great Revel', 4]]],
  ['Instants', [['Lightning Bolt', 4], ['Boros Charm', 4], ['Lightning Helix', 4], ['Searing Blaze', 4]]],
  ['Sorceries', [['Rift Bolt', 4], ['Lava Spike', 4], ['Light Up the Stage', 5, 'q'], ['Skewer the Critics', 3]]],
  ['Lands', [['Sacred Foundry', 4], ['Inspiring Vantage', 4], ['Sunbaked Canyon', 2]]],
];
skriv('A3.dc.html', telefon('A3: the whole list',
  `<div style="display: flex; align-items: center; gap: 10px"><button type="button" aria-label="Back" style="width: 40px; height: 40px; border-radius: 10px; background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}; display: grid; place-items: center; cursor: pointer">${ik.back()}</button><div style="display: flex; flex-direction: column"><b style="font: 700 17px ${SANS}">Boros Burn</b><span style="font: 500 12.5px ${SANS}; color: ${C.dim}">55 cards · 2 to check</span></div></div>`
  + `<div style="display: flex; flex-direction: column; gap: 14px; overflow: hidden">${lista.map(([t, rader]) => {
    const sum = rader.reduce((s, r) => s + r[1], 0);
    return `<div style="display: flex; flex-direction: column"><div style="display: flex; justify-content: space-between; font: 700 12px ${MONO}; letter-spacing: 0.5px; color: ${C.dim}; padding: 0 2px 6px; border-bottom: 1px solid ${C.line}"><span>${t.toUpperCase()}</span><span>${sum}</span></div>${rader.map(([n, x, f]) =>
      `<div style="display: flex; align-items: center; gap: 10px; padding: 7px 2px; border-bottom: 1px solid #1c2330"><b style="width: 26px; font: 700 14px ${MONO}; color: ${f ? C.acc : C.txt}">${x}</b><span style="flex-grow: 1; font: 500 14.5px ${SANS}; color: ${C.txt}">${esc(n)}</span>${f ? `<span style="font: 650 11.5px ${SANS}; color: ${C.acc}; padding: 2px 7px; border-radius: 99px; border: 1px solid #5a4418">check</span>` : ''}</div>`).join('')}</div>`;
  }).join('')}<div style="display: flex; align-items: center; gap: 10px; padding: 7px 2px"><b style="width: 26px; font: 700 14px ${MONO}; color: ${C.acc}">1</b><span style="flex-grow: 1; font: 500 14.5px ${SANS}; color: ${C.dim}; font-style: italic">Couldn’t be read</span><span style="font: 650 11.5px ${SANS}; color: ${C.acc}; padding: 2px 7px; border-radius: 99px; border: 1px solid #5a4418">check</span></div></div>`,
  null));

/* A4: datorn — kollen med båda fotona bredvid varandra. */
const P2 = BORD.slice(3, 7), P3 = [[BORD[6][5]], BORD[7], BORD[8]];
const dator = (titel, kropp) => sida(titel, 1440, 900,
  `<div style="width: 1440px; height: 900px; box-sizing: border-box; background: ${C.bg}; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column">`
  + `<div style="height: 56px; flex: none; display: flex; align-items: center; gap: 14px; padding: 0 24px; border-bottom: 1px solid ${C.line}; background: ${C.bg2}"><b style="font: 800 17px ${SANS}; letter-spacing: 0.3px; color: ${C.acc}">Mesa</b><span style="color: ${C.dim2}">/</span><span style="font: 600 15px ${SANS}">Boros Burn</span><span style="flex-grow: 1"></span><span style="font: 500 13px ${SANS}; color: ${C.dim}">Saved</span></div>`
  + kropp + `</div>`);
const ko = (nr, rubrik, under, aktiv) => `<button type="button" style="text-align: left; display: flex; gap: 12px; padding: 12px 14px; border-radius: 10px; cursor: pointer; font-family: inherit; ${aktiv ? `background: #1d1810; border: 1px solid #6a5220;` : `background: transparent; border: 1px solid ${C.line};`}"><b style="font: 700 13px ${MONO}; color: ${aktiv ? C.acc : C.dim2}; padding-top: 1px">${nr}</b><span style="display: flex; flex-direction: column; gap: 3px"><span style="font: 650 14.5px ${SANS}; color: ${C.txt}">${rubrik}</span><span style="font: 400 13px/1.35 ${SANS}; color: ${C.dim}">${under}</span></span></button>`;
skriv('A4.dc.html', dator('A4: check on the computer',
  `<div style="flex-grow: 1; display: flex; min-height: 0">`
  /* kön */
  + `<div style="width: 300px; flex: none; box-sizing: border-box; padding: 22px 18px; border-right: 1px solid ${C.line}; display: flex; flex-direction: column; gap: 10px"><div style="display: flex; justify-content: space-between; align-items: baseline"><b style="font: 700 18px ${SANS}">Check the photos</b><span style="font: 600 13px ${MONO}; color: ${C.dim}">1 / 2</span></div>${tx('Opened by the phone when you pressed Done.', 'font-size: 13px')}`
  + ko(1, 'Light Up the Stage', 'In Photo 2 and Photo 3 — one card or a fifth copy?', true)
  + ko(2, 'Couldn’t be read', 'Photo 1 · a title line under Lava Spike', false)
  + `<span style="flex-grow: 1"></span><div style="padding: 12px 14px; border-radius: 10px; background: ${C.bg2}; border: 1px solid ${C.line}; display: flex; flex-direction: column; gap: 4px"><span style="font: 500 13px ${SANS}; color: ${C.dim}">Already counted once</span><span style="font: 400 13px/1.4 ${SANS}; color: ${C.txt}">6 cards in Photo 1 + 2 · same neighbours in both</span><a href="#" style="font: 600 13px ${SANS}">Show them</a></div></div>`
  /* mitten */
  + `<div style="flex-grow: 1; box-sizing: border-box; padding: 26px 34px; display: flex; flex-direction: column; gap: 20px; min-width: 0">`
  + `<div style="display: flex; flex-direction: column; gap: 6px"><span style="font: 600 12px ${MONO}; letter-spacing: 0.6px; color: ${C.acc}">IN TWO PHOTOS</span><b style="font: 750 28px ${SANS}; letter-spacing: -0.4px">Is this one card, or two?</b>${tx('Light Up the Stage is cut off at the edge of Photo 3, so Mesa can’t see what lies next to it. Counted twice it would be a fifth copy — a deck can hold four.', 'font-size: 15px; max-width: 720px')}</div>`
  + `<div style="display: flex; gap: 24px; align-items: flex-start">`
  + `<div style="display: flex; flex-direction: column; gap: 8px">${foto(P2, { w: 420, label: 'Photo 2', mark: (ci, ri) => ci === 3 && ri === 5 ? 'acc' : ci === 3 && ri === 4 ? 'blue' : null })}<span style="font: 500 13px ${SANS}; color: ${C.dim}">Bottom of the right-hand column, under Searing Blaze</span></div>`
  + `<div style="display: flex; flex-direction: column; gap: 8px">${foto(P3, { w: 330, label: 'Photo 3', mark: (ci, ri) => ci === 0 ? 'acc' : null })}<span style="font: 500 13px ${SANS}; color: ${C.dim}">At the left edge, only half in the photo</span></div>`
  + `</div>`
  + `<div style="display: flex; gap: 12px; align-items: center">`
  + `<button type="button" style="height: 48px; padding: 0 22px; border-radius: 11px; border: 0; background: ${C.acc}; color: ${C.ink}; font: 650 15.5px ${SANS}; cursor: pointer">Same card — count it once</button>`
  + `<button type="button" style="height: 48px; padding: 0 22px; border-radius: 11px; background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}; font: 650 15.5px ${SANS}; cursor: pointer">Two cards</button>`
  + `<span style="font: 500 13px ${SANS}; color: ${C.dim2}; padding-left: 6px">1 or 2 on the keyboard</span></div>`
  + `</div>`
  /* leken */
  + `<div style="width: 300px; flex: none; box-sizing: border-box; padding: 22px 20px; border-left: 1px solid ${C.line}; background: ${C.bg2}; display: flex; flex-direction: column; gap: 14px"><div style="display: flex; flex-direction: column; gap: 2px"><span style="font: 500 13px ${SANS}; color: ${C.dim}">Boros Burn</span><b style="font: 800 34px ${SANS}; letter-spacing: -0.8px">55 cards</b><span style="font: 500 13px ${SANS}; color: ${C.acc}">54 if it’s the same card</span></div>`
  + typer.map(([t, n]) => `<div style="display: flex; justify-content: space-between; font: 500 14px ${SANS}; padding: 6px 0; border-bottom: 1px solid ${C.line}"><span style="color: ${C.dim}">${t}</span><b>${t === 'Sorceries' ? '16' : n}</b></div>`).join('')
  + `<div style="display: flex; justify-content: space-between; font: 500 14px ${SANS}; padding: 6px 0"><span style="color: ${C.dim}">Basic lands</span><a href="#" style="font-weight: 600">Add…</a></div></div>`
  + `</div>`));

/* ══ B · Fotona sys ihop ════════════════════════════════════════════ */
/* B1: läggningsguiden säger att överlapp är bra. */
function karta(o = {}) {
  /* Hela bordet i miniatyr, med fotonas ramar ovanpå. */
  const w = o.w || 354, cols = BORD.length, pad = 8, gap = 4;
  const cw = Math.floor((w - 2 * pad - gap * (cols - 1)) / cols);
  const kx = i => pad + i * (cw + gap);
  const kol = BORD.map((col, ci) => `<div style="width: ${cw}px; display: flex; flex-direction: column; flex: none">${col.map((k, ri) => {
    const sist = ri === col.length - 1, hl = o.mark ? o.mark(ci, ri) : null;
    const ring = hl === 'acc' ? `box-shadow: 0 0 0 2px ${C.acc}; position: relative; z-index: 3;` : '';
    const dim = hl === 'dim' ? 'opacity: 0.25;' : '';
    return `<div style="height: ${sist ? cw * 1.2 : 8}px; box-sizing: border-box; border: 1.5px solid ${k.c}; background: ${sist ? '#4a3f36' : '#ece4cf'}; border-radius: 2px; ${ring}${dim}"></div>`;
  }).join('')}</div>`).join('');
  const h = pad * 2 + 5 * 8 + Math.round(cw * 1.2);
  const ramar = (o.ramar || []).map(r => {
    const x0 = kx(r.fran) - 3, x1 = kx(r.till) + cw + 3;
    return `<div style="position: absolute; left: ${x0}px; top: 3px; width: ${x1 - x0}px; height: ${h - 6}px; box-sizing: border-box; border: 2px ${r.streckad ? 'dashed' : 'solid'} ${r.farg}; border-radius: 6px; z-index: 4"><span style="position: absolute; ${r.nere ? 'bottom: -22px' : 'top: -22px'}; left: -2px; font: 700 11px ${MONO}; color: ${r.farg}; white-space: nowrap">${r.namn}</span></div>`;
  }).join('');
  const band = (o.band || []).map(i => `<div style="position: absolute; left: ${kx(i) - 2}px; top: 0; width: ${cw + 4}px; height: ${h}px; background: #f0a52a2e; z-index: 1"></div>`).join('');
  return `<div style="position: relative; width: ${w}px; height: ${h}px; box-sizing: border-box; padding: ${pad}px; background: #26352b; border-radius: 10px; display: flex; gap: ${gap}px; align-items: flex-start; flex: none; margin: ${o.luft ?? 24}px 0">${band}<div style="display: flex; gap: ${gap}px; position: relative; z-index: 2">${kol}</div>${ramar}</div>`;
}
skriv('B1.dc.html', telefon('B1: lay out — overlap is fine',
  pst(['ok', 'on', '']) + till
  + cyk('PHOTO 1')
  + karta({ w: 354, ramar: [{ fran: 0, till: 3, farg: C.acc, namn: 'PHOTO 1' }, { fran: 3, till: 6, farg: C.dim, namn: 'PHOTO 2', streckad: true, nere: true }], band: [3] })
  + `<div style="display: flex; flex-direction: column; gap: 8px"><b style="font: 700 17px ${SANS}">Lay out the whole deck, then photograph a part at a time</b>${tx('Columns, only the title lines showing. Let each photo overlap the last by a column — Mesa stitches them together and counts the overlap once.')}</div>`,
  btn('Open the camera', 'prim', ik.camera())));

/* B2: foto 2 läst — kartan växer, överlappet räknas en gång. */
skriv('B2.dc.html', telefon('B2: photo 2 stitched on',
  pst(['ok', 'ok', 'ok'])
  + `<div style="display: flex; flex-direction: column; gap: 6px">${ok('Photo 2 stitched on')}<span style="font: 800 44px ${SANS}; letter-spacing: -1px">42 cards</span></div>`
  + karta({ w: 354, mark: ci => ci > 6 ? 'dim' : null, ramar: [{ fran: 0, till: 3, farg: C.dim, namn: 'PHOTO 1' }, { fran: 3, till: 6, farg: C.acc, namn: 'PHOTO 2', nere: true }], band: [3] })
  + `<div style="display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border-radius: 12px; background: ${C.bg2}; border: 1px solid ${C.line}"><span style="flex: none; width: 14px; height: 14px; border-radius: 3px; background: #f0a52a55; border: 1px solid ${C.acc}; margin-top: 3px"></span><div style="display: flex; flex-direction: column; gap: 3px"><b style="font: 650 14.5px ${SANS}">6 cards in both photos</b>${tx('The same column, with the same cards on either side — counted once.', 'font-size: 13.5px')}</div></div>`
  + cyk('PHOTO 3 NEXT') + tx('Move the phone one step right, so the photo takes in the last column again.', 'font-size: 14px'),
  btn('Take the next photo', 'prim', ik.camera()) + btn('Done', 'sek')));

/* B3: datorn — bordet som ett helt foto, med ramarna och överlappen. */
function storKarta() {
  const cols = BORD.length, pad = 18, gap = 12, w = 1060;
  const cw = Math.floor((w - 2 * pad - gap * (cols - 1)) / cols);
  const kx = i => pad + i * (cw + gap);
  const kol = BORD.map((col, ci) => `<div style="width: ${cw}px; display: flex; flex-direction: column; flex: none">${col.map((k, ri) =>
    kort(k, ri === col.length - 1, cw, ci === 6 && ri === 5 ? 'acc' : null)).join('')}</div>`).join('');
  const h = 470;
  const ram = (a, b, namn, farg, nere) => { const x0 = kx(a) - 6, x1 = kx(b) + cw + 6; return `<div style="position: absolute; left: ${x0}px; top: ${nere ? 10 : 6}px; width: ${x1 - x0}px; height: ${h - 16}px; box-sizing: border-box; border: 2px dashed ${farg}; border-radius: 8px; z-index: 4"><span style="position: absolute; ${nere ? 'bottom: 6px' : 'top: 6px'}; ${nere ? 'right: 8px' : 'left: 8px'}; padding: 2px 7px; border-radius: 5px; background: #0d1015d9; font: 700 11.5px ${MONO}; color: ${farg}">${namn}</span></div>`; };
  const band = [3, 6].map(i => `<div style="position: absolute; left: ${kx(i) - 5}px; top: 0; width: ${cw + 10}px; height: ${h}px; background: #f0a52a24; z-index: 1"></div>`).join('');
  const pop = `<div style="position: absolute; left: ${kx(6) + cw + 18}px; top: 250px; width: 300px; box-sizing: border-box; padding: 16px; border-radius: 12px; background: ${C.bg3}; border: 1px solid #3d4a5f; box-shadow: 0 8px 28px -8px #000a; z-index: 6; display: flex; flex-direction: column; gap: 10px"><b style="font: 700 15.5px ${SANS}">Light Up the Stage</b>${tx('In Photo 2 and Photo 3, at the same spot on the table. Counted once.', 'font-size: 13.5px; color: ' + C.txt)}<div style="display: flex; gap: 8px"><button type="button" style="height: 38px; padding: 0 14px; border-radius: 9px; border: 1px solid ${C.line}; background: ${C.bg4}; color: ${C.txt}; font: 600 13.5px ${SANS}; cursor: pointer">It’s two cards</button><button type="button" style="height: 38px; padding: 0 14px; border-radius: 9px; border: 0; background: transparent; color: ${C.dim}; font: 600 13.5px ${SANS}; cursor: pointer">Show the photos</button></div></div>`;
  return `<div style="position: relative; width: ${w}px; height: ${h}px; box-sizing: border-box; padding: ${pad + 26}px ${pad}px ${pad}px; background: #26352b; border-radius: 14px; flex: none">${band}<div style="display: flex; gap: ${gap}px; position: relative; z-index: 2">${kol}</div>${ram(0, 3, 'PHOTO 1', '#c9d3e3')}${ram(3, 6, 'PHOTO 2', '#c9d3e3', true)}${ram(6, 8, 'PHOTO 3', '#c9d3e3')}${pop}</div>`;
}
skriv('B3.dc.html', dator('B3: the table, stitched',
  `<div style="flex-grow: 1; display: flex; min-height: 0">`
  + `<div style="flex-grow: 1; box-sizing: border-box; padding: 26px 30px; display: flex; flex-direction: column; gap: 18px; min-width: 0">`
  + `<div style="display: flex; align-items: flex-end; gap: 20px"><div style="display: flex; flex-direction: column; gap: 6px"><span style="font: 600 12px ${MONO}; letter-spacing: 0.6px; color: ${C.dim}">FROM THE PHONE · 3 PHOTOS</span><b style="font: 750 28px ${SANS}; letter-spacing: -0.4px">Your table, stitched together</b></div><span style="flex-grow: 1"></span><span style="display: flex; align-items: center; gap: 8px; font: 500 13.5px ${SANS}; color: ${C.dim}"><span style="width: 14px; height: 14px; border-radius: 3px; background: #f0a52a44; border: 1px solid ${C.acc}"></span>In two photos — counted once</span></div>`
  + storKarta()
  + tx('Click a card to see which photos it came from. Everything in a shaded column was photographed twice and counted once.', 'font-size: 14px')
  + `</div>`
  + `<div style="width: 300px; flex: none; box-sizing: border-box; padding: 22px 20px; border-left: 1px solid ${C.line}; background: ${C.bg2}; display: flex; flex-direction: column; gap: 14px"><div style="display: flex; flex-direction: column; gap: 2px"><span style="font: 500 13px ${SANS}; color: ${C.dim}">Boros Burn</span><b style="font: 800 34px ${SANS}; letter-spacing: -0.8px">54 cards</b><span style="font: 500 13px ${SANS}; color: ${C.dim}">7 seen twice, counted once</span></div>`
  + typer.map(([t, n]) => `<div style="display: flex; justify-content: space-between; font: 500 14px ${SANS}; padding: 6px 0; border-bottom: 1px solid ${C.line}"><span style="color: ${C.dim}">${t}</span><b>${n}</b></div>`).join('')
  + `<div style="display: flex; justify-content: space-between; font: 500 14px ${SANS}; padding: 6px 0"><span style="color: ${C.dim}">Basic lands</span><a href="#" style="font-weight: 600">Add…</a></div></div>`
  + `</div>`));

/* ══ C · Säg antalet först ══════════════════════════════════════════ */
const steg = (namn, n) => `<div style="display: flex; align-items: center; gap: 12px; padding: 8px 0"><span style="flex-grow: 1; font: 500 15.5px ${SANS}">${namn}</span><button type="button" aria-label="Fewer ${namn}" style="width: 44px; height: 44px; border-radius: 10px; background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}; display: grid; place-items: center; cursor: pointer">${ik.minus()}</button><b style="width: 30px; text-align: center; font: 700 18px ${MONO}">${n}</b><button type="button" aria-label="More ${namn}" style="width: 44px; height: 44px; border-radius: 10px; background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}; display: grid; place-items: center; cursor: pointer">${ik.plus()}</button></div>`;
skriv('C1.dc.html', telefon('C1: how many cards',
  pst(['ok', 'on', '']) + till
  + `<div style="display: flex; flex-direction: column; gap: 10px"><b style="font: 700 17px ${SANS}">How big is the deck?</b><div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px">${['60', '100', 'Other'].map((t, i) => `<button type="button" style="height: 48px; border-radius: 11px; font: 650 16px ${SANS}; cursor: pointer; ${i === 0 ? `background: #2a200e; border: 1.5px solid ${C.acc}; color: ${C.acc}` : `background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}`}">${t}</button>`).join('')}</div></div>`
  + `<div style="display: flex; flex-direction: column; gap: 2px"><b style="font: 700 17px ${SANS}; padding-bottom: 4px">Basic lands in it</b>${tx('They aren’t photographed — just say how many.', 'font-size: 13.5px; padding-bottom: 4px')}${steg('Mountain', 6)}${steg('Plains', 0)}<a href="#" style="font: 600 14px ${SANS}; padding-top: 4px">Another basic land</a></div>`
  + `<div style="padding: 12px 14px; border-radius: 12px; background: ${C.bg2}; border: 1px solid ${C.line}; font: 500 14.5px/1.45 ${SANS}; color: ${C.txt}"><b>54 cards to photograph.</b> <span style="color: ${C.dim}">Mesa counts along and tells you if it adds up.</span></div>`,
  btn('Lay out the first cards', 'prim') + `<button type="button" style="height: 40px; border: 0; background: transparent; color: ${C.dim}; font: 600 14px ${SANS}; cursor: pointer">I don’t know — skip</button>`));

const ring = (n, av, farg = C.acc) => {
  const r = 52, o = 2 * Math.PI * r, del = Math.min(1, n / av);
  return `<div style="position: relative; width: 132px; height: 132px; flex: none"><svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true"><circle cx="66" cy="66" r="${r}" fill="none" stroke="${C.bg4}" stroke-width="10"></circle><circle cx="66" cy="66" r="${r}" fill="none" stroke="${farg}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(o * del).toFixed(1)} ${o.toFixed(1)}" transform="rotate(-90 66 66)"></circle></svg><div style="position: absolute; left: 0; top: 0; width: 132px; height: 132px; display: flex; flex-direction: column; align-items: center; justify-content: center"><b style="font: 800 34px ${SANS}; letter-spacing: -1px">${n}</b><span style="font: 500 13px ${SANS}; color: ${C.dim}">of ${av}</span></div></div>`;
};
skriv('C2.dc.html', telefon('C2: counting along',
  pst(['ok', 'ok', 'ok'])
  + `<div style="display: flex; gap: 18px; align-items: center">${ring(42, 54)}<div style="display: flex; flex-direction: column; gap: 6px">${ok('Photo 2 read')}<b style="font: 700 20px ${SANS}">18 new cards</b>${tx('12 left to photograph', 'font-size: 14px')}</div></div>`
  + `<div style="display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border-radius: 12px; background: ${C.bg2}; border: 1px solid ${C.line}"><span style="color: ${C.dim}; flex: none; padding-top: 2px">${ik.merge(18)}</span><div style="display: flex; flex-direction: column; gap: 3px"><b style="font: 650 14.5px ${SANS}">6 were in Photo 1 too</b>${tx('Same cards, same neighbours — counted once.', 'font-size: 13.5px')}</div></div>`
  + cyk('PHOTO 3 NEXT') + tx('Move these cards aside and lay out the rest.', 'font-size: 14px'),
  btn('Take the next photo', 'prim', ik.camera()) + btn('Done', 'sek')));

/* C3: klar — tre utfall som tweak. */
const c3Lika = `<div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 14px; padding-top: 24px">${ring(54, 54, C.green)}<b style="font: 700 22px ${SANS}">It adds up</b>${tx('54 photographed + 6 Mountains = 60. Boros Burn is ready to play.')}</div>`;
const c3For = `<div style="display: flex; gap: 18px; align-items: center">${ring(55, 54)}<div style="display: flex; flex-direction: column; gap: 4px"><b style="font: 700 20px ${SANS}">1 too many</b>${tx('Probably a card that was in two photos.', 'font-size: 14px')}</div></div>`
  + `<div style="display: flex; flex-direction: column; gap: 12px; padding: 14px; border-radius: 12px; background: ${C.bg2}; border: 1px solid ${C.line}"><b style="font: 650 15px ${SANS}">Light Up the Stage — once or twice?</b><div style="display: flex; gap: 10px; align-items: flex-end"><div style="display: flex; flex-direction: column; gap: 5px"><span style="font: 600 11px ${MONO}; color: ${C.dim}">PHOTO 2</span>${remsa('Light Up the Stage', R, { w: 150, hl: true })}</div><div style="display: flex; flex-direction: column; gap: 5px"><span style="font: 600 11px ${MONO}; color: ${C.dim}">PHOTO 3 · AT THE EDGE</span>${remsa('Light Up the Stage', R, { w: 150, hl: true })}</div></div><div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px"><button type="button" style="height: 46px; border-radius: 11px; border: 0; background: ${C.acc}; color: ${C.ink}; font: 650 15px ${SANS}; cursor: pointer">Same card</button><button type="button" style="height: 46px; border-radius: 11px; background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}; font: 650 15px ${SANS}; cursor: pointer">Two cards</button></div></div>`
  + tx('Not it? The computer shows every photo, card by card.', 'font-size: 13.5px');
const c3Under = `<div style="display: flex; gap: 18px; align-items: center">${ring(51, 54)}<div style="display: flex; flex-direction: column; gap: 4px"><b style="font: 700 20px ${SANS}">3 missing</b>${tx('Some cards weren’t in any photo, or couldn’t be read.', 'font-size: 14px')}</div></div>`
  + `<div style="display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 12px; background: ${C.bg2}; border: 1px solid ${C.line}"><b style="font: 650 15px ${SANS}">Most likely</b>${[['Skewer the Critics', '3 of 4'], ['Sunbaked Canyon', '1 of 2']].map(([n, t]) => `<div style="display: flex; justify-content: space-between; font: 500 14.5px ${SANS}"><span>${n}</span><span style="color: ${C.dim}">${t}</span></div>`).join('')}<span style="font: 400 13px/1.4 ${SANS}; color: ${C.dim}">Playsets that came out uneven. And 1 title line couldn’t be read.</span></div>`;
skriv('C3.dc.html', telefon('C3: done — does it add up',
  `<sc-if value="{{lika}}" hint-placeholder-val="{{false}}">${c3Lika}</sc-if><sc-if value="{{for}}" hint-placeholder-val="{{true}}">${c3For}</sc-if><sc-if value="{{under}}" hint-placeholder-val="{{false}}">${c3Under}</sc-if>`,
  `<sc-if value="{{under}}" hint-placeholder-val="{{false}}">${btn('Photograph the missing ones', 'prim', ik.camera())}</sc-if>`
  + `<sc-if value="{{lika}}" hint-placeholder-val="{{false}}">${btn('Open the deck on the computer', 'prim', ik.laptop())}</sc-if>`
  + `<sc-if value="{{inteLika}}" hint-placeholder-val="{{true}}">${btn('Fix it on the computer', 'sek', ik.laptop())}</sc-if>`,
  { props: { utfall: { editor: 'enum', options: ['1 too many', '3 missing', 'It adds up'], default: '1 too many' } },
    logic: `const u = this.props.utfall ?? '1 too many';\nreturn { lika: u === 'It adds up', for: u === '1 too many', under: u === '3 missing', inteLika: u !== 'It adds up' };` }));

/* ── index ── */
const PW = 390, PH = 844, DW = 1440, DH = 900, GX = 80, RAD = 223 + 120;
const rader = [
  { y: 0, bord: [['Idag1', 'Today · photo read', 'p'], ['Idag2', 'Today · Done', 'p']] },
  { y: PH + RAD, bord: [['Main', 'A1 · Photo read: overlap counted once', 'p'], ['A2', 'A2 · Done: the summary', 'p'], ['A3', 'A3 · The whole list', 'p'], ['A4', 'A4 · Computer: one card or two?', 'd']] },
  { y: 2 * (PH + RAD), bord: [['B1', 'B1 · Lay out: overlap is fine', 'p'], ['B2', 'B2 · Photo 2 stitched on', 'p'], ['B3', 'B3 · Computer: the table, stitched', 'd']] },
  { y: 3 * (PH + RAD) + (DH - PH), bord: [['C1', 'C1 · How big is the deck?', 'p'], ['C2', 'C2 · Counting along', 'p'], ['C3', 'C3 · Done: does it add up? (Tweaks: outcome)', 'p']] },
];
const boards = {}, order = [];
const notes = {
  rIdag: { x: 0, y: -260, text: 'Today', kind: 'title1', maxW: 2 * PW + GX },
  rA: { x: 0, y: rader[1].y - 260, text: 'A · Glance on the phone, fix on the computer', kind: 'title1', maxW: 3 * (PW + GX) + DW },
  rB: { x: 0, y: rader[2].y - 260, text: 'B · Stitch the photos into one table', kind: 'title1', maxW: 2 * (PW + GX) + DW },
  rC: { x: 0, y: rader[3].y - 260, text: 'C · Say the count first', kind: 'title1', maxW: 3 * PW + 2 * GX },
};
for (const r of rader) {
  let x = 0;
  for (const [namn, titel, typ] of r.bord) {
    const w = typ === 'd' ? DW : PW, h = typ === 'd' ? DH : PH;
    const e = { x, y: r.y, w, h, title: titel };
    if (namn === 'C3') e.is_interactive = false;
    boards[namn + '.dc.html'] = e; order.push(namn + '.dc.html');
    x += w + GX;
  }
}
/* A först så att Main blir ingången. */
const canvas = { v: 3, createdOnFiles: { v: 1, at: new Date().toISOString().replace(/\.\d+Z$/, 'Z') }, title: 'Mesa Deck Photo Review', launch: { view: 'canvas' }, pages: [], boards, order, notes, designSystems: [] };
for (const [n, h] of Object.entries(filer)) fs.writeFileSync(path.join(OUT, n), h);
fs.writeFileSync(path.join(OUT, 'canvas.json'), JSON.stringify(canvas, null, 1));
console.log(Object.keys(filer).join(' '));

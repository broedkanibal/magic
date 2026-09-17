// Bygger designytan "Mesa Deck Builder" (MES-146): dagens lekdialog och tre
// varianter (A egen sida, B låda vid kanten, C skanningsbordet) plus
// telefonens tre skärmar. Mått, färger och knappar ur index.html (.btn,
// .modal, .lekmodal, .lekrad, topbaren); manasymbolerna läses ur MANA_SVG i
// index.html så att de är Wizards egna. Kör: node gen.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HER = dirname(fileURLToPath(import.meta.url));
const UT = join(HER, 'artboards');
mkdirSync(UT, { recursive: true });

/* ── manasymbolerna ur appen, som data-URI-klasser ─────────────────── */
const idx = readFileSync(join(HER, '..', 'index.html'), 'utf8');
const MANA = {};
for (const c of 'WUBRGC') {
  const m = idx.match(new RegExp('^  ' + c + ': ("(?:[^"\\\\]|\\\\.)*")', 'm'));
  if (!m) throw new Error('MANA_SVG saknar ' + c);
  MANA[c] = JSON.parse(m[1]);
}
const PIPCSS = Object.entries(MANA).map(([c, svg]) =>
  `.p${c}{background-image:url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}")}`).join('\n');

/* ── ikoner (streck, 24-rutnät) ─────────────────────────────────────── */
const I = {
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"></rect><path d="M11 18h2"></path>',
  paste: '<rect x="5" y="4" width="14" height="17" rx="2"></rect><path d="M9 4.5V3h6v1.5"></path><path d="M8.5 10h7M8.5 13.5h7M8.5 17h4"></path>',
  type: '<rect x="2.5" y="6" width="19" height="12" rx="2"></rect><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M7.5 14h9"></path>',
  camera: '<path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"></path><circle cx="12" cy="13" r="3.5"></circle>',
  back: '<path d="m15 18-6-6 6-6"></path>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"></path><path d="m13.5 6.5 4 4"></path>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"></path>',
  plus: '<path d="M12 5v14M5 12h14"></path>',
  minus: '<path d="M5 12h14"></path>',
  x: '<path d="M6 6l12 12M18 6 6 18"></path>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"></rect><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"></path>',
  search: '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.6-3.6"></path>',
  warn: '<path d="M12 3.5 2.8 19.5h18.4z"></path><path d="M12 10v4.5M12 17v.01"></path>',
  undo: '<path d="M9 14 4 9l5-5"></path><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"></path>',
  down: '<path d="m6 9 6 6 6-6"></path>',
  photo: '<rect x="3" y="4.5" width="18" height="15" rx="2"></rect><circle cx="8.5" cy="9.5" r="1.8"></circle><path d="m21 15-5-5-8 9"></path>',
  swap: '<path d="M7 7h11l-3-3M17 17H6l3 3"></path>',
  help: '<circle cx="12" cy="12" r="9.2"></circle><path d="M9.3 9.3a2.8 2.8 0 1 1 3.4 3.4v1.1"></path><path d="M12 17.2v.01"></path>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"></path><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"></path>',
  box: '<path d="M3.5 8 12 4l8.5 4v8L12 20l-8.5-4z"></path><path d="M3.5 8 12 12l8.5-4M12 12v8"></path>',
};
const ic = (n, s = 16, w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const DOTS = s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"></circle><circle cx="12" cy="12" r="1.7"></circle><circle cx="19" cy="12" r="1.7"></circle></svg>`;
const LOGO = '<svg width="18" height="18" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2.6 28.2 9.2 16 15.8 3.8 9.2Z" fill="none" stroke="#6b8cff" stroke-width="2.1" stroke-linejoin="round"></path><path d="M16 16.6 28.2 23.2 16 29.8 3.8 23.2Z" fill="#f0a52a"></path></svg>';

/* ── korten (påhittad exempellek) ──────────────────────────────────── */
const K = {
  swiftspear: { n: 'Monastery Swiftspear', t: 'Creature — Human Monk', m: 'R', img: 'swiftspear.jpg' },
  pikemaster: { n: 'Faithful Pikemaster', t: 'Creature — Rhino Monk Soldier', m: '2W', img: 'pikemaster.jpg' },
  danitha: { n: 'Danitha Capashen, Paragon', t: 'Legendary Creature — Human Knight', m: '2W', img: 'danitha.jpg' },
  phoenix: { n: 'Arclight Phoenix', t: 'Creature — Phoenix', m: '3R', img: 'phoenix.jpg' },
  serra: { n: 'Serra Angel', t: 'Creature — Angel', m: '3WW', img: 'serra.jpg' },
  siege: { n: 'Siege-Gang Commander', t: 'Creature — Goblin', m: '3RR', img: 'siege.jpg' },
  bolt: { n: 'Lightning Bolt', t: 'Instant', m: 'R', img: 'bolt.jpg' },
  helix: { n: 'Lightning Helix', t: 'Instant', m: 'RW', fa: 'linear-gradient(160deg,#9a5a2c,#2c1a10)' },
  charm: { n: 'Boros Charm', t: 'Instant', m: 'RW', fa: 'linear-gradient(160deg,#8a3f2e,#2a1512)' },
  blade: { n: 'Ancestral Blade', t: 'Artifact — Equipment', m: '1W', img: 'blade.jpg' },
  anthem: { n: 'Glorious Anthem', t: 'Enchantment', m: '1WW', img: 'anthem.jpg' },
  mountain: { n: 'Mountain', t: 'Basic Land — Mountain', m: '', img: 'mountain.jpg' },
  plains: { n: 'Plains', t: 'Basic Land — Plains', m: '', img: 'plains.jpg' },
  island: { n: 'Island', t: 'Basic Land — Island', m: '', img: 'island.jpg' },
  swamp: { n: 'Swamp', t: 'Basic Land — Swamp', m: '', img: 'swamp.jpg' },
  forest: { n: 'Forest', t: 'Basic Land — Forest', m: '', img: 'forest.jpg' },
  sascendant: { n: 'Serra Ascendant', t: 'Creature — Human Monk Avatar', m: 'W', fa: 'linear-gradient(160deg,#b8a980,#3a3226)' },
  sbenev: { n: 'Serra the Benevolent', t: 'Legendary Planeswalker — Serra', m: '2WW', fa: 'linear-gradient(160deg,#c9b98e,#41382a)' },
  sparagon: { n: 'Serra Paragon', t: 'Creature — Angel', m: '3W', fa: 'linear-gradient(160deg,#a99f86,#302b22)' },
  ssanctum: { n: "Serra's Sanctum", t: 'Legendary Land', m: '', fa: 'linear-gradient(160deg,#8f8a78,#26241e)' },
  lstrike: { n: 'Lightning Strike', t: 'Instant', m: '1R', fa: 'linear-gradient(160deg,#a4502a,#2e160c)' },
  foundry: { n: 'Sacred Foundry', t: 'Land — Mountain Plains', m: '', fa: 'linear-gradient(160deg,#7a4a36,#241814)' },
  lgreaves: { n: 'Lightning Greaves', t: 'Artifact — Equipment', m: '2', fa: 'linear-gradient(160deg,#7d7a74,#24221f)' },
};
const MC = { W: '#F8F6D8', U: '#C1D7E9', B: '#CAC5C0', R: '#E49977', G: '#A3C095' };
const tecken = m => (m.match(/\d+|[WUBRGC]/g) || []);
const cost = (m, s = 13) => `<span class="pips">${tecken(m).map(t => /\d/.test(t)
  ? `<i class="pip pN" style="width:${s}px;height:${s}px;font-size:${Math.round(s * .66)}px">${t}</i>`
  : `<i class="pip p${t}" style="width:${s}px;height:${s}px"></i>`).join('')}</span>`;
const pips = (f, s = 13) => `<span class="pips">${[...f].map(c => `<i class="pip p${c}" style="width:${s}px;height:${s}px"></i>`).join('')}</span>`;
const hc = w => Math.round(w * 1.395);

function cf(c, w, h) {
  const dots = tecken(c.m).map(t => `<i style="background: ${/\d/.test(t) ? '#CAC5C0' : MC[t]}"></i>`).join('');
  return `<div class="cf" style="width:${w}px;height:${h}px;font-size:${(w / 11).toFixed(2)}px"><i class="fn"><span class="fnn">${c.n}</span><em class="mc">${dots}</em></i><i class="fa" style="background: ${c.fa}"></i><i class="ft">${c.t}</i><i class="fx"></i></div>`;
}
const face = (k, w, extra = '') => {
  const c = K[k], h = hc(w);
  return c.img ? `<img class="kf" src="${c.img}" alt="" style="width:${w}px;height:${h}px${extra}">` : cf(c, w, h);
};

/* En hög: kopior som lager bakom, antal i hörnet. */
function pile(k, n, { w = 104, st = '', lab = true, hover = '' } = {}) {
  const h = hc(w);
  if (k === 'unread') {
    return `<div class="pw"><div class="pile ul" style="width:${w}px;height:${h}px"><img class="strip" src="anthem.jpg" alt="" style="filter:blur(.7px) saturate(.7) brightness(.8)"><span class="ult">Couldn’t read the name</span><span class="btn sm">Type it</span><span class="chkb">Check</span></div>${lab ? '<span class="plab dim">From photo 2</span>' : ''}</div>`;
  }
  const lag = n > 2 ? '<i class="pl l2"></i><i class="pl l1"></i>' : n > 1 ? '<i class="pl l1"></i>' : '';
  const ring = st === 'ny' ? '<i class="nyr"></i><span class="nyb">New</span>' : st === 'chk' ? '<i class="chr"></i><span class="chkb">Check</span>' : '';
  return `<div class="pw${st ? ' ' + st : ''}"><div class="pile" style="width:${w}px;height:${h}px">${lag}${face(k, w)}${n ? `<span class="cnt">${n}</span>` : ''}${ring}${hover}</div>${lab ? `<span class="plab">${K[k].n}</span>` : ''}</div>`;
}

/* ── QR-kod (attrapp: sökmönster + brus) ───────────────────────────── */
function qr(size, frö = 7) {
  const n = 25; let s = frö; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let r = '';
  const fyndig = (x, y) => (x < 8 && y < 8) || (x > 16 && y < 8) || (x < 8 && y > 16);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fyndig(x, y) && rnd() < .5) r += `<rect x="${x}" y="${y}" width="1" height="1"></rect>`;
  const f = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"></rect><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#e7ecf4"></rect><rect x="${x + 2}" y="${y + 2}" width="3" height="3"></rect>`;
  return `<span class="qr"><svg width="${size}" height="${size}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" fill="#0d1015" aria-label="QR code">${r}${f(0, 0)}${f(18, 0)}${f(0, 18)}</svg></span>`;
}

/* ── läggningsguiden (animerad) ────────────────────────────────────── */
// Två omgångar à cols×rows kort på 18 s: korten läggs i kolumner där bara
// namnraden syns, ramen fäller ut, blixten går, "Photo N" bockas av, korten
// skjuts undan och nästa omgång läggs. Stegen tänds i takt.
const GIMG_A = ['swiftspear.jpg', 'pikemaster.jpg', 'danitha.jpg', 'bolt.jpg', 'blade.jpg', 'anthem.jpg', 'phoenix.jpg'];
const GIMG_B = ['serra.jpg', 'siege.jpg', 'phoenix.jpg', 'bolt.jpg', 'anthem.jpg', 'swiftspear.jpg', 'danitha.jpg'];
function guide({ id = 'g', cols, rows, w, off, gap, steps = 'under', pad = 16, compact = false }) {
  const h = hc(w), N = cols * rows;
  const W = cols * w + (cols - 1) * gap, H = h + (rows - 1) * off;
  const p = x => (Math.round(x * 1000) / 1000) + '%';
  let css = '', kort = '';
  for (let b = 0; b < 2; b++) {
    const bas = b * 50, bilder = b ? GIMG_B : GIMG_A;
    for (let k = 0; k < N; k++) {
      const c = Math.floor(k / rows), r = k % rows;
      const x = c * (w + gap), y = r * off;
      const dx = Math.round(W / 2 - x - w / 2), dy = Math.round(H + h - y);
      const t = bas + 2 + k * (26 / N);
      const start = `translate(${dx}px,${dy}px) rotate(-9deg) scale(1.05)`;
      const ut = `translate(${Math.round(W * .55)}px,-6px) rotate(5deg)`;
      const namn = `${id}${b}_${k}`;
      css += `@keyframes ${namn}{0%{opacity:0;transform:${start}}${p(t)}{opacity:0;transform:${start};animation-timing-function:cubic-bezier(.2,.8,.3,1)}${p(t + .5)}{opacity:1}${p(t + 2.2)}{opacity:1;transform:none}${p(bas + 42)}{opacity:1;transform:none;animation-timing-function:cubic-bezier(.5,0,.8,.5)}${p(bas + 46)}{opacity:0;transform:${ut}}100%{opacity:0;transform:${ut}}}\n`;
      kort += `<div class="gk" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:${b * 100 + k + 1};animation-name:${namn};animation-duration:{{cyk}}"><img src="${bilder[(k * 3 + b) % bilder.length]}" alt=""></div>`;
    }
  }
  css += `@keyframes ${id}fr{0%,29%{opacity:0;transform:scale(1.08)}31.5%{opacity:1;transform:none}37%{opacity:1;transform:none}38.5%,79%{opacity:0;transform:scale(1.08)}81.5%{opacity:1;transform:none}87%{opacity:1;transform:none}88.5%,100%{opacity:0;transform:scale(1.08)}}
@keyframes ${id}fl{0%,33.5%{opacity:0}34%{opacity:.85}36%,83.5%{opacity:0}84%{opacity:.85}86%,100%{opacity:0}}
@keyframes ${id}c0{0%,34.5%{opacity:0;transform:translateY(6px)}35.5%{opacity:1;transform:none}41%{opacity:1;transform:none}42.5%,100%{opacity:0;transform:none}}
@keyframes ${id}c1{0%,84.5%{opacity:0;transform:translateY(6px)}85.5%{opacity:1;transform:none}91%{opacity:1;transform:none}92.5%,100%{opacity:0;transform:none}}
@keyframes ${id}l0{0%,48.5%{opacity:1}50%,98.5%{opacity:0}100%{opacity:1}}
@keyframes ${id}l1{0%,48.5%{opacity:0}50%,98.5%{opacity:1}100%{opacity:0}}
@keyframes ${id}s1{0%,29%{opacity:1}31%,49%{opacity:.38}50%,79%{opacity:1}81%,99%{opacity:.38}100%{opacity:1}}
@keyframes ${id}s2{0%,29%{opacity:.38}31%,40%{opacity:1}42%,79%{opacity:.38}81%,90%{opacity:1}92%,100%{opacity:.38}}
@keyframes ${id}s3{0%,40%{opacity:.38}42%,49%{opacity:1}50.5%,90%{opacity:.38}92%,99%{opacity:1}100%{opacity:.38}}
`;
  const an = n => `animation-name:${id}${n};animation-duration:{{cyk}}`;
  const top = compact ? 26 : 32, bot = compact ? 38 : 46;
  const yta = `<div class="gsurf" style="width:${W + pad * 2}px;height:${H + top + bot}px">
    <span class="glab" style="${an('l0')}">${ic('camera', 12)}Photo 1</span><span class="glab" style="${an('l1')}">${ic('camera', 12)}Photo 2</span>
    <div class="garea" style="left:${pad}px;top:${top}px;width:${W}px;height:${H}px">${kort}
      <div class="gfr" style="${an('fr')}"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i></div>
    </div>
    <div class="gfl" style="${an('fl')}"></div>
    <span class="gch" style="${an('c0')}">${ic('check', 13, 2.6)}Photo 1 taken</span><span class="gch" style="${an('c1')}">${ic('check', 13, 2.6)}Photo 2 taken</span>
  </div>`;
  const stegen = steps ? `<div class="gsteps${steps === 'row' ? ' row' : ''}${compact ? ' compact' : ''}">
    <div class="gstep" style="${an('s1')}"><span class="gn">1</span><span><b>Lay the cards in columns</b>, overlapping, so only the name line shows.</span></div>
    <div class="gstep" style="${an('s2')}"><span class="gn">2</span><span><b>Shoot straight from above</b> with every name inside the frame.</span></div>
    <div class="gstep" style="${an('s3')}"><span class="gn">3</span><span><b>Move them aside</b>, lay out the next ones and take another photo.</span></div>
  </div>` : '';
  return { css, html: yta, steg: stegen, W: W + pad * 2 };
}

/* ── bas-CSS: appens tokens och delar ──────────────────────────────── */
const BASE = `
:root{
  --bg:#0d1015; --bg2:#141922; --bg3:#1b2230; --bg4:#232c3c;
  --line:#28313f; --txt:#e7ecf4; --dim:#93a1b6; --dim2:#66748a;
  --acc:#f0a52a; --acc-d:#8a5d10; --blue:#6b8cff; --red:#e2606a; --green:#57c785;
  --zonlbl:#5c6b82; --zonlinje:#1c2330; --panelram:#333e50; --panelram2:#3d4a5f; --pa-acc:#ffd98a; --pa-acc2:#c9b485;
  --r:10px; --rs:7px;
  --shadow:0 8px 28px -8px #000a, 0 2px 6px #0006;
  --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
}
*{box-sizing:border-box}
body{margin:0;background:#0d1015;color:#e7ecf4;font:14px/1.45 var(--sans);-webkit-font-smoothing:antialiased}
a{color:#6b8cff} a:hover{color:#8fa8ff}
button{font:inherit;color:inherit;cursor:pointer;background:none;border:0;padding:0;text-align:inherit}
p{margin:0}
kbd{display:inline-block;min-width:17px;text-align:center;padding:1px 5px;border-radius:4px;background:#212a38;border:1px solid #333e50;border-bottom-width:2px;font:11px/1.5 var(--mono);color:#b9c6d8}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;padding:0 11px;border-radius:var(--rs);background:var(--bg3);border:1px solid var(--line);color:var(--dim);font-size:12.5px;font-weight:500;white-space:nowrap;transition:background .12s,color .12s,border-color .12s}
.btn:hover{background:var(--bg4);color:var(--txt);border-color:#3b485c}
.btn.prim{background:var(--acc);color:#20160a;border-color:var(--acc);font-weight:650}
.btn.prim:hover{background:#ffb943;color:#20160a}
.btn.ghost{background:transparent;border-color:transparent}
.btn.ghost:hover{background:var(--bg3)}
.btn.sm{height:26px;padding:0 8px;font-size:11.5px}
.btn.big{height:38px;padding:0 18px;font-size:13.5px;border-radius:9px}
.btn.fara:hover{background:#3a1f22;color:#ff9099;border-color:#5e2b30}
.btn.dis{opacity:.45;pointer-events:none}
.grow{flex:1;min-width:0}
.vr{width:1px;height:20px;background:var(--line);flex:none}
.dim{color:var(--dim)} .dim2{color:var(--dim2)}
.pip{display:inline-block;width:13px;height:13px;flex:none;border-radius:50%;background-position:center;background-size:100% 100%;background-repeat:no-repeat}
.pN{display:inline-grid;place-items:center;background:#CAC5C0;color:#0d0f0f;font-weight:700;font-family:var(--sans);line-height:1;font-style:normal}
${PIPCSS}
.pips{display:inline-flex;gap:2px;flex:none;align-items:center}
.zonlbl{font:600 9.5px/1 var(--sans);letter-spacing:.9px;text-transform:uppercase;color:var(--zonlbl);white-space:nowrap}
.zr{display:flex;align-items:center;gap:8px;min-width:0}
.zr .zl{flex:1;height:1px;background:var(--zonlinje);min-width:8px}
.zr .zn{font:600 10.5px var(--mono);color:var(--dim2)}
.zr .zonlbl{color:var(--dim)}
/* topbaren (appens) */
.topbar{display:flex;align-items:center;gap:10px;height:46px;flex:none;padding:0 12px;background:linear-gradient(#161c26,#11161e);border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:8px;font-weight:700;font-size:13.5px;letter-spacing:.2px;padding-right:4px}
.spelknapp{display:inline-flex;align-items:center;gap:8px;flex:none;height:30px;padding:0 9px;border-radius:var(--rs);background:#f0a52a14;border:1px dashed #e8b33a66}
.spelknapp .kod{font:700 12.5px var(--mono);letter-spacing:2px;color:var(--acc)}
.spelknapp .delare{width:1px;height:14px;background:#e8b33a44;flex:none}
.spelknapp .bjud{display:inline-flex;align-items:center;gap:5px;flex:none;font-size:11.5px;color:#c9a45e}
.ptab{position:relative;display:flex;align-items:center;gap:7px;height:30px;padding:0 9px 0 8px;border-radius:var(--rs);border:1px solid transparent;color:var(--dim);font-size:12.5px;font-weight:550;white-space:nowrap}
.ptab.jag.on{background:linear-gradient(#f0a52a2b,#f0a52a2b),#1a212c;border-color:#f0a52a99;color:#ffdfae}
.ptab.jag.on::after{content:'';position:absolute;left:7px;right:7px;bottom:2px;height:2px;border-radius:2px;background:var(--acc)}
.ptab .num{display:inline-block;min-width:17px;text-align:center;padding:1px 4px;border-radius:4px;background:#f0a52a2b;border:1px solid #f0a52a55;border-bottom-width:2px;font:11px/1.4 var(--mono);color:var(--pa-acc)}
.ptab .dot{width:8px;height:8px;border-radius:50%;flex:none;box-shadow:0 0 0 2px #0004 inset}
.ptab .jagmark{flex:none;font:9.5px/1 var(--sans);font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--acc);background:#f0a52a24;border-radius:20px;padding:3.5px 5px}
.deckbtn{display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 9px 0 8px;border-radius:var(--rs);background:var(--bg3);border:1px solid var(--line);color:var(--txt);font:550 12.5px var(--sans);white-space:nowrap}
.deckbtn.on{background:var(--bg4);border-color:#4a5a72}
.deckbtn .cnt2{font:11.5px/1 var(--mono);color:var(--dim)}
.deckbtn .cnt2 b{color:var(--txt);font-weight:600}
.campill{display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 9px 0 10px;border-radius:var(--rs);border:1px solid transparent;font:550 12.5px var(--sans);white-space:nowrap}
.campill .led{width:7px;height:7px;border-radius:50%;flex:none}
.campill.pa{background:#0f2016;border-color:#2f6b47;color:#8fe0b0}
.campill.pa .led{background:var(--green);box-shadow:0 0 0 3px #57c78526}
.tbback{display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 10px 0 6px;border-radius:var(--rs);color:var(--dim);font-size:12.5px;font-weight:550}
.tbback:hover{background:var(--bg3);color:var(--txt)}
.tbback .kod{font:700 11.5px var(--mono);letter-spacing:1.6px;color:var(--acc)}
.tbtit{font:650 13.5px var(--sans);color:var(--txt)}
.matta{position:relative;overflow:hidden;border-radius:12px;background:radial-gradient(1250px 620px at 46% 26%, #18232f, #0a0f14 72%);box-shadow:inset 0 0 90px 20px #00000066, 0 0 0 1px var(--line)}
.hints{flex:none;display:flex;align-items:center;gap:14px;height:30px;padding:0 12px;background:#0b0f15;border-top:1px solid var(--line);font-size:11.5px;color:var(--dim2);white-space:nowrap}
.hints span{display:flex;align-items:center;gap:5px}
.hints kbd{font-size:10px}
/* kortens platshållare */
.cf{position:relative;display:flex;flex-direction:column;gap:.26em;padding:.42em;border-radius:.55em;background:#16140f;overflow:hidden}
.cf i{display:block;font-style:normal}
.cf .fn{flex:none;display:flex;align-items:center;gap:.35em;height:1.9em;padding:0 .45em;border-radius:.3em;background:#efe8d6;border:1px solid #b9b09a;font:600 .8em/1 Georgia,"Times New Roman",serif;color:#1a1712}
.cf .fnn{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cf .mc{display:flex;gap:.14em;flex:none;font-style:normal}
.cf .mc i{width:.8em;height:.8em;border-radius:50%;box-shadow:inset 0 0 0 1px #0006}
.cf .fa{flex:0 0 43%;border-radius:.18em;border:1px solid #0007}
.cf .ft{flex:none;height:1.9em;padding:0 .6em;border-radius:.3em;background:#efe8d6;border:1px solid #b9b09a;font:600 .6em/1.9em Georgia,serif;color:#1a1712;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cf .fx{flex:1;border-radius:.18em;background:#f3eee2}
.kf{display:block;border-radius:5px;object-fit:cover;background:#11161e}
/* högar */
.pw{display:flex;flex-direction:column;gap:7px;flex:none;position:relative}
.pile{position:relative;flex:none}
.pile .pl{position:absolute;inset:0;border-radius:5px;background:#1b1f26;border:1px solid #39414e}
.pile .l1{transform:translate(3px,-3px)}
.pile .l2{transform:translate(6px,-6px)}
.pile .kf,.pile .cf{position:absolute;left:0;top:0;box-shadow:0 6px 16px -6px #000c}
.cnt{position:absolute;z-index:3;right:-10px;top:3px;min-width:28px;height:20px;padding:0 6px;border-radius:10px;background:#0b1017;border:1px solid #4a5a72;font:700 11px/18px var(--mono);color:#e7ecf4;text-align:center;box-shadow:0 4px 10px -3px #000c}
.plab{font:12px/1.25 var(--sans);color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.nyr{position:absolute;inset:-4px;border-radius:8px;border:2px solid #57c785aa;box-shadow:0 0 18px 1px #57c78540;pointer-events:none;z-index:2}
.nyb{position:absolute;left:-7px;top:-9px;z-index:4;height:18px;padding:0 7px;border-radius:9px;background:#0f2016;border:1px solid #2f6b47;color:#8fe0b0;font:650 10px/16px var(--sans)}
.pw.ny .pile{animation:nyLand .6s cubic-bezier(.2,.8,.3,1) both}
@keyframes nyLand{from{opacity:0;transform:translateY(-24px) scale(1.08)}to{opacity:1;transform:none}}
.chr{position:absolute;inset:-4px;border-radius:8px;border:2px solid var(--acc);box-shadow:0 0 0 4px #f0a52a22;pointer-events:none;z-index:2}
.chkb{position:absolute;left:50%;bottom:-10px;translate:-50% 0;z-index:4;height:20px;padding:0 8px;border-radius:10px;background:#241c0d;border:1px solid var(--acc);color:#ffd98a;font:650 10.5px/18px var(--sans);white-space:nowrap}
.pile.ul{display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px 6px;border-radius:6px;border:1.5px dashed #e8b33a99;background:#0b0f1599;text-align:center}
.pile.ul .strip{height:26px}
.ult{font:11.5px/1.35 var(--sans);color:#e8c98a}
/* fält, förslag, stegare */
.fld{display:flex;align-items:center;gap:9px;height:38px;padding:0 12px;background:#0e131b;border:1px solid var(--panelram);border-radius:var(--rs);font-size:14px;color:var(--txt);min-width:0}
.fld.fok{border-color:var(--acc);box-shadow:0 0 0 3px #f0a52a1f}
.fld .ph{color:var(--dim2)}
.fld .ic{display:inline-flex;color:var(--dim2);flex:none}
.caret{display:inline-block;width:1.5px;height:17px;background:var(--acc);margin-left:1px;vertical-align:middle;animation:blink 1.05s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.sug{padding:4px;background:#151b25;border:1px solid var(--panelram);border-radius:var(--r);box-shadow:var(--shadow);display:flex;flex-direction:column;gap:1px}
.sug .si{display:flex;align-items:center;gap:10px;padding:6px 9px;border-radius:6px;font-size:13.5px;color:var(--dim);min-width:0}
.sug .si.on{background:var(--bg4);color:var(--txt)}
.sug .si .sn{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1}
.sug .si .sn b{font-weight:550;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sug .si .sn span{font-size:11.5px;color:var(--dim2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sug mark{background:none;color:var(--acc);font-weight:650}
.sug .th{flex:none;width:28px;height:39px;border-radius:3px;overflow:hidden}
.sug .th .kf,.sug .th .cf{width:28px!important;height:39px!important}
.sug .hk{flex:none;font:10.5px var(--mono);color:var(--dim2)}
.sug .sfot{padding:7px 9px 5px;border-top:1px solid var(--line);margin-top:3px;font:11.5px var(--sans);color:var(--dim2);display:flex;gap:12px}
.stp{display:inline-flex;align-items:center;height:26px;border-radius:7px;border:1px solid var(--line);background:#0e131b;flex:none}
.stp span{width:24px;height:24px;display:grid;place-items:center;color:var(--dim)}
.stp b{min-width:20px;text-align:center;font:600 12.5px var(--mono);color:var(--txt)}
.stp.s{height:24px}
.stp.s span{width:22px;height:22px}
.stp.s b{min-width:18px;font-size:12px}
.seg{display:flex;gap:2px;padding:2px;border-radius:8px;background:#0b1017;border:1px solid var(--line)}
.seg span{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;height:28px;padding:0 10px;border-radius:6px;font:550 12px var(--sans);color:var(--dim);white-space:nowrap}
.seg span.on{background:#232c3c;color:var(--txt);box-shadow:inset 0 0 0 1px #4a5a72}
.lfchip{height:26px;display:inline-flex;align-items:center;gap:6px;padding:0 10px;border-radius:13px;border:1px solid var(--line);background:var(--bg3);font:12px var(--sans);color:var(--dim);white-space:nowrap}
.lfchip b{font:600 11px var(--mono);color:var(--dim2)}
.lfchip.on{background:#232c3c;border-color:#4a5a72;color:var(--txt)}
.lfchip .ic{display:inline-flex;color:var(--dim2)}
.kallor{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.kallor .kl{font:12px var(--sans);color:var(--dim2);margin-right:4px}
.lfchip .cx{display:inline-flex;color:var(--dim2);margin:0 -4px 0 1px;padding:2px;border-radius:4px}
.menu{padding:6px;border-radius:10px;background:#0b1017fa;border:1px solid var(--panelram2);box-shadow:0 16px 40px -12px #000f;display:flex;flex-direction:column;gap:2px;min-width:220px}
.menu .mi{display:flex;align-items:center;gap:9px;padding:7px 9px;border-radius:7px;font:12.5px/1.2 var(--sans);color:var(--txt);white-space:nowrap}
.menu .mi.hv{background:var(--bg3)}
.menu .mi.d{color:var(--dim)}
.menu .mi.fara{color:#ff9099}
.menu .mi .ic{display:inline-flex;color:var(--dim2)}
.menu hr{border:0;border-top:1px solid var(--line);margin:4px 2px}
.led{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px #57c78526;flex:none}
.led.vantar{background:var(--acc);box-shadow:0 0 0 3px #f0a52a26;animation:puls 1.6s ease-in-out infinite}
@keyframes puls{50%{box-shadow:0 0 0 6px #f0a52a10}}
.qr{padding:9px;border-radius:10px;background:#e7ecf4;display:inline-block;line-height:0;flex:none}
.mph{position:relative;flex:none;width:56px;height:40px;border-radius:5px;overflow:hidden;background:radial-gradient(60px 40px at 40% 30%,#26313c,#10151b);box-shadow:inset 0 0 0 1px #ffffff14}
.mph i{position:absolute;top:5px;width:9px;height:28px;border-radius:1.5px;background:repeating-linear-gradient(#d8d0bd 0 2px,#4a4034 2px 4.5px)}
.strip{display:block;width:100%;height:40px;object-fit:cover;object-position:50% 2.6%;border-radius:5px;filter:saturate(.75) brightness(.86) contrast(1.08) sepia(.14);transform:rotate(-.5deg)}
.pop{position:absolute;z-index:30;width:300px;padding:14px;border-radius:12px;background:#0f141cf8;border:1px solid #4a5a72;box-shadow:0 24px 50px -14px #000;display:flex;flex-direction:column;gap:10px}
.pop .ptag{font:600 9.5px/1 var(--sans);letter-spacing:.9px;text-transform:uppercase;color:var(--acc)}
.pop .plbl{font:11px/1 var(--sans);letter-spacing:.4px;text-transform:uppercase;color:var(--dim2)}
.pop h4{margin:0;font:650 15px/1.3 var(--sans);color:var(--txt)}
.pop .psub{font:12.5px/1.5 var(--sans);color:var(--dim)}
.pop .prow{display:flex;gap:8px;align-items:center}
.tool{position:absolute;z-index:30;display:flex;align-items:center;gap:4px;padding:5px;border-radius:9px;background:#0b1017f7;border:1px solid #4a5a72;box-shadow:0 16px 34px -12px #000;white-space:nowrap}
.tool .tb{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 9px;border-radius:6px;font:600 11.5px/1 var(--sans);color:var(--dim)}
.tool .tb.fara{color:#ff9099}
.tool .sep{width:1px;height:18px;background:var(--line)}
.snack{position:absolute;z-index:30;display:flex;align-items:center;gap:12px;height:40px;padding:0 8px 0 14px;border-radius:10px;background:#1b2230f5;border:1px solid #3d4a5f;box-shadow:0 18px 40px -14px #000;font:12.5px var(--sans);color:var(--txt);white-space:nowrap}
.lockrad{display:flex;gap:9px;align-items:flex-start;font:11.8px/1.55 var(--sans);color:var(--dim2)}
.lockrad .ic{display:inline-flex;color:#8fe0b0;margin-top:2px;flex:none}
.ta{border-radius:var(--rs);background:#0e131b;border:1px solid var(--panelram);padding:10px 12px;font:11.5px/1.62 var(--mono);color:#cfd9e8;white-space:pre;overflow:hidden}
.ta .ln{display:block}
.ta .ln.bad{color:#ff9099;background:#e2606a14;margin:0 -12px;padding:0 12px}
.ta .ln.fix{color:#ffd98a;background:#f0a52a12;margin:0 -12px;padding:0 12px}
.ta .ln.hd{color:var(--dim2)}
.prob{display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border-radius:8px;background:#0b1017;border:1px solid var(--line)}
.prob .pn{flex:none;font:600 10.5px/18px var(--mono);color:var(--dim2);min-width:34px}
.prob .pt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.prob code{font:11.5px/1.4 var(--mono);color:#cfd9e8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
.prob span{font:12px/1.4 var(--sans);color:var(--dim)}
.fchips{display:flex;gap:5px;flex-wrap:wrap;align-items:center}
.fchip{height:22px;display:inline-flex;align-items:center;gap:5px;padding:0 8px;border-radius:11px;border:1px solid var(--line);font:11.5px var(--sans);color:var(--dim2)}
.fchip.on{border-color:#2f6b47;background:#0f2016;color:#8fe0b0}
/* guiden */
.gsurf{position:relative;flex:none;border-radius:12px;background:radial-gradient(700px 360px at 46% 26%, #1a2530, #0b1016 75%);box-shadow:inset 0 0 40px 8px #00000066, 0 0 0 1px var(--line);overflow:hidden}
.garea{position:absolute}
.gk{position:absolute;animation-iteration-count:infinite;animation-fill-mode:both;animation-timing-function:linear}
.gk img{display:block;width:100%;height:100%;object-fit:cover;border-radius:4px;box-shadow:0 3px 8px -2px #000c}
.gfr{position:absolute;inset:-9px;pointer-events:none;z-index:300;animation-iteration-count:infinite;animation-fill-mode:both;animation-timing-function:linear}
.gfr i{position:absolute;width:18px;height:18px;border:2.5px solid #e7ecf4}
.gfr .c1{left:0;top:0;border-right:0;border-bottom:0;border-top-left-radius:6px}
.gfr .c2{right:0;top:0;border-left:0;border-bottom:0;border-top-right-radius:6px}
.gfr .c3{left:0;bottom:0;border-right:0;border-top:0;border-bottom-left-radius:6px}
.gfr .c4{right:0;bottom:0;border-left:0;border-top:0;border-bottom-right-radius:6px}
.gfl{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:310;animation-iteration-count:infinite;animation-fill-mode:both;animation-timing-function:linear}
.gch{position:absolute;left:50%;bottom:9px;translate:-50% 0;z-index:320;display:flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:13px;background:#0f2016f2;border:1px solid #2f6b47;color:#8fe0b0;font:650 11.5px var(--sans);white-space:nowrap;opacity:0;animation-iteration-count:infinite;animation-fill-mode:both;animation-timing-function:linear}
.glab{position:absolute;left:12px;top:10px;z-index:320;display:flex;align-items:center;gap:6px;font:600 9.5px/1 var(--sans);letter-spacing:.9px;text-transform:uppercase;color:var(--dim);animation-iteration-count:infinite;animation-fill-mode:both;animation-timing-function:linear}
.gsteps{display:flex;flex-direction:column;gap:9px}
.gsteps.row{flex-direction:row;gap:18px}
.gsteps.row .gstep{flex:1}
.gstep{display:flex;gap:10px;font:12.5px/1.5 var(--sans);color:var(--dim);animation-iteration-count:infinite;animation-fill-mode:both;animation-timing-function:linear}
.gstep b{color:var(--txt);font-weight:600}
.gstep .gn{flex:none;width:20px;height:20px;border-radius:50%;background:var(--acc);color:#20160a;font:700 11px/20px var(--mono);text-align:center;margin-top:1px}
.gsteps.compact{gap:6px}
.gsteps.compact .gstep{font-size:12px}
@media (prefers-reduced-motion: reduce){.gk{animation:none!important;opacity:1!important}.gfr,.gfl,.gch{animation:none!important}}
`;

/* ── dokumentet ────────────────────────────────────────────────────── */
function doc(css, body, anim) {
  const script = anim ? `<script data-dc-script data-props='{"speed":{"editor":"enum","options":["1×","½×","¼×"],"default":"1×","section":"Layout guide"}}'>
class Component extends DCLogic {
  renderVals() {
    const f = this.props.speed ?? '1×';
    return { cyk: f === '¼×' ? '72s' : f === '½×' ? '36s' : '18s' };
  }
}
</script>
` : '';
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
${BASE}
${css}
  </style>
</helmet>
${body}
</x-dc>
${script}</body>
</html>
`;
}
const skriv = (fil, css, body, anim = false) => {
  const html = doc(css, body, anim);
  writeFileSync(join(UT, fil), html);
  console.log(fil.padEnd(22), (html.length / 1024).toFixed(1) + ' kB');
};

/* ── delade bitar ──────────────────────────────────────────────────── */
const topbarSpel = (deckOn = false) => `<header class="topbar">
  <div class="brand">${LOGO}<span>Mesa</span></div>
  <div class="spelknapp"><span class="kod">BTB2TF</span><span class="delare"></span><span class="bjud">${ic('link', 12)}<span>Invite</span></span></div>
  <div class="vr"></div>
  <div class="ptab on jag"><span class="num">1</span><span class="dot" style="background:#f0a52a"></span><span class="nm">Jesper</span><span class="jagmark">you</span></div>
  <div class="grow"></div>
  <div class="deckbtn${deckOn ? ' on' : ''}">${pips('WR')}<span class="nm">Boros Blades</span><span class="cnt2"><b>36</b> cards</span><span style="display:inline-flex;color:var(--dim2)">${ic('down', 11, 2.4)}</span></div>
  <div class="campill pa"><span class="led"></span><span class="lbl">Camera · ready</span></div>
  <div class="vr"></div>
  <div class="btn ghost">${ic('help', 15)}</div>
  <div class="btn ghost">${DOTS(15)}</div>
</header>`;
const topbarSida = (titel) => `<header class="topbar">
  <div class="brand">${LOGO}<span>Mesa</span></div>
  <div class="vr"></div>
  <div class="tbback">${ic('back', 15, 2.2)}<span>Back to the table</span><span class="kod">BTB2TF</span></div>
  <div class="vr"></div>
  <span class="tbtit">${titel}</span>
  <div class="grow"></div>
  <div class="btn ghost">${ic('help', 15)}</div>
  <div class="btn ghost">${DOTS(15)}</div>
</header>`;

/* ════════════════════════════════════════════════════════════════════
   TODAY — dagens dialog, med lekväxlarens meny öppen
   ════════════════════════════════════════════════════════════════════ */
function today() {
  const css = `
#app{position:relative;width:1440px;height:900px;display:flex;flex-direction:column;background:var(--bg);overflow:hidden}
.brade{flex:1;min-height:0;display:grid;gap:10px;padding:10px;grid-template-columns:minmax(0,1fr) 360px}
.ov{position:absolute;inset:0;z-index:440;display:flex;flex-direction:column;background:#05070ae8;backdrop-filter:blur(7px)}
.modal{margin:auto;width:820px;height:774px;display:flex;flex-direction:column;background:#131924;border:1px solid #35415420;border-radius:14px;box-shadow:0 30px 80px -20px #000,0 0 0 1px #ffffff10;overflow:hidden;position:relative}
.modal header{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line)}
.modal header h2{margin:0;font-size:14.5px;font-weight:650;flex:1}
.modal header .close{width:26px;height:26px;border-radius:6px;color:var(--dim2);display:grid;place-items:center;line-height:0}
.modal .body{flex:1;min-height:0;padding:16px;overflow:hidden;display:flex;flex-direction:column;gap:13px}
.modal .foot{display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid var(--line);background:#0f141c}
.modal .foot .grow{white-space:nowrap;color:var(--dim2);font-size:12px}
.lekvalj{display:inline-flex;align-items:center;gap:7px;min-width:0;max-width:46%;margin-left:6px;padding:3px 9px 3px 7px;border-radius:20px;border:1px solid var(--acc);background:var(--bg3);color:var(--txt);font:600 12.5px/1 var(--sans)}
.lekvalj .chev{color:var(--dim2);font-size:10px}
.lekrakn{flex:none;padding:2px 9px;border-radius:20px;background:var(--bg3);border:1px solid var(--line);font:11.5px var(--mono);color:var(--dim)}
.lekvaljmeny{position:absolute;left:14px;top:46px;z-index:30;width:340px;padding:6px;border-radius:10px;background:#0b1017fa;border:1px solid var(--panelram2);box-shadow:0 16px 40px -12px #000f;display:flex;flex-direction:column;gap:2px}
.lekvaljrad{display:flex;align-items:center;gap:8px;width:100%;padding:7px 9px;border-radius:7px;color:var(--txt);font:12.5px/1.2 var(--sans)}
.lekvaljrad.on{background:#1c2433;outline:1px solid var(--acc)}
.lekvaljrad .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lekvaljrad .antal{font:11px var(--mono);color:var(--dim2)}
.lekvaljmeny hr{border:0;border-top:1px solid var(--line);margin:4px 2px}
.lekvaljmeny .akt{color:var(--dim)}
.lekvaljmeny .akt.fara{color:#ff9099}
.lekremsa{display:flex;gap:8px;padding:2px 2px 6px}
.lekfoto{position:relative;flex:none;width:104px;padding:6px;text-align:left;border-radius:9px;background:var(--bg3);border:1px solid var(--line);color:var(--dim)}
.lekfoto .mph{width:100%;height:56px}
.lekfoto .fikon{display:grid;place-items:center;height:56px;border-radius:5px;background:var(--bg);color:var(--dim2);font-size:20px}
.lekfoto .fnamn{display:block;margin-top:5px;font:600 11.5px var(--sans);color:var(--txt)}
.lekfoto .fant{display:block;font:11px var(--mono);color:var(--dim2)}
.lekfoto.lagg{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:96px;border-style:dashed}
.lekfoto.lagg .plus{font-size:22px;line-height:1}
.lekfoto.lagg span:last-child{font:11.5px var(--sans)}
.lekkvitto{margin:0;padding:9px 12px;border-radius:var(--rs);background:#241c0d;border:1px solid #4a3a17;font:12.5px/1.6 var(--sans);color:#e8c98a}
.lekkvitto b{color:var(--txt);font-weight:600}
.lekhd{display:flex;align-items:center;gap:8px}
.lekhjalp{font:11.5px var(--sans);color:var(--dim2)}
.presets{display:flex;gap:6px}
.presets .btn.on{background:var(--acc-d);color:#ffd98a;border-color:#7a5410}
.presets .btn.varn{border-color:var(--acc);color:var(--acc);background:#f0a52a12}
.leklista{height:414px;flex:none;overflow:hidden;border:1px solid var(--line);border-radius:10px;background:var(--bg);padding:5px;display:flex;flex-direction:column;gap:3px}
.lekrad{display:flex;align-items:center;gap:4px;border-radius:8px;border:1px solid transparent}
.lekrad.fel{border-color:#8a5d1066;background:#f0a52a0a}
.lekrad-hd{flex:1;min-width:0;display:flex;align-items:center;gap:10px;padding:5px 4px 5px 5px;border-radius:7px;text-align:left}
.lekrad .remsa{width:132px;height:34px;object-fit:cover;object-position:50% 2.6%;border-radius:4px;flex:none;background:#0c1017;box-shadow:0 2px 5px #0007;filter:saturate(.75) brightness(.86) sepia(.14)}
.lekrad .remsa.tom{background:none;box-shadow:none}
.lekrad .konst{width:40px;height:56px;object-fit:cover;border-radius:4px;flex:none;background:#0c1017;box-shadow:0 2px 5px #0007;overflow:hidden}
.lekrad .konst.tom{background:none;box-shadow:none;border:1px dashed var(--line)}
.lekrad .col{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.lekrad .nm{font-size:14px;font-weight:550;color:var(--txt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lekrad .ef{font:12px var(--sans);color:var(--dim2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lekrad.fel .nm{color:var(--acc)}
.lekrad.fel .ef{color:var(--pa-acc2)}
.lekrad .antal{flex:none;min-width:30px;text-align:right;font:600 13px var(--mono);color:var(--txt)}
.lekrad .chev{flex:none;width:14px;text-align:center;color:var(--dim2);font-size:16px;line-height:1}
.lekrad .bort{flex:none;width:28px;height:28px;border-radius:6px;color:var(--dim2);font-size:14px;line-height:1;display:grid;place-items:center}
.lekrad .steg{flex:none;width:26px;height:28px;border-radius:6px;color:var(--dim);font:700 15px/1 var(--sans);display:grid;place-items:center}
.leklagg{display:flex;flex-direction:column;gap:5px}
.leklagg label{font:12px var(--sans);color:var(--dim)}
`;
  const rad = (k, n, kalla) => `<div class="lekrad"><div class="lekrad-hd"><img class="remsa" src="${K[k].img}" alt=""><span class="konst">${face(k, 40)}</span><span class="col"><span class="nm">${K[k].n}</span><span class="ef">${kalla}</span></span><span class="antal">×${n}</span><span class="chev">›</span></div><span class="steg">−</span><span class="steg">+</span><span class="bort">✕</span></div>`;
  const fel = (k, namn, under, knapp, remsa = true, n = 1) => `<div class="lekrad fel"><div class="lekrad-hd">${remsa ? `<img class="remsa" src="${k ? K[k].img : 'anthem.jpg'}" alt=""${k ? '' : ' style="filter:blur(.8px) saturate(.6) brightness(.8)"'}>` : '<span class="remsa tom"></span>'}<span class="konst${k ? '' : ' tom'}">${k ? face(k, 40) : ''}</span><span class="col"><span class="nm">${namn}</span><span class="ef">${under}</span></span><span class="antal">×${n}</span></div><span class="btn sm">${knapp}</span><span class="steg">−</span><span class="steg">+</span><span class="bort">✕</span></div>`;
  const body = `<div id="app">
${topbarSpel()}
<main class="brade"><section class="matta"></section><aside></aside></main>
<footer class="hints"><span>Point at a card: <kbd>T</kbd> tap</span><span><kbd>G</kbd> graveyard</span><span><kbd>L</kbd> library</span><span><kbd>?</kbd> all shortcuts</span></footer>
<div class="ov">
  <div class="modal lekmodal">
    <header>
      <h2>My decks</h2>
      <span class="lekvalj">${pips('WR')}<span class="nm">Boros Blades</span><span class="chev">▾</span></span>
      <span class="lekrakn">36 cards</span>
      <span class="close">${ic('x', 14, 2.3)}</span>
    </header>
    <div class="lekvaljmeny">
      <div class="lekvaljrad on">${pips('WR')}<span class="nm">Boros Blades</span><span class="antal">36 cards</span></div>
      <div class="lekvaljrad">${pips('BG')}<span class="nm">Golgari Mill</span><span class="antal">60 cards</span></div>
      <div class="lekvaljrad">${pips('G')}<span class="nm">Elves</span><span class="antal">60 cards</span></div>
      <div class="lekvaljrad">${pips('UB')}<span class="nm">Blue-black flyers</span><span class="antal">60 cards</span></div>
      <hr>
      <div class="lekvaljrad akt">+ New deck</div>
      <div class="lekvaljrad akt">Rename this deck…</div>
      <div class="lekvaljrad akt">Forget learned photos…</div>
      <div class="lekvaljrad akt fara">Delete this deck…</div>
    </div>
    <div class="body lekbody">
      <div class="lekremsa">
        <div class="lekfoto"><span class="mph"><i style="left:8px"></i><i style="left:30px"></i><i style="left:52px"></i><i style="left:74px"></i></span><span class="fnamn">Photo 1</span><span class="fant">24 cards</span></div>
        <div class="lekfoto"><span class="mph"><i style="left:8px"></i><i style="left:30px"></i><i style="left:52px"></i></span><span class="fnamn">Photo 2</span><span class="fant">10 cards</span></div>
        <div class="lekfoto"><span class="fikon">✎</span><span class="fnamn">Typed in</span><span class="fant">2 cards</span></div>
        <div class="lekfoto lagg"><span class="plus">＋</span><span>Add a photo</span></div>
        <div class="lekfoto lagg"><span class="plus">▯</span><span>From your phone</span></div>
      </div>
      <p class="lekkvitto">Photo 2: <b>10 cards</b>, two of them unsure. Are there more cards on the table? Add the next photo.</p>
      <div class="lekhd"><div class="presets"><span class="btn sm on">All</span><span class="btn sm varn">To fix 2</span></div><span class="grow"></span><span class="lekhjalp">Click a card to see it large</span></div>
      <div class="leklista">
        ${rad('blade', 4, 'Photo 1')}
        ${rad('phoenix', 3, 'Photo 1')}
        ${rad('danitha', 2, 'Photo 1')}
        ${rad('pikemaster', 4, 'Photo 1')}
        ${rad('anthem', 3, 'Photo 1')}
        ${rad('bolt', 4, 'Photo 1')}
        ${fel('siege', '“Siege-Gang Commandr”', 'Closest card is Siege-Gang Commander — is that right?', 'Confirm', true, 2)}
        ${fel('', 'The name could not be read', 'The title line is in the strip — type the name', 'Type the name')}
      </div>
      <div class="leklagg"><label>Missing a card? Type its name.</label></div>
    </div>
    <div class="foot"><span class="grow">2 cards to fix</span><span class="btn">Close</span><span class="btn prim">Save 36 cards</span></div>
  </div>
</div>
</div>`;
  skriv('Today.dc.html', css, body);
}

/* ════════════════════════════════════════════════════════════════════
   A — egen sida för lekarna
   ════════════════════════════════════════════════════════════════════ */
const A_CSS = `
.pg{position:relative;width:1440px;height:900px;display:flex;flex-direction:column;background:var(--bg);overflow:hidden}
.dh{flex:none;display:flex;align-items:center;gap:12px;height:62px;padding:0 20px 0 14px;border-bottom:1px solid var(--line);background:#11161e}
.dh .dn{display:flex;align-items:center;gap:9px;min-width:0}
.dh .dn b{font:650 19px/1.2 var(--sans);letter-spacing:-.2px;color:var(--txt);white-space:nowrap}
.dh .dn .pen{display:inline-flex;color:var(--dim2);padding:4px;border-radius:6px}
.dh .dc{font:600 13px var(--mono);color:var(--dim)}
.dh .sparat{display:flex;align-items:center;gap:6px;font:12px var(--sans);color:var(--dim2)}
.dh .sparat .ic{display:inline-flex;color:#8fe0b0}
.ed{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 400px}
.grid{position:relative;min-width:0;overflow:hidden;padding:16px 28px 20px;display:flex;flex-direction:column;gap:20px}
.kallor{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.kallor .kl{font:12px var(--sans);color:var(--dim2);margin-right:4px}
.sek{display:flex;flex-direction:column;gap:14px;min-width:0}
.sekrad{display:flex;gap:40px;align-items:flex-start}
.hogar{display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;padding-top:6px}
.bl{display:flex;gap:18px;align-items:flex-start}
.blk{display:flex;flex-direction:column;align-items:center;gap:7px}
.blk .kf{width:56px;height:78px;box-shadow:0 5px 12px -5px #000c}
.blk span{font:11.5px var(--sans);color:var(--dim)}
.blnot{font:12px/1.5 var(--sans);color:var(--dim2);max-width:230px;align-self:center}
.add{min-height:0;display:flex;flex-direction:column;gap:14px;padding:16px 18px;background:#121821;border-left:1px solid var(--line);overflow:hidden;position:relative}
.add h3{margin:0;font:650 15px var(--sans);color:var(--txt)}
.add .lead{font:12.5px/1.55 var(--sans);color:var(--dim)}
.kort2{display:flex;flex-direction:column;gap:10px;padding:12px;border-radius:10px;background:#0f141c;border:1px solid var(--line)}
.fotorad{display:flex;align-items:center;gap:11px}
.fotorad .ft{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.fotorad .ft b{font:600 13px var(--sans);color:var(--txt)}
.fotorad .ft span{font:12px var(--sans);color:var(--dim)}
.fotorad .ok{display:inline-flex;color:#8fe0b0}
.fotorad.chk .ft span{color:#e8c98a}
.dropnot{font:11.8px/1.55 var(--sans);color:var(--dim2)}
`;
const aDeckHead = (namn, antal, { ny = false } = {}) => `<div class="dh">
  <div class="btn ghost">${ic('back', 15, 2.2)}Your decks</div>
  <div class="vr"></div>
  ${ny ? `<div class="fld fok" style="width:260px;height:36px;font:650 16px var(--sans)">New deck<span class="caret"></span></div><span class="dim2" style="font-size:12px">Name it now or later</span>`
    : `<div class="dn">${pips('WR', 15)}<b>${namn}</b><span class="pen">${ic('pencil', 14)}</span></div><span class="dc">${antal} cards</span>`}
  <div class="grow"></div>
  <span class="sparat">${ny ? 'Nothing to save yet' : `<span class="ic">${ic('check', 14, 2.4)}</span>Saved`}</span>
  <div class="btn ghost">${DOTS(15)}</div>
</div>`;
const CX = `<span class="cx" title="Remove these cards">${ic('x', 11, 2.6)}</span>`;
const aKallor = (fjarn) => `<div class="kallor"><span class="kl">Came from</span>
  <span class="lfchip on">All <b>${fjarn ? 32 : 36}</b></span>
  <span class="lfchip"><span class="ic">${ic('phone', 12)}</span>Photo 1 <b>${fjarn ? 20 : 24}</b>${CX}</span>
  <span class="lfchip"><span class="ic">${ic('phone', 12)}</span>Photo 2 <b>10</b>${CX}</span>
  <span class="lfchip"><span class="ic">${ic('type', 12)}</span>Typed in <b>2</b>${CX}</span>
</div>`;
function aGrid({ pop = '', fjarn = false, hoverAnthem = false } = {}) {
  const anthemTool = hoverAnthem ? `<div class="tool" style="left:-6px;top:150px"><span class="tb">${ic('minus', 13, 2.4)}</span><b style="font:600 12px var(--mono);color:var(--txt);min-width:14px;text-align:center">3</b><span class="tb">${ic('plus', 13, 2.4)}</span><i class="sep"></i><span class="tb">Sideboard</span><span class="tb">${ic('swap', 13)}Change</span><i class="sep"></i><span class="tb fara">${ic('x', 13, 2.4)}</span></div>` : '';
  const sek = (namn, n, inner) => `<div class="sek"><div class="zr"><span class="zonlbl">${namn}</span><span class="zn">${n}</span><i class="zl"></i></div><div class="hogar">${inner}</div></div>`;
  const cre = sek('Creatures', 19, [pile('swiftspear', 4), pile('pikemaster', 4), pile('danitha', 2), pile('phoenix', 3), pile('serra', 3, { st: 'ny' }), pile('siege', 2, { st: 'chk' }), pile('unread', 1)].join(''));
  const ins = sek('Instants', 10, [pile('bolt', 4), pile('helix', 2), pile('charm', 4, { st: 'ny' })].join(''));
  const ae = sek('Artifacts &amp; enchantments', fjarn ? 3 : 7, (fjarn ? '' : pile('blade', 4)) + pile('anthem', 3, { hover: anthemTool }));
  const bl = `<div class="sek"><div class="zr"><span class="zonlbl">Basic lands</span><span class="zn">0</span><i class="zl"></i></div><div class="bl">
    ${['plains', 'island', 'swamp', 'mountain', 'forest'].map(k => `<div class="blk"><img class="kf" src="${K[k].img}" alt=""><span class="stp"><span>${ic('minus', 12, 2.4)}</span><b>0</b><span>${ic('plus', 12, 2.4)}</span></span></div>`).join('')}
    <span class="blnot">Leave these out of the photos. Set how many you play here.</span></div></div>`;
  return `<section class="grid">${aKallor(fjarn)}${cre}<div class="sekrad">${ins}${ae}</div>${bl}${pop}</section>`;
}
const aTabs = (on) => `<div class="seg"><span class="${on === 'phone' ? 'on' : ''}">${ic('phone', 14)}Phone</span><span class="${on === 'paste' ? 'on' : ''}">${ic('paste', 14)}Paste a list</span><span class="${on === 'type' ? 'on' : ''}">${ic('type', 14)}Type</span></div>`;

function a1() {
  const css = A_CSS + `
.a1{flex:1;min-height:0;padding:28px 40px;display:flex;flex-direction:column;gap:22px}
.a1hd{display:flex;align-items:baseline;gap:12px}
.a1hd h1{margin:0;font:650 24px/1.2 var(--sans);letter-spacing:-.3px}
.a1hd span{font:600 13px var(--mono);color:var(--dim)}
.hylla{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px}
.dt{position:relative;display:flex;flex-direction:column;border-radius:12px;background:#121821;border:1px solid var(--line);overflow:visible;transition:border-color .15s,transform .15s}
.dt:hover{border-color:#4a5a72;transform:translateY(-2px)}
.dt.hv{border-color:#4a5a72;transform:translateY(-2px);box-shadow:0 18px 40px -18px #000}
.dcov{position:relative;height:158px;overflow:hidden;border-radius:11px 11px 0 0;background:#0b1016}
.dcov img{position:absolute;width:390px;left:-32px;top:-52px;filter:saturate(.9)}
.dcov::after{content:'';position:absolute;inset:auto 0 0;height:50px;background:linear-gradient(#12182100,#121821)}
.dinfo{display:flex;flex-direction:column;gap:6px;padding:4px 16px 16px}
.dinfo .drow{display:flex;align-items:center;gap:9px;min-width:0}
.dinfo b{font:650 16px/1.25 var(--sans);color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dinfo .dm{font:12.5px var(--mono);color:var(--dim)}
.dstate{position:absolute;left:12px;top:12px;z-index:2;display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 9px;border-radius:12px;font:600 11.5px var(--sans);white-space:nowrap}
.dstate.spel{background:#1b1407e6;border:1px dashed #e8b33a99;color:#f0c874}
.dstate.spel .kod{font:700 11px var(--mono);letter-spacing:1.4px}
.dstate.chk{background:#241c0de6;border:1px solid var(--acc);color:#ffd98a}
.dmore{position:absolute;right:10px;top:10px;z-index:3;width:30px;height:30px;border-radius:8px;display:grid;place-items:center;background:#0b1017cc;border:1px solid #3d4a5f;color:var(--txt);opacity:0}
.dt:hover .dmore,.dt.hv .dmore{opacity:1}
.dnew{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:14px;padding:22px 22px;border-radius:12px;border:1.5px dashed #3d4a5f;background:#0f141c;min-height:246px}
.dnew:hover{border-color:var(--acc)}
.dnew .plus{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:var(--acc);color:#20160a}
.dnew b{font:650 17px var(--sans);color:var(--txt)}
.dnew .vagar{display:flex;flex-direction:column;gap:7px}
.dnew .vagar span{display:flex;align-items:center;gap:8px;font:12.5px var(--sans);color:var(--dim)}
.dnew .vagar .ic{display:inline-flex;color:var(--dim2)}
.dt .menu{position:absolute;right:10px;top:46px;z-index:10}
`;
  const tile = (namn, f, img, meta, state = '', hv = false, menu = '') => `<div class="dt${hv ? ' hv' : ''}"><div class="dcov"><img src="${img}" alt="">${state}</div><div class="dmore">${DOTS(15)}</div><div class="dinfo"><div class="drow">${pips(f, 15)}<b>${namn}</b></div><span class="dm">${meta}</span></div>${menu}</div>`;
  const meny = `<div class="menu"><div class="mi"><span class="ic">${ic('pencil', 14)}</span>Rename</div><div class="mi d"><span class="ic">${ic('camera', 14)}</span>Forget learned photos…</div><hr><div class="mi fara"><span class="ic" style="color:#ff9099">${ic('x', 14)}</span>Delete deck…</div></div>`;
  const body = `<div class="pg">${topbarSida('Your decks')}
<div class="a1">
  <div class="a1hd"><h1>Your decks</h1><span>4 decks</span></div>
  <div class="hylla">
    <div class="dnew"><span class="plus">${ic('plus', 22, 2.6)}</span><b>New deck</b><span class="vagar"><span><span class="ic">${ic('phone', 14)}</span>Scan your cards with your phone</span><span><span class="ic">${ic('paste', 14)}</span>Paste a list from Moxfield, Arena or MTGO</span><span><span class="ic">${ic('type', 14)}</span>Type the names one by one</span></span></div>
    ${tile('Boros Blades', 'WR', 'danitha.jpg', '36 cards · <span style="color:#e8c98a">2 to check</span>', '<span class="dstate spel">Playing in <span class="kod">BTB2TF</span></span>')}
    ${tile('Golgari Mill', 'BG', 'pharika.jpg', '60 cards · 15 sideboard', '', true, meny)}
    ${tile('Elves', 'G', 'llanowar.jpg', '60 cards')}
    ${tile('Blue-black flyers', 'UB', 'nighthawk.jpg', '60 cards · 8 sideboard')}
  </div>
</div></div>`;
  skriv('A1Decks.dc.html', css, body);
}

function a2() {
  const g = guide({ id: 'a2g', cols: 5, rows: 6, w: 62, off: 13, gap: 12, pad: 20 });
  const css = A_CSS + g.css + `
.a2{flex:1;min-height:0;padding:26px 36px 30px;display:flex;flex-direction:column;gap:20px}
.a2 h2{margin:0;font:650 21px/1.2 var(--sans);letter-spacing:-.2px}
.a2 .sub{font:13.5px/1.5 var(--sans);color:var(--dim);max-width:720px}
.tre{display:grid;grid-template-columns:1.45fr 1fr 1fr;gap:18px;flex:1;min-height:0}
.vag{display:flex;flex-direction:column;gap:14px;padding:20px;border-radius:14px;background:#121821;border:1px solid var(--line);min-width:0}
.vag.rek{border-color:#4a5a72;background:linear-gradient(#f0a52a08,#f0a52a00 40%),#121821}
.vh{display:flex;align-items:center;gap:10px}
.vh .vi{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;background:var(--bg3);border:1px solid var(--line);color:var(--txt);flex:none}
.vh b{font:650 15.5px var(--sans);color:var(--txt)}
.vh .tag{margin-left:auto;height:22px;padding:0 9px;border-radius:11px;background:#f0a52a1f;border:1px solid #f0a52a66;color:#ffd98a;font:600 11px/20px var(--sans);white-space:nowrap}
.vag .vt{font:12.8px/1.6 var(--sans);color:var(--dim)}
.qrrad{display:flex;gap:16px;align-items:center}
.qrrad .qt{display:flex;flex-direction:column;gap:7px}
.qrrad .qt b{font:650 13.5px var(--sans)}
.qrrad .qt span{font:12.5px/1.5 var(--sans);color:var(--dim)}
.qrrad .st{display:flex;align-items:center;gap:8px;font:12px var(--sans);color:#e8c98a}
.guidrad{display:flex;flex-direction:column;gap:14px;align-items:flex-start}
.gnot{font:11.8px/1.55 var(--sans);color:var(--dim2)}
`;
  const body = `<div class="pg">${topbarSida('New deck')}
${aDeckHead('', 0, { ny: true })}
<div class="a2">
  <div style="display:flex;flex-direction:column;gap:6px"><h2>Add your cards</h2><p class="sub">Use one way or mix them — everything lands in this deck, and every card can be changed or removed afterwards.</p></div>
  <div class="tre">
    <div class="vag rek">
      <div class="vh"><span class="vi">${ic('phone', 17)}</span><b>Scan with your phone</b><span class="tag">Best for a physical deck</span></div>
      <div class="qrrad">${qr(96)}<div class="qt"><b>Point your phone’s camera at the code</b><span>Mesa opens on the phone. Every photo you take is read, and the cards show up in this deck.</span><span class="st"><span class="led vantar"></span>Waiting for your phone…</span></div></div>
      <div class="guidrad">${g.html}${g.steg}<p class="gnot">Up to 30 cards per photo. Take as many photos as the deck needs. Leave the basic lands out.</p></div>
    </div>
    <div class="vag">
      <div class="vh"><span class="vi">${ic('paste', 17)}</span><b>Paste a list</b></div>
      <p class="vt">An export from Moxfield, Arena or MTGO, or plain text with one card per line.</p>
      <p class="gnot">Mesa recognises the format by itself — no need to choose it.</p>
      <div class="ta" style="height:196px;color:var(--dim2)">4 Lightning Bolt
4 Monastery Swiftspear (KTK) 118
1 Danitha Capashen, Paragon
…</div>
      <div class="lockrad"><span class="ic">${ic('lock', 14)}</span><span>Read as plain text, one card per line. Nothing you paste is run or opened — only names that exist in Magic are added.</span></div>
      <div style="display:flex;justify-content:flex-end"><span class="btn dis">Read the list</span></div>
    </div>
    <div class="vag">
      <div class="vh"><span class="vi">${ic('type', 17)}</span><b>Type card names</b></div>
      <p class="vt">One at a time. Suggestions appear as you type; Enter adds the card.</p>
      <div class="fld"><span class="ic">${ic('search', 15)}</span><span class="ph">Card name…</span></div>
      <p class="gnot"><kbd>4 bolt</kbd> adds four · <kbd>⇧</kbd> <kbd>↵</kbd> adds to the sideboard</p>
      <div style="flex:1"></div>
      <div class="zr"><span class="zonlbl">Basic lands</span><i class="zl"></i></div>
      <p class="gnot">Don’t photograph or type them — set the counts.</p>
      <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px">${['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'].map(n => `<div style="display:flex;flex-direction:column;gap:5px;align-items:center"><span style="font:11.5px var(--sans);color:var(--dim)">${n}</span><span class="stp"><span>${ic('minus', 11, 2.4)}</span><b>0</b><span>${ic('plus', 11, 2.4)}</span></span></div>`).join('')}</div>
    </div>
  </div>
</div></div>`;
  skriv('A2New.dc.html', css, body, true);
}

function a3() {
  const g = guide({ id: 'a3g', cols: 4, rows: 5, w: 50, off: 11, gap: 10, steps: 'under', pad: 16, compact: true });
  const pop = `<div class="pop" style="left:600px;top:268px">
    <span class="ptag">Photo 2 · check this card</span>
    <span class="plbl">In your photo</span>
    <img class="strip" src="siege.jpg" alt="">
    <div class="prow" style="align-items:flex-start;gap:12px">${face('siege', 58)}<div style="display:flex;flex-direction:column;gap:4px;min-width:0"><h4>Siege-Gang Commander?</h4><span class="psub">Read as “Siege-Gang Commandr”. 2 copies.</span></div></div>
    <div class="prow"><span class="btn prim sm">${ic('check', 13, 2.6)}Yes, that’s it</span><span class="btn sm">Change…</span><span class="grow"></span><span class="btn sm ghost">Remove</span></div>
  </div>`;
  const css = A_CSS + g.css;
  const body = `<div class="pg">${topbarSida('Boros Blades')}
${aDeckHead('Boros Blades', 36)}
<div class="ed">
  ${aGrid({ pop })}
  <aside class="add">
    <h3>Add cards</h3>
    ${aTabs('phone')}
    <div class="kort2" style="flex-direction:row;align-items:center;gap:10px"><span class="led"></span><div style="flex:1;display:flex;flex-direction:column;gap:2px"><b style="font:600 13px var(--sans)">Phone connected</b><span style="font:12px var(--sans);color:var(--dim)">Photos you take go straight into this deck.</span></div><span class="btn sm ghost">Show code</span></div>
    <div class="kort2">
      <div class="fotorad"><span class="mph"><i style="left:6px"></i><i style="left:18px"></i><i style="left:30px"></i><i style="left:42px"></i></span><div class="ft"><b>Photo 1</b><span>24 cards added</span></div><span class="ok">${ic('check', 16, 2.4)}</span></div>
      <div class="fotorad chk"><span class="mph"><i style="left:6px"></i><i style="left:18px"></i><i style="left:30px"></i></span><div class="ft"><b>Photo 2</b><span>10 cards added · 2 to check</span></div><span class="btn sm">Check</span></div>
    </div>
    <div class="zr"><span class="zonlbl">Next photo</span><i class="zl"></i></div>
    <div style="display:flex;gap:14px;align-items:flex-start">${g.html}</div>
    ${g.steg}
    <p class="dropnot" style="margin-top:auto">Have a photo on this computer? Drop it anywhere on this page or paste it with <kbd>⌘V</kbd>.</p>
  </aside>
</div></div>`;
  skriv('Main.dc.html', css, body, true);
}

function a4() {
  const css = A_CSS;
  const L = [
    ['hd', 'Deck'], ['', '4 Monastery Swiftspear (KTK) 118'], ['', '4 Faithful Pikemaster (J25) 3'], ['', '2 Danitha Capashen, Paragon (CMM) 20'],
    ['', '3 Arclight Phoenix (GRN) 91'], ['', '3 Serra Angel (DMU) 33'], ['', '4 Lightning Bolt (M11) 149'], ['', '4 Boros Charm (GTC) 148'],
    ['bad', '&lt;img src=x onerror=alert(1)&gt;'], ['fix', '4 Lightnig Helix'], ['bad', 'https://moxfield.com/decks/7Hx2qW'], ['', '4 Ancestral Blade (M20) 3'],
    ['', '9 Mountain (MOM) 285'], ['', ''], ['hd', 'Sideboard'], ['', '2 Rest in Peace (AKR) 32'],
  ];
  const ta = L.map(([k, t]) => `<span class="ln${k ? ' ' + k : ''}">${t || ' '}</span>`).join('');
  const body = `<div class="pg">${topbarSida('Boros Blades')}
${aDeckHead('Boros Blades', 36)}
<div class="ed">
  ${aGrid()}
  <aside class="add" style="gap:12px">
    <h3>Add cards</h3>
    ${aTabs('paste')}
    <div class="fchips"><span class="fchip on">${ic('check', 11, 2.8)}Arena format detected</span><span class="grow"></span><span class="btn sm ghost">Clear</span></div>
    <div class="ta" style="height:284px;font-size:11px;line-height:1.5">${ta}</div>
    <div class="seg"><span class="on">Add to the deck</span><span>Replace the deck</span></div>
    <div style="display:flex;align-items:center;gap:8px;font:13px var(--sans);color:var(--txt)"><span style="display:inline-flex;color:#8fe0b0">${ic('check', 15, 2.4)}</span><b style="font-weight:600">37 cards and 2 sideboard</b><span class="dim">from 10 lines</span></div>
    <div style="display:flex;flex-direction:column;gap:6px">
      <div class="prob"><span class="pn">line 9</span><span class="pt"><code>&lt;img src=x onerror=alert(1)&gt;</code><span>Not a card name — ignored.</span></span></div>
      <div class="prob"><span class="pn">line 10</span><span class="pt"><code>4 Lightnig Helix</code><span>Did you mean Lightning Helix?</span></span><span class="btn sm">Use it</span></div>
      <div class="prob"><span class="pn">line 11</span><span class="pt"><code>https://moxfield.com/decks/7Hx2qW</code><span>Links aren’t opened. In Moxfield: Export → Copy as plain text.</span></span></div>
    </div>
    <div class="lockrad"><span class="ic">${ic('lock', 14)}</span><span>Mesa reads this as plain text, one card per line. Nothing is run or opened, and only names that exist in Magic are added. Up to 250 lines.</span></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:auto"><span class="btn prim">Add 39 cards</span></div>
  </aside>
</div></div>`;
  skriv('A4Paste.dc.html', css, body);
}

function a5() {
  const css = A_CSS;
  const sug = `<div class="sug" style="position:absolute;left:18px;right:18px;top:141px;z-index:20">
    <div class="si on"><span class="th">${face('serra', 28)}</span><span class="sn"><b><mark>Serra</mark> Angel</b><span>Creature — Angel · 3 in this deck</span></span>${cost('3WW', 12)}<span class="hk"><kbd>↵</kbd></span></div>
    <div class="si"><span class="th">${face('sascendant', 28)}</span><span class="sn"><b><mark>Serra</mark> Ascendant</b><span>Creature — Human Monk Avatar</span></span>${cost('W', 12)}</div>
    <div class="si"><span class="th">${face('sparagon', 28)}</span><span class="sn"><b><mark>Serra</mark> Paragon</b><span>Creature — Angel</span></span>${cost('3W', 12)}</div>
    <div class="si"><span class="th">${face('sbenev', 28)}</span><span class="sn"><b><mark>Serra</mark> the Benevolent</b><span>Legendary Planeswalker — Serra</span></span>${cost('2WW', 12)}</div>
    <div class="si"><span class="th">${face('ssanctum', 28)}</span><span class="sn"><b><mark>Serra</mark>’s Sanctum</b><span>Legendary Land</span></span></div>
    <div class="sfot"><span><kbd>↑</kbd> <kbd>↓</kbd> choose</span><span><kbd>↵</kbd> add</span><span><kbd>⇧</kbd> <kbd>↵</kbd> sideboard</span></div>
  </div>`;
  const snack = `<div class="snack" style="left:28px;bottom:22px"><span>Removed Ancestral Blade ×4</span><span class="btn sm">${ic('undo', 13, 2.2)}Undo</span></div>`;
  const body = `<div class="pg">${topbarSida('Boros Blades')}
${aDeckHead('Boros Blades', 32)}
<div class="ed">
  ${aGrid({ fjarn: true, hoverAnthem: true, pop: snack })}
  <aside class="add">
    <h3>Add cards</h3>
    ${aTabs('type')}
    <div class="fld fok"><span class="ic">${ic('search', 15)}</span><span>serra<span class="caret"></span></span></div>
    ${sug}
    <div style="height:318px"></div>
    <div style="display:flex;align-items:center;gap:12px"><span style="font:12.5px var(--sans);color:var(--dim)">Copies</span><span class="stp"><span>${ic('minus', 12, 2.4)}</span><b>1</b><span>${ic('plus', 12, 2.4)}</span></span><span class="grow"></span><div class="seg" style="width:190px"><span class="on">Main</span><span>Sideboard</span></div></div>
    <div class="zr"><span class="zonlbl">Typed in</span><span class="zn">2</span><i class="zl"></i></div>
    <div style="display:flex;align-items:center;gap:10px;font:13px var(--sans)"><span class="th" style="width:26px;height:36px;border-radius:3px;overflow:hidden;flex:none">${cf(K.helix, 26, 36)}</span><span class="grow">Lightning Helix</span><span style="font:600 12px var(--mono);color:var(--dim)">×2</span><span class="btn sm ghost">${ic('x', 13, 2.4)}</span></div>
  </aside>
</div></div>`;
  skriv('A5Type.dc.html', css, body);
}

/* ════════════════════════════════════════════════════════════════════
   B — låda vid kanten (bordet syns)
   ════════════════════════════════════════════════════════════════════ */
const B_CSS = `
#app{position:relative;width:1440px;height:900px;display:flex;flex-direction:column;background:var(--bg);overflow:hidden}
.brade{flex:1;min-height:0;display:flex;padding:10px}
.brade .matta{flex:1}
.bk{position:absolute}
.bk .kf{box-shadow:0 8px 20px -8px #000c}
.dimlag{position:absolute;left:0;top:46px;right:0;bottom:0;background:#05070a80;z-index:40}
.dr{position:absolute;top:46px;right:0;bottom:0;width:600px;z-index:50;display:flex;flex-direction:column;background:#121821;border-left:1px solid #333e50;box-shadow:-30px 0 60px -20px #000}
.drh{flex:none;display:flex;flex-direction:column;gap:10px;padding:10px 16px 14px}
.drh .r1{display:flex;align-items:center;gap:6px}
.drh .r2{display:flex;align-items:center;gap:10px}
.drh .r2 b{font:650 19px/1.2 var(--sans);letter-spacing:-.2px}
.drh .r2 .pen{display:inline-flex;color:var(--dim2)}
.drh .r2 .dc{font:600 13px var(--mono);color:var(--dim)}
.cmp{position:relative;flex:none;margin:0 16px}
.cmpf{display:flex;align-items:center;gap:10px;height:46px;padding:0 6px 0 13px;border-radius:10px;background:#0e131b;border:1px solid var(--panelram);font-size:14.5px;color:var(--txt)}
.cmpf.fok{border-color:var(--acc);box-shadow:0 0 0 3px #f0a52a1f}
.cmpf .ic{display:inline-flex;color:var(--dim2)}
.cmpf .ph{color:var(--dim2)}
.cmpf .ph b{color:var(--dim);font-weight:500}
.cmpf .scan{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 11px;border-radius:8px;border-left:1px solid var(--line);color:var(--dim);font:550 12.5px var(--sans);white-space:nowrap}
.cmpf .scan.on{background:#f0a52a1f;color:#ffd98a;border:1px solid #f0a52a66}
.cmph{font:11.5px var(--sans);color:var(--dim2);margin:7px 16px 0;display:flex;gap:12px}
.dl{flex:1;min-height:0;overflow:hidden;padding:6px 10px 10px;display:flex;flex-direction:column}
.dlsec{display:flex;align-items:center;gap:8px;padding:12px 6px 5px}
.dlr{display:flex;align-items:center;gap:10px;height:34px;padding:0 6px;border-radius:7px}
.dlr.hv{background:var(--bg3)}
.dlr .nm{font-size:13px;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.dlr .src{display:inline-flex;color:#4a5a72;flex:none}
.dlr .x{width:26px;height:26px;border-radius:6px;display:grid;place-items:center;color:var(--dim2);flex:none}
.dlr .sbk{height:22px;padding:0 7px;border-radius:5px;border:1px solid var(--line);font:600 10px/20px var(--sans);letter-spacing:.5px;color:var(--dim2)}
.dlr.fel .nm{color:var(--acc)}
.dlr .ny{height:18px;padding:0 6px;border-radius:9px;background:#0f2016;border:1px solid #2f6b47;color:#8fe0b0;font:650 10px/16px var(--sans);flex:none}
.drf{flex:none;display:flex;align-items:center;gap:8px;padding:10px 16px;border-top:1px solid var(--line);font:12px var(--sans);color:var(--dim2)}
.drf .ic{display:inline-flex;color:#8fe0b0}
`;
function bTable() {
  const k = (id, x, y, w = 104, rot = 0) => `<div class="bk" style="left:${x}px;top:${y}px;transform:rotate(${rot}deg)">${face(id, w)}</div>`;
  return `${topbarSpel(true)}
<main class="brade"><section class="matta">
  ${k('swiftspear', 60, 60)}${k('pikemaster', 184, 60)}${k('danitha', 308, 60, 104, 90)}${k('mountain', 60, 250)}${k('mountain', 86, 276)}${k('plains', 210, 250)}${k('plains', 236, 276)}${k('blade', 440, 60)}
</section></main>
<div class="dimlag"></div>`;
}
const bHead = (antal, foto2 = true) => `<div class="drh">
  <div class="r1"><span class="btn ghost sm">${ic('back', 13, 2.2)}Your decks</span><span class="btn ghost sm">${ic('plus', 13, 2.2)}New deck</span><span class="grow"></span><span class="btn ghost sm">${DOTS(14)}</span><span class="btn ghost sm">${ic('x', 14, 2.3)}</span></div>
  <div class="r2">${pips('WR', 15)}<b>Boros Blades</b><span class="pen">${ic('pencil', 14)}</span><span class="grow"></span><span class="dc">${antal} cards</span></div>
  <div class="kallor"><span class="kl">Came from</span><span class="lfchip"><span class="ic">${ic('phone', 12)}</span>Photo 1 <b>24</b>${CX}</span>${foto2 ? `<span class="lfchip"><span class="ic">${ic('phone', 12)}</span>Photo 2 <b>10</b>${CX}</span>` : ''}<span class="lfchip"><span class="ic">${ic('type', 12)}</span>Typed in <b>2</b>${CX}</span></div>
</div>`;
const SRC = { p: ['phone', 'From a photo'], t: ['type', 'Typed in'], l: ['paste', 'From a pasted list'] };
const bRad = (k, n, s, opt = {}) => `<div class="dlr${opt.hv ? ' hv' : ''}${opt.fel ? ' fel' : ''}"><span class="stp s"><span>${ic('minus', 11, 2.4)}</span><b>${n}</b><span>${ic('plus', 11, 2.4)}</span></span><span class="nm">${opt.namn || K[k].n}</span>${K[k] && !opt.fel ? cost(K[k].m, 12) : ''}${opt.ny ? '<span class="ny">New</span>' : ''}<span class="grow"></span>${opt.fel ? `<span class="btn sm">${opt.fel}</span>` : ''}${opt.hv ? '<span class="sbk">SB</span>' : ''}<span class="src" title="${SRC[s][1]}">${ic(SRC[s][0], 14)}</span>${opt.hv ? `<span class="x">${ic('x', 13, 2.4)}</span>` : ''}</div>`;
const bSek = (namn, n) => `<div class="dlsec"><span class="zonlbl" style="color:var(--dim)">${namn}</span><span style="font:600 10.5px var(--mono);color:var(--dim2)">${n}</span><i style="flex:1;height:1px;background:var(--zonlinje)"></i></div>`;
function bLista({ hvAnthem = false, ny = false, utan2 = false } = {}) {
  return `${bSek('Creatures', utan2 ? 13 : 19)}
    ${bRad('swiftspear', 4, 'p')}${bRad('pikemaster', 4, 'p')}${bRad('danitha', 2, 'p')}${bRad('phoenix', 3, 'p')}${utan2 ? '' : bRad('serra', 3, 'p', { ny }) + bRad('siege', 2, 'p', { fel: 'Check', namn: 'Siege-Gang Commander?' }) + bRad('siege', 1, 'p', { fel: 'Type it', namn: 'Couldn’t read the name' })}
    ${bSek('Instants', utan2 ? 6 : 10)}${bRad('bolt', 4, 'p')}${bRad('helix', 2, 't')}${utan2 ? '' : bRad('charm', 4, 'p', { ny })}
    ${bSek('Artifacts &amp; enchantments', 7)}${bRad('blade', 4, 'p')}${bRad('anthem', 3, 'p', { hv: hvAnthem })}
    ${bSek('Basic lands', 0)}
    <div style="display:flex;gap:14px;padding:6px 6px 0;flex-wrap:wrap">${['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'].map(n => `<span style="display:flex;align-items:center;gap:7px;font:12.5px var(--sans);color:var(--dim)">${n}<span class="stp s"><span>${ic('minus', 11, 2.4)}</span><b>0</b><span>${ic('plus', 11, 2.4)}</span></span></span>`).join('')}</div>`;
}
function b1() {
  const sug = `<div class="sug" style="position:absolute;left:0;right:0;top:52px;z-index:20">
    <div class="si on"><span class="th">${face('serra', 28)}</span><span class="sn"><b><mark>Serr</mark>a Angel</b><span>Creature — Angel · 3 in this deck</span></span>${cost('3WW', 12)}<span class="hk"><kbd>↵</kbd> add 1</span></div>
    <div class="si"><span class="th">${face('sascendant', 28)}</span><span class="sn"><b><mark>Serr</mark>a Ascendant</b><span>Creature — Human Monk Avatar</span></span>${cost('W', 12)}</div>
    <div class="si"><span class="th">${face('sparagon', 28)}</span><span class="sn"><b><mark>Serr</mark>a Paragon</b><span>Creature — Angel</span></span>${cost('3W', 12)}</div>
    <div class="si"><span class="th">${face('sbenev', 28)}</span><span class="sn"><b><mark>Serr</mark>a the Benevolent</b><span>Legendary Planeswalker — Serra</span></span>${cost('2WW', 12)}</div>
    <div class="sfot"><span><kbd>4 serra</kbd> adds four</span><span><kbd>⇧</kbd> <kbd>↵</kbd> sideboard</span><span>Paste a whole list here too</span></div>
  </div>`;
  const body = `<div id="app">${bTable()}
<aside class="dr">
  ${bHead(36)}
  <div class="cmp"><div class="cmpf fok"><span class="ic">${ic('plus', 16, 2.2)}</span><span>serr<span class="caret"></span></span><span class="grow"></span><span class="scan">${ic('phone', 15)}Scan with phone</span></div>${sug}</div>
  <div class="dl" style="padding-top:14px">${bLista({ hvAnthem: true })}</div>
  <div class="drf"><span class="ic">${ic('check', 14, 2.4)}</span>Saved as you go</div>
</aside>
</div>`;
  skriv('B1Type.dc.html', B_CSS, body);
}
function b2() {
  const L = [
    ['', '4 Monastery Swiftspear'], ['', '4 Faithful Pikemaster'], ['', '2 Danitha Capashen, Paragon'], ['', '3 Arclight Phoenix'],
    ['', '4 Lightning Bolt'], ['', '4 Lightning Helix'], ['bad', '=HYPERLINK("http://bad.example","free cards")'], ['', '4 Ancestral Blade'],
    ['', '3 Glorious Anthem'], ['fix', '9 Mountan'], ['', '8 Plains'], ['', ''], ['', '2 Rest in Peace'],
  ];
  const ta = L.map(([k, t]) => `<span class="ln${k ? ' ' + k : ''}">${t || ' '}</span>`).join('');
  const css = B_CSS + `
.cmpta{border-radius:10px;background:#0e131b;border:1px solid var(--acc);box-shadow:0 0 0 3px #f0a52a1f;display:flex;flex-direction:column}
.cmpta .th2{display:flex;align-items:center;gap:8px;padding:8px 8px 8px 12px;border-bottom:1px solid var(--line)}
.cmpta .ta{border:0;background:none;height:262px}
.prev{margin:10px 16px 0;padding:12px;border-radius:10px;background:#0f141c;border:1px solid var(--line);display:flex;flex-direction:column;gap:9px}
`;
  const body = `<div id="app">${bTable()}
<aside class="dr">
  ${bHead(36)}
  <div class="cmp"><div class="cmpta">
    <div class="th2"><span style="display:inline-flex;color:var(--dim2)">${ic('paste', 15)}</span><span style="font:600 12.5px var(--sans)">Pasted list</span><span class="fchip on">${ic('check', 11, 2.8)}MTGO</span><span class="grow"></span><span class="scan" style="display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 10px;border-radius:8px;color:var(--dim);font:550 12px var(--sans)">${ic('phone', 14)}Scan with phone</span></div>
    <div class="ta">${ta}</div>
  </div></div>
  <div class="prev">
    <div style="display:flex;align-items:center;gap:8px;font:13px var(--sans)"><span style="display:inline-flex;color:#8fe0b0">${ic('check', 15, 2.4)}</span><b style="font-weight:600">36 cards and 2 sideboard</b><span class="dim">from 10 lines</span><span class="grow"></span><div class="seg" style="width:300px"><span class="on">Add to the deck</span><span>Replace the deck</span></div></div>
    <div class="prob"><span class="pn">line 7</span><span class="pt"><code>=HYPERLINK("http://bad.example","free cards")</code><span>Not a card name — ignored.</span></span></div>
    <div class="prob"><span class="pn">line 10</span><span class="pt"><code>9 Mountan</code><span>Did you mean Mountain?</span></span><span class="btn sm">Use it</span></div>
    <div class="lockrad"><span class="ic">${ic('lock', 14)}</span><span>Read as plain text, one card per line. Nothing is run or opened, and only names that exist in Magic are added.</span></div>
    <div style="display:flex;gap:8px;justify-content:flex-end"><span class="btn">Cancel</span><span class="btn prim">Add 38 cards</span></div>
  </div>
  <div class="dl" style="opacity:.35;padding-top:4px">${bLista()}</div>
  <div class="drf"><span class="ic">${ic('check', 14, 2.4)}</span>Saved as you go</div>
</aside>
</div>`;
  skriv('B2Paste.dc.html', css, body);
}
function b3() {
  const g = guide({ id: 'b3g', cols: 4, rows: 5, w: 40, off: 8, gap: 8, steps: false, pad: 12, compact: true });
  const cand = (k, st = '') => `<div class="cd${st ? ' ' + st : ''}">${face(k, 72)}${st === 'chk' ? '<i class="chr"></i><span class="q">?</span>' : '<span class="ok">' + ic('check', 11, 3) + '</span>'}</div>`;
  const css = B_CSS + g.css + `
.tel{margin:10px 16px 0;padding:12px;border-radius:10px;background:#0f141c;border:1px solid var(--line);display:flex;gap:14px;align-items:center}
.tel .tt{flex:1;display:flex;flex-direction:column;gap:5px;min-width:0}
.tel .tt b{font:600 13px var(--sans)}
.tel .tt span{font:12px/1.5 var(--sans);color:var(--dim)}
.tray{margin:10px 16px 0;padding:12px;border-radius:10px;background:#0f141c;border:1px solid #4a5a72;display:flex;flex-direction:column;gap:10px}
.cds{display:grid;grid-template-columns:repeat(6,72px);gap:12px 13px}
.cd{position:relative;width:72px;height:100px}
.cd .kf,.cd .cf{box-shadow:0 5px 12px -5px #000c}
.cd .ok{position:absolute;right:-5px;top:-5px;width:18px;height:18px;border-radius:50%;background:#1f7a4a;color:#fff;display:grid;place-items:center;box-shadow:0 0 0 2px #0f141c}
.cd .q{position:absolute;right:-5px;top:-5px;z-index:3;width:18px;height:18px;border-radius:50%;background:var(--acc);color:#20160a;font:800 11px/18px var(--sans);text-align:center;box-shadow:0 0 0 2px #0f141c}
.cd.ul{border:1.5px dashed #e8b33a99;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:6px;text-align:center;font:10.5px/1.3 var(--sans);color:#e8c98a}
.cd.ul .strip{height:18px}
.tray .done{display:flex;align-items:center;gap:8px;font:12.5px var(--sans);color:var(--dim)}
`;
  const body = `<div id="app">${bTable()}
<aside class="dr">
  ${bHead(26, false)}
  <div class="cmp"><div class="cmpf"><span class="ic">${ic('plus', 16, 2.2)}</span><span class="ph">Type a card name, or paste a list</span><span class="grow"></span><span class="scan on">${ic('phone', 15)}Scan with phone</span></div></div>
  <div class="tel">${g.html}<div class="tt"><span style="display:flex;align-items:center;gap:8px"><span class="led"></span><b>Phone connected</b></span><span>Lay the cards in columns so only the names show, and shoot from straight above. Up to 30 per photo.</span><span class="btn sm ghost" style="align-self:flex-start;padding:0">Show the code again</span></div></div>
  <div class="tray">
    <div class="done"><span style="display:inline-flex;color:#8fe0b0">${ic('check', 14, 2.4)}</span>Photo 1 · 24 cards added</div>
    <div style="display:flex;align-items:center;gap:8px"><span class="mph" style="width:44px;height:30px"><i style="left:5px;height:20px"></i><i style="left:16px;height:20px"></i><i style="left:27px;height:20px"></i></span><b style="font:600 13.5px var(--sans)">Photo 2 · 10 cards found</b><span class="grow"></span><span style="font:12px var(--sans);color:#e8c98a">1 to check · 1 unreadable</span></div>
    <div class="cds">${cand('serra')}${cand('serra')}${cand('serra')}${cand('charm')}${cand('charm')}${cand('charm')}${cand('siege', 'chk')}${cand('siege')}<div class="cd ul"><img class="strip" src="anthem.jpg" alt="" style="filter:blur(.7px) saturate(.7)">Couldn’t read the name<span class="btn sm" style="height:22px;padding:0 6px;font-size:10.5px">Type it</span></div></div>
    <div style="display:flex;gap:8px;align-items:center"><span style="font:12px var(--sans);color:var(--dim2)">Click a card to leave it out.</span><span class="grow"></span><span class="btn ghost">Skip this photo</span><span class="btn prim">Add 9 cards</span></div>
  </div>
  <div class="dl" style="padding-top:2px">${bLista({ utan2: true })}</div>
</aside>
</div>`;
  skriv('B3Phone.dc.html', css, body, true);
}

/* ════════════════════════════════════════════════════════════════════
   C — skanningsbordet
   ════════════════════════════════════════════════════════════════════ */
const C_CSS = `
.pg{position:relative;width:1440px;height:900px;display:flex;flex-direction:column;background:var(--bg);overflow:hidden}
.cb{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:10px;padding:10px}
.cb .matta{min-width:0}
.ask{min-height:0;display:flex;flex-direction:column;gap:14px;padding:16px;border-radius:12px;background:#121821;border:1px solid var(--line);overflow:hidden}
.ask .ah{display:flex;align-items:center;gap:9px}
.ask .ah b{font:650 15px var(--sans)}
.ask .ah .n{font:600 12.5px var(--mono);color:var(--dim)}
.ask .ah .ic{display:inline-flex;color:var(--dim2)}
.lr{display:flex;align-items:center;gap:10px;min-height:30px;padding:0 6px;border-radius:7px}
.lr .sw{width:30px;height:21px;border-radius:3px;flex:none;overflow:hidden;position:relative;box-shadow:inset 0 0 0 1px #0007}
.lr .sw img{position:absolute;width:44px;left:-7px;top:-6px}
.lr .n{flex:1;min-width:0;font-size:12.5px;color:var(--txt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lr .q{font:600 11px var(--mono);color:var(--dim);min-width:22px;text-align:right;flex:none}
.lr.ny{background:#57c7850f}
.lr.ny .n::after{content:' new';color:#8fe0b0;font-size:11px}
.mtop{position:absolute;left:18px;right:18px;top:16px;z-index:20;display:flex;align-items:center;gap:10px}
.mnamn{display:flex;flex-direction:column;gap:5px}
.mnamn .zonlbl{color:var(--dim)}
.mnamn b{display:flex;align-items:center;gap:9px;font:650 21px/1.2 var(--sans);letter-spacing:-.2px}
.mnamn b .ic{display:inline-flex;color:var(--dim2)}
`;
function c1() {
  const g = guide({ id: 'c1g', cols: 5, rows: 6, w: 90, off: 19, gap: 16, steps: 'row', pad: 26 });
  const css = C_CSS + g.css + `
.hero{position:absolute;left:0;right:0;top:92px;bottom:0;display:flex;flex-direction:column;align-items:center;gap:22px}
.hero h2{margin:0;font:650 20px var(--sans);letter-spacing:-.2px}
.hero .gsteps{width:760px}
.hero .gnot{font:12.5px/1.5 var(--sans);color:var(--dim2)}
.qrb{display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px;border-radius:12px;background:#0f141c;border:1px solid #4a5a72;text-align:center}
.qrb b{font:650 14px var(--sans)}
.qrb span{font:12.5px/1.5 var(--sans);color:var(--dim)}
.tomask{flex:1;min-height:0;border:1.5px dashed #3d4a5f;border-radius:10px;display:grid;place-items:center;text-align:center;padding:16px;font:12.5px/1.5 var(--sans);color:var(--dim2)}
.eller{display:flex;align-items:center;gap:10px;font:11px var(--sans);letter-spacing:.6px;text-transform:uppercase;color:var(--dim2)}
.eller::before,.eller::after{content:'';flex:1;height:1px;background:var(--line)}
.alt{display:flex;flex-direction:column;gap:8px}
.alt .btn{justify-content:flex-start;height:40px;padding:0 12px;font-size:13px;color:var(--txt)}
.alt .btn span{color:var(--dim2);font-size:12px;margin-left:auto}
`;
  const body = `<div class="pg">${topbarSida('New deck')}
<main class="cb">
  <section class="matta">
    <div class="mtop"><div class="mnamn"><span class="zonlbl">New deck</span><b>New deck<span class="ic">${ic('pencil', 15)}</span></b></div></div>
    <div class="hero">
      <h2>Lay your deck out like this, then photograph it</h2>
      ${g.html}
      ${g.steg}
      <p class="gnot">Up to 30 cards per photo — take as many photos as you need. Leave the basic lands out; you set those as counts.</p>
    </div>
  </section>
  <aside class="ask">
    <div class="ah"><span class="ic">${ic('box', 17)}</span><b>In the deck</b><span class="grow"></span><span class="n">0 cards</span></div>
    <div class="qrb">${qr(150, 11)}<b>Connect your phone</b><span>Open the camera on your phone and point it at the code. Photos go straight onto this mat.</span><span style="display:flex;align-items:center;gap:8px;color:#e8c98a;font-size:12px"><span class="led vantar"></span>Waiting for your phone…</span></div>
    <div class="tomask">The cards you add land here.</div>
    <div class="eller">or</div>
    <div class="alt"><span class="btn">${ic('paste', 15)}Paste a list<span>Moxfield · Arena · MTGO</span></span><span class="btn">${ic('type', 15)}Type card names</span></div>
  </aside>
</main></div>`;
  skriv('C1Start.dc.html', css, body, true);
}
function c2() {
  const W = 128, H = hc(W), OFF = 28, GAP = 40;
  const kol = [['serra', 'serra', 'serra'], ['charm', 'charm', 'anthem'], ['charm', 'charm', 'serra'], ['siege', 'siege', 'unread']];
  let spread = '';
  kol.forEach((k, c) => k.forEach((id, r) => {
    const x = c * (W + GAP), y = r * OFF;
    if (id === 'unread') spread += `<div class="sp ul" style="left:${x}px;top:${y}px;width:${W}px;height:${H}px;z-index:${r + 1}"><img class="strip" src="anthem.jpg" alt="" style="filter:blur(.8px) saturate(.7) brightness(.8)"><span>Couldn’t read the name</span><span class="btn sm">Type it</span></div>`;
    else spread += `<div class="sp${id === 'siege' ? ' chk' : ''}" style="left:${x}px;top:${y}px;width:${W}px;height:${H}px;z-index:${r + 1}">${face(id, W)}${id === 'siege' ? '<i class="chr"></i><span class="qq">?</span>' : ''}</div>`;
  }));
  const bw = 4 * W + 3 * GAP, bh = H + 2 * OFF;
  const css = C_CSS + `
.ftabs{display:flex;gap:6px;align-items:center}
.ftab{display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 12px;border-radius:9px;border:1px solid var(--line);background:#0b1017cc;font:550 12.5px var(--sans);color:var(--dim);white-space:nowrap}
.ftab.on{border-color:#4a5a72;background:#232c3c;color:var(--txt)}
.ftab .ok{display:inline-flex;color:#8fe0b0}
.ftab b{font:600 11px var(--mono);color:var(--dim2)}
.ftab.ny{border-style:dashed;color:var(--dim)}
.spread{position:absolute;left:48px;top:128px}
.sp{position:absolute}
.sp .kf,.sp .cf{box-shadow:0 8px 20px -8px #000d;border-radius:7px}
.sp .chr{border-radius:10px}
.sp .qq{position:absolute;right:8px;top:6px;z-index:4;width:20px;height:20px;border-radius:50%;background:var(--acc);color:#20160a;font:800 12px/20px var(--sans);text-align:center}
.sp.ul{display:flex;flex-direction:column;align-items:center;gap:10px;padding:10px 8px;border-radius:8px;border:1.5px dashed #e8b33a;background:#0b0f15cc;text-align:center;font:12px/1.35 var(--sans);color:#e8c98a}
.sp.ul .strip{height:30px}
.fotolbl{position:absolute;left:50%;top:96px;translate:-50% 0;font:12px var(--sans);color:var(--dim2);white-space:nowrap}
.bar{position:absolute;left:50%;bottom:22px;translate:-50% 0;z-index:25;display:flex;align-items:center;gap:10px;padding:7px 7px 7px 16px;border-radius:12px;background:#0b1017f7;border:1px solid #4a5a72;box-shadow:0 16px 34px -12px #000;white-space:nowrap;font:13px var(--sans);color:var(--dim)}
.bar b{color:var(--txt);font-weight:600}
.bar .w{color:#e8c98a}
.bls{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:auto}
.bls div{display:flex;flex-direction:column;align-items:center;gap:4px;font:11px var(--sans);color:var(--dim)}
`;
  const lr = (k, n, ny = false) => `<div class="lr${ny ? ' ny' : ''}"><span class="sw">${K[k].img ? `<img src="${K[k].img}" alt="">` : `<i style="position:absolute;inset:0;background:${K[k].fa}"></i>`}</span><span class="n">${K[k].n}</span>${cost(K[k].m, 12)}<span class="q">×${n}</span></div>`;
  const pop = `<div class="pop" style="left:${48 + bw + 22}px;top:118px;width:290px">
    <span class="ptag">Check this card</span>
    <span class="plbl">In your photo</span><img class="strip" src="siege.jpg" alt="">
    <div class="prow" style="align-items:flex-start;gap:12px">${face('siege', 52)}<div style="display:flex;flex-direction:column;gap:4px"><h4>Siege-Gang Commander?</h4><span class="psub">Both copies in this column.</span></div></div>
    <div class="prow"><span class="btn prim sm">${ic('check', 13, 2.6)}Yes, that’s it</span><span class="btn sm">Change…</span></div>
  </div>`;
  const body = `<div class="pg">${topbarSida('Boros Blades')}
<main class="cb">
  <section class="matta">
    <div class="mtop"><div class="ftabs"><span class="ftab"><span class="ok">${ic('check', 13, 2.6)}</span>Photo 1 <b>24 in the deck</b></span><span class="ftab on">${ic('camera', 14)}Photo 2 <b>12 found</b></span><span class="ftab ny">${ic('plus', 13, 2.4)}Next photo</span></div><span class="grow"></span><span style="font:12px var(--sans);color:var(--dim2)">Laid out the way they lie on your table</span></div>
    <div class="spread" style="width:${bw}px;height:${bh}px">${spread}</div>
    ${pop}
    <div class="bar"><span><b>12 found</b> · <span class="w">2 to check · 1 unreadable</span></span><span class="btn ghost">Retake photo</span><span class="btn prim">${ic('box', 14, 2.2)}Put them in the deck</span></div>
  </section>
  <aside class="ask">
    <div class="ah">${pips('WR', 15)}<b>Boros Blades</b><span class="grow"></span><span class="n">24 cards</span></div>
    <div style="display:flex;flex-direction:column;gap:1px">
      <div class="zr" style="padding:6px 6px 4px"><span class="zonlbl">Creatures</span><span class="zn">13</span><i class="zl"></i></div>
      ${lr('swiftspear', 4)}${lr('pikemaster', 4)}${lr('danitha', 2)}${lr('phoenix', 3)}
      <div class="zr" style="padding:10px 6px 4px"><span class="zonlbl">Instants</span><span class="zn">4</span><i class="zl"></i></div>
      ${lr('bolt', 4)}
      <div class="zr" style="padding:10px 6px 4px"><span class="zonlbl">Artifacts &amp; enchantments</span><span class="zn">7</span><i class="zl"></i></div>
      ${lr('blade', 4)}${lr('anthem', 3)}
    </div>
    <div class="zr" style="margin-top:auto"><span class="zonlbl">Basic lands</span><i class="zl"></i></div>
    <div class="bls" style="margin-top:0">${['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'].map(n => `<div>${n}<span class="stp s" style="height:24px"><span style="width:18px">${ic('minus', 10, 2.4)}</span><b style="min-width:14px;font-size:11.5px">0</b><span style="width:18px">${ic('plus', 10, 2.4)}</span></span></div>`).join('')}</div>
  </aside>
</main></div>`;
  skriv('C2Photo.dc.html', css, body);
}
function c3() {
  const css = C_CSS + `
.hylla{position:absolute;left:18px;right:18px;top:14px;z-index:20;display:flex;gap:16px;align-items:flex-end;height:120px}
.ask2{position:relative}
.box{position:relative;width:128px;height:104px;flex:none}
.box .fr{position:absolute;left:0;top:14px;width:114px;height:90px;border-radius:5px;overflow:hidden;background:#0b1016;box-shadow:0 10px 20px -10px #000}
.box .fr img{position:absolute;width:150px;left:-18px;top:-20px}
.box .fr .et{position:absolute;left:0;right:0;bottom:0;height:30px;display:flex;align-items:center;gap:6px;padding:0 7px;background:#0f141cee;font:650 11.5px var(--sans);color:var(--txt);white-space:nowrap;overflow:hidden}
.box .si{position:absolute;left:114px;top:7px;width:14px;height:90px;background:#1b222e;transform:skewY(-26deg);transform-origin:0 100%;border-radius:0 3px 3px 0;filter:brightness(.8)}
.box .to{position:absolute;left:7px;top:7px;width:114px;height:7px;background:#232c3c;transform:skewX(-45deg);transform-origin:0 100%}
.box.on{transform:translateY(-8px)}
.box.on .fr{box-shadow:0 0 0 2px var(--acc),0 18px 30px -12px #000}
.box.av{opacity:.55}
.box.ny .fr{border:1.5px dashed #3d4a5f;background:#0f141c;display:grid;place-items:center;color:var(--acc);box-shadow:none}
.box.ny .fr span{display:flex;flex-direction:column;align-items:center;gap:6px;font:650 12px var(--sans);color:var(--txt)}
.bspread{position:absolute;left:28px;right:28px;top:170px;display:flex;gap:34px;align-items:flex-start;flex-wrap:wrap}
.bspread .grp{display:flex;flex-direction:column;gap:12px}
.bspread .grp .gh{display:flex;align-items:center;gap:8px}
.bspread .hogar{display:flex;gap:16px;align-items:flex-start}
.dock{position:absolute;left:50%;bottom:20px;translate:-50% 0;z-index:25;display:flex;align-items:center;gap:8px;padding:7px;border-radius:13px;background:#0b1017f7;border:1px solid #4a5a72;box-shadow:0 16px 34px -12px #000;width:660px}
.dock .fld{flex:1;height:36px}
.ks{display:flex;flex-direction:column;gap:6px}
.ks .kr{display:flex;align-items:center;gap:9px;font:12.5px var(--sans);color:var(--txt);min-height:30px;padding:0 4px}
.ks .kr .ic{display:inline-flex;color:var(--dim2)}
.ks .kr .q{font:600 11.5px var(--mono);color:var(--dim)}
.ks .kr .x{display:inline-flex;color:var(--dim2);padding:4px;border-radius:6px}
.akt{display:flex;gap:8px}
.akt .btn{flex:1}
`;
  const box = (namn, f, img, st = '') => `<div class="box${st ? ' ' + st : ''}"><i class="to"></i><i class="si"></i><div class="fr"><img src="${img}" alt=""><span class="et">${pips(f, 11)}${namn}</span></div></div>`;
  const tool = `<div class="tool" style="left:-4px;top:${hc(96) + 12}px"><span class="tb">${ic('minus', 13, 2.4)}</span><b style="font:600 12px var(--mono);color:var(--txt);min-width:14px;text-align:center">4</b><span class="tb">${ic('plus', 13, 2.4)}</span><i class="sep"></i><span class="tb">Sideboard</span><span class="tb">${ic('swap', 13)}Change</span><i class="sep"></i><span class="tb fara">${ic('x', 13, 2.4)}</span></div>`;
  const grp = (namn, n, piles) => `<div class="grp"><div class="gh zr"><span class="zonlbl">${namn}</span><span class="zn">${n}</span></div><div class="hogar">${piles}</div></div>`;
  const w = 96, pl = (k, n, o = {}) => pile(k, n, { w, lab: false, ...o });
  const sug = `<div class="sug" style="position:absolute;left:calc(50% - 330px);bottom:74px;width:470px;z-index:26">
    <div class="si on"><span class="th">${face('bolt', 28)}</span><span class="sn"><b><mark>Light</mark>ning Bolt</b><span>Instant · 4 in this deck</span></span>${cost('R', 12)}<span class="hk"><kbd>↵</kbd></span></div>
    <div class="si"><span class="th">${face('helix', 28)}</span><span class="sn"><b><mark>Light</mark>ning Helix</b><span>Instant · 4 in this deck</span></span>${cost('RW', 12)}</div>
    <div class="si"><span class="th">${face('lstrike', 28)}</span><span class="sn"><b><mark>Light</mark>ning Strike</b><span>Instant</span></span>${cost('1R', 12)}</div>
    <div class="si"><span class="th">${face('lgreaves', 28)}</span><span class="sn"><b><mark>Light</mark>ning Greaves</b><span>Artifact — Equipment</span></span>${cost('2', 12)}</div>
  </div>`;
  const body = `<div class="pg">${topbarSida('Your decks')}
<main class="cb">
  <section class="matta">
    <div class="hylla">
      ${box('', '', '', 'ny').replace('<img src="" alt="">', `<span>${ic('plus', 22, 2.4)}New deck</span>`).replace(/<span class="et">.*?<\/span><\/div>/, '</div>')}
      ${box('Boros Blades', 'WR', 'danitha.jpg', 'on')}
      ${box('Golgari Mill', 'BG', 'pharika.jpg', 'av')}
      ${box('Elves', 'G', 'llanowar.jpg', 'av')}
      ${box('Blue-black flyers', 'UB', 'nighthawk.jpg', 'av')}
    </div>
    <div class="bspread">
      ${grp('Creatures', 19, [pl('swiftspear', 4, { hover: tool }), pl('pikemaster', 4), pl('danitha', 2), pl('phoenix', 3), pl('serra', 4), pl('siege', 2)].join(''))}
      ${grp('Instants', 11, [pl('bolt', 4), pl('helix', 3), pl('charm', 4)].join(''))}
      ${grp('Artifacts &amp; enchantments', 8, [pl('blade', 4), pl('anthem', 4)].join(''))}
      ${grp('Lands', 22, [pl('mountain', 10), pl('plains', 8), pl('foundry', 4)].join(''))}
    </div>
    ${sug}
    <div class="dock"><div class="fld fok"><span class="ic">${ic('search', 15)}</span><span>light<span class="caret"></span></span></div><span class="btn">${ic('paste', 14)}Paste a list</span><span class="btn">${ic('phone', 14)}Scan</span></div>
  </section>
  <aside class="ask">
    <div class="ah">${pips('WR', 15)}<b>Boros Blades</b><span class="ic">${ic('pencil', 14)}</span><span class="grow"></span><span class="n">60 cards</span></div>
    <span style="display:flex;align-items:center;gap:6px;font:12px var(--sans);color:var(--dim2)"><span style="display:inline-flex;color:#8fe0b0">${ic('check', 13, 2.4)}</span>Saved · 2 in the sideboard</span>
    <div class="zr"><span class="zonlbl">Where the cards came from</span><i class="zl"></i></div>
    <div class="ks">
      <div class="kr"><span class="ic">${ic('phone', 14)}</span>Photo 1<span class="grow"></span><span class="q">24</span><span class="x">${ic('x', 12, 2.4)}</span></div>
      <div class="kr"><span class="ic">${ic('phone', 14)}</span>Photo 2<span class="grow"></span><span class="q">12</span><span class="x">${ic('x', 12, 2.4)}</span></div>
      <div class="kr"><span class="ic">${ic('paste', 14)}</span>Pasted list<span class="grow"></span><span class="q">20</span><span class="x">${ic('x', 12, 2.4)}</span></div>
      <div class="kr"><span class="ic">${ic('type', 14)}</span>Typed in<span class="grow"></span><span class="q">4</span><span class="x">${ic('x', 12, 2.4)}</span></div>
    </div>
    <p style="font:12px/1.5 var(--sans);color:var(--dim2)">The × takes out every card from that source — handy for a blurry photo.</p>
    <div class="akt" style="margin-top:auto"><span class="btn">${ic('pencil', 14)}Rename</span><span class="btn fara">${ic('x', 14)}Delete deck…</span></div>
  </aside>
</main></div>`;
  skriv('C3Shelf.dc.html', css, body);
}

/* ════════════════════════════════════════════════════════════════════
   P — telefonen (samma i A, B och C)
   ════════════════════════════════════════════════════════════════════ */
const P_CSS = `
.ph{position:relative;width:390px;height:844px;display:flex;flex-direction:column;background:var(--bg);overflow:hidden}
.phh{display:flex;align-items:center;gap:10px;padding:18px 18px 10px}
.phh .brand{font-size:15px}
.phb{flex:1;min-height:0;display:flex;flex-direction:column;gap:16px;padding:6px 16px 20px}
.btnp{display:flex;align-items:center;justify-content:center;gap:9px;height:52px;border-radius:12px;font:650 16px var(--sans)}
.btnp.prim{background:var(--acc);color:#20160a}
.btnp.sek{background:var(--bg3);border:1px solid var(--line);color:var(--txt)}
`;
function p1() {
  const g = guide({ id: 'p1g', cols: 5, rows: 5, w: 56, off: 12, gap: 8, steps: 'under', pad: 13 });
  const css = P_CSS + g.css + `.phb .gstep{font-size:14px}.phb .gstep .gn{width:22px;height:22px;line-height:22px}`;
  const body = `<div class="ph">
  <div class="phh"><div class="brand">${LOGO}<span>Mesa</span></div><span class="grow"></span><span style="display:flex;align-items:center;gap:7px;font:12.5px var(--sans);color:#8fe0b0"><span class="led"></span>Connected</span></div>
  <div class="phb">
    <div style="display:flex;flex-direction:column;gap:4px"><span style="font:13px var(--sans);color:var(--dim)">Adding cards to</span><span style="display:flex;align-items:center;gap:9px;font:650 22px/1.2 var(--sans)">${pips('WR', 17)}Boros Blades</span></div>
    ${g.html}
    ${g.steg}
    <p style="font:13.5px/1.5 var(--sans);color:var(--dim2)">Up to 30 cards per photo. Leave the basic lands out — you set those on the computer.</p>
    <div style="margin-top:auto;display:flex;flex-direction:column;gap:10px"><div class="btnp prim">${ic('camera', 20, 2.2)}Open the camera</div></div>
  </div>
</div>`;
  skriv('P1Guide.dc.html', css, body, true);
}
function p2() {
  const w = 72, h = hc(w), off = 16, gap = 12;
  const kol = [['danitha', 'danitha'], ['phoenix', 'serra'], ['anthem', 'siege'], ['siege', 'blade']];
  let s = '';
  kol.forEach((k, c) => k.forEach((id, r) => { s += `<div style="position:absolute;left:${c * (w + gap)}px;top:${r * off}px;z-index:${r + 1}">${face(id, w)}</div>`; }));
  const W = 4 * w + 3 * gap, H = h + off;
  const css = P_CSS + `
.cam{position:absolute;inset:0;background:radial-gradient(420px 520px at 50% 45%,#2c3326,#12150f 80%)}
.feed{position:absolute;left:50%;top:230px;translate:-50% 0;transform:rotate(-2deg) perspective(900px) rotateX(9deg);filter:saturate(.85) brightness(.92)}
.feed .kf,.feed .cf{box-shadow:0 3px 8px -2px #000c}
.ram{position:absolute;left:22px;right:22px;top:200px;height:${H + 70}px}
.ram i{position:absolute;width:30px;height:30px;border:3px solid #fff}
.ram .c1{left:0;top:0;border-right:0;border-bottom:0;border-top-left-radius:10px}
.ram .c2{right:0;top:0;border-left:0;border-bottom:0;border-top-right-radius:10px}
.ram .c3{left:0;bottom:0;border-right:0;border-top:0;border-bottom-left-radius:10px}
.ram .c4{right:0;bottom:0;border-left:0;border-top:0;border-bottom-right-radius:10px}
.piller{position:absolute;left:16px;right:16px;top:18px;display:flex;align-items:center;gap:8px}
.pil{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 13px;border-radius:17px;background:#0b1017d9;border:1px solid #ffffff22;font:600 13px var(--sans);color:var(--txt)}
.pil .led{box-shadow:none}
.tips{position:absolute;left:24px;right:24px;bottom:176px;text-align:center;font:600 14px/1.45 var(--sans);color:#fff;text-shadow:0 1px 6px #000}
.nere{position:absolute;left:0;right:0;bottom:0;height:150px;display:flex;align-items:center;justify-content:space-between;padding:0 30px 24px;background:linear-gradient(#0b101700,#0b1017ee 40%)}
.nere span{font:600 15px var(--sans);color:var(--txt);min-width:70px}
.slutare{width:76px;height:76px;border-radius:50%;border:4px solid #fff;display:grid;place-items:center}
.slutare i{width:60px;height:60px;border-radius:50%;background:#fff}
`;
  const body = `<div class="ph">
  <div class="cam"></div>
  <div class="feed" style="width:${W}px;height:${H}px">${s}</div>
  <div class="ram"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i></div>
  <div class="piller"><span class="pil">${ic('camera', 15)}Photo 3</span><span class="grow"></span><span class="pil"><span class="led"></span>Names are readable</span></div>
  <p class="tips">Hold the phone straight above the cards.<br>Every name inside the frame.</p>
  <div class="nere"><span>Done</span><span class="slutare"><i></i></span><span style="text-align:right;font:600 13px var(--mono);color:var(--dim)">36 in deck</span></div>
</div>`;
  skriv('P2Camera.dc.html', css, body);
}
function p3() {
  const kort = ['danitha', 'danitha', 'phoenix', 'serra', 'anthem', 'siege', 'siege'];
  const css = P_CSS + `
.stor{font:700 44px/1 var(--sans);letter-spacing:-1px}
.fk{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.fk .c{position:relative}
.fk .c .kf,.fk .c .cf{width:100%!important;height:auto!important;aspect-ratio:488/680}
.fk .c .q{position:absolute;right:-5px;top:-5px;width:20px;height:20px;border-radius:50%;background:var(--acc);color:#20160a;font:800 12px/20px var(--sans);text-align:center;box-shadow:0 0 0 2px var(--bg)}
.fk .ul{border:1.5px dashed #e8b33a99;border-radius:6px;display:grid;place-items:center;aspect-ratio:488/680;font:11.5px/1.3 var(--sans);color:#e8c98a;text-align:center;padding:6px}
`;
  const body = `<div class="ph">
  <div class="phh"><div class="brand">${LOGO}<span>Mesa</span></div><span class="grow"></span><span style="font:13px var(--sans);color:var(--dim)">Boros Blades</span></div>
  <div class="phb">
    <div style="display:flex;flex-direction:column;gap:8px"><span style="display:flex;align-items:center;gap:8px;font:600 14px var(--sans);color:#8fe0b0">${ic('check', 17, 2.6)}Photo 3 read</span><span class="stor">8 cards</span><span style="font:14.5px/1.5 var(--sans);color:var(--dim)">You’ll see them on the computer — 1 to check and 1 unreadable.</span></div>
    <div class="fk">${kort.map((k, i) => `<div class="c">${face(k, 78)}${i === 6 ? '<span class="q">?</span>' : ''}</div>`).join('')}<div class="ul">Couldn’t read the name</div></div>
    <p style="font:14px/1.5 var(--sans);color:var(--dim2)">Move these cards aside and lay out the next ones the same way.</p>
    <div style="margin-top:auto;display:flex;flex-direction:column;gap:10px"><div class="btnp prim">${ic('camera', 20, 2.2)}Take the next photo</div><div class="btnp sek">Done</div></div>
  </div>
</div>`;
  skriv('P3Read.dc.html', css, body);
}

/* ── alla, och canvas.json ─────────────────────────────────────────── */
today(); a1(); a2(); a3(); a4(); a5(); b1(); b2(); b3(); c1(); c2(); c3(); p1(); p2(); p3();

const X = [0, 1540, 3080, 4620, 6160], D = { w: 1440, h: 900 };
const rad = (y, filer) => filer.map(([file, title], i) => ({ file, title, x: X[i], y, ...D }));
const canvas = {
  artboards: [
    { file: 'Today.dc.html', title: 'Today · My decks dialog', x: 0, y: 0, ...D },
    ...rad(1180, [['A1Decks.dc.html', 'A1 · Your decks'], ['A2New.dc.html', 'A2 · New deck'], ['Main.dc.html', 'A3 · Scanning with the phone'], ['A4Paste.dc.html', 'A4 · Paste a list'], ['A5Type.dc.html', 'A5 · Type a name, edit a card']]),
    ...rad(2360, [['B1Type.dc.html', 'B1 · Drawer: type a name'], ['B2Paste.dc.html', 'B2 · Drawer: paste a list'], ['B3Phone.dc.html', 'B3 · Drawer: from the phone']]),
    ...rad(3540, [['C1Start.dc.html', 'C1 · Lay out and connect'], ['C2Photo.dc.html', 'C2 · A photo on the mat'], ['C3Shelf.dc.html', 'C3 · Shelf, spread and dock']]),
    { file: 'P1Guide.dc.html', title: 'P1 · Phone: how to lay out', x: 0, y: 4720, w: 390, h: 844 },
    { file: 'P2Camera.dc.html', title: 'P2 · Phone: camera', x: 490, y: 4720, w: 390, h: 844 },
    { file: 'P3Read.dc.html', title: 'P3 · Phone: after the photo', x: 980, y: 4720, w: 390, h: 844 },
  ],
  annotations: [
    { id: 'brief', x: -500, y: 0, w: 420, text: 'Lekbyggaren (MES-146) — tre varianter\n\nÖverst dagens dialog, sedan A, B och C, och sist telefonen, som är densamma i alla tre.\n\nAlla tre har samma tre sätt att lägga till kort: telefonen, en inklistrad lista och ett namn i taget. Korten hamnar i samma lek oavsett väg, varje kort går att ändra och ta bort, och alla kort från en källa (till exempel "Photo 2") går att ta bort på en gång.\n\nSkärmarna är statiska. Läggningsguiden är animerad, och tweaken "speed" saktar ner den. Lekarna och korten är påhittade exempel.' },
    { id: 'overlay', x: -500, y: 470, w: 420, text: 'Overlay eller inte?\n\nEn liten ruta i mitten räcker inte. Tre saker ska synas samtidigt: leken, sättet du lägger till kort på och det som behöver kollas.\n\nA och C är därför egna sidor. B visar att en overlay kan fungera, men bara som en hög låda vid kanten, med bordet synligt bredvid.\n\nGemensamt för alla tre:\n• Allt sparas direkt, utan Save-knapp och utan frågan "stäng ändå?".\n• Namnet ändras där det står (pennan). Delete ligger i lekens egen ⋯-meny, inte i en växlare under rubriken.' },
    { id: 'today', x: 1540, y: 0, w: 440, text: 'Dagens dialog — det som skaver\n\n1. Leken du ändrar gömmer sig i en pille bredvid rubriken "My decks". Byt lek, ny lek, döp om och ta bort ligger i pillens meny (öppen här).\n2. Du ser aldrig alla dina lekar på en gång.\n3. De tre vägarna ligger utspridda: fotobrickorna överst, namnfältet under listan, och inklistringen finns bara i tomläget.\n4. Varje rad har två bilder och en källa. Leken ser inte ut som en lek.\n5. Allt ska rymmas i en 820 px bred ruta över bordet. Foto, granskning och inklistring byter ut hela innehållet.\n6. Spara-knappen, och frågan "stäng ändå?" om man glömmer den.' },
    { id: 'a', x: -500, y: 1180, w: 420, text: 'A · Egen sida för lekarna (mitt förslag)\n\nLekarna får en egen sida, som "My games". Hyllan visar alla lekar med omslagsbild, och + New deck står först.\n\nI en öppen lek ligger korten sorterade per typ, med antalet på varje hög. Till höger står "Add cards" med tre flikar: Phone, Paste a list och Type.\n\nKort från telefonen läggs direkt i leken och lyser grönt en stund. Osäkra kort får en gul ring och en fråga om det är rätt kort.\n\n+ Allt syns samtidigt: leken, sättet du lägger till på och det som ska kollas. Leken ser ut som en lek.\n− Du lämnar bordet medan du bygger, men "Back to the table" tar dig tillbaka. Mest att bygga av de tre.' },
    { id: 'import', x: -500, y: 1760, w: 420, text: 'Inklistringen och säkerheten\n\nInklistringen är redan säker i dag. parseDecklist (MES-62) läser texten rad för rad som ren text: antal plus namn. Namnen skrivs ut escapade, och inget körs.\n\nDesignen visar det också för användaren:\n• vad som ignorerades och varför (kod, länkar, felstavade namn)\n• "Use it" för ett felstavat namn\n• en mening om att inget körs\n\nNytt att bygga:\n• tak på 250 rader\n• ta bort kontrolltecken\n• valet Add to the deck / Replace the deck\n• vilket format som känns igen (Moxfield, Arena, MTGO, Plain text)' },
    { id: 'b', x: -500, y: 2360, w: 420, text: 'B · Låda vid kanten (overlayn, fast rätt)\n\nLekknappen i headern öppnar en hög låda från höger, och bordet syns bredvid.\n\nEtt enda fält gör allt:\n• skriv ett namn, så kommer förslag direkt\n• klistra in en lista, så blir fältet en förhandsvisning\n• tryck på "Scan with phone"\n\nLeken visas som en decklista. Korten från telefonen hamnar först i en bricka där du godkänner dem. "Your decks" och "+ New deck" står överst i lådan, och QR-koden visas som i A2 tills telefonen är kopplad.\n\n+ Minst ny UI, snabbast för den som kan sin lek, och bordet syns.\n− Smalt. Korten syns bara som namn, och 60 kort blir en lång lista.' },
    { id: 'c', x: -500, y: 3540, w: 420, text: 'C · Skanningsbordet (telefonen först)\n\nByggt runt den fysiska leken. Mattan visar läggningsguiden stort.\n\nNär ett foto kommer in ligger korten på mattan precis som på ditt bord, kolumn för kolumn, så att du kan jämföra med det du ser framför dig. Sedan lägger du dem i leken till höger.\n\nKlistra in och skriv in finns i en list längst ner på mattan. Lekarna står som askar på en hylla överst. "Paste a list" öppnar samma förhandsvisning som i A4.\n\n+ Starkast för en fysisk lek, med samma bordskänsla som i spelet.\n− Klistra in och skriv in blir andrahandsvägar, och det rör sig mer än i A och B.' },
    { id: 'phone', x: -500, y: 4720, w: 420, text: 'Telefonen (samma i A, B och C)\n\nP1. Efter QR-koden visar guiden hur korten läggs: kolumner där bara namnraden syns, upp till 30 kort per foto, basländerna utanför.\n\nP2. I kameran visar ramen och en lampa om namnen går att läsa.\n\nP3. Efter fotot står hur många kort som lästes, och knappen "Take the next photo".\n\nÖppen fråga: ska telefonen också kunna rätta osäkra kort, eller räcker datorn?' },
  ],
  launch: { view: 'canvas' },
};
writeFileSync(join(UT, 'canvas.json'), JSON.stringify(canvas, null, 2));
console.log('canvas.json');

// Delarna som gen2.mjs (sida 2 och 3) bygger vidare på.
export { K, MC, I, ic, DOTS, LOGO, cost, pips, hc, cf, face, pile, qr, guide, BASE, doc, skriv, topbarSpel, topbarSida, A_CSS, aDeckHead, aKallor, aGrid, aTabs, CX, canvas, UT };

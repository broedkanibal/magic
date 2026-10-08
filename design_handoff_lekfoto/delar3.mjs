// "Mesa Deck Photo Flow E", sida F (Jesper 2026-09-27): utgå från appen som den är i dag.
// Lekens sida (Add cards: Phone · Paste a list · Type), korten till höger med New och Check,
// To check överst, Basic lands längst ned. Uppstarten av ett spel som i dag: välj en lek, "New deck" under.
// Telefonen säger bara om varje kort hittades som ett kort (inga namn, ingen grön bock), med "Retake".
// Alternativ för telefonen efter fotot (P3a–c) och för datorn medan man fotar (C1–C3).
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), 'flowE', 'project');
fs.mkdirSync(OUT, { recursive: true });

const C = { bg: '#0d1015', bg2: '#141922', bg3: '#1b2230', bg4: '#232c3c', line: '#28313f', txt: '#e7ecf4', dim: '#9aa7ba', dim2: '#6f7d93',
  acc: '#f0a52a', blue: '#8fb0ff', green: '#57c785', ink: '#20160a', ny: '#2f6b47' };
const SANS = '-apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Helvetica, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const K = {
  'Ancestral Blade': '29969eeffdcf6aad4638d9b00f560820', 'Aphelia, Viper Whisperer': 'd8f8f448a682910ad87a305e7d998201', 'Coat with Venom': '65dbc6d0a249a7e8c4d017a86c5381a1',
  'Danitha Capashen, Paragon': '48c7b00b7e725bb31c1cd631b5b1ecfd', 'Faithful Pikemaster': '628e151e444b148f2804fc25f566ca5e', 'Fencing Ace': 'b09f3e6c1594ab08b46aaaf2b8a14b3a',
  'Flutterfox': 'ce1b1f1448d7e7eaebf3db702884bfa4', 'Forest': '6dc9176f40f32a3fe23b67e291971ba9', 'Gorgon Flail': 'f0926798bd610067d4fe92bafc6e3d3d',
  'Hooded Blightfang': 'e144b8dc35245879ac9545cc740050b9', 'Island': '0abb74ae9097abd55cb6bde31df2126f', 'Killing Glare': '6f2cd930fcf16054154617dbc919e99e',
  'Maul of the Skyclaves': '5ab0a91d51ad0bf1256ba4d522f27a56', 'Militant Inquisitor': 'b37235336f6de9097ccdc9bb357022a6', 'Mirran Bardiche': '19196e106d6faaeb9fcc3b2cf18cb6fd',
  'Mountain': '7ddb5ae7bcdabdf892d72a2f7fac7231', 'Night’s Whisper': '8bbfa67d4cb824fe82b2159fc1f8b679', 'Pacifism': '696686273edff27e45ca6da4e6b09bdb',
  'Pharika’s Chosen': 'ede71e5e1374a66b998b68119fd2c45a', 'Plains': '1e7e6a103979b7b6a09f4a7866c0a9f9', 'Resistance Reunited': '172d94cfb8f200f2df3cdb86ff5e8d6a',
  'Scourge of the Undercity': '75142c2e0e19db157e39bd16265cf1fa', 'Serpent Assassin': '82bff47bed7aa28b7788a1e3ecdf2b7c', 'Swamp': 'f06df564c9add2eb8fd7d031520da8fe',
  'Thriving Heath': '39478a783d4b1cb1d8e46e1e468eab66', 'Thriving Moor': '6523c797bdba27dd737a20a57917e114', 'Trusty Retriever': '3333fb024a05ee93297a350cb017866b',
  'Ukud Cobra': '4c8ff5c9d892e450be01d89eafd022e2', 'Valkyrie’s Sword': '2fd69cddc4488c685e1c764774da51a2', 'Venomous Hierophant': '821ec360573993731640a0c5471b5f58',
  'Vraska’s Finisher': '7c75e835dc741940cfeffbf903f4af35',
};
const bild = n => '/_blob/' + K[n];
const F07 = { url: '/_blob/f509599f99986704ae2c38e512a216b3', w: 1500, h: 2000 };
const F06 = { url: '/_blob/714cb509a2ac4a5332f93ec8c05efd79', w: 1500, h: 2000 };
const F16 = { url: '/_blob/c886ad6acccd5ab346b12a7129ead44d', w: 1500, h: 1125 };

const CSS = `
body{margin:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,sans-serif}
a{color:${C.acc}}a:hover{color:#ffc15a}
@keyframes laggIn{0%{opacity:0;transform:translateY(-50px) rotate(-6deg)}9%{opacity:1;transform:none}85%{opacity:1;transform:none}95%,100%{opacity:0}}
@keyframes ram{0%{opacity:0;transform:scale(1.15)}5%{opacity:1;transform:scale(1)}88%{opacity:1}96%,100%{opacity:0}}
@keyframes tona{0%{opacity:0}8%,88%{opacity:1}96%,100%{opacity:0}}
@keyframes vrid{0%,30%{transform:rotate(0)}45%,75%{transform:rotate(-90deg)}90%,100%{transform:rotate(0)}}
@keyframes puls{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes in{0%{opacity:0;transform:translateY(12px) scale(.96)}14%,100%{opacity:1;transform:none}}
@keyframes ploppa{0%,20%{opacity:0;transform:translateY(-10px)}30%,100%{opacity:1;transform:none}}
@keyframes rakna{0%{content:"0"}}
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
  phone: (s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5"></rect><path d="M11 18.5h2"></path></svg>`,
  list: (s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"></rect><path d="M9 8h6M9 12h6M9 16h4"></path></svg>`,
  kb: (s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2"></rect><path d="M6 10h1M10 10h1M14 10h1M18 10h0M7 14h10"></path></svg>`,
  back: (s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"></path></svg>`,
  undo: (s = 13) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 7L4 12l5 5"></path><path d="M4 12h10a6 6 0 0 1 0 12"></path></svg>`,
  swap: (s = 12) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"></path></svg>`,
  trash: (s = 12) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"></path></svg>`,
  laptop: (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="11" rx="1.5"></rect><path d="M2 19h20"></path></svg>`,
  rotate: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3M20 4v4h-4"></path><path d="M20 12a8 8 0 0 1-14 5.3M4 20v-4h4"></path></svg>`,
  minus: (s = 12) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"></path></svg>`,
  plus: (s = 12) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12M12 6v12"></path></svg>`,
};
const knapp = (t, typ = 'sek', o = '') => `<button type="button" style="height: 34px; padding: 0 13px; border-radius: 8px; font: 600 13px ${SANS}; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 7px; ${typ === 'prim' ? `background: ${C.acc}; color: ${C.ink}; border: 0` : typ === 'ghost' ? `background: transparent; border: 0; color: ${C.dim}` : `background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}`}; ${o}">${t}</button>`;

/* ═══ Lekens sida som i dag ═══════════════════════════════════════════ */
function kortRuta(n, o = {}) {
  const w = o.w || 100, h = Math.round(w * 1.395);
  const ram = o.check ? `box-shadow: 0 0 0 2px ${C.acc}, 0 0 14px #f0a52a55;` : o.ny ? `box-shadow: 0 0 0 1.5px ${C.ny}, 0 0 12px #57c78540;` : '';
  const anim = o.anim ? `animation: in 6s ${o.anim}s infinite both;` : '';
  const kort = o.okand
    ? `<div style="width: ${w}px; height: ${h}px; box-sizing: border-box; border-radius: 6px; border: 2px dashed ${C.acc}; background: #1d1810; display: grid; place-items: center; color: ${C.acc}; font: 800 30px ${SANS}">?</div>`
    : `<img src="${bild(n)}" alt="${n}" style="width: ${w}px; height: ${h}px; border-radius: 6px; display: block">`;
  return `<figure style="margin: 0; width: ${w}px; display: flex; flex-direction: column; gap: 6px; ${anim}"><div style="position: relative; border-radius: 6px; ${ram}">${kort}`
    + (o.ny ? `<span style="position: absolute; left: -4px; top: -7px; padding: 1px 6px; border-radius: 99px; background: #0f2016; border: 1px solid ${C.ny}; color: #8fe0b0; font: 700 10px ${SANS}">New</span>` : '')
    + `<span style="position: absolute; right: -6px; top: -7px; min-width: 18px; height: 18px; padding: 0 4px; box-sizing: border-box; border-radius: 99px; background: #0d1015; border: 1px solid #39445a; color: ${C.txt}; font: 700 10.5px ${MONO}; display: grid; place-items: center">${o.n || 1}</span>`
    + (o.check ? `<span style="position: absolute; left: 50%; bottom: -8px; transform: translateX(-50%); padding: 1px 8px; border-radius: 99px; background: ${C.acc}; color: ${C.ink}; font: 700 10.5px ${SANS}">Check</span>` : '')
    + `</div><figcaption style="font: 500 12px/1.3 ${SANS}; color: ${C.dim}; padding-top: 2px">${o.okand ? 'Which card?' : n}</figcaption></figure>`;
}
const sektion = (t, n, kort, o = '') => `<section style="display: flex; flex-direction: column; gap: 12px; ${o}"><div style="display: flex; align-items: center; gap: 10px; font: 700 11px ${MONO}; letter-spacing: 1px; color: ${C.dim}"><span>${t.toUpperCase()}</span><span style="color: ${C.dim2}">${n}</span><i style="flex-grow: 1; height: 1px; background: ${C.line}"></i></div><div style="display: flex; flex-wrap: wrap; gap: 18px 14px">${kort}</div></section>`;
const BAS = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];
function basland(v, hint, fran) {
  const n = BAS.reduce((s, b) => s + (v[b] || 0), 0);
  return `<section style="display: flex; flex-direction: column; gap: 12px"><div style="display: flex; align-items: center; gap: 10px; font: 700 11px ${MONO}; letter-spacing: 1px; color: ${C.dim}"><span>BASIC LANDS</span><span style="color: ${C.dim2}">${n}</span><i style="flex-grow: 1; height: 1px; background: ${C.line}"></i></div>`
    + `<div style="display: flex; gap: 14px; align-items: flex-end">${BAS.map(b => `<div style="display: flex; flex-direction: column; align-items: center; gap: 6px; width: 84px"><img src="${bild(b)}" alt="${b}" style="width: 52px; height: 72px; border-radius: 4px; ${v[b] ? '' : 'opacity: .55'}"><div style="display: flex; align-items: center; border: 1px solid ${C.line}; border-radius: 7px; background: ${C.bg2}"><button type="button" aria-label="Fewer ${b}" style="width: 24px; height: 26px; border: 0; background: transparent; color: ${C.dim}; display: grid; place-items: center; cursor: pointer">${ik.minus()}</button><b style="width: 24px; text-align: center; font: 700 12.5px ${MONO}; color: ${C.txt}">${v[b] || 0}</b><button type="button" aria-label="More ${b}" style="width: 24px; height: 26px; border: 0; background: transparent; color: ${C.dim}; display: grid; place-items: center; cursor: pointer">${ik.plus()}</button></div>${fran && fran[b] ? `<span style="font: 500 10.5px ${SANS}; color: ${C.green}; white-space: nowrap">${fran[b]} in photos</span>` : '<span style="height: 13px"></span>'}</div>`).join('')}<span style="font: 400 13px/1.45 ${SANS}; color: ${C.dim}; max-width: 260px; padding: 0 0 24px 10px">${hint}</span></div></section>`;
}
/* To check-rutan som i dag: rubrik, och en rad per kort med remsan ur fotot. */
function remsa(f, sx, sy, sw, sh, dw) {
  const s = dw / sw, dh = Math.round(sh * s);
  return `<div style="position: relative; width: ${dw}px; height: ${dh}px; overflow: hidden; border-radius: 4px; flex: none; border: 1px solid #3a2e14"><img src="${f.url}" alt="The name line in the photo" style="position: absolute; left: ${Math.round(-sx * s)}px; top: ${Math.round(-sy * s)}px; width: ${Math.round(f.w * s)}px; height: ${Math.round(f.h * s)}px; max-width: none"></div>`;
}
function attKolla(rader, sub, o = {}) {
  return `<div style="display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border-radius: 12px; border: 1px solid #6a5220; background: #17140e; ${o.anim ? 'animation: ploppa 7s ease-out infinite both;' : ''}"><div style="display: flex; align-items: center; gap: 10px"><i style="width: 8px; height: 8px; border-radius: 50%; background: ${C.acc}"></i><b style="font: 700 13.5px ${SANS}; color: ${C.acc}">To check</b><span style="font: 700 12px ${MONO}; color: ${C.acc}">${rader.length}</span><span style="font: 400 12.5px ${SANS}; color: ${C.dim}">${sub}</span></div>${rader.join('')}</div>`;
}
const kollRad = (o) => `<div style="display: flex; align-items: center; gap: 14px; padding: 10px 12px; border-radius: 10px; background: ${C.bg2}; border: 1px solid ${C.line}">`
  + (o.remsa || '') + (o.okand ? `<span style="width: 44px; height: 61px; border-radius: 4px; border: 1.5px dashed ${C.acc}; display: grid; place-items: center; color: ${C.acc}; font: 800 18px ${SANS}; flex: none">?</span>` : `<img src="${bild(o.namn)}" alt="${o.namn}" style="width: 44px; height: 61px; border-radius: 4px; flex: none">`)
  + `<div style="display: flex; flex-direction: column; gap: 3px; flex-grow: 1; min-width: 0"><b style="font: 650 14px ${SANS}">${o.fraga}</b><span style="font: 400 12.5px ${SANS}; color: ${C.dim}">${o.under}</span></div>`
  + `<div style="display: flex; gap: 6px; flex: none">${o.okand ? knapp(ik.swap() + 'Pick the card…', 'prim') : knapp(ik.check(12) + 'Yes', 'prim') + knapp(ik.swap() + 'Pick another…')}${knapp(ik.trash() + 'Remove', 'ghost')}</div></div>`;

function lekSida(titel, o) {
  const antal = o.antal;
  const huvud = o.setup
    ? `<header style="height: 58px; flex: none; display: flex; align-items: center; gap: 14px; padding: 0 22px; border-bottom: 1px solid ${C.line}"><button type="button" style="display: flex; align-items: center; gap: 6px; border: 0; background: transparent; color: ${C.dim}; font: 500 14px ${SANS}; cursor: pointer">${ik.back()}Game setup</button><i style="width: 1px; height: 22px; background: ${C.line}"></i><b style="font: 700 18px ${SANS}">${o.namn || 'New deck 3'}</b><span style="font: 600 13px ${MONO}; color: ${C.dim}">${antal} cards</span><span style="flex-grow: 1"></span>${o.setupKlar ? knapp('Use this deck', 'prim', 'height: 36px') : `<span style="font: 500 13px ${SANS}; color: ${C.dim}">${ik.check(13)} Saved</span>`}</header>`
    : `<header style="height: 58px; flex: none; display: flex; align-items: center; gap: 14px; padding: 0 22px; border-bottom: 1px solid ${C.line}"><button type="button" style="display: flex; align-items: center; gap: 6px; border: 0; background: transparent; color: ${C.dim}; font: 500 14px ${SANS}; cursor: pointer">${ik.back()}Home</button><i style="width: 1px; height: 22px; background: ${C.line}"></i><b style="font: 700 18px ${SANS}">${o.namn || 'New deck 3'}</b><span style="font: 600 13px ${MONO}; color: ${C.dim}">${antal} cards</span><span style="flex-grow: 1"></span><span style="display: flex; align-items: center; gap: 6px; font: 500 13px ${SANS}; color: ${C.dim}">${ik.check(13)}Saved</span><span style="font: 700 16px ${SANS}; color: ${C.dim}; padding-left: 10px">···</span></header>`;
  const flikar = `<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 10px; border: 1px solid ${C.line}; background: ${C.bg}">${[['Phone', ik.phone()], ['Paste a list', ik.list()], ['Type', ik.kb()]].map(([t, i], j) => `<button type="button" style="height: 32px; border-radius: 7px; border: ${j === 0 ? `1px solid #3d4a5f` : '0'}; background: ${j === 0 ? C.bg3 : 'transparent'}; color: ${j === 0 ? C.txt : C.dim}; font: 600 12.5px ${SANS}; display: flex; align-items: center; justify-content: center; gap: 7px; cursor: pointer">${i}${t}</button>`).join('')}</div>`;
  return sida(titel, 1440, 900,
    `<div style="width: 1440px; height: 900px; box-sizing: border-box; background: ${C.bg}; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column">`
    + `<div style="height: 44px; flex: none; display: flex; align-items: center; gap: 10px; padding: 0 22px; background: #0b0e13; border-bottom: 1px solid ${C.line}"><b style="font: 800 15px ${SANS}; color: ${C.acc}">Mesa</b><span style="flex-grow: 1"></span><span style="display: flex; align-items: center; gap: 7px; font: 600 13px ${SANS}"><i style="width: 7px; height: 7px; border-radius: 50%; background: ${C.acc}"></i>Jesper</span></div>`
    + huvud
    + `<div style="flex-grow: 1; min-height: 0; display: flex">`
    + `<aside style="width: 400px; flex: none; box-sizing: border-box; padding: 20px 20px; border-right: 1px solid ${C.line}; background: #11151c; display: flex; flex-direction: column; gap: 14px; overflow: hidden"><b style="font: 700 15px ${SANS}">Add cards</b>${flikar}${o.panel}</aside>`
    + `<main style="flex-grow: 1; min-width: 0; box-sizing: border-box; padding: 20px 28px; display: flex; flex-direction: column; gap: 22px; overflow: hidden">${o.hoger}</main>`
    + `</div></div>`, o.sidaO || {});
}
/* Vänsterpanelens steg, som i dag: nummer i en ring, rubrik, text. */
const steg = (nr, titel, text, o = {}) => `<div style="display: flex; gap: 12px"><span style="width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; flex: none; font: 700 11.5px ${MONO}; ${o.klar ? `background: #0f2016; border: 1px solid ${C.ny}; color: #8fe0b0` : o.nu ? `background: ${C.acc}; color: ${C.ink}` : `border: 1px solid #39445a; color: ${C.dim2}`}">${o.klar ? ik.check(11, 3) : nr}</span><div style="display: flex; flex-direction: column; gap: 6px; flex-grow: 1; min-width: 0"><b style="font: 650 14px ${SANS}; color: ${o.nu || o.klar ? C.txt : C.dim}">${titel}</b>${text ? `<span style="font: 400 13px/1.5 ${SANS}; color: ${C.dim}">${text}</span>` : ''}${o.extra || ''}</div></div>`;
const fotoRad = (nr, text, o = {}) => `<div style="display: flex; align-items: center; gap: 12px; padding: 9px 12px; border-radius: 10px; background: ${o.nu ? '#1d1810' : C.bg2}; border: 1px solid ${o.nu ? '#6a5220' : C.line}; ${o.anim ? 'animation: ploppa 7s ease-out infinite both;' : ''}"><span style="width: 34px; height: 26px; border-radius: 4px; background: repeating-linear-gradient(90deg, #39445a 0 5px, transparent 5px 8px); flex: none; opacity: .8"></span><div style="display: flex; flex-direction: column; gap: 2px; flex-grow: 1"><b style="font: 650 13.5px ${SANS}">Photo ${nr}</b><span style="font: 500 12.5px ${SANS}; color: ${o.koll ? C.acc : C.dim}">${text}</span></div>${o.hoger || `<span style="color: ${C.green}">${ik.check(15, 2.6)}</span>`}</div>`;
const ansluten = `<div style="display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 10px; background: #0f1d15; border: 1px solid #24503a; font: 500 13px ${SANS}; color: #bfe8cf"><i style="width: 8px; height: 8px; border-radius: 50%; background: ${C.green}"></i>Phone connected. The photos land in this deck.</div>`;

/* Korten i leken, per typ. */
const TYP = {
  Creatures: ['Aphelia, Viper Whisperer', 'Danitha Capashen, Paragon', 'Faithful Pikemaster', 'Fencing Ace', 'Flutterfox', 'Hooded Blightfang', 'Militant Inquisitor', 'Pharika’s Chosen', 'Scourge of the Undercity', 'Serpent Assassin', 'Trusty Retriever', 'Ukud Cobra', 'Venomous Hierophant', 'Vraska’s Finisher'],
  'Instants & sorceries': ['Coat with Venom', 'Killing Glare', 'Night’s Whisper', 'Resistance Reunited'],
  'Artifacts & enchantments': ['Ancestral Blade', 'Gorgon Flail', 'Maul of the Skyclaves', 'Mirran Bardiche', 'Pacifism', 'Valkyrie’s Sword'],
  Lands: ['Thriving Heath', 'Thriving Moor'],
};
/* Efter foto 1 och 2 (foto-07 och foto-06). */
const EFTER2 = new Set(['Pharika’s Chosen', 'Killing Glare', 'Ukud Cobra', 'Valkyrie’s Sword', 'Trusty Retriever', 'Flutterfox', 'Gorgon Flail', 'Night’s Whisper', 'Thriving Moor', 'Resistance Reunited', 'Pacifism', 'Maul of the Skyclaves', 'Aphelia, Viper Whisperer', 'Thriving Heath', 'Coat with Venom', 'Hooded Blightfang']);
function kortGrid(urval, o = {}) {
  return Object.entries(TYP).map(([t, lista]) => {
    const l = lista.filter(n => urval.has(n));
    if (!l.length) return '';
    return sektion(t, l.length, l.map((n, i) => kortRuta(n, { ny: o.ny, check: (o.check || []).includes(n), okand: (o.okand || []).includes(n), w: o.w || 92, anim: o.anim && (o.nya || []).includes(n) ? (0.15 * i) : 0 })).join(''));
  }).join('');
}

/* Titelraderna i foto-07 och foto-06, för ramar och remsor. */
const T07 = [[215, 360, 420, 44], [200, 500, 420, 44], [185, 680, 420, 44], [230, 840, 420, 44], [230, 990, 420, 44], [235, 1165, 420, 44], [825, 395, 400, 44], [845, 535, 410, 44], [870, 725, 410, 44], [870, 850, 400, 44], [880, 1040, 410, 50], [910, 1200, 400, 44]];
/* Hela korten i foto-07 (synlig del), för ramar på telefonen. */
const K07 = [[180, 310, 470, 140], [165, 440, 470, 175], [150, 610, 490, 170], [190, 770, 490, 150], [190, 915, 500, 170], [195, 1085, 530, 700], [790, 330, 470, 135], [810, 465, 470, 185], [830, 645, 460, 145], [830, 790, 470, 185], [800, 975, 555, 160], [830, 1130, 520, 690]];

export { fs, path, OUT, C, SANS, MONO, K, bild, F07, F06, F16, CSS, sida, ik, knapp, kortRuta, sektion, BAS, basland, remsa, attKolla, steg, fotoRad, ansluten, TYP, EFTER2, kortGrid, T07, K07 };

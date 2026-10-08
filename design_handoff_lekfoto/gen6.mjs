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

const filer = {};
const skriv = (n, h) => { filer[n] = h; };

/* ══ F1 · Lekens sida, Phone-fliken innan telefonen är ansluten ═══════ */
const qr = (() => {
  let s = ''; const n = 25, c = 5;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const ax = x >= n - 7 ? x - (n - 7) : x, ay = y >= n - 7 ? y - (n - 7) : y;
    const hörn = (x < 7 || x >= n - 7) && (y < 7 || y >= n - 7) && !(x >= n - 7 && y >= n - 7);
    const f = hörn ? (ax === 0 || ay === 0 || ax === 6 || ay === 6 || (ax >= 2 && ax <= 4 && ay >= 2 && ay <= 4)) : ((x * 7 + y * 13 + x * y) % 5) < 2;
    if (f) s += `<rect x="${x * c}" y="${y * c}" width="${c}" height="${c}"></rect>`;
  }
  return `<svg width="${n * c}" height="${n * c}" viewBox="0 0 ${n * c} ${n * c}" fill="#0d1015" role="img" aria-label="Code to scan with the phone">${s}</svg>`;
})();
const landVal = (vald, titel, text) => `<label style="display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 10px; cursor: pointer; ${vald ? `background: #2a200e; border: 1.5px solid ${C.acc}` : `background: ${C.bg2}; border: 1px solid ${C.line}`}"><input type="radio" name="bl" ${vald ? 'checked' : ''} style="width: 17px; height: 17px; margin: 1px 0 0; accent-color: ${C.acc}; flex: none"><span style="display: flex; flex-direction: column; gap: 2px"><b style="font: 650 13.5px ${SANS}">${titel}</b><span style="font: 400 12.5px/1.4 ${SANS}; color: ${C.dim}">${text}</span></span></label>`;
const f1Panel = steg(1, 'Connect your phone', 'Scan the code with your phone’s camera. Nothing to install.', { nu: true, extra: `<div style="display: flex; gap: 14px; align-items: center"><div style="padding: 9px; border-radius: 10px; background: #f4f1ea">${qr}</div><span style="display: flex; align-items: center; gap: 8px; font: 600 13px ${SANS}; color: ${C.acc}"><i style="width: 8px; height: 8px; border-radius: 50%; background: ${C.acc}; animation: puls 1.6s infinite"></i>Waiting for your phone</span></div>` })
  + steg(2, 'Choose how to add basic lands', null, { extra: `<div style="display: flex; flex-direction: column; gap: 8px">${landVal(true, 'Photograph them with the other cards', 'Mesa counts them from the photos.')}${landVal(false, 'Leave them out of the photos', 'Set how many at the bottom of the deck.')}</div>` })
  + steg(3, 'Photograph the cards', 'Lay them out on the table and take one photo at a time. The cards show up here as each photo is read.');
skriv('F1.dc.html', lekSida('F1: deck page, the Phone tab', { antal: 0, panel: f1Panel,
  hoger: `<div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; color: ${C.dim}"><b style="font: 700 17px ${SANS}; color: ${C.txt}">No cards yet</b><span style="font: 400 14px/1.5 ${SANS}; max-width: 420px">Add them one of the three ways on the left. They show up here, sorted by type, and you can change or remove every card.</span></div>` }));

/* ══ F2 · Uppstarten som i dag: välj lek, New deck under ═══════════════ */
skriv('F2.dc.html', sida('F2: game setup, pick a deck', 1440, 900,
  `<div style="position: relative; width: 1440px; height: 900px; box-sizing: border-box; background: #0f1a14; color: ${C.txt}; font-family: ${SANS}; overflow: hidden">`
  + `<aside style="position: absolute; left: 0; top: 0; bottom: 0; width: 420px; box-sizing: border-box; padding: 24px 22px; background: ${C.bg2}; border-right: 1px solid ${C.line}; display: flex; flex-direction: column; gap: 16px">`
  + `<div style="display: flex; flex-direction: column; gap: 3px"><span style="font: 600 11.5px ${MONO}; letter-spacing: 0.8px; color: ${C.dim}">GAME SETUP</span><b style="font: 750 22px ${SANS}">Get ready for the game</b></div>`
  + steg(1, 'Pick your deck', null, { nu: true, extra: `<div style="display: flex; flex-direction: column; gap: 8px">${[['Boros Burn', '60 cards', 'Last used'], ['Gorgons and Knights', '40 cards', '']].map(([t, n, s], i) => `<button type="button" style="display: flex; align-items: center; gap: 12px; text-align: left; padding: 10px 12px; border-radius: 10px; background: ${i === 0 ? '#2a200e' : C.bg3}; border: ${i === 0 ? `1.5px solid ${C.acc}` : `1px solid ${C.line}`}; color: ${C.txt}; cursor: pointer"><img src="${bild(i === 0 ? 'Fencing Ace' : 'Venomous Hierophant')}" alt="" style="width: 30px; height: 42px; border-radius: 3px"><span style="display: flex; flex-direction: column; gap: 2px; flex-grow: 1"><b style="font: 650 14px ${SANS}">${t}</b><span style="font: 500 12.5px ${SANS}; color: ${C.dim}">${n}${s ? ' · ' + s : ''}</span></span></button>`).join('')}${knapp('New deck', 'sek', 'align-self: flex-start; margin-top: 4px')}</div>` })
  + steg(2, 'Your camera', null) + steg(3, 'Graveyard and library', null) + steg(4, 'Invite your friends', null)
  + `<span style="flex-grow: 1"></span>${knapp('Continue', 'prim', 'height: 42px; align-self: stretch')}</aside>`
  + `<div style="position: absolute; left: 470px; top: 60px; right: 60px; display: flex; flex-direction: column; gap: 10px; color: ${C.dim}"><span style="font: 500 14px/1.5 ${SANS}; max-width: 520px">New deck opens the deck page inside the setup (F3 onward, with "Game setup" in the top bar). When you press Use this deck, you come back here with the deck picked.</span></div>`
  + `</div>`));

/* ══ Telefonen ═════════════════════════════════════════════════════════ */
function telefon(titel, kropp, fot, o = {}) {
  return sida(titel, 390, 844,
    `<div style="position: relative; width: 390px; height: 844px; box-sizing: border-box; background: ${C.bg}; color: ${C.txt}; font-family: ${SANS}; display: flex; flex-direction: column; padding: 20px 18px 22px; gap: 16px; overflow: hidden">`
    + `<div style="display: flex; flex-direction: column; gap: 16px; flex-grow: 1; min-height: 0">${kropp}</div>`
    + (fot ? `<div style="display: flex; flex-direction: column; gap: 10px">${fot}</div>` : '') + `</div>`, o);
}
const tknapp = (t, typ = 'prim', ikon = '') => `<button type="button" style="height: 52px; width: 100%; border-radius: 12px; font: 650 16px ${SANS}; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 9px; ${typ === 'prim' ? `background: ${C.acc}; color: ${C.ink}; border: 0` : `background: ${C.bg3}; border: 1px solid ${C.line}; color: ${C.txt}`}">${ikon}${t}</button>`;
const telHuvud = (t) => `<div style="display: flex; align-items: center; justify-content: space-between"><span style="display: flex; align-items: center; gap: 8px; font: 600 13px ${SANS}; color: ${C.green}"><i style="width: 8px; height: 8px; border-radius: 50%; background: ${C.green}"></i>Connected</span><span style="font: 600 13px ${SANS}; color: ${C.dim}">${t}</span></div>`;

/* P1 · Lägg ut korten: digitala kort faller ned i kolumner. */
{
  const kolumner = [['Pharika’s Chosen', 'Killing Glare', 'Ukud Cobra', 'Swamp', 'Night’s Whisper'], ['Valkyrie’s Sword', 'Trusty Retriever', 'Flutterfox', 'Plains', 'Gorgon Flail'], ['Thriving Moor', 'Resistance Reunited', 'Pacifism', 'Maul of the Skyclaves']];
  const kw = 96, steg_ = 24;
  const kol = kolumner.map((l, ci) => `<div style="position: absolute; left: ${14 + ci * (kw + 18)}px; top: 14px; width: ${kw}px">${l.map((n, i) => `<img src="${bild(n)}" alt="${n}" style="position: absolute; left: 0; top: ${i * steg_}px; width: ${kw}px; height: ${Math.round(kw * 1.395)}px; border-radius: 5px; box-shadow: 0 3px 8px #0009; animation: laggIn 9s ${(ci * 1.6 + i * 0.32).toFixed(2)}s infinite both">`).join('')}</div>`).join('');
  const hojd = 14 + 4 * steg_ + Math.round(kw * 1.395) + 14;
  skriv('P1.dc.html', telefon('P1: phone, lay out the cards',
    telHuvud('New deck 3')
    + `<div style="display: flex; flex-direction: column; gap: 6px"><span style="font: 600 12px ${MONO}; letter-spacing: 0.6px; color: ${C.dim}">PHOTO 1</span><h1 style="margin: 0; font: 750 27px/1.15 ${SANS}; letter-spacing: -0.4px">Lay out the cards</h1></div>`
    + `<div style="position: relative; height: ${hojd}px; border-radius: 12px; background: #6b4424; overflow: hidden">${kol}</div>`
    + `<ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 9px">${[['In columns, overlapping, so each name shows'], ['As many as fit while the names stay readable'], ['Portrait or landscape, both work']].map(([t]) => `<li style="display: flex; gap: 11px; align-items: flex-start; font: 500 14.5px/1.4 ${SANS}"><span style="color: ${C.dim}; flex: none; padding-top: 1px">•</span>${t}</li>`).join('')}</ul>`,
    tknapp('Open camera', 'prim', ik.camera())));
}

/* P2 · Kameran: hela bilden, stående eller liggande. */
{
  const dh = 844, dw = Math.round(1500 * dh / 2000), off = Math.round((dw - 390) / 2);
  skriv('P2.dc.html', telefon('P2: phone, the camera',
    `<div style="position: absolute; left: 0; top: 0; width: 390px; height: 844px; overflow: hidden; background: #000"><img src="${F07.url}" alt="The camera view of the cards" style="position: absolute; left: ${-off}px; top: 0; width: ${dw}px; height: ${dh}px; max-width: none">`
    + `<div style="position: absolute; left: 16px; right: 16px; top: 18px; display: flex; justify-content: space-between"><span style="padding: 8px 12px; border-radius: 99px; background: #0d1015d9; font: 650 14px ${SANS}">Photo 1</span><span style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 99px; background: #0d1015d9; font: 600 13.5px ${SANS}"><span style="display: grid; place-items: center; animation: vrid 5s ease-in-out infinite">${ik.phone(15)}</span>Portrait or landscape</span></div>`
    + `<div style="position: absolute; left: 16px; right: 16px; bottom: 132px; padding: 12px 14px; border-radius: 12px; background: #0d1015d9; font: 500 14px/1.45 ${SANS}; text-align: center">Hold the phone straight above the cards.<br><span style="color: #c7d0dd">Everything in the picture is read.</span></div>`
    + `<div style="position: absolute; left: 0; right: 0; bottom: 30px; display: flex; align-items: center; justify-content: space-between; padding: 0 36px"><button type="button" style="border: 0; background: transparent; color: ${C.txt}; font: 600 16px ${SANS}; cursor: pointer; width: 70px; text-align: left; text-shadow: 0 1px 3px #000">Back</button><button type="button" aria-label="Take photo" style="width: 78px; height: 78px; border-radius: 50%; background: #fff; border: 5px solid #ffffff66; background-clip: padding-box; cursor: pointer"></button><span style="width: 70px"></span></div></div>`, null));
}

/* P3 · Efter fotot: tre sätt att visa att korten hittades som kort, utan namn. */
function ramFoto(dw, o = {}) {
  const s = dw / 1500, dh = Math.round(2000 * s);
  const ramar = K07.map(([x, y, w, h], i) => {
    const miss = o.miss === i;
    return `<div style="position: absolute; left: ${Math.round(x * s)}px; top: ${Math.round(y * s)}px; width: ${Math.round(w * s)}px; height: ${Math.round(Math.min(h, 150) * s)}px; box-sizing: border-box; border-radius: 4px; border: 2px ${miss ? 'dashed' : 'solid'} ${miss ? C.acc : '#e7ecf4'}; background: ${miss ? '#f0a52a22' : '#e7ecf41a'}; animation: ram 7s ${(0.22 * i).toFixed(2)}s infinite both"><span style="position: absolute; left: -2px; top: -2px; min-width: 18px; height: 18px; padding: 0 4px; box-sizing: border-box; border-radius: 4px 0 4px 0; background: ${miss ? C.acc : '#e7ecf4'}; color: ${C.ink}; font: 800 10.5px ${MONO}; display: grid; place-items: center">${miss ? '?' : i + 1}</span>${o.tryck && !miss ? '' : ''}</div>`;
  }).join('');
  return `<div style="position: relative; width: ${dw}px; height: ${dh}px; border-radius: 10px; overflow: hidden; flex: none"><img src="${F07.url}" alt="Photo 1" style="position: absolute; left: 0; top: 0; width: ${dw}px; height: ${dh}px">${ramar}</div>`;
}
skriv('P3a.dc.html', telefon('P3a: after the photo, frames and a count',
  `<div style="display: flex; align-items: baseline; justify-content: space-between"><b style="font: 750 26px ${SANS}; letter-spacing: -0.4px">12 cards found</b><span style="font: 600 13px ${SANS}; color: ${C.dim}">Photo 1</span></div>`
  + ramFoto(354)
  + `<p style="margin: 0; font: 500 15px/1.45 ${SANS}">Does every card have a frame? <span style="color: ${C.dim}">Names are checked on the computer.</span></p>`,
  tknapp('Yes, take the next photo', 'prim', ik.camera()) + `<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">${tknapp('Retake', 'sek')}${tknapp('Last photo', 'sek')}</div>`));
skriv('P3b.dc.html', telefon('P3b: after the photo, only the count',
  `<div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 14px; padding-top: 70px"><span style="font: 600 13px ${MONO}; letter-spacing: 0.6px; color: ${C.dim}">PHOTO 1</span><b style="font: 800 88px/1 ${SANS}; letter-spacing: -3px">12</b><b style="font: 700 22px ${SANS}">cards found</b><p style="margin: 0; font: 400 15.5px/1.5 ${SANS}; color: ${C.dim}; max-width: 290px">Did you lay out 12? If not, retake the photo. Names are checked on the computer.</p>`
  + `<div style="display: flex; gap: 6px; padding-top: 8px">${Array.from({ length: 12 }, (_, i) => `<span style="width: 16px; height: 22px; border-radius: 3px; background: #e7ecf4; opacity: .85; animation: ram 7s ${(0.18 * i).toFixed(2)}s infinite both"></span>`).join('')}</div></div>`,
  tknapp('Take the next photo', 'prim', ik.camera()) + `<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">${tknapp('Retake', 'sek')}${tknapp('Last photo', 'sek')}</div>`));
skriv('P3c.dc.html', telefon('P3c: after the photo, fix the frames',
  `<div style="display: flex; align-items: baseline; justify-content: space-between"><b style="font: 750 26px ${SANS}; letter-spacing: -0.4px">11 cards found</b><span style="font: 600 13px ${SANS}; color: ${C.dim}">Photo 1</span></div>`
  + ramFoto(354, { miss: 10 })
  + `<div style="display: flex; gap: 12px; align-items: flex-start; padding: 11px 13px; border-radius: 12px; background: #1d1810; border: 1px solid #6a5220"><span style="width: 20px; height: 20px; border-radius: 4px; background: ${C.acc}; color: ${C.ink}; display: grid; place-items: center; font: 800 11px ${MONO}; flex: none">?</span><span style="font: 500 14px/1.45 ${SANS}">Mesa wasn’t sure this is a card. <span style="color: ${C.dim}">Tap it to keep it, or retake the photo.</span></span></div>`,
  tknapp('Take the next photo', 'prim', ik.camera()) + `<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">${tknapp('Retake', 'sek')}${tknapp('Last photo', 'sek')}</div>`));
skriv('P4.dc.html', telefon('P4: phone, done',
  `<div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; padding-top: 120px"><span style="width: 76px; height: 76px; border-radius: 50%; display: grid; place-items: center; background: #101a2e; border: 1px solid #2a3a66; color: #b9c8ff">${ik.laptop(36)}</span><h1 style="margin: 0; font: 750 26px/1.2 ${SANS}; letter-spacing: -0.3px">Finish on the computer</h1><p style="margin: 0; font: 400 16px/1.5 ${SANS}; color: ${C.dim}; max-width: 300px">4 photos, 40 cards. Check the names Mesa wasn’t sure of on the computer.</p></div>`,
  tknapp('Take another photo', 'sek', ik.camera())));

/* ══ Datorn medan man fotar: tre alternativ ═════════════════════════════ */
const remsaGorgon = remsa(F07, 870, 1030, 440, 80, 150), remsaOkand = remsa(F06, 795, 220, 420, 80, 150);
const rader2 = [
  kollRad({ remsa: remsaGorgon, namn: 'Gorgon Flail', fraga: 'Did you mean Gorgon Flail?', under: 'Photo 1 · 1 copy' }),
  kollRad({ remsa: remsaOkand, okand: true, fraga: 'Which card is this?', under: 'Photo 2 · the name couldn’t be read' }),
];
const lagen2 = { Plains: 3, Swamp: 5 };
const nya2 = ['Thriving Moor', 'Resistance Reunited', 'Pacifism', 'Maul of the Skyclaves', 'Aphelia, Viper Whisperer', 'Thriving Heath', 'Coat with Venom', 'Hooded Blightfang'];
const fotoPanel = (extra) => ansluten
  + fotoRad(1, '12 cards · 1 to check', { koll: true })
  + fotoRad(2, '12 cards · 1 to check', { koll: true, anim: true })
  + extra;
const nasta = steg(3, 'Photo 3', 'Lay out the next cards and take the photo on your phone.', { nu: true });
skriv('C1.dc.html', lekSida('C1: computer, fix as you go', { antal: 24,
  panel: fotoPanel(nasta + `<span style="font: 400 12.5px/1.5 ${SANS}; color: ${C.dim}">Check the cards now or after the last photo. The deck is saved either way.</span>`),
  hoger: attKolla(rader2, 'After each photo, the names Mesa wasn’t sure of show up here.', { anim: true })
    + kortGrid(EFTER2, { ny: true, check: ['Gorgon Flail'], okand: ['Hooded Blightfang'], anim: true, nya: nya2 })
    + basland(lagen2, 'Counted from the photos so far.', lagen2) }));
skriv('C2.dc.html', lekSida('C2: computer, photograph first, check at the end', { antal: 24,
  panel: fotoPanel(nasta + `<div style="display: flex; gap: 10px; align-items: center; padding: 10px 12px; border-radius: 10px; background: #1d1810; border: 1px solid #6a5220; font: 500 13px/1.45 ${SANS}"><i style="width: 8px; height: 8px; border-radius: 50%; background: ${C.acc}; flex: none"></i>2 names to check. They wait until you press Last photo.</div>`),
  hoger: kortGrid(EFTER2, { ny: true, check: ['Gorgon Flail'], okand: ['Hooded Blightfang'], anim: true, nya: nya2 })
    + basland(lagen2, 'Counted from the photos so far.', lagen2) }));
{
  const bara2 = new Set(nya2);
  skriv('C3.dc.html', lekSida('C3: computer, one photo at a time', { antal: 24,
    panel: ansluten + fotoRad(1, '12 cards · checked', { hoger: `<span style="color: ${C.green}">${ik.check(15, 2.6)}</span>` })
      + fotoRad(2, '12 cards · 1 to check', { nu: true, koll: true, anim: true, hoger: `<span style="font: 600 12px ${SANS}; color: ${C.acc}">Showing</span>` })
      + nasta + `<span style="font: 400 12.5px/1.5 ${SANS}; color: ${C.dim}">Pick a photo to see only its cards. Compare with the table before you move the cards aside.</span>`,
    hoger: `<div style="display: flex; align-items: center; gap: 12px"><b style="font: 700 16px ${SANS}">Photo 2</b><span style="font: 500 13.5px ${SANS}; color: ${C.dim}">12 cards: 1 name to check</span><span style="flex-grow: 1"></span>${knapp('Show the whole deck')}</div>`
      + attKolla([rader2[1]], 'From photo 2.')
      + kortGrid(bara2, { ny: true, okand: ['Hooded Blightfang'], anim: true, nya: nya2, w: 104 })
      + `<div style="display: flex; gap: 10px; align-items: center; font: 500 13.5px ${SANS}; color: ${C.dim}"><span style="display: flex; gap: 4px">${[1, 2, 3, 4].map(i => `<img src="${bild(i % 2 ? 'Plains' : 'Swamp')}" alt="" style="width: 26px; height: 36px; border-radius: 3px">`).join('')}</span>+ 2 Plains, 2 Swamps from this photo</div>` }));
}

/* ══ Klart: To check besvaras som i dag, basländerna längst ned ════════ */
const ALLA = new Set(Object.values(TYP).flat());
skriv('C4.dc.html', lekSida('C4: computer, the last photo is in', { antal: 40,
  panel: ansluten + fotoRad(1, '12 cards · 1 to check', { koll: true }) + fotoRad(2, '12 cards · 1 to check', { koll: true }) + fotoRad(3, '6 cards') + fotoRad(4, '10 cards · 1 to check', { koll: true })
    + `<div style="display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; border-radius: 10px; background: #1d1810; border: 1px solid #6a5220"><b style="font: 650 14px ${SANS}">3 names to check</b><span style="font: 400 13px/1.45 ${SANS}; color: ${C.dim}">Answer them at the top of the deck. Then set the basic lands at the bottom, if some weren’t in the photos.</span></div>`
    + knapp(ik.undo() + 'Undo, remove all 40', 'sek', 'align-self: flex-start'),
  hoger: attKolla([
      kollRad({ remsa: remsa({ url: '/_blob/8231520ba70b9480b86c09ae2e5b95a5', w: 2000, h: 1500 }, 950, 165, 410, 80, 150), namn: 'Venomous Hierophant', fraga: 'Did you mean Venomous Hierophant?', under: 'Photo 4 · 1 copy' }),
      rader2[0], rader2[1]], 'Mesa picked the closest card for the first two. They’re in the deck until you say otherwise.')
    + kortGrid(ALLA, { check: ['Gorgon Flail', 'Venomous Hierophant'], okand: ['Hooded Blightfang'], w: 84 })
    + basland({ Plains: 7, Swamp: 7 }, 'From the photos. Change them if some weren’t photographed.', { Plains: 7, Swamp: 7 }) }));
skriv('C5.dc.html', lekSida('C5: computer, the deck is done', { antal: 40, setup: true, setupKlar: true,
  panel: ansluten + fotoRad(1, '12 cards') + fotoRad(2, '12 cards') + fotoRad(3, '6 cards') + fotoRad(4, '10 cards')
    + `<div style="display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border-radius: 10px; background: #0f1d15; border: 1px solid #24503a"><b style="font: 650 14px ${SANS}; color: #bfe8cf">All names checked</b><span style="font: 400 13px/1.45 ${SANS}; color: ${C.dim}">40 cards. The deck is saved. Take more photos, or paste or type the cards that are missing.</span></div>`,
  hoger: kortGrid(ALLA, { w: 84 }) + basland({ Plains: 7, Swamp: 7 }, 'From the photos. Change them if some weren’t photographed.', { Plains: 7, Swamp: 7 }) }));

/* ── index: sida F, de tidigare korten på sida E ── */
const LAST = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const PW = 390, PH = 844, DW = 1440, DH = 900, GX = 80, RY = 343;
const pages = [{ id: 'f', name: 'F · From today’s app' }, { id: 'e', name: 'E · Earlier version' }];
const boards = {};
for (const [f, b] of Object.entries(LAST.boards)) boards[f] = Object.assign({}, b, { page: 'e' });
const notes = {};
for (const [id, n] of Object.entries(LAST.notes || {})) notes[id] = Object.assign({}, n, { page: 'e' });
const rad = (y) => y * (DH + RY);
const plats = {
  'F1.dc.html': [0, rad(0), DW, DH, 'F1 · Deck page: the Phone tab'],
  'F2.dc.html': [DW + GX, rad(0), DW, DH, 'F2 · Game setup as today: pick a deck, New deck below'],
  'P1.dc.html': [0, rad(1), PW, PH, 'P1 · Phone: lay out the cards (animated)'],
  'P2.dc.html': [PW + GX, rad(1), PW, PH, 'P2 · Phone: the camera, portrait or landscape'],
  'P3a.dc.html': [2 * (PW + GX), rad(1), PW, PH, 'P3 option A · Frames and a count'],
  'P3b.dc.html': [3 * (PW + GX), rad(1), PW, PH, 'P3 option B · Only the count'],
  'P3c.dc.html': [4 * (PW + GX), rad(1), PW, PH, 'P3 option C · Fix the frames'],
  'P4.dc.html': [5 * (PW + GX), rad(1), PW, PH, 'P4 · Phone: finish on the computer'],
  'C1.dc.html': [0, rad(2), DW, DH, 'Computer option 1 · Fix as you go'],
  'C2.dc.html': [DW + GX, rad(2), DW, DH, 'Computer option 2 · Photograph first, check at the end'],
  'C3.dc.html': [2 * (DW + GX), rad(2), DW, DH, 'Computer option 3 · One photo at a time'],
  'C4.dc.html': [0, rad(3), DW, DH, 'C4 · The last photo is in: answer To check, set basic lands'],
  'C5.dc.html': [DW + GX, rad(3), DW, DH, 'C5 · Done (from game setup: Use this deck)'],
};
const order = [];
for (const [f, [x, y, w, h, title]] of Object.entries(plats)) { boards[f] = { x, y, w, h, title, page: 'f' }; order.push(f); }
for (const f of LAST.order) if (!order.includes(f)) order.push(f);
Object.assign(notes, {
  f0: { x: 0, y: rad(0) - 260, text: 'Where it starts, as today', kind: 'title1', maxW: 2 * DW + GX, page: 'f' },
  f1: { x: 0, y: rad(1) - 260, text: 'The phone: is every card found as a card?', kind: 'title1', maxW: 6 * PW + 5 * GX, page: 'f' },
  f2: { x: 0, y: rad(2) - 260, text: 'The computer while you photograph: three options', kind: 'title1', maxW: 3 * DW + 2 * GX, page: 'f' },
  f3: { x: 0, y: rad(3) - 260, text: 'After the last photo: check names, basic lands, done', kind: 'title1', maxW: 2 * DW + GX, page: 'f' },
});
const canvas = Object.assign({}, LAST, { pages, boards, order, notes, launch: { view: 'canvas', page: 'f' } });
for (const [n, h] of Object.entries(filer)) fs.writeFileSync(path.join(OUT, n), h);
fs.writeFileSync(path.join(OUT, 'canvas.json'), JSON.stringify(canvas, null, 1));
const streck = Object.entries(filer).filter(([, h]) => /[—–]/.test(h));
console.log(Object.keys(filer).join(' '), streck.length ? 'TANKSTRECK: ' + streck.map(([n]) => n).join(' ') : 'inga tankstreck');

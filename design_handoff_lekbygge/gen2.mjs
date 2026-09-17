// Sida 2 och 3 i designytan "Mesa Deck Builder":
//   sida 2 "A, clarified" (MES-146): A1-rutan med tre skilda sätt, och A2 som
//     samma sida som leken sedan blir — vad som händer efter QR, inklistring
//     och ett inskrivet kort; flera exemplar och sideboard utan kortkommandon.
//   sida 3 "Landing in a game" (MES-151): dagens landning ur koden och tre
//     varianter D/E/F, var och en i fyra lägen (värd första gången, en ny lek
//     byggs, leken vald och nästa steg, en spelare ansluter mitt i ett parti).
// Uppstartens panel (.oppstart, .oppsteg, .oppopt …), bordsväxeln (.ssw) och
// motståndarremsan (.olist) är kopierade ur index.html. Kör: node gen2.mjs
// (kör gen.mjs först av sig själv — sida 1 byggs också).
import { writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { K, I, ic, DOTS, LOGO, cost, pips, hc, cf, face, pile, qr, guide, doc, skriv, topbarSida, A_CSS, aDeckHead, aTabs, CX, canvas, UT } from './gen.mjs';

Object.assign(I, {
  eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"></path><circle cx="12" cy="12" r="2.8"></circle>',
  deck: '<rect x="4" y="6" width="11" height="15" rx="1.8"></rect><path d="M8 3h10.2A1.8 1.8 0 0 1 20 4.8V17"></path>',
  cardplus: '<rect x="3.5" y="4" width="11" height="16" rx="2"></rect><path d="M19 8.5v7M15.5 12h7"></path>',
  nocam: '<path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"></path><path d="M3 4l18 17"></path>',
  both: '<rect x="4" y="4" width="16" height="7" rx="1.5"></rect><rect x="4" y="13" width="16" height="7" rx="1.5"></rect>',
  chev: '<path d="m9 6 6 6-6 6"></path>',
});
Object.assign(K, {
  vantage: { n: 'Inspiring Vantage', t: 'Land', m: '', fa: 'linear-gradient(160deg,#8a6a4a,#2a1f16)' },
  rip: { n: 'Rest in Peace', t: 'Enchantment', m: '1W', fa: 'linear-gradient(160deg,#b9b3a0,#3a372e)' },
  firebolt: { n: 'Firebolt', t: 'Sorcery', m: 'R', fa: 'linear-gradient(160deg,#b0542a,#2e150c)' },
  boltbend: { n: 'Bolt Bend', t: 'Instant', m: '3R', fa: 'linear-gradient(160deg,#8e4a3a,#2a1612)' },
  sailor: { n: 'Spectral Sailor', t: 'Creature — Spirit Pirate', m: 'U', fa: 'linear-gradient(160deg,#3f5f86,#111a26)' },
  borrower: { n: 'Brazen Borrower', t: 'Creature — Faerie Rogue', m: '1UU', fa: 'linear-gradient(160deg,#3a5270,#121824)' },
  shredder: { n: 'Ledger Shredder', t: 'Creature — Bird Advisor', m: '1U', fa: 'linear-gradient(160deg,#4b6680,#141c24)' },
  counterspell: { n: 'Counterspell', t: 'Instant', m: 'UU', fa: 'linear-gradient(160deg,#2f5d8a,#0f1826)' },
  push: { n: 'Fatal Push', t: 'Instant', m: 'B', fa: 'linear-gradient(160deg,#4a3d55,#161019)' },
  consider: { n: 'Consider', t: 'Instant', m: 'U', fa: 'linear-gradient(160deg,#35608c,#101a26)' },
  thoughtseize: { n: 'Thoughtseize', t: 'Sorcery', m: 'B', fa: 'linear-gradient(160deg,#3e3448,#141016)' },
  drown: { n: 'Drown in the Loch', t: 'Instant', m: 'UB', fa: 'linear-gradient(160deg,#2c4660,#15121c)' },
  grave: { n: 'Watery Grave', t: 'Land — Island Swamp', m: '', fa: 'linear-gradient(160deg,#2f4458,#17141c)' },
  delver: { n: 'Delver of Secrets', t: 'Creature — Human Wizard', m: 'U', img: 'delver.jpg' },
  nighthawk: { n: 'Vampire Nighthawk', t: 'Creature — Vampire Shaman', m: '1BB', img: 'nighthawk.jpg' },
});

/* ── lekarna (påhittade) ────────────────────────────────────────────── */
const BOROS = [
  ['Creatures', [['swiftspear', 4], ['pikemaster', 4], ['danitha', 2], ['phoenix', 3], ['serra', 3], ['siege', 2]]],
  ['Instants &amp; sorceries', [['bolt', 4], ['helix', 4], ['charm', 4]]],
  ['Artifacts &amp; enchantments', [['blade', 4], ['anthem', 3]]],
  ['Lands', [['mountain', 9], ['plains', 8], ['foundry', 4], ['vantage', 2]]],
];
const NY = [                         // efter foto 1: 24 kort
  ['Creatures', [['swiftspear', 4, 'ny'], ['pikemaster', 4, 'ny'], ['danitha', 2, 'ny'], ['phoenix', 3, 'chk']]],
  ['Instants &amp; sorceries', [['bolt', 4, 'ny']]],
  ['Artifacts &amp; enchantments', [['blade', 4, 'ny'], ['anthem', 3, 'ny']]],
];
const DIMIR = [
  ['Creatures', [['delver', 4], ['nighthawk', 4], ['sailor', 4], ['borrower', 3], ['shredder', 3]]],
  ['Instants &amp; sorceries', [['counterspell', 4], ['push', 4], ['consider', 4], ['thoughtseize', 3], ['drown', 3]]],
  ['Lands', [['island', 11], ['swamp', 9], ['grave', 4]]],
];
const sum = g => g[1].reduce((a, x) => a + x[1], 0);
const BASLAND = [['plains', 'Plains'], ['island', 'Island'], ['swamp', 'Swamp'], ['mountain', 'Mountain'], ['forest', 'Forest']];
const stp = (n, s = 12) => `<span class="stp s"><span>${ic('minus', s - 1, 2.4)}</span><b>${n}</b><span>${ic('plus', s - 1, 2.4)}</span></span>`;
const OK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"></path></svg>';
const GRIP = '<svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor" aria-hidden="true"><circle cx="2" cy="3" r="1.1"></circle><circle cx="6" cy="3" r="1.1"></circle><circle cx="2" cy="7" r="1.1"></circle><circle cx="6" cy="7" r="1.1"></circle><circle cx="2" cy="11" r="1.1"></circle><circle cx="6" cy="11" r="1.1"></circle></svg>';
const PC = { jesper: '#f0a52a', erik: '#6b8cff', sara: '#57c785' };   // PALETTE i index.html

/* De tre sätten att skapa en lek — samma ord överallt. */
const VAGAR = [
  ['phone', 'Scan with your phone', 'Photograph your physical deck, about 30 cards at a time.', 'Recommended'],
  ['paste', 'Paste a list', 'From Moxfield, Arena, MTGO or plain text.'],
  ['type', 'Type card names', 'One card at a time, with suggestions.'],
];
const vk = ([i, t, s, tag], on = false) => `<div class="vk${on ? ' on' : ''}"><span class="vi">${ic(i, 17)}</span><span class="vt"><b>${t}${tag ? `<span class="tag">${tag}</span>` : ''}</b><span>${s}</span></span><span class="vc">${ic('chev', 14, 2.2)}</span></div>`;
const vkLista = () => `<div class="valj">${VAGAR.map(v => vk(v)).join('<span class="eller">or</span>')}</div>`;

const X_CSS = `
.tag{font:600 9.5px/1 var(--sans);letter-spacing:.6px;text-transform:uppercase;color:var(--pa-acc);background:#f0a52a1f;border-radius:10px;padding:3px 6px;white-space:nowrap}
.valj{display:flex;flex-direction:column;gap:9px}
.vk{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg3);color:var(--txt);cursor:pointer}
.vk:hover,.vk.on{border-color:var(--acc);background:#1a1710}
.vk .vi{width:36px;height:36px;border-radius:9px;display:grid;place-items:center;background:#0e131b;border:1px solid var(--line);color:var(--txt);flex:none}
.vk .vt{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.vk .vt b{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font:600 13.5px var(--sans);color:var(--txt)}
.vk .vt span{font:12px/1.4 var(--sans);color:var(--dim)}
.vk .vc{display:inline-flex;color:var(--dim2);flex:none}
.eller{display:flex;align-items:center;gap:8px;font:600 10px var(--sans);letter-spacing:.8px;text-transform:uppercase;color:var(--dim2)}
.eller::before,.eller::after{content:'';flex:1;height:1px;background:var(--line)}
.bdot{display:inline-block;flex:none;width:8px;height:8px;border-radius:50%;background:var(--pc,var(--blue));box-shadow:0 0 0 2px #0004 inset}
.campill.av{background:var(--bg3);border-color:var(--line);color:var(--dim)}
.campill.av .led{background:#3a4658}
.campill .ikon,.campill .cv{display:inline-flex;flex:none;opacity:.75}
.kf{border-radius:5px}
`;

/* ════════════════════════════════════════════════════════════════════
   SIDA 2 — A förtydligad
   ════════════════════════════════════════════════════════════════════ */
const A2_CSS = A_CSS + X_CSS + `
.lead2{font:12.5px/1.55 var(--sans);color:var(--dim)}
.ghp{flex:none;width:104px;height:145px;border-radius:6px;border:1.5px dashed #28313f;background:#0b0f1540}
.gmsg{position:absolute;left:50%;top:40%;translate:-50% -50%;z-index:10;width:460px;display:flex;flex-direction:column;align-items:center;gap:8px;padding:22px 28px;border-radius:14px;background:#0d1015ee;border:1px solid var(--line);text-align:center;box-shadow:0 20px 50px -20px #000}
.gmsg .ico{color:var(--dim2);display:inline-flex}
.gmsg b{font:650 16px var(--sans);color:var(--txt)}
.gmsg span{font:13px/1.55 var(--sans);color:var(--dim)}
.gmsg .led{margin-top:4px}
.stl{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:14px}
.stl li{display:flex;gap:11px}
.stl .sn{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;border:1px solid #39445a;font:700 11px var(--mono);color:var(--dim2)}
.stl li.done .sn{background:#0f2016;border-color:#2f6b47;color:#8fe0b0}
.stl li.act .sn{background:var(--acc);border-color:var(--acc);color:#20160a}
.stl .sb{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.stl .sb b{font:600 13px var(--sans);color:var(--txt)}
.stl .sb span{font:12.5px/1.5 var(--sans);color:var(--dim)}
.stl li.todo .sb b{color:var(--dim)}
.pvban{display:flex;align-items:center;gap:10px;height:38px;padding:0 14px;border-radius:9px;background:#141c2a;border:1px solid #3d4a6a;font:12.5px var(--sans);color:#c9d4ff;flex:none}
.pvban .ic{display:inline-flex}
.prev .pw{opacity:.55}
.prev .pile::after{content:'';position:absolute;inset:-3px;border-radius:7px;border:1.5px dashed #6b8cffaa;z-index:5}
.nbtn{display:flex;gap:4px;flex:none;align-items:center}
.nbtn i{width:26px;height:26px;border-radius:6px;border:1px solid var(--line);background:#0e131b;display:grid;place-items:center;font:600 12px var(--mono);color:var(--dim);font-style:normal}
.nbtn i.hv{border-color:var(--acc);color:#ffd98a;background:#1a1710}
.nbtn .nl{font:11.5px var(--sans);color:var(--dim2);margin-right:3px}
.sbzon{display:flex;flex-direction:column;gap:12px;padding:12px 14px 14px;border-radius:10px;border:1.5px dashed #3d4a5f;min-width:0}
.sbzon .hint{font:12px var(--sans);color:var(--dim2)}
.addto{display:flex;align-items:center;gap:12px;font:12.5px var(--sans);color:var(--dim)}
.addto .seg{flex:1}
.jr{display:flex;align-items:center;gap:10px;font:13px var(--sans);min-height:32px;color:var(--txt)}
.jr .dim{font-size:12px}
.jr .th{width:26px;height:36px;border-radius:3px;overflow:hidden;flex:none}
.jr .th .kf,.jr .th .cf{width:26px!important;height:36px!important}
`;
const aSek = (namn, n, inner) => `<div class="sek"><div class="zr"><span class="zonlbl">${namn}</span>${n != null ? `<span class="zn">${n}</span>` : ''}<i class="zl"></i></div><div class="hogar">${inner}</div></div>`;
const blSek = (vals = {}) => `<div class="sek"><div class="zr"><span class="zonlbl">Basic lands</span><span class="zn">${Object.values(vals).reduce((a, b) => a + b, 0)}</span><i class="zl"></i></div><div class="bl">
    ${BASLAND.map(([k]) => `<div class="blk"><img class="kf" src="${K[k].img}" alt=""><span class="stp"><span>${ic('minus', 12, 2.4)}</span><b>${vals[k] || 0}</b><span>${ic('plus', 12, 2.4)}</span></span></div>`).join('')}
    <span class="blnot">Leave these out of the photos. Set how many you play here.</span></div></div>`;
const ghostRad = n => '<i class="ghp"></i>'.repeat(n);
function aGhost(msg) {
  return `<section class="grid">${aSek('Creatures', null, ghostRad(6))}<div class="sekrad">${aSek('Instants &amp; sorceries', null, ghostRad(3))}${aSek('Artifacts &amp; enchantments', null, ghostRad(3))}</div>${blSek()}${msg}</section>`;
}

function a1b() {
  const css = A2_CSS + `
.a1{flex:1;min-height:0;padding:28px 40px;display:flex;flex-direction:column;gap:22px}
.a1hd{display:flex;align-items:baseline;gap:12px}
.a1hd h1{margin:0;font:650 24px/1.2 var(--sans);letter-spacing:-.3px}
.a1hd span{font:600 13px var(--mono);color:var(--dim)}
.hylla{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px;align-items:start}
.dt{position:relative;display:flex;flex-direction:column;border-radius:12px;background:#121821;border:1px solid var(--line)}
.dcov{position:relative;height:158px;overflow:hidden;border-radius:11px 11px 0 0;background:#0b1016}
.dcov img{position:absolute;width:390px;left:-32px;top:-52px;filter:saturate(.9)}
.dcov::after{content:'';position:absolute;inset:auto 0 0;height:50px;background:linear-gradient(#12182100,#121821)}
.dinfo{display:flex;flex-direction:column;gap:6px;padding:4px 16px 16px}
.dinfo .drow{display:flex;align-items:center;gap:9px;min-width:0}
.dinfo b{font:650 16px/1.25 var(--sans);color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dinfo .dm{font:12.5px var(--mono);color:var(--dim)}
.dstate{position:absolute;left:12px;top:12px;z-index:2;display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 9px;border-radius:12px;font:600 11.5px var(--sans);white-space:nowrap;background:#1b1407e6;border:1px dashed #e8b33a99;color:#f0c874}
.dstate .kod{font:700 11px var(--mono);letter-spacing:1.4px}
.dnew{display:flex;flex-direction:column;gap:12px;padding:18px;border-radius:12px;border:1.5px dashed #3d4a5f;background:#0f141c}
.dnew .nh{display:flex;align-items:center;gap:10px}
.dnew .plus{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--acc);color:#20160a;flex:none}
.dnew .nh b{font:650 16px var(--sans);color:var(--txt)}
.dnew p{font:12.5px/1.45 var(--sans);color:var(--dim)}
.dnew .vk{padding:9px 10px;gap:10px}
.dnew .vk .vi{width:30px;height:30px}
.dnew .vk .vt b{font-size:13px}
.dnew .vk .vt span{font-size:11.5px}
.dnew .eller{display:flex;align-items:center;gap:8px;font:600 10px var(--sans);letter-spacing:.8px;text-transform:uppercase;color:var(--dim2)}
.dnew .eller::before,.dnew .eller::after{content:'';flex:1;height:1px;background:var(--line)}
`;
  const tile = (namn, f, img, meta, state = '') => `<div class="dt"><div class="dcov"><img src="${img}" alt="">${state}</div><div class="dinfo"><div class="drow">${pips(f, 15)}<b>${namn}</b></div><span class="dm">${meta}</span></div></div>`;
  const [v1, v2, v3] = VAGAR;
  const body = `<div class="pg">${topbarSida('Your decks')}
<div class="a1">
  <div class="a1hd"><h1>Your decks</h1><span>4 decks</span></div>
  <div class="hylla">
    <div class="dnew"><div class="nh"><span class="plus">${ic('plus', 18, 2.6)}</span><b>New deck</b></div><p>Start with one of these. You can mix them later.</p>${vk(v1)}<span class="eller">or</span>${vk(v2)}<span class="eller">or</span>${vk(v3)}</div>
    ${tile('Boros Blades', 'WR', 'danitha.jpg', '36 cards · <span style="color:#e8c98a">2 to check</span>', '<span class="dstate">Playing in <span class="kod">BTB2TF</span></span>')}
    ${tile('Golgari Mill', 'BG', 'pharika.jpg', '60 cards · 15 sideboard')}
    ${tile('Elves', 'G', 'llanowar.jpg', '60 cards')}
    ${tile('Blue-black flyers', 'UB', 'nighthawk.jpg', '60 cards · 8 sideboard')}
  </div>
</div></div>`;
  skriv('A1Decks2.dc.html', css, body);
}

function a2Start() {
  const msg = `<div class="gmsg"><span class="ico">${ic('deck', 30, 1.6)}</span><b>Your deck is empty</b><span>The cards you add show up here, sorted by type — whichever way you add them. You can change or remove every card afterwards.</span></div>`;
  const body = `<div class="pg">${topbarSida('New deck')}
${aDeckHead('', 0, { ny: true })}
<div class="ed">
  ${aGhost(msg)}
  <aside class="add">
    <h3>Add cards</h3>
    <p class="lead2">Pick one way to start. Once you have, the three ways become tabs up here, so you can switch or mix them.</p>
    ${vkLista(0)}
  </aside>
</div></div>`;
  skriv('A2Start.dc.html', A2_CSS, body);
}

function a2Phone() {
  const g = guide({ id: 'a2pg', cols: 5, rows: 5, w: 44, off: 10, gap: 9, steps: false, pad: 16, compact: true });
  const msg = `<div class="gmsg"><span class="ico">${ic('phone', 30, 1.6)}</span><b>Waiting for your first photo</b><span>Take it with your phone. The cards land here a few seconds later, sorted by type.</span></div>`;
  const body = `<div class="pg">${topbarSida('New deck')}
${aDeckHead('', 0, { ny: true })}
<div class="ed">
  ${aGhost(msg)}
  <aside class="add">
    <h3>Add cards</h3>
    ${aTabs('phone')}
    <ol class="stl">
      <li class="done"><span class="sn">${OK}</span><div class="sb"><b>Scan the code with your phone</b><span>Phone connected. Mesa is open on it.</span></div></li>
      <li class="act"><span class="sn">2</span><div class="sb"><b>Lay out the cards</b><span>In columns, overlapping, so only the name line of each card shows. About 30 cards at a time. Leave the basic lands out.</span>${g.html}</div></li>
      <li class="todo"><span class="sn">3</span><div class="sb"><b>Take the photo on your phone</b><span>Hold it straight above, every name inside the frame.</span></div></li>
    </ol>
  </aside>
</div></div>`;
  skriv('A2Phone.dc.html', A2_CSS + g.css, body, true);
}

function a2Photo() {
  const g = guide({ id: 'a2fg', cols: 4, rows: 5, w: 44, off: 10, gap: 9, steps: false, pad: 16, compact: true });
  const grp = NY.map(([namn, kort]) => aSek(namn, kort.reduce((a, x) => a + x[1], 0), kort.map(([k, n, st]) => pile(k, n, { st })).join('')));
  const body = `<div class="pg">${topbarSida('New deck')}
${aDeckHead('New deck', 24)}
<div class="ed">
  <section class="grid"><div class="kallor"><span class="kl">Came from</span><span class="lfchip on">All <b>24</b></span><span class="lfchip"><span class="ic">${ic('phone', 12)}</span>Photo 1 <b>24</b>${CX}</span></div>
    ${grp[0]}<div class="sekrad">${grp[1]}${grp[2]}</div>${blSek()}</section>
  <aside class="add">
    <h3>Add cards</h3>
    ${aTabs('phone')}
    <div class="kort2" style="flex-direction:row;align-items:center;gap:10px"><span class="led"></span><div style="flex:1;display:flex;flex-direction:column;gap:2px"><b style="font:600 13px var(--sans)">Phone connected for scanning</b><span style="font:12px var(--sans);color:var(--dim)">Photos land in this deck.</span></div></div>
    <div class="kort2"><div class="fotorad chk"><span class="mph"><i style="left:6px"></i><i style="left:18px"></i><i style="left:30px"></i><i style="left:42px"></i></span><div class="ft"><b>Photo 1</b><span>24 cards added · 1 to check</span></div><span class="btn sm">Check</span></div></div>
    <div class="zr"><span class="zonlbl">Next photo</span><i class="zl"></i></div>
    <p class="lead2">Move these cards aside, lay out the next ones the same way and take another photo.</p>
    ${g.html}
    <p class="dropnot" style="margin-top:auto">That was all of them? Nothing more to do — the deck is saved as you go.</p>
  </aside>
</div></div>`;
  skriv('A2Photo.dc.html', A2_CSS + g.css, body, true);
}

function a2Paste() {
  const L = [
    ['hd', 'Deck'], ['', '4 Monastery Swiftspear (KTK) 118'], ['', '4 Faithful Pikemaster (J25) 3'], ['', '2 Danitha Capashen, Paragon (CMM) 20'],
    ['', '3 Arclight Phoenix (GRN) 91'], ['', '3 Serra Angel (DMU) 33'], ['', '4 Lightning Bolt (M11) 149'], ['', '4 Boros Charm (GTC) 148'],
    ['bad', '&lt;img src=x onerror=alert(1)&gt;'], ['fix', '4 Lightnig Helix'], ['', '4 Ancestral Blade (M20) 3'], ['', '9 Mountain (MOM) 285'],
    ['', ''], ['hd', 'Sideboard'], ['', '2 Rest in Peace (AKR) 32'],
  ];
  const ta = L.map(([k, t]) => `<span class="ln${k ? ' ' + k : ''}">${t || ' '}</span>`).join('');
  const body = `<div class="pg">${topbarSida('New deck')}
${aDeckHead('', 0, { ny: true })}
<div class="ed">
  <section class="grid prev">
    <div class="pvban"><span class="ic">${ic('eye', 16)}</span><span>Preview of your list — nothing is added until you press <b style="color:#fff">Add 39 cards</b>.</span></div>
    ${aSek('Creatures', 16, [pile('swiftspear', 4), pile('pikemaster', 4), pile('danitha', 2), pile('phoenix', 3), pile('serra', 3)].join(''))}
    <div class="sekrad">${aSek('Instants &amp; sorceries', 8, pile('bolt', 4) + pile('charm', 4))}${aSek('Artifacts &amp; enchantments', 4, pile('blade', 4))}<div class="sbzon"><div class="zr"><span class="zonlbl" style="color:var(--dim)">Sideboard</span><span class="zn">2</span></div><div class="hogar">${pile('rip', 2)}</div></div></div>
    ${blSek({ mountain: 9 })}
  </section>
  <aside class="add" style="gap:12px">
    <h3>Add cards</h3>
    ${aTabs('paste')}
    <div class="fchips"><span class="fchip on">${ic('check', 11, 2.8)}Arena format detected</span><span class="grow"></span><span class="btn sm ghost">Clear</span></div>
    <div class="ta" style="height:248px;font-size:11px;line-height:1.5">${ta}</div>
    <div style="display:flex;align-items:center;gap:8px;font:13px var(--sans);color:var(--txt)"><span style="display:inline-flex;color:#8fe0b0">${ic('check', 15, 2.4)}</span><b style="font-weight:600">37 cards and 2 sideboard</b><span class="dim">from 10 lines</span></div>
    <div style="display:flex;flex-direction:column;gap:6px">
      <div class="prob"><span class="pn">line 9</span><span class="pt"><code>&lt;img src=x onerror=alert(1)&gt;</code><span>Not a card name — ignored.</span></span></div>
      <div class="prob"><span class="pn">line 10</span><span class="pt"><code>4 Lightnig Helix</code><span>Did you mean Lightning Helix?</span></span><span class="btn sm">Use it</span></div>
    </div>
    <div class="lockrad"><span class="ic">${ic('lock', 14)}</span><span>Mesa reads this as plain text, one card per line. Nothing is run or opened, and only names that exist in Magic are added.</span></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:auto"><span class="btn prim">Add 39 cards</span></div>
  </aside>
</div></div>`;
  skriv('A2Paste.dc.html', A2_CSS, body);
}

function a2Type() {
  const tool = `<div class="tool" style="left:-6px;top:153px"><span class="tb">${ic('minus', 13, 2.4)}</span><b style="font:600 12px var(--mono);color:var(--txt);min-width:14px;text-align:center">2</b><span class="tb">${ic('plus', 13, 2.4)}</span><i class="sep"></i><span class="tb">Move to sideboard</span><span class="tb">${ic('swap', 13)}Change</span><i class="sep"></i><span class="tb fara">${ic('x', 13, 2.4)}</span></div>`;
  const n4 = (hv = -1) => `<span class="nbtn"><span class="nl">Add</span>${[1, 2, 3, 4].map(i => `<i${i === hv ? ' class="hv"' : ''}>${i}</i>`).join('')}</span>`;
  const sug = `<div class="sug" style="position:absolute;left:18px;right:18px;top:190px;z-index:20">
    <div class="si on"><div class="th">${face('bolt', 28)}</div><span class="sn"><b>Lightning <mark>Bolt</mark></b><span>Instant</span></span>${n4(4)}</div>
    <div class="si"><div class="th">${face('firebolt', 28)}</div><span class="sn"><b>Fire<mark>bolt</mark></b><span>Sorcery</span></span>${n4()}</div>
    <div class="si"><div class="th">${face('boltbend', 28)}</div><span class="sn"><b><mark>Bolt</mark> Bend</b><span>Instant</span></span>${n4()}</div>
    <div class="sfot"><span>Click a number to add that many copies. Enter adds one.</span></div>
  </div>`;
  const body = `<div class="pg">${topbarSida('New deck')}
${aDeckHead('New deck', 6).replace('6 cards</span>', '6 cards + 2 sideboard</span>')}
<div class="ed">
  <section class="grid"><div class="kallor"><span class="kl">Came from</span><span class="lfchip on">All <b>8</b></span><span class="lfchip"><span class="ic">${ic('type', 12)}</span>Typed in <b>8</b>${CX}</span></div>
    <div class="sekrad">${aSek('Instants &amp; sorceries', 2, pile('helix', 2, { hover: tool }))}${aSek('Artifacts &amp; enchantments', 4, pile('blade', 4))}</div>
    <div class="sbzon" style="margin-top:34px"><div class="zr"><span class="zonlbl" style="color:var(--dim)">Sideboard</span><span class="zn">2</span></div><div class="hogar">${pile('rip', 2)}</div><span class="hint">Drag a card here, or pick “Move to sideboard” on the card.</span></div>
    ${blSek()}
  </section>
  <aside class="add">
    <h3>Add cards</h3>
    ${aTabs('type')}
    <div class="addto"><span>Add to</span><div class="seg"><span class="on">Main deck</span><span>Sideboard</span></div></div>
    <div class="fld fok"><span class="ic">${ic('search', 15)}</span><span>bolt<span class="caret"></span></span></div>
    ${sug}
    <div style="height:176px;flex:none"></div>
    <div class="zr"><span class="zonlbl">Just added</span><i class="zl"></i></div>
    <div class="jr"><div class="th">${cf(K.rip, 26, 36)}</div><span class="grow">Rest in Peace <span class="dim">×2 · Sideboard</span></span><span class="btn sm ghost">${ic('undo', 13, 2.2)}Undo</span></div>
    <div class="jr"><div class="th">${face('blade', 26)}</div><span class="grow">Ancestral Blade <span class="dim">×4 · Main deck</span></span><span class="btn sm ghost">${ic('undo', 13, 2.2)}Undo</span></div>
    <div class="jr"><div class="th">${cf(K.helix, 26, 36)}</div><span class="grow">Lightning Helix <span class="dim">×2 · Main deck</span></span><span class="btn sm ghost">${ic('undo', 13, 2.2)}Undo</span></div>
  </aside>
</div></div>`;
  skriv('A2Type.dc.html', A2_CSS, body);
}

/* ════════════════════════════════════════════════════════════════════
   SIDA 3 — att landa i ett spel
   ════════════════════════════════════════════════════════════════════ */
const L_CSS = X_CSS + `
#app{position:relative;width:1440px;height:900px;display:flex;flex-direction:column;background:var(--bg);overflow:hidden}
.brade{flex:1;min-height:0;display:grid;gap:10px;padding:10px;grid-template-columns:minmax(0,1fr) 360px}
.brade > .matta{min-width:0}
/* uppstartens panel (index.html) */
.oppstart{display:flex;flex-direction:column;min-height:0;min-width:0;background:#121821;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.opphd{padding:16px 18px 14px;border-bottom:1px solid #1c2330;display:flex;flex-direction:column;gap:3px}
.opphd b{font-size:15px;font-weight:650}
.opphd span{font-size:12px;color:var(--dim);line-height:1.5}
.oppsteg{display:flex;gap:12px;padding:13px 18px;border-bottom:1px solid #1c2330}
.oppsteg.active{background:#151c27}
.oppnr{width:24px;height:24px;border-radius:50%;flex:none;display:grid;place-items:center;font:700 11.5px/1 var(--mono);border:1px solid #39445a;color:var(--dim2)}
.oppsteg.done .oppnr{background:#0f2016;border-color:#2f6b47;color:#8fe0b0}
.oppsteg.active .oppnr{background:var(--acc);border-color:var(--acc);color:#20160a}
.oppbody{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.opptit{display:flex;align-items:center;gap:8px;min-height:24px;font-size:13.5px;font-weight:600;color:var(--txt);line-height:1.35}
.oppsteg.todo .opptit{color:var(--dim);font-weight:550}
.oppgrupp{font:600 10px/1 var(--sans);letter-spacing:.7px;text-transform:uppercase;color:var(--dim2);margin-bottom:-4px}
.oppgrupp.skild{margin-top:4px;padding-top:12px;border-top:1px solid #1c2330}
.oppsum{font-size:12px;color:var(--dim)}
.oppcont{display:flex;flex-direction:column;gap:14px;margin-top:12px}
.opptxt{margin:0;font-size:12.5px;color:var(--dim);line-height:1.55}
.opptxt b{color:var(--txt);font-weight:600}
.opptxt.liten{font-size:11.5px;color:var(--dim2)}
.oppopt{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border-radius:9px;border:1px solid var(--line);background:var(--bg3);color:var(--txt);text-align:left}
.oppopt.on{border-color:var(--acc);background:#1a1710}
.oppopt .radio{width:16px;height:16px;border-radius:50%;border:1.5px solid #4a5a72;flex:none;display:grid;place-items:center}
.oppopt.on .radio{border-color:var(--acc)}
.oppopt.on .radio::after{content:'';width:8px;height:8px;border-radius:50%;background:var(--acc)}
.oppopt .oppbody{gap:2px}
.oppopt .oppbody b{display:flex;flex-wrap:wrap;align-items:center;gap:4px 7px;font-size:13px;font-weight:600;color:var(--txt)}
.oppopt .oppbody span{font-size:11.5px;color:var(--dim);line-height:1.45}
.oppmeta{font:11px/1 var(--mono);color:var(--dim);flex:none}
.opprad{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.oppwait{display:flex;align-items:center;gap:9px;font-size:12px;color:#e8c98a}
.oppfot{margin-top:auto;padding:12px 18px;border-top:1px solid #1c2330;display:flex;gap:8px;align-items:center}
/* vilka som är med — ersätter remsan och växeln under uppstarten */
.ros{padding:12px 18px 14px;border-bottom:1px solid #1c2330;display:flex;flex-direction:column;gap:4px}
.roshd{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.roshd .zonlbl{color:var(--dim)}
.rkod{font:700 11px var(--mono);letter-spacing:1.6px;color:var(--acc)}
.rosrad{display:flex;align-items:center;gap:9px;min-height:26px;font:13px var(--sans)}
.rosrad b{font-weight:600}
.rosrad .du{font-size:11.5px;color:var(--dim2)}
.rosrad .rst{font-size:12px;white-space:nowrap}
.rosinv{display:flex;align-items:center;gap:10px;margin-top:6px;font:12px/1.45 var(--sans);color:var(--dim2)}
.rosinv .btn{flex:none}
/* mattan med leken */
.dplate{position:absolute;left:14px;top:14px;z-index:24;display:flex;align-items:center;gap:9px;height:34px;padding:0 12px;border-radius:9px;background:#0b1017e6;border:1px solid #39445a;font:550 13px var(--sans);color:var(--txt);white-space:nowrap;box-shadow:0 6px 16px -8px #000c}
.dplate b{font-weight:650}
.dplate .n{font:12px var(--mono);color:var(--dim)}
.dplate .pen{display:inline-flex;color:var(--dim2)}
.dplate .sep{width:1px;height:14px;background:#39445a}
.nychip{height:20px;padding:0 8px;border-radius:10px;background:#0f2016;border:1px solid #2f6b47;color:#8fe0b0;font:600 11px/18px var(--sans)}
.crow{position:absolute;left:50%;top:76px;translate:-50% 0;display:flex;gap:44px;align-items:flex-start}
.ccol{display:flex;flex-direction:column;gap:12px;flex:none}
.ccol .zr .zonlbl{color:var(--dim)}
.cstack{position:relative}
.ck{position:absolute;left:0}
.ck .kf,.ck .cf{position:absolute;left:0;top:0;border-radius:7px;box-shadow:0 6px 16px -6px #000c}
.ck .cnt{top:5px}
.ck.ny{animation:nyLand .6s cubic-bezier(.2,.8,.3,1) both}
.ck .qd{position:absolute;right:24px;top:5px;z-index:4;width:20px;height:20px;border-radius:50%;background:var(--acc);color:#20160a;font:800 12px/20px var(--sans);text-align:center}
.gk2{position:absolute;left:0;border-radius:8px;border:1.5px dashed #2f3a4c;background:#0e131b}
.mtom{position:absolute;left:50%;translate:-50% 0;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;width:520px}
.mtom .ico{display:inline-flex;color:var(--dim2)}
.mtom b{font:650 17px var(--sans);color:var(--txt)}
.mtom span{font:13px/1.6 var(--sans);color:var(--dim)}
.mfot{position:absolute;left:50%;bottom:22px;translate:-50% 0;display:flex;align-items:center;gap:8px;font:12.5px var(--sans);color:var(--dim2);white-space:nowrap}
.mfot .ic{display:inline-flex}
.blr{display:flex;align-items:center;gap:10px;font:12.5px var(--sans);color:var(--dim);min-height:52px}
.blr .kf{width:34px;height:47px;flex:none;box-shadow:0 4px 10px -4px #000c}
.bnot{font:12px/1.5 var(--sans);color:var(--dim2);margin-top:4px}
`;
const topbarLand = () => `<header class="topbar">
  <div class="brand">${LOGO}<span>Mesa</span></div>
  <div class="spelknapp"><span class="kod">3JR3Q2</span><span class="delare"></span><span class="bjud">${ic('link', 12)}<span>Invite</span></span></div>
  <div class="grow"></div>
  <div class="campill av"><span class="led"></span><span class="ikon">${ic('phone', 13)}</span><span class="lbl">Camera off</span><span class="cv">${ic('down', 11, 2.4)}</span></div>
  <div class="vr"></div>
  <div class="btn ghost">${ic('help', 15)}</div>
  <div class="btn ghost">${DOTS(15)}</div>
</header>`;
const opphd = (b, s) => `<div class="opphd"><b>${b}</b><span>${s}</span></div>`;
const steg = (nr, tit, st, { sum = '', body = '' } = {}) =>
  `<div class="oppsteg ${st}"><span class="oppnr">${st === 'done' ? OK : nr}</span><div class="oppbody"><div class="opptit">${tit}</div>${st === 'done' ? `<div class="oppsum">${sum}</div>` : ''}${st === 'active' ? `<div class="oppcont">${body}</div>` : ''}</div></div>`;
const OPPFOT = `<div class="oppfot"><span class="btn ghost sm">Play without the camera</span></div>`;
const ST = { setup: ['Setting up', '#e8c98a'], deck: ['Picking a deck', '#e8c98a'], ready: ['Ready', '#8fe0b0'], play: ['Playing', 'var(--dim)'] };
function roster(rader, { invite = false, watch = false } = {}) {
  const r = rader.map(p => `<div class="rosrad"><i class="bdot" style="--pc:${p.c}"></i><b>${p.n}</b>${p.du ? `<span class="du">${p.du}</span>` : ''}<span class="grow"></span><span class="rst" style="color:${ST[p.s][1]}">${p.st || ST[p.s][0]}</span></div>`).join('');
  return `<div class="ros"><div class="roshd"><span class="zonlbl">In this game</span><span class="grow"></span><span class="rkod">3JR3Q2</span></div>${r}`
    + (invite ? `<div class="rosinv"><span>Others join with the code or the link.</span><span class="grow"></span><span class="btn sm">${ic('link', 12)}Copy invite link</span></div>` : '')
    + (watch ? `<div class="rosinv"><span class="btn sm">${ic('eye', 13)}Watch the table</span><span>Look at their cards while you set up.</span></div>` : '') + '</div>';
}
const lageOpt = (rub, txt, tag, on) => `<div class="oppopt${on ? ' on' : ''}"><span class="radio"></span><span class="oppbody"><b>${rub}${tag ? `<span class="tag">${tag}</span>` : ''}</b><span>${txt}</span></span></div>`;
const LAGE = `<div class="oppgrupp">With camera</div>${lageOpt('Mirror my table', 'Everything you do with your cards shows up here: play, tap, move, remove.', 'Recommended', true)}${lageOpt('Only add new cards', 'The camera adds cards as you play them. You tap and move them here.')}<div class="oppgrupp skild">Without camera</div>${lageOpt('Without camera', 'No phone. You put your cards on the mat yourself.')}<div class="opprad"><span class="btn prim sm">Continue</span></div>`;
const lekOpt = (namn, f, n, on, tag) => `<div class="oppopt${on ? ' on' : ''}"><span class="radio"></span><span class="oppbody"><b>${pips(f)}${namn}${tag ? `<span class="tag">${tag}</span>` : ''}</b></span><span class="oppmeta">${n} cards</span></div>`;
const NYTT_TXT = 'Mesa only recognizes cards from the deck you play with. You have no decks yet — add your cards one of these three ways:';

/* Kaskaden: en kolumn per korttyp, namnraderna syns som i fotoraderna. */
function casc(namn, n, kort, { w = 176, off = 34, extra = '' } = {}) {
  const h = hc(w), H = kort.length ? h + (kort.length - 1) * off : h;
  const s = kort.map(([k, cnt, st], i) => `<div class="ck${st ? ' ' + st : ''}" style="top:${i * off}px;z-index:${i + 1};width:${w}px;height:${h}px;animation-delay:${(i * 0.07).toFixed(2)}s">${face(k, w)}<span class="cnt">${cnt}</span>${st === 'chk' ? '<span class="qd">?</span>' : ''}</div>`).join('');
  return `<div class="ccol" style="width:${w}px"><div class="zr"><span class="zonlbl">${namn}</span><span class="zn">${n}</span><i class="zl"></i></div><div class="cstack" style="height:${H}px">${s}${extra}</div></div>`;
}
function gcol(namn, w = 176, off = 34, n = 3) {
  const h = hc(w);
  let s = ''; for (let i = 0; i < n; i++) s += `<i class="gk2" style="top:${i * off}px;width:${w}px;height:${h}px;z-index:${i + 1}"></i>`;
  return `<div class="ccol" style="width:${w}px"><div class="zr"><span class="zonlbl">${namn}</span><i class="zl"></i></div><div class="cstack" style="height:${h + (n - 1) * off}px">${s}</div></div>`;
}
const GRUPPER = ['Creatures', 'Instants &amp; sorceries', 'Artifacts &amp; enchantments', 'Lands'];
const blLista = () => `<div class="ccol" style="width:176px"><div class="zr"><span class="zonlbl">Basic lands</span><span class="zn">0</span><i class="zl"></i></div><div>${BASLAND.map(([k, n]) => `<div class="blr"><img class="kf" src="${K[k].img}" alt=""><span>${n}</span><span class="grow"></span>${stp(0)}</div>`).join('')}<p class="bnot">Leave these out of the photos. Set how many you play here.</p></div></div>`;

/* ── TODAY: dagens landning ─────────────────────────────────────────── */
function todayLanding() {
  const css = L_CSS + `
.bord{position:relative;min-width:0;min-height:0}
.omatta{position:absolute;z-index:2;overflow:hidden;border-radius:12px;background:radial-gradient(1250px 620px at 54% 74%, #18232f, #0a0f14 72%)}
.ovinj{position:absolute;inset:0;z-index:25;border-radius:inherit;pointer-events:none;box-shadow:inset 0 0 90px 20px #00000066,inset 0 0 0 1px color-mix(in srgb,var(--pc) 40%,transparent)}
.olist{position:absolute;left:0;right:0;top:0;height:46px;z-index:26;display:flex;align-items:center;gap:10px;padding:0 12px 0 14px;font:550 12.5px var(--sans);color:var(--txt);white-space:nowrap;overflow:hidden}
.olist .thumbs{display:flex;align-items:center;gap:4px;min-width:0;overflow:hidden}
.olist .sub{font:11px/1 var(--mono);color:var(--dim)}
.olist .sep{flex:none;width:1px;height:14px;background:var(--line)}
.olist .stripkey{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:500;color:var(--dim2)}
.othumb{display:inline-block;flex:none;width:22px;height:31px;border-radius:3px;object-fit:cover;background:#11161e;box-shadow:0 0 0 1px #0008}
.kant3{position:absolute;left:0;right:0;height:56px;z-index:8;display:grid;place-items:center}
.kant3 .edgeline{position:absolute;left:14px;right:14px;top:50%;height:1px;background:#1c2330}
.ssw{position:relative;display:flex;align-items:center;gap:2px;height:34px;padding:3px 3px 3px 4px;border-radius:9px;border:1px solid var(--line);background:#141922;box-shadow:0 8px 20px -10px #000e}
.ssw .egrip{display:grid;place-items:center;flex:none;width:20px;height:26px;border-radius:5px;color:#4a5a72}
.sseg{display:inline-flex;align-items:center;gap:7px;height:26px;padding:0 5px 0 8px;border-radius:5px;border:1px solid transparent;color:var(--dim);font:550 12.5px var(--sans);white-space:nowrap}
.sseg kbd{min-width:15px;padding:0 4px;font-size:10px;line-height:1.4;opacity:.8}
.sseg.on.mine{background:linear-gradient(#f0a52a2b,#f0a52a2b),#1a212c;border-color:#f0a52a99;color:#ffdfae}
.sseg.on.mine kbd{background:#f0a52a2b;border-color:#f0a52a55;color:#ffd98a;opacity:1}
.sseg svg{flex:none;display:block}
.oppmatt{position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px}
.oppmattbild{width:min(960px,100%)}
.oppmattvant{width:100%;aspect-ratio:16/10;max-height:calc(100vh - 230px);border:1px dashed var(--panelram2);border-radius:10px;background:#0b1017;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:24px;color:var(--dim)}
.oppmattvant svg{color:var(--dim2)}
.oppmattvant em{font:600 10px/1 var(--sans);font-style:normal;letter-spacing:.7px;text-transform:uppercase;color:var(--dim2)}
.oppmattvant b{font-size:15px;font-weight:650;color:var(--txt)}
.oppmattvant span{font-size:12.5px;max-width:44ch;line-height:1.55}
`;
  const tummar = ['plains', 'plains', 'mountain', 'plains', 'nighthawk'].map(k => `<img class="othumb" src="${K[k].img}" alt="">`).join('');
  const body = `<div id="app">${topbarLand()}
<main class="brade">
  <div class="bord">
    <div class="omatta" style="left:0;top:0;width:100%;height:46px;--pc:${PC.erik}"><i class="ovinj"></i><div class="olist"><i class="bdot" style="--pc:${PC.erik}"></i><b>Erik</b><span class="sep"></span><span class="thumbs">${tummar}</span><span class="sub">5 on the table</span><span class="grow"></span><span class="stripkey"><kbd>1</kbd></span></div></div>
    <div class="kant3" style="top:46px"><i class="edgeline"></i><div class="ssw"><span class="egrip">${GRIP}</span><span class="sseg on mine"><i class="bdot" style="--pc:${PC.jesper}"></i><span class="nm">Me</span><kbd>M</kbd></span><span class="sseg"><i class="bdot" style="--pc:${PC.erik}"></i><span class="nm">Erik</span><kbd>1</kbd></span><span class="sseg">${ic('both', 14, 2)}<span class="nm">Both</span><kbd>A</kbd></span></div></div>
    <section class="matta" style="position:absolute;left:0;top:102px;width:100%;bottom:0"><div class="oppmatt"><div class="oppmattbild"><div class="oppmattvant">${ic('deck', 34, 1.5)}<em>Step 1 of 2</em><b>Pick your deck</b><span>Only cards from the deck you pick will be recognized once your phone is connected. Pick it on the right.</span></div></div></div></section>
  </div>
  <aside class="oppstart">
    ${opphd('Set up your table', 'About a minute. You can change all of it later.')}
    ${steg(1, 'Pick your deck', 'active', { body: '<p class="opptxt">Only cards from the deck you pick will be recognized once your phone is connected. You have no decks yet — add your cards first.</p><div class="opprad"><span class="btn prim sm">New deck…</span></div>' })}
    ${steg(2, 'Choose game mode', 'todo')}
    ${OPPFOT}
  </aside>
</main></div>`;
  skriv('Landing.dc.html', css, body);
}

/* ── D · leken bredvid panelen ──────────────────────────────────────── */
function dArt(fil, { plate, mat, panel, anim = false, css = '' }) {
  const body = `<div id="app">${topbarLand()}
<main class="brade">
  <section class="matta">${plate ? `<div class="dplate">${plate}</div>` : ''}${mat}</section>
  <aside class="oppstart">${panel}</aside>
</main></div>`;
  skriv(fil, L_CSS + css, body, anim);
}
function d1() {
  const mat = `<div class="crow">${GRUPPER.map(g => gcol(g)).join('')}</div>
    <div class="mtom" style="top:470px"><span class="ico">${ic('deck', 30, 1.6)}</span><b>Your deck will be laid out here</b><span>Add your cards on the right. They show up here as they come in, sorted by type, so you can check that Mesa read them right.</span></div>`;
  const panel = opphd('Get your table ready', 'You started this game. Pick the deck you’ll play with, then choose how Mesa follows your table — and you’re playing.')
    + roster([{ n: 'Jesper', c: PC.jesper, du: 'you · host', s: 'setup' }], { invite: true })
    + steg(1, 'Pick your deck', 'active', { body: `<p class="opptxt">${NYTT_TXT}</p>${vkLista(0)}<p class="opptxt liten">You can mix them — a photo first, then a few cards typed in.</p>` })
    + steg(2, 'Choose game mode', 'todo') + OPPFOT;
  dArt('D1Host.dc.html', { plate: '<span class="zonlbl" style="color:var(--dim)">Your deck</span><span class="n">none yet</span>', mat, panel });
}
function d2() {
  const g = guide({ id: 'd2g', cols: 4, rows: 4, w: 34, off: 7, gap: 7, steps: false, pad: 12, compact: true });
  const mat = `<div class="crow">${NY.map(([namn, kort]) => casc(namn, kort.reduce((a, x) => a + x[1], 0), kort)).join('')}${blLista()}</div>`;
  const panel = opphd('Get your table ready', 'You started this game. Pick the deck you’ll play with, then choose how Mesa follows your table — and you’re playing.')
    + roster([{ n: 'Jesper', c: PC.jesper, du: 'you · host', s: 'setup' }, { n: 'Erik', c: PC.erik, s: 'deck' }])
    + steg(1, 'New deck', 'active', { body: `${aTabs('phone')}
      <div class="rosinv" style="margin:0;color:#8fe0b0"><span class="led"></span><span>Phone connected for scanning. Photos land in this deck.</span></div>
      <div class="fotorad chk"><span class="mph"><i style="left:6px"></i><i style="left:18px"></i><i style="left:30px"></i><i style="left:42px"></i></span><div class="ft"><b>Photo 1</b><span>24 cards · 1 to check</span></div><span class="btn sm">Check</span></div>
      <div style="display:flex;flex-direction:column;gap:8px">${g.html}<p class="opptxt">Next: move these cards aside, lay out the next ones and take another photo.</p></div>
      <div class="opprad"><span class="btn prim sm">Use this deck</span><span class="opptxt liten">You can keep adding later.</span></div>` })
    + steg(2, 'Choose game mode', 'todo') + OPPFOT;
  dArt('D2Build.dc.html', { plate: `${pips('WR', 14)}<b>New deck</b><span class="pen">${ic('pencil', 13)}</span><span class="sep"></span><span class="n">24 cards</span><span class="nychip">24 new from photo 1</span>`, mat, panel, anim: true, css: A_CSS.replace(/\.pg\{[^}]*\}/, '') + g.css });
}
function d3() {
  const mat = `<div class="crow">${BOROS.map(g => casc(g[0], sum(g), g[1])).join('')}</div>
    <div class="mfot"><span class="ic">${ic('deck', 14)}</span>These cards go into your library when you start playing.</div>`;
  const panel = opphd('Get your table ready', 'You started this game. Pick the deck you’ll play with, then choose how Mesa follows your table — and you’re playing.')
    + roster([{ n: 'Jesper', c: PC.jesper, du: 'you · host', s: 'setup' }, { n: 'Erik', c: PC.erik, s: 'ready' }])
    + steg(1, 'Pick your deck', 'done', { sum: 'Boros Blades · 60 cards' })
    + steg(2, 'Choose game mode', 'active', { body: LAGE });
  dArt('D3Mode.dc.html', { plate: `${pips('WR', 14)}<b>Boros Blades</b><span class="sep"></span><span class="n">60 cards</span>`, mat, panel });
}
function d4() {
  const mat = `<div class="crow">${DIMIR.map(g => casc(g[0], sum(g), g[1])).join('')}</div>
    <div class="mfot"><span class="ic">${ic('deck', 14)}</span>These cards go into your library when you start playing.</div>`;
  const panel = opphd('Join Jesper’s game', 'Jesper and Erik are already playing. Set up your table and you’re in.')
    + roster([{ n: 'Jesper', c: PC.jesper, du: 'host', s: 'play', st: 'Playing · turn 4' }, { n: 'Erik', c: PC.erik, s: 'play' }, { n: 'Sara', c: PC.sara, du: 'you', s: 'setup' }], { watch: true })
    + steg(1, 'Pick your deck', 'active', { body: `<p class="opptxt">Only cards from the deck you pick will be recognized.</p>${lekOpt('Blue-black flyers', 'UB', 60, true, 'Used last time')}${lekOpt('Mono-green stompy', 'G', 60)}${lekOpt('Golgari Mill', 'BG', 60)}<div class="opprad"><span class="btn prim sm">Use Blue-black flyers</span><span class="btn ghost sm">${ic('plus', 12, 2.4)}New deck</span></div>` })
    + steg(2, 'Choose game mode', 'todo') + OPPFOT;
  dArt('D4Join.dc.html', { plate: `${pips('UB', 14)}<b>Blue-black flyers</b><span class="sep"></span><span class="n">60 cards</span><span class="tag">Used last time</span>`, mat, panel });
}

/* ── E · lobbyn först ───────────────────────────────────────────────── */
const E_CSS = L_CSS + A_CSS.replace(/\.pg\{[^}]*\}/, '') + `
.lob{flex:1;min-height:0;display:flex;flex-direction:column;gap:18px;padding:22px 40px 24px;overflow:hidden;background:radial-gradient(1400px 520px at 50% -12%, #18232f, #0d1015 70%)}
.lhd{display:flex;align-items:flex-end;gap:24px}
.lti{display:flex;flex-direction:column;gap:6px}
.lti .zonlbl{color:var(--dim)}
.lti h1{margin:0;display:flex;align-items:center;gap:12px;font:650 24px/1.2 var(--sans);letter-spacing:-.3px}
.live{display:inline-flex;align-items:center;gap:7px;height:24px;padding:0 10px;border-radius:12px;background:#0f2016;border:1px solid #2f6b47;color:#8fe0b0;font:600 12px var(--sans);letter-spacing:0}
.live i{width:6px;height:6px;border-radius:50%;background:var(--green)}
.seats{display:flex;gap:10px;margin-left:auto;align-items:center}
.seat{display:flex;align-items:center;gap:10px;height:50px;padding:0 14px 0 9px;border-radius:12px;background:#121821;border:1px solid var(--line)}
.seat .av{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font:700 13px var(--sans);color:#0d1015;background:var(--pc);flex:none}
.seat .sn{display:flex;flex-direction:column;gap:1px;white-space:nowrap}
.seat .sn b{font:600 13px var(--sans)}
.seat .sn span{font:11.5px var(--sans)}
.seat.me{border-color:#f0a52a66}
.seat.tom{border-style:dashed;background:transparent}
.seat.tom .av{background:transparent;border:1.5px dashed #3d4a5f;color:var(--dim2)}
.seat.tom .sn b{color:var(--dim)}
.stepper{display:flex;align-items:center;gap:12px}
.stp2{display:flex;align-items:center;gap:9px;font:600 13px var(--sans);color:var(--dim);white-space:nowrap}
.stp2 .n{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;border:1px solid #39445a;font:700 11.5px var(--mono);color:var(--dim2);flex:none}
.stp2.on{color:var(--txt)}
.stp2.on .n{background:var(--acc);border-color:var(--acc);color:#20160a}
.stp2.ok{color:var(--txt)}
.stp2.ok .n{background:#0f2016;border-color:#2f6b47;color:#8fe0b0}
.stp2 em{font-style:normal;font-weight:500;color:var(--dim)}
.stline{width:44px;height:1px;background:#28313f;flex:none}
.eh2{margin:0;font:650 20px/1.25 var(--sans);letter-spacing:-.2px}
.ep{margin:6px 0 0;font:13.5px/1.55 var(--sans);color:var(--dim);max-width:780px}
.tre3{display:flex;align-items:stretch;gap:14px}
.wc{flex:1;display:flex;flex-direction:column;gap:10px;padding:20px;border-radius:14px;background:#121821;border:1px solid var(--line)}
.wc.rek{border-color:#4a5a72}
.wc .wi{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;background:var(--bg3);border:1px solid var(--line);color:var(--txt)}
.wc .wt{display:flex;align-items:center;gap:8px}
.wc b{font:650 16px var(--sans)}
.wc p{font:13px/1.55 var(--sans);color:var(--dim)}
.wc .btn{align-self:flex-start;margin-top:auto}
.eller2{align-self:center;font:600 11px var(--sans);letter-spacing:.8px;text-transform:uppercase;color:var(--dim2)}
.tblocks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 40px}
.tb2{display:flex;flex-direction:column;gap:10px;min-width:0}
.tb2 .zr .zonlbl{color:var(--dim)}
.tb2 .rad{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}
.gh{flex:none;width:56px;height:78px;border-radius:6px;border:1.5px dashed #2f3a4c;background:#0b0f1566}
.cap{font:12.5px var(--sans);color:var(--dim2)}
.e2{flex:1;min-height:0;display:grid;grid-template-columns:400px minmax(0,1fr);gap:28px}
.wpan{display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:14px;background:#121821;border:1px solid var(--line);min-height:0}
.wpan h3{margin:0;font:650 15px var(--sans)}
.edeck{display:flex;flex-direction:column;gap:18px;min-width:0}
.edh{display:flex;align-items:center;gap:10px}
.edh b{font:650 19px var(--sans);letter-spacing:-.2px}
.edh .pen{display:inline-flex;color:var(--dim2)}
.edh .n{font:600 13px var(--mono);color:var(--dim)}
.modes{display:flex;gap:14px}
.mc2{flex:1;display:flex;gap:12px;align-items:flex-start;padding:18px;border-radius:14px;border:1px solid var(--line);background:#121821}
.mc2.on{border-color:var(--acc);background:#1a1710}
.mc2 .radio{width:16px;height:16px;border-radius:50%;border:1.5px solid #4a5a72;flex:none;display:grid;place-items:center;margin-top:2px}
.mc2.on .radio{border-color:var(--acc)}
.mc2.on .radio::after{content:'';width:8px;height:8px;border-radius:50%;background:var(--acc)}
.mc2 .mb{display:flex;flex-direction:column;gap:6px}
.mc2 .mi{display:inline-flex;color:var(--dim)}
.mc2 b{display:flex;align-items:center;gap:8px;font:600 14.5px var(--sans)}
.mc2 span{font:12.5px/1.5 var(--sans);color:var(--dim)}
.dstrip{display:flex;flex-direction:column;gap:12px;padding:14px 16px;border-radius:14px;background:#0f141c;border:1px solid var(--line)}
.dstrip .dsh{display:flex;align-items:center;gap:10px;font:13px var(--sans)}
.dstrip .dsh b{font-weight:650}
.dsgr{display:flex;gap:26px;align-items:flex-end}
.dsg{display:flex;flex-direction:column;gap:8px}
.dsg .zonlbl{color:var(--dim)}
.dsg .rad{display:flex;gap:10px}
.eshelf{display:flex;gap:16px;align-items:stretch}
.eb{width:214px;display:flex;flex-direction:column;border-radius:12px;background:#121821;border:1px solid var(--line);overflow:hidden;flex:none}
.eb.on{border-color:var(--acc);box-shadow:0 0 0 1px var(--acc)}
.eb .cov{position:relative;height:96px;overflow:hidden;background:#0b1016}
.eb .cov img{position:absolute;width:270px;left:-28px;top:-40px}
.eb .cov .tag{position:absolute;left:10px;top:10px}
.eb .inf{display:flex;flex-direction:column;gap:4px;padding:10px 12px 12px}
.eb .inf b{display:flex;align-items:center;gap:8px;font:650 14px var(--sans)}
.eb .inf span{font:12px var(--mono);color:var(--dim)}
.enew{width:300px;display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:12px;border:1.5px dashed #3d4a5f;flex:none}
.enew b{font:650 14px var(--sans)}
.enew .vk{padding:7px 9px;gap:9px}
.enew .vk .vi{width:26px;height:26px}
.enew .vk .vt b{font-size:12.5px}
.enew .vk .vt span{display:none}
`;
const eSeat = (n, c, sub, { me = false, tom = false, subc = 'var(--dim)' } = {}) => tom
  ? `<div class="seat tom"><span class="av">${ic('plus', 14, 2.2)}</span><span class="sn"><b>Open seat</b><span style="color:var(--dim2)">Share the code</span></span></div>`
  : `<div class="seat${me ? ' me' : ''}"><span class="av" style="--pc:${c}">${n[0]}</span><span class="sn"><b>${n}</b><span style="color:${subc}">${sub}</span></span></div>`;
const eStepper = (steps) => `<div class="stepper">${steps.map(([n, t, st], i) => `${i ? '<i class="stline"></i>' : ''}<div class="stp2 ${st || ''}"><span class="n">${st === 'ok' ? OK : n}</span>${t}</div>`).join('')}</div>`;
const eBlocks = (groups, w, extra = '') => `<div class="tblocks">${groups.map(([namn, kort]) => `<div class="tb2"><div class="zr"><span class="zonlbl">${namn}</span><span class="zn">${kort.reduce((a, x) => a + x[1], 0)}</span><i class="zl"></i></div><div class="rad">${kort.map(([k, n, st]) => pile(k, n, { w, st })).join('')}</div></div>`).join('')}${extra}</div>`;
function eArt(fil, lob, { anim = false, css = '' } = {}) {
  skriv(fil, E_CSS + css, `<div id="app">${topbarLand()}<div class="lob">${lob}</div></div>`, anim);
}
function e1() {
  const wc = ([i, t, s, tag], knapp, prim) => `<div class="wc${tag ? ' rek' : ''}"><span class="wi">${ic(i, 20)}</span><span class="wt"><b>${t}</b>${tag ? `<span class="tag">${tag}</span>` : ''}</span><p>${s}</p><span class="btn${prim ? ' prim' : ''}">${knapp}</span></div>`;
  const ghost = GRUPPER.map(g => `<div class="tb2"><div class="zr"><span class="zonlbl">${g}</span><i class="zl"></i></div><div class="rad">${'<i class="gh"></i>'.repeat(5)}</div></div>`).join('');
  eArt('E1Host.dc.html', `
    <div class="lhd"><div class="lti"><span class="zonlbl">Game 3JR3Q2 · you started it</span><h1>Your game</h1></div>
      <div class="seats">${eSeat('Jesper', PC.jesper, 'You · setting up', { me: true, subc: '#e8c98a' })}${eSeat('', '', '', { tom: true })}${eSeat('', '', '', { tom: true })}<span class="btn">${ic('link', 13)}Copy invite link</span></div></div>
    ${eStepper([[1, 'Pick your deck', 'on'], [2, 'Choose game mode']])}
    <div><h2 class="eh2">Which deck are you playing?</h2><p class="ep">Mesa only recognizes cards from the deck you pick. You have no decks yet — add yours in one of these three ways.</p></div>
    <div class="tre3">${wc(VAGAR[0], 'Scan with your phone', true)}<span class="eller2">or</span>${wc(VAGAR[1], 'Paste a list')}<span class="eller2">or</span>${wc(VAGAR[2], 'Type card names')}</div>
    <div class="tblocks">${ghost}</div>
    <p class="cap">Your cards show up here as you add them, sorted by type.</p>`);
}
function e2() {
  const g = guide({ id: 'e2g', cols: 5, rows: 5, w: 40, off: 8, gap: 8, steps: 'under', pad: 14, compact: true });
  const bl = `<div class="tb2"><div class="zr"><span class="zonlbl">Basic lands</span><span class="zn">0</span><i class="zl"></i></div><div class="rad" style="gap:18px">${BASLAND.map(([k, n]) => `<div class="blk" style="display:flex;flex-direction:column;align-items:center;gap:6px"><img class="kf" src="${K[k].img}" alt="" style="width:50px;height:70px"><span class="stp s"><span>${ic('minus', 10, 2.4)}</span><b>0</b><span>${ic('plus', 10, 2.4)}</span></span></div>`).join('')}</div></div>`;
  eArt('E2Build.dc.html', `
    <div class="lhd"><div class="lti"><span class="zonlbl">Game 3JR3Q2 · you started it</span><h1>Your game</h1></div>
      <div class="seats">${eSeat('Jesper', PC.jesper, 'You · setting up', { me: true, subc: '#e8c98a' })}${eSeat('Erik', PC.erik, 'Picking a deck', { subc: '#e8c98a' })}${eSeat('', '', '', { tom: true })}<span class="btn">${ic('link', 13)}Copy invite link</span></div></div>
    ${eStepper([[1, 'Pick your deck', 'on'], [2, 'Choose game mode']])}
    <div class="e2">
      <aside class="wpan"><h3>Add cards</h3>${aTabs('phone')}
        <div class="kort2" style="flex-direction:row;align-items:center;gap:10px"><span class="led"></span><div style="flex:1;display:flex;flex-direction:column;gap:2px"><b style="font:600 13px var(--sans)">Phone connected for scanning</b><span style="font:12px var(--sans);color:var(--dim)">Photos land in this deck.</span></div></div>
        <div class="kort2"><div class="fotorad chk"><span class="mph"><i style="left:6px"></i><i style="left:18px"></i><i style="left:30px"></i><i style="left:42px"></i></span><div class="ft"><b>Photo 1</b><span>24 cards added · 1 to check</span></div><span class="btn sm">Check</span></div></div>
        <div class="zr"><span class="zonlbl">Next photo</span><i class="zl"></i></div>
        <div style="display:flex;gap:14px;align-items:flex-start">${g.html}</div>
        ${g.steg}
      </aside>
      <section class="edeck">
        <div class="edh">${pips('WR', 15)}<b>New deck</b><span class="pen">${ic('pencil', 14)}</span><span class="n">24 cards</span><span class="grow"></span><span class="btn prim">Use this deck</span></div>
        ${eBlocks(NY, 84, bl)}
      </section>
    </div>`, { anim: true, css: g.css });
}
function e3() {
  const mc = (ik, t, s, tag, on) => `<div class="mc2${on ? ' on' : ''}"><span class="radio"></span><span class="mb"><span class="mi">${ic(ik, 22, 1.7)}</span><b>${t}${tag ? `<span class="tag">${tag}</span>` : ''}</b><span>${s}</span></span></div>`;
  const strip = BOROS.map(([namn, kort]) => `<div class="dsg"><span class="zonlbl">${namn.replace(' &amp; ', ' &amp; ')} <b style="font:600 10.5px var(--mono);color:var(--dim2)">${kort.reduce((a, x) => a + x[1], 0)}</b></span><div class="rad">${kort.map(([k, n]) => pile(k, n, { w: 58, lab: false })).join('')}</div></div>`).join('');
  eArt('E3Mode.dc.html', `
    <div class="lhd"><div class="lti"><span class="zonlbl">Game 3JR3Q2 · you started it</span><h1>Your game</h1></div>
      <div class="seats">${eSeat('Jesper', PC.jesper, 'You · setting up', { me: true, subc: '#e8c98a' })}${eSeat('Erik', PC.erik, 'Ready', { subc: '#8fe0b0' })}${eSeat('', '', '', { tom: true })}<span class="btn">${ic('link', 13)}Copy invite link</span></div></div>
    ${eStepper([[1, 'Boros Blades', 'ok'], [2, 'Choose game mode', 'on']])}
    <div><h2 class="eh2">How should Mesa follow your table?</h2><p class="ep">You can change this later from the camera menu. With the camera, two more steps follow: connect your phone and lay out your table.</p></div>
    <div class="modes">${mc('camera', 'Mirror my table', 'Everything you do with your cards shows up here: play, tap, move, remove.', 'Recommended', true)}${mc('cardplus', 'Only add new cards', 'The camera adds cards as you play them. You tap and move them here.')}${mc('nocam', 'Without camera', 'No phone. You put your cards on the mat yourself.')}</div>
    <div class="opprad"><span class="btn prim big">Continue</span></div>
    <div class="dstrip"><div class="dsh">${pips('WR', 14)}<b>Boros Blades</b><span class="dim" style="font-family:var(--mono);font-size:12px">60 cards</span><span class="grow"></span><span class="btn sm ghost">Change deck</span></div><div class="dsgr">${strip}</div></div>`);
}
function e4() {
  const eb = (namn, f, img, n, on, tag) => `<div class="eb${on ? ' on' : ''}"><div class="cov"><img src="${img}" alt="">${tag ? `<span class="tag">${tag}</span>` : ''}</div><div class="inf"><b>${pips(f, 13)}${namn}</b><span>${n} cards</span></div></div>`;
  eArt('E4Join.dc.html', `
    <div class="lhd"><div class="lti"><span class="zonlbl">Game 3JR3Q2</span><h1>Jesper’s game<span class="live"><i></i>Playing · turn 4</span></h1></div>
      <div class="seats">${eSeat('Jesper', PC.jesper, 'Host · playing')}${eSeat('Erik', PC.erik, 'Playing')}${eSeat('Sara', PC.sara, 'You · setting up', { me: true, subc: '#e8c98a' })}<span class="btn">${ic('eye', 14)}Watch the table</span></div></div>
    ${eStepper([[1, 'Pick your deck', 'on'], [2, 'Choose game mode']])}
    <div><h2 class="eh2">Pick your deck to take your seat</h2><p class="ep">Only cards from the deck you pick will be recognized. Jesper and Erik keep playing while you set up.</p></div>
    <div class="eshelf">${eb('Blue-black flyers', 'UB', 'nighthawk.jpg', 60, true, 'Used last time')}${eb('Mono-green stompy', 'G', 'woodelves.jpg', 60)}${eb('Golgari Mill', 'BG', 'pharika.jpg', 60)}
      <div class="enew"><b>New deck</b>${vkLista()}</div><span class="grow"></span></div>
    ${eBlocks(DIMIR, 66)}
    <div class="opprad" style="justify-content:flex-end;margin-top:auto"><span class="btn prim big">Use Blue-black flyers</span></div>`);
}

/* ── F · direkt på bordet ───────────────────────────────────────────── */
const F_CSS = L_CSS + A_CSS.replace(/\.pg\{[^}]*\}/, '') + `
.fmain{flex:1;min-height:0;padding:10px;display:flex}
.fmain > .matta{flex:1}
.sbar{position:absolute;left:0;right:0;top:0;height:54px;z-index:20;display:flex;align-items:center;gap:10px;padding:0 14px;border-bottom:1px solid #1c2330;background:#0b1017a6}
.sbar .zonlbl{color:var(--dim);margin-right:4px}
.sch{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 12px 0 11px;border-radius:9px;background:#121821e6;border:1px solid var(--line);font:550 12.5px var(--sans);white-space:nowrap;color:var(--txt)}
.sch .du{font-size:11.5px;color:var(--dim2)}
.sch .rst{font-size:11.5px}
.sch.me{border-color:#f0a52a66}
.sch.tom{border-style:dashed;background:transparent;color:var(--dim)}
.sch .w{display:inline-flex;align-items:center;gap:5px;margin-left:2px;padding-left:9px;border-left:1px solid var(--line);color:var(--dim);font-size:11.5px}
.sch .kod{font:700 12px var(--mono);letter-spacing:1.6px;color:var(--acc)}
.scard{position:absolute;right:16px;top:70px;z-index:25;width:384px;display:flex;flex-direction:column;border-radius:14px;background:#121821f7;border:1px solid #3d4a5f;box-shadow:0 30px 60px -24px #000,0 0 0 1px #ffffff08;overflow:hidden}
.schd{padding:16px 18px 14px;border-bottom:1px solid #1c2330;display:flex;flex-direction:column;gap:5px}
.schd em{font:600 10px/1 var(--sans);font-style:normal;letter-spacing:.7px;text-transform:uppercase;color:var(--dim2)}
.schd b{display:flex;align-items:center;gap:8px;font:650 17px/1.3 var(--sans)}
.schd b .pen{display:inline-flex;color:var(--dim2)}
.schd span{font:12.5px/1.5 var(--sans);color:var(--dim)}
.scb{padding:14px 18px 16px;display:flex;flex-direction:column;gap:12px}
.scfot{padding:11px 18px;border-top:1px solid #1c2330;display:flex;align-items:center;gap:8px;font:12px var(--sans);color:var(--dim2)}
.spread{position:absolute;left:30px;top:84px;width:960px;display:flex;flex-wrap:wrap;gap:24px 44px;align-items:flex-start}
.cl{display:flex;flex-direction:column;gap:10px}
.cl .zr .zonlbl{color:var(--dim)}
.cl .rad{display:flex;gap:14px;align-items:flex-start}
.ghf{flex:none;width:78px;height:109px;border-radius:6px;border:1.5px dashed #2f3a4c;background:#0b0f1566}
.hogar{position:absolute;left:24px;top:640px;width:260px;height:170px;z-index:22}
.spot{position:absolute;top:0;width:108px;height:144px;border-radius:6px}
.gspot{left:0;border:1.5px dashed #e8b33a99;background:#0b0f1573}
.lspot{left:130px;border:1.5px solid #6b8cff;background:#0b0f1540}
.lspot.glod{border-color:#8fa8ff;box-shadow:0 0 0 6px #6b8cff26,0 0 28px 6px #6b8cff33;animation:andas 2.4s ease-in-out infinite}
.inne{position:absolute;left:6.5px;top:6.5px;width:92px;height:128px}
.deck img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;border-radius:5px}
.deck .d4{transform:translate(6px,-6px);filter:brightness(.4)}
.deck .d3{transform:translate(4px,-4px);filter:brightness(.55)}
.deck .d2{transform:translate(2px,-2px);filter:brightness(.75)}
.deck .d1{box-shadow:0 3px 8px #0008}
.gsten{position:absolute;left:50%;top:50%;translate:-50% -50%;color:#e8b33a;opacity:.85;display:inline-flex}
.hograd{position:absolute;top:153px;display:flex;align-items:center;gap:6px;height:12px;font:600 9.5px/1 var(--sans);letter-spacing:.9px;text-transform:uppercase;color:var(--dim);white-space:nowrap}
.hograd > i{width:6px;height:6px;border-radius:2px;flex:none;background:#e8b33a}
.hograd.l > i{background:#6b8cff}
.hograd b{font:600 11px/1 var(--mono);color:var(--txt);letter-spacing:0;text-transform:none}
.lspot .cnt{right:-12px;top:-10px}
.coach{position:absolute;z-index:23;display:flex;flex-direction:column;gap:4px;padding:10px 13px;border-radius:10px;background:#0f141cf5;border:1px solid #6b8cff99;box-shadow:0 12px 30px -10px #000;width:250px;font:12.5px/1.45 var(--sans);color:var(--dim)}
.coach b{color:#c9d4ff;font-weight:650;font-size:13px}
.coach::before{content:'';position:absolute;left:-7px;top:22px;width:12px;height:12px;background:#0f141c;border-left:1px solid #6b8cff99;border-bottom:1px solid #6b8cff99;transform:rotate(45deg)}
@keyframes andas{0%,100%{box-shadow:0 0 0 0 #6b8cff00}50%{box-shadow:0 0 0 7px #6b8cff26,0 0 26px 4px #6b8cff2e}}
.fcent{position:absolute;left:30px;width:960px;top:452px;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
.fcent b{font:650 16px var(--sans);color:var(--txt)}
.fcent span{font:13px/1.55 var(--sans);color:var(--dim);max-width:520px}
`;
const hogarF = (lek) => `<div class="hogar">
  <div class="spot gspot"><span class="gsten"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 21V10a5 5 0 0 1 10 0v11"></path><path d="M5 21h14"></path><path d="M12 12.5v5M10 14.5h4"></path></svg></span></div>
  <div class="spot lspot${lek ? '' : ' glod'}">${lek ? `<span class="inne deck"><img class="d4" src="mtg-back.jpg" alt=""><img class="d3" src="mtg-back.jpg" alt=""><img class="d2" src="mtg-back.jpg" alt=""><img class="d1" src="mtg-back.jpg" alt=""></span><span class="cnt">${lek}</span>` : ''}</div>
  <div class="hograd" style="left:0"><i></i>Graveyard</div>
  <div class="hograd l" style="left:130px"><i></i>Library${lek ? ` <b>${lek}</b>` : ''}</div>
</div>`;
const sch = (n, c, du, rst, rc, { me = false, watch = '' } = {}) => `<span class="sch${me ? ' me' : ''}"><i class="bdot" style="--pc:${c}"></i>${n}${du ? `<span class="du">${du}</span>` : ''}<span class="rst" style="color:${rc}">${rst}</span>${watch ? `<span class="w">${ic('eye', 12)}${watch}</span>` : ''}</span>`;
const schTom = `<span class="sch tom">${ic('plus', 12, 2.2)}Open seat</span>`;
const schKod = `<span class="sch"><span class="kod">3JR3Q2</span><span class="w">${ic('link', 12)}Copy invite link</span></span>`;
const fSpread = (groups, w, extra = '') => `<div class="spread">${groups.map(([namn, kort]) => `<div class="cl"><div class="zr"><span class="zonlbl">${namn}</span><span class="zn">${kort.reduce((a, x) => a + x[1], 0)}</span></div><div class="rad">${kort.map(([k, n, st]) => pile(k, n, { w, st })).join('')}</div></div>`).join('')}${extra}</div>`;
function fArt(fil, { sbar, mat, card, anim = false, css = '' }) {
  skriv(fil, F_CSS + css, `<div id="app">${topbarLand()}<main class="fmain"><section class="matta"><div class="sbar"><span class="zonlbl">At this table</span>${sbar}</div>${mat}<div class="scard">${card}</div></section></main></div>`, anim);
}
function f1() {
  const ghost = `<div class="spread">${GRUPPER.map(g => `<div class="cl"><div class="zr"><span class="zonlbl">${g}</span></div><div class="rad">${'<i class="ghf"></i>'.repeat(g === 'Creatures' ? 6 : g === 'Lands' ? 4 : 3)}</div></div>`).join('')}</div>`;
  fArt('F1Host.dc.html', {
    sbar: `${sch('Jesper', PC.jesper, 'you · host', 'Setting up', '#e8c98a', { me: true })}${schTom}${schTom}<span class="grow"></span>${schKod}`,
    mat: `${ghost}<div class="fcent"><b>Your deck gets spread out here while you set up</b><span>Sorted by type, so you can check that Mesa read your cards right. When you start playing, it’s gathered into your library, bottom left.</span></div>
      ${hogarF(0)}<div class="coach" style="left:286px;top:668px"><b>Your deck goes here</b>Pick or add it in the card on the right.</div>`,
    card: `<div class="schd"><em>Step 1 of 2</em><b>Welcome to your table</b><span>You started this game. Pick the deck you’ll play with.</span></div>
      <div class="scb"><p class="opptxt">${NYTT_TXT}</p>${vkLista(0)}<p class="opptxt liten">You can mix them — a photo first, then a few cards typed in.</p></div>
      <div class="scfot">Next: choose how Mesa follows your table<span class="grow"></span><span class="btn ghost sm">Play without the camera</span></div>`,
  });
}
function f2() {
  const g = guide({ id: 'f2g', cols: 4, rows: 4, w: 34, off: 7, gap: 7, steps: false, pad: 12, compact: true });
  fArt('F2Build.dc.html', {
    sbar: `${sch('Jesper', PC.jesper, 'you · host', 'Setting up', '#e8c98a', { me: true })}${sch('Erik', PC.erik, '', 'Picking a deck', '#e8c98a')}${schTom}<span class="grow"></span>${schKod}`,
    mat: `${fSpread(NY, 86, `<div class="cl"><div class="zr"><span class="zonlbl">Basic lands</span><span class="zn">0</span></div><div class="rad">${BASLAND.map(([k]) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px"><img class="kf" src="${K[k].img}" alt="" style="width:56px;height:78px">${stp(0)}</div>`).join('')}</div><span class="opptxt liten">Leave these out of the photos. Set how many you play here.</span></div>`)}${hogarF(24)}`,
    card: `<div class="schd"><em>Step 1 of 2</em><b>New deck<span class="pen">${ic('pencil', 14)}</span></b><span>24 cards so far, spread out on the table.</span></div>
      <div class="scb">${aTabs('phone')}
        <div class="rosinv" style="margin:0;color:#8fe0b0"><span class="led"></span><span>Phone connected for scanning. Photos land in this deck.</span></div>
        <div class="fotorad chk"><span class="mph"><i style="left:6px"></i><i style="left:18px"></i><i style="left:30px"></i><i style="left:42px"></i></span><div class="ft"><b>Photo 1</b><span>24 cards · 1 to check</span></div><span class="btn sm">Check</span></div>
        <div style="display:flex;flex-direction:column;gap:8px">${g.html}<p class="opptxt">Next: move these cards aside, lay out the next ones and take another photo.</p></div></div>
      <div class="scfot"><span class="btn prim sm">Use this deck</span><span>You can keep adding later.</span></div>`,
    anim: true, css: g.css,
  });
}
function f3() {
  fArt('F3Mode.dc.html', {
    sbar: `${sch('Jesper', PC.jesper, 'you · host', 'Setting up', '#e8c98a', { me: true })}${sch('Erik', PC.erik, '', 'Ready', '#8fe0b0')}${schTom}<span class="grow"></span>${schKod}`,
    mat: `${fSpread(BOROS, 78)}${hogarF(60)}<div class="coach" style="left:286px;top:668px"><b>Boros Blades is in your library</b>The cards on the table are gathered into it when you start playing.</div>`,
    card: `<div class="schd"><em>Step 2 of 2</em><b>How should Mesa follow your table?</b><span>Boros Blades · 60 cards. <u style="text-decoration-color:#39445a;text-underline-offset:3px">Change deck</u></span></div>
      <div class="scb">${LAGE}</div>
      <div class="scfot">With the camera, two more steps follow: connect your phone and lay out your table.</div>`,
  });
}
function f4() {
  fArt('F4Join.dc.html', {
    sbar: `${sch('Jesper', PC.jesper, 'host', 'Playing · 12 on the table', 'var(--dim)', { watch: 'Watch' })}${sch('Erik', PC.erik, '', 'Playing · 9 on the table', 'var(--dim)', { watch: 'Watch' })}${sch('Sara', PC.sara, 'you', 'Setting up', '#e8c98a', { me: true })}<span class="grow"></span>${schKod}`,
    mat: `${fSpread(DIMIR, 78)}${hogarF(60)}`,
    card: `<div class="schd"><em>Step 1 of 2</em><b>Welcome to Jesper’s game</b><span>Jesper and Erik are on turn 4. Pick your deck to take your seat.</span></div>
      <div class="scb"><p class="opptxt">Only cards from the deck you pick will be recognized.</p>${lekOpt('Blue-black flyers', 'UB', 60, true, 'Used last time')}${lekOpt('Mono-green stompy', 'G', 60)}${lekOpt('Golgari Mill', 'BG', 60)}<div class="opprad"><span class="btn prim sm">Use Blue-black flyers</span><span class="btn ghost sm">${ic('plus', 12, 2.4)}New deck</span></div></div>
      <div class="scfot"><span class="btn ghost sm">${ic('eye', 13)}Watch the table first</span></div>`,
  });
}

/* ── bygg ───────────────────────────────────────────────────────────── */
a1b(); a2Start(); a2Phone(); a2Photo(); a2Paste(); a2Type();
todayLanding(); d1(); d2(); d3(); d4(); e1(); e2(); e3(); e4(); f1(); f2(); f3(); f4();

const X = [0, 1540, 3080, 4620, 6160, 7700], D = { w: 1440, h: 900 };
/* A (sida 2) som en rad under D, E och F på sida 3, för att jämföra i samma vy.
   En artboard kan bara ligga på en sida, så raden är kopior under egna namn. */
const A_PA_3 = [['A1Decks2', 'A1′ · Your decks'], ['A2Start', 'A2′ · New deck'], ['A2Phone', 'A2′ · After the QR code'],
  ['A2Photo', 'A2′ · First photo read'], ['A2Paste', 'A2′ · After pasting a list'], ['A2Type', 'A2′ · Typing a name']];
for (const [f] of A_PA_3) copyFileSync(join(UT, f + '.dc.html'), join(UT, 'L3' + f + '.dc.html'));
const ab = (page, y, filer) => filer.map(([file, title], i) => ({ file, title, x: X[i], y, ...D, page }));
canvas.pages = [{ id: 'page-1', name: '1 · Deck builder A/B/C' }, { id: 'page-2', name: '2 · A, clarified' }, { id: 'page-3', name: '3 · Landing in a game' }];
canvas.artboards.push(
  ...ab('page-2', 0, [['A1Decks2.dc.html', 'A1′ · Your decks: three ways to start'], ['A2Start.dc.html', 'A2′ · New deck, before the first card']]),
  ...ab('page-2', 1180, [['A2Phone.dc.html', 'A2′ · After scanning the QR code'], ['A2Photo.dc.html', 'A2′ · The first photo is read']]),
  ...ab('page-2', 2360, [['A2Paste.dc.html', 'A2′ · After pasting a list'], ['A2Type.dc.html', 'A2′ · Typing a name: copies and sideboard']]),
  ...ab('page-3', 0, [['Landing.dc.html', 'Today · landing in a game']]),
  ...ab('page-3', 1180, [['D1Host.dc.html', 'D1 · Host, first game'], ['D2Build.dc.html', 'D2 · Building a new deck'], ['D3Mode.dc.html', 'D3 · Deck picked, next step'], ['D4Join.dc.html', 'D4 · Sara joins a game in progress']]),
  ...ab('page-3', 2360, [['E1Host.dc.html', 'E1 · Host, first game'], ['E2Build.dc.html', 'E2 · Building a new deck'], ['E3Mode.dc.html', 'E3 · Deck picked, next step'], ['E4Join.dc.html', 'E4 · Sara joins a game in progress']]),
  ...ab('page-3', 4720, A_PA_3.map(([f, t]) => ['L3' + f + '.dc.html', t + ' (copy of page 2)'])),
  ...ab('page-3', 3540, [['F1Host.dc.html', 'F1 · Host, first game'], ['F2Build.dc.html', 'F2 · Building a new deck'], ['F3Mode.dc.html', 'F3 · Deck picked, next step'], ['F4Join.dc.html', 'F4 · Sara joins a game in progress']]),
);
const not = (page, id, x, y, w, text) => ({ id, x, y, w, text, page });
canvas.annotations.push(
  not('page-2', 'a2-brief', -500, 0, 420, 'Sida 2 · A förtydligad (MES-146)\n\nA2 är nu samma sida som leken sedan blir: korten till vänster, sätten att lägga till till höger. Innan första kortet är de tre sätten tre stora knappar. När du valt ett blir de flikar överst i spalten, så att du kan byta eller blanda.\n\nA1′: de tre sätten är tre egna knappar i New deck-rutan, med "or" emellan. Varje knapp öppnar en ny lek med det sättet valt.'),
  not('page-2', 'a2-phone', -500, 1180, 420, 'Efter QR-koden\n\nTelefonen är kopplad och steg 1 är bockat. Mattan till vänster säger att den väntar på första fotot, och guiden visar hur korten läggs.\n\nNär fotot är läst ligger korten per typ till vänster, och spalten säger vad nästa foto är. Det finns ingen spara-knapp — leken sparas hela tiden.'),
  not('page-2', 'a2-paste', -500, 2360, 420, 'Inklistrat\n\nListan visas som förhandsvisning till vänster, halvgenomskinlig och streckad. Inget läggs till förrän du trycker "Add 39 cards". Valet Add to the deck / Replace the deck syns först när leken redan har kort.\n\nInskrivet\n\nFlera exemplar: siffrorna 1–4 på förslaget lägger till så många, och Enter lägger till ett. Sideboard: välj Main deck eller Sideboard ovanför fältet, eller "Move to sideboard" på kortet. Sideboarden är en egen ruta i leken. Inga särskilda kortkommandon att komma ihåg.'),
  not('page-3', 'land-brief', -500, 0, 420, 'Sida 3 · Att landa i ett spel (MES-151)\n\nÖverst dagens skärm. Sedan tre varianter, D, E och F, i fyra lägen från vänster till höger:\n1. Värden, första gången: ensam i spelet och utan lekar.\n2. En ny lek byggs: korten läggs upp per typ medan man är kvar i stegen.\n3. Leken är vald och nästa steg pågår: korten ligger kvar.\n4. Sara ansluter när Jesper och Erik redan spelar.\n\nGemensamt: växeln Me · Erik · Both och motståndarremsan är borta under uppstarten. De andra visas som en lista med status, och den som ansluter kan titta på bordet med "Watch the table".'),
  not('page-3', 'land-today', 1540, 0, 440, 'Dagens landning — det som förvirrar\n\n1. Inget säger var man är eller vad som händer sedan.\n2. Motståndarremsan ("Erik · 5 on the table") och växeln Me · Erik · Both står framme fast ingen spelar än.\n3. Mattan upprepar bara panelen ("Pick it on the right").\n4. "New deck…" öppnar lekdialogen ovanpå allt.\n\nI skärmdumpen hette motståndaren Jesper. Här heter han Erik, för tydlighetens skull.'),
  not('page-3', 'land-d', -500, 1180, 420, 'D · Leken bredvid panelen (närmast dagens)\n\nPanelen står kvar till höger men börjar med vilka som är med i spelet. Mattan visar leken i en kolumn per korttyp, där namnraderna syns som när korten ligger för fotot. Utan lek står kolumnerna tomma och säger vad som kommer.\n\n+ Minsta ändringen, och checklistan finns kvar.\n− Mattan är inte bordet än, så övergången till spelet blir ett byte av vy.'),
  not('page-3', 'land-e', -500, 2360, 420, 'E · Lobbyn först\n\nIngen sidopanel för stegen. Man landar i en lobby: vilka som sitter vid bordet, stegen överst och ett steg i taget i hela bredden. Leken visas i rader per typ. När en ny lek byggs står sätten att lägga till till vänster och korten till höger.\n\n+ Tydligast för en förstagångsspelare. De tre sätten att skapa en lek står sida vid sida med "or" emellan.\n− En extra skärm innan bordet. För den som spelat förut är senaste leken förvald, så det blir två klick.'),
  not('page-3', 'land-f', -500, 3540, 420, 'F · Direkt på bordet\n\nUppstarten sker på din egen matta. Leken du väljer läggs på library-platsen nere till vänster, och korten ligger utspridda per typ tills du börjar. Stegen står i ett kort på mattan. Överst en rad med platserna vid bordet i stället för växeln.\n\n+ Mest Mesa: du dukar bordet du ska spela på, och leken hamnar där den ska vara.\n− Mer att bygga, och stegen syns mindre än i en panel.'),
);
canvas.annotations.push(not('page-3', 'land-a', -500, 4720, 420, 'A · Lekbyggaren (kopia av sida 2)\n\nSamma sex skärmar som på sida 2, här under D, E och F så att allt syns i samma vy. Ändra på sida 2 — den här raden är en kopia som byggs om därifrån.'));
canvas.launch = { view: 'canvas', page: 'page-3' };
writeFileSync(join(UT, 'canvas.json'), JSON.stringify(canvas, null, 2));
console.log('canvas.json med sidor');

// Delarna som gen3.mjs (sida 4) bygger vidare på.
export { X_CSS, A2_CSS, L_CSS, F_CSS, VAGAR, vk, vkLista, aSek, blSek, topbarLand, roster, ST, LAGE, lageOpt, lekOpt, PC, BOROS, NY, DIMIR, hogarF, OK, GRIP, stp, sum, BASLAND, GRUPPER, casc, opphd, steg };

// Sida 4 i designytan "Mesa Deck Builder" (MES-163): lekar som eget begrepp
// och uppstarten "Get ready for the game".
//   rad A  Home före spel och lekens egen sida
//   rad B  en ny lek med telefonen, med telefonens skärm under varje steg
//   rad C  Paste a list, utan kodvy
//   rad D  Get ready for the game för värden, steg för steg
//   rad E  den som joinar via länk
// Panelen står till vänster överallt och korten till höger (Jesper, svar 2).
// Ord och steg ur index.html: uppstarten (#oppstart, oppSteg4, ritaOppLager),
// LAGE_NAMN/LAGE_TXT, kameravyn. Kör: node gen3.mjs (bygger sida 1–3 först).
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { K, I, ic, DOTS, LOGO, pips, hc, face, pile, qr, guide, skriv, aTabs, canvas, UT } from './gen.mjs';
import { A2_CSS, L_CSS, VAGAR, vk, aSek, blSek, lageOpt, PC, ST, OK, BASLAND, DIMIR } from './gen2.mjs';

Object.assign(I, {
  copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"></rect><path d="M15.5 8.5V5.8A1.8 1.8 0 0 0 13.7 4H5.8A1.8 1.8 0 0 0 4 5.8v7.9a1.8 1.8 0 0 0 1.8 1.8h2.7"></path>',
  arrow: '<path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path>',
  trash: '<path d="M4 7h16"></path><path d="M6.5 7l1 13h9l1-13"></path><path d="M9.5 7V4.5h5V7"></path>',
  rot: '<path d="M20 11a8 8 0 1 0-2.3 5.7"></path><path d="M20 4v7h-7"></path>',
  mirror: '<path d="M12 3v18"></path><path d="M8.5 7.5 4 12l4.5 4.5z"></path><path d="M15.5 7.5 20 12l-4.5 4.5z"></path>',
});
const OKS = OK.replace('width="12" height="12"', 'width="10" height="10"');
const GRAVSTEN = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 21V10a5 5 0 0 1 10 0v11"></path><path d="M5 21h14"></path><path d="M12 12.5v5M10 14.5h4"></path></svg>';
const OPP_UPP = '<svg width="34" height="34" viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="10" y="4" width="14" height="26" rx="2.2"></rect><path d="M13 8.5h8" stroke-linecap="round"></path></svg>';
const OPP_SIDA = '<svg width="34" height="34" viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="26" height="14" rx="2.2"></rect><path d="M8.5 21V13" stroke-linecap="round"></path></svg>';

/* ── lekarna (påhittade) ────────────────────────────────────────────── */
const LEK = {
  boros: { n: 'Boros Blades', f: 'WR', img: 'danitha.jpg', meta: '60 cards' },
  golgari: { n: 'Golgari Mill', f: 'BG', img: 'pharika.jpg', meta: '60 cards · 15 sideboard' },
  elves: { n: 'Elves', f: 'G', img: 'llanowar.jpg', meta: '60 cards', st: '2 to check' },
  dimir: { n: 'Blue-black flyers', f: 'UB', img: 'nighthawk.jpg', meta: '60 cards · 8 sideboard' },
  stompy: { n: 'Mono-green stompy', f: 'G', img: 'woodelves.jpg', meta: '60 cards' },
};
/* Boros Blades på lekens sida: basländerna står i stegarna under korten. */
const BOROS_ED = [
  ['Creatures', [['swiftspear', 4], ['pikemaster', 4], ['danitha', 2], ['phoenix', 3], ['serra', 3], ['siege', 2]]],
  ['Instants &amp; sorceries', [['bolt', 4], ['helix', 4], ['charm', 4]]],
  ['Artifacts &amp; enchantments', [['blade', 4], ['anthem', 3]]],
  ['Lands', [['foundry', 4], ['vantage', 2]]],
];
/* Samma lek när den väljs i ett spel: allt som högar, också basländerna. */
const BOROS_SPEL = [BOROS_ED[0], BOROS_ED[1], BOROS_ED[2], ['Lands', [['mountain', 9], ['plains', 8], ['foundry', 4], ['vantage', 2]]]];
/* Den nya leken efter foto 1: 24 kort, ett att kolla. */
const NY1 = [
  ['Creatures', [['swiftspear', 4, 'ny'], ['pikemaster', 4, 'ny'], ['danitha', 2, 'ny'], ['phoenix', 3, 'chk']]],
  ['Instants &amp; sorceries', [['bolt', 4, 'ny']]],
  ['Artifacts &amp; enchantments', [['blade', 4, 'ny'], ['anthem', 3, 'ny']]],
];
/* Den inklistrade listan: 41 kort och 2 i sideboarden, Helix att kolla. */
const LISTA = [
  ['Creatures', [['swiftspear', 4, 'ny'], ['pikemaster', 4, 'ny'], ['danitha', 2, 'ny'], ['phoenix', 3, 'ny'], ['serra', 3, 'ny']]],
  ['Instants &amp; sorceries', [['bolt', 4, 'ny'], ['charm', 4, 'ny'], ['helix', 4, 'chk']]],
  ['Artifacts &amp; enchantments', [['blade', 4, 'ny']]],
];
const n = kort => kort.reduce((a, x) => a + x[1], 0);

/* ════════════════════════════════════════════════════════════════════
   CSS
   ════════════════════════════════════════════════════════════════════ */
const C4 = `
/* sidhuvud utanför spel */
.me{display:inline-flex;align-items:center;gap:8px;font:550 12.5px var(--sans);color:var(--txt);white-space:nowrap}
.dh .dmen{position:relative}
.dh .dmen .menu{position:absolute;right:0;top:36px;z-index:30}
.btn.on{background:var(--bg4);color:var(--txt);border-color:#3b485c}
/* lekens sida: panelen till vänster, korten till höger */
.ed4{flex:1;min-height:0;display:grid;grid-template-columns:400px minmax(0,1fr)}
.ap{min-height:0;display:flex;flex-direction:column;gap:14px;padding:18px 20px 20px;background:#121821;border-right:1px solid var(--line);overflow:hidden;position:relative}
.ap h3{margin:0;font:650 15px var(--sans);color:var(--txt)}
.ky{position:relative;min-width:0;min-height:0;overflow:hidden;padding:18px 32px 20px;display:flex;flex-direction:column;gap:20px}
.ky .sekrad{gap:36px}
.tom4{align-self:center;margin-top:170px;width:470px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
.tom4 .ico{display:inline-flex;color:var(--dim2);margin-bottom:4px}
.tom4 b{font:650 17px var(--sans);color:var(--txt)}
.tom4 span{font:13px/1.6 var(--sans);color:var(--dim)}
/* telefonens delsteg */
.ps{margin:0;padding:0;list-style:none;display:flex;flex-direction:column}
.ps li{position:relative;display:flex;gap:12px;padding-bottom:20px}
.ps li:last-child{padding-bottom:0}
.ps li::before{content:'';position:absolute;left:11px;top:29px;bottom:5px;width:1.5px;background:#28313f}
.ps li:last-child::before{display:none}
.ps li.done::before{background:#2f6b47}
.ps .sn{position:relative;z-index:1;flex:none;width:23px;height:23px;border-radius:50%;display:grid;place-items:center;border:1px solid #39445a;font:700 11px var(--mono);color:var(--dim2);background:#121821}
.ps li.done .sn{background:#0f2016;border-color:#2f6b47;color:#8fe0b0}
.ps li.act .sn{background:var(--acc);border-color:var(--acc);color:#20160a}
.ps .sb{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px;padding-top:2px}
.ps .sb > b{font:600 13.5px/19px var(--sans);color:var(--txt)}
.ps li.todo .sb > b{color:var(--dim);font-weight:550}
.ps .sb > span{font:12.5px/1.5 var(--sans);color:var(--dim)}
.ps li.done .sb > span{color:#8fe0b0}
.nxt{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:9px;background:#141c2a;border:1px solid #3d4a6a;font:12.5px/1.5 var(--sans);color:#c9d4ff}
.nxt .ic{display:inline-flex;flex:none;margin-top:1px}
.nxt b{color:#fff;font-weight:650}
.qrrad{display:flex;gap:16px;align-items:center}
.qrrad .qv{display:flex;flex-direction:column;gap:10px;align-items:flex-start}
.oppwait{display:flex;align-items:center;gap:9px;font:12px var(--sans);color:#e8c98a}
.oppwait i{width:7px;height:7px;border-radius:50%;flex:none;background:var(--acc);box-shadow:0 0 0 3px #f0a52a26;animation:puls 1.6s ease-in-out infinite}
.oppwait.ok{color:#8fe0b0}
.oppwait.ok i{background:#3fb97a;box-shadow:0 0 0 3px #3fb97a26;animation:none}
/* inklistringen */
.pfld{position:relative;display:flex;flex-direction:column;gap:10px;height:300px;padding:14px;border-radius:10px;background:#0e131b;border:1px solid var(--panelram)}
.pfld .phd{display:flex;align-items:center;gap:9px;font:14px var(--sans);color:var(--dim2)}
.pfld .caret{height:18px;margin-left:0}
.pfld.liten{height:84px}
.klar{display:flex;gap:11px;align-items:flex-start;padding:12px;border-radius:10px;background:#0f141c;border:1px solid var(--line)}
.klar .ic{display:inline-flex;color:#8fe0b0;flex:none;margin-top:1px}
.klar div{display:flex;flex-direction:column;gap:3px}
.klar b{font:600 13.5px var(--sans);color:var(--txt)}
.klar span{font:12.5px/1.5 var(--sans);color:var(--dim)}
/* To check: samma rad för foto och lista */
.tc{display:flex;flex-direction:column;gap:8px;padding:12px 14px 14px;border-radius:12px;background:#17140d;border:1px solid #5a4520;flex:none}
.tchd{display:flex;align-items:center;gap:9px;min-width:0}
.tchd .tcd{width:8px;height:8px;border-radius:50%;background:var(--acc);flex:none}
.tchd b{font:650 13.5px var(--sans);color:#ffd98a}
.tchd .tn{font:600 11px var(--mono);color:#c9a45e}
.tchd .sub{font:12px var(--sans);color:var(--dim);margin-left:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tci{display:flex;align-items:center;gap:14px;padding:8px 10px 8px 12px;border-radius:9px;background:#0f141c;border:1px solid var(--line)}
.tci .rd{display:flex;flex-direction:column;gap:5px;width:190px;flex:none}
.tci .rd em{font:600 9.5px/1 var(--sans);font-style:normal;letter-spacing:.8px;text-transform:uppercase;color:var(--dim2)}
.tci .rd .strip{height:30px}
.tci .rd q{font:14px/30px var(--sans);color:#cfd9e8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tci .arr{display:inline-flex;color:var(--dim2);flex:none}
.tci .th{width:34px;height:47px;flex:none;border-radius:4px;overflow:hidden}
.tci .th .kf,.tci .th .cf{width:34px!important;height:47px!important}
.tci .tcs{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.tci .tcs b{font:600 14px var(--sans);color:var(--txt)}
.tci .tcs span{font:12px var(--sans);color:var(--dim)}
.tci .tb{display:flex;gap:6px;flex:none}
.hopp{display:flex;align-items:center;gap:8px;font:12.5px var(--sans);color:var(--dim)}
.hopp .ic{display:inline-flex;color:var(--dim2)}
/* lekraden: samma på Home, i Pick your deck och för den som joinar */
.lrs{display:flex;flex-direction:column;gap:6px}
.lr{display:flex;align-items:center;gap:12px;min-height:50px;padding:5px 10px 5px 6px;border-radius:10px;border:1px solid var(--line);background:var(--bg3)}
.lr.on{border-color:var(--acc);background:#1a1710}
.lr .radio{width:16px;height:16px;border-radius:50%;border:1.5px solid #4a5a72;flex:none;display:grid;place-items:center;margin-left:6px}
.lr.on .radio{border-color:var(--acc)}
.lr.on .radio::after{content:'';width:8px;height:8px;border-radius:50%;background:var(--acc)}
.lrc{position:relative;width:52px;height:38px;border-radius:6px;overflow:hidden;flex:none;background:#0b1016}
.lrc img{position:absolute;width:120px;left:-34px;top:-22px;filter:saturate(.9)}
.lrt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.lrt b{display:flex;align-items:center;gap:7px;font:600 13.5px var(--sans);color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lrm2{display:flex;align-items:center;gap:8px;min-width:0;white-space:nowrap}
.lrm2 > span:first-child{font:12px var(--mono);color:var(--dim)}
.lrst{font:600 11.5px var(--sans);color:#e8c98a;white-space:nowrap}
.lrm{display:grid;place-items:center;width:28px;height:28px;border-radius:7px;color:var(--dim2);flex:none}
/* de tre sätten, små, i Pick your deck */
.vag3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.vt3{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:10px 11px 11px;border-radius:10px;border:1px solid var(--line);background:var(--bg3);color:var(--txt)}
.vt3 .i{display:inline-flex;color:var(--dim)}
.vt3 b{font:600 12.5px/1.3 var(--sans)}
/* Home */
.home{flex:1;min-height:0;display:flex;flex-direction:column;gap:26px;padding:34px 48px 30px;background:radial-gradient(1400px 520px at 50% -12%, #18232f, #0d1015 70%)}
.home h1{margin:0;font:650 26px/1.2 var(--sans);letter-spacing:-.3px}
.hcols{flex:1;min-height:0;display:grid;grid-template-columns:470px minmax(0,1fr);gap:40px;align-items:start}
.hsec{display:flex;flex-direction:column;gap:14px;min-width:0}
.hsh{display:flex;align-items:center;gap:10px;min-height:30px}
.hsh h2{margin:0;font:650 16px var(--sans)}
.hsh .hn{font:600 12px var(--mono);color:var(--dim)}
.hstart{display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:12px;background:#121821;border:1px solid var(--line)}
.joinf{display:flex;gap:8px}
.joinf .fld{flex:1;height:38px}
.gl{display:flex;align-items:center;gap:12px;min-height:56px;padding:8px 12px;border-radius:10px;border:1px solid var(--line);background:#121821}
.gl .kod{font:700 12.5px var(--mono);letter-spacing:1.6px;color:var(--acc);flex:none;width:70px}
.gl .gli{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.gl .gli b{display:flex;align-items:center;gap:6px;font:600 13.5px var(--sans);white-space:nowrap}
.gl .gli span{font:12px var(--sans);color:var(--dim)}
.youhost{height:22px;display:inline-flex;align-items:center;padding:0 8px;border-radius:11px;background:#f0a52a1f;border:1px solid #f0a52a55;color:#ffd98a;font:600 11px var(--sans);white-space:nowrap;flex:none}
.dots3{display:inline-flex;gap:3px}
/* Get ready for the game: panelen till vänster */
.gr4{flex:1;min-height:0;display:grid;grid-template-columns:400px minmax(0,1fr);gap:10px;padding:10px}
.gr4 > .matta{min-width:0}
.gp{display:flex;flex-direction:column;min-height:0;min-width:0;background:#121821;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.gphd{flex:none;padding:17px 22px 15px;display:flex;flex-direction:column;align-items:flex-start;gap:5px;border-bottom:1px solid #1c2330}
.gphd .wel{font:600 13px var(--sans);color:var(--pa-acc2)}
.gpt{display:flex;align-items:center;gap:10px;min-width:0}
.gphd h1{margin:0;font:650 19px/1.25 var(--sans);letter-spacing:-.2px;color:var(--txt);white-space:nowrap}
.hostchip{display:inline-flex;align-items:center;gap:7px;height:22px;padding:0 9px 0 8px;border-radius:11px;background:#f0a52a1f;border:1px solid #f0a52a55;color:#ffd98a;font:600 11.5px var(--sans);white-space:nowrap;flex:none}
.gpmid{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.gpdel{padding:14px 22px 16px;display:flex;flex-direction:column;gap:10px}
.gpdel + .gpdel{border-top:1px solid #1c2330}
.gpdh{display:flex;align-items:center;gap:10px}
.gpdh .pn{width:20px;height:20px;border-radius:5px;display:grid;place-items:center;flex:none;background:#1b2230;border:1px solid #39445a;font:700 11px var(--mono);color:var(--dim)}
.gpdh b{font:650 14px var(--sans);color:var(--txt)}
.lnk{display:flex;align-items:center;gap:9px;height:36px;padding:0 5px 0 11px;border-radius:9px;background:#0e131b;border:1px solid var(--panelram)}
.lnk .ic{display:inline-flex;color:var(--dim2);flex:none}
.lnk .lt{flex:1;min-width:0;font:12.5px var(--sans);color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ppl{display:flex;flex-direction:column;gap:2px}
.pr{display:flex;align-items:center;gap:9px;min-height:24px;font:13px var(--sans);color:var(--txt)}
.pr b{font-weight:600}
.pr .du{font-size:11.5px;color:var(--dim2)}
.pr .rst{font-size:12px;white-space:nowrap}
/* den vertikala steppern */
.vs{margin:0;padding:0;list-style:none;display:flex;flex-direction:column}
.vs li{position:relative;display:flex;gap:14px;padding-bottom:16px}
.vs li:last-child{padding-bottom:0}
.vs li::before{content:'';position:absolute;left:12px;top:32px;bottom:6px;width:1.5px;background:#28313f}
.vs li:last-child::before{display:none}
.vs li.done::before{background:#2f6b47}
.vs li.ny{animation:vsIn .5s ease-out both}
@keyframes vsIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.vn{position:relative;z-index:1;width:26px;height:26px;border-radius:50%;flex:none;display:grid;place-items:center;font:700 12px/1 var(--mono);border:1px solid #39445a;color:var(--dim2);background:#121821}
.vs li.done .vn{background:#0f2016;border-color:#2f6b47;color:#8fe0b0}
.vs li.act .vn{background:var(--acc);border-color:var(--acc);color:#20160a}
.vb{flex:1;min-width:0;display:flex;flex-direction:column;padding-top:3px}
.vtit{display:flex;align-items:center;gap:6px;min-height:20px;font:600 14px/20px var(--sans);color:var(--txt);white-space:nowrap}
.vs li.todo .vtit{color:var(--dim);font-weight:550}
.vsum{font:12px var(--sans);color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.vs li.done .vb{cursor:pointer}
.vchg{flex:none;display:inline-flex;color:var(--dim2);padding:2px;border-radius:5px}
.vc{display:flex;flex-direction:column;gap:9px;margin-top:10px}
.gp .oppopt{padding:7px 11px}
.gp .oppgrupp.skild{margin-top:0;padding-top:9px}
.vback{display:inline-flex;align-items:center;gap:5px;align-self:flex-start;font:12px var(--sans);color:var(--dim2)}
.opptxt{margin:0;font:12.5px/1.55 var(--sans);color:var(--dim)}
.opptxt b{color:var(--txt);font-weight:600}
.opptxt.liten{font-size:11.5px;color:var(--dim2)}
.oppopt .oppbody span{font-size:12px}
.gpfot{flex:none;padding:14px 22px 16px;border-top:1px solid #1c2330;background:#10151d;display:flex;flex-direction:column;align-items:stretch;gap:9px}
.gpfot .fb{height:40px;font-size:14px;border-radius:9px;gap:8px}
.gpfot .fh{font:12px/1.45 var(--sans);color:var(--dim2);text-align:center}
.campill.vant{background:#1b1407;border-color:#e8b33a55;color:#f0c874}
.campill.vant .led{background:var(--acc);box-shadow:0 0 0 3px #f0a52a26;animation:puls 1.6s ease-in-out infinite}
/* steg 4:s delar (index.html: .del …) */
.delar{border:1px solid #1c2330;border-radius:10px;overflow:hidden;background:#10151d}
.del{display:flex;flex-direction:column;gap:10px;padding:10px 12px;border-top:1px solid #1c2330}
.del:first-child{border-top:0}
.del.active{background:#18202c;padding:12px 12px 13px}
.delhd{display:flex;align-items:center;gap:9px;min-height:20px;font:600 12.5px var(--sans);color:var(--txt)}
.del.todo .delhd{color:var(--dim);font-weight:550}
.delnr{width:18px;height:18px;border-radius:50%;flex:none;display:grid;place-items:center;font:700 10px/1 var(--mono);border:1px solid #39445a;color:var(--dim2)}
.del.done .delnr{background:#0f2016;border-color:#2f6b47;color:#8fe0b0}
.del.active .delnr{background:var(--acc);border-color:var(--acc);color:#20160a}
.delsum{font-size:11.5px;color:var(--dim);font-weight:500}
.dellank{font-size:11.5px;color:var(--dim2);font-weight:500;text-decoration:underline;text-decoration-color:#39445a;text-underline-offset:3px}
.delbody{display:flex;flex-direction:column;gap:10px;padding-left:27px}
.tapval{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.tapopt{display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 8px;border-radius:9px;border:1px solid var(--line);background:var(--bg3);color:var(--txt)}
.tapopt.on{border-color:var(--acc);background:#1a1710}
.tapopt svg{color:#b9c6d8;margin-bottom:3px}
.tapopt b{font-size:13px;font-weight:600}
.tapopt span{font-size:11px;color:var(--dim)}
.gor{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px}
.gor li{display:flex;align-items:flex-start;gap:8px;font-size:12.5px;line-height:18px;color:var(--txt)}
.gor .gnr{margin-top:1px;width:16px;height:16px;border-radius:50%;border:1px solid #39445a;display:grid;place-items:center;font:700 9.5px/1 var(--mono);color:var(--dim2);flex:none}
.klar4{display:flex;gap:12px;align-items:flex-start;padding:12px;border-radius:10px;background:#0f2016;border:1px solid #2f6b47}
.klar4 .ck{width:26px;height:26px;border-radius:50%;background:#3fb97a;color:#08140d;display:grid;place-items:center;flex:none}
.klar4 b{display:block;font:650 14px var(--sans);color:#d8f5e4}
.klar4 span{font:12.5px/1.5 var(--sans);color:#9fcfb3}
/* mattan: leken per typ, eller telefonens bild */
.dplate.st{position:static;align-self:flex-start;box-shadow:none}
.mfot4{margin-top:auto;display:flex;align-items:center;gap:8px;font:12.5px var(--sans);color:var(--dim2)}
.mfot4 .ic{display:inline-flex}
.oppmatt{position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px}
.oppmattrub,.oppmattbild{width:min(960px,100%)}
.oppmattrub{display:flex;align-items:center;gap:4px;height:26px;flex:none}
.oppmattlive{display:inline-flex;align-items:center;gap:7px}
.oppmattlive i{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px #57c78522}
.oppmattvant{width:100%;aspect-ratio:16/10;border:1px dashed var(--panelram2);border-radius:10px;background:#0b1017;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:24px;color:var(--dim)}
.oppmattvant svg{color:var(--dim2)}
.oppmattvant em{font:600 10px/1 var(--sans);font-style:normal;letter-spacing:.7px;text-transform:uppercase;color:var(--dim2)}
.oppmattvant b{font-size:15px;font-weight:650;color:var(--txt)}
.oppmattvant span{font-size:12.5px;max-width:44ch;line-height:1.55}
.pbw{position:relative;width:960px;height:600px;border-radius:10px;overflow:hidden;border:1px solid var(--line);background:radial-gradient(760px 480px at 54% 36%,#34433a,#1a221c 62%,#101511 100%)}
.pbw::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(100deg,#ffffff05 0 2px,transparent 2px 7px);pointer-events:none}
.pbw::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 120px 30px #0009;pointer-events:none;z-index:1}
.pk{position:absolute;border-radius:5px;box-shadow:0 8px 16px -6px #000d;filter:saturate(.82) brightness(.9)}
.plag{position:absolute;inset:0;z-index:2}
.ochip{position:absolute;height:22px;display:flex;align-items:center;gap:6px;padding:0 8px;border-radius:7px;background:#0f141cf2;border:1px solid #3a4658;color:#cfd9e8;font:650 10.5px/1 var(--sans);box-shadow:0 6px 16px -4px #000e;white-space:nowrap;transform:translateY(calc(-100% - 6px));z-index:3}
.ochip i{width:7px;height:7px;border-radius:2px;flex:none}
.okram{position:absolute;border:2px solid #5fbf7f;border-radius:7px;box-shadow:0 0 0 1px #0009,0 0 14px 2px #5fbf7f55;z-index:2}
.gplats2{position:absolute;border:1.5px dashed #e8b33a99;background:#0b0f1573;color:#e8b33a;border-radius:6px;display:grid;place-items:center}
.gplats2 svg{opacity:.85}
.gplats2.glod{box-shadow:0 0 0 6px #e8b33a24,0 0 28px 6px #e8b33a33}
.bplats{position:absolute;border:1.5px dashed #ffffff5c;border-radius:6px}
.bplats.lagd{border-style:solid;border-color:#6b8cff}
.plek{position:absolute;inset:5px}
.plek img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:4px}
.plek .d3{transform:translate(4px,-4px);filter:brightness(.5)}
.plek .d2{transform:translate(2px,-2px);filter:brightness(.72)}
.plek .d1{box-shadow:0 3px 8px #0008}
.plek.sank{opacity:.55;animation:sank 2.4s ease-in-out infinite}
@keyframes sank{0%{transform:translateY(-34px) scale(1.12);opacity:0}30%{opacity:.6}70%,100%{transform:none;opacity:.6}}
/* ändra och ta bort kort */
.selbar{display:flex;align-items:center;gap:10px;padding:9px 10px 9px 14px;border-radius:10px;background:#141c2a;border:1px solid #3d4a6a;font:13px var(--sans);color:#c9d4ff;flex:none}
.selbar b{font-weight:650;color:#fff}
.selbar .btn{flex:none}
.selm{position:absolute;left:-8px;top:-8px;z-index:5;width:20px;height:20px;border-radius:50%;background:var(--blue);color:#08101f;display:grid;place-items:center;box-shadow:0 0 0 2px #0d1015}
.selr{position:absolute;inset:-4px;border-radius:8px;border:2px solid var(--blue);box-shadow:0 0 16px 1px #6b8cff44;pointer-events:none;z-index:2}
/* fotocykeln: steg 2 och 3 börjar om för varje foto */
.cyk{display:flex;align-items:center;gap:9px;flex:none}
.cyk .pt{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 9px;border-radius:11px;background:#1b2230;border:1px solid #39445a;font:600 11.5px var(--mono);color:var(--txt);letter-spacing:.4px;white-space:nowrap}
.cyk .ct{font:11.5px var(--sans);color:var(--dim2);min-width:0}
.cyk .zl{flex:1;height:1px;background:var(--zonlinje);min-width:6px}
/* New deck under lekarna i Pick your deck */
.nydeck{display:flex}
.nydeck .btn{flex:1;justify-content:center;height:36px}
/* library-platsens lägen (index.html: .opplager …, designytan "Mesa Library Drop") */
.ofatt{position:absolute;z-index:2}
.ofatt i{position:absolute;width:14px;height:14px;border:0 solid #fff;filter:drop-shadow(0 0 6px #ffffff88)}
.ofatt i:nth-child(1){left:0;top:0;border-top-width:2px;border-left-width:2px;border-top-left-radius:4px}
.ofatt i:nth-child(2){right:0;top:0;border-top-width:2px;border-right-width:2px;border-top-right-radius:4px}
.ofatt i:nth-child(3){left:0;bottom:0;border-bottom-width:2px;border-left-width:2px;border-bottom-left-radius:4px}
.ofatt i:nth-child(4){right:0;bottom:0;border-bottom-width:2px;border-right-width:2px;border-bottom-right-radius:4px}
.ospar{position:absolute;overflow:visible;z-index:2}
.ospar rect{fill:none;stroke:#6b8cff;stroke-width:2.5;stroke-dasharray:100;stroke-dashoffset:100;filter:drop-shadow(0 0 5px #6b8cffaa);animation:osparRunt 2.6s cubic-bezier(.4,0,.2,1) infinite}
@keyframes osparRunt{0%{stroke-dashoffset:100}32%,100%{stroke-dashoffset:0}}
.opling{position:absolute;z-index:2;border:2px solid #5fbf7f;border-radius:7px;box-shadow:0 0 0 1px #0009,0 0 14px 2px #5fbf7f55}
.opling::after{content:'';position:absolute;inset:-2px;border-radius:7px;animation:okramRing 2.6s ease-out infinite}
@keyframes okramRing{0%{box-shadow:0 0 0 0 #5fbf7fcc}38%,100%{box-shadow:0 0 0 18px #5fbf7f00}}
.obock{position:absolute;z-index:3;width:24px;height:24px;border-radius:50%;background:#3fb97a;color:#08140d;display:grid;place-items:center;box-shadow:0 0 0 3px #0d1015,0 4px 10px #000a}
.oreserv{position:absolute;z-index:3;display:flex;align-items:center;gap:10px;padding:6px 6px 6px 11px;border-radius:9px;background:#0f141cf2;border:1px solid #3a4658;color:#cfd9e8;font:12px var(--sans);box-shadow:0 8px 22px -8px #000c;white-space:nowrap}
.ohal{position:absolute;z-index:3;border-radius:12px;box-shadow:0 0 0 4000px #070a0ec4}
.oklarkort{position:absolute;z-index:4;left:50%;top:16%;transform:translateX(-50%);width:380px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;padding:28px 28px 22px;border-radius:14px;background:#121821;border:1px solid var(--line);box-shadow:0 30px 70px -20px #000,0 0 0 1px #0006}
.oklarkort h3{margin:4px 0 0;font:650 18px var(--sans);letter-spacing:-.2px;color:var(--txt)}
.oklarkort p{margin:0;font:13px/1.55 var(--sans);color:var(--dim);max-width:30ch}
.oklarkort .btn.prim{width:100%;justify-content:center;height:40px;font-size:14px;margin-top:6px;border-radius:9px;animation:oKnappGlod 2.4s ease-out infinite}
@keyframes oKnappGlod{0%{box-shadow:0 0 0 0 #f0a52a55}60%,100%{box-shadow:0 0 0 12px #f0a52a00}}
.ostormark{width:56px;height:56px;border-radius:50%;background:#0f2016;border:1.5px solid #2f6b47;display:grid;place-items:center;color:#8fe0b0;box-shadow:0 0 0 8px #3fb97a12}
.oppwait.vit{color:#e7ecf4}
.oppwait.vit i{background:#fff;box-shadow:0 0 0 3px #ffffff26;animation:none}
.oppwait.bla{color:#c9d4ff}
.oppwait.bla i{background:#6b8cff;box-shadow:0 0 0 3px #6b8cff33}
@media (prefers-reduced-motion: reduce){.plek.sank,.ospar rect,.opling::after,.oklarkort .btn.prim{animation:none}.ospar rect{stroke-dashoffset:0}}
`;
const CSS4 = A2_CSS + L_CSS + C4;

/* Telefonen, 390 × 844 (P_CSS i gen.mjs, samma mått). */
const PH_CSS = `
.ph{position:relative;width:390px;height:844px;display:flex;flex-direction:column;background:var(--bg);overflow:hidden}
.phh{display:flex;align-items:center;gap:10px;padding:18px 18px 10px}
.phh .brand{font-size:15px}
.phh .con{display:flex;align-items:center;gap:7px;font:12.5px var(--sans);color:#8fe0b0}
.phb{flex:1;min-height:0;display:flex;flex-direction:column;gap:18px;padding:6px 16px 22px}
.btnp{display:flex;align-items:center;justify-content:center;gap:9px;height:52px;border-radius:12px;font:650 16px var(--sans)}
.btnp.prim{background:var(--acc);color:#20160a}
.btnp.sek{background:var(--bg3);border:1px solid var(--line);color:var(--txt)}
.phti{display:flex;flex-direction:column;gap:4px}
.phti span{font:13px var(--sans);color:var(--dim)}
.phti b{font:650 22px/1.2 var(--sans)}
.phtx{font:14px/1.5 var(--sans);color:var(--dim)}
.phtx b{color:var(--txt);font-weight:600}
.pcyk{display:flex;align-items:center;gap:9px;font:600 11.5px var(--mono);color:var(--dim);letter-spacing:.4px}
.pcyk i{flex:1;height:1px;background:#28313f}
/* stegen överst, samma siffror som på datorn */
.pst{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:12px;background:#121821;border:1px solid var(--line)}
.pst .s{display:flex;align-items:center;gap:7px;font:600 12.5px var(--sans);color:var(--dim);white-space:nowrap}
.pst .s .n{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;border:1px solid #39445a;font:700 11px var(--mono);color:var(--dim2);flex:none}
.pst .s.ok .n{background:#0f2016;border-color:#2f6b47;color:#8fe0b0}
.pst .s.on{color:var(--txt)}
.pst .s.on .n{background:var(--acc);border-color:var(--acc);color:#20160a}
.pst > i{flex:1;height:1.5px;background:#28313f;min-width:8px}
.pst > i.ok{background:#2f6b47}
.phok{display:flex;flex-direction:column;align-items:center;gap:10px;padding:26px 20px;border-radius:14px;background:#0f2016;border:1px solid #2f6b47;text-align:center}
.phok .ck{width:48px;height:48px;border-radius:50%;background:#3fb97a;color:#08140d;display:grid;place-items:center}
.phok b{font:650 18px var(--sans);color:#d8f5e4}
.phok span{font:14px/1.5 var(--sans);color:#9fcfb3}
/* kameran */
.cam{position:absolute;inset:0;background:radial-gradient(420px 520px at 50% 45%,#2c3326,#12150f 80%)}
.feed{position:absolute;left:50%;top:230px;translate:-50% 0;transform:rotate(-2deg) perspective(900px) rotateX(9deg);filter:saturate(.85) brightness(.92)}
.feed .kf,.feed .cf{box-shadow:0 3px 8px -2px #000c}
.ram{position:absolute;left:22px;right:22px;top:200px}
.ram i{position:absolute;width:30px;height:30px;border:3px solid #fff}
.ram .c1{left:0;top:0;border-right:0;border-bottom:0;border-top-left-radius:10px}
.ram .c2{right:0;top:0;border-left:0;border-bottom:0;border-top-right-radius:10px}
.ram .c3{left:0;bottom:0;border-right:0;border-top:0;border-bottom-left-radius:10px}
.ram .c4{right:0;bottom:0;border-left:0;border-top:0;border-bottom-right-radius:10px}
.piller{position:absolute;left:16px;right:16px;top:18px;display:flex;align-items:center;gap:8px}
.pil{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 13px;border-radius:17px;background:#0b1017d9;border:1px solid #ffffff22;font:600 13px var(--sans);color:var(--txt);white-space:nowrap}
.pil .n{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:var(--acc);color:#20160a;font:700 11px var(--mono);margin-left:-5px}
.pil .led{box-shadow:none}
.tips{position:absolute;left:24px;right:24px;bottom:176px;text-align:center;font:600 14px/1.45 var(--sans);color:#fff;text-shadow:0 1px 6px #000}
.nere{position:absolute;left:0;right:0;bottom:0;height:150px;display:flex;align-items:center;justify-content:space-between;padding:0 30px 24px;background:linear-gradient(#0b101700,#0b1017ee 40%)}
.nere span{font:600 15px var(--sans);color:var(--txt);min-width:70px}
.slutare{width:76px;height:76px;border-radius:50%;border:4px solid #fff;display:grid;place-items:center}
.slutare i{width:60px;height:60px;border-radius:50%;background:#fff}
.fk{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.fk .c{position:relative}
.fk .c .kf,.fk .c .cf{width:100%!important;height:auto!important;aspect-ratio:488/680}
.fk .c .q{position:absolute;right:-5px;top:-5px;width:20px;height:20px;border-radius:50%;background:var(--acc);color:#20160a;font:800 12px/20px var(--sans);text-align:center;box-shadow:0 0 0 2px var(--bg)}
.stor{font:700 44px/1 var(--sans);letter-spacing:-1px}
/* kameran i ett spel (index.html #vyKamera) */
.kamtopp{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:10px;padding:16px 16px 30px;background:linear-gradient(#0b1017ee,#0b101700);font:600 14px var(--sans)}
.kamtopp .prick{width:9px;height:9px;border-radius:50%;background:var(--acc);box-shadow:0 0 0 4px #f0a52a26;animation:puls 1.6s ease-in-out infinite}
.kamtopp .kod{font:700 13px var(--mono);letter-spacing:1.6px;color:var(--acc)}
.kambot{position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column;gap:6px;padding:60px 22px 34px;background:linear-gradient(#0b101700,#0b1017f2 45%);text-align:center}
.kambot .ks{margin:0;font:650 17px/1.35 var(--sans);color:#fff}
.kambot .kfin{margin:0;font:14px/1.5 var(--sans);color:var(--dim)}
.bordyta{position:absolute;left:-40px;right:-40px;top:190px;height:420px;background:radial-gradient(360px 240px at 50% 50%,#34433a,#1a221c 80%);transform:perspective(700px) rotateX(18deg);border-radius:18px;filter:blur(.4px)}
`;

/* ════════════════════════════════════════════════════════════════════
   Delade bitar
   ════════════════════════════════════════════════════════════════════ */
const topbarHome = () => `<header class="topbar">
  <div class="brand">${LOGO}<span>Mesa</span></div>
  <div class="grow"></div>
  <span class="me"><i class="bdot" style="--pc:${PC.jesper}"></i>Jesper</span>
  <div class="vr"></div>
  <div class="btn ghost">${ic('help', 15)}</div>
  <div class="btn ghost">${DOTS(15)}</div>
</header>`;
const CAM = {
  av: '<div class="campill av"><span class="led"></span><span class="lbl">Camera off</span></div>',
  vant: '<div class="campill vant"><span class="led"></span><span class="lbl">Waiting for your phone</span></div>',
  pa: '<div class="campill pa"><span class="led"></span><span class="lbl">Camera · ready</span></div>',
};
const topbarGame = (cam = 'av') => `<header class="topbar">
  <div class="brand">${LOGO}<span>Mesa</span></div>
  <div class="spelknapp"><span class="kod">3JR3Q2</span><span class="delare"></span><span class="bjud">${ic('link', 12)}<span>Invite</span></span></div>
  <div class="grow"></div>
  ${CAM[cam]}
  <div class="vr"></div>
  <div class="btn ghost">${ic('help', 15)}</div>
  <div class="btn ghost">${DOTS(15)}</div>
</header>`;

/* Lekens huvud: tillbaka till Home, namnet och ⋯ med Rename och Delete. */
function deckHead({ namn = 'New deck', f = '', antal = '', ny = false, sparat = 'Saved', meny = false }) {
  const m = meny ? `<div class="menu"><div class="mi hv"><span class="ic">${ic('pencil', 14)}</span>Rename</div><hr><div class="mi fara"><span class="ic" style="color:#ff9099">${ic('trash', 14)}</span>Delete deck…</div></div>` : '';
  return `<div class="dh">
  <div class="btn ghost">${ic('back', 15, 2.2)}Home</div>
  <div class="vr"></div>
  ${ny ? `<div class="fld fok" style="width:260px;height:36px;font:650 16px var(--sans)">New deck<span class="caret"></span></div><span class="dim2" style="font-size:12px">Name it now or later</span>`
    : `<div class="dn">${f ? pips(f, 15) : ''}<b>${namn}</b><span class="pen">${ic('pencil', 14)}</span></div><span class="dc">${antal}</span>`}
  <div class="grow"></div>
  <span class="sparat">${ny ? 'Nothing to save yet' : `<span class="ic">${ic('check', 14, 2.4)}</span>${sparat}`}</span>
  <div class="dmen"><div class="btn ghost${meny ? ' on' : ''}">${DOTS(15)}</div>${m}</div>
</div>`;
}

/* Lekraden: Home, Pick your deck och den som joinar. */
function lekRad(k, { radio = false, on = false, tag = '', mer = false, andra = false } = {}) {
  const l = LEK[k];
  return `<div class="lr${on ? ' on' : ''}">${radio ? '<span class="radio"></span>' : ''}<span class="lrc"><img src="${l.img}" alt=""></span><span class="lrt"><b>${pips(l.f, 13)}${l.n}</b><span class="lrm2"><span>${radio ? l.meta.split(' · ')[0] : l.meta}</span>${l.st ? `<span class="lrst">${l.st}</span>` : ''}${tag ? `<span class="tag">${tag}</span>` : ''}</span></span>${andra ? `<span class="lrm" title="Change this deck">${ic('pencil', 14)}</span>` : ''}${mer ? `<span class="lrm">${DOTS(15)}</span>` : ''}</div>`;
}
/* Fotocykeln: steg 2 och 3 börjar om för varje foto. */
const CYK = (t, s) => `<div class="cyk"><span class="pt">${ic('camera', 12)}${t}</span><span class="ct">${s}</span><i class="zl"></i></div>`;
/* Verktyget på ett kort, och raden när flera är markerade. */
const KORTTOOL = `<div class="tool" style="left:-10px;top:152px"><span class="tb">${ic('minus', 13, 2.4)}</span><b style="font:600 12px var(--mono);color:var(--txt);min-width:14px;text-align:center">3</b><span class="tb">${ic('plus', 13, 2.4)}</span><i class="sep"></i><span class="tb">${ic('swap', 13)}Change card…</span><span class="tb">Move to sideboard</span><i class="sep"></i><span class="tb fara">${ic('trash', 13)}Remove</span></div>`;
const SELKORT = `<i class="selr"></i><span class="selm">${OK.replace('width="12" height="12"', 'width="11" height="11"')}</span>`;

/* Korten per typ: rader av sektioner, To check överst. */
const grp = (namn, kort, w) => aSek(namn, n(kort), kort.map(([k, c, st, hover]) => pile(k, c, { w, st, hover: hover || '' })).join(''));
const rad = (...sek) => sek.length === 1 ? sek[0] : `<div class="sekrad">${sek.join('')}</div>`;

/* To check — samma rad för ett foto och en inklistrad lista. */
const tcFoto = (k, las, kalla, c) => `<div class="tci"><span class="rd"><em>In the photo</em><img class="strip" src="${K[k].img}" alt=""></span><span class="arr">${ic('chev', 14, 2.2)}</span><span class="th">${face(k, 34)}</span><span class="tcs"><b>${K[k].n}?</b><span>Read as “${las}” · ${kalla} · ${c} copies</span></span><span class="tb"><span class="btn sm prim">${ic('check', 12, 2.6)}Yes</span><span class="btn sm">Change</span></span></div>`;
const tcLista = (k, skrev, c) => `<div class="tci"><span class="rd"><em>In your list</em><span class="q">“${skrev}”</span></span><span class="arr">${ic('chev', 14, 2.2)}</span><span class="th">${face(k, 34)}</span><span class="tcs"><b>${K[k].n}?</b><span>From Pasted list · ${c} copies</span></span><span class="tb"><span class="btn sm prim">${ic('check', 12, 2.6)}Yes</span><span class="btn sm">Change</span></span></div>`;
const toCheck = (rader, extra = '') => `<div class="tc"><div class="tchd"><span class="tcd"></span><b>To check</b><span class="tn">${rader.length}</span><span class="sub">Mesa wasn’t sure. ${rader.length === 1 ? 'It’s in the deck' : 'They’re in the deck'} until you say otherwise.</span></div>${rader.join('')}${extra}</div>`;

/* Telefonens delsteg i panelen (Phone-fliken). */
const ps = (steg) => `<ol class="ps">${steg.map(([st, nr, tit, txt = '', mer = '']) => `<li class="${st}"><span class="sn">${st === 'done' ? OK : nr}</span><div class="sb"><b>${tit}</b>${txt ? `<span>${txt}</span>` : ''}${mer}</div></li>`).join('')}</ol>`;
const NXT = `<div class="nxt"><span class="ic">${ic('phone', 16)}</span><span>When they’re laid out, press <b>Open the camera</b> on your phone.</span></div>`;
const LAYTXT = 'In columns, overlapping, so only the name line of each card shows. About 30 cards at a time. Leave the basic lands out.';

/* Get ready for the game: rubriken, 1 Invite, 2 Get ready yourself, foten. */
const pers = (namn, c, du, s, stt) => `<div class="pr"><i class="bdot" style="--pc:${c}"></i><b>${namn}</b>${du ? `<span class="du">${du}</span>` : ''}<span class="grow"></span><span class="rst" style="color:${ST[s][1]}">${stt || ST[s][0]}</span></div>`;
const FOLK_V = [pers('Jesper', PC.jesper, 'you · host', 'setup'), pers('Erik', PC.erik, '', 'deck')];
const FOLK_J = [pers('Jesper', PC.jesper, 'host', 'play'), pers('Erik', PC.erik, '', 'ready'), pers('Sara', PC.sara, 'you', 'setup')];
function vsteg(steg) {
  return `<ol class="vs">${steg.map(([st, nr, tit, x = '', ny = false]) => `<li class="${st}${ny ? ' ny' : ''}"><span class="vn">${st === 'done' ? OK : nr}</span><div class="vb"><div class="vtit"><span>${tit}</span>${st === 'done' ? `<span class="grow"></span><span class="vsum">${x}</span><span class="vchg" title="Change">${ic('pencil', 13)}</span>` : ''}</div>${st === 'act' && x ? `<div class="vc">${x}</div>` : ''}</div></li>`).join('')}</ol>`;
}
function getReady({ vard = true, folk = FOLK_V, steg, fot }) {
  return `<aside class="gp">
  <div class="gphd">${vard ? '' : '<span class="wel">Welcome to Jesper’s game</span>'}<div class="gpt"><h1>Get ready for the game</h1>${vard ? `<span class="hostchip"><i class="bdot" style="--pc:${PC.jesper}"></i>You’re the host</span>` : ''}</div></div>
  <div class="gpmid">
    <section class="gpdel"><div class="gpdh"><span class="pn">1</span><b>Invite your friends</b></div>
      <div class="lnk"><span class="ic">${ic('link', 14)}</span><span class="lt">Anyone with the link can join</span><span class="btn sm">${ic('copy', 12)}Copy link</span></div>
      <div class="ppl">${folk.join('')}</div></section>
    <section class="gpdel"><div class="gpdh"><span class="pn">2</span><b>Get ready yourself</b></div>${vsteg(steg)}</section>
  </div>
  <div class="gpfot">${fot}</div>
</aside>`;
}
const fot = (etikett, { av = false, hint = '' } = {}) => `${hint ? `<span class="fh">${hint}</span>` : ''}<span class="btn prim fb${av ? ' dis' : ''}">${etikett}</span>`;
/* Lägena: Jespers ord ur editorn (Hybrid modes / Use camera to add cards),
   och en egen rubrik för det digitala läget. */
const LAGE4 = `<div class="oppgrupp">Hybrid modes</div>${lageOpt('Mirror my table', 'Everything you do with your cards shows up here: play, tap, move, remove.', 'Recommended', true)}${lageOpt('Use camera to add cards', 'You tap, move and remove cards digitally.')}<div class="oppgrupp skild">Digital mode</div>${lageOpt('Digital table', 'No phone and no camera. You put your cards on the mat yourself.')}`;
const del = (nr, titel, st, sum = '', lank = '', body = '') => `<div class="del ${st}"><div class="delhd"><span class="delnr">${st === 'done' ? OKS : nr}</span><span>${titel}</span><span class="grow"></span>${st === 'done' ? `<span class="delsum">${sum}</span>${lank ? `<span class="dellank">${lank}</span>` : ''}` : ''}</div>${st === 'active' ? `<div class="delbody">${body}</div>` : ''}</div>`;
const tapval = (val) => `<div class="tapval"><div class="tapopt${val === 0 ? ' on' : ''}">${OPP_UPP}<b>Untapped</b><span>Standing up</span></div><div class="tapopt${val === 1 ? ' on' : ''}">${OPP_SIDA}<b>Tapped</b><span>Turned sideways</span></div></div>`;

/* Telefonens bild på mattan i steg 4: provkortet, graveyard och library i
   kortets storlek (ritaOppLager). Bilden är 960 × 600. */
const KW = 92, KH = hc(KW), GP = { x: 48, y: 432 }, BP = { x: 162, y: 432 }, PK = { x: 566, y: 214 };
const kchip = (x, y, farg, txt) => `<div class="ochip" style="left:${x}px;top:${y}px"><i style="background:${farg}"></i>${txt}</div>`;
function pbild({ prov = '', grav = '', bib = '', klar = false }) {
  let h = '';
  if (prov) {
    h += `<img class="pk" src="swiftspear.jpg" alt="" style="left:${PK.x}px;top:${PK.y}px;width:${KW}px;height:${KH}px">`;
    if (prov === 'hittat') h += `<div class="plag"><div class="okram" style="left:${PK.x - 4}px;top:${PK.y - 4}px;width:${KW + 8}px;height:${KH + 8}px"></div>${kchip(PK.x - 4, PK.y - 4, '#5fbf7f', 'This card')}</div>`;
    else h += `<div class="plag">${kchip(PK.x, PK.y, '#6b7280', prov)}</div>`;
  }
  if (grav) h += `<div class="plag"><div class="gplats2${grav === 'glod' ? ' glod' : ''}" style="left:${GP.x}px;top:${GP.y}px;width:${KW}px;height:${KH}px">${GRAVSTEN}</div>${kchip(GP.x, GP.y, '#e8b33a', grav === 'glod' ? 'Graveyard goes here' : 'Graveyard')}</div>`;
  if (bib) {
    const m = 4, f = { x: BP.x - m, y: BP.y - m, w: KW + 2 * m, h: KH + 2 * m }, plats = { x: BP.x, y: BP.y, w: KW, h: KH };
    const box = q => `left:${q.x}px;top:${q.y}px;width:${q.w}px;height:${q.h}px`;
    const lek = (kl = '') => `<span class="plek${kl ? ' ' + kl : ''}"><img class="d3" src="mtg-back.jpg" alt=""><img class="d2" src="mtg-back.jpg" alt=""><img class="d1" src="mtg-back.jpg" alt=""></span>`;
    const horn = `<div class="ofatt" style="${box(f)}"><i></i><i></i><i></i><i></i></div>`;
    let o;
    if (bib === 'vant' || bib === 'reserv') {
      o = `<div class="bplats" style="${box(plats)}">${lek('sank')}</div>${kchip(BP.x, BP.y, '#6b8cff', 'Put your library here')}`;
      if (bib === 'reserv') o += `<div class="oreserv" style="left:${BP.x + KW + 16}px;top:${BP.y + KH - 34}px">Can’t see your library?<span class="btn sm">It’s in place</span></div>`;
    } else if (bib === 'tackt') {
      o = `<div class="bplats" style="${box(plats)}">${lek()}</div>${horn}${kchip(f.x, f.y, '#fff', 'Got it — let go of the deck')}`;
    } else if (bib === 'kollar') {
      o = `<div class="bplats" style="${box(plats)}">${lek()}</div>${horn}`
        + `<svg class="ospar" style="${box(f)}" viewBox="0 0 ${f.w} ${f.h}" aria-hidden="true"><rect x="1" y="1" width="${f.w - 2}" height="${f.h - 2}" rx="6" pathLength="100"></rect></svg>`
        + `<div class="ochip" style="left:${f.x}px;top:${f.y}px"><i style="background:#6b8cff;border-radius:50%"></i>Checking — keep it still</div>`;
    } else if (bib === 'pling') {
      o = `<div class="bplats lagd" style="${box(plats)}">${lek()}</div><div class="opling" style="${box(f)}"></div>`
        + `<div class="obock" style="left:${f.x + f.w - 12}px;top:${f.y + f.h - 12}px">${OK.replace('width="12" height="12"', 'width="14" height="14"')}</div>${kchip(f.x, f.y, '#5fbf7f', 'Library in place')}`;
    } else {
      o = `<div class="bplats lagd" style="${box(plats)}">${lek()}</div>${kchip(BP.x, BP.y, '#6b8cff', 'Library')}`;
    }
    h += `<div class="plag">${o}</div>`;
  }
  if (klar) {
    const x0 = GP.x - 12, y0 = GP.y - 40, x1 = BP.x + KW + 12, y1 = BP.y + KH + 12;
    h += `<div class="plag"><div class="ohal" style="left:${x0}px;top:${y0}px;width:${x1 - x0}px;height:${y1 - y0}px"></div>`
      + `<div class="oklarkort"><span class="ostormark">${OK.replace('width="12" height="12"', 'width="26" height="26"')}</span><h3>Your table is set up</h3><p>The camera knows where your graveyard and library are.</p>`
      + `<span class="btn prim">Start playing${ic('arrow', 15, 2.4)}</span><span class="btn ghost sm">Change something</span></div></div>`;
  }
  return `<div class="oppmatt"><div class="oppmattrub"><span class="zonlbl oppmattlive"><i></i>What your phone sees</span><span class="grow"></span><span class="btn ghost sm">${ic('rot', 13)}Rotate</span><span class="btn ghost sm">${ic('mirror', 13)}Mirror</span></div><div class="pbw">${h}</div></div>`;
}

function hArt(fil, body, { anim = false, css = '' } = {}) { skriv(fil, CSS4 + css, `<div class="pg">${topbarHome()}${body}</div>`, anim); }
function gArt(fil, { panel, mat, cam = 'av', css = '', anim = false }) {
  skriv(fil, CSS4 + css, `<div id="app">${topbarGame(cam)}<main class="gr4">${panel}<section class="matta">${mat}</section></main></div>`, anim);
}
function phArt(fil, body, { css = '', anim = false } = {}) { skriv(fil, PH_CSS + css, `<div class="ph">${body}</div>`, anim); }
const phHead = (hoger) => `<div class="phh"><div class="brand">${LOGO}<span>Mesa</span></div><span class="grow"></span>${hoger}</div>`;
const CONN = '<span class="con"><span class="led"></span>Connected</span>';
const pst = (st) => {
  const s = [['Connect'], ['Lay out'], ['Photo']];
  return `<div class="pst">${s.map(([t], i) => `${i ? `<i${st[i - 1] === 'ok' ? ' class="ok"' : ''}></i>` : ''}<span class="s ${st[i] || ''}"><span class="n">${st[i] === 'ok' ? OK : i + 1}</span>${t}</span>`).join('')}</div>`;
};

/* ════════════════════════════════════════════════════════════════════
   RAD A — lekar före spel
   ════════════════════════════════════════════════════════════════════ */
function h1() {
  const g = (kod, vem, st, host, knapp = 'Open') => `<div class="gl"><span class="kod">${kod}</span><div class="gli"><b>${vem}</b><span>${st}</span></div>${host ? '<span class="youhost">You host</span>' : ''}<span class="btn sm">${knapp}</span></div>`;
  hArt('H1Home.dc.html', `<div class="home">
  <h1>Hi Jesper</h1>
  <div class="hcols">
    <section class="hsec">
      <div class="hsh"><h2>Your games</h2></div>
      <div class="hstart"><span class="btn prim big">${ic('plus', 15, 2.6)}Start a game</span><span class="eller">or join one</span><div class="joinf"><div class="fld"><span class="ph">Game code</span></div><span class="btn big">Join</span></div></div>
      ${g('3JR3Q2', `<span class="dots3"><i class="bdot" style="--pc:${PC.jesper}"></i><i class="bdot" style="--pc:${PC.erik}"></i></span>Jesper, Erik`, 'Getting ready', true)}
      ${g('BTB2TF', `<span class="dots3"><i class="bdot" style="--pc:${PC.erik}"></i><i class="bdot" style="--pc:${PC.jesper}"></i><i class="bdot" style="--pc:${PC.sara}"></i></span>Erik, Jesper, Sara`, 'Playing · turn 4 · Erik hosts', false)}
    </section>
    <section class="hsec">
      <div class="hsh"><h2>Your decks</h2><span class="hn">4</span><span class="grow"></span><span class="btn">${ic('plus', 14, 2.4)}New deck</span></div>
      <div class="lrs">${['boros', 'golgari', 'elves', 'dimir'].map(k => lekRad(k, { mer: true })).join('')}</div>
    </section>
  </div>
</div>`);
}
function h2() {
  const typ = `<div class="fld"><span class="ic">${ic('search', 15)}</span><span class="ph">Type a card name</span></div>
    <p class="lead2">Suggestions show as you type. Click a number to add that many copies.</p>
    <div class="addto"><span>Add to</span><div class="seg"><span class="on">Main deck</span><span>Sideboard</span></div></div>
    <div class="zr"><span class="zonlbl">Just added</span><i class="zl"></i></div>
    <div class="jr"><div class="th">${face('helix', 26)}</div><span class="grow">Lightning Helix <span class="dim">×4 · Main deck</span></span><span class="btn sm ghost">${ic('undo', 13, 2.2)}Undo</span></div>
    <div class="jr"><div class="th">${face('vantage', 26)}</div><span class="grow">Inspiring Vantage <span class="dim">×2 · Main deck</span></span><span class="btn sm ghost">${ic('undo', 13, 2.2)}Undo</span></div>`;
  hArt('H2Deck.dc.html', `${deckHead({ namn: 'Boros Blades', f: 'WR', antal: '60 cards', meny: true })}
<div class="ed4">
  <aside class="ap"><h3>Add cards</h3>${aTabs('type')}${typ}</aside>
  <section class="ky">
    ${rad(grp(...BOROS_ED[0], 96))}${rad(grp(...BOROS_ED[1], 96), grp(...BOROS_ED[2], 96), grp(...BOROS_ED[3], 96))}${blSek({ plains: 8, mountain: 9 })}</section>
</div>`);
}

/* Ett kort: ändra antal, byta ut det eller ta bort det. */
function h3() {
  const kort = BOROS_ED[2][1].map(([k, c]) => k === 'anthem' ? [k, c, '', KORTTOOL] : [k, c]);
  const cre = BOROS_ED[0][1].filter(([k]) => k !== 'serra');   // Serra Angel togs nyss bort
  hArt('H3Edit.dc.html', `${deckHead({ namn: 'Boros Blades', f: 'WR', antal: '57 cards' })}
<div class="ed4">
  <aside class="ap"><h3>Add cards</h3>${aTabs('type')}
    <div class="fld"><span class="ic">${ic('search', 15)}</span><span class="ph">Type a card name</span></div>
    <p class="lead2">Every card on the right can be changed: point at it for the number, <b style="color:var(--txt);font-weight:600">Change card…</b> if Mesa read it wrong, and Remove.</p>
  </aside>
  <section class="ky">
    ${rad(grp('Creatures', cre, 96))}${rad(grp('Instants &amp; sorceries', BOROS_ED[1][1], 96), grp('Artifacts &amp; enchantments', kort, 96), grp(...BOROS_ED[3], 96))}${blSek({ plains: 8, mountain: 9 })}
    <div class="snack" style="left:32px;bottom:26px"><span>Removed Serra Angel ×3</span><span class="btn sm">${ic('undo', 13, 2.2)}Undo</span></div>
  </section>
</div>`);
}
/* Flera kort: markera och ta bort eller byta i ett svep. */
function h4() {
  const ins = BOROS_ED[1][1].map(([k, c]) => [k, c, '', SELKORT]);
  hArt('H4Select.dc.html', `${deckHead({ namn: 'Boros Blades', f: 'WR', antal: '60 cards' })}
<div class="ed4">
  <aside class="ap"><h3>Add cards</h3>${aTabs('type')}
    <div class="fld"><span class="ic">${ic('search', 15)}</span><span class="ph">Type a card name</span></div>
    <p class="lead2">Click a card to select it, click more to add them. Shift-click takes a whole row.</p>
  </aside>
  <section class="ky">
    <div class="selbar"><b>3 cards selected</b><span>12 copies</span><span class="grow"></span><span class="btn sm">${ic('swap', 13)}Change…</span><span class="btn sm">Move to sideboard</span><span class="btn sm fara">${ic('trash', 13)}Remove</span><span class="btn sm ghost">Clear</span></div>
    ${rad(grp(...BOROS_ED[0], 96))}${rad(grp('Instants &amp; sorceries', ins, 96), grp(...BOROS_ED[2], 96), grp(...BOROS_ED[3], 96))}${blSek({ plains: 8, mountain: 9 })}
  </section>
</div>`);
}

/* ════════════════════════════════════════════════════════════════════
   RAD B — ny lek med telefonen
   ════════════════════════════════════════════════════════════════════ */
const tom = (ikon, rub, txt) => `<section class="ky"><div class="tom4"><span class="ico">${ic(ikon, 30, 1.6)}</span><b>${rub}</b><span>${txt}</span></div></section>`;
function n1() {
  hArt('N1Empty.dc.html', `${deckHead({ ny: true })}
<div class="ed4">
  <aside class="ap"><h3>Add cards</h3><p class="lead2">Pick a way to start. You can mix them later — a photo first, then a few names typed in.</p>${VAGAR.map(v => vk(v)).join('<span class="eller">or</span>')}</aside>
  ${tom('deck', 'No cards yet', 'Add them one of the three ways on the left. They show up here, sorted by type, and you can change or remove every card.')}
</div>`);
}
function n2() {
  const steg1 = `<div class="qrrad">${qr(128, 11)}<div class="qv"><span class="oppwait"><i></i><span>Waiting for your phone…</span></span><span class="btn ghost sm">${ic('copy', 12)}Copy link</span></div></div>`;
  hArt('N2Connect.dc.html', `${deckHead({ ny: true })}
<div class="ed4">
  <aside class="ap"><h3>Add cards</h3>${aTabs('phone')}${ps([
    ['act', 1, 'Connect your phone', 'Scan the code with your phone’s camera — nothing to install. Mesa opens on the phone, ready to photograph this deck.', steg1],
    ['todo', 2, 'Lay out the cards'],
    ['todo', 3, 'Take the photo'],
  ])}</aside>
  ${tom('phone', 'Waiting for your phone', 'Scan the code on the left. After that, every photo you take lands here, sorted by type.')}
</div>`);
}
function n3() {
  const g = guide({ id: 'n3g', cols: 5, rows: 5, w: 40, off: 8, gap: 8, steps: false, pad: 14, compact: true });
  hArt('N3LayOut.dc.html', `${deckHead({ ny: true })}
<div class="ed4">
  <aside class="ap"><h3>Add cards</h3>${aTabs('phone')}${CYK('Photo 1', 'One photo at a time, about 30 cards.')}${ps([
    ['done', 1, 'Connect your phone', 'Phone connected.'],
    ['act', 2, 'Lay out the cards', LAYTXT, g.html + NXT],
    ['todo', 3, 'Take the photo', 'Starts by itself when your phone opens the camera.'],
  ])}</aside>
  ${tom('deck', 'Your first photo lands here', 'Lay out the cards and take the photo. They show up here a few seconds later, sorted by type.')}
</div>`, { anim: true, css: g.css });
}
function n4() {
  hArt('N4Shoot.dc.html', `${deckHead({ ny: true })}
<div class="ed4">
  <aside class="ap"><h3>Add cards</h3>${aTabs('phone')}${CYK('Photo 1', 'One photo at a time, about 30 cards.')}${ps([
    ['done', 1, 'Connect your phone', 'Phone connected.'],
    ['done', 2, 'Lay out the cards', 'Laid out for this photo.'],
    ['act', 3, 'Take the photo', 'Your phone’s camera is open — take the photo. Hold it straight above, every name inside the frame.', '<span class="oppwait"><i></i><span>Waiting for the photo…</span></span>'],
  ])}</aside>
  ${tom('camera', 'Your phone’s camera is open', 'Take the photo. The cards land here a few seconds later, sorted by type.')}
</div>`);
}
function n5() {
  const g = guide({ id: 'n5g', cols: 5, rows: 4, w: 36, off: 7, gap: 7, steps: false, pad: 12, compact: true });
  hArt('N5Read.dc.html', `${deckHead({ namn: 'New deck', antal: '24 cards' })}
<div class="ed4">
  <aside class="ap"><h3>Add cards</h3>${aTabs('phone')}
    <div class="kort2" style="gap:12px"><div style="display:flex;align-items:center;gap:10px"><span class="led"></span><span style="font:12.5px var(--sans);color:var(--dim)">Phone connected for deck photos. They land in this deck.</span></div><div class="fotorad chk"><span class="mph"><i style="left:6px"></i><i style="left:18px"></i><i style="left:30px"></i><i style="left:42px"></i></span><div class="ft"><b>Photo 1</b><span>24 cards added · 1 to check</span></div><span class="ok">${ic('check', 16, 2.4)}</span></div></div>
    ${CYK('Photo 2', 'Steps 2 and 3 start over for every photo.')}
    ${ps([
      ['act', 2, 'Lay out the next cards', 'Move these aside and lay out the next ones the same way.', g.html + NXT],
      ['todo', 3, 'Take the photo', 'Starts by itself when your phone opens the camera.'],
    ])}
    <p class="dropnot" style="margin-top:auto">That was all of them? Nothing more to do — the deck is saved as you go.</p>
  </aside>
  <section class="ky">${toCheck([tcFoto('phoenix', 'Arclight Phoenlx', 'Photo 1', 3)])}
    ${rad(grp(...NY1[0], 96))}${rad(grp(...NY1[1], 96), grp(...NY1[2], 96))}${blSek()}</section>
</div>`, { anim: true, css: g.css });
}

/* Klick på ett kort med Check: fotots rad, förslaget och tre svar. */
function n8() {
  const pop = `<div class="pop" style="left:496px;top:250px;width:330px">
    <span class="ptag">Photo 1 · check this card</span>
    <span class="plbl">In the photo</span>
    <img class="strip" src="phoenix.jpg" alt="">
    <div class="prow" style="align-items:flex-start;gap:12px">${face('phoenix', 58)}<div style="display:flex;flex-direction:column;gap:4px;min-width:0"><h4>Arclight Phoenix?</h4><span class="psub">Read as “Arclight Phoenlx”. 3 copies.</span></div></div>
    <div class="prow"><span class="btn prim sm">${ic('check', 13, 2.6)}Yes, that’s it</span><span class="btn sm">${ic('swap', 13)}Change…</span><span class="grow"></span><span class="btn sm ghost fara">${ic('trash', 13)}Remove</span></div>
  </div>`;
  hArt('N8Check.dc.html', `${deckHead({ namn: 'New deck', antal: '24 cards' })}
<div class="ed4">
  <aside class="ap"><h3>Add cards</h3>${aTabs('phone')}
    <div class="kort2" style="gap:12px"><div style="display:flex;align-items:center;gap:10px"><span class="led"></span><span style="font:12.5px var(--sans);color:var(--dim)">Phone connected for deck photos. They land in this deck.</span></div><div class="fotorad chk"><span class="mph"><i style="left:6px"></i><i style="left:18px"></i><i style="left:30px"></i><i style="left:42px"></i></span><div class="ft"><b>Photo 1</b><span>24 cards added · 1 to check</span></div><span class="ok">${ic('check', 16, 2.4)}</span></div></div>
    <p class="lead2">Answer here or on the card itself — the card is in the deck either way.</p>
  </aside>
  <section class="ky">${toCheck([tcFoto('phoenix', 'Arclight Phoenlx', 'Photo 1', 3)])}
    ${rad(grp(...NY1[0], 96))}${rad(grp(...NY1[1], 96), grp(...NY1[2], 96))}${pop}</section>
</div>`);
}

/* Telefonen under rad B, i samma steg som datorn. */
function pn2() {
  phArt('PN2Connected.dc.html', `${phHead(CONN)}
  <div class="phb">
    ${pst(['ok', 'on', ''])}
    <div class="phti"><span>Adding cards to</span><b>New deck</b></div>
    <div class="phok"><span class="ck">${ic('check', 26, 2.8)}</span><b>Connected to your computer</b><span>The photos you take now land in New deck. The steps are the same here and on the computer.</span></div>
    <p class="phtx">Next: <b>lay out the first cards</b> on the table.</p>
    <div style="margin-top:auto"><div class="btnp prim">Show me how</div></div>
  </div>`);
}
function pn3() {
  const g = guide({ id: 'pn3g', cols: 5, rows: 5, w: 56, off: 12, gap: 8, steps: false, pad: 13 });
  phArt('PN3LayOut.dc.html', `${phHead(CONN)}
  <div class="phb">
    ${pst(['ok', 'on', ''])}
    <div class="phti"><span>Adding cards to</span><b>New deck</b></div>
    <div class="pcyk">Photo 1<i></i></div>
    ${g.html}
    <p class="phtx">${LAYTXT}</p>
    <div style="margin-top:auto;display:flex;flex-direction:column;gap:10px"><p class="phtx" style="text-align:center">When they’re laid out:</p><div class="btnp prim">${ic('camera', 20, 2.2)}Open the camera</div></div>
  </div>`, { css: g.css, anim: true });
}
function pn4() {
  const w = 72, h = hc(w), off = 16, gap = 12;
  const kol = [['swiftspear', 'pikemaster'], ['danitha', 'phoenix'], ['bolt', 'blade'], ['anthem', 'swiftspear']];
  let s = '';
  kol.forEach((k, c) => k.forEach((id, r) => { s += `<div style="position:absolute;left:${c * (w + gap)}px;top:${r * off}px;z-index:${r + 1}">${face(id, w)}</div>`; }));
  const W = 4 * w + 3 * gap, H = h + off;
  phArt('PN4Camera.dc.html', `<div class="cam"></div>
  <div class="feed" style="width:${W}px;height:${H}px">${s}</div>
  <div class="ram" style="height:${H + 70}px"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i></div>
  <div class="piller"><span class="pil"><span class="n">3</span>Take the photo</span><span class="grow"></span><span class="pil"><span class="led"></span>Names are readable</span></div>
  <p class="tips">Hold the phone straight above the cards.<br>Every name inside the frame.</p>
  <div class="nere"><span>Done</span><span class="slutare"><i></i></span><span style="text-align:right;font:600 13px var(--sans);color:var(--dim)">New deck</span></div>`);
}
function pn5() {
  const kort = ['swiftspear', 'pikemaster', 'danitha', 'phoenix', 'bolt', 'blade', 'anthem'];
  phArt('PN5Read.dc.html', `${phHead('<span style="font:13px var(--sans);color:var(--dim)">New deck</span>')}
  <div class="phb">
    ${pst(['ok', 'ok', 'ok'])}
    <div style="display:flex;flex-direction:column;gap:8px"><span style="display:flex;align-items:center;gap:8px;font:600 14px var(--sans);color:#8fe0b0">${ic('check', 17, 2.6)}Photo 1 read</span><span class="stor">24 cards</span><span class="phtx">You’ll see them on the computer — 1 to check.</span></div>
    <div class="fk">${kort.map(k => `<div class="c">${face(k, 78)}${k === 'phoenix' ? '<span class="q">?</span>' : ''}</div>`).join('')}</div>
    <div class="pcyk">Photo 2 next<i></i></div>
    <p class="phtx">Move these cards aside and lay out the next ones the same way — steps 2 and 3 start over.</p>
    <div style="margin-top:auto;display:flex;flex-direction:column;gap:10px"><div class="btnp prim">${ic('camera', 20, 2.2)}Take the next photo</div><div class="btnp sek">Done</div></div>
  </div>`);
}

/* ════════════════════════════════════════════════════════════════════
   RAD C — Paste a list
   ════════════════════════════════════════════════════════════════════ */
const LOCK = `<div class="lockrad"><span class="ic">${ic('lock', 14)}</span><span>Mesa reads the list as plain text and adds only the names that exist in Magic.</span></div>`;
function n6() {
  hArt('N6Paste.dc.html', `${deckHead({ ny: true })}
<div class="ed4">
  <aside class="ap"><h3>Add cards</h3>${aTabs('paste')}
    <div class="pfld"><span class="phd"><span class="caret"></span>Paste your list here</span></div>
    <p class="lead2">From Moxfield, Arena, MTGO or plain text, one card per line. Mesa recognizes the format by itself.</p>
    ${LOCK}
    <div style="display:flex;justify-content:flex-end;margin-top:auto"><span class="btn prim big">Read the list</span></div>
  </aside>
  ${tom('paste', 'No cards yet', 'The cards from your list land here, sorted by type. You can check and change every one.')}
</div>`);
}
function n7() {
  const sb = `<div class="sbzon"><div class="zr"><span class="zonlbl" style="color:var(--dim)">Sideboard</span><span class="zn">2</span></div><div class="hogar">${pile('rip', 2, { w: 88, st: 'ny' })}</div></div>`;
  hArt('N7Pasted.dc.html', `${deckHead({ namn: 'New deck', antal: '41 cards + 2 sideboard' })}
<div class="ed4">
  <aside class="ap"><h3>Add cards</h3>${aTabs('paste')}
    <div class="klar"><span class="ic">${ic('check', 16, 2.6)}</span><div><b>43 cards added from your list</b><span>41 in the deck and 2 in the sideboard. 1 card to check, on the right.</span></div></div>
    <div class="opprad"><span class="btn">${ic('undo', 13, 2.2)}Undo — remove all 43</span></div>
    <p class="lead2">Or change and remove single cards on the right.</p>
    <div class="zr"><span class="zonlbl">Paste another list</span><i class="zl"></i></div>
    <div class="pfld liten"><span class="phd">Paste your list here</span></div>
    <div style="display:flex;justify-content:flex-end"><span class="btn">Read the list</span></div>
  </aside>
  <section class="ky">${toCheck([tcLista('helix', 'Lightnig Helix', 4)], `<div class="hopp"><span class="ic">${ic('minus', 14, 2.2)}</span>1 line wasn’t a card — skipped.</div>`)}
    ${rad(grp(...LISTA[0], 88))}${rad(grp(...LISTA[1], 88), grp(...LISTA[2], 88), sb)}${blSek({ mountain: 9 })}</section>
</div>`, { css: '.ky{gap:16px}' });
}

/* ════════════════════════════════════════════════════════════════════
   RAD D — Get ready for the game, värden
   ════════════════════════════════════════════════════════════════════ */
const PICK_TXT = '<p class="opptxt">Only cards from the deck you pick will be recognized.</p>';
const S1 = ['done', 1, 'Pick your deck', 'Boros Blades · 60 cards'];
const S2 = ['done', 2, 'Choose game mode', 'Mirror my table'];
const S3 = ['done', 3, 'Connect your phone', 'Phone connected'];
const S4 = (body) => ['act', 4, 'Set up your table', body];
const lekMatta = (lek, grupper, w, extra = '') => `<div class="ky"><div class="dplate st">${pips(lek.f, 14)}<b>${lek.n}</b><span class="sep"></span><span class="n">${lek.meta}</span></div>
  ${rad(grp(...grupper[0], w))}${rad(...grupper.slice(1, -1).map(g => grp(...g, w)))}${rad(grp(...grupper[grupper.length - 1], w))}${extra}</div>`;
const LIBNOT = `<div class="mfot4"><span class="ic">${ic('deck', 14)}</span>These cards go into your library when you start playing.</div>`;

function g1() {
  gArt('G1Deck.dc.html', {
    panel: getReady({
      steg: [['act', 1, 'Pick your deck', `${PICK_TXT}<div class="lrs">${lekRad('boros', { radio: true, on: true, tag: 'Last used', andra: true })}${lekRad('golgari', { radio: true, andra: true })}${lekRad('elves', { radio: true, andra: true })}${lekRad('dimir', { radio: true, andra: true })}</div><p class="opptxt liten">The pencil opens a deck, so you can add, change or remove cards before you play.</p><div class="nydeck"><span class="btn">${ic('plus', 14, 2.4)}New deck</span></div>`], ['todo', 2, 'Choose game mode']],
      fot: fot('Use Boros Blades'),
    }),
    mat: lekMatta(LEK.boros, BOROS_SPEL, 84, LIBNOT),
  });
}
/* Ändra en lek man redan har, utan att lämna uppstarten. */
function g1b() {
  const kort = BOROS_ED[2][1].map(([k, c]) => k === 'anthem' ? [k, c, '', KORTTOOL] : [k, c]);
  const body = `<span class="vback">${ic('back', 13, 2.2)}Back to your decks</span>
    <div class="lrs">${lekRad('boros', { on: true })}</div>
    ${aTabs('type')}
    <div class="fld"><span class="ic">${ic('search', 15)}</span><span class="ph">Type a card name</span></div>
    <p class="lead2">Add cards here, or change and remove them on the right — the same page as in Your decks.</p>
    <div class="zr"><span class="zonlbl">Just added</span><i class="zl"></i></div>
    <div class="jr"><div class="th">${face('helix', 26)}</div><span class="grow">Lightning Helix <span class="dim">×4 · Main deck</span></span><span class="btn sm ghost">${ic('undo', 13, 2.2)}Undo</span></div>`;
  gArt('G1Edit.dc.html', {
    panel: getReady({ steg: [['act', 1, 'Pick your deck', body], ['todo', 2, 'Choose game mode']], fot: fot('Use Boros Blades (60 cards)', { hint: 'What you change is saved in Your decks too.' }) }),
    mat: `<div class="ky"><div class="dplate st">${pips('WR', 14)}<b>Boros Blades</b><span class="pen">${ic('pencil', 13)}</span><span class="sep"></span><span class="n">60 cards</span></div>
      ${rad(grp(...BOROS_ED[0], 84))}${rad(grp('Instants &amp; sorceries', BOROS_ED[1][1], 84), grp('Artifacts &amp; enchantments', kort, 84), grp(...BOROS_ED[3], 84))}${blSek({ plains: 8, mountain: 9 })}</div>`,
  });
}
function g2() {
  const body = `<span class="vback">${ic('back', 13, 2.2)}Back to your decks</span>
    ${aTabs('phone')}
    <div class="kort2" style="gap:12px"><div style="display:flex;align-items:center;gap:10px"><span class="led"></span><span style="font:12.5px var(--sans);color:var(--dim)">Phone connected for deck photos. They land in this deck.</span></div>
      <div class="fotorad chk"><span class="mph"><i style="left:6px"></i><i style="left:18px"></i><i style="left:30px"></i><i style="left:42px"></i></span><div class="ft"><b>Photo 1</b><span>24 cards added · 1 to check</span></div><span class="ok">${ic('check', 16, 2.4)}</span></div></div>
    ${CYK('Photo 2', 'Steps 2 and 3 start over for every photo.')}
    ${ps([['act', 2, 'Lay out the next cards', 'Move these aside and lay out the next ones the same way.'], ['todo', 3, 'Take the photo', 'Starts by itself when your phone opens the camera.']])}`;
  gArt('G2NewDeck.dc.html', {
    panel: getReady({ steg: [['act', 1, 'Pick your deck', body], ['todo', 2, 'Choose game mode']], fot: fot('Use this deck (24 cards)', { hint: 'It’s saved in Your decks too, for later games.' }) }),
    mat: `<div class="ky"><div class="dplate st"><b>New deck</b><span class="pen">${ic('pencil', 13)}</span><span class="sep"></span><span class="n">24 cards</span><span class="nychip">24 new from Photo 1</span></div>
      ${toCheck([tcFoto('phoenix', 'Arclight Phoenlx', 'Photo 1', 3)])}
      ${rad(grp(...NY1[0], 84))}${rad(grp(...NY1[1], 84), grp(...NY1[2], 84))}${blSek()}</div>`,
  });
}
function g3() {
  gArt('G3Mode.dc.html', {
    panel: getReady({ steg: [S1, ['act', 2, 'Choose game mode', LAGE4], ['todo', 3, 'Connect your phone', '', true], ['todo', 4, 'Set up your table', '', true]], fot: fot('Continue') }),
    mat: '',
  });
}
function g4() {
  const body = `<div class="qrrad">${qr(132, 5)}<div class="qv"><span class="oppwait"><i></i><span>Waiting for your phone…</span></span><span class="btn ghost sm">${ic('copy', 12)}Copy link</span></div></div>
    <p class="opptxt">Scan the code with your phone’s camera — nothing to install. Then put the phone in its holder, straight above your cards.</p>`;
  gArt('G4Phone.dc.html', {
    cam: 'vant',
    panel: getReady({ steg: [S1, S2, ['act', 3, 'Connect your phone', body], ['todo', 4, 'Set up your table']], fot: fot('Continue', { av: true }) }),
    mat: `<div class="oppmatt"><div class="oppmattbild"><div class="oppmattvant">${ic('phone', 34, 1.5)}<em>Step 3 of 4</em><b>Your phone’s picture shows up here</b><span>Scan the code on the left. When the phone is in its holder, you’ll see your table here.</span></div></div></div>`,
  });
}
function pg4() {
  phArt('PG4Light.dc.html', `<div class="cam"></div><div class="bordyta"></div>
  <div class="kamtopp"><span class="prick"></span><span class="kod">3JR3Q2</span><span class="grow"></span><span class="btn ghost sm" style="color:var(--txt)">Disconnect</span></div>
  <div class="kambot"><p class="ks">Learning the light — hold the phone still</p><p class="kfin">Takes a couple of seconds. The cards can stay.</p></div>`);
}
function g5() {
  const prov = `<p class="opptxt">Found it. How is it lying right now?</p>${tapval(0)}<p class="opptxt liten">Wrong card outlined? Move it a little.</p>`;
  gArt('G5Angle.dc.html', {
    cam: 'pa',
    panel: getReady({ steg: [S1, S2, S3, S4(`<div class="delar">${del(1, 'Card direction', 'active', '', '', prov)}${del(2, 'Graveyard', 'todo')}${del(3, 'Library', 'todo')}</div>`)], fot: fot('Continue') }),
    mat: pbild({ prov: 'hittat' }),
  });
}
function g5b() {
  const prov = `<p class="opptxt">Put one card from your deck on the table. Mesa only needs its size, so the spots come out as big as your cards. It won’t be played.</p><div class="opprad"><span class="oppwait ok"><i></i><span>Found it — card size saved</span></span></div>`;
  gArt('G5Size.dc.html', {
    cam: 'pa',
    panel: getReady({ steg: [S1, ['done', 2, 'Choose game mode', 'Use camera to add cards'], S3, S4(`<div class="delar">${del(1, 'Card size', 'active', '', '', prov)}${del(2, 'Graveyard', 'todo')}${del(3, 'Library', 'todo')}</div>`)], fot: fot('Continue') }),
    mat: pbild({ prov: 'hittat' }),
  });
}
function g6() {
  const grav = `<p class="opptxt"><b>Your graveyard goes here.</b> This is where you’ll put your cards when they go to the graveyard.</p><div class="opprad"><span class="btn sm">Move it</span></div>`;
  gArt('G6Grave.dc.html', {
    cam: 'pa',
    panel: getReady({ steg: [S1, S2, S3, S4(`<div class="delar">${del(1, 'Card direction', 'done', 'Untapped', 'Change')}${del(2, 'Graveyard', 'active', '', '', grav)}${del(3, 'Library', 'todo')}</div>`)], fot: fot('Looks good') }),
    mat: pbild({ prov: 'This card · not played', grav: 'glod' }),
  });
}
/* ════════════════════════════════════════════════════════════════════
   RAD F — library-platsens alla lägen (designytan "Mesa Library Drop",
   MES-139: 1 tom → 1b reserven efter 10 s → 2 något täcker → 3 kollar →
   4 pling → klart-kortet B)
   ════════════════════════════════════════════════════════════════════ */
const BIBGOR = `<ol class="gor"><li><span class="gnr">1</span><span>Pick up the card</span></li><li><span class="gnr">2</span><span>Shuffle it into your library</span></li><li><span class="gnr">3</span><span>Put your library face down on the spot</span></li></ol>`;
const KLAR4 = `<div class="klar4"><span class="ck">${OK.replace('width="12" height="12"', 'width="15" height="15"')}</span><div><b>Your table is set up</b><span>The camera knows where your graveyard and library are.</span></div></div>`;
const DEL12 = `${del(1, 'Card direction', 'done', 'Untapped', 'Change')}${del(2, 'Graveyard', 'done', 'Bottom-left corner', 'Move')}`;
function libArt(fil, { bib = '', bild, klar = false }) {
  const delar = klar
    ? `<div class="delar">${DEL12}${del(3, 'Library', 'done', 'In place')}</div>${KLAR4}`
    : `<div class="delar">${DEL12}${del(3, 'Library', 'active', '', '', bib)}</div>`;
  gArt(fil, {
    cam: 'pa',
    panel: getReady({ steg: [S1, S2, S3, S4(delar)], fot: fot(`Start playing${klar ? ic('arrow', 15, 2.4) : ''}`, { av: !klar }) }),
    mat: pbild(bild),
  });
}
const VANTAR = (kl, txt) => `<div class="opprad"><span class="oppwait${kl}"><i></i><span>${txt}</span></span></div>`;
function lib1() { libArt('L1Wait.dc.html', { bib: BIBGOR + VANTAR('', 'Waiting for your library…'), bild: { prov: 'Pick this card up', grav: 'ja', bib: 'vant' } }); }
function lib2() { libArt('L2Fallback.dc.html', { bib: BIBGOR + VANTAR('', 'Waiting for your library…') + `<div class="opprad"><span class="btn sm">My library is in place</span></div>`, bild: { grav: 'ja', bib: 'reserv' } }); }
function lib3() { libArt('L3Landed.dc.html', { bib: BIBGOR + VANTAR(' vit', 'Something is on the spot…'), bild: { grav: 'ja', bib: 'tackt' } }); }
function lib4() { libArt('L4Checking.dc.html', { bib: BIBGOR + VANTAR(' bla', 'Checking your library…'), bild: { grav: 'ja', bib: 'kollar' } }); }
function lib5() { libArt('L5Pling.dc.html', { klar: true, bild: { grav: 'ja', bib: 'pling' } }); }
function lib6() { libArt('L6Done.dc.html', { klar: true, bild: { grav: 'ja', bib: 'lagd', klar: true } }); }

/* ════════════════════════════════════════════════════════════════════
   RAD E — den som joinar via länk
   ════════════════════════════════════════════════════════════════════ */
function j1() {
  const dimir = [DIMIR[0], DIMIR[1], DIMIR[2]];
  gArt('J1Welcome.dc.html', {
    panel: getReady({
      vard: false, folk: FOLK_J,
      steg: [['act', 1, 'Pick your deck', `${PICK_TXT}<div class="lrs">${lekRad('dimir', { radio: true, on: true, tag: 'Last used', andra: true })}${lekRad('stompy', { radio: true, andra: true })}${lekRad('golgari', { radio: true, andra: true })}</div><p class="opptxt liten">The pencil opens a deck, so you can add, change or remove cards before you play.</p><div class="nydeck"><span class="btn">${ic('plus', 14, 2.4)}New deck</span></div>`], ['todo', 2, 'Choose game mode']],
      fot: fot('Use Blue-black flyers'),
    }),
    mat: lekMatta(LEK.dimir, dimir, 84, LIBNOT),
  });
}
function j2() {
  gArt('J2Mode.dc.html', {
    panel: getReady({ vard: false, folk: FOLK_J, steg: [['done', 1, 'Pick your deck', 'Blue-black flyers · 60 cards'], ['act', 2, 'Choose game mode', LAGE4], ['todo', 3, 'Connect your phone', '', true], ['todo', 4, 'Set up your table', '', true]], fot: fot('Continue') }),
    mat: '',
  });
}

/* ── bygg ───────────────────────────────────────────────────────────── */
h1(); h2(); h3(); h4();
n1(); n2(); n3(); n4(); n5(); n8(); pn2(); pn3(); pn4(); pn5();
n6(); n7();
g1(); g1b(); g2(); g3(); g4(); pg4(); g5(); g5b(); g6();
lib1(); lib2(); lib3(); lib4(); lib5(); lib6();
j1(); j2();

/* ── canvas.json: sida 4 ────────────────────────────────────────────── */
const X4 = i => i * 1540, D = { w: 1440, h: 900 }, PH = { w: 390, h: 844 }, P = 'page-4';
const ab = (y, filer) => filer.map(([file, title], i) => ({ file, title, x: X4(i), y, ...D, page: P }));
const tel = (i, y, file, title) => ({ file, title, x: X4(i) + 525, y, ...PH, page: P });
const YA = 0, YB = 1180, YBP = YB + 1020, YC = YBP + 844 + 156, YD = YC + 1180, YD2 = YD + 1020, YF = YD2 + 1060, YE = YF + 1180;
canvas.pages.push({ id: P, name: '4 · Decks & Get ready' });
canvas.artboards.push(
  ...ab(YA, [['H1Home.dc.html', 'H1 · Home: your games and your decks'], ['H2Deck.dc.html', 'H2 · A deck’s own page'],
    ['H3Edit.dc.html', 'H3 · Change or remove one card'], ['H4Select.dc.html', 'H4 · Several cards at once']]),
  ...ab(YB, [['N1Empty.dc.html', 'N1 · New deck, before the first card'], ['N2Connect.dc.html', 'N2 · Phone, step 1: connect'], ['N3LayOut.dc.html', 'N3 · Phone, step 2: lay out the cards'], ['N4Shoot.dc.html', 'N4 · Phone, step 3: take the photo'],
    ['N5Read.dc.html', 'N5 · The first photo is read'], ['N8Check.dc.html', 'N8 · Clicking Check on a card']]),
  tel(1, YBP, 'PN2Connected.dc.html', 'PN2 · Phone: connected'), tel(2, YBP, 'PN3LayOut.dc.html', 'PN3 · Phone: lay out the cards'),
  tel(3, YBP, 'PN4Camera.dc.html', 'PN4 · Phone: the camera'), tel(4, YBP, 'PN5Read.dc.html', 'PN5 · Phone: photo read'),
  ...ab(YC, [['N6Paste.dc.html', 'N6 · Paste a list'], ['N7Pasted.dc.html', 'N7 · The list is in']]),
  ...ab(YD, [['G1Deck.dc.html', 'G1 · Get ready: pick your deck'], ['G2NewDeck.dc.html', 'G2 · Get ready: a new deck'], ['G3Mode.dc.html', 'G3 · Get ready: choose game mode'], ['G4Phone.dc.html', 'G4 · Get ready: connect your phone'],
    ['G5Angle.dc.html', 'G5 · Set up your table: card direction'], ['G6Grave.dc.html', 'G6 · Set up your table: graveyard']]),
  { file: 'G1Edit.dc.html', title: 'G1′ · Changing a deck you already have', x: X4(0), y: YD2, ...D, page: P },
  tel(3, YD2, 'PG4Light.dc.html', 'PG4 · Phone: after scanning the code'),
  { file: 'G5Size.dc.html', title: 'G5′ · Use camera to add cards: card size, no tap question', x: X4(4), y: YD2, ...D, page: P },
  ...ab(YF, [['L1Wait.dc.html', 'L1 · Library: waiting for your deck'], ['L2Fallback.dc.html', 'L2 · Library: the fallback after 10 s'], ['L3Landed.dc.html', 'L3 · Library: something covers the spot'],
    ['L4Checking.dc.html', 'L4 · Library: checking — keep it still'], ['L5Pling.dc.html', 'L5 · Library in place'], ['L6Done.dc.html', 'L6 · Your table is set up']]),
  ...ab(YE, [['J1Welcome.dc.html', 'J1 · Joining by link: pick your deck'], ['J2Mode.dc.html', 'J2 · Joining by link: choose game mode']]),
);
const not = (id, y, text) => ({ id, x: -500, y, w: 420, text, page: P });
canvas.annotations.push(
  not('p4-a', YA, 'Sida 4 · Lekar före spel (punkt 1, 2)\n\nHome ersätter lobbyn: Your games och Your decks på samma sida. Lekarna har en vanlig New deck-knapp i rubriken (1).\n\nEn lek öppnas på en egen sida: sätten i panelen till vänster, korten till höger, ⋯ med Rename och Delete. Det är samma panel och samma kortyta som när en lek byggs i uppstarten (2, svar 2).\n\nKällraden "Came from" är borta ur alla bilder — den sa inget man behövde. I stället sköts korten på korten: H3 visar ett kort man pekar på (antal, Change card… om Mesa läst fel, Remove) med en ångra-remsa, och H4 flera markerade kort på en gång.\n\nMot sida 2: hyllan med omslag och den höga New deck-rutan är borta. Lekarna är rader, samma rad som i Pick your deck.'),
  not('p4-b', YB, 'Ny lek med telefonen (3, 5, 20)\n\nInnan första kortet: de tre sätten i panelen och ett lugnt tomläge i själva ytan, utan spökkort och utan en ruta ovanpå (3).\n\nStegen hör till ett foto i taget: brickan säger "Photo 1", och steg 2 och 3 börjar om för nästa foto (N5). Steg 2 slutar med "When they’re laid out, press Open the camera on your phone", och steg 3 börjar av sig själv när telefonen öppnar kameran (5).\n\nN8: klick på ett kort med Check öppnar samma tre svar som To check-raden — Yes, Change… eller Remove.\n\nUnder varje bild står telefonen med samma stegsiffror överst (20). PN2 är undantaget: den visar vad telefonen säger direkt efter att koden lästs av, medan datorn i N2 fortfarande väntar.'),
  not('p4-c', YC, 'Paste a list (4, svar 3)\n\nEtt stort fält och Read the list. Ingen kodvy och inga radnummer.\n\nKorten läggs in direkt, märkta New. Osäkra hamnar under To check, som ser ut precis som för ett foto: det som stod, en pil och förslaget. Rader som inte var kort sammanfattas på en rad.\n\nÅngra: knappen "Undo — remove all 43" i panelen tar bort hela listan igen. Enstaka kort ändras och tas bort på kortet, som i H3 och H4.'),
  not('p4-d', YD, 'Get ready for the game, värden (6–18)\n\nPanelen till vänster som i E, utan trängseln (11): rubriken, You’re the host (16), 1 Invite your friends med länken och vilka som joinat, inga platser (12), och 2 Get ready yourself i en luftig stepper (14). Koden står bara i headern (13). Nästa-knappen står alltid längst ner i panelen (18).\n\nPick your deck: en befintlig lek eller en ny med de tre sätten (9). En ny lek byggs i samma panel som på lekens sida (G2) och finns sedan i Your decks.\n\nPick your deck: pennan på en lekrad öppnar leken i steget, så att man kan ändra den utan att lämna uppstarten (G1′).\n\nChoose game mode visar inte leken, man går tillbaka via steg 1 (15). Lägena står under två rubriker: Hybrid modes (Mirror my table, Use camera to add cards) och Digital mode (Digital table) — det sista är ett val här, inte en knapp längst ner (10). Steg 3 och 4 finns bara i kameralägena (17): i G1 och G2, innan läget är valt, står bara två steg i steppern, och väljer man Without camera stannar det där.\n\nGraveyard och library visas först i steg 4, i telefonens bild (7). Mirror my table: tap-vinkeln först, så att platserna blir kortstora. Under G5 står Only add new cards, där kortet bara ger storleken (8, svar 1).\n\nLibrary-delen har en egen rad under (L1–L6).\n\nPick your deck: New deck är en vanlig knapp under lekarna. De tre sätten står inte i listan — de kommer när man tryckt på knappen (G2).'),
  not('p4-f', YF, 'Library: alla lägen (ur designytan "Mesa Library Drop", MES-139)\n\nSamma flöde som är byggt i appen, här i uppstartens panel till vänster:\n\nL1 tom — leken sänks ner på platsen, och panelen räknar upp de tre sakerna man gör.\nL2 efter tio sekunder — reserven "Can’t see your library? It’s in place" står också i bilden, inte bara i panelen.\nL3 något täcker platsen — hörnen fäster direkt, också med handen kvar: "Got it — let go of the deck".\nL4 handen är borta — ramen ritas runt medan leken ska ligga still: "Checking — keep it still".\nL5 pling — samma gröna ram och bock som när provkortet hittas, och Start playing tänds.\nL6 klart-kortet (variant B, den Jesper valde) ligger över bilden med högarna i ett hål.'),
  not('p4-e', YE, 'Den som joinar via länk (19)\n\nSamma panel, samma stepper och samma fot. Överst står "Welcome to Jesper’s game" och sedan "Get ready for the game". Listan visar vem som är värd och hur långt var och en kommit.'),
);
canvas.launch = { view: 'canvas', page: P };
writeFileSync(join(UT, 'canvas.json'), JSON.stringify(canvas, null, 2));
console.log('canvas.json med sida 4');

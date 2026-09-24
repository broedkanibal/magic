#!/usr/bin/env node
/* Provet för ritverktygets geometri (MES-286). Kör: node dev/golden/rita-prov.cjs
   Slutkod 1 om något faller. Ingen webbläsare, ingen server.

   Fallen är riktiga kort ur golden-fallen, ritade med rita.html (hörnen står
   här som andelar av bilden):
     04:s hög     två Plains och ett Swamp omlott. Det undre Plains visar bara
                  en kant av kortet men HELA namnraden — det är inte dolt, fast
                  facit i dag säger det
     14 Maul      Maul of the Skyclaves under Mirran Bardiche: bara hörnet med
                  manakostnaden sticker fram, namnraden är täckt — dolt
     14 Fencing   Fencing Ace ligger vriden ett kvarts varv — tappad mot
                  grundläget 'v', otappad mot 'h'
     svärdet      Valkyrie's Sword under Trusty Retriever (platsen där
                  Resistance Reunited ligger i 14): namnraden syns, fäst
                  föreslås, och ett fäst par är ingen hög
   Plus hörnen (dra ett hörn, lås storleken), filformatet, och kontrollen
   (rita-kontroll.cjs --fil) på tillfälliga filer: en ritning som stämmer ger
   0, en ändrad siffra, en token i kort[] eller fel antal i ett videoläge ger 1. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawnSync } = require('child_process');
const G = require('./rita-geometri.cjs'), Hd = require('./rita-handelser.cjs');
const ROT = path.join(__dirname, '..', '..');
const typer = JSON.parse(fs.readFileSync(path.join(__dirname, 'rita-typer.json'), 'utf8')).typer;

let fel = 0, n = 0;
function prova(namn, ok, detalj = '') {
  n++;
  if (ok) console.log(`  ✓ ${namn}`);
  else { fel++; console.log(`  ✗ ${namn}${detalj ? ' — ' + detalj : ''}`); }
}
const px = (W, H) => (x, y) => [x / W, y / H];

/* ── 04:s hög (1440 × 1080), hörnen som de ritades 2026-09-24 ───────────── */
console.log('04:s hög');
const W4 = 1440, H4 = 1080;
const hog04 = [
  { id: 1, namn: 'Plains', z: 1, horn: G.hornUrTva([0.5404, 0.4974], [0.6512, 0.5008], W4, H4) },
  { id: 2, namn: 'Swamp', z: 2, horn: G.hornUrTva([0.6575, 0.5101], [0.7718, 0.5143], W4, H4) },
  { id: 3, namn: 'Plains', z: 3, horn: G.hornUrTva([0.5316, 0.5395], [0.6433, 0.5155], W4, H4) },
];
const r04 = G.raknaKort(hog04, { W: W4, H: H4, grund: 'v' });
prova('det undre Plains är inte dolt (namnraden syns)', !r04[1].dold && r04[1].namnrad >= 0.5, JSON.stringify(r04[1]));
prova('…fast bara en liten del av kortet syns', r04[1].synlig < 0.3, 'synlig ' + r04[1].synlig);
prova('det övre Plains syns helt', r04[3].synlig === 1 && r04[3].namnrad === 1);
prova('Swamp är inte dolt', !r04[2].dold);
prova('alla tre i samma hög, A', r04[1].hog === 'A' && r04[2].hog === 'A' && r04[3].hog === 'A', JSON.stringify([r04[1].hog, r04[2].hog, r04[3].hog]));
prova('lådan är den synliga delen: det undre kortets låda är inte större än kortet', r04[1].w <= 0.1145 && r04[1].h <= 0.21);

/* ── 14 (1080 × 810, originalet 5712 × 4284 har samma form) ─────────────── */
console.log('14: Maul under Mirran Bardiche, Fencing Ace tappad');
const W14 = 1080, H14 = 810, p14 = px(W14, H14);
const kort14 = [
  { id: 1, namn: 'Maul of the Skyclaves', z: 1, horn: G.hornUrTva(p14(828, 495), p14(986, 498), W14, H14) },
  { id: 2, namn: 'Mirran Bardiche', z: 2, horn: G.hornUrTva(p14(806, 437), p14(948, 441), W14, H14) },
  { id: 3, namn: 'Fencing Ace', z: 3, horn: G.hornUrTva(p14(627, 14), p14(641, 160), W14, H14) },
];
const r14 = G.raknaKort(kort14, { W: W14, H: H14, grund: 'v' });
prova('Maul är dolt (namnraden täckt)', r14[1].dold && r14[1].namnrad < 0.5, JSON.stringify(r14[1]));
prova('…men en del av kortet syns', r14[1].synlig > 0.05, 'synlig ' + r14[1].synlig);
prova('Mirran Bardiche är inte dolt', !r14[2].dold);
prova('Fencing Ace är tappad mot grundläget v', r14[3].tappad, 'vinkel ' + G.vinkel(kort14[2].horn, W14, H14).toFixed(1));
prova('Mirran och Maul är inte tappade', !r14[1].tappad && !r14[2].tappad);
const r14h = G.raknaKort(kort14, { W: W14, H: H14, grund: 'h' });
prova('mot grundläget h är det tvärtom', !r14h[3].tappad && r14h[1].tappad);
prova('två equipment omlott föreslås inte som fäst', !Object.keys(G.fastForslag(kort14, W14, H14, typer)).length);

/* ── Svärdet under en varelse ───────────────────────────────────────────── */
console.log('svärdet under en varelse');
const par = [
  { id: 1, namn: "Valkyrie's Sword", z: 1, horn: G.hornUrTva(p14(566, 502), p14(711, 502), W14, H14) },
  { id: 2, namn: 'Trusty Retriever', z: 2, horn: G.hornUrTva(p14(563, 553), p14(716, 556), W14, H14) },
];
const rp = G.raknaKort(par, { W: W14, H: H14, grund: 'v' });
prova('svärdets namnrad syns — inte dolt', !rp[1].dold && rp[1].namnrad > 0.9, JSON.stringify(rp[1]));
prova('ofäst ligger de i en hög', rp[1].hog === 'A' && rp[2].hog === 'A');
const forslag = G.fastForslag(par, W14, H14, typer);
prova('fäst föreslås: svärdet vid Trusty Retriever', forslag[1] === 2, JSON.stringify(forslag));
par[0].fast = 2;
const rp2 = G.raknaKort(par, { W: W14, H: H14, grund: 'v' });
prova('ett fäst par är ingen hög', rp2[1].hog === null && rp2[2].hog === null);
prova('det fästa paret håller (ligger omlott)', !G.fastFel(par, W14, H14).length);
prova('fäst vid ett kort som inte ligger omlott är ett fel', G.fastFel([par[0], Object.assign({}, kort14[2], { id: 2 })], W14, H14).length === 1);

/* ── Hörnen ─────────────────────────────────────────────────────────────── */
console.log('hörnen');
const nara = (a, b, e = 1e-9) => a.every((p, i) => Math.abs(p[0] - b[i][0]) < e && Math.abs(p[1] - b[i][1]) < e);
const h0 = G.hornUrTva([0.3, 0.2], [0.42, 0.23], 1920, 1080);
prova('fyra hörn medsols, kortets form 63 × 88', Math.abs(Math.hypot((h0[3][0] - h0[0][0]) * 1920, (h0[3][1] - h0[0][1]) * 1080) / G.bredd(h0, 1920, 1080) - 88 / 63) < 1e-9);
prova('dra hörn 2 med hörn 0 kvar ger samma kort', nara(G.hornUrPar(2, h0[2], 0, h0[0], 1920, 1080), h0));
prova('dra hörn 1 med hörn 3 kvar ger samma kort', nara(G.hornUrPar(1, h0[1], 3, h0[3], 1920, 1080), h0));
const flyttad = G.hornUrPar(2, [h0[2][0] + 0.05, h0[2][1] + 0.02], 0, h0[0], 1920, 1080);
prova('hörn 0 står kvar när hörn 2 dras', nara([flyttad[0]], [h0[0]]));
const last = G.hornUrPar(2, [h0[2][0] + 0.05, h0[2][1] + 0.02], 0, h0[0], 1920, 1080, G.bredd(h0, 1920, 1080));
prova('låst storlek: kortet vrids men behåller bredden', Math.abs(G.bredd(last, 1920, 1080) - G.bredd(h0, 1920, 1080)) < 1e-6);
prova('vrid 90° fyra gånger är samma kort', nara(G.vrid(G.vrid(G.vrid(G.vrid(h0, 90, 1920, 1080), 90, 1920, 1080), 90, 1920, 1080), 90, 1920, 1080), h0, 1e-9));
const avsk = [{ id: 1, namn: 'Swamp', z: 1, horn: G.hornUrTva([0.95, 0.1], [1.05, 0.1], 1000, 1000) }];
prova('ett kort halvt utanför bilden är avskuret', G.raknaKort(avsk, { W: 1000, H: 1000 })[1].avskuret);

/* ── Filformatet ────────────────────────────────────────────────────────── */
console.log('filformatet');
const exempel = { id: 'x', ruta: { upp: 'v' }, kort: [{ namn: 'Plains', id: 1, tappad: false, horn: hog04[0].horn }], video: { handelser: [{ t: 1, spelar: 'Swamp' }] }, anteckning: 'a'.repeat(200) };
const text = G.formatera(exempel);
prova('formatera går att läsa tillbaka', JSON.stringify(JSON.parse(text)) === JSON.stringify(exempel));
prova('ett kort per rad', text.split('\n').filter(r => r.includes('"namn"')).length === 1 && text.includes('"horn": [['));

/* ── Kontrollen på tillfälliga filer ────────────────────────────────────── */
console.log('rita-kontroll.cjs --fil');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rita-prov-'));
const kor = fil => spawnSync(process.execPath, [path.join(__dirname, 'rita-kontroll.cjs'), '--fil', fil], { encoding: 'utf8', cwd: ROT });
function facitFor(kort, W, H, grund = 'v') {
  const r = G.raknaKort(kort, { W, H, grund });
  const post = k => { const d = r[k.id], o = { namn: k.namn, id: k.id }; if (d.dold) o.dold = true; if (d.x != null) Object.assign(o, { x: d.x, y: d.y, w: d.w, h: d.h }); Object.assign(o, { tappad: d.tappad, synlig: d.synlig, namnrad: d.namnrad }); if (d.hog) o.hog = d.hog; if (k.fast != null) o.fast = k.fast; o.z = k.z; o.horn = k.horn; return o; };
  const rund = kort.map(k => Object.assign({}, k, { horn: G.rundaHorn(k.horn) }));
  const r2 = G.raknaKort(rund, { W, H, grund });
  Object.assign(r, r2);
  return { id: 'prov', ruta: { upp: grund }, kort: rund.filter(k => G.arLekkort(k.namn)).map(post), avskurna: [], rita: { version: 1, bredd: W, hojd: H, lada: true, ovriga: rund.filter(k => !G.arLekkort(k.namn)).map(post) } };
}
const skriv = (namn, o) => { const d = path.join(tmp, namn); fs.mkdirSync(d, { recursive: true }); const f = path.join(d, 'facit.json'); fs.writeFileSync(f, G.formatera(o) + '\n'); return f; };
const bra = facitFor(hog04, W4, H4);
let k = kor(skriv('bra', bra));
prova('en ritning som stämmer ger slutkod 0', k.status === 0, k.stdout + k.stderr);
const andrad = JSON.parse(JSON.stringify(bra)); andrad.kort[0].namnrad = 0.3; andrad.kort[0].dold = true;
k = kor(skriv('andrad', andrad));
prova('en ändrad namnrad och dold ger slutkod 1', k.status === 1 && /namnrad/.test(k.stdout) && /dold/.test(k.stdout), k.stdout);
const token = JSON.parse(JSON.stringify(bra)); token.kort[1].namn = 'token Soldier';
k = kor(skriv('token', token));
prova('en token i kort[] ger slutkod 1', k.status === 1 && /token/.test(k.stdout), k.stdout);
const falskt = JSON.parse(JSON.stringify(bra)); falskt.kort[1].namn = 'Swampy';
k = kor(skriv('falskt', falskt));
prova('ett namn utanför lek.txt ger slutkod 1', k.status === 1 && /lek\.txt/.test(k.stdout), k.stdout);

/* Ett videoläge i passet 2026-09-22 vid 30,08 s: ett Swamp, otappat (tappas 30,62). */
const kallor = JSON.parse(fs.readFileSync(path.join(__dirname, 'rita-kallor.json'), 'utf8'));
const pass = kallor.videor['2026-09-22-1x-34cm-normaltempo'];
const u = Hd.underlag(pass, { handelser: fs.readFileSync(path.join(ROT, pass.handelser), 'utf8') }, []);
function lagenFor(kort, t) {
  const r = G.raknaKort(kort, { W: 1080, H: 610, grund: 'v' });
  return { kalla: '2026-09-22-1x-34cm-normaltempo', bredd: 1080, hojd: 610, grund: 'v', lagen: [{ nr: 1, t, forslag: t, klar: true, handelser: u.mellan(-1, t),
    kort: kort.map(k => { const d = r[k.id], o = { namn: k.namn, id: k.id }; if (d.x != null) Object.assign(o, { x: d.x, y: d.y, w: d.w, h: d.h }); return Object.assign(o, { tappad: d.tappad, synlig: d.synlig, namnrad: d.namnrad, z: k.z, horn: k.horn }); }) }] };
}
const swamp = { id: 1, namn: 'Swamp', z: 1, horn: G.rundaHorn(G.hornUrTva([0.5, 0.6], [0.6, 0.6], 1080, 610)) };
const lf = path.join(tmp, 'lagen-bra.json');
fs.writeFileSync(lf, G.formatera(lagenFor([swamp], 30.08)));
k = kor(lf);
prova('videoläget med ett otappat Swamp vid 30,08 s stämmer', k.status === 0, k.stdout + k.stderr);
const tva = Object.assign({}, swamp, { id: 2, z: 2, horn: G.rundaHorn(G.hornUrTva([0.2, 0.2], [0.3, 0.2], 1080, 610)) });
fs.writeFileSync(lf, G.formatera(lagenFor([swamp, tva], 30.08)));
k = kor(lf);
prova('två Swamp där facit säger ett ger slutkod 1', k.status === 1 && /Swamp: 2 ritade, 1 enligt facit/.test(k.stdout), k.stdout);
const tappat = Object.assign({}, swamp, { horn: G.rundaHorn(G.hornUrTva([0.5, 0.6], [0.5, 0.75], 1080, 610)) });
fs.writeFileSync(lf, G.formatera(lagenFor([tappat], 30.08)));
k = kor(lf);
prova('ett tappat Swamp innan facit tappar det ger slutkod 1', k.status === 1 && /tappade/.test(k.stdout), k.stdout);
fs.rmSync(tmp, { recursive: true, force: true });

console.log(fel ? `\n${fel} av ${n} föll.` : `\nalla ${n} höll.`);
process.exitCode = fel ? 1 : 0;

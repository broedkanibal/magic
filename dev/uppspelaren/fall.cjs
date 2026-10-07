/* Uppspelarens fall (MES-333): var bordsloggen, facit och bilden kommer
   ifrån, i ett format. .cjs eftersom package.json säger "type": "module".

   Ett fall: { id, namn, slag, rader (bordsloggen: { s, fas, nollstall,
   grund, grav, spar, bib? }), facit (händelser: { t, typ, kort, till }),
   fran, till (sekunder), upplosning ({w,h}, kamerabildens mått), lek,
   media (för visaren), anm }.

   Underlaget är fryst i dev/uppspelaren/underlag/ där det annars kan ändras
   under fötterna: golden-fallens bordslogg (ur dev/golden/senaste.json,
   som skrivs om varje gång golden sparas) och v2-facit för partiet
   2026-09-21 (otrackat i huvudträdet när uppspelaren byggdes), och
   partiets bordslogg genom kedjan med sitt händelsefacit (p0921k). Passet
   2026-09-22 läses ur dev/material (utanför git, ändras inte). */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROT = path.join(__dirname, '..', '..');
const UNDERLAG = path.join(__dirname, 'underlag');

/* ── golden 07, 09–12: telefonens riktiga bordslogg ur videokörningen ── */
const GOLDEN = ['07', '09', '10', '11', '12'];
let goldenCache = null;
function goldenUnderlag() {
  if (!goldenCache) goldenCache = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(UNDERLAG, 'golden-bordlogg.json.gz'))).toString('utf8'));
  return goldenCache;
}
const storlek = s => { const m = /(\d+)\s*[×x]\s*(\d+)/.exec(String(s || '')); return m ? { w: +m[1], h: +m[2] } : null; };
function golden(nr) {
  const U = goldenUnderlag();
  const id = Object.keys(U.fall).find(k => k.startsWith(nr + '-'));
  if (!id) throw new Error(`golden ${nr} finns inte i underlaget`);
  const g = U.fall[id];
  const facitFil = path.join(ROT, 'dev', 'golden', 'fall', id, 'facit.json');
  const F = JSON.parse(fs.readFileSync(facitFil, 'utf8'));
  const v = F.video || {};
  const facit = (v.handelser || []).map(h => {
    const typ = ['spelar', 'tar_bort', 'tappar', 'otappar', 'flyttar'].find(k => h[k]);
    return { t: h.t, typ, kort: h[typ], till: h.till || null };
  }).filter(h => h.typ);
  const rader = g.bordLogg;
  const sista = rader[rader.length - 1].s;
  return {
    id: 'g' + nr, namn: `golden ${id}`, slag: 'golden', kalla: `underlag/golden-bordlogg.json.gz (${U.commit})`,
    rader, facit, fran: 0, till: +(sista + Math.max(3.5, v.svans_s || 5)).toFixed(2),
    upplosning: storlek(g.kallStorlek) || { w: g.aw, h: g.ah }, lek: null,
    media: { slag: 'video', fil: path.posix.join('dev/golden/fall', id, 'video.mp4') },
    anm: 'telefonens bordslogg ur golden-körningen (kor.html), utan Claude'
  };
}

/* ── passet 2026-09-22: telefonens kedja utan Claude, körd 2026-10-04 ── */
const PASS0922 = path.join(ROT, 'dev', 'material', 'arbete', '2026-10-04-hogarna-matning', 'baslinje', 'spegel-lokal.json');
function lasHandelserTsv(fil) {
  const rader = fs.readFileSync(fil, 'utf8').split('\n').filter(r => r.trim());
  const rub = rader[0].split('\t'), i = k => rub.indexOf(k);
  const tom = v => v == null || v === '' || v === '-' ? null : v;
  return rader.slice(1).map(r => { const c = r.split('\t'); return { t: +c[i('t')], typ: c[i('handelse')], kort: tom(c[i('kort')]), till: tom(c[i('till')]), plats: tom(c[i('plats')]) }; });
}
/* passens: bara de 28 namnen före raden "# golden 17" — leken partiet
   2026-09-21 spelades med (p0921k). Utan: hela filen, som förut. */
function lekTxt(passens) {
  const ut = [];
  for (const r of fs.readFileSync(path.join(ROT, 'dev', 'golden', 'lek.txt'), 'utf8').split('\n')) {
    const s = r.trim();
    if (passens && /^#\s*golden 17\b/i.test(s)) break;
    if (!s || s.startsWith('#')) continue;
    const x = s.match(/^(\d+)\s+(.+)$/);
    /* Set och samlarnummer ("Soldier (TFRC) 3", "(SLD) 1234★") är inte en del
       av namnet — samma svans som appens lekRad och golden-sidans kor.html tar bort. */
    const namn = (x ? x[2] : s).replace(/\s*\((?:[A-Za-z0-9]{2,6})\)\s*[A-Za-z0-9\-★]*\s*$/, '').trim();
    ut.push({ name: namn, n: x ? +x[1] : 1 });
  }
  return ut;
}
function pass0922() {
  if (!fs.existsSync(PASS0922)) throw new Error(`underlaget saknas: ${path.relative(ROT, PASS0922)} (dev/material, finns bara på Jespers Mac — symlänka dev/material i en worktree)`);
  const R = JSON.parse(fs.readFileSync(PASS0922, 'utf8'));
  const rader = R.resultat.bordLogg;
  const facit = lasHandelserTsv(path.join(ROT, 'dev', 'golden', 'inspelningar', '2026-09-22-1x-34cm-normaltempo', 'handelser.tsv'))
    .filter(h => ['spelar', 'grav_till_bord', 'tar_bort', 'tappar', 'otappar', 'flyttar'].includes(h.typ));
  const ark = path.join(ROT, 'dev', 'material', 'arbete', '2026-10-04-hogarna-matning', 'a1b', 'ark');
  const stilla = fs.existsSync(ark) ? fs.readdirSync(ark).map(f => { const m = /^(?:s1|g\d)_(\d+(?:\.\d+)?)\.jpg$/.exec(f); return m ? { s: +m[1], fil: path.posix.join('dev/material/arbete/2026-10-04-hogarna-matning/a1b/ark', f) } : null; }).filter(Boolean).sort((a, b) => a.s - b.s) : [];
  return {
    id: 'p0922', namn: 'passet 2026-09-22 (1x, 34 cm, normaltempo)', slag: 'pass', kalla: path.relative(ROT, PASS0922) + ` (körd ${String(R.skapad).slice(0, 10)}, poolen ${R.pool}, ${R.ai ? 'med' : 'utan'} Claude)`,
    rader, facit, fran: 0, till: +(rader[rader.length - 1].s + 3.5).toFixed(2),
    upplosning: storlek(R.resultat.kallStorlek) || { w: 1080, h: 610 }, lek: lekTxt(),
    media: { slag: 'stillbilder', bilder: stilla },
    anm: 'telefonens bordslogg ur dev/spegelfacit/kor.cjs på passets video (videon ligger på Google Drive), utan Claude'
  };
}

/* ── partiet 2026-09-21: v2-facit som en idealiserad telefon ──────────
   Det här fallet är facit, inte telefonen; partiet genom kedjan är p0921k
   nedan. v2-facit beskriver varje kort i var
   tionde sekund 240–540: mitten i procent av kamerabilden (705 × 438),
   upprätt/tappad, hög och synlighet. Här blir varje sådan ruta ETT bord
   från en telefon som ser allt rätt: ett klart, säkert spår per kort, med
   kortets mitt och en låda i den storlek ett kort har på den platsen i
   bilden. Spåren kopplas mellan rutorna på närmaste kort (högst 80 px).
   Namnen är påhittade ("Kort 01" …), ett per spår: facit har inga namn per
   rad, och måtten här (avstånd, omlott, kanten) behöver dem inte.
   DET HÄR ÄR FACIT, INTE TELEFONEN. */
const BILD = { w: 705, h: 438 };
/* Kortets bredd i bilden (px) efter var det ligger, uppmätt för hand i
   rutorna 240 och 450: ~98 px i övre raden (y 27 %), ~105 px i nedre
   (y 75 %). Höjden 1,43 × bredden (övre raden, 98 × 140 px). Kameran ser
   alltså bordet nästan rakt uppifrån — perspektivet är ~7 %. */
const kortB = y => 98 + 14.6 * (y - 0.27) / 1;   // px, y i bildandelar
const KORT_HB = 1.43;
function lasV2(fil) {
  const rader = fs.readFileSync(fil, 'utf8').split('\n').filter(r => r.trim());
  const ut = new Map();
  for (const r of rader.slice(1)) {
    const c = r.split('\t'); const ruta = +c[0];
    if (!ut.has(ruta)) ut.set(ruta, { ruta, kort: [], digitalt: null, hand: null, grav: null });
    const q = ut.get(ruta);
    if (c[2] === '-') {
      const k = c[7] || '';
      if (k.startsWith('digitalt:')) q.digitalt = k; else if (k.startsWith('hand:')) q.hand = /ja/.test(k); else if (k.startsWith('graveyard')) q.grav = k;
      continue;
    }
    q.kort.push({ x: +c[2] / 100, y: +c[3] / 100, lage: c[4], hog: c[5], synligt: c[6], anm: c[7] || '' });
  }
  return [...ut.values()].sort((a, b) => a.ruta - b.ruta);
}
function parti0921() {
  const fil = path.join(UNDERLAG, '2026-09-21-v2-tabell.tsv');
  const rutor = lasV2(fil);
  let nasta = 1, forra = [];
  const rader = [];
  for (const q of rutor) {
    /* Koppla till förra rutans spår: närmast först, högst 80 px. */
    const par = [];
    q.kort.forEach((k, i) => forra.forEach((f, j) => { const d = Math.hypot((k.x - f.x) * BILD.w, (k.y - f.y) * BILD.h); if (d <= 80) par.push([d, i, j]); }));
    par.sort((a, b) => a[0] - b[0]);
    const tagI = new Set(), tagJ = new Set();
    for (const [, i, j] of par) { if (tagI.has(i) || tagJ.has(j)) continue; tagI.add(i); tagJ.add(j); q.kort[i].id = forra[j].id; q.kort[i].tappadFore = forra[j].tappad; }
    for (const k of q.kort) if (k.id == null) k.id = nasta++;
    for (const k of q.kort) k.tappad = k.lage === 'tappad' ? true : k.lage === 'upprätt' ? false : !!k.tappadFore;   // osäker: som förut
    forra = q.kort;
    const spar = q.kort.map(k => {
      const bw = kortB(k.y), bh = bw * KORT_HB;
      const w = (k.tappad ? bh : bw) / BILD.w, h = (k.tappad ? bw : bh) / BILD.h;
      return { id: k.id, tillstand: 'klar', namn: 'Kort ' + String(k.id).padStart(2, '0'), saker: true, sen: 0, stilla: true, kortlik: true, vilar: true, skymd: false,
               tappad: k.tappad, varfor: 'facit', x: +(k.x - w / 2).toFixed(4), y: +(k.y - h / 2).toFixed(4), w: +w.toFixed(4), h: +h.toFixed(4), vx: k.x, vy: k.y };
    });
    rader.push({ s: q.ruta, fas: 'kort', nollstall: false, grund: 90, grav: null, spar });
  }
  const rutorMapp = path.join(ROT, 'dev', 'material', 'arbete', '2026-10-04-hogarna-matning', 'a1a');
  const fin = fs.existsSync(path.join(rutorMapp, 'fin')) ? fs.readdirSync(path.join(rutorMapp, 'fin')).map(f => { const m = /^g-(\d+\.\d+)\.jpg$/.exec(f); return m ? +m[1] : null; }).filter(v => v != null).sort((a, b) => a - b) : [];
  return {
    id: 'p0921', namn: 'partiet 2026-09-21, sek 240–540 — FACIT SOM IDEAL TELEFON', slag: 'facit', kalla: 'underlag/2026-09-21-v2-tabell.tsv (v2-facit, var 10:e sekund)',
    rader, facit: [], fran: 238, till: 545, upplosning: BILD, lek: null,
    ogonblick: rutor.map(q => ({ s: q.ruta + 2.5, namn: String(q.ruta) })),
    v2: rutor.map(q => ({ ruta: q.ruta, kort: q.kort.map(k => ({ id: k.id, x: k.x, y: k.y, hog: k.hog, tappad: k.tappad, synligt: k.synligt })) })),
    media: { slag: 'rutor', mapp: 'dev/material/arbete/2026-10-04-hogarna-matning/a1a', sek: [0, 1206], fin },
    anm: 'v2-facit matat som en idealiserad telefon (ett klart spår per kort, rutan var 10:e sekund) — inte telefonens ström; den finns inte för partiet'
  };
}
/* ── partiet 2026-09-21 genom telefonens kedja (p0921k) ──────────────
   Kamerabilden ur skärminspelningen dator.mov (Mesas kamerapanel, 704 ×
   438, samma utsnitt som rutor/kam-NNN.jpg och v2-facit), sek 180–540,
   genom dev/spegelfacit/kor.cjs utan Claude 2026-10-07. Bordsloggen är fryst
   i underlag/2026-09-21-kedja-bordlogg.json.gz; tiderna här är partiets
   (videons + 180). Facit: underlag/2026-09-21-handelser.tsv (ur
   handelser.tsv, platser.tsv, hogar-handelser.tsv och rutorna, se
   LÄS-MIG.md), med kortets läge i bilden per rad.

   Mätningen börjar 230 s (matFran): det som föddes på mattan före dess är
   uppstarten — kedjan startar kall vid 180 med åtta kort på bordet — och
   räknas inte som nya kort, platshållare eller rörelser. v2-rutorna jämförs
   med mattan 1 s efter rutan: facit-kortet paras med telefonens spår på
   samma plats i bilden (högst 60 px, närmast först), och spåret med kortet
   på mattan (c.spar). Ett facit-kort utan spår där, eller vars spår inget
   kort har på mattan, räknas som saknat. */
const KEDJA_START = 180, KEDJA_MATT = 230, KEDJA_PAR_PX = 60;
function lasHandelser0921() {
  const fil = path.join(UNDERLAG, '2026-09-21-handelser.tsv');
  const rader = fs.readFileSync(fil, 'utf8').split('\n').filter(r => r.trim());
  const rub = rader[0].split('\t'), i = k => rub.indexOf(k);
  const tom = v => v == null || v === '' || v === '-' ? null : v;
  return rader.slice(1).map(r => { const c = r.split('\t'); return { t: +c[i('t')], typ: c[i('handelse')], kort: tom(c[i('kort')]), till: tom(c[i('till')]), plats: tom(c[i('plats')]), osaker: tom(c[i('osaker')]), x: +c[i('x')] / 100, y: +c[i('y')] / 100 }; });
}
let kedjaCache = null;
function parti0921k() {
  const fil = path.join(UNDERLAG, '2026-09-21-kedja-bordlogg.json.gz');
  if (!fs.existsSync(fil)) throw new Error('underlaget saknas: ' + path.relative(ROT, fil));
  if (!kedjaCache) kedjaCache = JSON.parse(zlib.gunzipSync(fs.readFileSync(fil)).toString('utf8'));
  const K = kedjaCache;
  if (K.start !== KEDJA_START) throw new Error(`bordsloggen börjar ${K.start} s i partiets tid, väntade ${KEDJA_START}`);
  const rader = K.bordLogg.map(r => Object.assign({}, r, { s: +(r.s + K.start).toFixed(2) }));
  const facit = lasHandelser0921().filter(h => ['spelar', 'grav_till_bord', 'tar_bort', 'tappar', 'otappar', 'flyttar'].includes(h.typ));
  const sista = rader[rader.length - 1].s;
  /* v2 var tionde sekund, parat med telefonens spår på samma plats i bilden. */
  const rutor = lasV2(path.join(UNDERLAG, '2026-09-21-v2-tabell.tsv'));
  const B = K.upplosning || { w: 704, h: 438 };
  const bordVid = s => { let b = null; for (const r of rader) { if (r.s <= s + 1e-6) b = r; else break; } return b; };
  let lost = -1;
  const v2 = rutor.map(q => {
    const s = q.ruta + 1, b = bordVid(s), spar = ((b && b.spar) || []).map(t => ({ id: t.id, x: t.vx != null ? t.vx : t.x + t.w / 2, y: t.vy != null ? t.vy : t.y + t.h / 2 }));
    const par = [];
    q.kort.forEach((k, i) => spar.forEach((t, j) => { const d = Math.hypot((k.x - t.x) * B.w, (k.y - t.y) * B.h); if (d <= KEDJA_PAR_PX) par.push([d, i, j]); }));
    par.sort((a, b) => a[0] - b[0]);
    const ti = new Set(), tj = new Set(), id = new Map();
    for (const [, i, j] of par) { if (ti.has(i) || tj.has(j)) continue; ti.add(i); tj.add(j); id.set(i, spar[j].id); }
    return { ruta: q.ruta, kort: q.kort.map((k, i) => ({ id: id.has(i) ? id.get(i) : lost--, x: k.x, y: k.y, hog: k.hog, tappad: k.lage === 'tappad', synligt: k.synligt })) };
  });
  const rutorMapp = path.join(ROT, 'dev', 'material', 'arbete', '2026-10-04-hogarna-matning', 'a1a');
  const fin = fs.existsSync(path.join(rutorMapp, 'fin')) ? fs.readdirSync(path.join(rutorMapp, 'fin')).map(f => { const m = /^g-(\d+\.\d+)\.jpg$/.exec(f); return m ? +m[1] : null; }).filter(v => v != null).sort((a, b) => a - b) : [];
  return {
    id: 'p0921k', namn: 'partiet 2026-09-21, sek 230–540 — telefonens kedja på skärminspelningens kamerabild', slag: 'kedja',
    kalla: `underlag/2026-09-21-kedja-bordlogg.json.gz (${K.kalla}, ${K.skapad.slice(0, 10)}, poolen ${K.pool}, utan Claude)`,
    rader, facit, fran: KEDJA_START, matFran: KEDJA_MATT, till: +Math.min(sista + 3.5, 550).toFixed(2), upplosning: B,
    lek: lekTxt(true),
    ogonblick: v2.map(q => ({ s: q.ruta + 1, namn: String(q.ruta) })), v2,
    media: { slag: 'rutor', mapp: 'dev/material/arbete/2026-10-04-hogarna-matning/a1a', sek: [0, 1206], fin },
    anm: 'kamerabilden ur skärminspelningen (704 × 438, Mesas ramar i bilden) genom kedjan utan Claude — inte telefonens egen ström i 4K; mätningen börjar 230 s'
  };
}

/* Avståndet på bordet mellan två facit-kort, i kortbredder: bildavståndet
   delat med kortbredden där korten ligger (medel av de två). */
function bordAvstand(a, b) {
  const d = Math.hypot((a.x - b.x) * BILD.w, (a.y - b.y) * BILD.h);
  return d / ((kortB(a.y) + kortB(b.y)) / 2);
}

/* Kortets ruta på bordet i bildens pixlar (för omlott): mitten, och ett
   kort i den storlek det har där i bilden, vridet om det är tappat. */
function bordRekt(a) {
  const bw = kortB(a.y), bh = bw * KORT_HB, w = a.tappad ? bh : bw, h = a.tappad ? bw : bh;
  return { x: a.x * BILD.w - w / 2, y: a.y * BILD.h - h / 2, w, h };
}

const ALLA = ['g07', 'g09', 'g10', 'g11', 'g12', 'p0922', 'p0921', 'p0921k'];
function lasFall(id) {
  if (/^g\d\d$/.test(id)) return golden(id.slice(1));
  if (id === 'p0922') return pass0922();
  if (id === 'p0921') return parti0921();
  if (id === 'p0921k') return parti0921k();
  throw new Error('okänt fall ' + id + ' (finns: ' + ALLA.join(', ') + ')');
}
module.exports = { ALLA, lasFall, bordAvstand, bordRekt, ROT };

/* Händelsefacit för ritverktygets videolägen (MES-286). Mätverktyg, inte appkod.

   Samma fil läses av rita.html och av node (rita-kontroll.cjs), som
   rita-geometri.cjs. Den svarar på tre frågor per video:
     1. Vilka lägen föreslås — när står bordet stilla efter en händelse?
     2. Vilka händelser hände mellan två lägen (visas bredvid bilden)?
     3. Vad SKA ligga på bordet i ett läge — antal kort per namn, och i
        passet också tappade per namn och vilka kort som är fästa?

   Två sorters källor:
     handelser  passet 2026-09-22: handelser.tsv, granskat av Jesper. Tiden
                är där meningen börjar, alltså strax efter att handen
                släppte. Läget föreslås 2 s efter.
     steg+manus MES-246: facit-slapp.json (66 steg ur rörelsen, t_stilla per
                steg, namnet på nedläggningarna) och kort.txt (Jespers manus,
                53 handlingar i ordning). Stegen och manusraderna är inte
                parade i förväg; nedläggningarna med namn blir ankare, och
                mellan två ankare godtas läget efter vilken manusrad som
                helst i fönstret. Tap räknas inte här ("tappa hög A" säger
                inte vilka kort som ligger i högen). */
(function (rot) {
'use strict';

const TILL_BORDET = new Set(['spelar', 'grav_till_bord']);
const FRAN_BORDET = new Set(['tar_bort']);
const PA_BORDET = new Set(['spelar', 'grav_till_bord', 'tappar', 'otappar', 'flyttar', 'tar_bort']);
const EFTER_S = 2;        // passet: läget föreslås så långt efter händelsen
const KLUMP_S = 2.5;      // händelser tätare än så får ett gemensamt läge

const sant = v => v != null && v !== '' && v !== '-';

/* ── Passet: handelser.tsv ───────────────────────────────────────────── */
function lasTsv(text) {
  const rader = String(text).split(/\r?\n/).filter(r => r.trim());
  const huvud = rader.shift().split('\t');
  return rader.map((r, nr) => {
    const f = r.split('\t'), o = { nr: nr + 1 };
    huvud.forEach((h, i) => { o[h] = f[i] == null ? '' : f[i]; });
    o.t = +o.t;
    return o;
  }).filter(o => Number.isFinite(o.t)).sort((a, b) => a.t - b.t || a.nr - b.nr);
}
/* Ett läge per klump av händelser på bordet, 2 s efter den sista — men
   aldrig efter nästa klumps första händelse. `slut` blir ett eget läge på
   sin egen tid (sista rutan före Kontrollcenter). */
function forslagPass(rader) {
  const bord = rader.filter(r => PA_BORDET.has(r.handelse));
  const klumpar = [];
  for (const r of bord) {
    const sist = klumpar[klumpar.length - 1];
    if (sist && r.t - sist[sist.length - 1].t < KLUMP_S) sist.push(r); else klumpar.push([r]);
  }
  const ut = klumpar.map((k, i) => {
    const nasta = klumpar[i + 1];
    let t = k[k.length - 1].t + EFTER_S;
    if (nasta && t > nasta[0].t - 0.3) t = Math.max(k[k.length - 1].t + 0.3, nasta[0].t - 0.3);
    return { t: +t.toFixed(2), etikett: k.map(r => `${r.handelse} ${sant(r.kort) ? r.kort : ''}`.trim()).join(' · ') };
  });
  const slut = rader.find(r => r.handelse === 'slut');
  if (slut && (!ut.length || ut[ut.length - 1].t < slut.t)) ut.push({ t: slut.t, etikett: 'slut' });
  return ut;
}
/* Vad som ska ligga på bordet vid tiden t: händelser med tid ≤ t. */
function vantatPass(rader, t) {
  const antal = {}, tappade = {}, till = {};
  for (const r of rader) {
    if (r.t > t + 1e-6) break;
    const n = r.kort;
    if (!sant(n)) continue;
    if (TILL_BORDET.has(r.handelse)) {
      antal[n] = (antal[n] || 0) + 1;
      till[n] = sant(r.till) ? r.till : null;
    } else if (FRAN_BORDET.has(r.handelse)) {
      antal[n] = Math.max(0, (antal[n] || 0) - 1);
      if (!antal[n]) { delete antal[n]; delete till[n]; }
      if (tappade[n] > (antal[n] || 0)) tappade[n] = antal[n] || 0;
    } else if (r.handelse === 'tappar') tappade[n] = Math.min((tappade[n] || 0) + 1, antal[n] || 0);
    else if (r.handelse === 'otappar') tappade[n] = Math.max(0, (tappade[n] || 0) - 1);
    else if (r.handelse === 'flyttar') till[n] = sant(r.till) ? r.till : null;
  }
  for (const n of Object.keys(tappade)) if (!tappade[n]) delete tappade[n];
  /* Fästa par: ett kort vars senaste spelar/flyttar har ett kort i till, och
     båda ligger på bordet. Paret är oordnat — i passet står till ibland på
     varelsen ("Ukud Cobra till Mirran Bardiche" när de byter plats). */
  const par = new Map();
  for (const [n, v] of Object.entries(till)) {
    if (!v || !antal[n] || !antal[v]) continue;
    const nyckel = [n, v].sort().join(' + ');
    par.set(nyckel, [n, v].sort());
  }
  return { antal, tappade, fast: [...par.values()] };
}

/* ── MES-246: facit-slapp.json + kort.txt ──────────────────────────────── */
function forslagSteg(steg) {
  return steg.map(s => ({ t: +(+s.t_stilla).toFixed(2), steg: s.nr,
    etikett: `steg ${s.nr}: ${s.dom}${s.namn ? ' — ' + s.namn : ''}` }));
}
/* Manuset rad för rad, med vad raden gör med korten på bordet:
   plus/minus = namnet kommer till/lämnar bordet, fast = [kort, värd]. */
function lasManus(text, leknamn) {
  const lek = new Set(leknamn || []);
  const ut = [];
  let tur = null;
  for (const r0 of String(text).split(/\r?\n/)) {
    const r = r0.trim();
    if (!r) continue;
    const mtur = /^#\s*-+\s*(Tur \d+)/.exec(r);
    if (mtur) { tur = mtur[1]; continue; }
    if (r.startsWith('#')) continue;
    const o = { nr: ut.length + 1, text: r, tur, plus: null, minus: null, fast: null };
    let m;
    if (/^(untappa|tappa)\s/.test(r) || /^mill \d+$/.test(r)) { /* inget på bordet ändras i antal */ }
    else if ((m = /^flytta (.+) till (.+)$/.exec(r))) o.fast = [m[1].trim(), m[2].trim()];
    else if ((m = /^bort (.+)$/.exec(r))) o.minus = m[1].trim();
    else if ((m = /^(.+) från graveyard till spel$/.exec(r))) o.plus = m[1].trim();
    else if (/^(.+) från graveyard till (handen|exile)$/.test(r)) { /* graveyard, inte bordet */ }
    else if ((m = /^(.+) (till graveyard|till handen|överst i library)$/.exec(r))) o.minus = m[1].trim();
    else if ((m = /^token (\S+)/.exec(r))) o.plus = 'token ' + m[1];
    else if ((m = /^(.+) på (.+)$/.exec(r)) && (!lek.size || lek.has(m[1].trim()))) { o.plus = m[1].trim(); o.fast = [m[1].trim(), m[2].trim()]; }
    else if ((m = /^(.+) hög [A-Z]$/.exec(r))) o.plus = m[1].trim();
    else if ((m = /^(.+) tappad$/.exec(r))) o.plus = m[1].trim();
    else if (!lek.size || lek.has(r)) o.plus = r;
    else continue;   // en rad som inte är en handling (t.ex. "Filmat liggande …")
    ut.push(o);
  }
  return ut;
}
/* Antal per namn efter varje manusrad: tillstand[i] = efter rad i (−1 = före första). */
function manusTillstand(manus) {
  const lista = [];
  let antal = {};
  const spara = () => lista.push(Object.assign({}, antal));
  for (const r of manus) {
    antal = Object.assign({}, antal);
    if (r.plus) antal[r.plus] = (antal[r.plus] || 0) + 1;
    if (r.minus && antal[r.minus]) { antal[r.minus]--; if (!antal[r.minus]) delete antal[r.minus]; }
    spara();
  }
  return lista;
}
/* Nedläggningar med namn blir ankare: steget = nästa manusrad som lägger
   ut det namnet. Svaret: steg-nr → manusradens index. */
function ankare(steg, manus) {
  const ut = {};
  let pek = 0;
  for (const s of steg) {
    if (!s.nedlaggning || !s.namn) continue;
    const i = manus.findIndex((r, k) => k >= pek && r.plus === s.namn);
    if (i < 0) continue;
    ut[s.nr] = i; pek = i + 1;
  }
  return ut;
}
/* Vilka manusrader kan läget vid tiden t stå efter? Ett ankarsteg är exakt
   sin rad; mellan två ankare vilken rad som helst från förra ankaret till
   raden före nästa. Svaret: [från, till] som index i manus (−1 = inget gjort). */
function fonsterSteg(steg, manus, ank, t) {
  const klara = steg.filter(s => +s.t_stilla <= t + 0.05);
  const sista = klara[klara.length - 1];
  const fore = klara.filter(s => ank[s.nr] != null).pop();
  const efter = steg.find(s => +s.t_stilla > t + 0.05 && ank[s.nr] != null);
  const fran = fore ? ank[fore.nr] : -1;
  if (sista && fore && sista.nr === fore.nr) return [fran, fran];
  return [fran, efter ? ank[efter.nr] - 1 : manus.length - 1];
}

/* ── Gemensamt ───────────────────────────────────────────────────────────
   underlag(kalla, filer): kalla ur rita-kallor.json, filer = texterna
   { handelser } eller { steg, manus } och leknamn. */
function underlag(kalla, filer, leknamn) {
  if (filer.handelser != null) {
    const rader = lasTsv(filer.handelser);
    return {
      sort: 'handelser', rader,
      forslag: forslagPass(rader),
      mellan: (t0, t1) => rader.filter(r => r.t > t0 + 1e-6 && r.t <= t1 + 1e-6)
        .map(r => ({ t: r.t, text: `${r.handelse}${sant(r.kort) ? ' ' + r.kort : ''}${sant(r.till) ? ' → ' + r.till : ''}${sant(r.plats) ? ' · ' + r.plats : ''}`, osaker: sant(r.osaker) ? r.osaker : null })),
      vantat: t => { const v = vantatPass(rader, t); return { kandidater: [{ antal: v.antal, tappade: v.tappade, fast: v.fast, rad: null }] }; },
    };
  }
  const steg = (typeof filer.steg === 'string' ? JSON.parse(filer.steg) : filer.steg).steg;
  const manus = lasManus(filer.manus, leknamn);
  const till = manusTillstand(manus), ank = ankare(steg, manus);
  return {
    sort: 'steg', steg, manus, ankare: ank,
    forslag: forslagSteg(steg),
    mellan: (t0, t1) => {
      const ut = steg.filter(s => +s.t_stilla > t0 + 1e-6 && +s.t_stilla <= t1 + 1e-6)
        .map(s => ({ t: +(+s.t_stilla).toFixed(2), text: `steg ${s.nr}: ${s.dom}${s.namn ? ' — ' + s.namn : ''}${ank[s.nr] != null ? ` (= manusrad ${ank[s.nr] + 1})` : ''}` }));
      const [a0] = fonsterSteg(steg, manus, ank, t0), [, b1] = fonsterSteg(steg, manus, ank, t1);
      for (let i = Math.max(0, a0 + 1); i <= b1; i++) ut.push({ t: null, text: `manus ${i + 1}: ${manus[i].text}${manus[i].tur ? ' (' + manus[i].tur + ')' : ''}` });
      return ut;
    },
    vantat: t => {
      const [fran, tillI] = fonsterSteg(steg, manus, ank, t);
      const kand = [];
      for (let i = fran; i <= tillI; i++) kand.push({ antal: i < 0 ? {} : till[i], rad: i < 0 ? null : i + 1, text: i < 0 ? 'före första raden' : manus[i].text });
      return { kandidater: kand, fonster: [fran + 1, tillI + 1] };
    },
  };
}

/* Det ritade läget mot det väntade. Kort i en zon (graveyard, library) och
   baksidor räknas inte — de ligger inte i spel. tappad läses ur raknat
   (rita-geometri.cjs raknaKort) om det ges, annars ur kortet självt (som i
   lagen.json). Svaret: { ok, avvikelser, rad } där rad är manusraden som
   stämde (MES-246). */
function jamfor(kort, vantat, { raknat = null, utanTapp = false } = {}) {
  const iSpel = k => !k.zon && !/^baksida$/i.test(String(k.namn || '').trim());
  const tappad = k => raknat ? !!(raknat[k.id] && raknat[k.id].tappad) : !!k.tappad;
  const ritat = {}, tappRitat = {};
  for (const k of kort.filter(iSpel)) {
    const n = String(k.namn || '').trim() || '(utan namn)';
    ritat[n] = (ritat[n] || 0) + 1;
    if (tappad(k)) tappRitat[n] = (tappRitat[n] || 0) + 1;
  }
  const skillnad = antal => {
    const fel = [];
    for (const n of new Set(Object.keys(antal).concat(Object.keys(ritat))))
      if ((antal[n] || 0) !== (ritat[n] || 0)) fel.push({ typ: 'antal', namn: n, vantat: antal[n] || 0, ritat: ritat[n] || 0 });
    return fel;
  };
  let bast = null;
  for (const k of vantat.kandidater) {
    const fel = skillnad(k.antal);
    if (!bast || fel.length < bast.fel.length) bast = { fel, k };
    if (!fel.length) break;
  }
  const avvikelser = bast ? bast.fel.slice() : [];
  if (bast && !avvikelser.length && bast.k.tappade && !utanTapp) {
    for (const n of new Set(Object.keys(bast.k.tappade).concat(Object.keys(tappRitat))))
      if ((bast.k.tappade[n] || 0) !== (tappRitat[n] || 0)) avvikelser.push({ typ: 'tappade', namn: n, vantat: bast.k.tappade[n] || 0, ritat: tappRitat[n] || 0 });
  }
  if (bast && !bast.fel.length && bast.k.fast) {
    const namnFor = id => { const k = kort.find(o => o.id === id); return k ? k.namn : null; };
    const ritadePar = new Set(kort.filter(k => k.fast != null && iSpel(k)).map(k => [k.namn, namnFor(k.fast)].sort().join(' + ')));
    const vantadePar = new Set(bast.k.fast.map(p => p.join(' + ')));
    for (const p of vantadePar) if (!ritadePar.has(p)) avvikelser.push({ typ: 'fast', namn: p, vantat: 1, ritat: 0 });
    for (const p of ritadePar) if (!vantadePar.has(p)) avvikelser.push({ typ: 'fast', namn: p, vantat: 0, ritat: 1 });
  }
  return { ok: !avvikelser.length, avvikelser, rad: bast && bast.k.rad, text: bast && bast.k.text };
}
const avvikelseText = a => a.typ === 'antal' ? `${a.namn}: ${a.ritat} ritade, ${a.vantat} enligt facit`
  : a.typ === 'tappade' ? `${a.namn}: ${a.ritat} tappade ritade, ${a.vantat} enligt facit`
  : `fäst ${a.namn}: ${a.ritat ? 'ritat men inte i facit' : 'i facit men inte ritat'}`;

const Hd = { lasTsv, forslagPass, vantatPass, forslagSteg, lasManus, manusTillstand, ankare, fonsterSteg, underlag, jamfor, avvikelseText, EFTER_S };
if (typeof module === 'object' && module.exports) module.exports = Hd; else rot.RitaHandelser = Hd;
})(typeof window !== 'undefined' ? window : this);

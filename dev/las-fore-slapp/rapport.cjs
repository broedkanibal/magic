#!/usr/bin/env node
/* Sammanställer las.cjs:s svar till tabellerna i utredningen.

   Kör: node dev/las-fore-slapp/rapport.cjs <svar.json> [--kalla skuren:4k] [--json <fil>]

   Svaret bär en rad per bildruta: hur långt före släppet den ligger (rel),
   om kortet gick att skära ut, hur stor del av kortet som syntes, och vad
   bildmodellen + ORB sa. Här räknas det om till:

     1. Utskärningen: andel rutor där kortet gick att skära ut, per 0,1 s.
     2. Modellens svar: rätt namn överst, marginal och kedjans egen dom
        (accept), per 0,1 s före släppet.
     3. Regler: "samma namn i N rutor i följd och marginal över X" — hur
        tidigt före släppet regeln tänder, och hur många FEL namn den ger.
        En regel med ett enda fel namn håller inte. */
'use strict';
const fs = require('fs');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const FIL = process.argv[2];
if (!FIL) { console.error('node rapport.cjs <svar.json> [--kalla skuren:4k]'); process.exit(1); }
const R = JSON.parse(fs.readFileSync(FIL, 'utf8'));
const KALLA = arg('--kalla', 'skuren:4k');
const JSONUT = arg('--json', '');
const svar = R.svar.filter(x => !x.fel);

const perF = new Map();
for (const s of svar) { if (!perF.has(s.fonster)) perF.set(s.fonster, []); perF.get(s.fonster).push(s); }
for (const v of perF.values()) v.sort((a, b) => a.rel - b.rel);

const norm = n => String(n || '').trim().toLowerCase();
const ratt = (s, kalla) => { const l = s.lager[kalla]; return !!(l && l.namn && s.facit && norm(l.namn) === norm(s.facit)); };
const med = a => { if (!a.length) return null; const b = a.slice().sort((p, q) => p - q); return b[b.length >> 1]; };

console.log(`${svar.length} rutor i ${perF.size} fönster · bildmodell ${R.embed ? R.embed.modell + ' på ' + R.embed.backend : '?'} · ${R.pool} uppslag i poolen`);
const kallor = [...new Set(svar.flatMap(s => Object.keys(s.lager || {})))];
console.log(`lager i svaret: ${kallor.join(', ')}`);
console.log(`vald källa: ${KALLA}\n`);

/* ── 1. per tiondels sekund före släppet ─────────────────────────── */
const hinkar = new Map();
for (const s of svar) {
  if (s.rel > 0.02) continue;
  const h = +(Math.floor((-s.rel) / 0.1) * 0.1).toFixed(1);
  if (!hinkar.has(h)) hinkar.set(h, { n: 0, ok: 0, synlig: [], rattN: 0, felN: 0, accept: 0, marg: [], harSvar: 0, rattOverst: 0 });
  const b = hinkar.get(h);
  b.n++;
  if (s.skar && s.skar.ok) b.ok++;
  if (s.skar && s.skar.synlig != null) b.synlig.push(s.skar.synlig);
  const l = s.lager[KALLA];
  if (l && l.namn) {
    b.harSvar++; b.marg.push(l.marginal);
    if (ratt(s, KALLA)) b.rattOverst++;
    if (l.accept) { b.accept++; if (ratt(s, KALLA)) b.rattN++; else b.felN++; }
  }
}
console.log('Tid före släppet');
console.log('   före    rutor  utskuret  synligt  lästa  rätt överst  säkra  varav rätt  FEL NAMN  marginal');
for (const h of [...hinkar.keys()].sort((a, b) => a - b)) {
  const b = hinkar.get(h);
  const p = (x, n) => n ? Math.round(100 * x / n) + ' %' : '–';
  console.log(`  ${(h === 0 ? '0,00' : '-' + h.toFixed(2)).padStart(5)} s ${String(b.n).padStart(7)} ${p(b.ok, b.n).padStart(9)} ${(b.synlig.length ? Math.round(100 * med(b.synlig)) + ' %' : '–').padStart(8)} ${String(b.harSvar).padStart(6)} ${p(b.rattOverst, b.harSvar).padStart(12)} ${String(b.accept).padStart(6)} ${String(b.rattN).padStart(11)} ${String(b.felN).padStart(9)} ${(b.marg.length ? med(b.marg).toFixed(3) : '–').padStart(9)}`);
}

/* ── 2. per nedläggning ──────────────────────────────────────────── */
console.log('\nPer nedläggning (före släppet)');
console.log('  fönster  facit                       utskuret  första säkra  rätt?  fel namn på vägen');
const perFonster = [];
for (const nr of [...perF.keys()].sort((a, b) => a - b)) {
  const v = perF.get(nr).filter(s => s.rel <= 0.02);
  const facit = v.length ? v[0].facit : null;
  const skurna = v.filter(s => s.skar && s.skar.ok).length;
  let forsta = null, forstaNamn = null; const felNamn = [];
  for (const s of v) {
    const l = s.lager[KALLA]; if (!l || !l.namn || !l.accept) continue;
    if (forsta == null) { forsta = -s.rel; forstaNamn = l.namn; }
    if (!ratt(s, KALLA)) felNamn.push(`${l.namn}@${(-s.rel).toFixed(2)}`);
  }
  perFonster.push({ nr, facit, rutor: v.length, skurna, forsta, forstaNamn, felNamn });
  console.log(`  ${String(nr).padStart(7)}  ${String(facit || '?').padEnd(26)} ${String(skurna + '/' + v.length).padStart(9)} ${(forsta != null ? forsta.toFixed(2) + ' s' : '–').padStart(13)}  ${forsta != null ? (norm(forstaNamn) === norm(facit) ? 'ja   ' : 'NEJ  ') : '–    '}  ${felNamn.length ? felNamn.slice(0, 4).join(' ') : '–'}`);
}

/* ── 3. regler ───────────────────────────────────────────────────── */
console.log('\nRegler: samma namn i N rutor i följd, marginal över X (bara rutor FÖRE släppet)');
console.log('   N  marginal  kräver  tänder i  rätt  FEL  median s före  tidigast');
const rader = [];
for (const kravAccept of [false, true]) for (const N of [1, 2, 3, 4, 5, 6]) for (const X of [0, 0.05, 0.08, 0.10, 0.145, 0.20, 0.25, 0.30]) {
  let rattN = 0, felN = 0; const tider = []; let tandaI = 0;
  for (const nr of perF.keys()) {
    const v = perF.get(nr).filter(s => s.rel <= 0.02);
    let rad = 0, sist = null, tand = null;
    for (const s of v) {
      const l = s.lager[KALLA];
      const duger = l && l.namn && l.marginal > X && (!kravAccept || l.accept);
      if (!duger) { rad = 0; sist = null; continue; }
      if (norm(l.namn) === sist) rad++; else { rad = 1; sist = norm(l.namn); }
      if (rad >= N) { tand = { rel: s.rel, namn: l.namn, facit: s.facit }; break; }
    }
    if (tand) { tandaI++; tider.push(-tand.rel); if (norm(tand.namn) === norm(tand.facit)) rattN++; else felN++; }
  }
  rader.push({ N, X, kravAccept, tandaI, rattN, felN, median: med(tider), tidigast: tider.length ? Math.max(...tider) : null });
}
for (const r of rader.sort((a, b) => (a.felN - b.felN) || (b.rattN - a.rattN) || ((b.median || 0) - (a.median || 0))).slice(0, 30)) {
  console.log(`  ${String(r.N).padStart(2)}  ${r.X.toFixed(3).padStart(8)}  ${(r.kravAccept ? 'accept' : '–').padStart(6)}  ${String(r.tandaI + '/' + perF.size).padStart(8)}  ${String(r.rattN).padStart(4)}  ${String(r.felN).padStart(3)}  ${(r.median != null ? r.median.toFixed(2) : '–').padStart(13)}  ${(r.tidigast != null ? r.tidigast.toFixed(2) : '–').padStart(8)}`);
}
if (JSONUT) { fs.writeFileSync(JSONUT, JSON.stringify({ kalla: KALLA, hinkar: [...hinkar], perFonster, regler: rader }, null, 1) + '\n'); console.log('\nskrivet: ' + JSONUT); }

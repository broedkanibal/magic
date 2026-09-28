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
    /* fran–till: tiden då bordet ser ut så här — från sista händelsen i
       klumpen till strax före nästa klump. Utanför den visar bilden ett
       annat läge. */
    const fran = Math.min(t, k[k.length - 1].t), till = nasta ? Math.max(t, nasta[0].t - 0.1) : Infinity;
    return { t: +t.toFixed(2), fran: +fran.toFixed(2), till: till === Infinity ? till : +till.toFixed(2),
      etikett: k.map(r => `${r.handelse} ${sant(r.kort) ? r.kort : ''}`.trim()).join(' · ') };
  });
  const slut = rader.find(r => r.handelse === 'slut');
  if (slut && (!ut.length || ut[ut.length - 1].t < slut.t)) {
    if (ut.length && ut[ut.length - 1].till > slut.t) ut[ut.length - 1].till = Math.max(ut[ut.length - 1].t, slut.t - 0.1);
    ut.push({ t: slut.t, fran: slut.t, till: slut.t, etikett: 'slut' });
  }
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
/* fran–till: från att handen släppt (eller kortet landat) till att nästa
   steg börjar röra sig. Utanför den visar bilden ett annat läge. */
function forslagSteg(steg) {
  return steg.map((s, i) => {
    const t = +(+s.t_stilla).toFixed(2), nasta = steg[i + 1];
    const tal = v => v != null && v !== '' && Number.isFinite(+v);
    const fran = Math.min(t, tal(s.t_slapp) ? +s.t_slapp : tal(s.t_land) ? +s.t_land : t);
    const till = nasta && tal(nasta.t_borjar) ? Math.max(t, +nasta.t_borjar) : Infinity;
    return { t, fran: +fran.toFixed(2), till: till === Infinity ? till : +till.toFixed(2), steg: s.nr,
      etikett: `steg ${s.nr}: ${s.dom}${s.namn ? ' — ' + s.namn : ''}` };
  });
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

/* Varje manusrad får ett steg i filmen, så att den hör till exakt ett läge.
   Ankarraderna (nedläggningar med namn) har sitt steg. Raderna mellan två
   ankare paras i ordning med stegen mellan dem: en tappning helst med ett
   steg där något vreds, något som lämnar bordet helst med "borta". Det är
   oftast lika många rader som steg (i MES-246 i 13 av 18 mellanrum); fler
   rader än steg delar steg, fler steg än rader lämnar steg utan rad
   (handen, leken). Används för vad som visas — inte av jämförelsen mot
   facit, som har sitt eget fönster (fonsterSteg). */
function radTyp(r) {
  if (/^(untappa|tappa)\s/.test(r)) return 'tapp';
  if (/^flytta /.test(r)) return 'flytt';
  if (/^bort /.test(r) || /(till graveyard|till handen|överst i library|från graveyard till (handen|exile))$/.test(r)) return 'bort';
  return 'ny';
}
const PASSAR = { tapp: { 'vridet/flyttat': 2, 'ändrat på plats': 1 }, flytt: { 'vridet/flyttat': 2, 'ändrat på plats': 1.5 },
  bort: { borta: 2, 'vridet/flyttat': 1, 'ändrat på plats': 1 }, ny: { 'ändrat på plats': 2, 'nytt (stor låda)': 1.5, 'vridet/flyttat': 1 } };
function radSteg(steg, manus, ank, extra) {
  const ut = new Array(manus.length).fill(null);
  /* Ankarpar {s: steg, r: rad}: detektorns nedläggningar med namn, och
     (extra) det Jespers ritning visar — ett kort som finns i ett ritat
     läge har lagts ut senast i det lägets steg. Ritningen går före
     detektorn för samma rad; paren hålls stigande i både steg och rad. */
  const perRad = new Map();
  for (const [sn, r] of Object.entries(ank)) perRad.set(r, +sn);
  for (const p of extra || []) perRad.set(p.r, p.s);
  const par = [...perRad].map(([r, sn]) => ({ s: sn, r })).sort((a, b) => a.s - b.s || a.r - b.r);
  const ankare = []; for (const p of par) if (!ankare.length || p.r > ankare[ankare.length - 1].r) ankare.push(p);
  for (const a of ankare) ut[a.r] = a.s;
  let forraS = 0, forraR = -1;
  for (const a0 of ankare.concat([null])) {
    const a = a0 && { nr: a0.s };
    const slutR = a0 ? a0.r : manus.length;
    const S = steg.filter(s => s.nr > forraS && (a ? s.nr < a.nr : true));
    const R = []; for (let i = forraR + 1; i < slutR; i++) R.push(i);
    if (R.length) {
      if (!S.length) { const s = a || steg[steg.length - 1]; for (const i of R) ut[i] = s.nr; }
      else {
        // ordningsbevarande parning med bästa passform; två rader i samma steg kostar lite
        const poang = (i, j) => (PASSAR[radTyp(manus[R[i]].text)][S[j].dom] || 0.5);
        const dp = R.map(() => S.map(() => -Infinity)), fran = R.map(() => S.map(() => -1));
        for (let j = 0; j < S.length; j++) dp[0][j] = poang(0, j);
        for (let i = 1; i < R.length; i++) for (let j = 0; j < S.length; j++) {
          let bast = -Infinity, bj = -1;
          for (let q = 0; q < j; q++) if (dp[i - 1][q] > bast) { bast = dp[i - 1][q]; bj = q; }
          if (dp[i - 1][j] - 0.8 > bast) { bast = dp[i - 1][j] - 0.8; bj = j; }
          if (bj >= 0) { dp[i][j] = bast + poang(i, j); fran[i][j] = bj; }
        }
        let j = 0; for (let q = 1; q < S.length; q++) if (dp[R.length - 1][q] > dp[R.length - 1][j]) j = q;
        for (let i = R.length - 1; i >= 0; i--) { ut[R[i]] = S[j].nr; j = fran[i][j]; }
      }
    }
    if (a) { forraS = a.nr; forraR = slutR; }
  }
  return ut;
}
/* Bordet enligt manuset efter raderna 0..sist: vilka kort som ligger där,
   tappade eller inte, i vilken hög, fästa vid vad, och vad som ligger i
   graveyard. "tappa hög A" tappar varje kort som lagts i hög A. */
function manusBord(manus, sist, effekt) {
  const bord = [], grav = [];
  const hitta = (text) => {   // korten och högarna som en tappa/untappa-rad pekar på (namn kan ha komma: "Danitha Capashen, Paragon")
    const ut = new Set();
    for (const m of text.matchAll(/hög ([A-Z])/g)) for (const k of bord) if (k.hog === m[1]) ut.add(k);
    const namn = [...new Set(bord.map(k => k.namn))].sort((a, b) => b.length - a.length);
    let rest = text.replace(/hög [A-Z]/g, '');
    for (const n of namn) if (rest.includes(n)) { rest = rest.split(n).join(''); for (const k of bord) if (k.namn === n) ut.add(k); }
    return [...ut];
  };
  const tabort = n => { const i = bord.findIndex(k => k.namn === n); if (i < 0) return null; const [k] = bord.splice(i, 1); for (const o of bord) if (o.fast === k.namn) o.fast = null; return k; };
  for (let i = 0; i <= sist && i < manus.length; i++) {
    const r = manus[i].text; let m;
    if ((m = /^(untappa|tappa) (.+)$/.exec(r))) {
      const mal = hitta(m[2]);
      if (effekt) { const namn = {}; for (const k of mal) namn[k.namn] = (namn[k.namn] || 0) + 1; effekt[i] = { tappa: m[1] === 'tappa', namn }; }   // vilka kort raden tappar, för medRitning
      for (const k of mal) k.tappad = m[1] === 'tappa';
    }
    else if (/^mill (\d+)$/.test(r)) { const n = +/^mill (\d+)$/.exec(r)[1]; for (let q = 0; q < n; q++) grav.push('kort från leken'); }
    else if ((m = /^flytta (.+) till (.+)$/.exec(r))) { const k = bord.find(o => o.namn === m[1].trim()); if (k) k.fast = m[2].trim(); }
    else if ((m = /^bort (.+)$/.exec(r))) tabort(m[1].trim());
    else if ((m = /^(.+) från graveyard till spel$/.exec(r))) { const g = grav.indexOf(m[1].trim()); if (g >= 0) grav.splice(g, 1); bord.push({ namn: m[1].trim(), tappad: false, hog: null, fast: null }); }
    else if ((m = /^(.+) från graveyard till (handen|exile)$/.exec(r))) { const g = grav.indexOf(m[1].trim()); if (g >= 0) grav.splice(g, 1); }
    else if ((m = /^(.+) till graveyard$/.exec(r))) { if (tabort(m[1].trim())) grav.push(m[1].trim()); }
    else if ((m = /^(.+) (till handen|överst i library)$/.exec(r))) tabort(m[1].trim());
    else if (manus[i].plus) {
      const n = manus[i].plus, hog = (/ hög ([A-Z])$/.exec(r) || [])[1] || null;
      bord.push({ namn: n, tappad: / tappad$/.test(r), hog, fast: manus[i].fast ? manus[i].fast[1] : null });
    }
  }
  return { bord, grav };
}
/* Samma sak för passet 2026-09-22, ur händelserna fram till t. */
function passBord(rader, t) {
  const bord = [], grav = [];
  const tabort = n => { const i = bord.findIndex(k => k.namn === n); return i < 0 ? null : bord.splice(i, 1)[0]; };
  for (const r of rader) {
    if (r.t > t + 1e-6) break;
    const n = sant(r.kort) ? r.kort : null; if (!n) continue;
    const hog = sant(r.plats) ? ((/hög ([A-Z])/.exec(r.plats) || [])[1] || null) : null;
    if (TILL_BORDET.has(r.handelse)) { if (r.handelse === 'grav_till_bord') { const g = grav.indexOf(n); if (g >= 0) grav.splice(g, 1); } bord.push({ namn: n, tappad: false, hog, fast: sant(r.till) ? r.till : null }); }
    else if (r.handelse === 'tar_bort') { if (tabort(n) && r.till === 'grav') grav.push(n); }
    else if (r.handelse === 'tappar' || r.handelse === 'otappar') { const k = bord.find(o => o.namn === n && o.tappad !== (r.handelse === 'tappar')); if (k) k.tappad = r.handelse === 'tappar'; }
    else if (r.handelse === 'flyttar') { const k = bord.find(o => o.namn === n); if (k) { k.fast = sant(r.till) ? r.till : null; if (hog) k.hog = hog; } }
    else if (/^grav_/.test(r.handelse)) { const g = grav.indexOf(n); if (g >= 0) grav.splice(g, 1); }
  }
  return { bord, grav };
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
        .map(r => Object.assign({ t: r.t, text: `${r.handelse}${sant(r.kort) ? ' ' + r.kort : ''}${sant(r.till) ? ' → ' + r.till : ''}${sant(r.plats) ? ' · ' + r.plats : ''}`,
          handelse: r.handelse, kort: sant(r.kort) ? r.kort : null, till: sant(r.till) ? r.till : null, plats: sant(r.plats) ? r.plats : null }, sant(r.osaker) ? { osaker: r.osaker } : {})),
      vantat: t => { const v = vantatPass(rader, t); return { kandidater: [{ antal: v.antal, tappade: v.tappade, fast: v.fast, rad: null }] }; },
      bord: t => passBord(rader, t),
      harnast: (t, n) => rader.filter(r => r.t > t + 1e-6 && PA_BORDET.has(r.handelse)).slice(0, n)
        .map(r => ({ handelse: r.handelse, kort: sant(r.kort) ? r.kort : null, till: sant(r.till) ? r.till : null, plats: sant(r.plats) ? r.plats : null })),
    };
  }
  const steg = (typeof filer.steg === 'string' ? JSON.parse(filer.steg) : filer.steg).steg;
  const manus = lasManus(filer.manus, leknamn);
  const till = manusTillstand(manus), ank = ankare(steg, manus);
  const ts = s => +(+s.t_stilla).toFixed(2);   // samma avrundning som lägenas tider: steg 2 på 3,472 s hör till läget på 3,47 s
  let rs, radTid, ritNyckel = null;
  const tappEffekt = []; manusBord(manus, manus.length - 1, tappEffekt);
  /* En rad hör till läget från lägets första tid (fran), inte från
     förslaget: Jespers läge 18 stod på 100,84 s, i början av fönstret, och
     raderna på stegets 100,86 s föll då ur läget. */
  const fonsterFran = forslagSteg(steg).map(f => f.fran);
  const parning = extra => { rs = radSteg(steg, manus, ank, extra); radTid = manus.map((r, i) => rs[i] != null ? fonsterFran[rs[i] - 1] : Infinity); };
  parning([]);
  return {
    sort: 'steg', steg, manus, ankare: ank,
    forslag: forslagSteg(steg),
    get radSteg() { return rs; },
    /* Ritningen rättar parningen: för varje ritat läge (i ordning) blir ett
       namn som tillkommit sedan förra ritade läget ett ankare för nästa
       oanvända manusrad som lägger ut det namnet, och ett namn som
       försvunnit ett ankare för raden som tar bort det. */
    medRitning: (lagen, iSpel, tappad) => {
      const lista = Object.values(lagen || {}).sort((a, b) => a.nr - b.nr);
      // millade kort: i graveyard, men inget manuset själv lägger där ("X till graveyard") — namngivna (Hooded Blightfang) eller okända
      const gravNamn = new Set(manus.map(r => (/^(.+) till graveyard$/.exec(r.text) || [])[1]).filter(Boolean));
      const okanda = l => l.kort.filter(k => k.zon === 'grav' && !gravNamn.has(String(k.namn || '').trim())).length;
      const nyckel = JSON.stringify(lista.map(l => [l.nr, okanda(l), l.kort.filter(iSpel).map(k => k.namn + (tappad && tappad(k) ? '*' : '')).sort()]));
      if (nyckel === ritNyckel) return;
      ritNyckel = nyckel;
      const extra = [], anvand = new Set(), tappAnvand = new Map();
      const nasta = (falt, namn) => { const i = manus.findIndex((r, k) => !anvand.has(k) && r[falt] === namn); if (i >= 0) anvand.add(i); return i; };
      let forra = {}, forraT = {}, forraO = 0;
      for (const l of lista) {
        const f = forslagSteg(steg)[l.nr - 1]; if (!f) continue;
        const nu = {}, nuT = {};
        for (const k of l.kort.filter(iSpel)) { nu[k.namn] = (nu[k.namn] || 0) + 1; if (tappad && tappad(k)) nuT[k.namn] = (nuT[k.namn] || 0) + 1; }
        const tappadIn = {};   // kort som lagts ut redan tappade ("Thriving Moor tappad") är ingen tappning
        for (const n of new Set(Object.keys(nu).concat(Object.keys(forra)))) {
          const d = (nu[n] || 0) - (forra[n] || 0);
          for (let q = 0; q < Math.abs(d); q++) {
            const i = nasta(d > 0 ? 'plus' : 'minus', n);
            if (i >= 0) { extra.push({ s: f.steg, r: i }); if (d > 0 && / tappad$/.test(manus[i].text)) tappadIn[n] = (tappadIn[n] || 0) + 1; }
          }
        }
        /* En tappning eller mill kan inte ha hänt före ett kort som ännu inte
           är utlagt i ritningen: sökningen stannar vid första oanvända
           nedläggningen. Utan gränsen låste en Plains som untappades sent i
           Jespers ritning "untappa hög B" långt fram (rad 43, efter Danitha)
           och drog raderna däremellan till läge 38. */
        const grans = (() => { const i = manus.findIndex((r, k) => r.plus && !anvand.has(k)); return i < 0 ? manus.length : i; })();
        /* Tappningar: fler tappade av ett namn än i förra ritade läget låser
           nästa tappa-rad som träffar namnet till det här läget (färre: en
           untappa-rad). "tappa hög A" räknas för båda Swamparna i högen. */
        if (tappad) for (const n of new Set(Object.keys(nuT).concat(Object.keys(forraT)))) {
          const bort = Math.max(0, (forra[n] || 0) - (nu[n] || 0));
          let d = (nuT[n] || 0) - (forraT[n] || 0) - (tappadIn[n] || 0);
          if (d < 0) d = Math.min(0, d + Math.min(bort, forraT[n] || 0));   // ett tappat kort som lämnat bordet är ingen untappning
          let kvar = Math.abs(d);
          for (let i = 0; i < grans && kvar > 0; i++) {
            const e = tappEffekt[i];
            if (!e || e.tappa !== d > 0 || !e.namn[n]) continue;
            if (tappAnvand.has(i) && tappAnvand.get(i) !== l.nr) continue;
            if (!tappAnvand.has(i)) { tappAnvand.set(i, l.nr); extra.push({ s: f.steg, r: i }); }
            kvar -= e.namn[n];
          }
        }
        /* Mill: fler okända kort i graveyard än i förra ritade läget låser
           nästa oanvända mill-rad hit ("mill 3" räknas för tre). */
        let fler = okanda(l) - forraO;
        for (let i = 0; i < grans && fler > 0; i++) {
          const m = /^mill (\d+)$/.exec(manus[i].text); if (!m || anvand.has(i)) continue;
          anvand.add(i); extra.push({ s: f.steg, r: i }); fler -= +m[1];
        }
        forra = nu; forraT = nuT; forraO = okanda(l);
      }
      parning(extra);
    },
    mellan: (t0, t1) => {
      const ut = steg.filter(s => ts(s) > t0 + 1e-6 && ts(s) <= t1 + 1e-6)
        .map(s => ({ t: ts(s), text: `steg ${s.nr}: ${s.dom}${s.namn ? ' — ' + s.namn : ''}${ank[s.nr] != null ? ` (= manusrad ${ank[s.nr] + 1})` : ''}` }));
      manus.forEach((r, i) => { if (radTid[i] > t0 + 1e-6 && radTid[i] <= t1 + 1e-6) ut.push({ t: null, text: `manus ${i + 1}: ${r.text}${r.tur ? ' (' + r.tur + ')' : ''}`, rad: r.text, tur: r.tur }); });
      return ut;
    },
    bord: t => { let sist = -1; manus.forEach((r, i) => { if (radTid[i] <= t + 1e-6) sist = i; }); return manusBord(manus, sist); },
    /* de närmaste raderna efter läget — ihopparningen kan ha lagt en rad ett
       läge för sent, och då syns kortet redan i bilden */
    harnast: (t, n) => manus.filter((r, i) => radTid[i] > t + 1e-6).slice(0, n).map(r => ({ rad: r.text, tur: r.tur })),
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

const Hd = { lasTsv, forslagPass, vantatPass, forslagSteg, lasManus, manusTillstand, ankare, fonsterSteg, radSteg, manusBord, passBord, underlag, jamfor, avvikelseText, EFTER_S };
if (typeof module === 'object' && module.exports) module.exports = Hd; else rot.RitaHandelser = Hd;
})(typeof window !== 'undefined' ? window : this);

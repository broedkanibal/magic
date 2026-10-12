/* Problemrapporten (MES-365): hämta hem en rapport.

   Kör:  node dev/rapport/hamta.cjs R-0412
         node dev/rapport/hamta.cjs --fil paket.json[.gz] [--ut mapp]   (ett paket som redan ligger lokalt, t.ex. ur prov.cjs)

   Lägger allt i dev/diagnos/rapporter/<kod>/ (gitignorerad — det är en
   spelares data):
     LÄS-MIG.md          det spelaren sa, Mesas logg inom vyn 90 s före trycket,
                         det som passar snabbvalet, filerna (README §7)
     rapport.json        allt på EN tidslinje (datorns klocka): datorns låda,
                         telefonens låda (omräknad med kanalens offset),
                         bordsloggen och mattans ändringar, sorterat på tid
     bordlogg.json       bordsloggen i fallets form (dev/mattest/fall.cjs rader,
                         dev/dubbletter.cjs --logg), för uppspelaren
     paket.json          paketet som datorn laddade upp, orört
     telefon-diagnos.json  telefonens diagnosfil vid trycket (dev/kamerabank.cjs --diagnos)
     bilder/             telefonens stillbilder (del B)

   Service role ur .env.local. Läser bara; ändrar ingenting i Supabase. */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const { supa, ROT } = require('./supa.cjs');

const TAGG = { forsvann: 'A card disappeared', dok_upp: "A card appeared that I didn't play", kom_aldrig: 'A card never showed up',
  fel_namn: 'Wrong name', tap: 'Tapped or untapped wrong', langsamt: 'Slow', annat: 'Something else' };

const lasJson = buf => JSON.parse((buf[0] === 0x1f && buf[1] === 0x8b ? zlib.gunzipSync(buf) : buf).toString('utf8'));
const sek = (t, frys) => ((t - frys) / 1000).toFixed(1).replace(/^(?!-)/, '+') + ' s';
const klocka = t => new Date(t).toLocaleTimeString('sv-SE', { hour12: false }) + '.' + String(t % 1000).padStart(3, '0');

/* En tidslinje av allt i paketet, på datorns klocka. */
function tidslinje(p) {
  const ut = [];
  for (const e of p.lada || []) ut.push(Object.assign({ sida: 'dator' }, e));
  for (const e of (p.telefon && p.telefon.lada) || []) ut.push(Object.assign({ sida: 'telefon' }, e));
  const b = p.bordLogg;
  if (b && b.rader) for (const r of b.rader) {
    const spar = r.spar || [];
    ut.push({ sida: 'bord', slag: 'bord', t: Math.round(b.start + r.s * 1000), s: r.s, fas: r.fas || undefined, nollstall: r.nollstall || undefined,
      spar: spar.length, namn: spar.filter(x => x.namn).map(x => `${x.id}:${x.namn}${x.saker ? '' : '?'}${x.tappad ? '↷' : ''}`).slice(0, 30) });
  }
  ut.sort((a, b) => a.t - b.t);
  for (const e of ut) e.rel = +((e.t - p.frys) / 1000).toFixed(2);
  return ut;
}

const inom = (s, x, y) => !s || x == null || y == null || (x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.y1);
function beskrivMatta(e) {
  const k = `${e.kort || '(utan namn)'} [${e.id || '?'}${e.spar != null ? ', spår ' + e.spar : ''}]`;
  if (e.typ === 'spelar') return `lagt: ${k} → ${e.till}`;
  if (e.typ === 'tar_bort') return `borta: ${k}`;
  if (e.typ === 'tappar') return `tappat: ${k}`;
  if (e.typ === 'otappar') return `otappat: ${k}`;
  if (e.typ === 'namn') return `namn: ${e.fran || '(utan namn)'} → ${e.kort || '(utan namn)'} [${e.id}]`;
  if (e.typ === 'flyttar') return e.till === 'plats' ? `flyttat på mattan: ${k} (${e.fx},${e.fy}) → (${e.x},${e.y})` : `flyttat: ${k} ${e.fran || ''} → ${e.till}`;
  return `${e.typ}: ${k}`;
}
function beskriv(e) {
  if (e.slag === 'matta') return beskrivMatta(e) + (e.av ? ` · troligen ${e.av === 'spelare' ? 'spelaren (tryck strax före)' : 'kameran'}` : '');
  if (e.slag === 'handling') return `${e.typ}${e.tangent ? ' ' + e.tangent : ''}${e.text ? ' «' + e.text + '»' : ''}${e.mal ? ' ' + e.mal : ''}${e.kort ? ' kort ' + e.kort : ''}${e.i ? ' i ' + e.i : ''}${e.kod ? ' ' + e.kod : ''}`;
  if (e.slag === 'fel') return `${e.kalla}: ${e.med || ''}`;
  if (e.slag === 'anrop') return `${e.metod} ${e.vag} → ${e.status || e.fel || 'inget svar'} (${e.ms} ms)`;
  if (e.slag === 'claude') return `Claude ${e.mode || ''} → ${e.status} på ${e.ms} ms ${e.svar ? JSON.stringify(e.svar).slice(0, 120) : e.fel || ''}`;
  if (e.slag === 'spar') return e.borta ? `spår ${e.id} borta` : `spår ${e.id}: ${e.namn || '(inget namn)'}${e.saker ? ' säker' : ''}${e.varfor ? ' · ' + e.varfor : ''}${e.tappad ? ' · tappat' : ''}`;
  if (e.slag === 'lage') return `läge ${e.lage || ''} ${e.bildlage || ''} ${e.upplosning || ''}${e.rad ? ' · «' + e.rad + '»' : ''}`;
  if (e.slag === 'bord') return `bord: ${e.spar} spår${e.fas ? ' fas ' + e.fas : ''}${e.nollstall ? ' NOLLSTÄLLT' : ''}`;
  if (e.slag === 'dialog') return `${e.oppen ? 'öppnad' : 'stängd'}: ${e.id}${e.rubrik ? ' «' + e.rubrik + '»' : ''}`;
  if (e.slag === 'notis') return `notis «${e.text}»`;
  if (e.slag === 'kanal') return Object.entries(e).filter(([k]) => !['t', 'slag', 'sida', 'rel', 'tTel'].includes(k)).map(([k, v]) => k + ' ' + v).join(', ');
  return JSON.stringify(e).slice(0, 160);
}

/* Det som passar snabbvalet och orden, filtrerat ur loggen — inget gissat. */
function passar(p, linje) {
  const tagg = p.tagg, ord = String(p.text || '').toLowerCase();
  const fore = linje.filter(e => e.rel >= -90 && e.rel <= 1);
  const matta = fore.filter(e => e.slag === 'matta');
  const val = {
    forsvann: e => e.slag === 'matta' && (e.typ === 'tar_bort' || (e.typ === 'flyttar' && e.till !== 'plats')),
    dok_upp: e => e.slag === 'matta' && e.typ === 'spelar',
    kom_aldrig: e => (e.slag === 'spar' && e.namn) || (e.slag === 'matta' && e.typ === 'spelar'),
    fel_namn: e => (e.slag === 'matta' && e.typ === 'namn') || e.slag === 'claude' || (e.slag === 'spar' && e.namn),
    tap: e => e.slag === 'matta' && (e.typ === 'tappar' || e.typ === 'otappar'),
    langsamt: e => e.slag === 'claude' || e.slag === 'anrop' || (e.slag === 'lage') || (e.slag === 'matta' && e.typ === 'spelar'),
    annat: e => e.slag === 'fel' || e.slag === 'anrop'
  }[tagg];
  const ut = val ? fore.filter(val) : [];
  /* Kortnamn som spelaren nämner i orden. */
  const namn = [...new Set(linje.filter(e => e.kort || e.namn).map(e => typeof e.kort === 'string' && !/^[0-9a-z]{6,}$/.test(e.kort) ? e.kort : e.namn).filter(n => typeof n === 'string' && n.length > 2))];
  const namnda = namn.filter(n => ord.includes(n.toLowerCase()));
  const omNamn = namnda.length ? linje.filter(e => e.rel >= -600 && e.rel <= 1 && namnda.some(n => e.kort === n || e.namn === n || e.fran === n)) : [];
  return { tagg: ut, namnda, omNamn, matta };
}

function lasMig(p, rad, linje, filer, konto) {
  const fr = p.frys, vy = p.vy || {}, s = vy.synlig;
  const L = [];
  L.push(`# Rapport ${p.kod}`, '');
  L.push('## 1. Det spelaren sa', '');
  L.push(`| | |`, `|---|---|`);
  L.push(`| Orden | ${p.text ? '«' + String(p.text).replace(/\|/g, '\\|').replace(/\n/g, ' ') + '»' : '(inga)'} |`);
  L.push(`| Snabbvalet | ${p.tagg ? TAGG[p.tagg] + ' (`' + p.tagg + '`)' : '(inget)'} |`);
  L.push(`| Trycket | ${p.frysIso} (${klocka(fr)} på datorns klocka) |`);
  L.push(`| Spel | ${(p.miljo && p.miljo.spel) || '–'}${rad && rad.game_id ? ' (`' + rad.game_id + '`)' : ''} · läge ${vy.lage || '–'} |`);
  L.push(`| Spelare | ${konto ? `${konto.namn || '–'} <${konto.epost || '–'}>` : (rad && rad.user_id) || '–'} |`);
  L.push(`| Vyn | zoom ${vy.zoom != null ? (+vy.zoom).toFixed(2) : '–'}, synlig del av mattan ${s ? `(${s.x0},${s.y0})–(${s.x1},${s.y1})` : '–'}, senast rörda kortet ${vy.senastRordKort || '–'} (spår ${vy.senastRord != null ? vy.senastRord : '–'}), skärm ${vy.skarm ? vy.skarm.w + '×' + vy.skarm.h : '–'} |`);
  const tel = p.telefon;
  L.push(`| Telefonen | ${vy.kamAnsluten ? 'ansluten' : 'inte ansluten'}${tel && tel.svarade ? `, lådan kom (offset ${tel.offset} ms, rundtur ${tel.rtt} ms)` : tel ? ', svarade inte' : ''}${rad && rad.bilder ? ' · bilder ' + rad.bilder : ''} |`);
  L.push(`| Version | ${(p.miljo && p.miljo.build) || 'okänd (lokal)'} · ${(p.miljo && p.miljo.ua) || ''} |`);
  L.push('');
  L.push('## 2. Mesas logg inom vyn, 90 s före trycket', '');
  const mattaKort = new Map(((p.matta && p.matta.mig) || []).map(k => [k.id, k]));
  const iVyn = e => { const k = mattaKort.get(e.id) || {}; return inom(s, e.x != null ? e.x : k.x, e.y != null ? e.y : k.y); };
  const logg = linje.filter(e => e.rel >= -90 && e.rel <= 0.5 && e.slag === 'matta' && iVyn(e));
  if (!logg.length) L.push('(inget hände på mattan inom vyn de sista 90 sekunderna)');
  else { L.push('| tid | händelse |', '|---|---|'); for (const e of logg) L.push(`| ${sek(e.t, fr)} | ${beskriv(e)} |`); }
  L.push('');
  L.push('## 3. Det som passar snabbvalet och orden', '');
  const P = passar(p, linje);
  if (p.tagg) {
    L.push(`**${TAGG[p.tagg]}** — ${P.tagg.length} händelser de sista 90 s:`, '');
    if (P.tagg.length) { L.push('| tid | källa | händelse |', '|---|---|---|'); for (const e of P.tagg.slice(-40)) L.push(`| ${sek(e.t, fr)} | ${e.sida} | ${beskriv(e)} |`); }
    L.push('');
  }
  if (P.namnda.length) {
    L.push(`**Kort som nämns i orden:** ${P.namnda.join(', ')} — allt om dem de sista 10 minuterna:`, '');
    L.push('| tid | källa | händelse |', '|---|---|---|'); for (const e of P.omNamn.slice(-40)) L.push(`| ${sek(e.t, fr)} | ${e.sida} | ${beskriv(e)} |`);
    L.push('');
  }
  if (!p.tagg && !P.namnda.length) L.push('(inget snabbval och inga kortnamn i orden)', '');
  const fel = linje.filter(e => e.slag === 'fel' || e.slag === 'anrop');
  L.push(`**Fel de sista 10 minuterna:** ${fel.length}`, '');
  if (fel.length) { L.push('| tid | källa | fel |', '|---|---|---|'); for (const e of fel.slice(-30)) L.push(`| ${sek(e.t, fr)} | ${e.sida} | ${beskriv(e).replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`); L.push(''); }
  L.push('## 4. Filer', '');
  L.push('| fil | vad |', '|---|---|');
  L.push(`| \`rapport.json\` | allt på en tidslinje (${linje.length} händelser, datorns klocka; \`rel\` = sekunder från trycket, \`sida\` dator/telefon/bord) |`);
  L.push(`| \`mattan.json\` | mattan vid trycket: mitt bord (${((p.matta && p.matta.mig) || []).length} kort) och motståndarnas utlagda kort |`);
  if (p.bordLogg) L.push(`| \`bordlogg.json\` | telefonens bord (${p.bordLogg.rader.length} rader${p.bordLogg.kapad ? ', kapad' : ''}), fallformatet: \`node dev/dubbletter.cjs --logg\` · uppspelaren |`);
  L.push('| `paket.json` | paketet som datorn laddade upp, orört |');
  for (const f of filer) L.push(`| \`${f}\` | ${f === 'telefon-diagnos.json' ? 'telefonens diagnosfil vid trycket: `node dev/kamerabank.cjs --diagnos`' : /^bilder\//.test(f) ? 'stillbild från telefonen' : ''} |`);
  L.push('');
  L.push(`Lådan: datorn ${(p.ladaStat && p.ladaStat.n) || (p.lada || []).length} händelser, telefonen ${tel && tel.lada ? tel.lada.length : 0}. Hur paketet byggs: \`dev/rapport/LÄS-MIG.md\`.`);
  return L.join('\n') + '\n';
}

function bygg(p, rad, filer, ut, konto) {
  fs.mkdirSync(ut, { recursive: true });
  const linje = tidslinje(p);
  fs.writeFileSync(path.join(ut, 'paket.json'), JSON.stringify(p));
  fs.writeFileSync(path.join(ut, 'rapport.json'), JSON.stringify({ kod: p.kod, rad: rad || null, text: p.text, tagg: p.tagg, frys: p.frys, frysIso: p.frysIso, vy: p.vy, miljo: p.miljo,
    telefon: p.telefon ? { svarade: p.telefon.svarade, offset: p.telefon.offset, rtt: p.telefon.rtt, miljo: p.telefon.miljo } : null, tidslinje: linje }, null, 1));
  fs.writeFileSync(path.join(ut, 'mattan.json'), JSON.stringify(p.matta, null, 1));
  if (p.bordLogg) fs.writeFileSync(path.join(ut, 'bordlogg.json'), JSON.stringify({ id: 'rapport-' + p.kod, app: 'mesa', v: 1, start: new Date(p.bordLogg.start).toISOString(), spel: p.miljo && p.miljo.spelId, kapad: p.bordLogg.kapad, rapport: p.kod, bordLogg: p.bordLogg.rader }));
  fs.writeFileSync(path.join(ut, 'LÄS-MIG.md'), lasMig(p, rad, linje, filer, konto));
  return linje;
}

async function main() {
  const a = process.argv.slice(2), arg = (n) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : null; };
  const fil = arg('--fil');
  if (fil) {
    const p = lasJson(fs.readFileSync(fil));
    const ut = arg('--ut') || path.join(ROT, 'dev', 'diagnos', 'rapporter', p.kod || 'lokal');
    const linje = bygg(p, null, [], ut, null);
    console.log(`${p.kod || 'paketet'}: ${linje.length} händelser på tidslinjen → ${path.relative(process.cwd(), ut)}/LÄS-MIG.md`);
    return;
  }
  const kod = a.find(x => /^R-\d{4,}$/i.test(x));
  if (!kod) { console.error('Kör: node dev/rapport/hamta.cjs R-0412   (eller --fil paket.json)'); process.exit(2); }
  const S = supa();
  const [rad] = await S.rest('GET', `rapporter?kod=eq.${encodeURIComponent(kod.toUpperCase())}&select=*`);
  if (!rad) { console.error(`${kod} finns inte i tabellen rapporter.`); process.exit(1); }
  const ut = path.join(ROT, 'dev', 'diagnos', 'rapporter', rad.kod);
  const filer = await S.lista(rad.sokvag);
  let paket = null;
  const sparade = [];
  for (const f of filer) {
    const buf = await S.hamtaFil(rad.sokvag + '/' + f.namn);
    if (/^rapport\.json(\.gz)?$/.test(f.namn)) { paket = lasJson(buf); continue; }
    fs.mkdirSync(path.dirname(path.join(ut, f.namn)), { recursive: true });
    fs.writeFileSync(path.join(ut, f.namn), buf);
    sparade.push(f.namn);
  }
  const konto = await S.konto(rad.user_id);
  if (!paket) {
    /* En felrapport (kalla 'fel') har inget paket: allt står i raden. */
    paket = { kod: rad.kod, text: rad.text, tagg: rad.tagg, frys: Date.parse(rad.created_at), frysIso: rad.created_at, vy: rad.vy, miljo: {}, lada: (rad.vy && rad.vy.senaste) || [], matta: null, bordLogg: null, telefon: null };
  }
  paket.kod = rad.kod;
  const linje = bygg(paket, rad, sparade, ut, konto);
  console.log(`${rad.kod} (${rad.kalla}, ${rad.created_at.slice(0, 16).replace('T', ' ')}): ${linje.length} händelser, ${sparade.length} filer till → ${path.relative(process.cwd(), ut)}/LÄS-MIG.md`);
}

if (require.main === module) main().catch(e => { console.error('hamta: ' + e.message); process.exit(1); });
module.exports = { bygg, tidslinje, lasJson };

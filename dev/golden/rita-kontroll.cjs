#!/usr/bin/env node
/* Kontrollen av det som ritats i rita.html (MES-286). Mätverktyg, inte appkod.

   Kör från repots rot:
     node dev/golden/rita-kontroll.cjs                  allt som ritats
     node dev/golden/rita-kontroll.cjs --fall 14,mes    bara fall/källor vars id börjar så
     node dev/golden/rita-kontroll.cjs --hogbank ut.json  skriv också fall i högbänkens format
     node dev/golden/rita-kontroll.cjs --hamta-typer    hämta korttyperna för lek.txt från Scryfall
     node dev/golden/rita-kontroll.cjs --fil <fil>      en enda facit.json eller lagen.json, var den än ligger
                                                        (rita-prov.cjs använder det på tillfälliga filer)

   Per ritat golden-fall (facit.json med blocket "rita") och per lagen.json:
     1. räknar om allt framräknat ur hörnen och ordningen (rita-geometri.cjs)
        och jämför med det som står i filen
     2. kontrollerar namnen: lekens kort mot lek.txt, "token <typ>" och
        "baksida" bara utanför kort[]
     3. i en video: antalet kort per namn i varje läge mot händelsefacit
        (rita-handelser.cjs) — i passet också tappade per namn och fästa par
   Slutkod 1 vid en enda avvikelse, 2 om något inte gick att läsa. Antalet
   mot händelsefacit fäller bara lägen som är markerade klara (D i
   rita.html); i ett halvritat läge skrivs avvikelserna ut med en punkt.
   Exporten till högbänken tar bara klara lägen.

   Med --hogbank skrivs en post per hög (n, tappade), per fäst par (vilket
   kort som ligger över och under) och per ensamt kort, med lådan runt
   korten — samma format som dev/hogbank/facit.json på grenen
   mes-250-hoglasning. .cjs eftersom package.json säger "type": "module". */
'use strict';
const fs = require('fs'), path = require('path');
const G = require('./rita-geometri.cjs'), Hd = require('./rita-handelser.cjs');
const ROT = path.join(__dirname, '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const FALL = (arg('--fall', '') || '').split(',').filter(Boolean);
const HOGBANK = arg('--hogbank', '');
const FIL = arg('--fil', '');
const valt = id => !FALL.length || FALL.some(p => id.startsWith(p));
const las = f => fs.readFileSync(path.join(ROT, f), 'utf8');

const LEK = las('dev/golden/lek.txt').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#')).map(s => s.replace(/^\d+\s*[xX]?\s+/, ''));
const TYPFIL = 'dev/golden/rita-typer.json';

/* ── --hamta-typer ────────────────────────────────────────────────────── */
async function hamtaTyper() {
  const typer = {};
  for (let i = 0; i < LEK.length; i += 75) {
    const svar = await fetch('https://api.scryfall.com/cards/collection', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mesa-golden/1.0', Accept: 'application/json' },
      body: JSON.stringify({ identifiers: LEK.slice(i, i + 75).map(name => ({ name })) }),
    });
    if (!svar.ok) throw new Error('Scryfall svarade ' + svar.status);
    const d = await svar.json();
    for (const k of d.data) typer[k.name] = k.type_line;
    if (d.not_found && d.not_found.length) throw new Error('Scryfall hittade inte: ' + d.not_found.map(x => x.name).join(', '));
  }
  const ut = { _: 'Korttyperna för namnen i lek.txt, hämtade en gång från Scryfall (node dev/golden/rita-kontroll.cjs --hamta-typer). Ritverktyget föreslår fäst ur dem: ett equipment eller en aura omlott med en varelse eller en token.', hamtad: new Date().toISOString().slice(0, 10), typer: {} };
  for (const n of LEK) ut.typer[n] = typer[n];
  fs.writeFileSync(path.join(ROT, TYPFIL), G.formatera(ut) + '\n');
  console.log(`${TYPFIL}: ${LEK.length} namn`);
}

/* ── Jämförelsen ──────────────────────────────────────────────────────── */
const FALT = [['synlig', 0.0101], ['namnrad', 0.0101], ['tappad'], ['hog'], ['dold'], ['avskuret']];
const LADA = [['x', 0.00011], ['y', 0.00011], ['w', 0.00011], ['h', 0.00011]];
function jamforKort(stored, raknat, medLada, var_) {
  const fel = [];
  const falt = medLada ? FALT.concat(LADA) : FALT;
  for (const [f, tol] of falt) {
    let s = stored[f], r = raknat[f];
    if (f === 'dold' || f === 'avskuret' || f === 'tappad') { s = !!s; r = !!r; }
    if (f === 'hog') { s = s || null; r = r || null; }
    const lika = tol ? (s != null && r != null && Math.abs(s - r) <= tol) || (s == null && r == null) : s === r;
    if (!lika) fel.push(`${var_} ${stored.namn || '(utan namn)'} (id ${stored.id}): ${f} står ${JSON.stringify(s)}, räknas ${JSON.stringify(r)}`);
  }
  return fel;
}
function kollaForm(kort, var_) {
  const fel = [], ids = new Set(), z = new Set();
  for (const k of kort) {
    if (!Array.isArray(k.horn) || k.horn.length !== 4 || !k.horn.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))) fel.push(`${var_} ${k.namn}: horn saknas eller är trasigt`);
    if (k.id == null || ids.has(k.id)) fel.push(`${var_} ${k.namn}: id ${k.id} saknas eller finns två gånger`);
    if (!Number.isFinite(k.z) || z.has(k.z)) fel.push(`${var_} ${k.namn}: z ${k.z} saknas eller finns två gånger`);
    ids.add(k.id); z.add(k.z);
  }
  return fel;
}
function kollaNamn(k, var_, iKort) {
  const n = String(k.namn || '').trim();
  if (!n) return [`${var_} id ${k.id}: saknar namn`];
  if (G.arToken(n) || G.arBaksida(n)) return iKort ? [`${var_} ${n}: en token eller baksida hör inte hemma i kort[] (kor.html räknar den som ett kort)`] : [];
  return LEK.includes(n) ? [] : [`${var_} ${n}: finns inte i lek.txt`];
}

/* ── Golden-fallen ────────────────────────────────────────────────────── */
function kontrolleraFoto(id, facit) {
  const r = facit.rita, fel = [];
  const W = r.bredd, H = r.hojd, grund = (facit.ruta && facit.ruta.upp) || 'v';
  if (!(W > 0 && H > 0)) return { fel: ['rita.bredd/rita.hojd saknas'], kort: [] };
  const iKort = (facit.kort || []).filter(k => k.horn), utanHorn = (facit.kort || []).filter(k => !k.horn);
  for (const k of utanHorn) fel.push(`kort ${k.namn}: saknar horn — facit är bara delvis ritat`);
  const ovriga = r.ovriga || [];
  const alla = iKort.concat(ovriga);
  fel.push(...kollaForm(alla, 'kort'));
  if (fel.length) return { fel, kort: alla, W, H, grund };
  const raknat = G.raknaKort(alla, { W, H, grund });
  for (const k of iKort) {
    fel.push(...jamforKort(k, raknat[k.id], r.lada !== false, 'kort'), ...kollaNamn(k, 'kort', true));
    if (raknat[k.id].avskuret) fel.push(`kort ${k.namn}: är avskuret men står i kort[] (ska stå i avskurna)`);
    if (k.zon) fel.push(`kort ${k.namn}: ligger i zonen ${k.zon} men står i kort[]`);
  }
  for (const k of ovriga) {
    fel.push(...jamforKort(k, raknat[k.id], false, 'övrigt'), ...kollaNamn(k, 'övrigt', false));
    if (G.arLekkort(k.namn) && !raknat[k.id].avskuret && !k.zon) fel.push(`övrigt ${k.namn}: ett av lekens kort, inte avskuret och inte i en zon — hör hemma i kort[]`);
  }
  const avsk = ovriga.filter(k => G.arLekkort(k.namn) && raknat[k.id].avskuret && !k.zon).map(k => k.namn).sort();
  const stod = (facit.avskurna || []).slice().sort();
  if (JSON.stringify(avsk) !== JSON.stringify(stod)) fel.push(`avskurna står ${JSON.stringify(stod)}, ritat ${JSON.stringify(avsk)}`);
  for (const f of G.fastFel(alla, W, H)) fel.push(`${f.namn} (id ${f.id}): ${f.fel}`);
  return { fel, kort: alla, W, H, grund, raknat };
}

/* ── Videolägena ──────────────────────────────────────────────────────── */
function kontrolleraVideo(id, cfg, lagen) {
  const fel = [], info = [], W = lagen.bredd, H = lagen.hojd, grund = lagen.grund || cfg.grund || 'v';
  if (!(W > 0 && H > 0)) return { fel: ['bredd/hojd saknas'], info, lagen: [] };
  const filer = cfg.handelser ? { handelser: las(cfg.handelser) } : { steg: las(cfg.steg), manus: las(cfg.manus) };
  const u = Hd.underlag(cfg, filer, LEK);
  let tidigare = {}, anvanda = [], forraT = -Infinity;
  const ut = [];
  const lista = (lagen.lagen || []).slice().sort((a, b) => a.t - b.t);
  for (const l of lista) {
    const v = `läge ${l.t} s:`;
    const kort = l.kort || [];
    const f0 = kollaForm(kort, v);
    fel.push(...f0);
    if (f0.length) { forraT = l.t; continue; }
    const raknat = G.raknaKort(kort, { W, H, grund, tidigare, anvanda });
    for (const k of kort) fel.push(...jamforKort(k, raknat[k.id], true, v), ...kollaNamn(k, v, false));
    for (const f of G.fastFel(kort, W, H)) fel.push(`${v} ${f.namn} (id ${f.id}): ${f.fel}`);
    /* Antalet mot händelsefacit fäller bara ett läge som är markerat klart —
       ett halvritat läge får checkas in. Det skrivs ut ändå. */
    const dom = Hd.jamfor(kort, u.vantat(l.t));
    for (const a of dom.avvikelser) (l.klar ? fel : info).push(`${v} ${Hd.avvikelseText(a)}${l.klar ? '' : ' (läget inte klart)'}`);
    const mellan = u.mellan(forraT === -Infinity ? -1 : forraT, l.t).map(h => h.text);
    if (JSON.stringify(mellan) !== JSON.stringify((l.handelser || []).map(h => h.text)))
      fel.push(`${v} händelserna före läget stämmer inte med händelsefacit — öppna källan i rita.html och spara om`);
    tidigare = {}; for (const k of kort) if (raknat[k.id].hog) tidigare[k.id] = raknat[k.id].hog;
    anvanda = [...new Set(anvanda.concat(Object.values(tidigare)))];
    forraT = l.t;
    ut.push({ t: l.t, kort, raknat, klar: !!l.klar, rad: dom.rad });
  }
  return { fel, info, lagen: ut, W, H, grund };
}

/* ── Högbänkens format ─────────────────────────────────────────────────── */
function jpegStorlek(fil) {
  const b = fs.readFileSync(fil);
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xFF) { i++; continue; }
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { hojd: b.readUInt16BE(i + 5), bredd: b.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}
const median = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/* En bild (foto eller läge) → poster. W, H: bildens px för geometrin. */
function hogbankPoster(kalla, s, kort, raknat, W, H) {
  const iSpel = k => !k.zon && G.arLekkort(k.namn) && !raknat[k.id].avskuret;
  const spel = kort.filter(iSpel);
  const ladaFor = grupp => {
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (const k of grupp) for (const [x, y] of k.horn) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(1, x1); y1 = Math.min(1, y1);
    return { x: +x0.toFixed(3), y: +y0.toFixed(3), w: +(x1 - x0).toFixed(3), h: +(y1 - y0).toFixed(3) };
  };
  const poster = [], iGrupp = new Set();
  const forled = kalla + (s != null ? '-' + String(s).replace('.', '_') : '');
  const hogar = {};
  for (const k of kort) { const b = raknat[k.id].hog; if (b) (hogar[b] = hogar[b] || []).push(k); }
  for (const [b, grupp] of Object.entries(hogar)) {
    for (const k of grupp) iGrupp.add(k.id);
    if (!grupp.every(iSpel)) continue;   // en token eller ett avskuret kort i högen: inget högbänken kan fråga om
    const topp = grupp.reduce((a, k) => k.z > a.z ? k : a);
    const lika = grupp.filter(k => k.namn === topp.namn), andra = grupp.filter(k => k.namn !== topp.namn);
    const under = [...new Set(andra.filter(k => !raknat[k.id].dold).map(k => k.namn))].sort();
    const annat = [...new Set(andra.filter(k => raknat[k.id].dold).map(k => k.namn))].sort();
    const post = { id: `${forled}-hog-${b.toLowerCase()}-${slug(topp.namn)}-${lika.length}`, typ: 'hog', kalla, s: s == null ? undefined : s, lada: ladaFor(grupp), namn: topp.namn,
      vantat: { n: lika.length, tappade: lika.filter(k => raknat[k.id].tappad).length, under: under.length ? (under.length === 1 ? under[0] : under) : null } };
    if (annat.length) post.annat = annat;
    poster.push(post);
  }
  for (const k of kort) {
    if (k.fast == null || iGrupp.has(k.id)) continue;
    const v = kort.find(o => o.id === k.fast);
    if (!v || iGrupp.has(v.id) || !iSpel(k) || !iSpel(v)) { iGrupp.add(k.id); if (v) iGrupp.add(v.id); continue; }
    iGrupp.add(k.id); iGrupp.add(v.id);
    const [topp, under] = k.z > v.z ? [k, v] : [v, k];
    poster.push({ id: `${forled}-par-${slug(topp.namn)}-pa-${slug(under.namn)}`, typ: 'par', kalla, s: s == null ? undefined : s, lada: ladaFor([k, v]), namn: topp.namn,
      vantat: { n: 1, topp: topp.namn, under: under.namn } });
  }
  for (const k of spel) {
    if (iGrupp.has(k.id)) continue;
    poster.push({ id: `${forled}-${slug(k.namn)}-${k.id}`, typ: 'ensam', kalla, s: s == null ? undefined : s, lada: ladaFor([k]), namn: k.namn, vantat: { n: 1, under: null, over: null } });
  }
  return poster.map(p => JSON.parse(JSON.stringify(p)));
}

/* ── Huvudprogrammet ──────────────────────────────────────────────────── */
async function main() {
  if (process.argv.includes('--hamta-typer')) return hamtaTyper();
  const kallor = JSON.parse(las('dev/golden/rita-kallor.json'));
  let typer = {};
  try { typer = JSON.parse(las(TYPFIL)).typer; } catch (e) { console.log(`VARNING: ${TYPFIL} gick inte att läsa — kör --hamta-typer`); }
  const saknarTyp = LEK.filter(n => !typer[n]);
  let avvikelser = 0, antalRitade = 0;
  const bank = { _: 'Skriven av node dev/golden/rita-kontroll.cjs --hogbank ur det som ritats i rita.html (MES-286). Samma format som dev/hogbank/facit.json. namn = det översta kortets namn. vantat.n = kort i högen med samma namn som det översta, under = andra namn i högen vars namnrad syns, annat = andra namn i högen vars namnrad inte syns (tolereras). par: det fästa paret, topp över och under under.', kallor: {}, fall: [] };
  if (saknarTyp.length) { console.log(`✗ ${TYPFIL} saknar typen för: ${saknarTyp.join(', ')} — kör --hamta-typer`); avvikelser += saknarTyp.length; }

  const fallMapp = path.join(ROT, 'dev', 'golden', 'fall');
  /* --fil: en enda fil. En lagen.json känns igen på lagen[] och säger själv
     vilken källa den hör till; en facit.json får sitt id ur mappnamnet. */
  let enFil = null;
  if (FIL) {
    enFil = JSON.parse(fs.readFileSync(path.resolve(FIL), 'utf8'));
    if (Array.isArray(enFil.lagen) && !(kallor.videor || {})[enFil.kalla]) throw new Error(`${FIL}: okänd källa ${enFil.kalla} (rita-kallor.json)`);
  }
  const fotoFiler = FIL ? (Array.isArray(enFil.lagen) ? [] : [[path.basename(path.dirname(path.resolve(FIL))), path.resolve(FIL)]])
    : fs.readdirSync(fallMapp).sort().map(id => [id, path.join(fallMapp, id, 'facit.json')]);
  for (const [id, fil] of fotoFiler) {
    if (!fs.existsSync(fil) || (!FIL && !valt(id))) continue;
    let facit;
    try { facit = JSON.parse(fs.readFileSync(fil, 'utf8')); } catch (e) { console.log(`✗ ${id}: facit.json går inte att läsa: ${e.message}`); process.exitCode = 2; continue; }
    if (!facit.rita) continue;
    antalRitade++;
    const r = kontrolleraFoto(id, facit);
    const n = r.kort.length, dolda = r.raknat ? r.kort.filter(k => r.raknat[k.id].dold && G.arLekkort(k.namn)).length : 0;
    const hogar = r.raknat ? new Set(Object.values(r.raknat).map(x => x.hog).filter(Boolean)).size : 0;
    console.log(`${r.fel.length ? '✗' : '✓'} ${id}: ${n} kort ritade (${dolda} dolda, ${hogar} högar, ${r.kort.filter(k => k.fast != null).length} fästa)${r.fel.length ? ` — ${r.fel.length} avvikelser` : ''}`);
    for (const f of r.fel) console.log('    ' + f);
    avvikelser += r.fel.length;
    if (HOGBANK && r.raknat) {
      const kalla = 'rita-' + id.slice(0, 2);
      const bildFil = path.join('dev', 'golden', 'fall', id, 'bild.jpg');
      const st = fs.existsSync(path.join(ROT, bildFil)) ? jpegStorlek(path.join(ROT, bildFil)) : { bredd: r.W, hojd: r.H };
      const kortPx = Math.round(median(r.kort.filter(k => G.arLekkort(k.namn)).map(k => G.bredd(k.horn, st.bredd, st.hojd))));
      bank.kallor[kalla] = { bild: bildFil, kortPx, grundLodrat: r.grund !== 'h' };
      bank.fall.push(...hogbankPoster(kalla, null, r.kort, r.raknat, r.W, r.H));
    }
  }

  const videoFiler = FIL ? (Array.isArray(enFil.lagen) ? [[enFil.kalla, kallor.videor[enFil.kalla], path.resolve(FIL)]] : [])
    : Object.entries(kallor.videor || {}).map(([kid, cfg]) => [kid, cfg, path.join(ROT, cfg.mapp, 'lagen.json')]);
  for (const [kid, cfg, fil] of videoFiler) {
    if (!fs.existsSync(fil) || (!FIL && !valt(kid))) continue;
    let lagen;
    try { lagen = JSON.parse(fs.readFileSync(fil, 'utf8')); } catch (e) { console.log(`✗ ${kid}: lagen.json går inte att läsa: ${e.message}`); process.exitCode = 2; continue; }
    antalRitade++;
    const r = kontrolleraVideo(kid, cfg, lagen);
    const klara = r.lagen.filter(l => l.klar).length;
    console.log(`${r.fel.length ? '✗' : '✓'} ${kid}: ${r.lagen.length} lägen ritade (${klara} markerade klara), ${r.lagen.reduce((a, l) => a + l.kort.length, 0)} kort${r.fel.length ? ` — ${r.fel.length} avvikelser` : ''}`);
    for (const f of r.fel) console.log('    ' + f);
    for (const f of r.info) console.log('    · ' + f);
    avvikelser += r.fel.length;
    if (HOGBANK) {
      /* Bara klara lägen: ett halvritat läge har kort som saknas, och de hade blivit fel facit. */
      const kalla = 'rita-' + kid;
      const kortPx = Math.round(median([].concat(...r.lagen.map(l => l.kort.filter(k => G.arLekkort(k.namn)).map(k => G.bredd(k.horn, r.W, r.H))))) || 0);
      bank.kallor[kalla] = { video: cfg.video, kortPx, grundLodrat: r.grund !== 'h' };
      for (const l of r.lagen.filter(x => x.klar)) bank.fall.push(...hogbankPoster(kalla, l.t, l.kort, l.raknat, r.W, r.H));
    }
  }

  if (!antalRitade) console.log('Inget ritat än: inget golden-fall har blocket "rita" och ingen lagen.json finns.');
  if (HOGBANK) {
    fs.writeFileSync(path.resolve(HOGBANK), G.formatera(bank) + '\n');
    const typerN = {}; for (const f of bank.fall) typerN[f.typ] = (typerN[f.typ] || 0) + 1;
    console.log(`högbänken: ${bank.fall.length} fall (${Object.entries(typerN).map(([k, v]) => `${v} ${k}`).join(', ') || 'inga'}) → ${HOGBANK}`);
  }
  console.log(avvikelser ? `\n${avvikelser} avvikelser.` : `\n0 avvikelser${antalRitade ? ` i ${antalRitade} ritade källor` : ''}.`);
  if (avvikelser) process.exitCode = 1;
}
main().catch(e => { console.error(e); process.exit(2); });

/* Problemrapporten D (MES-368): en rapport blir något som mäter.

   Kör (efter node dev/rapport/hamta.cjs <kod>, som lägger rapporten i
   dev/diagnos/rapporter/<kod>/):

     node dev/rapport/till-fall.cjs R-0412 --mattest     ett fall i Mat test (mattans beteende)
     node dev/rapport/till-fall.cjs R-0413 --bank        ett bänkfall (fel namn): beskärningen + rätt namn
     node dev/rapport/till-fall.cjs R-0413 --traning     träningsdata i mark.py:s format (MES-340)
     node dev/rapport/till-fall.cjs --mattest --logg pass.json [--orden orden.tsv] [--id p1011] [--spelkod CNA43K]
                                                         ett pass utan rapportkod (bordsloggen ur appen)

   Val:  --mapp <dir>   den hämtade mappen (förval dev/diagnos/rapporter/<kod>/)
         --orden <tsv>  spelarens ord som facit-rader (se nedan); för ett pass utan rapport
         --id <id>      fallets id i Mat test (förval: koden, eller p<MMDD> ur loggens namn)
         --fran/--till  sekunder i bordsloggen (förval: hela)
         --lek <fil>    leken i lek.txt-form ("4 Island" per rad): mattans antalsregel ("fler än
                        leken" → Name this card) gäller då i uppspelningen, som i spelet
         --spar <id> --ratt <namn> [--vid <s>]   --bank/--traning ur en rapport (inte en rättelse):
                        vilket SPÅR och vilket namn (spelaren sa det i orden). Bilden är läsningens
                        beskärning av spåret (bilder/beskarning-spar<id>-*.jpg, den närmast --vid),
                        annars spårets ruta utskuren ur stillbilden närmast --vid (sekunder relativt
                        trycket, som rel i stillbilder.json; förval den senaste), med korten som
                        ligger över det målade grå. Fallet får ruta, maskade och en kontextbild.
                        --bild <stillbild> tillsammans med --spar: skär ur just den bilden.
                        --bild utan --spar vägras (slutkod 2): en hel bordsbild är aldrig facit.
         --utan-ruta    --traning av en rättelse som saknar ruta eller maskade (en äldre, som
                        R-0008): bara när du själv sett att bilden visar rätt kort
         --lokal        rör inte tabellen (prov, eller ingen nyckel); spärren i repot gäller ändå
         --torr         skriv inget, sätt inget: visa vad som skulle hända
         --skriv-over   ett fall med samma id finns: skriv över det

   SPÄRREN (sparr.cjs): --mattest och --bank gör rapporten till test,
   --traning till träning, och en rapport är aldrig båda. Tabellens
   anvandning sätts FÖRST (med service role) och byts aldrig; koden får
   inte heller finnas på andra sidan i repot. --bank ↔ --traning gäller
   per parti; --mattest bara sin egen rapport (ett Mat test-fall kör aldrig
   bildmodellen). Säger spärren nej skrivs ingenting och slutkoden är 3.

   Rapportkoden skrivs i klartext i varje fall det skapar (fall.json,
   bänkens manifest.json, markning.json), så att lista.cjs --raderade +
   `grep -r <kod> dev/` hittar kopiorna när spelaren raderat sin rapport.

   ── Facit för Mat test: spelarens rättelser + orden ─────────────────────
   Utgångsläget är vad kameran gjorde med mattan: rapportens mattändringar
   (slag 'matta', av kameran), eller, för ett pass utan dem, kamerans
   påståenden ur bordsloggen (ett spår får ett säkert namn = utspel, spåret
   borta = borttaget, samma namn på ett nytt spår inom 8 s = flytt, tappat
   i minst 1 s = tap). Det spelaren ändrade är det rätta och vinner:
     - spelaren byter namn          → kortet hette det nya namnet hela tiden
     - spelaren tar bort ett kort från bordet (typ tar_bort — inte en flytt
       till graveyard eller handen) som kameran lade dit medan ett kort med
       samma namn redan låg på mattan, eller, med snabbvalet "A card appeared
       that I didn't play", den borttagning som ligger närmast trycket
                                    → utspelet stryks: det var en dubblett
     - spelaren tar bort något annat → borttaget (kameran missade det)
     - spelaren lägger dit / flyttar tillbaka ett kort kameran tagit bort
       inom 60 s                     → kamerans borttagning stryks
     - spelaren lägger dit ett kort → utspel (kameran missade det)
     - spelaren tappar/otappar      → kamerans motsatta tap inom 60 s stryks,
                                       annars är spelarens tap facit
     - spelaren vrider tillbaka sitt eget tap med Undo i toasten eller
       Follow camera (MES-385)       → kameran hade rätt: spelarens tap stryks,
                                       eller kamerans tap som det strök gäller igen.
       Undo/Follow camera = en rad angrad eller folj_kameran för kortet inom
       2 s i en rättelse av handlingar (vy.handlingar), annars att det skedde
       inom EGET_ANGRA_S (10 s; toasten står i 4 s). Ett untap senare är ett
       riktigt untap: det riktiga kortet vreds tillbaka
   Orden (--orden, en TSV) är samma sak med spelarens röst: kolumnerna
   t (sekund i bordsloggen), gor (stryk | lagg), typ (spelar, tar_bort,
   flyttar, tappar, otappar), kort, till, text. `stryk` tar bort kamerans
   händelse med typen och namnet närmast t (±10 s); `lagg` lägger till en.
   Det som ingen rättade antas vara rätt — fallet underskattar alltså felen,
   det hittar inte på dem. Facit står i fall.json med varje rads källa
   (kamera | spelare | orden) och det som ströks; justera för hand där om
   det behövs, och skriv varför i `anm`.

   ── Spärren per parti ───────────────────────────────────────────────────
   Varje fall får partiets nyckel `parti: { game_id, spelkod }` (game_id ur
   tabellen, annars rapportens miljo.spelId / bordsloggens spel; spelkoden ur
   rattelse.json, miljo.spel eller bordsloggens spelkod — för ett pass utan
   rapport, där bordsloggen inte bär den: --spelkod <kod>), och spärren vägrar när en annan rad eller
   kopia ur samma parti ligger på andra sidan. Saknas båda: spärren gäller
   per kod, och en VARNING skrivs.

   ── Var kortet låg: ruta, maskade, kontext ───────────────────────────────
   Ett bänkfall eller en träningsbild ur en rapport ska säga VILKET kort på
   bordet det är, också i en hög (Jespers krav 2026-10-13: en modell får
   aldrig tränas på fel data). Därför:
     - ruta     spårets låda i kamerabilden (andelar, + bildens mått och kalla)
     - maskade  de lådor som målades grå (korten som ligger ÖVER spåret), med spår
     - kontext  ett utsnitt runt kortet (rutan + en rutas bredd/höjd åt varje
                håll, aldrig hela bordet) med rutan inritad (<fil>-kontext.jpg
                i bänken, kontext.jpg i träningen); kontext_bild.utsnitt = dess
                läge i bilden (andelar)
   --traning kräver ruta och maskade (en rättelse utan dem: --utan-ruta), och
   en bild där kortets bredd är minst MIN_TRAN_PX. Stillbildernas spårnamn är
   ALDRIG facit: namnet kommer från spelaren (--ratt, eller rättelsens ratt).

   Inget här frågar Claude. Service role ur .env.local. */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto'), os = require('os'), { spawnSync } = require('child_process');
const { supa, ROT } = require('./supa.cjs');
const { kravLokal, sattAnvandning, harParti, partiNycklar, kopiorDetalj } = require('./sparr.cjs');
const KOD_RE = /^R-\d{4,}$/, ID_RE = /^[\w-]+$/;
/* Partiets nyckel { game_id, spelkod } (null-fält tas bort), eller null. */
function parti(game_id, spelkod) {
  const p = {};
  if (game_id && /^[0-9a-f-]{8,}$/i.test(String(game_id))) p.game_id = String(game_id).toLowerCase();
  if (spelkod && /^[\w-]{2,}$/.test(String(spelkod))) p.spelkod = String(spelkod).toUpperCase();
  return Object.keys(p).length ? p : null;
}

/* MESA_FALL_UT: en annan rot för allt som skrivs (provet prov-d.cjs skriver i en tillfällig mapp). */
const UTROT = process.env.MESA_FALL_UT ? path.resolve(process.env.MESA_FALL_UT) : ROT;
const MATTEST = path.join(UTROT, 'dev', 'mattest', 'underlag', 'rapporter');
const BANK = path.join(UTROT, 'dev', 'remsa', 'rapportbank');
const MARKNING = path.join(UTROT, 'dev', 'material', 'arbete', 'markning');
const TRANPASS = 'rapporter-traning-mesa';   // passmappens namn: '-traning-' gör den till träning för delning.py

const FLYTT_S = 8, TAPP_S = 1, ANGRA_S = 60, STRYK_S = 10, EGET_ANGRA_S = 10;

/* ── B:s rättelse (MES-366) ───────────────────────────────────────────────
   Kontraktet: en rad i rapporter med kalla 'rattelse', och under radens
   sokvag två filer — beskarning.jpg och rattelse.json =
   { gissning, varfor, ratt, spelkod, t, spar, handelse: 'namnbyte' |
   'name_this_card' | 'borttaget', bild, ruta, maskade, kontext } och, när
   telefonen hade spåret i ringen, kontext.jpg. hamta.cjs lägger dem i mappen.
   Avviker B:s format: ändra BARA den här funktionen. */
function lasRattelse(mapp) {
  const fil = path.join(mapp, 'rattelse.json');
  if (!fs.existsSync(fil)) return null;
  const r = JSON.parse(fs.readFileSync(fil, 'utf8'));
  const bild = ['beskarning.jpg', 'beskarning.jpeg', 'beskarning.png'].map(f => path.join(mapp, f)).find(f => fs.existsSync(f)) || null;
  const kontext = fs.existsSync(path.join(mapp, 'kontext.jpg')) ? path.join(mapp, 'kontext.jpg') : null;
  return {
    bild, ratt: r.ratt || null, gissning: r.gissning || null, varfor: r.varfor || null,
    handelse: r.handelse || null, spelkod: r.spelkod || null, t: r.t != null ? r.t : null, spar: r.spar != null ? r.spar : null,
    /* var kortet låg (uppföljning av MES-366/368); en äldre rättelse har inga av dem */
    ruta: r.ruta || null, maskade: Array.isArray(r.maskade) ? r.maskade : null, kontext, kontextInfo: r.kontext || null, kontextSkal: r.kontextSkal || null, bildKalla: r.bild || null
  };
}

/* ── facit ur kamerans händelser och spelarens rättelser ─────────────────── */

/* Kamerans påståenden ur bordsloggen, i mattändringarnas form
   ({ s, typ, kort, id, till, av: 'kamera' }). */
function kameranUrBordsloggen(rader) {
  const ut = [], spar = new Map(), borta = [];   // borta: { namn, s, id, klar } väntar FLYTT_S på ett nytt spår
  const saker = t => t.namn && t.saker ? t.namn : null;
  for (const r of rader) {
    const nu = new Map((r.spar || []).map(t => [t.id, t]));
    /* spår som försvann */
    for (const [id, st] of spar) if (!nu.has(id)) {
      if (st.namn) borta.push({ namn: st.namn, s: r.s, id, tappad: st.tappad, st });
      spar.delete(id);
    }
    /* borttagna som inte kom tillbaka */
    for (let i = borta.length - 1; i >= 0; i--) if (r.s - borta[i].s > FLYTT_S) { const b = borta.splice(i, 1)[0]; ut.push({ s: b.s, typ: 'tar_bort', kort: b.namn, id: 'spår ' + b.id, av: 'kamera' }); }
    for (const [id, t] of nu) {
      let st = spar.get(id);
      if (!st) {
        /* samma spår tillbaka efter ett glapp (en rapport utan det, ett skymt ögonblick): inget hände */
        const j = borta.findIndex(b => b.id === id);
        if (j >= 0) st = borta.splice(j, 1)[0].st;
        else st = { namn: null, tappad: false, tappKand: null };
        spar.set(id, st);
      }
      const n = saker(t);
      if (n && !st.namn) {
        const j = borta.findIndex(b => b.namn === n);
        if (j >= 0) { const b = borta.splice(j, 1)[0]; ut.push({ s: r.s, typ: 'flyttar', kort: n, id: 'spår ' + id, fran: 'spår ' + b.id, till: 'plats', av: 'kamera' }); st.tappad = !!b.tappad; }
        else { ut.push({ s: r.s, typ: 'spelar', kort: n, id: 'spår ' + id, till: 'mattan', av: 'kamera' }); st.tappad = !!t.tappad; }
        st.namn = n; continue;
      }
      if (n && st.namn && n !== st.namn) { ut.push({ s: r.s, typ: 'namn', fran: st.namn, kort: n, id: 'spår ' + id, av: 'kamera' }); st.namn = n; }
      if (!st.namn) continue;
      const tp = !!t.tappad;
      if (tp === st.tappad) st.tappKand = null;
      else if (!st.tappKand) st.tappKand = r.s;
      else if (r.s - st.tappKand >= TAPP_S) { ut.push({ s: st.tappKand, typ: tp ? 'tappar' : 'otappar', kort: st.namn, id: 'spår ' + id, av: 'kamera' }); st.tappad = tp; st.tappKand = null; }
    }
  }
  const sista = rader.length ? rader[rader.length - 1].s : 0;
  for (const b of borta) if (sista - b.s > FLYTT_S) ut.push({ s: b.s, typ: 'tar_bort', kort: b.namn, id: 'spår ' + b.id, av: 'kamera' });
  return ut.sort((a, b) => a.s - b.s);
}

const UT = new Set(['graveyard', 'exile', 'hand', 'handen', 'library', 'borta']);
/* Kamerans händelser + spelarens rättelser → facit. handelser: sorterade på s,
   { s, typ, kort, id, till, fran, av }. dokUpp: snabbvalet "A card appeared
   that I didn't play" — då är varje kamerakort spelaren tar bort en dubblett. */
function byggFacit(handelser, opt) {
  opt = opt || {};
  const rader = [], kort = new Map(), rattelser = [];
  const levande = (namn, utom) => [...kort.entries()].filter(([id, k]) => id !== utom && !k.borta && k.namn === namn);
  const senaste = (pred, s) => { for (let i = rader.length - 1; i >= 0; i--) { const r = rader[i]; if (s - r.t > ANGRA_S) break; if (!r.stryk && pred(r)) return r; } return null; };
  /* dok_upp gäller EN borttagning: spelarens tar_bort närmast trycket (opt.tryck, sekunder; okänt = den sista) */
  let dokE = null;
  const egetTap = new Map();   // kortets id → spelarens senaste tap { s, typ, rad, struk } (MES-385: Undo och Follow camera)
  if (opt.dokUpp) { const tr = opt.tryck != null ? opt.tryck : Infinity; for (const e of handelser) if (e.av === 'spelare' && e.typ === 'tar_bort' && (!dokE || Math.abs(e.s - tr) <= Math.abs(dokE.s - tr))) dokE = e; }
  for (const e of handelser) {
    const s = +e.s.toFixed(2), spel = e.av === 'spelare';
    const k = e.id != null ? kort.get(e.id) : null;
    const ut = (e.typ === 'flyttar' && UT.has(e.till)) || e.typ === 'tar_bort';
    if (e.typ === 'spelar' || (e.typ === 'flyttar' && e.till === 'mattan')) {
      if (spel) {
        const bort = senaste(r => (r.typ === 'tar_bort') && r.kort === e.kort && r.kalla === 'kamera', s);
        if (bort) { bort.stryk = `spelaren lade tillbaka kortet ${s} s`; rattelser.push({ t: s, vad: `lade tillbaka ${e.kort}` }); }
        else rader.push({ t: s, typ: 'spelar', kort: e.kort, kalla: 'spelare', id: e.id });
        if (!bort) rattelser.push({ t: s, vad: `lade dit ${e.kort} (kameran missade det)` });
      } else rader.push({ t: s, typ: e.typ === 'flyttar' ? 'grav_till_bord' : 'spelar', kort: e.kort, kalla: 'kamera', id: e.id, tvilling: levande(e.kort, e.id).length > 0 });
      if (e.id != null) kort.set(e.id, { namn: e.kort, av: e.av, borta: false });
      continue;
    }
    if (e.typ === 'namn') {
      if (k) k.namn = e.kort;
      for (const r of rader) if (r.id === e.id && r.typ !== 'tar_bort' && !r.stryk) { if (spel) r.fore = r.fore || r.kort; r.kort = e.kort; }
      if (spel) rattelser.push({ t: s, vad: `bytte namn ${e.fran || '(utan namn)'} → ${e.kort}` });
      continue;
    }
    if (ut) {
      if (k) k.borta = true;
      const till = e.typ === 'tar_bort' ? null : e.till;
      if (spel) {
        const fodd = rader.find(r => r.id === e.id && (r.typ === 'spelar' || r.typ === 'grav_till_bord') && !r.stryk);
        if (e.typ === 'tar_bort' && fodd && fodd.kalla === 'kamera' && (fodd.tvilling || e === dokE)) {
          fodd.stryk = `spelaren tog bort kortet ${s} s: ${fodd.tvilling ? 'ett kort med samma namn låg redan på mattan (dubblett)' : 'snabbvalet säger att kortet inte spelades'}`;
          rattelser.push({ t: s, vad: `tog bort dubbletten ${e.kort}` });
        } else { rader.push({ t: s, typ: 'tar_bort', kort: e.kort, till, kalla: 'spelare', id: e.id }); rattelser.push({ t: s, vad: `tog bort ${e.kort}${till ? ' till ' + till : ''} (kameran missade det)` }); }
      } else rader.push({ t: s, typ: 'tar_bort', kort: e.kort, till, kalla: 'kamera', id: e.id });
      continue;
    }
    if (e.typ === 'flyttar') {   // på mattan
      if (!spel) rader.push({ t: s, typ: 'flyttar', kort: e.kort, kalla: 'kamera', id: e.id });
      else rattelser.push({ t: s, vad: `flyttade ${e.kort} på mattan (räknas inte i facit)` });
      continue;
    }
    if (e.typ === 'tappar' || e.typ === 'otappar') {
      if (spel) {
        const mot = e.typ === 'tappar' ? 'otappar' : 'tappar';
        /* Spelaren vrider tillbaka sitt eget tap: kameran hade rätt. Det spelarens tap gjorde tas tillbaka. */
        const f = e.id != null ? egetTap.get(e.id) : null;
        const angrat = f && (s - f.s <= EGET_ANGRA_S || (opt.angrade || []).some(a => a.id === e.id && Math.abs(a.s - s) <= 2));
        if (f && f.typ === mot && s - f.s <= ANGRA_S && angrat) {
          egetTap.delete(e.id);
          if (f.struk) delete f.rad.stryk; else f.rad.stryk = `spelaren vred tillbaka sitt eget tap ${s} s (Undo eller Follow camera)`;
          rattelser.push({ t: s, vad: `ångrade sitt tap av ${e.kort} (kameran hade rätt)` });
          continue;
        }
        const r0 = senaste(r => r.typ === mot && r.kalla === 'kamera' && (r.id === e.id || r.kort === e.kort), s);
        if (r0) { r0.stryk = `spelaren vred tillbaka ${s} s`; rattelser.push({ t: s, vad: `${e.typ === 'tappar' ? 'tappade' : 'otappade'} ${e.kort} tillbaka` }); }
        else { rader.push({ t: s, typ: e.typ, kort: e.kort, kalla: 'spelare', id: e.id }); rattelser.push({ t: s, vad: `${e.typ === 'tappar' ? 'tappade' : 'otappade'} ${e.kort} (kameran missade det)` }); }
        if (e.id != null) egetTap.set(e.id, { s, typ: e.typ, rad: r0 || rader[rader.length - 1], struk: !!r0 });
      } else rader.push({ t: s, typ: e.typ, kort: e.kort, kalla: 'kamera', id: e.id });
    }
  }
  return { rader, rattelser };
}

/* Orden som facit-rader: stryk kamerans händelse närmast t, eller lägg till. */
function lasOrden(fil) {
  const rader = fs.readFileSync(fil, 'utf8').split('\n').filter(r => r.trim() && !r.startsWith('#'));
  const rub = rader[0].split('\t'), i = k => rub.indexOf(k);
  for (const k of ['t', 'gor', 'typ', 'kort']) if (i(k) < 0) throw new Error(`${fil}: kolumnen ${k} saknas (t, gor, typ, kort, till, text)`);
  const tom = v => v == null || v === '' || v === '-' ? null : v;
  return rader.slice(1).map((r, n) => {
    const c = r.split('\t');
    const o = { t: +c[i('t')], gor: c[i('gor')], typ: c[i('typ')], kort: tom(c[i('kort')]), till: i('till') >= 0 ? tom(c[i('till')]) : null, text: i('text') >= 0 ? tom(c[i('text')]) : null };
    if (!isFinite(o.t) || !['stryk', 'lagg'].includes(o.gor) || !['spelar', 'tar_bort', 'flyttar', 'tappar', 'otappar', 'grav_till_bord'].includes(o.typ)) throw new Error(`${fil} rad ${n + 2}: ${r}`);
    return o;
  });
}
function tillampaOrden(rader, orden) {
  const ut = [];
  for (const o of orden) {
    if (o.gor === 'lagg') { rader.push({ t: o.t, typ: o.typ, kort: o.kort, till: o.till, kalla: 'orden', text: o.text }); ut.push(`lagg ${o.typ} ${o.kort} ${o.t}`); continue; }
    const kand = rader.filter(r => !r.stryk && r.typ === o.typ && r.kort === o.kort && Math.abs(r.t - o.t) <= STRYK_S).sort((a, b) => Math.abs(a.t - o.t) - Math.abs(b.t - o.t));
    if (!kand.length) throw new Error(`orden: stryk ${o.typ} ${o.kort} vid ${o.t} — ingen sådan händelse inom ±${STRYK_S} s`);
    kand[0].stryk = 'orden: ' + (o.text || 'spelaren sa att det var fel'); ut.push(`stryk ${o.typ} ${o.kort} ${kand[0].t}`);
  }
  rader.sort((a, b) => a.t - b.t);
  return ut;
}

function lasLek(fil) {
  const ut = [];
  for (const r of fs.readFileSync(fil, 'utf8').split('\n')) {
    const s = r.trim(); if (!s || s.startsWith('#')) continue;
    const x = s.match(/^(\d+)\s+(.+)$/);
    ut.push({ name: (x ? x[2] : s).trim(), n: x ? +x[1] : 1 });
  }
  return ut;
}

/* ── --mattest ───────────────────────────────────────────────────────────── */
function lasJsonFil(fil) { const b = fs.readFileSync(fil); return JSON.parse((b[0] === 0x1f && b[1] === 0x8b ? zlib.gunzipSync(b) : b).toString('utf8')); }
const klocka = ms => new Date(ms).toLocaleTimeString('sv-SE', { hour12: false });

function mattestFall(o) {
  /* Källan: { start (ms), rader, matta (mattändringar med t i ms) | null, kod, text, tagg, kalla } */
  const K = o.kalla, s0 = K.start;
  let rader = K.rader;
  const fran = o.fran != null ? o.fran : 0, till = o.till != null ? o.till : +(rader[rader.length - 1].s + 3.5).toFixed(2);
  rader = rader.filter(r => r.s >= fran - 1e-9 && r.s <= till + 1e-9);
  if (!rader.length) throw new Error('inga bord i bordsloggen mellan ' + fran + ' och ' + till);
  const matta = (K.matta || []).map(e => Object.assign({}, e, { s: (e.t - s0) / 1000 })).filter(e => e.s >= fran - 1e-9 && e.s <= till + 1e-9);
  const harMatta = matta.length > 0;
  const kamera = harMatta ? matta.filter(e => e.av !== 'spelare').map(e => Object.assign({}, e, { av: 'kamera' })) : kameranUrBordsloggen(rader);
  const spelare = harMatta ? matta.filter(e => e.av === 'spelare') : [];
  const alla = kamera.concat(spelare).sort((a, b) => a.s - b.s);
  /* En rättelse av handlingar (MES-385) bär spelarens Undo och Follow camera: de skiljer ett ångrat tap från ett riktigt untap. */
  const angrade = (K.handlingar || []).filter(h => (h.typ === 'angrad' || h.typ === 'folj_kameran') && h.cid && h.t).map(h => ({ id: h.cid, s: (h.t - s0) / 1000 }));
  const F = byggFacit(alla, { dokUpp: K.tagg === 'dok_upp', tryck: K.frys ? (K.frys - s0) / 1000 : null, angrade });
  const orden = o.orden ? lasOrden(o.orden) : [];
  const ordenGjort = tillampaOrden(F.rader, orden);
  const facit = F.rader.filter(r => !r.stryk).map(r => { const x = { t: r.t, typ: r.typ, kort: r.kort }; if (r.till) x.till = r.till; return x; });
  const struket = F.rader.filter(r => r.stryk).map(r => ({ t: r.t, typ: r.typ, kort: r.kort, kalla: r.kalla, varfor: r.stryk }));
  const kalla = K.kod ? `rapport ${K.kod}` : K.kallaNamn;
  const lek = o.lek ? lasLek(o.lek) : K.lek || null;
  return {
    fall: {
      id: o.id, rapport: K.kod || null, parti: K.parti || null, skapad: new Date().toISOString(),
      namn: (K.kod ? `rapport ${K.kod}` : `passet ${K.passNamn || ''}`.trim()) + `, sek ${fran}–${till}` + (K.text ? ` — «${String(K.text).slice(0, 80)}»` : ''),
      kalla, bordStart: new Date(s0).toISOString(), fran, till, upplosning: K.upplosning || null, lek, lekFil: o.lek ? path.relative(ROT, path.resolve(o.lek)) : null,
      orden: { text: K.text || null, tagg: K.tagg || null, fil: o.orden ? path.relative(ROT, path.resolve(o.orden)) : null, rader: orden },
      facitKalla: harMatta ? 'rapportens mattändringar (kameran) + spelarens rättelser' : 'kamerans påståenden ur bordsloggen' + (orden.length ? ' + orden' : ''),
      facit, struket, rattelser: F.rattelser, kamera: kamera.length, ordenGjort,
      anm: 'skapat av dev/rapport/till-fall.cjs (MES-368): facit = kameran minus det spelaren rättade (LÄS-MIG i dev/rapport). Det ingen rättade antas vara rätt.',
      klocka: facit.map(r => `${r.t} ${klocka(s0 + r.t * 1000)} ${r.typ} ${r.kort}`)
    },
    bordlogg: { id: o.id, start: new Date(s0).toISOString(), rapport: K.kod || null, bordLogg: rader }
  };
}

function skrivMattest(ut, o) {
  const mapp = path.join(MATTEST, o.id);
  if (fs.existsSync(mapp) && !o.skrivOver) throw new Error(`fallet ${o.id} finns redan (${path.relative(ROT, mapp)}) — --skriv-over, eller ett annat --id`);
  fs.mkdirSync(mapp, { recursive: true });
  const { klocka: k, ...fall } = ut.fall;
  fs.writeFileSync(path.join(mapp, 'fall.json'), JSON.stringify(fall, null, 1) + '\n');
  fs.writeFileSync(path.join(mapp, 'bordlogg.json.gz'), zlib.gzipSync(JSON.stringify(ut.bordlogg), { level: 9 }));
  if (o.orden) fs.copyFileSync(path.resolve(o.orden), path.join(mapp, 'orden.tsv'));
  return mapp;
}

/* Källan för --mattest ur en hämtad rapportmapp, eller ur en bordslogg. */
function kallaUrMapp(mapp, kod) {
  const R = lasJsonFil(path.join(mapp, 'rapport.json'));
  const bf = path.join(mapp, 'bordlogg.json');
  if (!fs.existsSync(bf)) throw new Error(`${path.relative(ROT, bf)} saknas — rapporten har ingen bordslogg (telefonen var inte ansluten?) och kan inte bli ett Mat test-fall`);
  const B = lasJsonFil(bf);
  const m = R.miljo || {};
  return { kod: kod || R.kod, text: R.text, tagg: R.tagg, frys: typeof R.frys === 'number' ? R.frys : null, handlingar: R.vy && R.vy.handelse === 'handling' ? R.vy.handlingar || null : null, start: Date.parse(B.start), rader: B.bordLogg, matta: (R.tidslinje || []).filter(e => e.slag === 'matta'), upplosning: null, kallaNamn: 'rapport',
    parti: parti((R.rad && R.rad.game_id) || m.spelId || B.spel, m.spel || B.spelkod || B.spelKod) };
}
function kallaUrLogg(fil, spelkod) {
  const L = lasJsonFil(fil);
  if (!L.bordLogg || !L.start) throw new Error(`${fil}: inte en bordslogg (väntade { start, bordLogg })`);
  if (L.rapport != null && !KOD_RE.test(String(L.rapport))) throw Object.assign(new Error(`${fil}: rapportkoden ${JSON.stringify(L.rapport)} är inte R-NNNN — vägrar`), { kod: 2 });
  /* spelkoden: bordsloggens egen (spelkod/spelKod) om den finns, annars --spelkod */
  return { kod: L.rapport || null, parti: parti(L.spel, L.spelkod || L.spelKod || spelkod || null), start: Date.parse(L.start), rader: L.bordLogg, matta: null, passNamn: L.id || path.basename(fil), kallaNamn: `bordsloggen ${L.id || path.basename(fil)} (${L.start})` };
}
function idUrLogg(K) {
  const m = /(\d{4})-(\d{2})-(\d{2})(?:-(\d{4}))?/.exec(K.passNamn || '');
  return m ? 'p' + m[2] + m[3] : 'pass';
}

/* ── --bank och --traning ─────────────────────────────────────────────────── */
function partiUrMapp(mapp, r) {
  let R = null; try { R = lasJsonFil(path.join(mapp, 'rapport.json')); } catch (e) { /* en rättelse utan rapport.json */ }
  const m = (R && R.miljo) || {};
  let B = null; try { B = lasJsonFil(path.join(mapp, 'bordlogg.json')); } catch (e) { /* ingen bordslogg */ }
  return parti((R && R.rad && R.rad.game_id) || m.spelId || (B && B.spel), (r && r.spelkod) || m.spel || (B && (B.spelkod || B.spelKod)));
}
const kod2 = m => Object.assign(new Error(m), { kod: 2 });
function bildOchNamn(mapp, o) {
  /* En rättelse med ett omskrivet namn (granska.cjs: spelaren eller granskaren rättar namnet): rättelsens egen
     beskärning, ruta och maskade gäller, bara namnet byts. --bild beskarning.jpg är samma sak (äldre anrop). */
  const rr = o.spar == null && o.ratt && (!o.bild || o.bild === 'beskarning.jpg') ? lasRattelse(mapp) : null;
  if (rr) { o = Object.assign({}, o, { bild: null }); }
  /* En hel bordsbild med ett namn är aldrig facit (uppföljning av MES-366/368): vilket kort det gäller måste sägas. */
  if (o.bild && o.spar == null) throw kod2('--bild utan --spar vägras: en hel bordsbild med ett namn blir aldrig facit — välj spåret med --spar <id> (spårens id står i stillbilder.json och på bilderna i uppspelaren)');
  if (o.spar != null || (o.ratt && !rr)) {
    if (o.spar == null || !o.ratt) throw kod2('--spar och --ratt hör ihop (för en rättelse räcker --ratt <namn>)');
    return urSpar(mapp, o);
  }
  const r0 = rr || lasRattelse(mapp), r = r0 && rr ? Object.assign({}, r0, { ratt: o.ratt, rattOmskrivet: r0.ratt || null }) : r0;
  if (!r) throw new Error(`${path.relative(ROT, mapp)} har ingen rattelse.json — en rapport blir ett bänkfall bara med --spar <id> --ratt <namn>`);
  if (!r.bild) throw new Error(`rättelsen saknar beskarning.jpg`);
  if (!r.ratt) throw new Error(`rättelsen saknar det rätta namnet (ratt)${r.handelse === 'borttaget' ? ' — ett borttaget kort har inget rätt namn och blir inget bänkfall' : ''}`);
  const varn = [];
  if (!r.ruta) varn.push('VARNING: rättelsen saknar ruta (sparad före uppföljningen av MES-366): vilket kort på bordet det gäller syns bara i bilden — bänkfall går, träning bara med --utan-ruta');
  else if (!r.maskade) varn.push(`VARNING: rättelsens maskade är okänt (bilden ${r.bildKalla === 'dator' ? 'är datorns kopia' : 'bar inga siffror'}; rutan ur ${r.ruta.kalla || '?'}) — träning bara med --utan-ruta`);
  if (!r.kontext) varn.push(`obs: ingen kontext.jpg (${r.kontextSkal || 'telefonen svarade inte, eller en äldre rättelse'})`);
  return Object.assign({ kalla: 'rattelse', varn, maskRegel: r.maskade ? 'beskärningens egna (maskaTackt i appen)' : null }, r);
}

/* ── --spar: ett spår ur en rapports bilder (uppföljning av MES-366/368) ──────
   Bilden: läsningens beskärning av spåret (exakt den bild läsningen såg, med
   kortet ovanpå målat grått av appen), annars spårets ruta ur en stillbild.
   Regeln för vilket kort som ligger överst (stillbild): bordsloggens `under`
   för spåret i raden närmast bilden (högst NARA_S ifrån) — appens egen
   relation, underAv över t.tackt i Kamera (vems kant eller remsa som syns över
   den andras). Finns ingen sådan rad målas ALLA rutor som överlappar spåret
   grå, som appen gör när den inte kan avgöra vem som ligger överst
   (fyndUrLador: båda maskas). */
const MIN_TRAN_PX = 160;   // träningens minsta kortbredd: bildmodellens indata är 256 px (MobileCLIP-S0) — under 160 px förstoras kortet mer än 1,6×; läsningens beskärningar är 600–700 px, ett kort i ringens 360-px-bild ~50 px
const PY = process.env.MESA_PY || path.join(os.homedir(), '.mesa', 'detektor-venv', 'bin', 'python');
const NARA_S = 2;
const KONTEXT_DT_MS = 2000;   // kontexten ritas bara ur en stillbild högst så långt från beskärningen (telefonens klocka), som appens kontextBild
const harPillow = () => fs.existsSync(PY);
function python(o) {
  if (!harPillow()) throw kod2(`utsnittet kräver ${PY} (Pillow) — eller MESA_PY=<python med PIL>`);
  const r = spawnSync(PY, [path.join(__dirname, 'utsnitt.py'), JSON.stringify(o)], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('utsnitt.py: ' + ((r.stderr || '').trim().split('\n').pop() || 'slutkod ' + r.status));
  return JSON.parse(r.stdout);
}
function lasBilderna(mapp) {
  const sj = path.join(mapp, 'stillbilder.json'), ij = path.join(mapp, 'bilder', 'index.json');
  if (fs.existsSync(sj)) return lasJsonFil(sj);
  if (fs.existsSync(ij)) return lasJsonFil(ij);
  throw kod2(`${path.relative(ROT, mapp)} har inga stillbilder (stillbilder.json eller bilder/index.json) — kör hamta.cjs, eller rapporten tog inga bilder`);
}
const yta = q => q.w * q.h;
const overlapp = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const lada = q => ({ x: q.x, y: q.y, w: q.w, h: q.h });
/* närmast --vid (rel, sekunder relativt trycket), annars den senaste */
const narmast = (lista, vid) => lista.slice().sort((a, b) => vid != null && a.rel != null && b.rel != null ? Math.abs(a.rel - vid) - Math.abs(b.rel - vid) : b.t - a.t)[0] || null;
/* Bordsloggens rad närmast s (högst NARA_S ifrån) där spåret finns, och dess under (spåren ÖVER det). */
function bordRad(mapp, s, id) {
  if (s == null) return null;
  let B = null; try { B = lasJsonFil(path.join(mapp, 'bordlogg.json')); } catch (e) { return null; }
  let bast = null;
  for (const r of B.bordLogg || []) { const t = (r.spar || []).find(u => u.id === id); if (t && Math.abs(r.s - s) <= NARA_S && (!bast || Math.abs(r.s - s) < Math.abs(bast.r.s - s))) bast = { r, t }; }
  /* ids: spåren ovanpå. [] = inget ovanpå (inte maskad), null = OKÄNT: bordsloggen säger maskad men inte av vilka
     (granskningen av 6c3fea8 — "maskad" utan under fick inte bli "inget ovanpå", då släpptes --traning igenom). */
  if (bast) bast.ids = bast.t.under && bast.t.under.length ? bast.t.under.slice() : bast.t.maskad ? null : [];
  return bast;
}
/* De rutor som ligger ÖVER spåret i stillbilden st: bordsloggens under, annars alla som överlappar. */
function maskadeI(mapp, st, id, ruta) {
  const br = bordRad(mapp, st.s, id);
  if (br && br.ids == null) {
    /* Okänt vilka som ligger ovanpå: utsnittet målar alla som överlappar (som utan bordslogg), men maskade är null
       så att --traning vägras. */
    const mala = (st.spar || []).filter(x => x.id !== id && overlapp(x, ruta) >= 0.05 * yta(ruta)).map(x => Object.assign({ spar: x.id }, lada(x)));
    return { maskade: null, mala, regel: `okänt: bordsloggen säger att spår ${id} är maskat (raden vid ${br.r.s} s) men inte av vilka spår — utsnittet målar alla överlappande grå` };
  }
  if (br) {
    const maskade = br.ids.map(u => { const i = (st.spar || []).find(x => x.id === u) || (br.r.spar || []).find(x => x.id === u); return i ? Object.assign({ spar: u }, lada(i)) : null; }).filter(Boolean);
    return { maskade, regel: `bordsloggens under för spår ${id} (raden vid ${br.r.s} s; appens underAv över t.tackt)` };
  }
  const maskade = (st.spar || []).filter(x => x.id !== id && overlapp(x, ruta) >= 0.05 * yta(ruta)).map(x => Object.assign({ spar: x.id }, lada(x)));
  return { maskade, regel: 'ingen bordslogg vid bilden: alla rutor som överlappar spåret maskas (som appen när den inte kan avgöra vem som ligger överst)' };
}
function urSpar(mapp, o) {
  const id = Number(o.spar);
  if (!Number.isInteger(id) || id < 0) throw kod2(`--spar ${JSON.stringify(o.spar)}: ett spårs id (ett heltal)`);
  if (o.vid != null && !isFinite(o.vid)) throw kod2('--vid: sekunder relativt trycket (t.ex. -12.5)');
  const S = lasBilderna(mapp), dir = path.join(mapp, 'bilder');
  const finns = b => b && b.fil && path.basename(b.fil) === b.fil && fs.existsSync(path.join(dir, b.fil));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-till-fall-')); TMP.push(tmp);   // kor() städar
  const varn = [];
  const medSpar = (S.bilder || []).filter(b => finns(b) && (b.spar || []).some(x => x.id === id));
  let bild, ruta = null, maskade = null, mala = null, regel = null, bildKalla, st, gissning = null, varfor = null, t = null, dt = null, kontextSkal = null;
  const besk = o.bild ? [] : (S.beskarningar || []).filter(b => b.spar === id && finns(b));
  if (besk.length) {
    const b = narmast(besk, o.vid);
    bild = path.join(dir, b.fil); bildKalla = 'beskarning'; gissning = b.kort || null; varfor = b.varfor || null; t = b.t;
    /* stillbilden närmast beskärningen i tid: kontextens bakgrund (och rutan när beskärningen inte bar den) */
    st = medSpar.slice().sort((x, y) => Math.abs(x.t - b.t) - Math.abs(y.t - b.t))[0] || null;
    dt = st && st.t != null && b.t != null ? st.t - b.t : null;   // stillbildens t − beskärningens t (index.json: båda telefonens klocka)
    if (b.ruta) ruta = Object.assign({}, b.ruta, { kalla: 'beskarning', t: b.t });
    else if (st) { ruta = Object.assign(lada(st.spar.find(x => x.id === id)), { bild: { w: st.w, h: st.h }, kalla: 'stillbild', t: st.t, fil: st.fil }); varn.push(`obs: beskärningen bar ingen ruta (äldre än uppföljningen av MES-366): rutan är spårets i stillbilden ${st.fil}, ${((st.t - b.t) / 1000).toFixed(1)} s från beskärningen`); }
    if (Array.isArray(b.maskade)) { maskade = b.maskade; regel = 'beskärningens egna (maskaTackt i appen)'; }
    else {
      const br = bordRad(mapp, b.s, id);
      if (br && br.ids == null) { regel = `okänt: bordsloggen säger att spår ${id} är maskat (raden vid ${br.r.s} s) men inte av vilka spår`; varn.push('VARNING: vilka kort som målades grå i beskärningen är okänt — träning bara med --utan-ruta'); }
      else if (br) { maskade = br.ids.map(u => { const i = (br.r.spar || []).find(x => x.id === u); return i ? Object.assign({ spar: u }, lada(i)) : { spar: u }; }); regel = `bordsloggens under för spår ${id} (raden vid ${br.r.s} s) — beskärningen är appens, redan maskad av den`; }
      else { regel = 'okänt: beskärningen bar inga siffror och ingen bordslogg ligger vid den'; varn.push('VARNING: vilka kort som målades grå i beskärningen är okänt — träning bara med --utan-ruta'); }
    }
  } else {
    if (o.bild) {
      st = (S.bilder || []).find(b => b.fil === path.basename(o.bild));
      if (!st || !finns(st)) throw kod2(`--bild ${o.bild}: ingen sådan stillbild i ${path.relative(ROT, dir)}`);
      if (!(st.spar || []).some(x => x.id === id)) throw kod2(`spår ${id} finns inte i ${st.fil}`);
    } else st = narmast(medSpar, o.vid);
    if (!st) throw kod2(`spår ${id} finns varken i läsningens beskärningar eller i någon stillbild i ${path.relative(ROT, mapp)}`);
    const i = st.spar.find(x => x.id === id);
    ruta = Object.assign(lada(i), { bild: { w: st.w, h: st.h }, kalla: 'stillbild', t: st.t, fil: st.fil });
    ({ maskade, mala, regel } = maskadeI(mapp, st, id, i));
    gissning = i.kort || null; varfor = i.varfor || null; t = st.t; bildKalla = 'stillbild'; dt = 0;
    bild = path.join(tmp, `spar${id}${ext(st.fil)}`);
  }
  /* Utsnittet (stillbild) och kontexten: rutan och de maskade rutorna ritas i samma stillbild. Kontexten bara när
     stillbilden ligger högst KONTEXT_DT_MS från beskärningen (granskningen av 6c3fea8: en låda ur en annan tid i en
     bild av ett bord som hunnit ändras är ett falskt facit), och bara med Pillow (utan: en varning, ingen kontext —
     utsnittet ur en stillbild kräver Pillow och vägras). */
  if (!st) kontextSkal = `spår ${id} finns inte i någon stillbild`;
  else if (dt != null && Math.abs(dt) > KONTEXT_DT_MS) kontextSkal = `stillbilden närmast beskärningen (${st.fil}) ligger ${(dt / 1000).toFixed(1)} s från den (gränsen ±${KONTEXT_DT_MS / 1000} s)`;
  else if (bildKalla === 'beskarning' && !harPillow()) kontextSkal = `Pillow saknas (${PY}; MESA_PY=<python med PIL>)`;
  const stK = kontextSkal ? null : st;
  const kontext = stK ? path.join(tmp, 'kontext.jpg') : null;
  const ks = stK ? lada(stK.spar.find(x => x.id === id)) : null;
  const km = stK && (maskade || mala) ? (maskade || mala).map(q => { const i = q.spar != null && stK.spar.find(x => x.id === q.spar); return i ? Object.assign({ spar: q.spar }, lada(i)) : q; }).filter(q => q.w != null) : [];
  const svar = stK ? python({ bild: path.join(dir, stK.fil), ut: bildKalla === 'stillbild' ? bild : null, kontext, ruta: ks, maskade: km, spar: id, marg: 0.08 }) : {};
  if (kontextSkal) varn.push(`obs: ingen kontextbild — ${kontextSkal}`);
  if (bildKalla === 'stillbild') varn.push(`VARNING: lågupplöst — utsnittet ur stillbilden är ${svar.w}×${svar.h} px (stillbilden ${st.w} px bred)${Math.min(svar.w, svar.h) < MIN_TRAN_PX ? `, under träningens ${MIN_TRAN_PX} px` : ''}`);
  return { bild, ratt: o.ratt, gissning, varfor, handelse: 'rapport', t, spar: id, kalla: 'rapport', bildKalla, ruta, maskade, maskRegel: regel,
           kontext, kontextInfo: stK ? { fil: stK.fil, t: stK.t, dt, w: svar.kontext && svar.kontext.w, h: svar.kontext && svar.kontext.h, utsnitt: (svar.kontext && svar.kontext.utsnitt) || null, ruta: ks, maskade: km } : null, kontextSkal, varn, tmp };
}
const ext = f => path.extname(f).toLowerCase() || '.jpg';
function jpegStorlek(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xFF) { i++; continue; }
    const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return { w: null, h: null };
}

/* Fallets namn: koden för en rättelse (ett kort per rapport), koden + spåret för ett spår ur en rapport. */
const fallNamn = (kod, b) => b.kalla === 'rapport' ? `${kod}-spar${b.spar}` : kod;
const sammaFall = (kod, b) => p => p.kod === kod && (b.kalla !== 'rapport' || p.spar === b.spar);
/* Var kortet låg, som det skrivs i manifest.json och markning.json (LÄS-MIG i dev/rapport). */
const plats = (b, kontextFil) => ({ bild_ur: b.kalla === 'rattelse' ? 'rattelse:' + (b.bildKalla || '?') : b.bildKalla || null, ruta: b.ruta || null, maskade: b.maskade || null, mask_regel: b.maskRegel || null,
  kontext: kontextFil || null, kontext_bild: b.kontextInfo || null, kontext_skal: kontextFil ? null : (b.kontextSkal || null) });
function skrivBank(kod, b, o) {
  const namn = fallNamn(kod, b), fil = `${namn}${ext(b.bild)}`;
  const man = path.join(BANK, 'manifest.json');
  const lista = fs.existsSync(man) ? JSON.parse(fs.readFileSync(man, 'utf8')) : [];
  if (lista.some(sammaFall(kod, b)) && !o.skrivOver) throw new Error(`${namn} finns redan i bänken (${path.relative(ROT, man)}) — --skriv-over`);
  const buf = fs.readFileSync(b.bild), st = jpegStorlek(buf);
  const kfil = b.kontext ? `${namn}-kontext.jpg` : null;
  const post = Object.assign({ fil, kod, parti: b.parti || null, namn: b.ratt, kalla: b.kalla, handelse: b.handelse, gissning: b.gissning, varfor: b.varfor, t: b.t, spar: b.spar,
    bredd: st.w, hojd: st.h, skymd: false, helbild: false, tillagd: new Date().toISOString().slice(0, 10) }, plats(b, kfil));
  fs.mkdirSync(BANK, { recursive: true });
  fs.writeFileSync(path.join(BANK, fil), buf);
  if (kfil) fs.copyFileSync(b.kontext, path.join(BANK, kfil));
  const ny = lista.filter(p => !sammaFall(kod, b)(p)).concat([post]);
  fs.writeFileSync(man, JSON.stringify(ny, null, 1) + '\n');
  return { mapp: BANK, post, antal: ny.length };
}

/* Valideringens namn som i mark.py (ar_val): sha1("1|namn") % 5 == 0, basland aldrig. */
const BAS = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];
const arVal = n => !BAS.includes(n) && n !== 'baksida' && BigInt('0x' + crypto.createHash('sha1').update('1|' + n, 'utf8').digest('hex')) % 5n === 0n;
/* Golden-lekens namn tränas aldrig (golden ska mäta osedda kort) — mark.golden_namn. */
function goldenNamn() {
  const g = new Set();
  for (const r of fs.readFileSync(path.join(ROT, 'dev', 'golden', 'lek.txt'), 'utf8').split('\n')) {
    const s = r.trim(); if (!s || s.startsWith('#')) continue;
    const x = s.match(/^\d+\s+(.+)$/); const n = (x ? x[1] : s).replace(/\s*\((?:[A-Za-z0-9]{2,6})\)\s*[A-Za-z0-9\-★]*\s*$/, '').trim();
    if (BAS.includes(n) || n === 'Wastes') continue;
    g.add(n); for (const d of n.split(' // ')) g.add(d);
  }
  return g;
}
function skrivTraning(kod, b, o) {
  const namn = fallNamn(kod, b), pass = path.join(MARKNING, TRANPASS), mapp = path.join(pass, namn);
  if (fs.existsSync(path.join(mapp, 'markning.json')) && !o.skrivOver) throw new Error(`${namn} finns redan i träningen (${path.relative(ROT, mapp)}) — --skriv-over`);
  fs.mkdirSync(path.join(mapp, 'tran', 'tel'), { recursive: true });
  const fil = `tran/tel/${namn}-hel-app${ext(b.bild)}`, buf = fs.readFileSync(b.bild), st = jpegStorlek(buf);
  fs.writeFileSync(path.join(mapp, fil), buf);
  if (b.kontext) fs.copyFileSync(b.kontext, path.join(mapp, 'kontext.jpg'));
  const utanfor = goldenNamn().has(b.ratt) || b.ratt.split(' // ').some(d => goldenNamn().has(d));
  const M = {
    /* mark.py:s klippfält som dataset.py läser; källan är rapporten, inte ett klipp */
    klipp: path.relative(ROT, mapp), pass: TRANPASS, mapp: path.relative(ROT, mapp), rapport: kod, parti: b.parti || null, kalla: b.kalla,
    remsor_ur: 'horn', beskar: { filer: 1, ur: 'rapport' }, regler: { kalla: 'dev/rapport/till-fall.cjs (MES-368)', val_var: 5, val_fro: 1 },
    spar: [Object.assign({ id: namn, dom: 'saker_manuell', namn: b.ratt, varfor: `spelarens ${b.kalla === 'rapport' ? 'ord (--ratt)' : 'rättelse'} (${b.handelse || b.kalla})`, gissning: b.gissning, varfor_telefonen: b.varfor,
      utanfor_traning: utanfor, val: arVal(b.ratt), filer: 1, remsor: 0, filer_tel: 1, appens_spar: b.spar != null ? b.spar : null }, plats(b, b.kontext ? 'kontext.jpg' : null))],
    filer: [{ fil, spar: namn, lage: 0, t: b.t, namn: b.ratt, typ: 'hel', utsnitt: 'app', upplosning: 'tel', val: arVal(b.ratt), px: [st.w, st.h], ur: 'lada' }]
  };
  fs.writeFileSync(path.join(mapp, 'markning.json'), JSON.stringify(M, null, 1) + '\n');
  return { mapp, utanfor, val: M.spar[0].val };
}

/* ── huvudet ──────────────────────────────────────────────────────────────── */
function las(a) {
  const arg = n => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : null; };
  const lage = ['--mattest', '--bank', '--traning'].filter(x => a.includes(x));
  return {
    kod: (a.find(x => /^R-\d{4,}$/i.test(x)) || '').toUpperCase() || null, lage: lage.length === 1 ? lage[0].slice(2) : null, lagen: lage,
    logg: arg('--logg'), spelkod: arg('--spelkod'), orden: arg('--orden'), lek: arg('--lek'), id: arg('--id'), mapp: arg('--mapp'), bild: arg('--bild'), ratt: arg('--ratt'),
    spar: arg('--spar'), vid: arg('--vid') != null ? +arg('--vid') : null, utanRuta: a.includes('--utan-ruta'),
    fran: arg('--fran') != null ? +arg('--fran') : null, till: arg('--till') != null ? +arg('--till') : null,
    lokal: a.includes('--lokal'), torr: a.includes('--torr'), skrivOver: a.includes('--skriv-over')
  };
}

const TMP = [];   // utsnitten och kontextbilderna (urSpar) skrivs i en tillfällig mapp och kopieras in i fallet
async function kor(a) {
  try { return await korInre(a); }
  finally { for (const d of TMP.splice(0)) try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) {} }
}
async function korInre(a) {
  const o = las(a);
  if (!o.lage) throw Object.assign(new Error('välj ett: --mattest, --bank eller --traning'), { kod: 2 });
  if (o.id != null && !ID_RE.test(o.id)) throw Object.assign(new Error(`--id ${JSON.stringify(o.id)}: bara bokstäver, siffror, - och _`), { kod: 2 });
  if (o.spelkod != null && !/^[\w-]{2,}$/.test(o.spelkod)) throw Object.assign(new Error(`--spelkod ${JSON.stringify(o.spelkod)}: bara bokstäver, siffror, - och _`), { kod: 2 });
  if (!o.kod && !(o.lage === 'mattest' && o.logg)) throw Object.assign(new Error('en rapportkod (R-0412), eller --mattest --logg <fil> för ett pass utan kod'), { kod: 2 });
  const sida = o.lage === 'traning' ? 'traning' : 'test';
  const mapp = o.mapp ? path.resolve(o.mapp) : o.kod ? path.join(ROT, 'dev', 'diagnos', 'rapporter', o.kod) : null;
  if (mapp && !o.logg && !fs.existsSync(mapp)) throw Object.assign(new Error(`${path.relative(ROT, mapp)} finns inte — kör först: node dev/rapport/hamta.cjs ${o.kod}`), { kod: 2 });

  /* 1. Spärren i repot först (den säger nej oavsett vad rapporten innehåller). */
  const slag = o.lage === 'traning' ? null : o.lage;   // mattest | bank: Mat test spärrar bara sin egen rapport, bänken hela partiet
  kravLokal(o.kod, sida, null, slag);
  /* 2. Läs och bygg allt i minnet: ett fel här lämnar tabellen orörd. */
  let plan;
  if (o.lage === 'mattest') {
    const K = o.logg ? kallaUrLogg(o.logg, o.spelkod) : kallaUrMapp(mapp, o.kod);
    if (o.kod) K.kod = o.kod;
    if (K.kod != null && !KOD_RE.test(K.kod)) throw Object.assign(new Error(`rapportkoden ${JSON.stringify(K.kod)} är inte R-NNNN — vägrar`), { kod: 2 });
    o.id = o.id || (K.kod ? K.kod : idUrLogg(K));
    if (!ID_RE.test(o.id)) throw Object.assign(new Error(`fallets id ${JSON.stringify(o.id)}: bara bokstäver, siffror, - och _`), { kod: 2 });
    plan = { slag: 'mattest', ut: mattestFall(Object.assign({}, o, { kalla: K })), kod: K.kod, parti: K.parti || null };
  } else { const b = bildOchNamn(mapp, o); b.parti = partiUrMapp(mapp, b); plan = { slag: o.lage, b, kod: o.kod, parti: b.parti }; }
  const kod = plan.kod;

  /* 3. Spärren per parti i repot, och i tabellen, som sätts före allt som skrivs. */
  kravLokal(kod, sida, plan.parti, slag);
  /* 3b. Träningens krav (uppföljning av MES-366/368), före tabellen: vilket kort det är ska stå i fallet, och bilden
     ska inte vara ett frimärke. --utan-ruta släpper bara rutans krav, aldrig bredden. */
  if (plan.slag === 'traning') {
    const b = plan.b, st = jpegStorlek(fs.readFileSync(b.bild)), kort = Math.min(st.w || 0, st.h || 0);
    if ((!b.ruta || !b.maskade) && !o.utanRuta) throw kod2(`--traning kräver ruta och maskade (vilket kort på bordet, och vilka kort ovanpå som målades grå) — ${!b.ruta ? 'rutan saknas' : 'maskade är okänt'}. En äldre rättelse: --utan-ruta, bara om du själv sett att bilden visar rätt kort`);
    if (kort < MIN_TRAN_PX) throw kod2(`--traning vägrar: bilden är ${st.w}×${st.h} px, kortet under ${MIN_TRAN_PX} px brett (bildmodellens indata är 256 px) — ett bänkfall går`);
  }
  let tab = null;
  if (kod && !o.lokal) tab = await sattAnvandning(supa(), kod, sida, { franTillFall: true, torr: o.torr, parti: plan.parti, slag });
  /* tabellens game_id är nyckeln när den finns */
  if (tab && tab.game_id) plan.parti = Object.assign({}, plan.parti || {}, { game_id: tab.game_id });
  if (plan.slag === 'mattest') plan.ut.fall.parti = plan.parti || null; else plan.b.parti = plan.parti || null;

  /* 4. Skriv. */
  const rad = [];
  rad.push(!harParti(plan.parti) ? `VARNING: inget parti (game_id eller spelkod) — spärren gäller bara per kod`
    : `partiet: ${partiNycklar(plan.parti).join(', ')} (spärren gäller ${o.lage === 'mattest' ? 'bara koden för ett Mat test-fall' : 'per parti mot ' + (sida === 'test' ? 'träningen' : 'bänken')})`);
  /* Mat test-fall ur samma parti spärrar inte träningen: säg det, så att ett ja inte ser ut som ett förbiseende. */
  if (sida === 'traning' && harParti(plan.parti)) {
    const mt = new Set(((tab && tab.mattestIPartiet) || []).concat(kopiorDetalj(null, plan.parti).mattest.map(x => x.kod || 'utan kod')));
    if (mt.size) rad.push(`Mat test-fall ur samma parti: ${[...mt].join(', ')} — spärrar inte träningen (Mat test spelar upp telefonens läsningar och kör aldrig bildmodellen)`);
  }
  if (tab) rad.push(`tabellen: ${kod} anvandning ${tab.fore || 'null'} → ${tab.efter}${tab.redan ? ' (redan)' : ''}${tab.torr ? ' (torr — inte satt)' : ''}`);
  else if (kod) rad.push(`tabellen: inte rörd (--lokal)`);
  if (plan.slag === 'mattest') {
    const F = plan.ut.fall;
    rad.push(`Mat test-fall ${o.id}: ${F.facit.length} facit-rader (${F.facitKalla}), ${F.struket.length} strukna, ${F.rattelser.length} rättelser, ${plan.ut.bordlogg.bordLogg.length} bord, sek ${F.fran}–${F.till}`);
    if (!o.torr) rad.push('skrivet: ' + path.relative(ROT, skrivMattest(plan.ut, o)) + '/ (fall.json, bordlogg.json.gz' + (o.orden ? ', orden.tsv' : '') + ')');
    rad.push(`kör: node dev/mattest/kor.cjs --fall ${o.id} --detalj ${o.id}`);
    for (const s of F.struket) rad.push(`  struket: ${s.t} ${s.typ} ${s.kort} — ${s.varfor}`);
  } else {
    const b = plan.b;
    for (const v of b.varn || []) rad.push(v);
    rad.push(`bilden: ${b.kalla === 'rattelse' ? `rättelsens ${path.basename(b.bild)} (${b.bildKalla || '?'})` : `${b.bildKalla} ${path.basename(b.bild)}`}${b.spar != null ? ` · spår ${b.spar}` : ''}`);
    rad.push(`ruta: ${b.ruta ? `x ${b.ruta.x} y ${b.ruta.y} w ${b.ruta.w} h ${b.ruta.h}${b.ruta.bild ? ` i ${b.ruta.bild.w}×${b.ruta.bild.h}` : ''} (${b.ruta.kalla || '?'})` : 'saknas'}`);
    rad.push(`maskade: ${b.maskade ? (b.maskade.length ? b.maskade.map(q => 'spår ' + (q.spar != null ? q.spar : '?')).join(', ') : 'inga') : 'okänt'}${b.maskRegel ? ' — regel: ' + b.maskRegel : ''}`);
    rad.push(`kontext: ${b.kontext ? path.basename(b.kontext) + (b.kontextInfo && b.kontextInfo.fil ? ` (ur ${b.kontextInfo.fil}${b.kontextInfo.dt != null ? `, ${(b.kontextInfo.dt / 1000).toFixed(1)} s från beskärningen` : ''})` : '') : 'ingen' + (b.kontextSkal ? ' — ' + b.kontextSkal : '')}`);
  }
  if (plan.slag === 'mattest') { /* skrivet ovan */ } else if (plan.slag === 'bank') {
    rad.push(`bänkfall ${fallNamn(kod, plan.b)}: ${plan.b.ratt} (telefonen gissade ${plan.b.gissning || '–'}${plan.b.varfor ? ', ' + plan.b.varfor : ''})`);
    if (!o.torr) { const r = skrivBank(kod, plan.b, o); rad.push(`skrivet: ${path.relative(ROT, r.mapp)}/ (${r.antal} fall) — kör: ~/.mesa/detektor-venv/bin/python dev/remsa/helkort_jamfor.py --bank dev/remsa/rapportbank dev/embed/modeller/mobileclip-s0-vision.onnx`); }
  } else {
    rad.push(`träning ${fallNamn(kod, plan.b)}: ${plan.b.ratt}`);
    if (!o.torr) { const r = skrivTraning(kod, plan.b, o); rad.push(`skrivet: ${path.relative(ROT, r.mapp)}/${r.utanfor ? ' — golden-lekens namn: utanfor_traning, dataset.py tar inte med det' : ''}${r.val ? ' — valideringens namn (ar_val)' : ''}`); }
  }
  return rad;
}

if (require.main === module) {
  kor(process.argv.slice(2)).then(r => console.log(r.join('\n'))).catch(e => {
    console.error('till-fall: ' + e.message);
    process.exit(e.sparr ? 3 : e.kod || 1);
  });
}
module.exports = { kor, lasRattelse, parti, partiUrMapp, kameranUrBordsloggen, byggFacit, mattestFall, lasOrden, tillampaOrden, arVal };

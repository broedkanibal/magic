/* Problemrapporten D (MES-368): spärren mellan test och träning.

   En rapport eller en tyst rättelse som blivit ett regressionsprov (ett
   Mat test-fall eller ett bänkfall) får aldrig hamna i träningen — då mäter
   provet att modellen minns kortet. Och tvärtom: det modellen tränats på
   får aldrig bli ett prov. Samma regel som detektorns spärr prov/träning
   (dev/detektor/delning.py, MES-288). En mätregel, inte en samtyckesfråga.

   Spärren sitter på två ställen, och båda måste säga ja:
     1. Tabellen: rapporter.anvandning är test eller traning, aldrig båda.
        När den väl är test eller traning byts den aldrig (varken av
        till-fall.cjs eller satt.cjs) — inte heller via fix eller slangd,
        annars går det att tvätta test → slangd → traning.
     2. Repot: koden får inte finnas i en kopia på andra sidan (Mat test-
        underlaget och bänken mot träningsmaterialet). Det håller också när
        tabellen inte går att nå, när raden raderats och för fall som skrevs
        med --lokal.
   Regeln gäller PER PARTI mellan bänken och träningen, och PER KOD för Mat
   test (Jespers beslut 2026-10-14):
     - bänken (--bank, dev/material/rapportbank/) ↔ träningen (--traning): per
       parti, som detektorns spärr delar per inspelningstillfälle. Två
       rättelser av samma kort i samma parti, eller en rapport och en
       rättelse ur samma parti, är nästan samma bild — blir den ena ett
       bänkfall och den andra träning mäter bänken att modellen minns partiet.
     - Mat test (--mattest, dev/mattest/underlag/rapporter/) spärrar bara sin
       egen rapport mot träningen, inte partiets andra rapporter och
       rättelser: ett Mat test-fall spelar upp telefonens färdiga läsningar
       och kör aldrig bildmodellen, så att modellen tränats på partiets kort
       kan inte göra provet missvisande. Åt andra hållet: en rapport som är
       träning blir aldrig ett Mat test-fall, men partiets andra kan.
   Tabellen skiljer inte på Mat test och bänk (anvandning = 'test' för båda):
   slaget avgörs ur repot (slagIRepot: var fallet ligger). En testrad ur
   samma parti utan kopia i repot är av okänt slag och spärrar som ett
   bänkfall, med ett meddelande som säger varför.
   Partiets nyckel är { game_id, spelkod }: game_id ur tabellen
   (eller rapportens miljo.spelId / bordsloggens spel), annars spelkoden ur
   rattelse.json eller rapportens miljo.spel. Två poster är samma parti om
   de delar game_id ELLER spelkod (en spelkod kan i sällsynta fall återanvändas
   — då vägrar spärren en gång för mycket, aldrig för lite). Saknas nyckeln
   helt gäller spärren per kod, och till-fall/satt skriver en varning.
   Nyckeln skrivs som `parti` i fall.json, bänkens manifest.json och
   markning.json.

   TILLFÄLLET (Jespers beslut 2026-10-15): bänken ↔ träningen gäller per
   tillfälle, inte bara per match. Flera matcher i rad vid samma bord delar
   bord, ljus, lek och telefon — match 1 som bänkfall och match 2 som träning
   läcker lika mycket som två kort ur samma match. Ett tillfälle är tabellens
   rader som hänger ihop genom samma spelare med under 6 timmar mellan två
   rader i följd, eller genom samma match (game_id, också mellan spelare).
   Kedjan är transitiv: matcher kl 18, 22 och 02 är ett tillfälle. Underlaget
   är tabellen (tillfallen); repot bär bara partiet, så utan tabellen
   (--lokal, eller när raderna inte går att läsa — då vägrar sattAnvandning)
   prövar repot bara partiet. Med tabellen prövar repot också tillfällets
   koder (kravLokal, koder). Mat test spärrar fortfarande bara sin egen kod. */
'use strict';
const fs = require('fs'), path = require('path');
const { ROT } = require('./supa.cjs');
const UTROT = process.env.MESA_FALL_UT ? path.resolve(process.env.MESA_FALL_UT) : ROT;   // som i till-fall.cjs

const VARDEN = ['fix', 'test', 'traning', 'slangd'];
const LAST = new Set(['test', 'traning']);   // när raden har ett av dem byts det aldrig
const MARKNING = path.join(UTROT, 'dev', 'material', 'arbete', 'markning');

/* Får anvandning gå från `fore` till `efter`? { ok, varfor }. */
function overgang(fore, efter) {
  if (!VARDEN.includes(efter)) return { ok: false, varfor: `okänt värde ${efter} (${VARDEN.join(' | ')})` };
  if (fore === efter) return { ok: true, redan: true };
  /* fix → traning: en fix tar med sitt testfall (till-fall --mattest/--bank = test), så en fix blir aldrig träning */
  if (fore === 'fix' && efter === 'traning') return { ok: false, varfor: 'rapporten är en fix — en fix tar med sitt testfall och blir test (till-fall.cjs --mattest/--bank), aldrig träning' };
  if (LAST.has(fore)) return { ok: false, varfor: `rapporten är redan ${fore} och byts aldrig${efter === 'test' || efter === 'traning' ? ' — test och träning är aldrig samma rapport' : ' (annars går det att tvätta test → slangd → traning)'}` };
  return { ok: true };
}

/* Var koden finns i repot, per plats: Mat test-underlaget och bänken (sidan
   test), märkningsmaterialet (sidan traning; dev/material/arbete/markning,
   utanför git). */
const PLATSER = {
  mattest: () => mappar(path.join(UTROT, 'dev', 'mattest', 'underlag', 'rapporter')).map(d => path.join(d, 'fall.json')),
  bank: () => [path.join(UTROT, 'dev', 'material', 'rapportbank', 'manifest.json')],
  traning: () => mappar(path.join(UTROT, 'dev', 'material', 'arbete', 'markning')).flatMap(p => mappar(p).map(k => path.join(k, 'markning.json')))
};
const NAMN = { mattest: 'Mat test-fall', bank: 'bänkfall', traning: 'träning' };
function mappar(d) {
  try { return fs.readdirSync(d, { withFileTypes: true }).filter(x => x.isDirectory() || x.isSymbolicLink()).map(x => path.join(d, x.name)); } catch (e) { return []; }
}
/* Koden som ett helt ord: R-0412 hittar inte R-04120. */
function harKod(fil, kod) {
  let t; try { t = fs.readFileSync(fil, 'utf8'); } catch (e) { return false; }
  return new RegExp('(^|[^0-9A-Za-z-])' + kod.replace(/[-]/g, '\\-') + '(?![0-9])').test(t);
}
/* Tillfällena: rader [{ kod, user_id, created_at, game_id }] → Map kod → tillfällets id (dess minsta kod).
   lankar: extra par [kod, game_id] (en lokal kopias game_id som tabellens rad saknar). */
const TILLFALLE_MS = 6 * 3600 * 1000;
function tillfallen(rader, lankar) {
  const far = new Map();
  const hitta = k => { while (far.get(k) !== k) { const f = far.get(far.get(k)); far.set(k, f); k = f; } return k; };
  const ena = (a, b) => { const x = hitta(a), y = hitta(b); if (x !== y) far.set(x < y ? y : x, x < y ? x : y); };
  for (const r of rader) far.set(r.kod, r.kod);
  const perSpelare = new Map(), perMatch = new Map();
  const match = (kod, g) => { g = String(g).toLowerCase(); if (perMatch.has(g)) ena(perMatch.get(g), kod); else perMatch.set(g, kod); };
  for (const r of rader) {
    if (r.user_id) { if (!perSpelare.has(r.user_id)) perSpelare.set(r.user_id, []); perSpelare.get(r.user_id).push(r); }
    if (r.game_id) match(r.kod, r.game_id);
  }
  for (const [kod, g] of lankar || []) if (far.has(kod) && g) match(kod, g);
  for (const rr of perSpelare.values()) {
    rr.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    for (let i = 1; i < rr.length; i++) if (Date.parse(rr[i].created_at) - Date.parse(rr[i - 1].created_at) < TILLFALLE_MS) ena(rr[i - 1].kod, rr[i].kod);
  }
  return new Map(rader.map(r => [r.kod, hitta(r.kod)]));
}
/* Hela tabellen, för tillfällena (granskningssidan och spärren läser samma). */
const allaRader = S => S.rest('GET', 'rapporter?select=kod,user_id,created_at,game_id,anvandning&order=created_at.asc&limit=10000');

/* Partiets nycklar: 'game:<uuid>' och 'spel:<SPELKOD>'. */
function partiNycklar(p) {
  if (!p) return [];
  const ut = [];
  if (p.game_id) ut.push('game:' + String(p.game_id).toLowerCase());
  if (p.spelkod) ut.push('spel:' + String(p.spelkod).toUpperCase());
  return ut;
}
const harParti = p => partiNycklar(p).length > 0;
/* Posterna i en fil (fall.json, markning.json: ett objekt; manifest.json: en lista) → [{ kod, parti }]. */
function poster(fil) {
  let j; try { j = JSON.parse(fs.readFileSync(fil, 'utf8')); } catch (e) { return []; }
  return (Array.isArray(j) ? j : [j]).filter(x => x && typeof x === 'object').map(x => ({ kod: x.rapport || x.kod || null, parti: x.parti || null }));
}
/* Koden i en fil på platsen. Mat test: bara fallets egen rapport (fall.json:s
   `rapport`) — en kod som bara nämns i ett Mat test-fall är inget prov av den.
   Bänken och träningen: koden var som helst i filen (också under en annan post). */
function kodPa(plats, fil, kod) {
  if (plats === 'mattest') return poster(fil).some(p => p.kod && String(p.kod).toUpperCase() === kod.toUpperCase());
  return harKod(fil, kod);
}
/* Var koden — eller partiet — finns på varje plats: { mattest, bank, traning }
   med { text, viaParti, kod } per fil. viaParti: träffen är en annan post ur
   samma parti, inte koden själv. */
function kopiorDetalj(kod, parti, koder) {
  const ut = { mattest: [], bank: [], traning: [] }, mina = partiNycklar(parti);
  const tillf = new Set((koder || []).map(k => String(k).toUpperCase()).filter(k => !kod || k !== kod.toUpperCase()));
  for (const plats of Object.keys(PLATSER)) for (const fil of PLATSER[plats]()) {
    const rel = path.relative(UTROT, fil);
    if (kod && kodPa(plats, fil, kod)) { ut[plats].push({ text: rel, viaParti: false, kod }); continue; }
    if (!mina.length && !tillf.size) continue;
    const pp = poster(fil);
    const traff = mina.length && pp.find(p => partiNycklar(p.parti).some(n => mina.includes(n)));
    if (traff) { ut[plats].push({ text: `${rel} (samma parti: ${traff.kod || 'utan kod'}, ${partiNycklar(traff.parti).filter(n => mina.includes(n)).join(', ')})`, viaParti: true, kod: traff.kod || null }); continue; }
    const t2 = tillf.size && pp.find(p => p.kod && tillf.has(String(p.kod).toUpperCase()));
    if (t2) ut[plats].push({ text: `${rel} (samma tillfälle: ${t2.kod})`, viaParti: true, viaTillfalle: true, kod: t2.kod });
  }
  return ut;
}
/* Som kopiorDetalj men bara texterna; test = Mat test + bänken. */
function kopior(kod, parti) {
  const d = kopiorDetalj(kod, parti), t = x => x.map(y => y.text);
  return { mattest: t(d.mattest), bank: t(d.bank), traning: t(d.traning), test: t(d.mattest.concat(d.bank)) };
}
/* Vilket slags prov en kod är i repot: 'bank' | 'mattest' | null (ingen kopia).
   Tabellen säger bara 'test' för båda. Ligger koden på båda gäller bänken. */
function slagIRepot(kod) {
  if (!kod) return null;
  if (PLATSER.bank().some(f => kodPa('bank', f, kod))) return 'bank';
  if (PLATSER.mattest().some(f => kodPa('mattest', f, kod))) return 'mattest';
  return null;
}

/* Vad som hindrar en export till `sida` (test | traning) i repot. `slag` för
   test: 'mattest', annars (bank, okänt) den strängare regeln per parti.
     traning:      koden som Mat test-fall eller bänkfall, partiet i bänken
     test (bänk):  koden eller partiet i träningen
     test/mattest: bara koden i träningen */
function hinderLokalt(kod, sida, parti, slag, koder) {
  const k = kopiorDetalj(kod, parti, koder);
  if (sida === 'traning') return [...k.mattest.filter(x => !x.viaParti).map(x => Object.assign({ plats: 'mattest' }, x)), ...k.bank.map(x => Object.assign({ plats: 'bank' }, x))];
  return k.traning.filter(x => slag !== 'mattest' || !x.viaParti).map(x => Object.assign({ plats: 'traning' }, x));
}
/* Spärren i repot. Kastar om något hindrar (hinderLokalt). koder: tillfällets andra koder (ur tabellen), om de är kända. */
function kravLokal(kod, sida, parti, slag, koder) {
  if (!kod && !harParti(parti)) return;
  /* Utan dev/material kan spärren inte se träningen eller bänken (båda
     ligger där sedan 2026-10-15), och en export skulle hamna fel (en
     worktree utan länken dev/material): slutkod 2, inte ett tyst ja. */
  if (!fs.existsSync(MARKNING)) {
    const e = new Error(`${path.relative(UTROT, MARKNING)} finns inte — spärren kan inte pröva träningsmaterialet (saknas länken dev/material i en worktree?). Inget gjort`);
    e.kod = 2; throw e;
  }
  const h = hinderLokalt(kod, sida, parti, slag, koder);
  if (!h.length) return;
  const regel = h.some(x => x.viaTillfalle)
    ? 'ett tillfälle är bänkfall eller träning, aldrig båda (samma spelare med under 6 h mellan matcherna delar bord, ljus och lek)'
    : h.some(x => x.viaParti)
    ? 'ett parti är bänkfall eller träning, aldrig båda (ett bänkfall ur samma parti som träningen mäter att modellen minns partiet)'
    : 'en rapport är test eller träning, aldrig båda';
  const e = new Error(`SPÄRREN: ${kod || 'fallet'}${harParti(parti) ? ' (parti ' + partiNycklar(parti).join(', ') + ')' : ''} finns redan i repot: ${h.map(x => NAMN[x.plats] + ' ' + x.text).join('; ')} — ${regel}`);
  e.sparr = true; throw e;
}
/* Tabellens testrader ur samma parti, när en rapport ska bli träning: Mat
   test-fall (ur repot) släpps, bänkfall och testrader utan kopia i repot
   (okänt slag) spärrar. → { hinder: [{ kod, slag }], mattest: [kod] }. */
function domTestrader(koder) {
  const ut = { hinder: [], mattest: [] };
  for (const k of koder) { const s = slagIRepot(k); if (s === 'mattest') ut.mattest.push(k); else ut.hinder.push({ kod: k, slag: s }); }
  return ut;
}

/* Raderna på andra sidan i samma parti eller tillfälle (`var`, `enhet` för texten). Kastar om de spärrar;
   annars partiets Mat test-fall, som inte spärrar träningen. */
function domAndraSidan(kod, efter, ovr, var_, enhet) {
  if (efter === 'test') { const e = new Error(`SPÄRREN: ${kod}: ${var_} har redan ${ovr.join(', ')} som traning — ${enhet} är bänkfall eller träning, aldrig båda`); e.sparr = true; throw e; }
  /* efter = traning: tabellen säger test för både Mat test och bänk — slaget ur repot */
  const d = domTestrader(ovr);
  if (d.hinder.length) {
    const bank = d.hinder.filter(x => x.slag === 'bank').map(x => x.kod), okand = d.hinder.filter(x => !x.slag).map(x => x.kod);
    const delar = [];
    if (bank.length) delar.push(`${bank.join(', ')} som bänkfall (test) — ${enhet} är bänkfall eller träning, aldrig båda`);
    if (okand.length) delar.push(`${okand.join(', ')} som test i tabellen men utan kopia i repot (varken dev/mattest/underlag/rapporter/ eller dev/material/rapportbank/), så slaget är okänt — ett bänkfall ur ${enhet === 'ett parti' ? 'samma parti' : 'samma tillfälle'} skulle läcka, så spärren vägrar för säkerhets skull. Ligger fallet på en annan gren: slå ihop den först`);
    const e = new Error(`SPÄRREN: ${kod}: ${var_} har redan ${delar.join('; och ')}`); e.sparr = true; throw e;
  }
  return d.mattest;
}

/* Spärren i tabellen: läser raden, prövar övergången och sätter värdet med
   ett villkor på det gamla (två samtidiga kan inte båda vinna). Kastar om
   spärren säger nej. opt.slag: 'mattest' | 'bank' för test (satt.cjs vet inte
   — då slaget i repot, annars den strängare regeln). Returnerar
   { fore, efter, redan, mattestIPartiet }. */
async function sattAnvandning(S, kod, efter, opt) {
  opt = opt || {};
  const [rad] = await S.rest('GET', `rapporter?kod=eq.${encodeURIComponent(kod)}&select=kod,kalla,anvandning,game_id,user_id,created_at`);
  if (!rad) { const e = new Error(`${kod} finns inte i tabellen rapporter`); e.saknas = true; throw e; }
  const fore = rad.anvandning || null, game_id = rad.game_id || null;
  if (opt.franTillFall && fore === 'slangd') { const e = new Error(`${kod} är slangd — sätt om den med satt.cjs först om den ska bli ett fall`); e.sparr = true; throw e; }
  const g = overgang(fore, efter);
  if (!g.ok) { const e = new Error(`SPÄRREN: ${kod}: ${g.varfor}`); e.sparr = true; throw e; }
  /* Partiet är tabellens game_id OCH det lokala (opt.parti, ur den hämtade
     mappen): en rad utan game_id (telefonens rapporter, ett raderat parti —
     on delete set null) prövas ändå på partiet den lokala kopian bär, och
     tabellen frågas på båda game_id. */
  const lokal = opt.parti || {};
  const parti = Object.assign({}, lokal, game_id ? { game_id } : {});
  const slag = efter === 'test' ? (opt.slag || slagIRepot(kod) || 'bank') : null;
  let mattestIPartiet = [];
  if (LAST.has(efter)) {
    const gids = [...new Set([game_id, lokal.game_id].filter(Boolean).map(g => String(g).toLowerCase()))];
    /* Ett Mat test-fall spärrar bara sin egen rad (overgang ovan), aldrig partiet eller tillfället. */
    if (slag !== 'mattest') for (const g of gids) {
      const andra = efter === 'test' ? 'traning' : 'test';
      const ovr = await S.rest('GET', `rapporter?game_id=eq.${encodeURIComponent(g)}&kod=neq.${encodeURIComponent(kod)}&anvandning=eq.${andra}&select=kod`);
      if (!ovr || !ovr.length) continue;
      mattestIPartiet = mattestIPartiet.concat(domAndraSidan(kod, efter, ovr.map(x => x.kod), `samma parti (game_id ${g})`, 'ett parti'));
    }
    /* Tillfället: samma spelare med under 6 h mellan raderna, eller samma match (tillfallen). Matcherna ovan är redan prövade. */
    let koder = null;
    if (slag !== 'mattest') {
      const alla = await allaRader(S);
      if (!Array.isArray(alla)) { const e = new Error(`${kod}: tabellens rader gick inte att läsa — spärren kan inte pröva tillfället, inget gjort`); e.sparr = true; throw e; }
      const mig = alla.find(x => x.kod === kod) || { kod, user_id: rad.user_id, created_at: rad.created_at, game_id };
      const T = tillfallen(alla.some(x => x.kod === kod) ? alla : alla.concat([mig]), lokal.game_id ? [[kod, lokal.game_id]] : []);
      const id = T.get(kod), andra = efter === 'test' ? 'traning' : 'test';
      const tillf = alla.filter(x => x.kod !== kod && T.get(x.kod) === id);
      koder = tillf.map(x => x.kod);
      const ovr = tillf.filter(x => x.anvandning === andra && !(x.game_id && gids.includes(String(x.game_id).toLowerCase())));
      if (ovr.length) mattestIPartiet = mattestIPartiet.concat(domAndraSidan(kod, efter, ovr.map(x => x.kod), 'samma tillfälle (samma spelare med under 6 h mellan matcherna, eller samma match)', 'ett tillfälle'));
    }
    kravLokal(kod, efter, parti, slag, koder);
    /* skiljer sig det lokala game_id från tabellens: pröva repot på det också */
    if (lokal.game_id && game_id && String(lokal.game_id).toLowerCase() !== String(game_id).toLowerCase()) kravLokal(kod, efter, lokal, slag, koder);
  }
  const extra = { kalla: rad.kalla, game_id, utanParti: !harParti(parti), mattestIPartiet: [...new Set(mattestIPartiet)] };
  if (g.redan) return Object.assign({ fore, efter, redan: true }, extra);
  if (opt.torr) return Object.assign({ fore, efter, torr: true }, extra);
  const villkor = fore == null ? 'anvandning=is.null' : `anvandning=eq.${fore}`;
  const r = await S.rest('PATCH', `rapporter?kod=eq.${encodeURIComponent(kod)}&${villkor}`, { anvandning: efter });
  if (!r || !r.length) throw new Error(`${kod}: raden ändrades under tiden (anvandning var ${fore}) — kör igen`);
  return Object.assign({ fore, efter }, extra);
}

module.exports = { VARDEN, overgang, kopior, kopiorDetalj, hinderLokalt, slagIRepot, kravLokal, sattAnvandning, harKod, partiNycklar, harParti, tillfallen, allaRader, TILLFALLE_MS };

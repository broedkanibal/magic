'use strict';
/* Lärda referenser mellan enheter (MES-231): provar RefMoln och Ref ur
   index.html — koden klipps ut ur filen, inte kopieras — mot två låtsade
   enheter (egna IndexedDB, egen pool) och en gemensam tabell i minnet som
   gör det learned_refs gör: nyckeln (konto, lek, id), taket 4 per namn med
   nyast vinner (triggern), och JSON på vägen dit och tillbaka.

     node dev/embed/refmoln-prov.cjs

   Det som provas:
     A  tabellen saknas → telefonens lista och IndexedDB exakt som utan synk
     B  lärt på telefon 1 → finns på telefon 2 efter nästa poolbygge, samma
        bild (tecken för tecken), namn, tid och källa
     C  taket: telefon 2 lär ett femte → båda enheterna och tabellen har
        samma fyra, den äldsta borta, och poolen i minnet släpper den
     D  offline: det som lärts utan nät laddas upp vid nästa poolbygge
     E  "Forget learned photos…": tabellen töms, telefon 2 släpper de uppladdade
     F  en annan lek och en annan spelare rörs inte */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
function klipp(fran, till) {
  const a = html.indexOf(fran); if (a < 0) throw new Error('hittar inte ' + fran);
  const b = html.indexOf(till, a); if (b < 0) throw new Error('hittar inte slutet efter ' + fran);
  return html.slice(a, b);
}
/* Ref: från konstanterna till slutet av objektet. RefMoln: hela blocket. */
const REF_KOD = klipp('const REF_TAK = 4', '\nasync function fetchQuery');
const REFMOLN_KOD = klipp('const RefMoln = {', '\n/* ══════════════════════════════════════════════════════════════════\n   AUTOMATISK AVLÄSNING');

/* ── tabellen ── */
function nyTabell() {
  const rader = [];
  return {
    rader, saknas: false,
    /* PostgREST: JSON in, JSON ut. */
    upsert(json) {
      for (const r of JSON.parse(json)) {
        if (rader.some(x => x.user_id === r.user_id && x.deck_id === r.deck_id && x.id === r.id)) continue;   // ignoreDuplicates
        rader.push(r);
        /* triggern learned_refs_tak */
        const samma = rader.filter(x => x.user_id === r.user_id && x.deck_id === r.deck_id && x.namn === r.namn)
          .sort((a, b) => (b.ts - a.ts) || (b.id < a.id ? -1 : b.id > a.id ? 1 : 0));
        for (const bort of samma.slice(4)) rader.splice(rader.indexOf(bort), 1);
      }
    },
    select(user, lek) { return JSON.stringify(rader.filter(r => r.user_id === user && r.deck_id === lek).map(r => ({ id: r.id, namn: r.namn, sid: r.sid, bild: r.bild, kalla: r.kalla, ts: r.ts }))); },
    delete(user, lek, ids) { for (let i = rader.length - 1; i >= 0; i--) { const r = rader[i]; if (r.user_id === user && r.deck_id === lek && (!ids || ids.includes(r.id))) rader.splice(i, 1); } }
  };
}

/* ── en enhet: Ref + RefMoln ur index.html, med låtsad IDB, Pool och Moln ── */
function nyEnhet(namn, tabell, o) {
  o = o || {};
  const idb = new Map(), timers = [];
  const enhet = { namn, uppe: true, anrop: { hamta: 0, spara: 0, radera: 0 } };
  const Moln = {
    inloggad: () => true,
    /* Samma form som Moln.hamtaRefs / sparaRefs / raderaRefs i index.html. */
    async hamtaRefs(lekId) {
      enhet.anrop.hamta++;
      if (!enhet.uppe || tabell.saknas) return null;
      return JSON.parse(tabell.select(o.user || 'u1', lekId)).map(r => ({ id: r.id, name: r.namn, sid: r.sid || null, bild: r.bild, ts: Number(r.ts), kalla: r.kalla || null }));
    },
    async sparaRefs(lekId, refs) {
      enhet.anrop.spara++;
      if (!enhet.uppe || tabell.saknas || !refs.length) return false;
      tabell.upsert(JSON.stringify(refs.map(r => ({ user_id: o.user || 'u1', deck_id: lekId, id: String(r.id), namn: r.name, sid: r.sid || null, bild: r.bild,
        kalla: r.kalla === 'ai' || r.kalla === 'hand' ? r.kalla : null, ts: Math.round(r.ts) }))));
      return true;
    },
    async raderaRefs(lekId, ids) { enhet.anrop.radera++; if (!enhet.uppe || tabell.saknas) return false; tabell.delete(o.user || 'u1', lekId, ids); return true; }
  };
  const Pool = {
    idx: null, borttagna: [],
    async laggTill(rec, card) { rec.ids.push(card.id); rec.names.push(card.name); return rec; },
    taBort(rec, id) { const i = rec.ids.indexOf(id); if (i >= 0) { rec.ids.splice(i, 1); rec.names.splice(i, 1); } Pool.borttagna.push(id); return rec; },
    async load() { return null; }
  };
  const IDB = { async poolGet(k) { return idb.has(k) ? JSON.parse(idb.get(k)) : undefined; }, async poolPut(v) { idb.set(v.code, JSON.stringify(v)); }, async poolDel(k) { idb.delete(k); } };
  /* Klockan går bara när enheten lär sig (lar nedan), och slumpen har ett
     eget frö per enhet: två enheter med samma frö och samma steg ger samma
     id:n och tider — det prov A jämför. */
  let klocka = o.klocka || 1_700_000_000_000, fro = [...(o.fro || namn)].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const Datum = { now: () => klocka };
  const Matte = Object.assign(Object.create(Math), { random: () => { fro = (fro * 1664525 + 1013904223) >>> 0; return fro / 4294967296; } });
  const ctx = vm.createContext({ window: { MESA_REFMOLN: o.utanSynk ? false : undefined }, IDB, Pool, Moln, BAKSIDA_NAMN: '(card back)', Date: Datum, Math: Matte,
    setTimeout: (f) => { timers.push(f); return timers.length; }, clearTimeout: () => {}, Promise, Map, Set, String, Object, Array, Number, JSON, console, document: {} });
  vm.runInContext(REF_KOD + '\n' + REFMOLN_KOD + '\n;this.Ref = Ref; this.RefMoln = RefMoln; this.REF_TAK = REF_TAK;', ctx);
  Object.assign(enhet, {
    ctx, idb, Pool, Moln,
    get Ref() { return ctx.Ref; }, get RefMoln() { return ctx.RefMoln; },
    /* Som byggLekPool: ladda, (hämta), väv in i poolen. */
    async byggPool(kod) {
      const rec = Pool.idx && Pool.idx.code === kod ? Pool.idx : { code: kod, ids: [], names: [] };
      if (ctx.Ref.kod !== kod) await ctx.Ref.ladda(kod);
      if (!o.utanSynk) await ctx.RefMoln.hamta(rec.code, true);
      Pool.idx = await ctx.Ref.tillampa(rec);
      return Pool.idx;
    },
    /* Som kamLart: lär, och skicka upp (timern körs direkt här). */
    async lar(namn, bild, kalla) {
      klocka += 1000;
      await ctx.Ref.lar(namn, 'sid-' + namn, bild, kalla);
      if (!o.utanSynk) { ctx.RefMoln.skicka(ctx.Ref.kod); await this.korTimers(); }
    },
    async korTimers() { while (timers.length) await timers.shift()(); },
    /* Som glomRef på lekens sida. */
    async glom(kod) { await ctx.Ref.glom(kod); if (!o.utanSynk) await ctx.RefMoln.glom(kod); },
    lista: () => ctx.Ref.lista.map(r => ({ id: r.id, name: r.name, sid: r.sid, bild: r.bild, ts: r.ts, kalla: r.kalla })).sort((a, b) => a.id < b.id ? -1 : 1)
  });
  return enhet;
}

let ok = 0, fel = 0;
const prov = (namn, villkor, info) => { if (villkor) { ok++; console.log('OK   ' + namn); } else { fel++; console.log('FEL  ' + namn + (info ? '  ' + JSON.stringify(info).slice(0, 400) : '')); } };
const LEK = 'lek:11111111-2222-3333-4444-555555555555', LEK2 = 'lek:99999999-2222-3333-4444-555555555555';
const bild = n => 'data:image/jpeg;base64,' + Buffer.from('jpeg ' + n + ' ' + 'x'.repeat(8000)).toString('base64');
const idsAv = xs => xs.map(r => r.id).sort().join(',');

(async () => {
  /* A: tabellen saknas → samma som utan synk. */
  {
    const tabell = nyTabell(); tabell.saknas = true;
    const med = nyEnhet('med', tabell, { fro: 'A' }), utan = nyEnhet('utan', nyTabell(), { utanSynk: true, fro: 'A' });
    for (const e of [med, utan]) {
      await e.byggPool(LEK);
      await e.lar('Pacifism', bild(1), 'ai'); await e.lar('Pacifism', bild(2), 'hand'); await e.lar('Swamp', bild(3), 'ai');
      await e.byggPool(LEK);
    }
    prov('A tabellen saknas: samma lista som utan synk', JSON.stringify(med.lista()) === JSON.stringify(utan.lista()), { med: med.lista().length, utan: utan.lista().length });
    const idbAv = e => { const v = JSON.parse(e.idb.get('ref:' + LEK)); return JSON.stringify(v.refs.map(r => { const { moln, ...rest } = r; return rest; })); };
    prov('A tabellen saknas: samma IndexedDB-post (utom ts på posten)', idbAv(med) === idbAv(utan));
    prov('A tabellen saknas: inget r.moln satt', med.Ref.lista.every(r => !r.moln));
    prov('A tabellen saknas: poolen bär samma referenser', JSON.stringify(med.Pool.idx.names) === JSON.stringify(utan.Pool.idx.names));
  }

  /* B–E: två telefoner, samma konto och lek. */
  const tabell = nyTabell();
  const t1 = nyEnhet('telefon 1', tabell, { klocka: 1_700_000_000_000 }), t2 = nyEnhet('telefon 2', tabell, { klocka: 1_700_000_500_000 });
  await t1.byggPool(LEK);
  for (let i = 1; i <= 5; i++) await t1.lar('Pacifism', bild('P' + i), i % 2 ? 'ai' : 'hand');   // taket: de fyra nyaste blir kvar
  await t1.lar('Swamp', bild('S1'), 'ai'); await t1.lar('Swamp', bild('S2'), 'hand');
  prov('B telefon 1 har 4 Pacifism + 2 Swamp', t1.lista().length === 6);
  prov('B tabellen har samma 6', idsAv(tabell.rader) === idsAv(t1.lista()), { tabell: tabell.rader.length });
  await t2.byggPool(LEK);
  prov('B telefon 2 får samma 6 vid poolbygget', idsAv(t2.lista()) === idsAv(t1.lista()));
  prov('B samma bild tecken för tecken, samma namn, tid, källa', JSON.stringify(t2.lista()) === JSON.stringify(t1.lista()));
  prov('B telefon 2:s pool bär dem', t2.Pool.idx.ids.filter(x => /#ref/.test(x)).length === 6);

  /* C: telefon 2 lär ett femte Pacifism — nyast vinner överallt. */
  const aldsta = t1.lista().filter(r => r.name === 'Pacifism').sort((a, b) => a.ts - b.ts)[0];
  await t2.lar('Pacifism', bild('P6'), 'hand');
  prov('C tabellen: fortfarande 4 Pacifism, den äldsta borta', tabell.rader.filter(r => r.namn === 'Pacifism').length === 4 && !tabell.rader.some(r => r.id === aldsta.id));
  await t1.byggPool(LEK);
  prov('C telefon 1 efter poolbygget: samma som telefon 2 och tabellen', idsAv(t1.lista()) === idsAv(t2.lista()) && idsAv(t1.lista()) === idsAv(tabell.rader));
  prov('C telefon 1:s pool släppte den äldsta (Pool.taBort)', t1.Pool.borttagna.includes(t1.Ref.poolId(aldsta)) && !t1.Pool.idx.ids.includes(t1.Ref.poolId(aldsta)));

  /* D: offline på telefon 1. */
  t1.uppe = false;
  await t1.lar('Night\'s Whisper', bild('N1'), 'ai');
  prov('D offline: lärd lokalt, inte i tabellen', t1.lista().some(r => r.name === "Night's Whisper") && !tabell.rader.some(r => r.namn === "Night's Whisper"));
  t1.uppe = true;
  await t1.byggPool(LEK);
  prov('D tillbaka online: uppladdad vid nästa poolbygge', tabell.rader.some(r => r.namn === "Night's Whisper"));
  await t2.byggPool(LEK);
  prov('D telefon 2 får den', t2.lista().some(r => r.name === "Night's Whisper") && idsAv(t2.lista()) === idsAv(t1.lista()));

  /* E: Forget learned photos på telefon 1. */
  const fore2 = t2.lista().length;
  await t1.glom(LEK);
  prov('E tabellen tom för leken', tabell.rader.length === 0);
  await t2.byggPool(LEK);
  prov('E telefon 2 släpper de uppladdade', t2.lista().length === 0 && fore2 > 0, { fore2, efter: t2.lista().length });
  await t1.byggPool(LEK);
  prov('E telefon 1 börjar om tom', t1.lista().length === 0);

  /* F: en annan lek, en annan spelare. */
  const annan = nyEnhet('annan spelare', tabell, { user: 'u2' });
  await annan.byggPool(LEK); await annan.lar('Swamp', bild('X1'), 'ai');
  await t1.byggPool(LEK2); await t1.lar('Plains', bild('L1'), 'ai');
  await t1.byggPool(LEK);
  prov('F telefon 1:s lek 1 ser varken lek 2 eller den andra spelarens', t1.lista().length === 0);
  await t2.byggPool(LEK2);
  prov('F telefon 2 ser lek 2 när den leken byggs', t2.lista().length === 1 && t2.lista()[0].name === 'Plains');

  console.log(`\n${ok} OK, ${fel} FEL`);
  process.exit(fel ? 1 : 0);
})().catch(e => { console.error('FEL', e); process.exit(1); });

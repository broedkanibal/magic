#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════
   Provet för vyerna upplevelse_* (supabase/migrations): ett korts sista
   namn räknas (20261016130000_kh_sista_namnet.sql, MES-387).

     node dev/spelupplevelse-prov.cjs

   Migrationerna körs i PGlite (Postgres i WebAssembly) på testdata: först
   vyerna som de var (20261009120000, 20261010120000, 20261015090000), sedan
   den nya migrationen två gånger (den ska gå att köra om). Tabellerna före
   och efter skrivs ut, och varje testkort jämförs mot det väntade.
   Produktionens Supabase rörs aldrig.

   Korten är de vägar index.html (namnOvergang, ⌘Z, applyPick) loggar:
   Undo efter Change card, A → B → C, A → B → C + Undo, tillbaka till
   kamerans namn, ⌘Z av namnet, ⌘Z av ett tap, ett bytt utan angrad,
   två bytt i rad (applyPick), Undo efter ett tap, ett kort utan konto.

   PGlite hämtas inte: som dev/identify-vakt.cjs letar provet efter ett
   paket som redan finns (PGLITE=<sökväg till pglite/dist/index.js>, annars
   ../pairing-app/node_modules/@electric-sql/pglite). Finns det inte slutar
   provet med kod 2 — det låtsas aldrig att SQL:en är provad.

   Slutkod 0 = alla kort som väntat, 1 = något FEL.
   ══════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const { pathToFileURL } = require('url');

const ROT = path.join(__dirname, '..'), MIG = path.join(ROT, 'supabase', 'migrations');
const lasMig = f => fs.readFileSync(path.join(MIG, f), 'utf8');

function hittaPglite() {
  const kand = [process.env.PGLITE,
    path.join(ROT, '..', 'pairing-app', 'node_modules', '@electric-sql', 'pglite', 'dist', 'index.js'),
    '/Users/jesperfunk/Code/pairing-app/node_modules/@electric-sql/pglite/dist/index.js'].filter(Boolean);
  return kand.find(f => fs.existsSync(f)) || null;
}

const G = '00000000-0000-0000-0000-000000000001', U = '00000000-0000-0000-0000-0000000000aa';
const T0 = Date.parse('2026-10-16T10:00:00Z');
/* Varje kort: händelserna i ordning, [typ, sekunder efter start, fält]. Samma sekund = samma tid (namnOvergang loggar
   angrad och den nya bytt i samma anrop). Fälten utom namn och fran hamnar i rapport. */
const KORT = {
  c1_undo:          [['namn', 0, { namn: 'A' }], ['bytt', 1, { fran: 'A', namn: 'B' }], ['angrad', 2, { namn: 'A', fran: 'B', av: 'namn' }]],
  c2_nytt_namn:     [['namn', 0, { namn: 'A' }], ['bytt', 1, { fran: 'A', namn: 'B' }], ['angrad', 2, { namn: 'C', fran: 'B', av: 'namn' }], ['bytt', 2, { fran: 'A', namn: 'C' }]],
  c3_abc_undo:      [['namn', 0, { namn: 'A' }], ['bytt', 1, { fran: 'A', namn: 'B' }], ['angrad', 2, { namn: 'C', fran: 'B', av: 'namn' }], ['bytt', 2, { fran: 'A', namn: 'C' }],
                     ['angrad', 3, { namn: 'B', fran: 'C', av: 'namn' }], ['bytt', 3, { fran: 'A', namn: 'B' }]],
  c4_till_kameran:  [['namn', 0, { namn: 'A' }], ['bytt', 1, { fran: 'A', namn: 'B' }], ['angrad', 2, { namn: 'A', fran: 'B', av: 'namn' }]],
  c5_cmdz_namn:     [['namn', 0, { namn: 'A' }], ['bytt', 1, { fran: 'A', namn: 'B' }], ['angrad', 2, { namn: 'A', av: 'cmdz', efter: { finns: 1, paBord: 1, tappad: 0, zon: null, namn: 'A' } }]],
  c6_cmdz_tap:      [['namn', 0, { namn: 'A' }], ['bytt', 1, { fran: 'A', namn: 'B' }], ['angrad', 2, { namn: 'B', av: 'cmdz', efter: { finns: 1, paBord: 1, tappad: 0, zon: null, namn: 'B' } }]],
  c7_bara_bytt:     [['namn', 0, { namn: 'A' }], ['bytt', 1, { fran: 'A', namn: 'B' }]],
  c8_tap_undo:      [['namn', 0, { namn: 'D' }], ['tap_hand', 1, { namn: 'D' }], ['angrad', 2, { namn: 'D', av: 'tap' }]],
  c9_ratt:          [['namn', 0, { namn: 'E' }]],
  c10_applypick_2x: [['namn', 0, { namn: 'A' }], ['bytt', 1, { fran: 'A', namn: 'B' }], ['bytt', 2, { fran: 'B', namn: 'C' }]],
};
/* Ett konto som tagits bort (user_id null): Undo ska räknas också där. */
const UTAN_KONTO = [['namn', 0, { namn: 'A' }], ['bytt', 1, { fran: 'A', namn: 'B' }], ['angrad', 2, { av: 'namn' }]];
/* Efter migrationen: [bytt, rattningar, ratt_sjalv] per kort. */
const VANTAT = {
  c1_undo: [false, 0, true], c2_nytt_namn: [true, 1, false], c3_abc_undo: [true, 1, false], c4_till_kameran: [false, 0, true],
  c5_cmdz_namn: [false, 0, true], c6_cmdz_tap: [true, 1, false], c7_bara_bytt: [true, 1, false], c8_tap_undo: [false, 0, true],
  c9_ratt: [false, 0, true], c10_applypick_2x: [true, 1, false], c11_utan_konto: [false, 0, true],
};
const FRAGA5_VANTAD = 'A→B×3 A→C×1 B→C×1';

/* Fråga 5 i dev/spelupplevelse.sql, före och efter. */
const FRAGA5_FORE = `select fran, namn as till, count(*) as ganger from public.kort_handelser where typ = 'bytt'
                     group by fran, namn order by ganger desc, fran, till`;
const FRAGA5_EFTER = `select bytt_fran as fran, bytt_till as till, count(*) as ganger from public.upplevelse_kort where bytt
                      group by bytt_fran, bytt_till order by ganger desc, fran, till`;

(async () => {
  const pg = hittaPglite();
  if (!pg) { console.error('spelupplevelse-prov: PGlite finns inte på datorn (sätt PGLITE=…/pglite/dist/index.js). SQL:en är INTE provad.'); process.exit(2); }
  const { PGlite } = await import(pathToFileURL(pg).href);
  const db = new PGlite();
  /* Det i schema.sql som migrationerna behöver, i minsta form. */
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
    create table public.games (id uuid primary key, kod text, startad timestamptz, avslutad timestamptz);
    create table public.game_players (game_id uuid, user_id uuid, namn text, gick_med timestamptz default now());
    create function public.i_spelet(g uuid) returns boolean language sql as $$ select true $$;
    insert into auth.users values ('${U}');
    insert into public.games values ('${G}', 'PROV42', now() - interval '1 hour', null);
    insert into public.game_players (game_id, user_id, namn) values ('${G}', '${U}', 'Provare');`);
  for (const f of ['20261009120000_spelupplevelse.sql', '20261010120000_kh_match_rapport.sql', '20261015090000_kh_handlingar.sql'])
    await db.exec(lasMig(f));

  const lagg = (anv, cid, [typ, s, f]) => {
    const { namn = null, fran = null, ...rapport } = f;
    return db.query(`insert into public.kort_handelser (tid, game_id, user_id, kort, typ, namn, fran, kalla, rapport, lage)
                     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'bord')`,
      [new Date(T0 + s * 1000).toISOString(), G, anv, cid, typ, namn, fran, typ === 'namn' ? 'telefon' : null,
       Object.keys(rapport).length ? JSON.stringify(rapport) : null]);
  };
  for (const [cid, hh] of Object.entries(KORT)) for (const h of hh) await lagg(U, cid, h);
  for (const h of UTAN_KONTO) await lagg(null, 'c11_utan_konto', h);

  async function bild(rubrik, fraga5) {
    console.log(`\n══ ${rubrik}`);
    const k = await db.query('select kort, bytt, rattningar, ratt_sjalv from public.upplevelse_kort order by kort');
    console.table(k.rows);
    console.table((await db.query('select kort, rattningar_per_100_kort, fel_namn_per_100_kort, procent_ratt_av_sig_sjalv from public.upplevelse_totalt')).rows);
    console.table((await db.query('select * from public.upplevelse_handlingar order by spelare')).rows.map(({ game_id, user_id, ...r }) => r));
    console.log('fråga 5:'); console.table((await db.query(fraga5)).rows);
    return Object.fromEntries(k.rows.map(r => [r.kort, r]));
  }

  await bild('FÖRE (vyerna före 20261016130000)', FRAGA5_FORE);
  await db.exec(lasMig('20261016130000_kh_sista_namnet.sql'));
  await db.exec(lasMig('20261016130000_kh_sista_namnet.sql'));
  const efter = await bild('EFTER 20261016130000 (körd två gånger)', FRAGA5_EFTER);

  let fel = 0;
  for (const [cid, [b, r, s]] of Object.entries(VANTAT)) {
    const e = efter[cid];
    if (!e || e.bytt !== b || Number(e.rattningar) !== r || e.ratt_sjalv !== s) { fel++; console.log('FEL ', cid, JSON.stringify(e), '≠', JSON.stringify({ bytt: b, rattningar: r, ratt_sjalv: s })); }
  }
  const f5 = (await db.query(FRAGA5_EFTER)).rows.map(r => `${r.fran}→${r.till}×${r.ganger}`).join(' ');
  if (f5 !== FRAGA5_VANTAD) { fel++; console.log('FEL  fråga 5:', f5, '≠', FRAGA5_VANTAD); }
  const h = (await db.query('select angrade, angrade_namn from public.upplevelse_handlingar where user_id is not null')).rows[0];
  if (Number(h.angrade) !== 3 || Number(h.angrade_namn) !== 5) { fel++; console.log('FEL  upplevelse_handlingar: angrade', h.angrade, 'angrade_namn', h.angrade_namn, '≠ 3 och 5'); }
  console.log(fel ? `\n${fel} FEL` : `\nOK   alla ${Object.keys(VANTAT).length} kort, fråga 5 och upplevelse_handlingar som väntat`);
  process.exit(fel ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

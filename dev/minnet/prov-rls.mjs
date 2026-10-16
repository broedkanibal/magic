/* Minnet i datan (MES-373): migrationen i en riktig Postgres (PGlite), och RLS med två konton.

   Kör:  node dev/minnet/prov-rls.mjs        (första gången: npm install --prefix dev/minnet)

   1. Bakåtfyllningen (J2): gamla partier (boards + hidden_cards + kort_handelser) och lekar (decks)
      skrivs in en gång — rätt källa, bekräftelse och antal, inga tokens, inga platshållare, basland
      utan antal. Migrationen går att köra om utan att något ändras.
   2. RLS: spelare A och B i samma parti. Var och en läser och skriver bara sina egna rader; ingen
      läser motståndarens minne, inte heller i det gemensamma partiet. Ingen skriver i någon annans
      namn, i ett parti hen inte är med i, eller på någon annans lek. anon kommer inte åt tabellen.
   3. Sammanslagningen (triggern): en upsert som PostgREST gör den (on conflict … do update) håller
      det högsta antalet och en bekräftelse; en inläst lek skrivs om rakt av; en rättelse tar bort raden.
   4. decks.lage: förvalt complete, learned går, annat går inte. En borttagen lek tar sina inlästa rader.

   Slutkod 0 = allt OK, 1 = något FEL, 2 = gick inte att köra. */
import { byggDb, som, migrationSql } from './db.mjs';

const A = '00000000-0000-4000-8000-00000000000a', B = '00000000-0000-4000-8000-00000000000b', C = '00000000-0000-4000-8000-00000000000c';   // C lämnade partiet
const G1 = '00000000-0000-4000-8000-0000000000a1';   // A (Mirror) och B (Digital)
const G2 = '00000000-0000-4000-8000-0000000000b2';   // bara B
const DA = '00000000-0000-4000-8000-0000000000da', DB = '00000000-0000-4000-8000-0000000000db';

const rad = [], ok = (namn, villkor, detalj) => rad.push([namn, !!villkor, villkor ? '' : (detalj || '')]);
const forsok = async fn => { try { return { ok: true, v: await fn() }; } catch (e) { return { ok: false, fel: e.message }; } };

/* Gamla data, som de ligger i produktionen före migrationen. */
async function gamla(db) {
  await db.query(`insert into auth.users (id) values ($1), ($2), ($3)`, [A, B, C]);
  await db.query(`insert into public.games (id, kod, vard) values ($1, 'PROVA1', $3), ($2, 'PROVB2', $4)`, [G1, G2, A, B]);
  await db.query(`insert into public.game_players (game_id, user_id, namn, farg, plats, lage) values
    ($1, $2, 'A', '#f00', 1, 'bord'), ($1, $3, 'B', '#00f', 2, 'utan'), ($4, $3, 'B', '#00f', 1, 'bord')`, [G1, A, B, G2]);
  const kortA = [
    { cid: 'a1', name: 'Llanowar Elves', sid: 'sid-elves' }, { cid: 'a2', name: 'Llanowar Elves' },
    { cid: 'a3', name: 'Forest' }, { cid: 'a4', name: 'Forest' }, { cid: 'a5', name: 'Forest', zon: 'grav' },
    { cid: 'a6', name: 'Serra Angel', sid: 'sid-serra' },
    { cid: 'a7', flipped: 1 },                       // nedvänt: namnet står bara i hidden_cards
    { cid: 'a8', name: 'Saproling', tok: 1 },        // token: inget kort
    { cid: 'a9', name: 'Shock', zon: 'exil' }
  ];
  await db.query(`insert into public.boards (game_id, user_id, kort) values ($1, $2, $3), ($1, $4, $5), ($6, $4, $7)`,
    [G1, A, JSON.stringify(kortA), B, JSON.stringify([{ cid: 'b1', name: 'Counterspell' }, { cid: 'b2', name: 'Island' }]), G2, JSON.stringify([{ cid: 'b9', name: 'Brainstorm' }])]);
  /* C lämnade partiet (gp_lamna tar bort game_players-raden), bordet står kvar. */
  await db.query(`insert into public.boards (game_id, user_id, kort) values ($1, $2, $3)`, [G1, C, JSON.stringify([{ cid: 'c1', name: 'Dark Ritual' }])]);
  await db.query(`insert into public.hidden_cards (game_id, user_id, kort) values ($1, $2, $3)`, [G1, A, JSON.stringify({ a7: { name: 'Morphling', sid: 'sid-morph' } })]);
  await db.query(`insert into public.kort_handelser (game_id, user_id, kort, typ, namn) values ($1, $2, 'a6', 'namngiven', 'Serra Angel'), ($1, $2, 'a1', 'namn', 'Llanowar Elves')`, [G1, A]);
  await db.query(`insert into public.decks (id, user_id, namn, kort) values ($1, $2, 'Elves', $3), ($4, $5, 'Blue', $6)`,
    [DA, A, JSON.stringify([{ name: 'Llanowar Elves', sid: 'sid-elves', n: 4 }, { name: 'Forest', n: 17 }, { name: 'Naturalize', n: 2, sb: 1 }, { name: 'Giant Growth', n: '3' }, { okand: 1, n: 1 }, { name: 'Okänt kort', okand: true }]),
     DB, B, JSON.stringify([{ name: 'Counterspell', n: 4 }])]);
}

const allaAv = async (db, uid) => (await db.query(`select namn, sid, game_id, deck_id, kalla, bekraftad, antal from public.spelarens_kort where user_id = $1 order by grupp, namn`, [uid])).rows;
const hitta = (rader, grupp, namn) => rader.find(r => (r.game_id || r.deck_id) === grupp && r.namn === namn);

let db;
try { db = await byggDb({ fore: gamla }); }
catch (e) { console.error('prov-rls: databasen gick inte att bygga: ' + e.message); process.exit(2); }

/* ── 1. Bakåtfyllningen ── */
const fA = await allaAv(db, A), fB = await allaAv(db, B);
const elv = hitta(fA, G1, 'Llanowar Elves'), forest = hitta(fA, G1, 'Forest'), serra = hitta(fA, G1, 'Serra Angel');
ok('bakåt: A:s parti — Llanowar Elves ×2 från telefonen, med tryckningen', elv && elv.antal === 2 && elv.kalla === 'telefon' && !elv.bekraftad && elv.sid === 'sid-elves', JSON.stringify(elv));
ok('bakåt: basland (Forest ×3, en i graveyard) får inget antal', forest && forest.antal === null, JSON.stringify(forest));
ok('bakåt: ett namn spelaren själv gav (kort_handelser namngiven) är spelarens och bekräftat', serra && serra.kalla === 'spelaren' && serra.bekraftad, JSON.stringify(serra));
ok('bakåt: det nedvända kortet får sitt namn ur hidden_cards, token räknas inte, exile räknas', !!hitta(fA, G1, 'Morphling') && hitta(fA, G1, 'Morphling').sid === 'sid-morph' && !hitta(fA, G1, 'Saproling') && !!hitta(fA, G1, 'Shock'), JSON.stringify(fA.filter(r => r.game_id === G1).map(r => r.namn)));
ok('bakåt: A:s parti har exakt fem namn (Elves, Forest, Morphling, Serra Angel, Shock)', fA.filter(r => r.game_id === G1).length === 5, fA.filter(r => r.game_id === G1).map(r => r.namn).join(','));
const cs = hitta(fB, G1, 'Counterspell');
ok('bakåt: B spelade Digital table i partiet — allt lagt för hand är spelarens och bekräftat', cs && cs.kalla === 'spelaren' && cs.bekraftad && hitta(fB, G1, 'Island').antal === null, JSON.stringify(fB));
const fC = await allaAv(db, C), dr = hitta(fC, G1, 'Dark Ritual');
ok('bakåt: en spelare som lämnat partiet (ingen game_players-rad) fylls också — telefon, obekräftad', dr && dr.kalla === 'telefon' && dr.bekraftad === false, JSON.stringify(fC));
ok('bakåt: B:s andra parti (Mirror) står för sig', hitta(fB, G2, 'Brainstorm') && hitta(fB, G2, 'Brainstorm').kalla === 'telefon');
const dl = fA.filter(r => r.deck_id === DA);
ok('bakåt: A:s lek som inläst och bekräftad — antalet ur n, sideboarden med, platshållarna inte', dl.length === 4 && dl.every(r => r.kalla === 'inlast' && r.bekraftad && r.game_id === null)
   && hitta(fA, DA, 'Llanowar Elves').antal === 4 && hitta(fA, DA, 'Naturalize').antal === 2 && hitta(fA, DA, 'Giant Growth').antal === 3 && hitta(fA, DA, 'Forest').antal === null && !hitta(fA, DA, 'Okänt kort'),
   JSON.stringify(dl));
const fore = (await db.query('select count(*)::int n from public.spelarens_kort')).rows[0].n;
const igen = await forsok(() => db.exec(migrationSql()));
const efter = (await db.query('select count(*)::int n from public.spelarens_kort')).rows[0].n;
ok('bakåt: migrationen går att köra om — inga fel, inga nya rader', igen.ok && fore === efter, (igen.fel || '') + ` ${fore} → ${efter}`);

/* ── 2. RLS: två konton ── */
const lasSom = uid => som(db, uid, tx => tx.query(`select user_id, namn, game_id, deck_id from public.spelarens_kort`)).then(r => r.rows);
const lA = await lasSom(A), lB = await lasSom(B);
ok('RLS: A läser bara sina egna rader — alla', lA.length === fA.length && lA.every(r => r.user_id === A), `${lA.length} av ${fA.length}`);
ok('RLS: B läser bara sina egna rader — inte A:s, fast de spelat samma parti', lB.length === fB.length && lB.every(r => r.user_id === B) && !lB.some(r => r.namn === 'Morphling'), `${lB.length} av ${fB.length}`);
const g1B = await som(db, B, tx => tx.query(`select count(*)::int n from public.spelarens_kort where game_id = $1 and user_id = $2`, [G1, A]));
ok('RLS: B ser 0 av A:s rader i det gemensamma partiet, också med ett uttryckligt filter', g1B.rows[0].n === 0);
const anon = await forsok(() => som(db, null, tx => tx.query(`select count(*) from public.spelarens_kort`)));
ok('RLS: anon kommer inte åt tabellen', !anon.ok, JSON.stringify(anon));

const skriv = (uid, rad) => forsok(() => som(db, uid, tx => tx.query(
  `insert into public.spelarens_kort (user_id, namn, sid, game_id, deck_id, kalla, bekraftad, antal) values ($1, $2, $3, $4, $5, $6, $7, $8) returning namn`,
  [rad.user_id || uid, rad.namn, rad.sid || null, rad.game_id || null, rad.deck_id || null, rad.kalla || 'telefon', !!rad.bekraftad, rad.antal || 1])));
const s1 = await skriv(A, { namn: 'Giant Growth', game_id: G1 });
const s2 = await skriv(B, { namn: 'Giant Growth', game_id: G1 });
ok('RLS: A och B skriver var sin rad med samma namn i samma parti', s1.ok && s2.ok, (s1.fel || '') + ' ' + (s2.fel || ''));
const s3 = await skriv(B, { user_id: A, namn: 'Fog', game_id: G1 });
ok('RLS: B kan inte skriva i A:s namn', !s3.ok && /row-level security/.test(s3.fel), s3.fel);
const s4 = await skriv(A, { namn: 'Fog', game_id: G2 });
ok('RLS: A kan inte skriva minnet för ett parti A inte är med i', !s4.ok && /row-level security/.test(s4.fel), s4.fel);
const s5 = await skriv(A, { namn: 'Counterspell', deck_id: DB, kalla: 'inlast', bekraftad: true });
ok('RLS: A kan inte läsa in på B:s lek', !s5.ok && /row-level security/.test(s5.fel), s5.fel);
const s6 = await skriv(A, { namn: 'Fog', deck_id: DA, kalla: 'inlast', bekraftad: true });
ok('RLS: A kan läsa in på sin egen lek', s6.ok, s6.fel);
const u1 = await som(db, B, tx => tx.query(`update public.spelarens_kort set namn = 'Hackad' where user_id = $1`, [A]));
const d1 = await som(db, B, tx => tx.query(`delete from public.spelarens_kort where user_id = $1`, [A]));
const kvar = (await allaAv(db, A)).length;
ok('RLS: B kan varken ändra eller ta bort A:s rader', u1.affectedRows === 0 && d1.affectedRows === 0 && kvar === fA.length + 2, `${u1.affectedRows} ${d1.affectedRows} ${kvar}`);
const u2 = await forsok(() => som(db, A, tx => tx.query(`update public.spelarens_kort set user_id = $1 where user_id = $2 and namn = 'Giant Growth' and game_id = $3`, [B, A, G1])));
ok('RLS: A kan inte ge bort en rad till B', !u2.ok && /row-level security/.test(u2.fel), u2.fel);

/* ── 3. Sammanslagningen, som PostgREST gör en upsert ── */
const upsert = (uid, rader) => som(db, uid, tx => tx.query(
  `insert into public.spelarens_kort (user_id, game_id, namn, sid, kalla, bekraftad, antal, sedd)
   select user_id, game_id, namn, sid, kalla, bekraftad, antal, sedd from jsonb_populate_recordset(null::public.spelarens_kort, $1)
   on conflict (user_id, grupp, namn) do update set user_id = excluded.user_id, game_id = excluded.game_id, namn = excluded.namn, sid = excluded.sid,
     kalla = excluded.kalla, bekraftad = excluded.bekraftad, antal = excluded.antal, sedd = excluded.sedd`, [JSON.stringify(rader)]));
const nu = new Date().toISOString();
const up1 = await forsok(() => upsert(A, [{ user_id: A, game_id: G1, namn: 'Serra Angel', sid: null, kalla: 'telefon', bekraftad: false, antal: 2, sedd: nu },
                                          { user_id: A, game_id: G1, namn: 'Llanowar Elves', sid: null, kalla: 'claude', bekraftad: false, antal: 1, sedd: nu },
                                          { user_id: A, game_id: G1, namn: 'Plains', sid: null, kalla: 'telefon', bekraftad: false, antal: 5, sedd: nu }]));
const m = await allaAv(db, A), ms = hitta(m, G1, 'Serra Angel'), me = hitta(m, G1, 'Llanowar Elves');
ok('ihop: en bekräftelse står kvar med sin källa, antalet blir det högre (Serra Angel 1 → 2)', up1.ok && ms && ms.bekraftad && ms.kalla === 'spelaren' && ms.antal === 2 && ms.sid === 'sid-serra', up1.fel || JSON.stringify(ms));
ok('ihop: ett lägre antal sänker inte, en känd tryckning tappas inte (Llanowar Elves 2, sid kvar, källa claude)', me && me.antal === 2 && me.sid === 'sid-elves' && me.kalla === 'claude' && !me.bekraftad, JSON.stringify(me));
ok('ihop: basland får inget antal också vid en ny rad (Plains)', hitta(m, G1, 'Plains') && hitta(m, G1, 'Plains').antal === null);
const fel1 = await forsok(() => upsert(B, [{ user_id: A, game_id: G1, namn: 'Serra Angel', sid: null, kalla: 'telefon', bekraftad: false, antal: 9, sedd: nu }]));
ok('ihop: B:s upsert på A:s nyckel vägras', !fel1.ok && /row-level security/.test(fel1.fel) && hitta(await allaAv(db, A), G1, 'Serra Angel').antal === 2, fel1.fel);
await som(db, A, tx => tx.query(`update public.spelarens_kort set antal = 1, sedd = now() where deck_id = $1 and namn = 'Llanowar Elves'`, [DA]));
ok('ihop: en inläst lek skrivs om rakt av (4 → 1 när leken ändrats)', hitta(await allaAv(db, A), DA, 'Llanowar Elves').antal === 1);
const bort = await som(db, A, tx => tx.query(`delete from public.spelarens_kort where user_id = $1 and game_id = $2 and namn = 'Shock'`, [A, G1]));
ok('ihop: en rättelse tar bort raden (det gamla namnet)', bort.affectedRows === 1 && !hitta(await allaAv(db, A), G1, 'Shock'));
const c1 = await forsok(() => db.query(`insert into public.spelarens_kort (user_id, namn, game_id, kalla) values ($1, 'X', $2, 'inlast')`, [A, G1]));
const c2 = await forsok(() => db.query(`insert into public.spelarens_kort (user_id, namn, game_id, deck_id, kalla) values ($1, 'X', $2, $3, 'telefon')`, [A, G1, DA]));
const c3 = await forsok(() => db.query(`insert into public.spelarens_kort (user_id, namn, game_id, kalla) values ($1, 'X', $2, 'gissning')`, [A, G1]));
ok('regler: inlast bara på en lek, aldrig både parti och lek, bara de fyra källorna', !c1.ok && !c2.ok && !c3.ok, [c1.fel, c2.fel, c3.fel].join(' | '));

/* ── 4. decks.lage ── */
const lage = (await db.query(`select lage from public.decks where id = $1`, [DA])).rows[0].lage;
const l1 = await forsok(() => som(db, A, tx => tx.query(`update public.decks set lage = 'learned' where id = $1`, [DA])));
const l2 = await forsok(() => som(db, A, tx => tx.query(`update public.decks set lage = 'halv' where id = $1`, [DA])));
ok('decks.lage: gamla lekar är complete, learned går att sätta, annat inte', lage === 'complete' && l1.ok && !l2.ok, `${lage} ${l1.fel || ''} ${l2.fel || ''}`);
await som(db, A, tx => tx.query(`delete from public.decks where id = $1`, [DA]));
ok('decks: en borttagen lek tar sina inlästa rader med sig, partiernas står kvar', !(await allaAv(db, A)).some(r => r.deck_id === DA) && (await allaAv(db, A)).some(r => r.game_id === G1));

await db.close();
const fel = rad.filter(r => !r[1]);
for (const [n, v, d] of rad) console.log(`${v ? 'OK ' : 'FEL'}  ${n}${d ? '  — ' + d : ''}`);
console.log(fel.length ? `\nprov-rls: ${fel.length} av ${rad.length} FEL` : `\nprov-rls: alla ${rad.length} OK`);
process.exit(fel.length ? 1 : 0);

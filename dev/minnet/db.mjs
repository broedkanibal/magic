/* Mesas databas i en Postgres i minnet (PGlite), för proven av minnet (MES-373).

   Det Supabase har och PGlite saknar läggs till först, så likt Supabase som det går:
   schemat auth med auth.users och auth.uid() (som läser request.jwt.claim.sub, samma inställning
   PostgREST sätter), rollerna anon, authenticated och service_role, Supabases förvalda rättigheter
   (allt i public till de tre rollerna, så att en migration som tar bort en rättighet gör det på riktigt)
   publikationen supabase_realtime och realtime.messages (kamerakanalens policyer i MES-305). Sedan körs repots egna filer, i den ordning de körts i
   produktionen: schema.sql, lekar.sql, de migrationer minnet bygger på, och minnets migration.

   som(db, uid, fn): kör fn inne i en transaktion som rollen authenticated med auth.uid() = uid — så
   som PostgREST kör en fråga från en inloggad spelare. RLS gäller då på riktigt (superanvändaren
   postgres går förbi den). uid null = anon. */
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MIGRATION = 'supabase/migrations/20261016120000_spelarens_kort.sql';
const FILER = [
  'supabase/schema.sql',
  'supabase/lekar.sql',
  'supabase/migrations/20261002000000_mes305_dold_information.sql',
  'supabase/migrations/20261009120000_spelupplevelse.sql',
  'supabase/migrations/20261009130000_decks_slv_farg.sql',
  'supabase/migrations/20261010090000_kh_ms_fore_alder.sql',
  'supabase/migrations/20261010100000_lage_utan_skarm.sql',
  'supabase/migrations/20261010120000_kh_match_rapport.sql',
  'supabase/migrations/20261015090000_kh_handlingar.sql'
];

const SUPABASE = `
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
  end $$;
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  create publication supabase_realtime;
  create schema realtime;
  create table realtime.messages (topic text, extension text, payload jsonb);
  create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic', true) $$;
`;

export async function byggDb({ utanMigration = false, fore } = {}) {
  const db = new PGlite();
  await db.exec(SUPABASE);
  for (const f of FILER) await db.exec(fs.readFileSync(path.join(ROT, f), 'utf8'));
  if (fore) await fore(db);   // gamla data före migrationen (bakåtfyllningen)
  if (!utanMigration) await db.exec(fs.readFileSync(path.join(ROT, MIGRATION), 'utf8'));
  return db;
}
export const migrationSql = () => fs.readFileSync(path.join(ROT, MIGRATION), 'utf8');

export async function som(db, uid, fn) {
  return db.transaction(async tx => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid || '']);
    await tx.exec(`set local role ${uid ? 'authenticated' : 'anon'}`);
    return fn(tx);
  });
}

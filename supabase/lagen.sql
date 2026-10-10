-- Spellägen (dev/plan/lagen.md, MODE-1): varje spelare väljer per spel
-- Mirror my table ('bord') eller Digital table ('utan', förval). Skärmens
-- läge ('skarm', Screen leads / Use camera to add cards) togs bort
-- 2026-10-10 (migrations/20261010100000_lage_utan_skarm.sql). Idempotent —
-- går att köra igen.
-- Appliceras via Supabase-MCP (apply_migration); schema.sql förs för
-- protokollet, databasen är källan. Samma kolumn ingår i lekar.sql (D5-1),
-- så ett nytt projekt behöver bara den.
alter table public.game_players
  add column if not exists lage text not null default 'utan';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'game_players_lage_check') then
    alter table public.game_players
      add constraint game_players_lage_check check (lage in ('bord', 'utan'));
  end if;
end $$;

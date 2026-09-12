-- Spellägen (dev/plan/lagen.md, MODE-1): varje spelare väljer per spel om
-- bordet leder (Table leads, 'bord') eller skärmen (Screen leads, 'skarm').
-- Screen leads är förval (beslut D7). Idempotent — går att köra igen.
-- Appliceras via Supabase-MCP (apply_migration); schema.sql förs för
-- protokollet, databasen är källan. Samma kolumn ingår i lekar.sql (D5-1),
-- så ett nytt projekt behöver bara den.
alter table public.game_players
  add column if not exists lage text not null default 'skarm';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'game_players_lage_check') then
    alter table public.game_players
      add constraint game_players_lage_check check (lage in ('skarm', 'bord'));
  end if;
end $$;

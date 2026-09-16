-- Spelarens status i uppstarten (MES-170, "Get ready for the game"): var
-- var och en är, i spelarlistan hos de andra och på Home.
--   'lek'      Picking a deck — steg 1
--   'uppstart' Setting up     — steg 2–4
--   'redo'     Ready          — bordet är klart, Start playing inte tryckt
--   'spelar'   Playing        — uppstarten klar eller Digital table
-- null = en rad från före kolumnen, eller en spelare som inte öppnat spelet
-- sedan dess. Varje spelare skriver bara sin egen rad (gp_andra_sitt), och
-- alla i spelet ser den genom realtime på game_players. Klienten skriver bara
-- när statusen ändras. Idempotent — går att köra igen. Appliceras via
-- Supabase-MCP (apply_migration); schema.sql förs för protokollet.
alter table public.game_players
  add column if not exists status text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'game_players_status_check') then
    alter table public.game_players
      add constraint game_players_status_check check (status in ('lek', 'uppstart', 'redo', 'spelar'));
  end if;
end $$;

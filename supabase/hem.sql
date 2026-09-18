-- Home-spellistan etapp 1 (MES-236, MES-210/MES-224): två nya tidpunkter.
--   games.startad       när värden tryckte Start the game; null = före start.
--   game_players.sedd   senaste hjärtslaget från en enhet som har spelet
--                       öppet (spelvyn eller telefonen, var 30:e s). Home
--                       härleder In the game / Away ur hur färsk den är.
-- Behörigheten finns redan: games_andra låter bara värden uppdatera games,
-- gp_andra_sitt låter var och en bara uppdatera sin egen rad. Triggarna
-- nedan gör att båda tiderna sätts med SERVERNS klocka, vad klienten än
-- skickar — en dator med fel klocka kan inte se "In the game" ut för
-- evigt, och färskheten jämförs mot samma klocka för alla.
-- Bara additivt, idempotent. Appliceras via Supabase-MCP (apply_migration);
-- schema.sql förs för protokollet.
alter table public.games        add column if not exists startad timestamptz;
alter table public.game_players add column if not exists sedd    timestamptz;

create or replace function public.startad_servertid()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.startad is not null then new.startad := now(); end if;
  elsif new.startad is distinct from old.startad and new.startad is not null then
    new.startad := now();
  end if;
  return new;
end $$;
drop trigger if exists games_startad on public.games;
create trigger games_startad before insert or update of startad on public.games
  for each row execute function public.startad_servertid();

create or replace function public.sedd_servertid()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.sedd is not null then new.sedd := now(); end if;
  return new;
end $$;
drop trigger if exists game_players_sedd on public.game_players;
create trigger game_players_sedd before update of sedd on public.game_players
  for each row execute function public.sedd_servertid();

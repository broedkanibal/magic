-- ═══════════════════════════════════════════════════════════════════
--  Handvy — spel, spelare och bord
--
--  Kör hela filen i Supabase SQL Editor. Den går att köra om: allt är
--  skrivet med "if not exists" eller "drop policy if exists" först.
--
--  Grundregeln genom hela filen: du rår över ditt eget bord, alla i
--  spelet får titta. Den regeln sitter i databasen, inte bara i
--  gränssnittet — annars räcker det med webbläsarens konsol för att
--  ändra på någon annans kort.
-- ═══════════════════════════════════════════════════════════════════

-- ── spel ───────────────────────────────────────────────────────────
-- kod: det som står i inbjudningslänken. Kort nog att läsa upp högt.
create table if not exists public.games (
  id          uuid primary key default gen_random_uuid(),
  kod         text unique not null,
  namn        text,
  vard        uuid not null references auth.users(id) on delete cascade,
  skapad      timestamptz not null default now(),
  avslutad    timestamptz
);

-- ── deltagare ──────────────────────────────────────────────────────
-- namn kommer från Google-kontots förnamn men går att skriva över, så
-- det lagras här och inte hämtas ur auth varje gång.
create table if not exists public.game_players (
  game_id     uuid not null references public.games(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  namn        text not null,
  farg        text not null,
  plats       int  not null,
  gick_med    timestamptz not null default now(),
  primary key (game_id, user_id)
);
create index if not exists game_players_game on public.game_players(game_id);

-- ── bord ───────────────────────────────────────────────────────────
-- Hela kortlistan som en jsonb-klump, samma form som appen redan har i
-- minnet. En rad per spelare och spel. Det gör skrivningen konfliktfri:
-- bara ägaren skriver sin rad, så två spelare kan aldrig råka skriva
-- över varandra. Priset är att hela listan skickas vid varje ändring,
-- vilket är några kilobyte — billigare än att hålla ihop per-kort-rader.
create table if not exists public.boards (
  game_id     uuid not null references public.games(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kort        jsonb not null default '[]'::jsonb,
  version     bigint not null default 0,
  andrad      timestamptz not null default now(),
  primary key (game_id, user_id)
);

-- Räknaren gör det möjligt för en klient att se att den fått en äldre
-- version än den redan har, och slänga den i stället för att backa.
create or replace function public.bump_board_version()
returns trigger language plpgsql as $$
begin
  new.version := coalesce(old.version, 0) + 1;
  new.andrad  := now();
  return new;
end $$;

drop trigger if exists boards_version on public.boards;
create trigger boards_version before update on public.boards
  for each row execute function public.bump_board_version();

-- ═══════════════════════════════════════════════════════════════════
--  Behörigheter
-- ═══════════════════════════════════════════════════════════════════
alter table public.games        enable row level security;
alter table public.game_players enable row level security;
alter table public.boards       enable row level security;

-- Hjälpfunktion: är jag med i det här spelet? security definer för att
-- den ska kunna läsa game_players utan att fastna i sin egen policy.
create or replace function public.i_spelet(g uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.game_players
    where game_id = g and user_id = auth.uid()
  );
$$;

-- ── games ──
drop policy if exists games_las on public.games;
create policy games_las on public.games for select
  using (public.i_spelet(id) or vard = auth.uid());

drop policy if exists games_skapa on public.games;
create policy games_skapa on public.games for insert
  with check (vard = auth.uid());

drop policy if exists games_andra on public.games;
create policy games_andra on public.games for update
  using (vard = auth.uid()) with check (vard = auth.uid());

-- ── game_players ──
-- Att gå med sker via en funktion längre ner, inte med en rå insert:
-- den som joinar måste kunna slå upp spelet på koden UTAN att redan
-- vara med i det, och det går inte att uttrycka i en insert-policy.
drop policy if exists gp_las on public.game_players;
create policy gp_las on public.game_players for select
  using (public.i_spelet(game_id));

drop policy if exists gp_andra_sitt on public.game_players;
create policy gp_andra_sitt on public.game_players for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists gp_lamna on public.game_players;
create policy gp_lamna on public.game_players for delete
  using (user_id = auth.uid());

-- ── boards ──
drop policy if exists boards_las on public.boards;
create policy boards_las on public.boards for select
  using (public.i_spelet(game_id));

drop policy if exists boards_skriv on public.boards;
create policy boards_skriv on public.boards for insert
  with check (user_id = auth.uid() and public.i_spelet(game_id));

-- Här sitter hela "bara ditt eget bord". Utan raden nedan kan vem som
-- helst i spelet skriva om vems bord som helst från konsolen.
drop policy if exists boards_andra on public.boards;
create policy boards_andra on public.boards for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
--  Gå med via kod
--  security definer: den som joinar är ännu inte med i spelet och kan
--  därför inte läsa raden med sina egna rättigheter.
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.ga_med(p_kod text, p_namn text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  g public.games%rowtype;
  n int;
  farger text[] := array['#e8b33a','#6b8cff','#5fbf7f','#e0736b','#b98ae0','#4fc0c0','#e09a4f','#c9d1dc'];
begin
  select * into g from public.games where kod = upper(p_kod) and avslutad is null;
  if not found then
    raise exception 'Spelet finns inte' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.game_players
             where game_id = g.id and user_id = auth.uid()) then
    return g.id;                                   -- redan med, gå bara in
  end if;

  select coalesce(max(plats), -1) + 1 into n
    from public.game_players where game_id = g.id;

  insert into public.game_players (game_id, user_id, namn, farg, plats)
  values (g.id, auth.uid(), p_namn, farger[(n % 8) + 1], n);

  insert into public.boards (game_id, user_id)
  values (g.id, auth.uid())
  on conflict do nothing;

  return g.id;
end $$;

revoke all on function public.ga_med(text, text) from public;
grant execute on function public.ga_med(text, text) to authenticated;

-- ═══════════════════════════════════════════════════════════════════
--  Realtid
--  Klienten lyssnar på ändringar i de här tabellerna, filtrerat på
--  game_id. RLS gäller även här, så ingen får ut något de inte får se.
-- ═══════════════════════════════════════════════════════════════════
alter publication supabase_realtime add table public.boards;
alter publication supabase_realtime add table public.game_players;

-- Utan full replikaidentitet skickas bara primärnyckeln vid en ändring,
-- och klienten får aldrig se de nya korten.
alter table public.boards       replica identity full;
alter table public.game_players replica identity full;

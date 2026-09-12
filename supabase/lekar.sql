-- ═══════════════════════════════════════════════════════════════════
--  Mesa — flera lekar (dev/plan/lagen.md, D5-1)
--
--  Körs EFTER schema.sql. Går att köra om. Appliceras via Supabase-MCP
--  (apply_migration); databasen är källan, filerna förs för protokollet.
--
--  En rad per lek på kontot i stället för EN lek per konto (lekar). Varje
--  spelare väljer en lek per spel: game_players.lek_id pekar på den, och
--  lek_info är den lilla kopian (namn, färger, antal) motståndarna får se
--  genom den befintliga realtime-prenumerationen på game_players. decks
--  läggs INTE i realtime-publikationen — kortlistan hämtas när den behövs.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.decks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  namn        text not null,
  -- [{name, sid, small, n, ci, sb}] — n antal, ci färgidentitet, sb sideboard
  kort        jsonb not null default '[]'::jsonb,
  farger      text[] not null default '{}',
  antal       int  not null default 0,
  skapad      timestamptz not null default now(),
  -- skrivs uttryckligen av klienten vid varje spar (defaulten gäller bara insert)
  uppdaterad  timestamptz not null default now()
);
create index if not exists decks_user_uppdaterad on public.decks(user_id, uppdaterad desc);
alter table public.decks enable row level security;

drop policy if exists decks_las on public.decks;
create policy decks_las on public.decks for select
  using (user_id = auth.uid());
drop policy if exists decks_skriv on public.decks;
create policy decks_skriv on public.decks for insert
  with check (user_id = auth.uid());
drop policy if exists decks_andra on public.decks;
create policy decks_andra on public.decks for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists decks_radera on public.decks;
create policy decks_radera on public.decks for delete
  using (user_id = auth.uid());
grant select, insert, update, delete on public.decks to authenticated;

-- Vald lek per spelare och spel. lek_info: {id, namn, farger, antal}.
alter table public.game_players
  add column if not exists lek_id uuid references public.decks(id) on delete set null,
  add column if not exists lek_info jsonb;
alter table public.game_players
  add column if not exists lage text not null default 'skarm';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'game_players_lage_check') then
    alter table public.game_players
      add constraint game_players_lage_check check (lage in ('skarm', 'bord'));
  end if;
end $$;

-- Engångsflytten lekar → decks, som "My deck". Upsert per konto: finns
-- redan en "My deck" skrivs den över bara när kontots gamla lek är nyare
-- — annars tappas en lek sparad mellan D5-1 och D5-2. Färgerna fylls
-- av klienten (lat) — SQL har inte kortdata. Går att köra om.
insert into public.decks (user_id, namn, kort, antal, skapad, uppdaterad)
select l.user_id, 'My deck',
       coalesce(l.lek->'kort', '[]'::jsonb),
       coalesce((select sum(coalesce((k->>'n')::int, 1)) from jsonb_array_elements(coalesce(l.lek->'kort', '[]'::jsonb)) k), 0),
       l.uppdaterad, l.uppdaterad
from public.lekar l
where not exists (select 1 from public.decks d where d.user_id = l.user_id and d.namn = 'My deck');

update public.decks d
set kort = coalesce(l.lek->'kort', '[]'::jsonb),
    antal = coalesce((select sum(coalesce((k->>'n')::int, 1)) from jsonb_array_elements(coalesce(l.lek->'kort', '[]'::jsonb)) k), 0),
    uppdaterad = l.uppdaterad
from public.lekar l
where d.user_id = l.user_id and d.namn = 'My deck' and l.uppdaterad > d.uppdaterad;

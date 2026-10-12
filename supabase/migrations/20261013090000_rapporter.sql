-- ═══════════════════════════════════════════════════════════════════
--  Mesa — problemrapporten (MES-365, del A av MES-271)
--
--  KÖRD 2026-10-13 med Supabase-MCP:n (apply_migration rapporter och
--  rapporter_service_role). Fristående: behöver games och auth.users. Går
--  att köra om.
--
--  rapporter: en rad per rapport spelaren skickar (kalla 'rapport'), per
--  automatisk felrapport (kalla 'fel') och per tyst rättelse (kalla
--  'rattelse', del B). Paketet och bilderna ligger i storage under
--  scans/<user_id>/rapporter/<kod>/ — aldrig i jsonb. Specen:
--  design_handoff_rapport/README.md §9.
--
--    kod          R-NNNN, löpnummer från servern (sekvensen rapporter_nr)
--    text         spelarens ord (högst 500 tecken); för 'fel' felmeddelandet
--    tagg         snabbvalet: forsvann · dok_upp · kom_aldrig · fel_namn · tap · langsamt · annat
--    vy           vyn vid trycket: { zoom, pan, synlig, senastRord, lage, kamAnsluten, skarm }
--    sokvag       mappen i hinken scans (sätts av servern ur user_id och kod)
--    storlek      bytes som datorn laddade upp (paketet + diagnosfilen)
--    bilder       telefonens stillbilder: klar | delvis | saknas (null = på väg)
--    anvandning   vad rapporten blev (del D): fix | test | traning | slangd
--    kontaktad_at när Jesper skrev till spelaren om den (dev/rapport/lista.cjs --kontaktad)
--
--  Taket räknas här, inte i webbläsaren: 20 rapporter per konto och
--  rullande 24 h (kalla 'rapport'), 50 felrapporter. Den 21:a vägras med
--  felet 'rapport_tak' (appen visar Today's limit). rapporter_idag() säger
--  hur många som skickats, så att rutan kan visa taket redan när den öppnas.
--
--  RLS: spelaren lägger in, läser och raderar sina egna rader. Uppdatera
--  får hen bara storlek och bilder (steg 2–3 i uppladdningen: koden finns
--  först när raden finns). anvandning och kontaktad_at sätter bara service
--  role (dev/rapport/*.cjs).
--
--  raderingar: koder för rapporter spelaren raderat (C:s Delete), utan
--  personuppgifter, så att Jesper kan ta bort kopiorna i repot
--  (lista.cjs --raderade). Inloggad får lägga in, bara service role läsa.
-- ═══════════════════════════════════════════════════════════════════

create sequence if not exists public.rapporter_nr;

create or replace function public.rapport_kod() returns text
  language sql volatile set search_path = '' as $$
  select 'R-' || lpad(n::text, greatest(4, length(n::text)), '0') from (select nextval('public.rapporter_nr') as n) x
$$;

create table if not exists public.rapporter (
  id           bigint generated always as identity primary key,
  kod          text not null unique default public.rapport_kod(),
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  game_id      uuid references public.games(id) on delete set null,
  created_at   timestamptz not null default now(),
  text         text check (text is null or char_length(text) <= 2000),
  tagg         text check (tagg is null or tagg in ('forsvann', 'dok_upp', 'kom_aldrig', 'fel_namn', 'tap', 'langsamt', 'annat')),
  vy           jsonb,
  sokvag       text,
  storlek      integer,
  bilder       text check (bilder is null or bilder in ('klar', 'delvis', 'saknas')),
  anvandning   text check (anvandning is null or anvandning in ('fix', 'test', 'traning', 'slangd')),
  kalla        text not null default 'rapport' check (kalla in ('rapport', 'rattelse', 'fel')),
  kontaktad_at timestamptz
);

create index if not exists rapporter_konto on public.rapporter (user_id, kalla, created_at);

-- Sökvägen och taket sätts av servern. Spelaren kan inte välja en annan
-- mapp än sin egen, och taket går inte runt genom att skicka från två flikar.
create or replace function public.rapporter_fore_insert() returns trigger
  language plpgsql set search_path = '' as $$
declare
  n int;
  tak int := case new.kalla when 'rapport' then 20 when 'fel' then 50 else null end;
begin
  new.sokvag := new.user_id::text || '/rapporter/' || new.kod;
  new.anvandning := null;
  new.kontaktad_at := null;
  if tak is not null then
    -- ett lås per konto, så att två samtidiga inte båda ser 19
    perform pg_advisory_xact_lock(hashtext('rapporter:' || new.user_id::text || ':' || new.kalla));
    select count(*) into n from public.rapporter
      where user_id = new.user_id and kalla = new.kalla and created_at > now() - interval '24 hours';
    if n >= tak then
      raise exception 'rapport_tak: % av % de senaste 24 timmarna', n, tak using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists rapporter_fore_insert on public.rapporter;
create trigger rapporter_fore_insert before insert on public.rapporter
  for each row execute function public.rapporter_fore_insert();
revoke execute on function public.rapporter_fore_insert() from public, anon, authenticated;

-- Hur många rapporter kontot skickat de senaste 24 timmarna (Today's limit
-- när rutan öppnas). Räknas på serverns klocka.
create or replace function public.rapporter_idag() returns int
  language sql stable security invoker set search_path = '' as $$
  select count(*)::int from public.rapporter
   where user_id = auth.uid() and kalla = 'rapport' and created_at > now() - interval '24 hours'
$$;
revoke execute on function public.rapporter_idag() from public, anon;
grant execute on function public.rapporter_idag() to authenticated;
revoke execute on function public.rapport_kod() from public, anon;
grant execute on function public.rapport_kod() to authenticated;
grant usage on sequence public.rapporter_nr to authenticated;

alter table public.rapporter enable row level security;

revoke all on public.rapporter from anon, authenticated;
grant select, delete on public.rapporter to authenticated;
grant insert (game_id, text, tagg, vy, bilder, kalla) on public.rapporter to authenticated;
grant update (storlek, bilder) on public.rapporter to authenticated;

drop policy if exists rapporter_lagg_in on public.rapporter;
create policy rapporter_lagg_in on public.rapporter for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists rapporter_las on public.rapporter;
create policy rapporter_las on public.rapporter for select to authenticated
  using (user_id = auth.uid());
drop policy if exists rapporter_uppdatera on public.rapporter;
create policy rapporter_uppdatera on public.rapporter for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists rapporter_radera on public.rapporter;
create policy rapporter_radera on public.rapporter for delete to authenticated
  using (user_id = auth.uid());

create table if not exists public.raderingar (
  kod        text not null,
  raderad_at timestamptz not null default now()
);
create index if not exists raderingar_tid on public.raderingar (raderad_at);
alter table public.raderingar enable row level security;
revoke all on public.raderingar from anon, authenticated;
grant insert (kod) on public.raderingar to authenticated;
drop policy if exists raderingar_lagg_in on public.raderingar;
create policy raderingar_lagg_in on public.raderingar for insert to authenticated
  with check (kod ~ '^R-[0-9]{4,}$');

-- Service role (dev/rapport/hamta.cjs, lista.cjs, gallra.cjs) får inga
-- rättigheter av sig själv i det här projektet (jfr 20261012120000).
grant select, insert, update, delete on public.rapporter, public.raderingar to service_role;
grant usage on sequence public.rapporter_nr to service_role;
grant execute on function public.rapport_kod() to service_role;

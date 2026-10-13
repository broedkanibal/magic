-- ═══════════════════════════════════════════════════════════════════
--  Mesa — problemrapporten, rättelserunda 1 (MES-365, granskningen av A)
--
--  Ovanpå 20261013090000_rapporter.sql (den körda, ändras inte). Går att
--  köra om.
--
--  1. Taket för kalla 'rattelse': 500 per konto och rullande 24 h. Förut
--     gav triggern tak null för allt som inte var 'rapport' eller 'fel', så
--     en spelare kunde lägga in hur många rader som helst genom att sätta
--     kalla = 'rattelse'. B:s tysta rättelser sparas en per rättelse, så 500
--     räcker gott för ett parti.
--  2. vy får vara högst 64 kB (pg_column_size), så att raden inte blir ett
--     lager för paketet — paket och bilder hör hemma i storage. text har
--     redan taket 2000 tecken (den första migrationen).
--  3. raderingar: inloggad får bara lägga in en kod som tillhör en av hens
--     egna rapporter. Delete (C) och Cancel under Sending skriver i
--     raderingar FÖRE raderingen, medan raden ännu finns och kan visas.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.rapporter_fore_insert() returns trigger
  language plpgsql set search_path = '' as $$
declare
  n int;
  tak int := case new.kalla when 'rapport' then 20 when 'fel' then 50 when 'rattelse' then 500 else 0 end;
begin
  new.sokvag := new.user_id::text || '/rapporter/' || new.kod;
  new.anvandning := null;
  new.kontaktad_at := null;
  -- ett lås per konto och källa, så att två samtidiga inte båda ser tak − 1
  perform pg_advisory_xact_lock(hashtext('rapporter:' || new.user_id::text || ':' || new.kalla));
  select count(*) into n from public.rapporter
    where user_id = new.user_id and kalla = new.kalla and created_at > now() - interval '24 hours';
  if n >= tak then
    raise exception 'rapport_tak: % av % de senaste 24 timmarna', n, tak using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function public.rapporter_fore_insert() from public, anon, authenticated;

alter table public.rapporter drop constraint if exists rapporter_vy_storlek;
alter table public.rapporter add constraint rapporter_vy_storlek
  check (vy is null or pg_column_size(vy) < 65536);

drop policy if exists raderingar_lagg_in on public.raderingar;
create policy raderingar_lagg_in on public.raderingar for insert to authenticated
  with check (
    kod ~ '^R-[0-9]{4,}$'
    and exists (select 1 from public.rapporter r where r.kod = raderingar.kod and r.user_id = (select auth.uid()))
  );

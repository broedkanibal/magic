-- ═══════════════════════════════════════════════════════════════════
--  Mesa — lärda referenser mellan enheter (MES-231)
--
--  Körs EFTER lekar.sql (behöver decks). Går att köra om. SKRIVEN men inte
--  körd: Jesper kör den, se dev/embed/INLARNING.md.
--
--  Kameran lär sig hur JUST DINA kort ser ut i JUST DITT ljus (K7/K8,
--  Ref i index.html): när Claude bekräftar ett kort eller du själv rättar
--  ett, sparas beskärningen som en liten jpeg (146×204) och blir en
--  referens till för namnet. Förut låg de bara i telefonens IndexedDB —
--  bytte du telefon började inlärningen om. Här ligger en kopia per konto
--  och lek, så att nästa spel på vilken enhet som helst börjar där förra
--  slutade. Telefonens IndexedDB är fortfarande det kameran läser ur; den
--  här tabellen är det som håller enheterna i takt (RefMoln i index.html).
--
--  Högst 4 per namn och lek (REF_TAK i index.html), nyast vinner — samma
--  regel som på telefonen, och triggern nedan håller den även när två
--  enheter lär sig samtidigt.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.learned_refs (
  user_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- leken referensen hör till; tas leken bort går referenserna med
  deck_id  uuid not null references public.decks(id) on delete cascade,
  -- Ref:s eget id (tid + slump), samma på alla enheter
  id       text not null,
  namn     text not null,              -- kortnamnet referensen lär ut
  sid      text,                       -- Scryfall-id för tryckningen, om känt
  bild     text not null,              -- jpeg som data-URL, 146×204 (≈ 8–12 KB)
  -- källa: 'ai' = Claude bekräftade kortet, 'hand' = spelaren rättade eller
  -- bekräftade det i granskningen; null = okänd (äldre referens)
  kalla    text check (kalla in ('ai', 'hand')),
  ts       bigint not null,            -- när den lärdes (ms sedan 1970, som Date.now())
  skapad   timestamptz not null default now(),
  primary key (user_id, deck_id, id)
);
create index if not exists learned_refs_lek on public.learned_refs(user_id, deck_id, namn, ts desc);

alter table public.learned_refs enable row level security;

-- ── behörigheter ───────────────────────────────────────────────────
-- Samma grundregel som för kameran (cam_eget, scans_eget): du rår över
-- ditt eget. Dessutom måste leken vara din — ingen kan lägga referenser
-- i någon annans lek.
drop policy if exists learned_refs_eget on public.learned_refs;
create policy learned_refs_eget on public.learned_refs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
              and exists (select 1 from public.decks d where d.id = deck_id and d.user_id = auth.uid()));

revoke all on public.learned_refs from anon;
grant select, insert, update, delete on public.learned_refs to authenticated;

-- ── taket: högst 4 per namn, nyast vinner ──────────────────────────
-- Efter varje ny rad tas de äldsta bort för samma konto, lek och namn.
-- 4 = REF_TAK i index.html; ändras det där ska det ändras här.
create or replace function public.learned_refs_tak()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.learned_refs r
   where r.user_id = new.user_id and r.deck_id = new.deck_id and r.namn = new.namn
     and r.id not in (
       select k.id from public.learned_refs k
        where k.user_id = new.user_id and k.deck_id = new.deck_id and k.namn = new.namn
        order by k.ts desc, k.id desc limit 4);
  return null;
end $$;

revoke all on function public.learned_refs_tak() from public, anon, authenticated;

drop trigger if exists learned_refs_tak on public.learned_refs;
create trigger learned_refs_tak after insert on public.learned_refs
  for each row execute function public.learned_refs_tak();

-- ═══════════════════════════════════════════════════════════════════
--  Mesa — minnet: korten spelaren setts med (MES-373, etapp 1a i
--  dev/plan/lekar-och-minnet-bygget.md; besluten B2, B3 och J2)
--
--  Körs EFTER schema.sql, lekar.sql, migrations/20261002000000 (hidden_cards)
--  och 20261009120000 (kort_handelser). Går att köra om. SKRIVEN men inte
--  körd: Jesper kör den (SQL Editor, eller `supabase db push`). Koden tål att
--  den saknas: minnet skrivs inte (en rad i konsolen), allt annat som förut.
--
--  1. decks.lage — learned eller complete (T4). En inläst eller inklistrad
--     lek är complete; en lek Mirror lärt sig är learned. Digital table
--     kräver complete. Alla lekar som finns i dag är complete (förvalet).
--
--  2. spelarens_kort — minnet (T3). En rad per spelare, parti och namn, och
--     för en inläst lek en rad per spelare, lek och namn (game_id null,
--     deck_id satt). Minnet sitter på spelaren, inte på leken (B2):
--     samförekomsten räknas ur raderna (samma grupp = sedda ihop), så ingen
--     egen tabell behövs.
--
--       namn       oracle-namnet, som appen skriver det
--       sid        tryckningen som syntes (Scryfall-id), null = okänd
--       game_id    partiet — eller
--       deck_id    den inlästa leken (kalla inlast), aldrig båda
--       kalla      telefon · claude · spelaren · inlast — varifrån namnet kom
--       bekraftad  spelaren sa namnet själv (Name this card, rättelse, för
--                  hand) eller läste in leken. Telefonens och Claudes namn är
--                  säkra men inte bekräftade
--       antal      högsta antalet som setts samtidigt i partiet (för inlast:
--                  lekens antal). Ett mjukt stöd, inget tak (B3). null för
--                  basland, som inte har något antal
--       sedd       senast namnet blev säkert i gruppen
--
--     Skrivs bara när ett namn blir säkert på spelarens bord (khLogga i
--     index.html); ett osäkert namn skrivs aldrig. En rättelse (bytt)
--     ersätter raden. Två skrivningar av samma namn i samma grupp slås ihop av
--     triggern nedan: antalet blir det högsta, en bekräftelse står kvar, en
--     känd tryckning tappas inte.
--
--     RLS: ägaren läser och skriver sina egna rader. Motståndare läser inget,
--     inte heller i ett gemensamt parti.
--
--  3. Bakåt (Jespers ja 2026-10-13, J2): minnet fylls en gång ur gamla
--     partier (boards: bordets sista läge per spelare och parti, plus
--     ägarens nedvända kort ur hidden_cards) och ur lekarna (decks, som
--     inlast). Går att köra om: det som redan finns rörs inte.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Learned och complete ────────────────────────────────────────
alter table public.decks
  add column if not exists lage text not null default 'complete';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'decks_lage_check') then
    alter table public.decks
      add constraint decks_lage_check check (lage in ('learned', 'complete'));
  end if;
end $$;

-- ── 2. Minnet ──────────────────────────────────────────────────────
create table if not exists public.spelarens_kort (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  namn       text not null check (length(namn) between 1 and 200),
  sid        text,
  game_id    uuid references public.games(id) on delete cascade,
  deck_id    uuid references public.decks(id) on delete cascade,
  -- partiet eller leken: nyckeln raderna grupperas på (unik med user_id och namn)
  grupp      uuid generated always as (coalesce(game_id, deck_id)) stored,
  kalla      text not null check (kalla in ('telefon', 'claude', 'spelaren', 'inlast')),
  bekraftad  boolean not null default false,
  antal      smallint check (antal >= 1),
  sedd       timestamptz not null default now(),
  constraint spelarens_kort_en_grupp check (num_nonnulls(game_id, deck_id) = 1),
  -- en inläst lek, och bara den, hör till en lek i stället för ett parti
  constraint spelarens_kort_inlast check ((kalla = 'inlast') = (deck_id is not null)),
  constraint spelarens_kort_unik unique (user_id, grupp, namn)
);
create index if not exists spelarens_kort_konto on public.spelarens_kort (user_id, sedd desc);
create index if not exists spelarens_kort_spel on public.spelarens_kort (game_id) where game_id is not null;
create index if not exists spelarens_kort_lek on public.spelarens_kort (deck_id) where deck_id is not null;

-- Basland har inget antal (B3): Plains, Island, Swamp, Mountain, Forest,
-- Wastes och deras snow-varianter.
create or replace function public.minnet_basland(n text)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(n ~ '^(Snow-Covered )?(Plains|Island|Swamp|Mountain|Forest|Wastes)$', false);
$$;

-- Två skrivningar av samma namn i samma grupp (en upsert): antalet blir det
-- högsta som setts, en bekräftelse står kvar (med sin källa), en känd
-- tryckning tappas inte och sedd blir den senaste. En inläst lek skrivs om
-- rakt av: dess antal är lekens. Basland får aldrig något antal.
create or replace function public.minnet_sla_ihop()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.kalla <> 'inlast' then
    new.antal := greatest(old.antal, new.antal);
    if old.bekraftad and not new.bekraftad then new.kalla := old.kalla; end if;
    new.bekraftad := old.bekraftad or new.bekraftad;
    new.sid := coalesce(new.sid, old.sid);
    new.sedd := greatest(old.sedd, new.sedd);
  end if;
  if public.minnet_basland(new.namn) then new.antal := null; end if;
  return new;
end $$;

drop trigger if exists spelarens_kort_sla_ihop on public.spelarens_kort;
create trigger spelarens_kort_sla_ihop before insert or update on public.spelarens_kort
  for each row execute function public.minnet_sla_ihop();
revoke execute on function public.minnet_sla_ihop() from public, anon, authenticated;

alter table public.spelarens_kort enable row level security;

-- Bara ägaren, i alla fyra verb. Ett parti måste vara ett spelaren är med i,
-- en lek måste vara spelarens egen.
drop policy if exists sk_las on public.spelarens_kort;
create policy sk_las on public.spelarens_kort for select to authenticated
  using (user_id = auth.uid());
drop policy if exists sk_skriv on public.spelarens_kort;
create policy sk_skriv on public.spelarens_kort for insert to authenticated
  with check (user_id = auth.uid()
    and (game_id is null or public.i_spelet(game_id))
    and (deck_id is null or exists (select 1 from public.decks d where d.id = deck_id and d.user_id = auth.uid())));
drop policy if exists sk_andra on public.spelarens_kort;
create policy sk_andra on public.spelarens_kort for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
    and (game_id is null or public.i_spelet(game_id))
    and (deck_id is null or exists (select 1 from public.decks d where d.id = deck_id and d.user_id = auth.uid())));
drop policy if exists sk_radera on public.spelarens_kort;
create policy sk_radera on public.spelarens_kort for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.spelarens_kort from anon, authenticated;
grant select, insert, update, delete on public.spelarens_kort to authenticated;
grant select, insert, update, delete on public.spelarens_kort to service_role;

-- ── 3. Bakåt: gamla partier och lekarna (J2) ───────────────────────
-- Partierna: varje namngivet kort på bordets sista läge (boards), och
-- ägarens nedvända kort ur hidden_cards (de står utan namn i boards).
-- Tokens räknas inte. Antalet = hur många som låg där. Källan:
--   spelaren, bekräftad — Digital table (allt lades för hand), eller ett
--                          namn spelaren själv gav eller bytte till i
--                          partiet (kort_handelser: namngiven, bytt, tillagd)
--   telefon              — resten i Mirror my table
with bordets as (
  select b.game_id, b.user_id, b.andrad,
         coalesce(nullif(k->>'name', ''), h.kort->(k->>'cid')->>'name') as namn,
         coalesce(nullif(k->>'sid', ''), h.kort->(k->>'cid')->>'sid') as sid
    from public.boards b
    cross join lateral jsonb_array_elements(case when jsonb_typeof(b.kort) = 'array' then b.kort else '[]'::jsonb end) k
    left join public.hidden_cards h on h.game_id = b.game_id and h.user_id = b.user_id
   where coalesce(k->>'tok', '') not in ('1', 'true')
), per_namn as (
  select game_id, user_id, namn, min(sid) as sid, count(*)::int as antal, max(andrad) as sedd
    from bordets
   where namn is not null and length(namn) between 1 and 200
   group by game_id, user_id, namn
)
insert into public.spelarens_kort (user_id, namn, sid, game_id, kalla, bekraftad, antal, sedd)
select p.user_id, p.namn, p.sid, p.game_id,
       case when gp.lage = 'utan' or sp.namn is not null then 'spelaren' else 'telefon' end,
       gp.lage = 'utan' or sp.namn is not null,
       least(p.antal, 32767), p.sedd
  from per_namn p
  left join public.game_players gp on gp.game_id = p.game_id and gp.user_id = p.user_id
  left join lateral (
    select h.namn from public.kort_handelser h
     where h.game_id = p.game_id and h.user_id = p.user_id and h.namn = p.namn
       and h.typ in ('namngiven', 'bytt', 'tillagd')
     limit 1) sp on true
on conflict (user_id, grupp, namn) do nothing;

-- Lekarna: hela leken (sideboarden också) som inläst och bekräftad.
-- Lekfotots platshållare (okand) är inga kort.
insert into public.spelarens_kort (user_id, namn, sid, deck_id, kalla, bekraftad, antal, sedd)
select d.user_id, k->>'name', min(nullif(k->>'sid', '')), d.id, 'inlast', true,
       least(sum(case when k->>'n' ~ '^[0-9]{1,4}$' then greatest((k->>'n')::int, 1) else 1 end), 32767), max(d.uppdaterad)
  from public.decks d
  cross join lateral jsonb_array_elements(case when jsonb_typeof(d.kort) = 'array' then d.kort else '[]'::jsonb end) k
 where coalesce(k->>'okand', '') not in ('1', 'true')
   and length(coalesce(k->>'name', '')) between 1 and 200
 group by d.user_id, d.id, k->>'name'
on conflict (user_id, grupp, namn) do nothing;

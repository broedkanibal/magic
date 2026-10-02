-- ═══════════════════════════════════════════════════════════════════
--  Mesa — dold information läcker inte (MES-305)
--
--  Körs EFTER schema.sql och lekar.sql. Additiv och går att köra om.
--  SKRIVEN men inte körd: Jesper kör den (SQL Editor, eller
--  `supabase db push`) FÖRE koden från grenen mes-305-dold-information
--  driftsätts — klienten räknar med tabellen och policyerna nedan.
--
--  Tre läckor, tre delar. Alla tre gäller samma sak: en motståndare ska
--  bara få det hen får se vid ett riktigt bord.
--
--   1. game_players.lek — den gamla lekkolumnen töms. Raden i game_players
--      läses av alla i spelet (gp_las, realtime), och där låg hela
--      leklistor från före decks. Appen hämtar inte kolumnen längre
--      (hamtaSpel väljer kolumner); det här tar bort det som redan ligger
--      där. Kolumnen släpps i en senare migration, när ingen äldre klient
--      som frågar efter den är kvar.
--   2. hidden_cards — ägarens namn på sina nedvända kort. boards.kort delas
--      med alla i spelet (boards_las) och bär inte längre namnet på ett
--      nedvänt kort (slimDelat); ägaren behöver det när hen laddar om.
--      Bara ägaren läser och skriver sin rad. Inte i realtime-publikationen:
--      ingen behöver höra när den ändras.
--   3. realtime.messages — policyer för den privata kamerakanalen
--      'kam:<user_id>' (och lekkanalen 'lek:<user_id>', som får gå samma
--      väg när klienten byter): bara kontot självt får sända och lyssna.
--      Spelets kanal 'spel:<game_id>' är publik som förut och bär inte
--      längre några kamerameddelanden. Utan policyerna nekar Realtime varje
--      privat kanal, och appen säger det i stället för att tystna.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Gamla leklistor ─────────────────────────────────────────────
update public.game_players set lek = null where lek is not null;

-- ── 2. Nedvända kort ───────────────────────────────────────────────
-- kort: { "<cid>": { "name": "…", "sid": "…" } } för korten som ligger
-- nedvända just nu. Raden skrivs om varje gång mängden ändras.
create table if not exists public.hidden_cards (
  game_id     uuid not null references public.games(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kort        jsonb not null default '{}'::jsonb,
  andrad      timestamptz not null default now(),
  primary key (game_id, user_id)
);
alter table public.hidden_cards enable row level security;

-- Här sitter hela skyddet: bara ägaren, i alla fyra verb. Ingen "alla i
-- spelet får titta" som för boards — det är just det som skiljer tabellen.
drop policy if exists hidden_las on public.hidden_cards;
create policy hidden_las on public.hidden_cards for select
  using (user_id = auth.uid());
drop policy if exists hidden_skriv on public.hidden_cards;
create policy hidden_skriv on public.hidden_cards for insert
  with check (user_id = auth.uid() and public.i_spelet(game_id));
drop policy if exists hidden_andra on public.hidden_cards;
create policy hidden_andra on public.hidden_cards for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists hidden_radera on public.hidden_cards;
create policy hidden_radera on public.hidden_cards for delete
  using (user_id = auth.uid());

grant select, insert, update, delete on public.hidden_cards to authenticated;

-- ── 3. Den privata kamerakanalen ───────────────────────────────────
-- Supabase Realtime, privata kanaler: en klient får gå med i kanalen bara
-- om en select-policy på realtime.messages släpper igenom ämnet, och sända
-- bara om en insert-policy gör det. realtime.topic() är kanalens namn.
-- Bara den som är inloggad som kontot i namnet kommer in; anon får null ur
-- auth.uid() och faller på jämförelsen.
drop policy if exists kam_lyssna on realtime.messages;
create policy kam_lyssna on realtime.messages for select to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and realtime.topic() in ('kam:' || (select auth.uid())::text, 'lek:' || (select auth.uid())::text)
  );
drop policy if exists kam_sanda on realtime.messages;
create policy kam_sanda on realtime.messages for insert to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and realtime.topic() in ('kam:' || (select auth.uid())::text, 'lek:' || (select auth.uid())::text)
  );

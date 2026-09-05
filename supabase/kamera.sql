-- ═══════════════════════════════════════════════════════════════════
--  Handvy — mobilkameran
--
--  Körs EFTER schema.sql. Går att köra om.
--
--  Kameran är telefonens öga in i spelet. Den lägger ett kort på en
--  markerad matta, fotar det, och datorn känner igen kortet och lägger
--  ut det. Två saker behöver finnas för det: en plats att lägga bilden
--  (Storage) och en kö som säger "här ligger en ny bild" (scans).
--
--  Kön är avsiktligt inte en broadcast. En bild ska behandlas EN gång
--  även om spelaren har appen öppen på två datorer, och det går bara
--  att garantera med en rad som någon tar på sig.
-- ═══════════════════════════════════════════════════════════════════

-- ── kalibrering ────────────────────────────────────────────────────
-- Var mattan ligger i telefonens bild, plus färgen att känna igen den
-- på. En rad per spelare och spel: byter man plats vid bordet gäller
-- inte den gamla rutan längre, och den ska inte följa med till nästa
-- spel heller.
create table if not exists public.camera_setups (
  game_id     uuid not null references public.games(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  ruta        jsonb not null,          -- {x,y,w,h} i andelar 0–1 av bildrutan
  farg        jsonb,                   -- {h,s,l} medianfärgen på mattan
  bildbredd   int,                     -- telefonens bildruta vid kalibrering
  bildhojd    int,
  andrad      timestamptz not null default now(),
  primary key (game_id, user_id)
);

-- ── kön ────────────────────────────────────────────────────────────
-- status: 'ny' väntar, 'tas' någon har tagit den, 'klar' är behandlad,
-- 'fel' gick inte att känna igen. Den som behandlar sätter 'tas' med
-- ett villkor på att den fortfarande är 'ny' — vinner bara en, och den
-- andra datorn ser att raden redan är tagen.
create table if not exists public.scans (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references public.games(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  bild        text not null,           -- sökväg i storage-hinken
  status      text not null default 'ny',
  tagen_av    uuid,                    -- vilken flik som behandlar
  kort        text,                    -- namnet, när det är klart
  skapad      timestamptz not null default now(),
  andrad      timestamptz not null default now()
);
create index if not exists scans_game_ny on public.scans(game_id, status, skapad);

alter table public.camera_setups enable row level security;
alter table public.scans         enable row level security;

-- ── behörigheter ───────────────────────────────────────────────────
-- Samma grundregel som för borden: du rår över ditt eget. Kameran är
-- din kamera, dina bilder, ditt bord. De andra behöver inte ens se att
-- du har en kamera kopplad.
drop policy if exists cam_eget on public.camera_setups;
create policy cam_eget on public.camera_setups for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists scans_eget on public.scans;
create policy scans_eget on public.scans for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.camera_setups to authenticated;
grant select, insert, update, delete on public.scans         to authenticated;

-- ── ta en avläsning ────────────────────────────────────────────────
-- Villkoret status = 'ny' i where-satsen är hela poängen: två datorer
-- som frågar samtidigt får bara en rad var, och den ena får ingenting.
-- Villkoret släpper också en rad som fastnat: en dator som stängs mitt i en
-- identifiering, eller en kandidatruta som lämnas obesvarad, lämnar annars
-- kortet i 'tas' för alltid — och det är just de osäkra korten som väntar på
-- ett mänskligt svar.
create or replace function public.ta_scan(p_id uuid, p_flik uuid)
returns public.scans language plpgsql security definer set search_path = public as $$
declare r public.scans%rowtype;
begin
  update public.scans
     set status = 'tas', tagen_av = p_flik, andrad = now()
   where id = p_id and user_id = auth.uid()
     and (status = 'ny' or (status = 'tas' and andrad < now() - interval '90 seconds'))
  returning * into r;
  return r;                            -- null om någon annan hann före
end $$;

revoke all on function public.ta_scan(uuid, uuid) from public;
grant execute on function public.ta_scan(uuid, uuid) to authenticated;

-- ── realtid ────────────────────────────────────────────────────────
-- Telefonen behöver få veta när datorn bekräftat rutan, utan att fråga
-- om och om igen.
alter publication supabase_realtime add table public.scans;
alter publication supabase_realtime add table public.camera_setups;
alter table public.scans         replica identity full;
alter table public.camera_setups replica identity full;

-- ── lagring ────────────────────────────────────────────────────────
-- Privat hink. Bilderna är fotografier av ditt bord och har ingen
-- anledning att vara publika. Filnamnet börjar med användarens id, och
-- policyerna nedan låter dig bara röra din egen mapp.
insert into storage.buckets (id, name, public)
values ('scans', 'scans', false)
on conflict (id) do nothing;

drop policy if exists scans_las on storage.objects;
create policy scans_las on storage.objects for select to authenticated
  using (bucket_id = 'scans' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists scans_ladda_upp on storage.objects;
create policy scans_ladda_upp on storage.objects for insert to authenticated
  with check (bucket_id = 'scans' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists scans_radera on storage.objects;
create policy scans_radera on storage.objects for delete to authenticated
  using (bucket_id = 'scans' and (storage.foldername(name))[1] = auth.uid()::text);

-- ═══════════════════════════════════════════════════════════════════
--  Mesa — varje fråga till Claude, och taket per konto (MES-316)
--
--  Fristående: behöver bara auth.users. Går att köra om. SKRIVEN men inte
--  körd: Jesper kör den (SQL Editor, eller `supabase db push`) INNAN koden
--  i api/identify.js som använder den driftsätts. Annars svarar
--  /api/identify 503 på varje fråga ("räknaren gick inte att nå") och
--  AI-hjälpen står still tills migrationen körts.
--
--  En rad per fråga till Claude. Det är räknaren för taket per konto
--  (MES-316) och samma tabell som MES-325 bygger kostnaden på: en sanning,
--  inte två. Servern (api/identify.js, med service_role) skriver raden
--  INNAN frågan går iväg — genom claude_fraga_reservera, som räknar och
--  skriver under ett lås per konto, så att tio samtidiga frågor på 299 inte
--  alla slinker igenom — och fyller i resten när svaret kommit.
--
--  Inga bilder och inga kortnamn sparas. Ingen IP-adress heller: MES-325
--  föreslog en hashad IP "tills user_id finns", och nu finns user_id på
--  varje rad.
--
--  Bara service_role når tabellen. Spelare kan varken läsa eller ändra sin
--  egen räknare.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.claude_fragor (
  id            bigint generated always as identity primary key,
  tid           timestamptz not null default now(),
  -- kontot som frågade. set null när kontot tas bort: kostnaden finns kvar
  -- i summorna, kopplingen till personen gör det inte
  user_id       uuid references auth.users(id) on delete set null,
  -- läget i api/identify.js: kamera, lek, card, land, namn, pane, kandidat
  mode          text not null,
  modell        text,                  -- modellen servern svarade med
  input_tokens  integer,               -- ur Anthropics usage
  output_tokens integer,
  cache_read    integer,               -- cache_read_input_tokens (0 tills prompt caching finns, MES-327)
  cache_write   integer,               -- cache_creation_input_tokens
  dollar        numeric(12, 6),        -- räknas ut av MES-325; tomt tills dess
  ms            integer,               -- svarstid på servern, från inloggningen till svaret
  status        smallint,              -- HTTP-status klienten fick
  ok            boolean,               -- svaret gick att använda (200 utan varfor); null = inget svar loggat
  spel          text,                  -- spelkoden (games.kod) när frågan kom från ett spel
  -- false = Anthropic svarade aldrig 200 (nätet, överbelastning, nyckeln):
  -- ingen betald fråga, och den räknas inte mot taket. Sätts efter svaret;
  -- en rad som aldrig fick sitt svar (funktionen dog) räknas.
  raknas        boolean not null default true
);

create index if not exists claude_fragor_konto_tid on public.claude_fragor (user_id, tid);
create index if not exists claude_fragor_tid on public.claude_fragor (tid);

alter table public.claude_fragor enable row level security;
-- Ingen policy: utan policy och med RLS på når varken anon eller
-- authenticated en enda rad. service_role går förbi RLS.
revoke all on public.claude_fragor from anon, authenticated;
grant select, insert, update, delete on public.claude_fragor to service_role;

-- ── taket: räkna och reservera i ett steg ──────────────────────────
-- Räknar kontots frågor i innevarande kalendermånad (svensk tid: månaden
-- börjar vid midnatt den 1:a i Stockholm) och skriver en ny rad om taket
-- inte är nått. Låset per konto (pg_advisory_xact_lock, släpps när
-- transaktionen tar slut) gör räkningen och skrivningen till ett steg:
-- två samtidiga frågor kan inte båda se 299.
--
-- p_tak kommer från servern (CLAUDE_TAK_PER_MANAD, förval 300), så att
-- taket går att ändra utan en ny migration.
--
-- Svarar alltid med en rad:
--   ok          true = frågan får gå, raden är skriven
--   antal       kontots frågor i månaden, den här inräknad när ok
--   id          radens id (null när taket är nått)
--   nollstalls  när månaden tar slut och räkningen börjar om
create or replace function public.claude_fraga_reservera(
  p_user uuid, p_tak integer, p_mode text, p_spel text default null)
returns table (ok boolean, antal integer, id bigint, nollstalls timestamptz)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_lokal  timestamp := date_trunc('month', now() at time zone 'Europe/Stockholm');
  v_start  timestamptz := v_lokal at time zone 'Europe/Stockholm';
  v_slut   timestamptz := (v_lokal + interval '1 month') at time zone 'Europe/Stockholm';
  v_antal  integer;
  v_id     bigint;
begin
  if p_user is null then
    raise exception 'claude_fraga_reservera: p_user saknas';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('claude_fragor:' || p_user::text, 0));
  select count(*) into v_antal
    from public.claude_fragor f
   where f.user_id = p_user and f.tid >= v_start and f.raknas;
  if v_antal >= coalesce(p_tak, 0) then
    return query select false, v_antal, null::bigint, v_slut;
    return;
  end if;
  insert into public.claude_fragor (user_id, mode, spel)
       values (p_user, coalesce(nullif(p_mode, ''), 'kandidat'), p_spel)
    returning claude_fragor.id into v_id;
  return query select true, v_antal + 1, v_id, v_slut;
end $$;

revoke all on function public.claude_fraga_reservera(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.claude_fraga_reservera(uuid, integer, text, text) to service_role;

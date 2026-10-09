-- ═══════════════════════════════════════════════════════════════════
--  Mesa — taket per parti (Jespers beslut 2026-10-09)
--
--  Utöver taket per konto och kalendermånad (MES-316, 300) får ett konto
--  högst p_tak_parti frågor till Claude i ett och samma parti (spelkoden i
--  claude_fragor.spel). Taket kommer från servern (CLAUDE_TAK_PER_PARTI,
--  förval 30), så att det går att ändra utan en ny migration; 0 betyder att
--  inga frågor går i ett parti alls. Frågor utanför ett parti (lekfotot,
--  p_spel null) räknas bara mot månaden.
--
--  Räknas per konto och parti, inte för hela bordet: varje spelares
--  telefon frågar om sina egna kort, och fyra spelare ska inte dela på 30.
--
--  Samma lås per konto som förut, så att räkningen och skrivningen är ett
--  steg också för partiet. Funktionen byts i ett steg (drop + create i
--  samma transaktion): en server med den gamla koden anropar med fyra
--  namngivna argument och når den nya, där p_tak_parti är null = inget tak
--  per parti. De nya kolumnerna i svaret läser den gamla koden inte.
--
--  Svarar alltid med en rad:
--    ok          true = frågan får gå, raden är skriven
--    antal       kontots frågor i månaden, den här inräknad när ok
--    id          radens id (null när ett tak är nått)
--    nollstalls  när månaden tar slut och räkningen börjar om
--    parti       kontots frågor i partiet, den här inräknad när ok (null utan parti)
--    varfor      'manad' eller 'parti' när ett tak är nått, annars null
-- ═══════════════════════════════════════════════════════════════════

begin;

drop function if exists public.claude_fraga_reservera(uuid, integer, text, text);
drop function if exists public.claude_fraga_reservera(uuid, integer, text, text, integer);

create function public.claude_fraga_reservera(
  p_user uuid, p_tak integer, p_mode text, p_spel text default null, p_tak_parti integer default null)
returns table (ok boolean, antal integer, id bigint, nollstalls timestamptz, parti integer, varfor text)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_lokal  timestamp := date_trunc('month', now() at time zone 'Europe/Stockholm');
  v_start  timestamptz := v_lokal at time zone 'Europe/Stockholm';
  v_slut   timestamptz := (v_lokal + interval '1 month') at time zone 'Europe/Stockholm';
  v_antal  integer;
  v_parti  integer := null;
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
    return query select false, v_antal, null::bigint, v_slut, null::integer, 'manad'::text;
    return;
  end if;
  if nullif(p_spel, '') is not null then
    select count(*) into v_parti
      from public.claude_fragor f
     where f.user_id = p_user and f.spel = p_spel and f.raknas;
    if p_tak_parti is not null and v_parti >= p_tak_parti then
      return query select false, v_antal, null::bigint, v_slut, v_parti, 'parti'::text;
      return;
    end if;
  end if;
  insert into public.claude_fragor (user_id, mode, spel)
       values (p_user, coalesce(nullif(p_mode, ''), 'kandidat'), nullif(p_spel, ''))
    returning claude_fragor.id into v_id;
  return query select true, v_antal + 1, v_id, v_slut, case when v_parti is null then null else v_parti + 1 end, null::text;
end $$;

revoke all on function public.claude_fraga_reservera(uuid, integer, text, text, integer) from public, anon, authenticated;
grant execute on function public.claude_fraga_reservera(uuid, integer, text, text, integer) to service_role;

commit;

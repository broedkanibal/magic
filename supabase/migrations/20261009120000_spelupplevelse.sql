-- ═══════════════════════════════════════════════════════════════════
--  Mesa — hur bra spelupplevelsen är: korthändelser och betyget efter
--  partiet
--
--  Fristående: behöver games, auth.users och i_spelet (schema.sql). Går
--  att köra om. Koden i index.html tål att tabellerna saknas: en skrivning
--  som misslyckas loggas en gång i konsolen och spelet går vidare. Inget
--  mäts förrän migrationen körts.
--
--  kort_handelser: en rad per sak som händer med ett kort på bordet under
--  ett spel. Huvudmåttet (rättningar per 100 kort) och löftet (fel namn som
--  spelaren rättar) räknas ur den; frågorna står i dev/spelupplevelse.sql.
--
--    typ          betyder
--    namn         kameran gav kortet ett namn av sig själv
--    namnlos      kortet hamnade på bordet utan namn ("Name this card")
--    sent_namn    ett namnlöst kort fick namn av sig själv senare
--    namngiven    spelaren skrev in namnet på ett namnlöst kort
--    bytt         spelaren bytte namnet på ett kort som hade ett (Change card)
--    tillagd      spelaren lade ett kort på bordet för hand
--    borttagen    spelaren tog bort ett kort som kameran lagt dit
--
--  Bara bordets kort, som alla vid bordet redan ser — aldrig handen eller
--  leken, så inget dolt kan läcka härifrån.
--
--  spel_betyg: en rad per spelare och spel — "How did the camera do?" 1–5,
--  eller null när spelaren hoppade över frågan (då frågas den inte igen).
--
--  Spelaren skriver sina egna rader i spel hen är med i. Händelserna kan
--  ingen klient läsa; betyget kan spelaren läsa sitt eget, för att Home ska
--  veta att frågan redan är besvarad.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.kort_handelser (
  id        bigint generated always as identity primary key,
  tid       timestamptz not null default now(),
  game_id   uuid not null references public.games(id) on delete cascade,
  -- set null när kontot tas bort: siffrorna finns kvar, personen gör det inte
  user_id   uuid references auth.users(id) on delete set null default auth.uid(),
  kort      text,           -- kortets id på bordet: binder ihop händelserna för samma kort
  typ       text not null check (typ in
              ('namn', 'namnlos', 'sent_namn', 'namngiven', 'bytt', 'tillagd', 'borttagen')),
  namn      text,           -- namnet kortet fick (eller hade, för borttagen)
  fran      text,           -- bytt: namnet före bytet
  kalla     text,           -- namn/sent_namn: telefon | claude | minne — varifrån namnet kom
  ms        integer,        -- namn/sent_namn/namnlos: ms från att telefonens detektor först såg kortet till att bordet skickades
  lage      text            -- spelarens läge: bara 'bord' (spegeln) loggas
);

create index if not exists kort_handelser_spel on public.kort_handelser (game_id, tid);
create index if not exists kort_handelser_konto on public.kort_handelser (user_id, tid);

create table if not exists public.spel_betyg (
  game_id   uuid not null references public.games(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade default auth.uid(),
  betyg     smallint check (betyg between 1 and 5),   -- null = hoppade över
  tid       timestamptz not null default now(),
  primary key (game_id, user_id)
);

alter table public.kort_handelser enable row level security;
alter table public.spel_betyg     enable row level security;

drop policy if exists kh_skriv on public.kort_handelser;
create policy kh_skriv on public.kort_handelser for insert to authenticated
  with check (user_id = auth.uid() and public.i_spelet(game_id));

drop policy if exists sb_skriv on public.spel_betyg;
create policy sb_skriv on public.spel_betyg for insert to authenticated
  with check (user_id = auth.uid() and public.i_spelet(game_id));

drop policy if exists sb_las on public.spel_betyg;
create policy sb_las on public.spel_betyg for select to authenticated
  using (user_id = auth.uid());

revoke all on public.kort_handelser from anon, authenticated;
revoke all on public.spel_betyg     from anon, authenticated;
grant insert on public.kort_handelser to authenticated;
grant insert, select on public.spel_betyg to authenticated;
grant select, insert, update, delete on public.kort_handelser, public.spel_betyg to service_role;

-- ═══════════════════════════════════════════════════════════════════
--  Vyerna: måtten räknas här, inte i en sparad kolumn — ett sparat snitt
--  blir fel så fort nästa kort loggas. security_invoker: vyn läser med
--  den frågandes rättigheter, så bara service_role (SQL Editor,
--  dev/spelupplevelse.cjs) ser något.
--
--  Ordlista (samma i alla vyer):
--    kort               utspelade kort: kameran lade dit dem (med eller utan
--                       namn) eller spelaren lade dit dem för hand. Ett kort
--                       spelaren tog bort räknas inte — det låg aldrig där
--    ej_identifierade   kameran lade dit kortet utan namn
--    identifierade      kortet fick namn utan att spelaren skrev det
--    ratt_av_sig_sjalv  identifierat, och spelaren behövde aldrig röra det
--    fel_namn           spelaren bytte ett namn kameran satt (löftet)
--    rattningar         namngivna + bytta + tillagda + borttagna (huvudmåttet)
--    median_ms, p90_ms  från att telefonen först såg kortet till att det fick namn
-- ═══════════════════════════════════════════════════════════════════

create or replace view public.upplevelse_kort with (security_invoker = true) as
select k.*,
       (kamerans and not borttagen) or tillagd                          as spelat,
       (namn_sjalv or sent_namn) and not borttagen                      as identifierat,
       (namn_sjalv or sent_namn) and not (namngiven or bytt or borttagen) as ratt_sjalv
from (
  select game_id, user_id, kort,
         min(tid)                                                     as forst,
         bool_or(typ in ('namn', 'namnlos'))                          as kamerans,
         bool_or(typ = 'namn')                                        as namn_sjalv,
         bool_or(typ = 'namnlos')                                     as namnlos,
         bool_or(typ = 'sent_namn')                                   as sent_namn,
         bool_or(typ = 'namngiven')                                   as namngiven,
         bool_or(typ = 'bytt')                                        as bytt,
         bool_or(typ = 'tillagd')                                     as tillagd,
         bool_or(typ = 'borttagen')                                   as borttagen,
         bool_or(typ in ('namn', 'sent_namn') and kalla = 'claude')   as via_claude,
         min(ms) filter (where typ = 'namn')                          as ms_namn,
         count(*) filter (where typ in ('namngiven', 'bytt', 'tillagd', 'borttagen')) as rattningar
    from public.kort_handelser
   where kort is not null
   group by game_id, user_id, kort
) k;

-- Per spelare och spel.
create or replace view public.upplevelse_spelare_spel with (security_invoker = true) as
select k.game_id, g.kod, k.user_id, p.namn as spelare,
       min(k.forst)                                                   as forsta_kort,
       count(*) filter (where k.spelat)                               as kort,
       count(*) filter (where k.namnlos)                              as ej_identifierade,
       count(*) filter (where k.namngiven)                            as namngivna,
       count(*) filter (where k.namnlos and not (k.namngiven or k.sent_namn or k.borttagen)) as lamnade_utan_namn,
       count(*) filter (where k.identifierat)                         as identifierade,
       count(*) filter (where k.ratt_sjalv)                           as ratt_av_sig_sjalv,
       count(*) filter (where k.bytt)                                 as fel_namn,
       count(*) filter (where k.tillagd)                              as tillagda,
       count(*) filter (where k.borttagen)                            as borttagna,
       sum(k.rattningar)                                              as rattningar,
       count(*) filter (where k.via_claude)                           as via_claude,
       round(percentile_cont(0.5) within group (order by k.ms_namn)) as median_ms,
       round(percentile_cont(0.9) within group (order by k.ms_namn)) as p90_ms,
       b.betyg
  from public.upplevelse_kort k
  join public.games g on g.id = k.game_id
  left join public.game_players p on p.game_id = k.game_id and p.user_id = k.user_id
  left join public.spel_betyg b   on b.game_id = k.game_id and b.user_id = k.user_id
 group by k.game_id, g.kod, k.user_id, p.namn, b.betyg;

-- Per spelare, över alla spel. Snitten per spel är summan delad med antalet
-- spel; andelarna och tiderna räknas över alla kort, inte som snitt av snitt.
create or replace view public.upplevelse_spelare with (security_invoker = true) as
select k.user_id,
       (select p.namn from public.game_players p where p.user_id = k.user_id
         order by p.gick_med desc limit 1)                            as spelare,
       count(distinct k.game_id)                                      as spel,
       count(*) filter (where k.spelat)                               as kort,
       round(100.0 * count(*) filter (where k.identifierat) / nullif(count(*) filter (where k.spelat), 0), 1) as procent_identifierade,
       round(100.0 * count(*) filter (where k.ratt_sjalv)  / nullif(count(*) filter (where k.spelat), 0), 1) as procent_ratt_av_sig_sjalv,
       round(count(*) filter (where k.namnlos)::numeric   / count(distinct k.game_id), 1) as ej_identifierade_per_spel,
       round(count(*) filter (where k.namngiven)::numeric / count(distinct k.game_id), 1) as namngivna_per_spel,
       round(100.0 * sum(k.rattningar) / nullif(count(*) filter (where k.spelat), 0), 1) as rattningar_per_100_kort,
       round(100.0 * count(*) filter (where k.bytt) / nullif(count(*) filter (where k.spelat), 0), 1) as fel_namn_per_100_kort,
       round(percentile_cont(0.5) within group (order by k.ms_namn)) as median_ms,
       round(percentile_cont(0.9) within group (order by k.ms_namn)) as p90_ms
  from public.upplevelse_kort k
 group by k.user_id;

-- Per parti: klart, betyget och om spelarna kom tillbaka. Bara spel med
-- minst ett loggat kort — de före loggningen säger ingenting.
--   klart     värden tryckte End the game
--   pagar     inte avslutat, och senaste kortet för mindre än 12 h sedan
--   igen      av spelarna med kort i partiet: hur många spelade kort i ett
--             annat parti inom 14 dagar efter det här startade
--   avgjort   partiet startade för mer än 14 dagar sedan (annars kan igen
--             fortfarande växa)
create or replace view public.upplevelse_partier with (security_invoker = true) as
with spel as (
  select k.game_id, min(k.tid) as forsta, max(k.tid) as senaste,
         count(distinct k.user_id) as spelare
    from public.kort_handelser k group by k.game_id
),
igen as (
  select s.game_id, s.user_id,
         exists (
           select 1 from public.kort_handelser k2
            where k2.user_id = s.user_id and k2.game_id <> s.game_id
              and k2.tid > s.forsta and k2.tid <= s.forsta + interval '14 days'
         ) as igen
    from (select game_id, user_id, min(tid) as forsta
            from public.kort_handelser group by game_id, user_id) s
)
select g.id as game_id, g.kod, coalesce(g.startad, s.forsta) as startad, g.avslutad,
       g.avslutad is not null                                         as klart,
       g.avslutad is null and s.senaste > now() - interval '12 hours' as pagar,
       coalesce(g.startad, s.forsta) < now() - interval '14 days'     as avgjort,
       s.spelare,
       (select count(*) from igen i where i.game_id = g.id and i.igen) as spelade_igen,
       (select count(*) from public.spel_betyg b where b.game_id = g.id) as svar,
       (select round(avg(b.betyg), 2) from public.spel_betyg b where b.game_id = g.id) as betyg_snitt
  from spel s join public.games g on g.id = s.game_id;

-- En rad: hela bilden.
create or replace view public.upplevelse_totalt with (security_invoker = true) as
with ps as (
  select game_id, max(rattningar)                    as max_rattningar,
         bool_and(identifierade = kort)              as alla_identifierade
    from public.upplevelse_spelare_spel group by game_id
)
select
  (select count(distinct game_id) from public.upplevelse_kort)            as spel,
  (select count(distinct user_id) from public.upplevelse_kort)            as spelare,
  count(*) filter (where k.spelat)                                        as kort,
  -- huvudmåttet och löftet
  round(100.0 * sum(k.rattningar) / nullif(count(*) filter (where k.spelat), 0), 1) as rattningar_per_100_kort,
  round(100.0 * count(*) filter (where k.bytt) / nullif(count(*) filter (where k.spelat), 0), 1) as fel_namn_per_100_kort,
  -- förklarande
  round(100.0 * count(*) filter (where k.identifierat) / nullif(count(*) filter (where k.spelat), 0), 1) as procent_identifierade,
  round(100.0 * count(*) filter (where k.identifierat and not k.via_claude) / nullif(count(*) filter (where k.spelat), 0), 1) as procent_identifierade_utan_claude,
  round(100.0 * count(*) filter (where k.ratt_sjalv) / nullif(count(*) filter (where k.spelat), 0), 1) as procent_ratt_av_sig_sjalv,
  round(percentile_cont(0.5) within group (order by k.ms_namn))          as median_ms,
  round(percentile_cont(0.9) within group (order by k.ms_namn))          as p90_ms,
  -- per parti
  (select round(100.0 * count(*) filter (where alla_identifierade) / nullif(count(*), 0), 1) from ps) as procent_spel_alla_identifierade,
  (select round(100.0 * count(*) filter (where max_rattningar <= 1) / nullif(count(*), 0), 1) from ps) as procent_spel_hogst_1_rattning_per_spelare,
  -- utfall
  (select round(100.0 * count(*) filter (where klart) / nullif(count(*) filter (where not pagar), 0), 1)
     from public.upplevelse_partier)                                      as procent_partier_klara,
  (select round(100.0 * sum(spelade_igen) / nullif(sum(spelare), 0), 1)
     from public.upplevelse_partier where avgjort)                        as procent_spelade_igen_14d,
  (select round(avg(betyg), 2) from public.spel_betyg)                    as betyg_snitt,
  (select count(betyg) from public.spel_betyg)                            as betyg_svar,
  (select count(*) filter (where betyg is null) from public.spel_betyg)   as betyg_hoppade
from public.upplevelse_kort k;

revoke all on public.upplevelse_kort, public.upplevelse_spelare_spel, public.upplevelse_spelare,
              public.upplevelse_partier, public.upplevelse_totalt from anon, authenticated;
grant select on public.upplevelse_kort, public.upplevelse_spelare_spel, public.upplevelse_spelare,
                public.upplevelse_partier, public.upplevelse_totalt to service_role;

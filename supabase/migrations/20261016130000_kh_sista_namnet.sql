-- ═══════════════════════════════════════════════════════════════════
--  Mesa — fel namn räknas på kortets sista namn (MES-387)
--
--  Sedan Change card (MES-387) loggar index.html (namnOvergang) 'bytt' när
--  spelaren byter kamerans namn, och 'angrad' med rapport.av = 'namn' när
--  spelaren tar tillbaka sitt förra namn: Undo i toasten, tillbaka till
--  kamerans namn, eller ett nytt namn (då angrad och sedan en ny bytt). Vyerna
--  räknade varje bytt och drog aldrig av en angrad, så ett felklick som
--  rättades med Undo blev ett fel namn i löftet, och A → B → C gav två
--  rättningar och två rader i fråga 5 (dev/spelupplevelse.sql).
--
--  Nu gäller kortets sista namnhändelse. Kortets senaste bytt räknas bara
--  om ingen angrad kom efter den som tog tillbaka namnet:
--    av 'namn'   Undo efter Change card, eller ett nytt namn (bytt följer)
--    av 'cmdz'   ⌘Z, när namnet efter ⌘Z (rapport.efter.namn) inte är
--                bytets namn. ⌘Z loggar inget angrad av 'namn' (namnOvergang
--                med logga false), men efter.namn säger vilket namn kortet
--                fick tillbaka; en ⌘Z som bara tog tillbaka ett tap lämnar
--                namnet och rör inte bytet
--  Samma millisekund räknas bytt som senare: namnOvergang och ⌘Z loggar
--  alltid angrad före den nya bytt.
--
--    upplevelse_kort.bytt         true bara när kortet slutar med spelarens
--                                 namn (bytt_fran → bytt_till, nya kolumner)
--    upplevelse_kort.rattningar   namnbytet räknas en gång per kort, och
--                                 inte alls om det togs tillbaka
--    upplevelse_handlingar        angrade räknar inte längre namnens Undo
--                                 (av 'namn'); de står i angrade_namn
--
--  Allt som räknas ur upplevelse_kort (fel_namn, ratt_av_sig_sjalv,
--  rattningar per spelare, spel och totalt) följer med. Inga rader ändras.
--  Går att köra om.
-- ═══════════════════════════════════════════════════════════════════

create or replace view public.upplevelse_kort with (security_invoker = true) as
with sista_bytt as (
  select distinct on (game_id, user_id, kort) game_id, user_id, kort, tid, fran, namn
    from public.kort_handelser
   where typ = 'bytt' and kort is not null
   order by game_id, user_id, kort, tid desc, id desc
),
galler as (
  select b.game_id, b.user_id, b.kort, b.fran, b.namn
    from sista_bytt b
   where not exists (
     select 1 from public.kort_handelser a
      where a.typ = 'angrad' and a.game_id = b.game_id and a.kort = b.kort
        and a.user_id is not distinct from b.user_id and a.tid > b.tid
        and (a.rapport->>'av' = 'namn'
             or (a.rapport->>'av' = 'cmdz' and a.rapport->'efter'->>'finns' = '1'
                 and a.rapport->'efter'->>'namn' is distinct from b.namn)))
),
k as (
  select h.game_id, h.user_id, h.kort,
         min(h.tid)                                                     as forst,
         bool_or(h.typ in ('namn', 'namnlos'))                          as kamerans,
         bool_or(h.typ = 'namn')                                        as namn_sjalv,
         bool_or(h.typ = 'namnlos')                                     as namnlos,
         bool_or(h.typ = 'sent_namn')                                   as sent_namn,
         bool_or(h.typ = 'namngiven')                                   as namngiven,
         bool_or(h.typ = 'tillagd')                                     as tillagd,
         bool_or(h.typ = 'borttagen')                                   as borttagen,
         bool_or(h.typ in ('namn', 'sent_namn') and h.kalla = 'claude') as via_claude,
         min(h.ms) filter (where h.typ = 'namn')                        as ms_namn,
         count(*) filter (where h.typ in ('namngiven', 'tillagd', 'borttagen')) as rattningar_utan_namn
    from public.kort_handelser h
   where h.kort is not null
   group by h.game_id, h.user_id, h.kort
)
select k.game_id, k.user_id, k.kort, k.forst, k.kamerans, k.namn_sjalv, k.namnlos, k.sent_namn, k.namngiven,
       g.kort is not null                                               as bytt,
       k.tillagd, k.borttagen, k.via_claude, k.ms_namn,
       k.rattningar_utan_namn + (g.kort is not null)::int               as rattningar,
       (k.kamerans and not k.borttagen) or k.tillagd                    as spelat,
       (k.namn_sjalv or k.sent_namn) and not k.borttagen                as identifierat,
       (k.namn_sjalv or k.sent_namn) and not (k.namngiven or g.kort is not null or k.borttagen) as ratt_sjalv,
       g.fran                                                           as bytt_fran,
       g.namn                                                           as bytt_till
  from k
  left join galler g on g.game_id = k.game_id and g.kort = k.kort and g.user_id is not distinct from k.user_id;

create or replace view public.upplevelse_handlingar with (security_invoker = true) as
select h.game_id, g.kod, h.user_id, p.namn as spelare,
       count(*) filter (where h.typ = 'tap_hand')                    as tap_hand,
       count(*) filter (where h.typ = 'flytt_hand')                  as flytt_hand,
       count(*) filter (where h.typ = 'grav_hand')                   as grav_hand,
       count(*) filter (where h.typ = 'angrad' and h.rapport->>'av' is distinct from 'namn') as angrade,
       count(*) filter (where h.typ = 'folj_kameran')                as folj_kameran,
       (select s.kort from public.upplevelse_spelare_spel s
         where s.game_id = h.game_id and s.user_id = h.user_id)      as kort,
       count(*) filter (where h.typ = 'angrad' and h.rapport->>'av' = 'namn') as angrade_namn
  from public.kort_handelser h
  join public.games g on g.id = h.game_id
  left join public.game_players p on p.game_id = h.game_id and p.user_id = h.user_id
 where h.typ in ('tap_hand', 'flytt_hand', 'angrad', 'folj_kameran', 'grav_hand')
 group by h.game_id, g.kod, h.user_id, p.namn;

comment on column public.kort_handelser.rapport is
  'typ match: felrapporten från Match the camera (MES-357) — { kalla, bild, fore, efter, spar, resultat, … }. '
  'tap_hand, flytt_hand, angrad, folj_kameran, grav_hand (MES-385): { spar, tappad, kamTap, x, y, av, zon }. '
  'angrad av namn (MES-387): spelaren tog tillbaka sitt förra namn — { spar, av }';

-- Som förut: bara service_role läser.
revoke all on public.upplevelse_kort, public.upplevelse_handlingar from anon, authenticated;
grant select on public.upplevelse_kort, public.upplevelse_handlingar to service_role;

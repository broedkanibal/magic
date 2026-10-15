-- ═══════════════════════════════════════════════════════════════════
--  Mesa — spelarens rättelser av handlingar (MES-385, Jespers beslut 2026-10-15)
--
--  Kameran missar ungefär hälften av tap och flyttar på mattan, och
--  spelaren rättar dem redan i appen. Varje rättelse blir nu en rad i
--  kort_handelser, för kort som kameran följer (läget 'bord'):
--
--    typ           betyder
--    tap_hand      spelaren tappade/otappade kortet så att mattan visar ett
--                  annat läge än kamerans dom (Tapped by hand)
--    flytt_hand    spelaren flyttade kortet på mattan (Moved by hand)
--    angrad        Undo i toasten efter tap_hand eller flytt_hand: kameran
--                  hade rätt (rapport.av = 'tap' | 'flytt')
--    folj_kameran  Follow camera: kortet tar kamerans läge igen
--                  (rapport.av = 'tap' | 'flytt')
--    grav_hand     spelaren lade kortet i graveyard eller exile själv
--                  (rapport.zon = 'grav' | 'exil')
--
--  Remove och Return to hand är borttagen, som förut. Detaljerna står i
--  kolumnen rapport (jsonb): spar, tappad (mattans läge efter), kamTap
--  (kamerans dom), x/y för en flytt. Raderna loggas varje gång, inte en
--  gång per kort, och i en egen skrivning: utan den här migrationen tappas
--  bara de nya raderna (check-villkoret), aldrig namnens.
--
--  Vyerna upplevelse_* räknar som förut (huvudmåttet rörs inte). Den nya
--  vyn upplevelse_handlingar räknar rättelserna per spelare och spel.
--
--  Går att köra om.
-- ═══════════════════════════════════════════════════════════════════

alter table public.kort_handelser drop constraint if exists kort_handelser_typ_check;
alter table public.kort_handelser add constraint kort_handelser_typ_check check (typ in
  ('namn', 'namnlos', 'sent_namn', 'namngiven', 'bytt', 'tillagd', 'borttagen', 'match',
   'tap_hand', 'flytt_hand', 'angrad', 'folj_kameran', 'grav_hand'));

comment on column public.kort_handelser.rapport is
  'typ match: felrapporten från Match the camera (MES-357) — { kalla, bild, fore, efter, spar, resultat, … }. '
  'tap_hand, flytt_hand, angrad, folj_kameran, grav_hand (MES-385): { spar, tappad, kamTap, x, y, av, zon }';

-- Per spelare och spel. kort = utspelade kort ur upplevelse_spelare_spel
-- (samma ordlista), så att rättelserna kan räknas per 100 kort.
create or replace view public.upplevelse_handlingar with (security_invoker = true) as
select h.game_id, g.kod, h.user_id, p.namn as spelare,
       count(*) filter (where h.typ = 'tap_hand')                    as tap_hand,
       count(*) filter (where h.typ = 'flytt_hand')                  as flytt_hand,
       count(*) filter (where h.typ = 'grav_hand')                   as grav_hand,
       count(*) filter (where h.typ = 'angrad')                      as angrade,
       count(*) filter (where h.typ = 'folj_kameran')                as folj_kameran,
       (select s.kort from public.upplevelse_spelare_spel s
         where s.game_id = h.game_id and s.user_id = h.user_id)      as kort
  from public.kort_handelser h
  join public.games g on g.id = h.game_id
  left join public.game_players p on p.game_id = h.game_id and p.user_id = h.user_id
 where h.typ in ('tap_hand', 'flytt_hand', 'angrad', 'folj_kameran', 'grav_hand')
 group by h.game_id, g.kod, h.user_id, p.namn;

-- Som de andra vyerna: bara service_role läser (SQL Editor, dev/spelupplevelse.cjs).
revoke all on public.upplevelse_handlingar from anon, authenticated;
grant select on public.upplevelse_handlingar to service_role;

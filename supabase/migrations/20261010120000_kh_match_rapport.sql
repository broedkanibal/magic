-- ═══════════════════════════════════════════════════════════════════
--  Mesa — Match the camera sparar en felrapport (MES-357, MES-356 punkt 5)
--
--  Varje tryck på Match the camera (panelens rad, menyn, M) blir en rad i
--  kort_handelser med typ 'match' och kort = null. rapport bär kamerans
--  bild just då (en data-URL, ~50 kB, eller null om telefonen inte
--  skickade någon), mattans läge före och efter, telefonens spår och vad
--  Match ändrade. Material till nya fall i uppspelaren (dev/mattest) och
--  golden. Inget skickas till Claude.
--
--  Mattans läge är bara bordets kort, aldrig handen eller leken. Bilden och
--  spåren är kamerans, så ett kort som hålls ovanför bordet kan synas där.
--  Ingen klient kan läsa raderna (bara service_role). Vyerna upplevelse_*
--  räknar bara rader med ett kort, så måtten rörs inte.
--
--  Går att köra om. Koden i index.html tål att kolumnen saknas: skrivningen
--  faller, loggas i konsolen och spelet går vidare.
-- ═══════════════════════════════════════════════════════════════════

alter table public.kort_handelser add column if not exists rapport jsonb;

alter table public.kort_handelser drop constraint if exists kort_handelser_typ_check;
alter table public.kort_handelser add constraint kort_handelser_typ_check check (typ in
  ('namn', 'namnlos', 'sent_namn', 'namngiven', 'bytt', 'tillagd', 'borttagen', 'match'));

comment on column public.kort_handelser.rapport is
  'typ match: felrapporten från Match the camera (MES-357) — { kalla, bild, fore, efter, spar, resultat, … }';

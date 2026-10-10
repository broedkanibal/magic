-- ═══════════════════════════════════════════════════════════════════
--  Mesa — spelläget Use camera to add cards ('skarm') tas bort (Jesper 2026-10-10)
--
--  game_players.lage är nu 'bord' (Mirror my table) eller 'utan' (Digital
--  table). 'skarm' var både läget Use camera to add cards och radens
--  förval — och Digital table skrev aldrig något läge, så en rad som stod
--  kvar på förvalet var det som gav Digital table sina fasta högar. Nu får
--  Digital table ett eget värde, 'utan', och förvalet blir det.
--
--  Körs FÖRE koden som skriver 'utan' (Moln.sattLage): den gamla
--  begränsningen tillåter bara 'skarm' och 'bord'. Koden läser allt som
--  inte är 'bord' som Digital table, så rader som står på 'skarm' fungerar
--  som förut också innan den körts. Går att köra om.
--
--  En flik med den gamla koden som byter till Use camera to add cards får
--  "The mode could not be saved" efter körningen — läget finns inte längre.
-- ═══════════════════════════════════════════════════════════════════

alter table public.game_players drop constraint if exists game_players_lage_check;
update public.game_players set lage = 'utan' where lage is distinct from 'bord';
alter table public.game_players alter column lage set default 'utan';
alter table public.game_players
  add constraint game_players_lage_check check (lage in ('bord', 'utan'));

-- Spelupplevelsens vyer (20261009120000_spelupplevelse.sql) läser games och
-- game_players, men service_role — nyckeln dev/spelupplevelse.cjs använder —
-- hade bara rätt till kort_handelser och spel_betyg. Verktyget föll på
-- "permission denied for table games" (2026-10-12). Bara läsrätt.
grant select on public.games, public.game_players to service_role;

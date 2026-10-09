-- Hur bra spelupplevelsen är: huvudmåttet, löftet och de förklarande måtten.
--
-- Körs i Supabase (SQL Editor) mot projektet Magic. Läser bara, ändrar inget.
-- Vyerna och ordlistan står i supabase/migrations/20261009120000_spelupplevelse.sql.
-- Samma siffror i terminalen: node dev/spelupplevelse.cjs
--
-- Kör en fråga i taget (SQL Editor visar bara den sista).

-- 1. Hela bilden, en rad. Huvudmåttet: rattningar_per_100_kort (ska ner).
--    Löftet: fel_namn_per_100_kort (ska vara ~0).
select * from public.upplevelse_totalt;

-- 2. Per spelare, över alla spel.
select * from public.upplevelse_spelare order by kort desc;

-- 3. Per spelare och spel, senaste först.
select * from public.upplevelse_spelare_spel order by forsta_kort desc;

-- 4. Per parti: klart, betyg, kom de tillbaka.
select * from public.upplevelse_partier order by startad desc;

-- 5. Vilka namn kameran sätter fel (spelaren bytte från → till).
select fran, namn as till, count(*) as ganger
  from public.kort_handelser where typ = 'bytt'
 group by fran, namn order by ganger desc;

-- ═══════════════════════════════════════════════════════════════════
--  Mesa — raderingen av rapportkopior (granskningen i skala, steg 5)
--
--  Ovanpå 20261013090000_rapporter.sql och 20261013170000 (körda, ändras
--  inte). Går att köra om.
--
--  raderingar.hanterad_at: när dev/rapport/radera.cjs tagit bort kopiorna
--  av rapporten (Mat test-fallet, bänkposten, träningsmappen, den hämtade
--  mappen) och grep inte längre hittar koden. null = inte hanterad än;
--  /overview (dev/laget.cjs) räknar dem. Bara service role läser och
--  skriver (spelaren lägger bara in koden, som förut).
-- ═══════════════════════════════════════════════════════════════════

alter table public.raderingar add column if not exists hanterad_at timestamptz;
create index if not exists raderingar_ohanterade on public.raderingar (raderad_at) where hanterad_at is null;
grant select, update on public.raderingar to service_role;

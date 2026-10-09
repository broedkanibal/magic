-- ═══════════════════════════════════════════════════════════════════
--  Mesa — funktionernas rättigheter (Security Advisor 2026-10-09)
--
--  KÖRD av Jesper i SQL Editor 2026-10-09. Går att köra om.
--
--  Supabases Security Advisor gav 8 varningar. De här fyra rättas här:
--
--  · bump_board_version saknade fast sökväg. Den rör inga tabeller
--    (bara now() och coalesce, som alltid finns i pg_catalog), så en tom
--    sökväg räcker.
--  · i_spelet kunde köras av anon. Policyerna behöver den för
--    authenticated, men anon har inga rättigheter till tabellerna och har
--    ingenting med den att göra.
--  · rls_auto_enable och bump_board_version är triggerfunktioner. De körs
--    av databasen, och Postgres kollar inte execute för triggerfunktioner,
--    så ingen roll behöver få anropa dem via /rest/v1/rpc.
--    rls_auto_enable finns inte i repot: Supabase skapade den när
--    "automatically enable RLS on new tables" slogs på (händelsetriggern
--    ensure_rls).
--
--  Kvar med avsikt: "Signed-In Users Can Execute" för ga_med, ta_scan och
--  i_spelet — appen anropar dem som inloggad, och de kollar auth.uid()
--  själva. "Leaked Password Protection": Mesa loggar bara in med OAuth.
-- ═══════════════════════════════════════════════════════════════════

alter function public.bump_board_version() set search_path = '';

revoke execute on function public.i_spelet(uuid) from public, anon;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.bump_board_version() from public, anon, authenticated;

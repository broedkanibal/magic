-- ═══════════════════════════════════════════════════════════════════
--  Mesa — kort_handelser.ms före 0d1980a mätte fel sak
--
--  ms ska vara ms från att telefonens detektor först såg kortet till att
--  bordet skickades. Till commit 0d1980a (pushad 2026-10-10 07:12 CEST)
--  loggade datorn rapportens sen — ms sedan detektorn SENAST såg kortet,
--  ~0 för varje kort i bild (29 av 30 rader med ms var 0, den sista 5326
--  för ett kort som var skymt just då). Medianen och p90 i vyerna
--  upplevelse_* visade därför ~0 ms.
--
--  Raderna före rättelsen får ms = null: tiden är okänd, inte noll.
--  Övriga fält är riktiga och står kvar. Går att köra om.
-- ═══════════════════════════════════════════════════════════════════

update public.kort_handelser
   set ms = null
 where tid < timestamptz '2026-10-10 05:12:23+00'
   and ms is not null;

-- ═══════════════════════════════════════════════════════════════════
--  Mesa — problemrapporten, rättelserunda 2 (MES-365)
--
--  Ovanpå 20261013090000_rapporter.sql och 20261013150000 (körda, ändras
--  inte). Går att köra om.
--
--  raderingar får unique (kod): en raderad rapport står där en gång, också
--  när Delete, Cancel under Sending eller stängningen i Couldn't send körs
--  två gånger för samma kod. Klienten (Moln.rapportRadera) ignorerar felet
--  från insättningen och raderar raden ändå. Ev. dubbletter tas bort först
--  (den äldsta raderingen för varje kod behålls).
-- ═══════════════════════════════════════════════════════════════════

delete from public.raderingar a
  using public.raderingar b
  where a.kod = b.kod and (a.raderad_at, a.ctid) > (b.raderad_at, b.ctid);

do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'raderingar_kod_unik' and conrelid = 'public.raderingar'::regclass) then
    alter table public.raderingar add constraint raderingar_kod_unik unique (kod);
  end if;
end $$;

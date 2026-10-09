-- ═══════════════════════════════════════════════════════════════════
--  Mesa — lekens sleeves står kvar till nästa parti (Jesper 2026-10-09)
--
--  Körs EFTER lekar.sql (behöver decks). Additiv och går att köra om.
--  SKRIVEN men inte körd: Jesper kör den (SQL Editor, eller
--  `supabase db push`). Koden tål att kolumnen saknas: sparningen av
--  färgen misslyckas tyst (en rad i konsolen) och leken visas med
--  Magic-baksidan tills telefonen mätt sleeven, som förut.
--
--  slv_farg: färgen telefonen mätte på lekens sleeves förra gången leken
--  låg på bordet, {r, g, b, magic} (magic = Magic-baksidan, inga sleeves).
--  Datorn visar leken och de nedvända korten i den från första stund i
--  nästa parti med leken, i stället för Magic-baksidan i ~3 s medan
--  telefonen mäter. Mäter telefonen andra sleeves byts färgen och sleeven
--  läggs på en gång. null = inte mätt än (första partiet med leken).
--
--  Bara ägaren läser och skriver den (decks_las och decks_andra i
--  lekar.sql). Motståndarna ser bordets färg genom bordsraden som förut,
--  inte genom decks. Skrivningen rör inte uppdaterad: leken räknas inte
--  som ändrad, och överskrivningsskyddet i sparaLek påverkas inte.
-- ═══════════════════════════════════════════════════════════════════

alter table public.decks
  add column if not exists slv_farg jsonb;

-- ═══════════════════════════════════════════════════════════════════
--  Mesa — lekens ändringar görs högst en gång (MES-289)
--
--  Körs EFTER lekar.sql (behöver decks). Additiv och går att köra om.
--  SKRIVEN men inte körd: Jesper kör den (SQL Editor, eller
--  `supabase db push`). Koden som skriver klara får driftsättas först
--  EFTER att den här körts — annars faller varje sparning av en lek på
--  att kolumnen saknas.
--
--  Leken sparas som en kö av ändringar som spelas upp på raden. Ett försök
--  vars svar försvann kan ändå ha skrivits, och spelades samma kö upp igen
--  lades korten in två gånger. Varje ändring har nu ett id, och raden bär
--  id:na på de senaste ändringarna som redan ligger i den (klientens
--  lekSlagKlaraEfter kapar listan till de senaste ~400). En ändring vars id
--  står här spelas inte upp igen.
--
--  Äldre flikar som inte känner till kolumnen rör den inte (update skriver
--  bara de fält den får), och en rad med '[]' spelar upp allt, som förut.
-- ═══════════════════════════════════════════════════════════════════

alter table public.decks
  add column if not exists klara jsonb not null default '[]'::jsonb;

-- ═══════════════════════════════════════════════════════════════════
--  Mesa — förräknade bildvektorer (MES-230)
--
--  Körs EFTER schema.sql och lekar.sql. Går att köra om. SKRIVEN men inte
--  körd: Jesper kör den (SQL Editor, eller `supabase db push`), se
--  dev/embed/INLARNING.md.
--
--  Kamerans bildmodell (dev/embed/embed.js) gör om varje referensbild till
--  8 vektorer (4 vridningar × skarp/suddig) à 512 tal. De beror BARA på
--  Scryfall-id och modell + receptversion — inte på spelaren, leken eller
--  telefonen. Därför räknas de en gång, på Jespers dator
--  (dev/embed/forrakna.cjs med tjänstenyckeln), och hämtas av alla. En
--  Commander-lek (~900 bilder) är då redo på sekunder i stället för en kvart.
--
--  Varför en tabell och inte en lagringshink: appen måste fråga "vilka av
--  de här 900 har ni?" — en tabell svarar på det i samma anrop som den
--  lämnar ut vektorerna, och det som saknas syns som en rad som inte kom.
--  En hink skulle kräva 900 hämtningar, och varje saknad bild blir ett
--  404-fel i konsolen. Raderna är små (8 KB fp16) och nyckeln är naturlig
--  (modell, scryfall_id). Vid 10 000 bilder är tabellen ~85 MB.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.card_embeddings (
  -- Scryfalls kort-id (en tryckning), eller 'baksida' för kortbaksidan
  scryfall_id text not null,
  -- Embed.MODELL i embed.js, t.ex. 'mobileclip-s0|v1'. Ändras receptet höjs
  -- versionen, och de gamla raderna används inte längre (de kan raderas).
  modell      text not null,
  -- 8 × 512 fp16, little-endian, i modulens ordning: skarp 0/90/180/270,
  -- sudd 0/90/180/270
  vek         bytea not null check (octet_length(vek) = 8192),
  skapad      timestamptz not null default now(),
  primary key (modell, scryfall_id)
);

alter table public.card_embeddings enable row level security;

-- ── behörigheter ───────────────────────────────────────────────────
-- Läsbar för alla inloggade: vektorerna är härledda ur Scryfalls publika
-- bilder och säger ingenting om någon spelare. Ingen policy för insert,
-- update eller delete: bara tjänstenyckeln (service_role, som går förbi
-- radsäkerheten) skriver — alltså bara forrakna.cjs på Jespers dator.
drop policy if exists card_embeddings_las on public.card_embeddings;
create policy card_embeddings_las on public.card_embeddings for select
  to authenticated using (true);

revoke all on public.card_embeddings from anon, authenticated;
grant select on public.card_embeddings to authenticated;
-- Projektet exponerar inte nya tabeller automatiskt (UPPSATTNING.md), så
-- tjänstenyckeln får sina rättigheter uttryckligen.
grant select, insert, update, delete on public.card_embeddings to service_role;

-- ── hämtningen ─────────────────────────────────────────────────────
-- En fråga per 200 id:n (Moln.hamtaVektorer). Base64 i stället för bytea:s
-- hex i JSON — en tredjedel mindre att skicka. security invoker: frågan
-- går under den inloggades radsäkerhet, som vilken select som helst.
create or replace function public.embed_vektorer(p_modell text, p_ids text[])
returns table (scryfall_id text, vek text)
language sql stable security invoker set search_path = public as $$
  select e.scryfall_id, translate(encode(e.vek, 'base64'), E'\n', '')
    from public.card_embeddings e
   where e.modell = p_modell and e.scryfall_id = any(p_ids)
$$;

revoke all on function public.embed_vektorer(text, text[]) from public, anon;
grant execute on function public.embed_vektorer(text, text[]) to authenticated;

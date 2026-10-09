-- Vad Claude-frågorna kostar: totalt, per månad, per modell, per konto och per spel.
--
-- Körs i Supabase (SQL Editor) mot projektet Magic. Läser bara, ändrar inget.
-- Kolumnen `vy` säger vilken sammanställning raden tillhör; filtrera på den,
-- eller sortera som den står.
--
-- Pengar är USD och kommer ur claude_fragor.dollar (servern fyller i den sedan
-- api/_vakt.js räknar tokens × modellens pris). En rad utan dollar är en fråga
-- vars svar aldrig loggades: den kostnaden är OKÄND, inte noll. `utan_svar`
-- visar hur många sådana rader som ingår, så att summan går att läsa som
-- "minst".
--
-- Månader räknas i svensk tid, som taket per konto.

with f as (
  select
    date_trunc('month', tid at time zone 'Europe/Stockholm')::date as manad,
    coalesce(modell, '(ingen modell loggad)')                      as modell,
    user_id, spel, mode, dollar, input_tokens, output_tokens
  from public.claude_fragor
),
sammanstalld as (
  select 1 as ordning, 'totalt' as vy, ''::text as nyckel, '' as nyckel2, * from (
    select count(*) as fragor, count(*) filter (where dollar is null) as utan_svar,
           sum(dollar) as usd, sum(input_tokens) as in_tok, sum(output_tokens) as ut_tok
    from f) t
  union all
  select 2, 'per manad', manad::text, '', count(*), count(*) filter (where dollar is null),
         sum(dollar), sum(input_tokens), sum(output_tokens)
    from f group by manad
  union all
  select 3, 'per modell', modell, '', count(*), count(*) filter (where dollar is null),
         sum(dollar), sum(input_tokens), sum(output_tokens)
    from f group by modell
  union all
  select 4, 'per manad och modell', manad::text, modell, count(*), count(*) filter (where dollar is null),
         sum(dollar), sum(input_tokens), sum(output_tokens)
    from f group by manad, modell
  union all
  select 5, 'per konto och manad', coalesce(user_id::text, '(konto borttaget)'), manad::text, count(*),
         count(*) filter (where dollar is null), sum(dollar), sum(input_tokens), sum(output_tokens)
    from f group by user_id, manad
  union all
  select 6, 'per spel', coalesce(spel, '(utan spel)'), '', count(*), count(*) filter (where dollar is null),
         sum(dollar), sum(input_tokens), sum(output_tokens)
    from f group by spel
  union all
  select 7, 'per lage', mode, '', count(*), count(*) filter (where dollar is null),
         sum(dollar), sum(input_tokens), sum(output_tokens)
    from f group by mode
)
select
  vy, nyckel, nyckel2,
  fragor,
  utan_svar,
  round(usd, 4)                                   as usd,
  round(usd / nullif(fragor - utan_svar, 0), 5)   as usd_per_fraga,
  in_tok, ut_tok
from sammanstalld
order by ordning, nyckel desc, nyckel2;

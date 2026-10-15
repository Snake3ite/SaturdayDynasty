-- Private operational query. Never paste player activity into a public issue.
-- Session stages below all belong to ONE session/cohort/source tuple; they are
-- not ratios made by dividing unrelated aggregate event counts.
with sessions as (
 select cohort_hash,session_hash,utm_source,utm_medium,utm_campaign,
 bool_or(event='landing_view') landing,
 bool_or(event='play_click') play,
 bool_or(event='game_ready') ready,
 bool_or(event='dynasty_created') dynasty,
 bool_or(event='first_recruit') recruit,
 bool_or(event='game_completed') completed,
 bool_or(event='return') returned
 from public.sdf_browser_growth_events
 where not qa and received_at>=now()-interval '28 days'
 group by 1,2,3,4,5
)
select utm_source,utm_medium,utm_campaign,count(*) sessions,
count(*) filter(where landing) landing_sessions,
count(*) filter(where landing and play) landing_to_play,
count(*) filter(where landing and play and ready) landing_to_ready,
count(*) filter(where landing and play and ready and dynasty) landing_to_dynasty,
count(*) filter(where landing and play and ready and dynasty and recruit) landing_to_recruit,
count(*) filter(where landing and play and ready and dynasty and recruit and completed) full_funnel_sessions,
count(distinct cohort_hash) filter(where returned) returning_cohorts
from sessions group by 1,2,3 order by sessions desc;

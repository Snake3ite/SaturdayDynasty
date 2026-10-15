-- Pending owner review. Linked funnel is opt-in and separate from basic totals.
begin;
create table if not exists public.sdf_browser_growth_events (
 id uuid primary key,
 event text not null check (event in ('landing_view','play_click','game_ready','dynasty_created','first_recruit','game_completed','return','community_shown','community_opened','share_opened','share_completed')),
 occurred_at timestamptz not null,
 received_at timestamptz not null default now(),
 cohort_hash text not null check (cohort_hash ~ '^[0-9a-f]{64}$'),
 session_hash text not null check (session_hash ~ '^[0-9a-f]{64}$'),
 utm_source text not null check (utm_source in ('facebook','facebook_personal','discord','youtube','google','direct','other')),
 utm_medium text not null check (utm_medium in ('organic_social','community','organic_video','paid_social','cpc','referral','direct','other')),
 utm_campaign text not null default '' check (utm_campaign ~ '^[a-z0-9_-]{0,48}$'),
 context text not null default '' check (context in ('','landing','startup','dashboard','season_recap','discord','facebook')),
 qa boolean not null default false
);
create index if not exists sdf_browser_growth_cohort_day on public.sdf_browser_growth_events(cohort_hash,received_at);
create index if not exists sdf_browser_growth_received on public.sdf_browser_growth_events(received_at);
alter table public.sdf_browser_growth_events enable row level security;
revoke all on public.sdf_browser_growth_events from public,anon,authenticated;

create or replace function public.sdf_browser_growth_ingest(p_qa boolean,p_events jsonb)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb; added integer=0; changed integer; cohort text;
begin
 if jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events) not between 1 and 25 then raise exception 'Invalid batch';end if;
 -- Sorted locks serialize per-cohort limits without deadlocking mixed batches.
 for cohort in select distinct value->>'cohort' from jsonb_array_elements(p_events) order by 1 loop
  perform pg_advisory_xact_lock(hashtextextended('browser-growth:'||cohort,0));
  if (select count(*) from sdf_browser_growth_events where cohort_hash=cohort and received_at>=date_trunc('day',now()))+jsonb_array_length(p_events)>1000 then raise exception 'Daily event limit';end if;
 end loop;
 for item in select value from jsonb_array_elements(p_events) loop
  insert into sdf_browser_growth_events(id,event,occurred_at,cohort_hash,session_hash,utm_source,utm_medium,utm_campaign,context,qa)
  values((item->>'id')::uuid,item->>'event',(item->>'at')::timestamptz,item->>'cohort',item->>'session',item->>'utm_source',item->>'utm_medium',coalesce(item->>'utm_campaign',''),coalesce(item->>'context',''),p_qa)
  on conflict(id) do nothing;
  get diagnostics changed=row_count;added=added+changed;
 end loop;
 -- Bounded retention; no save/account/financial data is stored here.
 delete from sdf_browser_growth_events where received_at<now()-interval '90 days';
 return added;
end $$;
revoke all on function public.sdf_browser_growth_ingest(boolean,jsonb) from public,anon,authenticated;
grant execute on function public.sdf_browser_growth_ingest(boolean,jsonb) to service_role;
commit;

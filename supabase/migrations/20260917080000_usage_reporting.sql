-- Optional product analytics. Public clients cannot read telemetry or report data.
begin;
create schema if not exists sdf_private;
revoke all on schema sdf_private from public, anon, authenticated;
create table if not exists sdf_private.usage_devices (
 device text primary key, platform text not null check(platform in ('android','browser')),
 first_seen timestamptz not null default now(), last_seen timestamptz not null default now(), qa boolean not null default false
);
create table if not exists sdf_private.usage_events (
 id uuid primary key, device text not null, platform text not null,
 event text not null, product text not null default '', at timestamptz not null,
 received timestamptz not null default now(), qa boolean not null default false
);
create index if not exists usage_events_at on sdf_private.usage_events(at);
create index if not exists usage_events_device_received on sdf_private.usage_events(device,received);
-- Aggregates survive raw event retention, so all-time totals never reset after 35 days.
create table if not exists sdf_private.usage_totals (
 platform text not null,event text not null,product text not null default '',total bigint not null default 0,
 primary key(platform,event,product)
);
create table if not exists sdf_private.usage_config (
 singleton boolean primary key default true check(singleton),
 token text not null default (gen_random_uuid()::text||gen_random_uuid()::text),
 started_at timestamptz not null default now()
);
insert into sdf_private.usage_config(singleton) values(true) on conflict do nothing;
create table if not exists sdf_private.usage_reports (
 report_key text primary key, payload jsonb not null, created_at timestamptz not null default now(), sent_at timestamptz
);
alter table sdf_private.usage_devices enable row level security;
alter table sdf_private.usage_events enable row level security;
alter table sdf_private.usage_totals enable row level security;
alter table sdf_private.usage_config enable row level security;
alter table sdf_private.usage_reports enable row level security;

create or replace function public.sdf_usage_ingest(p_device text,p_platform text,p_qa boolean,p_events jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e jsonb; stamp timestamptz; inserted integer; is_new integer; seen_count integer;
begin
 if p_device !~ '^[0-9a-f]{64}$' or p_platform not in ('android','browser') or jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>40 then raise exception 'Invalid batch'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_device,236));
 select count(*) into seen_count from sdf_private.usage_events where device=p_device and received>now()-interval '1 day';
 if seen_count+jsonb_array_length(p_events)>2000 then raise exception 'Daily device limit'; end if;
 insert into sdf_private.usage_devices(device,platform,qa) values(p_device,p_platform,p_qa) on conflict do nothing;
 get diagnostics is_new=row_count;
 if exists(select 1 from sdf_private.usage_devices where device=p_device and (platform<>p_platform or qa<>p_qa)) then raise exception 'Device mismatch'; end if;
 update sdf_private.usage_devices set last_seen=now() where device=p_device;
 if is_new=1 and not p_qa then
  insert into sdf_private.usage_totals(platform,event,total) values(p_platform,'first_launch',1)
  on conflict(platform,event,product) do update set total=sdf_private.usage_totals.total+1;
 end if;
 for e in select value from jsonb_array_elements(p_events) loop
  if e->>'event' not in ('session','dynasty_started','game_completed','season_completed','first_recruit','practice_chosen','first_game','second_season','guide_started','guide_dismissed','guide_completed','shop_opened','preview_opened','checkout_started','checkout_canceled','checkout_failed','checkout_pending','purchase_confirmed','reward_shown','reward_earned','reward_failed','interstitial_shown') then raise exception 'Invalid event'; end if;
  if coalesce(e->>'product','') not in ('','commissioner_mode','remove_ads','player_editor','team_editor') then raise exception 'Invalid product'; end if;
  stamp=(e->>'at')::timestamptz;
  -- Offline events are accepted for seven days, future clocks only five minutes.
  if stamp<now()-interval '7 days' or stamp>now()+interval '5 minutes' then continue; end if;
  insert into sdf_private.usage_events(id,device,platform,event,product,at,qa)
   values((e->>'id')::uuid,p_device,p_platform,e->>'event',coalesce(e->>'product',''),least(stamp,now()),p_qa) on conflict do nothing;
  get diagnostics inserted=row_count;
  if inserted=1 and not p_qa then
   insert into sdf_private.usage_totals(platform,event,product,total) values(p_platform,e->>'event',coalesce(e->>'product',''),1)
   on conflict(platform,event,product) do update set total=sdf_private.usage_totals.total+1;
  end if;
 end loop;
 return jsonb_build_object('ok',true);
end $$;

create or replace function public.sdf_usage_report(p_token text,p_test boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cutoff timestamptz; k text; report jsonb; already_sent timestamptz;
begin
 if p_token is null or p_token<>(select token from sdf_private.usage_config where singleton) then raise exception 'Unauthorized'; end if;
 cutoff=case when p_test then date_trunc('minute',now()) else ((now() at time zone 'America/New_York')::date + time '08:00') at time zone 'America/New_York' end;
 if not p_test and (now() at time zone 'America/New_York')::time < time '08:00' then return jsonb_build_object('skip',true); end if;
 k=case when p_test then 'test-'||to_char(cutoff,'YYYYMMDDHH24MI') else 'daily-'||(cutoff at time zone 'America/New_York')::date::text end;
 perform pg_advisory_xact_lock(hashtextextended(k,236));
 select payload,sent_at into report,already_sent from sdf_private.usage_reports where report_key=k;
 if already_sent is not null then return jsonb_build_object('skip',true); end if;
 if report is null then
  report=jsonb_build_object('key',k,'test',p_test,'from',cutoff-interval '24 hours','to',cutoff,
   'started_at',(select started_at from sdf_private.usage_config where singleton),
   'last24',coalesce((select jsonb_agg(x) from (select platform,event,product,count(*) as total from sdf_private.usage_events where not qa and at>=cutoff-interval '24 hours' and at<cutoff group by platform,event,product) x),'[]'::jsonb),
   'alltime',coalesce((select jsonb_agg(x) from (select platform,event,product,total from sdf_private.usage_totals) x),'[]'::jsonb),
   'devices',coalesce((select jsonb_agg(x) from (select platform,count(*) filter(where first_seen>=cutoff-interval '24 hours' and first_seen<cutoff) as new24 from sdf_private.usage_devices where not qa group by platform) x),'[]'::jsonb),
   'active',coalesce((select jsonb_agg(x) from (select platform,count(distinct device) as total from sdf_private.usage_events where not qa and at>=cutoff-interval '24 hours' and at<cutoff group by platform) x),'[]'::jsonb));
  insert into sdf_private.usage_reports(report_key,payload) values(k,report);
 end if;
 return report;
end $$;
create or replace function public.sdf_usage_report_sent(p_token text,p_key text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_token is null or p_token<>(select token from sdf_private.usage_config where singleton) then raise exception 'Unauthorized'; end if;
 update sdf_private.usage_reports set sent_at=now() where report_key=p_key and sent_at is null;
end $$;
revoke all on function public.sdf_usage_ingest(text,text,boolean,jsonb) from public,anon,authenticated;
revoke all on function public.sdf_usage_report(text,boolean) from public,anon,authenticated;
revoke all on function public.sdf_usage_report_sent(text,text) from public,anon,authenticated;
grant execute on function public.sdf_usage_ingest(text,text,boolean,jsonb) to service_role;
grant execute on function public.sdf_usage_report(text,boolean) to service_role;
grant execute on function public.sdf_usage_report_sent(text,text) to service_role;
commit;

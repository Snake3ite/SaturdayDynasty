-- Basic event totals do not have a device identity. Existing consented records remain.
begin;
alter table sdf_private.usage_events alter column device drop not null;
create index if not exists usage_events_basic_received on sdf_private.usage_events(received) where device is null;
create or replace function public.sdf_usage_ingest(p_device text,p_platform text,p_qa boolean,p_events jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e jsonb; stamp timestamptz; inserted integer; is_new integer; seen_count integer;
begin
 if (p_device is not null and p_device !~ '^[0-9a-f]{64}$') or p_platform is null or p_platform not in ('android','browser') or p_qa is null or p_events is null or jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events) not between 1 and 40 then raise exception 'Invalid batch'; end if;
 if p_device is not null then
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
 else
  -- Aggregate abuse ceiling, without creating an IP/device fingerprint.
  perform pg_advisory_xact_lock(hashtextextended('basic-usage-ingest',236));
  select count(*) into seen_count from sdf_private.usage_events where device is null and received>now()-interval '1 minute';
  if seen_count+jsonb_array_length(p_events)>20000 then raise exception 'Basic usage limit'; end if;
 end if;
 for e in select value from jsonb_array_elements(p_events) loop
  if e->>'event' is null or e->>'event' not in ('reporting_started','session','dynasty_started','game_completed','season_completed','first_recruit','practice_chosen','first_game','second_season','guide_started','guide_dismissed','guide_completed','shop_opened','preview_opened','checkout_started','checkout_canceled','checkout_failed','checkout_pending','purchase_confirmed','reward_shown','reward_earned','reward_failed','interstitial_shown') then raise exception 'Invalid event'; end if;
  if coalesce(e->>'product','') not in ('','commissioner_mode','remove_ads','player_editor','team_editor') then raise exception 'Invalid product'; end if;
  stamp=(e->>'at')::timestamptz;
  if stamp is null or e->>'id' is null then raise exception 'Missing event fields'; end if;
  if p_device is null then stamp=date_trunc('minute',stamp); end if;
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

revoke all on function public.sdf_usage_ingest(text,text,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.sdf_usage_ingest(text,text,boolean,jsonb) to service_role;
commit;

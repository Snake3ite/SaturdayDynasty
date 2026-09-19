begin;
do $$
declare d text:=encode(gen_random_bytes(32),'hex'); payload jsonb; token_value text;
begin
 perform public.sdf_usage_ingest(d,'browser',false,jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'event','scenario_started','at',now())));
 if not exists(select 1 from sdf_private.usage_devices where device=d and retention_started_at is not null and not returned_day1) then raise exception 'New enrollment failed'; end if;
 update sdf_private.usage_devices set retention_started_at=now()-interval '49 hours' where device=d;
 perform public.sdf_usage_ingest(d,'browser',false,jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'event','session','at',now()-interval '24 hours')));
 if not exists(select 1 from sdf_private.usage_devices where device=d and returned_day1 and not returned_day7) then raise exception 'Day 1 window failed'; end if;
 update sdf_private.usage_devices set retention_started_at=now()-interval '9 days' where device=d;
 perform public.sdf_usage_ingest(d,'browser',false,jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'event','session','at',now()-interval '36 hours')));
 if not exists(select 1 from sdf_private.usage_devices where device=d and returned_day1 and returned_day7) then raise exception 'Day 7 window failed'; end if;
 select token into token_value from sdf_private.usage_config where singleton;
 payload=public.sdf_usage_report(token_value,true);
 if jsonb_array_length(payload->'retention')<1 then raise exception 'Retention missing from report'; end if;
 if not exists(select 1 from jsonb_array_elements(payload->'retention') r where r->>'platform'='browser' and (r->>'returned7')::int>=1) then raise exception 'Mature cohort absent'; end if;
end $$;
rollback;
select 'PASS: enrollment, day-1/day-7 windows, mature report; test writes rolled back' as result;

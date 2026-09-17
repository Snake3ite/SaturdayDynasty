-- Transactional assertions: synthetic fixtures are rolled back, including lifetime totals.
begin;
do $$
declare d text=repeat('a',64); e jsonb; n bigint; p jsonb;
begin
 e=jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'event','game_completed','at',now()-interval '1 hour'));
 perform public.sdf_usage_ingest(d,'android',false,e);
 perform public.sdf_usage_ingest(d,'android',false,e);
 select count(*) into n from sdf_private.usage_events where device=d;
 if n<>1 then raise exception 'Duplicate event counted'; end if;
 perform public.sdf_usage_ingest(repeat('b',64),'browser',true,jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'event','purchase_confirmed','product','commissioner_mode','at',now()-interval '1 hour')));
 p=public.sdf_usage_report((select token from sdf_private.usage_config where singleton),true);
 if not exists(select 1 from jsonb_array_elements(p->'last24') x where x->>'platform'='android' and x->>'event'='game_completed' and (x->>'total')::int>=1) then raise exception '24 hour game missing'; end if;
 if exists(select 1 from jsonb_array_elements(p->'alltime') x where x->>'platform'='browser' and x->>'event'='purchase_confirmed') then raise exception 'QA included in all time'; end if;
 if has_function_privilege('anon','public.sdf_usage_ingest(text,text,boolean,jsonb)','EXECUTE') then raise exception 'Public SQL execution allowed'; end if;
 if has_schema_privilege('authenticated','sdf_private','USAGE') then raise exception 'Private schema accessible'; end if;
 delete from sdf_private.usage_events where device=d;
 if not exists(select 1 from sdf_private.usage_totals where platform='android' and event='game_completed' and total>=1) then raise exception 'All-time lost after retention'; end if;
end $$;
rollback;
select 'PASS: deduplication, 24h, lifetime retention, QA exclusion and access control' as result;

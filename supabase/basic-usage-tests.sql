-- No real counters or devices are changed: all fixtures roll back.
begin;
do $$
declare e jsonb; event_id uuid=gen_random_uuid(); linked_id text=encode(sha256(gen_random_uuid()::text::bytea),'hex');
 before_devices bigint; before_total bigint; n bigint;
begin
 select count(*) into before_devices from sdf_private.usage_devices;
 select coalesce(sum(total),0) into before_total from sdf_private.usage_totals where platform='android' and event='game_completed';
 e=jsonb_build_array(jsonb_build_object('id',event_id,'event','game_completed','at',now()-interval '1 hour'));
 perform public.sdf_usage_ingest(null,'android',false,e);
 perform public.sdf_usage_ingest(null,'android',false,e);
 select count(*) into n from sdf_private.usage_devices;
 if n<>before_devices then raise exception 'Basic event created device record'; end if;
 if not exists(select 1 from sdf_private.usage_events where id=event_id and device is null and at=date_trunc('minute',at)) then raise exception 'Basic identity/time minimization failed'; end if;
 select coalesce(sum(total),0) into n from sdf_private.usage_totals where platform='android' and event='game_completed';
 if n<>before_total+1 then raise exception 'Basic retry counted twice'; end if;
 -- A retry with a later consented identity must never relink the original event.
 perform public.sdf_usage_ingest(linked_id,'android',false,e);
 if exists(select 1 from sdf_private.usage_events where id=event_id and device is not null) then raise exception 'Older event relinked'; end if;
 perform public.sdf_usage_ingest(null,'android',true,jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'event','game_completed','at',now())));
 select coalesce(sum(total),0) into n from sdf_private.usage_totals where platform='android' and event='game_completed';
 if n<>before_total+1 then raise exception 'QA counted'; end if;
 if not exists(select 1 from sdf_private.usage_events where id=event_id and not qa and at>=now()-interval '24 hours') then raise exception 'Basic event omitted from 24-hour window'; end if;
 delete from sdf_private.usage_events where id=event_id;
 select coalesce(sum(total),0) into n from sdf_private.usage_totals where platform='android' and event='game_completed';
 if n<>before_total+1 then raise exception 'Lifetime counter lost after retention'; end if;
 if has_function_privilege('anon','public.sdf_usage_ingest(text,text,boolean,jsonb)','EXECUTE') then raise exception 'Public SQL execution allowed'; end if;
 if has_schema_privilege('authenticated','sdf_private','USAGE') then raise exception 'Private schema accessible'; end if;
end $$;
rollback;
select 'PASS: basic totals, no device record, deduplication, no relinking, QA exclusion, 24h/lifetime and privacy' as result;

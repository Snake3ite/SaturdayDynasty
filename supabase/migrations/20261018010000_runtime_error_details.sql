begin;
-- Extend the established ingest/report functions without replacing later fixes.
-- Fail atomically if their expected anchors changed on the target database.
create or replace function sdf_private.safe_error_detail(e jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare d jsonb='{}'::jsonb; k text; n numeric;
begin
 if e->>'event' in ('runtime_error','simulation_failed','live_resume_failed') then
  if e->>'error_code' in ('null_access','undefined_access','missing_function','not_defined','stack_limit','syntax','promise_rejection','resource_load','other') then d=d||jsonb_build_object('error_code',e->>'error_code'); end if;
  if e->>'error_name' in ('TypeError','ReferenceError','RangeError','SyntaxError','Error','SecurityError','QuotaExceededError','AbortError','Unknown') then d=d||jsonb_build_object('error_name',e->>'error_name'); end if;
  if e->>'error_file' in ('app-bundle.js','browser-growth.js','browser-bootstrap.js','web-shell.js','browser-save-bridge.js','browser-editors.js','browser-commerce-bridge.js','browser-feedback.js','browser-team-editor-v195.js','cloud-account-scope.js','browser-growth-analytics.js','browser-landing.js','capacitor.js','capacitor-plugins.js','unknown') then d=d||jsonb_build_object('error_file',e->>'error_file'); end if;
  if e->>'error_operation' in ('showTab','setSubview','advanceWeek','playPostseason','playChampionshipWeek','finishOffseason','openLiveGameCenter','global','promise','resource') then d=d||jsonb_build_object('error_operation',e->>'error_operation'); end if;
  if e->>'context' in ('dashboard','recruiting','roster','gameday','gameplan','program','facilities','portal','shop','coach','team','rankings','stats','history','postseason','season','unknown') then d=d||jsonb_build_object('context',e->>'context'); end if;
  foreach k in array array['error_line','error_column'] loop
   if coalesce(e->>k,'') ~ '^[0-9]{1,7}$' then n=(e->>k)::numeric;if n<=2000000 then d=d||jsonb_build_object(k,n);end if;end if;
  end loop;
 end if;
 if e->>'event'='reporting_recovered' then
  if e->>'transport_code' in ('http_400','http_422','http_429','http_4xx','http_5xx','network','timeout','not_acknowledged') then d=d||jsonb_build_object('transport_code',e->>'transport_code');end if;
  if coalesce(e->>'delivery_failures','') ~ '^[0-9]{1,5}$' then n=(e->>'delivery_failures')::numeric;if n between 1 and 10000 then d=d||jsonb_build_object('delivery_failures',n);end if;end if;
 end if;
 return d;
end $$;
revoke all on function sdf_private.safe_error_detail(jsonb) from public,anon,authenticated;

do $migration$
declare definition text; anchor text;
begin
 select pg_get_functiondef('public.sdf_usage_ingest(text,text,boolean,jsonb)'::regprocedure) into definition;
 if position('sdf_private.safe_error_detail(e)' in definition)=0 then
  anchor='event_detail=''{}''::jsonb;';
  if position(anchor in definition)=0 then raise exception 'Usage ingest changed: inspect before applying runtime diagnostics';end if;
  definition=replace(definition,anchor,'event_detail=''{}''::jsonb || sdf_private.safe_error_detail(e);');
  execute definition;
 end if;
 select pg_get_functiondef('public.sdf_usage_report(text,boolean)'::regprocedure) into definition;
 if position('runtime_errors298' in definition)=0 then
  anchor='insert into sdf_private.usage_reports(report_key,payload) values(k,report);';
  if position(anchor in definition)=0 then raise exception 'Usage report changed: inspect before applying runtime diagnostics';end if;
  definition=replace(definition,anchor,$inject$
   report=report||jsonb_build_object('runtime_errors298',coalesce((select jsonb_agg(x) from (
    select platform,build,event,detail->>'error_code' as error_code,detail->>'error_name' as error_name,
     detail->>'error_file' as error_file,detail->>'error_line' as error_line,detail->>'error_column' as error_column,
     detail->>'error_operation' as error_operation,detail->>'context' as context,count(*) as reports
    from sdf_private.usage_events where not qa and at>=report_from and at<cutoff and detail ? 'error_code'
    group by platform,build,event,detail->>'error_code',detail->>'error_name',detail->>'error_file',detail->>'error_line',detail->>'error_column',detail->>'error_operation',detail->>'context'
    order by count(*) desc,platform,build limit 50
   ) x),'[]'::jsonb),'reporting_transport298',coalesce((select jsonb_agg(x) from (
    select platform,build,detail->>'transport_code' as transport_code,count(*) as recoveries,
     sum(coalesce((detail->>'delivery_failures')::integer,0)) as failed_attempts
    from sdf_private.usage_events where not qa and event='reporting_recovered' and at>=report_from and at<cutoff and detail ? 'transport_code'
    group by platform,build,detail->>'transport_code' order by count(*) desc limit 30
   ) x),'[]'::jsonb));
   insert into sdf_private.usage_reports(report_key,payload) values(k,report);
  $inject$);
  execute definition;
 end if;
end $migration$;
commit;


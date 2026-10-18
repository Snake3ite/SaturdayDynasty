-- Run as the project owner in SQL Editor. Private data stays private.
-- Counts are sampled reports, not unique players or total exceptions.
select platform,build,event,detail->>'error_code' as category,
 detail->>'error_name' as type,detail->>'error_file' as source,
 detail->>'error_line' as line,detail->>'error_column' as col,
 detail->>'error_operation' as operation,detail->>'context' as screen,
 count(*) as reports,min(at) as first_seen,max(at) as last_seen
from sdf_private.usage_events
where not qa and at>=now()-interval '7 days'
 and event in ('runtime_error','simulation_failed','live_resume_failed')
group by platform,build,event,detail->>'error_code',detail->>'error_name',detail->>'error_file',detail->>'error_line',detail->>'error_column',detail->>'error_operation',detail->>'context'
order by reports desc limit 100;

select platform,build,detail->>'transport_code' as category,count(*) as recoveries,
 sum(coalesce((detail->>'delivery_failures')::integer,0)) as failed_attempts
from sdf_private.usage_events
where not qa and at>=now()-interval '7 days' and event='reporting_recovered'
group by platform,build,detail->>'transport_code' order by recoveries desc;

-- Run after deploying usage-reporting with JWT verification OFF (its report action has its own server-only token).
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create or replace function sdf_private.dispatch_usage_report(p_test boolean default false)
returns bigint language plpgsql security definer set search_path='' as $$
declare request_id bigint;
begin
 if not p_test and extract(hour from now() at time zone 'America/New_York')<>8 then return null; end if;
 select net.http_post(
  url:='https://fwnvwkffxazwsmaiqayj.supabase.co/functions/v1/usage-reporting',
  headers:=jsonb_build_object('Content-Type','application/json'),
  body:=jsonb_build_object('action','report','token',(select token from sdf_private.usage_config where singleton),'test',p_test),timeout_milliseconds:=20000
 ) into request_id;
 return request_id;
end $$;
revoke all on function sdf_private.dispatch_usage_report(boolean) from public,anon,authenticated;
-- Both UTC hours handle Eastern daylight/standard time; the function accepts only 8 AM locally.
-- Five-minute retries during that hour are deduplicated by the saved report and Resend key.
select cron.schedule('sdf-usage-daily-8am-eastern','*/5 12,13 * * *','select sdf_private.dispatch_usage_report();');
select cron.schedule('sdf-usage-raw-retention','30 9 * * *',$job$delete from sdf_private.usage_events where received<now()-interval '35 days'; delete from sdf_private.usage_reports where created_at<now()-interval '90 days';$job$);

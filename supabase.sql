-- Saturday Dynasty Football browser cloud-save schema
-- Safe to run more than once in Supabase SQL Editor.

create table if not exists public.dynasty_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  save_data jsonb not null,
  saved_at bigint not null,
  app_version text,
  device_name text,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

alter table public.dynasty_saves enable row level security;

drop policy if exists "read own dynasty saves" on public.dynasty_saves;
drop policy if exists "insert own dynasty saves" on public.dynasty_saves;
drop policy if exists "update own dynasty saves" on public.dynasty_saves;
drop policy if exists "delete own dynasty saves" on public.dynasty_saves;

create policy "read own dynasty saves" on public.dynasty_saves
for select to authenticated using ((select auth.uid()) = user_id);

create policy "insert own dynasty saves" on public.dynasty_saves
for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "update own dynasty saves" on public.dynasty_saves
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "delete own dynasty saves" on public.dynasty_saves
for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.set_dynasty_save_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_dynasty_save_updated_at on public.dynasty_saves;
create trigger set_dynasty_save_updated_at
before update on public.dynasty_saves
for each row execute function public.set_dynasty_save_updated_at();

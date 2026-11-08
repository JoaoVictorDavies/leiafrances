-- The learning state contains answer keys and is accessible only to the server.
create table public.teacher_journeys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision integer not null default 1,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.teacher_journeys enable row level security;
revoke all on public.teacher_journeys from public, anon, authenticated;
grant select, insert, update on public.teacher_journeys to service_role;

create table public.teacher_generation_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  usage_date date not null default (now() at time zone 'UTC')::date,
  requests integer not null default 0,
  last_request_at timestamptz,
  lease_id uuid,
  lease_until timestamptz
);

alter table public.teacher_generation_limits enable row level security;
revoke all on public.teacher_generation_limits from public, anon, authenticated;

create table public.teacher_generation_budget (
  id boolean primary key default true check (id),
  usage_date date not null default (now() at time zone 'UTC')::date,
  requests integer not null default 0
);
alter table public.teacher_generation_budget enable row level security;
revoke all on public.teacher_generation_budget from public, anon, authenticated;

create function public.claim_teacher_generation(p_user_id uuid, p_lease_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry public.teacher_generation_limits%rowtype;
  budget public.teacher_generation_budget%rowtype;
  today date := (now() at time zone 'UTC')::date;
begin
  insert into public.teacher_generation_limits (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into entry from public.teacher_generation_limits
  where user_id = p_user_id for update;

  if entry.lease_until > now() then
    return 'busy';
  end if;
  if entry.usage_date = today and entry.requests >= 20 then
    return 'daily_limit';
  end if;
  if entry.last_request_at > now() - interval '5 seconds' then
    return 'cooldown';
  end if;

  insert into public.teacher_generation_budget (id) values (true)
  on conflict (id) do nothing;
  select * into budget from public.teacher_generation_budget
  where id = true for update;
  if budget.usage_date = today and budget.requests >= 200 then
    return 'global_limit';
  end if;
  update public.teacher_generation_budget
  set usage_date = today,
      requests = case when budget.usage_date = today then budget.requests + 1 else 1 end
  where id = true;

  update public.teacher_generation_limits
  set usage_date = today,
      requests = case when entry.usage_date = today then entry.requests + 1 else 1 end,
      last_request_at = now(),
      lease_id = p_lease_id,
      lease_until = now() + interval '150 seconds'
  where user_id = p_user_id;
  return 'ok';
end;
$$;

create function public.release_teacher_generation(p_user_id uuid, p_lease_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.teacher_generation_limits
  set lease_id = null, lease_until = null
  where user_id = p_user_id and lease_id = p_lease_id;
$$;

revoke all on function public.claim_teacher_generation(uuid, uuid) from public, anon, authenticated;
revoke all on function public.release_teacher_generation(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_teacher_generation(uuid, uuid) to service_role;
grant execute on function public.release_teacher_generation(uuid, uuid) to service_role;
